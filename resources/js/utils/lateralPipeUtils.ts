/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

export interface Coordinate {
    lat: number;
    lng: number;
}

// 🚀 Caching mechanism for plant grouping
interface PlantGroupCache {
    plantsHash: string;
    rowGroups: PlantLocation[][];
    columnGroups: PlantLocation[][];
}

let plantGroupCache: PlantGroupCache | null = null;

// 🚀 Helper function to create hash from plants array for caching
const createPlantsHash = (plants: PlantLocation[]): string => {
    return plants
        .map(
            (plant) =>
                `${plant.id}:${plant.position.lat.toFixed(8)}:${plant.position.lng.toFixed(8)}:${plant.rotationAngle || 0}`
        )
        .join('|');
};

// 🚀 Clear plant grouping cache - useful when plants array structure changes significantly
export const clearPlantGroupingCache = (): void => {
    plantGroupCache = null;
};

// ฟังก์ชันตรวจจับจุดตัดระหว่างเส้นตรง 2 เส้น (ปรับปรุงให้แม่นยำขึ้น)
export const findLineIntersection = (
    line1Start: Coordinate,
    line1End: Coordinate,
    line2Start: Coordinate,
    line2End: Coordinate
): Coordinate | null => {
    // ตรวจสอบ input validity
    if (!line1Start || !line1End || !line2Start || !line2End) {
        return null;
    }

    const x1 = line1Start.lng,
        y1 = line1Start.lat;
    const x2 = line1End.lng,
        y2 = line1End.lat;
    const x3 = line2Start.lng,
        y3 = line2Start.lat;
    const x4 = line2End.lng,
        y4 = line2End.lat;

    // ตรวจสอบค่าพิกัดให้อยู่ในช่วงที่เป็นไปได้
    if (
        !isFinite(x1) ||
        !isFinite(y1) ||
        !isFinite(x2) ||
        !isFinite(y2) ||
        !isFinite(x3) ||
        !isFinite(y3) ||
        !isFinite(x4) ||
        !isFinite(y4)
    ) {
        return null;
    }

    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    if (Math.abs(denominator) < 1e-10) {
        return null; // เส้นขนานกัน
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        // จุดตัดอยู่บนทั้งสองเส้น
        const intersectionLat = y1 + t * (y2 - y1);
        const intersectionLng = x1 + t * (x2 - x1);

        // ตรวจสอบผลลัพธ์ก่อนส่งคืน
        if (isFinite(intersectionLat) && isFinite(intersectionLng)) {
            return {
                lat: intersectionLat,
                lng: intersectionLng,
            };
        }
    }

    return null; // ไม่มีจุดตัด
};

// ฟังก์ชันหาจุดตัดระหว่างท่อย่อยกับท่อเมนรอง
export const findLateralSubMainIntersection = (
    lateralStart: Coordinate,
    lateralEnd: Coordinate,
    subMainPipes: SubMainPipe[]
): {
    intersectionPoint: Coordinate;
    subMainPipeId: string;
    segmentIndex: number;
} | null => {
    for (const subMainPipe of subMainPipes) {
        if (!subMainPipe.coordinates || subMainPipe.coordinates.length < 2) {
            continue;
        }

        for (let i = 0; i < subMainPipe.coordinates.length - 1; i++) {
            const segmentStart = subMainPipe.coordinates[i];
            const segmentEnd = subMainPipe.coordinates[i + 1];

            const intersection = findLineIntersection(
                lateralStart,
                lateralEnd,
                segmentStart,
                segmentEnd
            );

            if (intersection) {
                return {
                    intersectionPoint: intersection,
                    subMainPipeId: subMainPipe.id,
                    segmentIndex: i,
                };
            }
        }
    }

    return null;
};

// ฟังก์ชันใหม่: หาจุดตัดระหว่างท่อย่อยกับท่อเมนรอง (เมื่อท่อย่อยลากผ่านท่อเมนรอง)
export const findLateralToSubMainIntersections = (
    lateralPipes: any[],
    subMainPipes: any[],
    zones?: any[],
    irrigationZones?: any[],
    snapThreshold: number = 10
): {
    lateralPipeId: string;
    subMainPipeId: string;
    intersectionPoint: Coordinate;
    segmentIndex: number;
}[] => {
    const intersections: {
        lateralPipeId: string;
        subMainPipeId: string;
        intersectionPoint: Coordinate;
        segmentIndex: number;
    }[] = [];

    // Helper function สำหรับหาโซนของท่อ (ปรับปรุงให้ตรวจสอบหลายจุด)
    const findPipeZone = (pipe: any): string | null => {
        if (!pipe.coordinates || pipe.coordinates.length === 0) return null;

        // ตรวจสอบหลายจุดในท่อ: จุดเริ่มต้น, กึ่งกลาง, และจุดปลาย
        const pointsToCheck: Coordinate[] = [];
        const coords = pipe.coordinates;
        
        // จุดเริ่มต้น
        pointsToCheck.push(coords[0]);
        
        // จุดกึ่งกลาง (ถ้ามีมากกว่า 2 จุด)
        if (coords.length > 2) {
            const midIndex = Math.floor(coords.length / 2);
            pointsToCheck.push(coords[midIndex]);
        }
        
        // จุดปลาย
        if (coords.length > 1) {
            pointsToCheck.push(coords[coords.length - 1]);
        }

        // ตรวจสอบแต่ละจุดใน irrigationZones ก่อน
        if (irrigationZones) {
            for (const zone of irrigationZones) {
                for (const point of pointsToCheck) {
                    if (isPointInPolygon(point, zone.coordinates)) {
                        return zone.id;
                    }
                }
            }
        }

        // ตรวจสอบใน zones รอง
        if (zones) {
            for (const zone of zones) {
                for (const point of pointsToCheck) {
                    if (isPointInPolygon(point, zone.coordinates)) {
                        return zone.id;
                    }
                }
            }
        }

        return null;
    };

    for (const lateralPipe of lateralPipes) {
        if (!lateralPipe.coordinates || lateralPipe.coordinates.length < 2) {
            continue;
        }

        const lateralZone = findPipeZone(lateralPipe);

        for (const subMainPipe of subMainPipes) {
            if (!subMainPipe.coordinates || subMainPipe.coordinates.length < 2) {
                continue;
            }

            const subMainZone = findPipeZone(subMainPipe);

            // เชื่อมต่อเฉพาะท่อที่อยู่ในโซนเดียวกัน
            if (lateralZone && subMainZone && lateralZone !== subMainZone) {
                continue;
            }

            // 🔥 ตรวจสอบ groupId - ถ้าท่อมี groupId เดียวกันแล้ว ไม่ต้องสร้างจุดตัด
            const lateralGroupId = (lateralPipe as any).groupId;
            const subMainGroupId = (subMainPipe as any).groupId;
            
            if (lateralGroupId && subMainGroupId && lateralGroupId === subMainGroupId) {
                continue; // ข้าม - เป็นกลุ่มเดียวกันแล้ว
            }

            // หาจุดตัดระหว่างท่อย่อยกับท่อเมนรอง
            for (let i = 0; i < subMainPipe.coordinates.length - 1; i++) {
                const segmentStart = subMainPipe.coordinates[i];
                const segmentEnd = subMainPipe.coordinates[i + 1];

                const intersection = findLineIntersection(
                    lateralPipe.coordinates[0],
                    lateralPipe.coordinates[lateralPipe.coordinates.length - 1],
                    segmentStart,
                    segmentEnd
                );

                if (intersection) {
                    // ตรวจสอบว่าระยะห่างไม่เกิน threshold
                    const distanceToStart = calculateDistanceBetweenPoints(
                        intersection,
                        lateralPipe.coordinates[0]
                    );
                    const distanceToEnd = calculateDistanceBetweenPoints(
                        intersection,
                        lateralPipe.coordinates[lateralPipe.coordinates.length - 1]
                    );
                    const lateralLength = calculateDistanceBetweenPoints(
                        lateralPipe.coordinates[0],
                        lateralPipe.coordinates[lateralPipe.coordinates.length - 1]
                    );

                    // 🔥 แก้ไขเงื่อนไข: ตรวจสอบว่าจุดตัดอยู่ "ระหว่าง" จุดเริ่มต้นและจุดสิ้นสุด
                    // ไม่ใช่ที่จุดเริ่มต้นหรือจุดสิ้นสุด (ซึ่งควรเป็น connection ไม่ใช่ intersection)
                    const isAtStart = distanceToStart < 5; // ใกล้จุดเริ่มต้นมาก (5 เมตร)
                    const isAtEnd = distanceToEnd < 5; // ใกล้จุดสิ้นสุดมาก (5 เมตร)
                    const isInMiddle =
                        distanceToStart > 5 &&
                        distanceToEnd > 5 &&
                        distanceToStart < lateralLength - 5 &&
                        distanceToEnd < lateralLength - 5;

                    // เฉพาะจุดที่อยู่ตรงกลางท่อย่อยเท่านั้นที่ถือเป็น intersection
                    if (isInMiddle) {
                        intersections.push({
                            lateralPipeId: lateralPipe.id,
                            subMainPipeId: subMainPipe.id,
                            intersectionPoint: {
                                lat: parseFloat(intersection.lat.toFixed(8)),
                                lng: parseFloat(intersection.lng.toFixed(8)),
                            },
                            segmentIndex: i,
                        });
                    }
                }
            }
        }
    }

    return intersections;
};

// ฟังก์ชันคำนวณสถิติแยกส่วนของท่อย่อย
export const calculateLateralPipeSegmentStats = (
    lateralStart: Coordinate,
    lateralEnd: Coordinate,
    intersectionPoint: Coordinate,
    plants: PlantLocation[]
): {
    segment1: {
        length: number;
        plants: PlantLocation[];
        waterNeed: number;
    };
    segment2: {
        length: number;
        plants: PlantLocation[];
        waterNeed: number;
    };
    total: {
        length: number;
        plants: PlantLocation[];
        waterNeed: number;
    };
} => {
    // คำนวณความยาวแต่ละส่วน
    const segment1Length = calculateDistanceBetweenPoints(lateralStart, intersectionPoint);
    const segment2Length = calculateDistanceBetweenPoints(intersectionPoint, lateralEnd);
    const totalLength = calculateDistanceBetweenPoints(lateralStart, lateralEnd);

    // แบ่งต้นไม้ตามส่วน - ใช้ระยะทางจากจุดเริ่ม
    const segment1Plants: PlantLocation[] = [];
    const segment2Plants: PlantLocation[] = [];

    const distanceFromStartToIntersection = segment1Length;
    const totalDistance = totalLength;

    plants.forEach((plant) => {
        // หาจุดที่ใกล้ที่สุดบนเส้นท่อย่อยสำหรับต้นไม้นี้
        const closestPoint = findClosestPointOnLineSegment(
            plant.position,
            lateralStart,
            lateralEnd
        );
        const distanceFromStart = calculateDistanceBetweenPoints(lateralStart, closestPoint);

        // ถ้าระยะทางจากจุดเริ่มต้นถึงจุดที่ใกล้ที่สุด น้อยกว่าระยะทางจากจุดเริ่มต้นถึงจุดตัด
        // แสดงว่าต้นไม้อยู่ในส่วนแรก
        if (distanceFromStart <= distanceFromStartToIntersection + 1) {
            // +1 เพื่อความยืดหยุ่น
            segment1Plants.push(plant);
        } else {
            segment2Plants.push(plant);
        }
    });

    // คำนวณความต้องการน้ำ
    const segment1WaterNeed = segment1Plants.reduce(
        (sum, plant) => sum + plant.plantData.waterNeed,
        0
    );
    const segment2WaterNeed = segment2Plants.reduce(
        (sum, plant) => sum + plant.plantData.waterNeed,
        0
    );
    const totalWaterNeed = segment1WaterNeed + segment2WaterNeed;

    return {
        segment1: {
            length: segment1Length,
            plants: segment1Plants,
            waterNeed: segment1WaterNeed,
        },
        segment2: {
            length: segment2Length,
            plants: segment2Plants,
            waterNeed: segment2WaterNeed,
        },
        total: {
            length: totalLength,
            plants: plants,
            waterNeed: totalWaterNeed,
        },
    };
};

// ฟังก์ชันหาจุดเชื่อมต่อระหว่างท่อเมนและท่อเมนรอง (แก้ไขให้ตรงกับตำแหน่งจริง)
// 🎯 แสดงการเชื่อมต่อปลายท่อเมนกับระหว่างท่อเมนรอง (Mid-Pipe Connection)
export const findMainToSubMainConnections = (
    mainPipes: any[],
    subMainPipes: any[],
    zones?: any[],
    irrigationZones?: any[],
    snapThreshold: number = 15
): {
    mainPipeId: string;
    subMainPipeId: string;
    connectionPoint: Coordinate;
}[] => {
    const connections: {
        mainPipeId: string;
        subMainPipeId: string;
        connectionPoint: Coordinate;
    }[] = [];

    if (!mainPipes || !subMainPipes || mainPipes.length === 0 || subMainPipes.length === 0) {
        return connections;
    }

    // Helper function สำหรับหาโซนของท่อ (ตามจุดปลาย)
    const findPipeZone = (pipe: any): string | null => {
        if (!pipe.coordinates || pipe.coordinates.length === 0) return null;

        const endPoint = pipe.coordinates[pipe.coordinates.length - 1];

        // ตรวจสอบใน irrigationZones ก่อน
        if (irrigationZones) {
            for (const zone of irrigationZones) {
                if (isPointInPolygon(endPoint, zone.coordinates)) {
                    return zone.id;
                }
            }
        }

        // ตรวจสอบใน zones รอง
        if (zones) {
            for (const zone of zones) {
                if (isPointInPolygon(endPoint, zone.coordinates)) {
                    return zone.id;
                }
            }
        }

        return null;
    };

    // 🔥 วิธีใหม่: หาท่อ main ที่เชื่อมกับท่อ submain จริงๆ ก่อน
    for (const subMainPipe of subMainPipes) {
        if (!subMainPipe.coordinates || subMainPipe.coordinates.length < 2) {
            continue;
        }

        const subMainStart = subMainPipe.coordinates[0];
        const subMainZone = findPipeZone(subMainPipe);
        
        // หาท่อ main ที่ใกล้ที่สุดกับท่อ submain นี้
        let closestMainPipe: any = null;
        let closestDistance = Infinity;
        let closestMainEnd: Coordinate | null = null;
        
        for (const mainPipe of mainPipes) {
            if (!mainPipe.coordinates || mainPipe.coordinates.length < 2) {
                continue;
            }
            
            const mainEnd = mainPipe.coordinates[mainPipe.coordinates.length - 1];
            const mainZone = findPipeZone(mainPipe);
            
                // 🔥 เข้มงวดการตรวจสอบโซน: เชื่อมต่อเฉพาะท่อที่อยู่ในโซนเดียวกัน
                if (mainZone && subMainZone && mainZone !== subMainZone) {
                    continue; // ข้าม - ห้ามเชื่อมข้ามโซนโดยเด็ดขาด
                }
            
            // คำนวณระยะห่างจากปลายท่อ main ไปยังจุดเริ่มต้นของท่อ submain
            const distanceToSubMainStart = calculateDistanceBetweenPoints(mainEnd, subMainStart);
            
            if (distanceToSubMainStart < closestDistance) {
                closestDistance = distanceToSubMainStart;
                closestMainPipe = mainPipe;
                closestMainEnd = mainEnd;
            }
        }
        
        // ถ้าเจอท่อ main ที่ใกล้ที่สุด ให้ตรวจสอบการเชื่อมต่อ
        if (closestMainPipe && closestMainEnd) {
            
            // 🔥 ตรวจสอบปลายท่อเมนกับทุกจุดบนท่อเมนรอง (ยกเว้นจุดปลายเริ่มต้น)
            for (let i = 1; i < subMainPipe.coordinates.length; i++) { // เริ่มจาก index 1 (ข้ามจุดเริ่มต้น)
                const subMainPoint = subMainPipe.coordinates[i];
                const distanceToSubMainPoint = calculateDistanceBetweenPoints(closestMainEnd, subMainPoint);
                
                // 🔥 ตรวจสอบว่าไม่ใช่การเชื่อมปลายต่อปลาย (end-to-end connection) - ใช้ 1 เมตรเป็นเกณฑ์
                const subMainStart = subMainPipe.coordinates[0];
                const subMainEnd = subMainPipe.coordinates[subMainPipe.coordinates.length - 1];
                const distanceToSubMainStart = calculateDistanceBetweenPoints(closestMainEnd, subMainStart);
                const distanceToSubMainEnd = calculateDistanceBetweenPoints(closestMainEnd, subMainEnd);
                const isEndToEndConnection = distanceToSubMainStart <= 1.0 || distanceToSubMainEnd <= 1.0;

                // 🔥 สร้าง mid-connection เมื่อระยะ > 1m และไม่ใช่ end-to-end connection
                if (distanceToSubMainPoint > 1.0 && !isEndToEndConnection) {
                    connections.push({
                        mainPipeId: closestMainPipe.id,
                        subMainPipeId: subMainPipe.id,
                        connectionPoint: {
                            lat: parseFloat(closestMainEnd.lat.toFixed(8)),
                            lng: parseFloat(closestMainEnd.lng.toFixed(8))
                        }
                    });

                    break; // หาเจอแล้ว ไม่ต้องตรวจสอบจุดอื่น
                }
            }
        }
    }

    return connections;
};

// ฟังก์ชันหาจุดเชื่อมต่อปลาย-ปลาย (End-to-End) ระหว่างท่อเมนและท่อเมนรอง
// 🎯 แสดงเฉพาะการเชื่อมต่อปลาย-ปลาย (End-to-End) เท่านั้น - สีแดง
export const findEndToEndConnections = (
    mainPipes: any[],
    subMainPipes: any[],
    zones?: any[],
    irrigationZones?: any[],
    snapThreshold: number = 15
): {
    mainPipeId: string;
    subMainPipeId: string;
    connectionPoint: Coordinate;
}[] => {
    const connections: {
        mainPipeId: string;
        subMainPipeId: string;
        connectionPoint: Coordinate;
    }[] = [];

    if (!mainPipes || !subMainPipes || mainPipes.length === 0 || subMainPipes.length === 0) {
        return connections;
    }

    // Helper function สำหรับหาโซนของท่อ (ตามจุดปลาย)
    const findPipeZone = (pipe: any): string | null => {
        if (!pipe.coordinates || pipe.coordinates.length === 0) return null;

        const endPoint = pipe.coordinates[pipe.coordinates.length - 1];

        // ตรวจสอบใน irrigationZones ก่อน
        if (irrigationZones) {
            for (const zone of irrigationZones) {
                if (isPointInPolygon(endPoint, zone.coordinates)) {
                    return zone.id;
                }
            }
        }

        // ตรวจสอบใน zones รอง
        if (zones) {
            for (const zone of zones) {
                if (isPointInPolygon(endPoint, zone.coordinates)) {
                    return zone.id;
                }
            }
        }

        return null;
    };

    for (const mainPipe of mainPipes) {
        if (!mainPipe.coordinates || mainPipe.coordinates.length < 2) {
            continue;
        }

        const mainEnd = mainPipe.coordinates[mainPipe.coordinates.length - 1];
        const mainZone = findPipeZone(mainPipe);

        for (const subMainPipe of subMainPipes) {
            if (!subMainPipe.coordinates || subMainPipe.coordinates.length < 2) {
                continue;
            }

            const subMainStart = subMainPipe.coordinates[0];
            const subMainZone = findPipeZone(subMainPipe);

            // 🔥 เข้มงวดการตรวจสอบโซน: เชื่อมต่อเฉพาะท่อที่อยู่ในโซนเดียวกัน
            if (mainZone && subMainZone && mainZone !== subMainZone) {
                continue;
            }
            
            // 🔥 ตรวจสอบเฉพาะการเชื่อมต่อปลาย-ปลาย (End-to-End) - เฉพาะระยะไม่เกิน 1 เมตร
            const distance = calculateDistanceBetweenPoints(mainEnd, subMainStart);
            
            // ✅ เชื่อมต่อ end-to-end เฉพาะเมื่อระยะห่างไม่เกิน 1 เมตรเท่านั้น
            if (distance <= 1.0) { // เปลี่ยนจาก snapThreshold เป็น 1.0 เมตร
                // ✅ ใช้จุดที่ท่อเชื่อมต่อกันจริง (ปลายท่อเมน) แทนจุดกึ่งกลาง
                const connectionPoint = {
                    lat: mainEnd.lat,
                    lng: mainEnd.lng
                };

                connections.push({
                    mainPipeId: mainPipe.id,
                    subMainPipeId: subMainPipe.id,
                    connectionPoint: connectionPoint,
                });
            }
        }
    }

    return connections;
};

// Helper function สำหรับตรวจสอบว่าท่อเมนผ่านหลายโซนหรือไม่
const checkMainPipePassesThroughMultipleZones = (
    mainPipe: any,
    zones?: any[],
    irrigationZones?: any[]
): boolean => {
    if (!mainPipe.coordinates || mainPipe.coordinates.length < 2) return false;

    const zonesFound = new Set<string>();

    // ตรวจสอบทุกจุดของท่อเมน
    for (const point of mainPipe.coordinates) {
        // ตรวจสอบใน irrigationZones ก่อน
        if (irrigationZones) {
            for (const zone of irrigationZones) {
                if (isPointInPolygon(point, zone.coordinates)) {
                    zonesFound.add(zone.id);
                }
            }
        }

        // ตรวจสอบใน zones รอง
        if (zones) {
            for (const zone of zones) {
                if (isPointInPolygon(point, zone.coordinates)) {
                    zonesFound.add(zone.id);
                }
            }
        }
    }

    // ถ้าผ่านมากกว่า 1 โซน แสดงว่าเป็นท่อข้ามโซน
    return zonesFound.size > 1;
};

// Helper function สำหรับหาโซนที่จุดอยู่
const findZoneAtPoint = (
    point: Coordinate,
    zones?: any[],
    irrigationZones?: any[]
): string | null => {
    // ตรวจสอบใน irrigationZones ก่อน
    if (irrigationZones) {
        for (const zone of irrigationZones) {
            if (isPointInPolygon(point, zone.coordinates)) {
                return zone.id;
            }
        }
    }

    // ตรวจสอบใน zones รอง
    if (zones) {
        for (const zone of zones) {
            if (isPointInPolygon(point, zone.coordinates)) {
                return zone.id;
            }
        }
    }

    return null;
};

// Helper function สำหรับตรวจสอบจุดอยู่ในโซนหรือไม่
const isPointInPolygon = (point: Coordinate, polygon: Coordinate[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        if (
            polygon[i].lat > point.lat !== polygon[j].lat > point.lat &&
            point.lng <
                ((polygon[j].lng - polygon[i].lng) * (point.lat - polygon[i].lat)) /
                    (polygon[j].lat - polygon[i].lat) +
                    polygon[i].lng
        ) {
            inside = !inside;
        }
    }
    return inside;
};

// ฟังก์ชันหาจุดเชื่อมต่อระหว่างท่อเมนรองและท่อย่อย (จุดเริ่มต้น)
// 🎯 ปรับปรุงให้ตรวจสอบโซนด้วย - เชื่อมต่อเฉพาะท่อที่อยู่ในโซนเดียวกัน
export const findSubMainToLateralStartConnections = (
    subMainPipes: any[],
    lateralPipes: any[],
    zones?: any[], // เพิ่ม zones parameter
    irrigationZones?: any[], // เพิ่ม irrigationZones parameter
    snapThreshold: number = 10
): {
    subMainPipeId: string;
    lateralPipeId: string;
    connectionPoint: Coordinate;
}[] => {
    const connections: {
        subMainPipeId: string;
        lateralPipeId: string;
        connectionPoint: Coordinate;
    }[] = [];

    // 🔥 เพิ่ม Set เพื่อป้องกันการสร้างจุดเชื่อมต่อซ้ำ (รวม groupId)
    const connectionKeys = new Set<string>();

    // Helper function สำหรับหาโซนของท่อ (ปรับปรุงให้ตรวจสอบหลายจุด)
    const findPipeZone = (pipe: any): string | null => {
        if (!pipe.coordinates || pipe.coordinates.length === 0) return null;

        // ตรวจสอบหลายจุดในท่อ: จุดเริ่มต้น, กึ่งกลาง, และจุดปลาย
        const pointsToCheck: Coordinate[] = [];
        const coords = pipe.coordinates;
        
        // จุดเริ่มต้น
        pointsToCheck.push(coords[0]);
        
        // จุดกึ่งกลาง (ถ้ามีมากกว่า 2 จุด)
        if (coords.length > 2) {
            const midIndex = Math.floor(coords.length / 2);
            pointsToCheck.push(coords[midIndex]);
        }
        
        // จุดปลาย
        if (coords.length > 1) {
            pointsToCheck.push(coords[coords.length - 1]);
        }

        // ตรวจสอบแต่ละจุดใน irrigationZones ก่อน
        if (irrigationZones) {
            for (const zone of irrigationZones) {
                for (const point of pointsToCheck) {
                    if (isPointInPolygon(point, zone.coordinates)) {
                        return zone.id;
                    }
                }
            }
        }

        // ตรวจสอบใน zones รอง
        if (zones) {
            for (const zone of zones) {
                for (const point of pointsToCheck) {
                    if (isPointInPolygon(point, zone.coordinates)) {
                        return zone.id;
                    }
                }
            }
        }

        return null;
    };

    for (const lateralPipe of lateralPipes) {
        if (!lateralPipe.coordinates || lateralPipe.coordinates.length < 2) {
            continue;
        }

        const lateralStart = lateralPipe.coordinates[0];
        const lateralZone = findPipeZone(lateralPipe);

        for (const subMainPipe of subMainPipes) {
            if (!subMainPipe.coordinates || subMainPipe.coordinates.length < 2) {
                continue;
            }

            const subMainZone = findPipeZone(subMainPipe);

            // 🔥 เงื่อนไขสำคัญ: เชื่อมต่อเฉพาะท่อที่อยู่ในโซนเดียวกัน
            if (lateralZone && subMainZone && lateralZone !== subMainZone) {
                continue; // ข้าม - ต่างโซนกัน
            }

            // 🔥 ตรวจสอบ groupId - ถ้าท่อมี groupId เดียวกันแล้ว ไม่ต้องสร้างจุดเชื่อมต่อ
            const lateralGroupId = (lateralPipe as any).groupId;
            const subMainGroupId = (subMainPipe as any).groupId;
            
            if (lateralGroupId && subMainGroupId && lateralGroupId === subMainGroupId) {
                continue; // ข้าม - เป็นกลุ่มเดียวกันแล้ว
            }

            // 🔧 ปรับปรุงการตรวจสอบ: ตรวจสอบว่าท่อย่อยเริ่มต้นที่ท่อเมนรองจริงๆ
            const closestPoint = findClosestConnectionPoint(lateralStart, subMainPipe);

            if (closestPoint) {
                const distance = calculateDistanceBetweenPoints(lateralStart, closestPoint);

                // 🔥 ลด snapThreshold เป็น 10 เมตรแทน 20 เมตร เพื่อความแม่นยำ
                const adjustedThreshold = Math.min(snapThreshold, 10);

                if (distance <= adjustedThreshold) {
                    // 🔥 สร้าง unique key รวม groupId เพื่อป้องกันการซ้ำซ้อน
                    const connectionKey = `${subMainPipe.id}-${lateralPipe.id}-${lateralGroupId || 'none'}-${subMainGroupId || 'none'}`;

                    if (!connectionKeys.has(connectionKey)) {
                        connectionKeys.add(connectionKey);
                        connections.push({
                            subMainPipeId: subMainPipe.id,
                            lateralPipeId: lateralPipe.id,
                            connectionPoint: {
                                lat: parseFloat(closestPoint.lat.toFixed(8)),
                                lng: parseFloat(closestPoint.lng.toFixed(8)),
                            },
                        });
                    }
                }
            }
        }
    }

    return connections;
};

// ฟังก์ชันหาจุดตัดระหว่างท่อเมนรองกับท่อเมน (ท่อเมนรองลากผ่านท่อเมน)
// 🎯 ปรับปรุงให้ตรวจสอบโซนด้วย - เชื่อมต่อเฉพาะท่อที่อยู่ในโซนเดียวกัน
export const findSubMainToMainIntersections = (
    subMainPipes: any[],
    mainPipes: any[],
    zones?: any[], // เพิ่ม zones parameter
    irrigationZones?: any[] // เพิ่ม irrigationZones parameter
): {
    subMainPipeId: string;
    mainPipeId: string;
    intersectionPoint: Coordinate;
    subMainSegmentIndex: number;
    mainSegmentIndex: number;
}[] => {
    const intersections: {
        subMainPipeId: string;
        mainPipeId: string;
        intersectionPoint: Coordinate;
        subMainSegmentIndex: number;
        mainSegmentIndex: number;
    }[] = [];

    // 🔥 เพิ่ม Set เพื่อป้องกันการสร้างจุดตัดซ้ำ
    const intersectionKeys = new Set<string>();

    // Helper function สำหรับหาโซนของท่อ (ตามจุดปลาย)
    const findPipeZone = (pipe: any): string | null => {
        if (!pipe.coordinates || pipe.coordinates.length === 0) return null;

        const endPoint = pipe.coordinates[pipe.coordinates.length - 1];

        // ตรวจสอบใน irrigationZones ก่อน
        if (irrigationZones) {
            for (const zone of irrigationZones) {
                if (isPointInPolygon(endPoint, zone.coordinates)) {
                    return zone.id;
                }
            }
        }

        // ตรวจสอบใน zones รอง
        if (zones) {
            for (const zone of zones) {
                if (isPointInPolygon(endPoint, zone.coordinates)) {
                    return zone.id;
                }
            }
        }

        return null;
    };

    for (const subMainPipe of subMainPipes) {
        if (!subMainPipe.coordinates || subMainPipe.coordinates.length < 2) {
            continue;
        }

        const subMainZone = findPipeZone(subMainPipe);

        for (const mainPipe of mainPipes) {
            if (!mainPipe.coordinates || mainPipe.coordinates.length < 2) {
                continue;
            }

            const mainZone = findPipeZone(mainPipe);

            // 🔥 เข้มงวดการตรวจสอบโซน: ห้ามท่อคนละโซนตัดกัน
            if (subMainZone && mainZone && subMainZone !== mainZone) {
                continue; // ข้าม - ท่อคนละโซนไม่ควรตัดกัน
            }

            // 🔥 ตรวจสอบเพิ่มเติม: ถ้าท่อเมนรองเชื่อมกับท่อเมนที่จุดปลาย ให้ข้าม
            // เพราะนี่ควรเป็น connection (สีแดง) ไม่ใช่ intersection (สีน้ำเงิน)
            const subMainStart = subMainPipe.coordinates[0];
            const subMainEnd = subMainPipe.coordinates[subMainPipe.coordinates.length - 1];
            const mainStart = mainPipe.coordinates[0];
            const mainEnd = mainPipe.coordinates[mainPipe.coordinates.length - 1];

            const distanceToMainStart = calculateDistanceBetweenPoints(subMainStart, mainStart);
            const distanceToMainEnd = calculateDistanceBetweenPoints(subMainStart, mainEnd);
            const distanceToMainStartFromEnd = calculateDistanceBetweenPoints(
                subMainEnd,
                mainStart
            );
            const distanceToMainEndFromEnd = calculateDistanceBetweenPoints(subMainEnd, mainEnd);

            // 🔥 เพิ่ม threshold เป็น 25 เมตรเพื่อแยกแยะ connection กับ intersection ให้ชัดเจนขึ้น
            if (
                distanceToMainStart < 25 ||
                distanceToMainEnd < 25 ||
                distanceToMainStartFromEnd < 25 ||
                distanceToMainEndFromEnd < 25
            ) {
                continue; // ข้าม - นี่ควรเป็น connection ไม่ใช่ intersection
            }

            // ตรวจสอบการตัดกันระหว่างแต่ละ segment
            for (let i = 0; i < subMainPipe.coordinates.length - 1; i++) {
                const subMainStart = subMainPipe.coordinates[i];
                const subMainEnd = subMainPipe.coordinates[i + 1];

                for (let j = 0; j < mainPipe.coordinates.length - 1; j++) {
                    const mainStart = mainPipe.coordinates[j];
                    const mainEnd = mainPipe.coordinates[j + 1];

                    const intersection = findLineIntersection(
                        subMainStart,
                        subMainEnd,
                        mainStart,
                        mainEnd
                    );

                    if (intersection) {
                        // 🔥 สร้าง unique key เพื่อป้องกันการซ้ำซ้อน
                        const intersectionKey = `${subMainPipe.id}-${mainPipe.id}-${i}-${j}`;

                        if (!intersectionKeys.has(intersectionKey)) {
                            intersectionKeys.add(intersectionKey);
                            intersections.push({
                                subMainPipeId: subMainPipe.id,
                                mainPipeId: mainPipe.id,
                                intersectionPoint: intersection,
                                subMainSegmentIndex: i,
                                mainSegmentIndex: j,
                            });
                        }
                    }
                }
            }
        }
    }

    return intersections;
};

// ฟังก์ชันหาการเชื่อมต่อระหว่างท่อ (mid-connections) - เมื่อท่อหนึ่งเชื่อมกับตรงกลางของอีกท่อหนึ่ง
// 🎯 ปรับปรุงให้แม่นยำขึ้น - แสดงเฉพาะการเชื่อมต่อกลางท่อ (Mid-Pipe Connections)
export const findMidConnections = (
    sourcePipes: any[],
    targetPipes: any[],
    snapThreshold: number = 15, // เพิ่ม threshold เล็กน้อย
    zones?: any[],
    irrigationZones?: any[]
): {
    sourcePipeId: string;
    targetPipeId: string;
    connectionPoint: Coordinate;
    sourceEndIndex: number; // 0 = start, length-1 = end
    targetSegmentIndex: number;
}[] => {
    const connections: {
        sourcePipeId: string;
        targetPipeId: string;
        connectionPoint: Coordinate;
        sourceEndIndex: number;
        targetSegmentIndex: number;
    }[] = [];

    // 🔥 เพิ่ม Set เพื่อป้องกันการสร้างจุดเชื่อมต่อซ้ำ
    const connectionKeys = new Set<string>();

    // Helper function สำหรับหาโซนของท่อ (ตามจุดปลาย)
    const findPipeZone = (pipe: any): string | null => {
        if (!pipe.coordinates || pipe.coordinates.length === 0) return null;

        const endPoint = pipe.coordinates[pipe.coordinates.length - 1];

        // ตรวจสอบใน irrigationZones ก่อน
        if (irrigationZones) {
            for (const zone of irrigationZones) {
                if (isPointInPolygon(endPoint, zone.coordinates)) {
                    return zone.id;
                }
            }
        }

        // ตรวจสอบใน zones รอง
        if (zones) {
            for (const zone of zones) {
                if (isPointInPolygon(endPoint, zone.coordinates)) {
                    return zone.id;
                }
            }
        }

        return null;
    };

    // 🔥 ตรวจสอบการเชื่อมต่อ end-to-end และ main-to-submain ก่อน เพื่อป้องกันการซ้ำซ้อน
    const endToEndConnections = findEndToEndConnections(targetPipes, sourcePipes, zones, irrigationZones, 1.0);
    const mainToSubMainConnections = findMainToSubMainConnections(targetPipes, sourcePipes, zones, irrigationZones, 15);
    
    // สร้าง Set ของการเชื่อมต่อที่มีอยู่แล้ว
    const existingConnections = new Set<string>();
    endToEndConnections.forEach(conn => {
        existingConnections.add(`${conn.mainPipeId}-${conn.subMainPipeId}`);
    });
    mainToSubMainConnections.forEach(conn => {
        existingConnections.add(`${conn.mainPipeId}-${conn.subMainPipeId}`);
    });


    for (const sourcePipe of sourcePipes) {
        if (!sourcePipe.coordinates || sourcePipe.coordinates.length < 2) {
            continue;
        }

        const sourceZone = findPipeZone(sourcePipe);

        // ตรวจสอบทั้งจุดเริ่มต้นและจุดสิ้นสุดของ source pipe
        const endpoints = [
            { point: sourcePipe.coordinates[0], index: 0 },
            {
                point: sourcePipe.coordinates[sourcePipe.coordinates.length - 1],
                index: sourcePipe.coordinates.length - 1,
            },
        ];

        for (const endpoint of endpoints) {
            for (const targetPipe of targetPipes) {
                if (
                    !targetPipe.coordinates ||
                    targetPipe.coordinates.length < 2 ||
                    targetPipe.id === sourcePipe.id
                ) {
                    continue;
                }

                const targetZone = findPipeZone(targetPipe);

                // 🔥 เข้มงวดการตรวจสอบโซน: เชื่อมต่อเฉพาะท่อที่อยู่ในโซนเดียวกัน
                if (sourceZone && targetZone && sourceZone !== targetZone) {
                    continue; // ข้าม - ห้ามเชื่อมข้ามโซนโดยเด็ดขาด
                }

                // 🔥 ตรวจสอบว่ามีการเชื่อมต่ออยู่แล้วหรือไม่ (end-to-end หรือ main-to-submain)
                const connectionKey = `${targetPipe.id}-${sourcePipe.id}`;
                if (existingConnections.has(connectionKey)) {
                    // ตรวจสอบว่าการเชื่อมต่อที่มีอยู่เป็น end-to-end หรือไม่
                    const isExistingEndToEnd = endToEndConnections.some(conn => 
                        conn.mainPipeId === targetPipe.id && conn.subMainPipeId === sourcePipe.id
                    );
                    if (isExistingEndToEnd) {
                        continue; // ข้าม - มีการเชื่อมต่อ end-to-end อยู่แล้ว
                    }
                    // ถ้าไม่ใช่ end-to-end ให้อนุญาต mid-connection
                }

                // ตรวจสอบว่าจุดปลายของ source pipe อยู่บน target pipe หรือไม่
                for (let i = 0; i < targetPipe.coordinates.length - 1; i++) {
                    const segmentStart = targetPipe.coordinates[i];
                    const segmentEnd = targetPipe.coordinates[i + 1];

                    const closestPoint = findClosestPointOnLineSegment(
                        endpoint.point,
                        segmentStart,
                        segmentEnd
                    );
                    const distance = calculateDistanceBetweenPoints(endpoint.point, closestPoint);


                    if (distance <= snapThreshold) {
                        // 🔥 ตรวจสอบว่าไม่ใช่การเชื่อมปลายต่อปลาย (end-to-end connection)
                        const isEndToEndConnection = 
                            (calculateDistanceBetweenPoints(endpoint.point, segmentStart) <= 1.0) ||
                            (calculateDistanceBetweenPoints(endpoint.point, segmentEnd) <= 1.0);

                // 🔥 ตรวจสอบเพิ่มเติม: จุดเชื่อมต้องอยู่ภายใน segment (ไม่ใช่ endpoint)
                const segmentLength = calculateDistanceBetweenPoints(segmentStart, segmentEnd);
                const distanceFromStart = calculateDistanceBetweenPoints(closestPoint, segmentStart);
                const distanceFromEnd = calculateDistanceBetweenPoints(closestPoint, segmentEnd);
                const isWithinSegment = distanceFromStart > 0.00000000000000000000000000000000000000000000000000000000000000000000000001 && distanceFromEnd > 0.00000000000000000000000000000000000000000000000000000000000000000000000001; // ลดจาก 0.0000000000000000000000000000000000000000000000000000000000000000000000001 เป็น 0.00000000000000000000000000000000000000000000000000000000000000000000000001 เมตร

                        // 🔥 ตรวจสอบเพิ่มเติม: ต้องเป็น mid-connection จริงๆ (ไม่ใช่การเชื่อมปลายต่อปลาย)
                        const isActualMidConnection = !isEndToEndConnection && isWithinSegment && distance > 1.0;
                        

                        if (isActualMidConnection) {
                            // 🔥 สร้าง unique key เพื่อป้องกันการซ้ำซ้อน
                            const connectionKey = `${sourcePipe.id}-${targetPipe.id}-${endpoint.index}-${i}`;

                            if (!connectionKeys.has(connectionKey)) {
                                connectionKeys.add(connectionKey);
                                connections.push({
                                    sourcePipeId: sourcePipe.id,
                                    targetPipeId: targetPipe.id,
                                    connectionPoint: closestPoint,
                                    sourceEndIndex: endpoint.index,
                                    targetSegmentIndex: i,
                                });
                            }
                        } else {
                        }
                    }
                }
            }
        }
    }

    return connections;
};

export interface PlantLocation {
    id: string;
    position: Coordinate;
    plantData: {
        id: number;
        name: string;
        plantSpacing: number;
        rowSpacing: number;
        waterNeed: number;
    };
    rotationAngle?: number;
}

export interface SubMainPipe {
    id: string;
    coordinates: Coordinate[];
}

// ฟังก์ชันคำนวณระยะห่างระหว่างจุด - ปรับปรุงให้แม่นยำกว่า
export const calculateDistanceBetweenPoints = (point1: Coordinate, point2: Coordinate): number => {
    // ใช้ haversine formula ที่แม่นยำสำหรับระยะทางใกล้ๆ
    const R = 6371000; // Earth's radius in meters
    const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
    const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;

    // ปรับปรุงการคำนวณให้แม่นยำกว่า
    const lat1Rad = (point1.lat * Math.PI) / 180;
    const lat2Rad = (point2.lat * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.max(0, R * c); // ป้องกันค่าลบ
};

// ฟังก์ชันหาจุดที่ใกล้ที่สุดบนเส้นตรง - ปรับปรุงความแม่นยำและ error handling
export const findClosestPointOnLineSegment = (
    point: Coordinate,
    lineStart: Coordinate,
    lineEnd: Coordinate
): Coordinate => {
    // ตรวจสอบค่า input และป้องกัน null/undefined
    if (!point || !lineStart || !lineEnd) {
        return lineStart || { lat: 0, lng: 0 };
    }

    // ตรวจสอบค่าพิกัดให้อยู่ในช่วงที่เป็นไปได้
    if (
        !isFinite(point.lat) ||
        !isFinite(point.lng) ||
        !isFinite(lineStart.lat) ||
        !isFinite(lineStart.lng) ||
        !isFinite(lineEnd.lat) ||
        !isFinite(lineEnd.lng)
    ) {
        return lineStart;
    }

    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    // ปรับปรุงการตรวจสอบความยาวของเส้นตรง - ใช้ threshold ที่เล็กกว่า
    if (lenSq < 1e-12) {
        return { lat: lineStart.lat, lng: lineStart.lng };
    }

    // คำนวณ parameter และจำกัดให้อยู่ในช่วง [0, 1]
    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));

    // คำนวณจุดที่ใกล้ที่สุด
    const result = {
        lat: lineStart.lat + param * C,
        lng: lineStart.lng + param * D,
    };

    // ตรวจสอบผลลัพธ์ก่อนส่งคืน
    if (!isFinite(result.lat) || !isFinite(result.lng)) {
        return { lat: lineStart.lat, lng: lineStart.lng };
    }

    return result;
};

// ฟังก์ชันตรวจสอบว่าจุดอยู่บนท่อเมนรองหรือไม่ (รวมถึง endpoints)
export const isPointOnSubMainPipe = (
    point: Coordinate,
    subMainPipe: SubMainPipe,
    threshold: number = 5
): boolean => {
    if (!subMainPipe.coordinates || subMainPipe.coordinates.length < 2) {
        return false;
    }

    // 🔧 เพิ่ม threshold สำหรับการรองรับการหมุนต้นไม้
    const adjustedThreshold = threshold * 1.2; // เพิ่ม 20% เพื่อรองรับการหมุน

    // 🔥 ตรวจสอบ endpoints ของท่อเมนรองก่อน (สำหรับท่อย่อยที่เชื่อมกับปลายท่อ)
    const startPoint = subMainPipe.coordinates[0];
    const endPoint = subMainPipe.coordinates[subMainPipe.coordinates.length - 1];

    // ตรวจสอบระยะห่างจากจุดเริ่มต้น
    const distanceToStart = calculateDistanceBetweenPoints(point, startPoint);
    if (distanceToStart <= adjustedThreshold) {
        return true;
    }

    // ตรวจสอบระยะห่างจากจุดสิ้นสุด
    const distanceToEnd = calculateDistanceBetweenPoints(point, endPoint);
    if (distanceToEnd <= adjustedThreshold) {
        return true;
    }

    // ตรวจสอบ line segments ตามเดิม
    for (let i = 0; i < subMainPipe.coordinates.length - 1; i++) {
        const start = subMainPipe.coordinates[i];
        const end = subMainPipe.coordinates[i + 1];

        const closestPoint = findClosestPointOnLineSegment(point, start, end);
        const distance = calculateDistanceBetweenPoints(point, closestPoint);

        if (distance <= adjustedThreshold) {
            return true;
        }
    }

    return false;
};

// ฟังก์ชันหาจุดเชื่อมต่อที่ใกล้ที่สุดบนท่อเมนรอง (ปรับปรุงให้แม่นยำขึ้น)
export const findClosestConnectionPoint = (
    point: Coordinate,
    subMainPipe: SubMainPipe
): Coordinate | null => {
    if (!subMainPipe.coordinates || subMainPipe.coordinates.length < 2) {
        return null;
    }

    let closestPoint: Coordinate | null = null;
    let minDistance = Infinity;
    let bestSegmentIndex = -1;

    // 🔧 ปรับปรุงการหาจุดใกล้ที่สุด - ให้ความสำคัญกับ perpendicular projection
    for (let i = 0; i < subMainPipe.coordinates.length - 1; i++) {
        const segmentStart = subMainPipe.coordinates[i];
        const segmentEnd = subMainPipe.coordinates[i + 1];

        // คำนวณจุดที่ฉายลงบน line segment (perpendicular projection)
        const pointOnSegment = findClosestPointOnLineSegment(point, segmentStart, segmentEnd);
        const distance = calculateDistanceBetweenPoints(point, pointOnSegment);

        // ตรวจสอบว่าการฉายลงนั้นอยู่บน segment จริงๆ หรือเป็น endpoint
        const segmentLength = calculateDistanceBetweenPoints(segmentStart, segmentEnd);
        const distanceFromStart = calculateDistanceBetweenPoints(segmentStart, pointOnSegment);
        const distanceFromEnd = calculateDistanceBetweenPoints(segmentEnd, pointOnSegment);

        // ถ้าจุดที่ฉายลงอยู่ภายใน segment (ไม่ใช่ endpoint) ให้ความสำคัญมากขึ้น
        const isWithinSegment =
            distanceFromStart < segmentLength - 0.001 && distanceFromEnd < segmentLength - 0.001;
        const adjustedDistance = isWithinSegment ? distance * 0.8 : distance; // ลดน้ำหนัก 20% ถ้าอยู่ใน segment

        if (adjustedDistance < minDistance) {
            minDistance = adjustedDistance;
            closestPoint = {
                lat: parseFloat(pointOnSegment.lat.toFixed(8)), // ปัดเศษให้แม่นยำ
                lng: parseFloat(pointOnSegment.lng.toFixed(8)),
            };
            bestSegmentIndex = i;
        }
    }

    // 🔧 ตรวจสอบ endpoints แยกต่างหาก เพื่อให้แน่ใจว่าไม่พลาด
    const startPoint = subMainPipe.coordinates[0];
    const endPoint = subMainPipe.coordinates[subMainPipe.coordinates.length - 1];

    const distanceToStart = calculateDistanceBetweenPoints(point, startPoint);
    const distanceToEnd = calculateDistanceBetweenPoints(point, endPoint);

    // ถ้า endpoint ใกล้กว่า 2 เมตร ให้ใช้ endpoint
    if (distanceToStart <= 2.0 && distanceToStart < minDistance) {
        closestPoint = { lat: startPoint.lat, lng: startPoint.lng };
        minDistance = distanceToStart;
        bestSegmentIndex = 0;
    }

    if (distanceToEnd <= 2.0 && distanceToEnd < minDistance) {
        closestPoint = { lat: endPoint.lat, lng: endPoint.lng };
        minDistance = distanceToEnd;
        bestSegmentIndex = subMainPipe.coordinates.length - 2;
    }

    return closestPoint;
};

// ฟังก์ชันจัดกลุ่มต้นไม้ตามแถว (ปรับปรุงใหม่ - รองรับการหมุน + caching)
export const groupPlantsByRows = (plants: PlantLocation[]): PlantLocation[][] => {
    if (plants.length === 0) return [];

    // 🚀 Check cache first
    const currentHash = createPlantsHash(plants);
    if (plantGroupCache && plantGroupCache.plantsHash === currentHash) {
        return plantGroupCache.rowGroups;
    }

    const groups: PlantLocation[][] = [];
    const tolerance = 0.000005; // ~0.5 เมตร tolerance - ปรับให้แม่นยำขึ้น

    // ตรวจสอบการหมุนของต้นไม้
    const rotationInfo = hasRotation(plants);

    let plantsToGroup: { plant: PlantLocation; transformedPosition: Coordinate }[] = [];

    if (rotationInfo.hasRotation) {
        // แปลงพิกัดต้นไม้ทั้งหมดเป็นระบบพิกัดที่หมุนแล้ว
        plantsToGroup = plants.map((plant) => ({
            plant,
            transformedPosition: transformToRotatedCoordinate(
                plant.position,
                rotationInfo.center,
                rotationInfo.rotationAngle
            ),
        }));
    } else {
        // ใช้พิกัดเดิมหากไม่มีการหมุน
        plantsToGroup = plants.map((plant) => ({
            plant,
            transformedPosition: plant.position,
        }));
    }

    // สร้าง clusters โดยใช้ lat coordinate ที่แปลงแล้ว
    const plantsByLat = [...plantsToGroup].sort(
        (a, b) => a.transformedPosition.lat - b.transformedPosition.lat
    );

    for (const plantData of plantsByLat) {
        let addedToGroup = false;

        // หากลุ่มที่มี lat ใกล้เคียงกัน
        for (const group of groups) {
            // คำนวณ lat เฉลี่ยจากพิกัดที่แปลงแล้ว
            const avgLat =
                group.reduce((sum, p) => {
                    const transformedPos = rotationInfo.hasRotation
                        ? transformToRotatedCoordinate(
                              p.position,
                              rotationInfo.center,
                              rotationInfo.rotationAngle
                          )
                        : p.position;
                    return sum + transformedPos.lat;
                }, 0) / group.length;

            if (Math.abs(plantData.transformedPosition.lat - avgLat) <= tolerance) {
                group.push(plantData.plant);
                addedToGroup = true;
                break;
            }
        }

        // สร้างกลุ่มใหม่หากไม่พบกลุ่มที่เข้ากันได้
        if (!addedToGroup) {
            groups.push([plantData.plant]);
        }
    }

    // กรองเฉพาะกลุ่มที่มีต้นไม้ 2 ต้นขึ้นไป และเรียงต้นไม้ในแต่ละกลุ่มตาม lng ที่แปลงแล้ว
    const filteredGroups = groups
        .filter((group) => group.length >= 2)
        .map((group) =>
            group.sort((a, b) => {
                const aTransformed = rotationInfo.hasRotation
                    ? transformToRotatedCoordinate(
                          a.position,
                          rotationInfo.center,
                          rotationInfo.rotationAngle
                      )
                    : a.position;
                const bTransformed = rotationInfo.hasRotation
                    ? transformToRotatedCoordinate(
                          b.position,
                          rotationInfo.center,
                          rotationInfo.rotationAngle
                      )
                    : b.position;
                return aTransformed.lng - bTransformed.lng;
            })
        );

    // 🚀 Update cache with row groups (will be completed when both functions are computed)
    if (!plantGroupCache || plantGroupCache.plantsHash !== currentHash) {
        plantGroupCache = {
            plantsHash: currentHash,
            rowGroups: filteredGroups,
            columnGroups:
                plantGroupCache?.plantsHash === currentHash ? plantGroupCache.columnGroups : [],
        };
    } else {
        plantGroupCache.rowGroups = filteredGroups;
    }

    return filteredGroups;
};

// ฟังก์ชันจัดกลุ่มต้นไม้ตามคอลัมน์ (ปรับปรุงใหม่ - รองรับการหมุน + caching)
export const groupPlantsByColumns = (plants: PlantLocation[]): PlantLocation[][] => {
    if (plants.length === 0) return [];

    // 🚀 Check cache first
    const currentHash = createPlantsHash(plants);
    if (
        plantGroupCache &&
        plantGroupCache.plantsHash === currentHash &&
        plantGroupCache.columnGroups.length > 0
    ) {
        return plantGroupCache.columnGroups;
    }

    const groups: PlantLocation[][] = [];
    const tolerance = 0.000005; // ~0.5 เมตร tolerance - ปรับให้แม่นยำขึ้น

    // ตรวจสอบการหมุนของต้นไม้
    const rotationInfo = hasRotation(plants);

    let plantsToGroup: { plant: PlantLocation; transformedPosition: Coordinate }[] = [];

    if (rotationInfo.hasRotation) {
        // แปลงพิกัดต้นไม้ทั้งหมดเป็นระบบพิกัดที่หมุนแล้ว
        plantsToGroup = plants.map((plant) => ({
            plant,
            transformedPosition: transformToRotatedCoordinate(
                plant.position,
                rotationInfo.center,
                rotationInfo.rotationAngle
            ),
        }));
    } else {
        // ใช้พิกัดเดิมหากไม่มีการหมุน
        plantsToGroup = plants.map((plant) => ({
            plant,
            transformedPosition: plant.position,
        }));
    }

    // สร้าง clusters โดยใช้ lng coordinate ที่แปลงแล้ว
    const plantsByLng = [...plantsToGroup].sort(
        (a, b) => a.transformedPosition.lng - b.transformedPosition.lng
    );

    for (const plantData of plantsByLng) {
        let addedToGroup = false;

        // หากลุ่มที่มี lng ใกล้เคียงกัน
        for (const group of groups) {
            // คำนวณ lng เฉลี่ยจากพิกัดที่แปลงแล้ว
            const avgLng =
                group.reduce((sum, p) => {
                    const transformedPos = rotationInfo.hasRotation
                        ? transformToRotatedCoordinate(
                              p.position,
                              rotationInfo.center,
                              rotationInfo.rotationAngle
                          )
                        : p.position;
                    return sum + transformedPos.lng;
                }, 0) / group.length;

            if (Math.abs(plantData.transformedPosition.lng - avgLng) <= tolerance) {
                group.push(plantData.plant);
                addedToGroup = true;
                break;
            }
        }

        // สร้างกลุ่มใหม่หากไม่พบกลุ่มที่เข้ากันได้
        if (!addedToGroup) {
            groups.push([plantData.plant]);
        }
    }

    // กรองเฉพาะกลุ่มที่มีต้นไม้ 2 ต้นขึ้น และเรียงต้นไม้ในแต่ละกลุ่มตาม lat ที่แปลงแล้ว
    const filteredGroups = groups
        .filter((group) => group.length >= 2)
        .map((group) =>
            group.sort((a, b) => {
                const aTransformed = rotationInfo.hasRotation
                    ? transformToRotatedCoordinate(
                          a.position,
                          rotationInfo.center,
                          rotationInfo.rotationAngle
                      )
                    : a.position;
                const bTransformed = rotationInfo.hasRotation
                    ? transformToRotatedCoordinate(
                          b.position,
                          rotationInfo.center,
                          rotationInfo.rotationAngle
                      )
                    : b.position;
                return aTransformed.lat - bTransformed.lat;
            })
        );

    // 🚀 Update cache with column groups
    if (!plantGroupCache || plantGroupCache.plantsHash !== currentHash) {
        plantGroupCache = {
            plantsHash: currentHash,
            rowGroups: plantGroupCache?.plantsHash === currentHash ? plantGroupCache.rowGroups : [],
            columnGroups: filteredGroups,
        };
    } else {
        plantGroupCache.columnGroups = filteredGroups;
    }

    return filteredGroups;
};

// ฟังก์ชันหาต้นไม้ที่อยู่ในเส้นทางของท่อย่อย (โหมด A: วางทับแนวต้นไม้)
export const findPlantsInLateralPath = (
    startPoint: Coordinate,
    endPoint: Coordinate,
    plants: PlantLocation[],
    placementMode: 'over_plants' | 'between_plants',
    snapThreshold: number = 5
): PlantLocation[] => {
    if (placementMode === 'over_plants') {
        return findPlantsInOverPlantsMode(startPoint, endPoint, plants, snapThreshold);
    } else {
        return findPlantsInBetweenPlantsMode(startPoint, endPoint, plants, snapThreshold);
    }
};

// ฟังก์ชันหาต้นไม้ในโหมดวางทับแนวต้นไม้
export const findPlantsInOverPlantsMode = (
    startPoint: Coordinate,
    endPoint: Coordinate,
    plants: PlantLocation[],
    snapThreshold: number = 5
): PlantLocation[] => {
    if (!startPoint || !endPoint || !plants || plants.length === 0) {
        return [];
    }

    const result = computeOverPlantsMode(startPoint, endPoint, plants, snapThreshold, 'rows');
    return result.selectedPlants;
};

// ฟังก์ชันหาต้นไม้ในโหมดวางระหว่างแนวต้นไม้
export const findPlantsInBetweenPlantsMode = (
    startPoint: Coordinate,
    endPoint: Coordinate,
    plants: PlantLocation[],
    snapThreshold: number = 5
): PlantLocation[] => {
    if (!startPoint || !endPoint || !plants || plants.length === 0) {
        return [];
    }

    const result = computeBetweenPlantsMode(startPoint, endPoint, plants, snapThreshold, 'rows');
    return result.selectedPlants;
};

// ฟังก์ชันช่วย: เวคเตอร์และโปรเจคชันอย่างง่ายในพิกัด lat/lng (สมมติพื้นที่เล็ก)
const normalizeVector = (v: { lat: number; lng: number }): { lat: number; lng: number } => {
    const len = Math.sqrt(v.lat * v.lat + v.lng * v.lng) || 1;
    return { lat: v.lat / len, lng: v.lng / len };
};

const subtract = (a: Coordinate, b: Coordinate): { lat: number; lng: number } => ({
    lat: a.lat - b.lat,
    lng: a.lng - b.lng,
});

const scaleAndAdd = (
    origin: Coordinate,
    dir: { lat: number; lng: number },
    t: number
): Coordinate => ({
    lat: origin.lat + dir.lat * t,
    lng: origin.lng + dir.lng * t,
});

const dot = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
    a.lat * b.lat + a.lng * b.lng;

// ฟังก์ชันใหม่สำหรับแปลงพิกัดตามการหมุน
const transformToRotatedCoordinate = (
    point: Coordinate,
    center: Coordinate,
    rotationAngle: number
): Coordinate => {
    // แปลงมุมจากองศาเป็นเรเดียน
    const angleRadians = (rotationAngle * Math.PI) / 180;
    const cos = Math.cos(-angleRadians); // ใช้ค่าติดลบเพื่อแปลงกลับ
    const sin = Math.sin(-angleRadians);

    // แปลงจุดเป็นระบบพิกัดที่มีจุดกึ่งกลางเป็นจุดเริ่มต้น
    const dx = point.lat - center.lat;
    const dy = point.lng - center.lng;

    // หมุนจุดกลับไปยังระบบพิกัดเดิม
    const rotatedLat = center.lat + dx * cos - dy * sin;
    const rotatedLng = center.lng + dx * sin + dy * cos;

    return { lat: rotatedLat, lng: rotatedLng };
};

// ฟังก์ชันหาจุดกึ่งกลางของกลุ่มต้นไม้
const getPlantGroupCenter = (plants: PlantLocation[]): Coordinate => {
    if (plants.length === 0) return { lat: 0, lng: 0 };

    const totalLat = plants.reduce((sum, plant) => sum + plant.position.lat, 0);
    const totalLng = plants.reduce((sum, plant) => sum + plant.position.lng, 0);

    return {
        lat: totalLat / plants.length,
        lng: totalLng / plants.length,
    };
};

// ฟังก์ชันตรวจสอบว่าต้นไม้มีการหมุนหรือไม่
const hasRotation = (
    plants: PlantLocation[]
): { hasRotation: boolean; rotationAngle: number; center: Coordinate } => {
    if (plants.length === 0) {
        return { hasRotation: false, rotationAngle: 0, center: { lat: 0, lng: 0 } };
    }

    // ใช้มุมหมุนจากต้นไม้ต้นแรกที่มีข้อมูล
    const plantWithRotation = plants.find((plant) => plant.rotationAngle !== undefined);
    const rotationAngle = plantWithRotation ? plantWithRotation.rotationAngle || 0 : 0;
    const center = getPlantGroupCenter(plants);

    return {
        hasRotation: Math.abs(rotationAngle) > 0.01, // tolerance สำหรับตรวจสอบว่ามีการหมุนจริงๆ
        rotationAngle,
        center,
    };
};

// ฟังก์ชันช่วย: หาทิศทางการลาก เพื่อเดาว่าควรอิงแถว (rows) หรือคอลัมน์ (columns) - ปรับปรุงความแม่นยำ
const getDragOrientation = (
    start: Coordinate,
    end: Coordinate,
    plants?: PlantLocation[]
): 'rows' | 'columns' => {
    let dLat = Math.abs(end.lat - start.lat);
    let dLng = Math.abs(end.lng - start.lng);

    // หากมีข้อมูลต้นไม้และมีการหมุน ให้ปรับการคำนวณทิศทาง
    if (plants && plants.length > 0) {
        const rotationInfo = hasRotation(plants);

        if (rotationInfo.hasRotation) {
            // แปลงจุดเริ่มต้นและสิ้นสุดเป็นระบบพิกัดที่หมุนแล้ว
            const transformedStart = transformToRotatedCoordinate(
                start,
                rotationInfo.center,
                rotationInfo.rotationAngle
            );
            const transformedEnd = transformToRotatedCoordinate(
                end,
                rotationInfo.center,
                rotationInfo.rotationAngle
            );

            dLat = Math.abs(transformedEnd.lat - transformedStart.lat);
            dLng = Math.abs(transformedEnd.lng - transformedStart.lng);
        }

        // เพิ่มการวิเคราะห์ layout ของต้นไม้ - แก้ไข performance และ division by zero
        // จำกัดการวิเคราะห์เฉพาะเมื่อมีต้นไม้จำนวนพอเหมาะ
        if (plants.length > 10 && plants.length <= 1000) {
            // จำกัด upper bound เพื่อ performance
            try {
                const rows = groupPlantsByRows(plants);
                const cols = groupPlantsByColumns(plants);

                // ตรวจสอบ validity ของผลลัพธ์
                if (Array.isArray(rows) && Array.isArray(cols)) {
                    // คำนวณค่าเฉลี่ยของจำนวนต้นไม้ในแต่ละกลุ่ม - เพิ่ม safety checks
                    const avgRowSize =
                        rows.length > 0
                            ? rows
                                  .filter((row) => Array.isArray(row))
                                  .reduce((sum, row) => sum + row.length, 0) / rows.length
                            : 0;
                    const avgColSize =
                        cols.length > 0
                            ? cols
                                  .filter((col) => Array.isArray(col))
                                  .reduce((sum, col) => sum + col.length, 0) / cols.length
                            : 0;

                    // ถ้าการจัดเรียงแถวมีความชัดเจนกว่าคอลัมน์ ให้ใช้แถว
                    const rowClearness = avgRowSize * rows.length;
                    const colClearness = avgColSize * cols.length;

                    // แก้ไข division by zero และเพิ่ม bounds checking
                    const maxClearness = Math.max(rowClearness, colClearness);
                    if (maxClearness > 0.1) {
                        // threshold เพื่อป้องกัน very small numbers
                        const layoutDifference =
                            Math.abs(rowClearness - colClearness) / maxClearness;
                        if (isFinite(layoutDifference) && layoutDifference > 0.3) {
                            // 30% difference threshold
                            return rowClearness > colClearness ? 'rows' : 'columns';
                        }
                    }
                }
            } catch (error) {
                // Silent fallback - ถ้า grouping fail ให้ใช้ distance-based logic
            }
        }
    }

    // ปรับปรุงการตัดสินใจด้วย threshold แบบ adaptive
    const totalDistance = dLat + dLng;
    const adaptiveThreshold = totalDistance > 0.0001 ? 0.15 : 0.08; // ลด threshold เพื่อให้แม่นยำขึ้น

    if (dLat > dLng * (1 + adaptiveThreshold)) {
        return 'columns'; // แนวตั้ง (เหนือ-ใต้)
    } else if (dLng > dLat * (1 + adaptiveThreshold)) {
        return 'rows'; // แนวนอน (ตะวันออก-ตะวันตก)
    } else {
        // กรณีที่ใกล้เคียงกัน ให้วิเคราะห์เพิ่มเติม
        const ratio = dLat / dLng;

        // ถ้าอัตราส่วนใกล้เคียง 1:1 มาก ให้เลือกทิศทางที่มีระยะทางยาวกว่าเล็กน้อย
        if (Math.abs(ratio - 1) < 0.03) { // ลด threshold เพื่อให้แม่นยำขึ้น
            // Very close to diagonal - choose based on slight preference
            return dLat > dLng ? 'columns' : 'rows';
        }

        return ratio > 1 ? 'columns' : 'rows';
    }
};

// ฟังก์ชันช่วย: หาทิศทางของแนวแถวจากพอยต์ต้น-ปลายในแถว (รองรับการหมุน)
const directionFromPlantsLine = (plants: PlantLocation[]): { lat: number; lng: number } => {
    if (!plants || plants.length < 2) return { lat: 0, lng: 1 };

    // ตรวจสอบการหมุนของต้นไม้
    const rotationInfo = hasRotation(plants);

    let sortedPlants: PlantLocation[];

    if (rotationInfo.hasRotation) {
        // แปลงพิกัดแล้วเรียงลำดับตาม lng ที่แปลงแล้ว
        const plantsWithTransformed = plants.map((plant) => ({
            plant,
            transformedPosition: transformToRotatedCoordinate(
                plant.position,
                rotationInfo.center,
                rotationInfo.rotationAngle
            ),
        }));

        sortedPlants = plantsWithTransformed
            .sort((a, b) => a.transformedPosition.lng - b.transformedPosition.lng)
            .map((item) => item.plant);
    } else {
        sortedPlants = [...plants].sort((a, b) => a.position.lng - b.position.lng);
    }

    const first = sortedPlants[0].position;
    const last = sortedPlants[sortedPlants.length - 1].position;
    return normalizeVector({ lat: last.lat - first.lat, lng: last.lng - first.lng });
};

// ฟังก์ชันช่วย: หาทิศทางของแนวคอลัมน์จากพอยต์ต้น-ปลายในคอลัมน์ (รองรับการหมุน)
const directionFromPlantsColumn = (plants: PlantLocation[]): { lat: number; lng: number } => {
    if (!plants || plants.length < 2) return { lat: 1, lng: 0 };

    // ตรวจสอบการหมุนของต้นไม้
    const rotationInfo = hasRotation(plants);

    let sortedPlants: PlantLocation[];

    if (rotationInfo.hasRotation) {
        // แปลงพิกัดแล้วเรียงลำดับตาม lat ที่แปลงแล้ว
        const plantsWithTransformed = plants.map((plant) => ({
            plant,
            transformedPosition: transformToRotatedCoordinate(
                plant.position,
                rotationInfo.center,
                rotationInfo.rotationAngle
            ),
        }));

        sortedPlants = plantsWithTransformed
            .sort((a, b) => a.transformedPosition.lat - b.transformedPosition.lat)
            .map((item) => item.plant);
    } else {
        sortedPlants = [...plants].sort((a, b) => a.position.lat - b.position.lat);
    }

    const first = sortedPlants[0].position;
    const last = sortedPlants[sortedPlants.length - 1].position;
    return normalizeVector({ lat: last.lat - first.lat, lng: last.lng - first.lng });
};

// ฟังก์ชันคำนวณ adaptive snap threshold ตามสถานการณ์ - ปรับปรุงให้แม่นยำขึ้นสำหรับต้นไม้ระยะห่างน้อย
const calculateAdaptiveSnapThreshold = (
    baseThreshold: number,
    plants: PlantLocation[],
    pipeDistance: number
): number => {
    // ตรวจสอบ input safety
    if (!plants || plants.length === 0 || !isFinite(baseThreshold) || !isFinite(pipeDistance)) {
        return Math.max(3, baseThreshold * 0.8); // ลดค่าเริ่มต้นให้แม่นยำขึ้น
    }

    // คำนวณระยะห่างเฉลี่ยของต้นไม้แบบ efficient
    let totalSpacing = 0;
    let spacingCount = 0;
    const maxSampleSize = Math.min(plants.length, 15); // ลดจำนวนตัวอย่าง
    const stride = Math.max(1, Math.floor(plants.length / maxSampleSize));

    for (let i = 0; i < plants.length - stride; i += stride) {
        if (!plants[i]?.position || !plants[i + stride]?.position) continue;

        const pos1 = plants[i].position;
        const pos2 = plants[i + stride].position;

        if (
            !isFinite(pos1.lat) ||
            !isFinite(pos1.lng) ||
            !isFinite(pos2.lat) ||
            !isFinite(pos2.lng)
        ) {
            continue;
        }

        const distance = calculateDistanceBetweenPoints(pos1, pos2);
        if (distance > 0 && distance < 50 && isFinite(distance)) {
            totalSpacing += distance;
            spacingCount++;
        }
    }

    // คำนวณ average spacing
    let avgSpacing = baseThreshold;
    if (spacingCount > 0 && totalSpacing > 0) {
        avgSpacing = totalSpacing / spacingCount;
    }

    // ปรับ threshold ให้เข้มงวดขึ้น - เน้นความแม่นยำมากกว่าความครอบคลุม
    let adaptiveThreshold = baseThreshold;

    // สำหรับต้นไม้ระยะห่างน้อย (< 5m) ใช้ threshold เล็ก
    if (avgSpacing < 5.0) {
        adaptiveThreshold = Math.min(avgSpacing * 0.4, baseThreshold * 0.6); // ลดลงมาก
    }
    // สำหรับต้นไม้ระยะห่างปานกลาง (5-15m) ใช้ threshold ปานกลาง
    else if (avgSpacing <= 15.0) {
        adaptiveThreshold = Math.min(avgSpacing * 0.5, baseThreshold * 0.8);
    }
    // สำหรับต้นไม้ระยะห่างมาก (> 15m) ใช้ threshold ใหญ่ขึ้นเล็กน้อย
    else {
        adaptiveThreshold = Math.min(avgSpacing * 0.6, baseThreshold * 1.0);
    }

    // ปรับตามความยาวท่อ - ลดการปรับเพื่อให้แม่นยำขึ้น
    if (isFinite(pipeDistance)) {
        if (pipeDistance < 10) {
            // ท่อสั้น ใช้ threshold เล็ก
            adaptiveThreshold = adaptiveThreshold * 0.8;
        } else if (pipeDistance > 30) {
            // ท่อยาว ใช้ threshold ใหญ่ขึ้นเล็กน้อย
            adaptiveThreshold = adaptiveThreshold * 1.1;
        }
    }

    // Final safety bounds - เข้มงวดขึ้น
    const result = Math.max(1.0, Math.min(baseThreshold * 0.8, adaptiveThreshold));
    return isFinite(result) ? result : Math.max(1.0, baseThreshold * 0.8);
};

// ฟังก์ชันหลัก: คำนวณการ snap และเลือกต้นไม้ตามโหมดที่กำหนด - ปรับปรุงให้ใช้ adaptive threshold
export const computeAlignedLateral = (
    startPoint: Coordinate,
    rawEndPoint: Coordinate,
    plants: PlantLocation[],
    placementMode: 'over_plants' | 'between_plants',
    snapThreshold: number = 20
): { alignedEnd: Coordinate; selectedPlants: PlantLocation[]; snappedStart: Coordinate } => {
    if (!startPoint || !rawEndPoint) {
        return {
            alignedEnd: rawEndPoint,
            selectedPlants: [],
            snappedStart: startPoint || rawEndPoint,
        };
    }

    // ตรวจสอบกรณีไม่มีต้นไม้ - ให้ใช้เส้นตรงจาก start ไป rawEnd
    if (!plants || plants.length === 0) {
        return { alignedEnd: rawEndPoint, selectedPlants: [], snappedStart: startPoint };
    }

    // คำนวณระยะทางท่อและ adaptive threshold
    const pipeDistance = calculateDistanceBetweenPoints(startPoint, rawEndPoint);
    const adaptiveThreshold = calculateAdaptiveSnapThreshold(snapThreshold, plants, pipeDistance);

    // กำหนดทิศทางของท่อจาก startPoint ไป rawEndPoint (พิจารณาการหมุนของต้นไม้)
    const direction = getDragOrientation(startPoint, rawEndPoint, plants);

    if (placementMode === 'over_plants') {
        return computeOverPlantsMode(startPoint, rawEndPoint, plants, adaptiveThreshold, direction);
    } else {
        return computeBetweenPlantsMode(
            startPoint,
            rawEndPoint,
            plants,
            adaptiveThreshold,
            direction
        );
    }
};

// ฟังก์ชันใหม่สำหรับคำนวณท่อสีเขียวที่เริ่มจากท่อเมนรอง
export const computeAlignedLateralFromMainPipe = (
    snappedStartPoint: Coordinate, // จุดเริ่มต้นที่ snap ไปท่อเมนรองแล้ว
    rawEndPoint: Coordinate,
    plants: PlantLocation[],
    placementMode: 'over_plants' | 'between_plants',
    snapThreshold: number = 20
): { alignedEnd: Coordinate; selectedPlants: PlantLocation[]; snappedStart: Coordinate } => {
    if (!snappedStartPoint || !rawEndPoint) {
        return {
            alignedEnd: rawEndPoint,
            selectedPlants: [],
            snappedStart: snappedStartPoint || rawEndPoint,
        };
    }

    // ตรวจสอบกรณีไม่มีต้นไม้ - ให้ใช้เส้นตรงจาก snappedStart ไป rawEnd
    if (!plants || plants.length === 0) {
        return { alignedEnd: rawEndPoint, selectedPlants: [], snappedStart: snappedStartPoint };
    }

    // คำนวณระยะทางท่อและ adaptive threshold (เหมือนกับ computeAlignedLateral)
    const pipeDistance = calculateDistanceBetweenPoints(snappedStartPoint, rawEndPoint);
    const adaptiveThreshold = calculateAdaptiveSnapThreshold(snapThreshold, plants, pipeDistance);

    // กำหนดทิศทางของท่อจาก snappedStartPoint ไป rawEndPoint (พิจารณาการหมุนของต้นไม้)
    const direction = getDragOrientation(snappedStartPoint, rawEndPoint, plants);

    if (placementMode === 'over_plants') {
        return computeOverPlantsModeFromMainPipe(
            snappedStartPoint,
            rawEndPoint,
            plants,
            adaptiveThreshold, // ใช้ adaptiveThreshold แทน snapThreshold
            direction
        );
    } else {
        return computeBetweenPlantsModeFromMainPipe(
            snappedStartPoint,
            rawEndPoint,
            plants,
            adaptiveThreshold, // ใช้ adaptiveThreshold แทน snapThreshold
            direction
        );
    }
};

// โหมด A: วางทับแนวต้นไม้ (ปรับปรุงใหม่ตามเงื่อนไขที่ระบุ)
export const computeOverPlantsMode = (
    initialStartPoint: Coordinate,
    rawEndPoint: Coordinate,
    plants: PlantLocation[],
    snapThreshold: number,
    direction: 'rows' | 'columns'
): { alignedEnd: Coordinate; selectedPlants: PlantLocation[]; snappedStart: Coordinate } => {
    const rows = groupPlantsByRows(plants);
    const cols = groupPlantsByColumns(plants);

    // ฟังก์ชันช่วย: หาต้นไม้ที่ใกล้ initialStartPoint ที่สุดในกลุ่ม
    const findClosestPlantToStart = (
        group: PlantLocation[]
    ): { plant: PlantLocation; distance: number } | null => {
        if (group.length === 0) return null;
        let closest: { plant: PlantLocation; distance: number } | null = null;
        group.forEach((p) => {
            const dist = calculateDistanceBetweenPoints(initialStartPoint, p.position);
            if (!closest || dist < closest.distance) {
                closest = { plant: p, distance: dist };
            }
        });
        return closest;
    };

    // หาแถวหรือคอลัมน์ตามเงื่อนไข: "ต้นไม้ต้นแรกที่ท่อย่อยวิ่งผ่าใกล้ใครที่สุด"
    interface OverPlantsAlignment {
        type: 'row' | 'col';
        plants: PlantLocation[];
        firstPlantDistance: number; // ระยะห่างของ "ต้นไม้ต้นแรก" จาก initialStartPoint
        firstPlant: PlantLocation; // ต้นไม้ต้นแรกที่ใกล้ initialStartPoint ที่สุด
        centerLine: { start: Coordinate; end: Coordinate };
    }

    let bestAlignment: OverPlantsAlignment | null = null;

    // เลือกกลุ่มต้นไม้ตามทิศทางที่กำหนด
    const targetGroups = direction === 'rows' ? rows : cols;
    const groupType = direction === 'rows' ? 'row' : 'col';

    // ตรวจสอบกลุ่มต้นไม้ตามทิศทางที่เลือก
    targetGroups.forEach((group, groupIndex) => {
        if (group.length < 2) return;

        const closestToStart = findClosestPlantToStart(group);
        if (!closestToStart) return;

        // เพิ่ม snapThreshold ให้มากขึ้นสำหรับการ snap ไปยังแถว/คอลัมน์
        const adjustedSnapThreshold = snapThreshold * 1.5; // ลดเป็น 1.5 เท่าเพื่อให้แม่นยำขึ้น

        // เลือกกลุ่มที่มี "ต้นไม้ต้นแรก" ใกล้ initialStartPoint ที่สุด และอยู่ในระยะ snapThreshold
        if (
            closestToStart.distance <= adjustedSnapThreshold &&
            (!bestAlignment || closestToStart.distance < bestAlignment.firstPlantDistance)
        ) {
            // 🔧 สร้างเส้นกึ่งกลางของกลุ่ม - รองรับการหมุนต้นไม้
            let fullCenterLine: { start: Coordinate; end: Coordinate };
            
            // ตรวจสอบการหมุนของต้นไม้
            const rotationInfo = hasRotation(plants);

            if (rotationInfo.hasRotation) {
                // 🔧 สำหรับต้นไม้ที่หมุน: ใช้ทิศทางจริงของแถว/คอลัมน์ที่หมุนแล้ว
                if (direction === 'rows') {
                    // สำหรับแถว: ใช้ทิศทางของแถวจริงจากต้นไม้ที่หมุนแล้ว
                    const rowDirection = directionFromPlantsLine(group);
                    const centerPoint = {
                        lat: group.reduce((sum, p) => sum + p.position.lat, 0) / group.length,
                        lng: group.reduce((sum, p) => sum + p.position.lng, 0) / group.length,
                    };
                    
                    // สร้างเส้นกึ่งกลางที่ยาวพอสำหรับการ snap
                    const lineLength = 100; // เมตร
                    fullCenterLine = {
                        start: {
                            lat: centerPoint.lat - (rowDirection.lat * lineLength / 111320),
                            lng: centerPoint.lng - (rowDirection.lng * lineLength / (111320 * Math.cos(centerPoint.lat * Math.PI / 180))),
                        },
                        end: {
                            lat: centerPoint.lat + (rowDirection.lat * lineLength / 111320),
                            lng: centerPoint.lng + (rowDirection.lng * lineLength / (111320 * Math.cos(centerPoint.lat * Math.PI / 180))),
                        },
                    };
                } else {
                    // สำหรับคอลัมน์: ใช้ทิศทางของคอลัมน์จริงจากต้นไม้ที่หมุนแล้ว
                    const colDirection = directionFromPlantsColumn(group);
                    const centerPoint = {
                        lat: group.reduce((sum, p) => sum + p.position.lat, 0) / group.length,
                        lng: group.reduce((sum, p) => sum + p.position.lng, 0) / group.length,
                    };
                    
                    // สร้างเส้นกึ่งกลางที่ยาวพอสำหรับการ snap
                    const lineLength = 100; // เมตร
                    fullCenterLine = {
                        start: {
                            lat: centerPoint.lat - (colDirection.lat * lineLength / 111320),
                            lng: centerPoint.lng - (colDirection.lng * lineLength / (111320 * Math.cos(centerPoint.lat * Math.PI / 180))),
                        },
                        end: {
                            lat: centerPoint.lat + (colDirection.lat * lineLength / 111320),
                            lng: centerPoint.lng + (colDirection.lng * lineLength / (111320 * Math.cos(centerPoint.lat * Math.PI / 180))),
                        },
                    };
                }
            } else {
                // 🔧 สำหรับต้นไม้ที่ไม่หมุน: ใช้วิธีเดิม
                if (direction === 'rows') {
                    // สำหรับแถว: เรียงตาม lng
                    const sortedByLng = [...group].sort((a, b) => a.position.lng - b.position.lng);
                    fullCenterLine = {
                        start: sortedByLng[0].position,
                        end: sortedByLng[sortedByLng.length - 1].position,
                    };
                } else {
                    // สำหรับคอลัมน์: ใช้ lng coordinate ที่คงที่ และเรียงตาม lat
                    const sortedByLat = [...group].sort((a, b) => a.position.lat - b.position.lat);
                    const avgLng = group.reduce((sum, p) => sum + p.position.lng, 0) / group.length;
                    fullCenterLine = {
                        start: { lat: sortedByLat[0].position.lat, lng: avgLng },
                        end: { lat: sortedByLat[sortedByLat.length - 1].position.lat, lng: avgLng },
                    };
                }
            }

            bestAlignment = {
                type: groupType,
                plants: group,
                firstPlantDistance: closestToStart.distance,
                firstPlant: closestToStart.plant,
                centerLine: fullCenterLine,
            };
        }
    });

    if (!bestAlignment) {
        return { alignedEnd: rawEndPoint, selectedPlants: [], snappedStart: initialStartPoint };
    }

    // Type assertion to help TypeScript understand bestAlignment is not null
    const alignment = bestAlignment as OverPlantsAlignment;

    // คำนวณ snappedStart: จุดที่ projection ของ initialStartPoint ลงบนเส้นกึ่งกลางของแถว/คอลัมน์ที่เลือก
    // แต่ไม่ให้ขยับไกลเกินไปจากจุดเดิม
    const projectedStart = findClosestPointOnLineSegment(
        initialStartPoint,
        alignment.centerLine.start,
        alignment.centerLine.end
    );
    const distanceToProjection = calculateDistanceBetweenPoints(initialStartPoint, projectedStart);

    // ถ้าระยะห่างไกลกว่า snapThreshold ให้ใช้จุดเดิม
    const snappedStart = distanceToProjection <= snapThreshold ? projectedStart : initialStartPoint;

    // ค้นหาจุดที่ใกล้ที่สุดบนเส้นกึ่งกลางของแถว/คอลัมน์ที่เลือก โดยใช้ตำแหน่งเมาส์
    // แทนที่จะใช้ปลายของแถว/คอลัมน์ทั้งหมด ให้ใช้ตำแหน่งที่เมาส์ลากไป
    const alignedEnd = findClosestPointOnLineSegment(
        rawEndPoint,
        alignment.centerLine.start,
        alignment.centerLine.end
    );

    // 🔧 ตรวจสอบการหมุนของต้นไม้เพื่อใช้ในการคำนวณ
    const rotationInfo = hasRotation(plants);

    // เลือกต้นไม้จากแถว/คอลัมน์ที่เลือก เฉพาะที่อยู่ระหว่าง snappedStart และ alignedEnd - ปรับปรุงให้แม่นยำขึ้น
    const selectedPlants = alignment.plants.filter((plant, index) => {
        // หาตำแหน่งของต้นไม้บนเส้นกึ่งกลางของแถว/คอลัมน์
        const plantProjected = findClosestPointOnLineSegment(
            plant.position,
            alignment.centerLine.start,
            alignment.centerLine.end
        );

        // คำนวณระยะทาง lateral pipe ที่แท้จริง
        const totalPipeDistance = calculateDistanceBetweenPoints(snappedStart, alignedEnd);

        // 🔧 ตรวจสอบว่าต้นไม้อยู่ระหว่าง snappedStart และ alignedEnd หรือไม่ (รองรับการหมุน)
        let isInRange = false;

        if (rotationInfo.hasRotation) {
            // 🔧 สำหรับต้นไม้ที่หมุน: ใช้ระยะทางตามเส้นท่อแทนการเปรียบเทียบ lat/lng
            const distanceFromStart = calculateDistanceBetweenPoints(plantProjected, snappedStart);
            const distanceFromEnd = calculateDistanceBetweenPoints(plantProjected, alignedEnd);
            const pipeLength = calculateDistanceBetweenPoints(snappedStart, alignedEnd);
            
            // ต้นไม้อยู่ในช่วงถ้าผลรวมระยะทางไม่เกินความยาวท่อมากเกินไป
            const tolerance = Math.max(2.0, pipeLength * 0.05); // 5% ของความยาวท่อ หรืออย่างน้อย 2 เมตร
            isInRange = (distanceFromStart + distanceFromEnd) <= (pipeLength + tolerance);
        } else {
            // 🔧 สำหรับต้นไม้ที่ไม่หมุน: ใช้วิธีเดิม
            if (alignment.type === 'row') {
                // สำหรับแถว: ตรวจสอบตาม lng ระหว่าง snappedStart และ alignedEnd
                const minLng = Math.min(snappedStart.lng, alignedEnd.lng);
                const maxLng = Math.max(snappedStart.lng, alignedEnd.lng);
                // ลด buffer ให้เข้มงวดขึ้น - ใช้ค่าคงที่แทน percentage
                const buffer = Math.min(0.00001, (maxLng - minLng) * 0.01); // ลดเป็น 1% และจำกัดค่าสูงสุด
                isInRange =
                    plantProjected.lng >= minLng - buffer && plantProjected.lng <= maxLng + buffer;
            } else {
                // สำหรับคอลัมน์: ตรวจสอบตาม lat ระหว่าง snappedStart และ alignedEnd
                const minLat = Math.min(snappedStart.lat, alignedEnd.lat);
                const maxLat = Math.max(snappedStart.lat, alignedEnd.lat);
                // ลด buffer ให้เข้มงวดขึ้น - ใช้ค่าคงที่แทน percentage
                const buffer = Math.min(0.00001, (maxLat - minLat) * 0.01); // ลดเป็น 1% และจำกัดค่าสูงสุด
                isInRange =
                    plantProjected.lat >= minLat - buffer && plantProjected.lat <= maxLat + buffer;
            }
        }

        // ตรวจสอบว่าต้นไม้อยู่ใกล้แถว/คอลัมน์ที่เลือกเพียงพอ - ปรับให้แม่นยำขึ้นสำหรับต้นไม้ระยะห่างน้อย
        const distanceToLine = calculateDistanceBetweenPoints(plant.position, plantProjected);

        // คำนวณ tolerance ตามระยะห่างเฉลี่ยของต้นไม้ในแถว/คอลัมน์
        let plantSpacing = 5.0; // default
        if (alignment.plants.length >= 2) {
            let totalSpacing = 0;
            let count = 0;
            for (let i = 0; i < alignment.plants.length - 1; i++) {
                const spacing = calculateDistanceBetweenPoints(
                    alignment.plants[i].position,
                    alignment.plants[i + 1].position
                );
                if (spacing > 0 && spacing < 50) {
                    totalSpacing += spacing;
                    count++;
                }
            }
            if (count > 0) {
                plantSpacing = totalSpacing / count;
            }
        }

        // ใช้ tolerance ที่เข้มงวดขึ้น - ขึ้นอยู่กับระยะห่างต้นไม้
        let adaptiveTolerance;
        if (plantSpacing < 3.0) {
            // ต้นไม้ระยะห่างน้อยมาก ใช้ tolerance เล็กมาก
            adaptiveTolerance = Math.max(0.5, plantSpacing * 0.25);
        } else if (plantSpacing < 8.0) {
            // ต้นไม้ระยะห่างน้อย-ปานกลาง
            adaptiveTolerance = Math.max(1.0, plantSpacing * 0.3);
        } else {
            // ต้นไม้ระยะห่างมาก
            adaptiveTolerance = Math.max(1.5, Math.min(3.0, plantSpacing * 0.4));
        }

        const result = isInRange && distanceToLine <= adaptiveTolerance;

        return result;
    });

    return { alignedEnd, selectedPlants, snappedStart };
};

// โหมด B: วางระหว่างแนวต้นไม้ (ปรับปรุงใหม่ตามเงื่อนไขที่ระบุ)
export const computeBetweenPlantsMode = (
    initialStartPoint: Coordinate,
    rawEndPoint: Coordinate,
    plants: PlantLocation[],
    snapThreshold: number,
    direction: 'rows' | 'columns'
): { alignedEnd: Coordinate; selectedPlants: PlantLocation[]; snappedStart: Coordinate } => {
    const rows = groupPlantsByRows(plants);
    const cols = groupPlantsByColumns(plants);

    // ฟังก์ชันช่วย: หาต้นไม้ที่ใกล้ initialStartPoint ที่สุดจากคู่แถว/คอลัมน์
    const findClosestPlantToStartInPair = (
        group1: PlantLocation[],
        group2: PlantLocation[]
    ): { plant: PlantLocation; distance: number } | null => {
        const allPlants = [...group1, ...group2];
        if (allPlants.length === 0) return null;

        let closest: { plant: PlantLocation; distance: number } | null = null;
        allPlants.forEach((p) => {
            const dist = calculateDistanceBetweenPoints(initialStartPoint, p.position);
            if (!closest || dist < closest.distance) {
                closest = { plant: p, distance: dist };
            }
        });
        return closest;
    };

    // เลือกกลุ่มต้นไม้ตามทิศทางที่กำหนด
    const targetGroups = direction === 'rows' ? rows : cols;
    const groupType = direction === 'rows' ? 'between_rows' : 'between_cols';

    // หา "ต้นไม้ต้นแรก" ในแต่ละคู่แถว/คอลัมน์ที่ใกล้ initialStartPoint ที่สุด
    interface BetweenPlantsAlignment {
        type: 'between_rows' | 'between_cols';
        row1: PlantLocation[];
        row2: PlantLocation[];
        firstPlantDistance: number; // ระยะห่างของ "ต้นไม้ต้นแรก" จาก initialStartPoint
        firstPlant: PlantLocation; // ต้นไม้ต้นแรกที่ใกล้ initialStartPoint ที่สุดในคู่นี้
        centerLine: { start: Coordinate; end: Coordinate };
    }

    let bestAlignment: BetweenPlantsAlignment | null = null;

    // ตรวจสอบคู่แถว/คอลัมน์ที่ติดกัน
    for (let i = 0; i < targetGroups.length - 1; i++) {
        const group1 = targetGroups[i];
        const group2 = targetGroups[i + 1];

        if (group1.length < 2 || group2.length < 2) continue;

        // 🔧 เพิ่มการตรวจสอบระยะห่างระหว่างแถว/คอลัมน์ (ไม่ควรเกิน 15 เมตร)
        const group1CenterCheck = getPlantGroupCenter(group1);
        const group2CenterCheck = getPlantGroupCenter(group2);
        const distanceBetweenGroupsCheck = calculateDistanceBetweenPoints(
            group1CenterCheck,
            group2CenterCheck
        );

        // ถ้าแถว/คอลัมน์อยู่ไกลกันเกิน 15 เมตร ให้ข้ามไป
        if (distanceBetweenGroupsCheck > 15.0) {
            continue;
        }

        const closestToStart = findClosestPlantToStartInPair(group1, group2);
        if (!closestToStart) continue;

        // เพิ่ม snapThreshold ให้มากขึ้นสำหรับการ snap ไปยังแถว/คอลัมน์
        const adjustedSnapThreshold = snapThreshold * 2; // ลดเป็น 2 เท่าเพื่อให้แม่นยำขึ้น

        // เพิ่มการตรวจสอบระยะห่างระหว่างคู่แถว/คอลัมน์เพื่อให้แน่ใจว่าเลือกคู่ที่เหมาะสม
        const group1CenterCalc = {
            lat: group1.reduce((sum, p) => sum + p.position.lat, 0) / group1.length,
            lng: group1.reduce((sum, p) => sum + p.position.lng, 0) / group1.length,
        };
        const group2CenterCalc = {
            lat: group2.reduce((sum, p) => sum + p.position.lat, 0) / group2.length,
            lng: group2.reduce((sum, p) => sum + p.position.lng, 0) / group2.length,
        };
        const distanceBetweenGroupsCalc = calculateDistanceBetweenPoints(
            group1CenterCalc,
            group2CenterCalc
        );

        // เลือกคู่แถว/คอลัมน์ที่มี "ต้นไม้ต้นแรก" ใกล้ initialStartPoint ที่สุด และอยู่ในระยะ snapThreshold

        // ตรวจสอบว่าคู่แถว/คอลัมน์มีระยะห่างที่เหมาะสม (ไม่ใกล้หรือไกลเกินไป)
        const minGroupDistance = 1.0; // ลดระยะห่างขั้นต่ำ (เมตร)
        const maxGroupDistance = 20.0; // เพิ่มระยะห่างสูงสุด (เมตร) เพื่อให้รองรับการปลูกที่ห่างกันมาก

        // เพิ่มการตรวจสอบความเหมาะสมของคู่แถว/คอลัมน์
        const isSuitablePair =
            closestToStart.distance <= adjustedSnapThreshold &&
            distanceBetweenGroupsCalc >= minGroupDistance &&
            distanceBetweenGroupsCalc <= maxGroupDistance;

        // 🔧 เพิ่มการตรวจสอบระยะห่างจากจุดเริ่มต้นไปยังเส้นกึ่งกลางของคู่แถว/คอลัมน์ (รองรับการหมุน)
        let centerLineStart: Coordinate;
        let centerLineEnd: Coordinate;
        
        // ตรวจสอบการหมุนของต้นไม้
        const rotationInfo = hasRotation(plants);
        
        if (rotationInfo.hasRotation) {
            // 🔧 สำหรับต้นไม้ที่หมุน: สร้าง centerLine ตามทิศทางจริงของแถว/คอลัมน์
            const allPlantsInPair = [...group1, ...group2];
            const centerPoint = {
                lat: allPlantsInPair.reduce((sum, p) => sum + p.position.lat, 0) / allPlantsInPair.length,
                lng: allPlantsInPair.reduce((sum, p) => sum + p.position.lng, 0) / allPlantsInPair.length,
            };
            
            // ใช้ทิศทางของแถว/คอลัมน์จริงจากต้นไม้ที่หมุนแล้ว
            let lineDirection: { lat: number; lng: number };
            if (groupType === 'between_rows') {
                lineDirection = directionFromPlantsLine(allPlantsInPair);
            } else {
                lineDirection = directionFromPlantsColumn(allPlantsInPair);
            }
            
            // สร้างเส้นกึ่งกลางที่ยาวพอสำหรับการ snap
            const lineLength = 100; // เมตร
            centerLineStart = {
                lat: centerPoint.lat - (lineDirection.lat * lineLength / 111320),
                lng: centerPoint.lng - (lineDirection.lng * lineLength / (111320 * Math.cos(centerPoint.lat * Math.PI / 180))),
            };
            centerLineEnd = {
                lat: centerPoint.lat + (lineDirection.lat * lineLength / 111320),
                lng: centerPoint.lng + (lineDirection.lng * lineLength / (111320 * Math.cos(centerPoint.lat * Math.PI / 180))),
            };
        } else {
            // 🔧 สำหรับต้นไม้ที่ไม่หมุน: ใช้วิธีเดิม
            centerLineStart = {
                lat: (group1[0].position.lat + group2[0].position.lat) / 2,
                lng: (group1[0].position.lng + group2[0].position.lng) / 2,
            };
            centerLineEnd = {
                lat:
                    (group1[group1.length - 1].position.lat + group2[group2.length - 1].position.lat) /
                    2,
                lng:
                    (group1[group1.length - 1].position.lng + group2[group2.length - 1].position.lng) /
                    2,
            };
        }
        const closestPointOnCenterLine = findClosestPointOnLineSegment(
            initialStartPoint,
            centerLineStart,
            centerLineEnd
        );
        const distanceToCenterLine = calculateDistanceBetweenPoints(
            initialStartPoint,
            closestPointOnCenterLine
        );

        // เพิ่มการตรวจสอบความเหมาะสมเพิ่มเติม
        const isOptimalDistance =
            distanceBetweenGroupsCalc >= 2.0 && distanceBetweenGroupsCalc <= 15.0; // ปรับระยะห่างที่เหมาะสมที่สุดให้หลวมขึ้น

        // ปรับปรุงการเลือกคู่แถว/คอลัมน์ให้แม่นยำขึ้น
        const isBetterChoice =
            !bestAlignment ||
            distanceToCenterLine < bestAlignment.firstPlantDistance * 0.7 || // ดีกว่า 30%
            (distanceToCenterLine <= bestAlignment.firstPlantDistance * 0.9 && isOptimalDistance); // ใกล้กว่าและระยะห่างเหมาะสม

        // เพิ่มการตรวจสอบว่าจุดเริ่มต้นอยู่ใกล้เส้นกึ่งกลางของคู่แถว/คอลัมน์นี้
        const isCloseToCenterLine = distanceToCenterLine <= adjustedSnapThreshold * 0.8; // เพิ่มขึ้นเป็น 0.8 เพื่อให้หลวมขึ้น

        // เพิ่มการตรวจสอบความเหมาะสมของคู่แถว/คอลัมน์
        const isGoodPair = isSuitablePair && isBetterChoice && isCloseToCenterLine;

        if (isGoodPair) {
            // สร้างเส้นกึ่งกลางระหว่างคู่แถว/คอลัมน์ - ปรับให้ยาวเต็มเพื่อให้ระบบสามารถ snap ได้
            let fullCenterLine: { start: Coordinate; end: Coordinate };

            if (direction === 'rows') {
                // สำหรับระหว่างแถว: เรียงตาม lng และหาจุดกึ่งกลาง
                const sorted1ByLng = [...group1].sort((a, b) => a.position.lng - b.position.lng);
                const sorted2ByLng = [...group2].sort((a, b) => a.position.lng - b.position.lng);

                const start1 = sorted1ByLng[0].position;
                const end1 = sorted1ByLng[sorted1ByLng.length - 1].position;
                const start2 = sorted2ByLng[0].position;
                const end2 = sorted2ByLng[sorted2ByLng.length - 1].position;

                // หาจุดกึ่งกลางระหว่างแถว
                const centerStart = {
                    lat: (start1.lat + start2.lat) / 2,
                    lng: (start1.lng + start2.lng) / 2,
                };
                const centerEnd = {
                    lat: (end1.lat + end2.lat) / 2,
                    lng: (end1.lng + end2.lng) / 2,
                };

                fullCenterLine = { start: centerStart, end: centerEnd };
            } else {
                // สำหรับระหว่างคอลัมน์: ใช้ lng coordinate ที่คงที่ และเรียงตาม lat
                const sorted1ByLat = [...group1].sort((a, b) => a.position.lat - b.position.lat);
                const sorted2ByLat = [...group2].sort((a, b) => a.position.lat - b.position.lat);

                const avgLng1 = group1.reduce((sum, p) => sum + p.position.lng, 0) / group1.length;
                const avgLng2 = group2.reduce((sum, p) => sum + p.position.lng, 0) / group2.length;
                const avgLng = (avgLng1 + avgLng2) / 2;

                // หาจุดกึ่งกลางระหว่างคอลัมน์
                const centerStart = {
                    lat: (sorted1ByLat[0].position.lat + sorted2ByLat[0].position.lat) / 2,
                    lng: avgLng,
                };
                const centerEnd = {
                    lat:
                        (sorted1ByLat[sorted1ByLat.length - 1].position.lat +
                            sorted2ByLat[sorted2ByLat.length - 1].position.lat) /
                        2,
                    lng: avgLng,
                };

                fullCenterLine = { start: centerStart, end: centerEnd };
            }

            bestAlignment = {
                type: groupType,
                row1: group1,
                row2: group2,
                firstPlantDistance: closestToStart.distance,
                firstPlant: closestToStart.plant,
                centerLine: fullCenterLine,
            };
        }
    }

    if (!bestAlignment) {
        // 🚀 Fallback: หาต้นไม้ทั้งหมดที่อยู่ใกล้เส้นท่อตรงจาก initialStartPoint ไป rawEndPoint
        const allPlants = [...plants];
        const directPlants = allPlants.filter((plant) => {
            const closestPoint = findClosestPointOnLineSegment(
                plant.position,
                initialStartPoint,
                rawEndPoint
            );
            const distance = calculateDistanceBetweenPoints(plant.position, closestPoint);

            return distance <= 15.0; // ระยะทน 15 เมตร
        });
        return {
            alignedEnd: rawEndPoint,
            selectedPlants: directPlants,
            snappedStart: initialStartPoint,
        };
    }

    // คำนวณ snappedStart: จุดที่ projection ของ initialStartPoint ลงบนเส้นกึ่งกลาง
    // เพิ่มการตรวจสอบว่าจุดเริ่มต้นควร snap ไปยังคู่แถว/คอลัมน์ที่ถูกต้อง
    // แต่ไม่ให้ขยับไกลเกินไปจากจุดเดิม
    const projectedStart = findClosestPointOnLineSegment(
        initialStartPoint,
        bestAlignment.centerLine.start,
        bestAlignment.centerLine.end
    );
    const distanceToProjection = calculateDistanceBetweenPoints(initialStartPoint, projectedStart);

    // ถ้าระยะห่างไกลกว่า snapThreshold ให้ใช้จุดเดิม
    const snappedStart = distanceToProjection <= snapThreshold ? projectedStart : initialStartPoint;

    // ตรวจสอบว่าจุดเริ่มต้น snap ไปยังคู่แถว/คอลัมน์ที่ถูกต้องหรือไม่
    const distanceToCenterLine = calculateDistanceBetweenPoints(initialStartPoint, snappedStart);

    // ค้นหาจุดที่ใกล้ที่สุดบนเส้นกึ่งกลาง
    // สำคัญ: ต้องใช้เส้นกึ่งกลางของแถว/คอลัมน์เท่านั้น ไม่ใช่ rawEndPoint
    const alignedEnd = findClosestPointOnLineSegment(
        rawEndPoint,
        bestAlignment.centerLine.start,
        bestAlignment.centerLine.end
    );

    // เลือกต้นไม้จากคู่แถว/คอลัมน์ที่เลือก เฉพาะที่อยู่ระหว่าง snappedStart และ alignedEnd
    const allPlantsInPair = [...bestAlignment.row1, ...bestAlignment.row2];

    // คำนวณระยะห่างเฉลี่ยของต้นไม้ล่วงหน้า เพื่อใช้ใน fallback
    const calculatePlantSpacing = (plants: PlantLocation[]): number => {
        if (plants.length < 2) return 5.0; // ค่าเริ่มต้น
        let totalDistance = 0;
        let count = 0;
        for (let i = 0; i < plants.length - 1; i++) {
            const distance = calculateDistanceBetweenPoints(
                plants[i].position,
                plants[i + 1].position
            );
            totalDistance += distance;
            count++;
        }
        return totalDistance / count;
    };

    const row1Spacing = calculatePlantSpacing(bestAlignment.row1);
    const row2Spacing = calculatePlantSpacing(bestAlignment.row2);
    const avgPlantSpacing = (row1Spacing + row2Spacing) / 2;

    // 🔧 ตรวจสอบการหมุนของต้นไม้เพื่อใช้ในการคำนวณ
    const rotationInfo = hasRotation(plants);

    const selectedPlants = allPlantsInPair.filter((plant, index) => {
        // หาตำแหน่งของต้นไม้บนเส้นกึ่งกลาง
        const plantProjected = findClosestPointOnLineSegment(
            plant.position,
            bestAlignment.centerLine.start,
            bestAlignment.centerLine.end
        );

        // 🔧 เพิ่มการตรวจสอบว่าต้นไม้อยู่ภายในช่วงของท่อย่อยจริงๆ ไม่เกินปลาย
        const distanceToStart = calculateDistanceBetweenPoints(plantProjected, snappedStart);
        const distanceToEnd = calculateDistanceBetweenPoints(plantProjected, alignedEnd);
        const lateralLength = calculateDistanceBetweenPoints(snappedStart, alignedEnd);

        // 🔧 คำนวณ tolerance ตามระยะห่างเฉลี่ยของต้นไม้ในคู่แถว/คอลัมน์
        const pipeLengthTolerance = Math.max(2.0, avgPlantSpacing * 0.4); // อย่างน้อย 2 เมตร หรือ 40% ของระยะห่างต้นไม้

        // ตรวจสอบว่า projected point อยู่ภายในช่วงของท่อย่อย (ปรับ tolerance ตามระยะห่างต้นไม้)
        const isWithinPipeLength =
            distanceToStart + distanceToEnd <= lateralLength + pipeLengthTolerance;

        // 🔧 ตรวจสอบว่าต้นไม้อยู่ระหว่าง snappedStart และ alignedEnd หรือไม่ (รองรับการหมุน)
        let isInRange = false;

        if (rotationInfo.hasRotation) {
            // 🔧 สำหรับต้นไม้ที่หมุน: ใช้ระยะทางตามเส้นท่อแทนการเปรียบเทียบ lat/lng
            const tolerance = Math.max(2.0, lateralLength * 0.05); // 5% ของความยาวท่อ หรืออย่างน้อย 2 เมตร
            isInRange = (distanceToStart + distanceToEnd) <= (lateralLength + tolerance);
        } else {
            // 🔧 สำหรับต้นไม้ที่ไม่หมุน: ใช้วิธีเดิม
            if (bestAlignment.type === 'between_rows') {
                // สำหรับระหว่างแถว: ตรวจสอบตาม lng - เข้มงวดขึ้น
                const minLng = Math.min(snappedStart.lng, alignedEnd.lng);
                const maxLng = Math.max(snappedStart.lng, alignedEnd.lng);
                // ปรับ tolerance ตามระยะห่างต้นไม้ - สำหรับพืชที่ปลูกห่างกันมากจะมี tolerance มากขึ้น
                const lngTolerance = Math.max(0.000005, avgPlantSpacing * 0.00001); // ขั้นต่ำ 0.5 เมตร
                isInRange =
                    plantProjected.lng >= minLng + lngTolerance &&
                    plantProjected.lng <= maxLng - lngTolerance;
            } else {
                // สำหรับระหว่างคอลัมน์: ตรวจสอบตาม lat - เข้มงวดขึ้น
                const minLat = Math.min(snappedStart.lat, alignedEnd.lat);
                const maxLat = Math.max(snappedStart.lat, alignedEnd.lat);
                // ปรับ tolerance ตามระยะห่างต้นไม้ - สำหรับพืชที่ปลูกห่างกันมากจะมี tolerance มากขึ้น
                const latTolerance = Math.max(0.000005, avgPlantSpacing * 0.00001); // ขั้นต่ำ 0.5 เมตร
                isInRange =
                    plantProjected.lat >= minLat + latTolerance &&
                    plantProjected.lat <= maxLat - latTolerance;
            }
        }

        // 🔧 เพิ่มการตรวจสอบว่าต้นไม้อยู่ระหว่างแถว/คอลัมน์จริงๆ
        let isBetweenPlantPairs = false;
        if (bestAlignment.type === 'between_rows') {
            // สำหรับ between_rows: ตรวจสอบว่าต้นไม้อยู่ระหว่าง lat ของแถวที่ 1 และแถวที่ 2
            const row1LatAvg =
                bestAlignment.row1.reduce((sum, p) => sum + p.position.lat, 0) /
                bestAlignment.row1.length;
            const row2LatAvg =
                bestAlignment.row2.reduce((sum, p) => sum + p.position.lat, 0) /
                bestAlignment.row2.length;
            const minRowLat = Math.min(row1LatAvg, row2LatAvg);
            const maxRowLat = Math.max(row1LatAvg, row2LatAvg);
            isBetweenPlantPairs =
                plant.position.lat >= minRowLat && plant.position.lat <= maxRowLat;
        } else {
            // สำหรับ between_cols: ตรวจสอบว่าต้นไม้อยู่ระหว่าง lng ของคอลัมน์ที่ 1 และคอลัมน์ที่ 2
            const col1LngAvg =
                bestAlignment.row1.reduce((sum, p) => sum + p.position.lng, 0) /
                bestAlignment.row1.length;
            const col2LngAvg =
                bestAlignment.row2.reduce((sum, p) => sum + p.position.lng, 0) /
                bestAlignment.row2.length;
            const minColLng = Math.min(col1LngAvg, col2LngAvg);
            const maxColLng = Math.max(col1LngAvg, col2LngAvg);
            isBetweenPlantPairs =
                plant.position.lng >= minColLng && plant.position.lng <= maxColLng;
        }

        // ตรวจสอบว่าต้นไม้อยู่ใกล้เส้นกึ่งกลางเพียงพอ - ปรับให้แม่นยำขึ้นสำหรับต้นไม้ระยะห่างน้อย
        const distanceToLine = calculateDistanceBetweenPoints(plant.position, plantProjected);
        
        // คำนวณ tolerance ตามระยะห่างต้นไม้ - เข้มงวดขึ้น
        let distanceTolerance;
        if (avgPlantSpacing < 3.0) {
            // ต้นไม้ระยะห่างน้อยมาก ใช้ tolerance เล็กมาก
            distanceTolerance = Math.max(0.8, avgPlantSpacing * 0.2);
        } else if (avgPlantSpacing < 8.0) {
            // ต้นไม้ระยะห่างน้อย-ปานกลาง
            distanceTolerance = Math.max(1.2, avgPlantSpacing * 0.25);
        } else {
            // ต้นไม้ระยะห่างมาก
            distanceTolerance = Math.max(1.5, Math.min(2.5, avgPlantSpacing * 0.3));
        }
        const result =
            isInRange &&
            isWithinPipeLength &&
            distanceToLine <= distanceTolerance &&
            isBetweenPlantPairs;

        return result;
    });

    // 🚀 Fallback mechanism: ถ้าไม่มีต้นไม้ถูกเลือกจากการกรอง ให้หาต้นไม้ที่ใกล้เส้นท่อย่อยที่สุด
    if (selectedPlants.length === 0 && allPlantsInPair.length > 0) {
        // หาต้นไม้ทั้งหมดที่อยู่ในระยะใกล้เส้นท่อย่อย (ลดจาก 15 เป็น 8 เมตร)
        const fallbackPlants = allPlantsInPair.filter((plant) => {
            const lateralStart = snappedStart;
            const lateralEnd = alignedEnd;
            const closestPoint = findClosestPointOnLineSegment(
                plant.position,
                lateralStart,
                lateralEnd
            );
            const distance = calculateDistanceBetweenPoints(plant.position, closestPoint);

            // ปรับ fallback tolerance ให้เหมาะสมกับการปลูกที่มีระยะห่างต่างกัน - เข้มงวดขึ้น
            let fallbackTolerance;
            if (avgPlantSpacing < 3.0) {
                fallbackTolerance = 1.5; // ต้นไม้ระยะห่างน้อย ใช้ tolerance เล็ก
            } else if (avgPlantSpacing < 8.0) {
                fallbackTolerance = 2.5; // ต้นไม้ระยะห่างปานกลาง
            } else {
                fallbackTolerance = 4.0; // ต้นไม้ระยะห่างมาก
            }
            return distance <= fallbackTolerance;
        });

        if (fallbackPlants.length > 0) {
            return { alignedEnd, selectedPlants: fallbackPlants, snappedStart };
        }
    }

    return { alignedEnd, selectedPlants, snappedStart };
};

// ฟังก์ชันคำนวณความต้องการน้ำรวม
export const calculateTotalWaterNeed = (plants: PlantLocation[]): number => {
    return plants.reduce((total, plant) => total + plant.plantData.waterNeed, 0);
};

// ฟังก์ชันสร้าง ID สำหรับท่อย่อย
export const generateLateralPipeId = (): string => {
    return `lateral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ฟังก์ชันสร้างท่อแยกย่อย (Emitter Lines)
// 🔧 แก้ไขตามความต้องการ: สร้าง emitterLines เฉพาะโหมด 'between_plants' เท่านั้น
export const generateEmitterLines = (
    lateralPipeId: string,
    lateralStart: Coordinate,
    lateralEnd: Coordinate,
    plants: PlantLocation[],
    emitterDiameter: number = 4,
    placementMode?: 'over_plants' | 'between_plants'
): any[] => {
    // ⚠️ สร้างเฉพาะโหมด 'between_plants' เท่านั้น
    // โหมด 'over_plants' ท่อวางทับแนวต้นไม้โดยตรง จึงไม่ต้องมีท่อย่อยแยก
    if (placementMode !== 'between_plants') {
        return []; // ไม่สร้าง emitterLines สำหรับโหมดอื่น
    }

    const emitterLines: any[] = [];

    // สร้าง emitterLines สำหรับแต่ละต้นไม้ในโหมด between_plants
    plants.forEach((plant, index) => {
        // หาจุดที่ใกล้ที่สุดบนท่อย่อยสำหรับแต่ละต้นไม้
        const closestPointOnLateral = findClosestPointOnLineSegment(
            plant.position,
            lateralStart,
            lateralEnd
        );

        // สร้างท่อแยกย่อยขนาดเล็กจาก lateral pipe ไปยังต้นไม้
        const distance = calculateDistanceBetweenPoints(closestPointOnLateral, plant.position);

        // สร้างเฉพาะกับต้นไม้ที่อยู่ใกล้ท่อย่อย (ไม่เกิน 20 เมตร)
        if (distance <= 20) {
            const emitterLine = {
                id: `emitter_${lateralPipeId}_${index}`,
                lateralPipeId: lateralPipeId,
                plantId: plant.id,
                coordinates: [closestPointOnLateral, plant.position],
                length: distance,
                diameter: emitterDiameter,
                emitterType: 'drip',
            };

            emitterLines.push(emitterLine);
        }
    });

    return emitterLines;
};

// ฟังก์ชันสร้างท่อแขนงอัตโนมัติสำหรับโหมดวางระหว่างแนวต้นไม้
// **แก้ไข: สร้างท่อแยกย่อยเฉพาะต้นไม้ที่ลากถึงเท่านั้น**
export const generateEmitterLinesForBetweenPlantsMode = (
    lateralPipeId: string,
    lateralStart: Coordinate,
    lateralEnd: Coordinate,
    selectedPlants: PlantLocation[], // เปลี่ยนจาก plants เป็น selectedPlants
    emitterDiameter: number = 4
): any[] => {
    // 🔧 ตรวจสอบการวางแนวท่อเพื่อปรับ threshold ตามนั้น
    const latDiff = Math.abs(lateralEnd.lat - lateralStart.lat);
    const lngDiff = Math.abs(lateralEnd.lng - lateralStart.lng);
    const isVerticalPipe = latDiff > lngDiff; // ท่อในแนวตั้งถ้า lat เปลี่ยนมากกว่า lng

    const emitterLines: any[] = [];

    selectedPlants.forEach((plant) => {
        // 🔧 ปรับปรุงการคำนวณจุดเชื่อมต่อให้แม่นยำขึ้น
        const closestPointOnLateral = findClosestPointOnLineSegment(
            plant.position,
            lateralStart,
            lateralEnd
        );

        const distance = calculateDistanceBetweenPoints(closestPointOnLateral, plant.position);

        // 🔧 คำนวณระยะห่างเฉลี่ยของต้นไม้เพื่อปรับ threshold
        const calculatePlantSpacing = (): number => {
            if (selectedPlants.length < 2) return 5.0;
            let totalDistance = 0;
            let count = 0;
            for (let i = 0; i < selectedPlants.length - 1; i++) {
                const dist = calculateDistanceBetweenPoints(
                    selectedPlants[i].position,
                    selectedPlants[i + 1].position
                );
                totalDistance += dist;
                count++;
            }
            return totalDistance / count;
        };

        const avgSpacing = calculatePlantSpacing();
        const adaptiveMaxDistance = Math.max(8.0, avgSpacing * 0.8); // เพิ่ม threshold ให้ครอบคลุมมากขึ้น

        // สร้างท่อแยกย่อยด้วย threshold ที่ปรับตามระยะห่างต้นไม้
        if (distance <= adaptiveMaxDistance) {
            // 🔧 ปรับปรุงการสร้าง coordinates ให้แม่นยำขึ้น
            // สร้างเส้นตรงจาก closest point ไปยังต้นไม้โดยตรง
            const emitterLine = {
                id: `emitter_${lateralPipeId}_${plant.id}`,
                lateralPipeId: lateralPipeId,
                plantId: plant.id,
                coordinates: [
                    { lat: closestPointOnLateral.lat, lng: closestPointOnLateral.lng }, // จุดบนท่อย่อย
                    { lat: plant.position.lat, lng: plant.position.lng }, // ตำแหน่งต้นไม้
                ],
                length: distance,
                diameter: emitterDiameter,
                emitterType: 'drip',
                isVisible: true,
                isActive: true,
                connectionPoint: { lat: closestPointOnLateral.lat, lng: closestPointOnLateral.lng },
            };

            emitterLines.push(emitterLine);
        } else {
        }
    });

    return emitterLines;
};

// 🚀 ฟังก์ชันสร้าง emitter lines สำหรับ multi-segment lateral pipes
export const generateEmitterLinesForMultiSegment = (
    lateralPipeId: string,
    lateralCoordinates: Coordinate[], // เส้นทางท่อย่อยที่สมบูรณ์ (รวม waypoints)
    selectedPlants: PlantLocation[],
    emitterDiameter: number = 4
): any[] => {
    const emitterLines: any[] = [];

    selectedPlants.forEach((plant) => {
        // หาจุดที่ใกล้ที่สุดบนเส้นทางท่อย่อยทั้งหมด (multi-segment)
        let closestPoint: Coordinate | null = null;
        let minDistance = Infinity;

        // ตรวจสอบทุกส่วนของท่อย่อย
        for (let i = 0; i < lateralCoordinates.length - 1; i++) {
            const segmentStart = lateralCoordinates[i];
            const segmentEnd = lateralCoordinates[i + 1];

            const closestOnSegment = findClosestPointOnLineSegment(
                plant.position,
                segmentStart,
                segmentEnd
            );

            const distance = calculateDistanceBetweenPoints(closestOnSegment, plant.position);

            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = closestOnSegment;
            }
        }

        // สร้างท่อแยกย่อยถ้าระยะห่างเหมาะสม
        if (closestPoint && minDistance <= 10.0) {
            const emitterLine = {
                id: `emitter_${lateralPipeId}_${plant.id}`,
                lateralPipeId: lateralPipeId,
                plantId: plant.id,
                coordinates: [closestPoint, plant.position],
                length: minDistance,
                diameter: emitterDiameter,
                emitterType: 'drip',
                isVisible: true,
                isActive: true,
                connectionPoint: closestPoint,
            };

            emitterLines.push(emitterLine);
        }
    });

    return emitterLines;
};

// ฟังก์ชันใหม่สำหรับรวมต้นไม้จากทุก segment ในการวาดแบบ multi-segment - แก้ไขปัญหาการนับซ้ำ
export const accumulatePlantsFromAllSegments = (
    allWaypoints: Coordinate[], // รวม startPoint, waypoints, currentPoint
    plants: PlantLocation[],
    placementMode: 'over_plants' | 'between_plants',
    snapThreshold: number = 20
): PlantLocation[] => {
    if (!allWaypoints || allWaypoints.length < 2) {
        return [];
    }

    // ใช้ computeMultiSegmentAlignment แทนการวนลูปเอง เพื่อป้องกันการนับซ้ำ
    const startPoint = allWaypoints[0];
    const waypoints = allWaypoints.slice(1, -1); // waypoints ระหว่างทาง
    const currentPoint = allWaypoints[allWaypoints.length - 1];

    const result = computeMultiSegmentAlignment(
        startPoint,
        waypoints,
        currentPoint,
        plants,
        placementMode,
        snapThreshold
    );

    return result.allSelectedPlants;
};

// ฟังก์ชันใหม่สำหรับคำนวณ multi-segment alignment - แก้ไขปัญหาการนับซ้ำ
export const computeMultiSegmentAlignment = (
    startPoint: Coordinate,
    waypoints: Coordinate[],
    currentPoint: Coordinate,
    plants: PlantLocation[],
    placementMode: 'over_plants' | 'between_plants',
    snapThreshold: number = 20
): {
    allSelectedPlants: PlantLocation[];
    totalWaterNeed: number;
    alignedEndPoint: Coordinate;
    segmentResults: Array<{
        startPoint: Coordinate;
        endPoint: Coordinate;
        selectedPlants: PlantLocation[];
        alignedEnd: Coordinate;
    }>;
} => {
    const allWaypoints = [startPoint, ...waypoints, currentPoint];
    const segmentResults: Array<{
        startPoint: Coordinate;
        endPoint: Coordinate;
        selectedPlants: PlantLocation[];
        alignedEnd: Coordinate;
    }> = [];

    let lastAlignedEnd = startPoint;
    const allSelectedPlants: PlantLocation[] = [];
    const processedPlantIds = new Set<string>();
    const waypointProximityThreshold = snapThreshold * 1.5; // ใช้ threshold ที่ใหญ่กว่าเล็กน้อย

    // 🎯 Segment layout explanation:
    // segment 0: startPoint → waypoint[0]   (i=0) ← ต้นไม้ตรง waypoint[0] นับที่นี่
    // segment 1: waypoint[0] → waypoint[1]  (i=1) ← ต้นไม้ตรง waypoint[1] นับที่นี่
    // segment 2: waypoint[1] → currentPoint (i=2) ← ไม่มี waypoint ตรงปลาย

    // ประมวลผลทีละ segment
    for (let i = 0; i < allWaypoints.length - 1; i++) {
        const segmentStart = i === 0 ? startPoint : lastAlignedEnd;
        const segmentEnd = allWaypoints[i + 1];

        // คำนวณการ align สำหรับ segment นี้
        const segmentResult = computeAlignedLateral(
            segmentStart,
            segmentEnd,
            plants,
            placementMode,
            snapThreshold
        );

        // 🚫 กรองต้นไม้ที่อยู่ใกล้ waypoint เพื่อป้องกันการนับซ้ำ
        const filteredSegmentPlants: PlantLocation[] = [];

        segmentResult.selectedPlants.forEach((plant) => {
            let shouldAddPlant = true;

            // ตรวจสอบว่าต้นไม้อยู่ใกล้ waypoint ใดหรือไม่
            for (let j = 0; j < waypoints.length; j++) {
                const waypoint = waypoints[j];
                const distanceToWaypoint = calculateDistanceBetweenPoints(plant.position, waypoint);

                // ถ้าต้นไม้อยู่ใกล้ waypoint
                if (distanceToWaypoint <= waypointProximityThreshold) {
                    // 🎯 ให้เป็นของ segment ที่จบที่ waypoint นั้น (ก่อนเลี้ยว)
                    // segment i จบที่ waypoint j เมื่อ i === j
                    if (i !== j) {
                        // segment นี้ไม่ใช่ segment ที่จบที่ waypoint นี้ จึงไม่เอาต้นไม้นี้
                        shouldAddPlant = false;
                        break;
                    } else {
                    }
                }
            }

            // เพิ่มต้นไม้เฉพาะที่ไม่ซ้ำและไม่อยู่ในพื้นที่ overlap
            if (shouldAddPlant && !processedPlantIds.has(plant.id)) {
                filteredSegmentPlants.push(plant);
                allSelectedPlants.push(plant);
                processedPlantIds.add(plant.id);
            }
        });

        // เก็บผลลัพธ์ของ segment (ใช้ plants ที่กรองแล้ว)
        segmentResults.push({
            startPoint: segmentStart,
            endPoint: segmentEnd,
            selectedPlants: filteredSegmentPlants,
            alignedEnd: segmentResult.alignedEnd,
        });

        // อัพเดท aligned end สำหรับ segment ถัดไป
        lastAlignedEnd = segmentResult.alignedEnd;
    }

    const totalWaterNeed = calculateTotalWaterNeed(allSelectedPlants);

    return {
        allSelectedPlants,
        totalWaterNeed,
        alignedEndPoint: lastAlignedEnd,
        segmentResults,
    };
};

// Export ฟังก์ชันที่จำเป็นสำหรับการใช้งานภายนอก
// Note: findPlantsInBetweenPlantsMode and findPlantsInOverPlantsMode are now exported directly

// โหมด A: วางทับแนวต้นไม้ (เริ่มจากท่อเมนรอง)
const computeOverPlantsModeFromMainPipe = (
    snappedStartPoint: Coordinate,
    rawEndPoint: Coordinate,
    plants: PlantLocation[],
    snapThreshold: number,
    direction: 'rows' | 'columns'
): { alignedEnd: Coordinate; selectedPlants: PlantLocation[]; snappedStart: Coordinate } => {
    return computeOverPlantsMode(snappedStartPoint, rawEndPoint, plants, snapThreshold, direction);
};

// โหมด B: วางระหว่างแนวต้นไม้ (เริ่มจากท่อเมนรอง)
const computeBetweenPlantsModeFromMainPipe = (
    snappedStartPoint: Coordinate,
    rawEndPoint: Coordinate,
    plants: PlantLocation[],
    snapThreshold: number,
    direction: 'rows' | 'columns'
): { alignedEnd: Coordinate; selectedPlants: PlantLocation[]; snappedStart: Coordinate } => {
    return computeBetweenPlantsMode(
        snappedStartPoint,
        rawEndPoint,
        plants,
        snapThreshold,
        direction
    );
};
