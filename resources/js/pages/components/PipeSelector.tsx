// components/PipeSelector.tsx
import React from 'react';
import { PipeData } from '../product/Pipe';
import { CalculationResults, PipeType, IrrigationInput, AnalyzedPipe } from '../types/interfaces';

interface PipeSelectorProps {
    pipeType: PipeType;
    selectedPipe: any;
    onPipeChange: (pipe: any) => void;
    results: CalculationResults;
    input: IrrigationInput;
}

const PipeSelector: React.FC<PipeSelectorProps> = ({
    pipeType,
    selectedPipe,
    onPipeChange,
    results,
    input,
}) => {
    const getPipeConfig = () => {
        switch (pipeType) {
            case 'branch':
                return {
                    title: 'เลือกท่อย่อย',
                    titleColor: 'text-purple-400',
                    description: `สำหรับแยกไปสปริงเกอร์ (${input.sprinklersPerBranch} หัว/ท่อ)`,
                    allowedTypes: ['LDPE', 'Flexible PE', 'PE-RT'],
                    analyzedPipes: results.analyzedBranchPipes || [],
                    rolls: results.branchPipeRolls,
                    flow: results.flows.branch,
                    velocity: results.velocity.branch,
                };
            case 'secondary':
                return {
                    title: 'เลือกท่อเมนรอง',
                    titleColor: 'text-orange-400',
                    description: `รวบรวมน้ำจาก ${input.branchesPerSecondary} ท่อย่อย`,
                    allowedTypes: ['HDPE PE 80', 'HDPE PE 100', 'PVC'],
                    analyzedPipes: results.analyzedSecondaryPipes || [],
                    rolls: results.secondaryPipeRolls,
                    flow: results.flows.secondary,
                    velocity: results.velocity.secondary,
                };
            case 'main':
                return {
                    title: 'เลือกท่อเมนหลัก',
                    titleColor: 'text-cyan-400',
                    description: `ท่อหลักจากปั๊ม (${input.simultaneousZones} โซนพร้อมกัน)`,
                    allowedTypes: ['HDPE PE 100', 'HDPE PE 80'],
                    analyzedPipes: results.analyzedMainPipes || [],
                    rolls: results.mainPipeRolls,
                    flow: results.flows.main,
                    velocity: results.velocity.main,
                };
        }
    };

    const config = getPipeConfig();
    
    // กรองท่อตามประเภทที่อนุญาต
    const filteredPipes = PipeData.filter((pipe) => config.allowedTypes.includes(pipe.pipeType));
    
    // รวมข้อมูลการวิเคราะห์กับข้อมูลท่อ
    const pipesWithAnalysis = filteredPipes.map(pipe => {
        const analyzed = config.analyzedPipes.find(ap => ap.id === pipe.id);
        return {
            ...pipe,
            score: analyzed?.score || 0,
            velocity: analyzed?.velocity || 0,
            headLoss: analyzed?.headLoss || 0,
            isRecommended: analyzed?.isRecommended || false,
            isGoodChoice: analyzed?.isGoodChoice || false,
            isUsable: analyzed?.isUsable || false
        };
    });

    // เรียงลำดับ: แนะนำ > ตัวเลือกดี > ใช้ได้ > อื่นๆ
    const sortedPipes = pipesWithAnalysis.sort((a, b) => {
        if (a.isRecommended !== b.isRecommended) {
            return b.isRecommended ? 1 : -1;
        }
        if (a.isGoodChoice !== b.isGoodChoice) {
            return b.isGoodChoice ? 1 : -1;
        }
        if (a.isUsable !== b.isUsable) {
            return b.isUsable ? 1 : -1;
        }
        return a.price - b.price; // เรียงตามราคา
    });

    const getRecommendationIcon = (pipe: any) => {
        if (pipe.isRecommended) return '🌟 แนะนำ';
        if (pipe.isGoodChoice) return '✅ ตัวเลือกดี';
        if (pipe.isUsable) return '⚡ ใช้ได้';
        return '⚠️ ควรพิจารณา';
    };

    const getRecommendationColor = (pipe: any) => {
        if (pipe.isRecommended) return 'text-green-300';
        if (pipe.isGoodChoice) return 'text-blue-300';
        if (pipe.isUsable) return 'text-yellow-300';
        return 'text-red-300';
    };

    const getLongestPipe = () => {
        switch (pipeType) {
            case 'branch':
                return input.longestBranchPipeM;
            case 'secondary':
                return input.longestSecondaryPipeM;
            case 'main':
                return input.longestMainPipeM;
        }
    };

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h3 className={`mb-4 text-lg font-semibold ${config.titleColor}`}>{config.title}</h3>
            <p className="mb-3 text-sm text-gray-300">{config.description}</p>
            
            {/* คำแนะนำด่วน */}
            <div className="mb-4 rounded bg-gray-600 p-3">
                <h4 className="mb-2 text-sm font-medium text-green-300">💡 คำแนะนำ:</h4>
                <div className="text-xs text-gray-300">
                    <p>🌟 = แนะนำมาก (คะแนน 60+)</p>
                    <p>✅ = ตัวเลือกดี (คะแนน 40-59)</p>
                    <p>⚡ = ใช้ได้ (คะแนน 20-39)</p>
                    <p>⚠️ = ควรพิจารณา (คะแนน &lt;20)</p>
                </div>
            </div>

            <select
                value={selectedPipe?.id || ''}
                onChange={(e) => {
                    const selected = PipeData.find((p) => p.id === parseInt(e.target.value));
                    onPipeChange(selected);
                }}
                className="mb-4 w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
            >
                <option value="">-- เลือกท่อ --</option>
                {sortedPipes.map((pipe) => (
                    <option key={pipe.id} value={pipe.id}>
                        {pipe.productCode} ({pipe.sizeMM}mm, {pipe.lengthM}m) - {pipe.price} บาท | {getRecommendationIcon(pipe)}
                    </option>
                ))}
            </select>

            {selectedPipe && (
                <div className="rounded bg-gray-600 p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium text-white">ข้อมูลท่อที่เลือก</h4>
                        <span className={`text-sm font-bold ${getRecommendationColor(
                            pipesWithAnalysis.find(p => p.id === selectedPipe.id)
                        )}`}>
                            {getRecommendationIcon(pipesWithAnalysis.find(p => p.id === selectedPipe.id) || {})}
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
                        const analysis = pipesWithAnalysis.find(p => p.id === selectedPipe.id);
                        if (analysis && analysis.score > 0) {
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

                    {/* เตือนเรื่องความยาวท่อ */}
                    {pipeType === 'main' && selectedPipe.lengthM < getLongestPipe() && (
                        <div className="mt-3 rounded bg-red-900 p-2">
                            <p className="text-sm text-red-300">
                                ⚠️ <strong>คำเตือน:</strong> ท่อม้วนละ {selectedPipe.lengthM}m สั้นกว่าระยะที่ยาวที่สุด{' '}
                                {getLongestPipe()}m จะต้องต่อท่อ
                            </p>
                        </div>
                    )}

                    {/* คำแนะนำการปรับปรุง */}
                    {(() => {
                        const analysis = pipesWithAnalysis.find(p => p.id === selectedPipe.id);
                        if (analysis && !analysis.isRecommended) {
                            const betterPipes = pipesWithAnalysis.filter(p => p.isRecommended).slice(0, 2);
                            if (betterPipes.length > 0) {
                                return (
                                    <div className="mt-3 rounded bg-blue-900 p-2">
                                        <p className="text-sm text-blue-300">
                                            💡 <strong>ท่อที่แนะนำ:</strong>{' '}
                                            {betterPipes.map(p => `${p.productCode} (${p.sizeMM}mm)`).join(', ')}
                                        </p>
                                    </div>
                                );
                            }
                        }
                        return null;
                    })()}
                </div>
            )}
        </div>
    );
};

export default PipeSelector;