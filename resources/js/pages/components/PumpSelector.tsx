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
    allZoneResults,
    projectSummary,
    zoneOperationMode = 'sequential',
    projectMode = 'horticulture',
}) => {
    const [showImageModal, setShowImageModal] = useState(false);
    const [showAccessoriesModal, setShowAccessoriesModal] = useState(false);
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

    // คำนวณ Pump Head เหมือนใน CalculationSummary.tsx
    const calculatePumpHead = () => {
        // ดึงท่อที่เลือกปัจจุบัน
        const actualBranchPipe = results.autoSelectedBranchPipe;
        const actualSecondaryPipe = results.autoSelectedSecondaryPipe;
        const actualMainPipe = results.autoSelectedMainPipe;
        const actualEmitterPipe = results.autoSelectedEmitterPipe;

        // รวม Head Loss จากท่อทุกประเภท
        const branchHeadLoss = actualBranchPipe?.headLoss || 0;
        const secondaryHeadLoss = actualSecondaryPipe?.headLoss || 0;
        const mainHeadLoss = actualMainPipe?.headLoss || 0;
        const emitterHeadLoss = actualEmitterPipe?.headLoss || 0;
        const totalPipeHeadLoss = branchHeadLoss + secondaryHeadLoss + mainHeadLoss + emitterHeadLoss;

        // คำนวณ Head Loss หัวฉีด (Q หัวฉีด * 10)
        const sprinklerFlowLPM = results.waterPerSprinklerLPM || 6.0;
        const sprinklerHeadLoss = sprinklerFlowLPM * 10;

        return totalPipeHeadLoss + sprinklerHeadLoss;
    };

    // สำหรับกรณีหลายโซน ให้หาค่าสูงสุด
    const getMaxPumpHeadFromAllZones = () => {
        if (allZoneResults && allZoneResults.length > 1) {
            // คำนวณ Pump Head สำหรับแต่ละโซน แล้วหาค่าสูงสุด
            return Math.max(...allZoneResults.map((zone: any) => {
                const zoneHeadLoss = zone.headLoss?.total || 0;
                const zoneSprinklerFlow = zone.waterPerSprinklerLPM || 6.0;
                const zoneSprinklerHeadLoss = zoneSprinklerFlow * 10;
                return zoneHeadLoss + zoneSprinklerHeadLoss;
            }));
        } else {
            // โซนเดียว ใช้การคำนวณปกติ
            return calculatePumpHead();
        }
    };

    const actualPumpHead = getMaxPumpHeadFromAllZones();


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

            // ใช้ค่า actualPumpHead ที่คำนวณแล้ว (ใช้ค่าสูงสุดจากทุกโซน)
            const maxPumpHeadFromZones = actualPumpHead;
            
            // กรองปั๊มที่เข้าเงื่อนไข
            const compatiblePumps = analyzedPumps.filter((pump: any) => {
                // ตรวจสอบ maxFlow - ต้องมากกว่าที่ต้องการ
                const maxFlow = pump.max_flow_rate_lpm || pump.maxFlowLPM || 0;
                const flowCheck = maxFlow >= requiredFlowLPM;
                
                // ตรวจสอบ maxHead - ต้องมากกว่า Pump Head ของโซนที่สูงสุด
                const maxHead = pump.max_head_m || pump.maxHead || 0;
                const headCheck = maxHead >= maxPumpHeadFromZones;
                
                return flowCheck && headCheck;
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

            <div className="mb-4 rounded bg-gray-600 p-3 flex flex-row items-center space-x-6">
                <h4 className="text-lg font-medium text-red-300 mr-4 whitespace-nowrap">⚡ {t('ความต้องการ:')}</h4>
                <div className="flex flex-row items-center space-x-4">
                    <span>
                        {t('อัตราการไหล:')}{' '}
                        <span className="font-bold text-blue-300">
                            {Number(horticultureReq.requiredFlowLPM.toFixed(2)).toLocaleString()} {t('LPM')}
                        </span>
                    </span>
                    <span>
                        {t('Pump Head:')}{' '}
                        <span className="font-bold text-orange-300">
                            {Number(actualPumpHead.toFixed(2)).toLocaleString()} {t('เมตร')}
                        </span>
                    </span>
                </div>
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
                        <div className="mt-3 rounded bg-purple-900 p-3">
                            <div className="flex items-center justify-between">
                                <h5 className="text-sm font-medium text-purple-300">
                                    🔧 {t('อุปกรณ์ประกอบ')} ({currentPump.pumpAccessories.length} {t('รายการ')})
                                </h5>
                                <button
                                    onClick={() => setShowAccessoriesModal(true)}
                                    className="rounded bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-500 transition-colors"
                                >
                                    {t('ดูอุปกรณ์')}
                                </button>
                            </div>
                            {currentPump.pumpAccessories.some((acc: any) => !acc.is_included) && (
                                <div className="mt-2 text-xs text-purple-200">
                                    <span>{t('ราคาอุปกรณ์เสริม:')}</span>{' '}
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

            {showAccessoriesModal && currentPump && currentPump.pumpAccessories && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
                    onClick={() => setShowAccessoriesModal(false)}
                >
                    <div
                        className="relative max-h-[90vh] max-w-[800px] w-full mx-4 bg-gray-800 rounded-lg shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between bg-purple-900 px-4 py-3">
                            <h3 className="text-lg font-medium text-white">
                                🔧 {t('อุปกรณ์ประกอบ')} - {currentPump.name}
                            </h3>
                            <button
                                onClick={() => setShowAccessoriesModal(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
                                title={t('ปิด')}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-4">
                            {currentPump.pumpAccessories.length > 5 && (
                                <div className="mb-3 text-center text-xs text-gray-400">
                                    📜 {t('มีอุปกรณ์')} {currentPump.pumpAccessories.length} {t('รายการ - เลื่อนเพื่อดูเพิ่มเติม')}
                                </div>
                            )}
                            <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                                {currentPump.pumpAccessories
                                    .sort(
                                        (a: any, b: any) =>
                                            (a.sort_order || 0) - (b.sort_order || 0)
                                    )
                                    .map((accessory: any, index: number) => (
                                        <div
                                            key={accessory.id || index}
                                            className="flex items-center justify-between rounded bg-gray-700 p-3"
                                        >
                                            <div className="flex items-center space-x-4">
                                                {renderAccessoryImage(accessory)}
                                                <div className="text-sm">
                                                    <p className="font-medium text-white">
                                                        {accessory.name}
                                                    </p>
                                                    <p className="capitalize text-gray-300">
                                                        {accessory.accessory_type?.replace(
                                                            '_',
                                                            ' '
                                                        )}
                                                        {accessory.size && ` • ${accessory.size}`}
                                                    </p>
                                                    {accessory.specifications &&
                                                        Object.keys(accessory.specifications)
                                                            .length > 0 && (
                                                            <div className="mt-1 text-xs text-gray-400">
                                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                                    {Object.entries(
                                                                        accessory.specifications
                                                                    ).map(([key, value]) => (
                                                                        <div key={key}>
                                                                            <span className="font-medium">{key}:</span>{' '}
                                                                            <span>{String(value)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    {accessory.description && (
                                                        <p className="mt-1 text-xs text-gray-400">
                                                            {accessory.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div
                                                    className={`text-sm font-medium ${accessory.is_included ? 'text-green-300' : 'text-yellow-300'}`}
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
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        ({t('แยกขาย')})
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>

                            {currentPump.pumpAccessories.some((acc: any) => !acc.is_included) && (
                                <div className="mt-4 rounded bg-purple-800 p-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-purple-200">{t('รวมราคาอุปกรณ์เสริม:')}</span>
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
                    </div>
                </div>
            )}
        </div>
    );
};

export default PumpSelector;
