// resources\js\pages\components\PumpSelector.tsx - Updated version with image modal
import React, { useState } from 'react';
import { CalculationResults } from '../types/interfaces';

interface PumpSelectorProps {
    selectedPump: any;
    onPumpChange: (pump: any) => void;
    results: CalculationResults;
}

const PumpSelector: React.FC<PumpSelectorProps> = ({ selectedPump, onPumpChange, results }) => {
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

    const requiredFlow = results.flows.main;
    const requiredHead = results.pumpHeadRequired;

    // ใช้ข้อมูลที่ได้จาก database และผ่านการวิเคราะห์แล้วใน useCalculations
    const analyzedPumps = results.analyzedPumps || [];

    // เรียงลำดับตามคะแนน (ได้ทำใน useCalculations แล้ว)
    const sortedPumps = analyzedPumps.sort((a, b) => {
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

    const getRecommendationIcon = (pump: any) => {
        if (pump.isRecommended) return '🌟 แนะนำ';
        if (pump.isGoodChoice) return '✅ ตัวเลือกดี';
        if (pump.isUsable) return '⚡ ใช้ได้';
        return '⚠️ ควรพิจารณา';
    };

    const getRecommendationColor = (pump: any) => {
        if (pump.isRecommended) return 'text-green-300';
        if (pump.isGoodChoice) return 'text-blue-300';
        if (pump.isUsable) return 'text-yellow-300';
        return 'text-red-300';
    };

    const selectedAnalyzed = selectedPump
        ? analyzedPumps.find((p) => p.id === selectedPump.id)
        : null;

    // Helper function สำหรับแสดงค่า range
    const formatRangeValue = (value: any) => {
        if (Array.isArray(value)) {
            return `${value[0]}-${value[1]}`;
        }
        return String(value);
    };

    // Helper function สำหรับแสดงรูปภาพปั๊ม - UPDATED with modal
    const renderPumpImage = (pump: any) => {
        // ตรวจสอบ field image ทั้งหมดที่เป็นไปได้
        const imageUrl = pump.image_url || pump.image || pump.imageUrl;

        if (imageUrl) {
            return (
                <img
                    src={imageUrl}
                    alt={pump.name || 'Pump'}
                    className="h-auto max-h-[100px] w-[100px] cursor-pointer rounded border border-gray-500 object-contain transition-opacity hover:border-blue-400 hover:opacity-80"
                    onError={(e) => {
                        console.log('Failed to load pump image:', imageUrl);
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) {
                            fallback.style.display = 'flex';
                        }
                    }}
                    onClick={() => openImageModal(imageUrl, pump.name || 'ปั๊มน้ำ')}
                    title="คลิกเพื่อดูรูปขนาดใหญ่"
                />
            );
        }

        return null;
    };

    // Helper function สำหรับ fallback image ปั๊ม
    const renderPumpImageFallback = (pump: any) => {
        const imageUrl = pump.image_url || pump.image || pump.imageUrl;

        return (
            <div
                className="flex h-[60px] w-[85px] items-center justify-center rounded border border-gray-600 bg-gray-500 text-xs text-gray-300"
                style={{ display: imageUrl ? 'none' : 'flex' }}
            >
                🚰 ปั๊ม
            </div>
        );
    };

    // Helper function สำหรับแสดงรูปภาพ accessory - UPDATED with modal
    const renderAccessoryImage = (accessory: any) => {
        // ตรวจสอบว่ามีรูปภาพหรือไม่ (รองรับทั้ง image_url, image, และ imageUrl)
        const imageUrl = accessory.image_url || accessory.image || accessory.imageUrl;

        if (imageUrl) {
            return (
                <img
                    src={imageUrl}
                    alt={accessory.name}
                    className="h-10 w-10 cursor-pointer rounded border border-gray-600 object-cover transition-opacity hover:border-blue-400 hover:opacity-80"
                    onError={(e) => {
                        console.log('Failed to load accessory image:', imageUrl);
                        // ถ้าโหลดรูปไม่ได้ ให้แสดง fallback
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) {
                            fallback.style.display = 'flex';
                        }
                    }}
                    onClick={() => openImageModal(imageUrl, accessory.name)}
                    title="คลิกเพื่อดูรูปขนาดใหญ่"
                />
            );
        }

        return null; // ถ้าไม่มีรูปจะแสดง fallback
    };

    // Helper function สำหรับ fallback icon
    const renderAccessoryFallback = (accessory: any) => {
        // Icon ตามประเภทอุปกรณ์
        const getIconForType = (type: string) => {
            switch (type) {
                case 'foot_valve':
                    return '🔧';
                case 'check_valve':
                    return '⚙️';
                case 'ball_valve':
                    return '🔩';
                case 'pressure_gauge':
                    return '📊';
                default:
                    return '🔧';
            }
        };

        const imageUrl = accessory.image_url || accessory.image || accessory.imageUrl;

        return (
            <div
                className="flex h-10 w-10 items-center justify-center rounded border border-gray-600 bg-gray-600 text-sm"
                style={{ display: imageUrl ? 'none' : 'flex' }}
            >
                {getIconForType(accessory.accessory_type)}
            </div>
        );
    };

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h3 className="mb-4 text-lg font-semibold text-red-400">เลือกปั๊มน้ำ</h3>

            {/* ข้อมูลความต้องการ */}
            <div className="mb-4 rounded bg-gray-600 p-3">
                <h4 className="mb-2 text-sm font-medium text-red-300">⚡ ความต้องการ:</h4>
                <div className="text-xs text-gray-300">
                    <p>
                        อัตราการไหล:{' '}
                        <span className="font-bold text-blue-300">
                            {requiredFlow.toFixed(1)} LPM
                        </span>
                    </p>
                    <p>
                        Head รวม:{' '}
                        <span className="font-bold text-yellow-300">
                            {requiredHead.toFixed(1)} เมตร
                        </span>
                    </p>
                </div>
            </div>

            <select
                value={selectedPump?.id || ''}
                onChange={(e) => {
                    const selected = analyzedPumps.find((p) => p.id === parseInt(e.target.value));
                    onPumpChange(selected);
                }}
                className="mb-4 w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
            >
                <option value="">-- เลือกปั๊ม --</option>
                {sortedPumps.map((pump) => (
                    <option key={pump.id} value={pump.id}>
                        {pump.productCode || pump.productCode} ({pump.powerHP}HP) - {pump.price} บาท
                        | {getRecommendationIcon(pump)}
                    </option>
                ))}
            </select>

            {selectedPump && selectedAnalyzed && (
                <div className="rounded bg-gray-600 p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium text-white">ข้อมูลปั๊มที่เลือก</h4>
                        <span
                            className={`text-sm font-bold ${getRecommendationColor(selectedAnalyzed)}`}
                        >
                            {getRecommendationIcon(selectedAnalyzed)}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 items-center justify-between gap-3 text-sm">
                        <div className="flex items-center justify-center">
                            {/* Container สำหรับรูปปั๊มและ fallback - WITH MODAL */}
                            <div className="relative">
                                {renderPumpImage(selectedPump)}
                                {renderPumpImageFallback(selectedPump)}
                            </div>
                        </div>
                        <div>
                            <p>
                                <strong>รุ่น:</strong>{' '}
                                {selectedPump.productCode || selectedPump.product_code}
                            </p>
                            <p>
                                <strong>ชื่อ:</strong> {selectedPump.name}
                            </p>
                            <p>
                                <strong>กำลัง:</strong>{' '}
                                {selectedPump.powerHP != null
                                    ? selectedPump.powerHP
                                    : (selectedPump.powerKW * 1.341).toFixed(1)}{' '}
                                HP (
                                {selectedPump.powerKW != null
                                    ? selectedPump.powerKW
                                    : (selectedPump.powerHP * 0.7457).toFixed(1)}{' '}
                                kW)
                            </p>
                            <p>
                                <strong>เฟส:</strong> {selectedPump.phase} เฟส
                            </p>
                            <p>
                                <strong>ท่อเข้า/ออก:</strong> {selectedPump.inlet_size_inch}"/
                                {selectedPump.outlet_size_inch}"
                            </p>
                            {selectedPump.brand && (
                                <p>
                                    <strong>แบรนด์:</strong> {selectedPump.brand}
                                </p>
                            )}
                        </div>
                        <div>
                            <p>
                                <strong>Flow Max:</strong> {selectedAnalyzed.maxFlow || 'N/A'} LPM
                            </p>
                            <p>
                                <strong>Head Max:</strong> {selectedAnalyzed.maxHead || 'N/A'} เมตร
                            </p>
                            <p>
                                <strong>S.D(ความลึกดูด):</strong>{' '}
                                {selectedPump.suction_depth_m || 'N/A'} เมตร
                            </p>
                            <p>
                                <strong>ราคา:</strong> {selectedPump.price.toLocaleString()} บาท
                            </p>
                            {selectedPump.weight_kg && (
                                <p>
                                    <strong>น้ำหนัก:</strong> {selectedPump.weight_kg} kg
                                </p>
                            )}
                        </div>
                    </div>

                    {/* การตรวจสอบความเพียงพอ */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <p>
                            <strong>Flow:</strong>{' '}
                            <span
                                className={`font-bold ${
                                    selectedAnalyzed.isFlowAdequate
                                        ? 'text-green-300'
                                        : 'text-red-300'
                                }`}
                            >
                                {selectedAnalyzed.isFlowAdequate ? '✅ เพียงพอ' : '❌ ไม่เพียงพอ'}
                            </span>
                            <span className="ml-2 text-gray-400">
                                ({selectedAnalyzed.flowRatio.toFixed(1)}x)
                            </span>
                        </p>
                        <p>
                            <strong>Head:</strong>{' '}
                            <span
                                className={`font-bold ${
                                    selectedAnalyzed.isHeadAdequate
                                        ? 'text-green-300'
                                        : 'text-red-300'
                                }`}
                            >
                                {selectedAnalyzed.isHeadAdequate ? '✅ เพียงพอ' : '❌ ไม่เพียงพอ'}
                            </span>
                            <span className="ml-2 text-gray-400">
                                ({selectedAnalyzed.headRatio.toFixed(1)}x)
                            </span>
                        </p>
                    </div>

                    {/* การวิเคราะห์ความเหมาะสม */}
                    <div className="mt-3 rounded bg-gray-500 p-2">
                        <h5 className="text-xs font-medium text-yellow-300">การวิเคราะห์:</h5>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <p>
                                คะแนนรวม:{' '}
                                <span className="font-bold">{selectedAnalyzed.score}</span>/100
                            </p>
                            <p>
                                กำลังประมาณ:{' '}
                                <span className="font-bold">
                                    {selectedAnalyzed.estimatedHP.toFixed(1)}
                                </span>{' '}
                                HP
                            </p>
                        </div>
                    </div>

                    {/* แสดงข้อมูลเพิ่มเติมจากฐานข้อมูล */}
                    {selectedPump.description && (
                        <div className="mt-3 rounded bg-gray-800 p-2">
                            <p className="text-xs text-gray-300">
                                <strong>รายละเอียด:</strong> {selectedPump.description}
                            </p>
                        </div>
                    )}

                    {/* แสดงช่วงการทำงาน */}
                    <div className="mt-3 rounded bg-blue-900 p-2">
                        <h5 className="text-xs font-medium text-blue-300">ช่วงการทำงาน:</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <p>
                                    อัตราการไหล: {formatRangeValue(selectedPump.flow_rate_lpm)} LPM
                                </p>
                                <p>Head: {formatRangeValue(selectedPump.head_m)} เมตร</p>
                            </div>
                            <div>
                                <p>ขนาดท่อเข้า: {selectedPump.inlet_size_inch}"</p>
                                <p>ขนาดท่อออก: {selectedPump.outlet_size_inch}"</p>
                            </div>
                        </div>
                    </div>

                    {/* แสดง Pump Accessories (ถ้ามี) - UPDATED WITH MODAL */}
                    {selectedPump.pumpAccessories && selectedPump.pumpAccessories.length > 0 && (
                        <div className="mt-3 rounded bg-purple-900 p-2">
                            <h5 className="mb-2 text-xs font-medium text-purple-300">
                                🔧 อุปกรณ์ประกอบ ({selectedPump.pumpAccessories.length} รายการ):
                            </h5>
                            <div className="space-y-2">
                                {selectedPump.pumpAccessories
                                    .sort(
                                        (a: any, b: any) =>
                                            (a.sort_order || 0) - (b.sort_order || 0)
                                    )
                                    .map((accessory: any, index: number) => (
                                        <div
                                            key={accessory.id || index}
                                            className="flex items-center justify-between rounded bg-purple-800 p-2"
                                        >
                                            {/* รูปภาพและข้อมูลอุปกรณ์ */}
                                            <div className="flex items-center space-x-3">
                                                {/* Container สำหรับรูปและ fallback - WITH MODAL */}
                                                <div className="relative">
                                                    {renderAccessoryImage(accessory)}
                                                    {renderAccessoryFallback(accessory)}
                                                </div>

                                                {/* ข้อมูลอุปกรณ์ */}
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
                                                                    .slice(0, 1) // แสดงแค่ 1 spec แรก
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

                                            {/* ราคาและสถานะ */}
                                            <div className="text-right text-xs">
                                                <div
                                                    className={`font-medium ${
                                                        accessory.is_included
                                                            ? 'text-green-300'
                                                            : 'text-yellow-300'
                                                    }`}
                                                >
                                                    {accessory.is_included ? (
                                                        <span>✅ รวมในชุด</span>
                                                    ) : (
                                                        <span>
                                                            💰 +
                                                            {Number(
                                                                accessory.price || 0
                                                            ).toLocaleString()}{' '}
                                                            บาท
                                                        </span>
                                                    )}
                                                </div>
                                                {!accessory.is_included && (
                                                    <div className="text-purple-200">(แยกขาย)</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>

                            {/* สรุปราคาอุปกรณ์เสริม */}
                            {selectedPump.pumpAccessories.some((acc: any) => !acc.is_included) && (
                                <div className="mt-2 rounded bg-purple-800 p-2 text-xs">
                                    <div className="flex justify-between text-purple-200">
                                        <span>ราคาอุปกรณ์เสริม:</span>
                                        <span className="font-medium text-yellow-300">
                                            +
                                            {selectedPump.pumpAccessories
                                                .filter((acc: any) => !acc.is_included)
                                                .reduce(
                                                    (sum: number, acc: any) =>
                                                        sum + (Number(acc.price) || 0),
                                                    0
                                                )
                                                .toLocaleString()}{' '}
                                            บาท
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* เตือนความไม่เพียงพอ */}
                    {(!selectedAnalyzed.isFlowAdequate || !selectedAnalyzed.isHeadAdequate) && (
                        <div className="mt-3 rounded bg-red-900 p-2">
                            <p className="text-sm text-red-300">
                                ⚠️ <strong>คำเตือน:</strong> ปั๊มนี้
                                {!selectedAnalyzed.isFlowAdequate && ' อัตราการไหลไม่เพียงพอ'}
                                {!selectedAnalyzed.isFlowAdequate &&
                                    !selectedAnalyzed.isHeadAdequate &&
                                    ' และ'}
                                {!selectedAnalyzed.isHeadAdequate && ' ความสูงยกไม่เพียงพอ'}{' '}
                                สำหรับระบบนี้
                            </p>
                        </div>
                    )}

                    {/* คำแนะนำการประหยัดพลังงาน */}
                    {(selectedAnalyzed.flowRatio > 3 || selectedAnalyzed.headRatio > 3) && (
                        <div className="mt-3 rounded bg-yellow-900 p-2">
                            <p className="text-sm text-yellow-300">
                                💰 <strong>หมายเหตุ:</strong> ปั๊มนี้มีขนาดใหญ่เกินความต้องการ
                                อาจสิ้นเปลืองพลังงาน ควรพิจารณาใช้ปั๊มขนาดเล็กกว่า
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
        </div>
    );
};

export default PumpSelector;
