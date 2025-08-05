// resources/js/utils/cropDataTranslations.ts

export interface CropTranslations {
    [key: string]: {
        name: string;
        description: string;
    };
}

export const cropTranslations = {
    en: {
        // Cereals
        rice: {
            name: 'Rice',
            description: "Thailand's main crop, grown in paddy fields. Requires a lot of water, especially during tillering and booting stages."
        },
        corn: {
            name: 'Field Corn',
            description: 'An important economic field crop used in the animal feed industry.'
        },
        sorghum: {
            name: 'Sorghum',
            description: 'A drought-tolerant cereal crop suitable for arid areas, used for animal and human consumption.'
        },

        // Root crops
        cassava: {
            name: 'Cassava',
            description: 'A major economic root crop, very drought-tolerant, used in starch and energy industries.'
        },
        sweet_potato: {
            name: 'Sweet Potato',
            description: 'A highly nutritious root crop with both domestic and international market demand.'
        },

        // Legumes
        soybean: {
            name: 'Soybean',
            description: 'A high-protein, soil-improving crop that requires care during flowering and podding.'
        },
        mung_bean: {
            name: 'Mung Bean',
            description: 'A short-lived crop that uses little water, popular for planting after rice.'
        },
        peanut: {
            name: 'Peanut',
            description: 'An oil and protein crop grown in loamy soil, requiring consistent water during pod formation.'
        },

        // Industrial crops
        sugarcane: {
            name: 'Sugarcane',
            description: 'The main crop for the sugar and ethanol industries.'
        },
        rubber: {
            name: 'Rubber',
            description: 'A long-term economic crop. Tapping can begin about 7 years after planting.'
        },

        // Oilseed crops
        oil_palm: {
            name: 'Oil Palm',
            description: 'The oilseed crop with the highest yield per rai. Begins to bear fruit 3 years after planting.'
        },
        sunflower: {
            name: 'Sunflower',
            description: 'A short-lived, drought-tolerant oilseed crop grown for supplemental income and tourism.'
        },
    },
    th: {
        // พืชธัญพืช
        rice: {
            name: 'ข้าว',
            description: 'พืชหลักของประเทศไทย ปลูกในไร่นา ต้องการน้ำมาก โดยเฉพาะช่วงแตกกอและออกรวง'
        },
        corn: {
            name: 'ข้าวโพดไร่',
            description: 'พืชเศรษฐกิจสำคัญที่ใช้ในอุตสาหกรรมอาหารสัตว์'
        },
        sorghum: {
            name: 'ข้าวฟ่าง',
            description: 'พืชธัญพืชทนแล้งที่เหมาะสำหรับพื้นที่แห้งแล้ง ใช้เป็นอาหารสัตว์และอาหารคน'
        },

        // พืชหัว
        cassava: {
            name: 'มันสำปะหลัง',
            description: 'พืชเศรษฐกิจหลักประเภทพืชหัว ทนแล้งดีมาก ใช้ในอุตสาหกรรมแป้งและพลังงาน'
        },
        sweet_potato: {
            name: 'มันเทศ',
            description: 'พืชหัวที่มีคุณค่าทางโภชนาการสูง มีตลาดทั้งในและต่างประเทศ'
        },

        // พืชตระกูลถั่ว
        soybean: {
            name: 'ถั่วเหลือง',
            description: 'พืชให้โปรตีนสูงและปรับปรุงดิน ต้องระวังการให้น้ำในช่วงออกดอกและติดฝัก'
        },
        mung_bean: {
            name: 'ถั่วเขียว',
            description: 'พืชอายุสั้น ใช้น้ำน้อย นิยมปลูกหลังข้าว'
        },
        peanut: {
            name: 'ถั่วลิสง',
            description: 'พืชให้น้ำมันและโปรตีน ปลูกในดินร่วน ต้องการน้ำสม่ำเสมอในช่วงก่อตัวของฝัก'
        },

        // พืชอุตสาหกรรม
        sugarcane: {
            name: 'อ้อย',
            description: 'พืชหลักของอุตสาหกรรมน้ำตาลและเอทานอล'
        },
        rubber: {
            name: 'ยางพารา',
            description: 'พืชเศรษฐกิจระยะยาว เริ่มกรีดได้ประมาณ 7 ปีหลังปลูก'
        },

        // พืชน้ำมัน
        oil_palm: {
            name: 'ปาล์มน้ำมัน',
            description: 'พืชน้ำมันที่ให้ผลผลิตสูงสุดต่อไร่ เริ่มให้ผลผลิตปีที่ 3 หลังปลูก'
        },
        sunflower: {
            name: 'ทานตะวัน',
            description: 'พืชน้ำมันอายุสั้น ทนแล้ง ปลูกเป็นรายได้เสริมและท่องเที่ยว'
        },
    }
} as const;

// Category translations
export const categoryTranslations = {
    en: {
        cereal: 'Cereals',
        root: 'Root Crops',
        legume: 'Legumes',
        industrial: 'Industrial Crops',
        oilseed: 'Oilseed Crops'
    },
    th: {
        cereal: 'พืชธัญพืช',
        root: 'พืชหัว',
        legume: 'พืชตระกูลถั่ว',
        industrial: 'พืชอุตสาหกรรม',
        oilseed: 'พืชน้ำมัน'
    }
} as const;

// Irrigation needs translations
export const irrigationNeedsTranslations = {
    en: {
        low: 'Low',
        medium: 'Medium',
        high: 'High'
    },
    th: {
        low: 'น้อย',
        medium: 'ปานกลาง',
        high: 'มาก'
    }
} as const;