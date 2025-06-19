import React, { useState, useMemo, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { MapContainer, TileLayer, CircleMarker, Polygon, useMap, FeatureGroup, LayersControl, Polyline, Rectangle } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import axios from 'axios';
import L from 'leaflet';
import { LeafletMouseEvent } from 'leaflet';

// Types
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

type Props = {
    areaType: string;
    area: LatLng[];
    plantType: PlantType;
    layers?: Array<{
        type: string;
        coordinates: LatLng[];
        isInitialMap?: boolean;
    }>;
};

type UserPipe = {
    id: string;
    type: 'main' | 'submain';
    coordinates: [number, number][];
};

// Constants
const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];

const AREA_COLORS: Record<string, string> = {
    river: '#3B82F6',    // Blue
    field: '#22C55E',    // Green
    powerplant: '#EF4444', // Red
    building: '#F59E0B',  // Yellow
    pump: '#1E40AF',      // Dark Blue
    custompolygon: '#4B5563', // Black Gray
    solarcell: '#FFD600', // Bright Yellow
};

const ZONE_COLORS = ['#FF5733', '#33C1FF', '#8DFF33', '#FF33D4']; // 4 unique colors

type Zone = {
    id: number;
    name: string;
    color: string;
    polygon: [number, number][] | null;
    pipeDirection: 'horizontal' | 'vertical';
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
    <div className="rounded-lg bg-gray-800 p-4 mb-4">
        <h3 className="mb-6 text-xl font-semibold text-white">{title}</h3>
        <div className="space-y-6 text-sm text-gray-300">
            {children}
        </div>
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

const MapMouseDownHandler = ({ onMouseDown }: { onMouseDown: () => void }) => {
    const map = useMap();
    useEffect(() => {
        map.on('mousedown', onMouseDown);
        return () => {
            map.off('mousedown', onMouseDown);
        };
    }, [map, onMouseDown]);
    return null;
};

const MapDragHandler = ({ isDragging, editMode, selectedPoints }: { 
    isDragging: boolean; 
    editMode: 'select' | 'add' | 'delete' | null;
    selectedPoints: Set<string>;
}) => {
    const map = useMap();
    
    useEffect(() => {
        if (isDragging || (editMode === 'select' && selectedPoints.size > 0)) {
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

// Add point-in-polygon function
function isPointInPolygon(lat: number, lng: number, polygon: { lat: number; lng: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat, yi = polygon[i].lng;
        const xj = polygon[j].lat, yj = polygon[j].lng;
        const intersect = ((yi > lng) !== (yj > lng)) &&
            (lat < (xj - xi) * (lng - yi) / (yj - yi + 0.0000001) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Add function to find nearest point based on row structure with 1-meter steps
function findNearestRowPoint(lat: number, lng: number, grid: LatLng[][] | null): [number, number] {
    if (!grid || grid.length === 0) {
        return [lat, lng]; // Fallback to original position
    }

    // Find the nearest point in the grid structure
    let nearestPoint: LatLng | null = null;
    let minDistance = Number.MAX_VALUE;

    // Search through all points in the grid structure
    for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
        const row = grid[rowIndex];
        for (let colIndex = 0; colIndex < row.length; colIndex++) {
            const point = row[colIndex];
            const distance = Math.sqrt(
                Math.pow(lat - point.lat, 2) + 
                Math.pow(lng - point.lng, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearestPoint = point;
            }
        }
    }

    if (!nearestPoint) {
        return [lat, lng];
    }

    // Find the row and column of the nearest point
    let targetRowIndex = -1;
    let targetColIndex = -1;
    
    for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
        const row = grid[rowIndex];
        for (let colIndex = 0; colIndex < row.length; colIndex++) {
            const point = row[colIndex];
            if (Math.abs(point.lat - nearestPoint.lat) < 0.0001 && 
                Math.abs(point.lng - nearestPoint.lng) < 0.0001) {
                targetRowIndex = rowIndex;
                targetColIndex = colIndex;
                break;
            }
        }
        if (targetRowIndex !== -1) break;
    }

    // Calculate the offset from the nearest point to the target position
    const offsetLat = lat - nearestPoint.lat;
    const offsetLng = lng - nearestPoint.lng;

    // Convert offset to meters
    const R = 6371000; // Earth radius in meters
    const latOffsetMeters = offsetLat * R * Math.PI / 180;
    const lngOffsetMeters = offsetLng * R * Math.PI / 180 * Math.cos(nearestPoint.lat * Math.PI / 180);

    // Snap to 1-meter grid
    const snappedLatOffsetMeters = Math.round(latOffsetMeters);
    const snappedLngOffsetMeters = Math.round(lngOffsetMeters);

    // Convert back to degrees
    const snappedLatOffset = snappedLatOffsetMeters / (R * Math.PI / 180);
    const snappedLngOffset = snappedLngOffsetMeters / (R * Math.PI / 180 * Math.cos(nearestPoint.lat * Math.PI / 180));

    // Return the snapped position
    return [nearestPoint.lat + snappedLatOffset, nearestPoint.lng + snappedLngOffset];
}

const PointManagementControls = ({ 
    plantLocations, 
    setPlantLocations,
    area,
    plantType,
    originalPlantLocations,
    selectedPoints,
    setSelectedPoints,
    movingPoints,
    setMovingPoints,
    editMode,
    setEditMode,
    grid
}: { 
    plantLocations: LatLng[]; 
    setPlantLocations: React.Dispatch<React.SetStateAction<LatLng[]>>;
    area: LatLng[];
    plantType: PlantType;
    originalPlantLocations: LatLng[];
    selectedPoints: Set<string>;
    setSelectedPoints: React.Dispatch<React.SetStateAction<Set<string>>>;
    movingPoints: { id: string; originalPosition: [number, number]; currentPosition: [number, number] }[];
    setMovingPoints: React.Dispatch<React.SetStateAction<{ id: string; originalPosition: [number, number]; currentPosition: [number, number] }[]>>;
    editMode: 'select' | 'add' | 'delete' | null;
    setEditMode: React.Dispatch<React.SetStateAction<'select' | 'add' | 'delete' | null>>;
    grid: LatLng[][] | null;
}) => {
    const map = useMap();
    const [history, setHistory] = useState<LatLng[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isDeletingWithPolygon, setIsDeletingWithPolygon] = useState(false);
    const [isAddingWithPolygon, setIsAddingWithPolygon] = useState(false);
    const [isMovingWithPolygon, setIsMovingWithPolygon] = useState(false);
    const featureGroupRef = React.useRef<L.FeatureGroup>(null);

    // Initialize history when plantLocations changes and there's no history
    useEffect(() => {
        if (history.length === 0 && plantLocations.length > 0) {
            setHistory([plantLocations]);
            setHistoryIndex(0);
        }
    }, [plantLocations]);

    // Add function to save state to history
    const saveToHistory = (newLocations: LatLng[]) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(newLocations);
            return newHistory;
        });
        setHistoryIndex(prev => prev + 1);
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
        if (editMode === 'add') {
            setEditMode(null);
            setIsAddingWithPolygon(false);
        } else {
            setEditMode('add');
            setIsAddingWithPolygon(true);
        }
    };

    const handleDeletePoints = () => {
        if (editMode === 'delete') {
            setEditMode(null);
            setIsDeletingWithPolygon(false);
        } else {
            setEditMode('delete');
            setIsDeletingWithPolygon(true);
        }
    };

    const handleMovePoints = () => {
        if (editMode === 'select') {
            setEditMode(null);
            setIsMovingWithPolygon(false);
            setSelectedPoints(new Set());
            setMovingPoints([]);
        } else {
            setEditMode('select');
            setIsMovingWithPolygon(true);
        }
    };

    const handleCancel = () => {
        setEditMode(null);
        setSelectedPoints(new Set());
        setMovingPoints([]);
        setIsDeletingWithPolygon(false);
        setIsAddingWithPolygon(false);
        setIsMovingWithPolygon(false);
    };

    const handleMapClick = (e: LeafletMouseEvent) => {
        if (editMode === 'add' && !isAddingWithPolygon) {  // Only handle clicks when not in polygon mode
            // Find the nearest point from the original grid structure
            const [nearestLat, nearestLng] = findNearestRowPoint(
                e.latlng.lat,
                e.latlng.lng,
                grid
            );

            // Only add if the point is inside the area and not already added
            if (isPointInPolygon(nearestLat, nearestLng, area) && 
                !plantLocations.some(p => p.lat === nearestLat && p.lng === nearestLng)) {
                const newPoint: LatLng = {
                    lat: nearestLat,
                    lng: nearestLng,
                    id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                };
                const newResults = [...plantLocations, newPoint];
                saveToHistory(newResults);
                setPlantLocations(newResults);
            }
        }
    };

    const handleMouseMove = (position: [number, number]) => {
        if (movingPoints.length > 0) {
            // Calculate the center of the selected points
            const centerLat = movingPoints.reduce((sum, mp) => sum + mp.originalPosition[0], 0) / movingPoints.length;
            const centerLng = movingPoints.reduce((sum, mp) => sum + mp.originalPosition[1], 0) / movingPoints.length;
            
            // Find the nearest valid position for the center with 1-meter steps
            const [nearestCenterLat, nearestCenterLng] = findNearestRowPoint(
                position[0],
                position[1],
                grid
            );

            // Only update if the target position is inside the area
            if (isPointInPolygon(nearestCenterLat, nearestCenterLng, area)) {
                // Calculate the offset from original center to new center
                const offsetLat = nearestCenterLat - centerLat;
                const offsetLng = nearestCenterLng - centerLng;
                
                // Update each point's position by applying the exact same offset
                const newLocations = plantLocations.map(p => {
                    const movingPoint = movingPoints.find(mp => mp.id === p.id);
                    if (movingPoint) {
                        // Apply the exact same offset to maintain shape
                        const newLat = movingPoint.originalPosition[0] + offsetLat;
                        const newLng = movingPoint.originalPosition[1] + offsetLng;
                        
                        return { ...p, lat: newLat, lng: newLng };
                    }
                    return p;
                });
                
                setPlantLocations(newLocations);
                
                // Update moving points with new positions
                setMovingPoints(prev => prev.map(point => {
                    const newLat = point.originalPosition[0] + offsetLat;
                    const newLng = point.originalPosition[1] + offsetLng;
                    
                    return {
                        ...point,
                        currentPosition: [newLat, newLng]
                    };
                }));
            }
        }
    };

    const handleMouseUp = () => {
        if (movingPoints.length > 0) {
            // Finalize the move - save to history and clear moving state
            saveToHistory(plantLocations); // Save the current state after the move
            setMovingPoints([]);
            setSelectedPoints(new Set());
        }
    };

    const handleMouseDown = () => {
        // Start drag operation when mouse is pressed down
        if (selectedPoints.size > 0 && editMode === 'select') {
            const selectedPointsList = plantLocations.filter(p => selectedPoints.has(p.id!));
            setMovingPoints(selectedPointsList.map(point => ({
                id: point.id!,
                originalPosition: [point.lat, point.lng],
                currentPosition: [point.lat, point.lng]
            })));
        }
    };

    const handlePolygonCreated = (e: any) => {
        if (e.layerType === 'polygon' && e.layer instanceof L.Polygon) {
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

            if (isDeletingWithPolygon) {
                // Delete points that are inside the polygon
                const newLocations = plantLocations.filter(point => 
                    !isPointInPolygon(point.lat, point.lng, polygon.map(([lat, lng]) => ({ lat, lng })))
                );
                
                saveToHistory(newLocations);
                setPlantLocations(newLocations);
                setIsDeletingWithPolygon(false);
                setEditMode(null);
            } else if (isAddingWithPolygon) {
                // Add points from original grid structure that are inside the polygon
                const pointsToAdd: LatLng[] = [];
                
                if (grid) {
                    for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
                        const row = grid[rowIndex];
                        for (let colIndex = 0; colIndex < row.length; colIndex++) {
                            const point = row[colIndex];
                            if (isPointInPolygon(point.lat, point.lng, polygon.map(([lat, lng]) => ({ lat, lng }))) &&
                                !plantLocations.some(p => p.lat === point.lat && p.lng === point.lng)) {
                                pointsToAdd.push({
                                    ...point,
                                    id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                                });
                            }
                        }
                    }
                }

                if (pointsToAdd.length > 0) {
                    const newLocations = [...plantLocations, ...pointsToAdd];
                    saveToHistory(newLocations);
                    setPlantLocations(newLocations);
                }
                setIsAddingWithPolygon(false);
                setEditMode(null);
            } else if (isMovingWithPolygon) {
                // Select points that are inside the polygon for moving
                const pointsInPolygon = plantLocations.filter(point => 
                    isPointInPolygon(point.lat, point.lng, polygon.map(([lat, lng]) => ({ lat, lng })))
                );
                
                if (pointsInPolygon.length > 0) {
                    setSelectedPoints(new Set(pointsInPolygon.map(p => p.id!)));
                    setMovingPoints(pointsInPolygon.map(point => ({
                        id: point.id!,
                        originalPosition: [point.lat, point.lng],
                        currentPosition: [point.lat, point.lng]
                    })));
                }
                setIsMovingWithPolygon(false);
            }

            featureGroupRef.current?.removeLayer(layer);
        }
    };

    return (
        <>
            <div className="absolute top-4 left-[60px] z-[1000] bg-white p-2 rounded-lg shadow-lg">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-700">Edit Points</h3>
                        <div className="flex space-x-2">
                            {editMode && (
                                <button
                                    onClick={handleCancel}
                                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
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
                                editMode === 'add'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                        >
                            {isAddingWithPolygon ? 'Draw Polygon to Add Points' : 'Add Points'}
                        </button>
                        <button
                            onClick={handleDeletePoints}
                            className={`px-3 py-2 rounded transition-colors ${
                                editMode === 'delete'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-red-500 text-white hover:bg-red-600'
                            }`}
                        >
                            {isDeletingWithPolygon ? 'Draw Polygon to Delete Points' : 'Delete Points'}
                        </button>
                        <button
                            onClick={handleMovePoints}
                            className={`px-3 py-2 rounded transition-colors ${
                                editMode === 'select'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            {isMovingWithPolygon ? 'Draw Polygon to Select Points' : 
                             movingPoints.length > 0 ? `Moving ${movingPoints.length} Points` :
                             'Move Points'}
                        </button>
                    </div>
                    {movingPoints.length > 0 && (
                        <div className="text-xs text-gray-600 mt-2">
                            Selected {movingPoints.length} points. Drag to move all points together.
                        </div>
                    )}
                </div>
            </div>
            <MapClickHandler onMapClick={handleMapClick} />
            <MapDragHandler 
                isDragging={movingPoints.length > 0} 
                editMode={editMode} 
                selectedPoints={selectedPoints}
            />
            <MouseTracker onMove={handleMouseMove} />
            <MapMouseUpHandler onMouseUp={handleMouseUp} />
            <MapMouseDownHandler onMouseDown={handleMouseDown} />
            <FeatureGroup ref={featureGroupRef}>
                <EditControl
                    position="topright"
                    onCreated={handlePolygonCreated}
                    draw={{
                        rectangle: false,
                        polygon: isDeletingWithPolygon || isAddingWithPolygon || isMovingWithPolygon,
                        circle: false,
                        circlemarker: false,
                        marker: false,
                        polyline: false
                    }}
                    edit={{
                        edit: false,
                        remove: false
                    }}
                />
            </FeatureGroup>
        </>
    );
};

// Helper Functions
const calculateAreaInRai = (coordinates: LatLng[]): number => {
    if (coordinates.length < 3) return 0;

    const toMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                 Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                 Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    let area = 0;
    for (let i = 0; i < coordinates.length; i++) {
        const j = (i + 1) % coordinates.length;
        area += coordinates[i].lat * coordinates[j].lng;
        area -= coordinates[j].lat * coordinates[i].lng;
    }
    area = Math.abs(area) / 2;

    const areaInSquareMeters = area * 111000 * 111000 * Math.cos(coordinates[0].lat * Math.PI / 180);
    return areaInSquareMeters / 1600;
};

// Update the PipeLayout type
type PipeLayout = {
    type: 'horizontal' | 'vertical';
    start: LatLng;
    end: LatLng;
    row_index: number | null;
    zone_id: number | null;
    length: number;
};

// Helper to flatten nested arrays from getLatLngs
function flattenLatLngs(latlngs: any): L.LatLng[] {
    if (Array.isArray(latlngs) && latlngs.length > 0 && Array.isArray(latlngs[0])) {
        return latlngs.flat(Infinity) as L.LatLng[];
    }
    return latlngs as L.LatLng[];
}

// Helper to calculate the length of a polyline in meters
function polylineLength(coords: [number, number][]): number {
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
        const [lat1, lng1] = coords[i - 1];
        const [lat2, lng2] = coords[i];
        // Haversine formula
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        total += R * c;
    }
    return total;
}

// Helper function to check if two line segments intersect
function doLineSegmentsIntersect(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
): boolean {
    // Calculate the orientation of three points
    const orientation = (px: number, py: number, qx: number, qy: number, rx: number, ry: number): number => {
        return (qy - py) * (rx - qx) - (qx - px) * (ry - qy);
    };

    // Check if point q lies on segment pr
    const onSegment = (px: number, py: number, qx: number, qy: number, rx: number, ry: number): boolean => {
        return qx <= Math.max(px, rx) && qx >= Math.min(px, rx) &&
               qy <= Math.max(py, ry) && qy >= Math.min(py, ry);
    };

    // Find the four orientations needed for general and special cases
    const o1 = orientation(x1, y1, x2, y2, x3, y3);
    const o2 = orientation(x1, y1, x2, y2, x4, y4);
    const o3 = orientation(x3, y3, x4, y4, x1, y1);
    const o4 = orientation(x3, y3, x4, y4, x2, y2);

    // General case
    if (o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0) {
        return (o1 * o2 < 0) && (o3 * o4 < 0);
    }

    // Special cases
    // p1, q1 and p2 are collinear and p2 lies on segment p1q1
    if (o1 === 0 && onSegment(x1, y1, x3, y3, x2, y2)) return true;

    // p1, q1 and q2 are collinear and q2 lies on segment p1q1
    if (o2 === 0 && onSegment(x1, y1, x4, y4, x2, y2)) return true;

    // p2, q2 and p1 are collinear and p1 lies on segment p2q2
    if (o3 === 0 && onSegment(x3, y3, x1, y1, x4, y4)) return true;

    // p2, q2 and q1 are collinear and q1 lies on segment p2q2
    if (o4 === 0 && onSegment(x3, y3, x2, y2, x4, y4)) return true;

    return false; // Doesn't fall in any of the above cases
}

// Main Component
export default function GenerateTree({ areaType, area, plantType, layers = [] }: Props) {
    const [plantLocations, setPlantLocations] = useState<LatLng[]>([]);
    const [originalPlantLocations, setOriginalPlantLocations] = useState<LatLng[]>([]);
    const [grid, setGrid] = useState<LatLng[][] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPlantLayoutGenerated, setIsPlantLayoutGenerated] = useState(false);
    const [pipeLayout, setPipeLayout] = useState<PipeLayout[]>([]);
    const featureGroupRef = React.useRef<L.FeatureGroup>(null);
    const [zones, setZones] = useState<Zone[]>([]);
    const [currentZoneIndex, setCurrentZoneIndex] = useState<number | null>(null);
    const [userPipes, setUserPipes] = useState<UserPipe[]>([]);
    const [drawingPipeType, setDrawingPipeType] = useState<'main' | 'submain' | null>(null);
    const [showPipeSummary, setShowPipeSummary] = useState(false);
    
    // Add state for point management
    const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
    const [movingPoints, setMovingPoints] = useState<{ id: string; originalPosition: [number, number]; currentPosition: [number, number] }[]>([]);
    const [editMode, setEditMode] = useState<'select' | 'add' | 'delete' | null>(null);

    const areaInRai = useMemo(() => calculateAreaInRai(area), [area]);
    const processedPlantType = useMemo(() => ({
        ...plantType,
        plant_spacing: Number(plantType.plant_spacing),
        row_spacing: Number(plantType.row_spacing),
        water_needed: Number(plantType.water_needed)
    }), [plantType]);

    // Calculate total number of plants
    const totalPlants = useMemo(() => {
        return plantLocations.length;
    }, [plantLocations]);

    const mapCenter = useMemo(() => {
        if (area.length === 0) return DEFAULT_CENTER;
        const center = area.reduce(
            (acc, point) => [acc[0] + point.lat, acc[1] + point.lng],
            [0, 0]
        );
        return [center[0] / area.length, center[1] / area.length] as [number, number];
    }, [area]);

    // Add useEffect to automatically generate tree points
    useEffect(() => {
        const generatePoints = async () => {
            if (area.length > 0 && !isPlantLayoutGenerated) {
                await handleGenerate();
            }
        };
        generatePoints();
    }, [area, processedPlantType, layers]); // Dependencies that should trigger regeneration

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const areaTypes = areaType ? areaType.split(',').map(type => type.trim()) : ['default'];
            
            // Get all layers that should be treated as exclusion zones
            const exclusionLayers = layers.filter(layer => 
                layer.type === 'exclusion' || 
                layer.type === 'river' ||
                layer.type === 'powerplant' ||
                layer.type === 'building' ||
                layer.type === 'solarcell' ||
                layer.type === 'other'
            );

            // Log the request data
            console.log('Generating planting points with data:', {
                area,
                plant_type_id: plantType.id,
                plant_spacing: plantType.plant_spacing,
                row_spacing: plantType.row_spacing,
                area_types: areaTypes,
                layers,
                exclusion_areas: exclusionLayers.map(layer => layer.coordinates)
            });

            const { data } = await axios.post<{ plant_locations: LatLng[][] }>(
                '/api/generate-planting-points',
                {
                    area,
                    plant_type_id: plantType.id,
                    plant_spacing: plantType.plant_spacing,
                    row_spacing: plantType.row_spacing,
                    area_types: areaTypes,
                    layers,
                    exclusion_areas: exclusionLayers.map(layer => layer.coordinates)
                }
            );

            // Log the response data
            console.log('Received plant locations:', data);

            if (!data?.plant_locations) {
                throw new Error('Invalid response format from server');
            }
            // Flatten the 2D array into 1D array of points
            const flattenedPoints = data.plant_locations.flat().map((point, index) => ({
                ...point,
                id: `point-${index}`
            }));
            setPlantLocations(flattenedPoints);
            setOriginalPlantLocations(flattenedPoints);
            setGrid(data.plant_locations);
            setIsPlantLayoutGenerated(true);
        } catch (error) {
            console.error('Error details:', error);
            setError(axios.isAxiosError(error) 
                ? error.response?.data?.message || error.message || 'Error generating points'
                : 'An unexpected error occurred'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleGeneratePipeLayout = async () => {
        if (!plantLocations || !plantLocations.length || !grid) return;

        try {
            setIsLoading(true);
            
            const newPipeLayout: PipeLayout[] = [];

            // Process each zone
            zones.forEach(zone => {
                if (!zone.polygon) return;

                // Get points in this zone
                const zonePoints = plantLocations.filter(point => 
                    isPointInPolygon(
                        point.lat, 
                        point.lng, 
                        zone.polygon!.map(([lat, lng]) => ({ lat, lng }))
                    )
                );

                if (zonePoints.length === 0) return;

                if (zone.pipeDirection === 'horizontal') {
                    // Generate row lines (horizontal) - connect points within each row
                    grid.forEach((row, rowIndex) => {
                        const rowPoints = row.filter(point => 
                            zonePoints.some(zonePoint => 
                                Math.abs(zonePoint.lat - point.lat) < 0.0001 && 
                                Math.abs(zonePoint.lng - point.lng) < 0.0001
                            )
                        );

                        if (rowPoints.length >= 2) {
                            // Sort points by longitude (left to right)
                            rowPoints.sort((a, b) => a.lng - b.lng);
                            
                            // Create pipe from first to last point in the row
                            newPipeLayout.push({
                                type: 'horizontal',
                                start: rowPoints[0],
                                end: rowPoints[rowPoints.length - 1],
                                row_index: rowIndex,
                                zone_id: zone.id,
                                length: calculateDistance(
                                    rowPoints[0].lat, rowPoints[0].lng,
                                    rowPoints[rowPoints.length - 1].lat, rowPoints[rowPoints.length - 1].lng
                                )
                            });
                        }
                    });
                } else {
                    // Generate column lines (vertical) - connect points with same index across rows
                    const maxColIndex = Math.max(...grid.map(row => row.length - 1));
                    
                    for (let colIndex = 0; colIndex <= maxColIndex; colIndex++) {
                        const columnPoints: LatLng[] = [];
                        
                        // Collect points with the same column index from each row
                        grid.forEach(row => {
                            if (row[colIndex]) {
                                const point = row[colIndex];
                                // Check if this point is in the zone
                                if (zonePoints.some(zonePoint => 
                                    Math.abs(zonePoint.lat - point.lat) < 0.0001 && 
                                    Math.abs(zonePoint.lng - point.lng) < 0.0001
                                )) {
                                    columnPoints.push(point);
                                }
                            }
                        });

                        if (columnPoints.length >= 2) {
                            // Sort points by latitude (bottom to top)
                            columnPoints.sort((a, b) => a.lat - b.lat);
                            
                            // Create pipe from first to last point in the column
                            newPipeLayout.push({
                                type: 'vertical',
                                start: columnPoints[0],
                                end: columnPoints[columnPoints.length - 1],
                                row_index: null,
                                zone_id: zone.id,
                                length: calculateDistance(
                                    columnPoints[0].lat, columnPoints[0].lng,
                                    columnPoints[columnPoints.length - 1].lat, columnPoints[columnPoints.length - 1].lng
                                )
                            });
                        }
                    }
                }
            });

            console.log('Generated pipe layout:', newPipeLayout);
            setPipeLayout(newPipeLayout);
        } catch (error) {
            console.error('Error generating pipe layout:', error);
            alert('Failed to generate pipe layout');
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to calculate distance between two points
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371000; // Earth radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                 Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                 Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const handleAddZone = () => {
        if (zones.length >= 4) return;
        const newZone: Zone = {
            id: Date.now(),
            name: `Zone ${zones.length + 1}`,
            color: ZONE_COLORS[zones.length],
            polygon: null,
            pipeDirection: 'horizontal' // default direction
        };
        setZones([...zones, newZone]);
        setCurrentZoneIndex(zones.length);
    };

    const handleDeleteZone = (zoneId: number) => {
        setZones(prevZones => prevZones.filter(zone => zone.id !== zoneId));
        if (currentZoneIndex !== null) {
            const deletedZoneIndex = zones.findIndex(zone => zone.id === zoneId);
            if (deletedZoneIndex === currentZoneIndex) {
                setCurrentZoneIndex(null);
            } else if (deletedZoneIndex < currentZoneIndex) {
                setCurrentZoneIndex(currentZoneIndex - 1);
            }
        }
    };

    const handlePipeDirectionChange = (zoneId: number, direction: 'horizontal' | 'vertical') => {
        setZones(prevZones => 
            prevZones.map(zone => 
                zone.id === zoneId 
                    ? { ...zone, pipeDirection: direction }
                    : zone
            )
        );
    };

    function isPointInZonePolygon(lat: number, lng: number, polygon: [number, number][]) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];
            const intersect = ((yi > lng) !== (yj > lng)) &&
                (lat < (xj - xi) * (lng - yi) / (yj - yi + 0.0000001) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    const getPointColor = (point: LatLng) => {
        for (let i = 0; i < zones.length; i++) {
            const z = zones[i];
            if (z.polygon && isPointInZonePolygon(point.lat, point.lng, z.polygon)) {
                return z.color;
            }
        }
        return 'green';
    };

    // Add handler for point clicks
    const handlePointClick = (pointId: string, event: LeafletMouseEvent) => {
        event.originalEvent?.stopPropagation();
        
        if (editMode === 'select') {
            setSelectedPoints(prev => {
                const newSet = new Set(prev);
                if (newSet.has(pointId)) {
                    newSet.delete(pointId);
                } else {
                    newSet.add(pointId);
                }
                return newSet;
            });
        } else if (editMode === 'delete') {
            const pointIndex = plantLocations.findIndex(p => p.id === pointId);
            if (pointIndex !== -1) {
                const newLocations = plantLocations.filter((_, index) => index !== pointIndex);
                setPlantLocations(newLocations);
                setSelectedPoints(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(pointId);
                    return newSet;
                });
            }
        }
    };

    // Update the marker creation handler
    const handleMarkerCreated = (latlng: L.LatLng) => {
        const newPoint: LatLng = {
            lat: latlng.lat,
            lng: latlng.lng,
            id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        setPlantLocations(prev => [...prev, newPoint]);
    };

    // Function to get pipe color based on the zone's pipeDirection
    const getPipeColor = (pipe: PipeLayout) => {
        const zone = zones.find(z => z.id === pipe.zone_id);
        if (zone) {
            return zone.pipeDirection === 'horizontal' ? '#3B82F6' : '#10B981';
        }
        // fallback
        return '#888';
    };

    // Handler for when a polyline is created
    const handleUserPipeCreated = (e: any) => {
        if (drawingPipeType && e.layerType === 'polyline' && e.layer instanceof L.Polyline) {
            const latlngs: L.LatLng[] = flattenLatLngs(e.layer.getLatLngs());
            const coordinates: [number, number][] = latlngs.map(latlng => [latlng.lat, latlng.lng]);
            setUserPipes(prev => [
                ...prev,
                {
                    id: `userpipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: drawingPipeType,
                    coordinates
                }
            ]);
            setDrawingPipeType(null); // Exit drawing mode
        }
    };

    // Handler for deleting user pipes
    const handleUserPipeDeleted = (e: any) => {
        const layers = e.layers;
        layers.eachLayer((layer: any) => {
            if (layer instanceof L.Polyline) {
                const latlngs: L.LatLng[] = flattenLatLngs(layer.getLatLngs());
                setUserPipes(prev => prev.filter(pipe => {
                    // Remove if coordinates match
                    if (pipe.coordinates.length !== latlngs.length) return true;
                    for (let i = 0; i < latlngs.length; i++) {
                        if (Math.abs(pipe.coordinates[i][0] - latlngs[i].lat) > 1e-8 || Math.abs(pipe.coordinates[i][1] - latlngs[i].lng) > 1e-8) {
                            return true;
                        }
                    }
                    return false;
                }));
            }
        });
    };

    // Calculate pipe lengths
    const mainPipeLengths = userPipes.filter(p => p.type === 'main').map(p => polylineLength(p.coordinates));
    const submainPipeLengths = userPipes.filter(p => p.type === 'submain').map(p => polylineLength(p.coordinates));
    const longestMain = mainPipeLengths.length > 0 ? Math.max(...mainPipeLengths) : 0;
    const longestSubmain = submainPipeLengths.length > 0 ? Math.max(...submainPipeLengths) : 0;
    const totalMainLength = mainPipeLengths.reduce((sum, length) => sum + length, 0);
    const totalSubmainLength = submainPipeLengths.reduce((sum, length) => sum + length, 0);

    // Find the longest main pipe and calculate its connections
    const longestMainPipe = userPipes.filter(p => p.type === 'main').find(p => 
        polylineLength(p.coordinates) === longestMain
    );
    const connectedSubmains = longestMainPipe ? 
        userPipes.filter(p => p.type === 'submain').filter(submain => {
            // Check if the longest main pipe intersects with this submain pipe
            // Check intersection between main pipe segments and submain pipe
            for (let i = 0; i < longestMainPipe.coordinates.length - 1; i++) {
                const mainStart = longestMainPipe.coordinates[i];
                const mainEnd = longestMainPipe.coordinates[i + 1];
                
                for (let j = 0; j < submain.coordinates.length - 1; j++) {
                    const submainStart = submain.coordinates[j];
                    const submainEnd = submain.coordinates[j + 1];
                    
                    // Check if this main segment intersects with this submain segment
                    if (doLineSegmentsIntersect(
                        mainStart[0], mainStart[1],
                        mainEnd[0], mainEnd[1],
                        submainStart[0], submainStart[1],
                        submainEnd[0], submainEnd[1]
                    )) {
                        return true;
                    }
                }
            }
            return false;
        }).length : 0;

    // Find the longest submain pipe and calculate its connections
    const longestSubmainPipe = userPipes.filter(p => p.type === 'submain').find(p => 
        polylineLength(p.coordinates) === longestSubmain
    );
    const connectedBranches = longestSubmainPipe ? 
        pipeLayout.filter(zonePipe => {
            // Check if the longest submain pipe intersects with this branch pipe
            const branchPipeCoords: [number, number][] = [
                [zonePipe.start.lat, zonePipe.start.lng],
                [zonePipe.end.lat, zonePipe.end.lng]
            ];
            
            // Check intersection between submain pipe segments and branch pipe
            for (let i = 0; i < longestSubmainPipe.coordinates.length - 1; i++) {
                const submainStart = longestSubmainPipe.coordinates[i];
                const submainEnd = longestSubmainPipe.coordinates[i + 1];
                
                // Check if this submain segment intersects with the branch pipe
                if (doLineSegmentsIntersect(
                    submainStart[0], submainStart[1],
                    submainEnd[0], submainEnd[1],
                    branchPipeCoords[0][0], branchPipeCoords[0][1],
                    branchPipeCoords[1][0], branchPipeCoords[1][1]
                )) {
                    return true;
                }
            }
            return false;
        }).length : 0;

    // Calculate zone pipe lengths and find longest branch pipe
    const zonePipeLengths = zones.map(zone => {
        const zonePipes = pipeLayout.filter(pipe => pipe.zone_id === zone.id);
        const longestPipeLength = zonePipes.length > 0 
            ? Math.max(...zonePipes.map(pipe => pipe.length))
            : 0;
        const totalZoneLength = zonePipes.reduce((sum, pipe) => sum + pipe.length, 0);
        
        // Find the longest branch pipe for this zone
        const longestBranchPipe = zonePipes.find(pipe => pipe.length === longestPipeLength);
        const plantCount = longestBranchPipe ? 
            plantLocations.filter(plant => {
                // Check if plant is along the pipe path between start and end points
                const startLat = longestBranchPipe.start.lat;
                const startLng = longestBranchPipe.start.lng;
                const endLat = longestBranchPipe.end.lat;
                const endLng = longestBranchPipe.end.lng;
                
                // Calculate distance from plant to the pipe line segment
                const A = plant.lat - startLat;
                const B = plant.lng - startLng;
                const C = endLat - startLat;
                const D = endLng - startLng;
                
                const dot = A * C + B * D;
                const lenSq = C * C + D * D;
                
                if (lenSq === 0) {
                    // Start and end are the same point
                    const distance = Math.sqrt(
                        Math.pow(plant.lat - startLat, 2) + 
                        Math.pow(plant.lng - startLng, 2)
                    );
                    return distance < 0.0001; // About 10 meters tolerance
                }
                
                const param = dot / lenSq;
                
                let closestLat, closestLng;
                if (param < 0) {
                    // Closest point is the start
                    closestLat = startLat;
                    closestLng = startLng;
                } else if (param > 1) {
                    // Closest point is the end
                    closestLat = endLat;
                    closestLng = endLng;
                } else {
                    // Closest point is along the line segment
                    closestLat = startLat + param * C;
                    closestLng = startLng + param * D;
                }
                
                // Calculate distance from plant to closest point on pipe
                const distance = Math.sqrt(
                    Math.pow(plant.lat - closestLat, 2) + 
                    Math.pow(plant.lng - closestLng, 2)
                );
                
                return distance < 0.0001; // About 10 meters tolerance
            }).length : 0;

        return {
            zoneId: zone.id,
            zoneName: zone.name,
            longestPipe: longestPipeLength,
            totalLength: totalZoneLength,
            longestBranchPipe: longestBranchPipe ? {
                length: longestPipeLength,
                plantCount: plantCount,
                coordinates: [
                    [longestBranchPipe.start.lat, longestBranchPipe.start.lng],
                    [longestBranchPipe.end.lat, longestBranchPipe.end.lng]
                ]
            } : null
        };
    });

    // Find the overall longest branch pipe across all zones
    const longestBranchPipeData = zonePipeLengths
        .filter(zone => zone.longestBranchPipe)
        .reduce((longest, zone) => 
            zone.longestBranchPipe && zone.longestBranchPipe.length > (longest?.longestBranchPipe?.length || 0) 
                ? zone 
                : longest, 
            null as any
        );

    // Calculate area and plant data
    const totalWaterNeed = totalPlants * processedPlantType.water_needed;

    // Calculate zone-specific data
    const zoneData = zones.map(zone => {
        const pointsInZone = plantLocations.filter(point => 
            zone.polygon && isPointInZonePolygon(point.lat, point.lng, zone.polygon)
        );
        const zoneArea = zone.polygon ? 
            calculateAreaInRai(zone.polygon.map(([lat, lng]) => ({ lat, lng }))) : 0;
        const plantsInZone = pointsInZone.length;
        const waterNeedInZone = plantsInZone * processedPlantType.water_needed;

        return {
            id: zone.id,
            name: zone.name,
            area: zoneArea,
            plants: plantsInZone,
            waterNeed: waterNeedInZone
        };
    });

    // Share area and plant data with other pages
    useEffect(() => {
        const farmData = {
            total: {
                area: areaInRai,
                plants: totalPlants,
                waterNeed: totalWaterNeed
            },
            zones: zoneData
        };

        // Store in localStorage for persistence
        localStorage.setItem('farmData', JSON.stringify(farmData));
        
        // Share with Inertia
        router.reload({
            only: ['farmData'],
            data: { farmData }
        });
    }, [areaInRai, totalPlants, totalWaterNeed, zoneData]);

    // Store enhanced pipe data in localStorage
    useEffect(() => {
        if (pipeLayout.length > 0 || userPipes.length > 0) {
            const pipeData = {
                mainPipes: {
                    longest: longestMain,
                    total: totalMainLength,
                    longestPipe: longestMainPipe ? {
                        length: longestMain,
                        connectedSubmains: connectedSubmains,
                        coordinates: longestMainPipe.coordinates
                    } : null
                },
                submainPipes: {
                    longest: longestSubmain,
                    total: totalSubmainLength,
                    longestPipe: longestSubmainPipe ? {
                        length: longestSubmain,
                        connectedBranches: connectedBranches,
                        coordinates: longestSubmainPipe.coordinates
                    } : null
                },
                zones: zonePipeLengths.map(zone => ({
                    id: zone.zoneId,
                    name: zone.zoneName,
                    longestBranch: zone.longestPipe,
                    totalBranchLength: zone.totalLength,
                    longestBranchPipe: zone.longestBranchPipe
                })),
                analytics: {
                    longestMainPipe: {
                        length: longestMain,
                        connectedSubmains: connectedSubmains,
                        totalPlantsServed: longestMainPipe ? 
                            plantLocations.filter(plant => {
                                // Check if plant is along any segment of the main pipe
                                for (let i = 0; i < longestMainPipe.coordinates.length - 1; i++) {
                                    const startLat = longestMainPipe.coordinates[i][0];
                                    const startLng = longestMainPipe.coordinates[i][1];
                                    const endLat = longestMainPipe.coordinates[i + 1][0];
                                    const endLng = longestMainPipe.coordinates[i + 1][1];
                                    
                                    // Calculate distance from plant to the pipe line segment
                                    const A = plant.lat - startLat;
                                    const B = plant.lng - startLng;
                                    const C = endLat - startLat;
                                    const D = endLng - startLng;
                                    
                                    const dot = A * C + B * D;
                                    const lenSq = C * C + D * D;
                                    
                                    if (lenSq === 0) {
                                        // Start and end are the same point
                                        const distance = Math.sqrt(
                                            Math.pow(plant.lat - startLat, 2) + 
                                            Math.pow(plant.lng - startLng, 2)
                                        );
                                        if (distance < 0.0001) return true;
                                        continue;
                                    }
                                    
                                    const param = dot / lenSq;
                                    
                                    let closestLat, closestLng;
                                    if (param < 0) {
                                        closestLat = startLat;
                                        closestLng = startLng;
                                    } else if (param > 1) {
                                        closestLat = endLat;
                                        closestLng = endLng;
                                    } else {
                                        closestLat = startLat + param * C;
                                        closestLng = startLng + param * D;
                                    }
                                    
                                    const distance = Math.sqrt(
                                        Math.pow(plant.lat - closestLat, 2) + 
                                        Math.pow(plant.lng - closestLng, 2)
                                    );
                                    
                                    if (distance < 0.0001) return true;
                                }
                                return false;
                            }).length : 0
                    },
                    longestSubmainPipe: {
                        length: longestSubmain,
                        connectedBranches: connectedBranches,
                        totalPlantsServed: longestSubmainPipe ? 
                            plantLocations.filter(plant => {
                                // Check if plant is along any segment of the submain pipe
                                for (let i = 0; i < longestSubmainPipe.coordinates.length - 1; i++) {
                                    const startLat = longestSubmainPipe.coordinates[i][0];
                                    const startLng = longestSubmainPipe.coordinates[i][1];
                                    const endLat = longestSubmainPipe.coordinates[i + 1][0];
                                    const endLng = longestSubmainPipe.coordinates[i + 1][1];
                                    
                                    // Calculate distance from plant to the pipe line segment
                                    const A = plant.lat - startLat;
                                    const B = plant.lng - startLng;
                                    const C = endLat - startLat;
                                    const D = endLng - startLng;
                                    
                                    const dot = A * C + B * D;
                                    const lenSq = C * C + D * D;
                                    
                                    if (lenSq === 0) {
                                        // Start and end are the same point
                                        const distance = Math.sqrt(
                                            Math.pow(plant.lat - startLat, 2) + 
                                            Math.pow(plant.lng - startLng, 2)
                                        );
                                        if (distance < 0.0001) return true;
                                        continue;
                                    }
                                    
                                    const param = dot / lenSq;
                                    
                                    let closestLat, closestLng;
                                    if (param < 0) {
                                        closestLat = startLat;
                                        closestLng = startLng;
                                    } else if (param > 1) {
                                        closestLat = endLat;
                                        closestLng = endLng;
                                    } else {
                                        closestLat = startLat + param * C;
                                        closestLng = startLng + param * D;
                                    }
                                    
                                    const distance = Math.sqrt(
                                        Math.pow(plant.lat - closestLat, 2) + 
                                        Math.pow(plant.lng - closestLng, 2)
                                    );
                                    
                                    if (distance < 0.0001) return true;
                                }
                                return false;
                            }).length : 0
                    },
                    longestBranchPipe: longestBranchPipeData ? {
                        length: longestBranchPipeData.longestBranchPipe.length,
                        plantCount: longestBranchPipeData.longestBranchPipe.plantCount,
                        zoneName: longestBranchPipeData.zoneName
                    } : null
                }
            };

            localStorage.setItem('pipeLengthData', JSON.stringify(pipeData));
        }
    }, [pipeLayout, userPipes, longestMain, longestSubmain, connectedSubmains, connectedBranches, zonePipeLengths, longestBranchPipeData, plantLocations]);

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
                            <p><span className="font-medium">Plant Category:</span> {processedPlantType.name}</p>
                            <p><span className="font-medium">Plant Selection:</span> {processedPlantType.type}</p>
                        </InfoItem>
                        <InfoItem title="Spacing Requirements">
                            <p><span className="font-medium">Plant Spacing:</span> {processedPlantType.plant_spacing.toFixed(2)}m</p>
                            <p><span className="font-medium">Row Spacing:</span> {processedPlantType.row_spacing.toFixed(2)}m</p>
                        </InfoItem>
                        <InfoItem title="Water Requirements">
                            <p><span className="font-medium">Daily Water Need:</span> {processedPlantType.water_needed.toFixed(2)}L/day</p>
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
                            <p>{(plantLocations.length * processedPlantType.water_needed).toFixed(2)} L/day</p>
                        </InfoItem>
                    </InfoSection>
                    <InfoSection title="Zoning Configuration">
                        <InfoItem title="Zones">
                            <div className="flex flex-col gap-2">
                                {zones.map((zone, idx) => {
                                    const pointsInZone = plantLocations.filter(point => 
                                        zone.polygon && isPointInZonePolygon(point.lat, point.lng, zone.polygon)
                                    );
                                    const zoneArea = zone.polygon ? 
                                        calculateAreaInRai(zone.polygon.map(([lat, lng]) => ({ lat, lng }))) : 0;
                                    const totalWaterNeed = pointsInZone.length * processedPlantType.water_needed;
                                    
                                    // Calculate longest pipe length for this zone
                                    const zonePipes = pipeLayout.filter(pipe => pipe.zone_id === zone.id);
                                    const longestPipeLength = zonePipes.length > 0 
                                        ? Math.max(...zonePipes.map(pipe => pipe.length))
                                        : 0;

                                    return (
                                        <div key={zone.id} className="flex flex-col gap-2 p-2 rounded bg-gray-800">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span style={{ 
                                                        background: zone.color, 
                                                        width: 16, 
                                                        height: 16, 
                                                        display: 'inline-block', 
                                                        borderRadius: 4 
                                                    }}></span>
                                                    <span className="text-white font-medium">{zone.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteZone(zone.id)}
                                                    className="px-2 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
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
                                                        <span>L: {longestPipeLength.toFixed(2)}m</span>
                                                    </>
                                                )}
                                            </div>
                                            {zone.polygon && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-300">Pipe Direction:</span>
                                                    <select
                                                        value={zone.pipeDirection}
                                                        onChange={(e) => handlePipeDirectionChange(zone.id, e.target.value as 'horizontal' | 'vertical')}
                                                        className="px-2 py-1 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                                                        disabled={currentZoneIndex !== null}
                                                    >
                                                        <option value="horizontal">Horizontal (Width)</option>
                                                        <option value="vertical">Vertical (Height)</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <button
                                    className={`mt-2 px-2 py-1 rounded bg-blue-600 text-white text-xs ${
                                        zones.length >= 4 ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                    onClick={handleAddZone}
                                    disabled={zones.length >= 4 || currentZoneIndex !== null}
                                >
                                    + Add Zone
                                </button>
                                {zones.length >= 4 && <span className="text-xs text-gray-400">Max 4 zones</span>}
                                {currentZoneIndex !== null && 
                                    <span className="text-xs text-yellow-400">
                                        Draw polygon for {zones[currentZoneIndex]?.name}
                                    </span>
                                }
                            </div>
                        </InfoItem>
                    </InfoSection>
                    <div className="flex gap-2 mt-4">
                        <button
                            className={`px-3 py-2 rounded ${drawingPipeType === 'main' ? 'bg-red-600 text-white' : 'bg-red-500 text-white hover:bg-red-600'}`}
                            onClick={() => setDrawingPipeType(drawingPipeType === 'main' ? null : 'main')}
                            disabled={drawingPipeType === 'submain'}
                        >
                            {drawingPipeType === 'main' ? 'Drawing Main Pipe...' : 'Draw Main Pipe'}
                        </button>
                        <button
                            className={`px-3 py-2 rounded ${drawingPipeType === 'submain' ? 'bg-orange-600 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                            onClick={() => setDrawingPipeType(drawingPipeType === 'submain' ? null : 'submain')}
                            disabled={drawingPipeType === 'main'}
                        >
                            {drawingPipeType === 'submain' ? 'Drawing Sub-Main Pipe...' : 'Draw Sub-Main Pipe'}
                        </button>
                    </div>
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
                            
                            {layers.filter(layer => layer.isInitialMap).map((layer, index) => (
                                <Polygon
                                    key={`initial-map-${index}`}
                                    positions={layer.coordinates.map(coord => [coord.lat, coord.lng])}
                                    pathOptions={{
                                        color: '#90EE90',
                                        fillColor: '#90EE90',
                                        fillOpacity: 0.5,
                                        weight: 2
                                    }}
                                />
                            ))}
                            <FeatureGroup ref={featureGroupRef}>
                                <EditControl
                                    position="topright"
                                    onCreated={(e) => {
                                        // Polygon for zone
                                        if (currentZoneIndex !== null && e.layerType === 'polygon' && e.layer instanceof L.Polygon) {
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
                                            setZones(prev => prev.map((z, idx) => idx === currentZoneIndex ? { ...z, polygon } : z));
                                            setCurrentZoneIndex(null);
                                            featureGroupRef.current?.removeLayer(layer);
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
                                                setPlantLocations(prev => 
                                                    prev.filter(p => p.lat !== latlng.lat || p.lng !== latlng.lng)
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
                                                setPlantLocations(prev => 
                                                    prev.map(p => 
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
                                        polygon: currentZoneIndex !== null,
                                        circle: false,
                                        circlemarker: false,
                                        marker: true,
                                        polyline: drawingPipeType !== null // Only allow polyline when drawing mode is active
                                    }}
                                    edit={{
                                        edit: {
                                            selectedPathOptions: {
                                                dashArray: '10, 10'
                                            }
                                        },
                                        remove: true
                                    }}
                                />
                            </FeatureGroup>
                            <PointManagementControls 
                                plantLocations={plantLocations}
                                setPlantLocations={setPlantLocations}
                                area={area}
                                plantType={processedPlantType}
                                originalPlantLocations={originalPlantLocations}
                                selectedPoints={selectedPoints}
                                setSelectedPoints={setSelectedPoints}
                                movingPoints={movingPoints}
                                setMovingPoints={setMovingPoints}
                                editMode={editMode}
                                setEditMode={setEditMode}
                                grid={grid}
                            />
                            
                            {zones.map((zone, idx) => (
                                zone.polygon ? (
                                    <Polygon
                                        key={zone.id}
                                        positions={zone.polygon}
                                        pathOptions={{ color: zone.color, weight: 2, fillOpacity: 0.2 }}
                                    />
                                ) : null
                            ))}
                            {plantLocations.map((point, index) => {
                                const pointId = point.id || `point-${index}`;
                                const color = getPointColor(point);
                                const isSelected = selectedPoints.has(pointId);
                                const isMoving = movingPoints.some(mp => mp.id === pointId);
                                
                                return (
                                    <CircleMarker
                                        key={pointId}
                                        center={[point.lat, point.lng]}
                                        radius={isSelected || isMoving ? 3 : 1.5}
                                        eventHandlers={{
                                            click: (e) => {
                                                if (editMode === 'select' || editMode === 'delete') {
                                                    handlePointClick(pointId, e);
                                                }
                                            }
                                        }}
                                        pathOptions={{
                                            color: isSelected || isMoving ? '#FFD700' : color,
                                            fillColor: isSelected || isMoving ? '#FFD700' : color,
                                            fillOpacity: 1,
                                            weight: isSelected || isMoving ? 2 : 1,
                                        }}
                                    />
                                );
                            })}
                            {pipeLayout.length > 0 && (
                                <FeatureGroup>
                                    {pipeLayout.map((pipe, index) => {
                                        console.log('Rendering pipe:', pipe);
                                        return (
                                            <Polyline
                                                key={`pipe-${index}`}
                                                positions={[
                                                    [pipe.start.lat, pipe.start.lng],
                                                    [pipe.end.lat, pipe.end.lng]
                                                ]}
                                                color={getPipeColor(pipe)}
                                                weight={3}
                                                opacity={0.8}
                                            />
                                        );
                                    })}
                                </FeatureGroup>
                            )}
                            {userPipes.map(pipe => (
                                <Polyline
                                    key={pipe.id}
                                    positions={pipe.coordinates}
                                    color={pipe.type === 'main' ? 'red' : 'orange'}
                                    weight={5}
                                    opacity={0.8}
                                />
                            ))}
                        </MapContainer>
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                        <button
                            onClick={handleGeneratePipeLayout}
                            disabled={isLoading || !isPlantLayoutGenerated || zones.length === 0}
                            className="rounded bg-blue-600 px-6 py-2 text-white transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-700"
                        >
                            {isLoading ? 'Generating...' : 'Generate Pipe Layout'}
                        </button>
                        <button
                            onClick={() => setShowPipeSummary(true)}
                            disabled={pipeLayout.length === 0}
                            className={`rounded px-6 py-2 font-semibold shadow-lg transition-colors duration-200
                                ${pipeLayout.length === 0
                                    ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700'}`}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <button
                    onClick={() => router.get('/planner', {}, { preserveState: true })}
                    className="rounded bg-gray-700 px-6 py-2 text-white transition-colors duration-200 hover:bg-gray-600"
                >
                    Back
                </button>
            </div>

            {showPipeSummary && (
                <div className="mt-4 p-4 bg-gray-800 rounded-lg text-white">
                    <h3 className="text-lg font-semibold mb-4">Pipe Summary</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-md font-medium text-gray-300">Main Pipes</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Longest Main Pipe:</span>
                                    <span className="font-bold">{longestMain.toFixed(2)} m</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Total Main Pipe Length:</span>
                                    <span className="font-bold">{totalMainLength.toFixed(2)} m</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Connected Sub-Main Pipes:</span>
                                    <span className="font-bold">{connectedSubmains}</span>
                                </div>
                                {longestMainPipe && (
                                    <div className="flex justify-between">
                                        <span>Plants Served by Longest Main:</span>
                                        <span className="font-bold">
                                            {plantLocations.filter(plant => {
                                                // Check if plant is along any segment of the main pipe
                                                for (let i = 0; i < longestMainPipe.coordinates.length - 1; i++) {
                                                    const startLat = longestMainPipe.coordinates[i][0];
                                                    const startLng = longestMainPipe.coordinates[i][1];
                                                    const endLat = longestMainPipe.coordinates[i + 1][0];
                                                    const endLng = longestMainPipe.coordinates[i + 1][1];
                                                    
                                                    // Calculate distance from plant to the pipe line segment
                                                    const A = plant.lat - startLat;
                                                    const B = plant.lng - startLng;
                                                    const C = endLat - startLat;
                                                    const D = endLng - startLng;
                                                    
                                                    const dot = A * C + B * D;
                                                    const lenSq = C * C + D * D;
                                                    
                                                    if (lenSq === 0) {
                                                        // Start and end are the same point
                                                        const distance = Math.sqrt(
                                                            Math.pow(plant.lat - startLat, 2) + 
                                                            Math.pow(plant.lng - startLng, 2)
                                                        );
                                                        if (distance < 0.0001) return true;
                                                        continue;
                                                    }
                                                    
                                                    const param = dot / lenSq;
                                                    
                                                    let closestLat, closestLng;
                                                    if (param < 0) {
                                                        closestLat = startLat;
                                                        closestLng = startLng;
                                                    } else if (param > 1) {
                                                        closestLat = endLat;
                                                        closestLng = endLng;
                                                    } else {
                                                        closestLat = startLat + param * C;
                                                        closestLng = startLng + param * D;
                                                    }
                                                    
                                                    const distance = Math.sqrt(
                                                        Math.pow(plant.lat - closestLat, 2) + 
                                                        Math.pow(plant.lng - closestLng, 2)
                                                    );
                                                    
                                                    if (distance < 0.0001) return true;
                                                }
                                                return false;
                                            }).length}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-md font-medium text-gray-300">Sub-Main Pipes</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Longest Sub-Main Pipe:</span>
                                    <span className="font-bold">{longestSubmain.toFixed(2)} m</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Total Sub-Main Pipe Length:</span>
                                    <span className="font-bold">{totalSubmainLength.toFixed(2)} m</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Connected Branch Pipes:</span>
                                    <span className="font-bold">{connectedBranches}</span>
                                </div>
                                {longestSubmainPipe && (
                                    <div className="flex justify-between">
                                        <span>Plants Served by Longest Sub-Main:</span>
                                        <span className="font-bold">
                                            {plantLocations.filter(plant => {
                                                // Check if plant is along any segment of the submain pipe
                                                for (let i = 0; i < longestSubmainPipe.coordinates.length - 1; i++) {
                                                    const startLat = longestSubmainPipe.coordinates[i][0];
                                                    const startLng = longestSubmainPipe.coordinates[i][1];
                                                    const endLat = longestSubmainPipe.coordinates[i + 1][0];
                                                    const endLng = longestSubmainPipe.coordinates[i + 1][1];
                                                    
                                                    // Calculate distance from plant to the pipe line segment
                                                    const A = plant.lat - startLat;
                                                    const B = plant.lng - startLng;
                                                    const C = endLat - startLat;
                                                    const D = endLng - startLng;
                                                    
                                                    const dot = A * C + B * D;
                                                    const lenSq = C * C + D * D;
                                                    
                                                    if (lenSq === 0) {
                                                        // Start and end are the same point
                                                        const distance = Math.sqrt(
                                                            Math.pow(plant.lat - startLat, 2) + 
                                                            Math.pow(plant.lng - startLng, 2)
                                                        );
                                                        if (distance < 0.0001) return true;
                                                        continue;
                                                    }
                                                    
                                                    const param = dot / lenSq;
                                                    
                                                    let closestLat, closestLng;
                                                    if (param < 0) {
                                                        closestLat = startLat;
                                                        closestLng = startLng;
                                                    } else if (param > 1) {
                                                        closestLat = endLat;
                                                        closestLng = endLng;
                                                    } else {
                                                        closestLat = startLat + param * C;
                                                        closestLng = startLng + param * D;
                                                    }
                                                    
                                                    const distance = Math.sqrt(
                                                        Math.pow(plant.lat - closestLat, 2) + 
                                                        Math.pow(plant.lng - closestLng, 2)
                                                    );
                                                    
                                                    if (distance < 0.0001) return true;
                                                }
                                                return false;
                                            }).length}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h4 className="text-md font-medium text-gray-300 mb-4">Zone Pipe Details</h4>
                        <div className="space-y-4">
                            {zonePipeLengths.map(zone => (
                                <div key={zone.zoneId} className="bg-gray-700 p-3 rounded">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span style={{ 
                                            background: zones.find(z => z.id === zone.zoneId)?.color, 
                                            width: 12, 
                                            height: 12, 
                                            display: 'inline-block', 
                                            borderRadius: 3 
                                        }}></span>
                                        <span className="font-medium">{zone.zoneName}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex justify-between">
                                            <span>Longest Branch:</span>
                                            <span className="font-bold">{zone.longestPipe.toFixed(2)} m</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Total Branch Length:</span>
                                            <span className="font-bold">{zone.totalLength.toFixed(2)} m</span>
                                        </div>
                                        {zone.longestBranchPipe && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span>Plants on Longest Branch:</span>
                                                    <span className="font-bold">{zone.longestBranchPipe.plantCount}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Branch Type:</span>
                                                    <span className="font-bold">
                                                        {pipeLayout.find(p => 
                                                            p.zone_id === zone.zoneId && 
                                                            p.length === zone.longestPipe
                                                        )?.type || 'Unknown'}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {longestBranchPipeData && (
                        <div className="mt-6 p-4 bg-blue-900 rounded-lg">
                            <h4 className="text-md font-medium text-blue-200 mb-2">Longest Branch Pipe Analytics</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="flex justify-between">
                                    <span>Zone:</span>
                                    <span className="font-bold">{longestBranchPipeData.zoneName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Length:</span>
                                    <span className="font-bold">{longestBranchPipeData.longestBranchPipe.length.toFixed(2)} m</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Plants Served:</span>
                                    <span className="font-bold">{longestBranchPipeData.longestBranchPipe.plantCount}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
