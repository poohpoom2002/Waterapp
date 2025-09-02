/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// resources\js\pages\components\PumpSelector.tsx
import React, { useState, useEffect, useMemo } from 'react';
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
    projectMode?: 'horticulture' | 'garden' | 'field-crop' | 'greenhouse';
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
    zoneOperationGroups = [],
    zoneInputs = {},
    simultaneousZonesCount = 1,
    selectedZones = [],
    zoneOperationMode = 'sequential',
    projectMode = 'horticulture',
}) => {
    const [showImageModal, setShowImageModal] = useState(false);
    const [modalImage, setModalImage] = useState({ src: '', alt: '' });
    const { t } = useLanguage();
    
    // คำนวณความต้องการตามเงื่อนไขใหม่สำหรับ horticulture mode
    const getHorticultureRequirements = () => {
        if (projectMode !== 'horticulture') {
            return {
                requiredFlowLPM: requiredFlow,
                minRequiredHead: requiredHead,
                qHeadSpray: 0
            };
        }

        const horticultureSystemDataStr = localStorage.getItem('horticultureSystemData');
        if (!horticultureSystemDataStr) {
            return {
                requiredFlowLPM: requiredFlow,
                minRequiredHead: requiredHead,
                qHeadSpray: 0
            };
        }

        try {
            const horticultureSystemData = JSON.parse(horticultureSystemDataStr);
            const { sprinklerConfig, zones } = horticultureSystemData;
            
            if (!sprinklerConfig || !zones) {
                return {
                    requiredFlowLPM: requiredFlow,
                    minRequiredHead: requiredHead,
                    qHeadSpray: 0
                };
            }

            const qHeadSpray = sprinklerConfig.flowRatePerPlant || 0;
            let requiredFlowLPM = 0;
            
            if (zoneOperationMode === 'simultaneous') {
                requiredFlowLPM = zones.reduce((total: number, zone: any) => total + zone.waterNeedPerMinute, 0);
            } else if (zoneOperationMode === 'custom' && zoneOperationGroups.length > 0) {
                let maxGroupFlow = 0;
                zoneOperationGroups.forEach((group: ZoneOperationGroup) => {
                    const groupFlow = group.zones.reduce((sum: number, zoneId: string) => {
                        const zone = zones.find((z: any) => z.id === zoneId);
                        return sum + (zone?.waterNeedPerMinute || 0);
                    }, 0);
                    maxGroupFlow = Math.max(maxGroupFlow, groupFlow);
                });
                requiredFlowLPM = maxGroupFlow;
            } else {
                requiredFlowLPM = Math.max(...zones.map((zone: any) => zone.waterNeedPerMinute || 0));
            }

            const minRequiredHead = qHeadSpray * 10;

            return {
                requiredFlowLPM,
                minRequiredHead,
                qHeadSpray
            };
        } catch (error) {
            return {
                requiredFlowLPM: requiredFlow,
                minRequiredHead: requiredHead,
                qHeadSpray: 0
            };
        }
    };

    const horticultureReq = getHorticultureRequirements();
    
    // ประเมินความเพียงพอของปั๊มตามเงื่อนไขใหม่
    const evaluatePumpAdequacy = (pump: any) => {
        if (!pump || projectMode !== 'horticulture') {
            return {
                isFlowAdequate: pump?.isFlowAdequate || true,
                isHeadAdequate: pump?.isHeadAdequate || true,
                flowRatio: pump?.flowRatio || 1,
                headRatio: pump?.headRatio || 1
            };
        }

        const maxFlow = pump.max_flow_rate_lpm || pump.maxFlowLPM || 0;
        const maxHead = pump.max_head_m || pump.maxHead || 0;

        const isFlowAdequate = maxFlow >= horticultureReq.requiredFlowLPM;
        const isHeadAdequate = maxHead >= horticultureReq.minRequiredHead;

        const flowRatio = horticultureReq.requiredFlowLPM > 0 ? (maxFlow / horticultureReq.requiredFlowLPM) : 0;
        const headRatio = horticultureReq.minRequiredHead > 0 ? (maxHead / horticultureReq.minRequiredHead) : 0;

        return {
            isFlowAdequate,
            isHeadAdequate,
            flowRatio,
            headRatio
        };
    };
    
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

                // For horticulture mode, waterPerTreeLiters is now in LPM
                const flowLPM = zoneInput.totalTrees * zoneInput.waterPerTreeLiters;
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
    const analyzedPumps = useMemo(() => results.analyzedPumps || [], [results.analyzedPumps]);

    // กรองปั๊มสำหรับ horticulture mode
    const getFilteredPumps = () => {
        if (projectMode !== 'horticulture') {
            return analyzedPumps.sort((a, b) => a.price - b.price);
        }

        // สำหรับ horticulture mode - กรองตามเงื่อนไขเฉพาะ
        const horticultureSystemDataStr = localStorage.getItem('horticultureSystemData');
        if (!horticultureSystemDataStr) {
            return analyzedPumps.sort((a, b) => a.price - b.price);
        }

        try {
            const horticultureSystemData = JSON.parse(horticultureSystemDataStr);
            const { sprinklerConfig, zones, isMultipleZones } = horticultureSystemData;
            
            if (!sprinklerConfig || !zones) {
                return analyzedPumps.sort((a, b) => a.price - b.price);
            }

            const qHeadSpray = sprinklerConfig.flowRatePerPlant || 0; // Q หัวฉีด
            
            // คำนวณความต้องการน้ำตาม mode การเปิดโซน
            let requiredFlowLPM = 0;
            
            if (zoneOperationMode === 'simultaneous') {
                // เปิดพร้อมกันทุกโซน - รวมน้ำทุกโซน
                requiredFlowLPM = zones.reduce((total: number, zone: any) => total + zone.waterNeedPerMinute, 0);
            } else if (zoneOperationMode === 'custom' && zoneOperationGroups.length > 0) {
                // กำหนดเอง - หากลุ่มที่มีความต้องการมากที่สุด
                let maxGroupFlow = 0;
                zoneOperationGroups.forEach((group: ZoneOperationGroup) => {
                    const groupFlow = group.zones.reduce((sum: number, zoneId: string) => {
                        const zone = zones.find((z: any) => z.id === zoneId);
                        return sum + (zone?.waterNeedPerMinute || 0);
                    }, 0);
                    maxGroupFlow = Math.max(maxGroupFlow, groupFlow);
                });
                requiredFlowLPM = maxGroupFlow;
            } else {
                // เปิดทีละโซน (sequential) - ใช้โซนที่ต้องการน้ำมากที่สุด
                requiredFlowLPM = Math.max(...zones.map((zone: any) => zone.waterNeedPerMinute || 0));
            }

            // เงื่อนไขการกรอง
            const minRequiredHead = qHeadSpray * 10; // maxHead >= Q หัวฉีด * 10
            
            // กรองปั๊มที่เข้าเงื่อนไข
            const compatiblePumps = analyzedPumps.filter((pump: any) => {
                // ตรวจสอบ maxHead
                const maxHead = pump.max_head_m || pump.maxHead || 0;
                const headCheck = maxHead >= minRequiredHead;
                
                // ตรวจสอบ maxFlow
                const maxFlow = pump.max_flow_rate_lpm || pump.maxFlowLPM || 0;
                const flowCheck = maxFlow >= requiredFlowLPM;
                
                return headCheck && flowCheck;
            });

            // เรียงตามราคาถูกสุดก่อน
            return compatiblePumps.sort((a, b) => a.price - b.price);
            
        } catch (error) {
            return analyzedPumps.sort((a, b) => a.price - b.price);
        }
    };

    const sortedPumps = getFilteredPumps();

    // Auto-select pump for horticulture mode based on system requirements
    useEffect(() => {
        if (projectMode === 'horticulture' && !selectedPump && analyzedPumps.length > 0) {
            if (sortedPumps.length > 0) {
                // เลือกปั๊มตัวแรก (ราคาถูกสุดที่เข้าเงื่อนไข)
                const bestPump = sortedPumps[0];
                if (bestPump) {
                    onPumpChange(bestPump);
                }
            }
        }
    }, [projectMode, selectedPump, analyzedPumps, onPumpChange, zoneOperationMode, zoneOperationGroups, sortedPumps]);

    const getSelectionStatus = (pump: any) => {
        if (!pump) return null;
        const isAutoSelected = pump.id === autoSelectedPump?.id;

        if (isAutoSelected) {
            return t('🤖 เลือกอัตโนมัติ');
        } else {
            return t('👤 เลือกเอง');
        }
    };

    const getPumpGrouping = (pump: any) => {
        return t('ปั๊มน้ำ');
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
                            {horticultureReq.requiredFlowLPM.toFixed(1)}{' '}
                            {t('LPM')}
                        </span>
                    </p>
                    <p>
                        {t('Head รวม:')} {' '}
                        <span className="font-bold text-yellow-300">
                            {horticultureReq.minRequiredHead.toFixed(1)}{' '}
                            {t('เมตร')}
                        </span>
                        {projectMode === 'horticulture' && (
                            <span className="ml-2 text-xs text-gray-400">
                                (Q หัวฉีด {horticultureReq.qHeadSpray} × 10)
                            </span>
                        )}
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
                {projectMode === 'horticulture' && (
                    <div className="mt-2 text-xs text-purple-200">
                        <p>🎯 {t('รูปแบบการเปิด:')} {' '}
                            {zoneOperationMode === 'simultaneous'
                                ? t('เปิดพร้อมกันทุกโซน')
                                : zoneOperationMode === 'custom'
                                  ? t('เปิดแบบกำหนดเอง')
                                  : t('เปิดทีละโซน')}
                        </p>
                        <p>💧 {t('คำนวณจาก:')} {' '}
                            {zoneOperationMode === 'simultaneous'
                                ? t('น้ำรวมทุกโซน')
                                : zoneOperationMode === 'custom'
                                  ? t('กลุ่มโซนที่ต้องการมากสุด')
                                  : t('โซนที่ต้องการมากสุด')}
                        </p>
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
                                label: `${isAuto ? '🤖 ' : ''}${pump.name || pump.productCode} - ${pump.powerHP}HP - ${pump.price?.toLocaleString()} ${t('บาท')}`,
                                searchableText: `${pump.productCode || ''} ${pump.name || ''} ${pump.brand || ''} ${pump.powerHP}HP`,
                                image: (pump as any).image_url || pump.image || (pump as any).imageUrl,
                                productCode: pump.productCode,
                                name: pump.name,
                                brand: pump.brand,
                                price: pump.price,
                                unit: t('บาท'),
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
                        {(() => {
                            const adequacy = evaluatePumpAdequacy(currentPump);
                            return (
                                <>
                        <p>
                            <strong>{t('Flow:')}</strong>{' '}
                            <span
                                            className={`font-bold ${adequacy.isFlowAdequate ? 'text-green-300' : 'text-red-300'}`}
                            >
                                            {adequacy.isFlowAdequate ? '✅ ' + t('เพียงพอ') : '❌ ' + t('ไม่เพียงพอ')}
                            </span>
                            <span className="ml-2 text-gray-400">
                                            ({adequacy.flowRatio.toFixed(1)}x)
                            </span>
                        </p>

                        <p>
                            <strong>{t('Head:')}</strong>{' '}
                            <span
                                            className={`font-bold ${adequacy.isHeadAdequate ? 'text-green-300' : 'text-red-300'}`}
                            >
                                            {adequacy.isHeadAdequate ? '✅ ' + t('เพียงพอ') : '❌ ' + t('ไม่เพียงพอ')}
                            </span>
                            <span className="ml-2 text-gray-400">
                                            ({adequacy.headRatio.toFixed(1)}x)
                            </span>
                        </p>
                                </>
                            );
                        })()}
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

                    {(() => {
                        const adequacy = evaluatePumpAdequacy(currentPump);
                        return (!adequacy.isFlowAdequate || !adequacy.isHeadAdequate) && (
                        <div className="mt-3 rounded bg-red-900 p-2">
                            <p className="text-sm text-red-300">
                                ⚠️ <strong>{t('คำเตือน:')}</strong> {t('ปั๊มนี้')}
                                    {!adequacy.isFlowAdequate && ' อัตราการไหลไม่เพียงพอ'}
                                    {!adequacy.isFlowAdequate &&
                                        !adequacy.isHeadAdequate &&
                                    ' และ'}
                                    {!adequacy.isHeadAdequate && ' ' + t('ความสูงยกไม่เพียงพอ')}{' '}
                                {t('สำหรับระบบนี้')}
                            </p>
                        </div>
                        );
                    })()}

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
