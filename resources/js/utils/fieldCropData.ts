import { router } from '@inertiajs/react';

export interface IrrigationPosition {
    lat: number;
    lng: number;
    id: string;
    type: 'sprinkler' | 'mini_sprinkler' | 'micro_spray' | 'drip_tape';
    radius?: number;
}

export interface WaterSource {
    lat: number;
    lng: number;
    type: 'tap' | 'pump';
    id?: string;
}

export interface IrrigationInfo {
    id: number;
    name: string;
    radius: number;
    water_flow: number;
    type: 'sprinkler' | 'mini_sprinkler' | 'micro_spray' | 'drip_tape';
}

export interface PipeConnection {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
    length: number;
    from_type: 'source' | 'irrigation';
    to_type: 'irrigation';
    id: string;
    type: 'main' | 'submain' | 'lateral';
}

export interface ZoneInfo {
    id: string;
    name: string;
    coordinates: Array<{ lat: number; lng: number }>;
    color: string;
    cropType?: string;
    area: number;
}

export interface FieldCropData {
    area: {
        size: number; // in square meters
        coordinates: Array<{ lat: number; lng: number }>;
    };
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
    irrigation: {
        info: IrrigationInfo;
        positions: IrrigationPosition[];
        totalCount: number;
        coverage: number; // percentage
        assignments: Record<string, string>; // zoneId -> irrigationType
    };
    waterSource: WaterSource;
    pipes: {
        totalLength: number;
        longestPipe: number;
        connections: number;
        pipeConnections: PipeConnection[];
    };
    equipment: {
        totalCount: number;
        types: {
            pumps: number;
            valves: number;
            solenoids: number;
        };
        positions: Array<{
            id: string;
            lat: number;
            lng: number;
            type: 'pump' | 'ballvalve' | 'solenoid';
        }>;
    };
    summary: {
        totalWaterFlow: number; // L/min
        estimatedCost: number;
        installationTime: number; // hours
        totalPlantingPoints: number;
        estimatedYield: number; // kg
        estimatedIncome: number; // baht
    };
}

export interface FieldLayoutData {
    irrigationPositions: IrrigationPosition[];
    pipeConnections: PipeConnection[];
    waterSource: WaterSource | null;
    irrigationInfo: IrrigationInfo;
    zones: ZoneInfo[];
    area: Array<{ lat: number; lng: number }>;
    equipment: Array<{
        id: string;
        lat: number;
        lng: number;
        type: 'pump' | 'ballvalve' | 'solenoid';
    }>;
    statistics: {
        totalZones: number;
        totalIrrigation: number;
        totalPipeLength: number;
        longestPipe: number;
        coverage: number;
        estimatedCost: number;
        installationTime: number;
        totalPlantingPoints: number;
        estimatedYield: number;
        estimatedIncome: number;
    };
}

/**
 * Local storage handlers
 */
export const getFieldCropData = (): FieldCropData | null => {
    const storedData = localStorage.getItem('fieldCropData');
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

export const saveFieldCropData = (data: FieldCropData): void => {
    try {
        localStorage.setItem('fieldCropData', JSON.stringify(data));
        console.log('Field crop data saved successfully');
    } catch (e) {
        console.error('Error saving field crop data:', e);
    }
};

export const useFieldCropData = () => {
    const data = getFieldCropData();

    if (!data) {
        console.warn('No field crop data found. Redirecting to field crop planner...');
        router.visit('/field-crop');
        return null;
    }

    return data;
};

// Helper getters
export const getIrrigationData = () => getFieldCropData()?.irrigation;
export const getWaterSourceData = () => getFieldCropData()?.waterSource;
export const getPipeData = () => getFieldCropData()?.pipes;
export const getAreaData = () => getFieldCropData()?.area;
export const getZonesData = () => getFieldCropData()?.zones;
export const getCropsData = () => getFieldCropData()?.crops;
export const getEquipmentData = () => getFieldCropData()?.equipment;
export const getSummaryData = () => getFieldCropData()?.summary;

// Formatting helpers
export const formatArea = (area: number): string => {
    if (area >= 10000) {
        return `${(area / 10000).toFixed(2)} hectares`;
    }
    if (area >= 1600) {
        return `${(area / 1600).toFixed(2)} rai`;
    }
    return `${area.toFixed(2)} m²`;
};

export const formatWaterFlow = (flow: number): string => `${flow.toFixed(2)} L/min`;

export const formatDistance = (distance: number): string => {
    if (distance >= 1000) {
        return `${(distance / 1000).toFixed(2)} km`;
    }
    return `${distance.toFixed(2)} m`;
};

export const formatCurrency = (amount: number): string => `฿${amount.toLocaleString()}`;

export const formatTime = (hours: number): string => {
    if (hours >= 8) {
        const days = Math.floor(hours / 8);
        const remainingHours = hours % 8;
        return `${days} day${days > 1 ? 's' : ''}${remainingHours > 0 ? ` ${remainingHours.toFixed(1)} hours` : ''}`.trim();
    }
    return `${hours.toFixed(1)} hours`;
};

export const formatYield = (yield_kg: number): string => `${yield_kg.toLocaleString()} kg`;

export const formatPlantingPoints = (points: number): string => points.toLocaleString();

// Calculation helpers
export const calculateAreaFromCoordinates = (
    coordinates: Array<{ lat: number; lng: number }>
): number => {
    if (coordinates.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < coordinates.length; i++) {
        const j = (i + 1) % coordinates.length;
        area += coordinates[i].lat * coordinates[j].lng;
        area -= coordinates[j].lat * coordinates[i].lng;
    }
    area = Math.abs(area) / 2;

    // Convert to square meters (approximate)
    const areaInSquareMeters =
        area * 111000 * 111000 * Math.cos((coordinates[0].lat * Math.PI) / 180);
    return areaInSquareMeters;
};

export const calculateIrrigationCoverage = (
    irrigationPoints: IrrigationPosition[],
    radius: number,
    totalArea: number
): number => {
    const totalCoverageArea = irrigationPoints.length * Math.PI * Math.pow(radius, 2);
    return Math.min((totalCoverageArea / totalArea) * 100, 100);
};

export const calculatePlantingPoints = (
    zoneArea: number,
    rowSpacing: number,
    plantSpacing: number
): number => {
    if (rowSpacing <= 0 || plantSpacing <= 0) return 0;

    // Calculate number of rows and plants per row
    const rows = Math.floor(Math.sqrt(zoneArea) / rowSpacing);
    const plantsPerRow = Math.floor(Math.sqrt(zoneArea) / plantSpacing);

    return rows * plantsPerRow;
};

export const calculateEstimatedYield = (plantingPoints: number, yieldPerPlant: number): number => {
    return plantingPoints * yieldPerPlant;
};

export const calculateEstimatedIncome = (estimatedYield: number, pricePerKg: number): number => {
    return estimatedYield * pricePerKg;
};

export const estimateInstallationCost = (
    irrigationCount: number,
    pipeLength: number,
    equipmentCount: number,
    irrigationInfo: IrrigationInfo
): number => {
    // Base costs for different irrigation types
    const irrigationCosts = {
        sprinkler: 800,
        mini_sprinkler: 600,
        micro_spray: 400,
        drip_tape: 200,
    };

    const irrigationCost = irrigationCount * (irrigationCosts[irrigationInfo.type] || 500);
    const pipeCost = pipeLength * 60; // 60 baht per meter
    const equipmentCost = equipmentCount * 1500; // average equipment cost
    const laborCost = irrigationCount * 300 + pipeLength * 40;
    const miscCost = 2000;

    return irrigationCost + pipeCost + equipmentCost + laborCost + miscCost;
};

export const estimateInstallationTime = (
    irrigationCount: number,
    pipeLength: number,
    zoneCount: number
): number => {
    const irrigationTime = irrigationCount * 0.75; // 45 minutes per irrigation point
    const pipeTime = pipeLength * 0.15; // 9 minutes per meter
    const zoneSetupTime = zoneCount * 2; // 2 hours per zone setup
    const setupTime = 4; // initial setup

    return irrigationTime + pipeTime + zoneSetupTime + setupTime;
};

// Clear data function
export const clearFieldCropData = (): void => {
    localStorage.removeItem('fieldCropData');
    console.log('Field crop data cleared');
};

// Migration helper from old fieldMapData to new fieldCropData
export const migrateFromFieldMapData = (): FieldCropData | null => {
    const oldData = localStorage.getItem('fieldMapData');
    if (!oldData) return null;

    try {
        const parsed = JSON.parse(oldData);

        // Create new structure based on old data
        const migrated: FieldCropData = {
            area: {
                size: parsed.fieldAreaSize || 0,
                coordinates: parsed.mainField?.coordinates || [],
            },
            zones: {
                info: parsed.zones || [],
                totalCount: parsed.zones?.length || 0,
                totalArea: parsed.fieldAreaSize || 0,
            },
            crops: {
                selectedCrops: parsed.selectedCrops || [],
                zoneAssignments: parsed.zoneAssignments || {},
                spacing: {
                    rowSpacing: parsed.rowSpacing || {},
                    plantSpacing: parsed.plantSpacing || {},
                },
            },
            irrigation: {
                info: {
                    id: 1,
                    name: 'Field Irrigation System',
                    radius: 5,
                    water_flow: 10,
                    type: 'sprinkler',
                },
                positions: parsed.irrigationPoints || [],
                totalCount: parsed.irrigationPoints?.length || 0,
                coverage: 0,
                assignments: parsed.irrigationAssignments || {},
            },
            waterSource: {
                lat: 0,
                lng: 0,
                type: 'pump',
            },
            pipes: {
                totalLength: 0,
                longestPipe: 0,
                connections: parsed.pipes?.length || 0,
                pipeConnections: parsed.pipes || [],
            },
            equipment: {
                totalCount: parsed.equipmentIcons?.length || 0,
                types: {
                    pumps: 0,
                    valves: 0,
                    solenoids: 0,
                },
                positions: parsed.equipmentIcons || [],
            },
            summary: {
                totalWaterFlow: 0,
                estimatedCost: 0,
                installationTime: 0,
                totalPlantingPoints: Object.values(parsed.zoneSummaries || {}).reduce(
                    (sum: number, summary: any) => {
                        return sum + (summary.totalPlantingPoints || 0);
                    },
                    0
                ),
                estimatedYield: Object.values(parsed.zoneSummaries || {}).reduce(
                    (sum: number, summary: any) => {
                        return sum + (summary.estimatedYield || 0);
                    },
                    0
                ),
                estimatedIncome: Object.values(parsed.zoneSummaries || {}).reduce(
                    (sum: number, summary: any) => {
                        return sum + (summary.estimatedPrice || 0);
                    },
                    0
                ),
            },
        };

        // Save migrated data
        saveFieldCropData(migrated);
        return migrated;
    } catch (e) {
        console.error('Error migrating field map data:', e);
        return null;
    }
};
