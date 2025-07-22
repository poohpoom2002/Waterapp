// components/homegarden/GoogleMapSummary.tsx - Updated to show uniform pipes
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import {
    Coordinate,
    GardenPlannerData,
    ZONE_TYPES,
    clipCircleToPolygon,
    isCornerSprinkler,
} from '../../utils/homeGardenData';

const getGoogleMapsConfig = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

    console.log('🗺️ Google Maps Summary Config:', {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey.length,
    });

    return {
        apiKey,
        libraries: ['drawing', 'geometry', 'places'],
        performanceStyles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
            },
            {
                featureType: 'transit',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
            },
        ],
        summaryMapOptions: {
            mapTypeId: 'satellite',
            disableDefaultUI: true,
            zoomControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            mapTypeControl: true,
            mapTypeControlOptions: {
                position: 'LEFT_BOTTOM' as any,
                style: 'HORIZONTAL_BAR' as any,
                mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain'],
            },
            gestureHandling: 'none',
            draggable: false,
            scrollwheel: false,
            disableDoubleClickZoom: true,
            clickableIcons: false,
            minZoom: 1,
        },
    };
};

interface GoogleMapSummaryProps {
    gardenData: GardenPlannerData;
    mapCenter: [number, number];
    calculateZoomLevel: number;
}

class SummaryErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        console.error('GoogleMapSummary Error:', error);
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('GoogleMapSummary Error Details:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-full w-full items-center justify-center bg-gray-900">
                    <div className="text-center text-white">
                        <div className="mb-4 text-4xl">⚠️</div>
                        <h3 className="mb-4 text-lg font-bold">ไม่สามารถแสดงแผนที่สรุปผลได้</h3>
                        <p className="mb-4 text-sm text-gray-400">
                            กรุณาตรวจสอบการตั้งค่า Google Maps API
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded bg-blue-600 px-4 py-2 transition-colors hover:bg-blue-700"
                        >
                            โหลดใหม่
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const SummaryLoadingComponent: React.FC = () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-900">
        <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
            <p className="text-white">กำลังโหลดสรุปผล...</p>
            <p className="mt-1 text-xs text-gray-400">กำลังสร้างแผนที่...</p>
        </div>
    </div>
);

const SummaryErrorComponent: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
    const config = getGoogleMapsConfig();

    return (
        <div className="flex h-full w-full items-center justify-center bg-gray-900">
            <div className="max-w-md rounded-lg bg-red-900 p-6 text-center text-white">
                <div className="mb-4 text-4xl">❌</div>
                <h3 className="mb-2 text-lg font-bold">ไม่สามารถโหลดแผนที่สรุปผลได้</h3>
                <p className="mb-4 text-sm text-gray-300">
                    {!config.apiKey
                        ? 'ไม่พบ Google Maps API Key'
                        : 'เกิดข้อผิดพลาดในการเชื่อมต่อ Google Maps'}
                </p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="w-full rounded bg-red-600 px-4 py-2 transition-colors hover:bg-red-700"
                    >
                        ลองใหม่
                    </button>
                )}
            </div>
        </div>
    );
};

const SummaryMapComponent: React.FC<{
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

                const summaryMapOptions = {
                    ...config.summaryMapOptions,
                    mapTypeId: google.maps.MapTypeId.SATELLITE,
                    mapTypeControlOptions: {
                        position: google.maps.ControlPosition.LEFT_BOTTOM,
                        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                        mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain'],
                    },
                    minZoom: 1,
                };

                const newMap = new window.google.maps.Map(ref.current, {
                    center,
                    zoom: zoom,
                    ...summaryMapOptions,
                    styles: config.performanceStyles,
                });

                const loadingListener = newMap.addListener('tilesloaded', () => {
                    google.maps.event.removeListener(loadingListener);
                    console.log('✅ Summary map tiles loaded successfully');
                });

                setMap(newMap);
                onLoad?.(newMap);
                setError(null);

                console.log('📊 Summary map initialized with settings:', {
                    currentZoom: zoom,
                    minZoom: summaryMapOptions.minZoom,
                    maxZoom: 120,
                    mapTypeControl: 'LEFT_BOTTOM',
                    gestureHandling: summaryMapOptions.gestureHandling,
                });
            } catch (error) {
                console.error('Error creating summary map:', error);
                setError(error instanceof Error ? error.message : 'Unknown error');
            }
        }
    }, [ref, map, center, zoom, onLoad]);

    useEffect(() => {
        if (map && center) {
            try {
                map.setCenter(center);
                map.setZoom(zoom);
            } catch (error) {
                console.error('Error updating map center:', error);
            }
        }
    }, [map, center, zoom]);

    if (error) {
        return <SummaryErrorComponent />;
    }

    return (
        <>
            <div ref={ref} style={{ width: '100%', height: '100%' }} id="map-container" />
            {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, { map } as any);
                }
            })}
        </>
    );
};

const ClippedSprinklerCoverage: React.FC<{
    map?: google.maps.Map;
    center: Coordinate;
    radius: number;
    zoneCoordinates: Coordinate[];
    color: string;
    isCornerSprinkler: boolean;
    sprinklerId: string;
    zoneType: string;
}> = ({ map, center, radius, zoneCoordinates, color, sprinklerId, zoneType }) => {
    const overlayRef = useRef<google.maps.MVCObject[]>([]);

    useEffect(() => {
        if (!map || !window.google?.maps) return;

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

            if (result === 'FULL_CIRCLE') {
                const circle = new google.maps.Circle({
                    center: { lat: center.lat, lng: center.lng },
                    radius: radius,
                    fillColor: color,
                    fillOpacity: 0.2,
                    strokeColor: color,
                    strokeOpacity: 0.6,
                    strokeWeight: 2,
                    map: map,
                });
                overlayRef.current.push(circle);
            } else if (result === 'MASKED_CIRCLE') {
                const intersectionPolygon = createCircleZoneIntersection(
                    center,
                    radius,
                    zoneCoordinates
                );

                if (intersectionPolygon.length >= 3) {
                    const polygon = new google.maps.Polygon({
                        paths: intersectionPolygon.map((p) => ({ lat: p.lat, lng: p.lng })),
                        fillColor: color,
                        fillOpacity: 0.2,
                        strokeColor: color,
                        strokeOpacity: 0.6,
                        strokeWeight: 2,
                        map: map,
                    });
                    overlayRef.current.push(polygon);

                    const zoneBoundary = new google.maps.Polygon({
                        paths: zoneCoordinates.map((p) => ({ lat: p.lat, lng: p.lng })),
                        fillOpacity: 0,
                        strokeColor: color,
                        strokeOpacity: 0.4,
                        strokeWeight: 1,
                        map: map,
                    });
                    overlayRef.current.push(zoneBoundary);
                } else {
                    const circle = new google.maps.Circle({
                        center: { lat: center.lat, lng: center.lng },
                        radius: radius,
                        fillColor: color,
                        fillOpacity: 0.15,
                        strokeColor: color,
                        strokeOpacity: 0.5,
                        strokeWeight: 1,
                        map: map,
                    });
                    overlayRef.current.push(circle);
                }
            } else if (Array.isArray(result) && result.length >= 3) {
                const coordinates = result as Coordinate[];
                const polygon = new google.maps.Polygon({
                    paths: coordinates.map((p) => ({ lat: p.lat, lng: p.lng })),
                    fillColor: color,
                    fillOpacity: 0.2,
                    strokeColor: color,
                    strokeOpacity: 0.6,
                    strokeWeight: 2,
                    map: map,
                });
                overlayRef.current.push(polygon);
            } else {
                const circle = new google.maps.Circle({
                    center: { lat: center.lat, lng: center.lng },
                    radius: radius,
                    fillColor: color,
                    fillOpacity: 0.1,
                    strokeColor: color,
                    strokeOpacity: 0.5,
                    strokeWeight: 1,
                    map: map,
                });
                overlayRef.current.push(circle);
            }
        } catch (error) {
            console.error(`Error creating clipped sprinkler coverage for ${sprinklerId}:`, error);

            try {
                const circle = new google.maps.Circle({
                    center: { lat: center.lat, lng: center.lng },
                    radius: radius,
                    fillColor: color,
                    fillOpacity: 0.15,
                    strokeColor: color,
                    strokeOpacity: 0.5,
                    strokeWeight: 1,
                    map: map,
                });
                overlayRef.current.push(circle);
            } catch (fallbackError) {
                console.error('Error creating fallback circle:', fallbackError);
            }
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
    }, [map, center, radius, zoneCoordinates, color, sprinklerId, zoneType]);

    return null;
};

const createCircleZoneIntersection = (
    center: Coordinate,
    radius: number,
    zoneCoordinates: Coordinate[]
): Coordinate[] => {
    const intersectionPoints: Coordinate[] = [];
    const numCirclePoints = 64;

    for (let i = 0; i < numCirclePoints; i++) {
        const angle = (i * 2 * Math.PI) / numCirclePoints;
        const lat = center.lat + (radius / 111000) * Math.cos(angle);
        const lng =
            center.lng +
            (radius / (111000 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(angle);
        const circlePoint = { lat, lng };

        if (isPointInPolygon(circlePoint, zoneCoordinates)) {
            intersectionPoints.push(circlePoint);
        }
    }

    zoneCoordinates.forEach((vertex) => {
        const distance = Math.sqrt(
            Math.pow((vertex.lat - center.lat) * 111000, 2) +
                Math.pow(
                    (vertex.lng - center.lng) * 111000 * Math.cos((center.lat * Math.PI) / 180),
                    2
                )
        );
        if (distance <= radius) {
            intersectionPoints.push(vertex);
        }
    });

    if (intersectionPoints.length >= 3) {
        const centroidLat =
            intersectionPoints.reduce((sum, p) => sum + p.lat, 0) / intersectionPoints.length;
        const centroidLng =
            intersectionPoints.reduce((sum, p) => sum + p.lng, 0) / intersectionPoints.length;

        intersectionPoints.sort((a, b) => {
            const angleA = Math.atan2(a.lat - centroidLat, a.lng - centroidLng);
            const angleB = Math.atan2(b.lat - centroidLat, b.lng - centroidLng);
            return angleA - angleB;
        });
    }

    return intersectionPoints;
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

const GoogleMapSummaryContent: React.FC<GoogleMapSummaryProps & { map?: google.maps.Map }> = ({
    map,
    gardenData,
}) => {
    const overlaysRef = useRef<Map<string, google.maps.MVCObject>>(new Map());

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

    const createSprinklerIcon = useCallback(
        (sprinkler: any, orientation?: number): google.maps.Symbol => {
            return {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: sprinkler.color || '#33CCFF',
                fillOpacity: 0.9,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                scale: 4,
                rotation: orientation || 0,
            };
        },
        []
    );

    const createWaterSourceIcon = useCallback((type: 'main' | 'pump'): google.maps.Symbol => {
        const color = type === 'pump' ? '#EF4444' : '#3B82F6';
        return {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
            scale: 6,
        };
    }, []);

    useEffect(() => {
        if (!map || !window.google?.maps) return;

        clearOverlays();

        try {
            console.log('🎨 Rendering summary overlays...');

            gardenData.gardenZones?.forEach((zone) => {
                if (!zone.coordinates || zone.coordinates.length < 3) return;

                try {
                    const zoneType = ZONE_TYPES.find((z) => z.id === zone.type);
                    const isNestedZone = !!zone.parentZoneId;

                    const polygon = new google.maps.Polygon({
                        paths: zone.coordinates.map((c) => ({ lat: c.lat, lng: c.lng })),
                        fillColor: zoneType?.color || '#666',
                        fillOpacity: zone.type === 'forbidden' ? 0.5 : isNestedZone ? 0.6 : 0.25,
                        strokeColor: zoneType?.color || '#666',
                        strokeOpacity: 1,
                        strokeWeight: isNestedZone ? 3 : 2,
                        map: map,
                    });

                    overlaysRef.current.set(`zone-${zone.id}`, polygon);
                } catch (error) {
                    console.error(`Error rendering zone ${zone.id}:`, error);
                }
            });

            // Render uniform pipes (no branch classification)
            gardenData.pipes
                ?.filter((p) => p.type === 'pipe')
                .forEach((pipe) => {
                    try {
                        const polyline = new google.maps.Polyline({
                            path: [
                                { lat: pipe.start.lat, lng: pipe.start.lng },
                                { lat: pipe.end.lat, lng: pipe.end.lng },
                            ],
                            strokeColor: '#FFFF00', // Uniform yellow color for all pipes
                            strokeWeight: 4, // Uniform size for all pipes
                            strokeOpacity: 0.9,
                            map: map,
                        });
                        overlaysRef.current.set(`pipe-${pipe.id}`, polyline);
                    } catch (error) {
                        console.error(`Error rendering pipe ${pipe.id}:`, error);
                    }
                });

            // Render sprinklers
            gardenData.sprinklers?.forEach((sprinkler) => {
                if (!sprinkler.position) return;

                try {
                    const zone = gardenData.gardenZones?.find((z) => z.id === sprinkler.zoneId);

                    // Handle virtual zone sprinklers (no zone coverage)
                    if (!zone || sprinkler.zoneId === 'virtual_zone') {
                        const circle = new google.maps.Circle({
                            center: { lat: sprinkler.position.lat, lng: sprinkler.position.lng },
                            radius: sprinkler.type.radius,
                            fillColor: sprinkler.type.color,
                            fillOpacity: 0.15,
                            strokeColor: sprinkler.type.color,
                            strokeOpacity: 0.5,
                            strokeWeight: 2,
                            map: map,
                        });
                        overlaysRef.current.set(`virtual-coverage-${sprinkler.id}`, circle);
                    }

                    // Render sprinkler marker
                    const marker = new google.maps.Marker({
                        position: { lat: sprinkler.position.lat, lng: sprinkler.position.lng },
                        icon: createSprinklerIcon(sprinkler.type, sprinkler.orientation),
                        title: `หัวฉีด: ${sprinkler.type.nameEN} (รัศมี ${sprinkler.type.radius}ม.)`,
                        map: map,
                    });
                    overlaysRef.current.set(`sprinkler-${sprinkler.id}`, marker);
                } catch (error) {
                    console.error(`Error rendering sprinkler ${sprinkler.id}:`, error);
                }
            });

            // Render water source
            if (gardenData.waterSource?.position) {
                try {
                    const marker = new google.maps.Marker({
                        position: {
                            lat: gardenData.waterSource.position.lat,
                            lng: gardenData.waterSource.position.lng,
                        },
                        icon: createWaterSourceIcon(gardenData.waterSource.type),
                        title: `แหล่งน้ำ: ${gardenData.waterSource.type === 'pump' ? 'ปั๊มน้ำ' : 'ท่อเมน'}`,
                        map: map,
                    });
                    overlaysRef.current.set('water-source', marker);
                } catch (error) {
                    console.error('Error rendering water source:', error);
                }
            }

            console.log('✅ Summary overlays rendered successfully');
        } catch (error) {
            console.error('Error rendering summary overlays:', error);
        }

        return clearOverlays;
    }, [map, gardenData, clearOverlays, createSprinklerIcon, createWaterSourceIcon]);

    return (
        <>
            {/* Render clipped sprinkler coverage for zones */}
            {gardenData.sprinklers?.map((sprinkler) => {
                if (!sprinkler.position) return null;

                const zone = gardenData.gardenZones?.find((z) => z.id === sprinkler.zoneId);
                if (!zone || !zone.coordinates || zone.coordinates.length < 3) return null;

                const isCorner = isCornerSprinkler(sprinkler.position, zone.coordinates);

                return (
                    <ClippedSprinklerCoverage
                        key={`${sprinkler.id}-coverage`}
                        map={map}
                        center={sprinkler.position}
                        radius={sprinkler.type.radius}
                        zoneCoordinates={zone.coordinates}
                        color={sprinkler.type.color}
                        isCornerSprinkler={isCorner}
                        sprinklerId={sprinkler.id}
                        zoneType={zone.type}
                    />
                );
            })}
        </>
    );
};

const renderSummaryMap = (status: Status): React.ReactElement => {
    switch (status) {
        case Status.LOADING:
            return <SummaryLoadingComponent />;
        case Status.FAILURE:
            return <SummaryErrorComponent onRetry={() => window.location.reload()} />;
        case Status.SUCCESS:
            return <div style={{ width: '100%', height: '100%' }} />;
        default:
            return <SummaryLoadingComponent />;
    }
};

const GoogleMapSummary: React.FC<GoogleMapSummaryProps> = (props) => {
    const { mapCenter, calculateZoomLevel } = props;
    const config = getGoogleMapsConfig();

    useEffect(() => {
        if (!config.apiKey) {
            console.error('❌ Google Maps API Key is missing for summary');
        } else {
            console.log('✅ Google Maps Summary API Key found');
            console.log('📊 Summary map settings:', {
                mapTypeControl: 'LEFT_BOTTOM',
                minZoom: 1,
                maxZoom: 'UNLIMITED ♾️',
                gestureHandling: 'none',
                note: 'Zoom restrictions removed completely',
                pipeSystem: 'Uniform yellow pipes (no branch classification)',
            });
        }
    }, [config.apiKey]);

    if (!config.apiKey) {
        return <SummaryErrorComponent onRetry={() => window.location.reload()} />;
    }

    return (
        <SummaryErrorBoundary>
            <Wrapper
                apiKey={config.apiKey}
                render={renderSummaryMap}
                libraries={config.libraries as any}
                version="weekly"
            >
                <SummaryMapComponent
                    center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                    zoom={calculateZoomLevel}
                >
                    <GoogleMapSummaryContent {...props} />
                </SummaryMapComponent>
            </Wrapper>
        </SummaryErrorBoundary>
    );
};

export default GoogleMapSummary;
