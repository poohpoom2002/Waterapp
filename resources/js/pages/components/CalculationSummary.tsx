// C:\webchaiyo\Waterapp\resources\js\pages\components\CalculationSummary.tsx
import React from 'react';
import { CalculationResults, IrrigationInput } from '../types/interfaces';
import { Zone, HorticultureProjectData } from '../../utils/horticultureUtils';

interface CalculationSummaryProps {
    results: CalculationResults;
    input: IrrigationInput;
    selectedSprinkler: any;
    selectedPump?: any; // Legacy - ไม่ใช้แล้ว
    selectedBranchPipe?: any; // Legacy - ไม่ใช้แล้ว
    selectedSecondaryPipe?: any; // Legacy - ไม่ใช้แล้ว
    selectedMainPipe?: any; // Legacy - ไม่ใช้แล้ว
    activeZone?: Zone;
    selectedZones?: string[];
    allZoneSprinklers: { [zoneId: string]: any }; // NEW: All zone sprinklers
}

const CalculationSummary: React.FC<CalculationSummaryProps> = ({
    results,
    input,
    selectedSprinkler,
    selectedPump, // Legacy
    selectedBranchPipe, // Legacy
    selectedSecondaryPipe, // Legacy
    selectedMainPipe, // Legacy
    activeZone,
    selectedZones = [],
    allZoneSprinklers,
}) => {
    // ใช้อุปกรณ์ที่เลือกอัตโนมัติจาก results แทน
    const actualPump = results.autoSelectedPump;
    const actualBranchPipe = results.autoSelectedBranchPipe;
    const actualSecondaryPipe = results.autoSelectedSecondaryPipe;
    const actualMainPipe = results.autoSelectedMainPipe;

    // Calculate total costs (considering all zones if multi-zone)
    const calculateTotalSystemCost = () => {
        if (selectedZones.length <= 1) {
            // Single zone calculation
            return (
                (selectedSprinkler?.price || 0) * results.totalSprinklers +
                (actualPump?.price || 0) +
                (actualBranchPipe?.price || 0) * results.branchPipeRolls +
                (actualSecondaryPipe?.price || 0) * results.secondaryPipeRolls +
                (actualMainPipe?.price || 0) * results.mainPipeRolls
            );
        } else {
            // Multi-zone calculation - rough estimate
            let totalCost = actualPump?.price || 0; // Single pump for all zones

            selectedZones.forEach((zoneId) => {
                const zoneSprinkler = allZoneSprinklers[zoneId];
                if (zoneSprinkler) {
                    // Estimate cost per zone (this should be more accurate with actual zone data)
                    const estimatedTreesPerZone = Math.ceil(
                        input.totalTrees / selectedZones.length
                    );
                    totalCost += zoneSprinkler.price * estimatedTreesPerZone;
                    totalCost +=
                        (actualBranchPipe?.price || 0) *
                        Math.ceil(results.branchPipeRolls / selectedZones.length);
                    totalCost +=
                        (actualSecondaryPipe?.price || 0) *
                        Math.ceil(results.secondaryPipeRolls / selectedZones.length);
                    totalCost +=
                        (actualMainPipe?.price || 0) *
                        Math.ceil(results.mainPipeRolls / selectedZones.length);
                }
            });

            return totalCost;
        }
    };

    const totalCost = calculateTotalSystemCost();

    // คำนวณแรงดันจากสปริงเกอร์ที่เลือก
    const getSprinklerPressureInfo = () => {
        if (!selectedSprinkler) {
            return {
                pressure: input.pressureHeadM,
                source: 'ค่าเริ่มต้น',
            };
        }

        const minPressure = Array.isArray(selectedSprinkler.pressureBar)
            ? selectedSprinkler.pressureBar[0]
            : parseFloat(String(selectedSprinkler.pressureBar).split('-')[0]);
        const maxPressure = Array.isArray(selectedSprinkler.pressureBar)
            ? selectedSprinkler.pressureBar[1]
            : parseFloat(String(selectedSprinkler.pressureBar).split('-')[1]);

        const avgPressureBar = (minPressure + maxPressure) / 2;
        const pressureM = avgPressureBar * 10.2; // แปลง bar เป็น เมตร

        return {
            pressure: pressureM,
            source: `จากสปริงเกอร์ (${avgPressureBar.toFixed(1)} bar)`,
            pressureBar: avgPressureBar,
        };
    };

    const pressureInfo = getSprinklerPressureInfo();

    // NEW: Get unique sprinklers summary
    const getUniqueSprinklersSummary = () => {
        const sprinklerMap = new Map();
        Object.entries(allZoneSprinklers).forEach(([zoneId, sprinkler]) => {
            if (sprinkler) {
                const key = `${sprinkler.id}`;
                if (!sprinklerMap.has(key)) {
                    sprinklerMap.set(key, {
                        sprinkler,
                        zones: [],
                        totalQuantity: 0,
                    });
                }
                sprinklerMap.get(key).zones.push(zoneId);
                // Estimate quantity per zone (should be more accurate with real zone data)
                sprinklerMap.get(key).totalQuantity += Math.ceil(
                    input.totalTrees / Object.keys(allZoneSprinklers).length
                );
            }
        });
        return Array.from(sprinklerMap.values());
    };

    const uniqueSprinklers = getUniqueSprinklersSummary();

    return (
        <>
            {/* Zone Information */}
            {activeZone && (
                <div className="mb-4 rounded-lg bg-purple-900 p-4">
                    <h3 className="mb-2 text-lg font-bold text-purple-300">
                        🌿 ข้อมูลโซน: {activeZone.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 md:grid-cols-4">
                        <p>พื้นที่: {(activeZone.area / 1600).toFixed(2)} ไร่</p>
                        <p>จำนวนต้น: {activeZone.plantCount.toLocaleString()} ต้น</p>
                        <p>ความต้องการน้ำ: {activeZone.totalWaterNeed.toFixed(0)} ลิตร/วัน</p>
                        <p>พืชที่ปลูก: {activeZone.plantData?.name || 'ไม่ระบุ'}</p>
                    </div>
                    {selectedZones.length > 1 && (
                        <div className="mt-2 rounded bg-purple-800 p-2">
                            <p className="text-sm text-yellow-300">
                                ⚠️ กำลังคำนวณสำหรับ {selectedZones.length} โซนพร้อมกัน
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Multi-zone Sprinkler Summary */}
            {Object.keys(allZoneSprinklers).length > 1 && (
                <div className="mb-6 rounded-lg bg-indigo-900 p-4">
                    <h3 className="mb-2 text-lg font-bold text-indigo-300">
                        💧 สรุปสปริงเกอร์ทั้งระบบ ({uniqueSprinklers.length} ชนิด)
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {uniqueSprinklers.map((item, index) => (
                            <div key={index} className="rounded bg-indigo-800 p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-white">
                                            {item.sprinkler.name}
                                        </p>
                                        <p className="text-sm text-indigo-200">
                                            {item.sprinkler.productCode} | {item.sprinkler.price}{' '}
                                            บาท/หัว
                                        </p>
                                        <p className="text-xs text-indigo-300">
                                            ใช้ใน {item.zones.length} โซน | ประมาณ{' '}
                                            {item.totalQuantity} หัว
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-green-300">
                                            {(
                                                item.sprinkler.price * item.totalQuantity
                                            ).toLocaleString()}{' '}
                                            ฿
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Auto Selection Status */}
            <div className="mb-6 rounded-lg bg-gradient-to-r from-green-600 to-blue-600 p-4">
                <h2 className="mb-2 text-lg font-bold text-white">
                    🤖 สถานะการเลือกอุปกรณ์อัตโนมัติ
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <div className="text-center">
                        <p className="text-blue-200">ท่อย่อย</p>
                        <p
                            className={`text-xl font-bold ${actualBranchPipe?.isRecommended ? 'text-green-300' : actualBranchPipe?.isGoodChoice ? 'text-yellow-300' : 'text-orange-300'}`}
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
                    </div>
                    {results.hasValidSecondaryPipe && (
                        <div className="text-center">
                            <p className="text-orange-200">ท่อรอง</p>
                            <p
                                className={`text-xl font-bold ${actualSecondaryPipe?.isRecommended ? 'text-green-300' : actualSecondaryPipe?.isGoodChoice ? 'text-yellow-300' : 'text-orange-300'}`}
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
                        </div>
                    )}
                    {results.hasValidMainPipe && (
                        <div className="text-center">
                            <p className="text-cyan-200">ท่อหลัก</p>
                            <p
                                className={`text-xl font-bold ${actualMainPipe?.isRecommended ? 'text-green-300' : actualMainPipe?.isGoodChoice ? 'text-yellow-300' : 'text-orange-300'}`}
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
                        </div>
                    )}
                    <div className="text-center">
                        <p className="text-red-200">ปั๊ม</p>
                        <p
                            className={`text-xl font-bold ${actualPump?.isRecommended ? 'text-green-300' : actualPump?.isGoodChoice ? 'text-yellow-300' : 'text-orange-300'}`}
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
                    </div>
                </div>
                <div className="mt-3 text-center text-sm text-white">
                    <p>
                        🎛️ สามารถปรับแต่งการเลือกได้ในแต่ละส่วน |
                        {selectedZones.length > 1 && (
                            <span className="text-yellow-200">
                                {' '}
                                ท่อคำนวณแยกตามโซน | ปั๊มใช้ตัวเดียวทั้งระบบ
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* ข้อมูลสำคัญด้านบน */}
            <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                <h2 className="mb-2 text-lg font-bold text-white">🎯 ข้อมูลสำคัญ</h2>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <div className="text-center">
                        <p className="text-blue-200">ความต้องการน้ำ</p>
                        <p className="text-xl font-bold">
                            {results.totalWaterRequiredLPM.toFixed(1)} LPM
                        </p>
                        {activeZone && <p className="text-xs text-blue-100">({activeZone.name})</p>}
                        {selectedZones.length > 1 && (
                            <p className="text-xs text-blue-100">
                                ({selectedZones.length} โซนพร้อมกัน)
                            </p>
                        )}
                    </div>
                    <div className="text-center">
                        <p className="text-green-200">Head Loss รวม</p>
                        <p className="text-xl font-bold text-yellow-300">
                            {results.headLoss.total.toFixed(1)} m
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-purple-200">Pump Head</p>
                        <p className="text-xl font-bold text-orange-300">
                            {results.pumpHeadRequired.toFixed(1)} m
                        </p>
                        {selectedZones.length > 1 && (
                            <p className="text-xs text-purple-100">({selectedZones.length} โซน)</p>
                        )}
                    </div>
                    <div className="text-center">
                        <p className="text-pink-200">ประมาณการ</p>
                        <p className="text-xl font-bold text-green-300">
                            {totalCost.toLocaleString()} ฿
                        </p>
                        {selectedZones.length > 1 && (
                            <p className="text-xs text-pink-100">
                                ({uniqueSprinklers.length} ชนิดสปริงเกอร์)
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* สรุปการคำนวณรายละเอียด */}
            <div className="mb-6 rounded-lg bg-gray-700 p-6">
                <h2 className="mb-4 text-xl font-semibold text-yellow-400">
                    สรุปการคำนวณ
                    {activeZone && (
                        <span className="ml-2 text-sm font-normal text-gray-400">
                            - {activeZone.name}
                        </span>
                    )}
                    {selectedZones.length > 1 && (
                        <span className="ml-2 text-sm font-normal text-green-400">
                            (หลายโซน: {selectedZones.length} โซน)
                        </span>
                    )}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* การไหลและอัตรา */}
                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-blue-300">ความต้องการน้ำรวม</h3>
                        <p className="text-lg font-bold">
                            {results.totalWaterRequiredLPM.toFixed(1)} ลิตร/นาที
                        </p>
                        <p className="text-sm text-gray-300">+ Safety Factor 25%</p>
                        <p className="text-sm font-bold text-green-300">
                            {results.adjustedFlow.toFixed(1)} ลิตร/นาที
                        </p>
                        {selectedZones.length > 1 && (
                            <p className="mt-1 text-xs text-blue-200">
                                สำหรับ {selectedZones.length} โซนพร้อมกัน
                            </p>
                        )}
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-purple-300">น้ำต่อหัวสปริงเกอร์</h3>
                        <p className="text-lg font-bold">
                            {results.waterPerSprinklerLPH.toFixed(1)} ลิตร/ชั่วโมง
                        </p>
                        <p className="text-sm text-gray-300">
                            ({results.waterPerSprinklerLPM.toFixed(3)} ลิตร/นาที)
                        </p>
                        {selectedSprinkler && (
                            <p className="mt-1 text-xs text-purple-200">{selectedSprinkler.name}</p>
                        )}
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-green-300">จำนวนสปริงเกอร์</h3>
                        <p className="text-lg font-bold">{results.totalSprinklers} หัว</p>
                        <p className="text-sm text-gray-300">
                            {results.sprinklersPerZone.toFixed(1)} หัว/โซน
                        </p>
                        {activeZone && (
                            <p className="mt-1 text-xs text-green-200">ในโซน {activeZone.name}</p>
                        )}
                        {Object.keys(allZoneSprinklers).length > 1 && (
                            <p className="mt-1 text-xs text-green-200">
                                รวม {uniqueSprinklers.length} ชนิด
                            </p>
                        )}
                    </div>

                    {/* อัตราการไหลในแต่ละประเภทท่อ */}
                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-yellow-300">อัตราการไหลแต่ละท่อ</h3>
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

                    {/* Head Loss รายละเอียด */}
                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-red-300">Head Loss รายละเอียด</h3>
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
                                    className={`font-bold ${
                                        results.headLoss.total > 20
                                            ? 'text-red-400'
                                            : results.headLoss.total > 15
                                              ? 'text-yellow-400'
                                              : 'text-green-400'
                                    }`}
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

                    {/* ความเร็วน้ำ */}
                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-cyan-300">ความเร็วน้ำ (m/s)</h3>
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
                        <p className="mt-1 text-xs text-gray-400">แนะนำ: 0.3-2.5 m/s</p>
                    </div>

                    {/* Pump Head */}
                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-orange-300">Pump Head ที่ต้องการ</h3>
                        <p
                            className={`text-lg font-bold ${
                                results.pumpHeadRequired > 60
                                    ? 'text-red-400'
                                    : results.pumpHeadRequired > 40
                                      ? 'text-yellow-400'
                                      : 'text-green-400'
                            }`}
                        >
                            {results.pumpHeadRequired.toFixed(1)} เมตร
                        </p>
                        <div className="text-xs text-gray-300">
                            <p>Static: {input.staticHeadM.toFixed(1)}m</p>
                            <p>Head Loss: {results.headLoss.total.toFixed(1)}m</p>
                            <p className="text-yellow-300">
                                Pressure: {pressureInfo.pressure.toFixed(1)}m
                            </p>
                            <p className="text-xs text-gray-400">({pressureInfo.source})</p>
                        </div>
                        {selectedZones.length > 1 && (
                            <p className="mt-2 text-xs text-orange-200">
                                สำหรับ {selectedZones.length} โซนพร้อมกัน
                            </p>
                        )}
                    </div>

                    {/* ท่อที่เลือกอัตโนมัติ */}
                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-pink-300">ท่อที่เลือกอัตโนมัติ</h3>
                        <div className="text-sm">
                            <p>
                                ย่อย:{' '}
                                <span className="font-bold text-purple-300">
                                    {actualBranchPipe?.sizeMM || 'N/A'}mm
                                </span>
                                {actualBranchPipe && (
                                    <span className="ml-1 text-xs text-green-300">
                                        ({actualBranchPipe.score})
                                    </span>
                                )}
                            </p>
                            {results.hasValidSecondaryPipe && (
                                <p>
                                    รอง:{' '}
                                    <span className="font-bold text-orange-300">
                                        {actualSecondaryPipe?.sizeMM || 'N/A'}mm
                                    </span>
                                    {actualSecondaryPipe && (
                                        <span className="ml-1 text-xs text-green-300">
                                            ({actualSecondaryPipe.score})
                                        </span>
                                    )}
                                </p>
                            )}
                            {results.hasValidMainPipe && (
                                <p>
                                    หลัก:{' '}
                                    <span className="font-bold text-cyan-300">
                                        {actualMainPipe?.sizeMM || 'N/A'}mm
                                    </span>
                                    {actualMainPipe && (
                                        <span className="ml-1 text-xs text-green-300">
                                            ({actualMainPipe.score})
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                            🤖 เลือกอัตโนมัติ + ปรับแต่งได้
                        </p>
                    </div>
                </div>

                {/* แสดงข้อมูลแรงดันจากสปริงเกอร์ */}
                {selectedSprinkler && (
                    <div className="mt-6 rounded bg-blue-900 p-4">
                        <h3 className="mb-2 font-medium text-blue-300">
                            💧 แรงดันจากสปริงเกอร์ที่เลือก
                        </h3>
                        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                            <p>
                                <strong>สปริงเกอร์:</strong> {selectedSprinkler.productCode}
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
                            💡 ระบบจะใช้แรงดันกลางของช่วงที่สปริงเกอร์รองรับในการคำนวณ Pump Head
                        </p>
                    </div>
                )}

                {/* Zone-specific calculations info */}
                {activeZone && selectedZones.length > 1 && (
                    <div className="mt-6 rounded bg-yellow-900 p-4">
                        <h3 className="mb-2 font-medium text-yellow-300">
                            ⚠️ หมายเหตุการคำนวณหลายโซน
                        </h3>
                        <p className="text-sm text-yellow-200">
                            การคำนวณขนาดท่อจะแยกตามแต่ละโซน แต่ปั๊มจะใช้ตัวเดียวทั้งระบบ
                            โดยคำนวณจากความต้องการสูงสุดของโซนที่เปิดพร้อมกัน
                        </p>
                        <div className="mt-2 text-xs text-yellow-100">
                            <p>• ท่อย่อย: คำนวณแยกตามโซนที่กำลังดู ({activeZone.name})</p>
                            <p>• ท่อรอง/หลัก: คำนวณแยกตามแต่ละโซน</p>
                            <p>• ปั๊ม: คำนวณตามความต้องการรวมของโซนที่เปิดพร้อมกัน</p>
                            <p>
                                • สปริงเกอร์: แต่ละโซนเลือกได้อิสระ ({uniqueSprinklers.length}{' '}
                                ชนิดที่เลือก)
                            </p>
                        </div>
                    </div>
                )}

                {/* การเตือนความเร็ว */}
                {results.velocityWarnings.length > 0 && (
                    <div className="mt-6 rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-yellow-300">การตรวจสอบความเร็วน้ำ</h3>
                        <div className="space-y-1">
                            {results.velocityWarnings.map((warning, index) => (
                                <p key={index} className="text-sm">
                                    {warning}
                                </p>
                            ))}
                        </div>
                    </div>
                )}

                {/* แสดงคะแนนการเลือกอุปกรณ์อัตโนมัติ */}
                <div className="mt-6 rounded bg-green-900 p-4">
                    <h3 className="mb-2 font-medium text-green-300">
                        🤖 คะแนนการเลือกอุปกรณ์อัตโนมัติ
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                        <div>
                            <p className="text-purple-200">ท่อย่อย:</p>
                            <p className="font-bold text-white">
                                {actualBranchPipe ? `${actualBranchPipe.score}/100` : 'ไม่มี'}
                            </p>
                            <p className="text-xs text-purple-100">
                                {actualBranchPipe?.productCode || 'N/A'}
                            </p>
                        </div>
                        {results.hasValidSecondaryPipe && (
                            <div>
                                <p className="text-orange-200">ท่อรอง:</p>
                                <p className="font-bold text-white">
                                    {actualSecondaryPipe
                                        ? `${actualSecondaryPipe.score}/100`
                                        : 'ไม่มี'}
                                </p>
                                <p className="text-xs text-orange-100">
                                    {actualSecondaryPipe?.productCode || 'N/A'}
                                </p>
                            </div>
                        )}
                        {results.hasValidMainPipe && (
                            <div>
                                <p className="text-cyan-200">ท่อหลัก:</p>
                                <p className="font-bold text-white">
                                    {actualMainPipe ? `${actualMainPipe.score}/100` : 'ไม่มี'}
                                </p>
                                <p className="text-xs text-cyan-100">
                                    {actualMainPipe?.productCode || 'N/A'}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="text-red-200">ปั๊ม:</p>
                            <p className="font-bold text-white">
                                {actualPump ? `${actualPump.score}/100` : 'ไม่มี'}
                            </p>
                            <p className="text-xs text-red-100">
                                {actualPump?.productCode || 'N/A'}
                            </p>
                        </div>
                    </div>
                    {selectedZones.length > 1 && (
                        <div className="mt-3 rounded bg-green-800 p-2">
                            <p className="text-xs text-green-200">
                                💡 การเลือกท่อแยกตามโซน | ปั๊มเลือกตามความต้องการรวม | สปริงเกอร์{' '}
                                {uniqueSprinklers.length} ชนิดตามที่เลือกในแต่ละโซน
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default CalculationSummary;
