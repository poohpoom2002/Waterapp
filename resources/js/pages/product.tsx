/* eslint-disable @typescript-eslint/no-unused-vars */
// resources/js/pages/product.tsx - Updated to support greenhouse mode

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from 'react';
import { IrrigationInput, QuotationData, QuotationDataCustomer } from './types/interfaces';
import { useCalculations, ZoneCalculationData } from './hooks/useCalculations';
import { calculatePipeRolls, formatNumber } from './utils/calculations';

import {
    getProjectStats,
    getLongestBranchPipeStats,
    getSubMainPipeBranchCount,
    getDetailedBranchPipeStats,
} from '../utils/horticultureProjectStats';
import {
    loadProjectData,
    HorticultureProjectData,
    Zone,
    MainPipe,
    SubMainPipe,
} from '../utils/horticultureUtils';

import { loadGardenData, GardenPlannerData, GardenZone } from '../utils/homeGardenData';
import { calculateGardenStatistics, GardenStatistics } from '../utils/gardenStatistics';

// ADD: Import field crop data utilities
import { 
    getFieldCropData, 
    migrateFromFieldMapData, 
    FieldCropData, 
    ZoneInfo as FieldZoneInfo 
} from '../utils/fieldCropData';

// ADD: Import greenhouse data utilities
import {
    getGreenhouseData,
    migrateLegacyGreenhouseData,
    GreenhousePlanningData,
    PlotStats,
    PIXELS_PER_METER
} from '../utils/greenHouseData';

import { getCropByValue } from './utils/cropData';

import InputForm from './components/InputForm';
import CalculationSummary from './components/CalculationSummary';
import SprinklerSelector from './components/SprinklerSelector';
import PumpSelector from './components/PumpSelector';
import PipeSelector from './components/PipeSelector';
import CostSummary from './components/CostSummary';
import QuotationModal from './components/QuotationModal';
import QuotationDocument from './components/QuotationDocument';

import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { router } from '@inertiajs/react';
import FloatingAiChat from '@/components/FloatingAiChat';

// UPDATE: Add greenhouse to ProjectMode
type ProjectMode = 'horticulture' | 'garden' | 'field-crop' | 'greenhouse';

interface ZoneOperationGroup {
    id: string;
    zones: string[];
    order: number;
    label: string;
}

export default function Product() {
    const [projectMode, setProjectMode] = useState<ProjectMode>('horticulture');
    const [gardenData, setGardenData] = useState<GardenPlannerData | null>(null);
    const [gardenStats, setGardenStats] = useState<GardenStatistics | null>(null);

    // ADD: Field crop data state
    const [fieldCropData, setFieldCropData] = useState<FieldCropData | null>(null);

    // ADD: Greenhouse data state
    const [greenhouseData, setGreenhouseData] = useState<GreenhousePlanningData | null>(null);

    const [projectData, setProjectData] = useState<HorticultureProjectData | null>(null);
    const [projectStats, setProjectStats] = useState<any>(null);
    const [activeZoneId, setActiveZoneId] = useState<string>('');
    const [zoneInputs, setZoneInputs] = useState<{ [zoneId: string]: IrrigationInput }>({});
    const [zoneSprinklers, setZoneSprinklers] = useState<{ [zoneId: string]: any }>({});

    const [zoneOperationMode, setZoneOperationMode] = useState<
        'sequential' | 'simultaneous' | 'custom'
    >('sequential');
    const [zoneOperationGroups, setZoneOperationGroups] = useState<ZoneOperationGroup[]>([]);

    const [showFloatingAiChat, setShowFloatingAiChat] = useState(false);
    const [isAiChatMinimized, setIsAiChatMinimized] = useState(false);

    const { t } = useLanguage();

    const [selectedPipes, setSelectedPipes] = useState<{
        [zoneId: string]: {
            branch?: any;
            secondary?: any;
            main?: any;
        };
    }>({});
    const [selectedPump, setSelectedPump] = useState<any>(null);
    const [showPumpOption, setShowPumpOption] = useState(true);

    const [projectImage, setProjectImage] = useState<string | null>(null);
    const [showImageModal, setShowImageModal] = useState(false);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setProjectImage(url);
        }
    };

    const handleImageDelete = () => {
        if (projectImage && projectImage.startsWith('blob:')) {
            URL.revokeObjectURL(projectImage);
        }
        setProjectImage(null);
    };

    useEffect(() => {
        return () => {
            if (projectImage && projectImage.startsWith('blob:')) {
                URL.revokeObjectURL(projectImage);
            }
        };
    }, [projectImage]);

    const getZoneName = (zoneId: string): string => {
        if (projectMode === 'garden' && gardenStats) {
            const zone = gardenStats.zones.find((z) => z.zoneId === zoneId);
            return zone?.zoneName || zoneId;
        }
        if (projectMode === 'field-crop' && fieldCropData) {
            const zone = fieldCropData.zones.info.find((z) => z.id === zoneId);
            return zone?.name || zoneId;
        }
        if (projectMode === 'greenhouse' && greenhouseData) {
            const plot = greenhouseData.summary.plotStats.find((p) => p.plotId === zoneId);
            return plot?.plotName || zoneId;
        }
        const zone = projectData?.zones.find((z) => z.id === zoneId);
        return zone?.name || zoneId;
    };

    // ADD: Create greenhouse zone input
    const createGreenhouseZoneInput = (
        plot: PlotStats,
        greenhouseData: GreenhousePlanningData,
        totalZones: number
    ): IrrigationInput => {
        const areaInRai = plot.area / 1600;
        
        // Get crop data for this plot
        const crop = getCropByValue(plot.cropType || '');
        
        // Calculate planting points for this plot
        const totalTrees = plot.production.totalPlants || 100;
        const waterPerTree = (plot.production.waterRequirementPerIrrigation / Math.max(totalTrees, 1)) || 50;
        
        // Use pipe stats from the plot
        const longestBranch = plot.pipeStats.sub.longest || 30;
        const totalBranchLength = plot.pipeStats.sub.totalLength || 100;
        const longestSubmain = plot.pipeStats.main.longest || 0;
        const totalSubmainLength = plot.pipeStats.main.totalLength || 0;
        const longestMain = plot.pipeStats.main.longest || 0;
        const totalMainLength = plot.pipeStats.main.totalLength || 0;

        return {
            farmSizeRai: formatNumber(areaInRai, 3),
            totalTrees: totalTrees,
            waterPerTreeLiters: formatNumber(waterPerTree, 3),
            numberOfZones: totalZones,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(totalTrees / 5)),
            branchesPerSecondary: 1,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(totalTrees / 5)),
            branchesPerLongestSecondary: 1,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(longestBranch, 3),
            totalBranchPipeM: formatNumber(totalBranchLength, 3),
            longestSecondaryPipeM: formatNumber(longestSubmain, 3),
            totalSecondaryPipeM: formatNumber(totalSubmainLength, 3),
            longestMainPipeM: formatNumber(longestMain, 3),
            totalMainPipeM: formatNumber(totalMainLength, 3),
        };
    };

    // ADD: Create single greenhouse input (when there's only one plot)
    const createSingleGreenhouseInput = (greenhouseData: GreenhousePlanningData): IrrigationInput => {
        const areaInRai = greenhouseData.summary.totalPlotArea / 1600;
        const totalTrees = greenhouseData.summary.overallProduction.totalPlants;
        const waterPerTree = greenhouseData.summary.overallProduction.waterRequirementPerIrrigation / Math.max(totalTrees, 1);
        
        return {
            farmSizeRai: formatNumber(areaInRai, 3),
            totalTrees: totalTrees,
            waterPerTreeLiters: formatNumber(waterPerTree, 3),
            numberOfZones: 1,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(totalTrees / 5)),
            branchesPerSecondary: 1,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(totalTrees / 5)),
            branchesPerLongestSecondary: 1,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(greenhouseData.summary.overallPipeStats.sub.longest || 30, 3),
            totalBranchPipeM: formatNumber(greenhouseData.summary.overallPipeStats.sub.totalLength || 100, 3),
            longestSecondaryPipeM: formatNumber(greenhouseData.summary.overallPipeStats.main.longest || 0, 3),
            totalSecondaryPipeM: formatNumber(greenhouseData.summary.overallPipeStats.main.totalLength || 0, 3),
            longestMainPipeM: formatNumber(greenhouseData.summary.overallPipeStats.main.longest || 0, 3),
            totalMainPipeM: formatNumber(greenhouseData.summary.overallPipeStats.main.totalLength || 0, 3),
        };
    };

    // ADD: Create field crop zone input
    const createFieldCropZoneInput = (
        zone: FieldZoneInfo,
        fieldData: FieldCropData,
        totalZones: number
    ): IrrigationInput => {
        const areaInRai = zone.area / 1600;
        
        // Get crop data for this zone
        const assignedCropValue = fieldData.crops.zoneAssignments[zone.id];
        const crop = assignedCropValue ? getCropByValue(assignedCropValue) : null;
        
        // Calculate planting points for this zone
        let totalTrees = 100; // default
        let waterPerTree = 50; // default liters per tree
        
        if (crop) {
            const rowSpacing = fieldData.crops.spacing.rowSpacing[assignedCropValue] || (crop.rowSpacing / 100);
            const plantSpacing = fieldData.crops.spacing.plantSpacing[assignedCropValue] || (crop.plantSpacing / 100);
            
            if (rowSpacing > 0 && plantSpacing > 0) {
                const plantsPerSqm = (1 / rowSpacing) * (1 / plantSpacing);
                totalTrees = Math.floor(zone.area * plantsPerSqm);
            }
            
            if (crop.waterRequirement) {
                waterPerTree = crop.waterRequirement;
            }
        }

        // Get pipe data for this zone
        const zonePipes = fieldData.pipes.connections.filter(p => p.zoneId === zone.id);
        const branchPipes = zonePipes.filter(p => p.type === 'lateral');
        const submainPipes = zonePipes.filter(p => p.type === 'submain');
        const mainPipes = zonePipes.filter(p => p.type === 'main');
        
        const longestBranch = branchPipes.length > 0 ? Math.max(...branchPipes.map(p => p.length)) : 30;
        const totalBranchLength = branchPipes.reduce((sum, p) => sum + p.length, 0) || 100;
        const longestSubmain = submainPipes.length > 0 ? Math.max(...submainPipes.map(p => p.length)) : 0;
        const totalSubmainLength = submainPipes.reduce((sum, p) => sum + p.length, 0) || 0;
        const longestMain = mainPipes.length > 0 ? Math.max(...mainPipes.map(p => p.length)) : 0;
        const totalMainLength = mainPipes.reduce((sum, p) => sum + p.length, 0) || 0;

        return {
            farmSizeRai: formatNumber(areaInRai, 3),
            totalTrees: totalTrees,
            waterPerTreeLiters: formatNumber(waterPerTree, 3),
            numberOfZones: totalZones,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(totalTrees / Math.max(branchPipes.length, 1))),
            branchesPerSecondary: Math.max(1, Math.ceil(branchPipes.length / Math.max(submainPipes.length, 1))),
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(totalTrees / Math.max(branchPipes.length, 1))),
            branchesPerLongestSecondary: Math.max(1, Math.ceil(branchPipes.length / Math.max(submainPipes.length, 1))),
            secondariesPerLongestMain: Math.max(1, Math.ceil(submainPipes.length / Math.max(mainPipes.length, 1))),

            longestBranchPipeM: formatNumber(longestBranch, 3),
            totalBranchPipeM: formatNumber(totalBranchLength, 3),
            longestSecondaryPipeM: formatNumber(longestSubmain, 3),
            totalSecondaryPipeM: formatNumber(totalSubmainLength, 3),
            longestMainPipeM: formatNumber(longestMain, 3),
            totalMainPipeM: formatNumber(totalMainLength, 3),
        };
    };

    // ADD: Create single field crop input (when there's only one area)
    const createSingleFieldCropInput = (fieldData: FieldCropData): IrrigationInput => {
        const areaInRai = fieldData.area.size / 1600;
        const totalTrees = fieldData.summary.totalPlantingPoints;
        const waterPerTree = fieldData.summary.totalWaterRequirementPerIrrigation / Math.max(totalTrees, 1);
        
        return {
            farmSizeRai: formatNumber(areaInRai, 3),
            totalTrees: totalTrees,
            waterPerTreeLiters: formatNumber(waterPerTree, 3),
            numberOfZones: 1,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(totalTrees / 5)),
            branchesPerSecondary: 1,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(totalTrees / 5)),
            branchesPerLongestSecondary: 1,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(fieldData.pipes.stats.lateral.longest || 30, 3),
            totalBranchPipeM: formatNumber(fieldData.pipes.stats.lateral.totalLength || 100, 3),
            longestSecondaryPipeM: formatNumber(fieldData.pipes.stats.submain.longest || 0, 3),
            totalSecondaryPipeM: formatNumber(fieldData.pipes.stats.submain.totalLength || 0, 3),
            longestMainPipeM: formatNumber(fieldData.pipes.stats.main.longest || 0, 3),
            totalMainPipeM: formatNumber(fieldData.pipes.stats.main.totalLength || 0, 3),
        };
    };

    const createZoneCalculationData = (): ZoneCalculationData[] => {
        const zoneCalcData: ZoneCalculationData[] = [];
        let allZoneIds: string[] = [];

        // Get zone IDs based on project mode
        if (projectMode === 'garden' && gardenStats) {
            allZoneIds = gardenStats.zones.map((z) => z.zoneId);
        } else if (projectMode === 'field-crop' && fieldCropData) {
            allZoneIds = fieldCropData.zones.info.map((z) => z.id);
        } else if (projectMode === 'greenhouse' && greenhouseData) {
            allZoneIds = greenhouseData.summary.plotStats.map((p) => p.plotId);
        } else if (projectData) {
            allZoneIds = projectData.zones.map((z) => z.id);
        }

        allZoneIds.forEach((zoneId) => {
            const zoneInput = zoneInputs[zoneId];
            const zoneSprinkler = zoneSprinklers[zoneId];

            if (zoneInput && zoneSprinkler) {
                let simultaneousZonesForCalc = 1;
                if (zoneOperationMode === 'simultaneous') {
                    simultaneousZonesForCalc = allZoneIds.length;
                } else if (zoneOperationMode === 'custom') {
                    const group = zoneOperationGroups.find((g) => g.zones.includes(zoneId));
                    simultaneousZonesForCalc = group ? group.zones.length : 1;
                }

                const adjustedInput = {
                    ...zoneInput,
                    simultaneousZones: simultaneousZonesForCalc,
                    numberOfZones: allZoneIds.length,
                };

                zoneCalcData.push({
                    zoneId,
                    input: adjustedInput,
                    sprinkler: zoneSprinkler,
                });
            }
        });

        return zoneCalcData;
    };

    const createGardenZoneInput = (
        zone: any,
        gardenStats: GardenStatistics,
        totalZones: number
    ): IrrigationInput => {
        const zoneStats = gardenStats.zones.find((z) => z.zoneId === zone.zoneId);

        if (!zoneStats) {
            throw new Error(`Zone statistics not found for zone ${zone.zoneId}`);
        }

        const areaInRai = zoneStats.area / 1600;

        const sprinklerCount = zoneStats.sprinklerCount || 10;

        const waterPerSprinkler = 50;

        return {
            farmSizeRai: formatNumber(areaInRai, 3),
            totalTrees: sprinklerCount,
            waterPerTreeLiters: formatNumber(waterPerSprinkler, 3),
            numberOfZones: totalZones,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(sprinklerCount / 5)),
            branchesPerSecondary: 1,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(sprinklerCount / 5)),
            branchesPerLongestSecondary: 1,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(zoneStats.longestPipeFromSource || 20, 3),
            totalBranchPipeM: formatNumber(zoneStats.totalPipeLength || 100, 3),
            longestSecondaryPipeM: 0,
            totalSecondaryPipeM: 0,
            longestMainPipeM: 0,
            totalMainPipeM: 0,
        };
    };

    const createSingleGardenInput = (stats: GardenStatistics): IrrigationInput => {
        const summary = stats.summary;

        const areaInRai = summary.totalArea / 1600;

        return {
            farmSizeRai: formatNumber(areaInRai, 3),
            totalTrees: summary.totalSprinklers,
            waterPerTreeLiters: formatNumber(50, 3),
            numberOfZones: 1,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(summary.totalSprinklers / 5)),
            branchesPerSecondary: 1,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(summary.totalSprinklers / 5)),
            branchesPerLongestSecondary: 1,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(summary.longestPipeFromSource || 20, 3),
            totalBranchPipeM: formatNumber(summary.totalPipeLength || 100, 3),
            longestSecondaryPipeM: 0,
            totalSecondaryPipeM: 0,
            longestMainPipeM: 0,
            totalMainPipeM: 0,
        };
    };

    const createZoneInput = (
        zone: Zone,
        zoneStats: any,
        mainPipes: MainPipe[],
        subMainPipes: SubMainPipe[],
        branchPipes: any[],
        totalZones: number
    ): IrrigationInput => {
        const longestBranch =
            branchPipes.length > 0 ? Math.max(...branchPipes.map((b) => b.length)) : 30;
        const totalBranchLength = branchPipes.reduce((sum, b) => sum + b.length, 0) || 500;

        const longestSubMain =
            subMainPipes.length > 0 ? Math.max(...subMainPipes.map((s) => s.length)) : 0;
        const totalSubMainLength = subMainPipes.reduce((sum, s) => sum + s.length, 0) || 0;

        const longestMain = mainPipes.length > 0 ? Math.max(...mainPipes.map((m) => m.length)) : 0;
        const totalMainLength = mainPipes.reduce((sum, m) => sum + m.length, 0) || 0;

        const totalTrees = zone.plantCount || 100;
        const waterPerTree = zone.plantData?.waterNeed || 50;

        const branchStats = getLongestBranchPipeStats();
        const subMainStats = getSubMainPipeBranchCount();

        let actualSprinklersPerLongestBranch = Math.max(
            1,
            Math.ceil(totalTrees / Math.max(branchPipes.length, 1))
        );
        let actualBranchesPerLongestSecondary = Math.max(
            1,
            Math.ceil(branchPipes.length / Math.max(subMainPipes.length, 1))
        );

        if (branchStats) {
            const zoneBranchStats = branchStats.find((stat) => stat.zoneId === zone.id);
            if (zoneBranchStats) {
                actualSprinklersPerLongestBranch = zoneBranchStats.longestBranchPipe.plantCount;
            }
        }

        if (subMainStats) {
            const zoneSubMainStats = subMainStats.find((stat) => stat.zoneId === zone.id);
            if (zoneSubMainStats && zoneSubMainStats.subMainPipes.length > 0) {
                const maxBranchSubMain = zoneSubMainStats.subMainPipes.reduce((max, current) =>
                    current.branchCount > max.branchCount ? current : max
                );
                actualBranchesPerLongestSecondary = maxBranchSubMain.branchCount;
            }
        }

        return {
            farmSizeRai: formatNumber(zone.area / 1600, 3),
            totalTrees: totalTrees,
            waterPerTreeLiters: formatNumber(waterPerTree, 3),
            numberOfZones: totalZones,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 20,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(
                1,
                Math.ceil(totalTrees / Math.max(branchPipes.length, 1))
            ),
            branchesPerSecondary: Math.max(
                1,
                Math.ceil(branchPipes.length / Math.max(subMainPipes.length, 1))
            ),
            simultaneousZones: 1,

            sprinklersPerLongestBranch: actualSprinklersPerLongestBranch,
            branchesPerLongestSecondary: actualBranchesPerLongestSecondary,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(longestBranch, 3),
            totalBranchPipeM: formatNumber(totalBranchLength, 3),
            longestSecondaryPipeM: formatNumber(longestSubMain, 3),
            totalSecondaryPipeM: formatNumber(totalSubMainLength, 3),
            longestMainPipeM: formatNumber(longestMain, 3),
            totalMainPipeM: formatNumber(totalMainLength, 3),
        };
    };

    const createSingleZoneInput = (data: HorticultureProjectData, stats: any): IrrigationInput => {
        const totalStats = stats.zoneDetails[0];

        const branchStats = getLongestBranchPipeStats();
        const subMainStats = getSubMainPipeBranchCount();

        let actualSprinklersPerLongestBranch = 4;
        let actualBranchesPerLongestSecondary = 5;

        if (branchStats && branchStats.length > 0) {
            actualSprinklersPerLongestBranch = branchStats[0].longestBranchPipe.plantCount;
        }

        if (subMainStats && subMainStats.length > 0) {
            const zoneSubMainStats = subMainStats[0];
            if (zoneSubMainStats.subMainPipes.length > 0) {
                const maxBranchSubMain = zoneSubMainStats.subMainPipes.reduce((max, current) =>
                    current.branchCount > max.branchCount ? current : max
                );
                actualBranchesPerLongestSecondary = maxBranchSubMain.branchCount;
            }
        }

        const plantData = data.selectedPlantType || data.plants?.[0]?.plantData;
        const waterPerTree = plantData?.waterNeed || totalStats.waterPerPlant || 50;

        return {
            farmSizeRai: formatNumber(data.totalArea / 1600, 3),
            totalTrees: data.plants?.length || 100,
            waterPerTreeLiters: formatNumber(waterPerTree, 3),
            numberOfZones: 1,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 20,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: 4,
            branchesPerSecondary: 5,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: actualSprinklersPerLongestBranch,
            branchesPerLongestSecondary: actualBranchesPerLongestSecondary,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(totalStats.branchPipesInZone.longest || 30, 3),
            totalBranchPipeM: formatNumber(totalStats.branchPipesInZone.totalLength || 500, 3),
            longestSecondaryPipeM: formatNumber(totalStats.subMainPipesInZone.longest || 0, 3),
            totalSecondaryPipeM: formatNumber(totalStats.subMainPipesInZone.totalLength || 0, 3),
            longestMainPipeM: formatNumber(totalStats.mainPipesInZone.longest || 0, 3),
            totalMainPipeM: formatNumber(totalStats.mainPipesInZone.totalLength || 0, 3),
        };
    };

    const currentInput = useMemo(() => {
        if (!activeZoneId || !zoneInputs[activeZoneId]) {
            return null;
        }

        const baseInput = zoneInputs[activeZoneId];

        let simultaneousZonesForCalc = 1;
        let allZoneIds: string[] = [];

        // Get zone IDs based on project mode
        if (projectMode === 'garden' && gardenStats) {
            allZoneIds = gardenStats.zones.map((z) => z.zoneId);
        } else if (projectMode === 'field-crop' && fieldCropData) {
            allZoneIds = fieldCropData.zones.info.map((z) => z.id);
        } else if (projectMode === 'greenhouse' && greenhouseData) {
            allZoneIds = greenhouseData.summary.plotStats.map((p) => p.plotId);
        } else if (projectData) {
            allZoneIds = projectData.zones.map((z) => z.id);
        }

        if (zoneOperationMode === 'simultaneous') {
            simultaneousZonesForCalc = allZoneIds.length;
        } else if (zoneOperationMode === 'custom') {
            const group = zoneOperationGroups.find((g) => g.zones.includes(activeZoneId));
            simultaneousZonesForCalc = group ? group.zones.length : 1;
        }

        const updatedInput = {
            ...baseInput,
            simultaneousZones: simultaneousZonesForCalc,
            numberOfZones: allZoneIds.length,
        };

        return updatedInput;
    }, [
        activeZoneId,
        zoneInputs,
        zoneOperationMode,
        zoneOperationGroups,
        projectMode,
        gardenStats,
        fieldCropData,
        greenhouseData,
        projectData,
    ]);

    const handleZoneOperationModeChange = (mode: 'sequential' | 'simultaneous' | 'custom') => {
        setZoneOperationMode(mode);

        let allZoneIds: string[] = [];

        // Get zone IDs based on project mode
        if (projectMode === 'garden' && gardenStats) {
            allZoneIds = gardenStats.zones.map((z) => z.zoneId);
        } else if (projectMode === 'field-crop' && fieldCropData) {
            allZoneIds = fieldCropData.zones.info.map((z) => z.id);
        } else if (projectMode === 'greenhouse' && greenhouseData) {
            allZoneIds = greenhouseData.summary.plotStats.map((p) => p.plotId);
        } else if (projectData) {
            allZoneIds = projectData.zones.map((z) => z.id);
        }

        if (mode === 'sequential') {
            const groups = allZoneIds.map((zoneId, index) => ({
                id: `group-${index}`,
                zones: [zoneId],
                order: index + 1,
                label: `${getZoneName(zoneId)}`,
            }));
            setZoneOperationGroups(groups);
        } else if (mode === 'simultaneous') {
            setZoneOperationGroups([
                {
                    id: 'group-all',
                    zones: allZoneIds,
                    order: 1,
                    label: 'เปิดทุกโซนพร้อมกัน',
                },
            ]);
        }
    };

    const addOperationGroup = () => {
        const newGroup: ZoneOperationGroup = {
            id: `group-${Date.now()}`,
            zones: [],
            order: zoneOperationGroups.length + 1,
            label: `กลุ่มที่ ${zoneOperationGroups.length + 1}`,
        };
        setZoneOperationGroups([...zoneOperationGroups, newGroup]);
    };

    const updateOperationGroup = (groupId: string, zones: string[]) => {
        setZoneOperationGroups((groups) =>
            groups.map((g) => (g.id === groupId ? { ...g, zones } : g))
        );
    };

    const removeOperationGroup = (groupId: string) => {
        setZoneOperationGroups((groups) =>
            groups
                .filter((g) => g.id !== groupId)
                .map((g, index) => ({ ...g, order: index + 1, label: `กลุ่มที่ ${index + 1}` }))
        );
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        let mode = urlParams.get('mode') as ProjectMode;
        const storedType = localStorage.getItem('projectType');

        // UPDATE: Handle greenhouse mode
        if (!mode && storedType === 'greenhouse') {
            mode = 'greenhouse';
        } else if (!mode && storedType === 'field-crop') {
            mode = 'field-crop';
        } else if (!mode && storedType === 'home-garden') {
            mode = 'garden';
        }

        const mapImage = localStorage.getItem('projectMapImage');
        if (mapImage) {
            setProjectImage(mapImage);
        }

        // ADD: Handle greenhouse mode
        if (mode === 'greenhouse') {
            setProjectMode('greenhouse');
            
            // Try to load existing greenhouse data
            let data = getGreenhouseData();
            
            // If no data exists, try to migrate from old format
            if (!data) {
                data = migrateLegacyGreenhouseData();
            }
            
            if (data) {
                setGreenhouseData(data);
                
                const initialZoneInputs: { [zoneId: string]: IrrigationInput } = {};
                const initialSelectedPipes: {
                    [zoneId: string]: { branch?: any; secondary?: any; main?: any };
                } = {};

                if (data.summary.plotStats.length > 1) {
                    // Multiple plots
                    data.summary.plotStats.forEach((plot) => {
                        initialZoneInputs[plot.plotId] = createGreenhouseZoneInput(
                            plot,
                            data,
                            data.summary.plotStats.length
                        );
                        initialSelectedPipes[plot.plotId] = {
                            branch: undefined,
                            secondary: undefined,
                            main: undefined,
                        };
                    });

                    setZoneInputs(initialZoneInputs);
                    setSelectedPipes(initialSelectedPipes);
                    setActiveZoneId(data.summary.plotStats[0].plotId);
                    handleZoneOperationModeChange('sequential');
                } else if (data.summary.plotStats.length === 1) {
                    // Single plot
                    const plot = data.summary.plotStats[0];
                    const singleInput = createGreenhouseZoneInput(plot, data, 1);
                    setZoneInputs({ [plot.plotId]: singleInput });
                    setSelectedPipes({
                        [plot.plotId]: { branch: undefined, secondary: undefined, main: undefined },
                    });
                    setActiveZoneId(plot.plotId);
                } else {
                    // No plots - treat as single area
                    const singleInput = createSingleGreenhouseInput(data);
                    setZoneInputs({ 'main-area': singleInput });
                    setSelectedPipes({
                        'main-area': { branch: undefined, secondary: undefined, main: undefined },
                    });
                    setActiveZoneId('main-area');
                }
            } else {
                console.warn('⚠️ No greenhouse data found');
                // Redirect back to greenhouse-summary or greenhouse-crop
                router.visit('/greenhouse-crop');
            }
        } else if (mode === 'field-crop') {
            setProjectMode('field-crop');
            
            // Try to load existing field crop data
            let fieldData = getFieldCropData();
            
            // If no data exists, try to migrate from old format
            if (!fieldData) {
                fieldData = migrateFromFieldMapData();
            }
            
            if (fieldData) {
                setFieldCropData(fieldData);
                
                const initialZoneInputs: { [zoneId: string]: IrrigationInput } = {};
                const initialSelectedPipes: {
                    [zoneId: string]: { branch?: any; secondary?: any; main?: any };
                } = {};

                if (fieldData.zones.info.length > 1) {
                    // Multiple zones
                    fieldData.zones.info.forEach((zone) => {
                        initialZoneInputs[zone.id] = createFieldCropZoneInput(
                            zone,
                            fieldData,
                            fieldData.zones.info.length
                        );
                        initialSelectedPipes[zone.id] = {
                            branch: undefined,
                            secondary: undefined,
                            main: undefined,
                        };
                    });

                    setZoneInputs(initialZoneInputs);
                    setSelectedPipes(initialSelectedPipes);
                    setActiveZoneId(fieldData.zones.info[0].id);
                    handleZoneOperationModeChange('sequential');
                } else if (fieldData.zones.info.length === 1) {
                    // Single zone
                    const zone = fieldData.zones.info[0];
                    const singleInput = createFieldCropZoneInput(zone, fieldData, 1);
                    setZoneInputs({ [zone.id]: singleInput });
                    setSelectedPipes({
                        [zone.id]: { branch: undefined, secondary: undefined, main: undefined },
                    });
                    setActiveZoneId(zone.id);
                } else {
                    // No zones - treat as single area
                    const singleInput = createSingleFieldCropInput(fieldData);
                    setZoneInputs({ 'main-area': singleInput });
                    setSelectedPipes({
                        'main-area': { branch: undefined, secondary: undefined, main: undefined },
                    });
                    setActiveZoneId('main-area');
                }
            } else {
                console.warn('⚠️ No field crop data found');
                // Redirect back to field-crop-summary or field-map
                router.visit('/field-map');
            }
        } else if (mode === 'garden') {
            setProjectMode('garden');
            const gardenPlannerData = loadGardenData();
            if (gardenPlannerData) {
                setGardenData(gardenPlannerData);
                const stats = calculateGardenStatistics(gardenPlannerData);
                setGardenStats(stats);

                const initialZoneInputs: { [zoneId: string]: IrrigationInput } = {};
                const initialSelectedPipes: {
                    [zoneId: string]: { branch?: any; secondary?: any; main?: any };
                } = {};

                if (stats.zones.length > 1) {
                    stats.zones.forEach((zone) => {
                        initialZoneInputs[zone.zoneId] = createGardenZoneInput(
                            zone,
                            stats,
                            stats.zones.length
                        );
                        initialSelectedPipes[zone.zoneId] = {
                            branch: undefined,
                            secondary: undefined,
                            main: undefined,
                        };
                    });

                    setZoneInputs(initialZoneInputs);
                    setSelectedPipes(initialSelectedPipes);
                    setActiveZoneId(stats.zones[0].zoneId);
                    handleZoneOperationModeChange('sequential');
                } else {
                    const singleInput = createSingleGardenInput(stats);
                    setZoneInputs({ 'main-area': singleInput });
                    setSelectedPipes({
                        'main-area': { branch: undefined, secondary: undefined, main: undefined },
                    });
                    setActiveZoneId('main-area');
                }
            }
        } else {
            setProjectMode('horticulture');
            const data = loadProjectData();
            const stats = getProjectStats();

            if (data && stats) {
                setProjectData(data);
                setProjectStats(stats);

                if (data.useZones && data.zones.length > 0) {
                    const initialZoneInputs: { [zoneId: string]: IrrigationInput } = {};
                    const initialSelectedPipes: {
                        [zoneId: string]: { branch?: any; secondary?: any; main?: any };
                    } = {};

                    data.zones.forEach((zone) => {
                        const zoneStats = stats.zoneDetails.find((z: any) => z.zoneId === zone.id);
                        const zoneMainPipes = data.mainPipes.filter((p) => p.toZone === zone.id);
                        const zoneSubMainPipes = data.subMainPipes.filter(
                            (p) => p.zoneId === zone.id
                        );
                        const zoneBranchPipes = zoneSubMainPipes.flatMap(
                            (s) => s.branchPipes || []
                        );

                        initialZoneInputs[zone.id] = createZoneInput(
                            zone,
                            zoneStats,
                            zoneMainPipes,
                            zoneSubMainPipes,
                            zoneBranchPipes,
                            data.zones.length
                        );

                        initialSelectedPipes[zone.id] = {
                            branch: undefined,
                            secondary: undefined,
                            main: undefined,
                        };
                    });

                    setZoneInputs(initialZoneInputs);
                    setSelectedPipes(initialSelectedPipes);
                    setActiveZoneId(data.zones[0].id);

                    handleZoneOperationModeChange('sequential');
                } else {
                    const singleInput = createSingleZoneInput(data, stats);
                    setZoneInputs({ 'main-area': singleInput });
                    setSelectedPipes({
                        'main-area': { branch: undefined, secondary: undefined, main: undefined },
                    });
                    setActiveZoneId('main-area');
                }
            }
        }
    }, []);

    const currentSprinkler = zoneSprinklers[activeZoneId] || null;

    const handleSprinklerChange = (sprinkler: any) => {
        if (activeZoneId && sprinkler) {
            setZoneSprinklers((prev) => ({
                ...prev,
                [activeZoneId]: sprinkler,
            }));
        }
    };

    const handlePipeChange = (pipeType: 'branch' | 'secondary' | 'main', pipe: any) => {
        if (activeZoneId) {
            setSelectedPipes((prev) => ({
                ...prev,
                [activeZoneId]: {
                    ...prev[activeZoneId],
                    [pipeType]: pipe,
                },
            }));
        }
    };

    const handlePumpChange = (pump: any) => {
        setSelectedPump(pump);
    };

    const allZoneData = useMemo(() => {
        return createZoneCalculationData();
    }, [zoneInputs, zoneSprinklers, zoneOperationMode, zoneOperationGroups]);

    const results = useCalculations(
        currentInput as IrrigationInput,
        currentSprinkler,
        allZoneData,
        zoneOperationGroups
    );

    const hasValidMainPipeData = results?.hasValidMainPipe ?? false;
    const hasValidSubmainPipeData = results?.hasValidSecondaryPipe ?? false;

    const [showQuotationModal, setShowQuotationModal] = useState(false);
    const [showQuotation, setShowQuotation] = useState(false);
    const [quotationData, setQuotationData] = useState<QuotationData>({
        yourReference: '',
        quotationDate: new Date().toLocaleString('th-TH'),
        salesperson: '',
        paymentTerms: '0',
    });
    const [quotationDataCustomer, setQuotationDataCustomer] = useState<QuotationDataCustomer>({
        name: '',
        projectName: '',
        address: '',
        phone: '',
    });

    const handleInputChange = (input: IrrigationInput) => {
        if (activeZoneId) {
            setZoneInputs((prev) => ({
                ...prev,
                [activeZoneId]: input,
            }));
        }
    };

    const handleQuotationModalConfirm = () => {
        setShowQuotationModal(false);
        setShowQuotation(true);
    };

    const getEffectiveEquipment = () => {
        const currentZonePipes = selectedPipes[activeZoneId] || {};

        return {
            branchPipe: currentZonePipes.branch || results?.autoSelectedBranchPipe,
            secondaryPipe: currentZonePipes.secondary || results?.autoSelectedSecondaryPipe,
            mainPipe: currentZonePipes.main || results?.autoSelectedMainPipe,
            pump: selectedPump || results?.autoSelectedPump,
        };
    };

    const getZonesData = () => {
        if (projectMode === 'garden' && gardenStats) {
            return gardenStats.zones.map((z) => ({
                id: z.zoneId,
                name: z.zoneName,
                area: z.area,
                plantCount: z.sprinklerCount,
                totalWaterNeed: z.sprinklerCount * 50,
                plantData: null,
            }));
        }
        if (projectMode === 'field-crop' && fieldCropData) {
            return fieldCropData.zones.info.map((z) => {
                // Calculate planting points for this zone
                const assignedCropValue = fieldCropData.crops.zoneAssignments[z.id];
                const crop = assignedCropValue ? getCropByValue(assignedCropValue) : null;
                
                let plantCount = 100; // default
                let totalWaterNeed = 5000; // default
                
                if (crop) {
                    const rowSpacing = fieldCropData.crops.spacing.rowSpacing[assignedCropValue] || (crop.rowSpacing / 100);
                    const plantSpacing = fieldCropData.crops.spacing.plantSpacing[assignedCropValue] || (crop.plantSpacing / 100);
                    
                    if (rowSpacing > 0 && plantSpacing > 0) {
                        const plantsPerSqm = (1 / rowSpacing) * (1 / plantSpacing);
                        plantCount = Math.floor(z.area * plantsPerSqm);
                    }
                    
                    if (crop.waterRequirement) {
                        totalWaterNeed = plantCount * crop.waterRequirement;
                    }
                }
                
                return {
                    id: z.id,
                    name: z.name,
                    area: z.area,
                    plantCount: plantCount,
                    totalWaterNeed: totalWaterNeed,
                    plantData: crop ? {
                        name: crop.name,
                        waterNeed: crop.waterRequirement || 50,
                        category: crop.category,
                    } : null,
                };
            });
        }
        if (projectMode === 'greenhouse' && greenhouseData) {
            return greenhouseData.summary.plotStats.map((p) => {
                // Get crop data for this plot
                const crop = getCropByValue(p.cropType || '');
                
                return {
                    id: p.plotId,
                    name: p.plotName,
                    area: p.area,
                    plantCount: p.production.totalPlants,
                    totalWaterNeed: p.production.waterRequirementPerIrrigation,
                    plantData: crop ? {
                        name: crop.name,
                        waterNeed: crop.waterRequirement || 50,
                        category: crop.category,
                    } : null,
                };
            });
        }
        return projectData?.zones || [];
    };

    const getZoneNameForSummary = (zoneId: string): string => {
        if (projectMode === 'garden' && gardenStats) {
            const zone = gardenStats.zones.find((z) => z.zoneId === zoneId);
            return zone?.zoneName || zoneId;
        }
        if (projectMode === 'field-crop' && fieldCropData) {
            const zone = fieldCropData.zones.info.find((z) => z.id === zoneId);
            return zone?.name || zoneId;
        }
        if (projectMode === 'greenhouse' && greenhouseData) {
            const plot = greenhouseData.summary.plotStats.find((p) => p.plotId === zoneId);
            return plot?.plotName || zoneId;
        }
        const zone = projectData?.zones.find((z) => z.id === zoneId);
        return zone?.name || zoneId;
    };

    const getActiveZone = () => {
        if (projectMode === 'garden' && gardenStats) {
            const zone = gardenStats.zones.find((z) => z.zoneId === activeZoneId);
            if (zone) {
                return {
                    id: zone.zoneId,
                    name: zone.zoneName,
                    area: zone.area,
                    plantCount: zone.sprinklerCount,
                    totalWaterNeed: zone.sprinklerCount * 50,
                    plantData: null,
                } as any;
            }
        }
        if (projectMode === 'field-crop' && fieldCropData) {
            const zone = fieldCropData.zones.info.find((z) => z.id === activeZoneId);
            if (zone) {
                // Calculate planting points for this zone
                const assignedCropValue = fieldCropData.crops.zoneAssignments[zone.id];
                const crop = assignedCropValue ? getCropByValue(assignedCropValue) : null;
                
                let plantCount = 100; // default
                let totalWaterNeed = 5000; // default
                
                if (crop) {
                    const rowSpacing = fieldCropData.crops.spacing.rowSpacing[assignedCropValue] || (crop.rowSpacing / 100);
                    const plantSpacing = fieldCropData.crops.spacing.plantSpacing[assignedCropValue] || (crop.plantSpacing / 100);
                    
                    if (rowSpacing > 0 && plantSpacing > 0) {
                        const plantsPerSqm = (1 / rowSpacing) * (1 / plantSpacing);
                        plantCount = Math.floor(zone.area * plantsPerSqm);
                    }
                    
                    if (crop.waterRequirement) {
                        totalWaterNeed = plantCount * crop.waterRequirement;
                    }
                }
                
                return {
                    id: zone.id,
                    name: zone.name,
                    area: zone.area,
                    plantCount: plantCount,
                    totalWaterNeed: totalWaterNeed,
                    plantData: crop ? {
                        name: crop.name,
                        waterNeed: crop.waterRequirement || 50,
                        category: crop.category,
                    } : null,
                } as any;
            }
        }
        if (projectMode === 'greenhouse' && greenhouseData) {
            const plot = greenhouseData.summary.plotStats.find((p) => p.plotId === activeZoneId);
            if (plot) {
                // Get crop data for this plot
                const crop = getCropByValue(plot.cropType || '');
                
                return {
                    id: plot.plotId,
                    name: plot.plotName,
                    area: plot.area,
                    plantCount: plot.production.totalPlants,
                    totalWaterNeed: plot.production.waterRequirementPerIrrigation,
                    plantData: crop ? {
                        name: crop.name,
                        waterNeed: crop.waterRequirement || 50,
                        category: crop.category,
                    } : null,
                } as any;
            }
        }
        return projectData?.zones.find((z) => z.id === activeZoneId);
    };

    const hasEssentialData =
        (projectMode === 'horticulture' && projectData && projectStats) ||
        (projectMode === 'garden' && gardenData && gardenStats) ||
        (projectMode === 'field-crop' && fieldCropData) ||
        (projectMode === 'greenhouse' && greenhouseData);

    if (!hasEssentialData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 p-6 text-white">
                <div className="text-center">
                    <div className="mb-6 text-6xl">
                        {projectMode === 'garden' ? '🏡' : 
                         projectMode === 'field-crop' ? '🌾' : 
                         projectMode === 'greenhouse' ? '🏠' : '🌱'}
                    </div>
                    <h1 className="mb-4 text-2xl font-bold text-blue-400">
                        {projectMode === 'garden'
                            ? 'Chaiyo Irrigation System'
                            : projectMode === 'field-crop'
                            ? 'Chaiyo Field Crop Irrigation'
                            : projectMode === 'greenhouse'
                            ? 'Chaiyo Greenhouse Irrigation'
                            : 'Chaiyo Irrigation System'}
                    </h1>
                    <p className="mb-6 text-gray-300">ไม่พบข้อมูลโครงการ</p>
                    <button
                        onClick={() =>
                            router.visit(
                                projectMode === 'garden'
                                    ? '/home-garden-planner'
                                    : projectMode === 'field-crop'
                                    ? '/field-map'
                                    : projectMode === 'greenhouse'
                                    ? '/greenhouse-crop'
                                    : '/horticulture/planner'
                            )
                        }
                        className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                    >
                        📐 ไปหน้าวางแผน
                    </button>
                </div>
            </div>
        );
    }

    if (!results || !currentInput) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 p-6 text-white">
                <div className="text-center">
                    <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-400"></div>
                    <p className="text-gray-300">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    const effectiveEquipment = getEffectiveEquipment();
    const zones = getZonesData();
    const activeZone = getActiveZone();

    const extraPipeInput = zoneInputs[activeZoneId]?.extraPipePerSprinkler;
    let selectedExtraPipe: any = null;
    if (extraPipeInput && extraPipeInput.pipeId && extraPipeInput.lengthPerHead > 0) {
        let pipe: any = null;
        const pipes = selectedPipes[activeZoneId] || {};
        if (pipes.branch && pipes.branch.id === extraPipeInput.pipeId) pipe = pipes.branch;
        if (pipes.secondary && pipes.secondary.id === extraPipeInput.pipeId) pipe = pipes.secondary;
        if (pipes.main && pipes.main.id === extraPipeInput.pipeId) pipe = pipes.main;
        if (!pipe && results) {
            if (
                results.autoSelectedBranchPipe &&
                results.autoSelectedBranchPipe.id === extraPipeInput.pipeId
            )
                pipe = results.autoSelectedBranchPipe;
            if (
                results.autoSelectedSecondaryPipe &&
                results.autoSelectedSecondaryPipe.id === extraPipeInput.pipeId
            )
                pipe = results.autoSelectedSecondaryPipe;
            if (
                results.autoSelectedMainPipe &&
                results.autoSelectedMainPipe.id === extraPipeInput.pipeId
            )
                pipe = results.autoSelectedMainPipe;
        }
        if (pipe) {
            selectedExtraPipe = {
                pipe,
                lengthPerHead: extraPipeInput.lengthPerHead,
                totalLength: (results?.totalSprinklers || 0) * extraPipeInput.lengthPerHead,
            };
        }
    }

    const handleOpenQuotationModal = () => {
        if (projectData) {
            setQuotationDataCustomer((prev) => ({
                ...prev,
                projectName: projectData.projectName || prev.projectName,
                name: projectData.customerName || prev.name,
            }));
        }
        setShowQuotationModal(true);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="border-b border-gray-700 bg-gray-800 p-4">
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img
                            src="https://f.btwcdn.com/store-50036/store/e4c1b5ae-cf8e-5017-536b-66ecd994018d.jpg"
                            alt="logo"
                            className="h-12 w-12 rounded-lg"
                        />
                        <div>
                            <h1 className="text-xl font-bold text-blue-400">
                                {projectMode === 'garden'
                                    ? '🏡 Chaiyo Irrigation System'
                                    : projectMode === 'field-crop'
                                    ? '🌾 Chaiyo Field Crop Irrigation'
                                    : projectMode === 'greenhouse'
                                    ? '🏠 Chaiyo Greenhouse Irrigation'
                                    : '🌱 Chaiyo Irrigation System'}
                            </h1>
                            <p className="text-sm text-gray-400">กนกโปรดักส์</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />
                        <button
                            onClick={() => setShowFloatingAiChat(true)}
                            className="rounded-lg bg-gradient-to-r from-green-500 to-blue-500 px-4 py-2 text-sm font-medium transition-all hover:from-green-600 hover:to-blue-600"
                        >
                            🤖 AI ช่วยเหลือ
                        </button>
                        <button
                            onClick={() => (window.location.href = '/equipment-crud')}
                            className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-700"
                        >
                            ⚙️ จัดการอุปกรณ์
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-8xl mx-auto p-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <div className="sticky top-6">
                            <div className="rounded-lg bg-gray-800 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-blue-400">
                                        📐 แผนผัง
                                    </h2>
                                </div>

                                {projectImage ? (
                                    <div
                                        className="group relative flex items-center justify-center"
                                        style={{ minHeight: 0 }}
                                    >
                                        <img
                                            src={projectImage}
                                            alt={`${
                                                projectMode === 'garden' ? 'สวนบ้าน' : 
                                                projectMode === 'field-crop' ? 'พืชไร่' : 
                                                projectMode === 'greenhouse' ? 'โรงเรือน' : 'พืชสวน'
                                            } Project`}
                                            className="aspect-video max-h-[500px] w-full cursor-pointer rounded-lg object-contain transition-transform hover:scale-105"
                                            style={{ maxHeight: '500px', minHeight: '300px' }}
                                            onClick={() => setShowImageModal(true)}
                                        />
                                        <div className="absolute right-2 top-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                            <label className="cursor-pointer rounded-full bg-blue-600 p-2 text-sm hover:bg-blue-700">
                                                📷
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    className="hidden"
                                                />
                                            </label>
                                            <button
                                                onClick={handleImageDelete}
                                                className="rounded-full bg-red-600 p-2 text-sm hover:bg-red-700"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex h-[280px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-600 hover:border-blue-500">
                                        <div className="text-4xl text-gray-500">📷</div>
                                        <p className="mt-2 text-sm text-gray-400">
                                            {projectMode === 'garden'
                                                ? 'เพิ่มรูปแผนผังสวนบ้าน'
                                                : projectMode === 'field-crop'
                                                ? 'เพิ่มรูปแผนผังพืชไร่'
                                                : projectMode === 'greenhouse'
                                                ? 'เพิ่มรูปแผนผังโรงเรือน'
                                                : 'เพิ่มรูปแผนผังพืชสวน'}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {projectMode === 'garden'
                                                ? 'หรือส่งออกจากหน้าสรุปผลสวนบ้าน'
                                                : projectMode === 'field-crop'
                                                ? 'หรือส่งออกจากหน้าสรุปผลพืชไร่'
                                                : projectMode === 'greenhouse'
                                                ? 'หรือส่งออกจากหน้าสรุปผลโรงเรือน'
                                                : 'หรือส่งออกจากหน้าสรุปผลพืชสวน'}
                                        </p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 lg:col-span-8">
                        {zones.length > 1 && (
                            <div className="mb-6 rounded-lg bg-gray-800 p-4">
                                <h3 className="mb-3 text-lg font-semibold text-yellow-400">
                                    🏗️ การเปิดโซนสำหรับการทำงาน
                                </h3>

                                <div className="mb-4 rounded bg-blue-900 p-3">
                                    <h4 className="mb-2 text-sm font-medium text-blue-300">
                                        🎯 เลือกรูปแบบการเปิดโซน:
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                        <label className="flex cursor-pointer items-center gap-2 rounded bg-blue-800 p-3 hover:bg-blue-700">
                                            <input
                                                type="radio"
                                                name="zoneOperation"
                                                value="sequential"
                                                checked={zoneOperationMode === 'sequential'}
                                                onChange={() =>
                                                    handleZoneOperationModeChange('sequential')
                                                }
                                                className="rounded"
                                            />
                                            <div>
                                                <p className="font-medium">เปิดทีละโซน</p>
                                                <p className="text-xs text-blue-200">
                                                    ปั๊มขนาดเล็ก ประหยัดพลังงาน
                                                </p>
                                            </div>
                                        </label>
                                        <label className="flex cursor-pointer items-center gap-2 rounded bg-blue-800 p-3 hover:bg-blue-700">
                                            <input
                                                type="radio"
                                                name="zoneOperation"
                                                value="simultaneous"
                                                checked={zoneOperationMode === 'simultaneous'}
                                                onChange={() =>
                                                    handleZoneOperationModeChange('simultaneous')
                                                }
                                                className="rounded"
                                            />
                                            <div>
                                                <p className="font-medium">เปิดพร้อมกันทุกโซน</p>
                                                <p className="text-xs text-blue-200">
                                                    ปั๊มขนาดใหญ่ รดน้ำเร็ว
                                                </p>
                                            </div>
                                        </label>
                                        <label className="flex cursor-pointer items-center gap-2 rounded bg-blue-800 p-3 hover:bg-blue-700">
                                            <input
                                                type="radio"
                                                name="zoneOperation"
                                                value="custom"
                                                checked={zoneOperationMode === 'custom'}
                                                onChange={() =>
                                                    handleZoneOperationModeChange('custom')
                                                }
                                                className="rounded"
                                            />
                                            <div>
                                                <p className="font-medium">กำหนดเอง</p>
                                                <p className="text-xs text-blue-200">
                                                    จัดกลุ่มโซนตามต้องการ
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {zoneOperationMode === 'custom' && (
                                    <div className="mt-4 rounded bg-purple-900 p-3">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-purple-300">
                                                📋 จัดการกลุ่มการเปิดโซน:
                                            </h4>
                                            <button
                                                onClick={addOperationGroup}
                                                className="rounded bg-purple-600 px-3 py-1 text-xs hover:bg-purple-700"
                                            >
                                                + เพิ่มกลุ่ม
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {zoneOperationGroups.map((group) => (
                                                <div
                                                    key={group.id}
                                                    className="rounded bg-purple-800 p-2"
                                                >
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <p className="text-sm font-medium text-purple-200">
                                                            {group.label} (ลำดับที่ {group.order})
                                                            {group.zones.length === 0 && (
                                                                <span className="ml-2 text-red-300">
                                                                    (ไม่มีโซน)
                                                                </span>
                                                            )}
                                                        </p>
                                                        {zoneOperationGroups.length > 1 && (
                                                            <button
                                                                onClick={() =>
                                                                    removeOperationGroup(group.id)
                                                                }
                                                                className="text-xs text-red-400 hover:text-red-300"
                                                            >
                                                                ลบ
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                                        {zones.map((zone) => (
                                                            <label
                                                                key={zone.id}
                                                                className="flex cursor-pointer items-center gap-1 text-xs"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={group.zones.includes(
                                                                        zone.id
                                                                    )}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            const otherGroups =
                                                                                zoneOperationGroups.filter(
                                                                                    (g) =>
                                                                                        g.id !==
                                                                                        group.id
                                                                                );
                                                                            otherGroups.forEach(
                                                                                (g) => {
                                                                                    updateOperationGroup(
                                                                                        g.id,
                                                                                        g.zones.filter(
                                                                                            (z) =>
                                                                                                z !==
                                                                                                zone.id
                                                                                        )
                                                                                    );
                                                                                }
                                                                            );
                                                                            updateOperationGroup(
                                                                                group.id,
                                                                                [
                                                                                    ...group.zones,
                                                                                    zone.id,
                                                                                ]
                                                                            );
                                                                        } else {
                                                                            updateOperationGroup(
                                                                                group.id,
                                                                                group.zones.filter(
                                                                                    (z) =>
                                                                                        z !==
                                                                                        zone.id
                                                                                )
                                                                            );
                                                                        }
                                                                    }}
                                                                    className="rounded"
                                                                />
                                                                <span>{zone.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-2 text-xs text-purple-200">
                                            💡 โซนที่อยู่ในกลุ่มเดียวกันจะเปิดพร้อมกัน
                                        </div>
                                    </div>
                                )}

                                <div className="mt-4 rounded bg-yellow-800 p-3">
                                    <h4 className="mb-2 text-sm font-medium text-yellow-300">
                                        📊 สรุปการเปิดโซน:
                                    </h4>
                                    <div className="space-y-1 text-xs text-yellow-200">
                                        {zoneOperationGroups.map((group) => (
                                            <p key={group.id}>
                                                • ลำดับที่ {group.order}:{' '}
                                                {group.zones
                                                    .map((zoneId) => getZoneName(zoneId))
                                                    .join(', ')}
                                                {group.zones.length > 1 && ' (เปิดพร้อมกัน)'}
                                            </p>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-xs text-yellow-300">
                                        ⚡ ปั๊มจะคำนวณจากกลุ่มที่ต้องการ Head สูงสุด
                                    </p>
                                </div>
                            </div>
                        )}

                        {zones.length > 1 && (
                            <div className="mb-6 flex flex-wrap gap-2">
                                {zones.map((zone) => {
                                    const isActive = activeZoneId === zone.id;
                                    const hasSprinkler = !!zoneSprinklers[zone.id];

                                    return (
                                        <button
                                            key={zone.id}
                                            onClick={() => setActiveZoneId(zone.id)}
                                            className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                                isActive
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>{zone.name}</span>
                                                {hasSprinkler && (
                                                    <span className="text-xs text-green-400">
                                                        ✓
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs opacity-75">
                                                {zone.area >= 1600 ? (
                                                    <p>{(zone.area / 1600).toFixed(1)} ไร่</p>
                                                ) : (
                                                    <p>{zone.area.toFixed(2)} ตร.ม.</p>
                                                )}
                                                {zone.plantCount}
                                                {projectMode === 'garden' ? 'หัวฉีด' : 
                                                 projectMode === 'field-crop' ? 'ต้น' : 
                                                 projectMode === 'greenhouse' ? 'ต้น' : 'ต้น'}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {(projectMode === 'garden' || projectMode === 'field-crop' || projectMode === 'greenhouse') && (
                            <div className="mb-6 rounded-lg bg-gray-800 p-4">
                                <h3 className="mb-3 text-lg font-semibold text-purple-400">
                                    ⚡ ตัวเลือกปั๊มน้ำ
                                </h3>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={showPumpOption}
                                            onChange={(e) => setShowPumpOption(e.target.checked)}
                                            className="rounded"
                                        />
                                        <span className="text-sm font-medium">
                                            ต้องการใช้ปั๊มน้ำในระบบ
                                        </span>
                                    </label>
                                    {!showPumpOption && (
                                        <p className="text-sm text-gray-400">
                                            (ใช้แรงดันจากระบบประปาบ้าน)
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <InputForm
                            input={currentInput}
                            onInputChange={handleInputChange}
                            selectedSprinkler={currentSprinkler}
                            activeZone={activeZone}
                            projectMode={projectMode === 'greenhouse' ? undefined : projectMode}
                        />

                        <div className="mb-6 rounded-lg bg-yellow-800 p-4">
                            <div className="flex items-center gap-2 text-yellow-200">
                                <span className="text-2xl">⚡</span>
                                <div>
                                    <p className="font-medium">เลือกสปริงเกอร์ก่อน</p>
                                    <p className="text-sm">ระบบจะเลือกอุปกรณ์อื่นให้อัตโนมัติ</p>
                                    {zones.length > 1 && (
                                        <p className="mt-1 text-xs text-yellow-300">
                                            💡 เลือกสปริงเกอร์สำหรับโซน{' '}
                                            {zones.find((z) => z.id === activeZoneId)?.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <SprinklerSelector
                            selectedSprinkler={currentSprinkler}
                            onSprinklerChange={handleSprinklerChange}
                            results={results}
                            activeZone={activeZone}
                            allZoneSprinklers={zoneSprinklers}
                            projectMode={projectMode}
                        />

                        {currentSprinkler && (
                            <>
                                <CalculationSummary
                                    results={results}
                                    input={currentInput}
                                    selectedSprinkler={currentSprinkler}
                                    selectedPump={effectiveEquipment.pump}
                                    selectedBranchPipe={effectiveEquipment.branchPipe}
                                    selectedSecondaryPipe={effectiveEquipment.secondaryPipe}
                                    selectedMainPipe={effectiveEquipment.mainPipe}
                                    activeZone={activeZone}
                                    selectedZones={zones.map((z) => z.id)}
                                    allZoneSprinklers={zoneSprinklers}
                                    projectMode={projectMode}
                                    showPump={projectMode === 'horticulture' || showPumpOption}
                                    simultaneousZonesCount={
                                        zoneOperationMode === 'simultaneous'
                                            ? zones.length
                                            : zoneOperationMode === 'custom'
                                              ? Math.max(
                                                    ...zoneOperationGroups.map(
                                                        (g) => g.zones.length
                                                    )
                                                )
                                              : 1
                                    }
                                    zoneOperationGroups={zoneOperationGroups}
                                    getZoneName={getZoneNameForSummary}
                                />

                                <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <PipeSelector
                                        pipeType="branch"
                                        results={results}
                                        input={currentInput}
                                        selectedPipe={effectiveEquipment.branchPipe}
                                        onPipeChange={(pipe) => handlePipeChange('branch', pipe)}
                                    />

                                    {hasValidSubmainPipeData ? (
                                        <PipeSelector
                                            pipeType="secondary"
                                            results={results}
                                            input={currentInput}
                                            selectedPipe={effectiveEquipment.secondaryPipe}
                                            onPipeChange={(pipe) =>
                                                handlePipeChange('secondary', pipe)
                                            }
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center rounded-lg bg-gray-800 p-8">
                                            <div className="text-center text-gray-500">
                                                <div className="mb-2 text-4xl">➖</div>
                                                <p>ไม่ใช้ท่อรอง</p>
                                            </div>
                                        </div>
                                    )}

                                    {hasValidMainPipeData && (
                                        <div className="md:col-span-2">
                                            <PipeSelector
                                                pipeType="main"
                                                results={results}
                                                input={currentInput}
                                                selectedPipe={effectiveEquipment.mainPipe}
                                                onPipeChange={(pipe) =>
                                                    handlePipeChange('main', pipe)
                                                }
                                            />
                                        </div>
                                    )}
                                </div>

                                {(projectMode === 'horticulture' || showPumpOption) && (
                                    <PumpSelector
                                        results={results}
                                        selectedPump={effectiveEquipment.pump}
                                        onPumpChange={handlePumpChange}
                                        zoneOperationGroups={zoneOperationGroups}
                                        zoneInputs={zoneInputs}
                                        simultaneousZonesCount={
                                            zoneOperationMode === 'simultaneous'
                                                ? zones.length
                                                : zoneOperationMode === 'custom'
                                                  ? Math.max(
                                                        ...zoneOperationGroups.map(
                                                            (g) => g.zones.length
                                                        )
                                                    )
                                                  : 1
                                        }
                                        selectedZones={zones.map((z) => z.id)}
                                    />
                                )}

                                <CostSummary
                                    results={results}
                                    zoneSprinklers={zoneSprinklers}
                                    selectedPipes={selectedPipes}
                                    selectedPump={effectiveEquipment.pump}
                                    activeZoneId={activeZoneId}
                                    projectData={projectData}
                                    gardenData={gardenData}
                                    gardenStats={gardenStats}
                                    zoneInputs={zoneInputs}
                                    onQuotationClick={handleOpenQuotationModal}
                                    projectMode={projectMode}
                                    showPump={projectMode === 'horticulture' || showPumpOption}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showImageModal && projectImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
                    onClick={() => setShowImageModal(false)}
                >
                    <div
                        className="relative max-h-[90vh] max-w-[90vw]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowImageModal(false)}
                            className="absolute -right-4 -top-4 rounded-full bg-red-600 p-2 text-white hover:bg-red-700"
                        >
                            ×
                        </button>
                        <div className="relative flex h-[90vh] w-[90vw] items-center justify-center">
                            <img
                                src={projectImage}
                                alt={`${
                                    projectMode === 'garden' ? 'สวนบ้าน' : 
                                    projectMode === 'field-crop' ? 'พืชไร่' : 
                                    projectMode === 'greenhouse' ? 'โรงเรือน' : 'พืชสวน'
                                } Project`}
                                className="max-h-full max-w-full rounded-lg"
                            />
                            {/* แสดงข้อมูลประเภทของโปรเจคใน Modal */}
                            <div className="absolute left-4 top-4">
                                <div
                                    className={`rounded-lg px-3 py-1 text-sm font-medium ${
                                        projectMode === 'garden'
                                            ? 'bg-green-600 text-white'
                                            : projectMode === 'field-crop'
                                            ? 'bg-yellow-600 text-white'
                                            : projectMode === 'greenhouse'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-orange-600 text-white'
                                    }`}
                                >
                                    {projectMode === 'garden' ? '🏡 สวนบ้าน' : 
                                     projectMode === 'field-crop' ? '🌾 พืชไร่' : 
                                     projectMode === 'greenhouse' ? '🏠 โรงเรือน' : '🌱 พืชสวน'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <FloatingAiChat
                isOpen={showFloatingAiChat}
                onClose={() => setShowFloatingAiChat(false)}
                onMinimize={() => setIsAiChatMinimized(!isAiChatMinimized)}
                isMinimized={isAiChatMinimized}
            />

            <QuotationModal
                show={showQuotationModal}
                quotationData={quotationData}
                quotationDataCustomer={quotationDataCustomer}
                onQuotationDataChange={setQuotationData}
                onQuotationDataCustomerChange={setQuotationDataCustomer}
                onClose={() => setShowQuotationModal(false)}
                onConfirm={handleQuotationModalConfirm}
            />

            <QuotationDocument
                show={showQuotation}
                results={results}
                quotationData={quotationData}
                quotationDataCustomer={quotationDataCustomer}
                selectedSprinkler={currentSprinkler}
                selectedPump={effectiveEquipment.pump}
                selectedBranchPipe={effectiveEquipment.branchPipe}
                selectedSecondaryPipe={effectiveEquipment.secondaryPipe}
                selectedMainPipe={effectiveEquipment.mainPipe}
                selectedExtraPipe={selectedExtraPipe}
                projectImage={projectImage}
                projectData={projectData}
                gardenData={gardenData}
                zoneSprinklers={zoneSprinklers}
                selectedPipes={selectedPipes}
                onClose={() => setShowQuotation(false)}
                projectMode={projectMode}
                showPump={projectMode === 'horticulture' || showPumpOption}
            />
        </div>
    );
}
