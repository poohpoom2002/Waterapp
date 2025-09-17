// resources/js/utils/cropData.ts

<<<<<<< HEAD
import {
    cropTranslations,
    categoryTranslations,
    irrigationNeedsTranslations,
} from '../../contexts/translations/cropts';
=======
import { cropTranslations, categoryTranslations, irrigationNeedsTranslations } from '../../contexts/translations/cropts';
>>>>>>> origin/main

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

<<<<<<< HEAD
export interface TranslatedCrop
    extends Omit<Crop, 'name' | 'description' | 'category' | 'irrigationNeeds'> {
=======
export interface TranslatedCrop extends Omit<Crop, 'name' | 'description' | 'category' | 'irrigationNeeds'> {
>>>>>>> origin/main
    name: string;
    description: string;
    category: string;
    irrigationNeeds: string;
    categoryKey: 'cereal' | 'root' | 'legume' | 'industrial' | 'oilseed';
    irrigationNeedsKey: 'low' | 'medium' | 'high';
}

export const cropTypes: Crop[] = [
    // Cereals
    {
        value: 'rice',
        name: 'Rice',
        icon: '🌾',
        description:
            "Thailand's main crop, grown in paddy fields. Requires a lot of water, especially during tillering and booting stages.",
        category: 'cereal',
        irrigationNeeds: 'high',
        growthPeriod: 120, // Most varieties have a harvest period of about 120 days
        waterRequirement: 4.2, // Estimated from 1,600 m³/rai and a density of 16 plants/m²
        rowSpacing: 25,
        plantSpacing: 25,
        yield: 650, // Average yield for off-season rice
        price: 12, // Price for paddy rice with 15% moisture (subject to fluctuation)
    },
    {
        value: 'corn',
        name: 'Field Corn',
        icon: '🌽',
        description: 'An important economic field crop used in the animal feed industry.',
        category: 'cereal',
        irrigationNeeds: 'medium',
        growthPeriod: 115, // From planting until harvesting mature cobs
        waterRequirement: 2.5, // Estimated from 800-1,200 m³/rai and a density of 8,500 plants/rai
        rowSpacing: 75,
        plantSpacing: 25,
        yield: 750, // National average yield
        price: 9.5, // Price at the farm (subject to fluctuation)
    },
    {
        value: 'sorghum',
        name: 'Sorghum',
        icon: '🌾',
        description:
            'A drought-tolerant cereal crop suitable for arid areas, used for animal and human consumption.',
        category: 'cereal',
        irrigationNeeds: 'low',
        growthPeriod: 110,
        waterRequirement: 1.8, // More drought-tolerant and requires less water than corn
        rowSpacing: 60,
        plantSpacing: 10,
        yield: 450,
        price: 8,
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
        growthPeriod: 300, // Harvest time is 8-12 months
        waterRequirement: 1.5, // A very drought-tolerant plant
        rowSpacing: 100,
        plantSpacing: 80,
        yield: 3500, // Average fresh root yield
        price: 3.0, // Price for 25% starch content (subject to fluctuation)
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
        growthPeriod: 365, // Harvest time is 10-14 months
        waterRequirement: 3.5, // Requires a lot of water, especially during the internode elongation stage
        rowSpacing: 150,
        plantSpacing: 50, // Planted as cuttings
        yield: 12000, // Average fresh cane yield
        price: 1.2, // Price at the factory (THB/kg or 1,200 THB/ton)
    },
    {
        value: 'pineapple',
        name: 'Pineapple',
        icon: '🍍',
<<<<<<< HEAD
        description:
            'A tropical fruit crop with high economic value, suitable for both fresh consumption and processing.',
=======
        description: 'A tropical fruit crop with high economic value, suitable for both fresh consumption and processing.',
>>>>>>> origin/main
        category: 'industrial',
        irrigationNeeds: 'medium',
        growthPeriod: 540, // 18 months from planting to first harvest
        waterRequirement: 2.8, // Moderate water requirement
        rowSpacing: 120,
        plantSpacing: 60,
        yield: 4000, // Average yield per rai
        price: 8.5, // Price at the farm (subject to fluctuation)
    },
    {
        value: 'rubber',
        name: 'Rubber',
        icon: '🌳',
        description: 'A long-term economic crop. Tapping can begin about 7 years after planting.',
        category: 'industrial',
        irrigationNeeds: 'medium',
        growthPeriod: 2555, // 7 years before tapping begins
        waterRequirement: 10.0, // Requires high and consistent moisture
        rowSpacing: 700,
        plantSpacing: 300,
        yield: 280, // Average annual dry rubber yield
        price: 25, // Price for fresh latex (subject to fluctuation)
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
        growthPeriod: 1095, // ~3 years before first harvest
        waterRequirement: 15.0, // Requires a lot of consistent water throughout the year
        rowSpacing: 900,
        plantSpacing: 900, // Planted in an equilateral triangle pattern
        yield: 3000, // Fresh fruit bunch yield
        price: 5.5, // Price for raw palm fruit (subject to fluctuation)
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

// Find a crop by its value
export function getCropByValue(value: string): Crop | undefined {
    return cropTypes.find((crop) => crop.value === value);
}

// Find a crop by its value with translation
<<<<<<< HEAD
export function getTranslatedCropByValue(
    value: string,
    language: 'en' | 'th' = 'en'
): TranslatedCrop | undefined {
=======
export function getTranslatedCropByValue(value: string, language: 'en' | 'th' = 'en'): TranslatedCrop | undefined {
>>>>>>> origin/main
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
<<<<<<< HEAD
    return cropTypes.map((crop) => {
=======
    return cropTypes.map(crop => {
>>>>>>> origin/main
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

// Search crops by name or description (case-insensitive) with translation support
export function searchCrops(term: string, language: 'en' | 'th' = 'en'): Crop[] {
    const lower = term.toLowerCase();
    return cropTypes.filter((crop) => {
        const translation = cropTranslations[language][crop.value];
        const translatedName = translation?.name || crop.name;
        const translatedDescription = translation?.description || crop.description;
<<<<<<< HEAD

=======
        
>>>>>>> origin/main
        return (
            translatedName.toLowerCase().includes(lower) ||
            translatedDescription.toLowerCase().includes(lower) ||
            crop.name.toLowerCase().includes(lower) ||
            crop.description.toLowerCase().includes(lower)
        );
    });
}

// Search translated crops
<<<<<<< HEAD
export function searchTranslatedCrops(
    term: string,
    language: 'en' | 'th' = 'en'
): TranslatedCrop[] {
    const matchingCrops = searchCrops(term, language);
    return matchingCrops.map((crop) => {
=======
export function searchTranslatedCrops(term: string, language: 'en' | 'th' = 'en'): TranslatedCrop[] {
    const matchingCrops = searchCrops(term, language);
    return matchingCrops.map(crop => {
>>>>>>> origin/main
        const translated = getTranslatedCropByValue(crop.value, language);
        return translated!;
    });
}

// Get crops by category with translation
<<<<<<< HEAD
export function getCropsByCategory(
    category: 'cereal' | 'root' | 'legume' | 'industrial' | 'oilseed',
    language: 'en' | 'th' = 'en'
): TranslatedCrop[] {
    const categoryQrops = cropTypes.filter((crop) => crop.category === category);
    return categoryQrops.map((crop) => getTranslatedCropByValue(crop.value, language)!);
}

// Get available categories with translation
export function getAvailableCategories(
    language: 'en' | 'th' = 'en'
): Array<{ key: string; name: string }> {
    const categories = Array.from(new Set(cropTypes.map((crop) => crop.category)));
    return categories.map((category) => ({
        key: category,
        name: categoryTranslations[language][category] || category,
    }));
}
=======
export function getCropsByCategory(category: 'cereal' | 'root' | 'legume' | 'industrial' | 'oilseed', language: 'en' | 'th' = 'en'): TranslatedCrop[] {
    const categoryQrops = cropTypes.filter(crop => crop.category === category);
    return categoryQrops.map(crop => getTranslatedCropByValue(crop.value, language)!);
}

// Get available categories with translation
export function getAvailableCategories(language: 'en' | 'th' = 'en'): Array<{key: string, name: string}> {
    const categories = Array.from(new Set(cropTypes.map(crop => crop.category)));
    return categories.map(category => ({
        key: category,
        name: categoryTranslations[language][category] || category
    }));
}
>>>>>>> origin/main
