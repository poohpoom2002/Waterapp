import { Head, Link, router } from '@inertiajs/react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { useState, useEffect, useRef } from 'react';
import * as turf from '@turf/turf';
import { getCropByValue } from '@/pages/utils/cropData';
import {
    calculateEnhancedFieldStats,
    saveEnhancedFieldCropData,
    FieldCropData,
} from '@/utils/fieldCropData';
import {
    PIPE_TYPES,
    EQUIPMENT_TYPES,
    type PipeType,
    type EquipmentType,
} from '@/pages/utils/fieldMapConstants';
import Navbar from '../components/Navbar';
import { useLanguage } from '../contexts/LanguageContext';

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
    miniSprinklerCount?: number;
    microSprayCount?: number;
    dripTapeCount?: number;
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
        if (!window.google?.maps) {
            const loadGoogleMaps = () => {
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}&libraries=geometry,drawing`;
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    setIsLoaded(true);
                };
                document.head.appendChild(script);
            };
            loadGoogleMaps();
        } else {
            setIsLoaded(true);
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

            // Draw pipes
            pipes.forEach((pipe) => {
                if (pipe.coordinates && Array.isArray(pipe.coordinates)) {
                    const pipeConfig = PIPE_TYPES[pipe.type as PipeType] || { color: '#888888', weight: 3 };

                    const pipePath = pipe.coordinates.map((coord: Coordinate) => {
                        if (Array.isArray(coord)) {
                            return { lat: coord[0], lng: coord[1] };
                        }
                        return { lat: coord.lat, lng: coord.lng };
                    });

                    new google.maps.Polyline({
                        path: pipePath,
                        geodesic: true,
                        strokeColor: pipeConfig.color,
                        strokeOpacity: 0.9,
                        strokeWeight: pipeConfig.weight,
                        map: map,
                    });
                }
            });

            // Draw equipment
            equipment.forEach((equip) => {
                if (equip.lat && equip.lng) {
                    const equipmentConfig = EQUIPMENT_TYPES[equip.type as EquipmentType];
                    if (equipmentConfig) {
                        new google.maps.Marker({
                            position: { lat: equip.lat, lng: equip.lng },
                            map: map,
                            title: equipmentConfig.name,
                            icon: {
                                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                    <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="14" cy="14" r="12" fill="white" stroke="${equipmentConfig.color}" stroke-width="2"/>
                                        <text x="14" y="18" text-anchor="middle" font-size="12" fill="${equipmentConfig.color}">${equipmentConfig.icon}</text>
                                    </svg>
                                `)}`,
                                scaledSize: new google.maps.Size(28, 28),
                                anchor: new google.maps.Point(14, 14),
                            },
                        });
                    }
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
        equipment,
        irrigationPoints,
        irrigationLines,
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
        console.log('🖼️ Starting map image capture...');

        // Check for html2canvas availability
        let html2canvas;
        try {
            html2canvas = (await import('html2canvas')).default;
        } catch (error) {
            console.error('❌ html2canvas not available:', error);
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
                
                // คำนวณระยะทางระหว่างจุด (ใช้ Haversine formula หรือ Google Maps API)
                const distance = google.maps.geometry.spherical.computeDistanceBetween(
                    new google.maps.LatLng(start.lat, start.lng),
                    new google.maps.LatLng(end.lat, end.lng)
                );
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

    console.log(`🔍 Checking pipes for zone ${zoneId} (${currentZone.name})...`);
    console.log(`📏 Total pipes to check: ${pipes.length}`);

    const zonePipes = pipes.filter((pipe) => {
        if (!pipe.coordinates || !Array.isArray(pipe.coordinates) || pipe.coordinates.length < 2) {
            return false;
        }

        const hasZoneId = pipe.zoneId && pipe.zoneId.toString() === zoneId;
        const isInZone = isPipeInZone(pipe, currentZone);

        const isZonePipe = hasZoneId || isInZone;

        if (isZonePipe) {
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

    console.log(`📊 Found ${zonePipes.length} pipes in zone ${zoneId}`);

    const mainPipes = zonePipes.filter((pipe) => identifyPipeType(pipe) === 'main');
    const submainPipes = zonePipes.filter((pipe) => identifyPipeType(pipe) === 'submain');
    const lateralPipes = zonePipes.filter((pipe) => identifyPipeType(pipe) === 'lateral');

    console.log(`🔵 Main pipes (สีน้ำเงิน): ${mainPipes.length}`);
    console.log(`🟢 Submain pipes (สีเขียว): ${submainPipes.length}`);
    console.log(`🟣 Lateral pipes (สีส้ม/ม่วง): ${lateralPipes.length}`);

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

    console.log(`📋 Zone ${zoneId} pipe stats:`, result);

    return result;
};

const normalizeIrrigationType = (type: string): string => {
    if (!type) return 'unknown';
    const normalizedType = type.toLowerCase().trim();
    const typeMapping: { [key: string]: string } = {
        sprinkler: 'sprinkler',
        'sprinkler-system': 'sprinkler',
        'mini-sprinkler': 'mini_sprinkler',
        mini_sprinkler: 'mini_sprinkler',
        minisprinkler: 'mini_sprinkler',
        'micro-spray': 'micro_spray',
        micro_spray: 'micro_spray',
        microspray: 'micro_spray',
        micro: 'micro_spray',
        microsprinkler: 'micro_spray',
        drip: 'drip_tape',
        'drip-tape': 'drip_tape',
        drip_tape: 'drip_tape',
        'drip-irrigation': 'drip_tape',
    };
    return typeMapping[normalizedType] || normalizedType;
};

// Add the missing calculateZoneIrrigationCounts function
const calculateZoneIrrigationCounts = (
    zone: Zone,
    irrigationPoints: IrrigationPoint[]
): {
    sprinkler: number;
    miniSprinkler: number;
    microSpray: number;
    dripTape: number;
    total: number;
} => {
    if (!zone.coordinates || !Array.isArray(zone.coordinates) || zone.coordinates.length < 3) {
        return { sprinkler: 0, miniSprinkler: 0, microSpray: 0, dripTape: 0, total: 0 };
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
            return { sprinkler: 0, miniSprinkler: 0, microSpray: 0, dripTape: 0, total: 0 };
        }

        const firstPoint = zoneCoords[0];
        const lastPoint = zoneCoords[zoneCoords.length - 1];
        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
            zoneCoords.push(firstPoint);
        }

        const zonePolygon = turf.polygon([zoneCoords]);

        let sprinklerCount = 0;
        let miniSprinklerCount = 0;
        let microSprayCount = 0;
        let dripTapeCount = 0;

        irrigationPoints.forEach((point) => {
            if (!point.lat || !point.lng) return;

            const pointGeometry = turf.point([point.lng, point.lat]);
            
            if (booleanPointInPolygon(pointGeometry, zonePolygon)) {
                const normalizedType = normalizeIrrigationType(point.type);
                
                switch (normalizedType) {
                    case 'sprinkler':
                        sprinklerCount++;
                        break;
                    case 'mini_sprinkler':
                        miniSprinklerCount++;
                        break;
                    case 'micro_spray':
                        microSprayCount++;
                        break;
                    case 'drip_tape':
                        dripTapeCount++;
                        break;
                    default:
                        // Default to sprinkler for unknown types
                        sprinklerCount++;
                        break;
                }
            }
        });

        const total = sprinklerCount + miniSprinklerCount + microSprayCount + dripTapeCount;

        return {
            sprinkler: sprinklerCount,
            miniSprinkler: miniSprinklerCount,
            microSpray: microSprayCount,
            dripTape: dripTapeCount,
            total: total,
        };
    } catch (error) {
        console.error('Error calculating zone irrigation counts:', error);
        return { sprinkler: 0, miniSprinkler: 0, microSpray: 0, dripTape: 0, total: 0 };
    }
};

export default function FieldCropSummary() {
    const { t } = useLanguage();
    const [summaryData, setSummaryData] = useState<FieldCropSummaryProps | null>(null);
    const [calculatedZoneSummaries, setCalculatedZoneSummaries] = useState<Record<string, ZoneSummary>>({});

    // Enhanced state for Google Maps and image capture
    const [mapImageCaptured, setMapImageCaptured] = useState<boolean>(false);
    const [isCapturingImage, setIsCapturingImage] = useState<boolean>(false);
    const [captureStatus, setCaptureStatus] = useState<string>('');
    const googleMapRef = useRef<google.maps.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const savedData = localStorage.getItem('fieldMapData');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (
                    parsedData &&
                    typeof parsedData === 'object' &&
                    (parsedData.mainField || (parsedData.zones && parsedData.zones.length > 0))
                ) {
                    console.log('📥 Using data from localStorage');
                    console.log('✅ Loaded data from localStorage:', parsedData);
                    setSummaryData(parsedData);
                } else {
                    console.warn('📥 Invalid or empty localStorage data structure');
                    setSummaryData(null);
                }
            } catch (error) {
                console.error('Error parsing saved data:', error);
                setSummaryData(null);
            }
        } else {
            console.warn('📥 No data found in localStorage');
            setSummaryData(null);
        }
    }, []);

    // Enhanced auto-capture with better timing and error handling
    useEffect(() => {
        if (summaryData && !mapImageCaptured && !isCapturingImage) {
            // Delay to ensure map is fully rendered and tiles are loaded
            const timer = setTimeout(() => {
                handleCaptureMapImage();
            }, 5000); // Increased delay for better reliability

            return () => clearTimeout(timer);
        }
    }, [summaryData, mapImageCaptured, isCapturingImage]);

    // Enhanced function to handle map image capture with better feedback
    const handleCaptureMapImage = async () => {
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
                        console.log('✅ Map image captured and verified for product page');

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
    };

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

    // Placeholder for Save Project functionality
    const handleSaveProject = () => {
        console.log('💾 Save Project button clicked.');
        alert(t('Project has been saved. (Placeholder)'));
        // In a real application, this would trigger an API call or more complex localStorage logic
    };

    const {
        mainField,
        fieldAreaSize = 0,
        zones = [],
        zoneAssignments = {},
        pipes = [],
        equipmentIcons = [],
        irrigationPoints = [],
        irrigationLines = [],
        irrigationAssignments = {},
        rowSpacing = {},
        plantSpacing = {},
        mapCenter = [14.5995, 120.9842],
        mapZoom = 18,
    } = summaryData || {};

    useEffect(() => {
        if (summaryData && zones.length > 0) {
            console.log('🧮 Starting zone calculations with cropData (per irrigation)...');
            console.log('🔧 Available pipes for zone calculation:', pipes);
            console.log('🎯 Available zones:', zones);

            const newZoneSummaries: Record<string, ZoneSummary> = {};

            zones.forEach((zone: Zone) => {
                const zoneId = zone.id.toString();
                const assignedCropValue = zoneAssignments[zoneId];

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
                        const totalPlantingPoints = pipes && pipes.length > 0
                            ? calculatePlantingPointsFromPipes(pipes, zoneId, crop, effectiveRowSpacing, effectivePlantSpacing)
                            : calculatePlantingPoints(zoneArea, crop, effectiveRowSpacing, effectivePlantSpacing);

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
                            irrigationType: irrigationAssignments[zoneId] || 'ไม่ได้กำหนด',
                            // เพิ่มข้อมูลจำนวนสปริงเกอร์
                            sprinklerCount: zoneIrrigationCounts.sprinkler,
                            miniSprinklerCount: zoneIrrigationCounts.miniSprinkler,
                            microSprayCount: zoneIrrigationCounts.microSpray,
                            dripTapeCount: zoneIrrigationCounts.dripTape,
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
                        irrigationType: irrigationAssignments[zoneId] || 'ไม่ได้กำหนด',
                        // เพิ่มข้อมูลจำนวนสปริงเกอร์
                        sprinklerCount: zoneIrrigationCounts.sprinkler,
                        miniSprinklerCount: zoneIrrigationCounts.miniSprinkler,
                        microSprayCount: zoneIrrigationCounts.microSpray,
                        dripTapeCount: zoneIrrigationCounts.dripTape,
                        totalIrrigationPoints: zoneIrrigationCounts.total,
                    };
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
        t,
    ]);

    const handleCalculateEquipment = () => {
        if (!summaryData) {
            alert(t('No project to calculate'));
            return;
        }

        console.log('🚀 Preparing data for product page...');

        const fieldData: FieldCropData = calculateEnhancedFieldStats(summaryData);
        saveEnhancedFieldCropData(fieldData);
        localStorage.setItem('projectType', 'field-crop');

        // Ensure image is saved before navigating
        if (!mapImageCaptured && !isCapturingImage) {
            handleCaptureMapImage().then(() => {
                console.log('Navigating to /product?mode=field-crop');
                router.visit('/product?mode=field-crop');
            });
        } else {
            console.log('Navigating to /product?mode=field-crop');
            router.visit('/product?mode=field-crop');
        }
    };

    const actualZones = Array.isArray(zones) ? zones : [];
    const actualPipes = Array.isArray(pipes) ? pipes : [];
    const actualEquipmentIcons = Array.isArray(equipmentIcons) ? equipmentIcons : [];
    const actualIrrigationPoints = Array.isArray(irrigationPoints) ? irrigationPoints : [];
    const actualIrrigationLines = Array.isArray(irrigationLines) ? irrigationLines : [];

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

    let filteredIrrigationPoints = uniqueIrrigationPoints;
    if (uniqueIrrigationPoints.length > 200) {
        filteredIrrigationPoints = uniqueIrrigationPoints.filter((_, index) => index % 3 === 0);
    } else if (uniqueIrrigationPoints.length > 100) {
        filteredIrrigationPoints = uniqueIrrigationPoints.filter((_, index) => index % 2 === 0);
    }

    const normalizedPoints = filteredIrrigationPoints.map((point) => ({
        ...point,
        normalizedType: normalizeIrrigationType(point.type),
    }));
    const sprinklerPoints = normalizedPoints.filter((p) => p.normalizedType === 'sprinkler').length;
    const miniSprinklerPoints = normalizedPoints.filter(
        (p) => p.normalizedType === 'mini_sprinkler'
    ).length;
    const microSprayPoints = normalizedPoints.filter(
        (p) => p.normalizedType === 'micro_spray'
    ).length;
    const dripPoints = normalizedPoints.filter((p) => p.normalizedType === 'drip_tape').length;

    const uniqueIrrigationLines = actualIrrigationLines.filter((line, index, array) => {
        if (!line || !line.id) return false;
        const firstIndex = array.findIndex((l) => l && l.id === line.id);
        return firstIndex === index;
    });
    const dripLines = uniqueIrrigationLines.filter(
        (l) => normalizeIrrigationType(l.type) === 'drip_tape'
    ).length;

    const totalZones = actualZones.length;

    const mainPipeStats = calculatePipeStats(actualPipes, 'main');
    const submainPipeStats = calculatePipeStats(actualPipes, 'submain');
    const lateralPipeStats = calculatePipeStats(actualPipes, 'lateral');

    const uniqueEquipment = actualEquipmentIcons.filter(
        (equipment, index, array) => array.findIndex((e) => e.id === equipment.id) === index
    );
    const pumpCount = uniqueEquipment.filter((e) => e.type === 'pump').length;
    const valveCount = uniqueEquipment.filter((e) => e.type === 'ballvalve').length;
    const solenoidCount = uniqueEquipment.filter((e) => e.type === 'solenoid').length;

    const totalEstimatedYield = Object.values(calculatedZoneSummaries).reduce((sum: number, summary: ZoneSummary) => sum + (summary.estimatedYield || 0), 0);
    const totalEstimatedIncome = Object.values(calculatedZoneSummaries).reduce((sum: number, summary: ZoneSummary) => sum + (summary.estimatedPrice || 0), 0);
    const totalPlantingPoints = Object.values(calculatedZoneSummaries).reduce((sum: number, summary: ZoneSummary) => sum + (summary.totalPlantingPoints || 0), 0);
    const totalWaterRequirementPerIrrigation = Object.values(calculatedZoneSummaries).reduce((sum: number, summary: ZoneSummary) => sum + (summary.waterRequirementPerIrrigation || 0), 0);

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
                                    href="/field-map?edit=true&step=4"
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

                                {/* Save Project Button */}
                                <button
                                    onClick={handleSaveProject}
                                    className="inline-flex transform items-center rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:from-teal-600 hover:to-cyan-600 hover:shadow-lg"
                                >
                                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                                    {t('Save Project')}
                                </button>

                                {/* New Project Button */}
                                <Link
                                    href="/field-map"
                                    className="inline-flex transform items-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:from-blue-600 hover:to-indigo-600 hover:shadow-lg"
                                >
                                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    {t('New Project')}
                                </Link>

                                <button
                                    onClick={handleCalculateEquipment}
                                    className="inline-flex transform items-center rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:from-purple-700 hover:to-blue-700 hover:shadow-lg"
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
                                            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                        />
                                    </svg>
                                    🧮 {t('Calculate Equipment')}
                                </button>
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
                                            style={{ minHeight: 300, height: '400px' }}
                                        >
                                            <GoogleMapsDisplay
                                                center={optimalCenter as [number, number]}
                                                zoom={optimalZoom}
                                                mainField={mainField}
                                                zones={actualZones}
                                                pipes={actualPipes}
                                                equipment={uniqueEquipment}
                                                irrigationPoints={filteredIrrigationPoints}
                                                irrigationLines={uniqueIrrigationLines}
                                                onMapReady={(map) => {
                                                    googleMapRef.current = map;
                                                    console.log('✅ Google Map ready for capture');
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
                                                    miniSprinklerPoints +
                                                    microSprayPoints +
                                                    dripPoints +
                                                    dripLines}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                สปริงเกอร์
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
                                        <div className="grid grid-cols-3 gap-1">
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-orange-400">
                                                    {pumpCount}
                                                </div>
                                                <div className="text-xs text-gray-400">{t('Pumps')}</div>
                                            </div>
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-red-400">
                                                    {valveCount}
                                                </div>
                                                <div className="text-xs text-gray-400">{t('Valves')}</div>
                                            </div>
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-yellow-400">
                                                    {solenoidCount}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {t('Solenoids')}
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
                                                <div className="text-sm font-bold text-blue-400">
                                                    {miniSprinklerPoints}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {t('Mini Sprinklers')}
                                                </div>
                                            </div>
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-orange-400">
                                                    {microSprayPoints}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {t('Micro Sprays')}
                                                </div>
                                            </div>
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-cyan-400">
                                                    {dripPoints + dripLines}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {t('Drip Points')}
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
                                                    miniSprinklerPoints +
                                                    microSprayPoints +
                                                    dripPoints +
                                                    dripLines}{' '}
                                                จุด
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial & Water Summary - keeping existing code with translation */}
                                <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                    <h2 className="mb-3 text-lg font-bold text-green-400 print:text-base print:text-black">
                                        💰 {t('Financial & Water Summary')}
                                    </h2>
                                    <div className="space-y-3 print:space-y-2">
                                        <div className="space-y-2">
                                            <div className="rounded-lg bg-gray-700 p-2 print:border print:bg-gray-50">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-400 print:text-gray-700">
                                                        {t('Total Estimated Yield')}
                                                    </span>
                                                    <span className="text-sm font-bold text-yellow-400 print:text-black">
                                                        {totalEstimatedYield.toLocaleString()} {t('kg')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="rounded-lg bg-gray-700 p-2 print:border print:bg-gray-50">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-400 print:text-gray-700">
                                                        {t('Total Estimated Income')}
                                                    </span>
                                                    <span className="text-sm font-bold text-green-400 print:text-black">
                                                        ฿{totalEstimatedIncome.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

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
                                                        {t('Total Plants:')}{' '}
                                                        {totalPlantingPoints.toLocaleString()} {t('trees')}
                                                    </div>
                                                    <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                        {t('Active Zones:')}{' '}
                                                        {
                                                            Object.values(
                                                                calculatedZoneSummaries
                                                            ).filter(
                                                                (summary: ZoneSummary) => summary.cropValue
                                                            ).length
                                                        }{' '}
                                                        {t('zones')}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="mb-1 text-xs text-cyan-200 print:text-cyan-700">
                                                        {t('Water Need per Irrigation:')}
                                                    </div>
                                                    <div className="text-xl font-bold text-cyan-100 print:text-cyan-800">
                                                        {totalWaterRequirementPerIrrigation.toLocaleString()}
                                                    </div>
                                                    <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                        {t('Liters/irrigation')}
                                                    </div>
                                                    <div className="mt-1 text-xs text-cyan-200 print:text-cyan-700">
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
                                                <div className="mb-2 text-xs font-medium text-cyan-200 print:text-cyan-700">
                                                    {t('Water Requirements by Zone (per irrigation):')}
                                                </div>
                                                <div className="max-h-24 space-y-1 overflow-y-auto">
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

                                {/* Action Buttons */}
                                <div className="rounded-lg bg-gray-800 p-4 print:hidden">
                                    <h2 className="mb-3 text-lg font-bold text-purple-400">
                                        📋 {t('Actions')}
                                    </h2>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <Link
                                            href="/field-map?edit=true&step=4"
                                            className="rounded-lg bg-blue-600 px-4 py-2 text-center font-semibold text-white hover:bg-blue-700"
                                        >
                                            🔄 {t('Edit Project')}
                                        </Link>
                                        <button
                                            onClick={() => window.print()}
                                            className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
                                        >
                                            🖨️ {t('Print Summary')}
                                        </button>
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
                                            const irrigationType = irrigationAssignments[zone.id];
                                            const zonePipeStats = calculateZonePipeStats(
                                                actualPipes,
                                                zone.id.toString(),
                                                actualZones
                                            );
                                            const zoneIrrigationCounts =
                                                calculateZoneIrrigationCounts(
                                                    zone,
                                                    actualIrrigationPoints
                                                );
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
                                                        </div>
                                                        {assignedCrop && (
                                                            <span className="text-lg">
                                                                {assignedCrop.icon}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {summary ? (
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
                                                                        {summary.cropName}
                                                                    </div>
                                                                    <div className="text-xs text-gray-400 print:text-gray-600">
                                                                        {summary.cropCategory}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-4 gap-2 text-xs">
                                                                <div className="rounded bg-gray-600 p-2 text-center print:bg-gray-100">
                                                                    <div className="text-gray-400 print:text-gray-600">
                                                                        Area
                                                                    </div>
                                                                    <div className="font-semibold text-blue-400 print:text-black">
                                                                        {summary.zoneAreaRai} ไร่
                                                                    </div>
                                                                    <div className="text-xs text-gray-400 print:text-gray-600">
                                                                        {summary.zoneArea} ตร.ม.
                                                                    </div>
                                                                </div>
                                                                <div className="rounded bg-gray-600 p-2 text-center print:bg-gray-100">
                                                                    <div className="text-gray-400 print:text-gray-600">
                                                                        Plants
                                                                    </div>
                                                                    <div className="font-semibold text-green-400 print:text-black">
                                                                        {summary.totalPlantingPoints.toLocaleString()}
                                                                    </div>
                                                                    <div className="text-xs text-gray-400 print:text-gray-600">
                                                                        ต้น
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
                                                                        {summary.cropName}
                                                                    </div>
                                                                    <div className="text-xs text-gray-400 print:text-gray-600">
                                                                        {summary.cropCategory}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="rounded-lg bg-cyan-900/30 p-3 print:border print:bg-cyan-50">
                                                                <h4 className="mb-2 text-sm font-semibold text-cyan-300 print:text-cyan-800">
                                                                    💧 {t('Water Requirements (liters per irrigation - from cropData)')}
                                                                </h4>
                                                                <div className="grid grid-cols-2 gap-3 text-xs">
                                                                    <div>
                                                                        <div className="mb-1 text-cyan-200 print:text-cyan-700">
                                                                            {t('Zone Area:')}{' '}
                                                                            {summary.zoneAreaRai}{' '}
                                                                            {t('Rai')}
                                                                        </div>
                                                                        <div className="mb-1 text-cyan-200 print:text-cyan-700">
                                                                            {t('Plants:')}{' '}
                                                                            {summary.totalPlantingPoints.toLocaleString()}{' '}
                                                                            {t('trees')}
                                                                        </div>
                                                                        <div className="mb-1 text-cyan-200 print:text-cyan-700">
                                                                            {t('Rate:')}{' '}
                                                                            {summary.cropWaterPerPlantPerIrrigation.toFixed(
                                                                                1
                                                                            )}{' '}
                                                                            {t('liters/plant/irrigation')}
                                                                        </div>
                                                                        <div className="text-cyan-200 print:text-cyan-700">
                                                                            ({t('from cropData:')}{' '}
                                                                            {
                                                                                summary.cropWaterPerPlant
                                                                            }{' '}
                                                                            {t('liters/plant/irrigation')})
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="mb-1 text-xs text-cyan-200 print:text-cyan-700">
                                                                            {t('Water Need per Irrigation:')}
                                                                        </div>
                                                                        <div className="text-lg font-bold text-cyan-100 print:text-cyan-800">
                                                                            {summary.waterRequirementPerIrrigation.toLocaleString()}
                                                                        </div>
                                                                        <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                                            {t('Liters/irrigation')}
                                                                        </div>
                                                                        <div className="mt-1 text-xs text-cyan-200 print:text-cyan-700">
                                                                            (
                                                                            {(
                                                                                summary.waterRequirementPerIrrigation /
                                                                                1000
                                                                            ).toFixed(1)}{' '}
                                                                            {t('m³/irrigation')})
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-2 rounded bg-cyan-800/30 p-2 text-xs text-cyan-200 print:bg-cyan-100 print:text-cyan-700">
                                                                    <strong>{t('Calculation:')}</strong>{' '}
                                                                    {summary.totalPlantingPoints.toLocaleString()}{' '}
                                                                    {t('trees')} ×{' '}
                                                                    {summary.cropWaterPerPlantPerIrrigation.toFixed(
                                                                        1
                                                                    )}{' '}
                                                                    {t('liters/plant/irrigation')} ={' '}
                                                                    {summary.waterRequirementPerIrrigation.toLocaleString()}{' '}
                                                                    {t('Liters/irrigation')}
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
                                                                        {irrigationType ||
                                                                            t('Not defined')}
                                                                    </div>
                                                                </div>

                                                                {/* เพิ่มส่วนแสดงจำนวนสปริงเกอร์แต่ละประเภท */}
                                                                <div className="mb-3">
                                                                    <div className="mb-2 text-xs font-medium text-blue-200 print:text-blue-700">
                                                                        💧 Irrigation Points in
                                                                        Zone:
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                                        {zoneIrrigationCounts.sprinkler >
                                                                            0 && (
                                                                            <div className="rounded bg-blue-700/20 p-2 text-center print:bg-blue-50">
                                                                                <div className="text-blue-200 print:text-blue-800">
                                                                                    🟢 Sprinklers {zoneIrrigationCounts.sprinkler} อัน
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {zoneIrrigationCounts.miniSprinkler >
                                                                            0 && (
                                                                            <div className="rounded bg-blue-700/20 p-2 text-center print:bg-blue-50">
                                                                                <div className="text-blue-200 print:text-blue-800">
                                                                                    🟢 Mini Sprinklers {zoneIrrigationCounts.miniSprinkler} อัน
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {zoneIrrigationCounts.microSpray >
                                                                            0 && (
                                                                            <div className="rounded bg-blue-700/20 p-2 text-center print:bg-blue-50">
                                                                                <div className="text-blue-200 print:text-blue-800">
                                                                                    🟠 Micro Sprays {zoneIrrigationCounts.microSpray} อัน
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {zoneIrrigationCounts.dripTape >
                                                                            0 && (
                                                                            <div className="rounded bg-blue-700/20 p-2 text-center print:bg-blue-50">
                                                                                <div className="text-blue-200 print:text-blue-800">
                                                                                    🟣 Drip Tape {zoneIrrigationCounts.dripTape} อัน
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
                                                                    <div className="rounded bg-blue-700/20 p-2 text-center print:bg-blue-50">
                                                                        <div className="text-blue-200 print:text-blue-800">
                                                                            🔵 Mini Sprinklers
                                                                        </div>
                                                                        <div className="font-semibold text-blue-100 print:text-blue-900">
                                                                            {
                                                                                zoneIrrigationCounts.miniSprinkler
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                    <div className="rounded bg-blue-700/20 p-2 text-center print:bg-blue-50">
                                                                        <div className="text-blue-200 print:text-blue-800">
                                                                            🟠 Micro Sprays
                                                                        </div>
                                                                        <div className="font-semibold text-blue-100 print:text-blue-900">
                                                                            {
                                                                                zoneIrrigationCounts.microSpray
                                                                            }
                                                                        </div>
                                                                    </div>
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
                                                    )}
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
