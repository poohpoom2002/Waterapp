// resources\js\pages\components\PumpSelector.tsx - Interactive Version
import React, { useState } from 'react';
import { CalculationResults } from '../types/interfaces';

interface PumpSelectorProps {
    results: CalculationResults;
    selectedPump?: any; // Current selected pump (manual or auto)
    onPumpChange: (pump: any) => void; // Callback when pump changes
}

const PumpSelector: React.FC<PumpSelectorProps> = ({ results, selectedPump, onPumpChange }) => {
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

    // Use selectedPump if provided, otherwise use auto-selected
    const currentPump = selectedPump || results.autoSelectedPump;
    const autoSelectedPump = results.autoSelectedPump;
    const analyzedPumps = results.analyzedPumps || [];

    // Sort pumps for dropdown (recommended first, then by score)
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

    // ฟังก์ชันแสดงสถานะการเลือก
    const getSelectionStatus = (pump: any) => {
        if (!pump) return null;

        const isAutoSelected = pump.id === autoSelectedPump?.id;

        if (isAutoSelected) {
            if (pump.isRecommended) {
                return '🤖⭐ เลือกอัตโนมัติ (แนะนำ)';
            } else if (pump.isGoodChoice) {
                return '🤖✅ เลือกอัตโนมัติ (ดี)';
            } else if (pump.isUsable) {
                return '🤖⚡ เลือกอัตโนมัติ (ใช้ได้)';
            } else {
                return '🤖⚠️ เลือกอัตโนมัติ (ตัวดีที่สุดที่มี)';
            }
        } else {
            return '👤 เลือกเอง';
        }
    };

    // ฟังก์ชันสำหรับจัดกลุ่มปั๊ม
    const getPumpGrouping = (pump: any) => {
        if (pump.isRecommended) return 'แนะนำ';
        if (pump.isGoodChoice) return 'ตัวเลือกดี';
        if (pump.isUsable) return 'ใช้ได้';
        return 'อื่นๆ';
    };

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
            <h3 className="mb-4 text-lg font-semibold text-red-400">
                ปั๊มน้ำ
                <span className="ml-2 text-sm font-normal text-gray-400">
                    (🤖 เลือกอัตโนมัติ + ปรับแต่งได้)
                </span>
            </h3>

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

            {/* Pump Selection Dropdown */}
            <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-300">
                    เลือกปั๊มน้ำ:
                </label>
                <select
                    value={currentPump?.id || ''}
                    onChange={(e) => {
                        const selected = analyzedPumps.find(
                            (p) => p.id === parseInt(e.target.value)
                        );
                        onPumpChange(selected || null);
                    }}
                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
                >
                    <option value="">-- ใช้การเลือกอัตโนมัติ --</option>
                    {sortedPumps.map((pump) => {
                        const group = getPumpGrouping(pump);
                        const isAuto = pump.id === autoSelectedPump?.id;
                        const isAdequate = pump.isFlowAdequate && pump.isHeadAdequate;
                        return (
                            <option key={pump.id} value={pump.id} disabled={!isAdequate}>
                                {isAuto ? '🤖 ' : ''}
                                {pump.name || pump.productCode} - {pump.powerHP}HP -
                                {pump.price?.toLocaleString()} บาท | {group} | คะแนน: {pump.score}
                                {!isAdequate ? ' (ไม่เพียงพอ)' : ''}
                            </option>
                        );
                    })}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                    เว้นว่างไว้เพื่อใช้การเลือกอัตโนมัติ หรือเลือกปั๊มที่ต้องการ
                </p>
            </div>

            {currentPump ? (
                <div className="rounded bg-gray-600 p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium text-white">ปั๊มที่เลือก</h4>
                        <span className="text-sm font-bold text-green-300">
                            คะแนน: {currentPump.score}/100
                        </span>
                    </div>

                    {/* แสดงสถานะการเลือก */}
                    <div className="mb-3 rounded bg-blue-900 p-2">
                        <p className="text-sm text-blue-300">{getSelectionStatus(currentPump)}</p>
                    </div>

                    <div className="grid grid-cols-3 items-center justify-between gap-3 text-sm">
                        <div className="flex items-center justify-center">
                            {/* Container สำหรับรูปปั๊มและ fallback - WITH MODAL */}
                            <div className="relative">
                                {renderPumpImage(currentPump)}
                                {renderPumpImageFallback(currentPump)}
                            </div>
                        </div>
                        <div>
                            <p>
                                <strong>รุ่น:</strong> {currentPump.productCode}
                            </p>
                            <p>
                                <strong>ชื่อ:</strong> {currentPump.name || currentPump.productCode}
                            </p>
                            <p>
                                <strong>กำลัง:</strong>{' '}
                                {currentPump.powerHP != null
                                    ? currentPump.powerHP
                                    : (currentPump.powerKW * 1.341).toFixed(1)}{' '}
                                HP (
                                {currentPump.powerKW != null
                                    ? currentPump.powerKW
                                    : (currentPump.powerHP * 0.7457).toFixed(1)}{' '}
                                kW)
                            </p>
                            <p>
                                <strong>เฟส:</strong> {currentPump.phase} เฟส
                            </p>
                            <p>
                                <strong>ท่อเข้า/ออก:</strong> {currentPump.inlet_size_inch}"/
                                {currentPump.outlet_size_inch}"
                            </p>
                            {currentPump.brand && (
                                <p>
                                    <strong>แบรนด์:</strong> {currentPump.brand}
                                </p>
                            )}
                        </div>
                        <div>
                            <p>
                                <strong>Flow Max:</strong> {currentPump.maxFlow || 'N/A'} LPM
                            </p>
                            <p>
                                <strong>Head Max:</strong> {currentPump.maxHead || 'N/A'} เมตร
                            </p>
                            <p>
                                <strong>S.D(ความลึกดูด):</strong>{' '}
                                {currentPump.suction_depth_m || 'N/A'} เมตร
                            </p>
                            <p>
                                <strong>ราคา:</strong> {currentPump.price?.toLocaleString()} บาท
                            </p>
                            {currentPump.weight_kg && (
                                <p>
                                    <strong>น้ำหนัก:</strong> {currentPump.weight_kg} kg
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
                                    currentPump.isFlowAdequate ? 'text-green-300' : 'text-red-300'
                                }`}
                            >
                                {currentPump.isFlowAdequate ? '✅ เพียงพอ' : '❌ ไม่เพียงพอ'}
                            </span>
                            <span className="ml-2 text-gray-400">
                                ({currentPump.flowRatio.toFixed(1)}x)
                            </span>
                        </p>
                        <p>
                            <strong>Head:</strong>{' '}
                            <span
                                className={`font-bold ${
                                    currentPump.isHeadAdequate ? 'text-green-300' : 'text-red-300'
                                }`}
                            >
                                {currentPump.isHeadAdequate ? '✅ เพียงพอ' : '❌ ไม่เพียงพอ'}
                            </span>
                            <span className="ml-2 text-gray-400">
                                ({currentPump.headRatio.toFixed(1)}x)
                            </span>
                        </p>
                    </div>

                    {/* การวิเคราะห์ความเหมาะสม */}
                    <div className="mt-3 rounded bg-gray-500 p-2">
                        <h5 className="text-xs font-medium text-yellow-300">การวิเคราะห์:</h5>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <p>
                                คะแนนรวม: <span className="font-bold">{currentPump.score}</span>/100
                            </p>
                            <p>
                                กำลังประมาณ:{' '}
                                <span className="font-bold">
                                    {currentPump.estimatedHP.toFixed(1)}
                                </span>{' '}
                                HP
                            </p>
                            <p>
                                ประสิทธิภาพ/บาท:{' '}
                                <span className="font-bold">
                                    {currentPump.flowPerBaht.toFixed(3)}
                                </span>
                            </p>
                        </div>
                        <div className="mt-1 text-xs">
                            <p>
                                ความเหมาะสม:
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
                                        ? '⭐ แนะนำ'
                                        : currentPump.isGoodChoice
                                          ? '✅ ดี'
                                          : currentPump.isUsable
                                            ? '⚡ ใช้ได้'
                                            : '⚠️ ไม่เหมาะสม'}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* แสดงข้อมูลเพิ่มเติมจากฐานข้อมูล */}
                    {currentPump.description && (
                        <div className="mt-3 rounded bg-gray-800 p-2">
                            <p className="text-xs text-gray-300">
                                <strong>รายละเอียด:</strong> {currentPump.description}
                            </p>
                        </div>
                    )}

                    {/* แสดงช่วงการทำงาน */}
                    <div className="mt-3 rounded bg-blue-900 p-2">
                        <h5 className="text-xs font-medium text-blue-300">ช่วงการทำงาน:</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <p>
                                    อัตราการไหล: {formatRangeValue(currentPump.flow_rate_lpm)} LPM
                                </p>
                                <p>Head: {formatRangeValue(currentPump.head_m)} เมตร</p>
                            </div>
                            <div>
                                <p>ขนาดท่อเข้า: {currentPump.inlet_size_inch}"</p>
                                <p>ขนาดท่อออก: {currentPump.outlet_size_inch}"</p>
                            </div>
                        </div>
                    </div>

                    {/* แสดงความแตกต่างจากการเลือกอัตโนมัติ */}
                    {selectedPump &&
                        selectedPump.id !== autoSelectedPump?.id &&
                        autoSelectedPump && (
                            <div className="mt-3 rounded bg-yellow-900 p-2">
                                <h5 className="text-xs font-medium text-yellow-300">
                                    เปรียบเทียบกับการเลือกอัตโนมัติ:
                                </h5>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <p className="text-gray-300">
                                            อัตโนมัติ: {autoSelectedPump.productCode}
                                        </p>
                                        <p className="text-gray-300">
                                            กำลัง: {autoSelectedPump.powerHP}HP
                                        </p>
                                        <p className="text-gray-300">
                                            คะแนน: {autoSelectedPump.score}
                                        </p>
                                        <p className="text-gray-300">
                                            ราคา: {autoSelectedPump.price?.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-white">
                                            เลือกเอง: {selectedPump.productCode}
                                        </p>
                                        <p className="text-white">
                                            กำลัง: {selectedPump.powerHP}HP
                                        </p>
                                        <p className="text-white">คะแนน: {selectedPump.score}</p>
                                        <p className="text-white">
                                            ราคา: {selectedPump.price?.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-1 text-xs">
                                    <p className="text-yellow-200">
                                        ส่วนต่างคะแนน:
                                        <span
                                            className={`ml-1 font-bold ${
                                                selectedPump.score >= autoSelectedPump.score
                                                    ? 'text-green-300'
                                                    : 'text-red-300'
                                            }`}
                                        >
                                            {selectedPump.score >= autoSelectedPump.score
                                                ? '+'
                                                : ''}
                                            {(selectedPump.score - autoSelectedPump.score).toFixed(
                                                1
                                            )}{' '}
                                            คะแนน
                                        </span>
                                    </p>
                                    <p className="text-yellow-200">
                                        ส่วนต่างราคา:
                                        <span
                                            className={`ml-1 font-bold ${
                                                selectedPump.price <= autoSelectedPump.price
                                                    ? 'text-green-300'
                                                    : 'text-red-300'
                                            }`}
                                        >
                                            {selectedPump.price <= autoSelectedPump.price
                                                ? '-'
                                                : '+'}
                                            {Math.abs(
                                                selectedPump.price - autoSelectedPump.price
                                            ).toLocaleString()}{' '}
                                            บาท
                                        </span>
                                    </p>
                                </div>
                            </div>
                        )}

                    {/* แสดง Pump Accessories (ถ้ามี) - UPDATED WITH MODAL */}
                    {currentPump.pumpAccessories && currentPump.pumpAccessories.length > 0 && (
                        <div className="mt-3 rounded bg-purple-900 p-2">
                            <h5 className="mb-2 text-xs font-medium text-purple-300">
                                🔧 อุปกรณ์ประกอบ ({currentPump.pumpAccessories.length} รายการ):
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
                            {currentPump.pumpAccessories.some((acc: any) => !acc.is_included) && (
                                <div className="mt-2 rounded bg-purple-800 p-2 text-xs">
                                    <div className="flex justify-between text-purple-200">
                                        <span>ราคาอุปกรณ์เสริม:</span>
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
                                            บาท
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* เตือนความไม่เพียงพอ */}
                    {(!currentPump.isFlowAdequate || !currentPump.isHeadAdequate) && (
                        <div className="mt-3 rounded bg-red-900 p-2">
                            <p className="text-sm text-red-300">
                                ⚠️ <strong>คำเตือน:</strong> ปั๊มนี้
                                {!currentPump.isFlowAdequate && ' อัตราการไหลไม่เพียงพอ'}
                                {!currentPump.isFlowAdequate &&
                                    !currentPump.isHeadAdequate &&
                                    ' และ'}
                                {!currentPump.isHeadAdequate && ' ความสูงยกไม่เพียงพอ'}{' '}
                                สำหรับระบบนี้
                            </p>
                        </div>
                    )}

                    {/* คำแนะนำการประหยัดพลังงาน */}
                    {(currentPump.flowRatio > 3 || currentPump.headRatio > 3) && (
                        <div className="mt-3 rounded bg-yellow-900 p-2">
                            <p className="text-sm text-yellow-300">
                                💰 <strong>หมายเหตุ:</strong> ปั๊มนี้มีขนาดใหญ่เกินความต้องการ
                                อาจสิ้นเปลืองพลังงาน ควรพิจารณาใช้ปั๊มขนาดเล็กกว่า
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded bg-gray-600 p-4 text-center">
                    <p className="text-gray-300">ไม่สามารถหาปั๊มที่เหมาะสมได้</p>
                    <p className="mt-1 text-sm text-gray-400">อาจไม่มีปั๊มที่เหมาะสมในระบบ</p>
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
