/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import {
    FaWater,
    FaTree,
    FaSeedling,
    FaTimes,
    FaInfoCircle,
    FaExchangeAlt,
    FaCog,
    FaPlay,
    FaPause,
} from 'react-icons/fa';

interface ContinuousLateralPipePanelProps {
    isVisible: boolean;
    currentPlacementMode: 'over_plants' | 'between_plants' | null;
    totalPipesCreated: number;
    onChangePlacementMode: (mode: 'over_plants' | 'between_plants') => void;
    onStopContinuousDrawing: () => void;
    t: (key: string) => string;
}

const ContinuousLateralPipePanel: React.FC<ContinuousLateralPipePanelProps> = ({
    isVisible,
    currentPlacementMode,
    totalPipesCreated,
    onChangePlacementMode,
    onStopContinuousDrawing,
    t,
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="fixed left-4 top-[120px] z-[1000] min-w-[320px] max-w-[350px] rounded-lg border border-gray-200 bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50 p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-full bg-green-500">
                        <FaWater className="text-white" size={16} />
                    </div>
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                            {t('การวาดท่อย่อยต่อเนื่อง') || 'การวาดท่อย่อยต่อเนื่อง'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-green-600">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                            <span className="font-medium">
                                {t('สถานะ: กำลังวาด') || 'สถานะ: กำลังวาด'}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-gray-400 transition-colors hover:text-gray-600"
                    title={isExpanded ? t('ย่อแผง') || 'ย่อแผง' : t('ขยายแผง') || 'ขยายแผง'}
                >
                    {isExpanded ? <FaPause size={16} /> : <FaPlay size={16} />}
                </button>
            </div>

            {isExpanded && (
                <>
                    {/* Current Mode & Stats */}
                    <div className="space-y-3 p-3">
                        {/* Current Mode Display */}
                        <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50 p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">
                                    {t('โหมดปัจจุบัน') || 'โหมดปัจจุบัน'}
                                </span>
                                <span className="rounded-full bg-blue-500 px-2 py-1 text-xs text-white">
                                    {t('ACTIVE') || 'ACTIVE'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                                        currentPlacementMode === 'over_plants'
                                            ? 'bg-blue-100 text-blue-600'
                                            : currentPlacementMode === 'between_plants'
                                              ? 'bg-green-100 text-green-600'
                                              : 'bg-gray-100 text-gray-600'
                                    }`}
                                >
                                    {currentPlacementMode === 'over_plants' ? (
                                        <FaTree size={18} />
                                    ) : currentPlacementMode === 'between_plants' ? (
                                        <FaSeedling size={18} />
                                    ) : (
                                        <FaCog size={18} />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800">
                                        {currentPlacementMode === 'over_plants'
                                            ? `🎯 ${t('วางทับแนวต้นไม้') || 'วางทับแนวต้นไม้'}`
                                            : currentPlacementMode === 'between_plants'
                                              ? `🌱 ${t('วางระหว่างแนวต้นไม้') || 'วางระหว่างแนวต้นไม้'}`
                                              : `⚙️ ${t('รอการเลือกโหมด') || 'รอการเลือกโหมด'}`}
                                    </h4>
                                    <p className="text-xs text-gray-600">
                                        {currentPlacementMode === 'over_plants'
                                            ? t('ท่อจะถูกวางทับไปบนแนวยาวของต้นไม้') ||
                                              'ท่อจะถูกวางทับไปบนแนวยาวของต้นไม้'
                                            : currentPlacementMode === 'between_plants'
                                              ? t('ท่อจะถูกวางระหว่างแนวต้นไม้') ||
                                                'ท่อจะถูกวางระหว่างแนวต้นไม้'
                                              : t('กรุณาเลือกโหมดการวางท่อย่อย') ||
                                                'กรุณาเลือกโหมดการวางท่อย่อย'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Statistics */}
                        <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-blue-50 p-3">
                            <div className="mb-2 flex items-center gap-2">
                                <FaInfoCircle className="text-green-600" size={14} />
                                <span className="text-sm font-medium text-green-700">
                                    {t('สถิติการวาด') || 'สถิติการวาด'}
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-green-800">
                                {totalPipesCreated.toLocaleString()} {t('ท่อ') || 'ท่อ'}
                            </div>
                            <div className="text-xs text-green-600">
                                {t('จำนวนท่อย่อยที่สร้างในรอบนี้') ||
                                    'จำนวนท่อย่อยที่สร้างในรอบนี้'}
                            </div>
                        </div>

                        {/* Mode Change Buttons */}
                        <div className="space-y-2">
                            <div className="mb-2 flex items-center gap-2">
                                <FaExchangeAlt className="text-gray-600" size={14} />
                                <span className="text-sm font-medium text-gray-700">
                                    {t('เปลี่ยนรูปแบบการวาง') || 'เปลี่ยนรูปแบบการวาง'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {/* Over Plants Mode */}
                                <button
                                    onClick={() => onChangePlacementMode('over_plants')}
                                    disabled={currentPlacementMode === 'over_plants'}
                                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                                        currentPlacementMode === 'over_plants'
                                            ? 'cursor-not-allowed border-blue-300 bg-blue-50 opacity-60'
                                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <FaTree className="text-blue-600" size={16} />
                                        <div>
                                            <div className="font-medium text-gray-800">
                                                🎯 {t('วางทับแนวต้นไม้') || 'วางทับแนวต้นไม้'}
                                            </div>
                                            {currentPlacementMode === 'over_plants' && (
                                                <div className="text-xs font-medium text-blue-600">
                                                    ✅ {t('กำลังใช้งาน') || 'กำลังใช้งาน'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>

                                {/* Between Plants Mode */}
                                <button
                                    onClick={() => onChangePlacementMode('between_plants')}
                                    disabled={currentPlacementMode === 'between_plants'}
                                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                                        currentPlacementMode === 'between_plants'
                                            ? 'cursor-not-allowed border-green-300 bg-green-50 opacity-60'
                                            : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <FaSeedling className="text-green-600" size={16} />
                                        <div>
                                            <div className="font-medium text-gray-800">
                                                🌱{' '}
                                                {t('วางระหว่างแนวต้นไม้') || 'วางระหว่างแนวต้นไม้'}
                                            </div>
                                            {currentPlacementMode === 'between_plants' && (
                                                <div className="text-xs font-medium text-green-600">
                                                    ✅ {t('กำลังใช้งาน') || 'กำลังใช้งาน'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                            <div className="mb-2 flex items-center gap-2">
                                <FaInfoCircle className="text-yellow-600" size={14} />
                                <span className="text-sm font-medium text-yellow-700">
                                    {t('วิธีใช้งาน') || 'วิธีใช้งาน'}
                                </span>
                            </div>
                            <div className="space-y-1 text-xs text-yellow-700">
                                <div>
                                    •{' '}
                                    {t('คลิกเริ่มวาดที่ต้นไม้หรือท่อ Submain(สีม่วง)') ||
                                        'คลิกเริ่มวาดที่ต้นไม้หรือท่อ Submain(สีม่วง)'}
                                </div>
                                <div>
                                    •{' '}
                                    {t('เมื่อคลิกเริ่มดสร็จ ให้ลากไปตามแนวต้นไม้') ||
                                        'เมื่อคลิกเริ่มดสร็จ ให้ลากไปตามแนวต้นไม้'}
                                </div>
                                <div>
                                    •{' '}
                                    {t('คลิกขวาเพื่อเปลี่ยนทิศทางของท่อ') ||
                                        'คลิกขวาเพื่อเปลี่ยนทิศทางของท่อ'}
                                </div>
                                <div>• {t('คลิกซ้ายเพื่อจบการวาด') || 'คลิกซ้ายเพื่อจบการวาด'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <button
                            onClick={onStopContinuousDrawing}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-medium text-white transition-colors hover:bg-red-700"
                        >
                            <FaTimes size={16} />
                            {t('หยุดการวาดท่อย่อย') || 'หยุดการวาดท่อย่อย'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ContinuousLateralPipePanel;
