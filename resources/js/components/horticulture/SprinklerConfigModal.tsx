// SprinklerConfigModal.tsx - Modal for configuring sprinkler properties

import React, { useState, useEffect } from 'react';
import { 
    SprinklerFormData, 
    validateSprinklerConfig, 
    saveSprinklerConfig, 
    loadSprinklerConfig,
    DEFAULT_SPRINKLER_CONFIG,
} from '../../utils/sprinklerUtils'; 

interface SprinklerConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: SprinklerFormData) => void;
    plantCount: number;
    t: (key: string) => string;
}

const SprinklerConfigModal: React.FC<SprinklerConfigModalProps> = ({
    isOpen,
    onClose,
    onSave,
    plantCount,
}) => {
    const [formData, setFormData] = useState<SprinklerFormData>({
        flowRatePerMinute: '',
        pressureBar: '',
        radiusMeters: ''
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(false);

    // โหลดข้อมูลที่มีอยู่เมื่อเปิด modal
    useEffect(() => {
        if (isOpen) {
            const existingConfig = loadSprinklerConfig();
            if (existingConfig) {
                setFormData({
                    flowRatePerMinute: existingConfig.flowRatePerMinute.toString(),
                    pressureBar: existingConfig.pressureBar.toString(),
                    radiusMeters: existingConfig.radiusMeters.toString()
                });
            } else {
                // ใช้ค่าเริ่มต้น
                setFormData({
                    flowRatePerMinute: DEFAULT_SPRINKLER_CONFIG.flowRatePerMinute.toString(),
                    pressureBar: DEFAULT_SPRINKLER_CONFIG.pressureBar.toString(),
                    radiusMeters: DEFAULT_SPRINKLER_CONFIG.radiusMeters.toString()
                });
            }
            setErrors({});
        }
    }, [isOpen]);

    const handleInputChange = (field: keyof SprinklerFormData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // ลบ error ของฟิลด์นี้เมื่อมีการแก้ไข
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleSave = async () => {
        const validation = validateSprinklerConfig(formData);
        
        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }

        setIsLoading(true);

        try {
            const config = {
                flowRatePerMinute: parseFloat(formData.flowRatePerMinute),
                pressureBar: parseFloat(formData.pressureBar),
                radiusMeters: parseFloat(formData.radiusMeters)
            };

            // บันทึกลง localStorage
            const saved = saveSprinklerConfig(config);
            
            if (saved) {
                onSave(formData);
                onClose();
            } else {
                setErrors({ general: 'ไม่สามารถบันทึกข้อมูลได้' });
            }
        } catch (error) {
            console.error('Error saving sprinkler config:', error);
            setErrors({ general: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            onClose();
        }
    };

    if (!isOpen) return null;


    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white">
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            🚿 ตั้งค่าหัวฉีดน้ำ
                        </h2>
                        <p className="text-sm text-white mt-1">
                            กำหนดคุณสมบัติของหัวฉีดน้ำสำหรับพืช ({plantCount} ต้น)
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="p-2 text-white hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {errors.general && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-white">
                            <div className="flex">
                                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div className="ml-3">
                                    <p className="text-sm text-red-800">{errors.general}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* อัตราการไหลต่อนาที */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-white">
                                💧 อัตราการไหลต่อนาที
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*\\.?[0-9]*"
                                    value={formData.flowRatePerMinute ?? ''}
                                    onChange={(e) => handleInputChange('flowRatePerMinute', e.target.value)}
                                    className={`w-full px-4 py-3 pr-16 text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        errors.flowRatePerMinute ? 'border-red-300' : 'border-white'
                                    }`}
                                    placeholder="2.5"
                                    autoComplete="off"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-sm text-black">ลิตร/นาที</span>
                                </div>
                            </div>
                            {errors.flowRatePerMinute && (
                                <p className="text-sm text-red-600">{errors.flowRatePerMinute}</p>
                            )}
                            <p className="text-xs text-white">
                                ปริมาณน้ำที่หัวฉีดหนึ่งตัวให้ได้ต่อนาที
                            </p>
                        </div>

                        {/* แรงดัน */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-white">
                                ⚡ แรงดันน้ำ
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*\\.?[0-9]*"
                                    value={formData.pressureBar ?? ''}
                                    onChange={(e) => handleInputChange('pressureBar', e.target.value)}
                                    className={`w-full px-4 py-3 pr-12 text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        errors.pressureBar ? 'border-red-300' : 'border-white'
                                    }`}
                                    placeholder="2.0"
                                    autoComplete="off"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-sm text-black">บาร์</span>
                                </div>
                            </div>
                            {errors.pressureBar && (
                                <p className="text-sm text-red-600">{errors.pressureBar}</p>
                            )}
                            <p className="text-xs text-white">
                                แรงดันน้ำที่ใช้ในการฉีด
                            </p>
                        </div>

                        {/* รัศมีหัวฉีด */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-white">
                                📏 รัศมีการฉีด
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*\\.?[0-9]*"
                                    value={formData.radiusMeters ?? ''}
                                    onChange={(e) => handleInputChange('radiusMeters', e.target.value)}
                                    className={`w-full px-4 py-3 pr-12 text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        errors.radiusMeters ? 'border-red-300' : 'border-white'
                                    }`}
                                    placeholder="1.5"
                                    autoComplete="off"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-sm text-black">เมตร</span>
                                </div>
                            </div>
                            {errors.radiusMeters && (
                                <p className="text-sm text-red-600">{errors.radiusMeters}</p>
                            )}
                            <p className="text-xs text-white">
                                ระยะไกลสุดที่น้ำฉีดไปได้
                            </p>
                        </div>
                    </div>

                    {/* Real-time Statistics */}
                    <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-xl p-6 border border-blue-300 text-white shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                            📊 สถิติแบบ Real-time
                            <span className="ml-2 px-2 py-1 bg-green-600 text-xs rounded-full">LIVE</span>
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* จำนวนต้นไม้ */}
                            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 text-center">
                                <div className="text-2xl mb-1">🌱</div>
                                <div className="text-2xl font-bold text-green-400">
                                    {plantCount.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-300">ต้นไม้ทั้งหมด</div>
                            </div>

                            {/* Q หัวฉีด */}
                            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 text-center">
                                <div className="text-2xl mb-1">💧</div>
                                <div className="text-2xl font-bold text-blue-400">
                                    {formData.flowRatePerMinute || '0'}
                                </div>
                                <div className="text-xs text-gray-300">ลิตร/นาที/ต้น</div>
                            </div>

                            {/* ความต้องการน้ำรวม */}
                            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 text-center">
                                <div className="text-2xl mb-1">🚿</div>
                                <div className="text-2xl font-bold text-cyan-400">
                                    {((parseFloat(formData.flowRatePerMinute) || 0) * plantCount).toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-300">ลิตร/นาที รวม</div>
                            </div>

                            {/* ความต้องการน้ำต่อชั่วโมง */}
                            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 text-center">
                                <div className="text-2xl mb-1">⏱️</div>
                                <div className="text-2xl font-bold text-purple-400">
                                    {(((parseFloat(formData.flowRatePerMinute) || 0) * plantCount) * 60).toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-300">ลิตร/ชั่วโมง รวม</div>
                            </div>
                        </div>
                    </div>



                    
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-900 rounded-b-2xl text-white">
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? (
                            <div className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                กำลังบันทึก...
                            </div>
                        ) : (
                            <>💾 บันทึกการตั้งค่า</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SprinklerConfigModal;
