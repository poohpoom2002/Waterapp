// resources/js/utils/gardenStatistics.ts
import {
    GardenPlannerData,
    GardenZone,
    Sprinkler,
    Pipe,
    WaterSource,
    calculatePolygonArea,
    calculateDistance,
    formatArea,
    formatDistance,
    getValidScale,
} from './homeGardenData';

// Interface สำหรับข้อมูลรวม
export interface GardenSummary {
    totalArea: number; // พื้นที่รวมทั้งหมด (ตร.ม.)
    totalAreaFormatted: string; // พื้นที่รวมทั้งหมด (รูปแบบที่อ่านง่าย)
    totalZones: number; // จำนวนโซนทั้งหมด
    totalSprinklers: number; // จำนวนหัวฉีดรวมทั้งหมด
    longestPipeFromSource: number; // ท่อที่ยาวที่สุดจากปั๊มไปหาหัวฉีด (ม.)
    longestPipeFromSourceFormatted: string; // ท่อที่ยาวที่สุดจากปั๊มไปหาหัวฉีด (รูปแบบที่อ่านง่าย)
    totalPipeLength: number; // ความยาวท่อรวมทั้งหมด (ม.)
    totalPipeLengthFormatted: string; // ความยาวท่อรวมทั้งหมด (รูปแบบที่อ่านง่าย)
}

// Interface สำหรับข้อมูลแต่ละโซน
export interface ZoneStatistics {
    zoneId: string;
    zoneName: string;
    area: number; // พื้นที่โซน (ตร.ม.)
    areaFormatted: string; // พื้นที่โซน (รูปแบบที่อ่านง่าย)
    sprinklerCount: number; // จำนวนหัวฉีดในโซน
    sprinklerTypes: string[]; // ประเภทหัวฉีดที่ใช้ในโซน (เช่น ["Pop-up Sprinkler", "Spray Sprinkler"])
    sprinklerRadius: number; // รัศมีของหัวฉีดในโซน (ม.)
    longestPipeFromSource: number; // ท่อที่ยาวที่สุดจากปั๊มไปหาหัวฉีดในโซนนี้ (ม.)
    longestPipeFromSourceFormatted: string; // ท่อที่ยาวที่สุดจากปั๊มไปหาหัวฉีดในโซนนี้ (รูปแบบที่อ่านง่าย)
    totalPipeLength: number; // ความยาวท่อรวมในโซน (ม.)
    totalPipeLengthFormatted: string; // ความยาวท่อรวมในโซน (รูปแบบที่อ่านง่าย)
}

// Interface สำหรับข้อมูลสถิติทั้งหมด
export interface GardenStatistics {
    summary: GardenSummary;
    zones: ZoneStatistics[];
}

/**
 * คำนวณสถิติของโครงการ
 */
export function calculateGardenStatistics(data: GardenPlannerData): GardenStatistics {
    if (!data) {
        throw new Error('ไม่มีข้อมูลโครงการ');
    }

    const { gardenZones = [], sprinklers = [], pipes = [], waterSource } = data;
    const scale = getValidScale(data);

    // คำนวณข้อมูลรวม
    const summary = calculateSummary(gardenZones, sprinklers, pipes, waterSource, scale);

    // คำนวณข้อมูลแต่ละโซน
    const zones = calculateZoneStatistics(gardenZones, sprinklers, pipes, waterSource, scale);

    return {
        summary,
        zones,
    };
}

function calculateSummary(
    zones: GardenZone[],
    sprinklers: Sprinkler[],
    pipes: Pipe[],
    waterSource: WaterSource | null,
    scale: number
): GardenSummary {
    // คำนวณพื้นที่รวม (ไม่รวมพื้นที่ห้ามและโซนย่อย)
    const totalArea = zones
        .filter((z) => z.type !== 'forbidden' && !z.parentZoneId)
        .reduce((sum, zone) => {
            const coords = zone.canvasCoordinates || zone.coordinates;
            if (coords && coords.length >= 3) {
                return (
                    sum + calculatePolygonArea(coords, zone.canvasCoordinates ? scale : undefined)
                );
            }
            return sum;
        }, 0);

    // คำนวณความยาวท่อรวม
    const totalPipeLength = pipes.reduce((sum, pipe) => sum + pipe.length, 0);

    // หาท่อที่ยาวที่สุดจากแหล่งน้ำไปหาหัวฉีด
    const longestPipeFromSource = findLongestPipeFromSource(sprinklers, waterSource, scale);

    return {
        totalArea,
        totalAreaFormatted: formatArea(totalArea),
        totalZones: zones.filter((z) => z.type !== 'forbidden' && !z.parentZoneId).length,
        totalSprinklers: sprinklers.length,
        longestPipeFromSource,
        longestPipeFromSourceFormatted: formatDistance(longestPipeFromSource),
        totalPipeLength,
        totalPipeLengthFormatted: formatDistance(totalPipeLength),
    };
}

// ส่วนที่ต้องแก้ไขเต็ม ๆ ในฟังก์ชัน calculateZoneStatistics:
function calculateZoneStatistics(
    zones: GardenZone[],
    sprinklers: Sprinkler[],
    pipes: Pipe[],
    waterSource: WaterSource | null,
    scale: number
): ZoneStatistics[] {
    return zones
        .filter((z) => z.type !== 'forbidden' && !z.parentZoneId)
        .map((zone) => {
            // คำนวณพื้นที่โซน
            const coords = zone.canvasCoordinates || zone.coordinates;
            const area =
                coords && coords.length >= 3
                    ? calculatePolygonArea(coords, zone.canvasCoordinates ? scale : undefined)
                    : 0;

            // หาหัวฉีดในโซนนี้
            const zoneSprinklers = sprinklers.filter((s) => s.zoneId === zone.id);

            // หาประเภทหัวฉีดที่ใช้ในโซน - แก้ไขตรงนี้
            const sprinklerTypes = [...new Set(zoneSprinklers.map((s) => s.type.nameEN))];

            const sprinklerRadius =
                zoneSprinklers.length > 0
                    ? zoneSprinklers.reduce((sum, s) => sum + s.type.radius, 0) /
                      zoneSprinklers.length
                    : 0;

            // หาท่อในโซนนี้
            const zonePipes = pipes.filter((p) => p.zoneId === zone.id);
            const totalPipeLength = zonePipes.reduce((sum, pipe) => sum + pipe.length, 0);

            // หาท่อที่ยาวที่สุดจากแหล่งน้ำไปหาหัวฉีดในโซนนี้
            const longestPipeFromSource = findLongestPipeFromSourceInZone(
                zoneSprinklers,
                waterSource,
                scale
            );

            return {
                zoneId: zone.id,
                zoneName: zone.name,
                area,
                areaFormatted: formatArea(area),
                sprinklerCount: zoneSprinklers.length,
                sprinklerTypes,
                sprinklerRadius: sprinklerRadius,
                longestPipeFromSource,
                longestPipeFromSourceFormatted: formatDistance(longestPipeFromSource),
                totalPipeLength,
                totalPipeLengthFormatted: formatDistance(totalPipeLength),
            };
        });
}

function findLongestPipeFromSource(
    sprinklers: Sprinkler[],
    waterSource: WaterSource | null,
    scale: number
): number {
    if (!waterSource || sprinklers.length === 0) {
        return 0;
    }

    const sourcePos = waterSource.canvasPosition || waterSource.position;
    let maxDistance = 0;

    sprinklers.forEach((sprinkler) => {
        const sprinklerPos = sprinkler.canvasPosition || sprinkler.position;
        if (sprinklerPos) {
            const distance = calculateDistance(
                sourcePos,
                sprinklerPos,
                sprinkler.canvasPosition ? scale : undefined
            );
            if (distance > maxDistance) {
                maxDistance = distance;
            }
        }
    });

    return maxDistance;
}

function findLongestPipeFromSourceInZone(
    zoneSprinklers: Sprinkler[],
    waterSource: WaterSource | null,
    scale: number
): number {
    if (!waterSource || zoneSprinklers.length === 0) {
        return 0;
    }

    const sourcePos = waterSource.canvasPosition || waterSource.position;
    let maxDistance = 0;

    zoneSprinklers.forEach((sprinkler) => {
        const sprinklerPos = sprinkler.canvasPosition || sprinkler.position;
        if (sprinklerPos) {
            const distance = calculateDistance(
                sourcePos,
                sprinklerPos,
                sprinkler.canvasPosition ? scale : undefined
            );
            if (distance > maxDistance) {
                maxDistance = distance;
            }
        }
    });

    return maxDistance;
}
