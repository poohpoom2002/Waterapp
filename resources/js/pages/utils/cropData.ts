// resources/js/utils/cropData.ts
export interface Crop {
    value: string;
    name: string;
    icon: string;
    description: string;
    category: 'cereal' | 'root' | 'legume' | 'industrial' | 'oilseed';
    irrigationNeeds: 'low' | 'medium' | 'high';
    growthPeriod: number; // days
    waterRequirement: number; // liters per day per plant
    spacing: number; // cm between plants
    yield: number; // kg/ไร่
    price: number; // บาท/kg
    // Added for field-crop-summary calculations
    defaultPlantSpacing?: number; // meters between plants (default for calculations)
    yieldPerPlant?: number; // kg per plant (for yield estimation)
    pricePerKg?: number; // price per kg (for price estimation)
}

export const cropTypes: Crop[] = [
    // Cereals (ธัญพืช)
    {
        value: 'rice',
        name: 'ข้าว (Rice)',
        icon: '🌾',
        description: 'พืชหลักของไทย ปลูกในนาข้าว ต้องการน้ำมาก',
        category: 'cereal',
        irrigationNeeds: 'high',
        growthPeriod: 120,
        waterRequirement: 5.0,
        spacing: 20,
        yield: 800,
        price: 15,
        defaultPlantSpacing: 0.2,
        yieldPerPlant: 0.04, // 800kg/rai, ~200,000 plants/rai
        pricePerKg: 15
    },
    {
        value: 'corn',
        name: 'ข้าวโพด (Corn)',
        icon: '🌽',
        description: 'พืชไร่เศรษฐกิจสำคัญ ปลูกง่าย ให้ผลผลิตสูง',
        category: 'cereal',
        irrigationNeeds: 'medium',
        growthPeriod: 75,
        waterRequirement: 3.0,
        spacing: 30,
        yield: 1200,
        price: 8,
        defaultPlantSpacing: 0.3,
        yieldPerPlant: 0.2, // 1200kg/rai, ~6000 plants/rai
        pricePerKg: 8
    },
    {
        value: 'sorghum',
        name: 'ข้าวฟ่าง (Sorghum)',
        icon: '🌾',
        description: 'พืชธัญพืชทนแล้ง เหมาะกับพื้นที่แห้งแล้ง',
        category: 'cereal',
        irrigationNeeds: 'low',
        growthPeriod: 100,
        waterRequirement: 2.0,
        spacing: 25,
        yield: 600,
        price: 12,
        defaultPlantSpacing: 0.25,
        yieldPerPlant: 0.1,
        pricePerKg: 12
    },

    // Root crops (พืชหัว)
    {
        value: 'cassava',
        name: 'มันสำปะหลัง (Cassava)',
        icon: '🍠',
        description: 'พืชหัวสำคัญ ทนแล้งได้ดี ใช้เป็นวัตถุดิบอุตสาหกรรม',
        category: 'root',
        irrigationNeeds: 'low',
        growthPeriod: 300,
        waterRequirement: 1.5,
        spacing: 80,
        yield: 4000,
        price: 2.5,
        defaultPlantSpacing: 0.8,
        yieldPerPlant: 0.01,
        pricePerKg: 2.5
    },
    {
        value: 'sweet_potato',
        name: 'มันเทศ (Sweet Potato)',
        icon: '🍠',
        description: 'พืชหัวที่มีคุณค่าทางโภชนาการสูง',
        category: 'root',
        irrigationNeeds: 'medium',
        growthPeriod: 120,
        waterRequirement: 2.2,
        spacing: 40,
        yield: 2500,
        price: 8,
        defaultPlantSpacing: 0.4,
        yieldPerPlant: 0.02,
        pricePerKg: 8
    },

    // Legumes (พืชตระกูลถั่ว)
    {
        value: 'soybean',
        name: 'ถั่วเหลือง (Soybean)',
        icon: '🫘',
        description: 'พืชให้โปรตีนสูง ปรับปรุงความอุดมสมบูรณ์ของดิน',
        category: 'legume',
        irrigationNeeds: 'medium',
        growthPeriod: 95,
        waterRequirement: 2.8,
        spacing: 30,
        yield: 350,
        price: 25,
        defaultPlantSpacing: 0.3,
        yieldPerPlant: 0.003,
        pricePerKg: 25
    },
    {
        value: 'mung_bean',
        name: 'ถั่วเขียว (Mung Bean)',
        icon: '🫘',
        description: 'พืชพวกถั่วที่เก็บเกี่ยวเร็ว ปลูกหลังนาข้าว',
        category: 'legume',
        irrigationNeeds: 'low',
        growthPeriod: 60,
        waterRequirement: 1.8,
        spacing: 20,
        yield: 280,
        price: 40,
        defaultPlantSpacing: 0.2,
        yieldPerPlant: 0.002,
        pricePerKg: 40
    },
    {
        value: 'peanut',
        name: 'ถั่วลิสง (Peanut)',
        icon: '🥜',
        description: 'พืชน้ำมันสำคัญ ปลูกในดินร่วนซุย',
        category: 'legume',
        irrigationNeeds: 'medium',
        growthPeriod: 110,
        waterRequirement: 2.5,
        spacing: 25,
        yield: 500,
        price: 45,
        defaultPlantSpacing: 0.25,
        yieldPerPlant: 0.004,
        pricePerKg: 45
    },
    {
        value: 'black_gram',
        name: 'ถั่วดำ (Black Gram)',
        icon: '🫘',
        description: 'พืชตระกูลถั่วที่ทนแล้ง ปลูกได้ในฤดูแล้ง',
        category: 'legume',
        irrigationNeeds: 'low',
        growthPeriod: 70,
        waterRequirement: 1.5,
        spacing: 20,
        yield: 250,
        price: 50,
        defaultPlantSpacing: 0.2,
        yieldPerPlant: 0.003,
        pricePerKg: 50
    },

    // Industrial crops (พืชอุตสาหกรรม)
    {
        value: 'sugarcane',
        name: 'อ้อย (Sugarcane)',
        icon: '🎋',
        description: 'พืchหลักในการผลิตน้ำตาลและเอทานอล',
        category: 'industrial',
        irrigationNeeds: 'high',
        growthPeriod: 365,
        waterRequirement: 4.5,
        spacing: 50,
        yield: 15000,
        price: 1,
        defaultPlantSpacing: 0.5,
        yieldPerPlant: 0.04,
        pricePerKg: 1
    },
    {
        value: 'cotton',
        name: 'ฝ้าย (Cotton)',
        icon: '🌸',
        description: 'พืชใยธรรมชาติสำหรับอุตสาหกรรมสิ่งทอ',
        category: 'industrial',
        irrigationNeeds: 'medium',
        growthPeriod: 160,
        waterRequirement: 3.5,
        spacing: 45,
        yield: 180,
        price: 80,
        defaultPlantSpacing: 0.45,
        yieldPerPlant: 0.001,
        pricePerKg: 80
    },
    {
        value: 'rubber',
        name: 'ยางพารา (Rubber)',
        icon: '🌳',
        description: 'พืชยางธรรมชาติ เริ่มให้ผลผลิตหลังปลูก 6-7 ปี',
        category: 'industrial',
        irrigationNeeds: 'medium',
        growthPeriod: 2555, // 7 years
        waterRequirement: 8.0,
        spacing: 300,
        yield: 1800,
        price: 50,
        defaultPlantSpacing: 3.0,
        yieldPerPlant: 0.0007,
        pricePerKg: 50
    },
    {
        value: 'tobacco',
        name: 'ยาสูบ (Tobacco)',
        icon: '🚬',
        description: 'พืชอุตสาหกรรมสำหรับการผลิตผลิตภัณฑ์ยาสูบ',
        category: 'industrial',
        irrigationNeeds: 'medium',
        growthPeriod: 90,
        waterRequirement: 2.8,
        spacing: 60,
        yield: 800,
        price: 120,
        defaultPlantSpacing: 0.6,
        yieldPerPlant: 0.008,
        pricePerKg: 120
    },

    // Oil crops (พืชน้ำมัน)
    {
        value: 'oil_palm',
        name: 'ปาล์มน้ำมัน (Oil Palm)',
        icon: '🌴',
        description: 'พืชน้ำมันสำคัญของไทย เริ่มให้ผลหลังปลูก 3 ปี',
        category: 'oilseed',
        irrigationNeeds: 'high',
        growthPeriod: 1095, // 3 years to first harvest
        waterRequirement: 12.0,
        spacing: 900,
        yield: 3500,
        price: 4,
        defaultPlantSpacing: 9.0,
        yieldPerPlant: 0.03,
        pricePerKg: 4
    },
    {
        value: 'sesame',
        name: 'งา (Sesame)',
        icon: '🌱',
        description: 'พืชน้ำมันเมล็ดเล็ก ทนแล้งได้ดี',
        category: 'oilseed',
        irrigationNeeds: 'low',
        growthPeriod: 85,
        waterRequirement: 1.8,
        spacing: 15,
        yield: 200,
        price: 60,
        defaultPlantSpacing: 0.15,
        yieldPerPlant: 0.002,
        pricePerKg: 60
    },
    {
        value: 'sunflower',
        name: 'ทานตะวัน (Sunflower)',
        icon: '🌻',
        description: 'พืชน้ำมันดอกใหญ่ ทนแล้งและโรคได้ดี',
        category: 'oilseed',
        irrigationNeeds: 'low',
        growthPeriod: 85,
        waterRequirement: 2.5,
        spacing: 40,
        yield: 400,
        price: 35,
        defaultPlantSpacing: 0.4,
        yieldPerPlant: 0.004,
        pricePerKg: 35
    },
    {
        value: 'coconut',
        name: 'มะพร้าว (Coconut)',
        icon: '🥥',
        description: 'พืชน้ำมันยืนต้น ให้ผลผลิตตลอดปี',
        category: 'oilseed',
        irrigationNeeds: 'medium',
        growthPeriod: 1825, // 5 years
        waterRequirement: 10.0,
        spacing: 800,
        yield: 2000,
        price: 8,
        defaultPlantSpacing: 8.0,
        yieldPerPlant: 0.02,
        pricePerKg: 8
    }
];

// Export CROPS as well for backward compatibility
export const CROPS = cropTypes;

// Helper functions
export const getCropByValue = (value: string): Crop | undefined => {
    return cropTypes.find(crop => crop.value === value);
};

export const searchCrops = (query: string): Crop[] => {
    const searchTerm = query.toLowerCase();
    return cropTypes.filter(crop => 
        crop.name.toLowerCase().includes(searchTerm) ||
        crop.value.toLowerCase().includes(searchTerm) ||
        crop.description.toLowerCase().includes(searchTerm)
    );
};

export const getCropsByCategory = (category: string): Crop[] => {
    if (category === 'all') return cropTypes;
    return cropTypes.filter(crop => crop.category === category);
};

export const getCropsByIrrigationNeed = (need: 'low' | 'medium' | 'high'): Crop[] => {
    return cropTypes.filter(crop => crop.irrigationNeeds === need);
};

export const getPopularCrops = (): Crop[] => {
    const popularValues = ['rice', 'corn', 'cassava', 'sugarcane', 'soybean', 'oil_palm', 'rubber', 'peanut'];
    return popularValues.map(value => getCropByValue(value)).filter(Boolean) as Crop[];
};

// Irrigation calculation helpers
export const calculateWaterRequirement = (crop: Crop, plantCount: number): number => {
    return crop.waterRequirement * plantCount; // liters per day
};

export const calculatePlantSpacing = (crop: Crop, areaSquareMeters: number): number => {
    const spacingSquareMeters = (crop.spacing / 100) ** 2; // Convert cm to m
    return Math.floor(areaSquareMeters / spacingSquareMeters);
};

export const getIrrigationRecommendation = (crop: Crop): string => {
    switch (crop.irrigationNeeds) {
        case 'low':
            return 'รดน้ำ 2-3 ครั้งต่อสัปดาห์ หรือเมื่อดินแห้ง';
        case 'medium':
            return 'รดน้ำทุกวันหรือวันเว้นวัน รักษาความชื้นให้สม่ำเสมอ';
        case 'high':
            return 'รดน้ำทุกวัน รักษาความชื้นในดินให้สม่ำเสมอ';
        default:
            return 'ปฏิบัติตามแนวทางการรดน้ำมาตรฐาน';
    }
};

// Economic calculation helpers
export const calculateRevenue = (crop: Crop, areaInRai: number): number => {
    return crop.yield * crop.price * areaInRai;
};

export const calculateRevenuePerDay = (crop: Crop, areaInRai: number): number => {
    const totalRevenue = calculateRevenue(crop, areaInRai);
    return totalRevenue / crop.growthPeriod;
};

// Category configurations
export const categoryConfigs = [
    { value: 'all', name: 'ทั้งหมด', icon: '🌱' },
    { value: 'cereal', name: 'ธัญพืช', icon: '🌾' },
    { value: 'root', name: 'พืชหัว', icon: '🍠' },
    { value: 'legume', name: 'ถั่วต่างๆ', icon: '🫘' },
    { value: 'industrial', name: 'พืชอุตสาหกรรม', icon: '🏭' },
    { value: 'oilseed', name: 'พืชน้ำมัน', icon: '🌻' },
];

// Export default for easier importing
export default {
    cropTypes,
    CROPS,
    getCropByValue,
    searchCrops,
    getCropsByCategory,
    getCropsByIrrigationNeed,
    getPopularCrops,
    calculateWaterRequirement,
    calculatePlantSpacing,
    getIrrigationRecommendation,
    calculateRevenue,
    calculateRevenuePerDay,
    categoryConfigs
};