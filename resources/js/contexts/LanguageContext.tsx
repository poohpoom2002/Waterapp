import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'th';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations = {
    en: {
        // Home page
        'water_management_system': 'Water Management System',
        'manage_irrigation_fields': 'Manage your irrigation fields and pipe networks',
        'add_field': 'Add Field',
        'no_fields_yet': 'No Fields Yet',
        'start_first_field': 'Start by creating your first irrigation field',
        'create_first_field': 'Create Your First Field',
        'your_fields': 'Your Fields',
        'click_field_manage': 'Click on a field to view and manage its pipe network',
        'delete_field': 'Delete Field',
        'delete_confirm': 'Are you sure you want to delete',
        'delete_warning': 'This action cannot be undone. All field data, planting points, pipes, and zones will be permanently deleted.',
        'cancel': 'Cancel',
        'deleting': 'Deleting...',
        'plant_type': 'Plant Type',
        'area': 'Area',
        'plants': 'Plants',
        'water_need': 'Water Need',

        // Category modal
        'choose_irrigation_category': 'Choose Your Irrigation Planning Category',
        'select_irrigation_type': 'Select the type of irrigation system that best fits your agricultural needs',
        'click_start_planning': 'Click to start planning',
        'why_choose_system': 'Why Choose Our Irrigation Planning System?',
        'precision_planning': 'Precision Planning',
        'precision_desc': 'Advanced algorithms optimize water distribution for maximum efficiency',
        'water_conservation': 'Water Conservation',
        'water_conservation_desc': 'Smart systems reduce water waste while maintaining optimal plant health',
        'data_driven': 'Data-Driven',
        'data_driven_desc': 'Comprehensive analytics and reporting for informed decision making',

        // Categories
        'horticulture': 'Horticulture',
        'horticulture_desc': 'Advanced irrigation system for fruit trees and orchards',
        'home_garden': 'Home Garden',
        'home_garden_desc': 'Automated sprinkler system for residential gardens',
        'greenhouse': 'Greenhouse',
        'greenhouse_desc': 'Specialized irrigation for controlled environment agriculture',
        'field_crop': 'Field Crop',
        'field_crop_desc': 'Large-scale irrigation for agricultural fields',

        // Category features
        'zone_based_planning': 'Zone-based irrigation planning',
        'multiple_plant_types': 'Multiple plant types support',
        'advanced_pipe_layout': 'Advanced pipe layout optimization',
        'elevation_analysis': 'Elevation and terrain analysis',
        'comprehensive_stats': 'Comprehensive project statistics',
        'automated_sprinkler': 'Automated sprinkler placement',
        'coverage_optimization': 'Coverage optimization',
        'water_flow_calc': 'Water flow calculations',
        'easy_interface': 'Easy-to-use interface',
        'residential_focus': 'Residential garden focus',
        'controlled_environment': 'Controlled environment planning',
        'precision_irrigation': 'Precision irrigation systems',
        'climate_control': 'Climate control integration',
        'crop_optimization': 'Crop-specific optimization',
        'environmental_monitoring': 'Environmental monitoring',
        'large_scale_planning': 'Large-scale field planning',
        'crop_rotation': 'Crop rotation support',
        'efficient_distribution': 'Efficient water distribution',
        'weather_integration': 'Weather integration',
        'yield_optimization': 'Yield optimization',

        // Navigation
        'dashboard': 'Dashboard',
        'overview_stats': 'Overview and Statistics',
        'residential_watering': 'Residential Watering System',
        'equipment': 'Equipment',
        'manage_equipment': 'Manage Equipment',
        'product': 'Product',
        'product_recommendations': 'Product Recommendations',
        'create_dream_system': 'Create Your Dream Irrigation System',

        // Common
        'close': 'Close',
        'save': 'Save',
        'edit': 'Edit',
        'confirm': 'Confirm',
        'back': 'Back',
        'next': 'Next',
        'previous': 'Previous',
        'error': 'Error',
        'success': 'Success',
        'warning': 'Warning',
        'info': 'Information',
    },
    th: {
        // Home page
        'water_management_system': 'ระบบจัดการน้ำ',
        'manage_irrigation_fields': 'จัดการแปลงเกษตรและเครือข่ายท่อน้ำ',
        'add_field': 'เพิ่มแปลง',
        'no_fields_yet': 'ยังไม่มีแปลง',
        'start_first_field': 'เริ่มต้นด้วยการสร้างแปลงชลประทานแรกของคุณ',
        'create_first_field': 'สร้างแปลงแรกของคุณ',
        'your_fields': 'แปลงของคุณ',
        'click_field_manage': 'คลิกที่แปลงเพื่อดูและจัดการเครือข่ายท่อน้ำ',
        'delete_field': 'ลบแปลง',
        'delete_confirm': 'คุณแน่ใจหรือไม่ที่จะลบ',
        'delete_warning': 'การดำเนินการนี้ไม่สามารถยกเลิกได้ ข้อมูลแปลง จุดปลูกพืช ท่อ และโซนทั้งหมดจะถูกลบอย่างถาวร',
        'cancel': 'ยกเลิก',
        'delete': 'ลบ',
        'deleting': 'กำลังลบ...',
        'plant_type': 'ประเภทพืช',
        'area': 'พื้นที่',
        'plants': 'จำนวนพืช',
        'water_need': 'ความต้องการน้ำ',
        'loading': 'กำลังโหลด...',

        // Category modal
        'choose_irrigation_category': 'เลือกประเภทการวางแผนระบบชลประทาน',
        'select_irrigation_type': 'เลือกประเภทระบบชลประทานที่เหมาะสมกับความต้องการเกษตรกรรมของคุณ',
        'click_start_planning': 'คลิกเพื่อเริ่มวางแผน',
        'why_choose_system': 'ทำไมต้องเลือกระบบวางแผนชลประทานของเรา?',
        'precision_planning': 'การวางแผนที่แม่นยำ',
        'precision_desc': 'อัลกอริทึมขั้นสูงที่ปรับการกระจายน้ำให้มีประสิทธิภาพสูงสุด',
        'water_conservation': 'การอนุรักษ์น้ำ',
        'water_conservation_desc': 'ระบบอัจฉริยะลดการสูญเสียน้ำในขณะที่รักษาสุขภาพพืชให้ดีที่สุด',
        'data_driven': 'ขับเคลื่อนด้วยข้อมูล',
        'data_driven_desc': 'การวิเคราะห์และรายงานที่ครอบคลุมสำหรับการตัดสินใจที่ชาญฉลาด',

        // Categories
        'horticulture': 'พืชสวน',
        'horticulture_desc': 'ระบบชลประทานขั้นสูงสำหรับไม้ผลและสวนผลไม้',
        'home_garden': 'สวนบ้าน',
        'home_garden_desc': 'ระบบสปริงเกอร์อัตโนมัติสำหรับสวนในบ้าน',
        'greenhouse': 'โรงเรือน',
        'greenhouse_desc': 'ชลประทานเฉพาะสำหรับการเกษตรในสภาพแวดล้อมควบคุม',
        'field_crop': 'พืชไร่',
        'field_crop_desc': 'ชลประทานขนาดใหญ่สำหรับแปลงเกษตร',

        // Category features
        'zone_based_planning': 'การวางแผนชลประทานแบบโซน',
        'multiple_plant_types': 'รองรับพืชหลายประเภท',
        'advanced_pipe_layout': 'การปรับแต่งท่อขั้นสูง',
        'elevation_analysis': 'การวิเคราะห์ความสูงและภูมิประเทศ',
        'comprehensive_stats': 'สถิติโครงการที่ครอบคลุม',
        'automated_sprinkler': 'การจัดวางสปริงเกอร์อัตโนมัติ',
        'coverage_optimization': 'การปรับแต่งการครอบคลุม',
        'water_flow_calc': 'การคำนวณการไหลของน้ำ',
        'easy_interface': 'อินเทอร์เฟซที่ใช้งานง่าย',
        'residential_focus': 'เน้นสวนในบ้าน',
        'controlled_environment': 'การวางแผนสภาพแวดล้อมควบคุม',
        'precision_irrigation': 'ระบบชลประทานที่แม่นยำ',
        'climate_control': 'การควบคุมสภาพอากาศ',
        'crop_optimization': 'การปรับแต่งเฉพาะพืช',
        'environmental_monitoring': 'การติดตามสิ่งแวดล้อม',
        'large_scale_planning': 'การวางแผนแปลงขนาดใหญ่',
        'crop_rotation': 'การหมุนเวียนพืช',
        'efficient_distribution': 'การกระจายน้ำที่มีประสิทธิภาพ',
        'weather_integration': 'การรวมสภาพอากาศ',
        'yield_optimization': 'การปรับแต่งผลผลิต',

        // Navigation
        'dashboard': 'แดชบอร์ด',
        'overview_stats': 'ภาพรวมและสถิติ',
        'residential_watering': 'ระบบรดน้ำในบ้าน',
        'equipment': 'อุปกรณ์',
        'manage_equipment': 'จัดการอุปกรณ์',
        'product': 'ผลิตภัณฑ์',
        'product_recommendations': 'คำแนะนำผลิตภัณฑ์',
        'create_dream_system': 'สร้างระบบชลประทานในฝัน',

        // Common
        'close': 'ปิด',
        'save': 'บันทึก',
        'edit': 'แก้ไข',
        'confirm': 'ยืนยัน',
        'back': 'กลับ',
        'next': 'ถัดไป',
        'previous': 'ก่อนหน้า',
        'error': 'ข้อผิดพลาด',
        'success': 'สำเร็จ',
        'warning': 'คำเตือน',
        'info': 'ข้อมูล',
    }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('th');

    useEffect(() => {
        // Load language preference from localStorage
        const savedLanguage = localStorage.getItem('language') as Language;
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'th')) {
            setLanguage(savedLanguage);
        } else {
            // Set default to Thai if no saved preference
            setLanguage('th');
            localStorage.setItem('language', 'th');
        }
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
    };

    const t = (key: string): string => {
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
