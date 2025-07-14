// C:\webchaiyo\Waterapp\resources\js\pages\components\PipeSelector.tsx
import React, { useState } from 'react';
import { CalculationResults, PipeType, IrrigationInput, AnalyzedPipe } from '../types/interfaces';

interface PipeSelectorProps {
    pipeType: PipeType;
    selectedPipe: any;
    onPipeChange: (pipe: any) => void;
    results: CalculationResults;
    input: IrrigationInput;
}

const PipeSelector: React.FC<PipeSelectorProps> = ({
    pipeType,
    selectedPipe,
    onPipeChange,
    results,
    input,
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
                    title: 'เลือกท่อย่อย',
                    titleColor: 'text-purple-400',
                    description: `สำหรับแยกไปสปริงเกอร์ (${input.sprinklersPerBranch} หัว/ท่อ)`,
                    analyzedPipes: results.analyzedBranchPipes || [],
                    rolls: results.branchPipeRolls,
                    flow: results.flows.branch,
                    velocity: results.velocity.branch,
                };
            case 'secondary':
                return {
                    title: 'เลือกท่อเมนรอง',
                    titleColor: 'text-orange-400',
                    description: `รวบรวมน้ำจาก ${input.branchesPerSecondary} ท่อย่อย`,
                    analyzedPipes: results.analyzedSecondaryPipes || [],
                    rolls: results.secondaryPipeRolls,
                    flow: results.flows.secondary,
                    velocity: results.velocity.secondary,
                };
            case 'main':
                return {
                    title: 'เลือกท่อเมนหลัก',
                    titleColor: 'text-cyan-400',
                    description: `ท่อหลักจากปั๊ม (${input.simultaneousZones} โซนพร้อมกัน)`,
                    analyzedPipes: results.analyzedMainPipes || [],
                    rolls: results.mainPipeRolls,
                    flow: results.flows.main,
                    velocity: results.velocity.main,
                };
        }
    };

    const config = getPipeConfig();

    // ใช้ข้อมูลที่ได้จาก database และผ่านการวิเคราะห์แล้วใน useCalculations
    const allPipes = config.analyzedPipes;

    // เรียงลำดับ: แนะนำ > ตัวเลือกดี > ใช้ได้ > อื่นๆ (เรียงตามคะแนน)
    const sortedPipes = allPipes.sort((a, b) => {
        if (a.isRecommended !== b.isRecommended) {
            return b.isRecommended ? 1 : -1;
        }
        if (a.isGoodChoice !== b.isGoodChoice) {
            return b.isGoodChoice ? 1 : -1;
        }
        if (a.isUsable !== b.isUsable) {
            return b.isUsable ? 1 : -1;
        }
        return b.score - a.score; // เรียงตามคะแนนจากมากไปน้อย
    });

    const getRecommendationIcon = (pipe: any) => {
        if (!pipe) return '⚪ ไม่มีข้อมูล';
        if (pipe.isRecommended) return '🌟 แนะนำ';
        if (pipe.isGoodChoice) return '✅ ตัวเลือกดี';
        if (pipe.isUsable) return '⚡ ใช้ได้';
        return '⚠️ ควรพิจารณา';
    };

    const getRecommendationColor = (pipe: any) => {
        if (!pipe) return 'text-gray-300';
        if (pipe.isRecommended) return 'text-green-300';
        if (pipe.isGoodChoice) return 'text-blue-300';
        if (pipe.isUsable) return 'text-yellow-300';
        return 'text-red-300';
    };

    // ฟังก์ชันช่วยในการหา pipe analysis ที่ปลอดภัย
    const getSelectedPipeAnalysis = () => {
        return allPipes.find((p) => p.id === selectedPipe?.id) || null;
    };

    // ฟังก์ชันสำหรับแสดงคำแนะนำสำหรับประเภทท่อ
    const getPipeTypeRecommendation = (pipeType: string, sectionType: PipeType) => {
        const recommendations: Record<PipeType, string[]> = {
            branch: ['LDPE', 'Flexible PE', 'PE-RT', 'PVC'],
            secondary: ['HDPE PE 80', 'HDPE PE 100', 'PVC'],
            main: ['HDPE PE 100', 'HDPE PE 80'],
        };

        const recommendedTypes = recommendations[sectionType];
        return recommendedTypes.includes(pipeType) ? '⭐' : '';
    };

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h3 className={`mb-4 text-lg font-semibold ${config.titleColor}`}>{config.title}</h3>
            <p className="mb-3 text-sm text-gray-300">{config.description}</p>

            {/* แสดงสถานะการโหลดข้อมูล */}
            {/* <div className="mb-3 text-xs text-green-400">
                🔗 ข้อมูลจากฐานข้อมูล: {allPipes.length} รายการ
            </div> */}

            <select
                value={selectedPipe?.id || ''}
                onChange={(e) => {
                    const selected = allPipes.find((p) => p.id === parseInt(e.target.value));
                    onPipeChange(selected);
                }}
                className="mb-4 w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
            >
                <option value="">-- เลือกท่อ --</option>
                {sortedPipes.map((pipe) => (
                    <option key={pipe.id} value={pipe.id}>
                        {pipe.productCode} ({pipe.pipeType} {pipe.sizeMM}mm) - {pipe.price} บาท |
                        {getPipeTypeRecommendation(pipe.pipeType, pipeType)}{' '}
                        {getRecommendationIcon(pipe)}
                    </option>
                ))}
            </select>

            {selectedPipe && (
                <div className="rounded bg-gray-600 p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium text-white">
                            <strong> {selectedPipe.name}</strong>
                        </h4>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-yellow-300">
                                {getPipeTypeRecommendation(selectedPipe.pipeType, pipeType) &&
                                    '⭐ เหมาะสำหรับท่อนี้'}
                            </span>
                            <span
                                className={`text-sm font-bold ${getRecommendationColor(getSelectedPipeAnalysis())}`}
                            >
                                {getRecommendationIcon(getSelectedPipeAnalysis())}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-10 items-center justify-between gap-3 text-sm">
                        <div className="col-span-2 flex items-center justify-center">
                            {selectedPipe.image ? (
                                <img
                                    src={selectedPipe.image}
                                    alt={selectedPipe.name}
                                    className="flex h-auto w-[85px] cursor-pointer items-center justify-center rounded border border-gray-500 transition-opacity hover:border-blue-400 hover:opacity-80"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                    onClick={() =>
                                        openImageModal(selectedPipe.image, selectedPipe.name)
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
                                {selectedPipe.productCode || selectedPipe.product_code}
                            </p>
                            <p>
                                <strong>ประเภท:</strong> {selectedPipe.pipeType}
                            </p>
                            <p>
                                <strong>ขนาด:</strong> {selectedPipe.sizeMM} มม.
                                {selectedPipe.sizeInch && ` (${selectedPipe.sizeInch}")`}
                            </p>
                            <p>
                                <strong>ความยาวต่อม้วน:</strong> {selectedPipe.lengthM} เมตร
                            </p>
                            <p>
                                <strong>ความดัน:</strong> PN{selectedPipe.pn}
                            </p>
                            <p>
                                <strong>อัตราการไหล:</strong> {config.flow.toFixed(1)} LPM
                            </p>
                        </div>
                        <div className="col-span-4">
                            {selectedPipe.brand && (
                                <p>
                                    <strong>แบรนด์:</strong> {selectedPipe.brand}
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
                                <strong>ราคาต่อม้วน:</strong> {selectedPipe.price.toLocaleString()}{' '}
                                บาท
                            </p>
                            <p>
                                <strong>ราคารวม:</strong>{' '}
                                <span className="text-green-300">
                                    {(selectedPipe.price * config.rolls).toLocaleString()}
                                </span>{' '}
                                บาท
                            </p>
                        </div>
                    </div>

                    {/* แสดงคะแนนและการวิเคราะห์ */}
                    {(() => {
                        const analysis = getSelectedPipeAnalysis();
                        if (analysis && analysis.score > 0) {
                            return (
                                <div className="mt-3 rounded bg-gray-500 p-2">
                                    <h5 className="text-xs font-medium text-yellow-300">
                                        การวิเคราะห์:
                                    </h5>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <p>
                                            คะแนนรวม:{' '}
                                            <span className="font-bold">{analysis.score}</span>/100
                                        </p>
                                        <p>
                                            Head Loss:{' '}
                                            <span className="font-bold">
                                                {analysis.headLoss.toFixed(2)}
                                            </span>{' '}
                                            m
                                        </p>
                                        {/* <p>
                                            จากฐานข้อมูล:{' '}
                                            <span className="font-bold text-green-400">✓</span>
                                        </p> */}
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {/* คำแนะนำการปรับปรุง */}
                    {(() => {
                        const analysis = getSelectedPipeAnalysis();
                        if (analysis && !analysis.isRecommended) {
                            const betterPipes = allPipes.filter((p) => p.isRecommended).slice(0, 2);
                            if (betterPipes.length > 0) {
                                return (
                                    <div className="mt-3 rounded bg-blue-900 p-2">
                                        <p className="text-sm text-blue-300">
                                            💡 <strong>ท่อที่แนะนำ:</strong>{' '}
                                            {betterPipes
                                                .map(
                                                    (p) =>
                                                        `${p.productCode || p.product_code} (${p.sizeMM}mm)`
                                                )
                                                .join(', ')}
                                        </p>
                                    </div>
                                );
                            }
                        }
                        return null;
                    })()}

                    {/* แสดงคำแนะนำสำหรับประเภทท่อที่ไม่เหมาะสม */}
                    {!getPipeTypeRecommendation(selectedPipe.pipeType, pipeType) && (
                        <div className="mt-3 rounded bg-yellow-900 p-2">
                            <p className="text-sm text-yellow-300">
                                ⚠️ <strong>หมายเหตุ:</strong> ประเภทท่อ {selectedPipe.pipeType}{' '}
                                ไม่ใช่ตัวเลือกที่แนะนำสำหรับ
                                {pipeType === 'branch'
                                    ? 'ท่อย่อย'
                                    : pipeType === 'secondary'
                                      ? 'ท่อเมนรอง'
                                      : 'ท่อเมนหลัก'}
                                แต่ยังสามารถใช้งานได้หากเหมาะสมกับการไหลและความเร็ว
                            </p>
                        </div>
                    )}
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

            {/* แสดงสถิติจากฐานข้อมูล */}
            {/* <div className="mt-4 text-xs text-gray-400">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        ท่อที่แนะนำ: <span className="text-green-400">{allPipes.filter(p => p.isRecommended).length}</span>
                    </div>
                    <div>
                        ท่อที่ใช้ได้: <span className="text-yellow-400">{allPipes.filter(p => p.isUsable).length}</span>
                    </div>
                </div>
            </div> */}
        </div>
    );
};

export default PipeSelector;
