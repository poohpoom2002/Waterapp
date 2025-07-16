import { router } from '@inertiajs/react';

// Point interface for canvas coordinates
export interface Point {
    x: number;
    y: number;
}

// Shape interface for greenhouse structures
export interface Shape {
    id: string;
    type: 'greenhouse' | 'plot' | 'walkway' | 'water-source' | 'measurement';
    points: Point[];
    color: string;
    fillColor: string;
    name: string;
    measurement?: { distance: number; unit: string };
    cropType?: string;
    area?: number;
}

// Irrigation element interface for irrigation system components
export interface IrrigationElement {
    id: string;
    type: 'main-pipe' | 'sub-pipe' | 'pump' | 'solenoid-valve' | 'ball-valve' | 'sprinkler' | 'drip-line';
    points: Point[];
    color: string;
    width?: number;
    radius?: number;
    angle?: number;
    spacing?: number;
    waterFlow?: number;
}

// Crop assignment interface
export interface CropAssignment {
    plotId: string;
    cropValue: string;
    cropName: string;
    plantingDensity: number; // plants per square meter
    expectedYield: number; // kg per plant
    pricePerKg: number;
    growthPeriod: number; // days
}

// Area information interface
export interface AreaInfo {
    totalArea: number; // square meters
    greenhouseArea: number;
    plotArea: number;
    walkwayArea: number;
    waterSourceArea: number;
    utilizationRate: number; // percentage
}

// Irrigation system information
export interface IrrigationSystemInfo {
    method: 'mini-sprinkler' | 'drip' | 'mixed';
    totalWaterFlow: number; // L/min
    operatingPressure: number; // bar
    coverage: number; // percentage
    efficiency: number; // percentage
}

// Equipment summary interface
export interface EquipmentSummary {
    mainPipes: number;
    subPipes: number;
    pumps: number;
    solenoidValves: number;
    ballValves: number;
    sprinklers: number;
    dripLines: number;
    totalComponents: number;
    totalPipeLength: number; // meters
}

// Financial summary interface
export interface FinancialSummary {
    materialCost: number;
    laborCost: number;
    equipmentCost: number;
    installationCost: number;
    totalCost: number;
    estimatedRevenue: number;
    estimatedProfit: number;
    paybackPeriod: number; // months
}

// Production summary interface
export interface ProductionSummary {
    totalPlants: number;
    estimatedYield: number; // kg per harvest
    harvestsPerYear: number;
    annualProduction: number; // kg per year
    productionValue: number; // baht per year
}

// Main greenhouse planning data interface
export interface GreenhousePlanningData {
    // Basic project information
    projectInfo: {
        name: string;
        description: string;
        planningMethod: 'draw' | 'import';
        createdAt: string;
        updatedAt: string;
    };
    
    // Crop selection and assignments
    crops: {
        selectedCrops: string[];
        assignments: CropAssignment[];
        totalCropTypes: number;
    };
    
    // Greenhouse structures
    structures: {
        shapes: Shape[];
        area: AreaInfo;
        totalStructures: number;
    };
    
    // Irrigation system
    irrigation: {
        systemInfo: IrrigationSystemInfo;
        elements: IrrigationElement[];
        equipment: EquipmentSummary;
    };
    
    // Financial analysis
    financial: FinancialSummary;
    
    // Production analysis
    production: ProductionSummary;
    
    // Canvas data for visualization
    visualization: {
        canvasData?: string; // Base64 image
        irrigationCanvasData?: string; // Base64 image
    };
}

// Layout data interface for map visualization
export interface GreenhouseLayoutData {
    shapes: Shape[];
    irrigationElements: IrrigationElement[];
    cropAssignments: CropAssignment[];
    area: AreaInfo;
    statistics: {
        totalStructures: number;
        totalIrrigationComponents: number;
        totalArea: number;
        utilizationRate: number;
        coverage: number;
        estimatedCost: number;
        installationTime: number;
        estimatedProduction: number;
        estimatedRevenue: number;
    };
}

/**
 * Local storage handlers
 */
export const getGreenhousePlanningData = (): GreenhousePlanningData | null => {
    const storedData = localStorage.getItem('greenhousePlanningData');
    if (storedData) {
        try {
            return JSON.parse(storedData);
        } catch (e) {
            console.error('Error parsing greenhouse planning data:', e);
            return null;
        }
    }
    return null;
};

export const saveGreenhousePlanningData = (data: GreenhousePlanningData): void => {
    try {
        localStorage.setItem('greenhousePlanningData', JSON.stringify(data));
        console.log('Greenhouse planning data saved successfully');
    } catch (e) {
        console.error('Error saving greenhouse planning data:', e);
    }
};

export const useGreenhousePlanningData = () => {
    const data = getGreenhousePlanningData();

    if (!data) {
        console.warn('No greenhouse planning data found. Redirecting to greenhouse crop selection...');
        router.visit('/greenhouse-crop');
        return null;
    }

    return data;
};

// Helper getters
export const getProjectInfo = () => getGreenhousePlanningData()?.projectInfo;
export const getCropsData = () => getGreenhousePlanningData()?.crops;
export const getStructuresData = () => getGreenhousePlanningData()?.structures;
export const getIrrigationData = () => getGreenhousePlanningData()?.irrigation;
export const getFinancialData = () => getGreenhousePlanningData()?.financial;
export const getProductionData = () => getGreenhousePlanningData()?.production;
export const getVisualizationData = () => getGreenhousePlanningData()?.visualization;

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

export const formatPressure = (pressure: number): string => `${pressure.toFixed(1)} bar`;

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

export const formatWeight = (weight: number): string => {
    if (weight >= 1000) {
        return `${(weight / 1000).toFixed(2)} tons`;
    }
    return `${weight.toFixed(2)} kg`;
};

export const formatPercentage = (percentage: number): string => `${percentage.toFixed(1)}%`;

// Calculation helpers
export const calculatePolygonArea = (points: Point[]): number => {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
};

export const calculateShapeArea = (shape: Shape): number => {
    if (shape.type === 'measurement') return 0;
    
    if (shape.type === 'water-source' && shape.points.length === 1) {
        // Circle area for point water source
        return Math.PI * Math.pow(15, 2); // 15px radius
    }
    
    return calculatePolygonArea(shape.points);
};

export const calculateTotalArea = (shapes: Shape[]): number => {
    return shapes.reduce((total, shape) => total + calculateShapeArea(shape), 0);
};

export const calculateAreaByType = (shapes: Shape[], type: string): number => {
    return shapes
        .filter(shape => shape.type === type)
        .reduce((total, shape) => total + calculateShapeArea(shape), 0);
};

export const calculateIrrigationCoverage = (
    irrigationElements: IrrigationElement[],
    totalArea: number
): number => {
    const sprinklers = irrigationElements.filter(el => el.type === 'sprinkler');
    const totalCoverageArea = sprinklers.reduce((total, sprinkler) => {
        const radius = sprinkler.radius || 30; // Default 30px radius
        return total + Math.PI * Math.pow(radius, 2);
    }, 0);
    
    return Math.min((totalCoverageArea / totalArea) * 100, 100);
};

export const calculatePlantingDensity = (
    cropType: string,
    plantingMethod: string = 'standard'
): number => {
    // Default planting densities (plants per square meter)
    const densities: Record<string, number> = {
        'tomato': 2.5,
        'bell-pepper': 3.0,
        'cucumber': 2.0,
        'lettuce': 16.0,
        'kale': 12.0,
        'strawberry': 6.0,
        'broccoli': 4.0,
        'cabbage': 4.0,
        'pak-choi': 20.0,
        'chinese-kale': 16.0
    };
    
    return densities[cropType] || 4.0; // Default density
};

export const calculateExpectedYield = (
    cropType: string,
    plantingArea: number,
    plantingDensity: number
): number => {
    // Expected yield per plant (kg)
    const yieldPerPlant: Record<string, number> = {
        'tomato': 3.5,
        'bell-pepper': 2.0,
        'cucumber': 4.0,
        'lettuce': 0.3,
        'kale': 0.5,
        'strawberry': 0.8,
        'broccoli': 0.8,
        'cabbage': 1.2,
        'pak-choi': 0.2,
        'chinese-kale': 0.3
    };
    
    const totalPlants = plantingArea * plantingDensity;
    const yieldPerUnit = yieldPerPlant[cropType] || 1.0;
    
    return totalPlants * yieldPerUnit;
};

export const calculateCropPrice = (cropType: string): number => {
    // Market prices (baht per kg)
    const prices: Record<string, number> = {
        'tomato': 40,
        'bell-pepper': 80,
        'cucumber': 30,
        'lettuce': 120,
        'kale': 60,
        'strawberry': 200,
        'broccoli': 70,
        'cabbage': 25,
        'pak-choi': 50,
        'chinese-kale': 40
    };
    
    return prices[cropType] || 50; // Default price
};

export const estimateInstallationCost = (
    irrigationElements: IrrigationElement[],
    structures: Shape[]
): number => {
    // Component costs (baht)
    const componentCosts = {
        'main-pipe': 80, // per meter
        'sub-pipe': 60, // per meter
        'pump': 3000, // per unit
        'solenoid-valve': 1500, // per unit
        'ball-valve': 800, // per unit
        'sprinkler': 600, // per unit
        'drip-line': 40 // per meter
    };
    
    let totalCost = 0;
    
    irrigationElements.forEach(element => {
        const cost = componentCosts[element.type] || 500;
        
        if (element.type === 'main-pipe' || element.type === 'sub-pipe' || element.type === 'drip-line') {
            // Calculate pipe length
            let length = 0;
            for (let i = 0; i < element.points.length - 1; i++) {
                const p1 = element.points[i];
                const p2 = element.points[i + 1];
                length += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
            }
            // Convert pixels to meters (approximate)
            length = length / 20; // Assuming 20px = 1m
            totalCost += length * cost;
        } else {
            totalCost += cost;
        }
    });
    
    // Labor cost (30% of material cost)
    const laborCost = totalCost * 0.3;
    
    // Greenhouse structure cost (simplified)
    const greenhouseArea = calculateAreaByType(structures, 'greenhouse');
    const structureCost = (greenhouseArea / 400) * 50000; // 50,000 baht per 400 sq pixels
    
    return totalCost + laborCost + structureCost;
};

export const estimateInstallationTime = (
    irrigationElements: IrrigationElement[],
    structures: Shape[]
): number => {
    const baseTime = 8; // hours for setup
    const irrigationTime = irrigationElements.length * 1.5; // 1.5 hours per component
    const structureTime = structures.length * 2; // 2 hours per structure
    
    return baseTime + irrigationTime + structureTime;
};

export const calculatePaybackPeriod = (
    totalCost: number,
    annualProfit: number
): number => {
    if (annualProfit <= 0) return 0;
    return (totalCost / annualProfit) * 12; // months
};

// Data migration and conversion helpers
export const convertLegacyData = (legacyData: any): GreenhousePlanningData => {
    const now = new Date().toISOString();
    
    return {
        projectInfo: {
            name: legacyData.projectName || 'Greenhouse Project',
            description: legacyData.description || 'Greenhouse planning project',
            planningMethod: legacyData.planningMethod || 'draw',
            createdAt: legacyData.createdAt || now,
            updatedAt: now
        },
        crops: {
            selectedCrops: legacyData.selectedCrops || [],
            assignments: legacyData.assignments || [],
            totalCropTypes: legacyData.selectedCrops?.length || 0
        },
        structures: {
            shapes: legacyData.shapes || [],
            area: {
                totalArea: legacyData.totalArea || 0,
                greenhouseArea: legacyData.greenhouseArea || 0,
                plotArea: legacyData.plotArea || 0,
                walkwayArea: legacyData.walkwayArea || 0,
                waterSourceArea: legacyData.waterSourceArea || 0,
                utilizationRate: legacyData.utilizationRate || 0
            },
            totalStructures: legacyData.shapes?.length || 0
        },
        irrigation: {
            systemInfo: {
                method: legacyData.irrigationMethod || 'mini-sprinkler',
                totalWaterFlow: legacyData.totalWaterFlow || 0,
                operatingPressure: legacyData.operatingPressure || 2.0,
                coverage: legacyData.coverage || 0,
                efficiency: legacyData.efficiency || 85
            },
            elements: legacyData.irrigationElements || [],
            equipment: {
                mainPipes: 0,
                subPipes: 0,
                pumps: 0,
                solenoidValves: 0,
                ballValves: 0,
                sprinklers: 0,
                dripLines: 0,
                totalComponents: 0,
                totalPipeLength: 0
            }
        },
        financial: {
            materialCost: legacyData.materialCost || 0,
            laborCost: legacyData.laborCost || 0,
            equipmentCost: legacyData.equipmentCost || 0,
            installationCost: legacyData.installationCost || 0,
            totalCost: legacyData.totalCost || 0,
            estimatedRevenue: legacyData.estimatedRevenue || 0,
            estimatedProfit: legacyData.estimatedProfit || 0,
            paybackPeriod: legacyData.paybackPeriod || 0
        },
        production: {
            totalPlants: legacyData.totalPlants || 0,
            estimatedYield: legacyData.estimatedYield || 0,
            harvestsPerYear: legacyData.harvestsPerYear || 1,
            annualProduction: legacyData.annualProduction || 0,
            productionValue: legacyData.productionValue || 0
        },
        visualization: {
            canvasData: legacyData.canvasData,
            irrigationCanvasData: legacyData.irrigationCanvasData
        }
    };
};

// Clear data function
export const clearGreenhousePlanningData = (): void => {
    localStorage.removeItem('greenhousePlanningData');
    console.log('Greenhouse planning data cleared');
};

// Validation helpers
export const validateGreenhousePlanningData = (data: GreenhousePlanningData): boolean => {
    if (!data.projectInfo || !data.crops || !data.structures || !data.irrigation) {
        return false;
    }
    
    if (!data.projectInfo.name || !data.projectInfo.planningMethod) {
        return false;
    }
    
    return true;
};

// Export/import helpers
export const exportGreenhousePlanningData = (data: GreenhousePlanningData): string => {
    return JSON.stringify(data, null, 2);
};

export const importGreenhousePlanningData = (jsonString: string): GreenhousePlanningData | null => {
    try {
        const data = JSON.parse(jsonString);
        if (validateGreenhousePlanningData(data)) {
            return data;
        }
        return null;
    } catch (e) {
        console.error('Error importing greenhouse planning data:', e);
        return null;
    }
};