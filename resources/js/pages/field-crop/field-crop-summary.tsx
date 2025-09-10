import { Head, Link, usePage } from '@inertiajs/react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as turf from '@turf/turf';
import lineIntersect from '@turf/line-intersect';
import type { Feature as GeoJsonFeature, FeatureCollection as GeoJsonFeatureCollection, Point as GeoJsonPoint, LineString as GeoJsonLineString } from 'geojson';
import type { Feature as GeoFeature, LineString as GeoLineString } from 'geojson';
import pointToLineDistance from '@turf/point-to-line-distance';
import { getCropByValue, getTranslatedCropByValue } from './choose-crop';
import Navbar from '../../components/Navbar';
import { useLanguage } from '../../contexts/LanguageContext';
import { createGoogleMapsApiUrl } from '@/utils/googleMapsConfig';

// Reduce verbose logs in production/dev by toggling this flag
const DEBUG_ZONE_PIPE_STATS = false as const;

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
    onMapReady
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

        const existing = document.getElementById('__googleMapsScriptId') as HTMLScriptElement | null;
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
            zones.forEach((zone) => {
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
                    const style = (
                        pipe.type === 'main' ? { color: '#dc2626', weight: 8 } :
                        pipe.type === 'submain' ? { color: '#8b5cf6', weight: 5 } :
                        pipe.type === 'lateral' ? { color: '#fbbf24', weight: 3 } :
                        { color: '#888888', weight: 3 }
                    );

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

            // Draw equipment (pumps)
            if (Array.isArray(equipment) && equipment.length > 0) {
                equipment.forEach((eq) => {
                    const t = (eq as { type?: string }).type;
                    const isPump = t === 'pump' || t === 'water_pump';
                    const hasCoords = typeof (eq as { lat?: number }).lat === 'number' && typeof (eq as { lng?: number }).lng === 'number';
                    if (!isPump || !hasCoords) return;
                    new google.maps.Marker({
                        position: { lat: (eq as { lat: number }).lat, lng: (eq as { lng: number }).lng },
                        map: googleMapRef.current!,
                        title: (eq as { name?: string }).name || 'Water Pump',
                        icon: {
                            url: '/generateTree/wtpump.png',
                            scaledSize: new google.maps.Size(28, 28),
                            anchor: new google.maps.Point(14, 14)
                        },
                        zIndex: 3000
                    });
                });
            }

            // Draw obstacles (water sources and others)
            obstacles.forEach((obs) => {
                if (obs.coordinates && Array.isArray(obs.coordinates) && obs.coordinates.length >= 3) {
                    const coords = obs.coordinates.map((coord: Coordinate) => {
                        if (Array.isArray(coord)) {
                            return { lat: coord[0], lng: coord[1] } as unknown as { lat: number; lng: number };
                        }
                        return { lat: coord.lat, lng: coord.lng };
                    });
                    const colors = obs.type === 'water_source'
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

                    // Draw coverage circles for sprinklers (if they have radius)
                    if (point.radius && normalizedType !== 'drip_tape') {
                        new google.maps.Circle({
                            strokeColor: color,
                            strokeOpacity: 0.6,
                            strokeWeight: 1,
                            fillColor: color,
                            fillOpacity: 0.1,
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
                console.log(`✅ Image saved with key: ${key}`);
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

            console.log('✅ Map image captured and saved successfully');
            console.log(`📊 Image size: ${Math.round(imageDataUrl.length / 1024)} KB`);
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
            console.log(`✅ Verified image exists with key: ${key}`);
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
    console.log(`🧮 calculatePlantingPoints called:`, {
        zoneArea: zoneArea.toFixed(2),
        cropName: crop.name,
        cropRowSpacing: crop.rowSpacing,
        cropPlantSpacing: crop.plantSpacing,
        customRowSpacing,
        customPlantSpacing
    });

    // แปลงหน่วยจาก cm เป็น m
    const rowSpacing = (customRowSpacing || crop.rowSpacing) / 100;
    const plantSpacing = (customPlantSpacing || crop.plantSpacing) / 100;

    // 🔥 เพิ่มบรรทัดนี้
    console.log(`📏 Spacing calculation:`, {
        rowSpacing: `${rowSpacing} m`,
        plantSpacing: `${plantSpacing} m`,
        original: `${crop.rowSpacing}x${crop.plantSpacing} cm`
    });

    if (!rowSpacing || !plantSpacing) return 0;

    // คำนวณจำนวนต้นต่อตารางเมตร
    // ตัวอย่าง: ระยะห่างแถว 25cm, ระยะห่างต้น 25cm
    // จำนวนต้นต่อตารางเมตร = (1/0.25) * (1/0.25) = 4 * 4 = 16 ต้น/ตร.ม.
    const plantsPerSquareMeter = (1 / rowSpacing) * (1 / plantSpacing);
    const totalPlants = Math.floor(zoneArea * plantsPerSquareMeter);

    console.log(`🌱 Plant calculation details:`, {
        zoneAreaM2: zoneArea.toFixed(2),
        rowSpacingM: rowSpacing.toFixed(2),
        plantSpacingM: plantSpacing.toFixed(2),
        plantsPerSqm: plantsPerSquareMeter.toFixed(1),
        totalPlants: totalPlants.toLocaleString()
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
        const zonePipes = pipes.filter(pipe => 
            pipe.type === 'lateral' && pipe.zoneId?.toString() === zoneId
        );

        console.log(`🔧 Calculating planting points from pipes for zone ${zoneId}:`, {
            totalPipes: zonePipes.length,
            cropName: crop.name,
            rowSpacing: `${rowSpacing} m`,
            plantSpacing: `${plantSpacing} m`
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
                    if (!start || !end || typeof start.lat !== 'number' || typeof start.lng !== 'number' || 
                        typeof end.lat !== 'number' || typeof end.lng !== 'number') {
                        console.warn(`⚠️ Invalid coordinates in pipe ${pipeIndex + 1}:`, { start, end });
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

                console.log(`📏 Pipe ${pipeIndex + 1}:`, {
                    pipeLength: `${pipeLength.toFixed(2)} m`,
                    plantingPoints: plantingPointsInPipe,
                    spacing: `${plantSpacing} m`
                });
            }
        });

        console.log(`🌱 Total planting points from pipes: ${totalPlantingPoints.toLocaleString()}`);
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

const calculateWaterRequirement = (plantingPoints: number, crop: ReturnType<typeof getCropByValue>): number => {
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
                if ('lat' in coord && 'lng' in coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
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

        for (const coord of pipe.coordinates) {
            let lat: number, lng: number;
            if (Array.isArray(coord) && coord.length === 2) {
                [lat, lng] = coord as unknown as CoordinateArray;
            } else if ('lat' in coord && 'lng' in coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') { 
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
        if (color.includes('blue') || color.includes('#2563eb') || color.includes('2563eb')) {
            return 'main';
        } else if (
            color.includes('green') ||
            color.includes('#16a34a') ||
            color.includes('16a34a')
        ) {
            return 'submain';
        } else if (
            color.includes('orange') ||
            color.includes('purple') ||
            color.includes('#ea580c') ||
            color.includes('ea580c')
        ) {
            return 'lateral';
        }
    }

    if (pipe.pathOptions && pipe.pathOptions.color) {
        const color = pipe.pathOptions.color.toLowerCase();
        if (color.includes('blue') || color === '#2563eb') {
            return 'main';
        } else if (color.includes('green') || color === '#16a34a') {
            return 'submain';
        } else if (color.includes('orange') || color.includes('purple') || color === '#ea580c') {
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
        console.log(`🔍 Checking pipes for zone ${zoneId} (${currentZone.name})...`);
        console.log(`📏 Total pipes to check: ${pipes.length}`);
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
            console.log(`✅ Found pipe in zone ${zoneId}:`, {
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

    if (DEBUG_ZONE_PIPE_STATS) console.log(`📊 Found ${zonePipes.length} pipes in zone ${zoneId}`);

    const mainPipes = zonePipes.filter((pipe) => identifyPipeType(pipe) === 'main');
    const submainPipes = zonePipes.filter((pipe) => identifyPipeType(pipe) === 'submain');
    const lateralPipes = zonePipes.filter((pipe) => identifyPipeType(pipe) === 'lateral');

    if (DEBUG_ZONE_PIPE_STATS) {
        console.log(`🔵 Main pipes (สีน้ำเงิน): ${mainPipes.length}`);
        console.log(`🟢 Submain pipes (สีเขียว): ${submainPipes.length}`);
        console.log(`🟣 Lateral pipes (สีส้ม/ม่วง): ${lateralPipes.length}`);
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

    if (DEBUG_ZONE_PIPE_STATS) console.log(`📋 Zone ${zoneId} pipe stats:`, result);

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
    const endpointTolM = 0.5; // endpoint window
    const snapEndpointOverrideM = 8; // if long run remains, treat as mid-span tee

    const stationOnMain = (mainCoords: [number, number][], lng: number, lat: number): { station: number; total: number; minDist: number } => {
        const originLng = mainCoords[0][0];
        const originLat = mainCoords[0][1];
        const lat0 = (originLat * Math.PI) / 180;
        const mLat = 111320;
        const mLng = 111320 * Math.cos(lat0);
        const toM = (p: [number, number]) => ({ x: (p[0] - originLng) * mLng, y: (p[1] - originLat) * mLat });
        const S = mainCoords.map(toM);
        const P = { x: (lng - originLng) * mLng, y: (lat - originLat) * mLat };
        let bestStation = 0;
        let bestDist = Number.POSITIVE_INFINITY;
        let total = 0;
        for (let i = 1; i < S.length; i++) total += Math.hypot(S[i].x - S[i - 1].x, S[i].y - S[i - 1].y);
        let cum = 0;
        for (let i = 1; i < S.length; i++) {
            const A = S[i - 1];
            const B = S[i];
            const ABx = B.x - A.x;
            const ABy = B.y - A.y;
            const APx = P.x - A.x;
            const APy = P.y - A.y;
            const denom = ABx * ABx + ABy * ABy;
            if (denom === 0) { cum += Math.hypot(ABx, ABy); continue; }
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
                const inter: GeoJsonFeatureCollection<GeoJsonPoint> = lineIntersect(mainLine as GeoJsonFeature<GeoJsonLineString>, subLine as GeoJsonFeature<GeoJsonLineString>);
                if (inter && inter.features && inter.features.length > 0) {
                    const ic = inter.features[0].geometry?.coordinates as [number, number] | undefined;
                    if (ic) {
                        const st = stationOnMain(mainCoords, ic[0], ic[1]);
                        const atEndpoint = st.station <= endpointTolM || (st.total - st.station) <= endpointTolM;
                        const longRunBeyond = st.station > endpointTolM ? st.station : (st.total - st.station);
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
                    const d1 = pointToLineDistance(p1, mainLine as unknown as GeoFeature<GeoLineString>, { units: 'kilometers' }) * 1000;
                    const d2 = pointToLineDistance(p2, mainLine as unknown as GeoFeature<GeoLineString>, { units: 'kilometers' }) * 1000;
                    const attaches = Math.min(d1, d2) <= 3.0;
                    if (attaches) {
                        const use = d1 <= d2 ? end1 : end2;
                        const st = stationOnMain(mainCoords, use[0], use[1]);
                        const atEndpoint = st.station <= endpointTolM || (st.total - st.station) <= endpointTolM;
                        const longRunBeyond = st.station > endpointTolM ? st.station : (st.total - st.station);
                        if (atEndpoint && longRunBeyond >= snapEndpointOverrideM) threeWayMain += 1;
                        else if (atEndpoint) twoWayMainEndpoint += 1;
                        else threeWayMain += 1;
                        classified = true;
                    }
                } catch {
                    // ignore endpoint fallback errors
                }
            }
        });
    });

    // Submain clusters of laterals
    let twoWaySub = 0;
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
        const toM = (p: [number, number]) => ({ x: (p[0] - originLng) * mLng, y: (p[1] - originLat) * mLat });
        const S = subCoords.map(toM);

        const nearestSegmentSide = (lng: number, lat: number): number => {
            const P = { x: (lng - originLng) * mLng, y: (lat - originLat) * mLat };
            let bestDist = Number.POSITIVE_INFINITY; let side = 0;
            for (let i = 1; i < S.length; i++) {
                const A = S[i - 1]; const B = S[i];
                const ABx = B.x - A.x; const ABy = B.y - A.y;
                const APx = P.x - A.x; const APy = P.y - A.y;
                const denom = ABx * ABx + ABy * ABy; if (denom === 0) continue;
                let t = (APx * ABx + APy * ABy) / denom; t = Math.max(0, Math.min(1, t));
                const projX = A.x + t * ABx; const projY = A.y + t * ABy;
                const dist = Math.hypot(P.x - projX, P.y - projY);
                if (dist < bestDist) { bestDist = dist; const crossZ = ABx * APy - ABy * APx; side = crossZ >= 0 ? 1 : -1; }
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
            const dStartM = pointToLineDistance(pStart, subLine as unknown as GeoFeature<GeoLineString>, { units: 'kilometers' }) * 1000;
            const dEndM = pointToLineDistance(pEnd, subLine as unknown as GeoFeature<GeoLineString>, { units: 'kilometers' }) * 1000;
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
                let bestStation = 0; let bestDist = Number.POSITIVE_INFINITY; let cum = 0;
                for (let i = 1; i < S.length; i++) {
                    const A = S[i - 1]; const B = S[i];
                    const ABx = B.x - A.x; const ABy = B.y - A.y;
                    const APx = P.x - A.x; const APy = P.y - A.y;
                    const denom = ABx * ABx + ABy * ABy;
                    if (denom === 0) { cum += Math.hypot(ABx, ABy); continue; }
                    let t = (APx * ABx + APy * ABy) / denom; t = Math.max(0, Math.min(1, t));
                    const projX = A.x + t * ABx; const projY = A.y + t * ABy;
                    const dist = Math.hypot(P.x - projX, P.y - projY);
                    if (dist < bestDist) { bestDist = dist; bestStation = cum + t * Math.hypot(ABx, ABy); }
                    cum += Math.hypot(ABx, ABy);
                }
                return bestStation;
            };
            const stStart = stationAlongSub(startLngLat[0], startLngLat[1]);
            const stEnd = stationAlongSub(endLngLat[0], endLngLat[1]);
            const attachTolCross = 3.0; // meters (tolerance to treat endpoints as attached for crossing heuristic)
            const stationTol = 2.0; // meters along submain to consider same crossing spot
            const crossesHeuristic = (dStartM <= attachTolCross && dEndM <= attachTolCross && (sideStart * sideEnd < 0) && Math.abs(stStart - stEnd) <= stationTol);
            try {
                const inter: GeoJsonFeatureCollection<GeoJsonPoint> = lineIntersect(subLine as GeoJsonFeature<GeoJsonLineString>, latLine as GeoJsonFeature<GeoJsonLineString>);
                if (inter && inter.features) inters = inter.features.map((f) => f.geometry!.coordinates as [number, number]).filter(Boolean);
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
            const originLng2 = subCoords[0][0]; const originLat2 = subCoords[0][1];
            const lat02 = (originLat2 * Math.PI) / 180; const mLat2 = 111320; const mLng2 = 111320 * Math.cos(lat02);
            const toM2 = (p: [number, number]) => ({ x: (p[0] - originLng2) * mLng2, y: (p[1] - originLat2) * mLat2 });
            const S2 = subCoords.map(toM2);
            const stationOf = (lng: number, lat: number) => {
                const P = { x: (lng - originLng2) * mLng2, y: (lat - originLat2) * mLat2 };
                let bestStation = 0; let bestDist = Number.POSITIVE_INFINITY; let cum = 0;
                for (let i = 1; i < S2.length; i++) {
                    const A = S2[i - 1]; const B = S2[i];
                    const ABx = B.x - A.x; const ABy = B.y - A.y;
                    const APx = P.x - A.x; const APy = P.y - A.y;
                    const denom = ABx * ABx + ABy * ABy; if (denom === 0) { cum += Math.hypot(ABx, ABy); continue; }
                    let t = (APx * ABx + APy * ABy) / denom; t = Math.max(0, Math.min(1, t));
                    const projX = A.x + t * ABx; const projY = A.y + t * ABy;
                    const dist = Math.hypot(P.x - projX, P.y - projY);
                    if (dist < bestDist) { bestDist = dist; bestStation = cum + t * Math.hypot(ABx, ABy); }
                    cum += Math.hypot(ABx, ABy);
                }
                return bestStation;
            };
            const crossFlag = (inters.length >= 2) || crossesHeuristic;
            if (inters.length > 0) {
                inters.forEach(([lng, lat]) => junctions.push({ station: stationOf(lng, lat), crossing: crossFlag, side: nearestSegmentSide(lng, lat) }));
            } else {
                // treat endpoint near submain as tee
                const endpoints: [number, number][] = [latCoords[0], latCoords[latCoords.length - 1]];
                endpoints.forEach(([lng, lat]) => {
                    const p = turf.point([lng, lat]);
                    const distKm = pointToLineDistance(p, subLine as unknown as GeoFeature<GeoLineString>, { units: 'kilometers' });
                    if (distKm * 1000 <= 3.0) junctions.push({ station: stationOf(lng, lat), crossing: crossFlag, side: nearestSegmentSide(lng, lat) });
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
                    if (side < 0) g.left = true; else if (side > 0) g.right = true;
                    return;
                }
            }
            groups.push({ center: snapped, left: side < 0, right: side > 0 });
        };
        junctions.forEach(j => pushToGroup(j.station, j.side));

        if (groups.length > 0) groups.sort((a, b) => a.center - b.center);

        // Smart classification
        if (groups.length > 0) {
            const first = groups[0];
            if (first.left && first.right) threeWaySub += 1; else twoWaySub += 1;
        }
        if (groups.length > 1) {
            const last = groups[groups.length - 1];
            if (last.left && last.right) threeWaySub += 1; else twoWaySub += 1;
        }
        for (let gi = 1; gi < groups.length - 1; gi++) {
            const g = groups[gi];
            if (g.left && g.right) fourWaySub += 1; else if (g.left || g.right) threeWaySub += 1;
        }
    });

    // Lateral: sprinklers along line
    let threeWayLat = 0; let twoWayLat = 0;
    const sprinklerAttachThresholdMeters = 1.5;
    const sprinklerTypes = new Set(['sprinkler']);
    lateralPipes.forEach((latPipe) => {
        const coords = (latPipe.coordinates || []).map((c) => toLngLat(c)).filter((v): v is [number, number] => v !== null);
        if (coords.length < 2) return;
        const line = turf.lineString(coords);
        const sprinklersOnLateral = irrigationPoints.filter((pt) => {
            const type = normalizeIrrigationType(pt.type);
            if (!sprinklerTypes.has(type)) return false;
            if (typeof pt.lat !== 'number' || typeof pt.lng !== 'number') return false;
            const point = turf.point([pt.lng, pt.lat]);
            const distKm = pointToLineDistance(point, line as unknown as GeoFeature<GeoLineString>, { units: 'kilometers' });
            return distKm * 1000 <= sprinklerAttachThresholdMeters;
        }).length;
        if (sprinklersOnLateral > 0) { threeWayLat += Math.max(0, sprinklersOnLateral - 1); twoWayLat += 1; }
    });

    return {
        twoWay: (twoWayMain + twoWayMainEndpoint) + twoWaySub + twoWayLat,
        threeWay: (threeWayMain) + threeWaySub + threeWayLat,
        fourWay: fourWaySub,
        breakdown: {
            main: { twoWay: twoWayMain + twoWayMainEndpoint, threeWay: threeWayMain, fourWay: 0 },
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
};

type PipeNetworkSummary = {
    mains: MainSummary[];
    counts: { main: number; submain: number; lateral: number };
};

const buildPipeNetworkSummary = (
    pipes: Pipe[],
    irrigationPoints: IrrigationPoint[],
    flowSettings: Record<string, { flow?: number }>
): PipeNetworkSummary => {
    const mains = pipes.filter((p) => identifyPipeType(p) === 'main');
    const subs = pipes.filter((p) => identifyPipeType(p) === 'submain');
    const lats = pipes.filter((p) => identifyPipeType(p) === 'lateral');

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
                const inter = lineIntersect(mainLine as GeoJsonFeature<GeoJsonLineString>, subLine as GeoJsonFeature<GeoJsonLineString>);
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
                            const dKm = pointToLineDistance(p, mainLine as unknown as GeoFeature<GeoLineString>, { units: 'kilometers' });
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
                const inter = lineIntersect(subLine as GeoJsonFeature<GeoJsonLineString>, latLine as GeoJsonFeature<GeoJsonLineString>);
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
                            const dKm = pointToLineDistance(p, subLine as unknown as GeoFeature<GeoLineString>, { units: 'kilometers' });
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
                const distKm = pointToLineDistance(point, line as unknown as GeoFeature<GeoLineString>, { units: 'kilometers' });
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
            const lInfos: LateralFlowInfo[] = latIds.map((lid) => lateralFlowInfo[lid]).filter(Boolean);
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
        let best: Pipe | null = null; let bestLen = -1;
        arr.forEach((p) => {
            const len = pipeLength(p);
            if (len > bestLen) { bestLen = len; best = p; }
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
                const inter = lineIntersect(mainLine as GeoJsonFeature<GeoJsonLineString>, subLine as GeoJsonFeature<GeoJsonLineString>);
                connected = !!(inter && inter.features && inter.features.length > 0);
            } catch {
                /* ignore */
            }
            if (!connected) {
                const sCoords = (sub.coordinates || []).map((c) => toLngLat(c)).filter((v): v is [number, number] => v !== null);
                if (sCoords.length >= 2 && mainLine) {
                    const ends: [number, number][] = [sCoords[0], sCoords[sCoords.length - 1]];
                    connected = ends.some(([lng, lat]) => {
                        const p = turf.point([lng, lat]);
                        const dKm = pointToLineDistance(p, mainLine as unknown as GeoFeature<GeoLineString>, { units: 'kilometers' });
                        return dKm * 1000 <= attachTolM;
                    });
                }
            }
            if (connected) { subToMain[String(sub.id)] = String(main.id); break; }
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
                const inter = lineIntersect(subLine as GeoJsonFeature<GeoJsonLineString>, latLine as GeoJsonFeature<GeoJsonLineString>);
                connected = !!(inter && inter.features && inter.features.length > 0);
            } catch {
                /* ignore */
            }
            if (!connected) {
                const lCoords = (lat.coordinates || []).map((c) => toLngLat(c)).filter((v): v is [number, number] => v !== null);
                if (lCoords.length >= 2 && subLine) {
                    const ends: [number, number][] = [lCoords[0], lCoords[lCoords.length - 1]];
                    connected = ends.some(([lng, latV]) => {
                        const p = turf.point([lng, latV]);
                        const dKm = pointToLineDistance(p, subLine as unknown as GeoFeature<GeoLineString>, { units: 'kilometers' });
                        return dKm * 1000 <= attachTolM;
                    });
                }
            }
            if (connected) { latToSub[String(lat.id)] = String(sub.id); break; }
        }
    });

    // Flow from lateral sprinklers
    const perSprinkler = flowSettings?.sprinkler_system?.flow ?? 0;
    const lateralUnits = (lat: Pipe): number => {
        const line = toLine(lat);
        if (!line) return 0;
        const thresh = 1.5; // meters
        try {
            return irrigationPoints.filter((pt) => {
                const type = normalizeIrrigationType(pt.type);
                if (type !== 'sprinkler') return false;
                if (typeof pt.lat !== 'number' || typeof pt.lng !== 'number') return false;
                const point = turf.point([pt.lng, pt.lat]);
                const dKm = pointToLineDistance(point, line as unknown as GeoFeature<GeoLineString>, { units: 'kilometers' });
                return dKm * 1000 <= thresh;
            }).length;
        } catch { return 0; }
    };

    // Lateral longest flow
    const latLongest = findLongest(lats);
    const latLongestUnits = latLongest ? lateralUnits(latLongest) : 0;
    const latLongestFlow = latLongestUnits * perSprinkler;

    // Submain longest flow (use laterals connected to that submain; flow = lateral(longest) × number of laterals connected)
    const subIdToLatIds: Record<string, Array<string>> = {};
    Object.entries(latToSub).forEach(([latId, sid]) => {
        const key = sid;
        if (!subIdToLatIds[key]) subIdToLatIds[key] = [];
        subIdToLatIds[key].push(latId);
    });
    const subLongest = findLongest(subs);
    const computeSubFlow = (sid: string): { latCount: number; flow: number } => {
        const latIds = subIdToLatIds[sid] || [];
        let maxUnits = 0;
        latIds.forEach((lid) => {
            const lp = lats.find((p) => String(p.id) === lid);
            if (!lp) return;
            const n = lateralUnits(lp);
            if (n > maxUnits) maxUnits = n;
        });
        const latCount = latIds.length;
        return { latCount, flow: maxUnits * perSprinkler * latCount };
    };
    const subLongestStats = subLongest ? computeSubFlow(String(subLongest.id)) : { latCount: 0, flow: 0 };

    // Main highest-flow selection (among mains connected to any submains in this zone)
    // For each main: flow = (max submain flow among its submains) × (# of connected submains)
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
        let bestSubFlow = 0;
        subIds.forEach((sid) => {
            const f = computeSubFlow(sid).flow;
            if (f > bestSubFlow) bestSubFlow = f;
        });
        const flowAtMain = bestSubFlow * subCount;
        if (flowAtMain > bestMainFlow) {
            bestMainFlow = flowAtMain;
            bestMainId = m.id;
            bestMainSubCount = subCount;
        }
    });

    // Fallback: if no flow found, still pick the physically longest connected main (for ID/connection info)
    if (bestMainId === null && connectedMains.length > 0) {
        const longest = connectedMains.reduce<{ m: Pipe | null; len: number }>((acc, cur) => {
            const len = pipeLength(cur);
            if (len > acc.len) return { m: cur, len };
            return acc;
        }, { m: null, len: -1 }).m;
        if (longest) {
            const mid = String(longest.id);
            bestMainId = longest.id;
            bestMainSubCount = (mainIdToSubIds[mid] || []).length;
        }
    }

    return {
        main: { longestId: bestMainId, connectedSubmains: bestMainSubCount, flowLMin: bestMainFlow },
        submain: { longestId: subLongest?.id ?? null, connectedLaterals: subLongestStats.latCount, flowLMin: subLongestStats.flow },
        lateral: { longestId: latLongest?.id ?? null, sprinklers: latLongestUnits, flowLMin: latLongestFlow },
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
                if ('lat' in coord && 'lng' in coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
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
        console.log(`🔍 Zone ${zone.name} irrigation calculation:`, {
            zoneId: zone.id,
            totalPointsInZone: sprinklerCount + dripTapeCount,
            sprinkler: sprinklerCount,
            dripTape: dripTapeCount,
            totalIrrigationPoints: irrigationPoints.length
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
    const [calculatedZoneSummaries, setCalculatedZoneSummaries] = useState<Record<string, ZoneSummary>>({});

    // Enhanced state for Google Maps and image capture
    const [mapImageCaptured, setMapImageCaptured] = useState<boolean>(false);
    const [isCapturingImage, setIsCapturingImage] = useState<boolean>(false);
    const [captureStatus, setCaptureStatus] = useState<string>('');
    const googleMapRef = useRef<google.maps.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const [zoneDetailsOpen, setZoneDetailsOpen] = useState<Record<string, boolean>>({});
    const [zoneLateralDetailsOpen, setZoneLateralDetailsOpen] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Prefer Inertia props first (normalize JSON strings if POSTed)
        if (
            inertiaProps &&
            (inertiaProps.pipes || inertiaProps.zones || inertiaProps.mainField || inertiaProps.selectedCrops)
        ) {
            try {
                const normalized: FieldCropSummaryProps = {
                    ...inertiaProps,
                    selectedCrops:
                        Array.isArray(inertiaProps.selectedCrops)
                            ? inertiaProps.selectedCrops
                            : (typeof inertiaProps.selectedCrops === 'string'
                                ? (inertiaProps.selectedCrops as unknown as string)
                                      .split(',')
                                      .map((s) => s.trim())
                                      .filter(Boolean)
                                : inertiaProps.selectedCrops),
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
                        typeof (inertiaProps as Partial<FieldCropSummaryProps>).obstacles === 'string'
                            ? JSON.parse((inertiaProps as Partial<FieldCropSummaryProps>).obstacles as unknown as string)
                            : (inertiaProps as Partial<FieldCropSummaryProps>).obstacles,
                    equipment:
                        typeof (inertiaProps as Partial<FieldCropSummaryProps>).equipment === 'string'
                            ? JSON.parse((inertiaProps as Partial<FieldCropSummaryProps>).equipment as unknown as string)
                            : (inertiaProps as Partial<FieldCropSummaryProps>).equipment,
                    equipmentIcons:
                        typeof (inertiaProps as Partial<FieldCropSummaryProps>).equipmentIcons === 'string'
                            ? JSON.parse((inertiaProps as Partial<FieldCropSummaryProps>).equipmentIcons as unknown as string)
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
                } as FieldCropSummaryProps;
                const derivedIrrigationPoints = (
                    Array.isArray(normalized.irrigationPoints) && normalized.irrigationPoints.length > 0
                )
                    ? normalized.irrigationPoints
                    : (() => {
                        const irrigationPositions = (normalized as Partial<FieldCropSummaryProps> & { 
                            irrigationPositions?: { 
                                sprinklers?: { lat: number; lng: number }[];
                                pivots?: { lat: number; lng: number }[];
                                dripTapes?: { lat: number; lng: number }[];
                                waterJets?: { lat: number; lng: number }[];
                            } 
                        }).irrigationPositions;
                        
                        const points: IrrigationPoint[] = [];
                        
                        // Add sprinklers
                        if (Array.isArray(irrigationPositions?.sprinklers)) {
                            irrigationPositions.sprinklers.forEach((s, i) => {
                                points.push({ id: `sprinkler-${i}`, lat: s.lat, lng: s.lng, type: 'sprinkler' });
                            });
                        }
                        
                        // Add pivots
                        if (Array.isArray(irrigationPositions?.pivots)) {
                            irrigationPositions.pivots.forEach((p, i) => {
                                points.push({ id: `pivot-${i}`, lat: p.lat, lng: p.lng, type: 'pivot' });
                            });
                        }
                        
                        // Add drip tapes
                        if (Array.isArray(irrigationPositions?.dripTapes)) {
                            irrigationPositions.dripTapes.forEach((d, i) => {
                                points.push({ id: `dripTape-${i}`, lat: d.lat, lng: d.lng, type: 'drip_tape' });
                            });
                        }
                        
                        // Add water jets
                        if (Array.isArray(irrigationPositions?.waterJets)) {
                            irrigationPositions.waterJets.forEach((w, i) => {
                                points.push({ id: `waterJet-${i}`, lat: w.lat, lng: w.lng, type: 'water_jet_tape' });
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
                    equipment: (normalized as Partial<FieldCropSummaryProps>).equipment ?? (normalized as Partial<FieldCropSummaryProps>).equipmentIcons ?? [],
                    equipmentIcons: (normalized as Partial<FieldCropSummaryProps>).equipmentIcons ?? (normalized as Partial<FieldCropSummaryProps>).equipment ?? []
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
                                derivedSelectedCrops = decodeURIComponent(match[1]).split(',').map((s) => s.trim()).filter(Boolean);
                            }
                        } catch { /* noop */ }
                    }
                    const derivedIrrigationPoints = (
                        Array.isArray(parsedData.irrigationPoints) && parsedData.irrigationPoints.length > 0
                    )
                        ? parsedData.irrigationPoints
                        : (() => {
                            const irrigationPositions = (parsedData as Partial<FieldCropSummaryProps> & { 
                                irrigationPositions?: { 
                                    sprinklers?: { lat: number; lng: number }[];
                                    pivots?: { lat: number; lng: number }[];
                                    dripTapes?: { lat: number; lng: number }[];
                                    waterJets?: { lat: number; lng: number }[];
                                } 
                            }).irrigationPositions;
                            
                            const points: IrrigationPoint[] = [];
                            
                            // Add sprinklers
                            if (Array.isArray(irrigationPositions?.sprinklers)) {
                                irrigationPositions.sprinklers.forEach((s, i) => {
                                    points.push({ id: `sprinkler-${i}`, lat: s.lat, lng: s.lng, type: 'sprinkler' });
                                });
                            }
                            
                            // Add pivots
                            if (Array.isArray(irrigationPositions?.pivots)) {
                                irrigationPositions.pivots.forEach((p, i) => {
                                    points.push({ id: `pivot-${i}`, lat: p.lat, lng: p.lng, type: 'pivot' });
                                });
                            }
                            
                            // Add drip tapes
                            if (Array.isArray(irrigationPositions?.dripTapes)) {
                                irrigationPositions.dripTapes.forEach((d, i) => {
                                    points.push({ id: `dripTape-${i}`, lat: d.lat, lng: d.lng, type: 'drip_tape' });
                                });
                            }
                            
                            // Add water jets
                            if (Array.isArray(irrigationPositions?.waterJets)) {
                                irrigationPositions.waterJets.forEach((w, i) => {
                                    points.push({ id: `waterJet-${i}`, lat: w.lat, lng: w.lng, type: 'water_jet_tape' });
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
                        equipment: (parsedData as FieldCropSummaryProps).equipment ?? (parsedData as FieldCropSummaryProps).equipmentIcons ?? [],
                        equipmentIcons: (parsedData as FieldCropSummaryProps).equipmentIcons ?? (parsedData as FieldCropSummaryProps).equipment ?? []
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
    }, [summaryData, mapImageCaptured, isCapturingImage, handleCaptureMapImage]);

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

    const actualZones = useMemo(() => (Array.isArray(zones) ? zones : []), [zones]);
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
                typeof e.lat === 'number' && Number.isFinite(e.lat) &&
                typeof e.lng === 'number' && Number.isFinite(e.lng)
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
                    const parsed = JSON.parse(fieldDataStr) as Partial<{ equipment: Equipment[]; equipmentIcons: Equipment[] }> | null;
                    const storageEquip = Array.isArray(parsed?.equipment) ? parsed!.equipment : [];
                    const storageIcons = Array.isArray(parsed?.equipmentIcons) ? parsed!.equipmentIcons : [];
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
    const actualIrrigationPoints = useMemo(() => (
        Array.isArray(irrigationPoints) ? irrigationPoints : []
    ), [irrigationPoints]);

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
            const fromProps = (summaryData as Partial<FieldCropSummaryProps> | null)?.irrigationSettings as unknown as Record<string, { flow?: number; coverageRadius?: number; pressure?: number }> | undefined;
            if (fromProps && typeof fromProps === 'object') return fromProps;
            const data = localStorage.getItem('fieldCropData');
            if (!data) return {} as Record<string, { flow?: number; coverageRadius?: number; pressure?: number }>;
            const parsed = JSON.parse(data) as { irrigationSettings?: Record<string, { flow?: number; coverageRadius?: number; pressure?: number }> } | null;
            return parsed?.irrigationSettings || ({} as Record<string, { flow?: number; coverageRadius?: number; pressure?: number }>);
        } catch {
            return {} as Record<string, { flow?: number; coverageRadius?: number; pressure?: number }>;
        }
    }, [summaryData]);

    // Build global pipe network connectivity & flow summary
    const pipeNetworkSummary = useMemo(() => {
        try {
            return buildPipeNetworkSummary(actualPipes, actualIrrigationPoints, irrigationSettingsData || {});
        } catch {
            return { mains: [], counts: { main: 0, submain: 0, lateral: 0 } } as PipeNetworkSummary;
        }
    }, [actualPipes, actualIrrigationPoints, irrigationSettingsData]);

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
            console.log('🧮 Starting zone calculations with cropData (per irrigation)...');
            console.log('🔧 Available pipes for zone calculation:', pipes);
            console.log('🎯 Available zones:', zones);

            const newZoneSummaries: Record<string, ZoneSummary> = {};
            const zAssign: Record<string, string> = (zoneAssignments && typeof zoneAssignments === 'object') ? (zoneAssignments as Record<string, string>) : {};
            const iAssign: Record<string, string> = (irrigationAssignments && typeof irrigationAssignments === 'object') ? (irrigationAssignments as Record<string, string>) : {};

            // ดึงจุดปลูกจริง (plant points) จาก props หรือตกลง localStorage ถ้าไม่มีใน props
            let actualPlantPoints: Array<{ lat: number; lng: number }> = [];
            try {
                const maybePlants = (summaryData as unknown as { plantPoints?: { lat: number; lng: number }[] } | null)?.plantPoints;
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

            zones.forEach((zone: Zone) => {
                const zoneId = zone.id.toString();
                let assignedCropValue = zone.cropType || zAssign[zoneId];
                // ถ้าโซนยังไม่ได้กำหนดพืช ให้ fallback เป็นพืชตัวแรกที่เลือกจาก choose-crop (ถ้ามี)
                if (!assignedCropValue) {
                    const firstSelected = Array.isArray(summaryData?.selectedCrops) && summaryData.selectedCrops.length > 0
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

                        // คำนวณจำนวนจุดปลูกจากท่อย่อยที่มีอยู่จริง (ถ้ามี)
                        // ถ้าไม่มีท่อย่อย ให้คำนวณจากพื้นที่โซน
                        let totalPlantingPoints = 0;
                        // นับจำนวนจุดปลูกจริงภายในโซน (ถ้ามีข้อมูล)
                        let actualPlantsInZone = 0;
                        try {
                            if (Array.isArray(zone.coordinates) && zone.coordinates.length >= 3 && actualPlantPoints.length > 0) {
                                const zoneCoords = zone.coordinates.map((c) => [c.lng, c.lat]);
                                // ปิด polygon หากยังไม่ปิด
                                if (zoneCoords.length >= 3) {
                                    const first = zoneCoords[0];
                                    const last = zoneCoords[zoneCoords.length - 1];
                                    if (first[0] !== last[0] || first[1] !== last[1]) zoneCoords.push(first);
                                }
                                const zonePolygon = turf.polygon([zoneCoords as [number, number][]]);
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
                            totalPlantingPoints = calculatePlantingPoints(zoneArea, crop, effectiveRowSpacing, effectivePlantSpacing);
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
                        const calculationMethod = pipes && pipes.length > 0 ? 'จากท่อย่อย' : 'จากพื้นที่โซน';
                        
                        console.log(
                            `📊 Zone ${zone.name} calculations with cropData (per irrigation):`,
                            {
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
                            }
                        );
                    }
                } else {
                    // คำนวณจำนวนสปริงเกอร์ในโซนนี้ (แม้ไม่มีพืชปลูก)
                    const zoneIrrigationCounts = calculateZoneIrrigationCounts(
                        zone,
                        actualIrrigationPoints
                    );
                    // ลองใช้ fallback crop อีกครั้งเพื่อกำหนดข้อมูลโซนให้ครบถ้วน
                    const fallbackCropValue = (Array.isArray(summaryData?.selectedCrops) && summaryData.selectedCrops.length > 0)
                        ? summaryData.selectedCrops[0]
                        : null;
                    const fallbackCrop = fallbackCropValue ? getCropByValue(fallbackCropValue) : undefined;

                    if (fallbackCrop && zone.coordinates) {
                        const zoneArea = calculateZoneArea(zone.coordinates);
                        const effectiveRowSpacing = rowSpacing[fallbackCropValue!]
                            ? rowSpacing[fallbackCropValue!]
                            : fallbackCrop.rowSpacing;
                        const effectivePlantSpacing = plantSpacing[fallbackCropValue!]
                            ? plantSpacing[fallbackCropValue!]
                            : fallbackCrop.plantSpacing;
                        // เริ่มจากจำนวนคำนวณตาม spacing แล้ว fallback ในภายหลังถ้าจากท่อย่อยเป็น 0
                        let totalPlantingPoints = calculatePlantingPoints(zoneArea, fallbackCrop, effectiveRowSpacing, effectivePlantSpacing);
                        // นับจำนวนจุดปลูกจริงภายในโซน (ถ้ามีข้อมูล)
                        try {
                            if (Array.isArray(zone.coordinates) && zone.coordinates.length >= 3 && actualPlantPoints.length > 0) {
                                const zoneCoords = zone.coordinates.map((c) => [c.lng, c.lat]);
                                if (zoneCoords.length >= 3) {
                                    const first = zoneCoords[0];
                                    const last = zoneCoords[zoneCoords.length - 1];
                                    if (first[0] !== last[0] || first[1] !== last[1]) zoneCoords.push(first);
                                }
                                const zonePolygon = turf.polygon([zoneCoords as [number, number][]]);
                                const actualPlantsInZone = actualPlantPoints.reduce((acc, pt) => {
                                    const p = turf.point([pt.lng, pt.lat]);
                                    return acc + (booleanPointInPolygon(p, zonePolygon) ? 1 : 0);
                                }, 0);
                                if (actualPlantsInZone > 0) totalPlantingPoints = actualPlantsInZone;
                            }
                        } catch {
                            // Error counting actual plant points in zone (fallback)
                            console.warn('Error counting actual plant points in zone (fallback)');
                        }
                        const { estimatedYield, estimatedPrice } = calculateYieldAndPrice(zoneArea, fallbackCrop);
                        const waterRequirementPerIrrigation = calculateWaterRequirement(totalPlantingPoints, fallbackCrop);

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
                                ? Math.round((calculateZoneArea(zone.coordinates) / 1600) * 100) / 100
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
            console.log(
                '✅ Zone calculations completed with cropData (per irrigation):',
                newZoneSummaries
            );
        }
    }, [
        summaryData,
        zones,
        zoneAssignments,
        rowSpacing,
        plantSpacing,
        irrigationAssignments,
        pipes,
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
                        if ('lat' in c && 'lng' in c && typeof c.lat === 'number' && typeof c.lng === 'number') {
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
                            if ('lat' in c && 'lng' in c && typeof c.lat === 'number' && typeof c.lng === 'number') {
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
    console.log('📊 Data received in summary:', {
        totalIrrigationPoints: actualIrrigationPoints.length,
        uniqueIrrigationPoints: uniqueIrrigationPoints.length,
        irrigationPointsByType: uniqueIrrigationPoints.reduce((acc: Record<string, number>, point: IrrigationPoint) => {
            acc[point.type] = (acc[point.type] || 0) + 1;
            return acc;
        }, {}),
        zones: actualZones.length,
        pipes: actualPipes.length,
        equipment: actualEquipmentIcons.length
    });

    // คำนวณจำนวน irrigation points รวมจากทุกโซน
    const zoneIrrigationCounts = actualZones.map(zone => 
        calculateZoneIrrigationCounts(zone, uniqueIrrigationPoints)
    );
    
    const sprinklerPoints = zoneIrrigationCounts.reduce((sum, counts) => sum + counts.sprinkler, 0);
    const pivotPoints = zoneIrrigationCounts.reduce((sum, counts) => sum + (counts.pivot || 0), 0);
    const waterJetPoints = zoneIrrigationCounts.reduce((sum, counts) => sum + (counts.waterJetTape || 0), 0);
    const dripPoints = zoneIrrigationCounts.reduce((sum, counts) => sum + counts.dripTape, 0);

    // Debug: ตรวจสอบการคำนวณจำนวน irrigation points รวม
    console.log('🔍 Total irrigation points calculation:', {
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
            total: counts.total
        }))
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
        .filter((equipment, index, array) => array.findIndex((e) => e.id === equipment.id) === index)
        .filter((e) => e.type === 'pump' || e.type === 'water_pump');
    const pumpCount = uniqueEquipment.length;

    // Persist merged equipment to localStorage so pump markers remain across navigation
    useEffect(() => {
        try {
            const fieldDataStr = localStorage.getItem('fieldCropData');
            const parsed = fieldDataStr ? JSON.parse(fieldDataStr) as Record<string, unknown> : {};
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
            const existingIcons = isEquipmentArray((parsed as { equipmentIcons?: unknown }).equipmentIcons)
                ? (parsed as { equipmentIcons: Equipment[] }).equipmentIcons
                : [];

            // Build pumps from uniqueEquipment, keep other equipment as-is
            const pumpEquip: Equipment[] = (uniqueEquipment || [])
                .filter((e) => (e && (e.type === 'pump' || e.type === 'water_pump') && typeof e.lat === 'number' && typeof e.lng === 'number'))
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

    const totalEstimatedYield = Object.values(calculatedZoneSummaries).reduce((sum: number, summary: ZoneSummary) => sum + (summary.estimatedYield || 0), 0);
    // Financial estimation removed in simplified summary
    // const totalEstimatedIncome = Object.values(calculatedZoneSummaries).reduce((sum: number, summary: ZoneSummary) => sum + (summary.estimatedPrice || 0), 0);
    const totalPlantingPoints = Object.values(calculatedZoneSummaries).reduce((sum: number, summary: ZoneSummary) => sum + (summary.totalPlantingPoints || 0), 0);
    const totalWaterRequirementPerIrrigation = Object.values(calculatedZoneSummaries).reduce((sum: number, summary: ZoneSummary) => sum + (summary.waterRequirementPerIrrigation || 0), 0);

    // Actual plant points from Initial Area (fallback to localStorage if not provided)
    const actualPlantPointsInfo = useMemo(() => {
        try {
            let plants = (summaryData as unknown as { plantPoints?: { lat: number; lng: number }[] } | null)?.plantPoints || [];
            if ((!plants || plants.length === 0) && typeof window !== 'undefined') {
                const fieldDataStr = localStorage.getItem('fieldCropData');
                if (fieldDataStr) {
                    const parsed = JSON.parse(fieldDataStr);
                    if (parsed && Array.isArray(parsed.plantPoints)) plants = parsed.plantPoints;
                }
            }
            const count: number = Array.isArray(plants) ? plants.length : 0;

            const primaryCropValue = (summaryData?.selectedCrops && summaryData.selectedCrops[0]) ? summaryData.selectedCrops[0] : undefined;
            const crop = primaryCropValue ? getCropByValue(primaryCropValue) : undefined;
            const perPlantWaterLPerDay = crop?.waterRequirement ?? 0; // liters/plant/day
            const totalWaterLPerDay = count * perPlantWaterLPerDay;

            // Estimate revenue per plant based on yield per rai and spacing (cm)
            const rowCm = (primaryCropValue && summaryData?.rowSpacing && summaryData.rowSpacing[primaryCropValue] !== undefined)
                ? summaryData.rowSpacing[primaryCropValue]
                : (crop?.rowSpacing ?? 0);
            const plantCm = (primaryCropValue && summaryData?.plantSpacing && summaryData.plantSpacing[primaryCropValue] !== undefined)
                ? summaryData.plantSpacing[primaryCropValue]
                : (crop?.plantSpacing ?? 0);

            let yieldPerPlantKg = 0;
            let revenuePerPlant = 0;
            let estimatedTotalRevenue = 0;
            if (crop && rowCm > 0 && plantCm > 0) {
                const plantsPerRai = 16000000 / (rowCm * plantCm); // cm^2 basis
                if (plantsPerRai > 0) {
                    yieldPerPlantKg = crop.yield / plantsPerRai;
                    revenuePerPlant = yieldPerPlantKg * crop.price;
                    estimatedTotalRevenue = revenuePerPlant * count;
                }
            }

            return {
                count,
                cropName: crop?.name || primaryCropValue || '-',
                perPlantWaterLPerDay,
                totalWaterLPerDay,
                yieldPerPlantKg,
                revenuePerPlant,
                estimatedTotalRevenue
            };
        } catch {
            return { count: 0, cropName: '-', perPlantWaterLPerDay: 0, totalWaterLPerDay: 0, yieldPerPlantKg: 0, revenuePerPlant: 0, estimatedTotalRevenue: 0 };
        }
    }, [summaryData]);

    const areaInRai = fieldAreaSize / 1600;

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
                                {t('Please return to the Field Map page, complete the steps, and click "View Summary".')}
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
                                <h1 className="mb-1 text-3xl font-bold">📊 {t('Field Crop Summary')}</h1>
                                <p className="mb-2 text-gray-400">
                                    {t('Complete overview of your irrigation planning project')}
                                </p>
                            </div>

                            <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
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

                                {/* New Project Button */}
                                <Link
                                    href="/step4-pipe-system?currentStep=4&completedSteps=4"
                                    className="inline-flex transform items-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:from-blue-600 hover:to-indigo-600 hover:shadow-lg"
                                >
                                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
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
                                    <span>{t('Image capture status:')} {captureStatus}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Print header - only visible when printing */}
            <div className="hidden print:mb-4 print:block">
                <h1 className="text-2xl font-bold text-black">📊 {t('Field Crop Summary')}</h1>
                <p className="text-gray-600">{t('Generated on {date}').replace('{date}', new Date().toLocaleDateString())}</p>
                <hr className="my-2 border-gray-300" />
            </div>

            {/* Scrollable Main Content */}
            <div className="print:print-layout">
                <div className="container mx-auto px-4 py-4">
                    <div className="mx-auto max-w-7xl print:max-w-none">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-2 print:gap-6">
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
                                                {sprinklerPoints + pivotPoints + waterJetPoints + dripPoints + dripLines}
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
                                                            {(irrigationSettingsData?.sprinkler_system?.flow ?? 0).toLocaleString()} {t('L/min')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            {t('Radius:')}{' '}
                                                        </span>
                                                        <span className="font-medium text-cyan-300 print:text-black">
                                                            {(irrigationSettingsData?.sprinkler_system?.coverageRadius ?? 0).toLocaleString()} {t('m.')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            {t('Pressure:')}{' '}
                                                        </span>
                                                        <span className="font-medium text-cyan-300 print:text-black">
                                                            {(irrigationSettingsData?.sprinkler_system?.pressure ?? 0).toFixed(1)} {t('bar')}
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
                                                        {t('Total longest pipe combined length:')}{' '}
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
                                    <div className="mb-3">
                                        <h3 className="mb-2 text-sm font-semibold text-orange-400 print:text-xs print:text-black">
                                            ⚙️ {t('Equipment')}
                                        </h3>
                                        <div className="grid grid-cols-1 gap-1">
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-orange-400">
                                                    {pumpCount}
                                                </div>
                                                <div className="text-xs text-gray-400">{t('Pumps')}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <div className="text-xs font-semibold text-gray-300 mb-2">
                                            {t('Fittings')} (2/3/4 {t('way')})
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="bg-gray-700/40 border border-gray-600/50 rounded p-2">
                                                <div className="text-sm font-bold text-gray-200">{fittings.twoWay.toLocaleString()}</div>
                                                <div className="text-[11px] text-gray-300">{t('2-way')}</div>
                                            </div>
                                            <div className="bg-gray-700/40 border border-gray-600/50 rounded p-2">
                                                <div className="text-sm font-bold text-gray-200">{fittings.threeWay.toLocaleString()}</div>
                                                <div className="text-[11px] text-gray-300">{t('3-way')}</div>
                                            </div>
                                            <div className="bg-gray-700/40 border border-gray-600/50 rounded p-2">
                                                <div className="text-sm font-bold text-gray-200">{fittings.fourWay.toLocaleString()}</div>
                                                <div className="text-[11px] text-gray-300">{t('4-way')}</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            <div>
                                                <div className="text-xs font-semibold text-gray-300 mb-1">{t('Main')}</div>
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="bg-gray-700/30 border border-gray-600/40 rounded p-2">
                                                        <div className="text-sm font-bold text-gray-200">{fittings.breakdown.main.twoWay}</div>
                                                        <div className="text-[11px] text-gray-300">{t('2-way')}</div>
                                                    </div>
                                                    <div className="bg-gray-700/30 border border-gray-600/40 rounded p-2">
                                                        <div className="text-sm font-bold text-gray-200">{fittings.breakdown.main.threeWay}</div>
                                                        <div className="text-[11px] text-gray-300">{t('3-way')}</div>
                                                    </div>
                                                    <div className="bg-gray-700/30 border border-gray-600/40 rounded p-2 opacity-60">
                                                        <div className="text-sm font-bold text-gray-200">0</div>
                                                        <div className="text-[11px] text-gray-300">{t('4-way')}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-300 mb-1">{t('Submain')}</div>
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="bg-gray-700/30 border border-gray-600/40 rounded p-2">
                                                        <div className="text-sm font-bold text-gray-200">{fittings.breakdown.submain.twoWay}</div>
                                                        <div className="text-[11px] text-gray-300">{t('2-way')}</div>
                                                    </div>
                                                    <div className="bg-gray-700/30 border border-gray-600/40 rounded p-2">
                                                        <div className="text-sm font-bold text-gray-200">{fittings.breakdown.submain.threeWay}</div>
                                                        <div className="text-[11px] text-gray-300">{t('3-way')}</div>
                                                    </div>
                                                    <div className="bg-gray-700/30 border border-gray-600/40 rounded p-2">
                                                        <div className="text-sm font-bold text-gray-200">{fittings.breakdown.submain.fourWay}</div>
                                                        <div className="text-[11px] text-gray-300">{t('4-way')}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-300 mb-1">{t('Lateral')}</div>
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="bg-gray-700/30 border border-gray-600/40 rounded p-2">
                                                        <div className="text-sm font-bold text-gray-200">{fittings.breakdown.lateral.twoWay}</div>
                                                        <div className="text-[11px] text-gray-300">{t('2-way')}</div>
                                                    </div>
                                                    <div className="bg-gray-700/30 border border-gray-600/40 rounded p-2">
                                                        <div className="text-sm font-bold text-gray-200">{fittings.breakdown.lateral.threeWay}</div>
                                                        <div className="text-[11px] text-gray-300">{t('3-way')}</div>
                                                    </div>
                                                    <div className="bg-gray-700/30 border border-gray-600/40 rounded p-2 opacity-60">
                                                        <div className="text-sm font-bold text-gray-200">0</div>
                                                        <div className="text-[11px] text-gray-300">{t('4-way')}</div>
                                                    </div>
                                                </div>
                                            </div>
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
                                                {sprinklerPoints + pivotPoints + waterJetPoints + dripPoints + dripLines}{' '}
                                                จุด
                                            </div>
                                        </div>
                                        {/* Global Pipe Network Summary under Irrigation System */}
                                        <div className="mt-3 space-y-2 rounded bg-gray-700/40 p-2 print:border">
                                            <div className="text-xs font-semibold text-gray-200 mb-1">
                                                {t('Pipe Network Summary')}
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="rounded bg-gray-700/30 p-2 border border-gray-600/40">
                                                    <div className="text-sm font-bold text-blue-300">{pipeNetworkSummary.counts.main}</div>
                                                    <div className="text-[11px] text-gray-300">{t('Main')}</div>
                                                </div>
                                                <div className="rounded bg-gray-700/30 p-2 border border-gray-600/40">
                                                    <div className="text-sm font-bold text-green-300">{pipeNetworkSummary.counts.submain}</div>
                                                    <div className="text-[11px] text-gray-300">{t('Submain')}</div>
                                                </div>
                                                <div className="rounded bg-gray-700/30 p-2 border border-gray-600/40">
                                                    <div className="text-sm font-bold text-purple-300">{pipeNetworkSummary.counts.lateral}</div>
                                                    <div className="text-[11px] text-gray-300">{t('Lateral')}</div>
                                                </div>
                                            </div>
                                            {/* Per-main aggregation: outlets (connections) */}
                                            <div className="space-y-1 mt-2">
                                                {pipeNetworkSummary.mains.length === 0 ? (
                                                    <div className="text-[11px] text-gray-400">{t('No main pipes')}</div>
                                                ) : (
                                                    pipeNetworkSummary.mains.map((m) => {
                    const subCount = m.submains.length;
                    const latTotal = m.submains.reduce((s, sm) => s + sm.laterals.length, 0);
                    return (
                        <div key={String(m.id)} className="rounded bg-gray-700/30 p-2 text-xs border border-gray-600/40">
                            <div className="flex items-center justify-between">
                                <div className="text-blue-300">{t('Main')}</div>
                                <div className="text-right text-gray-200">
                                    <span className="mr-3">{t('Submain')}: <span className="font-semibold text-green-300">{subCount}</span></span>
                                    <span className="mr-3">{t('Lateral')}: <span className="font-semibold text-purple-300">{latTotal}</span></span>
                                    <span className="font-semibold text-cyan-200">{m.totalFlowLMin.toLocaleString()} {t('L/min')}</span>
                                </div>
                            </div>
                            {/* Submain → Lateral counts */}
                            <div className="mt-1 space-y-1">
                                {m.submains.map((sm) => (
                                    <div key={String(sm.id)} className="rounded bg-gray-700/10 p-1">
                                        <div className="flex items-center justify-between">
                                            <div className="text-green-300">{t('Submain')}</div>
                                            <div className="text-gray-200">
                                                <span className="mr-3">{t('Lateral')}: <span className="font-semibold text-purple-300">{sm.laterals.length}</span></span>
                                                <span className="font-semibold text-cyan-200">{sm.totalFlowLMin.toLocaleString()} {t('L/min')}</span>
                                            </div>
                                        </div>
                                        {/* Lateral → Sprinkler counts (distribution only, no individual names) */}
                                        {sm.laterals.length > 0 && (
                                            <div className="mt-1 text-[11px] text-gray-300">
                                                {(() => {
                                                    type Bucket = { count: number; totalFlow: number };
                                                    const buckets = new Map<number, Bucket>();
                                                    sm.laterals.forEach((li) => {
                                                        const spr = (li.unitsByType && li.unitsByType['sprinkler']) ? li.unitsByType['sprinkler'] : 0;
                                                        const cur = buckets.get(spr) || { count: 0, totalFlow: 0 };
                                                        cur.count += 1;
                                                        cur.totalFlow += (li.flowLMin || 0);
                                                        buckets.set(spr, cur);
                                                    });
                                                    const rows = Array.from(buckets.entries()).sort((a, b) => b[0] - a[0]);
                                                    return (
                                                        <div className="rounded bg-gray-700/5 p-1">
                                                            {rows.map(([sprCount, val], i) => (
                                                                <div key={i} className="flex items-center justify-between">
                                                                    <div>{val.count} × {sprCount} {t('Sprinklers')}</div>
                                                                    <div className="font-semibold text-cyan-200">{Math.round(val.totalFlow).toLocaleString()} {t('L/min')}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
                                                )}
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
                                                💧 {t('Total Water Requirements (liters per irrigation - from cropData)')}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                        {t('Total Farm Area:')} {areaInRai.toFixed(2)} {t('Rai')}
                                                    </div>
                                                    <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                        {t('Total Plants:')} {totalPlantingPoints.toLocaleString()} {t('trees')}
                                                    </div>
                                                    <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                        {t('Active Zones:')} {Object.values(calculatedZoneSummaries).filter((summary: ZoneSummary) => summary.cropValue).length} {t('zones')}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[11px] text-cyan-200 print:text-cyan-700">{t('Water need')}</div>
                                                    <div className="text-2xl font-extrabold tracking-tight text-cyan-100 print:text-cyan-800">{totalWaterRequirementPerIrrigation.toLocaleString()} <span className="text-base font-semibold opacity-80">{t('L/irrigation')}</span></div>
                                                    <div className="text-[11px] text-cyan-200 print:text-cyan-700">({(totalWaterRequirementPerIrrigation / 1000).toFixed(1)} {t('m³/irrigation')})</div>
                                                </div>
                                            </div>

                                            <div className="mt-3 border-t border-cyan-700 pt-2 print:border-cyan-300">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <div className="text-xs font-medium text-cyan-200 print:text-cyan-700">{t('Water by zone')}</div>
                                                    <div className="text-[10px] text-cyan-300/70 print:text-cyan-700">{t('per irrigation')}</div>
                                                </div>
                                                <div className="max-h-32 space-y-1.5 overflow-y-auto pr-1">
                                                    {Object.values(calculatedZoneSummaries)
                                                        .filter((summary: ZoneSummary) => summary.cropValue)
                                                        .map((summary: ZoneSummary) => (
                                                            <div
                                                                key={summary.zoneId}
                                                                className="flex justify-between text-xs"
                                                            >
                                                                <span className="text-cyan-200 print:text-cyan-700">
                                                                    {summary.zoneName} (
                                                                    {summary.zoneAreaRai} {t('Rai')})
                                                                </span>
                                                                <span className="font-medium text-cyan-100 print:text-cyan-800">
                                                                    {summary.waterRequirementPerIrrigation.toLocaleString()}{' '}
                                                                    {t('Liters/irrigation')}
                                                                </span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>

                                            {/* Actual plant points summary (from Initial Area) */}
                                            <div className="mt-3 border-t border-cyan-700 pt-2 print:border-cyan-300">
                                                <div className="mb-2 text-xs font-medium text-cyan-200 print:text-cyan-700">
                                                    {t('Actual Plants & Daily Water (from Initial Area):')}
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="text-cyan-200 print:text-cyan-700">
                                                        {t('Plants')}: <span className="font-semibold">{actualPlantPointsInfo.count.toLocaleString()}</span> {t('trees')}
                                                    </div>
                                                    <div className="text-right text-cyan-200 print:text-cyan-700">
                                                        <div>{t('Per-plant water (day)')}: <span className="font-semibold">{actualPlantPointsInfo.perPlantWaterLPerDay.toFixed(2)}</span> {t('L/day')}</div>
                                                        <div>{t('Total water (day)')}: <span className="font-semibold">{actualPlantPointsInfo.totalWaterLPerDay.toFixed(1)}</span> {t('L/day')}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 border-t border-cyan-700 pt-2 print:border-cyan-300">
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className="rounded bg-cyan-800/50 p-2 text-center print:bg-cyan-100">
                                                        <div className="text-cyan-200 print:text-cyan-700">
                                                            {t('Monthly')}
                                                        </div>
                                                        <div className="font-bold text-cyan-100 print:text-cyan-800">
                                                            {(
                                                                (totalWaterRequirementPerIrrigation *
                                                                    30) /
                                                                1000
                                                            ).toFixed(1)}
                                                        </div>
                                                        <div className="text-cyan-200 print:text-cyan-700">
                                                            {t('m³/month')}
                                                        </div>
                                                    </div>
                                                    <div className="rounded bg-cyan-800/50 p-2 text-center print:bg-cyan-100">
                                                        <div className="text-cyan-200 print:text-cyan-700">
                                                            {t('Yearly')}
                                                        </div>
                                                        <div className="font-bold text-cyan-100 print:text-cyan-800">
                                                            {(
                                                                (totalWaterRequirementPerIrrigation *
                                                                    365) /
                                                                1000
                                                            ).toFixed(0)}
                                                        </div>
                                                        <div className="text-cyan-200 print:text-cyan-700">
                                                            {t('m³/year')}
                                                        </div>
                                                    </div>
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
                                        🎯 {t('Zone Details & Irrigation Systems (liters per irrigation)')}
                                    </h2>
                                    <div className="space-y-3 print:space-y-2">
                                        {actualZones.map((zone) => {
                                            const summary = calculatedZoneSummaries[zone.id];
                                            const assignedCrop = zoneAssignments[zone.id]
                                                ? getCropByValue(zoneAssignments[zone.id])
                                                : null;
                                            const irrigationType = globalIrrigationType || irrigationAssignments[zone.id];
                                            // Read from precomputed map to avoid recomputation per render
                                            const zonePipeStats: ZonePipeStats =
                                                zonePipeStatsMap.get(zone.id.toString()) ?? {
                                                    main: { count: 0, totalLength: 0, longestLength: 0 },
                                                    submain: { count: 0, totalLength: 0, longestLength: 0 },
                                                    lateral: { count: 0, totalLength: 0, longestLength: 0 },
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
                                            console.log(`🔍 Zone ${zone.name} irrigation counts:`, {
                                                zoneId: zone.id,
                                                zoneName: zone.name,
                                                sprinkler: zoneIrrigationCounts.sprinkler,
                                                // miniSprinkler and microSpray removed
                                                dripTape: zoneIrrigationCounts.dripTape,
                                                total: zoneIrrigationCounts.total
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
                                                                    {getTranslatedCropByValue(assignedCrop.value, 'th')?.name || assignedCrop.name}
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
                                                                    setZoneDetailsOpen(prev => ({ ...prev, [key]: !(prev[key] !== false) }));
                                                                }}
                                                                className="rounded border border-gray-400/40 px-2 py-0.5 text-xs text-gray-200 hover:bg-gray-600/40"
                                                                title={(zoneDetailsOpen[zone.id.toString()] !== false) ? t('Hide details') : t('Show details')}
                                                            >
                                                                {(zoneDetailsOpen[zone.id.toString()] !== false) ? '▲' : '▼'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {(zoneDetailsOpen[zone.id.toString()] !== false) && (summary ? (
                                                        <div className="space-y-3">
                                                            {/* แสดงข้อมูลจำนวนสปริงเกอร์ในส่วนสรุปข้อมูลโซน */}
                                                            <div className="grid grid-cols-4 gap-2 text-xs">
                                                                <div className="rounded bg-gray-600 p-2 text-center print:bg-gray-100">
                                                                    <div className="text-gray-400 print:text-gray-600">
                                                                        {t('Area')}
                                                                    </div>
                                                                    <div className="font-semibold text-blue-400 print:text-black">
                                                                        {summary.zoneAreaRai} {t('Rai')}
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
                                                                        {zoneIrrigationCounts.total}
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
                                                                        {getTranslatedCropByValue(summary.cropValue || '', 'th')?.name || summary.cropName}
                                                                    </div>
                                                                    <div className="text-xs text-gray-400 print:text-gray-600">
                                                                        {summary.cropCategory}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="rounded-lg bg-cyan-900/30 p-3 print:border print:bg-cyan-50">
                                                                <h4 className="mb-2 text-sm font-semibold text-cyan-300 print:text-cyan-800">
                                                                    💧 {t('Water Requirements (liters per irrigation)')}
                                                                </h4>
                                                                <div className="mt-1 rounded bg-cyan-800/30 p-2 text-xs text-cyan-200 print:bg-cyan-100 print:text-cyan-700">
                                                                    <div className="mb-1 font-semibold text-base text-cyan-100">{t('Flowrate')}</div>
                                                                    {(() => {
                                                                        const flowPerUnit: Record<string, number> = {
                                                                            sprinkler: irrigationSettingsData?.sprinkler_system?.flow ?? 0,
                                                                            pivot: irrigationSettingsData?.pivot?.flow ?? 0,
                                                                            water_jet_tape: irrigationSettingsData?.water_jet_tape?.flow ?? 0,
                                                                            drip_tape: irrigationSettingsData?.drip_tape?.flow ?? 0,
                                                                        };
                                                                        const counts = calculateZoneIrrigationCounts(zone, actualIrrigationPoints);
                                                                        const rows: Array<{ label: string; units: number; flow: number; total: number }> = [];
                                                                        const pushRow = (label: string, units: number, key: string) => {
                                                                            if (units > 0) {
                                                                                const per = flowPerUnit[key] || 0;
                                                                                rows.push({ label, units, flow: per, total: units * per });
                                                                            }
                                                                        };
                                                                        pushRow(t('Sprinklers'), counts.sprinkler, 'sprinkler');
                                                                        pushRow(t('Pivots'), counts.pivot, 'pivot');
                                                                        pushRow(t('Water Jet Tape'), counts.waterJetTape, 'water_jet_tape');
                                                                        pushRow(t('Drip Tape'), counts.dripTape, 'drip_tape');
                                                                        const zoneTotal = rows.reduce((s, r) => s + r.total, 0);
                                                                        return (
                                                                            <div className="space-y-1">
                                                                                {rows.length === 0 ? (
                                                                                    <div className="text-cyan-300/70">{t('No flow data')}</div>
                                                                                ) : (
                                                                                    <>
                                                                                        {rows.map((r, i) => (
                                                                                            <div key={i} className="flex items-center justify-between">
                                                                                                <div>
                                                                                                    {r.label}: {r.units} {t('units')} × {r.flow.toLocaleString()} {t('L/min')}
                                                                                                </div>
                                                                                                <div className="font-bold">{r.total.toLocaleString()} {t('L/min')}</div>
                                                                                            </div>
                                                                                        ))}
                                                                                        <div className="mt-1 border-t border-cyan-700 pt-1 flex items-center justify-between print:border-cyan-300">
                                                                                            <div className="font-semibold">{t('Total flowrate')}</div>
                                                                                            <div className="text-2xl font-extrabold text-cyan-100">{zoneTotal.toLocaleString()} {t('L/min')}</div>
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
                                                                    🔧 {t('Irrigation System & Pipe Network')}
                                                                </h4>

                                                                <div className="mb-3">
                                                                    <div className="mb-1 text-xs font-medium text-blue-200 print:text-blue-700">
                                                                        {t('Irrigation Type:')}
                                                                    </div>
                                                                    <div className="text-sm font-semibold text-blue-100 print:text-blue-900">
                                                                        {formatIrrigationType(irrigationType)}
                                                                    </div>
                                                                </div>

                                                                {/* เพิ่มส่วนแสดงจำนวนสปริงเกอร์แต่ละประเภท (เหลือเฉพาะ Sprinklers) */}
                                                                <div className="mb-3">
                                                <div className="mb-2 text-xs font-medium text-blue-200 print:text-blue-700">
                                                    💧 {t('Irrigation Points in Zone:')}
                                                </div>
                                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                                        {zoneIrrigationCounts.sprinkler > 0 && (
                                                                            <div className="rounded bg-blue-700/20 p-2 text-center print:bg-blue-50">
                                                                                <div className="text-blue-200 print:text-blue-800">
                                                                                    🟢 {t('Sprinklers')} {zoneIrrigationCounts.sprinkler} {t('units')}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {zoneIrrigationCounts.pivot > 0 && (
                                                                            <div className="rounded bg-blue-700/20 p-2 text-center print:bg-blue-50">
                                                                                <div className="text-blue-200 print:text-blue-800">
                                                                                    🔄 {t('Pivots')} {zoneIrrigationCounts.pivot} {t('units')}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {zoneIrrigationCounts.waterJetTape > 0 && (
                                                                            <div className="rounded bg-blue-700/20 p-2 text-center print:bg-blue-50">
                                                                                <div className="text-blue-200 print:text-blue-800">
                                                                                    🌊 {t('Water Jet Tape')} {zoneIrrigationCounts.waterJetTape} {t('units')}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {zoneIrrigationCounts.dripTape > 0 && (
                                                                            <div className="rounded bg-blue-700/20 p-2 text-center print:bg-blue-50">
                                                                                <div className="text-blue-200 print:text-blue-800">
                                                                                    🟣 {t('Drip Tape')} {zoneIrrigationCounts.dripTape} {t('units')}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <div className="border-b border-blue-700 pb-1 text-xs font-medium text-blue-200 print:border-blue-300 print:text-blue-700">
                                                                        {t('Pipe System Details in Zone:')}
                                                                    </div>

                                                                    <div className="rounded border border-cyan-600 bg-cyan-800/40 p-3 print:border-cyan-300 print:bg-cyan-100">
                                                                        <div className="mb-3 text-center">
                                                                            <div className="text-sm font-bold text-cyan-200 print:text-cyan-800">
                                                                                📊 {t('Zone Pipe Summary')}
                                                                            </div>
                                                                        </div>

                                                                        <div className="mb-3">
                                                                            <div className="mb-2 grid grid-cols-4 gap-1 text-xs">
                                                                                <div className="font-medium text-cyan-200 print:text-cyan-700">
                                                                                    {t('Pipe type')}
                                                                                </div>
                                                                                <div className="text-center font-medium text-cyan-200 print:text-cyan-700">
                                                                                    {t('Count')}
                                                                                </div>
                                                                                <div className="text-center font-medium text-cyan-200 print:text-cyan-700">
                                                                                    {t('Longest (m)')}
                                                                                </div>
                                                                                <div className="text-center font-medium text-cyan-200 print:text-cyan-700">
                                                                                    {t('Total (m)')}
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <div className="grid grid-cols-4 gap-1 rounded bg-blue-700/20 p-1 text-xs print:bg-blue-50">
                                                                                    <div className="text-blue-200 print:text-blue-800">
                                                                                        🔵 {t('Main Pipes')}
                                                                                    </div>
                                                                                    <div className="text-center font-semibold text-blue-100 print:text-blue-900">
                                                                                        {
                                                                                            zonePipeStats
                                                                                                .main
                                                                                                .count
                                                                                        }
                                                                                    </div>
                                                                                    <div className="text-center font-semibold text-blue-100 print:text-blue-900">
                                                                                        {zonePipeStats.main.longestLength.toLocaleString()}
                                                                                    </div>
                                                                                    <div className="text-center font-semibold text-blue-100 print:text-blue-900">
                                                                                        {zonePipeStats.main.totalLength.toLocaleString()}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="grid grid-cols-4 gap-1 rounded bg-green-700/20 p-1 text-xs print:bg-green-50">
                                                                                    <div className="text-green-200 print:text-green-800">
                                                                                        🟢 {t('Submain Pipes')}
                                                                                    </div>
                                                                                    <div className="text-center font-semibold text-green-100 print:text-green-900">
                                                                                        {
                                                                                            zonePipeStats
                                                                                                .submain
                                                                                                .count
                                                                                        }
                                                                                    </div>
                                                                                    <div className="text-center font-semibold text-green-100 print:text-green-900">
                                                                                        {zonePipeStats.submain.longestLength.toLocaleString()}
                                                                                    </div>
                                                                                    <div className="text-center font-semibold text-green-100 print:text-green-900">
                                                                                        {zonePipeStats.submain.totalLength.toLocaleString()}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="grid grid-cols-4 gap-1 rounded bg-purple-700/20 p-1 text-xs print:bg-purple-50">
                                                                                    <div className="text-purple-200 print:text-purple-800">
                                                                                        🟣 {t('Lateral Pipes')}
                                                                                    </div>
                                                                                    <div className="text-center font-semibold text-purple-100 print:text-purple-900">
                                                                                        {
                                                                                            zonePipeStats
                                                                                                .lateral
                                                                                                .count
                                                                                        }
                                                                                    </div>
                                                                                    <div className="text-center font-semibold text-purple-100 print:text-purple-900">
                                                                                        {zonePipeStats.lateral.longestLength.toLocaleString()}
                                                                                    </div>
                                                                                    <div className="text-center font-semibold text-purple-100 print:text-purple-900">
                                                                                        {zonePipeStats.lateral.totalLength.toLocaleString()}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Lateral outlet details */}
                                                                        {(() => {
                                                                            try {
                                                                                // Zone-specific longest-pipe flow summary (display only, per request)
                                                                                const zFlows = buildZoneConnectivityLongestFlows(zone, actualPipes, actualIrrigationPoints, irrigationSettingsData || {});
                                                                                const header = (
                                                                                    <div className="mb-2 rounded bg-cyan-900/30 p-2 text-xs print:bg-cyan-50">
                                                                                        <div className="font-semibold text-cyan-200 print:text-cyan-800">{t('Longest pipe flowrates')}</div>
                                                                                        <div className="mt-1 space-y-0.5 text-cyan-100">
                                                                                            <div>
                                                                                                {t('Main')} ({t('longest')}): <span className="font-bold">{Math.round(zFlows.main.flowLMin).toLocaleString()} {t('L/min')}</span> — {t('Submain')}: {zFlows.main.connectedSubmains}
                                                                                            </div>
                                                                                            <div>
                                                                                                {t('Submain')} ({t('longest')}): <span className="font-bold">{Math.round(zFlows.submain.flowLMin).toLocaleString()} {t('L/min')}</span> — {t('Lateral')}: {zFlows.submain.connectedLaterals}
                                                                                            </div>
                                                                                            <div>
                                                                                                {t('Lateral')} ({t('longest')}): <span className="font-bold">{Math.round(zFlows.lateral.flowLMin).toLocaleString()} {t('L/min')}</span> — {t('Sprinklers')}: {zFlows.lateral.sprinklers}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                                // existing lateral outlets UI below
                                                                                const lateralPipes = actualPipes.filter((p) => {
                                                                                    if (identifyPipeType(p) !== 'lateral') return false;
                                                                                    const byId = (p.zoneId?.toString?.() || '') === zone.id.toString();
                                                                                    const byGeom = isPipeInZone(p, zone);
                                                                                    return byId || byGeom;
                                                                                });
                                                                                // Count sprinklers attached to each lateral by distance threshold
                                                                                const attachThresholdMeters = 1.5;
                                                                                const rows = lateralPipes.map((lat) => {
                                                                                    const coords = (lat.coordinates || [])
                                                                                        .map((c) => toLngLat(c))
                                                                                        .filter((v): v is [number, number] => v !== null);
                                                                                    const line = coords.length >= 2 ? turf.lineString(coords) : null;
                                                                                    const units = line
                                                                                        ? actualIrrigationPoints.filter((pt) => {
                                                                                            const type = normalizeIrrigationType(pt.type);
                                                                                            if (type !== 'sprinkler') return false;
                                                                                            if (typeof pt.lat !== 'number' || typeof pt.lng !== 'number') return false;
                                                                                            const point = turf.point([pt.lng, pt.lat]);
                                                                                            const distKm = pointToLineDistance(point, line as unknown as GeoFeature<GeoLineString>, { units: 'kilometers' });
                                                                                            return distKm * 1000 <= attachThresholdMeters;
                                                                                        }).length
                                                                                        : 0;
                                                                                    return { id: lat.id, units };
                                                                                });
                                                                                const most = rows.reduce<{ id: string | number | null; units: number }>((acc, r) => (r.units > acc.units ? { id: r.id, units: r.units } : acc), { id: null, units: -1 });
                                                                                const open = zoneLateralDetailsOpen[zone.id.toString()] || false;
                                                                                return (
                                                                                    <div className="mt-2 rounded bg-blue-800/20 p-2 print:bg-blue-100">
                                                                                        {/* Move header block outside Zone Pipe Summary, show here separately above outlets */}
                                                                                        {header}
                                                                                        <div className="mb-2 flex items-center justify-between">
                                                                                            <div className="text-xs font-semibold text-blue-200 print:text-blue-800">{t('Lateral outlets')}</div>
                                                                                            <button
                                                                                                onClick={() => setZoneLateralDetailsOpen((prev) => ({ ...prev, [zone.id.toString()]: !open }))}
                                                                                                className="rounded border border-blue-400/40 px-2 py-0.5 text-[11px] text-blue-100 hover:bg-blue-700/30 print:text-blue-900"
                                                                                            >
                                                                                                {open ? t('Hide') : t('View all')}
                                                                                            </button>
                                                                                        </div>
                                                                                        {!open ? (
                                                                                            <div className="text-xs text-blue-100 print:text-blue-900">
                                                                                                {t('Most outlets')}: <span className="font-bold">{(most.units < 0 ? 0 : most.units).toLocaleString()}</span> {t('sprinklers')}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="space-y-1">
                                                                                                {rows.length === 0 ? (
                                                                                                    <div className="text-xs text-blue-200/70 print:text-blue-800">{t('No laterals')}</div>
                                                                                                ) : (
                                                                                                    rows
                                                                                                        .sort((a, b) => b.units - a.units)
                                                                                                        .map((r) => (
                                                                                                            <div key={String(r.id)} className="flex items-center justify-between text-xs">
                                                                                                                <div className="text-blue-100 print:text-blue-900">{t('Lateral')} #{String(r.id)}</div>
                                                                                                                <div className="font-semibold text-blue-200 print:text-blue-800">{r.units.toLocaleString()} {t('sprinklers')}</div>
                                                                                                            </div>
                                                                                                        ))
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            } catch {
                                                                                return null;
                                                                            }
                                                                        })()}

                                                                        <div className="grid grid-cols-2 gap-2 border-t border-cyan-600 pt-2 text-xs print:border-cyan-300">
                                                                            <div className="rounded bg-cyan-700/30 p-2 text-center print:bg-cyan-50">
                                                                                <div className="mb-1 text-xs text-cyan-200 print:text-cyan-700">
                                                                                    {t('Total longest pipe combined:')}
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
                                                                                    {t('Total all pipe combined:')}
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
                                                                                {t('Total Pipes in Zone:')}{' '}
                                                                                <span className="font-bold text-cyan-100 print:text-cyan-900">
                                                                                    {
                                                                                        zonePipeStats.total
                                                                                    }{' '}
                                                                                    {t('pipes')}
                                                                                </span>
                                                                            </div>
                                                                        </div>
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
                                                                    No crop assigned to this zone
                                                                </div>
                                                                <div className="text-xs">
                                                                    Cannot calculate water
                                                                    requirements
                                                                </div>
                                                            </div>

                                                            {/* แสดงข้อมูลจำนวนสปริงเกอร์แม้ไม่มีพืชปลูก */}
                                                            <div className="rounded-lg bg-blue-900/30 p-3 print:border print:bg-blue-50">
                                                                <h4 className="mb-2 text-sm font-semibold text-blue-300 print:text-blue-800">
                                                                    💧 Irrigation Points in Zone:
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
                                                                        {zoneIrrigationCounts.total}{' '}
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

