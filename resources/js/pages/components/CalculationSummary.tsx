// resources\js\pages\components\CalculationSummary.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CalculationResults, IrrigationInput } from '../types/interfaces';
import { Zone } from '../../utils/horticultureUtils';
import { useLanguage } from '../../contexts/LanguageContext';
import { getEnhancedFieldCropData, FieldCropData } from '../../utils/fieldCropData';

interface ZoneOperationGroup {
    id: string;
    zones: string[];
    order: number;
    label: string;
}

interface CalculationSummaryProps {
    results: CalculationResults;
    input: IrrigationInput;
    selectedSprinkler: any;
    selectedPump?: any;
    selectedBranchPipe?: any;
    selectedSecondaryPipe?: any;
    selectedMainPipe?: any;
    activeZone?: Zone;
    selectedZones?: string[];
    allZoneSprinklers: { [zoneId: string]: any };
    projectMode?: 'horticulture' | 'garden' | 'field-crop' | 'greenhouse';
    showPump?: boolean;
    simultaneousZonesCount?: number;
    zoneOperationGroups?: ZoneOperationGroup[];
    getZoneName?: (zoneId: string) => string;
    fieldCropData?: any;
    greenhouseData?: any;
    gardenStats?: any; // เพิ่มสำหรับ garden mode
}

const CalculationSummary: React.FC<CalculationSummaryProps> = ({
    results,
    input,
    selectedSprinkler,
    activeZone,
    selectedZones = [],
    allZoneSprinklers,
    projectMode = 'horticulture',
    showPump = true,
    simultaneousZonesCount = 1,
    zoneOperationGroups = [],
    getZoneName = (id) => id,
    fieldCropData,
    greenhouseData,
    gardenStats,
}) => {
    const { t } = useLanguage();
    const actualPump = results.autoSelectedPump;
    const actualBranchPipe = results.autoSelectedBranchPipe;
    const actualSecondaryPipe = results.autoSelectedSecondaryPipe;
    const actualMainPipe = results.autoSelectedMainPipe;
    const actualEmitterPipe = results.autoSelectedEmitterPipe;

    // Debug logging for field-crop mode
    useEffect(() => {
        if (projectMode === 'field-crop') {
            console.log('🔍 CalculationSummary field-crop debug:');
            console.log('- results.totalWaterRequiredLPM:', results.totalWaterRequiredLPM);
            console.log('- results.totalSprinklers:', results.totalSprinklers);
            console.log('- input.waterPerTreeLiters:', input.waterPerTreeLiters);
            console.log('- input.totalTrees:', input.totalTrees);
            console.log('- input object:', input);
        }
    }, [projectMode, results.totalWaterRequiredLPM, results.totalSprinklers, input.waterPerTreeLiters, input.totalTrees, input]);

    // ฟังก์ชันสำหรับดึงค่า Head Loss จากท่อแต่ละชนิด
    const getActualPipeHeadLoss = useCallback(() => {
        // ลองดึงข้อมูลจาก localStorage ก่อน (สำหรับทุก mode)
        try {
            // ลองดึงข้อมูลจาก greenhouse_pipe_calculations ก่อน
            if (projectMode === 'greenhouse') {
                const greenhousePipeCalculationsStr = localStorage.getItem('greenhouse_pipe_calculations');
                if (greenhousePipeCalculationsStr) {
                    const pipeCalculations = JSON.parse(greenhousePipeCalculationsStr);


                    // สำหรับ greenhouse mode ใช้เฉพาะท่อเมนหลักและท่อย่อย
                    const branchHeadLoss = pipeCalculations.branch?.headLoss || 0;
                    const mainHeadLoss = pipeCalculations.main?.headLoss || 0;

                    // greenhouse ไม่มีท่อเมนรองและท่อย่อยแยก
                    const secondaryHeadLoss = 0;
                    const emitterHeadLoss = 0;

                    // สำหรับ greenhouse mode: เฉพาะท่อเมนหลัก + ท่อย่อย
                    const totalHeadLoss = branchHeadLoss + mainHeadLoss;
                    

                    return {
                        branch: branchHeadLoss,
                        secondary: secondaryHeadLoss, // greenhouse ไม่มีท่อเมนรอง
                        main: mainHeadLoss,
                        emitter: emitterHeadLoss, // greenhouse ไม่มีท่อย่อยแยก
                        total: totalHeadLoss,
                    };
                }
            }

            // ลองดึงข้อมูลจาก field_crop_pipe_calculations
            if (projectMode === 'field-crop') {
                const fieldCropPipeCalculationsStr = localStorage.getItem('field_crop_pipe_calculations');
                if (fieldCropPipeCalculationsStr) {
                    const pipeCalculations = JSON.parse(fieldCropPipeCalculationsStr);

                    const branchHeadLoss = pipeCalculations.branch?.headLoss || 0;
                    const secondaryHeadLoss = pipeCalculations.secondary?.headLoss || 0;
                    const mainHeadLoss = pipeCalculations.main?.headLoss || 0;
                    const emitterHeadLoss = pipeCalculations.emitter?.headLoss || 0;

                    const totalHeadLoss =
                        branchHeadLoss + secondaryHeadLoss + mainHeadLoss + emitterHeadLoss;

                    console.log(`🔍 CalculationSummary field-crop Head Loss:`, {
                        branch: branchHeadLoss,
                        secondary: secondaryHeadLoss,
                        main: mainHeadLoss,
                        emitter: emitterHeadLoss,
                        total: totalHeadLoss
                    });

                    return {
                        branch: branchHeadLoss,
                        secondary: secondaryHeadLoss,
                        main: mainHeadLoss,
                        emitter: emitterHeadLoss,
                        total: totalHeadLoss,
                    };
                }
            }

            // ลองดึงข้อมูลจาก garden_pipe_calculations
            if (projectMode === 'garden') {
                const gardenPipeCalculationsStr = localStorage.getItem('garden_pipe_calculations');
                if (gardenPipeCalculationsStr) {
                    const pipeCalculations = JSON.parse(gardenPipeCalculationsStr);

                    const branchHeadLoss = pipeCalculations.branch?.headLoss || 0;
                    const secondaryHeadLoss = pipeCalculations.secondary?.headLoss || 0;
                    const mainHeadLoss = pipeCalculations.main?.headLoss || 0;
                    const emitterHeadLoss = pipeCalculations.emitter?.headLoss || 0;

                    const totalHeadLoss =
                        branchHeadLoss + secondaryHeadLoss + mainHeadLoss + emitterHeadLoss;

                    return {
                        branch: branchHeadLoss,
                        secondary: secondaryHeadLoss,
                        main: mainHeadLoss,
                        emitter: emitterHeadLoss,
                        total: totalHeadLoss,
                    };
                }
            }
        } catch (error) {
            console.error('Error loading pipe calculations from localStorage:', error);
        }

        // ลองดึงข้อมูลจาก horticulture pipe calculations
        try {
            const horticulturePipeCalculationsStr = localStorage.getItem(
                'horticulture_pipe_calculations'
            );
            if (horticulturePipeCalculationsStr) {
                const horticulturePipeCalculations = JSON.parse(horticulturePipeCalculationsStr);

                const branchHeadLoss = horticulturePipeCalculations.branch?.headLoss || 0;
                const secondaryHeadLoss = horticulturePipeCalculations.secondary?.headLoss || 0;
                const mainHeadLoss = horticulturePipeCalculations.main?.headLoss || 0;
                const emitterHeadLoss = horticulturePipeCalculations.emitter?.headLoss || 0;

                const totalHeadLoss =
                    branchHeadLoss + secondaryHeadLoss + mainHeadLoss + emitterHeadLoss;

                return {
                    branch: branchHeadLoss,
                    secondary: secondaryHeadLoss,
                    main: mainHeadLoss,
                    emitter: emitterHeadLoss,
                    total: totalHeadLoss,
                };
            }
        } catch (error) {
            console.error('Error loading horticulture pipe calculations from localStorage:', error);
        }

        // Fallback: ใช้ข้อมูลจาก auto-selected pipes
        const branchHeadLoss = actualBranchPipe?.headLoss || 0;
        const secondaryHeadLoss = actualSecondaryPipe?.headLoss || 0;
        const mainHeadLoss = actualMainPipe?.headLoss || 0;
        const emitterHeadLoss = actualEmitterPipe?.headLoss || 0;

        let totalHeadLoss;
        if (projectMode === 'greenhouse') {
            // สำหรับ greenhouse mode: ท่อเมนหลัก + ท่อย่อย
            totalHeadLoss = mainHeadLoss + branchHeadLoss;
        } else {
            // สำหรับ mode อื่นๆ: รวมทุกประเภทท่อ
            totalHeadLoss = branchHeadLoss + secondaryHeadLoss + mainHeadLoss + emitterHeadLoss;
        }

        console.log(`🔍 CalculationSummary Head Loss Fallback (${projectMode}):`, {
            branch: branchHeadLoss,
            secondary: secondaryHeadLoss,
            main: mainHeadLoss,
            emitter: emitterHeadLoss,
            total: totalHeadLoss
        });

        return {
            branch: branchHeadLoss,
            secondary: secondaryHeadLoss,
            main: mainHeadLoss,
            emitter: emitterHeadLoss,
            total: totalHeadLoss,
        };
    }, [actualBranchPipe, actualSecondaryPipe, actualMainPipe, actualEmitterPipe, projectMode]);

    const [actualHeadLoss, setActualHeadLoss] = useState(() => getActualPipeHeadLoss());
    const actualHeadLossRef = useRef(actualHeadLoss);
    
    // อัปเดต ref เมื่อ state เปลี่ยน
    useEffect(() => {
        actualHeadLossRef.current = actualHeadLoss;
    }, [actualHeadLoss]);

    // อัปเดตค่า Head Loss เมื่อมีการเปลี่ยนแปลงใน localStorage
    useEffect(() => {
        const handleStorageChange = () => {
            setActualHeadLoss(getActualPipeHeadLoss());
        };

        // ฟังการเปลี่ยนแปลงใน localStorage
        window.addEventListener('storage', handleStorageChange);

        // อัปเดตค่าเมื่อ component mount หรือเมื่อมีการเปลี่ยนแปลง
        const interval = setInterval(() => {
            const newHeadLoss = getActualPipeHeadLoss();
            // เปรียบเทียบค่าเพื่อหลีกเลี่ยงการ re-render ที่ไม่จำเป็น
            const currentHeadLossString = JSON.stringify(actualHeadLossRef.current);
            const newHeadLossString = JSON.stringify(newHeadLoss);
            
            if (currentHeadLossString !== newHeadLossString) {
                setActualHeadLoss(newHeadLoss);
            }
        }, 2000); // ลดความถี่เป็น 2 วินาที

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [getActualPipeHeadLoss, projectMode]);

    // บังคับอัปเดตข้อมูลเมื่อ projectMode เปลี่ยนเป็น greenhouse
    useEffect(() => {
        if (projectMode === 'greenhouse') {
            const newHeadLoss = getActualPipeHeadLoss();
            setActualHeadLoss(newHeadLoss);
        }
    }, [projectMode, getActualPipeHeadLoss]);

    const getEquipmentName = () => {
        switch (projectMode) {
            case 'garden':
                return t('หัวฉีด');
            case 'field-crop':
                return t('สปริงเกอร์');
            case 'greenhouse':
                return t('สปริงเกอร์');
            default:
                return t('สปริงเกอร์');
        }
    };

    const getSprinklerPressureInfo = () => {
        if (!selectedSprinkler) {
            return {
                pressure: input.pressureHeadM,
                source: 'ค่าเริ่มต้น',
            };
        }

        let minPressure, maxPressure;
        const pressureData = selectedSprinkler.pressureBar;

        if (Array.isArray(pressureData)) {
            minPressure = pressureData[0];
            maxPressure = pressureData[1];
        } else if (typeof pressureData === 'string' && pressureData.includes('-')) {
            const parts = pressureData.split('-');
            minPressure = parseFloat(parts[0]);
            maxPressure = parseFloat(parts[1]);
        } else {
            minPressure = maxPressure = parseFloat(String(pressureData));
        }

        const avgPressureBar = (minPressure + maxPressure) / 2;
        const pressureM = avgPressureBar * 10.2;

        const sprinklerName = getEquipmentName();

        return {
            pressure: pressureM,
            source: `จาก${sprinklerName} (${(avgPressureBar || 0).toFixed(1)} bar)`,
            pressureBar: avgPressureBar,
        };
    };

    const pressureInfo = getSprinklerPressureInfo();

    // คำนวณ Head Loss หัวฉีด จาก แรงดัน(บาร์) * 10
    const calculateSprinklerHeadLoss = () => {
        let sprinklerPressureBar = 0;

        if (projectMode === 'horticulture') {
            // สำหรับ horticulture mode ใช้ข้อมูลจาก horticultureSystemData
            try {
                const horticultureSystemDataStr = localStorage.getItem('horticultureSystemData');
                if (horticultureSystemDataStr) {
                    const horticultureSystemData = JSON.parse(horticultureSystemDataStr);
                    if (horticultureSystemData?.sprinklerConfig?.pressureBar) {
                        sprinklerPressureBar = horticultureSystemData.sprinklerConfig.pressureBar;
                    } else {
                        // fallback ใช้ค่าจาก selectedSprinkler
                        if (selectedSprinkler && selectedSprinkler.pressureBar) {
                            if (Array.isArray(selectedSprinkler.pressureBar)) {
                                sprinklerPressureBar =
                                    (selectedSprinkler.pressureBar[0] +
                                        selectedSprinkler.pressureBar[1]) /
                                    2;
                            } else if (
                                typeof selectedSprinkler.pressureBar === 'string' &&
                                selectedSprinkler.pressureBar.includes('-')
                            ) {
                                const parts = selectedSprinkler.pressureBar.split('-');
                                sprinklerPressureBar =
                                    (parseFloat(parts[0]) + parseFloat(parts[1])) / 2;
                            } else {
                                sprinklerPressureBar = parseFloat(
                                    String(selectedSprinkler.pressureBar)
                                );
                            }
                        } else {
                            sprinklerPressureBar = 2.5; // default
                        }
                    }
                } else {
                    // fallback ใช้ค่าจาก selectedSprinkler
                    if (selectedSprinkler && selectedSprinkler.pressureBar) {
                        if (Array.isArray(selectedSprinkler.pressureBar)) {
                            sprinklerPressureBar =
                                (selectedSprinkler.pressureBar[0] +
                                    selectedSprinkler.pressureBar[1]) /
                                2;
                        } else if (
                            typeof selectedSprinkler.pressureBar === 'string' &&
                            selectedSprinkler.pressureBar.includes('-')
                        ) {
                            const parts = selectedSprinkler.pressureBar.split('-');
                            sprinklerPressureBar =
                                (parseFloat(parts[0]) + parseFloat(parts[1])) / 2;
                        } else {
                            sprinklerPressureBar = parseFloat(
                                String(selectedSprinkler.pressureBar)
                            );
                        }
                    } else {
                        sprinklerPressureBar = 2.5; // default
                    }
                }
            } catch (error) {
                console.error('Error parsing horticulture system data:', error);
                sprinklerPressureBar = 2.5; // default
            }
        } else if (projectMode === 'garden') {
            // สำหรับ garden mode ใช้ข้อมูลจาก zone
            if (gardenStats && activeZone) {
                const currentZone = gardenStats.zones.find((z: any) => z.zoneId === activeZone.id);
                if (currentZone) {
                    sprinklerPressureBar = currentZone.sprinklerPressure || 2.5;
                } else {
                    sprinklerPressureBar = 2.5; // default
                }
            } else {
                sprinklerPressureBar = 2.5; // default
            }
        } else if (projectMode === 'greenhouse') {
            // สำหรับ greenhouse mode ใช้ข้อมูลจาก plot
            if (greenhouseData && activeZone) {
                const currentPlot = greenhouseData.summary.plotStats.find((p: any) => p.plotId === activeZone.id);
                if (currentPlot) {
                    sprinklerPressureBar = 2.5; // ค่า default สำหรับ greenhouse
                } else {
                    sprinklerPressureBar = 2.5; // default
                }
            } else {
                sprinklerPressureBar = 2.5; // default
            }
        } else {
            // สำหรับ mode อื่นๆ
            if (selectedSprinkler && selectedSprinkler.pressureBar) {
                sprinklerPressureBar = parseFloat(String(selectedSprinkler.pressureBar));
            } else {
                sprinklerPressureBar = 2.5; // default
            }
        }

        return sprinklerPressureBar * 10; // แรงดัน(บาร์) * 10
    };

    const sprinklerHeadLoss = calculateSprinklerHeadLoss();

    // คำนวณ Pump Head จาก Head Loss ท่อ + Head Loss หัวฉีด
    const calculatePumpHead = () => {
        // สำหรับ greenhouse mode ใช้เฉพาะท่อเมนหลัก + ท่อย่อย
        if (projectMode === 'greenhouse') {
            const greenhouseTotalHeadLoss = (actualHeadLoss.main || 0) + (actualHeadLoss.branch || 0);
            return greenhouseTotalHeadLoss + sprinklerHeadLoss;
        }
        // สำหรับ mode อื่นๆ ใช้ค่าเดิม
        return actualHeadLoss.total + sprinklerHeadLoss;
    };

    const actualPumpHead = calculatePumpHead();

    const isMultiZone =
        selectedZones.length > 1 || (results.allZoneResults && results.allZoneResults.length > 1);

    const getItemName = () => {
        switch (projectMode) {
            case 'garden':
                return t('หัวฉีด');
            case 'field-crop':
                return t('จุดปลูก');
            case 'greenhouse':
            default:
                return t('ต้นไม้');
        }
    };

    const getAreaUnit = () => {
        return t('ไร่');
    };

    const formatArea = (area: number) => {
        const safeArea = area || 0;
        return `${safeArea.toFixed(1)} ไร่`;
    };

    const getProjectIcon = () => {
        switch (projectMode) {
            case 'garden':
                return '🏡';
            case 'field-crop':
                return '🌾';
            case 'greenhouse':
                return '🏠';
            default:
                return '🌿';
        }
    };

    const getWaterSourceLabel = () => {
        switch (projectMode) {
            case 'garden':
                return t('แหล่งน้ำ');
            case 'field-crop':
                return t('ปั๊ม');
            case 'greenhouse':
                return t('แหล่งน้ำ');
            default:
                return t('ปั๊ม');
        }
    };

    const getCurrentZoneData = () => {
        if (projectMode === 'field-crop' && fieldCropData && activeZone) {
            const zone = fieldCropData.zones.info.find((z: any) => z.id === activeZone.id);
            if (zone) {
                return {
                    name: zone.name,
                    area: zone.area,
                    itemCount: zone.totalPlantingPoints,
                    waterNeed: zone.totalWaterRequirementPerDay || 0,
                    cropType: zone.cropType,
                    estimatedYield: 0,
                    estimatedIncome: 0,
                };
            }
        }

        if (projectMode === 'greenhouse' && greenhouseData && activeZone) {
            const plot = greenhouseData.summary.plotStats.find(
                (p: any) => p.plotId === activeZone.id
            );
            if (plot) {
                return {
                    name: plot.plotName,
                    area: plot.area,
                    itemCount: plot.equipmentCount.sprinklers || plot.production.totalPlants,
                    waterNeed: plot.production.waterRequirementPerIrrigation || 0,
                    cropType: plot.cropType,
                    estimatedYield: plot.production.estimatedYield || 0,
                    estimatedIncome: plot.production.estimatedIncome || 0,
                };
            }
        }

        return activeZone
            ? {
                  name: activeZone.name,
                  area: activeZone.area,
                  itemCount: activeZone.plantCount,
                  waterNeed: activeZone.totalWaterNeed || 0,
                  cropType: activeZone.plantData?.name,
                  estimatedYield: 0,
                  estimatedIncome: 0,
              }
            : null;
    };

    const currentZoneData = getCurrentZoneData();

    const getSystemPerformance = () => {
        const performance = {
            velocityStatus: 'good' as 'good' | 'warning' | 'critical',
            headLossStatus: 'good' as 'good' | 'warning' | 'critical',
            pumpStatus: 'good' as 'good' | 'warning' | 'critical',
            overallStatus: 'good' as 'good' | 'warning' | 'critical',
        };

        const velocities = [
            results.velocity.branch,
            results.velocity.secondary,
            results.velocity.main,
            results.velocity.emitter,
        ].filter((v) => v && v > 0);

        const hasHighVelocity = velocities.some((v) => v && v > 2.5);
        const hasLowVelocity = velocities.some((v) => v && v < 0.6);
        const hasOptimalVelocity = velocities.some((v) => v && v >= 0.8 && v <= 2.0);

        if (hasHighVelocity) performance.velocityStatus = 'critical';
        else if (hasLowVelocity && !hasOptimalVelocity) performance.velocityStatus = 'warning';

        const headLossRatio = results.headLossValidation?.ratio || 0;
        const actualHeadLossRatio =
            actualHeadLoss.total > 0
                ? (actualHeadLoss.total / (input.staticHeadM + pressureInfo.pressure)) * 100
                : 0;
        if (actualHeadLossRatio > 25) performance.headLossStatus = 'critical';
        else if (actualHeadLossRatio > 20) performance.headLossStatus = 'warning';

        if (showPump && actualPump) {
            if (!actualPump.isFlowAdequate || !actualPump.isHeadAdequate) {
                performance.pumpStatus = 'critical';
            } else if (actualPump.flowRatio > 2.5 || actualPump.headRatio > 2.5) {
                performance.pumpStatus = 'warning';
            }
        }

        const statuses = [performance.velocityStatus, performance.headLossStatus];
        if (showPump) statuses.push(performance.pumpStatus);

        if (statuses.includes('critical')) performance.overallStatus = 'critical';
        else if (statuses.includes('warning')) performance.overallStatus = 'warning';

        return performance;
    };

    const systemPerformance = getSystemPerformance();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'good':
                return 'text-green-400';
            case 'warning':
                return 'text-yellow-400';
            case 'critical':
                return 'text-red-400';
            default:
                return 'text-gray-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'good':
                return '✅';
            case 'warning':
                return '⚠️';
            case 'critical':
                return '❌';
            default:
                return '❓';
        }
    };

    const getOperationModeLabel = (mode: string) => {
        switch (mode) {
            case 'sequential':
                return t('เปิดทีละโซน');
            case 'simultaneous':
                return t('เปิดพร้อมกันทุกโซน');
            case 'custom':
                return t('เปิดแบบกำหนดเอง');
            default:
                return t('โซนเดียว');
        }
    };

    const getProjectSummaryData = () => {
        if (projectMode === 'field-crop') {
            // Try to get field-crop data from props first, then from localStorage
            const fcData = fieldCropData || getEnhancedFieldCropData();
            if (fcData) {
                return {
                    totalArea: fcData.area?.sizeInRai || 0,
                    totalZones: fcData.zones?.count || 0,
                    totalItems: fcData.summary?.totalPlantingPoints || 0,
                    totalWaterNeed: fcData.summary?.totalWaterRequirementPerDay || 0,
                    totalEstimatedYield: fcData.summary?.totalEstimatedYield || 0,
                    totalEstimatedIncome: fcData.summary?.totalEstimatedIncome || 0,
                    irrigationEfficiency: fcData.summary?.irrigationEfficiency || 0,
                    totalIrrigationPoints: fcData.irrigation?.totalCount || 0,
                    irrigationByType: fcData.irrigation?.byType || {},
                };
            }
        }

        if (projectMode === 'greenhouse' && greenhouseData) {
            // คำนวณข้อมูลสรุปจาก greenhouse data
            const totalPlotArea = greenhouseData.summary?.totalPlotArea || 0;
            const totalAreaInRai = totalPlotArea / 1600; // แปลงจากตารางเมตรเป็นไร่
            
            // รวมข้อมูลจากทุกแปลง
            const plotStats = greenhouseData.summary?.plotStats || [];
            const totalPlants = plotStats.reduce((sum: number, plot: any) => 
                sum + (plot.production?.totalPlants || 0), 0);
            
            // คำนวณความต้องการน้ำรวม
            let totalDailyWaterNeed = 0;
            if (greenhouseData.summary?.waterManagement?.dailyRequirement?.optimal) {
                totalDailyWaterNeed = greenhouseData.summary.waterManagement.dailyRequirement.optimal;
            } else {
                // fallback: รวมจากแต่ละแปลง
                totalDailyWaterNeed = plotStats.reduce((sum: number, plot: any) => {
                    const waterCalc = plot.production?.waterCalculation;
                    return sum + (waterCalc?.dailyWaterNeed?.optimal || 0);
                }, 0);
            }
            
            // คำนวณผลผลิตและรายได้รวม
            const totalEstimatedYield = plotStats.reduce((sum: number, plot: any) => 
                sum + (plot.production?.estimatedYield || 0), 0);
            const totalEstimatedIncome = plotStats.reduce((sum: number, plot: any) => 
                sum + (plot.production?.estimatedIncome || 0), 0);
            
            return {
                totalArea: totalAreaInRai, // ใช้หน่วยไร่เพื่อให้สอดคล้องกับ mode อื่น
                totalZones: plotStats.length,
                totalItems: totalPlants, // จำนวนต้นไม้รวม
                totalWaterNeed: totalDailyWaterNeed, // ความต้องการน้ำต่อวัน (ลิตร)
                totalEstimatedYield: totalEstimatedYield, // ผลผลิตรวม (กิโลกรัม)
                totalEstimatedIncome: totalEstimatedIncome, // รายได้รวม (บาท)
                // เพิ่มข้อมูลเฉพาะ greenhouse
                totalGreenhouseArea: greenhouseData.summary?.totalGreenhouseArea || 0,
                totalEffectivePlantingArea: greenhouseData.summary?.totalEffectivePlantingArea || 0,
                irrigationMethod: greenhouseData.projectInfo?.irrigationMethod || 'mini-sprinkler',
            };
        }

        return null;
    };

    const projectSummaryData = getProjectSummaryData();

    return (
        <div className="space-y-6">
            <div className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                <h2 className="mb-2 text-lg font-bold text-white">
                    🎯 {t('ข้อมูลสำคัญ')}
                    {isMultiZone && currentZoneData && (
                        <span className="ml-2 text-sm font-normal">
                            ({t('โซนปัจจุบัน:')} {currentZoneData.name})
                        </span>
                    )}
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
                    <div className="text-center">
                        <p className="text-blue-200">{t('ความต้องการน้ำ')}</p>
                        <p className="text-xl font-bold">
                            {(() => {
                                if (projectMode === 'garden') {
                                    // สำหรับ garden mode ใช้ข้อมูลจาก input ต้องการน้ำ (คำนวณอัตโนมัติจาก garden statistics)
                                    return input.waterPerTreeLiters.toFixed(1);
                                } else if (projectMode === 'greenhouse') {
                                    // สำหรับ greenhouse mode ใช้ข้อมูลจาก greenhouse data
                                
                                    return (input.waterPerTreeLiters.toLocaleString(undefined, {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 2,
                                    }));
                                    
                                } else if (projectMode === 'field-crop') {
                                    // สำหรับ field-crop mode ใช้ข้อมูลจาก field crop data flow rates
                                    if (fieldCropData && activeZone) {
                                        const currentZone = fieldCropData.zones.info.find((z: any) => z.id === activeZone.id);
                                        if (currentZone?.flowRates?.lateral) {
                                            return currentZone.flowRates.lateral.toFixed(1);
                                        }
                                    }
                                    return (results.totalWaterRequiredLPM || 0).toFixed(1);
                                } else {
                                    return (results.totalWaterRequiredLPM || 0).toFixed(1);
                                }
                            })()}{' '}
                            {t('LPM')}
                        </p>
                        {currentZoneData && (
                            <p className="text-xs text-blue-100">({currentZoneData.name})</p>
                        )}
                    </div>
                    <div className="text-center">
                        <p className="text-green-200">{t('Head Loss ท่อ')}</p>
                        <p
                            className={`text-xl font-bold ${getStatusColor(systemPerformance.headLossStatus)}`}
                        >
                            {(() => {
                                // สำหรับ greenhouse mode ใช้เฉพาะท่อเมนหลัก + ท่อย่อย
                                if (projectMode === 'greenhouse') {
                                    const greenhouseTotalHeadLoss = (actualHeadLoss.main || 0) + (actualHeadLoss.branch || 0);
                                    return greenhouseTotalHeadLoss.toFixed(1);
                                }
                                // สำหรับ mode อื่นๆ ใช้ค่าเดิม
                                return actualHeadLoss.total.toFixed(1);
                            })()} m
                        </p>
                        <p className="text-xs text-green-100">
                            {projectMode === 'greenhouse' 
                                ? t('ท่อเมนหลัก + ท่อย่อย')
                                : systemPerformance.headLossStatus === 'good'
                                  ? t('เหมาะสม')
                                  : systemPerformance.headLossStatus === 'warning'
                                    ? t('ค่อนข้างสูง')
                                    : t('สูงเกินไป')}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-yellow-200">{t('Head Loss หัวฉีด')}</p>
                        <p className="text-xl font-bold text-yellow-400">
                            {sprinklerHeadLoss.toFixed(1)} m
                        </p>
                        <p className="text-xs text-yellow-100">{t('จากสูตร: แรงดัน(บาร์) × 10')}</p>
                    </div>
                    {showPump && (
                        <div className="text-center">
                            <p className="text-purple-200">{t('Pump Head')}</p>
                            <p className="text-xl font-bold text-orange-300">
                                {actualPumpHead.toFixed(1)} m
                            </p>
                            {isMultiZone && results.projectSummary && (
                                <p className="text-xs text-purple-100">
                                    ({t('ตาม')}
                                    {getOperationModeLabel(results.projectSummary.operationMode)})
                                </p>
                            )}
                        </div>
                    )}
                    <div className="text-center">
                        <p className="text-pink-200">
                            {t('จำนวน')}
                            {getEquipmentName()}
                        </p>
                        <p className="text-xl font-bold text-green-300">
                            {results.totalSprinklers} {t('หัว')}
                        </p>
                        {currentZoneData && (
                            <p className="text-xs text-pink-100">
                                ({t('ในโซน')} {currentZoneData.name})
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="rounded-lg bg-gray-700 p-6">
                <h2 className="mb-4 text-xl font-semibold text-yellow-400">
                    📊 {t('สรุปการคำนวณรายละเอียด')}
                    {currentZoneData && (
                        <span className="ml-2 text-lg font-normal text-red-400">
                            - {currentZoneData.name}
                        </span>
                    )}
                    {isMultiZone && (
                        <span className="ml-2 text-sm font-normal text-green-400">
                            ({t('โซนปัจจุบันที่กำลังตั้งค่า')})
                        </span>
                    )}
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-blue-300">
                            💧 {t('ความต้องการน้ำทั้งโซน')}
                        </h3>
                        <p className="text-lg font-bold">
                            {(() => {
                                // Always use the correct calculation: sprinkler count × water per sprinkler
                                const totalWaterRequirement = input.totalTrees * input.waterPerTreeLiters;
                                return `${totalWaterRequirement.toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                })} ${t('ลิตร/นาที')}`;
                            })()}
                        </p>
                        <div className="mt-1 space-y-1 text-sm text-gray-300">
                            <p>{t('ความต้องการน้ำทั้งโซน:')}</p>
                            <p className="text-xs text-blue-300">
                                {t('คำนวณจาก:')} {input.totalTrees} {t('หัวฉีด')} × {input.waterPerTreeLiters.toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                })} {t('ลิตร/นาที/หัว')} = {(input.totalTrees * input.waterPerTreeLiters).toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                })} {t('ลิตร/นาที')}
                            </p>
                        </div>
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-purple-300">
                            💦 {t('น้ำต่อหัว')}
                            {getEquipmentName()}
                        </h3>
                        <p className="text-lg font-bold">
                            {(() => {
                                // Always use the input value for consistency
                                return `${input.waterPerTreeLiters.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${t('ลิตร/นาที')}`;
                            })()}
                        </p>
                        <div className="mt-2 space-y-1 text-sm text-gray-300">
                            <p className="text-xs text-blue-300">
                                {t('ค่าจาก input โดยตรง:')} {input.waterPerTreeLiters.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {t('ลิตร/นาที')}
                            </p>
                        </div>
                        {selectedSprinkler && (
                            <div className="mt-2 border-t border-purple-700 pt-2">
                                <p className="text-xs text-purple-200">{selectedSprinkler.name}</p>
                                {selectedSprinkler.pressureBar && (
                                    <p className="text-xs text-gray-400">
                                        {t('แรงดัน:')}{' '}
                                        {Array.isArray(selectedSprinkler.pressureBar)
                                            ? `${selectedSprinkler.pressureBar[0]}-${selectedSprinkler.pressureBar[1]}`
                                            : selectedSprinkler.pressureBar}{' '}
                                        {t('บาร์')}
                                    </p>
                                )}
                            </div>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                            {t('สำหรับ')} {input.irrigationTimeMinutes} {t('นาที/ครั้ง')}
                        </p>
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-yellow-300">
                            ⚡ {t('อัตราการไหลแต่ละท่อ')}
                        </h3>
                        <div className="text-sm">
                            {projectMode === 'field-crop' && fieldCropData && activeZone ? (
                                (() => {
                                    const currentZone = fieldCropData.zones.info.find((z: any) => z.id === activeZone.id);
                                    if (currentZone?.flowRates) {
                                        return (
                                            <>
                                                <p>
                                                    {t('ท่อย่อย:')}{' '}
                                                    <span className="font-bold text-purple-300">
                                                        {currentZone.flowRates.lateral.toLocaleString(undefined, {
                                                            minimumFractionDigits: 0,
                                                            maximumFractionDigits: 2,
                                                        })}{' '}
                                                        {t('LPM')}
                                                    </span>
                                                </p>
                                                {currentZone.flowRates.submain > 0 && (
                                                    <p>
                                                        {t('ท่อรอง:')}{' '}
                                                        <span className="font-bold text-orange-300">
                                                            {currentZone.flowRates.submain.toLocaleString(undefined, {
                                                                minimumFractionDigits: 0,
                                                                maximumFractionDigits: 2,
                                                            })}{' '}
                                                            {t('LPM')}
                                                        </span>
                                                    </p>
                                                )}
                                                {currentZone.flowRates.main > 0 && (
                                                    <p>
                                                        {t('ท่อหลัก:')}{' '}
                                                        <span className="font-bold text-cyan-300">
                                                            {currentZone.flowRates.main.toLocaleString(undefined, {
                                                                minimumFractionDigits: 0,
                                                                maximumFractionDigits: 2,
                                                            })}{' '}
                                                            {t('LPM')}
                                                        </span>
                                                    </p>
                                                )}
                                            </>
                                        );
                                    }
                                    return null;
                                })()
                            ) : (
                                <>
                                    <p>
                                        {t('ท่อย่อย:')}{' '}
                                        <span className="font-bold text-purple-300">
                                            {results.flows.branch.toLocaleString(undefined, {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 2,
                                            })}{' '}
                                            {t('LPM')}
                                        </span>
                                    </p>
                                    {results.hasValidSecondaryPipe && (
                                        <p>
                                            {t('ท่อรอง:')}{' '}
                                            <span className="font-bold text-orange-300">
                                                {results.flows.secondary.toLocaleString(undefined, {
                                                    minimumFractionDigits: 0,
                                                    maximumFractionDigits: 2,
                                                })}{' '}
                                                {t('LPM')}
                                            </span>
                                        </p>
                                    )}
                                    {results.hasValidMainPipe && (
                                        <p>
                                            {t('ท่อหลัก:')}{' '}
                                            <span className="font-bold text-cyan-300">
                                                {results.flows.main.toLocaleString(undefined, {
                                                    minimumFractionDigits: 0,
                                                    maximumFractionDigits: 2,
                                                })}{' '}
                                                {t('LPM')}
                                            </span>
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-gray-400">{t('ตามการออกแบบระบบ')}</p>
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-red-300">
                            📉 {t('Head Loss รายละเอียด')}
                        </h3>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span>{t('หัวฉีด:')}</span>
                                <span className="font-bold text-gray-50">
                                    {sprinklerHeadLoss.toLocaleString(undefined, {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 3,
                                    })}{' '}
                                    m
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>{t('ท่อย่อย:')}</span>
                                <span className="font-bold text-gray-50">
                                    {actualHeadLoss.branch.toLocaleString(undefined, {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 3,
                                    })}{' '}
                                    m
                                </span>
                            </div>

                            {results.hasValidSecondaryPipe && actualHeadLoss.secondary > 0 && projectMode !== 'greenhouse' && (
                                <div className="flex justify-between">
                                    <span>{t('ท่อรอง:')}</span>
                                    <span className="font-bold text-gray-50">
                                        {actualHeadLoss.secondary.toLocaleString(undefined, {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 3,
                                        })}{' '}
                                        m
                                    </span>
                                </div>
                            )}
                            {((results.hasValidMainPipe && actualHeadLoss.main > 0) || (projectMode === 'greenhouse' && actualHeadLoss.main > 0)) && (
                                <div className="flex justify-between">
                                    <span>{t('ท่อหลัก:')}</span>
                                    <span className="font-bold text-gray-50">
                                        {actualHeadLoss.main.toLocaleString(undefined, {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 3,
                                        })}{' '}
                                        m
                                    </span>
                                </div>
                            )}
                            {results.hasValidEmitterPipe && actualHeadLoss.emitter > 0 && projectMode !== 'greenhouse' && (
                                <div className="flex justify-between">
                                    <span>{t('ท่อย่อยแยก:')}</span>
                                    <span className="font-bold text-gray-50">
                                        {actualHeadLoss.emitter.toLocaleString(undefined, {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 3,
                                        })}{' '}
                                        m
                                    </span>
                                </div>
                            )}
                            <div className="mt-1 border-t border-gray-500 pt-1">
                                <div className="flex justify-between">
                                    <span className="font-medium">{t('รวม:')}</span>
                                    <span
                                        className={`font-bold ${getStatusColor(systemPerformance.headLossStatus)}`}
                                    >
                                        {(() => {
                                            // สำหรับ greenhouse mode ใช้เฉพาะท่อเมนหลัก + ท่อย่อย + หัวฉีด
                                            if (projectMode === 'greenhouse') {
                                                const greenhouseTotalHeadLoss = (actualHeadLoss.main || 0) + (actualHeadLoss.branch || 0);
                                                return (greenhouseTotalHeadLoss + sprinklerHeadLoss).toLocaleString(
                                                    undefined,
                                                    { minimumFractionDigits: 0, maximumFractionDigits: 2 }
                                                );
                                            }
                                            // สำหรับ mode อื่นๆ ใช้ค่าเดิม
                                            return (actualHeadLoss.total + sprinklerHeadLoss).toLocaleString(
                                                undefined,
                                                { minimumFractionDigits: 0, maximumFractionDigits: 2 }
                                            );
                                        })()}{' '}
                                        m
                                    </span>
                                </div>
                            </div>
                        </div>
                        <hr className="mt-1 border-gray-500" />
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-cyan-300">
                            🌊 {t('ความเร็วน้ำ')} ({t('m/s')})
                        </h3>
                        <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between">
                                <span>{t('ย่อย:')}</span>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`font-bold ${
                                            results.velocity.branch > 2.5
                                                ? 'text-red-400'
                                                : results.velocity.branch < 0.3
                                                  ? 'text-blue-400'
                                                  : results.velocity.branch > 0.8 &&
                                                      results.velocity.branch <= 2.0
                                                    ? 'text-green-400'
                                                    : 'text-yellow-400'
                                        }`}
                                    >
                                        {results.velocity.branch.toLocaleString(undefined, {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 2,
                                        })}
                                    </span>
                                    <span className="text-xs">
                                        (
                                        {results.flows.branch.toLocaleString(undefined, {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0,
                                        })}{' '}
                                        LPM)
                                    </span>
                                </div>
                            </div>
                            {results.hasValidSecondaryPipe && (
                                <div className="flex items-center justify-between">
                                    <span>{t('รอง:')}</span>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`font-bold ${
                                                results.velocity.secondary > 2.5
                                                    ? 'text-red-400'
                                                    : results.velocity.secondary < 0.3
                                                      ? 'text-blue-400'
                                                      : results.velocity.secondary > 0.8 &&
                                                          results.velocity.secondary <= 2.0
                                                        ? 'text-green-400'
                                                        : 'text-yellow-400'
                                            }`}
                                        >
                                            {results.velocity.secondary.toLocaleString(undefined, {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 2,
                                            })}
                                        </span>
                                        <span className="text-xs">
                                            (
                                            {results.flows.secondary.toLocaleString(undefined, {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                            })}{' '}
                                            LPM)
                                        </span>
                                    </div>
                                </div>
                            )}
                            {results.hasValidMainPipe && (
                                <div className="flex items-center justify-between">
                                    <span>{t('หลัก:')}</span>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`font-bold ${
                                                results.velocity.main > 2.5
                                                    ? 'text-red-400'
                                                    : results.velocity.main < 0.3
                                                      ? 'text-blue-400'
                                                      : results.velocity.main > 0.8 &&
                                                          results.velocity.main <= 2.0
                                                        ? 'text-green-400'
                                                        : 'text-yellow-400'
                                            }`}
                                        >
                                            {results.velocity.main.toLocaleString(undefined, {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 2,
                                            })}
                                        </span>
                                        <span className="text-xs">
                                            (
                                            {results.flows.main.toLocaleString(undefined, {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                            })}{' '}
                                            LPM)
                                        </span>
                                    </div>
                                </div>
                            )}
                            {results.hasValidEmitterPipe && (
                                <div className="flex items-center justify-between">
                                    <span>{t('ย่อยแยก:')}</span>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`font-bold ${
                                                (results.velocity.emitter || 0) > 2.5
                                                    ? 'text-red-400'
                                                    : (results.velocity.emitter || 0) < 0.3
                                                      ? 'text-blue-400'
                                                      : (results.velocity.emitter || 0) > 0.8 &&
                                                          (results.velocity.emitter || 0) <= 2.0
                                                        ? 'text-green-400'
                                                        : 'text-yellow-400'
                                            }`}
                                        >
                                            {results.velocity.emitter?.toLocaleString(undefined, {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 2,
                                            }) || '0.00'}
                                        </span>
                                        <span className="text-xs">
                                            (
                                            {(results.flows.emitter || 0).toLocaleString(
                                                undefined,
                                                {
                                                    minimumFractionDigits: 0,
                                                    maximumFractionDigits: 0,
                                                }
                                            )}{' '}
                                            LPM)
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-2 border-t border-gray-500 pt-2">
                            <p className="text-xs text-gray-400">
                                {t('แนะนำ:')} 0.8-2.0 {t('m/s')}
                            </p>
                            <p className="flex items-center gap-1 text-xs text-cyan-200">
                                <span>{t('สถานะ:')}</span>
                                <span>{getStatusIcon(systemPerformance.velocityStatus)}</span>
                                <span>
                                    {systemPerformance.velocityStatus === 'good'
                                        ? t('เหมาะสม')
                                        : systemPerformance.velocityStatus === 'warning'
                                          ? t('ควรปรับ')
                                          : t('ต้องปรับ')}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalculationSummary;
