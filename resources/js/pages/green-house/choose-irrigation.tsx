import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { useLanguage } from '../../contexts/LanguageContext';

// --- คำจำกัดความของตัวเลือกระบบน้ำ ---
interface IrrigationOption {
    id: string;
    name: string;
    icon: string;
    description: string;
    disabled?: boolean;
    developmentMessage?: string;
}

const irrigationOptions: IrrigationOption[] = [
    {
        id: 'mini-sprinkler',
        name: 'มินิสปริงเกลอร์',
        icon: '💧',
        description: 'ให้น้ำเป็นวงแคบลงมา เหมาะสำหรับแปลงผักหรือไม้พุ่ม',
    },
    {
        id: 'drip',
        name: 'น้ำหยด',
        icon: '💧🌱',
        description: 'ประหยดน้ำสูงสุด โดยให้น้ำโดยตรงที่โคนต้นพืช',
    },
    {
        id: 'mixed',
        name: 'แบบผสม',
        icon: '🔄',
        description: 'ผสมผสานระบบต่างๆ เพื่อให้เหมาะกับพืชหลากหลายชนิด',
        disabled: true,
        developmentMessage: 'กำลังพัฒนา',
    },
];

// --- คอมโพเนนต์ React ---
export default function ChooseIrrigationMethod() {
    const { t } = useLanguage();
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [crops, setCrops] = useState<string>('');
    const [shapes, setShapes] = useState<string>('');
    const [method, setMethod] = useState<string>('');

    // Parse URL parameters
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const cropsParam = urlParams.get('crops');
        const shapesParam = urlParams.get('shapes');
        const methodParam = urlParams.get('method');

        console.log('Choose-irrigation received:', {
            crops: cropsParam,
            shapes: shapesParam
                ? `มีข้อมูล shapes (${shapesParam.length} characters)`
                : 'ไม่มีข้อมูล shapes',
            method: methodParam,
        });

        if (cropsParam) setCrops(cropsParam);
        if (shapesParam) setShapes(shapesParam);
        if (methodParam) setMethod(methodParam);
    }, []);

    // ฟังก์ชันสำหรับย้อนกลับไปหน้า planner
    const handleBack = () => {
        // บันทึกข้อมูลปัจจุบัน
        const currentData = {
            crops: crops,
            shapes: shapes,
            method: method,
            selectedIrrigation: selectedMethod,
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('choosingIrrigationData', JSON.stringify(currentData));

        // กลับไปหน้า planner พร้อมข้อมูล
        const queryParams = new URLSearchParams();
        if (crops) queryParams.set('crops', crops);
        if (shapes) queryParams.set('shapes', shapes); // เพิ่มบรรทัดนี้
        if (method) queryParams.set('method', method);

        window.location.href = `/greenhouse-planner?${queryParams.toString()}`;
    };

    // ฟังก์ชันสำหรับไปขั้นตอนถัดไป
    const handleProceed = () => {
        if (!selectedMethod) {
            alert('กรุณาเลือกระบบน้ำที่ต้องการ');
            return;
        }

        // บันทึกข้อมูลทั้งหมดใน localStorage
        const completeData = {
            crops: crops,
            shapes: shapes,
            method: method,
            selectedIrrigation: selectedMethod,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('irrigationSelectionData', JSON.stringify(completeData));

        // สร้าง URL parameters สำหรับหน้า green-house-map
        const queryParams = new URLSearchParams();

        if (crops) queryParams.set('crops', crops);
        if (shapes) queryParams.set('shapes', shapes);
        if (method) queryParams.set('method', method);
        queryParams.set('irrigation', selectedMethod);

        // นำทางไปยังหน้า green-house-map
        window.location.href = `/greenhouse-map?${queryParams.toString()}`;
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-900 text-white">
            <Navbar />
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-4xl">
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold text-white">{t('greenhouse_irrigation_selection')}</h1>
                    <p className="text-md mt-2 text-gray-400">
                        {t('greenhouse_irrigation_description')}
                    </p>

                    {/* Progress indicator */}
                    <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-400">
                        <span className="text-green-400">✓ เลือกพืช</span>
                        <span>→</span>
                        <span className="text-green-400">✓ วิธีการวางแผน</span>
                        <span>→</span>
                        <span className="text-green-400">✓ ออกแบบพื้นที่</span>
                        <span>→</span>
                        <span className="font-medium text-blue-400">เลือกระบบน้ำ</span>
                        <span>→</span>
                        <span>ออกแบบระบบน้ำ</span>
                    </div>
                </div>

                {/* Show selected data summary */}
                {(crops || shapes) && (
                    <div className="mb-8 rounded-lg border border-gray-700 bg-gray-800 p-4">
                        <h3 className="mb-2 text-lg font-medium text-green-400">
                            {t('greenhouse_selected_data')}
                        </h3>
                        {crops && (
                            <div className="mb-2">
                                <span className="text-sm text-gray-400">{t('greenhouse_selected_crops')}: </span>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {crops.split(',').map((crop, index) => (
                                        <span
                                            key={index}
                                            className="rounded bg-green-600 px-2 py-1 text-xs"
                                        >
                                            {crop}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {shapes && (
                            <div className="text-sm text-gray-400">
                                ✓ {t('greenhouse_greenhouse_plans')} (
                                {(() => {
                                    try {
                                        return JSON.parse(decodeURIComponent(shapes)).length;
                                    } catch {
                                        return 'ข้อมูลผิดพลาด';
                                    }
                                })()}{' '}
                                องค์ประกอบ)
                            </div>
                        )}
                        {method && (
                            <div className="text-sm text-gray-400">{t('greenhouse_planning_method')}: {method}</div>
                        )}
                    </div>
                )}

                {/* Irrigation Method Selection */}
                <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-3">
                    {irrigationOptions.map((option) => (
                        <div key={option.id} className="relative">
                            <button
                                onClick={() => {
                                    if (!option.disabled) {
                                        setSelectedMethod(option.id);
                                    }
                                }}
                                disabled={option.disabled}
                                className={`relative w-full transform rounded-lg border-2 p-6 text-center transition-all duration-200 ${
                                    option.disabled
                                        ? 'cursor-not-allowed border-gray-600 bg-gray-700 opacity-60'
                                        : selectedMethod === option.id
                                          ? 'scale-105 border-blue-400 bg-blue-600 shadow-lg hover:-translate-y-1'
                                          : 'border-gray-700 bg-gray-800 hover:-translate-y-1 hover:border-blue-500 hover:bg-gray-700'
                                }`}
                            >
                                <div className="mb-4 text-5xl">{option.icon}</div>
                                <h3 className="mb-2 text-lg font-bold">{option.name}</h3>
                                <p className="text-sm text-gray-400">{option.description}</p>

                                {/* Development message overlay */}
                                {option.disabled && option.developmentMessage && (
                                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/70">
                                        <div className="text-center">
                                            <div className="mb-1 text-sm font-medium text-yellow-400">
                                                🚧
                                            </div>
                                            <div className="text-xs text-yellow-300">
                                                {option.developmentMessage}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Selected method info */}
                {selectedMethod && (
                    <div className="mx-auto mt-8 max-w-2xl rounded-lg border border-blue-600 bg-blue-900/30 p-4">
                        <div className="flex items-center space-x-3">
                            <span className="text-2xl">
                                {irrigationOptions.find((opt) => opt.id === selectedMethod)?.icon}
                            </span>
                            <div>
                                <h4 className="font-medium text-blue-300">
                                    เลือก:{' '}
                                    {
                                        irrigationOptions.find((opt) => opt.id === selectedMethod)
                                            ?.name
                                    }
                                </h4>
                                <p className="text-sm text-blue-200">
                                    {
                                        irrigationOptions.find((opt) => opt.id === selectedMethod)
                                            ?.description
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-12 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        className="flex items-center rounded bg-gray-600 px-6 py-3 text-white transition-colors hover:bg-gray-700"
                    >
                        <svg
                            className="mr-2 h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            />
                        </svg>
                        {t('greenhouse_back_to_planning')}
                    </button>

                    <button
                        onClick={handleProceed}
                        disabled={!selectedMethod}
                        className={`flex items-center rounded px-8 py-3 font-bold text-white transition-colors ${
                            !selectedMethod
                                ? 'cursor-not-allowed bg-gray-500'
                                : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        {t('greenhouse_proceed_to_irrigation')}
                        <svg
                            className="ml-2 h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                        </svg>
                    </button>
                </div>
            </div>
            </div>
            <Footer />
        </div>
    );
}
