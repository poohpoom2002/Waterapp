/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

export interface Coordinate {
    lat: number;
    lng: number;
}

// 🚀 Caching mechanism for plant grouping
interface PlantGroupCache {
    plantsHash: string;
    rowGroups: PlantLocation[][];
    columnGroups: PlantLocation[][];
}

let plantGroupCache: PlantGroupCache | null = null;

// 🚀 Helper function to create hash from plants array for caching
const createPlantsHash = (plants: PlantLocation[]): string => {
    return plants
        .map(plant => `${plant.id}:${plant.position.lat.toFixed(8)}:${plant.position.lng.toFixed(8)}:${plant.rotationAngle || 0}`)
        .join('|');
};

// 🚀 Clear plant grouping cache - useful when plants array structure changes significantly
export const clearPlantGroupingCache = (): void => {
    plantGroupCache = null;
};

export interface PlantLocation {
    id: string;
    position: Coordinate;
    plantData: {
        id: number;
        name: string;
        plantSpacing: number;
        rowSpacing: number;
        waterNeed: number;
    };
    rotationAngle?: number;
}

export interface SubMainPipe {
    id: string;
    coordinates: Coordinate[];
}

// ฟังก์ชันคำนวณระยะห่างระหว่างจุด
export const calculateDistanceBetweenPoints = (point1: Coordinate, point2: Coordinate): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

// ฟังก์ชันหาจุดที่ใกล้ที่สุดบนเส้นตรง
export const findClosestPointOnLineSegment = (
    point: Coordinate,
    lineStart: Coordinate,
    lineEnd: Coordinate
): Coordinate => {
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
        return lineStart;
    }

    const param = dot / lenSq;

    if (param < 0) {
        return lineStart;
    } else if (param > 1) {
        return lineEnd;
    }

    return {
        lat: lineStart.lat + param * C,
        lng: lineStart.lng + param * D
    };
};

// ฟังก์ชันตรวจสอบว่าจุดอยู่บนท่อเมนรองหรือไม่
export const isPointOnSubMainPipe = (
    point: Coordinate,
    subMainPipe: SubMainPipe,
    threshold: number = 5
): boolean => {
    // Debug logs removed
    
    if (!subMainPipe.coordinates || subMainPipe.coordinates.length < 2) {
        // Debug logs removed
        return false;
    }

    // Debug logs removed

    for (let i = 0; i < subMainPipe.coordinates.length - 1; i++) {
        const start = subMainPipe.coordinates[i];
        const end = subMainPipe.coordinates[i + 1];
        
        const closestPoint = findClosestPointOnLineSegment(point, start, end);
        const distance = calculateDistanceBetweenPoints(point, closestPoint);
        
        // Debug logs removed
        
        if (distance <= threshold) {
            // Debug logs removed
            return true;
        }
    }
    
    // Debug logs removed
    return false;
};

// ฟังก์ชันหาจุดเชื่อมต่อที่ใกล้ที่สุดบนท่อเมนรอง
export const findClosestConnectionPoint = (
    point: Coordinate,
    subMainPipe: SubMainPipe
): Coordinate | null => {
    if (!subMainPipe.coordinates || subMainPipe.coordinates.length < 2) {
        return null;
    }

    let closestPoint: Coordinate | null = null;
    let minDistance = Infinity;

    for (let i = 0; i < subMainPipe.coordinates.length - 1; i++) {
        const start = subMainPipe.coordinates[i];
        const end = subMainPipe.coordinates[i + 1];
        
        const pointOnSegment = findClosestPointOnLineSegment(point, start, end);
        const distance = calculateDistanceBetweenPoints(point, pointOnSegment);
        
        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = pointOnSegment;
        }
    }
    
    return closestPoint;
};

// ฟังก์ชันจัดกลุ่มต้นไม้ตามแถว (ปรับปรุงใหม่ - รองรับการหมุน + caching)
export const groupPlantsByRows = (plants: PlantLocation[]): PlantLocation[][] => {
    if (plants.length === 0) return [];

    // 🚀 Check cache first
    const currentHash = createPlantsHash(plants);
    if (plantGroupCache && plantGroupCache.plantsHash === currentHash) {
        return plantGroupCache.rowGroups;
    }

    const groups: PlantLocation[][] = [];
    const tolerance = 0.000005; // ~0.5 เมตร tolerance - ปรับให้แม่นยำขึ้น
    
    // ตรวจสอบการหมุนของต้นไม้
    const rotationInfo = hasRotation(plants);
    
    let plantsToGroup: { plant: PlantLocation, transformedPosition: Coordinate }[] = [];
    
    if (rotationInfo.hasRotation) {
        // แปลงพิกัดต้นไม้ทั้งหมดเป็นระบบพิกัดที่หมุนแล้ว
        plantsToGroup = plants.map(plant => ({
            plant,
            transformedPosition: transformToRotatedCoordinate(plant.position, rotationInfo.center, rotationInfo.rotationAngle)
        }));
    } else {
        // ใช้พิกัดเดิมหากไม่มีการหมุน
        plantsToGroup = plants.map(plant => ({
            plant,
            transformedPosition: plant.position
        }));
    }
    
    // สร้าง clusters โดยใช้ lat coordinate ที่แปลงแล้ว
    const plantsByLat = [...plantsToGroup].sort((a, b) => a.transformedPosition.lat - b.transformedPosition.lat);
    
    for (const plantData of plantsByLat) {
        let addedToGroup = false;
        
        // หากลุ่มที่มี lat ใกล้เคียงกัน
        for (const group of groups) {
            // คำนวณ lat เฉลี่ยจากพิกัดที่แปลงแล้ว
            const avgLat = group.reduce((sum, p) => {
                const transformedPos = rotationInfo.hasRotation 
                    ? transformToRotatedCoordinate(p.position, rotationInfo.center, rotationInfo.rotationAngle)
                    : p.position;
                return sum + transformedPos.lat;
            }, 0) / group.length;
            
            if (Math.abs(plantData.transformedPosition.lat - avgLat) <= tolerance) {
                group.push(plantData.plant);
                addedToGroup = true;
                break;
            }
        }
        
        // สร้างกลุ่มใหม่หากไม่พบกลุ่มที่เข้ากันได้
        if (!addedToGroup) {
            groups.push([plantData.plant]);
        }
    }
    
    // กรองเฉพาะกลุ่มที่มีต้นไม้ 2 ต้นขึ้นไป และเรียงต้นไม้ในแต่ละกลุ่มตาม lng ที่แปลงแล้ว
    const filteredGroups = groups
        .filter(group => group.length >= 2)
        .map(group => group.sort((a, b) => {
            const aTransformed = rotationInfo.hasRotation 
                ? transformToRotatedCoordinate(a.position, rotationInfo.center, rotationInfo.rotationAngle)
                : a.position;
            const bTransformed = rotationInfo.hasRotation 
                ? transformToRotatedCoordinate(b.position, rotationInfo.center, rotationInfo.rotationAngle)
                : b.position;
            return aTransformed.lng - bTransformed.lng;
        }));
    
    // 🚀 Update cache with row groups (will be completed when both functions are computed)
    if (!plantGroupCache || plantGroupCache.plantsHash !== currentHash) {
        plantGroupCache = {
            plantsHash: currentHash,
            rowGroups: filteredGroups,
            columnGroups: plantGroupCache?.plantsHash === currentHash ? plantGroupCache.columnGroups : []
        };
    } else {
        plantGroupCache.rowGroups = filteredGroups;
    }
    
    return filteredGroups;
};

// ฟังก์ชันจัดกลุ่มต้นไม้ตามคอลัมน์ (ปรับปรุงใหม่ - รองรับการหมุน + caching)
export const groupPlantsByColumns = (plants: PlantLocation[]): PlantLocation[][] => {
    if (plants.length === 0) return [];

    // 🚀 Check cache first
    const currentHash = createPlantsHash(plants);
    if (plantGroupCache && plantGroupCache.plantsHash === currentHash && plantGroupCache.columnGroups.length > 0) {
        return plantGroupCache.columnGroups;
    }

    const groups: PlantLocation[][] = [];
    const tolerance = 0.000005; // ~0.5 เมตร tolerance - ปรับให้แม่นยำขึ้น
    
    // ตรวจสอบการหมุนของต้นไม้
    const rotationInfo = hasRotation(plants);
    
    let plantsToGroup: { plant: PlantLocation, transformedPosition: Coordinate }[] = [];
    
    if (rotationInfo.hasRotation) {
        // แปลงพิกัดต้นไม้ทั้งหมดเป็นระบบพิกัดที่หมุนแล้ว
        plantsToGroup = plants.map(plant => ({
            plant,
            transformedPosition: transformToRotatedCoordinate(plant.position, rotationInfo.center, rotationInfo.rotationAngle)
        }));
    } else {
        // ใช้พิกัดเดิมหากไม่มีการหมุน
        plantsToGroup = plants.map(plant => ({
            plant,
            transformedPosition: plant.position
        }));
    }
    
    // สร้าง clusters โดยใช้ lng coordinate ที่แปลงแล้ว
    const plantsByLng = [...plantsToGroup].sort((a, b) => a.transformedPosition.lng - b.transformedPosition.lng);
    
    for (const plantData of plantsByLng) {
        let addedToGroup = false;
        
        // หากลุ่มที่มี lng ใกล้เคียงกัน
        for (const group of groups) {
            // คำนวณ lng เฉลี่ยจากพิกัดที่แปลงแล้ว
            const avgLng = group.reduce((sum, p) => {
                const transformedPos = rotationInfo.hasRotation 
                    ? transformToRotatedCoordinate(p.position, rotationInfo.center, rotationInfo.rotationAngle)
                    : p.position;
                return sum + transformedPos.lng;
            }, 0) / group.length;
            
            if (Math.abs(plantData.transformedPosition.lng - avgLng) <= tolerance) {
                group.push(plantData.plant);
                addedToGroup = true;
                break;
            }
        }
        
        // สร้างกลุ่มใหม่หากไม่พบกลุ่มที่เข้ากันได้
        if (!addedToGroup) {
            groups.push([plantData.plant]);
        }
    }
    
    // กรองเฉพาะกลุ่มที่มีต้นไม้ 2 ต้นขึ้น และเรียงต้นไม้ในแต่ละกลุ่มตาม lat ที่แปลงแล้ว
    const filteredGroups = groups
        .filter(group => group.length >= 2)
        .map(group => group.sort((a, b) => {
            const aTransformed = rotationInfo.hasRotation 
                ? transformToRotatedCoordinate(a.position, rotationInfo.center, rotationInfo.rotationAngle)
                : a.position;
            const bTransformed = rotationInfo.hasRotation 
                ? transformToRotatedCoordinate(b.position, rotationInfo.center, rotationInfo.rotationAngle)
                : b.position;
            return aTransformed.lat - bTransformed.lat;
        }));
    
    // 🚀 Update cache with column groups
    if (!plantGroupCache || plantGroupCache.plantsHash !== currentHash) {
        plantGroupCache = {
            plantsHash: currentHash,
            rowGroups: plantGroupCache?.plantsHash === currentHash ? plantGroupCache.rowGroups : [],
            columnGroups: filteredGroups
        };
    } else {
        plantGroupCache.columnGroups = filteredGroups;
    }
    
    return filteredGroups;
};

// ฟังก์ชันหาต้นไม้ที่อยู่ในเส้นทางของท่อย่อย (โหมด A: วางทับแนวต้นไม้)
export const findPlantsInLateralPath = (
    startPoint: Coordinate,
    endPoint: Coordinate,
    plants: PlantLocation[],
    placementMode: 'over_plants' | 'between_plants',
    snapThreshold: number = 5
): PlantLocation[] => {
    if (placementMode === 'over_plants') {
        return findPlantsInOverPlantsMode(startPoint, endPoint, plants, snapThreshold);
    } else {
        return findPlantsInBetweenPlantsMode(startPoint, endPoint, plants, snapThreshold);
    }
};

// ฟังก์ชันหาต้นไม้ในโหมดวางทับแนวต้นไม้
export const findPlantsInOverPlantsMode = (
    startPoint: Coordinate,
    endPoint: Coordinate,
    plants: PlantLocation[],
    snapThreshold: number = 5
): PlantLocation[] => {
    if (!startPoint || !endPoint || !plants || plants.length === 0) {
        return [];
    }

    const result = computeOverPlantsMode(startPoint, endPoint, plants, snapThreshold, 'rows');
    return result.selectedPlants;
};

// ฟังก์ชันหาต้นไม้ในโหมดวางระหว่างแนวต้นไม้
export const findPlantsInBetweenPlantsMode = (
    startPoint: Coordinate,
    endPoint: Coordinate,
    plants: PlantLocation[],
    snapThreshold: number = 5
): PlantLocation[] => {
    if (!startPoint || !endPoint || !plants || plants.length === 0) {
        return [];
    }

    const result = computeBetweenPlantsMode(startPoint, endPoint, plants, snapThreshold, 'rows');
    return result.selectedPlants;
};

// ฟังก์ชันช่วย: เวคเตอร์และโปรเจคชันอย่างง่ายในพิกัด lat/lng (สมมติพื้นที่เล็ก)
const normalizeVector = (v: { lat: number; lng: number }): { lat: number; lng: number } => {
    const len = Math.sqrt(v.lat * v.lat + v.lng * v.lng) || 1;
    return { lat: v.lat / len, lng: v.lng / len };
};

const subtract = (a: Coordinate, b: Coordinate): { lat: number; lng: number } => ({
    lat: a.lat - b.lat,
    lng: a.lng - b.lng,
});

const scaleAndAdd = (origin: Coordinate, dir: { lat: number; lng: number }, t: number): Coordinate => ({
    lat: origin.lat + dir.lat * t,
    lng: origin.lng + dir.lng * t,
});

const dot = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => a.lat * b.lat + a.lng * b.lng;

// ฟังก์ชันใหม่สำหรับแปลงพิกัดตามการหมุน
const transformToRotatedCoordinate = (point: Coordinate, center: Coordinate, rotationAngle: number): Coordinate => {
    // แปลงมุมจากองศาเป็นเรเดียน
    const angleRadians = (rotationAngle * Math.PI) / 180;
    const cos = Math.cos(-angleRadians); // ใช้ค่าติดลบเพื่อแปลงกลับ
    const sin = Math.sin(-angleRadians);

    // แปลงจุดเป็นระบบพิกัดที่มีจุดกึ่งกลางเป็นจุดเริ่มต้น
    const dx = point.lat - center.lat;
    const dy = point.lng - center.lng;

    // หมุนจุดกลับไปยังระบบพิกัดเดิม
    const rotatedLat = center.lat + dx * cos - dy * sin;
    const rotatedLng = center.lng + dx * sin + dy * cos;

    return { lat: rotatedLat, lng: rotatedLng };
};

// ฟังก์ชันหาจุดกึ่งกลางของกลุ่มต้นไม้
const getPlantGroupCenter = (plants: PlantLocation[]): Coordinate => {
    if (plants.length === 0) return { lat: 0, lng: 0 };
    
    const totalLat = plants.reduce((sum, plant) => sum + plant.position.lat, 0);
    const totalLng = plants.reduce((sum, plant) => sum + plant.position.lng, 0);
    
    return {
        lat: totalLat / plants.length,
        lng: totalLng / plants.length
    };
};

// ฟังก์ชันตรวจสอบว่าต้นไม้มีการหมุนหรือไม่
const hasRotation = (plants: PlantLocation[]): { hasRotation: boolean; rotationAngle: number; center: Coordinate } => {
    if (plants.length === 0) {
        return { hasRotation: false, rotationAngle: 0, center: { lat: 0, lng: 0 } };
    }
    
    // ใช้มุมหมุนจากต้นไม้ต้นแรกที่มีข้อมูล
    const plantWithRotation = plants.find(plant => plant.rotationAngle !== undefined);
    const rotationAngle = plantWithRotation ? plantWithRotation.rotationAngle || 0 : 0;
    const center = getPlantGroupCenter(plants);
    
    return {
        hasRotation: Math.abs(rotationAngle) > 0.01, // tolerance สำหรับตรวจสอบว่ามีการหมุนจริงๆ
        rotationAngle,
        center
    };
};

// ฟังก์ชันช่วย: หาทิศทางการลาก เพื่อเดาว่าควรอิงแถว (rows) หรือคอลัมน์ (columns) (รองรับการหมุน)
const getDragOrientation = (start: Coordinate, end: Coordinate, plants?: PlantLocation[]): 'rows' | 'columns' => {
    let dLat = Math.abs(end.lat - start.lat);
    let dLng = Math.abs(end.lng - start.lng);
    
    // หากมีข้อมูลต้นไม้และมีการหมุน ให้ปรับการคำนวณทิศทาง
    if (plants && plants.length > 0) {
        const rotationInfo = hasRotation(plants);
        
        if (rotationInfo.hasRotation) {
            // แปลงจุดเริ่มต้นและสิ้นสุดเป็นระบบพิกัดที่หมุนแล้ว
            const transformedStart = transformToRotatedCoordinate(start, rotationInfo.center, rotationInfo.rotationAngle);
            const transformedEnd = transformToRotatedCoordinate(end, rotationInfo.center, rotationInfo.rotationAngle);
            
            dLat = Math.abs(transformedEnd.lat - transformedStart.lat);
            dLng = Math.abs(transformedEnd.lng - transformedStart.lng);
        }
    }
    
    // เพิ่มการตรวจสอบที่แม่นยำมากขึ้น
    // ถ้าเคลื่อนที่ทางเหนือ-ใต้มากกว่า → ใช้คอลัมน์, มิฉะนั้นใช้แถว
    // เพิ่ม threshold เพื่อให้การตัดสินใจแม่นยำมากขึ้น
    const threshold = 0.1; // ปรับ threshold ตามความเหมาะสม
    
    if (dLat > dLng * (1 + threshold)) {
        return 'columns'; // แนวตั้ง (เหนือ-ใต้)
    } else if (dLng > dLat * (1 + threshold)) {
        return 'rows'; // แนวนอน (ตะวันออก-ตะวันตก)
    } else {
        // กรณีที่ใกล้เคียงกัน ให้ใช้ทิศทางที่ยาวกว่า
        return dLat > dLng ? 'columns' : 'rows';
    }
};

// ฟังก์ชันช่วย: หาทิศทางของแนวแถวจากพอยต์ต้น-ปลายในแถว (รองรับการหมุน)
const directionFromPlantsLine = (plants: PlantLocation[]): { lat: number; lng: number } => {
    if (!plants || plants.length < 2) return { lat: 0, lng: 1 };
    
    // ตรวจสอบการหมุนของต้นไม้
    const rotationInfo = hasRotation(plants);
    
    let sortedPlants: PlantLocation[];
    
    if (rotationInfo.hasRotation) {
        // แปลงพิกัดแล้วเรียงลำดับตาม lng ที่แปลงแล้ว
        const plantsWithTransformed = plants.map(plant => ({
            plant,
            transformedPosition: transformToRotatedCoordinate(plant.position, rotationInfo.center, rotationInfo.rotationAngle)
        }));
        
        sortedPlants = plantsWithTransformed
            .sort((a, b) => a.transformedPosition.lng - b.transformedPosition.lng)
            .map(item => item.plant);
    } else {
        sortedPlants = [...plants].sort((a, b) => a.position.lng - b.position.lng);
    }
    
    const first = sortedPlants[0].position;
    const last = sortedPlants[sortedPlants.length - 1].position;
    return normalizeVector({ lat: last.lat - first.lat, lng: last.lng - first.lng });
};

// ฟังก์ชันช่วย: หาทิศทางของแนวคอลัมน์จากพอยต์ต้น-ปลายในคอลัมน์ (รองรับการหมุน)
const directionFromPlantsColumn = (plants: PlantLocation[]): { lat: number; lng: number } => {
    if (!plants || plants.length < 2) return { lat: 1, lng: 0 };
    
    // ตรวจสอบการหมุนของต้นไม้
    const rotationInfo = hasRotation(plants);
    
    let sortedPlants: PlantLocation[];
    
    if (rotationInfo.hasRotation) {
        // แปลงพิกัดแล้วเรียงลำดับตาม lat ที่แปลงแล้ว
        const plantsWithTransformed = plants.map(plant => ({
            plant,
            transformedPosition: transformToRotatedCoordinate(plant.position, rotationInfo.center, rotationInfo.rotationAngle)
        }));
        
        sortedPlants = plantsWithTransformed
            .sort((a, b) => a.transformedPosition.lat - b.transformedPosition.lat)
            .map(item => item.plant);
    } else {
        sortedPlants = [...plants].sort((a, b) => a.position.lat - b.position.lat);
    }
    
    const first = sortedPlants[0].position;
    const last = sortedPlants[sortedPlants.length - 1].position;
    return normalizeVector({ lat: last.lat - first.lat, lng: last.lng - first.lng });
};

// ฟังก์ชันหลัก: คำนวณการ snap และเลือกต้นไม้ตามโหมดที่กำหนด
export const computeAlignedLateral = (
    startPoint: Coordinate,
    rawEndPoint: Coordinate,
    plants: PlantLocation[],
    placementMode: 'over_plants' | 'between_plants',
    snapThreshold: number = 20
): { alignedEnd: Coordinate; selectedPlants: PlantLocation[]; snappedStart: Coordinate } => {
    if (!startPoint || !rawEndPoint) {
        return { alignedEnd: rawEndPoint, selectedPlants: [], snappedStart: startPoint || rawEndPoint };
    }

    // ตรวจสอบกรณีไม่มีต้นไม้ - ให้ใช้เส้นตรงจาก start ไป rawEnd
    if (!plants || plants.length === 0) {
        return { alignedEnd: rawEndPoint, selectedPlants: [], snappedStart: startPoint };
    }

    // กำหนดทิศทางของท่อจาก startPoint ไป rawEndPoint (พิจารณาการหมุนของต้นไม้)
    const direction = getDragOrientation(startPoint, rawEndPoint, plants);

    if (placementMode === 'over_plants') {
        return computeOverPlantsMode(startPoint, rawEndPoint, plants, snapThreshold, direction);
    } else {
        return computeBetweenPlantsMode(startPoint, rawEndPoint, plants, snapThreshold, direction);
    }
};

// ฟังก์ชันใหม่สำหรับคำนวณท่อสีเขียวที่เริ่มจากท่อเมนรอง
export const computeAlignedLateralFromMainPipe = (
    snappedStartPoint: Coordinate, // จุดเริ่มต้นที่ snap ไปท่อเมนรองแล้ว
    rawEndPoint: Coordinate,
    plants: PlantLocation[],
    placementMode: 'over_plants' | 'between_plants',
    snapThreshold: number = 20
): { alignedEnd: Coordinate; selectedPlants: PlantLocation[]; snappedStart: Coordinate } => {
    if (!snappedStartPoint || !rawEndPoint) {
        return { alignedEnd: rawEndPoint, selectedPlants: [], snappedStart: snappedStartPoint || rawEndPoint };
    }

    // ตรวจสอบกรณีไม่มีต้นไม้ - ให้ใช้เส้นตรงจาก snappedStart ไป rawEnd
    if (!plants || plants.length === 0) {
        return { alignedEnd: rawEndPoint, selectedPlants: [], snappedStart: snappedStartPoint };
    }

    // กำหนดทิศทางของท่อจาก snappedStartPoint ไป rawEndPoint (พิจารณาการหมุนของต้นไม้)
    const direction = getDragOrientation(snappedStartPoint, rawEndPoint, plants);

    if (placementMode === 'over_plants') {
        return computeOverPlantsModeFromMainPipe(snappedStartPoint, rawEndPoint, plants, snapThreshold, direction);
    } else {
        return computeBetweenPlantsModeFromMainPipe(snappedStartPoint, rawEndPoint, plants, snapThreshold, direction);
    }
};

// โหมด A: วางทับแนวต้นไม้ (ปรับปรุงใหม่ตามเงื่อนไขที่ระบุ)
export const computeOverPlantsMode = (
    initialStartPoint: Coordinate,
    rawEndPoint: Coordinate,
    plants: PlantLocation[],
    snapThreshold: number,
    direction: 'rows' | 'columns'
): { alignedEnd: Coordinate; selectedPlants: PlantLocation[]; snappedStart: Coordinate } => {
    const rows = groupPlantsByRows(plants);
    const cols = groupPlantsByColumns(plants);
    
    // ฟังก์ชันช่วย: หาต้นไม้ที่ใกล้ initialStartPoint ที่สุดในกลุ่ม
    const findClosestPlantToStart = (group: PlantLocation[]): { plant: PlantLocation, distance: number } | null => {
        if (group.length === 0) return null;
        let closest: { plant: PlantLocation, distance: number } | null = null;
        group.forEach(p => {
            const dist = calculateDistanceBetweenPoints(initialStartPoint, p.position);
            if (!closest || dist < closest.distance) {
                closest = { plant: p, distance: dist };
            }
        });
        return closest;
    };
    
    // หาแถวหรือคอลัมน์ตามเงื่อนไข: "ต้นไม้ต้นแรกที่ท่อย่อยวิ่งผ่าใกล้ใครที่สุด"
    interface OverPlantsAlignment {
        type: 'row' | 'col';
        plants: PlantLocation[];
        firstPlantDistance: number; // ระยะห่างของ "ต้นไม้ต้นแรก" จาก initialStartPoint
        firstPlant: PlantLocation; // ต้นไม้ต้นแรกที่ใกล้ initialStartPoint ที่สุด
        centerLine: { start: Coordinate; end: Coordinate };
    }
    
    let bestAlignment: OverPlantsAlignment | null = null;

    // เลือกกลุ่มต้นไม้ตามทิศทางที่กำหนด
    const targetGroups = direction === 'rows' ? rows : cols;
    const groupType = direction === 'rows' ? 'row' : 'col';

    // ตรวจสอบกลุ่มต้นไม้ตามทิศทางที่เลือก
    targetGroups.forEach((group, groupIndex) => {
        if (group.length < 2) return;
        
        const closestToStart = findClosestPlantToStart(group);
        if (!closestToStart) return;
        
        // เพิ่ม snapThreshold ให้มากขึ้นสำหรับการ snap ไปยังแถว/คอลัมน์
        const adjustedSnapThreshold = snapThreshold * 2; // เพิ่มเป็น 2 เท่า
        
        // เลือกกลุ่มที่มี "ต้นไม้ต้นแรก" ใกล้ initialStartPoint ที่สุด และอยู่ในระยะ snapThreshold
        if (closestToStart.distance <= adjustedSnapThreshold && 
            (!bestAlignment || closestToStart.distance < bestAlignment.firstPlantDistance)) {
            
            // สร้างเส้นกึ่งกลางของกลุ่ม - ปรับให้ยาวเต็มแถว/คอลัมน์เพื่อให้ระบบสามารถ snap ได้
            let fullCenterLine: { start: Coordinate; end: Coordinate };
            
            if (direction === 'rows') {
                // สำหรับแถว: เรียงตาม lng
                const sortedByLng = [...group].sort((a, b) => a.position.lng - b.position.lng);
                fullCenterLine = {
                    start: sortedByLng[0].position,
                    end: sortedByLng[sortedByLng.length - 1].position
                };
            } else {
                // สำหรับคอลัมน์: ใช้ lng coordinate ที่คงที่ และเรียงตาม lat
                const sortedByLat = [...group].sort((a, b) => a.position.lat - b.position.lat);
                const avgLng = group.reduce((sum, p) => sum + p.position.lng, 0) / group.length;
                fullCenterLine = {
                    start: { lat: sortedByLat[0].position.lat, lng: avgLng },
                    end: { lat: sortedByLat[sortedByLat.length - 1].position.lat, lng: avgLng }
                };
            }
            
            bestAlignment = {
                type: groupType,
                plants: group,
                firstPlantDistance: closestToStart.distance,
                firstPlant: closestToStart.plant,
                centerLine: fullCenterLine
            };
        }
    });

    if (!bestAlignment) {
        return { alignedEnd: rawEndPoint, selectedPlants: [], snappedStart: initialStartPoint };
    }

    // Type assertion to help TypeScript understand bestAlignment is not null
    const alignment = bestAlignment as OverPlantsAlignment;

    // คำนวณ snappedStart: จุดที่ projection ของ initialStartPoint ลงบนเส้นกึ่งกลางของแถว/คอลัมน์ที่เลือก
    const snappedStart = findClosestPointOnLineSegment(initialStartPoint, alignment.centerLine.start, alignment.centerLine.end);

    // ค้นหาจุดที่ใกล้ที่สุดบนเส้นกึ่งกลางของแถว/คอลัมน์ที่เลือก โดยใช้ตำแหน่งเมาส์
    // แทนที่จะใช้ปลายของแถว/คอลัมน์ทั้งหมด ให้ใช้ตำแหน่งที่เมาส์ลากไป
    const alignedEnd = findClosestPointOnLineSegment(rawEndPoint, alignment.centerLine.start, alignment.centerLine.end);
    
    // เลือกต้นไม้จากแถว/คอลัมน์ที่เลือก เฉพาะที่อยู่ระหว่าง snappedStart และ alignedEnd
    const selectedPlants = alignment.plants.filter((plant, index) => {
        // หาตำแหน่งของต้นไม้บนเส้นกึ่งกลางของแถว/คอลัมน์
        const plantProjected = findClosestPointOnLineSegment(plant.position, alignment.centerLine.start, alignment.centerLine.end);
        
        // ตรวจสอบว่าต้นไม้อยู่ระหว่าง snappedStart และ alignedEnd หรือไม่
        let isInRange = false;
        
        if (alignment.type === 'row') {
            // สำหรับแถว: ตรวจสอบตาม lng ระหว่าง snappedStart และ alignedEnd
            const minLng = Math.min(snappedStart.lng, alignedEnd.lng);
            const maxLng = Math.max(snappedStart.lng, alignedEnd.lng);
            isInRange = plantProjected.lng >= minLng - 0.000001 && plantProjected.lng <= maxLng + 0.000001;
        } else {
            // สำหรับคอลัมน์: ตรวจสอบตาม lat ระหว่าง snappedStart และ alignedEnd
            const minLat = Math.min(snappedStart.lat, alignedEnd.lat);
            const maxLat = Math.max(snappedStart.lat, alignedEnd.lat);
            isInRange = plantProjected.lat >= minLat - 0.000001 && plantProjected.lat <= maxLat + 0.000001;
        }
        
        // ตรวจสอบว่าต้นไม้อยู่ใกล้แถว/คอลัมน์ที่เลือกเพียงพอ (tolerance 2 เมตร - เพิ่มขึ้นเพื่อให้ครอบคลุมมากขึ้น)
        const distanceToLine = calculateDistanceBetweenPoints(plant.position, plantProjected);
        const result = isInRange && distanceToLine <= 2.0;
        
        return result;
    });

    return { alignedEnd, selectedPlants, snappedStart };
};

// โหมด B: วางระหว่างแนวต้นไม้ (ปรับปรุงใหม่ตามเงื่อนไขที่ระบุ)
export const computeBetweenPlantsMode = (
    initialStartPoint: Coordinate,
    rawEndPoint: Coordinate,
    plants: PlantLocation[],
    snapThreshold: number,
    direction: 'rows' | 'columns'
): { alignedEnd: Coordinate; selectedPlants: PlantLocation[]; snappedStart: Coordinate } => {
    const rows = groupPlantsByRows(plants);
    const cols = groupPlantsByColumns(plants);
    
    // ฟังก์ชันช่วย: หาต้นไม้ที่ใกล้ initialStartPoint ที่สุดจากคู่แถว/คอลัมน์
    const findClosestPlantToStartInPair = (group1: PlantLocation[], group2: PlantLocation[]): { plant: PlantLocation, distance: number } | null => {
        const allPlants = [...group1, ...group2];
        if (allPlants.length === 0) return null;
        
        let closest: { plant: PlantLocation, distance: number } | null = null;
        allPlants.forEach(p => {
            const dist = calculateDistanceBetweenPoints(initialStartPoint, p.position);
            if (!closest || dist < closest.distance) {
                closest = { plant: p, distance: dist };
            }
        });
        return closest;
    };
    
    // เลือกกลุ่มต้นไม้ตามทิศทางที่กำหนด
    const targetGroups = direction === 'rows' ? rows : cols;
    const groupType = direction === 'rows' ? 'between_rows' : 'between_cols';
    
    // หา "ต้นไม้ต้นแรก" ในแต่ละคู่แถว/คอลัมน์ที่ใกล้ initialStartPoint ที่สุด
    interface BetweenPlantsAlignment {
        type: 'between_rows' | 'between_cols';
        row1: PlantLocation[];
        row2: PlantLocation[];
        firstPlantDistance: number; // ระยะห่างของ "ต้นไม้ต้นแรก" จาก initialStartPoint
        firstPlant: PlantLocation; // ต้นไม้ต้นแรกที่ใกล้ initialStartPoint ที่สุดในคู่นี้
        centerLine: { start: Coordinate; end: Coordinate };
    }
    
    let bestAlignment: BetweenPlantsAlignment | null = null;

    // ตรวจสอบคู่แถว/คอลัมน์ที่ติดกัน
    for (let i = 0; i < targetGroups.length - 1; i++) {
        const group1 = targetGroups[i];
        const group2 = targetGroups[i + 1];
        
        if (group1.length < 2 || group2.length < 2) continue;
        
        const closestToStart = findClosestPlantToStartInPair(group1, group2);
        if (!closestToStart) continue;
        
        // เพิ่ม snapThreshold ให้มากขึ้นสำหรับการ snap ไปยังแถว/คอลัมน์
        const adjustedSnapThreshold = snapThreshold * 3; // เพิ่มเป็น 3 เท่าเพื่อให้หาคู่แถว/คอลัมน์ได้ง่ายขึ้น
        
        // เพิ่มการตรวจสอบระยะห่างระหว่างคู่แถว/คอลัมน์เพื่อให้แน่ใจว่าเลือกคู่ที่เหมาะสม
        const group1Center = {
            lat: group1.reduce((sum, p) => sum + p.position.lat, 0) / group1.length,
            lng: group1.reduce((sum, p) => sum + p.position.lng, 0) / group1.length
        };
        const group2Center = {
            lat: group2.reduce((sum, p) => sum + p.position.lat, 0) / group2.length,
            lng: group2.reduce((sum, p) => sum + p.position.lng, 0) / group2.length
        };
        const distanceBetweenGroups = calculateDistanceBetweenPoints(group1Center, group2Center);
        
        // เลือกคู่แถว/คอลัมน์ที่มี "ต้นไม้ต้นแรก" ใกล้ initialStartPoint ที่สุด และอยู่ในระยะ snapThreshold
        
        // ตรวจสอบว่าคู่แถว/คอลัมน์มีระยะห่างที่เหมาะสม (ไม่ใกล้หรือไกลเกินไป)
        const minGroupDistance = 1.0; // ลดระยะห่างขั้นต่ำ (เมตร) 
        const maxGroupDistance = 20.0; // เพิ่มระยะห่างสูงสุด (เมตร) เพื่อให้รองรับการปลูกที่ห่างกันมาก
        
        // เพิ่มการตรวจสอบความเหมาะสมของคู่แถว/คอลัมน์
        const isSuitablePair = closestToStart.distance <= adjustedSnapThreshold && 
            distanceBetweenGroups >= minGroupDistance && 
            distanceBetweenGroups <= maxGroupDistance;
        
        // เพิ่มการตรวจสอบระยะห่างจากจุดเริ่มต้นไปยังเส้นกึ่งกลางของคู่แถว/คอลัมน์
        const centerLineStart = {
            lat: (group1[0].position.lat + group2[0].position.lat) / 2,
            lng: (group1[0].position.lng + group2[0].position.lng) / 2
        };
        const centerLineEnd = {
            lat: (group1[group1.length - 1].position.lat + group2[group2.length - 1].position.lat) / 2,
            lng: (group1[group1.length - 1].position.lng + group2[group2.length - 1].position.lng) / 2
        };
        const closestPointOnCenterLine = findClosestPointOnLineSegment(initialStartPoint, centerLineStart, centerLineEnd);
        const distanceToCenterLine = calculateDistanceBetweenPoints(initialStartPoint, closestPointOnCenterLine);
        
        // เพิ่มการตรวจสอบความเหมาะสมเพิ่มเติม
        const isOptimalDistance = distanceBetweenGroups >= 2.0 && distanceBetweenGroups <= 15.0; // ปรับระยะห่างที่เหมาะสมที่สุดให้หลวมขึ้น
        
        // ปรับปรุงการเลือกคู่แถว/คอลัมน์ให้แม่นยำขึ้น
        const isBetterChoice = !bestAlignment || 
            distanceToCenterLine < (bestAlignment.firstPlantDistance * 0.7) || // ดีกว่า 30%
            (distanceToCenterLine <= bestAlignment.firstPlantDistance * 0.9 && isOptimalDistance); // ใกล้กว่าและระยะห่างเหมาะสม
        
        // เพิ่มการตรวจสอบว่าจุดเริ่มต้นอยู่ใกล้เส้นกึ่งกลางของคู่แถว/คอลัมน์นี้
        const isCloseToCenterLine = distanceToCenterLine <= adjustedSnapThreshold * 0.8; // เพิ่มขึ้นเป็น 0.8 เพื่อให้หลวมขึ้น
        
        // เพิ่มการตรวจสอบความเหมาะสมของคู่แถว/คอลัมน์
        const isGoodPair = isSuitablePair && isBetterChoice && isCloseToCenterLine;
        
        if (isGoodPair) {
            // สร้างเส้นกึ่งกลางระหว่างคู่แถว/คอลัมน์ - ปรับให้ยาวเต็มเพื่อให้ระบบสามารถ snap ได้
            let fullCenterLine: { start: Coordinate; end: Coordinate };
            
            if (direction === 'rows') {
                // สำหรับระหว่างแถว: เรียงตาม lng และหาจุดกึ่งกลาง
                const sorted1ByLng = [...group1].sort((a, b) => a.position.lng - b.position.lng);
                const sorted2ByLng = [...group2].sort((a, b) => a.position.lng - b.position.lng);
                
                const start1 = sorted1ByLng[0].position;
                const end1 = sorted1ByLng[sorted1ByLng.length - 1].position;
                const start2 = sorted2ByLng[0].position;
                const end2 = sorted2ByLng[sorted2ByLng.length - 1].position;
                
                // หาจุดกึ่งกลางระหว่างแถว
                const centerStart = {
                    lat: (start1.lat + start2.lat) / 2,
                    lng: (start1.lng + start2.lng) / 2
                };
                const centerEnd = {
                    lat: (end1.lat + end2.lat) / 2,
                    lng: (end1.lng + end2.lng) / 2
                };
                
                fullCenterLine = { start: centerStart, end: centerEnd };
            } else {
                // สำหรับระหว่างคอลัมน์: ใช้ lng coordinate ที่คงที่ และเรียงตาม lat
                const sorted1ByLat = [...group1].sort((a, b) => a.position.lat - b.position.lat);
                const sorted2ByLat = [...group2].sort((a, b) => a.position.lat - b.position.lat);
                
                const avgLng1 = group1.reduce((sum, p) => sum + p.position.lng, 0) / group1.length;
                const avgLng2 = group2.reduce((sum, p) => sum + p.position.lng, 0) / group2.length;
                const avgLng = (avgLng1 + avgLng2) / 2;
                
                // หาจุดกึ่งกลางระหว่างคอลัมน์
                const centerStart = {
                    lat: (sorted1ByLat[0].position.lat + sorted2ByLat[0].position.lat) / 2,
                    lng: avgLng
                };
                const centerEnd = {
                    lat: (sorted1ByLat[sorted1ByLat.length - 1].position.lat + sorted2ByLat[sorted2ByLat.length - 1].position.lat) / 2,
                    lng: avgLng
                };
                
                fullCenterLine = { start: centerStart, end: centerEnd };
            }
            
            bestAlignment = {
                type: groupType,
                row1: group1,
                row2: group2,
                firstPlantDistance: closestToStart.distance,
                firstPlant: closestToStart.plant,
                centerLine: fullCenterLine
            };
        }
    }

    if (!bestAlignment) {
        return { alignedEnd: rawEndPoint, selectedPlants: [], snappedStart: initialStartPoint };
    }

    // คำนวณ snappedStart: จุดที่ projection ของ initialStartPoint ลงบนเส้นกึ่งกลาง
    // เพิ่มการตรวจสอบว่าจุดเริ่มต้นควร snap ไปยังคู่แถว/คอลัมน์ที่ถูกต้อง
    const snappedStart = findClosestPointOnLineSegment(initialStartPoint, bestAlignment.centerLine.start, bestAlignment.centerLine.end);
    
    // ตรวจสอบว่าจุดเริ่มต้น snap ไปยังคู่แถว/คอลัมน์ที่ถูกต้องหรือไม่
    const distanceToCenterLine = calculateDistanceBetweenPoints(initialStartPoint, snappedStart);

    // ค้นหาจุดที่ใกล้ที่สุดบนเส้นกึ่งกลาง
    // สำคัญ: ต้องใช้เส้นกึ่งกลางของแถว/คอลัมน์เท่านั้น ไม่ใช่ rawEndPoint
    const alignedEnd = findClosestPointOnLineSegment(rawEndPoint, bestAlignment.centerLine.start, bestAlignment.centerLine.end);
    
    // เลือกต้นไม้จากคู่แถว/คอลัมน์ที่เลือก เฉพาะที่อยู่ระหว่าง snappedStart และ alignedEnd
    const allPlantsInPair = [...bestAlignment.row1, ...bestAlignment.row2];
    
    const selectedPlants = allPlantsInPair.filter((plant, index) => {
        // หาตำแหน่งของต้นไม้บนเส้นกึ่งกลาง
        const plantProjected = findClosestPointOnLineSegment(plant.position, bestAlignment.centerLine.start, bestAlignment.centerLine.end);
        
        // ตรวจสอบว่าต้นไม้อยู่ระหว่าง snappedStart และ alignedEnd หรือไม่
        let isInRange = false;
        
        if (bestAlignment.type === 'between_rows') {
            // สำหรับระหว่างแถว: ตรวจสอบตาม lng
            const minLng = Math.min(snappedStart.lng, alignedEnd.lng);
            const maxLng = Math.max(snappedStart.lng, alignedEnd.lng);
            isInRange = plantProjected.lng >= minLng - 0.000001 && plantProjected.lng <= maxLng + 0.000001;
        } else {
            // สำหรับระหว่างคอลัมน์: ตรวจสอบตาม lat
            const minLat = Math.min(snappedStart.lat, alignedEnd.lat);
            const maxLat = Math.max(snappedStart.lat, alignedEnd.lat);
            isInRange = plantProjected.lat >= minLat - 0.000001 && plantProjected.lat <= maxLat + 0.000001;
        }
        
        // ตรวจสอบว่าต้นไม้อยู่ใกล้เส้นกึ่งกลางเพียงพอ (tolerance 8 เมตร - เพิ่มขึ้นเพื่อให้ครอบคลุมมากขึ้น)
        const distanceToLine = calculateDistanceBetweenPoints(plant.position, plantProjected);
        const result = isInRange && distanceToLine <= 8.0;
        
        return result;
    });

    return { alignedEnd, selectedPlants, snappedStart };
};

// ฟังก์ชันคำนวณความต้องการน้ำรวม
export const calculateTotalWaterNeed = (plants: PlantLocation[]): number => {
    return plants.reduce((total, plant) => total + plant.plantData.waterNeed, 0);
};

// ฟังก์ชันสร้าง ID สำหรับท่อย่อย
export const generateLateralPipeId = (): string => {
    return `lateral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ฟังก์ชันสร้างท่อแยกย่อย (Emitter Lines) - โหมดวางทับแนวต้นไม้
// ในโหมดนี้ ท่อย่อยวางทับแนวต้นไม้โดยตรง ไม่ต้องมีท่อแยกย่อย
export const generateEmitterLines = (
    lateralPipeId: string,
    lateralStart: Coordinate,
    lateralEnd: Coordinate,
    plants: PlantLocation[],
    emitterDiameter: number = 4
): any[] => {
    // ในโหมดวางทับแนวต้นไม้ ไม่ต้องสร้างท่อแยกย่อย
    // ต้นไม้จะได้รับน้ำจากท่อย่อยที่วางทับแนวต้นไม้โดยตรง
    return [];
};

// ฟังก์ชันสร้างท่อแขนงอัตโนมัติสำหรับโหมดวางระหว่างแนวต้นไม้
// **แก้ไข: สร้างท่อแยกย่อยเฉพาะต้นไม้ที่ลากถึงเท่านั้น**
export const generateEmitterLinesForBetweenPlantsMode = (
    lateralPipeId: string,
    lateralStart: Coordinate,
    lateralEnd: Coordinate,
    selectedPlants: PlantLocation[], // เปลี่ยนจาก plants เป็น selectedPlants
    emitterDiameter: number = 4
): any[] => {

    
    const emitterLines: any[] = [];

    selectedPlants.forEach(plant => {
        // หาจุดที่ใกล้ที่สุดบนท่อย่อยสำหรับแต่ละต้นไม้ที่เลือก
        const closestPointOnLateral = findClosestPointOnLineSegment(
            plant.position,
            lateralStart,
            lateralEnd
        );

        const distance = calculateDistanceBetweenPoints(closestPointOnLateral, plant.position);

        // สร้างท่อแยกย่อยเฉพาะต้นไม้ที่อยู่ในระยะที่เหมาะสม (ไม่เกิน 10 เมตร)
        if (distance <= 10.0) {
            const emitterLine = {
                id: `emitter_${lateralPipeId}_${plant.id}`,
                lateralPipeId: lateralPipeId,
                plantId: plant.id,
                coordinates: [closestPointOnLateral, plant.position],
                length: distance,
                diameter: emitterDiameter,
                emitterType: 'drip',
                isVisible: true,
                isActive: true,
                connectionPoint: closestPointOnLateral
            };

            emitterLines.push(emitterLine);
        }
    });


    return emitterLines;
};

// Export ฟังก์ชันที่จำเป็นสำหรับการใช้งานภายนอก
// Note: findPlantsInBetweenPlantsMode and findPlantsInOverPlantsMode are now exported directly

// โหมด A: วางทับแนวต้นไม้ (เริ่มจากท่อเมนรอง)
const computeOverPlantsModeFromMainPipe = (
    snappedStartPoint: Coordinate,
    rawEndPoint: Coordinate,
    plants: PlantLocation[],
    snapThreshold: number,
    direction: 'rows' | 'columns'
): { alignedEnd: Coordinate; selectedPlants: PlantLocation[]; snappedStart: Coordinate } => {
    return computeOverPlantsMode(snappedStartPoint, rawEndPoint, plants, snapThreshold, direction);
};

// โหมด B: วางระหว่างแนวต้นไม้ (เริ่มจากท่อเมนรอง)
const computeBetweenPlantsModeFromMainPipe = (
    snappedStartPoint: Coordinate,
    rawEndPoint: Coordinate,
    plants: PlantLocation[],
    snapThreshold: number,
    direction: 'rows' | 'columns'
): { alignedEnd: Coordinate; selectedPlants: PlantLocation[]; snappedStart: Coordinate } => {
    return computeBetweenPlantsMode(snappedStartPoint, rawEndPoint, plants, snapThreshold, direction);
};
