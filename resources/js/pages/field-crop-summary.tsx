/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Head, Link, router } from '@inertiajs/react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { useState, useEffect, useRef } from 'react';
import * as turf from '@turf/turf';
import { getCropByValue } from '@/pages/utils/cropData';
import { calculateEnhancedFieldStats, saveEnhancedFieldCropData, FieldCropData } from '@/utils/fieldCropData';
import {
    ZONE_COLORS,
    OBSTACLE_TYPES,
    PIPE_TYPES,
    MAP_TILES,
    EQUIPMENT_TYPES,
    type PipeType,
    type EquipmentType,
    type ObstacleType,
} from '@/pages/utils/fieldMapConstants';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

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
}: {
    center: [number, number];
    zoom: number;
    mainField: any;
    zones: any[];
    pipes: any[];
    equipment: any[];
    irrigationPoints: any[];
    irrigationLines: any[];
    onMapReady?: (map: google.maps.Map) => void;
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<google.maps.Map | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [mapFullyLoaded, setMapFullyLoaded] = useState(false);

    useEffect(() => {
        // Load Google Maps API if not already loaded
        if (!window.google?.maps) {
            const loadGoogleMaps = () => {
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=geometry,drawing`;
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
                const fieldPath = mainField.coordinates.map((coord: any) => {
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
                    const zonePath = zone.coordinates.map((coord: any) => {
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
                    
                    const pipePath = pipe.coordinates.map((coord: any) => {
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
            irrigationPoints.forEach((point, index) => {
                let lat, lng;
                if (point.lat && point.lng) {
                    [lat, lng] = [point.lat, point.lng];
                } else if (Array.isArray(point.position)) {
                    [lat, lng] = point.position;
                }
                
                if (lat && lng) {
                    const normalizedType = normalizeIrrigationType(point.type);
                    let color = '#06b6d4'; // Default (cyan)
                    if (normalizedType === 'sprinkler') color = '#22c55e'; // Green
                    else if (normalizedType === 'mini_sprinkler') color = '#3b82f6'; // Blue
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
                    const linePath = line.coordinates.map((coord: any) => {
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
    }, [isLoaded, center, zoom, mainField, zones, pipes, equipment, irrigationPoints, irrigationLines]);

    if (!isLoaded) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-700">
                <div className="text-center">
                    <div className="mb-2 text-2xl">🗺️</div>
                    <p className="text-sm text-gray-400">กำลังโหลด Google Maps...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            <div ref={mapRef} className="h-full w-full rounded-lg" />
            {!mapFullyLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-700/75 rounded-lg">
                    <div className="text-center">
                        <div className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-blue-400"></div>
                        <p className="text-sm text-gray-300">กำลังโหลดแผนที่...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// Enhanced function to capture map as image with better error handling and multiple save formats
const captureMapImage = async (mapElement: HTMLElement, projectType: string = 'field-crop'): Promise<string | null> => {
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
        await new Promise(resolve => setTimeout(resolve, 2000));
        
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
                return element.classList?.contains('gm-style-cc') || 
                       element.classList?.contains('gmnoprint');
            }
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
                    source: 'google-maps'
                }
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

interface FieldCropSummaryProps {
    mainField?: any;
    fieldAreaSize?: number;
    selectedCrops?: string[];
    zones?: any[];
    zoneAssignments?: any;
    zoneSummaries?: any;
    pipes?: any[];
    equipmentIcons?: any[];
    irrigationPoints?: any[];
    irrigationLines?: any[];
    irrigationAssignments?: any;
    irrigationSettings?: any;
    rowSpacing?: any;
    plantSpacing?: any;
    mapCenter?: [number, number];
    mapZoom?: number;
    mapType?: string;
    summary?: any;
    equipment?: any[];
}

// Existing functions remain unchanged (copied from original)
const calculateZoneArea = (coordinates: any[]): number => {
    if (!coordinates || coordinates.length < 3) return 0;

    try {
        const turfCoords = coordinates
            .map((coord: any) => {
                if (Array.isArray(coord) && coord.length === 2) {
                    return [coord[1], coord[0]];
                }
                if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
                    return [coord.lng, coord.lat];
                }
                return null;
            })
            .filter((coord: any): coord is [number, number] => coord !== null);

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
    crop: any,
    customRowSpacing?: number,
    customPlantSpacing?: number
): number => {
    if (!zoneArea || !crop) return 0;

    const rowSpacing = customRowSpacing || crop.rowSpacing / 100;
    const plantSpacing = customPlantSpacing || crop.plantSpacing / 100;

    if (!rowSpacing || !plantSpacing) return 0;

    const rowsPerSquareMeter = 1 / rowSpacing;
    const plantsPerRowPerMeter = 1 / plantSpacing;
    const plantsPerSquareMeter = rowsPerSquareMeter * plantsPerRowPerMeter;
    const totalPlants = Math.floor(zoneArea * plantsPerSquareMeter);

    return totalPlants;
};

const calculateYieldAndPrice = (
    zoneArea: number,
    crop: any
): { estimatedYield: number; estimatedPrice: number } => {
    if (!zoneArea || !crop) {
        return { estimatedYield: 0, estimatedPrice: 0 };
    }

    const areaInRai = zoneArea / 1600;
    const estimatedYield = Math.round(areaInRai * crop.yield);
    const estimatedPrice = Math.round(estimatedYield * crop.price);

    return { estimatedYield, estimatedPrice };
};

const calculateWaterRequirement = (plantingPoints: number, crop: any): number => {
    if (!plantingPoints || !crop || !crop.waterRequirement) {
        return 0;
    }

    const waterPerPlantPerIrrigation = crop.waterRequirement;
    const totalWaterRequirement = plantingPoints * waterPerPlantPerIrrigation;

    return Math.round(totalWaterRequirement);
};

const calculatePipeLength = (coordinates: any[]): number => {
    if (!coordinates || coordinates.length < 2) return 0;

    try {
        let totalLength = 0;
        for (let i = 0; i < coordinates.length - 1; i++) {
            const point1 = coordinates[i];
            const point2 = coordinates[i + 1];

            let lat1, lng1, lat2, lng2;

            if (Array.isArray(point1) && Array.isArray(point2)) {
                [lat1, lng1] = point1;
                [lat2, lng2] = point2;
            } else if (point1.lat && point1.lng && point2.lat && point2.lng) {
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

const calculatePipeStats = (pipes: any[], pipeType: string) => {
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

const isPipeInZone = (pipe: any, zone: any): boolean => {
    if (!pipe.coordinates || !Array.isArray(pipe.coordinates) || pipe.coordinates.length < 2) {
        return false;
    }

    if (!zone.coordinates || !Array.isArray(zone.coordinates) || zone.coordinates.length < 3) {
        return false;
    }

    try {
        const zoneCoords = zone.coordinates
            .map((coord: any) => {
                if (Array.isArray(coord) && coord.length === 2) {
                    return [coord[1], coord[0]];
                }
                if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
                    return [coord.lng, coord.lat];
                }
                return null;
            })
            .filter((coord: any): coord is [number, number] => coord !== null);

        if (zoneCoords.length < 3) return false;

        const firstPoint = zoneCoords[0];
        const lastPoint = zoneCoords[zoneCoords.length - 1];
        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
            zoneCoords.push(firstPoint);
        }

        const zonePolygon = turf.polygon([zoneCoords]);

        for (const coord of pipe.coordinates) {
            let lat, lng;
            if (Array.isArray(coord) && coord.length === 2) {
                [lat, lng] = coord;
            } else if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
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

const identifyPipeType = (pipe: any): string => {
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

const calculateZonePipeStats = (pipes: any[], zoneId: string, zones: any[]) => {
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

    const calculateTypeStats = (typePipes: any[]) => {
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

    const result = {
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

export default function FieldCropSummary(props: FieldCropSummaryProps = {}) {
    const [summaryData, setSummaryData] = useState<any>(null);
    const [dataSource, setDataSource] = useState<string>('');
    const [calculatedZoneSummaries, setCalculatedZoneSummaries] = useState<Record<string, any>>({});
    
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
                    setDataSource('localStorage');
                    setSummaryData(parsedData);
                } else {
                    console.warn('📥 Invalid or empty localStorage data structure');
                    setDataSource('none');
                    setSummaryData(null);
                }
            } catch (error) {
                console.error('Error parsing saved data:', error);
                setDataSource('error');
                setSummaryData(null);
            }
        } else {
            console.warn('📥 No data found in localStorage');
            setDataSource('none');
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
        setCaptureStatus('กำลังจับภาพแผนที่...');

        try {
            let mapElement: HTMLElement | null = null;
            
            // Try different methods to get the map element
            if (googleMapRef.current) {
                mapElement = googleMapRef.current.getDiv();
            } else if (mapContainerRef.current) {
                mapElement = mapContainerRef.current;
            } else {
                // Fallback: try to find map element by class or ID
                mapElement = document.querySelector('.google-maps-container') as HTMLElement ||
                           document.querySelector('[id*="map"]') as HTMLElement ||
                           document.querySelector('[class*="map"]') as HTMLElement;
            }

            if (mapElement) {
                setCaptureStatus('กำลังประมวลผลภาพ...');
                const imageUrl = await captureMapImage(mapElement, 'field-crop');
                
                if (imageUrl) {
                    const isVerified = verifyImageSave();
                    if (isVerified) {
                        setMapImageCaptured(true);
                        setCaptureStatus('บันทึกภาพแผนที่สำเร็จ!');
                        console.log('✅ Map image captured and verified for product page');
                        
                        // Clear status after delay
                        setTimeout(() => setCaptureStatus(''), 3000);
                    } else {
                        setCaptureStatus('เกิดข้อผิดพลาดในการบันทึก');
                        setTimeout(() => setCaptureStatus(''), 3000);
                    }
                } else {
                    setCaptureStatus('ไม่สามารถจับภาพได้');
                    setTimeout(() => setCaptureStatus(''), 3000);
                }
            } else {
                setCaptureStatus('ไม่พบแผนที่');
                setTimeout(() => setCaptureStatus(''), 3000);
            }
        } catch (error) {
            console.error('❌ Error in handleCaptureMapImage:', error);
            setCaptureStatus('เกิดข้อผิดพลาด');
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

    const {
        mainField,
        fieldAreaSize = 0,
        selectedCrops = [],
        zones = [],
        zoneAssignments = {},
        zoneSummaries = {},
        pipes = [],
        equipmentIcons = [],
        irrigationPoints = [],
        irrigationLines = [],
        irrigationAssignments = {},
        irrigationSettings = {},
        rowSpacing = {},
        plantSpacing = {},
        mapCenter = [14.5995, 120.9842],
        mapZoom = 18,
        mapType = 'satellite',
    } = summaryData || {};

    useEffect(() => {
        if (summaryData && zones.length > 0) {
            console.log('🧮 Starting zone calculations with cropData (per irrigation)...');
            console.log('🔧 Available pipes for zone calculation:', pipes);
            console.log('🎯 Available zones:', zones);

            const newZoneSummaries: Record<string, any> = {};

            zones.forEach((zone: any) => {
                const zoneId = zone.id.toString();
                const assignedCropValue = zoneAssignments[zoneId];

                if (assignedCropValue && zone.coordinates) {
                    const crop = getCropByValue(assignedCropValue);
                    if (crop) {
                        const zoneArea = calculateZoneArea(zone.coordinates);

                        const effectiveRowSpacing = rowSpacing[assignedCropValue]
                            ? rowSpacing[assignedCropValue]
                            : crop.rowSpacing / 100;

                        const effectivePlantSpacing = plantSpacing[assignedCropValue]
                            ? plantSpacing[assignedCropValue]
                            : crop.plantSpacing / 100;

                        const totalPlantingPoints = calculatePlantingPoints(
                            zoneArea,
                            crop,
                            effectiveRowSpacing,
                            effectivePlantSpacing
                        );

                        const { estimatedYield, estimatedPrice } = calculateYieldAndPrice(
                            zoneArea,
                            crop
                        );

                        const waterRequirementPerIrrigation = calculateWaterRequirement(
                            totalPlantingPoints,
                            crop
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
                        };

                        console.log(
                            `📊 Zone ${zone.name} calculations with cropData (per irrigation):`,
                            {
                                area: `${Math.round(zoneArea)} ตร.ม. (${Math.round((zoneArea / 1600) * 100) / 100} ไร่)`,
                                crop: crop.name,
                                category: crop.category,
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
                    newZoneSummaries[zoneId] = {
                        zoneId: zoneId,
                        zoneName: zone.name,
                        cropName: 'ไม่ได้กำหนด',
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
    ]);

    const handleCalculateEquipment = () => {
        if (!summaryData) {
            alert('ไม่พบข้อมูลโปรเจกต์สำหรับคำนวณ');
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

    const calculateMapBounds = () => {
        if (mainField && mainField.coordinates && mainField.coordinates.length > 0) {
            try {
                const coords = mainField.coordinates
                    .map((c: any) => {
                        if (
                            Array.isArray(c) &&
                            typeof c[0] === 'number' &&
                            typeof c[1] === 'number'
                        ) {
                            return [c[1], c[0]];
                        }
                        if (c && typeof c.lat === 'number' && typeof c.lng === 'number') {
                            return [c.lng, c.lat];
                        }
                        return null;
                    })
                    .filter((c: any): c is [number, number] => c !== null);

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
                        .map((c: any) => {
                            if (
                                Array.isArray(c) &&
                                typeof c[0] === 'number' &&
                                typeof c[1] === 'number'
                            ) {
                                return c as [number, number];
                            }
                            if (c && typeof c.lat === 'number' && typeof c.lng === 'number') {
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

    const totalEstimatedYield = Object.values(calculatedZoneSummaries).reduce(
        (sum: number, summary: any) => sum + (summary.estimatedYield || 0),
        0
    );
    const totalEstimatedIncome = Object.values(calculatedZoneSummaries).reduce(
        (sum: number, summary: any) => sum + (summary.estimatedPrice || 0),
        0
    );
    const totalPlantingPoints = Object.values(calculatedZoneSummaries).reduce(
        (sum: number, summary: any) => sum + (summary.totalPlantingPoints || 0),
        0
    );
    const totalWaterRequirementPerIrrigation = Object.values(calculatedZoneSummaries).reduce(
        (sum: number, summary: any) => sum + (summary.waterRequirementPerIrrigation || 0),
        0
    );

    const areaInRai = fieldAreaSize / 1600;

    const selectedCropObjects = (selectedCrops || [])
        .map((cropValue) => getCropByValue(cropValue))
        .filter(Boolean);

    if (!summaryData) {
        return (
            <div className="flex h-screen flex-col overflow-hidden bg-gray-900 text-white">
                <Head title="Field Crop Summary - No Data" />
                <Navbar />
                <div className="flex flex-1 items-center justify-center overflow-y-auto">
                    <div className="container mx-auto px-4 py-6">
                        <div className="rounded-lg bg-gray-800 p-8 text-center">
                            <div className="mb-4 text-6xl">📋</div>
                            <h2 className="mb-4 text-2xl font-bold text-yellow-400">
                                No Project Data Found
                            </h2>
                            <p className="mb-6 text-gray-400">
                                Please return to the Field Map page, complete the steps, and click
                                "View Summary".
                            </p>
                            <Link
                                href="/field-map"
                                className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                            >
                                🗺️ Go to Field Map
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-gray-900 text-white print:bg-white print:text-black">
            <Head title="Field Crop Summary - Irrigation Planning" />

            <Navbar />

            <div className="border-b border-gray-700 bg-gray-800 print:hidden">
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
                                    Back to Field Map
                                </Link>
                                <h1 className="mb-1 text-3xl font-bold">📊 Field Crop Summary</h1>
                                <p className="mb-2 text-gray-400">
                                    Complete overview of your irrigation planning project
                                </p>
                            </div>

                            <div className="flex-shrink-0 space-x-3">
                                {/* Enhanced Map capture button */}
                                <button
                                    onClick={handleManualCapture}
                                    disabled={isCapturingImage}
                                    className={`inline-flex transform items-center rounded-lg px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                                        isCapturingImage
                                            ? 'bg-gray-600 cursor-not-allowed'
                                            : mapImageCaptured
                                            ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700'
                                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                                    }`}
                                >
                                    {isCapturingImage ? (
                                        <>
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                                            กำลังจับภาพ...
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
                                            {mapImageCaptured ? '✅ บันทึกภาพแล้ว' : '📷 บันทึกภาพแผนที่'}
                                        </>
                                    )}
                                </button>

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
                                    🧮 คำนวณอุปกรณ์
                                </button>
                            </div>
                        </div>
                        
                        {/* Enhanced capture status display */}
                        {captureStatus && (
                            <div className={`mt-3 rounded-lg p-3 text-sm ${
                                captureStatus.includes('สำเร็จ') || captureStatus.includes('บันทึก')
                                    ? 'bg-green-800/50 text-green-200 border border-green-600'
                                    : captureStatus.includes('ข้อผิดพลาด') || captureStatus.includes('ไม่สามารถ')
                                    ? 'bg-red-800/50 text-red-200 border border-red-600'
                                    : 'bg-blue-800/50 text-blue-200 border border-blue-600'
                            }`}>
                                <div className="flex items-center gap-2">
                                    {captureStatus.includes('กำลัง') && (
                                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                                    )}
                                    <span>{captureStatus}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="hidden print:mb-4 print:block">
                <h1 className="text-2xl font-bold text-black">📊 Field Crop Summary</h1>
                <p className="text-gray-600">Generated on {new Date().toLocaleDateString()}</p>
                <hr className="my-2 border-gray-300" />
            </div>

            <div className="print:print-layout flex-1 overflow-y-auto">
                <div className="container mx-auto px-4 py-4">
                    <div className="mx-auto max-w-7xl print:max-w-none">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-2 print:gap-6">
                            <div className="print:print-summary-section space-y-4">
                                {/* Enhanced Map Visualization with better capture capabilities */}
                                <div className="print:print-map-container overflow-hidden rounded-lg bg-gray-800 print:border">
                                    <div className="flex h-full flex-col">
                                        <div className="print:print-map-header border-b border-gray-600 bg-gray-700 p-2">
                                            <h3 className="text-sm font-semibold text-white print:text-black">
                                                🗺️ Project Map Overview
                                                {mapImageCaptured && (
                                                    <span className="ml-2 text-xs text-green-400 print:text-green-600">
                                                        ✅ บันทึกแล้ว
                                                    </span>
                                                )}
                                            </h3>
                                        </div>
                                        <div
                                            ref={mapContainerRef}
                                            className="print:print-map-container relative google-maps-container"
                                            style={{ minHeight: 300, height: '400px' }}
                                        >
                                            <GoogleMapsDisplay
                                                center={optimalCenter}
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

                                {/* Rest of the component remains the same... */}
                                <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                    <h2 className="mb-3 text-lg font-bold text-green-400 print:text-base print:text-black">
                                        🏡 Project Overview
                                    </h2>
                                    <div className="grid grid-cols-4 gap-2 print:gap-1">
                                        <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                            <div className="text-lg font-bold text-blue-400 print:text-sm print:text-black">
                                                {areaInRai.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                ไร่
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                            <div className="text-lg font-bold text-green-400 print:text-sm print:text-black">
                                                {totalZones}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                โซน
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                            <div className="text-lg font-bold text-purple-400 print:text-sm print:text-black">
                                                {totalPlantingPoints.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                จุดปลูก
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                            <div className="text-lg font-bold text-yellow-400 print:text-sm print:text-black">
                                                {totalEstimatedYield.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                กก.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Infrastructure Summary - keeping existing code */}
                                <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                    <h2 className="mb-3 text-lg font-bold text-purple-400 print:text-base print:text-black">
                                        🔧 Infrastructure Summary
                                    </h2>
                                    <div className="mb-3">
                                        <h3 className="mb-2 text-sm font-semibold text-blue-400 print:text-xs print:text-black">
                                            📏 Pipe System (วาดเสร็จแล้วเท่านั้น)
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-xs font-medium text-blue-300 print:text-black">
                                                        Main Pipes
                                                    </span>
                                                    <span className="text-xs font-bold text-blue-400 print:text-black">
                                                        {mainPipeStats.count} ท่อ
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 text-xs">
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            ยาวสุด:{' '}
                                                        </span>
                                                        <span className="font-medium text-blue-300 print:text-black">
                                                            {mainPipeStats.longestLength.toLocaleString()}{' '}
                                                            ม.
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            รวม:{' '}
                                                        </span>
                                                        <span className="font-medium text-blue-300 print:text-black">
                                                            {mainPipeStats.totalLength.toLocaleString()}{' '}
                                                            ม.
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-xs font-medium text-green-300 print:text-black">
                                                        Submain Pipes
                                                    </span>
                                                    <span className="text-xs font-bold text-green-400 print:text-black">
                                                        {submainPipeStats.count} ท่อ
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 text-xs">
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            ยาวสุด:{' '}
                                                        </span>
                                                        <span className="font-medium text-green-300 print:text-black">
                                                            {submainPipeStats.longestLength.toLocaleString()}{' '}
                                                            ม.
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            รวม:{' '}
                                                        </span>
                                                        <span className="font-medium text-green-300 print:text-black">
                                                            {submainPipeStats.totalLength.toLocaleString()}{' '}
                                                            ม.
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-xs font-medium text-purple-300 print:text-black">
                                                        Lateral Pipes
                                                    </span>
                                                    <span className="text-xs font-bold text-purple-400 print:text-black">
                                                        {lateralPipeStats.count} ท่อ
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 text-xs">
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            ยาวสุด:{' '}
                                                        </span>
                                                        <span className="font-medium text-purple-300 print:text-black">
                                                            {lateralPipeStats.longestLength.toLocaleString()}{' '}
                                                            ม.
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 print:text-gray-600">
                                                            รวม:{' '}
                                                        </span>
                                                        <span className="font-medium text-purple-300 print:text-black">
                                                            {lateralPipeStats.totalLength.toLocaleString()}{' '}
                                                            ม.
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded bg-blue-900/30 p-2 print:border print:bg-blue-50">
                                                <div className="text-center">
                                                    <span className="text-xs font-medium text-blue-300 print:text-blue-800">
                                                        ความยาวท่อที่ยาวสุดรวม:{' '}
                                                    </span>
                                                    <span className="text-sm font-bold text-blue-100 print:text-blue-900">
                                                        {(
                                                            mainPipeStats.longestLength +
                                                            submainPipeStats.longestLength +
                                                            lateralPipeStats.longestLength
                                                        ).toLocaleString()}{' '}
                                                        ม.
                                                    </span>
                                                </div>
                                                <div className="mt-1 text-center">
                                                    <span className="text-xs font-medium text-blue-300 print:text-blue-800">
                                                        ความยาวท่อรวมทั้งหมด:{' '}
                                                    </span>
                                                    <span className="text-sm font-bold text-blue-100 print:text-blue-900">
                                                        {(
                                                            mainPipeStats.totalLength +
                                                            submainPipeStats.totalLength +
                                                            lateralPipeStats.totalLength
                                                        ).toLocaleString()}{' '}
                                                        ม.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <h3 className="mb-2 text-sm font-semibold text-orange-400 print:text-xs print:text-black">
                                            ⚙️ Equipment
                                        </h3>
                                        <div className="grid grid-cols-3 gap-1">
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-orange-400">
                                                    {pumpCount}
                                                </div>
                                                <div className="text-xs text-gray-400">Pumps</div>
                                            </div>
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-red-400">
                                                    {valveCount}
                                                </div>
                                                <div className="text-xs text-gray-400">Valves</div>
                                            </div>
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-yellow-400">
                                                    {solenoidCount}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    Solenoids
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold text-cyan-400 print:text-xs print:text-black">
                                            💧 Irrigation System
                                        </h3>
                                        <div className="grid grid-cols-2 gap-1">
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-green-400">
                                                    {sprinklerPoints}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    Sprinklers
                                                </div>
                                            </div>
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-blue-400">
                                                    {miniSprinklerPoints}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    Mini Sprinklers
                                                </div>
                                            </div>
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-orange-400">
                                                    {microSprayPoints}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    Micro Sprays
                                                </div>
                                            </div>
                                            <div className="rounded bg-gray-700 p-1 text-center print:border">
                                                <div className="text-sm font-bold text-cyan-400">
                                                    {dripPoints + dripLines}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    Drip Points
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial & Water Summary - keeping existing code */}
                                <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                    <h2 className="mb-3 text-lg font-bold text-green-400 print:text-base print:text-black">
                                        💰 Financial & Water Summary
                                    </h2>
                                    <div className="space-y-3 print:space-y-2">
                                        <div className="space-y-2">
                                            <div className="rounded-lg bg-gray-700 p-2 print:border print:bg-gray-50">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-400 print:text-gray-700">
                                                        Total Estimated Yield
                                                    </span>
                                                    <span className="text-sm font-bold text-yellow-400 print:text-black">
                                                        {totalEstimatedYield.toLocaleString()} กก.
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="rounded-lg bg-gray-700 p-2 print:border print:bg-gray-50">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-400 print:text-gray-700">
                                                        Total Estimated Income
                                                    </span>
                                                    <span className="text-sm font-bold text-green-400 print:text-black">
                                                        ฿{totalEstimatedIncome.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-lg bg-cyan-900/30 p-3 print:border-2 print:border-cyan-200 print:bg-cyan-50">
                                            <h3 className="mb-2 text-sm font-semibold text-cyan-300 print:text-cyan-800">
                                                💧 Total Water Requirements (ลิตรต่อครั้ง - from
                                                cropData)
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                        Total Farm Area: {areaInRai.toFixed(2)} ไร่
                                                    </div>
                                                    <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                        Total Plants:{' '}
                                                        {totalPlantingPoints.toLocaleString()} ต้น
                                                    </div>
                                                    <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                        Active Zones:{' '}
                                                        {
                                                            Object.keys(
                                                                calculatedZoneSummaries
                                                            ).filter(
                                                                (id) =>
                                                                    calculatedZoneSummaries[id]
                                                                        .cropValue
                                                            ).length
                                                        }{' '}
                                                        zones
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="mb-1 text-xs text-cyan-200 print:text-cyan-700">
                                                        Water Need per Irrigation:
                                                    </div>
                                                    <div className="text-xl font-bold text-cyan-100 print:text-cyan-800">
                                                        {totalWaterRequirementPerIrrigation.toLocaleString()}
                                                    </div>
                                                    <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                        ลิตร/ครั้ง
                                                    </div>
                                                    <div className="mt-1 text-xs text-cyan-200 print:text-cyan-700">
                                                        (
                                                        {(
                                                            totalWaterRequirementPerIrrigation /
                                                            1000
                                                        ).toFixed(1)}{' '}
                                                        ลบ.ม./ครั้ง)
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 border-t border-cyan-700 pt-2 print:border-cyan-300">
                                                <div className="mb-2 text-xs font-medium text-cyan-200 print:text-cyan-700">
                                                    Water Requirements by Zone (per irrigation):
                                                </div>
                                                <div className="max-h-24 space-y-1 overflow-y-auto">
                                                    {Object.values(calculatedZoneSummaries)
                                                        .filter((summary: any) => summary.cropValue)
                                                        .map((summary: any) => (
                                                            <div
                                                                key={summary.zoneId}
                                                                className="flex justify-between text-xs"
                                                            >
                                                                <span className="text-cyan-200 print:text-cyan-700">
                                                                    {summary.zoneName} (
                                                                    {summary.zoneAreaRai} ไร่)
                                                                </span>
                                                                <span className="font-medium text-cyan-100 print:text-cyan-800">
                                                                    {summary.waterRequirementPerIrrigation.toLocaleString()}{' '}
                                                                    ล./ครั้ง
                                                                </span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>

                                            <div className="mt-3 border-t border-cyan-700 pt-2 print:border-cyan-300">
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className="rounded bg-cyan-800/50 p-2 text-center print:bg-cyan-100">
                                                        <div className="text-cyan-200 print:text-cyan-700">
                                                            Monthly
                                                        </div>
                                                        <div className="font-bold text-cyan-100 print:text-cyan-800">
                                                            {(
                                                                (totalWaterRequirementPerIrrigation *
                                                                    30) /
                                                                1000
                                                            ).toFixed(1)}
                                                        </div>
                                                        <div className="text-cyan-200 print:text-cyan-700">
                                                            ลบ.ม./เดือน
                                                        </div>
                                                    </div>
                                                    <div className="rounded bg-cyan-800/50 p-2 text-center print:bg-cyan-100">
                                                        <div className="text-cyan-200 print:text-cyan-700">
                                                            Yearly
                                                        </div>
                                                        <div className="font-bold text-cyan-100 print:text-cyan-800">
                                                            {(
                                                                (totalWaterRequirementPerIrrigation *
                                                                    365) /
                                                                1000
                                                            ).toFixed(0)}
                                                        </div>
                                                        <div className="text-cyan-200 print:text-cyan-700">
                                                            ลบ.ม./ปี
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
                                        📋 Actions
                                    </h2>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <Link
                                            href="/field-map?edit=true&step=4"
                                            className="rounded-lg bg-blue-600 px-4 py-2 text-center font-semibold text-white hover:bg-blue-700"
                                        >
                                            🔄 Edit Project
                                        </Link>
                                        <button
                                            onClick={() => window.print()}
                                            className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
                                        >
                                            🖨️ Print Summary
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Zone Details - keeping existing code structure */}
                            <div className="space-y-4 print:contents">
                                <div className="print:print-other-content rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                    <h2 className="mb-3 text-lg font-bold text-blue-400 print:text-base print:text-black">
                                        🎯 Zone Details & Irrigation Systems (ลิตรต่อครั้ง)
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
                                                            <div className="grid grid-cols-3 gap-2 text-xs">
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
                                                                    💧 Water Requirements
                                                                    (ลิตรต่อครั้ง - from cropData)
                                                                </h4>
                                                                <div className="grid grid-cols-2 gap-3 text-xs">
                                                                    <div>
                                                                        <div className="mb-1 text-cyan-200 print:text-cyan-700">
                                                                            Zone Area:{' '}
                                                                            {summary.zoneAreaRai}{' '}
                                                                            ไร่
                                                                        </div>
                                                                        <div className="mb-1 text-cyan-200 print:text-cyan-700">
                                                                            Plants:{' '}
                                                                            {summary.totalPlantingPoints.toLocaleString()}{' '}
                                                                            ต้น
                                                                        </div>
                                                                        <div className="mb-1 text-cyan-200 print:text-cyan-700">
                                                                            Rate:{' '}
                                                                            {summary.cropWaterPerPlantPerIrrigation.toFixed(
                                                                                1
                                                                            )}{' '}
                                                                            ลิตร/ต้น/ครั้ง
                                                                        </div>
                                                                        <div className="text-cyan-200 print:text-cyan-700">
                                                                            (จาก cropData:{' '}
                                                                            {
                                                                                summary.cropWaterPerPlant
                                                                            }{' '}
                                                                            ลิตร/ต้น/ครั้ง)
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="mb-1 text-xs text-cyan-200 print:text-cyan-700">
                                                                            Water Need per
                                                                            Irrigation:
                                                                        </div>
                                                                        <div className="text-lg font-bold text-cyan-100 print:text-cyan-800">
                                                                            {summary.waterRequirementPerIrrigation.toLocaleString()}
                                                                        </div>
                                                                        <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                                            ลิตร/ครั้ง
                                                                        </div>
                                                                        <div className="mt-1 text-xs text-cyan-200 print:text-cyan-700">
                                                                            (
                                                                            {(
                                                                                summary.waterRequirementPerIrrigation /
                                                                                1000
                                                                            ).toFixed(1)}{' '}
                                                                            ลบ.ม./ครั้ง)
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-2 rounded bg-cyan-800/30 p-2 text-xs text-cyan-200 print:bg-cyan-100 print:text-cyan-700">
                                                                    <strong>การคำนวณ:</strong>{' '}
                                                                    {summary.totalPlantingPoints.toLocaleString()}{' '}
                                                                    ต้น ×{' '}
                                                                    {summary.cropWaterPerPlantPerIrrigation.toFixed(
                                                                        1
                                                                    )}{' '}
                                                                    ลิตร/ต้น/ครั้ง ={' '}
                                                                    {summary.waterRequirementPerIrrigation.toLocaleString()}{' '}
                                                                    ลิตร/ครั้ง
                                                                </div>
                                                            </div>

                                                            <div className="rounded-lg bg-blue-900/30 p-3 print:border print:bg-blue-50">
                                                                <h4 className="mb-2 text-sm font-semibold text-blue-300 print:text-blue-800">
                                                                    🔧 Irrigation System & Pipe
                                                                    Network
                                                                </h4>

                                                                <div className="mb-3">
                                                                    <div className="mb-1 text-xs font-medium text-blue-200 print:text-blue-700">
                                                                        Irrigation Type:
                                                                    </div>
                                                                    <div className="text-sm font-semibold text-blue-100 print:text-blue-900">
                                                                        {irrigationType ||
                                                                            'ไม่ได้กำหนด'}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <div className="border-b border-blue-700 pb-1 text-xs font-medium text-blue-200 print:border-blue-300 print:text-blue-700">
                                                                        Pipe System Details in Zone:
                                                                    </div>

                                                                    <div className="rounded border border-cyan-600 bg-cyan-800/40 p-3 print:border-cyan-300 print:bg-cyan-100">
                                                                        <div className="mb-3 text-center">
                                                                            <div className="text-sm font-bold text-cyan-200 print:text-cyan-800">
                                                                                📊 Zone Pipe Summary
                                                                            </div>
                                                                        </div>

                                                                        <div className="mb-3">
                                                                            <div className="mb-2 grid grid-cols-4 gap-1 text-xs">
                                                                                <div className="font-medium text-cyan-200 print:text-cyan-700">
                                                                                    ประเภทท่อ
                                                                                </div>
                                                                                <div className="text-center font-medium text-cyan-200 print:text-cyan-700">
                                                                                    จำนวน
                                                                                </div>
                                                                                <div className="text-center font-medium text-cyan-200 print:text-cyan-700">
                                                                                    ยาวสุด(ม.)
                                                                                </div>
                                                                                <div className="text-center font-medium text-cyan-200 print:text-cyan-700">
                                                                                    รวม(ม.)
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <div className="grid grid-cols-4 gap-1 rounded bg-blue-700/20 p-1 text-xs print:bg-blue-50">
                                                                                    <div className="text-blue-200 print:text-blue-800">
                                                                                        🔵 Main
                                                                                        Pipes
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
                                                                                        🟢 Submain
                                                                                        Pipes
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
                                                                                        🟣 Lateral
                                                                                        Pipes
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
                                                                                    ความยาวท่อที่ยาวสุดรวม
                                                                                </div>
                                                                                <div className="text-sm font-bold text-cyan-100 print:text-cyan-900">
                                                                                    {zonePipeStats.totalLongestLength.toLocaleString()}{' '}
                                                                                    ม.
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
                                                                                    ความยาวท่อรวมทั้งหมด
                                                                                </div>
                                                                                <div className="text-sm font-bold text-cyan-100 print:text-cyan-900">
                                                                                    {zonePipeStats.totalLength.toLocaleString()}{' '}
                                                                                    ม.
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
                                                                                Total Pipes in Zone:{' '}
                                                                                <span className="font-bold text-cyan-100 print:text-cyan-900">
                                                                                    {
                                                                                        zonePipeStats.total
                                                                                    }{' '}
                                                                                    ท่อ
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="py-4 text-center text-gray-400 print:text-gray-600">
                                                            <div className="mb-2 text-4xl">❓</div>
                                                            <div className="text-sm">
                                                                No crop assigned to this zone
                                                            </div>
                                                            <div className="text-xs">
                                                                Cannot calculate water requirements
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
