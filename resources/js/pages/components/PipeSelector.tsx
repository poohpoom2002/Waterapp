/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// resources\js\pages\components\PipeSelector.tsx
import React, { useState } from 'react';
import { CalculationResults, PipeType, IrrigationInput, AnalyzedPipe } from '../types/interfaces';
import { calculatePipeRolls } from '../utils/calculations';
import { useLanguage } from '@/contexts/LanguageContext';
import SearchableDropdown from './SearchableDropdown';

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
    const { t } = useLanguage();
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
                title: t('ท่อย่อย'),
                titleColor: 'text-purple-400',
                description: t(`สำหรับแยกไปสปริงเกอร์ (${input.sprinklersPerBranch} หัว/ท่อ)`),
                autoSelectedPipe: results.autoSelectedBranchPipe,
                analyzedPipes: results.analyzedBranchPipes || [],
                totalPipeLength: input.totalBranchPipeM,
                longestPipeLength: input.longestBranchPipeM,
                flow: results.flows.branch,
                velocity: results.velocity.branch,
                headLoss: results.headLoss.branch,
            },
            secondary: {
                title: t('ท่อเมนรอง'),
                titleColor: 'text-orange-400',
                description: t(`รวบรวมน้ำจาก ${input.branchesPerSecondary} ท่อย่อย`),
                autoSelectedPipe: results.autoSelectedSecondaryPipe,
                analyzedPipes: results.analyzedSecondaryPipes || [],
                totalPipeLength: input.totalSecondaryPipeM,
                longestPipeLength: input.longestSecondaryPipeM,
                flow: results.flows.secondary,
                velocity: results.velocity.secondary,
                headLoss: results.headLoss.secondary,
            },
            main: {
                title: t('ท่อเมนหลัก'),
                titleColor: 'text-cyan-400',
                description: t(`ท่อหลักจากปั๊ม (${input.simultaneousZones} โซนพร้อมกัน)`),
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
            if (pipe.isRecommended) return t('🤖⭐ เลือกอัตโนมัติ (แนะนำ)');
            if (pipe.isGoodChoice) return t('🤖✅ เลือกอัตโนมัติ (ดี)');
            if (pipe.isUsable) return t('🤖⚡ เลือกอัตโนมัติ (ใช้ได้)');
            return t('🤖⚠️ เลือกอัตโนมัติ (ตัวดีที่สุดที่มี)');
        } else {
            return t('👤 เลือกเอง');
        }
    };

    const getPipeGrouping = (pipe: any) => {
        if (pipe.isRecommended) return t('แนะนำ');
        if (pipe.isGoodChoice) return t('ตัวเลือกดี');
        if (pipe.isUsable) return t('ใช้ได้');
        return t('อื่นๆ');
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
        <div className={`rounded-lg p-6 ${config.title === t('ท่อย่อย') ? 'bg-yellow-500' : config.title === t('ท่อเมนรอง') ? 'bg-purple-500' : 'bg-blue-500'}`}>
            <h3 className={`mb-4 text-2xl font-bold text-black`}>
                {config.title}
            </h3>

            <div className="mb-4">
                <SearchableDropdown
                    value={currentPipe?.id || ''}
                    onChange={(value) => {
                        const selected = config.analyzedPipes.find(
                            (p) => p.id === parseInt(value.toString())
                        );
                        onPipeChange(selected || null);
                    }}
                    options={[
                        { value: '', label: `-- ${t('ใช้การเลือกอัตโนมัติ')} --` },
                        ...sortedPipes.map((pipe) => {
                            const group = getPipeGrouping(pipe);
                            const isAuto = pipe.id === config.autoSelectedPipe?.id;
                            const rolls = calculateCurrentPipeRolls(pipe);
                            const currentHeadLossPer100m = getHeadLossPer100m(pipe);
                            return {
                                value: pipe.id,
                                label: `${isAuto ? '🤖 ' : ''}${pipe.name || pipe.productCode} - ${pipe.sizeMM}mm - ${pipe.price?.toLocaleString()} ${t('บาท/ม้วน')}`,
                                searchableText: `${pipe.productCode || ''} ${pipe.name || ''} ${pipe.brand || ''} ${pipe.sizeMM}mm ${pipe.pipeType || ''} ${group}`
                            };
                        })
                    ]}
                    placeholder={`-- ${t('ใช้การเลือกอัตโนมัติ')} --`}
                    searchPlaceholder={t('พิมพ์เพื่อค้นหาท่อ (ชื่อ, รหัสสินค้า, ขนาด)...')}
                    className="w-full"
                />
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
                                    {t('ไม่มีรูป')}
                                </div>
                            )}
                        </div>

                        <div className="col-span-4">
                            <p>
                                <strong>{t('รหัส:')}</strong>{' '}
                                {currentPipe?.productCode || currentPipe?.product_code}
                            </p>
                            <p>
                                <strong>{t('ประเภท:')}</strong> {currentPipe?.pipeType}
                            </p>
                            <p>
                                <strong>{t('ขนาด:')}</strong> {currentPipe?.sizeMM} มม.
                                {currentPipe?.sizeInch && ` (${currentPipe.sizeInch}")`}
                            </p>
                            <p>
                                <strong>{t('ความยาวต่อม้วน:')}</strong> {currentPipe?.lengthM} เมตร
                            </p>
                            <p>
                                <strong>{t('ความดัน:')}</strong> PN{currentPipe?.pn}
                            </p>
                            <p>
                                <strong>{t('อัตราการไหล:')}</strong> {config.flow.toFixed(1)} LPM
                            </p>
                        </div>

                        <div className="col-span-4">
                            {currentPipe?.brand && (
                                <p>
                                    <strong>{t('แบรนด์:')}</strong> {currentPipe.brand}
                                </p>
                            )}
                            <p>
                                <strong>{t('ความเร็ว:')}</strong>{' '}
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
                                <strong>{t('Head Loss:')}</strong>{' '}
                                <span className="text-orange-300">
                                    {config.headLoss.total.toFixed(2)} ม.
                                </span>
                            </p>
                            <p>
                                <strong>{t('Loss/100ม:')}</strong>{' '}
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
                                <strong>{t('จำนวนม้วน:')} </strong>{' '}
                                <span className="text-yellow-300">{currentRolls}</span> ม้วน
                            </p>
                            <p>
                                <strong>{t('ราคารวม:')}</strong>{' '}
                                <span className="text-green-300">
                                    {((currentPipe?.price || 0) * currentRolls).toLocaleString()}
                                </span>{' '}
                                {t('บาท')}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 rounded bg-gray-500 p-2">
                        <h5 className="text-xs font-medium text-yellow-300">
                            🎯 {t('การวิเคราะห์ตามมาตรฐาน:')}
                        </h5>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <p>
                                {t('คะแนนรวม:')} <span className="font-bold">{currentPipe?.score}</span>
                                /100
                            </p>
                            <p>
                                {t('Major Loss:')} {' '}
                                <span className="font-bold text-red-400">
                                    {config.headLoss.major.toFixed(2)} ม.
                                </span>
                            </p>
                            <p>
                                {t('Minor Loss:')} {' '}
                                <span className="font-bold text-orange-400">
                                    {config.headLoss.minor.toFixed(2)} ม.
                                </span>
                            </p>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <p>
                                {t('Velocity Head:')} {' '}
                                <span className="font-bold text-blue-300">
                                    {(Math.pow(config.velocity, 2) / (2 * 9.81)).toFixed(3)} ม.
                                </span>
                            </p>
                            <p>
                                {t('C-Factor:')} {' '}
                                <span className="font-bold text-purple-300">
                                    {results.coefficients ? results.coefficients[pipeType] : 140}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 rounded bg-purple-900 p-2">
                        <h5 className="text-xs font-medium text-purple-300">
                            ✅ {t('การตรวจสอบมาตรฐาน:')}
                        </h5>
                        <div className="text-xs">
                            <p>
                                {t('ความเร็วน้ำ:')} {' '}
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
                                            ? '✅ ' + t('เหมาะสมมาก (0.8-2.0 m/s)')
                                        : config.velocity >= 0.6 && config.velocity <= 2.5
                                          ? '⚠️ ' + t('ใช้ได้ (0.6-2.5 m/s)')
                                          : '❌ ' + t('อยู่นอกช่วงที่แนะนำ')}
                                </span>
                            </p>
                            <p className="mt-1">
                                {t('Head Loss:')} {' '}
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
                                        ? '✅ ' + t('ต่ำมาก (<3 m/100m)')
                                        : getHeadLossPer100m(currentPipe) <= 6
                                          ? '⚠️ ' + t('ปานกลาง (3-6 m/100m)')
                                          : '❌ ' + t('สูงเกินไป (>6 m/100m)')}
                                </span>
                            </p>
                        </div>
                    </div>

                    
                </div>
            ) : (
                <div className="rounded bg-gray-600 p-4 text-center">
                    <p className="text-gray-300">{t('ไม่สามารถหาท่อประเภทนี้ได้')}</p>
                    <p className="mt-1 text-sm text-gray-400">{t('อาจไม่มีข้อมูลท่อที่เหมาะสมในระบบ')}</p>
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
                            title={t('ปิด')}
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
