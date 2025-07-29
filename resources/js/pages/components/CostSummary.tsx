/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// resources\js\pages\components\CostSummary.tsx
import React from 'react';
import { AnalyzedPipe, CalculationResults, IrrigationInput } from '../types/interfaces';
import { HorticultureProjectData } from '../../utils/horticultureUtils';
import { GardenPlannerData } from '../../utils/homeGardenData';
import { GardenStatistics } from '../../utils/gardenStatistics';
import { calculatePipeRolls } from '../utils/calculations';
import { useLanguage } from '../../contexts/LanguageContext';

interface CostSummaryProps {
    results: CalculationResults;
    zoneSprinklers: { [zoneId: string]: any };
    selectedPipes: { [zoneId: string]: { branch?: any; secondary?: any; main?: any } };
    selectedPump: any;
    activeZoneId: string;
    projectData?: HorticultureProjectData | null;
    gardenData?: GardenPlannerData | null;
    gardenStats?: GardenStatistics | null;
    zoneInputs: { [zoneId: string]: IrrigationInput };
    onQuotationClick: () => void;
    projectMode?: 'horticulture' | 'garden' | 'field-crop' | 'greenhouse';
    showPump?: boolean;
}

interface SprinklerSummary {
    [sprinklerId: string]: {
        sprinkler: any;
        quantity: number;
        zones: string[];
        totalCost: number;
    };
}

interface PipeSummary {
    branch: {
        [pipeId: string]: {
            pipe: any;
            totalLength: number;
            quantity: number;
            zones: string[];
            totalCost: number;
            includesExtra?: boolean;
            extraLength?: number;
        };
    };
    secondary: {
        [pipeId: string]: {
            pipe: any;
            totalLength: number;
            quantity: number;
            zones: string[];
            totalCost: number;
        };
    };
    main: {
        [pipeId: string]: {
            pipe: any;
            totalLength: number;
            quantity: number;
            zones: string[];
            totalCost: number;
        };
    };
}

const CostSummary: React.FC<CostSummaryProps> = ({
    results,
    zoneSprinklers,
    selectedPipes,
    selectedPump,
    activeZoneId,
    projectData,
    gardenData,
    gardenStats,
    zoneInputs,
    onQuotationClick,
    projectMode = 'horticulture',
    showPump = true,
}) => {
    const { t } = useLanguage();
    const calculateTotalCosts = () => {
        let totalSprinklerCost = 0;
        let totalBranchPipeCost = 0;
        let totalSecondaryPipeCost = 0;
        let totalMainPipeCost = 0;

        const sprinklerSummary: SprinklerSummary = {};
        const pipeSummary: PipeSummary = { branch: {}, secondary: {}, main: {} };
        let extraPipeSummary: any = null;

        const processExtraPipe = (
            zoneId: string,
            zoneInput: IrrigationInput,
            sprinklerCount: number
        ) => {
            if (
                zoneInput.extraPipePerSprinkler &&
                zoneInput.extraPipePerSprinkler.pipeId &&
                zoneInput.extraPipePerSprinkler.lengthPerHead > 0
            ) {
                const extraPipeId = zoneInput.extraPipePerSprinkler.pipeId;
                const extraLength = sprinklerCount * zoneInput.extraPipePerSprinkler.lengthPerHead;

                const zonePipes = selectedPipes[zoneId] || {};
                const branchPipe = zonePipes.branch || results.autoSelectedBranchPipe;
                const secondaryPipe = zonePipes.secondary || results.autoSelectedSecondaryPipe;
                const mainPipe = zonePipes.main || results.autoSelectedMainPipe;

                if (branchPipe && branchPipe.id === extraPipeId) {
                    const key = `${branchPipe.id}`;
                    if (!pipeSummary.branch[key]) {
                        pipeSummary.branch[key] = {
                            pipe: branchPipe,
                            totalLength: 0,
                            quantity: 0,
                            zones: [],
                            totalCost: 0,
                            includesExtra: true,
                            extraLength: 0,
                        };
                    }
                    pipeSummary.branch[key].extraLength =
                        (pipeSummary.branch[key].extraLength || 0) + extraLength;
                    pipeSummary.branch[key].includesExtra = true;
                    return true;
                }

                if (secondaryPipe && secondaryPipe.id === extraPipeId) {
                    const key = `${secondaryPipe.id}`;
                    if (!pipeSummary.secondary[key]) {
                        pipeSummary.secondary[key] = {
                            pipe: secondaryPipe,
                            totalLength: 0,
                            quantity: 0,
                            zones: [],
                            totalCost: 0,
                        };
                    }
                    return true;
                }

                if (mainPipe && mainPipe.id === extraPipeId) {
                    const key = `${mainPipe.id}`;
                    if (!pipeSummary.main[key]) {
                        pipeSummary.main[key] = {
                            pipe: mainPipe,
                            totalLength: 0,
                            quantity: 0,
                            zones: [],
                            totalCost: 0,
                        };
                    }
                    return true;
                }

                let pipe: AnalyzedPipe | undefined;
                if (results.analyzedBranchPipes) {
                    pipe = results.analyzedBranchPipes.find((p) => p.id === extraPipeId);
                }
                if (!pipe && results.analyzedSecondaryPipes) {
                    pipe = results.analyzedSecondaryPipes.find((p) => p.id === extraPipeId);
                }
                if (!pipe && results.analyzedMainPipes) {
                    pipe = results.analyzedMainPipes.find((p) => p.id === extraPipeId);
                }

                if (pipe) {
                    if (!extraPipeSummary) {
                        extraPipeSummary = {
                            pipe,
                            totalLength: extraLength,
                            zones: [zoneId],
                        };
                    } else if (extraPipeSummary.pipe.id === extraPipeId) {
                        extraPipeSummary.totalLength += extraLength;
                        if (!extraPipeSummary.zones.includes(zoneId)) {
                            extraPipeSummary.zones.push(zoneId);
                        }
                    }
                }

                return false;
            }
            return false;
        };

        if (projectMode === 'garden' && gardenStats) {
            gardenStats.zones.forEach((zone) => {
                const zoneSprinkler = zoneSprinklers[zone.zoneId];
                const zonePipes = selectedPipes[zone.zoneId] || {};
                const zoneInput = zoneInputs[zone.zoneId];

                if (zoneSprinkler) {
                    const sprinklerQuantity = zone.sprinklerCount;
                    const sprinklerCost = zoneSprinkler.price * sprinklerQuantity;
                    totalSprinklerCost += sprinklerCost;

                    const key = `${zoneSprinkler.id}`;
                    if (!sprinklerSummary[key]) {
                        sprinklerSummary[key] = {
                            sprinkler: zoneSprinkler,
                            quantity: 0,
                            zones: [],
                            totalCost: 0,
                        };
                    }
                    sprinklerSummary[key].quantity += sprinklerQuantity;
                    sprinklerSummary[key].zones.push(zone.zoneName);
                    sprinklerSummary[key].totalCost += sprinklerCost;
                }

                if (zoneInput) {
                    processExtraPipe(zone.zoneId, zoneInput, zone.sprinklerCount);

                    const branchPipe = zonePipes.branch || results.autoSelectedBranchPipe;
                    if (branchPipe && zoneInput.totalBranchPipeM > 0) {
                        const key = `${branchPipe.id}`;
                        if (!pipeSummary.branch[key]) {
                            pipeSummary.branch[key] = {
                                pipe: branchPipe,
                                totalLength: 0,
                                quantity: 0,
                                zones: [],
                                totalCost: 0,
                            };
                        }
                        pipeSummary.branch[key].totalLength += zoneInput.totalBranchPipeM;
                        pipeSummary.branch[key].zones.push(zone.zoneName);
                    }

                    const secondaryPipe = zonePipes.secondary || results.autoSelectedSecondaryPipe;
                    if (secondaryPipe && zoneInput.totalSecondaryPipeM > 0) {
                        const key = `${secondaryPipe.id}`;
                        if (!pipeSummary.secondary[key]) {
                            pipeSummary.secondary[key] = {
                                pipe: secondaryPipe,
                                totalLength: 0,
                                quantity: 0,
                                zones: [],
                                totalCost: 0,
                            };
                        }
                        pipeSummary.secondary[key].totalLength += zoneInput.totalSecondaryPipeM;
                        pipeSummary.secondary[key].zones.push(zone.zoneName);
                    }

                    const mainPipe = zonePipes.main || results.autoSelectedMainPipe;
                    if (mainPipe && zoneInput.totalMainPipeM > 0) {
                        const key = `${mainPipe.id}`;
                        if (!pipeSummary.main[key]) {
                            pipeSummary.main[key] = {
                                pipe: mainPipe,
                                totalLength: 0,
                                quantity: 0,
                                zones: [],
                                totalCost: 0,
                            };
                        }
                        pipeSummary.main[key].totalLength += zoneInput.totalMainPipeM;
                        pipeSummary.main[key].zones.push(zone.zoneName);
                    }
                }
            });
        } else if (projectData?.useZones && projectData.zones.length > 1) {
            projectData.zones.forEach((zone) => {
                const zoneSprinkler = zoneSprinklers[zone.id];
                const zonePipes = selectedPipes[zone.id] || {};
                const zoneInput = zoneInputs[zone.id];

                if (zoneSprinkler) {
                    const sprinklerQuantity = zone.plantCount;
                    const sprinklerCost = zoneSprinkler.price * sprinklerQuantity;
                    totalSprinklerCost += sprinklerCost;

                    const key = `${zoneSprinkler.id}`;
                    if (!sprinklerSummary[key]) {
                        sprinklerSummary[key] = {
                            sprinkler: zoneSprinkler,
                            quantity: 0,
                            zones: [],
                            totalCost: 0,
                        };
                    }
                    sprinklerSummary[key].quantity += sprinklerQuantity;
                    sprinklerSummary[key].zones.push(zone.name);
                    sprinklerSummary[key].totalCost += sprinklerCost;
                }

                if (zoneInput) {
                    processExtraPipe(zone.id, zoneInput, zone.plantCount);

                    const branchPipe = zonePipes.branch || results.autoSelectedBranchPipe;
                    if (branchPipe && zoneInput.totalBranchPipeM > 0) {
                        const key = `${branchPipe.id}`;
                        if (!pipeSummary.branch[key]) {
                            pipeSummary.branch[key] = {
                                pipe: branchPipe,
                                totalLength: 0,
                                quantity: 0,
                                zones: [],
                                totalCost: 0,
                            };
                        }
                        pipeSummary.branch[key].totalLength += zoneInput.totalBranchPipeM;
                        pipeSummary.branch[key].zones.push(zone.name);
                    }

                    const secondaryPipe = zonePipes.secondary || results.autoSelectedSecondaryPipe;
                    if (secondaryPipe && zoneInput.totalSecondaryPipeM > 0) {
                        const key = `${secondaryPipe.id}`;
                        if (!pipeSummary.secondary[key]) {
                            pipeSummary.secondary[key] = {
                                pipe: secondaryPipe,
                                totalLength: 0,
                                quantity: 0,
                                zones: [],
                                totalCost: 0,
                            };
                        }
                        pipeSummary.secondary[key].totalLength += zoneInput.totalSecondaryPipeM;
                        pipeSummary.secondary[key].zones.push(zone.name);
                    }

                    const mainPipe = zonePipes.main || results.autoSelectedMainPipe;
                    if (mainPipe && zoneInput.totalMainPipeM > 0) {
                        const key = `${mainPipe.id}`;
                        if (!pipeSummary.main[key]) {
                            pipeSummary.main[key] = {
                                pipe: mainPipe,
                                totalLength: 0,
                                quantity: 0,
                                zones: [],
                                totalCost: 0,
                            };
                        }
                        pipeSummary.main[key].totalLength += zoneInput.totalMainPipeM;
                        pipeSummary.main[key].zones.push(zone.name);
                    }
                }
            });
        } else {
            const currentSprinkler = zoneSprinklers[activeZoneId];
            const currentPipes = selectedPipes[activeZoneId] || {};
            const currentInput = zoneInputs[activeZoneId];

            if (currentSprinkler && results) {
                const sprinklerQuantity = results.totalSprinklers;
                totalSprinklerCost = currentSprinkler.price * sprinklerQuantity;
                sprinklerSummary[`${currentSprinkler.id}`] = {
                    sprinkler: currentSprinkler,
                    quantity: sprinklerQuantity,
                    zones: [t('พื้นที่หลัก')],
                    totalCost: totalSprinklerCost,
                };
            }

            if (currentInput) {
                processExtraPipe(activeZoneId, currentInput, results.totalSprinklers);

                const branchPipe = currentPipes.branch || results.autoSelectedBranchPipe;
                if (branchPipe && currentInput.totalBranchPipeM > 0) {
                    const totalLength = currentInput.totalBranchPipeM;
                    const quantity = calculatePipeRolls(totalLength, branchPipe.lengthM);
                    const cost = branchPipe.price * quantity;
                    totalBranchPipeCost = cost;
                    pipeSummary.branch[`${branchPipe.id}`] = {
                        pipe: branchPipe,
                        totalLength: totalLength,
                        quantity: quantity,
                        zones: [t('พื้นที่หลัก')],
                        totalCost: cost,
                    };
                }

                const secondaryPipe = currentPipes.secondary || results.autoSelectedSecondaryPipe;
                if (secondaryPipe && currentInput.totalSecondaryPipeM > 0) {
                    const quantity = calculatePipeRolls(
                        currentInput.totalSecondaryPipeM,
                        secondaryPipe.lengthM
                    );
                    const cost = secondaryPipe.price * quantity;
                    totalSecondaryPipeCost = cost;
                    pipeSummary.secondary[`${secondaryPipe.id}`] = {
                        pipe: secondaryPipe,
                        totalLength: currentInput.totalSecondaryPipeM,
                        quantity: quantity,
                        zones: [t('พื้นที่หลัก')],
                        totalCost: cost,
                    };
                }

                const mainPipe = currentPipes.main || results.autoSelectedMainPipe;
                if (mainPipe && currentInput.totalMainPipeM > 0) {
                    const quantity = calculatePipeRolls(
                        currentInput.totalMainPipeM,
                        mainPipe.lengthM
                    );
                    const cost = mainPipe.price * quantity;
                    totalMainPipeCost = cost;
                    pipeSummary.main[`${mainPipe.id}`] = {
                        pipe: mainPipe,
                        totalLength: currentInput.totalMainPipeM,
                        quantity: quantity,
                        zones: [t('พื้นที่หลัก')],
                        totalCost: cost,
                    };
                }
            }
        }

        Object.values(pipeSummary.branch).forEach((item) => {
            const totalLength = item.totalLength + (item.extraLength || 0);
            item.quantity = calculatePipeRolls(totalLength, item.pipe.lengthM);
            item.totalCost = item.pipe.price * item.quantity;
            totalBranchPipeCost += item.totalCost;
        });

        Object.values(pipeSummary.secondary).forEach((item) => {
            item.quantity = calculatePipeRolls(item.totalLength, item.pipe.lengthM);
            item.totalCost = item.pipe.price * item.quantity;
            totalSecondaryPipeCost += item.totalCost;
        });

        Object.values(pipeSummary.main).forEach((item) => {
            item.quantity = calculatePipeRolls(item.totalLength, item.pipe.lengthM);
            item.totalCost = item.pipe.price * item.quantity;
            totalMainPipeCost += item.totalCost;
        });

        let extraPipeCost = 0;
        if (extraPipeSummary) {
            extraPipeSummary.quantity = calculatePipeRolls(
                extraPipeSummary.totalLength,
                extraPipeSummary.pipe.lengthM
            );
            extraPipeSummary.totalCost = extraPipeSummary.pipe.price * extraPipeSummary.quantity;
            extraPipeCost = extraPipeSummary.totalCost;
        }

        if (
            (!projectData?.useZones || projectData.zones.length === 1) &&
            (!gardenStats || gardenStats.zones.length === 1)
        ) {
            totalBranchPipeCost = 0;
            totalSecondaryPipeCost = 0;
            totalMainPipeCost = 0;

            Object.values(pipeSummary.branch).forEach((item) => {
                const totalLength = item.totalLength + (item.extraLength || 0);
                item.quantity = calculatePipeRolls(totalLength, item.pipe.lengthM);
                item.totalCost = item.pipe.price * item.quantity;
                totalBranchPipeCost += item.totalCost;
            });

            Object.values(pipeSummary.secondary).forEach((item) => {
                item.quantity = calculatePipeRolls(item.totalLength, item.pipe.lengthM);
                item.totalCost = item.pipe.price * item.quantity;
                totalSecondaryPipeCost += item.totalCost;
            });

            Object.values(pipeSummary.main).forEach((item) => {
                item.quantity = calculatePipeRolls(item.totalLength, item.pipe.lengthM);
                item.totalCost = item.pipe.price * item.quantity;
                totalMainPipeCost += item.totalCost;
            });
        }

        const pumpCost = showPump ? selectedPump?.price || results.autoSelectedPump?.price || 0 : 0;
        const totalCost =
            totalSprinklerCost +
            totalBranchPipeCost +
            totalSecondaryPipeCost +
            totalMainPipeCost +
            extraPipeCost +
            pumpCost;

        return {
            totalSprinklerCost,
            totalBranchPipeCost,
            totalSecondaryPipeCost,
            totalMainPipeCost,
            pumpCost,
            totalCost,
            sprinklerSummary,
            pipeSummary,
            extraPipeSummary,
            extraPipeCost,
        };
    };

    const costs = calculateTotalCosts();
    const effectivePump = selectedPump || results.autoSelectedPump;

    const getSelectionStatus = (equipment: any, type: string, isAuto: boolean) => {
        if (!equipment) return `❌ ${t('ไม่มี')}${type}`;

        if (isAuto) {
            if (equipment.isRecommended) return `🤖⭐ ${type} ${t('ที่แนะนำ')} (อัตโนมัติ)`;
            if (equipment.isGoodChoice) return `🤖✅ ${type} ${t('ตัวเลือกดี')} (อัตโนมัติ)`;
            if (equipment.isUsable) return `🤖⚡ ${type} ${t('ใช้ได้')} (อัตโนมัติ)`;
            return `🤖⚠️ ${type} ${t('ที่ดีที่สุดที่มี')} (อัตโนมัติ)`;
        } else {
            return `👤 ${type} ${t('ที่เลือกเอง')}`;
        }
    };

    const uniqueSprinklers = Object.keys(costs.sprinklerSummary).length;
    const uniqueBranchPipes = Object.keys(costs.pipeSummary.branch).length;
    const uniqueSecondaryPipes = Object.keys(costs.pipeSummary.secondary).length;
    const uniqueMainPipes = Object.keys(costs.pipeSummary.main).length;

    const totalPipeRolls =
        Object.values(costs.pipeSummary.branch).reduce((sum, item) => sum + item.quantity, 0) +
        Object.values(costs.pipeSummary.secondary).reduce((sum, item) => sum + item.quantity, 0) +
        Object.values(costs.pipeSummary.main).reduce((sum, item) => sum + item.quantity, 0) +
        ((costs as any).extraPipeSummary?.quantity || 0);

    const totalSprinklerHeads = Object.values(costs.sprinklerSummary).reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    const systemMode =
        (projectMode === 'horticulture' && projectData?.useZones && projectData.zones.length > 1) ||
        (projectMode === 'garden' && gardenStats && gardenStats.zones.length > 1)
            ? t('หลายโซน')
            : t('โซนเดียว');

    const getTotalArea = () => {
        if (projectMode === 'garden' && gardenStats) {
            return gardenStats.summary.totalArea / 1600;
        }
        return projectData?.totalArea ? projectData.totalArea / 1600 : 0;
    };

    const totalArea = getTotalArea();

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h2 className="mb-4 text-2xl font-bold text-yellow-400">💰 {t('สรุปอุปกรณ์ทั้งหมด')}</h2>

            {uniqueSprinklers > 0 && (
                <div className="mb-4 rounded bg-green-900 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-green-300">
                        💧 {t('รายละเอียด')}{projectMode === 'garden' ? t('หัวฉีด') : t('สปริงเกอร์')}:
                    </h3>
                    <div className="space-y-2">
                        {Object.values(costs.sprinklerSummary).map((item, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between rounded bg-green-800 p-2"
                            >
                                <div className="flex items-center space-x-3">
                                    <img src={item.sprinkler.image} alt="" className="w-10 h-10" />
                                    <div className="text-sm">
                                        <p className="font-medium text-white">
                                            {item.sprinkler.name}
                                        </p>
                                        <p className="text-green-200">
                                            {item.sprinkler.productCode} |{' '}
                                            {item.sprinkler.price?.toLocaleString()} {t('บาท/หัว')}
                                        </p>
                                        <p className="text-xs text-green-300">
                                            {t('ใช้ในโซน:')} {item.zones.join(', ')}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right text-sm">
                                    <p className="text-green-200">
                                        {item.quantity?.toLocaleString()} {t('หัว')}
                                    </p>
                                    <p className="font-bold text-white">
                                        {item.totalCost?.toLocaleString()} {t('บาท')}
                                    </p>
                                    <p className="text-xs text-green-300">
                                        {(Number(item.totalCost) / Number(item.quantity)).toFixed(
                                            0
                                        )}{' '}
                                        {t('บาท/หัว')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(uniqueBranchPipes > 0 || uniqueSecondaryPipes > 0 || uniqueMainPipes > 0) && (
                <div className="mb-4 rounded bg-purple-900 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-purple-300">
                        🔧 {t('รายละเอียดท่อ:')}
                    </h3>
                    <div className="space-y-3">
                        {uniqueBranchPipes > 0 && (
                            <div>
                                <h4 className="mb-1 text-xs font-medium text-purple-200">
                                    {t('ท่อย่อย')} ({uniqueBranchPipes} {t('ชนิด')}):
                                </h4>
                                <div className="space-y-1">
                                    {Object.values(costs.pipeSummary.branch).map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between rounded bg-purple-800 p-2"
                                        >
                                            <div className="text-sm">
                                                <p className="font-medium text-white">
                                                    {item.pipe.name || item.pipe.productCode} -{' '}
                                                    {item.pipe.sizeMM}mm
                                                    {item.pipe.isRecommended && (
                                                        <span className="ml-1 text-green-400">
                                                            ⭐
                                                        </span>
                                                    )}
                                                    {item.includesExtra && (
                                                        <span className="ml-1 text-yellow-400">
                                                            +{t('Riser')}
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-purple-200">
                                                    {item.zones.join(', ')} |{' '}
                                                    {(
                                                        Number(item.pipe.price) || 0
                                                    )?.toLocaleString()}{' '}
                                                    {t('บาท/ม้วน')} ({item.pipe.lengthM} {t('ม./ม้วน')}) | {t('คะแนน:')} {' '}
                                                    {item.pipe.score || 'N/A'}
                                                </p>
                                                <p className="text-xs text-purple-300">
                                                    {t('รวมความยาว:')} {item.totalLength?.toLocaleString()}{' '}
                                                    {t('ม.')}
                                                    {item.extraLength && item.extraLength > 0 && (
                                                        <span className="text-yellow-300">
                                                            {' '}
                                                            (+ {t('Riser')} {item.extraLength.toFixed(
                                                                1
                                                            )}{' '}
                                                            ม.)
                                                        </span>
                                                    )}{' '}
                                                    | {t('ประสิทธิภาพ:')} {' '}
                                                    {(
                                                        ((item.totalLength +
                                                            (item.extraLength || 0)) /
                                                            (item.quantity * item.pipe.lengthM)) *
                                                        100
                                                    ).toFixed(0)}
                                                    %
                                                </p>
                                            </div>
                                            <div className="text-right text-sm">
                                                <p className="text-purple-200">
                                                    {item.quantity} {t('ม้วน')}
                                                </p>
                                                <p className="font-bold text-white">
                                                    {item.totalCost?.toLocaleString()} {t('บาท')}
                                                </p>
                                                <p className="text-xs text-purple-300">
                                                    (
                                                    {(
                                                        (item.totalCost /
                                                            (item.totalLength +
                                                                (item.extraLength || 0))) *
                                                        100
                                                    ).toFixed(1)}{' '}
                                                    {t('บาท/100ม.')}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {uniqueSecondaryPipes > 0 && (
                            <div>
                                <h4 className="mb-1 text-xs font-medium text-purple-200">
                                    {t('ท่อเมนรอง')} ({uniqueSecondaryPipes} {t('ชนิด')}):
                                </h4>
                                <div className="space-y-1">
                                    {Object.values(costs.pipeSummary.secondary).map(
                                        (item, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between rounded bg-purple-800 p-2"
                                            >
                                                <div className="text-sm">
                                                    <p className="font-medium text-white">
                                                        {item.pipe.name || item.pipe.productCode} -{' '}
                                                        {item.pipe.sizeMM}mm
                                                        {item.pipe.isRecommended && (
                                                            <span className="ml-1 text-green-400">
                                                                ⭐
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-purple-200">
                                                        {item.zones.join(', ')} |{' '}
                                                        {item.pipe.price?.toLocaleString()} {t('บาท/ม้วน')}
                                                        ({item.pipe.lengthM} {t('ม./ม้วน')}) | {t('คะแนน:')} {' '}
                                                        {item.pipe.score || 'N/A'}
                                                    </p>
                                                    <p className="text-xs text-purple-300">
                                                        {t('รวมความยาว:')} {' '}
                                                        {item.totalLength?.toLocaleString()} {t('ม.')}
                                                    </p>
                                                </div>
                                                <div className="text-right text-sm">
                                                    <p className="text-purple-200">
                                                        {item.quantity} {t('ม้วน')}
                                                    </p>
                                                    <p className="font-bold text-white">
                                                        {item.totalCost?.toLocaleString()} {t('บาท')}
                                                    </p>
                                                    <p className="text-xs text-purple-300">
                                                        {(
                                                            (item.totalCost / item.totalLength) *
                                                            100
                                                        ).toFixed(1)}{' '}
                                                        {t('บาท/100ม.')}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        )}

                        {uniqueMainPipes > 0 && (
                            <div>
                                <h4 className="mb-1 text-xs font-medium text-purple-200">
                                    {t('ท่อเมนหลัก')} ({uniqueMainPipes} {t('ชนิด')}):
                                </h4>
                                <div className="space-y-1">
                                    {Object.values(costs.pipeSummary.main).map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between rounded bg-purple-800 p-2"
                                        >
                                            <div className="text-sm">
                                                <p className="font-medium text-white">
                                                    {item.pipe.name || item.pipe.productCode} -{' '}
                                                    {item.pipe.sizeMM}mm
                                                    {item.pipe.isRecommended && (
                                                        <span className="ml-1 text-green-400">
                                                            ⭐
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-purple-200">
                                                    {item.zones.join(', ')} |{' '}
                                                    {item.pipe.price?.toLocaleString()} {t('บาท/ม้วน')} (
                                                    {item.pipe.lengthM} {t('ม./ม้วน')}) | {t('คะแนน:')} {' '}
                                                    {item.pipe.score || 'N/A'}
                                                </p>
                                                <p className="text-xs text-purple-300">
                                                    {t('รวมความยาว:')} {item.totalLength?.toLocaleString()}{' '}
                                                    {t('ม.')}
                                                </p>
                                            </div>
                                            <div className="text-right text-sm">
                                                <p className="text-purple-200">
                                                    {item.quantity} {t('ม้วน')}
                                                </p>
                                                <p className="font-bold text-white">
                                                    {item.totalCost?.toLocaleString()} {t('บาท')}
                                                </p>
                                                <p className="text-xs text-purple-300">
                                                    {(
                                                        (item.totalCost / item.totalLength) *
                                                        100
                                                    ).toFixed(1)}{' '}
                                                    {t('บาท/100ม.')}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(costs as any).extraPipeSummary && (
                            <div className="mt-2 rounded bg-blue-900 p-2">
                                <h4 className="mb-1 text-xs font-medium text-blue-200">
                                    {t('ท่อเสริม')} ({t('Riser/แขนง')}) - {t('แยกแสดง:')}
                                </h4>
                                <div className="flex items-center justify-between text-sm">
                                    <div>
                                        <p className="font-medium text-white">
                                            {(costs as any).extraPipeSummary.pipe.name ||
                                                (costs as any).extraPipeSummary.pipe
                                                    .productCode}{' '}
                                            - {(costs as any).extraPipeSummary.pipe.sizeMM}mm
                                        </p>
                                        <p className="text-xs text-blue-200">
                                            {t('รวมความยาว:')} {' '}
                                            {(
                                                costs as any
                                            ).extraPipeSummary.totalLength.toLocaleString()}{' '}
                                            {t('ม.')} | {t('ใช้ในโซน:')} {' '}
                                            {(costs as any).extraPipeSummary.zones.join(', ')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-blue-200">
                                            {(costs as any).extraPipeSummary.quantity} {t('ม้วน')}
                                        </p>
                                        <p className="font-bold text-white">
                                            {(
                                                costs as any
                                            ).extraPipeSummary.totalCost.toLocaleString()}{' '}
                                            {t('บาท')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded bg-gray-600 p-4">
                    <h4 className="font-medium text-green-300">
                        💧 {projectMode === 'garden' ? t('หัวฉีด') : t('สปริงเกอร์')} {t('ทั้งหมด')}
                    </h4>
                    <p className="text-sm">
                        {uniqueSprinklers} {t('ชนิด')} | {t('รวม')} {totalSprinklerHeads?.toLocaleString()} {t('หัว')}
                    </p>
                    {systemMode === 'หลายโซน' && (
                        <p className="text-xs text-gray-300">
                            (
                            {projectMode === 'garden' && gardenStats
                                ? gardenStats.zones.length
                                : projectData?.zones.length || 0}{' '}
                            {t('โซน')}
                            )
                        </p>
                    )}
                    <p className="text-xl font-bold">
                        {costs.totalSprinklerCost?.toLocaleString()} {t('บาท')}
                    </p>
                    <p className="text-xs text-green-300">
                        (
                        {totalSprinklerHeads > 0
                            ? (costs.totalSprinklerCost / totalSprinklerHeads).toFixed(0)
                            : 0}{' '}
                        {t('บาท/หัว')}
                        )
                    </p>
                </div>

                {showPump && (
                    <div className="rounded bg-gray-600 p-4">
                        <h4 className="font-medium text-red-300">⚡ {t('ปั๊มน้ำ')}</h4>
                        <p className="text-sm">
                            {effectivePump
                                ? effectivePump.name || effectivePump.productCode
                                    : t('ไม่มีข้อมูล')}
                        </p>
                        <p className="text-sm">
                            {t('จำนวน:')} 1 {t('ตัว')} ({effectivePump?.powerHP || 'N/A'} {t('HP')})
                        </p>
                        <p className="text-xl font-bold">{costs.pumpCost?.toLocaleString()} {t('บาท')}</p>
                        {effectivePump && (
                            <p className="mt-1 text-xs text-green-300">
                                {getSelectionStatus(
                                    effectivePump,
                                    t('ปั๊ม'),
                                    effectivePump.id === results.autoSelectedPump?.id
                                )}
                            </p>
                        )}
                    </div>
                )}

                <div className="rounded bg-gray-600 p-4">
                    <h4 className="font-medium text-purple-300">🔧 {t('ท่อทั้งหมด')}</h4>
                    <div className="space-y-1 text-sm">
                        <p>
                            {t('ท่อย่อย:')} {costs.totalBranchPipeCost?.toLocaleString()} {t('บาท')}
                            <span className="text-xs text-gray-400">
                                {' '}
                                (
                                {Object.values(costs.pipeSummary.branch).reduce(
                                    (sum, item) => sum + item.quantity,
                                    0
                                )}{' '}
                                {t('ม้วน')}
                                )
                            </span>
                        </p>
                        {costs.totalSecondaryPipeCost > 0 && (
                            <p>
                                {t('ท่อรอง:')} {costs.totalSecondaryPipeCost?.toLocaleString()} {t('บาท')}
                                <span className="text-xs text-gray-400">
                                    {' '}
                                    (
                                    {Object.values(costs.pipeSummary.secondary).reduce(
                                        (sum, item) => sum + item.quantity,
                                        0
                                    )}{' '}
                                    {t('ม้วน')}
                                    )
                                </span>
                            </p>
                        )}
                        {costs.totalMainPipeCost > 0 && (
                            <p>
                                {t('ท่อหลัก:')} {costs.totalMainPipeCost?.toLocaleString()} {t('บาท')}
                                <span className="text-xs text-gray-400">
                                    {' '}
                                    (
                                    {Object.values(costs.pipeSummary.main).reduce(
                                        (sum, item) => sum + item.quantity,
                                        0
                                    )}{' '}
                                    {t('ม้วน')}
                                    )
                                </span>
                            </p>
                        )}
                        {(costs as any).extraPipeCost > 0 && (
                            <p>
                                {t('ท่อเสริม:')} {(costs as any).extraPipeCost?.toLocaleString()} {t('บาท')}
                                <span className="text-xs text-gray-400">
                                    {' '}
                                    ({(costs as any).extraPipeSummary?.quantity} ม้วน)
                                </span>
                            </p>
                        )}
                    </div>
                    <p className="text-xl font-bold">
                        {(
                            costs.totalBranchPipeCost +
                            costs.totalSecondaryPipeCost +
                            costs.totalMainPipeCost +
                            ((costs as any).extraPipeCost || 0)
                        )?.toLocaleString()}{' '}
                        {t('บาท')}
                    </p>
                    <p className="text-xs text-purple-300">({totalPipeRolls} {t('ม้วนรวม')})</p>
                </div>

                <div className="rounded bg-gradient-to-r from-green-600 to-blue-600 p-4 md:col-span-2 lg:col-span-3">
                        <h4 className="font-medium text-white">💎 {t('รวมทั้งหมด')}</h4>
                    <p className="text-sm text-green-100">{t('ราคาสุทธิ')} ({t('ไม่รวม VAT')})</p>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-2xl font-bold text-white">
                                {(Number(costs.totalCost) || 0)?.toLocaleString()} {t('บาท')}
                            </p>
                            <p className="mt-1 text-xs text-green-200">
                                * {t('รวมอุปกรณ์ที่เลือกอัตโนมัติและปรับแต่ง')}
                            </p>
                            {!showPump && projectMode === 'garden' && (
                                <p className="mt-1 text-xs text-yellow-200">
                                    * {t('ไม่รวมปั๊มน้ำ')} ({t('ใช้แรงดันประปา')})
                                </p>
                            )}
                            {(costs as any).extraPipeCost > 0 && (
                                <p className="mt-1 text-xs text-blue-200">
                                    * {t('รวมท่อเสริม')} ({t('Riser/แขนง')})
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            {systemMode === 'หลายโซน' ? (
                                <div className="text-sm text-green-100">
                                    <p>
                                        {t('ราคาต่อโซน:')} {' '}
                                        {(
                                            costs.totalCost /
                                            (projectMode === 'garden' && gardenStats
                                                ? gardenStats.zones.length
                                                : projectData?.zones.length || 1)
                                        )?.toLocaleString()}{' '}
                                        {t('บาท')}
                                    </p>
                                    <p>
                                        {t('ราคาต่อไร่:')} {' '}
                                        {totalArea > 0
                                            ? (costs.totalCost / totalArea)?.toLocaleString()
                                            : 0}{' '}
                                        {t('บาท')}
                                    </p>
                                    <p>
                                        {t('ราคาต่อ')}{projectMode === 'garden' ? t('หัวฉีด') : t('ต้น')}:{' '}
                                        {totalSprinklerHeads > 0
                                            ? (costs.totalCost / totalSprinklerHeads).toFixed(0)
                                            : 0}{' '}
                                        {t('บาท')}
                                    </p>
                                </div>
                            ) : (
                                <div className="text-sm text-green-100">
                                    <p>
                                        {t('ราคาต่อไร่:')} {' '}
                                        {totalArea > 0
                                            ? (costs.totalCost / totalArea)?.toLocaleString()
                                            : 0}{' '}
                                        {t('บาท')}
                                    </p>
                                    <p>
                                        {t('ราคาต่อ')}{projectMode === 'garden' ? t('หัวฉีด') : t('ต้น')}:{' '}
                                        {totalSprinklerHeads > 0
                                            ? (costs.totalCost / totalSprinklerHeads).toFixed(0)
                                            : 0}{' '}
                                        {t('บาท')}
                                    </p>
                                    <p>
                                        {t('ราคาต่อม้วน:')} {' '}
                                        {totalPipeRolls > 0
                                            ? (costs.totalCost / totalPipeRolls).toLocaleString()
                                            : 0}{' '}
                                        {t('บาท')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 text-center">
                <button
                    onClick={onQuotationClick}
                    className="rounded bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 text-lg font-bold text-white hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={costs.totalCost === 0}
                >
                    📋 {t('ออกใบเสนอราคา')}
                </button>
                {costs.totalCost === 0 && (
                    <p className="mt-2 text-sm text-red-400">
                        {t('กรุณาเลือก')}{projectMode === 'garden' ? t('หัวฉีด') : t('สปริงเกอร์')}
                        {t('เพื่อให้ระบบคำนวณราคา')}
                    </p>
                )}
            </div>
        </div>
    );
};

export default CostSummary;
