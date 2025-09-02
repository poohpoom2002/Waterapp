/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// resources\js\pages\components\SprinklerSelector.tsx - Fixed units and properties
import React, { useState, useEffect, useMemo } from 'react';
import { CalculationResults } from '../types/interfaces';
import { Zone } from '../../utils/horticultureUtils';
import { formatWaterFlow, formatRadius } from '../utils/calculations';
import { useLanguage } from '@/contexts/LanguageContext';
import SearchableDropdown from './SearchableDropdown';

interface SprinklerSelectorProps {
    selectedSprinkler: any;
    onSprinklerChange: (sprinkler: any) => void;
    results: CalculationResults;
    activeZone?: Zone;
    allZoneSprinklers: { [zoneId: string]: any };
    projectMode?: 'horticulture' | 'garden' | 'field-crop' | 'greenhouse';
}

const SprinklerSelector: React.FC<SprinklerSelectorProps> = ({
    selectedSprinkler,
    onSprinklerChange,
    results,
    activeZone,
    allZoneSprinklers,
    projectMode = 'horticulture',
}) => {
    const [showImageModal, setShowImageModal] = useState(false);
    const [modalImage, setModalImage] = useState({ src: '', alt: '' });
    const { t } = useLanguage();
    
    const analyzedSprinklers = useMemo(() => results.analyzedSprinklers || [], [results.analyzedSprinklers]);

    // Auto-select sprinkler for horticulture mode based on system requirements
    useEffect(() => {
        if (projectMode === 'horticulture' && !selectedSprinkler && analyzedSprinklers.length > 0) {
            // โหลดข้อมูลระบบหัวฉีดจาก localStorage
            const horticultureSystemDataStr = localStorage.getItem('horticultureSystemData');
            if (horticultureSystemDataStr) {
                try {
                    const horticultureSystemData = JSON.parse(horticultureSystemDataStr);
                    const { sprinklerConfig } = horticultureSystemData;
                    
                    if (sprinklerConfig) {
                        const { flowRatePerPlant, pressureBar, radiusMeters } = sprinklerConfig;
                        
                        // กรองสปริงเกอร์ที่มีคุณสมบัติตรงตามข้อกำหนด
                        const compatibleSprinklers = analyzedSprinklers.filter((sprinkler: any) => {
                            // ตรวจสอบ waterVolumeLitersPerMinute
                            const flowMatch = sprinkler.waterVolumeLitersPerMinute ? 
                                (Array.isArray(sprinkler.waterVolumeLitersPerMinute) ? 
                                    (flowRatePerPlant >= sprinkler.waterVolumeLitersPerMinute[0] && 
                                     flowRatePerPlant <= sprinkler.waterVolumeLitersPerMinute[1]) :
                                    Math.abs(sprinkler.waterVolumeLitersPerMinute - flowRatePerPlant) <= (flowRatePerPlant * 0.2)) : false;
                            
                            // ตรวจสอบ pressureBar
                            const pressureMatch = sprinkler.pressureBar ? 
                                (Array.isArray(sprinkler.pressureBar) ? 
                                    (pressureBar >= sprinkler.pressureBar[0] && 
                                     pressureBar <= sprinkler.pressureBar[1]) :
                                    Math.abs(sprinkler.pressureBar - pressureBar) <= (pressureBar * 0.15)) : false;
                            
                            // ตรวจสอบ radiusMeters
                            const radiusMatch = sprinkler.radiusMeters ? 
                                (Array.isArray(sprinkler.radiusMeters) ? 
                                    (radiusMeters >= sprinkler.radiusMeters[0] && 
                                     radiusMeters <= sprinkler.radiusMeters[1]) :
                                    Math.abs(sprinkler.radiusMeters - radiusMeters) <= (radiusMeters * 0.2)) : false;
                            
                            return flowMatch && pressureMatch && radiusMatch;
                        });
                        
                        // เลือกสปริงเกอร์ที่เข้าเงื่อนไข (เรียงตามราคาถูกสุดก่อน)
                        if (compatibleSprinklers.length > 0) {
                            const bestSprinkler = compatibleSprinklers.sort((a: any, b: any) => a.price - b.price)[0];
                            onSprinklerChange(bestSprinkler);
                        }
                    }
                } catch (error) {
                    console.warn('Failed to parse horticulture system data for sprinkler selection:', error);
                }
            }
        }
    }, [projectMode, selectedSprinkler, analyzedSprinklers, onSprinklerChange]);
    
    const openImageModal = (src: string, alt: string) => {
        setModalImage({ src, alt });
        setShowImageModal(true);
    };

    const closeImageModal = () => {
        setShowImageModal(false);
        setModalImage({ src: '', alt: '' });
    };
    
    // กรองสปริงเกอร์สำหรับ horticulture mode
    const getFilteredSprinklers = () => {
        if (projectMode !== 'horticulture') {
            return analyzedSprinklers.sort((a, b) => a.price - b.price);
        }
        
        // สำหรับ horticulture mode - กรองเฉพาะสปริงเกอร์ที่เข้ากันได้
        const horticultureSystemDataStr = localStorage.getItem('horticultureSystemData');
        if (!horticultureSystemDataStr) {
            return analyzedSprinklers.sort((a, b) => a.price - b.price);
        }
        
        try {
            const horticultureSystemData = JSON.parse(horticultureSystemDataStr);
            const { sprinklerConfig } = horticultureSystemData;
            
            if (!sprinklerConfig) {
                return analyzedSprinklers.sort((a, b) => a.price - b.price);
            }
            
            const { flowRatePerPlant, pressureBar, radiusMeters } = sprinklerConfig;
            
            // กรองสปริงเกอร์ที่มีคุณสมบัติตรงตามข้อกำหนด
            const compatibleSprinklers = analyzedSprinklers.filter((sprinkler: any) => {
                // ตรวจสอบ waterVolumeLitersPerMinute
                const flowMatch = sprinkler.waterVolumeLitersPerMinute ? 
                    (Array.isArray(sprinkler.waterVolumeLitersPerMinute) ? 
                        (flowRatePerPlant >= sprinkler.waterVolumeLitersPerMinute[0] && 
                         flowRatePerPlant <= sprinkler.waterVolumeLitersPerMinute[1]) :
                        Math.abs(sprinkler.waterVolumeLitersPerMinute - flowRatePerPlant) <= (flowRatePerPlant * 0.2)) : false;
                
                // ตรวจสอบ pressureBar
                const pressureMatch = sprinkler.pressureBar ? 
                    (Array.isArray(sprinkler.pressureBar) ? 
                        (pressureBar >= sprinkler.pressureBar[0] && 
                         pressureBar <= sprinkler.pressureBar[1]) :
                        Math.abs(sprinkler.pressureBar - pressureBar) <= (pressureBar * 0.15)) : false;
                
                // ตรวจสอบ radiusMeters
                const radiusMatch = sprinkler.radiusMeters ? 
                    (Array.isArray(sprinkler.radiusMeters) ? 
                        (radiusMeters >= sprinkler.radiusMeters[0] && 
                         radiusMeters <= sprinkler.radiusMeters[1]) :
                        Math.abs(sprinkler.radiusMeters - radiusMeters) <= (radiusMeters * 0.2)) : false;
                
                return flowMatch && pressureMatch && radiusMatch;
            });
            
            // เรียงตามราคาถูกสุดก่อน
            return compatibleSprinklers.sort((a: any, b: any) => a.price - b.price);
            
        } catch (error) {
            console.warn('Failed to parse horticulture system data for filtering:', error);
            return analyzedSprinklers.sort((a, b) => a.price - b.price);
        }
    };
    
    const sortedSprinklers = getFilteredSprinklers();
    const selectedAnalyzed = selectedSprinkler
        ? analyzedSprinklers.find((s) => s.id === selectedSprinkler.id)
        : null;

    const formatRangeValue = (value: any) => {
        if (Array.isArray(value)) return `${value[0]}-${value[1]}`;
        return String(value);
    };

    const getAverageValue = (value: any) => {
        if (Array.isArray(value)) return (value[0] + value[1]) / 2;
        return parseFloat(String(value)) || 0;
    };

    const getUniqueSprinklers = () => {
        const sprinklerMap = new Map();
        Object.values(allZoneSprinklers).forEach((sprinkler) => {
            if (sprinkler) sprinklerMap.set(sprinkler.id, sprinkler);
        });
        return Array.from(sprinklerMap.values());
    };

    const getZonesUsingSprinkler = (sprinklerId: number) => {
        const zones: string[] = [];
        Object.entries(allZoneSprinklers).forEach(([zoneId, sprinkler]) => {
            if (sprinkler && sprinkler.id === sprinklerId) {
                zones.push(zoneId);
            }
        });
        return zones;
    };

    const uniqueSprinklers = getUniqueSprinklers();

    const getLabel = (key: string) => {
        if (projectMode === 'garden') {
            switch (key) {
                case 'sprinkler':
                    return 'หัวฉีด';
                case 'perHead':
                    return 'ต่อหัวฉีด';
                case 'totalRequired':
                    return 'จำนวนที่ต้องใช้';
                default:
                    return key;
            }
        }
        return key;
    };

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h3 className="mb-4 text-2xl font-bold text-green-400">
                {t('เลือก')}{projectMode === 'garden' ? t('หัวฉีด') : t('สปริงเกอร์')}
                {activeZone && (
                    <span className="ml-2 text-sm font-normal text-gray-400">
                        - {activeZone.name}
                    </span>
                )}
            </h3>

            <div className="mb-4 rounded bg-gray-600 p-3">
                <h4 className="mb-2 text-sm font-medium text-green-300">
                    💧 {t('ความต้องการ')} {activeZone ? ` (${activeZone.name})` : ''}:
                </h4>
                <div className="text-xs text-gray-300">
                    <p>
                        {t('อัตราการไหล')} {projectMode === 'garden' ? t('ต่อหัวฉีด') : t('ต่อหัว')}:{' '}
                        <span className="font-bold text-blue-300">
                            {results.waterPerSprinklerLPM.toFixed(1)} {t('LPM')}
                        </span>
                    </p>
                    <p>
                        {t('จำนวนที่ต้องใช้')}:{' '}
                        <span className="font-bold text-yellow-300">
                            {results.totalSprinklers} {t('หัว')}
                        </span>
                        {activeZone && <span className="ml-1 text-gray-400">({t('ในโซนนี้')})</span>}
                    </p>
                </div>
            </div>

            <SearchableDropdown
                value={selectedSprinkler?.id || ''}
                onChange={(value) => {
                    const selected = analyzedSprinklers.find(
                        (s) => s.id === parseInt(value.toString())
                    );
                    onSprinklerChange(selected);
                }}
                options={[
                    { 
                        value: '', 
                        label: `-- ${t('เลือก')} ${projectMode === 'garden' ? t('หัวฉีด') : t('สปริงเกอร์')}${activeZone ? ` ${t('สำหรับ')} ${activeZone.name}` : ''} --`
                    },
                    ...sortedSprinklers.map((sprinkler) => ({
                        value: sprinkler.id,
                        label: `${sprinkler.productCode || ''} - ${sprinkler.name} - ${sprinkler.price} ${t('บาท')} | ${sprinkler.brand || sprinkler.brand_name || '-'}`,
                        searchableText: `${sprinkler.productCode || ''} ${sprinkler.name || ''} ${sprinkler.brand || sprinkler.brand_name || ''}`,
                        image: sprinkler.image,
                        productCode: sprinkler.productCode || (sprinkler as any).product_code,
                        name: sprinkler.name,
                        brand: sprinkler.brand || sprinkler.brand_name,
                        price: sprinkler.price,
                        unit: t('บาท')
                    }))
                ]}
                placeholder={`-- ${t('เลือก')} ${projectMode === 'garden' ? t('หัวฉีด') : t('สปริงเกอร์')}${activeZone ? ` ${t('สำหรับ')} ${activeZone.name}` : ''} --`}
                searchPlaceholder={t('พิมพ์เพื่อค้นหา') + (projectMode === 'garden' ? t('หัวฉีด') : t('สปริงเกอร์')) + ' (ชื่อ, รหัสสินค้า, แบรนด์)...'}
                className="mb-4 w-full"
            />

            {selectedSprinkler && selectedAnalyzed && (
                <div className="rounded bg-gray-600 p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium text-white">
                            <strong>{selectedSprinkler.name}</strong>
                            {activeZone && (
                                <span className="ml-2 text-sm font-normal text-gray-400">
                                    ({t('สำหรับ')} {activeZone.name})
                                </span>
                            )}
                        </h4>
                    </div>

                    <div className="grid grid-cols-10 items-center justify-between gap-3 text-sm">
                        <div className="col-span-2 flex items-center justify-center">
                            {selectedSprinkler.image ? (
                                <img
                                    src={selectedSprinkler.image}
                                    alt={selectedSprinkler.name}
                                    className="h-auto w-[85px] cursor-pointer rounded border border-gray-500 transition-opacity hover:border-blue-400 hover:opacity-80"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                    onClick={() =>
                                        openImageModal(
                                            selectedSprinkler.image,
                                            selectedSprinkler.name
                                        )
                                    }
                                    title={t('คลิกเพื่อดูรูปขนาดใหญ่')}
                                />
                            ) : (
                                <div className="flex h-[60px] w-[85px] items-center justify-center rounded bg-gray-500 text-xs text-gray-300">
                                    {t('ไม่มีรูป')}
                                </div>
                            )}
                        </div>

                        <div className="col-span-4">
                            <p>
                                <strong>{t('รหัสสินค้า:')}</strong>{' '}
                                {selectedSprinkler.productCode || selectedSprinkler.product_code}
                            </p>
                            <p>
                                <strong>{t('อัตราการไหล:')}</strong>{' '}
                                {formatRangeValue(selectedSprinkler.waterVolumeLitersPerMinute)} {t('LPM')}
                            </p>
                            <p>
                                <strong>{t('รัศมี:')}</strong>{' '}
                                {formatRangeValue(selectedSprinkler.radiusMeters)} {t('เมตร')}
                            </p>
                            <p>
                                <strong>{t('แรงดัน:')}</strong>{' '}
                                {formatRangeValue(selectedSprinkler.pressureBar)} {t('บาร์')}
                            </p>
                        </div>

                        <div className="col-span-4">
                            <p>
                                <strong>{t('แบรนด์:')}</strong> {selectedSprinkler.brand || selectedSprinkler.brand_name || '-'}
                            </p>
                            <p>
                                <strong>{t('ราคาต่อหัว:')}</strong> {selectedSprinkler.price?.toLocaleString()} {t('บาท')}
                            </p>
                            <p>
                                <strong>{t('จำนวนที่ต้องใช้:')}</strong> {results.totalSprinklers} {t('หัว')}
                                {activeZone && (
                                    <span className="ml-1 text-xs text-gray-400">({t('โซนนี้')})</span>
                                )}
                            </p>
                            <p>
                                <strong>{t('ราคารวม:')}</strong>{' '}
                                <span className="text-green-300">
                                    {(
                                        selectedSprinkler.price * results.totalSprinklers
                                    ).toLocaleString()}
                                </span>{' '}
                                {t('บาท')}
                            </p>
                        </div>
                    </div>

                    {selectedSprinkler.description && (
                        <div className="mt-3 rounded bg-gray-800 p-2">
                            <p className="text-xs text-gray-300">
                                <strong>{t('รายละเอียด:')}</strong> {selectedSprinkler.description}
                            </p>
                        </div>
                    )}

                    <div className="mt-3 rounded bg-blue-900 p-2">
                        <h5 className="text-xs font-medium text-blue-300">
                            📊 {t('ข้อมูลเพิ่มเติม:')}
                        </h5>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <p>
                                {t('Flow เฉลี่ย:')} {' '}
                                <span className="font-bold text-blue-200">
                                    {getAverageValue(selectedSprinkler.waterVolumeLitersPerMinute).toFixed(1)} LPM
                                </span>
                            </p>
                            <p>
                                {t('รัศมีเฉลี่ย:')} {' '}
                                <span className="font-bold text-blue-200">
                                    {getAverageValue(selectedSprinkler.radiusMeters).toFixed(1)} m
                                </span>
                            </p>
                            <p>
                                {t('แรงดันเฉลี่ย:')} {' '}
                                <span className="font-bold text-blue-200">
                                    {getAverageValue(selectedSprinkler.pressureBar).toFixed(1)} bar
                                </span>
                            </p>
                        </div>
                        <div className="mt-1 text-xs">
                            <p>
                                {t('พื้นที่ครอบคลุม:')} {' '}
                                <span className="font-bold text-yellow-300">
                                    {(
                                        Math.PI *
                                        Math.pow(getAverageValue(selectedSprinkler.radiusMeters), 2)
                                    ).toFixed(1)} ตร.ม./หัว
                                </span>
                            </p>
                            <p>
                                {t('ราคาต่อ LPM:')} {' '}
                                <span className="font-bold text-green-300">
                                    {(selectedSprinkler.price / getAverageValue(selectedSprinkler.waterVolumeLitersPerMinute)).toFixed(2)} บาท/LPM
                                </span>
                            </p>
                        </div>
                    </div>

                    {projectMode === 'garden' && (
                        <div className="mt-3 rounded bg-green-900 p-2">
                            <h5 className="text-xs font-medium text-green-300">
                                🏡 {t('ข้อมูลสำหรับสวนบ้าน:')}
                            </h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <p>{t('ประเภทหัวฉีด:')} {selectedSprinkler.type || 'ไม่ระบุ'}</p>
                                    <p>
                                        {t('พื้นที่ครอบคลุม:')} {' '}
                                        {(
                                            Math.PI *
                                            Math.pow(
                                                getAverageValue(selectedSprinkler.radiusMeters),
                                                2
                                            )
                                        ).toFixed(1)}{' '}
                                        {t('ตร.ม./หัว')}
                                    </p>
                                </div>
                                <div>
                                    <p>{t('เหมาะสำหรับ:')} {selectedSprinkler.suitable_for || 'ทั่วไป'}</p>
                                    <p>
                                        {t('การติดตั้ง:')} {' '}
                                        {selectedSprinkler.installation || 'ฝังดิน/ยกพื้น'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeZone && projectMode === 'horticulture' && (
                        <div className="mt-3 rounded bg-green-900 p-2">
                            <h5 className="text-xs font-medium text-green-300">{t('ข้อมูลโซน:')}</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    {activeZone.area >= 1600 ? (
                                        <p>{t('พื้นที่โซน:')} {(activeZone.area / 1600).toFixed(1)} {t('ไร่')}</p>
                                    ) : (
                                        <p>{t('พื้นที่โซน:')} {activeZone.area.toFixed(2)} {t('ตร.ม.')}</p>
                                    )}
                                    <p>{t('จำนวนต้นไม้:')} {activeZone.plantCount} {t('ต้น')}</p>
                                </div>
                                <div>
                                    <p>{t('พืชที่ปลูก:')} {activeZone.plantData?.name || 'ไม่ระบุ'}</p>
                                    <p>
                                        {t('น้ำต่อต้น:')} {activeZone.plantData?.waterNeed || 0} {t('ลิตร/ครั้ง')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
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

export default SprinklerSelector;