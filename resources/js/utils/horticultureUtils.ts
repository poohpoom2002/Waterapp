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
    selectedPlantType?: PlantData; // [FIX] เพิ่ม property นี้
    branchPipeSettings?: BranchPipeSettings;
    createdAt: string;
    updatedAt: string;
}

// ข้อมูลโครงการที่ต้องการสำหรับรายงาน
export interface ProjectSummaryData {
    // ข้อมูลโดยรวม
    totalAreaInRai: number; // พื้นที่รวมเป็นไร่
    totalZones: number; // จำนวนโซน
    totalPlants: number; // จำนวนต้นไม้ทั้งหมด
    totalWaterNeedPerSession: number; // ปริมาณน้ำต่อครั้ง (ลิตร)
    waterPerPlant: number; // ปริมาณน้ำต่อต้น (ลิตร)

    // ข้อมูลท่อ
    mainPipes: {
        longest: number; // ท่อเมนที่ยาวที่สุด (เมตร)
        totalLength: number; // ความยาวรวมท่อเมน (เมตร)
    };
    subMainPipes: {
        longest: number; // ท่อเมนรองที่ยาวที่สุด (เมตร)
        totalLength: number; // ความยาวรวมท่อเมนรอง (เมตร)
    };
    branchPipes: {
        longest: number; // ท่อย่อยที่ยาวที่สุด (เมตร)
        totalLength: number; // ความยาวรวมท่อย่อย (เมตร)
    };
    longestPipesCombined: number; // ท่อที่ยาวที่สุดรวมกัน (เมตร)

    // ข้อมูลแยกโซน (ถ้ามี)
    zoneDetails: ZoneSummaryData[];
}

export interface ZoneSummaryData {
    zoneId: string;
    zoneName: string;
    areaInRai: number; // พื้นที่โซนเป็นไร่
    plantCount: number; // จำนวนต้นไม้ในโซน
    waterNeedPerSession: number; // ปริมาณน้ำโซนต่อครั้ง (ลิตร)
    waterPerPlant: number; // ปริมาณน้ำต่อต้น (ลิตร)
    plantData?: PlantData; // เพิ่มข้อมูลพืช

    // ข้อมูลท่อในโซน
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

// Utility Functions
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

// Main function to calculate project summary
export const calculateProjectSummary = (
    projectData: HorticultureProjectData
): ProjectSummaryData => {
    console.log('📊 Calculating project summary...');

    // คำนวณข้อมูลโดยรวม
    const totalAreaInRai = projectData.totalArea / 1600; // แปลงจากตร.ม. เป็นไร่
    const totalZones = projectData.useZones ? projectData.zones.length : 1;
    const totalPlants = projectData.plants?.length || 0;
    const totalWaterNeedPerSession =
        projectData.plants?.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0) || 0;
    const waterPerPlant = totalPlants > 0 ? totalWaterNeedPerSession / totalPlants : 0;

    // คำนวณข้อมูลท่อเมน
    const mainPipeLengths = projectData.mainPipes?.map((pipe) => pipe.length) || [];
    const mainPipesData = {
        longest: mainPipeLengths.length > 0 ? Math.max(...mainPipeLengths) : 0,
        totalLength: mainPipeLengths.reduce((sum, length) => sum + length, 0),
    };

    // คำนวณข้อมูลท่อเมนรอง
    const subMainPipeLengths = projectData.subMainPipes?.map((pipe) => pipe.length) || [];
    const subMainPipesData = {
        longest: subMainPipeLengths.length > 0 ? Math.max(...subMainPipeLengths) : 0,
        totalLength: subMainPipeLengths.reduce((sum, length) => sum + length, 0),
    };

    // คำนวณข้อมูลท่อย่อย
    const allBranchPipes =
        projectData.subMainPipes?.flatMap((subMain) => subMain.branchPipes || []) || [];
    const branchPipeLengths = allBranchPipes.map((pipe) => pipe.length);
    const branchPipesData = {
        longest: branchPipeLengths.length > 0 ? Math.max(...branchPipeLengths) : 0,
        totalLength: branchPipeLengths.reduce((sum, length) => sum + length, 0),
    };

    // คำนวณท่อที่ยาวที่สุดรวมกัน
    const longestPipesCombined =
        mainPipesData.longest + subMainPipesData.longest + branchPipesData.longest;

    // คำนวณข้อมูลแยกโซน
    const zoneDetails: ZoneSummaryData[] = [];

    if (projectData.useZones && projectData.zones && projectData.zones.length > 0) {
        // โหมดหลายโซน
        projectData.zones.forEach((zone) => {
            // หาต้นไม้ในโซนนี้
            const plantsInZone =
                projectData.plants?.filter(
                    (plant) =>
                        (plant.zoneId && plant.zoneId === zone.id) ||
                        (!plant.zoneId && isPointInPolygon(plant.position, zone.coordinates))
                ) || [];

            // หาท่อในโซนนี้
            const zoneSubMainPipes =
                projectData.subMainPipes?.filter((pipe) => pipe.zoneId === zone.id) || [];
            const zoneBranchPipes = zoneSubMainPipes.flatMap(
                (subMain) => subMain.branchPipes || []
            );

            // หาท่อเมนที่ไปยังโซนนี้
            const zoneMainPipes =
                projectData.mainPipes?.filter((pipe) => pipe.toZone === zone.id) || [];

            // คำนวณความยาวท่อแต่ละประเภทในโซน
            const mainPipeLengthsInZone = zoneMainPipes.map((pipe) => pipe.length);
            const subMainPipeLengthsInZone = zoneSubMainPipes.map((pipe) => pipe.length);
            const branchPipeLengthsInZone = zoneBranchPipes.map((pipe) => pipe.length);
            const waterNeedInZone = plantsInZone.reduce(
                (sum, plant) => sum + plant.plantData.waterNeed,
                0
            );

            const zoneData: ZoneSummaryData = {
                zoneId: zone.id,
                zoneName: zone.name,
                areaInRai: zone.area / 1600, // แปลงเป็นไร่
                plantCount: plantsInZone.length,
                waterNeedPerSession: waterNeedInZone,
                waterPerPlant: plantsInZone.length > 0 ? waterNeedInZone / plantsInZone.length : 0,
                plantData: zone.plantData, // เพิ่มข้อมูลพืช
                mainPipesInZone: {
                    longest:
                        mainPipeLengthsInZone.length > 0 ? Math.max(...mainPipeLengthsInZone) : 0,
                    totalLength: mainPipeLengthsInZone.reduce((sum, length) => sum + length, 0),
                },
                subMainPipesInZone: {
                    longest:
                        subMainPipeLengthsInZone.length > 0
                            ? Math.max(...subMainPipeLengthsInZone)
                            : 0,
                    totalLength: subMainPipeLengthsInZone.reduce((sum, length) => sum + length, 0),
                },
                branchPipesInZone: {
                    longest:
                        branchPipeLengthsInZone.length > 0
                            ? Math.max(...branchPipeLengthsInZone)
                            : 0,
                    totalLength: branchPipeLengthsInZone.reduce((sum, length) => sum + length, 0),
                },
            };

            zoneDetails.push(zoneData);
        });
    } else {
        // โหมดโซนเดียว
        const plantDataForSingleZone =
            projectData.selectedPlantType || projectData.plants?.[0]?.plantData;
        const waterPerPlantSingleZone = plantDataForSingleZone?.waterNeed || 0;

        console.log('🔍 Debug single zone plant data:', {
            selectedPlantType: projectData.selectedPlantType,
            firstPlantData: projectData.plants?.[0]?.plantData,
            plantDataForSingleZone,
            waterPerPlantSingleZone,
        });

        const singleZoneData: ZoneSummaryData = {
            zoneId: 'main-area',
            zoneName: 'พื้นที่หลัก',
            areaInRai: totalAreaInRai,
            plantCount: totalPlants,
            waterNeedPerSession: totalWaterNeedPerSession,
            waterPerPlant:
                totalPlants > 0 ? totalWaterNeedPerSession / totalPlants : waterPerPlantSingleZone,
            plantData: plantDataForSingleZone, // เพิ่มข้อมูลพืช
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

    console.log('✅ Project summary calculated:', summary);
    return summary;
};

// Formatting functions
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

// Storage functions
export const STORAGE_KEY = 'horticultureIrrigationData';

export const saveProjectData = (data: HorticultureProjectData): boolean => {
    try {
        data.updatedAt = new Date().toISOString();
        data.version = '3.2.0';
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('✅ Project data saved successfully');
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
            console.log('✅ Project data loaded successfully');
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
        console.log('✅ Project data cleared');
    } catch (error) {
        console.error('❌ Error clearing project data:', error);
    }
};

// Navigation functions
export const navigateToPlanner = (): void => {
    router.visit('/horticulture/planner');
};

export const navigateToResults = (): void => {
    router.visit('/horticulture/results');
};
