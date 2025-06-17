// components/SearchablePipeSelector.tsx
import React, { useState, useMemo } from 'react';
import { PipeData } from '../product/Pipe';
import { CalculationResults, PipeType, IrrigationInput, AnalyzedPipe } from '../types/interfaces';
import { calculateImprovedHeadLoss } from '../utils/calculations';

interface SearchablePipeSelectorProps {
    pipeType: PipeType;
    selectedPipe: any;
    onPipeChange: (pipe: any) => void;
    results: CalculationResults;
    input: IrrigationInput;
}

const SearchablePipeSelector: React.FC<SearchablePipeSelectorProps> = ({
    pipeType,
    selectedPipe,
    onPipeChange,
    results,
    input,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const getPipeConfig = () => {
        switch (pipeType) {
            case 'branch':
                return {
                    title: 'เลือกท่อย่อย',
                    titleColor: 'text-purple-400',
                    description: `สำหรับแยกไปสปริงเกอร์ (${input.sprinklersPerBranch} หัว/ท่อ)`,
                    recommendedTypes: ['LDPE', 'Flexible PE', 'PE-RT'],
                    rolls: results.branchPipeRolls,
                    flow: results.flows.branch,
                    velocity: results.velocity.branch,
                    length: input.longestBranchPipeM,
                };
            case 'secondary':
                return {
                    title: 'เลือกท่อเมนรอง',
                    titleColor: 'text-orange-400',
                    description: `รวบรวมน้ำจาก ${input.branchesPerSecondary} ท่อย่อย`,
                    recommendedTypes: ['HDPE PE 80', 'HDPE PE 100', 'PVC'],
                    rolls: results.secondaryPipeRolls,
                    flow: results.flows.secondary,
                    velocity: results.velocity.secondary,
                    length: input.longestSecondaryPipeM,
                };
            case 'main':
                return {
                    title: 'เลือกท่อเมนหลัก',
                    titleColor: 'text-cyan-400',
                    description: `ท่อหลักจากปั๊ม (${input.simultaneousZones} โซนพร้อมกัน)`,
                    recommendedTypes: ['HDPE PE 100', 'HDPE PE 80'],
                    rolls: results.mainPipeRolls,
                    flow: results.flows.main,
                    velocity: results.velocity.main,
                    length: input.longestMainPipeM,
                };
        }
    };

    const config = getPipeConfig();

    // วิเคราะห์ท่อทั้งหมด 60 ท่อ
    const analyzedPipes = useMemo(() => {
        return PipeData.map(pipe => {
            const headLossData = calculateImprovedHeadLoss(
                config.flow,
                pipe.sizeMM,
                config.length,
                pipe.pipeType,
                pipeType,
                input.pipeAgeYears
            );

            // คำนวณคะแนน
            let score = 0;
            const velocity = headLossData.velocity;

            // คะแนนความเร็ว (40%)
            if (velocity >= 0.8 && velocity <= 2.0) {
                score += 40;
            } else if (velocity >= 0.5 && velocity <= 2.5) {
                score += 30;
            } else if (velocity >= 0.3 && velocity <= 3.0) {
                score += 20;
            } else {
                score += 0;
            }

            // คะแนนประเภทที่เหมาะสม (30%)
            if (config.recommendedTypes.includes(pipe.pipeType)) {
                score += 30;
            } else {
                score += 5; // ประเภทไม่แนะนำแต่ยังใช้ได้
            }

            // คะแนนราคาต่อประสิทธิภาพ (20%)
            const costEfficiency = (pipe.lengthM * 1000) / (pipe.price * pipe.sizeMM);
            if (costEfficiency > 50) score += 20;
            else if (costEfficiency > 30) score += 15;
            else if (costEfficiency > 20) score += 10;
            else score += 5;

            // คะแนน Head Loss (10%)
            if (headLossData.total < 1) score += 10;
            else if (headLossData.total < 2) score += 8;
            else if (headLossData.total < 5) score += 5;
            else score += 2;

            // กำหนดระดับความเหมาะสม
            const isRecommendedType = config.recommendedTypes.includes(pipe.pipeType);
            const isRecommended = score >= 60 && isRecommendedType && velocity >= 0.3 && velocity <= 3.0;
            const isGoodChoice = score >= 40 && velocity >= 0.3 && velocity <= 3.0;
            const isUsable = score >= 20 && velocity >= 0.3 && velocity <= 3.0;

            return {
                ...pipe,
                score,
                velocity,
                headLoss: headLossData.total,
                isRecommended,
                isGoodChoice,
                isUsable,
                isRecommendedType
            };
        }).sort((a, b) => {
            // เรียงลำดับ: แนะนำ > ตัวเลือกดี > ใช้ได้ > อื่นๆ
            if (a.isRecommended !== b.isRecommended) return b.isRecommended ? 1 : -1;
            if (a.isGoodChoice !== b.isGoodChoice) return b.isGoodChoice ? 1 : -1;
            if (a.isUsable !== b.isUsable) return b.isUsable ? 1 : -1;
            return b.score - a.score;
        });
    }, [config, input.pipeAgeYears, pipeType]);

    // กรองตามคำค้นหา
    const filteredPipes = useMemo(() => {
        if (!searchTerm) return analyzedPipes;
        
        const searchLower = searchTerm.toLowerCase();
        return analyzedPipes.filter(pipe => 
            pipe.productCode.toLowerCase().includes(searchLower) ||
            pipe.pipeType.toLowerCase().includes(searchLower) ||
            pipe.sizeMM.toString().includes(searchLower) ||
            pipe.lengthM.toString().includes(searchLower) ||
            pipe.price.toString().includes(searchLower)
        );
    }, [analyzedPipes, searchTerm]);

    const getRecommendationIcon = (pipe: any) => {
        if (pipe.isRecommended) return '🌟 แนะนำ';
        if (pipe.isGoodChoice) return '✅ ตัวเลือกดี';
        if (pipe.isUsable) return '⚡ ใช้ได้';
        if (pipe.isRecommendedType) return '⚠️ ประเภทเหมาะสม';
        return '❌ ไม่แนะนำ';
    };

    const getRecommendationColor = (pipe: any) => {
        if (pipe.isRecommended) return 'text-green-300';
        if (pipe.isGoodChoice) return 'text-blue-300';
        if (pipe.isUsable) return 'text-yellow-300';
        if (pipe.isRecommendedType) return 'text-orange-300';
        return 'text-red-300';
    };

    const handlePipeSelect = (pipe: any) => {
        onPipeChange(pipe);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h3 className={`mb-4 text-lg font-semibold ${config.titleColor}`}>{config.title}</h3>
            <p className="mb-3 text-sm text-gray-300">{config.description}</p>
            
            {/* สถิติท่อ */}
            <div className="mb-4 rounded bg-gray-600 p-3">
                <h4 className="mb-2 text-sm font-medium text-green-300">📊 สถิติ:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 md:grid-cols-4">
                    <p>🌟 แนะนำ: <span className="font-bold text-green-300">{analyzedPipes.filter(p => p.isRecommended).length}</span></p>
                    <p>✅ ตัวเลือกดี: <span className="font-bold text-blue-300">{analyzedPipes.filter(p => p.isGoodChoice && !p.isRecommended).length}</span></p>
                    <p>⚡ ใช้ได้: <span className="font-bold text-yellow-300">{analyzedPipes.filter(p => p.isUsable && !p.isGoodChoice).length}</span></p>
                    <p>❌ ไม่แนะนำ: <span className="font-bold text-red-300">{analyzedPipes.filter(p => !p.isUsable).length}</span></p>
                </div>
            </div>

            {/* Searchable Dropdown */}
            <div className="relative mb-4">
                <div 
                    className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white cursor-pointer flex justify-between items-center"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span>
                        {selectedPipe 
                            ? `${selectedPipe.productCode} (${selectedPipe.sizeMM}mm, ${selectedPipe.lengthM}m) - ${selectedPipe.price} บาท`
                            : '-- เลือกท่อ --'
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
                                placeholder="ค้นหาท่อ... (รหัส, ประเภท, ขนาด, ราคา)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2 bg-gray-700 text-white rounded border border-gray-500 focus:border-blue-400"
                                autoFocus
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                แสดง {filteredPipes.length} จาก {analyzedPipes.length} ท่อ
                            </p>
                        </div>

                        {/* Options List */}
                        <div className="max-h-80 overflow-y-auto">
                            {filteredPipes.length === 0 ? (
                                <div className="p-3 text-gray-400 text-center">
                                    ไม่พบท่อที่ค้นหา "{searchTerm}"
                                </div>
                            ) : (
                                filteredPipes.map((pipe) => (
                                    <div
                                        key={pipe.id}
                                        onClick={() => handlePipeSelect(pipe)}
                                        className="p-2 hover:bg-gray-500 cursor-pointer border-b border-gray-700 last:border-b-0"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-white">
                                                    {pipe.productCode} ({pipe.sizeMM}mm, {pipe.lengthM}m)
                                                </span>
                                                <span className="text-gray-300 ml-2">- {pipe.price} บาท</span>
                                            </div>
                                            <span className={`text-xs font-bold ${getRecommendationColor(pipe)}`}>
                                                {getRecommendationIcon(pipe)}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {pipe.pipeType} | คะแนน: {pipe.score}/100 | ความเร็ว: {pipe.velocity.toFixed(2)} m/s
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ข้อมูลท่อที่เลือก */}
            {selectedPipe && (
                <div className="rounded bg-gray-600 p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium text-white">ข้อมูลท่อที่เลือก</h4>
                        <span className={`text-sm font-bold ${getRecommendationColor(
                            analyzedPipes.find(p => p.id === selectedPipe.id)
                        )}`}>
                            {getRecommendationIcon(analyzedPipes.find(p => p.id === selectedPipe.id) || {})}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p><strong>ประเภท:</strong> {selectedPipe.pipeType}</p>
                            <p><strong>ขนาด:</strong> {selectedPipe.sizeMM} มม.</p>
                            <p><strong>ความยาวต่อม้วน:</strong> {selectedPipe.lengthM} เมตร</p>
                            <p><strong>ความดัน:</strong> PN{selectedPipe.pn}</p>
                        </div>
                        <div>
                            <p><strong>อัตราการไหล:</strong> {config.flow.toFixed(1)} LPM</p>
                            <p>
                                <strong>ความเร็ว:</strong>{' '}
                                <span
                                    className={`${
                                        config.velocity > 2.5
                                            ? 'text-red-400'
                                            : config.velocity < 0.3
                                            ? 'text-blue-400'
                                            : 'text-green-400'
                                    }`}
                                >
                                    {config.velocity.toFixed(2)} m/s
                                </span>
                            </p>
                            <p><strong>จำนวนม้วน:</strong> <span className="text-yellow-300">{config.rolls}</span> ม้วน</p>
                            <p>
                                <strong>ราคารวม:</strong>{' '}
                                <span className="text-green-300">
                                    {(selectedPipe.price * config.rolls).toLocaleString()}
                                </span>{' '}
                                บาท
                            </p>
                        </div>
                    </div>

                    {/* แสดงคะแนนและการวิเคราะห์ */}
                    {(() => {
                        const analysis = analyzedPipes.find(p => p.id === selectedPipe.id);
                        if (analysis) {
                            return (
                                <div className="mt-3 rounded bg-gray-500 p-2">
                                    <h5 className="text-xs font-medium text-yellow-300">การวิเคราะห์:</h5>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <p>คะแนนรวม: <span className="font-bold">{analysis.score}</span>/100</p>
                                        <p>Head Loss: <span className="font-bold">{analysis.headLoss.toFixed(2)}</span> m</p>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {/* คำแนะนำ */}
                    {(() => {
                        const analysis = analyzedPipes.find(p => p.id === selectedPipe.id);
                        if (analysis && !analysis.isRecommended && !analysis.isRecommendedType) {
                            return (
                                <div className="mt-3 rounded bg-red-900 p-2">
                                    <p className="text-sm text-red-300">
                                        ⚠️ <strong>คำเตือน:</strong> ประเภทท่อนี้ไม่เหมาะสมสำหรับ{config.title.replace('เลือก', '')}
                                        <br />แนะนำประเภท: {config.recommendedTypes.join(', ')}
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            )}
        </div>
    );
};

export default SearchablePipeSelector;