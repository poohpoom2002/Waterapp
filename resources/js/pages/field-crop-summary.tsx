import { Head, Link } from '@inertiajs/react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
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
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

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

// ฟังก์ชันคำนวณจำนวนจุดปลูกในโซน - ใช้ข้อมูลจาก cropData
const calculatePlantingPoints = (
    zoneArea: number, // ตารางเมตร
    crop: any, // crop object จาก cropData
    customRowSpacing?: number, // custom spacing ถ้ามี (เมตร)
    customPlantSpacing?: number // custom spacing ถ้ามี (เมตร)
): number => {
    if (!zoneArea || !crop) return 0;

    // ใช้ custom spacing ถ้ามี หรือใช้ค่าจาก cropData (แปลง cm เป็น m)
    const rowSpacing = customRowSpacing || (crop.rowSpacing / 100); // cm -> m
    const plantSpacing = customPlantSpacing || (crop.plantSpacing / 100); // cm -> m

    if (!rowSpacing || !plantSpacing) return 0;

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

// ฟังก์ชันคำนวณผลผลิตและราคา - ใช้ข้อมูลจาก cropData
const calculateYieldAndPrice = (
    zoneArea: number, // ตารางเมตร
    crop: any
): { estimatedYield: number; estimatedPrice: number } => {
    if (!zoneArea || !crop) {
        return { estimatedYield: 0, estimatedPrice: 0 };
    }

    // แปลงพื้นที่จากตารางเมตรเป็นไร่ (1 ไร่ = 1600 ตารางเมตร)
    const areaInRai = zoneArea / 1600;

    // คำนวณผลผลิตรวม (กิโลกรัม) จากข้อมูล yield ใน cropData (กก./ไร่)
    const estimatedYield = Math.round(areaInRai * crop.yield);

    // คำนวณราคารวม (บาท) จากข้อมูล price ใน cropData (บาท/กก.)
    const estimatedPrice = Math.round(estimatedYield * crop.price);

    return { estimatedYield, estimatedPrice };
};

// ฟังก์ชันคำนวณความต้องการน้ำรวม - เปลี่ยนเป็นลิตรต่อครั้ง (ไม่หาร)
const calculateWaterRequirement = (
    plantingPoints: number,
    crop: any
): number => {
    if (!plantingPoints || !crop || !crop.waterRequirement) {
        return 0;
    }

    // ใช้ค่าจาก cropData เป็นลิตร/ต้น/ครั้ง โดยตรง (ไม่หาร)
    const waterPerPlantPerIrrigation = crop.waterRequirement;
    
    // คำนวณความต้องการน้ำรวมต่อครั้ง (ลิตร/ครั้ง)
    const totalWaterRequirement = plantingPoints * waterPerPlantPerIrrigation;

    return Math.round(totalWaterRequirement);
};

// ฟังก์ชันคำนวณความยาวท่อจากพิกัด
const calculatePipeLength = (coordinates: any[]): number => {
    if (!coordinates || coordinates.length < 2) return 0;

    try {
        let totalLength = 0;
        for (let i = 0; i < coordinates.length - 1; i++) {
            const point1 = coordinates[i];
            const point2 = coordinates[i + 1];
            
            // Handle different coordinate formats
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

            // Create turf points and calculate distance
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

// ฟังก์ชันคำนวณสถิติท่อแต่ละประเภท - นับเฉพาะท่อที่วาดเสร็จแล้ว
const calculatePipeStats = (pipes: any[], pipeType: string) => {
    // กรองเฉพาะท่อที่มีพิกัดและวาดเสร็จแล้ว
    const typePipes = pipes.filter(pipe => 
        pipe.type === pipeType && 
        pipe.coordinates && 
        Array.isArray(pipe.coordinates) && 
        pipe.coordinates.length >= 2
    );
    
    if (typePipes.length === 0) {
        return {
            count: 0,
            longestLength: 0,
            totalLength: 0
        };
    }

    const lengths = typePipes.map(pipe => calculatePipeLength(pipe.coordinates));
    const totalLength = lengths.reduce((sum, length) => sum + length, 0);
    const longestLength = Math.max(...lengths);

    return {
        count: typePipes.length,
        longestLength: Math.round(longestLength),
        totalLength: Math.round(totalLength)
    };
};

// ฟังก์ชันตรวจสอบว่าท่อผ่านหรืออยู่ในโซนหรือไม่
const isPipeInZone = (pipe: any, zone: any): boolean => {
    if (!pipe.coordinates || !Array.isArray(pipe.coordinates) || pipe.coordinates.length < 2) {
        return false;
    }
    
    if (!zone.coordinates || !Array.isArray(zone.coordinates) || zone.coordinates.length < 3) {
        return false;
    }
    
    try {
        // สร้าง polygon ของโซน
        const zoneCoords = zone.coordinates.map((coord: any) => {
            if (Array.isArray(coord) && coord.length === 2) {
                return [coord[1], coord[0]]; // [lat, lng] -> [lng, lat] for turf
            }
            if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
                return [coord.lng, coord.lat];
            }
            return null;
        }).filter((coord: any): coord is [number, number] => coord !== null);
        
        if (zoneCoords.length < 3) return false;
        
        // ปิด polygon ถ้ายังไม่ปิด
        const firstPoint = zoneCoords[0];
        const lastPoint = zoneCoords[zoneCoords.length - 1];
        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
            zoneCoords.push(firstPoint);
        }
        
        const zonePolygon = turf.polygon([zoneCoords]);
        
        // ตรวจสอบทุกจุดของท่อ
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
            
            // ถ้าจุดใดจุดหนึ่งของท่ออยู่ในโซน ถือว่าท่อนี้อยู่ในโซน
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

// ฟังก์ชันจำแนกประเภทท่อจากสีหรือคุณสมบัติ
const identifyPipeType = (pipe: any): string => {
    // วิธีที่ 1: ใช้ type ที่มีอยู่แล้ว
    if (pipe.type) {
        return pipe.type;
    }
    
    // วิธีที่ 2: ใช้สีเพื่อจำแนกประเภท (ถ้าไม่มี type)
    if (pipe.color) {
        const color = pipe.color.toLowerCase();
        // ตาม PIPE_TYPES constants:
        // main: blue (#2563EB)
        // submain: green (#16A34A) 
        // lateral: orange/purple (#EA580C)
        
        if (color.includes('blue') || color.includes('#2563eb') || color.includes('2563eb')) {
            return 'main';
        } else if (color.includes('green') || color.includes('#16a34a') || color.includes('16a34a')) {
            return 'submain';
        } else if (color.includes('orange') || color.includes('purple') || color.includes('#ea580c') || color.includes('ea580c')) {
            return 'lateral';
        }
    }
    
    // วิธีที่ 3: ใช้ pathOptions.color (สำหรับ Leaflet Polyline)
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
    
    // ค่าเริ่มต้น
    return 'lateral';
};

// ฟังก์ชันคำนวณข้อมูล pipe system ในแต่ละโซน - ปรับปรุงใหม่
const calculateZonePipeStats = (pipes: any[], zoneId: string, zones: any[]) => {
    // หาโซนที่ต้องการ
    const currentZone = zones.find(zone => zone.id.toString() === zoneId);
    if (!currentZone) {
        return {
            main: { count: 0, totalLength: 0, longestLength: 0 },
            submain: { count: 0, totalLength: 0, longestLength: 0 },
            lateral: { count: 0, totalLength: 0, longestLength: 0 },
            total: 0,
            totalLength: 0,
            totalLongestLength: 0
        };
    }
    
    console.log(`🔍 Checking pipes for zone ${zoneId} (${currentZone.name})...`);
    console.log(`📏 Total pipes to check: ${pipes.length}`);
    
    // กรองท่อที่อยู่ในโซน - ใช้ทั้ง zoneId และการตรวจสอบทางกายภาพ
    const zonePipes = pipes.filter(pipe => {
        if (!pipe.coordinates || !Array.isArray(pipe.coordinates) || pipe.coordinates.length < 2) {
            return false;
        }
        
        // วิธีที่ 1: ตรวจสอบจาก zoneId (ถ้ามี)
        const hasZoneId = pipe.zoneId && pipe.zoneId.toString() === zoneId;
        
        // วิธีที่ 2: ตรวจสอบว่าท่อผ่านหรืออยู่ในโซนจริงๆ หรือไม่
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
                coordinatesLength: pipe.coordinates.length
            });
        }
        
        return isZonePipe;
    });
    
    console.log(`📊 Found ${zonePipes.length} pipes in zone ${zoneId}`);
    
    // แยกประเภทท่อโดยใช้ฟังก์ชันจำแนกประเภทใหม่
    const mainPipes = zonePipes.filter(pipe => identifyPipeType(pipe) === 'main');
    const submainPipes = zonePipes.filter(pipe => identifyPipeType(pipe) === 'submain');
    const lateralPipes = zonePipes.filter(pipe => identifyPipeType(pipe) === 'lateral');
    
    console.log(`🔵 Main pipes (สีน้ำเงิน): ${mainPipes.length}`);
    console.log(`🟢 Submain pipes (สีเขียว): ${submainPipes.length}`);
    console.log(`🟣 Lateral pipes (สีส้ม/ม่วง): ${lateralPipes.length}`);
    
    const calculateTypeStats = (typePipes: any[]) => {
        if (typePipes.length === 0) return { count: 0, totalLength: 0, longestLength: 0 };
        const lengths = typePipes.map(pipe => calculatePipeLength(pipe.coordinates));
        return {
            count: typePipes.length,
            totalLength: Math.round(lengths.reduce((sum, length) => sum + length, 0)),
            longestLength: Math.round(Math.max(...lengths))
        };
    };
    
    const mainStats = calculateTypeStats(mainPipes);
    const submainStats = calculateTypeStats(submainPipes);
    const lateralStats = calculateTypeStats(lateralPipes);
    
    // คำนวณความยาวรวม
    const totalLongestLength = mainStats.longestLength + submainStats.longestLength + lateralStats.longestLength;
    const totalAllLength = mainStats.totalLength + submainStats.totalLength + lateralStats.totalLength;
    
    const result = {
        main: mainStats,
        submain: submainStats,
        lateral: lateralStats,
        total: zonePipes.length,
        totalLength: totalAllLength,
        totalLongestLength: totalLongestLength
    };
    
    console.log(`📋 Zone ${zoneId} pipe stats:`, result);
    
    return result;
};

// Helper function to standardize irrigation types for consistent coloring
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
    // Get data from props (from route), localStorage, or default values
    const [summaryData, setSummaryData] = useState<any>(null);
    const [dataSource, setDataSource] = useState<string>('');
    const [calculatedZoneSummaries, setCalculatedZoneSummaries] = useState<Record<string, any>>({});

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

    // คำนวณข้อมูลโซนเมื่อข้อมูลพร้อม - ใช้ข้อมูลจาก cropData และเปลี่ยนเป็นลิตรต่อครั้ง
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
                        // คำนวณพื้นที่โซน
                        const zoneArea = calculateZoneArea(zone.coordinates);

                        // ใช้ spacing ที่ตั้งค่าไว้ หรือใช้ค่าเริ่มต้นจากข้อมูลพืชใน cropData
                        const effectiveRowSpacing = rowSpacing[assignedCropValue] 
                            ? rowSpacing[assignedCropValue] 
                            : (crop.rowSpacing / 100); // แปลง cm เป็น m

                        const effectivePlantSpacing = plantSpacing[assignedCropValue] 
                            ? plantSpacing[assignedCropValue] 
                            : (crop.plantSpacing / 100); // แปลง cm เป็น m

                        // คำนวณจำนวนจุดปลูก
                        const totalPlantingPoints = calculatePlantingPoints(
                            zoneArea,
                            crop,
                            effectiveRowSpacing,
                            effectivePlantSpacing
                        );

                        // คำนวณผลผลิตและราคาจาก cropData
                        const { estimatedYield, estimatedPrice } = calculateYieldAndPrice(
                            zoneArea,
                            crop
                        );

                        // คำนวณความต้องการน้ำต่อครั้ง (ไม่หาร)
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
                            zoneArea: Math.round(zoneArea), // ตารางเมตร
                            zoneAreaRai: Math.round((zoneArea / 1600) * 100) / 100, // ไร่
                            rowSpacing: effectiveRowSpacing,
                            plantSpacing: effectivePlantSpacing,
                            totalPlantingPoints: totalPlantingPoints,
                            estimatedYield: estimatedYield, // กิโลกรัม
                            estimatedPrice: estimatedPrice, // บาท
                            waterRequirementPerIrrigation: waterRequirementPerIrrigation, // ลิตร/ครั้ง
                            waterRequirementPerDay: waterRequirementPerIrrigation, // ลิตร/วัน (เท่ากับ per irrigation)
                            cropYieldPerRai: crop.yield, // กก./ไร่ จาก cropData
                            cropPricePerKg: crop.price, // บาท/กก. จาก cropData
                            cropWaterPerPlant: crop.waterRequirement, // ลิตร/ต้น/ครั้ง จาก cropData
                            cropWaterPerPlantPerIrrigation: crop.waterRequirement, // ลิตร/ต้น/ครั้ง (เท่ากันกับด้านบน)
                            growthPeriod: crop.growthPeriod, // วัน
                            irrigationNeeds: crop.irrigationNeeds, // low/medium/high
                            irrigationType: irrigationAssignments[zoneId] || 'ไม่ได้กำหนด',
                        };

                        console.log(`📊 Zone ${zone.name} calculations with cropData (per irrigation):`, {
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
                        waterRequirementPerDay: 0, // เก็บไว้เผื่อใช้ในอนาคต
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
            console.log('✅ Zone calculations completed with cropData (per irrigation):', newZoneSummaries);
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
    
    // Calculate pipe statistics - นับเฉพาะท่อที่วาดเสร็จแล้ว
    const mainPipeStats = calculatePipeStats(actualPipes, 'main');
    const submainPipeStats = calculatePipeStats(actualPipes, 'submain');
    const lateralPipeStats = calculatePipeStats(actualPipes, 'lateral');

    const uniqueEquipment = actualEquipmentIcons.filter(
        (equipment, index, array) => array.findIndex((e) => e.id === equipment.id) === index
    );
    const pumpCount = uniqueEquipment.filter((e) => e.type === 'pump').length;
    const valveCount = uniqueEquipment.filter((e) => e.type === 'ballvalve').length;
    const solenoidCount = uniqueEquipment.filter((e) => e.type === 'solenoid').length;

    // *** การคำนวณรวมใช้ข้อมูลที่คำนวณแล้วจาก cropData - เปลี่ยนเป็นลิตรต่อครั้ง ***
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
        <div className="min-h-screen flex flex-col bg-gray-900 text-white print:bg-white print:text-black">
            <Navbar />
            <Head title="Field Crop Summary - Irrigation Planning" />

            {/* Header */}
            <div className="border-b border-gray-700 bg-gray-800 print:hidden">
                <div className="container mx-auto px-4 py-4">
                    <div className="mx-auto max-w-7xl">
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
                            {/* Map Visualization - ย้ายมาด้านบนสุด */}
                            <div className="print:print-map-container overflow-hidden rounded-lg bg-gray-800 print:border">
                                <div className="flex h-full flex-col">
                                    <div className="print:print-map-header border-b border-gray-600 bg-gray-700 p-2">
                                        <h3 className="text-sm font-semibold text-white print:text-black">
                                            🗺️ Project Map Overview
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
                                                    // **IMPROVED LOGIC**
                                                    const pipeConfig = PIPE_TYPES[pipe.type as PipeType] || { color: '#888888', weight: 3 };
                                                    
                                                    return pipe.coordinates &&
                                                        Array.isArray(pipe.coordinates) ? (
                                                        <Polyline
                                                            key={pipe.id}
                                                            positions={pipe.coordinates}
                                                            pathOptions={{
                                                                color: pipeConfig.color,
                                                                weight: pipeConfig.weight,
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

                                                    // **IMPROVED LOGIC**
                                                    const normalizedType = normalizeIrrigationType(
                                                        point.type
                                                    );
                                                    let color = '#06b6d4'; // Default (cyan)
                                                    if (normalizedType === 'sprinkler')
                                                        color = '#22c55e'; // Green
                                                    else if (normalizedType === 'mini_sprinkler')
                                                        color = '#3b82f6'; // Blue
                                                    else if (normalizedType === 'micro_spray')
                                                        color = '#f97316'; // Orange
                                                    
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
                                                    
                                                    // **IMPROVED LOGIC**
                                                    const normalizedType = normalizeIrrigationType(
                                                        point.type
                                                    );
                                                    let color = '#06b6d4'; // Default (cyan)
                                                    if (normalizedType === 'sprinkler')
                                                        color = '#22c55e'; // Green
                                                    else if (normalizedType === 'mini_sprinkler')
                                                        color = '#3b82f6'; // Blue
                                                    else if (normalizedType === 'micro_spray')
                                                        color = '#f97316'; // Orange

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

                            {/* Crop Information - ซ่อนการแสดงผลแต่เก็บโครงสร้างข้อมูลไว้ */}
                            <div style={{ display: 'none' }} className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                <h2 className="mb-3 text-lg font-bold text-green-400 print:text-base print:text-black">
                                    🌱 Crop Information (from cropData)
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
                                                                <div className="text-xs text-gray-400 print:text-gray-600">
                                                                    {crop.category} • {crop.irrigationNeeds} water needs
                                                                </div>
                                                                <div className="text-xs text-gray-400 print:text-gray-600">
                                                                    Growth: {crop.growthPeriod} days
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                                <strong>Spacing:</strong>
                                                            </div>
                                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                                แถว: {crop.rowSpacing} ซม.
                                                            </div>
                                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                                ต้น: {crop.plantSpacing} ซม.
                                                            </div>
                                                            <div className="text-xs text-gray-400 print:text-gray-600 mt-1">
                                                                <strong>Production:</strong>
                                                            </div>
                                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                                {crop.yield} กก./ไร่
                                                            </div>
                                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                                {crop.price} บาท/กก.
                                                            </div>
                                                            <div className="text-xs text-gray-400 print:text-gray-600 mt-1">
                                                                <strong>Water:</strong>
                                                            </div>
                                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                                {crop.waterRequirement} ล./ต้น/ครั้ง
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
                                        📏 Pipe System (วาดเสร็จแล้วเท่านั้น)
                                    </h3>
                                    <div className="space-y-2">
                                        {/* Main Pipes */}
                                        <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-medium text-blue-300 print:text-black">Main Pipes</span>
                                                <span className="text-xs font-bold text-blue-400 print:text-black">{mainPipeStats.count} ท่อ</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 text-xs">
                                                <div>
                                                    <span className="text-gray-400 print:text-gray-600">ยาวสุด: </span>
                                                    <span className="text-blue-300 print:text-black font-medium">{mainPipeStats.longestLength.toLocaleString()} ม.</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 print:text-gray-600">รวม: </span>
                                                    <span className="text-blue-300 print:text-black font-medium">{mainPipeStats.totalLength.toLocaleString()} ม.</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Submain Pipes */}
                                        <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-medium text-green-300 print:text-black">Submain Pipes</span>
                                                <span className="text-xs font-bold text-green-400 print:text-black">{submainPipeStats.count} ท่อ</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 text-xs">
                                                <div>
                                                    <span className="text-gray-400 print:text-gray-600">ยาวสุด: </span>
                                                    <span className="text-green-300 print:text-black font-medium">{submainPipeStats.longestLength.toLocaleString()} ม.</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 print:text-gray-600">รวม: </span>
                                                    <span className="text-green-300 print:text-black font-medium">{submainPipeStats.totalLength.toLocaleString()} ม.</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Lateral Pipes */}
                                        <div className="rounded bg-gray-700 p-2 print:border print:bg-gray-50">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-medium text-purple-300 print:text-black">Lateral Pipes</span>
                                                <span className="text-xs font-bold text-purple-400 print:text-black">{lateralPipeStats.count} ท่อ</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 text-xs">
                                                <div>
                                                    <span className="text-gray-400 print:text-gray-600">ยาวสุด: </span>
                                                    <span className="text-purple-300 print:text-black font-medium">{lateralPipeStats.longestLength.toLocaleString()} ม.</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 print:text-gray-600">รวม: </span>
                                                    <span className="text-purple-300 print:text-black font-medium">{lateralPipeStats.totalLength.toLocaleString()} ม.</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Total Summary */}
                                        <div className="rounded bg-blue-900/30 p-2 print:border print:bg-blue-50">
                                            <div className="text-center">
                                                <span className="text-xs font-medium text-blue-300 print:text-blue-800">ความยาวท่อที่ยาวสุดรวม: </span>
                                                <span className="text-sm font-bold text-blue-100 print:text-blue-900">
                                                    {(mainPipeStats.longestLength + submainPipeStats.longestLength + lateralPipeStats.longestLength).toLocaleString()} ม.
                                                </span>
                                            </div>
                                            <div className="text-center mt-1">
                                                <span className="text-xs font-medium text-blue-300 print:text-blue-800">ความยาวท่อรวมทั้งหมด: </span>
                                                <span className="text-sm font-bold text-blue-100 print:text-blue-900">
                                                    {(mainPipeStats.totalLength + submainPipeStats.totalLength + lateralPipeStats.totalLength).toLocaleString()} ม.
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

                            {/* Financial & Water Summary */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                <h2 className="mb-3 text-lg font-bold text-green-400 print:text-base print:text-black">
                                    💰 Financial & Water Summary
                                </h2>
                                <div className="space-y-3 print:space-y-2">
                                    {/* Financial Summary */}
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

                                    {/* Water Requirements Summary - เปลี่ยนเป็นลิตรต่อครั้ง */}
                                    <div className="bg-cyan-900/30 p-3 rounded-lg print:bg-cyan-50 print:border-2 print:border-cyan-200">
                                        <h3 className="text-sm font-semibold text-cyan-300 mb-2 print:text-cyan-800">
                                            💧 Total Water Requirements (ลิตรต่อครั้ง - from cropData)
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                    Total Farm Area: {areaInRai.toFixed(2)} ไร่
                                                </div>
                                                <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                    Total Plants: {totalPlantingPoints.toLocaleString()} ต้น
                                                </div>
                                                <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                    Active Zones: {Object.keys(calculatedZoneSummaries).filter(id => calculatedZoneSummaries[id].cropValue).length} zones
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-cyan-200 print:text-cyan-700 mb-1">
                                                    Water Need per Irrigation:
                                                </div>
                                                <div className="font-bold text-cyan-100 print:text-cyan-800 text-xl">
                                                    {totalWaterRequirementPerIrrigation.toLocaleString()}
                                                </div>
                                                <div className="text-xs text-cyan-200 print:text-cyan-700">
                                                    ลิตร/ครั้ง
                                                </div>
                                                <div className="text-xs text-cyan-200 print:text-cyan-700 mt-1">
                                                    ({(totalWaterRequirementPerIrrigation / 1000).toFixed(1)} ลบ.ม./ครั้ง)
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Water breakdown by zone */}
                                        <div className="mt-3 pt-2 border-t border-cyan-700 print:border-cyan-300">
                                            <div className="text-xs text-cyan-200 print:text-cyan-700 mb-2 font-medium">
                                                Water Requirements by Zone (per irrigation):
                                            </div>
                                            <div className="space-y-1 max-h-24 overflow-y-auto">
                                                {Object.values(calculatedZoneSummaries)
                                                    .filter((summary: any) => summary.cropValue)
                                                    .map((summary: any) => (
                                                        <div key={summary.zoneId} className="flex justify-between text-xs">
                                                            <span className="text-cyan-200 print:text-cyan-700">
                                                                {summary.zoneName} ({summary.zoneAreaRai} ไร่)
                                                            </span>
                                                            <span className="text-cyan-100 print:text-cyan-800 font-medium">
                                                                {summary.waterRequirementPerIrrigation.toLocaleString()} ล./ครั้ง
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* Monthly and yearly projections - อัปเดตให้ใช้ข้อมูลใหม่ */}
                                        <div className="mt-3 pt-2 border-t border-cyan-700 print:border-cyan-300">
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="text-center bg-cyan-800/50 p-2 rounded print:bg-cyan-100">
                                                    <div className="text-cyan-200 print:text-cyan-700">Monthly</div>
                                                    <div className="font-bold text-cyan-100 print:text-cyan-800">
                                                        {(totalWaterRequirementPerIrrigation * 30 / 1000).toFixed(1)}
                                                    </div>
                                                    <div className="text-cyan-200 print:text-cyan-700">ลบ.ม./เดือน</div>
                                                </div>
                                                <div className="text-center bg-cyan-800/50 p-2 rounded print:bg-cyan-100">
                                                    <div className="text-cyan-200 print:text-cyan-700">Yearly</div>
                                                    <div className="font-bold text-cyan-100 print:text-cyan-800">
                                                        {(totalWaterRequirementPerIrrigation * 365 / 1000).toFixed(0)}
                                                    </div>
                                                    <div className="text-cyan-200 print:text-cyan-700">ลบ.ม./ปี</div>
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

                        {/* Right Column: Zone Details */}
                        <div className="space-y-4 print:contents">
                            {/* Zone Details */}
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
                                        const zonePipeStats = calculateZonePipeStats(actualPipes, zone.id.toString(), actualZones);
                                        return (
                                            <div
                                                key={zone.id}
                                                className="rounded-lg bg-gray-700 p-3 print:border print:bg-gray-50"
                                            >
                                                <div className="mb-2 flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <div
                                                            className="h-3 w-3 rounded-full"
                                                            style={{ backgroundColor: zone.color }}
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
                                                        {/* Zone Basic Info */}
                                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                                            <div className="text-center bg-gray-600 p-2 rounded print:bg-gray-100">
                                                                <div className="text-gray-400 print:text-gray-600">Area</div>
                                                                <div className="font-semibold text-blue-400 print:text-black">
                                                                    {summary.zoneAreaRai} ไร่
                                                                </div>
                                                                <div className="text-gray-400 text-xs print:text-gray-600">
                                                                    {summary.zoneArea} ตร.ม.
                                                                </div>
                                                            </div>
                                                            <div className="text-center bg-gray-600 p-2 rounded print:bg-gray-100">
                                                                <div className="text-gray-400 print:text-gray-600">Plants</div>
                                                                <div className="font-semibold text-green-400 print:text-black">
                                                                    {summary.totalPlantingPoints.toLocaleString()}
                                                                </div>
                                                                <div className="text-gray-400 text-xs print:text-gray-600">
                                                                    ต้น
                                                                </div>
                                                            </div>
                                                            <div className="text-center bg-gray-600 p-2 rounded print:bg-gray-100">
                                                                <div className="text-gray-400 print:text-gray-600">Crop</div>
                                                                <div className="font-semibold text-white print:text-black text-xs">
                                                                    {summary.cropName}
                                                                </div>
                                                                <div className="text-gray-400 text-xs print:text-gray-600">
                                                                    {summary.cropCategory}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Water Requirements Section - เปลี่ยนเป็นลิตรต่อครั้ง */}
                                                        <div className="bg-cyan-900/30 p-3 rounded-lg print:bg-cyan-50 print:border">
                                                            <h4 className="text-sm font-semibold text-cyan-300 mb-2 print:text-cyan-800">
                                                                💧 Water Requirements (ลิตรต่อครั้ง - from cropData)
                                                            </h4>
                                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                                <div>
                                                                    <div className="text-cyan-200 print:text-cyan-700 mb-1">
                                                                        Zone Area: {summary.zoneAreaRai} ไร่
                                                                    </div>
                                                                    <div className="text-cyan-200 print:text-cyan-700 mb-1">
                                                                        Plants: {summary.totalPlantingPoints.toLocaleString()} ต้น
                                                                    </div>
                                                                    <div className="text-cyan-200 print:text-cyan-700 mb-1">
                                                                        Rate: {summary.cropWaterPerPlantPerIrrigation.toFixed(1)} ลิตร/ต้น/ครั้ง
                                                                    </div>
                                                                    <div className="text-cyan-200 print:text-cyan-700">
                                                                        (จาก cropData: {summary.cropWaterPerPlant} ลิตร/ต้น/ครั้ง)
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-cyan-200 print:text-cyan-700 text-xs mb-1">
                                                                        Water Need per Irrigation:
                                                                    </div>
                                                                    <div className="font-bold text-cyan-100 print:text-cyan-800 text-lg">
                                                                        {summary.waterRequirementPerIrrigation.toLocaleString()}
                                                                    </div>
                                                                    <div className="text-cyan-200 print:text-cyan-700 text-xs">
                                                                        ลิตร/ครั้ง
                                                                    </div>
                                                                    <div className="text-cyan-200 print:text-cyan-700 text-xs mt-1">
                                                                        ({(summary.waterRequirementPerIrrigation / 1000).toFixed(1)} ลบ.ม./ครั้ง)
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="mt-2 text-xs text-cyan-200 print:text-cyan-700 bg-cyan-800/30 p-2 rounded print:bg-cyan-100">
                                                                <strong>การคำนวณ:</strong> {summary.totalPlantingPoints.toLocaleString()} ต้น × {summary.cropWaterPerPlantPerIrrigation.toFixed(1)} ลิตร/ต้น/ครั้ง = {summary.waterRequirementPerIrrigation.toLocaleString()} ลิตร/ครั้ง
                                                            </div>
                                                        </div>

                                                        {/* Irrigation System Section - เพิ่มข้อมูล pipe system */}
                                                        <div className="bg-blue-900/30 p-3 rounded-lg print:bg-blue-50 print:border">
                                                            <h4 className="text-sm font-semibold text-blue-300 mb-2 print:text-blue-800">
                                                                🔧 Irrigation System & Pipe Network
                                                            </h4>
                                                            
                                                            {/* Irrigation Type */}
                                                            <div className="mb-3">
                                                                <div className="text-blue-200 print:text-blue-700 mb-1 font-medium text-xs">
                                                                    Irrigation Type:
                                                                </div>
                                                                <div className="font-semibold text-blue-100 print:text-blue-900 text-sm">
                                                                    {irrigationType || 'ไม่ได้กำหนด'}
                                                                </div>
                                                            </div>

                                                            {/* Pipe System Details */}
                                                            <div className="space-y-3">
                                                                <div className="text-blue-200 print:text-blue-700 font-medium text-xs border-b border-blue-700 print:border-blue-300 pb-1">
                                                                    Pipe System Details in Zone:
                                                                </div>
                                                                
                                                                {/* Zone Pipe Summary Table - แสดงเฉพาะตารางเท่านั้น */}
                                                                <div className="bg-cyan-800/40 p-3 rounded print:bg-cyan-100 border border-cyan-600 print:border-cyan-300">
                                                                    <div className="text-center mb-3">
                                                                        <div className="text-cyan-200 print:text-cyan-800 font-bold text-sm">📊 Zone Pipe Summary</div>
                                                                    </div>
                                                                    
                                                                    {/* Summary table แสดงแต่ละประเภทท่อ */}
                                                                    <div className="mb-3">
                                                                        <div className="grid grid-cols-4 gap-1 text-xs mb-2">
                                                                            <div className="text-cyan-200 print:text-cyan-700 font-medium">ประเภทท่อ</div>
                                                                            <div className="text-cyan-200 print:text-cyan-700 font-medium text-center">จำนวน</div>
                                                                            <div className="text-cyan-200 print:text-cyan-700 font-medium text-center">ยาวสุด(ม.)</div>
                                                                            <div className="text-cyan-200 print:text-cyan-700 font-medium text-center">รวม(ม.)</div>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <div className="grid grid-cols-4 gap-1 text-xs bg-blue-700/20 p-1 rounded print:bg-blue-50">
                                                                                <div className="text-blue-200 print:text-blue-800">🔵 Main Pipes</div>
                                                                                <div className="text-blue-100 print:text-blue-900 text-center font-semibold">{zonePipeStats.main.count}</div>
                                                                                <div className="text-blue-100 print:text-blue-900 text-center font-semibold">{zonePipeStats.main.longestLength.toLocaleString()}</div>
                                                                                <div className="text-blue-100 print:text-blue-900 text-center font-semibold">{zonePipeStats.main.totalLength.toLocaleString()}</div>
                                                                            </div>
                                                                            <div className="grid grid-cols-4 gap-1 text-xs bg-green-700/20 p-1 rounded print:bg-green-50">
                                                                                <div className="text-green-200 print:text-green-800">🟢 Submain Pipes</div>
                                                                                <div className="text-green-100 print:text-green-900 text-center font-semibold">{zonePipeStats.submain.count}</div>
                                                                                <div className="text-green-100 print:text-green-900 text-center font-semibold">{zonePipeStats.submain.longestLength.toLocaleString()}</div>
                                                                                <div className="text-green-100 print:text-green-900 text-center font-semibold">{zonePipeStats.submain.totalLength.toLocaleString()}</div>
                                                                            </div>
                                                                            <div className="grid grid-cols-4 gap-1 text-xs bg-purple-700/20 p-1 rounded print:bg-purple-50">
                                                                                <div className="text-purple-200 print:text-purple-800">🟣 Lateral Pipes</div>
                                                                                <div className="text-purple-100 print:text-purple-900 text-center font-semibold">{zonePipeStats.lateral.count}</div>
                                                                                <div className="text-purple-100 print:text-purple-900 text-center font-semibold">{zonePipeStats.lateral.longestLength.toLocaleString()}</div>
                                                                                <div className="text-purple-100 print:text-purple-900 text-center font-semibold">{zonePipeStats.lateral.totalLength.toLocaleString()}</div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Overall totals */}
                                                                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-cyan-600 print:border-cyan-300 pt-2">
                                                                        <div className="text-center bg-cyan-700/30 p-2 rounded print:bg-cyan-50">
                                                                            <div className="text-cyan-200 print:text-cyan-700 text-xs mb-1">ความยาวท่อที่ยาวสุดรวม</div>
                                                                            <div className="font-bold text-cyan-100 print:text-cyan-900 text-sm">
                                                                                {zonePipeStats.totalLongestLength.toLocaleString()} ม.
                                                                            </div>
                                                                            <div className="text-cyan-300 print:text-cyan-600 text-xs mt-1">
                                                                                ({zonePipeStats.main.longestLength} + {zonePipeStats.submain.longestLength} + {zonePipeStats.lateral.longestLength})
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-center bg-cyan-700/30 p-2 rounded print:bg-cyan-50">
                                                                            <div className="text-cyan-200 print:text-cyan-700 text-xs mb-1">ความยาวท่อรวมทั้งหมด</div>
                                                                            <div className="font-bold text-cyan-100 print:text-cyan-900 text-sm">
                                                                                {zonePipeStats.totalLength.toLocaleString()} ม.
                                                                            </div>
                                                                            <div className="text-cyan-300 print:text-cyan-600 text-xs mt-1">
                                                                                ({zonePipeStats.main.totalLength} + {zonePipeStats.submain.totalLength} + {zonePipeStats.lateral.totalLength})
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="text-center mt-2 pt-2 border-t border-cyan-600 print:border-cyan-300">
                                                                        <div className="text-cyan-200 print:text-cyan-700 text-xs">
                                                                            Total Pipes in Zone: <span className="font-bold text-cyan-100 print:text-cyan-900">{zonePipeStats.total} ท่อ</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Hidden sections - เก็บโค้ดโครงสร้างไว้แต่ไม่แสดงผล */}
                                                        <div style={{ display: 'none' }}>
                                                            {/* Production & Income - ซ่อนการแสดงผล */}
                                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                                <div className="bg-yellow-900/30 p-2 rounded print:bg-yellow-50">
                                                                    <div className="text-yellow-300 print:text-yellow-800 mb-1">
                                                                        Expected Yield
                                                                    </div>
                                                                    <div className="font-semibold text-yellow-100 print:text-yellow-900">
                                                                        {summary.estimatedYield.toLocaleString()} กก.
                                                                    </div>
                                                                    <div className="text-yellow-300 text-xs print:text-yellow-700">
                                                                        @ {summary.cropYieldPerRai} กก./ไร่
                                                                    </div>
                                                                </div>
                                                                <div className="bg-green-900/30 p-2 rounded print:bg-green-50">
                                                                    <div className="text-green-300 print:text-green-800 mb-1">
                                                                        Expected Income
                                                                    </div>
                                                                    <div className="font-semibold text-green-100 print:text-green-900">
                                                                        ฿{summary.estimatedPrice.toLocaleString()}
                                                                    </div>
                                                                    <div className="text-green-300 text-xs print:text-green-700">
                                                                        @ {summary.cropPricePerKg} บาท/กก.
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Additional Info - ซ่อนการแสดงผล */}
                                                            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-600 print:border-gray-300">
                                                                <div>
                                                                    <div className="text-gray-400 print:text-gray-600">
                                                                        Plant Spacing
                                                                    </div>
                                                                    <div className="font-semibold text-blue-400 print:text-black">
                                                                        แถว: {(summary.rowSpacing * 100)} ซม.
                                                                    </div>
                                                                    <div className="font-semibold text-blue-400 print:text-black">
                                                                        ต้น: {(summary.plantSpacing * 100)} ซม.
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-gray-400 print:text-gray-600">
                                                                        Growth Info
                                                                    </div>
                                                                    <div className="font-semibold text-purple-400 print:text-black">
                                                                        {summary.growthPeriod} วัน
                                                                    </div>
                                                                    <div className="font-semibold text-purple-400 print:text-black">
                                                                        น้ำ: {summary.irrigationNeeds}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center text-gray-400 print:text-gray-600 py-4">
                                                        <div className="text-4xl mb-2">❓</div>
                                                        <div className="text-sm">No crop assigned to this zone</div>
                                                        <div className="text-xs">Cannot calculate water requirements</div>
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
            <Footer />
        </div>
    );
}
