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

interface InputFormProps {
    input: IrrigationInput;
    onInputChange: (input: IrrigationInput) => void;
    selectedSprinkler?: any;
    activeZone?: Zone;
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
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [validationMessages, setValidationMessages] = useState<string[]>([]);

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
            case 'irrigationTimeMinutes':
                validatedValue = Math.max(5, Math.min(300, value)); // 5-300 minutes
                break;
            case 'staticHeadM':
            case 'pressureHeadM':
                validatedValue = Math.max(0, value);
                break;
            case 'pipeAgeYears':
                validatedValue = Math.max(0, Math.min(50, value)); // 0-50 years
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
            messages.push('จำนวนต้นไม้ต้องมากกว่า 0');
        }

        if (input.waterPerTreeLiters < 0.1) {
            messages.push('ปริมาณน้ำต่อต้นต้องมากกว่า 0.1 ลิตร');
        }

        if (input.farmSizeRai <= 0) {
            messages.push('ขนาดพื้นที่ต้องมากกว่า 0 ไร่');
        }

        if (input.longestBranchPipeM > input.totalBranchPipeM && input.totalBranchPipeM > 0) {
            messages.push('ท่อย่อยที่ยาวที่สุดไม่ควรยาวกว่าท่อย่อยรวม');
        }

        if (
            input.longestSecondaryPipeM > input.totalSecondaryPipeM &&
            input.totalSecondaryPipeM > 0
        ) {
            messages.push('ท่อเมนรองที่ยาวที่สุดไม่ควรยาวกว่าท่อเมนรองรวม');
        }

        if (input.longestMainPipeM > input.totalMainPipeM && input.totalMainPipeM > 0) {
            messages.push('ท่อเมนหลักที่ยาวที่สุดไม่ควรยาวกว่าท่อเมนหลักรวม');
        }

        if (input.sprinklersPerLongestBranch > input.totalTrees) {
            messages.push('จำนวนสปริงเกอร์ในท่อย่อยที่ยาวที่สุดไม่ควรมากกว่าจำนวนต้นไม้ทั้งหมด');
        }

        if (input.simultaneousZones > input.numberOfZones) {
            messages.push('จำนวนโซนที่ทำงานพร้อมกันไม่ควรมากกว่าจำนวนโซนทั้งหมด');
        }

        setValidationMessages(messages);
    }, [input]);

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

        return recommendations;
    };

    const systemRecommendations = getSystemRecommendations();

    return (
        <div className="mb-8 rounded-lg bg-gray-700 p-6">
            {activeZone && (
                <div className="mb-4 rounded bg-blue-900 p-3">
                    <h3 className="text-lg font-semibold text-blue-300">🌱 {activeZone.name}</h3>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                        <div>
                            <p className="text-blue-200">พื้นที่:</p>
                            <p className="font-medium text-white">
                                {(activeZone.area / 1600).toFixed(2)} ไร่
                            </p>
                        </div>
                        <div>
                            <p className="text-blue-200">จำนวนต้น:</p>
                            <p className="font-medium text-white">{activeZone.plantCount} ต้น</p>
                        </div>
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
                    </div>
                    <div className="mt-2 text-xs text-blue-200">
                        <p>💡 ข้อมูลจากระบบออกแบบ Horticulture - สามารถปรับแต่งได้ตามความต้องการ</p>
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

            <h2 className="mb-4 text-xl font-semibold text-green-400">📋 ข้อมูลพื้นฐาน</h2>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                <div>
                    <label className="mb-2 block text-sm font-medium">
                        ขนาดพื้นที่ (ไร่)
                        {activeZone && (
                            <span className="ml-1 text-xs text-gray-400">({activeZone.name})</span>
                        )}
                    </label>
                    <input
                        type="number"
                        value={input.farmSizeRai}
                        onChange={(e) =>
                            updateInput('farmSizeRai', parseFloat(e.target.value) || 0)
                        }
                        step="0.1"
                        min="0"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="0.000"
                    />
                    {activeZone && (
                        <p className="mt-1 text-xs text-green-300">
                            จากระบบ: {(activeZone.area / 1600).toFixed(3)} ไร่
                        </p>
                    )}
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">
                        จำนวนต้นไม้ (ต้น)
                        {activeZone && activeZone.plantData && (
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
                            จากระบบ: {activeZone.plantCount} ต้น
                        </p>
                    )}
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">น้ำต่อต้น (ลิตร/วัน)</label>
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
                    {activeZone && activeZone.plantData && (
                        <p className="mt-1 text-xs text-green-300">
                            จากข้อมูลพืช: {activeZone.plantData.waterNeed} ลิตร/วัน
                        </p>
                    )}
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">จำนวนโซน</label>
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
                    />
                    <p className="mt-1 text-xs text-gray-400">
                        การคำนวณ: {input.numberOfZones} โซน
                    </p>
                </div>
            </div>

            <h3 className="mb-4 mt-6 text-lg font-semibold text-blue-400">
                🔧 ข้อมูลท่อ
            </h3>

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
                            value={input.longestBranchPipeM}
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
                            value={input.totalBranchPipeM}
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
                                    value={input.longestSecondaryPipeM}
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
                                    value={input.totalSecondaryPipeM}
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
                                <button
                                    onClick={() => updateInput('longestSecondaryPipeM', 50)}
                                    className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                                >
                                    + เพิ่มท่อเมนรอง
                                </button>
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
                                    value={input.longestMainPipeM}
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
                                    value={input.totalMainPipeM}
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
                                <button
                                    onClick={() => updateInput('longestMainPipeM', 100)}
                                    className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                                >
                                    + เพิ่มท่อเมนหลัก
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <h3 className="mb-4 mt-6 text-lg font-semibold text-orange-400">⚙️ การตั้งค่าระบบ</h3>

            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                <div>
                    <label className="mb-2 block text-sm font-medium">สปริงเกอร์ต่อต้น</label>
                    <input
                        type="number"
                        step="0.1"
                        value={input.sprinklersPerTree}
                        onChange={(e) =>
                            updateInput('sprinklersPerTree', parseFloat(e.target.value) || 1)
                        }
                        min="0.1"
                        max="5"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="1.000"
                    />
                    <p className="mt-1 text-xs text-gray-400">มักใช้ 1 หัว/ต้น</p>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">เวลารดน้ำ (นาที/ครั้ง)</label>
                    <input
                        type="number"
                        step="1"
                        value={input.irrigationTimeMinutes}
                        onChange={(e) =>
                            updateInput('irrigationTimeMinutes', parseFloat(e.target.value) || 20)
                        }
                        min="5"
                        max="300"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="20"
                    />
                    <p className="mt-1 text-xs text-gray-400">แนะนำ 15-60 นาที</p>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">
                        ความสูงจากปั๊มไปจุดสูงสุด (เมตร)
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        value={input.staticHeadM}
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
                            ต้นไม้ต่อท่อย่อย 1 เส้น (เส้นที่ยาวที่สุด)
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
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            ท่อย่อยต่อท่อรอง 1 เส้น (เส้นที่ยาวที่สุด)
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={input.branchesPerLongestSecondary || input.branchesPerSecondary}
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
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">โซนทำงานพร้อมกัน</label>
                        <select
                            value={input.simultaneousZones}
                            onChange={(e) =>
                                updateInput('simultaneousZones', parseInt(e.target.value, 10) || 1)
                            }
                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        >
                            {Array.from({ length: input.numberOfZones }, (_, i) => i + 1).map(
                                (n) => (
                                    <option key={n} value={n}>
                                        {n} โซน
                                    </option>
                                )
                            )}
                        </select>
                        <p className="mt-1 text-xs text-gray-400">ใช้ในการคำนวณปั๊ม</p>
                    </div>

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
                            แรงดันที่หัวสปริงเกอร์ (เมตร)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={input.pressureHeadM}
                            onChange={(e) =>
                                updateInput('pressureHeadM', parseFloat(e.target.value) || 20)
                            }
                            min="0"
                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            placeholder="20.000"
                        />
                        {sprinklerPressure ? (
                            <p className="mt-1 text-xs text-green-300">
                                💡 จากสปริงเกอร์: {sprinklerPressure.pressureM.toFixed(1)} ม.
                            </p>
                        ) : (
                            <p className="mt-1 text-xs text-gray-400">
                                จะปรับตามสปริงเกอร์ที่เลือก
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* ===== BRANCH PIPE STATISTICS INFO ===== */}
            {branchStats && (
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
            {activeZone && activeZone.plantData && (
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
                            {(activeZone.plantCount / (activeZone.area / 1600)).toFixed(0)} ต้น/ไร่
                        </p>
                    </div>
                </div>
            )}

            {/* ===== SPRINKLER PRESSURE INFO ===== */}
            {selectedSprinkler && sprinklerPressure && (
                <div className="mt-6 rounded bg-blue-900 p-4">
                    <h3 className="mb-2 font-medium text-blue-300">
                        💧 แรงดันจากสปริงเกอร์ที่เลือก
                    </h3>
                    <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-4">
                        <div>
                            <p className="text-blue-200">สปริงเกอร์:</p>
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
                        "แรงดันที่หัวสปริงเกอร์" อัตโนมัติ
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
        </div>
    );
};

export default InputForm;
