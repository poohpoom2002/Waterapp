# ฟีเจอร์การ Snap และเชื่อมต่อท่อเมนหลักและท่อเมนรอง

## ภาพรวม
ฟีเจอร์นี้ช่วยให้การวางท่อเมนหลักและท่อเมนรองมีความแม่นยำมากขึ้น โดยการ snap จุดเริ่มต้นของท่อเข้ากับตำแหน่งที่เหมาะสมอัตโนมัติ

## ฟีเจอร์ที่เพิ่มเข้ามา

### 1. การ Snap ท่อเมนหลักเข้ากับปั๊ม
- **จุดเริ่มต้น**: เมื่อวางท่อเมนหลัก จุดเริ่มต้นจะถูก snap เข้ากับตำแหน่งปั๊มอัตโนมัติ
- **ระยะ Snap**: 10 เมตร
- **การทำงาน**: ระบบจะตรวจสอบระยะทางระหว่างจุดเริ่มต้นท่อกับตำแหน่งปั๊ม หากใกล้พอจะ snap อัตโนมัติ
- **ข้อจำกัด**: เฉพาะจุดเริ่มต้นเท่านั้นที่ snap จุดอื่นๆ ไม่ขยับ

### 2. การ Snap ท่อเมนรองเข้ากับปลายท่อเมนหลัก
- **จุดเริ่มต้น**: เมื่อวางท่อเมนรอง จุดเริ่มต้นจะไม่ถูก snap (ปลายท่อเมนหลักจะเคลื่อนที่มา snap เอง)
- **การทำงาน**: ปลายท่อเมนหลักจะเคลื่อนที่มา snap กับจุดเริ่มต้นของท่อเมนรอง
- **เงื่อนไข**: ถ้าท่อเมนรองลากผ่านใกล้ปลายท่อเมนหลักเกิน 5 เมตร ปลายท่อเมนหลักจะเคลื่อนที่มา snap ทันที

### 3. การ Snap จุดอื่นๆ เข้ากับขอบพื้นที่หลัก
- **จุดกลางและจุดสุดท้าย**: จุดอื่นๆ ของท่อจะถูก snap เข้ากับขอบพื้นที่หลัก
- **ระยะ Snap**: 5 เมตร
- **การทำงาน**: ระบบจะตรวจสอบระยะทางกับทุกเส้นขอบของพื้นที่หลัก

### 4. การ Snap ปลายท่อเมนหลักเข้ากับท่อเมนรอง (ใหม่)
- **ปลายท่อเมนหลัก**: ปลายท่อเมนหลักจะเคลื่อนที่มา snap กับท่อเมนรองที่ใกล้ที่สุด
- **ระยะ Snap**: 5 เมตร
- **การทำงาน**: เมื่อวาดท่อเมนรองเสร็จ ระบบจะตรวจสอบและเคลื่อนย้ายปลายท่อเมนหลักมา snap
- **การอัพเดท**: ท่อเมนหลักจะถูกอัพเดทอัตโนมัติเมื่อมีการ snap

## การใช้งาน

### การวางท่อเมนหลัก
1. กดปุ่ม "วางท่อเมนหลัก"
2. คลิกที่ตำแหน่งเริ่มต้น (ใกล้ปั๊ม) - จุดจะถูก snap เข้ากับปั๊มอัตโนมัติ
3. คลิกที่ตำแหน่งปลายท่อ - จุดจะถูก snap เข้ากับขอบพื้นที่หลัก (ถ้าใกล้พอ)
4. ระบบจะสร้างท่อเมนหลักที่เชื่อมต่อกับปั๊ม

### การวางท่อเมนรอง
1. กดปุ่ม "วางท่อเมนรอง + ท่อย่อย"
2. คลิกที่ตำแหน่งเริ่มต้น (ไม่ต้องกังวลเรื่อง snap)
3. คลิกที่ตำแหน่งปลายท่อ - จุดจะถูก snap เข้ากับขอบพื้นที่หลัก (ถ้าใกล้พอ)
4. ระบบจะสร้างท่อเมนรอง และปลายท่อเมนหลักจะเคลื่อนที่มา snap อัตโนมัติ

### การวางท่อเมนหลัก (อัพเดท)
1. กดปุ่ม "วางท่อเมนหลัก"
2. คลิกที่ตำแหน่งเริ่มต้น (ใกล้ปั๊ม) - จุดจะถูก snap เข้ากับปั๊มอัตโนมัติ
3. คลิกที่ตำแหน่งปลายท่อ - จุดจะไม่ถูก snap ใดๆ (ตามที่ต้องการ)
4. ระบบจะสร้างท่อเมนหลักที่เชื่อมต่อกับปั๊ม

## ฟังก์ชันที่เพิ่มเข้ามา

### ใน `HorticultureDrawingManager.tsx`

#### 1. `snapPointToPump()`
```typescript
const snapPointToPump = (
    point: Coordinate,
    pumpPosition: Coordinate | null,
    snapThreshold: number = 10
): Coordinate
```
- Snap จุดเข้ากับตำแหน่งปั๊ม
- ระยะ snap: 10 เมตร

#### 2. `snapPointToMainPipeEnd()`
```typescript
const snapPointToMainPipeEnd = (
    point: Coordinate,
    mainPipes: any[],
    snapThreshold: number = 5
): Coordinate
```
- Snap จุดเข้ากับปลายท่อเมนหลักที่ใกล้ที่สุด
- ระยะ snap: 5 เมตร (ลดลงจาก 8 เมตร)

#### 3. `snapMainPipeCoordinates()`
```typescript
const snapMainPipeCoordinates = (
    coordinates: Coordinate[],
    pumpPosition: Coordinate | null,
    mainArea: Coordinate[],
    subMainPipes: any[] = []
): Coordinate[]
```
- Snap coordinates ของท่อเมนหลัก
- จุดเริ่มต้น snap เข้ากับปั๊ม
- จุดอื่นๆ snap เข้ากับท่อเมนรอง (ถ้าใกล้พอ) หรือขอบพื้นที่หลัก

#### 4. `snapSubMainPipeCoordinates()`
```typescript
const snapSubMainPipeCoordinates = (
    coordinates: Coordinate[],
    mainPipes: any[],
    mainArea: Coordinate[]
): Coordinate[]
```
- Snap coordinates ของท่อเมนรอง
- จุดเริ่มต้น snap เข้ากับปลายท่อเมนหลัก (เฉพาะถ้าใกล้ไม่เกิน 5 เมตร)
- จุดอื่นๆ snap เข้ากับขอบพื้นที่หลัก

#### 5. `snapPointToSubMainPipe()` (ใหม่)
```typescript
const snapPointToSubMainPipe = (
    point: Coordinate,
    subMainPipes: any[],
    snapThreshold: number = 5
): Coordinate
```
- Snap จุดเข้ากับท่อเมนรองที่ใกล้ที่สุด
- ระยะ snap: 5 เมตร

## Props ที่เพิ่มเข้ามา

### ใน `HorticultureDrawingManagerProps`
```typescript
interface HorticultureDrawingManagerProps {
    // ... existing props
    pump?: Coordinate | null; // ตำแหน่งปั๊ม
    mainPipes?: any[]; // รายการท่อเมนหลัก
    subMainPipes?: any[]; // รายการท่อเมนรอง (ใหม่)
}
```

## การอัพเดทใน `HorticulturePlannerPage.tsx`

### การส่ง Props ใหม่
```typescript
<HorticultureDrawingManager
    // ... existing props
    pump={history.present.pump?.position || null}
    mainPipes={history.present.mainPipes}
    subMainPipes={history.present.subMainPipes}
/>
```

## ข้อดีของฟีเจอร์นี้

1. **ความแม่นยำ**: การ snap อัตโนมัติช่วยให้การวางท่อมีความแม่นยำมากขึ้น
2. **ความสะดวก**: ผู้ใช้ไม่ต้องกังวลเรื่องการวางจุดให้ตรงกับตำแหน่งที่ต้องการ
3. **การเชื่อมต่อที่สมบูรณ์**: ท่อเมนหลักและท่อเมนรองจะเชื่อมต่อกันอย่างถูกต้อง
4. **ลดข้อผิดพลาด**: ลดโอกาสการวางท่อผิดตำแหน่ง

## การ Debug

ระบบจะแสดง log ข้อมูลการ snap ใน console:
- `🔗 Snapped to pump: X.XXm` - เมื่อ snap เข้ากับปั๊ม
- `🔗 Snapped to main pipe end (pipe_id): X.XXm` - เมื่อ snap เข้ากับปลายท่อเมนหลัก
- `🔗 Snapped to sub-main pipe (pipe_id): X.XXm` - เมื่อ snap เข้ากับท่อเมนรอง
- `🔗 Main pipe snapped to sub-main pipe at point X` - เมื่อท่อเมนหลัก snap เข้ากับท่อเมนรอง
- `🔗 Sub-main pipe start snapped to main pipe end` - เมื่อท่อเมนรอง snap เข้ากับปลายท่อเมนหลัก
- `❌ Sub-main pipe start too far from main pipe end (>5m), no snap` - เมื่อท่อเมนรองอยู่ไกลเกินไป
- `🔗 Snapped main pipe coordinates to pump, sub-main pipes, and area boundary` - เมื่อ snap ท่อเมนหลัก
- `🔗 Snapped sub-main pipe coordinates to main pipe ends and area boundary` - เมื่อ snap ท่อเมนรอง

## การตั้งค่า

สามารถปรับแต่งระยะ snap ได้ในฟังก์ชันต่างๆ:
- `snapPointToPump()`: 10 เมตร
- `snapPointToMainPipeEnd()`: 5 เมตร (ลดลงจาก 8 เมตร)
- `snapPointToSubMainPipe()`: 5 เมตร (ใหม่)
- `snapPointToMainAreaBoundary()`: 5 เมตร 