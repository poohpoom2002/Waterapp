// C:\webchaiyo\Waterapp\resources\js\pages\types\interfaces.ts
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
}

export interface AnalyzedPipe {
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
    optimalSize?: number; // เพิ่ม field ใหม่
    isRecommended: boolean;
    isGoodChoice: boolean;
    isUsable: boolean;
    isTypeAllowed?: boolean; // เพิ่ม field ใหม่
}

export interface AnalyzedSprinkler {
    id: number;
    productCode: string;
    name: string;
    waterVolumeLitersPerHour: any;
    radiusMeters: any;
    pressureBar: any;
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
}

export interface AnalyzedPump {
    id: number;
    productCode: string;
    powerHP: any;
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
}

export interface CalculationResults {
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
    // เพิ่ม field ใหม่สำหรับข้อมูลที่วิเคราะห์
    analyzedBranchPipes?: AnalyzedPipe[];
    analyzedSecondaryPipes?: AnalyzedPipe[];
    analyzedMainPipes?: AnalyzedPipe[];
    analyzedSprinklers?: AnalyzedSprinkler[];
    analyzedPumps?: AnalyzedPump[];
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
    pressureFromSprinkler?: number; // เพิ่ม field ใหม่ - แรงดันจากสปริงเกอร์
    safetyFactor: number;
    adjustedFlow: number;
    velocityWarnings: string[];
    hasValidSecondaryPipe?: boolean; // เพิ่ม field ใหม่ - สถานะท่อรอง
    hasValidMainPipe?: boolean; // เพิ่ม field ใหม่ - สถานะท่อหลัก
}

export interface QuotationData {
    yourReference: string;
    quotationDate: string;
    salesperson: string;
    paymentTerms: string;
}

export interface QuotationDataCustomer {
    // code: string;
    name: string;
    address1: string;
    address2: string;
    phone: string;
}

export type PipeType = 'branch' | 'secondary' | 'main';
