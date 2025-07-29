import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import {
    greenhouseCrops,
    getCropByValue,
    searchCrops,
    categories,
    type Crop,
} from '../components/Greenhouse/CropData';

export default function GreenhouseCrop({ cropType, crops }) {
    const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [filteredCrops, setFilteredCrops] = useState(greenhouseCrops);
    const [selectedCropObjects, setSelectedCropObjects] = useState<Crop[]>([]);

    // Categories are directly imported from CropData

    // Initialize with URL parameters
    useEffect(() => {
        if (cropType && !selectedCrops.includes(cropType)) {
            setSelectedCrops([cropType]);
        }

        if (crops) {
            const cropArray = crops.split(',').filter(Boolean);
            setSelectedCrops(cropArray);
        }
    }, [cropType, crops, selectedCrops]);

    // Update filtered crops when search or category changes
    useEffect(() => {
        let filtered = greenhouseCrops;

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter((crop) => crop.category === selectedCategory);
        }

        // Filter by search term
        if (searchTerm.trim()) {
            filtered = searchCrops(searchTerm);
            // Apply category filter to search results if needed
            if (selectedCategory !== 'all') {
                filtered = filtered.filter((crop) => crop.category === selectedCategory);
            }
        }

        setFilteredCrops(filtered);
    }, [searchTerm, selectedCategory]);

    // Update selected crop objects when selectedCrops changes
    useEffect(() => {
        const cropObjects = selectedCrops
            .map((cropValue) => getCropByValue(cropValue))
            .filter((crop): crop is Crop => crop !== undefined);
        setSelectedCropObjects(cropObjects);
    }, [selectedCrops]);

    const handleCropToggle = (cropValue: string) => {
        if (selectedCrops.includes(cropValue)) {
            setSelectedCrops(selectedCrops.filter((crop) => crop !== cropValue));
        } else {
            setSelectedCrops([...selectedCrops, cropValue]);
        }
    };

    const canProceed = selectedCrops.length > 0;

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Navbar */}
            <Navbar />

            {/* Main Content with adjusted height to account for navbar */}
            <div className="flex" style={{ height: 'calc(100vh - 64px)' }}>
                {/* Sidebar - Fixed Summary Panel */}
                <div className="flex w-80 flex-col overflow-hidden border-r border-gray-700 bg-gray-800">
                    {/* Header */}
                    <div className="border-b border-gray-700 p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <a
                                href="/planner"
                                className="flex items-center text-sm text-blue-400 hover:text-blue-300"
                            >
                                <svg
                                    className="mr-1 h-4 w-4"
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
                                กลับ
                            </a>
                        </div>
                        <h1 className="mb-2 text-2xl font-bold">🏠 โรงเรือน</h1>
                        <p className="text-sm text-gray-400">เลือกพืชสำหรับโรงเรือนของคุณ</p>
                    </div>

                    {/* Selected Items Summary */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Selected Crops */}
                        <div className="mb-6">
                            <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-300">
                                พืชที่เลือก ({selectedCrops.length})
                                {selectedCrops.length > 0 && (
                                    <button
                                        onClick={() => setSelectedCrops([])}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        ล้างทั้งหมด
                                    </button>
                                )}
                            </h3>
                            {selectedCropObjects.length === 0 ? (
                                <p className="text-sm text-gray-500">ยังไม่ได้เลือกพืช</p>
                            ) : (
                                <div className="space-y-2">
                                    {selectedCropObjects.map((crop) => (
                                        <div
                                            key={crop.value}
                                            className="group rounded-lg bg-gray-700 p-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex min-w-0 flex-1 items-center">
                                                    <span className="mr-2 text-lg">
                                                        {crop.icon}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="truncate text-sm font-medium text-white">
                                                            {crop.name}
                                                        </h4>
                                                        <p className="truncate text-xs text-gray-400">
                                                            {crop.nameEn}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleCropToggle(crop.value)}
                                                    className="ml-2 text-red-400 opacity-0 transition-opacity hover:text-red-300 group-hover:opacity-100"
                                                    title={`ลบ ${crop.name}`}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Category Summary */}
                        <div className="mb-6">
                            <h3 className="mb-3 text-sm font-semibold text-gray-300">
                                สรุปตามประเภท
                            </h3>
                            <div className="space-y-2">
                                {Object.entries(categories).map(([key, category]) => {
                                    const count = selectedCropObjects.filter(
                                        (crop) => crop.category === key
                                    ).length;
                                    return (
                                        <div
                                            key={key}
                                            className="flex items-center justify-between text-sm"
                                        >
                                            <span className="flex items-center text-gray-400">
                                                <span className="mr-2">{category.icon}</span>
                                                {category.name}
                                            </span>
                                            <span className="text-white">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="border-t border-gray-700 p-6">
                        {canProceed ? (
                            <a
                                href={`/area-input-method?crops=${selectedCrops.join(',')}`}
                                className="inline-flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700"
                            >
                                ไปขั้นตอนถัดไป
                                <svg
                                    className="ml-2 h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                    />
                                </svg>
                            </a>
                        ) : (
                            <button
                                disabled
                                className="w-full cursor-not-allowed rounded-lg bg-gray-700 px-4 py-3 font-medium text-gray-400"
                                title="กรุณาเลือกพืชอย่างน้อย 1 ชนิด"
                            >
                                ไปขั้นตอนถัดไป
                            </button>
                        )}
                        {!canProceed && (
                            <p className="mt-2 text-center text-xs text-gray-500">
                                เลือกพืชเพื่อดำเนินการต่อ
                            </p>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-8">
                        <div className="mb-6">
                            <h2 className="mb-2 text-3xl font-bold">เลือกพืชในโรงเรือน</h2>
                            <p className="text-gray-400">
                                เลือกพืชที่คุณต้องการปลูกในโรงเรือน สามารถเลือกได้หลายชนิด
                            </p>
                        </div>

                        {/* Search and Filter */}
                        <div className="mb-8 space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="ค้นหาพืช..."
                                    className="w-full rounded-lg border border-gray-600 bg-gray-800 py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                                <svg
                                    className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </div>

                            {/* Category Filter */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                        selectedCategory === 'all'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    ทั้งหมด
                                </button>
                                {Object.entries(categories).map(([key, category]) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedCategory(key)}
                                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                            selectedCategory === key
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        {category.icon} {category.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Crops Grid */}
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                            {filteredCrops.map((crop) => (
                                <CropCard
                                    key={crop.value}
                                    crop={crop}
                                    isSelected={selectedCrops.includes(crop.value)}
                                    onToggle={handleCropToggle}
                                />
                            ))}
                        </div>

                        {filteredCrops.length === 0 && (
                            <div className="py-12 text-center">
                                <div className="mb-4 text-6xl">🔍</div>
                                <h3 className="mb-2 text-xl font-semibold text-gray-400">
                                    ไม่พบพืชที่ค้นหา
                                </h3>
                                <p className="text-gray-500">ลองปรับเปลี่ยนคำค้นหาหรือตัวกรอง</p>
                            </div>
                        )}

                        {/* Continue Button for bottom */}
                        {selectedCrops.length > 0 && (
                            <div className="mt-12 border-t border-gray-700 pt-8">
                                <div className="flex items-center justify-between rounded-lg bg-gray-800 p-6">
                                    <div>
                                        <h3 className="mb-1 text-lg font-semibold text-white">
                                            พร้อมเลือกวิธีการวางแผนแล้วใช่ไหม?
                                        </h3>
                                        <p className="text-sm text-gray-400">
                                            คุณได้เลือกพืช {selectedCrops.length} ชนิดแล้ว
                                            ไปเลือกวิธีการวางแผนพื้นที่
                                        </p>
                                    </div>
                                    <a
                                        href={`/area-input-method?crops=${selectedCrops.join(',')}`}
                                        className="flex items-center rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700"
                                    >
                                        ไปขั้นตอนถัดไป
                                        <svg
                                            className="ml-2 h-4 w-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5l7 7-7 7"
                                            />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Separate component for crop cards
function CropCard({ crop, isSelected, onToggle }) {
    return (
        <button
            onClick={() => onToggle(crop.value)}
            className={`rounded-lg border p-4 text-left transition-all hover:scale-105 focus:outline-none ${
                isSelected
                    ? 'border-green-500 bg-green-500/10 ring-2 ring-green-500/50'
                    : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
        >
            <div className="text-center">
                <div className="mb-2 text-3xl">{crop.icon}</div>
                <h4 className="mb-1 text-sm font-semibold text-white">{crop.name}</h4>
                <p className="mb-1 text-xs text-gray-300">{crop.nameEn}</p>
                <p className="line-clamp-2 text-xs text-gray-400">{crop.description}</p>
                {isSelected && (
                    <div className="mt-2">
                        <span className="inline-flex items-center rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white">
                            ✓ เลือกแล้ว
                        </span>
                    </div>
                )}
            </div>
        </button>
    );
}
