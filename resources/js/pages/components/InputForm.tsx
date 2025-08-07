/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { IrrigationInput, ProjectMode } from '../types/interfaces';
import { formatNumber } from '../utils/calculations';
import { Zone, PlantData } from '../../utils/horticultureUtils';
import {
    getLongestBranchPipeStats,
    getSubMainPipeBranchCount,
    getDetailedBranchPipeStats,
} from '../../utils/horticultureProjectStats';
import { useCalculations } from '../hooks/useCalculations';
import { useLanguage } from '@/contexts/LanguageContext';

interface InputFormProps {
    input: IrrigationInput;
    onInputChange: (input: IrrigationInput) => void;
    selectedSprinkler?: any;
    activeZone?: Zone;
    projectMode?: ProjectMode;
    maxZones?: number;
}

interface BranchPipeStats {
    longestBranchPlantCount: number;
    longestBranchLength: number;
    maxBranchesPerSubMain: number;
    totalSubMainPipes: number;
    zoneName: string;
}

interface SprinklerPressureInfo {
    pressureBar: number;
    pressureM: number;
    range: string;
    sprinklerName: string;
}

interface PlantDataWithCategory extends PlantData {
    category?: string;
}

const hasCategory = (plantData: PlantData): plantData is PlantDataWithCategory => {
    return 'category' in plantData;
};

const InputForm: React.FC<InputFormProps> = ({
    input,
    onInputChange,
    selectedSprinkler,
    activeZone,
    projectMode = 'horticulture' as ProjectMode,
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [validationMessages, setValidationMessages] = useState<string[]>([]);
    const [pipeData, setPipeData] = useState<any[]>([]);
    const { t } = useLanguage();

    useEffect(() => {
        const fetchPipeData = async () => {
            try {
                const endpoints = [
                    '/api/equipments/by-category/pipe',
                    '/api/equipments/category/pipe',
                    '/api/equipments?category=pipe',
                    '/api/equipments/by-category-name/pipe',
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
                                      item.category?.name === 'pipe' ||
                                      item.category?.display_name?.toLowerCase().includes('pipe');
                                  return categoryMatch;
                              })
                            : [];
                    }
                }
                setPipeData(data);
            } catch (error) {
                setPipeData([]);
            }
        };
        fetchPipeData();
    }, []);

    const isMultiZone = input.numberOfZones > 1;

    const updateInput = (field: keyof IrrigationInput, value: number) => {
        let validatedValue = value;

        switch (field) {
            case 'farmSizeRai':
                validatedValue = Math.max(0, value);
                break;
            case 'totalTrees':
                validatedValue = Math.max(1, Math.round(value));
                break;
            case 'waterPerTreeLiters':
                validatedValue = Math.max(0.1, value);
                break;
            case 'numberOfZones':
                validatedValue = Math.max(1, Math.round(value));
                break;
            case 'simultaneousZones':
                validatedValue = Math.max(1, Math.min(Math.round(value), input.numberOfZones));
                break;
            case 'irrigationTimeMinutes':
                validatedValue = Math.max(1, Math.min(300, value));
                break;
            case 'staticHeadM':
            case 'pressureHeadM':
                validatedValue = Math.max(0, value);
                break;
            case 'pipeAgeYears':
                validatedValue = Math.max(0, Math.min(50, value));
                break;
            default:
                validatedValue = Math.max(0, value);
        }

        const formattedValue = [
            'farmSizeRai',
            'waterPerTreeLiters',
            'irrigationTimeMinutes',
            'staticHeadM',
            'pressureHeadM',
            'longestBranchPipeM',
            'totalBranchPipeM',
            'longestSecondaryPipeM',
            'totalSecondaryPipeM',
            'longestMainPipeM',
            'totalMainPipeM',
        ].includes(field)
            ? formatNumber(validatedValue, 3)
            : Math.round(validatedValue);

        onInputChange({
            ...input,
            [field]: formattedValue,
        });
    };

    const updateInputOnBlur = (field: keyof IrrigationInput, value: string) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || value === '') {
            let defaultValue = 0;
            switch (field) {
                case 'totalTrees':
                    defaultValue = 1;
                    break;
                case 'waterPerTreeLiters':
                    defaultValue = 0.1;
                    break;
                case 'numberOfZones':
                    defaultValue = 1;
                    break;
                case 'irrigationTimeMinutes':
                    defaultValue = 45;
                    break;
                case 'sprinklersPerTree':
                    defaultValue = 1;
                    break;
                case 'sprinklersPerLongestBranch':
                case 'sprinklersPerBranch':
                    defaultValue = input.sprinklersPerBranch || 1;
                    break;
                case 'branchesPerLongestSecondary':
                case 'branchesPerSecondary':
                    defaultValue = input.branchesPerSecondary || 1;
                    break;
                default:
                    defaultValue = 0;
            }
            updateInput(field, defaultValue);
        } else {
            updateInput(field, numValue);
        }
    };

    const calculateEstimatedVelocity = (input: IrrigationInput): number => {
        let estimatedFlowLPM: number;
        
        // Fix: Correct calculation for different project modes
        if (projectMode === 'greenhouse' || projectMode === 'garden') {
            // waterPerTreeLiters is per irrigation session, convert to LPM
            estimatedFlowLPM = (input.totalTrees * input.waterPerTreeLiters) / (input.irrigationTimeMinutes || 30);
        } else if (projectMode === 'field-crop') {
            // For field crop, waterPerTreeLiters should be flow rate per minute
            // If it's per session, need to convert to per minute
            estimatedFlowLPM = input.totalTrees * input.waterPerTreeLiters; // Assuming it's already LPM per tree
        } else {
            // Horticulture mode: waterPerTreeLiters is per irrigation session
            estimatedFlowLPM = (input.totalTrees * input.waterPerTreeLiters) / (input.irrigationTimeMinutes || 30);
        }
        
        // Convert LPM to m³/s for velocity calculation
        const flowM3s = estimatedFlowLPM / 60000;
        
        // Use a standard 32mm pipe diameter for estimation
        const diameterM = 0.032;
        const pipeArea = Math.PI * Math.pow(diameterM / 2, 2);
        
        return flowM3s / pipeArea;
    };

    const getSprinklerPressureInfo = (): SprinklerPressureInfo | null => {
        if (!selectedSprinkler) return null;

        try {
            let minPressure: number, maxPressure: number;
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
                return null;
            }

            const optimalPressureBar = minPressure + (maxPressure - minPressure) * 0.7;
            const pressureM = optimalPressureBar * 10.2;

            return {
                pressureBar: optimalPressureBar,
                pressureM: pressureM,
                range: `${minPressure}-${maxPressure} บาร์`,
                sprinklerName: selectedSprinkler.productCode,
            };
        } catch (error) {
            console.error('Error calculating sprinkler pressure:', error);
            return null;
        }
    };

    const calculateBranchPipeStats = (): BranchPipeStats | null => {
        if (
            projectMode === 'garden' ||
            projectMode === 'field-crop' ||
            projectMode === 'greenhouse'
        ) {
            return null;
        }

        try {
            const longestBranchStats = getLongestBranchPipeStats();
            const subMainBranchCount = getSubMainPipeBranchCount();

            if (!longestBranchStats || !subMainBranchCount) {
                return null;
            }

            let zoneStats: BranchPipeStats | null = null;
            if (activeZone) {
                const longestStat = longestBranchStats.find(
                    (stat) => stat.zoneId === activeZone.id
                );
                const subMainStat = subMainBranchCount.find(
                    (stat) => stat.zoneId === activeZone.id
                );

                if (longestStat && subMainStat) {
                    zoneStats = {
                        longestBranchPlantCount: longestStat.longestBranchPipe.plantCount,
                        longestBranchLength: longestStat.longestBranchPipe.length,
                        maxBranchesPerSubMain:
                            subMainStat.subMainPipes.length > 0
                                ? Math.max(...subMainStat.subMainPipes.map((sm) => sm.branchCount))
                                : 0,
                        totalSubMainPipes: subMainStat.subMainPipes.length,
                        zoneName: longestStat.zoneName,
                    };
                }
            } else {
                if (longestBranchStats.length > 0 && subMainBranchCount.length > 0) {
                    zoneStats = {
                        longestBranchPlantCount: longestBranchStats[0].longestBranchPipe.plantCount,
                        longestBranchLength: longestBranchStats[0].longestBranchPipe.length,
                        maxBranchesPerSubMain:
                            subMainBranchCount[0].subMainPipes.length > 0
                                ? Math.max(
                                      ...subMainBranchCount[0].subMainPipes.map(
                                          (sm) => sm.branchCount
                                      )
                                  )
                                : 0,
                        totalSubMainPipes: subMainBranchCount[0].subMainPipes.length,
                        zoneName: longestBranchStats[0].zoneName,
                    };
                }
            }

            return zoneStats;
        } catch (error) {
            console.error('Error calculating branch pipe stats:', error);
            return null;
        }
    };

    const branchStats = calculateBranchPipeStats();
    const sprinklerPressure = getSprinklerPressureInfo();

    const getProjectIcon = () => {
        switch (projectMode) {
            case 'garden':
                return '🏡';
            case 'field-crop':
                return '🌾';
            case 'greenhouse':
                return '🏠';
            default:
                return '🌱';
        }
    };

    const getItemName = () => {
        switch (projectMode) {
            case 'garden':
                return t('หัวฉีด');
            case 'field-crop':
                return t('หัวฉีด');
            case 'greenhouse':
                return t('หัวฉีด');
            default:
                return t('ต้นไม้');
        }
    };

    const getAreaUnit = () => {
        switch (projectMode) {
            case 'garden':
            case 'greenhouse':
            case 'field-crop':
            case 'horticulture':
            default:
                return t('ไร่'); // Fix: All project modes now use rai consistently
        }
    };

    const getAreaConversionFactor = () => {
        // Fix: All project modes now store farmSizeRai in rai units
        // No conversion needed for display - all are already in rai
        return 1; // Always 1 since farmSizeRai is now consistently in rai
    };

    const getWaterSourceLabel = () => {
        switch (projectMode) {
            case 'garden':
                return t('แหล่งน้ำ');
            case 'field-crop':
                return t('ปั๊ม');
            case 'greenhouse':
                return t('แหล่งน้ำ');
            default:
                return t('ปั๊ม');
        }
    };

    const getWaterPerItemLabel = () => {
        switch (projectMode) {
            case 'field-crop':
                return t('น้ำต่อหัว (ลิตร/นาที)');
            case 'greenhouse':
                return t('น้ำต่อหัวฉีด (ลิตร/ครั้ง)');
            case 'garden':
                return t('น้ำต่อหัวฉีด (ลิตร/ครั้ง)');
            default:
                return t('น้ำต่อ') + getItemName() + t(' (ลิตร/ครั้ง)');
        }
    };

    const getQuantityLabel = () => {
        switch (projectMode) {
            case 'greenhouse':
                return t('จำนวนหัวฉีด');
            case 'garden':
                return t('จำนวนหัวฉีด');
            case 'field-crop':
                return t('จำนวนหัวฉีด');
            default:
                return t('จำนวนต้นไม้');
        }
    };

    const shouldShowSprinklersPerTree = () => {
        return (
            projectMode !== 'field-crop' && projectMode !== 'greenhouse' && projectMode !== 'garden'
        );
    };

    return (
        <div className="mb-6 rounded-lg bg-gray-800 p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-green-400">
                        📋 {t('ข้อมูลพื้นฐาน')}
                    </h2>

                    <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-700 p-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                {t('ขนาดพื้นที่')} ({getAreaUnit()}) ({(input.farmSizeRai * 1600).toFixed(2)} {t('ตร.ม.')})
                            </label>
                            <input
                                type="number"
                                defaultValue={input.farmSizeRai.toFixed(2)} // Fix: Always display rai since all modes store in rai
                                onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    updateInput('farmSizeRai', value); // Fix: Direct assignment since value is already in rai
                                }}
                                onBlur={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || isNaN(parseFloat(value))) {
                                        e.target.value = input.farmSizeRai.toFixed(2); // Fix: Always show rai
                                    }
                                }}
                                step="0.1"
                                min="0"
                                className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                {getQuantityLabel()}
                            </label>
                            <input
                                type="number"
                                defaultValue={input.totalTrees}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (!isNaN(value)) {
                                        updateInput('totalTrees', value);
                                    }
                                }}
                                onBlur={(e) => updateInputOnBlur('totalTrees', e.target.value)}
                                min="1"
                                step="1"
                                className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                {getWaterPerItemLabel()}
                            </label>
                            <input
                                type="number"
                                defaultValue={input.waterPerTreeLiters}
                                onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value)) {
                                        updateInput('waterPerTreeLiters', value);
                                    }
                                }}
                                onBlur={(e) => updateInputOnBlur('waterPerTreeLiters', e.target.value)}
                                step="0.1"
                                min="0.1"
                                className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                {t('เวลารดน้ำ (นาที/ครั้ง)')}
                            </label>
                            <input
                                type="number"
                                step="1"
                                defaultValue={input.irrigationTimeMinutes}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (!isNaN(value)) {
                                        updateInput('irrigationTimeMinutes', value);
                                    }
                                }}
                                onBlur={(e) => updateInputOnBlur('irrigationTimeMinutes', e.target.value)}
                                className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            />
                        </div>
                    </div>

                    <div className="rounded-lg bg-gray-700 p-2">
                        <h3 className="mb-3 text-base font-semibold text-orange-400">
                            ⚙️ {t('การตั้งค่าระบบ')}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {shouldShowSprinklersPerTree() && (
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        {t('หัวฉีดต่อต้น')}
                                    </label>
                                    <input
                                        type="number"
                                        step="1"
                                        defaultValue={input.sprinklersPerTree}
                                        onChange={(e) => {
                                            const value = parseFloat(e.target.value);
                                            if (!isNaN(value)) {
                                                updateInput('sprinklersPerTree', value);
                                            }
                                        }}
                                        onBlur={(e) => updateInputOnBlur('sprinklersPerTree', e.target.value)}
                                        min="1"
                                        max="5"
                                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    {t('ความสูงจาก')}
                                    {getWaterSourceLabel()}
                                    {t('ไปจุดสูงสุด (ม.)')}
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    defaultValue={input.staticHeadM.toFixed(1)}
                                    onChange={(e) => {
                                        const value = parseFloat(e.target.value);
                                        if (!isNaN(value)) {
                                            updateInput('staticHeadM', value);
                                        }
                                    }}
                                    onBlur={(e) => {
                                        const value = e.target.value;
                                        if (value === '' || isNaN(parseFloat(value))) {
                                            e.target.value = input.staticHeadM.toFixed(1);
                                        }
                                    }}
                                    min="0"
                                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    {t('จำนวนโซน')}
                                </label>
                                <input
                                    type="number"
                                    value={input.numberOfZones}
                                    onChange={(e) =>
                                        updateInput('numberOfZones', parseInt(e.target.value) || 1)
                                    }
                                    min="1"
                                    step="1"
                                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                    disabled={true}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    {t('อายุท่อ (ปี)')}
                                </label>
                                <input
                                    type="number"
                                    defaultValue={input.pipeAgeYears}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (!isNaN(value)) {
                                            updateInput('pipeAgeYears', value);
                                        }
                                    }}
                                    onBlur={(e) => {
                                        const value = e.target.value;
                                        if (value === '' || isNaN(parseInt(value))) {
                                            e.target.value = input.pipeAgeYears.toString();
                                        }
                                    }}
                                    min="0"
                                    max="50"
                                    step="1"
                                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-blue-400">🔧 {t('ข้อมูลท่อ')}</h3>

                    <div className="rounded-lg bg-gray-700 p-3">
                        <h4 className="mb-2 text-sm font-medium text-purple-300">
                            🔹 {t('ท่อย่อย (Branch Pipe)')}
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-sm">
                                    {t('ท่อเส้นที่ยาวที่สุด (ม.)')}
                                </label>
                                <input
                                    type="number"
                                    defaultValue={input.longestBranchPipeM.toFixed(1)}
                                    onChange={(e) => {
                                        const value = parseFloat(e.target.value);
                                        if (!isNaN(value)) {
                                            updateInput('longestBranchPipeM', value);
                                        }
                                    }}
                                    onBlur={(e) => {
                                        const value = e.target.value;
                                        if (value === '' || isNaN(parseFloat(value))) {
                                            e.target.value = input.longestBranchPipeM.toFixed(1);
                                        }
                                    }}
                                    step="0.1"
                                    min="0"
                                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-sm text-white focus:border-blue-400"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm">
                                    {t('ท่อรวมทั้งหมด (ม.)')}
                                </label>
                                <input
                                    type="number"
                                    defaultValue={input.totalBranchPipeM.toFixed(1)}
                                    onChange={(e) => {
                                        const value = parseFloat(e.target.value);
                                        if (!isNaN(value)) {
                                            updateInput('totalBranchPipeM', value);
                                        }
                                    }}
                                    onBlur={(e) => {
                                        const value = e.target.value;
                                        if (value === '' || isNaN(parseFloat(value))) {
                                            e.target.value = input.totalBranchPipeM.toFixed(1);
                                        }
                                    }}
                                    step="0.1"
                                    min="0"
                                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-sm text-white focus:border-blue-400"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg bg-gray-700 p-3">
                        {input.longestSecondaryPipeM > 0 ? (
                            <>
                                <h4 className="mb-2 text-sm font-medium text-orange-300">
                                    🔸 {t('ท่อเมนรอง (Secondary)')}
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-sm">
                                            {t('ท่อเส้นที่ยาวที่สุด (ม.)')}
                                        </label>
                                        <input
                                            type="number"
                                            defaultValue={input.longestSecondaryPipeM.toFixed(1)}
                                            onChange={(e) => {
                                                const value = parseFloat(e.target.value);
                                                if (!isNaN(value)) {
                                                    updateInput('longestSecondaryPipeM', value);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                const value = e.target.value;
                                                if (value === '' || isNaN(parseFloat(value))) {
                                                    e.target.value = input.longestSecondaryPipeM.toFixed(1);
                                                }
                                            }}
                                            step="0.1"
                                            min="0"
                                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-sm text-white focus:border-blue-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm">
                                            {t('ท่อรวมทั้งหมด (ม.)')}
                                        </label>
                                        <input
                                            type="number"
                                            defaultValue={input.totalSecondaryPipeM.toFixed(1)}
                                            onChange={(e) => {
                                                const value = parseFloat(e.target.value);
                                                if (!isNaN(value)) {
                                                    updateInput('totalSecondaryPipeM', value);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                const value = e.target.value;
                                                if (value === '' || isNaN(parseFloat(value))) {
                                                    e.target.value = input.totalSecondaryPipeM.toFixed(1);
                                                }
                                            }}
                                            step="0.1"
                                            min="0"
                                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-sm text-white focus:border-blue-400"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="text-center text-gray-400">
                                    <div className="mb-1 text-2xl">➖</div>
                                    <p className="text-sm">{t('ไม่ใช้ท่อเมนรอง')}</p>
                                </div>
                                {(projectMode === 'horticulture' ||
                                    projectMode === 'field-crop' ||
                                    projectMode === 'greenhouse') && (
                                    <button
                                        onClick={() => updateInput('longestSecondaryPipeM', 50)}
                                        className="text-sm text-blue-400 hover:text-blue-300"
                                    >
                                        + {t('เพิ่มท่อเมนรอง')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="rounded-lg bg-gray-700 p-3">
                        {input.longestMainPipeM > 0 ? (
                            <>
                                <h4 className="mb-2 text-sm font-medium text-cyan-300">
                                    🔷 {t('ท่อเมนหลัก')} (Main)
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-sm">
                                            {t('ท่อเส้นที่ยาวที่สุด (ม.)')}
                                        </label>
                                        <input
                                            type="number"
                                            defaultValue={input.longestMainPipeM.toFixed(1)}
                                            onChange={(e) => {
                                                const value = parseFloat(e.target.value);
                                                if (!isNaN(value)) {
                                                    updateInput('longestMainPipeM', value);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                const value = e.target.value;
                                                if (value === '' || isNaN(parseFloat(value))) {
                                                    e.target.value = input.longestMainPipeM.toFixed(1);
                                                }
                                            }}
                                            step="0.1"
                                            min="0"
                                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-sm text-white focus:border-blue-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm">
                                            {t('ท่อรวมทั้งหมด (ม.)')}
                                        </label>
                                        <input
                                            type="number"
                                            defaultValue={input.totalMainPipeM.toFixed(1)}
                                            onChange={(e) => {
                                                const value = parseFloat(e.target.value);
                                                if (!isNaN(value)) {
                                                    updateInput('totalMainPipeM', value);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                const value = e.target.value;
                                                if (value === '' || isNaN(parseFloat(value))) {
                                                    e.target.value = input.totalMainPipeM.toFixed(1);
                                                }
                                            }}
                                            step="0.1"
                                            min="0"
                                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-sm text-white focus:border-blue-400"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="text-center text-gray-400">
                                    <div className="mb-1 text-2xl">➖</div>
                                    <p className="text-sm">{t('ไม่ใช้ท่อเมนหลัก')}</p>
                                </div>
                                {(projectMode === 'horticulture' ||
                                    projectMode === 'field-crop' ||
                                    projectMode === 'greenhouse') && (
                                    <button
                                        onClick={() => updateInput('longestMainPipeM', 100)}
                                        className="text-sm text-blue-400 hover:text-blue-300"
                                    >
                                        + {t('เพิ่มท่อเมนหลัก')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    
                </div>
            </div>

            <div className="mt-4">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                >
                    {showAdvanced
                        ? ' 🔼' + t('ซ่อนการตั้งค่าขั้นสูง')
                        : '🔽 ' + t('แสดงการตั้งค่าขั้นสูง')}
                </button>

                {showAdvanced && (
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-lg bg-gray-700 p-3">
                            <h4 className="mb-3 text-sm font-medium text-blue-300">
                                🔧 {t('ค่าขั้นสูง')}
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        {projectMode === 'greenhouse'
                                            ? t('หัวฉีดต่อท่อย่อย 1 เส้น (เส้นที่ยาวที่สุด)')
                                            : projectMode === 'field-crop'
                                              ? t('หัวฉีดต่อท่อย่อย 1 เส้น (เส้นที่ยาวที่สุด)')
                                              : getItemName() +
                                                t('ต่อท่อย่อย 1 เส้น (เส้นที่ยาวที่สุด)')}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        defaultValue={
                                            input.sprinklersPerLongestBranch ||
                                            input.sprinklersPerBranch
                                        }
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            if (!isNaN(value)) {
                                                updateInput('sprinklersPerLongestBranch', value);
                                            }
                                        }}
                                        onBlur={(e) => updateInputOnBlur('sprinklersPerLongestBranch', e.target.value)}
                                        step="1"
                                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                    />
                                    {projectMode === 'greenhouse' && (
                                        <p className="mt-1 text-xs text-gray-400">
                                            {t('จำนวนหัวฉีดสูงสุดในแต่ละแถวหรือท่อย่อย')}
                                        </p>
                                    )}
                                </div>

                                {(projectMode === 'horticulture' ||
                                    projectMode === 'field-crop' ||
                                    projectMode === 'greenhouse') && (
                                    <div>
                                        <label className="mb-2 block text-sm font-medium">
                                            {t('ท่อย่อยต่อท่อรอง 1 เส้น (เส้นที่ยาวที่สุด)')}
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            defaultValue={
                                                input.branchesPerLongestSecondary ||
                                                input.branchesPerSecondary
                                            }
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value);
                                                if (!isNaN(value)) {
                                                    updateInput('branchesPerLongestSecondary', value);
                                                }
                                            }}
                                            onBlur={(e) => updateInputOnBlur('branchesPerLongestSecondary', e.target.value)}
                                            step="1"
                                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                        />
                                        {projectMode === 'greenhouse' && (
                                            <p className="mt-1 text-xs text-gray-400">
                                                {t(
                                                    'จำนวนท่อย่อยสูงสุดที่เชื่อมต่อกับท่อรองแต่ละเส้น'
                                                )}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-lg bg-gray-700 p-3">
                            <h4 className="mb-3 text-sm font-medium text-blue-300">
                                🔧 {t('ท่อเสริมต่อหัวสปริงเกอร์')}
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        {t('เลือกชนิดท่อ')}
                                    </label>
                                    <select
                                        value={input.extraPipePerSprinkler?.pipeId || ''}
                                        onChange={(e) => {
                                            const pipeId = e.target.value
                                                ? parseInt(e.target.value)
                                                : null;
                                            onInputChange({
                                                ...input,
                                                extraPipePerSprinkler: {
                                                    pipeId,
                                                    lengthPerHead:
                                                        input.extraPipePerSprinkler
                                                            ?.lengthPerHead || 0,
                                                },
                                            });
                                        }}
                                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                    >
                                        <option value="">-- {t('ไม่ใช้ท่อเสริม')} --</option>
                                        {pipeData &&
                                            pipeData.map((pipe) => (
                                                <option key={pipe.id} value={pipe.id}>
                                                    {pipe.name || pipe.productCode} - {pipe.sizeMM}
                                                    mm - {pipe.price?.toLocaleString()} บาท/ม้วน
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        {t('ความยาวต่อหัว (เมตร)')}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        defaultValue={input.extraPipePerSprinkler?.lengthPerHead || ''}
                                        onChange={(e) => {
                                            const lengthPerHead = parseFloat(e.target.value) || 0;
                                            onInputChange({
                                                ...input,
                                                extraPipePerSprinkler: {
                                                    pipeId:
                                                        input.extraPipePerSprinkler?.pipeId ?? null,
                                                    lengthPerHead,
                                                },
                                            });
                                        }}
                                        onBlur={(e) => {
                                            const value = e.target.value;
                                            if (value === '' || isNaN(parseFloat(value))) {
                                                e.target.value = (input.extraPipePerSprinkler?.lengthPerHead || 0).toString();
                                            }
                                        }}
                                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                        placeholder="0.5"
                                    />
                                    <p className="mt-1 text-xs text-gray-400">
                                        {projectMode === 'greenhouse'
                                            ? t('เช่น 0.3-0.8 เมตร/หัว สำหรับโรงเรือน')
                                            : t('เช่น 0.5-1 เมตร/หัว')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InputForm;