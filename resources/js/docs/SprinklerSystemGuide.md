# 🚿 คู่มือระบบหัวฉีดน้ำ

## ภาพรวมของระบบ

ระบบหัวฉีดน้ำใหม่ได้ถูกพัฒนาขึ้นเพื่อเพิ่มฟีเจอร์การคำนวณปริมาณน้ำที่แม่นยำมากขึ้น โดยนำข้อมูลคุณสมบัติของหัวฉีดมาคำนวณร่วมกับจำนวนต้นไม้เพื่อได้ **Q รวม** (อัตราการไหลรวมทั้งหมด)

## ✨ ฟีเจอร์หลัก

### 1. Popup กรอกข้อมูลหัวฉีด

- แสดงหลังจากสร้างต้นไม้อัตโนมัติเสร็จ
- กรอกข้อมูล 3 ค่าหลัก:
    - **อัตราการไหลต่อนาที** (ลิตร/นาที/ต้น)
    - **แรงดันน้ำ** (บาร์)
    - **รัศมีหัวฉีด** (เมตร)

### 2. การจัดเก็บข้อมูล

- บันทึกข้อมูลใน `localStorage`
- โหลดค่าเก่าได้เมื่อเปิดใหม่
- มีค่าเริ่มต้นที่เหมาะสม

### 3. การคำนวณ Q รวม

- **Q รวมต่อนาที** = จำนวนต้นไม้ × อัตราการไหลต่อต้น
- แสดงผลใน format ที่อ่านง่าย
- คำนวณทั้งต่อนาทีและต่อชั่วโมง

### 4. การแสดงผลในสถิติ

- รวมข้อมูล Q ทั้งหมดในรายงานสถิติ
- แสดงในหน้าต่างๆ ที่มีการแสดงปริมาณน้ำ
- ฟอร์แมตเป็นหน่วยที่เหมาะสม

## 📁 โครงสร้างไฟล์

```
resources/js/
├── utils/
│   └── sprinklerUtils.ts          # ฟังก์ชันหลักระบบหัวฉีด
├── components/horticulture/
│   └── SprinklerConfigModal.tsx   # Modal กรอกข้อมูล
├── pages/
│   └── HorticulturePlannerPage.tsx # หน้าหลัก (เพิ่ม logic)
└── utils/
    └── horticultureProjectStats.ts # อัปเดตสถิติ
```

## 🔧 การใช้งาน

### 1. การสร้างต้นไม้และกรอกข้อมูลหัวฉีด

```typescript
// เมื่อสร้างต้นไม้เสร็จ
const handleGeneratePlants = () => {
    // ... การสร้างต้นไม้ ...

    // แสดง popup กรอกข้อมูลหัวฉีด
    setShowSprinklerConfigModal(true);
};
```

### 2. การจัดการข้อมูลหัวฉีด

```typescript
import {
    SprinklerConfig,
    saveSprinklerConfig,
    loadSprinklerConfig,
    calculateTotalFlowRate,
} from './sprinklerUtils';

// บันทึกข้อมูล
const config = {
    flowRatePerMinute: 2.5,
    pressureBar: 2.0,
    radiusMeters: 1.5,
};
saveSprinklerConfig(config);

// โหลดข้อมูล
const loadedConfig = loadSprinklerConfig();

// คำนวณ Q รวม
const totalFlow = calculateTotalFlowRate(plantCount, flowRate);
```

### 3. การแสดงผลในสถิติ

```typescript
import { getOverallStats } from './horticultureProjectStats';

const stats = getOverallStats();
if (stats?.sprinklerFlowRate) {
    console.log('Q รวม:', stats.sprinklerFlowRate.formattedFlowRatePerMinute);
    console.log('แรงดัน:', stats.sprinklerFlowRate.pressureBar, 'บาร์');
}
```

## 📊 การคำนวณและสูตร

### Q รวม (อัตราการไหลรวม)

```
Q รวมต่อนาที = จำนวนต้นไม้ × อัตราการไหลต่อต้น (ลิตร/นาที)
Q รวมต่อชั่วโมง = Q รวมต่อนาที × 60 (ลิตร/ชั่วโมง)
```

### พื้นที่ครอบคลุมของหัวฉีด

```
พื้นที่ = π × รัศมี² (ตร.ม.)
```

### ปริมาณน้ำต่อวัน

```
น้ำต่อวัน = Q รวมต่อชั่วโมง × จำนวนชั่วโมงการให้น้ำ (ลิตร/วัน)
```

## ⚙️ ค่าเริ่มต้นและการตั้งค่า

### ค่าเริ่มต้น

```typescript
DEFAULT_SPRINKLER_CONFIG = {
    flowRatePerMinute: 2.5, // ลิตร/นาที
    pressureBar: 2.0, // บาร์
    radiusMeters: 1.5, // เมตร
};
```

### การตรวจสอบความถูกต้อง

- **อัตราการไหล**: 0.1 - 1000 ลิตร/นาที
- **แรงดัน**: 0.1 - 50 บาร์
- **รัศมี**: 0.1 - 100 เมตร

## 🎯 ตัวอย่างการใช้งาน

### สวนผักครัวเรือน (25 ต้น)

```
อัตราการไหล: 2.5 ลิตร/นาที/ต้น
Q รวม: 62.5 ลิตร/นาที (3,750 ลิตร/ชั่วโมง)
น้ำต่อวัน (2 ชม.): 7,500 ลิตร/วัน
```

### สวนพาณิชย์ (500 ต้น)

```
อัตราการไหล: 2.5 ลิตร/นาที/ต้น
Q รวม: 1,250 ลิตร/นาที (75,000 ลิตร/ชั่วโมง)
น้ำต่อวัน (2 ชม.): 150,000 ลิตร/วัน
```

## 🧪 การทดสอบ

### รันการทดสอบแบบครบวงจร

```javascript
// ใน browser console
sprinklerTests.runAllTests();
```

### รันการทดสอบแยกส่วน

```javascript
// ทดสอบพื้นฐาน
sprinklerTests.sprinklerSystemExample();

// ทดสอบการทำงานร่วมกับสถิติ
sprinklerTests.testStatsIntegration();

// ทดสอบ edge cases
sprinklerTests.testEdgeCases();

// สาธิตระบบ
sprinklerTests.demonstrateFullSystem();
```

## 📈 การแสดงผลในสถิติ

ข้อมูลหัวฉีดจะแสดงในส่วนต่างๆ ดังนี้:

### 1. รายงานสถิติหลัก

- Q รวมต่อนาที และต่อชั่วโมง
- อัตราการไหลต่อต้น
- แรงดันและรัศมีหัวฉีด

### 2. หน้า Dashboard

- แสดง Q ทั้งหมดในส่วนสรุป
- เปรียบเทียบกับปริมาณน้ำแบบเก่า

### 3. การส่งออกข้อมูล

- รวมใน JSON/CSV export
- รวมใน PDF report

## 🔄 Workflow การทำงาน

1. **สร้างต้นไม้อัตโนมัติ** → ระบบนับจำนวนต้นไม้
2. **แสดง Popup** → ผู้ใช้กรอกข้อมูลหัวฉีด
3. **บันทึกข้อมูล** → เก็บใน localStorage
4. **คำนวณ Q รวม** → จำนวนต้น × อัตราการไหลต่อต้น
5. **แสดงผลในสถิติ** → รวมข้อมูลในทุกส่วนที่แสดงปริมาณน้ำ

## 🐛 การ Debug

### เช็คข้อมูลใน localStorage

```javascript
console.log('Sprinkler Config:', JSON.parse(localStorage.getItem('sprinklerConfig') || 'null'));
```

### เช็คสถิติปัจจุบัน

```javascript
import { getOverallStats } from './horticultureProjectStats';
console.log('Overall Stats:', getOverallStats());
```

### ล้างข้อมูล

```javascript
import { clearSprinklerConfig } from './sprinklerUtils';
clearSprinklerConfig();
```

## 🚀 การพัฒนาต่อยอด

### ฟีเจอร์ที่อาจเพิ่มในอนาคต

1. **การตั้งค่าหัวฉีดแยกตาม Zone**
2. **การคำนวณแรงดันตามระยะทาง**
3. **การแนะนำชนิดหัวฉีดตามพืช**
4. **การประมาณการค่าไฟฟ้าปั๊มน้ำ**
5. **การเชื่อมต่อกับ IoT sensors**

### การปรับแต่งเพิ่มเติม

- เพิ่ม validation rules ตามมาตรฐานอุตสาหกรรม
- สร้าง preset สำหรับพืชประเภทต่างๆ
- เพิ่มการคำนวณ pressure loss ในระบบท่อ
- รองรับหัวฉีดหลายแบบในโครงการเดียว

---

🔗 **ไฟล์ที่เกี่ยวข้อง:**

- `sprinklerUtils.ts` - ฟังก์ชันหลัก
- `SprinklerConfigModal.tsx` - UI Component
- `sprinklerSystemExample.ts` - ตัวอย่างและการทดสอบ
- `horticultureProjectStats.ts` - การรวมกับสถิติ
