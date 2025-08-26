/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { 
    FaVectorSquare, 
    FaBezierCurve, 
    FaEdit, 
    FaCheck, 
    FaTimes, 
    FaUndo,
    FaInfoCircle,
    FaCog
} from 'react-icons/fa';

interface CurvedPipeControlPanelProps {
    isActive: boolean;
    drawingMode: 'straight' | 'curved';
    onDrawingModeChange: (mode: 'straight' | 'curved') => void;
    onStartDrawing: () => void;
    onFinishDrawing: () => void;
    onCancelDrawing: () => void;
    onClearAll: () => void;
    isDrawing: boolean;
    anchorPointsCount: number;
    curveSettings: {
        tension: number;
        smoothness: number;
        showControlPoints: boolean;
    };
    onCurveSettingsChange: (settings: any) => void;
    t: (key: string) => string;
}

const CurvedPipeControlPanel: React.FC<CurvedPipeControlPanelProps> = ({
    isActive,
    drawingMode,
    onDrawingModeChange,
    onStartDrawing,
    onFinishDrawing,
    onCancelDrawing,
    onClearAll,
    isDrawing,
    anchorPointsCount,
    curveSettings,
    onCurveSettingsChange,
    t
}) => {
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

    if (!isActive) return null;

    return (
        <div className="fixed top-20 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[300px] z-[1000]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <FaBezierCurve className="text-blue-600" />
                    {t('วาดท่อแบบโค้ง')}
                </h3>
                <button
                    onClick={onCancelDrawing}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title={t('close') || 'ปิด'}
                >
                    <FaTimes size={16} />
                </button>
            </div>

            {/* Drawing Mode Selection */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('โหมดการวาด')}
                </label>
                <div className="flex gap-2">
                    <button
                        onClick={() => onDrawingModeChange('straight')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                            drawingMode === 'straight'
                                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                                : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200'
                        }`}
                    >
                        <FaVectorSquare size={14} />
                        {t('เส้นตรง')}
                    </button>
                    <button
                        onClick={() => onDrawingModeChange('curved')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                            drawingMode === 'curved'
                                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                                : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200'
                        }`}
                    >
                        <FaBezierCurve size={14} />
                        {t('เส้นโค้ง')}
                    </button>
                </div>
            </div>

            {/* Drawing Status */}
            {isDrawing && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                        <FaInfoCircle size={14} />
                        <span className="text-sm font-medium">
                            {t('กำลังวาด')}
                        </span>
                    </div>
                    <div className="text-sm text-blue-600">
                        {t('จุดควบคุม')}: {anchorPointsCount}
                    </div>
                    {drawingMode === 'curved' && anchorPointsCount > 0 && (
                        <div className="text-xs text-blue-500 mt-1">
                            • {t('คลิกเพื่อเพิ่มจุด')}
                            <br />
                            • {t('คลิกขวาเพื่อจบ')}
                            <br />
                            • {t('ลากจุดเพื่อปรับตำแหน่ง')}
                        </div>
                    )}
                </div>
            )}

            {/* Curve Settings (only show in curved mode) */}
            {drawingMode === 'curved' && (
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">
                            {t('การตั้งค่าเส้นโค้ง')}
                        </label>
                        <button
                            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <FaCog size={14} />
                        </button>
                    </div>

                    {/* Basic Settings */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">
                                {t('ความโค้ง')}: {curveSettings.tension}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={curveSettings.tension}
                                onChange={(e) => onCurveSettingsChange({
                                    ...curveSettings,
                                    tension: parseFloat(e.target.value)
                                })}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-600 mb-1">
                                {t('ความนุ่มนวล')}: {curveSettings.smoothness}
                            </label>
                            <input
                                type="range"
                                min="10"
                                max="100"
                                step="10"
                                value={curveSettings.smoothness}
                                onChange={(e) => onCurveSettingsChange({
                                    ...curveSettings,
                                    smoothness: parseInt(e.target.value)
                                })}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-xs text-gray-600">
                                {t('แสดงจุดควบคุม')}
                            </label>
                            <button
                                onClick={() => onCurveSettingsChange({
                                    ...curveSettings,
                                    showControlPoints: !curveSettings.showControlPoints
                                })}
                                className={`w-12 h-6 rounded-full transition-colors ${
                                    curveSettings.showControlPoints
                                        ? 'bg-green-500'
                                        : 'bg-gray-300'
                                } relative`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                                    curveSettings.showControlPoints
                                        ? 'transform translate-x-6'
                                        : 'transform translate-x-1'
                                }`} />
                            </button>
                        </div>
                    </div>

                    {/* Advanced Settings */}
                    {showAdvancedSettings && (
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                            <div className="text-xs text-gray-500">
                                {t('การตั้งค่าขั้นสูง')}
                            </div>
                            
                            {/* Presets */}
                            <div className="grid grid-cols-3 gap-1">
                                <button
                                    onClick={() => onCurveSettingsChange({
                                        tension: 0.2,
                                        smoothness: 30,
                                        showControlPoints: true
                                    })}
                                    className="text-xs py-1 px-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                >
                                        {t('อ่อน')}
                                </button>
                                <button
                                    onClick={() => onCurveSettingsChange({
                                        tension: 0.5,
                                        smoothness: 50,
                                        showControlPoints: true
                                    })}
                                    className="text-xs py-1 px-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                >
                                    {t('ปกติ')}
                                </button>
                                <button
                                    onClick={() => onCurveSettingsChange({
                                        tension: 0.8,
                                        smoothness: 70,
                                        showControlPoints: true
                                    })}
                                    className="text-xs py-1 px-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                                >
                                    {t('คม')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
                {!isDrawing ? (
                    <button
                        onClick={onStartDrawing}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
                    >
                        <FaEdit size={14} />
                        {t('เริ่มวาด')}
                    </button>
                ) : (
                    <>
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
                    </>
                )}
            </div>

            {/* Clear All Button */}
            {!isDrawing && (
                <button
                    onClick={onClearAll}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors"
                >
                    <FaUndo size={14} />
                    {t('ล้างทั้งหมด')}
                </button>
            )}

            {/* Instructions */}
            {drawingMode === 'curved' && !isDrawing && (
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="text-xs text-gray-600">
                        <div className="font-medium mb-1">
                            {t('วิธีใช้งาน')}:
                        </div>
                        <ul className="space-y-1 text-xs">
                            <li>• {t('คลิกเพื่อวางจุดควบคุม')}</li>
                            <li>• {t('ลากจุดเพื่อปรับรูปร่างโค้ง')}</li>
                            <li>• {t('คลิกขวาเพื่อจบการวาด')}</li>
                            <li>• {t('ต้องมีอย่างน้อย 2 จุด')}</li>
                            <li>• {t('จุดสีเขียว = ปลายท่อ (ไม่ขยับเอง)')}</li>
                            <li>• {t('จุดสีแดง = จุดควบคุม (ปรับโค้งได้)')}</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CurvedPipeControlPanel;
