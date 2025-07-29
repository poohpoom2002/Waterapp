/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// resources\js\pages\hooks\useCalculations.ts
import { useMemo, useState, useEffect } from 'react';
import { IrrigationInput, CalculationResults } from '../types/interfaces';
import {
    calculatePipeRolls,
    calculateImprovedHeadLoss,
    checkVelocity,
    evaluatePipeOverall,
    evaluatePumpOverall,
    formatNumber,
    parseRangeValue,
    calculatePumpRequirement,
    validateHeadLossRatio,
    calculateSafetyFactor,
} from '../utils/calculations';

export interface ZoneCalculationData {
    zoneId: string;
    input: IrrigationInput;
    sprinkler?: any;
}

interface ZoneOperationGroup {
    id: string;
    zones: string[];
    order: number;
    label: string;
}

interface ZoneResults {
    zoneId: string;
    zoneName: string;
    totalFlowLPM: number;
    headLoss: {
        branch: number;
        secondary: number;
        main: number;
        total: number;
    };
    staticHead: number;
    pressureHead: number;
    totalHead: number;
    autoSelectedPipes: {
        branch?: any;
        secondary?: any;
        main?: any;
    };
    sprinklerCount: number;
}

interface ProjectSummary {
    totalFlowLPM: number;
    maxHeadM: number;
    criticalZone: string;
    operationMode: string;
    selectedGroupFlowLPM: number;
    selectedGroupHeadM: number;
    criticalGroup?: ZoneOperationGroup;
}

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

        const avgPressureBar = (minPressure + maxPressure) / 2;
        const workingPressureBar = avgPressureBar * 0.7;
        return workingPressureBar * 10.2;
    } catch (error) {
        console.error('Error calculating pressure from sprinkler:', error);
        return defaultPressure;
    }
};

const calculateSprinklerBasedFlow = (sprinkler: any, input: IrrigationInput) => {
    const totalWaterPerHour =
        (input.totalTrees * input.waterPerTreeLiters) / (input.irrigationTimeMinutes / 60);
    const totalSprinklers = Math.ceil(input.totalTrees * input.sprinklersPerTree);

    if (!sprinkler) {
        return {
            totalFlowLPH: formatNumber(totalWaterPerHour, 1),
            totalFlowLPM: formatNumber(totalWaterPerHour / 60, 1),
            sprinklersUsed: totalSprinklers,
        };
    }

    try {
        let sprinklerFlowLPH;
        const flowData = sprinkler.waterVolumeLitersPerHour || sprinkler.waterVolumeL_H;

        if (Array.isArray(flowData)) {
            const avgFlow = (flowData[0] + flowData[1]) / 2;
            sprinklerFlowLPH = avgFlow;
        } else if (typeof flowData === 'string' && flowData.includes('-')) {
            const parts = flowData.split('-');
            const min = parseFloat(parts[0]);
            const max = parseFloat(parts[1]);
            const avgFlow = (min + max) / 2;
            sprinklerFlowLPH = avgFlow;
        } else {
            sprinklerFlowLPH = parseFloat(String(flowData)) || 0;
        }

        if (sprinklerFlowLPH <= 0 || isNaN(sprinklerFlowLPH)) {
            throw new Error('Invalid sprinkler flow rate');
        }

        const expectedFlowPerSprinkler = totalWaterPerHour / totalSprinklers;

        if (sprinklerFlowLPH > expectedFlowPerSprinkler * 3) {
            throw new Error('Sprinkler flow too high');
        }

        if (sprinklerFlowLPH < expectedFlowPerSprinkler / 3) {
            throw new Error('Sprinkler flow too low');
        }

        const effectiveFlowPerSprinkler = Math.min(
            sprinklerFlowLPH,
            expectedFlowPerSprinkler * 1.2
        );
        const totalFlowLPH = effectiveFlowPerSprinkler * totalSprinklers;

        return {
            totalFlowLPH: formatNumber(totalFlowLPH, 1),
            totalFlowLPM: formatNumber(totalFlowLPH / 60, 1),
            sprinklerFlowLPH: formatNumber(effectiveFlowPerSprinkler, 1),
            sprinklersUsed: totalSprinklers,
        };
    } catch (error) {
        return {
            totalFlowLPH: formatNumber(totalWaterPerHour, 1),
            totalFlowLPM: formatNumber(totalWaterPerHour / 60, 1),
            sprinklerFlowLPH: formatNumber(totalWaterPerHour / totalSprinklers, 1),
            sprinklersUsed: totalSprinklers,
        };
    }
};

const calculateFlowRequirements = (input: IrrigationInput, selectedSprinkler: any) => {
    const sprinklerFlow = calculateSprinklerBasedFlow(selectedSprinkler, input);

    const totalSprinklers =
        sprinklerFlow.sprinklersUsed || Math.ceil(input.totalTrees * input.sprinklersPerTree);

    const flowPerSprinklerLPH =
        sprinklerFlow.sprinklerFlowLPH || sprinklerFlow.totalFlowLPH / totalSprinklers;
    const flowPerSprinklerLPM = flowPerSprinklerLPH / 60;

    const branchFlowLPM = flowPerSprinklerLPM * Math.min(input.sprinklersPerLongestBranch, 20);

    const secondaryFlowLPM =
        input.longestSecondaryPipeM > 0
            ? branchFlowLPM * Math.min(input.branchesPerLongestSecondary, 10)
            : 0;

    const mainFlowLPM =
        input.longestMainPipeM > 0 ? Math.min(sprinklerFlow.totalFlowLPM, secondaryFlowLPM * 2) : 0;

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
    };
};

const calculateZoneResults = (
    allZoneData: ZoneCalculationData[],
    pipeData: any[]
): ZoneResults[] => {
    return allZoneData.map((zoneData) => {
        const { zoneId, input, sprinkler } = zoneData;

        const flowData = calculateFlowRequirements(input, sprinkler);

        const analyzedBranchPipes = pipeData
            .map((pipe) =>
                evaluatePipeOverall(
                    pipe,
                    flowData.branchFlowLPM,
                    input.longestBranchPipeM,
                    'branch',
                    input.pipeAgeYears || 0,
                    []
                )
            )
            .sort((a, b) => b.score - a.score);

        const autoSelectedBranchPipe = autoSelectBestPipe(
            analyzedBranchPipes,
            'branch',
            flowData.branchFlowLPM
        );

        const hasValidSecondaryPipe =
            input.longestSecondaryPipeM > 0 && input.totalSecondaryPipeM > 0;
        let autoSelectedSecondaryPipe: any = null;
        if (hasValidSecondaryPipe) {
            const analyzedSecondaryPipes = pipeData
                .map((pipe) =>
                    evaluatePipeOverall(
                        pipe,
                        flowData.secondaryFlowLPM,
                        input.longestSecondaryPipeM,
                        'secondary',
                        input.pipeAgeYears || 0,
                        []
                    )
                )
                .sort((a, b) => b.score - a.score);

            autoSelectedSecondaryPipe = autoSelectBestPipe(
                analyzedSecondaryPipes,
                'secondary',
                flowData.secondaryFlowLPM
            );
        }

        const hasValidMainPipe = input.longestMainPipeM > 0 && input.totalMainPipeM > 0;
        let autoSelectedMainPipe: any = null;
        if (hasValidMainPipe) {
            const analyzedMainPipes = pipeData
                .map((pipe) =>
                    evaluatePipeOverall(
                        pipe,
                        flowData.mainFlowLPM,
                        input.longestMainPipeM,
                        'main',
                        input.pipeAgeYears || 0,
                        []
                    )
                )
                .sort((a, b) => b.score - a.score);

            autoSelectedMainPipe = autoSelectBestPipe(
                analyzedMainPipes,
                'main',
                flowData.mainFlowLPM
            );
        }

        const branchLoss = autoSelectedBranchPipe
            ? calculateImprovedHeadLoss(
                  flowData.branchFlowLPM,
                  autoSelectedBranchPipe.sizeMM,
                  input.longestBranchPipeM,
                  autoSelectedBranchPipe.pipeType,
                  'branch',
                  input.pipeAgeYears || 0
              )
            : { major: 0, minor: 0, total: 0, velocity: 0, C: 135, K: 0 };

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
                : { major: 0, minor: 0, total: 0, velocity: 0, C: 140, K: 0 };

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
                : { major: 0, minor: 0, total: 0, velocity: 0, C: 145, K: 0 };

        const totalHeadLoss = branchLoss.total + secondaryLoss.total + mainLoss.total;
        const pressureHead = calculateSprinklerPressure(sprinkler, input.pressureHeadM);
        const totalHead = input.staticHeadM + totalHeadLoss + pressureHead;

        return {
            zoneId,
            zoneName: zoneId,
            totalFlowLPM: flowData.totalFlowLPM,
            headLoss: {
                branch: branchLoss.total,
                secondary: secondaryLoss.total,
                main: mainLoss.total,
                total: totalHeadLoss,
            },
            staticHead: input.staticHeadM,
            pressureHead: pressureHead,
            totalHead: totalHead,
            autoSelectedPipes: {
                branch: autoSelectedBranchPipe,
                secondary: autoSelectedSecondaryPipe,
                main: autoSelectedMainPipe,
            },
            sprinklerCount: flowData.totalSprinklers,
        };
    });
};

const calculateProjectSummary = (
    allZoneResults: ZoneResults[],
    zoneOperationGroups: ZoneOperationGroup[]
): ProjectSummary => {
    if (!allZoneResults || allZoneResults.length === 0) {
        return {
            totalFlowLPM: 0,
            maxHeadM: 0,
            criticalZone: '',
            operationMode: 'single',
            selectedGroupFlowLPM: 0,
            selectedGroupHeadM: 0,
        };
    }

    const maxHeadZone = allZoneResults.reduce((max, current) =>
        current.totalHead > max.totalHead ? current : max
    );

    let operationMode = 'sequential';
    let selectedGroupFlowLPM = 0;
    let selectedGroupHeadM = maxHeadZone.totalHead;
    let criticalGroup: ZoneOperationGroup | undefined;

    if (zoneOperationGroups && zoneOperationGroups.length > 0) {
        const groupRequirements = zoneOperationGroups.map((group) => {
            const zonesInGroup = allZoneResults.filter((zr) => group.zones.includes(zr.zoneId));
            const totalFlow = zonesInGroup.reduce((sum, zone) => sum + zone.totalFlowLPM, 0);
            const maxHead =
                zonesInGroup.length > 0
                    ? Math.max(...zonesInGroup.map((zone) => zone.totalHead))
                    : 0;

            return {
                group,
                totalFlow,
                maxHead,
                zones: zonesInGroup,
            };
        });

        const criticalGroupReq = groupRequirements.reduce((max, current) =>
            current.maxHead > max.maxHead ? current : max
        );

        selectedGroupFlowLPM = criticalGroupReq.totalFlow;
        selectedGroupHeadM = criticalGroupReq.maxHead;
        criticalGroup = criticalGroupReq.group;

        if (
            zoneOperationGroups.length === 1 &&
            zoneOperationGroups[0].zones.length === allZoneResults.length
        ) {
            operationMode = 'simultaneous';
        } else if (zoneOperationGroups.length > 1) {
            operationMode = 'custom';
        }
    }

    const totalFlowLPM = allZoneResults.reduce((sum, zone) => sum + zone.totalFlowLPM, 0);

    return {
        totalFlowLPM,
        maxHeadM: maxHeadZone.totalHead,
        criticalZone: maxHeadZone.zoneId,
        operationMode,
        selectedGroupFlowLPM,
        selectedGroupHeadM,
        criticalGroup,
    };
};

const calculateSystemComplexity = (input: IrrigationInput): string => {
    let complexityScore = 0;

    if (input.numberOfZones > 6) complexityScore += 4;
    else if (input.numberOfZones > 3) complexityScore += 3;
    else if (input.numberOfZones > 1) complexityScore += 2;

    if (input.longestMainPipeM > 0 && input.longestSecondaryPipeM > 0) complexityScore += 4;
    else if (input.longestSecondaryPipeM > 0) complexityScore += 3;
    else if (input.longestMainPipeM > 0) complexityScore += 2;

    if (input.farmSizeRai > 30 || input.totalTrees > 3000) complexityScore += 3;
    else if (input.farmSizeRai > 15 || input.totalTrees > 1500) complexityScore += 2;
    else if (input.farmSizeRai > 5 || input.totalTrees > 500) complexityScore += 1;

    const totalPipeLength =
        input.totalBranchPipeM + input.totalSecondaryPipeM + input.totalMainPipeM;
    if (totalPipeLength > 5000) complexityScore += 3;
    else if (totalPipeLength > 2000) complexityScore += 2;
    else if (totalPipeLength > 800) complexityScore += 1;

    if (input.simultaneousZones === input.numberOfZones && input.numberOfZones > 3) {
        complexityScore += 2;
    }

    if (complexityScore >= 8) return 'complex';
    if (complexityScore >= 4) return 'medium';
    return 'simple';
};

const autoSelectBestPipe = (analyzedPipes: any[], pipeType: string, flowLPM: number): any => {
    if (!analyzedPipes || analyzedPipes.length === 0) return null;

    const suitablePipes = analyzedPipes.filter((pipe) => {
        const isVelocityOK = pipe.velocity >= 0.3 && pipe.velocity <= 3.5;
        const isPressureOK = pipe.pn >= 6;
        const hasReasonableScore = pipe.score >= 25;
        const isHeadLossOK = (pipe.headLoss / pipe.lengthM) * 100 <= 20;
        return isVelocityOK && isPressureOK && hasReasonableScore && isHeadLossOK;
    });

    if (suitablePipes.length === 0) {
        return analyzedPipes.sort((a, b) => b.score - a.score)[0];
    }

    return suitablePipes.sort((a, b) => {
        if (a.isRecommended !== b.isRecommended) return b.isRecommended ? 1 : -1;
        if (a.isGoodChoice !== b.isGoodChoice) return b.isGoodChoice ? 1 : -1;

        const aHeadLossPer100m = (a.headLoss / Math.max(a.lengthM || 50, 1)) * 100;
        const bHeadLossPer100m = (b.headLoss / Math.max(b.lengthM || 50, 1)) * 100;
        if (Math.abs(aHeadLossPer100m - bHeadLossPer100m) > 3) {
            return aHeadLossPer100m - bHeadLossPer100m;
        }

        if (Math.abs(a.score - b.score) > 5) return b.score - a.score;

        const aVelScore = Math.abs(1.4 - a.velocity);
        const bVelScore = Math.abs(1.4 - b.velocity);
        if (Math.abs(aVelScore - bVelScore) > 0.2) return aVelScore - bVelScore;

        return a.price - b.price;
    })[0];
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
        return analyzedPumps.sort((a, b) => {
            const aDeficit =
                Math.max(0, requiredFlowLPM - a.maxFlow) +
                Math.max(0, requiredHeadM - a.maxHead) * 2;
            const bDeficit =
                Math.max(0, requiredFlowLPM - b.maxFlow) +
                Math.max(0, requiredHeadM - b.maxHead) * 2;
            return aDeficit - bDeficit;
        })[0];
    }

    return adequatePumps.sort((a, b) => {
        if (a.isRecommended !== b.isRecommended) return b.isRecommended ? 1 : -1;
        if (a.isGoodChoice !== b.isGoodChoice) return b.isGoodChoice ? 1 : -1;

        const aOversize = a.flowRatio - 1 + (a.headRatio - 1);
        const bOversize = b.flowRatio - 1 + (b.headRatio - 1);
        if (Math.abs(aOversize - bOversize) > 0.3) return aOversize - bOversize;

        const aEfficiency = a.flowPerBaht || 0;
        const bEfficiency = b.flowPerBaht || 0;
        if (Math.abs(aEfficiency - bEfficiency) > 0.01) return bEfficiency - aEfficiency;

        return b.score - a.score;
    })[0];
};

export const useCalculations = (
    input: IrrigationInput,
    selectedSprinkler?: any,
    allZoneData?: ZoneCalculationData[],
    zoneOperationGroups?: ZoneOperationGroup[]
): CalculationResults | null => {
    const [sprinklerData, setSprinklerData] = useState<any[]>([]);
    const [pumpData, setPumpData] = useState<any[]>([]);
    const [pipeData, setPipeData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                } catch {
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
                                transformed.radiusMeters = parseRangeValue(
                                    transformed.radiusMeters
                                );
                            }
                            if (transformed.pressureBar !== undefined) {
                                transformed.pressureBar = parseRangeValue(transformed.pressureBar);
                            }
                            break;

                        case 'pump':
                            {
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
                            }

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
        if (loading || error) return null;
        if (!sprinklerData.length || !pumpData.length || !pipeData.length) return null;
        if (!input) return null;

        const sanitizedInput = {
            ...input,
            sprinklersPerLongestBranch: Math.min(
                Math.max(input.sprinklersPerLongestBranch || 4, 1),
                20
            ),
            branchesPerLongestSecondary: Math.min(
                Math.max(input.branchesPerLongestSecondary || 1, 1),
                10
            ),
            totalTrees: Math.max(input.totalTrees, 1),
            waterPerTreeLiters: Math.max(input.waterPerTreeLiters, 0.1),
            irrigationTimeMinutes: Math.max(input.irrigationTimeMinutes, 5),
        };

        const flowData = calculateFlowRequirements(sanitizedInput, selectedSprinkler);
        const systemComplexity = calculateSystemComplexity(sanitizedInput);

        const hasValidSecondaryPipe =
            sanitizedInput.longestSecondaryPipeM > 0 && sanitizedInput.totalSecondaryPipeM > 0;
        const hasValidMainPipe =
            sanitizedInput.longestMainPipeM > 0 && sanitizedInput.totalMainPipeM > 0;

        let allZoneResults: ZoneResults[] = [];
        let projectSummary: ProjectSummary | undefined = undefined;

        if (allZoneData && allZoneData.length > 1) {
            allZoneResults = calculateZoneResults(allZoneData, pipeData);
            projectSummary = calculateProjectSummary(allZoneResults, zoneOperationGroups || []);
        }

        const analyzedSprinklers = sprinklerData
            .map((sprinkler) => ({
                ...sprinkler,
                score: 0,
            }))
            .sort((a, b) => a.price - b.price);

        const analyzedBranchPipes = pipeData
            .map((pipe) =>
                evaluatePipeOverall(
                    pipe,
                    flowData.branchFlowLPM,
                    sanitizedInput.longestBranchPipeM,
                    'branch',
                    sanitizedInput.pipeAgeYears || 0,
                    []
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
                          sanitizedInput.longestSecondaryPipeM,
                          'secondary',
                          sanitizedInput.pipeAgeYears || 0,
                          []
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
                          sanitizedInput.longestMainPipeM,
                          'main',
                          sanitizedInput.pipeAgeYears || 0,
                          []
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
                  sanitizedInput.longestBranchPipeM,
                  autoSelectedBranchPipe.pipeType,
                  'branch',
                  sanitizedInput.pipeAgeYears || 0
              )
            : { major: 0, minor: 0, total: 0, velocity: 0, C: 135, K: 0 };

        const secondaryLoss =
            autoSelectedSecondaryPipe && hasValidSecondaryPipe
                ? calculateImprovedHeadLoss(
                      flowData.secondaryFlowLPM,
                      autoSelectedSecondaryPipe.sizeMM,
                      sanitizedInput.longestSecondaryPipeM,
                      autoSelectedSecondaryPipe.pipeType,
                      'secondary',
                      sanitizedInput.pipeAgeYears || 0
                  )
                : { major: 0, minor: 0, total: 0, velocity: 0, C: 140, K: 0 };

        const mainLoss =
            autoSelectedMainPipe && hasValidMainPipe
                ? calculateImprovedHeadLoss(
                      flowData.mainFlowLPM,
                      autoSelectedMainPipe.sizeMM,
                      sanitizedInput.longestMainPipeM,
                      autoSelectedMainPipe.pipeType,
                      'main',
                      sanitizedInput.pipeAgeYears || 0
                  )
                : { major: 0, minor: 0, total: 0, velocity: 0, C: 145, K: 0 };

        let totalHeadLoss = branchLoss.total + secondaryLoss.total + mainLoss.total;
        const connectionLoss = totalHeadLoss * 0.03;
        totalHeadLoss += connectionLoss;

        const totalMajorLoss = branchLoss.major + secondaryLoss.major + mainLoss.major;
        const totalMinorLoss =
            branchLoss.minor + secondaryLoss.minor + mainLoss.minor + connectionLoss;

        const pressureFromSprinkler = calculateSprinklerPressure(
            selectedSprinkler,
            sanitizedInput.pressureHeadM
        );

        let basePumpHead = sanitizedInput.staticHeadM + totalHeadLoss + pressureFromSprinkler;
        let requiredPumpFlow = flowData.totalFlowLPM;

        if (projectSummary) {
            basePumpHead = projectSummary.selectedGroupHeadM;
            requiredPumpFlow = projectSummary.selectedGroupFlowLPM;
        }

        const safetyFactor = calculateSafetyFactor(systemComplexity, sanitizedInput.numberOfZones);
        const pumpHeadRequired = basePumpHead * safetyFactor;

        const headLossValidation = validateHeadLossRatio(totalHeadLoss, basePumpHead);

        const analyzedPumps = pumpData
            .map((pump) => evaluatePumpOverall(pump, requiredPumpFlow, pumpHeadRequired))
            .sort((a, b) => b.score - a.score);

        const autoSelectedPump = autoSelectBestPump(
            analyzedPumps,
            requiredPumpFlow,
            pumpHeadRequired
        );

        const branchRolls =
            autoSelectedBranchPipe && sanitizedInput.totalBranchPipeM > 0
                ? calculatePipeRolls(
                      sanitizedInput.totalBranchPipeM,
                      autoSelectedBranchPipe.lengthM
                  )
                : 0;
        const secondaryRolls =
            autoSelectedSecondaryPipe && hasValidSecondaryPipe
                ? calculatePipeRolls(
                      sanitizedInput.totalSecondaryPipeM,
                      autoSelectedSecondaryPipe.lengthM
                  )
                : 0;
        const mainRolls =
            autoSelectedMainPipe && hasValidMainPipe
                ? calculatePipeRolls(sanitizedInput.totalMainPipeM, autoSelectedMainPipe.lengthM)
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

        return {
            totalWaterRequiredLPH: flowData.totalFlowLPH,
            totalWaterRequiredLPM: flowData.totalFlowLPM,
            waterPerZoneLPH: formatNumber(flowData.totalFlowLPH / sanitizedInput.numberOfZones, 1),
            waterPerZoneLPM: formatNumber(flowData.totalFlowLPM / sanitizedInput.numberOfZones, 1),
            totalSprinklers: flowData.totalSprinklers,
            sprinklersPerZone: flowData.sprinklersPerZone,
            waterPerSprinklerLPH: flowData.flowPerSprinklerLPH,
            waterPerSprinklerLPM: flowData.flowPerSprinklerLPM,

            recommendedSprinklers: [],
            recommendedBranchPipe: analyzedBranchPipes.filter((p) => p.isRecommended),
            recommendedSecondaryPipe: analyzedSecondaryPipes.filter((p) => p.isRecommended),
            recommendedMainPipe: analyzedMainPipes.filter((p) => p.isRecommended),
            recommendedPump: analyzedPumps.filter((p) => p.isRecommended),

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
                branch: formatNumber(branchLoss.C, 0),
                secondary: formatNumber(secondaryLoss.C, 0),
                main: formatNumber(mainLoss.C, 0),
            },

            pumpHeadRequired: formatNumber(pumpHeadRequired, 3),
            pressureFromSprinkler: formatNumber(pressureFromSprinkler, 3),
            safetyFactor: safetyFactor,
            adjustedFlow: requiredPumpFlow,
            velocityWarnings,
            hasValidSecondaryPipe,
            hasValidMainPipe,

            headLossValidation,

            allZoneResults,
            projectSummary,

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
                    farmSize: sanitizedInput.farmSizeRai,
                    complexity: systemComplexity,
                    totalFlow: requiredPumpFlow,
                    totalHead: pumpHeadRequired,
                    safetyFactor: safetyFactor,
                },
                flowCalculations: {
                    totalFlowLPH: flowData.totalFlowLPH,
                    flowPerSprinkler: flowData.flowPerSprinklerLPM,
                    branchFlow: flowData.branchFlowLPM,
                    secondaryFlow: flowData.secondaryFlowLPM,
                    mainFlow: flowData.mainFlowLPM,
                    pumpFlow: requiredPumpFlow,
                    sprinklerBased: !!selectedSprinkler,
                },
                multiZoneInfo: allZoneData
                    ? {
                          totalZones: allZoneData.length,
                          simultaneousZones: sanitizedInput.simultaneousZones,
                          calculationMethod:
                              allZoneData.length > 1 ? 'multi-zone-optimized' : 'single-zone',
                          operationGroups: zoneOperationGroups,
                          criticalGroup: projectSummary?.criticalGroup,
                          projectSummary: projectSummary,
                      }
                    : undefined,
                headLossAnalysis: {
                    ratio: headLossValidation.ratio,
                    isValid: headLossValidation.isValid,
                    severity: headLossValidation.severity,
                    recommendation: headLossValidation.recommendation,
                    breakdown: {
                        branch: formatNumber(branchLoss.total, 3),
                        secondary: formatNumber(secondaryLoss.total, 3),
                        main: formatNumber(mainLoss.total, 3),
                        connection: formatNumber(connectionLoss, 3),
                        total: formatNumber(totalHeadLoss, 3),
                    },
                },
                inputValidation: {
                    originalInput: input,
                    sanitizedInput: sanitizedInput,
                    changesApplied: JSON.stringify(input) !== JSON.stringify(sanitizedInput),
                },
            },
        };
    }, [
        input,
        selectedSprinkler,
        sprinklerData,
        pumpData,
        pipeData,
        loading,
        error,
        allZoneData,
        zoneOperationGroups,
    ]);
};
