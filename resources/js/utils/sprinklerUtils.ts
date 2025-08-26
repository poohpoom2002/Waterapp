// sprinklerUtils.ts - Utilities for sprinkler system management

export interface SprinklerConfig {
    flowRatePerMinute: number; // อัตราการไหลต่อนาที (ลิตร/นาที)
    pressureBar: number; // แรงดัน (บาร์)
    radiusMeters: number; // รัศมีหัวฉีด (เมตร)
    createdAt: string; // วันที่สร้าง
    updatedAt: string; // วันที่อัปเดต
}

export interface SprinklerFormData {
    flowRatePerMinute: string;
    pressureBar: string;
    radiusMeters: string;
}

export const SPRINKLER_STORAGE_KEY = 'sprinklerConfig';

/**
 * บันทึกข้อมูลหัวฉีดลง localStorage
 * @param config ข้อมูลหัวฉีด
 * @returns สำเร็จหรือไม่
 */
export const saveSprinklerConfig = (config: Omit<SprinklerConfig, 'createdAt' | 'updatedAt'>): boolean => {
    try {
        const now = new Date().toISOString();
        const configWithTimestamp: SprinklerConfig = {
            ...config,
            createdAt: now,
            updatedAt: now
        };
        
        localStorage.setItem(SPRINKLER_STORAGE_KEY, JSON.stringify(configWithTimestamp));
        return true;
    } catch (error) {
        console.error('❌ Error saving sprinkler config:', error);
        return false;
    }
};

/**
 * โหลดข้อมูลหัวฉีดจาก localStorage
 * @returns ข้อมูลหัวฉีดหรือ null
 */
export const loadSprinklerConfig = (): SprinklerConfig | null => {
    try {
        const storedData = localStorage.getItem(SPRINKLER_STORAGE_KEY);
        if (storedData) {
            return JSON.parse(storedData);
        }
        return null;
    } catch (error) {
        console.error('❌ Error loading sprinkler config:', error);
        return null;
    }
};

/**
 * ลบข้อมูลหัวฉีดออกจาก localStorage
 */
export const clearSprinklerConfig = (): void => {
    try {
        localStorage.removeItem(SPRINKLER_STORAGE_KEY);
    } catch (error) {
        console.error('❌ Error clearing sprinkler config:', error);
    }
};

/**
 * คำนวณปริมาณน้ำรวมทั้งหมด (Q Total) 
 * @param plantCount จำนวนต้นไม้ทั้งหมด
 * @param flowRatePerMinute อัตราการไหลต่อนาที (ลิตร/นาที)
 * @returns Q Total (ลิตร/นาที)
 */
export const calculateTotalFlowRate = (plantCount: number, flowRatePerMinute: number): number => {
    if (plantCount <= 0 || flowRatePerMinute <= 0) return 0;
    return plantCount * flowRatePerMinute;
};

/**
 * คำนวณปริมาณน้ำต่อชั่วโมง
 * @param flowRatePerMinute อัตราการไหลต่อนาที (ลิตร/นาที)
 * @returns อัตราการไหลต่อชั่วโมง (ลิตร/ชั่วโมง)
 */
export const calculateHourlyFlowRate = (flowRatePerMinute: number): number => {
    return flowRatePerMinute * 60;
};

/**
 * คำนวณปริมาณน้ำต่อวัน (สมมติว่าใช้น้ำ 2 ชั่วโมงต่อวัน)
 * @param flowRatePerMinute อัตราการไหลต่อนาที (ลิตร/นาที)
 * @param hoursPerDay จำนวนชั่วโมงที่ใช้น้ำต่อวัน (ค่าเริ่มต้น 2 ชั่วโมง)
 * @returns ปริมาณน้ำต่อวัน (ลิตร/วัน)
 */
export const calculateDailyWaterUsage = (flowRatePerMinute: number, hoursPerDay: number = 2): number => {
    return flowRatePerMinute * 60 * hoursPerDay;
};

/**
 * คำนวณพื้นที่ที่หัวฉีดครอบคลุม
 * @param radiusMeters รัศมีหัวฉีด (เมตร)
 * @returns พื้นที่ครอบคลุม (ตร.ม.)
 */
export const calculateSprinklerCoverage = (radiusMeters: number): number => {
    return Math.PI * Math.pow(radiusMeters, 2);
};

/**
 * ตรวจสอบความถูกต้องของข้อมูลหัวฉีด
 * @param config ข้อมูลหัวฉีด
 * @returns ผลตรวจสอบและข้อผิดพลาด
 */
export const validateSprinklerConfig = (config: SprinklerFormData): {
    isValid: boolean;
    errors: { [key: string]: string };
} => {
    const errors: { [key: string]: string } = {};

    // ตรวจสอบอัตราการไหล
    const flowRate = parseFloat(config.flowRatePerMinute);
    if (!config.flowRatePerMinute || isNaN(flowRate) || flowRate <= 0) {
        errors.flowRatePerMinute = 'กรุณากรอกอัตราการไหลที่ถูกต้อง (มากกว่า 0)';
    } else if (flowRate > 1000) {
        errors.flowRatePerMinute = 'อัตราการไหลสูงเกินไป (ควรน้อยกว่า 1,000 ลิตร/นาที)';
    }

    // ตรวจสอบแรงดัน
    const pressure = parseFloat(config.pressureBar);
    if (!config.pressureBar || isNaN(pressure) || pressure <= 0) {
        errors.pressureBar = 'กรุณากรอกแรงดันที่ถูกต้อง (มากกว่า 0)';
    } else if (pressure > 50) {
        errors.pressureBar = 'แรงดันสูงเกินไป (ควรน้อยกว่า 50 บาร์)';
    }

    // ตรวจสอบรัศมี
    const radius = parseFloat(config.radiusMeters);
    if (!config.radiusMeters || isNaN(radius) || radius <= 0) {
        errors.radiusMeters = 'กรุณากรอกรัศมีที่ถูกต้อง (มากกว่า 0)';
    } else if (radius > 100) {
        errors.radiusMeters = 'รัศมีสูงเกินไป (ควรน้อยกว่า 100 เมตร)';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * ฟอร์แมตหน่วยอัตราการไหล
 * @param flowRate อัตราการไหล
 * @returns สตริงที่ฟอร์แมตแล้ว
 */
export const formatFlowRate = (flowRate: number): string => {
    return `${flowRate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ลิตร/นาที`;
};

/**
 * ฟอร์แมตหน่วยแรงดัน
 * @param pressure แรงดัน
 * @returns สตริงที่ฟอร์แมตแล้ว
 */
export const formatPressure = (pressure: number): string => {
    return `${pressure.toFixed(1)} บาร์`;
};

/**
 * ฟอร์แมตหน่วยรัศมี
 * @param radius รัศมี
 * @returns สตริงที่ฟอร์แมตแล้ว
 */
export const formatRadius = (radius: number): string => {
    if (radius >= 1000) {
        return `${(radius / 1000).toFixed(2)} กม.`;
    }
    return `${radius.toFixed(1)} ม.`;
};

/**
 * สร้างข้อมูลสรุปหัวฉีด
 * @param config ข้อมูลหัวฉีด
 * @param plantCount จำนวนต้นไม้
 * @returns ข้อมูลสรุป
 */
export const generateSprinklerSummary = (config: SprinklerConfig, plantCount: number) => {
    const totalFlowRate = calculateTotalFlowRate(plantCount, config.flowRatePerMinute);
    const dailyUsage = calculateDailyWaterUsage(totalFlowRate);
    const coverage = calculateSprinklerCoverage(config.radiusMeters);
    
    return {
        plantCount,
        flowRatePerPlant: config.flowRatePerMinute,
        totalFlowRate,
        totalFlowRatePerHour: calculateHourlyFlowRate(totalFlowRate),
        dailyWaterUsage: dailyUsage,
        pressure: config.pressureBar,
        radius: config.radiusMeters,
        coveragePerSprinkler: coverage,
        formattedFlowRate: formatFlowRate(totalFlowRate),
        formattedPressure: formatPressure(config.pressureBar),
        formattedRadius: formatRadius(config.radiusMeters),
    };
};

// ค่าเริ่มต้นสำหรับหัวฉีด
export const DEFAULT_SPRINKLER_CONFIG: Omit<SprinklerConfig, 'createdAt' | 'updatedAt'> = {
    flowRatePerMinute: 2.5, // 2.5 ลิตร/นาที ต่อต้น (ปกติสำหรับพืชสวน)
    pressureBar: 2.0, // 2 บาร์ (ปกติสำหรับระบบหัวฉีดแบบ micro)
    radiusMeters: 1.5, // รัศมี 1.5 เมตร (เหมาะสำหรับพืชสวน)
};

export default {
    saveSprinklerConfig,
    loadSprinklerConfig,
    clearSprinklerConfig,
    calculateTotalFlowRate,
    calculateHourlyFlowRate,
    calculateDailyWaterUsage,
    calculateSprinklerCoverage,
    validateSprinklerConfig,
    formatFlowRate,
    formatPressure,
    formatRadius,
    generateSprinklerSummary,
    DEFAULT_SPRINKLER_CONFIG
};
