# 📝 คู่มือการใช้งานฟีเจอร์แก้ไขโซนอัตโนมัติ

## 🎯 ภาพรวมฟีเจอร์

ฟีเจอร์แก้ไขโซนอัตโนมัติช่วยให้ผู้ใช้สามารถปรับแต่งโซนที่สร้างด้วยระบบอัตโนมัติได้ โดยสามารถลากและปรับขนาดโซนตามต้องการ พร้อมทั้งอัปเดตจำนวนต้นไม้และความต้องการน้ำอัตโนมัติ

## 🛠️ ไฟล์และ Components ที่สำคัญ

### Utils
- `zoneEditUtils.ts` - ฟังก์ชันหลักสำหรับการแก้ไขโซน
- `autoZoneUtilsExtensions.ts` - ส่วนเพิ่มเติมของ autoZoneUtils
- `irrigationZoneUtils.ts` - Interface และ types

### Components
- `ZoneEditButton.tsx` - ปุ่มสำหรับเปิด/ปิดโหมดแก้ไข
- `ZoneControlPoints.tsx` - จุดควบคุมสำหรับแก้ไขโซน
- `AutoZoneEditSection.tsx` - Section รวมสำหรับการแก้ไขโซน

### Hooks
- `useZoneEditor.tsx` - Hook สำหรับจัดการ state การแก้ไขโซน

## 📋 วิธีการใช้งาน

### 1. เพิ่ม Component ในหน้า Planner

```tsx
import AutoZoneEditSection from '../components/AutoZoneEditSection';

// ใน component หลัก
<AutoZoneEditSection
    zones={zones}
    allPlants={plants}
    mainArea={mainArea}
    onZonesUpdate={handleZonesUpdate}
    onDeleteAllZones={handleDeleteAllZones}
/>
```

### 2. จัดการ State การอัปเดตโซน

```tsx
const handleZonesUpdate = useCallback((updatedZones: IrrigationZone[]) => {
    // อัปเดตโซนและคำนวณต้นไม้ใหม่
    const recalculatedZones = recalculateAllZones(updatedZones, plants);
    setZones(recalculatedZones);

    // อัปเดต zoneId ของต้นไม้
    const updatedPlants = plants.map(plant => {
        const belongsToZone = recalculatedZones.find(zone => 
            zone.plants.some(zonePlant => zonePlant.id === plant.id)
        );
        return {
            ...plant,
            zoneId: belongsToZone ? belongsToZone.id : undefined
        };
    });
    setPlants(updatedPlants);
}, [plants]);
```

## 🎮 การใช้งานผู้ใช้

### ขั้นตอนการแก้ไขโซน

1. **สร้างโซนอัตโนมัติ** - กดปุ่ม "สร้างโซนอัตโนมัติ" เพื่อสร้างโซนเบื้องต้น

2. **เปิดโหมดแก้ไข** - กดปุ่ม "✏️ แก้ไขโซน" ข้างๆ ปุ่ม "🗑️ ลบโซนทั้งหมด"

3. **เลือกโซนที่ต้องการแก้ไข** - คลิกที่โซนที่ต้องการแก้ไข

4. **แก้ไขโซน** - ใช้จุดควบคุมเพื่อปรับแต่งโซน:
   - **จุดสีส้ม (มุม)** - ลากเพื่อเปลี่ยนรูปทรงโซน
   - **จุดสีน้ำเงิน (กึ่งกลาง)** - ลากเพื่อเพิ่มจุดใหม่

5. **บันทึกหรือยกเลิก** - กด "✅ บันทึก" หรือ "❌ ยกเลิก"

## ⚡ ฟีเจอร์หลัก

### 🎯 จุดควบคุมแบบ Interactive
- **จุดมุม (สีส้ม)** - เปลี่ยนรูปทรงโซนโดยการลากมุม
- **จุดกึ่งกลาง (สีน้ำเงิน)** - เพิ่มจุดใหม่โดยการลากจุดกึ่กลางของเส้น

### 🔒 การตรวจสอบขอบเขต
- ไม่สามารถลากโซนออกนอกพื้นที่หลักได้
- ตรวจสอบการตัดกันเองของพอลิกอน
- ป้องกันการสร้างโซนที่ไม่ถูกต้อง

### 📊 อัปเดตข้อมูลอัตโนมัติ
- คำนวณต้นไม้ในโซนใหม่อัตโนมัติ
- อัปเดตความต้องการน้ำตามต้นไม้ที่เปลี่ยนแปลง
- แสดงสถิติโซนแบบ real-time

### 🎨 UI/UX ที่ใช้งานง่าย
- ข้อความแนะนำการใช้งาน
- สถานะแสดงผลแบบ real-time
- การแสดงผลข้อผิดพลาดและข้อความสำเร็จ

## 🏗️ Architecture

### State Management
```
ZoneEditState {
    isEditing: boolean
    selectedZoneId: string | null
    editingZone: IrrigationZone | null
    controlPoints: ZoneControlPoint[]
    isDragging: boolean
    draggedPointIndex: number | null
}
```

### Control Points
```
ZoneControlPoint {
    id: string
    position: Coordinate
    index: number (จุดมุมเป็นจำนวนเต็ม, จุดกึ่งกลางเป็นทศนิยม)
    isDraggable: true
}
```

## 🔧 การ Customization

### สีและ Theme
```tsx
// ใน ZoneEditButton.tsx
const buttonStyles = {
    editMode: 'bg-orange-500 hover:bg-orange-600 text-white',
    normal: 'bg-white hover:bg-gray-50 text-gray-700'
};
```

### Validation Rules
```tsx
// ใน zoneEditUtils.ts
const updateZoneCoordinatesOnDrag = (zone, controlPointIndex, newPosition, mainArea) => {
    // เพิ่ม validation rules ตามต้องการ
    if (!isPointWithinMainArea(newPosition, mainArea)) {
        return { isValid: false, errorMessage: "ข้อความแสดงข้อผิดพลาด" };
    }
};
```

## 🐛 การ Debug และ Troubleshooting

### การเปิด Debug Mode
```tsx
const config: AutoZoneConfig = {
    debugMode: true, // เปิดการแสดงผล console logs
    // ... other config
};
```

### ข้อผิดพลาดที่พบบ่อย
1. **โซนไม่แสดงจุดควบคุม** - ตรวจสอบว่า `isEditMode` เป็น `true`
2. **ลากไม่ได้** - ตรวจสอบ event handlers และ coordinate transformation
3. **ต้นไม้ไม่อัปเดต** - ตรวจสอบ `onZonesUpdate` callback

### Console Logs
```
🎯 Zone edit mode activated
✏️ Started editing zone: โซนอัตโนมัติ 1
🖱️ Started dragging control point: control-zone-1-0
🔄 Recalculating all zones after edit...
✅ Applied changes to zone: โซนอัตโนมัติ 1
```

## 📱 Responsive Design

Components ถูกออกแบบให้รองรับหน้าจอขนาดต่างๆ:
- Mobile: แสดงปุ่มแบบ stack
- Tablet: แสดงปุ่มแบบ horizontal
- Desktop: แสดงปุ่มพร้อม tooltips เต็มรูปแบบ

## 🚀 Performance

### Optimizations
- การ cache plant grouping เพื่อลดการคำนวณซ้ำ
- Event delegation สำหรับ drag events
- Debounced updates สำหรับ real-time calculations

### Memory Management
- Cleanup event listeners เมื่อออกจากโหมดแก้ไข
- Clear cache เมื่อมีการเปลี่ยนแปลงข้อมูลต้นไม้

## 📋 TODO และการพัฒนาต่อ

### ฟีเจอร์ที่อาจเพิ่มในอนาคต
- [ ] การ undo/redo สำหรับการแก้ไขโซน
- [ ] การ copy/paste โซน
- [ ] การ merge/split โซน
- [ ] การ export/import การตั้งค่าโซน
- [ ] การแสดงตัวอย่าง 3D ของโซน

### การปรับปรุงที่คาดหวัง
- [ ] การปรับปรุง performance สำหรับโครงการขนาดใหญ่
- [ ] การเพิ่ม accessibility features
- [ ] การ integration กับระบบ GPS
- [ ] การสนับสนุนการแก้ไขแบบ multi-select

---

**หมายเหตุ:** ฟีเจอร์นี้ต้องการ React 16.8+ และ TypeScript สำหรับการทำงานที่เหมาะสม
