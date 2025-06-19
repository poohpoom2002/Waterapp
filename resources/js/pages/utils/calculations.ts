// C:\webchaiyo\Waterapp\resources\js\pages\utils\calculations.ts
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
        return `🔴 ${section}: ความเร็วสูงมาก (${velocity.toFixed(3)} m/s) - อาจเกิด water hammer`;
    if (velocity > 2.5)
        return `🟡 ${section}: ความเร็วค่อนข้างสูง (${velocity.toFixed(3)} m/s) - ควรพิจารณาเพิ่มขนาดท่อ`;
    if (velocity < 0.3)
        return `🔵 ${section}: ความเร็วต่ำมาก (${velocity.toFixed(3)} m/s) - อาจมีการตกตะกอน`;
    return `🟢 ${section}: ความเร็วเหมาะสม (${velocity.toFixed(3)} m/s)`;
};

// ฟังก์ชันใหม่สำหรับประเมินความเหมาะสมของความเร็ว (ปรับปรุงใหม่)
export const getVelocityScore = (velocity: number): number => {
    if (velocity >= 1.0 && velocity <= 2.0) {
        return 50; // ช่วงที่ดีที่สุด
    } else if (velocity >= 0.8 && velocity <= 2.5) {
        return 45; // ช่วงดีมาก
    } else if (velocity >= 0.6 && velocity <= 3.0) {
        return 35; // ช่วงดี
    } else if (velocity >= 0.4 && velocity <= 3.5) {
        return 25; // ใช้ได้
    } else if (velocity >= 0.3 && velocity <= 4.0) {
        return 15; // ใช้ได้แต่ไม่เหมาะสม
    } else {
        return 0; // ไม่เหมาะสม
    }
};

// ฟังก์ชันประเมินขนาดท่อที่เหมาะสม (ปรับปรุงใหม่)
export const getSizeScore = (
    pipeSize: number, 
    minSize: number, 
    maxSize: number, 
    optimalSize: number
): number => {
    if (pipeSize === optimalSize) {
        return 35; // ขนาดที่เหมาะสมที่สุด
    } else if (pipeSize >= optimalSize * 0.9 && pipeSize <= optimalSize * 1.1) {
        return 32; // ใกล้เคียงขนาดที่เหมาะสม
    } else if (pipeSize >= minSize && pipeSize <= maxSize) {
        return 28; // อยู่ในช่วงที่ยอมรับได้
    } else if (pipeSize >= minSize * 0.8 && pipeSize <= maxSize * 1.2) {
        return 20; // ใกล้เคียงช่วงที่ยอมรับได้
    } else {
        return 5; // ไม่เหมาะสม
    }
};

// ฟังก์ชันใหม่สำหรับประเมินประสิทธิภาพการใช้เงิน (ปรับปรุงใหม่)
export const getCostEfficiencyScore = (pipe: any, pipeType: string): number => {
    // คำนวณ cost per meter per mm diameter
    const costPerMeterPerMM = pipe.price / (pipe.lengthM * pipe.sizeMM);
    
    // เกณฑ์การให้คะแนนตามประเภทท่อ
    let excellentThreshold, goodThreshold, averageThreshold;
    
    switch (pipeType) {
        case 'branch':
            excellentThreshold = 0.5;
            goodThreshold = 1.0;
            averageThreshold = 2.0;
            break;
        case 'secondary':
            excellentThreshold = 1.0;
            goodThreshold = 2.0;
            averageThreshold = 4.0;
            break;
        case 'main':
            excellentThreshold = 2.0;
            goodThreshold = 4.0;
            averageThreshold = 8.0;
            break;
        default:
            excellentThreshold = 1.0;
            goodThreshold = 2.0;
            averageThreshold = 4.0;
    }
    
    if (costPerMeterPerMM <= excellentThreshold) {
        return 15; // ประสิทธิภาพสูงมาก
    } else if (costPerMeterPerMM <= goodThreshold) {
        return 12; // ประสิทธิภาพดี
    } else if (costPerMeterPerMM <= averageThreshold) {
        return 8; // ประสิทธิภาพปานกลาง
    } else {
        return 3; // ประสิทธิภาพต่ำ
    }
};

// ฟังก์ชันใหม่สำหรับประเมิน Head Loss (ปรับปรุงใหม่)
export const getHeadLossScore = (headLoss: number, pipeType: string): number => {
    let excellentThreshold, goodThreshold, averageThreshold;
    
    switch (pipeType) {
        case 'branch':
            excellentThreshold = 0.5;
            goodThreshold = 1.0;
            averageThreshold = 2.0;
            break;
        case 'secondary':
            excellentThreshold = 1.0;
            goodThreshold = 2.0;
            averageThreshold = 4.0;
            break;
        case 'main':
            excellentThreshold = 2.0;
            goodThreshold = 4.0;
            averageThreshold = 8.0;
            break;
        default:
            excellentThreshold = 1.0;
            goodThreshold = 2.0;
            averageThreshold = 4.0;
    }
    
    if (headLoss <= excellentThreshold) {
        return 15; // Head loss ต่ำมาก
    } else if (headLoss <= goodThreshold) {
        return 12; // Head loss ต่ำ
    } else if (headLoss <= averageThreshold) {
        return 8; // Head loss ปานกลาง
    } else {
        return 3; // Head loss สูง
    }
};

// ฟังก์ชันคำนวณขนาดท่อที่เหมาะสมตาม flow
export const calculateOptimalPipeSize = (flow_lpm: number, targetVelocity: number = 1.5): number => {
    // Q = A × V
    // A = π × (D/2)²
    // D = 2 × sqrt(Q / (π × V))
    
    const Q = flow_lpm / 60000; // m³/s
    const V = targetVelocity; // m/s
    const D = 2 * Math.sqrt(Q / (Math.PI * V)); // meters
    const D_mm = D * 1000; // millimeters
    
    return D_mm;
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

// ฟังก์ชันจัดรูปแบบตัวเลขให้แสดง 3 ทศนิยม
export const formatNumber = (value: number, decimals: number = 3): number => {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// ปรับปรุงฟังก์ชันการเรียงลำดับ
export const sortForDropdown = (allItems: any[], recommendedItems: any[]) => {
    // แยกท่อตามระดับคำแนะนำ
    const highly_recommended = allItems
        .filter((item) => recommendedItems.includes(item) && item.score >= 70)
        .sort((a, b) => b.score - a.score);

    const recommended = allItems
        .filter((item) => recommendedItems.includes(item) && item.score >= 50 && item.score < 70)
        .sort((a, b) => b.score - a.score);

    const good_choice = allItems
        .filter((item) => !recommendedItems.includes(item) && item.score >= 40)
        .sort((a, b) => b.score - a.score);

    const usable = allItems
        .filter((item) => !recommendedItems.includes(item) && item.score >= 20 && item.score < 40)
        .sort((a, b) => b.score - a.score);

    const others = allItems
        .filter((item) => !recommendedItems.includes(item) && item.score < 20)
        .sort((a, b) => a.price - b.price);

    return [...highly_recommended, ...recommended, ...good_choice, ...usable, ...others];
};

export const isRecommended = (item: any, recommendedList: any[]) => {
    return recommendedList.includes(item);
};

// ฟังก์ชันใหม่สำหรับประเมินท่อโดยรวม (ปรับปรุงใหม่)
export const evaluatePipeOverall = (
    pipe: any,
    flow_lpm: number,
    length_m: number,
    sectionType: string,
    pipeAgeYears: number,
    allowedTypes: string[]
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
    
    // คำนวณขนาดท่อที่เหมาะสมสำหรับ flow นี้
    const optimalSize = calculateOptimalPipeSize(flow_lpm);
    
    // กำหนดช่วงขนาดที่เหมาะสมตาม section type
    let minSize, maxSize;
    switch (sectionType) {
        case 'branch':
            minSize = 16;
            maxSize = 50;
            break;
        case 'secondary':
            minSize = 25;
            maxSize = 110;
            break;
        case 'main':
            minSize = 40;
            maxSize = 200;
            break;
        default:
            minSize = 16;
            maxSize = 200;
    }

    // 1. คะแนนความเร็ว (50%)
    score += getVelocityScore(velocity);

    // 2. คะแนนขนาดที่เหมาะสม (35%)
    score += getSizeScore(pipe.sizeMM, minSize, maxSize, optimalSize);

    // 3. คะแนนประเภทท่อ (ใหม่) (10%)
    if (allowedTypes.includes(pipe.pipeType)) {
        // ให้คะแนนเพิ่มตามคุณภาพของประเภทท่อ
        switch (pipe.pipeType) {
            case 'HDPE PE 100':
                score += 10;
                break;
            case 'HDPE PE 80':
                score += 9;
                break;
            case 'PE-RT':
                score += 8;
                break;
            case 'PVC':
                score += 7;
                break;
            case 'LDPE':
                score += 6;
                break;
            case 'Flexible PE':
                score += 5;
                break;
            default:
                score += 3;
        }
    } else {
        score += 1; // ประเภทไม่เหมาะสม
    }

    // 4. คะแนนราคาต่อประสิทธิภาพ (15%)
    score += getCostEfficiencyScore(pipe, sectionType);

    // 5. คะแนน Head Loss (10%)
    score += getHeadLossScore(headLossData.total, sectionType);

    // คำนวณระดับความเหมาะสม
    const isTypeAllowed = allowedTypes.includes(pipe.pipeType);
    const isVelocityOK = velocity >= 0.3 && velocity <= 3.5;
    
    return {
        ...pipe,
        score: formatNumber(score, 1),
        velocity: formatNumber(velocity, 3),
        headLoss: formatNumber(headLossData.total, 3),
        optimalSize: formatNumber(optimalSize, 1),
        isRecommended: score >= 70 && isTypeAllowed && isVelocityOK,
        isGoodChoice: score >= 50 && isTypeAllowed && isVelocityOK,
        isUsable: score >= 30 && isVelocityOK,
        isTypeAllowed,
    };
};