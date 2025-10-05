/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// resources\js\pages\components\PipeSystemSummary.tsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    calculateNewHeadLoss,
    SprinklerPressureInfo,
    PipeCalculationResult,
} from '../../utils/horticulturePipeCalculations';

interface PipeSystemSummaryProps {
    horticultureSystemData?: any;
    gardenSystemData?: any; // เพิ่มสำหรับ garden mode
    greenhouseSystemData?: any; // เพิ่มสำหรับ greenhouse mode
    fieldCropData?: any; // เพิ่มสำหรับ field-crop mode
    greenhouseData?: any; // เพิ่มสำหรับ greenhouse mode
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
    greenhouseSystemData,
    fieldCropData,
    greenhouseData,
    activeZoneId,
    selectedPipes,
    sprinklerPressure,
    projectMode = 'horticulture',
}) => {
    const { t } = useLanguage();

    // Only show for supported modes
    if (projectMode !== 'horticulture' && projectMode !== 'garden' && projectMode !== 'field-crop' && projectMode !== 'greenhouse') {
        return null;
    }

    // Don't show if no data
    const systemData = projectMode === 'garden' ? gardenSystemData : 
                      projectMode === 'greenhouse' ? greenhouseData : 
                      horticultureSystemData;
    if (!sprinklerPressure || !systemData || !activeZoneId) {
        return null;
    }

    // ฟังก์ชันสำหรับอ่านข้อมูลจาก localStorage
    const getStoredCalculations = useCallback(() => {
        try {
            const storageKey =
                projectMode === 'garden'
                    ? 'garden_pipe_calculations'
                    : projectMode === 'greenhouse'
                      ? 'greenhouse_pipe_calculations'
                      : projectMode === 'field-crop'
                        ? 'field_crop_pipe_calculations'
                        : 'horticulture_pipe_calculations';
            
            const storedCalcStr = localStorage.getItem(storageKey);
            return storedCalcStr ? JSON.parse(storedCalcStr) : {};
        } catch (error) {
            console.error('Error reading pipe calculations from localStorage:', error);
            return {};
        }
    }, [projectMode]);

    const calculateData = useCallback(() => {

        const storedCalculations = getStoredCalculations();
        
        console.log(`🔍 PipeSystemSummary stored calculations (${projectMode}):`, storedCalculations);
        
        // สำหรับ greenhouse mode ให้กรองเฉพาะท่อที่ใช้จริง (ท่อเมนหลักและท่อย่อย)
        const filteredCalculations = projectMode === 'greenhouse' ? {
            branch: storedCalculations.branch || {},
            main: storedCalculations.main || {},
            // greenhouse ไม่มีท่อเมนรองและท่อย่อยแยก
            secondary: {},
            emitter: {}
        } : storedCalculations;

        // ล้างข้อมูลเก่าใน localStorage สำหรับ greenhouse mode
        if (projectMode === 'greenhouse' && (storedCalculations.secondary || storedCalculations.emitter)) {
            const cleanedData = {
                branch: storedCalculations.branch || {},
                main: storedCalculations.main || {}
            };
            localStorage.setItem('greenhouse_pipe_calculations', JSON.stringify(cleanedData));
        }
        
        
        // ถ้าไม่มีข้อมูลการคำนวณ หรือไม่มี selectedPipes ให้ return null
        if (!selectedPipes || Object.keys(filteredCalculations).length === 0) {
            return null;
        }

        // สร้าง calculation results จากข้อมูลที่กรองแล้ว
        const branchCalc = filteredCalculations.branch ? {
            headLoss: filteredCalculations.branch.headLoss || 0,
            pipeLength: filteredCalculations.branch.pipeLength || 0,
            flowRate: filteredCalculations.branch.flowRate || 0,
        } : null;

        const subMainCalc = filteredCalculations.secondary ? {
            headLoss: filteredCalculations.secondary.headLoss || 0,
            pipeLength: filteredCalculations.secondary.pipeLength || 0,
            flowRate: filteredCalculations.secondary.flowRate || 0,
        } : null;

        const mainCalc = filteredCalculations.main ? {
            headLoss: filteredCalculations.main.headLoss || 0,
            pipeLength: filteredCalculations.main.pipeLength || 0,
            flowRate: filteredCalculations.main.flowRate || 0,
        } : null;

        // คำนวณ emitter pipe จากข้อมูลที่กรองแล้ว
        const emitterCalc = filteredCalculations.emitter ? {
            headLoss: filteredCalculations.emitter.headLoss || 0,
            pipeLength: filteredCalculations.emitter.pipeLength || 0,
            flowRate: filteredCalculations.emitter.flowRate || 0,
        } : null;

        // สำหรับ greenhouse mode คำนวณ total head loss = ท่อเมนหลัก + ท่อย่อย (ไม่มีท่อเมนรอง)
        const branchSubMainCombined = projectMode === 'greenhouse' 
            ? (branchCalc?.headLoss || 0)
            : (branchCalc?.headLoss || 0) + (subMainCalc?.headLoss || 0);
        
        // สำหรับ greenhouse mode คำนวณ total head loss ทั้งระบบ
        const totalHeadLoss = projectMode === 'greenhouse'
            ? (mainCalc?.headLoss || 0) + (branchCalc?.headLoss || 0) // ท่อเมนหลัก + ท่อย่อย
            : (mainCalc?.headLoss || 0) + (subMainCalc?.headLoss || 0) + (branchCalc?.headLoss || 0) + (emitterCalc?.headLoss || 0);
        
        const head20Percent = sprinklerPressure.head20PercentM;
        
        console.log(`🔍 PipeSystemSummary calculated values (${projectMode}):`, {
            branchCalc,
            subMainCalc,
            mainCalc,
            emitterCalc,
            branchSubMainCombined,
            totalHeadLoss,
            head20Percent
        });

        return {
            branchCalc,
            subMainCalc,
            mainCalc,
            emitterCalc,
            branchSubMainCombined,
            totalHeadLoss,
            head20Percent,
        };
    }, [selectedPipes, sprinklerPressure, projectMode, getStoredCalculations]);

    // ใช้ state แทน useMemo เพื่อให้สามารถอัปเดตได้
    const [calculationData, setCalculationData] = useState(() => calculateData());
    const calculationDataRef = useRef(calculationData);
    
    // อัปเดต ref เมื่อ state เปลี่ยน
    useEffect(() => {
        calculationDataRef.current = calculationData;
    }, [calculationData]);

    // อัปเดตข้อมูลเมื่อมีการเปลี่ยนแปลงใน localStorage
    useEffect(() => {
        const handleStorageChange = () => {
            setCalculationData(calculateData());
        };

        // ฟังการเปลี่ยนแปลงใน localStorage
        window.addEventListener('storage', handleStorageChange);

        // อัปเดตข้อมูลแบบ real-time
        const interval = setInterval(() => {
            const newData = calculateData();
            // เปรียบเทียบค่าเพื่อหลีกเลี่ยงการ re-render ที่ไม่จำเป็น
            const currentDataString = JSON.stringify(calculationDataRef.current);
            const newDataString = JSON.stringify(newData);
            
            if (currentDataString !== newDataString) {
                setCalculationData(newData);
            }
        }, 2000); // ลดความถี่เป็น 2 วินาที

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [calculateData, projectMode]);

    // บังคับอัปเดตข้อมูลเมื่อ projectMode เปลี่ยนเป็น greenhouse
    useEffect(() => {
        if (projectMode === 'greenhouse') {
            const newData = calculateData();
            setCalculationData(newData);
        }
    }, [projectMode, calculateData]);

    if (!calculationData) {
        return null;
    }

    const { branchCalc, subMainCalc, mainCalc, emitterCalc, branchSubMainCombined, totalHeadLoss, head20Percent } =
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
                            {parseFloat((sprinklerPressure?.pressureBar || 0).toFixed(2)).toString()}
                        </span>
                        <span className="text-lg text-blue-300">บาร์</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-lg text-blue-300">แปลงเป็น Head</span>
                        <span className="text-lg font-bold text-white">
                            {parseFloat((sprinklerPressure?.headM || 0).toFixed(2)).toString()}
                        </span>
                        <span className="text-lg text-blue-300">ม.</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-lg text-blue-300">20% Head</span>
                        <span className="text-lg font-bold text-yellow-300">
                            {parseFloat((head20Percent || 0).toFixed(2)).toString()}
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
                                        {mainCalc && mainCalc.headLoss > 0
                                            ? `${mainCalc.headLoss.toFixed(3)} ม.`
                                            : '0.000 ม.'}
                                    </span>
                                </div>
                                {/* แสดงท่อเมนรองเฉพาะ mode ที่ไม่ใช่ greenhouse */}
                                {projectMode !== 'greenhouse' && (
                                    <div className="flex justify-between">
                                        <span className="text-green-300">ท่อเมนรอง:</span>
                                        <span className="font-bold text-white">
                                            {subMainCalc && subMainCalc.headLoss > 0
                                                ? `${subMainCalc.headLoss.toFixed(3)} ม.`
                                                : '0.000 ม.'}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-green-300">ท่อย่อย:</span>
                                    <span className="font-bold text-white">
                                        {branchCalc && branchCalc.headLoss > 0
                                            ? `${branchCalc.headLoss.toFixed(3)} ม.`
                                            : '0.000 ม.'}
                                    </span>
                                </div>
                                {/* แสดงท่อย่อยแยกเฉพาะ mode ที่ไม่ใช่ greenhouse */}
                                {emitterCalc && projectMode !== 'greenhouse' && (
                                    <div className="flex justify-between">
                                        <span className="text-green-300">ท่อย่อยแยก:</span>
                                        <span className="font-bold text-white">
                                            {emitterCalc.headLoss > 0
                                                ? `${emitterCalc.headLoss.toFixed(3)} ม.`
                                                : '0.000 ม.'}
                                        </span>
                                    </div>
                                )}
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
                                                {(head20Percent || 0).toFixed(3)} ม.
                                            </span>
                                        </div>
                                        
                                        {/* แสดง Total Head Loss สำหรับ greenhouse mode */}
                                        {projectMode === 'greenhouse' && (
                                            <div className="flex justify-between">
                                                <span className="text-blue-300">
                                                    Head Loss รวมทั้งระบบ:
                                                </span>
                                                <span className={`font-bold ${totalHeadLoss > head20Percent ? 'text-red-400' : 'text-green-400'}`}>
                                                    {totalHeadLoss.toFixed(3)} ม.
                                                </span>
                                            </div>
                                        )}
                                        
                                        {/* Debug info สำหรับ greenhouse mode */}
                                        {projectMode === 'greenhouse' && (
                                            <div className="text-xs text-gray-400 mt-2">
                                                Debug: Branch={branchCalc?.headLoss?.toFixed(3) || '0'} + Main={mainCalc?.headLoss?.toFixed(3) || '0'} = {totalHeadLoss.toFixed(3)}
                                            </div>
                                        )}

                                        {/* Warning Messages สำหรับ greenhouse mode */}
                                        {projectMode === 'greenhouse' && totalHeadLoss > head20Percent && (
                                            <div className="rounded border border-red-700 bg-red-900 p-2">
                                                <span className="text-xs text-red-300">
                                                    ⚠️ <strong>คำเตือน:</strong> Head Loss รวมทั้งระบบ ({totalHeadLoss.toFixed(3)} ม.) เกินขีดจำกัด 20% Head หัวฉีด ({head20Percent.toFixed(3)} ม.) อยู่ {(totalHeadLoss - head20Percent).toFixed(3)} ม.
                                                </span>
                                            </div>
                                        )}
                                        
                                        {/* Warning Messages สำหรับ mode อื่นๆ */}
                                        {projectMode !== 'greenhouse' && mainCalc && mainCalc.headLoss > head20Percent && (
                                            <div className="rounded border border-red-700 bg-red-900 p-2">
                                                <span className="text-xs text-red-300">
                                                    ⚠️ <strong>คำเตือน:</strong> ท่อเมนหลักมี Head
                                                    Loss เกินขีดจำกัด{' '}
                                                    {(mainCalc.headLoss - (head20Percent || 0)).toFixed(3)}{' '}
                                                    ม.
                                                </span>
                                            </div>
                                        )}

                                        {projectMode !== 'greenhouse' && branchCalc &&
                                            branchSubMainCombined > head20Percent && (
                                                <div className="rounded border border-red-700 bg-red-900 p-2">
                                                    <span className="text-xs text-red-300">
                                                        ⚠️ <strong>คำเตือน:</strong> ท่อย่อย + ท่อเมนรอง มี Head Loss เกินขีดจำกัด{' '}
                                                        {(
                                                            branchSubMainCombined - head20Percent
                                                        ).toFixed(3)}{' '}
                                                        ม.
                                                    </span>
                                                </div>
                                            )}

                                        {/* Success Message */}
                                        {projectMode === 'greenhouse' && totalHeadLoss <= head20Percent && (
                                            <div className="rounded border border-green-700 bg-green-900 p-2">
                                                <span className="text-xs text-green-300">
                                                    ✅ <strong>ปกติ:</strong> Head Loss รวมทั้งระบบ ({totalHeadLoss.toFixed(3)} ม.) อยู่ในขีดจำกัดที่ยอมรับได้
                                                </span>
                                            </div>
                                        )}
                                        
                                        {projectMode !== 'greenhouse' && (!mainCalc || mainCalc.headLoss <= head20Percent) &&
                                            (!branchCalc || branchSubMainCombined <= head20Percent) && (
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
