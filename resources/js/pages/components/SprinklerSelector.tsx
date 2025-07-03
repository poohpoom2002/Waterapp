// C:\webchaiyo\Waterapp\resources\js\pages\components\SprinklerSelector.tsx
import React, { useState } from 'react';
import { CalculationResults } from '../types/interfaces';
import { formatWaterFlow, formatRadius } from '../utils/calculations';

interface SprinklerSelectorProps {
    selectedSprinkler: any;
    onSprinklerChange: (sprinkler: any) => void;
    results: CalculationResults;
}

const SprinklerSelector: React.FC<SprinklerSelectorProps> = ({
    selectedSprinkler,
    onSprinklerChange,
    results,
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

    // ใช้ข้อมูลที่ได้จาก database และผ่านการวิเคราะห์แล้วใน useCalculations
    const analyzedSprinklers = results.analyzedSprinklers || [];

    // เรียงลำดับตามคะแนน
    const sortedSprinklers = analyzedSprinklers.sort((a, b) => {
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

    const getRecommendationIcon = (sprinkler: any) => {
        if (sprinkler.isRecommended) return '(แนะนำที่สุด)';
        if (sprinkler.isGoodChoice) return '(ตัวเลือกดี)';
        if (sprinkler.isUsable) return '(ใช้ได้)';
        return '(ควรพิจารณา)';
    };

    const getRecommendationColor = (sprinkler: any) => {
        if (sprinkler.isRecommended) return 'text-green-300';
        if (sprinkler.isGoodChoice) return 'text-blue-300';
        if (sprinkler.isUsable) return 'text-yellow-300';
        return 'text-red-300';
    };

    const selectedAnalyzed = selectedSprinkler
        ? analyzedSprinklers.find((s) => s.id === selectedSprinkler.id)
        : null;

    // Helper function สำหรับแสดงค่า range
    const formatRangeValue = (value: any) => {
        if (Array.isArray(value)) {
            return `${value[0]}-${value[1]}`;
        }
        return String(value);
    };

    // Helper function สำหรับแสดงค่าเฉลี่ย
    const getAverageValue = (value: any) => {
        if (Array.isArray(value)) {
            return (value[0] + value[1]) / 2;
        }
        return parseFloat(String(value)) || 0;
    };

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h3 className="mb-4 text-lg font-semibold text-green-400">เลือกสปริงเกอร์</h3>

            {/* ข้อมูลความต้องการ */}
            <div className="mb-4 rounded bg-gray-600 p-3">
                <h4 className="mb-2 text-sm font-medium text-green-300">💧 ความต้องการ:</h4>
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
                    </p>
                </div>
            </div>

            {/* แสดงสถานะการโหลดข้อมูล */}
            {/* <div className="mb-3 text-xs text-green-400">
                🔗 ข้อมูลจากฐานข้อมูล: {analyzedSprinklers.length} รายการ
            </div> */}

            <select
                value={selectedSprinkler?.id || ''}
                onChange={(e) => {
                    const selected = analyzedSprinklers.find((s) => s.id === parseInt(e.target.value));
                    onSprinklerChange(selected);
                }}
                className="mb-4 w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
            >
                <option value="">-- เลือกสปริงเกอร์ --</option>
                {sortedSprinklers.map((sprinkler) => (
                    <option key={sprinkler.id} value={sprinkler.id}>
                        {sprinkler.name} - {sprinkler.price} บาท | {sprinkler.brand_name || '-'} |{' '}
                        {getRecommendationIcon(sprinkler)}
                    </option>
                ))}
            </select>

            {selectedSprinkler && selectedAnalyzed && (
                <div className="rounded bg-gray-600 p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium text-white">
                            <strong> {selectedSprinkler.name}</strong>
                        </h4>
                        <span
                            className={`text-sm font-bold ${getRecommendationColor(selectedAnalyzed)}`}
                        >
                            {getRecommendationIcon(selectedAnalyzed)}
                        </span>
                    </div>

                    <div className="grid grid-cols-10 items-center justify-between gap-3 text-sm">
                        <div className="flex items-center justify-center col-span-2">
                            {selectedSprinkler.image ? (
                                <img
                                    src={selectedSprinkler.image}
                                    alt={selectedSprinkler.name}
                                    className="flex h-auto w-[85px] items-center justify-center cursor-pointer hover:opacity-80 transition-opacity rounded border border-gray-500 hover:border-blue-400"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                    onClick={() => openImageModal(selectedSprinkler.image, selectedSprinkler.name)}
                                    title="คลิกเพื่อดูรูปขนาดใหญ่"
                                />
                            ) : (
                                <div className="w-[85px] h-[60px] bg-gray-500 rounded flex items-center justify-center text-xs text-gray-300">
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

                    {/* การวิเคราะห์ความเหมาะสม */}
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
                            {/* <p>
                                จากฐานข้อมูล:{' '}
                                <span className="font-bold text-green-400">✓</span>
                            </p> */}
                        </div>
                    </div>

                    {/* แสดงข้อมูลเพิ่มเติมจากฐานข้อมูล */}
                    {selectedSprinkler.description && (
                        <div className="mt-3 rounded bg-gray-800 p-2">
                            <p className="text-xs text-gray-300">
                                <strong>รายละเอียด:</strong> {selectedSprinkler.description}
                            </p>
                        </div>
                    )}

                    {/* แสดงการเปรียบเทียบกับความต้องการ */}
                    <div className="mt-3 rounded bg-blue-900 p-2">
                        <h5 className="text-xs font-medium text-blue-300">การเปรียบเทียบ:</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <p>ความต้องการ: {results.waterPerSprinklerLPH.toFixed(1)} L/H</p>
                                <p>ช่วงสปริงเกอร์: {formatRangeValue(selectedSprinkler.waterVolumeLitersPerHour)} L/H</p>
                            </div>
                            <div>
                                <p>รัศมีเฉลี่ย: {getAverageValue(selectedSprinkler.radiusMeters).toFixed(1)} ม.</p>
                                <p>แรงดันเฉลี่ย: {getAverageValue(selectedSprinkler.pressureBar).toFixed(1)} บาร์</p>
                            </div>
                        </div>
                    </div>
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
                            className="absolute -top-2 -right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
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
                            <p className="text-white text-sm bg-black bg-opacity-50 rounded px-2 py-1 inline-block">
                                {modalImageAlt}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* แสดงสถิติจากฐานข้อมูล */}
            {/* <div className="mt-4 text-xs text-gray-400">
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        แนะนำ: <span className="text-green-400">{analyzedSprinklers.filter(s => s.isRecommended).length}</span>
                    </div>
                    <div>
                        ตัวเลือกดี: <span className="text-blue-400">{analyzedSprinklers.filter(s => s.isGoodChoice).length}</span>
                    </div>
                    <div>
                        ใช้ได้: <span className="text-yellow-400">{analyzedSprinklers.filter(s => s.isUsable).length}</span>
                    </div>
                </div>
            </div> */}
        </div>
    );
};

export default SprinklerSelector;