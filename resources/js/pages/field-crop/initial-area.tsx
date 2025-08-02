/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../../components/Navbar';
import { Head, Link, router } from '@inertiajs/react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import * as turf from '@turf/turf';
import { getCropByValue } from '@/pages/utils/cropData';
import { useMapState, useStepWizard, useFieldZoneState } from '@/pages/hooks/useFieldMapState';
import ErrorBoundary from '@/pages/components/ErrorBoundary';
import ErrorMessage from '@/pages/components/ErrorMessage';
import LoadingSpinner from '@/pages/components/LoadingSpinner';

// Interfaces for data structures
interface Coordinate {
    lat: number;
    lng: number;
}

interface SearchResult {
    x: number;
    y: number;
    label: string;
    address: string;
    place_id: string;
    bounds?: { north: number; south: number; east: number; west: number } | null;
    raw?: any;
}

// Google Maps Configuration
const getGoogleMapsConfig = () => ({
            apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['drawing', 'geometry', 'places'] as const,
    defaultZoom: 15,
});

// --- GoogleMapComponent ---
// This component renders the interactive Google Map and its drawing tools.
interface GoogleMapComponentProps {
    center: google.maps.LatLngLiteral;
    zoom: number;
    onLoad: (map: google.maps.Map) => void;
    onDrawCreated: (overlay: google.maps.MVCObject, type: string) => void;
    drawingStage: string;
    onMapClick?: (e: google.maps.MapMouseEvent) => void;
    mapType: string;
    onCenterChanged?: (center: google.maps.LatLngLiteral) => void;
    onZoomChanged?: (zoom: number) => void;
}

const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
    center,
    zoom,
    onLoad,
    onDrawCreated,
    drawingStage,
    mapType,
    onCenterChanged,
    onZoomChanged,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map>();
    const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager>();
    const [currentDrawingMode, setCurrentDrawingMode] =
        useState<google.maps.drawing.OverlayType | null>(null);

    // Initialize map
    useEffect(() => {
        if (ref.current && !map && window.google) {
            const newMap = new google.maps.Map(ref.current, {
                center,
                zoom,
                mapTypeId: mapType as google.maps.MapTypeId,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: false,
                gestureHandling: 'greedy',
            });

            const drawingMgr = new google.maps.drawing.DrawingManager({
                drawingMode: null,
                drawingControl: false,
                polygonOptions: {
                    fillColor: '#22C55E',
                    fillOpacity: 0.3,
                    strokeColor: '#22C55E',
                    strokeWeight: 2,
                    clickable: false,
                    editable: false,
                    zIndex: 1,
                },
            });
            drawingMgr.setMap(newMap);

            google.maps.event.addListener(
                drawingMgr,
                'overlaycomplete',
                (event: google.maps.drawing.OverlayCompleteEvent) => {
                    drawingMgr.setDrawingMode(null);
                    setCurrentDrawingMode(null);
                    onDrawCreated(event.overlay, event.type);
                }
            );
            
            newMap.addListener('zoom_changed', () => {
                const newZoom = newMap.getZoom();
                if (newZoom !== undefined && onZoomChanged) onZoomChanged(newZoom);
            });

            newMap.addListener('center_changed', () => {
                const newCenter = newMap.getCenter();
                if (newCenter && onCenterChanged) {
                    onCenterChanged({ lat: newCenter.lat(), lng: newCenter.lng() });
                }
            });

            setMap(newMap);
            setDrawingManager(drawingMgr);
            onLoad(newMap);
        }
    }, [ref, map]);

    // Update map center and zoom
    useEffect(() => {
        if (map) {
            map.setCenter(center);
            map.setZoom(zoom);
        }
    }, [map, center, zoom]);
    
    // Update map type
    useEffect(() => {
        if (map && mapType) {
            map.setMapTypeId(mapType as google.maps.MapTypeId);
        }
    }, [map, mapType]);

    // Drawing controls
    const startDrawing = (type: 'polygon') => {
        if (!drawingManager) return;
        const mode = google.maps.drawing.OverlayType.POLYGON;
        drawingManager.setDrawingMode(mode);
        setCurrentDrawingMode(mode);
    };

    const stopDrawing = () => {
        if (drawingManager) {
            drawingManager.setDrawingMode(null);
            setCurrentDrawingMode(null);
        }
    };

    return (
        <>
            <div ref={ref} style={{ width: '100%', height: '100%' }} />
            <div className="absolute left-2 top-2 z-10 max-w-xs rounded-md border border-white p-2 shadow-md" style={{backgroundColor: '#000005'}}>
                {drawingStage === 'field' && (
                    <div className="flex flex-col space-y-1">
                        <div className="text-xs font-semibold text-white">ขั้นตอนที่ 1: วาดขอบเขตแปลง</div>
                        <button
                            onClick={() => startDrawing('polygon')}
                            disabled={currentDrawingMode !== null}
                            className={`rounded border border-white px-2 py-1 text-xs transition-colors ${
                                currentDrawingMode === google.maps.drawing.OverlayType.POLYGON
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                            } disabled:opacity-50`}
                        >
                            🏔️ {currentDrawingMode === google.maps.drawing.OverlayType.POLYGON ? 'กำลังวาด...' : 'วาดขอบเขตแปลง'}
                        </button>
                        {currentDrawingMode && (
                            <button
                                onClick={stopDrawing}
                                className="rounded border border-white bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                            >
                                ❌ ยกเลิก
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

// --- Main Component: Step1_FieldArea ---
interface Step1FieldAreaProps {
    crops?: string;
}

export default function Step1_FieldArea({ crops }: Step1FieldAreaProps) {
    // State Management Hooks
    const mapState = useMapState();
    const stepWizard = useStepWizard();
    const fieldZoneState = useFieldZoneState();

    // Destructure state for easier access
    const { mapCenter, setMapCenter, mapZoom, setMapZoom, mapType, setMapType, searchQuery, setSearchQuery, searchResults, setSearchResults, isSearching, setIsSearching, showDropdown, setShowDropdown, blurTimeoutRef } = mapState;
    const { setCurrentStep, setStepCompleted, drawingStage, setDrawingStage } = stepWizard;
    const { selectedCrops, setSelectedCrops, mainField, setMainField, fieldAreaSize, setFieldAreaSize } = fieldZoneState;

    const [error, setError] = useState<string | null>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);

    // Initialize component with data from URL or localStorage
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const cropsParam = urlParams.get('crops');
        if (cropsParam) {
            setSelectedCrops(cropsParam.split(',').filter(Boolean));
        }

        // Load saved project data if it exists
        const savedData = localStorage.getItem('fieldMapData');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (parsedData.mainField && parsedData.mainField.coordinates) {
                    // Restore map objects in a separate effect after map is loaded
                }
                if(parsedData.selectedCrops) setSelectedCrops(parsedData.selectedCrops);
                if(parsedData.fieldAreaSize) setFieldAreaSize(parsedData.fieldAreaSize);
                if(parsedData.mapCenter) setMapCenter(parsedData.mapCenter);
                if(parsedData.mapZoom) setMapZoom(parsedData.mapZoom);
            } catch (e) {
                console.error("Failed to parse saved data", e);
                localStorage.removeItem('fieldMapData');
            }
        }
        
        setCurrentStep(1);
        setDrawingStage('field');
    }, []);

    // Effect to restore drawn field polygon after map is loaded
    useEffect(() => {
        if (map && !mainField) {
            const savedData = localStorage.getItem('fieldMapData');
            if (savedData) {
                 try {
                    const parsedData = JSON.parse(savedData);
                    if (parsedData.mainField && parsedData.mainField.coordinates) {
                         const fieldPolygon = new google.maps.Polygon({
                            paths: parsedData.mainField.coordinates,
                            fillColor: '#22C55E',
                            fillOpacity: 0.2,
                            strokeColor: '#22C55E',
                            strokeWeight: 3,
                            clickable: false,
                            editable: false,
                            zIndex: 1,
                            map: map,
                        });
                        setMainField({
                            polygon: fieldPolygon,
                            coordinates: parsedData.mainField.coordinates,
                            area: parsedData.fieldAreaSize,
                        });
                    }
                 } catch (e) {
                     console.error("Failed to restore polygon", e);
                 }
            }
        }
    }, [map]);


    const selectedCropObjects = selectedCrops.map(cropValue => getCropByValue(cropValue)).filter(Boolean);

    const handleError = useCallback((errorMessage: string) => {
        setError(errorMessage);
        setTimeout(() => setError(null), 5000);
    }, []);

    const clearError = useCallback(() => setError(null), []);

    // Utility to convert Google Maps Path to coordinate array
    const pathToCoordinates = useCallback((path: google.maps.MVCArray<google.maps.LatLng>): Coordinate[] => {
        return path.getArray().map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() }));
    }, []);

    // Callback for when a shape is drawn on the map
    const handleDrawCreated = useCallback((overlay: google.maps.MVCObject) => {
        const polygon = overlay as google.maps.Polygon;
        const path = polygon.getPath();
        const coordinates = pathToCoordinates(path);

        try {
            const turfCoords = coordinates.map(coord => [coord.lng, coord.lat]);
            turfCoords.push(turfCoords[0]); // Close the polygon for turf
            const turfPolygon = turf.polygon([turfCoords]);
            const area = turf.area(turfPolygon); // in square meters

            setMainField({ polygon, coordinates, area });
            setFieldAreaSize(area);
            
            // Remove the temporary drawing overlay, as we are managing it in our state
            polygon.setMap(null);
            
            // Re-create the polygon from our state to ensure it's managed by React
            const newPolygon = new google.maps.Polygon({
                paths: coordinates,
                fillColor: '#22C55E',
                fillOpacity: 0.2,
                strokeColor: '#22C55E',
                strokeWeight: 3,
                map: map,
            });
            setMainField({ polygon: newPolygon, coordinates, area });


        } catch (error) {
            console.error("Error creating field:", error);
            handleError("เกิดข้อผิดพลาดในการคำนวณพื้นที่แปลง");
            polygon.setMap(null);
        }
    }, [map, pathToCoordinates, setMainField, setFieldAreaSize, handleError]);

    // Search for a location
    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim() || !map) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        const service = new google.maps.places.PlacesService(map);
        service.textSearch({ query }, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                const searchResults: SearchResult[] = results.slice(0, 5).map(place => ({
                    x: place.geometry?.location?.lng() || 0,
                    y: place.geometry?.location?.lat() || 0,
                    label: place.name || '',
                    address: place.formatted_address || '',
                    place_id: place.place_id || '',
                }));
                setSearchResults(searchResults);
                setShowDropdown(true);
            } else {
                setSearchResults([]);
                setShowDropdown(false);
            }
            setIsSearching(false);
        });
    }, [map]);

    const goToLocation = useCallback((result: SearchResult) => {
        if (map) {
            map.setCenter({ lat: result.y, lng: result.x });
            map.setZoom(17);
            setMapCenter([result.y, result.x]);
            setMapZoom(17);
            setSearchQuery(result.label);
            setShowDropdown(false);
        }
    }, [map, setMapCenter, setMapZoom, setSearchQuery, setShowDropdown]);
    
    // Reset function
    const resetStep = () => {
         if (confirm('คุณต้องการล้างข้อมูลในขั้นตอนนี้ทั้งหมดใช่หรือไม่?')) {
            if (mainField && mainField.polygon) {
                mainField.polygon.setMap(null);
            }
            setMainField(null);
            setFieldAreaSize(0);
            
            // Also clear relevant part of localStorage
            const savedData = localStorage.getItem('fieldMapData');
            if(savedData) {
                try {
                    const parsedData = JSON.parse(savedData);
                    delete parsedData.mainField;
                    delete parsedData.fieldAreaSize;
                    localStorage.setItem('fieldMapData', JSON.stringify(parsedData));
                } catch(e) {
                    console.error("Error updating localStorage on reset", e);
                }
            }
        }
    };

    // Proceed to the next step
    const goToNextStep = () => {
        if (!mainField) {
            handleError("กรุณาวาดขอบเขตแปลงก่อนไปขั้นตอนถัดไป");
            return;
        }

        // Save data to localStorage
        const dataToSave = {
            selectedCrops,
            mainField: {
                coordinates: mainField.coordinates,
            },
            fieldAreaSize,
            mapCenter,
            mapZoom,
        };
        localStorage.setItem('fieldMapData', JSON.stringify(dataToSave));
        
        setStepCompleted(prev => ({ ...prev, 1: true }));

        // Navigate to the next step's page
        router.visit('/step2-zones-obstacles');
    };

    return (
        <ErrorBoundary>
            <div className="flex h-screen flex-col overflow-hidden text-white" style={{backgroundColor: '#000005'}}>
                <Head title="ขั้นตอนที่ 1: กำหนดขอบเขตแปลง" />
                <Navbar />

                {error && <ErrorMessage title="เกิดข้อผิดพลาด" message={error} onDismiss={clearError} />}

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel */}
                    <div className="w-96 border-r border-white" style={{backgroundColor: '#000005'}}>
                         <div className="flex h-full flex-col">
                            <div className="border-b border-white p-3">
                                <h3 className="text-lg font-semibold text-white">ขั้นตอนที่ 1: กำหนดขอบเขตแปลง</h3>
                                <p className="text-sm text-gray-400">วาดพื้นที่เพาะปลูกของคุณบนแผนที่</p>
                            </div>
                            <div className="flex-1 space-y-4 overflow-y-auto p-4">
                                <div className="rounded-lg border border-white p-3">
                                    <div className="mb-2 text-sm font-semibold">พืชที่เลือก</div>
                                    {selectedCropObjects.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedCropObjects.map(crop => crop && (
                                                <div key={crop.value} className="flex items-center rounded-full bg-green-800 px-3 py-1 text-xs">
                                                    <span className="mr-2">{crop.icon}</span>
                                                    {crop.name}
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-gray-500">ไม่ได้เลือกพืช</p>}
                                     <Link href="/field-crop" className="mt-2 inline-block text-xs text-blue-400 hover:underline">แก้ไขพืชที่เลือก</Link>
                                </div>
                                <div className="rounded-lg border border-white p-3">
                                     <div className="mb-2 text-sm font-semibold">ข้อมูลพื้นที่</div>
                                     {fieldAreaSize > 0 ? (
                                         <>
                                            <p className="text-lg font-bold text-green-400">{fieldAreaSize.toFixed(2)} <span className="text-sm font-normal">ตร.ม.</span></p>
                                            <p className="text-sm text-gray-400">~ {(fieldAreaSize / 1600).toFixed(2)} ไร่</p>
                                         </>
                                     ) : <p className="text-xs text-gray-500">ยังไม่ได้วาดขอบเขตแปลง</p>}
                                </div>
                                <button onClick={resetStep} className="w-full rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
                                    ล้างค่าขั้นตอนนี้
                                </button>
                            </div>
                            <div className="border-t border-white p-4">
                                <button onClick={goToNextStep} disabled={!mainField} className="w-full rounded bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600">
                                    ขั้นตอนถัดไป: กำหนดโซนและสิ่งกีดขวาง
                                </button>
                            </div>
                         </div>
                    </div>

                    {/* Map Area */}
                    <div className="relative flex-1">
                        <Wrapper apiKey={getGoogleMapsConfig().apiKey} render={status => {
                            if (status === Status.LOADING) return <LoadingSpinner text="กำลังโหลดแผนที่..." />;
                            if (status === Status.FAILURE) return <p>เกิดข้อผิดพลาดในการโหลดแผนที่</p>;
                            return <div />;
                        }} libraries={['drawing', 'geometry', 'places']}>
                            <GoogleMapComponent
                                center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                                zoom={mapZoom}
                                onLoad={setMap}
                                onDrawCreated={handleDrawCreated}
                                drawingStage="field"
                                mapType={mapType}
                                onCenterChanged={(c) => setMapCenter([c.lat, c.lng])}
                                onZoomChanged={setMapZoom}
                            />
                        </Wrapper>
                        
                        {/* Search Box */}
                        <div className="absolute right-4 top-4 z-10 w-80">
                            <input
                                type="text"
                                placeholder="🔍 ค้นหาสถานที่..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    handleSearch(e.target.value);
                                }}
                                className="w-full rounded-md border border-white bg-white px-3 py-2 text-sm text-gray-900 shadow-md"
                            />
                            {showDropdown && searchResults.length > 0 && (
                                <div className="absolute mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                                    {searchResults.map((result) => (
                                        <button key={result.place_id} onClick={() => goToLocation(result)} className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-blue-50">
                                            <div className="font-medium">{result.label}</div>
                                            <div className="text-xs text-gray-500">{result.address}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}
