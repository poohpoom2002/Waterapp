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
    Coordinate,
    CanvasCoordinate,
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
    totalJunctions: number; // จำนวนข้อต่อทางแยกรวมทั้งหมด
    junctionStatistics: JunctionStatistics; // สถิติข้อต่อทางแยกแยกตามประเภท
}

// Interface สำหรับข้อมูลข้อต่อทางแยก
export interface JunctionPoint {
    position: Coordinate | CanvasCoordinate;
    ways: number; // จำนวนทางแยก
    type: 'pipe_junction' | 'sprinkler_junction'; // ประเภทข้อต่อ
    sprinklerId?: string; // ID ของหัวฉีดถ้าเป็น sprinkler_junction
    connectedPipes: string[]; // ID ของท่อที่เชื่อมต่อ
}

// Interface สำหรับสถิติข้อต่อทางแยก
export interface JunctionStatistics {
    totalJunctions: number; // จำนวนข้อต่อทั้งหมด
    pipeJunctions: number; // จำนวนข้อต่อจากท่อ (ไม่มีหัวฉีด)
    sprinklerJunctions: number; // จำนวนข้อต่อจากหัวฉีด
    junctionsByWays: { [ways: number]: number }; // จำนวนข้อต่อแยกตามจำนวนทาง (เช่น 3-way: 5, 4-way: 2)
    junctionPoints: JunctionPoint[]; // รายละเอียดข้อต่อทั้งหมด
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
    sprinklerPressure: number; // แรงดันของหัวฉีดในโซน (บาร์)
    sprinklerFlowRate: number; // อัตราการไหลรวมของหัวฉีดในโซน (ลิตร/นาที)
    longestPipeFromSource: number; // ท่อที่ยาวที่สุดจากปั๊มไปหาหัวฉีดในโซนนี้ (ม.)
    longestPipeFromSourceFormatted: string; // ท่อที่ยาวที่สุดจากปั๊มไปหาหัวฉีดในโซนนี้ (รูปแบบที่อ่านง่าย)
    totalPipeLength: number; // ความยาวท่อรวมในโซน (ม.)
    totalPipeLengthFormatted: string; // ความยาวท่อรวมในโซน (รูปแบบที่อ่านง่าย)
    junctionCount: number; // จำนวนข้อต่อทางแยกในโซน
    junctionStatistics: JunctionStatistics; // สถิติข้อต่อทางแยกในโซน
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

    // คำนวณความยาวท่อรวมจากท่อทั้งหมด
    const totalPipeLength = pipes.reduce((sum, pipe) => {
        const length =
            typeof pipe.length === 'number' && !isNaN(pipe.length)
                ? Math.max(0, pipe.length)
                : pipe.canvasStart && pipe.canvasEnd
                  ? calculateDistance(pipe.canvasStart, pipe.canvasEnd, scale)
                  : pipe.start && pipe.end
                    ? calculateDistance(pipe.start, pipe.end)
                    : 0;
        return sum + length;
    }, 0);

    // หาท่อที่ยาวที่สุดจากแหล่งน้ำไปหาหัวฉีด
    const longestPipeFromSource = findLongestPipeFromSource(sprinklers, waterSource, scale);

    // คำนวณสถิติข้อต่อทางแยก
    const junctionStatistics = calculateJunctionStatistics(pipes, sprinklers, scale);

    return {
        totalArea,
        totalAreaFormatted: formatArea(totalArea),
        totalZones: zones.filter((z) => z.type !== 'forbidden' && !z.parentZoneId).length,
        totalSprinklers: sprinklers.length,
        longestPipeFromSource,
        longestPipeFromSourceFormatted: formatDistance(longestPipeFromSource),
        totalPipeLength,
        totalPipeLengthFormatted: formatDistance(totalPipeLength),
        totalJunctions: junctionStatistics.totalJunctions,
        junctionStatistics,
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

            // หาประเภทหัวฉีดที่ใช้ในโซน - แสดงเป็น Sprinkler ทั้งหมด
            const sprinklerTypes = zoneSprinklers.length > 0 ? ['Sprinkler'] : [];

            const sprinklerRadius =
                zoneSprinklers.length > 0
                    ? zoneSprinklers.reduce((sum, s) => sum + s.type.radius, 0) /
                      zoneSprinklers.length
                    : 0;

            // คำนวณแรงดันเฉลี่ย
            const sprinklerPressure =
                zoneSprinklers.length > 0
                    ? zoneSprinklers.reduce((sum, s) => sum + s.type.pressure, 0) /
                      zoneSprinklers.length
                    : 0;

            // คำนวณอัตราการไหลเฉลี่ย (Q หัวฉีด)
            const sprinklerFlowRate =
                zoneSprinklers.length > 0
                    ? zoneSprinklers.reduce((sum, s) => sum + s.type.flowRate, 0) /
                      zoneSprinklers.length
                    : 0;

            // หาท่อในโซนนี้และคำนวณความยาวรวม
            const zonePipes = pipes.filter((p) => p.zoneId === zone.id);
            const totalPipeLength = zonePipes.reduce((sum, pipe) => {
                const length =
                    typeof pipe.length === 'number' && !isNaN(pipe.length)
                        ? Math.max(0, pipe.length)
                        : pipe.canvasStart && pipe.canvasEnd
                          ? calculateDistance(pipe.canvasStart, pipe.canvasEnd, scale)
                          : pipe.start && pipe.end
                            ? calculateDistance(pipe.start, pipe.end)
                            : 0;
                return sum + length;
            }, 0);

            // หาท่อที่ยาวที่สุดจากแหล่งน้ำไปหาหัวฉีดในโซนนี้
            const longestPipeFromSource = findLongestPipeFromSourceInZone(
                zoneSprinklers,
                waterSource,
                scale
            );

            // คำนวณสถิติข้อต่อทางแยกในโซนนี้
            const zoneJunctionStatistics = calculateJunctionStatistics(
                zonePipes,
                zoneSprinklers,
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
                sprinklerPressure: sprinklerPressure,
                sprinklerFlowRate: sprinklerFlowRate,
                longestPipeFromSource,
                longestPipeFromSourceFormatted: formatDistance(longestPipeFromSource),
                totalPipeLength,
                totalPipeLengthFormatted: formatDistance(totalPipeLength),
                junctionCount: zoneJunctionStatistics.totalJunctions,
                junctionStatistics: zoneJunctionStatistics,
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

/**
 * คำนวณข้อต่อทางแยกทั้งหมดในระบบ
 *
 * กฎการนับทาง:
 * 1. ทางแยกคือจุดที่ท่อตัดกันหรือเชื่อมต่อกัน
 * 2. หัวฉีดปลายท่อ (เชื่อมต่อกับท่อ 1 ท่อ) = 2 ทาง
 * 3. หัวฉีดกลางเส้นทาง (เชื่อมต่อกับท่อมากกว่า 1 ท่อ) = จำนวนท่อ + 1 ทาง
 * 4. จุดตัดของท่อ (ไม่มีหัวฉีด) = จำนวนท่อที่ตัดกัน
 */
export function calculateJunctionStatistics(
    pipes: Pipe[],
    sprinklers: Sprinkler[],
    scale: number,
    tolerance: number = 1.0 // ระยะความผิดพลาดที่ยอมรับได้ (เมตร)
): JunctionStatistics {
    const junctionPoints: JunctionPoint[] = [];
    const processedPositions = new Set<string>();

    // รวบรวมจุดปลายท่อทั้งหมด
    const allPoints: Array<{
        position: Coordinate | CanvasCoordinate;
        pipeId: string;
        isStart: boolean;
    }> = [];

    pipes.forEach((pipe) => {
        const start = pipe.canvasStart || pipe.start;
        const end = pipe.canvasEnd || pipe.end;

        if (start) {
            allPoints.push({ position: start, pipeId: pipe.id, isStart: true });
        }
        if (end) {
            allPoints.push({ position: end, pipeId: pipe.id, isStart: false });
        }
    });

    // จัดกลุ่มจุดที่อยู่ใกล้กัน (ในระยะ tolerance)
    const pointGroups: Array<{
        position: Coordinate | CanvasCoordinate;
        points: Array<{
            position: Coordinate | CanvasCoordinate;
            pipeId: string;
            isStart: boolean;
        }>;
    }> = [];

    allPoints.forEach((point) => {
        let foundGroup = false;

        for (const group of pointGroups) {
            const distance = calculateDistance(
                point.position,
                group.position,
                isCanvasCoordinate(point.position) ? scale : undefined
            );

            if (distance <= tolerance) {
                group.points.push(point);
                foundGroup = true;
                break;
            }
        }

        if (!foundGroup) {
            pointGroups.push({
                position: point.position,
                points: [point],
            });
        }
    });

    // หาจุดตัดของท่อโดยตรงด้วยคณิตศาสตร์ (สำหรับท่อที่ตัดกันกลางเส้น)
    const directIntersections = findDirectPipeIntersections(pipes, tolerance, scale);

    // เพิ่มจุดตัดที่หาได้เข้าไปในกลุ่มจุด
    directIntersections.forEach((intersection) => {
        const positionKey = getPositionKey(intersection.position);
        if (!processedPositions.has(positionKey)) {
            pointGroups.push({
                position: intersection.position,
                points: intersection.pipes.map((pipeId) => ({
                    position: intersection.position,
                    pipeId,
                    isStart: false,
                })),
            });
        }
    });

    // เพิ่มการตรวจสอบจุดกลางของท่อแต่ละเส้นเพื่อหาท่อที่ผ่านจุดเดียวกัน
    const additionalIntersections = findPipePassThroughPoints(pipes, tolerance, scale);

    additionalIntersections.forEach((intersection) => {
        const positionKey = getPositionKey(intersection.position);
        if (!processedPositions.has(positionKey)) {
            pointGroups.push({
                position: intersection.position,
                points: intersection.pipes.map((pipeId) => ({
                    position: intersection.position,
                    pipeId,
                    isStart: false,
                })),
            });
        }
    });

    // เพิ่มวิธีการใหม่: หา T-junctions (ปลายท่อเชื่อมกับกลางท่ออีกเส้น)
    const tJunctions = findTJunctions(pipes, tolerance, scale);

    // เพิ่มวิธีการใหม่: หาจุดที่ท่อหลายเส้นมาเจอกันโดยใช้ความใกล้เคียงที่เหมาะสม
    const enhancedJunctions = findEnhancedPipeJunctions(pipes, tolerance * 3, scale);

    tJunctions.forEach((intersection) => {
        const positionKey = getPositionKey(intersection.position);
        if (!processedPositions.has(positionKey)) {
            pointGroups.push({
                position: intersection.position,
                points: intersection.pipes.map((pipeId) => ({
                    position: intersection.position,
                    pipeId,
                    isStart: false,
                })),
            });
        }
    });

    enhancedJunctions.forEach((intersection) => {
        const positionKey = getPositionKey(intersection.position);
        if (!processedPositions.has(positionKey)) {
            pointGroups.push({
                position: intersection.position,
                points: intersection.pipes.map((pipeId) => ({
                    position: intersection.position,
                    pipeId,
                    isStart: false,
                })),
            });
        }
    });

    // วิเคราะห์แต่ละกลุ่มจุด

    pointGroups.forEach((group) => {
        const positionKey = getPositionKey(group.position);
        if (processedPositions.has(positionKey)) return;

        processedPositions.add(positionKey);

        // หาท่อที่เชื่อมต่อกับจุดนี้
        const connectedPipeIds = [...new Set(group.points.map((p) => p.pipeId))];

        // ตรวจสอบว่ามีหัวฉีดอยู่ที่จุดนี้หรือไม่
        const sprinklerAtPoint = findSprinklerAtPosition(
            group.position,
            sprinklers,
            tolerance,
            scale
        );

        if (sprinklerAtPoint) {
            // หัวฉีดที่อยู่ปลายท่อ (เชื่อมต่อกับท่อเพียงท่อเดียว) ใช้ 2 ทาง
            // หัวฉีดที่อยู่กลางเส้นทาง (เชื่อมต่อกับท่อมากกว่า 1 ท่อ) บวก 1 ทางเสมอ
            const ways = connectedPipeIds.length === 1 ? 2 : connectedPipeIds.length + 1;

            junctionPoints.push({
                position: group.position,
                ways,
                type: 'sprinkler_junction',
                sprinklerId: sprinklerAtPoint.id,
                connectedPipes: connectedPipeIds,
            });

            // ถ้ามีท่อมากกว่า 2 เส้น ให้สร้าง pipe junction เพิ่มเติมด้วย (จุดแยกที่มีหัวฉีดแต่ก็เป็นข้อต่อท่อด้วย)
            if (connectedPipeIds.length >= 3) {
                junctionPoints.push({
                    position: group.position,
                    ways: connectedPipeIds.length,
                    type: 'pipe_junction',
                    connectedPipes: connectedPipeIds,
                });
            }
        } else if (connectedPipeIds.length >= 2 && connectedPipeIds.length <= 6) {
            // จุดที่ไม่มีหัวฉีดแต่มีท่อเชื่อมต่อมากกว่า 1 ท่อ (แต่ไม่เกิน 6 ท่อ)
            // จำกัดจำนวนท่อเพื่อป้องกันข้อต่อ "ปลอม" ที่มีท่อมากเกินไป
            const ways = connectedPipeIds.length;

            junctionPoints.push({
                position: group.position,
                ways,
                type: 'pipe_junction',
                connectedPipes: connectedPipeIds,
            });
        } else if (connectedPipeIds.length > 6) {
            // Suspicious junction with too many pipes - IGNORED
        } else {
            // Not enough pipes - IGNORED
        }
    });

    // ตรวจสอบหัวฉีดที่ยังไม่ได้ประมวลผล (อาจเป็นหัวฉีดปลายท่อ)
    sprinklers.forEach((sprinkler) => {
        const sprinklerPos = sprinkler.canvasPosition || sprinkler.position;
        if (!sprinklerPos) return;

        const positionKey = getPositionKey(sprinklerPos);
        if (processedPositions.has(positionKey)) return; // หัวฉีดนี้ประมวลผลแล้ว

        // หาท่อที่เชื่อมต่อกับหัวฉีดนี้
        const connectedPipes: string[] = [];
        pipes.forEach((pipe) => {
            const start = pipe.canvasStart || pipe.start;
            const end = pipe.canvasEnd || pipe.end;

            if (start && end) {
                const distToStart = calculateDistance(
                    sprinklerPos,
                    start,
                    isCanvasCoordinate(sprinklerPos) ? scale : undefined
                );
                const distToEnd = calculateDistance(
                    sprinklerPos,
                    end,
                    isCanvasCoordinate(sprinklerPos) ? scale : undefined
                );

                if (distToStart <= tolerance || distToEnd <= tolerance) {
                    connectedPipes.push(pipe.id);
                }
            }
        });

        if (connectedPipes.length > 0) {
            // หัวฉีดที่อยู่ปลายท่อ (เชื่อมต่อกับท่อเพียงท่อเดียว) ใช้ 2 ทาง
            // หัวฉีดที่อยู่กลางเส้นทาง (เชื่อมต่อกับท่อมากกว่า 1 ท่อ) บวก 1 ทางเสมอ
            const ways = connectedPipes.length === 1 ? 2 : connectedPipes.length + 1;

            junctionPoints.push({
                position: sprinklerPos,
                ways,
                type: 'sprinkler_junction',
                sprinklerId: sprinkler.id,
                connectedPipes,
            });

            processedPositions.add(positionKey);
        }
    });

    // คำนวณสถิติ
    const totalJunctions = junctionPoints.length;
    const pipeJunctions = junctionPoints.filter((j) => j.type === 'pipe_junction').length;
    const sprinklerJunctions = junctionPoints.filter((j) => j.type === 'sprinkler_junction').length;

    const junctionsByWays: { [ways: number]: number } = {};
    junctionPoints.forEach((junction) => {
        junctionsByWays[junction.ways] = (junctionsByWays[junction.ways] || 0) + 1;
    });

    return {
        totalJunctions,
        pipeJunctions,
        sprinklerJunctions,
        junctionsByWays,
        junctionPoints,
    };
}

/**
 * ตรวจสอบว่าตำแหน่งเป็น CanvasCoordinate หรือไม่
 */
function isCanvasCoordinate(position: Coordinate | CanvasCoordinate): position is CanvasCoordinate {
    return 'x' in position && 'y' in position;
}

/**
 * สร้าง key สำหรับตำแหน่ง
 */
function getPositionKey(position: Coordinate | CanvasCoordinate): string {
    if (isCanvasCoordinate(position)) {
        return `${Math.round(position.x * 100)},${Math.round(position.y * 100)}`;
    } else {
        return `${Math.round(position.lat * 1000000)},${Math.round(position.lng * 1000000)}`;
    }
}

/**
 * หาหัวฉีดที่อยู่ในตำแหน่งที่กำหนด
 */
function findSprinklerAtPosition(
    position: Coordinate | CanvasCoordinate,
    sprinklers: Sprinkler[],
    tolerance: number,
    scale: number
): Sprinkler | null {
    // ลดความเข้มงวด: ใช้ tolerance ที่เล็กกว่า เพื่อให้จุดแยกที่ไม่ได้อยู่ตรงหัวฉีดพอดี ถือเป็น pipe junction
    const strictTolerance = tolerance * 0.3; // ลดเหลือ 30% ของ tolerance เดิม

    for (const sprinkler of sprinklers) {
        const sprinklerPos = sprinkler.canvasPosition || sprinkler.position;
        if (!sprinklerPos) continue;

        const distance = calculateDistance(
            position,
            sprinklerPos,
            isCanvasCoordinate(position) ? scale : undefined
        );

        if (distance <= strictTolerance) {
            return sprinkler;
        }
    }

    return null;
}

/**
 * หาจุดตัดของท่อโดยตรงด้วยคณิตศาสตร์ (Line-Line Intersection)
 */
function findDirectPipeIntersections(
    pipes: Pipe[],
    tolerance: number,
    scale: number
): Array<{ position: Coordinate | CanvasCoordinate; pipes: string[] }> {
    const intersections: Array<{ position: Coordinate | CanvasCoordinate; pipes: string[] }> = [];

    // ตรวจสอบการตัดกันของท่อทุกคู่
    for (let i = 0; i < pipes.length; i++) {
        for (let j = i + 1; j < pipes.length; j++) {
            const pipe1 = pipes[i];
            const pipe2 = pipes[j];

            const start1 = pipe1.canvasStart || pipe1.start;
            const end1 = pipe1.canvasEnd || pipe1.end;
            const start2 = pipe2.canvasStart || pipe2.start;
            const end2 = pipe2.canvasEnd || pipe2.end;

            if (!start1 || !end1 || !start2 || !end2) continue;

            // หาจุดตัดของเส้นตรงสองเส้นด้วยสูตรคณิตศาสตร์
            const intersection = findMathematicalLineIntersection(start1, end1, start2, end2);

            if (intersection) {
                // ตรวจสอบว่ามีจุดตัดนี้อยู่แล้วหรือไม่
                const existingIntersection = intersections.find((existing) => {
                    const dist = calculateDistance(
                        existing.position,
                        intersection,
                        isCanvasCoordinate(intersection) ? scale : undefined
                    );
                    return dist <= tolerance;
                });

                if (existingIntersection) {
                    // เพิ่มท่อเข้าไปในจุดตัดที่มีอยู่
                    if (!existingIntersection.pipes.includes(pipe1.id)) {
                        existingIntersection.pipes.push(pipe1.id);
                    }
                    if (!existingIntersection.pipes.includes(pipe2.id)) {
                        existingIntersection.pipes.push(pipe2.id);
                    }
                } else {
                    // สร้างจุดตัดใหม่
                    intersections.push({
                        position: intersection,
                        pipes: [pipe1.id, pipe2.id],
                    });
                }
            }
        }
    }
    // รวมจุดตัดที่อยู่ใกล้กัน และรวมท่อที่ผ่านจุดเดียวกัน
    const mergedIntersections: Array<{ position: Coordinate | CanvasCoordinate; pipes: string[] }> =
        [];

    intersections.forEach((intersection) => {
        const existing = mergedIntersections.find((merged) => {
            const dist = calculateDistance(
                merged.position,
                intersection.position,
                isCanvasCoordinate(intersection.position) ? scale : undefined
            );
            return dist <= tolerance;
        });

        if (existing) {
            // รวมท่อเข้าไปในจุดตัดที่มีอยู่
            intersection.pipes.forEach((pipeId) => {
                if (!existing.pipes.includes(pipeId)) {
                    existing.pipes.push(pipeId);
                }
            });
        } else {
            mergedIntersections.push({
                position: intersection.position,
                pipes: [...intersection.pipes],
            });
        }
    });

    // ตรวจสอบท่อเพิ่มเติมที่อาจผ่านจุดตัดเหล่านี้
    mergedIntersections.forEach((intersection) => {
        pipes.forEach((pipe) => {
            if (intersection.pipes.includes(pipe.id)) return; // ท่อนี้อยู่ในจุดตัดแล้ว

            const start = pipe.canvasStart || pipe.start;
            const end = pipe.canvasEnd || pipe.end;
            if (!start || !end) return;

            // ตรวจสอบว่าท่อนี้ผ่านจุดตัดหรือไม่
            if (isPointOnLineSegment(intersection.position, start, end, tolerance, scale)) {
                // เพิ่มท่อเข้าไปในจุดตัดโดยไม่ต้องตรวจสอบมุม
                intersection.pipes.push(pipe.id);
            }
        });
    });

    return mergedIntersections;
}

/**
 * หาจุดที่ท่อหลายเส้นผ่าน โดยการตรวจสอบจุดปลายของท่อแต่ละเส้น
 */
function findPipePassThroughPoints(
    pipes: Pipe[],
    tolerance: number,
    scale: number
): Array<{ position: Coordinate | CanvasCoordinate; pipes: string[] }> {
    const passThroughPoints: Array<{ position: Coordinate | CanvasCoordinate; pipes: string[] }> =
        [];

    // สร้างรายการจุดปลายท่อทั้งหมด
    const allEndpoints: Array<{ position: Coordinate | CanvasCoordinate; pipeId: string }> = [];

    pipes.forEach((pipe) => {
        const start = pipe.canvasStart || pipe.start;
        const end = pipe.canvasEnd || pipe.end;

        if (start) allEndpoints.push({ position: start, pipeId: pipe.id });
        if (end) allEndpoints.push({ position: end, pipeId: pipe.id });
    });

    // สำหรับแต่ละจุดปลายท่อ ตรวจสอบว่ามีท่อเส้นอื่นผ่านจุดนั้นหรือไม่
    allEndpoints.forEach((endpoint) => {
        const pipesAtPoint: string[] = [endpoint.pipeId];

        pipes.forEach((otherPipe) => {
            if (otherPipe.id === endpoint.pipeId) return; // ข้ามท่อตัวเอง

            const otherStart = otherPipe.canvasStart || otherPipe.start;
            const otherEnd = otherPipe.canvasEnd || otherPipe.end;

            if (!otherStart || !otherEnd) return;

            // ตรวจสอบว่าจุดปลายนี้อยู่บนท่ออื่นหรือไม่
            if (isPointOnLineSegment(endpoint.position, otherStart, otherEnd, tolerance, scale)) {
                pipesAtPoint.push(otherPipe.id);
            }
        });

        // ถ้ามีท่อมากกว่า 1 เส้นที่จุดนี้ แสดงว่าเป็นจุดตัด
        if (pipesAtPoint.length > 1) {
            // ตรวจสอบว่าจุดนี้มีอยู่แล้วหรือไม่
            const existing = passThroughPoints.find((existing) => {
                const dist = calculateDistance(
                    existing.position,
                    endpoint.position,
                    isCanvasCoordinate(endpoint.position) ? scale : undefined
                );
                return dist <= tolerance;
            });

            if (existing) {
                // เพิ่มท่อที่ยังไม่มี
                pipesAtPoint.forEach((pipeId) => {
                    if (!existing.pipes.includes(pipeId)) {
                        existing.pipes.push(pipeId);
                    }
                });
            } else {
                // สร้างจุดใหม่
                passThroughPoints.push({
                    position: endpoint.position,
                    pipes: [...pipesAtPoint],
                });
            }
        }
    });

    return passThroughPoints;
}

/**
 * หาจุดแยกของท่อด้วยวิธีการใหม่ที่ครอบคลุมมากขึ้น
 */
function findEnhancedPipeJunctions(
    pipes: Pipe[],
    tolerance: number,
    scale: number
): Array<{ position: Coordinate | CanvasCoordinate; pipes: string[] }> {
    const junctions: Array<{ position: Coordinate | CanvasCoordinate; pipes: string[] }> = [];

    // สร้างตารางจุดทั้งหมดจากท่อ
    const allPipePoints: Array<{
        position: Coordinate | CanvasCoordinate;
        pipeId: string;
        type: 'start' | 'end' | 'midpoint';
    }> = [];

    pipes.forEach((pipe) => {
        const start = pipe.canvasStart || pipe.start;
        const end = pipe.canvasEnd || pipe.end;

        if (start && end) {
            allPipePoints.push({ position: start, pipeId: pipe.id, type: 'start' });
            allPipePoints.push({ position: end, pipeId: pipe.id, type: 'end' });

            // ลบจุดกลางออกเพื่อลดความซับซ้อน
            // const midpoint = calculateMidpoint(start, end);
            // allPipePoints.push({ position: midpoint, pipeId: pipe.id, type: 'midpoint' });
        }
    });

    // สำหรับแต่ละจุด ตรวจสอบว่ามีท่อเส้นอื่นผ่านหรือไม่
    allPipePoints.forEach((point) => {
        const pipesAtPoint: string[] = [point.pipeId];

        pipes.forEach((otherPipe) => {
            if (otherPipe.id === point.pipeId) return;

            const otherStart = otherPipe.canvasStart || otherPipe.start;
            const otherEnd = otherPipe.canvasEnd || otherPipe.end;

            if (!otherStart || !otherEnd) return;

            // ตรวจสอบว่าจุดนี้อยู่บนท่ออื่นหรือใกล้จุดปลายของท่ออื่น
            const distToOtherStart = calculateDistance(
                point.position,
                otherStart,
                isCanvasCoordinate(point.position) ? scale : undefined
            );
            const distToOtherEnd = calculateDistance(
                point.position,
                otherEnd,
                isCanvasCoordinate(point.position) ? scale : undefined
            );

            if (
                distToOtherStart <= tolerance ||
                distToOtherEnd <= tolerance ||
                isPointOnLineSegment(point.position, otherStart, otherEnd, tolerance, scale)
            ) {
                pipesAtPoint.push(otherPipe.id);
            }
        });

        // ถ้ามีท่อมากกว่า 1 เส้น แต่ไม่เกิน 6 เส้น (กรองข้อต่อที่ไม่สมเหตุสมผล)
        if (pipesAtPoint.length > 1 && pipesAtPoint.length <= 6) {
            // ตรวจสอบว่าจุดนี้มีอยู่แล้วหรือไม่
            const existing = junctions.find((existing) => {
                const dist = calculateDistance(
                    existing.position,
                    point.position,
                    isCanvasCoordinate(point.position) ? scale : undefined
                );
                return dist <= tolerance;
            });

            if (existing) {
                // รวมท่อเข้าไปในจุดที่มีอยู่
                pipesAtPoint.forEach((pipeId) => {
                    if (!existing.pipes.includes(pipeId)) {
                        existing.pipes.push(pipeId);
                    }
                });
            } else {
                // สร้างจุดใหม่
                junctions.push({
                    position: point.position,
                    pipes: [...new Set(pipesAtPoint)],
                });
            }
        }
    });

    return junctions;
}

/**
 * หา T-junctions: จุดที่ปลายท่อเส้นหนึ่งเชื่อมต่อกับกลางท่ออีกเส้น
 */
function findTJunctions(
    pipes: Pipe[],
    tolerance: number,
    scale: number
): Array<{ position: Coordinate | CanvasCoordinate; pipes: string[] }> {
    const tJunctions: Array<{ position: Coordinate | CanvasCoordinate; pipes: string[] }> = [];

    // ตรวจสอบทุกปลายท่อกับท่ออื่นๆ
    pipes.forEach((pipe, i) => {
        const start = pipe.canvasStart || pipe.start;
        const end = pipe.canvasEnd || pipe.end;

        if (!start || !end) return;

        // ตรวจสอบปลายท่อทั้งสองด้าน
        [start, end].forEach((endpoint) => {
            pipes.forEach((otherPipe, j) => {
                if (i === j) return; // ไม่เช็คกับตัวเอง

                const otherStart = otherPipe.canvasStart || otherPipe.start;
                const otherEnd = otherPipe.canvasEnd || otherPipe.end;

                if (!otherStart || !otherEnd) return;

                // ตรวจสอบว่าปลายท่อนี้อยู่บนท่ออีกเส้นหรือไม่
                if (isPointOnLineSegment(endpoint, otherStart, otherEnd, tolerance, scale)) {
                    // ตรวจสอบว่ามี T-junction นี้อยู่แล้วหรือไม่
                    const existingTJunction = tJunctions.find((existing) => {
                        const dist = calculateDistance(
                            existing.position,
                            endpoint,
                            isCanvasCoordinate(endpoint) ? scale : undefined
                        );
                        return dist <= tolerance;
                    });

                    if (existingTJunction) {
                        // เพิ่มท่อเข้าไปใน T-junction ที่มีอยู่
                        if (!existingTJunction.pipes.includes(pipe.id)) {
                            existingTJunction.pipes.push(pipe.id);
                        }
                        if (!existingTJunction.pipes.includes(otherPipe.id)) {
                            existingTJunction.pipes.push(otherPipe.id);
                        }
                    } else {
                        // สร้าง T-junction ใหม่
                        tJunctions.push({
                            position: endpoint,
                            pipes: [pipe.id, otherPipe.id],
                        });
                    }
                }
            });
        });
    });

    return tJunctions;
}

/**
 * หาจุดตัดของเส้นตรงสองเส้นด้วยสูตรคณิตศาสตร์
 */
function findMathematicalLineIntersection(
    p1: Coordinate | CanvasCoordinate,
    p2: Coordinate | CanvasCoordinate,
    p3: Coordinate | CanvasCoordinate,
    p4: Coordinate | CanvasCoordinate
): (Coordinate | CanvasCoordinate) | null {
    // ใช้สูตร Line-Line Intersection
    // Line 1: จาก p1 ไป p2
    // Line 2: จาก p3 ไป p4

    const isCanvas = isCanvasCoordinate(p1);

    let x1: number, y1: number, x2: number, y2: number;
    let x3: number, y3: number, x4: number, y4: number;

    if (isCanvas) {
        const cp1 = p1 as CanvasCoordinate;
        const cp2 = p2 as CanvasCoordinate;
        const cp3 = p3 as CanvasCoordinate;
        const cp4 = p4 as CanvasCoordinate;

        x1 = cp1.x;
        y1 = cp1.y;
        x2 = cp2.x;
        y2 = cp2.y;
        x3 = cp3.x;
        y3 = cp3.y;
        x4 = cp4.x;
        y4 = cp4.y;
    } else {
        const gp1 = p1 as Coordinate;
        const gp2 = p2 as Coordinate;
        const gp3 = p3 as Coordinate;
        const gp4 = p4 as Coordinate;

        x1 = gp1.lng;
        y1 = gp1.lat;
        x2 = gp2.lng;
        y2 = gp2.lat;
        x3 = gp3.lng;
        y3 = gp3.lat;
        x4 = gp4.lng;
        y4 = gp4.lat;
    }

    // คำนวณ determinant
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    // เส้นขึ้งขนานกัน
    if (Math.abs(denom) < 1e-10) {
        return null;
    }

    // คำนวณจุดตัด
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    // ตรวจสอบว่าจุดตัดอยู่บนเส้นตรงทั้งสอง (0 <= t <= 1 และ 0 <= u <= 1)
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        const intersectionX = x1 + t * (x2 - x1);
        const intersectionY = y1 + t * (y2 - y1);

        if (isCanvas) {
            return { x: intersectionX, y: intersectionY } as CanvasCoordinate;
        } else {
            return { lng: intersectionX, lat: intersectionY } as Coordinate;
        }
    }

    return null;
}

/**
 * ตรวจสอบว่าจุดอยู่บนเส้นตรงหรือไม่
 */
function isPointOnLineSegment(
    point: Coordinate | CanvasCoordinate,
    lineStart: Coordinate | CanvasCoordinate,
    lineEnd: Coordinate | CanvasCoordinate,
    tolerance: number,
    scale: number
): boolean {
    const distToStart = calculateDistance(
        point,
        lineStart,
        isCanvasCoordinate(point) ? scale : undefined
    );
    const distToEnd = calculateDistance(
        point,
        lineEnd,
        isCanvasCoordinate(point) ? scale : undefined
    );
    const lineLength = calculateDistance(
        lineStart,
        lineEnd,
        isCanvasCoordinate(lineStart) ? scale : undefined
    );

    // จุดอยู่บนเส้นถ้าระยะทางจากจุดไปยังปลายทั้งสองรวมกันเท่ากับความยาวของเส้น
    return Math.abs(distToStart + distToEnd - lineLength) <= tolerance;
}
