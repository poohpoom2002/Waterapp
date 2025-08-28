// components/horticulture/LateralPipeModeSelector.tsx
import React from 'react';
import { 
    FaWater, 
    FaTimes,
} from 'react-icons/fa';

interface LateralPipeModeSelectorProps {
    isVisible: boolean;
    onModeSelect: (mode: 'over_plants' | 'between_plants') => void;
    onCancel: () => void;
    t: (key: string) => string;
}

const LateralPipeModeSelector: React.FC<LateralPipeModeSelectorProps> = ({
    isVisible,
    onModeSelect,
    onCancel,
    t
}) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
            <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-200 p-6 max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <FaWater className="text-blue-600" />
                        {t('เลือกโหมดการวางท่อย่อย') || 'เลือกโหมดการวางท่อย่อย'}
                    </h3>
                    <button
                        onClick={onCancel}
                        className="text-white hover:text-gray-600 transition-colors"
                        title={t('ปิด') || 'ปิด'}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Mode Options */}
                <div className="space-y-4 mb-6">
                    {/* Mode A: Over Plants */}
                    <button
                        onClick={() => onModeSelect('over_plants')}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-green-500 transition-all text-left group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-32 h-32 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors overflow-hidden">
                                <img
                                    src="/images/over_plants.png"
                                    alt={t('วางทับแนวต้นไม้') || 'วางทับแนวต้นไม้'}
                                    className="object-contain w-full h-full"
                                />
                            </div>
                            <div className="flex-1 flex items-center">
                                <h4 className="font-semibold text-white text-lg">
                                    {t('วางทับแนวต้นไม้') || 'วางทับแนวต้นไม้'}
                                </h4>
                            </div>
                        </div>
                    </button>

                    {/* Mode B: Between Plants */}
                    <button
                        onClick={() => onModeSelect('between_plants')}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-500 transition-all text-left group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-32 h-32 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors overflow-hidden">
                                <img
                                    src="/images/between_plants.png"
                                    alt={t('วางระหว่างแนวต้นไม้') || 'วางระหว่างแนวต้นไม้'}
                                    className="object-contain w-full h-full"
                                />
                            </div>
                            <div className="flex-1 flex items-center">
                                <h4 className="font-semibold text-white text-lg">
                                    {t('วางระหว่างแนวต้นไม้') || 'วางระหว่างแนวต้นไม้'}
                                </h4>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Cancel Button */}
                <div className="mt-6">
                    <button
                        onClick={onCancel}
                        className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors"
                    >
                        {t('ยกเลิก') || 'ยกเลิก'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LateralPipeModeSelector;
