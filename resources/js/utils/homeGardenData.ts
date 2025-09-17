/* eslint-disable @typescript-eslint/no-unused-vars */
// resources/js/utils/homeGardenData.ts

export interface Coordinate {
    lat: number;
    lng: number;
}

export interface CanvasCoordinate {
    x: number;
    y: number;
}

export interface GardenZone {
    id: string;
    type: 'grass' | 'flowers' | 'trees' | 'forbidden';
    coordinates: Coordinate[];
    canvasCoordinates?: CanvasCoordinate[];
    name: string;
    parentZoneId?: string;
}

export interface SprinklerType {
    id: string;
    nameEN: string;
    nameTH: string;
    icon: string;
    radius: number;
    pressure: number; // แรงดัน (บาร์)
    flowRate: number; // อัตราการไหล (ลิตร/นาที)
    suitableFor: string[];
    color: string;
}

export interface Sprinkler {
    id: string;
    position: Coordinate;
    canvasPosition?: CanvasCoordinate;
    type: SprinklerType;
    zoneId: string;
    orientation?: number;
}

export interface WaterSource {
    id: string;
    position: Coordinate;
    canvasPosition?: CanvasCoordinate;
    type: 'main' | 'pump';
}

export interface Pipe {
    id: string;
    start: Coordinate;
    end: Coordinate;
    canvasStart?: CanvasCoordinate;
    canvasEnd?: CanvasCoordinate;
    type: 'pipe';
    length: number;
    connectedSprinklers?: string[];
    zoneId?: string;
}

export interface GardenPlannerData {
    gardenZones: GardenZone[];
    sprinklers: Sprinkler[];
    waterSource: WaterSource | null;
    pipes: Pipe[];
    designMode?: 'map' | 'canvas' | 'image' | null;
    imageData?: {
        isScaleSet: number | boolean | undefined;
        url: string;
        width: number;
        height: number;
        scale?: number;
        scaleValidated?: boolean;
        scaleHistory?: Array<{
            pixelDistance: number;
            realDistance: number;
            scale: number;
            timestamp: Date;
        }>;
    };
    canvasData?: {
        width: number;
        height: number;
        scale: number;
        gridSize: number;
    };
}

export type ClipResult =
    | Coordinate[]
    | CanvasCoordinate[]
    | 'FULL_CIRCLE'
    | 'MASKED_CIRCLE'
    | 'NO_COVERAGE';

export const ZONE_TYPES = [
    { id: 'grass', name: 'สนามหญ้า', color: '#22C55E', icon: '🌱' },
    { id: 'flowers', name: 'แปลงดอกไม้', color: '#F472B6', icon: '🌸' },
    { id: 'trees', name: 'ต้นไม้', color: '#16A34A', icon: '🌳' },
    { id: 'forbidden', name: 'พื้นที่ต้องห้าม', color: '#EF4444', icon: '🚫' },
];

export const SPRINKLER_TYPES: SprinklerType[] = [
    {
        id: 'pop-up-sprinkler',
        nameEN: 'Pop-up Sprinkler',
        nameTH: 'หัว Pop‑Up ยก–หดได้',
        icon: '🟤',
        radius: 5,
        pressure: 2.5,
        flowRate: 18,
        suitableFor: ['grass', 'flowers'],
        color: '#33CCFF',
    },
    {
        id: 'mini-sprinkler',
        nameEN: 'Mini‑sprinkler',
        nameTH: 'มินิสปริงเกอร์',
        icon: '🟤',
        radius: 2,
        pressure: 2.0,
        flowRate: 8,
        suitableFor: ['flowers', 'trees'],
        color: '#33CCFF',
    },
    {
        id: 'sprinkler',
        nameEN: 'Sprinkler',
        nameTH: 'สปริงเกอร์แบบหมุน/ยิงไกล',
        icon: '🟤',
        radius: 12,
        pressure: 3.5,
        flowRate: 35,
        suitableFor: ['trees', 'grass'],
        color: '#33CCFF',
    },
    {
        id: 'single-side',
        nameEN: 'Single‑side Sprinkler',
        nameTH: 'หัวฉีดด้านเดียวปรับมุม',
        icon: '🟤',
        radius: 4,
        pressure: 2.2,
        flowRate: 12,
        suitableFor: ['grass', 'flowers'],
        color: '#33CCFF',
    },
    {
        id: 'butterfly',
        nameEN: 'Butterfly Sprinkler',
        nameTH: 'หัวฉีดผีเสื้อ',
        icon: '🟤',
        radius: 1,
        pressure: 1.5,
        flowRate: 4,
        suitableFor: ['flowers'],
        color: '#33CCFF',
    },
    {
        id: 'mist-nozzle',
        nameEN: 'Mist nozzle',
        nameTH: 'หัวพ่นหมอก – แบบเสียบท่อ PE',
        icon: '🟤',
        radius: 1,
        pressure: 1.8,
        flowRate: 6,
        suitableFor: ['flowers'],
        color: '#33CCFF',
    },
    {
        id: 'impact-sprinkler',
        nameEN: 'Impact Sprinkler',
        nameTH: 'สปริงเกอร์ชนิดกระแทก',
        icon: '🟤',
        radius: 15,
        pressure: 4.0,
        flowRate: 45,
        suitableFor: ['trees', 'grass'],
        color: '#33CCFF',
    },
    {
        id: 'gear-drive-nozzle',
        nameEN: 'Gear‑Drive nozzle',
        nameTH: 'หัวฉีดเกียร์ไดร์ฟ ปรับแรงและมุม',
        icon: '🟤',
        radius: 10,
        pressure: 3.0,
        flowRate: 28,
        suitableFor: ['grass', 'trees'],
        color: '#33CCFF',
    },
    {
        id: 'drip-spray-tape',
        nameEN: 'Drip/Spray tape',
        nameTH: 'เทปน้ำหยดหรือสเปรย์ แบบม้วน',
        icon: '🟤',
        radius: 0.3,
        pressure: 1.2,
        flowRate: 2,
        suitableFor: ['flowers', 'trees'],
        color: '#33CCFF',
    },
];

export const DEFAULT_CENTER: [number, number] = [13.5799071, 100.8325833];

export const CANVAS_DEFAULT_WIDTH = 800;
export const CANVAS_DEFAULT_HEIGHT = 600;
export const CANVAS_DEFAULT_SCALE = 20;
export const CANVAS_GRID_SIZE = 20;

export function validateScale(scale: number, context: 'image' | 'canvas' = 'image'): boolean {
    if (!scale || isNaN(scale) || scale <= 0) {
        return false;
    }

    const ranges = {
        image: { min: 0.1, max: 2000 },
        canvas: { min: 1, max: 200 },
    };

    const range = ranges[context];
    if (scale < range.min || scale > range.max) {
        return false;
    }

    return true;
}

export function getValidScale(data: GardenPlannerData): number {
    const isImageMode = data.designMode === 'image';
    const defaultScale = isImageMode ? 20 : CANVAS_DEFAULT_SCALE;

    let scale: number;

    if (isImageMode && data.imageData?.scale) {
        scale = data.imageData.scale;
    } else if (!isImageMode && data.canvasData?.scale) {
        scale = data.canvasData.scale;
    } else {
        scale = defaultScale;
    }

    if (!validateScale(scale, isImageMode ? 'image' : 'canvas')) {
        return defaultScale;
    }

    return scale;
}

export function isPointInPolygon(
    point: Coordinate | CanvasCoordinate,
    polygon: Coordinate[] | CanvasCoordinate[]
): boolean {
    if (!point || !polygon || polygon.length < 3) return false;

    let inside = false;
    const x = 'lng' in point ? point.lng : point.x;
    const y = 'lat' in point ? point.lat : point.y;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi =
            'lng' in polygon[i]
                ? (polygon[i] as Coordinate).lng
                : (polygon[i] as CanvasCoordinate).x;
        const yi =
            'lat' in polygon[i]
                ? (polygon[i] as Coordinate).lat
                : (polygon[i] as CanvasCoordinate).y;
        const xj =
            'lng' in polygon[j]
                ? (polygon[j] as Coordinate).lng
                : (polygon[j] as CanvasCoordinate).x;
        const yj =
            'lat' in polygon[j]
                ? (polygon[j] as Coordinate).lat
                : (polygon[j] as CanvasCoordinate).y;

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

export function calculateDistance(
    p1: Coordinate | CanvasCoordinate,
    p2: Coordinate | CanvasCoordinate,
    scale?: number
): number {
    if (!p1 || !p2) return 0;

    if ('x' in p1 && 'x' in p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const pixelDistance = Math.sqrt(dx * dx + dy * dy);

        if (scale && scale > 0 && validateScale(scale, 'image')) {
            return pixelDistance / scale;
        }

        return pixelDistance;
    }

    const coord1 = p1 as Coordinate;
    const coord2 = p2 as Coordinate;
    const R = 6371000;
    const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((coord1.lat * Math.PI) / 180) *
            Math.cos((coord2.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculatePolygonArea(
    coordinates: Coordinate[] | CanvasCoordinate[],
    scale?: number
): number {
    if (!coordinates || coordinates.length < 3) return 0;

    if (coordinates.length > 0 && 'x' in coordinates[0]) {
        const canvasCoords = coordinates as CanvasCoordinate[];
        let area = 0;

        for (let i = 0; i < canvasCoords.length; i++) {
            const j = (i + 1) % canvasCoords.length;
            area += canvasCoords[i].x * canvasCoords[j].y;
            area -= canvasCoords[j].x * canvasCoords[i].y;
        }
        area = Math.abs(area) / 2;

        if (scale && scale > 0 && validateScale(scale, 'image')) {
            const areaInSquareMeters = area / (scale * scale);
            return areaInSquareMeters;
        }

        return area;
    }

    const gpsCoords = coordinates as Coordinate[];
    let area = 0;

    for (let i = 0; i < gpsCoords.length; i++) {
        const j = (i + 1) % gpsCoords.length;
        area += gpsCoords[i].lat * gpsCoords[j].lng;
        area -= gpsCoords[j].lat * gpsCoords[i].lng;
    }
    area = Math.abs(area) / 2;

    const centerLat = gpsCoords.reduce((sum, c) => sum + c.lat, 0) / gpsCoords.length;
    const latCorrection = Math.cos((centerLat * Math.PI) / 180);
    return area * 111000 * 111000 * latCorrection;
}

export function formatDistance(meters: number): string {
    if (isNaN(meters) || meters < 0) return '0 ม.';
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} กม.`;
    if (meters >= 1) return `${meters.toFixed(1)} ม.`;
    return `${(meters * 100).toFixed(1)} ซม.`;
}

export function formatArea(sqMeters: number): string {
    if (isNaN(sqMeters) || sqMeters < 0) return '0 ตร.ม.';
    if (sqMeters >= 1600) {
        return `${(sqMeters / 1600).toFixed(2)} ไร่`;
    }
    if (sqMeters >= 1) {
        return `${sqMeters.toFixed(1)} ตร.ม.`;
    }
    return `${(sqMeters * 10000).toFixed(0)} ตร.ซม.`;
}

interface CanvasData {
    width: number;
    height: number;
    scale?: number;
}

export function canvasToGPS(
    canvasPoint: CanvasCoordinate,
    canvasData: CanvasData | unknown,
    centerPoint?: Coordinate
): Coordinate {
    if (!canvasPoint || !canvasData) {
        return { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
    }

    const defaultCenter: Coordinate = { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
    const center = centerPoint || defaultCenter;

    const canvasDataTyped = canvasData as CanvasData;
    const centerX = canvasDataTyped.width / 2;
    const centerY = canvasDataTyped.height / 2;

    const scale = canvasDataTyped.scale || CANVAS_DEFAULT_SCALE;
    if (!validateScale(scale, 'canvas')) return defaultCenter;

    const offsetX = (canvasPoint.x - centerX) / scale;
    const offsetY = -(canvasPoint.y - centerY) / scale;

    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = 111000 * Math.cos((center.lat * Math.PI) / 180);

    return {
        lat: center.lat + offsetY / metersPerDegreeLat,
        lng: center.lng + offsetX / metersPerDegreeLng,
    };
}

export function clipCircleToPolygon(
    center: Coordinate | CanvasCoordinate,
    radius: number,
    polygon: (Coordinate | CanvasCoordinate)[],
    scale?: number
): ClipResult {
    if (!center || !polygon || polygon.length < 3) return 'NO_COVERAGE';
    if (radius <= 0) return 'NO_COVERAGE';

    if ('x' in center && polygon.length > 0 && 'x' in polygon[0]) {
        const validScale = scale && validateScale(scale, 'image') ? scale : 20;
        return clipCircleToPolygonCanvas(
            center as CanvasCoordinate,
            radius,
            polygon as CanvasCoordinate[],
            validScale
        );
    }

    return clipCircleToPolygonGPS(center as Coordinate, radius, polygon as Coordinate[]);
}

function clipCircleToPolygonCanvas(
    center: CanvasCoordinate,
    radius: number,
    polygon: CanvasCoordinate[],
    scale: number
): ClipResult {
    const radiusInPixels = radius * scale;

    const centerInside = isPointInPolygon(center, polygon);

    if (centerInside) {
        const circleCompletelyInside = isCircleCompletelyInsidePolygon(
            center,
            radiusInPixels,
            polygon
        );
        if (circleCompletelyInside) {
            return 'FULL_CIRCLE';
        }
    }

    const hasIntersection = circleIntersectsPolygon(center, radiusInPixels, polygon);
    if (!hasIntersection) {
        return 'NO_COVERAGE';
    }

    // Always use MASKED_CIRCLE for Canvas mode to ensure strict zone boundaries
    // This ensures the circle is always clipped to the zone boundary
    return 'MASKED_CIRCLE';
}

function clipCircleToPolygonGPS(
    center: Coordinate,
    radius: number,
    polygon: Coordinate[]
): ClipResult {
    console.log(`🌍 Enhanced GPS masking: radius=${radius}m`);

    const centerLat = (center.lat * Math.PI) / 180;
    const metersPerDegreeLat =
        111132.92 - 559.82 * Math.cos(2 * centerLat) + 1.175 * Math.cos(4 * centerLat);
    const metersPerDegreeLng = 111412.84 * Math.cos(centerLat) - 93.5 * Math.cos(3 * centerLat);

    const radiusInDegreesLat = radius / metersPerDegreeLat;
    const radiusInDegreesLng = radius / metersPerDegreeLng;

    const centerInside = isPointInPolygon(center, polygon);

    if (centerInside) {
        const circleCompletelyInside = isCircleCompletelyInsidePolygonGPS(
            center,
            radiusInDegreesLat,
            radiusInDegreesLng,
            polygon
        );
        if (circleCompletelyInside) {
            console.log('✅ GPS Circle completely inside polygon');
            return 'FULL_CIRCLE';
        }
    }

    const hasIntersection = circleIntersectsPolygonGPS(
        center,
        radiusInDegreesLat,
        radiusInDegreesLng,
        polygon
    );
    if (!hasIntersection) {
        console.log('❌ GPS Circle does not intersect polygon');
        return 'NO_COVERAGE';
    }

    // Always use MASKED_CIRCLE for GPS mode to ensure strict zone boundaries
    // This ensures the circle is always clipped to the zone boundary
    console.log(
        '🎭 GPS Circle intersects polygon - using MASKED_CIRCLE for strict zone boundaries'
    );
    return 'MASKED_CIRCLE';
}

function isCircleCompletelyInsidePolygon(
    center: CanvasCoordinate,
    radiusInPixels: number,
    polygon: CanvasCoordinate[]
): boolean {
    const testPoints = 16;
    for (let i = 0; i < testPoints; i++) {
        const angle = (i * 2 * Math.PI) / testPoints;
        const testX = center.x + radiusInPixels * Math.cos(angle);
        const testY = center.y + radiusInPixels * Math.sin(angle);

        if (!isPointInPolygon({ x: testX, y: testY }, polygon)) {
            return false;
        }
    }
    return true;
}

function circleIntersectsPolygon(
    center: CanvasCoordinate,
    radiusInPixels: number,
    polygon: CanvasCoordinate[]
): boolean {
    if (isPointInPolygon(center, polygon)) {
        return true;
    }

    for (const vertex of polygon) {
        const distance = Math.sqrt(
            Math.pow(vertex.x - center.x, 2) + Math.pow(vertex.y - center.y, 2)
        );
        if (distance <= radiusInPixels) {
            return true;
        }
    }

    for (let i = 0; i < polygon.length; i++) {
        const edgeStart = polygon[i];
        const edgeEnd = polygon[(i + 1) % polygon.length];

        const distanceToEdge = distanceFromPointToLineSegment(center, edgeStart, edgeEnd);
        if (distanceToEdge <= radiusInPixels) {
            return true;
        }
    }

    return false;
}

function isCircleCompletelyInsidePolygonGPS(
    center: Coordinate,
    radiusLat: number,
    radiusLng: number,
    polygon: Coordinate[]
): boolean {
    const testPoints = 16;
    for (let i = 0; i < testPoints; i++) {
        const angle = (i * 2 * Math.PI) / testPoints;
        const testLat = center.lat + radiusLat * Math.cos(angle);
        const testLng = center.lng + radiusLng * Math.sin(angle);

        if (!isPointInPolygon({ lat: testLat, lng: testLng }, polygon)) {
            return false;
        }
    }
    return true;
}

function circleIntersectsPolygonGPS(
    center: Coordinate,
    radiusLat: number,
    radiusLng: number,
    polygon: Coordinate[]
): boolean {
    if (isPointInPolygon(center, polygon)) {
        return true;
    }

    const avgRadius = (radiusLat + radiusLng) / 2;

    for (const vertex of polygon) {
        const distance = Math.sqrt(
            Math.pow(vertex.lat - center.lat, 2) + Math.pow(vertex.lng - center.lng, 2)
        );
        if (distance <= avgRadius) {
            return true;
        }
    }

    for (let i = 0; i < polygon.length; i++) {
        const edgeStart = polygon[i];
        const edgeEnd = polygon[(i + 1) % polygon.length];

        const distanceToEdge = distanceFromPointToLineSegmentGPS(center, edgeStart, edgeEnd);
        const distanceInDegrees = distanceToEdge / 111000;

        if (distanceInDegrees <= avgRadius) {
            return true;
        }
    }

    return false;
}

function createClippedPolygon(
    center: CanvasCoordinate,
    radiusInPixels: number,
    polygon: CanvasCoordinate[]
): CanvasCoordinate[] {
    const clippedPoints: CanvasCoordinate[] = [];

    for (let i = 0; i < polygon.length; i++) {
        const edgeStart = polygon[i];
        const edgeEnd = polygon[(i + 1) % polygon.length];

        const intersections = getCircleLineIntersections(
            center,
            radiusInPixels,
            edgeStart,
            edgeEnd
        );
        clippedPoints.push(...intersections);

        const distance = Math.sqrt(
            Math.pow(edgeEnd.x - center.x, 2) + Math.pow(edgeEnd.y - center.y, 2)
        );
        if (distance <= radiusInPixels) {
            clippedPoints.push(edgeEnd);
        }
    }

    const circlePoints = 32;
    for (let i = 0; i < circlePoints; i++) {
        const angle = (i * 2 * Math.PI) / circlePoints;
        const point = {
            x: center.x + radiusInPixels * Math.cos(angle),
            y: center.y + radiusInPixels * Math.sin(angle),
        };

        if (isPointInPolygon(point, polygon)) {
            clippedPoints.push(point);
        }
    }

    const uniquePoints = removeDuplicatePoints(clippedPoints);
    return sortPointsClockwise(uniquePoints, center);
}

function getCircleLineIntersections(
    center: CanvasCoordinate,
    radius: number,
    lineStart: CanvasCoordinate,
    lineEnd: CanvasCoordinate
): CanvasCoordinate[] {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const fx = lineStart.x - center.x;
    const fy = lineStart.y - center.y;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - radius * radius;

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
        return [];
    }

    const discriminantSqrt = Math.sqrt(discriminant);
    const t1 = (-b - discriminantSqrt) / (2 * a);
    const t2 = (-b + discriminantSqrt) / (2 * a);

    const intersections: CanvasCoordinate[] = [];

    if (t1 >= 0 && t1 <= 1) {
        intersections.push({
            x: lineStart.x + t1 * dx,
            y: lineStart.y + t1 * dy,
        });
    }

    if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 0.0001) {
        intersections.push({
            x: lineStart.x + t2 * dx,
            y: lineStart.y + t2 * dy,
        });
    }

    return intersections;
}

function removeDuplicatePoints(points: CanvasCoordinate[]): CanvasCoordinate[] {
    const tolerance = 1;
    const unique: CanvasCoordinate[] = [];

    for (const point of points) {
        const isDuplicate = unique.some(
            (existing) =>
                Math.abs(existing.x - point.x) < tolerance &&
                Math.abs(existing.y - point.y) < tolerance
        );

        if (!isDuplicate) {
            unique.push(point);
        }
    }

    return unique;
}

function sortPointsClockwise(
    points: CanvasCoordinate[],
    center: CanvasCoordinate
): CanvasCoordinate[] {
    return points.sort((a, b) => {
        const angleA = Math.atan2(a.y - center.y, a.x - center.x);
        const angleB = Math.atan2(b.y - center.y, b.x - center.x);
        return angleA - angleB;
    });
}

function distanceFromPointToLineSegment(
    point: CanvasCoordinate,
    lineStart: CanvasCoordinate,
    lineEnd: CanvasCoordinate
): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
        return Math.sqrt(A * A + B * B);
    }

    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));

    const nearestX = lineStart.x + param * C;
    const nearestY = lineStart.y + param * D;

    const dx = point.x - nearestX;
    const dy = point.y - nearestY;

    return Math.sqrt(dx * dx + dy * dy);
}

function distanceFromPointToLineSegmentGPS(
    point: Coordinate,
    lineStart: Coordinate,
    lineEnd: Coordinate
): number {
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
        return calculateDistance(point, lineStart);
    }

    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));

    const nearestPoint = {
        lat: lineStart.lat + param * C,
        lng: lineStart.lng + param * D,
    };

    return calculateDistance(point, nearestPoint);
}

export function isCornerSprinkler(
    sprinklerPosition: Coordinate | CanvasCoordinate,
    zoneCoordinates: (Coordinate | CanvasCoordinate)[]
): boolean {
    const tolerance = 'lat' in sprinklerPosition ? 0.00008 : 5;

    return zoneCoordinates.some((corner) => {
        const distance = calculateDistance(sprinklerPosition, corner);
        return 'lat' in sprinklerPosition ? distance < tolerance * 111000 : distance < tolerance;
    });
}

export interface SmartPipeNetworkOptions {
    waterSource: WaterSource;
    sprinklers: Sprinkler[];
    gardenZones: GardenZone[];
    designMode?: 'map' | 'canvas' | 'image' | null;
    canvasData?: unknown;
    imageData?: unknown;
}

export function generateSmartPipeNetwork(options: SmartPipeNetworkOptions): Pipe[] {
    const { waterSource, sprinklers, gardenZones, designMode, canvasData, imageData } = options;

    if (!waterSource || sprinklers.length === 0) {
        return [];
    }

    const isCanvasMode = designMode === 'canvas' || designMode === 'image';
    let scale: number = 20;
    if (isCanvasMode) {
        const canvasDataTyped = canvasData as CanvasData;
        const imageDataTyped = imageData as CanvasData;
        scale = canvasDataTyped?.scale || imageDataTyped?.scale || 20;
    }

    try {
        let pipes: Pipe[] = [];

        // Create unified trunk system with single main line from water source
        const sourcePos = isCanvasMode
            ? waterSource.canvasPosition || waterSource.position
            : waterSource.position;

        pipes = createUnifiedTrunkSystem(
            waterSource,
            sprinklers,
            gardenZones,
            isCanvasMode,
            scale,
            canvasData,
            imageData
        );

        // Fallback: if no pipes produced (e.g., no valid zones in map mode),
        // connect each sprinkler to the water source with a simple L-shaped path
        if (!pipes || pipes.length === 0) {
            const sourcePos = isCanvasMode
                ? waterSource.canvasPosition || waterSource.position
                : waterSource.position;

            const fallback: Pipe[] = [];
            sprinklers.forEach((sprinkler, sIdx) => {
                const sprPos = isCanvasMode
                    ? sprinkler.canvasPosition || sprinkler.position
                    : sprinkler.position;
                if (!sprPos) return;

                const path = createShortestManhattanPath(sourcePos, sprPos);
                for (let i = 0; i < path.length - 1; i++) {
                    fallback.push(
                        createUniformPipe(
                            `fallback_${sprinkler.id}_${sIdx}_${i}`,
                            path[i],
                            path[i + 1],
                            isCanvasMode,
                            scale,
                            canvasData,
                            imageData,
                            sprinkler.zoneId
                        )
                    );
                }
            });
            pipes = fallback;
        } else {
            console.log(`Generated ${pipes.length} pipes using zone-based algorithm`);
        }

        // Remove duplicate pipes to prevent redundant connections
        const originalPipeCount = pipes.length;
        pipes = removeDuplicatePipes(pipes, isCanvasMode ? 2.0 : 0.00002);
        const finalPipeCount = pipes.length;

        if (originalPipeCount !== finalPipeCount) {
            console.log(
                `Removed ${originalPipeCount - finalPipeCount} duplicate pipes. Final count: ${finalPipeCount}`
            );
        }

        return pipes;
    } catch (error) {
        console.error('Error generating pipe network:', error);
        return [];
    }
}

function createUniformPipe(
    id: string,
    start: Coordinate | CanvasCoordinate,
    end: Coordinate | CanvasCoordinate,
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown,
    zoneId?: string
): Pipe {
    const length = calculateDistance(start, end, isCanvasMode ? scale : undefined);

    if (isCanvasMode) {
        const canvasStart = start as CanvasCoordinate;
        const canvasEnd = end as CanvasCoordinate;

        const gpsStart = canvasToGPS(canvasStart, canvasData || imageData);
        const gpsEnd = canvasToGPS(canvasEnd, canvasData || imageData);

        return {
            id,
            start: gpsStart,
            end: gpsEnd,
            canvasStart,
            canvasEnd,
            type: 'pipe',
            length,
            zoneId,
        };
    } else {
        return {
            id,
            start: start as Coordinate,
            end: end as Coordinate,
            type: 'pipe',
            length,
            zoneId,
        };
    }
}

export function addCustomPipe(
    fromSprinklerId: string,
    toSprinklerId: string,
    sprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown
): Pipe | null {
    const fromSprinkler = sprinklers.find((s) => s.id === fromSprinklerId);
    const toSprinkler = sprinklers.find((s) => s.id === toSprinklerId);

    if (!fromSprinkler || !toSprinkler) {
        return null;
    }

    const fromPos = isCanvasMode
        ? fromSprinkler.canvasPosition || fromSprinkler.position
        : fromSprinkler.position;
    const toPos = isCanvasMode
        ? toSprinkler.canvasPosition || toSprinkler.position
        : toSprinkler.position;

    if (!fromPos || !toPos) {
        return null;
    }

    return createUniformPipe(
        `custom_${Date.now()}`,
        fromPos,
        toPos,
        isCanvasMode,
        scale,
        canvasData,
        imageData,
        toSprinkler.zoneId
    );
}

export function removePipeById(pipeId: string, pipes: Pipe[]): Pipe[] {
    return pipes.filter((pipe) => pipe.id !== pipeId);
}

export function addPipeFromSprinklerToPipe(
    sprinklerId: string,
    pipeId: string,
    sprinklers: Sprinkler[],
    pipes: Pipe[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown
): Pipe | null {
    const sprinkler = sprinklers.find((s) => s.id === sprinklerId);
    const targetPipe = pipes.find((p) => p.id === pipeId);

    if (!sprinkler || !targetPipe) {
        return null;
    }

    const sprinklerPos = isCanvasMode
        ? sprinkler.canvasPosition || sprinkler.position
        : sprinkler.position;
    if (!sprinklerPos) {
        return null;
    }

    // Find the closest point on the pipe to connect to
    const pipeStart = isCanvasMode ? targetPipe.canvasStart || targetPipe.start : targetPipe.start;
    const pipeEnd = isCanvasMode ? targetPipe.canvasEnd || targetPipe.end : targetPipe.end;

    if (!pipeStart || !pipeEnd) {
        return null;
    }

    // Find the closest point on the pipe line segment
    const closestPoint = findClosestPointOnLineSegment(sprinklerPos, pipeStart, pipeEnd);

    return createUniformPipe(
        `custom_${Date.now()}`,
        sprinklerPos,
        closestPoint,
        isCanvasMode,
        scale,
        canvasData,
        imageData,
        sprinkler.zoneId
    );
}

export function findPipesBetweenSprinklers(
    sprinkler1Id: string,
    sprinkler2Id: string,
    pipes: Pipe[],
    sprinklers: Sprinkler[]
): Pipe[] {
    const sprinkler1 = sprinklers.find((s) => s.id === sprinkler1Id);
    const sprinkler2 = sprinklers.find((s) => s.id === sprinkler2Id);

    if (!sprinkler1 || !sprinkler2) return [];

    const pos1 = sprinkler1.canvasPosition || sprinkler1.position;
    const pos2 = sprinkler2.canvasPosition || sprinkler2.position;

    if (!pos1 || !pos2) return [];

    return pipes.filter((pipe) => {
        const pipeStart = pipe.canvasStart || pipe.start;
        const pipeEnd = pipe.canvasEnd || pipe.end;

        const tolerance = 0.1;

        const startMatchesPos1 =
            Math.abs(getCoordValue(pipeStart, 'x') - getCoordValue(pos1, 'x')) < tolerance &&
            Math.abs(getCoordValue(pipeStart, 'y') - getCoordValue(pos1, 'y')) < tolerance;
        const endMatchesPos2 =
            Math.abs(getCoordValue(pipeEnd, 'x') - getCoordValue(pos2, 'x')) < tolerance &&
            Math.abs(getCoordValue(pipeEnd, 'y') - getCoordValue(pos2, 'y')) < tolerance;

        const startMatchesPos2 =
            Math.abs(getCoordValue(pipeStart, 'x') - getCoordValue(pos2, 'x')) < tolerance &&
            Math.abs(getCoordValue(pipeStart, 'y') - getCoordValue(pos2, 'y')) < tolerance;
        const endMatchesPos1 =
            Math.abs(getCoordValue(pipeEnd, 'x') - getCoordValue(pos1, 'x')) < tolerance &&
            Math.abs(getCoordValue(pipeEnd, 'y') - getCoordValue(pos1, 'y')) < tolerance;

        return (startMatchesPos1 && endMatchesPos2) || (startMatchesPos2 && endMatchesPos1);
    });
}

function getCoordValue(coord: Coordinate | CanvasCoordinate, axis: 'x' | 'y'): number {
    if ('x' in coord) {
        return axis === 'x' ? coord.x : coord.y;
    } else {
        return axis === 'x' ? coord.lng : coord.lat;
    }
}

// Helper function to check if coordinates are of the same type
function isSameCoordType(
    coord1: Coordinate | CanvasCoordinate,
    coord2: Coordinate | CanvasCoordinate
): boolean {
    return 'lat' in coord1 === 'lat' in coord2;
}

// Helper function to safely cast coordinates
function castToSameType<T extends Coordinate | CanvasCoordinate>(
    coord: Coordinate | CanvasCoordinate,
    reference: T
): T {
    if ('lat' in coord && 'lat' in reference) {
        return coord as T;
    } else if ('x' in coord && 'x' in reference) {
        return coord as T;
    }
    throw new Error('Coordinate types do not match');
}

// Helper function to safely check if point is in polygon
function safeIsPointInPolygon(
    point: Coordinate | CanvasCoordinate,
    polygon: (Coordinate | CanvasCoordinate)[]
): boolean {
    if ('lat' in point) {
        return isPointInPolygon(point as Coordinate, polygon as Coordinate[]);
    } else {
        return isPointInPolygon(point as CanvasCoordinate, polygon as CanvasCoordinate[]);
    }
}

// Helper function to calculate distance from point to line segment for both coordinate types
function calculateDistanceFromPointToLineSegment(
    point: Coordinate | CanvasCoordinate,
    lineStart: Coordinate | CanvasCoordinate,
    lineEnd: Coordinate | CanvasCoordinate,
    isCanvasMode: boolean,
    scale: number
): number {
    if ('lat' in point) {
        return distanceFromPointToLineSegmentGPS(
            point as Coordinate,
            lineStart as Coordinate,
            lineEnd as Coordinate
        );
    } else {
        return distanceFromPointToLineSegment(
            point as CanvasCoordinate,
            lineStart as CanvasCoordinate,
            lineEnd as CanvasCoordinate
        );
    }
}

let inMemoryData: GardenPlannerData | null = null;
const STORAGE_KEY = 'gardenPlannerData';

export function createInitialData(): GardenPlannerData {
    return {
        gardenZones: [],
        sprinklers: [],
        waterSource: null,
        pipes: [],
        designMode: null,
        imageData: undefined,
        canvasData: {
            width: CANVAS_DEFAULT_WIDTH,
            height: CANVAS_DEFAULT_HEIGHT,
            scale: CANVAS_DEFAULT_SCALE,
            gridSize: CANVAS_GRID_SIZE,
        },
    };
}

export function saveGardenData(data: GardenPlannerData): boolean {
    try {
        if (data.imageData?.scale) {
            if (!validateScale(data.imageData.scale, 'image')) {
                data.imageData.scale = 20;
                data.imageData.isScaleSet = false;
            }
        }

        if (data.canvasData?.scale) {
            if (!validateScale(data.canvasData.scale, 'canvas')) {
                data.canvasData.scale = CANVAS_DEFAULT_SCALE;
            }
        }

        inMemoryData = data;

        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (e) {
                // Ignore errors when saving to localStorage
            }
        }
        return true;
    } catch (error) {
        console.error('Error saving garden data:', error);
        return false;
    }
}

export function loadGardenData(): GardenPlannerData | null {
    try {
        if (inMemoryData) {
            return validateAndFixLoadedData(inMemoryData);
        }

        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                if (data) {
                    const parsedData = JSON.parse(data);
                    if (
                        parsedData &&
                        Array.isArray(parsedData.gardenZones) &&
                        Array.isArray(parsedData.sprinklers) &&
                        Array.isArray(parsedData.pipes)
                    ) {
                        const validatedData = validateAndFixLoadedData(parsedData);
                        inMemoryData = validatedData;
                        return validatedData;
                    }
                }
            } catch (e) {
                console.warn('Error reading from localStorage:', e);
            }
        }
    } catch (error) {
        console.error('Error loading garden data:', error);
    }
    return null;
}

function validateAndFixLoadedData(data: GardenPlannerData): GardenPlannerData {
    const fixedData = { ...data };

    if (fixedData.imageData?.scale) {
        if (!validateScale(fixedData.imageData.scale, 'image')) {
            fixedData.imageData.scale = 20;
            fixedData.imageData.isScaleSet = false;
        }
    }

    if (fixedData.canvasData?.scale) {
        if (!validateScale(fixedData.canvasData.scale, 'canvas')) {
            fixedData.canvasData.scale = CANVAS_DEFAULT_SCALE;
        }
    }

    if (fixedData.pipes) {
        fixedData.pipes = fixedData.pipes.map((pipe) => {
            // Type assertion to handle legacy pipes with isBranch property
            const pipeWithLegacyProps = pipe as Pipe & { isBranch?: boolean };
            const { isBranch: _isBranch, ...cleanPipe } = pipeWithLegacyProps;
            return cleanPipe as Pipe;
        });
    }

    return fixedData;
}

export function clearGardenData(): boolean {
    try {
        inMemoryData = null;

        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch {
                // Ignore errors when removing from localStorage
            }
        }
        return true;
    } catch (error) {
        console.error('Error clearing garden data:', error);
        return false;
    }
}

export interface ZoneStatistics {
    zoneId: string;
    zoneName: string;
    zoneType: string;
    area: number;
    sprinklerCount: number;
    pipeLength: number;
    longestPipe: number;
}

export interface GardenStatistics {
    totalArea: number;
    totalZones: number;
    totalSprinklers: number;
    totalPipeLength: number;
    longestPipe: number;
    zoneStatistics: ZoneStatistics[];
}

export interface ZoneStatistics {
    zoneId: string;
    zoneName: string;
    zoneType: string;
    area: number;
    sprinklerCount: number;
    sprinklerTypes: string[];
    sprinklerRadius: number;
    pipeLength: number;
    longestPipe: number;
}

export interface GardenStatistics {
    totalArea: number;
    totalZones: number;
    totalSprinklers: number;
    totalPipeLength: number;
    longestPipe: number;
    zoneStatistics: ZoneStatistics[];
}

export function calculateStatistics(data: GardenPlannerData): GardenStatistics {
    const { gardenZones = [], sprinklers = [], pipes = [] } = data || {};
    const mainZones = gardenZones.filter((z) => z.type !== 'forbidden' && !z.parentZoneId);
    const scale = getValidScale(data);
    const isCanvasMode = data?.designMode === 'canvas' || data?.designMode === 'image';

    const totalArea = gardenZones
        .filter((z) => z.type !== 'forbidden')
        .reduce((sum, zone) => {
            const coords = zone.canvasCoordinates || zone.coordinates;
            if (coords && coords.length >= 3) {
                return (
                    sum + calculatePolygonArea(coords, zone.canvasCoordinates ? scale : undefined)
                );
            }
            return sum;
        }, 0);

    // คำนวณความยาวท่อรวมจากท่อทั้งหมด (ไม่ใช่เฉพาะท่อที่เชื่อมต่อ)
    const totalPipeLength = pipes.reduce((sum, pipe) => {
        const length =
            typeof pipe.length === 'number' && !isNaN(pipe.length)
                ? Math.max(0, pipe.length)
                : pipe.canvasStart && pipe.canvasEnd && isCanvasMode
                  ? calculateDistance(pipe.canvasStart, pipe.canvasEnd, scale)
                  : pipe.start && pipe.end
                    ? calculateDistance(pipe.start, pipe.end)
                    : 0;
        return sum + length;
    }, 0);

    // คำนวณความยาวท่อที่ยาวที่สุดจากแหล่งน้ำไปหาหัวฉีด
    const longestPathFromSource = computeLongestPathFromSource({
        pipes,
        sprinklers,
        waterSource: data.waterSource,
        isCanvasMode,
        scale,
    });

    const zoneStatistics: ZoneStatistics[] = mainZones.map((zone) => {
        const coords = zone.canvasCoordinates || zone.coordinates;
        const zoneArea =
            coords && coords.length >= 3
                ? calculatePolygonArea(coords, zone.canvasCoordinates ? scale : undefined)
                : 0;

        const zoneSprinklers = sprinklers.filter((s) => s.zoneId === zone.id);

        // คำนวณความยาวท่อในโซนนี้จากท่อทั้งหมด
        const zonePipes = pipes.filter((p) => p.zoneId === zone.id);
        const zonePipeLength = zonePipes.reduce((sum, pipe) => {
            const length =
                typeof pipe.length === 'number' && !isNaN(pipe.length)
                    ? Math.max(0, pipe.length)
                    : pipe.canvasStart && pipe.canvasEnd && isCanvasMode
                      ? calculateDistance(pipe.canvasStart, pipe.canvasEnd, scale)
                      : pipe.start && pipe.end
                        ? calculateDistance(pipe.start, pipe.end)
                        : 0;
            return sum + length;
        }, 0);

        // คำนวณความยาวท่อที่ยาวที่สุดจากแหล่งน้ำไปหาหัวฉีดในโซนนี้
        const zoneLongestPipe = computeLongestPathFromSource({
            pipes,
            sprinklers: zoneSprinklers,
            waterSource: data.waterSource,
            isCanvasMode,
            scale,
        });

        const zoneType = ZONE_TYPES.find((t) => t.id === zone.type);

        const sprinklerTypes = [...new Set(zoneSprinklers.map((s) => s.type.nameEN))];
        const sprinklerRadius =
            zoneSprinklers.length > 0
                ? zoneSprinklers.reduce((sum, s) => sum + s.type.radius, 0) / zoneSprinklers.length
                : 0;

        return {
            zoneId: zone.id,
            zoneName: zone.name,
            zoneType: zoneType?.name || zone.type,
            area: zoneArea,
            sprinklerCount: zoneSprinklers.length,
            sprinklerTypes,
            sprinklerRadius: sprinklerRadius,
            pipeLength: zonePipeLength,
            longestPipe: zoneLongestPipe,
        };
    });

    return {
        totalArea,
        totalZones: mainZones.length,
        totalSprinklers: sprinklers.length,
        totalPipeLength,
        // Return longest path from source to farthest sprinkler along the network
        longestPipe: longestPathFromSource,
        zoneStatistics,
    };
}

// ---------- Pipe network path analysis ----------
interface PathComputeOptions {
    pipes: Pipe[];
    sprinklers: Sprinkler[];
    waterSource: WaterSource | null;
    isCanvasMode: boolean;
    scale: number;
}

/**
 * Compute the longest shortest-path distance (meters) from the water source to any sprinkler,
 * following only existing pipes as edges. If no connected path exists, returns 0.
 */
export function computeLongestPathFromSource(options: PathComputeOptions): number {
    const { pipes, sprinklers, waterSource, isCanvasMode } = options;
    const scale = options.scale;
    if (!waterSource || pipes.length === 0 || sprinklers.length === 0) return 0;

    // Build graph nodes by merging close endpoints
    type Node = { coord: Coordinate | CanvasCoordinate };
    const nodes: Node[] = [];
    const adjacency = new Map<number, Array<{ to: number; w: number }>>();

    const epsilonMeters = 0.5; // tolerance when merging nodes (meters)

    const getPipeStart = (p: Pipe) => (isCanvasMode ? p.canvasStart || p.start : p.start);
    const getPipeEnd = (p: Pipe) => (isCanvasMode ? p.canvasEnd || p.end : p.end);

    const addNode = (coord: Coordinate | CanvasCoordinate): number => {
        // Find an existing node within epsilon
        for (let i = 0; i < nodes.length; i++) {
            const existing = nodes[i].coord;
            const d = calculateDistance(coord, existing, isCanvasMode ? scale : undefined);
            if (d <= epsilonMeters) return i;
        }
        nodes.push({ coord });
        return nodes.length - 1;
    };

    const addEdge = (a: number, b: number, w: number) => {
        if (!adjacency.has(a)) adjacency.set(a, []);
        if (!adjacency.has(b)) adjacency.set(b, []);
        adjacency.get(a)!.push({ to: b, w });
        adjacency.get(b)!.push({ to: a, w });
    };

    // Add pipe endpoints and edges
    for (const p of pipes) {
        const s = getPipeStart(p);
        const e = getPipeEnd(p);
        if (!s || !e) continue;
        const a = addNode(s);
        const b = addNode(e);
        const w =
            typeof p.length === 'number' && !isNaN(p.length)
                ? Math.max(0, p.length)
                : calculateDistance(s, e, isCanvasMode ? scale : undefined);
        addEdge(a, b, w);
    }

    // Ensure water source and sprinklers are snapped to nearest nodes
    const srcCoord = isCanvasMode
        ? waterSource.canvasPosition || waterSource.position
        : waterSource.position;
    const srcIndex = addNode(srcCoord);

    const sprinklerIndices: number[] = [];
    for (const s of sprinklers) {
        const coord = isCanvasMode ? s.canvasPosition || s.position : s.position;
        if (!coord) continue;
        sprinklerIndices.push(addNode(coord));
    }

    // If source node has no edges, cannot reach any sprinkler
    if (!adjacency.has(srcIndex)) return 0;

    // Dijkstra from source
    const dist = new Array<number>(nodes.length).fill(Infinity);
    const visited = new Array<boolean>(nodes.length).fill(false);
    dist[srcIndex] = 0;

    // Simple O(V^2) Dijkstra (graph is small)
    for (let iter = 0; iter < nodes.length; iter++) {
        let u = -1;
        let best = Infinity;
        for (let i = 0; i < nodes.length; i++) {
            if (!visited[i] && dist[i] < best) {
                best = dist[i];
                u = i;
            }
        }
        if (u === -1 || best === Infinity) break;
        visited[u] = true;
        const edges = adjacency.get(u) || [];
        for (const { to, w } of edges) {
            if (visited[to]) continue;
            const nd = dist[u] + w;
            if (nd < dist[to]) dist[to] = nd;
        }
    }

    // Pick the farthest reachable sprinkler distance
    let maxReach = 0;
    for (const idx of sprinklerIndices) {
        const d = dist[idx];
        if (isFinite(d)) {
            if (d > maxReach) maxReach = d;
        }
    }
    return maxReach;
}

/**
 * Sum total pipe length only for pipes that are connected to the current water source.
 * This prevents counting orphan/legacy pipes that are not reachable from the pump.
 */
function computeConnectedPipeLengths(options: PathComputeOptions): {
    total: number;
    byZone: Map<string, number>;
} {
    const { pipes, sprinklers, waterSource, isCanvasMode } = options;
    const scale = options.scale;
    const byZone = new Map<string, number>();
    if (!waterSource || pipes.length === 0) return { total: 0, byZone };

    type Node = { coord: Coordinate | CanvasCoordinate };
    const nodes: Node[] = [];
    const epsilonMeters = 0.5;
    const addNode = (coord: Coordinate | CanvasCoordinate): number => {
        for (let i = 0; i < nodes.length; i++) {
            const d = calculateDistance(coord, nodes[i].coord, isCanvasMode ? scale : undefined);
            if (d <= epsilonMeters) return i;
        }
        nodes.push({ coord });
        return nodes.length - 1;
    };

    const getPipeStart = (p: Pipe) => (isCanvasMode ? p.canvasStart || p.start : p.start);
    const getPipeEnd = (p: Pipe) => (isCanvasMode ? p.canvasEnd || p.end : p.end);

    const srcCoord = isCanvasMode
        ? waterSource.canvasPosition || waterSource.position
        : waterSource.position;
    const srcIndex = addNode(srcCoord);

    // Map each pipe to its endpoint node indices
    const pipeNodePairs: Array<{ a: number; b: number; len: number; zoneId?: string } | null> = [];
    for (const p of pipes) {
        const s = getPipeStart(p);
        const e = getPipeEnd(p);
        if (!s || !e) {
            pipeNodePairs.push(null);
            continue;
        }
        const a = addNode(s);
        const b = addNode(e);
        const len =
            typeof p.length === 'number' && !isNaN(p.length)
                ? Math.max(0, p.length)
                : calculateDistance(s, e, isCanvasMode ? scale : undefined);
        pipeNodePairs.push({ a, b, len, zoneId: p.zoneId });
    }

    // Build adjacency to traverse reachability only (weights not needed for BFS)
    const adjacency = new Map<number, number[]>();
    pipeNodePairs.forEach((pair) => {
        if (!pair) return;
        if (!adjacency.has(pair.a)) adjacency.set(pair.a, []);
        if (!adjacency.has(pair.b)) adjacency.set(pair.b, []);
        adjacency.get(pair.a)!.push(pair.b);
        adjacency.get(pair.b)!.push(pair.a);
    });

    // BFS from source to find connected component
    const visited = new Array<boolean>(nodes.length).fill(false);
    const queue: number[] = [];
    visited[srcIndex] = true;
    queue.push(srcIndex);
    while (queue.length) {
        const u = queue.shift()!;
        const neigh = adjacency.get(u) || [];
        for (const v of neigh) {
            if (!visited[v]) {
                visited[v] = true;
                queue.push(v);
            }
        }
    }

    // Sum only pipes whose both endpoints are reachable
    let total = 0;
    const usedEdges = new Set<string>();
    for (const pair of pipeNodePairs) {
        if (!pair) continue;
        if (visited[pair.a] && visited[pair.b]) {
            const a = Math.min(pair.a, pair.b);
            const b = Math.max(pair.a, pair.b);
            const edgeKey = `${a}-${b}`;
            if (usedEdges.has(edgeKey)) continue;
            usedEdges.add(edgeKey);
            total += pair.len;
            if (pair.zoneId) {
                byZone.set(pair.zoneId, (byZone.get(pair.zoneId) || 0) + pair.len);
            }
        }
    }

    return { total, byZone };
}

export function exportToJSON(data: GardenPlannerData): string {
    const stats = calculateStatistics(data);
    return JSON.stringify(
        {
            projectData: data,
            statistics: stats,
            exportDate: new Date().toISOString(),
        },
        null,
        2
    );
}

export function exportToText(data: GardenPlannerData): string {
    const stats = calculateStatistics(data);
    let report = `สรุปผลการออกแบบระบบน้ำสำหรับสวนบ้าน
วันที่: ${new Date().toLocaleDateString('th-TH')}
วิธีการออกแบบ: ${data.designMode === 'map' ? 'Google Map' : data.designMode === 'canvas' ? 'วาดบนกระดาษ' : 'อัปโหลดรูปภาพ'}
=====================================

📊 ข้อมูลรวม:
- พื้นที่รวมทั้งหมด: ${formatArea(stats.totalArea)}
- จำนวนโซน: ${stats.totalZones} โซน (ไม่รวมพื้นที่ห้าม)
- จำนวนหัวฉีดทั้งหมด: ${stats.totalSprinklers} ตัว

📏 ระบบท่อ (แบบเดียวกันทั้งหมด):
- ท่อที่ยาวที่สุด: ${formatDistance(stats.longestPipe)}
- ท่อยาวรวม: ${formatDistance(stats.totalPipeLength)}

=====================================
📍 ข้อมูลแยกตามโซน:
`;

    stats.zoneStatistics.forEach((zone, index) => {
        report += `
${index + 1}. ${zone.zoneName} (${zone.zoneType})
   - พื้นที่: ${formatArea(zone.area)}
   - จำนวนหัวฉีด: ${zone.sprinklerCount} ตัว
   - ท่อ:
     • ยาวที่สุด: ${formatDistance(zone.longestPipe)}
     • ยาวรวม: ${formatDistance(zone.pipeLength)}
`;
    });

    return report;
}

export function validateGardenData(data: GardenPlannerData): string[] {
    const errors: string[] = [];

    if (!data) {
        errors.push('ไม่มีข้อมูลโครงการ');
        return errors;
    }

    // Add more validation logic here if needed
    return errors;
}

// Helper getters - using loadGardenData instead of undefined getHomeGardenData
export const getSprinklerData = () => loadGardenData()?.sprinklers;
export const getWaterSourceData = () => loadGardenData()?.waterSource;
export const getPipeData = () => loadGardenData()?.pipes;
export const getAreaData = () => loadGardenData()?.gardenZones;
export const getSummaryData = () =>
    loadGardenData() ? calculateStatistics(loadGardenData()!) : null;

// Additional formatting helpers (avoiding duplicates with existing functions)
export const formatWaterFlow = (flow: number): string => `${flow.toFixed(2)} L/min`;

export const formatCurrency = (amount: number): string => `฿${amount.toLocaleString()}`;

export const formatTime = (hours: number): string => {
    if (hours >= 8) {
        const days = Math.floor(hours / 8);
        const remainingHours = hours % 8;
        return `${days} day${days > 1 ? 's' : ''}${remainingHours > 0 ? ` ${remainingHours.toFixed(1)} hours` : ''}`.trim();
    }
    return `${hours.toFixed(1)} hours`;
};

// Calculation helpers
export const calculateAreaFromCoordinates = (
    coordinates: Array<{ lat: number; lng: number }>
): number => {
    if (coordinates.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < coordinates.length; i++) {
        const j = (i + 1) % coordinates.length;
        area += coordinates[i].lat * coordinates[j].lng;
        area -= coordinates[j].lat * coordinates[i].lng;
    }
    area = Math.abs(area) / 2;

    // Convert to square meters (approximate)
    const areaInSquareMeters =
        area * 111000 * 111000 * Math.cos((coordinates[0].lat * Math.PI) / 180);
    return areaInSquareMeters;
};

export const calculateSprinklerCoverage = (
    sprinklers: Sprinkler[],
    radius: number,
    totalArea: number
): number => {
    const totalCoverageArea = sprinklers.length * Math.PI * Math.pow(radius, 2);
    return Math.min((totalCoverageArea / totalArea) * 100, 100);
};

export const estimateInstallationCost = (sprinklerCount: number, pipeLength: number): number => {
    const sprinklerCost = sprinklerCount * 500; // 500 baht per sprinkler
    const pipeCost = pipeLength * 50; // 50 baht per meter
    const laborCost = sprinklerCount * 200 + pipeLength * 30;
    const miscCost = 1000;

    return sprinklerCost + pipeCost + laborCost + miscCost;
};

export const estimateInstallationTime = (sprinklerCount: number, pipeLength: number): number => {
    const sprinklerTime = sprinklerCount * 0.5; // 30 minutes per sprinkler
    const pipeTime = pipeLength * 0.1; // 6 minutes per meter
    const setupTime = 2;

    return sprinklerTime + pipeTime + setupTime;
};

// Clear data function
export const clearHomeGardenData = (): void => {
    clearGardenData();
    console.log('Home garden data cleared');
};

// New functions for zone-based pipe routing with 90-degree turns
function findZoneBoundaryPath(
    start: Coordinate | CanvasCoordinate,
    end: Coordinate | CanvasCoordinate,
    zoneCoordinates: (Coordinate | CanvasCoordinate)[],
    isCanvasMode: boolean,
    scale: number
): (Coordinate | CanvasCoordinate)[] {
    const path: (Coordinate | CanvasCoordinate)[] = [];

    // Find the closest boundary point to start and end
    const startBoundary = findClosestBoundaryPoint(start, zoneCoordinates, isCanvasMode, scale);
    const endBoundary = findClosestBoundaryPoint(end, zoneCoordinates, isCanvasMode, scale);

    if (!startBoundary || !endBoundary) {
        // Fallback to direct connection if boundary points not found
        return [start, end];
    }

    // Create L-shaped path: start -> startBoundary -> endBoundary -> end
    path.push(start);
    path.push(startBoundary);
    path.push(endBoundary);
    path.push(end);

    return path;
}

function findClosestBoundaryPoint(
    point: Coordinate | CanvasCoordinate,
    zoneCoordinates: (Coordinate | CanvasCoordinate)[],
    isCanvasMode: boolean,
    scale: number
): Coordinate | CanvasCoordinate | null {
    let closestPoint: Coordinate | CanvasCoordinate | null = null;
    let minDistance = Infinity;

    // Check each edge of the zone boundary
    for (let i = 0; i < zoneCoordinates.length; i++) {
        const current = zoneCoordinates[i];
        const next = zoneCoordinates[(i + 1) % zoneCoordinates.length];

        // Find the closest point on this edge
        const closestOnEdge = findClosestPointOnLineSegment(point, current, next);
        const distance = calculateDistance(point, closestOnEdge, isCanvasMode ? scale : undefined);

        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = closestOnEdge;
        }
    }

    return closestPoint;
}

function findClosestPointOnLineSegment(
    point: Coordinate | CanvasCoordinate,
    lineStart: Coordinate | CanvasCoordinate,
    lineEnd: Coordinate | CanvasCoordinate
): Coordinate | CanvasCoordinate {
    const x = getCoordValue(point, 'x');
    const y = getCoordValue(point, 'y');
    const x1 = getCoordValue(lineStart, 'x');
    const y1 = getCoordValue(lineStart, 'y');
    const x2 = getCoordValue(lineEnd, 'x');
    const y2 = getCoordValue(lineEnd, 'y');

    // Calculate the projection of point onto the line segment
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    let param = -1;
    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    // Return the closest point with the same coordinate type
    if ('lat' in point) {
        return { lat: yy, lng: xx } as Coordinate;
    } else {
        return { x: xx, y: yy } as CanvasCoordinate;
    }
}

// Helper to project a point onto a segment and return parameter t in [0,1]
function projectPointParam(
    point: Coordinate | CanvasCoordinate,
    lineStart: Coordinate | CanvasCoordinate,
    lineEnd: Coordinate | CanvasCoordinate
): { t: number; projected: Coordinate | CanvasCoordinate } {
    const x = getCoordValue(point, 'x');
    const y = getCoordValue(point, 'y');
    const x1 = getCoordValue(lineStart, 'x');
    const y1 = getCoordValue(lineStart, 'y');
    const x2 = getCoordValue(lineEnd, 'x');
    const y2 = getCoordValue(lineEnd, 'y');

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const lenSq = C * C + D * D;
    let t = 0;
    if (lenSq > 0) {
        t = (A * C + B * D) / lenSq;
    }
    t = Math.max(0, Math.min(1, t));

    const px = x1 + t * C;
    const py = y1 + t * D;
    if ('lat' in point) {
        return { t, projected: { lat: py, lng: px } as Coordinate };
    }
    return { t, projected: { x: px, y: py } as CanvasCoordinate };
}

function createZoneBasedPipeNetwork(
    waterSource: WaterSource,
    sprinklers: Sprinkler[],
    gardenZones: GardenZone[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown
): Pipe[] {
    const pipes: Pipe[] = [];
    const sourcePos = isCanvasMode
        ? waterSource.canvasPosition || waterSource.position
        : waterSource.position;

    if (sprinklers.length === 0) {
        return pipes;
    }

    // Group sprinklers by zone
    const sprinklersByZone = new Map<string, Sprinkler[]>();
    sprinklers.forEach((sprinkler) => {
        if (!sprinklersByZone.has(sprinkler.zoneId)) {
            sprinklersByZone.set(sprinkler.zoneId, []);
        }
        sprinklersByZone.get(sprinkler.zoneId)!.push(sprinkler);
    });

    // Create zone-based routing
    sprinklersByZone.forEach((zoneSprinklers, zoneId) => {
        const zone = gardenZones.find((z) => z.id === zoneId);
        if (!zone) return;

        const zoneCoords = isCanvasMode
            ? zone.canvasCoordinates || zone.coordinates
            : zone.coordinates;
        if (!zoneCoords || zoneCoords.length < 3) return;

        // Create main trunk line from source to zone boundary
        const zoneCenter = calculateZoneCenter(zoneCoords);
        const trunkPath = findZoneBoundaryPath(
            sourcePos,
            zoneCenter,
            zoneCoords,
            isCanvasMode,
            scale
        );

        // Create trunk pipe
        if (trunkPath.length >= 2) {
            for (let i = 0; i < trunkPath.length - 1; i++) {
                const pipe = createUniformPipe(
                    `trunk_${zoneId}_${i}`,
                    trunkPath[i],
                    trunkPath[i + 1],
                    isCanvasMode,
                    scale,
                    canvasData,
                    imageData,
                    zoneId
                );
                pipes.push(pipe);
            }
        }

        // Create branch pipes to each sprinkler in the zone
        zoneSprinklers.forEach((sprinkler, index) => {
            const sprinklerPos = isCanvasMode
                ? sprinkler.canvasPosition || sprinkler.position
                : sprinkler.position;
            if (!sprinklerPos) return;

            // Find the closest point on the trunk line to connect to
            const connectionPoint = findClosestPointOnTrunk(
                trunkPath,
                sprinklerPos,
                isCanvasMode,
                scale
            );
            if (!connectionPoint) return;

            // Create L-shaped path from connection point to sprinkler
            const branchPath = createLShapedPath(
                connectionPoint,
                sprinklerPos,
                zoneCoords,
                isCanvasMode,
                scale
            );

            for (let i = 0; i < branchPath.length - 1; i++) {
                const pipe = createUniformPipe(
                    `branch_${zoneId}_${sprinkler.id}_${i}`,
                    branchPath[i],
                    branchPath[i + 1],
                    isCanvasMode,
                    scale,
                    canvasData,
                    imageData,
                    zoneId
                );
                pipes.push(pipe);
            }
        });
    });

    return pipes;
}

function calculateZoneCenter(
    coordinates: (Coordinate | CanvasCoordinate)[]
): Coordinate | CanvasCoordinate {
    let sumX = 0,
        sumY = 0;

    coordinates.forEach((coord) => {
        sumX += getCoordValue(coord, 'x');
        sumY += getCoordValue(coord, 'y');
    });

    const centerX = sumX / coordinates.length;
    const centerY = sumY / coordinates.length;

    // Return with the same coordinate type as input
    if ('lat' in coordinates[0]) {
        return { lat: centerY, lng: centerX } as Coordinate;
    } else {
        return { x: centerX, y: centerY } as CanvasCoordinate;
    }
}

function findClosestPointOnTrunk(
    trunkPath: (Coordinate | CanvasCoordinate)[],
    point: Coordinate | CanvasCoordinate,
    isCanvasMode: boolean,
    scale: number
): Coordinate | CanvasCoordinate | null {
    let closestPoint: Coordinate | CanvasCoordinate | null = null;
    let minDistance = Infinity;

    for (let i = 0; i < trunkPath.length - 1; i++) {
        const closestOnSegment = findClosestPointOnLineSegment(
            point,
            trunkPath[i],
            trunkPath[i + 1]
        );
        const distance = calculateDistance(
            point,
            closestOnSegment,
            isCanvasMode ? scale : undefined
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = closestOnSegment;
        }
    }

    return closestPoint;
}

function createLShapedPath(
    start: Coordinate | CanvasCoordinate,
    end: Coordinate | CanvasCoordinate,
    zoneCoordinates: (Coordinate | CanvasCoordinate)[],
    isCanvasMode: boolean,
    scale: number
): (Coordinate | CanvasCoordinate)[] {
    const path: (Coordinate | CanvasCoordinate)[] = [];

    // Create L-shaped path with 90-degree turns
    const startX = getCoordValue(start, 'x');
    const startY = getCoordValue(start, 'y');
    const endX = getCoordValue(end, 'x');
    const endY = getCoordValue(end, 'y');

    // Create intermediate point for L-shape
    let intermediate: Coordinate | CanvasCoordinate;

    if ('lat' in start) {
        // For GPS coordinates, use longitude for X and latitude for Y
        intermediate = { lat: startY, lng: endX } as Coordinate;
    } else {
        intermediate = { x: endX, y: startY } as CanvasCoordinate;
    }

    // Check if the L-shaped path stays within the zone
    const isInZone = safeIsPointInPolygon(intermediate, zoneCoordinates);

    if (isInZone) {
        path.push(start);
        path.push(intermediate);
        path.push(end);
    } else {
        // If L-shape goes outside zone, try the other direction
        if ('lat' in start) {
            intermediate = { lat: endY, lng: startX } as Coordinate;
        } else {
            intermediate = { x: startX, y: endY } as CanvasCoordinate;
        }

        const isInZoneAlt = safeIsPointInPolygon(intermediate, zoneCoordinates);

        if (isInZoneAlt) {
            path.push(start);
            path.push(intermediate);
            path.push(end);
        } else {
            // Fallback to direct connection
            path.push(start);
            path.push(end);
        }
    }

    return path;
}

// Enhanced functions for better zone-based pipe routing with shortest path
function createEnhancedZoneBasedPipeNetwork(
    waterSource: WaterSource,
    sprinklers: Sprinkler[],
    gardenZones: GardenZone[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown
): Pipe[] {
    const pipes: Pipe[] = [];
    const sourcePos = isCanvasMode
        ? waterSource.canvasPosition || waterSource.position
        : waterSource.position;

    if (sprinklers.length === 0) {
        return pipes;
    }

    // Group sprinklers by zone
    const sprinklersByZone = new Map<string, Sprinkler[]>();
    sprinklers.forEach((sprinkler) => {
        if (!sprinklersByZone.has(sprinkler.zoneId)) {
            sprinklersByZone.set(sprinkler.zoneId, []);
        }
        sprinklersByZone.get(sprinkler.zoneId)!.push(sprinkler);
    });

    // Create enhanced zone-based routing with shortest path optimization
    sprinklersByZone.forEach((zoneSprinklers, zoneId) => {
        const zone = gardenZones.find((z) => z.id === zoneId);
        if (!zone) return;

        const zoneCoords = isCanvasMode
            ? zone.canvasCoordinates || zone.coordinates
            : zone.coordinates;
        if (!zoneCoords || zoneCoords.length < 3) return;

        // Create optimized trunk network with shortest path
        const trunkNetwork = createOptimizedTrunkNetwork(
            sourcePos,
            zoneCoords,
            zoneSprinklers,
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            zoneId
        );
        pipes.push(...trunkNetwork);

        // Create optimized branch connections with shortest path
        const branchPipes = createOptimizedBranchConnections(
            trunkNetwork,
            zoneSprinklers,
            zoneCoords,
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            zoneId
        );
        pipes.push(...branchPipes);
    });

    return pipes;
}

function createOptimizedTrunkNetwork(
    sourcePos: Coordinate | CanvasCoordinate,
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    zoneSprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown,
    zoneId?: string
): Pipe[] {
    const pipes: Pipe[] = [];

    // Find the optimal entry point on zone boundary
    const entryPoint = findOptimalEntryPoint(sourcePos, zoneCoords, isCanvasMode, scale);
    if (!entryPoint) return pipes;

    // Create main trunk from source to entry point using shortest path
    const mainTrunkPath = createShortestManhattanPath(sourcePos, entryPoint);
    for (let i = 0; i < mainTrunkPath.length - 1; i++) {
        const pipe = createUniformPipe(
            `main_trunk_${zoneId}_${i}`,
            mainTrunkPath[i],
            mainTrunkPath[i + 1],
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            zoneId
        );
        pipes.push(pipe);
    }

    // Create boundary-following trunk lines
    const boundaryTrunks = createBoundaryFollowingTrunks(
        entryPoint,
        zoneCoords,
        zoneSprinklers,
        isCanvasMode,
        scale,
        canvasData,
        imageData,
        zoneId
    );
    pipes.push(...boundaryTrunks);

    return pipes;
}

function findOptimalEntryPoint(
    sourcePos: Coordinate | CanvasCoordinate,
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    isCanvasMode: boolean,
    scale: number
): Coordinate | CanvasCoordinate | null {
    let bestPoint: Coordinate | CanvasCoordinate | null = null;
    let minDistance = Infinity;

    // Check each boundary edge
    for (let i = 0; i < zoneCoords.length; i++) {
        const current = zoneCoords[i];
        const next = zoneCoords[(i + 1) % zoneCoords.length];

        // Find the closest point on this edge
        const closestOnEdge = findClosestPointOnLineSegment(sourcePos, current, next);
        const distance = calculateDistance(
            sourcePos,
            closestOnEdge,
            isCanvasMode ? scale : undefined
        );

        if (distance < minDistance) {
            minDistance = distance;
            bestPoint = closestOnEdge;
        }
    }

    return bestPoint;
}

function createShortestManhattanPath(
    start: Coordinate | CanvasCoordinate,
    end: Coordinate | CanvasCoordinate
): (Coordinate | CanvasCoordinate)[] {
    const path: (Coordinate | CanvasCoordinate)[] = [];

    const startX = getCoordValue(start, 'x');
    const startY = getCoordValue(start, 'y');
    const endX = getCoordValue(end, 'x');
    const endY = getCoordValue(end, 'y');

    // Calculate Manhattan distance for both possible L-shapes
    const path1Distance =
        Math.abs(endX - startX) + Math.abs(startY - startY) + Math.abs(endY - startY);
    const path2Distance =
        Math.abs(startX - startX) + Math.abs(endY - startY) + Math.abs(endX - startX);

    // Choose the shorter path
    let intermediate: Coordinate | CanvasCoordinate;

    if (path1Distance <= path2Distance) {
        // Path 1: horizontal first, then vertical
        if ('lat' in start) {
            intermediate = { lat: startY, lng: endX } as Coordinate;
        } else {
            intermediate = { x: endX, y: startY } as CanvasCoordinate;
        }
    } else {
        // Path 2: vertical first, then horizontal
        if ('lat' in start) {
            intermediate = { lat: endY, lng: startX } as Coordinate;
        } else {
            intermediate = { x: startX, y: endY } as CanvasCoordinate;
        }
    }

    path.push(start);
    path.push(intermediate);
    path.push(end);

    return path;
}

function findClosestPointOnAnyTrunk(
    trunkNetwork: Pipe[],
    point: Coordinate | CanvasCoordinate,
    isCanvasMode: boolean,
    scale: number
): Coordinate | CanvasCoordinate | null {
    let closestPoint: Coordinate | CanvasCoordinate | null = null;
    let minDistance = Infinity;

    trunkNetwork.forEach((pipe) => {
        const pipeStart = isCanvasMode ? pipe.canvasStart! : pipe.start;
        const pipeEnd = isCanvasMode ? pipe.canvasEnd! : pipe.end;

        const closestOnPipe = findClosestPointOnLineSegment(point, pipeStart, pipeEnd);
        const distance = calculateDistance(point, closestOnPipe, isCanvasMode ? scale : undefined);

        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = closestOnPipe;
        }
    });

    return closestPoint;
}

function createBoundaryFollowingTrunks(
    entryPoint: Coordinate | CanvasCoordinate,
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    zoneSprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown,
    zoneId?: string
): Pipe[] {
    const pipes: Pipe[] = [];

    // Create trunk lines that follow the zone boundary
    const boundaryPath = createBoundaryFollowingPath(
        entryPoint,
        zoneCoords,
        zoneSprinklers,
        isCanvasMode,
        scale
    );

    for (let i = 0; i < boundaryPath.length - 1; i++) {
        const pipe = createUniformPipe(
            `boundary_trunk_${zoneId}_${i}`,
            boundaryPath[i],
            boundaryPath[i + 1],
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            zoneId
        );
        pipes.push(pipe);
    }

    return pipes;
}

function createBoundaryFollowingPath(
    entryPoint: Coordinate | CanvasCoordinate,
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    zoneSprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number
): (Coordinate | CanvasCoordinate)[] {
    const path: (Coordinate | CanvasCoordinate)[] = [];

    // Start from entry point
    path.push(entryPoint);

    // Find the edge that contains the entry point
    let entryEdgeIndex = -1;
    for (let i = 0; i < zoneCoords.length; i++) {
        const current = zoneCoords[i];
        const next = zoneCoords[(i + 1) % zoneCoords.length];

        const distanceToEdge = calculateDistanceFromPointToLineSegment(
            entryPoint,
            current,
            next,
            isCanvasMode,
            scale
        );

        if (distanceToEdge < 10) {
            // Within 10 units of the edge
            entryEdgeIndex = i;
            break;
        }
    }

    if (entryEdgeIndex === -1) {
        // If entry point is not on any edge, find the closest edge
        let minDistance = Infinity;
        for (let i = 0; i < zoneCoords.length; i++) {
            const current = zoneCoords[i];
            const next = zoneCoords[(i + 1) % zoneCoords.length];

            const distance = calculateDistanceFromPointToLineSegment(
                entryPoint,
                current,
                next,
                isCanvasMode,
                scale
            );

            if (distance < minDistance) {
                minDistance = distance;
                entryEdgeIndex = i;
            }
        }
    }

    // Create minimal boundary path - only connect to edges that have sprinklers
    const edgesWithSprinklers = findEdgesWithSprinklers(
        zoneCoords,
        zoneSprinklers,
        isCanvasMode,
        scale
    );

    if (edgesWithSprinklers.length === 0) {
        // No sprinklers near boundaries, create minimal path
        return createMinimalBoundaryPath(entryPoint, zoneCoords, entryEdgeIndex);
    }

    // Create path only to edges that have sprinklers
    const optimizedPath = createOptimizedBoundaryPath(
        entryPoint,
        zoneCoords,
        edgesWithSprinklers,
        entryEdgeIndex
    );

    return optimizedPath;
}

function findEdgesWithSprinklers(
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    zoneSprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number
): { edgeIndex: number; sprinklers: Sprinkler[] }[] {
    const edgesWithSprinklers: { edgeIndex: number; sprinklers: Sprinkler[] }[] = [];

    for (let i = 0; i < zoneCoords.length; i++) {
        const current = zoneCoords[i];
        const next = zoneCoords[(i + 1) % zoneCoords.length];

        // Check if there are sprinklers near this edge
        const edgeSprinklers = zoneSprinklers.filter((sprinkler) => {
            const sprinklerPos = isCanvasMode
                ? sprinkler.canvasPosition || sprinkler.position
                : sprinkler.position;
            if (!sprinklerPos) return false;

            const distanceToEdge = calculateDistanceFromPointToLineSegment(
                sprinklerPos,
                current,
                next,
                isCanvasMode,
                scale
            );

            return distanceToEdge < 50; // Within 50 units of the edge
        });

        if (edgeSprinklers.length > 0) {
            edgesWithSprinklers.push({
                edgeIndex: i,
                sprinklers: edgeSprinklers,
            });
        }
    }

    return edgesWithSprinklers;
}

function createMinimalBoundaryPath(
    entryPoint: Coordinate | CanvasCoordinate,
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    entryEdgeIndex: number
): (Coordinate | CanvasCoordinate)[] {
    const path: (Coordinate | CanvasCoordinate)[] = [];

    // Just connect to the nearest corner
    const nearestCorner = findNearestCorner(entryPoint, zoneCoords);
    if (nearestCorner) {
        path.push(entryPoint);
        path.push(nearestCorner);
    }

    return path;
}

function findNearestCorner(
    point: Coordinate | CanvasCoordinate,
    zoneCoords: (Coordinate | CanvasCoordinate)[]
): Coordinate | CanvasCoordinate | null {
    let nearestCorner: Coordinate | CanvasCoordinate | null = null;
    let minDistance = Infinity;

    zoneCoords.forEach((corner) => {
        const distance = calculateDistance(point, corner);
        if (distance < minDistance) {
            minDistance = distance;
            nearestCorner = corner;
        }
    });

    return nearestCorner;
}

function createOptimizedBoundaryPath(
    entryPoint: Coordinate | CanvasCoordinate,
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    edgesWithSprinklers: { edgeIndex: number; sprinklers: Sprinkler[] }[],
    entryEdgeIndex: number
): (Coordinate | CanvasCoordinate)[] {
    const path: (Coordinate | CanvasCoordinate)[] = [];

    // Start from entry point
    path.push(entryPoint);

    // Find the shortest path to connect all edges with sprinklers
    const edgeIndices = edgesWithSprinklers.map((edge) => edge.edgeIndex);
    const optimizedRoute = findShortestRoute(entryEdgeIndex, edgeIndices, zoneCoords.length);

    // Create path following the optimized route
    for (let i = 0; i < optimizedRoute.length; i++) {
        const currentEdgeIndex = optimizedRoute[i];
        const current = zoneCoords[currentEdgeIndex];
        const next = zoneCoords[(currentEdgeIndex + 1) % zoneCoords.length];

        // Find the best connection point on this edge
        const edgeData = edgesWithSprinklers.find((edge) => edge.edgeIndex === currentEdgeIndex);
        if (edgeData) {
            const connectionPoint = findOptimalConnectionPointOnEdge(
                current,
                next,
                edgeData.sprinklers
            );
            if (connectionPoint) {
                path.push(connectionPoint);
            }
        }
    }

    return path;
}

function findShortestRoute(
    startEdgeIndex: number,
    targetEdgeIndices: number[],
    totalEdges: number
): number[] {
    // Simple greedy approach: visit edges in order of distance from start
    const visited = new Set<number>();
    const route: number[] = [];

    let currentEdge = startEdgeIndex;

    while (visited.size < targetEdgeIndices.length) {
        visited.add(currentEdge);
        route.push(currentEdge);

        // Find the nearest unvisited target edge
        let nearestEdge = -1;
        let minDistance = Infinity;

        targetEdgeIndices.forEach((targetEdge) => {
            if (!visited.has(targetEdge)) {
                const distance = Math.min(
                    Math.abs(targetEdge - currentEdge),
                    Math.abs(targetEdge - currentEdge + totalEdges),
                    Math.abs(targetEdge - currentEdge - totalEdges)
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEdge = targetEdge;
                }
            }
        });

        if (nearestEdge === -1) break;
        currentEdge = nearestEdge;
    }

    return route;
}

function findOptimalConnectionPointOnEdge(
    edgeStart: Coordinate | CanvasCoordinate,
    edgeEnd: Coordinate | CanvasCoordinate,
    sprinklers: Sprinkler[]
): Coordinate | CanvasCoordinate | null {
    if (sprinklers.length === 0) return null;

    // Find the center point of all sprinklers near this edge
    let totalX = 0,
        totalY = 0;
    let count = 0;

    sprinklers.forEach((sprinkler) => {
        const sprinklerPos = sprinkler.canvasPosition || sprinkler.position;
        if (sprinklerPos) {
            totalX += getCoordValue(sprinklerPos, 'x');
            totalY += getCoordValue(sprinklerPos, 'y');
            count++;
        }
    });

    if (count === 0) return null;

    const centerX = totalX / count;
    const centerY = totalY / count;

    // Project the center point onto the edge
    const centerPoint = {
        x: centerX,
        y: centerY,
    };

    const projectedPoint = findClosestPointOnLineSegment(centerPoint, edgeStart, edgeEnd);

    return projectedPoint;
}

// New function for creating minimal grid-based pipe network
function createMinimalGridPipeNetwork(
    waterSource: WaterSource,
    sprinklers: Sprinkler[],
    gardenZones: GardenZone[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown
): Pipe[] {
    const pipes: Pipe[] = [];
    const sourcePos = isCanvasMode
        ? waterSource.canvasPosition || waterSource.position
        : waterSource.position;

    if (sprinklers.length === 0) {
        return pipes;
    }

    // Group sprinklers by zone
    const sprinklersByZone = new Map<string, Sprinkler[]>();
    sprinklers.forEach((sprinkler) => {
        if (!sprinklersByZone.has(sprinkler.zoneId)) {
            sprinklersByZone.set(sprinkler.zoneId, []);
        }
        sprinklersByZone.get(sprinkler.zoneId)!.push(sprinkler);
    });

    // Create minimal grid-based routing for each zone
    sprinklersByZone.forEach((zoneSprinklers, zoneId) => {
        const zone = gardenZones.find((z) => z.id === zoneId);
        if (!zone) return;

        const zoneCoords = isCanvasMode
            ? zone.canvasCoordinates || zone.coordinates
            : zone.coordinates;
        if (!zoneCoords || zoneCoords.length < 3) return;

        // Create minimal grid network
        const gridPipes = createZoneGridNetwork(
            sourcePos,
            zoneCoords,
            zoneSprinklers,
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            zoneId
        );
        pipes.push(...gridPipes);
    });

    return pipes;
}

function createZoneGridNetwork(
    sourcePos: Coordinate | CanvasCoordinate,
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    zoneSprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown,
    zoneId?: string
): Pipe[] {
    const pipes: Pipe[] = [];

    // Find zone bounds
    const bounds = calculateZoneBounds(zoneCoords);
    if (!bounds) return pipes;

    // Create main trunk from source to zone
    const entryPoint = findOptimalEntryPoint(sourcePos, zoneCoords, isCanvasMode, scale);
    if (!entryPoint) return pipes;

    const mainTrunkPath = createShortestManhattanPath(sourcePos, entryPoint);
    for (let i = 0; i < mainTrunkPath.length - 1; i++) {
        const pipe = createUniformPipe(
            `main_trunk_${zoneId}_${i}`,
            mainTrunkPath[i],
            mainTrunkPath[i + 1],
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            zoneId
        );
        pipes.push(pipe);
    }

    // Create minimal grid inside zone (disabled for now to match Canvas/Image straight layout)
    // const gridPipes = createMinimalGrid(
    //     entryPoint,
    //     bounds,
    //     zoneSprinklers,
    //     isCanvasMode,
    //     scale,
    //     canvasData,
    //     imageData,
    //     zoneId
    // );
    // pipes.push(...gridPipes);

    return pipes;
}

function calculateZoneBounds(
    zoneCoords: (Coordinate | CanvasCoordinate)[]
): { minX: number; maxX: number; minY: number; maxY: number } | null {
    if (zoneCoords.length === 0) return null;

    let minX = getCoordValue(zoneCoords[0], 'x');
    let maxX = minX;
    let minY = getCoordValue(zoneCoords[0], 'y');
    let maxY = minY;

    zoneCoords.forEach((coord) => {
        const x = getCoordValue(coord, 'x');
        const y = getCoordValue(coord, 'y');

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    });

    return { minX, maxX, minY, maxY };
}

function createMinimalGrid(
    entryPoint: Coordinate | CanvasCoordinate,
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    zoneSprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown,
    zoneId?: string
): Pipe[] {
    const pipes: Pipe[] = [];

    // Create horizontal and vertical lines based on sprinkler positions
    const horizontalLines = createHorizontalLines(bounds, zoneSprinklers, isCanvasMode, scale);
    const verticalLines = createVerticalLines(bounds, zoneSprinklers, isCanvasMode, scale);

    // Create pipes for horizontal lines
    horizontalLines.forEach((line, index) => {
        const pipe = createUniformPipe(
            `grid_h_${zoneId}_${index}`,
            line.start,
            line.end,
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            zoneId
        );
        pipes.push(pipe);
    });

    // Create pipes for vertical lines
    verticalLines.forEach((line, index) => {
        const pipe = createUniformPipe(
            `grid_v_${zoneId}_${index}`,
            line.start,
            line.end,
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            zoneId
        );
        pipes.push(pipe);
    });

    return pipes;
}

function createHorizontalLines(
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    zoneSprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number
): { start: Coordinate | CanvasCoordinate; end: Coordinate | CanvasCoordinate }[] {
    const lines: { start: Coordinate | CanvasCoordinate; end: Coordinate | CanvasCoordinate }[] =
        [];

    // Find optimal Y positions for horizontal lines
    const yPositions = findOptimalYPositions(zoneSprinklers, bounds, isCanvasMode, scale);

    yPositions.forEach((y) => {
        const start = createCoordinate(bounds.minX, y, isCanvasMode);
        const end = createCoordinate(bounds.maxX, y, isCanvasMode);
        lines.push({ start, end });
    });

    return lines;
}

function createVerticalLines(
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    zoneSprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number
): { start: Coordinate | CanvasCoordinate; end: Coordinate | CanvasCoordinate }[] {
    const lines: { start: Coordinate | CanvasCoordinate; end: Coordinate | CanvasCoordinate }[] =
        [];

    // Find optimal X positions for vertical lines
    const xPositions = findOptimalXPositions(zoneSprinklers, bounds, isCanvasMode, scale);

    xPositions.forEach((x) => {
        const start = createCoordinate(x, bounds.minY, isCanvasMode);
        const end = createCoordinate(x, bounds.maxY, isCanvasMode);
        lines.push({ start, end });
    });

    return lines;
}

function findOptimalYPositions(
    zoneSprinklers: Sprinkler[],
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    isCanvasMode: boolean,
    scale: number
): number[] {
    const yPositions = new Set<number>();

    // Add center line
    const centerY = (bounds.minY + bounds.maxY) / 2;
    yPositions.add(centerY);

    // Add lines at 1/3 and 2/3 of the zone height
    const thirdY = bounds.minY + (bounds.maxY - bounds.minY) / 3;
    const twoThirdsY = bounds.minY + (2 * (bounds.maxY - bounds.minY)) / 3;
    yPositions.add(thirdY);
    yPositions.add(twoThirdsY);

    return Array.from(yPositions).sort((a, b) => a - b);
}

function findOptimalXPositions(
    zoneSprinklers: Sprinkler[],
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    isCanvasMode: boolean,
    scale: number
): number[] {
    const xPositions = new Set<number>();

    // Add center line
    const centerX = (bounds.minX + bounds.maxX) / 2;
    xPositions.add(centerX);

    // Add lines at 1/3 and 2/3 of the zone width
    const thirdX = bounds.minX + (bounds.maxX - bounds.minX) / 3;
    const twoThirdsX = bounds.minX + (2 * (bounds.maxX - bounds.minX)) / 3;
    xPositions.add(thirdX);
    xPositions.add(twoThirdsX);

    return Array.from(xPositions).sort((a, b) => a - b);
}

function createCoordinate(
    x: number,
    y: number,
    isCanvasMode: boolean
): Coordinate | CanvasCoordinate {
    if (isCanvasMode) {
        return { x, y } as CanvasCoordinate;
    } else {
        return { lat: y, lng: x } as Coordinate;
    }
}

function createOptimizedBranchConnections(
    trunkNetwork: Pipe[],
    zoneSprinklers: Sprinkler[],
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown,
    zoneId?: string
): Pipe[] {
    const pipes: Pipe[] = [];
    const connectedSprinklers = new Set<string>();

    // Group sprinklers by alignment (row/column)
    const sprinklerGroups = groupSprinklersByAlignment(zoneSprinklers, isCanvasMode, scale);

    sprinklerGroups.forEach((group, groupIndex) => {
        // Filter out already connected sprinklers
        const unconnectedGroup = group.filter(
            (sprinkler) =>
                !connectedSprinklers.has(sprinkler.id) &&
                !isSprinklerConnected(sprinkler, pipes, isCanvasMode, 1.0)
        );

        if (unconnectedGroup.length === 0) return;

        if (unconnectedGroup.length === 1) {
            // Single sprinkler - connect directly to trunk
            const sprinkler = unconnectedGroup[0];
            const sprinklerPos = isCanvasMode
                ? sprinkler.canvasPosition || sprinkler.position
                : sprinkler.position;
            if (!sprinklerPos) return;

            const closestTrunkPoint = findClosestPointOnAnyTrunk(
                trunkNetwork,
                sprinklerPos,
                isCanvasMode,
                scale
            );
            if (!closestTrunkPoint) return;

            const branchPath = createShortestManhattanPath(closestTrunkPoint, sprinklerPos);

            for (let i = 0; i < branchPath.length - 1; i++) {
                const pipe = createUniformPipe(
                    `branch_${zoneId}_${sprinkler.id}_${i}`,
                    branchPath[i],
                    branchPath[i + 1],
                    isCanvasMode,
                    scale,
                    canvasData,
                    imageData,
                    zoneId
                );
                pipes.push(pipe);
            }
            connectedSprinklers.add(sprinkler.id);
        } else {
            // Multiple sprinklers in same alignment - create connected line
            const connectedPipes = createConnectedSprinklerLine(
                unconnectedGroup,
                trunkNetwork,
                isCanvasMode,
                scale,
                canvasData,
                imageData,
                zoneId,
                groupIndex
            );
            pipes.push(...connectedPipes);

            // Mark all sprinklers in this group as connected
            unconnectedGroup.forEach((sprinkler) => connectedSprinklers.add(sprinkler.id));
        }
    });

    return pipes;
}

function groupSprinklersByAlignment(
    sprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number,
    tolerance: number = 2.0 // meters tolerance for alignment
): Sprinkler[][] {
    const groups: Sprinkler[][] = [];
    const processed = new Set<string>();

    sprinklers.forEach((sprinkler) => {
        if (processed.has(sprinkler.id)) return;

        const sprinklerPos = isCanvasMode
            ? sprinkler.canvasPosition || sprinkler.position
            : sprinkler.position;
        if (!sprinklerPos) return;

        const group = [sprinkler];
        processed.add(sprinkler.id);

        // Find other sprinklers aligned horizontally or vertically
        sprinklers.forEach((otherSprinkler) => {
            if (processed.has(otherSprinkler.id)) return;

            const otherPos = isCanvasMode
                ? otherSprinkler.canvasPosition || otherSprinkler.position
                : otherSprinkler.position;
            if (!otherPos) return;

            const distance = calculateDistance(
                sprinklerPos,
                otherPos,
                isCanvasMode ? scale : undefined
            );
            if (distance > 50) return; // Skip if too far apart

            // Check if aligned horizontally or vertically
            const isAligned = isAlignedSprinklers(sprinklerPos, otherPos, isCanvasMode, tolerance);

            if (isAligned) {
                group.push(otherSprinkler);
                processed.add(otherSprinkler.id);
            }
        });

        groups.push(group);
    });

    return groups;
}

function isAlignedSprinklers(
    pos1: Coordinate | CanvasCoordinate,
    pos2: Coordinate | CanvasCoordinate,
    isCanvasMode: boolean,
    tolerance: number
): boolean {
    if (isCanvasMode) {
        const p1 = pos1 as CanvasCoordinate;
        const p2 = pos2 as CanvasCoordinate;

        // Check horizontal alignment (same Y)
        const horizontalDiff = Math.abs(p1.y - p2.y);
        // Check vertical alignment (same X)
        const verticalDiff = Math.abs(p1.x - p2.x);

        return horizontalDiff <= tolerance || verticalDiff <= tolerance;
    } else {
        const p1 = pos1 as Coordinate;
        const p2 = pos2 as Coordinate;

        // Convert to approximate meter differences
        const latDiffMeters = Math.abs(p1.lat - p2.lat) * 111000;
        const lngDiffMeters =
            Math.abs(p1.lng - p2.lng) * 111000 * Math.cos((p1.lat * Math.PI) / 180);

        return latDiffMeters <= tolerance || lngDiffMeters <= tolerance;
    }
}

function createConnectedSprinklerLine(
    sprinklers: Sprinkler[],
    trunkNetwork: Pipe[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown,
    zoneId?: string,
    groupIndex?: number
): Pipe[] {
    const pipes: Pipe[] = [];

    if (sprinklers.length < 2) return pipes;

    // Sort sprinklers by position to create logical connection order
    const sortedSprinklers = sortSprinklersForConnection(sprinklers, isCanvasMode);

    // Find connection point to trunk from the first sprinkler
    const firstSprinklerPos = isCanvasMode
        ? sortedSprinklers[0].canvasPosition || sortedSprinklers[0].position
        : sortedSprinklers[0].position;

    if (!firstSprinklerPos) return pipes;

    const trunkConnectionPoint = findClosestPointOnAnyTrunk(
        trunkNetwork,
        firstSprinklerPos,
        isCanvasMode,
        scale
    );
    if (!trunkConnectionPoint) return pipes;

    // Create main branch from trunk to first sprinkler
    const mainBranchPath = createShortestManhattanPath(trunkConnectionPoint, firstSprinklerPos);

    for (let i = 0; i < mainBranchPath.length - 1; i++) {
        const pipe = createUniformPipe(
            `branch_main_${zoneId}_g${groupIndex}_${i}`,
            mainBranchPath[i],
            mainBranchPath[i + 1],
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            zoneId
        );
        pipes.push(pipe);
    }

    // Connect sprinklers in sequence
    for (let i = 0; i < sortedSprinklers.length - 1; i++) {
        const currentSprinkler = sortedSprinklers[i];
        const nextSprinkler = sortedSprinklers[i + 1];

        const currentPos = isCanvasMode
            ? currentSprinkler.canvasPosition || currentSprinkler.position
            : currentSprinkler.position;
        const nextPos = isCanvasMode
            ? nextSprinkler.canvasPosition || nextSprinkler.position
            : nextSprinkler.position;

        if (!currentPos || !nextPos) continue;

        // Create direct connection between adjacent sprinklers
        const connectionPath = createShortestManhattanPath(currentPos, nextPos);

        for (let j = 0; j < connectionPath.length - 1; j++) {
            const pipe = createUniformPipe(
                `branch_conn_${zoneId}_${currentSprinkler.id}_${nextSprinkler.id}_${j}`,
                connectionPath[j],
                connectionPath[j + 1],
                isCanvasMode,
                scale,
                canvasData,
                imageData,
                zoneId
            );
            pipes.push(pipe);
        }
    }

    return pipes;
}

function sortSprinklersForConnection(sprinklers: Sprinkler[], isCanvasMode: boolean): Sprinkler[] {
    // Sort by position to create logical connection order (left-to-right, top-to-bottom)
    return [...sprinklers].sort((a, b) => {
        const posA = isCanvasMode ? a.canvasPosition || a.position : a.position;
        const posB = isCanvasMode ? b.canvasPosition || b.position : b.position;

        if (!posA || !posB) return 0;

        if (isCanvasMode) {
            const pA = posA as CanvasCoordinate;
            const pB = posB as CanvasCoordinate;

            // Sort primarily by Y (top to bottom), then by X (left to right)
            const yDiff = pA.y - pB.y;
            if (Math.abs(yDiff) > 2) return yDiff;
            return pA.x - pB.x;
        } else {
            const pA = posA as Coordinate;
            const pB = posB as Coordinate;

            // Sort primarily by latitude (north to south), then by longitude (west to east)
            const latDiff = pB.lat - pA.lat; // Higher latitude first (north to south)
            if (Math.abs(latDiff) > 0.00002) return latDiff;
            return pA.lng - pB.lng; // Lower longitude first (west to east)
        }
    });
}

// Enhanced function to prevent duplicate pipe connections with better overlap detection
function removeDuplicatePipes(pipes: Pipe[], tolerance: number = 1.0): Pipe[] {
    const uniquePipes: Pipe[] = [];
    const processedConnections = new Set<string>();

    pipes.forEach((pipe) => {
        // Create a connection signature based on start and end points
        const start = pipe.canvasStart || pipe.start;
        const end = pipe.canvasEnd || pipe.end;

        if (!start || !end) return;

        // Use smaller tolerance for better precision in canvas mode
        const actualTolerance = tolerance < 1.0 ? 0.00001 : 0.5;

        // Round coordinates to avoid minor floating point differences
        const startKey = `${Math.round(getCoordValue(start, 'x') / actualTolerance)}:${Math.round(getCoordValue(start, 'y') / actualTolerance)}`;
        const endKey = `${Math.round(getCoordValue(end, 'x') / actualTolerance)}:${Math.round(getCoordValue(end, 'y') / actualTolerance)}`;

        // Create bidirectional connection signature
        const connection1 = `${startKey}-${endKey}`;
        const connection2 = `${endKey}-${startKey}`;

        // Check for overlapping pipes with similar paths
        let isOverlapping = false;
        for (const existingPipe of uniquePipes) {
            if (isPipeOverlapping(pipe, existingPipe, actualTolerance)) {
                isOverlapping = true;
                break;
            }
        }

        if (
            !processedConnections.has(connection1) &&
            !processedConnections.has(connection2) &&
            !isOverlapping
        ) {
            uniquePipes.push(pipe);
            processedConnections.add(connection1);
            processedConnections.add(connection2);
        }
    });

    return uniquePipes;
}

// Check if two pipes are overlapping (same path or one is contained within the other)
function isPipeOverlapping(pipe1: Pipe, pipe2: Pipe, tolerance: number): boolean {
    const start1 = pipe1.canvasStart || pipe1.start;
    const end1 = pipe1.canvasEnd || pipe1.end;
    const start2 = pipe2.canvasStart || pipe2.start;
    const end2 = pipe2.canvasEnd || pipe2.end;

    if (!start1 || !end1 || !start2 || !end2) return false;

    // Check if pipes have the same start and end points (allowing for reverse direction)
    const sameDirection =
        Math.abs(getCoordValue(start1, 'x') - getCoordValue(start2, 'x')) < tolerance &&
        Math.abs(getCoordValue(start1, 'y') - getCoordValue(start2, 'y')) < tolerance &&
        Math.abs(getCoordValue(end1, 'x') - getCoordValue(end2, 'x')) < tolerance &&
        Math.abs(getCoordValue(end1, 'y') - getCoordValue(end2, 'y')) < tolerance;

    const reverseDirection =
        Math.abs(getCoordValue(start1, 'x') - getCoordValue(end2, 'x')) < tolerance &&
        Math.abs(getCoordValue(start1, 'y') - getCoordValue(end2, 'y')) < tolerance &&
        Math.abs(getCoordValue(end1, 'x') - getCoordValue(start2, 'x')) < tolerance &&
        Math.abs(getCoordValue(end1, 'y') - getCoordValue(start2, 'y')) < tolerance;

    // Check if one pipe is a subset of another (start and end of pipe1 lie on pipe2)
    const pipe1OnPipe2 =
        isPointOnLineSegment(start1, start2, end2, tolerance) &&
        isPointOnLineSegment(end1, start2, end2, tolerance);

    const pipe2OnPipe1 =
        isPointOnLineSegment(start2, start1, end1, tolerance) &&
        isPointOnLineSegment(end2, start1, end1, tolerance);

    return sameDirection || reverseDirection || pipe1OnPipe2 || pipe2OnPipe1;
}

// Check if a point lies on a line segment within tolerance
function isPointOnLineSegment(
    point: Coordinate | CanvasCoordinate,
    lineStart: Coordinate | CanvasCoordinate,
    lineEnd: Coordinate | CanvasCoordinate,
    tolerance: number
): boolean {
    const px = getCoordValue(point, 'x');
    const py = getCoordValue(point, 'y');
    const x1 = getCoordValue(lineStart, 'x');
    const y1 = getCoordValue(lineStart, 'y');
    const x2 = getCoordValue(lineEnd, 'x');
    const y2 = getCoordValue(lineEnd, 'y');

    // Calculate distance from point to line
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
        // Line is a point
        return Math.sqrt(A * A + B * B) < tolerance;
    }

    const param = dot / lenSq;

    // Check if point is within the line segment
    if (param < 0 || param > 1) return false;

    // Calculate closest point on line
    const xx = x1 + param * C;
    const yy = y1 + param * D;

    // Check distance
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy) < tolerance;
}

// Simplified zone network to reduce redundancy
function createSimplifiedZoneNetwork(
    sourcePos: Coordinate | CanvasCoordinate,
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    zoneSprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown,
    zoneId?: string
): Pipe[] {
    const pipes: Pipe[] = [];

    if (zoneSprinklers.length === 0) return pipes;

    // Find optimal entry point to zone
    const entryPoint = findOptimalEntryPoint(sourcePos, zoneCoords, isCanvasMode, scale);
    if (!entryPoint) return pipes;

    // Create main trunk from source to zone
    const mainTrunkPath = createShortestManhattanPath(sourcePos, entryPoint);
    for (let i = 0; i < mainTrunkPath.length - 1; i++) {
        const pipe = createUniformPipe(
            `main_trunk_${zoneId}_${i}`,
            mainTrunkPath[i],
            mainTrunkPath[i + 1],
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            zoneId
        );
        pipes.push(pipe);
    }

    // Group and connect sprinklers efficiently
    const connectedSprinklers = new Set<string>();
    const sprinklerGroups = groupSprinklersByAlignment(zoneSprinklers, isCanvasMode, scale);

    sprinklerGroups.forEach((group, groupIndex) => {
        if (group.length === 1) {
            // Single sprinkler - connect to closest trunk point
            const sprinkler = group[0];
            if (connectedSprinklers.has(sprinkler.id)) return;

            const sprinklerPos = isCanvasMode
                ? sprinkler.canvasPosition || sprinkler.position
                : sprinkler.position;
            if (!sprinklerPos) return;

            // Connect to entry point or existing trunk
            const connectionPoint =
                findClosestPointOnAnyTrunk(pipes, sprinklerPos, isCanvasMode, scale) || entryPoint;
            const branchPath = createShortestManhattanPath(connectionPoint, sprinklerPos);

            for (let i = 0; i < branchPath.length - 1; i++) {
                const pipe = createUniformPipe(
                    `simple_branch_${zoneId}_${sprinkler.id}_${i}`,
                    branchPath[i],
                    branchPath[i + 1],
                    isCanvasMode,
                    scale,
                    canvasData,
                    imageData,
                    zoneId
                );
                pipes.push(pipe);
            }

            connectedSprinklers.add(sprinkler.id);
        } else {
            // Multiple aligned sprinklers - create efficient line
            const sortedGroup = sortSprinklersForConnection(group, isCanvasMode);

            // Connect first sprinkler to trunk
            const firstSprinkler = sortedGroup[0];
            if (!connectedSprinklers.has(firstSprinkler.id)) {
                const firstPos = isCanvasMode
                    ? firstSprinkler.canvasPosition || firstSprinkler.position
                    : firstSprinkler.position;
                if (firstPos) {
                    const connectionPoint =
                        findClosestPointOnAnyTrunk(pipes, firstPos, isCanvasMode, scale) ||
                        entryPoint;
                    const mainBranchPath = createShortestManhattanPath(connectionPoint, firstPos);

                    for (let i = 0; i < mainBranchPath.length - 1; i++) {
                        const pipe = createUniformPipe(
                            `group_main_${zoneId}_g${groupIndex}_${i}`,
                            mainBranchPath[i],
                            mainBranchPath[i + 1],
                            isCanvasMode,
                            scale,
                            canvasData,
                            imageData,
                            zoneId
                        );
                        pipes.push(pipe);
                    }

                    connectedSprinklers.add(firstSprinkler.id);
                }
            }

            // Connect remaining sprinklers in sequence
            for (let i = 0; i < sortedGroup.length - 1; i++) {
                const currentSprinkler = sortedGroup[i];
                const nextSprinkler = sortedGroup[i + 1];

                if (connectedSprinklers.has(nextSprinkler.id)) continue;

                const currentPos = isCanvasMode
                    ? currentSprinkler.canvasPosition || currentSprinkler.position
                    : currentSprinkler.position;
                const nextPos = isCanvasMode
                    ? nextSprinkler.canvasPosition || nextSprinkler.position
                    : nextSprinkler.position;

                if (!currentPos || !nextPos) continue;

                const connectionPath = createShortestManhattanPath(currentPos, nextPos);

                for (let j = 0; j < connectionPath.length - 1; j++) {
                    const pipe = createUniformPipe(
                        `group_link_${zoneId}_${currentSprinkler.id}_${nextSprinkler.id}_${j}`,
                        connectionPath[j],
                        connectionPath[j + 1],
                        isCanvasMode,
                        scale,
                        canvasData,
                        imageData,
                        zoneId
                    );
                    pipes.push(pipe);
                }

                connectedSprinklers.add(nextSprinkler.id);
            }
        }
    });

    return pipes;
}

// Create unified trunk system with single main line from water source
function createUnifiedTrunkSystem(
    waterSource: WaterSource,
    sprinklers: Sprinkler[],
    gardenZones: GardenZone[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown
): Pipe[] {
    const pipes: Pipe[] = [];
    const sourcePos = isCanvasMode
        ? waterSource.canvasPosition || waterSource.position
        : waterSource.position;

    if (sprinklers.length === 0) return pipes;

    // Group sprinklers by zone
    const sprinklersByZone = new Map<string, Sprinkler[]>();
    sprinklers.forEach((sprinkler) => {
        if (!sprinklersByZone.has(sprinkler.zoneId)) {
            sprinklersByZone.set(sprinkler.zoneId, []);
        }
        sprinklersByZone.get(sprinkler.zoneId)!.push(sprinkler);
    });

    // Find all zone entry points
    const zoneEntryPoints: Array<{
        point: Coordinate | CanvasCoordinate;
        zoneId: string;
        zoneSprinklers: Sprinkler[];
        zoneCoords: (Coordinate | CanvasCoordinate)[];
    }> = [];

    sprinklersByZone.forEach((zoneSprinklers, zoneId) => {
        const zone = gardenZones.find((z) => z.id === zoneId);
        if (!zone) return;

        const zoneCoords = isCanvasMode
            ? zone.canvasCoordinates || zone.coordinates
            : zone.coordinates;
        if (!zoneCoords || zoneCoords.length < 3) return;

        const entryPoint = findOptimalEntryPoint(sourcePos, zoneCoords, isCanvasMode, scale);
        if (entryPoint) {
            zoneEntryPoints.push({
                point: entryPoint,
                zoneId,
                zoneSprinklers,
                zoneCoords,
            });
        }
    });

    if (zoneEntryPoints.length === 0) return pipes;

    // Create single main trunk line that connects all zones efficiently
    const mainTrunk = createMainTrunkLine(
        sourcePos,
        zoneEntryPoints,
        isCanvasMode,
        scale,
        canvasData,
        imageData
    );
    pipes.push(...mainTrunk);

    // Create zone-specific networks that branch from the main trunk
    zoneEntryPoints.forEach(({ point, zoneId, zoneSprinklers, zoneCoords }) => {
        const zonePipes = createZoneBranchNetwork(
            mainTrunk,
            point,
            zoneCoords,
            zoneSprinklers,
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            zoneId
        );
        pipes.push(...zonePipes);
    });

    return pipes;
}

// Create main trunk line that connects water source to all zone entry points
function createMainTrunkLine(
    sourcePos: Coordinate | CanvasCoordinate,
    zoneEntryPoints: Array<{ point: Coordinate | CanvasCoordinate; zoneId: string }>,
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown
): Pipe[] {
    const pipes: Pipe[] = [];

    if (zoneEntryPoints.length === 0) return pipes;

    // Create efficient main trunk path that visits all zone entry points
    const trunkPath = createOptimalTrunkPath(
        sourcePos,
        zoneEntryPoints.map((z) => z.point)
    );

    // Convert path to pipes
    for (let i = 0; i < trunkPath.length - 1; i++) {
        const pipe = createUniformPipe(
            `main_trunk_${i}`,
            trunkPath[i],
            trunkPath[i + 1],
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            'main'
        );
        pipes.push(pipe);
    }

    return pipes;
}

// Create optimal trunk path that efficiently connects source to all entry points
function createOptimalTrunkPath(
    sourcePos: Coordinate | CanvasCoordinate,
    entryPoints: (Coordinate | CanvasCoordinate)[]
): (Coordinate | CanvasCoordinate)[] {
    if (entryPoints.length === 0) return [sourcePos];
    if (entryPoints.length === 1) return createShortestManhattanPath(sourcePos, entryPoints[0]);

    // For multiple zones, create a path that minimizes total distance
    // Start from source, find nearest entry point, then create branching path
    const path = [sourcePos];
    const unvisited = [...entryPoints];
    let currentPos = sourcePos;

    while (unvisited.length > 0) {
        // Find nearest unvisited entry point
        let nearestIndex = 0;
        let nearestDistance = calculateDistance(currentPos, unvisited[0]);

        for (let i = 1; i < unvisited.length; i++) {
            const distance = calculateDistance(currentPos, unvisited[i]);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = i;
            }
        }

        // Create path to nearest entry point
        const nearestPoint = unvisited[nearestIndex];
        const segmentPath = createShortestManhattanPath(currentPos, nearestPoint);

        // Add path segments (skip first point to avoid duplication)
        path.push(...segmentPath.slice(1));

        currentPos = nearestPoint;
        unvisited.splice(nearestIndex, 1);
    }

    return path;
}

// Create zone branch network that connects to main trunk
function createZoneBranchNetwork(
    mainTrunk: Pipe[],
    zoneEntryPoint: Coordinate | CanvasCoordinate,
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    zoneSprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown,
    zoneId?: string
): Pipe[] {
    const pipes: Pipe[] = [];

    if (zoneSprinklers.length === 0) return pipes;

    // Group sprinklers efficiently and connect them
    const connectedSprinklers = new Set<string>();
    const sprinklerGroups = groupSprinklersByAlignment(zoneSprinklers, isCanvasMode, scale);

    sprinklerGroups.forEach((group, groupIndex) => {
        if (group.length === 1) {
            // Single sprinkler - connect to zone entry point or existing trunk
            const sprinkler = group[0];
            if (connectedSprinklers.has(sprinkler.id)) return;

            const sprinklerPos = isCanvasMode
                ? sprinkler.canvasPosition || sprinkler.position
                : sprinkler.position;
            if (!sprinklerPos) return;

            // Connect to zone entry point or closest point on existing network
            const connectionPoint =
                findClosestPointOnAnyTrunk(
                    [...mainTrunk, ...pipes],
                    sprinklerPos,
                    isCanvasMode,
                    scale
                ) || zoneEntryPoint;
            const branchPath = createShortestManhattanPath(connectionPoint, sprinklerPos);

            for (let i = 0; i < branchPath.length - 1; i++) {
                const pipe = createUniformPipe(
                    `zone_branch_${zoneId}_${sprinkler.id}_${i}`,
                    branchPath[i],
                    branchPath[i + 1],
                    isCanvasMode,
                    scale,
                    canvasData,
                    imageData,
                    zoneId
                );
                pipes.push(pipe);
            }

            connectedSprinklers.add(sprinkler.id);
        } else {
            // Multiple aligned sprinklers - create efficient line
            const sortedGroup = sortSprinklersForConnection(group, isCanvasMode);

            // Connect first sprinkler to trunk/entry point
            const firstSprinkler = sortedGroup[0];
            if (!connectedSprinklers.has(firstSprinkler.id)) {
                const firstPos = isCanvasMode
                    ? firstSprinkler.canvasPosition || firstSprinkler.position
                    : firstSprinkler.position;
                if (firstPos) {
                    const connectionPoint =
                        findClosestPointOnAnyTrunk(
                            [...mainTrunk, ...pipes],
                            firstPos,
                            isCanvasMode,
                            scale
                        ) || zoneEntryPoint;
                    const mainBranchPath = createShortestManhattanPath(connectionPoint, firstPos);

                    for (let i = 0; i < mainBranchPath.length - 1; i++) {
                        const pipe = createUniformPipe(
                            `zone_group_main_${zoneId}_g${groupIndex}_${i}`,
                            mainBranchPath[i],
                            mainBranchPath[i + 1],
                            isCanvasMode,
                            scale,
                            canvasData,
                            imageData,
                            zoneId
                        );
                        pipes.push(pipe);
                    }

                    connectedSprinklers.add(firstSprinkler.id);
                }
            }

            // Connect remaining sprinklers in sequence
            for (let i = 0; i < sortedGroup.length - 1; i++) {
                const currentSprinkler = sortedGroup[i];
                const nextSprinkler = sortedGroup[i + 1];

                if (connectedSprinklers.has(nextSprinkler.id)) continue;

                const currentPos = isCanvasMode
                    ? currentSprinkler.canvasPosition || currentSprinkler.position
                    : currentSprinkler.position;
                const nextPos = isCanvasMode
                    ? nextSprinkler.canvasPosition || nextSprinkler.position
                    : nextSprinkler.position;

                if (!currentPos || !nextPos) continue;

                const connectionPath = createShortestManhattanPath(currentPos, nextPos);

                for (let j = 0; j < connectionPath.length - 1; j++) {
                    const pipe = createUniformPipe(
                        `zone_group_link_${zoneId}_${currentSprinkler.id}_${nextSprinkler.id}_${j}`,
                        connectionPath[j],
                        connectionPath[j + 1],
                        isCanvasMode,
                        scale,
                        canvasData,
                        imageData,
                        zoneId
                    );
                    pipes.push(pipe);
                }

                connectedSprinklers.add(nextSprinkler.id);
            }
        }
    });

    return pipes;
}

// Helper function to check if sprinkler is already connected to pipe network
function isSprinklerConnected(
    sprinkler: Sprinkler,
    pipes: Pipe[],
    isCanvasMode: boolean,
    tolerance: number = 1.0
): boolean {
    const sprinklerPos = isCanvasMode
        ? sprinkler.canvasPosition || sprinkler.position
        : sprinkler.position;
    if (!sprinklerPos) return false;

    return pipes.some((pipe) => {
        const start = isCanvasMode ? pipe.canvasStart || pipe.start : pipe.start;
        const end = isCanvasMode ? pipe.canvasEnd || pipe.end : pipe.end;

        if (!start || !end) return false;

        // Check if sprinkler position matches pipe start or end
        const distToStart = calculateDistance(
            sprinklerPos,
            start,
            isCanvasMode ? undefined : undefined
        );
        const distToEnd = calculateDistance(
            sprinklerPos,
            end,
            isCanvasMode ? undefined : undefined
        );

        return distToStart <= tolerance || distToEnd <= tolerance;
    });
}

// New optimized boundary-following pipe network
function createOptimizedBoundaryPipeNetwork(
    waterSource: WaterSource,
    sprinklers: Sprinkler[],
    gardenZones: GardenZone[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown
): Pipe[] {
    const pipes: Pipe[] = [];
    const sourcePos = isCanvasMode
        ? waterSource.canvasPosition || waterSource.position
        : waterSource.position;

    if (sprinklers.length === 0) {
        return pipes;
    }

    // Group sprinklers by zone
    const sprinklersByZone = new Map<string, Sprinkler[]>();
    sprinklers.forEach((sprinkler) => {
        if (!sprinklersByZone.has(sprinkler.zoneId)) {
            sprinklersByZone.set(sprinkler.zoneId, []);
        }
        sprinklersByZone.get(sprinkler.zoneId)!.push(sprinkler);
    });

    // Create optimized boundary routing for each zone
    sprinklersByZone.forEach((zoneSprinklers, zoneId) => {
        const zone = gardenZones.find((z) => z.id === zoneId);
        const zoneCoords = zone
            ? isCanvasMode
                ? zone.canvasCoordinates || zone.coordinates
                : zone.coordinates
            : null;

        if (!zone || !zoneCoords || zoneCoords.length < 3) {
            // Fallback for sprinklers not assigned to a valid zone (e.g., virtual_zone on map mode)
            zoneSprinklers.forEach((sprinkler, idx) => {
                const sprinklerPos = isCanvasMode
                    ? sprinkler.canvasPosition || sprinkler.position
                    : sprinkler.position;
                if (!sprinklerPos) return;

                const path = createShortestManhattanPath(sourcePos, sprinklerPos);
                for (let i = 0; i < path.length - 1; i++) {
                    const pipe = createUniformPipe(
                        `fallback_${zoneId}_${sprinkler.id}_${idx}_${i}`,
                        path[i],
                        path[i + 1],
                        isCanvasMode,
                        scale,
                        canvasData,
                        imageData,
                        zoneId
                    );
                    pipes.push(pipe);
                }
            });
            return;
        }

        // Create optimized boundary network
        const zonePipes = createZoneBoundaryNetwork(
            sourcePos,
            zoneCoords,
            zoneSprinklers,
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            zoneId
        );
        pipes.push(...zonePipes);
    });

    return pipes;
}

function createZoneBoundaryNetwork(
    sourcePos: Coordinate | CanvasCoordinate,
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    zoneSprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown,
    zoneId?: string
): Pipe[] {
    const pipes: Pipe[] = [];
    const mainTrunkPipes: Pipe[] = [];

    // Find optimal entry point to zone boundary
    const entryPoint = findOptimalEntryPoint(sourcePos, zoneCoords, isCanvasMode, scale);
    if (!entryPoint) return pipes;

    // Create main trunk from source to zone boundary
    const mainTrunkPath = createShortestManhattanPath(sourcePos, entryPoint);
    for (let i = 0; i < mainTrunkPath.length - 1; i++) {
        const pipe = createUniformPipe(
            `main_trunk_${zoneId}_${i}`,
            mainTrunkPath[i],
            mainTrunkPath[i + 1],
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            zoneId
        );
        mainTrunkPipes.push(pipe);
    }
    pipes.push(...mainTrunkPipes);

    // Create optimized boundary routing
    const boundaryPipes = createOptimizedBoundaryRouting(
        entryPoint,
        zoneCoords,
        zoneSprinklers,
        isCanvasMode,
        scale,
        canvasData,
        imageData,
        zoneId
    );
    pipes.push(...boundaryPipes);

    // Create branches using both main trunk and boundary as trunk network
    const trunkNetworkForBranches = [...mainTrunkPipes, ...boundaryPipes];
    const branchPipes = createOptimizedBranchConnections(
        trunkNetworkForBranches,
        zoneSprinklers,
        zoneCoords,
        isCanvasMode,
        scale,
        canvasData,
        imageData,
        zoneId
    );
    pipes.push(...branchPipes);

    return pipes;
}

function createOptimizedBoundaryRouting(
    entryPoint: Coordinate | CanvasCoordinate,
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    zoneSprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: unknown,
    imageData?: unknown,
    zoneId?: string
): Pipe[] {
    const pipes: Pipe[] = [];

    // Find edge closest to entry and use it as baseline trunk edge
    const entryEdgeIndex = findEdgeIndex(entryPoint, zoneCoords, isCanvasMode, scale);
    const baseEdgeStart = entryEdgeIndex >= 0 ? zoneCoords[entryEdgeIndex] : zoneCoords[0];
    const baseEdgeEnd =
        entryEdgeIndex >= 0
            ? zoneCoords[(entryEdgeIndex + 1) % zoneCoords.length]
            : zoneCoords[1 % zoneCoords.length];

    // Build trunk along the closest edge only (to mimic straight baseline)
    const { projected: projOnBase } = projectPointParam(entryPoint, baseEdgeStart, baseEdgeEnd);

    const boundaryPath: (Coordinate | CanvasCoordinate)[] = [];
    boundaryPath.push(entryPoint);
    boundaryPath.push(projOnBase);
    boundaryPath.push(baseEdgeEnd);

    // Create pipes along the boundary path
    for (let i = 0; i < boundaryPath.length - 1; i++) {
        const pipe = createUniformPipe(
            `boundary_${zoneId}_${i}`,
            boundaryPath[i],
            boundaryPath[i + 1],
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            zoneId
        );
        pipes.push(pipe);
    }

    return pipes;
}

function findOptimalBoundaryPath(
    entryPoint: Coordinate | CanvasCoordinate,
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    zoneSprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number
): (Coordinate | CanvasCoordinate)[] {
    const path: (Coordinate | CanvasCoordinate)[] = [];
    path.push(entryPoint);

    // Find boundary points that need connection
    const boundaryPoints = findRequiredBoundaryPoints(
        zoneCoords,
        zoneSprinklers,
        isCanvasMode,
        scale
    );

    if (boundaryPoints.length === 0) {
        // No sprinklers near boundary, create minimal path
        const nearestCorner = findNearestCorner(entryPoint, zoneCoords);
        if (nearestCorner) {
            path.push(nearestCorner);
        }
        return path;
    }

    // Create path that strictly follows zone boundary
    const boundaryRoute = createStrictBoundaryRoute(
        entryPoint,
        boundaryPoints,
        zoneCoords,
        isCanvasMode,
        scale
    );
    path.push(...boundaryRoute);

    return path;
}

function createStrictBoundaryRoute(
    entryPoint: Coordinate | CanvasCoordinate,
    boundaryPoints: (Coordinate | CanvasCoordinate)[],
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    isCanvasMode: boolean,
    scale: number
): (Coordinate | CanvasCoordinate)[] {
    const route: (Coordinate | CanvasCoordinate)[] = [];

    if (boundaryPoints.length === 0) return route;

    // Find which edge the entry point is on
    const entryEdgeIndex = findEdgeIndex(entryPoint, zoneCoords, isCanvasMode, scale);
    if (entryEdgeIndex === -1) return route;

    // Sort boundary points by their position along the boundary
    const sortedPoints = sortPointsAlongBoundary(
        entryPoint,
        boundaryPoints,
        zoneCoords,
        entryEdgeIndex,
        isCanvasMode,
        scale
    );

    // Create path that follows the boundary strictly
    let currentPoint = entryPoint;
    let currentEdgeIndex = entryEdgeIndex;

    for (const targetPoint of sortedPoints) {
        const targetEdgeIndex = findEdgeIndex(targetPoint, zoneCoords, isCanvasMode, scale);
        if (targetEdgeIndex === -1) continue;

        // Find path along boundary from current edge to target edge
        const boundaryPath = findBoundaryPathBetweenEdges(
            currentPoint,
            targetPoint,
            currentEdgeIndex,
            targetEdgeIndex,
            zoneCoords
        );

        route.push(...boundaryPath);
        currentPoint = targetPoint;
        currentEdgeIndex = targetEdgeIndex;
    }

    return route;
}

function findEdgeIndex(
    point: Coordinate | CanvasCoordinate,
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    isCanvasMode: boolean,
    scale: number
): number {
    for (let i = 0; i < zoneCoords.length; i++) {
        const current = zoneCoords[i];
        const next = zoneCoords[(i + 1) % zoneCoords.length];

        const distanceToEdge = calculateDistanceFromPointToLineSegment(
            point,
            current,
            next,
            isCanvasMode,
            scale
        );

        if (distanceToEdge < 10) {
            return i;
        }
    }
    return -1;
}

function sortPointsAlongBoundary(
    startPoint: Coordinate | CanvasCoordinate,
    boundaryPoints: (Coordinate | CanvasCoordinate)[],
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    startEdgeIndex: number,
    isCanvasMode: boolean,
    scale: number
): (Coordinate | CanvasCoordinate)[] {
    // Sort points by their position along the boundary
    const sortedPoints = [...boundaryPoints];

    sortedPoints.sort((a, b) => {
        const edgeA = findEdgeIndex(a, zoneCoords, isCanvasMode, scale);
        const edgeB = findEdgeIndex(b, zoneCoords, isCanvasMode, scale);

        if (edgeA === -1 || edgeB === -1) return 0;

        // Calculate distance along boundary
        const distanceA = calculateDistanceAlongBoundary(startEdgeIndex, edgeA, zoneCoords);
        const distanceB = calculateDistanceAlongBoundary(startEdgeIndex, edgeB, zoneCoords);

        return distanceA - distanceB;
    });

    return sortedPoints;
}

function calculateDistanceAlongBoundary(
    startEdgeIndex: number,
    endEdgeIndex: number,
    zoneCoords: (Coordinate | CanvasCoordinate)[]
): number {
    // Compute cumulative distances along boundary edges
    const n = zoneCoords.length;
    if (n < 2) return 0;

    const edgeLen: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        const a = zoneCoords[i];
        const b = zoneCoords[(i + 1) % n];
        edgeLen[i] = calculateDistance(a, b);
    }

    // Clockwise distance
    let cw = 0;
    let e = startEdgeIndex;
    while (e !== endEdgeIndex) {
        cw += edgeLen[e];
        e = (e + 1) % n;
        if (e === startEdgeIndex) break; // safety
    }

    // Counter-clockwise distance
    let ccw = 0;
    e = startEdgeIndex;
    while (e !== endEdgeIndex) {
        e = (e - 1 + n) % n;
        ccw += edgeLen[e];
        if (e === startEdgeIndex) break; // safety
    }

    return Math.min(cw, ccw);
}

function findBoundaryPathBetweenEdges(
    startPoint: Coordinate | CanvasCoordinate,
    endPoint: Coordinate | CanvasCoordinate,
    startEdgeIndex: number,
    endEdgeIndex: number,
    zoneCoords: (Coordinate | CanvasCoordinate)[]
): (Coordinate | CanvasCoordinate)[] {
    const path: (Coordinate | CanvasCoordinate)[] = [];

    if (startEdgeIndex === endEdgeIndex) {
        // Same edge, direct connection
        path.push(startPoint);
        path.push(endPoint);
        return path;
    }

    // Find path along boundary
    let currentEdge = startEdgeIndex;
    let currentPoint = startPoint;

    while (currentEdge !== endEdgeIndex) {
        const current = zoneCoords[currentEdge];
        const next = zoneCoords[(currentEdge + 1) % zoneCoords.length];

        // Add current edge endpoint
        path.push(currentPoint);
        path.push(next);

        currentPoint = next;
        currentEdge = (currentEdge + 1) % zoneCoords.length;

        // Prevent infinite loop
        if (currentEdge === startEdgeIndex) break;
    }

    // Add final connection to end point
    path.push(endPoint);

    return path;
}

function findRequiredBoundaryPoints(
    zoneCoords: (Coordinate | CanvasCoordinate)[],
    zoneSprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number
): (Coordinate | CanvasCoordinate)[] {
    const boundaryPoints: (Coordinate | CanvasCoordinate)[] = [];

    // Find edges that have sprinklers nearby
    for (let i = 0; i < zoneCoords.length; i++) {
        const current = zoneCoords[i];
        const next = zoneCoords[(i + 1) % zoneCoords.length];

        // Check if there are sprinklers near this edge
        const edgeSprinklers = zoneSprinklers.filter((sprinkler) => {
            const sprinklerPos = isCanvasMode
                ? sprinkler.canvasPosition || sprinkler.position
                : sprinkler.position;
            if (!sprinklerPos) return false;

            const distanceToEdge = calculateDistanceFromPointToLineSegment(
                sprinklerPos,
                current,
                next,
                isCanvasMode,
                scale
            );

            return distanceToEdge < 50; // Within 50 units of the edge
        });

        if (edgeSprinklers.length > 0) {
            // Find optimal connection point on this edge
            const connectionPoint = findOptimalConnectionPointOnEdge(current, next, edgeSprinklers);
            if (connectionPoint) {
                boundaryPoints.push(connectionPoint);
            }
        }
    }

    return boundaryPoints;
}

/**
 * คำนวณสถิติท่อแบบ real-time
 */
export function calculatePipeStatistics(
    pipes: Pipe[],
    sprinklers: Sprinkler[],
    waterSource: WaterSource | null,
    isCanvasMode: boolean,
    scale: number
): {
    totalLength: number;
    longestPath: number;
    pipeCount: number;
    zoneStats: Map<string, { length: number; longestPath: number; count: number }>;
} {
    // คำนวณความยาวท่อรวม
    const totalLength = pipes.reduce((sum, pipe) => {
        const length =
            typeof pipe.length === 'number' && !isNaN(pipe.length)
                ? Math.max(0, pipe.length)
                : pipe.canvasStart && pipe.canvasEnd && isCanvasMode
                  ? calculateDistance(pipe.canvasStart, pipe.canvasEnd, scale)
                  : pipe.start && pipe.end
                    ? calculateDistance(pipe.start, pipe.end)
                    : 0;
        return sum + length;
    }, 0);

    // คำนวณความยาวท่อที่ยาวที่สุดจากแหล่งน้ำไปหาหัวฉีด
    const longestPath = computeLongestPathFromSource({
        pipes,
        sprinklers,
        waterSource,
        isCanvasMode,
        scale,
    });

    // คำนวณสถิติตามโซน
    const zoneStats = new Map<string, { length: number; longestPath: number; count: number }>();

    // จัดกลุ่มท่อตามโซน
    pipes.forEach((pipe) => {
        const zoneId = pipe.zoneId || 'unknown';
        const length =
            typeof pipe.length === 'number' && !isNaN(pipe.length)
                ? Math.max(0, pipe.length)
                : pipe.canvasStart && pipe.canvasEnd && isCanvasMode
                  ? calculateDistance(pipe.canvasStart, pipe.canvasEnd, scale)
                  : pipe.start && pipe.end
                    ? calculateDistance(pipe.start, pipe.end)
                    : 0;

        if (!zoneStats.has(zoneId)) {
            zoneStats.set(zoneId, { length: 0, longestPath: 0, count: 0 });
        }

        const stats = zoneStats.get(zoneId)!;
        stats.length += length;
        stats.count += 1;
    });

    // คำนวณความยาวท่อที่ยาวที่สุดในแต่ละโซน
    zoneStats.forEach((stats, zoneId) => {
        const zoneSprinklers = sprinklers.filter((s) => s.zoneId === zoneId);
        const zonePipes = pipes.filter((p) => p.zoneId === zoneId);

        if (zoneSprinklers.length > 0 && zonePipes.length > 0) {
            stats.longestPath = computeLongestPathFromSource({
                pipes: zonePipes,
                sprinklers: zoneSprinklers,
                waterSource,
                isCanvasMode,
                scale,
            });
        }
    });

    return {
        totalLength,
        longestPath,
        pipeCount: pipes.length,
        zoneStats,
    };
}