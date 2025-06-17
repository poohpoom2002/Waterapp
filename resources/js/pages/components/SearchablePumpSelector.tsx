// components/SearchablePumpSelector.tsx
import React, { useState, useMemo } from 'react';
import { PumpData } from '../product/Pump';
import { CalculationResults } from '../types/interfaces';

interface SearchablePumpSelectorProps {
    selectedPump: any;
    onPumpChange: (pump: any) => void;
    results: CalculationResults;
}

const SearchablePumpSelector: React.FC<SearchablePumpSelectorProps> = ({
    selectedPump,
    onPumpChange,
    results,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const requiredFlow = results.flows.main;
    const requiredHead = results.pumpHeadRequired;

    // วิเคราะห์ปั๊มทั้งหมด
    const analyzedPumps = useMemo(() => {
        return PumpData.map(pump => {
            const maxFlow = pump.max_flow_rate_lpm || (Array.isArray(pump.flow_rate_lpm) ? pump.flow_rate_lpm[1] : 0);
            const maxHead = pump.max_head_m || (Array.isArray(pump.head_m) ? pump.head_m[0] : 0);

            let score = 0;

            // คะแนนความเหมาะสมของอัตราการไหล (40%)
            if (maxFlow >= requiredFlow) {
                const flowRatio = maxFlow / requiredFlow;
                if (flowRatio >= 1.05 && flowRatio <= 1.5) {
                    score += 40;
                } else if (flowRatio >= 1.0 && flowRatio <= 2.0) {
                    score += 30;
                } else if (flowRatio >= 1.0 && flowRatio <= 2.5) {
                    score += 20;
                } else if (flowRatio >= 1.0 && flowRatio <= 3.0) {
                    score += 10;
                } else if (flowRatio >= 1.0) {
                    score += 5;
                } else {
                    score += 0;
                }
            } else {
                score += 0;
            }

            // คะแนนความเหมาะสมของ Head (35%)
            if (maxHead >= requiredHead) {
                const headRatio = maxHead / requiredHead;
                if (headRatio >= 1.05 && headRatio <= 1.5) {
                    score += 35;
                } else if (headRatio >= 1.0 && headRatio <= 2.0) {
                    score += 25;
                } else if (headRatio >= 1.0 && headRatio <= 2.5) {
                    score += 15;
                } else if (headRatio >= 1.0 && headRatio <= 3.0) {
                    score += 8;
                } else if (headRatio >= 1.0) {
                    score += 3;
                } else {
                    score += 0;
                }
            } else {
                score += 0;
            }

            // คะแนนประสิทธิภาพต่อราคา (15%)
            const flowPerBaht = maxFlow / pump.price;
            if (flowPerBaht > 0.5) score += 15;
            else if (flowPerBaht > 0.3) score += 12;
            else if (flowPerBaht > 0.1) score += 8;
            else if (flowPerBaht > 0.05) score += 5;
            else score += 2;

            // คะแนนกำลังที่เหมาะสม (10%)
            const powerHP = typeof pump.powerHP === 'string' ? 
                parseFloat(pump.powerHP.toString().replace(/[^0-9.]/g, '')) : pump.powerHP;
            const estimatedHP = (requiredFlow * requiredHead * 0.00027);
            const powerRatio = powerHP / estimatedHP;
            
            if (powerRatio >= 1.0 && powerRatio <= 2.5) score += 10;
            else if (powerRatio >= 0.8 && powerRatio <= 3.0) score += 7;
            else if (powerRatio >= 0.6 && powerRatio <= 4.0) score += 4;
            else score += 1;

            const flowRatio = maxFlow / requiredFlow;
            const headRatio = maxHead / requiredHead;

            return {
                ...pump,
                score,
                maxFlow,
                maxHead,
                powerHP,
                flowRatio,
                headRatio,
                flowPerBaht,
                estimatedHP,
                isFlowAdequate: maxFlow >= requiredFlow,
                isHeadAdequate: maxHead >= requiredHead,
                isRecommended: score >= 60 && maxFlow >= requiredFlow && maxHead >= requiredHead && 
                              flowRatio <= 2.0 && headRatio <= 2.0,
                isGoodChoice: score >= 40 && maxFlow >= requiredFlow && maxHead >= requiredHead && 
                             flowRatio <= 2.5 && headRatio <= 2.5,
                isUsable: score >= 20 && maxFlow >= requiredFlow && maxHead >= requiredHead &&
                         flowRatio <= 3.0 && headRatio <= 3.0
            };
        }).sort((a, b) => {
            if (a.isRecommended !== b.isRecommended) return b.isRecommended ? 1 : -1;
            if (a.isGoodChoice !== b.isGoodChoice) return b.isGoodChoice ? 1 : -1;
            if (a.isUsable !== b.isUsable) return b.isUsable ? 1 : -1;
            return b.score - a.score;
        });
    }, [requiredFlow, requiredHead]);

    // กรองตามคำค้นหา
    const filteredPumps = useMemo(() => {
        if (!searchTerm) return analyzedPumps;
        
        const searchLower = searchTerm.toLowerCase();
        return analyzedPumps.filter(pump => 
            pump.productCode.toLowerCase().includes(searchLower) ||
            pump.powerHP.toString().toLowerCase().includes(searchLower) ||
            pump.powerKW.toString().includes(searchLower) ||
            pump.max_flow_rate_lpm?.toString().includes(searchLower) ||
            pump.max_head_m?.toString().includes(searchLower) ||
            pump.price.toString().includes(searchLower)
        );
    }, [analyzedPumps, searchTerm]);

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

    const handlePumpSelect = (pump: any) => {
        onPumpChange(pump);
        setIsOpen(false);
        setSearchTerm('');
    };

    const selectedAnalyzed = selectedPump 
        ? analyzedPumps.find(p => p.id === selectedPump.id)
        : null;

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h3 className="mb-4 text-lg font-semibold text-red-400">เลือกปั๊มน้ำ</h3>
            
            {/* ข้อมูลความต้องการ */}
            <div className="mb-4 rounded bg-gray-600 p-3">
                <h4 className="mb-2 text-sm font-medium text-red-300">⚡ ความต้องการ:</h4>
                <div className="text-xs text-gray-300">
                    <p>อัตราการไหล: <span className="font-bold text-blue-300">{requiredFlow.toFixed(1)} LPM</span></p>
                    <p>Head รวม: <span className="font-bold text-yellow-300">{requiredHead.toFixed(1)} เมตร</span></p>
                    <p className="text-gray-400">
                        (Static: {results.headLoss.total > 0 ? 
                            `${(requiredHead - results.headLoss.total - 15).toFixed(1)}m` : 'N/A'}, 
                         Loss: {results.headLoss.total.toFixed(1)}m, 
                         Pressure: 15m)
                    </p>
                </div>
            </div>

            {/* สถิติปั๊ม */}
            <div className="mb-4 rounded bg-gray-600 p-3">
                <h4 className="mb-2 text-sm font-medium text-red-300">📊 สถิติ:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 md:grid-cols-4">
                    <p>🌟 แนะนำ: <span className="font-bold text-green-300">{analyzedPumps.filter(p => p.isRecommended).length}</span></p>
                    <p>✅ ตัวเลือกดี: <span className="font-bold text-blue-300">{analyzedPumps.filter(p => p.isGoodChoice && !p.isRecommended).length}</span></p>
                    <p>⚡ ใช้ได้: <span className="font-bold text-yellow-300">{analyzedPumps.filter(p => p.isUsable && !p.isGoodChoice).length}</span></p>
                    <p>⚠️ ควรพิจารณา: <span className="font-bold text-red-300">{analyzedPumps.filter(p => !p.isUsable).length}</span></p>
                </div>
            </div>

            {/* Searchable Dropdown */}
            <div className="relative mb-4">
                <div 
                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white cursor-pointer flex justify-between items-center"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span>
                        {selectedPump 
                            ? `${selectedPump.productCode} (${selectedPump.powerHP}HP) - ${selectedPump.price} บาท`
                            : '-- เลือกปั๊ม --'
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
                                placeholder="ค้นหาปั๊ม... (รหัส, กำลัง HP/kW, flow, head, ราคา)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2 bg-gray-700 text-white rounded border border-gray-500 focus:border-blue-400"
                                autoFocus
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                แสดง {filteredPumps.length} จาก {analyzedPumps.length} ปั๊ม
                            </p>
                        </div>

                        {/* Options List */}
                        <div className="max-h-80 overflow-y-auto">
                            {filteredPumps.length === 0 ? (
                                <div className="p-3 text-gray-400 text-center">
                                    ไม่พบปั๊มที่ค้นหา "{searchTerm}"
                                </div>
                            ) : (
                                filteredPumps.map((pump) => (
                                    <div
                                        key={pump.id}
                                        onClick={() => handlePumpSelect(pump)}
                                        className="p-2 hover:bg-gray-500 cursor-pointer border-b border-gray-700 last:border-b-0"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-white">
                                                    {pump.productCode} ({pump.powerHP}HP)
                                                </span>
                                                <span className="text-gray-300 ml-2">- {pump.price} บาท</span>
                                            </div>
                                            <span className={`text-xs font-bold ${getRecommendationColor(pump)}`}>
                                                {getRecommendationIcon(pump)}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            Flow: {pump.maxFlow || 'N/A'} LPM | Head: {pump.maxHead || 'N/A'}m | 
                                            คะแนน: {pump.score}/100 | 
                                            อัตราส่วน: {pump.flowRatio.toFixed(1)}x Flow, {pump.headRatio.toFixed(1)}x Head
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ข้อมูลปั๊มที่เลือก */}
            {selectedPump && selectedAnalyzed && (
                <div className="rounded bg-gray-600 p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium text-white">ข้อมูลปั๊มที่เลือก</h4>
                        <span className={`text-sm font-bold ${getRecommendationColor(selectedAnalyzed)}`}>
                            {getRecommendationIcon(selectedAnalyzed)}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p><strong>รุ่น:</strong> {selectedPump.productCode}</p>
                            <p><strong>กำลัง:</strong> {selectedPump.powerHP} HP ({selectedPump.powerKW} kW)</p>
                            <p><strong>เฟส:</strong> {selectedPump.phase} เฟส</p>
                            <p><strong>ท่อเข้า/ออก:</strong> {selectedPump.inlet_size_inch}"/{selectedPump.outlet_size_inch}"</p>
                            <p><strong>ราคา:</strong> {selectedPump.price.toLocaleString()} บาท</p>
                        </div>
                        <div>
                            <p>
                                <strong>อัตราการไหลสูงสุด:</strong> {selectedAnalyzed.maxFlow || 'N/A'} LPM
                            </p>
                            <p>
                                <strong>ความสูงยกสูงสุด:</strong> {selectedAnalyzed.maxHead || 'N/A'} เมตร
                            </p>
                            <p>
                                <strong>ความลึกดูด:</strong> {selectedPump.suction_depth_m || 'N/A'} เมตร
                            </p>
                            <p>
                                <strong>ประสิทธิภาพ/ราคา:</strong>{' '}
                                <span className="text-blue-300">
                                    {selectedAnalyzed.flowPerBaht.toFixed(3)} LPM/บาท
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* การตรวจสอบความเพียงพอ */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <p>
                            <strong>Flow:</strong>{' '}
                            <span
                                className={`font-bold ${
                                    selectedAnalyzed.isFlowAdequate ? 'text-green-300' : 'text-red-300'
                                }`}
                            >
                                {selectedAnalyzed.isFlowAdequate ? '✅ เพียงพอ' : '❌ ไม่เพียงพอ'}
                            </span>
                            <span className="text-gray-400 ml-2">
                                ({selectedAnalyzed.flowRatio.toFixed(1)}x)
                            </span>
                        </p>
                        <p>
                            <strong>Head:</strong>{' '}
                            <span
                                className={`font-bold ${
                                    selectedAnalyzed.isHeadAdequate ? 'text-green-300' : 'text-red-300'
                                }`}
                            >
                                {selectedAnalyzed.isHeadAdequate ? '✅ เพียงพอ' : '❌ ไม่เพียงพอ'}
                            </span>
                            <span className="text-gray-400 ml-2">
                                ({selectedAnalyzed.headRatio.toFixed(1)}x)
                            </span>
                        </p>
                    </div>

                    {/* การวิเคราะห์ความเหมาะสม */}
                    <div className="mt-3 rounded bg-gray-500 p-2">
                        <h5 className="text-xs font-medium text-yellow-300">การวิเคราะห์:</h5>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <p>คะแนนรวม: <span className="font-bold">{selectedAnalyzed.score}</span>/100</p>
                            <p>กำลังประมาณ: <span className="font-bold">{selectedAnalyzed.estimatedHP.toFixed(1)}</span> HP</p>
                            <p>น้ำหนัก: <span className="font-bold">{selectedPump.weight_kg || 'N/A'}</span> kg</p>
                        </div>
                    </div>

                    {/* เตือนความไม่เพียงพอ */}
                    {(!selectedAnalyzed.isFlowAdequate || !selectedAnalyzed.isHeadAdequate) && (
                        <div className="mt-3 rounded bg-red-900 p-2">
                            <p className="text-sm text-red-300">
                                ⚠️ <strong>คำเตือน:</strong> ปั๊มนี้
                                {!selectedAnalyzed.isFlowAdequate && ' อัตราการไหลไม่เพียงพอ'}
                                {!selectedAnalyzed.isFlowAdequate && !selectedAnalyzed.isHeadAdequate && ' และ'}
                                {!selectedAnalyzed.isHeadAdequate && ' ความสูงยกไม่เพียงพอ'}
                                {' '}สำหรับระบบนี้
                            </p>
                        </div>
                    )}

                    {/* คำแนะนำการประหยัดพลังงาน */}
                    {(selectedAnalyzed.flowRatio > 3 || selectedAnalyzed.headRatio > 3) && (
                        <div className="mt-3 rounded bg-yellow-900 p-2">
                            <p className="text-sm text-yellow-300">
                                💰 <strong>หมายเหตุ:</strong> ปั๊มนี้มีขนาดใหญ่เกินความต้องการ 
                                ({selectedAnalyzed.flowRatio.toFixed(1)}x Flow, {selectedAnalyzed.headRatio.toFixed(1)}x Head)
                                อาจสิ้นเปลืองพลังงาน ควรพิจารณาใช้ปั๊มขนาดเล็กกว่า
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchablePumpSelector;