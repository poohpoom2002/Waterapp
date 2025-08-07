/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { Head, Link, router } from '@inertiajs/react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import * as turf from '@turf/turf';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    useMapState,
    useStepWizard,
    useFieldZoneState,
} from '@/pages/hooks/useFieldMapState';
import ErrorMessage from '@/pages/components/ErrorMessage';
import LoadingSpinner from '@/pages/components/LoadingSpinner';

// --- Interfaces ---
interface Coordinate {
    lat: number;
    lng: number;
}

interface GoogleMapComponentProps {
    center: Coordinate;
    zoom: number;
    onLoad: (map: google.maps.Map) => void;
    onDrawCreated: (overlay: google.maps.MVCObject) => void;
    mapType: google.maps.MapTypeId;
    onCenterChanged: (center: Coordinate) => void;
    onZoomChanged: (zoom: number) => void;
}

// Extend Window interface for custom function
declare global {
    interface Window {
        startFieldDrawing: () => void;
    }
}

// --- Google Map Component ---
const getGoogleMapsConfig = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    if (!apiKey) {
        console.error('❌ Google Maps API Key not found!');
    }
    return { apiKey, libraries: ['drawing', 'geometry', 'places'] as const };
};

const GoogleMapComponent = ({ 
    center, 
    zoom, 
    onLoad, 
    onDrawCreated, 
    mapType, 
    onCenterChanged, 
    onZoomChanged 
}: GoogleMapComponentProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map>();
    const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager>();

    useEffect(() => {
        if (ref.current && !map && window.google) {
            const newMap = new google.maps.Map(ref.current, {
                center,
                zoom,
                mapTypeId: mapType,
                mapTypeControl: false,
                streetViewControl: true,
                fullscreenControl: true,
                zoomControl: true,
                gestureHandling: 'greedy',
            });

            const drawingMgr = new google.maps.drawing.DrawingManager({
                drawingMode: null,
                drawingControl: false,
                polygonOptions: {
                    fillColor: '#22C55E',
                    fillOpacity: 0.3,
                    strokeColor: '#22C55E',
                    strokeWeight: 3,
                    clickable: false,
                    editable: true,
                    zIndex: 1,
                },
            });
            drawingMgr.setMap(newMap);
            
            google.maps.event.addListener(drawingMgr, 'overlaycomplete', (event: google.maps.drawing.OverlayCompleteEvent) => {
                drawingMgr.setDrawingMode(null);
                onDrawCreated(event.overlay);
            });

            newMap.addListener('zoom_changed', () => {
                const currentZoom = newMap.getZoom();
                if (currentZoom !== undefined) {
                    onZoomChanged(currentZoom);
                }
            });
            newMap.addListener('center_changed', () => {
                const newCenter = newMap.getCenter();
                if (newCenter) onCenterChanged({ lat: newCenter.lat(), lng: newCenter.lng() });
            });

            setMap(newMap);
            setDrawingManager(drawingMgr);
            onLoad(newMap);
        }
    }, [map, center, zoom, mapType, onLoad, onDrawCreated, onCenterChanged, onZoomChanged]);

    useEffect(() => {
        if (map && mapType) {
            map.setMapTypeId(mapType);
        }
    }, [map, mapType]);

    // Function to start drawing
    window.startFieldDrawing = () => {
        if (drawingManager) {
            drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
        }
    };

    return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
};

// --- Main Component for Step 1 ---
export default function FieldStep1Boundary({ crops }: { crops?: string }) {
    const { t } = useLanguage();
    const { apiKey } = getGoogleMapsConfig();

    // State Management Hooks
    const mapState = useMapState();
    const stepWizard = useStepWizard();
    const fieldZoneState = useFieldZoneState();

    const {
        mapCenter, setMapCenter, mapZoom, setMapZoom, mapType,
    } = mapState;

    const { stepCompleted, setStepCompleted } = stepWizard;
    const { selectedCrops, setSelectedCrops, mainField, setMainField, setFieldAreaSize } = fieldZoneState;

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load initial data from URL and localStorage
    useEffect(() => {
        // 1. Load from URL first
        if (crops) {
            setSelectedCrops(crops.split(',').filter(Boolean));
        }

        // 2. Then, try to load from localStorage to restore state
        const savedData = localStorage.getItem('fieldMapData');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (parsedData.mapCenter) setMapCenter(parsedData.mapCenter);
                if (parsedData.mapZoom) setMapZoom(parsedData.mapZoom);
                if (parsedData.selectedCrops) setSelectedCrops(parsedData.selectedCrops);
            } catch (e) {
                console.error("Failed to parse saved data:", e);
            }
        }
    }, [crops, setMapCenter, setMapZoom, setSelectedCrops]);

    // Effect to restore the mainField polygon after map is loaded
    useEffect(() => {
        if (!map) return;

        const savedData = localStorage.getItem('fieldMapData');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (parsedData.mainField && parsedData.mainField.coordinates) {
                    const fieldPolygon = new google.maps.Polygon({
                        paths: parsedData.mainField.coordinates,
                        fillColor: '#22C55E',
                        fillOpacity: 0.3,
                        strokeColor: '#22C55E',
                        strokeWeight: 3,
                        clickable: false,
                        editable: true,
                        zIndex: 1,
                    });
                    fieldPolygon.setMap(map);
                    setMainField({
                        polygon: fieldPolygon,
                        coordinates: parsedData.mainField.coordinates,
                        area: parsedData.mainField.area,
                    });
                    setFieldAreaSize(parsedData.mainField.area);
                    setStepCompleted({ 1: true });
                }
            } catch (e) {
                console.error("Failed to restore main field polygon:", e);
            }
        }
    }, [map, setMainField, setFieldAreaSize, setStepCompleted]);

    const handleError = useCallback((errorMessage: string) => {
        setError(errorMessage);
        setTimeout(() => setError(null), 5000);
    }, []);

    const pathToCoordinates = (path: google.maps.MVCArray<google.maps.LatLng>): Coordinate[] => {
        return path.getArray().map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() }));
    };

    const handleDrawCreated = useCallback((overlay: google.maps.MVCObject) => {
        // Clear any previous field
        if (mainField && mainField.polygon) {
            mainField.polygon.setMap(null);
        }
        
        const polygon = overlay as google.maps.Polygon;
        const path = polygon.getPath();
        const coordinates = pathToCoordinates(path);

        const turfPolygon = turf.polygon([[...coordinates.map(c => [c.lng, c.lat]), [coordinates[0].lng, coordinates[0].lat]]]);
        const area = turf.area(turfPolygon);

        setMainField({ polygon, coordinates, area });
        setFieldAreaSize(area);
        setStepCompleted(prev => ({ ...prev, 1: true }));

        // Allow editing after drawing
        polygon.setEditable(true);
        google.maps.event.addListener(path, 'set_at', () => updateDrawnField(polygon));
        google.maps.event.addListener(path, 'insert_at', () => updateDrawnField(polygon));

    }, [mainField, setMainField, setFieldAreaSize, setStepCompleted]);
    
    const updateDrawnField = (polygon: google.maps.Polygon) => {
        const path = polygon.getPath();
        const coordinates = pathToCoordinates(path);
        const turfPolygon = turf.polygon([[...coordinates.map(c => [c.lng, c.lat]), [coordinates[0].lng, coordinates[0].lat]]]);
        const area = turf.area(turfPolygon);
        
        setMainField({ polygon, coordinates, area });
        setFieldAreaSize(area);
    };
    
    const handleNextStep = () => {
        if (!stepCompleted[1]) {
            handleError(t("Please define the field boundary first."));
            return;
        }

        // 1. Collect all data for this step
        const step1Data = {
            mapCenter,
            mapZoom,
            mapType,
            selectedCrops,
            mainField: mainField ? { 
                coordinates: mainField.coordinates,
                area: mainField.area
            } : null,
            fieldAreaSize: fieldZoneState.fieldAreaSize,
        };

        // 2. Get existing data from localStorage or create a new object
        const existingData = JSON.parse(localStorage.getItem('fieldMapData') || '{}');
        
        // 3. Merge and save data to localStorage
        const dataToSave = { ...existingData, ...step1Data };
        localStorage.setItem('fieldMapData', JSON.stringify(dataToSave));

        // 4. Navigate to the next step
        router.visit(`/field-step2-zones?crops=${selectedCrops.join(',')}`);
    };

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-gray-900 text-white">
            <Head title={t("Field Boundary - Step 1")} />
            <Navbar />

            {error && <ErrorMessage title={t("Error")} message={error} onDismiss={() => setError(null)} />}
            
            <div className="flex flex-1 overflow-hidden">
                {/* --- Sidebar --- */}
                <aside className="w-96 flex-shrink-0 border-r border-gray-700 bg-gray-800 p-4">
                    <div className="flex h-full flex-col">
                        <div className="mb-4">
                            <Link href="/field-crop" className="text-sm text-blue-400 hover:text-blue-300">&larr; {t("Back to Crop Selection")}</Link>
                            <h1 className="mt-2 text-2xl font-bold">🌾 {t("Field Planning")}</h1>
                        </div>

                        {/* Step Indicator */}
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-green-400">{t("Step 1")}: {t("Define Field Boundary")}</h2>
                            <p className="text-sm text-gray-400">{t("Search for your location and draw the boundary of your field.")}</p>
                        </div>

                        {/* Drawing Tool */}
                        <div className="mb-4 rounded-lg bg-gray-700 p-4">
                            <h3 className="font-semibold">{t("Drawing Tool")}</h3>
                            <button
                                onClick={() => window.startFieldDrawing()}
                                disabled={!map}
                                className="mt-2 w-full rounded-md bg-green-600 px-4 py-2 font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-500"
                            >
                                🏔️ {mainField ? t("Redraw Field Boundary") : t("Draw Field Boundary")}
                            </button>
                        </div>

                        {/* Field Info */}
                        {mainField && (
                            <div className="mb-4 rounded-lg bg-gray-700 p-4">
                                <h3 className="font-semibold text-green-300">{t("Field Information")}</h3>
                                <p className="mt-2 text-sm">{t("Area")}: <strong>{(mainField.area / 1600).toFixed(2)} {t("Rai")}</strong> ({mainField.area.toFixed(0)} m²)</p>
                                <p className="text-xs text-gray-400 mt-2">{t("You can click and drag the points on the map to edit the shape.")}</p>
                            </div>
                        )}
                        
                        <div className="mt-auto">
                            <button 
                                onClick={handleNextStep}
                                disabled={!stepCompleted[1]}
                                className="w-full rounded-md bg-blue-600 px-4 py-3 font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-500"
                            >
                                {t("Next Step: Zoning")} &rarr;
                            </button>
                        </div>
                    </div>
                </aside>

                {/* --- Map Area --- */}
                <main className="relative flex-1">
                    <Wrapper apiKey={apiKey} render={(status: Status) => {
                        if (status === Status.LOADING) return <LoadingSpinner text={t("Loading Map...")} fullScreen />;
                        if (status === Status.FAILURE) return <ErrorMessage title={t("Error")} message={t("Could not load Google Maps.")} />;
                        return <div />;
                    }} libraries={['drawing', 'geometry', 'places']}>
                        <GoogleMapComponent
                            center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                            zoom={mapZoom}
                            onLoad={setMap}
                            onDrawCreated={handleDrawCreated}
                            mapType={mapType as google.maps.MapTypeId}
                            onCenterChanged={(c) => setMapCenter([c.lat, c.lng])}
                            onZoomChanged={setMapZoom}
                        />
                    </Wrapper>
                </main>
            </div>
        </div>
    );
}
