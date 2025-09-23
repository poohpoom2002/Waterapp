// resources\js\pages\components\CostSummary.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
    AnalyzedPipe,
    CalculationResults,
    IrrigationInput,
    SprinklerSetItem,
} from '../types/interfaces';
import { HorticultureProjectData } from '../../utils/horticultureUtils';
import { GardenPlannerData } from '../../utils/homeGardenData';
import { GardenStatistics } from '../../utils/gardenStatistics';
import { calculatePipeRolls } from '../utils/calculations';
import { useLanguage } from '../../contexts/LanguageContext';
import { getEnhancedFieldCropData, FieldCropData } from '../../utils/fieldCropData';

interface CostSummaryProps {
    results: CalculationResults;
    zoneSprinklers: { [zoneId: string]: any };
    selectedPipes: {
        [zoneId: string]: { branch?: any; secondary?: any; main?: any; emitter?: any };
    };
    selectedPump: any;
    activeZoneId: string;
    projectData?: HorticultureProjectData | null;
    gardenData?: GardenPlannerData | null;
    gardenStats?: GardenStatistics | null;
    zoneInputs: { [zoneId: string]: IrrigationInput };
    onQuotationClick: () => void;
    projectMode?: 'horticulture' | 'garden' | 'field-crop' | 'greenhouse';
    showPump?: boolean;
    fieldCropData?: any;
    greenhouseData?: any;
    sprinklerEquipmentSets?: { [zoneId: string]: any };
    connectionEquipments?: { [zoneId: string]: any[] };
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
            includesExtra?: boolean;
            extraLength?: number;
        };
    };
    main: {
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
    emitter: {
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
    fieldCropData,
    greenhouseData,
    sprinklerEquipmentSets = {},
    connectionEquipments = {},
}) => {
    const { t } = useLanguage();

    const getItemName = () => {
        switch (projectMode) {
            case 'garden':
                return t('หัวฉีด');
            case 'field-crop':
                return t('จุดปลูก');
            case 'greenhouse':
                return t('หัวฉีด');
            default:
                return t('ต้นไม้');
        }
    };

    const getEquipmentName = () => {
        switch (projectMode) {
            case 'garden':
                return t('หัวฉีด');
            case 'field-crop':
                return t('หัวฉีด');
            case 'greenhouse':
                return t('หัวฉีด');
            default:
                return t('หัวฉีด');
        }
    };

    const getAreaUnit = () => {
        // Fix: All project modes now consistently use rai
        return t('ไร่');
    };

    const formatArea = (area: number) => {
        // Fix: Since farmSizeRai is now consistently in rai for all modes
        return `${area.toFixed(1)} ไร่`;
    };

    const getProjectIcon = () => {
        switch (projectMode) {
            case 'garden':
                return '🏡';
            case 'field-crop':
                return '🌾';
            case 'greenhouse':
                return '🏠';
            default:
                return '🌿';
        }
    };

    const calculateTotalCosts = () => {
        let totalSprinklerCost = 0;
        let totalBranchPipeCost = 0;
        let totalSecondaryPipeCost = 0;
        let totalMainPipeCost = 0;
        let totalEmitterPipeCost = 0;

        const sprinklerSummary: SprinklerSummary = {};
        const pipeSummary: PipeSummary = { branch: {}, secondary: {}, main: {}, emitter: {} };
        let extraPipeSummary: any = null;

        const processExtraPipe = (
            zoneId: string,
            zoneInput: IrrigationInput,
            sprinklerCount: number
        ) => {
            // Legacy support for extraPipePerSprinkler (kept for backward compatibility)
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

            // New support for sprinklerEquipmentSet
            if (
                zoneInput.sprinklerEquipmentSet &&
                zoneInput.sprinklerEquipmentSet.selectedItems &&
                zoneInput.sprinklerEquipmentSet.selectedItems.length > 0
            ) {
                let hasProcessedPipe = false;

                zoneInput.sprinklerEquipmentSet.selectedItems.forEach((item) => {
                    const categoryName = item.equipment.category?.name?.toLowerCase();
                    const isPipe = categoryName === 'pipe' || categoryName?.includes('pipe');

                    if (isPipe && item.quantity > 0) {
                        const extraPipeId = item.equipment.id;
                        const extraLength = item.quantity; // quantity is already length for pipes

                        const zonePipes = selectedPipes[zoneId] || {};
                        const branchPipe = zonePipes.branch || results.autoSelectedBranchPipe;
                        const secondaryPipe =
                            zonePipes.secondary || results.autoSelectedSecondaryPipe;
                        const mainPipe = zonePipes.main || results.autoSelectedMainPipe;
                        const emitterPipe = zonePipes.emitter || results.autoSelectedEmitterPipe;

                        // Check if extra pipe is same as branch pipe
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
                            if (!pipeSummary.branch[key].zones.includes(zoneId)) {
                                pipeSummary.branch[key].zones.push(zoneId);
                            }
                            hasProcessedPipe = true;
                            return;
                        }

                        // Check if extra pipe is same as secondary pipe
                        if (secondaryPipe && secondaryPipe.id === extraPipeId) {
                            const key = `${secondaryPipe.id}`;
                            if (!pipeSummary.secondary[key]) {
                                pipeSummary.secondary[key] = {
                                    pipe: secondaryPipe,
                                    totalLength: 0,
                                    quantity: 0,
                                    zones: [],
                                    totalCost: 0,
                                    includesExtra: true,
                                    extraLength: 0,
                                };
                            }
                            pipeSummary.secondary[key].extraLength =
                                (pipeSummary.secondary[key].extraLength || 0) + extraLength;
                            pipeSummary.secondary[key].includesExtra = true;
                            if (!pipeSummary.secondary[key].zones.includes(zoneId)) {
                                pipeSummary.secondary[key].zones.push(zoneId);
                            }
                            hasProcessedPipe = true;
                            return;
                        }

                        // Check if extra pipe is same as main pipe
                        if (mainPipe && mainPipe.id === extraPipeId) {
                            const key = `${mainPipe.id}`;
                            if (!pipeSummary.main[key]) {
                                pipeSummary.main[key] = {
                                    pipe: mainPipe,
                                    totalLength: 0,
                                    quantity: 0,
                                    zones: [],
                                    totalCost: 0,
                                    includesExtra: true,
                                    extraLength: 0,
                                };
                            }
                            pipeSummary.main[key].extraLength =
                                (pipeSummary.main[key].extraLength || 0) + extraLength;
                            pipeSummary.main[key].includesExtra = true;
                            if (!pipeSummary.main[key].zones.includes(zoneId)) {
                                pipeSummary.main[key].zones.push(zoneId);
                            }
                            hasProcessedPipe = true;
                            return;
                        }

                        // Check if extra pipe is same as emitter pipe
                        if (emitterPipe && emitterPipe.id === extraPipeId) {
                            const key = `${emitterPipe.id}`;
                            if (!pipeSummary.emitter[key]) {
                                pipeSummary.emitter[key] = {
                                    pipe: emitterPipe,
                                    totalLength: 0,
                                    quantity: 0,
                                    zones: [],
                                    totalCost: 0,
                                    includesExtra: true,
                                    extraLength: 0,
                                };
                            }
                            pipeSummary.emitter[key].extraLength =
                                (pipeSummary.emitter[key].extraLength || 0) + extraLength;
                            pipeSummary.emitter[key].includesExtra = true;
                            if (!pipeSummary.emitter[key].zones.includes(zoneId)) {
                                pipeSummary.emitter[key].zones.push(zoneId);
                            }
                            hasProcessedPipe = true;
                            return;
                        }

                        // If not matching any main pipes, create as separate extra pipe
                        const pipeData = {
                            id: item.equipment.id,
                            name: item.equipment.name,
                            productCode: item.equipment.product_code,
                            price: item.equipment.price || 0,
                            sizeMM: 20, // fallback size for pipes
                            lengthM: 100, // standard roll length
                            image: item.equipment.image,
                        };

                        if (!extraPipeSummary) {
                            extraPipeSummary = {
                                pipe: pipeData,
                                totalLength: extraLength,
                                zones: [zoneId],
                            };
                        } else if (extraPipeSummary.pipe.id === pipeData.id) {
                            extraPipeSummary.totalLength += extraLength;
                            if (!extraPipeSummary.zones.includes(zoneId)) {
                                extraPipeSummary.zones.push(zoneId);
                            }
                        }

                        hasProcessedPipe = true;
                    }
                });

                return hasProcessedPipe;
            }

            return false;
        };

        if (projectMode === 'garden' && gardenStats) {
            gardenStats.zones.forEach((zone) => {
                // Fix: Handle both single-zone ('main-area') and multi-zone (actual zone ID) cases
                const effectiveZoneId = gardenStats.zones.length === 1 ? 'main-area' : zone.zoneId;
                const zoneSprinkler = zoneSprinklers[effectiveZoneId];
                const zonePipes = selectedPipes[effectiveZoneId] || {};
                const zoneInput = zoneInputs[effectiveZoneId];

                if (zoneSprinkler) {
                    // Fix: Use zoneInput.totalTrees instead of zone.sprinklerCount for garden mode
                    const sprinklerQuantity = zoneInput?.totalTrees || zone.sprinklerCount || 0;
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
                    // Fix: Use zoneInput.totalTrees for extra pipe calculation too
                    const sprinklerCount = zoneInput?.totalTrees || zone.sprinklerCount || 0;
                    processExtraPipe(effectiveZoneId, zoneInput, sprinklerCount);

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
        } else if (projectMode === 'field-crop' && fieldCropData) {
            fieldCropData.zones.info.forEach((zone: any) => {
                const zoneSprinkler = zoneSprinklers[zone.id];
                const zonePipes = selectedPipes[zone.id] || {};
                const zoneInput = zoneInputs[zone.id];

                if (zoneSprinkler) {
                    const sprinklerQuantity =
                        projectMode === 'field-crop'
                            ? zoneInput?.totalTrees ||
                              zone.sprinklerCount ||
                              Math.ceil((zone.totalPlantingPoints || 100) / 10)
                            : zone.totalPlantingPoints || zone.sprinklerCount || 100;
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
                    const sprinklerCount =
                        projectMode === 'field-crop'
                            ? zoneInput?.totalTrees ||
                              zone.sprinklerCount ||
                              Math.ceil((zone.totalPlantingPoints || 100) / 10)
                            : zone.totalPlantingPoints || 100;
                    processExtraPipe(zone.id, zoneInput, sprinklerCount);

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

                    const emitterPipe = zonePipes.emitter || results.autoSelectedEmitterPipe;
                    if (
                        emitterPipe &&
                        zoneInput.totalEmitterPipeM &&
                        zoneInput.totalEmitterPipeM > 0
                    ) {
                        const key = `${emitterPipe.id}`;
                        if (!pipeSummary.emitter[key]) {
                            pipeSummary.emitter[key] = {
                                pipe: emitterPipe,
                                totalLength: 0,
                                quantity: 0,
                                zones: [],
                                totalCost: 0,
                            };
                        }
                        pipeSummary.emitter[key].totalLength += zoneInput.totalEmitterPipeM;
                        pipeSummary.emitter[key].zones.push(zone.name);
                    }
                }
            });
        } else if (projectMode === 'greenhouse' && greenhouseData) {
            greenhouseData.summary.plotStats.forEach((plot: any) => {
                const zoneSprinkler = zoneSprinklers[plot.plotId];
                const zonePipes = selectedPipes[plot.plotId] || {};
                const zoneInput = zoneInputs[plot.plotId];

                if (zoneSprinkler) {
                    // ใช้จำนวนหัวฉีดแทนจำนวนพืช
                    const sprinklerQuantity =
                        plot.equipmentCount.sprinklers || plot.production.totalPlants || 100;
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
                    sprinklerSummary[key].zones.push(plot.plotName);
                    sprinklerSummary[key].totalCost += sprinklerCost;
                }

                if (zoneInput) {
                    // ใช้จำนวนหัวฉีดแทนจำนวนพืช
                    const sprinklerCount =
                        plot.equipmentCount.sprinklers || plot.production.totalPlants || 100;
                    processExtraPipe(plot.plotId, zoneInput, sprinklerCount);

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
                        pipeSummary.branch[key].zones.push(plot.plotName);
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
                        pipeSummary.secondary[key].zones.push(plot.plotName);
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
                        pipeSummary.main[key].zones.push(plot.plotName);
                    }

                    const emitterPipe = zonePipes.emitter || results.autoSelectedEmitterPipe;
                    if (
                        emitterPipe &&
                        zoneInput.totalEmitterPipeM &&
                        zoneInput.totalEmitterPipeM > 0
                    ) {
                        const key = `${emitterPipe.id}`;
                        if (!pipeSummary.emitter[key]) {
                            pipeSummary.emitter[key] = {
                                pipe: emitterPipe,
                                totalLength: 0,
                                quantity: 0,
                                zones: [],
                                totalCost: 0,
                            };
                        }
                        pipeSummary.emitter[key].totalLength += zoneInput.totalEmitterPipeM;
                        pipeSummary.emitter[key].zones.push(plot.plotName);
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

                    const emitterPipe = zonePipes.emitter || results.autoSelectedEmitterPipe;
                    if (
                        emitterPipe &&
                        zoneInput.totalEmitterPipeM &&
                        zoneInput.totalEmitterPipeM > 0
                    ) {
                        const key = `${emitterPipe.id}`;
                        if (!pipeSummary.emitter[key]) {
                            pipeSummary.emitter[key] = {
                                pipe: emitterPipe,
                                totalLength: 0,
                                quantity: 0,
                                zones: [],
                                totalCost: 0,
                            };
                        }
                        pipeSummary.emitter[key].totalLength += zoneInput.totalEmitterPipeM;
                        pipeSummary.emitter[key].zones.push(zone.name);
                    }
                }
            });
        } else {
            // แสดงสรุปอุปกรณ์ทั้งหมดรวมกัน ไม่แยกตามโซนที่เลือก
            Object.keys(zoneInputs).forEach((zoneId) => {
                const zoneSprinkler = zoneSprinklers[zoneId];
                const zonePipes = selectedPipes[zoneId] || {};
                const zoneInput = zoneInputs[zoneId];

                if (zoneSprinkler && zoneInput) {
                    const sprinklerQuantity = zoneInput.totalTrees || results.totalSprinklers || 0;
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
                    sprinklerSummary[key].zones.push(
                        zoneId === 'main-area' ? t('พื้นที่หลัก') : `โซน ${zoneId}`
                    );
                    sprinklerSummary[key].totalCost += sprinklerCost;
                }

                if (zoneInput) {
                    const sprinklerCount = zoneInput.totalTrees || results.totalSprinklers || 0;
                    processExtraPipe(zoneId, zoneInput, sprinklerCount);

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
                        pipeSummary.branch[key].zones.push(
                            zoneId === 'main-area' ? t('พื้นที่หลัก') : `โซน ${zoneId}`
                        );
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
                        pipeSummary.secondary[key].zones.push(
                            zoneId === 'main-area' ? t('พื้นที่หลัก') : `โซน ${zoneId}`
                        );
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
                        pipeSummary.main[key].zones.push(
                            zoneId === 'main-area' ? t('พื้นที่หลัก') : `โซน ${zoneId}`
                        );
                    }

                    const emitterPipe = zonePipes.emitter || results.autoSelectedEmitterPipe;
                    if (
                        emitterPipe &&
                        zoneInput.totalEmitterPipeM &&
                        zoneInput.totalEmitterPipeM > 0
                    ) {
                        const key = `${emitterPipe.id}`;
                        if (!pipeSummary.emitter[key]) {
                            pipeSummary.emitter[key] = {
                                pipe: emitterPipe,
                                totalLength: 0,
                                quantity: 0,
                                zones: [],
                                totalCost: 0,
                            };
                        }
                        pipeSummary.emitter[key].totalLength += zoneInput.totalEmitterPipeM;
                        pipeSummary.emitter[key].zones.push(
                            zoneId === 'main-area' ? t('พื้นที่หลัก') : `โซน ${zoneId}`
                        );
                    }
                }
            });
        }

        Object.values(pipeSummary.branch).forEach((item) => {
            const totalLength = item.totalLength + (item.extraLength || 0);
            item.quantity = calculatePipeRolls(totalLength, item.pipe.lengthM);
            item.totalCost = item.pipe.price * item.quantity;
            totalBranchPipeCost += item.totalCost;
        });

        Object.values(pipeSummary.secondary).forEach((item) => {
            const totalLength = item.totalLength + (item.extraLength || 0);
            item.quantity = calculatePipeRolls(totalLength, item.pipe.lengthM);
            item.totalCost = item.pipe.price * item.quantity;
            totalSecondaryPipeCost += item.totalCost;
        });

        Object.values(pipeSummary.main).forEach((item) => {
            const totalLength = item.totalLength + (item.extraLength || 0);
            item.quantity = calculatePipeRolls(totalLength, item.pipe.lengthM);
            item.totalCost = item.pipe.price * item.quantity;
            totalMainPipeCost += item.totalCost;
        });

        Object.values(pipeSummary.emitter).forEach((item) => {
            const totalLength = item.totalLength + (item.extraLength || 0);
            item.quantity = calculatePipeRolls(totalLength, item.pipe.lengthM);
            item.totalCost = item.pipe.price * item.quantity;
            totalEmitterPipeCost += item.totalCost;
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
            (!gardenStats || gardenStats.zones.length === 1) &&
            (!fieldCropData || fieldCropData.zones.info.length === 1) &&
            (!greenhouseData || greenhouseData.summary.plotStats.length === 1)
        ) {
            totalBranchPipeCost = 0;
            totalSecondaryPipeCost = 0;
            totalMainPipeCost = 0;
            totalEmitterPipeCost = 0;

            Object.values(pipeSummary.branch).forEach((item) => {
                const totalLength = item.totalLength + (item.extraLength || 0);
                item.quantity = calculatePipeRolls(totalLength, item.pipe.lengthM);
                item.totalCost = item.pipe.price * item.quantity;
                totalBranchPipeCost += item.totalCost;
            });

            Object.values(pipeSummary.secondary).forEach((item) => {
                const totalLength = item.totalLength + (item.extraLength || 0);
                item.quantity = calculatePipeRolls(totalLength, item.pipe.lengthM);
                item.totalCost = item.pipe.price * item.quantity;
                totalSecondaryPipeCost += item.totalCost;
            });

            Object.values(pipeSummary.main).forEach((item) => {
                const totalLength = item.totalLength + (item.extraLength || 0);
                item.quantity = calculatePipeRolls(totalLength, item.pipe.lengthM);
                item.totalCost = item.pipe.price * item.quantity;
                totalMainPipeCost += item.totalCost;
            });

            Object.values(pipeSummary.emitter).forEach((item) => {
                const totalLength = item.totalLength + (item.extraLength || 0);
                item.quantity = calculatePipeRolls(totalLength, item.pipe.lengthM);
                item.totalCost = item.pipe.price * item.quantity;
                totalEmitterPipeCost += item.totalCost;
            });
        }

        // คำนวณราคาปั๊มน้ำรวมอุปกรณ์ประกอบ
        let pumpCost = 0;
        let pumpAccessoriesCost = 0;
        if (showPump) {
            const effectivePump = selectedPump || results.autoSelectedPump;
            if (effectivePump) {
                pumpCost = effectivePump.price || 0;

                // คำนวณราคาอุปกรณ์ประกอบ (เฉพาะที่ไม่ได้รวมในชุด)
                if (effectivePump.pumpAccessories && effectivePump.pumpAccessories.length > 0) {
                    pumpAccessoriesCost = effectivePump.pumpAccessories
                        .filter((accessory: any) => !accessory.is_included)
                        .reduce((sum: number, accessory: any) => {
                            return sum + (Number(accessory.price) || 0);
                        }, 0);
                }
            }
        }
        // คำนวณราคา Sprinkler Equipment Sets
        let sprinklerEquipmentSetsCost = 0;
        if (sprinklerEquipmentSets && Object.keys(sprinklerEquipmentSets).length > 0) {
            console.log('🔍 Debug sprinklerEquipmentSets:', sprinklerEquipmentSets);
            Object.values(sprinklerEquipmentSets).forEach((equipmentSet: any) => {
                console.log('🔍 Debug equipmentSet:', equipmentSet);
                if (equipmentSet.selectedItems) {
                    // ใช้ selectedItems แทน groups
                    equipmentSet.selectedItems.forEach((item: any) => {
                        console.log('🔍 Debug item:', item);
                        const itemCost =
                            (item.unit_price || item.equipment?.price || 0) * (item.quantity || 0);
                        console.log('🔍 Debug itemCost:', itemCost);
                        sprinklerEquipmentSetsCost += itemCost;
                    });
                } else if (equipmentSet.groups) {
                    // Fallback สำหรับโครงสร้างเดิม
                    equipmentSet.groups.forEach((group: any) => {
                        if (group.items) {
                            group.items.forEach((item: any) => {
                                sprinklerEquipmentSetsCost +=
                                    (item.unit_price || 0) * (item.quantity || 0);
                            });
                        }
                    });
                }
            });
        }

        // คำนวณราคา Connection Equipment
        let connectionEquipmentsCost = 0;
        if (connectionEquipments && Object.keys(connectionEquipments).length > 0) {
            Object.values(connectionEquipments).forEach((equipments: any[]) => {
                equipments.forEach((equipment: any) => {
                    connectionEquipmentsCost +=
                        (equipment.equipment?.price || 0) * (equipment.count || 0);
                });
            });
        }

        const totalCost =
            totalSprinklerCost +
            totalBranchPipeCost +
            totalSecondaryPipeCost +
            totalMainPipeCost +
            totalEmitterPipeCost +
            extraPipeCost +
            pumpCost +
            pumpAccessoriesCost +
            sprinklerEquipmentSetsCost +
            connectionEquipmentsCost;

        return {
            totalSprinklerCost,
            totalBranchPipeCost,
            totalSecondaryPipeCost,
            totalMainPipeCost,
            totalEmitterPipeCost,
            pumpCost,
            pumpAccessoriesCost,
            totalCost,
            sprinklerSummary,
            pipeSummary,
            extraPipeSummary,
            extraPipeCost,
            sprinklerEquipmentSetsCost,
            connectionEquipmentsCost,
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
    const uniqueEmitterPipes = Object.keys(costs.pipeSummary.emitter).length;

    const totalPipeRolls =
        Object.values(costs.pipeSummary.branch).reduce((sum, item) => sum + item.quantity, 0) +
        Object.values(costs.pipeSummary.secondary).reduce((sum, item) => sum + item.quantity, 0) +
        Object.values(costs.pipeSummary.main).reduce((sum, item) => sum + item.quantity, 0) +
        Object.values(costs.pipeSummary.emitter).reduce((sum, item) => sum + item.quantity, 0) +
        ((costs as any).extraPipeSummary?.quantity || 0);

    const totalSprinklerHeads = Object.values(costs.sprinklerSummary).reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    const systemMode = (() => {
        if (projectMode === 'horticulture' && projectData?.useZones && projectData.zones.length > 1)
            return t('หลายโซน');
        if (projectMode === 'garden' && gardenStats && gardenStats.zones.length > 1)
            return t('หลายโซน');
        if (projectMode === 'field-crop' && fieldCropData && fieldCropData.zones.info.length > 1)
            return t('หลายโซน');
        if (
            projectMode === 'greenhouse' &&
            greenhouseData &&
            greenhouseData.summary.plotStats.length > 1
        )
            return t('หลายโซน');
        return t('โซนเดียว');
    })();

    const getTotalArea = () => {
        if (projectMode === 'garden' && gardenStats) {
            return gardenStats.summary.totalArea / 1600;
        }
        if (projectMode === 'field-crop' && fieldCropData) {
            return fieldCropData.area.size / 1600;
        }
        if (projectMode === 'greenhouse' && greenhouseData) {
            return greenhouseData.summary.totalPlotArea; // ใช้ตารางเมตรโดยตรง
        }
        return projectData?.totalArea ? projectData.totalArea / 1600 : 0;
    };

    const getTotalZones = () => {
        if (projectMode === 'garden' && gardenStats) return gardenStats.zones.length;
        if (projectMode === 'field-crop' && fieldCropData) return fieldCropData.zones.info.length;
        if (projectMode === 'greenhouse' && greenhouseData)
            return greenhouseData.summary.plotStats.length;
        return projectData?.zones.length || 0;
    };

    const totalArea = getTotalArea();
    const totalZones = getTotalZones();

    const getProjectSummary = () => {
        if (projectMode === 'field-crop') {
            // Try to get field-crop data from props first, then from localStorage
            const fcData = fieldCropData || getEnhancedFieldCropData();
            if (fcData) {
                return {
                    totalWaterNeed: fcData.summary?.totalWaterRequirementPerDay || 0,
                    totalProduction: fcData.summary?.totalEstimatedYield || 0,
                    totalIncome: fcData.summary?.totalEstimatedIncome || 0,
                    totalSprinklers: fcData.summary?.totalPlantingPoints || 0,
                    totalIrrigationPoints: fcData.irrigation?.totalCount || 0,
                    irrigationByType: fcData.irrigation?.byType || {},
                    waterUnit: 'ลิตร/ครั้ง',
                    productionUnit: 'กก.',
                };
            }
        }

        if (projectMode === 'greenhouse' && greenhouseData) {
            return {
                totalWaterNeed:
                    greenhouseData.summary?.overallProduction?.waterRequirementPerIrrigation || 0,
                totalProduction: greenhouseData.summary?.overallProduction?.estimatedYield || 0,
                totalIncome: greenhouseData.summary?.overallProduction?.estimatedIncome || 0,
                totalSprinklers:
                    greenhouseData.summary?.overallEquipmentCount?.sprinklers ||
                    greenhouseData.summary?.overallProduction?.totalPlants ||
                    greenhouseData.summary?.plotStats?.reduce(
                        (sum, plot) => sum + (plot.production?.totalPlants || 0),
                        0
                    ) ||
                    0,
                waterUnit: 'ลิตร/ครั้ง',
                productionUnit: 'กก.',
            };
        }

        return null;
    };

    const projectSummary = getProjectSummary();

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h2 className="mb-4 text-2xl font-bold text-yellow-400">
                💰 {t('สรุปอุปกรณ์ทั้งหมด')} {getProjectIcon()}
            </h2>

            {projectSummary && (
                <div className="mb-6 rounded-lg bg-blue-900 p-4">
                    <h3 className="mb-3 text-lg font-bold text-blue-300">
                        📊 {t('สรุปโครงการทั้งหมด')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                        <div>
                            <p className="text-blue-200">{t('พื้นที่รวม:')}</p>
                            <p className="font-bold text-white">
                                {projectMode === 'greenhouse'
                                    ? formatArea(totalArea)
                                    : formatArea(totalArea * 1600)}
                            </p>
                        </div>
                        <div>
                            <p className="text-blue-200">{t('ความต้องการน้ำ:')}</p>
                            <p className="font-bold text-white">
                                {(projectSummary.totalWaterNeed || 0).toLocaleString()}{' '}
                                {projectSummary.waterUnit}
                            </p>
                        </div>
                        {projectMode === 'greenhouse' && projectSummary.totalSprinklers > 0 && (
                            <div>
                                <p className="text-blue-200">{t('จำนวนหัวฉีดรวม:')}</p>
                                <p className="font-bold text-white">
                                    {(projectSummary.totalSprinklers || 0).toLocaleString()}{' '}
                                    {t('หัว')}
                                </p>
                            </div>
                        )}
                        {projectMode === 'field-crop' && projectSummary.totalIrrigationPoints > 0 && (
                            <div>
                                <p className="text-blue-200">{t('จุดให้น้ำรวม:')}</p>
                                <p className="font-bold text-white">
                                    {(projectSummary.totalIrrigationPoints || 0).toLocaleString()}{' '}
                                    {t('จุด')}
                                </p>
                            </div>
                        )}
                        {(projectSummary.totalProduction || 0) > 0 && (
                            <div>
                                <p className="text-blue-200">{t('ผลผลิตประมาณ:')}</p>
                                <p className="font-bold text-green-300">
                                    {(projectSummary.totalProduction || 0).toLocaleString()}{' '}
                                    {projectSummary.productionUnit}
                                </p>
                            </div>
                        )}
                        {(projectSummary.totalIncome || 0) > 0 && (
                            <div>
                                <p className="text-blue-200">{t('รายได้ประมาณ:')}</p>
                                <p className="font-bold text-green-300">
                                    {Number(
                                        (projectSummary.totalIncome || 0).toFixed(2)
                                    ).toLocaleString('th-TH')}{' '}
                                    {t('บาท')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Field-crop specific irrigation information */}
                    {projectMode === 'field-crop' && projectSummary.irrigationByType && (
                        <div className="mt-3 border-t border-blue-700 pt-3">
                            <h4 className="mb-2 text-sm font-semibold text-blue-200">
                                🌱 {t('ประเภทระบบให้น้ำ')}
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {projectSummary.irrigationByType.sprinkler > 0 && (
                                    <div>
                                        <p className="text-blue-200">{t('สปริงเกลอร์:')}</p>
                                        <p className="font-bold text-white">
                                            {projectSummary.irrigationByType.sprinkler.toLocaleString()} {t('จุด')}
                                        </p>
                                    </div>
                                )}
                                {projectSummary.irrigationByType.dripTape > 0 && (
                                    <div>
                                        <p className="text-blue-200">{t('เทปหยด:')}</p>
                                        <p className="font-bold text-white">
                                            {projectSummary.irrigationByType.dripTape.toLocaleString()} {t('จุด')}
                                        </p>
                                    </div>
                                )}
                                {projectSummary.irrigationByType.pivot > 0 && (
                                    <div>
                                        <p className="text-blue-200">{t('ปิโวต์:')}</p>
                                        <p className="font-bold text-white">
                                            {projectSummary.irrigationByType.pivot.toLocaleString()} {t('จุด')}
                                        </p>
                                    </div>
                                )}
                                {projectSummary.irrigationByType.waterJetTape > 0 && (
                                    <div>
                                        <p className="text-blue-200">{t('เทปน้ำพุ่ง:')}</p>
                                        <p className="font-bold text-white">
                                            {projectSummary.irrigationByType.waterJetTape.toLocaleString()} {t('จุด')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {uniqueSprinklers > 0 && (
                <div className="mb-4 rounded bg-green-900 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-green-300">
                        💧 {t('รายละเอียดหัวฉีด')}
                    </h3>
                    <div className="space-y-2">
                        {Object.values(costs.sprinklerSummary)
                            .sort((a, b) => {
                                const zoneA = (a.zones[0] || '').toString().toLowerCase();
                                const zoneB = (b.zones[0] || '').toString().toLowerCase();
                                if (zoneA < zoneB) return -1;
                                if (zoneA > zoneB) return 1;
                                return 0;
                            })
                            .map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between rounded bg-green-800 p-2"
                                >
                                    <div className="flex items-center space-x-3">
                                        {item.sprinkler.image ? (
                                            <img
                                                src={item.sprinkler.image}
                                                alt=""
                                                className="h-10 w-10"
                                            />
                                        ) : (
                                            <p className="flex h-10 w-10 items-center justify-center bg-gray-500 text-center align-middle text-xs text-gray-300">
                                                {t('ไม่มีรูป')}
                                            </p>
                                        )}
                                        <div className="text-sm">
                                            <p className="font-medium text-white">
                                                {item.sprinkler.name}
                                            </p>
                                            <p className="text-green-200">
                                                {item.sprinkler.productCode} |{' '}
                                                {Number(
                                                    (item.sprinkler.price || 0).toFixed(2)
                                                ).toLocaleString('th-TH')}{' '}
                                                {t('บาท')}/{t('หัว')}
                                            </p>
                                            <p className="text-xs text-green-300">
                                                {t('ใช้ในโซน:')} {item.zones.join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm">
                                        <p className="text-green-200">
                                            {(item.quantity || 0).toLocaleString()} {t('หัว')}
                                        </p>
                                        <p className="font-bold text-white">
                                            {Number(
                                                (item.totalCost || 0).toFixed(2)
                                            ).toLocaleString('th-TH')}{' '}
                                            {t('บาท')}
                                        </p>
                                        <p className="text-xs text-green-300">
                                            {Number(
                                                (
                                                    Number(item.totalCost) / Number(item.quantity)
                                                ).toFixed(2)
                                            ).toLocaleString('th-TH')}{' '}
                                            {t('บาท')}/{t('หัว')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {(uniqueBranchPipes > 0 ||
                uniqueSecondaryPipes > 0 ||
                uniqueMainPipes > 0 ||
                uniqueEmitterPipes > 0) && (
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
                                            <div className="flex items-center space-x-3">
                                                {item.pipe.image ? (
                                                    <img
                                                        src={item.pipe.image}
                                                        alt=""
                                                        className="h-10 w-10"
                                                    />
                                                ) : (
                                                    <p className="flex h-10 w-10 items-center justify-center bg-gray-500 text-center align-middle text-xs text-gray-300">
                                                        {t('ไม่มีรูป')}
                                                    </p>
                                                )}
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
                                                        {Number(
                                                            (Number(item.pipe.price) || 0).toFixed(
                                                                2
                                                            )
                                                        ).toLocaleString('th-TH')}{' '}
                                                        {t('บาท/ม้วน')} ({item.pipe.lengthM}{' '}
                                                        {t('ม./ม้วน')}) | {t('รวมความยาว:')}{' '}
                                                        {(item.totalLength || 0).toLocaleString()}{' '}
                                                        {t('ม.')}
                                                        {item.extraLength &&
                                                            item.extraLength > 0 && (
                                                                <span className="text-yellow-300">
                                                                    {' '}
                                                                    (+ {t('Riser')}{' '}
                                                                    {item.extraLength.toFixed(1)}{' '}
                                                                    ม.)
                                                                </span>
                                                            )}{' '}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right text-sm">
                                                <p className="text-purple-200">
                                                    {item.quantity} {t('ม้วน')}
                                                </p>
                                                <p className="font-bold text-white">
                                                    {Number(
                                                        (item.totalCost || 0).toFixed(2)
                                                    ).toLocaleString('th-TH')}{' '}
                                                    {t('บาท')}
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
                                                <div className="flex items-center space-x-3">
                                                    {item.pipe.image ? (
                                                        <img
                                                            src={item.pipe.image}
                                                            alt=""
                                                            className="h-10 w-10"
                                                        />
                                                    ) : (
                                                        <p className="flex h-10 w-10 items-center justify-center bg-gray-500 text-center align-middle text-xs text-gray-300">
                                                            {t('ไม่มีรูป')}
                                                        </p>
                                                    )}
                                                    <div className="text-sm">
                                                        <p className="font-medium text-white">
                                                            {item.pipe.name ||
                                                                item.pipe.productCode}{' '}
                                                            - {item.pipe.sizeMM}mm
                                                            {item.pipe.isRecommended && (
                                                                <span className="ml-1 text-green-400">
                                                                    ⭐
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-purple-200">
                                                            {item.zones.join(', ')} |{' '}
                                                            {Number(
                                                                (item.pipe.price || 0).toFixed(2)
                                                            ).toLocaleString('th-TH')}{' '}
                                                            {t('บาท/ม้วน')} ({item.pipe.lengthM}{' '}
                                                            {t('ม./ม้วน')}) | {t('รวมความยาว:')}{' '}
                                                            {(
                                                                item.totalLength || 0
                                                            ).toLocaleString()}{' '}
                                                            {t('ม.')}
                                                            {item.extraLength &&
                                                                item.extraLength > 0 && (
                                                                    <span className="text-yellow-300">
                                                                        {' '}
                                                                        (+ {t('Riser')}{' '}
                                                                        {item.extraLength.toFixed(
                                                                            1
                                                                        )}{' '}
                                                                        ม.)
                                                                    </span>
                                                                )}{' '}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right text-sm">
                                                    <p className="text-purple-200">
                                                        {item.quantity} {t('ม้วน')}
                                                    </p>
                                                    <p className="font-bold text-white">
                                                        {Number(
                                                            (item.totalCost || 0).toFixed(2)
                                                        ).toLocaleString('th-TH')}{' '}
                                                        {t('บาท')}
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
                                            <div className="flex items-center space-x-3">
                                                {item.pipe.image ? (
                                                    <img
                                                        src={item.pipe.image}
                                                        alt=""
                                                        className="h-10 w-10"
                                                    />
                                                ) : (
                                                    <p className="flex h-10 w-10 items-center justify-center bg-gray-500 text-center align-middle text-xs text-gray-300">
                                                        {t('ไม่มีรูป')}
                                                    </p>
                                                )}
                                                <div className="text-sm">
                                                    <p className="font-medium text-white">
                                                        {item.pipe.name || item.pipe.productCode} -{' '}
                                                        {item.pipe.sizeMM}mm
                                                    </p>
                                                    <p className="text-xs text-purple-200">
                                                        {item.zones.join(', ')} |{' '}
                                                        {Number(
                                                            (item.pipe.price || 0).toFixed(2)
                                                        ).toLocaleString('th-TH')}{' '}
                                                        {t('บาท/ม้วน')} ({item.pipe.lengthM}{' '}
                                                        {t('ม./ม้วน')}) | {t('รวมความยาว:')}{' '}
                                                        {(item.totalLength || 0).toLocaleString()}{' '}
                                                        {t('ม.')}
                                                        {item.extraLength &&
                                                            item.extraLength > 0 && (
                                                                <span className="text-yellow-300">
                                                                    {' '}
                                                                    (+ {t('Riser')}{' '}
                                                                    {item.extraLength.toFixed(1)}{' '}
                                                                    ม.)
                                                                </span>
                                                            )}{' '}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right text-sm">
                                                <p className="text-purple-200">
                                                    {item.quantity} {t('ม้วน')}
                                                </p>
                                                <p className="font-bold text-white">
                                                    {Number(
                                                        (item.totalCost || 0).toFixed(2)
                                                    ).toLocaleString('th-TH')}{' '}
                                                    {t('บาท')}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {uniqueEmitterPipes > 0 && (
                            <div>
                                <h4 className="mb-1 text-xs font-medium text-purple-200">
                                    {t('ท่อย่อยแยก')} ({uniqueEmitterPipes} {t('ชนิด')}):
                                </h4>
                                <div className="space-y-1">
                                    {Object.values(costs.pipeSummary.emitter).map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between rounded bg-purple-800 p-2"
                                        >
                                            <div className="flex items-center space-x-3">
                                                {item.pipe.image ? (
                                                    <img
                                                        src={item.pipe.image}
                                                        alt=""
                                                        className="h-10 w-10"
                                                    />
                                                ) : (
                                                    <p className="flex h-10 w-10 items-center justify-center bg-gray-500 text-center align-middle text-xs text-gray-300">
                                                        {t('ไม่มีรูป')}
                                                    </p>
                                                )}
                                                <div className="text-sm">
                                                    <p className="font-medium text-white">
                                                        {item.pipe.name || item.pipe.productCode} -{' '}
                                                        {item.pipe.sizeMM}mm
                                                    </p>
                                                    <p className="text-xs text-purple-200">
                                                        {item.zones.join(', ')} |{' '}
                                                        {Number(
                                                            (item.pipe.price || 0).toFixed(2)
                                                        ).toLocaleString('th-TH')}{' '}
                                                        {t('บาท/ม้วน')} ({item.pipe.lengthM}{' '}
                                                        {t('ม./ม้วน')}) | {t('รวมความยาว:')}{' '}
                                                        {(item.totalLength || 0).toLocaleString()}{' '}
                                                        {t('ม.')}
                                                        {item.extraLength &&
                                                            item.extraLength > 0 && (
                                                                <span className="text-yellow-300">
                                                                    {' '}
                                                                    (+ {t('Riser')}{' '}
                                                                    {item.extraLength.toFixed(1)}{' '}
                                                                    ม.)
                                                                </span>
                                                            )}{' '}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right text-sm">
                                                <p className="text-purple-200">
                                                    {item.quantity} {t('ม้วน')}
                                                </p>
                                                <p className="font-bold text-white">
                                                    {Number(
                                                        (item.totalCost || 0).toFixed(2)
                                                    ).toLocaleString('th-TH')}{' '}
                                                    {t('บาท')}
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
                                    {t('ท่อเสริมตั้งสปริงเกอร์')}
                                </h4>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center space-x-3">
                                        {(costs as any).extraPipeSummary.pipe.image ? (
                                            <img
                                                src={(costs as any).extraPipeSummary.pipe.image}
                                                alt=""
                                                className="h-10 w-10"
                                            />
                                        ) : (
                                            <p className="flex h-10 w-10 items-center justify-center bg-gray-500 text-center align-middle text-xs text-gray-300">
                                                {t('ไม่มีรูป')}
                                            </p>
                                        )}
                                        <div className="flex flex-col">
                                            <p className="font-medium text-white">
                                                {(costs as any).extraPipeSummary.pipe.name ||
                                                    (costs as any).extraPipeSummary.pipe
                                                        .productCode}{' '}
                                                - {(costs as any).extraPipeSummary.pipe.sizeMM}mm
                                            </p>
                                            <p className="text-xs text-blue-200">
                                                {t('รวมความยาว:')}{' '}
                                                {(
                                                    (costs as any).extraPipeSummary?.totalLength ||
                                                    0
                                                ).toLocaleString()}{' '}
                                                {t('ม.')} | {t('ใช้ในโซน:')}{' '}
                                                {(costs as any).extraPipeSummary.zones.join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-blue-200">
                                            {(costs as any).extraPipeSummary.quantity} {t('ม้วน')}
                                        </p>
                                        <p className="font-bold text-white">
                                            {Number(
                                                (
                                                    (costs as any).extraPipeSummary?.totalCost || 0
                                                ).toFixed(2)
                                            ).toLocaleString('th-TH')}{' '}
                                            {t('บาท')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded bg-gray-600 p-4">
                    <h4 className="font-medium text-green-300">
                        💧 {getEquipmentName()} {t('ทั้งหมด')}
                    </h4>
                    <p className="text-sm">
                        {uniqueSprinklers} {t('ชนิด')} | {t('รวม')}{' '}
                        {(totalSprinklerHeads || 0).toLocaleString()} {t('หัว')}
                    </p>
                    {systemMode === 'หลายโซน' && (
                        <p className="text-sm">
                            ({totalZones} {projectMode === 'greenhouse' ? t('แปลง') : t('โซน')})
                        </p>
                    )}
                    <p className="text-sm">
                        {totalSprinklerHeads > 0
                            ? 'ราคา ' +
                              Number(
                                  (costs.totalSprinklerCost / totalSprinklerHeads).toFixed(2)
                              ).toLocaleString('th-TH')
                            : 0}{' '}
                        {t('บาท')}/{t('หัว')}
                    </p>
                    <p className="text-xl font-bold">
                        ราคา{' '}
                        {Number((costs.totalSprinklerCost || 0).toFixed(2)).toLocaleString('th-TH')}{' '}
                        {t('บาท')}
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
                            {t('จำนวน:')} 1 {t('ตัว')} ({effectivePump?.powerHP || 'N/A'} {t('HP')}){' '}
                            {effectivePump?.powerKW || 'N/A'} {t('kW')}
                        </p>
                        <p>
                            เข้า {effectivePump?.inlet_size_inch} {t('นิ้ว')} ออก{' '}
                            {effectivePump?.outlet_size_inch} {t('นิ้ว')}
                        </p>
                        <p>
                            กำลังยกสูงสุด {effectivePump?.max_head_m || 'N/A'} {t('เมตร')}
                        </p>
                        <p className="text-xl font-bold">
                            ราคา {Number((costs.pumpCost || 0).toFixed(2)).toLocaleString('th-TH')}{' '}
                            {t('บาท')}
                        </p>
                        {costs.pumpAccessoriesCost > 0 && (
                            <div className="mt-2 text-sm">
                                <p className="text-purple-300">
                                    🔧 {t('อุปกรณ์ประกอบ')}: +
                                    {Number(
                                        (costs.pumpAccessoriesCost || 0).toFixed(2)
                                    ).toLocaleString('th-TH')}{' '}
                                    {t('บาท')}
                                </p>
                                <p className="text-lg font-bold text-white">
                                    {t('รวม')}:{' '}
                                    {Number(
                                        (
                                            (costs.pumpCost || 0) + (costs.pumpAccessoriesCost || 0)
                                        ).toFixed(2)
                                    ).toLocaleString('th-TH')}{' '}
                                    {t('บาท')}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div className="rounded bg-gray-600 p-4">
                    <h4 className="font-medium text-purple-300">🔧 {t('ท่อทั้งหมด')}</h4>
                    <div className="space-y-1 text-sm">
                        <p>
                            {t('ท่อย่อย:')}{' '}
                            {Number((costs.totalBranchPipeCost || 0).toFixed(2)).toLocaleString(
                                'th-TH'
                            )}{' '}
                            {t('บาท')}
                            <span className="text-xs text-gray-400">
                                {' '}
                                (
                                {Object.values(costs.pipeSummary.branch).reduce(
                                    (sum, item) => sum + item.quantity,
                                    0
                                )}{' '}
                                {t('ม้วน')})
                            </span>
                        </p>
                        {costs.totalSecondaryPipeCost > 0 && (
                            <p>
                                {t('ท่อรอง:')}{' '}
                                {Number(
                                    (costs.totalSecondaryPipeCost || 0).toFixed(2)
                                ).toLocaleString('th-TH')}{' '}
                                {t('บาท')}
                                <span className="text-xs text-gray-400">
                                    {' '}
                                    (
                                    {Object.values(costs.pipeSummary.secondary).reduce(
                                        (sum, item) => sum + item.quantity,
                                        0
                                    )}{' '}
                                    {t('ม้วน')})
                                </span>
                            </p>
                        )}
                        {costs.totalMainPipeCost > 0 && (
                            <p>
                                {t('ท่อหลัก:')}{' '}
                                {Number((costs.totalMainPipeCost || 0).toFixed(2)).toLocaleString(
                                    'th-TH'
                                )}{' '}
                                {t('บาท')}
                                <span className="text-xs text-gray-400">
                                    {' '}
                                    (
                                    {Object.values(costs.pipeSummary.main).reduce(
                                        (sum, item) => sum + item.quantity,
                                        0
                                    )}{' '}
                                    {t('ม้วน')})
                                </span>
                            </p>
                        )}
                        {costs.totalEmitterPipeCost > 0 && (
                            <p>
                                {t('ท่อย่อยแยก:')}{' '}
                                {Number(
                                    (costs.totalEmitterPipeCost || 0).toFixed(2)
                                ).toLocaleString('th-TH')}{' '}
                                {t('บาท')}
                                <span className="text-xs text-gray-400">
                                    {' '}
                                    (
                                    {Object.values(costs.pipeSummary.emitter).reduce(
                                        (sum, item) => sum + item.quantity,
                                        0
                                    )}{' '}
                                    {t('ม้วน')})
                                </span>
                            </p>
                        )}
                        {(costs as any).extraPipeCost > 0 && (
                            <p>
                                {t('ท่อเสริม:')}{' '}
                                {Number(
                                    ((costs as any).extraPipeCost || 0).toFixed(2)
                                ).toLocaleString('th-TH')}{' '}
                                {t('บาท')}
                                <span className="text-xs text-gray-400">
                                    {' '}
                                    ({(costs as any).extraPipeSummary?.quantity} ม้วน)
                                </span>
                            </p>
                        )}
                    </div>
                    <p className="text-xl font-bold">
                        รวม{' '}
                        {Number(
                            (
                                (costs.totalBranchPipeCost || 0) +
                                (costs.totalSecondaryPipeCost || 0) +
                                (costs.totalMainPipeCost || 0) +
                                (costs.totalEmitterPipeCost || 0) +
                                ((costs as any).extraPipeCost || 0)
                            ).toFixed(2)
                        ).toLocaleString('th-TH')}{' '}
                        {t('บาท')}
                    </p>
                </div>

                {/* Sprinkler Equipment Sets */}
                {sprinklerEquipmentSets && Object.keys(sprinklerEquipmentSets).length > 0 && (
                    <div className="rounded bg-gray-600 p-4">
                        <h4 className="font-medium text-yellow-300">
                            🎯 {t('อุปกรณ์เสริมสปริงเกอร์')}
                        </h4>
                        <div className="space-y-1 text-sm">
                            {Object.entries(sprinklerEquipmentSets).map(
                                ([zoneId, equipmentSet]) => (
                                    <div key={zoneId} className="border-l-2 border-yellow-400 pl-2">
                                        <p className="text-xs text-gray-300">
                                            {projectMode === 'greenhouse' ? t('แปลง') : t('โซน')}{' '}
                                            {zoneId}:
                                        </p>
                                        {equipmentSet.groups?.map(
                                            (group: any, groupIndex: number) => (
                                                <div key={groupIndex} className="ml-2">
                                                    {group.items?.map(
                                                        (item: any, itemIndex: number) => (
                                                            <p key={itemIndex} className="text-xs">
                                                                •{' '}
                                                                {item.equipment?.name ||
                                                                    item.equipment?.product_code}
                                                                <span className="text-gray-400">
                                                                    ({item.quantity} {t('ชิ้น')} ×{' '}
                                                                    {Number(
                                                                        (
                                                                            item.unit_price || 0
                                                                        ).toFixed(2)
                                                                    ).toLocaleString('th-TH')}{' '}
                                                                    {t('บาท')})
                                                                </span>
                                                            </p>
                                                        )
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                        <p className="text-xl font-bold">
                            ราคา{' '}
                            {Number(
                                (costs.sprinklerEquipmentSetsCost || 0).toFixed(2)
                            ).toLocaleString('th-TH')}{' '}
                            {t('บาท')}
                        </p>
                    </div>
                )}

                {/* Connection Equipment */}
                {connectionEquipments && Object.keys(connectionEquipments).length > 0 && (
                    <div className="rounded bg-gray-600 p-4">
                        <h4 className="font-medium text-orange-300">🔗 {t('อุปกรณ์เชื่อมต่อ')}</h4>
                        <div className="space-y-1 text-sm">
                            {Object.entries(connectionEquipments).map(([zoneId, equipments]) => (
                                <div key={zoneId} className="border-l-2 border-orange-400 pl-2">
                                    <p className="text-xs text-gray-300">
                                        {projectMode === 'greenhouse' ? t('แปลง') : t('โซน')}{' '}
                                        {zoneId}:
                                    </p>
                                    {equipments.map((equipment: any, index: number) => (
                                        <p key={index} className="text-xs">
                                            •{' '}
                                            {equipment.equipment?.name ||
                                                equipment.equipment?.product_code}
                                            <span className="text-gray-400">
                                                ({equipment.count} {t('ชิ้น')} ×{' '}
                                                {Number(
                                                    (equipment.equipment?.price || 0).toFixed(2)
                                                ).toLocaleString('th-TH')}{' '}
                                                {t('บาท')})
                                            </span>
                                        </p>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <p className="text-xl font-bold">
                            ราคา{' '}
                            {Number(
                                (costs.connectionEquipmentsCost || 0).toFixed(2)
                            ).toLocaleString('th-TH')}{' '}
                            {t('บาท')}
                        </p>
                    </div>
                )}

                <div className="flex flex-col items-center justify-center rounded bg-gradient-to-r from-green-600 to-blue-600 p-4">
                    <h4 className="font-medium text-white">
                        💎 {t('รวมทั้งหมด')} {getProjectIcon()}
                        {projectMode === 'field-crop'
                            ? t(' (พืชไร่)')
                            : projectMode === 'greenhouse'
                              ? t(' (โรงเรือน)')
                              : ''}
                    </h4>
                    <p className="text-sm text-green-100">
                        {t('ราคาสุทธิ')} ({t('ไม่รวม VAT')})
                    </p>
                    <div className="mt-2 flex items-center justify-center">
                        <div className="flex items-center justify-center">
                            <p className="text-2xl font-bold text-white">
                                {Number((Number(costs.totalCost) || 0).toFixed(2)).toLocaleString(
                                    'th-TH'
                                )}{' '}
                                {t('บาท')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 text-center">
                <button
                    onClick={onQuotationClick}
                    className="rounded bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 text-lg font-bold text-white hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={(costs.totalCost || 0) === 0}
                >
                    📋 {t('ออกใบเสนอราคา')}
                </button>
                {(costs.totalCost || 0) === 0 && (
                    <p className="mt-2 text-sm text-red-400">
                        {t('กรุณาเลือก')}
                        {getEquipmentName()}
                        {t('เพื่อให้ระบบคำนวณราคา')}
                    </p>
                )}
            </div>
        </div>
    );
};

export default CostSummary;
