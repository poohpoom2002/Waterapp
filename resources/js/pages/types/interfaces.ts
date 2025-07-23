// resources\js\pages\types\interfaces.ts
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
        pipeId: number | null; // id ของท่อที่เลือกจาก database
        lengthPerHead: number; // ความยาวต่อหัว (เมตร)
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
    score: number;
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
    waterVolumeLitersPerHour: number;
    radiusMeters: number;
    pressureBar: number;
    price: number;
    score: number;
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
    score: number;
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
    flow_rate_lpm?: any;
    head_m?: any;
    pumpAccessories?: any[];
}

export interface CalculationResults {
    headLossValidation: any;
    calculationMetadata: any;
    totalWaterRequiredLPH: number;
    totalWaterRequiredLPM: number;
    waterPerZoneLPH: number;
    waterPerZoneLPM: number;
    totalSprinklers: number;
    sprinklersPerZone: number;
    waterPerSprinklerLPH: number;
    waterPerSprinklerLPM: number;
    recommendedSprinklers: any[];
    recommendedBranchPipe: any[];
    recommendedSecondaryPipe: any[];
    recommendedMainPipe: any[];
    recommendedPump: any[];

    analyzedBranchPipes?: AnalyzedPipe[];
    analyzedSecondaryPipes?: AnalyzedPipe[];
    analyzedMainPipes?: AnalyzedPipe[];
    analyzedSprinklers?: AnalyzedSprinkler[];
    analyzedPumps?: AnalyzedPump[];

    autoSelectedBranchPipe?: AnalyzedPipe;
    autoSelectedSecondaryPipe?: AnalyzedPipe;
    autoSelectedMainPipe?: AnalyzedPipe;
    autoSelectedPump?: AnalyzedPump;

    branchPipeRolls: number;
    secondaryPipeRolls: number;
    mainPipeRolls: number;
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
        totalMajor: number;
        totalMinor: number;
        total: number;
    };
    velocity: {
        branch: number;
        secondary: number;
        main: number;
    };
    flows: {
        branch: number;
        secondary: number;
        main: number;
    };
    coefficients: {
        branch: number;
        secondary: number;
        main: number;
    };
    pumpHeadRequired: number;
    pressureFromSprinkler?: number;
    safetyFactor: number;
    adjustedFlow: number;
    velocityWarnings: string[];
    hasValidSecondaryPipe?: boolean;
    hasValidMainPipe?: boolean;

    allZoneResults?: ZoneResults[];
projectSummary?: ProjectSummary;
}

export interface ZoneResults {
    zoneId: string;
    zoneName: string;
    totalFlowLPM: number;
    headLoss: {
        branch: number;
        secondary: number;
        main: number;
        total: number;
    };
    staticHead: number;
    pressureHead: number;
    totalHead: number;
    autoSelectedPipes: {
        branch?: any;
        secondary?: any;
        main?: any;
    };
    sprinklerCount: number;
}

export interface ProjectSummary {
    totalFlowLPM: number;
    maxHeadM: number;
    criticalZone: string;
    operationMode: string;
    selectedGroupFlowLPM: number;
    selectedGroupHeadM: number;
    criticalGroup?: any;
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

export type PipeType = 'branch' | 'secondary' | 'main';