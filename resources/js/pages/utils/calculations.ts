// resources\js\pages\utils\calculations.ts
export const calculatePipeRolls = (totalLength: number, rollLength: number): number => {
    return Math.ceil(totalLength / rollLength);
};

export const getAdjustedC = (pipeType: string, age: number): number => {
    const baseC =
        {
            'HDPE PE 100': 145,
            'HDPE PE 80': 140,
            LDPE: 135,
            PVC: 150,
            'PE-RT': 145,
            'Flexible PE': 130,
        }[pipeType] || 135;

    return Math.max(100, baseC - age * 1.5);
};
export const getMinorLossRatio = (sectionType: string, velocity: number): number => {
    const baseRatios = {
        branch: 0.25,
        secondary: 0.2,
        main: 0.15,
    };

    const baseRatio = baseRatios[sectionType as keyof typeof baseRatios] || 0.2;

    let velocityFactor = 1.0;
    if (velocity > 2.0) velocityFactor = 1.3;
    else if (velocity > 1.5) velocityFactor = 1.15;
    else if (velocity > 1.0) velocityFactor = 1.05;

    return baseRatio * velocityFactor;
};

export const calculateImprovedHeadLoss = (
    flow_lpm: number,
    diameter_mm: number,
    length_m: number,
    pipeType: string,
    sectionType: string,
    pipeAgeYears: number
) => {
    const Q = flow_lpm / 60000;
    const D = diameter_mm / 1000;
    const C = getAdjustedC(pipeType, pipeAgeYears);

    const A = Math.PI * Math.pow(D / 2, 2);
    const velocity = A > 0 ? Q / A : 0;

    const majorLoss =
        (10.67 * length_m * Math.pow(Q, 1.852)) / (Math.pow(C, 1.852) * Math.pow(D, 4.87));

    const velocityHead = Math.pow(velocity, 2) / (2 * 9.81);

    const minorLossRatio = getMinorLossRatio(sectionType, velocity);
    let minorLoss = majorLoss * minorLossRatio;

    if (sectionType === 'main') {
        const entranceLoss = 0.5 * velocityHead;
        const exitLoss = 1.0 * velocityHead;
        minorLoss += entranceLoss + exitLoss;
    }

    if (sectionType === 'branch') {
        const fittingLoss = velocityHead * 2.0;
        minorLoss += fittingLoss;
    }

    return {
        major: majorLoss,
        minor: minorLoss,
        total: majorLoss + minorLoss,
        velocity: velocity,
        velocityHead: velocityHead,
        C: C,
    };
};

export const checkVelocity = (velocity: number, section: string): string => {
    if (velocity > 3.5)
        return `🔴 ${section}: ความเร็วสูงเกินไป (${velocity.toFixed(3)} m/s) - เสี่ยง water hammer`;
    if (velocity > 2.5)
        return `🟡 ${section}: ความเร็วสูง (${velocity.toFixed(3)} m/s) - ควรพิจารณาเพิ่มขนาดท่อ`;
    if (velocity < 0.3)
        return `🔵 ${section}: ความเร็วต่ำ (${velocity.toFixed(3)} m/s) - อาจมีการตกตะกอน`;
    if (velocity >= 0.8 && velocity <= 2.0)
        return `🟢 ${section}: ความเร็วเหมาะสม (${velocity.toFixed(3)} m/s)`;
    return `🟡 ${section}: ความเร็วใช้ได้ (${velocity.toFixed(3)} m/s)`;
};

export const getVelocityScore = (velocity: number): number => {
    if (velocity >= 0.8 && velocity <= 2.0) return 50;
    if (velocity >= 0.6 && velocity <= 2.5) return 45;
    if (velocity >= 0.4 && velocity <= 3.0) return 35;
    if (velocity >= 0.3 && velocity <= 3.5) return 25;
    return 10;
};

export const getSizeScore = (pipeSize: number, optimalSize: number, flowLPM: number): number => {
    const sizeRatio = pipeSize / optimalSize;

    const standardSizes = [16, 20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 140, 160, 200, 250, 315];
    const isStandardSize = standardSizes.includes(pipeSize);

    let score = 0;

    if (sizeRatio >= 0.9 && sizeRatio <= 1.1) score = 35;
    else if (sizeRatio >= 0.8 && sizeRatio <= 1.3) score = 30;
    else if (sizeRatio >= 0.7 && sizeRatio <= 1.5) score = 25;
    else if (sizeRatio >= 0.6 && sizeRatio <= 2.0) score = 15;
    else score = 5;

    if (isStandardSize) score += 5;

    if (sizeRatio > 1.5) score -= 10;

    return Math.max(0, score);
};

export const getCostEfficiencyScore = (pipe: any, pipeType: string): number => {
    const costPerMeterPerMM = pipe.price / (pipe.lengthM * pipe.sizeMM);

    const thresholds = {
        branch: { excellent: 0.3, good: 0.8, average: 1.5 },
        secondary: { excellent: 0.8, good: 1.5, average: 3.0 },
        main: { excellent: 1.5, good: 3.0, average: 6.0 },
    }[pipeType] || { excellent: 0.8, good: 1.5, average: 3.0 };

    if (costPerMeterPerMM <= thresholds.excellent) return 15;
    if (costPerMeterPerMM <= thresholds.good) return 12;
    if (costPerMeterPerMM <= thresholds.average) return 8;
    return 3;
};

export const getHeadLossScore = (headLoss: number, pipeType: string, length: number): number => {
    const headLossPer100m = (headLoss / length) * 100;

    const thresholds = {
        branch: { excellent: 2.0, good: 5.0, average: 10.0 },
        secondary: { excellent: 1.5, good: 3.0, average: 6.0 },
        main: { excellent: 1.0, good: 2.0, average: 4.0 },
    }[pipeType] || { excellent: 1.5, good: 3.0, average: 6.0 };

    if (headLossPer100m <= thresholds.excellent) return 15;
    if (headLossPer100m <= thresholds.good) return 12;
    if (headLossPer100m <= thresholds.average) return 8;
    return 3;
};

export const calculateOptimalPipeSize = (
    flow_lpm: number,
    targetVelocity: number = 1.5
): number => {
    const Q = flow_lpm / 60000;
    const V = targetVelocity;
    const D = 2 * Math.sqrt(Q / (Math.PI * V));
    const sizeInMM = D * 1000;

    const standardSizes = [16, 20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 140, 160, 200, 250, 315];
    return (
        standardSizes.find((size) => size >= sizeInMM) || standardSizes[standardSizes.length - 1]
    );
};

export const formatWaterFlow = (waterFlow: any) => {
    if (Array.isArray(waterFlow)) return `${waterFlow[0]}-${waterFlow[1]}`;
    if (typeof waterFlow === 'string' && waterFlow.includes('-')) return waterFlow;
    return waterFlow ? waterFlow.toString() : '0';
};

export const formatRadius = (radius: any) => {
    if (Array.isArray(radius)) return `${radius[0]}-${radius[1]}`;
    if (typeof radius === 'string' && radius.includes('-')) return radius;
    return radius ? radius.toString() : '0';
};

export const parseRangeValue = (value: any): [number, number] | number => {
    if (value === null || value === undefined || value === '') return 0;

    if (Array.isArray(value)) {
        if (value.length === 2 && value.every((v) => typeof v === 'number' || !isNaN(Number(v)))) {
            return [Number(value[0]), Number(value[1])];
        }
        if (value.length === 1) return Number(value[0]) || 0;
        if (value.length > 2) return [Number(value[0]), Number(value[value.length - 1])];
        return 0;
    }

    if (typeof value === 'string') {
        const separators = ['-', ',', '~', '–', '—'];

        for (const separator of separators) {
            if (value.includes(separator) && !value.startsWith('-')) {
                const parts = value
                    .split(separator)
                    .map((v) => {
                        const cleaned = v.trim().replace(/[^\d.]/g, '');
                        return parseFloat(cleaned);
                    })
                    .filter((v) => !isNaN(v));

                if (parts.length >= 2) return [parts[0], parts[parts.length - 1]];
                if (parts.length === 1) return parts[0];
            }
        }

        const cleaned = value.trim().replace(/[^\d.]/g, '');
        const numValue = parseFloat(cleaned);
        return isNaN(numValue) ? 0 : numValue;
    }

    if (typeof value === 'number') return isNaN(value) ? 0 : value;

    const numValue = parseFloat(String(value));
    return isNaN(numValue) ? 0 : numValue;
};

export const formatNumber = (value: number, decimals: number = 3): number => {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export const evaluatePipeOverall = (
    pipe: any,
    flow_lpm: number,
    length_m: number,
    sectionType: string,
    pipeAgeYears: number,
    allowedTypes: string[] = []
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
    const optimalSize = calculateOptimalPipeSize(flow_lpm);

    const velocityScore = getVelocityScore(velocity);
    score += velocityScore;

    const sizeScore = getSizeScore(pipe.sizeMM, optimalSize, flow_lpm);
    score += sizeScore;

    const headLossScore = getHeadLossScore(headLossData.total, sectionType, length_m);
    score += headLossScore;

    const costScore = getCostEfficiencyScore(pipe, sectionType);
    score += costScore;

    const typeAllowed = allowedTypes.length === 0 || allowedTypes.includes(pipe.pipeType);
    const typeScore = typeAllowed ? 5 : 0;
    score += typeScore;

    const isVelocityOK = velocity >= 0.3 && velocity <= 3.5;
    const isPressureRatingOK = pipe.pn >= 6;
    const isReasonablyPriced = pipe.price > 0 && pipe.price < 50000;

    const debugInfo = {
        velocityScore: velocityScore,
        sizeScore: sizeScore,
        headLossScore: headLossScore,
        costScore: costScore,
        typeScore: typeScore,
        velocityValue: velocity,
        isVelocityOK: isVelocityOK,
        typeAllowed: typeAllowed,
        allowedTypesList: allowedTypes,
        actualPipeType: pipe.pipeType,
        costPerMeterPerMM: pipe.price / (pipe.lengthM * pipe.sizeMM),
        optimalSizeCalculated: optimalSize,
        headLossPer100m: (headLossData.total / length_m) * 100,
        reasonNotRecommended: [] as string[],
    };

    const totalScore = formatNumber(score, 1);
    const isRecommended = totalScore >= 65 && typeAllowed && isVelocityOK && isPressureRatingOK;
    const isGoodChoice = totalScore >= 45 && typeAllowed && isVelocityOK;
    const isUsable = totalScore >= 25 && isVelocityOK;

    if (!isRecommended) {
        if (totalScore < 65) debugInfo.reasonNotRecommended.push(`คะแนนต่ำ (${totalScore}/65)`);
        if (!typeAllowed) debugInfo.reasonNotRecommended.push(`ประเภทท่อไม่เหมาะสม`);
        if (!isVelocityOK)
            debugInfo.reasonNotRecommended.push(
                `ความเร็วน้ำไม่เหมาะสม (${velocity.toFixed(3)} m/s)`
            );
        if (!isPressureRatingOK)
            debugInfo.reasonNotRecommended.push(`ความดันจำนวนไม่เพียงพอ (PN${pipe.pn})`);
    }

    return {
        ...pipe,
        score: totalScore,
        velocity: formatNumber(velocity, 3),
        headLoss: formatNumber(headLossData.total, 3),
        optimalSize: formatNumber(optimalSize, 1),
        isRecommended: isRecommended,
        isGoodChoice: isGoodChoice,
        isUsable: isUsable,
        isTypeAllowed: typeAllowed,
        debugInfo: debugInfo,
    };
};

export const evaluateSprinklerOverall = (sprinkler: any, targetFlow: number) => {
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

    const flowMatchRatio = targetFlow / ((minFlow + maxFlow) / 2);
    if (targetFlow >= minFlow && targetFlow <= maxFlow) {
        if (flowMatchRatio >= 0.8 && flowMatchRatio <= 1.2) score += 50;
        else score += 40;
    } else if (targetFlow >= minFlow * 0.8 && targetFlow <= maxFlow * 1.2) {
        score += 30;
    } else if (targetFlow >= minFlow * 0.6 && targetFlow <= maxFlow * 1.5) {
        score += 15;
    } else {
        score += 5;
    }

    const avgFlow = (minFlow + maxFlow) / 2;
    const pricePerFlow = sprinkler.price / avgFlow;
    if (pricePerFlow < 0.5) score += 25;
    else if (pricePerFlow < 1.0) score += 20;
    else if (pricePerFlow < 2.0) score += 15;
    else if (pricePerFlow < 5.0) score += 10;
    else score += 5;

    const avgRadius = (minRadius + maxRadius) / 2;
    if (avgRadius >= 8) score += 15;
    else if (avgRadius >= 5) score += 12;
    else if (avgRadius >= 3) score += 8;
    else score += 5;

    const pressureRangeSize = maxPressure - minPressure;
    if (pressureRangeSize >= 3) score += 10;
    else if (pressureRangeSize >= 2) score += 8;
    else if (pressureRangeSize >= 1) score += 6;
    else score += 4;

    const totalScore = formatNumber(score, 1);

    return {
        ...sprinkler,
        score: totalScore,
        flowMatch: targetFlow >= minFlow && targetFlow <= maxFlow,
        flowCloseMatch: targetFlow >= minFlow * 0.8 && targetFlow <= maxFlow * 1.2,
        isRecommended:
            totalScore >= 70 && targetFlow >= minFlow * 0.9 && targetFlow <= maxFlow * 1.1,
        isGoodChoice:
            totalScore >= 50 && targetFlow >= minFlow * 0.8 && targetFlow <= maxFlow * 1.2,
        isUsable: totalScore >= 30 && targetFlow >= minFlow * 0.6 && targetFlow <= maxFlow * 1.4,
        targetFlow: formatNumber(targetFlow, 3),
        minFlow: formatNumber(minFlow, 3),
        maxFlow: formatNumber(maxFlow, 3),
        avgRadius: formatNumber(avgRadius, 3),
        pricePerFlow: formatNumber(pricePerFlow, 3),
    };
};

export const evaluatePumpOverall = (pump: any, requiredFlow: number, requiredHead: number) => {
    const maxFlow =
        pump.max_flow_rate_lpm || (Array.isArray(pump.flow_rate_lpm) ? pump.flow_rate_lpm[1] : 0);
    const maxHead = pump.max_head_m || (Array.isArray(pump.head_m) ? pump.head_m[0] : 0);

    let score = 0;

    if (maxFlow >= requiredFlow) {
        const flowRatio = maxFlow / requiredFlow;
        if (flowRatio >= 1.1 && flowRatio <= 1.8) score += 35;
        else if (flowRatio >= 1.05 && flowRatio <= 2.2) score += 30;
        else if (flowRatio >= 1.0 && flowRatio <= 2.8) score += 20;
        else score += 10;
    }

    if (maxHead >= requiredHead) {
        const headRatio = maxHead / requiredHead;
        if (headRatio >= 1.1 && headRatio <= 1.8) score += 35;
        else if (headRatio >= 1.05 && headRatio <= 2.2) score += 30;
        else if (headRatio >= 1.0 && headRatio <= 2.8) score += 20;
        else score += 10;
    }

    const flowPerBaht = maxFlow / pump.price;
    if (flowPerBaht > 0.3) score += 20;
    else if (flowPerBaht > 0.2) score += 15;
    else if (flowPerBaht > 0.1) score += 10;
    else if (flowPerBaht > 0.05) score += 5;
    else score += 2;

    const powerHP = parseFloat(String(pump.powerHP).replace(/[^0-9.]/g, '')) || 0;
    const estimatedHP = (requiredFlow * requiredHead) / 3000;
    const powerRatio = powerHP / estimatedHP;
    if (powerRatio >= 1.0 && powerRatio <= 2.0) score += 10;
    else if (powerRatio >= 0.8 && powerRatio <= 2.5) score += 7;
    else if (powerRatio >= 0.6 && powerRatio <= 3.0) score += 4;
    else score += 1;

    const totalScore = formatNumber(score, 1);

    return {
        ...pump,
        score: totalScore,
        maxFlow: formatNumber(maxFlow, 3),
        maxHead: formatNumber(maxHead, 3),
        powerHP: formatNumber(powerHP, 1),
        flowRatio: formatNumber(maxFlow / requiredFlow, 3),
        headRatio: formatNumber(maxHead / requiredHead, 3),
        flowPerBaht: formatNumber(flowPerBaht, 4),
        estimatedHP: formatNumber(estimatedHP, 3),
        isFlowAdequate: maxFlow >= requiredFlow,
        isHeadAdequate: maxHead >= requiredHead,
        isRecommended: totalScore >= 70 && maxFlow >= requiredFlow && maxHead >= requiredHead,
        isGoodChoice: totalScore >= 50 && maxFlow >= requiredFlow && maxHead >= requiredHead,
        isUsable: totalScore >= 30 && maxFlow >= requiredFlow && maxHead >= requiredHead,
    };
};

export const sortForDropdown = (allItems: any[], recommendedItems: any[]) => {
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

export const selectBestEquipmentByPrice = (
    equipmentList: any[],
    preferHighPrice: boolean = false
): any => {
    if (!equipmentList || equipmentList.length === 0) return null;

    const recommended = equipmentList.filter((item) => item.isRecommended);
    const goodChoice = equipmentList.filter((item) => item.isGoodChoice && !item.isRecommended);
    const usable = equipmentList.filter(
        (item) => item.isUsable && !item.isGoodChoice && !item.isRecommended
    );

    let targetGroup =
        recommended.length > 0
            ? recommended
            : goodChoice.length > 0
              ? goodChoice
              : usable.length > 0
                ? usable
                : equipmentList;

    return targetGroup.sort((a, b) => a.price - b.price)[0];
};

export const detectSignificantInputChanges = (
    oldInput: any,
    newInput: any,
    threshold: number = 0.15
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

export const flattenEquipmentAttributes = (equipment: any): any => {
    const flattened = { ...equipment };

    if (equipment.attributes && typeof equipment.attributes === 'object') {
        Object.keys(equipment.attributes).forEach((key) => {
            if (!flattened[key]) {
                flattened[key] = equipment.attributes[key];
            }
        });
    }

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

export const normalizeEquipmentData = (
    equipment: any,
    categoryType: 'sprinkler' | 'pump' | 'pipe'
): any => {
    const flattened = flattenEquipmentAttributes(equipment);

    const normalized = {
        ...flattened,
        productCode: flattened.product_code || flattened.productCode,
        product_code: flattened.product_code || flattened.productCode,
        price: Number(flattened.price || 0),
        is_active: Boolean(flattened.is_active),
    };

    switch (categoryType) {
        case 'sprinkler':
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
            const numericFields = [
                'powerHP',
                'powerKW',
                'phase',
                'inlet_size_inch',
                'outlet_size_inch',
                'max_head_m',
                'max_flow_rate_lpm',
                'suction_depth_m',
                'weight_kg',
            ];
            numericFields.forEach((field) => {
                if (normalized[field] !== undefined) {
                    normalized[field] = Number(normalized[field]) || 0;
                }
            });

            const rangeFields = ['flow_rate_lpm', 'head_m'];
            rangeFields.forEach((field) => {
                if (normalized[field] !== undefined) {
                    normalized[field] = parseRangeValue(normalized[field]);
                }
            });
            break;

        case 'pipe':
            if (normalized.pn !== undefined) {
                normalized.pn = Number(normalized.pn) || 0;
            }
            if (normalized.sizeMM !== undefined) {
                normalized.sizeMM = Number(normalized.sizeMM) || 0;
            }
            if (normalized.lengthM !== undefined) {
                normalized.lengthM = Number(normalized.lengthM) || 0;
            }
            break;
    }

    return normalized;
};
