// C:\webchaiyo\Waterapp\resources\js\pages\components\InputForm.tsx
import React, { useEffect } from 'react';
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
    activeZone?: Zone; // Add zone information
}

const InputForm: React.FC<InputFormProps> = ({
    input,
    onInputChange,
    selectedSprinkler,
    activeZone,
}) => {
    const updateInput = (field: keyof IrrigationInput, value: number) => {
        // Format decimal values to 3 decimal places for display
        const formattedValue = [
            'farmSizeRai',
            'waterPerTreeLiters',
            'sprinklersPerTree',
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
            ? formatNumber(value, 3)
            : Math.round(value);

        onInputChange({
            ...input,
            [field]: formattedValue,
        });
    };

    // คำนวณแรงดันจากสปริงเกอร์ที่เลือก
    const getSprinklerPressureInfo = () => {
        if (!selectedSprinkler) return null;

        const minPressure = Array.isArray(selectedSprinkler.pressureBar)
            ? selectedSprinkler.pressureBar[0]
            : parseFloat(String(selectedSprinkler.pressureBar).split('-')[0]);
        const maxPressure = Array.isArray(selectedSprinkler.pressureBar)
            ? selectedSprinkler.pressureBar[1]
            : parseFloat(String(selectedSprinkler.pressureBar).split('-')[1]);

        const avgPressureBar = (minPressure + maxPressure) / 2;
        const pressureM = avgPressureBar * 10.2; // แปลง bar เป็น เมตร

        return {
            pressureBar: avgPressureBar,
            pressureM: pressureM,
            sprinklerName: selectedSprinkler.productCode,
        };
    };

    // คำนวณข้อมูลท่อย่อยจากข้อมูล Horticulture
    const calculateBranchPipeStats = () => {
        try {
            const longestBranchStats = getLongestBranchPipeStats();
            const subMainBranchCount = getSubMainPipeBranchCount();

            if (!longestBranchStats || !subMainBranchCount) {
                console.log('ไม่พบข้อมูลท่อย่อยจากระบบ Horticulture');
                return null;
            }

            // หาท่อย่อยที่ยาวที่สุดและจำนวนต้นไม้ในท่อย่อยนั้น
            let maxPlantCount = 0;
            let maxBranchLength = 0;

            longestBranchStats.forEach((zone) => {
                if (zone.longestBranchPipe.plantCount > maxPlantCount) {
                    maxPlantCount = zone.longestBranchPipe.plantCount;
                }
                if (zone.longestBranchPipe.length > maxBranchLength) {
                    maxBranchLength = zone.longestBranchPipe.length;
                }
            });

            // หาท่อเมนรองที่ยาวที่สุดและจำนวนท่อย่อยที่ออกจากท่อนั้น
            let maxBranchCount = 0;
            let maxSecondaryLength = 0;

            subMainBranchCount.forEach((zone) => {
                zone.subMainPipes.forEach((subMain) => {
                    if (subMain.branchCount > maxBranchCount) {
                        maxBranchCount = subMain.branchCount;
                    }
                    if (subMain.length > maxSecondaryLength) {
                        maxSecondaryLength = subMain.length;
                    }
                });
            });

            return {
                sprinklersPerLongestBranch: maxPlantCount,
                branchesPerLongestSecondary: maxBranchCount,
                longestBranchLength: maxBranchLength,
                longestSecondaryLength: maxSecondaryLength,
            };
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการคำนวณข้อมูลท่อย่อย:', error);
            return null;
        }
    };

    // อัพเดทข้อมูลท่อย่อยเมื่อโหลดข้อมูล
    useEffect(() => {
        const branchStats = calculateBranchPipeStats();
        if (branchStats) {
            // อัพเดทเฉพาะฟิลด์ที่เกี่ยวข้องกับท่อย่อย
            onInputChange({
                ...input,
                sprinklersPerLongestBranch: branchStats.sprinklersPerLongestBranch,
                branchesPerLongestSecondary: branchStats.branchesPerLongestSecondary,
            });
        }
    }, [activeZone]); // รันเมื่อ activeZone เปลี่ยน

    const sprinklerPressure = getSprinklerPressureInfo();

    return (
        <div className="mb-8 rounded-lg bg-gray-700 p-6">
            {/* Zone Information Header */}
            {activeZone && (
                <div className="mb-4 rounded bg-blue-900 p-3">
                    <h3 className="text-lg font-semibold text-blue-300">🌱 {activeZone.name}</h3>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                        <p>พื้นที่: {(activeZone.area / 1600).toFixed(2)} ไร่</p>
                        <p>จำนวนต้น: {activeZone.plantCount} ต้น</p>
                        <p>พืชที่ปลูก: {activeZone.plantData?.name || 'ไม่ระบุ'}</p>
                        <p>ความต้องการน้ำ: {activeZone.totalWaterNeed.toFixed(0)} ลิตร/ครั้ง</p>
                    </div>
                </div>
            )}

            <h2 className="mb-4 text-xl font-semibold text-green-400">ข้อมูลพื้นฐาน</h2>
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
                        // readOnly={!!activeZone} // Read-only if zone data exists
                    />
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
                        min="0"
                        step="1"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="0"
                        // readOnly={!!activeZone} // Read-only if zone data exists
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">น้ำต่อต้น (ลิตร/ครั้ง)</label>
                    <input
                        type="number"
                        value={input.waterPerTreeLiters}
                        onChange={(e) =>
                            updateInput('waterPerTreeLiters', parseFloat(e.target.value) || 0)
                        }
                        step="0.1"
                        min="0"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="0.000"
                        // readOnly={!!activeZone} // Read-only if zone data exists
                    />
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
                        // readOnly={!!activeZone} // Read-only if zone data exists
                    />
                </div>
            </div>

            {/* ข้อมูลท่อ */}
            <h3 className="mb-4 mt-6 text-lg font-semibold text-blue-400">
                ข้อมูลท่อ
                {activeZone && (
                    <span className="ml-2 text-sm font-normal text-gray-400">
                        (จากระบบ Horticulture)
                    </span>
                )}
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="space-y-4 rounded-lg bg-gray-800 p-4 shadow-lg">
                    <h4 className="text-md font-medium text-purple-300">ท่อย่อย (Branch Pipe)</h4>
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
                            // readOnly={!!activeZone}
                        />
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
                            // readOnly={!!activeZone}
                        />
                    </div>
                </div>

                <div className="space-y-4 rounded-lg bg-gray-800 p-4 shadow-lg">
                    {input.longestSecondaryPipeM > 0 ? (
                        <>
                            <h4 className="text-md font-medium text-orange-300">
                                ท่อเมนรอง (Secondary Pipe)
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
                                    // readOnly={!!activeZone}
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
                                    // readOnly={!!activeZone}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center rounded bg-gray-900 p-2 text-center text-gray-400">
                            ไม่ได้ใช้ท่อเมนรอง
                        </div>
                    )}
                </div>

                <div className="space-y-4 rounded-lg bg-gray-800 p-4 shadow-lg">
                    {input.longestMainPipeM > 0 ? (
                        <>
                            <h4 className="text-md font-medium text-cyan-300">
                                ท่อเมนหลัก (Main Pipe)
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
                                    // readOnly={!!activeZone}
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
                                    // readOnly={!!activeZone}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center rounded bg-gray-900 p-2 text-center text-gray-400">
                            ไม่ได้ใช้ท่อเมนหลัก
                        </div>
                    )}
                </div>
            </div>

            {/* การตั้งค่าระบบ */}
            <h3 className="mb-4 mt-6 text-lg font-semibold text-orange-400">การตั้งค่าระบบ</h3>
            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3">
                <div>
                    <label className="mb-2 block text-sm font-medium">สปริงเกอร์ต่อต้น</label>
                    <input
                        type="number"
                        step="1"
                        value={input.sprinklersPerTree}
                        onChange={(e) =>
                            updateInput('sprinklersPerTree', parseFloat(e.target.value) || 1)
                        }
                        min="1"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="1.000"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">เวลารดน้ำ (นาที/ครั้ง)</label>
                    <input
                        type="number"
                        step="0.5"
                        value={input.irrigationTimeMinutes}
                        onChange={(e) =>
                            updateInput('irrigationTimeMinutes', parseFloat(e.target.value) || 1)
                        }
                        min="1"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="30.000"
                    />
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
                        placeholder="0.000 (ความสูงจากปั๊มไปจุดสูงสุด)"
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                    <label className="mb-2 block text-sm font-medium">
                        ต้นไม้ต่อท่อย่อย 1 เส้น(เส้นที่ยาวที่สุด)
                        {activeZone && (
                            <span className="ml-1 text-xs text-green-400">
                                (จากระบบ Horticulture)
                            </span>
                        )}
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={input.sprinklersPerLongestBranch || input.sprinklersPerBranch}
                        onChange={(e) =>
                            updateInput('sprinklersPerLongestBranch', parseInt(e.target.value) || 1)
                        }
                        step="1"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="4"
                        // readOnly={!!activeZone}
                    />
                    {activeZone && (
                        <p className="mt-1 text-xs text-green-300">
                            💡 คำนวณจากท่อย่อยที่ยาวที่สุดในระบบ Horticulture
                        </p>
                    )}
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">
                        ท่อย่อยต่อท่อรอง 1 เส้น(เส้นที่ยาวที่สุด)
                        {activeZone && (
                            <span className="ml-1 text-xs text-green-400">
                                (จากระบบ Horticulture)
                            </span>
                        )}
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
                        // readOnly={!!activeZone}
                    />
                    {activeZone && (
                        <p className="mt-1 text-xs text-green-300">
                            💡 คำนวณจากท่อเมนรองที่ยาวที่สุดในระบบ Horticulture
                        </p>
                    )}
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
                        {Array.from({ length: input.numberOfZones }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Branch Pipe Statistics Info */}
            {activeZone && (
                <div className="mt-6 rounded bg-purple-900 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-purple-300">
                        📊 สถิติท่อย่อยจากระบบ Horticulture
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                        <p>
                            ต้นไม้ในท่อย่อยที่ยาวที่สุด: {input.sprinklersPerLongestBranch || 0} ต้น
                        </p>
                        <p>
                            ท่อย่อยจากท่อเมนรองที่ยาวที่สุด:{' '}
                            {input.branchesPerLongestSecondary || 0} เส้น
                        </p>
                        <p>ท่อย่อยที่ยาวที่สุด: {input.longestBranchPipeM} ม.</p>
                        <p>ท่อเมนรองที่ยาวที่สุด: {input.longestSecondaryPipeM} ม.</p>
                    </div>
                    <p className="mt-2 text-xs text-purple-200">
                        💡 ข้อมูลนี้ถูกคำนวณอัตโนมัติจากระบบออกแบบ Horticulture
                    </p>
                </div>
            )}

            {/* Plant-specific water requirements */}
            {activeZone && activeZone.plantData && (
                <div className="mt-6 rounded bg-green-900 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-green-300">
                        📋 ข้อมูลการปลูกพืชในโซน
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                        <p>ชนิดพืช: {activeZone.plantData.name}</p>
                        <p>ระยะปลูก: {activeZone.plantData.plantSpacing} ม.</p>
                        <p>ระยะแถว: {activeZone.plantData.rowSpacing} ม.</p>
                        <p>น้ำ/ต้น/วัน: {activeZone.plantData.waterNeed} ลิตร</p>
                    </div>
                </div>
            )}

            {/* Sprinkler Pressure Info */}
            {selectedSprinkler && (
                <div className="mt-6 rounded bg-blue-900 p-4">
                    <h3 className="mb-2 font-medium text-blue-300">
                        💧 แรงดันจากสปริงเกอร์ที่เลือก
                    </h3>
                    <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                        <p>
                            <strong>สปริงเกอร์:</strong> {selectedSprinkler.productCode}
                        </p>
                        <p>
                            <strong>ช่วงแรงดัน:</strong>{' '}
                            {sprinklerPressure?.pressureBar?.toFixed(1)} บาร์
                        </p>
                        <p>
                            <strong>แรงดันที่ใช้คำนวณ:</strong>{' '}
                            {sprinklerPressure?.pressureM.toFixed(1)} เมตร
                        </p>
                    </div>
                    <p className="mt-2 text-xs text-blue-200">
                        💡 ระบบจะใช้แรงดันกลางของช่วงที่สปริงเกอร์รองรับในการคำนวณ Pump Head
                    </p>
                </div>
            )}
        </div>
    );
};

export default InputForm;
