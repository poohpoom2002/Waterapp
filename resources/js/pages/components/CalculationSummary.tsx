// C:\webchaiyo\Waterapp\resources\js\pages\components\CalculationSummary.tsx
import React from 'react';
import { CalculationResults, IrrigationInput } from '../types/interfaces';

interface CalculationSummaryProps {
    results: CalculationResults;
    input: IrrigationInput;
    selectedSprinkler: any;
    selectedPump: any;
    selectedBranchPipe: any;
    selectedSecondaryPipe: any;
    selectedMainPipe: any;
}

const CalculationSummary: React.FC<CalculationSummaryProps> = ({
    results,
    input,
    selectedSprinkler,
    selectedPump,
    selectedBranchPipe,
    selectedSecondaryPipe,
    selectedMainPipe,
}) => {
    const totalCost =
        (selectedSprinkler?.price || 0) * results.totalSprinklers +
        (selectedPump?.price || 0) +
        (selectedBranchPipe?.price || 0) * results.branchPipeRolls +
        (selectedSecondaryPipe?.price || 0) * results.secondaryPipeRolls +
        (selectedMainPipe?.price || 0) * results.mainPipeRolls;

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

    return (
        <>
            {/* ข้อมูลสำคัญด้านบน */}
            <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                <h2 className="mb-2 text-lg font-bold text-white">🎯 ข้อมูลสำคัญ</h2>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <div className="text-center">
                        <p className="text-blue-200">ความต้องการน้ำ</p>
                        <p className="text-xl font-bold">
                            {results.totalWaterRequiredLPM.toFixed(1)} LPM
                        </p>
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
                    </div>
                    <div className="text-center">
                        <p className="text-pink-200">ประมาณการ</p>
                        <p className="text-xl font-bold text-green-300">
                            {totalCost.toLocaleString()} ฿
                        </p>
                    </div>
                </div>
            </div>

            {/* สรุปการคำนวณรายละเอียด */}
            <div className="mb-6 rounded-lg bg-gray-700 p-6">
                <h2 className="mb-4 text-xl font-semibold text-yellow-400">สรุปการคำนวณ</h2>
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
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-purple-300">น้ำต่อหัวสปริงเกอร์</h3>
                        <p className="text-lg font-bold">
                            {results.waterPerSprinklerLPH.toFixed(1)} ลิตร/ชั่วโมง
                        </p>
                        <p className="text-sm text-gray-300">
                            ({results.waterPerSprinklerLPM.toFixed(3)} ลิตร/นาที)
                        </p>
                    </div>

                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-green-300">จำนวนสปริงเกอร์</h3>
                        <p className="text-lg font-bold">{results.totalSprinklers} หัว</p>
                        <p className="text-sm text-gray-300">
                            {results.sprinklersPerZone.toFixed(1)} หัว/โซน
                        </p>
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
                    </div>

                    {/* ท่อที่เลือก */}
                    <div className="rounded bg-gray-600 p-4">
                        <h3 className="mb-2 font-medium text-pink-300">ขนาดท่อที่เลือก</h3>
                        <div className="text-sm">
                            <p>
                                ย่อย:{' '}
                                <span className="font-bold text-purple-300">
                                    {selectedBranchPipe?.sizeMM || 'N/A'}mm
                                </span>
                            </p>
                            {results.hasValidSecondaryPipe && (
                                <p>
                                    รอง:{' '}
                                    <span className="font-bold text-orange-300">
                                        {selectedSecondaryPipe?.sizeMM || 'N/A'}mm
                                    </span>
                                </p>
                            )}
                            {results.hasValidMainPipe && (
                                <p>
                                    หลัก:{' '}
                                    <span className="font-bold text-cyan-300">
                                        {selectedMainPipe?.sizeMM || 'N/A'}mm
                                    </span>
                                </p>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-gray-400">ขนาดที่ระบบแนะนำ</p>
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
            </div>
        </>
    );
};

export default CalculationSummary;
