/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../../components/Navbar';
import { Head, Link, router } from '@inertiajs/react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import * as turf from '@turf/turf';
import { getCropByValue, type Crop } from '@/pages/utils/cropData';
import { ZONE_COLORS, OBSTACLE_TYPES } from '@/pages/utils/fieldMapConstants';
import { useMapState, useStepWizard, useFieldZoneState } from '@/pages/hooks/useFieldMapState';
import ErrorBoundary from '@/pages/components/ErrorBoundary';
import ErrorMessage from '@/pages/components/ErrorMessage';
import LoadingSpinner from '@/pages/components/LoadingSpinner';

// --- Interfaces ---
interface Coordinate {
    lat: number;
    lng: number;
}

interface Zone {
    id: number | string;
    polygon: google.maps.Polygon;
    coordinates: Coordinate[];
    color: string;
    name: string;
}

interface Obstacle {
    id: number | string;
    polygon: google.maps.Polygon;
    coordinates: Coordinate[];
    type: string;
    name: string;
}

// --- Google Maps Configuration ---
const getGoogleMapsConfig = () => ({
            apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['drawing', 'geometry', 'places'] as const,
});

// --- GoogleMapComponent ---
interface GoogleMapComponentProps {
    center: google.maps.LatLngLiteral;
    zoom: number;
    mapType: string;
    onLoad: (map: google.maps.Map) => void;
    onDrawCreated: (overlay: google.maps.MVCObject, type: string) => void;
    drawingMode: 'zone' | 'obstacle' | null;
    currentZoneColor: string;
    currentObstacleType: string;
    onZoneClick: (zone: Zone) => void;
}

const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
    center,
    zoom,
    mapType,
    onLoad,
    onDrawCreated,
    drawingMode,
    currentZoneColor,
    currentObstacleType,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map>();
    const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager>();
    
    // Initialize Map
    useEffect(() => {
        if (ref.current && !map) {
            const newMap = new google.maps.Map(ref.current, {
                center,
                zoom,
                mapTypeId: mapType,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: false,
                gestureHandling: 'greedy',
            });
            onLoad(newMap);
            setMap(newMap);
        }
    }, [ref, map]);

    // Update Drawing Manager options based on current drawing mode
    useEffect(() => {
        if (!map) return;

        // Clean up previous drawing manager
        if (drawingManager) {
            drawingManager.setMap(null);
        }

        let polygonOptions: google.maps.PolygonOptions = {};
        if (drawingMode === 'zone') {
            polygonOptions = {
                fillColor: currentZoneColor,
                strokeColor: currentZoneColor,
                fillOpacity: 0.3,
                strokeWeight: 2,
                zIndex: 2,
            };
        } else if (drawingMode === 'obstacle') {
            const obstacleConfig = OBSTACLE_TYPES[currentObstacleType as keyof typeof OBSTACLE_TYPES];
            polygonOptions = {
                fillColor: obstacleConfig?.color || '#FF0000',
                strokeColor: obstacleConfig?.color || '#FF0000',
                fillOpacity: 0.4,
                strokeWeight: 2,
                zIndex: 3,
            };
        }

        const newDrawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false,
            polygonOptions: { ...polygonOptions, clickable: false, editable: false },
        });

        newDrawingManager.setMap(map);
        setDrawingManager(newDrawingManager);

        google.maps.event.clearListeners(newDrawingManager, 'overlaycomplete');
        google.maps.event.addListener(newDrawingManager, 'overlaycomplete', (event: google.maps.drawing.OverlayCompleteEvent) => {
            newDrawingManager.setDrawingMode(null);
            onDrawCreated(event.overlay, event.type);
        });

    }, [map, drawingMode, currentZoneColor, currentObstacleType]);

    const startDrawing = () => {
        if (drawingManager && drawingMode) {
            drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
        }
    };
    
    const stopDrawing = () => {
        if(drawingManager) {
            drawingManager.setDrawingMode(null);
        }
    }

    return (
        <>
            <div ref={ref} style={{ width: '100%', height: '100%' }} />
            <div className="absolute left-2 top-2 z-10 max-w-xs rounded-md border border-white p-2 shadow-md" style={{backgroundColor: '#000005'}}>
                <div className="flex flex-col space-y-1">
                    <div className="text-xs font-semibold text-white">ขั้นตอนที่ 2: วาดโซนและสิ่งกีดขวาง</div>
                     {drawingMode ? (
                        <>
                            <button onClick={startDrawing} className={`rounded border border-white px-2 py-1 text-xs text-white transition-colors ${drawingMode === 'zone' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'}`}>
                                {drawingMode === 'zone' ? '🎨 วาดโซน' : '🚫 วาดสิ่งกีดขวาง'}
                            </button>
                             <button onClick={stopDrawing} className="rounded border border-white bg-gray-500 px-2 py-1 text-xs text-white hover:bg-gray-600">
                                ⏹️ หยุดวาด
                            </button>
                        </>
                     ) : <p className="text-xs text-gray-400">เลือกโหมดวาดจากแผงควบคุม</p>}
                </div>
            </div>
        </>
    );
};


// --- Main Component: Step2_ZonesObstacles ---
export default function Step2_ZonesObstacles() {
    const mapState = useMapState();
    const stepWizard = useStepWizard();
    const fieldZoneState = useFieldZoneState();

    const { mapCenter, setMapCenter, mapZoom, setMapZoom, mapType } = mapState;
    const { setCurrentStep, setStepCompleted } = stepWizard;
    const { selectedCrops, mainField, setMainField, zones, setZones, obstacles, setObstacles, zoneAssignments, setZoneAssignments } = fieldZoneState;

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Step 2 specific state
    const [drawingMode, setDrawingMode] = useState<'zone' | 'obstacle' | null>('zone');
    const [currentZoneColor, setCurrentZoneColor] = useState(ZONE_COLORS[0]);
    const [currentObstacleType, setCurrentObstacleType] = useState('building');
    const [usedColors, setUsedColors] = useState<string[]>([]);
    
    const [showPlantSelector, setShowPlantSelector] = useState(false);
    const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
    const selectedCropObjects = selectedCrops.map(cropValue => getCropByValue(cropValue)).filter((c): c is Crop => c !== undefined);

    // Load data from localStorage on mount
    useEffect(() => {
        const savedData = localStorage.getItem('fieldMapData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                if (!data.mainField || !data.mainField.coordinates) {
                    handleError("ไม่พบข้อมูลขอบเขตแปลง กรุณากลับไปขั้นตอนที่ 1");
                    router.visit('/step1-field-area');
                    return;
                }
                
                setMapCenter(data.mapCenter || [13.7563, 100.5018]);
                setMapZoom(data.mapZoom || 15);
                if(data.selectedCrops) fieldZoneState.setSelectedCrops(data.selectedCrops);
                // Zones and obstacles will be restored in a separate useEffect after the map loads
            } catch (e) {
                console.error("Failed to parse saved data", e);
                handleError("ข้อมูลที่บันทึกไว้เสียหาย");
            }
        } else {
            handleError("ไม่พบข้อมูลโครงการ กรุณาเริ่มจากขั้นตอนที่ 1");
            router.visit('/step1-field-area');
        }
        setCurrentStep(2);
    }, []);

    // Restore map objects after map is loaded
    useEffect(() => {
        if (!map) return;

        const savedData = localStorage.getItem('fieldMapData');
        if (!savedData) return;

        try {
            const data = JSON.parse(savedData);
            
            // Restore Main Field
            if (data.mainField && data.mainField.coordinates) {
                const fieldPolygon = new google.maps.Polygon({
                    paths: data.mainField.coordinates,
                    fillColor: '#22C55E', fillOpacity: 0.1, strokeColor: '#22C55E',
                    strokeWeight: 3, clickable: false, editable: false, zIndex: 1, map: map,
                });
                 setMainField({ polygon: fieldPolygon, coordinates: data.mainField.coordinates, area: data.fieldAreaSize });
            }

            // Restore Zones
            if (data.zones && Array.isArray(data.zones)) {
                const restoredZones: Zone[] = [];
                const restoredUsedColors: string[] = [];
                data.zones.forEach((zoneData: any) => {
                    const zonePolygon = new google.maps.Polygon({
                        paths: zoneData.coordinates,
                        fillColor: zoneData.color, strokeColor: zoneData.color,
                        fillOpacity: 0.3, strokeWeight: 2, zIndex: 2, map: map, clickable: true,
                    });
                    const zone: Zone = { ...zoneData, polygon: zonePolygon };
                    google.maps.event.addListener(zonePolygon, 'click', () => handleZoneClick(zone));
                    restoredZones.push(zone);
                    restoredUsedColors.push(zoneData.color);
                });
                setZones(restoredZones);
                setUsedColors(restoredUsedColors);
            }
            
            // Restore Obstacles
            if (data.obstacles && Array.isArray(data.obstacles)) {
                const restoredObstacles: Obstacle[] = data.obstacles.map((obsData: any) => {
                     const obstacleConfig = OBSTACLE_TYPES[obsData.type as keyof typeof OBSTACLE_TYPES];
                     const obstaclePolygon = new google.maps.Polygon({
                        paths: obsData.coordinates,
                        fillColor: obstacleConfig?.color || '#FF0000',
                        strokeColor: obstacleConfig?.color || '#FF0000',
                        fillOpacity: 0.4, strokeWeight: 2, zIndex: 3, map: map, clickable: false,
                    });
                    return { ...obsData, polygon: obstaclePolygon };
                });
                setObstacles(restoredObstacles);
            }

        } catch (e) {
            console.error("Failed to restore map objects", e);
        }

    }, [map]);

    const handleError = useCallback((msg: string) => {
        setError(msg);
        setTimeout(() => setError(null), 5000);
    }, []);

    const pathToCoordinates = useCallback((path: google.maps.MVCArray<google.maps.LatLng>): Coordinate[] => {
        return path.getArray().map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() }));
    }, []);

    const handleZoneClick = (zone: Zone) => {
        setSelectedZone(zone);
        setShowPlantSelector(true);
    };

    const handleDrawCreated = useCallback((overlay: google.maps.MVCObject) => {
        const polygon = overlay as google.maps.Polygon;
        const coordinates = pathToCoordinates(polygon.getPath());
        
        if (drawingMode === 'zone') {
            const newZone: Zone = {
                id: Date.now(),
                polygon,
                coordinates,
                color: currentZoneColor,
                name: `โซน ${zones.length + 1}`,
            };
            setZones(prev => [...prev, newZone]);
            setUsedColors(prev => [...prev, currentZoneColor]);
            
            const nextColor = ZONE_COLORS.find(c => ![...usedColors, currentZoneColor].includes(c)) || ZONE_COLORS[0];
            setCurrentZoneColor(nextColor);
            
            google.maps.event.addListener(polygon, 'click', () => handleZoneClick(newZone));

        } else if (drawingMode === 'obstacle') {
            const obstacleConfig = OBSTACLE_TYPES[currentObstacleType as keyof typeof OBSTACLE_TYPES];
            const newObstacle: Obstacle = {
                id: Date.now(),
                polygon,
                coordinates,
                type: currentObstacleType,
                name: `${obstacleConfig.name} ${obstacles.length + 1}`,
            };
            setObstacles(prev => [...prev, newObstacle]);
        }
    }, [drawingMode, currentZoneColor, currentObstacleType, zones.length, obstacles.length, usedColors]);
    
    const assignPlantToZone = (zoneId: string, cropValue: string) => {
        setZoneAssignments(prev => ({ ...prev, [zoneId]: cropValue }));
        setShowPlantSelector(false);
        setSelectedZone(null);
    };
    
    const removePlantFromZone = (zoneId: string) => {
        setZoneAssignments(prev => {
            const newAssignments = { ...prev };
            delete newAssignments[zoneId];
            return newAssignments;
        });
    };
    
    const deleteZone = (zoneId: string) => {
        const zoneToDelete = zones.find(z => z.id.toString() === zoneId);
        if (zoneToDelete) {
            zoneToDelete.polygon.setMap(null);
            setZones(prev => prev.filter(z => z.id.toString() !== zoneId));
            removePlantFromZone(zoneId);
        }
    };

    const goToNextStep = () => {
        if (zones.length === 0) {
            handleError("กรุณาวาดโซนอย่างน้อย 1 โซน");
            return;
        }
        if (Object.keys(zoneAssignments).length !== zones.length) {
            handleError("กรุณากำหนดพืชให้กับทุกโซน");
            return;
        }

        const savedData = JSON.parse(localStorage.getItem('fieldMapData') || '{}');
        const dataToSave = {
            ...savedData,
            zones: zones.map(z => ({ id: z.id, coordinates: z.coordinates, color: z.color, name: z.name })),
            obstacles: obstacles.map(o => ({ id: o.id, coordinates: o.coordinates, type: o.type, name: o.name })),
            zoneAssignments,
        };
        localStorage.setItem('fieldMapData', JSON.stringify(dataToSave));
        setStepCompleted(prev => ({ ...prev, 2: true }));
        router.visit('/step3-pipe-system');
    };

    return (
        <ErrorBoundary>
            <div className="flex h-screen flex-col overflow-hidden text-white" style={{backgroundColor: '#000005'}}>
                <Head title="ขั้นตอนที่ 2: กำหนดโซน" />
                <Navbar />
                {error && <ErrorMessage title="เกิดข้อผิดพลาด" message={error} onDismiss={() => setError(null)} />}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel */}
                    <div className="w-96 border-r border-white" style={{backgroundColor: '#000005'}}>
                        <div className="flex h-full flex-col">
                            <div className="border-b border-white p-3">
                                <h3 className="text-lg font-semibold">ขั้นตอนที่ 2: กำหนดโซนและสิ่งกีดขวาง</h3>
                                <p className="text-sm text-gray-400">แบ่งพื้นที่และระบุสิ่งกีดขวาง</p>
                            </div>
                            <div className="flex-1 space-y-4 overflow-y-auto p-4">
                                {/* Drawing Mode Selector */}
                                <div className="rounded-lg border border-white p-3">
                                    <div className="mb-2 text-sm font-semibold">โหมดการวาด</div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setDrawingMode('zone')} className={`flex-1 rounded px-3 py-2 text-xs ${drawingMode === 'zone' ? 'bg-blue-600' : 'bg-gray-600'}`}>🎨 วาดโซน</button>
                                        <button onClick={() => setDrawingMode('obstacle')} className={`flex-1 rounded px-3 py-2 text-xs ${drawingMode === 'obstacle' ? 'bg-red-600' : 'bg-gray-600'}`}>🚫 วาดสิ่งกีดขวาง</button>
                                    </div>
                                    {drawingMode === 'obstacle' && (
                                        <div className="mt-2">
                                            <label className="text-xs text-gray-400">ประเภท:</label>
                                            <select value={currentObstacleType} onChange={e => setCurrentObstacleType(e.target.value)} className="w-full mt-1 rounded bg-gray-700 p-1 text-xs">
                                                {Object.entries(OBSTACLE_TYPES).map(([key, value]) => (
                                                    <option key={key} value={key}>{value.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Zones List */}
                                <div className="rounded-lg border border-white p-3">
                                    <div className="mb-2 text-sm font-semibold">รายการโซน ({zones.length})</div>
                                    <div className="max-h-40 space-y-2 overflow-y-auto">
                                        {zones.map(zone => (
                                            <div key={zone.id} className="flex items-center justify-between rounded bg-gray-700 p-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: zone.color }}></div>
                                                    <span className="text-xs">{zone.name}: {zoneAssignments[zone.id.toString()] ? getCropByValue(zoneAssignments[zone.id.toString()])?.name : 'ยังไม่กำหนดพืช'}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                     <button onClick={() => handleZoneClick(zone)} className="text-xs text-blue-400 hover:underline">แก้ไข</button>
                                                     <button onClick={() => deleteZone(zone.id.toString())} className="text-xs text-red-400 hover:underline">ลบ</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-white p-4 flex gap-2">
                                <Link href="/step1-field-area" className="w-1/2 text-center rounded bg-gray-600 px-4 py-3 text-sm font-semibold hover:bg-gray-700">ย้อนกลับ</Link>
                                <button onClick={goToNextStep} className="w-1/2 rounded bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-700">ขั้นตอนถัดไป</button>
                            </div>
                        </div>
                    </div>
                    {/* Map Area */}
                    <div className="relative flex-1">
                        <Wrapper apiKey={getGoogleMapsConfig().apiKey} render={status => (status === Status.LOADING ? <LoadingSpinner /> : <div />)} libraries={['drawing', 'geometry', 'places']}>
                            <GoogleMapComponent
                                center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                                zoom={mapZoom}
                                mapType={mapType}
                                onLoad={setMap}
                                onDrawCreated={handleDrawCreated}
                                drawingMode={drawingMode}
                                currentZoneColor={currentZoneColor}
                                currentObstacleType={currentObstacleType}
                                onZoneClick={handleZoneClick}
                            />
                        </Wrapper>
                    </div>
                </div>
                
                {/* Plant Selector Modal */}
                {showPlantSelector && selectedZone && (
                     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                        <div className="w-full max-w-md rounded-lg border border-white bg-gray-800 p-6">
                            <h3 className="mb-4 text-lg font-semibold">เลือกพืชสำหรับ {selectedZone.name}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {selectedCropObjects.map(crop => (
                                    <button key={crop.value} onClick={() => assignPlantToZone(selectedZone.id.toString(), crop.value)}
                                        className={`rounded-lg p-4 text-center transition-colors ${zoneAssignments[selectedZone.id.toString()] === crop.value ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                        <div className="text-3xl">{crop.icon}</div>
                                        <div className="mt-1 text-sm">{crop.name}</div>
                                    </button>
                                ))}
                            </div>
                             <div className="mt-6 flex justify-end gap-4">
                                <button onClick={() => { setShowPlantSelector(false); setSelectedZone(null); }} className="rounded bg-gray-600 px-4 py-2 text-sm">ปิด</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
}
