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

// ฟังก์ชันคำนวณพื้นที่โซนจากพิกัด
const calculateZoneArea = (coordinates: any[]): number => {
    if (!coordinates || coordinates.length < 3) return 0;

    try {
        // แปลงพิกัดเป็นรูปแบบที่ turf.js ใช้ได้ [lng, lat]
        const turfCoords = coordinates
            .map((coord: any) => {
                if (Array.isArray(coord) && coord.length === 2) {
                    return [coord[1], coord[0]]; // [lat, lng] -> [lng, lat]
                }
                if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
                    return [coord.lng, coord.lat];
                }
                return null;
            })
            .filter((coord: any): coord is [number, number] => coord !== null);

        if (turfCoords.length < 3) return 0;

        // ปิด polygon ถ้ายังไม่ปิด
        const firstPoint = turfCoords[0];
        const lastPoint = turfCoords[turfCoords.length - 1];
        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
            turfCoords.push(firstPoint);
        }

        const polygon = turf.polygon([turfCoords]);
        return turf.area(polygon); // ผลลัพธ์เป็นตารางเมตร
    } catch (error) {
        console.error('Error calculating zone area:', error);
        return 0;
    }
};

// ฟังก์ชันคำนวณจำนวนจุดปลูกในโซน
const calculatePlantingPoints = (
    zoneArea: number, // ตารางเมตร
    rowSpacing: number, // เมตร
    plantSpacing: number // เมตร
): number => {
    if (!zoneArea || !rowSpacing || !plantSpacing) return 0;

    // คำนวณจำนวนแถวต่อตารางเมตร
    const rowsPerSquareMeter = 1 / rowSpacing;
    // คำนวณจำนวนต้นต่อแถวต่อเมตร
    const plantsPerRowPerMeter = 1 / plantSpacing;
    // คำนวณจำนวนต้นต่อตารางเมตร
    const plantsPerSquareMeter = rowsPerSquareMeter * plantsPerRowPerMeter;
    // คำนวณจำนวนต้นทั้งหมดในโซน
    const totalPlants = Math.floor(zoneArea * plantsPerSquareMeter);

    return totalPlants;
};

// ฟังก์ชันคำนวณผลผลิตและราคา
const calculateYieldAndPrice = (
    plantingPoints: number,
    crop: any
): { estimatedYield: number; estimatedPrice: number } => {
    if (!plantingPoints || !crop) {
        return { estimatedYield: 0, estimatedPrice: 0 };
    }

    // ข้อมูลผลผลิตต่อต้น (กิโลกรัม) และราคาต่อกิโลกรัม (บาท)
    const cropYieldData: { [key: string]: { yieldPerPlant: number; pricePerKg: number } } = {
        corn: { yieldPerPlant: 0.4, pricePerKg: 8 },
        rice: { yieldPerPlant: 0.03, pricePerKg: 15 },
        sugarcane: { yieldPerPlant: 2.5, pricePerKg: 1.2 },
        cassava: { yieldPerPlant: 2.0, pricePerKg: 3.5 },
        soybeans: { yieldPerPlant: 0.05, pricePerKg: 20 },
        peanuts: { yieldPerPlant: 0.08, pricePerKg: 35 },
        sunflower: { yieldPerPlant: 0.06, pricePerKg: 25 },
        sesame: { yieldPerPlant: 0.02, pricePerKg: 45 },
        tomatoes: { yieldPerPlant: 3.0, pricePerKg: 12 },
        cucumber: { yieldPerPlant: 2.5, pricePerKg: 8 },
        cabbage: { yieldPerPlant: 1.5, pricePerKg: 10 },
        lettuce: { yieldPerPlant: 0.3, pricePerKg: 25 },
        carrot: { yieldPerPlant: 0.15, pricePerKg: 18 },
        onion: { yieldPerPlant: 0.2, pricePerKg: 15 },
        chili: { yieldPerPlant: 0.8, pricePerKg: 30 },
        eggplant: { yieldPerPlant: 2.0, pricePerKg: 12 },
        mango: { yieldPerPlant: 50, pricePerKg: 25 },
        banana: { yieldPerPlant: 15, pricePerKg: 8 },
        papaya: { yieldPerPlant: 20, pricePerKg: 10 },
        coconut: { yieldPerPlant: 30, pricePerKg: 5 },
        durian: { yieldPerPlant: 80, pricePerKg: 150 },
        rambutan: { yieldPerPlant: 25, pricePerKg: 20 },
    };

    // ใช้ข้อมูลเริ่มต้นถ้าไม่มีข้อมูลพืชนั้น
    const defaultYield = { yieldPerPlant: 0.5, pricePerKg: 10 };
    const yieldData = cropYieldData[crop.value] || defaultYield;

    // คำนวณผลผลิตรวม (กิโลกรัม)
    const estimatedYield = Math.round(plantingPoints * yieldData.yieldPerPlant);

    // คำนวณราคารวม (บาท)
    const estimatedPrice = Math.round(estimatedYield * yieldData.pricePerKg);

    return { estimatedYield, estimatedPrice };
};

export default function FieldCropSummary(props: FieldCropSummaryProps = {}) {
    // Get data from props (from route), localStorage, or default values
    const [summaryData, setSummaryData] = useState<any>(null);
    const [dataSource, setDataSource] = useState<string>('');
    const [calculatedZoneSummaries, setCalculatedZoneSummaries] = useState<Record<string, any>>({});
    const printMapRef = useRef<any>(null);

    useEffect(() => {
        // Always load data from localStorage as the single source of truth
        const savedData = localStorage.getItem('fieldMapData');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                // Basic validation
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
    }, []); // Empty dependency array to run only once on mount

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

    // คำนวณข้อมูลโซนเมื่อข้อมูลพร้อม
    useEffect(() => {
        if (summaryData && zones.length > 0) {
            console.log('🧮 Starting zone calculations...');
            const newZoneSummaries: Record<string, any> = {};

            zones.forEach((zone: any) => {
                const zoneId = zone.id.toString();
                const assignedCropValue = zoneAssignments[zoneId];

                if (assignedCropValue && zone.coordinates) {
                    const crop = getCropByValue(assignedCropValue);
                    if (crop) {
                        // คำนวณพื้นที่โซน
                        const zoneArea = calculateZoneArea(zone.coordinates);

                        // ใช้ spacing ที่ตั้งค่าไว้ หรือใช้ค่าเริ่มต้นจากข้อมูลพืช
                        const effectiveRowSpacing =
                            rowSpacing[assignedCropValue] || crop.spacing || 1.5;
                        const effectivePlantSpacing =
                            plantSpacing[assignedCropValue] || crop.defaultPlantSpacing || 1.0;

                        // คำนวณจำนวนจุดปลูก
                        const totalPlantingPoints = calculatePlantingPoints(
                            zoneArea,
                            effectiveRowSpacing,
                            effectivePlantSpacing
                        );

                        // คำนวณผลผลิตและราคา
                        const { estimatedYield, estimatedPrice } = calculateYieldAndPrice(
                            totalPlantingPoints,
                            crop
                        );

                        newZoneSummaries[zoneId] = {
                            zoneId: zoneId,
                            zoneName: zone.name,
                            cropName: crop.name,
                            cropValue: assignedCropValue,
                            cropIcon: crop.icon,
                            zoneArea: Math.round(zoneArea), // ตารางเมตร
                            rowSpacing: effectiveRowSpacing,
                            plantSpacing: effectivePlantSpacing,
                            totalPlantingPoints: totalPlantingPoints,
                            estimatedYield: estimatedYield, // กิโลกรัม
                            estimatedPrice: estimatedPrice, // บาท
                            irrigationType: irrigationAssignments[zoneId] || 'ไม่ได้กำหนด',
                        };

                        console.log(`📊 Zone ${zone.name} calculations:`, {
                            area: `${Math.round(zoneArea)} ตร.ม.`,
                            crop: crop.name,
                            rowSpacing: `${effectiveRowSpacing} ม.`,
                            plantSpacing: `${effectivePlantSpacing} ม.`,
                            plantingPoints: totalPlantingPoints.toLocaleString(),
                            yield: `${estimatedYield.toLocaleString()} กก.`,
                            price: `${estimatedPrice.toLocaleString()} บาท`,
                        });
                    }
                } else {
                    // โซนที่ไม่ได้มอบหมายพืช
                    newZoneSummaries[zoneId] = {
                        zoneId: zoneId,
                        zoneName: zone.name,
                        cropName: 'ไม่ได้กำหนด',
                        cropValue: null,
                        cropIcon: '❓',
                        zoneArea: zone.coordinates
                            ? Math.round(calculateZoneArea(zone.coordinates))
                            : 0,
                        rowSpacing: 0,
                        plantSpacing: 0,
                        totalPlantingPoints: 0,
                        estimatedYield: 0,
                        estimatedPrice: 0,
                        irrigationType: irrigationAssignments[zoneId] || 'ไม่ได้กำหนด',
                    };
                }
            });

            setCalculatedZoneSummaries(newZoneSummaries);
            console.log('✅ Zone calculations completed:', newZoneSummaries);
        }
    }, [summaryData, zones, zoneAssignments, rowSpacing, plantSpacing, irrigationAssignments]);

    // Handle case where zones might be just a number (from minimal data)
    const actualZones = Array.isArray(zones) ? zones : [];
    const actualPipes = Array.isArray(pipes) ? pipes : [];
    const actualEquipmentIcons = Array.isArray(equipmentIcons) ? equipmentIcons : [];
    const actualIrrigationPoints = Array.isArray(irrigationPoints) ? irrigationPoints : [];
    const actualIrrigationLines = Array.isArray(irrigationLines) ? irrigationLines : [];

    // *** FIXED: This function is now more robust to prevent crashes ***
    const calculateMapBounds = () => {
        // First try to use mainField coordinates
        if (mainField && mainField.coordinates && mainField.coordinates.length > 0) {
            try {
                // Handle multiple coordinate formats for robustness
                const coords = mainField.coordinates
                    .map((c: any) => {
                        if (
                            Array.isArray(c) &&
                            typeof c[0] === 'number' &&
                            typeof c[1] === 'number'
                        ) {
                            // It's [lat, lng], convert to [lng, lat] for turf
                            return [c[1], c[0]];
                        }
                        if (c && typeof c.lat === 'number' && typeof c.lng === 'number') {
                            // It's {lat, lng}, convert to [lng, lat] for turf
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

                let optimalZoom = 19; // เพิ่ม zoom level เริ่มต้น
                if (fieldAreaSize > 50000) optimalZoom = 16;
                else if (fieldAreaSize > 20000) optimalZoom = 17;
                else if (fieldAreaSize > 10000) optimalZoom = 18;
                else if (fieldAreaSize > 5000) optimalZoom = 19;

                return { center: [centerLat, centerLng], zoom: optimalZoom };
            } catch (error) {
                console.error('Error calculating bounds from mainField:', error);
                // Don't return here, let it fall through to the next check
            }
        }

        // Fallback: Try to use zones if mainField is not available or failed
        if (actualZones.length > 0) {
            try {
                // *** FIXED: Safer way to collect and validate all zone coordinates ***
                const allCoords = actualZones.flatMap((zone) => {
                    if (!zone.coordinates || !Array.isArray(zone.coordinates)) {
                        return []; // Return empty array if coordinates are missing or not an array
                    }
                    // Map over coordinates, validate format, and filter out invalid ones
                    return zone.coordinates
                        .map((c: any) => {
                            if (
                                Array.isArray(c) &&
                                typeof c[0] === 'number' &&
                                typeof c[1] === 'number'
                            ) {
                                return c as [number, number]; // Format is [lat, lng]
                            }
                            if (c && typeof c.lat === 'number' && typeof c.lng === 'number') {
                                return [c.lat, c.lng] as [number, number]; // Format is {lat, lng}
                            }
                            return null; // Invalid format
                        })
                        .filter((c): c is [number, number] => c !== null); // Filter out nulls
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

        // Final fallback: Use provided mapCenter or default
        return { center: mapCenter || [14.5995, 120.9842], zoom: mapZoom || 15 };
    };

    const { center: optimalCenter, zoom: optimalZoom } = calculateMapBounds();

    // Handle print events to ensure map renders correctly
    useEffect(() => {
        const handleBeforePrint = () => {
            setTimeout(() => window.dispatchEvent(new Event('resize')), 500);
        };
        const handleAfterPrint = () => {
            setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
        };
        window.addEventListener('beforeprint', handleBeforePrint);
        window.addEventListener('afterprint', handleAfterPrint);
        return () => {
            window.removeEventListener('beforeprint', handleBeforePrint);
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, []);

    // Remove duplicate irrigation points by unique ID
    const uniqueIrrigationPoints = actualIrrigationPoints.filter((point, index, array) => {
        if (!point || !point.id) return false;
        const firstIndex = array.findIndex((p) => p && p.id === point.id);
        return firstIndex === index;
    });

    // Show a subset of irrigation points for performance if there are too many
    let filteredIrrigationPoints = uniqueIrrigationPoints;
    if (uniqueIrrigationPoints.length > 200) {
        filteredIrrigationPoints = uniqueIrrigationPoints.filter((_, index) => index % 3 === 0);
    } else if (uniqueIrrigationPoints.length > 100) {
        filteredIrrigationPoints = uniqueIrrigationPoints.filter((_, index) => index % 2 === 0);
    }

    // Clean and normalize irrigation types
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

    // Calculate totals
    const totalZones = actualZones.length;
    const mainPipes = actualPipes.filter((p) => p.type === 'main').length;
    const submainPipes = actualPipes.filter((p) => p.type === 'submain').length;
    const lateralPipes = actualPipes.filter((p) => p.type === 'lateral').length;

    const uniqueEquipment = actualEquipmentIcons.filter(
        (equipment, index, array) => array.findIndex((e) => e.id === equipment.id) === index
    );
    const pumpCount = uniqueEquipment.filter((e) => e.type === 'pump').length;
    const valveCount = uniqueEquipment.filter((e) => e.type === 'ballvalve').length;
    const solenoidCount = uniqueEquipment.filter((e) => e.type === 'solenoid').length;

    // *** THE FIX: ใช้ข้อมูลที่คำนวณแล้ว ***
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

    // Format area
    const areaInRai = fieldAreaSize / 1600;

    // Selected crop objects
    const selectedCropObjects = (selectedCrops || [])
        .map((cropValue) => getCropByValue(cropValue))
        .filter(Boolean);

    // Create custom equipment icons for map display
    const createEquipmentIcon = (equipment: any) => {
        const equipmentConfig = EQUIPMENT_TYPES[equipment.type as EquipmentType];
        if (!equipmentConfig) return null;
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
                <Head title="Field Crop Summary - No Data" />
                <div className="container mx-auto px-4 py-6">
                    <div className="rounded-lg bg-gray-800 p-8 text-center">
                        <div className="mb-4 text-6xl">📋</div>
                        <h2 className="mb-4 text-2xl font-bold text-yellow-400">
                            No Project Data Found
                        </h2>
                        <p className="mb-6 text-gray-400">
                            Please return to the Field Map page, complete the steps, and click "View
                            Summary".
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
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white print:bg-white print:text-black">
            <Head title="Field Crop Summary - Irrigation Planning" />

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
                    .print-hide { 
                        display: none !important; 
                    }
                    .print-show { 
                        display: block !important; 
                    }
                    .print-map-only {
                        display: flex !important;
                        flex-direction: column !important;
                        height: 100vh !important;
                        width: 100vw !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .print-map-container {
                        flex: 1 !important;
                        width: 100% !important;
                        height: 100% !important;
                        min-height: 700px !important;
                    }
                    .print-map-header {
                        background: white !important;
                        color: black !important;
                        padding: 10px !important;
                        border-bottom: 1px solid #ccc !important;
                        flex-shrink: 0 !important;
                    }
                    .leaflet-container { 
                        height: 100% !important; 
                        width: 100% !important; 
                    }
                    .print-other-content {
                        display: none !important;
                    }
                }
            `}</style>

            {/* Header */}
            <div className="border-b border-gray-700 bg-gray-800 print:hidden">
                <div className="container mx-auto px-4 py-4">
                    <div className="mx-auto max-w-7xl">
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
                        <h1 className="mb-1 text-3xl font-bold">📊 Field Crop Summary</h1>
                        <p className="mb-2 text-gray-400">
                            Complete overview of your irrigation planning project
                        </p>
                    </div>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:mb-4 print:block">
                <h1 className="text-2xl font-bold text-black">📊 Field Crop Summary</h1>
                <p className="text-gray-600">Generated on {new Date().toLocaleDateString()}</p>
                <hr className="my-2 border-gray-300" />
            </div>

            {/* Main Content */}
            <div className="print:print-layout container mx-auto px-4 py-4">
                <div className="mx-auto max-w-7xl print:max-w-none">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-2 print:gap-6">
                        {/* Left Column: Project Overview & Details */}
                        <div className="print:print-summary-section space-y-4">
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
                                        (crop) =>
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
                                <div className="mb-3">
                                    <h3 className="mb-2 text-sm font-semibold text-blue-400 print:text-xs print:text-black">
                                        📏 Pipe System
                                    </h3>
                                    <div className="grid grid-cols-3 gap-1">
                                        <div className="rounded bg-gray-700 p-1 text-center print:border">
                                            <div className="text-sm font-bold text-blue-400">
                                                {mainPipes}
                                            </div>
                                            <div className="text-xs text-gray-400">Main</div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border">
                                            <div className="text-sm font-bold text-green-400">
                                                {submainPipes}
                                            </div>
                                            <div className="text-xs text-gray-400">Submain</div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border">
                                            <div className="text-sm font-bold text-purple-400">
                                                {lateralPipes}
                                            </div>
                                            <div className="text-xs text-gray-400">Lateral</div>
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
                                            <div className="text-xs text-gray-400">Solenoids</div>
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
                                            <div className="text-xs text-gray-400">Sprinklers</div>
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
                                            <div className="text-xs text-gray-400">Drip Points</div>
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
                                    <div className="rounded-lg bg-gray-700 p-2 print:border">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400">
                                                Total Estimated Yield
                                            </span>
                                            <span className="text-sm font-bold text-yellow-400">
                                                {totalEstimatedYield.toLocaleString()} kg
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 print:border">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400">
                                                Total Estimated Income
                                            </span>
                                            <span className="text-sm font-bold text-green-400">
                                                ฿{totalEstimatedIncome.toLocaleString()}
                                            </span>
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

                        {/* Right Column: Zone Details & Map */}
                        <div className="space-y-4 print:contents">
                            {/* Zone Details - ซ่อนเมื่อพิมพ์ */}
                            <div className="print:print-other-content rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                <h2 className="mb-3 text-lg font-bold text-blue-400 print:text-base print:text-black">
                                    🎯 Zone Details
                                </h2>
                                <div className="space-y-2 print:space-y-1">
                                    {actualZones.map((zone) => {
                                        const summary = calculatedZoneSummaries[zone.id];
                                        const assignedCrop = zoneAssignments[zone.id]
                                            ? getCropByValue(zoneAssignments[zone.id])
                                            : null;
                                        const irrigationType = irrigationAssignments[zone.id];
                                        return (
                                            <div
                                                key={zone.id}
                                                className="rounded-lg bg-gray-700 p-2 print:border"
                                            >
                                                <div className="mb-1 flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <div
                                                            className="h-2 w-2 rounded-full"
                                                            style={{ backgroundColor: zone.color }}
                                                        ></div>
                                                        <h3 className="text-sm font-semibold text-white">
                                                            {zone.name}
                                                        </h3>
                                                    </div>
                                                    {assignedCrop && (
                                                        <span className="text-sm">
                                                            {assignedCrop.icon}
                                                        </span>
                                                    )}
                                                </div>
                                                {summary ? (
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div>
                                                            <div className="text-gray-400">
                                                                Crop
                                                            </div>
                                                            <div className="font-semibold text-white">
                                                                {summary.cropName}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400">
                                                                Points
                                                            </div>
                                                            <div className="font-semibold text-green-400">
                                                                {summary.totalPlantingPoints.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400">
                                                                Yield
                                                            </div>
                                                            <div className="font-semibold text-yellow-400">
                                                                {summary.estimatedYield.toLocaleString()}{' '}
                                                                kg
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400">
                                                                Income
                                                            </div>
                                                            <div className="font-semibold text-green-400">
                                                                ฿
                                                                {summary.estimatedPrice.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        {irrigationType && (
                                                            <div className="col-span-2">
                                                                <div className="text-gray-400">
                                                                    Irrigation
                                                                </div>
                                                                <div className="font-semibold text-cyan-400">
                                                                    {irrigationType}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="col-span-2">
                                                            <div className="text-gray-400">
                                                                Spacing
                                                            </div>
                                                            <div className="font-semibold text-blue-400">
                                                                แถว: {summary.rowSpacing}m, ต้น:{' '}
                                                                {summary.plantSpacing}m
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-400">
                                                        No summary data available.
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Map Visualization */}
                            <div className="print:print-map-container overflow-hidden rounded-lg bg-gray-800 print:border">
                                <div className="flex h-full flex-col">
                                    <div className="print:print-map-header border-b border-gray-600 bg-gray-700 p-2">
                                        <h3 className="text-sm font-semibold text-white print:text-black">
                                            🗺️ Project Map Overview - Scale 1:1000
                                        </h3>
                                    </div>
                                    <div
                                        className="print:print-map-container relative"
                                        style={{ minHeight: 300, height: '400px' }}
                                    >
                                        <MapContainer
                                            center={optimalCenter}
                                            zoom={optimalZoom}
                                            maxZoom={20}
                                            style={{ height: '100%', width: '100%' }}
                                            scrollWheelZoom={true}
                                        >
                                            <TileLayer
                                                url={
                                                    MAP_TILES[mapType]?.url ||
                                                    MAP_TILES.satellite.url
                                                }
                                                attribution={
                                                    MAP_TILES[mapType]?.attribution ||
                                                    MAP_TILES.satellite.attribution
                                                }
                                                maxZoom={20}
                                            />
                                            <FeatureGroup>
                                                {mainField &&
                                                    mainField.coordinates &&
                                                    Array.isArray(mainField.coordinates) && (
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
                                                {actualZones.map((zone) =>
                                                    zone.coordinates &&
                                                    Array.isArray(zone.coordinates) ? (
                                                        <Polygon
                                                            key={zone.id}
                                                            positions={zone.coordinates}
                                                            pathOptions={{
                                                                color: zone.color || '#3B82F6',
                                                                fillColor: zone.color || '#3B82F6',
                                                                fillOpacity: 0.3,
                                                                weight: 2,
                                                            }}
                                                        />
                                                    ) : null
                                                )}
                                                {actualPipes.map((pipe) => {
                                                    // กำหนดสีและน้ำหนักของเส้นตามประเภทท่อ
                                                    let pipeColor = pipe.color;
                                                    let pipeWeight = 4;

                                                    if (pipe.type === 'main') {
                                                        pipeColor = pipeColor || '#DC2626'; // สีแดง
                                                        pipeWeight = 6;
                                                    } else if (pipe.type === 'submain') {
                                                        pipeColor = pipeColor || '#2563EB'; // สีน้ำเงิน
                                                        pipeWeight = 4;
                                                    } else if (pipe.type === 'lateral') {
                                                        pipeColor = pipeColor || '#16A34A'; // สีเขียว
                                                        pipeWeight = 2;
                                                    }

                                                    return pipe.coordinates &&
                                                        Array.isArray(pipe.coordinates) ? (
                                                        <Polyline
                                                            key={pipe.id}
                                                            positions={pipe.coordinates}
                                                            pathOptions={{
                                                                color: pipeColor,
                                                                weight: pipeWeight,
                                                                opacity: 0.9,
                                                            }}
                                                        />
                                                    ) : null;
                                                })}
                                                {uniqueEquipment.map((equipment) => {
                                                    const customIcon =
                                                        createEquipmentIcon(equipment);
                                                    return customIcon &&
                                                        equipment.lat &&
                                                        equipment.lng ? (
                                                        <Marker
                                                            key={equipment.id}
                                                            position={[
                                                                equipment.lat,
                                                                equipment.lng,
                                                            ]}
                                                            icon={customIcon}
                                                        />
                                                    ) : null;
                                                })}
                                                {filteredIrrigationPoints.map((point, index) => {
                                                    let lat, lng;
                                                    if (point.lat && point.lng) {
                                                        [lat, lng] = [point.lat, point.lng];
                                                    } else if (Array.isArray(point.position)) {
                                                        [lat, lng] = point.position;
                                                    }
                                                    if (!lat || !lng) return null;

                                                    const normalizedType = normalizeIrrigationType(
                                                        point.type
                                                    );
                                                    // กำหนดสีตามประเภทระบบรดน้ำ
                                                    let color = '#06b6d4'; // สีเริ่มต้น (cyan)
                                                    if (normalizedType === 'sprinkler')
                                                        color = '#22c55e'; // เขียว
                                                    else if (normalizedType === 'mini_sprinkler')
                                                        color = '#3b82f6'; // น้ำเงิน
                                                    else if (normalizedType === 'micro_spray')
                                                        color = '#f97316'; // ส้ม
                                                    else if (normalizedType === 'drip_tape')
                                                        color = '#06b6d4'; // cyan

                                                    return (
                                                        <CircleMarker
                                                            key={point.id || `irrigation-${index}`}
                                                            center={[lat, lng]}
                                                            radius={4}
                                                            pathOptions={{
                                                                color: color,
                                                                fillColor: color,
                                                                fillOpacity: 0.9,
                                                                weight: 2,
                                                            }}
                                                        />
                                                    );
                                                })}
                                                {uniqueIrrigationLines.map((line) =>
                                                    line.coordinates &&
                                                    Array.isArray(line.coordinates) ? (
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
                                                {filteredIrrigationPoints.map((point, index) => {
                                                    let lat, lng;
                                                    if (point.lat && point.lng) {
                                                        [lat, lng] = [point.lat, point.lng];
                                                    } else if (Array.isArray(point.position)) {
                                                        [lat, lng] = point.position;
                                                    }
                                                    if (
                                                        !lat ||
                                                        !lng ||
                                                        !point.radius ||
                                                        normalizeIrrigationType(point.type) ===
                                                            'drip_tape'
                                                    )
                                                        return null;

                                                    const normalizedType = normalizeIrrigationType(
                                                        point.type
                                                    );
                                                    // กำหนดสีตามประเภทระบบรดน้ำ - ใช้สีเดียวกันกับจุด
                                                    let color = '#06b6d4'; // สีเริ่มต้น (cyan)
                                                    if (normalizedType === 'sprinkler')
                                                        color = '#22c55e'; // เขียว
                                                    else if (normalizedType === 'mini_sprinkler')
                                                        color = '#3b82f6'; // น้ำเงิน
                                                    else if (normalizedType === 'micro_spray')
                                                        color = '#f97316'; // ส้ม

                                                    return (
                                                        <Circle
                                                            key={`${point.id || index}-coverage`}
                                                            center={[lat, lng]}
                                                            radius={point.radius}
                                                            pathOptions={{
                                                                color: color,
                                                                fillColor: color,
                                                                fillOpacity: 0.1,
                                                                weight: 1,
                                                                opacity: 0.6,
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </FeatureGroup>
                                        </MapContainer>
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
