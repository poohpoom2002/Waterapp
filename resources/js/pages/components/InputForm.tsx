// C:\webchaiyo\Waterapp\resources\js\pages\components\InputForm.tsx
import React from 'react';
import { IrrigationInput } from '../types/interfaces';
import { formatNumber } from '../utils/calculations';

interface InputFormProps {
    input: IrrigationInput;
    onInputChange: (input: IrrigationInput) => void;
    selectedSprinkler?: any; // เพิ่ม prop สำหรับสปริงเกอร์ที่เลือก
}

const InputForm: React.FC<InputFormProps> = ({ input, onInputChange, selectedSprinkler }) => {
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
            sprinklerName: selectedSprinkler.productCode
        };
    };

    const sprinklerPressure = getSprinklerPressureInfo();

    return (
        <div className="mb-8 rounded-lg bg-gray-700 p-6">
            <h2 className="mb-4 text-xl font-semibold text-green-400">ข้อมูลพื้นฐาน</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                <div>
                    <label className="mb-2 block text-sm font-medium">ขนาดพื้นที่ (ไร่)</label>
                    <input
                        type="number"
                        value={input.farmSizeRai}
                        onChange={(e) =>
                            updateInput('farmSizeRai', parseFloat(e.target.value) || 0)
                        }
                        step="0.001"
                        min="0"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="0.000"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">จำนวนต้นไม้ (ต้น)</label>
                    <input
                        type="number"
                        value={input.totalTrees}
                        onChange={(e) => updateInput('totalTrees', parseInt(e.target.value) || 0)}
                        min="0"
                        step="1"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">น้ำต่อต้น (ลิตร/วัน)</label>
                    <input
                        type="number"
                        value={input.waterPerTreeLiters}
                        onChange={(e) =>
                            updateInput('waterPerTreeLiters', parseFloat(e.target.value) || 0)
                        }
                        step="0.001"
                        min="0"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="0.000"
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
                    />
                </div>
            </div>

            {/* ข้อมูลท่อ */}
            <h3 className="mb-4 mt-6 text-lg font-semibold text-blue-400">ข้อมูลท่อ</h3>
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
                            step="0.001"
                            min="0"
                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            placeholder="30.000"
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
                            step="0.001"
                            min="0"
                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            placeholder="500.000"
                        />
                    </div>
                </div>

                <div className="space-y-4 rounded-lg bg-gray-800 p-4 shadow-lg">
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
                            step="0.001"
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
                                updateInput('totalSecondaryPipeM', parseFloat(e.target.value) || 0)
                            }
                            step="0.001"
                            min="0"
                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            placeholder="400.000 (0 = ไม่มีท่อนี้)"
                        />
                    </div>
                    {/* <div className="rounded bg-yellow-900 p-2 text-xs text-yellow-200">
                        💡 หากไม่มีท่อเมนรอง ให้ใส่ 0 ระบบจะไม่นำมาคำนวณ
                    </div> */}
                </div>

                <div className="space-y-4 rounded-lg bg-gray-800 p-4 shadow-lg">
                    <h4 className="text-md font-medium text-cyan-300">ท่อเมนหลัก (Main Pipe)</h4>
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            ท่อเมนหลักเส้นที่ยาวที่สุด (เมตร)
                        </label>
                        <input
                            type="number"
                            value={input.longestMainPipeM}
                            onChange={(e) =>
                                updateInput('longestMainPipeM', parseFloat(e.target.value) || 0)
                            }
                            step="0.001"
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
                                updateInput('totalMainPipeM', parseFloat(e.target.value) || 0)
                            }
                            step="0.001"
                            min="0"
                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            placeholder="600.000 (0 = ไม่มีท่อนี้)"
                        />
                    </div>
                    {/* <div className="rounded bg-yellow-900 p-2 text-xs text-yellow-200">
                        💡 หากไม่มีท่อเมนหลัก ให้ใส่ 0 ระบบจะไม่นำมาคำนวณ
                    </div> */}
                </div>
            </div>

            {/* การตั้งค่าระบบ */}
            <h3 className="mb-4 mt-6 text-lg font-semibold text-orange-400">การตั้งค่าระบบ</h3>
            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3">
                <div>
                    <label className="mb-2 block text-sm font-medium">สปริงเกอร์ต่อต้น</label>
                    <input
                        type="number"
                        step="0.001"
                        value={input.sprinklersPerTree}
                        onChange={(e) =>
                            updateInput('sprinklersPerTree', parseFloat(e.target.value) || 1)
                        }
                        min="0.001"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="1.000"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">เวลารดน้ำ (นาที/วัน)</label>
                    <input
                        type="number"
                        step="0.001"
                        value={input.irrigationTimeMinutes}
                        onChange={(e) =>
                            updateInput('irrigationTimeMinutes', parseFloat(e.target.value) || 1)
                        }
                        min="0.001"
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
                        step="0.001"
                        value={input.staticHeadM}
                        onChange={(e) =>
                            updateInput('staticHeadM', parseFloat(e.target.value) || 0)
                        }
                        min="0"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="0.000 (ความสูงจากปั๊มไปจุดสูงสุด)"
                    />
                </div>
                {/* <div className="relative">
                    <label className="mb-2 block text-sm font-medium">
                        แรงดันที่ต้องการ (เมตร)
                        {sprinklerPressure && (
                            <span className="text-xs text-yellow-300 block">
                                จะถูกแทนที่ด้วยค่าจากสปริงเกอร์
                            </span>
                        )}
                    </label>
                    <input
                        type="number"
                        step="0.001"
                        value={input.pressureHeadM}
                        onChange={(e) =>
                            updateInput('pressureHeadM', parseFloat(e.target.value) || 0)
                        }
                        min="0"
                        className={`w-full rounded border border-gray-500 p-2 text-white focus:border-blue-400 ${
                            sprinklerPressure ? 'bg-gray-500' : 'bg-gray-600'
                        }`}
                        placeholder="2.000 (แรงดันที่หัวสปริงเกอร์)"
                        disabled={!!sprinklerPressure}
                    />
                    {sprinklerPressure && (
                        <div className="mt-1 rounded bg-blue-900 p-2 text-xs text-blue-200">
                            🔄 <strong>ใช้แรงดันจากสปริงเกอร์:</strong><br/>
                            {sprinklerPressure.sprinklerName}: {sprinklerPressure.pressureBar.toFixed(1)} บาร์ 
                            = {sprinklerPressure.pressureM.toFixed(1)} เมตร
                        </div>
                    )}
                </div> */}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                    <label className="mb-2 block text-sm font-medium">
                        สปริงเกอร์ต่อท่อย่อย 1 เส้น
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={input.sprinklersPerBranch}
                        onChange={(e) =>
                            updateInput('sprinklersPerBranch', parseInt(e.target.value) || 1)
                        }
                        step="1"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="4"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">
                        ท่อย่อยต่อท่อรอง 1 เส้น
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={input.branchesPerSecondary}
                        onChange={(e) =>
                            updateInput('branchesPerSecondary', parseInt(e.target.value) || 1)
                        }
                        step="1"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="5"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">โซนทำงานพร้อมกัน</label>
                    <input
                        type="number"
                        min="1"
                        max={input.numberOfZones}
                        value={input.simultaneousZones}
                        onChange={(e) =>
                            updateInput('simultaneousZones', parseInt(e.target.value) || 1)
                        }
                        step="1"
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="1"
                    />
                </div>
            </div>
        </div>
    );
};

export default InputForm;