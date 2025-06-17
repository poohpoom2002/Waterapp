// components/SearchableSprinklerSelector.tsx
import React, { useState, useMemo } from 'react';
import { SprinklerData } from '../product/Sprinkler';
import { CalculationResults } from '../types/interfaces';
import { formatWaterFlow, formatRadius } from '../utils/calculations';

interface SearchableSprinklerSelectorProps {
    selectedSprinkler: any;
    onSprinklerChange: (sprinkler: any) => void;
    results: CalculationResults;
}

const SearchableSprinklerSelector: React.FC<SearchableSprinklerSelectorProps> = ({
    selectedSprinkler,
    onSprinklerChange,
    results,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    // วิเคราะห์สปริงเกอร์ทั้งหมด
    const analyzedSprinklers = useMemo(() => {
        return SprinklerData.map(sprinkler => {
            const minFlow = Array.isArray(sprinkler.waterVolumeLitersPerHour)
                ? sprinkler.waterVolumeLitersPerHour[0]
                : parseFloat(String(sprinkler.waterVolumeLitersPerHour).split('-')[0]);
            const maxFlow = Array.isArray(sprinkler.waterVolumeLitersPerHour)
                ? sprinkler.waterVolumeLitersPerHour[1]
                : parseFloat(String(sprinkler.waterVolumeLitersPerHour).split('-')[1]);

            let score = 0;
            const targetFlow = results.waterPerSprinklerLPH;

            // คะแนนความเหมาะสมของอัตราการไหล (50%)
            if (targetFlow >= minFlow && targetFlow <= maxFlow) {
                const flowRange = maxFlow - minFlow;
                const positionInRange = (targetFlow - minFlow) / flowRange;
                if (positionInRange >= 0.3 && positionInRange <= 0.7) {
                    score += 50;
                } else {
                    score += 45;
                }
            } else if (targetFlow >= minFlow * 0.9 && targetFlow <= maxFlow * 1.1) {
                score += 35;
            } else if (targetFlow >= minFlow * 0.7 && targetFlow <= maxFlow * 1.3) {
                score += 20;
            } else if (targetFlow >= minFlow * 0.5 && targetFlow <= maxFlow * 1.5) {
                score += 10;
            } else {
                score += 0;
            }

            // คะแนนราคาต่อประสิทธิภาพ (25%)
            const avgFlow = (minFlow + maxFlow) / 2;
            const pricePerFlow = sprinkler.price / avgFlow;
            if (pricePerFlow < 1) score += 25;
            else if (pricePerFlow < 2) score += 20;
            else if (pricePerFlow < 5) score += 15;
            else if (pricePerFlow < 10) score += 10;
            else score += 5;

            // คะแนนรัศมี (15%)
            const minRadius = Array.isArray(sprinkler.radiusMeters)
                ? sprinkler.radiusMeters[0]
                : parseFloat(String(sprinkler.radiusMeters).split('-')[0]);
            const maxRadius = Array.isArray(sprinkler.radiusMeters)
                ? sprinkler.radiusMeters[1]
                : parseFloat(String(sprinkler.radiusMeters).split('-')[1]);
            const avgRadius = (minRadius + maxRadius) / 2;
            
            if (avgRadius >= 8) score += 15;
            else if (avgRadius >= 5) score += 12;
            else if (avgRadius >= 3) score += 8;
            else score += 5;

            // คะแนนช่วงแรงดัน (10%)
            const minPressure = Array.isArray(sprinkler.pressureBar)
                ? sprinkler.pressureBar[0]
                : parseFloat(String(sprinkler.pressureBar).split('-')[0]);
            const maxPressure = Array.isArray(sprinkler.pressureBar)
                ? sprinkler.pressureBar[1]
                : parseFloat(String(sprinkler.pressureBar).split('-')[1]);
            const pressureRange = maxPressure - minPressure;
            
            if (pressureRange >= 3) score += 10;
            else if (pressureRange >= 2) score += 8;
            else if (pressureRange >= 1) score += 6;
            else score += 4;

            const flowMatch = targetFlow >= minFlow && targetFlow <= maxFlow;
            const flowCloseMatch = targetFlow >= minFlow * 0.9 && targetFlow <= maxFlow * 1.1;

            return {
                ...sprinkler,
                score,
                flowMatch,
                flowCloseMatch,
                isRecommended: score >= 60 && flowCloseMatch,
                isGoodChoice: score >= 40 && (targetFlow >= minFlow * 0.7 && targetFlow <= maxFlow * 1.3),
                isUsable: score >= 20 && (targetFlow >= minFlow * 0.5 && targetFlow <= maxFlow * 1.5),
                targetFlow,
                minFlow,
                maxFlow,
                avgRadius,
                pricePerFlow
            };
        }).sort((a, b) => {
            if (a.isRecommended !== b.isRecommended) return b.isRecommended ? 1 : -1;
            if (a.isGoodChoice !== b.isGoodChoice) return b.isGoodChoice ? 1 : -1;
            if (a.isUsable !== b.isUsable) return b.isUsable ? 1 : -1;
            return b.score - a.score;
        });
    }, [results.waterPerSprinklerLPH]);

    // กรองตามคำค้นหา
    const filteredSprinklers = useMemo(() => {
        if (!searchTerm) return analyzedSprinklers;
        
        const searchLower = searchTerm.toLowerCase();
        return analyzedSprinklers.filter(sprinkler => 
            sprinkler.name.toLowerCase().includes(searchLower) ||
            sprinkler.productCode.toLowerCase().includes(searchLower) ||
            formatWaterFlow(sprinkler.waterVolumeLitersPerHour).toLowerCase().includes(searchLower) ||
            formatRadius(sprinkler.radiusMeters).toLowerCase().includes(searchLower) ||
            sprinkler.price.toString().includes(searchLower)
        );
    }, [analyzedSprinklers, searchTerm]);

    const getRecommendationIcon = (sprinkler: any) => {
        if (sprinkler.isRecommended) return '🌟 แนะนำ';
        if (sprinkler.isGoodChoice) return '✅ ตัวเลือกดี';
        if (sprinkler.isUsable) return '⚡ ใช้ได้';
        return '⚠️ ควรพิจารณา';
    };

    const getRecommendationColor = (sprinkler: any) => {
        if (sprinkler.isRecommended) return 'text-green-300';
        if (sprinkler.isGoodChoice) return 'text-blue-300';
        if (sprinkler.isUsable) return 'text-yellow-300';
        return 'text-red-300';
    };

    const handleSprinklerSelect = (sprinkler: any) => {
        onSprinklerChange(sprinkler);
        setIsOpen(false);
        setSearchTerm('');
    };

    const selectedAnalyzed = selectedSprinkler 
        ? analyzedSprinklers.find(s => s.id === selectedSprinkler.id)
        : null;

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h3 className="mb-4 text-lg font-semibold text-green-400">เลือกสปริงเกอร์</h3>
            
            {/* ข้อมูลความต้องการ */}
            <div className="mb-4 rounded bg-gray-600 p-3">
                <h4 className="mb-2 text-sm font-medium text-green-300">💧 ความต้องการ:</h4>
                <div className="text-xs text-gray-300">
                    <p>อัตราการไหลต่อหัว: <span className="font-bold text-blue-300">{results.waterPerSprinklerLPH.toFixed(1)} ลิตร/ชั่วโมง</span></p>
                    <p>จำนวนที่ต้องใช้: <span className="font-bold text-yellow-300">{results.totalSprinklers} หัว</span></p>
                </div>
            </div>

            {/* สถิติสปริงเกอร์ */}
            <div className="mb-4 rounded bg-gray-600 p-3">
                <h4 className="mb-2 text-sm font-medium text-green-300">📊 สถิติ:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 md:grid-cols-4">
                    <p>🌟 แนะนำ: <span className="font-bold text-green-300">{analyzedSprinklers.filter(s => s.isRecommended).length}</span></p>
                    <p>✅ ตัวเลือกดี: <span className="font-bold text-blue-300">{analyzedSprinklers.filter(s => s.isGoodChoice && !s.isRecommended).length}</span></p>
                    <p>⚡ ใช้ได้: <span className="font-bold text-yellow-300">{analyzedSprinklers.filter(s => s.isUsable && !s.isGoodChoice).length}</span></p>
                    <p>⚠️ ควรพิจารณา: <span className="font-bold text-red-300">{analyzedSprinklers.filter(s => !s.isUsable).length}</span></p>
                </div>
            </div>

            {/* Searchable Dropdown */}
            <div className="relative mb-4">
                <div 
                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white cursor-pointer flex justify-between items-center"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span>
                        {selectedSprinkler 
                            ? `${selectedSprinkler.name} - ${selectedSprinkler.price} บาท`
                            : '-- เลือกสปริงเกอร์ --'
                        }
                    </span>
                    <span className="text-gray-400">
                        {isOpen ? '▲' : '▼'}
                    </span>
                </div>

                {isOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-600 border border-gray-500 rounded max-h-96 overflow-hidden">
                        {/* Search Box */}
                        <div className="p-2 border-b border-gray-500">
                            <input
                                type="text"
                                placeholder="ค้นหาสปริงเกอร์... (ชื่อ, รหัส, อัตราการไหล, รัศมี, ราคา)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2 bg-gray-700 text-white rounded border border-gray-500 focus:border-blue-400"
                                autoFocus
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                แสดง {filteredSprinklers.length} จาก {analyzedSprinklers.length} สปริงเกอร์
                            </p>
                        </div>

                        {/* Options List */}
                        <div className="max-h-80 overflow-y-auto">
                            {filteredSprinklers.length === 0 ? (
                                <div className="p-3 text-gray-400 text-center">
                                    ไม่พบสปริงเกอร์ที่ค้นหา "{searchTerm}"
                                </div>
                            ) : (
                                filteredSprinklers.map((sprinkler) => (
                                    <div
                                        key={sprinkler.id}
                                        onClick={() => handleSprinklerSelect(sprinkler)}
                                        className="p-2 hover:bg-gray-500 cursor-pointer border-b border-gray-700 last:border-b-0"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-white">
                                                    {sprinkler.name}
                                                </span>
                                                <span className="text-gray-300 ml-2">- {sprinkler.price} บาท</span>
                                            </div>
                                            <span className={`text-xs font-bold ${getRecommendationColor(sprinkler)}`}>
                                                {getRecommendationIcon(sprinkler)}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {sprinkler.productCode} | {formatWaterFlow(sprinkler.waterVolumeLitersPerHour)} L/h | 
                                            รัศมี: {formatRadius(sprinkler.radiusMeters)}m | คะแนน: {sprinkler.score}/100
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ข้อมูลสปริงเกอร์ที่เลือก */}
            {selectedSprinkler && selectedAnalyzed && (
                <div className="rounded bg-gray-600 p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium text-white">ข้อมูลสปริงเกอร์ที่เลือก</h4>
                        <span className={`text-sm font-bold ${getRecommendationColor(selectedAnalyzed)}`}>
                            {getRecommendationIcon(selectedAnalyzed)}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p><strong>รุ่น:</strong> {selectedSprinkler.productCode}</p>
                            <p>
                                <strong>อัตราการไหล:</strong> {formatWaterFlow(selectedSprinkler.waterVolumeLitersPerHour)} ลิตร/ชั่วโมง
                            </p>
                            <p><strong>รัศมี:</strong> {formatRadius(selectedSprinkler.radiusMeters)} เมตร</p>
                            <p><strong>แรงดัน:</strong> {formatWaterFlow(selectedSprinkler.pressureBar)} บาร์</p>
                        </div>
                        <div>
                            <p><strong>ราคาต่อหัว:</strong> {selectedSprinkler.price} บาท</p>
                            <p><strong>จำนวนที่ต้องใช้:</strong> {results.totalSprinklers} หัว</p>
                            <p>
                                <strong>ราคารวม:</strong>{' '}
                                <span className="text-green-300">
                                    {(selectedSprinkler.price * results.totalSprinklers).toLocaleString()}
                                </span>{' '}
                                บาท
                            </p>
                            <p>
                                <strong>ราคา/ประสิทธิภาพ:</strong>{' '}
                                <span className="text-blue-300">
                                    {selectedAnalyzed.pricePerFlow.toFixed(2)} บาท/ลิตร/ชม.
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* การวิเคราะห์ความเหมาะสม */}
                    <div className="mt-3 rounded bg-gray-500 p-2">
                        <h5 className="text-xs font-medium text-yellow-300">การวิเคราะห์:</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <p>คะแนนรวม: <span className="font-bold">{selectedAnalyzed.score}</span>/100</p>
                            <p>
                                ความเหมาะสมการไหล: 
                                <span className={`ml-1 font-bold ${
                                    selectedAnalyzed.flowMatch ? 'text-green-300' : 
                                    selectedAnalyzed.flowCloseMatch ? 'text-yellow-300' : 'text-red-300'
                                }`}>
                                    {selectedAnalyzed.flowMatch ? '✅ เหมาะสม' : 
                                     selectedAnalyzed.flowCloseMatch ? '⚠️ ใกล้เคียง' : '❌ ไม่เหมาะสม'}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* เตือนการไหลที่ไม่เหมาะสม */}
                    {!selectedAnalyzed.flowCloseMatch && (
                        <div className="mt-3 rounded bg-red-900 p-2">
                            <p className="text-sm text-red-300">
                                ⚠️ <strong>คำเตือน:</strong> อัตราการไหลที่ต้องการ ({results.waterPerSprinklerLPH.toFixed(1)} ลิตร/ชม.) 
                                อยู่นอกช่วงที่เหมาะสม ({selectedAnalyzed.minFlow}-{selectedAnalyzed.maxFlow} ลิตร/ชม.)
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableSprinklerSelector;