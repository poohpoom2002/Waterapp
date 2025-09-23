import { useState, useEffect, useMemo, useCallback } from 'react';
import { router } from '@inertiajs/react';
import Navbar from '../../components/Navbar';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    cropTranslations,
    categoryTranslations,
    irrigationNeedsTranslations,
} from '../../contexts/translations/cropts';

// INTERFACES & TYPES (ย้ายมาจาก cropData.ts)
export interface Crop {
    value: string;
    name: string;
    icon: string;
    description: string;
    category: 'cereal' | 'root' | 'legume' | 'industrial' | 'oilseed';
    irrigationNeeds: 'low' | 'medium' | 'high';
    growthPeriod: number; // Growth period from planting to full maturity (days)
    waterRequirement: number; // Estimated water requirement (liters/plant/day)
    rowSpacing: number; // Spacing between rows (cm)
    plantSpacing: number; // Spacing between plants in the same row (cm)
    yield: number; // Expected yield (kg/rai)
    price: number; // Price (THB/kg)
}

export interface TranslatedCrop
    extends Omit<Crop, 'name' | 'description' | 'category' | 'irrigationNeeds'> {
    name: string;
    description: string;
    category: string;
    irrigationNeeds: string;
    categoryKey: 'cereal' | 'root' | 'legume' | 'industrial' | 'oilseed';
    irrigationNeedsKey: 'low' | 'medium' | 'high';
}

// CROP DATA (ย้ายมาจาก cropData.ts)
export const cropTypes: Crop[] = [
    // Cereals
    {
        value: 'corn',
        name: 'Corn',
        icon: '🌽',
        description: 'An important economic field crop used in the animal feed industry.',
        category: 'cereal',
        irrigationNeeds: 'medium',
        growthPeriod: 115,
        waterRequirement: 2.5,
        rowSpacing: 75,
        plantSpacing: 25,
        yield: 750,
        price: 9.5,
    },

    // Root crops
    {
        value: 'cassava',
        name: 'Cassava',
        icon: '🍠',
        description:
            'A major economic root crop, very drought-tolerant, used in starch and energy industries.',
        category: 'root',
        irrigationNeeds: 'low',
        growthPeriod: 300,
        waterRequirement: 1.5,
        rowSpacing: 100,
        plantSpacing: 80,
        yield: 3500,
        price: 3.0,
    },
    {
        value: 'sweet_potato',
        name: 'Sweet Potato',
        icon: '🍠',
        description:
            'A highly nutritious root crop with both domestic and international market demand.',
        category: 'root',
        irrigationNeeds: 'medium',
        growthPeriod: 110,
        waterRequirement: 2.0,
        rowSpacing: 80,
        plantSpacing: 30,
        yield: 2000,
        price: 15,
    },
    {
        value: 'taro',
        name: 'Taro',
        icon: '🌿',
        description:
            'A nutritious root vegetable that grows well in wet conditions and is popular in Thai cuisine.',
        category: 'root',
        irrigationNeeds: 'high',
        growthPeriod: 240,
        waterRequirement: 4.0,
        rowSpacing: 60,
        plantSpacing: 40,
        yield: 1800,
        price: 20,
    },

    // Legumes
    {
        value: 'soybean',
        name: 'Soybean',
        icon: '🫘',
        description:
            'A high-protein, soil-improving crop that requires care during flowering and podding.',
        category: 'legume',
        irrigationNeeds: 'medium',
        growthPeriod: 95,
        waterRequirement: 2.8,
        rowSpacing: 50,
        plantSpacing: 20,
        yield: 280,
        price: 18,
    },
    {
        value: 'mung_bean',
        name: 'Mung Bean',
        icon: '🫘',
        description: 'A short-lived crop that uses little water, popular for planting after rice.',
        category: 'legume',
        irrigationNeeds: 'low',
        growthPeriod: 70,
        waterRequirement: 1.5,
        rowSpacing: 50,
        plantSpacing: 10,
        yield: 150,
        price: 25,
    },
    {
        value: 'peanut',
        name: 'Peanut',
        icon: '🥜',
        description:
            'An oil and protein crop grown in loamy soil, requiring consistent water during pod formation.',
        category: 'legume',
        irrigationNeeds: 'medium',
        growthPeriod: 100,
        waterRequirement: 2.2,
        rowSpacing: 50,
        plantSpacing: 20,
        yield: 350,
        price: 22,
    },

    // Industrial crops
    {
        value: 'sugarcane',
        name: 'Sugarcane',
        icon: '🎋',
        description: 'The main crop for the sugar and ethanol industries.',
        category: 'industrial',
        irrigationNeeds: 'high',
        growthPeriod: 365,
        waterRequirement: 3.5,
        rowSpacing: 150,
        plantSpacing: 50,
        yield: 12000,
        price: 1.2,
    },
    {
        value: 'pineapple',
        name: 'Pineapple',
        icon: '🍍',
        description:
            'A tropical fruit crop with high economic value, suitable for both fresh consumption and processing.',
        category: 'industrial',
        irrigationNeeds: 'medium',
        growthPeriod: 540,
        waterRequirement: 2.8,
        rowSpacing: 120,
        plantSpacing: 60,
        yield: 4000,
        price: 8.5,
    },
    {
        value: 'rubber',
        name: 'Rubber',
        icon: '🌳',
        description: 'A long-term economic crop. Tapping can begin about 7 years after planting.',
        category: 'industrial',
        irrigationNeeds: 'medium',
        growthPeriod: 2555,
        waterRequirement: 10.0,
        rowSpacing: 700,
        plantSpacing: 300,
        yield: 280,
        price: 25,
    },
    {
        value: 'asparagus',
        name: 'Asparagus',
        icon: '🌱',
        description:
            'A high-value perennial vegetable crop popular in export markets and fine dining.',
        category: 'industrial',
        irrigationNeeds: 'medium',
        growthPeriod: 365,
        waterRequirement: 3.0,
        rowSpacing: 150,
        plantSpacing: 30,
        yield: 800,
        price: 150,
    },
    {
        value: 'chili',
        name: 'Chili Pepper',
        icon: '🌶️',
        description:
            'A spicy vegetable crop essential in Thai cuisine with high market demand both fresh and dried.',
        category: 'industrial',
        irrigationNeeds: 'medium',
        growthPeriod: 120,
        waterRequirement: 2.5,
        rowSpacing: 60,
        plantSpacing: 30,
        yield: 1200,
        price: 80,
    },

    // Oilseed crops
    {
        value: 'oil_palm',
        name: 'Oil Palm',
        icon: '🌴',
        description:
            'The oilseed crop with the highest yield per rai. Begins to bear fruit 3 years after planting.',
        category: 'oilseed',
        irrigationNeeds: 'high',
        growthPeriod: 1095,
        waterRequirement: 15.0,
        rowSpacing: 900,
        plantSpacing: 900,
        yield: 3000,
        price: 5.5,
    },
    {
        value: 'sunflower',
        name: 'Sunflower',
        icon: '🌻',
        description:
            'A short-lived, drought-tolerant oilseed crop grown for supplemental income and tourism.',
        category: 'oilseed',
        irrigationNeeds: 'low',
        growthPeriod: 90,
        waterRequirement: 2.0,
        rowSpacing: 70,
        plantSpacing: 25,
        yield: 250,
        price: 15,
    },
];

// ============================================================================
// CROP UTILITY FUNCTIONS (ย้ายมาจาก cropData.ts)
// ============================================================================

// Find a crop by its value
export function getCropByValue(value: string): Crop | undefined {
    return cropTypes.find((crop) => crop.value === value);
}

// Find a crop by its value with translation
export function getTranslatedCropByValue(
    value: string,
    language: 'en' | 'th' = 'en'
): TranslatedCrop | undefined {
    const crop = getCropByValue(value);
    if (!crop) return undefined;

    const translation = cropTranslations[language][value];
    const categoryTranslation = categoryTranslations[language][crop.category];
    const irrigationTranslation = irrigationNeedsTranslations[language][crop.irrigationNeeds];

    return {
        ...crop,
        name: translation?.name || crop.name,
        description: translation?.description || crop.description,
        category: categoryTranslation || crop.category,
        irrigationNeeds: irrigationTranslation || crop.irrigationNeeds,
        categoryKey: crop.category,
        irrigationNeedsKey: crop.irrigationNeeds,
    };
}

// Get all crops with translation
export function getTranslatedCrops(language: 'en' | 'th' = 'en'): TranslatedCrop[] {
    return cropTypes.map((crop) => {
        const translation = cropTranslations[language][crop.value];
        const categoryTranslation = categoryTranslations[language][crop.category];
        const irrigationTranslation = irrigationNeedsTranslations[language][crop.irrigationNeeds];

        return {
            ...crop,
            name: translation?.name || crop.name,
            description: translation?.description || crop.description,
            category: categoryTranslation || crop.category,
            irrigationNeeds: irrigationTranslation || crop.irrigationNeeds,
            categoryKey: crop.category,
            irrigationNeedsKey: crop.irrigationNeeds,
        };
    });
}

// Search crops by name or description
export function searchTranslatedCrops(
    query: string,
    language: 'en' | 'th' = 'en'
): TranslatedCrop[] {
    const translatedCrops = getTranslatedCrops(language);
    const searchTerm = query.toLowerCase().trim();

    return translatedCrops.filter(
        (crop) =>
            crop.name.toLowerCase().includes(searchTerm) ||
            crop.description.toLowerCase().includes(searchTerm) ||
            crop.category.toLowerCase().includes(searchTerm)
    );
}

// Get crops by category
export function getCropsByCategory(
    category: 'cereal' | 'root' | 'legume' | 'industrial' | 'oilseed',
    language: 'en' | 'th' = 'en'
): TranslatedCrop[] {
    const translatedCrops = getTranslatedCrops(language);
    return translatedCrops.filter((crop) => crop.categoryKey === category);
}

// Get available categories
export function getAvailableCategories(
    language: 'en' | 'th' = 'en'
): Array<{ key: string; name: string }> {
    const categories = ['cereal', 'root', 'legume', 'industrial', 'oilseed'] as const;

    return categories.map((category) => ({
        key: category,
        name: categoryTranslations[language][category] || category,
    }));
}

// ============================================================================
// FIELD CROP COMPONENT INTERFACES
// ============================================================================

interface FieldCropProps {
    cropType?: string;
    crops?: string;
}

// ============================================================================
// MAIN FIELD CROP COMPONENT
// ============================================================================

export default function FieldCrop({ cropType, crops }: FieldCropProps) {
    const { t, language } = useLanguage();
    const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Initialize with URL parameters if provided
    useEffect(() => {
        if (crops) {
            const cropArray = crops.split(',').filter(Boolean);
            setSelectedCrops(cropArray);
        } else if (cropType) {
            setSelectedCrops([cropType]);
        }
    }, [cropType, crops]);

    const handleCropToggle = useCallback((cropValue: string) => {
        setSelectedCrops((prev) => {
            // If the same crop is selected, deselect it
            if (prev.includes(cropValue)) {
                return [];
            } else {
                // Otherwise, select only this crop (replace any existing selection)
                return [cropValue];
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
            crops = getCropsByCategory(
                selectedCategory as 'cereal' | 'root' | 'legume' | 'industrial' | 'oilseed',
                language
            );
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
        router.get('/');
    };

    const handleContinueToMap = () => {
        router.get(`/step1-field-area?crops=${selectedCrops.join(',')}`);
    };

    const getSelectedCropsText = () => {
        return selectedCrops.length > 0 ? t('Selected Crop') : t('No Crop Selected');
    };

    const getContinueDescription = () => {
        return selectedCrops.length > 0
            ? t("You've selected a crop. Continue to the field mapping tool.")
            : t('Please select a crop to continue.');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />

            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <button
                        onClick={handleBackToPlanner}
                        className="mb-4 flex items-center text-blue-400 hover:text-blue-300"
                    >
                        <svg
                            className="mr-2 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                        {t('Back to Irrigation Planner')}
                    </button>

                    <h1 className="text-3xl font-bold text-white">{t('Select Field Crop')}</h1>
                    <p className="mt-2 text-gray-400">
                        {t('Choose the crop you want to grow in your field')}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Crop Selection Panel */}
                    <div className="lg:col-span-2">
                        {/* Search and Filter Controls */}
                        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
                            {/* Search Input */}
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder={t('Search crops...')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>

                            {/* Category Filter */}
                            <div className="sm:w-48">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                >
                                    <option value="all">{t('All Categories')}</option>
                                    {availableCategories.map((category) => (
                                        <option key={category.key} value={category.key}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Crop Grid */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

                        {/* No results message */}
                        {filteredCrops.length === 0 && (
                            <div className="py-12 text-center">
                                <div className="mb-4 text-4xl">🔍</div>
                                <h3 className="mb-2 text-lg font-medium text-gray-300">
                                    {t('No crops found')}
                                </h3>
                                <p className="text-gray-500">
                                    {t('Try adjusting your search or filter criteria')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Selected Crops Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 rounded-lg border border-gray-700 bg-gray-800 p-6">
                            <h3 className="mb-4 text-lg font-semibold text-white">
                                {getSelectedCropsText()}
                            </h3>

                            <div className="mb-6 max-h-64 overflow-y-auto">
                                {selectedCrops.length === 0 ? (
                                    <p className="text-sm text-gray-500">{t('No crop selected')}</p>
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
                                                        title={t('Deselect {cropName}').replace(
                                                            '{cropName}',
                                                            crop.name
                                                        )}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Action Button */}
                            <div className="border-t border-gray-700 pt-4">
                                {canProceed ? (
                                    <div className="rounded-lg border border-blue-500 bg-blue-500/10 p-4">
                                        <div className="mb-3">
                                            <h3 className="text-sm font-medium text-blue-400">
                                                {t('Ready to Continue')}
                                            </h3>
                                            <p className="text-sm text-gray-400">
                                                {getContinueDescription()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleContinueToMap}
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
                                        </button>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-gray-600 bg-gray-700/50 p-4">
                                        <h3 className="text-sm font-medium text-gray-400">
                                            {t('Select a crop to continue')}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {t('Choose a crop to proceed to field mapping')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// CROP CARD COMPONENT
// ============================================================================

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
                <p className="mb-2 line-clamp-2 text-xs text-gray-400">{crop.description}</p>

                {/* Category and Irrigation tags */}
                <div className="mb-2 flex justify-center gap-1 text-xs">
                    <span className="rounded bg-gray-600 px-2 py-1 text-gray-300">
                        {crop.category}
                    </span>
                    <span
                        className={`rounded px-2 py-1 ${
                            crop.irrigationNeedsKey === 'high'
                                ? 'bg-red-600 text-red-100'
                                : crop.irrigationNeedsKey === 'medium'
                                  ? 'bg-yellow-600 text-yellow-100'
                                  : 'bg-green-600 text-green-100'
                        }`}
                    >
                        {crop.irrigationNeeds}
                    </span>
                </div>

                {/* Technical details */}
                <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex justify-between">
                        <span>
                            {t('Growth')}: {crop.growthPeriod}d
                        </span>
                        <span>
                            {t('Yield')}: {crop.yield}kg/rai
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>
                            {t('Water')}: {crop.waterRequirement}ลิตร/ครั้ง
                        </span>
                        <span>
                            {t('Price')}: ฿{crop.price}/kg
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
}
