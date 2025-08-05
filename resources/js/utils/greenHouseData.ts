/* eslint-disable @typescript-eslint/no-explicit-any */
// @/pages/utils/greenHouseData.ts - Enhanced with comprehensive water calculation support

import { getCropByValue } from '@/pages/utils/cropData';
import { 
    calculatePlotBasedWaterRequirements, 
    PlotBasedWaterSummary,
    PlotWaterCalculation,
    PlantingDensity
} from '@/pages/components/Greenhouse/WaterCalculation';

// --- Constants ---
/**
 * อัตราส่วนแปลงหน่วยจาก Pixel บน Canvas เป็นเมตร (สมมติว่า 1 grid = 25px = 1 เมตร)
 */
export const PIXELS_PER_METER = 25;

// --- Enhanced Interfaces and Type Definitions ---

export interface Point {
    x: number;
    y: number;
}

export interface Shape {
    id: string;
    type: 'greenhouse' | 'plot' | 'walkway' | 'water-source' | 'measurement';
    points: Point[];
    color: string;
    fillColor: string;
    name: string;
    cropType?: string;
    area?: number; // in square meters
}

export interface IrrigationElement {
    id: string;
    type:
        | 'main-pipe'
        | 'sub-pipe'
        | 'pump'
        | 'solenoid-valve'
        | 'ball-valve'
        | 'sprinkler'
        | 'drip-line';
    points: Point[];
    color: string;
    width?: number;
    radius?: number; // in pixels
    spacing?: number; // in meters
}

/**
 * สถิติของท่อแต่ละประเภท
 */
export interface PipeStats {
    totalLength: number; // meters
    longest: number; // meters
    count: number;
}

/**
 * Enhanced Production Summary with detailed water calculation
 */
export interface EnhancedProductionSummary {
    // Basic production data
    totalPlants: number;
    estimatedYield: number; // kg
    estimatedIncome: number; // baht
    
    // Enhanced water calculation data
    waterCalculation: PlotWaterCalculation | null;
    
    // Legacy support
    waterRequirementPerIrrigation: number; // Liters (for backward compatibility)
}

/**
 * Enhanced Plot Statistics with comprehensive water data
 */
export interface EnhancedPlotStats {
    plotId: string;
    plotName: string;
    cropType: string | null;
    area: number; // square meters
    effectivePlantingArea: number; // actual planting area excluding walkways
    
    // Pipe infrastructure
    pipeStats: {
        main: PipeStats;
        sub: PipeStats;
        drip: PipeStats;
        totalLength: number;
        longestPath: number; // ความยาวท่อเมน + ท่อย่อยที่ยาวที่สุดที่ไปถึงแปลงนี้
    };
    
    // Equipment count
    equipmentCount: {
        sprinklers: number;
        pumps: number;
        valves: number;
    };
    
    // Enhanced production with water calculation
    production: EnhancedProductionSummary;
    
    // Additional metadata
    plantingDensity: PlantingDensity | null;
    cropIcon: string;
}

/**
 * Water Management Summary
 */
export interface WaterManagementSummary {
    // Overall water requirements
    dailyRequirement: {
        min: number;
        max: number;
        optimal: number;
        unit: string;
    };
    weeklyRequirement: {
        min: number;
        max: number;
        optimal: number;
        unit: string;
    };
    monthlyRequirement: {
        min: number;
        max: number;
        optimal: number;
        unit: string;
    };
    
    // Water intensity analysis
    waterIntensityStats: {
        averageIntensity: number; // L/m²/day
        minIntensity: number;
        maxIntensity: number;
        unit: string;
    };
    
    // Storage recommendations
    storageRecommendations: {
        minimumSize: number; // m³
        recommendedSize: number; // m³
        optimalSize: number; // m³
        distributionStrategy: string;
    };
    
    // Cost estimation
    estimatedCosts: {
        dailyCost: number; // baht
        monthlyCost: number; // baht
        yearlyCost: number; // baht
        costPerSquareMeter: number; // baht/m²/month
    };
    
    // Efficiency metrics
    efficiency: {
        totalPlantsPerLiter: number; // plants per liter per day
        waterUtilizationRate: number; // percentage
        mostEfficientCrop: string;
        leastEfficientCrop: string;
    };
}

/**
 * โครงสร้างข้อมูลหลักสำหรับโปรเจกต์โรงเรือน (Enhanced Version)
 */
export interface EnhancedGreenhousePlanningData {
    projectInfo: {
        planningMethod: 'draw' | 'import';
        irrigationMethod: 'mini-sprinkler' | 'drip' | 'mixed';
        createdAt: string;
        updatedAt: string;
        version: string; // เพิ่ม version tracking
    };
    
    rawData: {
        shapes: Shape[];
        irrigationElements: IrrigationElement[];
        selectedCrops: string[];
    };
    
    summary: {
        // Basic area information
        totalGreenhouseArea: number;
        totalPlotArea: number;
        totalEffectivePlantingArea: number;
        
        // Enhanced plot statistics
        plotStats: EnhancedPlotStats[];
        
        // Infrastructure summary
        overallPipeStats: {
            main: PipeStats;
            sub: PipeStats;
            drip: PipeStats;
            totalLength: number;
        };
        
        overallEquipmentCount: {
            pumps: number;
            solenoidValves: number;
            ballValves: number;
            sprinklers: number;
            dripPoints: number;
        };
        
        // Enhanced production with water management
        overallProduction: EnhancedProductionSummary;
        
        // Comprehensive water management
        waterManagement: WaterManagementSummary;
        
        // Plot-based water summary (from WaterCalculation.tsx)
        plotBasedWaterSummary: PlotBasedWaterSummary | null;
    };
}

// Legacy interface for backward compatibility
export type GreenhousePlanningData = EnhancedGreenhousePlanningData;

// --- Calculation Helpers ---

const pxToM = (px: number) => px / PIXELS_PER_METER;
const px2ToM2 = (px2: number) => px2 / (PIXELS_PER_METER * PIXELS_PER_METER);

const calculatePolygonAreaPx2 = (points: Point[]): number => {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
};

const calculatePolylineLengthPx = (points: Point[]): number => {
    let length = 0;
    for (let i = 0; i < points.length - 1; i++) {
        length += Math.sqrt(
            Math.pow(points[i + 1].x - points[i].x, 2) + Math.pow(points[i + 1].y - points[i].y, 2)
        );
    }
    return length;
};

/**
 * ตรวจสอบว่าจุดอยู่ใน Polygon หรือไม่
 */
const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x,
            yi = polygon[i].y;
        const xj = polygon[j].x,
            yj = polygon[j].y;
        const intersect =
            yi > point.y !== yj > point.y &&
            point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
        if (intersect) isInside = !isInside;
    }
    return isInside;
};

/**
 * Calculate effective planting area (excluding internal walkways)
 */
const calculateEffectivePlantingArea = (totalArea: number): number => {
    // Assume 15% of plot area is for internal walkways
    return totalArea * 0.85;
};

/**
 * Calculate water management summary from plot water calculations
 */
const calculateWaterManagementSummary = (
    plotWaterCalculations: PlotWaterCalculation[],
    totalArea: number,
    waterPricePerCubicMeter: number = 10
): WaterManagementSummary => {
    if (plotWaterCalculations.length === 0) {
        return {
            dailyRequirement: { min: 0, max: 0, optimal: 0, unit: 'L/day' },
            weeklyRequirement: { min: 0, max: 0, optimal: 0, unit: 'L/week' },
            monthlyRequirement: { min: 0, max: 0, optimal: 0, unit: 'L/month' },
            waterIntensityStats: { averageIntensity: 0, minIntensity: 0, maxIntensity: 0, unit: 'L/m²/day' },
            storageRecommendations: { minimumSize: 0, recommendedSize: 0, optimalSize: 0, distributionStrategy: '' },
            estimatedCosts: { dailyCost: 0, monthlyCost: 0, yearlyCost: 0, costPerSquareMeter: 0 },
            efficiency: { totalPlantsPerLiter: 0, waterUtilizationRate: 0, mostEfficientCrop: '', leastEfficientCrop: '' }
        };
    }

    // Calculate total requirements
    const dailyTotal = plotWaterCalculations.reduce((sum, plot) => sum + plot.dailyWaterNeed.optimal, 0);
    const weeklyTotal = dailyTotal * 7;
    const monthlyTotal = dailyTotal * 30;

    // Water intensity statistics
    const intensities = plotWaterCalculations.map(plot => plot.waterIntensity.litersPerSquareMeter);
    const averageIntensity = totalArea > 0 ? dailyTotal / totalArea : 0;
    const minIntensity = Math.min(...intensities);
    const maxIntensity = Math.max(...intensities);

    // Storage recommendations
    const minimumSize = Math.ceil((dailyTotal * 3) / 1000); // 3 days supply
    const recommendedSize = Math.ceil((dailyTotal * 5) / 1000); // 5 days supply
    const optimalSize = Math.ceil((dailyTotal * 7) / 1000); // 7 days supply

    // Cost estimation
    const dailyCostBaht = (dailyTotal / 1000) * waterPricePerCubicMeter;
    const monthlyCostBaht = dailyCostBaht * 30;
    const yearlyCostBaht = dailyCostBaht * 365;
    const costPerSquareMeter = totalArea > 0 ? monthlyCostBaht / totalArea : 0;

    // Efficiency calculations
    const totalPlants = plotWaterCalculations.reduce((sum, plot) => sum + plot.totalPlants, 0);
    const totalPlantsPerLiter = dailyTotal > 0 ? totalPlants / dailyTotal : 0;
    const waterUtilizationRate = 85; // Assume 85% utilization rate

    // Find most/least efficient crops
    const efficiencies = plotWaterCalculations.map(plot => ({
        crop: plot.cropName,
        efficiency: plot.totalPlants / plot.dailyWaterNeed.optimal
    }));
    const mostEfficientCrop = efficiencies.reduce((prev, current) => 
        current.efficiency > prev.efficiency ? current : prev, efficiencies[0]
    ).crop;
    const leastEfficientCrop = efficiencies.reduce((prev, current) => 
        current.efficiency < prev.efficiency ? current : prev, efficiencies[0]
    ).crop;

    return {
        dailyRequirement: { min: dailyTotal * 0.8, max: dailyTotal * 1.2, optimal: dailyTotal, unit: 'L/day' },
        weeklyRequirement: { min: weeklyTotal * 0.8, max: weeklyTotal * 1.2, optimal: weeklyTotal, unit: 'L/week' },
        monthlyRequirement: { min: monthlyTotal * 0.8, max: monthlyTotal * 1.2, optimal: monthlyTotal, unit: 'L/month' },
        waterIntensityStats: { averageIntensity, minIntensity, maxIntensity, unit: 'L/m²/day' },
        storageRecommendations: { 
            minimumSize, 
            recommendedSize, 
            optimalSize, 
            distributionStrategy: plotWaterCalculations.length <= 2 ? 'ถังเก็บน้ำรวม 1 ถัง' : 'ระบบถังเก็บน้ำแบบกระจาย' 
        },
        estimatedCosts: { 
            dailyCost: Math.round(dailyCostBaht * 100) / 100, 
            monthlyCost: Math.round(monthlyCostBaht * 100) / 100, 
            yearlyCost: Math.round(yearlyCostBaht * 100) / 100, 
            costPerSquareMeter: Math.round(costPerSquareMeter * 100) / 100 
        },
        efficiency: { 
            totalPlantsPerLiter: Math.round(totalPlantsPerLiter * 100) / 100, 
            waterUtilizationRate, 
            mostEfficientCrop, 
            leastEfficientCrop 
        }
    };
};

/**
 * Enhanced function to calculate all greenhouse statistics with comprehensive water management
 * @param rawData ข้อมูลดิบจากหน้า green-house-map
 * @returns ออบเจกต์ EnhancedGreenhousePlanningData ที่สมบูรณ์
 */
export const calculateAllGreenhouseStats = (rawData: any): EnhancedGreenhousePlanningData => {
    const {
        shapes = [],
        irrigationElements = [],
        selectedCrops = [],
        irrigationMethod = 'mini-sprinkler',
        planningMethod = 'draw',
        createdAt,
        updatedAt
    } = rawData;

    const plots = shapes.filter((s: Shape) => s.type === 'plot');
    const greenhouses = shapes.filter((s: Shape) => s.type === 'greenhouse');

    // Calculate plot-based water requirements using WaterCalculation.tsx
    let plotBasedWaterSummary: PlotBasedWaterSummary | null = null;
    let plotWaterCalculations: PlotWaterCalculation[] = [];

    try {
        // Convert shapes to format expected by water calculation
        const plotsForWaterCalc = plots.map(plot => ({
            id: plot.id,
            type: plot.type,
            name: plot.name,
            points: plot.points,
            cropType: plot.cropType || (selectedCrops && selectedCrops[0]) || 'tomato'
        }));

        if (plotsForWaterCalc.length > 0) {
            plotBasedWaterSummary = calculatePlotBasedWaterRequirements(plotsForWaterCalc);
            plotWaterCalculations = plotBasedWaterSummary.plotCalculations;
        }
    } catch (error) {
        console.error('Error calculating water requirements:', error);
    }

    // Calculate enhanced plot statistics
    const enhancedPlotStats: EnhancedPlotStats[] = plots.map((plot: Shape) => {
        const plotAreaM2 = px2ToM2(calculatePolygonAreaPx2(plot.points));
        const effectivePlantingArea = calculateEffectivePlantingArea(plotAreaM2);

        // Find corresponding water calculation for this plot
        const plotWaterCalc = plotWaterCalculations.find(calc => 
            calc.plotId === plot.id || calc.plotName === plot.name
        ) || null;

        // กรองหาอุปกรณ์และท่อที่อยู่ในแปลงนี้
        const elementsInPlot = irrigationElements.filter((el: IrrigationElement) =>
            el.points.some((p) => isPointInPolygon(p, plot.points))
        );

        const mainPipes = elementsInPlot.filter((el: IrrigationElement) => el.type === 'main-pipe');
        const subPipes = elementsInPlot.filter((el: IrrigationElement) => el.type === 'sub-pipe');
        const dripLines = elementsInPlot.filter((el: IrrigationElement) => el.type === 'drip-line');
        const sprinklers = elementsInPlot.filter((el: IrrigationElement) => el.type === 'sprinkler');
        const pumps = elementsInPlot.filter((el: IrrigationElement) => el.type === 'pump');
        const valves = elementsInPlot.filter((el: IrrigationElement) => 
            el.type === 'solenoid-valve' || el.type === 'ball-valve'
        );

        const mainLengths = mainPipes.map((p: IrrigationElement) =>
            pxToM(calculatePolylineLengthPx(p.points))
        );
        const subLengths = subPipes.map((p: IrrigationElement) =>
            pxToM(calculatePolylineLengthPx(p.points))
        );
        const dripLengths = dripLines.map((p: IrrigationElement) =>
            pxToM(calculatePolylineLengthPx(p.points))
        );

        // Get crop information
        const crop = getCropByValue(plot.cropType || '');
        const cropIcon = crop?.icon || '🌱';

        // Enhanced production summary
        const enhancedProduction: EnhancedProductionSummary = {
            totalPlants: plotWaterCalc?.totalPlants || 0,
            estimatedYield: 0, // Will be calculated based on crop data
            estimatedIncome: 0, // Will be calculated based on crop data
            waterCalculation: plotWaterCalc,
            waterRequirementPerIrrigation: plotWaterCalc?.dailyWaterNeed.optimal || 0
        };

        // Calculate yield and income if crop data is available
        if (crop && plotAreaM2 > 0) {
            const areaInRai = plotAreaM2 / 1600; // 1 ไร่ = 1600 ตร.ม.
            // Note: These values should come from crop data, using defaults for now
            enhancedProduction.estimatedYield = areaInRai * 1000; // Default 1000 kg/rai
            enhancedProduction.estimatedIncome = enhancedProduction.estimatedYield * 50; // Default 50 baht/kg
        }

        return {
            plotId: plot.id,
            plotName: plot.name,
            cropType: plot.cropType || null,
            area: plotAreaM2,
            effectivePlantingArea,
            pipeStats: {
                main: {
                    totalLength: mainLengths.reduce((s: number, l: number) => s + l, 0),
                    longest: Math.max(0, ...mainLengths),
                    count: mainLengths.length,
                },
                sub: {
                    totalLength: subLengths.reduce((s: number, l: number) => s + l, 0),
                    longest: Math.max(0, ...subLengths),
                    count: subLengths.length,
                },
                drip: {
                    totalLength: dripLengths.reduce((s: number, l: number) => s + l, 0),
                    longest: Math.max(0, ...dripLengths),
                    count: dripLengths.length,
                },
                totalLength:
                    mainLengths.reduce((s: number, l: number) => s + l, 0) + subLengths.reduce((s: number, l: number) => s + l, 0),
                longestPath: Math.max(0, ...mainLengths) + Math.max(0, ...subLengths),
            },
            equipmentCount: { 
                sprinklers: sprinklers.length,
                pumps: pumps.length,
                valves: valves.length
            },
            production: enhancedProduction,
            plantingDensity: plotWaterCalc?.plantingDensity || null,
            cropIcon
        };
    });

    // Calculate overall statistics
    const totalGreenhouseArea = greenhouses.reduce(
        (sum: number, gh: Shape) => sum + px2ToM2(calculatePolygonAreaPx2(gh.points)),
        0
    );
    const totalPlotArea = plots.reduce(
        (sum: number, p: Shape) => sum + px2ToM2(calculatePolygonAreaPx2(p.points)),
        0
    );
    const totalEffectivePlantingArea = totalPlotArea * 0.85; // 85% utilization

    // Calculate overall pipe stats
    const allMainPipes = irrigationElements.filter((el: IrrigationElement) => el.type === 'main-pipe');
    const allSubPipes = irrigationElements.filter((el: IrrigationElement) => el.type === 'sub-pipe');
    const allDripLines = irrigationElements.filter((el: IrrigationElement) => el.type === 'drip-line');

    const allMainLengths = allMainPipes.map((p: IrrigationElement) =>
        pxToM(calculatePolylineLengthPx(p.points))
    );
    const allSubLengths = allSubPipes.map((p: IrrigationElement) =>
        pxToM(calculatePolylineLengthPx(p.points))
    );
    const allDripLengths = allDripLines.map((p: IrrigationElement) =>
        pxToM(calculatePolylineLengthPx(p.points))
    );

    // Calculate drip points
    const dripPoints = allDripLines.reduce((total, dripLine) => {
        const lineLength = pxToM(calculatePolylineLengthPx(dripLine.points));
        const spacing = dripLine.spacing || 0.3; // default 0.3m spacing
        return total + Math.floor(lineLength / spacing);
    }, 0);

    // Overall production summary
    const overallProduction: EnhancedProductionSummary = {
        totalPlants: enhancedPlotStats.reduce((sum, p) => sum + p.production.totalPlants, 0),
        estimatedYield: enhancedPlotStats.reduce((sum, p) => sum + p.production.estimatedYield, 0),
        estimatedIncome: enhancedPlotStats.reduce((sum, p) => sum + p.production.estimatedIncome, 0),
        waterCalculation: null, // Overall calculation not applicable to individual plots
        waterRequirementPerIrrigation: enhancedPlotStats.reduce(
            (sum, p) => sum + p.production.waterRequirementPerIrrigation,
            0
        ),
    };

    // Calculate water management summary
    const waterManagement = calculateWaterManagementSummary(
        plotWaterCalculations,
        totalPlotArea
    );

    return {
        projectInfo: {
            planningMethod: planningMethod,
            irrigationMethod: irrigationMethod,
            createdAt: createdAt || new Date().toISOString(),
            updatedAt: updatedAt || new Date().toISOString(),
            version: '2.0.0' // Enhanced version
        },
        rawData: { shapes, irrigationElements, selectedCrops },
        summary: {
            totalGreenhouseArea,
            totalPlotArea,
            totalEffectivePlantingArea,
            plotStats: enhancedPlotStats,
            overallPipeStats: {
                main: {
                    totalLength: allMainLengths.reduce((s: number, l: number) => s + l, 0),
                    longest: Math.max(0, ...allMainLengths),
                    count: allMainLengths.length,
                },
                sub: {
                    totalLength: allSubLengths.reduce((s: number, l: number) => s + l, 0),
                    longest: Math.max(0, ...allSubLengths),
                    count: allSubLengths.length,
                },
                drip: {
                    totalLength: allDripLengths.reduce((s, l) => s + l, 0),
                    longest: Math.max(0, ...allDripLengths),
                    count: allDripLengths.length,
                },
                totalLength:
                    allMainLengths.reduce((s: number, l: number) => s + l, 0) +
                    allSubLengths.reduce((s: number, l: number) => s + l, 0),
            },
            overallEquipmentCount: {
                pumps: irrigationElements.filter((el: IrrigationElement) => el.type === 'pump').length,
                solenoidValves: irrigationElements.filter(
                    (el: IrrigationElement) => el.type === 'solenoid-valve'
                ).length,
                ballValves: irrigationElements.filter(
                    (el: IrrigationElement) => el.type === 'ball-valve'
                ).length,
                sprinklers: irrigationElements.filter(
                    (el: IrrigationElement) => el.type === 'sprinkler'
                ).length,
                dripPoints,
            },
            overallProduction,
            waterManagement,
            plotBasedWaterSummary,
        },
    };
};

// --- Enhanced Local Storage Handlers ---

const ENHANCED_GREENHOUSE_STORAGE_KEY = 'enhancedGreenhouseData_v2';
const LEGACY_GREENHOUSE_STORAGE_KEY = 'greenhouseData_v2';

/**
 * บันทึกข้อมูล EnhancedGreenhousePlanningData ลงใน localStorage
 */
export const saveEnhancedGreenhouseData = (data: EnhancedGreenhousePlanningData): void => {
    try {
        localStorage.setItem(ENHANCED_GREENHOUSE_STORAGE_KEY, JSON.stringify(data));
        // Also save to legacy key for backward compatibility
        localStorage.setItem(LEGACY_GREENHOUSE_STORAGE_KEY, JSON.stringify(data));
        console.log('✅ Enhanced greenhouse data saved successfully');
    } catch (e) {
        console.error('Error saving enhanced greenhouse data:', e);
    }
};

/**
 * โหลดข้อมูล EnhancedGreenhousePlanningData จาก localStorage
 */
export const getEnhancedGreenhouseData = (): EnhancedGreenhousePlanningData | null => {
    // Try enhanced storage first
    let storedData = localStorage.getItem(ENHANCED_GREENHOUSE_STORAGE_KEY);
    
    // Fallback to legacy storage
    if (!storedData) {
        storedData = localStorage.getItem(LEGACY_GREENHOUSE_STORAGE_KEY);
    }
    
    if (storedData) {
        try {
            const parsedData = JSON.parse(storedData);
            
            // Check if it's already enhanced version
            if (parsedData.projectInfo?.version === '2.0.0') {
                return parsedData;
            }
            
            // Migrate legacy data to enhanced version
            console.log('🔄 Migrating to enhanced greenhouse data...');
            const enhancedData = calculateAllGreenhouseStats(parsedData.rawData || parsedData);
            saveEnhancedGreenhouseData(enhancedData);
            return enhancedData;
        } catch (e) {
            console.error('Error parsing enhanced greenhouse data:', e);
            return null;
        }
    }
    return null;
};

// Legacy functions for backward compatibility
export const saveGreenhouseData = saveEnhancedGreenhouseData;
export const getGreenhouseData = getEnhancedGreenhouseData;

/**
 * แปลงข้อมูลจากโครงสร้างเก่า (greenhousePlanningData)
 */
export const migrateLegacyGreenhouseData = (): EnhancedGreenhousePlanningData | null => {
    const legacyData = localStorage.getItem('greenhousePlanningData');
    if (!legacyData) return null;

    try {
        console.log('🔄 Migrating legacy greenhouse data to enhanced version...');
        const parsedLegacyData = JSON.parse(legacyData);
        const enhancedData = calculateAllGreenhouseStats(parsedLegacyData);
        saveEnhancedGreenhouseData(enhancedData);
        console.log('✅ Enhanced greenhouse migration successful!');
        return enhancedData;
    } catch (e) {
        console.error('Error migrating legacy greenhouse data:', e);
        return null;
    }
};

// --- Utility Functions ---

/**
 * Get water efficiency rating for a plot
 */
export const getWaterEfficiencyRating = (
    litersPerSquareMeter: number
): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (litersPerSquareMeter < 5) return 'excellent';
    if (litersPerSquareMeter < 15) return 'good';
    if (litersPerSquareMeter < 30) return 'fair';
    return 'poor';
};

/**
 * Format water volume with appropriate units
 */
export const formatWaterVolume = (liters: number): { value: number; unit: string } => {
    if (liters >= 1000) {
        return {
            value: Math.round((liters / 1000) * 100) / 100,
            unit: 'm³'
        };
    }
    return {
        value: Math.round(liters * 100) / 100,
        unit: 'L'
    };
};

/**
 * Generate water management recommendations
 */
export const generateWaterRecommendations = (
    data: EnhancedGreenhousePlanningData
): string[] => {
    const recommendations: string[] = [];
    const { waterManagement, plotStats } = data.summary;

    // Storage recommendations
    recommendations.push(
        `แนะนำถังเก็บน้ำขนาด ${waterManagement.storageRecommendations.recommendedSize} ลูกบาศก์เมตร`
    );

    // Efficiency recommendations
    if (waterManagement.efficiency.waterUtilizationRate < 70) {
        recommendations.push('ควรปรับปรุงประสิทธิภาพการใช้น้ำด้วยระบบน้ำหยด');
    }

    // Cost optimization
    if (waterManagement.estimatedCosts.monthlyCost > 1000) {
        recommendations.push('พิจารณาติดตั้งระบบเก็บน้ำฝนเพื่อลดต้นทุน');
    }

    // Crop-specific recommendations
    const highWaterCrops = plotStats.filter(plot => 
        plot.production.waterCalculation && 
        plot.production.waterCalculation.waterIntensity.category === 'high'
    );
    
    if (highWaterCrops.length > 0) {
        recommendations.push(
            `พืชที่ใช้น้ำมาก (${highWaterCrops.map(p => p.plotName).join(', ')}) ควรใช้ระบบน้ำหยดแทนสปริงเกลอร์`
        );
    }

    return recommendations;
};

export default {
    calculateAllGreenhouseStats,
    saveEnhancedGreenhouseData,
    getEnhancedGreenhouseData,
    migrateLegacyGreenhouseData,
    formatWaterVolume,
    generateWaterRecommendations,
    getWaterEfficiencyRating
};
