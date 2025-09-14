/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// resources\js\pages\components\PipeSystemSummary.tsx
import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    calculateNewHeadLoss,
    SprinklerPressureInfo,
    PipeCalculationResult,
} from '../../utils/horticulturePipeCalculations';

interface PipeSystemSummaryProps {
    horticultureSystemData?: any;
    gardenSystemData?: any; // เพิ่มสำหรับ garden mode
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
    gardenSystemData,
    activeZoneId,
    selectedPipes,
    sprinklerPressure,
    projectMode = 'horticulture',
}) => {
    const { t } = useLanguage();

    // Only show for horticulture and garden modes
    if (projectMode !== 'horticulture' && projectMode !== 'garden') {
        return null;
    }

    // Don't show if no data
    const systemData = projectMode === 'garden' ? gardenSystemData : horticultureSystemData;
    if (!sprinklerPressure || !systemData || !activeZoneId) {
        return null;
    }

    const calculationData = useMemo(() => {
        const zone = systemData.zones?.find((z: any) => z.id === activeZoneId);
        if (!zone?.bestPipes) return null;

        // คำนวณ head loss สำหรับแต่ละประเภทท่อ
        const branchCalc =
            zone.bestPipes.branch && selectedPipes?.branch
                ? calculateNewHeadLoss(
                      zone.bestPipes.branch,
                      selectedPipes.branch.pipeType === 'PE' ? 'PE' : 'PVC',
                      selectedPipes.branch.pipeType === 'PE'
                          ? `PN${selectedPipes.branch.pn}`
                          : `Class${selectedPipes.branch.pn}`,
                      `${selectedPipes.branch.sizeMM}mm`
                  )
                : null;

        const subMainCalc =
            zone.bestPipes.subMain && selectedPipes?.secondary
                ? calculateNewHeadLoss(
                      zone.bestPipes.subMain,
                      selectedPipes.secondary.pipeType === 'PE' ? 'PE' : 'PVC',
                      selectedPipes.secondary.pipeType === 'PE'
                          ? `PN${selectedPipes.secondary.pn}`
                          : `Class${selectedPipes.secondary.pn}`,
                      `${selectedPipes.secondary.sizeMM}mm`
                  )
                : null;

        const mainCalc =
            zone.bestPipes.main && selectedPipes?.main
                ? calculateNewHeadLoss(
                      zone.bestPipes.main,
                      selectedPipes.main.pipeType === 'PE' ? 'PE' : 'PVC',
                      selectedPipes.main.pipeType === 'PE'
                          ? `PN${selectedPipes.main.pn}`
                          : `Class${selectedPipes.main.pn}`,
                      `${selectedPipes.main.sizeMM}mm`
                  )
                : null;

        // คำนวณ emitter pipe แบบพิเศษ (ใช้ Q หัวฉีด และจำนวนทางออก = 1)
        let emitterCalc: PipeCalculationResult | null = null;
        if (selectedPipes?.emitter && systemData?.sprinklerConfig) {
            // หา lateral pipe ที่ยาวที่สุดจาก localStorage
            const currentProject = localStorage.getItem('horticultureIrrigationData');
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
                waterFlowRate: systemData.sprinklerConfig.flowRatePerPlant, // ใช้ Q หัวฉีด
                details: { type: 'emitter' },
            };

            emitterCalc = calculateNewHeadLoss(
                emitterPipeInfo,
                selectedPipes.emitter.pipeType === 'PE' ? 'PE' : 'PVC',
                selectedPipes.emitter.pipeType === 'PE'
                    ? `PN${selectedPipes.emitter.pn}`
                    : `Class${selectedPipes.emitter.pn}`,
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
    }, [systemData, activeZoneId, selectedPipes, sprinklerPressure]);

    if (!calculationData) {
        return null;
    }

    const { branchCalc, subMainCalc, mainCalc, emitterCalc, branchSubMainCombined, head20Percent } =
        calculationData;

    return (
        <div className="mt-6 rounded bg-blue-900 p-4">
            <h4 className="mb-3 text-lg font-bold text-blue-300">🔧 สรุปการคำนวณระบบท่อทั้งหมด</h4>

            <div className="space-y-3 text-sm">
                {/* ข้อมูลหัวฉีด */}
                <div className="flex items-center justify-around space-x-6 rounded bg-blue-800 p-3">
                    <h5 className="mb-0 whitespace-nowrap text-lg font-medium text-blue-50">
                        💧 ข้อมูลหัวฉีด ={' '}
                    </h5>
                    <div className="flex items-center space-x-2">
                        <span className="text-lg text-blue-300">แรงดัน</span>
                        <span className="text-lg font-bold text-white">
                            {parseFloat(sprinklerPressure.pressureBar.toFixed(2)).toString()}
                        </span>
                        <span className="text-lg text-blue-300">บาร์</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-lg text-blue-300">แปลงเป็น Head</span>
                        <span className="text-lg font-bold text-white">
                            {parseFloat(sprinklerPressure.headM.toFixed(2)).toString()}
                        </span>
                        <span className="text-lg text-blue-300">ม.</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-lg text-blue-300">20% Head</span>
                        <span className="text-lg font-bold text-yellow-300">
                            {parseFloat(head20Percent.toFixed(2)).toString()}
                        </span>
                        <span className="text-lg text-blue-300">ม.</span>
                    </div>
                </div>

                {/* สรุปการคำนวณทั้งหมด */}
                <div className="rounded bg-green-800 p-3">
                    <h5 className="mb-2 font-medium text-green-200">
                        🔧 สรุปการคำนวณระบบท่อทั้งหมด
                    </h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-green-300">ท่อเมนหลัก:</span>
                                    <span className="font-bold text-white">
                                        {mainCalc
                                            ? `${mainCalc.headLoss.toFixed(3)} ม.`
                                            : 'ไม่ได้เลือก'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-green-300">ท่อเมนรอง:</span>
                                    <span className="font-bold text-white">
                                        {subMainCalc
                                            ? `${subMainCalc.headLoss.toFixed(3)} ม.`
                                            : 'ไม่ได้เลือก'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-green-300">ท่อย่อย:</span>
                                    <span className="font-bold text-white">
                                        {branchCalc
                                            ? `${branchCalc.headLoss.toFixed(3)} ม.`
                                            : 'ไม่ได้เลือก'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-green-300">ท่อย่อยแยก:</span>
                                    <span className="font-bold text-white">
                                        {emitterCalc
                                            ? `${emitterCalc.headLoss.toFixed(3)} ม.`
                                            : 'ไม่ได้เลือก'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="border-l border-green-700 pl-4">
                            <div className="text-center">
                                {/* สรุปและ Warning */}
                                <div className="rounded bg-blue-800 p-3">
                                    <h5 className="mb-2 font-medium text-blue-200">📊 สรุปผล</h5>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-blue-300">
                                                ขีดจำกัด 20% Head หัวฉีด:
                                            </span>
                                            <span className="font-bold text-yellow-300">
                                                {head20Percent.toFixed(3)} ม.
                                            </span>
                                        </div>

                                        {/* Warning Messages */}
                                        {mainCalc && mainCalc.headLoss > head20Percent && (
                                            <div className="rounded border border-red-700 bg-red-900 p-2">
                                                <span className="text-xs text-red-300">
                                                    ⚠️ <strong>คำเตือน:</strong> ท่อเมนหลักมี Head
                                                    Loss เกินขีดจำกัด{' '}
                                                    {(mainCalc.headLoss - head20Percent).toFixed(3)}{' '}
                                                    ม.
                                                </span>
                                            </div>
                                        )}

                                        {branchCalc &&
                                            subMainCalc &&
                                            branchSubMainCombined > head20Percent && (
                                                <div className="rounded border border-red-700 bg-red-900 p-2">
                                                    <span className="text-xs text-red-300">
                                                        ⚠️ <strong>คำเตือน:</strong> ท่อย่อย +
                                                        ท่อเมนรอง มี Head Loss เกินขีดจำกัด{' '}
                                                        {(
                                                            branchSubMainCombined - head20Percent
                                                        ).toFixed(3)}{' '}
                                                        ม.
                                                    </span>
                                                </div>
                                            )}

                                        {/* Success Message */}
                                        {(!mainCalc || mainCalc.headLoss <= head20Percent) &&
                                            (!branchCalc ||
                                                !subMainCalc ||
                                                branchSubMainCombined <= head20Percent) && (
                                                <div className="rounded border border-green-700 bg-green-900 p-2">
                                                    <span className="text-xs text-green-300">
                                                        ✅ <strong>ปกติ:</strong> ค่า Head Loss
                                                        ทั้งหมดอยู่ในขีดจำกัดที่ยอมรับได้
                                                    </span>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PipeSystemSummary;
