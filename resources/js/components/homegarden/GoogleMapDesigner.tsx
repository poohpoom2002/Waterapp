/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/homegarden/GoogleMapDesigner.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import EnhancedSearchBox from './EnhancedSearchBox';
import {
    Coordinate,
    GardenZone,
    Sprinkler,
    WaterSource,
    Pipe,
    ZONE_TYPES,
    clipCircleToPolygon,
    calculatePolygonArea,
} from '../../utils/homeGardenData';
import { useLanguage } from '../../contexts/LanguageContext';

const getGoogleMapsConfig = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

    return {
        apiKey,
        libraries: ['drawing', 'geometry', 'places'],
        defaultMapOptions: {
            mapTypeId: 'satellite',
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            mapTypeControl: true,
            mapTypeControlOptions: {
                position: 'LEFT_BOTTOM' as any,
                style: 'HORIZONTAL_BAR' as any,
                mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain'],
            },
            restriction: {
                strictBounds: false,
            },
            zoomControlOptions: {
                position: 'RIGHT_CENTER' as any,
            },
            gestureHandling: 'greedy',
            clickableIcons: false,
            scrollwheel: true,
            disableDoubleClickZoom: false,
        },
        defaultZoom: {
            building: 22,
        },
    };
};

interface SearchResult {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
        location?: google.maps.LatLng;
    };
    types: string[];
    rating?: number;
    photos?: unknown[];
}

interface GoogleMapDesignerProps {
    gardenZones: GardenZone[];
    sprinklers: Sprinkler[];
    waterSource: WaterSource | null;
    pipes: Pipe[];
    selectedZoneType: string;
    editMode: string;
    manualSprinklerType: string;
    manualSprinklerRadius: number;
    selectedSprinkler: string | null;
    selectedPipes: Set<string>;
    selectedSprinklersForPipe: string[];
    mainPipeDrawing: Coordinate[];
    onZoneCreated: (e: unknown) => void;
    onZoneDeleted: (e: unknown) => void;
    onSprinklerPlaced: (position: Coordinate) => void;
    onWaterSourcePlaced: (position: Coordinate) => void;
    onMainPipeClick: (e: unknown) => void;
    onSprinklerClick: (sprinklerId: string) => void;
    onSprinklerDelete: (sprinklerId: string) => void;
    onSprinklerDragged: (sprinklerId: string, position: Coordinate) => void;
    onWaterSourceDelete: () => void;
    onPipeClick: (pipeId: string) => void;
    onMapClick: (e: unknown) => void;
    mapCenter: [number, number];
    pipeEditMode?: string;
}

class GoogleMapErrorBoundary extends React.Component<
    { children: React.ReactNode; onFallback?: () => void },
    { hasError: boolean; error?: Error }
> {
    constructor(props: { children: React.ReactNode; onFallback?: () => void }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        console.error('GoogleMapDesigner Error:', error);
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('GoogleMapDesigner Error Details:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-full w-full items-center justify-center bg-gray-900">
                    <div className="max-w-md rounded-lg bg-red-900 p-6 text-center text-white">
                        <div className="mb-4 text-4xl">⚠️</div>
                        <h3 className="mb-2 text-lg font-bold">ไม่สามารถโหลดแผนที่ได้</h3>
                        <p className="mb-4 text-sm text-gray-300">
                            เกิดข้อผิดพลาดในการแสดงแผนที่ Google Maps
                        </p>
                        <div className="space-y-2">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full rounded bg-red-600 px-4 py-2 transition-colors hover:bg-red-700"
                            >
                                โหลดใหม่
                            </button>
                            {this.props.onFallback && (
                                <button
                                    onClick={this.props.onFallback}
                                    className="w-full rounded bg-gray-600 px-4 py-2 transition-colors hover:bg-gray-700"
                                >
                                    ใช้โหมดวาดเอง
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const MapLoadingComponent: React.FC<{ message?: string }> = ({
    message = 'กำลังโหลด Google Maps...',
}) => (
    <div className="flex h-full w-full items-center justify-center bg-gray-900">
        <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
            <p className="text-white">{message}</p>
            <p className="mt-2 text-sm text-gray-400">กรุณารอสักครู่</p>
        </div>
    </div>
);

const MapErrorComponent: React.FC<{
    onRetry?: () => void;
    onFallback?: () => void;
    error?: string;
}> = ({ onRetry, onFallback, error }) => {
    const config = getGoogleMapsConfig();

    const getErrorMessage = () => {
        if (!config.apiKey) {
            return 'ไม่พบ Google Maps API Key กรุณาตั้งค่า VITE_GOOGLE_MAPS_API_KEY ในไฟล์ .env';
        }
        if (error?.includes('ApiProjectMapError')) {
            return 'API Key ไม่ถูกต้องหรือไม่ได้เปิดใช้งาน Google Maps JavaScript API และ Places API';
        }
        if (error?.includes('OVER_QUERY_LIMIT')) {
            return 'เกินขีดจำกัดการใช้งาน Google Maps API กรุณารอสักครู่แล้วลองใหม่';
        }
        if (error?.includes('REQUEST_DENIED')) {
            return 'API Key ถูกปฏิเสธ กรุณาตรวจสอบการตั้งค่าใน Google Cloud Console';
        }
        if (error?.includes('INVALID_REQUEST')) {
            return 'คำขอไม่ถูกต้อง กรุณาตรวจสอบ API Key และการตั้งค่า';
        }
        return 'ไม่สามารถโหลด Google Maps ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
    };

    return (
        <div className="flex h-full w-full items-center justify-center bg-gray-900">
            <div className="max-w-md rounded-lg bg-red-900 p-6 text-center text-white">
                <div className="mb-4 text-4xl">❌</div>
                <h3 className="mb-2 text-lg font-bold">ไม่สามารถโหลด Google Maps ได้</h3>
                <p className="mb-4 text-sm text-gray-300">{getErrorMessage()}</p>
                {!config.apiKey && (
                    <div className="mb-4 rounded bg-yellow-900 p-3 text-left text-xs">
                        <p className="font-bold">วิธีแก้ไข:</p>
                        <ol className="mt-2 list-inside list-decimal space-y-1">
                            <li>หยุด dev server (Ctrl+C)</li>
                            <li>ตรวจสอบไฟล์ .env</li>
                            <li>เพิ่ม VITE_GOOGLE_MAPS_API_KEY</li>
                            <li>เปิดใช้งาน Places API ใน Google Cloud Console</li>
                            <li>รัน npm run dev ใหม่</li>
                        </ol>
                        {import.meta.env.DEV && (
                            <div className="mt-3 rounded bg-gray-800 p-2">
                                <p className="font-bold text-yellow-300">Debug Info:</p>
                                <p className="text-xs">API Key Length: {config.apiKey.length}</p>
                                <p className="text-xs">Environment: {import.meta.env.MODE}</p>
                                <p className="text-xs">Error: {error}</p>
                            </div>
                        )}
                    </div>
                )}
                <div className="space-y-2">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="w-full rounded bg-red-600 px-4 py-2 transition-colors hover:bg-red-700"
                        >
                            ลองใหม่
                        </button>
                    )}
                    {onFallback && (
                        <button
                            onClick={onFallback}
                            className="w-full rounded bg-gray-600 px-4 py-2 transition-colors hover:bg-gray-700"
                        >
                            ใช้โหมดวาดเอง
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const MapComponent: React.FC<{
    center: google.maps.LatLngLiteral;
    zoom: number;
    onLoad?: (map: google.maps.Map) => void;
    children?: React.ReactNode;
}> = ({ center, zoom, onLoad, children }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map>();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (ref.current && !map && window.google?.maps) {
            try {
                const config = getGoogleMapsConfig();

                const mapOptions = {
                    ...config.defaultMapOptions,
                    mapTypeControlOptions: {
                        position: google.maps.ControlPosition.LEFT_BOTTOM,
                        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                        mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain'],
                    },
                    restriction: {
                        strictBounds: false,
                    },
                    zoomControlOptions: {
                        position: google.maps.ControlPosition.RIGHT_CENTER,
                    },
                    tilt: 0,
                    rotateControl: true,
                    scaleControl: true,
                };

                const newMap = new window.google.maps.Map(ref.current, {
                    center,
                    zoom,
                    ...mapOptions,
                });

                newMap.setOptions({
                    minZoom: null,
                    maxZoom: null,
                    restriction: null,
                    zoomControl: true,
                    scrollwheel: true,
                    gestureHandling: 'greedy',
                });

                let isZooming = false;
                const customZoomHandler = (e: WheelEvent) => {
                    if (isZooming) return;
                    isZooming = true;

                    e.preventDefault();
                    e.stopPropagation();

                    const currentZoom = newMap.getZoom() || 10;
                    const delta = e.deltaY > 0 ? -0.5 : 0.5;
                    const newZoom = currentZoom + delta;

                    if (newZoom >= 1 && newZoom <= 50) {
                        newMap.setZoom(newZoom);

                        if (newZoom > 25) {
                            const center = newMap.getCenter();
                            if (center) {
                                setTimeout(() => {
                                    newMap.panTo(center);
                                }, 10);
                            }
                        }
                    }

                    setTimeout(() => {
                        isZooming = false;
                    }, 50);
                };

                const mapContainer = ref.current;
                mapContainer.addEventListener('wheel', customZoomHandler, {
                    passive: false,
                    capture: true,
                });

                newMap.addListener('zoom_changed', () => {
                    const currentZoom = newMap.getZoom();
                    if (currentZoom && currentZoom > 25) {
                        newMap.setOptions({
                            minZoom: null,
                            maxZoom: null,
                        });
                    }
                });

                setMap(newMap);
                onLoad?.(newMap);
                setError(null);
            } catch (error) {
                console.error('Error creating Google Map:', error);
                setError(error instanceof Error ? error.message : 'Unknown error');
            }
        }
    }, [ref, map, center, zoom, onLoad]);

    if (error) {
        return <MapErrorComponent error={error} />;
    }

    return (
        <>
            <div ref={ref} style={{ width: '100%', height: '100%' }} />
            {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, { map } as any);
                }
                return child;
            })}
        </>
    );
};

const DrawingManager: React.FC<{
    map?: google.maps.Map;
    editMode: string;
    selectedZoneType: string;
    onZoneCreated: (coordinates: Coordinate[]) => void;
    onMapClick: (e: unknown) => void;
}> = ({ map, editMode, selectedZoneType, onZoneCreated, onMapClick }) => {
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager>();

    useEffect(() => {
        if (!map || !window.google?.maps?.drawing) return;

        if (drawingManagerRef.current) {
            drawingManagerRef.current.setMap(null);
        }

        const zoneType = ZONE_TYPES.find((z) => z.id === selectedZoneType);

        try {
            const drawingManager = new google.maps.drawing.DrawingManager({
                drawingMode: editMode === 'draw' ? google.maps.drawing.OverlayType.POLYGON : null,
                drawingControl: editMode === 'draw',
                drawingControlOptions: {
                    position: google.maps.ControlPosition.TOP_CENTER,
                    drawingModes: [
                        google.maps.drawing.OverlayType.POLYGON,
                        google.maps.drawing.OverlayType.RECTANGLE,
                        google.maps.drawing.OverlayType.CIRCLE,
                    ],
                },
                polygonOptions: {
                    fillColor: zoneType?.color || '#666666',
                    fillOpacity: 0.3,
                    strokeWeight: 2,
                    editable: true,
                    draggable: true,
                    strokeColor: zoneType?.color || '#666666',
                },
                rectangleOptions: {
                    fillColor: zoneType?.color || '#666666',
                    fillOpacity: 0.3,
                    strokeWeight: 2,
                    editable: true,
                    draggable: true,
                    strokeColor: zoneType?.color || '#666666',
                },
                circleOptions: {
                    fillColor: zoneType?.color || '#666666',
                    fillOpacity: 0.3,
                    strokeWeight: 2,
                    editable: true,
                    draggable: true,
                    strokeColor: zoneType?.color || '#666666',
                },
            });

            drawingManager.setMap(map);
            drawingManagerRef.current = drawingManager;

            // Helper function to convert rectangle to polygon coordinates
            const rectangleToPolygon = (rectangle: google.maps.Rectangle): Coordinate[] => {
                const bounds = rectangle.getBounds();
                if (!bounds) return [];

                const ne = bounds.getNorthEast();
                const sw = bounds.getSouthWest();

                return [
                    { lat: ne.lat(), lng: sw.lng() }, // top-left
                    { lat: ne.lat(), lng: ne.lng() }, // top-right
                    { lat: sw.lat(), lng: ne.lng() }, // bottom-right
                    { lat: sw.lat(), lng: sw.lng() }, // bottom-left
                ];
            };

            // Helper function to convert circle to polygon coordinates
            const circleToPolygon = (circle: google.maps.Circle): Coordinate[] => {
                const center = circle.getCenter();
                const radius = circle.getRadius();
                if (!center || !radius) return [];

                const coordinates: Coordinate[] = [];
                const numPoints = 32; // Number of points to approximate circle

                for (let i = 0; i < numPoints; i++) {
                    const angle = (i * 2 * Math.PI) / numPoints;
                    const lat = center.lat() + (radius / 111000) * Math.cos(angle);
                    const lng =
                        center.lng() +
                        (radius / (111000 * Math.cos((center.lat() * Math.PI) / 180))) *
                            Math.sin(angle);
                    coordinates.push({ lat, lng });
                }

                return coordinates;
            };

            const polygonCompleteListener = drawingManager.addListener(
                'polygoncomplete',
                (polygon: google.maps.Polygon) => {
                    try {
                        const path = polygon.getPath();
                        const coordinates: Coordinate[] = [];

                        for (let i = 0; i < path.getLength(); i++) {
                            const latLng = path.getAt(i);
                            coordinates.push({ lat: latLng.lat(), lng: latLng.lng() });
                        }

                        onZoneCreated(coordinates);
                        polygon.setMap(null);
                    } catch (error) {
                        console.error('Error creating zone from polygon:', error);
                    }
                }
            );

            const rectangleCompleteListener = drawingManager.addListener(
                'rectanglecomplete',
                (rectangle: google.maps.Rectangle) => {
                    try {
                        const coordinates = rectangleToPolygon(rectangle);
                        onZoneCreated(coordinates);
                        rectangle.setMap(null);
                    } catch (error) {
                        console.error('Error creating zone from rectangle:', error);
                    }
                }
            );

            const circleCompleteListener = drawingManager.addListener(
                'circlecomplete',
                (circle: google.maps.Circle) => {
                    try {
                        const coordinates = circleToPolygon(circle);
                        onZoneCreated(coordinates);
                        circle.setMap(null);
                    } catch (error) {
                        console.error('Error creating zone from circle:', error);
                    }
                }
            );

            const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
                if (editMode !== 'draw' && e.latLng) {
                    onMapClick({
                        latlng: {
                            lat: e.latLng.lat(),
                            lng: e.latLng.lng(),
                        },
                    });
                }
            });

            return () => {
                if (drawingManagerRef.current) {
                    drawingManagerRef.current.setMap(null);
                }
                google.maps.event.removeListener(polygonCompleteListener);
                google.maps.event.removeListener(rectangleCompleteListener);
                google.maps.event.removeListener(circleCompleteListener);
                google.maps.event.removeListener(clickListener);
            };
        } catch (error) {
            console.error('Error creating DrawingManager:', error);
        }
    }, [map, editMode, selectedZoneType, onZoneCreated, onMapClick]);

    return null;
};

const isPointInPolygon = (point: Coordinate, polygon: Coordinate[]): boolean => {
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
};

const ClippedSprinklerCoverage: React.FC<{
    map?: google.maps.Map;
    center: Coordinate;
    radius: number;
    zoneCoordinates: Coordinate[];
    color: string;
    isSelected: boolean;
    sprinklerId: string;
    zoneType: string;
}> = ({ map, center, radius, zoneCoordinates, color, isSelected, sprinklerId, zoneType }) => {
    const overlayRef = useRef<google.maps.MVCObject[]>([]);
    const [isStable, setIsStable] = useState(false);

    useEffect(() => {
        if (!map || !window.google?.maps) return;

        const timer = setTimeout(() => {
            setIsStable(true);
        }, 100);

        return () => clearTimeout(timer);
    }, [map]);

    useEffect(() => {
        if (!map || !window.google?.maps || !isStable) return;

        overlayRef.current.forEach((overlay) => {
            try {
                if ('setMap' in overlay) {
                    (overlay as any).setMap(null);
                }
            } catch (e) {
                console.warn('Error cleaning overlay:', e);
            }
        });
        overlayRef.current = [];

        if (zoneType === 'forbidden') {
            return;
        }

        try {
            const result = clipCircleToPolygon(center, radius, zoneCoordinates);
            const selectedColor = isSelected ? '#FFD700' : color;

            if (result === 'FULL_CIRCLE') {
                const circle = new google.maps.Circle({
                    center: { lat: center.lat, lng: center.lng },
                    radius: radius,
                    fillColor: selectedColor,
                    fillOpacity: isSelected ? 0.15 : 0.1,
                    strokeColor: selectedColor,
                    strokeOpacity: isSelected ? 1.0 : 0.8,
                    strokeWeight: 2,
                    map: map,
                    clickable: false,
                });
                overlayRef.current.push(circle);
            } else if (result === 'MASKED_CIRCLE') {
                // Create a more precise clipped circle using intersection points
                const intersectionPoints: Coordinate[] = [];
                const numCirclePoints = 128; // Increased precision

                // Add circle points that are inside the zone
                for (let i = 0; i < numCirclePoints; i++) {
                    const angle = (i * 2 * Math.PI) / numCirclePoints;
                    const lat = center.lat + (radius / 111000) * Math.cos(angle);
                    const lng =
                        center.lng +
                        (radius / (111000 * Math.cos((center.lat * Math.PI) / 180))) *
                            Math.sin(angle);
                    const circlePoint = { lat, lng };

                    if (isPointInPolygon(circlePoint, zoneCoordinates)) {
                        intersectionPoints.push(circlePoint);
                    }
                }

                // Add zone vertices that are within the circle radius
                zoneCoordinates.forEach((vertex) => {
                    const distance = Math.sqrt(
                        Math.pow((vertex.lat - center.lat) * 111000, 2) +
                            Math.pow(
                                (vertex.lng - center.lng) *
                                    111000 *
                                    Math.cos((center.lat * Math.PI) / 180),
                                2
                            )
                    );
                    if (distance <= radius) {
                        intersectionPoints.push(vertex);
                    }
                });

                // Find intersection points between circle and line segment
                for (let i = 0; i < zoneCoordinates.length; i++) {
                    const edgeStart = zoneCoordinates[i];
                    const edgeEnd = zoneCoordinates[(i + 1) % zoneCoordinates.length];

                    // Calculate intersection points between circle and line segment
                    const intersections = getCircleLineIntersectionsGPS(
                        center,
                        radius,
                        edgeStart,
                        edgeEnd
                    );
                    intersectionPoints.push(...intersections);
                }

                if (intersectionPoints.length >= 3) {
                    // Remove duplicate points
                    const uniquePoints = removeDuplicatePointsGPS(intersectionPoints);

                    if (uniquePoints.length >= 3) {
                        // Sort points clockwise around the center
                        const centroidLat =
                            uniquePoints.reduce((sum, p) => sum + p.lat, 0) / uniquePoints.length;
                        const centroidLng =
                            uniquePoints.reduce((sum, p) => sum + p.lng, 0) / uniquePoints.length;

                        uniquePoints.sort((a, b) => {
                            const angleA = Math.atan2(a.lat - centroidLat, a.lng - centroidLng);
                            const angleB = Math.atan2(b.lat - centroidLat, b.lng - centroidLng);
                            return angleA - angleB;
                        });

                        const polygon = new google.maps.Polygon({
                            paths: uniquePoints.map((p) => ({ lat: p.lat, lng: p.lng })),
                            fillColor: selectedColor,
                            fillOpacity: isSelected ? 0.3 : 0.2,
                            strokeColor: selectedColor,
                            strokeOpacity: isSelected ? 0.8 : 0.6,
                            strokeWeight: 2,
                            map: map,
                            clickable: false,
                        });
                        overlayRef.current.push(polygon);
                    } else {
                        // Fallback to simple circle if not enough points
                        const circle = new google.maps.Circle({
                            center: { lat: center.lat, lng: center.lng },
                            radius: radius,
                            fillColor: selectedColor,
                            fillOpacity: isSelected ? 0.15 : 0.1,
                            strokeColor: selectedColor,
                            strokeOpacity: isSelected ? 0.6 : 0.4,
                            strokeWeight: 1,
                            map: map,
                            clickable: false,
                        });
                        overlayRef.current.push(circle);
                    }
                } else {
                    // No intersection points, don't show anything
                    return;
                }
            } else if (Array.isArray(result) && result.length >= 3) {
                const coordinates = result as Coordinate[];
                const polygon = new google.maps.Polygon({
                    paths: coordinates.map((p) => ({ lat: p.lat, lng: p.lng })),
                    fillColor: selectedColor,
                    fillOpacity: isSelected ? 0.3 : 0.2,
                    strokeColor: selectedColor,
                    strokeOpacity: isSelected ? 0.8 : 0.6,
                    strokeWeight: 2,
                    map: map,
                    clickable: false,
                });
                overlayRef.current.push(polygon);
            } else {
                // No coverage, don't show anything
                return;
            }
        } catch (error) {
            console.error(`Error creating clipped sprinkler coverage for ${sprinklerId}:`, error);
            // Don't show fallback circle to ensure strict zone boundaries
        }

        return () => {
            overlayRef.current.forEach((overlay) => {
                try {
                    if ('setMap' in overlay) {
                        (overlay as any).setMap(null);
                    }
                } catch (e) {
                    console.warn('Error cleaning overlay on unmount:', e);
                }
            });
            overlayRef.current = [];
        };
    }, [map, center, radius, zoneCoordinates, color, isSelected, sprinklerId, zoneType, isStable]);

    return null;
};

// Helper function to find intersection points between circle and line segment in GPS coordinates
function getCircleLineIntersectionsGPS(
    center: Coordinate,
    radius: number,
    lineStart: Coordinate,
    lineEnd: Coordinate
): Coordinate[] {
    const centerLat = (center.lat * Math.PI) / 180;
    const metersPerDegreeLat =
        111132.92 - 559.82 * Math.cos(2 * centerLat) + 1.175 * Math.cos(4 * centerLat);
    const metersPerDegreeLng = 111412.84 * Math.cos(centerLat) - 93.5 * Math.cos(3 * centerLat);

    const radiusInDegreesLat = radius / metersPerDegreeLat;
    const radiusInDegreesLng = radius / metersPerDegreeLng;

    const dx = lineEnd.lng - lineStart.lng;
    const dy = lineEnd.lat - lineStart.lat;
    const fx = lineStart.lng - center.lng;
    const fy = lineStart.lat - center.lat;

    // Use average radius for calculations
    const avgRadius = (radiusInDegreesLat + radiusInDegreesLng) / 2;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - avgRadius * avgRadius;

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
        return [];
    }

    const discriminantSqrt = Math.sqrt(discriminant);
    const t1 = (-b - discriminantSqrt) / (2 * a);
    const t2 = (-b + discriminantSqrt) / (2 * a);

    const intersections: Coordinate[] = [];

    if (t1 >= 0 && t1 <= 1) {
        intersections.push({
            lat: lineStart.lat + t1 * dy,
            lng: lineStart.lng + t1 * dx,
        });
    }

    if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 0.0001) {
        intersections.push({
            lat: lineStart.lat + t2 * dy,
            lng: lineStart.lng + t2 * dx,
        });
    }

    return intersections;
}

// Helper function to remove duplicate points in GPS coordinates
function removeDuplicatePointsGPS(points: Coordinate[]): Coordinate[] {
    const uniquePoints: Coordinate[] = [];
    const tolerance = 0.000001; // About 1 meter in degrees

    for (const point of points) {
        const isDuplicate = uniquePoints.some(
            (existing) =>
                Math.abs(existing.lat - point.lat) < tolerance &&
                Math.abs(existing.lng - point.lng) < tolerance
        );
        if (!isDuplicate) {
            uniquePoints.push(point);
        }
    }

    return uniquePoints;
}

const GoogleMapDesignerContent: React.FC<GoogleMapDesignerProps & { map?: google.maps.Map }> = (
    props
) => {
    const { t } = useLanguage();
    const overlaysRef = useRef<Map<string, google.maps.MVCObject>>(new Map());
    const [mapCenter, setMapCenter] = useState<[number, number]>(props.mapCenter);
    const [isDragging, setIsDragging] = useState(false);
    const [isMapStable, setIsMapStable] = useState(false);

    const clearOverlays = useCallback(() => {
        overlaysRef.current.forEach((overlay) => {
            try {
                if ('setMap' in overlay) {
                    (overlay as any).setMap(null);
                }
            } catch (e) {
                console.warn('Error cleaning overlay:', e);
            }
        });
        overlaysRef.current.clear();
    }, []);

    const handlePlaceSelect = useCallback(
        (place: SearchResult) => {
            if (place.geometry && place.geometry.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();

                setMapCenter([lat, lng]);

                if (props.map) {
                    props.map.setCenter({ lat, lng });
                    props.map.setZoom(22);
                }
            }
        },
        [props.map]
    );

    const handleSearchClear = useCallback(() => {}, []);

    const coverageStats = React.useMemo(() => {
        let totalCoveredArea = 0;
        let totalZoneArea = 0;
        const zoneStats: { [key: string]: { covered: number; total: number; efficiency: number } } =
            {};

        props.gardenZones.forEach((zone) => {
            if (
                zone.type === 'forbidden' ||
                zone.parentZoneId ||
                !zone.coordinates ||
                zone.coordinates.length < 3
            ) {
                return;
            }

            const zoneArea = calculatePolygonArea(zone.coordinates);
            totalZoneArea += zoneArea;

            const zoneSprinklers = props.sprinklers.filter((s) => s.zoneId === zone.id);
            let coveredArea = 0;

            const cellSize = 0.5;
            const cellsPerMeter = 1 / cellSize;
            const coverageGrid = new Set<string>();

            zoneSprinklers.forEach((sprinkler) => {
                const radiusInCells = Math.ceil(sprinkler.type.radius * cellsPerMeter);

                for (let dx = -radiusInCells; dx <= radiusInCells; dx++) {
                    for (let dy = -radiusInCells; dy <= radiusInCells; dy++) {
                        const distance = Math.sqrt(dx * dx + dy * dy) * cellSize;
                        if (distance <= sprinkler.type.radius) {
                            const lat = sprinkler.position.lat + (dy * cellSize) / 111000;
                            const lng =
                                sprinkler.position.lng +
                                (dx * cellSize) /
                                    (111000 * Math.cos((sprinkler.position.lat * Math.PI) / 180));

                            if (isPointInPolygon({ lat, lng }, zone.coordinates)) {
                                const cellKey = `${Math.floor(lat / cellSize)}:${Math.floor(lng / cellSize)}`;
                                coverageGrid.add(cellKey);
                            }
                        }
                    }
                }
            });

            coveredArea = coverageGrid.size * cellSize * cellSize;
            totalCoveredArea += coveredArea;

            const efficiency = zoneArea > 0 ? (coveredArea / zoneArea) * 100 : 0;
            zoneStats[zone.id] = {
                covered: coveredArea,
                total: zoneArea,
                efficiency: Math.min(100, efficiency),
            };
        });

        const overallEfficiency = totalZoneArea > 0 ? (totalCoveredArea / totalZoneArea) * 100 : 0;

        return {
            totalCovered: totalCoveredArea,
            totalArea: totalZoneArea,
            overallEfficiency: Math.min(100, overallEfficiency),
            zoneStats,
        };
    }, [props.gardenZones, props.sprinklers]);

    const createSprinklerIcon = useCallback(
        (
            sprinkler: Sprinkler,
            isSelected: boolean = false,
            orientation?: number
        ): google.maps.Symbol => {
            return {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: isSelected ? '#FFD700' : sprinkler.type.color || '#33CCFF',
                fillOpacity: 0.9,
                strokeColor: '#FFFFFF',
                strokeWeight: isSelected ? 3 : 2,
                scale: isSelected ? 6 : 4,
                rotation: orientation || 0,
            };
        },
        []
    );

    const createWaterSourceIcon = useCallback((type: 'main' | 'pump'): google.maps.Icon => {
        return {
            url: '/images/water-pump.png',
            scaledSize: new google.maps.Size(28, 28),
            anchor: new google.maps.Point(14, 14),
        };
    }, []);

    useEffect(() => {
        if (props.map) {
            const timer = setTimeout(() => {
                setIsMapStable(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [props.map]);

    useEffect(() => {
        if (!props.map || !window.google?.maps || !isMapStable) return;

        const timer = setTimeout(
            () => {
                clearOverlays();

                try {
                    props.gardenZones?.forEach((zone) => {
                        if (!zone.coordinates || zone.coordinates.length < 3) return;

                        try {
                            const zoneType = ZONE_TYPES.find((z) => z.id === zone.type);
                            const isNestedZone = !!zone.parentZoneId;

                            const polygon = new google.maps.Polygon({
                                paths: zone.coordinates.map((c) => ({ lat: c.lat, lng: c.lng })),
                                fillColor: zoneType?.color || '#666',
                                fillOpacity:
                                    zone.type === 'forbidden' ? 0.5 : isNestedZone ? 0.6 : 0.25,
                                strokeColor: zoneType?.color || '#666',
                                strokeOpacity: 1,
                                strokeWeight: isNestedZone ? 3 : 2,
                                map: props.map,
                                clickable: false,
                            });

                            overlaysRef.current.set(`zone-${zone.id}`, polygon);
                        } catch (error) {
                            console.error(`Error rendering zone ${zone.id}:`, error);
                        }
                    });

                    // Disabled: Main pipe drawing - redundant with auto-generated pipes
                    // This prevents overlapping lines that confuse users
                    /*
                    if (props.mainPipeDrawing.length > 0) {
                        try {
                            const polyline = new google.maps.Polyline({
                                path: props.mainPipeDrawing.map((p) => ({
                                    lat: p.lat,
                                    lng: p.lng,
                                })),
                                strokeColor: '#60A5FA',
                                strokeWeight: 8,
                                strokeOpacity: 0.8,
                                map: props.map,
                                clickable: false,
                            });
                            overlaysRef.current.set('main-pipe-drawing', polyline);
                        } catch (error) {
                            console.error('Error rendering main pipe drawing:', error);
                        }
                    }

                    if (props.mainPipeDrawing.length >= 2) {
                        try {
                            const polyline = new google.maps.Polyline({
                                path: props.mainPipeDrawing.map((p) => ({
                                    lat: p.lat,
                                    lng: p.lng,
                                })),
                                strokeColor: '#3B82F6',
                                strokeWeight: 10,
                                strokeOpacity: 0.9,
                                map: props.map,
                                clickable: false,
                            });
                            overlaysRef.current.set('main-pipe', polyline);
                        } catch (error) {
                            console.error('Error rendering main pipe:', error);
                        }
                    }
                    */

                    // Sort pipes to render selected pipes with higher z-index (on top)
                    const sortedPipes = props.pipes
                        ?.filter((p) => p.type === 'pipe')
                        .sort((a, b) => {
                            const aSelected = props.selectedPipes.has(a.id);
                            const bSelected = props.selectedPipes.has(b.id);
                            if (aSelected && !bSelected) return 1; // Draw selected pipes last
                            if (!aSelected && bSelected) return -1; // Draw non-selected pipes first
                            return 0; // Keep original order for pipes with same selection state
                        });

                    sortedPipes?.forEach((pipe, index) => {
                        try {
                            const isSelected = props.selectedPipes.has(pipe.id);
                            const polyline = new google.maps.Polyline({
                                path: [
                                    { lat: pipe.start.lat, lng: pipe.start.lng },
                                    { lat: pipe.end.lat, lng: pipe.end.lng },
                                ],
                                strokeColor: isSelected ? '#FBBF24' : '#8B5CF6',
                                strokeWeight: isSelected ? 8 : 6,
                                strokeOpacity: 0.9,
                                map: props.map,
                                clickable: true,
                                zIndex: isSelected ? 1000 + index : 100 + index, // Higher z-index for selected pipes
                            });

                            polyline.addListener('click', () => {
                                props.onPipeClick(pipe.id);
                            });
                            overlaysRef.current.set(`pipe-${pipe.id}`, polyline);
                        } catch (error) {
                            console.error(`Error rendering pipe ${pipe.id}:`, error);
                        }
                    });

                    props.sprinklers?.forEach((sprinkler) => {
                        if (!sprinkler.position) return;
                        try {
                            const isSelected =
                                props.selectedSprinkler === sprinkler.id ||
                                props.selectedSprinklersForPipe.includes(sprinkler.id);

                            const marker = new google.maps.Marker({
                                position: {
                                    lat: sprinkler.position.lat,
                                    lng: sprinkler.position.lng,
                                },
                                icon: createSprinklerIcon(
                                    sprinkler,
                                    isSelected,
                                    sprinkler.orientation
                                ),
                                title: `หัวฉีด: ${sprinkler.type.nameTH} (รัศมี ${sprinkler.type.radius}ม.)`,
                                draggable: props.editMode === 'drag-sprinkler',
                                map: props.map,
                            });

                            marker.addListener('click', () => {
                                if (
                                    props.pipeEditMode === 'add' ||
                                    props.pipeEditMode === 'remove'
                                ) {
                                    props.onSprinklerClick(sprinkler.id);
                                } else {
                                    props.onSprinklerClick(sprinkler.id);
                                }
                            });

                            marker.addListener('rightclick', () => {
                                props.onSprinklerDelete(sprinkler.id);
                            });

                            if (props.editMode === 'drag-sprinkler') {
                                marker.addListener('dragstart', () => {
                                    setIsDragging(true);
                                });

                                marker.addListener('drag', (e: google.maps.MapMouseEvent) => {
                                    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                                    e.latLng;
                                });

                                marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
                                    setIsDragging(false);
                                    if (e.latLng) {
                                        const newPosition = {
                                            lat: e.latLng.lat(),
                                            lng: e.latLng.lng(),
                                        };
                                        props.onSprinklerDragged(sprinkler.id, newPosition);
                                    }
                                });
                            }

                            overlaysRef.current.set(`sprinkler-${sprinkler.id}`, marker);
                        } catch (error) {
                            console.error(`Error rendering sprinkler ${sprinkler.id}:`, error);
                        }
                    });

                    if (props.waterSource?.position) {
                        try {
                            const marker = new google.maps.Marker({
                                position: {
                                    lat: props.waterSource.position.lat,
                                    lng: props.waterSource.position.lng,
                                },
                                icon: createWaterSourceIcon(props.waterSource.type),
                                title: `แหล่งน้ำ: ${props.waterSource.type === 'pump' ? 'ปั๊มน้ำ' : 'ท่อเมน'}`,
                                draggable: false,
                                map: props.map,
                            });
                            marker.addListener('rightclick', () => {
                                props.onWaterSourceDelete();
                            });
                            overlaysRef.current.set('water-source', marker);
                        } catch (error) {
                            console.error('Error rendering water source:', error);
                        }
                    }
                } catch (error) {
                    console.error('Error rendering map overlays:', error);
                }
            },
            isDragging ? 100 : 50
        );

        return () => {
            clearTimeout(timer);
            clearOverlays();
        };
    }, [
        props.map,
        props.gardenZones,
        props.sprinklers,
        props.waterSource,
        props.pipes,
        props.mainPipeDrawing,
        props.selectedSprinkler,
        props.selectedSprinklersForPipe,
        props.selectedPipes,
        props.editMode,
        props.pipeEditMode,
        clearOverlays,
        createSprinklerIcon,
        createWaterSourceIcon,
        props.onSprinklerClick,
        props.onSprinklerDelete,
        props.onSprinklerDragged,
        props.onWaterSourceDelete,
        props.onPipeClick,
        isDragging,
        isMapStable,
        props,
    ]);

    return (
        <>
            <EnhancedSearchBox
                onPlaceSelect={handlePlaceSelect}
                onClear={handleSearchClear}
                placeholder="🔍 ค้นหาสถานที่... (เช่น บ้านเลขที่, ถนน, ตำบล, อำเภอ, จังหวัด)"
            />

            <DrawingManager
                map={props.map}
                editMode={props.editMode}
                selectedZoneType={props.selectedZoneType}
                onZoneCreated={(coordinates) =>
                    props.onZoneCreated({
                        layer: {
                            getLatLngs: () => [
                                coordinates.map((c) => ({ lat: c.lat, lng: c.lng })),
                            ],
                        },
                    })
                }
                onMapClick={props.onMapClick}
            />

            {isMapStable &&
                !isDragging &&
                props.sprinklers?.map((sprinkler) => {
                    if (!sprinkler.position) return null;

                    const zone = props.gardenZones?.find((z) => z.id === sprinkler.zoneId);
                    if (!zone || !zone.coordinates || zone.coordinates.length < 3) return null;

                    const isSelected =
                        props.selectedSprinkler === sprinkler.id ||
                        props.selectedSprinklersForPipe.includes(sprinkler.id);

                    return (
                        <div key={`${sprinkler.id}-container`}>
                            <ClippedSprinklerCoverage
                                key={`${sprinkler.id}-coverage`}
                                map={props.map}
                                center={sprinkler.position}
                                radius={sprinkler.type.radius}
                                zoneCoordinates={zone.coordinates}
                                color={sprinkler.type.color}
                                isSelected={isSelected}
                                sprinklerId={sprinkler.id}
                                zoneType={zone.type}
                            />
                            {/* Clickable sprinkler marker for pipe editing */}
                            {(props.pipeEditMode === 'add' || props.pipeEditMode === 'remove') && (
                                <div
                                    className="absolute cursor-pointer"
                                    style={{
                                        left: `${sprinkler.position.lng}%`,
                                        top: `${sprinkler.position.lat}%`,
                                        width: '20px',
                                        height: '20px',
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: 1000,
                                    }}
                                    onClick={() => props.onSprinklerClick(sprinkler.id)}
                                >
                                    <div className="h-full w-full rounded-full border-2 border-white bg-blue-500 shadow-lg"></div>
                                </div>
                            )}
                        </div>
                    );
                })}

            {/* UI Instructions */}
            {props.editMode === 'drag-sprinkler' && (
                <div className="absolute bottom-4 left-4 rounded-lg border border-orange-500 bg-gray-800/90 p-4 text-sm text-white backdrop-blur">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-orange-400">↔️</span>
                        <span className="font-semibold">{t('โหมดย้ายหัวฉีด')}</span>
                    </div>
                    <div>🖱️ {t('ลากหัวฉีดเพื่อย้ายตำแหน่ง')}</div>
                    <div>🖱️ {t('คลิกขวาเพื่อลบหัวฉีด')}</div>
                    <div className="text-xs text-gray-300">
                        🔍 {t('ใช้ล้อเมาส์เพื่อซูม')} • {t('ลากเพื่อเลื่อนแผนที่')}
                    </div>
                </div>
            )}

            {props.editMode === 'place' && (
                <div className="absolute bottom-4 left-4 rounded-lg border border-green-500 bg-gray-800/90 p-4 text-sm text-white backdrop-blur">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-green-400">💧</span>
                        <span className="font-semibold">{t('โหมดวางหัวฉีด')}</span>
                    </div>
                    <div>🎯 {t('คลิกเพื่อวางหัวฉีด')}</div>
                    <div className="mt-1 text-xs text-gray-300">
                        {t('รัศมี:')} {props.manualSprinklerRadius}
                        {t('ม.')} • 🔍 {t('ใช้ล้อเมาส์เพื่อซูม')} • {t('ลากเพื่อเลื่อนแผนที่')}
                    </div>
                </div>
            )}

            {props.editMode === 'edit' && (
                <div className="absolute bottom-4 left-4 rounded-lg border border-yellow-500 bg-gray-800/90 p-4 text-sm text-white backdrop-blur">
                    <div className="mb-2 flex items-center gap-2">
                        <img
                            src="/images/water-pump.png"
                            alt="Water Pump"
                            className="h-4 w-4 object-contain"
                        />
                        <span className="font-semibold">{t('โหมดจัดการแหล่งน้ำ')}</span>
                    </div>
                    <div>🎯 {t('คลิกเพื่อวางแหล่งน้ำ')}</div>
                    <div>🖱️ {t('คลิกขวาบนแหล่งน้ำเพื่อลบ')}</div>
                    <div className="text-xs text-gray-300">
                        🔍 {t('ใช้ล้อเมาส์เพื่อซูม')} • {t('ลากเพื่อเลื่อนแผนที่')}
                    </div>
                </div>
            )}

            {(props.pipeEditMode === 'add' || props.pipeEditMode === 'remove') && (
                <div className="absolute bottom-12 left-4 rounded-lg border border-purple-500 bg-gray-800/90 p-4 text-sm text-white backdrop-blur">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-purple-400">🔧</span>
                        <span className="font-semibold">
                            {props.pipeEditMode === 'add' ? t('เพิ่มท่อ') : t('ลบท่อ')}
                        </span>
                    </div>
                    <div>
                        {props.pipeEditMode === 'add'
                            ? `🎯 ${t('เลือกหัวฉีด 2 ตัวเพื่อเชื่อมต่อ')} (${props.selectedSprinklersForPipe.length}/2)`
                            : `🎯 ${t('เลือกหัวฉีด 2 ตัวเพื่อลบท่อ')} (${props.selectedSprinklersForPipe.length}/2)`}
                    </div>
                    <div className="text-xs text-gray-300">
                        🔍 {t('ใช้ล้อเมาส์เพื่อซูม')} • {t('ลากเพื่อเลื่อนแผนที่')}
                    </div>
                </div>
            )}
        </>
    );
};

const renderMap = (status: Status): React.ReactElement => {
    switch (status) {
        case Status.LOADING:
            return <MapLoadingComponent />;
        case Status.FAILURE:
            return (
                <MapErrorComponent
                    onRetry={() => window.location.reload()}
                    onFallback={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set('mode', 'canvas');
                        window.location.href = url.toString();
                    }}
                />
            );
        case Status.SUCCESS:
            return <div style={{ width: '100%', height: '100%' }} />;
        default:
            return <MapLoadingComponent />;
    }
};

const GoogleMapDesigner: React.FC<GoogleMapDesignerProps> = (props) => {
    const config = getGoogleMapsConfig();

    useEffect(() => {
        if (!config.apiKey) {
            console.error(
                '❌ Google Maps API Key is missing. Please set VITE_GOOGLE_MAPS_API_KEY in .env file'
            );
        } else {
            console.log('✅ Google Maps API Key found');
        }
    }, [config.apiKey]);

    if (!config.apiKey) {
        return (
            <MapErrorComponent
                onRetry={() => window.location.reload()}
                onFallback={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('mode', 'canvas');
                    window.location.href = url.toString();
                }}
            />
        );
    }

    return (
        <GoogleMapErrorBoundary
            onFallback={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('mode', 'canvas');
                window.location.href = url.toString();
            }}
        >
            <Wrapper
                apiKey={config.apiKey}
                render={renderMap}
                libraries={config.libraries as any}
                version="weekly"
            >
                <MapComponent
                    center={{ lat: props.mapCenter[0], lng: props.mapCenter[1] }}
                    zoom={config.defaultZoom.building}
                >
                    <GoogleMapDesignerContent {...props} />
                </MapComponent>
            </Wrapper>
        </GoogleMapErrorBoundary>
    );
};

export default GoogleMapDesigner;
