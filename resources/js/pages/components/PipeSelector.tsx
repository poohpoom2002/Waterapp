// resources\js\pages\components\PipeSelector.tsx
import React, { useState } from 'react';
import { CalculationResults, PipeType, IrrigationInput, AnalyzedPipe } from '../types/interfaces';
import { calculatePipeRolls } from '../utils/calculations';

interface PipeSelectorProps {
    pipeType: PipeType;
    results: CalculationResults;
    input: IrrigationInput;
    selectedPipe?: any;
    onPipeChange: (pipe: any) => void;
}

const PipeSelector: React.FC<PipeSelectorProps> = ({
    pipeType,
    results,
    input,
    selectedPipe,
    onPipeChange,
}) => {
    const [showImageModal, setShowImageModal] = useState(false);
    const [modalImage, setModalImage] = useState({ src: '', alt: '' });

    const openImageModal = (src: string, alt: string) => {
        setModalImage({ src, alt });
        setShowImageModal(true);
    };

    const closeImageModal = () => {
        setShowImageModal(false);
        setModalImage({ src: '', alt: '' });
    };

    const getPipeConfig = () => {
        const configs = {
            branch: {
                title: 'ท่อย่อย',
                titleColor: 'text-purple-400',
                description: `สำหรับแยกไปสปริงเกอร์ (${input.sprinklersPerBranch} หัว/ท่อ)`,
                autoSelectedPipe: results.autoSelectedBranchPipe,
                analyzedPipes: results.analyzedBranchPipes || [],
                totalPipeLength: input.totalBranchPipeM,
                longestPipeLength: input.longestBranchPipeM,
                flow: results.flows.branch,
                velocity: results.velocity.branch,
                headLoss: results.headLoss.branch,
            },
            secondary: {
                title: 'ท่อเมนรอง',
                titleColor: 'text-orange-400',
                description: `รวบรวมน้ำจาก ${input.branchesPerSecondary} ท่อย่อย`,
                autoSelectedPipe: results.autoSelectedSecondaryPipe,
                analyzedPipes: results.analyzedSecondaryPipes || [],
                totalPipeLength: input.totalSecondaryPipeM,
                longestPipeLength: input.longestSecondaryPipeM,
                flow: results.flows.secondary,
                velocity: results.velocity.secondary,
                headLoss: results.headLoss.secondary,
            },
            main: {
                title: 'ท่อเมนหลัก',
                titleColor: 'text-cyan-400',
                description: `ท่อหลักจากปั๊ม (${input.simultaneousZones} โซนพร้อมกัน)`,
                autoSelectedPipe: results.autoSelectedMainPipe,
                analyzedPipes: results.analyzedMainPipes || [],
                totalPipeLength: input.totalMainPipeM,
                longestPipeLength: input.longestMainPipeM,
                flow: results.flows.main,
                velocity: results.velocity.main,
                headLoss: results.headLoss.main,
            },
        };
        return configs[pipeType];
    };

    const config = getPipeConfig();
    const currentPipe = selectedPipe || config.autoSelectedPipe;

    const calculateCurrentPipeRolls = (pipe: any): number => {
        if (!pipe || !pipe.lengthM || config.totalPipeLength <= 0) return 0;
        return calculatePipeRolls(config.totalPipeLength, pipe.lengthM);
    };

    const currentRolls = calculateCurrentPipeRolls(currentPipe);

    const sortedPipes = config.analyzedPipes.sort((a, b) => {
        if (a.isRecommended !== b.isRecommended) return b.isRecommended ? 1 : -1;
        if (a.isGoodChoice !== b.isGoodChoice) return b.isGoodChoice ? 1 : -1;
        if (a.isUsable !== b.isUsable) return b.isUsable ? 1 : -1;
        return b.score - a.score;
    });

    const getSelectionStatus = (pipe: any) => {
        if (!pipe) return null;
        const isAutoSelected = pipe.id === config.autoSelectedPipe?.id;

        if (isAutoSelected) {
            if (pipe.isRecommended) return '🤖⭐ เลือกอัตโนมัติ (แนะนำ)';
            if (pipe.isGoodChoice) return '🤖✅ เลือกอัตโนมัติ (ดี)';
            if (pipe.isUsable) return '🤖⚡ เลือกอัตโนมัติ (ใช้ได้)';
            return '🤖⚠️ เลือกอัตโนมัติ (ตัวดีที่สุดที่มี)';
        } else {
            return '👤 เลือกเอง';
        }
    };

    const getPipeGrouping = (pipe: any) => {
        if (pipe.isRecommended) return 'แนะนำ';
        if (pipe.isGoodChoice) return 'ตัวเลือกดี';
        if (pipe.isUsable) return 'ใช้ได้';
        return 'อื่นๆ';
    };

    const getHeadLossPer100m = (pipe: any) => {
        if (!pipe || !config.longestPipeLength || config.longestPipeLength <= 0) return 0;

        let pipeHeadLoss = 0;

        if (pipeType === 'branch') {
            pipeHeadLoss = pipe.headLoss || config.headLoss.total;
        } else if (pipeType === 'secondary') {
            pipeHeadLoss = pipe.headLoss || config.headLoss.total;
        } else if (pipeType === 'main') {
            pipeHeadLoss = pipe.headLoss || config.headLoss.total;
        }

        return (pipeHeadLoss / config.longestPipeLength) * 100;
    };

    const getPerformanceStatus = (pipe: any) => {
        const velocity = config.velocity;
        const headLossPer100m = getHeadLossPer100m(pipe);

        let velocityStatus = 'good';
        let headLossStatus = 'good';

        if (velocity > 2.5 || velocity < 0.3) velocityStatus = 'critical';
        else if (velocity > 2.0 || velocity < 0.6) velocityStatus = 'warning';

        if (headLossPer100m > 12) headLossStatus = 'critical';
        else if (headLossPer100m > 8) headLossStatus = 'warning';

        return { velocityStatus, headLossStatus };
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

            <div className="mb-4 rounded bg-blue-900 p-3">
                <h4 className="mb-2 text-sm font-medium text-blue-300">
                    📏 ข้อมูลและการวิเคราะห์:
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-300 md:grid-cols-4">
                    <div>
                        <p>
                            ระยะท่อรวม:{' '}
                            <span className="font-bold text-blue-300">
                                {config.totalPipeLength.toLocaleString()} ม.
                            </span>
                        </p>
                        <p>
                            ระยะท่อยาวสุด:{' '}
                            <span className="font-bold text-yellow-300">
                                {config.longestPipeLength.toLocaleString()} ม.
                            </span>
                        </p>
                    </div>
                    <div>
                        <p>
                            อัตราการไหล:{' '}
                            <span className="font-bold text-green-300">
                                {config.flow.toFixed(1)} LPM
                            </span>
                        </p>
                        <p>
                            ความเร็ว:{' '}
                            <span
                                className={`font-bold ${config.velocity > 2.5 ? 'text-red-300' : config.velocity < 0.6 ? 'text-blue-300' : 'text-green-300'}`}
                            >
                                {config.velocity.toFixed(2)} m/s
                            </span>
                        </p>
                    </div>
                    <div>
                        <p>
                            Head Loss รวม:{' '}
                            <span className="font-bold text-orange-300">
                                {config.headLoss.total.toFixed(2)} ม.
                            </span>
                        </p>
                        <p>
                            Head Loss/100m:{' '}
                            <span
                                className={`font-bold ${getHeadLossPer100m(currentPipe) > 10 ? 'text-red-300' : getHeadLossPer100m(currentPipe) > 6 ? 'text-yellow-300' : 'text-green-300'}{getHeadLossPer100m(currentPipe) > 5 ? 'text-red-300' : 'text-green-300'}`}
                            >
                                {getHeadLossPer100m(currentPipe).toFixed(2)} ม.
                            </span>
                        </p>
                    </div>
                    {currentPipe && (
                        <div>
                            <p>
                                จำนวนม้วน:{' '}
                                <span className="font-bold text-purple-300">
                                    {currentRolls} ม้วน
                                </span>
                            </p>
                            <p>
                                ประสิทธิภาพ:{' '}
                                <span className="font-bold text-cyan-300">
                                    {(
                                        (config.totalPipeLength /
                                            (currentPipe.lengthM * currentRolls)) *
                                        100
                                    ).toFixed(0)}
                                    %
                                </span>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {results.headLossValidation && (
                <div
                    className={`mb-4 rounded p-3 ${
                        results.headLossValidation.severity === 'critical'
                            ? 'bg-red-900'
                            : results.headLossValidation.severity === 'warning'
                              ? 'bg-yellow-900'
                              : 'bg-green-900'
                    }`}
                >
                    <h4
                        className={`mb-1 text-sm font-medium ${
                            results.headLossValidation.severity === 'critical'
                                ? 'text-red-300'
                                : results.headLossValidation.severity === 'warning'
                                  ? 'text-yellow-300'
                                  : 'text-green-300'
                        }`}
                    >
                        🎯 การตรวจสอบ Head Loss Ratio (ตามรูปภาพ):
                    </h4>
                    <p
                        className={`text-sm ${
                            results.headLossValidation.severity === 'critical'
                                ? 'text-red-200'
                                : results.headLossValidation.severity === 'warning'
                                  ? 'text-yellow-200'
                                  : 'text-green-200'
                        }`}
                    >
                        อัตราส่วน Head Loss: {results.headLossValidation.ratio}% -{' '}
                        {results.headLossValidation.recommendation}
                    </p>
                </div>
            )}

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
                        const rolls = calculateCurrentPipeRolls(pipe);
                        const currentHeadLossPer100m = getHeadLossPer100m(pipe);
                        return (
                            <option key={pipe.id} value={pipe.id}>
                                {isAuto ? '🤖 ' : ''}
                                {pipe.name || pipe.productCode} - {pipe.sizeMM}mm -{' '}
                                {pipe.price?.toLocaleString()} บาท/ม้วน ({rolls} ม้วน) | {group} |
                                คะแนน: {pipe.score} | Loss: {currentHeadLossPer100m.toFixed(1)}
                                m/100m
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
                            <strong>{currentPipe?.name || currentPipe?.productCode}</strong>
                        </h4>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-green-300">
                                คะแนน: {currentPipe?.score}/100
                            </span>
                        </div>
                    </div>

                    <div className="mb-3 rounded bg-blue-900 p-2">
                        <p className="text-sm text-blue-300">{getSelectionStatus(currentPipe)}</p>
                    </div>

                    <div className="grid grid-cols-10 items-center justify-between gap-3 text-sm">
                        <div className="col-span-2 flex items-center justify-center">
                            {currentPipe?.image ? (
                                <img
                                    src={currentPipe.image}
                                    alt={currentPipe?.name || currentPipe?.productCode || ''}
                                    className="h-auto w-[85px] cursor-pointer rounded border border-gray-500 transition-opacity hover:border-blue-400 hover:opacity-80"
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
                                            : config.velocity < 0.6
                                              ? 'text-blue-400'
                                              : 'text-green-400'
                                    }`}
                                >
                                    {config.velocity.toFixed(2)} m/s
                                </span>
                            </p>
                            <p>
                                <strong>Head Loss:</strong>{' '}
                                <span className="text-orange-300">
                                    {config.headLoss.total.toFixed(2)} ม.
                                </span>
                            </p>
                            <p>
                                <strong>Loss/100ม:</strong>{' '}
                                <span
                                    className={`${
                                        getHeadLossPer100m(currentPipe) > 5
                                            ? 'text-red-300'
                                            : 'text-green-300'
                                    }`}
                                >
                                    {getHeadLossPer100m(currentPipe).toFixed(1)} ม.
                                </span>
                            </p>
                            <p>
                                <strong>จำนวนม้วน:</strong>{' '}
                                <span className="text-yellow-300">{currentRolls}</span> ม้วน
                            </p>
                            <p>
                                <strong>ราคารวม:</strong>{' '}
                                <span className="text-green-300">
                                    {((currentPipe?.price || 0) * currentRolls).toLocaleString()}
                                </span>{' '}
                                บาท
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 rounded bg-gray-500 p-2">
                        <h5 className="text-xs font-medium text-yellow-300">
                            🎯 การวิเคราะห์ตามมาตรฐาน (รูปภาพ):
                        </h5>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <p>
                                คะแนนรวม: <span className="font-bold">{currentPipe?.score}</span>
                                /100
                            </p>
                            <p>
                                Major Loss:{' '}
                                <span className="font-bold text-red-400">
                                    {config.headLoss.major.toFixed(2)} ม.
                                </span>
                            </p>
                            <p>
                                Minor Loss:{' '}
                                <span className="font-bold text-orange-400">
                                    {config.headLoss.minor.toFixed(2)} ม.
                                </span>
                            </p>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <p>
                                Velocity Head:{' '}
                                <span className="font-bold text-blue-300">
                                    {(Math.pow(config.velocity, 2) / (2 * 9.81)).toFixed(3)} ม.
                                </span>
                            </p>
                            <p>
                                C-Factor:{' '}
                                <span className="font-bold text-purple-300">
                                    {results.coefficients ? results.coefficients[pipeType] : 140}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 rounded bg-purple-900 p-2">
                        <h5 className="text-xs font-medium text-purple-300">
                            ✅ การตรวจสอบมาตรฐาน:
                        </h5>
                        <div className="text-xs">
                            <p>
                                ความเร็วน้ำ:{' '}
                                <span
                                    className={`ml-1 font-bold ${
                                        config.velocity >= 0.8 && config.velocity <= 2.0
                                            ? 'text-green-300'
                                            : config.velocity >= 0.6 && config.velocity <= 2.5
                                              ? 'text-yellow-300'
                                              : 'text-red-300'
                                    }`}
                                >
                                    {config.velocity >= 0.8 && config.velocity <= 2.0
                                        ? '✅ เหมาะสมมาก (0.8-2.0 m/s)'
                                        : config.velocity >= 0.6 && config.velocity <= 2.5
                                          ? '⚠️ ใช้ได้ (0.6-2.5 m/s)'
                                          : '❌ อยู่นอกช่วงที่แนะนำ'}
                                </span>
                            </p>
                            <p className="mt-1">
                                Head Loss:{' '}
                                <span
                                    className={`ml-1 font-bold ${
                                        getHeadLossPer100m(currentPipe) <= 3
                                            ? 'text-green-300'
                                            : getHeadLossPer100m(currentPipe) <= 6
                                              ? 'text-yellow-300'
                                              : 'text-red-300'
                                    }`}
                                >
                                    {getHeadLossPer100m(currentPipe) <= 3
                                        ? '✅ ต่ำมาก (<3 m/100m)'
                                        : getHeadLossPer100m(currentPipe) <= 6
                                          ? '⚠️ ปานกลาง (3-6 m/100m)'
                                          : '❌ สูงเกินไป (>6 m/100m)'}
                                </span>
                            </p>
                        </div>
                    </div>

                    {selectedPipe &&
                        selectedPipe.id !== config.autoSelectedPipe?.id &&
                        config.autoSelectedPipe && (
                            <div className="mt-3 rounded bg-yellow-900 p-2">
                                <h5 className="text-xs font-medium text-yellow-300">
                                    ⚖️ เปรียบเทียบกับการเลือกอัตโนมัติ:
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
                                        <p className="text-gray-300">
                                            จำนวนม้วน:{' '}
                                            {calculateCurrentPipeRolls(config.autoSelectedPipe)}{' '}
                                            ม้วน
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-white">
                                            เลือกเอง: {selectedPipe.productCode}
                                        </p>
                                        <p className="text-white">ขนาด: {selectedPipe.sizeMM}mm</p>
                                        <p className="text-white">คะแนน: {selectedPipe.score}</p>
                                        <p className="text-white">จำนวนม้วน: {currentRolls} ม้วน</p>
                                    </div>
                                </div>
                                <div className="mt-1 text-xs">
                                    <p className="text-yellow-200">
                                        ส่วนต่าง:{' '}
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
                                    <p className="text-yellow-200">
                                        ราคารวม:{' '}
                                        <span
                                            className={`ml-1 font-bold ${
                                                selectedPipe.price * currentRolls <=
                                                config.autoSelectedPipe.price *
                                                    calculateCurrentPipeRolls(
                                                        config.autoSelectedPipe
                                                    )
                                                    ? 'text-green-300'
                                                    : 'text-red-300'
                                            }`}
                                        >
                                            {selectedPipe.price * currentRolls <=
                                            config.autoSelectedPipe.price *
                                                calculateCurrentPipeRolls(config.autoSelectedPipe)
                                                ? '-'
                                                : '+'}
                                            {Math.abs(
                                                selectedPipe.price * currentRolls -
                                                    config.autoSelectedPipe.price *
                                                        calculateCurrentPipeRolls(
                                                            config.autoSelectedPipe
                                                        )
                                            ).toLocaleString()}{' '}
                                            บาท
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

            {showImageModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
                    onClick={closeImageModal}
                >
                    <div
                        className="relative max-h-[90vh] max-w-[90vw] p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={closeImageModal}
                            className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
                            title="ปิด"
                        >
                            ✕
                        </button>
                        <img
                            src={modalImage.src}
                            alt={modalImage.alt}
                            className="max-h-full max-w-full rounded-lg shadow-2xl"
                        />
                        <div className="mt-2 text-center">
                            <p className="inline-block rounded bg-black bg-opacity-50 px-2 py-1 text-sm text-white">
                                {modalImage.alt}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PipeSelector;
