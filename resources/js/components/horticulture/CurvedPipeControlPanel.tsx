import React from 'react';
import { 
    FaBezierCurve, 
    FaTimes, 
    FaCheck, 
    FaUndo,
    FaInfoCircle
} from 'react-icons/fa';

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
    onFinishDrawing,
    onCancelDrawing,
    onClearAll,
    anchorPointsCount,
    showGuides,
    onShowGuidesChange,
    t
}) => {
    if (!isActive) return null;

    return (
        <div className="fixed top-20 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[300px] z-[100] pointer-events-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <FaBezierCurve className="text-blue-600" />
                    {t('วาดท่อ PE โค้งง่าย')}
                </h3>
                <button
                    onClick={onCancelDrawing}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title={t('close') || 'ปิด'}
                >
                    <FaTimes size={16} />
                </button>
            </div>

            {/* Simple Description */}
            <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                    <FaBezierCurve className="text-green-600" size={16} />
                    <span className="text-sm font-medium text-green-800">
                        {t('โค้งง่าย ลากเท่าไหร่ โค้งเท่านั้น')}
                    </span>
                </div>
                <p className="text-xs text-green-700">
                    {t('ลากจุดออกจากมุม = ขนาดรัศมีโค้ง (ลากไกล = โค้งใหญ่)')}
                </p>
            </div>

            {/* Drawing Status - แสดงสถานะการวาดแบบอัตโนมัติ */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <FaInfoCircle size={14} />
                    <span className="text-sm font-medium">
                        {t('กำลังวาดท่อโค้ง')}
                    </span>
                </div>
                <div className="text-sm text-blue-600">
                    {t('จุดควบคุม')}: {anchorPointsCount}
                </div>
                <div className="text-xs text-blue-500 mt-1">
                    • {t('คลิกเพื่อเพิ่มจุด')}
                    <br />
                    • {t('คลิกขวาเพื่อจบ')}
                    <br />
                    • {t('ลากจุดออกจากมุม = กำหนดรัศมี')}
                </div>
            </div>

            {/* Simple Guide Toggle */}
            <div className="mb-4">
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
            </div>

            {/* Action Buttons - ลบปุ่ม "เริ่มวาด" เนื่องจากเริ่มการวาดโดยอัตโนมัติแล้ว */}
            <div className="flex gap-2">
                <button
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
                </button>
                <button
                    onClick={onCancelDrawing}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors"
                >
                    <FaTimes size={14} />
                    {t('ยกเลิก')}
                </button>
            </div>

            {/* Clear All Button */}
            <button
                onClick={onClearAll}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors"
            >
                <FaUndo size={14} />
                {t('ล้างทั้งหมด')}
            </button>

            {/* Simple Instructions - แสดงตลอดเวลา */}
            <div className="mt-4">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-md">
                    <div className="text-xs text-blue-800">
                        <div className="font-medium mb-2 flex items-center gap-1">
                            <FaInfoCircle className="text-blue-600" />
                            {t('วิธีใช้งานแบบง่าย')}:
                        </div>
                        <ul className="space-y-1">
                            <li>• <strong>{t('คลิกวางจุด')}</strong> {t('ตามเส้นทางท่อ')}</li>
                            <li>• <strong>{t('ลากจุดออกจากมุม')}</strong> = {t('กำหนดรัศมีโค้ง')}</li>
                            <li>• <strong>{t('ลากไกล')}</strong> = {t('โค้งใหญ่')}, <strong>{t('ลากใกล้')}</strong> = {t('โค้งเล็ก')}</li>
                            <li>• <strong>{t('คลิกขวา')}</strong> {t('เพื่อจบการวาด')}</li>
                            <li>• {t('จุดเขียว')} = {t('ปลายท่อ')} ({t('ไม่เลื่อน')})</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CurvedPipeControlPanel;