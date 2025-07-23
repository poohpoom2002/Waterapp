// resources\js\pages\hooks\useCalculations.ts - แก้ไขการคำนวณให้ถูกต้อง
import { useMemo, useState, useEffect } from 'react';
import { IrrigationInput, CalculationResults } from '../types/interfaces';
import {
    calculatePipeRolls,
    calculateImprovedHeadLoss,
    checkVelocity,
    evaluatePipeOverall,
    evaluateSprinklerOverall,
    evaluatePumpOverall,
    formatNumber,
    parseRangeValue,
} from '../utils/calculations';

// Interface สำหรับ zone calculation data
export interface ZoneCalculationData {
    zoneId: string;
    input: IrrigationInput;
    sprinkler?: any;
}

// คำนวณแรงดันจาก sprinkler - ปรับให้ได้ค่าที่แม่นยำ
const calculateSprinklerPressure = (sprinkler: any, defaultPressure: number): number => {
    if (!sprinkler) return defaultPressure;

    try {
        let minPressure, maxPressure;
        const pressureData = sprinkler.pressureBar || sprinkler.pressure_bar;

        if (Array.isArray(pressureData)) {
            [minPressure, maxPressure] = pressureData;
        } else if (typeof pressureData === 'string' && pressureData.includes('-')) {
            const parts = pressureData.split('-');
            minPressure = parseFloat(parts[0]);
            maxPressure = parseFloat(parts[1]);
        } else {
            minPressure = maxPressure = parseFloat(String(pressureData));
        }

        if (isNaN(minPressure) || isNaN(maxPressure)) {
            return defaultPressure;
        }

        // ใช้ 80% ของแรงดันสูงสุดเพื่อประสิทธิภาพที่ดี
        const optimalPressureBar = minPressure + (maxPressure - minPressure) * 0.8;
        return optimalPressureBar * 10.2; // แปลง bar เป็น meter
    } catch (error) {
        console.error('Error calculating pressure from sprinkler:', error);
        return defaultPressure;
    }
};

// คำนวณอัตราการไหลจากสปริงเกอร์โดยตรง - แก้ไขให้มาจากสปริงเกอร์
const calculateSprinklerBasedFlow = (sprinkler: any, input: IrrigationInput) => {
    if (!sprinkler) {
        // ถ้าไม่มีสปริงเกอร์ ใช้การคำนวณแบบเดิม
        const totalWaterPerDay = input.totalTrees * input.waterPerTreeLiters;
        const irrigationHours = input.irrigationTimeMinutes / 60;
        const totalFlowLPH = totalWaterPerDay / irrigationHours;
        return {
            totalFlowLPH: formatNumber(totalFlowLPH, 1),
            totalFlowLPM: formatNumber(totalFlowLPH / 60, 1),
        };
    }

    try {
        // ใช้อัตราการไหลจากสปริงเกอร์โดยตรง
        let sprinklerFlowLPH;
        const flowData = sprinkler.waterVolumeLitersPerHour || sprinkler.waterVolumeL_H;

        if (Array.isArray(flowData)) {
            // ใช้ค่ากลางของช่วง
            sprinklerFlowLPH = (flowData[0] + flowData[1]) / 2;
        } else if (typeof flowData === 'string' && flowData.includes('-')) {
            const parts = flowData.split('-');
            const min = parseFloat(parts[0]);
            const max = parseFloat(parts[1]);
            sprinklerFlowLPH = (min + max) / 2;
        } else {
            sprinklerFlowLPH = parseFloat(String(flowData)) || 0;
        }

        if (sprinklerFlowLPH <= 0) {
            throw new Error('Invalid sprinkler flow rate');
        }

        // คำนวณจำนวนสปริงเกอร์ที่ต้องใช้
        const totalSprinklers = Math.ceil(input.totalTrees * input.sprinklersPerTree);

        // อัตราการไหลรวมจากสปริงเกอร์
        const totalFlowLPH = sprinklerFlowLPH * totalSprinklers;

        return {
            totalFlowLPH: formatNumber(totalFlowLPH, 1),
            totalFlowLPM: formatNumber(totalFlowLPH / 60, 1),
            sprinklerFlowLPH: formatNumber(sprinklerFlowLPH, 1),
            actualSprinklers: totalSprinklers,
        };
    } catch (error) {
        console.warn('Using fallback flow calculation:', error);
        // ใช้การคำนวณสำรองถ้าข้อมูลสปริงเกอร์ไม่ถูกต้อง
        const totalWaterPerDay = input.totalTrees * input.waterPerTreeLiters;
        const irrigationHours = input.irrigationTimeMinutes / 60;
        const totalFlowLPH = totalWaterPerDay / irrigationHours;

        return {
            totalFlowLPH: formatNumber(totalFlowLPH, 1),
            totalFlowLPM: formatNumber(totalFlowLPH / 60, 1),
        };
    }
};

// คำนวณความต้องการน้ำใหม่ - ปรับให้มาจากสปริงเกอร์
const calculateFlowRequirements = (input: IrrigationInput, selectedSprinkler: any) => {
    // ใช้การคำนวณจากสปริงเกอร์โดยตรง
    const sprinklerFlow = calculateSprinklerBasedFlow(selectedSprinkler, input);

    // จำนวนสปริงเกอร์
    const totalSprinklers =
        sprinklerFlow.actualSprinklers || Math.ceil(input.totalTrees * input.sprinklersPerTree);

    // การไหลต่อสปริงเกอร์
    const flowPerSprinklerLPH =
        sprinklerFlow.sprinklerFlowLPH || sprinklerFlow.totalFlowLPH / totalSprinklers;
    const flowPerSprinklerLPM = flowPerSprinklerLPH / 60;

    // การไหลในท่อแต่ละระดับ
    const branchFlowLPM = flowPerSprinklerLPM * input.sprinklersPerLongestBranch;

    const secondaryFlowLPM =
        input.longestSecondaryPipeM > 0 ? branchFlowLPM * input.branchesPerLongestSecondary : 0;

    // Main pipe ไหลน้ำสำหรับโซนที่เปิดพร้อมกัน
    const mainFlowLPM =
        input.longestMainPipeM > 0
            ? (sprinklerFlow.totalFlowLPM * input.simultaneousZones) / input.numberOfZones
            : 0;

    // การไหลที่ปั๊มต้องรองรับ
    const pumpFlowLPM = Math.max(
        (sprinklerFlow.totalFlowLPM * input.simultaneousZones) / input.numberOfZones,
        mainFlowLPM,
        secondaryFlowLPM,
        branchFlowLPM
    );

    return {
        totalFlowLPH: sprinklerFlow.totalFlowLPH,
        totalFlowLPM: sprinklerFlow.totalFlowLPM,
        totalSprinklers,
        sprinklersPerZone: formatNumber(totalSprinklers / input.numberOfZones, 1),
        flowPerSprinklerLPH: formatNumber(flowPerSprinklerLPH, 1),
        flowPerSprinklerLPM: formatNumber(flowPerSprinklerLPM, 3),
        branchFlowLPM: formatNumber(branchFlowLPM, 1),
        secondaryFlowLPM: formatNumber(secondaryFlowLPM, 1),
        mainFlowLPM: formatNumber(mainFlowLPM, 1),
        pumpFlowLPM: formatNumber(pumpFlowLPM, 1),
    };
};

// คำนวณ Pump Head สำหรับ multi-zone - แก้ไขให้ถูกต้อง
const calculateMultiZonePumpHead = (
    allZoneData: ZoneCalculationData[],
    simultaneousZones: number,
    autoSelectedEquipment?: { branchPipe: any; secondaryPipe: any; mainPipe: any }
) => {
    if (!allZoneData || allZoneData.length <= 1) {
        return 0;
    }

    // คำนวณ head ของแต่ละโซน
    const zoneHeads = allZoneData.map((zoneData) => {
        const zonePressure = calculateSprinklerPressure(
            zoneData.sprinkler,
            zoneData.input.pressureHeadM
        );

        // คำนวณ head loss แต่ละโซน
        let zoneHeadLoss = 0;
        if (autoSelectedEquipment) {
            const sprinklerFlow = calculateSprinklerBasedFlow(zoneData.sprinkler, zoneData.input);

            // Branch pipe loss
            const flowPerSprinklerLPH =
                sprinklerFlow.sprinklerFlowLPH !== undefined
                    ? sprinklerFlow.sprinklerFlowLPH
                    : sprinklerFlow.totalFlowLPH / (sprinklerFlow.actualSprinklers || 1);
            const branchFlow =
                (flowPerSprinklerLPH / 60) * zoneData.input.sprinklersPerLongestBranch;
            const branchLoss = autoSelectedEquipment.branchPipe
                ? calculateImprovedHeadLoss(
                      branchFlow,
                      autoSelectedEquipment.branchPipe.sizeMM,
                      zoneData.input.longestBranchPipeM,
                      autoSelectedEquipment.branchPipe.pipeType,
                      'branch',
                      zoneData.input.pipeAgeYears || 0
                  ).total
                : 0;

            // Secondary pipe loss
            const secondaryFlow = branchFlow * zoneData.input.branchesPerLongestSecondary;
            const secondaryLoss =
                autoSelectedEquipment.secondaryPipe && zoneData.input.longestSecondaryPipeM > 0
                    ? calculateImprovedHeadLoss(
                          secondaryFlow,
                          autoSelectedEquipment.secondaryPipe.sizeMM,
                          zoneData.input.longestSecondaryPipeM,
                          autoSelectedEquipment.secondaryPipe.pipeType,
                          'secondary',
                          zoneData.input.pipeAgeYears || 0
                      ).total
                    : 0;

            // Main pipe loss
            const mainFlow = sprinklerFlow.totalFlowLPM;
            const mainLoss =
                autoSelectedEquipment.mainPipe && zoneData.input.longestMainPipeM > 0
                    ? calculateImprovedHeadLoss(
                          mainFlow,
                          autoSelectedEquipment.mainPipe.sizeMM,
                          zoneData.input.longestMainPipeM,
                          autoSelectedEquipment.mainPipe.pipeType,
                          'main',
                          zoneData.input.pipeAgeYears || 0
                      ).total
                    : 0;

            zoneHeadLoss = branchLoss + secondaryLoss + mainLoss;
        }

        return {
            zoneId: zoneData.zoneId,
            totalHead: zoneData.input.staticHeadM + zoneHeadLoss + zonePressure,
            flowLPM: calculateSprinklerBasedFlow(zoneData.sprinkler, zoneData.input).totalFlowLPM,
        };
    });

    // เรียงโซนตาม head จากมากไปน้อย
    zoneHeads.sort((a, b) => b.totalHead - a.totalHead);

    // เลือกโซนที่มี head สูงสุดตามจำนวนที่เปิดพร้อมกัน
    const selectedZones = zoneHeads.slice(0, simultaneousZones);

    // ใช้ head สูงสุดในกลุ่มที่เลือก
    const maxHead = selectedZones.length > 0 ? selectedZones[0].totalHead : 0;

    console.log('Multi-zone pump head calculation:', {
        simultaneousZones,
        selectedZones: selectedZones.map((z) => ({ zoneId: z.zoneId, head: z.totalHead })),
        maxHead,
    });

    return maxHead;
};

// คำนวณระดับความซับซ้อนของระบบ
const calculateSystemComplexity = (input: IrrigationInput): string => {
    let complexityScore = 0;

    if (input.numberOfZones > 3) complexityScore += 2;
    else if (input.numberOfZones > 1) complexityScore += 1;

    if (input.longestMainPipeM > 0 && input.longestSecondaryPipeM > 0) complexityScore += 2;
    else if (input.longestSecondaryPipeM > 0) complexityScore += 1;

    if (input.farmSizeRai > 10 || input.totalTrees > 1000) complexityScore += 1;

    const totalPipeLength =
        input.totalBranchPipeM + input.totalSecondaryPipeM + input.totalMainPipeM;
    if (totalPipeLength > 2000) complexityScore += 1;

    if (complexityScore >= 4) return 'complex';
    if (complexityScore >= 2) return 'medium';
    return 'simple';
};

// เลือกท่อที่ดีที่สุด - ลดการเน้นประเภทท่อ
const autoSelectBestPipe = (analyzedPipes: any[], pipeType: string, flowLPM: number): any => {
    if (!analyzedPipes || analyzedPipes.length === 0) return null;

    const suitablePipes = analyzedPipes.filter((pipe) => {
        const isVelocityOK = pipe.velocity >= 0.3 && pipe.velocity <= 3.5;
        const isPressureOK = pipe.pn >= 6;
        const hasReasonableScore = pipe.score >= 25; // ลดเกณฑ์
        return isVelocityOK && isPressureOK && hasReasonableScore;
    });

    if (suitablePipes.length === 0) {
        return analyzedPipes.sort((a, b) => b.score - a.score)[0];
    }

    return suitablePipes.sort((a, b) => {
        // ลำดับความสำคัญ: คะแนน > ราคา > ความเร็ว
        if (Math.abs(a.score - b.score) > 10) return b.score - a.score;
        if (Math.abs(a.price - b.price) > a.price * 0.2) return a.price - b.price;

        // ความเร็วที่เหมาะสม (0.8-2.0 m/s)
        const aVelScore = Math.abs(1.4 - a.velocity); // ยิ่งใกล้ 1.4 ยิ่งดี
        const bVelScore = Math.abs(1.4 - b.velocity);
        return aVelScore - bVelScore;
    })[0];
};

// เลือกปั๊มที่ดีที่สุด
const autoSelectBestPump = (
    analyzedPumps: any[],
    requiredFlowLPM: number,
    requiredHeadM: number
): any => {
    if (!analyzedPumps || analyzedPumps.length === 0) return null;

    const adequatePumps = analyzedPumps.filter(
        (pump) => pump.isFlowAdequate && pump.isHeadAdequate
    );

    if (adequatePumps.length === 0) {
        return analyzedPumps.sort((a, b) => b.score - a.score)[0];
    }

    return adequatePumps.sort((a, b) => {
        // ลำดับความสำคัญ: ความเหมาะสม > ประสิทธิภาพ > คะแนน
        if (a.isRecommended !== b.isRecommended) return b.isRecommended ? 1 : -1;

        const aEfficiency = a.flowPerBaht || 0;
        const bEfficiency = b.flowPerBaht || 0;
        if (Math.abs(aEfficiency - bEfficiency) > 0.01) return bEfficiency - aEfficiency;

        return b.score - a.score;
    })[0];
};

// Main hook
export const useCalculations = (
    input: IrrigationInput,
    selectedSprinkler?: any,
    allZoneData?: ZoneCalculationData[]
): CalculationResults | null => {
    const [sprinklerData, setSprinklerData] = useState<any[]>([]);
    const [pumpData, setPumpData] = useState<any[]>([]);
    const [pipeData, setPipeData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ฟังก์ชันโหลดข้อมูลอุปกรณ์
    const fetchEquipmentData = async (categoryName: string) => {
        try {
            const endpoints = [
                `/api/equipments/by-category/${categoryName}`,
                `/api/equipments/category/${categoryName}`,
                `/api/equipments?category=${categoryName}`,
                `/api/equipments/by-category-name/${categoryName}`,
            ];

            let data: any[] = [];

            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(endpoint);
                    if (response.ok) {
                        const result = await response.json();
                        data = Array.isArray(result) ? result : [];
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }

            if (data.length === 0) {
                const response = await fetch('/api/equipments');
                if (response.ok) {
                    const allEquipments = await response.json();
                    data = Array.isArray(allEquipments)
                        ? allEquipments.filter((item) => {
                              const categoryMatch =
                                  item.category?.name === categoryName ||
                                  item.category?.display_name
                                      ?.toLowerCase()
                                      .includes(categoryName.toLowerCase());
                              return categoryMatch;
                          })
                        : [];
                }
            }

            return data;
        } catch (error) {
            console.error(`Error fetching ${categoryName} data:`, error);
            return [];
        }
    };

    // แปลงข้อมูลอุปกรณ์
    const transformEquipmentData = (
        equipment: any[],
        categoryType: 'sprinkler' | 'pump' | 'pipe'
    ) => {
        return equipment
            .map((item) => {
                try {
                    const transformed: any = {
                        id: item.id,
                        productCode: item.product_code || item.productCode,
                        product_code: item.product_code || item.productCode,
                        name: item.name,
                        brand: item.brand,
                        image: item.image,
                        price: Number(item.price || 0),
                        is_active: Boolean(item.is_active),
                        description: item.description,
                    };

                    // รวมข้อมูล attributes
                    const allAttributes = {};
                    Object.keys(item).forEach((key) => {
                        if (
                            ![
                                'id',
                                'category_id',
                                'product_code',
                                'productCode',
                                'name',
                                'brand',
                                'image',
                                'price',
                                'description',
                                'is_active',
                                'created_at',
                                'updated_at',
                                'category',
                                'attributes',
                                'formatted_attributes',
                                'attributes_raw',
                                'pumpAccessories',
                                'pumpAccessory',
                            ].includes(key)
                        ) {
                            (allAttributes as any)[key] = item[key];
                        }
                    });

                    if (item.attributes && typeof item.attributes === 'object') {
                        Object.assign(allAttributes, item.attributes);
                    }

                    if (item.attributes_raw && typeof item.attributes_raw === 'object') {
                        Object.assign(allAttributes, item.attributes_raw);
                    }

                    if (Array.isArray(item.formatted_attributes)) {
                        item.formatted_attributes.forEach((attr: any) => {
                            if (attr.attribute_name && attr.value !== undefined) {
                                (allAttributes as any)[attr.attribute_name] = attr.value;
                            }
                        });
                    }

                    Object.assign(transformed, allAttributes);

                    // แปลงข้อมูลตามประเภท
                    switch (categoryType) {
                        case 'sprinkler':
                            if (transformed.waterVolumeLitersPerHour !== undefined) {
                                transformed.waterVolumeLitersPerHour = parseRangeValue(
                                    transformed.waterVolumeLitersPerHour
                                );
                            }
                            if (transformed.radiusMeters !== undefined) {
                                transformed.radiusMeters = parseRangeValue(
                                    transformed.radiusMeters
                                );
                            }
                            if (transformed.pressureBar !== undefined) {
                                transformed.pressureBar = parseRangeValue(transformed.pressureBar);
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
                                if (transformed[field] !== undefined) {
                                    transformed[field] = Number(transformed[field]) || 0;
                                }
                            });

                            const rangeFields = ['flow_rate_lpm', 'head_m'];
                            rangeFields.forEach((field) => {
                                if (transformed[field] !== undefined) {
                                    transformed[field] = parseRangeValue(transformed[field]);
                                }
                            });

                            if (item.pumpAccessories || item.pump_accessories) {
                                transformed.pumpAccessories =
                                    item.pumpAccessories || item.pump_accessories || [];
                            }
                            break;

                        case 'pipe':
                            if (transformed.pn !== undefined) {
                                transformed.pn = Number(transformed.pn) || 0;
                            }
                            if (transformed.sizeMM !== undefined) {
                                transformed.sizeMM = Number(transformed.sizeMM) || 0;
                            }
                            if (transformed.lengthM !== undefined) {
                                transformed.lengthM = Number(transformed.lengthM) || 0;
                            }
                            break;
                    }

                    return transformed;
                } catch (error) {
                    console.error(`Error transforming ${categoryType} equipment:`, item.id, error);
                    return null;
                }
            })
            .filter((item) => item && item.is_active !== false);
    };

    // โหลดข้อมูลอุปกรณ์
    useEffect(() => {
        const loadEquipmentData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [sprinklers, pumps, pipes] = await Promise.all([
                    fetchEquipmentData('sprinkler'),
                    fetchEquipmentData('pump'),
                    fetchEquipmentData('pipe'),
                ]);

                const transformedSprinklers = transformEquipmentData(sprinklers, 'sprinkler');
                const transformedPumps = transformEquipmentData(pumps, 'pump');
                const transformedPipes = transformEquipmentData(pipes, 'pipe');

                setSprinklerData(transformedSprinklers);
                setPumpData(transformedPumps);
                setPipeData(transformedPipes);

                if (
                    transformedSprinklers.length === 0 &&
                    transformedPumps.length === 0 &&
                    transformedPipes.length === 0
                ) {
                    setError('ไม่พบข้อมูลอุปกรณ์ที่เปิดใช้งานในระบบ');
                }
            } catch (error) {
                console.error('Failed to load equipment data:', error);
                setError(
                    `ไม่สามารถโหลดข้อมูลอุปกรณ์ได้: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
                setSprinklerData([]);
                setPumpData([]);
                setPipeData([]);
            } finally {
                setLoading(false);
            }
        };

        loadEquipmentData();
    }, []);

    // คำนวณผลลัพธ์
    return useMemo(() => {
        if (loading || error) return null;
        if (!sprinklerData.length || !pumpData.length || !pipeData.length) return null;

        // คำนวณความต้องการน้ำจากสปริงเกอร์
        const flowData = calculateFlowRequirements(input, selectedSprinkler);
        const systemComplexity = calculateSystemComplexity(input);

        // ตรวจสอบว่ามีท่อรองและท่อหลักหรือไม่
        const hasValidSecondaryPipe =
            input.longestSecondaryPipeM > 0 && input.totalSecondaryPipeM > 0;
        const hasValidMainPipe = input.longestMainPipeM > 0 && input.totalMainPipeM > 0;

        // วิเคราะห์ sprinkler
        const analyzedSprinklers = sprinklerData
            .map((sprinkler) => evaluateSprinklerOverall(sprinkler, flowData.flowPerSprinklerLPH))
            .sort((a, b) => b.score - a.score);

        // วิเคราะห์ท่อย่อย - ลดการเน้นประเภทท่อ
        const analyzedBranchPipes = pipeData
            .map((pipe) =>
                evaluatePipeOverall(
                    pipe,
                    flowData.branchFlowLPM,
                    input.longestBranchPipeM,
                    'branch',
                    input.pipeAgeYears || 0,
                    [] // ไม่จำกัดประเภทท่อ
                )
            )
            .sort((a, b) => b.score - a.score);

        const autoSelectedBranchPipe = autoSelectBestPipe(
            analyzedBranchPipes,
            'branch',
            flowData.branchFlowLPM
        );

        // วิเคราะห์ท่อรอง
        const analyzedSecondaryPipes = hasValidSecondaryPipe
            ? pipeData
                  .map((pipe) =>
                      evaluatePipeOverall(
                          pipe,
                          flowData.secondaryFlowLPM,
                          input.longestSecondaryPipeM,
                          'secondary',
                          input.pipeAgeYears || 0,
                          [] // ไม่จำกัดประเภทท่อ
                      )
                  )
                  .sort((a, b) => b.score - a.score)
            : [];

        const autoSelectedSecondaryPipe = hasValidSecondaryPipe
            ? autoSelectBestPipe(analyzedSecondaryPipes, 'secondary', flowData.secondaryFlowLPM)
            : null;

        // วิเคราะห์ท่อหลัก
        const analyzedMainPipes = hasValidMainPipe
            ? pipeData
                  .map((pipe) =>
                      evaluatePipeOverall(
                          pipe,
                          flowData.mainFlowLPM,
                          input.longestMainPipeM,
                          'main',
                          input.pipeAgeYears || 0,
                          [] // ไม่จำกัดประเภทท่อ
                      )
                  )
                  .sort((a, b) => b.score - a.score)
            : [];

        const autoSelectedMainPipe = hasValidMainPipe
            ? autoSelectBestPipe(analyzedMainPipes, 'main', flowData.mainFlowLPM)
            : null;

        // คำนวณ head loss
        const branchLoss = autoSelectedBranchPipe
            ? calculateImprovedHeadLoss(
                  flowData.branchFlowLPM,
                  autoSelectedBranchPipe.sizeMM,
                  input.longestBranchPipeM,
                  autoSelectedBranchPipe.pipeType,
                  'branch',
                  input.pipeAgeYears || 0
              )
            : { major: 0, minor: 0, total: 0, velocity: 0, C: 135 };

        const secondaryLoss =
            autoSelectedSecondaryPipe && hasValidSecondaryPipe
                ? calculateImprovedHeadLoss(
                      flowData.secondaryFlowLPM,
                      autoSelectedSecondaryPipe.sizeMM,
                      input.longestSecondaryPipeM,
                      autoSelectedSecondaryPipe.pipeType,
                      'secondary',
                      input.pipeAgeYears || 0
                  )
                : { major: 0, minor: 0, total: 0, velocity: 0, C: 140 };

        const mainLoss =
            autoSelectedMainPipe && hasValidMainPipe
                ? calculateImprovedHeadLoss(
                      flowData.mainFlowLPM,
                      autoSelectedMainPipe.sizeMM,
                      input.longestMainPipeM,
                      autoSelectedMainPipe.pipeType,
                      'main',
                      input.pipeAgeYears || 0
                  )
                : { major: 0, minor: 0, total: 0, velocity: 0, C: 145 };

        const totalHeadLoss = branchLoss.total + secondaryLoss.total + mainLoss.total;
        const totalMajorLoss = branchLoss.major + secondaryLoss.major + mainLoss.major;
        const totalMinorLoss = branchLoss.minor + secondaryLoss.minor + mainLoss.minor;

        // คำนวณ pump head
        let basePumpHead;
        if (allZoneData && allZoneData.length > 1) {
            // ใช้การคำนวณ multi-zone ใหม่
            basePumpHead = calculateMultiZonePumpHead(allZoneData, input.simultaneousZones, {
                branchPipe: autoSelectedBranchPipe,
                secondaryPipe: autoSelectedSecondaryPipe,
                mainPipe: autoSelectedMainPipe,
            });
        } else {
            // Single zone
            const pressureFromSprinkler = calculateSprinklerPressure(
                selectedSprinkler,
                input.pressureHeadM
            );
            basePumpHead = input.staticHeadM + totalHeadLoss + pressureFromSprinkler;
        }

        const safetyFactor =
            systemComplexity === 'simple' ? 1.05 : systemComplexity === 'medium' ? 1.08 : 1.12;
        const pumpHeadRequired = basePumpHead * safetyFactor;

        const pressureFromSprinkler = calculateSprinklerPressure(
            selectedSprinkler,
            input.pressureHeadM
        );

        // วิเคราะห์ปั๊ม
        const analyzedPumps = pumpData
            .map((pump) => evaluatePumpOverall(pump, flowData.pumpFlowLPM, pumpHeadRequired))
            .sort((a, b) => b.score - a.score);

        const autoSelectedPump = autoSelectBestPump(
            analyzedPumps,
            flowData.pumpFlowLPM,
            pumpHeadRequired
        );

        // คำนวณจำนวนม้วนท่อ
        const branchRolls = autoSelectedBranchPipe
            ? calculatePipeRolls(input.totalBranchPipeM, autoSelectedBranchPipe.lengthM)
            : 1;
        const secondaryRolls =
            autoSelectedSecondaryPipe && hasValidSecondaryPipe
                ? calculatePipeRolls(input.totalSecondaryPipeM, autoSelectedSecondaryPipe.lengthM)
                : 0;
        const mainRolls =
            autoSelectedMainPipe && hasValidMainPipe
                ? calculatePipeRolls(input.totalMainPipeM, autoSelectedMainPipe.lengthM)
                : 0;

        // ตรวจสอบความเร็วน้ำ
        const velocityWarnings: string[] = [];
        if (branchLoss.velocity > 0) {
            const warning = checkVelocity(branchLoss.velocity, 'ท่อย่อย');
            if (!warning.includes('🟢')) velocityWarnings.push(warning);
        }
        if (hasValidSecondaryPipe && secondaryLoss.velocity > 0) {
            const warning = checkVelocity(secondaryLoss.velocity, 'ท่อรอง');
            if (!warning.includes('🟢')) velocityWarnings.push(warning);
        }
        if (hasValidMainPipe && mainLoss.velocity > 0) {
            const warning = checkVelocity(mainLoss.velocity, 'ท่อหลัก');
            if (!warning.includes('🟢')) velocityWarnings.push(warning);
        }

        // กรองอุปกรณ์ที่แนะนำ
        const recommendedSprinklers = analyzedSprinklers.filter((s) => s.isRecommended);
        const recommendedBranchPipe = analyzedBranchPipes.filter((p) => p.isRecommended);
        const recommendedSecondaryPipe = analyzedSecondaryPipes.filter((p) => p.isRecommended);
        const recommendedMainPipe = analyzedMainPipes.filter((p) => p.isRecommended);
        const recommendedPump = analyzedPumps.filter((p) => p.isRecommended);

        return {
            totalWaterRequiredLPH: flowData.totalFlowLPH,
            totalWaterRequiredLPM: flowData.totalFlowLPM,
            waterPerZoneLPH: formatNumber(flowData.totalFlowLPH / input.numberOfZones, 1),
            waterPerZoneLPM: formatNumber(flowData.totalFlowLPM / input.numberOfZones, 1),
            totalSprinklers: flowData.totalSprinklers,
            sprinklersPerZone: flowData.sprinklersPerZone,
            waterPerSprinklerLPH: flowData.flowPerSprinklerLPH,
            waterPerSprinklerLPM: flowData.flowPerSprinklerLPM,

            recommendedSprinklers,
            recommendedBranchPipe,
            recommendedSecondaryPipe,
            recommendedMainPipe,
            recommendedPump,

            analyzedBranchPipes,
            analyzedSecondaryPipes,
            analyzedMainPipes,
            analyzedSprinklers,
            analyzedPumps,

            autoSelectedBranchPipe,
            autoSelectedSecondaryPipe,
            autoSelectedMainPipe,
            autoSelectedPump,

            branchPipeRolls: branchRolls,
            secondaryPipeRolls: secondaryRolls,
            mainPipeRolls: mainRolls,

            headLoss: {
                branch: {
                    major: formatNumber(branchLoss.major, 3),
                    minor: formatNumber(branchLoss.minor, 3),
                    total: formatNumber(branchLoss.total, 3),
                },
                secondary: {
                    major: formatNumber(secondaryLoss.major, 3),
                    minor: formatNumber(secondaryLoss.minor, 3),
                    total: formatNumber(secondaryLoss.total, 3),
                },
                main: {
                    major: formatNumber(mainLoss.major, 3),
                    minor: formatNumber(mainLoss.minor, 3),
                    total: formatNumber(mainLoss.total, 3),
                },
                totalMajor: formatNumber(totalMajorLoss, 3),
                totalMinor: formatNumber(totalMinorLoss, 3),
                total: formatNumber(totalHeadLoss, 3),
            },

            velocity: {
                branch: formatNumber(branchLoss.velocity, 3),
                secondary: formatNumber(secondaryLoss.velocity, 3),
                main: formatNumber(mainLoss.velocity, 3),
            },

            flows: {
                branch: flowData.branchFlowLPM,
                secondary: flowData.secondaryFlowLPM,
                main: flowData.mainFlowLPM,
            },

            coefficients: {
                branch: formatNumber(branchLoss.C, 3),
                secondary: formatNumber(secondaryLoss.C, 3),
                main: formatNumber(mainLoss.C, 3),
            },

            pumpHeadRequired: formatNumber(pumpHeadRequired, 3),
            pressureFromSprinkler: formatNumber(pressureFromSprinkler, 3),
            safetyFactor: safetyFactor,
            adjustedFlow: flowData.pumpFlowLPM,
            velocityWarnings,
            hasValidSecondaryPipe,
            hasValidMainPipe,

            calculationMetadata: {
                equipmentCounts: {
                    sprinklers: sprinklerData.length,
                    pumps: pumpData.length,
                    pipes: pipeData.length,
                },
                selectedEquipment: {
                    sprinkler: selectedSprinkler?.name || null,
                    pressureSource: selectedSprinkler ? 'sprinkler' : 'manual',
                },
                autoSelectedEquipment: {
                    branchPipe: autoSelectedBranchPipe?.productCode || null,
                    secondaryPipe: autoSelectedSecondaryPipe?.productCode || null,
                    mainPipe: autoSelectedMainPipe?.productCode || null,
                    pump: autoSelectedPump?.productCode || null,
                },
                analysisTimestamp: new Date().toISOString(),
                dataSource: 'database',
                systemComplexity,
                systemRequirements: {
                    farmSize: input.farmSizeRai,
                    complexity: systemComplexity,
                    totalFlow: flowData.pumpFlowLPM,
                    totalHead: pumpHeadRequired,
                    safetyFactor: safetyFactor,
                },
                flowCalculations: {
                    totalFlowLPH: flowData.totalFlowLPH,
                    flowPerSprinkler: flowData.flowPerSprinklerLPM,
                    branchFlow: flowData.branchFlowLPM,
                    secondaryFlow: flowData.secondaryFlowLPM,
                    mainFlow: flowData.mainFlowLPM,
                    pumpFlow: flowData.pumpFlowLPM,
                    sprinklerBased: !!selectedSprinkler,
                },
                multiZoneInfo: allZoneData
                    ? {
                          totalZones: allZoneData.length,
                          simultaneousZones: input.simultaneousZones,
                          calculationMethod:
                              allZoneData.length > 1 ? 'multi-zone-optimized' : 'single-zone',
                      }
                    : undefined,
            },
        };
    }, [input, selectedSprinkler, sprinklerData, pumpData, pipeData, loading, error, allZoneData]);
};
