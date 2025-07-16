// Field Map Utility Functions
// ปรับให้ใช้งาน algorithms พื้นฐานแทนการใช้ turf.js เพื่อหลีกเลี่ยงปัญหา type

// การคำนวณระยะทาง
export const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number => {
    try {
        // Using Haversine formula for distance calculation
        const R = 6371000; // Earth's radius in meters
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    } catch (error) {
        console.warn('Error calculating distance:', error);
        return 0;
    }
};

// ตรวจสอบว่าจุดอยู่ในโซนหรือไม่
export const checkPointInZone = (point: any, zone: any): boolean => {
    try {
        if (!zone || !zone.geometry || !zone.geometry.coordinates) {
            return false;
        }

        // Ray casting algorithm for point in polygon
        const { lat, lng } = point;
        const coords = zone.geometry.coordinates[0];
        let inside = false;

        for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
            const xi = coords[i][0],
                yi = coords[i][1];
            const xj = coords[j][0],
                yj = coords[j][1];

            if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
                inside = !inside;
            }
        }

        return inside;
    } catch (error) {
        console.warn('Error checking point in polygon:', error);
        return false;
    }
};

// หาจุดตัดระหว่างเส้นสองเส้น
export const getLineIntersection = (p1: any, p2: any, p3: any, p4: any) => {
    const x1 = p1.x,
        y1 = p1.y;
    const x2 = p2.x,
        y2 = p2.y;
    const x3 = p3.x,
        y3 = p3.y;
    const x4 = p4.x,
        y4 = p4.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return null; // parallel lines

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1),
        };
    }
    return null;
};

// หาจุดกึ่งกลาง
export const getMidpoint = (coord1: any, coord2: any): any => ({
    lat: (coord1.lat + coord2.lat) / 2,
    lng: (coord1.lng + coord2.lng) / 2,
});

// หาจุดที่แบ่งเส้นออกเป็นส่วนเท่า ๆ
export const getEdgePoints = (coord1: any, coord2: any, segments = 3): any[] => {
    const points: any[] = [];
    for (let i = 1; i < segments; i++) {
        const ratio = i / segments;
        points.push({
            lat: coord1.lat + ratio * (coord2.lat - coord1.lat),
            lng: coord1.lng + ratio * (coord2.lng - coord1.lng),
        });
    }
    return points;
};

// คำนวณพื้นที่ด้วย Shoelace formula
export const calculateFieldArea = (field: any): number => {
    try {
        if (!field || !field.geometry || !field.geometry.coordinates) {
            return 0;
        }

        const coords = field.geometry.coordinates[0];
        let area = 0;
        const n = coords.length;

        for (let i = 0; i < n - 1; i++) {
            area += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1];
        }

        // Convert to square meters (approximate)
        const areaInDegrees = Math.abs(area) / 2;
        const areaInMeters = areaInDegrees * 111319.9 * 111319.9; // rough conversion

        return areaInMeters;
    } catch (error) {
        console.warn('Error calculating field area:', error);
        return 0;
    }
};

// สร้าง unique ID
export const generateUniqueId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// แปลงสีจาก hex เป็น rgb
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
};

// ตรวจสอบว่าเส้นทางผ่านสิ่งกีดขวางหรือไม่
export const checkLineObstacleCollision = (lineCoords: any[], obstacles: any[]): boolean => {
    try {
        if (!lineCoords || lineCoords.length < 2 || !obstacles || obstacles.length === 0) {
            return false;
        }

        // Check if line intersects with any obstacle
        for (let i = 0; i < lineCoords.length - 1; i++) {
            const lineStart = lineCoords[i];
            const lineEnd = lineCoords[i + 1];

            for (const obstacle of obstacles) {
                if (!obstacle.geometry || !obstacle.geometry.coordinates) continue;

                // Simple collision check - check if line endpoints are inside obstacle
                if (checkPointInZone(lineStart, obstacle) || checkPointInZone(lineEnd, obstacle)) {
                    return true;
                }
            }
        }

        return false;
    } catch (error) {
        console.warn('Error checking line obstacle collision:', error);
        return false;
    }
};

// หาทางเดินสำหรับท่อเพื่อหลีกเลี่ยงสิ่งกีดขวาง
export const findPipeRoute = (start: any, end: any, obstacles: any[]): any[] => {
    try {
        // Simple implementation - in real world, you might want to use A* algorithm
        const directRoute = [start, end];

        if (!checkLineObstacleCollision(directRoute, obstacles)) {
            return directRoute;
        }

        // If direct route is blocked, try to find alternative route
        const midPoint = getMidpoint(start, end);
        const offset = 0.001; // Small offset to avoid obstacles

        const alternativeRoutes = [
            [start, { lat: midPoint.lat + offset, lng: midPoint.lng }, end],
            [start, { lat: midPoint.lat - offset, lng: midPoint.lng }, end],
            [start, { lat: midPoint.lat, lng: midPoint.lng + offset }, end],
            [start, { lat: midPoint.lat, lng: midPoint.lng - offset }, end],
        ];

        for (const route of alternativeRoutes) {
            if (!checkLineObstacleCollision(route, obstacles)) {
                return route;
            }
        }

        // If no alternative route found, return direct route
        return directRoute;
    } catch (error) {
        console.warn('Error finding pipe route:', error);
        return [start, end];
    }
};
