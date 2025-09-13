// resources\js\pages\types\interfaces.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PlantData } from '@/utils/horticultureUtils';
export interface IrrigationInput {
    farmSizeRai: number;
    totalTrees: number;
    waterPerTreeLiters: number;
    numberOfZones: number;
    sprinklersPerTree: number;
    longestBranchPipeM: number;
    totalBranchPipeM: number;
    longestSecondaryPipeM: number;
    totalSecondaryPipeM: number;
    longestMainPipeM: number;
    totalMainPipeM: number;
    longestEmitterPipeM?: number;
    totalEmitterPipeM?: number;
    irrigationTimeMinutes: number;
    staticHeadM: number;
    pressureHeadM: number;
    pipeAgeYears: number;
    sprinklersPerBranch: number;
    branchesPerSecondary: number;
    simultaneousZones: number;
    sprinklersPerLongestBranch: number;
    branchesPerLongestSecondary: number;
    secondariesPerLongestMain: number;
    extraPipePerSprinkler?: {
        pipeId: number | null;
        lengthPerHead: number;
    };
}

export interface AnalyzedPipe {
    product_code: string;
    id: number;
    productCode: string;
    pipeType: string;
    pn: number;
    sizeMM: number;
    sizeInch: string | null;
    lengthM: number;
    price: number;

    velocity: number;
    headLoss: number;
    optimalSize?: number;
    isRecommended: boolean;
    isGoodChoice: boolean;
    isUsable: boolean;
    isTypeAllowed?: boolean;
    name?: string;
    image?: string;
    brand?: string;
    description?: string;
}

export interface AnalyzedSprinkler {
    id: number;
    productCode: string;
    name: string;
    brand_name: string;
    waterVolumeLitersPerMinute: number;
    radiusMeters: number;
    pressureBar: number;
    price: number;

    flowMatch: boolean;
    flowCloseMatch: boolean;
    isRecommended: boolean;
    isGoodChoice: boolean;
    isUsable: boolean;
    targetFlow: number;
    minFlow: number;
    maxFlow: number;
    avgRadius: number;
    pricePerFlow: number;
    brand?: string;
    image?: string;
    description?: string;
}

export interface AnalyzedPump {
    id: number;
    productCode: string;
    powerHP: number;
    powerKW: number;
    phase: number;
    inlet_size_inch: number;
    outlet_size_inch: number;
    price: number;

    maxFlow: number;
    maxHead: number;
    flowRatio: number;
    headRatio: number;
    flowPerBaht: number;
    estimatedHP: number;
    isFlowAdequate: boolean;
    isHeadAdequate: boolean;
    isRecommended: boolean;
    isGoodChoice: boolean;
    isUsable: boolean;
    name?: string;
    brand?: string;
    image?: string;
    description?: string;
    suction_depth_m?: number;
    weight_kg?: number;
    flow_rate_lpm?: number;
    head_m?: number;
    pumpAccessories?: PumpAccessory[];
}

export interface PumpAccessory {
    id: number;
    productCode: string;
    name: string;
    brand: string;
}

export interface HeadLossValidation {
    isValid: boolean;
    ratio: number;
    recommendation: string;
    severity: 'good' | 'warning' | 'critical';
}

export interface CalculationMetadata {
    totalWaterRequiredLPM: number;
    waterPerZoneLPM: number;
}

export interface CalculationResults {
    headLossValidation: HeadLossValidation;
    calculationMetadata: CalculationMetadata;
    totalWaterRequiredLPM: number;
    waterPerZoneLPM: number;
    totalSprinklers: number;
    sprinklersPerZone: number;
    waterPerSprinklerLPM: number;
    recommendedSprinklers: AnalyzedSprinkler[];
    recommendedBranchPipe: AnalyzedPipe[];
    recommendedSecondaryPipe: AnalyzedPipe[];
    recommendedMainPipe: AnalyzedPipe[];
    recommendedEmitterPipe?: AnalyzedPipe[];
    recommendedPump: AnalyzedPump[];

    analyzedBranchPipes?: AnalyzedPipe[];
    analyzedSecondaryPipes?: AnalyzedPipe[];
    analyzedMainPipes?: AnalyzedPipe[];
    analyzedEmitterPipes?: AnalyzedPipe[];
    analyzedSprinklers?: AnalyzedSprinkler[];
    analyzedPumps?: AnalyzedPump[];

    autoSelectedBranchPipe?: AnalyzedPipe;
    autoSelectedSecondaryPipe?: AnalyzedPipe;
    autoSelectedMainPipe?: AnalyzedPipe;
    autoSelectedEmitterPipe?: AnalyzedPipe;
    autoSelectedPump?: AnalyzedPump;

    branchPipeRolls: number;
    secondaryPipeRolls: number;
    mainPipeRolls: number;
    emitterPipeRolls?: number;
    headLoss: {
        branch: {
            major: number;
            minor: number;
            total: number;
        };
        secondary: {
            major: number;
            minor: number;
            total: number;
        };
        main: {
            major: number;
            minor: number;
            total: number;
        };
        emitter?: {
            major: number;
            minor: number;
            total: number;
        };
        totalMajor: number;
        totalMinor: number;
        total: number;
    };
    velocity: {
        branch: number;
        secondary: number;
        main: number;
        emitter?: number;
    };
    flows: {
        branch: number;
        secondary: number;
        main: number;
        emitter?: number;
    };
    coefficients: {
        branch: number;
        secondary: number;
        main: number;
        emitter?: number;
    };
    pumpHeadRequired: number;
    pressureFromSprinkler?: number;
    safetyFactor: number;
    adjustedFlow: number;
    velocityWarnings: string[];
    hasValidSecondaryPipe?: boolean;
    hasValidMainPipe?: boolean;
    hasValidEmitterPipe?: boolean;

    allZoneResults?: ZoneResults[];
    projectSummary?: ProjectSummary;
}

export interface Zone {
    id: string;
    name: string;
    area: number;
    plantCount: number;
    sprinklerCount?: number;
    coordinates: any[];
    totalWaterNeed: number;
    plantData?: PlantData;
}

export interface ZoneResults {
    zoneId: string;
    zoneName: string;
    totalFlowLPM: number;
    headLoss: {
        branch: number;
        secondary: number;
        main: number;
        emitter?: number;
        total: number;
    };
    staticHead: number;
    pressureHead: number;
    totalHead: number;
    autoSelectedPipes: {
        branch?: AnalyzedPipe;
        secondary?: AnalyzedPipe;
        main?: AnalyzedPipe;
        emitter?: AnalyzedPipe;
    };
    sprinklerCount: number;
}

export interface ZoneOperationGroup {
    id: string;
    zones: string[];
    order: number;
    label: string;
}

export interface ProjectSummary {
    totalFlowLPM: number;
    maxHeadM: number;
    criticalZone: string;
    operationMode: string;
    selectedGroupFlowLPM: number;
    selectedGroupHeadM: number;
    criticalGroup?: ZoneOperationGroup;
}

export interface QuotationData {
    yourReference: string;
    quotationDate: string;
    salesperson: string;
    paymentTerms: string;
}

export interface QuotationDataCustomer {
    name: string;
    projectName: string;
    address: string;
    phone: string;
}

export type PipeType = 'branch' | 'secondary' | 'main' | 'emitter';

export interface FieldCropZone {
    id: string;
    name: string;
    area: number;
    areaInRai: number;
    coordinates: any[];
    cropType?: string;
    totalPlantingPoints: number;
    sprinklerCount: number;
    totalWaterRequirementPerIrrigation: number;
    plantData?: {
        name: string;
        waterNeed: number;
        category?: string;
    };
}

export interface GreenhousePlot {
    plotId: string;
    plotName: string;
    area: number;
    cropType?: string;
    totalPlants: number;
    waterRequirementPerIrrigation: number;
    plantData?: {
        name: string;
        waterNeed: number;
        category?: string;
    };
}

export interface ZoneInputMapping {
    [zoneId: string]: IrrigationInput;
}

export interface ZoneSprinklerMapping {
    [zoneId: string]: any;
}

export type ProjectMode = 'horticulture' | 'garden' | 'field-crop' | 'greenhouse';

export interface ProjectModeConfig {
    mode: ProjectMode;
    usesPump: boolean;
    supportsMultiZone: boolean;
    areaUnit: 'rai' | 'sqm';
    itemName: string;
}
