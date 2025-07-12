// resources/js/utils/cropData.ts
export interface Crop {
    value: string;
    name: string;
    icon: string;
    description: string;
    spacing: number; // Row spacing
    defaultPlantSpacing: number; // Spacing between plants in a row
    yield: number;
    price: number;
    growthTime: number; // in days
}

export const cropTypes: Crop[] = [
    {
        value: 'corn',
        name: 'ข้าวโพด (Corn)',
        icon: '🌽',
        description: 'พืชไร่เศรษฐกิจที่สำคัญ ปลูกง่าย ให้ผลผลิตสูง',
        spacing: 0.75,
        defaultPlantSpacing: 0.25,
        yield: 1200, // kg/ไร่
        price: 8, // บาท/kg
        growthTime: 75,
    },
    {
        value: 'cassava',
        name: 'มันสำปะหลัง (Cassava)',
        icon: '🍠',
        description: 'พืชหัวที่ทนแล้งได้ดี ใช้เป็นวัตถุดิบในอุตสาหกรรม',
        spacing: 1.0,
        defaultPlantSpacing: 0.8,
        yield: 4000, // kg/ไร่
        price: 2.5, // บาท/kg
        growthTime: 300,
    },
    {
        value: 'sugarcane',
        name: 'อ้อย (Sugarcane)',
        icon: '🎋',
        description: 'พืชหลักในการผลิตน้ำตาลและพลังงานทดแทน',
        spacing: 1.5,
        defaultPlantSpacing: 0.5,
        yield: 15000, // kg/ไร่
        price: 1, // บาท/kg
        growthTime: 365,
    },
    {
        value: 'pineapple',
        name: 'สับปะรด (Pineapple)',
        icon: '🍍',
        description: 'ผลไม้เศรษฐกิจ ส่งออกได้ราคาดี',
        spacing: 0.5,
        defaultPlantSpacing: 0.3,
        yield: 5000, // kg/ไร่
        price: 10, // บาท/kg
        growthTime: 540,
    },
    {
        value: 'durian',
        name: 'ทุเรียน (Durian)',
        icon: '🍈',
        description: 'ราชาผลไม้ที่ได้รับความนิยมสูง มีมูลค่าทางเศรษฐกิจมาก',
        spacing: 8.0,
        defaultPlantSpacing: 8.0,
        yield: 2000, // kg/ไร่ (เมื่อโตเต็มที่)
        price: 150, // บาท/kg
        growthTime: 1825, // 5 years
    },
    {
        value: 'mango',
        name: 'มะม่วง (Mango)',
        icon: '🥭',
        description: 'ผลไม้ที่นิยมบริโภคทั้งในและต่างประเทศ',
        spacing: 6.0,
        defaultPlantSpacing: 6.0,
        yield: 1500, // kg/ไร่
        price: 30, // บาท/kg
        growthTime: 1095, // 3 years
    },
    {
        value: 'chili',
        name: 'พริก (Chili)',
        icon: '🌶️',
        description: 'ส่วนประกอบสำคัญในอาหารไทย ปลูกได้ตลอดปี',
        spacing: 0.5,
        defaultPlantSpacing: 0.5,
        yield: 1000, // kg/ไร่
        price: 60, // บาท/kg
        growthTime: 90,
    },
    {
        value: 'tomato',
        name: 'มะเขือเทศ (Tomato)',
        icon: '🍅',
        description: 'ใช้บริโภคสดและแปรรูปในอุตสาหกรรมอาหาร',
        spacing: 0.6,
        defaultPlantSpacing: 0.4,
        yield: 3000, // kg/ไร่
        price: 20, // บาท/kg
        growthTime: 80,
    },
];

export const getCropByValue = (value: string): Crop | undefined => {
    return cropTypes.find((crop) => crop.value === value);
};

export const searchCrops = (query: string): Crop[] => {
    const lowercaseQuery = query.toLowerCase();
    return cropTypes.filter(
        (crop) =>
            crop.name.toLowerCase().includes(lowercaseQuery) ||
            crop.value.toLowerCase().includes(lowercaseQuery)
    );
};

// Category configurations
export const categoryConfigs = [
    { value: 'all', name: 'ทั้งหมด', icon: '🌱' },
    { value: 'field', name: 'พืชไร่', icon: '🌾' },
    { value: 'vegetable', name: 'พืชผัก', icon: '🥬' },
    { value: 'herb', name: 'สมุนไพร', icon: '🌿' },
];
