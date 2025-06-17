// utils/calculations.ts
import { IrrigationInput } from '../types/interfaces';

export const calculatePipeRolls = (totalLength: number, rollLength: number): number => {
    return Math.ceil(totalLength / rollLength);
};

export const getAdjustedC = (pipeType: string, age: number): number => {
    let baseC;
    switch (pipeType) {
        case 'HDPE PE 100':
            baseC = 145;
            break;
        case 'HDPE PE 80':
            baseC = 140;
            break;
        case 'LDPE':
            baseC = 135;
            break;
        case 'PVC':
            baseC = 150;
            break;
        case 'PE-RT':
            baseC = 145;
            break;
        case 'Flexible PE':
            baseC = 130;
            break;
        default:
            baseC = 135;
    }

    // ลดค่า C ตามอายุท่อ
    const adjustedC = Math.max(100, baseC - age * 2.5);
    return adjustedC;
};

export const getMinorLossRatio = (sectionType: string): number => {
    switch (sectionType) {
        case 'branch':
            return 0.2; // ท่อย่อยมี fitting เยอะ
        case 'secondary':
            return 0.15; // ท่อรองมี fitting ปานกลาง
        case 'main':
            return 0.1; // ท่อหลักมี fitting น้อย
        default:
            return 0.15;
    }
};

export const calculateImprovedHeadLoss = (
    flow_lpm: number,
    diameter_mm: number,
    length_m: number,
    pipeType: string,
    sectionType: string,
    pipeAgeYears: number
) => {
    // แปลงหน่วย
    const Q = flow_lpm / 60000; // m³/s
    const D = diameter_mm / 1000; // m
    const C = getAdjustedC(pipeType, pipeAgeYears);

    // คำนวณ Major Loss ด้วยสูตร Hazen-Williams
    const majorLoss =
        (10.67 * length_m * Math.pow(Q, 1.852)) / (Math.pow(C, 1.852) * Math.pow(D, 4.87));

    // คำนวณ Minor Loss
    const minorLossRatio = getMinorLossRatio(sectionType);
    const minorLoss = majorLoss * minorLossRatio;

    // คำนวณความเร็วน้ำ
    const A = Math.PI * Math.pow(D / 2, 2);
    const velocity = Q / A;

    return {
        major: majorLoss,
        minor: minorLoss,
        total: majorLoss + minorLoss,
        velocity: velocity,
        C: C,
    };
};

export const checkVelocity = (velocity: number, section: string): string => {
    if (velocity > 3.0)
        return `🔴 ${section}: ความเร็วสูงมาก (${velocity.toFixed(2)} m/s) - อาจเกิด water hammer`;
    if (velocity > 2.5)
        return `🟡 ${section}: ความเร็วค่อนข้างสูง (${velocity.toFixed(2)} m/s) - ควรพิจารณาเพิ่มขนาดท่อ`;
    if (velocity < 0.3)
        return `🔵 ${section}: ความเร็วต่ำมาก (${velocity.toFixed(2)} m/s) - อาจมีการตกตะกอน`;
    return `🟢 ${section}: ความเร็วเหมาะสม (${velocity.toFixed(2)} m/s)`;
};

// ฟังก์ชันใหม่สำหรับประเมินความเหมาะสมของความเร็ว
export const getVelocityScore = (velocity: number): number => {
    if (velocity >= 0.8 && velocity <= 2.0) {
        return 40; // ช่วงที่ดีที่สุด
    } else if (velocity >= 0.5 && velocity <= 2.5) {
        return 30; // ช่วงดี
    } else if (velocity >= 0.3 && velocity <= 3.0) {
        return 20; // ใช้ได้
    } else {
        return 0; // ไม่เหมาะสม
    }
};

// ฟังก์ชันใหม่สำหรับประเมินประสิทธิภาพการใช้เงิน
export const getCostEfficiencyScore = (pipe: any): number => {
    const costEfficiency = (pipe.lengthM * 1000) / (pipe.price * pipe.sizeMM);
    if (costEfficiency > 50) {
        return 20;
    } else if (costEfficiency > 30) {
        return 15;
    } else if (costEfficiency > 20) {
        return 10;
    } else {
        return 5;
    }
};

// ฟังก์ชันใหม่สำหรับประเมิน Head Loss
export const getHeadLossScore = (headLoss: number): number => {
    if (headLoss < 1) {
        return 10;
    } else if (headLoss < 2) {
        return 8;
    } else if (headLoss < 5) {
        return 5;
    } else {
        return 2;
    }
};

export const formatWaterFlow = (waterFlow: any) => {
    if (Array.isArray(waterFlow)) {
        return `${waterFlow[0]}-${waterFlow[1]}`;
    }
    return waterFlow.toString();
};

export const formatRadius = (radius: any) => {
    if (Array.isArray(radius)) {
        return `${radius[0]}-${radius[1]}`;
    }
    return radius.toString();
};

// ปรับปรุงฟังก์ชันการเรียงลำดับ
export const sortForDropdown = (allItems: any[], recommendedItems: any[]) => {
    // แยกท่อตามระดับคำแนะนำ
    const highly_recommended = allItems.filter(item => 
        recommendedItems.includes(item) && (item.score >= 60)
    ).sort((a, b) => b.score - a.score);
    
    const good_choice = allItems.filter(item => 
        !recommendedItems.includes(item) && (item.score >= 40)
    ).sort((a, b) => b.score - a.score);
    
    const usable = allItems.filter(item => 
        !recommendedItems.includes(item) && (item.score >= 20) && (item.score < 40)
    ).sort((a, b) => b.score - a.score);
    
    const others = allItems.filter(item => 
        !recommendedItems.includes(item) && (item.score < 20)
    ).sort((a, b) => a.price - b.price);
    
    return [...highly_recommended, ...good_choice, ...usable, ...others];
};

export const isRecommended = (item: any, recommendedList: any[]) => {
    return recommendedList.includes(item);
};

// ฟังก์ชันใหม่สำหรับประเมินท่อโดยรวม
export const evaluatePipeOverall = (
    pipe: any,
    flow_lpm: number,
    length_m: number,
    sectionType: string,
    pipeAgeYears: number,
    minSize: number,
    maxSize: number
) => {
    const headLossData = calculateImprovedHeadLoss(
        flow_lpm,
        pipe.sizeMM,
        length_m,
        pipe.pipeType,
        sectionType,
        pipeAgeYears
    );
    
    let score = 0;
    const velocity = headLossData.velocity;
    
    // คะแนนความเร็ว (40%)
    score += getVelocityScore(velocity);
    
    // คะแนนขนาด (30%)
    if (pipe.sizeMM >= minSize && pipe.sizeMM <= maxSize) {
        score += 30;
    } else if (pipe.sizeMM >= minSize * 0.8 && pipe.sizeMM <= maxSize * 1.2) {
        score += 20;
    } else {
        score += 5;
    }
    
    // คะแนนราคาต่อประสิทธิภาพ (20%)
    score += getCostEfficiencyScore(pipe);
    
    // คะแนน Head Loss (10%)
    score += getHeadLossScore(headLossData.total);
    
    return {
        ...pipe,
        score,
        velocity,
        headLoss: headLossData.total,
        isRecommended: score >= 60,
        isGoodChoice: score >= 40,
        isUsable: score >= 20 && velocity >= 0.3 && velocity <= 3.0
    };
};