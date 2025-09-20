import React from 'react';
import { FaBezierCurve, FaTimes, FaInfoCircle } from 'react-icons/fa';

interface CurvedPipeControlPanelProps {
    isActive: boolean;
    onFinishDrawing: () => void;
    onCancelDrawing: () => void;
    onClearAll: () => void;
    anchorPointsCount: number;
    showGuides: boolean;
    onShowGuidesChange: (show: boolean) => void;
    t: (key: string) => string;
}

const CurvedPipeControlPanel: React.FC<CurvedPipeControlPanelProps> = ({
    isActive,
    onCancelDrawing,
    // showGuides,
    // onShowGuidesChange,
    t,
}) => {
    if (!isActive) return null;

    return (
        <div className="pointer-events-auto fixed right-4 top-20 z-[100] min-w-[300px] rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                    <FaBezierCurve className="text-blue-600" />
                    {t('กำลังลากท่อ')}
                </h3>
                <button
                    onClick={onCancelDrawing}
                    className="text-gray-400 transition-colors hover:text-gray-600"
                    title={t('close') || 'ปิด'}
                >
                    <FaTimes size={16} />
                </button>
            </div>

            {/* Simple Guide Toggle */}
            {/* <div className="mb-4">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                        {t('แสดงเส้นไกด์')}
                    </label>
                    <button
                        onClick={() => onShowGuidesChange(!showGuides)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                            showGuides
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                        } relative`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                            showGuides
                                ? 'transform translate-x-6'
                                : 'transform translate-x-1'
                        }`} />
                    </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                    {t('เปิดเพื่อเห็นรัศมีโค้งขณะลากจุด')}
                </p>
            </div> */}

            {/* Action Buttons - ลบปุ่ม "เริ่มวาด" เนื่องจากเริ่มการวาดโดยอัตโนมัติแล้ว */}
            <div className="flex gap-2">
                {/* <button
                    onClick={onFinishDrawing}
                    disabled={anchorPointsCount < 2}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md font-medium transition-colors ${
                        anchorPointsCount >= 2
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    <FaCheck size={14} />
                    {t('เสร็จ')}
                </button> */}
                <button
                    onClick={onCancelDrawing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 px-3 py-2 font-medium text-white transition-colors hover:bg-red-700"
                >
                    <FaTimes size={14} />
                    {t('ยกเลิก')}
                </button>
            </div>

            {/* Simple Instructions - แสดงตลอดเวลา */}
            <div className="mt-4">
                <div className="rounded-md border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
                    <div className="text-xs text-blue-800">
                        <div className="mb-2 flex items-center gap-1 font-medium">
                            <FaInfoCircle className="text-blue-600" />
                            {t('วิธีใช้งานแบบง่าย')}:
                        </div>
                        <ul className="space-y-1">
                            <li>
                                • <strong>{t('คลิกวางจุด')}</strong> {t('ตามเส้นทางท่อ')}
                            </li>
                            <li>
                                • <strong>{t('ลากจุดออกจากมุม')}</strong> = {t('กำหนดรัศมีโค้ง')}
                            </li>
                            <li>
                                • <strong>{t('ลากไกล')}</strong> = {t('โค้งใหญ่')},{' '}
                                <strong>{t('ลากใกล้')}</strong> = {t('โค้งเล็ก')}
                            </li>
                            <li>
                                • <strong>{t('คลิกขวา')}</strong> {t('เพื่อจบการวาด')}
                            </li>
                            <li>
                                • {t('จุดเขียว')} = {t('ปลายท่อ')} ({t('ไม่เลื่อน')})
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CurvedPipeControlPanel;
