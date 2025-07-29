import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { useLanguage } from '../../contexts/LanguageContext';

// --- Definition of irrigation system options ---
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
        name: 'Mini Sprinkler',
        icon: '💧',
        description: 'Provides water in narrow circles, suitable for vegetable plots or shrubs',
    },
    {
        id: 'drip',
        name: 'Drip Irrigation',
        icon: '💧🌱',
        description: 'Maximum water savings by delivering water directly to plant roots',
    },
    {
        id: 'mixed',
        name: 'Mixed System',
        icon: '🔄',
        description: 'Combines different systems to suit various types of plants',
        disabled: true,
        developmentMessage: 'Under Development',
    },
];

// --- React Component ---
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
                ? `Has shapes data (${shapesParam.length} characters)`
                : 'No shapes data',
            method: methodParam,
        });

        if (cropsParam) setCrops(cropsParam);
        if (shapesParam) setShapes(shapesParam);
        if (methodParam) setMethod(methodParam);
    }, []);

    // Function to go back to planner page
    const handleBack = () => {
        // Save current data
        const currentData = {
            crops: crops,
            shapes: shapes,
            method: method,
            selectedIrrigation: selectedMethod,
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('choosingIrrigationData', JSON.stringify(currentData));

        // Go back to planner page with data
        const queryParams = new URLSearchParams();
        if (crops) queryParams.set('crops', crops);
        if (shapes) queryParams.set('shapes', shapes); // Add this line
        if (method) queryParams.set('method', method);

        window.location.href = `/greenhouse-planner?${queryParams.toString()}`;
    };

    // Function to proceed to next step
    const handleProceed = () => {
        if (!selectedMethod) {
            alert('Please select the desired irrigation system');
            return;
        }

        // Save all data in localStorage
        const completeData = {
            crops: crops,
            shapes: shapes,
            method: method,
            selectedIrrigation: selectedMethod,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('irrigationSelectionData', JSON.stringify(completeData));

        // Create URL parameters for greenhouse-map page
        const queryParams = new URLSearchParams();

        if (crops) queryParams.set('crops', crops);
        if (shapes) queryParams.set('shapes', shapes);
        if (method) queryParams.set('method', method);
        queryParams.set('irrigation', selectedMethod);

        // Navigate to greenhouse-map page
        window.location.href = `/greenhouse-map?${queryParams.toString()}`;
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-900 text-white">
            <Navbar />
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-4xl">
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold text-white">Choose Irrigation System</h1>
                    <p className="text-md mt-2 text-gray-400">
                        Please select the irrigation method that suits your needs
                    </p>

                    {/* Progress indicator */}
                    <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-400">
                        <span className="text-green-400">✓ Select Crops</span>
                        <span>→</span>
                        <span className="text-green-400">✓ Planning Method</span>
                        <span>→</span>
                        <span className="text-green-400">✓ Design Area</span>
                        <span>→</span>
                        <span className="font-medium text-blue-400">Select Water System</span>
                        <span>→</span>
                        <span>Design Water System</span>
                    </div>
                </div>

                {/* Show selected data summary */}
                {(crops || shapes) && (
                    <div className="mb-8 rounded-lg border border-gray-700 bg-gray-800 p-4">
                        <h3 className="mb-2 text-lg font-medium text-green-400">
                            Selected Data
                        </h3>
                        {crops && (
                            <div className="mb-2">
                                <span className="text-sm text-gray-400">Selected Crops: </span>
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
                                ✓ Has greenhouse design drawn (
                                {(() => {
                                    try {
                                        return JSON.parse(decodeURIComponent(shapes)).length;
                                    } catch {
                                        return 'Data Error';
                                    }
                                })()}{' '}
                                elements)
                            </div>
                        )}
                        {method && (
                            <div className="text-sm text-gray-400">Planning Method: {method}</div>
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
                                    Selected:{' '}
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
                        Back to Area Design
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
                        Go to Water System Design
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
