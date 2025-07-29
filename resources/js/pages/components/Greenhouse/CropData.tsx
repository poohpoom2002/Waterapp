// CropData.tsx
export interface Crop {
    value: string;
    name: string;
    nameEn: string;
    description: string;
    icon: string;
    category: string;
}

export interface Category {
    name: string;
    nameEn: string;
    icon: string;
}

// Greenhouse crop data
export const greenhouseCrops: Crop[] = [
    // Vegetables
    {
        value: 'tomato',
        name: 'Tomato',
        nameEn: 'Tomato',
        description: 'Versatile fruit-vegetable suitable for greenhouse cultivation',
        icon: '🍅',
        category: 'vegetables',
    },
    {
        value: 'bell-pepper',
        name: 'Bell Pepper',
        nameEn: 'Bell Pepper',
        description: 'Colorful sweet pepper rich in vitamins',
        icon: '🫑',
        category: 'vegetables',
    },
    {
        value: 'cucumber',
        name: 'Cucumber',
        nameEn: 'Cucumber',
        description: 'Fresh, crisp vegetable suitable for greenhouse growing',
        icon: '🥒',
        category: 'vegetables',
    },
    {
        value: 'melon',
        name: 'Melon',
        nameEn: 'Melon',
        description: 'Sweet fruit with tender flesh, grows well in greenhouses',
        icon: '🍈',
        category: 'vegetables',
    },
    {
        value: 'lettuce',
        name: 'Lettuce',
        nameEn: 'Lettuce',
        description: 'Various salad greens such as red oak and green oak varieties',
        icon: '🥬',
        category: 'vegetables',
    },
    {
        value: 'kale',
        name: 'Kale',
        nameEn: 'Kale',
        description: 'Dark green leafy vegetable rich in nutrients',
        icon: '🥬',
        category: 'vegetables',
    },
    {
        value: 'pak-choi',
        name: 'Pak Choi',
        nameEn: 'Pak Choi',
        description: 'Chinese green leafy vegetable with fast growth',
        icon: '🥬',
        category: 'vegetables',
    },
    {
        value: 'chinese-kale',
        name: 'Chinese Kale',
        nameEn: 'Chinese Kale',
        description: 'Thai green leafy vegetable with fast growth',
        icon: '🥬',
        category: 'vegetables',
    },
    {
        value: 'cabbage',
        name: 'Cabbage',
        nameEn: 'Cabbage',
        description: 'Compact head vegetable suitable for greenhouse cultivation',
        icon: '🥬',
        category: 'vegetables',
    },
    {
        value: 'cauliflower',
        name: 'Cauliflower',
        nameEn: 'Cauliflower',
        description: 'White flowering vegetable rich in vitamins',
        icon: '🥦',
        category: 'vegetables',
    },
    {
        value: 'broccoli',
        name: 'Broccoli',
        nameEn: 'Broccoli',
        description: 'Green flowering vegetable rich in nutrients',
        icon: '🥦',
        category: 'vegetables',
    },
    // Fruits
    {
        value: 'strawberry',
        name: 'Strawberry',
        nameEn: 'Strawberry',
        description: 'Sweet, juicy fruit suitable for greenhouse cultivation',
        icon: '🍓',
        category: 'fruits',
    },
    {
        value: 'seedless-grape',
        name: 'Seedless Grape',
        nameEn: 'Seedless Grape',
        description: 'Sweet seedless grapes of premium quality',
        icon: '🍇',
        category: 'fruits',
    },
    {
        value: 'cantaloupe',
        name: 'Cantaloupe',
        nameEn: 'Cantaloupe',
        description: 'Orange-fleshed melon, sweet and aromatic',
        icon: '🍈',
        category: 'fruits',
    },
    {
        value: 'japanese-melon',
        name: 'Japanese Melon',
        nameEn: 'Japanese Melon',
        description: 'Premium melon with tender flesh and intense sweetness',
        icon: '🍈',
        category: 'fruits',
    },
];

// For greenhouse only - other sections removed

// Categories definition (greenhouse only)
export const categories: Record<string, Category> = {
    vegetables: { name: 'Vegetables', nameEn: 'Vegetables', icon: '🥬' },
    fruits: { name: 'Fruits', nameEn: 'Fruits', icon: '🍓' },
};

// Helper functions (greenhouse only)
export const getCropByValue = (value: string): Crop | undefined => {
    return greenhouseCrops.find((crop) => crop.value === value);
};

export const searchCrops = (searchTerm: string): Crop[] => {
    const term = searchTerm.toLowerCase();
    return greenhouseCrops.filter(
        (crop) =>
            crop.name.toLowerCase().includes(term) ||
            crop.nameEn.toLowerCase().includes(term) ||
            crop.description.toLowerCase().includes(term)
    );
};

export const getCropsByCategory = (category: string): Crop[] => {
    return greenhouseCrops.filter((crop) => crop.category === category);
};
