// resources\js\pages\hooks\useCalculations.ts
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
            try {
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
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
            }
        }

        console.log(`${categoryName} data loaded:`, data.length, 'items');
        return data;
    } catch (error) {
        console.error(`Error fetching ${categoryName} data:`, error);
        return [];
    }
};

const transformEquipmentData = (equipment: any[], categoryType: 'sprinkler' | 'pump' | 'pipe') => {
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

                switch (categoryType) {
                    case 'sprinkler':
                        if (transformed.waterVolumeLitersPerHour !== undefined) {
                            transformed.waterVolumeLitersPerHour = parseRangeValue(
                                transformed.waterVolumeLitersPerHour
                            );
                        }
                        if (transformed.radiusMeters !== undefined) {
                            transformed.radiusMeters = parseRangeValue(transformed.radiusMeters);
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

const calculateDynamicPressureHead = (selectedSprinkler: any, defaultPressure: number): number => {
    if (!selectedSprinkler) return defaultPressure;

    try {
        let minPressure, maxPressure;
        const pressureData = selectedSprinkler.pressureBar || selectedSprinkler.pressure_bar;

        if (Array.isArray(pressureData)) {
            minPressure = pressureData[0];
            maxPressure = pressureData[1];
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

        const optimalPressureBar = minPressure + (maxPressure - minPressure) * 0.7;
        return optimalPressureBar * 10.2;
    } catch (error) {
        console.error('Error calculating pressure from sprinkler:', error);
        return defaultPressure;
    }
};

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

const calculateFlowRequirements = (input: IrrigationInput, selectedSprinkler: any) => {
    const totalWaterPerDay = input.totalTrees * input.waterPerTreeLiters;
    const irrigationHours = input.irrigationTimeMinutes / 60;
    const totalWaterPerSession = totalWaterPerDay;

    const totalFlowLPH = totalWaterPerSession / irrigationHours;
    const totalFlowLPM = totalFlowLPH / 60;

    const flowPerZoneLPH = totalFlowLPH / input.numberOfZones;
    const flowPerZoneLPM = flowPerZoneLPH / 60;

    const totalSprinklers = Math.ceil(input.totalTrees * input.sprinklersPerTree);
    const sprinklersPerZone = totalSprinklers / input.numberOfZones;

    const flowPerSprinklerLPH = flowPerZoneLPH / sprinklersPerZone;
    const flowPerSprinklerLPM = flowPerSprinklerLPH / 60;

    const branchFlowLPM = flowPerSprinklerLPM * input.sprinklersPerLongestBranch;

    const secondaryFlowLPM =
        input.longestSecondaryPipeM > 0 ? branchFlowLPM * input.branchesPerLongestSecondary : 0;

    const mainFlowLPM = input.longestMainPipeM > 0 ? flowPerZoneLPM * input.simultaneousZones : 0;

    const pumpFlowLPM = Math.max(
        branchFlowLPM,
        secondaryFlowLPM,
        mainFlowLPM,
        flowPerZoneLPM * input.simultaneousZones
    );

    return {
        totalFlowLPH: formatNumber(totalFlowLPH, 1),
        totalFlowLPM: formatNumber(totalFlowLPM, 1),
        flowPerZoneLPH: formatNumber(flowPerZoneLPH, 1),
        flowPerZoneLPM: formatNumber(flowPerZoneLPM, 1),
        totalSprinklers,
        sprinklersPerZone: formatNumber(sprinklersPerZone, 1),
        flowPerSprinklerLPH: formatNumber(flowPerSprinklerLPH, 1),
        flowPerSprinklerLPM: formatNumber(flowPerSprinklerLPM, 3),

        branchFlowLPM: formatNumber(branchFlowLPM, 1),
        secondaryFlowLPM: formatNumber(secondaryFlowLPM, 1),
        mainFlowLPM: formatNumber(mainFlowLPM, 1),
        pumpFlowLPM: formatNumber(pumpFlowLPM, 1),
    };
};

const autoSelectBestPipe = (analyzedPipes: any[], pipeType: string, flowLPM: number): any => {
    if (!analyzedPipes || analyzedPipes.length === 0) return null;

    const suitablePipes = analyzedPipes.filter((pipe) => {
        const isVelocityOK = pipe.velocity >= 0.6 && pipe.velocity <= 3.0;
        const isTypeAllowed = pipe.isTypeAllowed !== false;
        const hasReasonableScore = pipe.score >= 30;

        return isVelocityOK && isTypeAllowed && hasReasonableScore;
    });

    if (suitablePipes.length === 0) {
        return analyzedPipes.sort((a, b) => b.score - a.score)[0];
    }

    const sortedPipes = suitablePipes.sort((a, b) => {
        if (a.isRecommended !== b.isRecommended) return b.isRecommended ? 1 : -1;

        if (Math.abs(a.score - b.score) > 5) return b.score - a.score;

        return a.price - b.price;
    });

    return sortedPipes[0];
};

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
        console.warn('No adequate pumps found, selecting best available');
        return analyzedPumps.sort((a, b) => b.score - a.score)[0];
    }

    const sortedPumps = adequatePumps.sort((a, b) => {
        if (a.isRecommended !== b.isRecommended) return b.isRecommended ? 1 : -1;

        if (Math.abs(a.flowPerBaht - b.flowPerBaht) > 0.01) return b.flowPerBaht - a.flowPerBaht;

        const aOversizeFactor = Math.max(a.flowRatio, a.headRatio);
        const bOversizeFactor = Math.max(b.flowRatio, b.headRatio);
        if (Math.abs(aOversizeFactor - bOversizeFactor) > 0.3)
            return aOversizeFactor - bOversizeFactor;

        return b.score - a.score;
    });

    return sortedPumps[0];
};

export const useCalculations = (
    input: IrrigationInput,
    selectedSprinkler?: any
): CalculationResults | null => {
    const [sprinklerData, setSprinklerData] = useState<any[]>([]);
    const [pumpData, setPumpData] = useState<any[]>([]);
    const [pipeData, setPipeData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    return useMemo(() => {
        if (loading || error) {
            return null;
        }

        if (!sprinklerData.length || !pumpData.length || !pipeData.length) {
            return null;
        }

        const flowData = calculateFlowRequirements(input, selectedSprinkler);

        const systemComplexity = calculateSystemComplexity(input);
        const hasValidSecondaryPipe =
            input.longestSecondaryPipeM > 0 && input.totalSecondaryPipeM > 0;
        const hasValidMainPipe = input.longestMainPipeM > 0 && input.totalMainPipeM > 0;

        const analyzedSprinklers = sprinklerData
            .map((sprinkler) => evaluateSprinklerOverall(sprinkler, flowData.flowPerSprinklerLPH))
            .sort((a, b) => b.score - a.score);

        const analyzedBranchPipes = pipeData
            .map((pipe) =>
                evaluatePipeOverall(
                    pipe,
                    flowData.branchFlowLPM,
                    input.longestBranchPipeM,
                    'branch',
                    input.pipeAgeYears || 0,
                    ['LDPE', 'Flexible PE', 'PE-RT', 'PVC', 'HDPE PE 80']
                )
            )
            .sort((a, b) => b.score - a.score);

        const autoSelectedBranchPipe = autoSelectBestPipe(
            analyzedBranchPipes,
            'branch',
            flowData.branchFlowLPM
        );

        const analyzedSecondaryPipes = hasValidSecondaryPipe
            ? pipeData
                  .map((pipe) =>
                      evaluatePipeOverall(
                          pipe,
                          flowData.secondaryFlowLPM,
                          input.longestSecondaryPipeM,
                          'secondary',
                          input.pipeAgeYears || 0,
                          ['HDPE PE 80', 'HDPE PE 100', 'PVC']
                      )
                  )
                  .sort((a, b) => b.score - a.score)
            : [];

        const autoSelectedSecondaryPipe = hasValidSecondaryPipe
            ? autoSelectBestPipe(analyzedSecondaryPipes, 'secondary', flowData.secondaryFlowLPM)
            : null;

        const analyzedMainPipes = hasValidMainPipe
            ? pipeData
                  .map((pipe) =>
                      evaluatePipeOverall(
                          pipe,
                          flowData.mainFlowLPM,
                          input.longestMainPipeM,
                          'main',
                          input.pipeAgeYears || 0,
                          ['HDPE PE 100', 'HDPE PE 80']
                      )
                  )
                  .sort((a, b) => b.score - a.score)
            : [];

        const autoSelectedMainPipe = hasValidMainPipe
            ? autoSelectBestPipe(analyzedMainPipes, 'main', flowData.mainFlowLPM)
            : null;

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

        const pressureFromSprinkler = calculateDynamicPressureHead(
            selectedSprinkler,
            input.pressureHeadM
        );

        const basePumpHead = input.staticHeadM + totalHeadLoss + pressureFromSprinkler;
        const safetyFactor =
            systemComplexity === 'simple' ? 1.1 : systemComplexity === 'medium' ? 1.15 : 1.2;
        const pumpHeadRequired = basePumpHead * safetyFactor;

        const analyzedPumps = pumpData
            .map((pump) => evaluatePumpOverall(pump, flowData.pumpFlowLPM, pumpHeadRequired))
            .sort((a, b) => b.score - a.score);

        const autoSelectedPump = autoSelectBestPump(
            analyzedPumps,
            flowData.pumpFlowLPM,
            pumpHeadRequired
        );

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

        const recommendedSprinklers = analyzedSprinklers.filter((s) => s.isRecommended);
        const recommendedBranchPipe = analyzedBranchPipes.filter((p) => p.isRecommended);
        const recommendedSecondaryPipe = analyzedSecondaryPipes.filter((p) => p.isRecommended);
        const recommendedMainPipe = analyzedMainPipes.filter((p) => p.isRecommended);
        const recommendedPump = analyzedPumps.filter((p) => p.isRecommended);

        return {
            totalWaterRequiredLPH: flowData.totalFlowLPH,
            totalWaterRequiredLPM: flowData.totalFlowLPM,
            waterPerZoneLPH: flowData.flowPerZoneLPH,
            waterPerZoneLPM: flowData.flowPerZoneLPM,
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
                    flowPerZone: flowData.flowPerZoneLPM,
                    flowPerSprinkler: flowData.flowPerSprinklerLPM,
                    branchFlow: flowData.branchFlowLPM,
                    secondaryFlow: flowData.secondaryFlowLPM,
                    mainFlow: flowData.mainFlowLPM,
                    pumpFlow: flowData.pumpFlowLPM,
                },
            },
        };
    }, [input, selectedSprinkler, sprinklerData, pumpData, pipeData, loading, error]);
};
