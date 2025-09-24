/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// resources\js\pages\components\PipeSelector.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    SprinklerPressureInfo,
    selectBestPipeByHeadLoss,
    SelectedPipeSizes,
} from '../../utils/horticulturePipeCalculations';
import { getSelectedPipeDataInfo, getPipeDataWithSmartSize } from './PipeFrictionLoss';
import { getEnhancedFieldCropData, FieldCropData } from '../../utils/fieldCropData';

interface PipeSelectorProps {
    pipeType: PipeType;
    results: CalculationResults;
    input: IrrigationInput;
    selectedPipe?: any;
    onPipeChange: (pipe: any) => void;
    horticultureSystemData?: any;
    gardenSystemData?: any; // เพิ่มสำหรับ garden mode
    greenhouseSystemData?: any; // เพิ่มสำหรับ greenhouse mode
    fieldCropData?: any; // เพิ่มสำหรับ field-crop mode
    activeZoneId?: string;
    selectedSprinkler?: any;
    projectMode?: 'horticulture' | 'garden' | 'field-crop' | 'greenhouse';
    selectedPipeSizes?: SelectedPipeSizes; // ข้อมูลขนาดท่อที่เลือกแล้ว
}

const PipeSelector: React.FC<PipeSelectorProps> = ({
    pipeType,
    results,
    input,
    selectedPipe,
    onPipeChange,
    horticultureSystemData,
    gardenSystemData,
    greenhouseSystemData,
    fieldCropData,
    activeZoneId,
    selectedSprinkler,
    projectMode = 'horticulture',
    selectedPipeSizes = {},
}) => {
    const { t } = useLanguage();

    // States for new pipe selection method
    const [selectedPipeType, setSelectedPipeType] = useState<string>('PE');
    const [availablePipes, setAvailablePipes] = useState<any[]>([]);
    const [calculation, setCalculation] = useState<PipeCalculationResult | null>(null);
    const [sprinklerPressure, setSprinklerPressure] = useState<SprinklerPressureInfo | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [isManuallySelected, setIsManuallySelected] = useState<boolean>(false); // Track if user manually selected a pipe
    const [gardenZoneStats, setGardenZoneStats] = useState<any>(null);

    // Get current zone's best pipe info
    const currentZoneBestPipe = useMemo(() => {
        // สำหรับ garden mode ใช้ gardenSystemData
        if (projectMode === 'garden' && gardenSystemData && activeZoneId) {
            const currentZone = gardenSystemData.zones?.find(
                (zone: any) => zone.id === activeZoneId
            );
            if (!currentZone?.bestPipes) return null;

            switch (pipeType) {
                case 'branch':
                    return currentZone.bestPipes.branch;
                case 'secondary':
                    return currentZone.bestPipes.subMain;
                case 'main':
                    return currentZone.bestPipes.main;
                case 'emitter':
                    // สำหรับ garden mode ใช้ข้อมูลจาก gardenSystemData
                    if (gardenSystemData?.sprinklerConfig) {
                        return {
                            id: 'emitter-pipe',
                            length: 10, // default emitter length สำหรับ garden
                            count: 1, // จำนวนทางออก = 1
                            waterFlowRate: gardenSystemData.sprinklerConfig.flowRatePerPlant,
                            details: { type: 'emitter' },
                        };
                    }
                    return currentZone.bestPipes.branch; // fallback
                default:
                    return null;
            }
        }

        // สำหรับ greenhouse mode ใช้ greenhouseSystemData
        if (projectMode === 'field-crop') {
            // Try to get field-crop data from props first, then from localStorage
            const fcData = fieldCropData || getEnhancedFieldCropData();
            if (fcData) {
                // สร้างข้อมูล pipe สำหรับ field-crop
                const createFieldCropPipeInfo = (type: string, length: number, flowRate: number) => ({
                    id: `${type}-pipe-field-crop`,
                    length: length,
                    count: 1,
                    waterFlowRate: flowRate,
                    details: { type: type },
                });

                switch (pipeType) {
                    case 'branch':
                        return createFieldCropPipeInfo(
                            'branch',
                            fcData.pipes.stats.lateral.longest || 50,
                            fcData.summary.totalWaterRequirementPerDay / Math.max(fcData.summary.totalPlantingPoints || 1, 1) / 60 // Convert to LPM
                        );
                    case 'secondary':
                        return createFieldCropPipeInfo(
                            'secondary',
                            fcData.pipes.stats.submain.longest || 100,
                            fcData.summary.totalWaterRequirementPerDay / 60 // Convert to LPM
                        );
                    case 'main':
                        return createFieldCropPipeInfo(
                            'main',
                            fcData.pipes.stats.main.longest || 200,
                            fcData.summary.totalWaterRequirementPerDay / 60 // Convert to LPM
                        );
                    case 'emitter':
                        return createFieldCropPipeInfo(
                            'emitter',
                            fcData.pipes.stats.lateral.averageLength || 20,
                            0.24 // Default drip tape flow rate
                        );
                    default:
                        return null;
                }
            }
        }

        if (projectMode === 'greenhouse' && greenhouseSystemData && activeZoneId) {
            const currentPlot = greenhouseSystemData.summary.plotStats.find(
                (plot: any) => plot.plotId === activeZoneId
            );
            if (!currentPlot) return null;

            // สร้างข้อมูล pipe สำหรับ greenhouse
            const createGreenhousePipeInfo = (type: string, length: number, flowRate: number) => ({
                id: `${type}-pipe-${activeZoneId}`,
                length: length,
                count: 1,
                waterFlowRate: flowRate,
                details: { type: type },
            });

            switch (pipeType) {
                case 'branch': {
                    // ท่อย่อย - เชื่อมจากท่อเมนไปยังหัวฉีด
                    const branchLength = currentPlot.pipeStats.sub.longest || currentPlot.pipeStats.drip.longest || 30;
                    const branchFlowRate = currentPlot.production?.waterCalculation 
                        ? (currentPlot.production.waterCalculation.dailyWaterNeed?.optimal || 0) / (2 * 30) // 2 ครั้งต่อวัน, 30 นาทีต่อครั้ง
                        : currentPlot.production.waterRequirementPerIrrigation / 30; // fallback
                    
                    return createGreenhousePipeInfo(
                        'branch',
                        branchLength,
                        Math.max(branchFlowRate, 2.0) // ขั้นต่ำ 2 LPM
                    );
                }
                case 'secondary': {
                    // Greenhouse ไม่มีท่อเมนรอง - return null
                    return null;
                }
                case 'main': {
                    // ท่อเมนหลัก - จากแหล่งน้ำไปยังโรงเรือน
                    const mainLength = currentPlot.pipeStats.main.longest || 100;
                    const mainFlowRate = currentPlot.production?.waterCalculation 
                        ? (currentPlot.production.waterCalculation.dailyWaterNeed?.optimal || 0) / (2 * 30)
                        : currentPlot.production.waterRequirementPerIrrigation / 30;
                    
                    return createGreenhousePipeInfo(
                        'main',
                        mainLength,
                        Math.max(mainFlowRate, 10.0) // ขั้นต่ำ 10 LPM
                    );
                }
                case 'emitter': {
                    // Greenhouse ไม่มีท่อย่อยแยก (emitter pipe)
                    return null;
                }
                default:
                    return null;
            }
        }

        // สำหรับ horticulture mode ใช้ horticultureSystemData (เดิม)
        if (!horticultureSystemData || !activeZoneId) return null;

        const currentZone = horticultureSystemData.zones?.find(
            (zone: any) => zone.id === activeZoneId
        );
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
                                    if (
                                        lateralPipe.emitterLines &&
                                        lateralPipe.emitterLines.length > 0
                                    ) {
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
                            // Error parsing project data for emitter length
                        }
                    }

                    return {
                        id: 'emitter-pipe',
                        length: longestEmitterLength,
                        count: 1, // จำนวนทางออก = 1
                        waterFlowRate: horticultureSystemData.sprinklerConfig.flowRatePerPlant, // ใช้ Q หัวฉีด
                        details: { type: 'emitter' },
                    };
                }
                return currentZone.bestPipes.branch; // fallback
            default:
                return null;
        }
    }, [projectMode, horticultureSystemData, gardenSystemData, greenhouseSystemData, fieldCropData, activeZoneId, pipeType]);

    // Calculate sprinkler pressure info
    useEffect(() => {
        // สำหรับ garden mode ใช้ gardenSystemData
        if (projectMode === 'garden') {
            if (gardenSystemData?.sprinklerConfig?.pressureBar) {
                const pressureBar = gardenSystemData.sprinklerConfig.pressureBar;
                const pressureInfo = {
                    pressureBar: pressureBar,
                    headM: pressureBar * 10, // แปลงจากบาร์เป็นเมตร (1 บาร์ = 10 ม.)
                    head20PercentM: pressureBar * 10 * 0.2, // 20% ของ head
                };
                setSprinklerPressure(pressureInfo);
            } else {
                // ใช้ค่า default สำหรับ garden mode
                const pressureInfo = {
                    pressureBar: 2.5,
                    headM: 25,
                    head20PercentM: 5,
                };
                setSprinklerPressure(pressureInfo);
            }
        }
        // สำหรับ greenhouse mode ใช้ greenhouseSystemData
        else if (projectMode === 'greenhouse') {
            if (greenhouseSystemData && activeZoneId) {
                const currentPlot = greenhouseSystemData.summary.plotStats.find((p: any) => p.plotId === activeZoneId);
                
                // ใช้ pressure จาก irrigation elements หรือค่า default
                let pressureBar = 2.0; // ค่า default สำหรับ greenhouse (ต่ำกว่าสวนบ้าน)
                
                // ตรวจสอบ irrigation method จาก greenhouse data
                const irrigationMethod = greenhouseSystemData.projectInfo?.irrigationMethod || 'mini-sprinkler';
                
                if (irrigationMethod === 'drip') {
                    pressureBar = 1.5; // ความดันต่ำสำหรับระบบหยด
                } else if (irrigationMethod === 'mini-sprinkler') {
                    pressureBar = 2.0; // ความดันปานกลางสำหรับมินิสปริงเกอร์
                } else if (irrigationMethod === 'mixed') {
                    pressureBar = 2.2; // ความดันผสมสำหรับระบบผสม
                }
                
                // ตรวจสอบจาก irrigation elements
                if (greenhouseSystemData.rawData?.irrigationElements) {
                    const sprinklerElements = greenhouseSystemData.rawData.irrigationElements.filter(
                        (el: any) => el.type === 'sprinkler'
                    );
                    if (sprinklerElements.length > 0 && sprinklerElements[0].pressureBar) {
                        pressureBar = sprinklerElements[0].pressureBar;
                    }
                }
                
                const pressureInfo = {
                    pressureBar: pressureBar,
                    headM: pressureBar * 10, // แปลงจากบาร์เป็นเมตร
                    head20PercentM: pressureBar * 10 * 0.2, // 20% ของ head
                };
                setSprinklerPressure(pressureInfo);
            } else {
                // ใช้ค่า default สำหรับ greenhouse
                const pressureInfo = {
                    pressureBar: 2.0, // ลดลงจาก 2.5 เพื่อให้เหมาะกับโรงเรือน
                    headM: 20,
                    head20PercentM: 4,
                };
                setSprinklerPressure(pressureInfo);
            }
        }
        // สำหรับ field-crop mode
        else if (projectMode === 'field-crop') {
            if (fieldCropData) {
                const irrigationByType = fieldCropData.irrigation?.byType || {};
                let pressureBar = 2.5; // Default pressure for sprinklers
                
                if (irrigationByType.dripTape > 0) {
                    pressureBar = 1.0; // Lower pressure for drip tape
                } else if (irrigationByType.pivot > 0) {
                    pressureBar = 3.0; // Higher pressure for pivot systems
                } else if (irrigationByType.waterJetTape > 0) {
                    pressureBar = 1.5; // Medium pressure for water jet tape
                }
                
                const pressureInfo = {
                    pressureBar: pressureBar,
                    headM: pressureBar * 10,
                    head20PercentM: pressureBar * 10 * 0.2,
                };
                setSprinklerPressure(pressureInfo);
            } else {
                // ใช้ค่า default สำหรับ field-crop
                const pressureInfo = {
                    pressureBar: 2.5,
                    headM: 25,
                    head20PercentM: 5,
                };
                setSprinklerPressure(pressureInfo);
            }
        }
        // สำหรับ horticulture mode ใช้ horticultureSystemData (เดิม)
        else if (horticultureSystemData?.sprinklerConfig?.pressureBar) {
            const pressureBar = horticultureSystemData.sprinklerConfig.pressureBar;
            const pressureInfo = {
                pressureBar: pressureBar,
                headM: pressureBar * 10, // แปลงจากบาร์เป็นเมตร (1 บาร์ = 10 ม.)
                head20PercentM: pressureBar * 10 * 0.2, // 20% ของ head
            };
            setSprinklerPressure(pressureInfo);
        } else if (selectedSprinkler) {
            // fallback ถ้าไม่มี systemData
            const pressureInfo = calculateSprinklerPressure(selectedSprinkler);
            setSprinklerPressure(pressureInfo);
        }
    }, [projectMode, horticultureSystemData, gardenSystemData, greenhouseSystemData, fieldCropData, activeZoneId, selectedSprinkler]);

    // Garden mode: ดึงข้อมูล zone statistics
    useEffect(() => {
        if (projectMode === 'garden' && activeZoneId) {
            try {
                const gardenStatsStr = localStorage.getItem('garden_statistics');
                if (gardenStatsStr) {
                    const gardenStats = JSON.parse(gardenStatsStr);
                    if (gardenStats.zones) {
                        const currentZoneStats = gardenStats.zones.find(
                            (zone: any) => zone.zoneId === activeZoneId
                        );
                        setGardenZoneStats(currentZoneStats);
                    }
                }
            } catch (error) {
                console.error('Error loading garden zone statistics:', error);
                setGardenZoneStats(null);
            }
        }
    }, [projectMode, activeZoneId]);

    // Get pipe type name function
    const getPipeTypeName = useCallback(
        (pipeType: PipeType) => {
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
        },
        [t]
    );

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
                let filteredPipes = pipes.filter((pipe) => {
                    // ตรวจสอบประเภทท่อ
                    const pipeTypeMatch =
                        pipe.pipeType?.toLowerCase() === selectedPipeType.toLowerCase() ||
                        pipe.type?.toLowerCase() === selectedPipeType.toLowerCase();

                    return pipeTypeMatch;
                });
                

                // กรองตามขนาดท่อสำหรับแต่ละประเภท
                if (pipeType === 'branch' || pipeType === 'emitter') {
                    // ท่อย่อยและท่อย่อยแยก: ขนาด <= 32mm
                    filteredPipes = filteredPipes.filter(
                        (pipe) =>
                            pipe.sizeMM <= 32 || (pipe.sizeInch && parseFloat(pipe.sizeInch) <= 1)
                    );
                    
                }

                // กรองตามแรงดันหัวฉีด
                if (sprinklerPressure) {
                    filteredPipes = filteredPipes.filter(
                        (pipe) => pipe.pn >= sprinklerPressure.pressureBar
                    );
                    
                }

                
                setAvailablePipes(filteredPipes);
                // Reset manual selection when pipe type changes to allow auto-selection
                setIsManuallySelected(false);
            } catch (error) {
                console.error('Error loading pipes:', error);
                // For field-crop mode, provide some fallback pipe data
                if (projectMode === 'field-crop') {
                    const fallbackPipes = [
                        // PE pipes
                        { id: 1, name: 'PE PN2.5 25mm', productCode: 'PE25', pipeType: 'PE', type: 'PE', sizeMM: 25, pn: 2.5, lengthM: 100, price: 1500, image: null, brand: 'Generic' },
                        { id: 2, name: 'PE PN2.5 32mm', productCode: 'PE32', pipeType: 'PE', type: 'PE', sizeMM: 32, pn: 2.5, lengthM: 100, price: 2000, image: null, brand: 'Generic' },
                        { id: 3, name: 'PE PN4 50mm', productCode: 'PE50', pipeType: 'PE', type: 'PE', sizeMM: 50, pn: 4, lengthM: 100, price: 3000, image: null, brand: 'Generic' },
                        { id: 4, name: 'PE PN4 63mm', productCode: 'PE63', pipeType: 'PE', type: 'PE', sizeMM: 63, pn: 4, lengthM: 100, price: 4000, image: null, brand: 'Generic' },
                        // PVC pipes
                        { id: 5, name: 'PVC Class5 25mm', productCode: 'PVC25', pipeType: 'PVC', type: 'PVC', sizeMM: 25, pn: 5, lengthM: 100, price: 1200, image: null, brand: 'Generic' },
                        { id: 6, name: 'PVC Class5 32mm', productCode: 'PVC32', pipeType: 'PVC', type: 'PVC', sizeMM: 32, pn: 5, lengthM: 100, price: 1800, image: null, brand: 'Generic' },
                        { id: 7, name: 'PVC Class5 50mm', productCode: 'PVC50', pipeType: 'PVC', type: 'PVC', sizeMM: 50, pn: 5, lengthM: 100, price: 2500, image: null, brand: 'Generic' },
                        { id: 8, name: 'PVC Class5 63mm', productCode: 'PVC63', pipeType: 'PVC', type: 'PVC', sizeMM: 63, pn: 5, lengthM: 100, price: 3500, image: null, brand: 'Generic' },
                    ];
                    
                    // Filter fallback pipes based on selected pipe type
                    const filteredFallbackPipes = fallbackPipes.filter((pipe) => {
                        const pipeTypeMatch = pipe.pipeType?.toLowerCase() === selectedPipeType.toLowerCase() ||
                                            pipe.type?.toLowerCase() === selectedPipeType.toLowerCase();
                        return pipeTypeMatch;
                    });
                    
                    // Filter by size for branch/emitter
                    let sizeFilteredPipes = filteredFallbackPipes;
                    if (pipeType === 'branch' || pipeType === 'emitter') {
                        sizeFilteredPipes = filteredFallbackPipes.filter(
                            (pipe) => pipe.sizeMM <= 32
                        );
                    }
                    
                    // Filter by pressure
                    let pressureFilteredPipes = sizeFilteredPipes;
                    if (sprinklerPressure) {
                        pressureFilteredPipes = sizeFilteredPipes.filter(
                            (pipe) => pipe.pn >= sprinklerPressure.pressureBar
                        );
                    }
                    
                    setAvailablePipes(pressureFilteredPipes);
                } else {
                    setAvailablePipes([]);
                }
            }
        };

        loadPipes();
    }, [projectMode, selectedPipeType, pipeType, sprinklerPressure]);

    // Filter pipes based on hierarchy (emitter < branch < secondary < main)
    const getFilteredPipesByHierarchy = useCallback(
        (pipes: any[]): any[] => {
            if (!selectedPipeSizes || Object.keys(selectedPipeSizes).length === 0) {
                return pipes; // ไม่มีข้อมูล hierarchy ก็ใช้ท่อทั้งหมด
            }

            return pipes.filter((pipe) => {
                const currentSize = pipe.sizeMM;

                switch (pipeType) {
                    case 'emitter':
                        // ท่อย่อยแยก: ต้องเล็กกว่าท่อย่อย (ถ้ามี)
                        if (selectedPipeSizes.branch) {
                            return currentSize < selectedPipeSizes.branch;
                        }
                        // ถ้าไม่มีท่อย่อย ให้เล็กกว่าเมนรอง (ถ้ามี)
                        if (selectedPipeSizes.secondary) {
                            return currentSize < selectedPipeSizes.secondary;
                        }
                        // ถ้าไม่มีเมนรอง ให้เล็กกว่าเมนหลัก (ถ้ามี)
                        if (selectedPipeSizes.main) {
                            return currentSize < selectedPipeSizes.main;
                        }
                        return true;

                    case 'branch':
                        // ท่อย่อย: ต้องเล็กกว่าเมนรอง (ถ้ามี)
                        if (selectedPipeSizes.secondary) {
                            return currentSize < selectedPipeSizes.secondary;
                        }
                        // ถ้าไม่มีเมนรอง ให้เล็กกว่าเมนหลัก (ถ้ามี)
                        if (selectedPipeSizes.main) {
                            return currentSize < selectedPipeSizes.main;
                        }
                        // ต้องใหญ่กว่าท่อย่อยแยก (ถ้ามี)
                        if (selectedPipeSizes.emitter) {
                            return currentSize > selectedPipeSizes.emitter;
                        }
                        return true;

                    case 'secondary':
                        // ท่อเมนรอง: ต้องเล็กกว่าเมนหลัก (ถ้ามี)
                        if (selectedPipeSizes.main) {
                            return currentSize < selectedPipeSizes.main;
                        }
                        // ต้องใหญ่กว่าท่อย่อย (ถ้ามี)
                        if (selectedPipeSizes.branch) {
                            return currentSize > selectedPipeSizes.branch;
                        }
                        // ต้องใหญ่กว่าท่อย่อยแยก (ถ้ามี)
                        if (selectedPipeSizes.emitter) {
                            return currentSize > selectedPipeSizes.emitter;
                        }
                        return true;

                    case 'main':
                        // ท่อเมนหลัก: ต้องใหญ่กว่าเมนรอง (ถ้ามี)
                        if (selectedPipeSizes.secondary) {
                            return currentSize > selectedPipeSizes.secondary;
                        }
                        // ต้องใหญ่กว่าท่อย่อย (ถ้ามี)
                        if (selectedPipeSizes.branch) {
                            return currentSize > selectedPipeSizes.branch;
                        }
                        // ต้องใหญ่กว่าท่อย่อยแยก (ถ้ามี)
                        if (selectedPipeSizes.emitter) {
                            return currentSize > selectedPipeSizes.emitter;
                        }
                        return true;

                    default:
                        return true;
                }
            });
        },
        [selectedPipeSizes, pipeType]
    );

    // Auto-select best pipe when available pipes change (only if not manually selected)
    useEffect(() => {
        if (
            availablePipes.length > 0 &&
            currentZoneBestPipe &&
            sprinklerPressure &&
            !isManuallySelected
        ) {
            // 🎯 HIERARCHY FIRST - เข้มงวด 100%
            const hierarchyFilteredPipes = getFilteredPipesByHierarchy(availablePipes);

            if (hierarchyFilteredPipes.length === 0) {
                // ❌ ถ้าไม่มีท่อที่ผ่านการกรอง hierarchy --> ไม่เลือกเลย!

                // ไม่เลือกท่อใดเลยถ้าไม่เข้า hierarchy
                return;
            }

            const pipesToSelect = hierarchyFilteredPipes; // ใช้เฉพาะท่อที่เข้า hierarchy เท่านั้น!

            // 🚨 CRITICAL: Real-time Cross-Validation ระหว่าง Components
            const validateCrossComponentHierarchy = (candidatePipe: any): boolean => {
                const candidateSize = candidatePipe.sizeMM;

                let violationFound = false;
                const violationMessages: string[] = [];

                switch (pipeType) {
                    case 'main':
                        // 🚨 เมนหลัก: ต้องใหญ่กว่าทุกประเภท
                        if (
                            selectedPipeSizes.secondary &&
                            candidateSize <= selectedPipeSizes.secondary
                        ) {
                            violationFound = true;
                            violationMessages.push(
                                `❌ MAIN (${candidateSize}mm) ≤ SECONDARY (${selectedPipeSizes.secondary}mm)`
                            );
                        }
                        if (selectedPipeSizes.branch && candidateSize <= selectedPipeSizes.branch) {
                            violationFound = true;
                            violationMessages.push(
                                `❌ MAIN (${candidateSize}mm) ≤ BRANCH (${selectedPipeSizes.branch}mm)`
                            );
                        }
                        if (
                            selectedPipeSizes.emitter &&
                            candidateSize <= selectedPipeSizes.emitter
                        ) {
                            violationFound = true;
                            violationMessages.push(
                                `❌ MAIN (${candidateSize}mm) ≤ EMITTER (${selectedPipeSizes.emitter}mm)`
                            );
                        }
                        break;

                    case 'secondary':
                        // 🚨 เมนรอง: ต้องเล็กกว่าเมนหลัก และใหญ่กว่าท่อย่อย
                        if (selectedPipeSizes.main && candidateSize >= selectedPipeSizes.main) {
                            violationFound = true;
                            violationMessages.push(
                                `❌ SECONDARY (${candidateSize}mm) ≥ MAIN (${selectedPipeSizes.main}mm)`
                            );
                        }
                        if (selectedPipeSizes.branch && candidateSize <= selectedPipeSizes.branch) {
                            violationFound = true;
                            violationMessages.push(
                                `❌ SECONDARY (${candidateSize}mm) ≤ BRANCH (${selectedPipeSizes.branch}mm)`
                            );
                        }
                        if (
                            selectedPipeSizes.emitter &&
                            candidateSize <= selectedPipeSizes.emitter
                        ) {
                            violationFound = true;
                            violationMessages.push(
                                `❌ SECONDARY (${candidateSize}mm) ≤ EMITTER (${selectedPipeSizes.emitter}mm)`
                            );
                        }
                        break;

                    case 'branch':
                        // 🚨 ท่อย่อย: ต้องเล็กกว่าเมน และใหญ่กว่าย่อยแยก
                        if (selectedPipeSizes.main && candidateSize >= selectedPipeSizes.main) {
                            violationFound = true;
                            violationMessages.push(
                                `❌ BRANCH (${candidateSize}mm) ≥ MAIN (${selectedPipeSizes.main}mm)`
                            );
                        }
                        if (
                            selectedPipeSizes.secondary &&
                            candidateSize >= selectedPipeSizes.secondary
                        ) {
                            violationFound = true;
                            violationMessages.push(
                                `❌ BRANCH (${candidateSize}mm) ≥ SECONDARY (${selectedPipeSizes.secondary}mm)`
                            );
                        }
                        if (
                            selectedPipeSizes.emitter &&
                            candidateSize <= selectedPipeSizes.emitter
                        ) {
                            violationFound = true;
                            violationMessages.push(
                                `❌ BRANCH (${candidateSize}mm) ≤ EMITTER (${selectedPipeSizes.emitter}mm)`
                            );
                        }
                        break;

                    case 'emitter':
                        // 🚨 ท่อย่อยแยก: ต้องเล็กกว่าทุกประเภท
                        if (selectedPipeSizes.main && candidateSize >= selectedPipeSizes.main) {
                            violationFound = true;
                            violationMessages.push(
                                `❌ EMITTER (${candidateSize}mm) ≥ MAIN (${selectedPipeSizes.main}mm)`
                            );
                        }
                        if (
                            selectedPipeSizes.secondary &&
                            candidateSize >= selectedPipeSizes.secondary
                        ) {
                            violationFound = true;
                            violationMessages.push(
                                `❌ EMITTER (${candidateSize}mm) ≥ SECONDARY (${selectedPipeSizes.secondary}mm)`
                            );
                        }
                        if (selectedPipeSizes.branch && candidateSize >= selectedPipeSizes.branch) {
                            violationFound = true;
                            violationMessages.push(
                                `❌ EMITTER (${candidateSize}mm) ≥ BRANCH (${selectedPipeSizes.branch}mm)`
                            );
                        }
                        break;
                }

                if (violationFound) {
                    return false;
                } else {
                    return true;
                }
            };

            // ใช้ฟังก์ชันใหม่เพื่อเลือกท่อตามเกณฑ์ head20Percent
            const bestPipe = selectBestPipeByHeadLoss(
                pipesToSelect,
                pipeType,
                currentZoneBestPipe,
                selectedPipeType,
                selectedPipeSizes,
                sprinklerPressure.head20PercentM // ใช้ 20% Head จากแรงดันหัวฉีด
            );

            // 🚨 CRITICAL: Cross-Component Hierarchy Validation ก่อนเลือก
            if (bestPipe) {
                if (validateCrossComponentHierarchy(bestPipe)) {
                    if (!selectedPipe || selectedPipe.id !== bestPipe.id) {
                        onPipeChange(bestPipe);
                    }
                } else {
                    // 🔍 ลองหาท่ออื่นที่เข้าหลัก Cross-Component Hierarchy
                    const alternativePipes = pipesToSelect.filter(validateCrossComponentHierarchy);

                    if (alternativePipes.length > 0) {
                        const alternativeBest = selectBestPipeByHeadLoss(
                            alternativePipes,
                            pipeType,
                            currentZoneBestPipe,
                            selectedPipeType,
                            selectedPipeSizes,
                            sprinklerPressure.head20PercentM
                        );
                        if (
                            alternativeBest &&
                            (!selectedPipe || selectedPipe.id !== alternativeBest.id)
                        ) {
                            onPipeChange(alternativeBest);
                        }
                    } else {
                        // ไม่เลือกท่อใดเลยถ้าไม่มีทางเลือกที่เข้า hierarchy
                        // onPipeChange(null); // อาจจะต้องส่งสัญญาณให้ parent รู้ว่าเลือกไม่ได้
                    }
                }
            }
        }
    }, [
        availablePipes,
        currentZoneBestPipe,
        sprinklerPressure,
        pipeType,
        selectedPipeType,
        selectedPipeSizes,
        selectedPipe,
        onPipeChange,
        isManuallySelected,
        getFilteredPipesByHierarchy,
        getPipeTypeName,
    ]);

    // Calculate head loss when pipe is selected
    useEffect(() => {
        if (selectedPipe && currentZoneBestPipe) {
            const actualPressureClass =
                selectedPipeType === 'PE' ? `PN${selectedPipe.pn}` : `Class${selectedPipe.pn}`;

            const calc = calculateNewHeadLoss(
                currentZoneBestPipe,
                selectedPipeType,
                actualPressureClass,
                `${selectedPipe.sizeMM}mm`
            );

            setCalculation(calc);

            // เก็บข้อมูล calculation สำหรับทุก mode
            if (calc) {
                try {
                    const storageKey =
                        projectMode === 'garden'
                            ? 'garden_pipe_calculations'
                            : projectMode === 'greenhouse'
                              ? 'greenhouse_pipe_calculations'
                              : projectMode === 'field-crop'
                                ? 'field_crop_pipe_calculations'
                                : 'horticulture_pipe_calculations';
                    const existingCalcStr = localStorage.getItem(storageKey);
                    const existingCalc = existingCalcStr ? JSON.parse(existingCalcStr) : {};

                    existingCalc[pipeType] = {
                        headLoss: calc.headLoss,
                        pipeLength: calc.pipeLength,
                        flowRate: calc.flowRate,
                        calculatedAt: new Date().toISOString(),
                    };

                    // สำหรับ greenhouse mode ให้ล้างข้อมูลท่อที่ไม่ใช้
                    if (projectMode === 'greenhouse') {
                        delete existingCalc.secondary;
                        delete existingCalc.emitter;
                    }

                    localStorage.setItem(storageKey, JSON.stringify(existingCalc));
                    
                    // สำหรับ greenhouse mode ให้บันทึกค่าสูงสุดของ Head Loss
                    if (projectMode === 'greenhouse') {
                        const branchHeadLoss = existingCalc.branch?.headLoss || 0;
                        const mainHeadLoss = existingCalc.main?.headLoss || 0;
                        const totalHeadLoss = branchHeadLoss + mainHeadLoss;
                        
                        // ดึงค่าสูงสุดที่เก็บไว้
                        let maxHeadLoss = 0;
                        try {
                            const maxHeadLossStr = localStorage.getItem('greenhouse_max_head_loss');
                            if (maxHeadLossStr) {
                                const maxHeadLossData = JSON.parse(maxHeadLossStr);
                                maxHeadLoss = maxHeadLossData.totalHeadLoss || 0;
                            }
                        } catch (e) {
                            console.error('Error loading max head loss:', e);
                        }
                        
                        // บันทึกค่าสูงสุด
                        if (totalHeadLoss > maxHeadLoss) {
                            localStorage.setItem('greenhouse_max_head_loss', JSON.stringify({
                                totalHeadLoss: totalHeadLoss,
                                branchHeadLoss: branchHeadLoss,
                                mainHeadLoss: mainHeadLoss,
                                updatedAt: new Date().toISOString()
                            }));
                        }
                    }
                } catch (error) {
                    console.error(`Error saving ${projectMode} pipe calculations:`, error);
                }
            }

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
    }, [
        selectedPipe,
        currentZoneBestPipe,
        selectedPipeType,
        pipeType,
        sprinklerPressure,
        projectMode,
    ]);

    const pipeTypeOptions = [
        { value: 'PE', label: 'PE' },
        { value: 'PVC', label: 'PVC' },
    ];

    // ไม่ต้องมี pressureClassOptions อีกต่อไป เนื่องจากเลือกแค่ประเภทท่อ
    // const pressureClassOptions = ... (removed)

    const pipeOptions = availablePipes
        .filter((pipe) => {
            // 🚨 CRITICAL: ใช้ Cross-Component Hierarchy Validation ใน dropdown
            // สร้าง temporary validation function สำหรับ pipe นี้
            const tempValidation = (candidatePipe: any): boolean => {
                const candidateSize = candidatePipe.sizeMM;

                switch (pipeType) {
                    case 'main':
                        // เมนหลัก: ต้องใหญ่กว่าทุกประเภทที่เลือกไปแล้ว
                        return !(
                            (selectedPipeSizes.secondary &&
                                candidateSize <= selectedPipeSizes.secondary) ||
                            (selectedPipeSizes.branch &&
                                candidateSize <= selectedPipeSizes.branch) ||
                            (selectedPipeSizes.emitter &&
                                candidateSize <= selectedPipeSizes.emitter)
                        );
                    case 'secondary':
                        // เมนรอง: ต้องเล็กกว่าเมนหลัก และใหญ่กว่าท่อย่อย
                        return !(
                            (selectedPipeSizes.main && candidateSize >= selectedPipeSizes.main) ||
                            (selectedPipeSizes.branch &&
                                candidateSize <= selectedPipeSizes.branch) ||
                            (selectedPipeSizes.emitter &&
                                candidateSize <= selectedPipeSizes.emitter)
                        );
                    case 'branch':
                        // ท่อย่อย: ต้องเล็กกว่าเมน และใหญ่กว่าย่อยแยก
                        return !(
                            (selectedPipeSizes.main && candidateSize >= selectedPipeSizes.main) ||
                            (selectedPipeSizes.secondary &&
                                candidateSize >= selectedPipeSizes.secondary) ||
                            (selectedPipeSizes.emitter &&
                                candidateSize <= selectedPipeSizes.emitter)
                        );
                    case 'emitter':
                        // ท่อย่อยแยก: ต้องเล็กกว่าทุกประเภท
                        return !(
                            (selectedPipeSizes.main && candidateSize >= selectedPipeSizes.main) ||
                            (selectedPipeSizes.secondary &&
                                candidateSize >= selectedPipeSizes.secondary) ||
                            (selectedPipeSizes.branch && candidateSize >= selectedPipeSizes.branch)
                        );
                    default:
                        return true;
                }
            };

            return tempValidation(pipe);
        })
        .map((pipe) => {
            // ใช้แรงดันของท่อจริงๆ แทน selectedPressureClass
            const actualPressureClass =
                selectedPipeType === 'PE' ? `PN${pipe.pn}` : `Class${pipe.pn}`;

            const calc = currentZoneBestPipe
                ? calculateNewHeadLoss(
                      currentZoneBestPipe,
                      selectedPipeType,
                      actualPressureClass,
                      `${pipe.sizeMM}mm`
                  )
                : null;

            const hasWarning =
                calc && sprinklerPressure
                    ? calc.headLoss > sprinklerPressure.head20PercentM
                    : false;

            // คำนวณความต่างจาก 1.9 เมตร สำหรับการเรียงลำดับ
            const headLoss = calc?.headLoss || 0;
            const diffFrom19 = Math.abs(headLoss - 1.9);

            // ตัวบ่งชี้ว่าเป็นท่อที่เหมาะสมตาม Cross-Component Hierarchy
            const isHierarchyCompliant = (() => {
                const candidateSize = pipe.sizeMM;
                switch (pipeType) {
                    case 'main':
                        return !(
                            (selectedPipeSizes.secondary &&
                                candidateSize <= selectedPipeSizes.secondary) ||
                            (selectedPipeSizes.branch &&
                                candidateSize <= selectedPipeSizes.branch) ||
                            (selectedPipeSizes.emitter &&
                                candidateSize <= selectedPipeSizes.emitter)
                        );
                    case 'secondary':
                        return !(
                            (selectedPipeSizes.main && candidateSize >= selectedPipeSizes.main) ||
                            (selectedPipeSizes.branch &&
                                candidateSize <= selectedPipeSizes.branch) ||
                            (selectedPipeSizes.emitter &&
                                candidateSize <= selectedPipeSizes.emitter)
                        );
                    case 'branch':
                        return !(
                            (selectedPipeSizes.main && candidateSize >= selectedPipeSizes.main) ||
                            (selectedPipeSizes.secondary &&
                                candidateSize >= selectedPipeSizes.secondary) ||
                            (selectedPipeSizes.emitter &&
                                candidateSize <= selectedPipeSizes.emitter)
                        );
                    case 'emitter':
                        return !(
                            (selectedPipeSizes.main && candidateSize >= selectedPipeSizes.main) ||
                            (selectedPipeSizes.secondary &&
                                candidateSize >= selectedPipeSizes.secondary) ||
                            (selectedPipeSizes.branch && candidateSize >= selectedPipeSizes.branch)
                        );
                    default:
                        return true;
                }
            })();

            return {
                value: pipe.id,
                label: `${isHierarchyCompliant ? '✅' : '⛔'} ${pipe.name || pipe.productCode} - ${pipe.sizeMM}mm (PN${pipe.pn}) | HL: ${headLoss.toFixed(3)}ม.`,
                image: pipe.image,
                productCode: pipe.productCode,
                name: pipe.name,
                brand: pipe.brand,
                price: pipe.price,
                unit: 'บาท/ม้วน',
                // Add calculation info
                headLoss: headLoss,
                hasWarning: hasWarning,
                diffFrom19: diffFrom19, // เก็บค่าความต่างสำหรับการเรียงลำดับ
                isHierarchyCompliant: isHierarchyCompliant,
                // เพิ่ม hierarchy status สำหรับ SearchableDropdown
                isRecommended: isHierarchyCompliant && diffFrom19 <= 0.5, // เข้า hierarchy + head loss ดี
                isGoodChoice: isHierarchyCompliant && diffFrom19 <= 1.0, // เข้า hierarchy + head loss พอใช้
                isUsable: isHierarchyCompliant, // เข้า hierarchy แต่ head loss ไม่ดีมาก
                // ถ้าไม่เข้า hierarchy จะไม่ถูกแสดงใน dropdown อีกต่อไปแล้ว (เนื่องจากถูก filter ออก)
            };
        })
        .sort((a, b) => {
            // 🎯 HIERARCHY FIRST SORTING

            // 1. เรียง Hierarchy Compliance ก่อน (ท่อที่เข้า hierarchy ขึ้นก่อน)
            if (a.isHierarchyCompliant !== b.isHierarchyCompliant) {
                return a.isHierarchyCompliant ? -1 : 1; // hierarchy compliant ขึ้นก่อน (-1 = ขึ้นก่อน)
            }

            // 2. ถ้า hierarchy เหมือนกัน --> เรียงตาม Head Loss (ใกล้ 1.9 ม.)
            return a.diffFrom19 - b.diffFrom19;
        });

    // Only show for horticulture, garden, greenhouse and field-crop modes
    if (projectMode !== 'horticulture' && projectMode !== 'garden' && projectMode !== 'greenhouse' && projectMode !== 'field-crop') {
        return (
            <div className="flex items-center justify-center rounded-lg bg-gray-800 p-8">
                <div className="text-center text-gray-500">
                    <div className="mb-2 text-4xl">🚧</div>
                    <p>ระบบใหม่สำหรับ Horticulture, Garden, Greenhouse และ Field-crop เท่านั้น</p>
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
        <div
            className={`rounded-lg bg-${getPipeTypeName(pipeType) === 'ท่อย่อยแยก' ? 'green-300' : getPipeTypeName(pipeType) === 'ท่อย่อย' ? 'yellow-300' : getPipeTypeName(pipeType) === 'ท่อเมนรอง' ? 'purple-300' : 'red-300'} p-6`}
        >
            <div>
                <div className="mb-2 flex flex-row items-center justify-between gap-4">
                    <div>
                        <h3
                            className={`m-0 p-0 text-2xl font-bold text-${getPipeTypeName(pipeType) === 'ท่อย่อยแยก' ? 'green-800' : getPipeTypeName(pipeType) === 'ท่อย่อย' ? 'yellow-800' : getPipeTypeName(pipeType) === 'ท่อเมนรอง' ? 'purple-800' : 'red-800'}`}
                        >
                            {getPipeTypeName(pipeType)}
                        </h3>
                    </div>
                    <div className="w-32">
                        <SearchableDropdown
                            options={pipeTypeOptions}
                            value={selectedPipeType}
                            onChange={(value) => setSelectedPipeType(value.toString())}
                            placeholder="เลือกประเภทท่อ"
                        />
                    </div>
                </div>

                {/* แสดงข้อมูลท่อที่ต้องการน้ำมากที่สุด */}
                <div className="mb-2 rounded bg-orange-900 p-2">
                    <h4 className="flex items-center gap-4 font-medium text-orange-300">
                        🔥 ท่อที่ต้องการน้ำมากที่สุด:
                        <span className="flex items-center gap-2 text-sm">
                            <span className="text-orange-200">ยาว:</span>
                            <span className="font-bold text-white">
                                {projectMode === 'garden' && gardenZoneStats
                                    ? `${gardenZoneStats.totalPipeLength.toFixed(1)} ม.`
                                    : projectMode === 'greenhouse' && greenhouseSystemData && activeZoneId
                                      ? (() => {
                                            const currentPlot = greenhouseSystemData.summary.plotStats.find((p: any) => p.plotId === activeZoneId);
                                            if (currentPlot) {
                                                switch (pipeType) {
                                                    case 'branch':
                                                        return `${(currentPlot.pipeStats.drip.longest || currentPlot.pipeStats.sub.longest || 30).toFixed(1)} ม.`;
                                                    case 'secondary':
                                                        return `${(currentPlot.pipeStats.main.longest || 0).toFixed(1)} ม.`;
                                                    case 'main':
                                                        return '0.0 ม.';
                                                    case 'emitter':
                                                        return `${(currentPlot.pipeStats.drip.longest || 10).toFixed(1)} ม.`;
                                                    default:
                                                        return `${currentZoneBestPipe.length.toFixed(1)} ม.`;
                                                }
                                            }
                                            return `${currentZoneBestPipe.length.toFixed(1)} ม.`;
                                        })()
                                      : `${currentZoneBestPipe.length.toFixed(1)} ม.`}
                            </span>
                            <span className="text-orange-200">| ทางออก:</span>
                            <span className="font-bold text-white">
                                {projectMode === 'garden' && gardenZoneStats
                                    ? gardenZoneStats.sprinklerCount
                                    : projectMode === 'greenhouse' && greenhouseSystemData && activeZoneId
                                      ? (() => {
                                            const currentPlot = greenhouseSystemData.summary.plotStats.find((p: any) => p.plotId === activeZoneId);
                                            if (currentPlot) {
                                                switch (pipeType) {
                                                    case 'branch':
                                                        return currentPlot.equipmentCount.sprinklers || 1;
                                                    case 'secondary':
                                                        return 1;
                                                    case 'main':
                                                        return 0;
                                                    case 'emitter':
                                                        return currentPlot.equipmentCount.sprinklers || 1;
                                                    default:
                                                        return currentZoneBestPipe.count;
                                                }
                                            }
                                            return currentZoneBestPipe.count;
                                        })()
                                      : currentZoneBestPipe.count}
                            </span>
                            <span className="text-orange-200">| ใช้น้ำ:</span>
                            <span className="font-bold text-white">
                                {projectMode === 'garden' && gardenZoneStats
                                    ? `${(gardenZoneStats.sprinklerFlowRate * gardenZoneStats.sprinklerCount).toFixed(1)} L/min`
                                    : projectMode === 'greenhouse' && greenhouseSystemData && activeZoneId
                                      ? (() => {
                                            const currentPlot = greenhouseSystemData.summary.plotStats.find((p: any) => p.plotId === activeZoneId);
                                            if (currentPlot) {
                                                switch (pipeType) {
                                                    case 'branch':
                                                        return `${(currentPlot.production.waterRequirementPerIrrigation / Math.max(currentPlot.equipmentCount.sprinklers || 1, 1)).toFixed(1)} L/min`;
                                                    case 'secondary':
                                                        return `${currentPlot.production.waterRequirementPerIrrigation.toFixed(1)} L/min`;
                                                    case 'main':
                                                        return '0.0 L/min';
                                                    case 'emitter': {
                                                        const waterCalc = currentPlot.production?.waterCalculation;
                                                        const flowRate = waterCalc?.waterPerPlant?.litersPerMinute ?? 6.0;
                                                        return `${flowRate.toFixed(1)} L/min`;
                                                    }
                                                    default:
                                                        return `${currentZoneBestPipe.waterFlowRate.toFixed(1)} L/min`;
                                                }
                                            }
                                            return `${currentZoneBestPipe.waterFlowRate.toFixed(1)} L/min`;
                                        })()
                                      : `${currentZoneBestPipe.waterFlowRate.toFixed(1)} L/min`}
                            </span>
                        </span>
                    </h4>
                </div>

                {/* แสดงข้อมูลลำดับชั้นท่อ */}
                {selectedPipeSizes && Object.keys(selectedPipeSizes).length > 0 && (
                    <div className="mb-2 rounded bg-purple-900/30 p-2 text-xs">
                        <div className="mb-1 flex items-center justify-between">
                            <div className="text-purple-300">📏 ลำดับชั้นท่อปัจจุบัน:</div>
                            {(() => {
                                // ตรวจสอบว่า selectedPipeSizes มีปัญหา hierarchy หรือไม่
                                const hasHierarchyIssues =
                                    (selectedPipeSizes.main &&
                                        selectedPipeSizes.secondary &&
                                        selectedPipeSizes.main <= selectedPipeSizes.secondary) ||
                                    (selectedPipeSizes.main &&
                                        selectedPipeSizes.branch &&
                                        selectedPipeSizes.main <= selectedPipeSizes.branch) ||
                                    (selectedPipeSizes.main &&
                                        selectedPipeSizes.emitter &&
                                        selectedPipeSizes.main <= selectedPipeSizes.emitter) ||
                                    (selectedPipeSizes.secondary &&
                                        selectedPipeSizes.branch &&
                                        selectedPipeSizes.secondary <= selectedPipeSizes.branch) ||
                                    (selectedPipeSizes.secondary &&
                                        selectedPipeSizes.emitter &&
                                        selectedPipeSizes.secondary <= selectedPipeSizes.emitter) ||
                                    (selectedPipeSizes.branch &&
                                        selectedPipeSizes.emitter &&
                                        selectedPipeSizes.branch <= selectedPipeSizes.emitter);

                                if (hasHierarchyIssues) {
                                    return (
                                        <button
                                            onClick={() => {
                                                if (
                                                    confirm(
                                                        '🔄 ต้องการ Reset การเลือกท่อทั้งหมดและเริ่มใหม่หรือไม่?\n\nระบบจะเลือกท่อให้ใหม่ตามลำดับชั้นที่ถูกต้อง'
                                                    )
                                                ) {
                                                    // Reset การเลือกท่อทั้งหมด
                                                    setIsManuallySelected(false);

                                                    // ส่งสัญญาณให้ parent component reset ท่อทั้งหมด
                                                    // TODO: ต้องเพิ่ม callback function เพื่อ reset selectedPipeSizes
                                                    alert(
                                                        '⚠️ ฟีเจอร์นี้ต้องการการปรับปรุง callback function ใน parent component'
                                                    );
                                                }
                                            }}
                                            className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-500"
                                            title="Reset การเลือกท่อทั้งหมด"
                                        >
                                            🔄 Reset ทั้งหมด
                                        </button>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                        <div className="text-purple-200">
                            {selectedPipeSizes.main && `เมนหลัก: ${selectedPipeSizes.main}mm`}
                            {selectedPipeSizes.secondary &&
                                ` ${`>`} เมนรอง: ${selectedPipeSizes.secondary}mm`}
                            {selectedPipeSizes.branch &&
                                ` ${`>`} ย่อย: ${selectedPipeSizes.branch}mm`}
                            {selectedPipeSizes.emitter &&
                                ` ${`>`} ย่อยแยก: ${selectedPipeSizes.emitter}mm`}
                        </div>
                        <div className="mt-1 text-purple-400">
                            กฎ: {getPipeTypeName(pipeType)} ต้อง{' '}
                            {(() => {
                                switch (pipeType) {
                                    case 'emitter':
                                        if (selectedPipeSizes.branch)
                                            return `< ${selectedPipeSizes.branch}mm`;
                                        if (selectedPipeSizes.secondary)
                                            return `< ${selectedPipeSizes.secondary}mm`;
                                        if (selectedPipeSizes.main)
                                            return `< ${selectedPipeSizes.main}mm`;
                                        return 'ไม่มีข้อจำกัด';
                                    case 'branch': {
                                        const constraints: string[] = [];
                                        if (selectedPipeSizes.emitter)
                                            constraints.push(`> ${selectedPipeSizes.emitter}mm`);
                                        if (selectedPipeSizes.secondary)
                                            constraints.push(`< ${selectedPipeSizes.secondary}mm`);
                                        else if (selectedPipeSizes.main)
                                            constraints.push(`< ${selectedPipeSizes.main}mm`);
                                        return constraints.length > 0
                                            ? constraints.join(' และ ')
                                            : 'ไม่มีข้อจำกัด';
                                    }
                                    case 'secondary': {
                                        const secConstraints: string[] = [];
                                        if (selectedPipeSizes.branch)
                                            secConstraints.push(`> ${selectedPipeSizes.branch}mm`);
                                        else if (selectedPipeSizes.emitter)
                                            secConstraints.push(`> ${selectedPipeSizes.emitter}mm`);
                                        if (selectedPipeSizes.main)
                                            secConstraints.push(`< ${selectedPipeSizes.main}mm`);
                                        return secConstraints.length > 0
                                            ? secConstraints.join(' และ ')
                                            : 'ไม่มีข้อจำกัด';
                                    }
                                    case 'main':
                                        if (selectedPipeSizes.secondary)
                                            return `> ${selectedPipeSizes.secondary}mm`;
                                        if (selectedPipeSizes.branch)
                                            return `> ${selectedPipeSizes.branch}mm`;
                                        if (selectedPipeSizes.emitter)
                                            return `> ${selectedPipeSizes.emitter}mm`;
                                        return 'ไม่มีข้อจำกัด';
                                    default:
                                        return 'ไม่มีข้อจำกัด';
                                }
                            })()}
                        </div>
                    </div>
                )}

                {/* เลือกท่อ */}
                {pipeOptions.length > 0 ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex-1">
                                <SearchableDropdown
                                    options={pipeOptions}
                                    value={selectedPipe?.id || ''}
                                    onChange={(value) => {
                                        const pipe = availablePipes.find((p) => p.id === value);
                                        if (pipe) {
                                            setIsManuallySelected(true); // Mark as manually selected
                                            onPipeChange(pipe);
                                        }
                                    }}
                                    placeholder="เลือกท่อ"
                                />
                            </div>
                            {isManuallySelected && (
                                <button
                                    onClick={() => {
                                        setIsManuallySelected(false); // Reset to auto-selection
                                        // Auto-select best pipe again
                                        if (
                                            availablePipes.length > 0 &&
                                            currentZoneBestPipe &&
                                            sprinklerPressure
                                        ) {
                                            const hierarchyFilteredPipes = availablePipes.filter(
                                                (pipe) => {
                                                    const candidateSize = pipe.sizeMM;
                                                    switch (pipeType) {
                                                        case 'main':
                                                            return !(
                                                                (selectedPipeSizes.secondary &&
                                                                    candidateSize <=
                                                                        selectedPipeSizes.secondary) ||
                                                                (selectedPipeSizes.branch &&
                                                                    candidateSize <=
                                                                        selectedPipeSizes.branch) ||
                                                                (selectedPipeSizes.emitter &&
                                                                    candidateSize <=
                                                                        selectedPipeSizes.emitter)
                                                            );
                                                        case 'secondary':
                                                            return !(
                                                                (selectedPipeSizes.main &&
                                                                    candidateSize >=
                                                                        selectedPipeSizes.main) ||
                                                                (selectedPipeSizes.branch &&
                                                                    candidateSize <=
                                                                        selectedPipeSizes.branch) ||
                                                                (selectedPipeSizes.emitter &&
                                                                    candidateSize <=
                                                                        selectedPipeSizes.emitter)
                                                            );
                                                        case 'branch':
                                                            return !(
                                                                (selectedPipeSizes.main &&
                                                                    candidateSize >=
                                                                        selectedPipeSizes.main) ||
                                                                (selectedPipeSizes.secondary &&
                                                                    candidateSize >=
                                                                        selectedPipeSizes.secondary) ||
                                                                (selectedPipeSizes.emitter &&
                                                                    candidateSize <=
                                                                        selectedPipeSizes.emitter)
                                                            );
                                                        case 'emitter':
                                                            return !(
                                                                (selectedPipeSizes.main &&
                                                                    candidateSize >=
                                                                        selectedPipeSizes.main) ||
                                                                (selectedPipeSizes.secondary &&
                                                                    candidateSize >=
                                                                        selectedPipeSizes.secondary) ||
                                                                (selectedPipeSizes.branch &&
                                                                    candidateSize >=
                                                                        selectedPipeSizes.branch)
                                                            );
                                                        default:
                                                            return true;
                                                    }
                                                }
                                            );
                                            const pipesToSelect = hierarchyFilteredPipes; // Strict: เฉพาะที่เข้า cross-component hierarchy!
                                            const bestPipe = selectBestPipeByHeadLoss(
                                                pipesToSelect,
                                                pipeType,
                                                currentZoneBestPipe,
                                                selectedPipeType,
                                                selectedPipeSizes,
                                                sprinklerPressure.head20PercentM
                                            );
                                            if (bestPipe) {
                                                onPipeChange(bestPipe);
                                            }
                                        }
                                    }}
                                    className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500"
                                    title={t('กลับไปใช้การเลือกอัตโนมัติ')}
                                >
                                    🤖 {t('อัตโนมัติ')}
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="py-4 text-center text-black">
                        <p className="font-semibold text-red-600">🚫 ไม่มีท่อให้เลือก</p>
                        <div className="mt-3 text-sm">
                            {/* ตรวจสอบสาเหตุที่ไม่มีท่อ */}
                            {(() => {
                                const totalAvailable = availablePipes.length;
                                // คำนวณจำนวนท่อที่ผ่าน Cross-Component Hierarchy
                                const hierarchyFiltered = availablePipes.filter((pipe) => {
                                    const candidateSize = pipe.sizeMM;
                                    switch (pipeType) {
                                        case 'main':
                                            return !(
                                                (selectedPipeSizes.secondary &&
                                                    candidateSize <= selectedPipeSizes.secondary) ||
                                                (selectedPipeSizes.branch &&
                                                    candidateSize <= selectedPipeSizes.branch) ||
                                                (selectedPipeSizes.emitter &&
                                                    candidateSize <= selectedPipeSizes.emitter)
                                            );
                                        case 'secondary':
                                            return !(
                                                (selectedPipeSizes.main &&
                                                    candidateSize >= selectedPipeSizes.main) ||
                                                (selectedPipeSizes.branch &&
                                                    candidateSize <= selectedPipeSizes.branch) ||
                                                (selectedPipeSizes.emitter &&
                                                    candidateSize <= selectedPipeSizes.emitter)
                                            );
                                        case 'branch':
                                            return !(
                                                (selectedPipeSizes.main &&
                                                    candidateSize >= selectedPipeSizes.main) ||
                                                (selectedPipeSizes.secondary &&
                                                    candidateSize >= selectedPipeSizes.secondary) ||
                                                (selectedPipeSizes.emitter &&
                                                    candidateSize <= selectedPipeSizes.emitter)
                                            );
                                        case 'emitter':
                                            return !(
                                                (selectedPipeSizes.main &&
                                                    candidateSize >= selectedPipeSizes.main) ||
                                                (selectedPipeSizes.secondary &&
                                                    candidateSize >= selectedPipeSizes.secondary) ||
                                                (selectedPipeSizes.branch &&
                                                    candidateSize >= selectedPipeSizes.branch)
                                            );
                                        default:
                                            return true;
                                    }
                                }).length;

                                if (totalAvailable === 0) {
                                    return (
                                        <div className="space-y-2">
                                            <div className="rounded border border-red-300 bg-red-100 p-2">
                                                <p className="font-medium text-red-700">
                                                    ❌ ไม่มีท่อในฐานข้อมูล:
                                                </p>
                                                <ul className="mt-1 list-inside list-disc text-xs text-red-600">
                                                    <li>ไม่มีท่อประเภท {selectedPipeType}</li>
                                                    <li>
                                                        หรือไม่มีท่อที่มีแรงดัน ≥{' '}
                                                        {sprinklerPressure?.pressureBar.toFixed(1)}{' '}
                                                        บาร์
                                                    </li>
                                                    {(pipeType === 'branch' ||
                                                        pipeType === 'emitter') && (
                                                        <li>
                                                            หรือขนาดท่อเกิน 32mm (
                                                            {getPipeTypeName(pipeType)}: ≤32mm)
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>
                                    );
                                } else if (hierarchyFiltered === 0) {
                                    return (
                                        <div className="space-y-3">
                                            <div className="rounded border border-orange-300 bg-orange-100 p-3">
                                                <p className="font-semibold text-orange-700">
                                                    ⛔ Hierarchy Violation!
                                                </p>
                                                <p className="mt-1 text-orange-600">
                                                    มีท่อ{' '}
                                                    <span className="font-bold">
                                                        {totalAvailable}
                                                    </span>{' '}
                                                    รายการ แต่
                                                    <span className="font-bold text-red-600">
                                                        {' '}
                                                        ไม่เข้ากับลำดับชั้นท่อ
                                                    </span>
                                                </p>

                                                <div className="mt-2 rounded border bg-orange-50 p-2 text-xs">
                                                    <p className="font-medium text-orange-800">
                                                        📋 กฎลำดับชั้น:
                                                    </p>
                                                    <p className="mt-1 text-orange-700">
                                                        เมนหลัก {`>`} เมนรอง {`>`} ย่อย {`>`}{' '}
                                                        ย่อยแยก
                                                    </p>
                                                </div>

                                                <div className="mt-2 rounded border bg-red-50 p-2 text-xs">
                                                    <p className="font-medium text-red-700">
                                                        🎯 วิธีแก้ไข:
                                                    </p>
                                                    <ul className="mt-1 list-inside list-disc space-y-1 text-red-600">
                                                        <li>
                                                            เลือก<strong>ท่ออื่น</strong>
                                                            ในประเภทที่มีปัญหา hierarchy
                                                        </li>
                                                        <li>
                                                            หรือใช้ปุ่ม{' '}
                                                            <strong>"🔄 Reset ทั้งหมด"</strong>{' '}
                                                            ด้านบน
                                                        </li>
                                                        <li>
                                                            <strong>ลำดับความสำคัญ:</strong>{' '}
                                                            Hierarchy {`>`} Head Loss
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return <p>กรุณาเปลี่ยนประเภทท่อ</p>;
                            })()}
                        </div>
                    </div>
                )}

                {/* แสดงการคำนวณ */}
                {calculation && (
                    <div className="mt-4 rounded bg-green-900 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <h4 className="font-medium text-green-300">📊 การคำนวณ Head Loss</h4>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-red-500">
                                    {calculation.headLoss.toFixed(3)} ม.
                                </span>
                            </div>
                        </div>

                        <details className="text-xs text-green-200">
                            <summary className="cursor-pointer hover:text-green-100">
                                รายละเอียดการคำนวณ
                            </summary>
                            <pre className="mt-2 whitespace-pre-wrap rounded bg-green-800 p-2">
                                {/* แสดงข้อมูลการเลือกท่อสำหรับการคำนวณ */}
                                {selectedPipe && (
                                    <div className="mb-3 rounded bg-blue-900 p-2">
                                        <h5 className="mb-1 text-xs font-medium text-blue-300">
                                            🔍 ข้อมูลที่ใช้ในการคำนวณ
                                        </h5>
                                        {(() => {
                                            const actualPressureClass =
                                                selectedPipeType === 'PE'
                                                    ? `PN${selectedPipe.pn}`
                                                    : `Class${selectedPipe.pn}`;
                                            const pipeDataInfo = getSelectedPipeDataInfo(
                                                selectedPipeType,
                                                actualPressureClass,
                                                `${selectedPipe.sizeMM}mm`
                                            );

                                            if (pipeDataInfo) {
                                                return (
                                                    <div className="text-xs text-blue-200">
                                                        <div className="flex justify-between">
                                                            <span>ท่อที่เลือก:</span>
                                                            <span className="font-medium">
                                                                {selectedPipeType}{' '}
                                                                {pipeDataInfo.originalValue} ขนาด{' '}
                                                                {pipeDataInfo.sizeInfo
                                                                    ?.originalSize ||
                                                                    `${selectedPipe.sizeMM}mm`}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>ใช้ข้อมูลจากตาราง:</span>
                                                            <span className="font-medium text-yellow-300">
                                                                {selectedPipeType}{' '}
                                                                {pipeDataInfo.selectedValue} ขนาด{' '}
                                                                {pipeDataInfo.sizeInfo
                                                                    ?.selectedSize ||
                                                                    `${selectedPipe.sizeMM}mm`}
                                                                {(!pipeDataInfo.isExactMatch ||
                                                                    (pipeDataInfo.sizeInfo &&
                                                                        !pipeDataInfo.sizeInfo
                                                                            .isExactSizeMatch)) &&
                                                                    ' ⚠️'}
                                                            </span>
                                                        </div>

                                                        {/* แสดงคำอธิบายสำหรับ PN/Class */}
                                                        {/* {!pipeDataInfo.isExactMatch && (
                                                    <div className="mt-1 text-yellow-200 bg-yellow-900 rounded px-2 py-1">
                                                        <div className="text-xs">{pipeDataInfo.reason}</div>
                                                    </div>
                                                )} */}

                                                        {/* แสดงคำอธิบายสำหรับขนาดท่อ */}
                                                        {/* {pipeDataInfo.sizeInfo && !pipeDataInfo.sizeInfo.isExactSizeMatch && (
                                                    <div className="mt-1 text-orange-200 bg-orange-900 rounded px-2 py-1">
                                                        <div className="text-xs">{pipeDataInfo.sizeInfo.sizeReason}</div>
                                                    </div>
                                                )} */}

                                                        {/* แสดงข้อมูลลำดับชั้นท่อ */}
                                                        {selectedPipeSizes &&
                                                            Object.keys(selectedPipeSizes).length >
                                                                0 && (
                                                                <div className="mt-2 rounded bg-gray-800 p-2">
                                                                    <div className="mb-1 text-xs text-gray-300">
                                                                        📏 ลำดับชั้นของท่อ:
                                                                    </div>
                                                                    <div className="text-xs text-gray-400">
                                                                        {selectedPipeSizes.main &&
                                                                            `เมน: ${selectedPipeSizes.main}mm `}
                                                                        {selectedPipeSizes.secondary &&
                                                                            `| เมนรอง: ${selectedPipeSizes.secondary}mm `}
                                                                        {selectedPipeSizes.branch &&
                                                                            `| ย่อย: ${selectedPipeSizes.branch}mm `}
                                                                        {selectedPipeSizes.emitter &&
                                                                            `| ย่อยแยก: ${selectedPipeSizes.emitter}mm`}
                                                                    </div>
                                                                    <div className="mt-1 text-xs text-purple-300">
                                                                        📋 ขนาดปัจจุบัน ({pipeType}
                                                                        ): {selectedPipe.sizeMM}mm
                                                                    </div>
                                                                </div>
                                                            )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                )}
                                {calculation.calculationDetails}
                            </pre>
                        </details>
                    </div>
                )}

                {/* แสดงการตรวจสอบ Hierarchy */}
                {selectedPipe && selectedPipeSizes && Object.keys(selectedPipeSizes).length > 0 && (
                    <div className="mt-4 rounded bg-blue-800/50 p-3">
                        <h4 className="mb-2 text-sm font-medium text-blue-300">
                            🔍 ตรวจสอบ Hierarchy
                        </h4>
                        {(() => {
                            const currentSize = selectedPipe.sizeMM;
                            const violations: string[] = [];

                            switch (pipeType) {
                                case 'main':
                                    if (
                                        selectedPipeSizes.secondary &&
                                        currentSize <= selectedPipeSizes.secondary
                                    ) {
                                        violations.push(
                                            `⛔ เมนหลัก (${currentSize}mm) ≤ เมนรอง (${selectedPipeSizes.secondary}mm)`
                                        );
                                    }
                                    if (
                                        selectedPipeSizes.branch &&
                                        currentSize <= selectedPipeSizes.branch
                                    ) {
                                        violations.push(
                                            `⛔ เมนหลัก (${currentSize}mm) ≤ ท่อย่อย (${selectedPipeSizes.branch}mm)`
                                        );
                                    }
                                    if (
                                        selectedPipeSizes.emitter &&
                                        currentSize <= selectedPipeSizes.emitter
                                    ) {
                                        violations.push(
                                            `⛔ เมนหลัก (${currentSize}mm) ≤ ท่อย่อยแยก (${selectedPipeSizes.emitter}mm)`
                                        );
                                    }
                                    break;
                                case 'secondary':
                                    if (
                                        selectedPipeSizes.main &&
                                        currentSize >= selectedPipeSizes.main
                                    ) {
                                        violations.push(
                                            `⛔ เมนรอง (${currentSize}mm) ≥ เมนหลัก (${selectedPipeSizes.main}mm)`
                                        );
                                    }
                                    if (
                                        selectedPipeSizes.branch &&
                                        currentSize <= selectedPipeSizes.branch
                                    ) {
                                        violations.push(
                                            `⛔ เมนรอง (${currentSize}mm) ≤ ท่อย่อย (${selectedPipeSizes.branch}mm)`
                                        );
                                    }
                                    if (
                                        selectedPipeSizes.emitter &&
                                        currentSize <= selectedPipeSizes.emitter
                                    ) {
                                        violations.push(
                                            `⛔ เมนรอง (${currentSize}mm) ≤ ท่อย่อยแยก (${selectedPipeSizes.emitter}mm)`
                                        );
                                    }
                                    break;
                                case 'branch':
                                    if (
                                        selectedPipeSizes.main &&
                                        currentSize >= selectedPipeSizes.main
                                    ) {
                                        violations.push(
                                            `⛔ ท่อย่อย (${currentSize}mm) ≥ เมนหลัก (${selectedPipeSizes.main}mm)`
                                        );
                                    }
                                    if (
                                        selectedPipeSizes.secondary &&
                                        currentSize >= selectedPipeSizes.secondary
                                    ) {
                                        violations.push(
                                            `⛔ ท่อย่อย (${currentSize}mm) ≥ เมนรอง (${selectedPipeSizes.secondary}mm)`
                                        );
                                    }
                                    if (
                                        selectedPipeSizes.emitter &&
                                        currentSize <= selectedPipeSizes.emitter
                                    ) {
                                        violations.push(
                                            `⛔ ท่อย่อย (${currentSize}mm) ≤ ท่อย่อยแยก (${selectedPipeSizes.emitter}mm)`
                                        );
                                    }
                                    break;
                                case 'emitter':
                                    if (
                                        selectedPipeSizes.main &&
                                        currentSize >= selectedPipeSizes.main
                                    ) {
                                        violations.push(
                                            `⛔ ท่อย่อยแยก (${currentSize}mm) ≥ เมนหลัก (${selectedPipeSizes.main}mm)`
                                        );
                                    }
                                    if (
                                        selectedPipeSizes.secondary &&
                                        currentSize >= selectedPipeSizes.secondary
                                    ) {
                                        violations.push(
                                            `⛔ ท่อย่อยแยก (${currentSize}mm) ≥ เมนรอง (${selectedPipeSizes.secondary}mm)`
                                        );
                                    }
                                    if (
                                        selectedPipeSizes.branch &&
                                        currentSize >= selectedPipeSizes.branch
                                    ) {
                                        violations.push(
                                            `⛔ ท่อย่อยแยก (${currentSize}mm) ≥ ท่อย่อย (${selectedPipeSizes.branch}mm)`
                                        );
                                    }
                                    break;
                            }

                            if (violations.length > 0) {
                                return (
                                    <div className="space-y-1">
                                        <div className="text-xs font-medium text-red-300">
                                            ❌ Hierarchy Violations:
                                        </div>
                                        {violations.map((violation, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded bg-red-900/30 px-2 py-1 text-xs text-red-200"
                                            >
                                                {violation}
                                            </div>
                                        ))}
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="text-xs text-yellow-300">
                                                💡 กรุณาเลือกท่อใหม่ให้เข้าหลัก: เมนหลัก {`>`}{' '}
                                                เมนรอง {`>`} ย่อย {`>`} ย่อยแยก
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setIsManuallySelected(false);

                                                    // Force re-evaluation with strict Cross-Component hierarchy
                                                    const hierarchyFilteredPipes =
                                                        availablePipes.filter((pipe) => {
                                                            const candidateSize = pipe.sizeMM;
                                                            switch (pipeType) {
                                                                case 'main':
                                                                    return !(
                                                                        (selectedPipeSizes.secondary &&
                                                                            candidateSize <=
                                                                                selectedPipeSizes.secondary) ||
                                                                        (selectedPipeSizes.branch &&
                                                                            candidateSize <=
                                                                                selectedPipeSizes.branch) ||
                                                                        (selectedPipeSizes.emitter &&
                                                                            candidateSize <=
                                                                                selectedPipeSizes.emitter)
                                                                    );
                                                                case 'secondary':
                                                                    return !(
                                                                        (selectedPipeSizes.main &&
                                                                            candidateSize >=
                                                                                selectedPipeSizes.main) ||
                                                                        (selectedPipeSizes.branch &&
                                                                            candidateSize <=
                                                                                selectedPipeSizes.branch) ||
                                                                        (selectedPipeSizes.emitter &&
                                                                            candidateSize <=
                                                                                selectedPipeSizes.emitter)
                                                                    );
                                                                case 'branch':
                                                                    return !(
                                                                        (selectedPipeSizes.main &&
                                                                            candidateSize >=
                                                                                selectedPipeSizes.main) ||
                                                                        (selectedPipeSizes.secondary &&
                                                                            candidateSize >=
                                                                                selectedPipeSizes.secondary) ||
                                                                        (selectedPipeSizes.emitter &&
                                                                            candidateSize <=
                                                                                selectedPipeSizes.emitter)
                                                                    );
                                                                case 'emitter':
                                                                    return !(
                                                                        (selectedPipeSizes.main &&
                                                                            candidateSize >=
                                                                                selectedPipeSizes.main) ||
                                                                        (selectedPipeSizes.secondary &&
                                                                            candidateSize >=
                                                                                selectedPipeSizes.secondary) ||
                                                                        (selectedPipeSizes.branch &&
                                                                            candidateSize >=
                                                                                selectedPipeSizes.branch)
                                                                    );
                                                                default:
                                                                    return true;
                                                            }
                                                        });

                                                    if (
                                                        hierarchyFilteredPipes.length > 0 &&
                                                        sprinklerPressure
                                                    ) {
                                                        const bestPipe = selectBestPipeByHeadLoss(
                                                            hierarchyFilteredPipes,
                                                            pipeType,
                                                            currentZoneBestPipe,
                                                            selectedPipeType,
                                                            selectedPipeSizes,
                                                            sprinklerPressure.head20PercentM
                                                        );

                                                        if (
                                                            bestPipe &&
                                                            bestPipe.id !== selectedPipe?.id
                                                        ) {
                                                            onPipeChange(bestPipe);
                                                        }
                                                    }
                                                }}
                                                className="rounded bg-yellow-600 px-2 py-1 text-xs text-white hover:bg-yellow-500"
                                                title="ลองแก้ไข Hierarchy อัตโนมัติ"
                                            >
                                                🔧 แก้ไข
                                            </button>
                                        </div>
                                    </div>
                                );
                            } else {
                                return (
                                    <div className="text-xs text-green-300">
                                        ✅ Hierarchy ถูกต้อง: {getPipeTypeName(pipeType)} (
                                        {currentSize}mm)
                                    </div>
                                );
                            }
                        })()}
                    </div>
                )}

                {/* แสดง warnings */}
                {warnings.length > 0 && (
                    <div className="mt-4 rounded bg-red-900 p-3">
                        <h4 className="mb-2 font-medium text-red-300">⚠️ คำเตือน</h4>
                        {warnings.map((warning, index) => (
                            <p key={index} className="text-sm text-red-200">
                                {warning}
                            </p>
                        ))}
                    </div>
                )}

                {/* แสดงข้อมูลท่อที่เลือก */}
                {selectedPipe && (
                    <div className="mt-4 rounded bg-gray-700 p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h4 className="font-medium text-gray-300">
                                🔧 ข้อมูลท่อที่เลือก (รหัสสินค้า: {selectedPipe.productCode})
                            </h4>
                            <div className="text-xs">
                                {isManuallySelected ? (
                                    <span className="flex items-center gap-1 rounded bg-blue-800 px-2 py-1 text-blue-200">
                                        👤 {t('เลือกด้วยตนเอง')}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 rounded bg-green-800 px-2 py-1 text-green-200">
                                        🤖 {t('เลือกอัตโนมัติ')}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-start space-x-4">
                            {/* ข้อมูลท่อ */}
                            <div className="flex-1">
                                <div className="grid grid-cols-12 gap-3 text-sm">
                                    <div className="col-span-8">
                                        <div className="col-span-8">
                                            <p className="mb-1 text-lg font-medium text-white">
                                                {selectedPipe.name || selectedPipe.productCode}
                                            </p>
                                        </div>

                                        <div className="col-span-8 flex flex-wrap items-end gap-6">
                                            <div className="flex flex-col">
                                                <span className="text-gray-400">ขนาด:</span>
                                                <span className="font-medium text-white">
                                                    {selectedPipe.sizeMM} mm.{' '}
                                                    {selectedPipe.sizeInch &&
                                                        `(${selectedPipe.sizeInch})`}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-400">แรงดัน:</span>
                                                <span className="font-medium text-white">
                                                    PN{selectedPipe.pn || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-400">ยาว/ม้วน:</span>
                                                <span className="font-medium text-white">
                                                    {selectedPipe.lengthM}ม.
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-400">ราคา/ม้วน:</span>
                                                <span className="font-medium text-green-400">
                                                    {selectedPipe.price?.toLocaleString()} บาท
                                                </span>
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
                                    <div className="col-span-4 flex items-center justify-center">
                                        {/* รูปภาพท่อ */}
                                        {selectedPipe.image ? (
                                            <img
                                                src={selectedPipe.image}
                                                alt={selectedPipe.name || selectedPipe.productCode}
                                                className="h-28 w-28 rounded border border-gray-600 object-contain"
                                            />
                                        ) : (
                                            <div className="flex h-28 w-28 items-center justify-center rounded bg-gray-500 text-xs text-gray-300">
                                                ไม่มีรูป
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PipeSelector;
