// HeadLossCalculationModal.tsx
import React, { useState, useEffect } from 'react';
import { FaTimes, FaCalculator, FaRulerCombined } from 'react-icons/fa';

interface HeadLossCalculationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (result: HeadLossResult) => void;
    pipeInfo: {
        pipeId: string;
        pipeType: 'mainPipe' | 'subMainPipe' | 'branchPipe';
        zoneName: string;
        zoneId: string;
        length: number;
        pipeName?: string;
    } | null;
    t: (key: string) => string;
}

export interface HeadLossResult {
    pipeId: string;
    pipeType: 'mainPipe' | 'subMainPipe' | 'branchPipe';
    zoneName: string;
    zoneId: string;
    pipeName?: string;
    lossCoefficient: number; // ค่าการสูญเสีย
    pipeLength: number; // ความยาวท่อ (เมตร)
    correctionFactor: number; // ค่าปรับแก้
    headLoss: number; // ผลลัพธ์ head loss
    calculatedAt: string;
}

const HeadLossCalculationModal: React.FC<HeadLossCalculationModalProps> = ({
    isOpen,
    onClose,
    onSave,
    pipeInfo,
}) => {
    const [formData, setFormData] = useState({
        lossCoefficient: '',
        pipeLength: '',
        correctionFactor: ''
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isCalculating, setIsCalculating] = useState(false);
    const [calculationResult, setCalculationResult] = useState<number | null>(null);

    // โหลดค่าเริ่มต้นเมื่อเปิด modal
    useEffect(() => {
        if (isOpen && pipeInfo) {
            setFormData({
                lossCoefficient: '0.000', // ค่าเริ่มต้น
                pipeLength: pipeInfo.length.toString(),
                correctionFactor: '0.000' // ค่าเริ่มต้น
            });
            setErrors({});
            setCalculationResult(null);
        }
    }, [isOpen, pipeInfo]);

    const handleInputChange = (field: string, value: string) => {
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

        // คำนวณแบบ real-time
        calculateHeadLoss({
            ...formData,
            [field]: value
        });
    };

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        const lossCoeff = parseFloat(formData.lossCoefficient);
        if (!formData.lossCoefficient || isNaN(lossCoeff) || lossCoeff < 0) {
            newErrors.lossCoefficient = 'กรุณากรอกค่าการสูญเสียที่ถูกต้อง (≥ 0)';
        }

        const pipeLength = parseFloat(formData.pipeLength);
        if (!formData.pipeLength || isNaN(pipeLength) || pipeLength <= 0) {
            newErrors.pipeLength = 'กรุณากรอกความยาวท่อที่ถูกต้อง (> 0)';
        }

        const correctionFactor = parseFloat(formData.correctionFactor);
        if (!formData.correctionFactor || isNaN(correctionFactor) || correctionFactor <= 0) {
            newErrors.correctionFactor = 'กรุณากรอกค่าปรับแก้ที่ถูกต้อง (> 0)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const calculateHeadLoss = (data = formData) => {
        const lossCoeff = parseFloat(data.lossCoefficient);
        const pipeLength = parseFloat(data.pipeLength);
        const correctionFactor = parseFloat(data.correctionFactor);

        if (!isNaN(lossCoeff) && !isNaN(pipeLength) && !isNaN(correctionFactor) && 
            lossCoeff >= 0 && pipeLength > 0 && correctionFactor > 0) {
            
            // สูตร: (ค่าการสูญเสีย/10) x ความยาวท่อ x ค่าปรับแก้
            const result = (lossCoeff / 10) * pipeLength * correctionFactor;
            setCalculationResult(result);
        } else {
            setCalculationResult(null);
        }
    };

    const handleSave = () => {
        if (!validateForm() || !pipeInfo || calculationResult === null) {
            return;
        }

        setIsCalculating(true);

        const result: HeadLossResult = {
            pipeId: pipeInfo.pipeId,
            pipeType: pipeInfo.pipeType,
            zoneName: pipeInfo.zoneName,
            zoneId: pipeInfo.zoneId,
            pipeName: pipeInfo.pipeName,
            lossCoefficient: parseFloat(formData.lossCoefficient),
            pipeLength: parseFloat(formData.pipeLength),
            correctionFactor: parseFloat(formData.correctionFactor),
            headLoss: calculationResult,
            calculatedAt: new Date().toISOString()
        };

        setTimeout(() => {
            onSave(result);
            onClose();
            setIsCalculating(false);
        }, 500);
    };

    const handleClose = () => {
        if (!isCalculating) {
            onClose();
        }
    };

    if (!isOpen || !pipeInfo) return null;

    const getPipeTypeText = (type: string) => {
        switch (type) {
            case 'mainPipe': return 'ท่อเมน';
            case 'subMainPipe': return 'ท่อเมนรอง';
            case 'branchPipe': return 'ท่อย่อย';
            default: return type;
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <FaCalculator className="text-blue-600" />
                            คำนวณ Head Loss
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {getPipeTypeText(pipeInfo.pipeType)} - {pipeInfo.zoneName}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isCalculating}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                   

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* ค่าการสูญเสีย */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                💧 ค่าการสูญเสีย
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={formData.lossCoefficient}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow empty string for erasing
                                    if (value === "") {
                                        handleInputChange('lossCoefficient', "");
                                        return;
                                    }
                                    // Limit to 3 decimal places
                                    if (/^\d*\.?\d{0,3}$/.test(value)) {
                                        handleInputChange('lossCoefficient', value);
                                    }
                                }}
                                className={`w-full px-4 py-3 text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                    errors.lossCoefficient ? 'border-red-300' : 'border-gray-300'
                                }`}
                                placeholder="0.5"
                            />
                            {errors.lossCoefficient && (
                                <p className="text-sm text-red-600">{errors.lossCoefficient}</p>
                            )}
                        </div>

                        {/* ความยาวท่อ */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                <FaRulerCombined className="inline mr-1" />
                                ความยาวท่อ
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.001"
                                    min="0.1"
                                    value={
                                        formData.pipeLength === ""
                                            ? ""
                                            : (() => {
                                                const num = Number(formData.pipeLength);
                                                if (isNaN(num)) return formData.pipeLength;
                                                return num.toFixed(3).replace(/\.?0+$/, "");
                                            })()
                                    }
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === "") {
                                            handleInputChange('pipeLength', "");
                                            return;
                                        }
                                        if (/^\d*\.?\d{0,3}$/.test(value)) {
                                            handleInputChange('pipeLength', value);
                                        }
                                    }}
                                    className={`w-full px-4 py-3 text-black pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        errors.pipeLength ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                    placeholder="100.0"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-sm text-gray-500">เมตร</span>
                                </div>
                            </div>
                            {errors.pipeLength && (
                                <p className="text-sm text-red-600">{errors.pipeLength}</p>
                            )}
                        </div>

                        {/* ค่าปรับแก้ */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                ⚙️ ค่าปรับแก้ ทางออก
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.001"
                                min="0.1"
                                value={formData.correctionFactor}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "") {
                                        handleInputChange('correctionFactor', "");
                                        return;
                                    }
                                    if (/^\d*\.?\d{0,3}$/.test(value)) {
                                        handleInputChange('correctionFactor', value);
                                    }
                                }}
                                className={`w-full px-4 py-3 text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                    errors.correctionFactor ? 'border-red-300' : 'border-gray-300'
                                }`}
                                placeholder="1.0"
                            />
                            {errors.correctionFactor && (
                                <p className="text-sm text-red-600">{errors.correctionFactor}</p>
                            )}
                        </div>
                    </div>

                    {/* ผลการคำนวณ Real-time */}
                    {calculationResult !== null && (
                        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                                🎯 ผลการคำนวณ
                                <span className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded-full">LIVE</span>
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                {/* ผลลัพธ์ */}
                                <div className="bg-white bg-opacity-80 rounded-lg p-4 text-center">
                                    <h4 className="font-medium text-gray-700 mb-2">Head Loss:</h4>
                                    <div className="text-3xl font-bold text-green-600">
                                        {calculationResult.toFixed(3)}
                                    </div>
                                    <div className="text-sm text-gray-500">เมตร</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <button
                        onClick={handleClose}
                        disabled={isCalculating}
                        className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isCalculating || calculationResult === null}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isCalculating ? (
                            <div className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                กำลังบันทึก...
                            </div>
                        ) : (
                            <>💾 บันทึกผลการคำนวณ</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HeadLossCalculationModal;
