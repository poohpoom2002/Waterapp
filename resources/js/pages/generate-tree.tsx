import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    Polygon,
    useMap,
    FeatureGroup,
    LayersControl,
    Polyline,
    Marker,
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { router } from '@inertiajs/react';
import L from 'leaflet';
import { LeafletMouseEvent } from 'leaflet';
import { usePipeLengthData } from '../utils/pipeData';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create pump icon with custom image (replace with your pump image URL)
const createPumpIconWithImage = (imageUrl: string = '/generateTree/wtpump.png') => {
    return L.icon({
        iconUrl: imageUrl,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24],
    });
};

// Create valve icons with custom images
const createSolenoidValveIconWithImage = (imageUrl: string = '/generateTree/solv.png') => {
    return L.icon({
        iconUrl: imageUrl,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24],
    });
};

const createBallValveIconWithImage = (imageUrl: string = '/generateTree/ballv.png') => {
    return L.icon({
        iconUrl: imageUrl,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24],
    });
};

const pumpIcon = createPumpIconWithImage('/generateTree/wtpump.png');
const solenoidValveIcon = createSolenoidValveIconWithImage('/generateTree/solv.png');
const ballValveIcon = createBallValveIconWithImage('/generateTree/ballv.png');

// TypesMore actions
type LatLng = {
    lat: number;
    lng: number;
    id?: string;
};

type PlantType = {
    id: number;
    name: string;
    type: string;
    plant_spacing: number;
    row_spacing: number;
    water_needed: number;
};

type ValveType = 'solenoid' | 'ball';

type Valve = {
    id: string;
    type: ValveType;
    position: [number, number];
};

type Pump = {
    id: string;
    position: [number, number];
    radius: number;
};

type EquipmentState = {
    valves: Valve[];
    pumps: Pump[];
};

type Props = {
    areaType: string;
    area: LatLng[];
    plantType: PlantType;
    layers?: Array<{
        type: string;
        coordinates: LatLng[];
        isInitialMap?: boolean;
    }>;
    pumpLocation?: LatLng;
};

type UserPipe = {
    id: string;
    type: 'main' | 'submain';
    coordinates: [number, number][];
};

type Zone = {
    id: number;
    name: string;
    color: string;
    polygon: [number, number][] | null;
    pipeDirection: 'horizontal' | 'vertical';
};

type PipeLayout = {
    type: 'horizontal' | 'vertical';
    start: LatLng;
    end: LatLng;
    row_index: number | null;
    zone_id: number | null;
    length: number;
    plants_served?: number;
    water_flow?: number;
    pipe_diameter?: number;
    colIndex?: number;
    rowIndex?: number;
};

type ZoneStats = {
    zone_id: number;
    pipe_direction: 'horizontal' | 'vertical';
    total_pipes: number;
    total_length: number;
    total_water_flow: number;
    plants_served: number;
    average_pipe_diameter: number;
};

type PipeSummary = {
    total_pipes: number;
    total_length: number;
    total_water_flow: number;
    total_plants_served: number;
    average_pipe_diameter: number;
};

type PipeAnalysis = {
    zone_id: number;
    zone_name: string;
    pipe_direction: 'horizontal' | 'vertical';
    longest_main_pipe: number;
    longest_submain_pipe: number;
    longest_branch_pipe: number;
    submains_on_longest_main: number;
    branches_on_longest_submain: number;
    plants_on_longest_branch: number;
    total_pipes: number;
    main_pipes: number;
    submain_pipes: number;
    branch_pipes: number;
    pipe_details: {
        main_pipes: PipeLayout[];
        submain_pipes: PipeLayout[];
        branch_pipes: PipeLayout[];
    };
};

// Constants
const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];

const AREA_COLORS: Record<string, string> = {
    river: '#3B82F6', // Blue
    field: '#22C55E', // Green
    powerplant: '#EF4444', // Red
    building: '#F59E0B', // Yellow
    pump: '#1E40AF', // Dark Blue
    custompolygon: '#4B5563', // Black Gray
    solarcell: '#FFD600', // Bright Yellow
};

const ZONE_COLORS = ['#FF5733', '#33C1FF', '#8DFF33', '#FF33D4']; // 4 unique colors

// Utility Functions
const calculateAreaInRai = (coordinates: LatLng[]): number => {
    if (coordinates.length < 3) return 0;

    const toMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371000;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    let area = 0;
    for (let i = 0; i < coordinates.length; i++) {
        const j = (i + 1) % coordinates.length;
        area += coordinates[i].lat * coordinates[j].lng;
        area -= coordinates[j].lat * coordinates[i].lng;
    }
    area = Math.abs(area) / 2;

    const areaInSquareMeters =
        area * 111000 * 111000 * Math.cos((coordinates[0].lat * Math.PI) / 180);
    return areaInSquareMeters / 1600;
};

const isPointInPolygon = (
    lat: number,
    lng: number,
    polygon: { lat: number; lng: number }[]
): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat,
            yi = polygon[i].lng;
        const xj = polygon[j].lat,
            yj = polygon[j].lng;
        const intersect =
            yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi + 0.0000001) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
};

const findNearestGridPoint = (
    lat: number,
    lng: number,
    plantType: PlantType,
    area: LatLng[]
): [number, number] => {
    const plantSpacing = plantType.plant_spacing;
    const rowSpacing = plantType.row_spacing;
    const padding = rowSpacing / 2;

    const bounds = area.reduce(
        (acc, point) => ({
            minLat: Math.min(acc.minLat, point.lat),
            maxLat: Math.max(acc.maxLat, point.lat),
            minLng: Math.min(acc.minLng, point.lng),
            maxLng: Math.max(acc.maxLng, point.lng),
        }),
        {
            minLat: area[0].lat,
            maxLat: area[0].lat,
            minLng: area[0].lng,
            maxLng: area[0].lng,
        }
    );

    const paddedBounds = {
        minLat: bounds.minLat + padding / 111000,
        maxLat: bounds.maxLat - padding / 111000,
        minLng: bounds.minLng + padding / (111000 * Math.cos((bounds.minLat * Math.PI) / 180)),
        maxLng: bounds.maxLng - padding / (111000 * Math.cos((bounds.minLat * Math.PI) / 180)),
    };

    const latPoints: number[] = [];
    const lngPoints: number[] = [];

    for (let lat = paddedBounds.minLat; lat <= paddedBounds.maxLat; lat += rowSpacing / 111000) {
        latPoints.push(lat);
    }
    for (
        let lng = paddedBounds.minLng;
        lng <= paddedBounds.maxLng;
        lng += plantSpacing / (111000 * Math.cos((bounds.minLat * Math.PI) / 180))
    ) {
        lngPoints.push(lng);
    }

    let nearestLat = latPoints[0];
    let nearestLng = lngPoints[0];
    let minDistance = Number.MAX_VALUE;

    for (const gridLat of latPoints) {
        for (const gridLng of lngPoints) {
            const distance = Math.sqrt(Math.pow(lat - gridLat, 2) + Math.pow(lng - gridLng, 2));
            if (distance < minDistance) {
                minDistance = distance;
                nearestLat = gridLat;
                nearestLng = gridLng;
            }
        }
    }

    return [nearestLat, nearestLng];
};

const polylineLength = (coords: [number, number][]): number => {
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
        const [lat1, lng1] = coords[i - 1];
        const [lat2, lng2] = coords[i];
        const R = 6371000;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        total += R * c;
    }
    return total;
};

const flattenLatLngs = (latlngs: any): L.LatLng[] => {
    if (Array.isArray(latlngs) && latlngs.length > 0 && Array.isArray(latlngs[0])) {
        return latlngs.flat(Infinity) as L.LatLng[];
    }
    return latlngs as L.LatLng[];
};

// Components
const MapBounds = ({ positions }: { positions: LatLng[] }) => {
    const map = useMap();

    React.useEffect(() => {
        if (positions.length > 0) {
            const bounds = positions.reduce(
                (bounds, point) => bounds.extend([point.lat, point.lng]),
                L.latLngBounds([])
            );
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 22, animate: true });
        }
    }, [positions, map]);

    return null;
};

const InfoSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-4 rounded-lg bg-gray-800 p-4">
        <h3 className="mb-6 text-xl font-semibold text-white">{title}</h3>
        <div className="space-y-6 text-sm text-gray-300">{children}</div>
    </div>
);

const InfoItem = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
        <h4 className="mb-3 text-base font-medium text-white">{title}</h4>
        <div className="text-base">{children}</div>
    </div>
);

const MapClickHandler = ({ onMapClick }: { onMapClick: (e: LeafletMouseEvent) => void }) => {
    const map = useMap();
    useEffect(() => {
        map.on('click', onMapClick);
        return () => {
            map.off('click', onMapClick);
        };
    }, [map, onMapClick]);
    return null;
};

const MouseTracker = ({ onMove }: { onMove: (position: [number, number]) => void }) => {
    const map = useMap();
    useEffect(() => {
        const handleMouseMove = (e: LeafletMouseEvent) => {
            onMove([e.latlng.lat, e.latlng.lng]);
        };
        map.on('mousemove', handleMouseMove);
        return () => {
            map.off('mousemove', handleMouseMove);
        };
    }, [map, onMove]);
    return null;
};

const MapMouseUpHandler = ({ onMouseUp }: { onMouseUp: () => void }) => {
    const map = useMap();
    useEffect(() => {
        map.on('mouseup', onMouseUp);
        return () => {
            map.off('mouseup', onMouseUp);
        };
    }, [map, onMouseUp]);
    return null;
};

const MapDragHandler = ({ isDragging, editMode, selectedPoints }: { 
    isDragging: boolean; 
    editMode: 'select' | 'add' | 'addPolygon' | 'selectPolygon' | 'delete' | 'deletePolygon' | null;
    selectedPoints: Set<string>;
}) => {
    const map = useMap();

    useEffect(() => {
        if (isDragging || (editMode === 'select' && selectedPoints.size > 0) || editMode === 'selectPolygon') {
            map.dragging.disable();
            map.doubleClickZoom.disable();
            map.scrollWheelZoom.disable();
        } else {
            map.dragging.enable();
            map.doubleClickZoom.enable();
            map.scrollWheelZoom.enable();
        }
    }, [isDragging, editMode, selectedPoints.size, map]);

    return null;
};

const PointManagementControls = ({
    plantLocations,
    setPlantLocations,
    area,
    plantType,
    featureGroupRef,
    editMode,
    setEditMode
}: { 
    plantLocations: LatLng[]; 
    setPlantLocations: React.Dispatch<React.SetStateAction<LatLng[]>>;
    area: LatLng[];
    plantType: PlantType;
    featureGroupRef: React.MutableRefObject<L.FeatureGroup | null>;
    editMode: 'select' | 'add' | 'addPolygon' | 'selectPolygon' | 'delete' | 'deletePolygon' | null;
    setEditMode: React.Dispatch<React.SetStateAction<'select' | 'add' | 'addPolygon' | 'selectPolygon' | 'delete' | 'deletePolygon' | null>>;
}) => {
    const map = useMap();
    const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
    const [movingPoint, setMovingPoint] = useState<{
        id: string;
        position: [number, number];
    } | null>(null);
    const [history, setHistory] = useState<LatLng[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [deletePolygon, setDeletePolygon] = useState<[number, number][] | null>(null);

    // Initialize history when plantLocations changes and there's no history
    useEffect(() => {
        if (history.length === 0 && plantLocations.length > 0) {
            setHistory([plantLocations]);
            setHistoryIndex(0);
        }
    }, [plantLocations]);

    // Add function to save state to history
    const saveToHistory = (newLocations: LatLng[]) => {
        setHistory((prev) => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(newLocations);
            return newHistory;
        });
        setHistoryIndex((prev) => prev + 1);
    };

    // Add undo function
    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setPlantLocations(history[newIndex]);
        }
    };

    const handleAddPoints = () => {
        setEditMode('addPolygon');
        setSelectedPoints(new Set());
        setMovingPoint(null);
    };

    const handleDeletePoints = () => {
        setEditMode('deletePolygon');
        setSelectedPoints(new Set());
        setMovingPoint(null);
    };

    const handleDeletePolygon = () => {
        setEditMode('deletePolygon');
        setSelectedPoints(new Set());
        setMovingPoint(null);
    };

    const handleMovePoints = () => {
        setEditMode('selectPolygon');
        setSelectedPoints(new Set());
        setMovingPoint(null);
    };

    const handleCancel = () => {
        setEditMode(null);
        setSelectedPoints(new Set());
        setMovingPoint(null);
        setDeletePolygon(null);
    };

    const handlePointClick = (pointId: string, event: LeafletMouseEvent) => {
        event.originalEvent?.stopPropagation();

        if (editMode === 'select') {
            setSelectedPoints((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(pointId)) {
                    newSet.delete(pointId);
                } else {
                    newSet.add(pointId);
                }
                return newSet;
            });
        } else if (editMode === 'delete') {
            const pointIndex = plantLocations.findIndex((p) => p.id === pointId);
            if (pointIndex !== -1) {
                const newLocations = plantLocations.filter((_, index) => index !== pointIndex);
                saveToHistory(newLocations);
                setPlantLocations(newLocations);
                setSelectedPoints((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(pointId);
                    return newSet;
                });
            }
        }
    };

    const handleMouseMove = (position: [number, number]) => {
        if (movingPoint) {
            const [nearestLat, nearestLng] = findNearestGridPoint(
                position[0],
                position[1],
                plantType,
                area
            );

            // Only update if the point is inside the area
            if (isPointInPolygon(nearestLat, nearestLng, area)) {
                setMovingPoint((prev) =>
                    prev ? { ...prev, position: [nearestLat, nearestLng] } : null
                );
            }
        }
    };

    const handleMouseUp = () => {
        if (movingPoint) {
            const newLocations = plantLocations.map((p) =>
                p.id === movingPoint.id
                    ? { ...p, lat: movingPoint.position[0], lng: movingPoint.position[1] }
                    : p
            );
            saveToHistory(newLocations);
            setPlantLocations(newLocations);
            setMovingPoint(null);
        }
    };

    return (
        <>
            <div className="absolute left-[60px] top-4 z-[1000] rounded-lg bg-white p-2 shadow-lg">
                <div className="flex flex-col space-y-2">
                    <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-medium text-gray-700">Edit Points</h3>
                        <div className="flex space-x-2">
                            {editMode && (
                                <button
                                    onClick={handleCancel}
                                    className="rounded bg-gray-500 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={handleUndo}
                                disabled={historyIndex <= 0}
                                className={`rounded px-3 py-1 text-sm ${
                                    historyIndex > 0
                                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                                        : 'cursor-not-allowed bg-gray-300 text-gray-500'
                                }`}
                            >
                                Undo
                            </button>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={handleAddPoints}
                            className={`px-3 py-2 rounded transition-colors ${
                                editMode === 'addPolygon'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                        >
                            Add Points
                        </button>
                        <button
                            onClick={handleDeletePoints}
                            className={`px-3 py-2 rounded transition-colors ${
                                editMode === 'deletePolygon'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-red-500 text-white hover:bg-red-600'
                            }`}
                        >
                            Delete Points
                        </button>
                        <button
                            onClick={handleMovePoints}
                            className={`px-3 py-2 rounded transition-colors ${
                                editMode === 'selectPolygon'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            Move Points
                        </button>
                    </div>
                    {editMode === 'deletePolygon' && (
                        <div className="text-xs text-gray-600 bg-yellow-100 p-2 rounded">
                            Draw a polygon to select and delete all planting points within that area.
                        </div>
                    )}
                    {editMode === 'addPolygon' && (
                        <div className="text-xs text-gray-600 bg-green-100 p-2 rounded">
                            Draw a polygon to generate planting points within that area.
                        </div>
                    )}
                    {editMode === 'selectPolygon' && (
                        <div className="text-xs text-gray-600 bg-blue-100 p-2 rounded">
                            Draw a polygon to select points, then click anywhere to move them as a group.
                        </div>
                    )}
                </div>
            </div>
            <MapClickHandler onMapClick={() => {}} />
            <MapDragHandler 
                isDragging={!!movingPoint} 
                editMode={editMode} 
                selectedPoints={selectedPoints}
            />
            <MouseTracker onMove={handleMouseMove} />
            <MapMouseUpHandler onMouseUp={handleMouseUp} />
            {plantLocations.map((point) => {
                const pointId = point.id || `point-${plantLocations.indexOf(point)}`;
                const isSelected = selectedPoints.has(pointId);
                const isMoving = movingPoint?.id === pointId;
                const position: [number, number] =
                    isMoving && movingPoint ? movingPoint.position : [point.lat, point.lng];
                return (
                    <CircleMarker
                        key={pointId}
                        center={position}
                        radius={isSelected ? 3 : 0.5}
                        pathOptions={{
                            color: isSelected ? 'blue' : 'red',
                            fillColor: isSelected ? 'blue' : 'red',
                            fillOpacity: isMoving ? 0.5 : 1,
                        }}
                        eventHandlers={{
                            click: (e) => {
                                const mouseEvent = e as unknown as LeafletMouseEvent;
                                mouseEvent.originalEvent?.stopPropagation();
                                handlePointClick(pointId, mouseEvent);
                            },
                            mousedown: (e) => {
                                if (editMode === 'select' && isSelected) {
                                    const mouseEvent = e as unknown as LeafletMouseEvent;
                                    mouseEvent.originalEvent?.stopPropagation();
                                    setMovingPoint({
                                        id: pointId,
                                        position: [point.lat, point.lng],
                                    });
                                }
                            },
                        }}
                    />
                );
            })}
        </>
    );
};

// Map Components
const MapLayers = ({ layers = [] }: { layers?: Props['layers'] }) => (
    <>
        {layers.map((layer, index) => {
            const styleMap: Record<string, { color: string; fillOpacity: number }> = {
                river: { color: '#3B82F6', fillOpacity: 0.3 },
                powerplant: { color: '#EF4444', fillOpacity: 0.3 },
                building: { color: '#F59E0B', fillOpacity: 0.3 },
                pump: { color: '#1E40AF', fillOpacity: 0.3 },
                custompolygon: { color: '#4B5563', fillOpacity: 0.3 },
                solarcell: { color: '#FFD600', fillOpacity: 0.3 },
            };

            const style = layer.isInitialMap
                ? { color: '#90EE90', fillColor: '#90EE90', fillOpacity: 0.3, weight: 2 }
                : {
                      ...(styleMap[layer.type] || styleMap.custompolygon),
                      fillColor: styleMap[layer.type]?.color || styleMap.custompolygon.color,
                  };

            return (
                <Polygon
                    key={`layer-${index}`}
                    positions={layer.coordinates.map((coord) => [coord.lat, coord.lng])}
                    pathOptions={{
                        ...style,
                        weight: 2,
                    }}
                />
            );
        })}
    </>
);

const ZonePolygons = ({ zones }: { zones: Zone[] }) => (
    <>
        {zones.map((zone) =>
            zone.polygon ? (
                <Polygon
                    key={zone.id}
                    positions={zone.polygon}
                    pathOptions={{ color: zone.color, weight: 2, fillOpacity: 0.2 }}
                />
            ) : null
        )}
    </>
);

const PlantPoints = ({ plantLocations, getPointColor, selectedPoints, movingGroup }: { 
    plantLocations: LatLng[]; 
    getPointColor: (point: LatLng) => string;
    selectedPoints?: Set<string>;
    movingGroup?: { points: LatLng[]; offset: [number, number] } | null;
}) => (
    <>
        {plantLocations.map((point, index) => {
            const pointId = point.id || `point-${index}`;
            const isSelected = selectedPoints?.has(pointId) || false;
            const isMoving = movingGroup?.points.some(p => (p.id || `point-${plantLocations.indexOf(p)}`) === pointId) || false;
            
            let position: [number, number] = [point.lat, point.lng];
            if (isMoving && movingGroup) {
                const centerLat = movingGroup.points.reduce((sum, p) => sum + p.lat, 0) / movingGroup.points.length;
                const centerLng = movingGroup.points.reduce((sum, p) => sum + p.lng, 0) / movingGroup.points.length;
                const newLat = centerLat + movingGroup.offset[0];
                const newLng = centerLng + movingGroup.offset[1];
                position = [newLat, newLng];
            }
            
            const color = isSelected ? 'blue' : getPointColor(point);
            return (
                <CircleMarker
                    key={pointId}
                    center={position}
                    radius={isSelected ? 3 : 1.5}
                    pathOptions={{
                        color: color,
                        fillColor: color,
                        fillOpacity: isMoving ? 0.5 : 1,
                    }}
                />
            );
        })}
    </>
);

const PipeLayouts = ({
    pipeLayout,
    getPipeColor,
}: {
    pipeLayout: PipeLayout[];
    getPipeColor: (pipe: PipeLayout) => string;
}) => (
    <FeatureGroup>
        {pipeLayout.map((pipe, index) => {
            const color = getPipeColor(pipe);
            const tooltipText = pipe.pipe_diameter 
                ? `Pipe ${index + 1}: ${pipe.length.toFixed(1)}m, ${pipe.pipe_diameter}mm, ${pipe.water_flow?.toFixed(1)} L/day`
                : `Pipe ${index + 1}: ${pipe.length.toFixed(1)}m`;
            
            return (
                <Polyline
                    key={`pipe-${index}`}
                    positions={[
                        [pipe.start.lat, pipe.start.lng],
                        [pipe.end.lat, pipe.end.lng]
                    ]}
                    color={color}
                    weight={3}
                    opacity={0.8}
                    eventHandlers={{
                        mouseover: (e) => {
                            const layer = e.target;
                            layer.bindTooltip(tooltipText, {
                                permanent: false,
                                direction: 'top',
                                className: 'pipe-tooltip'
                            }).openTooltip();
                        },
                        mouseout: (e) => {
                            const layer = e.target;
                            layer.closeTooltip();
                        }
                    }}
                />
            );
        })}
    </FeatureGroup>
);

const UserPipes = ({ userPipes }: { userPipes: UserPipe[] }) => (
    <>
        {userPipes.map((pipe) => (
            <Polyline
                key={pipe.id}
                positions={pipe.coordinates}
                color={pipe.type === 'main' ? 'red' : 'orange'}
                weight={5}
                opacity={0.8}
            />
        ))}
    </>
);

// Add isPointInZonePolygon function
const isPointInZonePolygon = (lat: number, lng: number, polygon: [number, number][]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0],
            yi = polygon[i][1];
        const xj = polygon[j][0],
            yj = polygon[j][1];
        const intersect =
            yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi + 0.0000001) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
};



// Add after the existing utility functions
const ValveUndoRedoControl = ({
    onUndo,
    onRedo,
    canUndo,
    canRedo,
}: {
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}) => {
    const map = useMap();

    useEffect(() => {
        const controlDiv = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        controlDiv.style.backgroundColor = 'white';
        controlDiv.style.padding = '6px';
        controlDiv.style.borderRadius = '4px';
        controlDiv.style.boxShadow = '0 1px 5px rgba(0,0,0,0.65)';
        controlDiv.style.marginTop = '60px'; // Position below valve controls

        const undoButton = L.DomUtil.create('button', '', controlDiv);
        undoButton.innerHTML = '↶';
        undoButton.style.marginRight = '4px';
        undoButton.style.padding = '4px 8px';
        undoButton.style.border = 'none';
        undoButton.style.borderRadius = '4px';
        undoButton.style.cursor = canUndo ? 'pointer' : 'not-allowed';
        undoButton.style.opacity = canUndo ? '1' : '0.5';
        undoButton.style.backgroundColor = canUndo ? '#1E40AF' : '#9CA3AF';
        undoButton.style.color = 'white';

        const redoButton = L.DomUtil.create('button', '', controlDiv);
        redoButton.innerHTML = '↷';
        redoButton.style.padding = '4px 8px';
        redoButton.style.border = 'none';
        redoButton.style.borderRadius = '4px';
        redoButton.style.cursor = canRedo ? 'pointer' : 'not-allowed';
        redoButton.style.opacity = canRedo ? '1' : '0.5';
        redoButton.style.backgroundColor = canRedo ? '#1E40AF' : '#9CA3AF';
        redoButton.style.color = 'white';

        L.DomEvent.on(undoButton, 'click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (canUndo) onUndo();
        });

        L.DomEvent.on(redoButton, 'click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (canRedo) onRedo();
        });

        const control = new L.Control({ position: 'topright' });
        control.onAdd = () => controlDiv;
        control.addTo(map);

        return () => {
            control.remove();
        };
    }, [map, onUndo, onRedo, canUndo, canRedo]);

    return null;
};

// Add this utility function after the existing utility functions
const generatePointsInPolygon = (polygon: [number, number][], plantType: PlantType, mainArea: LatLng[]): LatLng[] => {
    const points: LatLng[] = [];
    
    // Find the two leftmost points (lowest longitude) from main area
    const sortedByLng = [...mainArea].sort((a, b) => a.lng - b.lng);
    const leftmost1 = sortedByLng[0];
    const leftmost2 = sortedByLng[1];
    const bottomLeft = leftmost1.lat < leftmost2.lat ? leftmost1 : leftmost2;
    const topLeft = leftmost1.lat >= leftmost2.lat ? leftmost1 : leftmost2;

    // Find the two bottommost points (lowest latitude) from main area
    const sortedByLat = [...mainArea].sort((a, b) => a.lat - b.lat);
    const bottom1 = sortedByLat[0];
    const bottom2 = sortedByLat[1];
    const bottomRight = bottom1.lng > bottom2.lng ? bottom1 : bottom2;

    // Define plantDir (along bottom edge)
    const plantDir = {
        lat: bottomRight.lat - bottomLeft.lat,
        lng: bottomRight.lng - bottomLeft.lng,
    };
    const plantLength = Math.sqrt(plantDir.lat ** 2 + plantDir.lng ** 2);
    const plantDirNormalized = {
        lat: plantDir.lat / plantLength,
        lng: plantDir.lng / plantLength,
    };

    // Define rowDir (along left edge)
    const rowDir = {
        lat: topLeft.lat - bottomLeft.lat,
        lng: topLeft.lng - bottomLeft.lng,
    };
    const rowLength = Math.sqrt(rowDir.lat ** 2 + rowDir.lng ** 2);
    const rowDirNormalized = {
        lat: rowDir.lat / rowLength,
        lng: rowDir.lng / rowLength,
    };

    // Calculate field size and steps
    const left = sortedByLng[0];
    const right = sortedByLng[sortedByLng.length - 1];
    const bottom = sortedByLat[0];
    const top = sortedByLat[sortedByLat.length - 1];

    const fieldWidthMeters = calculateDistance(left.lat, left.lng, right.lat, right.lng);
    const fieldHeightMeters = calculateDistance(bottom.lat, bottom.lng, top.lat, top.lng);

    const maxPlantSteps = Math.floor(fieldWidthMeters / plantType.plant_spacing);
    const maxRowSteps = Math.floor(fieldHeightMeters / plantType.row_spacing);

    // Generate grid points
    for (let i = 0; i <= maxRowSteps; i++) {
        const rowStart = {
            lat: bottomLeft.lat + rowDirNormalized.lat * i * (plantType.row_spacing / 111000),
            lng: bottomLeft.lng + rowDirNormalized.lng * i * (plantType.row_spacing / (111000 * Math.cos(bottomLeft.lat * Math.PI / 180))),
        };

        for (let j = 0; j <= maxPlantSteps; j++) {
            const point = {
                lat: rowStart.lat + plantDirNormalized.lat * j * (plantType.plant_spacing / 111000),
                lng: rowStart.lng + plantDirNormalized.lng * j * (plantType.plant_spacing / (111000 * Math.cos(rowStart.lat * Math.PI / 180))),
            };

            // Check if point is inside the drawn polygon
            if (isPointInPolygon(point.lat, point.lng, polygon.map(([lat, lng]) => ({ lat, lng })))) {
                // Check if point is far enough from polygon edges
                const minDist = minDistanceToPolygonEdge(point.lat, point.lng, polygon.map(([lat, lng]) => ({ lat, lng })));
                if (minDist >= (plantType.row_spacing / 2)) {
                    points.push({
                        ...point,
                        id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    });
                }
            }
        }
    }

    return points;
};

// Helper function to calculate distance between two points
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth radius in meters
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(lat1Rad) * Math.cos(lat2Rad) *
             Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
};

// Helper function to calculate minimum distance from point to polygon edge
const minDistanceToPolygonEdge = (lat: number, lng: number, polygon: { lat: number; lng: number }[]): number => {
    let minDist = Infinity;
    const n = polygon.length;
    
    for (let i = 0; i < n; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % n];
        const dist = pointToSegmentDistance(lat, lng, a.lat, a.lng, b.lat, b.lng);
        if (dist < minDist) {
            minDist = dist;
        }
    }
    
    return minDist;
};

// Helper function to calculate distance from point to line segment
const pointToSegmentDistance = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
    const R = 6371000; // Earth radius in meters
    const lat1 = ax * Math.PI / 180;
    const lat2 = bx * Math.PI / 180;
    const latP = px * Math.PI / 180;
    const lng1 = ay * Math.PI / 180;
    const lng2 = by * Math.PI / 180;
    const lngP = py * Math.PI / 180;
    
    const x1 = R * lng1 * Math.cos((lat1 + lat2) / 2);
    const y1 = R * lat1;
    const x2 = R * lng2 * Math.cos((lat1 + lat2) / 2);
    const y2 = R * lat2;
    const xP = R * lngP * Math.cos((lat1 + lat2) / 2);
    const yP = R * latP;
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    if (dx === 0 && dy === 0) {
        return Math.sqrt(Math.pow(xP - x1, 2) + Math.pow(yP - y1, 2));
    }
    
    const t = Math.max(0, Math.min(1, ((xP - x1) * dx + (yP - y1) * dy) / (dx * dx + dy * dy)));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    
    return Math.sqrt(Math.pow(xP - projX, 2) + Math.pow(yP - projY, 2));
};

// Main Component
export default function GenerateTree({ areaType, area, plantType, layers = [], pumpLocation }: Props) {
    // No longer needed since we're using URL parameters consistently
    const [plantLocations, setPlantLocations] = useState<LatLng[]>([]);
    
    // Check if this is an existing field (check URL for field ID)
    const urlParams = new URLSearchParams(window.location.search);
    const existingFieldId = urlParams.get('fieldId');
    const [grid, setGrid] = useState<LatLng[][] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPlantLayoutGenerated, setIsPlantLayoutGenerated] = useState(false);
    const [pipeLayout, setPipeLayout] = useState<PipeLayout[]>([]);
    const [zoneStats, setZoneStats] = useState<ZoneStats[]>([]);
    const [pipeSummary, setPipeSummary] = useState<PipeSummary | null>(null);
    const [pipeAnalysis, setPipeAnalysis] = useState<PipeAnalysis[]>([]);
    const featureGroupRef = React.useRef<L.FeatureGroup>(null);
    const [zones, setZones] = useState<Zone[]>([]);
    const [currentZoneIndex, setCurrentZoneIndex] = useState<number | null>(null);
    const [userPipes, setUserPipes] = useState<UserPipe[]>([]);
    const [drawingPipeType, setDrawingPipeType] = useState<'main' | 'submain' | null>(null);
    const [selectedValveType, setSelectedValveType] = useState<ValveType | null>(null);
    const [valves, setValves] = useState<Valve[]>([]);
    const [draggingValve, setDraggingValve] = useState<Valve | null>(null);
    // Add new pump state
    const [pumps, setPumps] = useState<Pump[]>([]);
    const [selectedPumpType, setSelectedPumpType] = useState<boolean>(false);
    const [draggingPump, setDraggingPump] = useState<Pump | null>(null);
    // Combined equipment history
    const [equipmentHistory, setEquipmentHistory] = useState<EquipmentState[]>([
        { valves: [], pumps: [] },
    ]);
    const [equipmentHistoryIndex, setEquipmentHistoryIndex] = useState(0);
    // Add edit mode state
    const [editMode, setEditMode] = useState<'select' | 'add' | 'addPolygon' | 'selectPolygon' | 'delete' | 'deletePolygon' | null>(null);
    // Add history management for plant locations
    const [plantHistory, setPlantHistory] = useState<LatLng[][]>([]);
    const [plantHistoryIndex, setPlantHistoryIndex] = useState(-1);
    // Add selected points state for moving functionality
    const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
    const [movingGroup, setMovingGroup] = useState<{ points: LatLng[]; offset: [number, number] } | null>(null);

    // Memoized values
    const areaInRai = useMemo(() => calculateAreaInRai(area), [area]);
    const processedPlantType = useMemo(
        () => ({
            ...plantType,
            plant_spacing: Number(plantType.plant_spacing),
            row_spacing: Number(plantType.row_spacing),
            water_needed: Number(plantType.water_needed),
        }),
        [plantType]
    );

    const totalPlants = useMemo(() => plantLocations.length, [plantLocations]);

    const mapCenter = useMemo(() => {
        if (area.length === 0) return DEFAULT_CENTER;
        const center = area.reduce(
            (acc, point) => [acc[0] + point.lat, acc[1] + point.lng],
            [0, 0]
        );
        return [center[0] / area.length, center[1] / area.length] as [number, number];
    }, [area]);

    // Add handleMarkerCreated inside the main component
    const handleMarkerCreated = (latlng: L.LatLng) => {
        const newPoint: LatLng = {
            lat: latlng.lat,
            lng: latlng.lng,
            id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        setPlantLocations((prev) => [...prev, newPoint]);
    };

    // Handlers
    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Use props directly since we're using URL parameters consistently
            const currentArea = area;
            const currentPlantType = plantType;
            const currentLayers = layers;
            const currentAreaType = areaType;
            
            const areaTypes = currentAreaType ? currentAreaType.split(',').map(type => type.trim()) : ['default'];
            
            // Debug logging
            console.log('Sending layers to API:', currentLayers);
            console.log('Exclusion layers (non-initial map):', currentLayers.filter(layer => !layer.isInitialMap));
            
            const { data } = await axios.post<{ plant_locations: LatLng[][] }>(
                '/api/generate-planting-points',
                {
                    area: currentArea,
                    plant_type_id: currentPlantType.id,
                    plant_spacing: currentPlantType.plant_spacing,
                    row_spacing: currentPlantType.row_spacing,
                    area_types: areaTypes,
                    layers: currentLayers.map(layer => ({
                        ...layer,
                        coordinates: layer.coordinates.map((coord) => ({
                            lat: Number(coord.lat),
                            lng: Number(coord.lng),
                        })),
                    })),
                }
            );

            if (!data?.plant_locations) {
                throw new Error('Invalid response format from server');
            }

            const flattenedPoints = data.plant_locations.flat().map((point, index) => ({
                ...point,
                id: `point-${index}`,
            }));
            setPlantLocations(flattenedPoints);
            setGrid(data.plant_locations);
            setIsPlantLayoutGenerated(true);
        } catch (error) {
            console.error('Error details:', error);
            setError(
                axios.isAxiosError(error)
                    ? error.response?.data?.message || error.message || 'Error generating points'
                    : 'An unexpected error occurred'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleGeneratePipeLayout = async () => {
        if (!plantLocations || !plantLocations.length) return;

        try {
            setIsLoading(true);
            const requestData = {
                plant_type_id: plantType.id,
                area: area,
                zones: zones.map((zone) => {
                    const zonePoints = plantLocations.filter(
                        (point) =>
                            zone.polygon &&
                            isPointInPolygon(
                                point.lat,
                                point.lng,
                                zone.polygon.map(([lat, lng]) => ({ lat, lng }))
                            )
                    );
                    return {
                        id: zone.id,
                        pipeDirection: zone.pipeDirection,
                        points: zonePoints,
                    };
                }).filter(zone => zone.points.length > 0) // Only include zones with points
            };

            const response = await axios.post('/api/generate-pipe-layout', requestData);
            setPipeLayout(response.data.pipe_layout);
            setZoneStats(response.data.zone_stats || []);
            setPipeSummary(response.data.summary || null);
            setPipeAnalysis(response.data.pipe_analysis || []);
            
            console.log('Pipe generation response:', response.data);
        } catch (error) {
            console.error('Error generating pipe layout:', error);
            alert('Failed to generate pipe layout');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddZone = () => {
        if (zones.length >= 4) return;
        const newZone: Zone = {
            id: Date.now(),
            name: `Zone ${zones.length + 1}`,
            color: ZONE_COLORS[zones.length],
            polygon: null,
            pipeDirection: 'horizontal',
        };
        setZones([...zones, newZone]);
        setCurrentZoneIndex(zones.length);
    };

    const handleDeleteZone = (zoneId: number) => {
        setZones((prevZones) => prevZones.filter((zone) => zone.id !== zoneId));
        if (currentZoneIndex !== null) {
            const deletedZoneIndex = zones.findIndex((zone) => zone.id === zoneId);
            if (deletedZoneIndex === currentZoneIndex) {
                setCurrentZoneIndex(null);
            } else if (deletedZoneIndex < currentZoneIndex) {
                setCurrentZoneIndex(currentZoneIndex - 1);
            }
        }
    };

    const handlePipeDirectionChange = (zoneId: number, direction: 'horizontal' | 'vertical') => {
        setZones((prevZones) =>
            prevZones.map((zone) =>
                zone.id === zoneId ? { ...zone, pipeDirection: direction } : zone
            )
        );
    };

    const getPointColor = (point: LatLng) => {
        for (let i = 0; i < zones.length; i++) {
            const z = zones[i];
            if (z.polygon && isPointInZonePolygon(point.lat, point.lng, z.polygon)) {
                return z.color;
            }
        }
        return 'green';
    };

    const getPipeColor = (pipe: PipeLayout) => {
        const zone = zones.find((z) => z.id === pipe.zone_id);
        return zone?.pipeDirection === 'horizontal' ? '#3B82F6' : '#10B981';
    };

    const handleUserPipeCreated = (e: any) => {
        if (drawingPipeType && e.layerType === 'polyline' && e.layer instanceof L.Polyline) {
            const latlngs: L.LatLng[] = flattenLatLngs(e.layer.getLatLngs());
            const coordinates: [number, number][] = latlngs.map((latlng) => [
                latlng.lat,
                latlng.lng,
            ]);
            setUserPipes((prev) => [
                ...prev,
                {
                    id: `userpipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: drawingPipeType,
                    coordinates,
                },
            ]);
            setDrawingPipeType(null);
        }
    };

    const handleUserPipeDeleted = (e: any) => {
        const layers = e.layers;
        layers.eachLayer((layer: any) => {
            if (layer instanceof L.Polyline) {
                const latlngs: L.LatLng[] = flattenLatLngs(layer.getLatLngs());
                setUserPipes((prev) =>
                    prev.filter((pipe) => {
                        if (pipe.coordinates.length !== latlngs.length) return true;
                        for (let i = 0; i < latlngs.length; i++) {
                            if (
                                Math.abs(pipe.coordinates[i][0] - latlngs[i].lat) > 1e-8 ||
                                Math.abs(pipe.coordinates[i][1] - latlngs[i].lng) > 1e-8
                            ) {
                                return true;
                            }
                        }
                        return false;
                    })
                );
            }
        });
    };


    // Add after the existing handlers
    const handleValveTypeSelect = (type: ValveType) => {
        setSelectedValveType(type);
        setSelectedPumpType(false); // Disable pump selection when valve is selected
    };

    const handlePumpTypeSelect = () => {
        setSelectedPumpType(!selectedPumpType);
        setSelectedValveType(null); // Disable valve selection when pump is selected
    };

    const handleValveDragStart = (valve: Valve) => {
        setDraggingValve(valve);
    };

    const handleValveDragEnd = (position: [number, number]) => {
        if (draggingValve) {
            const newValves = valves.map((v) =>
                v.id === draggingValve.id ? { ...v, position } : v
            );
            saveEquipmentToHistory({ valves: newValves, pumps: pumps });
            setValves(newValves);
            setDraggingValve(null);
        }
    };

    const handlePumpDragStart = (pump: Pump) => {
        setDraggingPump(pump);
    };

    const handlePumpDragEnd = (position: [number, number]) => {
        if (draggingPump) {
            const newPumps = pumps.map((p) => (p.id === draggingPump.id ? { ...p, position } : p));
            saveEquipmentToHistory({ valves: valves, pumps: newPumps });
            setPumps(newPumps);
            setDraggingPump(null);
        }
    };

    const handleMapClick = (e: LeafletMouseEvent) => {
        if (selectedValveType) {
            const newValve: Valve = {
                id: `valve-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: selectedValveType,
                position: [e.latlng.lat, e.latlng.lng],
            };
            const newValves = [...valves, newValve];
            saveEquipmentToHistory({ valves: newValves, pumps: pumps });
            setValves(newValves);
            setSelectedValveType(null);
        } else if (selectedPumpType) {
            const newPump: Pump = {
                id: `pump-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                position: [e.latlng.lat, e.latlng.lng],
                radius: 4, // Reduced from 100 to 50 meters
            };
            const newPumps = [...pumps, newPump];
            saveEquipmentToHistory({ valves: valves, pumps: newPumps });
            setPumps(newPumps);
            setSelectedPumpType(false);
        } else if (editMode === 'selectPolygon' && selectedPoints.size > 0) {
            // Start group dragging
            const selectedPointIds = Array.from(selectedPoints);
            const selectedPointObjects = plantLocations.filter(p => 
                selectedPointIds.includes(p.id || `point-${plantLocations.indexOf(p)}`)
            );
            
            if (selectedPointObjects.length > 0) {
                const centerLat = selectedPointObjects.reduce((sum, p) => sum + p.lat, 0) / selectedPointObjects.length;
                const centerLng = selectedPointObjects.reduce((sum, p) => sum + p.lng, 0) / selectedPointObjects.length;
                const offset: [number, number] = [e.latlng.lat - centerLat, e.latlng.lng - centerLng];
                
                setMovingGroup({
                    points: selectedPointObjects,
                    offset
                });
            }
        }
    };

    const saveEquipmentToHistory = (newEquipment: EquipmentState) => {
        setEquipmentHistory((prev) => {
            const newHistory = prev.slice(0, equipmentHistoryIndex + 1);
            newHistory.push(newEquipment);
            return newHistory;
        });
        setEquipmentHistoryIndex((prev) => prev + 1);
    };

    const handleValveUndo = () => {
        if (equipmentHistoryIndex > 0) {
            const newIndex = equipmentHistoryIndex - 1;
            setEquipmentHistoryIndex(newIndex);
            setValves(equipmentHistory[newIndex].valves);
            setPumps(equipmentHistory[newIndex].pumps);
        }
    };

    const handleValveRedo = () => {
        if (equipmentHistoryIndex < equipmentHistory.length - 1) {
            const newIndex = equipmentHistoryIndex + 1;
            setEquipmentHistoryIndex(newIndex);
            setValves(equipmentHistory[newIndex].valves);
            setPumps(equipmentHistory[newIndex].pumps);
        }
    };

    // Add function to save plant locations to history
    const savePlantToHistory = (newLocations: LatLng[]) => {
        setPlantHistory(prev => {
            const newHistory = prev.slice(0, plantHistoryIndex + 1);
            newHistory.push(newLocations);
            return newHistory;
        });
        setPlantHistoryIndex(prev => prev + 1);
    };

    // Add handlers for moving selected points as a group
    const handleGroupDragStart = (e: LeafletMouseEvent) => {
        if (editMode === 'selectPolygon' && selectedPoints.size > 0) {
            const selectedPointIds = Array.from(selectedPoints);
            const selectedPointObjects = plantLocations.filter(p => 
                selectedPointIds.includes(p.id || `point-${plantLocations.indexOf(p)}`)
            );
            
            if (selectedPointObjects.length > 0) {
                const centerLat = selectedPointObjects.reduce((sum, p) => sum + p.lat, 0) / selectedPointObjects.length;
                const centerLng = selectedPointObjects.reduce((sum, p) => sum + p.lng, 0) / selectedPointObjects.length;
                const offset: [number, number] = [e.latlng.lat - centerLat, e.latlng.lng - centerLng];
                
                setMovingGroup({
                    points: selectedPointObjects,
                    offset
                });
            }
        }
    };

    const handleGroupDragMove = (position: [number, number]) => {
        if (movingGroup) {
            // Update the moving group with new position
            setMovingGroup(prev => prev ? {
                ...prev,
                offset: [position[0] - (prev.points.reduce((sum, p) => sum + p.lat, 0) / prev.points.length), 
                        position[1] - (prev.points.reduce((sum, p) => sum + p.lng, 0) / prev.points.length)]
            } : null);
        }
    };

    const handleGroupDragEnd = () => {
        if (movingGroup) {
            const selectedPointIds = Array.from(selectedPoints);
            const newLocations = plantLocations.map(point => {
                const pointId = point.id || `point-${plantLocations.indexOf(point)}`;
                if (selectedPointIds.includes(pointId)) {
                    // Find the corresponding point in movingGroup
                    const movingPoint = movingGroup.points.find(p => 
                        (p.id || `point-${plantLocations.indexOf(p)}`) === pointId
                    );
                    if (movingPoint) {
                        const centerLat = movingGroup.points.reduce((sum, p) => sum + p.lat, 0) / movingGroup.points.length;
                        const centerLng = movingGroup.points.reduce((sum, p) => sum + p.lng, 0) / movingGroup.points.length;
                        const newLat = centerLat + movingGroup.offset[0];
                        const newLng = centerLng + movingGroup.offset[1];
                        
                        // Snap to grid
                        const [nearestLat, nearestLng] = findNearestGridPoint(newLat, newLng, processedPlantType, area);
                        
                        return {
                            ...point,
                            lat: nearestLat,
                            lng: nearestLng
                        };
                    }
                }
                return point;
            });
            
            savePlantToHistory(newLocations);
            setPlantLocations(newLocations);
            setMovingGroup(null);
        }
    };

    const handleCancel = () => {
        setEditMode(null);
        setSelectedPoints(new Set());
        setMovingGroup(null);
    };

    const handleSaveToDatabase = async () => {
        if (!isPlantLayoutGenerated || pipeLayout.length === 0) return;

        setIsLoading(true);
        setError(null);

        try {
            // Use props directly since we're using URL parameters consistently
            const currentArea = area;
            const currentPlantType = processedPlantType;
            const currentLayers = layers;

            // Prepare zones data
            const zonesData = zones.map(zone => ({
                id: zone.id,
                name: zone.name,
                polygon_coordinates: zone.polygon ? zone.polygon.map(([lat, lng]) => ({ lat, lng })) : [],
                color: zone.color,
                pipe_direction: zone.pipeDirection
            }));

            // Prepare planting points data
            const plantingPointsData = plantLocations.map(point => {
                // Generate unique point ID using timestamp and random string
                const pointId = point.id || `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${plantLocations.indexOf(point)}`;
                // Find which zone this point belongs to
                let zoneId: number | null = null;
                for (let i = 0; i < zones.length; i++) {
                    const zone = zones[i];
                    if (zone.polygon && isPointInZonePolygon(point.lat, point.lng, zone.polygon)) {
                        zoneId = zone.id;
                        break;
                    }
                }
                return {
                    lat: point.lat,
                    lng: point.lng,
                    point_id: pointId,
                    zone_id: zoneId
                };
            });

            // Prepare pipes data
            const pipesData = pipeLayout.map(pipe => ({
                type: pipe.type === 'horizontal' ? 'branch' : 'branch', // All generated pipes are branch pipes
                direction: pipe.type,
                start_lat: pipe.start.lat,
                start_lng: pipe.start.lng,
                end_lat: pipe.end.lat,
                end_lng: pipe.end.lng,
                length: pipe.length,
                plants_served: pipe.plants_served || 0,
                water_flow: pipe.water_flow || 0,
                pipe_diameter: pipe.pipe_diameter || 0,
                zone_id: pipe.zone_id as number | null,
                row_index: pipe.rowIndex || null,
                col_index: pipe.colIndex || null
            }));

            // Add user-drawn pipes
            userPipes.forEach(pipe => {
                pipesData.push({
                    type: pipe.type,
                    direction: pipe.type === 'main' ? 'horizontal' : 'horizontal', // Default direction
                    start_lat: pipe.coordinates[0][0],
                    start_lng: pipe.coordinates[0][1],
                    end_lat: pipe.coordinates[pipe.coordinates.length - 1][0],
                    end_lng: pipe.coordinates[pipe.coordinates.length - 1][1],
                    length: 0, // Will be calculated on backend
                    plants_served: 0,
                    water_flow: 0,
                    pipe_diameter: 0,
                    zone_id: null,
                    row_index: null,
                    col_index: null
                });
            });

            // Prepare layers data
            const layersData = currentLayers.map(layer => ({
                type: layer.type,
                coordinates: layer.coordinates,
                is_initial_map: layer.isInitialMap || false
            }));

            const requestData = {
                field_name: existingFieldId ? `Field ${new Date().toLocaleDateString()} (Updated)` : `Field ${new Date().toLocaleDateString()}`,
                area_coordinates: currentArea,
                plant_type_id: currentPlantType.id,
                total_plants: plantLocations.length,
                total_area: areaInRai,
                total_water_need: plantLocations.length * currentPlantType.water_needed,
                area_type: areaType,
                layers: layersData,
                zones: zonesData,
                planting_points: plantingPointsData,
                pipes: pipesData
            };

            let response;
            if (existingFieldId) {
                // Update existing field
                response = await axios.put(`/api/fields/${existingFieldId}`, requestData);
            } else {
                // Create new field
                response = await axios.post('/api/save-field', requestData);
            }

            if (response.data.success) {
                alert('Field saved successfully to database!');
                router.visit('/');
            } else {
                throw new Error('Failed to save field');
            }

        } catch (error) {
            console.error('Error saving field:', error);
            setError(axios.isAxiosError(error) 
                ? error.response?.data?.message || error.message || 'Error saving field'
                : 'An unexpected error occurred'
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Effects
    useEffect(() => {
        if (plantHistory.length === 0 && plantLocations.length > 0) {
            setPlantHistory([plantLocations]);
            setPlantHistoryIndex(0);
        }
    }, [plantLocations]);

    useEffect(() => {
        console.log('*** Data received from map-planner ***');
        console.log('Area Type:', areaType);
        console.log('Area:', area);
        console.log('Plant Type:', plantType);
        console.log('Layers:', layers);
        console.log(
            'Initial Map Layer:',
            layers.find((layer) => layer.isInitialMap)
        );
        console.log(
            'Other Layers:',
            layers.filter((layer) => !layer.isInitialMap)
        );
        console.log('Total Layers:', layers.length);
        console.log('--------------------------------');
    }, []);

    useEffect(() => {
        const generatePoints = async () => {
            // Use props directly since we're using URL parameters consistently
            const currentArea = area;
            const currentPlantType = processedPlantType;
            const currentLayers = layers;
            
            if (currentArea.length > 0 && !isPlantLayoutGenerated) {
                await handleGenerate();
            }
        };
        generatePoints();
    }, [area, processedPlantType, layers]);

    useEffect(() => {
        if (pumpLocation) {
            console.log('Pump location received:', pumpLocation);
            console.log('Pump coordinates:', [pumpLocation.lat, pumpLocation.lng]);
        }
    }, [pumpLocation]);

    useEffect(() => {
        if (
            equipmentHistory.length === 1 &&
            equipmentHistory[0].valves.length === 0 &&
            equipmentHistory[0].pumps.length === 0 &&
            (valves.length > 0 || pumps.length > 0)
        ) {
            setEquipmentHistory([
                { valves: [], pumps: [] },
                { valves: valves, pumps: pumps },
            ]);
            setEquipmentHistoryIndex(1);
        }
    }, [valves, pumps]);

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <h1 className="mb-4 text-xl font-bold text-white">Plant Layout Generator</h1>

            {error && (
                <div className="mb-4 rounded bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <div className="space-y-4 lg:col-span-1">
                    <InfoSection title="Plant Information">
                        <InfoItem title="Basic Details">
                            <p>
                                <span className="font-medium">Plant Category:</span>{' '}
                                {processedPlantType.name}
                            </p>
                            <p>
                                <span className="font-medium">Plant Selection:</span>{' '}
                                {processedPlantType.type}
                            </p>
                        </InfoItem>
                        <InfoItem title="Spacing Requirements">
                            <p>
                                <span className="font-medium">Plant Spacing:</span>{' '}
                                {processedPlantType.plant_spacing.toFixed(2)}m
                            </p>
                            <p>
                                <span className="font-medium">Row Spacing:</span>{' '}
                                {processedPlantType.row_spacing.toFixed(2)}m
                            </p>
                        </InfoItem>
                        <InfoItem title="Water Requirements">
                            <p>
                                <span className="font-medium">Daily Water Need:</span>{' '}
                                {processedPlantType.water_needed.toFixed(2)}L/day
                            </p>
                        </InfoItem>
                    </InfoSection>
                    <InfoSection title="Area Information">
                        <InfoItem title="Area Size (A)">
                            <p>{areaInRai.toFixed(2)} rai</p>
                        </InfoItem>
                        <InfoItem title="Number of Plants (N)">
                            <p>{plantLocations.length} plants</p>
                        </InfoItem>
                        <InfoItem title="Total Water Need (W)">
                            <p>
                                {(plantLocations.length * processedPlantType.water_needed).toFixed(
                                    2
                                )}{' '}
                                L/day
                            </p>
                        </InfoItem>
                    </InfoSection>
                    Add commentMore actions
                    <InfoSection title="Zoning Configuration">
                        <InfoItem title="Zones">
                            <div className="flex flex-col gap-2">
                                {zones.map((zone, idx) => {
                                    const pointsInZone = plantLocations.filter(
                                        (point) =>
                                            zone.polygon &&
                                            isPointInZonePolygon(point.lat, point.lng, zone.polygon)
                                    );
                                    const zoneArea = zone.polygon
                                        ? calculateAreaInRai(
                                              zone.polygon.map(([lat, lng]) => ({ lat, lng }))
                                          )
                                        : 0;
                                    const totalWaterNeed =
                                        pointsInZone.length * processedPlantType.water_needed;

                                    // Calculate longest pipe length for this zone
                                    const zonePipes = pipeLayout.filter(
                                        (pipe) => pipe.zone_id === zone.id
                                    );
                                    const longestPipeLength =
                                        zonePipes.length > 0
                                            ? Math.max(...zonePipes.map((pipe) => pipe.length))
                                            : 0;

                                    return (
                                        <div
                                            key={zone.id}
                                            className="flex flex-col gap-2 rounded bg-gray-800 p-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        style={{
                                                            background: zone.color,
                                                            width: 16,
                                                            height: 16,
                                                            display: 'inline-block',
                                                            borderRadius: 4,
                                                        }}
                                                    ></span>
                                                    <span className="font-medium text-white">
                                                        {zone.name}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteZone(zone.id)}
                                                    className="px-2 py-1 text-xs text-red-400 transition-colors hover:text-red-300"
                                                    disabled={currentZoneIndex !== null}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                                <span>A: {zoneArea.toFixed(2)} rai</span>
                                                <span>•</span>
                                                <span>N: {pointsInZone.length}</span>
                                                <span>•</span>
                                                <span>W: {totalWaterNeed.toFixed(2)} L/day</span>
                                                {longestPipeLength > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span>
                                                            L: {longestPipeLength.toFixed(2)}m
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            {zone.polygon && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-300">
                                                        Pipe Direction:
                                                    </span>
                                                    <select
                                                        value={zone.pipeDirection}
                                                        onChange={(e) =>
                                                            handlePipeDirectionChange(
                                                                zone.id,
                                                                e.target.value as
                                                                    | 'horizontal'
                                                                    | 'vertical'
                                                            )
                                                        }
                                                        className="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
                                                        disabled={currentZoneIndex !== null}
                                                    >
                                                        <option value="horizontal">
                                                            Horizontal (Width)
                                                        </option>
                                                        <option value="vertical">
                                                            Vertical (Height)
                                                        </option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <button
                                    className={`mt-2 rounded bg-blue-600 px-2 py-1 text-xs text-white ${
                                        zones.length >= 4 ? 'cursor-not-allowed opacity-50' : ''
                                    }`}
                                    onClick={handleAddZone}
                                    disabled={zones.length >= 4 || currentZoneIndex !== null}
                                >
                                    + Add Zone
                                </button>
                                {zones.length >= 4 && (
                                    <span className="text-xs text-gray-400">Max 4 zones</span>
                                )}
                                {currentZoneIndex !== null && (
                                    <span className="text-xs text-yellow-400">
                                        Draw polygon for {zones[currentZoneIndex]?.name}
                                    </span>
                                )}
                                More actions
                            </div>
                        </InfoItem>
                    </InfoSection>
                    <InfoSection title="Valve Configuration">
                        Add commentMore actions
                        <InfoItem title="Valve Count">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between rounded bg-gray-800 p-2">
                                    <div className="flex items-center gap-2">
                                        <span
                                            style={{
                                                background: '#9333EA',
                                                width: 16,
                                                height: 16,
                                                display: 'inline-block',
                                                borderRadius: 4,
                                            }}
                                        ></span>
                                        <span className="font-medium text-white">
                                            Solenoid Valves
                                        </span>
                                    </div>
                                    <span className="font-medium text-white">
                                        {valves.filter((v) => v.type === 'solenoid').length}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded bg-gray-800 p-2">
                                    <div className="flex items-center gap-2">
                                        <span
                                            style={{
                                                background: '#4F46E5',
                                                width: 16,
                                                height: 16,
                                                display: 'inline-block',
                                                borderRadius: 4,
                                            }}
                                        ></span>
                                        <span className="font-medium text-white">Ball Valves</span>
                                    </div>
                                    <span className="font-medium text-white">
                                        {valves.filter((v) => v.type === 'ball').length}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded bg-gray-800 p-2">
                                    <div className="flex items-center gap-2">
                                        <span
                                            style={{
                                                background: '#1E40AF',
                                                width: 16,
                                                height: 16,
                                                display: 'inline-block',
                                                borderRadius: 4,
                                            }}
                                        ></span>
                                        <span className="font-medium text-white">Pumps</span>
                                    </div>
                                    <span className="font-medium text-white">{pumps.length}</span>
                                </div>
                            </div>
                        </InfoItem>
                    </InfoSection>
                    <InfoSection title="Pipe Configuration">
                        <InfoItem title="Pipe Summary">
                            {pipeSummary ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between p-2 rounded bg-gray-800">
                                        <span className="text-white font-medium">Total Pipes</span>
                                        <span className="text-white font-medium">{pipeSummary.total_pipes}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded bg-gray-800">
                                        <span className="text-white font-medium">Total Length</span>
                                        <span className="text-white font-medium">{pipeSummary.total_length.toFixed(2)} m</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded bg-gray-800">
                                        <span className="text-white font-medium">Total Water Flow</span>
                                        <span className="text-white font-medium">{pipeSummary.total_water_flow.toFixed(2)} L/day</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded bg-gray-800">
                                        <span className="text-white font-medium">Plants Served</span>
                                        <span className="text-white font-medium">{pipeSummary.total_plants_served}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded bg-gray-800">
                                        <span className="text-white font-medium">Avg Pipe Diameter</span>
                                        <span className="text-white font-medium">{pipeSummary.average_pipe_diameter.toFixed(0)} mm</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-400 text-sm">Generate pipe layout to see statistics</div>
                            )}
                        </InfoItem>
                        <InfoItem title="Zone Pipe Details">
                            <div className="flex flex-col gap-2">
                                {zoneStats.map((stat) => {
                                    const zone = zones.find(z => z.id === stat.zone_id);
                                    return (
                                        <div key={stat.zone_id} className="p-2 rounded bg-gray-800">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span style={{ 
                                                    background: zone?.color || '#666', 
                                                    width: 12, 
                                                    height: 12, 
                                                    display: 'inline-block', 
                                                    borderRadius: 2 
                                                }}></span>
                                                <span className="text-white font-medium">{zone?.name || `Zone ${stat.zone_id}`}</span>
                                                <span className="text-gray-400 text-xs">({stat.pipe_direction})</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 text-xs text-gray-300">
                                                <span>Pipes: {stat.total_pipes}</span>
                                                <span>Length: {stat.total_length.toFixed(1)}m</span>
                                                <span>Flow: {stat.total_water_flow.toFixed(1)} L/day</span>
                                                <span>Plants: {stat.plants_served}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {zoneStats.length === 0 && (
                                    <div className="text-gray-400 text-sm">No zone statistics available</div>
                                )}
                            </div>
                        </InfoItem>
                    </InfoSection>
                </div>

                <div className="space-y-4 lg:col-span-3">
                    <div className="h-[900px] w-full overflow-hidden rounded-lg border border-gray-700">
                        <MapContainer
                            center={mapCenter}
                            zoom={18}
                            maxZoom={19}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={true}
                            scrollWheelZoom={true}
                        >
                            <LayersControl position="topright">
                                <LayersControl.BaseLayer checked name="Satellite">
                                    <TileLayer
                                        url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                                        attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                                        maxZoom={25}
                                    />
                                </LayersControl.BaseLayer>
                                <LayersControl.BaseLayer name="Street Map">
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        maxZoom={25}
                                    />
                                </LayersControl.BaseLayer>
                                <LayersControl.BaseLayer name="Terrain">
                                    <TileLayer
                                        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                                        attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
                                        maxZoom={17}
                                    />
                                </LayersControl.BaseLayer>
                            </LayersControl>
                            <MapBounds positions={area} />

                            {/* Render all layers */}
                            <MapLayers layers={layers} />

                            <FeatureGroup ref={featureGroupRef}>
                                <EditControl
                                    position="topright"
                                    onCreated={(e) => {
                                        // Polygon for zone
                                        if (
                                            currentZoneIndex !== null &&
                                            e.layerType === 'polygon' &&
                                            e.layer instanceof L.Polygon
                                        ) {
                                            const layer = e.layer;
                                            const latlngsRaw = layer.getLatLngs();
                                            let latlngs: L.LatLng[] = [];
                                            if (Array.isArray(latlngsRaw[0])) {
                                                latlngs = latlngsRaw[0] as L.LatLng[];
                                            } else {
                                                latlngs = latlngsRaw as L.LatLng[];
                                            }
                                            const polygon = latlngs
                                                .filter(
                                                    (latlng: L.LatLng) =>
                                                        typeof latlng.lat === 'number' &&
                                                        typeof latlng.lng === 'number'
                                                )
                                                .map(
                                                    (latlng: L.LatLng) =>
                                                        [latlng.lat, latlng.lng] as [number, number]
                                                );
                                            setZones((prev) =>
                                                prev.map((z, idx) =>
                                                    idx === currentZoneIndex ? { ...z, polygon } : z
                                                )
                                            );
                                            setCurrentZoneIndex(null);
                                            featureGroupRef.current?.removeLayer(layer);
                                        }
                                        // Polygon for delete mode
                                        else if (editMode === 'deletePolygon' && e.layerType === 'polygon' && e.layer instanceof L.Polygon) {
                                            const layer = e.layer;
                                            const latlngsRaw = layer.getLatLngs();
                                            let latlngs: L.LatLng[] = [];
                                            if (Array.isArray(latlngsRaw[0])) {
                                                latlngs = latlngsRaw[0] as L.LatLng[];
                                            } else {
                                                latlngs = latlngsRaw as L.LatLng[];
                                            }
                                            const polygon = latlngs
                                                .filter((latlng: L.LatLng) => typeof latlng.lat === 'number' && typeof latlng.lng === 'number')
                                                .map((latlng: L.LatLng) => [latlng.lat, latlng.lng] as [number, number]);
                                            
                                            // Find points within the polygon and delete them
                                            const pointsToDelete = plantLocations.filter(point => 
                                                isPointInPolygon(point.lat, point.lng, polygon.map(([lat, lng]) => ({ lat, lng })))
                                            );
                                            
                                            if (pointsToDelete.length > 0) {
                                                const newLocations = plantLocations.filter(point => 
                                                    !isPointInPolygon(point.lat, point.lng, polygon.map(([lat, lng]) => ({ lat, lng })))
                                                );
                                                setPlantLocations(newLocations);
                                            }
                                            
                                            // Remove the polygon from the map
                                            featureGroupRef.current?.removeLayer(layer);
                                            setEditMode(null);
                                        }
                                        // Polygon for add mode
                                        else if (editMode === 'addPolygon' && e.layerType === 'polygon' && e.layer instanceof L.Polygon) {
                                            const layer = e.layer;
                                            const latlngsRaw = layer.getLatLngs();
                                            let latlngs: L.LatLng[] = [];
                                            if (Array.isArray(latlngsRaw[0])) {
                                                latlngs = latlngsRaw[0] as L.LatLng[];
                                            } else {
                                                latlngs = latlngsRaw as L.LatLng[];
                                            }
                                            const polygon = latlngs
                                                .filter((latlng: L.LatLng) => typeof latlng.lat === 'number' && typeof latlng.lng === 'number')
                                                .map((latlng: L.LatLng) => [latlng.lat, latlng.lng] as [number, number]);
                                            
                                            // Generate points within the polygon using the same grid system
                                            const newPoints = generatePointsInPolygon(polygon, plantType, area);
                                            
                                            if (newPoints.length > 0) {
                                                const newLocations = [...plantLocations, ...newPoints];
                                                savePlantToHistory(newLocations);
                                                setPlantLocations(newLocations);
                                            }
                                            
                                            // Remove the polygon from the map
                                            featureGroupRef.current?.removeLayer(layer);
                                            setEditMode(null);
                                        }
                                        // Polygon for select mode (moving points)
                                        else if (editMode === 'selectPolygon' && e.layerType === 'polygon' && e.layer instanceof L.Polygon) {
                                            const layer = e.layer;
                                            const latlngsRaw = layer.getLatLngs();
                                            let latlngs: L.LatLng[] = [];
                                            if (Array.isArray(latlngsRaw[0])) {
                                                latlngs = latlngsRaw[0] as L.LatLng[];
                                            } else {
                                                latlngs = latlngsRaw as L.LatLng[];
                                            }
                                            const polygon = latlngs
                                                .filter((latlng: L.LatLng) => typeof latlng.lat === 'number' && typeof latlng.lng === 'number')
                                                .map((latlng: L.LatLng) => [latlng.lat, latlng.lng] as [number, number]);
                                            
                                            // Find points within the polygon and select them
                                            const pointsToSelect = plantLocations.filter(point => 
                                                isPointInPolygon(point.lat, point.lng, polygon.map(([lat, lng]) => ({ lat, lng })))
                                            );
                                            
                                            if (pointsToSelect.length > 0) {
                                                const selectedIds = pointsToSelect.map(p => p.id || `point-${plantLocations.indexOf(p)}`);
                                                setSelectedPoints(new Set(selectedIds));
                                            }
                                            
                                            // Remove the polygon from the map
                                            featureGroupRef.current?.removeLayer(layer);
                                            // Don't exit edit mode - stay in selectPolygon mode for moving
                                        }
                                        if (e.layer instanceof L.Marker) {
                                            handleMarkerCreated(e.layer.getLatLng());
                                        }
                                        handleUserPipeCreated(e);
                                    }}
                                    onDeleted={(e) => {
                                        const layers = e.layers;
                                        layers.eachLayer((layer: any) => {
                                            if (layer instanceof L.Marker) {
                                                const latlng = layer.getLatLng();
                                                setPlantLocations((prev) =>
                                                    prev.filter(
                                                        (p) =>
                                                            p.lat !== latlng.lat ||
                                                            p.lng !== latlng.lng
                                                    )
                                                );
                                            }
                                        });
                                        handleUserPipeDeleted(e);
                                    }}
                                    onEdited={(e) => {
                                        const layers = e.layers;
                                        layers.eachLayer((layer: any) => {
                                            if (layer instanceof L.Marker) {
                                                const latlng = layer.getLatLng();
                                                setPlantLocations((prev) =>
                                                    prev.map((p) =>
                                                        p.lat === latlng.lat && p.lng === latlng.lng
                                                            ? { lat: latlng.lat, lng: latlng.lng }
                                                            : p
                                                    )
                                                );
                                            }
                                        });
                                    }}
                                    draw={{
                                        rectangle: false,
                                        polygon: currentZoneIndex !== null || editMode === 'deletePolygon' || editMode === 'addPolygon' || editMode === 'selectPolygon',
                                        circle: false,
                                        circlemarker: false,
                                        marker: true,
                                        polyline: drawingPipeType !== null, // Only allow polyline when drawing mode is active
                                    }}
                                    edit={{
                                        edit: {
                                            selectedPathOptions: {
                                                dashArray: '10, 10',
                                            },
                                        },
                                        remove: true,
                                    }}
                                />
                            </FeatureGroup>
                            <PointManagementControls
                                plantLocations={plantLocations}
                                setPlantLocations={setPlantLocations}
                                area={area}
                                plantType={processedPlantType}
                                featureGroupRef={featureGroupRef}
                                editMode={editMode}
                                setEditMode={setEditMode}
                            />

                            <ZonePolygons zones={zones} />
                            <PlantPoints
                                plantLocations={plantLocations}
                                getPointColor={getPointColor}
                                selectedPoints={selectedPoints}
                                movingGroup={movingGroup}
                            />
                            {pipeLayout.length > 0 && (
                                <PipeLayouts pipeLayout={pipeLayout} getPipeColor={getPipeColor} />
                            )}
                            <UserPipes userPipes={userPipes} />
                            {valves.map((valve) => (
                                <Marker
                                    key={valve.id}
                                    position={valve.position}
                                    icon={valve.type === 'solenoid' ? solenoidValveIcon : ballValveIcon}
                                    eventHandlers={{
                                        mousedown: () => handleValveDragStart(valve),
                                        mouseup: () => setDraggingValve(null),
                                    }}
                                />
                            ))}
                            {pumps.map((pump) => (
                                <Marker
                                    key={pump.id}
                                    position={pump.position}
                                    icon={pumpIcon}
                                    eventHandlers={{
                                        mousedown: () => handlePumpDragStart(pump),
                                        mouseup: () => setDraggingPump(null),
                                    }}
                                />
                            ))}
                            <MapClickHandler onMapClick={handleMapClick} />
                            <MouseTracker onMove={(position) => {
                                if (draggingValve) {
                                    handleValveDragEnd(position);
                                }
                                if (draggingPump) {
                                    handlePumpDragEnd(position);
                                }
                                if (movingGroup) {
                                    handleGroupDragMove(position);
                                }
                            }} />
                            <MapMouseUpHandler onMouseUp={() => {
                                if (movingGroup) {
                                    handleGroupDragEnd();
                                }
                            }} />
                            <ValveUndoRedoControl 
                                onUndo={handleValveUndo}
                                onRedo={handleValveRedo}
                                canUndo={equipmentHistoryIndex > 0}
                                canRedo={equipmentHistoryIndex < equipmentHistory.length - 1}
                            />
                            {pipeLayout.length > 0 && <PipeLegend />}
                        </MapContainer>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                        <div className="grid grid-cols-5 gap-2">
                            <button
                                className={`rounded px-6 py-2 text-white transition-colors duration-200 ${
                                    drawingPipeType === 'main'
                                        ? 'bg-red-600'
                                        : 'bg-red-500 hover:bg-red-600'
                                }`}
                                onClick={() =>
                                    setDrawingPipeType(drawingPipeType === 'main' ? null : 'main')
                                }
                                disabled={
                                    drawingPipeType === 'submain' ||
                                    selectedValveType !== null ||
                                    selectedPumpType
                                }
                            >
                                {drawingPipeType === 'main'
                                    ? 'Drawing Main Pipe...'
                                    : 'Draw Main Pipe'}
                            </button>
                            <button
                                className={`rounded px-6 py-2 text-white transition-colors duration-200 ${
                                    drawingPipeType === 'submain'
                                        ? 'bg-orange-600'
                                        : 'bg-orange-500 hover:bg-orange-600'
                                }`}
                                onClick={() =>
                                    setDrawingPipeType(
                                        drawingPipeType === 'submain' ? null : 'submain'
                                    )
                                }
                                disabled={
                                    drawingPipeType === 'main' ||
                                    selectedValveType !== null ||
                                    selectedPumpType
                                }
                            >
                                {drawingPipeType === 'submain'
                                    ? 'Drawing Sub-Main Pipe...'
                                    : 'Draw Sub-Main Pipe'}
                            </button>
                            <button
                                className={`rounded px-6 py-2 text-white transition-colors duration-200 ${
                                    selectedValveType === 'solenoid'
                                        ? 'bg-purple-600'
                                        : 'bg-purple-500 hover:bg-purple-600'
                                }`}
                                onClick={() => handleValveTypeSelect('solenoid')}
                                disabled={drawingPipeType !== null || selectedPumpType}
                            >
                                {selectedValveType === 'solenoid'
                                    ? 'Placing Solenoid Valve...'
                                    : 'Add Solenoid Valve'}
                            </button>
                            <button
                                className={`rounded px-6 py-2 text-white transition-colors duration-200 ${
                                    selectedValveType === 'ball'
                                        ? 'bg-indigo-600'
                                        : 'bg-indigo-500 hover:bg-indigo-600'
                                }`}
                                onClick={() => handleValveTypeSelect('ball')}
                                disabled={drawingPipeType !== null || selectedPumpType}
                            >
                                {selectedValveType === 'ball'
                                    ? 'Placing Ball Valve...'
                                    : 'Add Ball Valve'}
                            </button>
                            <button
                                className={`rounded px-6 py-2 text-white transition-colors duration-200 ${
                                    selectedPumpType
                                        ? 'bg-blue-600'
                                        : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                                onClick={handlePumpTypeSelect}
                                disabled={drawingPipeType !== null || selectedValveType !== null}
                            >
                                {selectedPumpType ? 'Placing Pump...' : 'Add Pump'}
                            </button>
                        </div>
                        <button
                            onClick={handleGeneratePipeLayout}
                            disabled={isLoading || !isPlantLayoutGenerated || zones.length === 0}
                            className="rounded bg-blue-600 px-6 py-2 text-white transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-700"
                        >
                            {isLoading ? 'Generating...' : 'Generate Pipe Layout'}
                        </button>
                        {zones.length === 0 && (
                            <div className="text-sm text-yellow-400 text-center">
                                Create at least one zone to generate pipe layout
                            </div>
                        )}
                        {pipeLayout.length > 0 && (
                            <div className="text-sm text-green-400 text-center">
                                ✓ Pipe layout generated successfully
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
                <button
                    onClick={() => router.get('/', {}, { preserveState: true })}
                    className="rounded bg-gray-700 px-6 py-2 text-white transition-colors duration-200 hover:bg-gray-600"
                >
                    Back to Home
                </button>
                <div className="flex gap-3">
                                            <button
                            onClick={handleSaveToDatabase}
                            disabled={!isPlantLayoutGenerated || pipeLayout.length === 0}
                            className={`rounded px-6 py-2 text-white transition-colors duration-200
                                ${!isPlantLayoutGenerated || pipeLayout.length === 0
                                    ? 'bg-gray-700 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700'}`}
                        >
                            {isLoading ? 'Saving...' : (existingFieldId ? 'Update Field' : 'Save to Database')}
                        </button>
                </div>
            </div>

        </div>
    );
}

const PipeLegend = () => (
    <div className="absolute bottom-4 right-4 z-[1000] bg-white p-3 rounded-lg shadow-lg">
        <h4 className="font-medium text-gray-700 mb-2">Pipe Direction Legend</h4>
        <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-blue-500"></div>
                <span className="text-gray-600">Horizontal Pipes</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-green-500"></div>
                <span className="text-gray-600">Vertical Pipes</span>
            </div>
        </div>
    </div>
);