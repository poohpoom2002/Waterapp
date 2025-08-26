import { router } from '@inertiajs/react';

export interface Coordinate {
    lat: number;
    lng: number;
}

export interface PlantData {
    id: number;
    name: string;
    plantSpacing: number;
    rowSpacing: number;
    waterNeed: number;
}

/**
 * @deprecated ใช้ IrrigationZone แทน - interface นี้จะถูกลบในอนาคต
 * ปัจจุบันใช้เฉพาะการแบ่งโซนให้น้ำ (💧 แบ่งโซนให้น้ำ) และการแบ่งโซนน้ำเอง (💧 แบ่งโซนน้ำเอง)
 */
export interface Zone {
    id: string;
    name: string;
    coordinates: Coordinate[];
    plantData: PlantData;
    plantCount: number;
    totalWaterNeed: number;
    area: number;
    color: string;
    isLocked?: boolean;
    createdAt?: string;
    updatedAt?: string;
    shape?: 'circle' | 'polygon' | 'rectangle';
    isCustomPlant?: boolean;
}

export interface Pump {
    id: string;
    position: Coordinate;
    type: 'submersible' | 'centrifugal' | 'jet';
    capacity: number;
    head: number;
    power?: number;
    efficiency?: number;
}

export interface MainPipe {
    id: string;
    fromPump: string;
    toZone: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    material?: 'pvc' | 'hdpe' | 'steel';
    pressure?: number;
    flowRate?: number;
}

export interface SubMainPipe {
    id: string;
    zoneId: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    branchPipes: BranchPipe[];
    material?: 'pvc' | 'hdpe' | 'steel';
    isEditable?: boolean;
}

export interface BranchPipe {
    id: string;
    subMainPipeId: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    plants: PlantLocation[];
    sprinklerType?: string;
    isEditable?: boolean;
    angle?: number;
    connectionPoint?: number;
}

export interface PlantLocation {
    id: string;
    position: Coordinate;
    plantData: PlantData;
    isSelected?: boolean;
    isEditable?: boolean;
    elevation?: number;
    soilType?: string;
    health?: 'good' | 'fair' | 'poor';
    zoneId?: string;
}

export interface ExclusionArea {
    id: string;
    type: 'building' | 'powerplant' | 'river' | 'road' | 'other';
    coordinates: Coordinate[];
    name: string;
    color: string;
    description?: string;
    isLocked?: boolean;
    shape?: 'circle' | 'polygon' | 'rectangle';
}

export interface BranchPipeSettings {
    defaultAngle: number;
    maxAngle: number;
    minAngle: number;
    angleStep: number;
}

export interface HorticultureProjectData {
    projectName: string;
    customerName?: string;
    version?: string;
    totalArea: number;
    mainArea: Coordinate[];
    pump: Pump | null;
    zones: Zone[];
    mainPipes: MainPipe[];
    subMainPipes: SubMainPipe[];
    exclusionAreas: ExclusionArea[];
    plants: PlantLocation[];
    useZones: boolean;
    selectedPlantType?: PlantData;
    branchPipeSettings?: BranchPipeSettings;
    irrigationZones?: {
        id: string;
        name: string;
        coordinates: Coordinate[];
        plants: PlantLocation[];
        totalWaterNeed: number;
        color: string;
        layoutIndex: number;
    }[]; // เพิ่มสำหรับระบบโซนใหม่
    createdAt: string;
    updatedAt: string;
}

export interface ProjectSummaryData {
    totalAreaInRai: number;
    totalZones: number;
    totalPlants: number;
    totalWaterNeedPerSession: number;
    waterPerPlant: number;

    mainPipes: {
        longest: number;
        totalLength: number;
    };
    subMainPipes: {
        longest: number;
        totalLength: number;
    };
    branchPipes: {
        longest: number;
        totalLength: number;
    };
    longestPipesCombined: number;

    zoneDetails: ZoneSummaryData[];
}

export interface ZoneSummaryData {
    zoneId: string;
    zoneName: string;
    areaInRai: number;
    plantCount: number;
    waterNeedPerSession: number;
    waterPerPlant: number;
    plantData?: PlantData;

    mainPipesInZone: {
        longest: number;
        totalLength: number;
    };
    subMainPipesInZone: {
        longest: number;
        totalLength: number;
    };
    branchPipesInZone: {
        longest: number;
        totalLength: number;
    };
}
export const calculateAreaFromCoordinates = (coordinates: Coordinate[]): number => {
    if (!coordinates || coordinates.length < 3) return 0;

    try {
        let area = 0;
        for (let i = 0; i < coordinates.length; i++) {
            const j = (i + 1) % coordinates.length;
            area += coordinates[i].lat * coordinates[j].lng;
            area -= coordinates[j].lat * coordinates[i].lng;
        }
        area = Math.abs(area) / 2;

        const avgLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0) / coordinates.length;
        const latFactor = 111000;
        const lngFactor = 111000 * Math.cos((avgLat * Math.PI) / 180);

        const areaInSquareMeters = area * latFactor * lngFactor;
        return Math.max(0, areaInSquareMeters);
    } catch (error) {
        console.error('Error calculating area:', error);
        return 0;
    }
};

export const calculateDistanceBetweenPoints = (point1: Coordinate, point2: Coordinate): number => {
    try {
        const R = 6371000;
        const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
        const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((point1.lat * Math.PI) / 180) *
                Math.cos((point2.lat * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.max(0, R * c);
    } catch (error) {
        console.error('Error calculating distance:', error);
        return 0;
    }
};

export const calculatePipeLength = (coordinates: Coordinate[]): number => {
    if (!coordinates || coordinates.length < 2) return 0;

    try {
        let totalLength = 0;
        for (let i = 1; i < coordinates.length; i++) {
            totalLength += calculateDistanceBetweenPoints(coordinates[i - 1], coordinates[i]);
        }
        return totalLength;
    } catch (error) {
        console.error('Error calculating pipe length:', error);
        return 0;
    }
};

export const isPointInPolygon = (point: Coordinate, polygon: Coordinate[]): boolean => {
    if (!point || !polygon || polygon.length < 3) return false;

    try {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lat;
            const yi = polygon[i].lng;
            const xj = polygon[j].lat;
            const yj = polygon[j].lng;

            const intersect =
                yi > point.lng !== yj > point.lng &&
                point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
        return inside;
    } catch (error) {
        console.error('Error checking point in polygon:', error);
        return false;
    }
};

export const calculateProjectSummary = (
    projectData: HorticultureProjectData
): ProjectSummaryData => {
    const totalAreaInRai = projectData.totalArea / 1600;
    const totalZones = (projectData.irrigationZones?.length ?? 0) > 0 ? projectData.irrigationZones?.length ?? 1 : 1;
    const totalPlants = projectData.plants?.length || 0;
    const totalWaterNeedPerSession =
        projectData.plants?.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0) || 0;
    const waterPerPlant = totalPlants > 0 ? totalWaterNeedPerSession / totalPlants : 0;

    const mainPipeLengths = projectData.mainPipes?.map((pipe) => pipe.length) || [];
    const mainPipesData = {
        longest: mainPipeLengths.length > 0 ? Math.max(...mainPipeLengths) : 0,
        totalLength: mainPipeLengths.reduce((sum, length) => sum + length, 0),
    };

    const subMainPipeLengths = projectData.subMainPipes?.map((pipe) => pipe.length) || [];
    const subMainPipesData = {
        longest: subMainPipeLengths.length > 0 ? Math.max(...subMainPipeLengths) : 0,
        totalLength: subMainPipeLengths.reduce((sum, length) => sum + length, 0),
    };

    const allBranchPipes =
        projectData.subMainPipes?.flatMap((subMain) => subMain.branchPipes || []) || [];
    const branchPipeLengths = allBranchPipes.map((pipe) => pipe.length);
    const branchPipesData = {
        longest: branchPipeLengths.length > 0 ? Math.max(...branchPipeLengths) : 0,
        totalLength: branchPipeLengths.reduce((sum, length) => sum + length, 0),
    };

    const longestPipesCombined =
        mainPipesData.longest + subMainPipesData.longest + branchPipesData.longest;

    const zoneDetails: ZoneSummaryData[] = [];

    // ปิดการใช้งาน zones แบบเดิม ใช้ irrigationZones แทน
    // โค้ดเก่าถูกลบออกเพราะไม่ใช้แล้ว
    
    // กรณีไม่มีการแบ่งโซนหรือใช้พื้นที่เดียว
    {
        const plantDataForSingleZone =
            projectData.selectedPlantType || projectData.plants?.[0]?.plantData;
        const waterPerPlantSingleZone = plantDataForSingleZone?.waterNeed || 0;

        const singleZoneData: ZoneSummaryData = {
            zoneId: 'main-area',
            zoneName: 'พื้นที่หลัก',
            areaInRai: totalAreaInRai,
            plantCount: totalPlants,
            waterNeedPerSession: totalWaterNeedPerSession,
            waterPerPlant:
                totalPlants > 0 ? totalWaterNeedPerSession / totalPlants : waterPerPlantSingleZone,
            plantData: plantDataForSingleZone,
            mainPipesInZone: mainPipesData,
            subMainPipesInZone: subMainPipesData,
            branchPipesInZone: branchPipesData,
        };

        zoneDetails.push(singleZoneData);
    }

    const summary: ProjectSummaryData = {
        totalAreaInRai,
        totalZones,
        totalPlants,
        totalWaterNeedPerSession,
        waterPerPlant,
        mainPipes: mainPipesData,
        subMainPipes: subMainPipesData,
        branchPipes: branchPipesData,
        longestPipesCombined,
        zoneDetails,
    };

    return summary;
};

export const formatArea = (area: number): string => {
    if (typeof area !== 'number' || isNaN(area) || area < 0) return '0 ตร.ม.';
    if (area >= 1600) {
        return `${(area / 1600).toFixed(2)} ไร่`;
    } else {
        return `${area.toFixed(2)} ตร.ม.`;
    }
};

export const formatAreaInRai = (areaInRai: number): string => {
    if (typeof areaInRai !== 'number' || isNaN(areaInRai) || areaInRai < 0) return '0 ไร่';
    return `${areaInRai.toFixed(2)} ไร่`;
};

export const formatDistance = (distance: number): string => {
    if (typeof distance !== 'number' || isNaN(distance) || distance < 0) return '0 ม.';
    if (distance >= 1000) {
        return `${(distance / 1000).toFixed(2)} กม.`;
    } else {
        return `${distance.toFixed(2)} ม.`;
    }
};

export const formatWaterVolume = (volume: number): string => {
    if (typeof volume !== 'number' || isNaN(volume) || volume < 0) return '0 ลิตร';
    if (volume >= 1000000) {
        return `${(volume / 1000000).toFixed(2)} ล้านลิตร`;
    } else if (volume >= 1000) {
        return `${volume.toLocaleString('th-TH')} ลิตร`;
    } else {
        return `${volume.toFixed(2)} ลิตร`;
    }
};

export const STORAGE_KEY = 'horticultureIrrigationData';

export const saveProjectData = (data: HorticultureProjectData): boolean => {
    try {
        data.updatedAt = new Date().toISOString();
        data.version = '3.2.0';
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('❌ Error saving project data:', error);
        return false;
    }
};

export const loadProjectData = (): HorticultureProjectData | null => {
    try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            const data = JSON.parse(storedData);
            return data;
        }
        return null;
    } catch (error) {
        console.error('❌ Error loading project data:', error);
        return null;
    }
};

export const clearProjectData = (): void => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('❌ Error clearing project data:', error);
    }
};

// ฟังก์ชันใหม่สำหรับสร้างเส้นวัดระยะทางตั้งฉาก
export const generatePerpendicularDimensionLines = (
    exclusionArea: ExclusionArea,
    mainArea: Coordinate[],
    angleOffset: number = 0 // มุมในการปรับเอียง (องศา)
): { id: string; start: Coordinate; end: Coordinate; distance: number; angle: number }[] => {
    const lines: { id: string; start: Coordinate; end: Coordinate; distance: number; angle: number }[] = [];
    
    // ตรวจสอบข้อมูลพื้นฐาน
    if (!exclusionArea || !exclusionArea.coordinates || exclusionArea.coordinates.length < 3) {
        return lines;
    }
    
    if (!mainArea || mainArea.length < 3) {
        return lines;
    }
    
    // คำนวณขอบเขตของพื้นที่หลีกเลี่ยง
    const bounds = {
        minLat: Math.min(...exclusionArea.coordinates.map(c => c.lat)),
        maxLat: Math.max(...exclusionArea.coordinates.map(c => c.lat)),
        minLng: Math.min(...exclusionArea.coordinates.map(c => c.lng)),
        maxLng: Math.max(...exclusionArea.coordinates.map(c => c.lng))
    };

    // จุดกลางของพื้นที่หลีกเลี่ยง
    const center = {
        lat: (bounds.minLat + bounds.maxLat) / 2,
        lng: (bounds.minLng + bounds.maxLng) / 2
    };

    // สร้างเส้นตั้งฉาก 4 ทิศทาง (เหนือ, ใต้, ตะวันออก, ตะวันตก)
    const directions = [
        { name: 'north', angle: 0 + angleOffset },    // ขึ้นเหนือ
        { name: 'east', angle: 90 + angleOffset },    // ไปตะวันออก
        { name: 'south', angle: 180 + angleOffset },  // ลงใต้
        { name: 'west', angle: 270 + angleOffset }    // ไปตะวันตก
    ];

    directions.forEach((direction) => {
        // คำนวณจุดเริ่มต้นบนขอบของพื้นที่หลีกเลี่ยง
        const startPoint = calculatePointOnExclusionBoundary(
            exclusionArea.coordinates,
            center,
            direction.angle
        );

        if (startPoint) {
            // คำนวณจุดสิ้นสุดบนขอบของพื้นที่หลัก
            const endPoint = calculateIntersectionWithMainArea(
                startPoint,
                direction.angle,
                mainArea
            );

            if (endPoint) {
                const distance = calculateDistanceBetweenPoints(startPoint, endPoint);
                const line = {
                    id: generateUniqueId('dimension'),
                    start: startPoint,
                    end: endPoint,
                    distance: distance,
                    angle: direction.angle
                };
                
                lines.push(line);
            }
        }
    });

    return lines;
};

// ฟังก์ชันช่วยคำนวณจุดบนขอบของพื้นที่หลีกเลี่ยง
const calculatePointOnExclusionBoundary = (
    exclusionCoordinates: Coordinate[],
    center: Coordinate,
    angle: number
): Coordinate | null => {
    if (exclusionCoordinates.length < 3) return null;

    try {
        // แปลงมุมเป็นเรเดียน
        const angleRad = (angle * Math.PI) / 180;
        
        // คำนวณเวกเตอร์ทิศทาง
        const directionVector = {
            lat: Math.cos(angleRad),
            lng: Math.sin(angleRad)
        };

        // หาจุดตัดระหว่างเส้นจากจุดกลางไปในทิศทางที่กำหนดกับขอบของพื้นที่หลีกเลี่ยง
        let intersectionPoint: Coordinate | null = null;
        let minDistance = Infinity;

        for (let i = 0; i < exclusionCoordinates.length; i++) {
            const j = (i + 1) % exclusionCoordinates.length;
            const segmentStart = exclusionCoordinates[i];
            const segmentEnd = exclusionCoordinates[j];

            const intersection = findLineSegmentIntersection(
                center,
                {
                    lat: center.lat + directionVector.lat * 0.01, // ขยายเส้นออกไปเล็กน้อย
                    lng: center.lng + directionVector.lng * 0.01
                },
                segmentStart,
                segmentEnd
            );

            if (intersection) {
                const distance = calculateDistanceBetweenPoints(center, intersection);
                if (distance < minDistance) {
                    minDistance = distance;
                    intersectionPoint = intersection;
                }
            }
        }

        return intersectionPoint;
    } catch (error) {
        console.error('Error calculating point on exclusion boundary:', error);
        return null;
    }
};

// ฟังก์ชันช่วยหาจุดตัดระหว่างเส้นสองเส้น
const findLineSegmentIntersection = (
    line1Start: Coordinate,
    line1End: Coordinate,
    line2Start: Coordinate,
    line2End: Coordinate
): Coordinate | null => {
    try {
        const x1 = line1Start.lat;
        const y1 = line1Start.lng;
        const x2 = line1End.lat;
        const y2 = line1End.lng;
        const x3 = line2Start.lat;
        const y3 = line2Start.lng;
        const x4 = line2End.lat;
        const y4 = line2End.lng;

        const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        
        if (Math.abs(denominator) < 1e-10) {
            return null; // เส้นขนานกัน
        }

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

        // ตรวจสอบว่าจุดตัดอยู่ในช่วงของทั้งสองเส้น
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                lat: x1 + t * (x2 - x1),
                lng: y1 + t * (y2 - y1)
            };
        }

        return null;
    } catch (error) {
        console.error('Error finding line segment intersection:', error);
        return null;
    }
};

// ฟังก์ชันช่วยคำนวณจุดตัดกับพื้นที่หลัก
const calculateIntersectionWithMainArea = (
    startPoint: Coordinate,
    angle: number,
    mainArea: Coordinate[]
): Coordinate | null => {
    if (mainArea.length < 3) return null;

    try {
        // แปลงมุมเป็นเรเดียน
        const angleRad = (angle * Math.PI) / 180;
        
        // คำนวณเวกเตอร์ทิศทาง
        const directionVector = {
            lat: Math.cos(angleRad),
            lng: Math.sin(angleRad)
        };

        // สร้างจุดปลายของเส้น (ขยายออกไปไกล)
        const endPoint = {
            lat: startPoint.lat + directionVector.lat * 0.1, // ขยายเส้นออกไป 0.1 องศา
            lng: startPoint.lng + directionVector.lng * 0.1
        };

        // หาจุดตัดกับขอบของพื้นที่หลัก
        let intersectionPoint: Coordinate | null = null;
        let minDistance = Infinity;

        for (let i = 0; i < mainArea.length; i++) {
            const j = (i + 1) % mainArea.length;
            const segmentStart = mainArea[i];
            const segmentEnd = mainArea[j];

            const intersection = findLineSegmentIntersection(
                startPoint,
                endPoint,
                segmentStart,
                segmentEnd
            );

            if (intersection) {
                const distance = calculateDistanceBetweenPoints(startPoint, intersection);
                if (distance < minDistance) {
                    minDistance = distance;
                    intersectionPoint = intersection;
                }
            }
        }

        return intersectionPoint;
    } catch (error) {
        console.error('Error calculating intersection with main area:', error);
        return null;
    }
};

// ฟังก์ชันช่วยสร้าง ID ที่ไม่ซ้ำกัน
const generateUniqueId = (prefix: string): string => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const navigateToPlanner = (): void => {
    router.visit('/horticulture/planner');
};

export const navigateToResults = (): void => {
    router.visit('/horticulture/results');
};

