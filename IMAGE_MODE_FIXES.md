# การแก้ไขโหมดรูปแบบแปลน (Image Mode)

## สิ่งที่แก้ไข

### 1. ปิดการซูม (Zoom)
- แก้ไข `wheelHandler` ใน `useEffect` ให้ไม่ทำการซูม
- เพิ่ม `e.preventDefault()` เพื่อป้องกันการ scroll ของ browser
- ลบการเรียกใช้ `handleZoom` function

### 2. ปิดการขยับรูปภาพ (Panning)
- แก้ไข `handleMouseDown` ให้ไม่ทำการ panning เมื่อคลิกที่รูปภาพ
- เพิ่มเงื่อนไขให้ return ทันทีเมื่อคลิกซ้ายในโหมดที่ไม่ใช่การวาด
- ลบการตั้งค่า `isPanning` และ `panStartPos`

### 3. ปิดการลากรูปภาพ (Image Dragging)
- แก้ไข `handleImageDragStart`, `handleImageDragMove`, `handleImageDragEnd` ให้ไม่ทำอะไร
- เพิ่ม comment ว่าไม่ทำการลากรูปภาพในโหมดรูปแบบแปลน

### 4. ทำให้รูปภาพเต็มพื้นที่
- แก้ไขฟังก์ชัน `centerImage` ให้คำนวณขนาดให้เต็มพื้นที่
- ใช้ `containerAspectRatio` และ `aspectRatio` เพื่อหาขนาดที่เหมาะสม
- ตั้งค่า `zoom` ให้เหมาะสมกับขนาดที่คำนวณ

## การเปลี่ยนแปลงหลัก

### ใน `centerImage` function:
```typescript
// คำนวณขนาดให้เต็มพื้นที่
const containerAspectRatio = containerWidth / containerHeight;

let displayWidth, displayHeight;

if (aspectRatio > containerAspectRatio) {
    // รูปภาพกว้างกว่า container ให้ปรับตามความกว้าง
    displayWidth = containerWidth;
    displayHeight = containerWidth / aspectRatio;
} else {
    // รูปภาพสูงกว่า container ให้ปรับตามความสูง
    displayHeight = containerHeight;
    displayWidth = containerHeight * aspectRatio;
}

// ตั้งค่า zoom ให้เหมาะสมกับขนาดที่คำนวณ
const zoomX = displayWidth / imageWidth;
const zoomY = displayHeight / imageHeight;
const newZoom = Math.min(zoomX, zoomY);
setZoom(newZoom);
```

### ใน `wheelHandler`:
```typescript
const wheelHandler = (e: WheelEvent) => {
    e.preventDefault();
    // ไม่ทำการซูมในโหมดรูปแบบแปลน
};
```

### ใน `handleMouseDown`:
```typescript
// ปิดการ panning และการลากรูปภาพในโหมดรูปแบบแปลน
if (
    e.button === 0 &&
    editMode !== 'draw' &&
    editMode !== 'place' &&
    editMode !== 'edit' &&
    editMode !== 'main-pipe' &&
    editMode !== 'drag-sprinkler' &&
    editMode !== 'connect-sprinklers' &&
    !dimensionMode &&
    !draggedItem &&
    !measurementMode &&
    !pipeEditMode
) {
    // ไม่ทำการ panning หรือการลากรูปภาพในโหมดรูปแบบแปลน
    return;
}
```

## ผลลัพธ์

1. **รูปภาพจะเต็มพื้นที่** เมื่อ import เข้ามา
2. **ไม่สามารถซูมได้** ด้วย mouse wheel
3. **ไม่สามารถขยับรูปภาพได้** ด้วยการลาก
4. **ไม่สามารถ pan ได้** เมื่อคลิกที่รูปภาพ

การแก้ไขนี้ทำให้โหมดรูปแบบแปลนเหมาะสำหรับการวางระบบน้ำบนรูปภาพที่มีขนาดคงที่และไม่สามารถขยับได้ 