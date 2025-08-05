// resources/js/pages/product.tsx
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from 'react';
import { IrrigationInput, QuotationData, QuotationDataCustomer } from './types/interfaces';
import { useCalculations, ZoneCalculationData } from './hooks/useCalculations';
import { calculatePipeRolls, formatNumber } from './utils/calculations';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';

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

import {
    getEnhancedFieldCropData,
    migrateToEnhancedFieldCropData,
    FieldCropData,
    calculateEnhancedFieldStats,
} from '../utils/fieldCropData';

import {
    getGreenhouseData,
    migrateLegacyGreenhouseData,
    GreenhousePlanningData,
    PlotStats,
    PIXELS_PER_METER,
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

import { router } from '@inertiajs/react';

type ProjectMode = 'horticulture' | 'garden' | 'field-crop' | 'greenhouse';

interface ZoneOperationGroup {
    id: string;
    zones: string[];
    order: number;
    label: string;
}

const getStoredProjectImage = (projectMode: ProjectMode): string | null => {
    const imageKeys = ['projectMapImage', `${projectMode}PlanImage`, 'mapCaptureImage'];

    if (projectMode === 'field-crop') {
        imageKeys.push('fieldCropPlanImage');
    } else if (projectMode === 'garden') {
        imageKeys.push('gardenPlanImage', 'homeGardenPlanImage');
    } else if (projectMode === 'greenhouse') {
        imageKeys.push('greenhousePlanImage');
    } else if (projectMode === 'horticulture') {
        imageKeys.push('horticulturePlanImage');
    }

    for (const key of imageKeys) {
        const image = localStorage.getItem(key);
        if (image && image.startsWith('data:image/')) {
            console.log(`✅ Found project image with key: ${key}`);

            try {
                const metadata = localStorage.getItem('projectMapMetadata');
                if (metadata) {
                    const parsedMetadata = JSON.parse(metadata);
                    console.log(`📊 Image metadata:`, parsedMetadata);
                }
            } catch (error) {
                console.warn('⚠️ Could not parse image metadata:', error);
            }

            return image;
        }
    }

    console.warn(`⚠️ No project image found for mode: ${projectMode}`);
    return null;
};

const validateImageData = (imageData: string): boolean => {
    if (!imageData || !imageData.startsWith('data:image/')) {
        return false;
    }

    if (imageData.length < 1000) {
        console.warn('⚠️ Image data appears to be too small');
        return false;
    }

    return true;
};

const cleanupOldImages = (): void => {
    const imageKeys = [
        'projectMapImage',
        'fieldCropPlanImage',
        'gardenPlanImage',
        'homeGardenPlanImage',
        'greenhousePlanImage',
        'horticulturePlanImage',
        'mapCaptureImage',
    ];

    let cleanedCount = 0;
    imageKeys.forEach((key) => {
        const image = localStorage.getItem(key);
        if (image && image.startsWith('blob:')) {
            URL.revokeObjectURL(image);
            localStorage.removeItem(key);
            cleanedCount++;
        }
    });

    if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old image references`);
    }
};

export default function Product() {
    const [projectMode, setProjectMode] = useState<ProjectMode>('horticulture');
    const [gardenData, setGardenData] = useState<GardenPlannerData | null>(null);
    const [gardenStats, setGardenStats] = useState<GardenStatistics | null>(null);

    const [fieldCropData, setFieldCropData] = useState<FieldCropData | null>(null);

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
    const [imageLoading, setImageLoading] = useState<boolean>(false);
    const [imageLoadError, setImageLoadError] = useState<string | null>(null);
    const [showImageModal, setShowImageModal] = useState(false);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageLoading(true);
            setImageLoadError(null);

            const reader = new FileReader();
            reader.onload = (event) => {
                const imageData = event.target?.result as string;
                if (validateImageData(imageData)) {
                    setProjectImage(imageData);

                    const saveKeys = [
                        'projectMapImage',
                        `${projectMode}PlanImage`,
                        'userUploadedImage',
                    ];

                    saveKeys.forEach((key) => {
                        try {
                            localStorage.setItem(key, imageData);
                        } catch (error) {
                            console.warn(`Failed to save uploaded image with key ${key}:`, error);
                        }
                    });

                    console.log('✅ User uploaded image saved successfully');
                } else {
                    setImageLoadError('Invalid image format');
                }
                setImageLoading(false);
            };

            reader.onerror = () => {
                setImageLoadError('Failed to read image file');
                setImageLoading(false);
            };

            reader.readAsDataURL(file);
        }
    };

    const handleImageDelete = () => {
        if (projectImage && projectImage.startsWith('blob:')) {
            URL.revokeObjectURL(projectImage);
        }

        const keysToRemove = [
            'projectMapImage',
            `${projectMode}PlanImage`,
            'userUploadedImage',
            'mapCaptureImage',
        ];

        keysToRemove.forEach((key) => {
            localStorage.removeItem(key);
        });

        setProjectImage(null);
        setImageLoadError(null);
        console.log('🗑️ Project image deleted');
    };

    useEffect(() => {
        return () => {
            if (projectImage && projectImage.startsWith('blob:')) {
                URL.revokeObjectURL(projectImage);
            }
            cleanupOldImages();
        };
    }, [projectImage]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode') as ProjectMode;
        if (mode) {
            setProjectMode(mode);
        }
    }, []);

    useEffect(() => {
        if (!projectMode) return;

        setImageLoading(true);
        setImageLoadError(null);
        cleanupOldImages();
        const image = getStoredProjectImage(projectMode);

        if (image && validateImageData(image)) {
            setProjectImage(image);
            console.log(`✅ Successfully loaded project image for ${projectMode} mode`);
        } else {
            console.log(`ℹ️ No valid project image found for ${projectMode} mode`);
            setProjectImage(null);
            const modeNames = {
                'field-crop': 'Field Crop Summary',
                garden: 'Garden Planner',
                greenhouse: 'Greenhouse Planner',
                horticulture: 'Horticulture Planner',
            };

            setImageLoadError(
                `No map image found. Please capture one from ${modeNames[projectMode]} page.`
            );
        }

        setImageLoading(false);
    }, [projectMode]);

    useEffect(() => {
        if (projectImage && projectMode) {
            const isValid = validateImageData(projectImage);
            if (!isValid) {
                console.warn('⚠️ Current project image is invalid, attempting to reload...');
                setProjectImage(null);
                const validImage = getStoredProjectImage(projectMode);
                if (validImage && validateImageData(validImage)) {
                    setProjectImage(validImage);
                    setImageLoadError(null);
                } else {
                    setImageLoadError('Invalid or corrupted image data');
                }
            }
        }
    }, [projectImage, projectMode]);

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

    // แก้ใน product.tsx ประมาณบรรทัด 191-220
    const createGreenhouseZoneInput = (
        plot: PlotStats,
        greenhouseData: GreenhousePlanningData,
        totalZones: number
    ): IrrigationInput => {
        const areaInSqm = plot.area;
        // Fix: Convert square meters to rai for consistency
        const areaInRai = areaInSqm / 1600;
        const crop = getCropByValue(plot.cropType || '');
        const totalSprinklers = plot.equipmentCount.sprinklers || plot.production.totalPlants;

        const waterPerSprinkler =
            plot.production.waterRequirementPerIrrigation / Math.max(totalSprinklers, 1);

        const longestBranch = plot.pipeStats.drip.longest || plot.pipeStats.sub.longest || 30;
        const totalBranchLength =
            plot.pipeStats.drip.totalLength || plot.pipeStats.sub.totalLength || 100;
        const longestSubmain = plot.pipeStats.main.longest || 0;
        const totalSubmainLength = plot.pipeStats.main.totalLength || 0;

        return {
            farmSizeRai: formatNumber(areaInRai, 3), // Fix: Now consistently in rai
            totalTrees: totalSprinklers,
            waterPerTreeLiters: formatNumber(waterPerSprinkler, 3),
            numberOfZones: totalZones,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerSecondary: 1,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerLongestSecondary: 1,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(longestBranch, 3),
            totalBranchPipeM: formatNumber(totalBranchLength, 3),
            longestSecondaryPipeM: formatNumber(longestSubmain, 3),
            totalSecondaryPipeM: formatNumber(totalSubmainLength, 3),
            longestMainPipeM: 0,
            totalMainPipeM: 0,
        };
    };

    const createSingleGreenhouseInput = (
        greenhouseData: GreenhousePlanningData
    ): IrrigationInput => {
        const areaInSqm = greenhouseData.summary.totalPlotArea;
        // Fix: Convert square meters to rai for consistency
        const areaInRai = areaInSqm / 1600;
        const totalSprinklers =
            greenhouseData.summary.overallEquipmentCount.sprinklers ||
            greenhouseData.summary.overallProduction.totalPlants;

        const waterPerSprinkler =
            greenhouseData.summary.overallProduction.waterRequirementPerIrrigation /
            Math.max(totalSprinklers, 1);

        return {
            farmSizeRai: formatNumber(areaInRai, 3), // Fix: Now consistently in rai
            totalTrees: totalSprinklers,
            waterPerTreeLiters: formatNumber(waterPerSprinkler, 3),
            numberOfZones: 1,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerSecondary: 1,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerLongestSecondary: 1,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(
                greenhouseData.summary.overallPipeStats.drip.longest ||
                    greenhouseData.summary.overallPipeStats.sub.longest ||
                    30,
                3
            ),
            totalBranchPipeM: formatNumber(
                greenhouseData.summary.overallPipeStats.drip.totalLength ||
                    greenhouseData.summary.overallPipeStats.sub.totalLength ||
                    100,
                3
            ),
            longestSecondaryPipeM: formatNumber(
                greenhouseData.summary.overallPipeStats.main.longest || 0,
                3
            ),
            totalSecondaryPipeM: formatNumber(
                greenhouseData.summary.overallPipeStats.main.totalLength || 0,
                3
            ),
            longestMainPipeM: 0,
            totalMainPipeM: 0,
        };
    };

    const createFieldCropZoneInput = (
        zone: FieldCropData['zones']['info'][0],
        fieldData: FieldCropData,
        totalZones: number
    ): IrrigationInput => {
        const areaInRai = zone.area / 1600;
        const assignedCropValue = fieldData.crops.zoneAssignments[zone.id];
        const crop = assignedCropValue ? getCropByValue(assignedCropValue) : null;

        const totalSprinklers =
            zone.sprinklerCount || Math.max(1, Math.ceil(zone.totalPlantingPoints / 10));

        let waterPerSprinklerLPM = 2.0;
        if (crop && crop.waterRequirement) {
            waterPerSprinklerLPM = crop.waterRequirement;
        } else if (zone.totalWaterRequirementPerDay > 0 && totalSprinklers > 0) {
            const avgIrrigationTimeHours = 0.5;
            waterPerSprinklerLPM =
                zone.totalWaterRequirementPerDay / totalSprinklers / (avgIrrigationTimeHours * 60);
        }

        const zonePipeStats = zone.pipeStats;
        const longestBranch = zonePipeStats.lateral.longest || 30;
        const totalBranchLength = zonePipeStats.lateral.totalLength || 100;
        const longestSubmain = zonePipeStats.submain.longest || 0;
        const totalSubmainLength = zonePipeStats.submain.totalLength || 0;
        const longestMain = zonePipeStats.main.longest || 0;
        const totalMainLength = zonePipeStats.main.totalLength || 0;

        return {
            farmSizeRai: formatNumber(areaInRai, 3),
            totalTrees: totalSprinklers,
            waterPerTreeLiters: formatNumber(waterPerSprinklerLPM, 3),
            numberOfZones: totalZones,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerSecondary: 1,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
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

    const createSingleFieldCropInput = (fieldData: FieldCropData): IrrigationInput => {
        const areaInRai = fieldData.area.size / 1600;

        const totalSprinklers =
            fieldData.irrigation.totalCount ||
            fieldData.summary.totalPlantingPoints ||
            Math.max(1, Math.ceil(fieldData.summary.totalPlantingPoints / 10));

        let waterPerSprinklerLPM = 2.0;
        if (fieldData.summary.totalWaterRequirementPerDay > 0 && totalSprinklers > 0) {
            const avgIrrigationTimeHours = 0.5;
            waterPerSprinklerLPM =
                fieldData.summary.totalWaterRequirementPerDay /
                totalSprinklers /
                (avgIrrigationTimeHours * 60);
        }

        return {
            farmSizeRai: formatNumber(areaInRai, 3),
            totalTrees: totalSprinklers,
            waterPerTreeLiters: formatNumber(waterPerSprinklerLPM, 3),
            numberOfZones: 1,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerSecondary: 1,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
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
                    projectMode,
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
                    label: t('เปิดทุกโซนพร้อมกัน'),
                },
            ]);
        }
    };

    const addOperationGroup = () => {
        const newGroup: ZoneOperationGroup = {
            id: `group-${Date.now()}`,
            zones: [],
            order: zoneOperationGroups.length + 1,
            label: t(`กลุ่มที่ ${zoneOperationGroups.length + 1}`),
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
                .map((g, index) => ({
                    ...g,
                    order: index + 1,
                    label: t(`กลุ่มที่ ${index + 1}`),
                }))
        );
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        let mode = urlParams.get('mode') as ProjectMode;
        const storedType = localStorage.getItem('projectType');

        if (!mode && storedType === 'greenhouse') {
            mode = 'greenhouse';
        } else if (!mode && storedType === 'field-crop') {
            mode = 'field-crop';
        } else if (!mode && storedType === 'home-garden') {
            mode = 'garden';
        }

        if (mode === 'greenhouse') {
            setProjectMode('greenhouse');

            let data = getGreenhouseData();

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
                    const plot = data.summary.plotStats[0];
                    const singleInput = createGreenhouseZoneInput(plot, data, 1);
                    setZoneInputs({ [plot.plotId]: singleInput });
                    setSelectedPipes({
                        [plot.plotId]: { branch: undefined, secondary: undefined, main: undefined },
                    });
                    setActiveZoneId(plot.plotId);
                } else {
                    const singleInput = createSingleGreenhouseInput(data);
                    setZoneInputs({ 'main-area': singleInput });
                    setSelectedPipes({
                        'main-area': { branch: undefined, secondary: undefined, main: undefined },
                    });
                    setActiveZoneId('main-area');
                }
            } else {
                console.warn('⚠️ No greenhouse data found');
                router.visit('/greenhouse-crop');
            }
        } else if (mode === 'field-crop') {
            setProjectMode('field-crop');

            let fieldData = getEnhancedFieldCropData();

            if (!fieldData) {
                fieldData = migrateToEnhancedFieldCropData();
            }

            if (fieldData) {
                setFieldCropData(fieldData);

                const initialZoneInputs: { [zoneId: string]: IrrigationInput } = {};
                const initialSelectedPipes: {
                    [zoneId: string]: { branch?: any; secondary?: any; main?: any };
                } = {};

                if (fieldData.zones.info.length > 1) {
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
                    const zone = fieldData.zones.info[0];
                    const singleInput = createFieldCropZoneInput(zone, fieldData, 1);
                    setZoneInputs({ [zone.id]: singleInput });
                    setSelectedPipes({
                        [zone.id]: { branch: undefined, secondary: undefined, main: undefined },
                    });
                    setActiveZoneId(zone.id);
                } else {
                    const singleInput = createSingleFieldCropInput(fieldData);
                    setZoneInputs({ 'main-area': singleInput });
                    setSelectedPipes({
                        'main-area': { branch: undefined, secondary: undefined, main: undefined },
                    });
                    setActiveZoneId('main-area');
                }
            } else {
                console.warn('⚠️ No field crop data found');
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
                const assignedCropValue = fieldCropData.crops.zoneAssignments[z.id];
                const crop = assignedCropValue ? getCropByValue(assignedCropValue) : null;

                return {
                    id: z.id,
                    name: z.name,
                    area: z.area,
                    plantCount:
                        z.sprinklerCount || Math.max(1, Math.ceil(z.totalPlantingPoints / 10)),
                    totalWaterNeed: z.totalWaterRequirementPerDay,
                    plantData: crop
                        ? {
                              name: crop.name,
                              waterNeed: crop.waterRequirement || 50,
                              category: crop.category,
                          }
                        : null,
                };
            });
        }
        if (projectMode === 'greenhouse' && greenhouseData) {
            return greenhouseData.summary.plotStats.map((p) => {
                const crop = getCropByValue(p.cropType || '');

                return {
                    id: p.plotId,
                    name: p.plotName,
                    area: p.area,
                    plantCount: p.production.totalPlants,
                    totalWaterNeed: p.production.waterRequirementPerIrrigation,
                    plantData: crop
                        ? {
                              name: crop.name,
                              waterNeed: crop.waterRequirement || 50,
                              category: crop.category,
                          }
                        : null,
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
                const assignedCropValue = fieldCropData.crops.zoneAssignments[zone.id];
                const crop = assignedCropValue ? getCropByValue(assignedCropValue) : null;

                return {
                    id: zone.id,
                    name: zone.name,
                    area: zone.area,
                    plantCount: zone.totalPlantingPoints,
                    totalWaterNeed: zone.totalWaterRequirementPerDay,
                    plantData: crop
                        ? {
                              name: crop.name,
                              waterNeed: crop.waterRequirement || 50,
                              category: crop.category,
                          }
                        : null,
                } as any;
            }
        }
        if (projectMode === 'greenhouse' && greenhouseData) {
            const plot = greenhouseData.summary.plotStats.find((p) => p.plotId === activeZoneId);
            if (plot) {
                const crop = getCropByValue(plot.cropType || '');

                return {
                    id: plot.plotId,
                    name: plot.plotName,
                    area: plot.area,
                    plantCount: plot.production.totalPlants,
                    totalWaterNeed: plot.production.waterRequirementPerIrrigation,
                    plantData: crop
                        ? {
                              name: crop.name,
                              waterNeed: crop.waterRequirement || 50,
                              category: crop.category,
                          }
                        : null,
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
                        {projectMode === 'garden'
                            ? '🏡'
                            : projectMode === 'field-crop'
                              ? '🌾'
                              : projectMode === 'greenhouse'
                                ? '🏠'
                                : '🌱'}
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
                    <p className="mb-6 text-gray-300">{t('ไม่พบข้อมูลโครงการ')}</p>
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
                        📐 {t('ไปหน้าวางแผน')}
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
                    <p className="text-gray-300">{t('กำลังโหลดข้อมูล...')}</p>
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
            <Navbar />
            <div className="max-w-8xl mx-auto p-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <div className="sticky top-6">
                            <div className="rounded-lg bg-gray-800 p-4 overflow-auto max-h-[90vh]">
                                <div className="mb-3 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-blue-400">
                                        📐 {t('แผนผัง')}
                                    </h2>
                                    {/* Enhanced image status indicator */}
                                    {imageLoading && (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-400"></div>
                                            <span className="text-xs text-blue-400">
                                                Loading...
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {imageLoading ? (
                                    <div className="flex h-[280px] items-center justify-center rounded-lg bg-gray-700">
                                        <div className="text-center">
                                            <div className="mb-2 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-400"></div>
                                            <p className="text-sm text-gray-400">กำลังโหลดภาพ...</p>
                                        </div>
                                    </div>
                                ) : projectImage ? (
                                    <div
                                        className="group relative flex items-center justify-center"
                                        style={{ minHeight: 0 }}
                                    >
                                        <img
                                            src={projectImage}
                                            alt={`${
                                                projectMode === 'garden'
                                                    ? t('สวนบ้าน')
                                                    : projectMode === 'field-crop'
                                                      ? t('พืชไร่')
                                                      : projectMode === 'greenhouse'
                                                        ? t('โรงเรือน')
                                                        : t('พืชสวน')
                                            } Project`}
                                            className="aspect-video max-h-[280px] w-full cursor-pointer rounded-lg object-contain transition-transform hover:scale-105"
                                            style={{ maxHeight: '280px', minHeight: '280px' }}
                                            onClick={() => setShowImageModal(true)}
                                            onError={() => {
                                                console.warn('Failed to load project image');
                                                setImageLoadError('Failed to load image');
                                                setProjectImage(null);
                                            }}
                                        />
                                        <div className="absolute right-2 top-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                            <label className="h-6 w-6 cursor-pointer rounded-full bg-blue-600 text-xs hover:bg-blue-700">
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
                                                className="h-6 w-6 rounded-full bg-red-600 text-xs hover:bg-red-700"
                                                title="Delete image"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border-2 border-dashed border-gray-600">
                                        <label className="flex h-[280px] cursor-pointer flex-col items-center justify-center hover:border-blue-500">
                                            <div className="text-4xl text-gray-500">📷</div>
                                            <p className="mt-2 text-sm text-gray-400">
                                                {projectMode === 'garden'
                                                    ? t('เพิ่มรูปแผนผังสวนบ้าน')
                                                    : projectMode === 'field-crop'
                                                      ? t('เพิ่มรูปแผนผังพืชไร่')
                                                      : projectMode === 'greenhouse'
                                                        ? t('เพิ่มรูปแผนผังโรงเรือน')
                                                        : t('เพิ่มรูปแผนผังพืชสวน')}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {projectMode === 'garden'
                                                    ? t('หรือส่งออกจากหน้าสรุปผลสวนบ้าน')
                                                    : projectMode === 'field-crop'
                                                      ? t('หรือส่งออกจากหน้าสรุปผลพืชไร่')
                                                      : projectMode === 'greenhouse'
                                                        ? t('หรือส่งออกจากหน้าสรุปผลโรงเรือน')
                                                        : t('หรือส่งออกจากหน้าสรุปผลพืชสวน')}
                                            </p>
                                            {imageLoadError && (
                                                <p className="mt-2 text-xs text-red-400">
                                                    {imageLoadError}
                                                </p>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>
                            {zones.length > 1 && (
                                <div className="mb-4 mt-4 flex flex-wrap gap-2">
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
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {zones.length > 1 && (
                                <div className="mb-6 rounded-lg bg-gray-800 p-4">
                                    <div className="mb-4 rounded bg-blue-900 p-3">
                                        <h4 className="mb-2 text-sm font-medium text-blue-300">
                                            🎯 {t('เลือกรูปแบบการเปิดโซน:')}
                                        </h4>
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                            <label className="flex cursor-pointer items-center gap-2 rounded bg-blue-800 p-1 hover:bg-blue-700">
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
                                                    <p className="text-xs font-medium">
                                                        {t('เปิดทีละโซน')}
                                                    </p>
                                                </div>
                                            </label>
                                            <label className="flex cursor-pointer items-center gap-2 rounded bg-blue-800 p-1 hover:bg-blue-700">
                                                <input
                                                    type="radio"
                                                    name="zoneOperation"
                                                    value="simultaneous"
                                                    checked={zoneOperationMode === 'simultaneous'}
                                                    onChange={() =>
                                                        handleZoneOperationModeChange(
                                                            'simultaneous'
                                                        )
                                                    }
                                                    className="rounded"
                                                />
                                                <div>
                                                    <p className="text-xs font-medium">
                                                        {t('เปิดพร้อมกันทุกโซน')}
                                                    </p>
                                                </div>
                                            </label>
                                            <label className="flex cursor-pointer items-center gap-2 rounded bg-blue-800 p-1 hover:bg-blue-700">
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
                                                    <p className="text-xs font-medium">
                                                        {t('กำหนดเอง')}
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {zoneOperationMode === 'custom' && (
                                        <div className="mt-4 rounded bg-purple-900 p-3">
                                            <div className="mb-3 flex items-center justify-between">
                                                <h4 className="text-sm font-medium text-purple-300">
                                                    📋 {t('จัดการกลุ่มการเปิดโซน:')}
                                                </h4>
                                                <button
                                                    onClick={addOperationGroup}
                                                    className="rounded bg-purple-600 px-3 py-1 text-xs hover:bg-purple-700"
                                                >
                                                    + {t('เพิ่มกลุ่ม')}
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
                                                                {group.label} ({t('ลำดับที่')}{' '}
                                                                {group.order})
                                                                {group.zones.length === 0 && (
                                                                    <span className="ml-2 text-red-300">
                                                                        ({t('ไม่มีโซน')})
                                                                    </span>
                                                                )}
                                                            </p>
                                                            {zoneOperationGroups.length > 1 && (
                                                                <button
                                                                    onClick={() =>
                                                                        removeOperationGroup(
                                                                            group.id
                                                                        )
                                                                    }
                                                                    className="text-xs text-red-400 hover:text-red-300"
                                                                >
                                                                    {t('ลบ')}
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
                                                                                                (
                                                                                                    z
                                                                                                ) =>
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
                                                💡 {t('โซนที่อยู่ในกลุ่มเดียวกันจะเปิดพร้อมกัน')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6 lg:col-span-8">
                        <div className="mb-6 rounded-lg bg-gray-800 p-4">
                            <h3 className="mb-3 text-lg font-semibold text-purple-400">
                                ⚡ {t('ตัวเลือกปั๊มน้ำ')}
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
                                        {t('ต้องการใช้ปั๊มน้ำในระบบ')}
                                    </span>
                                </label>
                                {!showPumpOption && (
                                    <p className="text-sm text-gray-400">
                                        ({t('ใช้แรงดันจากระบบประปาบ้าน')})
                                    </p>
                                )}
                            </div>
                        </div>
                        <InputForm
                            input={currentInput}
                            onInputChange={handleInputChange}
                            selectedSprinkler={currentSprinkler}
                            activeZone={activeZone}
                            projectMode={projectMode}
                        />

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
                                    fieldCropData={fieldCropData}
                                    greenhouseData={greenhouseData}
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
                                        <PipeSelector
                                            pipeType="main"
                                            results={results}
                                            input={currentInput}
                                            selectedPipe={effectiveEquipment.mainPipe}
                                            onPipeChange={(pipe) => handlePipeChange('main', pipe)}
                                        />
                                    )}

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
                                </div>

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
                                    fieldCropData={fieldCropData}
                                    greenhouseData={greenhouseData}
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
                                    projectMode === 'garden'
                                        ? t('สวนบ้าน')
                                        : projectMode === 'field-crop'
                                          ? t('พืชไร่')
                                          : projectMode === 'greenhouse'
                                            ? t('โรงเรือน')
                                            : t('พืชสวน')
                                } Project`}
                                className="max-h-full max-w-full rounded-lg"
                            />
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
                                    {projectMode === 'garden'
                                        ? t('🏡 สวนบ้าน')
                                        : projectMode === 'field-crop'
                                          ? t('🌾 พืชไร่')
                                          : projectMode === 'greenhouse'
                                            ? t('🏠 โรงเรือน')
                                            : t('🌱 พืชสวน')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <QuotationModal
                show={showQuotationModal}
                quotationData={quotationData}
                quotationDataCustomer={quotationDataCustomer}
                onQuotationDataChange={setQuotationData}
                onQuotationDataCustomerChange={setQuotationDataCustomer}
                onClose={() => setShowQuotationModal(false)}
                onConfirm={handleQuotationModalConfirm}
                t={t}
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
            <Footer />
        </div>
    );
}
