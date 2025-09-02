/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// resources\js\pages\components\PipeSelector.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { CalculationResults, PipeType, IrrigationInput, AnalyzedPipe } from '../types/interfaces';
import { calculatePipeRolls } from '../utils/calculations';
import { useLanguage } from '@/contexts/LanguageContext';
import SearchableDropdown from './SearchableDropdown';
import {
    BestPipeInfo,
    calculateNewHeadLoss,
    calculateSprinklerPressure,
    validatePipeSelection,
    selectBestPipe,
    createCalculationSummary,
    PipeCalculationResult,
    SprinklerPressureInfo
} from '../../utils/horticulturePipeCalculations';

interface PipeSelectorProps {
    pipeType: PipeType;
    results: CalculationResults;
    input: IrrigationInput;
    selectedPipe?: any;
    onPipeChange: (pipe: any) => void;
    horticultureSystemData?: any;
    activeZoneId?: string;
    selectedSprinkler?: any;
    projectMode?: 'horticulture' | 'garden' | 'field-crop' | 'greenhouse';
}

const PipeSelector: React.FC<PipeSelectorProps> = ({
    pipeType,
    results,
    input,
    selectedPipe,
    onPipeChange,
    horticultureSystemData,
    activeZoneId,
    selectedSprinkler,
    projectMode = 'horticulture',
}) => {
    const { t } = useLanguage();
    
    // States for new pipe selection method
    const [selectedPipeType, setSelectedPipeType] = useState<string>('PE');
    const [availablePipes, setAvailablePipes] = useState<any[]>([]);
    const [calculation, setCalculation] = useState<PipeCalculationResult | null>(null);
    const [sprinklerPressure, setSprinklerPressure] = useState<SprinklerPressureInfo | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);

    // Get current zone's best pipe info
    const currentZoneBestPipe = useMemo(() => {
        if (!horticultureSystemData || !activeZoneId) return null;
        
        const currentZone = horticultureSystemData.zones?.find((zone: any) => zone.id === activeZoneId);
        if (!currentZone?.bestPipes) return null;

        switch (pipeType) {
            case 'branch':
                return currentZone.bestPipes.branch;
            case 'secondary':
                return currentZone.bestPipes.subMain;
            case 'main':
                return currentZone.bestPipes.main;
            case 'emitter':
                // สำหรับ emitter pipe ใช้ข้อมูลพิเศษ
                if (horticultureSystemData?.sprinklerConfig) {
                    // หาความยาวท่อ emitter ที่ยาวที่สุดจาก localStorage
                    const currentProject = localStorage.getItem('currentHorticultureProject');
                    let longestEmitterLength = 10; // default
                    
                    if (currentProject) {
                        try {
                            const projectData = JSON.parse(currentProject);
                            if (projectData.lateralPipes && projectData.lateralPipes.length > 0) {
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
                    
                    return {
                        id: 'emitter-pipe',
                        length: longestEmitterLength,
                        count: 1, // จำนวนทางออก = 1
                        waterFlowRate: horticultureSystemData.sprinklerConfig.flowRatePerPlant, // ใช้ Q หัวฉีด
                        details: { type: 'emitter' }
                    };
                }
                return currentZone.bestPipes.branch; // fallback
            default:
                return null;
        }
    }, [horticultureSystemData, activeZoneId, pipeType]);

    // Calculate sprinkler pressure info
    useEffect(() => {
        // ใช้ข้อมูลจาก horticultureSystemData.sprinklerConfig.pressureBar แทน selectedSprinkler
        if (horticultureSystemData?.sprinklerConfig?.pressureBar) {
            const pressureBar = horticultureSystemData.sprinklerConfig.pressureBar;
            const pressureInfo = {
                pressureBar: pressureBar,
                headM: pressureBar * 10, // แปลงจากบาร์เป็นเมตร (1 บาร์ = 10 ม.)
                head20PercentM: (pressureBar * 10) * 0.2 // 20% ของ head
            };
            setSprinklerPressure(pressureInfo);
        } else if (selectedSprinkler) {
            // fallback ถ้าไม่มี horticultureSystemData
            const pressureInfo = calculateSprinklerPressure(selectedSprinkler);
            setSprinklerPressure(pressureInfo);
        }
    }, [horticultureSystemData, selectedSprinkler]);

    // Load available pipes based on selected pipe type and pressure class
    useEffect(() => {
        const loadPipes = async () => {
            try {
                // โหลดข้อมูลท่อจาก API
                const endpoints = [
                    '/api/equipments/by-category/pipe',
                    '/api/equipments/category/pipe',
                    '/api/equipments?category=pipe',
                ];
                
                let pipes: any[] = [];
                for (const endpoint of endpoints) {
                    try {
                        const response = await fetch(endpoint);
                        if (response.ok) {
                            pipes = await response.json();
                            break;
                        }
                    } catch (error) {
                        continue;
                    }
                }

                // กรองท่อตามประเภทที่เลือก
                let filteredPipes = pipes.filter(pipe => {
                    // ตรวจสอบประเภทท่อ
                    const pipeTypeMatch = pipe.pipeType?.toLowerCase() === selectedPipeType.toLowerCase() ||
                        pipe.type?.toLowerCase() === selectedPipeType.toLowerCase();
                    
                    return pipeTypeMatch;
                });

                // กรองตามขนาดท่อสำหรับแต่ละประเภท
                if (pipeType === 'branch' || pipeType === 'emitter') {
                    // ท่อย่อยและท่อย่อยแยก: ขนาด <= 32mm
                    filteredPipes = filteredPipes.filter(pipe => 
                        pipe.sizeMM <= 32 || (pipe.sizeInch && parseFloat(pipe.sizeInch) <= 1)
                    );
                }

                // กรองตามแรงดันหัวฉีด
                if (sprinklerPressure) {
                    filteredPipes = filteredPipes.filter(pipe => 
                        pipe.pn >= sprinklerPressure.pressureBar
                    );
                }

                setAvailablePipes(filteredPipes);
            } catch (error) {
                console.error('Error loading pipes:', error);
                setAvailablePipes([]);
            }
        };

        loadPipes();
    }, [selectedPipeType, pipeType, sprinklerPressure]);

    // Auto-select best pipe when available pipes change
    useEffect(() => {
        if (availablePipes.length > 0 && currentZoneBestPipe && sprinklerPressure) {
            const bestPipe = selectBestPipe(
                availablePipes,
                pipeType,
                sprinklerPressure,
                currentZoneBestPipe,
                {} // selected pipes in zone - TODO: implement if needed
            );
            
            if (bestPipe && (!selectedPipe || selectedPipe.id !== bestPipe.id)) {
                onPipeChange(bestPipe);
            }
        }
    }, [availablePipes, currentZoneBestPipe, sprinklerPressure, pipeType]);

    // Calculate head loss when pipe is selected
    useEffect(() => {
        if (selectedPipe && currentZoneBestPipe) {
            const actualPressureClass = selectedPipeType === 'PE' 
                ? `PN${selectedPipe.pn}` 
                : `Class${selectedPipe.pn}`;
            
            const calc = calculateNewHeadLoss(
                currentZoneBestPipe,
                selectedPipeType,
                actualPressureClass,
                `${selectedPipe.sizeMM}mm`
            );
            setCalculation(calc);

            // Check for warnings
            const newWarnings: string[] = [];
            if (calc && sprinklerPressure) {
                if (pipeType === 'main' && calc.headLoss > sprinklerPressure.head20PercentM) {
                    newWarnings.push(
                        `⚠️ ท่อเมนหลัก: ${calc.headLoss.toFixed(3)}ม. มากกว่า 20% Head หัวฉีด (${sprinklerPressure.head20PercentM.toFixed(1)}ม.)`
                    );
                }
                // Add more warning logic for branch + secondary if needed
            }
            setWarnings(newWarnings);
        }
    }, [selectedPipe, currentZoneBestPipe, selectedPipeType, pipeType, sprinklerPressure]);

    const getPipeTypeName = (pipeType: PipeType) => {
        switch (pipeType) {
            case 'branch':
                return t('ท่อย่อย');
            case 'secondary':
                return t('ท่อเมนรอง');
            case 'main':
                return t('ท่อเมนหลัก');
            case 'emitter':
                return t('ท่อย่อยแยก');
            default:
                return '';
        }
    };

    const pipeTypeOptions = [
        { value: 'PE', label: 'PE' },
        { value: 'PVC', label: 'PVC' }
    ];

    // ไม่ต้องมี pressureClassOptions อีกต่อไป เนื่องจากเลือกแค่ประเภทท่อ
    // const pressureClassOptions = ... (removed)

    const pipeOptions = availablePipes.map(pipe => {
        // ใช้แรงดันของท่อจริงๆ แทน selectedPressureClass
        const actualPressureClass = selectedPipeType === 'PE' 
            ? `PN${pipe.pn}` 
            : `Class${pipe.pn}`;
        
        const calc = currentZoneBestPipe ? calculateNewHeadLoss(
            currentZoneBestPipe,
            selectedPipeType,
            actualPressureClass,
            `${pipe.sizeMM}mm`
        ) : null;

        const hasWarning = calc && sprinklerPressure ? calc.headLoss > sprinklerPressure.head20PercentM : false;
        
        return {
            value: pipe.id,
            label: `${pipe.name || pipe.productCode} - ${pipe.sizeMM}mm (PN${pipe.pn})`,
            image: pipe.image,
            productCode: pipe.productCode,
            name: pipe.name,
            brand: pipe.brand,
            price: pipe.price,
            unit: 'บาท/ม้วน',
            // Add calculation info
            headLoss: calc?.headLoss || 0,
            calculationDetails: calc ? 
                `X=${calc.pressureLoss} | ความยาว=${currentZoneBestPipe.length.toFixed(1)}ม. | Y=${calc.correctionFactor}` 
                : '',
            hasWarning: hasWarning
        };
    });

    // Only show for horticulture mode
    if (projectMode !== 'horticulture') {
        return (
            <div className="flex items-center justify-center rounded-lg bg-gray-800 p-8">
                <div className="text-center text-gray-500">
                    <div className="mb-2 text-4xl">🚧</div>
                    <p>ระบบใหม่สำหรับ Horticulture เท่านั้น</p>
                </div>
            </div>
        );
    }

    // Don't show if no best pipe data
    if (!currentZoneBestPipe) {
        return (
            <div className="flex items-center justify-center rounded-lg bg-gray-800 p-8">
                <div className="text-center text-gray-500">
                    <div className="mb-2 text-4xl">📊</div>
                    <p>ไม่พบข้อมูลท่อที่ต้องการน้ำมากที่สุด</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-lg bg-gray-800 p-6">
            <div className="mb-4">
                <h3 className="text-xl font-bold text-white mb-2">
                    {getPipeTypeName(pipeType)}
                </h3>
                
                {/* แสดงข้อมูลท่อที่ต้องการน้ำมากที่สุด */}
                <div className="mb-4 rounded bg-orange-900 p-3">
                    <h4 className="text-orange-300 font-medium mb-2">
                        🔥 ท่อที่ต้องการน้ำมากที่สุด:
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-orange-200">ความยาว:</span>
                            <p className="font-bold text-white">{currentZoneBestPipe.length.toFixed(1)} ม.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-orange-200">ทางออก:</span>
                            <p className="font-bold text-white">{currentZoneBestPipe.count}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-orange-200">ใช้น้ำ:</span>
                            <p className="font-bold text-white">{currentZoneBestPipe.waterFlowRate.toFixed(1)} L/min</p>
                        </div>
                    </div>
                </div>

                {/* เลือกประเภทท่อ */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        ประเภทท่อ:
                    </label>
                    <SearchableDropdown
                        options={pipeTypeOptions}
                        value={selectedPipeType}
                        onChange={(value) => setSelectedPipeType(value.toString())}
                        placeholder="เลือกประเภทท่อ"
                    />
                </div>

                {/* เลือกท่อ */}
                {pipeOptions.length > 0 ? (
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            เลือกท่อ:
                        </label>
                        <SearchableDropdown
                            options={pipeOptions}
                            value={selectedPipe?.id || ''}
                            onChange={(value) => {
                                const pipe = availablePipes.find(p => p.id === value);
                                if (pipe) onPipeChange(pipe);
                            }}
                            placeholder="เลือกท่อ"
                        />
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-4">
                        <p>ไม่พบท่อที่เหมาะสม</p>
                        <p className="text-sm">กรุณาเปลี่ยนประเภทท่อ หรือไม่มีท่อที่มีแรงดันมากกว่าหัวฉีด</p>
                    </div>
                )}

                {/* แสดงการคำนวณ */}
                {calculation && (
                    <div className="mt-4 bg-green-900 rounded p-3">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-green-300 font-medium">📊 การคำนวณ Head Loss</h4>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-white">
                                    {calculation.headLoss.toFixed(3)} ม.
                                </span>
                            </div>
                        </div>
                        <details className="text-green-200 text-xs">
                            <summary className="cursor-pointer hover:text-green-100">
                                รายละเอียดการคำนวณ
                            </summary>
                            <pre className="mt-2 whitespace-pre-wrap bg-green-800 p-2 rounded">
                                {calculation.calculationDetails}
                            </pre>
                        </details>
                    </div>
                )}

                {/* แสดง warnings */}
                {warnings.length > 0 && (
                    <div className="mt-4 bg-red-900 rounded p-3">
                        <h4 className="text-red-300 font-medium mb-2">⚠️ คำเตือน</h4>
                        {warnings.map((warning, index) => (
                            <p key={index} className="text-red-200 text-sm">{warning}</p>
                        ))}
                    </div>
                )}

                {/* แสดงข้อมูลแรงดันหัวฉีด1 */}
                {/* {sprinklerPressure && (
                    <div className="mt-4 bg-blue-900 rounded p-3">
                        <h4 className="text-blue-300 font-medium mb-2">💧 ข้อมูลแรงดันหัวฉีด</h4>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-blue-200">แรงดัน:</span>
                                <p className="font-bold text-white">{sprinklerPressure.pressureBar.toFixed(1)} บาร์</p>
                            </div>
                            <div>
                                <span className="text-blue-200">Head:</span>
                                <p className="font-bold text-white">{sprinklerPressure.headM.toFixed(1)} ม.</p>
                            </div>
                            <div>
                                <span className="text-blue-200">20% Head:</span>
                                <p className="font-bold text-white">{sprinklerPressure.head20PercentM.toFixed(1)} ม.</p>
                            </div>
                            <div>
                                <span className="text-blue-200">สถานะ:</span>
                                <p className={`font-bold ${warnings.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {warnings.length > 0 ? 'เกินขีดจำกัด' : 'ปกติ'}
                                </p>
                            </div>
                        </div>
                    </div>
                )} */}

                {/* แสดงข้อมูลการเปรียบเทียบ Head */}
                {/* {sprinklerPressure && (
                    <div className="mt-4 bg-purple-900 rounded p-3">
                        <h4 className="text-purple-300 font-medium mb-2">📊 การเปรียบเทียบ Head</h4>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-purple-200">แรงดันหัวฉีด (บาร์):</span>
                                <span className="font-bold text-white">{sprinklerPressure.pressureBar.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-purple-200">แปลงเป็น Head (ม.):</span>
                                <span className="font-bold text-white">{sprinklerPressure.headM.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-purple-200">20% ของ Head หัวฉีด:</span>
                                <span className="font-bold text-white">{sprinklerPressure.head20PercentM.toFixed(1)} ม.</span>
                            </div>
                            {calculation && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-purple-200">ท่อ{getPipeTypeName(pipeType)} (คำนวณ):</span>
                                        <span className={`font-bold ${calculation.headLoss > sprinklerPressure.head20PercentM ? 'text-red-400' : 'text-green-400'}`}>
                                            {calculation.headLoss.toFixed(3)} ม.
                                        </span>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-purple-700">
                                        <div className="flex justify-between">
                                            <span className="text-purple-200">สรุป:</span>
                                            <span className={`font-bold ${calculation.headLoss > sprinklerPressure.head20PercentM ? 'text-red-400' : 'text-green-400'}`}>
                                                {calculation.headLoss > sprinklerPressure.head20PercentM 
                                                    ? `เกิน ${(calculation.headLoss - sprinklerPressure.head20PercentM).toFixed(3)} ม.`
                                                    : `เหลือ ${(sprinklerPressure.head20PercentM - calculation.headLoss).toFixed(3)} ม.`}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )} */}

                {/* แสดงข้อมูลท่อที่เลือก */}
                {selectedPipe && (
                    <div className="mt-4 bg-gray-700 rounded p-4">
                        <h4 className="text-gray-300 font-medium mb-3">
                            🔧 ข้อมูลท่อที่เลือก
                        </h4>
                        <div className="flex items-start space-x-4">
                            {/* รูปภาพท่อ */}
                            {selectedPipe.image && (
                                <img 
                                    src={selectedPipe.image} 
                                    alt={selectedPipe.name || selectedPipe.productCode}
                                    className="w-20 h-20 object-contain rounded border border-gray-600"
                                />
                            )}
                            
                            {/* ข้อมูลท่อ */}
                            <div className="flex-1">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-gray-400">ชื่อ:</span>
                                        <p className="font-medium text-white">{selectedPipe.name || selectedPipe.productCode}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">รหัสสินค้า:</span>
                                        <p className="font-medium text-white">{selectedPipe.productCode}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">ขนาด:</span>
                                        <p className="font-medium text-white">{selectedPipe.sizeMM}mm {selectedPipe.sizeInch && `(${selectedPipe.sizeInch}")`}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">แรงดัน:</span>
                                        <p className="font-medium text-white">PN{selectedPipe.pn || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">ความยาว/ม้วน:</span>
                                        <p className="font-medium text-white">{selectedPipe.lengthM}ม.</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">ราคา:</span>
                                        <p className="font-medium text-green-400">{selectedPipe.price?.toLocaleString()} บาท/ม้วน</p>
                                    </div>
                                </div>
                                
                                {/* แสดงข้อมูลเพิ่มเติมถ้ามี */}
                                {selectedPipe.brand && (
                                    <div className="mt-2 text-xs text-gray-400">
                                        ยี่ห้อ: {selectedPipe.brand}
                                    </div>
                                )}
                                {selectedPipe.description && (
                                    <div className="mt-1 text-xs text-gray-400">
                                        {selectedPipe.description}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PipeSelector;
