// resources/js/contexts/translations/cropts.ts

export interface CropTranslations {
    [key: string]: {
        name: string;
        description: string;
    };
}

export const cropTranslations = {
    en: {
        // Cereals
        corn: {
            name: 'Corn',
            description: 'An important economic field crop used in the animal feed industry.'
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
        taro: {
            name: 'Taro',
            description: 'A nutritious root vegetable that grows well in wet conditions and is popular in Thai cuisine.'
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
        pineapple: {
            name: 'Pineapple',
            description: 'A tropical fruit crop with high economic value, suitable for both fresh consumption and processing.'
        },
        rubber: {
            name: 'Rubber',
            description: 'A long-term economic crop. Tapping can begin about 7 years after planting.'
        },
        asparagus: {
            name: 'Asparagus',
            description: 'A high-value perennial vegetable crop popular in export markets and fine dining.'
        },
        chili: {
            name: 'Chili Pepper',
            description: 'A spicy vegetable crop essential in Thai cuisine with high market demand both fresh and dried.'
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
        corn: {
            name: 'ข้าวโพด',
            description: 'พืชเศรษฐกิจสำคัญที่ใช้ในอุตสาหกรรมอาหารสัตว์'
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
        taro: {
            name: 'เผือก',
            description: 'พืชหัวที่มีคุณค่าทางโภชนาการ เจริญเติบโตได้ดีในที่ชื้น เป็นส่วนผสมสำคัญในอาหารไทย'
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
        pineapple: {
            name: 'สับปะรด',
            description: 'พืชผลที่มีคุณค่าทางเศรษฐกิจสูง เหมาะสำหรับการบริโภคตรงและการประกอบอาหาร'
        },
        rubber: {
            name: 'ยางพารา',
            description: 'พืชเศรษฐกิจระยะยาว เริ่มกรีดได้ประมาณ 7 ปีหลังปลูก'
        },
        asparagus: {
            name: 'หน่อไม้ฝรั่ง',
            description: 'พืชผักยืนต้นมูลค่าสูง เป็นที่นิยมในตลาดส่งออกและร้านอาหารหรู'
        },
        chili: {
            name: 'พริก',
            description: 'พืชผักเผ็ดที่จำเป็นในอาหารไทย มีความต้องการในตลาดสูงทั้งสดและแห้ง'
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
