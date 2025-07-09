// Types and Interfaces
export interface Coordinate {
    lat: number;
    lng: number;
}

export interface GardenZone {
    id: string;
    type: 'grass' | 'flowers' | 'trees' | 'forbidden';
    coordinates: Coordinate[];
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
    type: SprinklerType;
    zoneId: string;
    orientation?: number;
}

export interface WaterSource {
    id: string;
    position: Coordinate;
    type: 'main' | 'pump';
}

export interface Pipe {
    id: string;
    start: Coordinate;
    end: Coordinate;
    type: 'main' | 'lateral' | 'submain';
    length: number;
    connectedSprinklers?: string[];
    zoneId?: string;
}

export interface MainPipe {
    id: string;
    points: Coordinate[];
    totalLength: number;
}

export interface SprinklerRow {
    id: string;
    sprinklers: Sprinkler[];
    connectionPoint: Coordinate;
    direction: 'horizontal' | 'vertical';
    zoneId: string;
}

export interface SearchResult {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
}

export interface ZoneType {
    id: string;
    name: string;
    color: string;
    icon: string;
}

// Constants
export const DEFAULT_CENTER: [number, number] = [13.716500766617392, 100.4911481709502];

export const SPRINKLER_TYPES: SprinklerType[] = [
    {
        id: 'popup',
        name: 'Pop-up Sprinkler',
        icon: '🟢',
        radius: 4,
        suitableFor: ['grass'],
        color: '#33FF66',
    },
    {
        id: 'spray',
        name: 'Spray Sprinkler',
        icon: '🔴',
        radius: 3,
        suitableFor: ['flowers'],
        color: '#CC3366',
    },
    {
        id: 'drip',
        name: 'Drip Irrigation',
        icon: '🟤',
        radius: 2,
        suitableFor: ['trees', 'flowers'],
        color: '#CC6633',
    },
    {
        id: 'rotary',
        name: 'Rotary Sprinkler',
        icon: '🟢',
        radius: 8,
        suitableFor: ['grass', 'trees'],
        color: '#33FF66',
    },
];

export const ZONE_TYPES: ZoneType[] = [
    { id: 'grass', name: 'สนามหญ้า', color: '#22C55E', icon: '🌱' },
    { id: 'flowers', name: 'แปลงดอกไม้', color: '#EC4899', icon: '🌸' },
    { id: 'trees', name: 'ต้นไม้', color: '#059669', icon: '🌳' },
    { id: 'forbidden', name: 'พื้นที่ต้องห้าม', color: '#EF4444', icon: '🚫' },
];

// Utility Functions
export function isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
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
}

export function calculateDistance(p1: Coordinate, p2: Coordinate): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((p1.lat * Math.PI) / 180) *
            Math.cos((p2.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculatePolygonArea(coordinates: Coordinate[]): number {
    if (coordinates.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < coordinates.length; i++) {
        const j = (i + 1) % coordinates.length;
        area += coordinates[i].lat * coordinates[j].lng;
        area -= coordinates[j].lat * coordinates[i].lng;
    }
    area = Math.abs(area) / 2;
    // Convert to square meters using approximate conversion
    return area * 111000 * 111000 * Math.cos((coordinates[0].lat * Math.PI) / 180);
}

export function formatDistance(meters: number): string {
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} กม.`;
    return `${meters.toFixed(1)} ม.`;
}

export function formatArea(sqMeters: number): string {
    if (sqMeters >= 1600) {
        // Convert to rai (1 rai = 1600 square meters)
        return `${(sqMeters / 1600).toFixed(2)} ไร่`;
    }
    return `${sqMeters.toFixed(1)} ตร.ม.`;
}

export function getClosestPointOnLineSegment(
    point: Coordinate,
    lineStart: Coordinate,
    lineEnd: Coordinate
): Coordinate {
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return lineStart;

    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));

    return {
        lat: lineStart.lat + param * C,
        lng: lineStart.lng + param * D,
    };
}

// Map bounds calculation utility
export function calculateMapBounds(
    gardenZones: GardenZone[],
    sprinklers: Sprinkler[],
    waterSource: WaterSource | null,
    mainPipe: MainPipe | null
): { center: [number, number]; zoom: number } {
    const allPoints: Coordinate[] = [];

    gardenZones.forEach((zone) => {
        allPoints.push(...zone.coordinates);
    });

    sprinklers.forEach((sprinkler) => {
        allPoints.push(sprinkler.position);
    });

    if (waterSource) {
        allPoints.push(waterSource.position);
    }

    if (mainPipe) {
        allPoints.push(...mainPipe.points);
    }

    if (allPoints.length === 0) {
        return { center: DEFAULT_CENTER, zoom: 18 };
    }

    const lats = allPoints.map((p) => p.lat);
    const lngs = allPoints.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;

    let latPadding, lngPadding;
    if (latDiff < 0.0001 && lngDiff < 0.0001) {
        latPadding = 0.0005;
        lngPadding = 0.0005;
    } else if (latDiff < 0.001 && lngDiff < 0.001) {
        latPadding = Math.max(latDiff * 0.3, 0.0002);
        lngPadding = Math.max(lngDiff * 0.3, 0.0002);
    } else {
        latPadding = latDiff * 0.2;
        lngPadding = lngDiff * 0.2;
    }

    const center: [number, number] = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];

    const paddedLatDiff = latDiff + latPadding * 2;
    const paddedLngDiff = lngDiff + lngPadding * 2;
    const maxDiff = Math.max(paddedLatDiff, paddedLngDiff);

    let zoom = 17;
    if (maxDiff > 0.05) zoom = 18;
    else if (maxDiff > 0.02) zoom = 19;
    else if (maxDiff > 0.01) zoom = 20;
    else if (maxDiff > 0.005) zoom = 21;
    else if (maxDiff > 0.002) zoom = 22;
    else if (maxDiff > 0.001) zoom = 23;
    else if (maxDiff > 0.0005) zoom = 24;
    else zoom = 25;

    return { center, zoom };
}

// Grid layout detection utility for sprinkler arrangement
export function detectGridLayout(sprinklers: Sprinkler[]): { rows: Sprinkler[][]; columns: Sprinkler[][] } {
    const tolerance = 0.00008;
    const rows: Sprinkler[][] = [];
    const processed = new Set<string>();

    const sortedByLat = [...sprinklers].sort((a, b) => b.position.lat - a.position.lat);

    for (const sprinkler of sortedByLat) {
        if (processed.has(sprinkler.id)) continue;

        const rowSprinklers = sortedByLat.filter(
            (s) =>
                !processed.has(s.id) &&
                Math.abs(s.position.lat - sprinkler.position.lat) < tolerance
        );

        if (rowSprinklers.length >= 2) {
            rowSprinklers.sort((a, b) => a.position.lng - b.position.lng);
            rows.push(rowSprinklers);
            rowSprinklers.forEach((s) => processed.add(s.id));
        } else if (rowSprinklers.length === 1) {
            rows.push(rowSprinklers);
            processed.add(sprinkler.id);
        }
    }

    return { rows, columns: [] };
}

// Statistics calculation utility
export function calculateProjectStatistics(
    gardenZones: GardenZone[],
    sprinklers: Sprinkler[],
    pipes: Pipe[],
    mainPipe: MainPipe | null
) {
    const submainPipes = pipes.filter((p) => p.type === 'submain');
    const lateralPipes = pipes.filter((p) => p.type === 'lateral');

    const totalMainLength = mainPipe ? mainPipe.totalLength : 0;
    const totalSubmainLength = submainPipes.reduce((sum, pipe) => sum + pipe.length, 0);
    const totalLateralLength = lateralPipes.reduce((sum, pipe) => sum + pipe.length, 0);

    const longestSubmainPipe =
        submainPipes.length > 0 ? Math.max(...submainPipes.map((p) => p.length)) : 0;
    const longestLateralPipe =
        lateralPipes.length > 0 ? Math.max(...lateralPipes.map((p) => p.length)) : 0;

    const totalArea = gardenZones.reduce((sum, zone) => {
        if (zone.type !== 'forbidden') {
            return sum + calculatePolygonArea(zone.coordinates);
        }
        return sum;
    }, 0);

    const coverageArea = sprinklers.reduce((sum, sprinkler) => {
        return sum + Math.PI * Math.pow(sprinkler.type.radius, 2);
    }, 0);

    const activeZones = Object.keys(
        sprinklers.reduce((acc, s) => ({ ...acc, [s.zoneId]: true }), {})
    ).length;

    const mainZones = gardenZones.filter((z) => !z.parentZoneId);
    const nestedZones = gardenZones.filter((z) => !!z.parentZoneId);

    const zoneDetails = ZONE_TYPES.map((zoneType) => {
        const mainZonesOfType = mainZones.filter((z) => z.type === zoneType.id);
        const nestedZonesOfType = nestedZones.filter((z) => z.type === zoneType.id);
        const sprinklersInType = sprinklers.filter((s) => {
            const zone = gardenZones.find((z) => z.id === s.zoneId);
            return zone?.type === zoneType.id;
        });

        const zoneAreas = mainZonesOfType.map((zone) => ({
            zoneId: zone.id,
            zoneName: zone.name,
            area: calculatePolygonArea(zone.coordinates),
            sprinklerCount: sprinklers.filter((s) => s.zoneId === zone.id).length,
            sprinklerType: zone.sprinklerConfig
                ? SPRINKLER_TYPES.find((s) => s.id === zone.sprinklerConfig!.type)
                : null,
            sprinklerRadius: zone.sprinklerConfig?.radius || 0,
        }));

        const nestedZoneAreas = nestedZonesOfType.map((zone) => ({
            zoneId: zone.id,
            zoneName: zone.name,
            area: calculatePolygonArea(zone.coordinates),
            sprinklerCount: sprinklers.filter((s) => s.zoneId === zone.id).length,
            parentZoneId: zone.parentZoneId,
        }));

        return {
            type: zoneType.name,
            id: zoneType.id,
            icon: zoneType.icon,
            count: mainZonesOfType.length,
            nestedCount: nestedZonesOfType.length,
            sprinklers: sprinklersInType.length,
            totalArea: zoneAreas.reduce((sum, z) => sum + z.area, 0),
            zones: zoneAreas,
            nestedZones: nestedZoneAreas,
        };
    }).filter((zone) => zone.count > 0 || zone.nestedCount > 0);

    return {
        totalSprinklers: sprinklers.length,
        totalMainPipeLength: totalMainLength,
        totalSubmainPipeLength: totalSubmainLength,
        totalLateralPipeLength: totalLateralLength,
        longestSubmainPipe,
        longestLateralPipe,
        totalArea,
        activeZones,
        coveragePercentage: totalArea > 0 ? Math.min((coverageArea / totalArea) * 100, 100) : 0,
        zoneDetails,
        totalPipeLength: totalMainLength + totalSubmainLength + totalLateralLength,
        submainPipeCount: submainPipes.length,
        lateralPipeCount: lateralPipes.length,
    };
}

// Longest edge calculation for sprinkler orientation
export function findLongestEdgeAngle(coordinates: Coordinate[]): number {
    if (coordinates.length < 3) return 0;

    let longestDistance = 0;
    let longestEdgeAngle = 0;

    for (let i = 0; i < coordinates.length; i++) {
        const start = coordinates[i];
        const end = coordinates[(i + 1) % coordinates.length];

        const distance = calculateDistance(start, end);

        if (distance > longestDistance) {
            longestDistance = distance;
            const deltaLat = end.lat - start.lat;
            const deltaLng = end.lng - start.lng;
            longestEdgeAngle = (Math.atan2(deltaLat, deltaLng) * 180) / Math.PI;
        }
    }

    return longestEdgeAngle;
}

// Sprinkler coverage validation
export function isSprinklerCoverageAcceptable(
    position: Coordinate,
    radius: number,
    zoneCoordinates: Coordinate[]
): boolean {
    const circlePoints: Coordinate[] = [];
    const numPoints = 24;

    for (let i = 0; i < numPoints; i++) {
        const angle = (i * 2 * Math.PI) / numPoints;
        const radiusInDegrees = radius / 111000;
        const radiusInDegreesLng = radiusInDegrees / Math.cos((position.lat * Math.PI) / 180);

        const pointLat = position.lat + Math.sin(angle) * radiusInDegrees;
        const pointLng = position.lng + Math.cos(angle) * radiusInDegreesLng;

        circlePoints.push({ lat: pointLat, lng: pointLng });
    }

    const pointsInside = circlePoints.filter((point) =>
        isPointInPolygon(point, zoneCoordinates)
    ).length;
    const coverageRatio = pointsInside / circlePoints.length;

    return coverageRatio >= 0.6;
}