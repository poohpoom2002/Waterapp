/* eslint-disable @typescript-eslint/no-explicit-any */
// @/pages/utils/greenHouseData.ts

import { getCropByValue } from '@/pages/utils/cropData';

// --- Constants ---
/**
 * อัตราส่วนแปลงหน่วยจาก Pixel บน Canvas เป็นเมตร (สมมติว่า 1 grid = 25px = 1 เมตร)
 */
export const PIXELS_PER_METER = 25;

// --- Interfaces and Type Definitions ---

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
 * สรุปข้อมูลการผลิตของแต่ละแปลง
 */
export interface ProductionSummary {
    totalPlants: number;
    waterRequirementPerIrrigation: number; // Liters
    estimatedYield: number; // kg
    estimatedIncome: number; // baht
}

/**
 * สถิติของแต่ละแปลงปลูก (Plot)
 */
export interface PlotStats {
    plotId: string;
    plotName: string;
    cropType: string | null;
    area: number; // square meters
    pipeStats: {
        main: PipeStats;
        sub: PipeStats;
        drip: PipeStats;
        totalLength: number;
        longestPath: number; // ความยาวท่อเมน + ท่อย่อยที่ยาวที่สุดที่ไปถึงแปลงนี้
    };
    equipmentCount: {
        sprinklers: number;
    };
    production: ProductionSummary;
}

/**
 * โครงสร้างข้อมูลหลักสำหรับโปรเจกต์โรงเรือน (Greenhouse)
 */
export interface GreenhousePlanningData {
    projectInfo: {
        planningMethod: 'draw' | 'import';
        irrigationMethod: 'mini-sprinkler' | 'drip' | 'mixed';
        createdAt: string;
        updatedAt: string;
    };
    rawData: {
        shapes: Shape[];
        irrigationElements: IrrigationElement[];
        selectedCrops: string[];
    };
    summary: {
        totalGreenhouseArea: number;
        totalPlotArea: number;
        plotStats: PlotStats[]; // ข้อมูลสถิติแยกตามแต่ละแปลง
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
        };
        overallProduction: ProductionSummary;
    };
}

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
 * ฟังก์ชันหลักในการคำนวณสถิติทั้งหมดสำหรับโปรเจกต์โรงเรือน
 * @param rawData ข้อมูลดิบจากหน้า green-house-map
 * @returns ออบเจกต์ GreenhousePlanningData ที่สมบูรณ์
 */
export const calculateAllGreenhouseStats = (rawData: any): GreenhousePlanningData => {
    const {
        shapes = [],
        irrigationElements = [],
        selectedCrops = [],
        irrigationMethod = 'mini-sprinkler',
    } = rawData;

    const plots = shapes.filter((s: Shape) => s.type === 'plot');
    const greenhouses = shapes.filter((s: Shape) => s.type === 'greenhouse');

    // คำนวณสถิติแยกตามแต่ละแปลง
    const plotStats: PlotStats[] = plots.map((plot: Shape) => {
        const plotAreaM2 = px2ToM2(calculatePolygonAreaPx2(plot.points));

        // กรองหาอุปกรณ์และท่อที่อยู่ในแปลงนี้
        const elementsInPlot = irrigationElements.filter((el: IrrigationElement) =>
            el.points.some((p) => isPointInPolygon(p, plot.points))
        );

        const mainPipes = elementsInPlot.filter((el: IrrigationElement) => el.type === 'main-pipe');
        const subPipes = elementsInPlot.filter((el: IrrigationElement) => el.type === 'sub-pipe');
        const dripLines = elementsInPlot.filter((el: IrrigationElement) => el.type === 'drip-line');
        const sprinklers = elementsInPlot.filter(
            (el: IrrigationElement) => el.type === 'sprinkler'
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

        // คำนวณการผลิต
        const crop = getCropByValue(plot.cropType || '');
        const production: ProductionSummary = {
            totalPlants: 0,
            waterRequirementPerIrrigation: 0,
            estimatedYield: 0,
            estimatedIncome: 0,
        };
        if (crop) {
            // คำนวณความหนาแน่นจากระยะห่างระหว่างแถวและต้น
            const density =
                crop.rowSpacing > 0 && crop.plantSpacing > 0
                    ? 10000 / (crop.rowSpacing * crop.plantSpacing) // ต้น/ตร.ม.
                    : 4; // fallback
            production.totalPlants = Math.floor(plotAreaM2 * density);
            production.waterRequirementPerIrrigation =
                production.totalPlants * crop.waterRequirement;

            // คำนวณผลผลิตจากพื้นที่ (แปลงเป็นไร่)
            const areaInRai = plotAreaM2 / 1600; // 1 ไร่ = 1600 ตร.ม.
            production.estimatedYield = areaInRai * crop.yield;
            production.estimatedIncome = production.estimatedYield * crop.price;
        }

        return {
            plotId: plot.id,
            plotName: plot.name,
            cropType: plot.cropType || null,
            area: plotAreaM2,
            pipeStats: {
                main: {
                    totalLength: mainLengths.reduce((s, l) => s + l, 0),
                    longest: Math.max(0, ...mainLengths),
                    count: mainLengths.length,
                },
                sub: {
                    totalLength: subLengths.reduce((s, l) => s + l, 0),
                    longest: Math.max(0, ...subLengths),
                    count: subLengths.length,
                },
                drip: {
                    totalLength: dripLengths.reduce((s, l) => s + l, 0),
                    longest: Math.max(0, ...dripLengths),
                    count: dripLengths.length,
                },
                totalLength:
                    mainLengths.reduce((s, l) => s + l, 0) + subLengths.reduce((s, l) => s + l, 0),
                longestPath: Math.max(0, ...mainLengths) + Math.max(0, ...subLengths),
            },
            equipmentCount: { sprinklers: sprinklers.length },
            production: production,
        };
    });

    // คำนวณสถิติรวมทั้งหมด
    const allMainPipes = irrigationElements.filter(
        (el: IrrigationElement) => el.type === 'main-pipe'
    );
    const allSubPipes = irrigationElements.filter(
        (el: IrrigationElement) => el.type === 'sub-pipe'
    );
    const allDripLines = irrigationElements.filter(
        (el: IrrigationElement) => el.type === 'drip-line'
    );

    const allMainLengths = allMainPipes.map((p: IrrigationElement) =>
        pxToM(calculatePolylineLengthPx(p.points))
    );
    const allSubLengths = allSubPipes.map((p: IrrigationElement) =>
        pxToM(calculatePolylineLengthPx(p.points))
    );
    const allDripLengths = allDripLines.map((p: IrrigationElement) =>
        pxToM(calculatePolylineLengthPx(p.points))
    );

    return {
        projectInfo: {
            planningMethod: rawData.planningMethod || 'draw',
            irrigationMethod: irrigationMethod,
            createdAt: rawData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        rawData: { shapes, irrigationElements, selectedCrops },
        summary: {
            totalGreenhouseArea: greenhouses.reduce(
                (sum: number, gh: Shape) => sum + px2ToM2(calculatePolygonAreaPx2(gh.points)),
                0
            ),
            totalPlotArea: plots.reduce(
                (sum: number, p: Shape) => sum + px2ToM2(calculatePolygonAreaPx2(p.points)),
                0
            ),
            plotStats: plotStats,
            overallPipeStats: {
                main: {
                    totalLength: allMainLengths.reduce((s, l) => s + l, 0),
                    longest: Math.max(0, ...allMainLengths),
                    count: allMainLengths.length,
                },
                sub: {
                    totalLength: allSubLengths.reduce((s, l) => s + l, 0),
                    longest: Math.max(0, ...allSubLengths),
                    count: allSubLengths.length,
                },
                drip: {
                    totalLength: allDripLengths.reduce((s, l) => s + l, 0),
                    longest: Math.max(0, ...allDripLengths),
                    count: allDripLengths.length,
                },
                totalLength:
                    allMainLengths.reduce((s, l) => s + l, 0) +
                    allSubLengths.reduce((s, l) => s + l, 0),
            },
            overallEquipmentCount: {
                pumps: irrigationElements.filter((el: IrrigationElement) => el.type === 'pump')
                    .length,
                solenoidValves: irrigationElements.filter(
                    (el: IrrigationElement) => el.type === 'solenoid-valve'
                ).length,
                ballValves: irrigationElements.filter(
                    (el: IrrigationElement) => el.type === 'ball-valve'
                ).length,
                sprinklers: irrigationElements.filter(
                    (el: IrrigationElement) => el.type === 'sprinkler'
                ).length,
            },
            overallProduction: {
                totalPlants: plotStats.reduce((sum, p) => sum + p.production.totalPlants, 0),
                waterRequirementPerIrrigation: plotStats.reduce(
                    (sum, p) => sum + p.production.waterRequirementPerIrrigation,
                    0
                ),
                estimatedYield: plotStats.reduce((sum, p) => sum + p.production.estimatedYield, 0),
                estimatedIncome: plotStats.reduce(
                    (sum, p) => sum + p.production.estimatedIncome,
                    0
                ),
            },
        },
    };
};

// --- Local Storage Handlers ---

const GREENHOUSE_STORAGE_KEY = 'greenhouseData_v2';

/**
 * บันทึกข้อมูล GreenhousePlanningData ลงใน localStorage
 */
export const saveGreenhouseData = (data: GreenhousePlanningData): void => {
    try {
        localStorage.setItem(GREENHOUSE_STORAGE_KEY, JSON.stringify(data));
        console.log('✅ Greenhouse data (v2) saved successfully');
    } catch (e) {
        console.error('Error saving greenhouse data:', e);
    }
};

/**
 * โหลดข้อมูล GreenhousePlanningData จาก localStorage
 */
export const getGreenhouseData = (): GreenhousePlanningData | null => {
    const storedData = localStorage.getItem(GREENHOUSE_STORAGE_KEY);
    if (storedData) {
        try {
            return JSON.parse(storedData);
        } catch (e) {
            console.error('Error parsing greenhouse data:', e);
            return null;
        }
    }
    return null;
};

/**
 * แปลงข้อมูลจากโครงสร้างเก่า (greenhousePlanningData)
 */
export const migrateLegacyGreenhouseData = (): GreenhousePlanningData | null => {
    const legacyData = localStorage.getItem('greenhousePlanningData');
    if (!legacyData) return null;

    try {
        console.log('🔄 Migrating legacy greenhouse data...');
        const parsedLegacyData = JSON.parse(legacyData);
        const migratedData = calculateAllGreenhouseStats(parsedLegacyData);
        saveGreenhouseData(migratedData);
        // localStorage.removeItem('greenhousePlanningData'); // (Optional)
        console.log('✅ Greenhouse migration successful!');
        return migratedData;
    } catch (e) {
        console.error('Error migrating legacy greenhouse data:', e);
        return null;
    }
};
