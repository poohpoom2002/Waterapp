// resources\js\pages\components\CalculationSummary.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { CalculationResults, IrrigationInput } from '../types/interfaces';
import { Zone } from '../../utils/horticultureUtils';
import { useLanguage } from '../../contexts/LanguageContext';

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
}) => {
    const { t } = useLanguage();
    const actualPump = results.autoSelectedPump;
    const actualBranchPipe = results.autoSelectedBranchPipe;
    const actualSecondaryPipe = results.autoSelectedSecondaryPipe;
    const actualMainPipe = results.autoSelectedMainPipe;

    const isMultiZone =
        selectedZones.length > 1 || (results.allZoneResults && results.allZoneResults.length > 1);

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

    const getItemName = () => {
        switch (projectMode) {
            case 'garden':
                return t('หัวฉีด');
            case 'field-crop':
                return t('จุดปลูก');
            case 'greenhouse':
                return t('หัวฉีด');
            default:
                return t('ต้นไม้');
        }
    };

    const getAreaUnit = () => {
        switch (projectMode) {
            case 'garden':
                return t('ตร.ม.');
            case 'greenhouse':
                return t('ตร.ม.');
            default:
                return t('ไร่');
        }
    };

    const formatArea = (area: number) => {
        const safeArea = area || 0;
        switch (projectMode) {
            case 'garden':
            case 'greenhouse':
                return safeArea >= 1600 
                    ? `${(safeArea / 1600).toFixed(1)} ไร่`
                    : `${safeArea.toFixed(2)} ตร.ม.`;
            default:
                return safeArea >= 1600 
                    ? `${(safeArea / 1600).toFixed(1)} ไร่`
                    : `${safeArea.toFixed(2)} ตร.ม.`;
        }
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
                    estimatedYield: 0, // จะคำนวณจาก crop data
                    estimatedIncome: 0, // จะคำนวณจาก crop data
                };
            }
        }
        
        if (projectMode === 'greenhouse' && greenhouseData && activeZone) {
            const plot = greenhouseData.summary.plotStats.find((p: any) => p.plotId === activeZone.id);
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

        return activeZone ? {
            name: activeZone.name,
            area: activeZone.area,
            itemCount: activeZone.plantCount,
            waterNeed: activeZone.totalWaterNeed || 0,
            cropType: activeZone.plantData?.name,
            estimatedYield: 0,
            estimatedIncome: 0,
        } : null;
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
        ].filter((v) => v > 0);

        const hasHighVelocity = velocities.some((v) => v > 2.5);
        const hasLowVelocity = velocities.some((v) => v < 0.6);
        const hasOptimalVelocity = velocities.some((v) => v >= 0.8 && v <= 2.0);

        if (hasHighVelocity) performance.velocityStatus = 'critical';
        else if (hasLowVelocity && !hasOptimalVelocity) performance.velocityStatus = 'warning';

        const headLossRatio = results.headLossValidation?.ratio || 0;
        if (headLossRatio > 25) performance.headLossStatus = 'critical';
        else if (headLossRatio > 20) performance.headLossStatus = 'warning';

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
        if (projectMode === 'field-crop' && fieldCropData) {
            return {
                totalArea: fieldCropData.area.size,
                totalZones: fieldCropData.zones.count,
                totalItems: fieldCropData.summary.totalPlantingPoints,
                totalWaterNeed: fieldCropData.summary.totalWaterRequirementPerDay,
                totalEstimatedYield: fieldCropData.summary.totalEstimatedYield,
                totalEstimatedIncome: fieldCropData.summary.totalEstimatedIncome,
            };
        }
        
        if (projectMode === 'greenhouse' && greenhouseData) {
            return {
                totalArea: greenhouseData.summary.totalPlotArea,
                totalZones: greenhouseData.summary.plotStats.length,
                totalItems: greenhouseData.summary.overallProduction.totalPlants,
                totalWaterNeed: greenhouseData.summary.overallProduction.waterRequirementPerDay,
                totalEstimatedYield: greenhouseData.summary.overallProduction.estimatedYield || 0,
                totalEstimatedIncome: greenhouseData.summary.overallProduction.estimatedIncome || 0,
            };
        }

        return null;
    };

    const projectSummaryData = getProjectSummaryData();

    return (
        <div className="space-y-6">
            {/* แสดงข้อมูลโซนปัจจุบัน */}
            {currentZoneData && (
                <div className="rounded-lg bg-purple-900 p-4">
                    <h3 className="mb-2 text-lg font-bold text-purple-300">
                        {getProjectIcon()} {t('ข้อมูลโซนปัจจุบัน:')} {currentZoneData.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                        <div>
                            <p className="text-purple-200">{t('พื้นที่:')}</p>
                            <p className="font-medium text-white">{formatArea(currentZoneData.area || 0)}</p>
                        </div>
                        <div>
                            <p className="text-purple-200">
                                {t('จำนวน')}{getItemName()}:
                            </p>
                            <p className="font-medium text-white">
                                {(currentZoneData.itemCount || 0).toLocaleString()} {getItemName()}
                            </p>
                        </div>
                        <div>
                            <p className="text-purple-200">{t('ความต้องการน้ำ:')}</p>
                            <p className="font-medium text-white">
                                {(currentZoneData.waterNeed || 0).toFixed(0)} {t('ลิตร/ครั้ง')}
                            </p>
                        </div>
                        {currentZoneData.cropType && (
                            <div>
                                <p className="text-purple-200">{t('พืชที่ปลูก:')}</p>
                                <p className="font-medium text-white">{currentZoneData.cropType}</p>
                            </div>
                        )}
                    </div>
                    
                    {/* แสดงข้อมูลการผลิตสำหรับ field-crop และ greenhouse */}
                    {(projectMode === 'field-crop' || projectMode === 'greenhouse') && 
                     ((currentZoneData.estimatedYield || 0) > 0 || (currentZoneData.estimatedIncome || 0) > 0) && (
                        <div className="mt-3 grid grid-cols-2 gap-4 border-t border-purple-700 pt-3">
                            {(currentZoneData.estimatedYield || 0) > 0 && (
                                <div>
                                    <p className="text-purple-200">{t('ผลผลิตประมาณ:')}</p>
                                    <p className="font-medium text-green-300">
                                        {(currentZoneData.estimatedYield || 0).toLocaleString()} {t('กก.')}
                                    </p>
                                </div>
                            )}
                            {(currentZoneData.estimatedIncome || 0) > 0 && (
                                <div>
                                    <p className="text-purple-200">{t('รายได้ประมาณ:')}</p>
                                    <p className="font-medium text-green-300">
                                        {(currentZoneData.estimatedIncome || 0).toLocaleString()} {t('บาท')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="mt-2 rounded bg-purple-800 p-2">
                        <p className="text-xs text-purple-200">
                            💡 {t('ข้อมูลข้างต้นเป็นของโซน')} {currentZoneData.name} {t('ที่กำลังตั้งค่า')}
                        </p>
                    </div>
                </div>
            )}

            {/* แสดงข้อมูลสรุปโครงการสำหรับ field-crop และ greenhouse */}
            {projectSummaryData && (
                <div className="rounded-lg bg-blue-900 p-4">
                    <h3 className="mb-3 text-lg font-bold text-blue-300">
                        📊 {t('สรุปโครงการทั้งหมด')} 
                        {projectMode === 'field-crop' ? t(' (พืชไร่)') : 
                         projectMode === 'greenhouse' ? t(' (โรงเรือน)') : ''}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                        <div>
                            <p className="text-blue-200">{t('พื้นที่รวม:')}</p>
                            <p className="font-bold text-white">{formatArea(projectSummaryData.totalArea)}</p>
                        </div>
                        <div>
                            <p className="text-blue-200">
                                {projectMode === 'greenhouse' ? t('จำนวนแปลง:') : t('จำนวนโซน:')}
                            </p>
                            <p className="font-bold text-white">{projectSummaryData.totalZones}</p>
                        </div>
                        <div>
                            <p className="text-blue-200">{t('จำนวน')}{getItemName()}{t('รวม:')}</p>
                            <p className="font-bold text-white">
                                {(projectSummaryData.totalItems || 0).toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-blue-200">{t('น้ำรวม:')}</p>
                            <p className="font-bold text-white">
                                {(projectSummaryData.totalWaterNeed || 0).toLocaleString()} {t('ลิตร')}
                                {'/ครั้ง'}
                            </p>
                        </div>
                    </div>

                    {/* แสดงข้อมูลการผลิตรวม */}
                    {((projectSummaryData.totalEstimatedYield || 0) > 0 || (projectSummaryData.totalEstimatedIncome || 0) > 0) && (
                        <div className="mt-3 grid grid-cols-2 gap-4 border-t border-blue-700 pt-3">
                            {(projectSummaryData.totalEstimatedYield || 0) > 0 && (
                                <div>
                                    <p className="text-blue-200">{t('ผลผลิตรวม:')}</p>
                                    <p className="font-bold text-green-300">
                                        {(projectSummaryData.totalEstimatedYield || 0).toLocaleString()} {t('กก.')}
                                    </p>
                                </div>
                            )}
                            {(projectSummaryData.totalEstimatedIncome || 0) > 0 && (
                                <div>
                                    <p className="text-blue-200">{t('รายได้รวม:')}</p>
                                    <p className="font-bold text-green-300">
                                        {(projectSummaryData.totalEstimatedIncome || 0).toLocaleString()} {t('บาท')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* แสดงสถานะการเลือกอุปกรณ์อัตโนมัติ */}
            <div className="rounded-lg bg-gradient-to-r from-green-600 to-blue-600 p-4">
                <h2 className="mb-2 text-lg font-bold text-white">
                    🤖 {t('อุปกรณ์ที่เลือก')}
                    {isMultiZone && currentZoneData && (
                        <span className="ml-2 text-sm font-normal">
                            ({t('โซนปัจจุบัน:')} {currentZoneData.name})
                        </span>
                    )}
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4"> 
                    <div className="text-center">
                        <p className="text-blue-200">{t('ท่อย่อย')}</p>
                        <p
                            className={`text-xl font-bold ${actualBranchPipe?.isRecommended
                                    ? 'text-green-300'
                                    : actualBranchPipe?.isGoodChoice
                                        ? 'text-yellow-300'
                                        : 'text-orange-300'
                                }`}
                        >
                            {actualBranchPipe ? `${actualBranchPipe.sizeMM}mm` : t('ไม่มี')}
                        </p>
                        <p className="text-xs text-blue-100">
                            {actualBranchPipe?.isRecommended
                                ? t('🌟 แนะนำ')
                                : actualBranchPipe?.isGoodChoice
                                    ? t('✅ ดี')
                                    : actualBranchPipe
                                        ? t('⚡ ใช้ได้')
                                        : t('❌ ไม่มี')}
                        </p>
                        <p className="text-xs text-blue-200">
                            {t('คะแนน:')} {actualBranchPipe?.score || t('N/A')}/{t('100')}
                        </p>
                    </div>

                    {results.hasValidSecondaryPipe && (
                        <div className="text-center">
                            <p className="text-orange-200">{t('ท่อรอง')}</p>
                            <p
                                className={`text-xl font-bold ${actualSecondaryPipe?.isRecommended
                                        ? 'text-green-300'
                                        : actualSecondaryPipe?.isGoodChoice
                                            ? 'text-yellow-300'
                                            : 'text-orange-300'
                                    }`}
                            >
                                {actualSecondaryPipe ? `${actualSecondaryPipe.sizeMM}mm` : t('ไม่มี')}
                            </p>
                            <p className="text-xs text-orange-100">
                                {actualSecondaryPipe?.isRecommended
                                    ? t('🌟 แนะนำ')
                                    : actualSecondaryPipe?.isGoodChoice
                                        ? t('✅ ดี')
                                        : actualSecondaryPipe
                                            ? t('⚡ ใช้ได้')
                                            : t('❌ ไม่มี')}
                            </p>
                            <p className="text-xs text-orange-200">
                                {t('คะแนน:')} {actualSecondaryPipe?.score || t('N/A')}/{t('100')}
                            </p>
                        </div>
                    )}

                    {results.hasValidMainPipe && (
                        <div className="text-center">
                            <p className="text-cyan-200">{t('ท่อหลัก')}</p>
                            <p
                                className={`text-xl font-bold ${actualMainPipe?.isRecommended
                                        ? 'text-green-300'
                                        : actualMainPipe?.isGoodChoice
                                            ? 'text-yellow-300'
                                            : 'text-orange-300'
                                    }`}
                            >
                                {actualMainPipe ? `${actualMainPipe.sizeMM}mm` : t('ไม่มี')}
                            </p>
                            <p className="text-xs text-cyan-100">
                                {actualMainPipe?.isRecommended
                                    ? t('🌟 แนะนำ')
                                    : actualMainPipe?.isGoodChoice
                                        ? t('✅ ดี')
                                        : actualMainPipe
                                            ? t('⚡ ใช้ได้')
                                            : t('❌ ไม่มี')}
                            </p>
                            <p className="text-xs text-cyan-200">
                                {t('คะแนน:')} {actualMainPipe?.score || t('N/A')}/{t('100')}
                            </p>
                        </div>
                    )}

                    {showPump && (
                        <div className="text-center">
                            <p className="text-red-200">{t('ปั๊ม (ทั้งโปรเจค)')}</p>
                            <p
                                className={`text-xl font-bold ${actualPump?.isRecommended
                                        ? 'text-green-300'
                                        : actualPump?.isGoodChoice
                                            ? 'text-yellow-300'
                                            : 'text-orange-300'
                                    }`}
                            >
                                {actualPump ? `${actualPump.powerHP}HP` : t('ไม่มี')}
                            </p>
                            <p className="text-xs text-red-100">
                                {actualPump?.isRecommended
                                    ? t('🌟 แนะนำ')
                                    : actualPump?.isGoodChoice
                                        ? t('✅ ดี')
                                        : actualPump
                                            ? t('⚡ ใช้ได้')
                                            : t('❌ ไม่มี')}
                            </p>
                            <p className="text-xs text-red-200">
                                {t('คะแนน:')} {actualPump?.score || t('N/A')}/{t('100')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* แสดงข้อมูลสำคัญของโซนปัจจุบัน */}
            <div className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                <h2 className="mb-2 text-lg font-bold text-white">
                    🎯 {t('ข้อมูลสำคัญ')}
                    {isMultiZone && currentZoneData && (
                        <span className="ml-2 text-sm font-normal">
                            ({t('โซนปัจจุบัน:')} {currentZoneData.name})
                        </span>
                    )}
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <div className="text-center">
                        <p className="text-blue-200">{t('ความต้องการน้ำ')}</p>
                        <p className="text-xl font-bold">
                            {(results.totalWaterRequiredLPM || 0).toFixed(1)} {t('LPM')}
                        </p>
                        {currentZoneData && <p className="text-xs text-blue-100">({currentZoneData.name})</p>}
                    </div>
                    <div className="text-center">
                        <p className="text-green-200">{t('Head Loss รวม')}</p>
                        <p
                            className={`text-xl font-bold ${getStatusColor(systemPerformance.headLossStatus)}`}
                        >
                            {(results.headLoss?.total || 0).toFixed(1)} m
                        </p>
                        <p className="text-xs text-green-100">
                            {systemPerformance.headLossStatus === 'good'
                                ? t('เหมาะสม')
                                : systemPerformance.headLossStatus === 'warning'
                                    ? t('ค่อนข้างสูง')
                                    : t('สูงเกินไป')}
                        </p>
                    </div>
                    {showPump && (
                        <div className="text-center">
                            <p className="text-purple-200">{t('Pump Head')}</p>
                            <p className="text-xl font-bold text-orange-300">
                                {(results.pumpHeadRequired || 0).toFixed(1)} m
                            </p>
                            {isMultiZone && results.projectSummary && (
                                <p className="text-xs text-purple-100">
                                    ({t('ตาม')}
                                    {getOperationModeLabel(results.projectSummary.operationMode)})
                                </p>
                            )}
                            <p className="text-xs text-purple-100">
                                {t('Safety Factor:')} {(results.safetyFactor || 0).toFixed(2)}x
                            </p>
                        </div>
                    )}
                    <div className="text-center">
                        <p className="text-pink-200">
                            {t('จำนวน')}{getEquipmentName()}
                        </p>
                        <p className="text-xl font-bold text-green-300">
                            {results.totalSprinklers} {t('หัว')}
                        </p>
                        {currentZoneData && (
                            <p className="text-xs text-pink-100">({t('ในโซน')} {currentZoneData.name})</p>
                        )}
                    </div>
                </div>
            </div>

            {/* แสดงข้อมูลสรุปโปรเจคสำหรับหลายโซน */}
            {isMultiZone && results.projectSummary && (
                <div className="rounded-lg bg-blue-900 p-4">
                    <h3 className="mb-3 text-lg font-bold text-blue-300">
                        📊 {t('สรุปโปรเจคทั้งหมด')} ({results.allZoneResults?.length || 0} {t('โซน')})
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                        <div>
                            <p className="text-blue-200">{t('รูปแบบการเปิด:')}</p>
                            <p className="font-bold text-white">
                                {getOperationModeLabel(results.projectSummary.operationMode)}
                            </p>
                        </div>
                        <div>
                            <p className="text-blue-200">{t('อัตราการไหลรวม:')}</p>
                            <p className="font-bold text-white">
                                {(results.projectSummary?.totalFlowLPM || 0).toFixed(1)} LPM
                            </p>
                        </div>
                        <div>
                            <p className="text-blue-200">{t('Head สูงสุด:')}</p>
                            <p className="font-bold text-white">
                                {(results.projectSummary?.maxHeadM || 0).toFixed(1)} เมตร
                            </p>
                        </div>
                        <div>
                            <p className="text-blue-200">{t('โซนที่ต้องการ Head สูงสุด:')}</p>
                            <p className="font-bold text-white">
                                {getZoneName(results.projectSummary.criticalZone)}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 rounded bg-blue-800 p-2">
                        <h4 className="text-sm font-medium text-blue-300">💧 {t('การคำนวณปั๊ม:')}</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs text-blue-200">
                            <p>
                                {t('Flow ที่ต้องการ:')} {' '} {(results.projectSummary?.selectedGroupFlowLPM || 0).toFixed(1)} {t('LPM')}
                            </p>
                            <p>
                                {t('Head ที่ต้องการ:')} {' '}
                                {(results.projectSummary?.selectedGroupHeadM || 0).toFixed(1)} {t('เมตร')}
                            </p>
                        </div>
                        {results.projectSummary.criticalGroup && (
                            <p className="mt-1 text-xs text-blue-300">
                                {t('จากกลุ่ม:')} {results.projectSummary.criticalGroup.label}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* แสดงข้อมูลโซนย่อยสำหรับหลายโซน */}
            {isMultiZone && results.allZoneResults && results.allZoneResults.length > 0 && (
                <div className="rounded-lg bg-gray-800 p-4">
                    <h3 className="mb-3 text-lg font-bold text-gray-300">🔍 {t('รายละเอียดแต่ละโซน')}</h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {results.allZoneResults.map((zoneResult, index) => (
                            <div key={zoneResult.zoneId} className="rounded bg-gray-700 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <h4 className="font-medium text-white">
                                        {getZoneName(zoneResult.zoneId)}
                                        {zoneResult.zoneId === currentZoneData?.name && (
                                            <span className="ml-2 text-xs text-green-400">
                                                ({t('กำลังดู')})
                                            </span>
                                        )}
                                    </h4>
                                    <div className="text-xs text-gray-400">
                                        {zoneResult.sprinklerCount}{' '}
                                        {t('หัว')}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                                    <div>
                                        <p>{t('Flow:')} {zoneResult.totalFlowLPM.toFixed(1)} {t('LPM')}</p>
                                        <p>{t('Static Head:')} {zoneResult.staticHead.toFixed(1)} {t('ม.')}</p>
                                    </div>
                                    <div>
                                        <p>{t('Head Loss:')} {zoneResult.headLoss.total.toFixed(1)} {t('ม.')}</p>
                                        <p>
                                            {t('Total Head:')} {' '}
                                            <span className="font-bold text-yellow-300">
                                                {zoneResult.totalHead.toFixed(1)} {t('ม.')}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                {zoneResult.zoneId === results.projectSummary?.criticalZone && (
                                    <div className="mt-1 text-xs text-red-300">
                                        ⭐ {t('โซนที่ต้องการ Head สูงสุด')}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}


            <div className="rounded-lg bg-gradient-to-r from-gray-800 to-gray-700 p-4">
                <h3 className="mb-3 text-lg font-bold text-white">
                    📊 {t('ประสิทธิภาพระบบ')}
                    <span className={`ml-2 ${getStatusColor(systemPerformance.overallStatus)}`}>
                        {getStatusIcon(systemPerformance.overallStatus)}
                    </span>
                    {isMultiZone && currentZoneData && (
                        <span className="ml-2 text-sm font-normal">({t('โซนปัจจุบัน:')} {currentZoneData.name})</span>
                    )}
                </h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="text-center">
                        <div
                            className={`text-xl font-bold ${getStatusColor(systemPerformance.velocityStatus)}`}
                        >
                            {getStatusIcon(systemPerformance.velocityStatus)}
                        </div>
                        <p className="text-sm text-gray-300">{t('ความเร็วน้ำ')}</p>
                        <p className="text-xs text-gray-400">0.3-2.5 {t('m/s')}</p>
                    </div>
                    <div className="text-center">
                        <div
                            className={`text-xl font-bold ${getStatusColor(systemPerformance.headLossStatus)}`}
                        >
                            {getStatusIcon(systemPerformance.headLossStatus)}
                        </div>
                        <p className="text-sm text-gray-300">{t('Head Loss')}</p>
                        <p className="text-xs text-gray-400">
                            {results.headLoss.total.toFixed(1)} {t('m')}
                        </p>
                    </div>
                    {showPump && (
                        <div className="text-center">
                            <div
                                className={`text-xl font-bold ${getStatusColor(systemPerformance.pumpStatus)}`}
                            >
                                {getStatusIcon(systemPerformance.pumpStatus)}
                            </div>
                            <p className="text-sm text-gray-300">{t('ปั๊มน้ำ')}</p>
                            <p className="text-xs text-gray-400">
                                {actualPump?.powerHP || t('N/A')} {t('HP')}
                            </p>
                        </div>
                    )}
                    <div className="text-center">
                        <div className="text-xl font-bold text-blue-400">💰</div>
                        <p className="text-sm text-gray-300">{t('ประมาณการ')}</p>
                        <p className="text-xs text-gray-400">{t('ตามโซนปัจจุบัน')}</p>
                    </div>
                </div>
            </div>

            {/* แสดงข้อมูลรายละเอียดโซนปัจจุบัน */}
            <div className="rounded-lg bg-gray-700 p-6">
                <h2 className="mb-4 text-xl font-semibold text-yellow-400">
                    📊 {t('สรุปการคำนวณรายละเอียด')}
                    {currentZoneData && (
                        <span className="ml-2 text-sm font-normal text-gray-400">
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
                        <h3 className="mb-2 font-medium text-blue-300">💧 {t('ความต้องการน้ำรวม')}</h3>
                        <p className="text-lg font-bold">
                            {results.totalWaterRequiredLPM.toFixed(1)} {t('ลิตร/นาที')}
                        </p>
                        <p className="text-sm text-gray-300">
                            + {t('Safety Factor')} {(results.safetyFactor * 100 - 100).toFixed(0)}%
                        </p>
                        <p className="text-sm font-bold text-green-300">
                            {results.adjustedFlow.toFixed(1)} {t('ลิตร/นาที')}
                        </p>
                        {currentZoneData && (
                            <p className="mt-1 text-xs text-blue-200">
                                {t('สำหรับโซน')} {currentZoneData.name}
                            </p>
                        )}
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-purple-300">
                            🚰 {t('น้ำต่อหัว')}{getEquipmentName()}
                        </h3>
                        <p className="text-lg font-bold">
                            {results.waterPerSprinklerLPM.toFixed(1)} {t('ลิตร/นาที')}
                        </p>
                        <p className="text-sm text-gray-300">
                            ({results.waterPerSprinklerLPM.toFixed(3)} {t('ลิตร/นาที')})
                        </p>
                        {selectedSprinkler && (
                            <p className="mt-1 text-xs text-purple-200">{selectedSprinkler.name}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                            {t('สำหรับ')} {input.irrigationTimeMinutes} {t('นาที/ครั้ง')}
                        </p>
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-yellow-300">⚡ {t('อัตราการไหลแต่ละท่อ')}</h3>
                        <div className="text-sm">
                            <p>
                                {t('ท่อย่อย:')} {' '}
                                <span className="font-bold text-purple-300">
                                    {results.flows.branch.toFixed(1)} {t('LPM')}
                                </span>
                            </p>
                            {results.hasValidSecondaryPipe && (
                                <p>
                                    {t('ท่อรอง:')} {' '}
                                    <span className="font-bold text-orange-300">
                                        {results.flows.secondary.toFixed(1)} {t('LPM')}
                                    </span>
                                </p>
                            )}
                            {results.hasValidMainPipe && (
                                <p>
                                    {t('ท่อหลัก:')} {' '}
                                    <span className="font-bold text-cyan-300">
                                        {results.flows.main.toFixed(1)} {t('LPM')}
                                    </span>
                                </p>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-gray-400">{t('ตามการออกแบบระบบ')}</p>
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-red-300">📉 {t('Head Loss รายละเอียด')}</h3>
                        <div className="text-sm">
                            <p>
                                {t('Major Loss:')} {' '}
                                <span className="font-bold text-red-400">
                                    {results.headLoss.totalMajor.toFixed(2)} m
                                </span>
                            </p>
                            <p>
                                {t('Minor Loss:')} {' '}
                                <span className="font-bold text-orange-400">
                                    {results.headLoss.totalMinor.toFixed(2)} m
                                </span>
                            </p>
                            <p>
                                {t('รวม:')} {' '}
                                <span
                                    className={`font-bold ${getStatusColor(systemPerformance.headLossStatus)}`}
                                >
                                    {results.headLoss.total.toFixed(1)} m
                                </span>
                            </p>
                        </div>
                        <div className="mt-2 text-xs text-gray-300">
                            <p>{t('ย่อย:')} {results.headLoss.branch.total.toFixed(1)}m</p>
                            {results.hasValidSecondaryPipe && (
                                <p>{t('รอง:')} {results.headLoss.secondary.total.toFixed(1)}m</p>
                            )}
                            {results.hasValidMainPipe && (
                                <p>{t('หลัก:')} {results.headLoss.main.total.toFixed(1)}m</p>
                            )}
                        </div>
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-cyan-300">🌊 {t('ความเร็วน้ำ')} ({t('m/s')})</h3>
                        <div className="text-sm">
                            <p>
                                {t('ย่อย:')} {' '}
                                <span
                                    className={`font-bold ${results.velocity.branch > 2.5
                                            ? 'text-red-400'
                                            : results.velocity.branch < 0.3
                                                ? 'text-blue-400'
                                                : 'text-green-400'
                                        }`}
                                >
                                    {results.velocity.branch.toFixed(2)}
                                </span>
                            </p>
                            {results.hasValidSecondaryPipe && (
                                <p>
                                    {t('รอง:')} {' '}
                                    <span
                                        className={`font-bold ${results.velocity.secondary > 2.5
                                                ? 'text-red-400'
                                                : results.velocity.secondary < 0.3
                                                    ? 'text-blue-400'
                                                    : 'text-green-400'
                                            }`}
                                    >
                                        {results.velocity.secondary.toFixed(2)}
                                    </span>
                                </p>
                            )}
                            {results.hasValidMainPipe && (
                                <p>
                                    {t('หลัก:')} {' '}
                                    <span
                                        className={`font-bold ${results.velocity.main > 2.5
                                                ? 'text-red-400'
                                                : results.velocity.main < 0.3
                                                    ? 'text-blue-400'
                                                    : 'text-green-400'
                                            }`}
                                    >
                                        {results.velocity.main.toFixed(2)}
                                    </span>
                                </p>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-gray-400">{t('แนะนำ:')} 0.8-2.0 {t('m/s')}</p>
                        <p className="mt-1 text-xs text-cyan-200">
                            {t('สถานะ:')} {getStatusIcon(systemPerformance.velocityStatus)}
                            {systemPerformance.velocityStatus === 'good'
                                ? t('เหมาะสม')
                                : systemPerformance.velocityStatus === 'warning'
                                    ? t('ควรปรับ')
                                    : t('ต้องปรับ')}
                        </p>
                    </div>

                    

                </div>
            </div>
        </div>
    );
};

export default CalculationSummary;