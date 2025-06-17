// components/CostSummary.tsx
import React from 'react';
import { CalculationResults } from '../types/interfaces';

interface CostSummaryProps {
    results: CalculationResults;
    selectedSprinkler: any;
    selectedPump: any;
    selectedBranchPipe: any;
    selectedSecondaryPipe: any;
    selectedMainPipe: any;
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
    const totalCost =
        (selectedSprinkler?.price || 0) * results.totalSprinklers +
        (selectedPump?.price || 0) +
        (selectedBranchPipe?.price || 0) * results.branchPipeRolls +
        (selectedSecondaryPipe?.price || 0) * results.secondaryPipeRolls +
        (selectedMainPipe?.price || 0) * results.mainPipeRolls;

    return (
        <div className="rounded-lg bg-gray-700 p-6">
            <h2 className="mb-4 text-xl font-semibold text-yellow-400">สรุปราคารวม 💰</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded bg-gray-600 p-4">
                    <h4 className="font-medium text-green-300">สปริงเกอร์</h4>
                    <p className="text-sm">จำนวน: {results.totalSprinklers} หัว</p>
                    <p className="text-xl font-bold">
                        {((selectedSprinkler?.price || 0) * results.totalSprinklers).toLocaleString()}{' '}
                        บาท
                    </p>
                </div>
                <div className="rounded bg-gray-600 p-4">
                    <h4 className="font-medium text-red-300">ปั๊มน้ำ</h4>
                    <p className="text-sm">
                        จำนวน: 1 ตัว ({selectedPump?.powerHP || 'N/A'} HP)
                    </p>
                    <p className="text-xl font-bold">
                        {(selectedPump?.price || 0).toLocaleString()} บาท
                    </p>
                </div>
                <div className="rounded bg-gray-600 p-4">
                    <h4 className="font-medium text-purple-300">ท่อย่อย</h4>
                    <p className="text-sm">
                        จำนวน: {results.branchPipeRolls} ม้วน ({selectedBranchPipe?.sizeMM || 'N/A'}mm)
                    </p>
                    <p className="text-xl font-bold">
                        {((selectedBranchPipe?.price || 0) * results.branchPipeRolls).toLocaleString()}{' '}
                        บาท
                    </p>
                </div>
                <div className="rounded bg-gray-600 p-4">
                    <h4 className="font-medium text-orange-300">ท่อเมนรอง</h4>
                    <p className="text-sm">
                        จำนวน: {results.secondaryPipeRolls} ม้วน ({selectedSecondaryPipe?.sizeMM || 'N/A'}mm)
                    </p>
                    <p className="text-xl font-bold">
                        {((selectedSecondaryPipe?.price || 0) * results.secondaryPipeRolls).toLocaleString()}{' '}
                        บาท
                    </p>
                </div>
                <div className="rounded bg-gray-600 p-4">
                    <h4 className="font-medium text-cyan-300">ท่อเมนหลัก</h4>
                    <p className="text-sm">
                        จำนวน: {results.mainPipeRolls} ม้วน ({selectedMainPipe?.sizeMM || 'N/A'}mm)
                    </p>
                    <p className="text-xl font-bold">
                        {((selectedMainPipe?.price || 0) * results.mainPipeRolls).toLocaleString()}{' '}
                        บาท
                    </p>
                </div>
                <div className="rounded bg-gradient-to-r from-green-600 to-blue-600 p-4">
                    <h4 className="font-medium text-white">💎 รวมทั้งหมด</h4>
                    <p className="text-sm text-green-100">ราคาสุทธิ (ไม่รวม VAT)</p>
                    <p className="text-2xl font-bold text-white">
                        {totalCost.toLocaleString()} บาท
                    </p>
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