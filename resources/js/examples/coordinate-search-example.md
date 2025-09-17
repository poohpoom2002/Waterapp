# การค้นหาด้วยพิกัดใน HorticultureSearchControl

## ฟีเจอร์ที่เพิ่มใหม่

ตอนนี้ **HorticultureSearchControl** รองรับการค้นหาด้วยพิกัด (coordinates) ได้แล้ว! ผู้ใช้สามารถป้อนพิกัดในรูปแบบต่าง ๆ เพื่อค้นหาข้อมูลสถานที่ในตำแหน่งนั้น

## รูปแบบพิกัดที่รองรับ

### 1. รูปแบบพื้นฐาน (Decimal Degrees)
```
13.7563, 100.5018
13.7563,100.5018
```

### 2. รูปแบบที่มี Label
```
lat: 13.7563, lng: 100.5018
latitude: 13.7563, longitude: 100.5018
```

### 3. รูปแบบที่มีวงเล็บ
```
(13.7563, 100.5018)
```

### 4. รูปแบบ DMS (Degrees, Minutes, Seconds)
```
13°45'22.68"N, 100°30'6.48"E
```

## ตัวอย่างการใช้งาน

### การนำเข้า Component
```typescript
import EnhancedHorticultureSearchControl from '../components/horticulture/HorticultureSearchControl';
```

### การใช้งานใน Component
```tsx
function MyMapComponent() {
    const handlePlaceSelect = (lat: number, lng: number, placeDetails?: SearchResult) => {
        console.log('Selected coordinates:', { lat, lng });
        console.log('Place details:', placeDetails);
        
        // ทำสิ่งที่ต้องการกับพิกัดที่ได้รับ
        // เช่น อัปเดตแผนที่, บันทึกตำแหน่ง, ฯลฯ
    };

    return (
        <div className="relative h-screen">
            <EnhancedHorticultureSearchControl
                onPlaceSelect={handlePlaceSelect}
                placeholder="ค้นหาสถานที่หรือใส่พิกัด เช่น 13.7563,100.5018"
            />
            
            {/* แผนที่หรือ content อื่น ๆ */}
        </div>
    );
}
```

## วิธีการทำงาน

1. **การตรวจจับอัตโนมัติ**: ระบบจะตรวจจับอัตโนมัติว่าข้อความที่ป้อนเป็นพิกัดหรือข้อความธรรมดา

2. **การแปลงพิกัด**: ถ้าเป็นพิกัด ระบบจะแปลงเป็นรูปแบบมาตรฐาน (decimal degrees)

3. **Reverse Geocoding**: ใช้ Google Geocoding API เพื่อค้นหาข้อมูลสถานที่จากพิกัด

4. **การแสดงผล**: แสดงรายการสถานที่ที่อยู่ใกล้พิกัดที่ระบุ

## ข้อมูลที่ได้รับ

เมื่อค้นหาด้วยพิกัดแล้ว จะได้รับข้อมูล:

- ชื่อสถานที่
- ที่อยู่แบบเต็ม
- พิกัดที่แม่นยำ
- ประเภทของสถานที่
- ข้อมูลเพิ่มเติม (ถ้ามี)

## ข้อผิดพลาดที่อาจเกิดขึ้น

### พิกัดไม่ถูกต้อง
```
รูปแบบพิกัดไม่ถูกต้อง

แนวทางแก้ไข:
• รูปแบบที่รองรับ: 13.7563,100.5018
• หรือ: lat:13.7563, lng:100.5018
• หรือ: (13.7563, 100.5018)
• หรือ: 13°45'22.68"N, 100°30'6.48"E
```

### ไม่พบข้อมูลสถานที่
```
ไม่พบข้อมูลสถานที่สำหรับพิกัดนี้

แนวทางแก้ไข:
• ตรวจสอบพิกัดอีกครั้ง
• ลองใช้พิกัดใกล้เคียง
```

## เคล็ดลับการใช้งาน

1. **สำหรับการทดสอบ**: ใช้พิกัดของกรุงเทพฯ `13.7563, 100.5018`

2. **การหาพิกัด**: สามารถหาพิกัดจาก Google Maps โดยคลิกขวาที่แผนที่

3. **ความแม่นยำ**: พิกัดที่มีทศนิยม 4-6 ตำแหน่งจะให้ความแม่นยำที่เหมาะสม

4. **การผสมผสาน**: สามารถใช้ทั้งการค้นหาด้วยชื่อสถานที่และพิกัดใน input เดียวกัน

## การใช้งานใน Production

```typescript
// สำหรับการใช้งานจริง
const ProductionMapComponent = () => {
    const handlePlaceSelect = async (lat: number, lng: number, placeDetails?: SearchResult) => {
        try {
            // บันทึกพิกัดลงฐานข้อมูล
            await saveLocation({ lat, lng, details: placeDetails });
            
            // อัปเดต UI
            updateMapCenter(lat, lng);
            
            // แสดงการแจ้งเตือน
            showNotification('เลือกตำแหน่งเรียบร้อยแล้ว');
            
        } catch (error) {
            console.error('Error saving location:', error);
            showErrorNotification('ไม่สามารถบันทึกตำแหน่งได้');
        }
    };

    return (
        <EnhancedHorticultureSearchControl
            onPlaceSelect={handlePlaceSelect}
            placeholder="ค้นหาสถานที่หรือใส่พิกัด"
        />
    );
};
```
