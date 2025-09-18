/**
 * รับ path ของรูปภาพ (เช่น /storage/images/abc.png)
 * แล้วคืนค่าเป็น URL ที่สมบูรณ์โดยใช้ค่าจาก Environment Variable
 * @param {string | null | undefined} relativePath - path ของรูปภาพที่ได้จาก API
 * @returns {string} URL เต็มๆ ของรูปภาพ
 */
export const getImageUrl = (relativePath: string | null | undefined): string => {
    // ถ้าไม่มี path รูปภาพมา, เป็นค่าว่าง, หรือไม่ใช่ string ให้ส่งรูป placeholder กลับไปแทน
    if (!relativePath || typeof relativePath !== 'string' || relativePath.trim() === '') {
      // คุณต้องสร้างไฟล์รูปเปล่าๆ ไว้ที่ public/images/no-image.jpg เพื่อให้ path นี้ถูกต้อง
      return '/images/no-image.jpg';
    }
  
    // ตรวจสอบว่า path ที่ได้มาเป็น URL เต็มๆ อยู่แล้วหรือไม่ (เผื่อกรณีข้อมูลเก่า)
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath;
    }
  
    // นำ URL หลักจาก .env.local มาต่อกับ path ของรูปภาพ
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    return `${baseUrl}${relativePath}`;
  };
