// resources/js/utils/homeGardenData.ts - Updated Pipe System without branch classification

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
    sprinklerConfig?: {
        type: string;
        radius: number;
    };
    parentZoneId?: string;
}

export interface SprinklerType {
    id: string;
    name: string;
    icon: string;
    radius: number;
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
    // Removed isBranch - all pipes are now the same type
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
        id: 'popup',
        name: 'Pop-up Sprinkler',
        icon: '🟢',
        radius: 4,
        suitableFor: ['grass'],
        color: '#33CCFF',
    },
    {
        id: 'spray',
        name: 'Spray Sprinkler',
        icon: '🔴',
        radius: 3,
        suitableFor: ['flowers'],
        color: '#33CCFF',
    },
    {
        id: 'drip',
        name: 'Drip Irrigation',
        icon: '🟤',
        radius: 2,
        suitableFor: ['trees', 'flowers'],
        color: '#33CCFF',
    },
    {
        id: 'rotary',
        name: 'Rotary Sprinkler',
        icon: '🟢',
        radius: 8,
        suitableFor: ['grass', 'trees'],
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
        console.warn('Invalid scale: must be a positive number');
        return false;
    }

    const ranges = {
        image: { min: 0.1, max: 2000 },
        canvas: { min: 1, max: 200 },
    };

    const range = ranges[context];
    if (scale < range.min || scale > range.max) {
        console.warn(
            `Scale ${scale} out of valid range [${range.min}, ${range.max}] for ${context}`
        );
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
        console.warn(`Using default scale ${defaultScale} due to invalid scale ${scale}`);
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

export function canvasToGPS(
    canvasPoint: CanvasCoordinate,
    canvasData: any,
    centerPoint?: Coordinate
): Coordinate {
    if (!canvasPoint || !canvasData) {
        console.warn('Invalid canvas point or canvas data');
        return { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
    }

    const defaultCenter: Coordinate = { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
    const center = centerPoint || defaultCenter;

    const centerX = canvasData.width / 2;
    const centerY = canvasData.height / 2;

    const scale = canvasData.scale || CANVAS_DEFAULT_SCALE;
    if (!validateScale(scale, 'canvas')) {
        console.warn('Invalid scale in canvasToGPS, using default');
    }

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

    console.log(
        `🎯 Enhanced Circle Masking: radius=${radius}m, polygon=${polygon.length} vertices`
    );

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
    console.log(
        `🔍 Enhanced Canvas masking: radius=${radius}m (${radiusInPixels}px), scale=${scale}`
    );

    const centerInside = isPointInPolygon(center, polygon);

    if (centerInside) {
        const circleCompletelyInside = isCircleCompletelyInsidePolygon(
            center,
            radiusInPixels,
            polygon
        );
        if (circleCompletelyInside) {
            console.log('✅ Circle completely inside polygon');
            return 'FULL_CIRCLE';
        }
    }

    const hasIntersection = circleIntersectsPolygon(center, radiusInPixels, polygon);
    if (!hasIntersection) {
        console.log('❌ Circle does not intersect polygon');
        return 'NO_COVERAGE';
    }

    if (centerInside) {
        console.log('🎭 Circle extends beyond polygon boundary - using MASKED_CIRCLE');
        return 'MASKED_CIRCLE';
    } else {
        const clippedPolygon = createClippedPolygon(center, radiusInPixels, polygon);
        if (clippedPolygon.length >= 3) {
            console.log(`🎨 Created clipped polygon with ${clippedPolygon.length} points`);
            return clippedPolygon;
        } else {
            console.log('🎭 Using MASKED_CIRCLE for complex intersection');
            return 'MASKED_CIRCLE';
        }
    }
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

    if (centerInside) {
        console.log('🎭 GPS Circle extends beyond polygon boundary - using MASKED_CIRCLE');
        return 'MASKED_CIRCLE';
    } else {
        console.log('🎭 GPS Circle intersects from outside - using MASKED_CIRCLE');
        return 'MASKED_CIRCLE';
    }
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

// ===== SIMPLIFIED PIPE SYSTEM - All pipes are same type =====

export interface SmartPipeNetworkOptions {
    waterSource: WaterSource;
    sprinklers: Sprinkler[];
    gardenZones: GardenZone[];
    designMode?: 'map' | 'canvas' | 'image' | null;
    canvasData?: any;
    imageData?: any;
}

export function generateSmartPipeNetwork(options: SmartPipeNetworkOptions): Pipe[] {
    const { waterSource, sprinklers, gardenZones, designMode, canvasData, imageData } = options;

    console.log('🚀 Generating SIMPLIFIED pipe network (uniform pipe type)...');
    console.log(
        `Source: ${waterSource.id}, Sprinklers: ${sprinklers.length}, Zones: ${gardenZones.length}`
    );

    if (!waterSource || sprinklers.length === 0) {
        console.warn('Cannot generate pipes: missing water source or sprinklers');
        return [];
    }

    const isCanvasMode = designMode === 'canvas' || designMode === 'image';
    let scale: number = 20;
    if (isCanvasMode) {
        scale = canvasData?.scale || imageData?.scale || 20;
    }

    try {
        const pipes = createUniformPipeNetwork(
            waterSource,
            sprinklers,
            gardenZones,
            isCanvasMode,
            scale,
            canvasData,
            imageData
        );

        console.log(`✅ Generated ${pipes.length} uniform pipe segments successfully`);

        const totalLength = pipes.reduce((sum, pipe) => sum + pipe.length, 0);
        console.log(`📏 Total pipe length: ${formatDistance(totalLength)}`);

        return pipes;
    } catch (error) {
        console.error('Error generating pipe network:', error);
        return [];
    }
}

function createUniformPipeNetwork(
    waterSource: WaterSource,
    sprinklers: Sprinkler[],
    gardenZones: GardenZone[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: any,
    imageData?: any
): Pipe[] {
    console.log('🔧 Creating uniform pipe network (no branch classification)...');

    const pipes: Pipe[] = [];
    const sourcePos = isCanvasMode ? waterSource.canvasPosition! : waterSource.position;

    if (sprinklers.length === 0) {
        console.log('No sprinklers to connect');
        return pipes;
    }

    // Strategy 1: Direct connections for small networks (≤ 3 sprinklers)
    if (sprinklers.length <= 3) {
        console.log('Using direct connection strategy for small network');
        return createDirectConnections(
            sourcePos,
            sprinklers,
            isCanvasMode,
            scale,
            canvasData,
            imageData
        );
    }

    // Strategy 2: Minimum Spanning Tree for larger networks
    console.log('Using MST strategy for larger network');
    return createMSTNetwork(sourcePos, sprinklers, isCanvasMode, scale, canvasData, imageData);
}

function createDirectConnections(
    sourcePos: Coordinate | CanvasCoordinate,
    sprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: any,
    imageData?: any
): Pipe[] {
    const pipes: Pipe[] = [];

    sprinklers.forEach((sprinkler, index) => {
        const sprinklerPos = isCanvasMode ? sprinkler.canvasPosition! : sprinkler.position;

        if (!sprinklerPos) {
            console.warn(`Sprinkler ${sprinkler.id} has no position`);
            return;
        }

        const pipe = createUniformPipe(
            `direct_${index}`,
            sourcePos,
            sprinklerPos,
            isCanvasMode,
            scale,
            canvasData,
            imageData,
            sprinkler.zoneId
        );

        pipes.push(pipe);
    });

    return pipes;
}

function createMSTNetwork(
    sourcePos: Coordinate | CanvasCoordinate,
    sprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: any,
    imageData?: any
): Pipe[] {
    console.log('Creating MST-based uniform pipe network');

    const pipes: Pipe[] = [];

    // Create list of all points (source + sprinklers)
    const allPoints: {
        pos: Coordinate | CanvasCoordinate;
        id: string;
        type: 'source' | 'sprinkler';
        sprinkler?: Sprinkler;
    }[] = [{ pos: sourcePos, id: 'source', type: 'source' }];

    sprinklers.forEach((sprinkler) => {
        const pos = isCanvasMode ? sprinkler.canvasPosition : sprinkler.position;
        if (pos) {
            allPoints.push({
                pos,
                id: sprinkler.id,
                type: 'sprinkler',
                sprinkler,
            });
        }
    });

    if (allPoints.length < 2) {
        console.warn('Not enough points for MST');
        return pipes;
    }

    // Calculate distance matrix
    const distances: number[][] = [];
    for (let i = 0; i < allPoints.length; i++) {
        distances[i] = [];
        for (let j = 0; j < allPoints.length; j++) {
            if (i === j) {
                distances[i][j] = 0;
            } else {
                distances[i][j] = calculateDistance(
                    allPoints[i].pos,
                    allPoints[j].pos,
                    isCanvasMode ? scale : undefined
                );
            }
        }
    }

    // Prim's MST algorithm
    const inMST = new Array(allPoints.length).fill(false);
    const key = new Array(allPoints.length).fill(Infinity);
    const parent = new Array(allPoints.length).fill(-1);

    key[0] = 0; // Start from source

    for (let count = 0; count < allPoints.length - 1; count++) {
        // Find minimum key vertex not yet in MST
        let u = -1;
        for (let v = 0; v < allPoints.length; v++) {
            if (!inMST[v] && (u === -1 || key[v] < key[u])) {
                u = v;
            }
        }

        inMST[u] = true;

        // Update key values of adjacent vertices
        for (let v = 0; v < allPoints.length; v++) {
            if (!inMST[v] && distances[u][v] < key[v]) {
                parent[v] = u;
                key[v] = distances[u][v];
            }
        }
    }

    // Create uniform pipes from MST
    for (let i = 1; i < allPoints.length; i++) {
        if (parent[i] !== -1) {
            const fromPoint = allPoints[parent[i]];
            const toPoint = allPoints[i];

            const pipe = createUniformPipe(
                `mst_${i}`,
                fromPoint.pos,
                toPoint.pos,
                isCanvasMode,
                scale,
                canvasData,
                imageData,
                toPoint.sprinkler?.zoneId || 'unknown'
            );

            pipes.push(pipe);
        }
    }

    return pipes;
}

function createUniformPipe(
    id: string,
    start: Coordinate | CanvasCoordinate,
    end: Coordinate | CanvasCoordinate,
    isCanvasMode: boolean,
    scale: number,
    canvasData?: any,
    imageData?: any,
    zoneId?: string
): Pipe {
    const length = calculateDistance(start, end, isCanvasMode ? scale : undefined);

    if (isCanvasMode) {
        const canvasStart = start as CanvasCoordinate;
        const canvasEnd = end as CanvasCoordinate;

        // Convert to GPS coordinates
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
            // Removed isBranch - all pipes are uniform
        };
    } else {
        return {
            id,
            start: start as Coordinate,
            end: end as Coordinate,
            type: 'pipe',
            length,
            zoneId,
            // Removed isBranch - all pipes are uniform
        };
    }
}

// Pipe editing functions
export function addCustomPipe(
    fromSprinklerId: string,
    toSprinklerId: string,
    sprinklers: Sprinkler[],
    isCanvasMode: boolean,
    scale: number,
    canvasData?: any,
    imageData?: any
): Pipe | null {
    const fromSprinkler = sprinklers.find((s) => s.id === fromSprinklerId);
    const toSprinkler = sprinklers.find((s) => s.id === toSprinklerId);

    if (!fromSprinkler || !toSprinkler) {
        console.warn('Cannot create pipe: sprinkler not found');
        return null;
    }

    const fromPos = isCanvasMode ? fromSprinkler.canvasPosition! : fromSprinkler.position;
    const toPos = isCanvasMode ? toSprinkler.canvasPosition! : toSprinkler.position;

    if (!fromPos || !toPos) {
        console.warn('Cannot create pipe: sprinkler position missing');
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

        const tolerance = 0.1; // Small tolerance for floating point comparison

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

// Storage functions
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
                console.warn('Invalid image scale detected during save, resetting to default');
                data.imageData.scale = 20;
                data.imageData.isScaleSet = false;
            }
        }

        if (data.canvasData?.scale) {
            if (!validateScale(data.canvasData.scale, 'canvas')) {
                console.warn('Invalid canvas scale detected during save, resetting to default');
                data.canvasData.scale = CANVAS_DEFAULT_SCALE;
            }
        }

        inMemoryData = data;

        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (e) {
                console.warn('localStorage not available, using in-memory storage only');
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
            console.warn('Fixing invalid image scale in loaded data');
            fixedData.imageData.scale = 20;
            fixedData.imageData.isScaleSet = false;
        }
    }

    if (fixedData.canvasData?.scale) {
        if (!validateScale(fixedData.canvasData.scale, 'canvas')) {
            console.warn('Fixing invalid canvas scale in loaded data');
            fixedData.canvasData.scale = CANVAS_DEFAULT_SCALE;
        }
    }

    // Remove isBranch property from existing pipes (backward compatibility)
    if (fixedData.pipes) {
        fixedData.pipes = fixedData.pipes.map((pipe) => {
            const { isBranch, ...cleanPipe } = pipe as any;
            return cleanPipe;
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
            } catch (e) {}
        }
        return true;
    } catch (error) {
        console.error('Error clearing garden data:', error);
        return false;
    }
}

// Statistics functions
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

export function calculateStatistics(data: GardenPlannerData): GardenStatistics {
    const { gardenZones = [], sprinklers = [], pipes = [] } = data || {};
    const mainZones = gardenZones.filter((z) => z.type !== 'forbidden' && !z.parentZoneId);
    const scale = getValidScale(data);

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

    const totalPipeLength = pipes.reduce((sum, p) => sum + p.length, 0);
    const longestPipe = pipes.length > 0 ? Math.max(...pipes.map((p) => p.length)) : 0;

    const zoneStatistics: ZoneStatistics[] = mainZones.map((zone) => {
        const coords = zone.canvasCoordinates || zone.coordinates;
        const zoneArea =
            coords && coords.length >= 3
                ? calculatePolygonArea(coords, zone.canvasCoordinates ? scale : undefined)
                : 0;

        const zoneSprinklers = sprinklers.filter((s) => s.zoneId === zone.id);
        const zonePipes = pipes.filter((p) => p.zoneId === zone.id);

        const zonePipeLength = zonePipes.reduce((sum, p) => sum + p.length, 0);
        const zoneLongestPipe =
            zonePipes.length > 0 ? Math.max(...zonePipes.map((p) => p.length)) : 0;

        const zoneType = ZONE_TYPES.find((t) => t.id === zone.type);

        return {
            zoneId: zone.id,
            zoneName: zone.name,
            zoneType: zoneType?.name || zone.type,
            area: zoneArea,
            sprinklerCount: zoneSprinklers.length,
            pipeLength: zonePipeLength,
            longestPipe: zoneLongestPipe,
        };
    });

    return {
        totalArea,
        totalZones: mainZones.length,
        totalSprinklers: sprinklers.length,
        totalPipeLength,
        longestPipe,
        zoneStatistics,
    };
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

    if (!data.gardenZones || data.gardenZones.length === 0) {
        errors.push('ยังไม่ได้กำหนดโซนพื้นที่');
    } else {
        data.gardenZones.forEach((zone, index) => {
            const coords = zone.canvasCoordinates || zone.coordinates;
            if (!coords || coords.length < 3) {
                errors.push(`โซน ${zone.name || index + 1} มีจุดไม่ครบ (ต้องมีอย่างน้อย 3 จุด)`);
            }
        });
    }

    if (data.sprinklers && data.sprinklers.length > 0) {
        data.sprinklers.forEach((sprinkler, index) => {
            const pos = sprinkler.canvasPosition || sprinkler.position;
            if (!pos) {
                errors.push(`หัวฉีดตัวที่ ${index + 1} ไม่มีตำแหน่ง`);
            }
        });
    }

    if (data.designMode === 'image' && data.imageData) {
        if (
            !data.imageData.isScaleSet ||
            !data.imageData.scale ||
            !validateScale(data.imageData.scale, 'image')
        ) {
            errors.push('ยังไม่ได้ตั้งค่าขนาดจริงของรูปภาพ กรุณาวัดระยะเพื่อกำหนดมาตราส่วน');
        }
    }

    return errors;
}
