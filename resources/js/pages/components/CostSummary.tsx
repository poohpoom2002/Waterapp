// C:\webchaiyo\Waterapp\resources\js\pages\components\CostSummary.tsx
import React from 'react';
import { CalculationResults } from '../types/interfaces';
import { HorticultureProjectData } from '../../utils/horticultureUtils';

interface CostSummaryProps {
    results: CalculationResults;
    zoneSprinklers: { [zoneId: string]: any }; // Sprinklers per zone
    selectedPipes: { [zoneId: string]: { branch?: any; secondary?: any; main?: any } }; // Pipes per zone
    selectedPump: any; // Single pump for all zones
    activeZoneId: string;
    projectData: HorticultureProjectData | null;
    onQuotationClick: () => void;
}

const CostSummary: React.FC<CostSummaryProps> = ({
    results,
    zoneSprinklers,
    selectedPipes,
    selectedPump,
    activeZoneId,
    projectData,
    onQuotationClick,
}) => {
    // Calculate total costs across all zones
    const calculateTotalCosts = () => {
        let totalSprinklerCost = 0;
        let totalBranchPipeCost = 0;
        let totalSecondaryPipeCost = 0;
        let totalMainPipeCost = 0;

        const sprinklerSummary: {
            [sprinklerId: string]: { sprinkler: any; quantity: number; zones: string[] };
        } = {};
        const pipeSummary: {
            branch: { [pipeId: string]: { pipe: any; quantity: number; zones: string[] } };
            secondary: { [pipeId: string]: { pipe: any; quantity: number; zones: string[] } };
            main: { [pipeId: string]: { pipe: any; quantity: number; zones: string[] } };
        } = {
            branch: {},
            secondary: {},
            main: {},
        };

        // Iterate through zones or use single zone
        if (projectData?.useZones && projectData.zones.length > 1) {
            // Multi-zone calculation
            projectData.zones.forEach((zone) => {
                const zoneSprinkler = zoneSprinklers[zone.id];
                const zonePipes = selectedPipes[zone.id] || {};

                // Sprinkler costs
                if (zoneSprinkler) {
                    const cost = zoneSprinkler.price * zone.plantCount;
                    totalSprinklerCost += cost;

                    // Track sprinkler usage
                    const key = `${zoneSprinkler.id}`;
                    if (!sprinklerSummary[key]) {
                        sprinklerSummary[key] = {
                            sprinkler: zoneSprinkler,
                            quantity: 0,
                            zones: [],
                        };
                    }
                    sprinklerSummary[key].quantity += zone.plantCount;
                    sprinklerSummary[key].zones.push(zone.name);
                }

                // Pipe costs
                const branchPipe = zonePipes.branch || results.autoSelectedBranchPipe;
                if (branchPipe) {
                    const rolls = Math.ceil((zone.area / 1600) * 10); // Rough estimate
                    const cost = branchPipe.price * rolls;
                    totalBranchPipeCost += cost;

                    // Track pipe usage
                    const key = `${branchPipe.id}`;
                    if (!pipeSummary.branch[key]) {
                        pipeSummary.branch[key] = { pipe: branchPipe, quantity: 0, zones: [] };
                    }
                    pipeSummary.branch[key].quantity += rolls;
                    pipeSummary.branch[key].zones.push(zone.name);
                }

                const secondaryPipe = zonePipes.secondary || results.autoSelectedSecondaryPipe;
                if (secondaryPipe) {
                    const rolls = Math.ceil((zone.area / 1600) * 3); // Rough estimate
                    const cost = secondaryPipe.price * rolls;
                    totalSecondaryPipeCost += cost;

                    const key = `${secondaryPipe.id}`;
                    if (!pipeSummary.secondary[key]) {
                        pipeSummary.secondary[key] = {
                            pipe: secondaryPipe,
                            quantity: 0,
                            zones: [],
                        };
                    }
                    pipeSummary.secondary[key].quantity += rolls;
                    pipeSummary.secondary[key].zones.push(zone.name);
                }

                const mainPipe = zonePipes.main || results.autoSelectedMainPipe;
                if (mainPipe) {
                    const rolls = Math.ceil((zone.area / 1600) * 1); // Rough estimate
                    const cost = mainPipe.price * rolls;
                    totalMainPipeCost += cost;

                    const key = `${mainPipe.id}`;
                    if (!pipeSummary.main[key]) {
                        pipeSummary.main[key] = { pipe: mainPipe, quantity: 0, zones: [] };
                    }
                    pipeSummary.main[key].quantity += rolls;
                    pipeSummary.main[key].zones.push(zone.name);
                }
            });
        } else {
            // Single zone calculation
            const currentSprinkler = zoneSprinklers[activeZoneId];
            const currentPipes = selectedPipes[activeZoneId] || {};

            if (currentSprinkler) {
                totalSprinklerCost = currentSprinkler.price * results.totalSprinklers;
                sprinklerSummary[`${currentSprinkler.id}`] = {
                    sprinkler: currentSprinkler,
                    quantity: results.totalSprinklers,
                    zones: ['พื้นที่หลัก'],
                };
            }

            const branchPipe = currentPipes.branch || results.autoSelectedBranchPipe;
            if (branchPipe) {
                totalBranchPipeCost = branchPipe.price * results.branchPipeRolls;
                pipeSummary.branch[`${branchPipe.id}`] = {
                    pipe: branchPipe,
                    quantity: results.branchPipeRolls,
                    zones: ['พื้นที่หลัก'],
                };
            }

            const secondaryPipe = currentPipes.secondary || results.autoSelectedSecondaryPipe;
            if (secondaryPipe) {
                totalSecondaryPipeCost = secondaryPipe.price * results.secondaryPipeRolls;
                pipeSummary.secondary[`${secondaryPipe.id}`] = {
                    pipe: secondaryPipe,
                    quantity: results.secondaryPipeRolls,
                    zones: ['พื้นที่หลัก'],
                };
            }

            const mainPipe = currentPipes.main || results.autoSelectedMainPipe;
            if (mainPipe) {
                totalMainPipeCost = mainPipe.price * results.mainPipeRolls;
                pipeSummary.main[`${mainPipe.id}`] = {
                    pipe: mainPipe,
                    quantity: results.mainPipeRolls,
                    zones: ['พื้นที่หลัก'],
                };
            }
        }

        const pumpCost = selectedPump?.price || results.autoSelectedPump?.price || 0;
        const totalCost =
            totalSprinklerCost +
            totalBranchPipeCost +
            totalSecondaryPipeCost +
            totalMainPipeCost +
            pumpCost;

        return {
            totalSprinklerCost,
            totalBranchPipeCost,
            totalSecondaryPipeCost,
            totalMainPipeCost,
            pumpCost,
            totalCost,
            sprinklerSummary,
            pipeSummary,
        };
    };

    const costs = calculateTotalCosts();
    const effectivePump = selectedPump || results.autoSelectedPump;

    // ฟังก์ชันแสดงสถานะการเลือก
    const getSelectionStatus = (equipment: any, type: string, isAuto: boolean) => {
        if (!equipment) return `❌ ไม่มี${type}`;

        if (isAuto) {
            if (equipment.isRecommended) {
                return `🤖⭐ ${type}ที่แนะนำ (อัตโนมัติ)`;
            } else if (equipment.isGoodChoice) {
                return `🤖✅ ${type}ตัวเลือกดี (อัตโนมัติ)`;
            } else if (equipment.isUsable) {
                return `🤖⚡ ${type}ใช้ได้ (อัตโนมัติ)`;
            } else {
                return `🤖⚠️ ${type}ที่ดีที่สุดที่มี (อัตโนมัติ)`;
            }
        } else {
            return `👤 ${type}ที่เลือกเอง`;
        }
    };

    // Get unique equipment count
    const uniqueSprinklers = Object.keys(costs.sprinklerSummary).length;
    const uniqueBranchPipes = Object.keys(costs.pipeSummary.branch).length;
    const uniqueSecondaryPipes = Object.keys(costs.pipeSummary.secondary).length;
    const uniqueMainPipes = Object.keys(costs.pipeSummary.main).length;

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h2 className="mb-4 text-xl font-semibold text-yellow-400">สรุปราคารวม 💰</h2>

            {/* แสดงสถานะการเลือกอัตโนมัติ */}
            <div className="mb-4 rounded bg-green-900 p-3">
                <h3 className="mb-2 text-sm font-semibold text-green-300">
                    🤖 สรุปอุปกรณ์ที่เลือก (
                    {projectData?.useZones && projectData.zones.length > 1 ? 'หลายโซน' : 'โซนเดียว'}
                    ):
                </h3>
                <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <p className="text-green-200">💧 สปริงเกอร์: {uniqueSprinklers} ชนิด</p>
                    </div>
                    <div>
                        <p className="text-green-200">🔧 ท่อย่อย: {uniqueBranchPipes} ชนิด</p>
                    </div>
                    {uniqueSecondaryPipes > 0 && (
                        <div>
                            <p className="text-green-200">🔧 ท่อรอง: {uniqueSecondaryPipes} ชนิด</p>
                        </div>
                    )}
                    {uniqueMainPipes > 0 && (
                        <div>
                            <p className="text-green-200">🔧 ท่อหลัก: {uniqueMainPipes} ชนิด</p>
                        </div>
                    )}
                </div>
            </div>

            {/* สรุปสปริงเกอร์ */}
            {uniqueSprinklers > 0 && (
                <div className="mb-4 rounded bg-blue-900 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-blue-300">💧 สรุปสปริงเกอร์:</h3>
                    <div className="space-y-2">
                        {Object.values(costs.sprinklerSummary).map((item, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between rounded bg-blue-800 p-2"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-xs">
                                        💧
                                    </div>
                                    <div className="text-sm">
                                        <p className="font-medium text-white">
                                            {item.sprinkler.name}
                                        </p>
                                        <p className="text-blue-200">
                                            {item.sprinkler.productCode} | {item.sprinkler.price}{' '}
                                            บาท/หัว
                                        </p>
                                        <p className="text-xs text-blue-300">
                                            ใช้ในโซน: {item.zones.join(', ')}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right text-sm">
                                    <p className="text-blue-200">{item.quantity} หัว</p>
                                    <p className="font-bold text-white">
                                        {(item.sprinkler.price * item.quantity).toLocaleString()}{' '}
                                        บาท
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* สรุปท่อ */}
            {(uniqueBranchPipes > 0 || uniqueSecondaryPipes > 0 || uniqueMainPipes > 0) && (
                <div className="mb-4 rounded bg-purple-900 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-purple-300">🔧 สรุปท่อ:</h3>
                    <div className="space-y-3">
                        {/* Branch Pipes */}
                        {uniqueBranchPipes > 0 && (
                            <div>
                                <h4 className="mb-1 text-xs font-medium text-purple-200">
                                    ท่อย่อย:
                                </h4>
                                <div className="space-y-1">
                                    {Object.values(costs.pipeSummary.branch).map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between rounded bg-purple-800 p-2"
                                        >
                                            <div className="text-sm">
                                                <p className="font-medium text-white">
                                                    {item.pipe.name || item.pipe.productCode} -{' '}
                                                    {item.pipe.sizeMM}mm
                                                </p>
                                                <p className="text-xs text-purple-200">
                                                    {item.zones.join(', ')} | {item.pipe.price}{' '}
                                                    บาท/ม้วน
                                                </p>
                                            </div>
                                            <div className="text-right text-sm">
                                                <p className="text-purple-200">
                                                    {item.quantity} ม้วน
                                                </p>
                                                <p className="font-bold text-white">
                                                    {(
                                                        item.pipe.price * item.quantity
                                                    ).toLocaleString()}{' '}
                                                    บาท
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Secondary Pipes */}
                        {uniqueSecondaryPipes > 0 && (
                            <div>
                                <h4 className="mb-1 text-xs font-medium text-purple-200">
                                    ท่อเมนรอง:
                                </h4>
                                <div className="space-y-1">
                                    {Object.values(costs.pipeSummary.secondary).map(
                                        (item, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between rounded bg-purple-800 p-2"
                                            >
                                                <div className="text-sm">
                                                    <p className="font-medium text-white">
                                                        {item.pipe.name || item.pipe.productCode} -{' '}
                                                        {item.pipe.sizeMM}mm
                                                    </p>
                                                    <p className="text-xs text-purple-200">
                                                        {item.zones.join(', ')} | {item.pipe.price}{' '}
                                                        บาท/ม้วน
                                                    </p>
                                                </div>
                                                <div className="text-right text-sm">
                                                    <p className="text-purple-200">
                                                        {item.quantity} ม้วน
                                                    </p>
                                                    <p className="font-bold text-white">
                                                        {(
                                                            item.pipe.price * item.quantity
                                                        ).toLocaleString()}{' '}
                                                        บาท
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Main Pipes */}
                        {uniqueMainPipes > 0 && (
                            <div>
                                <h4 className="mb-1 text-xs font-medium text-purple-200">
                                    ท่อเมนหลัก:
                                </h4>
                                <div className="space-y-1">
                                    {Object.values(costs.pipeSummary.main).map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between rounded bg-purple-800 p-2"
                                        >
                                            <div className="text-sm">
                                                <p className="font-medium text-white">
                                                    {item.pipe.name || item.pipe.productCode} -{' '}
                                                    {item.pipe.sizeMM}mm
                                                </p>
                                                <p className="text-xs text-purple-200">
                                                    {item.zones.join(', ')} | {item.pipe.price}{' '}
                                                    บาท/ม้วน
                                                </p>
                                            </div>
                                            <div className="text-right text-sm">
                                                <p className="text-purple-200">
                                                    {item.quantity} ม้วน
                                                </p>
                                                <p className="font-bold text-white">
                                                    {(
                                                        item.pipe.price * item.quantity
                                                    ).toLocaleString()}{' '}
                                                    บาท
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Cost Summary Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* สปริงเกอร์ - แสดงเสมอ */}
                <div className="rounded bg-gray-600 p-4">
                    <h4 className="font-medium text-green-300">💧 สปริงเกอร์ทั้งหมด</h4>
                    <p className="text-sm">
                        {uniqueSprinklers} ชนิด | รวม{' '}
                        {Object.values(costs.sprinklerSummary).reduce(
                            (sum, item) => sum + item.quantity,
                            0
                        )}{' '}
                        หัว
                    </p>
                    {projectData?.useZones && projectData.zones.length > 1 && (
                        <p className="text-xs text-gray-300">({projectData.zones.length} โซน)</p>
                    )}
                    <p className="text-xl font-bold">
                        {costs.totalSprinklerCost.toLocaleString()} บาท
                    </p>
                </div>

                {/* ปั๊มน้ำ - แสดงเสมอ */}
                <div className="rounded bg-gray-600 p-4">
                    <h4 className="font-medium text-red-300">⚡ ปั๊มน้ำ</h4>
                    <p className="text-sm">
                        {effectivePump
                            ? effectivePump.name || effectivePump.productCode
                            : 'ไม่มีข้อมูล'}
                    </p>
                    <p className="text-sm">จำนวน: 1 ตัว ({effectivePump?.powerHP || 'N/A'} HP)</p>
                    <p className="text-xl font-bold">{costs.pumpCost.toLocaleString()} บาท</p>
                    {effectivePump && (
                        <p className="mt-1 text-xs text-green-300">
                            {getSelectionStatus(
                                effectivePump,
                                'ปั๊ม',
                                effectivePump.id === results.autoSelectedPump?.id
                            )}
                        </p>
                    )}
                </div>

                {/* ท่อรวม */}
                <div className="rounded bg-gray-600 p-4">
                    <h4 className="font-medium text-purple-300">🔧 ท่อทั้งหมด</h4>
                    <div className="space-y-1 text-sm">
                        <p>ท่อย่อย: {costs.totalBranchPipeCost.toLocaleString()} บาท</p>
                        {costs.totalSecondaryPipeCost > 0 && (
                            <p>ท่อรอง: {costs.totalSecondaryPipeCost.toLocaleString()} บาท</p>
                        )}
                        {costs.totalMainPipeCost > 0 && (
                            <p>ท่อหลัก: {costs.totalMainPipeCost.toLocaleString()} บาท</p>
                        )}
                    </div>
                    <p className="text-xl font-bold">
                        {(
                            costs.totalBranchPipeCost +
                            costs.totalSecondaryPipeCost +
                            costs.totalMainPipeCost
                        ).toLocaleString()}{' '}
                        บาท
                    </p>
                </div>

                {/* รวมทั้งหมด */}
                <div className="rounded bg-gradient-to-r from-green-600 to-blue-600 p-4 md:col-span-2 lg:col-span-3">
                    <h4 className="font-medium text-white">💎 รวมทั้งหมด</h4>
                    <p className="text-sm text-green-100">ราคาสุทธิ (ไม่รวม VAT)</p>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-2xl font-bold text-white">
                                {costs.totalCost.toLocaleString()} บาท
                            </p>
                            <p className="mt-1 text-xs text-green-200">
                                * รวมอุปกรณ์ที่เลือกอัตโนมัติและปรับแต่ง
                            </p>
                        </div>
                        <div className="text-right">
                            {projectData?.useZones && projectData.zones.length > 1 && (
                                <div className="text-sm text-green-100">
                                    <p>
                                        ราคาต่อโซน:{' '}
                                        {(
                                            costs.totalCost / projectData.zones.length
                                        ).toLocaleString()}{' '}
                                        บาท
                                    </p>
                                    <p>
                                        ราคาต่อไร่:{' '}
                                        {(
                                            costs.totalCost /
                                            (projectData.totalArea / 1600)
                                        ).toLocaleString()}{' '}
                                        บาท
                                    </p>
                                </div>
                            )}
                            {!projectData?.useZones && (
                                <div className="text-sm text-green-100">
                                    <p>
                                        ราคาต่อไร่:{' '}
                                        {(
                                            costs.totalCost /
                                            ((projectData?.totalArea || 1600) / 1600)
                                        ).toLocaleString()}{' '}
                                        บาท
                                    </p>
                                    <p>
                                        ราคาต่อต้น:{' '}
                                        {(
                                            costs.totalCost / (results.totalSprinklers || 1)
                                        ).toLocaleString()}{' '}
                                        บาท
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* สรุปความเหมาะสม */}
            <div className="mt-6 rounded bg-blue-900 p-4">
                <h3 className="mb-2 text-sm font-semibold text-blue-300">
                    📊 สรุปความเหมาะสมของอุปกรณ์:
                </h3>
                <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                    <div>
                        <h4 className="mb-1 font-medium text-blue-200">อุปกรณ์ที่แนะนำ:</h4>
                        <ul className="space-y-1 text-green-300">
                            {/* Check sprinklers */}
                            {Object.values(costs.sprinklerSummary).some(
                                (item) => item.sprinkler.score >= 70
                            ) && <li>• สปริงเกอร์: มีตัวที่แนะนำ</li>}
                            {/* Check pipes */}
                            {Object.values(costs.pipeSummary.branch).some(
                                (item) => item.pipe.isRecommended
                            ) && <li>• ท่อย่อย: มีตัวที่แนะนำ</li>}
                            {Object.values(costs.pipeSummary.secondary).some(
                                (item) => item.pipe.isRecommended
                            ) && <li>• ท่อรอง: มีตัวที่แนะนำ</li>}
                            {Object.values(costs.pipeSummary.main).some(
                                (item) => item.pipe.isRecommended
                            ) && <li>• ท่อหลัก: มีตัวที่แนะนำ</li>}
                            {effectivePump?.isRecommended && (
                                <li>• ปั๊ม: {effectivePump.productCode}</li>
                            )}
                        </ul>
                        {!(
                            Object.values(costs.sprinklerSummary).some(
                                (item) => item.sprinkler.score >= 70
                            ) ||
                            Object.values(costs.pipeSummary.branch).some(
                                (item) => item.pipe.isRecommended
                            ) ||
                            effectivePump?.isRecommended
                        ) && <p className="text-yellow-300">ไม่มีอุปกรณ์ในระดับแนะนำ</p>}
                    </div>
                    <div>
                        <h4 className="mb-1 font-medium text-blue-200">สถิติการเลือก:</h4>
                        <ul className="space-y-1 text-yellow-300">
                            <li>• สปริงเกอร์: {uniqueSprinklers} ชนิด</li>
                            <li>• ท่อย่อย: {uniqueBranchPipes} ชนิด</li>
                            {uniqueSecondaryPipes > 0 && (
                                <li>• ท่อรอง: {uniqueSecondaryPipes} ชนิด</li>
                            )}
                            {uniqueMainPipes > 0 && <li>• ท่อหลัก: {uniqueMainPipes} ชนิด</li>}
                            <li>• ปั๊ม: 1 ตัว</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* คำแนะนำเพิ่มเติม */}
            {costs.totalCost > 0 && (
                <div className="mt-4 rounded bg-purple-900 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-purple-300">💡 คำแนะนำ:</h3>
                    <div className="space-y-1 text-xs text-purple-100">
                        <p>• ราคานี้เป็นการประมาณการตามอุปกรณ์ที่เลือก (อัตโนมัติ + ปรับแต่ง)</p>
                        <p>• ควรตรวจสอบสต็อกสินค้าก่อนการสั่งซื้อ</p>
                        <p>• ราคาไม่รวมค่าติดตั้งและอุปกรณ์เสริมอื่นๆ</p>
                        {projectData?.useZones && projectData.zones.length > 1 && (
                            <p>• แต่ละโซนสามารถติดตั้งแยกจากกันได้ เพื่อกระจายต้นทุน</p>
                        )}
                        {costs.totalCost > 100000 && (
                            <p>• สำหรับโครงการขนาดใหญ่ อาจได้รับส่วนลดพิเศษ</p>
                        )}
                    </div>
                </div>
            )}

            {/* ปุ่มออกใบเสนอราคา */}
            <div className="mt-6 text-center">
                <button
                    onClick={onQuotationClick}
                    className="rounded bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 text-lg font-bold text-white hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={costs.totalCost === 0}
                >
                    📋 ออกใบเสนอราคา
                </button>
                {costs.totalCost === 0 && (
                    <p className="mt-2 text-sm text-red-400">
                        กรุณาเลือกสปริงเกอร์เพื่อให้ระบบคำนวณราคา
                    </p>
                )}
            </div>
        </div>
    );
};

export default CostSummary;
