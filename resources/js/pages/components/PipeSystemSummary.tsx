/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// resources\js\pages\components\PipeSystemSummary.tsx
import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculateNewHeadLoss, SprinklerPressureInfo, PipeCalculationResult } from '../../utils/horticulturePipeCalculations';

interface PipeSystemSummaryProps {
    horticultureSystemData?: any;
    activeZoneId?: string;
    selectedPipes?: {
        branch?: any;
        secondary?: any;
        main?: any;
        emitter?: any;
    };
    sprinklerPressure?: SprinklerPressureInfo;
    projectMode?: 'horticulture' | 'garden' | 'field-crop' | 'greenhouse';
}

const PipeSystemSummary: React.FC<PipeSystemSummaryProps> = ({
    horticultureSystemData,
    activeZoneId,
    selectedPipes,
    sprinklerPressure,
    projectMode = 'horticulture',
}) => {
    const { t } = useLanguage();

    // Only show for horticulture mode
    if (projectMode !== 'horticulture') {
        return null;
    }

    // Don't show if no data
    if (!sprinklerPressure || !horticultureSystemData || !activeZoneId) {
        return null;
    }

    const calculationData = useMemo(() => {
        const zone = horticultureSystemData.zones?.find((z: any) => z.id === activeZoneId);
        if (!zone?.bestPipes) return null;

        // คำนวณ head loss สำหรับแต่ละประเภทท่อ
        const branchCalc = zone.bestPipes.branch && selectedPipes?.branch ? calculateNewHeadLoss(
            zone.bestPipes.branch,
            selectedPipes.branch.pipeType === 'PE' ? 'PE' : 'PVC',
            selectedPipes.branch.pipeType === 'PE' ? `PN${selectedPipes.branch.pn}` : `Class${selectedPipes.branch.pn}`,
            `${selectedPipes.branch.sizeMM}mm`
        ) : null;

        const subMainCalc = zone.bestPipes.subMain && selectedPipes?.secondary ? calculateNewHeadLoss(
            zone.bestPipes.subMain,
            selectedPipes.secondary.pipeType === 'PE' ? 'PE' : 'PVC',
            selectedPipes.secondary.pipeType === 'PE' ? `PN${selectedPipes.secondary.pn}` : `Class${selectedPipes.secondary.pn}`,
            `${selectedPipes.secondary.sizeMM}mm`
        ) : null;

        const mainCalc = zone.bestPipes.main && selectedPipes?.main ? calculateNewHeadLoss(
            zone.bestPipes.main,
            selectedPipes.main.pipeType === 'PE' ? 'PE' : 'PVC',
            selectedPipes.main.pipeType === 'PE' ? `PN${selectedPipes.main.pn}` : `Class${selectedPipes.main.pn}`,
            `${selectedPipes.main.sizeMM}mm`
        ) : null;

        // คำนวณ emitter pipe แบบพิเศษ (ใช้ Q หัวฉีด และจำนวนทางออก = 1)
        let emitterCalc: PipeCalculationResult | null = null;
        if (selectedPipes?.emitter && horticultureSystemData?.sprinklerConfig) {
            // หา lateral pipe ที่ยาวที่สุดจาก localStorage
            const currentProject = localStorage.getItem('currentHorticultureProject');
            let longestEmitterLength = 10; // default

            if (currentProject) {
                try {
                    const projectData = JSON.parse(currentProject);
                    if (projectData.lateralPipes && projectData.lateralPipes.length > 0) {
                        // หาท่อ emitter ที่ยาวที่สุด
                        let maxEmitterLength = 0;
                        projectData.lateralPipes.forEach((lateralPipe: any) => {
                            if (lateralPipe.emitterLines && lateralPipe.emitterLines.length > 0) {
                                lateralPipe.emitterLines.forEach((emitterLine: any) => {
                                    if (emitterLine.length > maxEmitterLength) {
                                        maxEmitterLength = emitterLine.length;
                                    }
                                });
                            }
                        });
                        if (maxEmitterLength > 0) {
                            longestEmitterLength = maxEmitterLength;
                        }
                    }
                } catch (error) {
                    console.warn('Error parsing project data for emitter length:', error);
                }
            }

            // สร้าง BestPipeInfo สำหรับ emitter pipe
            const emitterPipeInfo = {
                id: 'emitter-pipe',
                length: longestEmitterLength,
                count: 1, // จำนวนทางออก = 1
                waterFlowRate: horticultureSystemData.sprinklerConfig.flowRatePerPlant, // ใช้ Q หัวฉีด
                details: { type: 'emitter' }
            };

            emitterCalc = calculateNewHeadLoss(
                emitterPipeInfo,
                selectedPipes.emitter.pipeType === 'PE' ? 'PE' : 'PVC',
                selectedPipes.emitter.pipeType === 'PE' ? `PN${selectedPipes.emitter.pn}` : `Class${selectedPipes.emitter.pn}`,
                `${selectedPipes.emitter.sizeMM}mm`
            );
        }

        const branchSubMainCombined = (branchCalc?.headLoss || 0) + (subMainCalc?.headLoss || 0);
        const head20Percent = sprinklerPressure.head20PercentM;

        return {
            branchCalc,
            subMainCalc,
            mainCalc,
            emitterCalc,
            branchSubMainCombined,
            head20Percent,
        };
    }, [horticultureSystemData, activeZoneId, selectedPipes, sprinklerPressure]);

    if (!calculationData) {
        return null;
    }

    const { branchCalc, subMainCalc, mainCalc, emitterCalc, branchSubMainCombined, head20Percent } = calculationData;

    return (
        <div className="mt-6 bg-blue-900 rounded p-4">
            <h4 className="text-blue-300 font-bold mb-3 text-lg">
                🔧 สรุปการคำนวณระบบท่อทั้งหมด
            </h4>
            
            <div className="space-y-3 text-sm">
                {/* ข้อมูลหัวฉีด */}
                <div className="bg-blue-800 rounded p-3">
                    <h5 className="text-blue-200 font-medium mb-2">💧 ข้อมูลหัวฉีด</h5>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <span className="text-blue-300 block">แรงดัน (บาร์)</span>
                            <span className="font-bold text-white text-lg">{sprinklerPressure.pressureBar.toFixed(1)}</span>
                        </div>
                        <div className="text-center">
                            <span className="text-blue-300 block">แปลงเป็น Head (ม.)</span>
                            <span className="font-bold text-white text-lg">{sprinklerPressure.headM.toFixed(1)}</span>
                        </div>
                        <div className="text-center">
                            <span className="text-blue-300 block">20% Head (ม.)</span>
                            <span className="font-bold text-yellow-300 text-lg">{head20Percent.toFixed(1)}</span>
                        </div>
                    </div>
                </div>

                {/* สรุปการคำนวณทั้งหมด */}
                <div className="bg-green-800 rounded p-3">
                    <h5 className="text-green-200 font-medium mb-2">🔧 สรุปการคำนวณระบบท่อทั้งหมด</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-green-300">ท่อเมนหลัก:</span>
                                    <span className="font-bold text-white">
                                        {mainCalc ? `${mainCalc.headLoss.toFixed(3)} ม.` : 'ไม่ได้เลือก'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-green-300">ท่อเมนรอง:</span>
                                    <span className="font-bold text-white">
                                        {subMainCalc ? `${subMainCalc.headLoss.toFixed(3)} ม.` : 'ไม่ได้เลือก'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-green-300">ท่อย่อย:</span>
                                    <span className="font-bold text-white">
                                        {branchCalc ? `${branchCalc.headLoss.toFixed(3)} ม.` : 'ไม่ได้เลือก'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-green-300">ท่อย่อยแยก:</span>
                                    <span className="font-bold text-white">
                                        {emitterCalc ? `${emitterCalc.headLoss.toFixed(3)} ม.` : 'ไม่ได้เลือก'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="border-l border-green-700 pl-4">
                            <div className="text-center">
                                <div className="text-green-300 text-xs">ผลรวมทั้งหมด</div>
                                <div className="text-white font-bold text-lg">
                                    {((mainCalc?.headLoss || 0) + (subMainCalc?.headLoss || 0) + (branchCalc?.headLoss || 0) + (emitterCalc?.headLoss || 0)).toFixed(3)} ม.
                                </div>
                                <div className="text-xs text-green-300 mt-1">
                                    vs. ขีดจำกัด {head20Percent.toFixed(1)} ม.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* สรุปและ Warning */}
                <div className="bg-blue-800 rounded p-3">
                    <h5 className="text-blue-200 font-medium mb-2">📊 สรุปผล</h5>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-blue-300">ขีดจำกัด 20% Head หัวฉีด:</span>
                            <span className="font-bold text-yellow-300">{head20Percent.toFixed(3)} ม.</span>
                        </div>
                        
                        {/* Warning Messages */}
                        {mainCalc && mainCalc.headLoss > head20Percent && (
                            <div className="bg-red-900 rounded p-2 border border-red-700">
                                <span className="text-red-300 text-xs">
                                    ⚠️ <strong>คำเตือน:</strong> ท่อเมนหลักมี Head Loss เกินขีดจำกัด {(mainCalc.headLoss - head20Percent).toFixed(3)} ม.
                                </span>
                            </div>
                        )}
                        
                        {branchCalc && subMainCalc && branchSubMainCombined > head20Percent && (
                            <div className="bg-red-900 rounded p-2 border border-red-700">
                                <span className="text-red-300 text-xs">
                                    ⚠️ <strong>คำเตือน:</strong> ท่อย่อย + ท่อเมนรอง มี Head Loss เกินขีดจำกัด {(branchSubMainCombined - head20Percent).toFixed(3)} ม.
                                </span>
                            </div>
                        )}
                        
                        {/* Success Message */}
                        {(!mainCalc || mainCalc.headLoss <= head20Percent) && 
                         (!branchCalc || !subMainCalc || branchSubMainCombined <= head20Percent) && (
                            <div className="bg-green-900 rounded p-2 border border-green-700">
                                <span className="text-green-300 text-xs">
                                    ✅ <strong>ปกติ:</strong> ค่า Head Loss ทั้งหมดอยู่ในขีดจำกัดที่ยอมรับได้
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PipeSystemSummary;
