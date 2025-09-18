// components/horticulture/LateralPipeModeSelector.tsx
import React from 'react';
import { FaWater, FaTimes } from 'react-icons/fa';

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
    t,
}) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50">
            <div className="mx-4 w-full max-w-md rounded-lg border border-gray-200 bg-gray-800 p-6 shadow-2xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xl font-bold text-white">
                        <FaWater className="text-blue-600" />
                        {t('เลือกโหมดการวางท่อย่อย') || 'เลือกโหมดการวางท่อย่อย'}
                    </h3>
                    <button
                        onClick={onCancel}
                        className="text-white transition-colors hover:text-gray-600"
                        title={t('ปิด') || 'ปิด'}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Mode Options */}
                <div className="mb-6 space-y-4">
                    {/* Mode A: Over Plants */}
                    <button
                        onClick={() => onModeSelect('over_plants')}
                        className="group w-full rounded-lg border-2 border-gray-200 p-4 text-left transition-all hover:border-blue-300 hover:bg-green-500"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blue-100 transition-colors group-hover:bg-blue-200">
                                <img
                                    src="/images/over_plants.png"
                                    alt={t('วางทับแนวต้นไม้') || 'วางทับแนวต้นไม้'}
                                    className="h-full w-full object-contain"
                                />
                            </div>
                            <div className="flex flex-1 items-center">
                                <h4 className="text-lg font-semibold text-white">
                                    {t('วางทับแนวต้นไม้') || 'วางทับแนวต้นไม้'}
                                </h4>
                            </div>
                        </div>
                    </button>

                    {/* Mode B: Between Plants */}
                    <button
                        onClick={() => onModeSelect('between_plants')}
                        className="group w-full rounded-lg border-2 border-gray-200 p-4 text-left transition-all hover:border-green-300 hover:bg-green-500"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-green-100 transition-colors group-hover:bg-green-200">
                                <img
                                    src="/images/between_plants.png"
                                    alt={t('วางระหว่างแนวต้นไม้') || 'วางระหว่างแนวต้นไม้'}
                                    className="h-full w-full object-contain"
                                />
                            </div>
                            <div className="flex flex-1 items-center">
                                <h4 className="text-lg font-semibold text-white">
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
                        className="w-full rounded-md bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200"
                    >
                        {t('ยกเลิก') || 'ยกเลิก'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LateralPipeModeSelector;
