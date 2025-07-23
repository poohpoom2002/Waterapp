// resources\js\pages\components\CalculationSummary.tsx
import React from 'react';
import { CalculationResults, IrrigationInput } from '../types/interfaces';
import { Zone } from '../../utils/horticultureUtils';

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
    projectMode?: 'horticulture' | 'garden';
    showPump?: boolean;
    simultaneousZonesCount?: number;
    zoneOperationGroups?: ZoneOperationGroup[];
    getZoneName?: (zoneId: string) => string;
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
}) => {
    const actualPump = results.autoSelectedPump;
    const actualBranchPipe = results.autoSelectedBranchPipe;
    const actualSecondaryPipe = results.autoSelectedSecondaryPipe;
    const actualMainPipe = results.autoSelectedMainPipe;

    const isMultiZone = selectedZones.length > 1 || (results.allZoneResults && results.allZoneResults.length > 1);

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

        return {
            pressure: pressureM,
            source: `จาก${projectMode === 'garden' ? 'หัวฉีด' : 'สปริงเกอร์'} (${avgPressureBar.toFixed(1)} bar)`,
            pressureBar: avgPressureBar,
        };
    };

    const pressureInfo = getSprinklerPressureInfo();

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
                return 'เปิดทีละโซน';
            case 'simultaneous':
                return 'เปิดพร้อมกันทุกโซน';
            case 'custom':
                return 'เปิดแบบกำหนดเอง';
            default:
                return 'โซนเดียว';
        }
    };

    return (
        <div className="space-y-6">
            {/* แสดงข้อมูลโซนปัจจุบัน */}
            {activeZone && (
                <div className="rounded-lg bg-purple-900 p-4">
                    <h3 className="mb-2 text-lg font-bold text-purple-300">
                        {projectMode === 'garden' ? '🏡' : '🌿'} ข้อมูลโซนปัจจุบัน: {activeZone.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                        {activeZone.area >= 1600 ? (
                            <p>พื้นที่: {(activeZone.area / 1600).toFixed(1)} ไร่</p>
                        ) : (
                            <p>พื้นที่: {activeZone.area.toFixed(2)} ตร.ม.</p>
                        )}
                        <p>
                            จำนวน{projectMode === 'garden' ? 'หัวฉีด' : 'ต้น'}:{' '}
                            {activeZone.plantCount.toLocaleString()}{' '}
                            {projectMode === 'garden' ? 'หัว' : 'ต้น'}
                        </p>
                        <p>ความต้องการน้ำ: {activeZone.totalWaterNeed.toFixed(0)} ลิตร/วัน</p>
                        {projectMode === 'horticulture' && (
                            <p>พืชที่ปลูก: {activeZone.plantData?.name || 'ไม่ระบุ'}</p>
                        )}
                    </div>
                    <div className="mt-2 rounded bg-purple-800 p-2">
                        <p className="text-xs text-purple-200">
                            💡 ข้อมูลข้างต้นเป็นของโซน {activeZone.name} ที่กำลังตั้งค่า
                        </p>
                    </div>
                </div>
            )}

            {/* แสดงสถานะการเลือกอุปกรณ์อัตโนมัติของโซนปัจจุบันก่อน */}
            <div className="rounded-lg bg-gradient-to-r from-green-600 to-blue-600 p-4">
                <h2 className="mb-2 text-lg font-bold text-white">
                    🤖 สถานะการเลือกอุปกรณ์อัตโนมัติ
                    {isMultiZone && activeZone && (
                        <span className="ml-2 text-sm font-normal">(โซนปัจจุบัน: {activeZone.name})</span>
                    )}
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <div className="text-center">
                        <p className="text-blue-200">ท่อย่อย</p>
                        <p
                            className={`text-xl font-bold ${
                                actualBranchPipe?.isRecommended
                                    ? 'text-green-300'
                                    : actualBranchPipe?.isGoodChoice
                                      ? 'text-yellow-300'
                                      : 'text-orange-300'
                            }`}
                        >
                            {actualBranchPipe ? `${actualBranchPipe.sizeMM}mm` : 'ไม่มี'}
                        </p>
                        <p className="text-xs text-blue-100">
                            {actualBranchPipe?.isRecommended
                                ? '🌟 แนะนำ'
                                : actualBranchPipe?.isGoodChoice
                                  ? '✅ ดี'
                                  : actualBranchPipe
                                    ? '⚡ ใช้ได้'
                                    : '❌ ไม่มี'}
                        </p>
                        <p className="text-xs text-blue-200">
                            คะแนน: {actualBranchPipe?.score || 'N/A'}/100
                        </p>
                    </div>

                    {results.hasValidSecondaryPipe && (
                        <div className="text-center">
                            <p className="text-orange-200">ท่อรอง</p>
                            <p
                                className={`text-xl font-bold ${
                                    actualSecondaryPipe?.isRecommended
                                        ? 'text-green-300'
                                        : actualSecondaryPipe?.isGoodChoice
                                          ? 'text-yellow-300'
                                          : 'text-orange-300'
                                }`}
                            >
                                {actualSecondaryPipe ? `${actualSecondaryPipe.sizeMM}mm` : 'ไม่มี'}
                            </p>
                            <p className="text-xs text-orange-100">
                                {actualSecondaryPipe?.isRecommended
                                    ? '🌟 แนะนำ'
                                    : actualSecondaryPipe?.isGoodChoice
                                      ? '✅ ดี'
                                      : actualSecondaryPipe
                                        ? '⚡ ใช้ได้'
                                        : '❌ ไม่มี'}
                            </p>
                            <p className="text-xs text-orange-200">
                                คะแนน: {actualSecondaryPipe?.score || 'N/A'}/100
                            </p>
                        </div>
                    )}

                    {results.hasValidMainPipe && (
                        <div className="text-center">
                            <p className="text-cyan-200">ท่อหลัก</p>
                            <p
                                className={`text-xl font-bold ${
                                    actualMainPipe?.isRecommended
                                        ? 'text-green-300'
                                        : actualMainPipe?.isGoodChoice
                                          ? 'text-yellow-300'
                                          : 'text-orange-300'
                                }`}
                            >
                                {actualMainPipe ? `${actualMainPipe.sizeMM}mm` : 'ไม่มี'}
                            </p>
                            <p className="text-xs text-cyan-100">
                                {actualMainPipe?.isRecommended
                                    ? '🌟 แนะนำ'
                                    : actualMainPipe?.isGoodChoice
                                      ? '✅ ดี'
                                      : actualMainPipe
                                        ? '⚡ ใช้ได้'
                                        : '❌ ไม่มี'}
                            </p>
                            <p className="text-xs text-cyan-200">
                                คะแนน: {actualMainPipe?.score || 'N/A'}/100
                            </p>
                        </div>
                    )}

                    {showPump && (
                        <div className="text-center">
                            <p className="text-red-200">ปั๊ม (ทั้งโปรเจค)</p>
                            <p
                                className={`text-xl font-bold ${
                                    actualPump?.isRecommended
                                        ? 'text-green-300'
                                        : actualPump?.isGoodChoice
                                          ? 'text-yellow-300'
                                          : 'text-orange-300'
                                }`}
                            >
                                {actualPump ? `${actualPump.powerHP}HP` : 'ไม่มี'}
                            </p>
                            <p className="text-xs text-red-100">
                                {actualPump?.isRecommended
                                    ? '🌟 แนะนำ'
                                    : actualPump?.isGoodChoice
                                      ? '✅ ดี'
                                      : actualPump
                                        ? '⚡ ใช้ได้'
                                        : '❌ ไม่มี'}
                            </p>
                            <p className="text-xs text-red-200">
                                คะแนน: {actualPump?.score || 'N/A'}/100
                            </p>
                        </div>
                    )}
                </div>
                <div className="mt-3 text-center text-sm text-white">
                    <p>🎛️ สามารถปรับแต่งการเลือกได้ในแต่ละส่วน</p>
                    {isMultiZone && (
                        <p className="text-yellow-200">
                            ท่อคำนวณแยกตามโซน {showPump && '| ปั๊มคำนวณตาม operation mode ที่เลือก'}
                        </p>
                    )}
                </div>
            </div>

            {/* แสดงข้อมูลสำคัญของโซนปัจจุบันก่อน */}
            <div className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                <h2 className="mb-2 text-lg font-bold text-white">
                    🎯 ข้อมูลสำคัญ
                    {isMultiZone && activeZone && (
                        <span className="ml-2 text-sm font-normal">(โซนปัจจุบัน: {activeZone.name})</span>
                    )}
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <div className="text-center">
                        <p className="text-blue-200">ความต้องการน้ำ</p>
                        <p className="text-xl font-bold">
                            {results.totalWaterRequiredLPM.toFixed(1)} LPM
                        </p>
                        {activeZone && <p className="text-xs text-blue-100">({activeZone.name})</p>}
                    </div>
                    <div className="text-center">
                        <p className="text-green-200">Head Loss รวม</p>
                        <p
                            className={`text-xl font-bold ${getStatusColor(systemPerformance.headLossStatus)}`}
                        >
                            {results.headLoss.total.toFixed(1)} m
                        </p>
                        <p className="text-xs text-green-100">
                            {systemPerformance.headLossStatus === 'good'
                                ? 'เหมาะสม'
                                : systemPerformance.headLossStatus === 'warning'
                                  ? 'ค่อนข้างสูง'
                                  : 'สูงเกินไป'}
                        </p>
                    </div>
                    {showPump && (
                        <div className="text-center">
                            <p className="text-purple-200">Pump Head</p>
                            <p className="text-xl font-bold text-orange-300">
                                {results.pumpHeadRequired.toFixed(1)} m
                            </p>
                            {isMultiZone && results.projectSummary && (
                                <p className="text-xs text-purple-100">
                                    (ตาม {getOperationModeLabel(results.projectSummary.operationMode)})
                                </p>
                            )}
                            <p className="text-xs text-purple-100">
                                Safety Factor: {results.safetyFactor.toFixed(2)}x
                            </p>
                        </div>
                    )}
                    <div className="text-center">
                        <p className="text-pink-200">จำนวน{projectMode === 'garden' ? 'หัวฉีด' : 'สปริงเกอร์'}</p>
                        <p className="text-xl font-bold text-green-300">
                            {results.totalSprinklers} หัว
                        </p>
                        {activeZone && (
                            <p className="text-xs text-pink-100">
                                (ในโซน {activeZone.name})
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* แสดงข้อมูลสรุปโปรเจคสำหรับหลายโซน */}
            {isMultiZone && results.projectSummary && (
                <div className="rounded-lg bg-blue-900 p-4">
                    <h3 className="mb-3 text-lg font-bold text-blue-300">
                        📊 สรุปโปรเจคทั้งหมด ({results.allZoneResults?.length || 0} โซน)
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                        <div>
                            <p className="text-blue-200">รูปแบบการเปิด:</p>
                            <p className="font-bold text-white">
                                {getOperationModeLabel(results.projectSummary.operationMode)}
                            </p>
                        </div>
                        <div>
                            <p className="text-blue-200">อัตราการไหลรวม:</p>
                            <p className="font-bold text-white">
                                {results.projectSummary.totalFlowLPM.toFixed(1)} LPM
                            </p>
                        </div>
                        <div>
                            <p className="text-blue-200">Head สูงสุด:</p>
                            <p className="font-bold text-white">
                                {results.projectSummary.maxHeadM.toFixed(1)} เมตร
                            </p>
                        </div>
                        <div>
                            <p className="text-blue-200">โซนที่ต้องการ Head สูงสุด:</p>
                            <p className="font-bold text-white">
                                {getZoneName(results.projectSummary.criticalZone)}
                            </p>
                        </div>
                    </div>
                    
                    <div className="mt-3 rounded bg-blue-800 p-2">
                        <h4 className="text-sm font-medium text-blue-300">💧 การคำนวณปั๊ม:</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs text-blue-200">
                            <p>Flow ที่ต้องการ: {results.projectSummary.selectedGroupFlowLPM.toFixed(1)} LPM</p>
                            <p>Head ที่ต้องการ: {results.projectSummary.selectedGroupHeadM.toFixed(1)} เมตร</p>
                        </div>
                        {results.projectSummary.criticalGroup && (
                            <p className="mt-1 text-xs text-blue-300">
                                จากกลุ่ม: {results.projectSummary.criticalGroup.label}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* แสดงข้อมูลโซนย่อยสำหรับหลายโซน */}
            {isMultiZone && results.allZoneResults && results.allZoneResults.length > 0 && (
                <div className="rounded-lg bg-gray-800 p-4">
                    <h3 className="mb-3 text-lg font-bold text-gray-300">
                        🔍 รายละเอียดแต่ละโซน
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {results.allZoneResults.map((zoneResult, index) => (
                            <div key={zoneResult.zoneId} className="rounded bg-gray-700 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <h4 className="font-medium text-white">
                                        {getZoneName(zoneResult.zoneId)}
                                        {zoneResult.zoneId === activeZone?.id && (
                                            <span className="ml-2 text-xs text-green-400">(กำลังดู)</span>
                                        )}
                                    </h4>
                                    <div className="text-xs text-gray-400">
                                        {zoneResult.sprinklerCount} {projectMode === 'garden' ? 'หัว' : 'ต้น'}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                                    <div>
                                        <p>Flow: {zoneResult.totalFlowLPM.toFixed(1)} LPM</p>
                                        <p>Static Head: {zoneResult.staticHead.toFixed(1)} ม.</p>
                                    </div>
                                    <div>
                                        <p>Head Loss: {zoneResult.headLoss.total.toFixed(1)} ม.</p>
                                        <p>Total Head: <span className="font-bold text-yellow-300">
                                            {zoneResult.totalHead.toFixed(1)} ม.
                                        </span></p>
                                    </div>
                                </div>
                                {zoneResult.zoneId === results.projectSummary?.criticalZone && (
                                    <div className="mt-1 text-xs text-red-300">
                                        ⭐ โซนที่ต้องการ Head สูงสุด
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* การเปิดโซน */}
            {zoneOperationGroups && zoneOperationGroups.length > 0 && (
                <div className="rounded bg-purple-900 p-3">
                    <h4 className="mb-2 text-sm font-medium text-purple-300">🔄 การเปิดโซน:</h4>
                    <div className="space-y-1 text-xs text-purple-200">
                        {zoneOperationGroups.map((group, index) => (
                            <p key={group.id}>
                                • ลำดับที่ {group.order}: {group.zones.map(zoneId => getZoneName(zoneId)).join(', ')}
                                {group.zones.length > 1 && ' (เปิดพร้อมกัน)'}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            <div className="rounded-lg bg-gradient-to-r from-gray-800 to-gray-700 p-4">
                <h3 className="mb-3 text-lg font-bold text-white">
                    📊 ประสิทธิภาพระบบ
                    <span className={`ml-2 ${getStatusColor(systemPerformance.overallStatus)}`}>
                        {getStatusIcon(systemPerformance.overallStatus)}
                    </span>
                    {isMultiZone && activeZone && (
                        <span className="ml-2 text-sm font-normal">({activeZone.name})</span>
                    )}
                </h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="text-center">
                        <div
                            className={`text-xl font-bold ${getStatusColor(systemPerformance.velocityStatus)}`}
                        >
                            {getStatusIcon(systemPerformance.velocityStatus)}
                        </div>
                        <p className="text-sm text-gray-300">ความเร็วน้ำ</p>
                        <p className="text-xs text-gray-400">0.3-2.5 m/s</p>
                    </div>
                    <div className="text-center">
                        <div
                            className={`text-xl font-bold ${getStatusColor(systemPerformance.headLossStatus)}`}
                        >
                            {getStatusIcon(systemPerformance.headLossStatus)}
                        </div>
                        <p className="text-sm text-gray-300">Head Loss</p>
                        <p className="text-xs text-gray-400">
                            {results.headLoss.total.toFixed(1)} m
                        </p>
                    </div>
                    {showPump && (
                        <div className="text-center">
                            <div
                                className={`text-xl font-bold ${getStatusColor(systemPerformance.pumpStatus)}`}
                            >
                                {getStatusIcon(systemPerformance.pumpStatus)}
                            </div>
                            <p className="text-sm text-gray-300">ปั๊มน้ำ</p>
                            <p className="text-xs text-gray-400">
                                {actualPump?.powerHP || 'N/A'} HP
                            </p>
                        </div>
                    )}
                    <div className="text-center">
                        <div className="text-xl font-bold text-blue-400">💰</div>
                        <p className="text-sm text-gray-300">ประมาณการ</p>
                        <p className="text-xs text-gray-400">ตามโซนปัจจุบัน</p>
                    </div>
                </div>
            </div>

            {/* แสดงข้อมูลรายละเอียดโซนปัจจุบัน */}
            <div className="rounded-lg bg-gray-700 p-6">
                <h2 className="mb-4 text-xl font-semibold text-yellow-400">
                    📊 สรุปการคำนวณรายละเอียด
                    {activeZone && (
                        <span className="ml-2 text-sm font-normal text-gray-400">
                            - {activeZone.name}
                        </span>
                    )}
                    {isMultiZone && (
                        <span className="ml-2 text-sm font-normal text-green-400">
                            (โซนปัจจุบันที่กำลังตั้งค่า)
                        </span>
                    )}
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-blue-300">💧 ความต้องการน้ำรวม</h3>
                        <p className="text-lg font-bold">
                            {results.totalWaterRequiredLPM.toFixed(1)} ลิตร/นาที
                        </p>
                        <p className="text-sm text-gray-300">
                            + Safety Factor {(results.safetyFactor * 100 - 100).toFixed(0)}%
                        </p>
                        <p className="text-sm font-bold text-green-300">
                            {results.adjustedFlow.toFixed(1)} ลิตร/นาที
                        </p>
                        {activeZone && (
                            <p className="mt-1 text-xs text-blue-200">
                                สำหรับโซน {activeZone.name}
                            </p>
                        )}
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-purple-300">
                            🚰 น้ำต่อหัว{projectMode === 'garden' ? 'ฉีด' : 'สปริงเกอร์'}
                        </h3>
                        <p className="text-lg font-bold">
                            {results.waterPerSprinklerLPH.toFixed(1)} ลิตร/ชั่วโมง
                        </p>
                        <p className="text-sm text-gray-300">
                            ({results.waterPerSprinklerLPM.toFixed(3)} ลิตร/นาที)
                        </p>
                        {selectedSprinkler && (
                            <p className="mt-1 text-xs text-purple-200">{selectedSprinkler.name}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                            สำหรับ {input.irrigationTimeMinutes} นาที/ครั้ง
                        </p>
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-green-300">
                            🔢 จำนวน{projectMode === 'garden' ? 'หัวฉีด' : 'สปริงเกอร์'}
                        </h3>
                        <p className="text-lg font-bold">{results.totalSprinklers} หัว</p>
                        <p className="text-sm text-gray-300">
                            {results.sprinklersPerZone.toFixed(1)} หัว/โซน
                        </p>
                        {activeZone && (
                            <p className="mt-1 text-xs text-green-200">ในโซน {activeZone.name}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                            อัตราส่วน: {input.sprinklersPerTree} หัว/
                            {projectMode === 'garden' ? 'จุด' : 'ต้น'}
                        </p>
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-yellow-300">⚡ อัตราการไหลแต่ละท่อ</h3>
                        <div className="text-sm">
                            <p>
                                ท่อย่อย:{' '}
                                <span className="font-bold text-purple-300">
                                    {results.flows.branch.toFixed(1)} LPM
                                </span>
                            </p>
                            {results.hasValidSecondaryPipe && (
                                <p>
                                    ท่อรอง:{' '}
                                    <span className="font-bold text-orange-300">
                                        {results.flows.secondary.toFixed(1)} LPM
                                    </span>
                                </p>
                            )}
                            {results.hasValidMainPipe && (
                                <p>
                                    ท่อหลัก:{' '}
                                    <span className="font-bold text-cyan-300">
                                        {results.flows.main.toFixed(1)} LPM
                                    </span>
                                </p>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-gray-400">ตามการออกแบบระบบ</p>
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-red-300">📉 Head Loss รายละเอียด</h3>
                        <div className="text-sm">
                            <p>
                                Major Loss:{' '}
                                <span className="font-bold text-red-400">
                                    {results.headLoss.totalMajor.toFixed(2)} m
                                </span>
                            </p>
                            <p>
                                Minor Loss:{' '}
                                <span className="font-bold text-orange-400">
                                    {results.headLoss.totalMinor.toFixed(2)} m
                                </span>
                            </p>
                            <p>
                                รวม:{' '}
                                <span
                                    className={`font-bold ${getStatusColor(systemPerformance.headLossStatus)}`}
                                >
                                    {results.headLoss.total.toFixed(1)} m
                                </span>
                            </p>
                        </div>
                        <div className="mt-2 text-xs text-gray-300">
                            <p>ย่อย: {results.headLoss.branch.total.toFixed(1)}m</p>
                            {results.hasValidSecondaryPipe && (
                                <p>รอง: {results.headLoss.secondary.total.toFixed(1)}m</p>
                            )}
                            {results.hasValidMainPipe && (
                                <p>หลัก: {results.headLoss.main.total.toFixed(1)}m</p>
                            )}
                        </div>
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-cyan-300">🌊 ความเร็วน้ำ (m/s)</h3>
                        <div className="text-sm">
                            <p>
                                ย่อย:{' '}
                                <span
                                    className={`font-bold ${
                                        results.velocity.branch > 2.5
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
                                    รอง:{' '}
                                    <span
                                        className={`font-bold ${
                                            results.velocity.secondary > 2.5
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
                                    หลัก:{' '}
                                    <span
                                        className={`font-bold ${
                                            results.velocity.main > 2.5
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
                        <p className="mt-1 text-xs text-gray-400">แนะนำ: 0.8-2.0 m/s</p>
                        <p className="mt-1 text-xs text-cyan-200">
                            สถานะ: {getStatusIcon(systemPerformance.velocityStatus)}
                            {systemPerformance.velocityStatus === 'good'
                                ? 'เหมาะสม'
                                : systemPerformance.velocityStatus === 'warning'
                                  ? 'ควรปรับ'
                                  : 'ต้องปรับ'}
                        </p>
                    </div>

                    {showPump && (
                        <div className="rounded bg-gray-600 p-4">
                            <h3 className="mb-2 font-medium text-orange-300">
                                ⚡ Pump Head ที่ต้องการ
                            </h3>
                            <p
                                className={`text-lg font-bold ${getStatusColor(systemPerformance.pumpStatus)}`}
                            >
                                {results.pumpHeadRequired.toFixed(1)} เมตร
                            </p>
                            <div className="text-xs text-gray-300">
                                <p>Static: {input.staticHeadM.toFixed(1)}m</p>
                                <p>Head Loss: {results.headLoss.total.toFixed(1)}m</p>
                                <p className="text-yellow-300">
                                    Pressure: {pressureInfo.pressure.toFixed(1)}m
                                </p>
                                <p>
                                    Safety:{' '}
                                    {(
                                        (results.pumpHeadRequired /
                                            Math.max(
                                                input.staticHeadM +
                                                    results.headLoss.total +
                                                    pressureInfo.pressure,
                                                1
                                            ) -
                                            1) *
                                        100
                                    ).toFixed(0)}
                                    %
                                </p>
                            </div>
                            {isMultiZone && results.projectSummary && (
                                <p className="mt-2 text-xs text-orange-200">
                                    คำนวณตาม {getOperationModeLabel(results.projectSummary.operationMode)}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-pink-300">🤖 ประสิทธิภาพอุปกรณ์</h3>
                        <div className="text-sm">
                            <p>
                                ท่อย่อย:{' '}
                                <span className="font-bold text-white">
                                    {actualBranchPipe ? `${actualBranchPipe.score}/100` : 'N/A'}
                                </span>
                                {actualBranchPipe?.isRecommended && (
                                    <span className="ml-1 text-green-400">⭐</span>
                                )}
                            </p>
                            {results.hasValidSecondaryPipe && actualSecondaryPipe && (
                                <p>
                                    ท่อรอง:{' '}
                                    <span className="font-bold text-white">
                                        {actualSecondaryPipe.score}/100
                                    </span>
                                    {actualSecondaryPipe.isRecommended && (
                                        <span className="ml-1 text-green-400">⭐</span>
                                    )}
                                </p>
                            )}
                            {results.hasValidMainPipe && actualMainPipe && (
                                <p>
                                    ท่อหลัก:{' '}
                                    <span className="font-bold text-white">
                                        {actualMainPipe.score}/100
                                    </span>
                                    {actualMainPipe.isRecommended && (
                                        <span className="ml-1 text-green-400">⭐</span>
                                    )}
                                </p>
                            )}
                            {showPump && (
                                <p>
                                    ปั๊ม:{' '}
                                    <span className="font-bold text-white">
                                        {actualPump ? `${actualPump.score}/100` : 'N/A'}
                                    </span>
                                    {actualPump?.isRecommended && (
                                        <span className="ml-1 text-green-400">⭐</span>
                                    )}
                                </p>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-gray-400">คะแนน 70+ = แนะนำ</p>
                    </div>
                </div>

                {/* แสดงข้อมูลแรงดันจากสปริงเกอร์ */}
                {selectedSprinkler && (
                    <div className="mt-6 rounded bg-blue-900 p-4">
                        <h3 className="mb-2 font-medium text-blue-300">
                            💧 แรงดันจาก{projectMode === 'garden' ? 'หัวฉีด' : 'สปริงเกอร์'}ที่เลือก
                        </h3>
                        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                            <p>
                                <strong>
                                    {projectMode === 'garden' ? 'หัวฉีด:' : 'สปริงเกอร์:'}
                                </strong>{' '}
                                {selectedSprinkler.productCode}
                            </p>
                            <p>
                                <strong>ช่วงแรงดัน:</strong> {pressureInfo.pressureBar?.toFixed(1)}{' '}
                                บาร์
                            </p>
                            <p>
                                <strong>แรงดันที่ใช้คำนวณ:</strong>{' '}
                                {pressureInfo.pressure.toFixed(1)} เมตร
                            </p>
                        </div>
                        <p className="mt-2 text-xs text-blue-200">
                            💡 ระบบใช้แรงดัน 70% ของช่วงสูงสุดในการคำนวณ {showPump && 'Pump Head'}
                        </p>
                    </div>
                )}

                {/* แสดงข้อมูลการตรวจสอบ velocity */}
                {results.velocityWarnings.length > 0 && (
                    <div className="mt-6 rounded bg-red-900 p-4">
                        <h3 className="mb-2 font-medium text-red-300">⚠️ การตรวจสอบความเร็วน้ำ</h3>
                        <div className="space-y-1">
                            {results.velocityWarnings.map((warning, index) => (
                                <p key={index} className="text-sm">
                                    {warning}
                                </p>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-red-200">
                            💡 ความเร็วผิดปกติอาจเกิดจากการเลือกท่อขนาดไม่เหมาะสม
                        </p>
                    </div>
                )}

                {/* แสดงข้อมูลประสิทธิภาพระบบ */}
                <div className="mt-6 rounded bg-green-900 p-4">
                    <h3 className="mb-2 font-medium text-green-300">🎯 ประสิทธิภาพระบบ</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                        <div>
                            <p className="text-green-200">คะแนนเฉลี่ย:</p>
                            <p className="font-bold text-white">
                                {(
                                    [
                                        actualBranchPipe,
                                        actualSecondaryPipe,
                                        actualMainPipe,
                                        showPump ? actualPump : null,
                                    ]
                                        .filter(Boolean)
                                        .reduce((sum, item) => sum + (item?.score || 0), 0) /
                                    [
                                        actualBranchPipe,
                                        actualSecondaryPipe,
                                        actualMainPipe,
                                        showPump ? actualPump : null,
                                    ].filter(Boolean).length
                                ).toFixed(1)}
                                /100
                            </p>
                        </div>
                        <div>
                            <p className="text-green-200">ความเร็วเฉลี่ย:</p>
                            <p className="font-bold text-white">
                                {(
                                    [
                                        results.velocity.branch,
                                        results.velocity.secondary,
                                        results.velocity.main,
                                    ]
                                        .filter((v) => v > 0)
                                        .reduce((sum, v) => sum + v, 0) /
                                    [
                                        results.velocity.branch,
                                        results.velocity.secondary,
                                        results.velocity.main,
                                    ].filter((v) => v > 0).length
                                ).toFixed(2)}{' '}
                                m/s
                            </p>
                        </div>
                        {showPump && (
                            <div>
                                <p className="text-green-200">ประสิทธิภาพปั๊ม:</p>
                                <p className="font-bold text-white">
                                    {actualPump
                                        ? `${(actualPump.flowPerBaht * 1000).toFixed(1)} L/฿`
                                        : 'N/A'}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="text-green-200">สถานะโดยรวม:</p>
                            <p
                                className={`font-bold ${getStatusColor(systemPerformance.overallStatus)}`}
                            >
                                {getStatusIcon(systemPerformance.overallStatus)}
                                {systemPerformance.overallStatus === 'good'
                                    ? 'ดี'
                                    : systemPerformance.overallStatus === 'warning'
                                      ? 'ปานกลาง'
                                      : 'ต้องปรับ'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalculationSummary;