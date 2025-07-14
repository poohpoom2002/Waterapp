import { useState, useEffect } from 'react';

// --- คำจำกัดความของตัวเลือกระบบน้ำ ---
interface IrrigationOption {
    id: string;
    name: string;
    icon: string;
    description: string;
}

const irrigationOptions: IrrigationOption[] = [
    {
        id: 'sprinkler',
        name: 'สปริงเกลอร์',
        icon: '💦',
        description: 'ให้น้ำเป็นวงกว้าง เหมาะสำหรับสนามหญ้าหรือพืชที่ปลูกหนาแน่น'
    },
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
        description: 'ผสมผสานระบบต่างๆ เพื่อให้เหมาะกับพืชหลากหลายชนิด'
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

    // ฟังก์ชันสำหรับย้อนกลับไปหน้าก่อนหน้า
    const handleBack = () => {
        window.history.back();
    };

    // ฟังก์ชันสำหรับไปขั้นตอนถัดไป
    const handleProceed = () => {
        if (!selectedMethod) {
            alert('กรุณาเลือกระบบน้ำที่ต้องการ');
            return;
        }
        
        // สร้าง URL parameters สำหรับหน้า irrigation designer
        const queryParams = new URLSearchParams();
        
        if (crops) queryParams.set('crops', crops);
        if (shapes) queryParams.set('shapes', shapes);
        if (method) queryParams.set('method', method);
        queryParams.set('irrigation', selectedMethod);

        // นำทางไปยังหน้า greenhouse map
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {irrigationOptions.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setSelectedMethod(option.id)}
                            className={`p-6 rounded-lg text-center transition-all duration-200 border-2 transform hover:-translate-y-1 ${
                                selectedMethod === option.id
                                    ? 'bg-blue-600 border-blue-400 shadow-lg scale-105'
                                    : 'bg-gray-800 border-gray-700 hover:border-blue-500 hover:bg-gray-700'
                            }`}
                        >
                            <div className="text-5xl mb-4">{option.icon}</div>
                            <h3 className="text-lg font-bold mb-2">{option.name}</h3>
                            <p className="text-sm text-gray-400">{option.description}</p>
                        </button>
                    ))}
                </div>

                {/* Selected method info */}
                {selectedMethod && (
                    <div className="mt-8 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
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
                        ย้อนกลับ
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