import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations } from './translations/index';

type Language = 'en' | 'th';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('th');

    useEffect(() => {
        const savedLanguage = localStorage.getItem('language') as Language;
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'th')) {
            setLanguage(savedLanguage);
        } else {
            setLanguage('th');
            localStorage.setItem('language', 'th');
        }
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
    };

    const t = (key: string): string => {
        // Logic การแปลยังเหมือนเดิม แต่ใช้ 'translations' ที่ import เข้ามา
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

// import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// type Language = 'en' | 'th';

// interface LanguageContextType {
//     language: Language;
//     setLanguage: (lang: Language) => void;
//     t: (key: string) => string;
// }

// const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// // Translation dictionary
// const translations = {
//     en: {
//         // Home page
//         water_management_system: 'Water Management System',
//         manage_irrigation_fields: 'Manage your irrigation fields and pipe networks',
//         add_field: 'Add Field',
//         no_fields_yet: 'No Fields Yet',
//         start_first_field: 'Start by creating your first irrigation field',
//         create_first_field: 'Create Your First Field',
//         your_fields: 'Your Fields',
//         click_field_manage: 'Click on a field to view and manage its pipe network',
//         delete_field: 'Delete Field',
//         delete_confirm: 'Are you sure you want to delete',
//         delete_warning:
//             'This action cannot be undone. All field data, planting points, pipes, and zones will be permanently deleted.',
//         cancel: 'Cancel',
//         deleting: 'Deleting...',
//         plant_type: 'Plant Type',
//         area: 'Area',
//         plants: 'Plants',
//         water_need: 'Water Need',

//         // Category modal
//         choose_irrigation_category: 'Choose Your Irrigation Planning Category',
//         select_irrigation_type:
//             'Select the type of irrigation system that best fits your agricultural needs',
//         click_start_planning: 'Click to start planning',
//         why_choose_system: 'Why Choose Our Irrigation Planning System?',
//         precision_planning: 'Precision Planning',
//         precision_desc: 'Advanced algorithms optimize water distribution for maximum efficiency',
//         water_conservation: 'Water Conservation',
//         water_conservation_desc:
//             'Smart systems reduce water waste while maintaining optimal plant health',
//         data_driven: 'Data-Driven',
//         data_driven_desc: 'Comprehensive analytics and reporting for informed decision making',

//         // Categories
//         horticulture: 'Horticulture',
//         horticulture_desc: 'Advanced irrigation system for fruit trees and orchards',
//         home_garden: 'Home Garden',
//         home_garden_desc: 'Automated sprinkler system for residential gardens',
//         greenhouse: 'Greenhouse',
//         greenhouse_desc: 'Specialized irrigation for controlled environment agriculture',
//         field_crop: 'Field Crop',
//         field_crop_desc: 'Large-scale irrigation for agricultural fields',

//         // Category features
//         zone_based_planning: 'Zone-based irrigation planning',
//         multiple_plant_types: 'Multiple plant types support',
//         advanced_pipe_layout: 'Advanced pipe layout optimization',
//         elevation_analysis: 'Elevation and terrain analysis',
//         comprehensive_stats: 'Comprehensive project statistics',
//         automated_sprinkler: 'Automated sprinkler placement',
//         coverage_optimization: 'Coverage optimization',
//         water_flow_calc: 'Water flow calculations',
//         easy_interface: 'Easy-to-use interface',
//         residential_focus: 'Residential garden focus',
//         controlled_environment: 'Controlled environment planning',
//         precision_irrigation: 'Precision irrigation systems',
//         climate_control: 'Climate control integration',
//         crop_optimization: 'Crop-specific optimization',
//         environmental_monitoring: 'Environmental monitoring',
//         large_scale_planning: 'Large-scale field planning',
//         crop_rotation: 'Crop rotation support',
//         efficient_distribution: 'Efficient water distribution',
//         weather_integration: 'Weather integration',
//         yield_optimization: 'Yield optimization',

//         // Navigation
//         dashboard: 'Dashboard',
//         overview_stats: 'Overview and Statistics',
//         residential_watering: 'Residential Watering System',
//         equipment: 'Equipment',
//         manage_equipment: 'Manage Equipment',
//         product: 'Product',
//         product_recommendations: 'Product Recommendations',
//         create_dream_system: 'Create Your Dream Irrigation System',

//         // Common
//         close: 'Close',
//         save: 'Save',
//         edit: 'Edit',
//         confirm: 'Confirm',
//         back: 'Back',
//         next: 'Next',
//         previous: 'Previous',
//         error: 'Error',
//         success: 'Success',
//         warning: 'Warning',
//         info: 'Information',

//         // Horticulture translations
//         'โครงการระบบน้ำพืชสวน จ.จันทบุรี': 'Horticulture Water System Project, Chanthaburi',
//         กำหนดพืชใหม่: 'Define New Plant',
//         'ชื่อพืช *': 'Plant Name *',
//         'น้ำต่อต้น (ลิตร/ครั้ง) *': 'Water per Plant (L/Session) *',
//         'เช่น มะม่วงพันธุ์ใหม่': 'e.g. New Mango Variety',
//         'ระยะห่างต้น (ม.) *': 'Plant Spacing (m) *',
//         'ระยะห่างแถว (ม.) *': 'Row Spacing (m) *',
//         พื้นที่หลัก: 'Main Area',
//         'ขั้นตอนที่ 1: สร้างพื้นที่หลัก': 'Step 1: Create Main Area',
//         'ขั้นตอนที่ 2: กำหนดพืชและโซน': 'Step 2: Define Plants and Zones',
//         'ขั้นตอนที่ 3: วางปั๊มน้ำ': 'Step 3: Place Water Pump',
//         'ขั้นตอนที่ 4: วางท่อน้ำ': 'Step 4: Place Pipes',
//         'ขั้นตอนที่ 5: บันทึกและดูผลลัพธ์': 'Step 5: Save and View Results',
//         วาดพื้นที่หลักของโครงการบนแผนที่: 'Draw the main project area on the map',
//         วางปั๊มน้ำในตำแหน่งที่เหมาะสม: 'Place the water pump in a suitable location',
//         วางท่อเมนและท่อย่อยเพื่อกระจายน้ำ: 'Lay out main and branch pipes for water distribution',
//         บันทึกโครงการและดูผลลัพธ์การออกแบบ: 'Save the project and view the design results',
//         บันทึกและดูผลลัพธ์: 'Save and View Results',
//         พร้อมบันทึกและดูผลลัพธ์: 'Ready to save and view results',
//         คลิกปุ่มด้านบนเพื่อบันทึกและไปยังหน้าผลลัพธ์:
//             'Click the button above to save and go to the results page',
//         ยังไม่พร้อมบันทึก: 'Not ready to save',
//         ต้องมีพื้นที่หลักและปั๊มน้ำก่อนบันทึกได้:
//             'You must have a main area and pump before saving',
//         โหมดแก้ไขขั้นสูง: 'Advanced Edit Mode',
//         เข้าสู่โหมดแก้ไข: 'Enter Edit Mode',
//         ออกจากโหมดแก้ไข: 'Exit Edit Mode',
//         คลิกเพื่อเพิ่มต้นไม้: 'Click to add plant',
//         คลิกที่ท่อเมนรองหรือท่อย่อยเพื่อเชื่อมต่อ: 'Click a sub-main or branch pipe to connect',
//         คลิกเพื่อเชื่อมต่อ: 'Click to connect',
//         'โครงการบันทึกสำเร็จ! กำลังกลับไปหน้าหลัก':
//             'Project saved successfully! Returning to home page',
//         เกิดข้อผิดพลาด: 'An error occurred',
//         กลับไปสร้างโครงการใหม่: 'Back to create new project',
//         ดาวน์โหลดภาพแผนที่: 'Download Map Image',
//         'สร้างรายงาน PDF': 'Create PDF Report',
//         'คู่มือ Screenshot': 'Screenshot Guide',
//         บันทึกโครงการ: 'Save Project',
//         โครงการใหม่: 'New Project',
//         คำนวณระบบน้ำ: 'Calculate Irrigation System',
//         รายงานการออกแบบระบบน้ำสวนผลไม้: 'Horticulture Irrigation Design Report',
//         วันที่สร้าง: 'Created Date',
//         ข้อมูลโดยรวม: 'Overall Information',
//         จำนวนโซน: 'Number of Zones',
//         จำนวนต้นไม้ทั้งหมด: 'Total Plants',
//         ปริมาณน้ำต่อครั้ง: 'Water Volume per Session',
//         ระบบท่อ: 'Pipe System',
//         ท่อเมน: 'Main Pipe',
//         ท่อเมนรอง: 'Sub-Main Pipe',
//         ท่อย่อย: 'Branch Pipe',
//         ท่อที่ยาวที่สุดรวมกัน: 'Combined Longest Pipes',
//         รายละเอียดแต่ละโซน: 'Zone Details',
//         พื้นที่โซน: 'Zone Area',
//         จำนวนต้นไม้: 'Plant Count',
//         ท่อเมนในโซน: 'Main Pipes in Zone',
//         ท่อเมนรองในโซน: 'Sub-Main Pipes in Zone',
//         ท่อย่อยในโซน: 'Branch Pipes in Zone',
//         เคล็ดลับและแก้ปัญหา: 'Tips and Troubleshooting',
//         การควบคุมแผนที่: 'Map Controls',
//         การบันทึกภาพแผนที่: 'Map Image Saving',
//         แก้ปัญหาทั่วไป: 'General Troubleshooting',
//         หยุดวาดพื้นที่: 'Stop Drawing Area',
//         วาดพื้นที่หลัก: 'Draw Main Area',
//         สร้างพื้นที่หลักเสร็จแล้ว: 'Main area created successfully',
//         'เลือกชนิดพืชและแบ่งโซน (ถ้าต้องการ)': 'Select plant types and divide zones (if needed)',
//         การจัดการโซน: 'Zone Management',
//         แบ่งเป็นหลายโซน: 'Divide into multiple zones',
//         จะใช้พื้นที่ทั้งหมดเป็นโซนเดียว: 'Will use entire area as single zone',
//         การจัดการพืช: 'Plant Management',
//         สร้างพืชใหม่: 'New Plant',
//         'เลือกชนิดพืช (โซนเดียว)': 'Select Plant Type (Single Zone)',
//         ระยะห่างต้น: 'Plant Spacing',
//         ระยะห่างแถว: 'Row Spacing',
//         น้ำต่อต้น: 'Water per Plant',
//         'ล./ครั้ง': 'L/session',
//         พืชในแต่ละโซน: 'Plants in each zone',
//         เปลี่ยน: 'Change',
//         ประมาณ: 'Approximately',
//         ต้น: 'plants',
//         วางปั๊มน้ำ: 'Place Water Pump',
//         วางท่อเมน: 'Place Main Pipe',
//         โหมดเชื่อมต่อท่อ: 'Pipe Connection Mode',
//         ยกเลิกการเชื่อมต่อ: 'Cancel Connection',
//         ไม่พบแผนที่: 'Map not found',
//         เริ่มสร้างภาพแผนที่: 'Starting to create map image',
//         กำลังสร้างภาพแผนที่: 'Creating map image...',
//         ดาวน์โหลดภาพแผนที่สำเร็จ: 'Map image downloaded successfully',
//         ไม่สามารถสร้างภาพแผนที่ได้อัตโนมัติ: 'Cannot create map image automatically',
//         เกิดข้อผิดพลาดในการสร้างภาพ: 'Error occurred while creating image',
//         'เริ่มสร้าง PDF Report': 'Starting to create PDF Report',
//         สร้างรายงานสำเร็จ: 'Report created successfully',
//         ไม่สามารถสร้างรายงานอัตโนมัติได้: 'Cannot create report automatically',
//         'เกิดข้อผิดพลาดในการสร้าง PDF': 'Error occurred while creating PDF',
//         'ดาวน์โหลดไฟล์ JSON สำเร็จ': 'JSON file downloaded successfully',
//         'เกิดข้อผิดพลาดในการดาวน์โหลด JSON': 'Error occurred while downloading JSON',
//         'ดาวน์โหลดไฟล์ CSV สำเร็จ': 'CSV file downloaded successfully',
//         'เกิดข้อผิดพลาดในการดาวน์โหลด CSV': 'Error occurred while downloading CSV',
//         คัดลอกข้อมูลสถิติลงคลิปบอร์ดเรียบร้อยแล้ว: 'Statistics copied to clipboard successfully',
//         'เปิดข้อมูลในหน้าต่างใหม่ กรุณาคัดลอกด้วยตนเอง':
//             'Data opened in new window, please copy manually',
//         'สร้าง...': 'Creating...',
//         ดาวน์โหลดภาพ: 'Download Image',
//         สร้างรายงาน: 'Create Report',
//         ภาพถ่ายดาวเทียม: 'Satellite Image',
//         'ภาพถ่าย + ป้ายชื่อ': 'Satellite + Labels',
//         แผนที่ถนน: 'Road Map',
//         ไม่พบสถานที่ที่ค้นหา: 'No locations found for search',
//         ข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง: 'Invalid data from server',
//         'การค้นหาใช้เวลานานเกินไป กรุณาลองใหม่': 'Search took too long, please try again',
//         ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: 'Cannot connect to server',
//         เกิดข้อผิดพลาดในการค้นหา: 'Error occurred during search',
//         ค้นหาสถานที่ในประเทศไทย: 'Search for locations in Thailand',
//         กรุณากรอกชื่อพืช: 'Please enter plant name',
//         'กรุณากรอกค่าที่มากกว่า 0': 'Please enter a value greater than 0',
//         คุณต้องการลบต้นไม้นี้หรือไม่: 'Do you want to delete this plant?',
//         เพิ่มต้นไม้ใหม่: 'Add New Plant',
//         แก้ไขต้นไม้: 'Edit Plant',
//         คุณต้องการลบท่อนี้หรือไม่: 'Do you want to delete this pipe?',
//         'คุณต้องการลบท่อย่อยนี้หรือไม่ ต้นไม้ที่เชื่อมต่อจะถูกลบด้วย':
//             'Do you want to delete this branch pipe? Connected plants will also be deleted',
//         พืชทั่วไป: 'General Plant',
//         เกิดข้อผิดพลาดในการโหลดข้อมูล: 'Error occurred while loading data',
//         ไม่พบข้อมูลแปลงที่ต้องการ: 'Required field data not found',
//         เกิดข้อผิดพลาดที่เซิร์ฟเวอร์: 'Server error occurred',
//         ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: 'Cannot connect to server',
//         ลองใหม่: 'Try Again',
//         'พืช/โซน': 'Plants/Zones',
//         เสร็จสิ้น: 'Complete',
//         'ชื่อ - นามสกุล': 'First Name - Last Name',
//         'กรุณาสร้างพื้นที่หลัก ปั๊ม และสร้างท่อพร้อมต้นไม้ก่อนเข้าสู่โหมดแก้ไข':
//             'Please create main area, pump, and pipes with plants before entering edit mode',
//         กรุณาวางปั๊มและสร้างพื้นที่หลักก่อนบันทึก:
//             'Please place pump and create main area before saving',
//         หยุดวาด: 'Stop Drawing',
//         วาดพื้นที่หลีกเลี่ยง: 'Draw Exclusion Area',
//         วางต้นไม้แบบกดเลือก: 'Place Plants by Clicking',
//         หยุดวางต้นไม้: 'Stop Placing Plants',
//         เสร็จแล้ว: 'Completed',
//         รอวาด: 'Waiting to Draw',
//         วางแล้ว: 'Placed',
//         รอวาง: 'Waiting to Place',
//         มะม่วง: 'Mango',
//         ทุเรียน: 'Durian',
//         สับปะรด: 'Pineapple',
//         'ตร.ม.': 'sq.m.',
//         ไร่: 'rai',
//         ลิตร: 'liters',
//         ล้านลิตร: 'million liters',
//         ระบบออกแบบระบบน้ำพืชสวน: 'Horticulture Irrigation System Design',
//         ย้อนกลับ: 'Undo',
//         ไปข้างหน้า: 'Redo',
//         ขั้นตอนการทำงาน: 'Work Steps',
//         ข้อมูลโครงการ: 'Project Information',
//         ชื่อโครงการ: 'Project Name',
//         ชื่อลูกค้า: 'Customer Name',
//         พื้นที่รวม: 'Total Area',
//         ต้นไม้จริง: 'Actual Plants',
//         น้ำจริงต่อครั้ง: 'Actual Water per Session',
//         'กำลังลองใหม่...': 'Retrying...',
//         กลับไปหน้าหลัก: 'Back to Home',
//         '📊 ข้อมูลโครงการ': '📊 Project Information',
//         '📋 ขั้นตอนการทำงาน': '📋 Work Steps',
//         '✨ โหมดแก้ไขขั้นสูง': '✨ Advanced Edit Mode',
//         'หลังจากบันทึกต้นไม้แล้ว คุณสามารถสร้างท่อย่อยเชื่อมต่อไปยังท่อเมนรองหรือท่อย่อยอื่นได้':
//             'After saving plants, you can create branch pipes connected to sub-main or other branch pipes',
//         คลิกต้นไม้: 'Click Plant',
//         สร้างท่อเชื่อมต่อ: 'Create Connection Pipe',
//         คลิกท่อ: 'Click Pipe',
//         แก้ไขท่อ: 'Edit Pipe',
//         ลาก: 'Drag',
//         ย้ายตำแหน่ง: 'Move Position',
//         สิ่งก่อสร้าง: 'Building',
//         โรงไฟฟ้า: 'Power Plant',
//         แม่น้ำ: 'River',
//         ถนน: 'Road',
//         อื่นๆ: 'Other',
//         สร้างเมื่อ: 'Created on',
//         สร้างการเชื่อมต่อ: 'Create Connection',
//         ไปยังโซน: 'To Zone',
//         โซนปลายทาง: 'Target Zone',
//         โซน: 'Zone',
//         น้ำ: 'Water',
//         ระยะปลูก: 'Planting Distance',
//         'ม.': 'm.',
//         แก้ไข: 'Edit',
//         เชื่อมต่อ: 'Connect',
//         กำลังเชื่อมต่อ: 'Connecting',
//         คลิกท่อที่ต้องการเชื่อมต่อ: 'Click the pipe you want to connect',
//         คลิกแผนที่: 'Click Map',
//         เพิ่มต้นไม้: 'Add Plant',
//         ดับเบิลคลิก: 'Double Click',
//         'แก้ไข/ลบ': 'Edit/Delete',
//         ลบท่อย่อยได้ในโปอปอัพ: 'Delete branch pipes in popup',
//         ลากเชื่อมต่อท่อได้ทุกจุด: 'Drag to connect pipes at any point',
//         หมุนท่อ: 'Rotate Pipe',
//         'แม่นยำทีละ 1°': 'Precise to 1°',
//         ปรับมุมท่อย่อย: 'Adjust Branch Pipe Angle',
//         '0-180°': '0-180°',
//         'กำลังบันทึก...': 'Saving...',
//         'หมุนแผนที่ได้ 360 องศา ด้วยแถบลื่น': 'Rotate map 360 degrees with smooth slider',
//         'ล็อกการซูมและลาก เพื่อป้องกันการเปลี่ยนแปลง': 'Lock zoom and drag to prevent changes',
//         ปรับขนาดท่อและไอคอนเพื่อมองเห็นชัดขึ้น: 'Adjust pipe and icon sizes for better visibility',
//         รีเซ็ตการหมุนและขนาดได้ตลอดเวลา: 'Reset rotation and size anytime',
//         การหมุนจะถูกรีเซ็ตอัตโนมัติเมื่อสร้างภาพ:
//             'Rotation is automatically reset when creating image',
//         ปรับขนาดไอคอนก่อนสร้างภาพเพื่อผลลัพธ์ที่ดี:
//             'Adjust icon size before creating image for better results',
//         'ใช้ Screenshot หากการสร้างภาพอัตโนมัติไม่สำเร็จ':
//             'Use Screenshot if automatic image creation fails',
//         'ปิด popup blocker ถ้ารายงานไม่เปิด': "Turn off popup blocker if report doesn't open",
//         รีเซ็ตการหมุนหากแผนที่ดูแปลก: 'Reset rotation if map looks strange',
//         'ใช้ขนาดไอคอนปานกลาง (1.0x) สำหรับผลลัพธ์ดีที่สุด':
//             'Use medium icon size (1.0x) for best results',
//         ตัวเลือกขั้นสูง: 'Advanced Options',
//         // Add missing or short-form translations
//         ความคืบหน้า: 'Progress',
//         วางต้นไม้: 'Place Plant',
//         'วางท่อเมนรอง + ท่อย่อยปลาย': 'Place Sub-Main + End Branch Pipe',
//         การควบคุม: 'Control',
//         ต้นไม้: 'Plant',
//         พื้นที่ต้องหลีกเลี่ยง: 'Exclusion Area',
//         ปั๊มน้ำ: 'Water Pump',
//         ท่อน้ำ: 'Pipe',
//         วางปั๊มเสร็จแล้ว: 'Water Pump Placed',
//         เปลี่ยนตำแหน่งปั๊ม: 'Change Pump Position',
//         หยุดวางปั๊ม: 'Stop Placing Pump',
//         ประเภท: 'Type',
//         หยุดวางท่อเมน: 'Stop Placing Main Pipe',
//         หยุดวางท่อเมนรอง: 'Stop Placing Sub-Main Pipe',
//     },
//     th: {
//         // Home page
//         water_management_system: 'ระบบจัดการน้ำ',
//         manage_irrigation_fields: 'จัดการแปลงเกษตรและเครือข่ายท่อน้ำ',
//         add_field: 'เพิ่มแปลง',
//         no_fields_yet: 'ยังไม่มีแปลง',
//         start_first_field: 'เริ่มต้นด้วยการสร้างแปลงชลประทานแรกของคุณ',
//         create_first_field: 'สร้างแปลงแรกของคุณ',
//         your_fields: 'แปลงของคุณ',
//         click_field_manage: 'คลิกที่แปลงเพื่อดูและจัดการเครือข่ายท่อน้ำ',
//         delete_field: 'ลบแปลง',
//         delete_confirm: 'คุณแน่ใจหรือไม่ที่จะลบ',
//         delete_warning:
//             'การดำเนินการนี้ไม่สามารถยกเลิกได้ ข้อมูลแปลง จุดปลูกพืช ท่อ และโซนทั้งหมดจะถูกลบอย่างถาวร',
//         cancel: 'ยกเลิก',
//         delete: 'ลบ',
//         deleting: 'กำลังลบ...',
//         plant_type: 'ประเภทพืช',
//         area: 'พื้นที่',
//         plants: 'จำนวนพืช',
//         water_need: 'ความต้องการน้ำ',
//         loading: 'กำลังโหลด...',

//         // Category modal
//         choose_irrigation_category: 'เลือกประเภทการวางแผนระบบชลประทาน',
//         select_irrigation_type: 'เลือกประเภทระบบชลประทานที่เหมาะสมกับความต้องการเกษตรกรรมของคุณ',
//         click_start_planning: 'คลิกเพื่อเริ่มวางแผน',
//         why_choose_system: 'ทำไมต้องเลือกระบบวางแผนชลประทานของเรา?',
//         precision_planning: 'การวางแผนที่แม่นยำ',
//         precision_desc: 'อัลกอริทึมขั้นสูงที่ปรับการกระจายน้ำให้มีประสิทธิภาพสูงสุด',
//         water_conservation: 'การอนุรักษ์น้ำ',
//         water_conservation_desc: 'ระบบอัจฉริยะลดการสูญเสียน้ำในขณะที่รักษาสุขภาพพืชให้ดีที่สุด',
//         data_driven: 'ขับเคลื่อนด้วยข้อมูล',
//         data_driven_desc: 'การวิเคราะห์และรายงานที่ครอบคลุมสำหรับการตัดสินใจที่ชาญฉลาด',

//         // Categories
//         horticulture: 'พืชสวน',
//         horticulture_desc: 'ระบบชลประทานขั้นสูงสำหรับไม้ผลและสวนผลไม้',
//         home_garden: 'สวนบ้าน',
//         home_garden_desc: 'ระบบสปริงเกอร์อัตโนมัติสำหรับสวนในบ้าน',
//         greenhouse: 'โรงเรือน',
//         greenhouse_desc: 'ชลประทานเฉพาะสำหรับการเกษตรในสภาพแวดล้อมควบคุม',
//         field_crop: 'พืชไร่',
//         field_crop_desc: 'ชลประทานขนาดใหญ่สำหรับแปลงเกษตร',

//         // Category features
//         zone_based_planning: 'การวางแผนชลประทานแบบโซน',
//         multiple_plant_types: 'รองรับพืชหลายประเภท',
//         advanced_pipe_layout: 'การปรับแต่งท่อขั้นสูง',
//         elevation_analysis: 'การวิเคราะห์ความสูงและภูมิประเทศ',
//         comprehensive_stats: 'สถิติโครงการที่ครอบคลุม',
//         automated_sprinkler: 'การจัดวางสปริงเกอร์อัตโนมัติ',
//         coverage_optimization: 'การปรับแต่งการครอบคลุม',
//         water_flow_calc: 'การคำนวณการไหลของน้ำ',
//         easy_interface: 'อินเทอร์เฟซที่ใช้งานง่าย',
//         residential_focus: 'เน้นสวนในบ้าน',
//         controlled_environment: 'การวางแผนสภาพแวดล้อมควบคุม',
//         precision_irrigation: 'ระบบชลประทานที่แม่นยำ',
//         climate_control: 'การควบคุมสภาพอากาศ',
//         crop_optimization: 'การปรับแต่งเฉพาะพืช',
//         environmental_monitoring: 'การติดตามสิ่งแวดล้อม',
//         large_scale_planning: 'การวางแผนแปลงขนาดใหญ่',
//         crop_rotation: 'การหมุนเวียนพืช',
//         efficient_distribution: 'การกระจายน้ำที่มีประสิทธิภาพ',
//         weather_integration: 'การรวมสภาพอากาศ',
//         yield_optimization: 'การปรับแต่งผลผลิต',

//         // Navigation
//         dashboard: 'แดชบอร์ด',
//         overview_stats: 'ภาพรวมและสถิติ',
//         residential_watering: 'ระบบรดน้ำในบ้าน',
//         equipment: 'อุปกรณ์',
//         manage_equipment: 'จัดการอุปกรณ์',
//         product: 'ผลิตภัณฑ์',
//         product_recommendations: 'คำแนะนำผลิตภัณฑ์',
//         create_dream_system: 'สร้างระบบชลประทานในฝัน',

//         // Common
//         close: 'ปิด',
//         save: 'บันทึก',
//         edit: 'แก้ไข',
//         confirm: 'ยืนยัน',
//         back: 'กลับ',
//         next: 'ถัดไป',
//         previous: 'ก่อนหน้า',
//         error: 'ข้อผิดพลาด',
//         success: 'สำเร็จ',
//         warning: 'คำเตือน',
//         info: 'ข้อมูล',

//         // Horticulture translations
//         'โครงการระบบน้ำพืชสวน จ.จันทบุรี': 'โครงการระบบน้ำพืชสวน จ.จันทบุรี',
//         กำหนดพืชใหม่: 'กำหนดพืชใหม่',
//         'ชื่อพืช *': 'ชื่อพืช *',
//         'น้ำต่อต้น (ลิตร/ครั้ง) *': 'น้ำต่อต้น (ลิตร/ครั้ง) *',
//         'เช่น มะม่วงพันธุ์ใหม่': 'เช่น มะม่วงพันธุ์ใหม่',
//         'ระยะห่างต้น (ม.) *': 'ระยะห่างต้น (ม.) *',
//         'ระยะห่างแถว (ม.) *': 'ระยะห่างแถว (ม.) *',
//         พื้นที่หลัก: 'พื้นที่หลัก',
//         'ขั้นตอนที่ 1: สร้างพื้นที่หลัก': 'ขั้นตอนที่ 1: สร้างพื้นที่หลัก',
//         'ขั้นตอนที่ 2: กำหนดพืชและโซน': 'ขั้นตอนที่ 2: กำหนดพืชและโซน',
//         'ขั้นตอนที่ 3: วางปั๊มน้ำ': 'ขั้นตอนที่ 3: วางปั๊มน้ำ',
//         'ขั้นตอนที่ 4: วางท่อน้ำ': 'ขั้นตอนที่ 4: วางท่อน้ำ',
//         'ขั้นตอนที่ 5: บันทึกและดูผลลัพธ์': 'ขั้นตอนที่ 5: บันทึกและดูผลลัพธ์',
//         วาดพื้นที่หลักของโครงการบนแผนที่: 'วาดพื้นที่หลักของโครงการบนแผนที่',
//         วางปั๊มน้ำในตำแหน่งที่เหมาะสม: 'วางปั๊มน้ำในตำแหน่งที่เหมาะสม',
//         วางท่อเมนและท่อย่อยเพื่อกระจายน้ำ: 'วางท่อเมนและท่อย่อยเพื่อกระจายน้ำ',
//         บันทึกโครงการและดูผลลัพธ์การออกแบบ: 'บันทึกโครงการและดูผลลัพธ์การออกแบบ',
//         บันทึกและดูผลลัพธ์: 'บันทึกและดูผลลัพธ์',
//         พร้อมบันทึกและดูผลลัพธ์: 'พร้อมบันทึกและดูผลลัพธ์',
//         คลิกปุ่มด้านบนเพื่อบันทึกและไปยังหน้าผลลัพธ์:
//             'คลิกปุ่มด้านบนเพื่อบันทึกและไปยังหน้าผลลัพธ์',
//         ยังไม่พร้อมบันทึก: 'ยังไม่พร้อมบันทึก',
//         ต้องมีพื้นที่หลักและปั๊มน้ำก่อนบันทึกได้: 'ต้องมีพื้นที่หลักและปั๊มน้ำก่อนบันทึกได้',
//         โหมดแก้ไขขั้นสูง: 'โหมดแก้ไขขั้นสูง',
//         เข้าสู่โหมดแก้ไข: 'เข้าสู่โหมดแก้ไข',
//         ออกจากโหมดแก้ไข: 'ออกจากโหมดแก้ไข',
//         คลิกเพื่อเพิ่มต้นไม้: 'คลิกเพื่อเพิ่มต้นไม้',
//         คลิกที่ท่อเมนรองหรือท่อย่อยเพื่อเชื่อมต่อ: 'คลิกที่ท่อเมนรองหรือท่อย่อยเพื่อเชื่อมต่อ',
//         คลิกเพื่อเชื่อมต่อ: 'คลิกเพื่อเชื่อมต่อ',
//         'โครงการบันทึกสำเร็จ! กำลังกลับไปหน้าหลัก': 'โครงการบันทึกสำเร็จ! กำลังกลับไปหน้าหลัก',
//         เกิดข้อผิดพลาด: 'เกิดข้อผิดพลาด',
//         กลับไปสร้างโครงการใหม่: 'กลับไปสร้างโครงการใหม่',
//         ดาวน์โหลดภาพแผนที่: 'ดาวน์โหลดภาพแผนที่',
//         'สร้างรายงาน PDF': 'สร้างรายงาน PDF',
//         'คู่มือ Screenshot': 'คู่มือ Screenshot',
//         บันทึกโครงการ: 'บันทึกโครงการ',
//         โครงการใหม่: 'โครงการใหม่',
//         คำนวณระบบน้ำ: 'คำนวณระบบน้ำ',
//         รายงานการออกแบบระบบน้ำสวนผลไม้: 'รายงานการออกแบบระบบน้ำสวนผลไม้',
//         วันที่สร้าง: 'วันที่สร้าง',
//         ข้อมูลโดยรวม: 'ข้อมูลโดยรวม',
//         จำนวนโซน: 'จำนวนโซน',
//         จำนวนต้นไม้ทั้งหมด: 'จำนวนต้นไม้ทั้งหมด',
//         ปริมาณน้ำต่อครั้ง: 'ปริมาณน้ำต่อครั้ง',
//         ระบบท่อ: 'ระบบท่อ',
//         ท่อเมน: 'ท่อเมน',
//         ท่อเมนรอง: 'ท่อเมนรอง',
//         ท่อย่อย: 'ท่อย่อย',
//         ท่อที่ยาวที่สุดรวมกัน: 'ท่อที่ยาวที่สุดรวมกัน',
//         รายละเอียดแต่ละโซน: 'รายละเอียดแต่ละโซน',
//         พื้นที่โซน: 'พื้นที่โซน',
//         จำนวนต้นไม้: 'จำนวนต้นไม้',
//         ท่อเมนในโซน: 'ท่อเมนในโซน',
//         ท่อเมนรองในโซน: 'ท่อเมนรองในโซน',
//         ท่อย่อยในโซน: 'ท่อย่อยในโซน',
//         เคล็ดลับและแก้ปัญหา: 'เคล็ดลับและแก้ปัญหา',
//         การควบคุมแผนที่: 'การควบคุมแผนที่',
//         การบันทึกภาพแผนที่: 'การบันทึกภาพแผนที่',
//         แก้ปัญหาทั่วไป: 'แก้ปัญหาทั่วไป',
//         หยุดวาดพื้นที่: 'หยุดวาดพื้นที่',
//         วาดพื้นที่หลัก: 'วาดพื้นที่หลัก',
//         สร้างพื้นที่หลักเสร็จแล้ว: 'สร้างพื้นที่หลักเสร็จแล้ว',
//         'เลือกชนิดพืชและแบ่งโซน (ถ้าต้องการ)': 'เลือกชนิดพืชและแบ่งโซน (ถ้าต้องการ)',
//         การจัดการโซน: 'การจัดการโซน',
//         แบ่งเป็นหลายโซน: 'แบ่งเป็นหลายโซน',
//         จะใช้พื้นที่ทั้งหมดเป็นโซนเดียว: 'จะใช้พื้นที่ทั้งหมดเป็นโซนเดียว',
//         การจัดการพืช: 'การจัดการพืช',
//         สร้างพืชใหม่: 'สร้างพืชใหม่',
//         'เลือกชนิดพืช (โซนเดียว)': 'เลือกชนิดพืช (โซนเดียว)',
//         ระยะห่างต้น: 'ระยะห่างต้น',
//         ระยะห่างแถว: 'ระยะห่างแถว',
//         น้ำต่อต้น: 'น้ำต่อต้น',
//         'ล./ครั้ง': 'ล./ครั้ง',
//         พืชในแต่ละโซน: 'พืชในแต่ละโซน',
//         เปลี่ยน: 'เปลี่ยน',
//         ประมาณ: 'ประมาณ',
//         ต้น: 'ต้น',
//         วางปั๊มน้ำ: 'วางปั๊มน้ำ',
//         วางท่อเมน: 'วางท่อเมน',
//         โหมดเชื่อมต่อท่อ: 'โหมดเชื่อมต่อท่อ',
//         ยกเลิกการเชื่อมต่อ: 'ยกเลิกการเชื่อมต่อ',
//         ไม่พบแผนที่: 'ไม่พบแผนที่',
//         เริ่มสร้างภาพแผนที่: 'เริ่มสร้างภาพแผนที่',
//         กำลังสร้างภาพแผนที่: 'กำลังสร้างภาพแผนที่',
//         ดาวน์โหลดภาพแผนที่สำเร็จ: 'ดาวน์โหลดภาพแผนที่สำเร็จ',
//         ไม่สามารถสร้างภาพแผนที่ได้อัตโนมัติ: 'ไม่สามารถสร้างภาพแผนที่ได้อัตโนมัติ',
//         เกิดข้อผิดพลาดในการสร้างภาพ: 'เกิดข้อผิดพลาดในการสร้างภาพ',
//         'เริ่มสร้าง PDF Report': 'เริ่มสร้าง PDF Report',
//         สร้างรายงานสำเร็จ: 'สร้างรายงานสำเร็จ',
//         ไม่สามารถสร้างรายงานอัตโนมัติได้: 'ไม่สามารถสร้างรายงานอัตโนมัติได้',
//         'เกิดข้อผิดพลาดในการสร้าง PDF': 'เกิดข้อผิดพลาดในการสร้าง PDF',
//         'ดาวน์โหลดไฟล์ JSON สำเร็จ': 'ดาวน์โหลดไฟล์ JSON สำเร็จ',
//         'เกิดข้อผิดพลาดในการดาวน์โหลด JSON': 'เกิดข้อผิดพลาดในการดาวน์โหลด JSON',
//         'ดาวน์โหลดไฟล์ CSV สำเร็จ': 'ดาวน์โหลดไฟล์ CSV สำเร็จ',
//         'เกิดข้อผิดพลาดในการดาวน์โหลด CSV': 'เกิดข้อผิดพลาดในการดาวน์โหลด CSV',
//         คัดลอกข้อมูลสถิติลงคลิปบอร์ดเรียบร้อยแล้ว: 'คัดลอกข้อมูลสถิติลงคลิปบอร์ดเรียบร้อยแล้ว',
//         'เปิดข้อมูลในหน้าต่างใหม่ กรุณาคัดลอกด้วยตนเอง':
//             'เปิดข้อมูลในหน้าต่างใหม่ กรุณาคัดลอกด้วยตนเอง',
//         'สร้าง...': 'สร้าง...',
//         ดาวน์โหลดภาพ: 'ดาวน์โหลดภาพ',
//         สร้างรายงาน: 'สร้างรายงาน',
//         ภาพถ่ายดาวเทียม: 'ภาพถ่ายดาวเทียม',
//         'ภาพถ่าย + ป้ายชื่อ': 'ภาพถ่าย + ป้ายชื่อ',
//         แผนที่ถนน: 'แผนที่ถนน',
//         ไม่พบสถานที่ที่ค้นหา: 'ไม่พบสถานที่ที่ค้นหา',
//         ข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง: 'ข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง',
//         'การค้นหาใช้เวลานานเกินไป กรุณาลองใหม่': 'การค้นหาใช้เวลานานเกินไป กรุณาลองใหม่',
//         ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้',
//         เกิดข้อผิดพลาดในการค้นหา: 'เกิดข้อผิดพลาดในการค้นหา',
//         ค้นหาสถานที่ในประเทศไทย: 'ค้นหาสถานที่ในประเทศไทย',
//         กรุณากรอกชื่อพืช: 'กรุณากรอกชื่อพืช',
//         'กรุณากรอกค่าที่มากกว่า 0': 'กรุณากรอกค่าที่มากกว่า 0',
//         คุณต้องการลบต้นไม้นี้หรือไม่: 'คุณต้องการลบต้นไม้นี้หรือไม่',
//         เพิ่มต้นไม้ใหม่: 'เพิ่มต้นไม้ใหม่',
//         แก้ไขต้นไม้: 'แก้ไขต้นไม้',
//         คุณต้องการลบท่อนี้หรือไม่: 'คุณต้องการลบท่อนี้หรือไม่',
//         'คุณต้องการลบท่อย่อยนี้หรือไม่ ต้นไม้ที่เชื่อมต่อจะถูกลบด้วย':
//             'คุณต้องการลบท่อย่อยนี้หรือไม่ ต้นไม้ที่เชื่อมต่อจะถูกลบด้วย',
//         พืชทั่วไป: 'พืชทั่วไป',
//         เกิดข้อผิดพลาดในการโหลดข้อมูล: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
//         ไม่พบข้อมูลแปลงที่ต้องการ: 'ไม่พบข้อมูลแปลงที่ต้องการ',
//         เกิดข้อผิดพลาดที่เซิร์ฟเวอร์: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์',
//         ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
//         ลองใหม่: 'ลองใหม่',
//         'พืช/โซน': 'พืช/โซน',
//         เสร็จสิ้น: 'เสร็จสิ้น',
//         'ชื่อ - นามสกุล': 'ชื่อ - นามสกุล',
//         'กรุณาสร้างพื้นที่หลัก ปั๊ม และสร้างท่อพร้อมต้นไม้ก่อนเข้าสู่โหมดแก้ไข':
//             'กรุณาสร้างพื้นที่หลัก ปั๊ม และสร้างท่อพร้อมต้นไม้ก่อนเข้าสู่โหมดแก้ไข',
//         กรุณาวางปั๊มและสร้างพื้นที่หลักก่อนบันทึก: 'กรุณาวางปั๊มและสร้างพื้นที่หลักก่อนบันทึก',
//         หยุดวาด: 'หยุดวาด',
//         วาดพื้นที่หลีกเลี่ยง: 'วาดพื้นที่หลีกเลี่ยง',
//         วางต้นไม้แบบกดเลือก: 'วางต้นไม้แบบกดเลือก',
//         หยุดวางต้นไม้: 'หยุดวางต้นไม้',
//         เสร็จแล้ว: 'เสร็จแล้ว',
//         รอวาด: 'รอวาด',
//         วางแล้ว: 'วางแล้ว',
//         รอวาง: 'รอวาง',
//         มะม่วง: 'มะม่วง',
//         ทุเรียน: 'ทุเรียน',
//         สับปะรด: 'สับปะรด',
//         'ตร.ม.': 'ตร.ม.',
//         ไร่: 'ไร่',
//         ลิตร: 'ลิตร',
//         ล้านลิตร: 'ล้านลิตร',
//         ระบบออกแบบระบบน้ำพืชสวน: 'ระบบออกแบบระบบน้ำพืชสวน',
//         ย้อนกลับ: 'ย้อนกลับ',
//         ไปข้างหน้า: 'ไปข้างหน้า',
//         ขั้นตอนการทำงาน: 'ขั้นตอนการทำงาน',
//         ข้อมูลโครงการ: 'ข้อมูลโครงการ',
//         ชื่อโครงการ: 'ชื่อโครงการ',
//         ชื่อลูกค้า: 'ชื่อลูกค้า',
//         พื้นที่รวม: 'พื้นที่รวม',
//         ต้นไม้จริง: 'ต้นไม้จริง',
//         น้ำจริงต่อครั้ง: 'น้ำจริงต่อครั้ง',
//         'กำลังลองใหม่...': 'กำลังลองใหม่...',
//         กลับไปหน้าหลัก: 'กลับไปหน้าหลัก',
//         '📊 ข้อมูลโครงการ': '📊 ข้อมูลโครงการ',
//         '📋 ขั้นตอนการทำงาน': '📋 ขั้นตอนการทำงาน',
//         '✨ โหมดแก้ไขขั้นสูง': '✨ โหมดแก้ไขขั้นสูง',
//         'หลังจากบันทึกต้นไม้แล้ว คุณสามารถสร้างท่อย่อยเชื่อมต่อไปยังท่อเมนรองหรือท่อย่อยอื่นได้':
//             'หลังจากบันทึกต้นไม้แล้ว คุณสามารถสร้างท่อย่อยเชื่อมต่อไปยังท่อเมนรองหรือท่อย่อยอื่นได้',
//         คลิกต้นไม้: 'คลิกต้นไม้',
//         สร้างท่อเชื่อมต่อ: 'สร้างท่อเชื่อมต่อ',
//         คลิกท่อ: 'คลิกท่อ',
//         แก้ไขท่อ: 'แก้ไขท่อ',
//         ลาก: 'ลาก',
//         ย้ายตำแหน่ง: 'ย้ายตำแหน่ง',
//         สิ่งก่อสร้าง: 'สิ่งก่อสร้าง',
//         โรงไฟฟ้า: 'โรงไฟฟ้า',
//         แม่น้ำ: 'แม่น้ำ',
//         ถนน: 'ถนน',
//         อื่นๆ: 'อื่นๆ',
//         สร้างเมื่อ: 'สร้างเมื่อ',
//         สร้างการเชื่อมต่อ: 'สร้างการเชื่อมต่อ',
//         ไปยังโซน: 'ไปยังโซน',
//         โซนปลายทาง: 'โซนปลายทาง',
//         โซน: 'โซน',
//         น้ำ: 'น้ำ',
//         ระยะปลูก: 'ระยะปลูก',
//         'ม.': 'ม.',
//         แก้ไข: 'แก้ไข',
//         เชื่อมต่อ: 'เชื่อมต่อ',
//         กำลังเชื่อมต่อ: 'กำลังเชื่อมต่อ',
//         คลิกท่อที่ต้องการเชื่อมต่อ: 'คลิกท่อที่ต้องการเชื่อมต่อ',
//         คลิกแผนที่: 'คลิกแผนที่',
//         เพิ่มต้นไม้: 'เพิ่มต้นไม้',
//         ดับเบิลคลิก: 'ดับเบิลคลิก',
//         'แก้ไข/ลบ': 'แก้ไข/ลบ',
//         ลบท่อย่อยได้ในโปอปอัพ: 'ลบท่อย่อยได้ในโปอปอัพ',
//         ลากเชื่อมต่อท่อได้ทุกจุด: 'ลากเชื่อมต่อท่อได้ทุกจุด',
//         หมุนท่อ: 'หมุนท่อ',
//         'แม่นยำทีละ 1°': 'แม่นยำทีละ 1°',
//         ปรับมุมท่อย่อย: 'ปรับมุมท่อย่อย',
//         '0-180°': '0-180°',
//         'กำลังบันทึก...': 'กำลังบันทึก...',
//         'หมุนแผนที่ได้ 360 องศา ด้วยแถบลื่น': 'หมุนแผนที่ได้ 360 องศา ด้วยแถบลื่น',
//         'ล็อกการซูมและลาก เพื่อป้องกันการเปลี่ยนแปลง':
//             'ล็อกการซูมและลาก เพื่อป้องกันการเปลี่ยนแปลง',
//         ปรับขนาดท่อและไอคอนเพื่อมองเห็นชัดขึ้น: 'ปรับขนาดท่อและไอคอนเพื่อมองเห็นชัดขึ้น',
//         รีเซ็ตการหมุนและขนาดได้ตลอดเวลา: 'รีเซ็ตการหมุนและขนาดได้ตลอดเวลา',
//         การหมุนจะถูกรีเซ็ตอัตโนมัติเมื่อสร้างภาพ: 'การหมุนจะถูกรีเซ็ตอัตโนมัติเมื่อสร้างภาพ',
//         ปรับขนาดไอคอนก่อนสร้างภาพเพื่อผลลัพธ์ที่ดี: 'ปรับขนาดไอคอนก่อนสร้างภาพเพื่อผลลัพธ์ที่ดี',
//         'ใช้ Screenshot หากการสร้างภาพอัตโนมัติไม่สำเร็จ':
//             'ใช้ Screenshot หากการสร้างภาพอัตโนมัติไม่สำเร็จ',
//         'ปิด popup blocker ถ้ารายงานไม่เปิด': 'ปิด popup blocker ถ้ารายงานไม่เปิด',
//         รีเซ็ตการหมุนหากแผนที่ดูแปลก: 'รีเซ็ตการหมุนหากแผนที่ดูแปลก',
//         'ใช้ขนาดไอคอนปานกลาง (1.0x) สำหรับผลลัพธ์ดีที่สุด':
//             'ใช้ขนาดไอคอนปานกลาง (1.0x) สำหรับผลลัพธ์ดีที่สุด',
//         ตัวเลือกขั้นสูง: 'ตัวเลือกขั้นสูง',
//         ความคืบหน้า: 'ความคืบหน้า',
//         วางต้นไม้: 'วางต้นไม้',
//         'วางท่อเมนรอง + ท่อย่อยปลาย': 'วางท่อเมนรอง + ท่อย่อยปลาย',
//         การควบคุม: 'การควบคุม',
//         ต้นไม้: 'ต้นไม้',
//         พื้นที่ต้องหลีกเลี่ยง: 'พื้นที่ต้องหลีกเลี่ยง',
//         ปั๊มน้ำ: 'ปั๊มน้ำ',
//         ท่อน้ำ: 'ท่อน้ำ',
//         วางปั๊มเสร็จแล้ว: 'วางปั๊มเสร็จแล้ว',
//         เปลี่ยนตำแหน่งปั๊ม: 'เปลี่ยนตำแหน่งปั๊ม',
//         หยุดวางปั๊ม: 'หยุดวางปั๊ม',
//         ประเภท: 'ประเภท',
//         หยุดวางท่อเมน: 'หยุดวางท่อเมน',
//         หยุดวางท่อเมนรอง: 'หยุดวางท่อเมนรอง',
//     },
// };

// export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
//     const [language, setLanguage] = useState<Language>('th');

//     useEffect(() => {
//         // Load language preference from localStorage
//         const savedLanguage = localStorage.getItem('language') as Language;
//         if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'th')) {
//             setLanguage(savedLanguage);
//         } else {
//             // Set default to Thai if no saved preference
//             setLanguage('th');
//             localStorage.setItem('language', 'th');
//         }
//     }, []);

//     const handleSetLanguage = (lang: Language) => {
//         setLanguage(lang);
//         localStorage.setItem('language', lang);
//     };

//     const t = (key: string): string => {
//         return translations[language][key] || key;
//     };

//     return (
//         <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
//             {children}
//         </LanguageContext.Provider>
//     );
// };

// export const useLanguage = (): LanguageContextType => {
//     const context = useContext(LanguageContext);
//     if (context === undefined) {
//         throw new Error('useLanguage must be used within a LanguageProvider');
//     }
//     return context;
// };
