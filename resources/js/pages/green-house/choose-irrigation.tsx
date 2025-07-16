import { useState, useEffect } from 'react';

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
        description: 'ให้น้ำเป็นวงแคบลงมา เหมาะสำหรับแปลงผักหรือไม้พุ่ม'
    },
    {
        id: 'drip',
        name: 'น้ำหยด',
        icon: '💧🌱',
        description: 'ประหยัดน้ำสูงสุด โดยให้น้ำโดยตรงที่โคนต้นพืช'
    },
    {
        id: 'mixed',
        name: 'แบบผสม',
        icon: '🔄',
        description: 'ผสมผสานระบบต่างๆ เพื่อให้เหมาะกับพืชหลากหลายชนิด',
        disabled: true,
        developmentMessage: 'กำลังพัฒนา'
    }
];

// --- คอมโพเนนต์ React ---
export default function ChooseIrrigationMethod() {
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
            shapes: shapesParam ? `มีข้อมูล shapes (${shapesParam.length} characters)` : 'ไม่มีข้อมูล shapes',
            method: methodParam
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
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('choosingIrrigationData', JSON.stringify(currentData));
        
        // กลับไปหน้า planner พร้อมข้อมูล
        const queryParams = new URLSearchParams();
        if (crops) queryParams.set('crops', crops);
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
            updatedAt: new Date().toISOString()
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
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-white">เลือกระบบการให้น้ำ</h1>
                    <p className="text-md text-gray-400 mt-2">โปรดเลือกวิธีการให้น้ำที่เหมาะสมกับความต้องการของคุณ</p>
                    
                    {/* Progress indicator */}
                    <div className="flex items-center justify-center space-x-2 mt-4 text-sm text-gray-400">
                        <span className="text-green-400">✓ เลือกพืช</span>
                        <span>→</span>
                        <span className="text-green-400">✓ วิธีการวางแผน</span>
                        <span>→</span>
                        <span className="text-green-400">✓ ออกแบบพื้นที่</span>
                        <span>→</span>
                        <span className="text-blue-400 font-medium">เลือกระบบน้ำ</span>
                        <span>→</span>
                        <span>ออกแบบระบบน้ำ</span>
                    </div>
                </div>

                {/* Show selected data summary */}
                {(crops || shapes) && (
                    <div className="mb-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-medium text-green-400 mb-2">ข้อมูลที่เลือกไว้</h3>
                        {crops && (
                            <div className="mb-2">
                                <span className="text-sm text-gray-400">พืชที่เลือก: </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {crops.split(',').map((crop, index) => (
                                        <span key={index} className="bg-green-600 px-2 py-1 rounded text-xs">
                                            {crop}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {shapes && (
                            <div className="text-sm text-gray-400">
                                ✓ มีแบบโรงเรือนที่วาดไว้แล้ว ({(() => {
                                    try {
                                        return JSON.parse(decodeURIComponent(shapes)).length;
                                    } catch {
                                        return 'ข้อมูลผิดพลาด';
                                    }
                                })()} องค์ประกอบ)
                            </div>
                        )}
                        {method && (
                            <div className="text-sm text-gray-400">
                                วิธีการวางแผน: {method}
                            </div>
                        )}
                    </div>
                )}

                {/* Irrigation Method Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                    {irrigationOptions.map((option) => (
                        <div key={option.id} className="relative">
                            <button
                                onClick={() => {
                                    if (!option.disabled) {
                                        setSelectedMethod(option.id);
                                    }
                                }}
                                disabled={option.disabled}
                                className={`p-6 rounded-lg text-center transition-all duration-200 border-2 transform w-full relative ${
                                    option.disabled
                                        ? 'bg-gray-700 border-gray-600 cursor-not-allowed opacity-60'
                                        : selectedMethod === option.id
                                            ? 'bg-blue-600 border-blue-400 shadow-lg scale-105 hover:-translate-y-1'
                                            : 'bg-gray-800 border-gray-700 hover:border-blue-500 hover:bg-gray-700 hover:-translate-y-1'
                                }`}
                            >
                                <div className="text-5xl mb-4">{option.icon}</div>
                                <h3 className="text-lg font-bold mb-2">{option.name}</h3>
                                <p className="text-sm text-gray-400">{option.description}</p>
                                
                                {/* Development message overlay */}
                                {option.disabled && option.developmentMessage && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg">
                                        <div className="text-center">
                                            <div className="text-yellow-400 text-sm font-medium mb-1">🚧</div>
                                            <div className="text-yellow-300 text-xs">{option.developmentMessage}</div>
                                        </div>
                                    </div>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Selected method info */}
                {selectedMethod && (
                    <div className="mt-8 p-4 bg-blue-900/30 border border-blue-600 rounded-lg max-w-2xl mx-auto">
                        <div className="flex items-center space-x-3">
                            <span className="text-2xl">
                                {irrigationOptions.find(opt => opt.id === selectedMethod)?.icon}
                            </span>
                            <div>
                                <h4 className="text-blue-300 font-medium">
                                    เลือก: {irrigationOptions.find(opt => opt.id === selectedMethod)?.name}
                                </h4>
                                <p className="text-sm text-blue-200">
                                    {irrigationOptions.find(opt => opt.id === selectedMethod)?.description}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-12 flex justify-between items-center">
                    <button
                        onClick={handleBack}
                        className="flex items-center rounded bg-gray-600 px-6 py-3 text-white hover:bg-gray-700 transition-colors"
                    >
                        <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        กลับไปออกแบบพื้นที่
                    </button>
                    
                    <button
                        onClick={handleProceed}
                        disabled={!selectedMethod}
                        className={`flex items-center rounded px-8 py-3 text-white font-bold transition-colors ${
                            !selectedMethod 
                                ? 'bg-gray-500 cursor-not-allowed' 
                                : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        ไปออกแบบระบบน้ำ
                        <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}