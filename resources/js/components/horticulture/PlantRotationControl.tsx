/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { 
    FaRedo, 
    FaTimes, 
    FaUndo,
    FaCheck,
    FaSpinner
} from 'react-icons/fa';

interface PlantRotationControlProps {
    isVisible: boolean;
    onClose: () => void;
    currentRotationAngle: number;
    onRotationChange: (angle: number) => void;
    onApplyRotation: () => void;
    isApplying: boolean;
    t: (key: string) => string;
}

const PlantRotationControl: React.FC<PlantRotationControlProps> = ({
    isVisible,
    onClose,
    currentRotationAngle,
    onRotationChange,
    onApplyRotation,
    isApplying,
    t
}) => {
    const [localRotationAngle, setLocalRotationAngle] = useState(currentRotationAngle);

    if (!isVisible) return null;

    const handleSliderChange = (value: number) => {
        setLocalRotationAngle(value);
        onRotationChange(value);
        // เรียกใช้การปรับมุมเอียงทันที
        onApplyRotation();
    };

    const handleReset = () => {
        setLocalRotationAngle(0.0);
        onRotationChange(0.0);
        // เรียกใช้การปรับมุมเอียงทันที
        onApplyRotation();
    };

    const handleApply = () => {
        onApplyRotation();
    };

    const handleClose = () => {
        setLocalRotationAngle(currentRotationAngle);
        onClose();
    };

    return (
        <div className="absolute right-4 top-4 z-[1000] w-80 rounded-lg border border-gray-300 bg-white shadow-2xl">
            {/* Header */}
            <div className="rounded-t-lg bg-blue-600 px-3 py-2 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FaRedo className="text-blue-200" />
                        <span className="font-medium">
                            {t('ปรับมุมเอียงต้นไม้') || 'ปรับมุมเอียงต้นไม้'}
                        </span>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-blue-200 hover:text-white transition-colors"
                        title={t('ปิด') || 'ปิด'}
                    >
                        <FaTimes size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Current Status */}
                <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-sm text-gray-600 mb-1">
                        {t('มุมเอียงปัจจุบัน') || 'มุมเอียงปัจจุบัน'}:
                    </div>
                                         <div className="flex items-center gap-2">
                         <div className="text-lg font-bold text-gray-800">
                             {currentRotationAngle.toFixed(1)}°
                         </div>
                         {isApplying && (
                             <FaSpinner size={16} className="animate-spin text-blue-600" />
                         )}
                     </div>
                </div>

                {/* Rotation Control */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('ปรับมุมเอียง') || 'ปรับมุมเอียง'}
                    </label>
                    <div className="space-y-3">
                        <div>
                                                         <div className="flex justify-between text-sm text-gray-600 mb-1">
                                 <span>{t('มุมเอียง') || 'มุมเอียง'}:</span>
                                 <span className="font-medium">{localRotationAngle.toFixed(1)}°</span>
                             </div>
                                                         <input
                                 type="range"
                                 min="-90"
                                 max="90"
                                 step="0.5"
                                 value={localRotationAngle}
                                 onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                                 className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer plant-generation-slider"
                             />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>-90°</span>
                                <span>0°</span>
                                <span>90°</span>
                            </div>
                        </div>
                        
                                                 {/* Quick Buttons */}
                         <div className="grid grid-cols-3 gap-2">
                             <button
                                 onClick={() => handleSliderChange(localRotationAngle - 0.5)}
                                 className="px-2 py-1 text-xs rounded transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300"
                             >
                                 -0.5°
                             </button>
                             <button
                                 onClick={() => handleSliderChange(0.0)}
                                 className={`px-2 py-1 text-xs rounded transition-colors ${
                                     localRotationAngle === 0.0
                                         ? 'bg-blue-600 text-white'
                                         : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                 }`}
                             >
                                 0°
                             </button>
                             <button
                                 onClick={() => handleSliderChange(localRotationAngle + 0.5)}
                                 className="px-2 py-1 text-xs rounded transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300"
                             >
                                 +0.5°
                             </button>
                         </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors"
                    >
                        <FaUndo size={14} />
                        {t('รีเซ็ต') || 'รีเซ็ต'}
                    </button>
                    <button
                        onClick={handleClose}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
                    >
                        <FaCheck size={14} />
                        {t('ปิด') || 'ปิด'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PlantRotationControl;
