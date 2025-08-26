/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { GOOGLE_MAPS_CONFIG } from '../../utils/googleMapsConfig';

interface Coordinate {
    lat: number;
    lng: number;
}

interface HorticultureMapComponentProps {
    center: [number, number];
    zoom: number;
    onMapLoad?: (map: google.maps.Map) => void;
    children?: React.ReactNode;
    mapOptions?: Partial<google.maps.MapOptions>;
}

const getGoogleMapsConfig = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

    return {
        apiKey,
        libraries: ['drawing', 'geometry', 'places'],
        defaultMapOptions: {
            mapTypeId: 'satellite',
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: true,
            fullscreenControl: true,
            mapTypeControl: true,
            mapTypeControlOptions: {
                position: 'TOP_CENTER' as any,
                style: 'HORIZONTAL_BAR' as any,
                mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain'],
            },
            gestureHandling: 'greedy' as const,
            clickableIcons: true,
            scrollwheel: true,
            disableDoubleClickZoom: true,
        },
    };
};

const MapLoadingComponent: React.FC = () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-900">
        <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
            <p className="text-white">กำลังโหลด Google Maps...</p>
        </div>
    </div>
);

const MapErrorComponent: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
    const config = getGoogleMapsConfig();

    return (
        <div className="flex h-full w-full items-center justify-center bg-gray-900">
            <div className="max-w-md rounded-lg bg-red-900 p-6 text-center text-white">
                <div className="mb-4 text-4xl">❌</div>
                <h3 className="mb-2 text-lg font-bold">ไม่สามารถโหลด Google Maps ได้</h3>
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

const MapComponent: React.FC<{
    center: google.maps.LatLngLiteral;
    zoom: number;
    onLoad?: (map: google.maps.Map) => void;
    children?: React.ReactNode;
    mapOptions?: Partial<google.maps.MapOptions>;
}> = ({ center, zoom, onLoad, children, mapOptions }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map>();
    const [isMapInitialized, setIsMapInitialized] = useState(false);

    useEffect(() => {
        if (ref.current && !map && window.google?.maps) {
            try {
                const config = getGoogleMapsConfig();

                const mergedOptions = {
                    ...config.defaultMapOptions,
                    ...mapOptions,
                };
                const newMap = new window.google.maps.Map(ref.current, {
                    center,
                    zoom,
                    ...mergedOptions,
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
                setIsMapInitialized(true);
                onLoad?.(newMap);
            } catch (error) {
                console.error('Error creating Google Map:', error);
            }
        }
    }, [ref, map, center, zoom, onLoad, mapOptions]);

    useEffect(() => {
        if (map && !isMapInitialized) {
            map.setCenter(center);
        }
    }, [map, center, isMapInitialized]);

    return (
        <>
            <div ref={ref} style={{ width: '100%', height: '100%' }} />

            {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, { map } as any);
                }
            })}
        </>
    );
};

const renderMap = (status: Status): React.ReactElement => {
    switch (status) {
        case Status.LOADING:
            return <MapLoadingComponent />;
        case Status.FAILURE:
            return <MapErrorComponent onRetry={() => window.location.reload()} />;
        case Status.SUCCESS:
            return <div style={{ width: '100%', height: '100%' }} />;
        default:
            return <MapLoadingComponent />;
    }
};

const HorticultureMapComponent: React.FC<HorticultureMapComponentProps> = ({
    center,
    zoom,
    onMapLoad,
    children,
    mapOptions,
}) => {
    const config = getGoogleMapsConfig();

    if (!config.apiKey) {
        return <MapErrorComponent onRetry={() => window.location.reload()} />;
    }

    return (
        <Wrapper
            apiKey={config.apiKey}
            render={renderMap}
            libraries={config.libraries as any}
            version="weekly"
        >
            <MapComponent
                center={{ lat: center[0], lng: center[1] }}
                zoom={zoom}
                onLoad={onMapLoad}
                mapOptions={mapOptions}
            >
                {children}
            </MapComponent>
        </Wrapper>
    );
};

export default HorticultureMapComponent;
