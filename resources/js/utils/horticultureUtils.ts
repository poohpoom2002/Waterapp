/* eslint-disable @typescript-eslint/no-explicit-any */
import { router } from '@inertiajs/react';
import { findPipeZoneImproved } from './horticultureProjectStats';

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
    lateralPipes?: {
        id: string;
        coordinates: Coordinate[];
        length: number;
        plants: PlantLocation[];
        placementMode: 'over_plants' | 'between_plants';
        totalFlowRate: number;
        connectionPoint: Coordinate;
        emitterLines?: {
            id: string;
            lateralPipeId: string;
            plantId: string;
            coordinates: Coordinate[];
            length: number;
            diameter: number;
            emitterType?: string;
        }[];
    }[]; // เพิ่มสำหรับท่อย่อย
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
        count: number;
        longest: number;
        totalLength: number;
    };
    subMainPipes: {
        count: number;
        longest: number;
        totalLength: number;
    };
    branchPipes: {
        count: number;
        longest: number;
        totalLength: number;
    };
    emitterPipes: {
        count: number;
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
        count: number;
        longest: number;
        totalLength: number;
    };
    subMainPipesInZone: {
        count: number;
        longest: number;
        totalLength: number;
    };
    branchPipesInZone: {
        count: number;
        longest: number;
        totalLength: number;
    };
    emitterPipesInZone: {
        count: number;
        longest: number;
        totalLength: number;
    };
}

// Enhanced project data interface with additional features
export interface EnhancedProjectData extends HorticultureProjectData {
    irrigationZones?: IrrigationZoneExtended[];
    lateralPipes?: LateralPipe[];
    headLossResults?: HeadLossResult[];
    sprinklerConfig?: SprinklerConfig;
    plantRotation?: number;
    autoZoneConfig?: {
        numberOfZones: number;
        balanceWaterNeed: boolean;
        paddingMeters: number;
        useVoronoi: boolean;
    };
}

// Extended irrigation zone interface
export interface IrrigationZoneExtended {
    id: string;
    name: string;
    coordinates: Coordinate[];
    plants: PlantLocation[];
    totalWaterNeed: number;
    color: string;
    layoutIndex: number;
    area?: number;
    plantSpacing?: number;
    rowSpacing?: number;
}

// Lateral pipe interface
export interface LateralPipe {
    id: string;
    coordinates: Coordinate[];
    length: number;
    plants: PlantLocation[];
    placementMode: 'over_plants' | 'between_plants';
    totalFlowRate: number;
    connectionPoint: Coordinate;
    intersectionData?: {
        subMainPipeId: string;
        point: Coordinate;
        segmentIndex: number;
    };
    emitterLines?: {
        id: string;
        lateralPipeId: string;
        plantId: string;
        coordinates: Coordinate[];
        length: number;
        diameter: number;
        emitterType?: string;
    }[];
}

// Best pipe information interface for analysis
export interface BestPipeInfo {
    id: string;
    length: number;
    count: number; // จำนวนต้นไม้ หรือท่อที่เชื่อม
    waterFlowRate: number; // ลิตร/นาที
    details?: any; // ข้อมูลเพิ่มเติม
}

// Head loss result interface
export interface HeadLossResult {
    pipeId: string;
    pipeType: 'mainPipe' | 'subMainPipe' | 'branchPipe';
    zoneName: string;
    zoneId: string;
    pipeName?: string;
    lossCoefficient: number;
    pipeLength: number;
    correctionFactor: number;
    headLoss: number;
    calculatedAt: string;
}

// Sprinkler configuration interface
export interface SprinklerConfig {
    flowRatePerMinute: number;
    pressureBar: number;
    radiusMeters: number;
    createdAt: string;
    updatedAt: string;
}
// Zone color constants for display
// 🎨 ระบบสีโซนใหม่ที่รองรับ 20 โซน และไม่ซ้ำกับสีพื้นที่อื่น
// หลีกเลี่ยงสี: #22C55E (พื้นที่หลัก), #F59E0B, #EF4444, #3B82F6, #6B7280, #8B5CF6 (พื้นที่หลีกเลี่ยง)
// 🌈 5 โซนแรกใช้สีที่แตกต่างกันมากที่สุด
export const ZONE_COLORS = [
    '#FF6B6B', // สีแดงสด - โซน 1
    '#9B59B6', // สีม่วงเข้ม - โซน 2 (เปลี่ยนจากเขียวฟ้า)
    '#F39C12', // สีส้มทอง - โซน 3 (เปลี่ยนจากฟ้าอ่อน)
    '#1ABC9C', // สีเขียวเทอร์ควอยซ์ - โซน 4 (เปลี่ยนจากเขียวมิ้นต์)
    '#3498DB', // สีฟ้าสด - โซน 5 (เปลี่ยนจากเหลืองอ่อน)
    '#DDA0DD', // สีม่วงอ่อน - โซน 6
    '#98D8C8', // สีเขียวอ่อน - โซน 7
    '#F7DC6F', // สีเหลืองทอง - โซน 8
    '#BB8FCE', // สีม่วงลาเวนเดอร์ - โซน 9
    '#85C1E9', // สีฟ้าใส - โซน 10
    '#F8C471', // สีส้มอ่อน - โซน 11
    '#82E0AA', // สีเขียวใส - โซน 12
    '#F1948A', // สีแดงโรส - โซน 13
    '#AED6F1', // สีฟ้าเบบี้ - โซน 14
    '#D2B4DE', // สีม่วงพาสเทล - โซน 15
    '#F9E79F', // สีเหลืองครีม - โซน 16
    '#A9DFBF', // สีเขียวพาสเทล - โซน 17
    '#FAD7A0', // สีส้มครีม - โซน 18
    '#D5A6BD', // สีชมพูเก่า - โซน 19
    '#B2DFDB', // สีเขียวทะเล - โซน 20
];

// Exclusion area color constants
export const EXCLUSION_COLORS = {
    building: '#F59E0B',
    powerplant: '#EF4444',
    river: '#3B82F6',
    road: '#6B7280',
    other: '#8B5CF6',
};

/**
 * Get zone color by index
 */
export const getZoneColor = (index: number): string => {
    return ZONE_COLORS[index % ZONE_COLORS.length];
};

/**
 * Get exclusion type name in Thai
 */
export const getExclusionTypeName = (type: string, t: (key: string) => string): string => {
    switch (type) {
        case 'building':
            return t('สิ่งก่อสร้าง');
        case 'powerplant':
            return t('ห้องควบคุม');
        case 'river':
            return t('แหล่งน้ำ');
        case 'road':
            return t('ถนน');
        case 'other':
            return t('อื่นๆ');
        default:
            return t('พื้นที่หลีกเลี่ยง');
    }
};

/**
 * Get polygon center coordinate
 */
export const getPolygonCenter = (coordinates: Coordinate[]): Coordinate => {
    if (coordinates.length === 0) return { lat: 0, lng: 0 };

    const totalLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0);
    const totalLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0);

    return {
        lat: totalLat / coordinates.length,
        lng: totalLng / coordinates.length,
    };
};

/**
 * Check if two points are close within threshold
 */
export const isPointsClose = (point1: Coordinate, point2: Coordinate, threshold: number = 5): boolean => {
    const distance = calculateDistanceBetweenPoints(point1, point2);
    return distance <= threshold;
};

/**
 * Find closest point on line segment
 */
export const findClosestPointOnLineSegmentExtended = (
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

    if (lenSq === 0) return lineStart;

    const param = dot / lenSq;

    if (param < 0) {
        return lineStart;
    } else if (param > 1) {
        return lineEnd;
    } else {
        return {
            lat: lineStart.lat + param * C,
            lng: lineStart.lng + param * D,
        };
    }
};

/**
 * Check if coordinate is in zone/polygon
 */
export const isCoordinateInZone = (coordinate: Coordinate, zone: any): boolean => {
    if (!zone || !zone.coordinates || zone.coordinates.length < 3) return false;
    return isPointInPolygon(coordinate, zone.coordinates);
};

/**
 * Calculate water flow rate for plants
 */
export const calculateWaterFlowRate = (plantCount: number, sprinklerConfig: any): number => {
    if (!sprinklerConfig || !sprinklerConfig.flowRatePerMinute) return plantCount * 2.5; // default
    return plantCount * sprinklerConfig.flowRatePerMinute;
};

/**
 * Distance from point to line segment
 */
export const distanceFromPointToLineSegment = (
    point: Coordinate,
    lineStart: Coordinate,
    lineEnd: Coordinate
): number => {
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
        return calculateDistanceBetweenPoints(point, lineStart);
    }
    
    const t = Math.max(0, Math.min(1, dot / lenSq));
    
    const projection = {
        lat: lineStart.lat + t * C,
        lng: lineStart.lng + t * D
    };
    
    return calculateDistanceBetweenPoints(point, projection);
};

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
        count: projectData.mainPipes?.length || 0,
        longest: mainPipeLengths.length > 0 ? Math.max(...mainPipeLengths) : 0,
        totalLength: mainPipeLengths.reduce((sum, length) => sum + length, 0),
    };

    const subMainPipeLengths = projectData.subMainPipes?.map((pipe) => pipe.length) || [];
    const subMainPipesData = {
        count: projectData.subMainPipes?.length || 0,
        longest: subMainPipeLengths.length > 0 ? Math.max(...subMainPipeLengths) : 0,
        totalLength: subMainPipeLengths.reduce((sum, length) => sum + length, 0),
    };

    // รวม branchPipes และ lateralPipes เข้าด้วยกัน
    const allBranchPipes =
        projectData.subMainPipes?.flatMap((subMain) => subMain.branchPipes || []) || [];
    const allLateralPipes = projectData.lateralPipes || [];
    
    const branchPipeLengths = allBranchPipes.map((pipe) => pipe.length);
    const lateralPipeLengths = allLateralPipes.map((pipe) => pipe.length);
    const combinedPipeLengths = [...branchPipeLengths, ...lateralPipeLengths];
    
    const branchPipesData = {
        count: allBranchPipes.length + allLateralPipes.length,
        longest: combinedPipeLengths.length > 0 ? Math.max(...combinedPipeLengths) : 0,
        totalLength: combinedPipeLengths.reduce((sum, length) => sum + length, 0),
    };
    


    // คำนวณ emitter pipes (ท่อย่อยแยก) จาก lateralPipes.emitterLines
    const allEmitterPipes = allLateralPipes.flatMap((lateral) => lateral.emitterLines || []);
    const emitterPipeLengths = allEmitterPipes.map((emitter) => emitter.length);
    const emitterPipesData = {
        count: allEmitterPipes.length,
        longest: emitterPipeLengths.length > 0 ? Math.max(...emitterPipeLengths) : 0,
        totalLength: emitterPipeLengths.reduce((sum, length) => sum + length, 0),
    };
    


    const longestPipesCombined =
        mainPipesData.longest + subMainPipesData.longest + branchPipesData.longest + emitterPipesData.longest;

    const zoneDetails: ZoneSummaryData[] = [];

    // ตรวจสอบว่ามี zones แบบปกติ (ที่สร้างเอง) หรือ irrigationZones (อัตโนมัติ) หรือไม่
    if (projectData.zones && projectData.zones.length > 0 && projectData.useZones) {
        // กรณีมีการแบ่งโซนแบบปกติ - แยกท่อตามโซนจริงๆ
        for (const zone of projectData.zones) {
            const plantsInZone = projectData.plants?.filter(plant => plant.zoneId === zone.id) || [];
            const waterNeedInZone = plantsInZone.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0);
            const waterPerPlantInZone = plantsInZone.length > 0 ? waterNeedInZone / plantsInZone.length : 0;

            // แยกท่อตามโซน
            const mainPipesInZone = projectData.mainPipes?.filter(pipe => pipe.toZone === zone.id) || [];
            const subMainPipesInZone = projectData.subMainPipes?.filter(pipe => pipe.zoneId === zone.id) || [];
            const branchPipesInZone = subMainPipesInZone.flatMap(subMain => subMain.branchPipes || []);
            
            // lateral pipes: เอาท่อที่ plants ส่วนใหญ่อยู่ในโซนนี้
            const lateralPipesInZone = projectData.lateralPipes?.filter(lateral => {
                const plantsInThisZone = lateral.plants.filter(plant => {
                    const fullPlant = projectData.plants?.find(p => p.id === plant.id);
                    return fullPlant?.zoneId === zone.id;
                });
                return plantsInThisZone.length > lateral.plants.length / 2; // majority voting
            }) || [];

            // emitter pipes: จาก lateral pipes ในโซนนี้ - เฉพาะโหมด 'between_plants' เท่านั้น
            const emitterPipesInZone = lateralPipesInZone
                .filter(lateral => lateral.placementMode === 'between_plants') // กรองเฉพาะ between_plants
                .flatMap(lateral => lateral.emitterLines || []);

            const mainPipeLengthsInZone = mainPipesInZone.map(pipe => pipe.length);
            const mainPipesDataInZone = {
                count: mainPipesInZone.length,
                longest: mainPipeLengthsInZone.length > 0 ? Math.max(...mainPipeLengthsInZone) : 0,
                totalLength: mainPipeLengthsInZone.reduce((sum, length) => sum + length, 0),
            };

            const subMainPipeLengthsInZone = subMainPipesInZone.map(pipe => pipe.length);
            const subMainPipesDataInZone = {
                count: subMainPipesInZone.length,
                longest: subMainPipeLengthsInZone.length > 0 ? Math.max(...subMainPipeLengthsInZone) : 0,
                totalLength: subMainPipeLengthsInZone.reduce((sum, length) => sum + length, 0),
            };

            const branchPipeLengthsInZone = branchPipesInZone.map(pipe => pipe.length);
            const lateralPipeLengthsInZone = lateralPipesInZone.map(pipe => pipe.length);
            const combinedBranchLengthsInZone = [...branchPipeLengthsInZone, ...lateralPipeLengthsInZone];
            const branchPipesDataInZone = {
                count: branchPipesInZone.length + lateralPipesInZone.length,
                longest: combinedBranchLengthsInZone.length > 0 ? Math.max(...combinedBranchLengthsInZone) : 0,
                totalLength: combinedBranchLengthsInZone.reduce((sum, length) => sum + length, 0),
            };

            const emitterPipeLengthsInZone = emitterPipesInZone.map(pipe => pipe.length);
            const emitterPipesDataInZone = {
                count: emitterPipesInZone.length,
                longest: emitterPipeLengthsInZone.length > 0 ? Math.max(...emitterPipeLengthsInZone) : 0,
                totalLength: emitterPipeLengthsInZone.reduce((sum, length) => sum + length, 0),
            };

            const zoneData: ZoneSummaryData = {
                zoneId: zone.id,
                zoneName: zone.name,
                areaInRai: zone.area / 1600, // แปลง ตร.ม. เป็น ไร่
                plantCount: plantsInZone.length,
                waterNeedPerSession: waterNeedInZone,
                waterPerPlant: waterPerPlantInZone,
                plantData: zone.plantData,
                mainPipesInZone: mainPipesDataInZone,
                subMainPipesInZone: subMainPipesDataInZone,
                branchPipesInZone: branchPipesDataInZone,
                emitterPipesInZone: emitterPipesDataInZone,
            };

            zoneDetails.push(zoneData);
        }
        

    } else if (projectData.irrigationZones && projectData.irrigationZones.length > 0) {
        // กรณีมี irrigationZones (โซนอัตโนมัติ) - แยกท่อตามโซนจริงๆ

        
        for (const irrZone of projectData.irrigationZones) {

            
            const plantsInZone = projectData.plants?.filter(plant => plant.zoneId === irrZone.id) || [];

            
            const waterNeedInZone = plantsInZone.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0);
            const waterPerPlantInZone = plantsInZone.length > 0 ? waterNeedInZone / plantsInZone.length : 0;

            // แยกท่อตามโซน irrigationZones - ใช้การหาท่อจริงๆ ในโซน
            
            // Import findPipeEndZone function (assume it's available or create a simplified version) - ไม่ใช้แล้ว
            // const findPipeEndZoneLocal = (pipe: any, zones: any[], irrigationZones: any[]) => {
            //     if (!pipe.coordinates || pipe.coordinates.length === 0) return null;
            //     
            //     const endPoint = pipe.coordinates[pipe.coordinates.length - 1];
            //     
            //     // Check irrigationZones first
            //     for (const zone of irrigationZones) {
            //         if (zone.coordinates && zone.coordinates.length > 0) {
            //             const isInside = isPointInPolygon(endPoint, zone.coordinates);
            //             if (isInside) return zone.id;
            //         }
            //     }
            //     
            //     return null;
            // };
            
            // ท่อเมน: หาท่อจริงๆ ที่อยู่ในโซนนี้
            const allMainPipes = projectData.mainPipes || [];
            const zoneMainPipes = allMainPipes.filter(mainPipe => {
                // 🔧 ใช้ findPipeZoneImproved แทน findPipeEndZoneLocal เพื่อความแม่นยำ
                const mainZoneId = findPipeZoneImproved(mainPipe, projectData.zones || [], projectData.irrigationZones || []);
                return mainZoneId === irrZone.id;
            });
            const mainPipeLengthInZone = zoneMainPipes.reduce((sum, pipe) => sum + pipe.length, 0);
            
            // ท่อเมนรอง: หาท่อจริงๆ ที่อยู่ในโซนนี้
            const allSubMainPipes = projectData.subMainPipes || [];
            const zoneSubMainPipes = allSubMainPipes.filter(subMainPipe => {
                // 🔧 ใช้ findPipeZoneImproved แทน findPipeEndZoneLocal เพื่อความแม่นยำ
                const subMainZoneId = findPipeZoneImproved(subMainPipe, projectData.zones || [], projectData.irrigationZones || []);
                return subMainZoneId === irrZone.id;
            });
            const subMainPipeLengthInZone = zoneSubMainPipes.reduce((sum, pipe) => sum + pipe.length, 0);
            
            // Branch pipes: ดึงจาก subMainPipes ที่อยู่ในโซนนี้
            const branchPipesInZone = zoneSubMainPipes.flatMap(subMain => subMain.branchPipes || []);
            const branchPipeLengthInZone = branchPipesInZone.reduce((sum, pipe) => sum + pipe.length, 0);
            


            
            // lateral pipes: เอาท่อที่ plants ส่วนใหญ่อยู่ในโซนนี้
            const lateralPipesInZone = projectData.lateralPipes?.filter(lateral => {
                const plantsInThisZone = lateral.plants.filter(plant => {
                    const fullPlant = projectData.plants?.find(p => p.id === plant.id);
                    return fullPlant?.zoneId === irrZone.id;
                });
                const majorityVote = plantsInThisZone.length > lateral.plants.length / 2;

                return majorityVote;
            }) || [];
            


            // emitter pipes: จาก lateral pipes ในโซนนี้ - เฉพาะโหมด 'between_plants' เท่านั้น
            const emitterPipesInZone = lateralPipesInZone
                .filter(lateral => lateral.placementMode === 'between_plants') // กรองเฉพาะ between_plants
                .flatMap(lateral => lateral.emitterLines || []);

            // ใช้ข้อมูลจริงจากท่อที่อยู่ในโซนนี้
            const mainPipesDataInZone = {
                count: zoneMainPipes.length,
                longest: zoneMainPipes.length > 0 ? Math.max(...zoneMainPipes.map(p => p.length)) : 0,
                totalLength: mainPipeLengthInZone,
            };

            const subMainPipesDataInZone = {
                count: zoneSubMainPipes.length,
                longest: zoneSubMainPipes.length > 0 ? Math.max(...zoneSubMainPipes.map(p => p.length)) : 0,
                totalLength: subMainPipeLengthInZone,
            };

            // สำหรับ branch pipes: รวม branch pipes จากท่อเมนรองในโซน + lateral pipes ที่อยู่ในโซนนี้
            const lateralPipeLengthsInZone = lateralPipesInZone.map(pipe => pipe.length);
            const totalLateralLengthInZone = lateralPipeLengthsInZone.reduce((sum, length) => sum + length, 0);
            
            const branchPipesDataInZone = {
                count: branchPipesInZone.length + lateralPipesInZone.length,
                longest: Math.max(
                    branchPipesInZone.length > 0 ? Math.max(...branchPipesInZone.map(p => p.length)) : 0,
                    lateralPipeLengthsInZone.length > 0 ? Math.max(...lateralPipeLengthsInZone) : 0
                ),
                totalLength: branchPipeLengthInZone + totalLateralLengthInZone,
            };

            const emitterPipeLengthsInZone = emitterPipesInZone.map(pipe => pipe.length);
            const emitterPipesDataInZone = {
                count: emitterPipesInZone.length,
                longest: emitterPipeLengthsInZone.length > 0 ? Math.max(...emitterPipeLengthsInZone) : 0,
                totalLength: emitterPipeLengthsInZone.reduce((sum, length) => sum + length, 0),
            };

            // คำนวณพื้นที่จากจำนวนต้นไม้ (ประมาณการ)
            const estimatedAreaInRai = plantsInZone.length * 0.01; // ประมาณ 100 ต้นต่อไร่

            const zoneData: ZoneSummaryData = {
                zoneId: irrZone.id,
                zoneName: irrZone.name || `โซน ${irrZone.id}`,
                areaInRai: estimatedAreaInRai,
                plantCount: plantsInZone.length,
                waterNeedPerSession: waterNeedInZone,
                waterPerPlant: waterPerPlantInZone,
                plantData: projectData.selectedPlantType || plantsInZone[0]?.plantData,
                mainPipesInZone: mainPipesDataInZone,
                subMainPipesInZone: subMainPipesDataInZone,
                branchPipesInZone: branchPipesDataInZone,
                emitterPipesInZone: emitterPipesDataInZone,
            };

            zoneDetails.push(zoneData);
        }
        

    } else {
    // กรณีไม่มีการแบ่งโซนหรือใช้พื้นที่เดียว
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
            emitterPipesInZone: emitterPipesData,
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
        emitterPipes: emitterPipesData,
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

/**
 * ฟังก์ชันหาจุดที่ใกล้ที่สุดบนเส้นตรง (ใช้ร่วมกัน)
 */
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

/**
 * ฟังก์ชัน snap ปลายท่อ main ไปหาท่อ sub main ตามกฎใหม่
 * กฎ: 
 * 1. ท่อ sub main ห้ามขยับทุกกรณี
 * 2. ใช้เฉพาะปลายท่อ main ในการ snap
 * 3. ถ้าปลายท่อ sub main อยู่ในระยะ ≤ 1 เมตร ให้ snap ไปหาปลายท่อ sub main
 * 4. ถ้าไม่ ให้ snap ไปหาจุดที่ใกล้ที่สุดบนท่อ sub main
 */
export const snapMainPipeEndToSubMainPipe = (
    mainPipes: MainPipe[],
    subMainPipeCoordinates: Coordinate[]
): { mainPipes: MainPipe[], snapped: boolean } => {
    if (!mainPipes || mainPipes.length === 0 || !subMainPipeCoordinates || subMainPipeCoordinates.length === 0) {
        return { mainPipes, snapped: false };
    }

    const SNAP_THRESHOLD = 5.0; // เปลี่ยนเป็น 5 เมตร ตามที่ผู้ใช้ต้องการ
    let hasSnapped = false;
    
    const updatedMainPipes = mainPipes.map(mainPipe => {
        if (!mainPipe.coordinates || mainPipe.coordinates.length === 0) {
            return mainPipe;
        }

        const mainPipeEnd = mainPipe.coordinates[mainPipe.coordinates.length - 1];
        let closestPoint = mainPipeEnd;
        let minDistance = Infinity;
        let snapType = 'none'; // 'endpoint' หรือ 'midpoint'

        // ขั้นตอน 1: หาจุดที่ใกล้ที่สุดบนท่อ sub main ทั้งหมด (endpoints และ midpoints)
        
        // ตรวจสอบปลายท่อ sub main (จุดเริ่มต้นและจุดปลาย)
        const subMainStart = subMainPipeCoordinates[0];
        const subMainEnd = subMainPipeCoordinates[subMainPipeCoordinates.length - 1];
        
        const distanceToStart = calculateDistanceBetweenPoints(mainPipeEnd, subMainStart);
        const distanceToEnd = calculateDistanceBetweenPoints(mainPipeEnd, subMainEnd);
        
        // เช็คระยะห่างไปยังปลายท่อ sub main
        if (distanceToStart < minDistance) {
            minDistance = distanceToStart;
            closestPoint = subMainStart;
            snapType = 'endpoint';
        }
        
        if (distanceToEnd < minDistance) {
            minDistance = distanceToEnd;
            closestPoint = subMainEnd;
            snapType = 'endpoint';
        }

        // ขั้นตอน 2: ตรวจสอบจุดที่ใกล้ที่สุดบนท่อ sub main (midpoints)
        for (let i = 0; i < subMainPipeCoordinates.length - 1; i++) {
            const lineStart = subMainPipeCoordinates[i];
            const lineEnd = subMainPipeCoordinates[i + 1];
            
            const closestPointOnLine = findClosestPointOnLineSegment(mainPipeEnd, lineStart, lineEnd);
            const distanceToLine = calculateDistanceBetweenPoints(mainPipeEnd, closestPointOnLine);
            
            if (distanceToLine < minDistance) {
                minDistance = distanceToLine;
                closestPoint = closestPointOnLine;
                snapType = 'midpoint';
            }
        }

        // ขั้นตอน 3: ทำการ snap ถ้าพบจุดที่เหมาะสม
        if (minDistance <= SNAP_THRESHOLD && snapType !== 'none') {
            const updatedCoordinates = [...mainPipe.coordinates];
            updatedCoordinates[updatedCoordinates.length - 1] = closestPoint;
            
            hasSnapped = true;
            
            // แสดงข้อความแจ้งเตือน
            if (typeof window !== 'undefined' && (window as any).showSnapNotification) {
                const snapMessage = snapType === 'endpoint' 
                    ? 'ปลายท่อเมนเชื่อมต่อกับปลายท่อเมนรองสำเร็จ' 
                    : 'ปลายท่อเมนเชื่อมต่อกับท่อเมนรองสำเร็จ';
                (window as any).showSnapNotification(snapMessage);
            }
            
            return {
                ...mainPipe,
                coordinates: updatedCoordinates,
                length: calculatePipeLength(updatedCoordinates)
            };
        }

        return mainPipe;
    });

    return { mainPipes: updatedMainPipes, snapped: hasSnapped };
};

