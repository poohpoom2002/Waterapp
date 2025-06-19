// C:\webchaiyo\Waterapp\resources\js\pages\components\CostSummary.tsx
import React from 'react';
import { CalculationResults } from '../types/interfaces';

interface CostSummaryProps {
    results: CalculationResults;
    selectedSprinkler: any;
    selectedPump: any;
    selectedBranchPipe: any;
    selectedSecondaryPipe?: any; // Optional เพราะอาจไม่มี
    selectedMainPipe?: any; // Optional เพราะอาจไม่มี
    onQuotationClick: () => void;
}

const CostSummary: React.FC<CostSummaryProps> = ({
    results,
    selectedSprinkler,
    selectedPump,
    selectedBranchPipe,
    selectedSecondaryPipe,
    selectedMainPipe,
    onQuotationClick,
}) => {
    const sprinklerCost = (selectedSprinkler?.price || 0) * results.totalSprinklers;
    const pumpCost = selectedPump?.price || 0;
    const branchPipeCost = (selectedBranchPipe?.price || 0) * results.branchPipeRolls;
    const secondaryPipeCost = selectedSecondaryPipe 
        ? (selectedSecondaryPipe.price || 0) * results.secondaryPipeRolls 
        : 0;
    const mainPipeCost = selectedMainPipe 
        ? (selectedMainPipe.price || 0) * results.mainPipeRolls 
        : 0;
    
    const totalCost = sprinklerCost + pumpCost + branchPipeCost + secondaryPipeCost + mainPipeCost;

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h2 className="mb-4 text-xl font-semibold text-yellow-400">สรุปราคารวม 💰</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* สปริงเกอร์ - แสดงเสมอ */}
                <div className="rounded bg-gray-600 p-4">
                    <h4 className="font-medium text-green-300">สปริงเกอร์</h4>
                    <p className="text-sm">จำนวน: {results.totalSprinklers} หัว</p>
                    <p className="text-xl font-bold">
                        {sprinklerCost.toLocaleString()} บาท
                    </p>
                </div>
                
                {/* ปั๊มน้ำ - แสดงเสมอ */}
                <div className="rounded bg-gray-600 p-4">
                    <h4 className="font-medium text-red-300">ปั๊มน้ำ</h4>
                    <p className="text-sm">จำนวน: 1 ตัว ({selectedPump?.powerHP || 'N/A'} HP)</p>
                    <p className="text-xl font-bold">
                        {pumpCost.toLocaleString()} บาท
                    </p>
                </div>
                
                {/* ท่อย่อย - แสดงเสมอ */}
                <div className="rounded bg-gray-600 p-4">
                    <h4 className="font-medium text-purple-300">ท่อย่อย</h4>
                    <p className="text-sm">
                        จำนวน: {results.branchPipeRolls} ม้วน ({selectedBranchPipe?.sizeMM || 'N/A'}mm)
                    </p>
                    <p className="text-xl font-bold">
                        {branchPipeCost.toLocaleString()} บาท
                    </p>
                </div>
                
                {/* ท่อเมนรอง - แสดงเฉพาะเมื่อมีข้อมูล */}
                {selectedSecondaryPipe && (
                    <div className="rounded bg-gray-600 p-4">
                        <h4 className="font-medium text-orange-300">ท่อเมนรอง</h4>
                        <p className="text-sm">
                            จำนวน: {results.secondaryPipeRolls} ม้วน ({selectedSecondaryPipe.sizeMM}mm)
                        </p>
                        <p className="text-xl font-bold">
                            {secondaryPipeCost.toLocaleString()} บาท
                        </p>
                    </div>
                )}
                
                {/* ท่อเมนหลัก - แสดงเฉพาะเมื่อมีข้อมูล */}
                {selectedMainPipe && (
                    <div className="rounded bg-gray-600 p-4">
                        <h4 className="font-medium text-cyan-300">ท่อเมนหลัก</h4>
                        <p className="text-sm">
                            จำนวน: {results.mainPipeRolls} ม้วน ({selectedMainPipe.sizeMM}mm)
                        </p>
                        <p className="text-xl font-bold">
                            {mainPipeCost.toLocaleString()} บาท
                        </p>
                    </div>
                )}
                
                {/* รวมทั้งหมด */}
                <div className={`rounded bg-gradient-to-r from-green-600 to-blue-600 p-4 ${(!selectedSecondaryPipe && !selectedMainPipe) ? 'md:col-span-2 lg:col-span-3' : ''}`}>
                    <h4 className="font-medium text-white">💎 รวมทั้งหมด</h4>
                    <p className="text-sm text-green-100">ราคาสุทธิ (ไม่รวม VAT)</p>
                    <p className="text-2xl font-bold text-white">
                        {totalCost.toLocaleString()} บาท
                    </p>
                    {(!selectedSecondaryPipe || !selectedMainPipe) && (
                        <p className="text-xs text-green-200 mt-1">
                            * ไม่รวมท่อที่ไม่มีข้อมูลจาก Generate Tree
                        </p>
                    )}
                </div>
            </div>

            {/* ปุ่มออกใบเสนอราคา */}
            <div className="mt-6 text-center">
                <button
                    onClick={onQuotationClick}
                    className="rounded bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 text-lg font-bold text-white hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    📋 ออกใบเสนอราคา
                </button>
            </div>
        </div>
    );
};

export default CostSummary;