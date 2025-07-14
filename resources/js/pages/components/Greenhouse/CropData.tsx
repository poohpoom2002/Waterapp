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
    // พืชผัก (Vegetables)
    {
        value: 'tomato',
        name: 'มะเขือเทศ',
        nameEn: 'Tomato',
        description: 'ผลไม้ที่เป็นผักอเนกประสงค์ เหมาะสำหรับโรงเรือน',
        icon: '🍅',
        category: 'vegetables'
    },
    {
        value: 'bell-pepper',
        name: 'พริกหวาน',
        nameEn: 'Bell Pepper',
        description: 'พริกหวานหลากสี อุดมด้วยวิตามิน',
        icon: '🫑',
        category: 'vegetables'
    },
    {
        value: 'cucumber',
        name: 'แตงกวา',
        nameEn: 'Cucumber',
        description: 'ผักเปรี้ยว สดชื่น เหมาะปลูกในโรงเรือน',
        icon: '🥒',
        category: 'vegetables'
    },
    {
        value: 'melon',
        name: 'เมล่อน',
        nameEn: 'Melon',
        description: 'ผลไม้หวาน เนื้อนุ่ม ปลูกในโรงเรือนได้ดี',
        icon: '🍈',
        category: 'vegetables'
    },
    {
        value: 'lettuce',
        name: 'ผักกาดหอม',
        nameEn: 'Lettuce',
        description: 'ผักสลัดชนิดต่าง ๆ เช่น เรดโอ๊ค กรีนโอ๊ค',
        icon: '🥬',
        category: 'vegetables'
    },
    {
        value: 'kale',
        name: 'ผักเคล',
        nameEn: 'Kale',
        description: 'ผักใบเขียวเข้ม อุดมด้วยสารอาหาร',
        icon: '🥬',
        category: 'vegetables'
    },
    {
        value: 'pak-choi',
        name: 'ปวยเล้ง',
        nameEn: 'Pak Choi',
        description: 'ผักใบเขียวจีน เติบโตเร็ว',
        icon: '🥬',
        category: 'vegetables'
    },
    {
        value: 'chinese-kale',
        name: 'คะน้า',
        nameEn: 'Chinese Kale',
        description: 'ผักใบเขียวไทย เติบโตเร็ว',
        icon: '🥬',
        category: 'vegetables'
    },
    {
        value: 'cabbage',
        name: 'กะหล่ำปลี',
        nameEn: 'Cabbage',
        description: 'ผักหัวกะทัดรัด เหมาะสำหรับโรงเรือน',
        icon: '🥬',
        category: 'vegetables'
    },
    {
        value: 'cauliflower',
        name: 'กะหล่ำดอก',
        nameEn: 'Cauliflower',
        description: 'ผักดอกสีขาว อุดมด้วยวิตามิน',
        icon: '🥦',
        category: 'vegetables'
    },
    {
        value: 'broccoli',
        name: 'บรอกโคลี',
        nameEn: 'Broccoli',
        description: 'ผักดอกสีเขียว อุดมด้วยสารอาหาร',
        icon: '🥦',
        category: 'vegetables'
    },
    // ผลไม้ (Fruits)
    {
        value: 'strawberry',
        name: 'สตรอว์เบอร์รี',
        nameEn: 'Strawberry',
        description: 'ผลไม้หวานฉ่ำ เหมาะปลูกในโรงเรือน',
        icon: '🍓',
        category: 'fruits'
    },
    {
        value: 'seedless-grape',
        name: 'องุ่นไร้เมล็ด',
        nameEn: 'Seedless Grape',
        description: 'องุ่นหวานไร้เมล็ด คุณภาพพรีเมี่ยม',
        icon: '🍇',
        category: 'fruits'
    },
    {
        value: 'cantaloupe',
        name: 'แคนตาลูป',
        nameEn: 'Cantaloupe',
        description: 'เมล่อนเนื้อส้ม หวานหอม',
        icon: '🍈',
        category: 'fruits'
    },
    {
        value: 'japanese-melon',
        name: 'เมล่อนญี่ปุ่น',
        nameEn: 'Japanese Melon',
        description: 'เมล่อนพรีเมี่ยม เนื้อนุ่ม หวานเข้มข้น',
        icon: '🍈',
        category: 'fruits'
    }
];

// สำหรับโรงเรือนเท่านั้น - ตัดส่วนอื่นออก

// Categories definition (เฉพาะโรงเรือน)
export const categories: Record<string, Category> = {
    vegetables: { name: 'พืชผัก', nameEn: 'Vegetables', icon: '🥬' },
    fruits: { name: 'ผลไม้', nameEn: 'Fruits', icon: '🍓' }
};

// Helper functions (เฉพาะโรงเรือน)
export const getCropByValue = (value: string): Crop | undefined => {
    return greenhouseCrops.find(crop => crop.value === value);
};

export const searchCrops = (searchTerm: string): Crop[] => {
    const term = searchTerm.toLowerCase();
    return greenhouseCrops.filter(crop => 
        crop.name.toLowerCase().includes(term) ||
        crop.nameEn.toLowerCase().includes(term) ||
        crop.description.toLowerCase().includes(term)
    );
};

export const getCropsByCategory = (category: string): Crop[] => {
    return greenhouseCrops.filter(crop => crop.category === category);
};