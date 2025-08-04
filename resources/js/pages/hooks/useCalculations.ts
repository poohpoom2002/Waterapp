// resources\js\pages\hooks\useCalculations.ts
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
    projectMode?: 'horticulture' | 'garden' | 'field-crop' | 'greenhouse';
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

const calculateSprinklerPressure = (sprinkler: any, defaultPressure: number, projectMode?: string): number => {
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

        let workingPressureFactor = 0.7;
        if (projectMode === 'garden') {
            workingPressureFactor = 0.6;
        } else if (projectMode === 'field-crop') {
            workingPressureFactor = 0.8;
        } else if (projectMode === 'greenhouse') {
            workingPressureFactor = 0.65;
        }

        const avgPressureBar = (minPressure + maxPressure) / 2;
        const workingPressureBar = avgPressureBar * workingPressureFactor;
        return workingPressureBar * 10.197;
    } catch (error) {
        console.error('Error calculating pressure from sprinkler:', error);
        return defaultPressure;
    }
};

const calculateSprinklerBasedFlow = (sprinkler: any, input: IrrigationInput, projectMode?: string) => {
    let totalWaterPerMinute: number;
    let totalSprinklers: number;
    
    if (projectMode === 'field-crop') {
        totalWaterPerMinute = input.totalTrees * input.waterPerTreeLiters;
        totalSprinklers = input.totalTrees;
    } else if (projectMode === 'greenhouse') {
        const waterPerSprinklerPerMinute = input.waterPerTreeLiters / (input.irrigationTimeMinutes || 30);
        totalWaterPerMinute = input.totalTrees * waterPerSprinklerPerMinute;
        totalSprinklers = input.totalTrees;
    } else if (projectMode === 'garden') {
        const waterPerSprinklerPerMinute = input.waterPerTreeLiters / (input.irrigationTimeMinutes || 30);
        totalWaterPerMinute = input.totalTrees * waterPerSprinklerPerMinute;
        totalSprinklers = input.totalTrees;
    } else {
        const totalWaterPerIrrigation = input.totalTrees * input.waterPerTreeLiters * (input.sprinklersPerTree || 1);
        totalWaterPerMinute = totalWaterPerIrrigation / (input.irrigationTimeMinutes || 30);
        totalSprinklers = Math.ceil(input.totalTrees * (input.sprinklersPerTree || 1));
    }

    if (!sprinkler) {
        return {
            totalFlowLPM: formatNumber(totalWaterPerMinute, 1),
            sprinklersUsed: totalSprinklers,
        };
    }

    try {
        let sprinklerFlowLPM;
        const flowData = sprinkler.waterVolumeLitersPerMinute || sprinkler.waterVolumeLPM;

        if (Array.isArray(flowData)) {
            const avgFlow = (flowData[0] + flowData[1]) / 2;
            sprinklerFlowLPM = avgFlow;
        } else if (typeof flowData === 'string' && flowData.includes('-')) {
            const parts = flowData.split('-');
            const min = parseFloat(parts[0]);
            const max = parseFloat(parts[1]);
            const avgFlow = (min + max) / 2;
            sprinklerFlowLPM = avgFlow;
        } else {
            sprinklerFlowLPM = parseFloat(String(flowData)) || 0;
        }

        if (sprinklerFlowLPM <= 0 || isNaN(sprinklerFlowLPM)) {
            throw new Error('Invalid sprinkler flow rate');
        }

        if (projectMode === 'greenhouse') {
            return {
                totalFlowLPM: totalWaterPerMinute,
                sprinklerFlowLPM: formatNumber(totalWaterPerMinute / totalSprinklers, 1),
                sprinklersUsed: totalSprinklers,
            };
        }

        const expectedFlowPerSprinkler = totalWaterPerMinute / totalSprinklers;

        if (sprinklerFlowLPM > expectedFlowPerSprinkler * 3) {
            return {
                totalFlowLPM: totalWaterPerMinute,
                sprinklerFlowLPM: expectedFlowPerSprinkler,
                sprinklersUsed: totalSprinklers,
            };
        }

        if (sprinklerFlowLPM < expectedFlowPerSprinkler / 3) {
            return {
                totalFlowLPM: totalWaterPerMinute,
                sprinklerFlowLPM: expectedFlowPerSprinkler,
                sprinklersUsed: totalSprinklers,
            };
        }

        const effectiveFlowPerSprinkler = Math.min(sprinklerFlowLPM, expectedFlowPerSprinkler * 1.2);
        const totalFlowLPM = effectiveFlowPerSprinkler * totalSprinklers;

        return {
            totalFlowLPM: totalFlowLPM,
            sprinklerFlowLPM: formatNumber(effectiveFlowPerSprinkler, 1),
            sprinklersUsed: totalSprinklers,
        };
    } catch (error) {
        console.error('Error calculating sprinkler flow:', error);
        return {
            totalFlowLPM: totalWaterPerMinute,
            sprinklerFlowLPM: totalWaterPerMinute / totalSprinklers,
            sprinklersUsed: totalSprinklers,
        };
    }
};

const calculateFlowRequirements = (input: IrrigationInput, selectedSprinkler: any, projectMode?: string) => {
    const sprinklerFlow = calculateSprinklerBasedFlow(selectedSprinkler, input, projectMode);

    let totalSprinklers: number;
    let flowPerSprinklerLPM: number;

    if (projectMode === 'field-crop' || projectMode === 'greenhouse' || projectMode === 'garden') {
        totalSprinklers = sprinklerFlow.sprinklersUsed || input.totalTrees;
        flowPerSprinklerLPM = sprinklerFlow.sprinklerFlowLPM || sprinklerFlow.totalFlowLPM / totalSprinklers;
    } else {
        totalSprinklers = sprinklerFlow.sprinklersUsed || Math.ceil(input.totalTrees * (input.sprinklersPerTree || 1));
        flowPerSprinklerLPM = sprinklerFlow.sprinklerFlowLPM || sprinklerFlow.totalFlowLPM / totalSprinklers;
    }

    let maxSprinklersPerBranch: number;
    if (projectMode === 'field-crop') {
        maxSprinklersPerBranch = Math.min(input.sprinklersPerLongestBranch || input.sprinklersPerBranch, 25);
    } else if (projectMode === 'greenhouse') {
        maxSprinklersPerBranch = Math.min(input.sprinklersPerLongestBranch || input.sprinklersPerBranch, 15);
    } else if (projectMode === 'garden') {
        maxSprinklersPerBranch = Math.min(input.sprinklersPerLongestBranch || input.sprinklersPerBranch, 12);
    } else {
        maxSprinklersPerBranch = Math.min(input.sprinklersPerLongestBranch || input.sprinklersPerBranch, 20);
    }

    const branchFlowLPM = flowPerSprinklerLPM * maxSprinklersPerBranch;

    let maxBranchesPerSecondary: number;
    if (projectMode === 'field-crop') {
        maxBranchesPerSecondary = Math.min(input.branchesPerLongestSecondary || input.branchesPerSecondary, 12);
    } else if (projectMode === 'greenhouse') {
        maxBranchesPerSecondary = Math.min(input.branchesPerLongestSecondary || input.branchesPerSecondary, 8);
    } else {
        maxBranchesPerSecondary = Math.min(input.branchesPerLongestSecondary || input.branchesPerSecondary, 10);
    }

    const secondaryFlowLPM = input.longestSecondaryPipeM > 0 
        ? branchFlowLPM * maxBranchesPerSecondary 
        : 0;

    const mainFlowLPM = input.longestMainPipeM > 0 
        ? Math.min(sprinklerFlow.totalFlowLPM, secondaryFlowLPM * 2) 
        : 0;

    return {    
        totalFlowLPM: sprinklerFlow.totalFlowLPM,
        totalSprinklers,
        sprinklersPerZone: formatNumber(totalSprinklers / input.numberOfZones, 1),
        flowPerSprinklerLPM: formatNumber(flowPerSprinklerLPM, 2),
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
        const { zoneId, input, sprinkler, projectMode } = zoneData;

        const flowData = calculateFlowRequirements(input, sprinkler, projectMode);

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
            flowData.branchFlowLPM,
            projectMode
        );

        const hasValidSecondaryPipe = input.longestSecondaryPipeM > 0 && input.totalSecondaryPipeM > 0;
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
                flowData.secondaryFlowLPM,
                projectMode
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
                flowData.mainFlowLPM,
                projectMode
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

        const secondaryLoss = autoSelectedSecondaryPipe && hasValidSecondaryPipe
            ? calculateImprovedHeadLoss(
                  flowData.secondaryFlowLPM,
                  autoSelectedSecondaryPipe.sizeMM,
                  input.longestSecondaryPipeM,
                  autoSelectedSecondaryPipe.pipeType,
                  'secondary',
                  input.pipeAgeYears || 0
              )
            : { major: 0, minor: 0, total: 0, velocity: 0, C: 140, K: 0 };

        const mainLoss = autoSelectedMainPipe && hasValidMainPipe
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
        const pressureHead = calculateSprinklerPressure(sprinkler, input.pressureHeadM, projectMode);
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
    let selectedGroupFlowLPM = maxHeadZone.totalFlowLPM;
    let selectedGroupHeadM = maxHeadZone.totalHead;
    let criticalGroup: ZoneOperationGroup | undefined;

    if (zoneOperationGroups && zoneOperationGroups.length > 0) {
        const groupRequirements = zoneOperationGroups.map((group) => {
            const zonesInGroup = allZoneResults.filter((zr) => group.zones.includes(zr.zoneId));
            const totalFlow = zonesInGroup.reduce((sum, zone) => sum + zone.totalFlowLPM, 0);
            const maxHead = zonesInGroup.length > 0
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

const calculateSystemComplexity = (input: IrrigationInput, projectMode?: string): string => {
    let complexityScore = 0;

    if (input.numberOfZones > 6) complexityScore += 4;
    else if (input.numberOfZones > 3) complexityScore += 3;
    else if (input.numberOfZones > 1) complexityScore += 2;

    if (input.longestMainPipeM > 0 && input.longestSecondaryPipeM > 0) complexityScore += 4;
    else if (input.longestSecondaryPipeM > 0) complexityScore += 3;
    else if (input.longestMainPipeM > 0) complexityScore += 2;

    if (projectMode === 'field-crop') {
        if (input.farmSizeRai > 50 || input.totalTrees > 2000) complexityScore += 4;
        else if (input.farmSizeRai > 20 || input.totalTrees > 1000) complexityScore += 3;
        else if (input.farmSizeRai > 10 || input.totalTrees > 500) complexityScore += 2;
    } else if (projectMode === 'greenhouse') {
        if (input.farmSizeRai > 5000 || input.totalTrees > 2000) complexityScore += 3;
        else if (input.farmSizeRai > 2000 || input.totalTrees > 1000) complexityScore += 2;
        else if (input.farmSizeRai > 1000 || input.totalTrees > 500) complexityScore += 1;
    } else if (projectMode === 'garden') {
        if (input.farmSizeRai > 800 || input.totalTrees > 200) complexityScore += 2;
        else if (input.farmSizeRai > 400 || input.totalTrees > 100) complexityScore += 1;
    } else {
        if (input.farmSizeRai > 30 || input.totalTrees > 3000) complexityScore += 3;
        else if (input.farmSizeRai > 15 || input.totalTrees > 1500) complexityScore += 2;
        else if (input.farmSizeRai > 5 || input.totalTrees > 500) complexityScore += 1;
    }

    const totalPipeLength = input.totalBranchPipeM + input.totalSecondaryPipeM + input.totalMainPipeM;
    
    let pipeLengthThresholds = [5000, 2000, 800];
    if (projectMode === 'field-crop') {
        pipeLengthThresholds = [8000, 3000, 1200];
    } else if (projectMode === 'greenhouse') {
        pipeLengthThresholds = [2000, 800, 300];
    } else if (projectMode === 'garden') {
        pipeLengthThresholds = [1000, 400, 150];
    }

    if (totalPipeLength > pipeLengthThresholds[0]) complexityScore += 3;
    else if (totalPipeLength > pipeLengthThresholds[1]) complexityScore += 2;
    else if (totalPipeLength > pipeLengthThresholds[2]) complexityScore += 1;

    if (input.simultaneousZones === input.numberOfZones && input.numberOfZones > 3) {
        complexityScore += 2;
    }

    if (complexityScore >= 8) return 'complex';
    if (complexityScore >= 4) return 'medium';
    return 'simple';
};

const autoSelectBestPipe = (
    analyzedPipes: any[], 
    pipeType: string, 
    flowLPM: number, 
    projectMode?: string
): any => {
    if (!analyzedPipes || analyzedPipes.length === 0) return null;

    let velocityMin = 0.3;
    let velocityMax = 3.5;
    let minPressure = 6;
    let minScore = 25;

    if (projectMode === 'field-crop') {
        velocityMin = 0.4;
        velocityMax = 4.0;
        minPressure = 8;
        minScore = 30;
    } else if (projectMode === 'greenhouse') {
        velocityMin = 0.2;
        velocityMax = 3.0;
        minPressure = 6;
        minScore = 35;
    } else if (projectMode === 'garden') {
        velocityMin = 0.3;
        velocityMax = 3.2;
        minPressure = 4;
        minScore = 20;
    }

    const suitablePipes = analyzedPipes.filter((pipe) => {
        const isVelocityOK = pipe.velocity >= velocityMin && pipe.velocity <= velocityMax;
        const isPressureOK = pipe.pn >= minPressure;
        const hasReasonableScore = pipe.score >= minScore;
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

        let optimalVelocity = 1.4;
        if (projectMode === 'field-crop') {
            optimalVelocity = 1.6;
        } else if (projectMode === 'greenhouse') {
            optimalVelocity = 1.2;
        }

        const aVelScore = Math.abs(optimalVelocity - a.velocity);
        const bVelScore = Math.abs(optimalVelocity - b.velocity);
        if (Math.abs(aVelScore - bVelScore) > 0.2) return aVelScore - bVelScore;

        return a.price - b.price;
    })[0];
};

const autoSelectBestPump = (
    analyzedPumps: any[],
    requiredFlowLPM: number,
    requiredHeadM: number,
    projectMode?: string
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

        let flowWeight = 1;
        let headWeight = 1;
        
        if (projectMode === 'field-crop') {
            flowWeight = 1.2;
            headWeight = 0.8;
        } else if (projectMode === 'greenhouse') {
            flowWeight = 0.8;
            headWeight = 1.2;
        }

        const aOversize = (a.flowRatio - 1) * flowWeight + (a.headRatio - 1) * headWeight;
        const bOversize = (b.flowRatio - 1) * flowWeight + (b.headRatio - 1) * headWeight;
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
                            if (transformed.waterVolumeLitersPerMinute !== undefined) {
                                transformed.waterVolumeLitersPerMinute = parseRangeValue(
                                    transformed.waterVolumeLitersPerMinute
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

        const projectMode = allZoneData && allZoneData.length > 0 
            ? allZoneData[0].projectMode 
            : undefined;

        const sanitizedInput = {
            ...input,
            sprinklersPerLongestBranch: Math.min(
                Math.max(input.sprinklersPerLongestBranch || 4, 1),
                projectMode === 'field-crop' ? 25 : projectMode === 'greenhouse' ? 15 : 20
            ),
            branchesPerLongestSecondary: Math.min(
                Math.max(input.branchesPerLongestSecondary || 1, 1),
                projectMode === 'field-crop' ? 12 : projectMode === 'greenhouse' ? 8 : 10
            ),
            totalTrees: Math.max(input.totalTrees, 1),
            waterPerTreeLiters: Math.max(input.waterPerTreeLiters, 0.1),
            irrigationTimeMinutes: Math.max(input.irrigationTimeMinutes, 5),
        };

        const flowData = calculateFlowRequirements(sanitizedInput, selectedSprinkler, projectMode);
        const systemComplexity = calculateSystemComplexity(sanitizedInput, projectMode);

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
            flowData.branchFlowLPM,
            projectMode
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
            ? autoSelectBestPipe(analyzedSecondaryPipes, 'secondary', flowData.secondaryFlowLPM, projectMode)
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
            ? autoSelectBestPipe(analyzedMainPipes, 'main', flowData.mainFlowLPM, projectMode)
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
            sanitizedInput.pressureHeadM,
            projectMode
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
            pumpHeadRequired,
            projectMode
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
            totalWaterRequiredLPM: flowData.totalFlowLPM,
            waterPerZoneLPM: formatNumber(flowData.totalFlowLPM / sanitizedInput.numberOfZones, 1),
            totalSprinklers: flowData.totalSprinklers,
            sprinklersPerZone: flowData.sprinklersPerZone,
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
                totalWaterRequiredLPM: flowData.totalFlowLPM,
                waterPerZoneLPM: formatNumber(flowData.totalFlowLPM / sanitizedInput.numberOfZones, 1),
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