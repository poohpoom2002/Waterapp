/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { FaTrash, FaTimes, FaInfoCircle, FaMousePointer } from 'react-icons/fa';

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
    t,
}) => {
    if (!isVisible) return null;

    return (
        <div className="fixed right-3 top-[190px] z-[1000] min-w-[320px] max-w-[350px] rounded-lg border border-red-200 bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-full bg-red-500">
                        <FaTrash className="text-white" size={16} />
                    </div>
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                            {t('โหมดลบท่อ') || 'โหมดลบท่อ'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-red-600">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-red-500"></div>
                            <span className="font-medium">
                                {t('สถานะ: กำลังลบ') || 'สถานะ: กำลังลบ'}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onCancel}
                    className="text-gray-400 transition-colors hover:text-gray-600"
                    title={t('ออกจากโหมดลบท่อ') || 'ออกจากโหมดลบท่อ'}
                >
                    <FaTimes size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="space-y-4 p-4">
                {/* Instructions */}
                <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                        <FaInfoCircle className="text-blue-600" size={14} />
                        <span className="text-sm font-medium text-blue-700">
                            {t('วิธีใช้งาน') || 'วิธีใช้งาน'}
                        </span>
                    </div>
                    <div className="space-y-2 text-sm text-blue-700">
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
                            •{' '}
                            {t('กดปุ่ม "ออกจากโหมดลบ" เมื่อต้องการจบ') ||
                                'กดปุ่ม "ออกจากโหมดลบ" เมื่อต้องการจบ'}
                        </div>
                    </div>
                </div>

                {/* Statistics */}
                {deletedCount > 0 && (
                    <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-3">
                        <div className="mb-2 flex items-center gap-2">
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
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                        <FaInfoCircle className="text-yellow-600" size={14} />
                        <span className="text-sm font-medium text-yellow-700">
                            {t('คำเตือน') || 'คำเตือน'}
                        </span>
                    </div>
                    <div className="space-y-1 text-xs text-yellow-700">
                        <div>
                            ⚠️ {t('การลบท่อจะไม่สามารถกู้คืนได้') || 'การลบท่อจะไม่สามารถกู้คืนได้'}
                        </div>
                        <div>⚠️ {t('ควรบันทึกโปรเจกต์ก่อนลบ') || 'ควรบันทึกโปรเจกต์ก่อนลบ'}</div>
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <div className="border-t border-gray-200 bg-gray-50 p-4">
                <button
                    onClick={onCancel}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-600 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-700"
                >
                    <FaTimes size={16} />
                    {t('ออกจากโหมดลบท่อ') || 'ออกจากโหมดลบท่อ'}
                </button>
            </div>
        </div>
    );
};

export default DeletePipePanel;
