// autoZoneUtilsExtensions.ts - ส่วนเพิ่มเติมสำหรับ autoZoneUtils.ts

import { Coordinate, PlantLocation, IrrigationZone } from './irrigationZoneUtils';
import { isPointInPolygon, findPlantsInPolygon, checkPolygonIntersection } from './autoZoneUtils';

// อัปเดตโซนเดี่ยวหลังจากการแก้ไข
export const updateEditedZone = (
    zones: IrrigationZone[],
    editedZone: IrrigationZone,
    allPlants: PlantLocation[]
): IrrigationZone[] => {
    // หาต้นไม้ที่อยู่ในโซนที่แก้ไขแล้ว
    const plantsInEditedZone = findPlantsInPolygon(allPlants, editedZone.coordinates);
    
    // อัปเดตข้อมูลโซนที่แก้ไข
    const updatedEditedZone: IrrigationZone = {
        ...editedZone,
        plants: plantsInEditedZone,
        totalWaterNeed: plantsInEditedZone.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0)
    };

    // อัปเดต zoneId ของต้นไม้ทั้งหมด
    const updatedPlants = allPlants.map(plant => {
        const newZoneId = plantsInEditedZone.find(p => p.id === plant.id) ? editedZone.id : plant.zoneId;
        return { ...plant, zoneId: newZoneId };
    });

    // อัปเดตโซนอื่นๆ เพื่อให้ข้อมูลต้นไม้ตรงกัน
    const updatedZones = zones.map(zone => {
        if (zone.id === editedZone.id) {
            return updatedEditedZone;
        } else {
            // อัปเดตโซนอื่นๆ โดยเอาเฉพาะต้นไม้ที่ยังอยู่ในโซนนั้นๆ
            const plantsInThisZone = updatedPlants.filter(plant => plant.zoneId === zone.id);
            return {
                ...zone,
                plants: plantsInThisZone,
                totalWaterNeed: plantsInThisZone.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0)
            };
        }
    });

    return updatedZones;
};

// อัปเดตโซนทั้งหมดหลังจากการแก้ไข (กรณีที่มีต้นไม้เปลี่ยนโซน)
export const recalculateAllZones = (
    zones: IrrigationZone[],
    allPlants: PlantLocation[]
): IrrigationZone[] => {

    
    const updatedZones = zones.map(zone => {
        // หาต้นไม้ที่อยู่ในโซนนี้
        const plantsInZone = findPlantsInPolygon(allPlants, zone.coordinates);
        
        // คำนวณความต้องการน้ำรวม
        const totalWaterNeed = plantsInZone.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0);
        
        console.log(`📊 Zone ${zone.name}: ${plantsInZone.length} plants, ${totalWaterNeed.toFixed(2)} L/min water need`);
        
        return {
            ...zone,
            plants: plantsInZone,
            totalWaterNeed: totalWaterNeed
        };
    });

    console.log(`✅ Recalculated ${updatedZones.length} zones`);
    return updatedZones;
};

// ตรวจสอบความถูกต้องของโซนหลังการแก้ไข
export const validateEditedZone = (
    editedZone: IrrigationZone,
    allZones: IrrigationZone[],
    mainArea: Coordinate[]
): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
} => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ตรวจสอบว่าโซนอยู่ในพื้นที่หลักหรือไม่
    if (!isPolygonWithinMainArea(editedZone.coordinates, mainArea)) {
        errors.push(`โซน ${editedZone.name} มีส่วนที่อยู่นอกพื้นที่หลัก`);
    }

    // ตรวจสอบการทับซ้อนกับโซนอื่นๆ
    const otherZones = allZones.filter(zone => zone.id !== editedZone.id);
    for (const otherZone of otherZones) {
        if (checkPolygonIntersection(editedZone.coordinates, otherZone.coordinates)) {
            warnings.push(`โซน ${editedZone.name} ทับซ้อนกับโซน ${otherZone.name}`);
        }
    }

    // ตรวจสอบจำนวนต้นไม้
    if (editedZone.plants.length === 0) {
        warnings.push(`โซน ${editedZone.name} ไม่มีต้นไม้`);
    }

    // ตรวจสอบรูปทรงโซน
    if (editedZone.coordinates.length < 3) {
        errors.push(`โซน ${editedZone.name} ต้องมีจุดอย่างน้อย 3 จุด`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

// Helper function สำหรับตรวจสอบว่าพอลิกอนอยู่ในพื้นที่หลักหรือไม่
const isPolygonWithinMainArea = (polygon: Coordinate[], mainArea: Coordinate[]): boolean => {
    return polygon.every(point => isPointInPolygon(point, mainArea));
};

// สร้างสถิติการแก้ไขโซน
export const generateZoneEditStats = (
    originalZones: IrrigationZone[],
    editedZones: IrrigationZone[]
): {
    totalZones: number;
    modifiedZones: number;
    totalPlants: number;
    totalWaterNeed: number;
    balanceImprovement: number;
} => {
    const modifiedZones = editedZones.filter((editedZone, index) => {
        const originalZone = originalZones[index];
        return originalZone && (
            JSON.stringify(editedZone.coordinates) !== JSON.stringify(originalZone.coordinates) ||
            editedZone.plants.length !== originalZone.plants.length
        );
    }).length;

    const totalPlants = editedZones.reduce((sum, zone) => sum + zone.plants.length, 0);
    const totalWaterNeed = editedZones.reduce((sum, zone) => sum + zone.totalWaterNeed, 0);
    
    // คำนวณการปรับปรุงของการกระจายน้ำ
    const originalWaterNeeds = originalZones.map(z => z.totalWaterNeed);
    const editedWaterNeeds = editedZones.map(z => z.totalWaterNeed);
    
    const originalVariance = calculateWaterNeedVariance(originalWaterNeeds);
    const editedVariance = calculateWaterNeedVariance(editedWaterNeeds);
    
    const balanceImprovement = originalVariance > 0 ? 
        ((originalVariance - editedVariance) / originalVariance) * 100 : 0;

    return {
        totalZones: editedZones.length,
        modifiedZones,
        totalPlants,
        totalWaterNeed,
        balanceImprovement
    };
};

// คำนวณความแปรปรวนของความต้องการน้ำ
const calculateWaterNeedVariance = (waterNeeds: number[]): number => {
    if (waterNeeds.length === 0) return 0;
    
    const mean = waterNeeds.reduce((sum, need) => sum + need, 0) / waterNeeds.length;
    const variance = waterNeeds.reduce((sum, need) => sum + Math.pow(need - mean, 2), 0) / waterNeeds.length;
    
    return variance;
};
