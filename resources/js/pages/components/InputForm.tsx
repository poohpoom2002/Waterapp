/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// resources\js\pages\components\InputForm.tsx - Optimized Layout
import React, { useEffect, useState } from 'react';
import { IrrigationInput } from '../types/interfaces';
import { formatNumber } from '../utils/calculations';
import { Zone } from '../../utils/horticultureUtils';
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
    projectMode?: 'horticulture' | 'garden' | 'field-crop';
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

const InputForm: React.FC<InputFormProps> = ({
    input,
    onInputChange,
    selectedSprinkler,
    activeZone,
    projectMode = 'horticulture',
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

    useEffect(() => {
        const messages: string[] = [];

        if (input.totalTrees < 1) {
            messages.push(
                projectMode === 'garden' ? t('จำนวนหัวฉีดต้องมากกว่า 0') : t('จำนวนต้นไม้ต้องมากกว่า 0')
            );
        }

        const estimatedVelocity = calculateEstimatedVelocity(input);
        if (estimatedVelocity > 2.5) {
            messages.push('⚠️ ' + t('ความเร็วน้ำอาจสูงเกินไป - ควรใช้ท่อขนาดใหญ่ขึ้น'));
        } else if (estimatedVelocity < 0.6) {
            messages.push('⚠️ ' + t('ความเร็วน้ำอาจต่ำเกินไป - อาจมีการตกตะกอน'));
        }

        if (input.longestBranchPipeM > 200 || input.longestSecondaryPipeM > 300) {
            messages.push('⚠️ ' + t('ระยะท่อยาวมาก - อาจมี Head Loss สูง (>20%)'));
        }

        setValidationMessages(messages);
    }, [input, projectMode, t]);

    const calculateEstimatedVelocity = (input: IrrigationInput): number => {
        const estimatedFlow =
            (input.totalTrees * input.waterPerTreeLiters) /
            (input.irrigationTimeMinutes || 30) /
            60;
        const estimatedDiameter = Math.sqrt((4 * (estimatedFlow / 60000)) / (Math.PI * 1.5));
        const recommendedSize = estimatedDiameter * 1000;

        const pipeArea = Math.PI * Math.pow(0.032 / 2, 2);
        return estimatedFlow / 60000 / pipeArea;
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
        if (projectMode === 'garden') {
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

    return (
        <div className="mb-6 rounded-lg bg-gray-800 p-4">
            {/* Zone & Multi-Zone Info - Combined Header */}
            {(activeZone || isMultiZone) && (
                <div className="mb-4 space-y-2">
                    {activeZone && (
                        <div className="rounded bg-blue-900 p-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-blue-300">
                                        {projectMode === 'garden' ? t('🏡') : t('🌱')} {activeZone.name}
                                    {isMultiZone && (
                                        <span className="ml-2 text-sm font-normal text-blue-200">
                                            ({t('โซน')} {activeZone.id}/{input.numberOfZones})
                                        </span>
                                    )}
                                </h3>
                                {isMultiZone && (
                                    <div className="text-sm text-purple-200">
                                        <span>{t('รูปแบบ:')}</span>
                                        <span className="font-medium">
                                            {input.simultaneousZones === input.numberOfZones ? t('พร้อมกัน') : 
                                             input.simultaneousZones === 1 ? t('ทีละโซน') : t('บางส่วน')}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                                <div>
                                    <p className="text-blue-200">{t('พื้นที่:')}</p>
                                    <p className="font-medium text-white">
                                        {activeZone.area >= 1600 
                                            ? `${(activeZone.area / 1600).toFixed(1)} ไร่`
                                            : `${activeZone.area.toFixed(2)} ตร.ม.`}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-blue-200">
                                        {projectMode === 'garden' ? t('จำนวนหัวฉีด:') : t('จำนวนต้น:')}
                                    </p>
                                    <p className="font-medium text-white">
                                        {activeZone.plantCount} {projectMode === 'garden' ? 'หัว' : 'ต้น'}
                                    </p>
                                </div>
                                {projectMode === 'horticulture' && activeZone.plantData && (
                                    <>
                                        <div>
                                            <p className="text-blue-200">{t('พืชที่ปลูก:')}</p>
                                            <p className="font-medium text-white">
                                                {activeZone.plantData?.name || 'ไม่ระบุ'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-blue-200">{t('น้ำ/วัน:')}</p>
                                            <p className="font-medium text-white">
                                                {Math.round(activeZone.totalWaterNeed)} {t('ลิตร')}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Left Column - Basic Info */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-green-400">📋 {t('ข้อมูลพื้นฐาน')}</h2>
                    
                    <div className="grid grid-cols-2 gap-3 bg-gray-700 p-2 rounded-lg">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                {projectMode === 'garden' ? t('ขนาดพื้นที่ (ตร.ม.)') : t('ขนาดพื้นที่ (ไร่)')}
                            </label>
                            <input
                                type="number"
                                value={(input.farmSizeRai * (projectMode === 'garden' ? 1600 : 1)).toFixed(2)}
                                onChange={(e) =>
                                    updateInput(
                                        'farmSizeRai',
                                        parseFloat(e.target.value) / (projectMode === 'garden' ? 1600 : 1) || 0
                                    )
                                }
                                step="0.1"
                                min="0"
                                className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                {projectMode === 'garden' ? t('จำนวนหัวฉีด (หัว)') : t('จำนวนต้นไม้ (ต้น)')}
                            </label>
                            <input
                                type="number"
                                value={input.totalTrees}
                                onChange={(e) => updateInput('totalTrees', parseInt(e.target.value) || 0)}
                                min="1"
                                step="1"
                                className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                {projectMode === 'garden' ? t('น้ำต่อหัวฉีด (ลิตร/วัน)') : t('น้ำต่อต้น (ลิตร/วัน)')}
                            </label>
                            <input
                                type="number"
                                value={input.waterPerTreeLiters}
                                onChange={(e) => updateInput('waterPerTreeLiters', parseFloat(e.target.value) || 0)}
                                step="0.1"
                                min="0.1"
                                className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">{t('เวลารดน้ำ (นาที/ครั้ง)')}</label>
                            <input
                                type="number"
                                step="1"
                                value={input.irrigationTimeMinutes}
                                onChange={(e) => updateInput('irrigationTimeMinutes', parseInt(e.target.value) || 45)}
                                className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            />
                        </div>
                    </div>

                    {/* System Settings */}
                    <div className="bg-gray-700 p-2 rounded-lg">
                        <h3 className="mb-3 text-base font-semibold text-orange-400">⚙️ {t('การตั้งค่าระบบ')}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    {projectMode === 'garden' ? t('อัตราส่วนหัวฉีด') : t('สปริงเกอร์ต่อต้น')}
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={input.sprinklersPerTree.toFixed(1)}
                                    onChange={(e) => updateInput('sprinklersPerTree', parseFloat(e.target.value) || 1)}
                                    min="0.1"
                                    max="5"
                                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    {t('ความสูงจาก')} {projectMode === 'garden' ? t('แหล่งน้ำ') : t('ปั๊ม')} {t('ไปจุดสูงสุด (ม.)')}
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={input.staticHeadM.toFixed(1)}
                                    onChange={(e) => updateInput('staticHeadM', parseFloat(e.target.value) || 0)}
                                    min="0"
                                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">{t('จำนวนโซน')}</label>
                                <input
                                    type="number"
                                    value={input.numberOfZones}
                                    onChange={(e) => updateInput('numberOfZones', parseInt(e.target.value) || 1)}
                                    min="1"
                                    step="1"
                                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                    disabled={true}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">{t('อายุท่อ (ปี)')}</label>
                                <input
                                    type="number"
                                    value={input.pipeAgeYears}
                                    onChange={(e) => updateInput('pipeAgeYears', parseInt(e.target.value) || 0)}
                                    min="0"
                                    max="50"
                                    step="1"
                                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Pipe Info */}
                <div className="space-y-4">
                    <h3 className="text-base font-semibold text-blue-400">🔧 {t('ข้อมูลท่อ')}</h3>
                    
                    {/* Branch Pipe */}
                    <div className="rounded-lg bg-gray-700 p-3">
                        <h4 className="mb-2 text-sm font-medium text-purple-300">🔹 {t('ท่อย่อย (Branch Pipe)')}</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-sm">{t('ท่อเส้นที่ยาวที่สุด (ม.)')}</label>
                                <input
                                    type="number"
                                    value={input.longestBranchPipeM.toFixed(1)}
                                    onChange={(e) => updateInput('longestBranchPipeM', parseFloat(e.target.value) || 0)}
                                    step="0.1"
                                    min="0"
                                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-sm text-white focus:border-blue-400"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm">{t('ท่อรวมทั้งหมด (ม.)')}</label>
                                <input
                                    type="number"
                                    value={input.totalBranchPipeM.toFixed(1)}
                                    onChange={(e) => updateInput('totalBranchPipeM', parseFloat(e.target.value) || 0)}
                                    step="0.1"
                                    min="0"
                                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-sm text-white focus:border-blue-400"
                                />
                            </div>
                        </div>
                        {branchStats && (
                            <p className="mt-1 text-xs text-purple-300">
                                {t('จากระบบ:')} {branchStats.longestBranchLength.toFixed(1)} {t('ม.')} ({t('ยาวสุด')})
                            </p>
                        )}
                    </div>

                    {/* Secondary Pipe */}
                    <div className="rounded-lg bg-gray-700 p-3">
                        {input.longestSecondaryPipeM > 0 ? (
                            <>
                                <h4 className="mb-2 text-sm font-medium text-orange-300">🔸 {t('ท่อเมนรอง (Secondary)')}</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-sm">{t('ท่อเส้นที่ยาวที่สุด (ม.)')}</label>
                                        <input
                                            type="number"
                                            value={input.longestSecondaryPipeM.toFixed(1)}
                                            onChange={(e) => updateInput('longestSecondaryPipeM', parseFloat(e.target.value) || 0)}
                                            step="0.1"
                                            min="0"
                                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-sm text-white focus:border-blue-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm">{t('ท่อรวมทั้งหมด (ม.)')}</label>
                                        <input
                                            type="number"
                                            value={input.totalSecondaryPipeM.toFixed(1)}
                                            onChange={(e) => updateInput('totalSecondaryPipeM', parseFloat(e.target.value) || 0)}
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
                                {projectMode === 'horticulture' && (
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

                    {/* Main Pipe */}
                    <div className="rounded-lg bg-gray-700 p-3">
                        {input.longestMainPipeM > 0 ? (
                            <>
                                <h4 className="mb-2 text-sm font-medium text-cyan-300">🔷 {t('ท่อเมนหลัก')} (Main)</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-sm">{t('ท่อเส้นที่ยาวที่สุด (ม.)')}</label>
                                        <input
                                            type="number"
                                            value={input.longestMainPipeM.toFixed(1)}
                                            onChange={(e) => updateInput('longestMainPipeM', parseFloat(e.target.value) || 0)}
                                            step="0.1"
                                            min="0"
                                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-sm text-white focus:border-blue-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm">{t('ท่อรวมทั้งหมด (ม.)')}</label>
                                        <input
                                            type="number"
                                            value={input.totalMainPipeM.toFixed(1)}
                                            onChange={(e) => updateInput('totalMainPipeM', parseFloat(e.target.value) || 0)}
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
                                {projectMode === 'horticulture' && (
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

            {/* Advanced Settings */}
            <div className="mt-4">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                >
                    {showAdvanced ? '🔽 ' + t('ซ่อนการตั้งค่าขั้นสูง') : '🔼 ' + t('แสดงการตั้งค่าขั้นสูง')}
                </button>

                {showAdvanced && (
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-lg bg-gray-700 p-3">
                            <h4 className="mb-3 text-sm font-medium text-blue-300">🔧 {t('ค่าขั้นสูง')}</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        {projectMode === 'garden' ? t('หัวฉีด') : t('ต้นไม้')} {t('ต่อท่อย่อย 1 เส้น (เส้นที่ยาวที่สุด)')}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={input.sprinklersPerLongestBranch || input.sprinklersPerBranch}
                                        onChange={(e) => updateInput('sprinklersPerLongestBranch', parseInt(e.target.value) || 1)}
                                        step="1"
                                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                    />
                                   
                                </div>

                                {projectMode === 'horticulture' && (
                                    <div>
                                        <label className="mb-2 block text-sm font-medium">
                                            {t('ท่อย่อยต่อท่อรอง 1 เส้น (เส้นที่ยาวที่สุด)')}
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={input.branchesPerLongestSecondary || input.branchesPerSecondary}
                                            onChange={(e) => updateInput('branchesPerLongestSecondary', parseInt(e.target.value) || 1)}
                                            step="1"
                                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-lg bg-gray-700 p-3">
                            <h4 className="mb-3 text-sm font-medium text-blue-300">🔧 {t('ท่อเสริมต่อหัวสปริงเกอร์')}</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">{t('เลือกชนิดท่อ')}</label>
                                    <select
                                        value={input.extraPipePerSprinkler?.pipeId || ''}
                                        onChange={(e) => {
                                            const pipeId = e.target.value ? parseInt(e.target.value) : null;
                                            onInputChange({
                                                ...input,
                                                extraPipePerSprinkler: {
                                                    pipeId,
                                                    lengthPerHead: input.extraPipePerSprinkler?.lengthPerHead || 0,
                                                },
                                            });
                                        }}
                                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                    >
                                        <option value="">-- {t('ไม่ใช้ท่อเสริม')} --</option>
                                        {pipeData && pipeData.map((pipe) => (
                                            <option key={pipe.id} value={pipe.id}>
                                                {pipe.name || pipe.productCode} - {pipe.sizeMM}mm - {pipe.price?.toLocaleString()} บาท/ม้วน
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium">{t('ความยาวต่อหัว (เมตร)')}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={input.extraPipePerSprinkler?.lengthPerHead || ''}
                                        onChange={(e) => {
                                            const lengthPerHead = parseFloat(e.target.value) || 0;
                                            onInputChange({
                                                ...input,
                                                extraPipePerSprinkler: {
                                                    pipeId: input.extraPipePerSprinkler?.pipeId ?? null,
                                                    lengthPerHead,
                                                },
                                            });
                                        }}
                                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                        placeholder="0.5"
                                    />
                                    <p className="mt-1 text-xs text-gray-400">{t('เช่น 0.5-1 เมตร/หัว')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Plant Information & Validation Messages - Bottom */}
            <div className="mt-4 space-y-3">
                {/* Validation Messages */}
                {validationMessages.length > 0 && (
                    <div className="rounded bg-yellow-900 p-3">
                        <div className="space-y-1">
                            {validationMessages.map((message, index) => (
                                <p key={index} className="text-sm text-yellow-200">
                                    {message}
                                </p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Plant Information */}
                {activeZone && activeZone.plantData && projectMode === 'horticulture' && (
                    <div className="rounded bg-green-900 p-3">
                        <h4 className="mb-2 text-sm font-semibold text-green-300">🌿 {t('ข้อมูลการปลูกพืชในโซน')}</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                            <div>
                                <p className="text-green-200">{t('ชนิดพืช:')}</p>
                                <p className="font-bold text-white">{activeZone.plantData.name}</p>
                            </div>
                            <div>
                                <p className="text-green-200">{t('ระยะปลูก:')}</p>
                                <p className="font-bold text-white">{activeZone.plantData.plantSpacing} {t('ม.')}</p>
                            </div>
                            <div>
                                <p className="text-green-200">{t('ระยะแถว:')}</p>
                                <p className="font-bold text-white">{activeZone.plantData.rowSpacing} {t('ม.')}</p>
                            </div>
                            <div>
                                <p className="text-green-200">{t('น้ำ/ต้น/วัน:')}</p>
                                <p className="font-bold text-white">{activeZone.plantData.waterNeed} {t('ลิตร')}</p>
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-green-200">
                            <p>
                                💡 {t('ความหนาแน่น:')} {activeZone.area >= 1600 
                                    ? `${(activeZone.plantCount / (activeZone.area / 1600)).toFixed(0)} ${t('ต้น/ไร่')}`
                                    : `${(activeZone.plantCount / activeZone.area).toFixed(0)} ${t('ต้น/ตร.ม.')}`}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InputForm;