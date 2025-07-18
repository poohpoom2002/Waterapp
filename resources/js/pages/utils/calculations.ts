// resources\js\pages\utils\calculations.ts

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
export const calculateOptimalPipeSize = (
    flow_lpm: number,
    targetVelocity: number = 1.5
): number => {
    // Q = A × V
    // A = π × (D/2)²
    // D = 2 × sqrt(Q / (π × V))

    const Q = flow_lpm / 60000; // m³/s
    const V = targetVelocity; // m/s
    const D = 2 * Math.sqrt(Q / (Math.PI * V)); // meters
    const D_mm = D * 1000; // millimeters

    return D_mm;
};

// ฟังก์ชันจัดรูปแบบข้อมูลสำหรับ Database format
export const formatWaterFlow = (waterFlow: any) => {
    if (Array.isArray(waterFlow)) {
        return `${waterFlow[0]}-${waterFlow[1]}`;
    } else if (typeof waterFlow === 'string' && waterFlow.includes('-')) {
        return waterFlow;
    }
    return waterFlow ? waterFlow.toString() : '0';
};

export const formatRadius = (radius: any) => {
    if (Array.isArray(radius)) {
        return `${radius[0]}-${radius[1]}`;
    } else if (typeof radius === 'string' && radius.includes('-')) {
        return radius;
    }
    return radius ? radius.toString() : '0';
};

// ฟังก์ชันแปลงข้อมูลจาก string เป็น array (สำหรับข้อมูลจาก database) - แก้ไขการ handle
export const parseRangeValue = (value: any): [number, number] | number => {
    // แก้ไข: handle null และ undefined
    if (value === null || value === undefined || value === '') {
        return 0;
    }

    if (Array.isArray(value)) {
        if (value.length === 2 && value.every((v) => typeof v === 'number' || !isNaN(Number(v)))) {
            return [Number(value[0]), Number(value[1])];
        } else if (value.length === 1) {
            return Number(value[0]) || 0;
        } else if (value.length > 2) {
            // ถ้ามี array มากกว่า 2 ตัว ให้เอาตัวแรกและตัวสุดท้าย
            return [Number(value[0]), Number(value[value.length - 1])];
        }
        return 0;
    }

    if (typeof value === 'string') {
        // แก้ไข: handle หลายรูปแบบของ range
        if (value.includes('-') && !value.startsWith('-')) {
            const parts = value
                .split('-')
                .map((v) => {
                    const cleaned = v.trim().replace(/[^\d.]/g, ''); // เอาเฉพาะตัวเลขและจุด
                    return parseFloat(cleaned);
                })
                .filter((v) => !isNaN(v));

            if (parts.length === 2) {
                return [parts[0], parts[1]];
            } else if (parts.length === 1) {
                return parts[0];
            }
        } else if (value.includes(',')) {
            const parts = value
                .split(',')
                .map((v) => {
                    const cleaned = v.trim().replace(/[^\d.]/g, '');
                    return parseFloat(cleaned);
                })
                .filter((v) => !isNaN(v));

            if (parts.length >= 2) {
                return [parts[0], parts[parts.length - 1]];
            } else if (parts.length === 1) {
                return parts[0];
            }
        } else if (value.includes('~') || value.includes('–') || value.includes('—')) {
            // Handle different dash types
            const separator = value.includes('~') ? '~' : value.includes('–') ? '–' : '—';
            const parts = value
                .split(separator)
                .map((v) => {
                    const cleaned = v.trim().replace(/[^\d.]/g, '');
                    return parseFloat(cleaned);
                })
                .filter((v) => !isNaN(v));

            if (parts.length >= 2) {
                return [parts[0], parts[parts.length - 1]];
            } else if (parts.length === 1) {
                return parts[0];
            }
        } else {
            // แก้ไข: clean string before parsing
            const cleaned = value.trim().replace(/[^\d.]/g, '');
            const numValue = parseFloat(cleaned);
            return isNaN(numValue) ? 0 : numValue;
        }
    }

    if (typeof value === 'number') {
        return isNaN(value) ? 0 : value;
    }

    // แก้ไข: try to convert other types
    const numValue = parseFloat(String(value));
    return isNaN(numValue) ? 0 : numValue;
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

// ฟังก์ชันใหม่สำหรับประเมินท่อโดยรวม (ปรับปรุงใหม่ - รองรับ Database format)
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
    if (allowedTypes.length === 0 || allowedTypes.includes(pipe.pipeType)) {
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
    const isTypeAllowed = allowedTypes.length === 0 || allowedTypes.includes(pipe.pipeType);
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

// ฟังก์ชันใหม่สำหรับประเมินสปริงเกอร์ (รองรับ Database format)
export const evaluateSprinklerOverall = (sprinkler: any, targetFlow: number) => {
    // แปลงข้อมูลจาก Database format
    const flowRange = parseRangeValue(sprinkler.waterVolumeLitersPerHour);
    const radiusRange = parseRangeValue(sprinkler.radiusMeters);
    const pressureRange = parseRangeValue(sprinkler.pressureBar);

    let minFlow, maxFlow, minRadius, maxRadius, minPressure, maxPressure;

    if (Array.isArray(flowRange)) {
        [minFlow, maxFlow] = flowRange;
    } else {
        minFlow = maxFlow = flowRange;
    }

    if (Array.isArray(radiusRange)) {
        [minRadius, maxRadius] = radiusRange;
    } else {
        minRadius = maxRadius = radiusRange;
    }

    if (Array.isArray(pressureRange)) {
        [minPressure, maxPressure] = pressureRange;
    } else {
        minPressure = maxPressure = pressureRange;
    }

    let score = 0;

    // คะแนนความเหมาะสมของอัตราการไหล (50%)
    if (targetFlow >= minFlow && targetFlow <= maxFlow) {
        const flowRangeSize = maxFlow - minFlow;
        const positionInRange = flowRangeSize > 0 ? (targetFlow - minFlow) / flowRangeSize : 0.5;

        if (positionInRange >= 0.3 && positionInRange <= 0.7) {
            score += 50;
        } else {
            score += 40;
        }
    } else if (targetFlow >= minFlow * 0.8 && targetFlow <= maxFlow * 1.2) {
        score += 30;
    } else if (targetFlow >= minFlow * 0.6 && targetFlow <= maxFlow * 1.5) {
        score += 15;
    } else {
        score += 5;
    }

    // คะแนนราคาต่อประสิทธิภาพ (25%)
    const avgFlow = (minFlow + maxFlow) / 2;
    const pricePerFlow = sprinkler.price / avgFlow;

    if (pricePerFlow < 1) {
        score += 25;
    } else if (pricePerFlow < 2) {
        score += 20;
    } else if (pricePerFlow < 5) {
        score += 15;
    } else if (pricePerFlow < 10) {
        score += 10;
    } else {
        score += 5;
    }

    // คะแนนรัศมีการกระจาย (15%)
    const avgRadius = (minRadius + maxRadius) / 2;

    if (avgRadius >= 8) {
        score += 15;
    } else if (avgRadius >= 5) {
        score += 12;
    } else if (avgRadius >= 3) {
        score += 8;
    } else {
        score += 5;
    }

    // คะแนนความหลากหลายของแรงดัน (10%)
    const pressureRangeSize = maxPressure - minPressure;

    if (pressureRangeSize >= 3) {
        score += 10;
    } else if (pressureRangeSize >= 2) {
        score += 8;
    } else if (pressureRangeSize >= 1) {
        score += 6;
    } else {
        score += 4;
    }

    return {
        ...sprinkler,
        score: formatNumber(score, 1),
        flowMatch: targetFlow >= minFlow && targetFlow <= maxFlow,
        flowCloseMatch: targetFlow >= minFlow * 0.8 && targetFlow <= maxFlow * 1.2,
        isRecommended: score >= 60 && targetFlow >= minFlow * 0.9 && targetFlow <= maxFlow * 1.1,
        isGoodChoice: score >= 40 && targetFlow >= minFlow * 0.8 && targetFlow <= maxFlow * 1.2,
        isUsable: score >= 20 && targetFlow >= minFlow * 0.6 && targetFlow <= maxFlow * 1.4,
        targetFlow: formatNumber(targetFlow, 3),
        minFlow: formatNumber(minFlow, 3),
        maxFlow: formatNumber(maxFlow, 3),
        avgRadius: formatNumber(avgRadius, 3),
        pricePerFlow: formatNumber(pricePerFlow, 3),
    };
};

// ฟังก์ชันใหม่สำหรับประเมินปั๊ม (รองรับ Database format)
export const evaluatePumpOverall = (pump: any, requiredFlow: number, requiredHead: number) => {
    // แปลงข้อมูลจาก Database format
    const maxFlow =
        pump.max_flow_rate_lpm || (Array.isArray(pump.flow_rate_lpm) ? pump.flow_rate_lpm[1] : 0);
    const maxHead = pump.max_head_m || (Array.isArray(pump.head_m) ? pump.head_m[0] : 0);

    let score = 0;

    // คะแนนความเหมาะสมของอัตราการไหล (40%)
    if (maxFlow >= requiredFlow) {
        const flowRatio = maxFlow / requiredFlow;

        if (flowRatio >= 1.1 && flowRatio <= 2.0) {
            score += 40;
        } else if (flowRatio >= 1.05 && flowRatio <= 2.5) {
            score += 30;
        } else if (flowRatio >= 1.0 && flowRatio <= 3.0) {
            score += 20;
        } else {
            score += 5;
        }
    } else {
        score += 0;
    }

    // คะแนนความเหมาะสมของ Head (35%)
    if (maxHead >= requiredHead) {
        const headRatio = maxHead / requiredHead;

        if (headRatio >= 1.1 && headRatio <= 2.0) {
            score += 35;
        } else if (headRatio >= 1.05 && headRatio <= 2.5) {
            score += 25;
        } else if (headRatio >= 1.0 && headRatio <= 3.0) {
            score += 15;
        } else {
            score += 5;
        }
    } else {
        score += 0;
    }

    // คะแนนประสิทธิภาพต่อราคา (15%)
    const flowPerBaht = maxFlow / pump.price;

    if (flowPerBaht > 0.5) {
        score += 15;
    } else if (flowPerBaht > 0.3) {
        score += 12;
    } else if (flowPerBaht > 0.1) {
        score += 8;
    } else if (flowPerBaht > 0.05) {
        score += 5;
    } else {
        score += 2;
    }

    // คะแนนกำลังที่เหมาะสม (10%)
    const powerHP = parseFloat(String(pump.powerHP).replace(/[^0-9.]/g, '')) || 0;
    const estimatedHP = requiredFlow * requiredHead * 0.00027;
    const powerRatio = powerHP / estimatedHP;

    if (powerRatio >= 1.0 && powerRatio <= 2.5) {
        score += 10;
    } else if (powerRatio >= 0.8 && powerRatio <= 3.0) {
        score += 7;
    } else if (powerRatio >= 0.6 && powerRatio <= 4.0) {
        score += 4;
    } else {
        score += 1;
    }

    return {
        ...pump,
        score: formatNumber(score, 1),
        maxFlow: formatNumber(maxFlow, 3),
        maxHead: formatNumber(maxHead, 3),
        powerHP: formatNumber(powerHP, 1),
        flowRatio: formatNumber(maxFlow / requiredFlow, 3),
        headRatio: formatNumber(maxHead / requiredHead, 3),
        flowPerBaht: formatNumber(flowPerBaht, 3),
        estimatedHP: formatNumber(estimatedHP, 3),
        isFlowAdequate: maxFlow >= requiredFlow,
        isHeadAdequate: maxHead >= requiredHead,
        isRecommended: score >= 60 && maxFlow >= requiredFlow && maxHead >= requiredHead,
        isGoodChoice: score >= 40 && maxFlow >= requiredFlow && maxHead >= requiredHead,
        isUsable: score >= 20 && maxFlow >= requiredFlow && maxHead >= requiredHead,
    };
};

// ============= NEW ADVANCED FUNCTIONS =============

// ฟังก์ชันปรับปรุงสำหรับประเมินสปริงเกอร์ (รองรับการแนะนำที่แม่นยำขึ้น)
export const evaluateSprinklerAdvanced = (
    sprinkler: any,
    targetFlow: number,
    systemRequirements: {
        farmSize: number;
        numberOfZones: number;
        irrigationTime: number;
    }
) => {
    const baseEvaluation = evaluateSprinklerOverall(sprinkler, targetFlow);

    // เพิ่มคะแนนตามขนาดฟาร์ม
    let farmSizeBonus = 0;
    if (systemRequirements.farmSize <= 5) {
        // ฟาร์มเล็ก - เน้นประหยัด
        farmSizeBonus = sprinkler.price < 100 ? 10 : 0;
    } else if (systemRequirements.farmSize <= 20) {
        // ฟาร์มกลาง - เน้นสมดุล
        farmSizeBonus = sprinkler.price >= 50 && sprinkler.price <= 200 ? 15 : 0;
    } else {
        // ฟาร์มใหญ่ - เน้นคุณภาพ
        farmSizeBonus = sprinkler.price >= 100 ? 20 : 0;
    }

    // เพิ่มคะแนนตามจำนวนโซน
    let zoneBonus = 0;
    if (systemRequirements.numberOfZones > 3) {
        // ระบบใหญ่ต้องการความเชื่อถือได้
        zoneBonus =
            sprinkler.brand &&
            ['ไชโย', 'CHAIYYO', 'NETAFIM'].includes(sprinkler.brand.toUpperCase())
                ? 10
                : 0;
    }

    // คำนวณคะแนนรวม
    const finalScore = Math.min(100, baseEvaluation.score + farmSizeBonus + zoneBonus);

    return {
        ...baseEvaluation,
        score: formatNumber(finalScore, 1),
        farmSizeBonus,
        zoneBonus,
        isRecommended: finalScore >= 70 && baseEvaluation.flowMatch,
        isGoodChoice:
            finalScore >= 55 && (baseEvaluation.flowMatch || baseEvaluation.flowCloseMatch),
        isUsable: finalScore >= 35 && baseEvaluation.flowCloseMatch,
    };
};

// ฟังก์ชันปรับปรุงสำหรับประเมินปั๊ม (รองรับการแนะนำที่แม่นยำขึ้น)
export const evaluatePumpAdvanced = (
    pump: any,
    requiredFlow: number,
    requiredHead: number,
    systemRequirements: {
        numberOfZones: number;
        farmSize: number;
        simultaneousZones: number;
    }
) => {
    const baseEvaluation = evaluatePumpOverall(pump, requiredFlow, requiredHead);

    // เพิ่มคะแนนตามการใช้งานจริง
    let usageBonus = 0;

    // โบนัสสำหรับปั๊มที่มีประสิทธิภาพสูง
    if (
        baseEvaluation.flowRatio >= 1.2 &&
        baseEvaluation.flowRatio <= 2.0 &&
        baseEvaluation.headRatio >= 1.2 &&
        baseEvaluation.headRatio <= 2.0
    ) {
        usageBonus += 15; // ขนาดเหมาะสม
    }

    // โบนัสสำหรับระบบหลายโซน
    if (systemRequirements.numberOfZones > 1) {
        const powerHP = Number(pump.powerHP) || 0;
        const estimatedMinHP =
            requiredFlow * requiredHead * 0.00027 * systemRequirements.simultaneousZones;

        if (powerHP >= estimatedMinHP * 1.1 && powerHP <= estimatedMinHP * 2.5) {
            usageBonus += 10; // กำลังเหมาะสมสำหรับหลายโซน
        }
    }

    // โบนัสสำหรับแบรนด์ที่เชื่อถือได้
    if (
        pump.brand &&
        ['MITSUBISHI', 'GRUNDFOS', 'ไชโย', 'CHAIYYO'].includes(pump.brand.toUpperCase())
    ) {
        usageBonus += 5;
    }

    // โบนัสสำหรับปั๊มที่มี accessories ครบครัน
    if (pump.pumpAccessories && pump.pumpAccessories.length >= 3) {
        usageBonus += 5;
    }

    const finalScore = Math.min(100, baseEvaluation.score + usageBonus);

    return {
        ...baseEvaluation,
        score: formatNumber(finalScore, 1),
        usageBonus,
        isRecommended:
            finalScore >= 65 && baseEvaluation.isFlowAdequate && baseEvaluation.isHeadAdequate,
        isGoodChoice:
            finalScore >= 50 && baseEvaluation.isFlowAdequate && baseEvaluation.isHeadAdequate,
        isUsable:
            finalScore >= 30 && baseEvaluation.isFlowAdequate && baseEvaluation.isHeadAdequate,
    };
};

// ฟังก์ชันปรับปรุงสำหรับประเมินท่อ (รองรับการแนะนำที่แม่นยำขึ้น)
export const evaluatePipeAdvanced = (
    pipe: any,
    flow_lpm: number,
    length_m: number,
    sectionType: string,
    pipeAgeYears: number,
    allowedTypes: string[],
    systemRequirements: {
        farmSize: number;
        totalLength: number;
        pressureRequirement: number;
    }
) => {
    const baseEvaluation = evaluatePipeOverall(
        pipe,
        flow_lpm,
        length_m,
        sectionType,
        pipeAgeYears,
        allowedTypes
    );

    // เพิ่มคะแนนตามความเหมาะสมกับระบบ
    let systemBonus = 0;

    // โบนัสสำหรับขนาดระบบ
    if (systemRequirements.farmSize <= 10) {
        // ฟาร์มเล็ก - เน้นประหยัด
        if (pipe.price <= 500) systemBonus += 10;
    } else if (systemRequirements.farmSize <= 50) {
        // ฟาร์มกลาง - เน้นสมดุล
        if (pipe.price >= 300 && pipe.price <= 1000) systemBonus += 15;
    } else {
        // ฟาร์มใหญ่ - เน้นคุณภาพ
        if (pipe.price >= 500) systemBonus += 20;
    }

    // โบนัสสำหรับความดันสูง
    if (systemRequirements.pressureRequirement > 30 && pipe.pn >= 10) {
        systemBonus += 10;
    }

    // โบนัสสำหรับระยะทางยาว
    if (systemRequirements.totalLength > 1000 && pipe.lengthM >= 100) {
        systemBonus += 5; // ม้วนยาวลดจำนวนการต่อ
    }

    // โบนัสสำหรับประเภทท่อที่เหมาะสมกับ section
    let typeBonus = 0;
    switch (sectionType) {
        case 'branch':
            if (['LDPE', 'Flexible PE'].includes(pipe.pipeType)) typeBonus += 10;
            break;
        case 'secondary':
            if (['HDPE PE 80', 'HDPE PE 100'].includes(pipe.pipeType)) typeBonus += 15;
            break;
        case 'main':
            if (pipe.pipeType === 'HDPE PE 100') typeBonus += 20;
            break;
    }

    const finalScore = Math.min(100, baseEvaluation.score + systemBonus + typeBonus);

    return {
        ...baseEvaluation,
        score: formatNumber(finalScore, 1),
        systemBonus,
        typeBonus,
        isRecommended:
            finalScore >= 75 &&
            baseEvaluation.isTypeAllowed &&
            baseEvaluation.velocity >= 0.5 &&
            baseEvaluation.velocity <= 2.5,
        isGoodChoice:
            finalScore >= 60 &&
            baseEvaluation.isTypeAllowed &&
            baseEvaluation.velocity >= 0.3 &&
            baseEvaluation.velocity <= 3.0,
        isUsable:
            finalScore >= 40 && baseEvaluation.velocity >= 0.2 && baseEvaluation.velocity <= 3.5,
    };
};

// ฟังก์ชันหลักสำหรับเลือกอุปกรณ์ที่ดีที่สุด
export const selectBestEquipmentByPrice = (
    equipmentList: any[],
    preferHighPrice: boolean = true
): any => {
    if (!equipmentList || equipmentList.length === 0) return null;

    // แยกตามระดับคำแนะนำ
    const recommended = equipmentList.filter((item) => item.isRecommended);
    const goodChoice = equipmentList.filter((item) => item.isGoodChoice && !item.isRecommended);
    const usable = equipmentList.filter(
        (item) => item.isUsable && !item.isGoodChoice && !item.isRecommended
    );

    // เลือกจากกลุ่มที่ดีที่สุดที่มี
    const targetGroup =
        recommended.length > 0
            ? recommended
            : goodChoice.length > 0
              ? goodChoice
              : usable.length > 0
                ? usable
                : equipmentList;

    // เรียงตามราคา (สูงสุดหรือต่ำสุด)
    if (preferHighPrice) {
        return targetGroup.sort((a, b) => b.price - a.price)[0];
    } else {
        return targetGroup.sort((a, b) => a.price - b.price)[0];
    }
};

// ฟังก์ชันตรวจสอบความเปลี่ยนแปลงของ input ที่สำคัญ
export const detectSignificantInputChanges = (
    oldInput: any,
    newInput: any,
    threshold: number = 0.15 // 15% threshold
): boolean => {
    if (!oldInput || !newInput) return true;

    const significantFields = [
        'totalTrees',
        'waterPerTreeLiters',
        'numberOfZones',
        'farmSizeRai',
        'irrigationTimeMinutes',
    ];

    return significantFields.some((field) => {
        const oldValue = oldInput[field] || 0;
        const newValue = newInput[field] || 0;

        if (oldValue === 0 && newValue === 0) return false;
        if (oldValue === 0 || newValue === 0) return true;

        const changeRatio = Math.abs(newValue - oldValue) / oldValue;
        return changeRatio > threshold;
    });
};

// ============= HELPER FUNCTIONS =============

// ฟังก์ชันใหม่สำหรับ validation ข้อมูลจาก database
export const validateEquipmentData = (
    equipment: any,
    categoryType: 'sprinkler' | 'pump' | 'pipe'
): boolean => {
    if (
        !equipment ||
        !equipment.id ||
        !equipment.name ||
        equipment.price === null ||
        equipment.price === undefined
    ) {
        return false;
    }

    switch (categoryType) {
        case 'sprinkler':
            return !!(
                equipment.waterVolumeLitersPerHour &&
                equipment.radiusMeters &&
                equipment.pressureBar
            );
        case 'pump':
            return !!(equipment.powerHP && equipment.flow_rate_lpm && equipment.head_m);
        case 'pipe':
            return !!(equipment.pipeType && equipment.sizeMM && equipment.lengthM);
        default:
            return false;
    }
};

// ฟังก์ชันแปลง database attributes เป็น flat object
export const flattenEquipmentAttributes = (equipment: any): any => {
    const flattened = { ...equipment };

    // ถ้ามี attributes object ให้แปลงขึ้นมาใน root level
    if (equipment.attributes && typeof equipment.attributes === 'object') {
        Object.keys(equipment.attributes).forEach((key) => {
            if (!flattened[key]) {
                // ไม่เขียนทับถ้ามีอยู่แล้ว
                flattened[key] = equipment.attributes[key];
            }
        });
    }

    // ถ้ามี structured attributes (array format)
    if (Array.isArray(equipment.attributes)) {
        equipment.attributes.forEach((attr: any) => {
            if (attr.attribute_name && attr.value !== undefined) {
                if (!flattened[attr.attribute_name]) {
                    flattened[attr.attribute_name] = attr.value;
                }
            }
        });
    }

    return flattened;
};

// ฟังก์ชัน normalize equipment data เพื่อให้เข้ากันได้กับระบบเดิม
export const normalizeEquipmentData = (
    equipment: any,
    categoryType: 'sprinkler' | 'pump' | 'pipe'
): any => {
    const flattened = flattenEquipmentAttributes(equipment);

    // Ensure basic fields are correct
    const normalized = {
        ...flattened,
        productCode: flattened.product_code || flattened.productCode,
        product_code: flattened.product_code || flattened.productCode,
        price: Number(flattened.price || 0),
        is_active: Boolean(flattened.is_active),
    };

    // Category-specific normalization
    switch (categoryType) {
        case 'sprinkler':
            // Ensure required sprinkler fields are parsed correctly
            if (normalized.waterVolumeLitersPerHour) {
                normalized.waterVolumeLitersPerHour = parseRangeValue(
                    normalized.waterVolumeLitersPerHour
                );
            }
            if (normalized.radiusMeters) {
                normalized.radiusMeters = parseRangeValue(normalized.radiusMeters);
            }
            if (normalized.pressureBar) {
                normalized.pressureBar = parseRangeValue(normalized.pressureBar);
            }
            break;

        case 'pump':
            // Ensure required pump fields are parsed correctly
            if (normalized.powerHP) {
                normalized.powerHP = Number(normalized.powerHP);
            }
            if (normalized.flow_rate_lpm) {
                normalized.flow_rate_lpm = parseRangeValue(normalized.flow_rate_lpm);
            }
            if (normalized.head_m) {
                normalized.head_m = parseRangeValue(normalized.head_m);
            }
            if (normalized.max_flow_rate_lpm) {
                normalized.max_flow_rate_lpm = Number(normalized.max_flow_rate_lpm);
            }
            if (normalized.max_head_m) {
                normalized.max_head_m = Number(normalized.max_head_m);
            }
            break;

        case 'pipe':
            // Ensure required pipe fields are parsed correctly
            if (normalized.sizeMM) {
                normalized.sizeMM = Number(normalized.sizeMM);
            }
            if (normalized.lengthM) {
                normalized.lengthM = Number(normalized.lengthM);
            }
            if (normalized.pn) {
                normalized.pn = Number(normalized.pn);
            }
            break;
    }

    return normalized;
};

// ฟังก์ชันใหม่สำหรับการเปรียบเทียบอุปกรณ์
export const compareEquipment = (equipmentA: any, equipmentB: any, criteria: string[]): number => {
    let scoreA = 0;
    let scoreB = 0;

    criteria.forEach((criterion) => {
        switch (criterion) {
            case 'price':
                // Lower price gets higher score
                if (equipmentA.price < equipmentB.price) scoreA += 1;
                else if (equipmentB.price < equipmentA.price) scoreB += 1;
                break;
            case 'score':
                // Higher score wins
                if (equipmentA.score > equipmentB.score) scoreA += 1;
                else if (equipmentB.score > equipmentA.score) scoreB += 1;
                break;
            case 'brand':
                // Brand preference (could be customized)
                const preferredBrands = ['ไชโย', 'แชมป์'];
                const brandScoreA = preferredBrands.indexOf(equipmentA.brand) + 1;
                const brandScoreB = preferredBrands.indexOf(equipmentB.brand) + 1;
                if (brandScoreA > brandScoreB) scoreA += 1;
                else if (brandScoreB > brandScoreA) scoreB += 1;
                break;
        }
    });

    return scoreA - scoreB;
};

// ฟังก์ชันใหม่สำหรับสร้าง equipment recommendation summary
export const generateEquipmentSummary = (equipment: any, analysisResult: any): any => {
    return {
        id: equipment.id,
        productCode: equipment.productCode || equipment.product_code,
        name: equipment.name,
        brand: equipment.brand,
        price: equipment.price,
        image: equipment.image,
        score: analysisResult.score,
        isRecommended: analysisResult.isRecommended,
        isGoodChoice: analysisResult.isGoodChoice,
        isUsable: analysisResult.isUsable,
        reasons: generateRecommendationReasons(equipment, analysisResult),
        warnings: generateEquipmentWarnings(equipment, analysisResult),
    };
};

// ฟังก์ชันสร้างเหตุผลการแนะนำ
export const generateRecommendationReasons = (equipment: any, analysisResult: any): string[] => {
    const reasons: string[] = [];

    if (analysisResult.isRecommended) {
        reasons.push('🌟 แนะนำเป็นอันดับต้น');
    }

    if (analysisResult.score >= 80) {
        reasons.push('⭐ คะแนนประเมินสูงมาก');
    } else if (analysisResult.score >= 60) {
        reasons.push('✅ คะแนนประเมินดี');
    }

    if (analysisResult.flowMatch) {
        reasons.push('💧 อัตราการไหลเหมาะสม');
    }

    if (analysisResult.isFlowAdequate) {
        reasons.push('💨 ประสิทธิภาพการไหลเพียงพอ');
    }

    if (analysisResult.isHeadAdequate) {
        reasons.push('📈 ความสูงยกเพียงพอ');
    }

    if (
        analysisResult.velocity &&
        analysisResult.velocity >= 0.8 &&
        analysisResult.velocity <= 2.0
    ) {
        reasons.push('🎯 ความเร็วน้ำเหมาะสม');
    }

    return reasons;
};

// ฟังก์ชันสร้างคำเตือน
export const generateEquipmentWarnings = (equipment: any, analysisResult: any): string[] => {
    const warnings: string[] = [];

    if (!analysisResult.isUsable) {
        warnings.push('⚠️ ไม่เหมาะสมสำหรับระบบนี้');
    }

    if (analysisResult.velocity && analysisResult.velocity > 2.5) {
        warnings.push('🔴 ความเร็วน้ำสูงเกินไป อาจเกิด water hammer');
    }

    if (analysisResult.velocity && analysisResult.velocity < 0.3) {
        warnings.push('🔵 ความเร็วน้ำต่ำ อาจมีการตกตะกอน');
    }

    if (analysisResult.flowRatio && analysisResult.flowRatio > 3) {
        warnings.push('💰 ขนาดใหญ่เกินความต้องการ อาจสิ้นเปลืองพลังงาน');
    }

    if (!analysisResult.isFlowAdequate) {
        warnings.push('❌ อัตราการไหลไม่เพียงพอ');
    }

    if (!analysisResult.isHeadAdequate) {
        warnings.push('❌ ความสูงยกไม่เพียงพอ');
    }

    if (analysisResult.headLoss && analysisResult.headLoss > 10) {
        warnings.push('📉 Head loss สูง ควรพิจารณาขนาดท่อที่ใหญ่กว่า');
    }

    return warnings;
};

export const calculateCriticalPathFlow = (
    waterPerSprinklerLPM: number,
    systemConfig: {
        sprinklersPerLongestBranch: number;
        branchesPerLongestSecondary?: number;
        secondariesPerLongestMain?: number;
        hasSecondaryPipe: boolean;
        hasMainPipe: boolean;
    }
): {
    branchFlow: number;
    secondaryFlow: number;
    mainFlow: number;
    criticalFlow: number;
} => {
    // คำนวณ flow ในท่อย่อยเส้นที่ยาวที่สุด
    const branchFlow = waterPerSprinklerLPM * systemConfig.sprinklersPerLongestBranch;

    // คำนวณ flow ในท่อรองเส้นที่ยาวที่สุด
    const secondaryFlow =
        systemConfig.hasSecondaryPipe && systemConfig.branchesPerLongestSecondary
            ? branchFlow * systemConfig.branchesPerLongestSecondary
            : 0;

    // คำนวณ flow ในท่อเมนเส้นที่ยาวที่สุด
    const mainFlow =
        systemConfig.hasMainPipe && systemConfig.secondariesPerLongestMain
            ? systemConfig.hasSecondaryPipe
                ? secondaryFlow * systemConfig.secondariesPerLongestMain
                : branchFlow *
                  systemConfig.secondariesPerLongestMain *
                  (systemConfig.branchesPerLongestSecondary || 1)
            : 0;

    // หา flow สูงสุดสำหรับการเลือกปั๊ม
    const criticalFlow = Math.max(branchFlow, secondaryFlow, mainFlow);

    return {
        branchFlow,
        secondaryFlow,
        mainFlow,
        criticalFlow,
    };
};

// ฟังก์ชันคำนวณ Head Loss แบบละเอียดสำหรับ Critical Path
export const calculateCriticalPathHeadLoss = (
    flows: { branch: number; secondary: number; main: number },
    pipes: {
        branch?: any;
        secondary?: any;
        main?: any;
    },
    lengths: {
        branchM: number;
        secondaryM: number;
        mainM: number;
    },
    pipeAge: number = 0
): {
    branchLoss: any;
    secondaryLoss: any;
    mainLoss: any;
    totalLoss: number;
    criticalPathAnalysis: string[];
} => {
    const analysis: string[] = [];

    // คำนวณ Head Loss ท่อย่อย
    const branchLoss = pipes.branch
        ? calculateImprovedHeadLoss(
              flows.branch,
              pipes.branch.sizeMM,
              lengths.branchM,
              pipes.branch.pipeType,
              'branch',
              pipeAge
          )
        : { major: 0, minor: 0, total: 0, velocity: 0, C: 135 };

    if (pipes.branch) {
        analysis.push(
            `ท่อย่อย ${pipes.branch.sizeMM}mm: ${flows.branch.toFixed(1)} LPM → ${branchLoss.total.toFixed(2)}m loss`
        );
    }

    // คำนวณ Head Loss ท่อรอง
    const secondaryLoss = pipes.secondary
        ? calculateImprovedHeadLoss(
              flows.secondary,
              pipes.secondary.sizeMM,
              lengths.secondaryM,
              pipes.secondary.pipeType,
              'secondary',
              pipeAge
          )
        : { major: 0, minor: 0, total: 0, velocity: 0, C: 140 };

    if (pipes.secondary) {
        analysis.push(
            `ท่อรอง ${pipes.secondary.sizeMM}mm: ${flows.secondary.toFixed(1)} LPM → ${secondaryLoss.total.toFixed(2)}m loss`
        );
    }

    // คำนวณ Head Loss ท่อเมน
    const mainLoss = pipes.main
        ? calculateImprovedHeadLoss(
              flows.main,
              pipes.main.sizeMM,
              lengths.mainM,
              pipes.main.pipeType,
              'main',
              pipeAge
          )
        : { major: 0, minor: 0, total: 0, velocity: 0, C: 145 };

    if (pipes.main) {
        analysis.push(
            `ท่อเมน ${pipes.main.sizeMM}mm: ${flows.main.toFixed(1)} LPM → ${mainLoss.total.toFixed(2)}m loss`
        );
    }

    const totalLoss = branchLoss.total + secondaryLoss.total + mainLoss.total;
    analysis.push(`รวม Head Loss: ${totalLoss.toFixed(2)} เมตร`);

    return {
        branchLoss,
        secondaryLoss,
        mainLoss,
        totalLoss,
        criticalPathAnalysis: analysis,
    };
};

// ฟังก์ชันแนะนำขนาดท่อที่เหมาะสมตาม flow และประเภท
export const recommendPipeSize = (
    flow_lpm: number,
    pipeType: 'branch' | 'secondary' | 'main',
    targetVelocity: number = 1.5
): {
    recommendedSizeMM: number;
    minSizeMM: number;
    maxSizeMM: number;
    velocityRange: { min: number; max: number };
    reasoning: string;
} => {
    // คำนวณขนาดที่เหมาะสมตาม flow
    const optimalSizeMM = calculateOptimalPipeSize(flow_lpm, targetVelocity);

    // กำหนดช่วงขนาดตามประเภทท่อ
    let availableSizes: number[] = [];
    let reasoning = '';

    switch (pipeType) {
        case 'branch':
            availableSizes = [16, 20, 25, 32, 40, 50];
            reasoning = 'ท่อย่อย: เน้นความยืดหยุ่นและการติดตั้งง่าย';
            break;
        case 'secondary':
            availableSizes = [25, 32, 40, 50, 63, 75, 90, 110];
            reasoning = 'ท่อรอง: สมดุลระหว่างต้นทุนและประสิทธิภาพ';
            break;
        case 'main':
            availableSizes = [63, 75, 90, 110, 125, 140, 160, 200];
            reasoning = 'ท่อเมน: เน้นประสิทธิภาพและความคงทน';
            break;
    }

    // หาขนาดที่ใกล้เคียงที่สุด
    const recommendedSize = availableSizes.reduce((prev, curr) =>
        Math.abs(curr - optimalSizeMM) < Math.abs(prev - optimalSizeMM) ? curr : prev
    );

    // หาช่วงขนาดที่เหมาะสม (±1 ขนาด)
    const index = availableSizes.indexOf(recommendedSize);
    const minSize = availableSizes[Math.max(0, index - 1)];
    const maxSize = availableSizes[Math.min(availableSizes.length - 1, index + 1)];

    // คำนวณช่วงความเร็วสำหรับขนาดที่แนะนำ
    const Q = flow_lpm / 60000; // m³/s
    const D_recommended = recommendedSize / 1000; // m
    const A_recommended = Math.PI * Math.pow(D_recommended / 2, 2);
    const velocity_recommended = Q / A_recommended;

    const D_min = minSize / 1000;
    const A_min = Math.PI * Math.pow(D_min / 2, 2);
    const velocity_min = Q / A_min;

    const D_max = maxSize / 1000;
    const A_max = Math.PI * Math.pow(D_max / 2, 2);
    const velocity_max = Q / A_max;

    return {
        recommendedSizeMM: recommendedSize,
        minSizeMM: minSize,
        maxSizeMM: maxSize,
        velocityRange: {
            min: Math.min(velocity_min, velocity_max),
            max: Math.max(velocity_min, velocity_max),
        },
        reasoning,
    };
};

// ฟังก์ชันประเมินระบบโดยรวมและให้คำแนะนำ
export const evaluateSystemDesign = (
    input: any,
    results: any
): {
    overallScore: number;
    designQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
    recommendations: string[];
    warnings: string[];
    optimizations: string[];
} => {
    const recommendations: string[] = [];
    const warnings: string[] = [];
    const optimizations: string[] = [];
    let score = 100;

    // ประเมินความเร็วน้ำ
    const velocities = [
        results.velocity.branch,
        results.velocity.secondary,
        results.velocity.main,
    ].filter((v) => v > 0);

    velocities.forEach((velocity, index) => {
        const sectionName = ['ท่อย่อย', 'ท่อรอง', 'ท่อเมน'][index];
        if (velocity > 3.0) {
            warnings.push(
                `${sectionName}: ความเร็วสูงเกินไป (${velocity.toFixed(2)} m/s) - เสี่ยง water hammer`
            );
            score -= 15;
        } else if (velocity > 2.5) {
            warnings.push(`${sectionName}: ความเร็วค่อนข้างสูง (${velocity.toFixed(2)} m/s)`);
            score -= 5;
        } else if (velocity < 0.3) {
            warnings.push(
                `${sectionName}: ความเร็วต่ำเกินไป (${velocity.toFixed(2)} m/s) - เสี่ยงตะกอน`
            );
            score -= 10;
        } else if (velocity >= 0.8 && velocity <= 2.0) {
            recommendations.push(`${sectionName}: ความเร็วเหมาะสม (${velocity.toFixed(2)} m/s)`);
        }
    });

    // ประเมิน Head Loss
    const totalHeadLoss = results.headLoss.total;
    if (totalHeadLoss > 25) {
        warnings.push(`Head Loss สูงมาก (${totalHeadLoss.toFixed(1)}m) - ควรเพิ่มขนาดท่อ`);
        score -= 20;
        optimizations.push('พิจารณาใช้ท่อขนาดใหญ่ขึ้น 1-2 ขนาด');
    } else if (totalHeadLoss > 15) {
        warnings.push(`Head Loss ค่อนข้างสูง (${totalHeadLoss.toFixed(1)}m)`);
        score -= 10;
    } else if (totalHeadLoss <= 10) {
        recommendations.push(`Head Loss อยู่ในเกณฑ์ดี (${totalHeadLoss.toFixed(1)}m)`);
    }

    // ประเมินปั๊ม
    const pumpHead = results.pumpHeadRequired;
    if (pumpHead > 80) {
        warnings.push(`ความต้องการ Pump Head สูงมาก (${pumpHead.toFixed(1)}m)`);
        score -= 15;
        optimizations.push('พิจารณาแบ่งระบบเป็นหลายโซนเพื่อลด Head');
    } else if (pumpHead > 50) {
        warnings.push(`ความต้องการ Pump Head ค่อนข้างสูง (${pumpHead.toFixed(1)}m)`);
        score -= 5;
    }

    // ประเมินความซับซ้อนของระบบ
    const complexity = results.systemDesign?.complexity;
    if (complexity === 'complex') {
        recommendations.push('ระบบซับซ้อน: ต้องการการบำรุงรักษาที่ดี');
        optimizations.push('ติดตั้งวาล์วและเกจวัดแรงดันที่จุดสำคัญ');
    }

    // ประเมินความสมดุลของระบบ
    const flows = [results.flows.branch, results.flows.secondary, results.flows.main].filter(
        (f) => f > 0
    );
    const maxFlow = Math.max(...flows);
    const minFlow = Math.min(...flows);
    const flowRatio = maxFlow / minFlow;

    if (flowRatio > 10) {
        warnings.push('ความแตกต่างของ flow ระหว่างระดับมากเกินไป');
        score -= 10;
        optimizations.push('ปรับจำนวนสปริงเกอร์ให้สมดุลกันมากขึ้น');
    }

    // ประเมินต้นทุนประสิทธิภาพ
    if (results.bestSelections) {
        const totalCost = Object.values(results.bestSelections).reduce(
            (sum: number, item: any) => sum + (item?.price || 0),
            0
        );
        const efficiency = (results.totalWaterRequiredLPM / totalCost) * 1000; // LPM per 1000 baht

        if (efficiency > 5) {
            recommendations.push('ระบบมีประสิทธิภาพด้านต้นทุนดี');
        } else if (efficiency < 2) {
            optimizations.push('พิจารณาใช้อุปกรณ์ที่ประหยัดกว่าในกลุ่มเดียวกัน');
        }
    }

    // กำหนดระดับคุณภาพ
    let designQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
    if (score >= 90) {
        designQuality = 'excellent';
        recommendations.push('🌟 ระบบออกแบบได้ดีเยี่ยม');
    } else if (score >= 75) {
        designQuality = 'good';
        recommendations.push('✅ ระบบออกแบบได้ดี');
    } else if (score >= 60) {
        designQuality = 'acceptable';
        recommendations.push('⚠️ ระบบใช้ได้แต่ควรปรับปรุง');
    } else {
        designQuality = 'poor';
        warnings.push('❌ ระบบต้องการการปรับปรุงอย่างมาก');
    }

    return {
        overallScore: Math.max(0, score),
        designQuality,
        recommendations,
        warnings,
        optimizations,
    };
};

// ฟังก์ชันสร้างรายงานการวิเคราะห์ระบบ
export const generateSystemAnalysisReport = (
    input: any,
    results: any
): {
    executive_summary: string;
    technical_details: any;
    recommendations: any;
    cost_analysis: any;
    implementation_notes: string[];
} => {
    const evaluation = evaluateSystemDesign(input, results);
    const criticalFlows = results.detailedFlows || results.flows;

    const executive_summary = `
        ระบบชลประทานสำหรับฟาร์มขนาด ${input.farmSizeRai} ไร่ 
        จำนวนต้นไม้ ${input.totalTrees} ต้น แบ่งเป็น ${input.numberOfZones} โซน
        ความต้องการน้ำรวม ${results.totalWaterRequiredLPM.toFixed(1)} LPM
        คะแนนการออกแบบ: ${evaluation.overallScore}/100 (${evaluation.designQuality})
    `;

    const technical_details = {
        system_complexity: results.systemDesign?.complexity || 'medium',
        critical_path_flows: criticalFlows,
        head_loss_breakdown: results.headLoss,
        pump_requirements: {
            flow: Math.max(
                criticalFlows.longestBranchFlow,
                criticalFlows.longestSecondaryFlow,
                criticalFlows.longestMainFlow
            ),
            head: results.pumpHeadRequired,
            estimated_power:
                (
                    results.pumpHeadRequired *
                    Math.max(
                        criticalFlows.longestBranchFlow,
                        criticalFlows.longestSecondaryFlow,
                        criticalFlows.longestMainFlow
                    ) *
                    0.00027
                ).toFixed(1) + ' HP',
        },
        velocity_analysis: results.velocity,
    };

    const recommendations = {
        equipment: evaluation.recommendations,
        warnings: evaluation.warnings,
        optimizations: evaluation.optimizations,
    };

    const cost_analysis = {
        equipment_costs: results.bestSelections
            ? Object.entries(results.bestSelections).map(([type, item]: [string, any]) => ({
                  type,
                  item: item?.name || 'N/A',
                  price: item?.price || 0,
              }))
            : [],
        total_estimated_cost: results.bestSelections
            ? Object.values(results.bestSelections).reduce(
                  (sum: number, item: any) => sum + (item?.price || 0),
                  0
              )
            : 0,
        cost_per_tree: results.bestSelections
            ? (
                  Object.values(results.bestSelections).reduce(
                      (sum: number, item: any) => sum + (item?.price || 0),
                      0
                  ) / input.totalTrees
              ).toFixed(0) + ' บาท/ต้น'
            : 'N/A',
    };

    const implementation_notes = [
        'ติดตั้งวาล์วควบคุมที่จุดสำคัญ',
        'ใช้ filter ที่ระบบปั๊มเพื่อป้องกันการอุดตัน',
        'ตรวจสอบแรงดันน้ำในระบบเป็นประจำ',
        'บำรุงรักษาสปริงเกอร์ทุก 3-6 เดือน',
        'ควรมีระบบ backup สำหรับปั๊มหลัก',
        ...evaluation.optimizations,
    ];

    return {
        executive_summary,
        technical_details,
        recommendations,
        cost_analysis,
        implementation_notes,
    };
};
