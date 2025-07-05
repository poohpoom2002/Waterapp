import {
    HorticultureProjectData,
    Zone,
    MainPipe,
    SubMainPipe,
    BranchPipe,
    Coordinate,
    formatArea,
    formatDistance,
    formatWaterVolume,
    calculatePipeLength,
    getZoneColor,
    isPointInPolygon,
} from './horticultureUtils';

export interface ZoneDetailedStats {
    zoneId: string;
    zoneName: string; // ชื่อโซน
    plantType: string;
    plantSpacing: number; // ระยะห่างระหว่างต้น (เมตร)
    rowSpacing: number; // ระยะห่างระหว่างแถว (เมตร)
    plantCount: number; // จำนวนต้นไม้จริง
    waterNeedPerPlant: number; // น้ำต่อต้นต่อครั้ง (ลิตร)
    totalZoneWaterNeed: number; // น้ำรวมต่อโซนต่อครั้ง (ลิตร)
    zoneArea: number; // พื้นที่โซน (ตารางเมตร)

    // ท่อย่อย (Branch Pipes) - สถิติรายละเอียด
    longestBranchPipe: number; // ท่อย่อยที่ยาวที่สุด (เมตร)
    shortestBranchPipe: number; // ท่อย่อยที่สั้นที่สุด (เมตร)
    averageBranchPipeLength: number; // ความยาวท่อย่อยเฉลี่ย (เมตร)
    totalBranchPipeLength: number; // ความยาวท่อย่อยรวม (เมตร)
    branchPipeCount: number; // จำนวนท่อย่อย

    // ท่อเมนรอง (Sub-Main Pipes) - สถิติรายละเอียด
    longestSubMainPipe: number; // ท่อเมนรองที่ยาวที่สุด (เมตร)
    shortestSubMainPipe: number; // ท่อเมนรองที่สั้นที่สุด (เมตร)
    averageSubMainPipeLength: number; // ความยาวท่อเมนรองเฉลี่ย (เมตร)
    totalSubMainPipeLength: number; // ความยาวท่อเมนรองรวม (เมตร)
    subMainPipeCount: number; // จำนวนท่อเมนรอง

    // ข้อมูลเพิ่มเติม
    plantDensityPerSquareMeter: number; // ความหนาแน่นต้นไม้ต่อตารางเมตร
    waterEfficiency: number; // ประสิทธิภาพการใช้น้ำ (ลิตร/ตร.ม./ครั้ง)
    coveragePercentage: number; // เปอร์เซ็นต์การครอบคลุมพื้นที่
}

export interface MainPipeDetailedStats {
    totalMainPipes: number; // จำนวนท่อเมนทั้งหมด
    longestMainPipe: number; // ท่อเมนที่ยาวที่สุด (เมตร)
    shortestMainPipe: number; // ท่อเมนที่สั้นที่สุด (เมตร)
    averageMainPipeLength: number; // ความยาวท่อเมนเฉลี่ย (เมตร)
    totalMainPipeLength: number; // ความยาวท่อเมนรวม (เมตร)
    farthestDestination: string; // ปลายทางที่ไกลที่สุด
    farthestDistance: number; // ระยะทางไกลที่สุด (เมตร)
    closestDestination: string; // ปลายทางที่ใกล้ที่สุด
    closestDistance: number; // ระยะทางใกล้ที่สุด (เมตร)

    // รายละเอียดท่อเมนแต่ละเส้น
    allMainPipeDetails: Array<{
        pipeId: string;
        fromPump: string;
        toDestination: string;
        destinationName: string;
        length: number;
        diameter: number;
        material: string;
        flowRate: number;
        pressure: number;
    }>;

    // สถิติเพิ่มเติม
    totalFlowCapacity: number; // ความสามารถการไหลรวม (L/min)
    averagePressure: number; // แรงดันเฉลี่ย (bar)
    mainPipeEfficiency: number; // ประสิทธิภาพท่อเมน (%)
}

export interface ProjectSummaryStats {
    projectName: string;
    projectVersion: string;
    lastUpdated: string;

    // ข้อมูลพื้นฐาน
    totalArea: number; // พื้นที่รวม (ตารางเมตร)
    effectiveArea: number; // พื้นที่ที่ใช้งานได้จริง (หักพื้นที่หลีกเลี่ยง)
    exclusionArea: number; // พื้นที่ที่หลีกเลี่ยง (ตารางเมตร)
    usableAreaPercentage: number; // เปอร์เซ็นต์พื้นที่ใช้งานได้

    // ข้อมูลต้นไม้และน้ำ (จากการนับจริง)
    totalPlants: number; // ต้นไม้รวมทั้งหมด (จำนวนจริง)
    totalWaterNeed: number; // น้ำรวมต่อครั้ง (ลิตร) (จำนวนจริง)
    waterPerSquareMeter: number; // น้ำต่อตารางเมตร (ลิตร/ตร.ม.)
    plantDensity: number; // ความหนาแน่นต้นไม้ (ต้น/ตร.ม.)

    // ข้อมูลโซน
    numberOfZones: number; // จำนวนโซน
    averageZoneSize: number; // ขนาดโซนเฉลี่ย (ตารางเมตร)
    largestZoneSize: number; // ขนาดโซนใหญ่ที่สุด (ตารางเมตร)
    smallestZoneSize: number; // ขนาดโซนเล็กที่สุด (ตารางเมตร)

    // สถิติท่อรวม
    totalPipeLength: number; // ความยาวท่อรวมทั้งหมด (เมตร)
    totalMainPipeLength: number; // ความยาวท่อเมนรวม (เมตร)
    totalSubMainPipeLength: number; // ความยาวท่อเมนรองรวม (เมตร)
    totalBranchPipeLength: number; // ความยาวท่อย่อยรวม (เมตร)

    // จำนวนท่อ
    totalMainPipes: number;
    totalSubMainPipes: number;
    totalBranchPipes: number;
    totalPipeSections: number; // ท่อรวมทั้งหมด

    // ข้อมูลรายละเอียด
    zoneStats: ZoneDetailedStats[];
    mainPipeStats: MainPipeDetailedStats;

    // การวิเคราะห์ประสิทธิภาพ
    systemEfficiency: number; // ประสิทธิภาพระบบรวม (%)
    waterDistributionBalance: number; // ความสมดุลการกระจายน้ำ (%)
    pipeOptimization: number; // การเพิ่มประสิทธิภาพท่อ (%)

    // ข้อมูลต้นทุนประมาณการ (optional)
    estimatedPipeCost: number; // ต้นทุนท่อประมาณการ (บาท)
    estimatedPlantCost: number; // ต้นทุนต้นไม้ประมาณการ (บาท)
    estimatedSystemCost: number; // ต้นทุนระบบรวมประมาณการ (บาท)

    // ข้อมูลการบำรุงรักษา
    maintenanceComplexity: 'low' | 'medium' | 'high'; // ความซับซ้อนการบำรุงรักษา
    accessibilityScore: number; // คะแนนการเข้าถึงสำหรับบำรุงรักษา (1-10)
}

/**
 * คำนวณสถิติละเอียดของแต่ละโซน
 */
export const calculateZoneDetailedStats = (
    projectData: HorticultureProjectData
): ZoneDetailedStats[] => {
    console.log('📊 Calculating comprehensive zone detailed stats...');
    console.log(`🌱 Total plants in project: ${projectData.plants?.length || 0}`);

    // คำนวณพื้นที่หลีกเลี่ยงรวม
    const totalExclusionArea = (projectData.exclusionAreas || []).reduce((sum, area) => {
        return sum + calculateAreaFromCoordinates(area.coordinates);
    }, 0);

    // จัดการกรณีไม่ใช้โซน (useZones = false)
    if (!projectData.useZones) {
        console.log('📍 Single zone mode - comprehensive analysis');

        const plantData =
            projectData.plants?.length > 0
                ? projectData.plants[0].plantData
                : {
                      id: 1,
                      name: 'ไม่ระบุ',
                      plantSpacing: 5,
                      rowSpacing: 5,
                      waterNeed: 10,
                  };

        const actualTotalPlants = projectData.plants?.length || 0;
        const actualTotalWaterNeed =
            projectData.plants?.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0) || 0;

        const allSubMainPipes = projectData.subMainPipes || [];
        const allBranchPipes = allSubMainPipes.flatMap((subMain) => subMain.branchPipes || []);

        // คำนวณสถิติท่อเมนรอง
        const subMainLengths = allSubMainPipes.map((pipe) => pipe.length);
        const longestSubMainPipe = subMainLengths.length > 0 ? Math.max(...subMainLengths) : 0;
        const shortestSubMainPipe = subMainLengths.length > 0 ? Math.min(...subMainLengths) : 0;
        const averageSubMainPipeLength =
            subMainLengths.length > 0
                ? subMainLengths.reduce((sum, length) => sum + length, 0) / subMainLengths.length
                : 0;
        const totalSubMainPipeLength = subMainLengths.reduce((sum, length) => sum + length, 0);

        // คำนวณสถิติท่อย่อย
        const branchLengths = allBranchPipes.map((pipe) => pipe.length);
        const longestBranchPipe = branchLengths.length > 0 ? Math.max(...branchLengths) : 0;
        const shortestBranchPipe = branchLengths.length > 0 ? Math.min(...branchLengths) : 0;
        const averageBranchPipeLength =
            branchLengths.length > 0
                ? branchLengths.reduce((sum, length) => sum + length, 0) / branchLengths.length
                : 0;
        const totalBranchPipeLength = branchLengths.reduce((sum, length) => sum + length, 0);

        // คำนวณประสิทธิภาพ
        const effectiveArea = projectData.totalArea - totalExclusionArea;
        const plantDensityPerSquareMeter =
            effectiveArea > 0 ? actualTotalPlants / effectiveArea : 0;
        const waterEfficiency = effectiveArea > 0 ? actualTotalWaterNeed / effectiveArea : 0;
        const coveragePercentage =
            projectData.totalArea > 0 ? (effectiveArea / projectData.totalArea) * 100 : 0;

        const singleZoneStats = {
            zoneId: 'single-zone',
            zoneName: 'พื้นที่เดียว',
            plantType: plantData.name,
            plantSpacing: plantData.plantSpacing,
            rowSpacing: plantData.rowSpacing,
            plantCount: actualTotalPlants,
            waterNeedPerPlant: plantData.waterNeed,
            totalZoneWaterNeed: actualTotalWaterNeed,
            zoneArea: projectData.totalArea,

            longestBranchPipe,
            shortestBranchPipe,
            averageBranchPipeLength,
            totalBranchPipeLength,
            branchPipeCount: allBranchPipes.length,

            longestSubMainPipe,
            shortestSubMainPipe,
            averageSubMainPipeLength,
            totalSubMainPipeLength,
            subMainPipeCount: allSubMainPipes.length,

            plantDensityPerSquareMeter,
            waterEfficiency,
            coveragePercentage,
        };

        console.log('✅ Comprehensive single zone stats:', singleZoneStats);
        return [singleZoneStats];
    }

    // กรณีใช้หลายโซน (useZones = true)
    if (!projectData.zones || projectData.zones.length === 0) {
        console.log('⚠️ No zones found');
        return [];
    }

    console.log(`🏞️ Multi-zone mode: ${projectData.zones.length} zones - comprehensive analysis`);

    const zoneStats = projectData.zones.map((zone) => {
        console.log(`📋 Processing zone: ${zone.name} - comprehensive analysis`);

        // หาต้นไม้จริงที่อยู่ในโซนนี้
        const plantsInZone = (projectData.plants || []).filter((plant) =>
            isPointInPolygon(plant.position, zone.coordinates)
        );

        // คำนวณน้ำจริงในโซนนี้
        const actualZoneWaterNeed = plantsInZone.reduce(
            (sum, plant) => sum + plant.plantData.waterNeed,
            0
        );

        console.log(`🌱 Plants in ${zone.name}: ${plantsInZone.length}`);
        console.log(`💧 Water need in ${zone.name}: ${actualZoneWaterNeed}L`);

        // หาท่อเมนรองในโซนนี้
        const zoneSubMainPipes = (projectData.subMainPipes || []).filter(
            (pipe) =>
                pipe.zoneId === zone.id || (pipe.zoneId === 'main-area' && !projectData.useZones)
        );

        // คำนวณสถิติท่อเมนรอง - แบบละเอียด
        const subMainLengths = zoneSubMainPipes.map((pipe) => pipe.length);
        const longestSubMainPipe = subMainLengths.length > 0 ? Math.max(...subMainLengths) : 0;
        const shortestSubMainPipe = subMainLengths.length > 0 ? Math.min(...subMainLengths) : 0;
        const averageSubMainPipeLength =
            subMainLengths.length > 0
                ? subMainLengths.reduce((sum, length) => sum + length, 0) / subMainLengths.length
                : 0;
        const totalSubMainPipeLength = subMainLengths.reduce((sum, length) => sum + length, 0);

        // หาท่อย่อยทั้งหมดในโซนนี้
        const allBranchPipes = zoneSubMainPipes.flatMap((subMain) => subMain.branchPipes || []);

        // คำนวณสถิติท่อย่อย - แบบละเอียด
        const branchLengths = allBranchPipes.map((pipe) => pipe.length);
        const longestBranchPipe = branchLengths.length > 0 ? Math.max(...branchLengths) : 0;
        const shortestBranchPipe = branchLengths.length > 0 ? Math.min(...branchLengths) : 0;
        const averageBranchPipeLength =
            branchLengths.length > 0
                ? branchLengths.reduce((sum, length) => sum + length, 0) / branchLengths.length
                : 0;
        const totalBranchPipeLength = branchLengths.reduce((sum, length) => sum + length, 0);

        // คำนวณพื้นที่หลีกเลี่ยงในโซนนี้
        const zoneExclusionArea = (projectData.exclusionAreas || []).reduce((sum, area) => {
            // ตรวจสอบว่าพื้นที่หลีกเลี่ยงอยู่ในโซนนี้หรือไม่
            const exclusionInZone = area.coordinates.some((coord) =>
                isPointInPolygon(coord, zone.coordinates)
            );
            if (exclusionInZone) {
                return sum + calculateAreaFromCoordinates(area.coordinates);
            }
            return sum;
        }, 0);

        // คำนวณประสิทธิภาพและความหนาแน่น
        const effectiveZoneArea = zone.area - zoneExclusionArea;
        const plantDensityPerSquareMeter =
            effectiveZoneArea > 0 ? plantsInZone.length / effectiveZoneArea : 0;
        const waterEfficiency = effectiveZoneArea > 0 ? actualZoneWaterNeed / effectiveZoneArea : 0;
        const coveragePercentage = zone.area > 0 ? (effectiveZoneArea / zone.area) * 100 : 0;

        const zoneDetailedStats = {
            zoneId: zone.id,
            zoneName: zone.name,
            plantType: zone.plantData?.name || 'ไม่ระบุ',
            plantSpacing: zone.plantData?.plantSpacing || 0,
            rowSpacing: zone.plantData?.rowSpacing || 0,
            plantCount: plantsInZone.length,
            waterNeedPerPlant: zone.plantData?.waterNeed || 0,
            totalZoneWaterNeed: actualZoneWaterNeed,
            zoneArea: zone.area,

            longestBranchPipe,
            shortestBranchPipe,
            averageBranchPipeLength,
            totalBranchPipeLength,
            branchPipeCount: allBranchPipes.length,

            longestSubMainPipe,
            shortestSubMainPipe,
            averageSubMainPipeLength,
            totalSubMainPipeLength,
            subMainPipeCount: zoneSubMainPipes.length,

            plantDensityPerSquareMeter,
            waterEfficiency,
            coveragePercentage,
        };

        console.log(`✅ Comprehensive zone ${zone.name} stats:`, zoneDetailedStats);
        return zoneDetailedStats;
    });

    console.log('📊 All comprehensive zone stats calculated');
    return zoneStats;
};

/**
 * คำนวณสถิติละเอียดของท่อเมน
 */
export const calculateMainPipeDetailedStats = (
    projectData: HorticultureProjectData
): MainPipeDetailedStats => {
    if (!projectData.mainPipes || projectData.mainPipes.length === 0) {
        return {
            totalMainPipes: 0,
            longestMainPipe: 0,
            shortestMainPipe: 0,
            averageMainPipeLength: 0,
            totalMainPipeLength: 0,
            farthestDestination: '',
            farthestDistance: 0,
            closestDestination: '',
            closestDistance: 0,
            allMainPipeDetails: [],
            totalFlowCapacity: 0,
            averagePressure: 0,
            mainPipeEfficiency: 0,
        };
    }

    const mainPipeLengths = projectData.mainPipes.map((pipe) => pipe.length);
    const longestMainPipe = Math.max(...mainPipeLengths);
    const shortestMainPipe = Math.min(...mainPipeLengths);
    const averageMainPipeLength =
        mainPipeLengths.reduce((sum, length) => sum + length, 0) / mainPipeLengths.length;
    const totalMainPipeLength = mainPipeLengths.reduce((sum, length) => sum + length, 0);

    // หาปลายทางที่ไกลที่สุดและใกล้ที่สุด
    const longestPipe = projectData.mainPipes.find((pipe) => pipe.length === longestMainPipe);
    const shortestPipe = projectData.mainPipes.find((pipe) => pipe.length === shortestMainPipe);

    let farthestDestination = '';
    let farthestDistance = 0;
    let closestDestination = '';
    let closestDistance = 0;

    if (longestPipe) {
        farthestDistance = longestPipe.length;
        if (projectData.zones) {
            const zone = projectData.zones.find((z) => z.id === longestPipe.toZone);
            farthestDestination = zone ? zone.name : 'พื้นที่หลัก';
        } else {
            farthestDestination = 'พื้นที่หลัก';
        }
    }

    if (shortestPipe) {
        closestDistance = shortestPipe.length;
        if (projectData.zones) {
            const zone = projectData.zones.find((z) => z.id === shortestPipe.toZone);
            closestDestination = zone ? zone.name : 'พื้นที่หลัก';
        } else {
            closestDestination = 'พื้นที่หลัก';
        }
    }

    // สร้างรายละเอียดท่อเมนแต่ละเส้น
    const allMainPipeDetails = projectData.mainPipes.map((pipe) => {
        let destinationName = 'พื้นที่หลัก';
        if (projectData.zones) {
            const zone = projectData.zones.find((z) => z.id === pipe.toZone);
            destinationName = zone ? zone.name : 'พื้นที่หลัก';
        }

        return {
            pipeId: pipe.id,
            fromPump: pipe.fromPump,
            toDestination: pipe.toZone,
            destinationName,
            length: pipe.length,
            diameter: pipe.diameter,
            material: 'PVC',
            flowRate: 0,
            pressure: 0,
        };
    });

    // คำนวณสถิติเพิ่มเติม
    const totalFlowCapacity = allMainPipeDetails.reduce((sum, pipe) => sum + pipe.flowRate, 0);
    const averagePressure =
        allMainPipeDetails.length > 0
            ? allMainPipeDetails.reduce((sum, pipe) => sum + pipe.pressure, 0) /
              allMainPipeDetails.length
            : 0;

    // คำนวณประสิทธิภาพท่อเมน
    const maxDistance = Math.max(...mainPipeLengths);
    const mainPipeEfficiency =
        maxDistance > 0 ? ((maxDistance - averageMainPipeLength) / maxDistance) * 100 : 100;

    const mainPipeStats = {
        totalMainPipes: projectData.mainPipes.length,
        longestMainPipe,
        shortestMainPipe,
        averageMainPipeLength,
        totalMainPipeLength,
        farthestDestination,
        farthestDistance,
        closestDestination,
        closestDistance,
        allMainPipeDetails,
        totalFlowCapacity,
        averagePressure,
        mainPipeEfficiency: Math.max(0, mainPipeEfficiency),
    };

    console.log('🔧 Comprehensive main pipe stats:', mainPipeStats);
    return mainPipeStats;
};

/**
 * คำนวณสถิติสรุปโครงการทั้งหมด
 */
export const calculateProjectSummaryStats = (
    projectData: HorticultureProjectData
): ProjectSummaryStats => {
    console.log('📊 Calculating comprehensive project summary stats...');

    const zoneStats = calculateZoneDetailedStats(projectData);
    const mainPipeStats = calculateMainPipeDetailedStats(projectData);

    // คำนวณพื้นที่
    const totalExclusionArea = (projectData.exclusionAreas || []).reduce((sum, area) => {
        return sum + calculateAreaFromCoordinates(area.coordinates);
    }, 0);
    const effectiveArea = projectData.totalArea - totalExclusionArea;
    const usableAreaPercentage =
        projectData.totalArea > 0 ? (effectiveArea / projectData.totalArea) * 100 : 0;

    // ข้อมูลต้นไม้และน้ำจริง
    const actualTotalPlants = projectData.plants?.length || 0;
    const actualTotalWaterNeed =
        projectData.plants?.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0) || 0;

    console.log(`🌱 Actual total plants: ${actualTotalPlants}`);
    console.log(`💧 Actual total water need: ${actualTotalWaterNeed}L`);

    // คำนวณความยาวท่อรวม
    const totalSubMainPipeLength = zoneStats.reduce(
        (sum, zone) => sum + zone.totalSubMainPipeLength,
        0
    );
    const totalBranchPipeLength = zoneStats.reduce(
        (sum, zone) => sum + zone.totalBranchPipeLength,
        0
    );
    const totalPipeLength =
        mainPipeStats.totalMainPipeLength + totalSubMainPipeLength + totalBranchPipeLength;

    // นับจำนวนท่อ
    const totalSubMainPipes = zoneStats.reduce((sum, zone) => sum + zone.subMainPipeCount, 0);
    const totalBranchPipes = zoneStats.reduce((sum, zone) => sum + zone.branchPipeCount, 0);
    const totalPipeSections = mainPipeStats.totalMainPipes + totalSubMainPipes + totalBranchPipes;

    // คำนวณสถิติโซน
    const zoneSizes = zoneStats.map((zone) => zone.zoneArea);
    const averageZoneSize =
        zoneSizes.length > 0
            ? zoneSizes.reduce((sum, size) => sum + size, 0) / zoneSizes.length
            : 0;
    const largestZoneSize = zoneSizes.length > 0 ? Math.max(...zoneSizes) : 0;
    const smallestZoneSize = zoneSizes.length > 0 ? Math.min(...zoneSizes) : 0;

    // คำนวณประสิทธิภาพต่างๆ
    const plantDensity = effectiveArea > 0 ? actualTotalPlants / effectiveArea : 0;
    const waterPerSquareMeter = effectiveArea > 0 ? actualTotalWaterNeed / effectiveArea : 0;

    // ประสิทธิภาพระบบรวม (ตัวอย่าง)
    const systemEfficiency = Math.min(
        100,
        (usableAreaPercentage + mainPipeStats.mainPipeEfficiency) / 2
    );

    // ความสมดุลการกระจายน้ำ
    const zoneWaterNeeds = zoneStats.map((zone) => zone.totalZoneWaterNeed);
    const avgWaterNeed =
        zoneWaterNeeds.length > 0
            ? zoneWaterNeeds.reduce((sum, need) => sum + need, 0) / zoneWaterNeeds.length
            : 0;
    const waterVariance =
        zoneWaterNeeds.length > 0
            ? zoneWaterNeeds.reduce((sum, need) => sum + Math.pow(need - avgWaterNeed, 2), 0) /
              zoneWaterNeeds.length
            : 0;
    const waterDistributionBalance =
        avgWaterNeed > 0 ? Math.max(0, 100 - (Math.sqrt(waterVariance) / avgWaterNeed) * 100) : 100;

    // การเพิ่มประสิทธิภาพท่อ
    const pipeOptimization =
        totalPipeLength > 0 ? Math.max(0, 100 - (totalPipeLength / effectiveArea) * 10) : 100;

    // ประมาณการต้นทุน (ตัวอย่าง)
    const estimatedPipeCost = totalPipeLength * 150; // 150 บาท/เมตร
    const estimatedPlantCost = actualTotalPlants * 200; // 200 บาท/ต้น
    const estimatedSystemCost =
        estimatedPipeCost + estimatedPlantCost + (projectData.pump?.capacity || 0) * 100;

    // ความซับซ้อนการบำรุงรักษา
    let maintenanceComplexity: 'low' | 'medium' | 'high' = 'low';
    if (totalPipeSections > 100) maintenanceComplexity = 'high';
    else if (totalPipeSections > 50) maintenanceComplexity = 'medium';

    // คะแนนการเข้าถึง
    const accessibilityScore = Math.max(1, Math.min(10, 10 - totalPipeSections / 20));

    const summaryStats = {
        projectName: projectData.projectName,
        projectVersion: projectData.version || '2.0.0',
        lastUpdated: projectData.updatedAt,

        totalArea: projectData.totalArea,
        effectiveArea,
        exclusionArea: totalExclusionArea,
        usableAreaPercentage,

        totalPlants: actualTotalPlants,
        totalWaterNeed: actualTotalWaterNeed,
        waterPerSquareMeter,
        plantDensity,

        numberOfZones: projectData.useZones ? projectData.zones?.length || 0 : 1,
        averageZoneSize,
        largestZoneSize,
        smallestZoneSize,

        totalPipeLength,
        totalMainPipeLength: mainPipeStats.totalMainPipeLength,
        totalSubMainPipeLength,
        totalBranchPipeLength,

        totalMainPipes: mainPipeStats.totalMainPipes,
        totalSubMainPipes,
        totalBranchPipes,
        totalPipeSections,

        zoneStats,
        mainPipeStats,

        systemEfficiency,
        waterDistributionBalance,
        pipeOptimization,

        estimatedPipeCost,
        estimatedPlantCost,
        estimatedSystemCost,

        maintenanceComplexity,
        accessibilityScore,
    };

    console.log('✅ Comprehensive project summary stats calculated:', summaryStats);
    return summaryStats;
};

/**
 * แสดงสถิติโซนในรูปแบบที่อ่านง่าย
 */
export const formatZoneStats = (zoneStats: ZoneDetailedStats): string => {
    return `
=== ${zoneStats.zoneName} - รายงานสมบูรณ์ ===
🌱 ข้อมูลพืช:
   พืช: ${zoneStats.plantType}
   ระยะห่าง: ต้น ${zoneStats.plantSpacing}ม. | แถว ${zoneStats.rowSpacing}ม.
   จำนวนจริง: ${zoneStats.plantCount.toLocaleString()} ต้น
   น้ำต่อต้น: ${zoneStats.waterNeedPerPlant} ล./ครั้ง
   น้ำจริงรวม: ${formatWaterVolume(zoneStats.totalZoneWaterNeed)}

📐 ข้อมูลพื้นที่:
   พื้นที่โซน: ${formatArea(zoneStats.zoneArea)}
   ความหนาแน่น: ${zoneStats.plantDensityPerSquareMeter.toFixed(3)} ต้น/ตร.ม.
   ประสิทธิภาพน้ำ: ${zoneStats.waterEfficiency.toFixed(2)} ล./ตร.ม./ครั้ง
   การครอบคลุม: ${zoneStats.coveragePercentage.toFixed(1)}%

🔩 ระบบท่อเมนรอง: ${zoneStats.subMainPipeCount} เส้น
   ยาวที่สุด: ${formatDistance(zoneStats.longestSubMainPipe)}
   สั้นที่สุด: ${formatDistance(zoneStats.shortestSubMainPipe)}
   เฉลี่ย: ${formatDistance(zoneStats.averageSubMainPipeLength)}
   รวม: ${formatDistance(zoneStats.totalSubMainPipeLength)}

🔧 ระบบท่อย่อย: ${zoneStats.branchPipeCount} เส้น
   ยาวที่สุด: ${formatDistance(zoneStats.longestBranchPipe)}
   สั้นที่สุด: ${formatDistance(zoneStats.shortestBranchPipe)}
   เฉลี่ย: ${formatDistance(zoneStats.averageBranchPipeLength)}
   รวม: ${formatDistance(zoneStats.totalBranchPipeLength)}
`;
};

/**
 * แสดงสถิติท่อเมนในรูปแบบที่อ่านง่าย
 */
export const formatMainPipeStats = (mainPipeStats: MainPipeDetailedStats): string => {
    return `
=== ระบบท่อเมน - รายงานสมบูรณ์ ===
🔧 สถิติท่อเมนรวม:
   จำนวนท่อเมน: ${mainPipeStats.totalMainPipes} เส้น
   ท่อเมนยาวที่สุด: ${formatDistance(mainPipeStats.longestMainPipe)}
   ท่อเมนสั้นที่สุด: ${formatDistance(mainPipeStats.shortestMainPipe)}
   ความยาวเฉลี่ย: ${formatDistance(mainPipeStats.averageMainPipeLength)}
   ความยาวรวม: ${formatDistance(mainPipeStats.totalMainPipeLength)}

🎯 การวิเคราะห์ระยะทาง:
   ปลายทางไกลสุด: ${mainPipeStats.farthestDestination} (${formatDistance(mainPipeStats.farthestDistance)})
   ปลายทางใกล้สุด: ${mainPipeStats.closestDestination} (${formatDistance(mainPipeStats.closestDistance)})

⚡ ประสิทธิภาพระบบ:
   ความสามารถการไหลรวม: ${mainPipeStats.totalFlowCapacity.toFixed(2)} L/min
   แรงดันเฉลี่ย: ${mainPipeStats.averagePressure.toFixed(2)} bar
   ประสิทธิภาพท่อเมน: ${mainPipeStats.mainPipeEfficiency.toFixed(1)}%

📋 รายละเอียดท่อเมนแต่ละเส้น:
${mainPipeStats.allMainPipeDetails
    .map(
        (pipe) =>
            `   • ${pipe.destinationName}: ${formatDistance(pipe.length)} (Ø${pipe.diameter}mm, ${pipe.material})`
    )
    .join('\n')}
`;
};

/**
 * แสดงสถิติสรุปโครงการในรูปแบบที่อ่านง่าย
 */
export const formatProjectSummary = (summary: ProjectSummaryStats): string => {
    return `
=== สรุปโครงการ: ${summary.projectName} - รายงานสมบูรณ์ ===
📋 ข้อมูลโครงการ:
   เวอร์ชัน: ${summary.projectVersion}
   อัพเดทล่าสุด: ${new Date(summary.lastUpdated).toLocaleDateString('th-TH')}

📐 การวิเคราะห์พื้นที่:
   พื้นที่รวม: ${formatArea(summary.totalArea)}
   พื้นที่ใช้งานได้: ${formatArea(summary.effectiveArea)}
   พื้นที่หลีกเลี่ยง: ${formatArea(summary.exclusionArea)}
   เปอร์เซ็นต์ใช้งานได้: ${summary.usableAreaPercentage.toFixed(1)}%

🌱 ข้อมูลต้นไม้และน้ำ (จริง):
   ต้นไม้รวม: ${summary.totalPlants.toLocaleString()} ต้น
   น้ำรวมต่อครั้ง: ${formatWaterVolume(summary.totalWaterNeed)}
   ความหนาแน่นต้นไม้: ${summary.plantDensity.toFixed(3)} ต้น/ตร.ม.
   น้ำต่อตารางเมตร: ${summary.waterPerSquareMeter.toFixed(2)} ล./ตร.ม./ครั้ง

🏞️ การวิเคราะห์โซน:
   จำนวนโซน: ${summary.numberOfZones} โซน
   ขนาดโซนเฉลี่ย: ${formatArea(summary.averageZoneSize)}
   โซนใหญ่ที่สุด: ${formatArea(summary.largestZoneSize)}
   โซนเล็กที่สุด: ${formatArea(summary.smallestZoneSize)}

🔧 ระบบท่อรวม:
   ความยาวท่อรวม: ${formatDistance(summary.totalPipeLength)}
   ├─ ท่อเมน: ${formatDistance(summary.totalMainPipeLength)} (${summary.totalMainPipes} เส้น)
   ├─ ท่อเมนรอง: ${formatDistance(summary.totalSubMainPipeLength)} (${summary.totalSubMainPipes} เส้น)
   └─ ท่อย่อย: ${formatDistance(summary.totalBranchPipeLength)} (${summary.totalBranchPipes} เส้น)
   ท่อรวมทั้งหมด: ${summary.totalPipeSections} ท่อน

⚡ การวิเคราะห์ประสิทธิภาพ:
   ประสิทธิภาพระบบรวม: ${summary.systemEfficiency.toFixed(1)}%
   ความสมดุลการกระจายน้ำ: ${summary.waterDistributionBalance.toFixed(1)}%
   การเพิ่มประสิทธิภาพท่อ: ${summary.pipeOptimization.toFixed(1)}%

💰 ประมาณการต้นทุน:
   ต้นทุนท่อ: ${formatCurrency(summary.estimatedPipeCost)}
   ต้นทุนต้นไม้: ${formatCurrency(summary.estimatedPlantCost)}
   ต้นทุนระบบรวม: ${formatCurrency(summary.estimatedSystemCost)}

🔧 การบำรุงรักษา:
   ความซับซ้อน: ${summary.maintenanceComplexity}
   คะแนนการเข้าถึง: ${summary.accessibilityScore.toFixed(1)}/10

🎯 ปลายทางไกลสุด:
   ${summary.mainPipeStats.farthestDestination}: ${formatDistance(summary.mainPipeStats.farthestDistance)}
`;
};

/**
 * ฟังก์ชันหลักสำหรับคำนวณสถิติทั้งหมด
 */
export const generateCompleteProjectStats = (projectData: HorticultureProjectData) => {
    console.log('🎯 Generating complete comprehensive project stats...');

    const summary = calculateProjectSummaryStats(projectData);

    const completeStats = {
        summary,
        zoneStats: summary.zoneStats,
        mainPipeStats: summary.mainPipeStats,

        // Formatted strings for display
        formattedSummary: formatProjectSummary(summary),
        formattedZoneStats: summary.zoneStats.map(formatZoneStats),
        formattedMainPipeStats: formatMainPipeStats(summary.mainPipeStats),

        // Quick access to key metrics
        keyMetrics: {
            totalPlants: summary.totalPlants,
            totalWaterPerSession: summary.totalWaterNeed,
            longestMainPipe: summary.mainPipeStats.longestMainPipe,
            farthestDestination: summary.mainPipeStats.farthestDestination,
            farthestDistance: summary.mainPipeStats.farthestDistance,
            totalPipeLength: summary.totalPipeLength,
            averagePlantsPerZone:
                summary.numberOfZones > 0
                    ? Math.round(summary.totalPlants / summary.numberOfZones)
                    : 0,
            totalPipeSections: summary.totalPipeSections,
            systemEfficiency: summary.systemEfficiency,
            usableAreaPercentage: summary.usableAreaPercentage,
            plantDensity: summary.plantDensity,
            waterEfficiency: summary.waterPerSquareMeter,
        },
    };

    console.log('✅ Complete comprehensive project stats generated');
    console.log(
        `📊 Key metrics: ${completeStats.keyMetrics.totalPlants} plants, ${completeStats.keyMetrics.totalWaterPerSession}L water, ${completeStats.keyMetrics.systemEfficiency.toFixed(1)}% efficiency`
    );

    return completeStats;
};

/**
 * ส่งออกข้อมูลเป็น JSON สำหรับการใช้งานในอนาคต
 */
export const exportProjectStatsAsJSON = (projectData: HorticultureProjectData): string => {
    const stats = generateCompleteProjectStats(projectData);

    const exportData = {
        ...stats,
        rawData: {
            totalPlantsFromArray: projectData.plants?.length || 0,
            totalPlantsFromStats: stats.summary.totalPlants,
            totalWaterFromArray:
                projectData.plants?.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0) || 0,
            totalWaterFromStats: stats.summary.totalWaterNeed,
            zoneCount: projectData.zones?.length || 0,
            useZones: projectData.useZones,
            effectiveArea: stats.summary.effectiveArea,
            systemEfficiency: stats.summary.systemEfficiency,
        },
        metadata: {
            exportedAt: new Date().toISOString(),
            exportVersion: '2.0.0',
            dataIntegrity: 'verified',
        },
    };

    return JSON.stringify(exportData, null, 2);
};

/**
 * ส่งออกข้อมูลเป็น CSV สำหรับการวิเคราะห์
 */
export const exportProjectStatsAsCSV = (projectData: HorticultureProjectData): string => {
    const stats = generateCompleteProjectStats(projectData);

    let csv =
        'Zone Name,Plant Type,Plant Spacing (m),Row Spacing (m),Actual Plant Count,Water Need Per Plant (L),Actual Total Zone Water (L),Zone Area (sqm),Plant Density (plants/sqm),Water Efficiency (L/sqm),Coverage (%),Longest Branch Pipe (m),Shortest Branch Pipe (m),Average Branch Pipe (m),Total Branch Pipe Length (m),Branch Pipe Count,Longest Sub-Main Pipe (m),Shortest Sub-Main Pipe (m),Average Sub-Main Pipe (m),Total Sub-Main Pipe Length (m),Sub-Main Pipe Count\n';

    stats.zoneStats.forEach((zone) => {
        csv += `"${zone.zoneName}","${zone.plantType}",${zone.plantSpacing},${zone.rowSpacing},${zone.plantCount},${zone.waterNeedPerPlant},${zone.totalZoneWaterNeed},${zone.zoneArea},${zone.plantDensityPerSquareMeter.toFixed(6)},${zone.waterEfficiency.toFixed(2)},${zone.coveragePercentage.toFixed(2)},${zone.longestBranchPipe},${zone.shortestBranchPipe},${zone.averageBranchPipeLength.toFixed(2)},${zone.totalBranchPipeLength},${zone.branchPipeCount},${zone.longestSubMainPipe},${zone.shortestSubMainPipe},${zone.averageSubMainPipeLength.toFixed(2)},${zone.totalSubMainPipeLength},${zone.subMainPipeCount}\n`;
    });

    return csv;
};

// ========== Helper Function ==========
const calculateAreaFromCoordinates = (coordinates: Coordinate[]): number => {
    if (!coordinates || coordinates.length < 3) return 0;

    try {
        let area = 0;
        for (let i = 0; i < coordinates.length; i++) {
            const j = (i + 1) % coordinates.length;
            area += coordinates[i].lat * coordinates[j].lng;
            area -= coordinates[j].lat * coordinates[i].lng;
        }
        area = Math.abs(area) / 2;

        const avgLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0) / coordinates.length;
        const latFactor = 111000;
        const lngFactor = 111000 * Math.cos((avgLat * Math.PI) / 180);

        const areaInSquareMeters = area * latFactor * lngFactor;
        return Math.max(0, areaInSquareMeters);
    } catch (error) {
        console.error('Error calculating area:', error);
        return 0;
    }
};

const formatCurrency = (amount: number): string => {
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) return '0 บาท';
    return `${amount.toLocaleString('th-TH')} บาท`;
};

/**
 * ฟังก์ชันสำหรับ debug และตรวจสอบความถูกต้อง
 */
export const debugProjectStats = (projectData: HorticultureProjectData): void => {
    console.group('🔍 Debug Project Stats - Comprehensive Analysis');

    console.log('📋 Project Data Overview:');
    console.log(`- Project Name: ${projectData.projectName}`);
    console.log(`- Version: ${projectData.version || 'Unknown'}`);
    console.log(`- Use Zones: ${projectData.useZones}`);
    console.log(`- Zones Count: ${projectData.zones?.length || 0}`);
    console.log(`- Plants Array Length: ${projectData.plants?.length || 0}`);
    console.log(`- Sub-Main Pipes: ${projectData.subMainPipes?.length || 0}`);
    console.log(`- Main Pipes: ${projectData.mainPipes?.length || 0}`);
    console.log(`- Exclusion Areas: ${projectData.exclusionAreas?.length || 0}`);

    if (projectData.plants && projectData.plants.length > 0) {
        const waterByPlant = projectData.plants.reduce(
            (acc, plant) => {
                const key = plant.plantData.name;
                acc[key] = (acc[key] || 0) + plant.plantData.waterNeed;
                return acc;
            },
            {} as Record<string, number>
        );

        console.log('💧 Water by plant type:', waterByPlant);
    }

    if (projectData.zones && projectData.zones.length > 0 && projectData.plants) {
        console.log('🏞️ Plants distribution per zone:');
        projectData.zones.forEach((zone) => {
            const plantsInZone = projectData.plants.filter((plant) =>
                isPointInPolygon(plant.position, zone.coordinates)
            );
            console.log(`- ${zone.name}: ${plantsInZone.length} plants`);
        });
    }

    const stats = generateCompleteProjectStats(projectData);
    console.log('📊 Calculated Comprehensive Stats:');
    console.log(`- Total Plants: ${stats.summary.totalPlants}`);
    console.log(`- Total Water: ${stats.summary.totalWaterNeed}L`);
    console.log(`- System Efficiency: ${stats.summary.systemEfficiency.toFixed(1)}%`);
    console.log(`- Usable Area: ${stats.summary.usableAreaPercentage.toFixed(1)}%`);
    console.log(`- Zone Stats Count: ${stats.zoneStats.length}`);
    console.log(`- Plant Density: ${stats.summary.plantDensity.toFixed(3)} plants/sqm`);
    console.log(`- Water Efficiency: ${stats.summary.waterPerSquareMeter.toFixed(2)} L/sqm`);

    console.groupEnd();
};

// Make debug function available globally
if (typeof window !== 'undefined') {
    (window as any).debugProjectStats = debugProjectStats;
    (window as any).generateCompleteProjectStats = generateCompleteProjectStats;
}
