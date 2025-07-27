// @/pages/utils/fieldCropData.ts

import * as turf from '@turf/turf';
import { getCropByValue, type Crop } from '@/pages/utils/cropData'; // FIXED: Use relative path

// --- Interfaces and Type Definitions ---

/**
 * พิกัดทางภูมิศาสตร์ (Latitude, Longitude)
 */
export interface Coordinate {
    lat: number;
    lng: number;
}

/**
 * ข้อมูลพื้นที่หลัก
 */
export interface FieldArea {
    size: number; // in square meters
    coordinates: Coordinate[];
}

/**
 * ข้อมูลโซน
 */
export interface ZoneInfo {
    id: string;
    name: string;
    coordinates: Coordinate[];
    color: string;
    area: number; // in square meters
}

/**
 * สถิติของท่อแต่ละประเภท
 */
export interface PipeStats {
    count: number;
    totalLength: number; // meters
    longest: number; // meters
}

/**
 * ข้อมูลการเชื่อมต่อท่อ
 */
export interface PipeConnection {
    id: string;
    type: 'main' | 'submain' | 'lateral';
    coordinates: Coordinate[];
    length: number; // meters
    zoneId?: string; // ระบุว่าท่อนี้อยู่ในโซนไหน (สำหรับ lateral/submain)
}

/**
 * ข้อมูลอุปกรณ์
 */
export interface EquipmentPosition {
    id: string;
    type: 'pump' | 'ballvalve' | 'solenoid';
    lat: number;
    lng: number;
}

/**
 * โครงสร้างข้อมูลหลักสำหรับโปรเจกต์พืชไร่ (Field Crop)
 */
export interface FieldCropData {
    area: FieldArea;
    zones: {
        info: ZoneInfo[];
        totalCount: number;
        totalArea: number; // square meters
    };
    crops: {
        selectedCrops: string[];
        zoneAssignments: Record<string, string>; // zoneId -> cropValue
        spacing: {
            rowSpacing: Record<string, number>; // cropValue -> spacing in meters
            plantSpacing: Record<string, number>; // cropValue -> spacing in meters
        };
    };
    pipes: {
        connections: PipeConnection[];
        stats: {
            main: PipeStats;
            submain: PipeStats;
            lateral: PipeStats;
            totalLength: number;
        };
    };
    equipment: {
        positions: EquipmentPosition[];
        totalCount: number;
        types: {
            pumps: number;
            valves: number;
            solenoids: number;
        };
    };
    summary: {
        totalPlantingPoints: number;
        totalWaterRequirementPerIrrigation: number; // Liters per irrigation cycle
        estimatedYield: number; // kg
        estimatedIncome: number; // baht
    };
}

// --- Calculation Helpers ---

/**
 * คำนวณพื้นที่จากพิกัด (ตร.ม.)
 */
const calculateArea = (coordinates: Coordinate[]): number => {
    if (!coordinates || coordinates.length < 3) return 0;
    try {
        const turfCoords = coordinates.map(c => [c.lng, c.lat]);
        turfCoords.push(turfCoords[0]); // Close the polygon
        const polygon = turf.polygon([turfCoords]);
        return turf.area(polygon);
    } catch (e) {
        console.error("Area calculation error:", e);
        return 0;
    }
};

/**
 * คำนวณความยาวท่อ (เมตร)
 */
const calculatePipeLength = (coordinates: Coordinate[]): number => {
    if (!coordinates || coordinates.length < 2) return 0;
    try {
        let totalLength = 0;
        for (let i = 1; i < coordinates.length; i++) {
            const from = turf.point([coordinates[i - 1].lng, coordinates[i - 1].lat]);
            const to = turf.point([coordinates[i].lng, coordinates[i].lat]);
            const distance = turf.distance(from, to, 'meters');
            totalLength += distance;
        }
        return totalLength;
    } catch (e) {
        console.error("Pipe length calculation error:", e);
        return 0;
    }
};

/**
 * ฟังก์ชันหลักในการคำนวณสถิติทั้งหมดสำหรับโปรเจกต์พืชไร่
 * @param rawData ข้อมูลดิบจาก State ของหน้า field-map
 * @returns ออบเจกต์ FieldCropData ที่คำนวณค่าสถิติต่างๆ ครบถ้วนแล้ว
 */
export const calculateAllFieldStats = (rawData: any): FieldCropData => {
    // Zones
    const zonesInfo = (rawData.zones || []).map((zone: any) => ({
        ...zone,
        area: calculateArea(zone.coordinates),
    }));
    const totalZoneArea = zonesInfo.reduce((sum: number, z: ZoneInfo) => sum + z.area, 0);

    // Pipes
    const pipeConnections = (rawData.pipes || []).map((pipe: any) => ({
        ...pipe,
        length: calculatePipeLength(pipe.coordinates),
    }));
    
    const pipeStatsCalc = (type: 'main' | 'submain' | 'lateral'): PipeStats => {
        const typePipes = pipeConnections.filter((p: PipeConnection) => p.type === type);
        const lengths = typePipes.map((p: PipeConnection) => p.length);
        return {
            count: typePipes.length,
            totalLength: lengths.reduce((sum: number, len: number) => sum + len, 0),
            longest: lengths.length > 0 ? Math.max(...lengths) : 0,
        };
    };
    const mainPipeStats = pipeStatsCalc('main');
    const submainPipeStats = pipeStatsCalc('submain');
    const lateralPipeStats = pipeStatsCalc('lateral');
    
    // Summary Calculations
    let totalPlantingPoints = 0;
    let totalWaterRequirement = 0;
    let totalYield = 0;
    let totalIncome = 0;

    zonesInfo.forEach((zone: ZoneInfo) => {
        const cropValue = rawData.zoneAssignments?.[zone.id];
        if (cropValue) {
            const crop = getCropByValue(cropValue);
            if (crop) {
                const rowSpacing = rawData.rowSpacing?.[cropValue] || (crop.rowSpacing / 100);
                const plantSpacing = rawData.plantSpacing?.[cropValue] || (crop.plantSpacing / 100);

                if (rowSpacing > 0 && plantSpacing > 0) {
                    const plantsPerSqm = (1 / rowSpacing) * (1 / plantSpacing);
                    const zonePlants = Math.floor(zone.area * plantsPerSqm);
                    totalPlantingPoints += zonePlants;

                    if (crop.waterRequirement) {
                        totalWaterRequirement += zonePlants * crop.waterRequirement;
                    }
                    
                    const areaInRai = zone.area / 1600;
                    if (crop.yield) {
                        const zoneYield = areaInRai * crop.yield;
                        totalYield += zoneYield;
                        if (crop.price) {
                            totalIncome += zoneYield * crop.price;
                        }
                    }
                }
            }
        }
    });

    return {
        area: {
            size: rawData.fieldAreaSize || 0,
            coordinates: rawData.mainField?.coordinates || [],
        },
        zones: {
            info: zonesInfo,
            totalCount: zonesInfo.length,
            totalArea: totalZoneArea,
        },
        crops: {
            selectedCrops: rawData.selectedCrops || [],
            zoneAssignments: rawData.zoneAssignments || {},
            spacing: {
                rowSpacing: rawData.rowSpacing || {},
                plantSpacing: rawData.plantSpacing || {},
            },
        },
        pipes: {
            connections: pipeConnections,
            stats: {
                main: mainPipeStats,
                submain: submainPipeStats,
                lateral: lateralPipeStats,
                totalLength: mainPipeStats.totalLength + submainPipeStats.totalLength + lateralPipeStats.totalLength,
            },
        },
        equipment: {
            positions: rawData.equipmentIcons || [],
            totalCount: (rawData.equipmentIcons || []).length,
            types: {
                pumps: (rawData.equipmentIcons || []).filter((e: EquipmentPosition) => e.type === 'pump').length,
                valves: (rawData.equipmentIcons || []).filter((e: EquipmentPosition) => e.type === 'ballvalve').length,
                solenoids: (rawData.equipmentIcons || []).filter((e: EquipmentPosition) => e.type === 'solenoid').length,
            },
        },
        summary: {
            totalPlantingPoints: Math.round(totalPlantingPoints),
            totalWaterRequirementPerIrrigation: Math.round(totalWaterRequirement),
            estimatedYield: Math.round(totalYield),
            estimatedIncome: Math.round(totalIncome),
        },
    };
};

// --- Local Storage Handlers ---

const STORAGE_KEY = 'fieldCropData_v2'; // ใช้ key ใหม่เพื่อป้องกันการชนกับข้อมูลเก่า

/**
 * บันทึกข้อมูล FieldCropData ลงใน localStorage
 */
export const saveFieldCropData = (data: FieldCropData): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('✅ Field crop data (v2) saved successfully');
    } catch (e) {
        console.error('Error saving field crop data:', e);
    }
};

/**
 * โหลดข้อมูล FieldCropData จาก localStorage
 */
export const getFieldCropData = (): FieldCropData | null => {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        try {
            return JSON.parse(storedData);
        } catch (e) {
            console.error('Error parsing field crop data:', e);
            return null;
        }
    }
    return null;
};

/**
 * แปลงข้อมูลจากโครงสร้างเก่า (fieldMapData) มาเป็น FieldCropData
 * @returns FieldCropData ที่สมบูรณ์ หรือ null หากไม่มีข้อมูลเก่า
 */
export const migrateFromFieldMapData = (): FieldCropData | null => {
    const oldData = localStorage.getItem('fieldMapData');
    if (!oldData) return null;

    try {
        console.log("🔄 Migrating old fieldMapData...");
        const parsedOldData = JSON.parse(oldData);
        // ใช้ฟังก์ชันคำนวณหลักเพื่อแปลงข้อมูลเก่าให้เป็นโครงสร้างใหม่ที่สมบูรณ์
        const migratedData = calculateAllFieldStats(parsedOldData);
        saveFieldCropData(migratedData); // บันทึกข้อมูลใหม่
        // localStorage.removeItem('fieldMapData'); // (Optional) ลบข้อมูลเก่าทิ้ง
        console.log("✅ Migration successful!");
        return migratedData;
    } catch (e) {
        console.error('Error migrating field map data:', e);
        return null;
    }
};