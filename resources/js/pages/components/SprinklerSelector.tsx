// resources\js\pages\components\SprinklerSelector.tsx
import React, { useState } from 'react';
import { CalculationResults } from '../types/interfaces';
import { Zone } from '../../utils/horticultureUtils';
import { formatWaterFlow, formatRadius } from '../utils/calculations';

interface SprinklerSelectorProps {
    selectedSprinkler: any;
    onSprinklerChange: (sprinkler: any) => void;
    results: CalculationResults;
    activeZone?: Zone;
    allZoneSprinklers: { [zoneId: string]: any };
}

const SprinklerSelector: React.FC<SprinklerSelectorProps> = ({
    selectedSprinkler,
    onSprinklerChange,
    results,
    activeZone,
    allZoneSprinklers,
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

    const analyzedSprinklers = results.analyzedSprinklers || [];
    const sortedSprinklers = analyzedSprinklers.sort((a, b) => b.score - a.score);
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

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h3 className="mb-4 text-lg font-semibold text-green-400">
                เลือกสปริงเกอร์
                {activeZone && (
                    <span className="ml-2 text-sm font-normal text-gray-400">
                        - {activeZone.name}
                    </span>
                )}
            </h3>

            <div className="mb-4 rounded bg-gray-600 p-3">
                <h4 className="mb-2 text-sm font-medium text-green-300">
                    💧 ความต้องการ{activeZone ? ` (${activeZone.name})` : ''}:
                </h4>
                <div className="text-xs text-gray-300">
                    <p>
                        อัตราการไหลต่อหัว:{' '}
                        <span className="font-bold text-blue-300">
                            {results.waterPerSprinklerLPH.toFixed(1)} ลิตร/ชั่วโมง
                        </span>
                    </p>
                    <p>
                        จำนวนที่ต้องใช้:{' '}
                        <span className="font-bold text-yellow-300">
                            {results.totalSprinklers} หัว
                        </span>
                        {activeZone && <span className="ml-1 text-gray-400">(ในโซนนี้)</span>}
                    </p>
                </div>
            </div>

            <select
                value={selectedSprinkler?.id || ''}
                onChange={(e) => {
                    const selected = analyzedSprinklers.find(
                        (s) => s.id === parseInt(e.target.value)
                    );
                    onSprinklerChange(selected);
                }}
                className="mb-4 w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
            >
                <option value="">
                    -- เลือกสปริงเกอร์{activeZone ? ` สำหรับ ${activeZone.name}` : ''} --
                </option>
                {sortedSprinklers.map((sprinkler) => (
                    <option key={sprinkler.id} value={sprinkler.id}>
                        {sprinkler.name} - {sprinkler.price} บาท | {sprinkler.brand_name || '-'} |
                        คะแนน: {sprinkler.score}
                    </option>
                ))}
            </select>

            {selectedSprinkler && selectedAnalyzed && (
                <div className="rounded bg-gray-600 p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium text-white">
                            <strong>{selectedSprinkler.name}</strong>
                            {activeZone && (
                                <span className="ml-2 text-sm font-normal text-gray-400">
                                    (สำหรับ {activeZone.name})
                                </span>
                            )}
                        </h4>
                        <span className="text-sm font-bold text-blue-300">
                            คะแนน: {selectedAnalyzed.score}/100
                        </span>
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
                                {selectedSprinkler.productCode || selectedSprinkler.product_code}
                            </p>
                            <p>
                                <strong>อัตราการไหล:</strong>{' '}
                                {formatRangeValue(selectedSprinkler.waterVolumeLitersPerHour)} L/H
                            </p>
                            <p>
                                <strong>รัศมี:</strong>{' '}
                                {formatRangeValue(selectedSprinkler.radiusMeters)} เมตร
                            </p>
                            <p>
                                <strong>แรงดัน:</strong>{' '}
                                {formatRangeValue(selectedSprinkler.pressureBar)} บาร์
                            </p>
                        </div>

                        <div className="col-span-4">
                            <p>
                                <strong>แบรนด์:</strong> {selectedSprinkler.brand || '-'}
                            </p>
                            <p>
                                <strong>ราคาต่อหัว:</strong> {selectedSprinkler.price} บาท
                            </p>
                            <p>
                                <strong>จำนวนที่ต้องใช้:</strong> {results.totalSprinklers} หัว
                                {activeZone && (
                                    <span className="ml-1 text-xs text-gray-400">(โซนนี้)</span>
                                )}
                            </p>
                            <p>
                                <strong>ราคารวม:</strong>{' '}
                                <span className="text-green-300">
                                    {(
                                        selectedSprinkler.price * results.totalSprinklers
                                    ).toLocaleString()}
                                </span>{' '}
                                บาท
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 rounded bg-gray-500 p-2">
                        <h5 className="text-xs font-medium text-yellow-300">การวิเคราะห์:</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <p>
                                คะแนนรวม:{' '}
                                <span className="font-bold">{selectedAnalyzed.score}</span>/100
                            </p>
                            <p>
                                ความเหมาะสมการไหล:
                                <span
                                    className={`ml-1 font-bold ${
                                        selectedAnalyzed.flowMatch
                                            ? 'text-green-300'
                                            : selectedAnalyzed.flowCloseMatch
                                              ? 'text-yellow-300'
                                              : 'text-red-300'
                                    }`}
                                >
                                    {selectedAnalyzed.flowMatch
                                        ? '✅ เหมาะสม'
                                        : selectedAnalyzed.flowCloseMatch
                                          ? '⚠️ ใกล้เคียง'
                                          : '❌ ไม่เหมาะสม'}
                                </span>
                            </p>
                        </div>
                    </div>

                    {selectedSprinkler.description && (
                        <div className="mt-3 rounded bg-gray-800 p-2">
                            <p className="text-xs text-gray-300">
                                <strong>รายละเอียด:</strong> {selectedSprinkler.description}
                            </p>
                        </div>
                    )}

                    <div className="mt-3 rounded bg-blue-900 p-2">
                        <h5 className="text-xs font-medium text-blue-300">การเปรียบเทียบ:</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <p>ความต้องการ: {results.waterPerSprinklerLPH.toFixed(1)} L/H</p>
                                <p>
                                    ช่วงสปริงเกอร์:{' '}
                                    {formatRangeValue(selectedSprinkler.waterVolumeLitersPerHour)}{' '}
                                    L/H
                                </p>
                            </div>
                            <div>
                                <p>
                                    รัศมีเฉลี่ย:{' '}
                                    {getAverageValue(selectedSprinkler.radiusMeters).toFixed(1)} ม.
                                </p>
                                <p>
                                    แรงดันเฉลี่ย:{' '}
                                    {getAverageValue(selectedSprinkler.pressureBar).toFixed(1)} บาร์
                                </p>
                            </div>
                        </div>
                    </div>

                    {activeZone && (
                        <div className="mt-3 rounded bg-green-900 p-2">
                            <h5 className="text-xs font-medium text-green-300">ข้อมูลโซน:</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <p>พื้นที่โซน: {(activeZone.area / 1600).toFixed(2)} ไร่</p>
                                    <p>จำนวนต้นไม้: {activeZone.plantCount} ต้น</p>
                                </div>
                                <div>
                                    <p>พืชที่ปลูก: {activeZone.plantData?.name || 'ไม่ระบุ'}</p>
                                    <p>
                                        น้ำต่อต้น: {activeZone.plantData?.waterNeed || 0} ลิตร/วัน
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

export default SprinklerSelector;
