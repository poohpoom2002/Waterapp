// C:\webchaiyo\Waterapp\resources\js\pages\components\PumpSelector.tsx
import React from 'react';
import { PumpData } from '../product/Pump';
import { CalculationResults } from '../types/interfaces';

interface PumpSelectorProps {
    selectedPump: any;
    onPumpChange: (pump: any) => void;
    results: CalculationResults;
}

// ฟังก์ชันวิเคราะห์และให้คะแนนปั๊ม
const analyzePump = (pump: any, requiredFlow: number, requiredHead: number) => {
    const maxFlow =
        pump.max_flow_rate_lpm || (Array.isArray(pump.flow_rate_lpm) ? pump.flow_rate_lpm[1] : 0);
    const maxHead = pump.max_head_m || (Array.isArray(pump.head_m) ? pump.head_m[0] : 0);

    let score = 0;

    // คะแนนความเหมาะสมของอัตราการไหล (40%)
    if (maxFlow >= requiredFlow) {
        const flowRatio = maxFlow / requiredFlow;

        if (flowRatio >= 1.1 && flowRatio <= 2.0) {
            // อัตราส่วนที่เหมาะสม (10-100% เกิน)
            score += 40;
        } else if (flowRatio >= 1.05 && flowRatio <= 2.5) {
            // ใกล้เคียงที่เหมาะสม
            score += 30;
        } else if (flowRatio >= 1.0 && flowRatio <= 3.0) {
            // ใช้ได้แต่อาจใหญ่เกินไป
            score += 20;
        } else {
            // ใหญ่เกินไปหรือไม่เพียงพอ
            score += 5;
        }
    } else {
        // ไม่เพียงพอ
        score += 0;
    }

    // คะแนนความเหมาะสมของ Head (35%)
    if (maxHead >= requiredHead) {
        const headRatio = maxHead / requiredHead;

        if (headRatio >= 1.1 && headRatio <= 2.0) {
            // อัตราส่วนที่เหมาะสม (10-100% เกิน)
            score += 35;
        } else if (headRatio >= 1.05 && headRatio <= 2.5) {
            // ใกล้เคียงที่เหมาะสม
            score += 25;
        } else if (headRatio >= 1.0 && headRatio <= 3.0) {
            // ใช้ได้แต่อาจใหญ่เกินไป
            score += 15;
        } else {
            // ใหญ่เกินไปหรือไม่เพียงพอ
            score += 5;
        }
    } else {
        // ไม่เพียงพอ
        score += 0;
    }

    // คะแนนประสิทธิภาพต่อราคา (15%)
    const flowPerBaht = maxFlow / pump.price;

    if (flowPerBaht > 0.5) {
        score += 15;
    } else if (flowPerBaht > 0.3) {
        score += 12;
    } else if (flowPerBaht > 0.1) {
        score += 8;
    } else if (flowPerBaht > 0.05) {
        score += 5;
    } else {
        score += 2;
    }

    // คะแนนกำลังที่เหมาะสม (10%)
    const powerHP =
        typeof pump.powerHP === 'string'
            ? parseFloat(pump.powerHP.toString().replace(/[^0-9.]/g, ''))
            : pump.powerHP;

    // ประมาณการกำลังที่ต้องการจาก flow และ head
    const estimatedHP = requiredFlow * requiredHead * 0.00027; // สูตรประมาณ
    const powerRatio = powerHP / estimatedHP;

    if (powerRatio >= 1.0 && powerRatio <= 2.5) {
        score += 10;
    } else if (powerRatio >= 0.8 && powerRatio <= 3.0) {
        score += 7;
    } else if (powerRatio >= 0.6 && powerRatio <= 4.0) {
        score += 4;
    } else {
        score += 1;
    }

    return {
        ...pump,
        score,
        maxFlow,
        maxHead,
        powerHP,
        flowRatio: maxFlow / requiredFlow,
        headRatio: maxHead / requiredHead,
        flowPerBaht,
        estimatedHP: estimatedHP,
        isFlowAdequate: maxFlow >= requiredFlow,
        isHeadAdequate: maxHead >= requiredHead,
        isRecommended: score >= 60,
        isGoodChoice: score >= 40,
        isUsable: score >= 20 && maxFlow >= requiredFlow && maxHead >= requiredHead,
    };
};

const PumpSelector: React.FC<PumpSelectorProps> = ({ selectedPump, onPumpChange, results }) => {
    const requiredFlow = results.flows.main;
    const requiredHead = results.pumpHeadRequired;

    // วิเคราะห์ปั๊มทั้งหมด
    const analyzedPumps = PumpData.map((pump) => analyzePump(pump, requiredFlow, requiredHead));

    // เรียงลำดับตามคะแนน
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
                    {/* <p className="text-gray-400">
                        (Static:{' '}
                        {results.headLoss.total > 0
                            ? `${(requiredHead - results.headLoss.total - 15).toFixed(1)}m`
                            : 'N/A'}
                        , Loss: {results.headLoss.total.toFixed(1)}m, Pressure: 15m)
                    </p> */}
                </div>
            </div>

            {/* คำแนะนำด่วน */}
            {/* <div className="mb-4 rounded bg-gray-600 p-3">
                <h4 className="mb-2 text-sm font-medium text-red-300">💡 คำแนะนำ:</h4>
                <div className="text-xs text-gray-300">
                    <p>🌟 = เหมาะสมมาก (คะแนน 60+)</p>
                    <p>✅ = ตัวเลือกดี (คะแนน 40-59)</p>
                    <p>⚡ = ใช้ได้ (คะแนน 20-39)</p>
                    <p>⚠️ = ควรพิจารณา (คะแนน &lt;20)</p>
                </div>
            </div> */}

            <select
                value={selectedPump?.id || ''}
                onChange={(e) => {
                    const selected = PumpData.find((p) => p.id === parseInt(e.target.value));
                    onPumpChange(selected);
                }}
                className="mb-4 w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
            >
                <option value="">-- เลือกปั๊ม --</option>
                {sortedPumps.map((pump) => (
                    <option key={pump.id} value={pump.id}>
                        {pump.productCode} ({pump.powerHP}HP) - {pump.price} บาท |{' '}
                        {getRecommendationIcon(pump)}
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
                            <img
                                src={selectedPump.image}
                                alt={selectedPump.name}
                                className="flex h-auto w-[85px] items-center justify-center"
                            />
                        </div>
                        <div>
                            <p>
                                <strong>รุ่น:</strong> {selectedPump.productCode}
                            </p>
                            <p>
                                <strong>กำลัง:</strong> {selectedPump.powerHP} HP (
                                {selectedPump.powerKW} kW)
                            </p>
                            <p>
                                <strong>เฟส:</strong> {selectedPump.phase} เฟส
                            </p>
                            <p>
                                <strong>ท่อเข้า/ออก:</strong> {selectedPump.inlet_size_inch}"/
                                {selectedPump.outlet_size_inch}"
                            </p>
                            
                        </div>
                        <div>
                            <p>
                                <strong>Flow:</strong>{' '}
                                {selectedAnalyzed.maxFlow || 'N/A'} LPM
                            </p>
                            <p>
                                <strong>Head:</strong>{' '}
                                {selectedAnalyzed.maxHead || 'N/A'} เมตร
                            </p>
                            <p>
                                <strong>S.D(ความลึกดูด):</strong> {selectedPump.suction_depth_m || 'N/A'}{' '}
                                เมตร
                            </p>
                            <p>
                                <strong>ราคา:</strong> {selectedPump.price.toLocaleString()} บาท
                            </p>
                            {/* <p>
                                <strong>ประสิทธิภาพ/ราคา:</strong>{' '}
                                <span className="text-blue-300">
                                    {selectedAnalyzed.flowPerBaht.toFixed(3)} LPM/บาท
                                </span>
                            </p> */}
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
                            <p>
                                น้ำหนัก:{' '}
                                <span className="font-bold">{selectedPump.weight_kg || 'N/A'}</span>{' '}
                                kg
                            </p>
                        </div>
                    </div>

                    {/* คำแนะนำการปรับปรุง */}
                    {/* {!selectedAnalyzed.isRecommended && (
                        <div className="mt-3 rounded bg-blue-900 p-2">
                            <p className="text-sm text-blue-300">
                                💡 <strong>ปั๊มที่แนะนำ:</strong>{' '}
                                {sortedPumps
                                    .filter((p) => p.isRecommended)
                                    .slice(0, 2)
                                    .map((p) => `${p.productCode} (${p.powerHP}HP)`)
                                    .join(', ') || 'ไม่มีตัวเลือกที่แนะนำ'}
                            </p>
                        </div>
                    )} */}

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
                    {selectedAnalyzed.flowRatio > 3 ||
                        (selectedAnalyzed.headRatio > 3 && (
                            <div className="mt-3 rounded bg-yellow-900 p-2">
                                <p className="text-sm text-yellow-300">
                                    💰 <strong>หมายเหตุ:</strong> ปั๊มนี้มีขนาดใหญ่เกินความต้องการ
                                    อาจสิ้นเปลืองพลังงาน ควรพิจารณาใช้ปั๊มขนาดเล็กกว่า
                                </p>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
};

export default PumpSelector;
