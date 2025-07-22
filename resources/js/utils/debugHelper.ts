// debugHelper.ts - Enhanced Complete Debug System

/**
 * Enhanced Debug Helper สำหรับ Horticulture Irrigation System
 * เพื่อช่วยแก้ไขปัญหาและตรวจสอบข้อมูลให้ถูกต้องและสมบูรณ์
 */

// ========== Enhanced Types ==========
interface Coordinate {
    lat: number;
    lng: number;
}

interface PlantLocation {
    id: string;
    position: Coordinate;
    plantData: {
        name: string;
        plantSpacing: number;
        rowSpacing: number;
        waterNeed: number;
    };
}

interface Zone {
    id: string;
    name: string;
    coordinates: Coordinate[];
    plantData: any;
    plantCount: number;
    totalWaterNeed: number;
    area: number;
    color: string;
}

interface ProjectData {
    projectName: string;
    version?: string;
    totalArea: number;
    mainArea: Coordinate[];
    pump: any;
    zones: Zone[];
    mainPipes: any[];
    subMainPipes: any[];
    exclusionAreas: any[];
    plants: PlantLocation[];
    useZones: boolean;
    createdAt?: string;
    updatedAt?: string;
}

interface DebugReport {
    timestamp: string;
    projectValid: boolean;
    dataConsistency: {
        plantsMatch: boolean;
        waterMatch: boolean;
        zoneIntegrity: boolean;
        pipeConnectivity: boolean;
    };
    performance: {
        dataSize: number;
        complexityScore: number;
        estimatedMemory: number;
        renderTime?: number;
    };
    issues: string[];
    recommendations: string[];
    summary: string;
}

// ========== Core Debug Functions ==========

/**
 * ตรวจสอบและแสดงข้อมูล localStorage พร้อมการวิเคราะห์ความถูกต้องแบบสมบูรณ์
 */
export const debugLocalStorage = (): { data: ProjectData | null; report: DebugReport } => {
    console.group('🔍 Enhanced Debug: LocalStorage Comprehensive Analysis');

    const timestamp = new Date().toISOString();
    const report: DebugReport = {
        timestamp,
        projectValid: false,
        dataConsistency: {
            plantsMatch: false,
            waterMatch: false,
            zoneIntegrity: false,
            pipeConnectivity: false,
        },
        performance: {
            dataSize: 0,
            complexityScore: 0,
            estimatedMemory: 0,
        },
        issues: [],
        recommendations: [],
        summary: '',
    };

    const data = localStorage.getItem('horticultureIrrigationData');
    if (!data) {
        console.error('❌ No data found in localStorage');
        report.issues.push('ไม่พบข้อมูลในระบบ');
        report.recommendations.push('สร้างโครงการใหม่');
        report.summary = 'ไม่พบข้อมูลโครงการ';
        console.groupEnd();
        return { data: null, report };
    }

    try {
        const parsedData: ProjectData = JSON.parse(data);
        report.performance.dataSize = data.length;

        console.log('✅ Project Name:', parsedData.projectName);
        console.log('📏 Total Area:', parsedData.totalArea, 'sq meters');
        console.log('🗺️ Main Area Points:', parsedData.mainArea?.length || 0);
        console.log('🚰 Pump:', parsedData.pump ? '✅ Available' : '❌ Missing');
        console.log('🏞️ Zones:', parsedData.zones?.length || 0);
        console.log('🔧 Main Pipes:', parsedData.mainPipes?.length || 0);
        console.log('🔩 Sub-Main Pipes:', parsedData.subMainPipes?.length || 0);
        console.log('🌱 Plants Array:', parsedData.plants?.length || 0);
        console.log('🚫 Exclusion Areas:', parsedData.exclusionAreas?.length || 0);
        console.log('⚙️ Use Zones:', parsedData.useZones);
        console.log('📅 Version:', parsedData.version || 'Unknown');

        // ========== Enhanced Data Consistency Analysis ==========
        console.group('🔬 Advanced Data Consistency Analysis');

        // ตรวจสอบจำนวนต้นไม้
        const plantsFromArray = parsedData.plants?.length || 0;
        const plantsFromZones =
            parsedData.zones?.reduce((sum, zone) => sum + zone.plantCount, 0) || 0;

        console.log('🌱 Plants Comparison:');
        console.log(`   - From plants array: ${plantsFromArray}`);
        console.log(`   - From zones sum: ${plantsFromZones}`);
        const plantsMatch = Math.abs(plantsFromArray - plantsFromZones) <= 1; // Allow 1 plant tolerance
        console.log(`   - Match: ${plantsMatch ? '✅' : '❌'}`);
        report.dataConsistency.plantsMatch = plantsMatch;

        if (!plantsMatch) {
            report.issues.push(
                `จำนวนต้นไม้ไม่สอดคล้องกัน (Array: ${plantsFromArray}, Zones: ${plantsFromZones})`
            );
            report.recommendations.push('ตรวจสอบการกระจายต้นไม้ในแต่ละโซน');
        }

        // ตรวจสอบปริมาณน้ำ
        const waterFromArray =
            parsedData.plants?.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0) || 0;
        const waterFromZones =
            parsedData.zones?.reduce((sum, zone) => sum + zone.totalWaterNeed, 0) || 0;

        console.log('💧 Water Calculation:');
        console.log(`   - From plants array: ${waterFromArray.toFixed(2)} L`);
        console.log(`   - From zones sum: ${waterFromZones.toFixed(2)} L`);
        const waterMatch = Math.abs(waterFromArray - waterFromZones) < 5; // Allow 5L tolerance
        console.log(`   - Match: ${waterMatch ? '✅' : '❌'}`);
        report.dataConsistency.waterMatch = waterMatch;

        if (!waterMatch) {
            report.issues.push(
                `ปริมาณน้ำไม่สอดคล้องกัน (Array: ${waterFromArray.toFixed(2)}L, Zones: ${waterFromZones.toFixed(2)}L)`
            );
            report.recommendations.push('ตรวจสอบการคำนวณน้ำในแต่ละโซน');
        }

        // ตรวจสอบความสมบูรณ์ของโซน
        let zoneIntegrity = true;
        if (parsedData.useZones && parsedData.zones && parsedData.plants) {
            console.log('🏞️ Zone Integrity Analysis:');
            let totalPlantsInZones = 0;

            parsedData.zones.forEach((zone) => {
                const plantsInZone = parsedData.plants.filter((plant) =>
                    isPointInPolygon(plant.position, zone.coordinates)
                );
                totalPlantsInZones += plantsInZone.length;

                const actualWater = plantsInZone.reduce(
                    (sum, plant) => sum + plant.plantData.waterNeed,
                    0
                );

                const plantCountMatch = Math.abs(plantsInZone.length - zone.plantCount) <= 1;
                const waterNeedMatch = Math.abs(actualWater - zone.totalWaterNeed) < 2;

                console.log(`   ${zone.name}:`);
                console.log(
                    `     - Expected: ${zone.plantCount} plants, ${zone.totalWaterNeed.toFixed(2)} L`
                );
                console.log(
                    `     - Actual: ${plantsInZone.length} plants, ${actualWater.toFixed(2)} L`
                );
                console.log(`     - Plant match: ${plantCountMatch ? '✅' : '❌'}`);
                console.log(`     - Water match: ${waterNeedMatch ? '✅' : '❌'}`);

                if (!plantCountMatch || !waterNeedMatch) {
                    zoneIntegrity = false;
                    report.issues.push(`โซน ${zone.name} มีข้อมูลไม่สอดคล้องกัน`);
                }
            });

            // ตรวจสอบต้นไม้ที่อยู่นอกโซน
            const plantsOutsideZones = plantsFromArray - totalPlantsInZones;
            if (plantsOutsideZones > 0) {
                console.log(`⚠️ Plants outside zones: ${plantsOutsideZones}`);
                report.issues.push(`มีต้นไม้ ${plantsOutsideZones} ต้น อยู่นอกโซนที่กำหนด`);
                zoneIntegrity = false;
            }
        }
        report.dataConsistency.zoneIntegrity = zoneIntegrity;

        // ตรวจสอบการเชื่อมต่อท่อ
        let pipeConnectivity = true;
        if (parsedData.subMainPipes?.length > 0) {
            console.group('🔩 Pipe Connectivity Analysis');
            let totalGeneratedPlants = 0;
            let disconnectedPipes = 0;

            parsedData.subMainPipes.forEach((pipe, index) => {
                const branchCount = pipe.branchPipes?.length || 0;
                const plantsInPipe =
                    pipe.branchPipes?.reduce(
                        (sum: number, branch: any) => sum + (branch.plants?.length || 0),
                        0
                    ) || 0;

                totalGeneratedPlants += plantsInPipe;

                // ตรวจสอบว่าท่อมีการเชื่อมต่อกับโซนหรือไม่
                const connectedToZone = parsedData.useZones
                    ? parsedData.zones.some((zone) => zone.id === pipe.zoneId)
                    : pipe.zoneId === 'main-area';

                if (!connectedToZone) {
                    disconnectedPipes++;
                    pipeConnectivity = false;
                }

                console.log(`Pipe ${index + 1}:`, {
                    id: pipe.id,
                    zoneId: pipe.zoneId,
                    connected: connectedToZone ? '✅' : '❌',
                    coordinates: pipe.coordinates?.length || 0,
                    branchPipes: branchCount,
                    plantsGenerated: plantsInPipe,
                    length: pipe.length?.toFixed(2) || 0,
                });
            });

            console.log(`📊 Total plants generated from pipes: ${totalGeneratedPlants}`);
            console.log(
                `🔍 Matches plants array: ${Math.abs(totalGeneratedPlants - plantsFromArray) <= 1 ? '✅' : '❌'}`
            );
            console.log(`🔗 Disconnected pipes: ${disconnectedPipes}`);

            if (disconnectedPipes > 0) {
                report.issues.push(`มีท่อ ${disconnectedPipes} เส้น ที่ไม่ได้เชื่อมต่อกับโซน`);
                report.recommendations.push('ตรวจสอบการเชื่อมต่อระหว่างท่อและโซน');
            }

            console.groupEnd();
        }
        report.dataConsistency.pipeConnectivity = pipeConnectivity;

        // ========== Performance Analysis ==========
        console.group('⚡ Performance Analysis');

        const complexityFactors = {
            plants: plantsFromArray,
            zones: parsedData.zones?.length || 0,
            subMainPipes: parsedData.subMainPipes?.length || 0,
            branchPipes:
                parsedData.subMainPipes?.reduce(
                    (sum, pipe) => sum + (pipe.branchPipes?.length || 0),
                    0
                ) || 0,
            exclusionAreas: parsedData.exclusionAreas?.length || 0,
        };

        const complexityScore =
            complexityFactors.plants * 0.1 +
            complexityFactors.zones * 5 +
            complexityFactors.subMainPipes * 3 +
            complexityFactors.branchPipes * 1 +
            complexityFactors.exclusionAreas * 2;

        const estimatedMemory =
            complexityFactors.plants * 0.1 +
            complexityFactors.branchPipes * 0.05 +
            report.performance.dataSize / 1024;

        report.performance.complexityScore = complexityScore;
        report.performance.estimatedMemory = estimatedMemory;

        console.log('🎯 Complexity Analysis:', complexityFactors);
        console.log(`📊 Complexity Score: ${complexityScore.toFixed(2)}`);
        console.log(`💾 Estimated Memory: ${estimatedMemory.toFixed(2)} KB`);
        console.log(`📦 Data Size: ${(report.performance.dataSize / 1024).toFixed(2)} KB`);

        if (complexityScore > 500) {
            report.issues.push('โครงการมีความซับซ้อนสูง อาจส่งผลต่อประสิทธิภาพ');
            report.recommendations.push('พิจารณาแบ่งโครงการออกเป็นส่วนย่อย');
        }

        if (estimatedMemory > 1000) {
            report.issues.push('การใช้หน่วยความจำสูง อาจทำให้ระบบทำงานช้า');
            report.recommendations.push('ลดจำนวนองค์ประกอบที่ไม่จำเป็น');
        }

        console.groupEnd();

        // ========== Additional Validations ==========
        console.group('🛡️ Additional Validations');

        // ตรวจสอบพิกัด
        const invalidCoordinates = parsedData.mainArea?.some(
            (coord) =>
                typeof coord.lat !== 'number' ||
                typeof coord.lng !== 'number' ||
                coord.lat < -90 ||
                coord.lat > 90 ||
                coord.lng < -180 ||
                coord.lng > 180
        );

        if (invalidCoordinates) {
            report.issues.push('พบพิกัดที่ไม่ถูกต้องในพื้นที่หลัก');
            report.recommendations.push('ตรวจสอบและแก้ไขพิกัดที่ผิดปกติ');
        }

        // ตรวจสอบ version
        if (!parsedData.version || parsedData.version < '2.0.0') {
            report.issues.push('เวอร์ชันข้อมูลเก่า อาจมีปัญหาความเข้ากันได้');
            report.recommendations.push('อัพเกรดข้อมูลให้เป็นเวอร์ชันล่าสุด');
        }

        // ตรวจสอบความสมบูรณ์ของข้อมูล
        const requiredFields = ['projectName', 'totalArea', 'mainArea', 'plants', 'useZones'];
        const missingFields = requiredFields.filter(
            (field) => !parsedData[field as keyof ProjectData]
        );

        if (missingFields.length > 0) {
            report.issues.push(`ข้อมูลไม่สมบูรณ์: ขาด ${missingFields.join(', ')}`);
            report.recommendations.push('เพิ่มข้อมูลที่หายไป');
        }

        console.groupEnd();
        console.groupEnd();

        // ========== Generate Final Report ==========
        const totalIssues = report.issues.length;
        const dataConsistencyScore =
            (Object.values(report.dataConsistency).filter(Boolean).length / 4) * 100;

        report.projectValid = totalIssues === 0 && dataConsistencyScore >= 75;

        if (totalIssues === 0) {
            report.summary = `โครงการมีข้อมูลถูกต้องและสมบูรณ์ (ความสอดคล้อง: ${dataConsistencyScore.toFixed(1)}%)`;
        } else if (totalIssues <= 2) {
            report.summary = `โครงการมีปัญหาเล็กน้อย ${totalIssues} จุด`;
        } else {
            report.summary = `โครงการมีปัญหาหลายจุด ${totalIssues} จุด ต้องการการแก้ไข`;
        }

        // เพิ่มคำแนะนำทั่วไป
        if (report.projectValid) {
            report.recommendations.push('ข้อมูลดูดี พร้อมใช้งาน');
        } else {
            report.recommendations.push('แก้ไขปัญหาที่พบเพื่อให้ระบบทำงานได้อย่างเต็มประสิทธิภาพ');
        }

        console.log('📋 Final Debug Report:');
        console.log(`   - Valid: ${report.projectValid ? '✅' : '❌'}`);
        console.log(`   - Issues: ${totalIssues}`);
        console.log(`   - Data Consistency: ${dataConsistencyScore.toFixed(1)}%`);
        console.log(`   - Summary: ${report.summary}`);

        return { data: parsedData, report };
    } catch (error) {
        console.error('❌ Error parsing localStorage data:', error);
        report.issues.push('ข้อมูลเสียหาย ไม่สามารถอ่านได้');
        report.recommendations.push('ลบข้อมูลเสียหายและสร้างโครงการใหม่');
        report.summary = 'ข้อมูลเสียหายหรือไม่ถูกต้อง';
        console.groupEnd();
        return { data: null, report };
    }
};

/**
 * Helper function for point-in-polygon test - Enhanced version
 */
const isPointInPolygon = (point: Coordinate, polygon: Coordinate[]): boolean => {
    if (!point || !polygon || polygon.length < 3) return false;

    try {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lat;
            const yi = polygon[i].lng;
            const xj = polygon[j].lat;
            const yj = polygon[j].lng;

            const intersect =
                yi > point.lng !== yj > point.lng &&
                point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
        return inside;
    } catch (error) {
        console.error('Error checking point in polygon:', error);
        return false;
    }
};

/**
 * ตรวจสอบสถานะของ Map Components และปัญหาการ Export - Enhanced version
 */
export const debugMapComponents = (mapRef: React.RefObject<HTMLDivElement>) => {
    console.group('🗺️ Enhanced Debug: Map Components & Export Analysis');

    if (!mapRef.current) {
        console.error('❌ Map ref is null');
        console.groupEnd();
        return;
    }

    const mapContainer = mapRef.current.querySelector('.leaflet-container');
    if (!mapContainer) {
        console.error('❌ Leaflet container not found');
        console.groupEnd();
        return;
    }

    console.log('✅ Map container found');
    console.log('📏 Map dimensions:', {
        width: mapRef.current.offsetWidth,
        height: mapRef.current.offsetHeight,
        aspectRatio: (mapRef.current.offsetWidth / mapRef.current.offsetHeight).toFixed(2),
    });

    // ตรวจสอบ layers detail
    const polygons = mapRef.current.querySelectorAll('path[stroke]');
    const markers = mapRef.current.querySelectorAll('.leaflet-marker-icon');
    const polylines = mapRef.current.querySelectorAll('path[stroke-width]');
    const controls = mapRef.current.querySelectorAll('.leaflet-control-container *');

    console.log('🔷 Map Elements Count:');
    console.log(`   - Polygons (zones/areas): ${polygons.length}`);
    console.log(`   - Polylines (pipes): ${polylines.length}`);
    console.log(`   - Markers (pump/plants): ${markers.length}`);
    console.log(`   - Controls: ${controls.length}`);

    // ตรวจสอบ performance
    const totalElements = polygons.length + polylines.length + markers.length;
    console.log(`📊 Total map elements: ${totalElements}`);

    if (totalElements > 1000) {
        console.warn('⚠️ High element count may affect performance');
    }

    // ตรวจสอบ colors ที่อาจทำให้ html2canvas error
    const elementsWithProblematicColors = mapRef.current.querySelectorAll('*');
    let oklchCount = 0;
    let rgbCount = 0;
    let hexCount = 0;
    const problematicElements: string[] = [];

    elementsWithProblematicColors.forEach((el, index) => {
        const styles = window.getComputedStyle(el);
        const hasOklch =
            styles.color.includes('oklch') ||
            styles.backgroundColor.includes('oklch') ||
            styles.borderColor.includes('oklch');

        if (hasOklch) {
            oklchCount++;
            if (problematicElements.length < 5) {
                problematicElements.push(`Element ${index}: ${el.tagName}.${el.className}`);
            }
        }

        if (styles.color.includes('rgb')) rgbCount++;
        if (styles.color.includes('#')) hexCount++;
    });

    console.log('🎨 Color Analysis:');
    console.log(`   - OKLCH colors: ${oklchCount} ${oklchCount > 0 ? '⚠️' : '✅'}`);
    console.log(`   - RGB colors: ${rgbCount}`);
    console.log(`   - HEX colors: ${hexCount}`);

    if (oklchCount > 0) {
        console.warn(`⚠️ Found ${oklchCount} elements with oklch colors (may cause export issues)`);
        console.log('🔍 Sample problematic elements:', problematicElements);
    }

    // ตรวจสอบ Canvas support และ performance
    const canvas = document.createElement('canvas');
    const canvasSupported = !!(canvas.getContext && canvas.getContext('2d'));
    console.log(`🎨 Canvas 2D support: ${canvasSupported ? '✅' : '❌'}`);

    if (canvasSupported) {
        // ทดสอบ canvas performance
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const startTime = performance.now();
            canvas.width = 800;
            canvas.height = 600;
            ctx.fillStyle = '#1F2937';
            ctx.fillRect(0, 0, 800, 600);
            const endTime = performance.now();

            console.log(`⚡ Canvas performance: ${(endTime - startTime).toFixed(2)}ms`);
        }
    }

    // ตรวจสอบ html2canvas availability
    console.log('📦 Checking html2canvas availability...');
    import('html2canvas')
        .then(() => {
            console.log('✅ html2canvas is available and ready');
        })
        .catch((error) => {
            console.error('❌ html2canvas not available:', error);
        });

    // ตรวจสอบ viewport และ scaling
    const devicePixelRatio = window.devicePixelRatio || 1;
    const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: devicePixelRatio,
        isHighDPI: devicePixelRatio > 1,
    };

    console.log('📱 Viewport Info:', viewport);

    if (viewport.isHighDPI) {
        console.log('✅ High DPI display detected - good for image quality');
    }

    // Memory usage estimation
    const estimatedMemoryUsage =
        totalElements * 0.5 +
        (mapRef.current.offsetWidth * mapRef.current.offsetHeight * 4) / 1024 / 1024;
    console.log(`💾 Estimated memory usage: ${estimatedMemoryUsage.toFixed(2)} MB`);

    if (estimatedMemoryUsage > 50) {
        console.warn('⚠️ High memory usage may cause export issues on low-end devices');
    }

    console.groupEnd();
};

/**
 * ทดสอบและแก้ไขปัญหาการ Export รูปภาพ - Enhanced version
 */
export const debugImageExport = async (mapElement: HTMLElement) => {
    console.group('📷 Enhanced Debug: Image Export Process');

    if (!mapElement) {
        console.error('❌ Map element not provided');
        console.groupEnd();
        return null;
    }

    console.log('🎯 Starting comprehensive export debug process...');

    // Step 1: Environment check
    console.log('🔍 Environment Analysis:');
    console.log(`📏 Element dimensions: ${mapElement.offsetWidth}x${mapElement.offsetHeight}`);
    console.log(`🖥️ Screen resolution: ${window.screen.width}x${window.screen.height}`);
    console.log(`📱 Device pixel ratio: ${window.devicePixelRatio}`);
    console.log(`🌐 User agent: ${navigator.userAgent.substring(0, 50)}...`);

    // Step 2: Performance measurement
    const performanceStart = performance.now();

    // Step 3: Pre-export analysis
    const elementsWithProblematicStyles = mapElement.querySelectorAll('*');
    const styleIssues: string[] = [];
    let elementCount = 0;

    elementsWithProblematicStyles.forEach((el) => {
        elementCount++;
        const styles = window.getComputedStyle(el);
        if (styles.color.includes('oklch')) styleIssues.push('oklch color');
        if (styles.backgroundColor.includes('oklch')) styleIssues.push('oklch background');
        if (styles.transform.includes('translate3d')) styleIssues.push('3d transform');
        if (styles.filter && styles.filter !== 'none') styleIssues.push('CSS filter');
    });

    console.log(`📊 Pre-export analysis:`);
    console.log(`   - Total elements: ${elementCount}`);
    console.log(`   - Style issues found: ${[...new Set(styleIssues)].join(', ') || 'None'}`);

    if (styleIssues.length > 0) {
        console.warn('⚠️ Found potential style issues:', [...new Set(styleIssues)]);
    }

    // Step 4: Memory check
    const estimatedSize = mapElement.offsetWidth * mapElement.offsetHeight * 4; // 4 bytes per pixel
    const estimatedSizeMB = estimatedSize / 1024 / 1024;
    console.log(`💾 Estimated export size: ${estimatedSizeMB.toFixed(2)} MB`);

    if (estimatedSizeMB > 10) {
        console.warn('⚠️ Large export size may cause memory issues');
    }

    // Step 5: Basic canvas test
    try {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 200;
        testCanvas.height = 200;
        const ctx = testCanvas.getContext('2d');

        if (ctx) {
            const gradientStart = performance.now();

            // Test basic drawing
            ctx.fillStyle = '#1F2937';
            ctx.fillRect(0, 0, 200, 200);

            // Test gradient
            const gradient = ctx.createLinearGradient(0, 0, 200, 200);
            gradient.addColorStop(0, '#3B82F6');
            gradient.addColorStop(1, '#1E40AF');
            ctx.fillStyle = gradient;
            ctx.fillRect(50, 50, 100, 100);

            // Test text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Test', 100, 120);

            const gradientEnd = performance.now();

            const testDataUrl = testCanvas.toDataURL('image/jpeg', 0.8);
            console.log('✅ Basic canvas test passed');
            console.log(`📊 Test image size: ${Math.round(testDataUrl.length / 1024)}KB`);
            console.log(`⚡ Canvas drawing time: ${(gradientEnd - gradientStart).toFixed(2)}ms`);
        } else {
            console.error('❌ Canvas context not available');
        }
    } catch (error) {
        console.error('❌ Basic canvas test failed:', error);
    }

    // Step 6: Try html2canvas import and test
    try {
        const html2canvas = await import('html2canvas');
        console.log('✅ html2canvas imported successfully');

        // Step 7: Simple capture test
        console.log('📸 Attempting enhanced capture...');

        const captureStart = performance.now();

        const canvas = await html2canvas.default(mapElement, {
            useCORS: true,
            allowTaint: false,
            scale: Math.min(2, window.devicePixelRatio), // Adaptive scale
            logging: false,
            backgroundColor: '#1F2937',
            imageTimeout: 15000,
            removeContainer: false,
            foreignObjectRendering: false,
            onclone: (clonedDoc) => {
                console.log('🔄 Cloning and cleaning document...');

                // Remove problematic elements
                const controls = clonedDoc.querySelectorAll('.leaflet-control-container');
                controls.forEach((control) => control.remove());

                // Fix problematic colors
                const elements = clonedDoc.querySelectorAll('*');
                let fixedElements = 0;

                elements.forEach((el: Element) => {
                    const htmlEl = el as HTMLElement;

                    // Fix oklch colors
                    if (htmlEl.style.color?.includes('oklch')) {
                        htmlEl.style.color = 'rgb(255, 255, 255)';
                        fixedElements++;
                    }
                    if (htmlEl.style.backgroundColor?.includes('oklch')) {
                        htmlEl.style.backgroundColor = 'transparent';
                        fixedElements++;
                    }

                    // Remove problematic transforms
                    if (htmlEl.style.transform?.includes('translate3d')) {
                        htmlEl.style.transform = htmlEl.style.transform.replace(
                            /translate3d\([^)]*\)/,
                            'translate(0,0)'
                        );
                        fixedElements++;
                    }
                });

                console.log(`🔧 Fixed ${fixedElements} problematic elements`);
            },
        });

        const captureEnd = performance.now();

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const finalSizeKB = Math.round(dataUrl.length / 1024);

        console.log('✅ Enhanced export successful!');
        console.log(`📊 Final image size: ${finalSizeKB}KB`);
        console.log(`🖼️ Canvas dimensions: ${canvas.width}x${canvas.height}`);
        console.log(`⚡ Total capture time: ${(captureEnd - captureStart).toFixed(2)}ms`);

        // Quality analysis
        const compressionRatio = (estimatedSizeMB * 1024) / finalSizeKB;
        console.log(`📈 Compression ratio: ${compressionRatio.toFixed(2)}:1`);

        const performanceEnd = performance.now();
        console.log(`🎯 Total debug time: ${(performanceEnd - performanceStart).toFixed(2)}ms`);

        console.groupEnd();
        return dataUrl;
    } catch (error) {
        console.error('❌ html2canvas capture failed:', error);

        // Enhanced fallback with more details
        try {
            console.log('🔄 Creating enhanced fallback image...');

            const fallbackCanvas = document.createElement('canvas');
            fallbackCanvas.width = mapElement.offsetWidth || 800;
            fallbackCanvas.height = mapElement.offsetHeight || 600;
            const ctx = fallbackCanvas.getContext('2d');

            if (ctx) {
                // Background
                ctx.fillStyle = '#1F2937';
                ctx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);

                // Border
                ctx.strokeStyle = '#374151';
                ctx.lineWidth = 2;
                ctx.strokeRect(10, 10, fallbackCanvas.width - 20, fallbackCanvas.height - 20);

                // Title
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(
                    'แผนผังระบบน้ำสวนผลไม้',
                    fallbackCanvas.width / 2,
                    fallbackCanvas.height / 2 - 80
                );

                // Error message
                ctx.font = '18px Arial';
                ctx.fillStyle = '#F59E0B';
                ctx.fillText(
                    '(ไม่สามารถส่งออกแผนที่ได้)',
                    fallbackCanvas.width / 2,
                    fallbackCanvas.height / 2 - 40
                );

                // Instructions
                ctx.font = '16px Arial';
                ctx.fillStyle = '#9CA3AF';
                ctx.fillText(
                    'กรุณาใช้ screenshot หรือลองใหม่อีกครั้ง',
                    fallbackCanvas.width / 2,
                    fallbackCanvas.height / 2
                );

                // Error details
                ctx.font = '12px Arial';
                ctx.fillStyle = '#6B7280';
                const errorMessage = error instanceof Error ? error.message : String(error);
                ctx.fillText(
                    `Error: ${errorMessage.substring(0, 50)}...`,
                    fallbackCanvas.width / 2,
                    fallbackCanvas.height / 2 + 40
                );

                // Timestamp
                ctx.fillText(
                    'สร้างเมื่อ: ' + new Date().toLocaleDateString('th-TH'),
                    fallbackCanvas.width / 2,
                    fallbackCanvas.height / 2 + 80
                );
                // Debug info
                ctx.textAlign = 'left';
                ctx.fillText(
                    `Size: ${mapElement.offsetWidth}x${mapElement.offsetHeight}`,
                    20,
                    fallbackCanvas.height - 60
                );
                ctx.fillText(`Elements: ${elementCount}`, 20, fallbackCanvas.height - 40);
                ctx.fillText(`Issues: ${styleIssues.length}`, 20, fallbackCanvas.height - 20);

                console.log('✅ Enhanced fallback image created with debug info');

                const fallbackDataUrl = fallbackCanvas.toDataURL('image/jpeg', 0.8);
                console.groupEnd();
                return fallbackDataUrl;
            }
        } catch (fallbackError) {
            console.error('❌ Enhanced fallback creation also failed:', fallbackError);
        }

        console.groupEnd();
        return null;
    }
};

/**
 * ล้างข้อมูลและรีเซ็ต - Enhanced version
 */
export const resetSystem = () => {
    console.group('🔄 Enhanced Debug: System Reset');

    try {
        // ล้าง localStorage
        const beforeSize = localStorage.length;
        localStorage.removeItem('horticultureIrrigationData');
        localStorage.removeItem('horticultureIrrigationBackup');
        localStorage.removeItem('horticultureSettings');
        console.log(`✅ Cleared localStorage (${beforeSize} items removed)`);

        // ล้าง sessionStorage
        try {
            const sessionSize = sessionStorage.length;
            sessionStorage.clear();
            console.log(`✅ Cleared sessionStorage (${sessionSize} items removed)`);
        } catch (error) {
            console.log('⚠️ Could not clear sessionStorage:', error);
        }

        // ล้าง caches ถ้ามี
        if ('caches' in window) {
            caches
                .keys()
                .then((cacheNames) => {
                    return Promise.all(
                        cacheNames.map((cacheName) => {
                            console.log(`🗑️ Clearing cache: ${cacheName}`);
                            return caches.delete(cacheName);
                        })
                    );
                })
                .then(() => {
                    console.log('✅ All caches cleared');
                })
                .catch((error) => {
                    console.log('⚠️ Could not clear all caches:', error);
                });
        }

        console.log('🔄 System reset complete. Reloading page...');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        console.error('❌ Error during system reset:', error);
    }

    console.groupEnd();
};

/**
 * ส่งออกข้อมูล debug แบบสมบูรณ์
 */
export const exportDebugData = () => {
    console.group('💾 Enhanced Debug: Export Comprehensive Data');

    const { data, report } = debugLocalStorage();

    if (!data) {
        console.error('❌ No data to export');
        console.groupEnd();
        return;
    }

    const debugInfo = {
        metadata: {
            timestamp: new Date().toISOString(),
            exportVersion: '2.0.0',
            userAgent: navigator.userAgent,
            url: window.location.href,
            language: navigator.language,
        },
        environment: {
            screenResolution: {
                width: window.screen.width,
                height: window.screen.height,
                devicePixelRatio: window.devicePixelRatio,
                colorDepth: window.screen.colorDepth,
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
            },
            memory: {
                // @ts-ignore
                usedJSHeapSize: performance.memory?.usedJSHeapSize || 0,
                // @ts-ignore
                totalJSHeapSize: performance.memory?.totalJSHeapSize || 0,
                // @ts-ignore
                jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit || 0,
            },
        },
        projectData: data,
        debugReport: report,
        performanceMetrics: {
            loadTime: performance.now(),
            resourceCount: performance.getEntriesByType('resource').length,
            navigationTiming: performance.getEntriesByType('navigation')[0],
        },
        browserSupport: {
            canvas: !!(
                document.createElement('canvas').getContext &&
                document.createElement('canvas').getContext('2d')
            ),
            localStorage: typeof Storage !== 'undefined',
            sessionStorage: typeof sessionStorage !== 'undefined',
            fetch: typeof fetch !== 'undefined',
            webWorkers: typeof Worker !== 'undefined',
            offlineSupport: 'serviceWorker' in navigator,
            modernJS: typeof Promise !== 'undefined' && typeof Array.from !== 'undefined',
        },
    };

    const blob = new Blob([JSON.stringify(debugInfo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horticulture-debug-comprehensive-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('✅ Comprehensive debug data exported');
    console.log(`📊 Export size: ${Math.round(JSON.stringify(debugInfo).length / 1024)}KB`);
    console.groupEnd();
};

/**
 * แสดงคำแนะนำการแก้ไขปัญหาที่อัพเดทและสมบูรณ์
 */
export const showTroubleshootingTips = () => {
    console.group('💡 Enhanced Troubleshooting Guide - Complete Edition');

    console.log(`
🔧 Complete Troubleshooting Guide (Version 2.0) 🔧

=== 1. จำนวนต้นไม้ไม่ตรงกัน ===
✅ วิธีแก้ไข:
   • ใช้ debugLocalStorage() เพื่อดูรายละเอียดความแตกต่าง
   • ตรวจสอบต้นไม้ที่อยู่นอกโซนด้วย Console
   • ลองสร้างท่อเมนรองใหม่ในโซนที่มีปัญหา
   • หากยังไม่ตรงกัน ให้ลบและสร้างโซนใหม่

🔍 การตรวจสอบ:
   • ค่าจริง: นับจากจุดบนแผนที่ (แม่นยำ 100%)
   • ค่าประมาณ: คำนวณจากพื้นที่และระยะห่าง
   • ความต่าง < 1 ต้น = ปกติ

=== 2. ระยะห่างต้นไม้ไม่สม่ำเสมอ ===
✅ วิธีแก้ไข:
   • ระบบจะใช้ plantSpacing จาก plantData โดยอัตโนมัติ
   • ต้นไม้สร้างตามท่อย่อย ระยะห่างขึ้นอยู่กับความยาวท่อ
   • หากต้องการระยะห่างแน่นขึ้น ให้วางท่อย่อยให้หนาแน่นมากขึ้น
   • ใช้ Debug panel เพื่อดูการกระจายต้นไม้

🎯 การปรับแต่ง:
   • ท่อย่อยสั้น = ต้นไม้หนาแน่น
   • ท่อย่อยยาว = ต้นไม้กระจาย
   • ระยะห่างขั้นต่ำ = 1.5 เมตร

=== 3. ปริมาณน้ำไม่ถูกต้อง ===
✅ วิธีแก้ไข:
   • น้ำรวม = จำนวนต้นจริง × น้ำต่อต้น (แม่นยำ 100%)
   • ตรวจสอบ waterNeed ของแต่ละชนิดพืช
   • ใช้ generateCompleteProjectStats() เพื่อดูรายละเอียด
   • ความต่าง < 5 ลิตร = ปกติ

💧 การตรวจสอบ:
   • "น้ำจริง" = ข้อมูลที่ใช้ในการออกแบบ
   • ดูใน Results page ส่วน "ข้อมูลที่แม่นยำ"

=== 4. การบันทึกภาพแผนที่ ===
✅ วิธีแก้ไข:
   • ใช้ Chrome เวอร์ชันล่าสุด (แนะนำ)
   • รอให้แผนที่โหลดเสร็จก่อนกด export (3-5 วินาที)
   • ปิด popup/modal อื่นๆ ก่อน export
   • ลดขนาดหน้าต่างถ้าแผนที่ใหญ่มาก
   • ใช้ debugImageExport() เพื่อหาสาเหตุเฉพาะ

🖼️ การแก้ไขปัญหา Export:
   • OKLCH colors → จะแปลงเป็น RGB อัตโนมัติ
   • หน่วยความจำไม่พอ → ลดคุณภาพเป็น 80%
   • Element มากเกินไป → ซ่อนชั้นข้อมูลบางส่วน
   • ล้มเหลวสุดท้าย → ใช้ screenshot แทน

=== 5. ประสิทธิภาพระบบ ===
✅ การเพิ่มประสิทธิภาพ:
   • ต้นไม้ > 1000 ต้น → แบ่งโครงการย่อย
   • ท่อ > 100 เส้น → ลดความซับซ้อน
   • Complexity Score > 500 → ปรับลดจำนวนองค์ประกอบ
   • Memory > 50MB → ลดขนาดพื้นที่หรือจำนวนโซน

⚡ การติดตาม:
   • ใช้ performanceCheck() เพื่อดูคะแนน
   • ดู Memory usage ใน Debug panel
   • คะแนนที่ดี: Complexity < 300, Memory < 20MB

=== 6. การตรวจสอบความถูกต้อง ===
✅ ขั้นตอนการตรวจสอบ:
   1. เปิด Results page
   2. กดปุ่ม "แสดงรายงานสถิติ"
   3. ดูส่วน "ข้อมูลที่แม่นยำ"
   4. ตรวจสอบว่าข้อมูลตรงกับที่คาดหวัง
   5. หากไม่ตรง ใช้ Debug commands

🔍 การใช้ Debug Commands:
   • debugLocalStorage() - วิเคราะห์ความถูกต้อง
   • debugMapComponents(mapRef) - ตรวจสอบแผนที่
   • debugImageExport(element) - ทดสอบ export
   • generateCompleteProjectStats(data) - สถิติสมบูรณ์
   • exportDebugData() - ข้อมูล debug ครบถ้วน

=== 7. การแก้ไขปัญหาเฉพาะ ===

📱 ปัญหาบน Mobile:
   • ใช้ landscape mode สำหรับการออกแบบ
   • Touch controls อาจไม่ตอบสนอง → ใช้ mouse/trackpad
   • Memory จำกัด → ลดขนาดโครงการ

🖥️ ปัญหาบน Desktop:
   • Browser เก่า → อัพเดทเป็นเวอร์ชันล่าสุด
   • RAM ไม่พอ → ปิดแท็บอื่น
   • CPU ช้า → ลดความซับซ้อนโครงการ

🌐 ปัญหา Network:
   • แผนที่โหลดช้า → ใช้ offline mode ถ้ามี
   • Tile ไม่แสดง → เปลี่ยน map style
   • Search ไม่ทำงาน → ใส่พิกัดด้วยตนเอง

=== 8. คำแนะนำการใช้งานขั้นสูง ===

🎯 การออกแบบที่ดี:
   • วางปั๊มให้ใกล้ศูนย์กลางพื้นที่
   • แบ่งโซนตามประเภทพืช
   • วางท่อเมนให้สั้นที่สุด
   • ใช้ exclusion areas สำหรับอุปสรรค

📊 การวิเคราะห์ผลลัพธ์:
   • ดู System Efficiency ควรเกิน 70%
   • Water Distribution Balance ควรเกิน 80%
   • Pipe Optimization ควรเกิน 60%
   • Plant Density ตรวจสอบให้เหมาะสมกับพืช

🔧 การบำรุงรักษา:
   • Complexity: Low = ง่าย, High = ยาก
   • Accessibility Score > 7 = เข้าถึงง่าย
   • Maintenance complexity ขึ้นกับจำนวนท่อ

=== 9. Emergency Fixes ===

🚨 เมื่อระบบเสีย:
   1. resetSystem() - รีเซ็ตทั้งหมด (ใช้เป็นขั้นสุดท้าย)
   2. exportDebugData() - บันทึกข้อมูลก่อนรีเซ็ต
   3. clearProjectData() - ลบข้อมูลโครงการเท่านั้น
   4. loadProjectData() - โหลดข้อมูลใหม่

💾 การสำรองข้อมูล:
   • ระบบสำรอง backup อัตโนมัติใน localStorage
   • ส่งออก JSON เป็นไฟล์สำรอง
   • ถ่ายภาพหน้าจอสำคัญไว้

=== 10. การติดต่อและรายงานปัญหา ===

📝 รายงานปัญหา:
   1. ใช้ debugLocalStorage() - รวบรวมข้อมูล
   2. ใช้ exportDebugData() - ส่งออกข้อมูล debug
   3. บันทึก error message จาก Console
   4. แนบ screenshot หน้าจอ
   5. ระบุขั้นตอนที่เกิดปัญหา

🎯 ข้อมูลที่ต้องการ:
   • Browser version และ OS
   • ขนาดโครงการ (จำนวนต้นไม้, โซน, ท่อ)
   • Error messages จาก Console
   • Debug report file

💡 Tips สุดท้าย:
   • กด F12 เปิด Console เสมอ เพื่อดู log
   • Save project บ่อยๆ เป็น JSON backup
   • ทดสอบ export ก่อนส่งมอบงาน
   • ใช้ Debug panel เพื่อติดตามปัญหา

🌟 Quick Reference Commands:
   window.debugHorticulture.debugLocalStorage()
   window.debugHorticulture.performanceCheck()
   window.debugHorticulture.exportDebugData()
   window.debugHorticulture.showTips()

Happy Debugging! 🌱✨
    `);

    console.groupEnd();
};

/**
 * ฟังก์ชันตรวจสอบประสิทธิภาพ - Enhanced version
 */
export const performanceCheck = () => {
    console.group('⚡ Enhanced Performance Analysis');

    const { data, report } = debugLocalStorage();

    if (!data) {
        console.log('❌ No data to check');
        console.groupEnd();
        return;
    }

    console.log('📊 Comprehensive Performance Analysis:');

    // Data size analysis
    const dataString = JSON.stringify(data);
    const dataSize = dataString.length;
    const dataSizeKB = dataSize / 1024;

    console.log(`📦 Data Analysis:`);
    console.log(`   - Raw size: ${dataSizeKB.toFixed(2)} KB`);
    console.log(`   - Compression potential: ${(dataSize / (dataSize * 0.3)).toFixed(1)}:1`);

    if (dataSizeKB > 1024) {
        console.warn('⚠️ Large data size (>1MB) may cause performance issues');
    }

    // Complexity analysis
    const complexity = {
        plants: data.plants?.length || 0,
        zones: data.zones?.length || 0,
        subMainPipes: data.subMainPipes?.length || 0,
        branchPipes:
            data.subMainPipes?.reduce((sum, pipe) => sum + (pipe.branchPipes?.length || 0), 0) || 0,
        exclusionAreas: data.exclusionAreas?.length || 0,
        mainPipes: data.mainPipes?.length || 0,
    };

    console.log('🎯 Complexity Breakdown:', complexity);

    // Performance scoring
    const performanceScores = {
        dataSize: Math.max(0, 100 - dataSizeKB / 10), // Penalty after 1MB
        plantCount: Math.max(0, 100 - complexity.plants / 10), // Penalty after 1000 plants
        pipeComplexity: Math.max(0, 100 - (complexity.subMainPipes + complexity.branchPipes) / 5), // Penalty after 500 pipes
        zoneCount: Math.max(0, 100 - complexity.zones * 2), // Penalty after 50 zones
        exclusionCount: Math.max(0, 100 - complexity.exclusionAreas * 5), // Penalty after 20 exclusions
    };

    const overallScore =
        Object.values(performanceScores).reduce((sum, score) => sum + score, 0) /
        Object.keys(performanceScores).length;

    console.log('🏆 Performance Scores:');
    Object.entries(performanceScores).forEach(([metric, score]) => {
        const grade = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
        console.log(`   ${grade} ${metric}: ${score.toFixed(1)}/100`);
    });

    console.log(`📊 Overall Performance: ${overallScore.toFixed(1)}/100`);

    // Memory estimation
    const estimatedMemory =
        complexity.plants * 0.1 + complexity.branchPipes * 0.05 + complexity.zones * 2 + dataSizeKB;

    console.log(`💾 Estimated Memory Usage: ${estimatedMemory.toFixed(2)} KB`);

    // Recommendations
    console.log('💡 Performance Recommendations:');

    if (overallScore >= 80) {
        console.log('   ✅ Excellent performance - no optimization needed');
    } else if (overallScore >= 60) {
        console.log('   🟡 Good performance - minor optimizations possible');
        if (complexity.plants > 500)
            console.log('   • Consider reducing plant count or splitting project');
        if (complexity.branchPipes > 100) console.log('   • Simplify pipe network if possible');
    } else {
        console.log('   🔴 Performance issues detected - optimization recommended');
        if (dataSizeKB > 500) console.log('   • Large data size - consider project splitting');
        if (complexity.plants > 1000) console.log('   • High plant count affecting performance');
        if (complexity.branchPipes > 200)
            console.log('   • Complex pipe network - simplify design');
        if (complexity.zones > 20) console.log('   • Too many zones - consolidate if possible');
    }

    // Browser performance
    if (typeof performance !== 'undefined' && (performance as any).memory) {
        const memory = (performance as any).memory;
        console.log('🖥️ Browser Memory:');
        console.log(`   - Used: ${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`);
        console.log(`   - Total: ${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`);
        console.log(`   - Limit: ${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`);

        const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (memoryUsage > 80) {
            console.warn('⚠️ High memory usage - may cause browser slowdown');
        }
    }

    // Render performance estimation
    const estimatedRenderTime =
        complexity.plants * 0.1 + complexity.branchPipes * 0.5 + complexity.zones * 2;

    console.log(`🎨 Estimated Render Time: ${estimatedRenderTime.toFixed(2)}ms`);

    if (estimatedRenderTime > 100) {
        console.warn('⚠️ High render time - map interactions may be slow');
    }

    console.groupEnd();

    return {
        overallScore,
        performanceScores,
        complexity,
        dataSize: dataSizeKB,
        estimatedMemory,
        estimatedRenderTime,
        recommendations: overallScore < 60 ? 'optimization_needed' : 'good',
    };
};

// ========== Export สำหรับใช้งานผ่าน window object ==========
if (typeof window !== 'undefined') {
    (window as any).debugHorticulture = {
        debugLocalStorage,
        debugMapComponents,
        debugImageExport,
        resetSystem,
        exportDebugData,
        showTips: showTroubleshootingTips,
        performanceCheck,
    };

    console.log(`
🌱 Enhanced Horticulture Debug Helper v2.0 Loaded! 🌱

🎯 Available Commands:
debugHorticulture.debugLocalStorage() - ตรวจสอบข้อมูลความถูกต้อง
debugHorticulture.debugMapComponents(mapRef) - วิเคราะห์แผนที่และ export
debugHorticulture.debugImageExport(mapElement) - ทดสอบการ export รูปภาพ
debugHorticulture.performanceCheck() - วิเคราะห์ประสิทธิภาพ
debugHorticulture.exportDebugData() - ส่งออกข้อมูล debug ครบถ้วน
debugHorticulture.resetSystem() - รีเซ็ตระบบ (ใช้เมื่อจำเป็น)
debugHorticulture.showTips() - แสดงคำแนะนำการแก้ไขปัญหา

💡 Quick Start: debugHorticulture.debugLocalStorage()
🆘 Help: debugHorticulture.showTips()
    `);
}
