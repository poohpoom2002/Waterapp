// components/SprinklerSelector.tsx
import React from 'react';
import { SprinklerData } from '../product/Sprinkler';
import { CalculationResults } from '../types/interfaces';
import { formatWaterFlow, formatRadius } from '../utils/calculations';

interface SprinklerSelectorProps {
    selectedSprinkler: any;
    onSprinklerChange: (sprinkler: any) => void;
    results: CalculationResults;
}

// ฟังก์ชันวิเคราะห์และให้คะแนนสปริงเกอร์
const analyzeSprinkler = (sprinkler: any, targetFlow: number) => {
    const minFlow = Array.isArray(sprinkler.waterVolumeLitersPerHour)
        ? sprinkler.waterVolumeLitersPerHour[0]
        : parseFloat(String(sprinkler.waterVolumeLitersPerHour).split('-')[0]);
    const maxFlow = Array.isArray(sprinkler.waterVolumeLitersPerHour)
        ? sprinkler.waterVolumeLitersPerHour[1]
        : parseFloat(String(sprinkler.waterVolumeLitersPerHour).split('-')[1]);

    let score = 0;

    // คะแนนความเหมาะสมของอัตราการไหล (50%)
    if (targetFlow >= minFlow && targetFlow <= maxFlow) {
        // อยู่ในช่วงที่เหมาะสม
        const flowRange = maxFlow - minFlow;
        const positionInRange = (targetFlow - minFlow) / flowRange;
        
        // ให้คะแนนสูงสุดถ้าอยู่ตรงกลางช่วง
        if (positionInRange >= 0.3 && positionInRange <= 0.7) {
            score += 50;
        } else {
            score += 40;
        }
    } else if (targetFlow >= minFlow * 0.8 && targetFlow <= maxFlow * 1.2) {
        // ใกล้เคียงช่วงที่เหมาะสม
        score += 30;
    } else if (targetFlow >= minFlow * 0.6 && targetFlow <= maxFlow * 1.5) {
        // ใช้ได้แต่ไม่เหมาะสมมาก
        score += 15;
    } else {
        // ไม่เหมาะสม
        score += 5;
    }

    // คะแนนราคาต่อประสิทธิภาพ (25%)
    const avgFlow = (minFlow + maxFlow) / 2;
    const pricePerFlow = sprinkler.price / avgFlow;
    
    if (pricePerFlow < 1) {
        score += 25;
    } else if (pricePerFlow < 2) {
        score += 20;
    } else if (pricePerFlow < 5) {
        score += 15;
    } else if (pricePerFlow < 10) {
        score += 10;
    } else {
        score += 5;
    }

    // คะแนนรัศมีการกระจาย (15%)
    const minRadius = Array.isArray(sprinkler.radiusMeters)
        ? sprinkler.radiusMeters[0]
        : parseFloat(String(sprinkler.radiusMeters).split('-')[0]);
    const maxRadius = Array.isArray(sprinkler.radiusMeters)
        ? sprinkler.radiusMeters[1]
        : parseFloat(String(sprinkler.radiusMeters).split('-')[1]);

    const avgRadius = (minRadius + maxRadius) / 2;
    
    if (avgRadius >= 8) {
        score += 15; // รัศมีใหญ่ ครอบคลุมพื้นที่มาก
    } else if (avgRadius >= 5) {
        score += 12; // รัศมีกลาง
    } else if (avgRadius >= 3) {
        score += 8; // รัศมีเล็ก แต่ใช้ได้
    } else {
        score += 5; // รัศมีเล็กมาก
    }

    // คะแนนความหลากหลายของแรงดัน (10%)
    const minPressure = Array.isArray(sprinkler.pressureBar)
        ? sprinkler.pressureBar[0]
        : parseFloat(String(sprinkler.pressureBar).split('-')[0]);
    const maxPressure = Array.isArray(sprinkler.pressureBar)
        ? sprinkler.pressureBar[1]
        : parseFloat(String(sprinkler.pressureBar).split('-')[1]);

    const pressureRange = maxPressure - minPressure;
    
    if (pressureRange >= 3) {
        score += 10; // ช่วงแรงดันกว้าง ปรับได้หลากหลาย
    } else if (pressureRange >= 2) {
        score += 8;
    } else if (pressureRange >= 1) {
        score += 6;
    } else {
        score += 4;
    }

    return {
        ...sprinkler,
        score,
        flowMatch: targetFlow >= minFlow && targetFlow <= maxFlow,
        flowCloseMatch: targetFlow >= minFlow * 0.8 && targetFlow <= maxFlow * 1.2,
        isRecommended: score >= 60,
        isGoodChoice: score >= 40,
        isUsable: score >= 20,
        targetFlow,
        minFlow,
        maxFlow,
        avgRadius: (minRadius + maxRadius) / 2,
        pricePerFlow
    };
};

const SprinklerSelector: React.FC<SprinklerSelectorProps> = ({
    selectedSprinkler,
    onSprinklerChange,
    results,
}) => {
    // วิเคราะห์สปริงเกอร์ทั้งหมด
    const analyzedSprinklers = SprinklerData.map(sprinkler => 
        analyzeSprinkler(sprinkler, results.waterPerSprinklerLPH)
    );

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

            {/* คำแนะนำด่วน */}
            <div className="mb-4 rounded bg-gray-600 p-3">
                <h4 className="mb-2 text-sm font-medium text-green-300">💡 คำแนะนำ:</h4>
                <div className="text-xs text-gray-300">
                    <p>🌟 = เหมาะสมมาก (คะแนน 60+)</p>
                    <p>✅ = ตัวเลือกดี (คะแนน 40-59)</p>
                    <p>⚡ = ใช้ได้ (คะแนน 20-39)</p>
                    <p>⚠️ = ควรพิจารณา (คะแนน &lt;20)</p>
                </div>
            </div>

            <select
                value={selectedSprinkler?.id || ''}
                onChange={(e) => {
                    const selected = SprinklerData.find((s) => s.id === parseInt(e.target.value));
                    onSprinklerChange(selected);
                }}
                className="mb-4 w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
            >
                <option value="">-- เลือกสปริงเกอร์ --</option>
                {sortedSprinklers.map((sprinkler) => (
                    <option key={sprinkler.id} value={sprinkler.id}>
                        {sprinkler.name} - {sprinkler.price} บาท | {getRecommendationIcon(sprinkler)}
                    </option>
                ))}
            </select>

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

                    {/* คำแนะนำการปรับปรุง */}
                    {!selectedAnalyzed.isRecommended && (
                        <div className="mt-3 rounded bg-blue-900 p-2">
                            <p className="text-sm text-blue-300">
                                💡 <strong>สปริงเกอร์ที่แนะนำ:</strong>{' '}
                                {sortedSprinklers
                                    .filter(s => s.isRecommended)
                                    .slice(0, 2)
                                    .map(s => s.productCode)
                                    .join(', ') || 'ไม่มีตัวเลือกที่แนะนำ'}
                            </p>
                        </div>
                    )}

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

export default SprinklerSelector;