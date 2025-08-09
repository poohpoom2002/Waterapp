import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { 
    getTranslatedCrops, 
    getTranslatedCropByValue, 
    searchTranslatedCrops,
    getCropsByCategory,
    getAvailableCategories,
    type TranslatedCrop 
} from '@/pages/utils/cropData';
import { useLanguage } from '../contexts/LanguageContext';

interface FieldCropProps {
    cropType?: string;
    crops?: string;
}

export default function FieldCrop({ cropType, crops }: FieldCropProps) {
    const { t, language } = useLanguage();
    const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Initialize with URL parameters if provided
    useEffect(() => {
        if (cropType && !selectedCrops.includes(cropType)) {
            setSelectedCrops([cropType]);
        }

        if (crops) {
            const cropArray = crops.split(',').filter(Boolean);
            setSelectedCrops(cropArray);
        }
    }, [cropType, crops]);

    const handleCropToggle = useCallback((cropValue: string) => {
        setSelectedCrops((prev) => {
            if (prev.includes(cropValue)) {
                return prev.filter((crop) => crop !== cropValue);
            } else {
                return [...prev, cropValue];
            }
        });
    }, []);

    const selectedCropObjects = useMemo(
        () =>
            selectedCrops
                .map((cropValue) => getTranslatedCropByValue(cropValue, language))
                .filter((crop): crop is TranslatedCrop => crop !== undefined),
        [selectedCrops, language]
    );

    // Get available categories for filter dropdown
    const availableCategories = useMemo(() => getAvailableCategories(language), [language]);

    // Filter crops based on search term and category
    const filteredCrops = useMemo(() => {
        let crops: TranslatedCrop[];

        // Start with all crops or filter by category
        if (selectedCategory === 'all') {
            crops = getTranslatedCrops(language);
        } else {
            crops = getCropsByCategory(selectedCategory as 'cereal' | 'root' | 'legume' | 'industrial' | 'oilseed', language);
        }

        // Apply search filter
        if (searchTerm.trim()) {
            crops = searchTranslatedCrops(searchTerm, language);
        }

        return crops;
    }, [searchTerm, selectedCategory, language]);

    const canProceed = useMemo(() => {
        return selectedCrops.length > 0;
    }, [selectedCrops.length]);

    const handleBackToPlanner = () => {
        window.location.href = "/";
    };

    const getSelectedCropsText = () => {
        return t('Selected Crops ({count})').replace('{count}', selectedCrops.length.toString());
    };

    const getContinueDescription = () => {
        const count = selectedCrops.length;
        return t("You've selected {count} crop(s). Continue to the field mapping tool.")
            .replace('{count}', count.toString());
    };

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
                            <button
                                onClick={handleBackToPlanner}
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
                                {t('Back')}
                            </button>
                        </div>
                        <h1 className="mb-2 text-2xl font-bold">🌾 {t('Field Crop')}</h1>
                        <p className="text-sm text-gray-400">{t('Select crops for your field')}</p>
                    </div>

                    {/* Selected Items Summary */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Selected Crops */}
                        <div className="mb-6">
                            <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-300">
                                {getSelectedCropsText()}
                                {selectedCrops.length > 0 && (
                                    <button
                                        onClick={() => setSelectedCrops([])}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        {t('Clear All')}
                                    </button>
                                )}
                            </h3>
                            {selectedCropObjects.length === 0 ? (
                                <p className="text-sm text-gray-500">{t('No crops selected')}</p>
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
                                                            {crop.category}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleCropToggle(crop.value)}
                                                    className="ml-2 text-red-400 opacity-0 transition-opacity hover:text-red-300 group-hover:opacity-100"
                                                    title={t('Remove {cropName}').replace('{cropName}', crop.name)}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="border-t border-gray-700 p-6">
                        {canProceed ? (
                            <a
                                href={`/field-map?crops=${selectedCrops.join(',')}`}
                                className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                            >
                                {t('Continue to Map')}
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
                                title={t('Please select at least one crop')}
                            >
                                {t('Continue to Map')}
                            </button>
                        )}
                        {!canProceed && (
                            <p className="mt-2 text-center text-xs text-gray-500">
                                {t('Select crops to continue')}
                            </p>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-8">
                        <div className="mb-6">
                            <h2 className="mb-2 text-3xl font-bold">{t('Select Your Crops')}</h2>
                            <p className="text-gray-400">
                                {t('Choose one or more crops you want to grow on your field.')}
                            </p>
                        </div>

                        {/* Search and Filter */}
                        <div className="mb-8 space-y-4">
                            {/* Category Filter */}
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-300">
                                    {t('Category')}:
                                </label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">{t('All Categories')}</option>
                                    {availableCategories.map((category) => (
                                        <option key={category.key} value={category.key}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t('Search crops...')}
                                    className="w-full rounded-lg border border-gray-600 bg-gray-800 py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        </div>

                        {/* Results Info */}
                        <div className="mb-4 text-sm text-gray-400">
                            {filteredCrops.length > 0 ? (
                                <span>
                                    {language === 'th' 
                                        ? `พบ ${filteredCrops.length} ชนิด` 
                                        : `Found ${filteredCrops.length} crops`}
                                </span>
                            ) : null}
                        </div>

                        {/* Crops Grid */}
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                            {filteredCrops.map((crop) => (
                                <CropCard
                                    key={crop.value}
                                    crop={crop}
                                    isSelected={selectedCrops.includes(crop.value)}
                                    onToggle={handleCropToggle}
                                    t={t}
                                />
                            ))}
                        </div>

                        {filteredCrops.length === 0 && (
                            <div className="py-12 text-center">
                                <div className="mb-4 text-6xl">🔍</div>
                                <h3 className="mb-2 text-xl font-semibold text-gray-400">
                                    {t('No crops found')}
                                </h3>
                                <p className="text-gray-500">
                                    {t('Try adjusting your search or filter options')}
                                </p>
                            </div>
                        )}

                        {/* Continue Button for bottom */}
                        {selectedCrops.length > 0 && (
                            <div className="mt-12 border-t border-gray-700 pt-8">
                                <div className="flex items-center justify-between rounded-lg bg-gray-800 p-6">
                                    <div>
                                        <h3 className="mb-1 text-lg font-semibold text-white">
                                            {t('Ready to plan your field?')}
                                        </h3>
                                        <p className="text-sm text-gray-400">
                                            {getContinueDescription()}
                                        </p>
                                    </div>
                                    <a
                                        href={`/field-map?crops=${selectedCrops.join(',')}`}
                                        className="flex items-center rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                                    >
                                        {t('Continue to Map')}
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
function CropCard({
    crop,
    isSelected,
    onToggle,
    t,
}: {
    crop: TranslatedCrop;
    isSelected: boolean;
    onToggle: (value: string) => void;
    t: (key: string) => string;
}) {
    return (
        <button
            onClick={() => onToggle(crop.value)}
            className={`rounded-lg border p-4 text-left transition-all hover:scale-105 focus:outline-none ${
                isSelected
                    ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50'
                    : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
        >
            <div className="text-center">
                <div className="mb-2 text-3xl">{crop.icon}</div>
                <h4 className="mb-1 text-sm font-semibold text-white">{crop.name}</h4>
                <p className="line-clamp-2 text-xs text-gray-400 mb-2">{crop.description}</p>
                
                {/* Category and Irrigation tags */}
                <div className="mb-2 flex justify-center gap-1 text-xs">
                    <span className="rounded bg-gray-600 px-2 py-1 text-gray-300">
                        {crop.category}
                    </span>
                    <span className={`rounded px-2 py-1 ${
                        crop.irrigationNeedsKey === 'high' 
                            ? 'bg-red-600 text-red-100'
                            : crop.irrigationNeedsKey === 'medium'
                            ? 'bg-yellow-600 text-yellow-100'
                            : 'bg-green-600 text-green-100'
                    }`}>
                        {crop.irrigationNeeds}
                    </span>
                </div>

                {/* Growth period and yield info */}
                <div className="text-xs text-gray-500 space-y-1">
                    <div>{crop.growthPeriod} {t('days')}</div>
                    <div>{crop.yield} {t('kg')}/{t('Rai')}</div>
                </div>

                {isSelected && (
                    <div className="mt-2">
                        <span className="inline-flex items-center rounded-full bg-blue-500 px-2 py-1 text-xs font-medium text-white">
                            {t('✓ Selected')}
                        </span>
                    </div>
                )}
            </div>
        </button>
    );
}
