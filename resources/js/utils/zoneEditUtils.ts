// zoneEditUtils.ts - Zone Editing Utilities for Automatic Zones

import { Coordinate, PlantLocation, IrrigationZone } from './irrigationZoneUtils';
import { isPointInPolygon } from './horticultureUtils';

export interface ZoneEditState {
    isEditing: boolean;
    selectedZoneId: string | null;
    editingZone: IrrigationZone | null;
    controlPoints: ZoneControlPoint[];
    isDragging: boolean;
    draggedPointIndex: number | null;
}

export interface ZoneControlPoint {
    id: string;
    position: Coordinate;
    index: number;
    isDraggable: true;
}

export interface ZoneEditResult {
    updatedZone: IrrigationZone;
    affectedPlants: PlantLocation[];
    wasModified: boolean;
}

// Helper function สำหรับ deep copy IrrigationZone
export const deepCopyZone = (zone: IrrigationZone): IrrigationZone => {
    return {
        id: zone.id,
        name: zone.name,
        coordinates: zone.coordinates.map(coord => ({ lat: coord.lat, lng: coord.lng })),
        plants: zone.plants.map(plant => ({ ...plant })),
        totalWaterNeed: zone.totalWaterNeed,
        color: zone.color,
        layoutIndex: zone.layoutIndex
    };
};

// สร้างจุดควบคุมรอบโซนที่เลือก (แสดงเฉพาะจุดยอด)
export const createZoneControlPoints = (zone: IrrigationZone): ZoneControlPoint[] => {
    const controlPoints: ZoneControlPoint[] = [];
    
    // สร้างจุดควบคุมที่จุดยอดของ polygon เท่านั้น - ใช้ deep copy เพื่อหลีกเลี่ยง reference sharing
    zone.coordinates.forEach((coord, index) => {
        controlPoints.push({
            id: `control-${zone.id}-${index}`,
            position: { lat: coord.lat, lng: coord.lng }, // deep copy แทน spread operator
            index: index,
            isDraggable: true
        });
    });

    return controlPoints;
};

// ตรวจสอบว่าจุดอยู่ในพื้นที่หลักหรือไม่
export const isPointWithinMainArea = (
    point: Coordinate, 
    mainArea: Coordinate[]
): boolean => {
    return isPointInPolygon(point, mainArea);
};

// ตรวจสอบว่าพอลิกอนทั้งหมดอยู่ในพื้นที่หลักหรือไม่
export const isPolygonWithinMainArea = (
    polygon: Coordinate[], 
    mainArea: Coordinate[]
): boolean => {
    // ตรวจสอบทุกจุดในพอลิกอน
    return polygon.every(point => isPointWithinMainArea(point, mainArea));
};

// อัปเดตพิกัดโซนเมื่อลากจุดควบคุม (เฉพาะจุดยอดเท่านั้น)
export const updateZoneCoordinatesOnDrag = (
    zone: IrrigationZone,
    controlPointIndex: number,
    newPosition: Coordinate,
    mainArea: Coordinate[]
): { 
    updatedCoordinates: Coordinate[]; 
    isValid: boolean; 
    errorMessage?: string; 
} => {
    // สร้าง deep copy ของ coordinates เพื่อหลีกเลี่ยง reference sharing
    const newCoordinates = zone.coordinates.map((coord, index) => {
        if (index === controlPointIndex) {
            return { lat: newPosition.lat, lng: newPosition.lng };
        }
        return { lat: coord.lat, lng: coord.lng };
    });

    // ตรวจสอบว่าจุดใหม่อยู่ในพื้นที่หลักหรือไม่
    if (!isPointWithinMainArea(newPosition, mainArea)) {
        return {
            updatedCoordinates: zone.coordinates,
            isValid: false,
            errorMessage: "ไม่สามารถขยายโซนออกนอกพื้นที่หลักได้"
        };
    }

    // ตรวจสอบว่าพอลิกอนใหม่ยังคงเป็นรูปที่ถูกต้อง
    if (newCoordinates.length < 3) {
        return {
            updatedCoordinates: zone.coordinates,
            isValid: false,
            errorMessage: "โซนต้องมีจุดอย่างน้อย 3 จุด"
        };
    }

    // ตรวจสอบการตัดกันเองของพอลิกอน (self-intersection)
    if (hasPolygonSelfIntersection(newCoordinates)) {
        return {
            updatedCoordinates: zone.coordinates,
            isValid: false,
            errorMessage: "โซนไม่สามารถมีเส้นขอบที่ตัดกันเองได้"
        };
    }

    return {
        updatedCoordinates: newCoordinates,
        isValid: true
    };
};

// ตรวจสอบการตัดกันเองของพอลิกอน
const hasPolygonSelfIntersection = (coordinates: Coordinate[]): boolean => {
    const n = coordinates.length;
    if (n < 4) return false;

    for (let i = 0; i < n; i++) {
        const line1Start = coordinates[i];
        const line1End = coordinates[(i + 1) % n];
        
        for (let j = i + 2; j < n; j++) {
            // ข้ามเส้นที่ติดกัน
            if (j === (i - 1 + n) % n || j === (i + 1) % n) continue;
            
            const line2Start = coordinates[j];
            const line2End = coordinates[(j + 1) % n];
            
            if (doLineSegmentsIntersect(line1Start, line1End, line2Start, line2End)) {
                return true;
            }
        }
    }
    
    return false;
};

// ตรวจสอบการตัดกันของเส้นสองเส้น
const doLineSegmentsIntersect = (
    p1: Coordinate, q1: Coordinate, 
    p2: Coordinate, q2: Coordinate
): boolean => {
    const orientation = (p: Coordinate, q: Coordinate, r: Coordinate): number => {
        const val = (q.lng - p.lng) * (r.lat - q.lat) - (q.lat - p.lat) * (r.lng - q.lng);
        if (Math.abs(val) < 1e-10) return 0; // Collinear
        return val > 0 ? 1 : 2; // Clockwise or Counterclockwise
    };

    const onSegment = (p: Coordinate, q: Coordinate, r: Coordinate): boolean => {
        return q.lng <= Math.max(p.lng, r.lng) && q.lng >= Math.min(p.lng, r.lng) &&
               q.lat <= Math.max(p.lat, r.lat) && q.lat >= Math.min(p.lat, r.lat);
    };

    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    // กรณีทั่วไป
    if (o1 !== o2 && o3 !== o4) return true;

    // กรณีพิเศษ
    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;

    return false;
};

// หาต้นไม้ที่อยู่ในโซนที่แก้ไขแล้ว
export const findPlantsInEditedZone = (
    updatedCoordinates: Coordinate[],
    allPlants: PlantLocation[]
): PlantLocation[] => {
    return allPlants.filter(plant => 
        isPointInPolygon(plant.position, updatedCoordinates)
    );
};

// คำนวณความต้องการน้ำรวมของต้นไม้ในโซน
export const calculateZoneWaterNeed = (plants: PlantLocation[]): number => {
    return plants.reduce((total, plant) => total + plant.plantData.waterNeed, 0);
};

// สร้างโซนใหม่หลังจากการแก้ไข
export const createUpdatedZone = (
    originalZone: IrrigationZone,
    newCoordinates: Coordinate[],
    newPlants: PlantLocation[]
): IrrigationZone => {
    const totalWaterNeed = calculateZoneWaterNeed(newPlants);
    
    return {
        ...originalZone,
        coordinates: newCoordinates,
        plants: newPlants,
        totalWaterNeed: totalWaterNeed
    };
};

// ตรวจสอบว่าจุดคลิกอยู่ในโซนไหน
export const findZoneByPoint = (
    point: Coordinate, 
    zones: IrrigationZone[]
): IrrigationZone | null => {
    for (const zone of zones) {
        if (isPointInPolygon(point, zone.coordinates)) {
            return zone;
        }
    }
    return null;
};

// คำนวณระยะห่างระหว่างจุดกับจุดควบคุม
export const calculateDistanceToControlPoint = (
    point: Coordinate,
    controlPoint: ZoneControlPoint
): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (controlPoint.position.lat - point.lat) * Math.PI / 180;
    const dLng = (controlPoint.position.lng - point.lng) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(point.lat * Math.PI / 180) * Math.cos(controlPoint.position.lat * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

// หาจุดควบคุมที่ใกล้ที่สุดกับตำแหน่งคลิก
export const findNearestControlPoint = (
    clickPoint: Coordinate,
    controlPoints: ZoneControlPoint[],
    threshold: number = 20 // เมตร
): ZoneControlPoint | null => {
    let nearestPoint: ZoneControlPoint | null = null;
    let minDistance = threshold;

    for (const controlPoint of controlPoints) {
        const distance = calculateDistanceToControlPoint(clickPoint, controlPoint);
        if (distance < minDistance) {
            minDistance = distance;
            nearestPoint = controlPoint;
        }
    }

    return nearestPoint;
};

// สร้าง initial state สำหรับการแก้ไขโซน
export const createInitialZoneEditState = (): ZoneEditState => {
    return {
        isEditing: false,
        selectedZoneId: null,
        editingZone: null,
        controlPoints: [],
        isDragging: false,
        draggedPointIndex: null
    };
};

// เริ่มต้นการแก้ไขโซน
export const startZoneEditing = (
    zone: IrrigationZone,
    currentState: ZoneEditState
): ZoneEditState => {
    // สร้าง deep copy ของ zone เพื่อหลีกเลี่ยง reference sharing
    const editingZone = deepCopyZone(zone);
    const controlPoints = createZoneControlPoints(editingZone);
    
    return {
        ...currentState,
        isEditing: true,
        selectedZoneId: zone.id,
        editingZone: editingZone,
        controlPoints: controlPoints,
        isDragging: false,
        draggedPointIndex: null
    };
};

// หยุดการแก้ไขโซน
export const stopZoneEditing = (): ZoneEditState => {
    return createInitialZoneEditState();
};

// เริ่มการลากจุดควบคุม
export const startDragging = (
    controlPoint: ZoneControlPoint,
    currentState: ZoneEditState
): ZoneEditState => {
    return {
        ...currentState,
        isDragging: true,
        draggedPointIndex: controlPoint.index
    };
};

// หยุดการลากจุดควบคุม
export const stopDragging = (currentState: ZoneEditState): ZoneEditState => {
    return {
        ...currentState,
        isDragging: false,
        draggedPointIndex: null
    };
};

// อัปเดตตำแหน่ง control points โดยไม่สร้างใหม่ทั้งหมด (เฉพาะจุดยอดเท่านั้น)
export const updateZoneControlPoints = (
    controlPoints: ZoneControlPoint[],
    updatedCoordinates: Coordinate[],
    draggedPointIndex: number,
    zone?: IrrigationZone
): ZoneControlPoint[] => {
    // สร้าง deep copy ของทุก control point
    return controlPoints.map(controlPoint => {
        // อัปเดตเฉพาะจุดที่ถูกลาก
        if (controlPoint.index === draggedPointIndex) {
            const newPosition = updatedCoordinates[draggedPointIndex];
            return {
                id: controlPoint.id,
                position: { lat: newPosition.lat, lng: newPosition.lng }, // deep copy
                index: controlPoint.index,
                isDraggable: controlPoint.isDraggable
            };
        }
        // คืนค่าจุดอื่น ๆ โดยไม่เปลี่ยนแปลง - แต่เป็น deep copy
        return {
            id: controlPoint.id,
            position: { lat: controlPoint.position.lat, lng: controlPoint.position.lng }, // deep copy
            index: controlPoint.index,
            isDraggable: controlPoint.isDraggable
        };
    });
};

// ส่งออกฟังก์ชันที่จำเป็น
export {
    isPointInPolygon
} from './horticultureUtils';
