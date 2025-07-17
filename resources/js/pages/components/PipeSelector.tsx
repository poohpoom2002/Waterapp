// C:\webchaiyo\Waterapp\resources\js\pages\components\PipeSelector.tsx
import React, { useState } from 'react';
import { CalculationResults, PipeType, IrrigationInput, AnalyzedPipe } from '../types/interfaces';

interface PipeSelectorProps {
    pipeType: PipeType;
    results: CalculationResults;
    input: IrrigationInput;
    selectedPipe?: any; // Current selected pipe (manual or auto)
    onPipeChange: (pipe: any) => void; // Callback when pipe changes
}

const PipeSelector: React.FC<PipeSelectorProps> = ({
    pipeType,
    results,
    input,
    selectedPipe,
    onPipeChange,
}) => {
    // State สำหรับ Modal รูปภาพ
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [modalImageSrc, setModalImageSrc] = useState('');
    const [modalImageAlt, setModalImageAlt] = useState('');

    // ฟังก์ชันเปิด Modal รูปภาพ
    const openImageModal = (src: string, alt: string) => {
        setModalImageSrc(src);
        setModalImageAlt(alt);
        setIsImageModalOpen(true);
    };

    // ฟังก์ชันปิด Modal รูปภาพ
    const closeImageModal = () => {
        setIsImageModalOpen(false);
        setModalImageSrc('');
        setModalImageAlt('');
    };

    const getPipeConfig = () => {
        switch (pipeType) {
            case 'branch':
                return {
                    title: 'ท่อย่อย',
                    titleColor: 'text-purple-400',
                    description: `สำหรับแยกไปสปริงเกอร์ (${input.sprinklersPerBranch} หัว/ท่อ)`,
                    autoSelectedPipe: results.autoSelectedBranchPipe,
                    analyzedPipes: results.analyzedBranchPipes || [],
                    rolls: results.branchPipeRolls,
                    flow: results.flows.branch,
                    velocity: results.velocity.branch,
                };
            case 'secondary':
                return {
                    title: 'ท่อเมนรอง',
                    titleColor: 'text-orange-400',
                    description: `รวบรวมน้ำจาก ${input.branchesPerSecondary} ท่อย่อย`,
                    autoSelectedPipe: results.autoSelectedSecondaryPipe,
                    analyzedPipes: results.analyzedSecondaryPipes || [],
                    rolls: results.secondaryPipeRolls,
                    flow: results.flows.secondary,
                    velocity: results.velocity.secondary,
                };
            case 'main':
                return {
                    title: 'ท่อเมนหลัก',
                    titleColor: 'text-cyan-400',
                    description: `ท่อหลักจากปั๊ม (${input.simultaneousZones} โซนพร้อมกัน)`,
                    autoSelectedPipe: results.autoSelectedMainPipe,
                    analyzedPipes: results.analyzedMainPipes || [],
                    rolls: results.mainPipeRolls,
                    flow: results.flows.main,
                    velocity: results.velocity.main,
                };
        }
    };

    const config = getPipeConfig();

    // Use selectedPipe if provided, otherwise use auto-selected
    const currentPipe = selectedPipe || config.autoSelectedPipe;

    // Sort pipes for dropdown (recommended first, then by score)
    const sortedPipes = config.analyzedPipes.sort((a, b) => {
        if (a.isRecommended !== b.isRecommended) {
            return b.isRecommended ? 1 : -1;
        }
        if (a.isGoodChoice !== b.isGoodChoice) {
            return b.isGoodChoice ? 1 : -1;
        }
        if (a.isUsable !== b.isUsable) {
            return b.isUsable ? 1 : -1;
        }
        return b.score - a.score;
    });

    // ฟังก์ชันแสดงสถานะการเลือก
    const getSelectionStatus = (pipe: any) => {
        if (!pipe) return null;

        const isAutoSelected = pipe.id === config.autoSelectedPipe?.id;

        if (isAutoSelected) {
            if (pipe.isRecommended) {
                return '🤖⭐ เลือกอัตโนมัติ (แนะนำ)';
            } else if (pipe.isGoodChoice) {
                return '🤖✅ เลือกอัตโนมัติ (ดี)';
            } else if (pipe.isUsable) {
                return '🤖⚡ เลือกอัตโนมัติ (ใช้ได้)';
            } else {
                return '🤖⚠️ เลือกอัตโนมัติ (ตัวดีที่สุดที่มี)';
            }
        } else {
            return '👤 เลือกเอง';
        }
    };

    // ฟังก์ชันสำหรับจัดกลุ่มท่อ
    const getPipeGrouping = (pipe: any) => {
        if (pipe.isRecommended) return 'แนะนำ';
        if (pipe.isGoodChoice) return 'ตัวเลือกดี';
        if (pipe.isUsable) return 'ใช้ได้';
        return 'อื่นๆ';
    };

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h3 className={`mb-4 text-lg font-semibold ${config.titleColor}`}>
                {config.title}
                <span className="ml-2 text-sm font-normal text-gray-400">
                    (🤖 เลือกอัตโนมัติ + ปรับแต่งได้)
                </span>
            </h3>
            <p className="mb-3 text-sm text-gray-300">{config.description}</p>

            {/* Pipe Selection Dropdown */}
            <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-300">
                    เลือกท่อ{config.title}:
                </label>
                <select
                    value={currentPipe?.id || ''}
                    onChange={(e) => {
                        const selected = config.analyzedPipes.find(
                            (p) => p.id === parseInt(e.target.value)
                        );
                        onPipeChange(selected || null);
                    }}
                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                >
                    <option value="">-- ใช้การเลือกอัตโนมัติ --</option>
                    {sortedPipes.map((pipe) => {
                        const group = getPipeGrouping(pipe);
                        const isAuto = pipe.id === config.autoSelectedPipe?.id;
                        return (
                            <option key={pipe.id} value={pipe.id}>
                                {isAuto ? '🤖 ' : ''}
                                {pipe.name || pipe.productCode} - {pipe.sizeMM}mm -
                                {pipe.price?.toLocaleString()} บาท | {group} | คะแนน: {pipe.score}
                            </option>
                        );
                    })}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                    เว้นว่างไว้เพื่อใช้การเลือกอัตโนมัติ หรือเลือกท่อที่ต้องการ
                </p>
            </div>

            {currentPipe ? (
                <div className="rounded bg-gray-600 p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium text-white">
                            <strong> {currentPipe?.name || currentPipe?.productCode}</strong>
                        </h4>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-green-300">
                                คะแนน: {currentPipe?.score}/100
                            </span>
                        </div>
                    </div>

                    {/* แสดงสถานะการเลือก */}
                    <div className="mb-3 rounded bg-blue-900 p-2">
                        <p className="text-sm text-blue-300">{getSelectionStatus(currentPipe)}</p>
                    </div>

                    <div className="grid grid-cols-10 items-center justify-between gap-3 text-sm">
                        <div className="col-span-2 flex items-center justify-center">
                            {currentPipe?.image ? (
                                <img
                                    src={currentPipe.image}
                                    alt={currentPipe?.name || currentPipe?.productCode || ''}
                                    className="flex h-auto w-[85px] cursor-pointer items-center justify-center rounded border border-gray-500 transition-opacity hover:border-blue-400 hover:opacity-80"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                    onClick={() =>
                                        openImageModal(
                                            currentPipe?.image || '',
                                            currentPipe?.name || currentPipe?.productCode || ''
                                        )
                                    }
                                    title="คลิกเพื่อดูรูปขนาดใหญ่"
                                />
                            ) : (
                                <div className="flex h-[60px] w-[85px] items-center justify-center rounded bg-gray-500 text-xs text-gray-300">
                                    ไม่มีรูป
                                </div>
                            )}
                        </div>
                        <div className="col-span-4">
                            <p>
                                <strong>รหัสสินค้า:</strong>{' '}
                                {currentPipe?.productCode || currentPipe?.product_code}
                            </p>
                            <p>
                                <strong>ประเภท:</strong> {currentPipe?.pipeType}
                            </p>
                            <p>
                                <strong>ขนาด:</strong> {currentPipe?.sizeMM} มม.
                                {currentPipe?.sizeInch && ` (${currentPipe.sizeInch}")`}
                            </p>
                            <p>
                                <strong>ความยาวต่อม้วน:</strong> {currentPipe?.lengthM} เมตร
                            </p>
                            <p>
                                <strong>ความดัน:</strong> PN{currentPipe?.pn}
                            </p>
                            <p>
                                <strong>อัตราการไหล:</strong> {config.flow.toFixed(1)} LPM
                            </p>
                        </div>
                        <div className="col-span-4">
                            {currentPipe?.brand && (
                                <p>
                                    <strong>แบรนด์:</strong> {currentPipe.brand}
                                </p>
                            )}

                            <p>
                                <strong>ความเร็ว:</strong>{' '}
                                <span
                                    className={`${
                                        config.velocity > 2.5
                                            ? 'text-red-400'
                                            : config.velocity < 0.3
                                              ? 'text-blue-400'
                                              : 'text-green-400'
                                    }`}
                                >
                                    {config.velocity.toFixed(2)} m/s
                                </span>
                            </p>
                            <p>
                                <strong>จำนวนม้วน:</strong>{' '}
                                <span className="text-yellow-300">{config.rolls}</span> ม้วน
                            </p>
                            <p>
                                <strong>ราคาต่อม้วน:</strong> {currentPipe?.price?.toLocaleString()}{' '}
                                บาท
                            </p>
                            <p>
                                <strong>ราคารวม:</strong>{' '}
                                <span className="text-green-300">
                                    {((currentPipe?.price || 0) * config.rolls).toLocaleString()}
                                </span>{' '}
                                บาท
                            </p>
                        </div>
                    </div>

                    {/* แสดงคะแนนและการวิเคราะห์ */}
                    <div className="mt-3 rounded bg-gray-500 p-2">
                        <h5 className="text-xs font-medium text-yellow-300">การวิเคราะห์:</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <p>
                                คะแนนรวม: <span className="font-bold">{currentPipe?.score}</span>
                                /100
                            </p>
                            <p>
                                Head Loss:{' '}
                                <span className="font-bold">
                                    {currentPipe?.headLoss?.toFixed(2)}
                                </span>{' '}
                                m
                            </p>
                        </div>
                        <div className="mt-1 text-xs">
                            <p>
                                ความเหมาะสม:
                                <span
                                    className={`ml-1 font-bold ${
                                        currentPipe?.isRecommended
                                            ? 'text-green-300'
                                            : currentPipe?.isGoodChoice
                                              ? 'text-yellow-300'
                                              : currentPipe?.isUsable
                                                ? 'text-orange-300'
                                                : 'text-red-300'
                                    }`}
                                >
                                    {currentPipe?.isRecommended
                                        ? '⭐ แนะนำ'
                                        : currentPipe?.isGoodChoice
                                          ? '✅ ดี'
                                          : currentPipe?.isUsable
                                            ? '⚡ ใช้ได้'
                                            : '⚠️ ไม่เหมาะสม'}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* แสดงการตรวจสอบความเร็ว */}
                    <div className="mt-3 rounded bg-purple-900 p-2">
                        <h5 className="text-xs font-medium text-purple-300">การตรวจสอบ:</h5>
                        <div className="text-xs">
                            <p>
                                ความเร็วน้ำ:
                                <span
                                    className={`ml-1 font-bold ${
                                        config.velocity >= 0.8 && config.velocity <= 2.0
                                            ? 'text-green-300'
                                            : config.velocity >= 0.3 && config.velocity <= 2.5
                                              ? 'text-yellow-300'
                                              : 'text-red-300'
                                    }`}
                                >
                                    {config.velocity >= 0.8 && config.velocity <= 2.0
                                        ? '✅ อยู่ในช่วงที่เหมาะสม'
                                        : config.velocity >= 0.3 && config.velocity <= 2.5
                                          ? '⚠️ ใช้ได้ แต่ควรติดตาม'
                                          : '❌ อยู่นอกช่วงที่แนะนำ'}
                                </span>
                            </p>
                            <p className="mt-1 text-gray-400">
                                แนะนำ: 0.8-2.0 m/s (ยอมรับได้: 0.3-2.5 m/s)
                            </p>
                        </div>
                    </div>

                    {/* แสดงความแตกต่างจากการเลือกอัตโนมัติ */}
                    {selectedPipe &&
                        selectedPipe.id !== config.autoSelectedPipe?.id &&
                        config.autoSelectedPipe && (
                            <div className="mt-3 rounded bg-yellow-900 p-2">
                                <h5 className="text-xs font-medium text-yellow-300">
                                    เปรียบเทียบกับการเลือกอัตโนมัติ:
                                </h5>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <p className="text-gray-300">
                                            อัตโนมัติ: {config.autoSelectedPipe.productCode}
                                        </p>
                                        <p className="text-gray-300">
                                            ขนาด: {config.autoSelectedPipe.sizeMM}mm
                                        </p>
                                        <p className="text-gray-300">
                                            คะแนน: {config.autoSelectedPipe.score}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-white">
                                            เลือกเอง: {selectedPipe.productCode}
                                        </p>
                                        <p className="text-white">ขนาด: {selectedPipe.sizeMM}mm</p>
                                        <p className="text-white">คะแนน: {selectedPipe.score}</p>
                                    </div>
                                </div>
                                <div className="mt-1 text-xs">
                                    <p className="text-yellow-200">
                                        ส่วนต่าง:
                                        <span
                                            className={`ml-1 font-bold ${
                                                selectedPipe.score >= config.autoSelectedPipe.score
                                                    ? 'text-green-300'
                                                    : 'text-red-300'
                                            }`}
                                        >
                                            {selectedPipe.score >= config.autoSelectedPipe.score
                                                ? '+'
                                                : ''}
                                            {(
                                                selectedPipe.score - config.autoSelectedPipe.score
                                            ).toFixed(1)}{' '}
                                            คะแนน
                                        </span>
                                    </p>
                                </div>
                            </div>
                        )}
                </div>
            ) : (
                <div className="rounded bg-gray-600 p-4 text-center">
                    <p className="text-gray-300">ไม่สามารถหาท่อประเภทนี้ได้</p>
                    <p className="mt-1 text-sm text-gray-400">อาจไม่มีข้อมูลท่อที่เหมาะสมในระบบ</p>
                </div>
            )}

            {/* Modal สำหรับแสดงรูปขนาดใหญ่ */}
            {isImageModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
                    onClick={closeImageModal}
                >
                    <div className="relative max-h-[90vh] max-w-[90vw] p-4">
                        {/* ปุ่มปิด */}
                        <button
                            onClick={closeImageModal}
                            className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700"
                            title="ปิด"
                        >
                            ✕
                        </button>

                        {/* รูปภาพ */}
                        <img
                            src={modalImageSrc}
                            alt={modalImageAlt}
                            className="max-h-full max-w-full rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()} // ป้องกันไม่ให้ปิด modal เมื่อคลิกที่รูป
                        />

                        {/* ชื่อรูป */}
                        <div className="mt-2 text-center">
                            <p className="inline-block rounded bg-black bg-opacity-50 px-2 py-1 text-sm text-white">
                                {modalImageAlt}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PipeSelector;
