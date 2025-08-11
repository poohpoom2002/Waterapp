# ฟีเจอร์ Snap ขอบโซนเข้ากับขอบพื้นที่หลัก (ปรับปรุงแล้ว)

## ภาพรวม

ฟีเจอร์นี้จะช่วยให้การวาดโซนในพื้นที่หลักมีความแม่นยำมากขึ้น โดยเมื่อวาดโซนใกล้ขอบของพื้นที่หลัก ระบบจะ snap ขอบโซนเข้ากับขอบพื้นที่หลักอัตโนมัติ

## การปรับปรุงล่าสุด

### 🎯 Advanced Snap Algorithm
- **ลดระยะ Snap Threshold**: จาก 10 เมตร เป็น 5 เมตร เพื่อความแม่นยำมากขึ้น
- **เส้นขอบหลัก**: ระบบจะหาเส้นขอบที่ยาวที่สุดของพื้นที่หลักและให้ความสำคัญมากกว่า
- **Threshold แบบสองชั้น**: 
  - 3 เมตร สำหรับเส้นขอบหลัก (ความแม่นยำสูง)
  - 5 เมตร สำหรับเส้นขอบอื่นๆ (ความแม่นยำปานกลาง)

### 📊 Enhanced Logging
- แสดงรายละเอียดการ snap ใน console
- แสดงจำนวนจุดที่ถูก snap
- แสดงระยะทางที่ snap

### 🎨 Visual Feedback
- แสดง notification เมื่อ snap สำเร็จ
- Log ข้อมูลการ snap แบบละเอียด

## วิธีการทำงาน

### 1. การตรวจจับระยะทาง
- ระบบจะคำนวณระยะทางระหว่างจุดของโซนกับเส้นขอบของพื้นที่หลัก
- ใช้ระยะ snap threshold แบบสองชั้น: 3 เมตรสำหรับเส้นขอบหลัก, 5 เมตรสำหรับเส้นขอบอื่นๆ
- ถ้าจุดของโซนอยู่ใกล้ขอบพื้นที่หลักมากกว่าระยะ threshold จะทำการ snap

### 2. การ Snap แบบ Advanced
- หาเส้นขอบที่ยาวที่สุดของพื้นที่หลัก
- ให้ความสำคัญกับเส้นขอบหลักมากกว่า
- Snap ด้วยความแม่นยำที่แตกต่างกันตามประเภทของเส้นขอบ

### 3. การประมวลผล
- ทำงานทั้งใน HorticultureDrawingManager และ HorticulturePlannerPage
- Snap เกิดขึ้นทั้งตอนวาดและตอนประมวลผลข้อมูล
- แสดง visual feedback เมื่อ snap สำเร็จ

## ไฟล์ที่เกี่ยวข้อง

### 1. `resources/js/components/horticulture/HorticultureDrawingManager.tsx`
- เพิ่มฟังก์ชัน `snapPointToMainAreaBoundary()` (ปรับปรุงแล้ว)
- เพิ่มฟังก์ชัน `findClosestPointOnLineSegment()`
- เพิ่มฟังก์ชัน `snapCoordinatesToMainArea()` (ปรับปรุงแล้ว)
- เพิ่มฟังก์ชัน `advancedSnapToMainArea()` (ใหม่)
- ปรับปรุงการทำงานของ DrawingManager ให้ใช้ advanced snap

### 2. `resources/js/pages/HorticulturePlannerPage.tsx`
- เพิ่มฟังก์ชัน snap เหมือนกับใน DrawingManager
- ปรับปรุงฟังก์ชัน `handleDrawingComplete()` ให้ใช้ advanced snap
- เพิ่ม mainArea prop ให้กับ HorticultureDrawingManager

## ฟังก์ชันหลัก

### `snapPointToMainAreaBoundary(point, mainArea, snapThreshold)`
- รับจุดที่ต้องการ snap และข้อมูลพื้นที่หลัก
- คืนค่าจุดที่ถูก snap แล้ว
- แสดง log รายละเอียดการ snap

### `findClosestPointOnLineSegment(point, lineStart, lineEnd)`
- หาจุดที่ใกล้ที่สุดบนเส้นตรง
- ใช้สูตรทางคณิตศาสตร์เพื่อหาจุดที่ใกล้ที่สุด

### `snapCoordinatesToMainArea(coordinates, mainArea)`
- Snap coordinates ทั้งหมด
- แสดงจำนวนจุดที่ถูก snap

### `advancedSnapToMainArea(coordinates, mainArea)` (ใหม่)
- Snap แบบ advanced ที่มีความแม่นยำมากขึ้น
- ให้ความสำคัญกับเส้นขอบหลัก
- แสดง visual feedback

## การใช้งาน

1. วาดพื้นที่หลักก่อน
2. เลือกโหมดวาดโซน
3. วาดโซนใกล้ขอบพื้นที่หลัก
4. ระบบจะ snap ขอบโซนเข้ากับขอบพื้นที่หลักอัตโนมัติ
5. ตรวจสอบ console log เพื่อดูรายละเอียดการ snap

## ข้อดีของการปรับปรุง

- **ความแม่นยำมากขึ้น**: ลดระยะ snap threshold และใช้ algorithm แบบ advanced
- **เส้นขอบหลัก**: ให้ความสำคัญกับเส้นขอบที่ยาวที่สุด
- **Visual Feedback**: แสดงผลการ snap ให้ผู้ใช้เห็น
- **Detailed Logging**: แสดงรายละเอียดการทำงานใน console
- **Two-tier Threshold**: ใช้ระยะ snap ที่แตกต่างกันตามความสำคัญของเส้นขอบ

## การปรับแต่ง

สามารถปรับระยะ snap threshold ได้โดยเปลี่ยนค่าในฟังก์ชัน:

```typescript
// สำหรับเส้นขอบหลัก
if (distanceToLongestEdge <= 3) { // 3 เมตร

// สำหรับเส้นขอบอื่นๆ
snapThreshold: number = 5 // 5 เมตร
```

## การทดสอบ

1. สร้างพื้นที่หลัก
2. วาดโซนใกล้ขอบพื้นที่หลัก
3. ตรวจสอบว่าโซนถูก snap เข้ากับขอบพื้นที่หลักหรือไม่
4. ตรวจสอบ console log เพื่อดูการทำงานของฟีเจอร์
5. ดู visual feedback ที่แสดงผล

## หมายเหตุ

- ฟีเจอร์นี้ทำงานเฉพาะกับโซนเท่านั้น ไม่รวม exclusion areas
- ต้องมีพื้นที่หลักก่อนจึงจะทำงานได้
- ระยะ snap threshold สามารถปรับได้ตามความเหมาะสม
- ระบบจะให้ความสำคัญกับเส้นขอบที่ยาวที่สุดของพื้นที่หลัก 