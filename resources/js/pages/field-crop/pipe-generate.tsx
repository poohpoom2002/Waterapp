/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../../components/Navbar';
import { Head, Link, router } from '@inertiajs/react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { getCropByValue } from '@/pages/utils/cropData';
import { PIPE_TYPES, EQUIPMENT_TYPES, type EquipmentType } from '@/pages/utils/fieldMapConstants';
import { useMapState, useStepWizard, useFieldZoneState, usePipeSystemState, useEquipmentState } from '@/pages/hooks/useFieldMapState';
import ErrorBoundary from '@/pages/components/ErrorBoundary';
import ErrorMessage from '@/pages/components/ErrorMessage';
import LoadingSpinner from '@/pages/components/LoadingSpinner';

// --- Interfaces ---
interface Coordinate {
    lat: number;
    lng: number;
}

interface Pipe {
    id: number | string;
    polyline: google.maps.Polyline;
    coordinates: Coordinate[];
    type: string;
    name: string;
}

interface Equipment {
    id: string;
    type: string;
    lat: number;
    lng: number;
    name: string;
    marker?: google.maps.Marker;
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
    onMapClick: (e: google.maps.MapMouseEvent) => void;
    drawingMode: 'pipe' | 'equipment' | null;
    currentPipeType: string;
    isPlacingEquipment: boolean;
}

const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
    center, zoom, mapType, onLoad, onDrawCreated, onMapClick, drawingMode, currentPipeType, isPlacingEquipment
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map>();
    const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager>();

    useEffect(() => {
        if (ref.current && !map) {
            const newMap = new google.maps.Map(ref.current, {
                center, zoom, mapTypeId: mapType,
                mapTypeControl: false, streetViewControl: false, fullscreenControl: false, zoomControl: false, gestureHandling: 'greedy',
            });
            onLoad(newMap);
            setMap(newMap);
            
            const clickListener = google.maps.event.addListener(newMap, 'click', (e: google.maps.MapMouseEvent) => {
                onMapClick(e);
            });
            // Clean up listener on unmount
            return () => google.maps.event.removeListener(clickListener);
        }
    }, [ref, map, onMapClick]);

    useEffect(() => {
        if (!map) return;

        if (drawingManager) drawingManager.setMap(null);

        const pipeConfig = PIPE_TYPES[currentPipeType as keyof typeof PIPE_TYPES];
        const newDrawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false,
            polylineOptions: {
                strokeColor: pipeConfig?.color || '#3388ff',
                strokeWeight: pipeConfig?.weight || 4,
                zIndex: 5,
            },
        });

        newDrawingManager.setMap(map);
        setDrawingManager(newDrawingManager);

        google.maps.event.clearListeners(newDrawingManager, 'overlaycomplete');
        google.maps.event.addListener(newDrawingManager, 'overlaycomplete', (event: google.maps.drawing.OverlayCompleteEvent) => {
            newDrawingManager.setDrawingMode(null);
            onDrawCreated(event.overlay, event.type);
        });

    }, [map, drawingMode, currentPipeType]);
    
    useEffect(() => {
        if (map) {
            map.setOptions({ draggableCursor: isPlacingEquipment ? 'crosshair' : null });
        }
    }, [map, isPlacingEquipment]);

    const startDrawing = () => {
        if (drawingManager && drawingMode === 'pipe') {
            drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYLINE);
        }
    };
    
    const stopDrawing = () => {
        if (drawingManager) {
            drawingManager.setDrawingMode(null);
        }
    };

    return (
        <>
            <div ref={ref} style={{ width: '100%', height: '100%' }} />
            <div className="absolute left-2 top-2 z-10 max-w-xs rounded-md border border-white p-2 shadow-md" style={{backgroundColor: '#000005'}}>
                <div className="flex flex-col space-y-1">
                    <div className="text-xs font-semibold text-white">ขั้นตอนที่ 3: ออกแบบระบบท่อ</div>
                    {drawingMode === 'pipe' && (
                         <button onClick={startDrawing} className="rounded border border-white bg-purple-500 px-2 py-1 text-xs text-white hover:bg-purple-600">
                            🔧 วาดเส้นท่อ ({PIPE_TYPES[currentPipeType as keyof typeof PIPE_TYPES]?.name})
                        </button>
                    )}
                    {isPlacingEquipment && (
                        <div className="rounded border border-white bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                           วางอุปกรณ์: คลิกบนแผนที่...
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

// --- Main Component: Step3_PipeSystem ---
export default function Step3_PipeSystem() {
    const mapState = useMapState();
    const stepWizard = useStepWizard();
    const fieldZoneState = useFieldZoneState();
    const pipeSystemState = usePipeSystemState();
    const equipmentState = useEquipmentState();

    const { mapCenter, setMapCenter, mapZoom, setMapZoom, mapType } = mapState;
    const { setCurrentStep, setStepCompleted } = stepWizard;
    const { mainField, setMainField, zones, setZones, obstacles, setObstacles } = fieldZoneState;
    const { pipes, setPipes, currentPipeType, setCurrentPipeType } = pipeSystemState;
    const { equipmentIcons, setEquipmentIcons, isPlacingEquipment, setIsPlacingEquipment, selectedEquipmentType, setSelectedEquipmentType } = equipmentState;

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [drawingMode, setDrawingMode] = useState<'pipe' | 'equipment' | null>('pipe');

    // Load data from localStorage
    useEffect(() => {
        const savedData = localStorage.getItem('fieldMapData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                if (!data.mainField || !data.zones) {
                    router.visit('/step2-zones-obstacles');
                    return;
                }
                setMapCenter(data.mapCenter);
                setMapZoom(data.mapZoom);
            } catch (e) { router.visit('/step1-field-area'); }
        } else {
            router.visit('/step1-field-area');
        }
        setCurrentStep(3);
    }, []);

    // Restore map objects
    useEffect(() => {
        if (!map) return;
        const savedData = localStorage.getItem('fieldMapData');
        if (!savedData) return;
        try {
            const data = JSON.parse(savedData);
            // Restore Field, Zones, Obstacles as non-interactive layers
            if (data.mainField) new google.maps.Polygon({ paths: data.mainField.coordinates, map, fillColor: '#22C55E', fillOpacity: 0.1, strokeColor: '#22C55E', strokeWeight: 3, zIndex: 1 });
            if (data.zones) data.zones.forEach((z: any) => new google.maps.Polygon({ paths: z.coordinates, map, fillColor: z.color, fillOpacity: 0.2, strokeColor: z.color, strokeWeight: 1, zIndex: 2 }));
            if (data.obstacles) data.obstacles.forEach((o: any) => new google.maps.Polygon({ paths: o.coordinates, map, fillColor: '#8B5CF6', fillOpacity: 0.3, strokeColor: '#8B5CF6', strokeWeight: 1, zIndex: 3 }));

            // Restore Pipes
            if (data.pipes) {
                const restoredPipes = data.pipes.map((pipeData: any) => {
                    const pipeConfig = PIPE_TYPES[pipeData.type as keyof typeof PIPE_TYPES];
                    const polyline = new google.maps.Polyline({
                        path: pipeData.coordinates,
                        strokeColor: pipeConfig?.color,
                        strokeWeight: pipeConfig?.weight,
                        map: map,
                        zIndex: 5,
                    });
                    return { ...pipeData, polyline };
                });
                setPipes(restoredPipes);
            }
            // Restore Equipment
            if (data.equipmentIcons) {
                 const restoredEquipment = data.equipmentIcons.map((eqData: any) => {
                    const marker = new google.maps.Marker({
                        position: { lat: eqData.lat, lng: eqData.lng },
                        map: map,
                        title: eqData.name,
                        icon: createEquipmentMarkerIcon(eqData.type),
                    });
                    return { ...eqData, marker };
                });
                setEquipmentIcons(restoredEquipment);
            }
        } catch (e) { console.error("Failed to restore map objects", e); }
    }, [map]);

    const pathToCoordinates = useCallback((path: google.maps.MVCArray<google.maps.LatLng>): Coordinate[] => {
        return path.getArray().map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() }));
    }, []);

    const createEquipmentMarkerIcon = (equipmentType: EquipmentType) => {
        const config = EQUIPMENT_TYPES[equipmentType];
        return {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${config.color}" width="32px" height="32px"><path d="M0 0h24v24H0z" fill="none"/><text x="12" y="18" font-size="20" text-anchor="middle">${config.icon}</text></svg>`
            )}`,
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
        };
    };

    const handleDrawCreated = useCallback((overlay: google.maps.MVCObject) => {
        const polyline = overlay as google.maps.Polyline;
        const coordinates = pathToCoordinates(polyline.getPath());
        const pipeConfig = PIPE_TYPES[currentPipeType as keyof typeof PIPE_TYPES];
        const newPipe: Pipe = {
            id: Date.now(),
            polyline,
            coordinates,
            type: currentPipeType,
            name: `${pipeConfig.name} ${pipes.filter(p => p.type === currentPipeType).length + 1}`,
        };
        setPipes(prev => [...prev, newPipe]);
    }, [currentPipeType, pipes, setPipes]);

    const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (isPlacingEquipment && selectedEquipmentType && e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            const config = EQUIPMENT_TYPES[selectedEquipmentType];
            const newEquipment: Equipment = {
                id: `${selectedEquipmentType}-${Date.now()}`,
                type: selectedEquipmentType,
                lat, lng,
                name: `${config.name} ${equipmentIcons.filter(eq => eq.type === selectedEquipmentType).length + 1}`,
            };
            const marker = new google.maps.Marker({
                position: { lat, lng },
                map,
                title: newEquipment.name,
                icon: createEquipmentMarkerIcon(selectedEquipmentType)
            });
            newEquipment.marker = marker;
            setEquipmentIcons(prev => [...prev, newEquipment]);
            setIsPlacingEquipment(false);
            setSelectedEquipmentType(null);
            setDrawingMode('pipe'); // Switch back to pipe drawing mode
        }
    }, [isPlacingEquipment, selectedEquipmentType, map, equipmentIcons]);

    const startPlacingEquipment = (type: EquipmentType) => {
        setSelectedEquipmentType(type);
        setIsPlacingEquipment(true);
        setDrawingMode('equipment');
    };
    
    const deletePipe = (id: string | number) => {
        const pipeToDelete = pipes.find(p => p.id === id);
        if(pipeToDelete) {
            pipeToDelete.polyline.setMap(null);
            setPipes(prev => prev.filter(p => p.id !== id));
        }
    };
    
    const deleteEquipment = (id: string) => {
        const eqToDelete = equipmentIcons.find(eq => eq.id === id);
        if(eqToDelete && eqToDelete.marker) {
            eqToDelete.marker.setMap(null);
            setEquipmentIcons(prev => prev.filter(eq => eq.id !== id));
        }
    };

    const goToNextStep = () => {
        if (pipes.filter(p => p.type === 'main').length === 0) {
            setError("กรุณาวาดท่อเมนอย่างน้อย 1 เส้น");
            return;
        }
        const savedData = JSON.parse(localStorage.getItem('fieldMapData') || '{}');
        const dataToSave = {
            ...savedData,
            pipes: pipes.map(p => ({ id: p.id, coordinates: p.coordinates, type: p.type, name: p.name })),
            equipmentIcons: equipmentIcons.map(eq => ({ id: eq.id, type: eq.type, lat: eq.lat, lng: eq.lng, name: eq.name })),
        };
        localStorage.setItem('fieldMapData', JSON.stringify(dataToSave));
        setStepCompleted(prev => ({ ...prev, 3: true }));
        router.visit('/step4-irrigation-system');
    };

    return (
        <ErrorBoundary>
            <div className="flex h-screen flex-col overflow-hidden text-white" style={{backgroundColor: '#000005'}}>
                <Head title="ขั้นตอนที่ 3: ออกแบบระบบท่อ" />
                <Navbar />
                {error && <ErrorMessage title="เกิดข้อผิดพลาด" message={error} onDismiss={() => setError(null)} />}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel */}
                    <div className="w-96 border-r border-white" style={{backgroundColor: '#000005'}}>
                        <div className="flex h-full flex-col">
                            <div className="border-b border-white p-3">
                                <h3 className="text-lg font-semibold">ขั้นตอนที่ 3: ออกแบบระบบท่อและอุปกรณ์</h3>
                            </div>
                            <div className="flex-1 space-y-4 overflow-y-auto p-4">
                                {/* Pipe Tools */}
                                <div className="rounded-lg border border-white p-3">
                                    <div className="mb-2 text-sm font-semibold">วาดเส้นท่อ</div>
                                    <div className="flex flex-col gap-2">
                                        {Object.entries(PIPE_TYPES).map(([key, value]) => (
                                            <button key={key} onClick={() => { setCurrentPipeType(key as "main" | "submain" | "lateral"); setDrawingMode('pipe'); setIsPlacingEquipment(false); }} 
                                                className={`rounded px-3 py-2 text-left text-xs ${currentPipeType === key && drawingMode === 'pipe' ? 'bg-purple-600' : 'bg-gray-600'}`}>
                                                <span style={{color: value.color}} className="font-bold">■</span> {value.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Equipment Tools */}
                                <div className="rounded-lg border border-white p-3">
                                    <div className="mb-2 text-sm font-semibold">วางอุปกรณ์</div>
                                    <div className="flex flex-col gap-2">
                                        {Object.entries(EQUIPMENT_TYPES).map(([key, value]) => (
                                            <button key={key} onClick={() => startPlacingEquipment(key as EquipmentType)}
                                                className={`rounded px-3 py-2 text-left text-xs ${selectedEquipmentType === key ? 'bg-yellow-600' : 'bg-gray-600'}`}>
                                                {value.icon} {value.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Lists */}
                                <div className="rounded-lg border border-white p-3">
                                     <div className="mb-2 text-sm font-semibold">รายการท่อ ({pipes.length})</div>
                                     <div className="max-h-24 space-y-1 overflow-y-auto">
                                         {pipes.map(p => <div key={p.id} className="flex justify-between items-center text-xs bg-gray-700 p-1 rounded"><span>{p.name}</span><button onClick={() => deletePipe(p.id)} className="text-red-400">ลบ</button></div>)}
                                     </div>
                                </div>
                                <div className="rounded-lg border border-white p-3">
                                     <div className="mb-2 text-sm font-semibold">รายการอุปกรณ์ ({equipmentIcons.length})</div>
                                     <div className="max-h-24 space-y-1 overflow-y-auto">
                                         {equipmentIcons.map(eq => <div key={eq.id} className="flex justify-between items-center text-xs bg-gray-700 p-1 rounded"><span>{eq.name}</span><button onClick={() => deleteEquipment(eq.id)} className="text-red-400">ลบ</button></div>)}
                                     </div>
                                </div>
                            </div>
                            <div className="border-t border-white p-4 flex gap-2">
                                <Link href="/step2-zones-obstacles" className="w-1/2 text-center rounded bg-gray-600 px-4 py-3 text-sm font-semibold hover:bg-gray-700">ย้อนกลับ</Link>
                                <button onClick={goToNextStep} className="w-1/2 rounded bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-700">ขั้นตอนถัดไป</button>
                            </div>
                        </div>
                    </div>
                    {/* Map Area */}
                    <div className="relative flex-1">
                        <Wrapper apiKey={getGoogleMapsConfig().apiKey} render={status => (status === Status.LOADING ? <LoadingSpinner /> : <div />)} libraries={['drawing', 'geometry']}>
                            <GoogleMapComponent
                                center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                                zoom={mapZoom}
                                mapType={mapType}
                                onLoad={setMap}
                                onDrawCreated={handleDrawCreated}
                                onMapClick={handleMapClick}
                                drawingMode={drawingMode}
                                currentPipeType={currentPipeType}
                                isPlacingEquipment={isPlacingEquipment}
                            />
                        </Wrapper>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}
