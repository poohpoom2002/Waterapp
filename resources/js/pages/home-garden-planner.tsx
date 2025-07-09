import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    MapContainer,
    TileLayer,
    FeatureGroup,
    LayersControl,
    useMap,
    Polygon,
    Marker,
    Polyline,
    Circle,
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';

interface Coordinate {
    lat: number;
    lng: number;
}

interface GardenZone {
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

interface SprinklerType {
    id: string;
    name: string;
    icon: string;
    radius: number;
    suitableFor: string[];
    color: string;
}

interface Sprinkler {
    id: string;
    position: Coordinate;
    type: SprinklerType;
    zoneId: string;
    orientation?: number;
}

interface WaterSource {
    id: string;
    position: Coordinate;
    type: 'main' | 'pump';
}

interface Pipe {
    id: string;
    start: Coordinate;
    end: Coordinate;
    type: 'main' | 'lateral' | 'submain';
    length: number;
    connectedSprinklers?: string[];
    zoneId?: string;
}

interface MainPipe {
    id: string;
    points: Coordinate[];
    totalLength: number;
}

interface SprinklerRow {
    id: string;
    sprinklers: Sprinkler[];
    connectionPoint: Coordinate;
    direction: 'horizontal' | 'vertical';
    zoneId: string;
}

interface SearchResult {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
}

const DEFAULT_CENTER: [number, number] = [13.5799071, 100.8325833];

const SPRINKLER_TYPES: SprinklerType[] = [
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

const ZONE_TYPES = [
    { id: 'grass', name: 'สนามหญ้า', color: '#22C55E', icon: '🌱' },
    { id: 'flowers', name: 'แปลงดอกไม้', color: '#EC4899', icon: '🌸' },
    { id: 'trees', name: 'ต้นไม้', color: '#059669', icon: '🌳' },
    { id: 'forbidden', name: 'พื้นที่ต้องห้าม', color: '#EF4444', icon: '🚫' },
];

function isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
    if (polygon.length < 3) return false;

    let inside = false;
    const x = point.lng;
    const y = point.lat;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng;
        const yi = polygon[i].lat;
        const xj = polygon[j].lng;
        const yj = polygon[j].lat;

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

function calculateDistance(p1: Coordinate, p2: Coordinate): number {
    const R = 6371000; // รัศมีโลกเป็นเมตร
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

function calculatePolygonArea(coordinates: Coordinate[]): number {
    if (coordinates.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < coordinates.length; i++) {
        const j = (i + 1) % coordinates.length;
        area += coordinates[i].lat * coordinates[j].lng;
        area -= coordinates[j].lat * coordinates[i].lng;
    }
    area = Math.abs(area) / 2;
    return area * 111000 * 111000 * Math.cos((coordinates[0].lat * Math.PI) / 180);
}

function formatDistance(meters: number): string {
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} กม.`;
    return `${meters.toFixed(1)} ม.`;
}

function formatArea(sqMeters: number): string {
    if (sqMeters >= 1600) {
        return `${(sqMeters / 1600).toFixed(2)} ไร่`;
    }
    return `${sqMeters.toFixed(1)} ตร.ม.`;
}

function isCornerSprinkler(sprinklerPosition: Coordinate, zoneCoordinates: Coordinate[]): boolean {
    const tolerance = 0.00008;

    return zoneCoordinates.some((corner) => {
        const distance = calculateDistance(sprinklerPosition, corner);
        return distance < tolerance * 111000;
    });
}

// ประเภทสำหรับผลลัพธ์การตัด
type ClipResult = Coordinate[] | 'FULL_CIRCLE';

// ฟังก์ชันใหม่สำหรับการตัด polygon
function clipCircleToPolygon(
    center: Coordinate,
    radius: number,
    polygon: Coordinate[]
): ClipResult {
    const numPoints = 72;
    const latRadians = (center.lat * Math.PI) / 180;
    const metersPerDegreeLat =
        111132.92 - 559.82 * Math.cos(2 * latRadians) + 1.175 * Math.cos(4 * latRadians);
    const metersPerDegreeLng = 111412.84 * Math.cos(latRadians) - 93.5 * Math.cos(3 * latRadians);

    const radiusInDegreesLat = radius / metersPerDegreeLat;
    const radiusInDegreesLng = radius / metersPerDegreeLng;

    // สร้างจุดของวงกลม
    const circlePoints: Coordinate[] = [];
    for (let i = 0; i < numPoints; i++) {
        const angle = (i * 2 * Math.PI) / numPoints;
        const pointLat = center.lat + Math.sin(angle) * radiusInDegreesLat;
        const pointLng = center.lng + Math.cos(angle) * radiusInDegreesLng;
        circlePoints.push({ lat: pointLat, lng: pointLng });
    }

    // ตรวจสอบว่าวงกลมอยู่ในโซนทั้งหมดหรือไม่
    const pointsInZone = circlePoints.filter((point) => isPointInPolygon(point, polygon));

    // ถ้าจุดเกือบทั้งหมดอยู่ในโซน ให้แสดงวงกลมเต็ม
    if (pointsInZone.length >= numPoints * 0.95) {
        return 'FULL_CIRCLE';
    }

    // ถ้าไม่มีจุดใดอยู่ในโซน ไม่แสดงอะไร
    if (pointsInZone.length === 0) {
        return [];
    }

    // สร้าง clipped polygon โดยใช้ Sutherland-Hodgman algorithm
    let clippedPolygon = [...circlePoints];

    // ตัดแต่ละขอบของโซน
    for (let i = 0; i < polygon.length; i++) {
        const edgeStart = polygon[i];
        const edgeEnd = polygon[(i + 1) % polygon.length];

        clippedPolygon = clipPolygonByEdge(clippedPolygon, edgeStart, edgeEnd);

        if (clippedPolygon.length === 0) {
            break;
        }
    }

    // กรองจุดที่ซ้ำกัน
    const uniquePoints = clippedPolygon.filter((point, index, arr) => {
        for (let i = 0; i < index; i++) {
            if (
                Math.abs(arr[i].lat - point.lat) < 1e-8 &&
                Math.abs(arr[i].lng - point.lng) < 1e-8
            ) {
                return false;
            }
        }
        return true;
    });

    return uniquePoints.length >= 3 ? uniquePoints : [];
}

// Sutherland-Hodgman clipping algorithm
function clipPolygonByEdge(
    inputPolygon: Coordinate[],
    edgeStart: Coordinate,
    edgeEnd: Coordinate
): Coordinate[] {
    if (inputPolygon.length === 0) return [];

    const outputPolygon: Coordinate[] = [];

    for (let i = 0; i < inputPolygon.length; i++) {
        const currentVertex = inputPolygon[i];
        const previousVertex = inputPolygon[i === 0 ? inputPolygon.length - 1 : i - 1];

        const currentInside = isPointInsideEdge(currentVertex, edgeStart, edgeEnd);
        const previousInside = isPointInsideEdge(previousVertex, edgeStart, edgeEnd);

        if (currentInside) {
            if (!previousInside) {
                // เข้าสู่พื้นที่ - หาจุดตัด
                const intersection = getLineIntersection(
                    previousVertex,
                    currentVertex,
                    edgeStart,
                    edgeEnd
                );
                if (intersection) {
                    outputPolygon.push(intersection);
                }
            }
            outputPolygon.push(currentVertex);
        } else if (previousInside) {
            // ออกจากพื้นที่ - หาจุดตัด
            const intersection = getLineIntersection(
                previousVertex,
                currentVertex,
                edgeStart,
                edgeEnd
            );
            if (intersection) {
                outputPolygon.push(intersection);
            }
        }
    }

    return outputPolygon;
}

// ตรวจสอบว่าจุดอยู่ด้านในของขอบหรือไม่ (ใช้ cross product)
function isPointInsideEdge(point: Coordinate, edgeStart: Coordinate, edgeEnd: Coordinate): boolean {
    const crossProduct =
        (edgeEnd.lng - edgeStart.lng) * (point.lat - edgeStart.lat) -
        (edgeEnd.lat - edgeStart.lat) * (point.lng - edgeStart.lng);
    return crossProduct >= 0;
}

function getLineIntersection(
    p1: Coordinate,
    p2: Coordinate,
    p3: Coordinate,
    p4: Coordinate
): Coordinate | null {
    const x1 = p1.lng,
        y1 = p1.lat;
    const x2 = p2.lng,
        y2 = p2.lat;
    const x3 = p3.lng,
        y3 = p3.lat;
    const x4 = p4.lng,
        y4 = p4.lat;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
            lat: y1 + t * (y2 - y1),
            lng: x1 + t * (x2 - x1),
        };
    }

    return null;
}

const ClippedSprinklerRadius: React.FC<{
    center: Coordinate;
    radius: number;
    zoneCoordinates: Coordinate[];
    color: string;
    isCornerSprinkler: boolean;
}> = ({ center, radius, zoneCoordinates, color, isCornerSprinkler }) => {
    const createClippedCircle = useCallback((): ClipResult => {
        // ใช้ฟังก์ชันใหม่ที่แก้ไขแล้ว
        return clipCircleToPolygon(center, radius, zoneCoordinates);
    }, [center, radius, zoneCoordinates]);

    const result = createClippedCircle();

    if (Array.isArray(result) && result.length === 0) {
        return null;
    }

    if (result === 'FULL_CIRCLE') {
        return (
            <Circle
                center={[center.lat, center.lng]}
                radius={radius}
                pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.15,
                    weight: 1,
                    opacity: 0.5,
                }}
            />
        );
    }

    if (Array.isArray(result) && result.length >= 3) {
        return (
            <Polygon
                positions={result.map((p) => [p.lat, p.lng])}
                pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.15,
                    weight: 1,
                    opacity: 0.5,
                }}
            />
        );
    }

    return null;
};

const MapController: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom }) => {
    const map = useMap();

    useEffect(() => {
        if (map && center) {
            map.flyTo(center, zoom || map.getZoom(), {
                animate: false,
                duration: 0.1,
            });

            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    }, [center, map, zoom]);

    return null;
};

const MapSearchBox: React.FC<{
    searchQuery: string;
    searchResults: SearchResult[];
    isSearching: boolean;
    showSearchResults: boolean;
    onSearchChange: (value: string) => void;
    onResultClick: (result: SearchResult) => void;
    onClear: () => void;
}> = ({
    searchQuery,
    searchResults,
    isSearching,
    showSearchResults,
    onSearchChange,
    onResultClick,
    onClear,
}) => {
    return (
        <div className="absolute left-14 top-4 z-[1000] w-[380px] max-w-[calc(100vw-2rem)] rounded-lg border border-gray-600 bg-gray-800/95 shadow-xl backdrop-blur">
            <div className="relative">
                <input
                    type="text"
                    placeholder="🔍 ค้นหาสถานที่... (เช่น ถนน, ตำบล, อำเภอ, จังหวัด)"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-800/95 px-4 py-3 pr-10 text-sm text-white placeholder-gray-400 shadow-xl backdrop-blur focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                    <button
                        onClick={onClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 transition-colors hover:text-white"
                    >
                        ✕
                    </button>
                )}
                {isSearching && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 transform">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                    </div>
                )}
            </div>

            {showSearchResults && searchResults.length > 0 && (
                <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-600 bg-gray-800/95 shadow-xl backdrop-blur">
                    {searchResults.map((result) => (
                        <button
                            key={result.place_id}
                            onClick={() => onResultClick(result)}
                            className="w-full border-b border-gray-700 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-700/70"
                        >
                            <div className="text-sm font-medium text-white">
                                {result.display_name.split(',')[0]}
                            </div>
                            <div className="truncate text-xs text-gray-400">
                                {result.display_name}
                            </div>
                            <div className="mt-1 text-xs text-blue-400">
                                📍 {result.type} • คลิกเพื่อไปยังตำแหน่ง
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showSearchResults &&
                searchResults.length === 0 &&
                !isSearching &&
                searchQuery.length >= 3 && (
                    <div className="mt-1 rounded-lg border border-gray-600 bg-gray-800/95 shadow-xl backdrop-blur">
                        <div className="px-4 py-3 text-sm text-gray-400">
                            ไม่พบผลการค้นหาสำหรับ "{searchQuery}"
                        </div>
                    </div>
                )}
        </div>
    );
};

const StaticMapOverview: React.FC<{
    gardenZones: GardenZone[];
    sprinklers: Sprinkler[];
    waterSource: WaterSource | null;
    pipes: Pipe[];
    mainPipe: MainPipe | null;
}> = ({ gardenZones, sprinklers, waterSource, pipes, mainPipe }) => {
    const calculateMapBounds = useCallback(() => {
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
    }, [gardenZones, sprinklers, waterSource, mainPipe]);

    const { center, zoom } = calculateMapBounds();

    const createStaticSprinklerIcon = (sprinkler: SprinklerType, orientation?: number) => {
        const rotationStyle = orientation ? `transform: rotate(${orientation}deg);` : '';
        return L.divIcon({
            html: `<div class="flex items-center justify-center w-5 h-5 rounded-full shadow-md text-sm" style="border-color: ${sprinkler.color}; ${rotationStyle}">${sprinkler.icon}</div>`,
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
        });
    };

    const createStaticWaterSourceIcon = (type: 'main' | 'pump') =>
        L.divIcon({
            html: `<div class="flex items-center justify-center w-6 h-6 ${type === 'pump' ? 'bg-red-500' : 'bg-blue-600'} border-2 border-white rounded-full shadow-md text-white text-sm font-bold">${type === 'pump' ? '⚡' : '🚰'}</div>`,
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
        });

    const sortedZones = [...gardenZones].sort((a, b) => {
        if (a.parentZoneId && !b.parentZoneId) return 1;
        if (!a.parentZoneId && b.parentZoneId) return -1;
        return 0;
    });

    return (
        <div className="h-[55vh] w-full overflow-hidden rounded-xl border-2 border-gray-600 shadow-xl">
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={false}
                dragging={false}
                touchZoom={false}
                doubleClickZoom={false}
                zoomControl={false}
                attributionControl={false}
                style={{ height: '100%', width: '100%' }}
                key={`${center[0]}-${center[1]}-${zoom}`}
            >
                <MapController center={center} zoom={zoom} />
                <TileLayer
                    url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                    attribution=""
                    maxNativeZoom={22}
                    maxZoom={22}
                />

                {sortedZones.map((zone) => {
                    const zoneType = ZONE_TYPES.find((z) => z.id === zone.type);
                    const isNestedZone = !!zone.parentZoneId;
                    return (
                        <Polygon
                            key={zone.id}
                            positions={zone.coordinates.map((c) => [c.lat, c.lng])}
                            pathOptions={{
                                color: zoneType?.color || '#666',
                                fillColor: zoneType?.color || '#666',
                                fillOpacity:
                                    zone.type === 'forbidden' ? 0.6 : isNestedZone ? 0.7 : 0.1,
                                weight: isNestedZone ? 3 : 2,
                                dashArray:
                                    zone.type === 'forbidden'
                                        ? '8,8'
                                        : isNestedZone
                                          ? '5,5'
                                          : undefined,
                            }}
                        />
                    );
                })}

                {mainPipe && (
                    <Polyline
                        positions={mainPipe.points.map((p) => [p.lat, p.lng])}
                        pathOptions={{
                            color: '#3B82F6',
                            weight: 6,
                            opacity: 0.9,
                        }}
                    />
                )}

                {pipes
                    .filter((p) => p.type === 'submain')
                    .map((pipe) => (
                        <Polyline
                            key={pipe.id}
                            positions={[
                                [pipe.start.lat, pipe.start.lng],
                                [pipe.end.lat, pipe.end.lng],
                            ]}
                            pathOptions={{
                                color: '#8B5CF6',
                                weight: 4,
                                opacity: 0.8,
                            }}
                        />
                    ))}

                {pipes
                    .filter((p) => p.type === 'lateral')
                    .map((pipe) => (
                        <Polyline
                            key={pipe.id}
                            positions={[
                                [pipe.start.lat, pipe.start.lng],
                                [pipe.end.lat, pipe.end.lng],
                            ]}
                            pathOptions={{
                                color: '#FFFF00',
                                weight: 2,
                                opacity: 0.7,
                            }}
                        />
                    ))}

                {sprinklers.map((sprinkler) => {
                    const zone = gardenZones.find((z) => z.id === sprinkler.zoneId);
                    const isCorner = zone
                        ? isCornerSprinkler(sprinkler.position, zone.coordinates)
                        : false;

                    return (
                        <React.Fragment key={sprinkler.id}>
                            {zone && (
                                <ClippedSprinklerRadius
                                    center={sprinkler.position}
                                    radius={sprinkler.type.radius}
                                    zoneCoordinates={zone.coordinates}
                                    color={sprinkler.type.color}
                                    isCornerSprinkler={isCorner}
                                />
                            )}
                            <Marker
                                position={[sprinkler.position.lat, sprinkler.position.lng]}
                                icon={createStaticSprinklerIcon(
                                    sprinkler.type,
                                    sprinkler.orientation
                                )}
                            />
                        </React.Fragment>
                    );
                })}

                {waterSource && (
                    <Marker
                        position={[waterSource.position.lat, waterSource.position.lng]}
                        icon={createStaticWaterSourceIcon(waterSource.type)}
                    />
                )}
            </MapContainer>
        </div>
    );
};

const createSprinklerIcon = (
    sprinkler: SprinklerType,
    isSelected: boolean = false,
    orientation?: number
) => {
    const selectedClass = isSelected ? 'ring-4 ring-yellow-400 ring-opacity-80' : '';
    const rotationStyle = orientation ? `transform: rotate(${orientation}deg);` : '';
    return L.divIcon({
        html: `<div class="flex items-center justify-center w-5 h-5 rounded-full ${selectedClass} shadow-lg text-lg transform transition-all duration-200 ${isSelected ? 'scale-110' : ''}" style="border-color: ${sprinkler.color}; ${rotationStyle}">${sprinkler.icon}</div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });
};

const createWaterSourceIcon = (type: 'main' | 'pump') =>
    L.divIcon({
        html: `<div class="flex items-center justify-center w-10 h-10 ${type === 'pump' ? 'bg-red-500' : 'bg-blue-600'} border-2 border-white rounded-full shadow-xl text-white text-xl font-bold">${type === 'pump' ? '⚡' : '🚰'}</div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });

export default function AdvancedGardenPlanner() {
    const [activeTab, setActiveTab] = useState<'zones' | 'sprinklers' | 'pipes' | 'summary'>(
        'zones'
    );
    const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
    const [selectedZoneType, setSelectedZoneType] = useState<string>('grass');
    const [selectedZoneForConfig, setSelectedZoneForConfig] = useState<string | null>(null);
    const [selectedPipes, setSelectedPipes] = useState<Set<string>>(new Set());
    const [manualPipeMode, setManualPipeMode] = useState<
        'select-pipes' | 'connect-sprinklers' | null
    >(null);
    const [selectedSprinklersForPipe, setSelectedSprinklersForPipe] = useState<string[]>([]);
    const [editMode, setEditMode] = useState<
        'draw' | 'place' | 'edit' | 'auto-place' | 'drag-sprinkler' | 'main-pipe' | 'lateral-pipe'
    >('draw');

    const [gardenZones, setGardenZones] = useState<GardenZone[]>([]);
    const [sprinklers, setSprinklers] = useState<Sprinkler[]>([]);
    const [waterSource, setWaterSource] = useState<WaterSource | null>(null);
    const [pipes, setPipes] = useState<Pipe[]>([]);
    const [mainPipe, setMainPipe] = useState<MainPipe | null>(null);
    const [selectedSprinkler, setSelectedSprinkler] = useState<string | null>(null);
    const [draggedSprinkler, setDraggedSprinkler] = useState<string | null>(null);
    const [mainPipeDrawing, setMainPipeDrawing] = useState<Coordinate[]>([]);

    const [manualSprinklerType, setManualSprinklerType] = useState<string>('popup');
    const [manualSprinklerRadius, setManualSprinklerRadius] = useState<number>(4);

    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [showSearchResults, setShowSearchResults] = useState<boolean>(false);

    const featureGroupRef = useRef<L.FeatureGroup>(null);
    const mapRef = useRef<L.Map>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const updateSprinklerOrientation = useCallback((sprinklerId: string, orientation: number) => {
        setSprinklers((prev) =>
            prev.map((s) => (s.id === sprinklerId ? { ...s, orientation } : s))
        );
    }, []);

    const findParentGrassZone = useCallback(
        (point: Coordinate) => {
            return gardenZones.find(
                (zone) =>
                    zone.type === 'grass' &&
                    !zone.parentZoneId &&
                    isPointInPolygon(point, zone.coordinates)
            );
        },
        [gardenZones]
    );

    const getNestedZonesInParent = useCallback(
        (parentZoneId: string) => {
            return gardenZones.filter((zone) => zone.parentZoneId === parentZoneId);
        },
        [gardenZones]
    );

    const isPointInAvoidanceZone = useCallback(
        (point: Coordinate, grassZoneId: string) => {
            const nestedZones = getNestedZonesInParent(grassZoneId);
            return nestedZones.some((nestedZone) =>
                isPointInPolygon(point, nestedZone.coordinates)
            );
        },
        [getNestedZonesInParent]
    );

    const handleZoneCreated = useCallback(
        (e: any) => {
            const layer = e.layer;
            const coordinates = layer.getLatLngs()[0].map((latLng: any) => ({
                lat: latLng.lat,
                lng: latLng.lng,
            }));

            // ตรวจสอบขนาดพื้นที่
            const area = calculatePolygonArea(coordinates);
            if (area > 120) {
                alert(`❌ ขนาดพื้นที่เกินกำหนด!\n\nขนาดที่วาด: ${formatArea(area)}\nขนาดสูงสุดที่อนุญาต: 60 ตร.ม.\n\nกรุณาวาดพื้นที่ให้มีขนาดเล็กลง`);
                
                // ลบ layer ที่เพิ่งวาด
                if (featureGroupRef.current) {
                    featureGroupRef.current.removeLayer(layer);
                }
                return;
            }

            const centerPoint = {
                lat: coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length,
                lng: coordinates.reduce((sum, c) => sum + c.lng, 0) / coordinates.length,
            };

            let parentZoneId: string | undefined;

            if (selectedZoneType !== 'grass') {
                const parentGrassZone = findParentGrassZone(centerPoint);
                if (parentGrassZone) {
                    parentZoneId = parentGrassZone.id;
                }
            }

            const suitableSprinklers = SPRINKLER_TYPES.filter((s) =>
                s.suitableFor.includes(selectedZoneType)
            );
            const defaultSprinkler = suitableSprinklers[0];

            const zoneTypeInfo = ZONE_TYPES.find((z) => z.id === selectedZoneType);
            const baseNameCount = gardenZones.filter((z) => z.type === selectedZoneType).length + 1;

            const newZone: GardenZone = {
                id: `zone_${Date.now()}`,
                type: selectedZoneType as any,
                coordinates,
                name: parentZoneId
                    ? `${zoneTypeInfo?.name} (ใน ${gardenZones.find((z) => z.id === parentZoneId)?.name}) ${baseNameCount}`
                    : `${zoneTypeInfo?.name} ${baseNameCount}`,
                parentZoneId,
                sprinklerConfig:
                    selectedZoneType !== 'forbidden' && defaultSprinkler
                        ? {
                              type: defaultSprinkler.id,
                              radius: defaultSprinkler.radius,
                          }
                        : undefined,
            };

            setGardenZones((prev) => [...prev, newZone]);

            if (featureGroupRef.current) {
                featureGroupRef.current.clearLayers();
            }
        },
        [selectedZoneType, gardenZones, findParentGrassZone]
    );

    const handleZoneEdited = useCallback((e: any) => {
        console.log('Zone edited:', e);
    }, []);

    const handleZoneDeleted = useCallback((e: any) => {
        console.log('Zone deleted:', e);
    }, []);

    const findLongestEdgeAngle = useCallback((coordinates: Coordinate[]) => {
        if (coordinates.length < 3) return 0;

        let longestDistance = 0;
        let longestEdgeAngle = 0;

        for (let i = 0; i < coordinates.length; i++) {
            const start = coordinates[i];
            const end = coordinates[(i + 1) % coordinates.length];

            const distance = calculateDistance(start, end);

            if (distance > longestDistance) {
                longestDistance = distance;

                const centerLat = (start.lat + end.lat) / 2;
                const latToMeter = 111132.92 - 559.82 * Math.cos((2 * centerLat * Math.PI) / 180);
                const lngToMeter = 111412.84 * Math.cos((centerLat * Math.PI) / 180);

                const deltaLatMeter = (end.lat - start.lat) * latToMeter;
                const deltaLngMeter = (end.lng - start.lng) * lngToMeter;

                longestEdgeAngle = (Math.atan2(deltaLatMeter, deltaLngMeter) * 180) / Math.PI;
            }
        }

        return longestEdgeAngle;
    }, []);

    const placeCornerSprinklers = useCallback(
        (zone: GardenZone, sprinklerType: SprinklerType) => {
            const cornerSprinklers: Sprinkler[] = [];
            let sprinklerCounter = 0;

            zone.coordinates.forEach((corner, index) => {
                let shouldAvoid = false;
                if (zone.type === 'grass') {
                    shouldAvoid = isPointInAvoidanceZone(corner, zone.id);
                } else {
                    shouldAvoid = gardenZones.some(
                        (forbiddenZone) =>
                            forbiddenZone.type === 'forbidden' &&
                            !forbiddenZone.parentZoneId &&
                            isPointInPolygon(corner, forbiddenZone.coordinates)
                    );
                }

                if (!shouldAvoid) {
                    const orientation = findLongestEdgeAngle(zone.coordinates);
                    cornerSprinklers.push({
                        id: `${zone.id}_corner_${index}_${Date.now()}_${sprinklerCounter++}`,
                        position: corner,
                        type: sprinklerType,
                        zoneId: zone.id,
                        orientation: orientation,
                    });
                }
            });

            return cornerSprinklers;
        },
        [isPointInAvoidanceZone, findLongestEdgeAngle, gardenZones]
    );

    const autoPlaceSprinklersInZone = useCallback(
        (zoneId: string) => {
            const zone = gardenZones.find((z) => z.id === zoneId);
            if (!zone || zone.type === 'forbidden' || !zone.sprinklerConfig) return;

            const sprinklerTypeData = SPRINKLER_TYPES.find(
                (s) => s.id === zone.sprinklerConfig!.type
            );
            if (!sprinklerTypeData) return;

            const sprinklerType = {
                ...sprinklerTypeData,
                radius: zone.sprinklerConfig.radius,
            };

            const longestEdgeAngle = findLongestEdgeAngle(zone.coordinates);
            const radians = (longestEdgeAngle * Math.PI) / 180;

            const centerLat =
                zone.coordinates.reduce((sum, c) => sum + c.lat, 0) / zone.coordinates.length;
            const centerLng =
                zone.coordinates.reduce((sum, c) => sum + c.lng, 0) / zone.coordinates.length;

            const spacing = sprinklerType.radius;
            const latSpacing = spacing / 111000;
            const lngSpacing = spacing / (111000 * Math.cos((centerLat * Math.PI) / 180));

            const newSprinklers: Sprinkler[] = [];
            let sprinklerCounter = 0;

            const cornerSprinklers = placeCornerSprinklers(zone, sprinklerType);
            newSprinklers.push(...cornerSprinklers);
            sprinklerCounter += cornerSprinklers.length;

            const cos = Math.cos(radians);
            const sin = Math.sin(radians);

            const rotatedPoints = zone.coordinates.map((coord) => {
                const relLat = coord.lat - centerLat;
                const relLng = coord.lng - centerLng;
                return {
                    u: relLng * cos - relLat * sin,
                    v: relLng * sin + relLat * cos,
                };
            });

            const minU = Math.min(...rotatedPoints.map((p) => p.u));
            const maxU = Math.max(...rotatedPoints.map((p) => p.u));
            const minV = Math.min(...rotatedPoints.map((p) => p.v));
            const maxV = Math.max(...rotatedPoints.map((p) => p.v));

            const rotatedLatSpacing = latSpacing;
            const rotatedLngSpacing = lngSpacing;

            for (let v = minV + rotatedLatSpacing / 2; v <= maxV; v += rotatedLatSpacing) {
                for (let u = minU + rotatedLngSpacing / 2; u <= maxU; u += rotatedLngSpacing) {
                    const lat = centerLat + (u * -sin + v * cos);
                    const lng = centerLng + (u * cos + v * sin);
                    const point = { lat, lng };

                    if (isPointInPolygon(point, zone.coordinates)) {
                        const tooCloseToCorner = cornerSprinklers.some(
                            (corner) => calculateDistance(point, corner.position) < spacing * 0.9
                        );

                        if (tooCloseToCorner) continue;

                        let shouldAvoid = false;

                        if (zone.type === 'grass') {
                            shouldAvoid = isPointInAvoidanceZone(point, zone.id);
                        } else {
                            shouldAvoid = gardenZones.some(
                                (forbiddenZone) =>
                                    forbiddenZone.type === 'forbidden' &&
                                    !forbiddenZone.parentZoneId &&
                                    isPointInPolygon(point, forbiddenZone.coordinates)
                            );
                        }

                        if (!shouldAvoid) {
                            newSprinklers.push({
                                id: `${zone.id}_sprinkler_${Date.now()}_${sprinklerCounter++}`,
                                position: point,
                                type: sprinklerType,
                                zoneId: zone.id,
                                orientation: longestEdgeAngle,
                            });
                        }
                    }
                }
            }

            console.log(
                `Zone ${zone.name}: Placed ${cornerSprinklers.length} corner sprinklers and ${newSprinklers.length - cornerSprinklers.length} grid sprinklers`
            );

            setSelectedSprinkler(null);
            setSprinklers((prev) => [...prev.filter((s) => s.zoneId !== zoneId), ...newSprinklers]);
        },
        [gardenZones, findLongestEdgeAngle, isPointInAvoidanceZone, placeCornerSprinklers]
    );

    const autoPlaceAllSprinklers = useCallback(() => {
        setSelectedSprinkler(null);
        setSprinklers([]);
        gardenZones.forEach((zone) => {
            if (zone.type !== 'forbidden' && zone.sprinklerConfig) {
                autoPlaceSprinklersInZone(zone.id);
            }
        });
    }, [gardenZones, autoPlaceSprinklersInZone]);

    const handleMainPipeClick = useCallback(
        (e: any) => {
            if (editMode !== 'main-pipe') return;

            const { lat, lng } = e.latlng;
            const newPoint = { lat, lng };

            setMainPipeDrawing((prev) => [...prev, newPoint]);
        },
        [editMode]
    );

    const finishMainPipe = useCallback(() => {
        if (mainPipeDrawing.length < 2) {
            alert('ท่อเมนต้องมีอย่างน้อย 2 จุด');
            return;
        }

        const totalLength = mainPipeDrawing.reduce((total, point, index) => {
            if (index === 0) return 0;
            return total + calculateDistance(mainPipeDrawing[index - 1], point);
        }, 0);

        setMainPipe({
            id: `main_pipe_${Date.now()}`,
            points: [...mainPipeDrawing],
            totalLength,
        });

        setMainPipeDrawing([]);
        setEditMode('lateral-pipe');
    }, [mainPipeDrawing]);

    const clearMainPipe = useCallback(() => {
        setMainPipe(null);
        setMainPipeDrawing([]);
        setPipes((prev) => prev.filter((p) => p.type !== 'lateral' && p.type !== 'submain'));
    }, []);

    const findClosestPointOnMainPipe = useCallback(
        (point: Coordinate): Coordinate => {
            if (!mainPipe || mainPipe.points.length < 2) return point;

            let closestPoint = mainPipe.points[0];
            let minDistance = calculateDistance(point, closestPoint);

            for (const pipePoint of mainPipe.points) {
                const distance = calculateDistance(point, pipePoint);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = pipePoint;
                }
            }

            for (let i = 0; i < mainPipe.points.length - 1; i++) {
                const segmentStart = mainPipe.points[i];
                const segmentEnd = mainPipe.points[i + 1];

                const segmentClosest = getClosestPointOnLineSegment(
                    point,
                    segmentStart,
                    segmentEnd
                );
                const distance = calculateDistance(point, segmentClosest);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = segmentClosest;
                }
            }

            return closestPoint;
        },
        [mainPipe]
    );

    const getClosestPointOnLineSegment = (
        point: Coordinate,
        lineStart: Coordinate,
        lineEnd: Coordinate
    ): Coordinate => {
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
    };

    const findClosestSprinklerToMainPipe = useCallback(
        (
            sprinklers: Sprinkler[]
        ): { sprinkler: Sprinkler; connectionPoint: Coordinate; distance: number } | null => {
            if (!mainPipe || sprinklers.length === 0) return null;

            let closestSprinkler: Sprinkler | null = null;
            let minDistance = Infinity;
            let bestConnectionPoint: Coordinate | null = null;

            for (const sprinkler of sprinklers) {
                const connectionPoint = findClosestPointOnMainPipe(sprinkler.position);
                const distance = calculateDistance(sprinkler.position, connectionPoint);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestSprinkler = sprinkler;
                    bestConnectionPoint = connectionPoint;
                }
            }

            return closestSprinkler && bestConnectionPoint
                ? {
                      sprinkler: closestSprinkler,
                      connectionPoint: bestConnectionPoint,
                      distance: minDistance,
                  }
                : null;
        },
        [mainPipe, findClosestPointOnMainPipe]
    );

    const createSmartPipeLayout = useCallback(() => {
        if (!mainPipe || sprinklers.length === 0) return;

        const newPipes: Pipe[] = [];

        const sprinklersByZone = sprinklers.reduce(
            (acc, sprinkler) => {
                if (!acc[sprinkler.zoneId]) {
                    acc[sprinkler.zoneId] = [];
                }
                acc[sprinkler.zoneId].push(sprinkler);
                return acc;
            },
            {} as Record<string, Sprinkler[]>
        );

        Object.entries(sprinklersByZone).forEach(([zoneId, zoneSprinklers]) => {
            if (zoneSprinklers.length === 0) return;

            const closestSprinklerData = findClosestSprinklerToMainPipe(zoneSprinklers);

            if (!closestSprinklerData) return;

            const { sprinkler: closestSprinkler, connectionPoint } = closestSprinklerData;

            const submainPipe: Pipe = {
                id: `submain_${zoneId}`,
                start: connectionPoint,
                end: closestSprinkler.position,
                type: 'submain',
                length: calculateDistance(connectionPoint, closestSprinkler.position),
                zoneId,
                connectedSprinklers: [closestSprinkler.id],
            };
            newPipes.push(submainPipe);

            const gridLayout = detectGridLayout(zoneSprinklers);

            if (gridLayout.rows.length > 0) {
                let closestSprinklerRow: Sprinkler[] | null = null;
                let closestSprinklerIndexInRow = -1;

                for (const row of gridLayout.rows) {
                    const index = row.findIndex((s) => s.id === closestSprinkler.id);
                    if (index !== -1) {
                        closestSprinklerRow = row;
                        closestSprinklerIndexInRow = index;
                        break;
                    }
                }

                gridLayout.rows.forEach((row, rowIndex) => {
                    if (row.length === 0) return;

                    const sortedRow = [...row].sort((a, b) => a.position.lng - b.position.lng);

                    if (row === closestSprinklerRow) {
                        const closestInSorted = sortedRow.findIndex(
                            (s) => s.id === closestSprinkler.id
                        );

                        for (let i = closestInSorted + 1; i < sortedRow.length; i++) {
                            const lateralPipe: Pipe = {
                                id: `lateral_right_${sortedRow[i].id}`,
                                start: sortedRow[i - 1].position,
                                end: sortedRow[i].position,
                                type: 'lateral',
                                length: calculateDistance(
                                    sortedRow[i - 1].position,
                                    sortedRow[i].position
                                ),
                                zoneId,
                                connectedSprinklers: [sortedRow[i].id],
                            };
                            newPipes.push(lateralPipe);
                        }

                        for (let i = closestInSorted - 1; i >= 0; i--) {
                            const lateralPipe: Pipe = {
                                id: `lateral_left_${sortedRow[i].id}`,
                                start: sortedRow[i + 1].position,
                                end: sortedRow[i].position,
                                type: 'lateral',
                                length: calculateDistance(
                                    sortedRow[i + 1].position,
                                    sortedRow[i].position
                                ),
                                zoneId,
                                connectedSprinklers: [sortedRow[i].id],
                            };
                            newPipes.push(lateralPipe);
                        }
                    } else {
                        let minDistance = Infinity;
                        let bestConnectionSprinkler = closestSprinkler;

                        if (closestSprinklerRow) {
                            for (const mainRowSprinkler of closestSprinklerRow) {
                                for (const currentRowSprinkler of sortedRow) {
                                    const distance = calculateDistance(
                                        mainRowSprinkler.position,
                                        currentRowSprinkler.position
                                    );
                                    if (distance < minDistance) {
                                        minDistance = distance;
                                        bestConnectionSprinkler = mainRowSprinkler;
                                    }
                                }
                            }
                        }

                        let closestInCurrentRow = sortedRow[0];
                        let minDistanceToCurrentRow = Infinity;

                        for (const currentRowSprinkler of sortedRow) {
                            const distance = calculateDistance(
                                bestConnectionSprinkler.position,
                                currentRowSprinkler.position
                            );
                            if (distance < minDistanceToCurrentRow) {
                                minDistanceToCurrentRow = distance;
                                closestInCurrentRow = currentRowSprinkler;
                            }
                        }

                        const rowConnectionPipe: Pipe = {
                            id: `lateral_row_connection_${zoneId}_row_${rowIndex}`,
                            start: bestConnectionSprinkler.position,
                            end: closestInCurrentRow.position,
                            type: 'lateral',
                            length: calculateDistance(
                                bestConnectionSprinkler.position,
                                closestInCurrentRow.position
                            ),
                            zoneId,
                            connectedSprinklers: [closestInCurrentRow.id],
                        };
                        newPipes.push(rowConnectionPipe);

                        const startIndex = sortedRow.findIndex(
                            (s) => s.id === closestInCurrentRow.id
                        );

                        for (let i = startIndex + 1; i < sortedRow.length; i++) {
                            const lateralPipe: Pipe = {
                                id: `lateral_row_${rowIndex}_right_${sortedRow[i].id}`,
                                start: sortedRow[i - 1].position,
                                end: sortedRow[i].position,
                                type: 'lateral',
                                length: calculateDistance(
                                    sortedRow[i - 1].position,
                                    sortedRow[i].position
                                ),
                                zoneId,
                                connectedSprinklers: [sortedRow[i].id],
                            };
                            newPipes.push(lateralPipe);
                        }

                        for (let i = startIndex - 1; i >= 0; i--) {
                            const lateralPipe: Pipe = {
                                id: `lateral_row_${rowIndex}_left_${sortedRow[i].id}`,
                                start: sortedRow[i + 1].position,
                                end: sortedRow[i].position,
                                type: 'lateral',
                                length: calculateDistance(
                                    sortedRow[i + 1].position,
                                    sortedRow[i].position
                                ),
                                zoneId,
                                connectedSprinklers: [sortedRow[i].id],
                            };
                            newPipes.push(lateralPipe);
                        }
                    }
                });
            } else {
                const remainingSprinklers = zoneSprinklers.filter(
                    (s) => s.id !== closestSprinkler.id
                );

                remainingSprinklers.forEach((sprinkler) => {
                    const lateralPipe: Pipe = {
                        id: `lateral_${sprinkler.id}`,
                        start: closestSprinkler.position,
                        end: sprinkler.position,
                        type: 'lateral',
                        length: calculateDistance(closestSprinkler.position, sprinkler.position),
                        zoneId,
                        connectedSprinklers: [sprinkler.id],
                    };
                    newPipes.push(lateralPipe);
                });
            }
        });

        setPipes((prev) => [
            ...prev.filter((p) => p.type !== 'lateral' && p.type !== 'submain'),
            ...newPipes,
        ]);
    }, [mainPipe, sprinklers, findClosestSprinklerToMainPipe]);

    const detectGridLayout = useCallback((sprinklers: Sprinkler[]) => {
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
    }, []);

    const calculateZoneCenter = useCallback((sprinklers: Sprinkler[]): Coordinate => {
        const avgLat = sprinklers.reduce((sum, s) => sum + s.position.lat, 0) / sprinklers.length;
        const avgLng = sprinklers.reduce((sum, s) => sum + s.position.lng, 0) / sprinklers.length;
        return { lat: avgLat, lng: avgLng };
    }, []);

    const findBestConnectionPoint = useCallback((from: Coordinate, to: Coordinate): Coordinate => {
        return from;
    }, []);

    const handleSprinklerClickForPipe = useCallback(
        (sprinklerId: string) => {
            if (manualPipeMode !== 'connect-sprinklers') return;

            setSelectedSprinklersForPipe((prev) => {
                if (prev.includes(sprinklerId)) {
                    return prev.filter((id) => id !== sprinklerId);
                } else if (prev.length < 2) {
                    return [...prev, sprinklerId];
                } else {
                    return [sprinklerId];
                }
            });
        },
        [manualPipeMode]
    );

    const createManualPipe = useCallback(() => {
        if (selectedSprinklersForPipe.length !== 2) return;

        const sprinkler1 = sprinklers.find((s) => s.id === selectedSprinklersForPipe[0]);
        const sprinkler2 = sprinklers.find((s) => s.id === selectedSprinklersForPipe[1]);

        if (!sprinkler1 || !sprinkler2) return;

        const newPipe: Pipe = {
            id: `manual_${Date.now()}`,
            start: sprinkler1.position,
            end: sprinkler2.position,
            type: 'lateral',
            length: calculateDistance(sprinkler1.position, sprinkler2.position),
            zoneId: sprinkler1.zoneId,
            connectedSprinklers: [sprinkler1.id, sprinkler2.id],
        };

        setPipes((prev) => [...prev, newPipe]);
        setSelectedSprinklersForPipe([]);
    }, [selectedSprinklersForPipe, sprinklers]);

    const handlePipeClick = useCallback(
        (pipeId: string) => {
            if (manualPipeMode !== 'select-pipes') return;

            setSelectedPipes((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(pipeId)) {
                    newSet.delete(pipeId);
                } else {
                    newSet.add(pipeId);
                }
                return newSet;
            });
        },
        [manualPipeMode]
    );

    const deleteSelectedPipes = useCallback(() => {
        setPipes((prev) => prev.filter((pipe) => !selectedPipes.has(pipe.id)));
        setSelectedPipes(new Set());
    }, [selectedPipes]);

    const clearManualPipeMode = useCallback(() => {
        setManualPipeMode(null);
        setSelectedPipes(new Set());
        setSelectedSprinklersForPipe([]);
    }, []);

    const updateZoneConfig = useCallback(
        (zoneId: string, sprinklerType: string, radius: number) => {
            setGardenZones((prev) =>
                prev.map((zone) =>
                    zone.id === zoneId
                        ? { ...zone, sprinklerConfig: { type: sprinklerType, radius } }
                        : zone
                )
            );
            setSprinklers((prev) => prev.filter((s) => s.zoneId !== zoneId));
        },
        []
    );

    const deleteZone = useCallback(
        (zoneId: string) => {
            const zonesToDelete = [
                zoneId,
                ...gardenZones.filter((z) => z.parentZoneId === zoneId).map((z) => z.id),
            ];

            setGardenZones((prev) => prev.filter((z) => !zonesToDelete.includes(z.id)));
            setSprinklers((prev) => prev.filter((s) => !zonesToDelete.includes(s.zoneId)));
        },
        [gardenZones]
    );

    const deleteSprinklersByZone = useCallback(
        (zoneId: string) => {
            const selectedSprinklerInZone = sprinklers.find(
                (s) => s.id === selectedSprinkler && s.zoneId === zoneId
            );
            if (selectedSprinklerInZone) {
                setSelectedSprinkler(null);
            }
            setSprinklers((prev) => prev.filter((s) => s.zoneId !== zoneId));
        },
        [sprinklers, selectedSprinkler]
    );

    const handleMapClick = useCallback(
        (e: any) => {
            if (editMode === 'place') {
                const { lat, lng } = e.latlng;

                const selectedSprinklerType = SPRINKLER_TYPES.find(
                    (s) => s.id === manualSprinklerType
                );
                if (!selectedSprinklerType) return;

                const sprinklerType = {
                    ...selectedSprinklerType,
                    radius: manualSprinklerRadius,
                };

                let targetZone = gardenZones.find((zone) => {
                    if (zone.type === 'forbidden') return false;
                    return isPointInPolygon({ lat, lng }, zone.coordinates);
                });

                let zoneId = 'virtual_zone';
                if (targetZone) {
                    if (targetZone.parentZoneId) {
                        alert('ไม่สามารถวางหัวฉีดในพื้นที่ย่อยได้ กรุณาวางในพื้นที่หลักเท่านั้น');
                        return;
                    }

                    if (
                        targetZone.type === 'grass' &&
                        isPointInAvoidanceZone({ lat, lng }, targetZone.id)
                    ) {
                        alert('ไม่สามารถวางหัวฉีดในพื้นที่ดอกไม้ ต้นไม้ หรือพื้นที่ต้องห้าม');
                        return;
                    }
                    zoneId = targetZone.id;
                }

                const orientation = targetZone ? findLongestEdgeAngle(targetZone.coordinates) : 0;

                const newSprinkler: Sprinkler = {
                    id: `sprinkler_${Date.now()}`,
                    position: { lat, lng },
                    type: sprinklerType,
                    zoneId: zoneId,
                    orientation: orientation,
                };

                setSprinklers((prev) => [...prev, newSprinkler]);
            } else if (editMode === 'edit' && !waterSource) {
                const { lat, lng } = e.latlng;
                setWaterSource({
                    id: `source_${Date.now()}`,
                    position: { lat, lng },
                    type: 'main',
                });
            } else if (editMode === 'main-pipe') {
                handleMainPipeClick(e);
            }
        },
        [
            editMode,
            gardenZones,
            waterSource,
            handleMainPipeClick,
            findLongestEdgeAngle,
            isPointInAvoidanceZone,
            manualSprinklerType,
            manualSprinklerRadius,
        ]
    );

    const statistics = React.useMemo(() => {
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
    }, [pipes, mainPipe, sprinklers, gardenZones]);

    React.useEffect(() => {
        setSelectedSprinkler(null);
    }, [editMode]);

    const searchLocation = useCallback(async (query: string) => {
        if (!query.trim() || query.length < 3) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=th&addressdetails=1&extratags=1`
            );
            const results: SearchResult[] = await response.json();
            setSearchResults(results);
            setShowSearchResults(results.length > 0);
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
            setShowSearchResults(false);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleSearchInputChange = useCallback(
        (value: string) => {
            setSearchQuery(value);

            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }

            searchTimeoutRef.current = setTimeout(() => {
                searchLocation(value);
            }, 500);
        },
        [searchLocation]
    );

    const handleSearchResultClick = useCallback((result: SearchResult) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setMapCenter([lat, lng]);
        setSearchQuery(result.display_name.split(',')[0]);
        setShowSearchResults(false);
    }, []);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setSearchResults([]);
        setShowSearchResults(false);
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
    }, []);

    React.useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || editMode === 'draw') return;

        const clickHandler = (e: any) => handleMapClick(e);
        map.on('click', clickHandler);

        return () => {
            map.off('click', clickHandler);
        };
    }, [handleMapClick, editMode]);

    return (
        <div className="min-h-screen w-full overflow-hidden bg-gray-900">
            <div className="container mx-auto w-full px-4 py-6">
                <div className="mb-6 text-left">
                    <h1 className="mb-2 text-2xl font-bold text-white">
                        🏡 ระบบออกแบบระบบน้ำสำหรับสวนบ้าน
                    </h1>
                </div>

                <div className="mb-6 flex justify-center">
                    <div className="flex rounded-lg bg-gray-800 p-1">
                        {[
                            { id: 'zones', name: 'กำหนดโซน', icon: '🗺️' },
                            { id: 'sprinklers', name: 'วางหัวฉีด', icon: '💧' },
                            { id: 'pipes', name: 'ระบบท่อ', icon: '🔧' },
                            { id: 'summary', name: 'สรุปผล', icon: '📊' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`rounded-md px-6 py-3 text-sm font-medium transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                {tab.icon} {tab.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    <div className="space-y-6 lg:col-span-1">
                        {activeTab === 'zones' && (
                            <div className="rounded-xl bg-gray-800/90 p-6 shadow-2xl backdrop-blur">
                                <h3 className="mb-4 text-xl font-semibold text-blue-400">
                                    🗺️ จัดการโซนพื้นที่
                                </h3>

                                <div className="mb-4">
                                    <label className="mb-2 block text-sm font-medium text-gray-100">
                                        เลือกประเภทโซน:
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 text-gray-100">
                                        {ZONE_TYPES.map((zone) => (
                                            <button
                                                key={zone.id}
                                                onClick={() => setSelectedZoneType(zone.id)}
                                                className={`rounded-lg p-3 text-center transition-all ${
                                                    selectedZoneType === zone.id
                                                        ? 'shadow-lg ring-2 ring-blue-400'
                                                        : 'hover:bg-gray-700'
                                                }`}
                                                style={{
                                                    backgroundColor:
                                                        selectedZoneType === zone.id
                                                            ? zone.color + '20'
                                                            : 'transparent',
                                                }}
                                            >
                                                <div className="text-2xl">{zone.icon}</div>
                                                <div className="text-xs font-medium">
                                                    {zone.name}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <button
                                        onClick={() => setEditMode('draw')}
                                        className={`w-full rounded-lg py-3 font-medium transition-all ${
                                            editMode === 'draw'
                                                ? 'bg-blue-600 text-white shadow-lg'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        ✏️{' '}
                                        {editMode === 'draw'
                                            ? 'กำลังวาดโซน - คลิกแผนที่'
                                            : 'วาดโซนพื้นที่'}
                                    </button>
                                    {editMode === 'draw' && (
                                        <div className="mt-2 rounded-md bg-blue-900/30 p-2 text-xs text-blue-300">
                                            💡 ใช้เครื่องมือวาดทางซ้ายบนของแผนที่ เลือก Polygon หรือ
                                            Rectangle
                                            <br />
                                            <span className="text-yellow-300">
                                                🎯 สามารถวางโซนดอกไม้/ต้นไม้/ต้องห้าม
                                                ในพื้นที่หญ้าได้
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {gardenZones.length > 0 && (
                                    <div>
                                        <h4 className="mb-2 text-sm font-medium text-gray-300">
                                            โซนที่สร้างแล้ว:
                                        </h4>
                                        <div className="max-h-96 space-y-3 overflow-y-auto">
                                            {gardenZones.map((zone) => {
                                                const zoneType = ZONE_TYPES.find(
                                                    (z) => z.id === zone.type
                                                );
                                                const zoneSprinklers = sprinklers.filter(
                                                    (s) => s.zoneId === zone.id
                                                );
                                                const isConfigOpen =
                                                    selectedZoneForConfig === zone.id;
                                                const isNestedZone = !!zone.parentZoneId;
                                                const parentZone = zone.parentZoneId
                                                    ? gardenZones.find(
                                                          (z) => z.id === zone.parentZoneId
                                                      )
                                                    : null;

                                                return (
                                                    <div
                                                        key={zone.id}
                                                        className={`space-y-2 rounded-lg p-3 ${
                                                            isNestedZone
                                                                ? 'ml-4 border-l-4 bg-gray-600'
                                                                : 'bg-gray-700'
                                                        }`}
                                                        style={{
                                                            borderLeftColor: isNestedZone
                                                                ? zoneType?.color
                                                                : undefined,
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-lg">
                                                                    {zoneType?.icon}
                                                                </span>
                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-100">
                                                                        {zone.name}
                                                                        {isNestedZone &&
                                                                            parentZone && (
                                                                                <span className="block text-xs text-gray-400">
                                                                                    ↳ ใน{' '}
                                                                                    {
                                                                                        parentZone.name
                                                                                    }
                                                                                </span>
                                                                            )}
                                                                    </div>
                                                                    <div className="text-xs text-gray-200">
                                                                        {zoneSprinklers.length}{' '}
                                                                        หัวฉีด •{' '}
                                                                        {formatArea(
                                                                            calculatePolygonArea(
                                                                                zone.coordinates
                                                                            )
                                                                        )}
                                                                    </div>
                                                                    {zone.sprinklerConfig && (
                                                                        <div className="text-xs text-blue-300">
                                                                            {
                                                                                SPRINKLER_TYPES.find(
                                                                                    (s) =>
                                                                                        s.id ===
                                                                                        zone
                                                                                            .sprinklerConfig!
                                                                                            .type
                                                                                )?.name
                                                                            }
                                                                            • รัศมี{' '}
                                                                            {
                                                                                zone.sprinklerConfig
                                                                                    .radius
                                                                            }
                                                                            ม.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex space-x-1">
                                                                {zone.type !== 'forbidden' &&
                                                                    !isNestedZone && (
                                                                        <>
                                                                            <button
                                                                                onClick={() =>
                                                                                    setSelectedZoneForConfig(
                                                                                        isConfigOpen
                                                                                            ? null
                                                                                            : zone.id
                                                                                    )
                                                                                }
                                                                                className="text-blue-400 hover:text-blue-300"
                                                                                title="ตั้งค่าหัวฉีด"
                                                                            >
                                                                                ⚙️
                                                                            </button>
                                                                            <button
                                                                                onClick={() =>
                                                                                    autoPlaceSprinklersInZone(
                                                                                        zone.id
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    !zone.sprinklerConfig
                                                                                }
                                                                                className="text-green-400 hover:text-green-300 disabled:cursor-not-allowed disabled:text-gray-500"
                                                                                title="วางหัวฉีดในโซนนี้"
                                                                            >
                                                                                🤖
                                                                            </button>
                                                                            <button
                                                                                onClick={() =>
                                                                                    deleteSprinklersByZone(
                                                                                        zone.id
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    zoneSprinklers.length ===
                                                                                    0
                                                                                }
                                                                                className="text-yellow-400 hover:text-yellow-300 disabled:cursor-not-allowed disabled:text-gray-500"
                                                                                title="ลบหัวฉีดในโซนนี้"
                                                                            >
                                                                                💧
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                <button
                                                                    onClick={() =>
                                                                        deleteZone(zone.id)
                                                                    }
                                                                    className="text-red-400 hover:text-red-300"
                                                                    title="ลบโซน"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {isConfigOpen &&
                                                            zone.type !== 'forbidden' &&
                                                            !isNestedZone && (
                                                                <div className="mt-3 space-y-3 border-t border-gray-600 pt-3">
                                                                    <div>
                                                                        <label className="mb-2 block text-xs font-medium text-gray-300">
                                                                            เลือกประเภทหัวฉีด:
                                                                        </label>
                                                                        <div className="grid grid-cols-1 gap-1">
                                                                            {SPRINKLER_TYPES.filter(
                                                                                (s) =>
                                                                                    s.suitableFor.includes(
                                                                                        zone.type
                                                                                    )
                                                                            ).map((sprinkler) => (
                                                                                <button
                                                                                    key={
                                                                                        sprinkler.id
                                                                                    }
                                                                                    onClick={() => {
                                                                                        const currentRadius =
                                                                                            zone
                                                                                                .sprinklerConfig
                                                                                                ?.radius ||
                                                                                            sprinkler.radius;
                                                                                        updateZoneConfig(
                                                                                            zone.id,
                                                                                            sprinkler.id,
                                                                                            currentRadius
                                                                                        );
                                                                                    }}
                                                                                    className={`rounded p-2 text-left text-xs transition-all ${
                                                                                        zone
                                                                                            .sprinklerConfig
                                                                                            ?.type ===
                                                                                        sprinkler.id
                                                                                            ? 'bg-blue-900/30 ring-1 ring-blue-400'
                                                                                            : 'hover:bg-gray-600'
                                                                                    }`}
                                                                                >
                                                                                    <div className="flex items-center space-x-2">
                                                                                        <span>
                                                                                            {
                                                                                                sprinkler.icon
                                                                                            }
                                                                                        </span>
                                                                                        <span className="font-medium text-gray-100">
                                                                                            {
                                                                                                sprinkler.name
                                                                                            }
                                                                                        </span>
                                                                                    </div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    {zone.sprinklerConfig && (
                                                                        <div>
                                                                            <label className="mb-2 block text-xs font-medium text-gray-300">
                                                                                รัศมีการฉีดน้ำ
                                                                                (เมตร):
                                                                            </label>
                                                                            <div className="flex items-center space-x-3">
                                                                                <input
                                                                                    type="range"
                                                                                    min="1"
                                                                                    max="15"
                                                                                    step="0.5"
                                                                                    value={
                                                                                        zone
                                                                                            .sprinklerConfig
                                                                                            .radius
                                                                                    }
                                                                                    onChange={(e) =>
                                                                                        updateZoneConfig(
                                                                                            zone.id,
                                                                                            zone
                                                                                                .sprinklerConfig!
                                                                                                .type,
                                                                                            Number(
                                                                                                e
                                                                                                    .target
                                                                                                    .value
                                                                                            )
                                                                                        )
                                                                                    }
                                                                                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-600"
                                                                                />
                                                                                <span className="min-w-[3rem] text-sm font-bold text-blue-400">
                                                                                    {
                                                                                        zone
                                                                                            .sprinklerConfig
                                                                                            .radius
                                                                                    }
                                                                                    ม.
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'sprinklers' && (
                            <div className="rounded-xl bg-gray-800/90 p-6 shadow-2xl backdrop-blur">
                                <h3 className="mb-4 text-xl font-semibold text-blue-400">
                                    💧 จัดการหัวฉีดน้ำ
                                </h3>

                                <div className="space-y-4">
                                    <div className="rounded-lg bg-blue-900/30 p-3 text-xs text-blue-300">
                                        <div className="mb-1 font-medium">💡 การแสดงรัศมีใหม่</div>
                                        <div>
                                            รัศมีจะแสดงเต็มในพื้นที่โซน ตัดเฉพาะส่วนนอกโซน
                                            <br />
                                            แต่ละโซนสามารถเลือกประเภทหัวฉีดและรัศมีได้อิสระ
                                            <br />
                                            <span className="text-yellow-300">
                                                🎯 หัวฉีดจะวางขนานกับขอบที่ยาวที่สุดของแต่ละโซน
                                            </span>
                                            <br />
                                            <span className="text-green-300">
                                                ✅ หลีกเลี่ยงโซนย่อยในพื้นที่หญ้าอัตโนมัติ
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <button
                                            onClick={autoPlaceAllSprinklers}
                                            disabled={
                                                gardenZones.filter(
                                                    (z) =>
                                                        z.type !== 'forbidden' &&
                                                        z.sprinklerConfig &&
                                                        !z.parentZoneId
                                                ).length === 0
                                            }
                                            className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white transition-all hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                                        >
                                            🤖 วางหัวฉีดอัตโนมัติ (ทุกโซน)
                                        </button>

                                        <button
                                            onClick={() => setEditMode('place')}
                                            className={`w-full rounded-lg py-3 font-medium transition-all ${
                                                editMode === 'place'
                                                    ? 'bg-green-600 text-white shadow-lg'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            📍{' '}
                                            {editMode === 'place'
                                                ? 'กำลังวางหัวฉีด - คลิกในแผนที่'
                                                : 'วางหัวฉีดเอง'}
                                        </button>

                                        {/* Manual Sprinkler Settings */}
                                        {editMode === 'place' && (
                                            <div className="mt-3 space-y-3 border-t border-gray-600 pt-3">
                                                <div>
                                                    <label className="mb-2 block text-xs font-medium text-gray-300">
                                                        เลือกประเภทหัวฉีด:
                                                    </label>
                                                    <div className="grid grid-cols-1 gap-1">
                                                        {SPRINKLER_TYPES.map((sprinkler) => (
                                                            <button
                                                                key={sprinkler.id}
                                                                onClick={() =>
                                                                    setManualSprinklerType(
                                                                        sprinkler.id
                                                                    )
                                                                }
                                                                className={`rounded p-2 text-left text-xs transition-all ${
                                                                    manualSprinklerType ===
                                                                    sprinkler.id
                                                                        ? 'bg-blue-900/30 ring-1 ring-blue-400'
                                                                        : 'hover:bg-gray-600'
                                                                }`}
                                                            >
                                                                <div className="flex items-center space-x-2">
                                                                    <span>{sprinkler.icon}</span>
                                                                    <span className="font-medium text-gray-100">
                                                                        {sprinkler.name}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-xs font-medium text-gray-300">
                                                        รัศมีการฉีดน้ำ (เมตร):
                                                    </label>
                                                    <div className="flex items-center space-x-3">
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="15"
                                                            step="0.5"
                                                            value={manualSprinklerRadius}
                                                            onChange={(e) =>
                                                                setManualSprinklerRadius(
                                                                    Number(e.target.value)
                                                                )
                                                            }
                                                            className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-600"
                                                        />
                                                        <span className="min-w-[3rem] text-sm font-bold text-blue-400">
                                                            {manualSprinklerRadius}ม.
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="rounded-md bg-green-900/30 p-2 text-xs text-green-300">
                                                    💡 คลิกแผนที่เพื่อวางหัวฉีด •
                                                    สามารถวางได้ทุกตำแหน่ง •
                                                    ระบบจะกำหนดโซนให้อัตโนมัติ
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setEditMode('edit')}
                                            className={`w-full rounded-lg py-3 font-medium transition-all ${
                                                editMode === 'edit'
                                                    ? 'bg-yellow-600 text-white shadow-lg'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            🚰{' '}
                                            {editMode === 'edit'
                                                ? 'กำลังวางแหล่งน้ำ - คลิกแผนที่'
                                                : 'วางแหล่งน้ำ'}
                                        </button>

                                        <button
                                            onClick={() => setEditMode('drag-sprinkler')}
                                            className={`w-full rounded-lg py-3 font-medium transition-all ${
                                                editMode === 'drag-sprinkler'
                                                    ? 'bg-orange-600 text-white shadow-lg'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            ↔️{' '}
                                            {editMode === 'drag-sprinkler'
                                                ? 'กำลังปรับตำแหน่ง - ลากหัวฉีด'
                                                : 'ปรับตำแหน่งหัวฉีด'}
                                        </button>

                                        {editMode === 'edit' && (
                                            <div className="rounded-md bg-green-900/30 p-2 text-xs text-green-300">
                                                💡 คลิกตำแหน่งที่ต้องการวางแหล่งน้ำ
                                            </div>
                                        )}

                                        {editMode === 'drag-sprinkler' && (
                                            <div className="rounded-md bg-orange-900/30 p-2 text-xs text-orange-300">
                                                💡 ลากหัวฉีดไปตำแหน่งที่ต้องการ • Right-click
                                                เพื่อลบ
                                            </div>
                                        )}

                                        {sprinklers.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    setSelectedSprinkler(null);
                                                    setSprinklers([]);
                                                }}
                                                className="w-full rounded-lg bg-red-600 py-3 font-medium text-white transition-all hover:bg-red-700"
                                            >
                                                🗑️ ลบหัวฉีดทั้งหมด
                                            </button>
                                        )}
                                    </div>

                                    {sprinklers.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium text-gray-300">
                                                สรุปหัวฉีด: {sprinklers.length} ตัว
                                            </h4>
                                            <div className="max-h-40 space-y-2 overflow-y-auto">
                                                {gardenZones
                                                    .filter(
                                                        (zone) =>
                                                            zone.type !== 'forbidden' &&
                                                            !zone.parentZoneId
                                                    )
                                                    .map((zone) => {
                                                        const zoneSprinklers = sprinklers.filter(
                                                            (s) => s.zoneId === zone.id
                                                        );
                                                        if (zoneSprinklers.length === 0)
                                                            return null;

                                                        const zoneType = ZONE_TYPES.find(
                                                            (z) => z.id === zone.type
                                                        );
                                                        const nestedZones = gardenZones.filter(
                                                            (z) => z.parentZoneId === zone.id
                                                        );
                                                        return (
                                                            <div
                                                                key={zone.id}
                                                                className="rounded-lg bg-gray-700 p-2 text-xs"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center space-x-2">
                                                                        <span>
                                                                            {zoneType?.icon}
                                                                        </span>
                                                                        <span className="font-medium text-gray-100">
                                                                            {zone.name}
                                                                            {nestedZones.length >
                                                                                0 && (
                                                                                <span className="ml-1 text-yellow-300">
                                                                                    (+
                                                                                    {
                                                                                        nestedZones.length
                                                                                    }{' '}
                                                                                    โซนย่อย)
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="font-bold text-blue-400">
                                                                            {zoneSprinklers.length}{' '}
                                                                            หัว
                                                                        </div>
                                                                        {zone.sprinklerConfig && (
                                                                            <div className="text-gray-400">
                                                                                {
                                                                                    SPRINKLER_TYPES.find(
                                                                                        (s) =>
                                                                                            s.id ===
                                                                                            zone
                                                                                                .sprinklerConfig!
                                                                                                .type
                                                                                    )?.name
                                                                                }
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                {/* Show manual sprinklers */}
                                                {sprinklers.filter(
                                                    (s) => s.zoneId === 'virtual_zone'
                                                ).length > 0 && (
                                                    <div className="rounded-lg bg-gray-700 p-2 text-xs">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-2">
                                                                <span>⚙️</span>
                                                                <span className="font-medium text-gray-100">
                                                                    หัวฉีดแบบกำหนดเอง
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="font-bold text-blue-400">
                                                                    {
                                                                        sprinklers.filter(
                                                                            (s) =>
                                                                                s.zoneId ===
                                                                                'virtual_zone'
                                                                        ).length
                                                                    }{' '}
                                                                    หัว
                                                                </div>
                                                                <div className="text-gray-400">
                                                                    หัวฉีดผสม
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-3 border-t border-gray-600 pt-2">
                                                <div className="text-xs text-blue-300">
                                                    <div className="font-medium">
                                                        ระบบท่อที่เป็นระเบียบ:
                                                    </div>
                                                    {sprinklers.length > 0 && (
                                                        <div className="mt-1">
                                                            โซนที่ใช้งาน: {statistics.activeZones}{' '}
                                                            โซน
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'pipes' && (
                            <div className="rounded-xl bg-gray-800/90 p-6 shadow-2xl backdrop-blur">
                                <h3 className="mb-4 text-xl font-semibold text-blue-400">
                                    🔧 ระบบท่อน้ำขั้นสูง
                                </h3>

                                <div className="space-y-4">
                                    {!mainPipe ? (
                                        <div className="space-y-3">
                                            <div className="rounded-lg bg-blue-900/30 p-3 text-xs text-blue-300">
                                                <div className="mb-1 font-medium">
                                                    📍 หลักการออกแบบใหม่
                                                </div>
                                                <div>
                                                    ✨ Smart Grid Layout - จัดท่อตาม pattern หัวฉีด
                                                    <br />
                                                    🎯 Zone-based System - แยกระบบตามโซน
                                                    <br />
                                                    ⚡ Hierarchical Design - ท่อเมน → ท่อรอง →
                                                    ท่อย่อย
                                                    <br />
                                                    <span className="text-yellow-300">
                                                        🔥 NEW: รองรับโซนซ้อน หลีกเลี่ยงโซนย่อย
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setEditMode('main-pipe');
                                                    setMainPipeDrawing([]);
                                                }}
                                                disabled={!waterSource}
                                                className={`w-full rounded-lg py-3 font-medium transition-all ${
                                                    editMode === 'main-pipe'
                                                        ? 'bg-blue-600 text-white shadow-lg'
                                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                } disabled:cursor-not-allowed disabled:bg-gray-600`}
                                            >
                                                🏗️{' '}
                                                {editMode === 'main-pipe'
                                                    ? 'กำลังวางท่อเมน - คลิกแผนที่'
                                                    : 'วางท่อเมน'}
                                            </button>

                                            {editMode === 'main-pipe' && (
                                                <div className="space-y-2">
                                                    <div className="rounded-md bg-blue-900/30 p-2 text-xs text-blue-300">
                                                        💡 คลิกแผนที่เพื่อวางจุดท่อเมน • อย่างน้อย 2
                                                        จุด
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        จุดที่วางแล้ว: {mainPipeDrawing.length}
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={finishMainPipe}
                                                            disabled={mainPipeDrawing.length < 2}
                                                            className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                                                        >
                                                            ✅ เสร็จสิ้น
                                                        </button>
                                                        <button
                                                            onClick={() => setMainPipeDrawing([])}
                                                            className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white transition-all hover:bg-red-700"
                                                        >
                                                            🗑️ ล้าง
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="rounded-lg bg-green-900/30 p-3 text-xs text-green-300">
                                                <div className="mb-1 font-medium">
                                                    ✅ ท่อเมนเสร็จแล้ว
                                                </div>
                                                <div>
                                                    ความยาว: {formatDistance(mainPipe.totalLength)}
                                                </div>
                                            </div>

                                            <div className="rounded-lg bg-purple-900/30 p-3 text-xs text-purple-300">
                                                <div className="mb-1 font-medium">
                                                    🚀 ระบบท่ออัจฉริยะ
                                                </div>
                                                <div>
                                                    สร้างท่อรองและท่อย่อยตามรูปแบบ Grid
                                                    ที่เป็นระเบียบ
                                                    <br />
                                                    <span className="text-yellow-300">
                                                        🎯
                                                        ท่อรองจะเชื่อมไปยังหัวฉีดที่ใกล้ท่อเมนที่สุด
                                                    </span>
                                                    <br />
                                                    <span className="text-green-300">
                                                        ⚡ ท่อย่อยเดินผ่านแถวของหัวฉีด
                                                        (หลีกเลี่ยงโซนย่อย)
                                                    </span>
                                                </div>
                                                {sprinklers.length > 0 && (
                                                    <div className="mt-1 text-purple-200">
                                                        จะสร้าง:{' '}
                                                        {
                                                            Object.keys(
                                                                sprinklers.reduce(
                                                                    (acc, s) => ({
                                                                        ...acc,
                                                                        [s.zoneId]: true,
                                                                    }),
                                                                    {}
                                                                )
                                                            ).length
                                                        }{' '}
                                                        โซน
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={createSmartPipeLayout}
                                                    disabled={sprinklers.length === 0}
                                                    className="rounded-lg bg-purple-600 py-3 text-sm font-medium text-white transition-all hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                                                >
                                                    🤖 สร้างท่ออัตโนมัติ
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        clearManualPipeMode();
                                                        setManualPipeMode(
                                                            manualPipeMode ? null : 'select-pipes'
                                                        );
                                                    }}
                                                    className={`rounded-lg py-3 text-sm font-medium transition-all ${
                                                        manualPipeMode === 'select-pipes'
                                                            ? 'bg-orange-600 text-white'
                                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                    }`}
                                                >
                                                    ✂️{' '}
                                                    {manualPipeMode === 'select-pipes'
                                                        ? 'เลือกท่อลบ'
                                                        : 'แก้ไขท่อ'}
                                                </button>
                                            </div>

                                            {manualPipeMode === 'select-pipes' && (
                                                <div className="space-y-2">
                                                    <div className="rounded-md bg-orange-900/30 p-2 text-xs text-orange-300">
                                                        💡 คลิกท่อที่ต้องการลบ • เลือกได้หลายเส้น
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={deleteSelectedPipes}
                                                            disabled={selectedPipes.size === 0}
                                                            className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                                                        >
                                                            🗑️ ลบท่อ ({selectedPipes.size})
                                                        </button>
                                                        <button
                                                            onClick={clearManualPipeMode}
                                                            className="flex-1 rounded-lg bg-gray-600 py-2 text-sm font-medium text-white transition-all hover:bg-gray-700"
                                                        >
                                                            ❌ ยกเลิก
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => {
                                                    clearManualPipeMode();
                                                    setManualPipeMode(
                                                        manualPipeMode === 'connect-sprinklers'
                                                            ? null
                                                            : 'connect-sprinklers'
                                                    );
                                                }}
                                                disabled={sprinklers.length < 2}
                                                className={`w-full rounded-lg py-3 text-sm font-medium transition-all ${
                                                    manualPipeMode === 'connect-sprinklers'
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                } disabled:cursor-not-allowed disabled:bg-gray-600`}
                                            >
                                                🔗{' '}
                                                {manualPipeMode === 'connect-sprinklers'
                                                    ? 'เชื่อมต่อหัวฉีด'
                                                    : 'เดินท่อเอง'}
                                            </button>

                                            {manualPipeMode === 'connect-sprinklers' && (
                                                <div className="space-y-2">
                                                    <div className="rounded-md bg-green-900/30 p-2 text-xs text-green-300">
                                                        💡 คลิกหัวฉีด 2 ตัวเพื่อเชื่อมต่อด้วยท่อ
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        เลือกแล้ว:{' '}
                                                        {selectedSprinklersForPipe.length}/2 ตัว
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={createManualPipe}
                                                            disabled={
                                                                selectedSprinklersForPipe.length !==
                                                                2
                                                            }
                                                            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                                                        >
                                                            ➕ สร้างท่อ
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setSelectedSprinklersForPipe([])
                                                            }
                                                            className="flex-1 rounded-lg bg-gray-600 py-2 text-sm font-medium text-white transition-all hover:bg-gray-700"
                                                        >
                                                            🔄 ล้าง
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={clearMainPipe}
                                                className="w-full rounded-lg bg-red-600 py-3 font-medium text-white transition-all hover:bg-red-700"
                                            >
                                                🗑️ เริ่มระบบท่อใหม่
                                            </button>
                                        </div>
                                    )}

                                    {(mainPipe || pipes.length > 0) && (
                                        <div className="space-y-2 border-t border-gray-700 pt-4 text-sm">
                                            {mainPipe && (
                                                <div className="rounded-lg bg-blue-900/30 p-3">
                                                    <div className="font-medium text-blue-300">
                                                        ท่อเมน
                                                    </div>
                                                    <div className="text-xs text-blue-200">
                                                        {mainPipe.points.length} จุด •{' '}
                                                        {formatDistance(mainPipe.totalLength)}
                                                    </div>
                                                </div>
                                            )}
                                            {pipes.filter((p) => p.type === 'submain').length >
                                                0 && (
                                                <div className="rounded-lg bg-purple-900/30 p-3">
                                                    <div className="font-medium text-purple-300">
                                                        ท่อรอง (Submain)
                                                    </div>
                                                    <div className="text-xs text-purple-200">
                                                        {
                                                            pipes.filter(
                                                                (p) => p.type === 'submain'
                                                            ).length
                                                        }{' '}
                                                        เส้น •
                                                        {formatDistance(
                                                            pipes
                                                                .filter((p) => p.type === 'submain')
                                                                .reduce(
                                                                    (sum, p) => sum + p.length,
                                                                    0
                                                                )
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {pipes.filter((p) => p.type === 'lateral').length >
                                                0 && (
                                                <div className="rounded-lg bg-green-900/30 p-3">
                                                    <div className="font-medium text-green-300">
                                                        ท่อย่อย (Lateral)
                                                    </div>
                                                    <div className="text-xs text-green-200">
                                                        {
                                                            pipes.filter(
                                                                (p) => p.type === 'lateral'
                                                            ).length
                                                        }{' '}
                                                        เส้น •
                                                        {formatDistance(
                                                            pipes
                                                                .filter((p) => p.type === 'lateral')
                                                                .reduce(
                                                                    (sum, p) => sum + p.length,
                                                                    0
                                                                )
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'summary' && (
                            <div className="rounded-xl bg-gray-800/90 p-6 shadow-2xl backdrop-blur">
                                <h3 className="mb-4 text-xl font-semibold text-blue-400">
                                    📊 สรุปผลการออกแบบ
                                </h3>

                                <div className="space-y-4 text-sm">
                                    <div className="rounded-lg bg-gradient-to-r from-blue-900/50 to-green-900/50 p-4">
                                        <h4 className="mb-3 font-medium text-blue-300">
                                            📋 สรุปข้อมูลรวม
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">จำนวนโซนหลัก:</span>
                                                <span className="font-medium text-white">
                                                    {statistics.zoneDetails.reduce(
                                                        (sum, z) => sum + z.count,
                                                        0
                                                    )}{' '}
                                                    โซน
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">จำนวนโซนย่อย:</span>
                                                <span className="font-medium text-white">
                                                    {statistics.zoneDetails.reduce(
                                                        (sum, z) => sum + z.nestedCount,
                                                        0
                                                    )}{' '}
                                                    โซน
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">พื้นที่รวม:</span>
                                                <span className="font-medium text-white">
                                                    {formatArea(statistics.totalArea)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">
                                                    หัวฉีดทั้งหมด:
                                                </span>
                                                <span className="font-medium text-blue-400">
                                                    {statistics.totalSprinklers} ตัว
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">
                                                    ท่อรวมทั้งหมด:
                                                </span>
                                                <span className="font-medium text-orange-400">
                                                    {formatDistance(statistics.totalPipeLength)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-300">
                                                    การคลุมพื้นที่:
                                                </span>
                                                <span className="font-medium text-green-400">
                                                    {statistics.coveragePercentage.toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ระบบท่อ */}
                                    <div className="rounded-lg bg-purple-900/30 p-4">
                                        <h4 className="mb-3 font-medium text-purple-300">
                                            🔧 รายละเอียดระบบท่อ
                                        </h4>
                                        <div className="space-y-2 text-xs">
                                            {mainPipe && (
                                                <div className="flex justify-between rounded bg-blue-900/20 p-2">
                                                    <span className="text-blue-300">ท่อเมน:</span>
                                                    <span className="font-medium text-white">
                                                        {formatDistance(
                                                            statistics.totalMainPipeLength
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                            {statistics.submainPipeCount > 0 && (
                                                <>
                                                    <div className="flex justify-between rounded bg-purple-900/20 p-2">
                                                        <span className="text-purple-300">
                                                            ท่อรอง ({statistics.submainPipeCount}{' '}
                                                            เส้น):
                                                        </span>
                                                        <span className="font-medium text-white">
                                                            {formatDistance(
                                                                statistics.totalSubmainPipeLength
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between rounded bg-purple-800/20 p-2">
                                                        <span className="text-purple-200">
                                                            ท่อรองยาวสุด:
                                                        </span>
                                                        <span className="font-medium text-yellow-300">
                                                            {formatDistance(
                                                                statistics.longestSubmainPipe
                                                            )}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                            {statistics.lateralPipeCount > 0 && (
                                                <>
                                                    <div className="flex justify-between rounded bg-green-900/20 p-2">
                                                        <span className="text-green-300">
                                                            ท่อย่อย ({statistics.lateralPipeCount}{' '}
                                                            เส้น):
                                                        </span>
                                                        <span className="font-medium text-white">
                                                            {formatDistance(
                                                                statistics.totalLateralPipeLength
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between rounded bg-green-800/20 p-2">
                                                        <span className="text-green-200">
                                                            ท่อย่อยยาวสุด:
                                                        </span>
                                                        <span className="font-medium text-yellow-300">
                                                            {formatDistance(
                                                                statistics.longestLateralPipe
                                                            )}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-green-900/30 p-4">
                                        <h4 className="mb-3 font-medium text-green-300">
                                            🌿 รายละเอียดแต่ละโซน
                                        </h4>
                                        <div className="space-y-3 text-xs">
                                            {statistics.zoneDetails.map((zoneDetail, index) => (
                                                <div
                                                    key={index}
                                                    className="border-l-4 border-opacity-50 pl-3"
                                                    style={{
                                                        borderColor: ZONE_TYPES.find(
                                                            (z) => z.id === zoneDetail.id
                                                        )?.color,
                                                    }}
                                                >
                                                    <div className="mb-2 font-medium text-white">
                                                        {zoneDetail.icon} {zoneDetail.type}
                                                    </div>
                                                    <div className="space-y-1 text-gray-300">
                                                        <div className="flex justify-between">
                                                            <span>จำนวนโซนหลัก:</span>
                                                            <span className="font-medium">
                                                                {zoneDetail.count} โซน
                                                            </span>
                                                        </div>
                                                        {zoneDetail.nestedCount > 0 && (
                                                            <div className="flex justify-between">
                                                                <span>จำนวนโซนย่อย:</span>
                                                                <span className="font-medium text-yellow-300">
                                                                    {zoneDetail.nestedCount} โซน
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between">
                                                            <span>พื้นที่รวม:</span>
                                                            <span className="font-medium">
                                                                {formatArea(zoneDetail.totalArea)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>จำนวนหัวฉีด:</span>
                                                            <span className="font-medium text-blue-400">
                                                                {zoneDetail.sprinklers} ตัว
                                                            </span>
                                                        </div>

                                                        {/* รายละเอียดแต่ละโซนย่อย */}
                                                        {zoneDetail.zones.map((zone, zoneIndex) => (
                                                            <div
                                                                key={zoneIndex}
                                                                className="mt-2 rounded bg-black/20 p-2"
                                                            >
                                                                <div className="text-xs font-medium text-gray-200">
                                                                    {zone.zoneName}
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
                                                                    <div>
                                                                        พื้นที่:{' '}
                                                                        {formatArea(zone.area)}
                                                                    </div>
                                                                    <div>
                                                                        หัวฉีด:{' '}
                                                                        {zone.sprinklerCount} ตัว
                                                                    </div>
                                                                    {zone.sprinklerType && (
                                                                        <>
                                                                            <div>
                                                                                ประเภท:{' '}
                                                                                {
                                                                                    zone
                                                                                        .sprinklerType
                                                                                        .name
                                                                                }
                                                                            </div>
                                                                            <div>
                                                                                รัศมี:{' '}
                                                                                {
                                                                                    zone.sprinklerRadius
                                                                                }{' '}
                                                                                ม.
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* โซนย่อย */}
                                                        {zoneDetail.nestedZones.map(
                                                            (nestedZone, nestedIndex) => (
                                                                <div
                                                                    key={nestedIndex}
                                                                    className="mt-2 rounded bg-yellow-900/20 p-2"
                                                                >
                                                                    <div className="text-xs font-medium text-yellow-200">
                                                                        ↳ {nestedZone.zoneName}{' '}
                                                                        (โซนย่อย)
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
                                                                        <div>
                                                                            พื้นที่:{' '}
                                                                            {formatArea(
                                                                                nestedZone.area
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            หัวฉีด:{' '}
                                                                            {
                                                                                nestedZone.sprinklerCount
                                                                            }{' '}
                                                                            ตัว
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-3">
                        {activeTab === 'summary' ? (
                            <div className="space-y-6">
                                <div className="h-[70vh] rounded-xl bg-gray-800/90 p-6 shadow-2xl backdrop-blur">
                                    <h3 className="mb-4 text-xl font-semibold text-blue-400">
                                        🗺️ แผนผังโครงการ
                                    </h3>
                                    {gardenZones.length > 0 || sprinklers.length > 0 ? (
                                        <div className="h-[70vh]">
                                            <div className="mb-2 text-xs text-gray-400">
                                                โซน: {gardenZones.length} | หัวฉีด:{' '}
                                                {sprinklers.length} | แหล่งน้ำ:{' '}
                                                {waterSource ? '1' : '0'}
                                            </div>
                                            <StaticMapOverview
                                                gardenZones={gardenZones}
                                                sprinklers={sprinklers}
                                                waterSource={waterSource}
                                                pipes={pipes}
                                                mainPipe={mainPipe}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex h-80 w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-600 bg-gray-700/50">
                                            <div className="text-center text-gray-400">
                                                <div className="mb-2 text-4xl">🗺️</div>
                                                <div className="text-lg">
                                                    ยังไม่มีข้อมูลการออกแบบ
                                                </div>
                                                <div className="mt-1 text-sm">
                                                    กรุณาเริ่มต้นจากการสร้างโซนพื้นที่
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="relative h-[70vh] overflow-hidden rounded-xl border border-gray-600 shadow-2xl">
                                <MapSearchBox
                                    searchQuery={searchQuery}
                                    searchResults={searchResults}
                                    isSearching={isSearching}
                                    showSearchResults={showSearchResults}
                                    onSearchChange={handleSearchInputChange}
                                    onResultClick={handleSearchResultClick}
                                    onClear={clearSearch}
                                />

                                <MapContainer
                                    center={mapCenter}
                                    zoom={16}
                                    maxZoom={22}
                                    scrollWheelZoom={true}
                                    style={{ height: '100%', width: '100%' }}
                                    ref={mapRef}
                                >
                                    <MapController center={mapCenter} />
                                    <LayersControl position="topright">
                                        <LayersControl.BaseLayer checked name="ภาพถ่ายดาวเทียม">
                                            <TileLayer
                                                url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                                                attribution="Google Maps"
                                                maxNativeZoom={22}
                                                maxZoom={22}
                                            />
                                        </LayersControl.BaseLayer>
                                        <LayersControl.BaseLayer name="แผนที่ถนน">
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                attribution="OpenStreetMap"
                                                maxNativeZoom={19}
                                                maxZoom={22}
                                            />
                                        </LayersControl.BaseLayer>
                                    </LayersControl>

                                    {/* Sort zones so that parent zones are rendered before child zones */}
                                    {[...gardenZones]
                                        .sort((a, b) => {
                                            if (a.parentZoneId && !b.parentZoneId) return 1;
                                            if (!a.parentZoneId && b.parentZoneId) return -1;
                                            return 0;
                                        })
                                        .map((zone) => {
                                            const zoneType = ZONE_TYPES.find(
                                                (z) => z.id === zone.type
                                            );
                                            const isNestedZone = !!zone.parentZoneId;
                                            return (
                                                <Polygon
                                                    key={zone.id}
                                                    positions={zone.coordinates.map((c) => [
                                                        c.lat,
                                                        c.lng,
                                                    ])}
                                                    pathOptions={{
                                                        color: zoneType?.color || '#666',
                                                        fillColor: zoneType?.color || '#666',
                                                        fillOpacity:
                                                            zone.type === 'forbidden'
                                                                ? 0.5
                                                                : isNestedZone
                                                                  ? 0.6
                                                                  : 0.2,
                                                        weight: isNestedZone ? 3 : 2,
                                                        dashArray:
                                                            zone.type === 'forbidden'
                                                                ? '10,10'
                                                                : isNestedZone
                                                                  ? '5,5'
                                                                  : undefined,
                                                    }}
                                                />
                                            );
                                        })}

                                    {mainPipeDrawing.length > 0 && (
                                        <Polyline
                                            positions={mainPipeDrawing.map((p) => [p.lat, p.lng])}
                                            pathOptions={{
                                                color: '#60A5FA',
                                                weight: 6,
                                                opacity: 0.7,
                                                dashArray: '10,10',
                                            }}
                                        />
                                    )}

                                    {mainPipe && (
                                        <Polyline
                                            positions={mainPipe.points.map((p) => [p.lat, p.lng])}
                                            pathOptions={{
                                                color: '#3B82F6',
                                                weight: 8,
                                                opacity: 0.9,
                                            }}
                                        />
                                    )}

                                    {sprinklers.map((sprinkler) => {
                                        const zone = gardenZones.find(
                                            (z) => z.id === sprinkler.zoneId
                                        );
                                        const isCorner = zone
                                            ? isCornerSprinkler(
                                                  sprinkler.position,
                                                  zone.coordinates
                                              )
                                            : false;

                                        return (
                                            <React.Fragment key={sprinkler.id}>
                                                {zone && (
                                                    <ClippedSprinklerRadius
                                                        center={sprinkler.position}
                                                        radius={sprinkler.type.radius}
                                                        zoneCoordinates={zone.coordinates}
                                                        color={sprinkler.type.color}
                                                        isCornerSprinkler={isCorner}
                                                    />
                                                )}
                                                <Marker
                                                    position={[
                                                        sprinkler.position.lat,
                                                        sprinkler.position.lng,
                                                    ]}
                                                    icon={createSprinklerIcon(
                                                        sprinkler.type,
                                                        selectedSprinkler === sprinkler.id ||
                                                            selectedSprinklersForPipe.includes(
                                                                sprinkler.id
                                                            ),
                                                        sprinkler.orientation
                                                    )}
                                                    draggable={editMode === 'drag-sprinkler'}
                                                    eventHandlers={{
                                                        click: () => {
                                                            if (
                                                                manualPipeMode ===
                                                                'connect-sprinklers'
                                                            ) {
                                                                handleSprinklerClickForPipe(
                                                                    sprinkler.id
                                                                );
                                                            } else {
                                                                setSelectedSprinkler((prev) =>
                                                                    prev === sprinkler.id
                                                                        ? null
                                                                        : sprinkler.id
                                                                );
                                                            }
                                                        },
                                                        contextmenu: () => {
                                                            setSprinklers((prev) =>
                                                                prev.filter(
                                                                    (s) => s.id !== sprinkler.id
                                                                )
                                                            );
                                                            if (
                                                                selectedSprinkler === sprinkler.id
                                                            ) {
                                                                setSelectedSprinkler(null);
                                                            }
                                                            setSelectedSprinklersForPipe((prev) =>
                                                                prev.filter(
                                                                    (id) => id !== sprinkler.id
                                                                )
                                                            );
                                                        },
                                                        dragstart: () => {
                                                            setDraggedSprinkler(sprinkler.id);
                                                            setSelectedSprinkler(sprinkler.id);
                                                        },
                                                        dragend: (e: any) => {
                                                            const { lat, lng } =
                                                                e.target.getLatLng();
                                                            setSprinklers((prev) =>
                                                                prev.map((s) =>
                                                                    s.id === sprinkler.id
                                                                        ? {
                                                                              ...s,
                                                                              position: {
                                                                                  lat,
                                                                                  lng,
                                                                              },
                                                                          }
                                                                        : s
                                                                )
                                                            );
                                                            setDraggedSprinkler(null);
                                                            if (
                                                                pipes.some(
                                                                    (p) =>
                                                                        p.type === 'lateral' ||
                                                                        p.type === 'submain'
                                                                )
                                                            ) {
                                                                setTimeout(
                                                                    createSmartPipeLayout,
                                                                    100
                                                                );
                                                            }
                                                        },
                                                    }}
                                                />
                                            </React.Fragment>
                                        );
                                    })}

                                    {waterSource && (
                                        <Marker
                                            position={[
                                                waterSource.position.lat,
                                                waterSource.position.lng,
                                            ]}
                                            icon={createWaterSourceIcon(waterSource.type)}
                                            eventHandlers={{
                                                contextmenu: () => setWaterSource(null),
                                            }}
                                        />
                                    )}

                                    {pipes
                                        .filter((p) => p.type === 'submain')
                                        .map((pipe) => (
                                            <Polyline
                                                key={pipe.id}
                                                positions={[
                                                    [pipe.start.lat, pipe.start.lng],
                                                    [pipe.end.lat, pipe.end.lng],
                                                ]}
                                                pathOptions={{
                                                    color: selectedPipes.has(pipe.id)
                                                        ? '#FBBF24'
                                                        : '#8B5CF6',
                                                    weight: selectedPipes.has(pipe.id) ? 6 : 4,
                                                    opacity: 0.9,
                                                }}
                                                eventHandlers={{
                                                    click: () => handlePipeClick(pipe.id),
                                                }}
                                            />
                                        ))}

                                    {pipes
                                        .filter((p) => p.type === 'lateral')
                                        .map((pipe) => (
                                            <Polyline
                                                key={pipe.id}
                                                positions={[
                                                    [pipe.start.lat, pipe.start.lng],
                                                    [pipe.end.lat, pipe.end.lng],
                                                ]}
                                                pathOptions={{
                                                    color: selectedPipes.has(pipe.id)
                                                        ? '#FBBF24'
                                                        : '#FFFF00',
                                                    weight: selectedPipes.has(pipe.id) ? 4 : 2,
                                                    opacity: 0.8,
                                                }}
                                                eventHandlers={{
                                                    click: () => handlePipeClick(pipe.id),
                                                }}
                                            />
                                        ))}

                                    {activeTab === 'zones' && editMode === 'draw' && (
                                        <FeatureGroup ref={featureGroupRef}>
                                            <EditControl
                                                position="topleft"
                                                onCreated={handleZoneCreated}
                                                onEdited={handleZoneEdited}
                                                onDeleted={handleZoneDeleted}
                                                draw={{
                                                    rectangle: true,
                                                    circle: false,
                                                    circlemarker: false,
                                                    marker: false,
                                                    polyline: false,
                                                    polygon: true,
                                                }}
                                                edit={{
                                                    edit: false,
                                                    remove: true,
                                                }}
                                            />
                                        </FeatureGroup>
                                    )}
                                </MapContainer>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 rounded-lg bg-gray-800/80 p-4 text-center">
                    <div className="flex flex-wrap justify-center gap-6 text-sm">
                        <div className="text-blue-400">
                            🗺️ โซน:{' '}
                            <span className="font-bold">
                                {gardenZones.filter((z) => !z.parentZoneId).length}
                            </span>
                            {gardenZones.filter((z) => !!z.parentZoneId).length > 0 && (
                                <span className="ml-1 text-yellow-300">
                                    (+{gardenZones.filter((z) => !!z.parentZoneId).length} ย่อย)
                                </span>
                            )}
                        </div>
                        <div className="text-green-400">
                            💧 หัวฉีด: <span className="font-bold">{sprinklers.length}</span>
                        </div>
                        <div className="text-yellow-400">
                            🚰 แหล่งน้ำ:{' '}
                            <span className="font-bold">{waterSource ? '1' : '0'}</span>
                        </div>
                        {mainPipe && (
                            <div className="text-blue-400">
                                🏗️ ท่อเมน:{' '}
                                <span className="font-bold">
                                    {formatDistance(mainPipe.totalLength)}
                                </span>
                            </div>
                        )}
                        {pipes.filter((p) => p.type === 'submain').length > 0 && (
                            <div className="text-purple-400">
                                🔗 ท่อรอง:{' '}
                                <span className="font-bold">
                                    {pipes.filter((p) => p.type === 'submain').length} เส้น
                                </span>
                            </div>
                        )}
                        {pipes.filter((p) => p.type === 'lateral').length > 0 && (
                            <div className="text-green-400">
                                🔧 ท่อย่อย:{' '}
                                <span className="font-bold">
                                    {pipes.filter((p) => p.type === 'lateral').length} เส้น
                                </span>
                            </div>
                        )}
                        {statistics.coveragePercentage > 0 && (
                            <div className="text-emerald-400">
                                📊 คลุมพื้นที่:{' '}
                                <span className="font-bold">
                                    {statistics.coveragePercentage.toFixed(1)}%
                                </span>
                            </div>
                        )}
                        {manualPipeMode && (
                            <div className="text-orange-400">
                                ⚙️ โหมด:{' '}
                                <span className="font-bold">
                                    {manualPipeMode === 'select-pipes'
                                        ? 'เลือกท่อ'
                                        : 'เชื่อมหัวฉีด'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
