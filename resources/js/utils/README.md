# HTML2Canvas Helper

ไฟล์ helper สำหรับการใช้งาน html2canvas ที่แก้ไขปัญหา oklch color space compatibility

## ปัญหาที่แก้ไข

- html2canvas ไม่รองรับ oklch color space อย่างสมบูรณ์
- การแปลงสีจาก oklch เป็น hex/rgb colors
- การจัดการ error handling ที่ดีขึ้น
- การตั้งค่า options ที่เหมาะสมสำหรับการใช้งาน

## ฟังก์ชันที่ให้บริการ

### `captureElementAsImage(element, options)`

แปลง element เป็น image data URL พร้อมจัดการ oklch compatibility

```typescript
import { captureElementAsImage } from '@/utils/html2canvasHelper';

const dataUrl = await captureElementAsImage(element, {
    scale: 2,
    backgroundColor: '#ffffff',
});
```

### `enhancedHtml2Canvas(element, options)`

ฟังก์ชัน html2canvas ที่ปรับปรุงแล้วพร้อม error handling

```typescript
import { enhancedHtml2Canvas } from '@/utils/html2canvasHelper';

const canvas = await enhancedHtml2Canvas(element, {
    scale: 2,
    useCORS: true,
});
```

### `convertToPDF(element, filename, options)`

แปลง element เป็น PDF พร้อมจัดการ image handling

```typescript
import { convertToPDF } from '@/utils/html2canvasHelper';

await convertToPDF(element, 'document.pdf', {
    orientation: 'portrait',
    format: 'a4',
});
```

### `downloadImage(element, filename, format)`

ดาวน์โหลด element เป็น image file

```typescript
import { downloadImage } from '@/utils/html2canvasHelper';

await downloadImage(element, 'screenshot.png', 'png');
```

## การใช้งาน

### 1. แทนที่ html2canvas ปกติ

```typescript
// เดิม
import html2canvas from 'html2canvas';
const canvas = await html2canvas(element);

// ใหม่
import { enhancedHtml2Canvas } from '@/utils/html2canvasHelper';
const canvas = await enhancedHtml2Canvas(element);
```

### 2. ใช้สำหรับ PDF generation

```typescript
import { convertToPDF } from '@/utils/html2canvasHelper';

const downloadPDF = async () => {
    if (!ref.current) return;
    try {
        await convertToPDF(ref.current, 'document.pdf');
    } catch (error) {
        console.error('PDF generation failed:', error);
    }
};
```

### 3. ใช้สำหรับ image capture

```typescript
import { downloadImage } from '@/utils/html2canvasHelper';

const captureScreenshot = async () => {
    const element = document.querySelector('.target-element');
    if (element) {
        await downloadImage(element, 'screenshot.png');
    }
};
```

## CSS Classes สำหรับ Compatibility

เพิ่ม class `html2canvas-compatible` ให้กับ element ที่ต้องการ capture:

```html
<div class="html2canvas-compatible">
    <!-- content -->
</div>
```

## การตั้งค่า Options

### Default Options

```typescript
{
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: false,
    foreignObjectRendering: true,
    imageTimeout: 15000,
    removeContainer: true,
    logging: false
}
```

### Fallback Options (เมื่อเกิด error)

```typescript
{
    scale: 1,
    useCORS: false,
    allowTaint: true,
    foreignObjectRendering: false
}
```

## ข้อควรระวัง

1. ตรวจสอบว่า element ที่ต้องการ capture มีขนาดที่เหมาะสม
2. สำหรับ map elements ควรใช้ `useCORS: true`
3. สำหรับ elements ที่มี external images ควรใช้ `allowTaint: true`
4. ตรวจสอบ browser compatibility โดยเฉพาะ Safari

## การแก้ไขปัญหา

### ปัญหา: สีไม่แสดงผลถูกต้อง

**วิธีแก้:** ใช้ class `html2canvas-compatible` และตรวจสอบว่าไม่มี oklch colors

### ปัญหา: Element ไม่แสดงในผลลัพธ์

**วิธีแก้:** ใช้ class `html2canvas-force-visible` สำหรับ elements ที่ซ่อนอยู่

### ปัญหา: Error เกี่ยวกับ CORS

**วิธีแก้:** ใช้ `useCORS: true` และ `allowTaint: true` สำหรับ external images
