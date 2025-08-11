/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// resources\js\pages\components\PumpSelector.tsx
import React, { useState } from 'react';
import { CalculationResults, IrrigationInput } from '../types/interfaces';
import { useLanguage } from '@/contexts/LanguageContext';
import SearchableDropdown from './SearchableDropdown';
interface PumpSelectorProps {
    results: CalculationResults;
    selectedPump?: any;
    onPumpChange: (pump: any) => void;
    zoneOperationGroups?: ZoneOperationGroup[];
    zoneInputs?: { [zoneId: string]: IrrigationInput };
    simultaneousZonesCount?: number;
    selectedZones?: string[];
    allZoneResults?: any[];
    projectSummary?: any;
    zoneOperationMode?: string;
}

interface ZoneOperationGroup {
    id: string;
    zones: string[];
    order: number;
    label: string;
}

const PumpSelector: React.FC<PumpSelectorProps> = ({
    results,
    selectedPump,
    onPumpChange,
    simultaneousZonesCount = 1,
    selectedZones = [],
    zoneInputs = {},
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

    const requiredFlow = results.flows.main;
    const requiredHead = results.pumpHeadRequired;

    const calculateSimultaneousFlow = () => {
        if (results.projectSummary) {
            return {
                flow: results.projectSummary.selectedGroupFlowLPM,
                head: results.projectSummary.selectedGroupHeadM,
                mode: results.projectSummary.operationMode,
                sourceInfo: t('คำนวณจากระบบ Project Summary'),
            };
        }

        if (!selectedZones || selectedZones.length <= 1 || !zoneInputs) {
            return {
                flow: requiredFlow,
                head: requiredHead,
                mode: 'single',
                sourceInfo: t('โซนเดียว'),
            };
        }

        const zoneFlows = selectedZones
            .map((zoneId) => {
                const zoneInput = zoneInputs[zoneId];
                if (!zoneInput) return { zoneId, flow: 0, head: 0 };

                const flowLPM =
                    (zoneInput.totalTrees * zoneInput.waterPerTreeLiters) /
                    (zoneInput.irrigationTimeMinutes);
                const headTotal = zoneInput.staticHeadM + zoneInput.pressureHeadM;

                return {
                    zoneId,
                    flow: flowLPM,
                    head: headTotal,
                };
            })
            .sort((a, b) => b.head - a.head);

        const topZones = zoneFlows.slice(0, simultaneousZonesCount);
        const totalFlow = topZones.reduce((sum, zone) => sum + zone.flow, 0);
        const maxHead = topZones.length > 0 ? topZones[0].head : 0;

        return {
            flow: totalFlow,
            head: maxHead,
            mode:
                simultaneousZonesCount === selectedZones.length
                    ? 'simultaneous'
                    : simultaneousZonesCount === 1
                      ? 'sequential'
                      : 'custom',
            sourceInfo: `${simultaneousZonesCount} ${t('โซนพร้อมกัน')} (${t('Fallback calculation')})`,
        };
    };

    const flowData = calculateSimultaneousFlow();
    const actualRequiredFlow = flowData.flow;
    const actualRequiredHead = flowData.head;

    const currentPump = selectedPump || results.autoSelectedPump;
    const autoSelectedPump = results.autoSelectedPump;
    const analyzedPumps = results.analyzedPumps || [];

    const sortedPumps = analyzedPumps.sort((a, b) => {
        if (a.isRecommended !== b.isRecommended) return b.isRecommended ? 1 : -1;
        if (a.isGoodChoice !== b.isGoodChoice) return b.isGoodChoice ? 1 : -1;
        if (a.isUsable !== b.isUsable) return b.isUsable ? 1 : -1;
        return b.score - a.score;
    });

    const getSelectionStatus = (pump: any) => {
        if (!pump) return null;
        const isAutoSelected = pump.id === autoSelectedPump?.id;

        if (isAutoSelected) {
            if (pump.isRecommended) return t('🤖⭐ เลือกอัตโนมัติ (แนะนำ)');
            if (pump.isGoodChoice) return t('🤖✅ เลือกอัตโนมัติ (ดี)');
            if (pump.isUsable) return t('🤖⚡ เลือกอัตโนมัติ (ใช้ได้)');
            return t('🤖⚠️ เลือกอัตโนมัติ (ตัวดีที่สุดที่มี)');
        } else {
            return t('👤 เลือกเอง');
        }
    };

    const getPumpGrouping = (pump: any) => {
        if (pump.isRecommended) return t('แนะนำ');
        if (pump.isGoodChoice) return t('ตัวเลือกดี');
        if (pump.isUsable) return t('ใช้ได้');
        return t('อื่นๆ');
    };

    const formatRangeValue = (value: any) => {
        if (Array.isArray(value)) return `${value[0]}-${value[1]}`;
        return String(value);
    };

    const renderPumpImage = (pump: any) => {
        const imageUrl = pump.image_url || pump.image || pump.imageUrl;

        if (imageUrl) {
            return (
                <img
                    src={imageUrl}
                    alt={pump.name || 'Pump'}
                    className="h-auto max-h-[100px] w-[100px] cursor-pointer rounded border border-gray-500 object-contain transition-opacity hover:border-blue-400 hover:opacity-80"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    onClick={() => openImageModal(imageUrl, pump.name || 'ปั๊มน้ำ')}
                    title={t('คลิกเพื่อดูรูปขนาดใหญ่')}
                />
            );
        }

        return (
            <div className="flex h-[60px] w-[85px] items-center justify-center rounded border border-gray-600 bg-gray-500 text-xs text-gray-300">
                <img 
                    src="/images/water-pump.png" 
                    alt="Water Pump" 
                    className="w-6 h-6 object-contain"
                />
                {t('ปั๊ม')}
            </div>
        );
    };

    const renderAccessoryImage = (accessory: any) => {
        const imageUrl = accessory.image_url || accessory.image || accessory.imageUrl;

        if (imageUrl) {
            return (
                <img
                    src={imageUrl}
                    alt={accessory.name}
                    className="h-10 w-10 cursor-pointer rounded border border-gray-600 object-cover transition-opacity hover:border-blue-400 hover:opacity-80"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    onClick={() => openImageModal(imageUrl, accessory.name)}
                    title={t('คลิกเพื่อดูรูปขนาดใหญ่')}
                />
            );
        }

        const getIconForType = (type: string) => {
            const icons = {
                foot_valve: '🔧',
                check_valve: '⚙️',
                ball_valve: '🔩',
                pressure_gauge: '📊',
            };
            return icons[type as keyof typeof icons] || '🔧';
        };

        return (
            <div className="flex h-10 w-10 items-center justify-center rounded border border-gray-600 bg-gray-600 text-sm">
                {getIconForType(accessory.accessory_type)}
            </div>
        );
    };

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h3 className="mb-4 text-2xl font-bold text-red-500">
                {t('ปั๊มน้ำ')}
            </h3>

            <div className="mb-4 rounded bg-gray-600 p-3">
                <h4 className="mb-2 text-sm font-medium text-red-300">⚡ {t('ความต้องการ:')}</h4>
                <div className="text-xs text-gray-300">
                    <p>
                        {t('อัตราการไหล:')} {' '}
                        <span className="font-bold text-blue-300">
                            {results.projectSummary
                                ? results.projectSummary.selectedGroupFlowLPM.toFixed(1)
                                : requiredFlow.toFixed(1)}{' '}
                            {t('LPM')}
                        </span>
                    </p>
                    <p>
                        {t('Head รวม:')} {' '}
                        <span className="font-bold text-yellow-300">
                            {results.projectSummary
                                ? results.projectSummary.selectedGroupHeadM.toFixed(1)
                                : requiredHead.toFixed(1)}{' '}
                            {t('เมตร')}
                        </span>
                    </p>
                </div>
                {results.projectSummary && (
                    <div className="mt-2 text-xs text-purple-200">
                        <p>
                            🎯 {t('รูปแบบการเปิด:')} {' '}
                            {results.projectSummary.operationMode === 'simultaneous'
                                ? t('เปิดพร้อมกันทุกโซน')
                                : results.projectSummary.operationMode === 'custom'
                                  ? t('เปิดแบบกำหนดเอง')
                                  : t('เปิดทีละโซน')}
                        </p>
                        <p>💧 {t('คำนวณจากโซน:')} {results.projectSummary.criticalZone}</p>
                        {results.projectSummary.criticalGroup && (
                            <p>🔗 {t('กลุ่มที่คำนวณ:')} {results.projectSummary.criticalGroup.label}</p>
                        )}
                    </div>
                )}
                {selectedZones &&
                    selectedZones.length > 1 &&
                    simultaneousZonesCount &&
                    simultaneousZonesCount > 1 &&
                    !results.projectSummary && (
                        <div className="mt-2 text-xs text-purple-200">
                            <p>🔄 {t('คำนวณสำหรับ')} {simultaneousZonesCount} {t('โซนที่เปิดพร้อมกัน')}</p>
                            <p>💧 {t('อัตราการไหลรวม:')} {actualRequiredFlow.toFixed(1)} {t('LPM')} ({t('Fallback')})</p>
                        </div>
                    )}
            </div>

            <div className="mb-4">
                <SearchableDropdown
                    value={currentPump?.id || ''}
                    onChange={(value) => {
                        const selected = analyzedPumps.find(
                            (p) => p.id === parseInt(value.toString())
                        );
                        onPumpChange(selected || null);
                    }}
                    options={[
                        { value: '', label: `-- ${t('ใช้การเลือกอัตโนมัติ')} --` },
                        ...sortedPumps.map((pump) => {
                            const group = getPumpGrouping(pump);
                            const isAuto = pump.id === autoSelectedPump?.id;
                            return {
                                value: pump.id,
                                label: `${isAuto ? '🤖 ' : ''}${pump.name || pump.productCode} - ${pump.powerHP}HP - ${pump.price?.toLocaleString()} ${t('บาท')} | ${group} | ${t('คะแนน:')} ${pump.score}${!pump.isFlowAdequate || !pump.isHeadAdequate ? ' ' + t('(ไม่เพียงพอ)') : ''}`,
                                searchableText: `${pump.productCode || ''} ${pump.name || ''} ${pump.brand || ''} ${pump.powerHP}HP ${group}`,
                                image: (pump as any).image_url || pump.image || (pump as any).imageUrl,
                                productCode: pump.productCode,
                                name: pump.name,
                                brand: pump.brand,
                                price: pump.price,
                                unit: t('บาท'),
                                score: pump.score,
                                isRecommended: pump.isRecommended,
                                isGoodChoice: pump.isGoodChoice,
                                isUsable: pump.isUsable,
                                isAutoSelected: isAuto
                            };
                        })
                    ]}
                    placeholder={`-- ${t('ใช้การเลือกอัตโนมัติ')} --`}
                    searchPlaceholder={t('พิมพ์เพื่อค้นหาปั๊ม (ชื่อ, รหัสสินค้า, แบรนด์)...')}
                    className="w-full"
                />
            </div>

            {currentPump ? (
                <div className="rounded bg-gray-600 p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium text-white">{t('ปั๊มที่เลือก')}</h4>
                        <span className="text-sm font-bold text-green-300">
                            {t('คะแนน:')} {currentPump.score}/100
                        </span>
                    </div>

                    <div className="mb-3 rounded bg-blue-900 p-2">
                        <p className="text-sm text-blue-300">{getSelectionStatus(currentPump)}</p>
                    </div>

                    <div className="grid grid-cols-3 items-center justify-between gap-3 text-sm">
                        <div className="flex items-center justify-center">
                            {renderPumpImage(currentPump)}
                        </div>

                        <div>
                            <p>
                                <strong>{t('รุ่น:')}</strong> {currentPump.productCode}
                            </p>
                            <p>
                                <strong>{t('ชื่อ:')}</strong> {currentPump.name || currentPump.productCode}
                            </p>
                            <p>
                                <strong>{t('กำลัง:')}</strong>{' '}
                                {currentPump.powerHP != null
                                    ? currentPump.powerHP
                                    : (currentPump.powerKW * 1.341).toFixed(1)}{' '}
                                {t('HP')} ({t('kW')})
                                {currentPump.powerKW != null
                                    ? currentPump.powerKW
                                    : (currentPump.powerHP * 0.7457).toFixed(1)}{' '}
                                {t('kW')}
                            </p>
                            <p>
                                <strong>{t('เฟส:')}</strong> {currentPump.phase} {t('เฟส')}
                            </p>
                            <p>
                                <strong>{t('ท่อเข้า/ออก:')}</strong> {currentPump.inlet_size_inch}"/
                                {currentPump.outlet_size_inch}"
                            </p>
                            {currentPump.brand && (
                                <p>
                                    <strong>{t('แบรนด์:')}</strong> {currentPump.brand}
                                </p>
                            )}
                        </div>

                        <div>
                            <p>
                                <strong>{t('Flow Max:')}</strong> {currentPump.maxFlow || 'N/A'} {t('LPM')}
                            </p>
                            <p>
                                <strong>{t('Head Max:')}</strong> {currentPump.maxHead || 'N/A'} {t('เมตร')}
                            </p>
                            <p>
                                <strong>{t('S.D(ความลึกดูด):')}</strong>{' '}
                                {currentPump.suction_depth_m || 'N/A'} {t('เมตร')}
                            </p>
                            <p>
                                <strong>{t('ราคา:')}</strong> {currentPump.price?.toLocaleString()} {t('บาท')}
                            </p>
                            {currentPump.weight_kg && (
                                <p>
                                    <strong>{t('น้ำหนัก:')}</strong> {currentPump.weight_kg} {t('kg')}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <p>
                            <strong>{t('Flow:')}</strong>{' '}
                            <span
                                className={`font-bold ${currentPump.isFlowAdequate ? 'text-green-300' : 'text-red-300'}`}
                            >
                                {currentPump.isFlowAdequate ? '✅ ' + t('เพียงพอ') : '❌ ' + t('ไม่เพียงพอ')}
                            </span>
                            <span className="ml-2 text-gray-400">
                                ({currentPump.flowRatio.toFixed(1)}x)
                            </span>
                        </p>

                        <p>
                            <strong>{t('Head:')}</strong>{' '}
                            <span
                                className={`font-bold ${currentPump.isHeadAdequate ? 'text-green-300' : 'text-red-300'}`}
                            >
                                {currentPump.isHeadAdequate ? '✅ ' + t('เพียงพอ') : '❌ ' + t('ไม่เพียงพอ')}
                            </span>
                            <span className="ml-2 text-gray-400">
                                ({currentPump.headRatio.toFixed(1)}x)
                            </span>
                        </p>
                    </div>

                    <div className="mt-3 rounded bg-gray-500 p-2">
                            <h5 className="text-xs font-medium text-yellow-300">{t('การวิเคราะห์:')}</h5>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <p>
                                {t('คะแนนรวม:')} <span className="font-bold">{currentPump.score}</span>/100
                            </p>
                            <p>
                                {t('กำลังประมาณ:')} {' '}
                                <span className="font-bold">
                                    {currentPump.estimatedHP.toFixed(1)}
                                </span>{' '}
                                {t('HP')}
                            </p>
                            <p>
                                {t('ประสิทธิภาพ/บาท:')} {' '}
                                <span className="font-bold">
                                    {currentPump.flowPerBaht.toFixed(3)}
                                </span>
                            </p>
                        </div>
                        <div className="mt-1 text-xs">
                            <p>
                                {t('ความเหมาะสม:')}
                                <span
                                    className={`ml-1 font-bold ${
                                        currentPump.isRecommended
                                            ? 'text-green-300'
                                            : currentPump.isGoodChoice
                                              ? 'text-yellow-300'
                                              : currentPump.isUsable
                                                ? 'text-orange-300'
                                                : 'text-red-300'
                                    }`}
                                >
                                    {currentPump.isRecommended
                                        ? '⭐ ' + t('แนะนำ')
                                        : currentPump.isGoodChoice
                                          ? '✅ ' + t('ดี')
                                          : currentPump.isUsable
                                            ? '⚡ ' + t('ใช้ได้')
                                            : '⚠️ ' + t('ไม่เหมาะสม')}
                                </span>
                            </p>
                        </div>
                    </div>

                    {currentPump.description && (
                        <div className="mt-3 rounded bg-gray-800 p-2">
                            <p className="text-xs text-gray-300">
                                <strong>{t('รายละเอียด:')}</strong> {currentPump.description}
                            </p>
                        </div>
                    )}


                    

                    {currentPump.pumpAccessories && currentPump.pumpAccessories.length > 0 && (
                        <div className="mt-3 rounded bg-purple-900 p-2">
                            <h5 className="mb-2 text-xs font-medium text-purple-300">
                                🔧 {t('อุปกรณ์ประกอบ')} ({currentPump.pumpAccessories.length} {t('รายการ')}):
                            </h5>
                            <div className="space-y-2">
                                {currentPump.pumpAccessories
                                    .sort(
                                        (a: any, b: any) =>
                                            (a.sort_order || 0) - (b.sort_order || 0)
                                    )
                                    .map((accessory: any, index: number) => (
                                        <div
                                            key={accessory.id || index}
                                            className="flex items-center justify-between rounded bg-purple-800 p-2"
                                        >
                                            <div className="flex items-center space-x-3">
                                                {renderAccessoryImage(accessory)}
                                                <div className="text-xs">
                                                    <p className="font-medium text-white">
                                                        {accessory.name}
                                                    </p>
                                                    <p className="capitalize text-purple-200">
                                                        {accessory.accessory_type?.replace(
                                                            '_',
                                                            ' '
                                                        )}
                                                        {accessory.size && ` • ${accessory.size}`}
                                                    </p>
                                                    {accessory.specifications &&
                                                        Object.keys(accessory.specifications)
                                                            .length > 0 && (
                                                            <p className="text-purple-300">
                                                                {Object.entries(
                                                                    accessory.specifications
                                                                )
                                                                    .slice(0, 1)
                                                                    .map(
                                                                        ([key, value]) =>
                                                                            `${key}: ${value}`
                                                                    )
                                                                    .join(', ')}
                                                                {Object.keys(
                                                                    accessory.specifications
                                                                ).length > 1 && '...'}
                                                            </p>
                                                        )}
                                                </div>
                                            </div>
                                            <div className="text-right text-xs">
                                                <div
                                                    className={`font-medium ${accessory.is_included ? 'text-green-300' : 'text-yellow-300'}`}
                                                >
                                                    {accessory.is_included ? (
                                                        <span>✅ {t('รวมในชุด')}</span>
                                                    ) : (
                                                        <span>
                                                            💰 +
                                                            {Number(
                                                                accessory.price || 0
                                                            ).toLocaleString()}{' '}
                                                            {t('บาท')}
                                                        </span>
                                                    )}
                                                </div>
                                                {!accessory.is_included && (
                                                    <div className="text-purple-200">({t('แยกขาย')})</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>

                            {currentPump.pumpAccessories.some((acc: any) => !acc.is_included) && (
                                <div className="mt-2 rounded bg-purple-800 p-2 text-xs">
                                    <div className="flex justify-between text-purple-200">
                                        <span>{t('ราคาอุปกรณ์เสริม:')}</span>
                                        <span className="font-medium text-yellow-300">
                                            +
                                            {currentPump.pumpAccessories
                                                .filter((acc: any) => !acc.is_included)
                                                .reduce(
                                                    (sum: number, acc: any) =>
                                                        sum + (Number(acc.price) || 0),
                                                    0
                                                )
                                                .toLocaleString()}{' '}
                                            {t('บาท')}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {(!currentPump.isFlowAdequate || !currentPump.isHeadAdequate) && (
                        <div className="mt-3 rounded bg-red-900 p-2">
                            <p className="text-sm text-red-300">
                                ⚠️ <strong>{t('คำเตือน:')}</strong> {t('ปั๊มนี้')}
                                {!currentPump.isFlowAdequate && ' อัตราการไหลไม่เพียงพอ'}
                                {!currentPump.isFlowAdequate &&
                                    !currentPump.isHeadAdequate &&
                                    ' และ'}
                                {!currentPump.isHeadAdequate && ' ' + t('ความสูงยกไม่เพียงพอ')}{' '}
                                {t('สำหรับระบบนี้')}
                            </p>
                        </div>
                    )}

                </div>
            ) : (
                <div className="rounded bg-gray-600 p-4 text-center">
                    <p className="text-gray-300">{t('ไม่สามารถหาปั๊มที่เหมาะสมได้')}</p>
                    <p className="mt-1 text-sm text-gray-400">{t('อาจไม่มีปั๊มที่เหมาะสมในระบบ')}</p>
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

export default PumpSelector;
