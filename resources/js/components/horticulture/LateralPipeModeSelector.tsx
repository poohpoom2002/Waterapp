// components/horticulture/LateralPipeModeSelector.tsx
import React from 'react';
import { 
    FaWater, 
    FaTree, 
    FaSeedling,
    FaTimes,
    FaInfoCircle
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
            <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-6 max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FaWater className="text-blue-600" />
                        {t('เลือกโหมดการวางท่อย่อย') || 'เลือกโหมดการวางท่อย่อย'}
                    </h3>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
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
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                <FaTree className="text-blue-600" size={24} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-800 mb-1">
                                    🎯 {t('วางทับแนวต้นไม้') || 'วางทับแนวต้นไม้'}
                                </h4>
                                <p className="text-sm text-gray-600 mb-2">
                                    {t('ท่อจะถูกวางทับไปบนแนวยาวของแถวหรือคอลัมน์ต้นไม้โดยตรง') || 
                                     'ท่อจะถูกวางทับไปบนแนวยาวของแถวหรือคอลัมน์ต้นไม้โดยตรง'}
                                </p>
                                <div className="text-xs text-gray-500">
                                    <div className="flex items-center gap-1 mb-1">
                                        <FaInfoCircle size={12} />
                                        <span>{t('เหมาะสำหรับ') || 'เหมาะสำหรับ'}:</span>
                                    </div>
                                    <ul className="space-y-1 ml-4">
                                        <li>• {t('ต้นไม้เรียงเป็นแถวชัดเจน') || 'ต้นไม้เรียงเป็นแถวชัดเจน'}</li>
                                        <li>• {t('ต้องการประหยัดท่อ') || 'ต้องการประหยัดท่อ'}</li>
                                        <li>• {t('ระบบชลประทานแบบหยดน้ำ') || 'ระบบชลประทานแบบหยดน้ำ'}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Mode B: Between Plants */}
                    <button
                        onClick={() => onModeSelect('between_plants')}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all text-left group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                <FaSeedling className="text-green-600" size={24} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-800 mb-1">
                                    🌱 {t('วางระหว่างแนวต้นไม้') || 'วางระหว่างแนวต้นไม้'}
                                </h4>
                                <p className="text-sm text-gray-600 mb-2">
                                    {t('ท่อจะถูกวางในช่องว่างระหว่างแถวหรือคอลัมน์ของต้นไม้ 2 แถวที่อยู่ติดกัน') || 
                                     'ท่อจะถูกวางในช่องว่างระหว่างแถวหรือคอลัมน์ของต้นไม้ 2 แถวที่อยู่ติดกัน'}
                                </p>
                                <div className="text-xs text-gray-500">
                                    <div className="flex items-center gap-1 mb-1">
                                        <FaInfoCircle size={12} />
                                        <span>{t('เหมาะสำหรับ') || 'เหมาะสำหรับ'}:</span>
                                    </div>
                                    <ul className="space-y-1 ml-4">
                                        <li>• {t('ต้นไม้ปลูกแบบสลับแถว') || 'ต้นไม้ปลูกแบบสลับแถว'}</li>
                                        <li>• {t('ต้องการท่อแยกย่อยอัตโนมัติ') || 'ต้องการท่อแยกย่อยอัตโนมัติ'}</li>
                                        <li>• {t('ระบบชลประทานแบบสปริงเกลอร์') || 'ระบบชลประทานแบบสปริงเกลอร์'}</li>
                                    </ul>
                                </div>
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
