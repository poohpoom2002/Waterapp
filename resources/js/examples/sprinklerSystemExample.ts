// sprinklerSystemExample.ts - Example and test file for sprinkler system

import {
    SprinklerConfig,
    SprinklerFormData,
    saveSprinklerConfig,
    loadSprinklerConfig,
    calculateTotalFlowRate,
    validateSprinklerConfig,
    generateSprinklerSummary,
    DEFAULT_SPRINKLER_CONFIG
} from '../utils/sprinklerUtils';

import {
    getOverallStats,
    getFormattedStats,
} from '../utils/horticultureProjectStats';

/**
 * ตัวอย่างการใช้งานระบบหัวฉีด
 */
export const sprinklerSystemExample = () => {
    console.group('🚿 ตัวอย่างระบบหัวฉีดน้ำ');
    
    // ตัวอย่างข้อมูลหัวฉีด
    const exampleFormData: SprinklerFormData = {
        flowRatePerMinute: '3.0',
        pressureBar: '2.5',
        radiusMeters: '2.0'
    };
    
    console.log('📝 ข้อมูลตัวอย่าง:', exampleFormData);
    
    // ตรวจสอบความถูกต้อง
    const validation = validateSprinklerConfig(exampleFormData);
    console.log('✅ ผลการตรวจสอบ:', validation);
    
    if (validation.isValid) {
        // แปลงและบันทึกข้อมูล
        const configData = {
            flowRatePerMinute: parseFloat(exampleFormData.flowRatePerMinute),
            pressureBar: parseFloat(exampleFormData.pressureBar),
            radiusMeters: parseFloat(exampleFormData.radiusMeters)
        };
        
        console.log('🔧 กำลังบันทึกข้อมูล...');
        const saved = saveSprinklerConfig(configData);
        console.log('💾 บันทึกเสร็จ:', saved);
        
        if (saved) {
            // โหลดข้อมูลที่บันทึกแล้ว
            const loadedConfig = loadSprinklerConfig();
            console.log('📂 ข้อมูลที่โหลด:', loadedConfig);
            
            if (loadedConfig) {
                // ทดสอบการคำนวณ
                const plantCounts = [10, 50, 100, 500, 1000];
                
                console.log('\n📊 การคำนวณสำหรับจำนวนต้นไม้ต่างๆ:');
                plantCounts.forEach(count => {
                    const totalFlow = calculateTotalFlowRate(count, loadedConfig.flowRatePerMinute);
                    const summary = generateSprinklerSummary(loadedConfig, count);
                    
                    console.log(`\n🌱 ${count} ต้น:`);
                    console.log(`   • Q รวมต่อนาที: ${totalFlow.toFixed(2)} ลิตร/นาที`);
                    console.log(`   • Q รวมต่อชั่วโมง: ${summary.totalFlowRatePerHour.toFixed(2)} ลิตร/ชั่วโมง`);
                    console.log(`   • น้ำต่อวัน (2 ชม.): ${summary.dailyWaterUsage.toFixed(2)} ลิตร/วัน`);
                    console.log(`   • พื้นที่ครอบคลุมต่อหัว: ${summary.coveragePerSprinkler.toFixed(1)} ตร.ม.`);
                    console.log(`   • รูปแบบ: ${summary.formattedFlowRate}`);
                });
            }
        }
    } else {
        console.error('❌ ข้อมูลไม่ถูกต้อง:', validation.errors);
    }
    
    console.groupEnd();
};

/**
 * ทดสอบการทำงานร่วมกับระบบสถิติ
 */
export const testStatsIntegration = () => {
    console.group('📈 ทดสอบการทำงานร่วมกับระบบสถิติ');
    
    try {
        // ดึงสถิติโดยรวม
        const overallStats = getOverallStats();
        console.log('📊 สถิติโดยรวม:', overallStats);
        
        if (overallStats?.sprinklerFlowRate) {
            console.log('\n🚿 ข้อมูลหัวฉีดในสถิติ:');
            console.log('   • Q รวมต่อนาที:', overallStats.sprinklerFlowRate.formattedFlowRatePerMinute);
            console.log('   • Q รวมต่อชั่วโมง:', overallStats.sprinklerFlowRate.formattedFlowRatePerHour);
            console.log('   • อัตราการไหลต่อต้น:', overallStats.sprinklerFlowRate.flowRatePerPlant, 'ลิตร/นาที');
            console.log('   • แรงดัน:', overallStats.sprinklerFlowRate.pressureBar, 'บาร์');
            console.log('   • รัศมี:', overallStats.sprinklerFlowRate.radiusMeters, 'เมตร');
        } else {
            console.log('⚠️ ยังไม่มีข้อมูลหัวฉีดในระบบ');
        }
        
        // ดึงรายงานที่ฟอร์แมตแล้ว
        const formattedStats = getFormattedStats();
        if (formattedStats) {
            console.log('\n📋 รายงานที่ฟอร์แมตแล้ว:');
            console.log(formattedStats);
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
    }
    
    console.groupEnd();
};

/**
 * ทดสอบ edge cases
 */
export const testEdgeCases = () => {
    console.group('🧪 ทดสอบ Edge Cases');
    
    // ทดสอบข้อมูลไม่ถูกต้อง
    const invalidCases: SprinklerFormData[] = [
        { flowRatePerMinute: '', pressureBar: '2.0', radiusMeters: '1.5' },
        { flowRatePerMinute: '0', pressureBar: '2.0', radiusMeters: '1.5' },
        { flowRatePerMinute: '-5', pressureBar: '2.0', radiusMeters: '1.5' },
        { flowRatePerMinute: '1000000', pressureBar: '2.0', radiusMeters: '1.5' },
        { flowRatePerMinute: '2.5', pressureBar: '', radiusMeters: '1.5' },
        { flowRatePerMinute: '2.5', pressureBar: '0', radiusMeters: '1.5' },
        { flowRatePerMinute: '2.5', pressureBar: '100', radiusMeters: '1.5' },
        { flowRatePerMinute: '2.5', pressureBar: '2.0', radiusMeters: '' },
        { flowRatePerMinute: '2.5', pressureBar: '2.0', radiusMeters: '0' },
        { flowRatePerMinute: '2.5', pressureBar: '2.0', radiusMeters: '1000' },
        { flowRatePerMinute: 'abc', pressureBar: 'def', radiusMeters: 'ghi' },
    ];
    
    invalidCases.forEach((testCase, index) => {
        const validation = validateSprinklerConfig(testCase);
        console.log(`\n❓ Test Case ${index + 1}:`, testCase);
        console.log(`   ผลลัพธ์: ${validation.isValid ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}`);
        if (!validation.isValid) {
            console.log('   ข้อผิดพลาด:', validation.errors);
        }
    });
    
    // ทดสอบการคำนวณกับจำนวนต้นไม้ที่ผิดปกติ
    console.log('\n🔢 ทดสอบการคำนวณกับจำนวนต้นไม้ที่ผิดปกติ:');
    const edgePlantCounts = [0, -10, 1.5, NaN, Infinity];
    const flowRate = 2.5;
    
    edgePlantCounts.forEach(count => {
        const result = calculateTotalFlowRate(count, flowRate);
        console.log(`   ${count} ต้น -> ${result} ลิตร/นาที`);
    });
    
    console.groupEnd();
};

/**
 * สาธิตระบบหัวฉีดแบบครบวงจร
 */
export const demonstrateFullSystem = () => {
    console.group('🎯 สาธิตระบบหัวฉีดแบบครบวงจร');
    
    console.log('🚀 เริ่มต้นสาธิต...\n');
    
    // ขั้นที่ 1: สร้างข้อมูลหัวฉีด
    console.log('1️⃣ การตั้งค่าหัวฉีด');
    const bestPracticeConfig = {
        flowRatePerMinute: 2.8, // เหมาะสมสำหรับพืชผักทั่วไป
        pressureBar: 2.2, // แรงดันปานกลาง
        radiusMeters: 1.8 // ครอบคลุมพอดี
    };
    
    saveSprinklerConfig(bestPracticeConfig);
    console.log('✅ บันทึกการตั้งค่าเรียบร้อย');
    
    // ขั้นที่ 2: จำลองโครงการต่างๆ
    const projects = [
        { name: 'สวนผักครัวเรือน', plants: 25 },
        { name: 'สวนพาณิชย์ขนาดเล็ก', plants: 150 },
        { name: 'สวนพาณิชย์ขนาดกลาง', plants: 500 },
        { name: 'สวนพาณิชย์ขนาดใหญ่', plants: 1200 },
    ];
    
    console.log('\n2️⃣ การคำนวณสำหรับโครงการต่างๆ:');
    projects.forEach(project => {
        const summary = generateSprinklerSummary(bestPracticeConfig, project.plants);
        
        console.log(`\n🏡 ${project.name} (${project.plants} ต้น):`);
        console.log(`   💧 Q รวม: ${summary.formattedFlowRate}`);
        console.log(`   ⏱️  ต่อชั่วโมง: ${summary.totalFlowRatePerHour.toFixed(0)} ลิตร`);
        console.log(`   📅 ต่อวัน (2 ชม.): ${summary.dailyWaterUsage.toLocaleString()} ลิตร`);
        console.log(`   🎯 ครอบคลุม/หัว: ${summary.coveragePerSprinkler.toFixed(1)} ตร.ม.`);
        
        // แนะนำจำนวนหัวฉีด (สมมติพื้นที่ 1 ตร.ม. ต่อต้น)
        const estimatedArea = project.plants * 1; // 1 ตร.ม. ต่อต้น
        const recommendedSprinklers = Math.ceil(estimatedArea / summary.coveragePerSprinkler);
        console.log(`   🚿 หัวฉีดแนะนำ: ${recommendedSprinklers} หัว`);
    });
    
    console.log('\n3️⃣ การเปรียบเทียบกับค่าเริ่มต้น:');
    const defaultSummary = generateSprinklerSummary(DEFAULT_SPRINKLER_CONFIG, 100);
    const customSummary = generateSprinklerSummary(bestPracticeConfig, 100);
    
    console.log(`   📊 ค่าเริ่มต้น (100 ต้น): ${defaultSummary.formattedFlowRate}`);
    console.log(`   📊 ค่าที่กำหนดเอง (100 ต้น): ${customSummary.formattedFlowRate}`);
    console.log(`   📈 ความแตกต่าง: ${(customSummary.totalFlowRate - defaultSummary.totalFlowRate).toFixed(1)} ลิตร/นาที`);
    
    console.log('\n✨ สาธิตเสร็จสิ้น!');
    console.groupEnd();
};

/**
 * ฟังก์ชันหลักสำหรับรันการทดสอบทั้งหมด
 */
export const runAllTests = () => {
    console.log('🧪 เริ่มต้นการทดสอบระบบหัวฉีดน้ำ\n');
    
    sprinklerSystemExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    testStatsIntegration();
    console.log('\n' + '='.repeat(50) + '\n');
    
    testEdgeCases();
    console.log('\n' + '='.repeat(50) + '\n');
    
    demonstrateFullSystem();
    
    console.log('\n🎉 การทดสอบทั้งหมดเสร็จสิ้น!');
};

// Export สำหรับใช้งานจากภายนอก
export default {
    sprinklerSystemExample,
    testStatsIntegration,
    testEdgeCases,
    demonstrateFullSystem,
    runAllTests
};

// ถ้าไฟล์นี้ถูกรันโดยตรง
if (typeof window !== 'undefined') {
    // เพิ่มเข้า global scope สำหรับการทดสอบใน browser console
    (window as any).sprinklerTests = {
        sprinklerSystemExample,
        testStatsIntegration,
        testEdgeCases,
        demonstrateFullSystem,
        runAllTests
    };
    
    console.log('🚿 ระบบทดสอบหัวฉีดพร้อมใช้งาน! ใช้คำสั่ง:');
    console.log('   - sprinklerTests.runAllTests() // รันทดสอบทั้งหมด');
    console.log('   - sprinklerTests.demonstrateFullSystem() // สาธิตระบบ');
    console.log('   - sprinklerTests.sprinklerSystemExample() // ตัวอย่างพื้นฐาน');
}
