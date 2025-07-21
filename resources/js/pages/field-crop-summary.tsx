import { Head, Link } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import {
    MapContainer,
    TileLayer,
    FeatureGroup,
    Polygon,
    Polyline,
    Marker,
    CircleMarker,
    Circle,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { getCropByValue } from '@/pages/utils/cropData';
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

// Fix leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FieldCropSummaryProps {
    // Field data
    mainField?: any;
    fieldAreaSize?: number;
    selectedCrops?: string[];

    // Zones and crops
    zones?: any[];
    zoneAssignments?: any;
    zoneSummaries?: any;

    // Pipes
    pipes?: any[];

    // Equipment
    equipmentIcons?: any[];

    // Irrigation
    irrigationPoints?: any[];
    irrigationLines?: any[];
    irrigationAssignments?: any;
    irrigationSettings?: any;

    // Spacing
    rowSpacing?: any;
    plantSpacing?: any;

    // Map state
    mapCenter?: [number, number];
    mapZoom?: number;
    mapType?: string;

    // Summary data passed from field-map
    summary?: any;
    equipment?: any[];
}

export default function FieldCropSummary(props: FieldCropSummaryProps = {}) {
    // Get data from props (from route), localStorage, or default values
    const [summaryData, setSummaryData] = useState<any>(null);
    const [dataSource, setDataSource] = useState<string>('');
    const printMapRef = useRef<any>(null);

    // Debug: Log all received props
    console.log('🔍 FieldCropSummary received props:', {
        hasMainField: !!props.mainField,
        mainFieldCoordinates: props.mainField?.coordinates?.length || 0,
        hasPipes: !!props.pipes,
        pipesCount: props.pipes?.length || 0,
        hasZones: !!props.zones,
        zonesCount: props.zones?.length || 0,
        allPropKeys: Object.keys(props),
        props: props
    });

    useEffect(() => {
        // Enhanced debugging - log all props received
        console.log('🔍 FIELD CROP SUMMARY - All props received:', {
            summary: props.summary ? 'Present' : 'Missing',
            mainField: props.mainField ? 'Present' : 'Missing', 
            fieldAreaSize: props.fieldAreaSize || 'Missing',
            zones: props.zones?.length || 0,
            pipes: props.pipes?.length || 0,
            equipment: props.equipment?.length || 0,
            equipmentIcons: props.equipmentIcons?.length || 0,
            irrigationPoints: props.irrigationPoints?.length || 0,
            irrigationLines: props.irrigationLines?.length || 0,
            selectedCrops: props.selectedCrops?.length || 0,
            zoneAssignments: props.zoneAssignments ? Object.keys(props.zoneAssignments).length : 0,
            mapCenter: props.mapCenter || 'Missing',
            mapZoom: props.mapZoom || 'Missing'
        });

        // Priority 1: Check if data passed from props (from field-map route)
        if (props.summary || props.zones || props.pipes || props.equipmentIcons) {
            console.log('📥 Using data from props/route');
            setDataSource('route-props');
            setSummaryData({
                mainField: props.mainField,
                // Debug the mainField data specifically
                _debugMainField: {
                    propsMainField: props.mainField,
                    hasCoordinates: !!props.mainField?.coordinates,
                    coordinatesLength: props.mainField?.coordinates?.length || 0,
                    hasArea: !!props.mainField?.area,
                    area: props.mainField?.area
                },
                fieldAreaSize: props.fieldAreaSize || 0,
                selectedCrops: props.selectedCrops || [],
                zones: props.zones || [],
                zoneAssignments: props.zoneAssignments || {},
                zoneSummaries: props.zoneSummaries || {},
                pipes: props.pipes || [],
                // Debug the pipes data specifically
                _debugPipes: {
                    propsPipes: props.pipes,
                    pipesLength: props.pipes?.length || 0,
                    pipeTypes: props.pipes?.map(p => ({ id: p.id, type: p.type, name: p.name })) || []
                },
                equipmentIcons: props.equipmentIcons || props.equipment || [],
                irrigationPoints: props.irrigationPoints || [],
                irrigationLines: props.irrigationLines || [],
                irrigationAssignments: props.irrigationAssignments || {},
                irrigationSettings: props.irrigationSettings || {},
                rowSpacing: props.rowSpacing || {},
                plantSpacing: props.plantSpacing || {},
                mapCenter: props.mapCenter || [14.5995, 120.9842],
                mapZoom: props.mapZoom || 18,
                mapType: props.mapType || 'satellite',
            });
            return;
        }

        // Priority 2: Check URL search parameters (for direct navigation)
        const urlParams = new URLSearchParams(window.location.search);
        const summaryParam = urlParams.get('summary');
        if (summaryParam) {
            try {
                console.log('📥 Using data from URL parameters');
                const parsedData = JSON.parse(decodeURIComponent(summaryParam));
                setDataSource('url-params');
                setSummaryData(parsedData);
                return;
            } catch (error) {
                console.error('Error parsing URL summary data:', error);
            }
        }

        // Priority 3: Try localStorage
        const savedData = localStorage.getItem('fieldMapData');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (parsedData && typeof parsedData === 'object') {
                    console.log('📥 Using data from localStorage');
                    setDataSource('localStorage');
                    setSummaryData(parsedData);
                } else {
                    console.warn('📥 Invalid localStorage data structure');
                    setDataSource('none');
                }
            } catch (error) {
                console.error('Error parsing saved data:', error);
                setDataSource('error');
            }
        } else {
            console.warn('📥 No data found in any source');
            setDataSource('none');
        }
    }, [props]);

    // Default values if no data is available
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

    // Handle case where zones might be just a number (from minimal data)
    const actualZones = Array.isArray(zones) ? zones : [];
    const actualPipes = Array.isArray(pipes) ? pipes : [];
    const actualEquipmentIcons = Array.isArray(equipmentIcons) ? equipmentIcons : [];
    const actualIrrigationPoints = Array.isArray(irrigationPoints) ? irrigationPoints : [];
    const actualIrrigationLines = Array.isArray(irrigationLines) ? irrigationLines : [];

    // Calculate optimal map center and zoom based on actual field data
    const calculateMapBounds = () => {
        console.log('🗺️ Calculating map bounds with data:', {
            mainField,
            zones: actualZones.length,
            pipes: actualPipes.length,
            fieldAreaSize
        });

        // First try to use mainField coordinates
        if (mainField && mainField.coordinates && mainField.coordinates.length > 0) {
            try {
                console.log('📍 Using mainField coordinates:', mainField.coordinates);
                
                // Handle different coordinate formats
                let coords;
                if (Array.isArray(mainField.coordinates[0]) && mainField.coordinates[0].length === 2) {
                    // Format: [[lat, lng], [lat, lng], ...]
                    coords = mainField.coordinates.map(([lat, lng]) => [lng, lat]);
                } else if (mainField.coordinates[0].lat && mainField.coordinates[0].lng) {
                    // Format: [{lat: number, lng: number}, ...]
                    coords = mainField.coordinates.map(coord => [coord.lng, coord.lat]);
                } else {
                    throw new Error('Unknown coordinate format');
                }

                const closedCoords = [...coords];
                if (closedCoords[0][0] !== closedCoords[closedCoords.length - 1][0] || 
                    closedCoords[0][1] !== closedCoords[closedCoords.length - 1][1]) {
                    closedCoords.push(closedCoords[0]);
                }

                const polygon = turf.polygon([closedCoords]);
                const centroid = turf.centroid(polygon);
                const [centerLng, centerLat] = centroid.geometry.coordinates;

                let optimalZoom = 18;
                if (fieldAreaSize > 50000) {
                    optimalZoom = 14;
                } else if (fieldAreaSize > 20000) {
                    optimalZoom = 15;
                } else if (fieldAreaSize > 10000) {
                    optimalZoom = 16;
                } else if (fieldAreaSize > 5000) {
                    optimalZoom = 17;
                } else {
                    optimalZoom = 18;
                }

                console.log('✅ Calculated center:', [centerLat, centerLng], 'zoom:', optimalZoom);
                return { center: [centerLat, centerLng], zoom: optimalZoom };
            } catch (error) {
                console.error('Error calculating bounds from mainField:', error);
            }
        }

        // Fallback: Try to use zones if mainField is not available
        if (actualZones.length > 0) {
            try {
                console.log('📍 Using zones coordinates as fallback');
                let allCoords: [number, number][] = [];
                
                actualZones.forEach(zone => {
                    if (zone.coordinates && zone.coordinates.length > 0) {
                        const zoneCoords = zone.coordinates.map(coord => {
                            if (Array.isArray(coord)) {
                                return coord;
                            } else if (coord.lat && coord.lng) {
                                return [coord.lat, coord.lng];
                            }
                            return null;
                        }).filter(Boolean);
                        allCoords.push(...zoneCoords);
                    }
                });

                if (allCoords.length > 0) {
                    const lats = allCoords.map(coord => coord[0]);
                    const lngs = allCoords.map(coord => coord[1]);
                    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
                    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
                    
                    console.log('✅ Calculated center from zones:', [centerLat, centerLng]);
                    return { center: [centerLat, centerLng], zoom: 17 };
                }
            } catch (error) {
                console.error('Error calculating bounds from zones:', error);
            }
        }

        // Final fallback: Use provided mapCenter or default
        const fallbackCenter = mapCenter || [14.5995, 120.9842];
        const fallbackZoom = mapZoom || 15;
        console.log('⚠️ Using fallback center:', fallbackCenter, 'zoom:', fallbackZoom);
        return { center: fallbackCenter, zoom: fallbackZoom };
    };

    const { center: optimalCenter, zoom: optimalZoom } = calculateMapBounds();
    
    // Log the calculated map bounds for debugging
    console.log('🗺️ Map bounds calculated:', {
        center: optimalCenter,
        zoom: optimalZoom,
        source: mainField ? 'mainField' : (actualZones.length > 0 ? 'zones' : 'fallback')
    });

    // Handle print events to ensure map renders correctly
    useEffect(() => {
        const handleBeforePrint = () => {
            // Force all map instances to refresh
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 500);
        };

        const handleAfterPrint = () => {
            // Clean up after print
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 100);
        };

        window.addEventListener('beforeprint', handleBeforePrint);
        window.addEventListener('afterprint', handleAfterPrint);

        return () => {
            window.removeEventListener('beforeprint', handleBeforePrint);
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, []);

    // DEBUG: Log data to console for troubleshooting
    console.log('🔍 SUMMARY DEBUG DATA:');
    console.log('- Data source:', dataSource);
    console.log('- Main field present:', !!mainField);
    console.log('- Main field coordinates:', mainField?.coordinates?.length || 0);
    console.log('- Zones:', actualZones.length, actualZones.map(z => ({ id: z.id, name: z.name, type: z.type })));
    console.log('- Pipes:', actualPipes.length, actualPipes.map(p => ({ id: p.id, name: p.name, type: p.type })));
    console.log('- Pipe types available:', [...new Set(actualPipes.map(p => p.type))]);
    console.log('- Equipment:', actualEquipmentIcons.length, actualEquipmentIcons.map(e => ({ id: e.id, type: e.type })));
    console.log('- Irrigation Points:', actualIrrigationPoints.length);
    console.log('- Irrigation Lines:', actualIrrigationLines.length);

    // FILTER irrigation points based on lateral pipes availability
    const lateralPipesForFiltering = actualPipes.filter(p => p.type === 'lateral');
    
    // Remove duplicate irrigation points by unique ID
    const uniqueIrrigationPoints = actualIrrigationPoints.filter((point, index, array) => {
        // Handle case where point might not have proper structure
        if (!point || !point.id) return false;
        const firstIndex = array.findIndex(p => p && p.id === point.id);
        return firstIndex === index;
    });

    // FIXED: Show irrigation points more liberally
    let filteredIrrigationPoints = uniqueIrrigationPoints;

    // Only filter if there are too many points (performance consideration)
    if (uniqueIrrigationPoints.length > 200) {
        // Show every 3rd point if there are more than 200 points
        filteredIrrigationPoints = uniqueIrrigationPoints.filter((_, index) => index % 3 === 0);
    } else if (uniqueIrrigationPoints.length > 100) {
        // Show every 2nd point if there are more than 100 points
        filteredIrrigationPoints = uniqueIrrigationPoints.filter((_, index) => index % 2 === 0);
    }
    // Otherwise show all points

    // Clean and normalize irrigation types
    const normalizeIrrigationType = (type: string): string => {
        if (!type) return 'unknown';
        
        const normalizedType = type.toLowerCase().trim();
        
        // Map common variations to standard types
        const typeMapping: { [key: string]: string } = {
            'sprinkler': 'sprinkler',
            'sprinkler-system': 'sprinkler',
            'mini-sprinkler': 'mini_sprinkler', 
            'mini_sprinkler': 'mini_sprinkler',
            'minisprinkler': 'mini_sprinkler',
            'micro-spray': 'micro_spray',
            'micro_spray': 'micro_spray',
            'microspray': 'micro_spray',
            'micro': 'micro_spray',
            'microsprinkler': 'micro_spray',
            'drip': 'drip_tape',
            'drip-tape': 'drip_tape',
            'drip_tape': 'drip_tape',
            'drip-irrigation': 'drip_tape',
            'drip_irrigation': 'drip_tape'
        };

        return typeMapping[normalizedType] || normalizedType;
    };

    // Calculate irrigation types with proper normalization
    const normalizedPoints = filteredIrrigationPoints.map(point => ({
        ...point,
        normalizedType: normalizeIrrigationType(point.type)
    }));

    const sprinklerPoints = normalizedPoints.filter(p => p.normalizedType === 'sprinkler').length;
    const miniSprinklerPoints = normalizedPoints.filter(p => p.normalizedType === 'mini_sprinkler').length;
    const microSprayPoints = normalizedPoints.filter(p => p.normalizedType === 'micro_spray').length;
    const dripPoints = normalizedPoints.filter(p => p.normalizedType === 'drip_tape').length;

    // Calculate drip lines separately and remove duplicates
    const uniqueIrrigationLines = actualIrrigationLines.filter((line, index, array) => {
        if (!line || !line.id) return false;
        const firstIndex = array.findIndex(l => l && l.id === line.id);
        return firstIndex === index;
    });

    const dripLines = uniqueIrrigationLines.filter(l => normalizeIrrigationType(l.type) === 'drip_tape').length;

    // Calculate totals
    const totalZones = actualZones.length;
    const totalPipes = actualPipes.length;
    const totalEquipment = actualEquipmentIcons.length;
    const totalIrrigationPoints = uniqueIrrigationPoints.length;
    const totalIrrigationLines = uniqueIrrigationLines.length;

    // Calculate pipe types with filtering for display
    const mainPipes = actualPipes.filter((p) => p.type === 'main').length;
    const submainPipes = actualPipes.filter((p) => p.type === 'submain').length;
    const lateralPipes = actualPipes.filter((p) => p.type === 'lateral').length;

    // FIXED: Show ALL pipes without filtering to ensure lateral pipes are visible
    const displayPipes = actualPipes; // Show all pipes without any filtering

    // Calculate drip tape statistics
    const dripTapeSummary = uniqueIrrigationPoints.find((p) => normalizeIrrigationType(p.type) === 'drip_tape');
    const totalDripHoles = dripTapeSummary ? dripTapeSummary.totalHoles || 0 : 0;

    // Calculate equipment types with duplicate removal
    const uniqueEquipment = actualEquipmentIcons.filter((equipment, index, array) => {
        const firstIndex = array.findIndex(e => e.id === equipment.id);
        return firstIndex === index;
    });

    const pumpCount = uniqueEquipment.filter((e) => e.type === 'pump').length;
    const valveCount = uniqueEquipment.filter((e) => e.type === 'ballvalve').length;
    const solenoidCount = uniqueEquipment.filter((e) => e.type === 'solenoid').length;

    // Calculate total estimated yield and income
    const totalEstimatedYield = Object.values(zoneSummaries).reduce((sum: number, summary: any) => {
        return sum + (summary.estimatedYield || 0);
    }, 0);

    const totalEstimatedIncome = Object.values(zoneSummaries).reduce(
        (sum: number, summary: any) => {
            return sum + (summary.estimatedPrice || 0);
        },
        0
    );

    // Calculate total planting points
    const totalPlantingPoints = Object.values(zoneSummaries).reduce((sum: number, summary: any) => {
        return sum + (summary.totalPlantingPoints || 0);
    }, 0);

    // Format area
    const areaInRai = fieldAreaSize / 1600;
    const areaInAcres = fieldAreaSize / 4046.86;

    // Selected crop objects
    const selectedCropObjects = selectedCrops
        .map((cropValue) => getCropByValue(cropValue))
        .filter(Boolean);

    // Create custom equipment icons for map display
    const createEquipmentIcon = (equipment: any) => {
        const equipmentConfig = EQUIPMENT_TYPES[equipment.type];
        if (!equipmentConfig) return null;

        // Use images for pump, ballvalve, solenoid; fallback to icon for others
        let iconHtml = '';
        if (
            equipment.type === 'pump' ||
            equipment.type === 'ballvalve' ||
            equipment.type === 'solenoid'
        ) {
            let imgSrc = '';
            if (equipment.type === 'pump') imgSrc = './generateTree/wtpump.png';
            if (equipment.type === 'ballvalve') imgSrc = './generateTree/ballv.png';
            if (equipment.type === 'solenoid') imgSrc = './generateTree/solv.png';
            iconHtml = `<img src="${imgSrc}" alt="${equipmentConfig.name}" style="width:20px;height:20px;object-fit:contain;display:block;margin:auto;" />`;
        } else {
            iconHtml = `<span style="font-size: 12px;">${equipmentConfig.icon}</span>`;
        }

        return L.divIcon({
            html: `<div style="background: white; border: 2px solid ${equipmentConfig.color}; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${iconHtml}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            className: 'equipment-marker-icon',
        });
    };

    // Show loading or no data message
    if (!summaryData) {
        return (
            <div className="min-h-screen bg-gray-900 text-white">
                <Head title="Field Crop Summary - Irrigation Planning" />

                {/* Header */}
                <div className="border-b border-gray-700 bg-gray-800">
                    <div className="container mx-auto px-4 py-6">
                        <div className="mx-auto max-w-7xl">
                            {/* Back Navigation */}
                            <Link
                                href="/field-map"
                                className="mb-4 inline-flex items-center text-blue-400 hover:text-blue-300"
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

                            {/* Main Title */}
                            <h1 className="mb-2 text-4xl font-bold">📊 Field Crop Summary</h1>
                            <p className="mb-6 text-gray-400">
                                Complete overview of your irrigation planning project
                            </p>
                        </div>
                    </div>
                </div>

                {/* No Data Message */}
                <div className="container mx-auto px-4 py-6">
                    <div className="mx-auto max-w-7xl">
                        <div className="rounded-lg bg-gray-800 p-8 text-center">
                            <div className="mb-4 text-6xl">📋</div>
                            <h2 className="mb-4 text-2xl font-bold text-yellow-400">
                                No Project Data Found
                            </h2>
                            <p className="mb-6 text-gray-400">
                                It looks like you haven't completed a field mapping project yet, or
                                the data has been cleared.
                            </p>
                            <div className="space-y-4">
                                <p className="text-gray-300">To view a summary, please:</p>
                                <ol className="mx-auto max-w-md space-y-2 text-left text-gray-300">
                                    <li className="flex items-start">
                                        <span className="mr-2 text-blue-400">1.</span>
                                        Go to the Field Map page
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2 text-blue-400">2.</span>
                                        Complete all 4 steps of the planning wizard
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2 text-blue-400">3.</span>
                                        Click the "View Summary" button that appears
                                    </li>
                                </ol>
                            </div>
                            <div className="mt-8">
                                <Link
                                    href="/field-map"
                                    className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                                >
                                    🗺️ Start Field Mapping
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white print:bg-white print:text-black">
            <Head title="Field Crop Summary - Irrigation Planning" />
            
            {/* FIXED: Print-optimized styles for better layout */}
            <style>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 0.5in;
                    }
                    
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                    
                    /* Hide non-essential elements for print */
                    .print-hide {
                        display: none !important;
                    }
                    
                    /* Ensure content is visible */
                    .print-show {
                        display: block !important;
                    }
                    
                    /* Optimize print layout */
                    .print-layout {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        gap: 1rem !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    .print-summary-section {
                        max-height: none !important;
                        overflow: visible !important;
                    }
                    
                    .print-map-section {
                        height: 500px !important;
                        width: 100% !important;
                    }
                    
                    .leaflet-container {
                        height: 100% !important;
                        width: 100% !important;
                    }
                    
                    /* Ensure map tiles load properly for print */
                    .leaflet-tile-container {
                        opacity: 1 !important;
                    }
                    
                    .leaflet-tile {
                        opacity: 1 !important;
                    }
                }
            `}</style>

            {/* Header - Hidden on print */}
            <div className="border-b border-gray-700 bg-gray-800 print:hidden">
                <div className="container mx-auto px-4 py-4">
                    <div className="mx-auto max-w-7xl">
                        {/* Back Navigation */}
                        <Link
                            href="/field-map"
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

                        {/* Main Title */}
                        <h1 className="mb-1 text-3xl font-bold">📊 Field Crop Summary</h1>
                        <p className="mb-2 text-gray-400">
                            Complete overview of your irrigation planning project
                        </p>
                         {/* Enhanced Debug Information */}
                         {dataSource && (
                             <div className="mb-2 text-xs text-gray-500">
                                 <div className="mb-1">📂 Data source: {dataSource}</div>
                                 <div className="grid grid-cols-2 gap-4 text-xs">
                                     <div>
                                         <div className="text-blue-300">📏 Pipes Debug:</div>
                                         <div>• Total: {actualPipes.length}</div>
                                         <div>• Main: {actualPipes.filter(p => p.type === 'main').length}</div>
                                         <div>• Submain: {actualPipes.filter(p => p.type === 'submain').length}</div>
                                         <div>• Lateral: {actualPipes.filter(p => p.type === 'lateral').length}</div>
                                         <div>• Displayed: {displayPipes.length}</div>
                                     </div>
                                     <div>
                                         <div className="text-green-300">💧 Irrigation Debug:</div>
                                         <div>• Total Points: {actualIrrigationPoints.length}</div>
                                         <div>• Unique Points: {uniqueIrrigationPoints.length}</div>
                                         <div>• Filtered Points: {filteredIrrigationPoints.length}</div>
                                         <div>• Lines: {actualIrrigationLines.length}</div>
                                     </div>
                                 </div>
                                 <div className="mt-1">
                                     <div className="text-yellow-300">🗺️ Map Debug:</div>
                                     <div>• Field Area: {fieldAreaSize ? `${(fieldAreaSize/1600).toFixed(2)} rai` : 'Not set'}</div>
                                     <div>• Map Center: [{optimalCenter[0].toFixed(4)}, {optimalCenter[1].toFixed(4)}]</div>
                                     <div>• Map Zoom: {optimalZoom}</div>
                                     <div>• Main Field: {mainField ? 'Available' : 'Missing'}</div>
                                     <div>• Zones: {actualZones.length}</div>
                                 </div>
                                 {actualPipes.length === 0 && (
                                     <div className="mt-1 text-yellow-400">
                                         ⚠️ No pipes data found - check field-map data
                                     </div>
                                 )}
                                 {actualIrrigationPoints.length === 0 && (
                                     <div className="mt-1 text-yellow-400">
                                         ⚠️ No irrigation points data found
                                     </div>
                                 )}
                                 {!mainField && (
                                     <div className="mt-1 text-red-400">
                                         ❌ Main field boundary not found - map may not center correctly
                                     </div>
                                 )}
                             </div>
                         )}
                    </div>
                </div>
            </div>

            {/* Print Header - Visible only on print */}
            <div className="hidden print:block print:mb-4">
                <h1 className="text-2xl font-bold text-black">📊 Field Crop Summary</h1>
                <p className="text-gray-600">
                    Complete overview of your irrigation planning project - Generated on {new Date().toLocaleDateString()}
                </p>
                <hr className="my-2 border-gray-300" />
            </div>

            {/* Main Content - FIXED: Better print layout */}
            <div className="container mx-auto px-4 py-4 print:print-layout">
                <div className="mx-auto max-w-7xl print:max-w-none">
                    {/* Layout: Side by side for print, stacked for screen */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-2 print:gap-6">
                        
                        {/* Left Column: Project Overview & Details */}
                        <div className="space-y-4 print:print-summary-section">
                            {/* Project Overview */}
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

                            {/* Crop Information */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                <h2 className="mb-3 text-lg font-bold text-green-400 print:text-base print:text-black">
                                    🌱 Crop Information
                                </h2>
                                <div className="space-y-2 print:space-y-1">
                                    {selectedCropObjects.map(
                                        (crop, index) =>
                                            crop && (
                                                <div
                                                    key={crop.value}
                                                    className="rounded-lg bg-gray-700 p-2 print:border print:border-gray-200 print:bg-gray-50 print:p-1"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-lg print:text-sm">
                                                                {crop.icon}
                                                            </span>
                                                            <div>
                                                                <h3 className="text-sm font-semibold text-white print:text-xs print:text-black">
                                                                    {crop.name}
                                                                </h3>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                                แถว:{' '}
                                                                {rowSpacing[crop.value] ||
                                                                    crop.spacing ||
                                                                    1.5}
                                                                m
                                                            </div>
                                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                                ต้น:{' '}
                                                                {plantSpacing[crop.value] ||
                                                                    crop.defaultPlantSpacing ||
                                                                    1.0}
                                                                m
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                    )}
                                </div>
                            </div>

                            {/* Infrastructure Summary */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                <h2 className="mb-3 text-lg font-bold text-purple-400 print:text-base print:text-black">
                                    🔧 Infrastructure Summary
                                </h2>

                                {/* Pipes */}
                                <div className="mb-3">
                                    <h3 className="mb-2 text-sm font-semibold text-blue-400 print:text-xs print:text-black">
                                        📏 Pipe System
                                    </h3>
                                    <div className="grid grid-cols-3 gap-1">
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-blue-400 print:text-xs print:text-black">
                                                {mainPipes}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Main
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-green-400 print:text-xs print:text-black">
                                                {submainPipes}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Submain
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-purple-400 print:text-xs print:text-black">
                                                {lateralPipesForFiltering.length}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Lateral
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Equipment */}
                                <div className="mb-3">
                                    <h3 className="mb-2 text-sm font-semibold text-orange-400 print:text-xs print:text-black">
                                        ⚙️ Equipment
                                    </h3>
                                    <div className="grid grid-cols-3 gap-1">
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-orange-400 print:text-xs print:text-black">
                                                {pumpCount}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Pumps
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-red-400 print:text-xs print:text-black">
                                                {valveCount}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Valves
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-yellow-400 print:text-xs print:text-black">
                                                {solenoidCount}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Solenoids
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* FIXED: Irrigation Points with corrected counts */}
                                <div>
                                    <h3 className="mb-2 text-sm font-semibold text-cyan-400 print:text-xs print:text-black">
                                        💧 Irrigation System
                                    </h3>
                                    <div className="grid grid-cols-2 gap-1">
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-green-400 print:text-xs print:text-black">
                                                {sprinklerPoints}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Sprinklers
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-blue-400 print:text-xs print:text-black">
                                                {miniSprinklerPoints}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Mini Sprinklers
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-orange-400 print:text-xs print:text-black">
                                                {microSprayPoints}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Micro Sprays
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-cyan-400 print:text-xs print:text-black">
                                                {dripPoints + dripLines}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Drip Points
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Summary */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                <h2 className="mb-3 text-lg font-bold text-green-400 print:text-base print:text-black">
                                    💰 Financial Summary
                                </h2>
                                <div className="space-y-2 print:space-y-1">
                                    <div className="rounded-lg bg-gray-700 p-2 print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400 print:text-xs print:text-gray-600">
                                                Total Estimated Yield
                                            </span>
                                            <span className="text-sm font-bold text-yellow-400 print:text-xs print:text-black">
                                                {totalEstimatedYield.toLocaleString()} kg
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400 print:text-xs print:text-gray-600">
                                                Total Estimated Income
                                            </span>
                                            <span className="text-sm font-bold text-green-400 print:text-xs print:text-black">
                                                ฿{totalEstimatedIncome.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons - Hidden on print */}
                            <div className="rounded-lg bg-gray-800 p-4 print:hidden">
                                <h2 className="mb-3 text-lg font-bold text-purple-400">
                                    📋 Actions
                                </h2>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <Link
                                        href="/field-map"
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-center font-semibold text-white transition-colors hover:bg-blue-700"
                                    >
                                        🔄 Edit Project
                                    </Link>
                                    <button
                                        onClick={() => {
                                            console.log('📄 Preparing for print...');
                                            console.log('Print map center:', optimalCenter);
                                            console.log('Print map zoom:', optimalZoom);
                                            
                                            // Ensure the print map is properly positioned
                                            if (printMapRef.current) {
                                                printMapRef.current.setView(optimalCenter, optimalZoom);
                                                printMapRef.current.invalidateSize();
                                                console.log('📍 Print map synced to:', optimalCenter, optimalZoom);
                                            }
                                            
                                            // Small delay to ensure maps are rendered
                                            setTimeout(() => {
                                                // Force resize event to ensure all maps are properly sized
                                                window.dispatchEvent(new Event('resize'));
                                                
                                                // Additional sync just before printing
                                                if (printMapRef.current) {
                                                    printMapRef.current.setView(optimalCenter, optimalZoom);
                                                    printMapRef.current.invalidateSize();
                                                }
                                                
                                                setTimeout(() => {
                                                    window.print();
                                                }, 300);
                                            }, 200);
                                        }}
                                        className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-green-700"
                                    >
                                        🖨️ Print Summary
                                    </button>
                                    <button
                                        onClick={() => {
                                            console.log('🔍 FULL DEBUG DATA:');
                                            console.log('Summary Data:', summaryData);
                                            console.log('Main Field:', mainField);
                                            console.log('Zones:', actualZones);
                                            console.log('Pipes:', actualPipes);
                                            console.log('Equipment:', actualEquipmentIcons);
                                            console.log('Irrigation Points:', actualIrrigationPoints);
                                            console.log('Map Center:', optimalCenter);
                                            console.log('Map Zoom:', optimalZoom);
                                            alert('Debug information logged to console (F12)');
                                        }}
                                        className="rounded-lg bg-yellow-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-yellow-700"
                                    >
                                        🔍 Debug Data
                                    </button>
                                </div>
                                
                                {/* Manual Data Input for Testing */}
                                <div className="mt-4 border-t border-gray-600 pt-4">
                                    <h3 className="mb-2 text-sm font-semibold text-gray-300">
                                        🛠️ Troubleshooting
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                        <button
                                            onClick={() => {
                                                // Force reload from localStorage
                                                const savedData = localStorage.getItem('fieldMapData');
                                                if (savedData) {
                                                    try {
                                                        const parsedData = JSON.parse(savedData);
                                                        setSummaryData(parsedData);
                                                        setDataSource('localStorage-forced');
                                                        console.log('🔄 Forced reload from localStorage:', parsedData);
                                                    } catch (error) {
                                                        console.error('Error parsing localStorage:', error);
                                                        alert('Error parsing localStorage data');
                                                    }
                                                } else {
                                                    alert('No data found in localStorage');
                                                }
                                            }}
                                            className="rounded bg-gray-600 px-3 py-1 text-xs text-white hover:bg-gray-500"
                                        >
                                            🔄 Reload from Storage
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Clear all localStorage data?')) {
                                                    localStorage.removeItem('fieldMapData');
                                                    setSummaryData(null);
                                                    setDataSource('none');
                                                    console.log('🗑️ LocalStorage cleared');
                                                }
                                            }}
                                            className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-500"
                                        >
                                            🗑️ Clear Storage
                                        </button>
                                    </div>
                                    
                                    {/* Quick Data Status */}
                                    <div className="mt-2 text-xs text-gray-400">
                                        <div>📊 Quick Status:</div>
                                        <div>• Data loaded: {summaryData ? '✅' : '❌'}</div>
                                        <div>• Main field: {mainField ? '✅' : '❌'}</div>
                                        <div>• Zones: {actualZones.length} items</div>
                                        <div>• Pipes: {actualPipes.length} items</div>
                                        <div>• Equipment: {actualEquipmentIcons.length} items</div>
                                        <div>• Irrigation: {actualIrrigationPoints.length} items</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Zone Details & Map */}
                        <div className="space-y-4 print:print-summary-section">
                            {/* Zone Details */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                <h2 className="mb-3 text-lg font-bold text-blue-400 print:text-base print:text-black">
                                    🎯 Zone Details
                                </h2>
                                <div className="space-y-2 print:space-y-1">
                                    {actualZones.map((zone, index) => {
                                        const summary = zoneSummaries[zone.id];
                                        const assignedCrop = zoneAssignments[zone.id]
                                            ? getCropByValue(zoneAssignments[zone.id])
                                            : null;
                                        const irrigationType = irrigationAssignments[zone.id];

                                        return (
                                            <div
                                                key={zone.id}
                                                className="rounded-lg bg-gray-700 p-2 print:border print:border-gray-200 print:bg-gray-50 print:p-1"
                                            >
                                                <div className="mb-1 flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <div
                                                            className="h-2 w-2 rounded-full border border-white/20 print:border-gray-400"
                                                            style={{ backgroundColor: zone.color }}
                                                        ></div>
                                                        <h3 className="text-sm font-semibold text-white print:text-xs print:text-black">
                                                            {zone.name}
                                                        </h3>
                                                    </div>
                                                    {assignedCrop && (
                                                        <span className="text-sm print:text-xs">
                                                            {assignedCrop.icon}
                                                        </span>
                                                    )}
                                                </div>

                                                {summary && (
                                                    <div className="grid grid-cols-2 gap-2 text-xs print:gap-1 print:text-xs">
                                                        <div>
                                                            <div className="text-gray-400 print:text-gray-600">
                                                                Crop
                                                            </div>
                                                            <div className="font-semibold text-white print:text-black">
                                                                {summary.cropName}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400 print:text-gray-600">
                                                                Points
                                                            </div>
                                                            <div className="font-semibold text-green-400 print:text-black">
                                                                {summary.totalPlantingPoints.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400 print:text-gray-600">
                                                                Yield
                                                            </div>
                                                            <div className="font-semibold text-yellow-400 print:text-black">
                                                                {summary.estimatedYield.toLocaleString()}{' '}
                                                                kg
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400 print:text-gray-600">
                                                                Income
                                                            </div>
                                                            <div className="font-semibold text-green-400 print:text-black">
                                                                ฿
                                                                {summary.estimatedPrice.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        {irrigationType && (
                                                            <div className="col-span-2">
                                                                <div className="text-gray-400 print:text-gray-600">
                                                                    Irrigation
                                                                </div>
                                                                <div className="font-semibold text-cyan-400 print:text-black">
                                                                    {irrigationType === 'sprinkler'
                                                                        ? '🌿 Sprinkler'
                                                                        : irrigationType ===
                                                                            'mini_sprinkler'
                                                                          ? '🌱 Mini Sprinkler'
                                                                          : irrigationType ===
                                                                              'micro_spray'
                                                                            ? '💦 Micro Spray'
                                                                            : irrigationType ===
                                                                                'drip_tape'
                                                                              ? '💧 Drip Points'
                                                                              : irrigationType}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Map Visualization - FIXED for print */}
                            <div className="overflow-hidden rounded-lg bg-gray-800 print:border print:border-gray-300 print:bg-white">
                                <div className="flex h-full flex-col">
                                    {/* Map Header */}
                                    <div className="border-b border-gray-600 bg-gray-700 p-2 print:border-gray-300 print:bg-gray-100">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-white print:text-black">
                                                🗺️ Project Map Overview
                                            </h3>
                                            <div className="text-xs text-gray-300 print:text-gray-700">
                                                Area: {areaInRai.toFixed(2)} Rai
                                            </div>
                                        </div>
                                    </div>
                                    {/* MapContainer - FIXED: Proper sizing for print */}
                                    <div
                                        className="relative print:print-map-section"
                                        style={{ minHeight: 300, height: '400px' }}
                                    >
                                        <MapContainer
                                            ref={printMapRef}
                                            center={optimalCenter}
                                            zoom={optimalZoom}
                                            style={{ height: '100%', width: '100%' }}
                                            dragging={true}
                                            scrollWheelZoom={true}
                                            doubleClickZoom={true}
                                            zoomControl={true}
                                            attributionControl={false}
                                            minZoom={optimalZoom - 2}
                                            maxZoom={optimalZoom + 2}
                                        >
                                            <TileLayer
                                                attribution={MAP_TILES[mapType].attribution}
                                                url={MAP_TILES[mapType].url}
                                                maxZoom={20}
                                                maxNativeZoom={20}
                                                keepBuffer={4}
                                            />
                                            <FeatureGroup>
                                                {/* Field Boundary */}
                                                {mainField && mainField.coordinates && (
                                                    <Polygon
                                                        positions={mainField.coordinates}
                                                        pathOptions={{
                                                            color: '#22C55E',
                                                            fillColor: '#22C55E',
                                                            fillOpacity: 0.2,
                                                            weight: 2,
                                                        }}
                                                    />
                                                )}
                                                {/* Zones */}
                                                {actualZones.map((zone, index) =>
                                                    zone.coordinates ? (
                                                        <Polygon
                                                            key={zone.id}
                                                            positions={zone.coordinates}
                                                            pathOptions={{
                                                                color: zone.color,
                                                                fillColor: zone.color,
                                                                fillOpacity: 0.3,
                                                                weight: 2,
                                                            }}
                                                        />
                                                    ) : null
                                                )}
                                                {/* Pipes - ALL pipes with enhanced visibility for lateral pipes */}
                                                {displayPipes.map((pipe, index) =>
                                                    pipe.coordinates ? (
                                                        <Polyline
                                                            key={pipe.id}
                                                            positions={pipe.coordinates}
                                                            pathOptions={{
                                                                color:
                                                                    pipe.type === 'main'
                                                                        ? '#2563eb' // Blue for main
                                                                        : pipe.type === 'submain'
                                                                          ? '#059669' // Green for submain
                                                                          : '#9333ea', // Purple for lateral pipes - more vibrant
                                                                weight:
                                                                    pipe.type === 'main'
                                                                        ? 6 // Thicker for main
                                                                        : pipe.type === 'submain'
                                                                          ? 4 // Medium for submain
                                                                          : 3, // Thicker for lateral pipes - was 2
                                                                opacity: pipe.type === 'lateral' ? 0.8 : 0.9, // Higher opacity for lateral pipes
                                                            }}
                                                        />
                                                    ) : null
                                                )}
                                                {/* Equipment with proper icons */}
                                                {uniqueEquipment.map((equipment, index) => {
                                                    if (!equipment.lat || !equipment.lng)
                                                        return null;

                                                    const customIcon =
                                                        createEquipmentIcon(equipment);
                                                    if (!customIcon) return null;

                                                    return (
                                                        <Marker
                                                            key={equipment.id}
                                                            position={[
                                                                equipment.lat,
                                                                equipment.lng,
                                                            ]}
                                                            icon={customIcon}
                                                        />
                                                    );
                                                })}
                                                {/* Irrigation Points - MAX visibility */}
                                                {filteredIrrigationPoints.map((point, index) => {
                                                    // Handle different data structures for position
                                                    let lat, lng;
                                                    
                                                    if (point.lat && point.lng) {
                                                        lat = point.lat;
                                                        lng = point.lng;
                                                    } else if (point.position) {
                                                        if (Array.isArray(point.position)) {
                                                            [lat, lng] = point.position;
                                                        } else if (point.position.lat && point.position.lng) {
                                                            lat = point.position.lat;
                                                            lng = point.position.lng;
                                                        }
                                                    }
                                                    
                                                    // Skip if no valid position found
                                                    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                                                        return null;
                                                    }

                                                    const normalizedType = normalizeIrrigationType(point.type);

                                                    return (
                                                        <CircleMarker
                                                            key={point.id || `irrigation-${index}`}
                                                            center={[lat, lng]}
                                                            radius={12} // Larger size for maximum visibility
                                                            pathOptions={{
                                                                color:
                                                                    normalizedType === 'sprinkler'
                                                                        ? '#16a34a' // Darker green for sprinkler
                                                                        : normalizedType === 'mini_sprinkler'
                                                                          ? '#2563eb' // Blue for mini sprinkler
                                                                          : normalizedType === 'micro_spray'
                                                                            ? '#ea580c' // Orange for micro spray
                                                                            : '#0891b2', // Cyan for drip
                                                                fillColor:
                                                                    normalizedType === 'sprinkler'
                                                                        ? '#22c55e' // Bright green for sprinkler
                                                                        : normalizedType === 'mini_sprinkler'
                                                                          ? '#3b82f6' // Bright blue for mini sprinkler
                                                                          : normalizedType === 'micro_spray'
                                                                            ? '#f97316' // Bright orange for micro spray
                                                                            : '#06b6d4', // Bright cyan for drip
                                                                fillOpacity: 0.9, // Maximum opacity
                                                                weight: 3, // Thicker border
                                                                opacity: 1, // Full opacity
                                                            }}
                                                        />
                                                    );
                                                })}
                                                {/* Irrigation Lines (Drip Tape) */}
                                                {uniqueIrrigationLines.map((line, index) =>
                                                    line.coordinates ? (
                                                        <Polyline
                                                            key={line.id}
                                                            positions={line.coordinates}
                                                            pathOptions={{
                                                                color: '#06B6D4',
                                                                weight: 3,
                                                                opacity: 0.8,
                                                            }}
                                                        />
                                                    ) : null
                                                )}
                                                {/* Coverage Circles for Sprinklers - MAXIMUM visibility */}
                                                {filteredIrrigationPoints.map((point, index) => {
                                                    // Handle different data structures for position
                                                    let lat, lng;
                                                    
                                                    if (point.lat && point.lng) {
                                                        lat = point.lat;
                                                        lng = point.lng;
                                                    } else if (point.position) {
                                                        if (Array.isArray(point.position)) {
                                                            [lat, lng] = point.position;
                                                        } else if (point.position.lat && point.position.lng) {
                                                            lat = point.position.lat;
                                                            lng = point.position.lng;
                                                        }
                                                    }
                                                    
                                                    // Skip if no valid position, radius, or is drip type
                                                    if (!lat || !lng || isNaN(lat) || isNaN(lng) || !point.radius || normalizeIrrigationType(point.type) === 'drip_tape') {
                                                        return null;
                                                    }

                                                    const normalizedType = normalizeIrrigationType(point.type);

                                                    return (
                                                        <Circle
                                                            key={`${point.id || index}-coverage`}
                                                            center={[lat, lng]}
                                                            radius={point.radius}
                                                            pathOptions={{
                                                                color:
                                                                    normalizedType === 'sprinkler'
                                                                        ? '#16a34a' // Darker green for sprinkler
                                                                        : normalizedType === 'mini_sprinkler'
                                                                          ? '#2563eb' // Blue for mini sprinkler
                                                                          : normalizedType === 'micro_spray'
                                                                            ? '#ea580c' // Orange for micro spray
                                                                            : '#0891b2', // Cyan for drip
                                                                fillColor:
                                                                    normalizedType === 'sprinkler'
                                                                        ? '#22c55e' // Bright green for sprinkler
                                                                        : normalizedType === 'mini_sprinkler'
                                                                          ? '#3b82f6' // Bright blue for mini sprinkler
                                                                          : normalizedType === 'micro_spray'
                                                                            ? '#f97316' // Bright orange for micro spray
                                                                            : '#06b6d4', // Bright cyan for drip
                                                                fillOpacity: 0.15, // More visible
                                                                weight: 2, // Thicker border
                                                                opacity: 0.6, // More visible border
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </FeatureGroup>
                                        </MapContainer>
                                    </div>
                                    {/* Enhanced Map Legend with more detail */}
                                    <div className="border-t border-gray-600 bg-gray-700 p-2 print:border-gray-300 print:bg-gray-100">
                                        <h4 className="mb-1 text-xs font-semibold text-white print:text-black">
                                            Legend (Showing {displayPipes.length} pipes, {filteredIrrigationPoints.length} irrigation points)
                                        </h4>
                                        <div className="grid grid-cols-4 gap-1 text-xs print:grid-cols-8 print:text-xs">
                                            <div className="flex items-center space-x-1">
                                                <div className="h-2 w-2 rounded bg-green-500"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Field
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="h-2 w-2 rounded bg-blue-500"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Zones
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="h-3 w-3 rounded bg-blue-600"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Main ({actualPipes.filter(p => p.type === 'main').length})
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="h-3 w-3 rounded bg-green-600"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Sub ({actualPipes.filter(p => p.type === 'submain').length})
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="h-3 w-3 rounded bg-purple-600"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Lateral ({actualPipes.filter(p => p.type === 'lateral').length})
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="h-2 w-2 rounded bg-yellow-500"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Equipment
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Sprinklers ({sprinklerPoints})
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Mini ({miniSprinklerPoints})
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Micro ({microSprayPoints})
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="h-3 w-3 rounded-full bg-cyan-500"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Drip ({dripPoints})
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
