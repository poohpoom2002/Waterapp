// Sprinkler.ts
export const SprinklerData = [
    {
        id: 1,
        productCode: '1-ECO-100',
        name: 'มินิสปริงเกอร์ 1/2"',
        size_mm: 20, // ขนาดหัวน้ำหยด มิลลิเมตร
        size_inch: 1 / 2, // ขนาดหัวน้ำหยด นิ้ว
        waterVolumeLitersPerHour: [60, 120], // [ต่ำสุด, สูงสุด] ลิตรต่อชั่วโมง
        radiusMeters: [0.5, 1.5], // [ต่ำสุด, สูงสุด]
        pressureBar: [0.5, 2], // [ต่ำสุด, สูงสุด]
        price: 1,
        brand: 'ไชโย',
        image: '/images/sprinkler/1-ECO-100.jpg',
    },
    {
        id: 2,
        productCode: '1-ECO-150',
        name: 'มินิสปริงเกอร์ 3/4"',
        size_mm: 25, // ขนาดหัวน้ำหยด มิลลิเมตร
        size_inch: 3 / 4, // ขนาดหัวน้ำหยด นิ้ว
        waterVolumeLitersPerHour: [120, 240], // [ต่ำสุด, สูงสุด]
        radiusMeters: [0.5, 1.5], // [ต่ำสุด, สูงสุด]
        pressureBar: [0.5, 2], // [ต่ำสุด, สูงสุด]
        price: 2,
        brand: 'แชมป์',
        image: '/images/sprinkler/1-ECO-150.jpg',
    },
    {
        id: 3,
        productCode: '1-ECO-200',
        name: 'หัวฉีดด้านเดียว',
        size_mm: 25, // ขนาดหัวน้ำหยด มิลลิเมตร
        size_inch: 0.5, // ขนาดหัวน้ำหยด นิ้ว
        waterVolumeLitersPerHour: [240, 480], // [ต่ำสุด, สูงสุด]
        radiusMeters: 4.5, // รัศมีการฉีดน้ำ เมตร
        pressureBar: [0.5, 3], // [ต่ำสุด, สูงสุด] บาร์
        price: 3,
        brand: 'ไชโย',
        image: '/images/sprinkler/1-ECO-200.jpg',
    },
    {
        id: 4,
        productCode: '1-ECO-250',
        name: 'หัวฉีดสเปรย์ ปีกผีเสื้อ',
        size_mm: 7, // ขนาดหัวน้ำหยด มิลลิเมตร
        size_inch: null, // ขนาดหัวน้ำหยด นิ้ว
        waterVolumeLitersPerHour: [360, 720], // [ต่ำสุด, สูงสุด]
        radiusMeters: [0.5, 1], // รัศมีการฉีดน้ำ เมตร ต่ำสุด 0.5 ม. สูงสุด 1 ม.
        pressureBar: [0.5, 2], // [ต่ำสุด, สูงสุด] บาร์
        price: 3,
        brand: 'แชมป์',
        image: '/images/sprinkler/1-ECO-250.jpg',
    },

    {
        id: 54,
        productCode: '300',
        name: 'สปริงเกอร์ ใบหมุน2ชั้น เกลียวใน 3/4x1/2"',
        size_mm: 32, // ขนาดหัวน้ำหยด มิลลิเมตร
        size_inch: 1, // ขนาดหัวน้ำหยด นิ้ว
        waterVolumeLitersPerHour: [100, 900], // [ต่ำสุด, สูงสุด] ลิตรต่อชั่วโมง
        radiusMeters: [4, 5], // [ต่ำสุด, สูงสุด] เมตร
        pressureBar: [0.5, 3], // [ต่ำสุด, สูงสุด] บาร์
        price: 9,
        brand: 'ไชโย',
        image: '/images/sprinkler/300.jpg',
    },
    {
        id: 55,
        productCode: '300B',
        name: 'สปริงเกอร์ ใบหมุน2ชั้น เกลียวใน 3/4x1/2"',
        size_mm: 32, // ขนาดหัวน้ำหยด มิลลิเมตร
        size_inch: 1, // ขนาดหัวน้ำหยด นิ้ว
        waterVolumeLitersPerHour: [200, 900], // [ต่ำสุด, สูงสุด]
        radiusMeters: [4, 5], // [ต่ำสุด, สูงสุด]
        pressureBar: [0.5, 3], // [ต่ำสุด, สูงสุด]
        price: 10,
        brand: 'ไชโย',
        image: '/images/sprinkler/300B.jpg',
    },
    {
        id: 56,
        productCode: '300B-C1',
        name: 'สปริงเกอร์ ใบหมุน2ชั้น หมุนรอบตัว+ฝาครอบ 1/2"',
        size_mm: 32, // ขนาดหัวน้ำหยด มิลลิเมตร
        size_inch: 1, // ขนาดหัวน้ำหยด นิ้ว
        waterVolumeLitersPerHour: [300, 900], // [ต่ำสุด, สูงสุด]
        radiusMeters: [4, 5], // [ต่ำสุด, สูงสุด]
        pressureBar: [0.5, 3], // [ต่ำสุด, สูงสุด]
        price: 11,
        brand: 'ไชโย',
        image: '/images/sprinkler/300B-C1.jpg',
    },
    {
        id: 66,
        productCode: '301A-V2',
        name: 'สปริงเกอร์ ใบหมุนรอบตัว+วาล์ว PVC 3/4"',
        waterVolumeLitersPerHour: [1400, 3000], // [ต่ำสุด, สูงสุด]
        radiusMeters: [4, 5], // [ต่ำสุด, สูงสุด]
        pressureBar: [0.5, 3], // [ต่ำสุด, สูงสุด]
        price: 21,
        brand: 'ไชโย',
        image: '/images/sprinkler/301A-V2.jpg',
    },
    {
        id: 67,
        productCode: '301A-V2-CP',
        name: 'สปริงเกอร์ ใบหมุนรอบตัว+วาล์ว PVC 3/4"',
        size_mm: 32, // ขนาดหัวน้ำหยด มิลลิเมตร
        size_inch: 1, // ขนาดหัวน้ำหยด นิ้ว
        waterVolumeLitersPerHour: [1500, 3000], // [ต่ำสุด, สูงสุด]
        radiusMeters: [4, 5], // [ต่ำสุด, สูงสุด]
        pressureBar: [0.5, 3], // [ต่ำสุด, สูงสุด]
        price: 22,
        brand: 'แชมป์',
        image: '/images/sprinkler/301A-V2-CP.jpg',
    },
    {
        id: 68,
        productCode: null,
        name: null,
        size_mm: null, // ขนาดหัวน้ำหยด มิลลิเมตร
        size_inch: null, // ขนาดหัวน้ำหยด นิ้ว
        waterVolumeLitersPerHour: null, // [ต่ำสุด, สูงสุด]
        radiusMeters: null, // [ต่ำสุด, สูงสุด]
        pressureBar: null, // [ต่ำสุด, สูงสุด]
        price: null,
        brand: null,
        image: null,
    },
];
