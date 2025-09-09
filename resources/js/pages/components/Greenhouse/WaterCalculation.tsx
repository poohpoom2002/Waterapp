import { getCropByValue } from './CropData';

export interface WaterRequirement {
    min: number;
    max: number;
    optimal: number;
    unit: string;
    notes?: string;
    notesEn?: string;
    notesTh?: string;
}

export interface PlantingDensity {
    plantsPerSquareMeter: number;
    rowSpacing: number; // เมตร
    plantSpacing: number; // เมตร
    category: 'vegetables' | 'fruits';
    plantingPattern: string; // รูปแบบการปลูก
}

export interface PlotWaterCalculation {
    plotId: string;
    plotName: string;
    cropType: string;
    cropName: string;
    cropIcon: string;
    plotArea: number; // ตารางเมตร (พื้นที่แปลงปลูกจริง)
    effectivePlantingArea: number; // พื้นที่ปลูกได้จริง (หักทางเดินภายในแปลง)
    plantingDensity: PlantingDensity;
    totalPlants: number;
    plantsPerRow: number;
    numberOfRows: number;
    waterRequirement: WaterRequirement;
    dailyWaterNeed: {
        min: number;
        max: number;
        optimal: number;
        unit: string;
    };
    weeklyWaterNeed: {
        min: number;
        max: number;
        optimal: number;
        unit: string;
    };
    monthlyWaterNeed: {
        min: number;
        max: number;
        optimal: number;
        unit: string;
    };
    waterIntensity: {
        litersPerSquareMeter: number;
        category: 'low' | 'medium' | 'high' | 'very-high';
        description: string;
    };
}

export interface PlotBasedWaterSummary {
    totalPlotArea: number; // รวมพื้นที่แปลงปลูกทั้งหมด
    totalEffectivePlantingArea: number; // รวมพื้นที่ปลูกได้จริง
    totalPlants: number;
    plotCount: number;
    dailyTotal: {
        min: number;
        max: number;
        optimal: number;
        unit: string;
    };
    weeklyTotal: {
        min: number;
        max: number;
        optimal: number;
        unit: string;
    };
    monthlyTotal: {
        min: number;
        max: number;
        optimal: number;
        unit: string;
    };
    waterIntensityStats: {
        averageIntensity: number; // ลิตรต่อตารางเมตรต่อวัน
        minIntensity: number;
        maxIntensity: number;
        unit: string;
    };
    plotCalculations: PlotWaterCalculation[];
    plantingEfficiency: {
        averagePlantsPerSquareMeter: number;
        totalCapacity: number;
        utilizationRate: number; // เปอร์เซ็นต์การใช้พื้นที่
    };
}

// ข้อมูลความหนาแน่นการปลูกตามพื้นที่แปลงปลูกจริง
export const PLOT_PLANTING_DENSITIES: Record<string, PlantingDensity> = {
    // ผักผลขนาดใหญ่ - ต้องการพื้นที่มาก
    tomato: {
        plantsPerSquareMeter: 3.0, // เพิ่มขึ้นเมื่อปลูกในแปลงเฉพาะ
        rowSpacing: 1.0,
        plantSpacing: 0.4,
        category: 'vegetables',
        plantingPattern: 'แถวคู่ระยะใกล้',
    },
    'bell-pepper': {
        plantsPerSquareMeter: 4.0,
        rowSpacing: 0.8,
        plantSpacing: 0.3,
        category: 'vegetables',
        plantingPattern: 'แถวเดี่ยวแบบหนาแน่น',
    },
    cucumber: {
        plantsPerSquareMeter: 2.5,
        rowSpacing: 1.2,
        plantSpacing: 0.5,
        category: 'vegetables',
        plantingPattern: 'แถวเดี่ยวแบบกระจาย',
    },
    melon: {
        plantsPerSquareMeter: 2.0,
        rowSpacing: 1.5,
        plantSpacing: 0.6,
        category: 'vegetables',
        plantingPattern: 'แถวเดี่ยวระยะไกล',
    },
    cantaloupe: {
        plantsPerSquareMeter: 2.0,
        rowSpacing: 1.5,
        plantSpacing: 0.6,
        category: 'fruits',
        plantingPattern: 'แถวเดี่ยวระยะไกล',
    },
    'japanese-melon': {
        plantsPerSquareMeter: 1.5,
        rowSpacing: 2.0,
        plantSpacing: 0.8,
        category: 'fruits',
        plantingPattern: 'แถวเดี่ยวระยะห่างมาก',
    },

    // ผักใบเขียว - ปลูกหนาแน่นได้
    lettuce: {
        plantsPerSquareMeter: 20, // เพิ่มขึ้นเมื่อปลูกในแปลงเฉพาะ
        rowSpacing: 0.25,
        plantSpacing: 0.15,
        category: 'vegetables',
        plantingPattern: 'แถวหลายแถวแบบหนาแน่น',
    },
    kale: {
        plantsPerSquareMeter: 12,
        rowSpacing: 0.3,
        plantSpacing: 0.25,
        category: 'vegetables',
        plantingPattern: 'แถวคู่แบบหนาแน่น',
    },
    'pak-choi': {
        plantsPerSquareMeter: 20,
        rowSpacing: 0.25,
        plantSpacing: 0.15,
        category: 'vegetables',
        plantingPattern: 'แถวหลายแถวแบบหนาแน่น',
    },
    'chinese-kale': {
        plantsPerSquareMeter: 16,
        rowSpacing: 0.3,
        plantSpacing: 0.2,
        category: 'vegetables',
        plantingPattern: 'แถวคู่แบบหนาแน่น',
    },
    cabbage: {
        plantsPerSquareMeter: 6,
        rowSpacing: 0.5,
        plantSpacing: 0.3,
        category: 'vegetables',
        plantingPattern: 'แถวเดี่ยวแบบปานกลาง',
    },
    cauliflower: {
        plantsPerSquareMeter: 4,
        rowSpacing: 0.6,
        plantSpacing: 0.4,
        category: 'vegetables',
        plantingPattern: 'แถวเดี่ยวแบบกระจาย',
    },
    broccoli: {
        plantsPerSquareMeter: 6,
        rowSpacing: 0.5,
        plantSpacing: 0.3,
        category: 'vegetables',
        plantingPattern: 'แถวเดี่ยวแบบปานกลาง',
    },

    // ผลไม้
    strawberry: {
        plantsPerSquareMeter: 8, // เพิ่มขึ้นเมื่อปลูกในแปลงเฉพาะ
        rowSpacing: 0.4,
        plantSpacing: 0.25,
        category: 'fruits',
        plantingPattern: 'แถวคู่แบบหนาแน่น',
    },
    'seedless-grape': {
        plantsPerSquareMeter: 0.8, // เถาองุ่นต้องการพื้นที่มาก
        rowSpacing: 2.5,
        plantSpacing: 1.5,
        category: 'fruits',
        plantingPattern: 'แถวเดี่ยวระยะห่างมาก',
    },
};

// ฟังก์ชันคำนวณพื้นที่แปลงปลูกจาก polygon points
export const calculatePlotArea = (points: Array<{ x: number; y: number }>): number => {
    if (points.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;

    // แปลงจาก pixel square เป็น square meters (assuming 25 pixels = 1 meter)
    return area / (25 * 25);
};

// ฟังก์ชันคำนวณพื้นที่ปลูกได้จริง (หักทางเดินภายในแปลง)
export const calculateEffectivePlantingArea = (totalPlotArea: number): number => {
    // สมมติว่าต้องหักพื้นที่สำหรับทางเดินภายในแปลง 15%
    const walkwayFactor = 0.85;
    return totalPlotArea * walkwayFactor;
};

// ฟังก์ชันหาข้อมูล planting density สำหรับแปลงปลูก
export const getPlotPlantingDensity = (cropValue: string): PlantingDensity => {
    return (
        PLOT_PLANTING_DENSITIES[cropValue] || {
            plantsPerSquareMeter: 5, // ค่าเริ่มต้นสำหรับแปลงปลูก
            rowSpacing: 0.4,
            plantSpacing: 0.3,
            category: 'vegetables',
            plantingPattern: 'แถวเดี่ยวแบบปานกลาง',
        }
    );
};

// ฟังก์ชันคำนวณจำนวนแถวและต้นต่อแถว
export const calculatePlantingLayout = (
    effectiveArea: number,
    density: PlantingDensity
): { plantsPerRow: number; numberOfRows: number; totalPlants: number } => {
    // สมมติว่าแปลงเป็นรูปสี่เหลี่ยมผืนผ้าโดยประมาณ
    const approximateWidth = Math.sqrt(effectiveArea * 1.5); // อัตราส่วน 3:2
    const approximateLength = effectiveArea / approximateWidth;

    const numberOfRows = Math.floor(approximateWidth / density.rowSpacing);
    const plantsPerRow = Math.floor(approximateLength / density.plantSpacing);
    const totalPlants = numberOfRows * plantsPerRow;

    return {
        plantsPerRow: Math.max(1, plantsPerRow),
        numberOfRows: Math.max(1, numberOfRows),
        totalPlants: Math.max(1, totalPlants),
    };
};

// ฟังก์ชันจำแนกความเข้มข้นของการใช้น้ำ
export const categorizeWaterIntensity = (
    litersPerSquareMeter: number
): {
    category: 'low' | 'medium' | 'high' | 'very-high';
    description: string;
} => {
    if (litersPerSquareMeter < 5) {
        return { category: 'low', description: 'ใช้น้ำน้อย - ประหยัดน้ำ' };
    } else if (litersPerSquareMeter < 15) {
        return { category: 'medium', description: 'ใช้น้ำปานกลาง - สมดุล' };
    } else if (litersPerSquareMeter < 30) {
        return { category: 'high', description: 'ใช้น้ำมาก - ต้องการน้ำเยอะ' };
    } else {
        return { category: 'very-high', description: 'ใช้น้ำมากมาก - ต้องการระบบน้ำพิเศษ' };
    }
};

// ฟังก์ชันคำนวณความต้องการน้ำสำหรับแปลงปลูกหนึ่งแปลง
export const calculatePlotWaterRequirement = (
    plotId: string,
    plotName: string,
    cropType: string,
    plotPoints: Array<{ x: number; y: number }>
): PlotWaterCalculation => {
    // ดึงข้อมูลพืช
    const crop = getCropByValue(cropType);
    const plotArea = calculatePlotArea(plotPoints);
    const effectivePlantingArea = calculateEffectivePlantingArea(plotArea);
    const plantingDensity = getPlotPlantingDensity(cropType);

    // คำนวณจำนวนต้นจากการวางแผนการปลูก
    const plantingLayout = calculatePlantingLayout(effectivePlantingArea, plantingDensity);
    const totalPlants = plantingLayout.totalPlants;

    // ข้อมูลความต้องการน้ำจาก CropData
    const defaultWaterRequirement: WaterRequirement = {
        min: 0.5,
        max: 1.5,
        optimal: 1.0,
        unit: 'L/day/plant',
    };

    const waterRequirement = crop ? defaultWaterRequirement : defaultWaterRequirement;

    // คำนวณความต้องการน้ำรายวัน
    const dailyWaterNeed = {
        min: totalPlants * waterRequirement.min,
        max: totalPlants * waterRequirement.max,
        optimal: totalPlants * waterRequirement.optimal,
        unit: 'L/day',
    };

    // คำนวณความต้องการน้ำรายสัปดาห์
    const weeklyWaterNeed = {
        min: dailyWaterNeed.min * 7,
        max: dailyWaterNeed.max * 7,
        optimal: dailyWaterNeed.optimal * 7,
        unit: 'L/week',
    };

    // คำนวณความต้องการน้ำรายเดือน
    const monthlyWaterNeed = {
        min: dailyWaterNeed.min * 30,
        max: dailyWaterNeed.max * 30,
        optimal: dailyWaterNeed.optimal * 30,
        unit: 'L/month',
    };

    // คำนวณความเข้มข้นการใช้น้ำต่อพื้นที่แปลง
    const waterIntensityPerSquareMeter = dailyWaterNeed.optimal / plotArea;
    const waterIntensity = categorizeWaterIntensity(waterIntensityPerSquareMeter);

    return {
        plotId,
        plotName,
        cropType,
        cropName: crop?.name || cropType,
        cropIcon: crop?.icon || '🌱',
        plotArea: Math.round(plotArea * 100) / 100,
        effectivePlantingArea: Math.round(effectivePlantingArea * 100) / 100,
        plantingDensity,
        totalPlants,
        plantsPerRow: plantingLayout.plantsPerRow,
        numberOfRows: plantingLayout.numberOfRows,
        waterRequirement,
        dailyWaterNeed: {
            min: Math.round(dailyWaterNeed.min * 100) / 100,
            max: Math.round(dailyWaterNeed.max * 100) / 100,
            optimal: Math.round(dailyWaterNeed.optimal * 100) / 100,
            unit: dailyWaterNeed.unit,
        },
        weeklyWaterNeed: {
            min: Math.round(weeklyWaterNeed.min * 100) / 100,
            max: Math.round(weeklyWaterNeed.max * 100) / 100,
            optimal: Math.round(weeklyWaterNeed.optimal * 100) / 100,
            unit: weeklyWaterNeed.unit,
        },
        monthlyWaterNeed: {
            min: Math.round(monthlyWaterNeed.min * 100) / 100,
            max: Math.round(monthlyWaterNeed.max * 100) / 100,
            optimal: Math.round(monthlyWaterNeed.optimal * 100) / 100,
            unit: monthlyWaterNeed.unit,
        },
        waterIntensity: {
            litersPerSquareMeter: Math.round(waterIntensityPerSquareMeter * 100) / 100,
            category: waterIntensity.category,
            description: waterIntensity.description,
        },
    };
};

// ฟังก์ชันคำนวณความต้องการน้ำรวมจากทุกแปลงปลูก
export const calculatePlotBasedWaterRequirements = (
    shapes: Array<{
        id: string;
        type: string;
        name: string;
        points: Array<{ x: number; y: number }>;
        cropType?: string;
    }>
): PlotBasedWaterSummary => {
    // กรองเฉพาะแปลงปลูกที่มีการระบุพืช
    const plotShapes = shapes.filter((shape) => shape.type === 'plot' && shape.cropType);

    const plotCalculations = plotShapes.map((plot) =>
        calculatePlotWaterRequirement(plot.id, plot.name, plot.cropType!, plot.points)
    );

    // คำนวณผลรวมจากแปลงปลูกทั้งหมด
    const totalPlotArea = plotCalculations.reduce((sum, plot) => sum + plot.plotArea, 0);
    const totalEffectivePlantingArea = plotCalculations.reduce(
        (sum, plot) => sum + plot.effectivePlantingArea,
        0
    );
    const totalPlants = plotCalculations.reduce((sum, plot) => sum + plot.totalPlants, 0);

    const dailyTotal = {
        min: plotCalculations.reduce((sum, plot) => sum + plot.dailyWaterNeed.min, 0),
        max: plotCalculations.reduce((sum, plot) => sum + plot.dailyWaterNeed.max, 0),
        optimal: plotCalculations.reduce((sum, plot) => sum + plot.dailyWaterNeed.optimal, 0),
        unit: 'L/day',
    };

    const weeklyTotal = {
        min: plotCalculations.reduce((sum, plot) => sum + plot.weeklyWaterNeed.min, 0),
        max: plotCalculations.reduce((sum, plot) => sum + plot.weeklyWaterNeed.max, 0),
        optimal: plotCalculations.reduce((sum, plot) => sum + plot.weeklyWaterNeed.optimal, 0),
        unit: 'L/week',
    };

    const monthlyTotal = {
        min: plotCalculations.reduce((sum, plot) => sum + plot.monthlyWaterNeed.min, 0),
        max: plotCalculations.reduce((sum, plot) => sum + plot.monthlyWaterNeed.max, 0),
        optimal: plotCalculations.reduce((sum, plot) => sum + plot.monthlyWaterNeed.optimal, 0),
        unit: 'L/month',
    };

    // คำนวณสถิติความเข้มข้นการใช้น้ำ
    const waterIntensities = plotCalculations.map(
        (plot) => plot.waterIntensity.litersPerSquareMeter
    );
    const averageIntensity = totalPlotArea > 0 ? dailyTotal.optimal / totalPlotArea : 0;
    const minIntensity = waterIntensities.length > 0 ? Math.min(...waterIntensities) : 0;
    const maxIntensity = waterIntensities.length > 0 ? Math.max(...waterIntensities) : 0;

    // คำนวณประสิทธิภาพการปลูก
    const averagePlantsPerSquareMeter = totalPlotArea > 0 ? totalPlants / totalPlotArea : 0;
    const totalCapacity = totalEffectivePlantingArea; // ความจุการปลูกทั้งหมด
    const utilizationRate =
        totalPlotArea > 0 ? (totalEffectivePlantingArea / totalPlotArea) * 100 : 0;

    return {
        totalPlotArea: Math.round(totalPlotArea * 100) / 100,
        totalEffectivePlantingArea: Math.round(totalEffectivePlantingArea * 100) / 100,
        totalPlants,
        plotCount: plotCalculations.length,
        dailyTotal: {
            min: Math.round(dailyTotal.min * 100) / 100,
            max: Math.round(dailyTotal.max * 100) / 100,
            optimal: Math.round(dailyTotal.optimal * 100) / 100,
            unit: dailyTotal.unit,
        },
        weeklyTotal: {
            min: Math.round(weeklyTotal.min * 100) / 100,
            max: Math.round(weeklyTotal.max * 100) / 100,
            optimal: Math.round(weeklyTotal.optimal * 100) / 100,
            unit: weeklyTotal.unit,
        },
        monthlyTotal: {
            min: Math.round(monthlyTotal.min * 100) / 100,
            max: Math.round(monthlyTotal.max * 100) / 100,
            optimal: Math.round(monthlyTotal.optimal * 100) / 100,
            unit: monthlyTotal.unit,
        },
        waterIntensityStats: {
            averageIntensity: Math.round(averageIntensity * 100) / 100,
            minIntensity: Math.round(minIntensity * 100) / 100,
            maxIntensity: Math.round(maxIntensity * 100) / 100,
            unit: 'L/day/m²',
        },
        plotCalculations,
        plantingEfficiency: {
            averagePlantsPerSquareMeter: Math.round(averagePlantsPerSquareMeter * 100) / 100,
            totalCapacity: Math.round(totalCapacity * 100) / 100,
            utilizationRate: Math.round(utilizationRate * 100) / 100,
        },
    };
};

// ฟังก์ชันแปลงหน่วยน้ำเป็นหน่วยที่เหมาะสม
export const formatWaterVolume = (liters: number): { value: number; unit: string } => {
    if (liters >= 1000) {
        return {
            value: Math.round((liters / 1000) * 100) / 100,
            unit: 'ลูกบาศก์เมตร (m³)',
        };
    } else {
        return {
            value: Math.round(liters * 100) / 100,
            unit: 'ลิตร (L)',
        };
    }
};

// ฟังก์ชันคำนวณต้นทุนน้ำต่อแปลงปลูก
export const calculatePlotWaterCost = (
    litersPerDay: number,
    pricePerCubicMeter: number = 10
): {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
    costPerSquareMeter?: number; // ต้นทุนต่อตารางเมตรต่อเดือน
} => {
    const cubicMetersPerDay = litersPerDay / 1000;
    const dailyCost = cubicMetersPerDay * pricePerCubicMeter;

    return {
        daily: Math.round(dailyCost * 100) / 100,
        weekly: Math.round(dailyCost * 7 * 100) / 100,
        monthly: Math.round(dailyCost * 30 * 100) / 100,
        yearly: Math.round(dailyCost * 365 * 100) / 100,
    };
};

// ฟังก์ชันแนะนำถังเก็บน้ำตามความต้องการของแปลงปลูก
export const recommendPlotBasedWaterStorage = (
    optimalDailyLiters: number,
    plotCount: number
): {
    minimumSize: number;
    recommendedSize: number;
    optimalSize: number;
    unit: string;
    description: string;
    distributionStrategy: string;
} => {
    // แนะนำถังขนาดพอสำหรับ 3-7 วัน สำหรับแปลงปลูก
    const minimumSize = Math.ceil((optimalDailyLiters * 3) / 1000);
    const recommendedSize = Math.ceil((optimalDailyLiters * 5) / 1000);
    const optimalSize = Math.ceil((optimalDailyLiters * 7) / 1000);

    // กลยุทธ์การกระจายน้ำ
    let distributionStrategy = '';
    if (plotCount <= 2) {
        distributionStrategy = 'ถังเก็บน้ำรวม 1 ถัง';
    } else if (plotCount <= 4) {
        distributionStrategy = 'ถังเก็บน้ำรวม 1 ถัง + ถังกระจาย 2-3 ถัง';
    } else {
        distributionStrategy = 'ระบบถังเก็บน้ำแบบกระจาย 2-3 จุด';
    }

    return {
        minimumSize,
        recommendedSize,
        optimalSize,
        unit: 'ลูกบาศก์เมตร (m³)',
        description: `สำหรับแปลงปลูก ${plotCount} แปลง: ขั้นต่ำ ${minimumSize} m³, แนะนำ ${recommendedSize} m³, เหมาะสม ${optimalSize} m³`,
        distributionStrategy,
    };
};

// ฟังก์ชันเปรียบเทียบประสิทธิภาพพืชต่างชนิด
export const compareCropWaterEfficiency = (
    plotCalculations: PlotWaterCalculation[]
): {
    mostEfficient: { crop: string; efficiency: number };
    leastEfficient: { crop: string; efficiency: number };
    averageEfficiency: number;
    recommendations: string[];
} => {
    if (plotCalculations.length === 0) {
        return {
            mostEfficient: { crop: '', efficiency: 0 },
            leastEfficient: { crop: '', efficiency: 0 },
            averageEfficiency: 0,
            recommendations: [],
        };
    }

    const efficiencies = plotCalculations.map((plot) => ({
        crop: plot.cropName,
        efficiency: plot.totalPlants / plot.dailyWaterNeed.optimal, // ต้นต่อลิตรน้ำ
    }));

    const mostEfficient = efficiencies.reduce((prev, current) =>
        current.efficiency > prev.efficiency ? current : prev
    );

    const leastEfficient = efficiencies.reduce((prev, current) =>
        current.efficiency < prev.efficiency ? current : prev
    );

    const averageEfficiency =
        efficiencies.reduce((sum, item) => sum + item.efficiency, 0) / efficiencies.length;

    const recommendations = [
        `พืชที่ประหยัดน้ำที่สุด: ${mostEfficient.crop}`,
        `พืชที่ใช้น้ำมากที่สุด: ${leastEfficient.crop}`,
        'ควรพิจารณาปลูกพืชประหยัดน้ำในช่วงแล้ง',
        'ใช้ระบบน้ำหยดสำหรับพืชที่ใช้น้ำมาก',
    ];

    return {
        mostEfficient,
        leastEfficient,
        averageEfficiency: Math.round(averageEfficiency * 100) / 100,
        recommendations,
    };
};
