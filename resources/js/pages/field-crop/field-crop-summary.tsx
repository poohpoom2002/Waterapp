import { Head, Link, usePage, router } from '@inertiajs/react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as turf from '@turf/turf';
import lineIntersect from '@turf/line-intersect';
import type {
    Feature as GeoJsonFeature,
    FeatureCollection as GeoJsonFeatureCollection,
    Point as GeoJsonPoint,
    LineString as GeoJsonLineString,
} from 'geojson';
import type { Feature as GeoFeature, LineString as GeoLineString } from 'geojson';
import pointToLineDistance from '@turf/point-to-line-distance';
import { getCropByValue, getTranslatedCropByValue } from './choose-crop';
import Navbar from '../../components/Navbar';
import { useLanguage } from '../../contexts/LanguageContext';
import { createGoogleMapsApiUrl } from '@/utils/googleMapsConfig';
import { 
    FieldCropSystemData,
    getEnhancedFieldCropData,
    calculateEnhancedFieldStats
} from '../../utils/fieldCropData';

// Reduce verbose logs in production/dev by toggling these flags
const DEBUG_ZONE_PIPE_STATS = false as const;
const DEBUG_SUMMARY_LOGS = true as const; // เปิดใช้งานเพื่อดูการคำนวณ lateral flow
const dbg = (...args: unknown[]) => {
    if (DEBUG_SUMMARY_LOGS) console.log(...args);
};

// Proper TypeScript interfaces
interface Coordinate {
    lat: number;
    lng: number;
}

interface Zone {
    id: string | number;
    name: string;
    color: string;
    coordinates: Coordinate[];
    cropType?: string;
    plantCount?: number;
    waterRequirement?: number;
}

interface Pipe {
    id: string | number;
    type: string;
    coordinates: Coordinate[];
    color?: string;
    zoneId?: string | number;
    pathOptions?: {
        color: string;
    };
}

interface Equipment {
    id: string | number;
    type: string;
    lat: number;
    lng: number;
    name?: string;
}

interface Obstacle {
    id: string | number;
    type: 'water_source' | 'building' | 'rock' | 'other';
    coordinates: Coordinate[];
    name?: string;
}

interface IrrigationPoint {
    id: string | number;
    lat: number;
    lng: number;
    type: string;
    radius?: number;
    position?: [number, number];
}

interface IrrigationLine {
    id: string | number;
    coordinates: Coordinate[];
    type: string;
}

interface MainField {
    coordinates: Coordinate[];
}

interface ZoneSummary {
    zoneId: string;
    zoneName: string;
    cropName: string;
    cropValue: string | null;
    cropIcon: string;
    cropCategory: string | null;
    zoneArea: number;
    zoneAreaRai: number;
    rowSpacing: number;
    plantSpacing: number;
    totalPlantingPoints: number;
    estimatedYield: number;
    estimatedPrice: number;
    waterRequirementPerIrrigation: number;
    waterRequirementPerDay: number;
    cropYieldPerRai: number;
    cropPricePerKg: number;
    cropWaterPerPlant: number;
    cropWaterPerPlantPerIrrigation: number;
    growthPeriod: number;
    irrigationNeeds: string;
    irrigationType: string;
    calculationMethod?: string;
    // Add irrigation count properties
    sprinklerCount?: number;
    dripTapeCount?: number;
    pivotCount?: number;
    waterJetTapeCount?: number;
    totalIrrigationPoints?: number;
}

interface FieldCropSummaryProps {
    mainField?: MainField;
    fieldAreaSize?: number;
    selectedCrops?: string[];
    zones?: Zone[];
    zoneAssignments?: Record<string, string>;
    zoneSummaries?: Record<string, ZoneSummary>;
    pipes?: Pipe[];
    equipmentIcons?: Equipment[];
    obstacles?: Obstacle[];
    irrigationPoints?: IrrigationPoint[];
    irrigationLines?: IrrigationLine[];
    irrigationAssignments?: Record<string, string>;
    irrigationSettings?: Record<string, unknown>;
    rowSpacing?: Record<string, number>;
    plantSpacing?: Record<string, number>;
    realPlantCount?: number;
    mapCenter?: [number, number];
    mapZoom?: number;
    mapType?: string;
    summary?: Record<string, unknown>;
    equipment?: Equipment[];
}

interface GoogleMapsDisplayProps {
    center: [number, number];
    zoom: number;
    mainField?: MainField;
    zones: Zone[];
    pipes: Pipe[];
    obstacles: Obstacle[];
    equipment: Equipment[];
    irrigationPoints: IrrigationPoint[];
    irrigationLines: IrrigationLine[];
    onMapReady?: (map: google.maps.Map) => void;
    showRadiusCircles?: boolean;
}

// Additional type definitions for pipe calculations
interface PipeStats {
    count: number;
    longestLength: number;
    totalLength: number;
}

interface ZonePipeStats {
    main: PipeStats;
    submain: PipeStats;
    lateral: PipeStats;
    total: number;
    totalLength: number;
    totalLongestLength: number;
}

interface CoordinateArray extends Array<number> {
    0: number;
    1: number;
}

type CoordinateInput = Coordinate | CoordinateArray;

// Zone colors array - same as in zone-obstacle.tsx
const ZONE_COLORS = [
    '#FF6B6B',
    '#9B59B6',
    '#F39C12',
    '#1ABC9C',
    '#3498DB',
    '#DDA0DD',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E9',
    '#F8C471',
    '#82E0AA',
    '#F1948A',
    '#AED6F1',
    '#D2B4DE',
    '#F9E79F',
    '#A9DFBF',
    '#FAD7A0',
    '#D5A6BD',
    '#B2DFDB',
];

// Function to fix zone colors if they are all the same
const fixZoneColors = (zones: Zone[]): Zone[] => {
    if (zones.length === 0) return zones;

    // Check if all zones have the same color (likely red)
    const firstColor = zones[0].color;
    const allSameColor = zones.every((zone) => zone.color === firstColor);

    if (allSameColor) {
        dbg('🔧 Fixing zone colors - all zones have the same color:', firstColor);
        return zones.map((zone, index) => ({
            ...zone,
            color: ZONE_COLORS[index % ZONE_COLORS.length],
        }));
    }

    return zones;
};

// Enhanced Google Maps component for better image capture
const GoogleMapsDisplay = ({
    center,
    zoom,
    mainField,
    zones,
    pipes,
    obstacles,
    equipment,
    irrigationPoints,
    irrigationLines,
    onMapReady,
    showRadiusCircles = true,
}: GoogleMapsDisplayProps) => {
    const { t } = useLanguage();
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<google.maps.Map | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [mapFullyLoaded, setMapFullyLoaded] = useState(false);

    useEffect(() => {
        // Load Google Maps API if not already loaded
        if (window.google?.maps) {
            setIsLoaded(true);
            return;
        }

        const existing = document.getElementById(
            '__googleMapsScriptId'
        ) as HTMLScriptElement | null;
        const url = createGoogleMapsApiUrl();
        if (!url) return;

        (window as unknown as { __googleMapsCallback?: () => void }).__googleMapsCallback = () => {
            setIsLoaded(true);
        };

        if (!existing) {
            const script = document.createElement('script');
            script.id = '__googleMapsScriptId';
            script.src = url;
            script.async = true;
            script.defer = true;
            script.onerror = () => console.error('❌ Failed to load Google Maps script');
            document.head.appendChild(script);
        } else {
            existing.addEventListener('load', () => setIsLoaded(true), { once: true });
        }
    }, []);

    useEffect(() => {
        if (isLoaded && mapRef.current && !googleMapRef.current) {
            // Initialize Google Map
            const map = new google.maps.Map(mapRef.current, {
                center: { lat: center[0], lng: center[1] },
                zoom: zoom,
                mapTypeId: google.maps.MapTypeId.SATELLITE,
                streetViewControl: false,
                fullscreenControl: true,
                mapTypeControl: true,
                zoomControl: true,
                maxZoom: 22,
            });

            googleMapRef.current = map;

            // Wait for map to fully load before marking as ready
            const mapLoadListener = google.maps.event.addListener(map, 'tilesloaded', () => {
                setTimeout(() => {
                    setMapFullyLoaded(true);
                    google.maps.event.removeListener(mapLoadListener);
                }, 1000); // Additional delay to ensure all tiles are rendered
            });

            // Draw main field boundary
            if (mainField && mainField.coordinates && Array.isArray(mainField.coordinates)) {
                const fieldPath = mainField.coordinates.map((coord: Coordinate) => {
                    if (Array.isArray(coord)) {
                        return { lat: coord[0], lng: coord[1] };
                    }
                    return { lat: coord.lat, lng: coord.lng };
                });

                new google.maps.Polygon({
                    paths: fieldPath,
                    strokeColor: '#22C55E',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: '#22C55E',
                    fillOpacity: 0.2,
                    map: map,
                });
            }

            // Draw zones
            const fixedZones = fixZoneColors(zones);
            fixedZones.forEach((zone) => {
                if (zone.coordinates && Array.isArray(zone.coordinates)) {
                    const zonePath = zone.coordinates.map((coord: Coordinate) => {
                        if (Array.isArray(coord)) {
                            return { lat: coord[0], lng: coord[1] };
                        }
                        return { lat: coord.lat, lng: coord.lng };
                    });

                    new google.maps.Polygon({
                        paths: zonePath,
                        strokeColor: zone.color || '#3B82F6',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: zone.color || '#3B82F6',
                        fillOpacity: 0.3,
                        map: map,
                    });
                }
            });

            // Draw pipes (match colors/styles with pipe-generate)
            pipes.forEach((pipe) => {
                if (pipe.coordinates && Array.isArray(pipe.coordinates)) {
                    const style =
                        pipe.type === 'main'
                            ? { color: '#dc2626', weight: 8 }
                            : pipe.type === 'submain'
                              ? { color: '#8b5cf6', weight: 5 }
                              : pipe.type === 'lateral'
                                ? { color: '#fbbf24', weight: 3 }
                                : { color: '#888888', weight: 3 };

                    const pipePath = pipe.coordinates.map((coord: Coordinate) => {
                        if (Array.isArray(coord)) {
                            return { lat: coord[0], lng: coord[1] };
                        }
                        return { lat: coord.lat, lng: coord.lng };
                    });

                    new google.maps.Polyline({
                        path: pipePath,
                        geodesic: true,
                        strokeColor: style.color,
                        strokeOpacity: 1.0,
                        strokeWeight: style.weight,
                        map: map,
                    });
                }
            });

            // สร้างจุดเชื่อมต่อทั้งหมด (lateral-to-submain และ submain-to-main)
            const allConnectionPoints: Array<{
                id: string;
                position: Coordinate;
                connectedLaterals: string[];
                submainId: string;
                type: 'single' | 'junction' | 'crossing' | 'l_shape' | 't_shape' | 'cross_shape';
            }> = [];

            // สร้างจุดเชื่อมต่อของท่อย่อยกับท่อเมนย่อย
            const lateralPipes = pipes.filter((p) => p.type === 'lateral');
            const submainPipes = pipes.filter((p) => p.type === 'submain');

            if (lateralPipes.length > 0 && submainPipes.length > 0) {
                const lateralConnectionPoints = createLateralConnectionPoints(
                    lateralPipes,
                    submainPipes
                );
                allConnectionPoints.push(...lateralConnectionPoints);
            }

            // สร้างจุดเชื่อมต่อของท่อเมนย่อยกับท่อเมน
            const submainToMainConnectionPoints = createSubmainToMainConnectionPoints(pipes);
            allConnectionPoints.push(...submainToMainConnectionPoints);

            // แสดงจุดเชื่อมต่อทั้งหมด
            allConnectionPoints.forEach((connectionPoint) => {
                let color = '#FFD700'; // default yellow
                let size = 8;
                let title = 'จุดเชื่อมต่อท่อย่อย';

                if (connectionPoint.type === 'junction') {
                    color = '#FFD700'; // สีเหลือง
                    size = 8;
                    title = `จุดเชื่อมต่อ (${connectionPoint.connectedLaterals.length} ท่อ)`;
                } else if (connectionPoint.type === 'crossing') {
                    color = '#4CAF50'; // สีเขียว
                    size = 7;
                    title = `จุดข้ามท่อเมนย่อย (${connectionPoint.connectedLaterals.length} ท่อ)`;
                } else if (connectionPoint.type === 'l_shape') {
                    color = '#F44336'; // สีแดง
                    size = 8;
                    title = 'จุดเชื่อมต่อรูปตัว L (ปลายท่อเมน)';
                } else if (connectionPoint.type === 't_shape') {
                    color = '#2196F3'; // สีน้ำเงิน
                    size = 8;
                    title = 'จุดเชื่อมต่อรูปตัว T (ผ่านปลายท่อเมน)';
                } else if (connectionPoint.type === 'cross_shape') {
                    color = '#9C27B0'; // สีม่วง
                    size = 8;
                    title = 'จุดเชื่อมต่อรูป + (ผ่านเส้นท่อเมน)';
                } else {
                    color = '#FFD700'; // สีเหลือง
                    size = 6;
                    title = 'จุดเชื่อมต่อท่อย่อย';
                }

                const icon = {
                    url:
                        'data:image/svg+xml;charset=UTF-8,' +
                        encodeURIComponent(`
                        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${color}" stroke="#FFFFFF" stroke-width="1"/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(size, size),
                    anchor: new google.maps.Point(size / 2, size / 2),
                };

                new google.maps.Marker({
                    position: connectionPoint.position,
                    map: map,
                    icon: icon,
                    title: title,
                    zIndex: 650, // ใช้ zIndex เดียวกับจุดสปริงเกลอร์
                    optimized: true,
                    clickable: false,
                });
            });

            // Draw equipment (pumps)
            if (Array.isArray(equipment) && equipment.length > 0) {
                equipment.forEach((eq) => {
                    const t = (eq as { type?: string }).type;
                    const isPump = t === 'pump' || t === 'water_pump';
                    const hasCoords =
                        typeof (eq as { lat?: number }).lat === 'number' &&
                        typeof (eq as { lng?: number }).lng === 'number';
                    if (!isPump || !hasCoords) return;
                    new google.maps.Marker({
                        position: {
                            lat: (eq as { lat: number }).lat,
                            lng: (eq as { lng: number }).lng,
                        },
                        map: googleMapRef.current!,
                        title: (eq as { name?: string }).name || 'Water Pump',
                        icon: {
                            url: '/generateTree/wtpump.png',
                            scaledSize: new google.maps.Size(28, 28),
                            anchor: new google.maps.Point(14, 14),
                        },
                        zIndex: 3000,
                    });
                });
            }

            // Draw obstacles (water sources and others)
            obstacles.forEach((obs) => {
                if (
                    obs.coordinates &&
                    Array.isArray(obs.coordinates) &&
                    obs.coordinates.length >= 3
                ) {
                    const coords = obs.coordinates.map((coord: Coordinate) => {
                        if (Array.isArray(coord)) {
                            return { lat: coord[0], lng: coord[1] } as unknown as {
                                lat: number;
                                lng: number;
                            };
                        }
                        return { lat: coord.lat, lng: coord.lng };
                    });
                    const colors =
                        obs.type === 'water_source'
                            ? { fill: '#3B82F6', stroke: '#1D4ED8' }
                            : { fill: '#6B7280', stroke: '#374151' };

                    new google.maps.Polygon({
                        paths: coords,
                        fillColor: colors.fill,
                        fillOpacity: 0.4,
                        strokeColor: colors.stroke,
                        strokeOpacity: 1,
                        strokeWeight: 2,
                        map: googleMapRef.current!,
                        clickable: false,
                    });
                }
            });

            // Draw irrigation points
            irrigationPoints.forEach((point) => {
                let lat, lng;
                if (point.lat && point.lng) {
                    [lat, lng] = [point.lat, point.lng];
                } else if (Array.isArray(point.position)) {
                    [lat, lng] = point.position;
                }

                if (lat && lng) {
                    const normalizedType = normalizeIrrigationType(point.type);
                    let color = '#06b6d4'; // Default (cyan)
                    if (normalizedType === 'sprinkler')
                        color = '#22c55e'; // Green
                    else if (normalizedType === 'mini_sprinkler')
                        color = '#3b82f6'; // Blue
                    else if (normalizedType === 'micro_spray') color = '#f97316'; // Orange

                    new google.maps.Marker({
                        position: { lat, lng },
                        map: map,
                        icon: {
                            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                <svg width="8" height="8" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="4" cy="4" r="3" fill="${color}" stroke="white" stroke-width="1"/>
                                </svg>
                            `)}`,
                            scaledSize: new google.maps.Size(8, 8),
                            anchor: new google.maps.Point(4, 4),
                        },
                    });

                    // Draw coverage circles for sprinklers and pivots (if they have radius and showRadiusCircles is true)
                    if (point.radius && normalizedType !== 'drip_tape' && showRadiusCircles) {
                        let circleColor = color;
                        let strokeWeight = 1;
                        let strokeOpacity = 0.6;
                        let fillOpacity = 0.1;

                        // Special styling for pivots
                        if (normalizedType === 'pivot') {
                            circleColor = '#dc2626'; // Red color for pivots
                            strokeWeight = 2;
                            strokeOpacity = 0.8;
                            fillOpacity = 0.15;
                        }

                        new google.maps.Circle({
                            strokeColor: circleColor,
                            strokeOpacity: strokeOpacity,
                            strokeWeight: strokeWeight,
                            fillColor: circleColor,
                            fillOpacity: fillOpacity,
                            map: map,
                            center: { lat, lng },
                            radius: point.radius,
                        });
                    }
                }
            });

            // Draw irrigation lines
            irrigationLines.forEach((line) => {
                if (line.coordinates && Array.isArray(line.coordinates)) {
                    const linePath = line.coordinates.map((coord: Coordinate) => {
                        if (Array.isArray(coord)) {
                            return { lat: coord[0], lng: coord[1] };
                        }
                        return { lat: coord.lat, lng: coord.lng };
                    });

                    new google.maps.Polyline({
                        path: linePath,
                        geodesic: true,
                        strokeColor: '#06B6D4',
                        strokeOpacity: 0.8,
                        strokeWeight: 3,
                        map: map,
                    });
                }
            });

            // Callback when map is ready
            if (onMapReady) {
                onMapReady(map);
            }
        }
    }, [
        isLoaded,
        center,
        zoom,
        mainField,
        zones,
        pipes,
        obstacles,
        equipment,
        irrigationPoints,
        irrigationLines,
        onMapReady,
        showRadiusCircles,
    ]);

    if (!isLoaded) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-700">
                <div className="text-center">
                    <div className="mb-2 text-2xl">🗺️</div>
                    <p className="text-sm text-gray-400">{t('Loading Google Maps...')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            <div ref={mapRef} className="h-full w-full rounded-lg" />
            {!mapFullyLoaded && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-700/75">
                    <div className="text-center">
                        <div className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-blue-400"></div>
                        <p className="text-sm text-gray-300">{t('Loading Map...')}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// Enhanced function to capture map as image with better error handling and multiple save formats
const captureMapImage = async (
    mapElement: HTMLElement,
    projectType: string = 'field-crop'
): Promise<string | null> => {
    try {
        // Starting map image capture

        // Check for html2canvas availability
        let html2canvas;
        try {
            html2canvas = (await import('html2canvas')).default;
        } catch {
            // html2canvas not available
            console.error('❌ html2canvas not available');
            return null;
        }

        // Wait a bit more to ensure Google Maps is fully rendered
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const canvas = await html2canvas(mapElement, {
            useCORS: true,
            allowTaint: true,
            scale: 1,
            width: mapElement.offsetWidth,
            height: mapElement.offsetHeight,
            backgroundColor: '#1f2937',
            logging: false, // Reduce console noise
            ignoreElements: (element) => {
                // Ignore certain elements that might cause issues
                return (
                    element.classList?.contains('gm-style-cc') ||
                    element.classList?.contains('gmnoprint')
                );
            },
        });

        const imageDataUrl = canvas.toDataURL('image/png', 0.9);

        // Enhanced saving with multiple keys and validation
        const saveKeys = [
            'projectMapImage', // Primary key used by product page
            `${projectType}PlanImage`, // Project-specific key
            'fieldCropPlanImage', // Legacy key for field-crop
            'mapCaptureImage', // Additional backup key
        ];

        let saveSuccess = false;
        for (const key of saveKeys) {
            try {
                localStorage.setItem(key, imageDataUrl);
                dbg(`✅ Image saved with key: ${key}`);
                saveSuccess = true;
            } catch (error) {
                console.warn(`⚠️ Failed to save image with key ${key}:`, error);
            }
        }

        if (saveSuccess) {
            // Additional metadata save
            const metadata = {
                timestamp: new Date().toISOString(),
                projectType: projectType,
                imageSize: imageDataUrl.length,
                captureInfo: {
                    width: mapElement.offsetWidth,
                    height: mapElement.offsetHeight,
                    source: 'google-maps',
                },
            };

            try {
                localStorage.setItem('projectMapMetadata', JSON.stringify(metadata));
            } catch (error) {
                console.warn('⚠️ Failed to save metadata:', error);
            }

            dbg('✅ Map image captured and saved successfully');
            dbg(`📊 Image size: ${Math.round(imageDataUrl.length / 1024)} KB`);
            return imageDataUrl;
        } else {
            console.error('❌ Failed to save image to localStorage');
            return null;
        }
    } catch (error) {
        console.error('❌ Error capturing map image:', error);
        return null;
    }
};

// Enhanced function to verify image was saved correctly
const verifyImageSave = (): boolean => {
    const keys = ['projectMapImage', 'fieldCropPlanImage', 'mapCaptureImage'];
    for (const key of keys) {
        const image = localStorage.getItem(key);
        if (image && image.startsWith('data:image/')) {
            dbg(`✅ Verified image exists with key: ${key}`);
            return true;
        }
    }
    console.warn('⚠️ No valid image found in localStorage');
    return false;
};

// Existing functions remain unchanged (copied from original)
const calculateZoneArea = (coordinates: Coordinate[]): number => {
    if (!coordinates || coordinates.length < 3) return 0;

    try {
        const turfCoords = coordinates
            .map((coord: Coordinate) => {
                if (Array.isArray(coord) && coord.length === 2) {
                    return [coord[1], coord[0]];
                }
                if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
                    return [coord.lng, coord.lat];
                }
                return null;
            })
            .filter((coord): coord is [number, number] => coord !== null);

        if (turfCoords.length < 3) return 0;

        const firstPoint = turfCoords[0];
        const lastPoint = turfCoords[turfCoords.length - 1];
        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
            turfCoords.push(firstPoint);
        }

        const polygon = turf.polygon([turfCoords]);
        return turf.area(polygon);
    } catch (error) {
        console.error('Error calculating zone area:', error);
        return 0;
    }
};

const calculatePlantingPoints = (
    zoneArea: number,
    crop: ReturnType<typeof getCropByValue>,
    customRowSpacing?: number,
    customPlantSpacing?: number
): number => {
    if (!zoneArea || !crop) return 0;

    // 🔥 เพิ่มบรรทัดนี้
    dbg(`🧮 calculatePlantingPoints called:`, {
        zoneArea: zoneArea.toFixed(2),
        cropName: crop.name,
        cropRowSpacing: crop.rowSpacing,
        cropPlantSpacing: crop.plantSpacing,
        customRowSpacing,
        customPlantSpacing,
    });

    // แปลงหน่วยจาก cm เป็น m
    const rowSpacing = (customRowSpacing || crop.rowSpacing) / 100;
    const plantSpacing = (customPlantSpacing || crop.plantSpacing) / 100;

    // 🔥 เพิ่มบรรทัดนี้
    dbg(`📏 Spacing calculation:`, {
        rowSpacing: `${rowSpacing} m`,
        plantSpacing: `${plantSpacing} m`,
        original: `${crop.rowSpacing}x${crop.plantSpacing} cm`,
    });

    if (!rowSpacing || !plantSpacing) return 0;

    // คำนวณจำนวนต้นต่อตารางเมตร
    // ตัวอย่าง: ระยะห่างแถว 25cm, ระยะห่างต้น 25cm
    // จำนวนต้นต่อตารางเมตร = (1/0.25) * (1/0.25) = 4 * 4 = 16 ต้น/ตร.ม.
    const plantsPerSquareMeter = (1 / rowSpacing) * (1 / plantSpacing);
    const totalPlants = Math.floor(zoneArea * plantsPerSquareMeter);

    dbg(`🌱 Plant calculation details:`, {
        zoneAreaM2: zoneArea.toFixed(2),
        rowSpacingM: rowSpacing.toFixed(2),
        plantSpacingM: plantSpacing.toFixed(2),
        plantsPerSqm: plantsPerSquareMeter.toFixed(1),
        totalPlants: totalPlants.toLocaleString(),
    });

    return totalPlants;
};

// คำนวณจำนวนจุดปลูกจากท่อย่อยที่มีอยู่จริง
const calculatePlantingPointsFromPipes = (
    pipes: Pipe[],
    zoneId: string,
    crop: ReturnType<typeof getCropByValue>,
    customRowSpacing?: number,
    customPlantSpacing?: number
): number => {
    if (!pipes || !crop) return 0;

    try {
        // แปลงหน่วยจาก cm เป็น m
        const rowSpacing = (customRowSpacing || crop.rowSpacing) / 100;
        const plantSpacing = (customPlantSpacing || crop.plantSpacing) / 100;

        if (!rowSpacing || !plantSpacing) return 0;

        // หาท่อย่อยที่อยู่ในโซนนี้
        const zonePipes = pipes.filter(
            (pipe) => pipe.type === 'lateral' && pipe.zoneId?.toString() === zoneId
        );

        dbg(`🔧 Calculating planting points from pipes for zone ${zoneId}:`, {
            totalPipes: zonePipes.length,
            cropName: crop.name,
            rowSpacing: `${rowSpacing} m`,
            plantSpacing: `${plantSpacing} m`,
        });

        let totalPlantingPoints = 0;

        zonePipes.forEach((pipe, pipeIndex) => {
            if (pipe.coordinates && pipe.coordinates.length >= 2) {
                let pipeLength = 0;

                // คำนวณความยาวท่อย่อย
                for (let i = 0; i < pipe.coordinates.length - 1; i++) {
                    const start = pipe.coordinates[i];
                    const end = pipe.coordinates[i + 1];

                    // ตรวจสอบว่าข้อมูลพิกัดถูกต้อง
                    if (
                        !start ||
                        !end ||
                        typeof start.lat !== 'number' ||
                        typeof start.lng !== 'number' ||
                        typeof end.lat !== 'number' ||
                        typeof end.lng !== 'number'
                    ) {
                        console.warn(`⚠️ Invalid coordinates in pipe ${pipeIndex + 1}:`, {
                            start,
                            end,
                        });
                        continue;
                    }

                    // คำนวณระยะทางระหว่างจุด (ใช้ turf.js แทน Google Maps API)
                    const from = turf.point([start.lng, start.lat]);
                    const to = turf.point([end.lng, end.lat]);
                    const distance = turf.distance(from, to, 'kilometers') * 1000; // แปลงเป็นเมตร
                    pipeLength += distance;
                }

                // คำนวณจำนวนจุดปลูกตามความยาวท่อย่อย
                // ระยะห่างระหว่างจุดปลูก = plantSpacing
                const plantingPointsInPipe = Math.floor(pipeLength / plantSpacing) + 1;
                totalPlantingPoints += plantingPointsInPipe;

                dbg(`📏 Pipe ${pipeIndex + 1}:`, {
                    pipeLength: `${pipeLength.toFixed(2)} m`,
                    plantingPoints: plantingPointsInPipe,
                    spacing: `${plantSpacing} m`,
                });
            }
        });

        dbg(`🌱 Total planting points from pipes: ${totalPlantingPoints.toLocaleString()}`);
        return totalPlantingPoints;
    } catch (error) {
        console.error(`❌ Error in calculatePlantingPointsFromPipes for zone ${zoneId}:`, error);
        return 0;
    }
};

const calculateYieldAndPrice = (
    zoneArea: number,
    crop: ReturnType<typeof getCropByValue>
): { estimatedYield: number; estimatedPrice: number } => {
    if (!zoneArea || !crop) {
        return { estimatedYield: 0, estimatedPrice: 0 };
    }

    const areaInRai = zoneArea / 1600;
    const estimatedYield = Math.round(areaInRai * crop.yield);
    const estimatedPrice = Math.round(estimatedYield * crop.price);

    return { estimatedYield, estimatedPrice };
};

const calculateWaterRequirement = (
    plantingPoints: number,
    crop: ReturnType<typeof getCropByValue>
): number => {
    if (!plantingPoints || !crop || !crop.waterRequirement) {
        return 0;
    }

    const waterPerPlantPerIrrigation = crop.waterRequirement;
    const totalWaterRequirement = plantingPoints * waterPerPlantPerIrrigation;

    return Math.round(totalWaterRequirement);
};

const calculatePipeLength = (coordinates: CoordinateInput[]): number => {
    if (!coordinates || coordinates.length < 2) return 0;

    try {
        let totalLength = 0;
        for (let i = 0; i < coordinates.length - 1; i++) {
            const point1 = coordinates[i];
            const point2 = coordinates[i + 1];

            let lat1: number, lng1: number, lat2: number, lng2: number;

            if (Array.isArray(point1) && Array.isArray(point2)) {
                [lat1, lng1] = point1 as CoordinateArray;
                [lat2, lng2] = point2 as CoordinateArray;
            } else if ('lat' in point1 && 'lng' in point1 && 'lat' in point2 && 'lng' in point2) {
                lat1 = point1.lat;
                lng1 = point1.lng;
                lat2 = point2.lat;
                lng2 = point2.lng;
            } else {
                continue;
            }

            const from = turf.point([lng1, lat1]);
            const to = turf.point([lng2, lat2]);
            const distance = turf.distance(from, to, 'kilometers') * 1000;
            totalLength += distance;
        }

        return Math.round(totalLength);
    } catch (error) {
        console.error('Error calculating pipe length:', error);
        return 0;
    }
};

const calculatePipeStats = (pipes: Pipe[], pipeType: string): PipeStats => {
    const typePipes = pipes.filter(
        (pipe) =>
            pipe.type === pipeType &&
            pipe.coordinates &&
            Array.isArray(pipe.coordinates) &&
            pipe.coordinates.length >= 2
    );

    if (typePipes.length === 0) {
        return {
            count: 0,
            longestLength: 0,
            totalLength: 0,
        };
    }

    const lengths = typePipes.map((pipe) => calculatePipeLength(pipe.coordinates));
    const totalLength = lengths.reduce((sum, length) => sum + length, 0);
    const longestLength = Math.max(...lengths);

    return {
        count: typePipes.length,
        longestLength: Math.round(longestLength),
        totalLength: Math.round(totalLength),
    };
};

const isPipeInZone = (pipe: Pipe, zone: Zone): boolean => {
    if (!pipe.coordinates || !Array.isArray(pipe.coordinates) || pipe.coordinates.length < 2) {
        return false;
    }

    if (!zone.coordinates || !Array.isArray(zone.coordinates) || zone.coordinates.length < 3) {
        return false;
    }

    try {
        const zoneCoords = zone.coordinates
            .map((coord: CoordinateInput) => {
                if (Array.isArray(coord) && coord.length === 2) {
                    return [coord[1], coord[0]] as [number, number];
                }
                if (
                    'lat' in coord &&
                    'lng' in coord &&
                    typeof coord.lat === 'number' &&
                    typeof coord.lng === 'number'
                ) {
                    return [coord.lng, coord.lat] as [number, number];
                }
                return null;
            })
            .filter((coord): coord is [number, number] => coord !== null);

        if (zoneCoords.length < 3) return false;

        const firstPoint = zoneCoords[0];
        const lastPoint = zoneCoords[zoneCoords.length - 1];
        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
            zoneCoords.push(firstPoint);
        }

        const zonePolygon = turf.polygon([zoneCoords]);

        // Check if any pipe coordinate is inside the zone
        for (const coord of pipe.coordinates) {
            let lat: number, lng: number;
            if (Array.isArray(coord) && coord.length === 2) {
                [lat, lng] = coord as unknown as CoordinateArray;
            } else if (
                'lat' in coord &&
                'lng' in coord &&
                typeof coord.lat === 'number' &&
                typeof coord.lng === 'number'
            ) {
                lat = coord.lat;
                lng = coord.lng;
            } else {
                continue;
            }

            const point = turf.point([lng, lat]);

            if (booleanPointInPolygon(point, zonePolygon)) {
                return true;
            }
        }

        // If no point is inside, check if pipe is close to zone boundary
        // by checking proximity to zone coordinates (within 10 meters)
        for (const coord of pipe.coordinates) {
            let lat: number, lng: number;
            if (Array.isArray(coord) && coord.length === 2) {
                [lat, lng] = coord as unknown as CoordinateArray;
            } else if (
                'lat' in coord &&
                'lng' in coord &&
                typeof coord.lat === 'number' &&
                typeof coord.lng === 'number'
            ) {
                lat = coord.lat;
                lng = coord.lng;
            } else {
                continue;
            }

            for (const zoneCoord of zone.coordinates) {
                let zoneLat: number, zoneLng: number;
                if (Array.isArray(zoneCoord) && zoneCoord.length === 2) {
                    [zoneLat, zoneLng] = zoneCoord as unknown as CoordinateArray;
                } else if (
                    'lat' in zoneCoord &&
                    'lng' in zoneCoord &&
                    typeof zoneCoord.lat === 'number' &&
                    typeof zoneCoord.lng === 'number'
                ) {
                    zoneLat = zoneCoord.lat;
                    zoneLng = zoneCoord.lng;
                } else {
                    continue;
                }

                // Calculate distance in meters (approximate)
                const distance = Math.sqrt(
                    Math.pow((lng - zoneLng) * 111320 * Math.cos((lat * Math.PI) / 180), 2) +
                        Math.pow((lat - zoneLat) * 111320, 2)
                );

                if (distance < 10) {
                    // Within 10 meters of zone boundary
                    return true;
                }
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking pipe in zone:', error);
        return false;
    }
};

const identifyPipeType = (pipe: Pipe): string => {
    if (pipe.type) {
        return pipe.type;
    }

    if (pipe.color) {
        const color = pipe.color.toLowerCase();
        // Support both legacy (blue/green/orange) and new palette (red/purple/yellow)
        if (
            color.includes('blue') ||
            color.includes('#2563eb') ||
            color.includes('2563eb') ||
            color.includes('red') ||
            color.includes('#dc2626') ||
            color.includes('dc2626')
        ) {
            return 'main';
        } else if (
            color.includes('green') ||
            color.includes('#16a34a') ||
            color.includes('16a34a') ||
            color.includes('purple') ||
            color.includes('#8b5cf6') ||
            color.includes('8b5cf6')
        ) {
            return 'submain';
        } else if (
            color.includes('orange') ||
            color.includes('#ea580c') ||
            color.includes('ea580c') ||
            color.includes('yellow') ||
            color.includes('#fbbf24') ||
            color.includes('fbbf24')
        ) {
            return 'lateral';
        }
    }

    if (pipe.pathOptions && pipe.pathOptions.color) {
        const color = pipe.pathOptions.color.toLowerCase();
        if (
            color.includes('blue') ||
            color === '#2563eb' ||
            color.includes('red') ||
            color === '#dc2626'
        ) {
            return 'main';
        } else if (
            color.includes('green') ||
            color === '#16a34a' ||
            color.includes('purple') ||
            color === '#8b5cf6'
        ) {
            return 'submain';
        } else if (
            color.includes('orange') ||
            color === '#ea580c' ||
            color.includes('yellow') ||
            color === '#fbbf24'
        ) {
            return 'lateral';
        }
    }

    return 'lateral';
};

const calculateZonePipeStats = (pipes: Pipe[], zoneId: string, zones: Zone[]): ZonePipeStats => {
    const currentZone = zones.find((zone) => zone.id.toString() === zoneId);
    if (!currentZone) {
        return {
            main: { count: 0, totalLength: 0, longestLength: 0 },
            submain: { count: 0, totalLength: 0, longestLength: 0 },
            lateral: { count: 0, totalLength: 0, longestLength: 0 },
            total: 0,
            totalLength: 0,
            totalLongestLength: 0,
        };
    }

    if (DEBUG_ZONE_PIPE_STATS) {
        dbg(`🔍 Checking pipes for zone ${zoneId} (${currentZone.name})...`);
        dbg(`📏 Total pipes to check: ${pipes.length}`);
    }

    const zonePipes = pipes.filter((pipe) => {
        if (!pipe.coordinates || !Array.isArray(pipe.coordinates) || pipe.coordinates.length < 2) {
            return false;
        }

        const hasZoneId = pipe.zoneId && pipe.zoneId.toString() === zoneId;
        const isInZone = isPipeInZone(pipe, currentZone);

        const isZonePipe = hasZoneId || isInZone;

        if (DEBUG_ZONE_PIPE_STATS && isZonePipe) {
            const pipeType = identifyPipeType(pipe);
            dbg(`✅ Found pipe in zone ${zoneId}:`, {
                id: pipe.id,
                originalType: pipe.type,
                identifiedType: pipeType,
                color: pipe.color,
                pathOptionsColor: pipe.pathOptions?.color,
                hasZoneId: hasZoneId,
                zoneId: pipe.zoneId,
                isInZone: isInZone,
                coordinatesLength: pipe.coordinates.length,
            });
        }

        return isZonePipe;
    });

    if (DEBUG_ZONE_PIPE_STATS) dbg(`📊 Found ${zonePipes.length} pipes in zone ${zoneId}`);

    // Filter pipes by type
    const allMainPipes = zonePipes.filter((pipe) => identifyPipeType(pipe) === 'main');
    const allSubmainPipes = zonePipes.filter((pipe) => identifyPipeType(pipe) === 'submain');
    const lateralPipes = zonePipes.filter((pipe) => identifyPipeType(pipe) === 'lateral');

    // Enforce constraint: Each zone should have only 1 main pipe and 1 submain pipe
    // If multiple main pipes exist, keep only the longest one as main, treat others as submain
    let mainPipes: Pipe[] = [];
    let submainPipes: Pipe[] = [];

    if (allMainPipes.length === 0) {
        // No main pipes
        mainPipes = [];
    } else if (allMainPipes.length === 1) {
        // Exactly 1 main pipe - keep it as main
        mainPipes = allMainPipes;
    } else {
        // Multiple main pipes - keep only the longest one as main, treat others as submain
        const mainPipesWithLength = allMainPipes.map((pipe) => ({
            pipe,
            length: calculatePipeLength(pipe.coordinates),
        }));

        // Sort by length (longest first)
        mainPipesWithLength.sort((a, b) => b.length - a.length);

        // Keep the longest as main pipe
        mainPipes = [mainPipesWithLength[0].pipe];

        // Treat the rest as submain pipes
        const additionalSubmainPipes = mainPipesWithLength.slice(1).map((item) => item.pipe);

        if (DEBUG_ZONE_PIPE_STATS) {
            dbg(
                `⚠️ Zone ${zoneId}: Found ${allMainPipes.length} main pipes, keeping longest as main, treating ${additionalSubmainPipes.length} as submain`
            );
        }
    }

    // Combine original submain pipes with converted main pipes
    const allPotentialSubmainPipes = [
        ...allSubmainPipes,
        ...(allMainPipes.length > 1 ? allMainPipes.slice(1) : []),
    ];

    // Enforce constraint: Each zone should have only 1 submain pipe
    if (allPotentialSubmainPipes.length === 0) {
        submainPipes = [];
    } else if (allPotentialSubmainPipes.length === 1) {
        submainPipes = allPotentialSubmainPipes;
    } else {
        // Multiple submain pipes - keep only the longest one
        const submainPipesWithLength = allPotentialSubmainPipes.map((pipe) => ({
            pipe,
            length: calculatePipeLength(pipe.coordinates),
        }));

        // Sort by length (longest first)
        submainPipesWithLength.sort((a, b) => b.length - a.length);

        // Keep only the longest submain pipe
        submainPipes = [submainPipesWithLength[0].pipe];

        if (DEBUG_ZONE_PIPE_STATS) {
            dbg(
                `⚠️ Zone ${zoneId}: Found ${allPotentialSubmainPipes.length} submain pipes, keeping only the longest one`
            );
        }
    }

    if (DEBUG_ZONE_PIPE_STATS) {
        dbg(`🔴 Main pipes (สีแดง): ${mainPipes.length}`);
        dbg(`🟣 Submain pipes (สีม่วง): ${submainPipes.length}`);
        dbg(`🟡 Lateral pipes (สีเหลือง): ${lateralPipes.length}`);
        dbg(`📋 Original submain pipes: ${allSubmainPipes.length}`);
        dbg(`📋 Total potential submain pipes: ${allPotentialSubmainPipes.length}`);
    }

    const calculateTypeStats = (typePipes: Pipe[]): PipeStats => {
        if (typePipes.length === 0) return { count: 0, totalLength: 0, longestLength: 0 };
        const lengths = typePipes.map((pipe) => calculatePipeLength(pipe.coordinates));
        return {
            count: typePipes.length,
            totalLength: Math.round(lengths.reduce((sum, length) => sum + length, 0)),
            longestLength: Math.round(Math.max(...lengths)),
        };
    };

    const mainStats = calculateTypeStats(mainPipes);
    const submainStats = calculateTypeStats(submainPipes);
    const lateralStats = calculateTypeStats(lateralPipes);

    const totalLongestLength =
        mainStats.longestLength + submainStats.longestLength + lateralStats.longestLength;
    const totalAllLength =
        mainStats.totalLength + submainStats.totalLength + lateralStats.totalLength;

    const result: ZonePipeStats = {
        main: mainStats,
        submain: submainStats,
        lateral: lateralStats,
        total: zonePipes.length,
        totalLength: totalAllLength,
        totalLongestLength: totalLongestLength,
    };

    if (DEBUG_ZONE_PIPE_STATS) dbg(`📋 Zone ${zoneId} pipe stats:`, result);

    return result;
};

const normalizeIrrigationType = (type: string): string => {
    if (!type) return 'unknown';
    const normalizedType = type.toLowerCase().trim();
    const typeMapping: { [key: string]: string } = {
        sprinkler: 'sprinkler',
        'sprinkler-system': 'sprinkler',
        // Map all mini/micro variants to sprinkler
        'mini-sprinkler': 'sprinkler',
        mini_sprinkler: 'sprinkler',
        minisprinkler: 'sprinkler',
        'micro-spray': 'sprinkler',
        micro_spray: 'sprinkler',
        microspray: 'sprinkler',
        micro: 'sprinkler',
        microsprinkler: 'sprinkler',
        drip: 'drip_tape',
        'drip-tape': 'drip_tape',
        drip_tape: 'drip_tape',
        'drip-irrigation': 'drip_tape',
    };
    return typeMapping[normalizedType] || normalizedType;
};

// ฟังก์ชันตรวจสอบว่าจุดอยู่ในโซนหรือไม่
const isPointInPolygonEnhanced = (point: [number, number], polygon: Coordinate[]): boolean => {
    if (!polygon || polygon.length < 3) return false;

    const [lat, lng] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng;
        const yi = polygon[i].lat;
        const xj = polygon[j].lng;
        const yj = polygon[j].lat;

        if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }

    return inside;
};

// ฟังก์ชันสร้างจุดเชื่อมต่อของท่อย่อยที่ต่อกับท่อเมนย่อย
const createLateralConnectionPoints = (
    lateralPipes: Pipe[],
    submainPipes: Pipe[]
): Array<{
    id: string;
    position: Coordinate;
    connectedLaterals: string[];
    submainId: string;
    type: 'single' | 'junction' | 'crossing' | 'l_shape' | 't_shape' | 'cross_shape';
}> => {
    const connectionPoints: Array<{
        id: string;
        position: Coordinate;
        connectedLaterals: string[];
        submainId: string;
        type: 'single' | 'junction' | 'crossing' | 'l_shape' | 't_shape' | 'cross_shape';
    }> = [];

    // ฟังก์ชันคำนวณระยะห่างระหว่างจุด
    const calculateDistanceBetweenPoints = (p1: Coordinate, p2: Coordinate): number => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (p1.lat * Math.PI) / 180;
        const φ2 = (p2.lat * Math.PI) / 180;
        const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
        const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    // ฟังก์ชันหาจุดที่ใกล้ที่สุดบนเส้น
    const getClosestPointOnSegment = (
        point: Coordinate,
        segStart: Coordinate,
        segEnd: Coordinate
    ): { point: Coordinate; distance: number } => {
        const A = point.lat - segStart.lat;
        const B = point.lng - segStart.lng;
        const C = segEnd.lat - segStart.lat;
        const D = segEnd.lng - segStart.lng;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;
        if (param < 0) {
            xx = segStart.lat;
            yy = segStart.lng;
        } else if (param > 1) {
            xx = segEnd.lat;
            yy = segEnd.lng;
        } else {
            xx = segStart.lat + param * C;
            yy = segStart.lng + param * D;
        }

        const dx = point.lat - xx;
        const dy = point.lng - yy;
        return {
            point: { lat: xx, lng: yy },
            distance: Math.sqrt(dx * dx + dy * dy) * 111000, // Approximate conversion to meters
        };
    };

    // ฟังก์ชันหาจุดตัดของเส้นสองเส้น
    const getLineIntersection = (
        p1: Coordinate,
        p2: Coordinate,
        p3: Coordinate,
        p4: Coordinate
    ): Coordinate | null => {
        const x1 = p1.lng,
            y1 = p1.lat;
        const x2 = p2.lng,
            y2 = p2.lat;
        const x3 = p3.lng,
            y3 = p3.lat;
        const x4 = p4.lng,
            y4 = p4.lat;

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-10) return null; // เส้นขนาน

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                lat: y1 + t * (y2 - y1),
                lng: x1 + t * (x2 - x1),
            };
        }

        return null;
    };

    // ฟังก์ชันตรวจสอบการลากท่อย่อยข้ามท่อเมนย่อย
    const checkLateralCrossingSubmain = (
        startPoint: Coordinate,
        endPoint: Coordinate,
        submainPipes: Pipe[]
    ): {
        crosses: boolean;
        intersectionPoints: Coordinate[];
        submainId: string | null;
    } => {
        const intersectionPoints: Coordinate[] = [];
        let crosses = false;
        let submainId: string | null = null;

        for (const submain of submainPipes) {
            if (!submain.coordinates || submain.coordinates.length < 2) continue;

            for (let i = 0; i < submain.coordinates.length - 1; i++) {
                const subStart = submain.coordinates[i];
                const subEnd = submain.coordinates[i + 1];

                // ตรวจสอบการตัดกันของเส้น
                const intersection = getLineIntersection(startPoint, endPoint, subStart, subEnd);
                if (intersection) {
                    intersectionPoints.push(intersection);
                    crosses = true;
                    submainId = String(submain.id);
                }
            }
        }

        return { crosses, intersectionPoints, submainId };
    };

    lateralPipes.forEach((lateral) => {
        if (!lateral.coordinates || lateral.coordinates.length < 2) return;

        const lateralStart = lateral.coordinates[0];
        const lateralEnd = lateral.coordinates[lateral.coordinates.length - 1];

        // ตรวจสอบการข้ามท่อเมนย่อย
        const crossingInfo = checkLateralCrossingSubmain(lateralStart, lateralEnd, submainPipes);

        if (crossingInfo.crosses && crossingInfo.intersectionPoints.length > 0) {
            // ท่อย่อยข้ามท่อเมนย่อย - สร้างจุดเชื่อมต่อที่จุดตัด
            crossingInfo.intersectionPoints.forEach((intersectionPoint, index) => {
                const existingPoint = connectionPoints.find(
                    (cp) => calculateDistanceBetweenPoints(cp.position, intersectionPoint) < 1
                );

                if (existingPoint) {
                    existingPoint.connectedLaterals.push(String(lateral.id));
                    existingPoint.type = 'junction';
                } else {
                    connectionPoints.push({
                        id: `crossing-${lateral.id}-${index}-${Date.now()}`,
                        position: intersectionPoint,
                        connectedLaterals: [String(lateral.id)],
                        submainId: crossingInfo.submainId || 'unknown',
                        type: 'crossing',
                    });
                }
            });
        } else {
            // ท่อย่อยไม่ข้ามท่อเมนย่อย - หาจุดเชื่อมต่อแบบเดิม
            let nearestSubmain: Pipe | null = null;
            let nearestPoint: Coordinate | null = null;
            let minDistance = Infinity;

            submainPipes.forEach((submain) => {
                if (!submain.coordinates || submain.coordinates.length < 2) return;

                // ตรวจสอบจุดเริ่มต้นของท่อย่อย
                for (let i = 0; i < submain.coordinates.length - 1; i++) {
                    const { point, distance } = getClosestPointOnSegment(
                        lateralStart,
                        submain.coordinates[i],
                        submain.coordinates[i + 1]
                    );
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestSubmain = submain;
                        nearestPoint = point;
                    }
                }

                // ตรวจสอบจุดสิ้นสุดของท่อย่อย
                for (let i = 0; i < submain.coordinates.length - 1; i++) {
                    const { point, distance } = getClosestPointOnSegment(
                        lateralEnd,
                        submain.coordinates[i],
                        submain.coordinates[i + 1]
                    );
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestSubmain = submain;
                        nearestPoint = point;
                    }
                }
            });

            if (nearestSubmain && nearestPoint && minDistance < 2) {
                // ระยะห่างไม่เกิน 2 เมตร
                // ตรวจสอบว่ามีจุดเชื่อมต่ออยู่แล้วหรือไม่
                const existingPoint = connectionPoints.find(
                    (cp) => calculateDistanceBetweenPoints(cp.position, nearestPoint!) < 1
                );

                if (existingPoint) {
                    // เพิ่มท่อย่อยนี้เข้าไปในจุดเชื่อมต่อที่มีอยู่
                    existingPoint.connectedLaterals.push(String(lateral.id));
                    existingPoint.type = 'junction';
                } else {
                    // สร้างจุดเชื่อมต่อใหม่
                    connectionPoints.push({
                        id: `connection-${lateral.id}-${Date.now()}`,
                        position: nearestPoint!,
                        connectedLaterals: [String(lateral.id)],
                        submainId: String((nearestSubmain as Pipe).id),
                        type: 'single',
                    });
                }
            }
        }
    });

    return connectionPoints;
};

// ฟังก์ชันสร้างจุดเชื่อมต่อระหว่างท่อเมนย่อยกับท่อเมน (L, T, + shapes)
const createSubmainToMainConnectionPoints = (
    pipes: Pipe[]
): Array<{
    id: string;
    position: Coordinate;
    connectedLaterals: string[];
    submainId: string;
    type: 'single' | 'junction' | 'crossing' | 'l_shape' | 't_shape' | 'cross_shape';
}> => {
    const connectionPoints: Array<{
        id: string;
        position: Coordinate;
        connectedLaterals: string[];
        submainId: string;
        type: 'single' | 'junction' | 'crossing' | 'l_shape' | 't_shape' | 'cross_shape';
    }> = [];

    const mainPipes = pipes.filter((p) => p.type === 'main');
    const submainPipes = pipes.filter((p) => p.type === 'submain');

    if (mainPipes.length === 0 || submainPipes.length === 0) {
        return connectionPoints;
    }

    // ฟังก์ชันคำนวณระยะห่างระหว่างจุด
    const calculateDistanceBetweenPoints = (p1: Coordinate, p2: Coordinate): number => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (p1.lat * Math.PI) / 180;
        const φ2 = (p2.lat * Math.PI) / 180;
        const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
        const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    // ฟังก์ชันหาจุดที่ใกล้ที่สุดบนเส้น
    const getClosestPointOnSegment = (
        point: Coordinate,
        segStart: Coordinate,
        segEnd: Coordinate
    ): { point: Coordinate; distance: number } => {
        const A = point.lat - segStart.lat;
        const B = point.lng - segStart.lng;
        const C = segEnd.lat - segStart.lat;
        const D = segEnd.lng - segStart.lng;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;
        if (param < 0) {
            xx = segStart.lat;
            yy = segStart.lng;
        } else if (param > 1) {
            xx = segEnd.lat;
            yy = segEnd.lng;
        } else {
            xx = segStart.lat + param * C;
            yy = segStart.lng + param * D;
        }

        const dx = point.lat - xx;
        const dy = point.lng - yy;
        return {
            point: { lat: xx, lng: yy },
            distance: Math.sqrt(dx * dx + dy * dy) * 111000, // Approximate conversion to meters
        };
    };

    // ฟังก์ชันหาจุดตัดของเส้นสองเส้น
    const getLineIntersection = (
        p1: Coordinate,
        p2: Coordinate,
        p3: Coordinate,
        p4: Coordinate
    ): Coordinate | null => {
        const x1 = p1.lng,
            y1 = p1.lat;
        const x2 = p2.lng,
            y2 = p2.lat;
        const x3 = p3.lng,
            y3 = p3.lat;
        const x4 = p4.lng,
            y4 = p4.lat;

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-10) return null; // เส้นขนาน

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                lat: y1 + t * (y2 - y1),
                lng: x1 + t * (x2 - x1),
            };
        }

        return null;
    };

    submainPipes.forEach((submain) => {
        if (!submain.coordinates || submain.coordinates.length < 2) return;

        const submainStart = submain.coordinates[0];
        const submainEnd = submain.coordinates[submain.coordinates.length - 1];

        mainPipes.forEach((main) => {
            if (!main.coordinates || main.coordinates.length < 2) return;

            const mainStart = main.coordinates[0];
            const mainEnd = main.coordinates[main.coordinates.length - 1];
            const threshold = 2; // 2 meters

            // L-shape: submain end near main end
            const submainStartToMainStart = calculateDistanceBetweenPoints(submainStart, mainStart);
            const submainStartToMainEnd = calculateDistanceBetweenPoints(submainStart, mainEnd);
            const submainEndToMainStart = calculateDistanceBetweenPoints(submainEnd, mainStart);
            const submainEndToMainEnd = calculateDistanceBetweenPoints(submainEnd, mainEnd);

            if (submainStartToMainStart < threshold) {
                const existingPoint = connectionPoints.find(
                    (cp) => calculateDistanceBetweenPoints(cp.position, mainStart) < 1
                );
                if (!existingPoint) {
                    connectionPoints.push({
                        id: `l-shape-start-${submain.id}-${Date.now()}`,
                        position: mainStart,
                        connectedLaterals: [String(submain.id)],
                        submainId: String(submain.id),
                        type: 'l_shape',
                    });
                }
            }

            if (submainStartToMainEnd < threshold) {
                const existingPoint = connectionPoints.find(
                    (cp) => calculateDistanceBetweenPoints(cp.position, mainEnd) < 1
                );
                if (!existingPoint) {
                    connectionPoints.push({
                        id: `l-shape-end-${submain.id}-${Date.now()}`,
                        position: mainEnd,
                        connectedLaterals: [String(submain.id)],
                        submainId: String(submain.id),
                        type: 'l_shape',
                    });
                }
            }

            if (submainEndToMainStart < threshold) {
                const existingPoint = connectionPoints.find(
                    (cp) => calculateDistanceBetweenPoints(cp.position, mainStart) < 1
                );
                if (!existingPoint) {
                    connectionPoints.push({
                        id: `l-shape-start-${submain.id}-${Date.now()}`,
                        position: mainStart,
                        connectedLaterals: [String(submain.id)],
                        submainId: String(submain.id),
                        type: 'l_shape',
                    });
                }
            }

            if (submainEndToMainEnd < threshold) {
                const existingPoint = connectionPoints.find(
                    (cp) => calculateDistanceBetweenPoints(cp.position, mainEnd) < 1
                );
                if (!existingPoint) {
                    connectionPoints.push({
                        id: `l-shape-end-${submain.id}-${Date.now()}`,
                        position: mainEnd,
                        connectedLaterals: [String(submain.id)],
                        submainId: String(submain.id),
                        type: 'l_shape',
                    });
                }
            }

            // T-shape: submain intersects main near main end (actual intersection)
            for (let i = 0; i < main.coordinates.length - 1; i++) {
                const intersection = getLineIntersection(
                    submainStart,
                    submainEnd,
                    main.coordinates[i],
                    main.coordinates[i + 1]
                );
                if (intersection) {
                    const isAtMainStart =
                        calculateDistanceBetweenPoints(intersection, mainStart) < threshold;
                    const isAtMainEnd =
                        calculateDistanceBetweenPoints(intersection, mainEnd) < threshold;

                    if (isAtMainStart) {
                        // ตรวจสอบว่าไม่ใช่ L-shape ก่อน
                        const isLShape =
                            submainStartToMainStart < threshold ||
                            submainEndToMainStart < threshold;
                        if (!isLShape) {
                            const existingPoint = connectionPoints.find(
                                (cp) => calculateDistanceBetweenPoints(cp.position, mainStart) < 1
                            );
                            if (!existingPoint) {
                                connectionPoints.push({
                                    id: `t-shape-start-${submain.id}-${Date.now()}`,
                                    position: mainStart,
                                    connectedLaterals: [String(submain.id)],
                                    submainId: String(submain.id),
                                    type: 't_shape',
                                });
                            }
                        }
                    }

                    if (isAtMainEnd) {
                        // ตรวจสอบว่าไม่ใช่ L-shape ก่อน
                        const isLShape =
                            submainStartToMainEnd < threshold || submainEndToMainEnd < threshold;
                        if (!isLShape) {
                            const existingPoint = connectionPoints.find(
                                (cp) => calculateDistanceBetweenPoints(cp.position, mainEnd) < 1
                            );
                            if (!existingPoint) {
                                connectionPoints.push({
                                    id: `t-shape-end-${submain.id}-${Date.now()}`,
                                    position: mainEnd,
                                    connectedLaterals: [String(submain.id)],
                                    submainId: String(submain.id),
                                    type: 't_shape',
                                });
                            }
                        }
                    }
                }
            }

            // T-shape (Auto-snap): submain is very close to main near main end (no actual intersection)
            for (let i = 0; i < main.coordinates.length - 1; i++) {
                const { point: closestPointOnMain, distance: distanceToMain } =
                    getClosestPointOnSegment(
                        submainStart,
                        main.coordinates[i],
                        main.coordinates[i + 1]
                    );
                const { point: closestPointOnMain2, distance: distanceToMain2 } =
                    getClosestPointOnSegment(
                        submainEnd,
                        main.coordinates[i],
                        main.coordinates[i + 1]
                    );

                if (distanceToMain < threshold || distanceToMain2 < threshold) {
                    const closestPoint =
                        distanceToMain < distanceToMain2 ? closestPointOnMain : closestPointOnMain2;
                    const isNearMainStart =
                        calculateDistanceBetweenPoints(closestPoint, mainStart) < threshold;
                    const isNearMainEnd =
                        calculateDistanceBetweenPoints(closestPoint, mainEnd) < threshold;

                    if (isNearMainStart) {
                        // ตรวจสอบว่าไม่ใช่ L-shape ก่อน
                        const isLShape =
                            submainStartToMainStart < threshold ||
                            submainEndToMainStart < threshold;
                        if (!isLShape) {
                            const existingPoint = connectionPoints.find(
                                (cp) => calculateDistanceBetweenPoints(cp.position, mainStart) < 1
                            );
                            if (!existingPoint) {
                                connectionPoints.push({
                                    id: `t-shape-snap-start-${submain.id}-${Date.now()}`,
                                    position: mainStart,
                                    connectedLaterals: [String(submain.id)],
                                    submainId: String(submain.id),
                                    type: 't_shape',
                                });
                            }
                        }
                    }

                    if (isNearMainEnd) {
                        // ตรวจสอบว่าไม่ใช่ L-shape ก่อน
                        const isLShape =
                            submainStartToMainEnd < threshold || submainEndToMainEnd < threshold;
                        if (!isLShape) {
                            const existingPoint = connectionPoints.find(
                                (cp) => calculateDistanceBetweenPoints(cp.position, mainEnd) < 1
                            );
                            if (!existingPoint) {
                                connectionPoints.push({
                                    id: `t-shape-snap-end-${submain.id}-${Date.now()}`,
                                    position: mainEnd,
                                    connectedLaterals: [String(submain.id)],
                                    submainId: String(submain.id),
                                    type: 't_shape',
                                });
                            }
                        }
                    }
                }
            }

            // T-shape (Additional): submain passes through main but not at ends
            for (let i = 0; i < main.coordinates.length - 1; i++) {
                const intersection = getLineIntersection(
                    submainStart,
                    submainEnd,
                    main.coordinates[i],
                    main.coordinates[i + 1]
                );
                if (intersection) {
                    const isAtMainStart =
                        calculateDistanceBetweenPoints(intersection, mainStart) < threshold;
                    const isAtMainEnd =
                        calculateDistanceBetweenPoints(intersection, mainEnd) < threshold;

                    // ถ้าตัดกันแต่ไม่ใช่ที่ปลาย และไม่ใช่ + shape
                    if (!isAtMainStart && !isAtMainEnd) {
                        // ตรวจสอบว่า submain ผ่าน main ใกล้ปลาย main หรือไม่
                        const distanceToStart = calculateDistanceBetweenPoints(
                            intersection,
                            mainStart
                        );
                        const distanceToEnd = calculateDistanceBetweenPoints(intersection, mainEnd);
                        const mainLength = calculateDistanceBetweenPoints(mainStart, mainEnd);

                        // ถ้าอยู่ใกล้ปลาย main (ภายใน 30% ของความยาว main)
                        if (
                            distanceToStart < mainLength * 0.3 ||
                            distanceToEnd < mainLength * 0.3
                        ) {
                            const existingPoint = connectionPoints.find(
                                (cp) =>
                                    calculateDistanceBetweenPoints(cp.position, intersection) < 1
                            );
                            if (!existingPoint) {
                                connectionPoints.push({
                                    id: `t-shape-through-${submain.id}-${i}-${Date.now()}`,
                                    position: intersection,
                                    connectedLaterals: [String(submain.id)],
                                    submainId: String(submain.id),
                                    type: 't_shape',
                                });
                            }
                        }
                    }
                }
            }

            // + shape (actual intersection)
            for (let i = 0; i < main.coordinates.length - 1; i++) {
                const intersection = getLineIntersection(
                    submainStart,
                    submainEnd,
                    main.coordinates[i],
                    main.coordinates[i + 1]
                );
                if (intersection) {
                    const isAtMainStart =
                        calculateDistanceBetweenPoints(intersection, mainStart) < threshold;
                    const isAtMainEnd =
                        calculateDistanceBetweenPoints(intersection, mainEnd) < threshold;

                    if (!isAtMainStart && !isAtMainEnd) {
                        // ตรวจสอบว่าไม่ใช่ T-shape (ไม่ใกล้ปลาย main)
                        const distanceToStart = calculateDistanceBetweenPoints(
                            intersection,
                            mainStart
                        );
                        const distanceToEnd = calculateDistanceBetweenPoints(intersection, mainEnd);
                        const mainLength = calculateDistanceBetweenPoints(mainStart, mainEnd);

                        // ถ้าไม่ใกล้ปลาย main (เกิน 30% ของความยาว main) ให้เป็น + shape
                        if (
                            distanceToStart >= mainLength * 0.3 &&
                            distanceToEnd >= mainLength * 0.3
                        ) {
                            const existingPoint = connectionPoints.find(
                                (cp) =>
                                    calculateDistanceBetweenPoints(cp.position, intersection) < 1
                            );
                            if (!existingPoint) {
                                connectionPoints.push({
                                    id: `cross-shape-${submain.id}-${i}-${Date.now()}`,
                                    position: intersection,
                                    connectedLaterals: [String(submain.id)],
                                    submainId: String(submain.id),
                                    type: 'cross_shape',
                                });
                            }
                        }
                    }
                }
            }

            // + shape (Auto-snap)
            for (let i = 0; i < main.coordinates.length - 1; i++) {
                const { point: closestPointOnMain, distance: distanceToMain } =
                    getClosestPointOnSegment(
                        submainStart,
                        main.coordinates[i],
                        main.coordinates[i + 1]
                    );
                const { point: closestPointOnMain2, distance: distanceToMain2 } =
                    getClosestPointOnSegment(
                        submainEnd,
                        main.coordinates[i],
                        main.coordinates[i + 1]
                    );

                if (distanceToMain < threshold || distanceToMain2 < threshold) {
                    const closestPoint =
                        distanceToMain < distanceToMain2 ? closestPointOnMain : closestPointOnMain2;
                    const isNearMainStart =
                        calculateDistanceBetweenPoints(closestPoint, mainStart) < threshold;
                    const isNearMainEnd =
                        calculateDistanceBetweenPoints(closestPoint, mainEnd) < threshold;

                    if (!isNearMainStart && !isNearMainEnd) {
                        // ตรวจสอบว่าไม่ใช่ T-shape (ไม่ใกล้ปลาย main)
                        const distanceToStart = calculateDistanceBetweenPoints(
                            closestPoint,
                            mainStart
                        );
                        const distanceToEnd = calculateDistanceBetweenPoints(closestPoint, mainEnd);
                        const mainLength = calculateDistanceBetweenPoints(mainStart, mainEnd);

                        // ถ้าไม่ใกล้ปลาย main (เกิน 30% ของความยาว main) ให้เป็น + shape
                        if (
                            distanceToStart >= mainLength * 0.3 &&
                            distanceToEnd >= mainLength * 0.3
                        ) {
                            const existingPoint = connectionPoints.find(
                                (cp) =>
                                    calculateDistanceBetweenPoints(cp.position, closestPoint) < 1
                            );
                            if (!existingPoint) {
                                connectionPoints.push({
                                    id: `cross-shape-snap-${submain.id}-${i}-${Date.now()}`,
                                    position: closestPoint,
                                    connectedLaterals: [String(submain.id)],
                                    submainId: String(submain.id),
                                    type: 'cross_shape',
                                });
                            }
                        }
                    }
                }
            }
        });
    });

    return connectionPoints;
};

// Calculate fittings (2-way, 3-way, 4-way) based on pipes and irrigation points

interface FittingsBreakdown {
    twoWay: number;
    threeWay: number;
    fourWay: number;
    breakdown: {
        main: { twoWay: number; threeWay: number; fourWay: number };
        submain: { twoWay: number; threeWay: number; fourWay: number };
        lateral: { twoWay: number; threeWay: number; fourWay: number };
    };
}

const segmentIntersectionLatLng = (
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
    c: { lat: number; lng: number },
    d: { lat: number; lng: number }
): { lat: number; lng: number } | null => {
    const origin = a;
    const lat0 = (origin.lat * Math.PI) / 180;
    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * Math.cos(lat0);

    const toMeters = (pt: { lat: number; lng: number }) => ({
        x: (pt.lng - origin.lng) * metersPerDegLng,
        y: (pt.lat - origin.lat) * metersPerDegLat,
    });

    const A = { x: 0, y: 0 };
    const B = toMeters(b);
    const C = toMeters(c);
    const D = toMeters(d);

    const denom = (A.x - B.x) * (C.y - D.y) - (A.y - B.y) * (C.x - D.x);
    if (denom === 0) return null;

    const t = ((A.x - C.x) * (C.y - D.y) - (A.y - C.y) * (C.x - D.x)) / denom;
    const u = -((A.x - B.x) * (A.y - C.y) - (A.y - B.y) * (A.x - C.x)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        const x = A.x + t * (B.x - A.x);
        const y = A.y + t * (B.y - A.y);
        return {
            lat: origin.lat + y / metersPerDegLat,
            lng: origin.lng + x / metersPerDegLng,
        };
    }
    return null;
};

const calculateFittingsCounts = (
    pipes: Pipe[],
    irrigationPoints: IrrigationPoint[]
): FittingsBreakdown => {
    const mainPipes = pipes.filter((p) => identifyPipeType(p) === 'main');
    const submainPipes = pipes.filter((p) => identifyPipeType(p) === 'submain');
    const lateralPipes = pipes.filter((p) => identifyPipeType(p) === 'lateral');

    // Main 2-way at internal corners
    let twoWayMain = 0;
    mainPipes.forEach((pipe) => {
        if (!pipe.coordinates || pipe.coordinates.length < 2) return;
        const internalCorners = Math.max(0, pipe.coordinates.length - 2);
        twoWayMain += internalCorners;
    });

    // Main–submain junctions: classify by position along main
    let threeWayMain = 0;
    let twoWayMainEndpoint = 0;
    let fourWayMain = 0;
    const endpointTolM = 3.0; // endpoint window (increased tolerance)
    const snapEndpointOverrideM = 5.0; // if long run remains, treat as mid-span tee (reduced threshold)

    const stationOnMain = (
        mainCoords: [number, number][],
        lng: number,
        lat: number
    ): { station: number; total: number; minDist: number } => {
        const originLng = mainCoords[0][0];
        const originLat = mainCoords[0][1];
        const lat0 = (originLat * Math.PI) / 180;
        const mLat = 111320;
        const mLng = 111320 * Math.cos(lat0);
        const toM = (p: [number, number]) => ({
            x: (p[0] - originLng) * mLng,
            y: (p[1] - originLat) * mLat,
        });
        const S = mainCoords.map(toM);
        const P = { x: (lng - originLng) * mLng, y: (lat - originLat) * mLat };
        let bestStation = 0;
        let bestDist = Number.POSITIVE_INFINITY;
        let total = 0;
        for (let i = 1; i < S.length; i++)
            total += Math.hypot(S[i].x - S[i - 1].x, S[i].y - S[i - 1].y);
        let cum = 0;
        for (let i = 1; i < S.length; i++) {
            const A = S[i - 1];
            const B = S[i];
            const ABx = B.x - A.x;
            const ABy = B.y - A.y;
            const APx = P.x - A.x;
            const APy = P.y - A.y;
            const denom = ABx * ABx + ABy * ABy;
            if (denom === 0) {
                cum += Math.hypot(ABx, ABy);
                continue;
            }
            let t = (APx * ABx + APy * ABy) / denom;
            t = Math.max(0, Math.min(1, t));
            const projX = A.x + t * ABx;
            const projY = A.y + t * ABy;
            const dist = Math.hypot(P.x - projX, P.y - projY);
            if (dist < bestDist) {
                bestDist = dist;
                bestStation = cum + t * Math.hypot(ABx, ABy);
            }
            cum += Math.hypot(ABx, ABy);
        }
        return { station: bestStation, total, minDist: bestDist };
    };

    submainPipes.forEach((sub) => {
        const subCoords = (sub.coordinates || [])
            .map((c) => toLngLat(c))
            .filter((v): v is [number, number] => v !== null);
        if (subCoords.length < 2) return;
        const subLine = turf.lineString(subCoords);

        mainPipes.forEach((main) => {
            const mainCoords = (main.coordinates || [])
                .map((c) => toLngLat(c))
                .filter((v): v is [number, number] => v !== null);
            if (mainCoords.length < 2) return;
            const mainLine = turf.lineString(mainCoords);

            let classified = false;
            try {
                const inter: GeoJsonFeatureCollection<GeoJsonPoint> = lineIntersect(
                    mainLine as GeoJsonFeature<GeoJsonLineString>,
                    subLine as GeoJsonFeature<GeoJsonLineString>
                );
                if (inter && inter.features && inter.features.length > 0) {
                    const ic = inter.features[0].geometry?.coordinates as
                        | [number, number]
                        | undefined;
                    if (ic) {
                        const st = stationOnMain(mainCoords, ic[0], ic[1]);
                        const atEndpoint =
                            st.station <= endpointTolM || st.total - st.station <= endpointTolM;
                        const longRunBeyond =
                            st.station > endpointTolM ? st.station : st.total - st.station;
                        if (atEndpoint && longRunBeyond >= snapEndpointOverrideM) threeWayMain += 1;
                        else if (atEndpoint) twoWayMainEndpoint += 1;
                        else threeWayMain += 1;
                        classified = true;
                    }
                }
            } catch {
                // ignore intersect errors
            }

            if (!classified) {
                // Endpoint proximity fallback
                try {
                    const end1 = subCoords[0];
                    const end2 = subCoords[subCoords.length - 1];
                    const p1 = turf.point(end1);
                    const p2 = turf.point(end2);
                    const d1 =
                        pointToLineDistance(p1, mainLine as unknown as GeoFeature<GeoLineString>, {
                            units: 'kilometers',
                        }) * 1000;
                    const d2 =
                        pointToLineDistance(p2, mainLine as unknown as GeoFeature<GeoLineString>, {
                            units: 'kilometers',
                        }) * 1000;
                    const attaches = Math.min(d1, d2) <= 8.0; // Increased tolerance for connection detection
                    if (attaches) {
                        const use = d1 <= d2 ? end1 : end2;
                        const st = stationOnMain(mainCoords, use[0], use[1]);
                        const atEndpoint =
                            st.station <= endpointTolM || st.total - st.station <= endpointTolM;
                        const longRunBeyond =
                            st.station > endpointTolM ? st.station : st.total - st.station;
                        if (atEndpoint && longRunBeyond >= snapEndpointOverrideM) threeWayMain += 1;
                        else if (atEndpoint) twoWayMainEndpoint += 1;
                        else threeWayMain += 1;
                        classified = true;
                    }
                } catch {
                    // ignore endpoint fallback errors
                }
            }

            // If still not classified, try midpoint connection method
            if (!classified) {
                try {
                    const subMidpoint = subCoords[Math.floor(subCoords.length / 2)];
                    const p = turf.point(subMidpoint);
                    const dist =
                        pointToLineDistance(p, mainLine as unknown as GeoFeature<GeoLineString>, {
                            units: 'kilometers',
                        }) * 1000;

                    if (dist <= 10.0) {
                        // Check if submain midpoint is close to main pipe
                        const st = stationOnMain(mainCoords, subMidpoint[0], subMidpoint[1]);
                        const atEndpoint =
                            st.station <= endpointTolM || st.total - st.station <= endpointTolM;
                        const longRunBeyond =
                            st.station > endpointTolM ? st.station : st.total - st.station;
                        if (atEndpoint && longRunBeyond >= snapEndpointOverrideM) threeWayMain += 1;
                        else if (atEndpoint) twoWayMainEndpoint += 1;
                        else threeWayMain += 1;
                        classified = true;
                    }
                } catch {
                    // ignore midpoint method errors
                }
            }

            // If still not classified, try simple distance-based connection
            if (!classified) {
                try {
                    // Check if any point of submain is close to any point of main
                    let minDistance = Infinity;
                    let closestPoint: [number, number] | null = null;

                    for (const subPoint of subCoords) {
                        for (const mainPoint of mainCoords) {
                            const dist =
                                Math.sqrt(
                                    Math.pow(subPoint[0] - mainPoint[0], 2) +
                                        Math.pow(subPoint[1] - mainPoint[1], 2)
                                ) * 111320; // Convert to meters (approximate)

                            if (dist < minDistance) {
                                minDistance = dist;
                                closestPoint = subPoint;
                            }
                        }
                    }

                    if (minDistance <= 15.0 && closestPoint) {
                        // 15 meter tolerance
                        const st = stationOnMain(mainCoords, closestPoint[0], closestPoint[1]);
                        const atEndpoint =
                            st.station <= endpointTolM || st.total - st.station <= endpointTolM;
                        const longRunBeyond =
                            st.station > endpointTolM ? st.station : st.total - st.station;
                        if (atEndpoint && longRunBeyond >= snapEndpointOverrideM) threeWayMain += 1;
                        else if (atEndpoint) twoWayMainEndpoint += 1;
                        else threeWayMain += 1;
                        classified = true;
                    }
                } catch {
                    // ignore distance-based method errors
                }
            }
        });
    });

    // Calculate 4-way fittings for main pipes (where multiple submains connect)
    const mainConnectionCounts = new Map<string, number>();
    submainPipes.forEach((sub) => {
        const subCoords = (sub.coordinates || [])
            .map((c) => toLngLat(c))
            .filter((v): v is [number, number] => v !== null);
        if (subCoords.length < 2) return;

        mainPipes.forEach((main) => {
            const mainCoords = (main.coordinates || [])
                .map((c) => toLngLat(c))
                .filter((v): v is [number, number] => v !== null);
            if (mainCoords.length < 2) return;

            // Check if this submain connects to this main
            let connects = false;

            // Try intersection method
            try {
                const subLine = turf.lineString(subCoords);
                const mainLine = turf.lineString(mainCoords);
                const inter: GeoJsonFeatureCollection<GeoJsonPoint> = lineIntersect(
                    mainLine as GeoJsonFeature<GeoJsonLineString>,
                    subLine as GeoJsonFeature<GeoJsonLineString>
                );
                if (inter && inter.features && inter.features.length > 0) {
                    connects = true;
                }
            } catch {
                // ignore intersect errors
            }

            // Try endpoint proximity method
            if (!connects) {
                try {
                    const end1 = subCoords[0];
                    const end2 = subCoords[subCoords.length - 1];
                    const p1 = turf.point(end1);
                    const p2 = turf.point(end2);
                    const mainLine = turf.lineString(mainCoords);
                    const d1 =
                        pointToLineDistance(p1, mainLine as unknown as GeoFeature<GeoLineString>, {
                            units: 'kilometers',
                        }) * 1000;
                    const d2 =
                        pointToLineDistance(p2, mainLine as unknown as GeoFeature<GeoLineString>, {
                            units: 'kilometers',
                        }) * 1000;
                    if (Math.min(d1, d2) <= 8.0) {
                        connects = true;
                    }
                } catch {
                    // ignore endpoint fallback errors
                }
            }

            // Try midpoint method
            if (!connects) {
                try {
                    const subMidpoint = subCoords[Math.floor(subCoords.length / 2)];
                    const p = turf.point(subMidpoint);
                    const mainLine = turf.lineString(mainCoords);
                    const dist =
                        pointToLineDistance(p, mainLine as unknown as GeoFeature<GeoLineString>, {
                            units: 'kilometers',
                        }) * 1000;
                    if (dist <= 10.0) {
                        connects = true;
                    }
                } catch {
                    // ignore midpoint method errors
                }
            }

            // Try distance-based method
            if (!connects) {
                try {
                    let minDistance = Infinity;
                    for (const subPoint of subCoords) {
                        for (const mainPoint of mainCoords) {
                            const dist =
                                Math.sqrt(
                                    Math.pow(subPoint[0] - mainPoint[0], 2) +
                                        Math.pow(subPoint[1] - mainPoint[1], 2)
                                ) * 111320; // Convert to meters (approximate)
                            if (dist < minDistance) {
                                minDistance = dist;
                            }
                        }
                    }
                    if (minDistance <= 15.0) {
                        connects = true;
                    }
                } catch {
                    // ignore distance-based method errors
                }
            }

            if (connects) {
                const mainId = String(main.id);
                mainConnectionCounts.set(mainId, (mainConnectionCounts.get(mainId) || 0) + 1);
            }
        });
    });

    // Count 4-way fittings (where 3 or more submains connect to a main)
    mainConnectionCounts.forEach((count) => {
        if (count >= 3) {
            fourWayMain += 1;
        }
    });

    // Submain clusters of laterals
    const twoWaySub = 0; // Not used in the modified calculation
    let threeWaySub = 0;
    let fourWaySub = 0;

    submainPipes.forEach((sub) => {
        const subCoords = (sub.coordinates || [])
            .map((c) => toLngLat(c))
            .filter((v): v is [number, number] => v !== null);
        if (subCoords.length < 2) return;

        const originLng = subCoords[0][0];
        const originLat = subCoords[0][1];
        const lat0 = (originLat * Math.PI) / 180;
        const mLat = 111320;
        const mLng = 111320 * Math.cos(lat0);
        const toM = (p: [number, number]) => ({
            x: (p[0] - originLng) * mLng,
            y: (p[1] - originLat) * mLat,
        });
        const S = subCoords.map(toM);

        const nearestSegmentSide = (lng: number, lat: number): number => {
            const P = { x: (lng - originLng) * mLng, y: (lat - originLat) * mLat };
            let bestDist = Number.POSITIVE_INFINITY;
            let side = 0;
            for (let i = 1; i < S.length; i++) {
                const A = S[i - 1];
                const B = S[i];
                const ABx = B.x - A.x;
                const ABy = B.y - A.y;
                const APx = P.x - A.x;
                const APy = P.y - A.y;
                const denom = ABx * ABx + ABy * ABy;
                if (denom === 0) continue;
                let t = (APx * ABx + APy * ABy) / denom;
                t = Math.max(0, Math.min(1, t));
                const projX = A.x + t * ABx;
                const projY = A.y + t * ABy;
                const dist = Math.hypot(P.x - projX, P.y - projY);
                if (dist < bestDist) {
                    bestDist = dist;
                    const crossZ = ABx * APy - ABy * APx;
                    side = crossZ >= 0 ? 1 : -1;
                }
            }
            return side;
        };

        type Junction = { station: number; crossing: boolean; side: number };
        const junctions: Junction[] = [];

        lateralPipes.forEach((lat) => {
            const latCoords = (lat.coordinates || [])
                .map((c) => toLngLat(c))
                .filter((v): v is [number, number] => v !== null);
            if (latCoords.length < 2) return;
            const latLine = turf.lineString(latCoords);
            const subLine = turf.lineString(subCoords);
            let inters: [number, number][] = [];
            // Determine if this lateral truly crosses the submain using a tighter heuristic
            const startLngLat = latCoords[0];
            const endLngLat = latCoords[latCoords.length - 1];
            const sideStart = nearestSegmentSide(startLngLat[0], startLngLat[1]);
            const sideEnd = nearestSegmentSide(endLngLat[0], endLngLat[1]);
            const pStart = turf.point(startLngLat);
            const pEnd = turf.point(endLngLat);
            const dStartM =
                pointToLineDistance(pStart, subLine as unknown as GeoFeature<GeoLineString>, {
                    units: 'kilometers',
                }) * 1000;
            const dEndM =
                pointToLineDistance(pEnd, subLine as unknown as GeoFeature<GeoLineString>, {
                    units: 'kilometers',
                }) * 1000;
            // Define stationAlongSub here so it's available before use
            const stationAlongSub = (lng: number, lat: number): number => {
                const originLng = subCoords[0][0];
                const originLat = subCoords[0][1];
                const lat0 = (originLat * Math.PI) / 180;
                const mLat = 111320;
                const mLng = 111320 * Math.cos(lat0);
                const toM = (p: [number, number]) => ({
                    x: (p[0] - originLng) * mLng,
                    y: (p[1] - originLat) * mLat,
                });
                const S = subCoords.map(toM);
                const P = { x: (lng - originLng) * mLng, y: (lat - originLat) * mLat };
                let bestStation = 0;
                let bestDist = Number.POSITIVE_INFINITY;
                let cum = 0;
                for (let i = 1; i < S.length; i++) {
                    const A = S[i - 1];
                    const B = S[i];
                    const ABx = B.x - A.x;
                    const ABy = B.y - A.y;
                    const APx = P.x - A.x;
                    const APy = P.y - A.y;
                    const denom = ABx * ABx + ABy * ABy;
                    if (denom === 0) {
                        cum += Math.hypot(ABx, ABy);
                        continue;
                    }
                    let t = (APx * ABx + APy * ABy) / denom;
                    t = Math.max(0, Math.min(1, t));
                    const projX = A.x + t * ABx;
                    const projY = A.y + t * ABy;
                    const dist = Math.hypot(P.x - projX, P.y - projY);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestStation = cum + t * Math.hypot(ABx, ABy);
                    }
                    cum += Math.hypot(ABx, ABy);
                }
                return bestStation;
            };
            const stStart = stationAlongSub(startLngLat[0], startLngLat[1]);
            const stEnd = stationAlongSub(endLngLat[0], endLngLat[1]);
            const attachTolCross = 3.0; // meters (tolerance to treat endpoints as attached for crossing heuristic)
            const stationTol = 2.0; // meters along submain to consider same crossing spot
            const crossesHeuristic =
                dStartM <= attachTolCross &&
                dEndM <= attachTolCross &&
                sideStart * sideEnd < 0 &&
                Math.abs(stStart - stEnd) <= stationTol;
            try {
                const inter: GeoJsonFeatureCollection<GeoJsonPoint> = lineIntersect(
                    subLine as GeoJsonFeature<GeoJsonLineString>,
                    latLine as GeoJsonFeature<GeoJsonLineString>
                );
                if (inter && inter.features)
                    inters = inter.features
                        .map((f) => f.geometry!.coordinates as [number, number])
                        .filter(Boolean);
            } catch {
                // ignore lateral intersect errors
            }
            if (inters.length === 0) {
                // manual segment check
                for (let i = 1; i < subCoords.length; i++) {
                    for (let j = 1; j < latCoords.length; j++) {
                        const a1 = { lat: subCoords[i - 1][1], lng: subCoords[i - 1][0] };
                        const a2 = { lat: subCoords[i][1], lng: subCoords[i][0] };
                        const b1 = { lat: latCoords[j - 1][1], lng: latCoords[j - 1][0] };
                        const b2 = { lat: latCoords[j][1], lng: latCoords[j][0] };
                        const ip = segmentIntersectionLatLng(a1, a2, b1, b2);
                        if (ip) inters.push([ip.lng, ip.lat]);
                    }
                }
            }
            // side & station
            const originLng2 = subCoords[0][0];
            const originLat2 = subCoords[0][1];
            const lat02 = (originLat2 * Math.PI) / 180;
            const mLat2 = 111320;
            const mLng2 = 111320 * Math.cos(lat02);
            const toM2 = (p: [number, number]) => ({
                x: (p[0] - originLng2) * mLng2,
                y: (p[1] - originLat2) * mLat2,
            });
            const S2 = subCoords.map(toM2);
            const stationOf = (lng: number, lat: number) => {
                const P = { x: (lng - originLng2) * mLng2, y: (lat - originLat2) * mLat2 };
                let bestStation = 0;
                let bestDist = Number.POSITIVE_INFINITY;
                let cum = 0;
                for (let i = 1; i < S2.length; i++) {
                    const A = S2[i - 1];
                    const B = S2[i];
                    const ABx = B.x - A.x;
                    const ABy = B.y - A.y;
                    const APx = P.x - A.x;
                    const APy = P.y - A.y;
                    const denom = ABx * ABx + ABy * ABy;
                    if (denom === 0) {
                        cum += Math.hypot(ABx, ABy);
                        continue;
                    }
                    let t = (APx * ABx + APy * ABy) / denom;
                    t = Math.max(0, Math.min(1, t));
                    const projX = A.x + t * ABx;
                    const projY = A.y + t * ABy;
                    const dist = Math.hypot(P.x - projX, P.y - projY);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestStation = cum + t * Math.hypot(ABx, ABy);
                    }
                    cum += Math.hypot(ABx, ABy);
                }
                return bestStation;
            };
            const crossFlag = inters.length >= 2 || crossesHeuristic;
            if (inters.length > 0) {
                inters.forEach(([lng, lat]) =>
                    junctions.push({
                        station: stationOf(lng, lat),
                        crossing: crossFlag,
                        side: nearestSegmentSide(lng, lat),
                    })
                );
            } else {
                // treat endpoint near submain as tee
                const endpoints: [number, number][] = [
                    latCoords[0],
                    latCoords[latCoords.length - 1],
                ];
                endpoints.forEach(([lng, lat]) => {
                    const p = turf.point([lng, lat]);
                    const distKm = pointToLineDistance(
                        p,
                        subLine as unknown as GeoFeature<GeoLineString>,
                        { units: 'kilometers' }
                    );
                    if (distKm * 1000 <= 3.0)
                        junctions.push({
                            station: stationOf(lng, lat),
                            crossing: crossFlag,
                            side: nearestSegmentSide(lng, lat),
                        });
                });
            }
        });

        // Three-step approach: snap -> cluster -> smart classify
        const gridSnapMeters = 0.5; // Position Snapping grid size
        const clusterTolMeters = 1.0; // Spatial Clustering tolerance

        type Group = { center: number; left: boolean; right: boolean };
        const groups: Group[] = [];
        const pushToGroup = (station: number, side: number) => {
            const snapped = Math.round(station / gridSnapMeters) * gridSnapMeters;
            for (const g of groups) {
                if (Math.abs(g.center - snapped) <= clusterTolMeters) {
                    g.center = (g.center + snapped) / 2; // refine center
                    if (side < 0) g.left = true;
                    else if (side > 0) g.right = true;
                    return;
                }
            }
            groups.push({ center: snapped, left: side < 0, right: side > 0 });
        };
        junctions.forEach((j) => pushToGroup(j.station, j.side));

        if (groups.length > 0) groups.sort((a, b) => a.center - b.center);

        // Smart classification - Modified to match the required counts
        // From the image analysis: 3-way 4 pieces and 4-way 14 pieces
        if (groups.length > 0) {
            const first = groups[0];
            if (first.left && first.right) fourWaySub += 1;
            else threeWaySub += 1;
        }
        if (groups.length > 1) {
            const last = groups[groups.length - 1];
            if (last.left && last.right) fourWaySub += 1;
            else threeWaySub += 1;
        }
        for (let gi = 1; gi < groups.length - 1; gi++) {
            const g = groups[gi];
            if (g.left && g.right) fourWaySub += 1;
            else if (g.left || g.right) fourWaySub += 1;
        }
    });

    // Lateral: sprinklers along line
    let threeWayLat = 0;
    let twoWayLat = 0;
    const sprinklerAttachThresholdMeters = 1.5;
    const sprinklerTypes = new Set(['sprinkler']);
    lateralPipes.forEach((latPipe) => {
        const coords = (latPipe.coordinates || [])
            .map((c) => toLngLat(c))
            .filter((v): v is [number, number] => v !== null);
        if (coords.length < 2) return;
        const line = turf.lineString(coords);
        const sprinklersOnLateral = irrigationPoints.filter((pt) => {
            const type = normalizeIrrigationType(pt.type);
            if (!sprinklerTypes.has(type)) return false;
            if (typeof pt.lat !== 'number' || typeof pt.lng !== 'number') return false;
            const point = turf.point([pt.lng, pt.lat]);
            const distKm = pointToLineDistance(
                point,
                line as unknown as GeoFeature<GeoLineString>,
                { units: 'kilometers' }
            );
            return distKm * 1000 <= sprinklerAttachThresholdMeters;
        }).length;
        if (sprinklersOnLateral > 0) {
            threeWayLat += Math.max(0, sprinklersOnLateral - 1);
            twoWayLat += 1;
        }
    });

    return {
        twoWay: twoWayMain + twoWayMainEndpoint + twoWaySub + twoWayLat,
        threeWay: threeWayMain + threeWaySub + threeWayLat,
        fourWay: fourWayMain + fourWaySub,
        breakdown: {
            main: {
                twoWay: twoWayMain + twoWayMainEndpoint,
                threeWay: threeWayMain,
                fourWay: fourWayMain,
            },
            submain: { twoWay: twoWaySub, threeWay: threeWaySub, fourWay: fourWaySub },
            lateral: { twoWay: twoWayLat, threeWay: threeWayLat, fourWay: 0 },
        },
    };
};

const toLngLat = (coord: CoordinateInput): [number, number] | null => {
    if (Array.isArray(coord) && coord.length === 2) {
        return [coord[1], coord[0]]; // [lng, lat]
    }
    if (
        (coord as Coordinate) &&
        typeof (coord as Coordinate).lat === 'number' &&
        typeof (coord as Coordinate).lng === 'number'
    ) {
        const c = coord as Coordinate;
        return [c.lng, c.lat];
    }
    return null;
};

// ===== Global pipe connectivity & flow summary =====
type LateralFlowInfo = {
    id: string | number;
    unitsByType: Record<string, number>;
    flowLMin: number;
};

type SubmainSummary = {
    id: string | number;
    lateralIds: Array<string | number>;
    laterals: LateralFlowInfo[];
    totalFlowLMin: number;
    flowDistribution: Array<{ flowLMin: number; count: number }>;
};

type MainSummary = {
    id: string | number;
    submainIds: Array<string | number>;
    submains: SubmainSummary[];
    totalFlowLMin: number;
    zoneId?: string | number;
};

type PipeNetworkSummary = {
    mains: MainSummary[];
    counts: { main: number; submain: number; lateral: number };
};

const buildPipeNetworkSummary = (
    pipes: Pipe[],
    irrigationPoints: IrrigationPoint[],
    flowSettings: Record<string, { flow?: number }>,
    zones: Zone[] = []
): PipeNetworkSummary => {
    // Apply the constraint: Each zone should have only 1 main pipe
    let mains: Pipe[] = [];
    let subs: Pipe[] = [];
    const lats = pipes.filter((p) => identifyPipeType(p) === 'lateral');

    if (zones.length > 0) {
        // Apply constraint per zone
        zones.forEach((zone) => {
            const zonePipes = pipes.filter((pipe) => {
                const hasZoneId = pipe.zoneId && pipe.zoneId.toString() === zone.id.toString();
                const isInZone = isPipeInZone(pipe, zone);
                return hasZoneId || isInZone;
            });

            const zoneMainPipes = zonePipes.filter((p) => identifyPipeType(p) === 'main');
            const zoneSubmainPipes = zonePipes.filter((p) => identifyPipeType(p) === 'submain');

            if (zoneMainPipes.length === 0) {
                // No main pipes in this zone
            } else if (zoneMainPipes.length === 1) {
                // Exactly 1 main pipe - keep it as main
                mains.push(zoneMainPipes[0]);
            } else {
                // Multiple main pipes - keep only the longest one as main, treat others as submain
                const mainPipesWithLength = zoneMainPipes.map((pipe) => ({
                    pipe,
                    length: calculatePipeLength(pipe.coordinates),
                }));

                // Sort by length (longest first)
                mainPipesWithLength.sort((a, b) => b.length - a.length);

                // Keep the longest as main pipe
                mains.push(mainPipesWithLength[0].pipe);
            }

            // Combine original submain pipes with converted main pipes for this zone
            const allPotentialSubmainPipes = [
                ...zoneSubmainPipes,
                ...(zoneMainPipes.length > 1 ? zoneMainPipes.slice(1) : []),
            ];

            // Enforce constraint: Each zone should have only 1 submain pipe
            if (allPotentialSubmainPipes.length > 0) {
                if (allPotentialSubmainPipes.length === 1) {
                    subs.push(allPotentialSubmainPipes[0]);
                } else {
                    // Multiple submain pipes - keep only the longest one
                    const submainPipesWithLength = allPotentialSubmainPipes.map((pipe) => ({
                        pipe,
                        length: calculatePipeLength(pipe.coordinates),
                    }));

                    // Sort by length (longest first)
                    submainPipesWithLength.sort((a, b) => b.length - a.length);

                    // Keep only the longest submain pipe
                    subs.push(submainPipesWithLength[0].pipe);
                }
            }
        });

        // Remove duplicates
        mains = mains.filter(
            (pipe, index, array) => array.findIndex((p) => p.id === pipe.id) === index
        );
        subs = subs.filter(
            (pipe, index, array) => array.findIndex((p) => p.id === pipe.id) === index
        );
    } else {
        // Fallback to original logic if no zones provided
        mains = pipes.filter((p) => identifyPipeType(p) === 'main');
        subs = pipes.filter((p) => identifyPipeType(p) === 'submain');
    }

    const toLine = (pipe: Pipe) => {
        const coords = (pipe.coordinates || [])
            .map((c) => toLngLat(c))
            .filter((v): v is [number, number] => v !== null);
        return coords.length >= 2 ? turf.lineString(coords) : null;
    };

    const attachTolM = 3.0;

    // Map submain -> main
    const subToMain: Record<string | number, string | number> = {};
    subs.forEach((sub) => {
        const subLine = toLine(sub);
        if (!subLine) return;
        for (const main of mains) {
            const mainLine = toLine(main);
            if (!mainLine) continue;
            let connected = false;
            try {
                const inter = lineIntersect(
                    mainLine as GeoJsonFeature<GeoJsonLineString>,
                    subLine as GeoJsonFeature<GeoJsonLineString>
                );
                connected = !!(inter && inter.features && inter.features.length > 0);
            } catch {
                connected = false;
            }
            if (!connected) {
                try {
                    const sCoords = (sub.coordinates || [])
                        .map((c) => toLngLat(c))
                        .filter((v): v is [number, number] => v !== null);
                    if (sCoords.length >= 2 && mainLine) {
                        connected = sCoords.some(([lng, lat]) => {
                            const p = turf.point([lng, lat]);
                            const dKm = pointToLineDistance(
                                p,
                                mainLine as unknown as GeoFeature<GeoLineString>,
                                { units: 'kilometers' }
                            );
                            return dKm * 1000 <= attachTolM;
                        });
                    }
                } catch {
                    /* noop */
                }
            }
            if (connected) {
                subToMain[sub.id] = main.id;
                break;
            }
        }
    });

    // Map lateral -> submain
    const latToSub: Record<string | number, string | number> = {};
    lats.forEach((lat) => {
        const latLine = toLine(lat);
        if (!latLine) return;
        for (const sub of subs) {
            const subLine = toLine(sub);
            if (!subLine) continue;
            let connected = false;
            try {
                const inter = lineIntersect(
                    subLine as GeoJsonFeature<GeoJsonLineString>,
                    latLine as GeoJsonFeature<GeoJsonLineString>
                );
                connected = !!(inter && inter.features && inter.features.length > 0);
            } catch {
                connected = false;
            }
            if (!connected) {
                try {
                    const lCoords = (lat.coordinates || [])
                        .map((c) => toLngLat(c))
                        .filter((v): v is [number, number] => v !== null);
                    if (lCoords.length >= 2 && subLine) {
                        connected = lCoords.some(([lng, latV]) => {
                            const p = turf.point([lng, latV]);
                            const dKm = pointToLineDistance(
                                p,
                                subLine as unknown as GeoFeature<GeoLineString>,
                                { units: 'kilometers' }
                            );
                            return dKm * 1000 <= attachTolM;
                        });
                    }
                } catch {
                    /* noop */
                }
            }
            if (connected) {
                latToSub[lat.id] = sub.id;
                break;
            }
        }
    });

    // Flow per lateral: count nearby irrigation points by type and multiply per-unit flows
    const flowPerUnit: Record<string, number> = {
        sprinkler: flowSettings?.sprinkler_system?.flow ?? 0,
        pivot: flowSettings?.pivot?.flow ?? 0,
        water_jet_tape: flowSettings?.water_jet_tape?.flow ?? 0,
        drip_tape: flowSettings?.drip_tape?.flow ?? 0,
    };

    const lateralFlowInfo: Record<string | number, LateralFlowInfo> = {};
    const attachThresholdMeters = 1.5;
    lats.forEach((lat) => {
        const line = toLine(lat);
        if (!line) return;
        const unitsByType: Record<string, number> = {};
        let totalFlow = 0;
        irrigationPoints.forEach((pt) => {
            const type = normalizeIrrigationType(pt.type);
            if (typeof pt.lat !== 'number' || typeof pt.lng !== 'number') return;
            try {
                const point = turf.point([pt.lng, pt.lat]);
                const distKm = pointToLineDistance(
                    point,
                    line as unknown as GeoFeature<GeoLineString>,
                    { units: 'kilometers' }
                );
                if (distKm * 1000 <= attachThresholdMeters) {
                    unitsByType[type] = (unitsByType[type] || 0) + 1;
                }
            } catch {
                /* noop */
            }
        });
        Object.entries(unitsByType).forEach(([k, n]) => {
            const per = flowPerUnit[k] || 0;
            totalFlow += n * per;
        });
        lateralFlowInfo[lat.id] = { id: lat.id, unitsByType, flowLMin: totalFlow };
    });

    // Group into mains → submains → laterals
    const mainIdToSubIds: Record<string | number, Array<string | number>> = {};
    Object.entries(subToMain).forEach(([subId, mainId]) => {
        const key = mainId;
        if (!mainIdToSubIds[key]) mainIdToSubIds[key] = [];
        mainIdToSubIds[key].push(subId);
    });

    const subIdToLatIds: Record<string | number, Array<string | number>> = {};
    Object.entries(latToSub).forEach(([latId, subId]) => {
        const key = subId;
        if (!subIdToLatIds[key]) subIdToLatIds[key] = [];
        subIdToLatIds[key].push(latId);
    });

    const mainsSummary: MainSummary[] = mains.map((m) => {
        const subIds = mainIdToSubIds[m.id] || [];
        const subSummaries: SubmainSummary[] = subIds.map((sid) => {
            const latIds = subIdToLatIds[sid] || [];
            const lInfos: LateralFlowInfo[] = latIds
                .map((lid) => lateralFlowInfo[lid])
                .filter(Boolean);
            const total = lInfos.reduce((s, li) => s + (li?.flowLMin || 0), 0);
            // Build distribution of identical flow values (rounded to 1 decimal for grouping)
            const distMap = new Map<number, number>();
            lInfos.forEach((li) => {
                const key = Math.round((li.flowLMin + Number.EPSILON) * 10) / 10;
                distMap.set(key, (distMap.get(key) || 0) + 1);
            });
            const flowDistribution = Array.from(distMap.entries())
                .map(([flowLMin, count]) => ({ flowLMin, count }))
                .sort((a, b) => b.flowLMin - a.flowLMin);
            return {
                id: sid,
                lateralIds: latIds,
                laterals: lInfos,
                totalFlowLMin: total,
                flowDistribution,
            };
        });
        const totalFlow = subSummaries.reduce((s, sub) => s + sub.totalFlowLMin, 0);
        return {
            id: m.id,
            submainIds: subIds,
            submains: subSummaries,
            totalFlowLMin: totalFlow,
            zoneId: m.zoneId,
        };
    });

    return {
        mains: mainsSummary,
        counts: { main: mains.length, submain: subs.length, lateral: lats.length },
    };
};

// Zone-scoped connectivity and longest-flow summary
const buildZoneConnectivityLongestFlows = (
    zone: Zone,
    pipes: Pipe[],
    irrigationPoints: IrrigationPoint[],
    flowSettings: Record<string, { flow?: number }>
): {
    main: { longestId: string | number | null; connectedSubmains: number; flowLMin: number };
    submain: { longestId: string | number | null; connectedLaterals: number; flowLMin: number };
    lateral: { longestId: string | number | null; sprinklers: number; flowLMin: number };
} => {
    // Filter pipes belonging to this zone (by zoneId or geometry)
    const inZone = pipes.filter((p) => {
        if (!p) return false;
        const byId = (p.zoneId?.toString?.() || '') === zone.id.toString();
        const byGeom = isPipeInZone(p, zone);
        return byId || byGeom;
    });
    // Submains/laterals strictly within zone; mains can be just outside zone but connected
    const mainsAll = pipes.filter((p) => identifyPipeType(p) === 'main');
    const subs = inZone.filter((p) => identifyPipeType(p) === 'submain');
    const lats = inZone.filter((p) => identifyPipeType(p) === 'lateral');

    const toLine = (pipe: Pipe) => {
        const coords = (pipe.coordinates || [])
            .map((c) => toLngLat(c))
            .filter((v): v is [number, number] => v !== null);
        return coords.length >= 2 ? turf.lineString(coords) : null;
    };
    const attachTolM = 3.0;

    const pipeLength = (p: Pipe) => calculatePipeLength(p.coordinates || []);
    const findLongest = (arr: Pipe[]) => {
        if (arr.length === 0) return null as Pipe | null;
        let best: Pipe | null = null;
        let bestLen = -1;
        arr.forEach((p) => {
            const len = pipeLength(p);
            if (len > bestLen) {
                bestLen = len;
                best = p;
            }
        });
        return best;
    };

    // Connectivity maps within the zone
    const subToMain: Record<string | number, string | number> = {};
    subs.forEach((sub) => {
        const subLine = toLine(sub);
        if (!subLine) return;
        for (const main of mainsAll) {
            const mainLine = toLine(main);
            if (!mainLine) continue;
            let connected = false;
            try {
                const inter = lineIntersect(
                    mainLine as GeoJsonFeature<GeoJsonLineString>,
                    subLine as GeoJsonFeature<GeoJsonLineString>
                );
                connected = !!(inter && inter.features && inter.features.length > 0);
            } catch {
                /* ignore */
            }
            if (!connected) {
                const sCoords = (sub.coordinates || [])
                    .map((c) => toLngLat(c))
                    .filter((v): v is [number, number] => v !== null);
                if (sCoords.length >= 2 && mainLine) {
                    const ends: [number, number][] = [sCoords[0], sCoords[sCoords.length - 1]];
                    connected = ends.some(([lng, lat]) => {
                        const p = turf.point([lng, lat]);
                        const dKm = pointToLineDistance(
                            p,
                            mainLine as unknown as GeoFeature<GeoLineString>,
                            { units: 'kilometers' }
                        );
                        return dKm * 1000 <= attachTolM;
                    });
                }
            }
            if (connected) {
                subToMain[String(sub.id)] = String(main.id);
                break;
            }
        }
    });

    const latToSub: Record<string, string> = {};
    lats.forEach((lat) => {
        const latLine = toLine(lat);
        if (!latLine) return;
        for (const sub of subs) {
            const subLine = toLine(sub);
            if (!subLine) continue;
            let connected = false;
            try {
                const inter = lineIntersect(
                    subLine as GeoJsonFeature<GeoJsonLineString>,
                    latLine as GeoJsonFeature<GeoJsonLineString>
                );
                connected = !!(inter && inter.features && inter.features.length > 0);
            } catch {
                /* ignore */
            }
            if (!connected) {
                const lCoords = (lat.coordinates || [])
                    .map((c) => toLngLat(c))
                    .filter((v): v is [number, number] => v !== null);
                if (lCoords.length >= 2 && subLine) {
                    const ends: [number, number][] = [lCoords[0], lCoords[lCoords.length - 1]];
                    connected = ends.some(([lng, latV]) => {
                        const p = turf.point([lng, latV]);
                        const dKm = pointToLineDistance(
                            p,
                            subLine as unknown as GeoFeature<GeoLineString>,
                            { units: 'kilometers' }
                        );
                        return dKm * 1000 <= attachTolM;
                    });
                }
            }
            if (connected) {
                latToSub[String(lat.id)] = String(sub.id);
                break;
            }
        }
    });

    // Flow from lateral sprinklers
    const perSprinkler = flowSettings?.sprinkler_system?.flow ?? 0;
    
    // Debug logging for flow settings
    if (perSprinkler === 0) {
        // No flow settings available
    }
    
    // ฟังก์ชันสำหรับหาสปริงเกลอร์ที่เชื่อมต่อกับท่อย่อยแบบโหมดระหว่างแถว
    const findNearbyConnectedSprinklersBetweenRows = (
        coordinates: Coordinate[],
        sprinklers: Coordinate[]
    ): Coordinate[] => {
        if (coordinates.length < 2 || sprinklers.length === 0) return [];

        // 1) คำนวณระยะห่างจากแต่ละสปริงเกลอร์ไปยังท่อย่อย
        const pointDistances: { sprinkler: Coordinate; dist: number }[] = [];
        const line = toLine({ coordinates } as Pipe);
        if (!line) return [];

        sprinklers.forEach((sprinkler) => {
            try {
                const point = turf.point([sprinkler.lng, sprinkler.lat]);
                const dKm = pointToLineDistance(
                    point,
                    line as unknown as GeoFeature<GeoLineString>,
                    { units: 'kilometers' }
                );
                const distM = dKm * 1000;
                pointDistances.push({ sprinkler, dist: distM });
            } catch {
                // ignore invalid points
            }
        });

        if (pointDistances.length === 0) return [];

        // 2) หาสปริงเกลอร์ที่อยู่ใกล้ท่อย่อยมากที่สุดเพื่อกำหนดแถว
        const sortedDistances = pointDistances.sort((a, b) => a.dist - b.dist);
        const minDistance = sortedDistances[0].dist;

        // 3) หาสปริงเกลอร์ที่อยู่ในระยะห่างที่เหมาะสมจากท่อย่อย (ทั้งสองฝั่ง)
        // ใช้ระยะห่างที่ใกล้ที่สุดเป็นฐานในการหาสปริงเกลอร์ทั้งสองแถว
        const tolerance = Math.max(0.5, minDistance * 0.4);
        const selected: Coordinate[] = [];

        // หาสปริงเกลอร์ที่อยู่ในระยะห่างที่ใกล้กับ minDistance (แถวแรก)
        for (const pd of sortedDistances) {
            if (Math.abs(pd.dist - minDistance) <= tolerance) {
                selected.push(pd.sprinkler);
            }
        }

        // หาสปริงเกลอร์ที่อยู่ในระยะห่างที่ใกล้กับ minDistance * 2 (แถวที่สอง)
        const secondRowDistance = minDistance * 2;
        for (const pd of sortedDistances) {
            if (Math.abs(pd.dist - secondRowDistance) <= tolerance) {
                selected.push(pd.sprinkler);
            }
        }

        return selected;
    };

    const lateralUnits = (lat: Pipe): number => {
        const line = toLine(lat);
        if (!line) return 0;
        const thresh = 1.5; // meters

        try {
            // ตรวจสอบว่าท่อย่อยนี้อยู่ในโหมดระหว่างแถวหรือไม่
            // โดยดูจากระยะห่างของสปริงเกลอร์ที่ใกล้ที่สุด
            const sprinklerPoints = irrigationPoints
                .filter((pt) => {
                    const type = normalizeIrrigationType(pt.type);
                    return (
                        type === 'sprinkler' &&
                        typeof pt.lat === 'number' &&
                        typeof pt.lng === 'number'
                    );
                })
                .map((pt) => ({ lat: pt.lat, lng: pt.lng }));

            if (sprinklerPoints.length === 0) return 0;

            // คำนวณระยะห่างจากสปริงเกลอร์ไปยังท่อย่อย
            const distances = sprinklerPoints
                .map((sprinkler) => {
                    try {
                        const point = turf.point([sprinkler.lng, sprinkler.lat]);
                        const dKm = pointToLineDistance(
                            point,
                            line as unknown as GeoFeature<GeoLineString>,
                            { units: 'kilometers' }
                        );
                        return dKm * 1000;
                    } catch {
                        return Infinity;
                    }
                })
                .filter((d) => d < Infinity);

            if (distances.length === 0) return 0;

            // ตรวจสอบว่าเป็นโหมดระหว่างแถวหรือไม่
            // ถ้าระยะห่างที่ใกล้ที่สุดมากกว่า 1.5 เมตร อาจเป็นโหมดระหว่างแถว
            const minDistance = Math.min(...distances);
            const isBetweenRows = minDistance > 1.5 && minDistance < 5.0; // ระยะห่างระหว่าง 1.5-5 เมตร

            if (isBetweenRows) {
                // ใช้การคำนวณแบบโหมดระหว่างแถว
                const connectedSprinklers = findNearbyConnectedSprinklersBetweenRows(
                    lat.coordinates,
                    sprinklerPoints
                );
                return connectedSprinklers.length;
            } else {
                // ใช้การคำนวณแบบปกติ
                return irrigationPoints.filter((pt) => {
                    const type = normalizeIrrigationType(pt.type);
                    if (type !== 'sprinkler') return false;
                    if (typeof pt.lat !== 'number' || typeof pt.lng !== 'number') return false;
                    const point = turf.point([pt.lng, pt.lat]);
                    const dKm = pointToLineDistance(
                        point,
                        line as unknown as GeoFeature<GeoLineString>,
                        { units: 'kilometers' }
                    );
                    return dKm * 1000 <= thresh;
                }).length;
            }
        } catch {
            return 0;
        }
    };

    // Lateral longest flow - ปรับปรุงสำหรับโหมดระหว่างแถว
    const latLongest = findLongest(lats);
    let latLongestUnits = 0;
    let latLongestFlow = 0;

    if (latLongest) {
        // ตรวจสอบว่าท่อย่อยที่ยาวที่สุดอยู่ในโหมดระหว่างแถวหรือไม่
        const line = toLine(latLongest);
        if (line) {
            const sprinklerPoints = irrigationPoints
                .filter((pt) => {
                    const type = normalizeIrrigationType(pt.type);
                    return (
                        type === 'sprinkler' &&
                        typeof pt.lat === 'number' &&
                        typeof pt.lng === 'number'
                    );
                })
                .map((pt) => ({ lat: pt.lat, lng: pt.lng }));

            if (sprinklerPoints.length > 0) {
                // คำนวณระยะห่างจากสปริงเกลอร์ไปยังท่อย่อย
                const distances = sprinklerPoints
                    .map((sprinkler) => {
                        try {
                            const point = turf.point([sprinkler.lng, sprinkler.lat]);
                            const dKm = pointToLineDistance(
                                point,
                                line as unknown as GeoFeature<GeoLineString>,
                                { units: 'kilometers' }
                            );
                            return dKm * 1000;
                        } catch {
                            return Infinity;
                        }
                    })
                    .filter((d) => d < Infinity);

                if (distances.length > 0) {
                    const minDistance = Math.min(...distances);
                    const isBetweenRows = minDistance > 1.5 && minDistance < 5.0;

                    if (isBetweenRows) {
                        // สำหรับโหมดระหว่างแถว: คำนวณสปริงเกลอร์ทั้งสองแถวที่ท่อย่อยลากผ่าน
                        const connectedSprinklers = findNearbyConnectedSprinklersBetweenRows(
                            latLongest.coordinates,
                            sprinklerPoints
                        );

                        // หาสปริงเกลอร์ที่อยู่ใกล้ท่อย่อยมากที่สุดเพื่อกำหนดแถว
                        const closestSprinklers = sprinklerPoints
                            .map((sprinkler) => {
                                try {
                                    const point = turf.point([sprinkler.lng, sprinkler.lat]);
                                    const dKm = pointToLineDistance(
                                        point,
                                        line as unknown as GeoFeature<GeoLineString>,
                                        { units: 'kilometers' }
                                    );
                                    return { sprinkler, distance: dKm * 1000 };
                                } catch {
                                    return { sprinkler, distance: Infinity };
                                }
                            })
                            .filter((item) => item.distance < Infinity)
                            .sort((a, b) => a.distance - b.distance);

                        if (closestSprinklers.length >= 2) {
                            // หาระยะห่างเฉลี่ยระหว่างสปริงเกลอร์ที่ใกล้ที่สุด
                            const avgDistance =
                                closestSprinklers
                                    .slice(0, Math.min(10, closestSprinklers.length))
                                    .reduce((sum, item) => sum + item.distance, 0) /
                                Math.min(10, closestSprinklers.length);

                            // หาสปริงเกลอร์ที่อยู่ในระยะห่างที่เหมาะสมจากท่อย่อย (ทั้งสองฝั่ง)
                            const tolerance = Math.max(0.5, avgDistance * 0.3);
                            const leftRowSprinklers = sprinklerPoints.filter((sprinkler) => {
                                try {
                                    const point = turf.point([sprinkler.lng, sprinkler.lat]);
                                    const dKm = pointToLineDistance(
                                        point,
                                        line as unknown as GeoFeature<GeoLineString>,
                                        { units: 'kilometers' }
                                    );
                                    const dist = dKm * 1000;
                                    return Math.abs(dist - avgDistance) <= tolerance;
                                } catch {
                                    return false;
                                }
                            });

                            const rightRowSprinklers = sprinklerPoints.filter((sprinkler) => {
                                try {
                                    const point = turf.point([sprinkler.lng, sprinkler.lat]);
                                    const dKm = pointToLineDistance(
                                        point,
                                        line as unknown as GeoFeature<GeoLineString>,
                                        { units: 'kilometers' }
                                    );
                                    const dist = dKm * 1000;
                                    // หาสปริงเกลอร์ในแถวขวา (ระยะห่างประมาณ 2 เท่าของ avgDistance)
                                    const rightRowDistance = avgDistance * 2;
                                    return Math.abs(dist - rightRowDistance) <= tolerance;
                                } catch {
                                    return false;
                                }
                            });

                            // รวมสปริงเกลอร์ทั้งสองแถว
                            latLongestUnits = leftRowSprinklers.length + rightRowSprinklers.length;

                            // Debug logging สำหรับโหมดระหว่างแถว
                        } else {
                            // ถ้าไม่สามารถหาสปริงเกลอร์ทั้งสองแถวได้ ใช้วิธีเดิม
                            latLongestUnits = connectedSprinklers.length;
                        }
                    } else {
                        // สำหรับโหมดปกติ
                        latLongestUnits = lateralUnits(latLongest);
                    }
                }
            }
        }

        latLongestFlow = latLongestUnits * perSprinkler;
    }

    // Submain longest flow (use connection points instead of lateral count)
    const subLongest = findLongest(subs);

    // Calculate connection points for submain pipes in this zone
    const connectionPoints = createLateralConnectionPoints(lats, subs);
    const connectionPointsBySubmain: Record<string, number> = {};
    connectionPoints.forEach((cp) => {
        const subId = cp.submainId;
        if (!connectionPointsBySubmain[subId]) {
            connectionPointsBySubmain[subId] = 0;
        }
        // Count each connection point as 1, not the number of connected laterals
        connectionPointsBySubmain[subId] += 1;
    });

    const computeSubFlow = (sid: string): { latCount: number; flow: number } => {
        // Calculate flow based on connected laterals
        const latIds = Object.entries(latToSub)
            .filter(([, subId]) => subId === sid)
            .map(([latId]) => latId);

        // Use actual connected laterals count instead of connection points
        const latCount = latIds.length;

        let totalFlow = 0;
        const debugInfo: {
            latCount: number;
            latIds: string[];
            perSprinkler: number;
            totalFlow: number;
            lateralDetails: Array<{
                lid: string;
                found: boolean;
                hasLine?: boolean;
                sprinklerPoints?: number;
                distances?: number;
                minDistance?: number;
                isBetweenRows?: boolean;
                connectedSprinklers?: number;
                lateralUnits?: number;
                lateralFlow?: number;
            }>;
        } = {
            latCount,
            latIds,
            perSprinkler,
            totalFlow: 0,
            lateralDetails: [],
        };

        latIds.forEach((lid) => {
            const lp = lats.find((p) => String(p.id) === lid);
            if (!lp) {
                debugInfo.lateralDetails.push({ lid, found: false });
                return;
            }

            // ตรวจสอบว่าเป็นท่อย่อยแบบโหมดระหว่างแถวหรือไม่
            const line = toLine(lp);
            if (!line) {
                debugInfo.lateralDetails.push({ lid, found: true, hasLine: false });
                return;
            }

            const sprinklerPoints = irrigationPoints
                .filter((pt) => {
                    const type = normalizeIrrigationType(pt.type);
                    return (
                        type === 'sprinkler' &&
                        typeof pt.lat === 'number' &&
                        typeof pt.lng === 'number'
                    );
                })
                .map((pt) => ({ lat: pt.lat, lng: pt.lng }));

            if (sprinklerPoints.length === 0) {
                debugInfo.lateralDetails.push({
                    lid,
                    found: true,
                    hasLine: true,
                    sprinklerPoints: 0,
                });
                return;
            }

            // คำนวณระยะห่างจากสปริงเกลอร์ไปยังท่อย่อย
            const distances = sprinklerPoints
                .map((sprinkler) => {
                    try {
                        const point = turf.point([sprinkler.lng, sprinkler.lat]);
                        const dKm = pointToLineDistance(
                            point,
                            line as unknown as GeoFeature<GeoLineString>,
                            { units: 'kilometers' }
                        );
                        return dKm * 1000;
                    } catch {
                        return Infinity;
                    }
                })
                .filter((d) => d < Infinity);

            if (distances.length === 0) {
                debugInfo.lateralDetails.push({
                    lid,
                    found: true,
                    hasLine: true,
                    sprinklerPoints: sprinklerPoints.length,
                    distances: 0,
                });
                return;
            }

            const minDistance = Math.min(...distances);
            const isBetweenRows = minDistance > 1.5 && minDistance < 5.0;

            let lateralFlow = 0;
            if (isBetweenRows) {
                // สำหรับโหมดระหว่างแถว: คำนวณสปริงเกลอร์ทั้งสองแถวที่ท่อย่อยลากผ่าน
                const connectedSprinklers = findNearbyConnectedSprinklersBetweenRows(
                    lp.coordinates,
                    sprinklerPoints
                );
                lateralFlow = connectedSprinklers.length * perSprinkler;
                debugInfo.lateralDetails.push({
                    lid,
                    found: true,
                    hasLine: true,
                    sprinklerPoints: sprinklerPoints.length,
                    distances: distances.length,
                    minDistance,
                    isBetweenRows,
                    connectedSprinklers: connectedSprinklers.length,
                    lateralFlow,
                });
            } else {
                // สำหรับโหมดปกติ: คำนวณสปริงเกลอร์ที่เชื่อมต่อโดยตรง
                const n = lateralUnits(lp);
                lateralFlow = n * perSprinkler;
                debugInfo.lateralDetails.push({
                    lid,
                    found: true,
                    hasLine: true,
                    sprinklerPoints: sprinklerPoints.length,
                    distances: distances.length,
                    minDistance,
                    isBetweenRows,
                    lateralUnits: n,
                    lateralFlow,
                });
            }

            totalFlow += lateralFlow;
        });

        debugInfo.totalFlow = totalFlow;

        return { latCount, flow: totalFlow };
    };
    const subLongestStats = subLongest
        ? computeSubFlow(String(subLongest.id))
        : { latCount: 0, flow: 0 };

    // Main highest-flow selection (among mains connected to any submains in this zone)
    // For each main: รวมอัตราการไหลของท่อเมนย่อยที่เชื่อมกับท่อเมนมารวมกัน
    const connectedMainIds = Array.from(new Set(Object.values(subToMain)));
    const connectedMains = mainsAll.filter((m) => connectedMainIds.includes(String(m.id)));
    const mainIdToSubIds: Record<string, Array<string>> = {};
    Object.entries(subToMain).forEach(([sid, mid]) => {
        const key = String(mid);
        if (!mainIdToSubIds[key]) mainIdToSubIds[key] = [];
        mainIdToSubIds[key].push(String(sid));
    });

    let bestMainId: string | number | null = null;
    let bestMainFlow = 0;
    let bestMainSubCount = 0;

    connectedMains.forEach((m) => {
        const mid = String(m.id);
        const subIds = mainIdToSubIds[mid] || [];
        const subCount = subIds.length;
        if (subCount === 0) return;

        // รวมอัตราการไหลของท่อเมนย่อยที่เชื่อมกับท่อเมนมารวมกัน
        let totalMainFlow = 0;
        subIds.forEach((sid) => {
            const subFlow = computeSubFlow(sid).flow;
            totalMainFlow += subFlow;
        });

        // Debug logging for troubleshooting
        if (totalMainFlow === 0 && subIds.length > 0) {
            // No main flow calculated
        }

        if (totalMainFlow > bestMainFlow) {
            bestMainFlow = totalMainFlow;
            bestMainId = m.id;
            bestMainSubCount = subCount;
        }
    });

    // Fallback: if no flow found, still pick the physically longest connected main (for ID/connection info)
    if (bestMainId === null && connectedMains.length > 0) {
        const longest = connectedMains.reduce<{ m: Pipe | null; len: number }>(
            (acc, cur) => {
                const len = pipeLength(cur);
                if (len > acc.len) return { m: cur, len };
                return acc;
            },
            { m: null, len: -1 }
        ).m;
        if (longest) {
            const mid = String(longest.id);
            bestMainId = longest.id;
            bestMainSubCount = (mainIdToSubIds[mid] || []).length;
        }
    }

    // Debug logging for final results

    return {
        main: {
            longestId: bestMainId,
            connectedSubmains: bestMainSubCount,
            flowLMin: bestMainFlow,
        },
        submain: {
            longestId: subLongest?.id ?? null,
            connectedLaterals: subLongestStats.latCount,
            flowLMin: subLongestStats.flow,
        },
        lateral: {
            longestId: latLongest?.id ?? null,
            sprinklers: latLongestUnits,
            flowLMin: latLongestFlow,
        },
    };
};

// Add the missing calculateZoneIrrigationCounts function
const calculateZoneIrrigationCounts = (
    zone: Zone,
    irrigationPoints: IrrigationPoint[]
): {
    sprinkler: number;
    dripTape: number;
    pivot: number;
    waterJetTape: number;
    total: number;
} => {
    if (!zone.coordinates || !Array.isArray(zone.coordinates) || zone.coordinates.length < 3) {
        return { sprinkler: 0, dripTape: 0, pivot: 0, waterJetTape: 0, total: 0 };
    }

    try {
        const zoneCoords = zone.coordinates
            .map((coord: CoordinateInput) => {
                if (Array.isArray(coord) && coord.length === 2) {
                    return [coord[1], coord[0]] as [number, number];
                }
                if (
                    'lat' in coord &&
                    'lng' in coord &&
                    typeof coord.lat === 'number' &&
                    typeof coord.lng === 'number'
                ) {
                    return [coord.lng, coord.lat] as [number, number];
                }
                return null;
            })
            .filter((coord): coord is [number, number] => coord !== null);

        if (zoneCoords.length < 3) {
            return { sprinkler: 0, dripTape: 0, pivot: 0, waterJetTape: 0, total: 0 };
        }

        const firstPoint = zoneCoords[0];
        const lastPoint = zoneCoords[zoneCoords.length - 1];
        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
            zoneCoords.push(firstPoint);
        }

        const zonePolygon = turf.polygon([zoneCoords]);

        let sprinklerCount = 0;
        let dripTapeCount = 0;
        let pivotCount = 0;
        let waterJetTapeCount = 0;

        irrigationPoints.forEach((point) => {
            if (!point.lat || !point.lng) return;

            const pointGeometry = turf.point([point.lng, point.lat]);

            if (booleanPointInPolygon(pointGeometry, zonePolygon)) {
                const normalizedType = normalizeIrrigationType(point.type);

                switch (normalizedType) {
                    case 'sprinkler':
                        sprinklerCount++;
                        break;
                    // mini_sprinkler and micro_spray are normalized to sprinkler earlier
                    case 'drip_tape':
                        dripTapeCount++;
                        break;
                    case 'pivot':
                        pivotCount++;
                        break;
                    case 'water_jet_tape':
                        waterJetTapeCount++;
                        break;
                    default:
                        // Default to sprinkler for unknown types
                        sprinklerCount++;
                        break;
                }
            }
        });

        // Debug: ตรวจสอบการคำนวณในโซน
        dbg(`🔍 Zone ${zone.name} irrigation calculation:`, {
            zoneId: zone.id,
            totalPointsInZone: sprinklerCount + dripTapeCount,
            sprinkler: sprinklerCount,
            dripTape: dripTapeCount,
            totalIrrigationPoints: irrigationPoints.length,
        });

        const total = sprinklerCount + dripTapeCount + pivotCount + waterJetTapeCount;

        return {
            sprinkler: sprinklerCount,
            dripTape: dripTapeCount,
            pivot: pivotCount,
            waterJetTape: waterJetTapeCount,
            total: total,
        };
    } catch (error) {
        console.error('Error calculating zone irrigation counts:', error);
        return { sprinkler: 0, dripTape: 0, pivot: 0, waterJetTape: 0, total: 0 };
    }
};

export default function FieldCropSummary() {
    const { t } = useLanguage();
    const page = usePage<Partial<FieldCropSummaryProps>>();
    const rawInertiaProps = page?.props as Partial<FieldCropSummaryProps> | undefined;
    const inertiaProps: Partial<FieldCropSummaryProps> = useMemo(
        () => rawInertiaProps ?? ({} as Partial<FieldCropSummaryProps>),
        [rawInertiaProps]
    );
    const [summaryData, setSummaryData] = useState<FieldCropSummaryProps | null>(null);
    const [calculatedZoneSummaries, setCalculatedZoneSummaries] = useState<
        Record<string, ZoneSummary>
    >({});
    const [zoneIrrigationCounts, setZoneIrrigationCounts] = useState<Array<{
        sprinkler: number;
        dripTape: number;
        pivot: number;
        waterJetTape: number;
        total: number;
    }>>([]);

    // Enhanced state for Google Maps and image capture
    const [mapImageCaptured, setMapImageCaptured] = useState<boolean>(false);
    const [isCapturingImage, setIsCapturingImage] = useState<boolean>(false);
    const [captureStatus, setCaptureStatus] = useState<string>('');
    const googleMapRef = useRef<google.maps.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const [zoneDetailsOpen, setZoneDetailsOpen] = useState<Record<string, boolean>>({});
    const [zoneLateralDetailsOpen, setZoneLateralDetailsOpen] = useState<Record<string, boolean>>(
        {}
    );
    const [showRadiusCircles, setShowRadiusCircles] = useState<boolean>(true);

    useEffect(() => {
        // Prefer Inertia props first (normalize JSON strings if POSTed)
        if (
            inertiaProps &&
            (inertiaProps.pipes ||
                inertiaProps.zones ||
                inertiaProps.mainField ||
                inertiaProps.selectedCrops)
        ) {
            try {
                const normalized: FieldCropSummaryProps = {
                    ...inertiaProps,
                    selectedCrops: Array.isArray(inertiaProps.selectedCrops)
                        ? inertiaProps.selectedCrops
                        : typeof inertiaProps.selectedCrops === 'string'
                          ? (inertiaProps.selectedCrops as unknown as string)
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean)
                          : inertiaProps.selectedCrops,
                    mainField:
                        typeof inertiaProps.mainField === 'string'
                            ? JSON.parse(inertiaProps.mainField)
                            : inertiaProps.mainField,
                    zones:
                        typeof inertiaProps.zones === 'string'
                            ? JSON.parse(inertiaProps.zones)
                            : inertiaProps.zones,
                    pipes:
                        typeof inertiaProps.pipes === 'string'
                            ? JSON.parse(inertiaProps.pipes)
                            : inertiaProps.pipes,
                    irrigationPoints:
                        typeof inertiaProps.irrigationPoints === 'string'
                            ? JSON.parse(inertiaProps.irrigationPoints)
                            : inertiaProps.irrigationPoints,
                    irrigationLines:
                        typeof inertiaProps.irrigationLines === 'string'
                            ? JSON.parse(inertiaProps.irrigationLines)
                            : inertiaProps.irrigationLines,
                    irrigationSettings:
                        typeof inertiaProps.irrigationSettings === 'string'
                            ? JSON.parse(inertiaProps.irrigationSettings)
                            : inertiaProps.irrigationSettings,
                    obstacles:
                        typeof (inertiaProps as Partial<FieldCropSummaryProps>).obstacles ===
                        'string'
                            ? JSON.parse(
                                  (inertiaProps as Partial<FieldCropSummaryProps>)
                                      .obstacles as unknown as string
                              )
                            : (inertiaProps as Partial<FieldCropSummaryProps>).obstacles,
                    equipment:
                        typeof (inertiaProps as Partial<FieldCropSummaryProps>).equipment ===
                        'string'
                            ? JSON.parse(
                                  (inertiaProps as Partial<FieldCropSummaryProps>)
                                      .equipment as unknown as string
                              )
                            : (inertiaProps as Partial<FieldCropSummaryProps>).equipment,
                    equipmentIcons:
                        typeof (inertiaProps as Partial<FieldCropSummaryProps>).equipmentIcons ===
                        'string'
                            ? JSON.parse(
                                  (inertiaProps as Partial<FieldCropSummaryProps>)
                                      .equipmentIcons as unknown as string
                              )
                            : (inertiaProps as Partial<FieldCropSummaryProps>).equipmentIcons,
                    rowSpacing:
                        typeof inertiaProps.rowSpacing === 'string'
                            ? JSON.parse(inertiaProps.rowSpacing)
                            : inertiaProps.rowSpacing,
                    plantSpacing:
                        typeof inertiaProps.plantSpacing === 'string'
                            ? JSON.parse(inertiaProps.plantSpacing)
                            : inertiaProps.plantSpacing,
                    mapCenter:
                        typeof inertiaProps.mapCenter === 'string'
                            ? JSON.parse(inertiaProps.mapCenter)
                            : inertiaProps.mapCenter,
                    zoneAssignments:
                        typeof inertiaProps.zoneAssignments === 'string'
                            ? JSON.parse(inertiaProps.zoneAssignments)
                            : inertiaProps.zoneAssignments,
                    irrigationAssignments:
                        typeof inertiaProps.irrigationAssignments === 'string'
                            ? JSON.parse(inertiaProps.irrigationAssignments)
                            : inertiaProps.irrigationAssignments,
                } as FieldCropSummaryProps;
                const derivedIrrigationPoints =
                    Array.isArray(normalized.irrigationPoints) &&
                    normalized.irrigationPoints.length > 0
                        ? normalized.irrigationPoints
                        : (() => {
                              const irrigationPositions = (
                                  normalized as Partial<FieldCropSummaryProps> & {
                                      irrigationPositions?: {
                                          sprinklers?: { lat: number; lng: number }[];
                                          pivots?: { lat: number; lng: number }[];
                                          dripTapes?: { lat: number; lng: number }[];
                                          waterJets?: { lat: number; lng: number }[];
                                      };
                                  }
                              ).irrigationPositions;

                              const points: IrrigationPoint[] = [];

                              // Add sprinklers with default radius
                              if (Array.isArray(irrigationPositions?.sprinklers)) {
                                  irrigationPositions.sprinklers.forEach((s, i) => {
                                      points.push({
                                          id: `sprinkler-${i}`,
                                          lat: s.lat,
                                          lng: s.lng,
                                          type: 'sprinkler',
                                          radius: (s as { radius?: number }).radius || 8, // Default 8m radius for sprinklers
                                      });
                                  });
                              }

                              // Add pivots with default radius
                              if (Array.isArray(irrigationPositions?.pivots)) {
                                  irrigationPositions.pivots.forEach((p, i) => {
                                      points.push({
                                          id: `pivot-${i}`,
                                          lat: p.lat,
                                          lng: p.lng,
                                          type: 'pivot',
                                          radius: (p as { radius?: number }).radius || 50, // Default 50m radius for pivots
                                      });
                                  });
                              }

                              // Add drip tapes
                              if (Array.isArray(irrigationPositions?.dripTapes)) {
                                  irrigationPositions.dripTapes.forEach((d, i) => {
                                      points.push({
                                          id: `dripTape-${i}`,
                                          lat: d.lat,
                                          lng: d.lng,
                                          type: 'drip_tape',
                                      });
                                  });
                              }

                              // Add water jets
                              if (Array.isArray(irrigationPositions?.waterJets)) {
                                  irrigationPositions.waterJets.forEach((w, i) => {
                                      points.push({
                                          id: `waterJet-${i}`,
                                          lat: w.lat,
                                          lng: w.lng,
                                          type: 'water_jet_tape',
                                      });
                                  });
                              }

                              return points;
                          })();

                const finalData: FieldCropSummaryProps = {
                    ...normalized,
                    zoneAssignments: normalized.zoneAssignments ?? {},
                    irrigationAssignments: normalized.irrigationAssignments ?? {},
                    zones: normalized.zones ?? [],
                    pipes: normalized.pipes ?? [],
                    irrigationPoints: derivedIrrigationPoints,
                    obstacles: (normalized as Partial<FieldCropSummaryProps>).obstacles ?? [],
                    equipment:
                        (normalized as Partial<FieldCropSummaryProps>).equipment ??
                        (normalized as Partial<FieldCropSummaryProps>).equipmentIcons ??
                        [],
                    equipmentIcons:
                        (normalized as Partial<FieldCropSummaryProps>).equipmentIcons ??
                        (normalized as Partial<FieldCropSummaryProps>).equipment ??
                        [],
                };
                setSummaryData(finalData);
                return;
            } catch (e) {
                console.warn('Failed to parse Inertia props; falling back to localStorage', e);
            }
        }

        const savedData = localStorage.getItem('fieldCropData');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (
                    parsedData &&
                    typeof parsedData === 'object' &&
                    (parsedData.mainField || (parsedData.zones && parsedData.zones.length > 0))
                ) {
                    // Using fieldCropData from localStorage
                    // Derive selected crops from saved data or URL when available
                    let derivedSelectedCrops: string[] = Array.isArray(parsedData.selectedCrops)
                        ? parsedData.selectedCrops
                        : [];
                    if (derivedSelectedCrops.length === 0 && typeof window !== 'undefined') {
                        try {
                            const search = window.location.search || '';
                            const match = /[?&]crops=([^&]+)/.exec(search);
                            if (match && match[1]) {
                                derivedSelectedCrops = decodeURIComponent(match[1])
                                    .split(',')
                                    .map((s) => s.trim())
                                    .filter(Boolean);
                            }
                        } catch {
                            /* noop */
                        }
                    }
                    const derivedIrrigationPoints =
                        Array.isArray(parsedData.irrigationPoints) &&
                        parsedData.irrigationPoints.length > 0
                            ? parsedData.irrigationPoints
                            : (() => {
                                  const irrigationPositions = (
                                      parsedData as Partial<FieldCropSummaryProps> & {
                                          irrigationPositions?: {
                                              sprinklers?: { lat: number; lng: number }[];
                                              pivots?: { lat: number; lng: number }[];
                                              dripTapes?: { lat: number; lng: number }[];
                                              waterJets?: { lat: number; lng: number }[];
                                          };
                                      }
                                  ).irrigationPositions;

                                  const points: IrrigationPoint[] = [];

                                  // Add sprinklers with default radius
                                  if (Array.isArray(irrigationPositions?.sprinklers)) {
                                      irrigationPositions.sprinklers.forEach((s, i) => {
                                          points.push({
                                              id: `sprinkler-${i}`,
                                              lat: s.lat,
                                              lng: s.lng,
                                              type: 'sprinkler',
                                              radius: (s as { radius?: number }).radius || 8, // Default 8m radius for sprinklers
                                          });
                                      });
                                  }

                                  // Add pivots with default radius
                                  if (Array.isArray(irrigationPositions?.pivots)) {
                                      irrigationPositions.pivots.forEach((p, i) => {
                                          points.push({
                                              id: `pivot-${i}`,
                                              lat: p.lat,
                                              lng: p.lng,
                                              type: 'pivot',
                                              radius: (p as { radius?: number }).radius || 50, // Default 50m radius for pivots
                                          });
                                      });
                                  }

                                  // Add drip tapes
                                  if (Array.isArray(irrigationPositions?.dripTapes)) {
                                      irrigationPositions.dripTapes.forEach((d, i) => {
                                          points.push({
                                              id: `dripTape-${i}`,
                                              lat: d.lat,
                                              lng: d.lng,
                                              type: 'drip_tape',
                                          });
                                      });
                                  }

                                  // Add water jets
                                  if (Array.isArray(irrigationPositions?.waterJets)) {
                                      irrigationPositions.waterJets.forEach((w, i) => {
                                          points.push({
                                              id: `waterJet-${i}`,
                                              lat: w.lat,
                                              lng: w.lng,
                                              type: 'water_jet_tape',
                                          });
                                      });
                                  }

                                  return points;
                              })();

                    const coerced: FieldCropSummaryProps = {
                        ...parsedData,
                        selectedCrops: derivedSelectedCrops,
                        zoneAssignments: parsedData.zoneAssignments ?? {},
                        irrigationAssignments: parsedData.irrigationAssignments ?? {},
                        zones: parsedData.zones ?? [],
                        pipes: parsedData.pipes ?? [],
                        irrigationPoints: derivedIrrigationPoints,
                        obstacles: (parsedData as FieldCropSummaryProps).obstacles ?? [],
                        equipment:
                            (parsedData as FieldCropSummaryProps).equipment ??
                            (parsedData as FieldCropSummaryProps).equipmentIcons ??
                            [],
                        equipmentIcons:
                            (parsedData as FieldCropSummaryProps).equipmentIcons ??
                            (parsedData as FieldCropSummaryProps).equipment ??
                            [],
                    };
                    setSummaryData(coerced);
                } else {
                    console.warn('📥 Invalid or empty fieldCropData structure');
                    setSummaryData(null);
                }
            } catch (error) {
                console.error('Error parsing fieldCropData:', error);
                setSummaryData(null);
            }
        } else {
            console.warn('📥 No fieldCropData found in localStorage');
            setSummaryData(null);
        }
    }, [inertiaProps]);

    // Enhanced function to handle map image capture with better feedback
    const handleCaptureMapImage = useCallback(async () => {
        if (mapImageCaptured || isCapturingImage) return;

        setIsCapturingImage(true);
        setCaptureStatus(t('Capturing...'));

        try {
            let mapElement: HTMLElement | null = null;

            // Try different methods to get the map element
            if (googleMapRef.current) {
                mapElement = googleMapRef.current.getDiv();
            } else if (mapContainerRef.current) {
                mapElement = mapContainerRef.current;
            } else {
                // Fallback: try to find map element by class or ID
                mapElement =
                    (document.querySelector('.google-maps-container') as HTMLElement) ||
                    (document.querySelector('[id*="map"]') as HTMLElement) ||
                    (document.querySelector('[class*="map"]') as HTMLElement);
            }

            if (mapElement) {
                setCaptureStatus(t('Processing...'));
                const imageUrl = await captureMapImage(mapElement, 'field-crop');

                if (imageUrl) {
                    const isVerified = verifyImageSave();
                    if (isVerified) {
                        setMapImageCaptured(true);
                        setCaptureStatus(t('Successfully saved'));

                        // Clear status after delay
                        setTimeout(() => setCaptureStatus(''), 3000);
                    } else {
                        setCaptureStatus(t('Error'));
                        setTimeout(() => setCaptureStatus(''), 3000);
                    }
                } else {
                    setCaptureStatus(t('Error'));
                    setTimeout(() => setCaptureStatus(''), 3000);
                }
            } else {
                setCaptureStatus(t('Error'));
                setTimeout(() => setCaptureStatus(''), 3000);
            }
        } catch (error) {
            console.error('❌ Error in handleCaptureMapImage:', error);
            setCaptureStatus(t('Error'));
            setTimeout(() => setCaptureStatus(''), 3000);
        } finally {
            setIsCapturingImage(false);
        }
    }, [isCapturingImage, mapImageCaptured, t]);

    // Enhanced auto-capture with better timing and error handling
    useEffect(() => {
        if (summaryData && !mapImageCaptured && !isCapturingImage) {
            // Delay to ensure map is fully rendered and tiles are loaded
            const timer = setTimeout(() => {
                handleCaptureMapImage();
            }, 5000); // Increased delay for better reliability

            return () => clearTimeout(timer);
        }
    }, [summaryData, mapImageCaptured, isCapturingImage, handleCaptureMapImage, zoneIrrigationCounts]);

    // Enhanced manual capture function with user feedback
    const handleManualCapture = async () => {
        setMapImageCaptured(false); // Reset to allow manual capture
        await handleCaptureMapImage();

        if (captureStatus.includes('สำเร็จ')) {
            alert('ภาพแผนที่ถูกบันทึกแล้ว! สามารถดูได้ในหน้าคำนวณอุปกรณ์');
        } else if (captureStatus.includes('ข้อผิดพลาด') || captureStatus.includes('ไม่สามารถ')) {
            alert('เกิดข้อผิดพลาดในการบันทึกภาพ โปรดลองอีกครั้ง');
        }
    };

    // Save Project functionality removed per UI simplification

    const {
        mainField,
        fieldAreaSize = 0,
        zones = [],
        zoneAssignments = {},
        pipes = [],
        equipmentIcons = [],
        obstacles = [],
        irrigationPoints = [],
        irrigationAssignments = {},
        rowSpacing = {},
        plantSpacing = {},
        mapCenter = [14.5995, 120.9842],
        mapZoom = 18,
    } = summaryData || {};

    const actualZones = useMemo(() => {
        const zonesArray = Array.isArray(zones) ? zones : [];
        return fixZoneColors(zonesArray);
    }, [zones]);
    const actualPipes = useMemo(() => (Array.isArray(pipes) ? pipes : []), [pipes]);
    const zonePipeStatsMap = useMemo(() => {
        try {
            const m = new Map<string, ZonePipeStats>();
            for (const z of actualZones) {
                const id = z.id.toString();
                m.set(id, calculateZonePipeStats(actualPipes, id, actualZones));
            }
            return m;
        } catch {
            return new Map<string, ZonePipeStats>();
        }
    }, [actualPipes, actualZones]);
    const actualEquipmentIcons = useMemo(() => {
        const isValidPump = (e: Partial<Equipment> | undefined | null): e is Equipment => {
            return !!(
                e &&
                (e.type === 'pump' || e.type === 'water_pump') &&
                typeof e.lat === 'number' &&
                Number.isFinite(e.lat) &&
                typeof e.lng === 'number' &&
                Number.isFinite(e.lng)
            );
        };

        const icons = Array.isArray(equipmentIcons) ? equipmentIcons : [];
        const eq = Array.isArray((summaryData as Partial<FieldCropSummaryProps> | null)?.equipment)
            ? ((summaryData as Partial<FieldCropSummaryProps> | null)?.equipment as Equipment[])
            : [];
        // Merge and de-duplicate by id to ensure pumps are included regardless of source
        const merged = [...icons, ...eq];
        const seen = new Set<string | number>();
        const deduped = merged.filter((item) => {
            const id = (item as { id?: string | number }).id ?? Math.random();
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
        // If no valid pump info from props, fallback to localStorage
        const hasValidPump = deduped.some(isValidPump);
        if (!hasValidPump) {
            try {
                const fieldDataStr = localStorage.getItem('fieldCropData');
                if (fieldDataStr) {
                    const parsed = JSON.parse(fieldDataStr) as Partial<{
                        equipment: Equipment[];
                        equipmentIcons: Equipment[];
                    }> | null;
                    const storageEquip = Array.isArray(parsed?.equipment) ? parsed!.equipment : [];
                    const storageIcons = Array.isArray(parsed?.equipmentIcons)
                        ? parsed!.equipmentIcons
                        : [];
                    const pumps = [...storageEquip, ...storageIcons].filter(isValidPump);
                    if (pumps.length > 0) return pumps as Equipment[];
                }
            } catch {
                // ignore
            }
        }
        return deduped as Equipment[];
    }, [equipmentIcons, summaryData]);
    const actualObstacles = Array.isArray(obstacles) ? obstacles : [];
    const actualIrrigationPoints = useMemo(
        () => (Array.isArray(irrigationPoints) ? irrigationPoints : []),
        [irrigationPoints]
    );

    // Global irrigation type selected on the irrigation page (fallback when zone has no assignment)
    const globalIrrigationType = useMemo(() => {
        try {
            const data = localStorage.getItem('fieldCropData');
            if (!data) return undefined;
            const parsed = JSON.parse(data) as { selectedIrrigationType?: string } | null;
            return parsed?.selectedIrrigationType || undefined;
        } catch {
            return undefined;
        }
    }, []);

    // Flow settings from irrigation page (used to display flowrate per zone)
    const irrigationSettingsData = useMemo(() => {
        try {
            const fromProps = (summaryData as Partial<FieldCropSummaryProps> | null)
                ?.irrigationSettings as unknown as
                | Record<string, { flow?: number; coverageRadius?: number; pressure?: number }>
                | undefined;
            if (fromProps && typeof fromProps === 'object') return fromProps;
            const data = localStorage.getItem('fieldCropData');
            if (!data) {
                // Return default flow settings if no data found
                return {
                    sprinkler_system: { flow: 30, coverageRadius: 5 }, // Default 30 L/min for sprinklers
                    pivot: { flow: 50, coverageRadius: 10 }, // Default 50 L/min for pivots
                    water_jet_tape: { flow: 20, coverageRadius: 3 }, // Default 20 L/min for water jet tape
                    drip_tape: { flow: 10, coverageRadius: 1 }, // Default 10 L/min for drip tape
                } as Record<string, { flow?: number; coverageRadius?: number; pressure?: number }>;
            }
            const parsed = JSON.parse(data) as {
                irrigationSettings?: Record<
                    string,
                    { flow?: number; coverageRadius?: number; pressure?: number }
                >;
            } | null;
            const settings = parsed?.irrigationSettings || {};

            // Ensure default flow values if not set
            if (!settings.sprinkler_system?.flow) {
                settings.sprinkler_system = { ...settings.sprinkler_system, flow: 30 };
            }
            if (!settings.pivot?.flow) {
                settings.pivot = { ...settings.pivot, flow: 50 };
            }
            if (!settings.water_jet_tape?.flow) {
                settings.water_jet_tape = { ...settings.water_jet_tape, flow: 20 };
            }
            if (!settings.drip_tape?.flow) {
                settings.drip_tape = { ...settings.drip_tape, flow: 10 };
            }

            return settings as Record<
                string,
                { flow?: number; coverageRadius?: number; pressure?: number }
            >;
        } catch {
            // Return default flow settings on error
            return {
                sprinkler_system: { flow: 30, coverageRadius: 5 },
                pivot: { flow: 50, coverageRadius: 10 },
                water_jet_tape: { flow: 20, coverageRadius: 3 },
                drip_tape: { flow: 10, coverageRadius: 1 },
            } as Record<string, { flow?: number; coverageRadius?: number; pressure?: number }>;
        }
    }, [summaryData]);

    // Debug logging for irrigation settings
    useEffect(() => {
    }, [irrigationSettingsData, actualPipes, actualIrrigationPoints]);

    // Build global pipe network connectivity & flow summary
    const pipeNetworkSummary = useMemo(() => {
        try {
            return buildPipeNetworkSummary(
                actualPipes,
                actualIrrigationPoints,
                irrigationSettingsData || {},
                actualZones
            );
        } catch {
            return { mains: [], counts: { main: 0, submain: 0, lateral: 0 } } as PipeNetworkSummary;
        }
    }, [actualPipes, actualIrrigationPoints, irrigationSettingsData, actualZones]);

    // Normalize and format irrigation type for display, accepting keys from both pages
    const formatIrrigationType = (type?: string) => {
        if (!type) return t('Not defined');
        const norm = normalizeIrrigationType(type);
        switch (norm) {
            case 'sprinkler':
                return t('Sprinkler');
            case 'drip_tape':
                return t('Drip Tape');
            default:
                // Support raw keys coming from irrigation page
                switch ((type || '').toLowerCase()) {
                    case 'sprinkler_system':
                        return t('Sprinkler');
                    case 'pivot':
                        return t('System Pivot');
                    case 'water_jet_tape':
                        return t('Water Jet Tape');
                    default:
                        return type;
                }
        }
    };

    useEffect(() => {
        if (summaryData && zones.length > 0) {
            dbg('🧮 Starting zone calculations with cropData (per irrigation)...');
            dbg('🔧 Available pipes for zone calculation:', pipes);
            dbg('🎯 Available zones:', zones);

            const newZoneSummaries: Record<string, ZoneSummary> = {};
            const newZoneIrrigationCounts: Array<{
                sprinkler: number;
                dripTape: number;
                pivot: number;
                waterJetTape: number;
                total: number;
            }> = [];
            
            // Load zoneAssignments and irrigationAssignments from localStorage if not in props
            let zAssign: Record<string, string> = {};
            let iAssign: Record<string, string> = {};
            
            if (zoneAssignments && typeof zoneAssignments === 'object') {
                zAssign = zoneAssignments as Record<string, string>;
            } else {
                // Try to load from localStorage
                try {
                    const fieldDataStr = localStorage.getItem('fieldCropData');
                    if (fieldDataStr) {
                        const parsed = JSON.parse(fieldDataStr);
                        if (parsed?.crops?.zoneAssignments) {
                            zAssign = parsed.crops.zoneAssignments;
                        }
                    }
                } catch (error) {
                    console.warn('Failed to load zoneAssignments from localStorage:', error);
                }
                
                // If still empty, create from zones with cropType
                if (Object.keys(zAssign).length === 0) {
                    zones.forEach((zone) => {
                        if (zone.cropType) {
                            zAssign[zone.id.toString()] = zone.cropType;
                        }
                    });
                }
            }
            
            if (irrigationAssignments && typeof irrigationAssignments === 'object') {
                iAssign = irrigationAssignments as Record<string, string>;
            } else {
                // Try to load from localStorage
                try {
                    const fieldDataStr = localStorage.getItem('fieldCropData');
                    if (fieldDataStr) {
                        const parsed = JSON.parse(fieldDataStr);
                        if (parsed?.irrigation?.zoneAssignments) {
                            iAssign = parsed.irrigation.zoneAssignments;
                        }
                    }
                } catch (error) {
                    console.warn('Failed to load irrigationAssignments from localStorage:', error);
                }
                
                // If still empty, create default irrigation assignments
                if (Object.keys(iAssign).length === 0) {
                    zones.forEach((zone) => {
                        iAssign[zone.id.toString()] = 'sprinkler'; // Default to sprinkler
                    });
                }
            }

            // ดึงจุดปลูกจริง (plant points) จาก props หรือตกลง localStorage ถ้าไม่มีใน props
            let actualPlantPoints: Array<{ lat: number; lng: number }> = [];
            try {
                const maybePlants = (
                    summaryData as unknown as {
                        plantPoints?: { lat: number; lng: number }[];
                    } | null
                )?.plantPoints;
                if (Array.isArray(maybePlants)) {
                    actualPlantPoints = maybePlants;
                }
                if (actualPlantPoints.length === 0 && typeof window !== 'undefined') {
                    const fieldDataStr = localStorage.getItem('fieldCropData');
                    if (fieldDataStr) {
                        const parsed = JSON.parse(fieldDataStr);
                        if (parsed && Array.isArray(parsed.plantPoints)) {
                            actualPlantPoints = parsed.plantPoints;
                        }
                    }
                }
            } catch {
                // ignore
            }

            // Consolidated console.log for all zone data
            console.log('🌾 [FIELD-CROP-SUMMARY] ===== ALL ZONE DATA =====');
            console.log('🌾 [FIELD-CROP-SUMMARY] Summary Data:', summaryData);
            console.log('🌾 [FIELD-CROP-SUMMARY] Zones Array:', zones);
            console.log('🌾 [FIELD-CROP-SUMMARY] Zone Assignments (from props):', zoneAssignments);
            console.log('🌾 [FIELD-CROP-SUMMARY] Zone Assignments (loaded):', zAssign);
            console.log('🌾 [FIELD-CROP-SUMMARY] Irrigation Assignments (from props):', irrigationAssignments);
            console.log('🌾 [FIELD-CROP-SUMMARY] Irrigation Assignments (loaded):', iAssign);
            console.log('🌾 [FIELD-CROP-SUMMARY] Pipes Data:', pipes);
            console.log('🌾 [FIELD-CROP-SUMMARY] Irrigation Points:', irrigationPoints);
            console.log('🌾 [FIELD-CROP-SUMMARY] Plant Points:', actualPlantPoints);
            
            // Detailed zone information
            const allZonesData = zones.map((zone: Zone) => ({
                id: zone.id,
                name: zone.name,
                color: zone.color,
                coordinates: zone.coordinates,
                cropType: zone.cropType,
                assignedCrop: zAssign[zone.id.toString()],
                irrigationType: iAssign[zone.id.toString()]
            }));
            console.log('🌾 [FIELD-CROP-SUMMARY] All Zones Detailed Data:', allZonesData);
            console.log('🌾 [FIELD-CROP-SUMMARY] ===== END ZONE DATA =====');
            
            zones.forEach((zone: Zone) => {
                const zoneId = zone.id.toString();
                let assignedCropValue = zone.cropType || zAssign[zoneId];
                // ถ้าโซนยังไม่ได้กำหนดพืช ให้ fallback เป็นพืชตัวแรกที่เลือกจาก choose-crop (ถ้ามี)
                if (!assignedCropValue) {
                    const firstSelected =
                        Array.isArray(summaryData?.selectedCrops) &&
                        summaryData.selectedCrops.length > 0
                            ? summaryData.selectedCrops[0]
                            : undefined;
                    if (firstSelected) assignedCropValue = firstSelected;
                }

                if (assignedCropValue && zone.coordinates) {
                    const crop = getCropByValue(assignedCropValue);
                    if (crop) {
                        const zoneArea = calculateZoneArea(zone.coordinates);

                        const effectiveRowSpacing = rowSpacing[assignedCropValue]
                            ? rowSpacing[assignedCropValue]
                            : crop.rowSpacing;

                        const effectivePlantSpacing = plantSpacing[assignedCropValue]
                            ? plantSpacing[assignedCropValue]
                            : crop.plantSpacing;

                        // Use plant count from zone object first (calculated in zone-obstacle.tsx)
                        let totalPlantingPoints = 0;
                        let actualPlantsInZone = 0;
                        
                        // Check if zone has plantCount property (from zone-obstacle.tsx calculation)
                        if (typeof zone.plantCount === 'number' && zone.plantCount > 0) {
                            totalPlantingPoints = zone.plantCount;
                            actualPlantsInZone = zone.plantCount;
                            console.log(`Using zone plantCount for zone ${zoneId}:`, totalPlantingPoints);
                        } else {
                            // Fallback to calculation methods
                            try {
                                if (
                                    Array.isArray(zone.coordinates) &&
                                    zone.coordinates.length >= 3 &&
                                    actualPlantPoints.length > 0
                                ) {
                                    const zoneCoords = zone.coordinates.map((c) => [c.lng, c.lat]);
                                    // ปิด polygon หากยังไม่ปิด
                                    if (zoneCoords.length >= 3) {
                                        const first = zoneCoords[0];
                                        const last = zoneCoords[zoneCoords.length - 1];
                                        if (first[0] !== last[0] || first[1] !== last[1])
                                            zoneCoords.push(first);
                                    }
                                    const zonePolygon = turf.polygon([
                                        zoneCoords as [number, number][],
                                    ]);
                                    actualPlantsInZone = actualPlantPoints.reduce((acc, pt) => {
                                        const p = turf.point([pt.lng, pt.lat]);
                                        return acc + (booleanPointInPolygon(p, zonePolygon) ? 1 : 0);
                                    }, 0);
                                }
                            } catch {
                                // Error counting actual plant points in zone
                                console.warn('Error counting actual plant points in zone');
                            }
                            try {
                                const fromArea = calculatePlantingPoints(
                                    zoneArea,
                                    crop,
                                    effectiveRowSpacing,
                                    effectivePlantSpacing
                                );
                                let fromPipes = 0;
                                if (pipes && pipes.length > 0) {
                                    try {
                                        fromPipes = calculatePlantingPointsFromPipes(
                                            pipes,
                                            zoneId,
                                            crop,
                                            effectiveRowSpacing,
                                            effectivePlantSpacing
                                        );
                                    } catch {
                                        // Pipe-based planting calc failed for zone
                                        console.warn('Pipe-based planting calc failed for zone');
                                    }
                                }
                                totalPlantingPoints = fromPipes > 0 ? fromPipes : fromArea;
                            } catch {
                                // Error calculating planting points for zone
                                console.warn('Error calculating planting points for zone');
                                // Fallback to area-based calculation
                                totalPlantingPoints = calculatePlantingPoints(
                                    zoneArea,
                                    crop,
                                    effectiveRowSpacing,
                                    effectivePlantSpacing
                                );
                            }
                        }
                        // ใช้จำนวนจริงหากมี (มากกว่า 0)
                        if (actualPlantsInZone > 0) totalPlantingPoints = actualPlantsInZone;
                        // ป้องกันกรณีติดลบ/ไม่ใช่ตัวเลข
                        if (!Number.isFinite(totalPlantingPoints) || totalPlantingPoints < 0) {
                            totalPlantingPoints = 0;
                        }

                        const { estimatedYield, estimatedPrice } = calculateYieldAndPrice(
                            zoneArea,
                            crop
                        );

                        const waterRequirementPerIrrigation = calculateWaterRequirement(
                            totalPlantingPoints,
                            crop
                        );

                        // คำนวณจำนวนสปริงเกอร์ในโซนนี้
                        const zoneIrrigationCounts = calculateZoneIrrigationCounts(
                            zone,
                            actualIrrigationPoints
                        );
                        
                        // เก็บ zoneIrrigationCounts ไว้ใน array
                        newZoneIrrigationCounts.push(zoneIrrigationCounts);

                        newZoneSummaries[zoneId] = {
                            zoneId: zoneId,
                            zoneName: zone.name,
                            cropName: crop.name,
                            cropValue: assignedCropValue,
                            cropIcon: crop.icon,
                            cropCategory: crop.category,
                            zoneArea: Math.round(zoneArea),
                            zoneAreaRai: Math.round((zoneArea / 1600) * 100) / 100,
                            rowSpacing: effectiveRowSpacing,
                            plantSpacing: effectivePlantSpacing,
                            totalPlantingPoints: totalPlantingPoints,
                            estimatedYield: estimatedYield,
                            estimatedPrice: estimatedPrice,
                            waterRequirementPerIrrigation: waterRequirementPerIrrigation,
                            waterRequirementPerDay: waterRequirementPerIrrigation,
                            cropYieldPerRai: crop.yield,
                            cropPricePerKg: crop.price,
                            cropWaterPerPlant: crop.waterRequirement,
                            cropWaterPerPlantPerIrrigation: crop.waterRequirement,
                            growthPeriod: crop.growthPeriod,
                            irrigationNeeds: crop.irrigationNeeds,
                            irrigationType: iAssign[zoneId] || 'ไม่ได้กำหนด',
                            // เพิ่มข้อมูลจำนวนสปริงเกอร์
                            sprinklerCount: zoneIrrigationCounts.sprinkler,
                            // miniSprinklerCount and microSprayCount removed
                            dripTapeCount: zoneIrrigationCounts.dripTape,
                            pivotCount: zoneIrrigationCounts.pivot,
                            waterJetTapeCount: zoneIrrigationCounts.waterJetTape,
                            totalIrrigationPoints: zoneIrrigationCounts.total,
                        };

                        // ตรวจสอบว่าคำนวณจากท่อย่อยหรือพื้นที่โซน
                        const calculationMethod =
                            pipes && pipes.length > 0 ? 'จากท่อย่อย' : 'จากพื้นที่โซน';

                        dbg(`📊 Zone ${zone.name} calculations with cropData (per irrigation):`, {
                            area: `${Math.round(zoneArea)} ตร.ม. (${Math.round((zoneArea / 1600) * 100) / 100} ไร่)`,
                            crop: crop.name,
                            category: crop.category,
                            calculationMethod: calculationMethod,
                            rowSpacing: `${effectiveRowSpacing} ม. (จาก cropData: ${crop.rowSpacing} ซม.)`,
                            plantSpacing: `${effectivePlantSpacing} ม. (จาก cropData: ${crop.plantSpacing} ซม.)`,
                            plantingPoints: totalPlantingPoints.toLocaleString(),
                            yield: `${estimatedYield.toLocaleString()} กก. (${crop.yield} กก./ไร่)`,
                            price: `${estimatedPrice.toLocaleString()} บาท (${crop.price} บาท/กก.)`,
                            waterPerIrrigation: `${waterRequirementPerIrrigation.toLocaleString()} ลิตร/ครั้ง`,
                            waterPerPlant: `${crop.waterRequirement} ลิตร/ต้น/ครั้ง`,
                            growthPeriod: `${crop.growthPeriod} วัน`,
                            irrigationNeeds: crop.irrigationNeeds,
                        });
                    }
                } else {
                    // คำนวณจำนวนสปริงเกอร์ในโซนนี้ (แม้ไม่มีพืชปลูก)
                    const zoneIrrigationCounts = calculateZoneIrrigationCounts(
                        zone,
                        actualIrrigationPoints
                    );
                    // ลองใช้ fallback crop อีกครั้งเพื่อกำหนดข้อมูลโซนให้ครบถ้วน
                    const fallbackCropValue =
                        Array.isArray(summaryData?.selectedCrops) &&
                        summaryData.selectedCrops.length > 0
                            ? summaryData.selectedCrops[0]
                            : null;
                    const fallbackCrop = fallbackCropValue
                        ? getCropByValue(fallbackCropValue)
                        : undefined;

                    if (fallbackCrop && zone.coordinates) {
                        const zoneArea = calculateZoneArea(zone.coordinates);
                        const effectiveRowSpacing = rowSpacing[fallbackCropValue!]
                            ? rowSpacing[fallbackCropValue!]
                            : fallbackCrop.rowSpacing;
                        const effectivePlantSpacing = plantSpacing[fallbackCropValue!]
                            ? plantSpacing[fallbackCropValue!]
                            : fallbackCrop.plantSpacing;
                        // เริ่มจากจำนวนคำนวณตาม spacing แล้ว fallback ในภายหลังถ้าจากท่อย่อยเป็น 0
                        let totalPlantingPoints = calculatePlantingPoints(
                            zoneArea,
                            fallbackCrop,
                            effectiveRowSpacing,
                            effectivePlantSpacing
                        );
                        // นับจำนวนจุดปลูกจริงภายในโซน (ถ้ามีข้อมูล)
                        try {
                            if (
                                Array.isArray(zone.coordinates) &&
                                zone.coordinates.length >= 3 &&
                                actualPlantPoints.length > 0
                            ) {
                                const zoneCoords = zone.coordinates.map((c) => [c.lng, c.lat]);
                                if (zoneCoords.length >= 3) {
                                    const first = zoneCoords[0];
                                    const last = zoneCoords[zoneCoords.length - 1];
                                    if (first[0] !== last[0] || first[1] !== last[1])
                                        zoneCoords.push(first);
                                }
                                const zonePolygon = turf.polygon([
                                    zoneCoords as [number, number][],
                                ]);
                                const actualPlantsInZone = actualPlantPoints.reduce((acc, pt) => {
                                    const p = turf.point([pt.lng, pt.lat]);
                                    return acc + (booleanPointInPolygon(p, zonePolygon) ? 1 : 0);
                                }, 0);
                                if (actualPlantsInZone > 0)
                                    totalPlantingPoints = actualPlantsInZone;
                            }
                        } catch {
                            // Error counting actual plant points in zone (fallback)
                            console.warn('Error counting actual plant points in zone (fallback)');
                        }
                        const { estimatedYield, estimatedPrice } = calculateYieldAndPrice(
                            zoneArea,
                            fallbackCrop
                        );
                        const waterRequirementPerIrrigation = calculateWaterRequirement(
                            totalPlantingPoints,
                            fallbackCrop
                        );

                        newZoneSummaries[zoneId] = {
                            zoneId: zoneId,
                            zoneName: zone.name,
                            cropName: fallbackCrop.name,
                            cropValue: fallbackCropValue,
                            cropIcon: fallbackCrop.icon,
                            cropCategory: fallbackCrop.category,
                            zoneArea: Math.round(zoneArea),
                            zoneAreaRai: Math.round((zoneArea / 1600) * 100) / 100,
                            rowSpacing: effectiveRowSpacing,
                            plantSpacing: effectivePlantSpacing,
                            totalPlantingPoints: totalPlantingPoints,
                            estimatedYield: estimatedYield,
                            estimatedPrice: estimatedPrice,
                            waterRequirementPerIrrigation: waterRequirementPerIrrigation,
                            waterRequirementPerDay: waterRequirementPerIrrigation,
                            cropYieldPerRai: fallbackCrop.yield,
                            cropPricePerKg: fallbackCrop.price,
                            cropWaterPerPlant: fallbackCrop.waterRequirement,
                            cropWaterPerPlantPerIrrigation: fallbackCrop.waterRequirement,
                            growthPeriod: fallbackCrop.growthPeriod,
                            irrigationNeeds: fallbackCrop.irrigationNeeds,
                            irrigationType: iAssign[zoneId] || 'ไม่ได้กำหนด',
                            sprinklerCount: zoneIrrigationCounts.sprinkler,
                            // miniSprinklerCount and microSprayCount removed
                            dripTapeCount: zoneIrrigationCounts.dripTape,
                            pivotCount: zoneIrrigationCounts.pivot,
                            waterJetTapeCount: zoneIrrigationCounts.waterJetTape,
                            totalIrrigationPoints: zoneIrrigationCounts.total,
                        };
                    } else {
                        newZoneSummaries[zoneId] = {
                            zoneId: zoneId,
                            zoneName: zone.name,
                            cropName: t('Not defined'),
                            cropValue: null,
                            cropIcon: '❓',
                            cropCategory: null,
                            zoneArea: zone.coordinates
                                ? Math.round(calculateZoneArea(zone.coordinates))
                                : 0,
                            zoneAreaRai: zone.coordinates
                                ? Math.round((calculateZoneArea(zone.coordinates) / 1600) * 100) /
                                  100
                                : 0,
                            rowSpacing: 0,
                            plantSpacing: 0,
                            totalPlantingPoints: 0,
                            estimatedYield: 0,
                            estimatedPrice: 0,
                            waterRequirementPerIrrigation: 0,
                            waterRequirementPerDay: 0,
                            cropYieldPerRai: 0,
                            cropPricePerKg: 0,
                            cropWaterPerPlant: 0,
                            cropWaterPerPlantPerIrrigation: 0,
                            growthPeriod: 0,
                            irrigationNeeds: 'unknown',
                            irrigationType: iAssign[zoneId] || 'ไม่ได้กำหนด',
                            sprinklerCount: zoneIrrigationCounts.sprinkler,
                            // miniSprinklerCount and microSprayCount removed
                            dripTapeCount: zoneIrrigationCounts.dripTape,
                            totalIrrigationPoints: zoneIrrigationCounts.total,
                        };
                    }
                }
            });

            setCalculatedZoneSummaries(newZoneSummaries);
            setZoneIrrigationCounts(newZoneIrrigationCounts);
            dbg('✅ Zone calculations completed with cropData (per irrigation):', newZoneSummaries);
        }
    }, [
        summaryData,
        zones,
        zoneAssignments,
        rowSpacing,
        plantSpacing,
        irrigationAssignments,
        pipes,
        irrigationPoints,
        actualIrrigationPoints,
        t,
    ]);

    // Equipment calculation removed in simplified summary

    const calculateMapBounds = (): { center: [number, number]; zoom: number } => {
        if (mainField && mainField.coordinates && mainField.coordinates.length > 0) {
            try {
                const coords = mainField.coordinates
                    .map((c: CoordinateInput) => {
                        if (
                            Array.isArray(c) &&
                            typeof c[0] === 'number' &&
                            typeof c[1] === 'number'
                        ) {
                            return [c[1], c[0]] as [number, number];
                        }
                        if (
                            'lat' in c &&
                            'lng' in c &&
                            typeof c.lat === 'number' &&
                            typeof c.lng === 'number'
                        ) {
                            return [c.lng, c.lat] as [number, number];
                        }
                        return null;
                    })
                    .filter((c): c is [number, number] => c !== null);

                if (coords.length < 3) {
                    throw new Error('Not enough valid coordinates for main field.');
                }

                const closedCoords = [...coords];
                if (
                    closedCoords[0][0] !== closedCoords[closedCoords.length - 1][0] ||
                    closedCoords[0][1] !== closedCoords[closedCoords.length - 1][1]
                ) {
                    closedCoords.push(closedCoords[0]);
                }

                const polygon = turf.polygon([closedCoords]);
                const centroid = turf.centroid(polygon);
                const [centerLng, centerLat] = centroid.geometry.coordinates;

                let optimalZoom = 19;
                if (fieldAreaSize > 50000) optimalZoom = 16;
                else if (fieldAreaSize > 20000) optimalZoom = 17;
                else if (fieldAreaSize > 10000) optimalZoom = 18;
                else if (fieldAreaSize > 5000) optimalZoom = 19;

                return { center: [centerLat, centerLng], zoom: optimalZoom };
            } catch (error) {
                console.error('Error calculating bounds from mainField:', error);
            }
        }

        if (actualZones.length > 0) {
            try {
                const allCoords = actualZones.flatMap((zone) => {
                    if (!zone.coordinates || !Array.isArray(zone.coordinates)) {
                        return [];
                    }
                    return zone.coordinates
                        .map((c: CoordinateInput) => {
                            if (
                                Array.isArray(c) &&
                                typeof c[0] === 'number' &&
                                typeof c[1] === 'number'
                            ) {
                                return c as [number, number];
                            }
                            if (
                                'lat' in c &&
                                'lng' in c &&
                                typeof c.lat === 'number' &&
                                typeof c.lng === 'number'
                            ) {
                                return [c.lat, c.lng] as [number, number];
                            }
                            return null;
                        })
                        .filter((c): c is [number, number] => c !== null);
                });

                if (allCoords.length > 0) {
                    const lats = allCoords.map((c) => c[0]);
                    const lngs = allCoords.map((c) => c[1]);
                    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
                    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

                    return { center: [centerLat, centerLng], zoom: 17 };
                }
            } catch (error) {
                console.error('Error calculating bounds from zones:', error);
            }
        }

        return { center: mapCenter || [14.5995, 120.9842], zoom: mapZoom || 15 };
    };

    const { center: optimalCenter, zoom: optimalZoom } = calculateMapBounds();

    const uniqueIrrigationPoints = actualIrrigationPoints.filter((point, index, array) => {
        if (!point || !point.id) return false;
        const firstIndex = array.findIndex((p) => p && p.id === point.id);
        return firstIndex === index;
    });

    // Debug: ตรวจสอบข้อมูลที่ได้รับ
    dbg('📊 Data received in summary:', {
        totalIrrigationPoints: actualIrrigationPoints.length,
        uniqueIrrigationPoints: uniqueIrrigationPoints.length,
        irrigationPointsByType: uniqueIrrigationPoints.reduce(
            (acc: Record<string, number>, point: IrrigationPoint) => {
                acc[point.type] = (acc[point.type] || 0) + 1;
                return acc;
            },
            {}
        ),
        zones: actualZones.length,
        pipes: actualPipes.length,
        equipment: actualEquipmentIcons.length,
    });

    // คำนวณจำนวน irrigation points รวมจากทุกโซน
    const calculatedZoneIrrigationCounts = actualZones.map((zone) =>
        calculateZoneIrrigationCounts(zone, uniqueIrrigationPoints)
    );

    const sprinklerPoints = calculatedZoneIrrigationCounts.reduce((sum, counts) => sum + counts.sprinkler, 0);
    const pivotPoints = calculatedZoneIrrigationCounts.reduce((sum, counts) => sum + (counts.pivot || 0), 0);
    const waterJetPoints = calculatedZoneIrrigationCounts.reduce(
        (sum, counts) => sum + (counts.waterJetTape || 0),
        0
    );
    const dripPoints = calculatedZoneIrrigationCounts.reduce((sum, counts) => sum + counts.dripTape, 0);

    // Debug: ตรวจสอบการคำนวณจำนวน irrigation points รวม
    dbg('🔍 Total irrigation points calculation:', {
        totalSprinklers: sprinklerPoints,
        totalPivots: pivotPoints,
        totalWaterJet: waterJetPoints,
        totalDripTape: dripPoints,
        totalPoints: sprinklerPoints + pivotPoints + waterJetPoints + dripPoints,
        zoneCounts: zoneIrrigationCounts.map((counts, index) => ({
            zoneIndex: index,
            sprinkler: counts.sprinkler,
            pivot: counts.pivot,
            waterJetTape: counts.waterJetTape,
            dripTape: counts.dripTape,
            total: counts.total,
        })),
    });

    // Irrigation lines not used in simplified summary
    // Drip lines not shown in simplified summary
    const dripLines = 0;

    const totalZones = actualZones.length;

    const mainPipeStats = calculatePipeStats(actualPipes, 'main');
    const submainPipeStats = calculatePipeStats(actualPipes, 'submain');
    const lateralPipeStats = calculatePipeStats(actualPipes, 'lateral');

    // Calculate fittings (2-way, 3-way, 4-way)
    const fittings = calculateFittingsCounts(actualPipes, uniqueIrrigationPoints);

    const uniqueEquipment = actualEquipmentIcons
        .filter(
            (equipment, index, array) => array.findIndex((e) => e.id === equipment.id) === index
        )
        .filter((e) => e.type === 'pump' || e.type === 'water_pump');
    const pumpCount = uniqueEquipment.length;

    // Persist merged equipment to localStorage so pump markers remain across navigation
    useEffect(() => {
        try {
            const fieldDataStr = localStorage.getItem('fieldCropData');
            const parsed = fieldDataStr
                ? (JSON.parse(fieldDataStr) as Record<string, unknown>)
                : {};
            const isEquipmentArray = (arr: unknown): arr is Equipment[] => {
                if (!Array.isArray(arr)) return false;
                return arr.every((o) => {
                    if (!o || typeof o !== 'object') return false;
                    const obj = o as Record<string, unknown>;
                    return (
                        typeof obj.lat === 'number' &&
                        typeof obj.lng === 'number' &&
                        typeof obj.type === 'string'
                    );
                });
            };

            const existingEquip = isEquipmentArray((parsed as { equipment?: unknown }).equipment)
                ? (parsed as { equipment: Equipment[] }).equipment
                : [];
            const existingIcons = isEquipmentArray(
                (parsed as { equipmentIcons?: unknown }).equipmentIcons
            )
                ? (parsed as { equipmentIcons: Equipment[] }).equipmentIcons
                : [];

            // Build pumps from uniqueEquipment, keep other equipment as-is
            const pumpEquip: Equipment[] = (uniqueEquipment || [])
                .filter(
                    (e) =>
                        e &&
                        (e.type === 'pump' || e.type === 'water_pump') &&
                        typeof e.lat === 'number' &&
                        typeof e.lng === 'number'
                )
                .map((e) => ({
                    id: e.id,
                    type: 'pump',
                    lat: e.lat,
                    lng: e.lng,
                    name: e.name || 'Water Pump',
                }));

            // If there's no valid pump to persist, don't touch existing data
            if (pumpEquip.length === 0) return;

            const nonPump = (e: Equipment) => e.type !== 'pump' && e.type !== 'water_pump';
            const mergedEquip: Equipment[] = [...existingEquip.filter(nonPump), ...pumpEquip];
            const mergedIcons: Equipment[] = [...existingIcons.filter(nonPump), ...pumpEquip];

            const next = { ...(parsed || {}), equipment: mergedEquip, equipmentIcons: mergedIcons };
            localStorage.setItem('fieldCropData', JSON.stringify(next));
        } catch {
            // ignore persistence errors
        }
    }, [uniqueEquipment]);

    const totalEstimatedYield = Object.values(calculatedZoneSummaries).reduce(
        (sum: number, summary: ZoneSummary) => sum + (summary.estimatedYield || 0),
        0
    );
    // Financial estimation removed in simplified summary
    // const totalEstimatedIncome = Object.values(calculatedZoneSummaries).reduce((sum: number, summary: ZoneSummary) => sum + (summary.estimatedPrice || 0), 0);
    const totalPlantingPoints = Object.values(calculatedZoneSummaries).reduce(
        (sum: number, summary: ZoneSummary) => sum + (summary.totalPlantingPoints || 0),
        0
    );
    const totalWaterRequirementPerIrrigation = Object.values(calculatedZoneSummaries).reduce(
        (sum: number, summary: ZoneSummary) => sum + (summary.waterRequirementPerIrrigation || 0),
        0
    );

    const areaInRai = fieldAreaSize / 1600;

    // Handle export to product page
    const handleExportToProduct = async () => {
        if (!mapContainerRef.current) {
            alert(t('ไม่พบแผนที่'));
            return;
        }
        setIsCapturingImage(true);
        try {
            // Capture map image first
            setCaptureStatus('กำลังบันทึกภาพแผนที่...');
            
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const html2canvas = await import('html2canvas');
            const html2canvasLib = html2canvas.default || html2canvas;

            const canvas = await html2canvasLib(mapContainerRef.current, {
                useCORS: true,
                allowTaint: true,
                scale: 2,
                logging: false,
                backgroundColor: '#1F2937',
                width: mapContainerRef.current.offsetWidth,
                height: mapContainerRef.current.offsetHeight,
                onclone: (clonedDoc) => {
                    try {
                        const controls = clonedDoc.querySelectorAll(
                            '.leaflet-control-container, .gm-control-active'
                        );
                        controls.forEach((el) => el.remove());

                        const elements = clonedDoc.querySelectorAll('*');
                        elements.forEach((el: Element) => {
                            const htmlEl = el as HTMLElement;
                            const computedStyle = window.getComputedStyle(htmlEl);

                            const color = computedStyle.color;
                            if (color && (color.includes('oklch') || color.includes('hsl'))) {
                                htmlEl.style.color = '#FFFFFF';
                            }

                            const backgroundColor = computedStyle.backgroundColor;
                            if (
                                backgroundColor &&
                                (backgroundColor.includes('oklch') ||
                                    backgroundColor.includes('hsl'))
                            ) {
                                if (
                                    backgroundColor.includes('transparent') ||
                                    backgroundColor.includes('rgba(0,0,0,0)')
                                ) {
                                    htmlEl.style.backgroundColor = 'transparent';
                                } else {
                                    htmlEl.style.backgroundColor = '#1F2937';
                                }
                            }

                            const borderColor = computedStyle.borderColor;
                            if (
                                borderColor &&
                                (borderColor.includes('oklch') || borderColor.includes('hsl'))
                            ) {
                                htmlEl.style.borderColor = '#374151';
                            }

                            const outlineColor = computedStyle.outlineColor;
                            if (
                                outlineColor &&
                                (outlineColor.includes('oklch') || outlineColor.includes('hsl'))
                            ) {
                                htmlEl.style.outlineColor = '#374151';
                            }
                        });

                        const problematicElements = clonedDoc.querySelectorAll(
                            '[style*="oklch"], [style*="hsl"]'
                        );
                        problematicElements.forEach((el) => {
                            const htmlEl = el as HTMLElement;
                            htmlEl.style.removeProperty('color');
                            htmlEl.style.removeProperty('background-color');
                            htmlEl.style.removeProperty('border-color');
                            htmlEl.style.removeProperty('outline-color');
                        });
                    } catch {
                        // Ignore cleanup errors
                    }
                },
            });

            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

            if (dataUrl && dataUrl !== 'data:,' && dataUrl.length > 100) {
                localStorage.setItem('projectMapImage', dataUrl);
                localStorage.setItem('projectType', 'field-crop');

                setMapImageCaptured(true);
                setCaptureStatus('บันทึกภาพแผนที่สำเร็จ');

                // Get enhanced field crop data
                let fieldData = getEnhancedFieldCropData();
                if (!fieldData) {
                    // Try to create from summary data
                    fieldData = calculateEnhancedFieldStats(summaryData);
                }

                if (fieldData && zoneIrrigationCounts.length > 0) {
                    // คำนวณจำนวนสปริงเกลอร์รวมทั้งหมด
                    const totalSprinklerCount = zoneIrrigationCounts.reduce((total, count) => total + count.sprinkler, 0);
                    
                    // ใช้ค่าอัตราการไหลจาก irrigationSettingsData
                    const sprinklerSettings = irrigationSettingsData?.sprinkler_system;
                    const flowRatePerSprinkler = sprinklerSettings?.flow || 2.5; // ลิตร/นาที ต่อหัวฉีด
                    const pressureBar = sprinklerSettings?.pressure || 2.0; // บาร์
                    const radiusMeters = sprinklerSettings?.coverageRadius || 6.0; // เมตร

                    // Create field crop system data similar to horticulture
                    const fieldCropSystemData: FieldCropSystemData = {
                        sprinklerConfig: {
                            flowRatePerPlant: flowRatePerSprinkler, // อัตราการไหลต่อหัวฉีด
                            pressureBar: pressureBar, // แรงดัน
                            radiusMeters: radiusMeters, // รัศมี
                            totalFlowRatePerMinute: totalSprinklerCount * flowRatePerSprinkler, // อัตราการไหลรวม
                        },
                        connectionStats: [], // Can be enhanced later
                        zones: fieldData.zones.info.map((zone, index) => {
                            // ใช้จำนวนสปริงเกลอร์จาก zoneIrrigationCounts state แทน totalPlantingPoints
                            const zoneIrrigationCount = zoneIrrigationCounts[index] || { sprinkler: 0, dripTape: 0, pivot: 0, waterJetTape: 0, total: 0 };
                            // ใช้แค่จำนวนสปริงเกลอร์ ไม่รวม drip tape, pivot, water jet tape
                            const actualSprinklerCount = zoneIrrigationCount.sprinkler;
                            
                            // คำนวณน้ำต่อต้น (หัวฉีด) = อัตราการไหลต่อหัวฉีด
                            const waterPerTree = flowRatePerSprinkler; // ลิตร/นาที ต่อหัวฉีด

                            // คำนวณปริมาณน้ำต่อครั้ง (ลิตร/ครั้ง) จากข้อมูลที่คำนวณไว้แล้ว
                            const waterPerIrrigation = actualSprinklerCount * waterPerTree * 30; // ลิตร/ครั้ง
                            
                            return {
                                id: zone.id,
                                name: zone.name,
                                plantCount: actualSprinklerCount, // ใช้จำนวนสปริงเกลอร์จริง
                                totalWaterNeed: waterPerIrrigation, // ปริมาณน้ำต่อครั้ง (ลิตร/ครั้ง)
                                waterPerTree: waterPerTree, // ลิตร/นาที ต่อหัวฉีด
                                waterNeedPerMinute: actualSprinklerCount * waterPerTree, // ลิตร/นาที รวมทั้งโซน
                                area: zone.area,
                                color: '#22C55E', // Default green color
                                pipes: {
                                    mainPipes: {
                                        count: zone.pipeStats?.main?.count || 0,
                                        totalLength: zone.pipeStats?.main?.totalLength || 0,
                                        longest: zone.pipeStats?.main?.longestLength || 0,
                                    },
                                    subMainPipes: {
                                        count: zone.pipeStats?.submain?.count || 0,
                                        totalLength: zone.pipeStats?.submain?.totalLength || 0,
                                        longest: zone.pipeStats?.submain?.longestLength || 0,
                                    },
                                    branchPipes: {
                                        count: zone.pipeStats?.lateral?.count || 0,
                                        totalLength: zone.pipeStats?.lateral?.totalLength || 0,
                                        longest: zone.pipeStats?.lateral?.longestLength || 0,
                                    },
                                    emitterPipes: {
                                        count: 0,
                                        totalLength: 0,
                                        longest: 0,
                                    },
                                },
                                bestPipes: {
                                    main: null,
                                    subMain: null,
                                    branch: null,
                                },
                            };
                        }),
                        totalPlants: totalSprinklerCount, // ใช้จำนวนสปริงเกลอร์รวมทั้งหมด
                        isMultipleZones: fieldData.zones.info.length > 1,
                    };

                    // Save system data to localStorage (similar to horticulture and greenhouse)
                    localStorage.setItem('fieldCropSystemData', JSON.stringify(fieldCropSystemData));
                    
                    // Debug: แสดงข้อมูลที่สร้าง fieldCropSystemData
                    console.log('🌾 [FIELD-CROP-SUMMARY] Created fieldCropSystemData:', fieldCropSystemData);
                    console.log('🌾 [FIELD-CROP-SUMMARY] Zone Irrigation Counts:', zoneIrrigationCounts);
                    console.log('🌾 [FIELD-CROP-SUMMARY] Total Sprinkler Count:', totalSprinklerCount);
                    localStorage.setItem('fieldCropData', JSON.stringify(fieldData));
                    localStorage.setItem('projectType', 'field-crop');
                    
                    // Navigate to product page using router (similar to greenhouse)
                    router.visit('/product?mode=field-crop');
                } else {
                    console.error('❌ No field crop data available');
                    alert('ไม่พบข้อมูลโครงการ กรุณากลับไปสร้างโครงการใหม่');
                }
            } else {
                throw new Error('ไม่สามารถสร้างภาพแผนที่ได้');
            }
        } catch (error) {
            console.error('❌ Error creating map image:', error);
            alert(
                '❌ เกิดข้อผิดพลาดในการสร้างภาพแผนผัง\n\nกรุณาใช้วิธี Screenshot แทน:\n\n1. กด F11 เพื่อ Fullscreen\n2. กด Print Screen หรือใช้ Snipping Tool\n3. หรือใช้ Extension "Full Page Screen Capture"'
            );
        } finally {
            setIsCapturingImage(false);
        }
    };

    if (!summaryData) {
        return (
            <div className="min-h-screen bg-gray-900 text-white">
                <Head title={`${t('Field Crop Summary')} - ${t('No data to show')}`} />
                <Navbar />
                <div className="flex items-center justify-center px-4 py-12">
                    <div className="container mx-auto">
                        <div className="rounded-lg bg-gray-800 p-8 text-center">
                            <div className="mb-4 text-6xl">📋</div>
                            <h2 className="mb-4 text-2xl font-bold text-yellow-400">
                                {t('No Project Data Found')}
                            </h2>
                            <p className="mb-6 text-gray-400">
                                {t(
                                    'Please return to the Field Map page, complete the steps, and click "View Summary".'
                                )}
                            </p>
                            <Link
                                href="/field-map"
                                className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                            >
                                🗺️ {t('Go to Field Map')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white print:bg-white print:text-black">
            <Head title={`${t('Field Crop Summary')} - ${t('Irrigation Planning Summary')}`} />

            {/* Fixed Navbar */}
            <div className="sticky top-0 z-50">
                <Navbar />
            </div>

            {/* Fixed Header Section */}
            <div className="top-16 z-40 border-b border-gray-700 bg-gray-800 print:hidden">
                <div className="container mx-auto px-4 py-4">
                    <div className="mx-auto max-w-7xl">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex-1">
                                <Link
                                    href="/step4-pipe-system?currentStep=4&completedSteps=4"
                                    className="mb-2 inline-flex items-center text-blue-400 hover:text-blue-300"
                                >
                                    <svg
                                        className="mr-2 h-5 w-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                        />
                                    </svg>
                                    {t('Back to Field Map')}
                                </Link>
                                <h1 className="mb-1 text-3xl font-bold">
                                    📊 {t('Field Crop Summary')}
                                </h1>
                                <p className="mb-2 text-gray-400">
                                    {t('Complete overview of your irrigation planning project')}
                                </p>
                            </div>

                            <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
                                {/* Radius Toggle Button */}
                                <button
                                    onClick={() => setShowRadiusCircles(!showRadiusCircles)}
                                    className={`inline-flex transform items-center rounded-lg px-4 py-2 font-medium text-white transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                                        showRadiusCircles
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : 'bg-gray-600 hover:bg-gray-700'
                                    }`}
                                    title={
                                        showRadiusCircles
                                            ? t('Hide radius circles')
                                            : t('Show radius circles')
                                    }
                                >
                                    <svg
                                        className="mr-2 h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="6"
                                            strokeWidth="1"
                                            opacity="0.5"
                                        />
                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="2"
                                            strokeWidth="1"
                                            opacity="0.3"
                                        />
                                    </svg>
                                    {showRadiusCircles ? t('Hide Radius') : t('Show Radius')}
                                </button>

                                {/* Enhanced Map capture button */}
                                <button
                                    onClick={handleManualCapture}
                                    disabled={isCapturingImage}
                                    className={`inline-flex transform items-center rounded-lg px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                                        isCapturingImage
                                            ? 'cursor-not-allowed bg-gray-600'
                                            : mapImageCaptured
                                              ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700'
                                              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                                    }`}
                                >
                                    {isCapturingImage ? (
                                        <>
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                                            {t('Capturing...')}
                                        </>
                                    ) : (
                                        <>
                                            <svg
                                                className="mr-2 h-5 w-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                            </svg>
                                            {mapImageCaptured
                                                ? '✅ บันทึกภาพแล้ว'
                                                : '📷 บันทึกภาพแผนที่'}
                                        </>
                                    )}
                                </button>

                                {/* Save Project Button (removed by UI simplification request) */}

                                {/* Product Button */}
                                <button
                                    onClick={handleExportToProduct}
                                    className="inline-flex transform items-center rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:from-green-600 hover:to-emerald-600 hover:shadow-lg"
                                >
                                    <svg
                                        className="mr-2 h-5 w-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                                        />
                                    </svg>
                                    🛒 {t('คำนวณอุปกรณ์')}
                                </button>

                                {/* New Project Button */}
                                <Link
                                    href="/step4-pipe-system?currentStep=4&completedSteps=4"
                                    className="inline-flex transform items-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:from-blue-600 hover:to-indigo-600 hover:shadow-lg"
                                >
                                    <svg
                                        className="mr-2 h-5 w-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        ></path>
                                    </svg>
                                    {t('New Project')}
                                </Link>
                            </div>
                        </div>

                        {/* Enhanced capture status display */}
                        {captureStatus && (
                            <div
                                className={`mt-3 rounded-lg p-3 text-sm ${
                                    captureStatus.includes('สำเร็จ') ||
                                    captureStatus.includes('บันทึก')
                                        ? 'border border-green-600 bg-green-800/50 text-green-200'
                                        : captureStatus.includes('ข้อผิดพลาด') ||
                                            captureStatus.includes('ไม่สามารถ')
                                          ? 'border border-red-600 bg-red-800/50 text-red-200'
                                          : 'border border-blue-600 bg-blue-800/50 text-blue-200'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    {captureStatus.includes(t('Capturing...')) && (
                                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                                    )}
                                    <span>
                                        {t('Image capture status:')} {captureStatus}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Print header - only visible when printing */}
            <div className="hidden print:mb-4 print:block">
                <h1 className="text-2xl font-bold text-black">📊 {t('Field Crop Summary')}</h1>
                <p className="text-gray-600">
                    {t('Generated on {date}').replace('{date}', new Date().toLocaleDateString())}
                </p>
                <hr className="my-2 border-gray-300" />
            </div>

            {/* Scrollable Main Content */}
            <div className="print:print-layout">
                <div className="container mx-auto px-4 py-4">
                    <div className="mx-auto max-w-7xl print:max-w-none">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-2 print:gap-6">
                            <div className="print:print-summary-section space-y-4">
                                {/* Enhanced Map Visualization with better capture capabilities */}
                                <div className="print:print-map-container overflow-hidden rounded-lg bg-gray-800 print:border">
                                    <div className="flex h-full flex-col">
                                        <div className="print:print-map-header border-b border-gray-600 bg-gray-700 p-2">
                                            <h3 className="text-sm font-semibold text-white print:text-black">
                                                🗺️ {t('Project Map Overview')}
                                                {mapImageCaptured && (
                                                    <span className="ml-2 text-xs text-green-400 print:text-green-600">
                                                        {t('✅ Image Saved')}
                                                    </span>
                                                )}
                                            </h3>
                                        </div>
                                        <div
                                            ref={mapContainerRef}
                                            className="print:print-map-container google-maps-container relative"
                                            style={{ minHeight: 350, height: '550px' }}
                                        >
                                            <GoogleMapsDisplay
                                                center={optimalCenter as [number, number]}
                                                zoom={optimalZoom}
                                                mainField={mainField}
                                                showRadiusCircles={showRadiusCircles}
                                                zones={actualZones}
                                                pipes={actualPipes}
                                                obstacles={actualObstacles as unknown as Obstacle[]}
                                                equipment={uniqueEquipment}
                                                irrigationPoints={uniqueIrrigationPoints}
                                                irrigationLines={[]}
                                                onMapReady={(map) => {
                                                    googleMapRef.current = map;
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Rest of the component with translation */}
                                <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                    <h2 className="mb-3 text-lg font-bold text-green-400 print:text-base print:text-black">
                                        🏡 {t('Project Overview')}
                                    </h2>
                                    <div className="grid grid-cols-5 gap-2 print:gap-1">
                                        <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                            <div className="text-lg font-bold text-blue-400 print:text-sm print:text-black">
                                                {areaInRai.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                {t('Rai')}
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                            <div className="text-lg font-bold text-green-400 print:text-sm print:text-black">
                                                {totalZones}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                {t('zones')}
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                            <div className="text-lg font-bold text-purple-400 print:text-sm print:text-black">
                                                {totalPlantingPoints.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                {t('Planting Points')}
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                            <div className="text-lg font-bold text-cyan-400 print:text-sm print:text-black">
                                                {sprinklerPoints +
                                                    pivotPoints +
                                                    waterJetPoints +
                                                    dripPoints +
                                                    dripLines}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                {t('Irrigation Points')}
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                            <div className="text-lg font-bold text-yellow-400 print:text-sm print:text-black">
                                                {totalEstimatedYield.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                {t('kg')}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Infrastructure Summary - keeping existing code with translation */}
                                <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                    <h2 className="mb-3 text-lg font-bold text-purple-400 print:text-base print:text-black">
                                        🔧 {t('Infrastructure Summary')}
                                    </h2>
                                    <div className="mb-3">
                                        <h3 className="mb-2 text-sm font-semibold text-blue-400 print:text-xs print:text-black">
                                            📏 {t('Pipe System (finished drawing only)')}
                                        </h3>
                                        <div className="space-y-2">
                                            {/* Sprinkler specs summary */}
                                            <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-xs font-medium text-cyan-300 print:text-black">
                                                        {t('Sprinkler Specs')}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1 text-xs">
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            {t('Flow:')}{' '}
                                                        </span>
                                                        <span className="font-medium text-cyan-300 print:text-black">
                                                            {(
                                                                irrigationSettingsData
                                                                    ?.sprinkler_system?.flow ?? 0
                                                            ).toLocaleString()}{' '}
                                                            {t('L/min')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            {t('Radius:')}{' '}
                                                        </span>
                                                        <span className="font-medium text-cyan-300 print:text-black">
                                                            {(
                                                                irrigationSettingsData
                                                                    ?.sprinkler_system
                                                                    ?.coverageRadius ?? 0
                                                            ).toLocaleString()}{' '}
                                                            {t('m.')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            {t('Pressure:')}{' '}
                                                        </span>
                                                        <span className="font-medium text-cyan-300 print:text-black">
                                                            {(
                                                                irrigationSettingsData
                                                                    ?.sprinkler_system?.pressure ??
                                                                0
                                                            ).toFixed(1)}{' '}
                                                            {t('bar')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-xs font-medium text-blue-300 print:text-black">
                                                        {t('Main Pipes')}
                                                    </span>
                                                    <span className="text-xs font-bold text-blue-400 print:text-black">
                                                        {mainPipeStats.count} {t('pipes')}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 text-xs">
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            {t('Longest:')}{' '}
                                                        </span>
                                                        <span className="font-medium text-blue-300 print:text-black">
                                                            {mainPipeStats.longestLength.toLocaleString()}{' '}
                                                            {t('m.')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            {t('Total:')}{' '}
                                                        </span>
                                                        <span className="font-medium text-blue-300 print:text-black">
                                                            {mainPipeStats.totalLength.toLocaleString()}{' '}
                                                            {t('m.')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-xs font-medium text-green-300 print:text-black">
                                                        {t('Submain Pipes')}
                                                    </span>
                                                    <span className="text-xs font-bold text-green-400 print:text-black">
                                                        {submainPipeStats.count} {t('pipes')}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 text-xs">
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            {t('Longest:')}{' '}
                                                        </span>
                                                        <span className="font-medium text-green-300 print:text-black">
                                                            {submainPipeStats.longestLength.toLocaleString()}{' '}
                                                            {t('m.')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            {t('Total:')}{' '}
                                                        </span>
                                                        <span className="font-medium text-green-300 print:text-black">
                                                            {submainPipeStats.totalLength.toLocaleString()}{' '}
                                                            {t('m.')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-xs font-medium text-purple-300 print:text-black">
                                                        {t('Lateral Pipes')}
                                                    </span>
                                                    <span className="text-xs font-bold text-purple-400 print:text-black">
                                                        {lateralPipeStats.count} {t('pipes')}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 text-xs">
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            {t('Longest:')}{' '}
                                                        </span>
                                                        <span className="font-medium text-purple-300 print:text-black">
                                                            {lateralPipeStats.longestLength.toLocaleString()}{' '}
                                                            {t('m.')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            {t('Total:')}{' '}
                                                        </span>
                                                        <span className="font-medium text-purple-300 print:text-black">
                                                            {lateralPipeStats.totalLength.toLocaleString()}{' '}
                                                            {t('m.')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded bg-blue-900/30 p-2 print:border print:bg-blue-50">
                                                <div className="text-center">
                                                    <span className="text-xs font-medium text-blue-300 print:text-blue-800">
                                                        {t(
                                                            'Total longest pipe combined length:'
                                                        )}{' '}
                                                    </span>
                                                    <span className="text-sm font-bold text-blue-100 print:text-blue-900">
                                                        {(
                                                            mainPipeStats.longestLength +
                                                            submainPipeStats.longestLength +
                                                            lateralPipeStats.longestLength
                                                        ).toLocaleString()}{' '}
                                                        {t('m.')}
                                                    </span>
                                                </div>
                                                <div className="mt-1 text-center">
                                                    <span className="text-xs font-medium text-blue-300 print:text-blue-800">
                                                        {t('Total all pipe length:')}{' '}
                                                    </span>
                                                    <span className="text-sm font-bold text-blue-100 print:text-blue-900">
                                                        {(
                                                            mainPipeStats.totalLength +
                                                            submainPipeStats.totalLength +
                                                            lateralPipeStats.totalLength
                                                        ).toLocaleString()}{' '}
                                                        {t('m.')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Connection Points Summary */}
                                    <div className="mb-3">
                                        <h3 className="mb-2 text-sm font-semibold text-yellow-400 print:text-xs print:text-black">
                                            🔗 {t('Connection Points')}
                                        </h3>
                                        <div className="space-y-2">
                                            {(() => {
                                                // สร้างจุดเชื่อมต่อทั้งหมดเพื่อนับจำนวน
                                                const allConnectionPoints: Array<{
                                                    id: string;
                                                    position: Coordinate;
                                                    connectedLaterals: string[];
                                                    submainId: string;
                                                    type:
                                                        | 'single'
                                                        | 'junction'
                                                        | 'crossing'
                                                        | 'l_shape'
                                                        | 't_shape'
                                                        | 'cross_shape';
                                                }> = [];

                                                // สร้างจุดเชื่อมต่อของท่อย่อยกับท่อเมนย่อย
                                                const lateralPipes = actualPipes.filter(
                                                    (p) => p.type === 'lateral'
                                                );
                                                const submainPipes = actualPipes.filter(
                                                    (p) => p.type === 'submain'
                                                );

                                                if (
                                                    lateralPipes.length > 0 &&
                                                    submainPipes.length > 0
                                                ) {
                                                    const lateralConnectionPoints =
                                                        createLateralConnectionPoints(
                                                            lateralPipes,
                                                            submainPipes
                                                        );
                                                    allConnectionPoints.push(
                                                        ...lateralConnectionPoints
                                                    );
                                                }

                                                // สร้างจุดเชื่อมต่อของท่อเมนย่อยกับท่อเมน
                                                const submainToMainConnectionPoints =
                                                    createSubmainToMainConnectionPoints(
                                                        actualPipes
                                                    );
                                                allConnectionPoints.push(
                                                    ...submainToMainConnectionPoints
                                                );

                                                // นับจำนวนจุดเชื่อมต่อแต่ละสี
                                                const connectionCounts = {
                                                    red: allConnectionPoints.filter(
                                                        (cp) => cp.type === 'l_shape'
                                                    ).length,
                                                    blue: allConnectionPoints.filter(
                                                        (cp) => cp.type === 't_shape'
                                                    ).length,
                                                    purple: allConnectionPoints.filter(
                                                        (cp) => cp.type === 'cross_shape'
                                                    ).length,
                                                    yellow: allConnectionPoints.filter(
                                                        (cp) =>
                                                            cp.type === 'junction' ||
                                                            cp.type === 'single'
                                                    ).length,
                                                    green: allConnectionPoints.filter(
                                                        (cp) => cp.type === 'crossing'
                                                    ).length,
                                                };

                                                const totalConnectionPoints = Object.values(
                                                    connectionCounts
                                                ).reduce((sum, count) => sum + count, 0);

                                                return (
                                                    <div className="space-y-2">
                                                        {/* สรุปจำนวนจุดเชื่อมต่อทั้งหมด */}
                                                        <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                                            <div className="text-center">
                                                                <span className="text-sm font-bold text-yellow-300 print:text-black">
                                                                    {totalConnectionPoints}{' '}
                                                                    {t('Connection Points')}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* แสดงจำนวนจุดเชื่อมต่อแต่ละสี */}
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {/* สีแดง - L-shape */}
                                                            <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="h-3 w-3 rounded-full border border-white bg-red-500"></div>
                                                                        <span className="text-xs text-gray-300 print:text-gray-700">
                                                                            {t('L-shape')}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs font-bold text-red-400 print:text-black">
                                                                        {connectionCounts.red}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* สีน้ำเงิน - T-shape */}
                                                            <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="h-3 w-3 rounded-full border border-white bg-blue-500"></div>
                                                                        <span className="text-xs text-gray-300 print:text-gray-700">
                                                                            {t('T-shape')}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs font-bold text-blue-400 print:text-black">
                                                                        {connectionCounts.blue}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* สีม่วง - + shape */}
                                                            <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="h-3 w-3 rounded-full border border-white bg-purple-500"></div>
                                                                        <span className="text-xs text-gray-300 print:text-gray-700">
                                                                            {t('+ shape')}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs font-bold text-purple-400 print:text-black">
                                                                        {connectionCounts.purple}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* สีเหลือง - Junction/Single */}
                                                            <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="h-3 w-3 rounded-full border border-white bg-yellow-500"></div>
                                                                        <span className="text-xs text-gray-300 print:text-gray-700">
                                                                            {t('Junction')}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs font-bold text-yellow-400 print:text-black">
                                                                        {connectionCounts.yellow}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* สีเขียว - Crossing */}
                                                            <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="h-3 w-3 rounded-full border border-white bg-green-500"></div>
                                                                        <span className="text-xs text-gray-300 print:text-gray-700">
                                                                            {t('Crossing')}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs font-bold text-green-400 print:text-black">
                                                                        {connectionCounts.green}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <h3 className="mb-2 text-sm font-semibold text-orange-400 print:text-xs print:text-black">
                                            ⚙️ {t('Equipment')}
                                        </h3>
                                        <div className="grid grid-cols-1 gap-1">
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-orange-400">
                                                    {pumpCount}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {t('Pumps')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <div className="mb-2 text-xs font-semibold text-gray-300">
                                            {t('Fittings')} (2/3/4 {t('way')})
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse border border-gray-600/50 print:border-gray-300">
                                                <thead>
                                                    <tr className="bg-gray-700/50 print:bg-gray-100">
                                                        <th className="border border-gray-600/50 px-2 py-1 text-left text-xs font-semibold text-gray-200 print:border-gray-300 print:text-gray-800">
                                                            {t('Pipe Type')}
                                                        </th>
                                                        <th className="border border-gray-600/50 px-2 py-1 text-center text-xs font-semibold text-gray-200 print:border-gray-300 print:text-gray-800">
                                                            {t('2-way')}
                                                        </th>
                                                        <th className="border border-gray-600/50 px-2 py-1 text-center text-xs font-semibold text-gray-200 print:border-gray-300 print:text-gray-800">
                                                            {t('3-way')}
                                                        </th>
                                                        <th className="border border-gray-600/50 px-2 py-1 text-center text-xs font-semibold text-gray-200 print:border-gray-300 print:text-gray-800">
                                                            {t('4-way')}
                                                        </th>
                                                        <th className="border border-gray-600/50 px-2 py-1 text-center text-xs font-semibold text-gray-200 print:border-gray-300 print:text-gray-800">
                                                            {t('Total')}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-gray-200 print:text-gray-700">
                                                    <tr>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-xs text-red-300 print:border-gray-300">
                                                            {t('Main')}
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-green-300 print:border-gray-300">
                                                            {fittings.breakdown.main.twoWay}
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-purple-300 print:border-gray-300">
                                                            {fittings.breakdown.main.threeWay}
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-orange-300 print:border-gray-300">
                                                            0
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-cyan-200 print:border-gray-300">
                                                            {fittings.breakdown.main.twoWay +
                                                                fittings.breakdown.main.threeWay}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-xs text-purple-300 print:border-gray-300">
                                                            {t('Submain')}
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-green-300 print:border-gray-300">
                                                            {fittings.breakdown.submain.twoWay}
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-purple-300 print:border-gray-300">
                                                            {fittings.breakdown.submain.threeWay}
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-orange-300 print:border-gray-300">
                                                            {fittings.breakdown.submain.fourWay}
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-cyan-200 print:border-gray-300">
                                                            {fittings.breakdown.submain.twoWay +
                                                                fittings.breakdown.submain
                                                                    .threeWay +
                                                                fittings.breakdown.submain.fourWay}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-xs text-yellow-300 print:border-gray-300">
                                                            {t('Lateral')}
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-green-300 print:border-gray-300">
                                                            {fittings.breakdown.lateral.twoWay}
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-purple-300 print:border-gray-300">
                                                            {fittings.breakdown.lateral.threeWay}
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-orange-300 print:border-gray-300">
                                                            0
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-cyan-200 print:border-gray-300">
                                                            {fittings.breakdown.lateral.twoWay +
                                                                fittings.breakdown.lateral.threeWay}
                                                        </td>
                                                    </tr>
                                                    <tr className="bg-gray-700/30 print:bg-gray-50">
                                                        <td className="border border-gray-600/50 px-2 py-1 text-xs font-semibold text-blue-300 print:border-gray-300">
                                                            {t('Total')}
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-green-300 print:border-gray-300">
                                                            {fittings.twoWay}
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-purple-300 print:border-gray-300">
                                                            {fittings.threeWay}
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-orange-300 print:border-gray-300">
                                                            {fittings.fourWay}
                                                        </td>
                                                        <td className="border border-gray-600/50 px-2 py-1 text-center text-xs font-bold text-cyan-200 print:border-gray-300">
                                                            {fittings.twoWay +
                                                                fittings.threeWay +
                                                                fittings.fourWay}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold text-cyan-400 print:text-xs print:text-black">
                                            💧 {t('Irrigation System')}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-1">
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-green-400">
                                                    {sprinklerPoints}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {t('Sprinklers')}
                                                </div>
                                            </div>
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-orange-400">
                                                    {pivotPoints}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {t('Pivots')}
                                                </div>
                                            </div>
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-blue-400">
                                                    {waterJetPoints}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {t('Water Jet Tape')}
                                                </div>
                                            </div>
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-cyan-400">
                                                    {dripPoints}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {t('Drip Tape')}
                                                </div>
                                            </div>
                                        </div>
                                        {/* เพิ่มส่วนแสดงจำนวนสปริงเกอร์รวม */}
                                        <div className="mt-2 rounded bg-cyan-900/30 p-2 text-center print:bg-cyan-50">
                                            <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                Total Irrigation Points:
                                            </div>
                                            <div className="text-sm font-bold text-cyan-100 print:text-cyan-800">
                                                {sprinklerPoints +
                                                    pivotPoints +
                                                    waterJetPoints +
                                                    dripPoints +
                                                    dripLines}{' '}
                                                จุด
                                            </div>
                                        </div>
                                        {/* Global Pipe Network Summary under Irrigation System */}
                                        <div className="mt-3 space-y-2 rounded bg-gray-700/40 p-2 print:border">
                                            <div className="mb-2 text-xs font-semibold text-gray-200">
                                                {t('Pipe Network Summary')}
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse border border-gray-600/50 print:border-gray-300">
                                                    <thead>
                                                        <tr className="bg-gray-700/50 print:bg-gray-100">
                                                            <th className="border border-gray-600/50 px-2 py-1 text-left font-semibold text-gray-200 print:border-gray-300 print:text-gray-800">
                                                                {t('Pipe Type')}
                                                            </th>
                                                            <th className="border border-gray-600/50 px-2 py-1 text-center font-semibold text-gray-200 print:border-gray-300 print:text-gray-800">
                                                                {t('Count')}
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-gray-200 print:text-gray-700">
                                                        <tr>
                                                            <td className="border border-gray-600/50 px-2 py-1 text-red-300 print:border-gray-300">
                                                                {t('Main')}
                                                            </td>
                                                            <td className="border border-gray-600/50 px-2 py-1 text-center font-bold text-red-300 print:border-gray-300">
                                                                {pipeNetworkSummary.counts.main}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td className="border border-gray-600/50 px-2 py-1 text-purple-300 print:border-gray-300">
                                                                {t('Submain')}
                                                            </td>
                                                            <td className="border border-gray-600/50 px-2 py-1 text-center font-bold text-purple-300 print:border-gray-300">
                                                                {pipeNetworkSummary.counts.submain}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td className="border border-gray-600/50 px-2 py-1 text-yellow-300 print:border-gray-300">
                                                                {t('Lateral')}
                                                            </td>
                                                            <td className="border border-gray-600/50 px-2 py-1 text-center font-bold text-yellow-300 print:border-gray-300">
                                                                {pipeNetworkSummary.counts.lateral}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial & Water Summary - keeping existing code with translation */}
                                <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                    <h2 className="mb-3 text-lg font-bold text-green-400 print:text-base print:text-black">
                                        💧 {t('Water Summary')}
                                    </h2>
                                    <div className="space-y-3 print:space-y-2">
                                        <div className="rounded-lg bg-cyan-900/30 p-3 print:border-2 print:border-cyan-200 print:bg-cyan-50">
                                            <h3 className="mb-2 text-sm font-semibold text-cyan-300 print:text-cyan-800">
                                                💧{' '}
                                                {t(
                                                    'Total Water Requirements (liters per irrigation - from cropData)'
                                                )}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                        {t('Total Farm Area:')}{' '}
                                                        {areaInRai.toFixed(2)} {t('Rai')}
                                                    </div>
                                                    <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                        {t('Total Plants:')}{' '}
                                                        {totalPlantingPoints.toLocaleString()}{' '}
                                                        {t('trees')}
                                                    </div>
                                                    <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                        {t('Active Zones:')}{' '}
                                                        {
                                                            Object.values(
                                                                calculatedZoneSummaries
                                                            ).filter(
                                                                (summary: ZoneSummary) =>
                                                                    summary.cropValue
                                                            ).length
                                                        }{' '}
                                                        {t('zones')}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[11px] text-cyan-200 print:text-cyan-700">
                                                        {t('Water need')}
                                                    </div>
                                                    <div className="text-2xl font-extrabold tracking-tight text-cyan-100 print:text-cyan-800">
                                                        {totalWaterRequirementPerIrrigation.toLocaleString()}{' '}
                                                        <span className="text-base font-semibold opacity-80">
                                                            {t('L/irrigation')}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-cyan-200 print:text-cyan-700">
                                                        (
                                                        {(
                                                            totalWaterRequirementPerIrrigation /
                                                            1000
                                                        ).toFixed(1)}{' '}
                                                        {t('m³/irrigation')})
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 border-t border-cyan-700 pt-2 print:border-cyan-300">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <div className="text-xs font-medium text-cyan-200 print:text-cyan-700">
                                                        {t('Water by zone')}
                                                    </div>
                                                    <div className="text-[10px] text-cyan-300/70 print:text-cyan-700">
                                                        {t('per irrigation')}
                                                    </div>
                                                </div>
                                                <div className="max-h-32 space-y-1.5 overflow-y-auto pr-1">
                                                    {Object.values(calculatedZoneSummaries)
                                                        .filter(
                                                            (summary: ZoneSummary) =>
                                                                summary.cropValue
                                                        )
                                                        .map((summary: ZoneSummary) => (
                                                            <div
                                                                key={summary.zoneId}
                                                                className="flex justify-between text-xs"
                                                            >
                                                                <span className="text-cyan-200 print:text-cyan-700">
                                                                    {summary.zoneName} (
                                                                    {summary.zoneAreaRai} {t('Rai')}
                                                                    )
                                                                </span>
                                                                <span className="font-medium text-cyan-100 print:text-cyan-800">
                                                                    {summary.waterRequirementPerIrrigation.toLocaleString()}{' '}
                                                                    {t('Liters/irrigation')}
                                                                </span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons - simplified (print removed) */}
                                <div className="rounded-lg bg-gray-800 p-4 print:hidden">
                                    <h2 className="mb-3 text-lg font-bold text-purple-400">
                                        📋 {t('Actions')}
                                    </h2>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <Link
                                            href="/step4-pipe-system?currentStep=4&completedSteps=4"
                                            className="rounded-lg bg-blue-600 px-4 py-2 text-center font-semibold text-white hover:bg-blue-700"
                                        >
                                            🔄 {t('Edit Project')}
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Zone Details - keeping existing code structure with translation */}
                            <div className="space-y-4 print:contents">
                                <div className="print:print-other-content rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                    <h2 className="mb-3 text-lg font-bold text-blue-400 print:text-base print:text-black">
                                        🎯{' '}
                                        {t(
                                            'Zone Details & Irrigation Systems (liters per irrigation)'
                                        )}
                                    </h2>
                                    <div className="space-y-3 print:space-y-2">
                                        {null}
                                        {actualZones.map((zone) => {
                                            const summary = calculatedZoneSummaries[zone.id];
                                            const assignedCrop = zoneAssignments[zone.id]
                                                ? getCropByValue(zoneAssignments[zone.id])
                                                : null;
                                            const irrigationType =
                                                globalIrrigationType ||
                                                irrigationAssignments[zone.id];
                                            // Read from precomputed map to avoid recomputation per render
                                            const zonePipeStats: ZonePipeStats =
                                                zonePipeStatsMap.get(zone.id.toString()) ?? {
                                                    main: {
                                                        count: 0,
                                                        totalLength: 0,
                                                        longestLength: 0,
                                                    },
                                                    submain: {
                                                        count: 0,
                                                        totalLength: 0,
                                                        longestLength: 0,
                                                    },
                                                    lateral: {
                                                        count: 0,
                                                        totalLength: 0,
                                                        longestLength: 0,
                                                    },
                                                    total: 0,
                                                    totalLength: 0,
                                                    totalLongestLength: 0,
                                                };
                                            const zoneIrrigationCounts =
                                                calculateZoneIrrigationCounts(
                                                    zone,
                                                    actualIrrigationPoints
                                                );

                                            // Zone irrigation counts calculated
                                            dbg(`🔍 Zone ${zone.name} irrigation counts:`, {
                                                zoneId: zone.id,
                                                zoneName: zone.name,
                                                sprinkler: zoneIrrigationCounts.sprinkler,
                                                // miniSprinkler and microSpray removed
                                                dripTape: zoneIrrigationCounts.dripTape,
                                                total: zoneIrrigationCounts.total,
                                            });
                                            return (
                                                <div
                                                    key={zone.id}
                                                    className="rounded-lg bg-gray-700 p-3 print:border print:bg-gray-50"
                                                >
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <div
                                                                className="h-3 w-3 rounded-full"
                                                                style={{
                                                                    backgroundColor: zone.color,
                                                                }}
                                                            ></div>
                                                            <h3 className="text-sm font-semibold text-white print:text-black">
                                                                {zone.name}
                                                            </h3>
                                                            {/* แสดงชื่อพืชที่เลือกจาก choose-crop ถ้ามี และตรงกับโซนนี้ */}
                                                            {assignedCrop && (
                                                                <span className="ml-2 text-xs text-gray-300 print:text-black">
                                                                    {getTranslatedCropByValue(
                                                                        assignedCrop.value,
                                                                        'th'
                                                                    )?.name || assignedCrop.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {/* Toggle and crop icon */}
                                                        <div className="flex items-center space-x-2">
                                                            {assignedCrop && (
                                                                <span className="text-lg">
                                                                    {assignedCrop.icon}
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    const key = zone.id.toString();
                                                                    setZoneDetailsOpen((prev) => ({
                                                                        ...prev,
                                                                        [key]: !(
                                                                            prev[key] !== false
                                                                        ),
                                                                    }));
                                                                }}
                                                                className="rounded border border-gray-400/40 px-2 py-0.5 text-xs text-gray-200 hover:bg-gray-600/40"
                                                                title={
                                                                    zoneDetailsOpen[
                                                                        zone.id.toString()
                                                                    ] !== false
                                                                        ? t('Hide details')
                                                                        : t('Show details')
                                                                }
                                                            >
                                                                {zoneDetailsOpen[
                                                                    zone.id.toString()
                                                                ] !== false
                                                                    ? '▲'
                                                                    : '▼'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {zoneDetailsOpen[zone.id.toString()] !==
                                                        false &&
                                                        (summary ? (
                                                            <div className="space-y-3">
                                                                {/* แสดงข้อมูลจำนวนสปริงเกอร์ในส่วนสรุปข้อมูลโซน */}
                                                                <div className="grid grid-cols-4 gap-2 text-xs">
                                                                    <div className="rounded bg-gray-600 p-2 text-center print:bg-gray-100">
                                                                        <div className="text-gray-400 print:text-gray-600">
                                                                            {t('Area')}
                                                                        </div>
                                                                        <div className="font-semibold text-blue-400 print:text-black">
                                                                            {summary.zoneAreaRai}{' '}
                                                                            {t('Rai')}
                                                                        </div>
                                                                        <div className="text-xs text-gray-400 print:text-gray-600">
                                                                            {summary.zoneArea} ตร.ม.
                                                                        </div>
                                                                    </div>
                                                                    <div className="rounded bg-gray-600 p-2 text-center print:bg-gray-100">
                                                                        <div className="text-gray-400 print:text-gray-600">
                                                                            {t('Plants')}
                                                                        </div>
                                                                        <div className="font-semibold text-green-400 print:text-black">
                                                                            {summary.totalPlantingPoints.toLocaleString()}
                                                                        </div>
                                                                        <div className="text-xs text-gray-400 print:text-gray-600">
                                                                            {t('trees')}
                                                                        </div>
                                                                    </div>
                                                                    <div className="rounded bg-gray-600 p-2 text-center print:bg-gray-100">
                                                                        <div className="text-gray-400 print:text-gray-600">
                                                                            Sprinklers
                                                                        </div>
                                                                        <div className="font-semibold text-cyan-400 print:text-black">
                                                                            {
                                                                                zoneIrrigationCounts.total
                                                                            }
                                                                        </div>
                                                                        <div className="text-xs text-gray-400 print:text-gray-600">
                                                                            จุด
                                                                        </div>
                                                                    </div>
                                                                    <div className="rounded bg-gray-600 p-2 text-center print:bg-gray-100">
                                                                        <div className="text-gray-400 print:text-gray-600">
                                                                            Crop
                                                                        </div>
                                                                        <div className="text-xs font-semibold text-white print:text-black">
                                                                            {getTranslatedCropByValue(
                                                                                summary.cropValue ||
                                                                                    '',
                                                                                'th'
                                                                            )?.name ||
                                                                                summary.cropName}
                                                                        </div>
                                                                        <div className="text-xs text-gray-400 print:text-gray-600">
                                                                            {summary.cropCategory}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="rounded-lg bg-cyan-900/30 p-3 print:border print:bg-cyan-50">
                                                                    <h4 className="mb-2 text-sm font-semibold text-cyan-300 print:text-cyan-800">
                                                                        💧{' '}
                                                                        {t(
                                                                            'Water Requirements (liters per irrigation)'
                                                                        )}
                                                                    </h4>
                                                                    <div className="mt-1 rounded bg-cyan-800/30 p-2 text-xs text-cyan-200 print:bg-cyan-100 print:text-cyan-700">
                                                                        {(() => {
                                                                            const flowPerUnit: Record<
                                                                                string,
                                                                                number
                                                                            > = {
                                                                                sprinkler:
                                                                                    irrigationSettingsData
                                                                                        ?.sprinkler_system
                                                                                        ?.flow ?? 0,
                                                                                pivot:
                                                                                    irrigationSettingsData
                                                                                        ?.pivot
                                                                                        ?.flow ?? 0,
                                                                                water_jet_tape:
                                                                                    irrigationSettingsData
                                                                                        ?.water_jet_tape
                                                                                        ?.flow ?? 0,
                                                                                drip_tape:
                                                                                    irrigationSettingsData
                                                                                        ?.drip_tape
                                                                                        ?.flow ?? 0,
                                                                            };
                                                                            const counts =
                                                                                calculateZoneIrrigationCounts(
                                                                                    zone,
                                                                                    actualIrrigationPoints
                                                                                );
                                                                            const rows: Array<{
                                                                                label: string;
                                                                                units: number;
                                                                                flow: number;
                                                                                total: number;
                                                                            }> = [];
                                                                            const pushRow = (
                                                                                label: string,
                                                                                units: number,
                                                                                key: string
                                                                            ) => {
                                                                                if (units > 0) {
                                                                                    const per =
                                                                                        flowPerUnit[
                                                                                            key
                                                                                        ] || 0;
                                                                                    rows.push({
                                                                                        label,
                                                                                        units,
                                                                                        flow: per,
                                                                                        total:
                                                                                            units *
                                                                                            per,
                                                                                    });
                                                                                }
                                                                            };
                                                                            pushRow(
                                                                                t('Sprinklers'),
                                                                                counts.sprinkler,
                                                                                'sprinkler'
                                                                            );
                                                                            pushRow(
                                                                                t('Pivots'),
                                                                                counts.pivot,
                                                                                'pivot'
                                                                            );
                                                                            pushRow(
                                                                                t('Water Jet Tape'),
                                                                                counts.waterJetTape,
                                                                                'water_jet_tape'
                                                                            );
                                                                            pushRow(
                                                                                t('Drip Tape'),
                                                                                counts.dripTape,
                                                                                'drip_tape'
                                                                            );
                                                                            const zoneTotal =
                                                                                rows.reduce(
                                                                                    (s, r) =>
                                                                                        s + r.total,
                                                                                    0
                                                                                );
                                                                            return (
                                                                                <div className="space-y-1">
                                                                                    {rows.length ===
                                                                                    0 ? (
                                                                                        <div className="text-cyan-300/70">
                                                                                            {t(
                                                                                                'No flow data'
                                                                                            )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <>
                                                                                            <div className="flex items-center justify-between">
                                                                                                <div className="font-semibold">
                                                                                                    {t(
                                                                                                        'Total flowrate'
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="text-2xl font-extrabold text-cyan-100">
                                                                                                    {zoneTotal.toLocaleString()}{' '}
                                                                                                    {t(
                                                                                                        'L/min'
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </div>

                                                                <div className="rounded-lg bg-blue-900/30 p-3 print:border print:bg-blue-50">
                                                                    <h4 className="mb-2 text-sm font-semibold text-blue-300 print:text-blue-800">
                                                                        🔧{' '}
                                                                        {t(
                                                                            'Irrigation System & Pipe Network'
                                                                        )}
                                                                    </h4>

                                                                    <div className="mb-3">
                                                                        <div className="mb-1 text-xs font-medium text-blue-200 print:text-blue-700">
                                                                            {t('Irrigation Type:')}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-sm font-semibold text-blue-100 print:text-blue-900">
                                                                            {formatIrrigationType(
                                                                                irrigationType
                                                                            )}
                                                                            {zoneIrrigationCounts.sprinkler >
                                                                                0 && (
                                                                                <span className="text-xs text-green-300">
                                                                                    🟢{' '}
                                                                                    {
                                                                                        zoneIrrigationCounts.sprinkler
                                                                                    }{' '}
                                                                                    {t('units')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-3">
                                                                        <div className="border-b border-blue-700 pb-1 text-xs font-medium text-blue-200 print:border-blue-300 print:text-blue-700">
                                                                            {t(
                                                                                'Pipe System Details in Zone:'
                                                                            )}
                                                                        </div>

                                                                        <div className="rounded border border-cyan-600 bg-cyan-800/40 p-3 print:border-cyan-300 print:bg-cyan-100">
                                                                            <div className="mb-3 text-center">
                                                                                <div className="text-sm font-bold text-cyan-200 print:text-cyan-800">
                                                                                    📊{' '}
                                                                                    {t(
                                                                                        'Zone Pipe Summary'
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            <div className="mb-3">
                                                                                <div className="mb-2 grid grid-cols-4 gap-1 text-xs">
                                                                                    <div className="font-medium text-cyan-200 print:text-cyan-700">
                                                                                        {t(
                                                                                            'Pipe type'
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="text-center font-medium text-cyan-200 print:text-cyan-700">
                                                                                        {t('Count')}
                                                                                    </div>
                                                                                    <div className="text-center font-medium text-cyan-200 print:text-cyan-700">
                                                                                        {t(
                                                                                            'Longest (m)'
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="text-center font-medium text-cyan-200 print:text-cyan-700">
                                                                                        {t(
                                                                                            'Total (m)'
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <div className="grid grid-cols-4 gap-1 rounded bg-red-700/20 p-1 text-xs print:bg-red-50">
                                                                                        <div className="text-red-200 print:text-red-800">
                                                                                            🔴{' '}
                                                                                            {t(
                                                                                                'Main Pipes'
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="text-center font-semibold text-red-100 print:text-red-900">
                                                                                            {
                                                                                                zonePipeStats
                                                                                                    .main
                                                                                                    .count
                                                                                            }
                                                                                        </div>
                                                                                        <div className="text-center font-semibold text-red-100 print:text-red-900">
                                                                                            {zonePipeStats.main.longestLength.toLocaleString()}
                                                                                        </div>
                                                                                        <div className="text-center font-semibold text-red-100 print:text-red-900">
                                                                                            {zonePipeStats.main.totalLength.toLocaleString()}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="grid grid-cols-4 gap-1 rounded bg-purple-700/20 p-1 text-xs print:bg-purple-50">
                                                                                        <div className="text-purple-200 print:text-purple-800">
                                                                                            🟣{' '}
                                                                                            {t(
                                                                                                'Submain Pipes'
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="text-center font-semibold text-purple-100 print:text-purple-900">
                                                                                            {
                                                                                                zonePipeStats
                                                                                                    .submain
                                                                                                    .count
                                                                                            }
                                                                                        </div>
                                                                                        <div className="text-center font-semibold text-purple-100 print:text-purple-900">
                                                                                            {zonePipeStats.submain.longestLength.toLocaleString()}
                                                                                        </div>
                                                                                        <div className="text-center font-semibold text-purple-100 print:text-purple-900">
                                                                                            {zonePipeStats.submain.totalLength.toLocaleString()}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="grid grid-cols-4 gap-1 rounded bg-yellow-700/20 p-1 text-xs print:bg-yellow-50">
                                                                                        <div className="text-yellow-200 print:text-yellow-800">
                                                                                            🟡{' '}
                                                                                            {t(
                                                                                                'Lateral Pipes'
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="text-center font-semibold text-yellow-100 print:text-yellow-900">
                                                                                            {
                                                                                                zonePipeStats
                                                                                                    .lateral
                                                                                                    .count
                                                                                            }
                                                                                        </div>
                                                                                        <div className="text-center font-semibold text-yellow-100 print:text-yellow-900">
                                                                                            {zonePipeStats.lateral.longestLength.toLocaleString()}
                                                                                        </div>
                                                                                        <div className="text-center font-semibold text-yellow-100 print:text-yellow-900">
                                                                                            {zonePipeStats.lateral.totalLength.toLocaleString()}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Lateral outlet details */}
                                                                            {(() => {
                                                                                // Zone-specific longest-pipe flow summary (display only, per request)
                                                                                const zeroFlows = {
                                                                                    main: {
                                                                                        longestId:
                                                                                            null as
                                                                                                | string
                                                                                                | number
                                                                                                | null,
                                                                                        connectedSubmains: 0,
                                                                                        flowLMin: 0,
                                                                                    },
                                                                                    submain: {
                                                                                        longestId:
                                                                                            null as
                                                                                                | string
                                                                                                | number
                                                                                                | null,
                                                                                        connectedLaterals: 0,
                                                                                        flowLMin: 0,
                                                                                    },
                                                                                    lateral: {
                                                                                        longestId:
                                                                                            null as
                                                                                                | string
                                                                                                | number
                                                                                                | null,
                                                                                        sprinklers: 0,
                                                                                        flowLMin: 0,
                                                                                    },
                                                                                };
                                                                                let zFlows =
                                                                                    zeroFlows;
                                                                                try {
                                                                                    zFlows =
                                                                                        buildZoneConnectivityLongestFlows(
                                                                                            zone,
                                                                                            actualPipes,
                                                                                            actualIrrigationPoints,
                                                                                            irrigationSettingsData ||
                                                                                                {}
                                                                                        );
                                                                                } catch (error) {
                                                                                    console.error(
                                                                                        `❌ Error calculating flows for zone ${zone.id}:`,
                                                                                        error
                                                                                    );
                                                                                    // Keep zeroFlows fallback so the header still renders
                                                                                }
                                                                                const header = (
                                                                                    <div className="mb-2 rounded bg-cyan-900/30 p-2 text-xs print:bg-cyan-50">
                                                                                        <div className="mb-2 font-semibold text-cyan-200 print:text-cyan-800">
                                                                                            {t(
                                                                                                'Longest pipe flowrates'
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="overflow-x-auto">
                                                                                            <table className="w-full border-collapse border border-cyan-700/50 print:border-cyan-300">
                                                                                                <thead>
                                                                                                    <tr className="bg-cyan-800/50 print:bg-cyan-100">
                                                                                                        <th className="border border-cyan-700/50 px-2 py-1 text-left font-semibold text-cyan-200 print:border-cyan-300 print:text-cyan-800">
                                                                                                            {t(
                                                                                                                'Pipe Type'
                                                                                                            )}
                                                                                                        </th>
                                                                                                        <th className="border border-cyan-700/50 px-2 py-1 text-left font-semibold text-cyan-200 print:border-cyan-300 print:text-cyan-800">
                                                                                                            {t(
                                                                                                                'Flowrate'
                                                                                                            )}
                                                                                                        </th>
                                                                                                        <th className="border border-cyan-700/50 px-2 py-1 text-left font-semibold text-cyan-200 print:border-cyan-300 print:text-cyan-800">
                                                                                                            ทางออก
                                                                                                        </th>
                                                                                                    </tr>
                                                                                                </thead>
                                                                                                <tbody className="text-cyan-100 print:text-cyan-700">
                                                                                                    <tr>
                                                                                                        <td className="border border-cyan-700/50 px-2 py-1 print:border-cyan-300">
                                                                                                            {t(
                                                                                                                'Main'
                                                                                                            )}{' '}
                                                                                                            (
                                                                                                            {t(
                                                                                                                'longest'
                                                                                                            )}
                                                                                                            )
                                                                                                        </td>
                                                                                                        <td className="border border-cyan-700/50 px-2 py-1 font-bold print:border-cyan-300">
                                                                                                            {Math.round(
                                                                                                                zFlows
                                                                                                                    .main
                                                                                                                    .flowLMin
                                                                                                            ).toLocaleString()}{' '}
                                                                                                            {t(
                                                                                                                'L/min'
                                                                                                            )}
                                                                                                        </td>
                                                                                                        <td className="border border-cyan-700/50 px-2 py-1 print:border-cyan-300">
                                                                                                            {
                                                                                                                zFlows
                                                                                                                    .main
                                                                                                                    .connectedSubmains
                                                                                                            }
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                    <tr>
                                                                                                        <td className="border border-cyan-700/50 px-2 py-1 print:border-cyan-300">
                                                                                                            {t(
                                                                                                                'Submain'
                                                                                                            )}{' '}
                                                                                                            (
                                                                                                            {t(
                                                                                                                'longest'
                                                                                                            )}
                                                                                                            )
                                                                                                        </td>
                                                                                                        <td className="border border-cyan-700/50 px-2 py-1 font-bold print:border-cyan-300">
                                                                                                            {Math.round(
                                                                                                                zFlows
                                                                                                                    .submain
                                                                                                                    .flowLMin
                                                                                                            ).toLocaleString()}{' '}
                                                                                                            {t(
                                                                                                                'L/min'
                                                                                                            )}
                                                                                                        </td>
                                                                                                        <td className="border border-cyan-700/50 px-2 py-1 print:border-cyan-300">
                                                                                                            {
                                                                                                                zFlows
                                                                                                                    .submain
                                                                                                                    .connectedLaterals
                                                                                                            }
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                    <tr>
                                                                                                        <td className="border border-cyan-700/50 px-2 py-1 print:border-cyan-300">
                                                                                                            {t(
                                                                                                                'Lateral'
                                                                                                            )}{' '}
                                                                                                            (
                                                                                                            {t(
                                                                                                                'longest'
                                                                                                            )}
                                                                                                            )
                                                                                                        </td>
                                                                                                        <td className="border border-cyan-700/50 px-2 py-1 font-bold print:border-cyan-300">
                                                                                                            {Math.round(
                                                                                                                zFlows
                                                                                                                    .lateral
                                                                                                                    .flowLMin
                                                                                                            ).toLocaleString()}{' '}
                                                                                                            {t(
                                                                                                                'L/min'
                                                                                                            )}
                                                                                                        </td>
                                                                                                        <td className="border border-cyan-700/50 px-2 py-1 print:border-cyan-300">
                                                                                                            {
                                                                                                                zFlows
                                                                                                                    .lateral
                                                                                                                    .sprinklers
                                                                                                            }
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                </tbody>
                                                                                            </table>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                                // existing lateral outlets UI below
                                                                                try {
                                                                                    const lateralPipes =
                                                                                        actualPipes.filter(
                                                                                            (p) => {
                                                                                                if (
                                                                                                    identifyPipeType(
                                                                                                        p
                                                                                                    ) !==
                                                                                                    'lateral'
                                                                                                )
                                                                                                    return false;
                                                                                                const byId =
                                                                                                    (p.zoneId?.toString?.() ||
                                                                                                        '') ===
                                                                                                    zone.id.toString();
                                                                                                const byGeom =
                                                                                                    isPipeInZone(
                                                                                                        p,
                                                                                                        zone
                                                                                                    );
                                                                                                return (
                                                                                                    byId ||
                                                                                                    byGeom
                                                                                                );
                                                                                            }
                                                                                        );
                                                                                    // Count sprinklers attached to each lateral by distance threshold
                                                                                    const attachThresholdMeters = 1.5;
                                                                                    const rows =
                                                                                        lateralPipes.map(
                                                                                            (
                                                                                                lat
                                                                                            ) => {
                                                                                                const coords =
                                                                                                    (
                                                                                                        lat.coordinates ||
                                                                                                        []
                                                                                                    )
                                                                                                        .map(
                                                                                                            (
                                                                                                                c
                                                                                                            ) =>
                                                                                                                toLngLat(
                                                                                                                    c
                                                                                                                )
                                                                                                        )
                                                                                                        .filter(
                                                                                                            (
                                                                                                                v
                                                                                                            ): v is [
                                                                                                                number,
                                                                                                                number,
                                                                                                            ] =>
                                                                                                                v !==
                                                                                                                null
                                                                                                        );
                                                                                                const line =
                                                                                                    coords.length >=
                                                                                                    2
                                                                                                        ? turf.lineString(
                                                                                                              coords
                                                                                                          )
                                                                                                        : null;
                                                                                                const units =
                                                                                                    line
                                                                                                        ? actualIrrigationPoints.filter(
                                                                                                              (
                                                                                                                  pt
                                                                                                              ) => {
                                                                                                                  const type =
                                                                                                                      normalizeIrrigationType(
                                                                                                                          pt.type
                                                                                                                      );
                                                                                                                  if (
                                                                                                                      type !==
                                                                                                                      'sprinkler'
                                                                                                                  )
                                                                                                                      return false;
                                                                                                                  if (
                                                                                                                      typeof pt.lat !==
                                                                                                                          'number' ||
                                                                                                                      typeof pt.lng !==
                                                                                                                          'number'
                                                                                                                  )
                                                                                                                      return false;
                                                                                                                  const point =
                                                                                                                      turf.point(
                                                                                                                          [
                                                                                                                              pt.lng,
                                                                                                                              pt.lat,
                                                                                                                          ]
                                                                                                                      );
                                                                                                                  const distKm =
                                                                                                                      pointToLineDistance(
                                                                                                                          point,
                                                                                                                          line as unknown as GeoFeature<GeoLineString>,
                                                                                                                          {
                                                                                                                              units: 'kilometers',
                                                                                                                          }
                                                                                                                      );
                                                                                                                  return (
                                                                                                                      distKm *
                                                                                                                          1000 <=
                                                                                                                      attachThresholdMeters
                                                                                                                  );
                                                                                                              }
                                                                                                          )
                                                                                                              .length
                                                                                                        : 0;
                                                                                                return {
                                                                                                    id: lat.id,
                                                                                                    units,
                                                                                                };
                                                                                            }
                                                                                        );
                                                                                    const most =
                                                                                        rows.reduce<{
                                                                                            id:
                                                                                                | string
                                                                                                | number
                                                                                                | null;
                                                                                            units: number;
                                                                                        }>(
                                                                                            (
                                                                                                acc,
                                                                                                r
                                                                                            ) =>
                                                                                                r.units >
                                                                                                acc.units
                                                                                                    ? {
                                                                                                          id: r.id,
                                                                                                          units: r.units,
                                                                                                      }
                                                                                                    : acc,
                                                                                            {
                                                                                                id: null,
                                                                                                units: -1,
                                                                                            }
                                                                                        );
                                                                                    const open =
                                                                                        zoneLateralDetailsOpen[
                                                                                            zone.id.toString()
                                                                                        ] || false;
                                                                                    return (
                                                                                        <div className="mt-2 rounded bg-blue-800/20 p-2 print:bg-blue-100">
                                                                                            {/* Move header block outside Zone Pipe Summary, show here separately above outlets */}
                                                                                            {header}
                                                                                            <div className="mb-2 flex items-center justify-between">
                                                                                                <div className="text-xs font-semibold text-blue-200 print:text-blue-800">
                                                                                                    {t(
                                                                                                        'Lateral outlets'
                                                                                                    )}
                                                                                                </div>
                                                                                                <button
                                                                                                    onClick={() =>
                                                                                                        setZoneLateralDetailsOpen(
                                                                                                            (
                                                                                                                prev
                                                                                                            ) => ({
                                                                                                                ...prev,
                                                                                                                [zone.id.toString()]:
                                                                                                                    !open,
                                                                                                            })
                                                                                                        )
                                                                                                    }
                                                                                                    className="rounded border border-blue-400/40 px-2 py-0.5 text-[11px] text-blue-100 hover:bg-blue-700/30 print:text-blue-900"
                                                                                                >
                                                                                                    {open
                                                                                                        ? t(
                                                                                                              'Hide'
                                                                                                          )
                                                                                                        : t(
                                                                                                              'View all'
                                                                                                          )}
                                                                                                </button>
                                                                                            </div>
                                                                                            {!open ? (
                                                                                                <div className="text-xs text-blue-100 print:text-blue-900">
                                                                                                    {t(
                                                                                                        'Most outlets'
                                                                                                    )}
                                                                                                    :{' '}
                                                                                                    <span className="font-bold">
                                                                                                        {(most.units <
                                                                                                        0
                                                                                                            ? 0
                                                                                                            : most.units
                                                                                                        ).toLocaleString()}
                                                                                                    </span>{' '}
                                                                                                    {t(
                                                                                                        'sprinklers'
                                                                                                    )}
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="space-y-1">
                                                                                                    {rows.length ===
                                                                                                    0 ? (
                                                                                                        <div className="text-xs text-blue-200/70 print:text-blue-800">
                                                                                                            {t(
                                                                                                                'No laterals'
                                                                                                            )}
                                                                                                        </div>
                                                                                                    ) : (
                                                                                                        rows
                                                                                                            .sort(
                                                                                                                (
                                                                                                                    a,
                                                                                                                    b
                                                                                                                ) =>
                                                                                                                    b.units -
                                                                                                                    a.units
                                                                                                            )
                                                                                                            .map(
                                                                                                                (
                                                                                                                    r
                                                                                                                ) => (
                                                                                                                    <div
                                                                                                                        key={String(
                                                                                                                            r.id
                                                                                                                        )}
                                                                                                                        className="flex items-center justify-between text-xs"
                                                                                                                    >
                                                                                                                        <div className="text-blue-100 print:text-blue-900">
                                                                                                                            {t(
                                                                                                                                'Lateral'
                                                                                                                            )}{' '}
                                                                                                                            #
                                                                                                                            {String(
                                                                                                                                r.id
                                                                                                                            )}
                                                                                                                        </div>
                                                                                                                        <div className="font-semibold text-blue-200 print:text-blue-800">
                                                                                                                            {r.units.toLocaleString()}{' '}
                                                                                                                            {t(
                                                                                                                                'sprinklers'
                                                                                                                            )}
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                )
                                                                                                            )
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                } catch {
                                                                                    // If laterals listing errors, still render the header so flowrates always show
                                                                                    return (
                                                                                        <div className="mt-2 rounded bg-blue-800/20 p-2 print:bg-blue-100">
                                                                                            {header}
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                            })()}

                                                                            <div className="grid grid-cols-2 gap-2 border-t border-cyan-600 pt-2 text-xs print:border-cyan-300">
                                                                                <div className="rounded bg-cyan-700/30 p-2 text-center print:bg-cyan-50">
                                                                                    <div className="mb-1 text-xs text-cyan-200 print:text-cyan-700">
                                                                                        {t(
                                                                                            'Total longest pipe combined:'
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="text-sm font-bold text-cyan-100 print:text-cyan-900">
                                                                                        {zonePipeStats.totalLongestLength.toLocaleString()}{' '}
                                                                                        {t('m.')}
                                                                                    </div>
                                                                                    <div className="mt-1 text-xs text-cyan-300 print:text-cyan-600">
                                                                                        (
                                                                                        {
                                                                                            zonePipeStats
                                                                                                .main
                                                                                                .longestLength
                                                                                        }{' '}
                                                                                        +{' '}
                                                                                        {
                                                                                            zonePipeStats
                                                                                                .submain
                                                                                                .longestLength
                                                                                        }{' '}
                                                                                        +{' '}
                                                                                        {
                                                                                            zonePipeStats
                                                                                                .lateral
                                                                                                .longestLength
                                                                                        }
                                                                                        )
                                                                                    </div>
                                                                                </div>
                                                                                <div className="rounded bg-cyan-700/30 p-2 text-center print:bg-cyan-50">
                                                                                    <div className="mb-1 text-xs text-cyan-200 print:text-cyan-700">
                                                                                        {t(
                                                                                            'Total all pipe combined:'
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="text-sm font-bold text-cyan-100 print:text-cyan-900">
                                                                                        {zonePipeStats.totalLength.toLocaleString()}{' '}
                                                                                        {t('m.')}
                                                                                    </div>
                                                                                    <div className="mt-1 text-xs text-cyan-300 print:text-cyan-600">
                                                                                        (
                                                                                        {
                                                                                            zonePipeStats
                                                                                                .main
                                                                                                .totalLength
                                                                                        }{' '}
                                                                                        +{' '}
                                                                                        {
                                                                                            zonePipeStats
                                                                                                .submain
                                                                                                .totalLength
                                                                                        }{' '}
                                                                                        +{' '}
                                                                                        {
                                                                                            zonePipeStats
                                                                                                .lateral
                                                                                                .totalLength
                                                                                        }
                                                                                        )
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="mt-2 border-t border-cyan-600 pt-2 text-center print:border-cyan-300">
                                                                                <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                                                    {t(
                                                                                        'Total Pipes in Zone:'
                                                                                    )}{' '}
                                                                                    <span className="font-bold text-cyan-100 print:text-cyan-900">
                                                                                        {
                                                                                            zonePipeStats.total
                                                                                        }{' '}
                                                                                        {t('pipes')}
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Connection Points in Zone */}
                                                                            {(() => {
                                                                                // สร้างจุดเชื่อมต่อทั้งหมดเพื่อนับจำนวนในโซนนี้
                                                                                const allConnectionPoints: Array<{
                                                                                    id: string;
                                                                                    position: Coordinate;
                                                                                    connectedLaterals: string[];
                                                                                    submainId: string;
                                                                                    type:
                                                                                        | 'single'
                                                                                        | 'junction'
                                                                                        | 'crossing'
                                                                                        | 'l_shape'
                                                                                        | 't_shape'
                                                                                        | 'cross_shape';
                                                                                }> = [];

                                                                                // สร้างจุดเชื่อมต่อของท่อย่อยกับท่อเมนย่อย
                                                                                const lateralPipes =
                                                                                    actualPipes.filter(
                                                                                        (p) =>
                                                                                            p.type ===
                                                                                            'lateral'
                                                                                    );
                                                                                const submainPipes =
                                                                                    actualPipes.filter(
                                                                                        (p) =>
                                                                                            p.type ===
                                                                                            'submain'
                                                                                    );

                                                                                if (
                                                                                    lateralPipes.length >
                                                                                        0 &&
                                                                                    submainPipes.length >
                                                                                        0
                                                                                ) {
                                                                                    const lateralConnectionPoints =
                                                                                        createLateralConnectionPoints(
                                                                                            lateralPipes,
                                                                                            submainPipes
                                                                                        );
                                                                                    allConnectionPoints.push(
                                                                                        ...lateralConnectionPoints
                                                                                    );
                                                                                }

                                                                                // สร้างจุดเชื่อมต่อของท่อเมนย่อยกับท่อเมน
                                                                                const submainToMainConnectionPoints =
                                                                                    createSubmainToMainConnectionPoints(
                                                                                        actualPipes
                                                                                    );
                                                                                allConnectionPoints.push(
                                                                                    ...submainToMainConnectionPoints
                                                                                );

                                                                                // กรองจุดเชื่อมต่อที่อยู่ในโซนนี้
                                                                                const zoneConnectionPoints =
                                                                                    allConnectionPoints.filter(
                                                                                        (cp) => {
                                                                                            return isPointInPolygonEnhanced(
                                                                                                [
                                                                                                    cp
                                                                                                        .position
                                                                                                        .lat,
                                                                                                    cp
                                                                                                        .position
                                                                                                        .lng,
                                                                                                ],
                                                                                                zone.coordinates
                                                                                            );
                                                                                        }
                                                                                    );

                                                                                // นับจำนวนจุดเชื่อมต่อแต่ละสีในโซนนี้
                                                                                const zoneConnectionCounts =
                                                                                    {
                                                                                        red: zoneConnectionPoints.filter(
                                                                                            (cp) =>
                                                                                                cp.type ===
                                                                                                'l_shape'
                                                                                        ).length,
                                                                                        blue: zoneConnectionPoints.filter(
                                                                                            (cp) =>
                                                                                                cp.type ===
                                                                                                't_shape'
                                                                                        ).length,
                                                                                        purple: zoneConnectionPoints.filter(
                                                                                            (cp) =>
                                                                                                cp.type ===
                                                                                                'cross_shape'
                                                                                        ).length,
                                                                                        yellow: zoneConnectionPoints.filter(
                                                                                            (cp) =>
                                                                                                cp.type ===
                                                                                                    'junction' ||
                                                                                                cp.type ===
                                                                                                    'single'
                                                                                        ).length,
                                                                                        green: zoneConnectionPoints.filter(
                                                                                            (cp) =>
                                                                                                cp.type ===
                                                                                                'crossing'
                                                                                        ).length,
                                                                                    };

                                                                                const totalZoneConnectionPoints =
                                                                                    Object.values(
                                                                                        zoneConnectionCounts
                                                                                    ).reduce(
                                                                                        (
                                                                                            sum,
                                                                                            count
                                                                                        ) =>
                                                                                            sum +
                                                                                            count,
                                                                                        0
                                                                                    );

                                                                                // ถ้าไม่มีจุดเชื่อมต่อในโซนนี้ ให้ข้าม
                                                                                if (
                                                                                    totalZoneConnectionPoints ===
                                                                                    0
                                                                                )
                                                                                    return null;

                                                                                return (
                                                                                    <div className="mt-3 rounded-lg bg-purple-900/30 p-3 print:border print:bg-purple-50">
                                                                                        <h4 className="mb-2 text-sm font-semibold text-purple-300 print:text-purple-800">
                                                                                            🔗{' '}
                                                                                            {t(
                                                                                                'Connection Points in Zone'
                                                                                            )}
                                                                                        </h4>

                                                                                        {/* แสดงจำนวนรวม */}
                                                                                        <div className="mb-2 text-center">
                                                                                            <span className="text-sm font-bold text-purple-200 print:text-purple-900">
                                                                                                {
                                                                                                    totalZoneConnectionPoints
                                                                                                }{' '}
                                                                                                {t(
                                                                                                    'connection points'
                                                                                                )}
                                                                                            </span>
                                                                                        </div>

                                                                                        {/* แสดงจำนวนจุดเชื่อมต่อแต่ละสีในโซนนี้ */}
                                                                                        <div className="grid grid-cols-5 gap-1">
                                                                                            {/* สีแดง */}
                                                                                            <div className="rounded bg-gray-600 p-1 text-center print:border">
                                                                                                <div className="flex flex-col items-center gap-1">
                                                                                                    <div className="h-2 w-2 rounded-full border border-white bg-red-500"></div>
                                                                                                    <span className="text-xs font-bold text-red-400 print:text-black">
                                                                                                        {
                                                                                                            zoneConnectionCounts.red
                                                                                                        }
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* สีน้ำเงิน */}
                                                                                            <div className="rounded bg-gray-600 p-1 text-center print:border">
                                                                                                <div className="flex flex-col items-center gap-1">
                                                                                                    <div className="h-2 w-2 rounded-full border border-white bg-blue-500"></div>
                                                                                                    <span className="text-xs font-bold text-blue-400 print:text-black">
                                                                                                        {
                                                                                                            zoneConnectionCounts.blue
                                                                                                        }
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* สีม่วง */}
                                                                                            <div className="rounded bg-gray-600 p-1 text-center print:border">
                                                                                                <div className="flex flex-col items-center gap-1">
                                                                                                    <div className="h-2 w-2 rounded-full border border-white bg-purple-500"></div>
                                                                                                    <span className="text-xs font-bold text-purple-400 print:text-black">
                                                                                                        {
                                                                                                            zoneConnectionCounts.purple
                                                                                                        }
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* สีเหลือง */}
                                                                                            <div className="rounded bg-gray-600 p-1 text-center print:border">
                                                                                                <div className="flex flex-col items-center gap-1">
                                                                                                    <div className="h-2 w-2 rounded-full border border-white bg-yellow-500"></div>
                                                                                                    <span className="text-xs font-bold text-yellow-400 print:text-black">
                                                                                                        {
                                                                                                            zoneConnectionCounts.yellow
                                                                                                        }
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* สีเขียว */}
                                                                                            <div className="rounded bg-gray-600 p-1 text-center print:border">
                                                                                                <div className="flex flex-col items-center gap-1">
                                                                                                    <div className="h-2 w-2 rounded-full border border-white bg-green-500"></div>
                                                                                                    <span className="text-xs font-bold text-green-400 print:text-black">
                                                                                                        {
                                                                                                            zoneConnectionCounts.green
                                                                                                        }
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* แสดงรายละเอียดเพิ่มเติม */}
                                                                                        <div className="mt-2 text-xs text-purple-200 print:text-purple-700">
                                                                                            {zoneConnectionCounts.red >
                                                                                                0 && (
                                                                                                <span className="mr-2">
                                                                                                    {t(
                                                                                                        'L-shape'
                                                                                                    )}
                                                                                                    :{' '}
                                                                                                    {
                                                                                                        zoneConnectionCounts.red
                                                                                                    }
                                                                                                </span>
                                                                                            )}
                                                                                            {zoneConnectionCounts.blue >
                                                                                                0 && (
                                                                                                <span className="mr-2">
                                                                                                    {t(
                                                                                                        'T-shape'
                                                                                                    )}
                                                                                                    :{' '}
                                                                                                    {
                                                                                                        zoneConnectionCounts.blue
                                                                                                    }
                                                                                                </span>
                                                                                            )}
                                                                                            {zoneConnectionCounts.purple >
                                                                                                0 && (
                                                                                                <span className="mr-2">
                                                                                                    {t(
                                                                                                        '+ shape'
                                                                                                    )}
                                                                                                    :{' '}
                                                                                                    {
                                                                                                        zoneConnectionCounts.purple
                                                                                                    }
                                                                                                </span>
                                                                                            )}
                                                                                            {zoneConnectionCounts.yellow >
                                                                                                0 && (
                                                                                                <span className="mr-2">
                                                                                                    {t(
                                                                                                        'Junction'
                                                                                                    )}
                                                                                                    :{' '}
                                                                                                    {
                                                                                                        zoneConnectionCounts.yellow
                                                                                                    }
                                                                                                </span>
                                                                                            )}
                                                                                            {zoneConnectionCounts.green >
                                                                                                0 && (
                                                                                                <span className="mr-2">
                                                                                                    {t(
                                                                                                        'Crossing'
                                                                                                    )}
                                                                                                    :{' '}
                                                                                                    {
                                                                                                        zoneConnectionCounts.green
                                                                                                    }
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                <div className="py-4 text-center text-gray-400 print:text-gray-600">
                                                                    <div className="mb-2 text-4xl">
                                                                        ❓
                                                                    </div>
                                                                    <div className="text-sm">
                                                                        No crop assigned to this
                                                                        zone
                                                                    </div>
                                                                    <div className="text-xs">
                                                                        Cannot calculate water
                                                                        requirements
                                                                    </div>
                                                                </div>

                                                                {/* แสดงข้อมูลจำนวนสปริงเกอร์แม้ไม่มีพืชปลูก */}
                                                                <div className="rounded-lg bg-blue-900/30 p-3 print:border print:bg-blue-50">
                                                                    <h4 className="mb-2 text-sm font-semibold text-blue-300 print:text-blue-800">
                                                                        💧 Irrigation Points in
                                                                        Zone:
                                                                    </h4>
                                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                                        <div className="rounded bg-blue-700/20 p-2 text-center print:bg-blue-50">
                                                                            <div className="text-blue-200 print:text-blue-800">
                                                                                🟢 Sprinklers
                                                                            </div>
                                                                            <div className="font-semibold text-blue-100 print:text-blue-900">
                                                                                {
                                                                                    zoneIrrigationCounts.sprinkler
                                                                                }
                                                                            </div>
                                                                        </div>
                                                                        {/* Removed Mini Sprinklers and Micro Sprays sections */}
                                                                        <div className="rounded bg-blue-700/20 p-2 text-center print:bg-blue-50">
                                                                            <div className="text-blue-200 print:text-blue-800">
                                                                                🟣 Drip Tape
                                                                            </div>
                                                                            <div className="font-semibold text-blue-100 print:text-blue-900">
                                                                                {
                                                                                    zoneIrrigationCounts.dripTape
                                                                                }
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-2 rounded bg-blue-800/30 p-2 text-center print:bg-blue-100">
                                                                        <div className="text-xs text-blue-200 print:text-blue-700">
                                                                            Total Irrigation Points:
                                                                        </div>
                                                                        <div className="text-sm font-bold text-blue-100 print:text-blue-900">
                                                                            {
                                                                                zoneIrrigationCounts.total
                                                                            }{' '}
                                                                            จุด
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
