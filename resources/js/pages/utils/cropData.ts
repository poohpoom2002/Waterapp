// resources/js/utils/cropData.ts

export interface Crop {
    value: string;
    name: string;
    icon: string;
    description: string;
    category: 'cereal' | 'root' | 'legume' | 'industrial' | 'oilseed';
    irrigationNeeds: 'low' | 'medium' | 'high';
    growthPeriod: number; // ระยะเวลาที่ใช้ในการเติบโตตั้งแต่เริ่มปลูกจนโตเต็มที่ (วัน)
    waterRequirement: number; // ปริมาณน้ำที่ต้องการ (ลิตร/ต้น/วัน) - เป็นค่าประมาณการ
    rowSpacing: number; // ระยะห่างระหว่างแถวปลูก (ซม.)
    plantSpacing: number; // ระยะห่างระหว่างต้นในแถวเดียวกัน (ซม.)
    yield: number; // ผลผลิตที่คาดว่าจะได้ (กก./ไร่)
    price: number; // ราคา (บาท/กก.)
}

export const cropTypes: Crop[] = [
    // Cereals (ธัญพืช)
    {
        value: 'rice',
        name: 'ข้าว (Rice)',
        icon: '🌾',
        description: 'พืชหลักของไทย ปลูกในนาข้าว ต้องการน้ำมาก โดยเฉพาะช่วงแตกกอและตั้งท้อง',
        category: 'cereal',
        irrigationNeeds: 'high',
        growthPeriod: 120, // พันธุ์ส่วนใหญ่มีอายุเก็บเกี่ยวประมาณ 120 วัน
        waterRequirement: 4.2, // ประมาณการจาก 1,600 ลบ.ม./ไร่ และความหนาแน่น 16 ต้น/ตร.ม.
        rowSpacing: 25,
        plantSpacing: 25,
        yield: 650, // ผลผลิตเฉลี่ยข้าวนาปรัง
        price: 12, // ราคาข้าวเปลือกเจ้าความชื้น 15% (อาจผันผวน)
    },
    {
        value: 'corn',
        name: 'ข้าวโพดเลี้ยงสัตว์ (Field Corn)',
        icon: '🌽',
        description: 'พืชไร่เศรษฐกิจสำคัญ ใช้ในอุตสาหกรรมอาหารสัตว์',
        category: 'cereal',
        irrigationNeeds: 'medium',
        growthPeriod: 115, // ตั้งแต่ปลูกจนถึงเก็บเกี่ยวฝักแก่
        waterRequirement: 2.5, // ประมาณการจาก 800-1,200 ลบ.ม./ไร่ และความหนาแน่น 8,500 ต้น/ไร่
        rowSpacing: 75,
        plantSpacing: 25,
        yield: 750, // ผลผลิตเฉลี่ยของประเทศ
        price: 9.5, // ราคา ณ ไร่นา (อาจผันผวน)
    },
    {
        value: 'sorghum',
        name: 'ข้าวฟ่าง (Sorghum)',
        icon: '🌾',
        description: 'พืชธัญพืชทนแล้ง เหมาะกับพื้นที่แห้งแล้ง ใช้เป็นอาหารสัตว์และมนุษย์',
        category: 'cereal',
        irrigationNeeds: 'low',
        growthPeriod: 110,
        waterRequirement: 1.8, // ทนแล้งและต้องการน้ำน้อยกว่าข้าวโพด
        rowSpacing: 60,
        plantSpacing: 10,
        yield: 450,
        price: 8,
    },

    // Root crops (พืชหัว)
    {
        value: 'cassava',
        name: 'มันสำปะหลัง (Cassava)',
        icon: '🍠',
        description: 'พืชหัวเศรษฐกิจหลัก ทนแล้งได้ดีมาก ใช้ในอุตสาหกรรมแป้งและพลังงาน',
        category: 'root',
        irrigationNeeds: 'low',
        growthPeriod: 300, // อายุเก็บเกี่ยว 8-12 เดือน
        waterRequirement: 1.5, // เป็นพืชที่ทนแล้งสูงมาก
        rowSpacing: 100,
        plantSpacing: 80,
        yield: 3500, // ผลผลิตเฉลี่ยหัวสด
        price: 3.0, // ราคาเชื้อแป้ง 25% (อาจผันผวน)
    },
    {
        value: 'sweet_potato',
        name: 'มันเทศ (Sweet Potato)',
        icon: '🍠',
        description: 'พืชหัวมีคุณค่าทางโภชนาการสูง ตลาดต้องการทั้งในและต่างประเทศ',
        category: 'root',
        irrigationNeeds: 'medium',
        growthPeriod: 110,
        waterRequirement: 2.0,
        rowSpacing: 80,
        plantSpacing: 30,
        yield: 2000,
        price: 15,
    },

    // Legumes (พืชตระกูลถั่ว)
    {
        value: 'soybean',
        name: 'ถั่วเหลือง (Soybean)',
        icon: '🫘',
        description: 'พืชโปรตีนสูง ปรับปรุงดิน ต้องการการดูแลช่วงออกดอกและติดฝัก',
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
        name: 'ถั่วเขียว (Mung Bean)',
        icon: '🫘',
        description: 'พืชอายุสั้น ใช้น้ำน้อย นิยมปลูกหลังทำนา',
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
        name: 'ถั่วลิสง (Peanut)',
        icon: '🥜',
        description: 'พืชน้ำมันและโปรตีน ปลูกในดินร่วนซุย ต้องการน้ำสม่ำเสมอช่วงสร้างฝัก',
        category: 'legume',
        irrigationNeeds: 'medium',
        growthPeriod: 100,
        waterRequirement: 2.2,
        rowSpacing: 50,
        plantSpacing: 20,
        yield: 350,
        price: 22,
    },

    // Industrial crops (พืชอุตสาหกรรม)
    {
        value: 'sugarcane',
        name: 'อ้อย (Sugarcane)',
        icon: '🎋',
        description: 'พืชหลักสำหรับอุตสาหกรรมน้ำตาลและเอทานอล',
        category: 'industrial',
        irrigationNeeds: 'high',
        growthPeriod: 365, // อายุเก็บเกี่ยว 10-14 เดือน
        waterRequirement: 3.5, // ต้องการน้ำมาก โดยเฉพาะช่วงย่างปล้อง
        rowSpacing: 150,
        plantSpacing: 50, // ปลูกเป็นท่อน
        yield: 12000, // ผลผลิตเฉลี่ยอ้อยสด
        price: 1.2, // ราคา ณ หน้าโรงงาน (บาท/กก. หรือ 1,200 บาท/ตัน)
    },
    {
        value: 'rubber',
        name: 'ยางพารา (Rubber)',
        icon: '🌳',
        description: 'พืชเศรษฐกิจระยะยาว กรีดยางได้หลังปลูกประมาณ 7 ปี',
        category: 'industrial',
        irrigationNeeds: 'medium',
        growthPeriod: 2555, // 7 ปีก่อนเริ่มกรีด
        waterRequirement: 10.0, // ต้องการความชื้นสูงและสม่ำเสมอ
        rowSpacing: 700,
        plantSpacing: 300,
        yield: 280, // ผลผลิตน้ำยางแห้งเฉลี่ยต่อปี
        price: 25, // ราคาน้ำยางสด (อาจผันผวน)
    },

    // Oilseed crops (พืชน้ำมัน)
    {
        value: 'oil_palm',
        name: 'ปาล์มน้ำมัน (Oil Palm)',
        icon: '🌴',
        description: 'พืชน้ำมันที่ให้ผลผลิตต่อไร่สูงที่สุด เริ่มให้ผลหลังปลูก 3 ปี',
        category: 'oilseed',
        irrigationNeeds: 'high',
        growthPeriod: 1095, // ~3 ปีก่อนเริ่มเก็บเกี่ยว
        waterRequirement: 15.0, // ต้องการน้ำมากและสม่ำเสมอตลอดปี
        rowSpacing: 900,
        plantSpacing: 900, // ปลูกแบบสามเหลี่ยมด้านเท่า
        yield: 3000, // ผลผลิตทะลายปาล์มสด
        price: 5.5, // ราคาผลปาล์มดิบ (อาจผันผวน)
    },
    {
        value: 'sunflower',
        name: 'ทานตะวัน (Sunflower)',
        icon: '🌻',
        description: 'พืชน้ำมันอายุสั้น ทนแล้ง ปลูกเสริมรายได้และส่งเสริมการท่องเที่ยว',
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
    return cropTypes.find(crop => crop.value === value);
}

// Search crops by name or description (case-insensitive)
export function searchCrops(term: string): Crop[] {
    const lower = term.toLowerCase();
    return cropTypes.filter(
        crop =>
            crop.name.toLowerCase().includes(lower) ||
            crop.description.toLowerCase().includes(lower)
    );
}