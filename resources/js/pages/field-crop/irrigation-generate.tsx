/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../../components/Navbar';
import { Head, Link, router } from '@inertiajs/react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { getCropByValue } from '@/pages/utils/cropData';
import { PIPE_TYPES, EQUIPMENT_TYPES, ZONE_COLORS } from '@/pages/utils/fieldMapConstants';
import { useMapState, useStepWizard, useFieldZoneState, usePipeSystemState, useEquipmentState, useIrrigationState } from '@/pages/hooks/useFieldMapState';
import ErrorBoundary from '@/pages/components/ErrorBoundary';
import ErrorMessage from '@/pages/components/ErrorMessage';
import LoadingSpinner from '@/pages/components/LoadingSpinner';

// --- Interfaces ---
interface Coordinate { lat: number; lng: number; }
interface Zone { id: string | number; coordinates: Coordinate[]; color: string; name: string; polygon?: google.maps.Polygon; }
interface Pipe { id: string | number; coordinates: Coordinate[]; type: string; name: string; zoneId?: string | number; }
interface Equipment { id: string; type: string; lat: number; lng: number; name: string; }
interface IrrigationPoint { id: string | number; lat: number; lng: number; type: string; radius: number; zoneId: string | number; marker?: google.maps.Marker; circle?: google.maps.Circle; }

// --- Google Maps Configuration ---
const getGoogleMapsConfig = () => ({
    apiKey: import.meta.env.VITE_Maps_API_KEY || '',
    libraries: ['geometry', 'places'] as const,
});

// --- GoogleMapComponent ---
interface GoogleMapComponentProps {
    center: google.maps.LatLngLiteral;
    zoom: number;
    mapType: string;
    onLoad: (map: google.maps.Map) => void;
}

const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({ center, zoom, mapType, onLoad }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map>();

    useEffect(() => {
        if (ref.current && !map) {
            const newMap = new google.maps.Map(ref.current, {
                center, zoom, mapTypeId: mapType,
                mapTypeControl: false, streetViewControl: false, fullscreenControl: false, zoomControl: false, gestureHandling: 'greedy',
            });
            onLoad(newMap);
            setMap(newMap);
        }
    }, [ref, map]);

    useEffect(() => {
        if(map) {
            map.setCenter(center);
            map.setZoom(zoom);
        }
    }, [map, center, zoom]);

    return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
};


// --- Main Component: Step4_IrrigationSystem ---
export default function Step4_IrrigationSystem() {
    const mapState = useMapState();
    const stepWizard = useStepWizard();
    const fieldZoneState = useFieldZoneState();
    const pipeSystemState = usePipeSystemState();
    const equipmentState = useEquipmentState();
    const irrigationState = useIrrigationState();

    const { mapCenter, setMapCenter, mapZoom, setMapZoom, mapType } = mapState;
    const { setCurrentStep, setStepCompleted } = stepWizard;
    const { zones, setZones, zoneAssignments, setZoneAssignments } = fieldZoneState;
    const { pipes, setPipes } = pipeSystemState;
    const { equipmentIcons, setEquipmentIcons } = equipmentState;
    const { irrigationPoints, setIrrigationPoints, irrigationAssignments, setIrrigationAssignments, irrigationRadius, setIrrigationRadius, sprinklerOverlap, setSprinklerOverlap } = irrigationState;

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [projectData, setProjectData] = useState<any>(null);

    // Load all project data from localStorage
    useEffect(() => {
        const savedData = localStorage.getItem('fieldMapData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                if (!data.mainField || !data.zones || !data.pipes) {
                    router.visit('/step3-pipe-system');
                    return;
                }
                setProjectData(data);
                setMapCenter(data.mapCenter);
                setMapZoom(data.mapZoom);
                setZones(data.zones || []);
                setZoneAssignments(data.zoneAssignments || {});
                setPipes(data.pipes || []);
                setEquipmentIcons(data.equipmentIcons || []);
                setIrrigationAssignments(data.irrigationAssignments || {});
                setIrrigationRadius(data.irrigationRadius || {});
                setSprinklerOverlap(data.sprinklerOverlap || {});

            } catch (e) { router.visit('/step1-field-area'); }
        } else {
            router.visit('/step1-field-area');
        }
        setCurrentStep(4);
    }, []);

    // Restore map objects
    useEffect(() => {
        if (!map || !projectData) return;

        // Clear previous irrigation points before restoring
        irrigationPoints.forEach(p => {
            p.marker?.setMap(null);
            p.circle?.setMap(null);
        });
        setIrrigationPoints([]);

        // Restore static layers
        new google.maps.Polygon({ paths: projectData.mainField.coordinates, map, fillColor: '#22C55E', fillOpacity: 0.1, strokeColor: '#22C55E', strokeWeight: 3, zIndex: 1 });
        projectData.zones.forEach((z: any) => new google.maps.Polygon({ paths: z.coordinates, map, fillColor: z.color, fillOpacity: 0.2, strokeColor: z.color, strokeWeight: 1, zIndex: 2 }));
        projectData.pipes.forEach((p: any) => {
            const config = PIPE_TYPES[p.type as keyof typeof PIPE_TYPES];
            new google.maps.Polyline({ path: p.coordinates, map, strokeColor: config?.color, strokeWeight: config?.weight, zIndex: 5 });
        });
        projectData.equipmentIcons.forEach((eq: any) => {
            const config = EQUIPMENT_TYPES[eq.type as keyof typeof EQUIPMENT_TYPES];
            new google.maps.Marker({
                position: { lat: eq.lat, lng: eq.lng }, map, title: eq.name,
                icon: { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${config.color}" width="32px" height="32px"><text x="12" y="18" font-size="20" text-anchor="middle">${config.icon}</text></svg>`)}`, scaledSize: new google.maps.Size(32, 32), anchor: new google.maps.Point(16, 16) }
            });
        });
        
        // Restore irrigation points
        if(projectData.irrigationPoints){
            restoreIrrigationPoints(projectData.irrigationPoints);
        }

    }, [map, projectData]);
    
    const restoreIrrigationPoints = (pointsToRestore: any[]) => {
        if(!map) return;
        const restoredPoints: IrrigationPoint[] = pointsToRestore.map((pointData: any) => {
             const marker = new google.maps.Marker({
                position: { lat: pointData.lat, lng: pointData.lng },
                map,
                title: `${pointData.type} (Zone ${pointData.zoneId})`,
                icon: { path: google.maps.SymbolPath.CIRCLE, scale: 4, fillColor: '#0099ff', fillOpacity: 1, strokeColor: 'white', strokeWeight: 1 },
            });
            const circle = new google.maps.Circle({
                center: { lat: pointData.lat, lng: pointData.lng },
                radius: pointData.radius,
                map,
                fillColor: '#0099ff', fillOpacity: 0.1, strokeColor: '#0099ff', strokeWeight: 1,
            });
            return { ...pointData, marker, circle };
        });
        setIrrigationPoints(restoredPoints);
    };

    const generateIrrigationForZone = (zoneId: string | number) => {
        if (!map) return;
        const zone = zones.find(z => z.id === zoneId);
        const irrigationType = irrigationAssignments[zoneId.toString()];
        if (!zone || !irrigationType) {
            setError("กรุณาเลือกโซนและประเภทการให้น้ำ");
            return;
        }

        // Clear existing points for this zone first
        clearIrrigationForZone(zoneId, false);

        const newPoints: IrrigationPoint[] = [];
        const zonePipes = pipes.filter(p => p.type === 'lateral'); // Simplified: use all lateral pipes for now
        const radius = irrigationRadius[zoneId.toString()] || 8;
        const overlap = sprinklerOverlap[zoneId.toString()] || false;
        const spacing = radius * (overlap ? 1.5 : 2.0);

        const zonePolygon = new google.maps.Polygon({ paths: zone.coordinates });

        zonePipes.forEach(pipe => {
            for (let i = 0; i < pipe.coordinates.length - 1; i++) {
                const start = new google.maps.LatLng(pipe.coordinates[i]);
                const end = new google.maps.LatLng(pipe.coordinates[i+1]);
                const distance = google.maps.geometry.spherical.computeDistanceBetween(start, end);
                const numPoints = Math.floor(distance / spacing);

                for (let j = 0; j <= numPoints; j++) {
                    const pointLatLng = google.maps.geometry.spherical.interpolate(start, end, j / (numPoints || 1));
                    if (google.maps.geometry.poly.containsLocation(pointLatLng, zonePolygon)) {
                        const newPoint: IrrigationPoint = {
                            id: `${zoneId}-${i}-${j}`,
                            lat: pointLatLng.lat(),
                            lng: pointLatLng.lng(),
                            type: irrigationType,
                            radius: radius,
                            zoneId: zoneId,
                        };
                        
                        const marker = new google.maps.Marker({ position: pointLatLng, map, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 4, fillColor: '#0099ff', fillOpacity: 1, strokeColor: 'white', strokeWeight: 1 } });
                        const circle = new google.maps.Circle({ center: pointLatLng, radius, map, fillColor: '#0099ff', fillOpacity: 0.1, strokeColor: '#0099ff', strokeWeight: 1 });
                        
                        newPoint.marker = marker;
                        newPoint.circle = circle;
                        newPoints.push(newPoint);
                    }
                }
            }
        });
        setIrrigationPoints(prev => [...prev, ...newPoints]);
    };
    
    const clearIrrigationForZone = (zoneId: string | number, confirmFirst = true) => {
        if (confirmFirst && !confirm(`คุณต้องการล้างหัวจ่ายน้ำทั้งหมดในโซนนี้ใช่หรือไม่?`)) return;
        
        irrigationPoints.forEach(p => {
            if (p.zoneId === zoneId) {
                p.marker?.setMap(null);
                p.circle?.setMap(null);
            }
        });
        setIrrigationPoints(prev => prev.filter(p => p.zoneId !== zoneId));
    };
    
    const finishProject = () => {
        const savedData = JSON.parse(localStorage.getItem('fieldMapData') || '{}');
        const dataToSave = {
            ...savedData,
            irrigationAssignments,
            irrigationRadius,
            sprinklerOverlap,
            irrigationPoints: irrigationPoints.map(p => ({id: p.id, lat: p.lat, lng: p.lng, type: p.type, radius: p.radius, zoneId: p.zoneId})),
        };
        localStorage.setItem('fieldMapData', JSON.stringify(dataToSave));
        setStepCompleted(prev => ({ ...prev, 4: true }));
        router.visit('/field-crop-summary');
    };

    return (
        <ErrorBoundary>
            <div className="flex h-screen flex-col overflow-hidden text-white" style={{backgroundColor: '#000005'}}>
                <Head title="ขั้นตอนที่ 4: วางระบบจ่ายน้ำ" />
                <Navbar />
                {error && <ErrorMessage title="เกิดข้อผิดพลาด" message={error} onDismiss={() => setError(null)} />}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel */}
                    <div className="w-96 border-r border-white" style={{backgroundColor: '#000005'}}>
                        <div className="flex h-full flex-col">
                            <div className="border-b border-white p-3">
                                <h3 className="text-lg font-semibold">ขั้นตอนที่ 4: วางระบบจ่ายน้ำ</h3>
                            </div>
                            <div className="flex-1 space-y-4 overflow-y-auto p-4">
                                {zones.map(zone => (
                                    <div key={zone.id} className="rounded-lg border border-white p-3">
                                        <h4 className="text-sm font-semibold" style={{color: zone.color}}>■ {zone.name}</h4>
                                        <div className="mt-2 space-y-2 text-xs">
                                            <div>
                                                <label>ประเภทการให้น้ำ:</label>
                                                <select value={irrigationAssignments[zone.id.toString()] || ''} 
                                                    onChange={e => setIrrigationAssignments(prev => ({...prev, [zone.id]: e.target.value}))}
                                                    className="w-full mt-1 rounded bg-gray-700 p-1">
                                                    <option value="">-- เลือก --</option>
                                                    <option value="sprinkler">สปริงเกลอร์</option>
                                                    <option value="drip-tape">น้ำหยด</option>
                                                </select>
                                            </div>
                                            {irrigationAssignments[zone.id.toString()] === 'sprinkler' && (
                                                <>
                                                    <div>
                                                        <label>รัศมี (เมตร): {irrigationRadius[zone.id.toString()] || 8}</label>
                                                        <input type="range" min="1" max="20" value={irrigationRadius[zone.id.toString()] || 8}
                                                            onChange={e => setIrrigationRadius(prev => ({...prev, [zone.id]: parseInt(e.target.value)}))}
                                                            className="w-full" />
                                                    </div>
                                                    <div>
                                                        <label className="flex items-center gap-2">
                                                            <input type="checkbox" checked={sprinklerOverlap[zone.id.toString()] || false}
                                                                onChange={e => setSprinklerOverlap(prev => ({...prev, [zone.id]: e.target.checked}))} />
                                                            ระยะซ้อนทับ (Overlap)
                                                        </label>
                                                    </div>
                                                </>
                                            )}
                                            <div className="flex gap-2 mt-2">
                                                <button onClick={() => generateIrrigationForZone(zone.id)} className="flex-1 rounded bg-green-600 px-3 py-1 hover:bg-green-700">สร้าง</button>
                                                <button onClick={() => clearIrrigationForZone(zone.id)} className="flex-1 rounded bg-red-600 px-3 py-1 hover:bg-red-700">ล้าง</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-white p-4 flex gap-2">
                                <Link href="/step3-pipe-system" className="w-1/2 text-center rounded bg-gray-600 px-4 py-3 text-sm font-semibold hover:bg-gray-700">ย้อนกลับ</Link>
                                <button onClick={finishProject} className="w-1/2 rounded bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-700">เสร็จสิ้นและดูสรุป</button>
                            </div>
                        </div>
                    </div>
                    {/* Map Area */}
                    <div className="relative flex-1">
                        <Wrapper apiKey={getGoogleMapsConfig().apiKey} render={status => (status === Status.LOADING ? <LoadingSpinner /> : <div />)} libraries={['geometry']}>
                            <GoogleMapComponent
                                center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                                zoom={mapZoom}
                                mapType={mapType}
                                onLoad={setMap}
                            />
                        </Wrapper>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}
