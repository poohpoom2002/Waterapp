import React, { useState, useMemo, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    Polygon,
    useMap,
    FeatureGroup,
    LayersControl,
    Polyline,
} from 'react-leaflet';
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
    <div className="h-[440px] rounded-lg bg-gray-800 p-4">
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

const MapDragHandler = ({
    isDragging,
    editMode,
    selectedPoints,
}: {
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
function isPointInPolygon(
    lat: number,
    lng: number,
    polygon: { lat: number; lng: number }[]
): boolean {
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
}

// Add function to find nearest grid point
function findNearestGridPoint(
    lat: number,
    lng: number,
    plantType: PlantType,
    area: LatLng[]
): [number, number] {
    // Calculate grid parameters
    const plantSpacing = plantType.plant_spacing;
    const rowSpacing = plantType.row_spacing;
    const padding = rowSpacing / 2; // Half of row spacing for padding

    // Find the bounds of the area
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

    // Add padding to bounds
    const paddedBounds = {
        minLat: bounds.minLat + padding / 111000, // Convert meters to degrees
        maxLat: bounds.maxLat - padding / 111000,
        minLng: bounds.minLng + padding / (111000 * Math.cos((bounds.minLat * Math.PI) / 180)),
        maxLng: bounds.maxLng - padding / (111000 * Math.cos((bounds.minLat * Math.PI) / 180)),
    };

    // Calculate grid points
    const latPoints: number[] = [];
    const lngPoints: number[] = [];

    // Generate grid points with padding
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

    // Find nearest grid point
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
}

const PointManagementControls = ({
    plantLocations,
    setPlantLocations,
    area,
    plantType,
}: {
    plantLocations: LatLng[];
    setPlantLocations: React.Dispatch<React.SetStateAction<LatLng[]>>;
    area: LatLng[];
    plantType: PlantType;
}) => {
    const map = useMap();
    const [editMode, setEditMode] = useState<'select' | 'add' | 'delete' | null>(null);
    const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
    const [movingPoint, setMovingPoint] = useState<{
        id: string;
        position: [number, number];
    } | null>(null);
    const [history, setHistory] = useState<LatLng[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Initialize history when plantLocations changes and there's no history
    useEffect(() => {
        if (history.length === 0 && plantLocations.length > 0) {
            setHistory([[...plantLocations]]);
            setHistoryIndex(0);
        }
    }, [plantLocations]);

    // Add function to save state to history
    const saveToHistory = (newLocations: LatLng[]) => {
        setHistory((prev) => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push([...newLocations]);
            return newHistory;
        });
        setHistoryIndex((prev) => prev + 1);
    };

    // Add undo function
    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setPlantLocations([...history[newIndex]]);
        }
    };

    const handleAddPoints = () => {
        setEditMode('add');
    };

    const handleDeletePoints = () => {
        setEditMode('delete');
    };

    const handleMovePoints = () => {
        setEditMode('select');
    };

    const handleCancel = () => {
        setEditMode(null);
        setSelectedPoints(new Set());
        setMovingPoint(null);
    };

    const handleMapClick = (e: LeafletMouseEvent) => {
        if (editMode === 'add') {
            const [nearestLat, nearestLng] = findNearestGridPoint(
                e.latlng.lat,
                e.latlng.lng,
                plantType,
                area
            );

            // Only add if the point is inside the area
            if (isPointInPolygon(nearestLat, nearestLng, area)) {
                const newPoint: LatLng = {
                    lat: nearestLat,
                    lng: nearestLng,
                    id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                };
                const newResults = [...plantLocations, newPoint];
                saveToHistory(newResults);
                setPlantLocations(newResults);
            }
        }
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
            const pointIndex = plantLocations.findIndex(
                (p) => (p.id || `point-${plantLocations.indexOf(p)}`) === pointId
            );
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
                (p.id || `point-${plantLocations.indexOf(p)}`) === movingPoint.id
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
                            className={`rounded px-3 py-2 transition-colors ${
                                editMode === 'add'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                        >
                            Add Points
                        </button>
                        <button
                            onClick={handleDeletePoints}
                            className={`rounded px-3 py-2 transition-colors ${
                                editMode === 'delete'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-red-500 text-white hover:bg-red-600'
                            }`}
                        >
                            Delete Points
                        </button>
                        <button
                            onClick={handleMovePoints}
                            className={`rounded px-3 py-2 transition-colors ${
                                editMode === 'select'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            Move Points
                        </button>
                    </div>
                </div>
            </div>
            <MapClickHandler onMapClick={handleMapClick} />
            <MapDragHandler
                isDragging={!!movingPoint}
                editMode={editMode}
                selectedPoints={selectedPoints}
            />
            <MouseTracker onMove={handleMouseMove} />
            <MapMouseUpHandler onMouseUp={handleMouseUp} />
            {plantLocations.map((point, index) => {
                const pointId = point.id || `point-${index}`;
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

// Helper Functions
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

// Main Component
export default function GenerateTree({ areaType, area, plantType, layers = [] }: Props) {
    const [plantLocations, setPlantLocations] = useState<LatLng[]>([]);
    const [grid, setGrid] = useState<LatLng[][] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPlantLayoutGenerated, setIsPlantLayoutGenerated] = useState(false);
    const featureGroupRef = React.useRef<L.FeatureGroup>(null);

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

    const mapCenter = useMemo(() => {
        if (area.length === 0) return DEFAULT_CENTER;
        const center = area.reduce(
            (acc, point) => [acc[0] + point.lat, acc[1] + point.lng],
            [0, 0]
        );
        return [center[0] / area.length, center[1] / area.length] as [number, number];
    }, [area]);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const areaTypes = areaType
                ? areaType.split(',').map((type) => type.trim())
                : ['default'];
            const { data } = await axios.post<{ plant_locations: LatLng[]; grid: LatLng[][] }>(
                '/api/generate-planting-points',
                {
                    area,
                    plant_type_id: plantType.id,
                    plant_spacing: plantType.plant_spacing,
                    row_spacing: plantType.row_spacing,
                    area_types: areaTypes,
                    layers,
                }
            );
            if (!data?.plant_locations) {
                throw new Error('Invalid response format from server');
            }
            setPlantLocations(data.plant_locations);
            setGrid(data.grid || null);
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
        setIsLoading(true);
        setError(null);

        try {
            console.log('Generating pipe layout...');
        } catch (error) {
            setError(
                axios.isAxiosError(error)
                    ? error.response?.data?.message || 'Error generating pipe layout'
                    : 'An unexpected error occurred'
            );
        } finally {
            setIsLoading(false);
        }
    };

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
                        <InfoItem title="Area Size">
                            <p>{areaInRai.toFixed(2)} rai</p>
                        </InfoItem>
                        <InfoItem title="Number of Plants">
                            <p>{plantLocations.length} plants</p>
                        </InfoItem>
                        <InfoItem title="Total Water Need">
                            <p>
                                {(plantLocations.length * processedPlantType.water_needed).toFixed(
                                    2
                                )}{' '}
                                L/day
                            </p>
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

                            <FeatureGroup ref={featureGroupRef}>
                                <EditControl
                                    position="topright"
                                    onCreated={(e) => {
                                        const layer = e.layer;
                                        if (layer instanceof L.Marker) {
                                            const latlng = layer.getLatLng();
                                            setPlantLocations((prev) => [
                                                ...prev,
                                                { lat: latlng.lat, lng: latlng.lng },
                                            ]);
                                        }
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
                                        circle: false,
                                        circlemarker: false,
                                        marker: true,
                                        polyline: false,
                                        polygon: false,
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
                            />

                            {layers.map((layer, index) => {
                                const styleMap: Record<
                                    string,
                                    { color: string; fillOpacity: number; dashArray?: string }
                                > = {
                                    river: { color: AREA_COLORS.river, fillOpacity: 0.5 },
                                    field: { color: AREA_COLORS.field, fillOpacity: 0.5 },
                                    building: { color: AREA_COLORS.building, fillOpacity: 0.5 },
                                    powerplant: { color: AREA_COLORS.powerplant, fillOpacity: 0.5 },
                                    solarcell: { color: AREA_COLORS.solarcell, fillOpacity: 0.5 },
                                    custompolygon: {
                                        color: AREA_COLORS.custompolygon,
                                        fillOpacity: 0.5,
                                    },
                                };

                                if (layer.type === 'pump') {
                                    return (
                                        <CircleMarker
                                            key={`${layer.type}-${index}`}
                                            center={[
                                                layer.coordinates[0].lat,
                                                layer.coordinates[0].lng,
                                            ]}
                                            radius={5}
                                            pathOptions={{
                                                color: AREA_COLORS.pump,
                                                fillColor: AREA_COLORS.pump,
                                                fillOpacity: 1,
                                                weight: 2,
                                            }}
                                        />
                                    );
                                }

                                if (layer.isInitialMap) {
                                    return (
                                        <Polygon
                                            key={`initial-map-${index}`}
                                            positions={layer.coordinates.map((coord) => [
                                                coord.lat,
                                                coord.lng,
                                            ])}
                                            pathOptions={{
                                                color: '#90EE90',
                                                fillColor: '#90EE90',
                                                fillOpacity: 0.5,
                                                weight: 2,
                                            }}
                                        />
                                    );
                                }

                                if (styleMap[layer.type]) {
                                    return (
                                        <Polygon
                                            key={`${layer.type}-${index}`}
                                            positions={layer.coordinates.map((coord) => [
                                                coord.lat,
                                                coord.lng,
                                            ])}
                                            pathOptions={{
                                                ...styleMap[layer.type],
                                                fillColor: styleMap[layer.type].color,
                                                weight: 2,
                                            }}
                                        />
                                    );
                                }
                                return null;
                            })}
                            {grid &&
                                grid.map((row, rowIdx) => {
                                    const rowPoints = row.filter((pt) => pt);
                                    if (rowPoints.length < 2) return null;
                                    return (
                                        <Polyline
                                            key={`grid-row-${rowIdx}`}
                                            positions={rowPoints.map((pt) => [pt.lat, pt.lng])}
                                            color="blue"
                                            weight={1}
                                            opacity={0.5}
                                        />
                                    );
                                })}
                            {grid &&
                                grid[0] &&
                                grid[0].map((_, colIdx) => {
                                    const colPoints = grid
                                        .map((row) => row[colIdx])
                                        .filter((pt) => pt);
                                    if (colPoints.length < 2) return null;
                                    return (
                                        <Polyline
                                            key={`grid-col-${colIdx}`}
                                            positions={colPoints.map((pt) => [pt.lat, pt.lng])}
                                            color="orange"
                                            weight={1}
                                            opacity={0.5}
                                        />
                                    );
                                })}
                        </MapContainer>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="w-full rounded bg-green-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-700"
                        >
                            {isLoading ? 'Generating...' : 'Generate Plant Layout'}
                        </button>
                        <button
                            onClick={handleGeneratePipeLayout}
                            disabled={isLoading || !isPlantLayoutGenerated}
                            className="w-full rounded bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-700"
                        >
                            {isLoading ? 'Generating...' : 'Generate Pipe Layout'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <button
                    onClick={() => router.get('/planner')}
                    className="rounded bg-gray-700 px-6 py-2 text-white transition-colors duration-200 hover:bg-gray-600"
                >
                    Back
                </button>
            </div>
        </div>
    );
}
