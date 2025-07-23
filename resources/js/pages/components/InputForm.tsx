// resources\js\pages\components\InputForm.tsx
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

interface InputFormProps {
    input: IrrigationInput;
    onInputChange: (input: IrrigationInput) => void;
    selectedSprinkler?: any;
    activeZone?: Zone;
    projectMode?: 'horticulture' | 'garden';
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
                validatedValue = Math.max(5, Math.min(300, value));
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
                projectMode === 'garden' ? 'จำนวนหัวฉีดต้องมากกว่า 0' : 'จำนวนต้นไม้ต้องมากกว่า 0'
            );
        }

        const estimatedVelocity = calculateEstimatedVelocity(input);
        if (estimatedVelocity > 2.5) {
            messages.push('⚠️ ความเร็วน้ำอาจสูงเกินไป - ควรใช้ท่อขนาดใหญ่ขึ้น');
        } else if (estimatedVelocity < 0.6) {
            messages.push('⚠️ ความเร็วน้ำอาจต่ำเกินไป - อาจมีการตกตะกอน');
        }

        if (input.longestBranchPipeM > 200 || input.longestSecondaryPipeM > 300) {
            messages.push('⚠️ ระยะท่อยาวมาก - อาจมี Head Loss สูง (>20%)');
        }

        setValidationMessages(messages);
    }, [input, projectMode]);

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

    const getSystemRecommendations = (): string[] => {
        const recommendations: string[] = [];

        if (projectMode === 'garden') {
            const sprinklersPerRai = input.totalTrees / input.farmSizeRai;
            if (sprinklersPerRai > 50) {
                recommendations.push('ความหนาแน่นหัวฉีดสูง (>50 หัว/ไร่) ควรใช้หัวฉีดรัศมีเล็ก');
            } else if (sprinklersPerRai < 20) {
                recommendations.push(
                    'ความหนาแน่นหัวฉีดต่ำ (<20 หัว/ไร่) สามารถใช้หัวฉีดรัศมีใหญ่ได้'
                );
            }

            if (input.irrigationTimeMinutes > 45) {
                recommendations.push('เวลารดน้ำนาน (>45 นาที) เหมาะสำหรับพื้นที่สนามหญ้า');
            } else if (input.irrigationTimeMinutes < 20) {
                recommendations.push('เวลารดน้ำสั้น (<20 นาที) เหมาะสำหรับไม้ดอกไม้ประดับ');
            }

            if (input.totalBranchPipeM > 100) {
                recommendations.push('ระยะท่อยาว ควรพิจารณาใช้ท่อขนาดใหญ่เพื่อลดการสูญเสียแรงดัน');
            }

            if (isMultiZone) {
                recommendations.push(
                    `ระบบ ${input.numberOfZones} โซน - ควรพิจารณาการเปิดทีละ ${input.simultaneousZones} โซน`
                );
            }
        } else {
            const treesPerRai = input.totalTrees / input.farmSizeRai;
            if (treesPerRai > 200) {
                recommendations.push(
                    'ความหนาแน่นต้นไม้สูง (>200 ต้น/ไร่) ควรใช้สปริงเกอร์อัตราการไหลต่ำ'
                );
            } else if (treesPerRai < 50) {
                recommendations.push(
                    'ความหนาแน่นต้นไม้ต่ำ (<50 ต้น/ไร่) สามารถใช้สปริงเกอร์อัตราการไหลสูงได้'
                );
            }

            const waterPerTreePerDay = input.waterPerTreeLiters;
            if (waterPerTreePerDay > 100) {
                recommendations.push('ความต้องการน้ำสูง แนะนำระบบแบ่งโซนและรดหลายครั้งต่อวัน');
            } else if (waterPerTreePerDay < 20) {
                recommendations.push('ความต้องการน้ำต่ำ เหมาะสำหรับพืชทนแล้งหรือการรดน้ำเสริม');
            }

            if (input.irrigationTimeMinutes > 60) {
                recommendations.push('เวลารดน้ำนาน (>60 นาที) ควรตรวจสอบอัตราการซึมของดิน');
            } else if (input.irrigationTimeMinutes < 15) {
                recommendations.push('เวลารดน้ำสั้น (<15 นาที) ควรใช้สปริงเกอร์อัตราการไหลสูง');
            }

            if (isMultiZone) {
                recommendations.push(`ระบบ ${input.numberOfZones} โซน - การเปิดโซนกำหนดในหน้าหลัก`);
            }
        }

        return recommendations;
    };

    const systemRecommendations = getSystemRecommendations();

    const getLabel = (key: string) => {
        if (projectMode === 'garden') {
            switch (key) {
                case 'totalTrees':
                    return 'จำนวนหัวฉีด (หัว)';
                case 'waterPerTree':
                    return 'น้ำต่อหัวฉีด (ลิตร/วัน)';
                case 'sprinklersPerTree':
                    return 'อัตราส่วนหัวฉีด';
                case 'sprinklersPerBranch':
                    return 'หัวฉีดต่อท่อย่อย';
                default:
                    return key;
            }
        }
        return key;
    };

    return (
        <div className="mb-8 rounded-lg bg-gray-700 p-6">
            {activeZone && (
                <div className="mb-4 rounded bg-blue-900 p-3">
                    <h3 className="text-lg font-semibold text-blue-300">
                        {projectMode === 'garden' ? '🏡' : '🌱'} {activeZone.name}
                        {isMultiZone && (
                            <span className="ml-2 text-sm font-normal text-blue-200">
                                (โซน {activeZone.id} จาก {input.numberOfZones} โซน)
                            </span>
                        )}
                    </h3>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                        <div>
                            <p className="text-blue-200">พื้นที่:</p>
                            <p className="font-medium text-white">
                                {activeZone.area >= 1600 ? (
                                    <p>{(activeZone.area / 1600).toFixed(1)} ไร่</p>
                                ) : (
                                    <p>{activeZone.area.toFixed(2)} ตร.ม.</p>
                                )}
                            </p>
                        </div>
                        <div>
                            <p className="text-blue-200">
                                {projectMode === 'garden' ? 'จำนวนหัวฉีด:' : 'จำนวนต้น:'}
                            </p>
                            <p className="font-medium text-white">
                                {activeZone.plantCount} {projectMode === 'garden' ? 'หัว' : 'ต้น'}
                            </p>
                        </div>
                        {projectMode === 'horticulture' && activeZone.plantData && (
                            <>
                                <div>
                                    <p className="text-blue-200">พืชที่ปลูก:</p>
                                    <p className="font-medium text-white">
                                        {activeZone.plantData?.name || 'ไม่ระบุ'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-blue-200">ความต้องการน้ำ:</p>
                                    <p className="font-medium text-white">
                                        {activeZone.totalWaterNeed.toFixed(0)} ลิตร/วัน
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="mt-2 text-xs text-blue-200">
                        <p>
                            💡 ข้อมูลจากระบบออกแบบ{' '}
                            {projectMode === 'garden' ? 'Home Garden' : 'Horticulture'} -
                            สามารถปรับแต่งได้ตามความต้องการ
                        </p>
                    </div>
                </div>
            )}

            {validationMessages.length > 0 && (
                <div className="mb-4 rounded bg-red-900 p-3">
                    <h4 className="mb-2 text-sm font-medium text-red-300">⚠️ ข้อควรระวัง:</h4>
                    <ul className="space-y-1 text-xs text-red-200">
                        {validationMessages.map((message, index) => (
                            <li key={index}>• {message}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* แสดงข้อมูล Multi-Zone */}
            {isMultiZone && (
                <div className="mb-4 rounded bg-purple-900 p-3">
                    <h4 className="mb-2 text-sm font-medium text-purple-300">
                        🏗️ ข้อมูลระบบหลายโซน:
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm text-purple-200 md:grid-cols-4">
                        <div>
                            <p className="text-purple-200">จำนวนโซน:</p>
                            <p className="font-medium text-white">{input.numberOfZones} โซน</p>
                        </div>
                        <div>
                            <p className="text-purple-200">ประเภทระบบ:</p>
                            <p className="font-medium text-white">
                                {input.simultaneousZones === input.numberOfZones
                                    ? 'เปิดพร้อมกัน'
                                    : input.simultaneousZones === 1
                                      ? 'เปิดทีละโซน'
                                      : 'เปิดบางส่วน'}
                            </p>
                        </div>
                        <div>
                            <p className="text-purple-200">การคำนวณปั๊ม:</p>
                            <p className="font-medium text-white">
                                Max Head จาก {input.simultaneousZones} โซน
                            </p>
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-purple-200">
                        <p>💡 ปั๊มจะคำนวณตามการตั้งค่าการเปิดโซนที่กำหนดไว้ในหน้าหลัก</p>
                    </div>
                </div>
            )}

            <h2 className="mb-4 text-xl font-semibold text-green-400">📋 ข้อมูลพื้นฐาน</h2>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                <div>
                    <label className="mb-2 block text-sm font-medium">
                        {projectMode === 'garden' ? 'ขนาดพื้นที่ (ตร.ม.)' : 'ขนาดพื้นที่ (ไร่)'}
                        {activeZone && (
                            <span className="ml-1 text-xs text-gray-400">({activeZone.name})</span>
                        )}
                    </label>
                    <input
                        type="number"
                        value={(input.farmSizeRai * (projectMode === 'garden' ? 1600 : 1)).toFixed(
                            2
                        )}
                        onChange={(e) =>
                            updateInput(
                                'farmSizeRai',
                                parseFloat(e.target.value) /
                                    (projectMode === 'garden' ? 1600 : 1) || 0
                            )
                        }
                        step="0.1"
                        min="0"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="0.00"
                    />
                    {activeZone && (
                        <p className="mt-1 text-xs text-green-300">
                            จากระบบ:{' '}
                            {activeZone.area >= 1600
                                ? (activeZone.area / 1600).toFixed(1) + ' ไร่'
                                : activeZone.area.toFixed(2) + ' ตร.ม.'}
                        </p>
                    )}
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">
                        {projectMode === 'garden' ? 'จำนวนหัวฉีด (หัว)' : 'จำนวนต้นไม้ (ต้น)'}
                        {activeZone && activeZone.plantData && projectMode === 'horticulture' && (
                            <span className="ml-1 text-xs text-gray-400">
                                ({activeZone.plantData.name})
                            </span>
                        )}
                    </label>
                    <input
                        type="number"
                        value={input.totalTrees}
                        onChange={(e) => updateInput('totalTrees', parseInt(e.target.value) || 0)}
                        min="1"
                        step="1"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="0"
                    />
                    {activeZone && (
                        <p className="mt-1 text-xs text-green-300">
                            จากระบบ: {activeZone.plantCount}{' '}
                            {projectMode === 'garden' ? 'หัว' : 'ต้น'}
                        </p>
                    )}
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">
                        {projectMode === 'garden'
                            ? 'น้ำต่อหัวฉีด (ลิตร/วัน)'
                            : 'น้ำต่อต้น (ลิตร/วัน)'}
                    </label>
                    <input
                        type="number"
                        value={input.waterPerTreeLiters}
                        onChange={(e) =>
                            updateInput('waterPerTreeLiters', parseFloat(e.target.value) || 0)
                        }
                        step="0.1"
                        min="0.1"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="0.000"
                    />
                    {activeZone && activeZone.plantData && projectMode === 'horticulture' && (
                        <p className="mt-1 text-xs text-green-300">
                            จากข้อมูลพืช: {activeZone.plantData.waterNeed} ลิตร/วัน
                        </p>
                    )}
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">
                        จำนวนโซน
                        {isMultiZone && (
                            <span className="ml-1 text-xs text-yellow-400">(Multi-Zone)</span>
                        )}
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
                        placeholder="1"
                        disabled={true}
                    />
                    <p className="mt-1 text-xs text-gray-400">
                        การคำนวณ: {input.numberOfZones} โซน
                        {isMultiZone && ` | เปิด ${input.simultaneousZones} โซนพร้อมกัน`}
                    </p>
                </div>
            </div>

            <h3 className="mb-4 mt-6 text-lg font-semibold text-blue-400">🔧 ข้อมูลท่อ</h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="space-y-4 rounded-lg bg-gray-800 p-4 shadow-lg">
                    <h4 className="text-md font-medium text-purple-300">
                        🔹 ท่อย่อย (Branch Pipe)
                    </h4>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            ท่อย่อยเส้นที่ยาวที่สุด (เมตร)
                        </label>
                        <input
                            type="number"
                            value={input.longestBranchPipeM.toFixed(1)}
                            onChange={(e) =>
                                updateInput('longestBranchPipeM', parseFloat(e.target.value) || 0)
                            }
                            step="0.1"
                            min="0"
                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            placeholder="30.000"
                        />
                        {branchStats && (
                            <p className="mt-1 text-xs text-purple-300">
                                จากระบบ: {branchStats.longestBranchLength.toFixed(1)} ม.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            ท่อย่อยรวมทั้งหมด (เมตร)
                        </label>
                        <input
                            type="number"
                            value={input.totalBranchPipeM.toFixed(1)}
                            onChange={(e) =>
                                updateInput('totalBranchPipeM', parseFloat(e.target.value) || 0)
                            }
                            step="0.1"
                            min="0"
                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            placeholder="500.000"
                        />
                    </div>
                </div>

                <div className="space-y-4 rounded-lg bg-gray-800 p-4 shadow-lg">
                    {input.longestSecondaryPipeM > 0 ? (
                        <>
                            <h4 className="text-md font-medium text-orange-300">
                                🔸 ท่อเมนรอง (Secondary Pipe)
                            </h4>
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    ท่อเมนรองเส้นที่ยาวที่สุด (เมตร)
                                </label>
                                <input
                                    type="number"
                                    value={input.longestSecondaryPipeM.toFixed(1)}
                                    onChange={(e) =>
                                        updateInput(
                                            'longestSecondaryPipeM',
                                            parseFloat(e.target.value) || 0
                                        )
                                    }
                                    step="0.1"
                                    min="0"
                                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                    placeholder="80.000 (0 = ไม่มีท่อนี้)"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    ท่อเมนรองรวมทั้งหมด (เมตร)
                                </label>
                                <input
                                    type="number"
                                    value={input.totalSecondaryPipeM.toFixed(1)}
                                    onChange={(e) =>
                                        updateInput(
                                            'totalSecondaryPipeM',
                                            parseFloat(e.target.value) || 0
                                        )
                                    }
                                    step="0.1"
                                    min="0"
                                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                    placeholder="400.000 (0 = ไม่มีท่อนี้)"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center rounded bg-gray-900 p-8 text-center text-gray-400">
                            <div>
                                <div className="mb-2 text-4xl">➖</div>
                                <p>ไม่ได้ใช้ท่อเมนรอง</p>
                                {projectMode === 'horticulture' && (
                                    <button
                                        onClick={() => updateInput('longestSecondaryPipeM', 50)}
                                        className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                                    >
                                        + เพิ่มท่อเมนรอง
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4 rounded-lg bg-gray-800 p-4 shadow-lg">
                    {input.longestMainPipeM > 0 ? (
                        <>
                            <h4 className="text-md font-medium text-cyan-300">
                                🔷 ท่อเมนหลัก (Main Pipe)
                            </h4>
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    ท่อเมนหลักเส้นที่ยาวที่สุด (เมตร)
                                </label>
                                <input
                                    type="number"
                                    value={input.longestMainPipeM.toFixed(1)}
                                    onChange={(e) =>
                                        updateInput(
                                            'longestMainPipeM',
                                            parseFloat(e.target.value) || 0
                                        )
                                    }
                                    step="0.1"
                                    min="0"
                                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                    placeholder="200.000 (0 = ไม่มีท่อนี้)"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    ท่อเมนหลักรวมทั้งหมด (เมตร)
                                </label>
                                <input
                                    type="number"
                                    value={input.totalMainPipeM.toFixed(1)}
                                    onChange={(e) =>
                                        updateInput(
                                            'totalMainPipeM',
                                            parseFloat(e.target.value) || 0
                                        )
                                    }
                                    step="0.1"
                                    min="0"
                                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                    placeholder="600.000 (0 = ไม่มีท่อนี้)"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center rounded bg-gray-900 p-8 text-center text-gray-400">
                            <div>
                                <div className="mb-2 text-4xl">➖</div>
                                <p>ไม่ได้ใช้ท่อเมนหลัก</p>
                                {projectMode === 'horticulture' && (
                                    <button
                                        onClick={() => updateInput('longestMainPipeM', 100)}
                                        className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                                    >
                                        + เพิ่มท่อเมนหลัก
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <h3 className="mb-4 mt-6 text-lg font-semibold text-orange-400">⚙️ การตั้งค่าระบบ</h3>

            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                <div>
                    <label className="mb-2 block text-sm font-medium">
                        {projectMode === 'garden' ? 'อัตราส่วนหัวฉีด' : 'สปริงเกอร์ต่อต้น'}
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        value={input.sprinklersPerTree.toFixed(1)}
                        onChange={(e) =>
                            updateInput('sprinklersPerTree', parseFloat(e.target.value) || 1)
                        }
                        min="0.1"
                        max="5"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="1.000"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                        {projectMode === 'garden' ? 'มักใช้ 1 สำหรับสวนบ้าน' : 'มักใช้ 1 หัว/ต้น'}
                    </p>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">เวลารดน้ำ (นาที/ครั้ง)</label>
                    <input
                        type="number"
                        step="1"
                        value={input.irrigationTimeMinutes.toFixed(1)}
                        onChange={(e) =>
                            updateInput('irrigationTimeMinutes', parseFloat(e.target.value) || 20)
                        }
                        min="5"
                        max="300"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="20"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                        {projectMode === 'garden' ? 'แนะนำ 20-45 นาที' : 'แนะนำ 15-60 นาที'}
                    </p>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">
                        ความสูงจาก{projectMode === 'garden' ? 'แหล่งน้ำ' : 'ปั๊ม'}ไปจุดสูงสุด (เมตร)
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        value={input.staticHeadM.toFixed(1)}
                        onChange={(e) =>
                            updateInput('staticHeadM', parseFloat(e.target.value) || 0)
                        }
                        min="0"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="0.000"
                    />
                    <p className="mt-1 text-xs text-gray-400">ความสูงแนวตั้ง</p>
                </div>
            </div>

            <div className="mb-4">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                >
                    {showAdvanced ? '🔽 ซ่อนการตั้งค่าขั้นสูง' : '🔼 แสดงการตั้งค่าขั้นสูง'}
                </button>
            </div>

            {showAdvanced && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            {projectMode === 'garden' ? 'หัวฉีด' : 'ต้นไม้'}ต่อท่อย่อย 1 เส้น
                            (เส้นที่ยาวที่สุด)
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={input.sprinklersPerLongestBranch || input.sprinklersPerBranch}
                            onChange={(e) =>
                                updateInput(
                                    'sprinklersPerLongestBranch',
                                    parseInt(e.target.value) || 1
                                )
                            }
                            step="1"
                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            placeholder="4"
                        />
                        {branchStats && (
                            <p className="mt-1 text-xs text-purple-300">
                                จากระบบ: {branchStats.longestBranchPlantCount}{' '}
                                {projectMode === 'garden' ? 'หัว' : 'ต้น'}
                            </p>
                        )}
                    </div>

                    {projectMode === 'horticulture' && (
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                ท่อย่อยต่อท่อรอง 1 เส้น (เส้นที่ยาวที่สุด)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={
                                    input.branchesPerLongestSecondary || input.branchesPerSecondary
                                }
                                onChange={(e) =>
                                    updateInput(
                                        'branchesPerLongestSecondary',
                                        parseInt(e.target.value) || 1
                                    )
                                }
                                step="1"
                                className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                                placeholder="5"
                            />
                            {branchStats && (
                                <p className="mt-1 text-xs text-orange-300">
                                    จากระบบ: {branchStats.maxBranchesPerSubMain} เส้น
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="mb-2 block text-sm font-medium">อายุท่อ (ปี)</label>
                        <input
                            type="number"
                            value={input.pipeAgeYears}
                            onChange={(e) =>
                                updateInput('pipeAgeYears', parseInt(e.target.value) || 0)
                            }
                            min="0"
                            max="50"
                            step="1"
                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            placeholder="0"
                        />
                        <p className="mt-1 text-xs text-gray-400">ส่งผลต่อค่า Hazen-Williams C</p>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            แรงดันที่หัว{projectMode === 'garden' ? 'ฉีด' : 'สปริงเกอร์'} (เมตร)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={input.pressureHeadM.toFixed(1)}
                            onChange={(e) =>
                                updateInput('pressureHeadM', parseFloat(e.target.value) || 20)
                            }
                            min="0"
                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            placeholder="20.000"
                        />
                        {sprinklerPressure ? (
                            <p className="mt-1 text-xs text-green-300">
                                💡 จาก{projectMode === 'garden' ? 'หัวฉีด' : 'สปริงเกอร์'}:{' '}
                                {sprinklerPressure.pressureM.toFixed(1)} ม.
                            </p>
                        ) : (
                            <p className="mt-1 text-xs text-gray-400">
                                จะปรับตาม{projectMode === 'garden' ? 'หัวฉีด' : 'สปริงเกอร์'}
                                ที่เลือก
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* ===== BRANCH PIPE STATISTICS INFO ===== */}
            {branchStats && projectMode === 'horticulture' && (
                <div className="mt-6 rounded bg-purple-900 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-purple-300">
                        📊 สถิติท่อย่อยจากระบบ Horticulture
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                        <div>
                            <p className="text-purple-200">ต้นไม้ในท่อย่อยที่ยาวที่สุด:</p>
                            <p className="font-bold text-white">
                                {branchStats.longestBranchPlantCount} ต้น
                            </p>
                        </div>
                        <div>
                            <p className="text-purple-200">ท่อย่อยจากท่อเมนรองที่ยาวที่สุด:</p>
                            <p className="font-bold text-white">
                                {branchStats.maxBranchesPerSubMain} เส้น
                            </p>
                        </div>
                        <div>
                            <p className="text-purple-200">ท่อย่อยที่ยาวที่สุด:</p>
                            <p className="font-bold text-white">
                                {branchStats.longestBranchLength.toFixed(1)} ม.
                            </p>
                        </div>
                        <div>
                            <p className="text-purple-200">จำนวนท่อเมนรอง:</p>
                            <p className="font-bold text-white">
                                {branchStats.totalSubMainPipes} เส้น
                            </p>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-purple-200">
                        💡 ข้อมูลนี้ถูกคำนวณอัตโนมัติจากระบบออกแบบ Horticulture
                        และปรับให้เหมาะสมกับการคำนวณ
                    </p>
                </div>
            )}

            {/* ===== PLANT-SPECIFIC INFORMATION ===== */}
            {activeZone && activeZone.plantData && projectMode === 'horticulture' && (
                <div className="mt-6 rounded bg-green-900 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-green-300">
                        🌿 ข้อมูลการปลูกพืชในโซน
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                        <div>
                            <p className="text-green-200">ชนิดพืช:</p>
                            <p className="font-bold text-white">{activeZone.plantData.name}</p>
                        </div>
                        <div>
                            <p className="text-green-200">ระยะปลูก:</p>
                            <p className="font-bold text-white">
                                {activeZone.plantData.plantSpacing} ม.
                            </p>
                        </div>
                        <div>
                            <p className="text-green-200">ระยะแถว:</p>
                            <p className="font-bold text-white">
                                {activeZone.plantData.rowSpacing} ม.
                            </p>
                        </div>
                        <div>
                            <p className="text-green-200">น้ำ/ต้น/วัน:</p>
                            <p className="font-bold text-white">
                                {activeZone.plantData.waterNeed} ลิตร
                            </p>
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-green-200">
                        <p>
                            💡 ความหนาแน่น:{' '}
                            {activeZone.area >= 1600
                                ? (activeZone.plantCount / (activeZone.area / 1600)).toFixed(0) +
                                  ' ต้น/ไร่'
                                : (activeZone.plantCount / activeZone.area).toFixed(0) +
                                  ' ต้น/ตร.ม.'}
                        </p>
                    </div>
                </div>
            )}

            {/* ===== SPRINKLER PRESSURE INFO ===== */}
            {selectedSprinkler && sprinklerPressure && (
                <div className="mt-6 rounded bg-blue-900 p-4">
                    <h3 className="mb-2 font-medium text-blue-300">
                        💧 แรงดันจาก{projectMode === 'garden' ? 'หัวฉีด' : 'สปริงเกอร์'}ที่เลือก
                    </h3>
                    <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-4">
                        <div>
                            <p className="text-blue-200">
                                {projectMode === 'garden' ? 'หัวฉีด:' : 'สปริงเกอร์:'}
                            </p>
                            <p className="font-bold text-white">
                                {sprinklerPressure.sprinklerName}
                            </p>
                        </div>
                        <div>
                            <p className="text-blue-200">ช่วงแรงดัน:</p>
                            <p className="font-bold text-white">{sprinklerPressure.range}</p>
                        </div>
                        <div>
                            <p className="text-blue-200">แรงดันที่ใช้ (70%):</p>
                            <p className="font-bold text-white">
                                {sprinklerPressure.pressureBar.toFixed(1)} บาร์
                            </p>
                        </div>
                        <div>
                            <p className="text-blue-200">เป็นเมตร:</p>
                            <p className="font-bold text-white">
                                {sprinklerPressure.pressureM.toFixed(1)} ม.
                            </p>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-blue-200">
                        💡 ระบบใช้แรงดัน 70% ของช่วงสูงสุดเพื่อประสิทธิภาพที่ดี และจะอัพเดทค่า
                        "แรงดันที่หัว{projectMode === 'garden' ? 'ฉีด' : 'สปริงเกอร์'}" อัตโนมัติ
                        {isMultiZone &&
                            ` (คำนวณปั๊มจาก ${input.simultaneousZones} โซนที่ต้องการ head มากที่สุด)`}
                    </p>
                </div>
            )}

            {/* ===== SYSTEM RECOMMENDATIONS ===== */}
            {systemRecommendations.length > 0 && (
                <div className="mt-6 rounded bg-yellow-900 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-yellow-300">💡 คำแนะนำระบบ:</h4>
                    <ul className="space-y-1 text-xs text-yellow-200">
                        {systemRecommendations.map((recommendation, index) => (
                            <li key={index}>• {recommendation}</li>
                        ))}
                    </ul>
                </div>
            )}

            <h3 className="mb-4 mt-6 text-lg font-semibold text-blue-400">🔧 ข้อมูลท่อเสริม</h3>
            <div className="space-y-4 rounded-lg bg-gray-800 p-4 shadow-lg">
                <h4 className="text-md font-medium text-blue-300">
                    ท่อเสริมต่อหัวสปริงเกอร์ (Riser/แขนง)
                </h4>
                <div>
                    <label className="mb-2 block text-sm font-medium">เลือกชนิดท่อ</label>
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
                        <option value="">-- ไม่ใช้ท่อเสริม --</option>
                        {pipeData &&
                            pipeData.map((pipe) => (
                                <option key={pipe.id} value={pipe.id}>
                                    {pipe.name || pipe.productCode} - {pipe.sizeMM}mm -{' '}
                                    {pipe.price?.toLocaleString()} บาท/ม้วน
                                </option>
                            ))}
                    </select>
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">ความยาวต่อหัว (เมตร)</label>
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
                    <p className="mt-1 text-xs text-gray-400">เช่น 0.5-1 เมตร/หัว</p>
                </div>
            </div>
        </div>
    );
};

export default InputForm;
