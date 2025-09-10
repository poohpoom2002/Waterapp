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
    FaPause
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
    t
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="fixed top-[120px] left-4 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[320px] max-w-[350px] z-[1000]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-full animate-pulse">
                        <FaWater className="text-white" size={16} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            {t('การวาดท่อย่อยต่อเนื่อง') || 'การวาดท่อย่อยต่อเนื่อง'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-medium">
                                {t('สถานะ: กำลังวาด') || 'สถานะ: กำลังวาด'}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title={isExpanded ? t('ย่อแผง') || 'ย่อแผง' : t('ขยายแผง') || 'ขยายแผง'}
                >
                    {isExpanded ? <FaPause size={16} /> : <FaPlay size={16} />}
                </button>
            </div>

            {isExpanded && (
                <>
                    {/* Current Mode & Stats */}
                    <div className="p-3 space-y-3">
                        {/* Current Mode Display */}
                        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                    {t('โหมดปัจจุบัน') || 'โหมดปัจจุบัน'}
                                </span>
                                <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                                    {t('ACTIVE') || 'ACTIVE'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                                    currentPlacementMode === 'over_plants' 
                                        ? 'bg-blue-100 text-blue-600' 
                                        : currentPlacementMode === 'between_plants'
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-gray-100 text-gray-600'
                                }`}>
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
                                            : `⚙️ ${t('รอการเลือกโหมด') || 'รอการเลือกโหมด'}`
                                        }
                                    </h4>
                                    <p className="text-xs text-gray-600">
                                        {currentPlacementMode === 'over_plants' 
                                            ? t('ท่อจะถูกวางทับไปบนแนวยาวของต้นไม้') || 'ท่อจะถูกวางทับไปบนแนวยาวของต้นไม้'
                                            : currentPlacementMode === 'between_plants'
                                            ? t('ท่อจะถูกวางระหว่างแนวต้นไม้') || 'ท่อจะถูกวางระหว่างแนวต้นไม้'
                                            : t('กรุณาเลือกโหมดการวางท่อย่อย') || 'กรุณาเลือกโหมดการวางท่อย่อย'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Statistics */}
                        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-3 border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                                <FaInfoCircle className="text-green-600" size={14} />
                                <span className="text-sm font-medium text-green-700">
                                    {t('สถิติการวาด') || 'สถิติการวาด'}
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-green-800">
                                {totalPipesCreated.toLocaleString()} {t('ท่อ') || 'ท่อ'}
                            </div>
                            <div className="text-xs text-green-600">
                                {t('จำนวนท่อย่อยที่สร้างในรอบนี้') || 'จำนวนท่อย่อยที่สร้างในรอบนี้'}
                            </div>
                        </div>

                        {/* Mode Change Buttons */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
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
                                    className={`p-3 rounded-lg text-left border-2 transition-all ${
                                        currentPlacementMode === 'over_plants'
                                            ? 'border-blue-300 bg-blue-50 cursor-not-allowed opacity-60'
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
                                                <div className="text-xs text-blue-600 font-medium">
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
                                    className={`p-3 rounded-lg text-left border-2 transition-all ${
                                        currentPlacementMode === 'between_plants'
                                            ? 'border-green-300 bg-green-50 cursor-not-allowed opacity-60'
                                            : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <FaSeedling className="text-green-600" size={16} />
                                        <div>
                                            <div className="font-medium text-gray-800">
                                                🌱 {t('วางระหว่างแนวต้นไม้') || 'วางระหว่างแนวต้นไม้'}
                                            </div>
                                            {currentPlacementMode === 'between_plants' && (
                                                <div className="text-xs text-green-600 font-medium">
                                                    ✅ {t('กำลังใช้งาน') || 'กำลังใช้งาน'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <FaInfoCircle className="text-yellow-600" size={14} />
                                <span className="text-sm font-medium text-yellow-700">
                                    {t('วิธีใช้งาน') || 'วิธีใช้งาน'}
                                </span>
                            </div>
                            <div className="text-xs text-yellow-700 space-y-1">
                                <div>• {t('คลิกเริ่มวาดที่ต้นไม้หรือท่อ Submain(สีม่วง)') || 'คลิกเริ่มวาดที่ต้นไม้หรือท่อ Submain(สีม่วง)'}</div>
                                <div>• {t('เมื่อคลิกเริ่มดสร็จ ให้ลากไปตามแนวต้นไม้') || 'เมื่อคลิกเริ่มดสร็จ ให้ลากไปตามแนวต้นไม้'}</div>
                                <div>• {t('คลิกขวาเพื่อเปลี่ยนทิศทางของท่อ') || 'คลิกขวาเพื่อเปลี่ยนทิศทางของท่อ'}</div>
                                <div>• {t('คลิกซ้ายเพื่อจบการวาด') || 'คลิกซ้ายเพื่อจบการวาด'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <button
                            onClick={onStopContinuousDrawing}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
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
