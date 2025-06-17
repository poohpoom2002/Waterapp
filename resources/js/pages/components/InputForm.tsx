// components/InputForm.tsx
import React from 'react';
import { IrrigationInput } from '../types/interfaces';

interface InputFormProps {
    input: IrrigationInput;
    onInputChange: (input: IrrigationInput) => void;
}

const InputForm: React.FC<InputFormProps> = ({ input, onInputChange }) => {
    const updateInput = (field: keyof IrrigationInput, value: number) => {
        onInputChange({
            ...input,
            [field]: value,
        });
    };

    return (
        <div className="mb-8 rounded-lg bg-gray-700 p-6">
            <h2 className="mb-4 text-xl font-semibold text-green-400">ข้อมูลพื้นฐาน</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                    <label className="mb-2 block text-sm font-medium">ขนาดพื้นที่ (ไร่)</label>
                    <input
                        type="number"
                        value={input.farmSizeRai}
                        onChange={(e) => updateInput('farmSizeRai', parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">จำนวนต้นไม้ (ต้น)</label>
                    <input
                        type="number"
                        value={input.totalTrees}
                        onChange={(e) => updateInput('totalTrees', parseInt(e.target.value) || 0)}
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">น้ำต่อต้น (ลิตร/วัน)</label>
                    <input
                        type="number"
                        value={input.waterPerTreeLiters}
                        onChange={(e) => updateInput('waterPerTreeLiters', parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">จำนวนโซน</label>
                    <input
                        type="number"
                        value={input.numberOfZones}
                        onChange={(e) => updateInput('numberOfZones', parseInt(e.target.value) || 1)}
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">สปริงเกอร์ต่อต้น</label>
                    <input
                        type="number"
                        step="0.1"
                        value={input.sprinklersPerTree}
                        onChange={(e) => updateInput('sprinklersPerTree', parseFloat(e.target.value) || 1)}
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">เวลารดน้ำ (นาที/วัน)</label>
                    <input
                        type="number"
                        step="1"
                        value={input.irrigationTimeMinutes}
                        onChange={(e) => updateInput('irrigationTimeMinutes', parseFloat(e.target.value) || 1)}
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">ความสูงจริง (เมตร)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={input.staticHeadM}
                        onChange={(e) => updateInput('staticHeadM', parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="ความสูงจากปั๊มไปจุดสูงสุด"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">แรงดันที่ต้องการ (เมตร)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={input.pressureHeadM}
                        onChange={(e) => updateInput('pressureHeadM', parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="แรงดันที่หัวสปริงเกอร์"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">อายุท่อ (ปี)</label>
                    <input
                        type="number"
                        min="0"
                        max="20"
                        value={input.pipeAgeYears}
                        onChange={(e) => updateInput('pipeAgeYears', parseInt(e.target.value) || 0)}
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        placeholder="0 = ท่อใหม่"
                    />
                </div>
            </div>

            {/* การตั้งค่าระบบ */}
            <h3 className="mb-4 mt-6 text-lg font-semibold text-orange-400">การตั้งค่าระบบ</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                    <label className="mb-2 block text-sm font-medium">สปริงเกอร์ต่อท่อย่อย 1 เส้น</label>
                    <input
                        type="number"
                        min="1"
                        value={input.sprinklersPerBranch}
                        onChange={(e) => updateInput('sprinklersPerBranch', parseInt(e.target.value) || 1)}
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">ท่อย่อยต่อท่อรอง 1 เส้น</label>
                    <input
                        type="number"
                        min="1"
                        value={input.branchesPerSecondary}
                        onChange={(e) => updateInput('branchesPerSecondary', parseInt(e.target.value) || 1)}
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium">โซนทำงานพร้อมกัน</label>
                    <input
                        type="number"
                        min="1"
                        max={input.numberOfZones}
                        value={input.simultaneousZones}
                        onChange={(e) => updateInput('simultaneousZones', parseInt(e.target.value) || 1)}
                        className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                    />
                </div>
            </div>

            {/* ข้อมูลท่อ */}
            <h3 className="mb-4 mt-6 text-lg font-semibold text-blue-400">ข้อมูลท่อ</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <h4 className="text-md font-medium text-purple-300">ท่อย่อย (Branch Pipe)</h4>
                    <div>
                        <label className="mb-2 block text-sm font-medium">ท่อย่อยเส้นที่ยาวที่สุด (เมตร)</label>
                        <input
                            type="number"
                            value={input.longestBranchPipeM}
                            onChange={(e) => updateInput('longestBranchPipeM', parseFloat(e.target.value) || 0)}
                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium">ท่อย่อยรวมทั้งหมด (เมตร)</label>
                        <input
                            type="number"
                            value={input.totalBranchPipeM}
                            onChange={(e) => updateInput('totalBranchPipeM', parseFloat(e.target.value) || 0)}
                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-md font-medium text-orange-300">ท่อเมนรอง (Secondary Pipe)</h4>
                    <div>
                        <label className="mb-2 block text-sm font-medium">ท่อเมนรองเส้นที่ยาวที่สุด (เมตร)</label>
                        <input
                            type="number"
                            value={input.longestSecondaryPipeM}
                            onChange={(e) => updateInput('longestSecondaryPipeM', parseFloat(e.target.value) || 0)}
                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium">ท่อเมนรองรวมทั้งหมด (เมตร)</label>
                        <input
                            type="number"
                            value={input.totalSecondaryPipeM}
                            onChange={(e) => updateInput('totalSecondaryPipeM', parseFloat(e.target.value) || 0)}
                            className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                        />
                    </div>
                </div>

                <div className="space-y-4 md:col-span-2">
                    <h4 className="text-md font-medium text-cyan-300">ท่อเมนหลัก (Main Pipe)</h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium">ท่อเมนหลักเส้นที่ยาวที่สุด (เมตร)</label>
                            <input
                                type="number"
                                value={input.longestMainPipeM}
                                onChange={(e) => updateInput('longestMainPipeM', parseFloat(e.target.value) || 0)}
                                className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">ท่อเมนหลักรวมทั้งหมด (เมตร)</label>
                            <input
                                type="number"
                                value={input.totalMainPipeM}
                                onChange={(e) => updateInput('totalMainPipeM', parseFloat(e.target.value) || 0)}
                                className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InputForm;