/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { 
    FaTrash, 
    FaTimes, 
    FaInfoCircle,
    FaMousePointer
} from 'react-icons/fa';

interface DeletePipePanelProps {
    isVisible: boolean;
    onCancel: () => void;
    deletedCount: number;
    t: (key: string) => string;
}

const DeletePipePanel: React.FC<DeletePipePanelProps> = ({
    isVisible,
    onCancel,
    deletedCount,
    t
}) => {
    if (!isVisible) return null;

    return (
        <div className="fixed top-[190px] right-3 bg-white rounded-lg shadow-xl border border-red-200 min-w-[320px] max-w-[350px] z-[1000]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-red-500 rounded-full animate-pulse">
                        <FaTrash className="text-white" size={16} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            {t('โหมดลบท่อ') || 'โหมดลบท่อ'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-red-600">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="font-medium">
                                {t('สถานะ: กำลังลบ') || 'สถานะ: กำลังลบ'}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onCancel}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title={t('ออกจากโหมดลบท่อ') || 'ออกจากโหมดลบท่อ'}
                >
                    <FaTimes size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Instructions */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <FaInfoCircle className="text-blue-600" size={14} />
                        <span className="text-sm font-medium text-blue-700">
                            {t('วิธีใช้งาน') || 'วิธีใช้งาน'}
                        </span>
                    </div>
                    <div className="text-sm text-blue-700 space-y-2">
                        <div className="flex items-center gap-2">
                            <FaMousePointer className="text-blue-600" size={12} />
                            <span className="font-medium">
                                {t('คลิกขวาที่ท่อเพื่อลบ') || 'คลิกขวาที่ท่อเพื่อลบ'}
                            </span>
                        </div>
                        <div className="text-xs text-blue-600">
                            • {t('สามารถลบได้หลายท่อต่อเนื่อง') || 'สามารถลบได้หลายท่อต่อเนื่อง'}
                        </div>
                        <div className="text-xs text-blue-600">
                            • {t('กดปุ่ม "ออกจากโหมดลบ" เมื่อต้องการจบ') || 'กดปุ่ม "ออกจากโหมดลบ" เมื่อต้องการจบ'}
                        </div>
                    </div>
                </div>

                {/* Statistics */}
                {deletedCount > 0 && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                            <FaTrash className="text-green-600" size={14} />
                            <span className="text-sm font-medium text-green-700">
                                {t('สถิติการลบ') || 'สถิติการลบ'}
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-green-800">
                            {deletedCount.toLocaleString()} {t('ท่อ') || 'ท่อ'}
                        </div>
                        <div className="text-xs text-green-600">
                            {t('จำนวนท่อที่ลบไปแล้วในรอบนี้') || 'จำนวนท่อที่ลบไปแล้วในรอบนี้'}
                        </div>
                    </div>
                )}

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <FaInfoCircle className="text-yellow-600" size={14} />
                        <span className="text-sm font-medium text-yellow-700">
                            {t('คำเตือน') || 'คำเตือน'}
                        </span>
                    </div>
                    <div className="text-xs text-yellow-700 space-y-1">
                        <div>⚠️ {t('การลบท่อจะไม่สามารถกู้คืนได้') || 'การลบท่อจะไม่สามารถกู้คืนได้'}</div>
                        <div>⚠️ {t('ควรบันทึกโปรเจกต์ก่อนลบ') || 'ควรบันทึกโปรเจกต์ก่อนลบ'}</div>
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                    onClick={onCancel}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                    <FaTimes size={16} />
                    {t('ออกจากโหมดลบท่อ') || 'ออกจากโหมดลบท่อ'}
                </button>
            </div>
        </div>
    );
};

export default DeletePipePanel;
