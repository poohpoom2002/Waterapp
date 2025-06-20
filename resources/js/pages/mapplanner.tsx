import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios, { AxiosError } from 'axios';
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    FeatureGroup,
    LayersControl,
    Polyline,
    useMap,
    useMapEvents,
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { LeafletMouseEvent } from 'leaflet';

type LatLng = {
    lat: number;
    lng: number;
    elevation?: number; // Add elevation field
    id?: string;
};

type PlantType = {
    id: number;
    name: string;
    type: string;
    plant_spacing: number;
    row_spacing: number;
    water_needed: number;
    description: string;
};

type SprinklerType = {
    id: number;
    name: string;
    water_flow: number; // L/min
    min_radius: number; // meters
    max_radius: number; // meters
    description: string;
};

type PipeLayout = {
    start: LatLng;
    end: LatLng;
};

type Suggestion = {
    display_name: string;
    lat: string;
    lon: string;
};

const LoadingSpinner = () => (
    <div className="flex items-center justify-center space-x-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        <span className="text-sm text-blue-500">Processing...</span>
    </div>
);

// Add a new component for map control
function SearchControl({ onSearch }: { onSearch: (lat: number, lng: number) => void }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout>();

    const handleClear = () => {
        setSearchQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        setError(null);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setError(null);
        setShowSuggestions(false);

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                onSearch(parseFloat(lat), parseFloat(lon));
            } else {
                setError('Location not found');
            }
        } catch (err) {
            setError('Error searching for location');
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        setShowSuggestions(true);

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Set new timeout for suggestions
        if (value.trim()) {
            searchTimeoutRef.current = setTimeout(async () => {
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5`
                    );
                    const data = await response.json();
                    setSuggestions(data);
                } catch (err) {
                    console.error('Error fetching suggestions:', err);
                }
            }, 300); // 300ms delay to prevent too many requests
        } else {
            setSuggestions([]);
        }
    };

    const handleSuggestionClick = (suggestion: Suggestion) => {
        const lat = parseFloat(suggestion.lat);
        const lng = parseFloat(suggestion.lon);

        // Ensure the coordinates are valid
        if (!isNaN(lat) && !isNaN(lng)) {
            onSearch(lat, lng);
            setSearchQuery(suggestion.display_name);
            setShowSuggestions(false);
        }
    };

    return (
        <div className="absolute left-[60px] top-4 z-[1000] w-80">
            <form onSubmit={handleSearch} className="flex flex-col gap-2">
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleInputChange}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Search location..."
                        className="w-full rounded bg-white p-2 pr-8 text-gray-900 shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    )}
                    {isSearching && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                    )}
                </div>
                {error && <div className="text-sm text-red-400">{error}</div>}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded bg-white shadow-lg">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                            >
                                {suggestion.display_name}
                            </button>
                        ))}
                    </div>
                )}
            </form>
        </div>
    );
}

// Add a component to handle map center updates
function MapController({ center }: { center: [number, number] }) {
    const map = useMap();

    useEffect(() => {
        if (map && center) {
            // Set a minimum zoom level to prevent the map from disappearing
            const minZoom = 3;
            const maxZoom = 25;

            // Use fixed zoom level 15 for search results
            const searchZoom = 15;

            // Use flyTo for smooth animation
            map.flyTo(center, searchZoom, {
                duration: 1.5,
                easeLinearity: 0.25,
            });
        }
    }, [center, map]);

    return null;
}

// Add a new component for zoom level display
function ZoomLevel() {
    const map = useMap();
    const [zoom, setZoom] = useState(map.getZoom());

    useEffect(() => {
        const updateZoom = () => {
            setZoom(map.getZoom());
        };

        map.on('zoomend', updateZoom);
        return () => {
            map.off('zoomend', updateZoom);
        };
    }, [map]);

    return (
        <div className="absolute bottom-4 left-4 z-[1000] rounded bg-white px-2 py-1 text-sm font-medium text-gray-700 shadow-md">
            Zoom: {zoom.toFixed(1)}
        </div>
    );
}

function MapClickHandler({ onMapClick }: { onMapClick: (e: LeafletMouseEvent) => void }) {
    useMapEvents({
        click: onMapClick,
    });
    return null;
}

function MapDragHandler({
    isDragging,
    editMode,
    selectedPoints,
}: {
    isDragging: boolean;
    editMode: string;
    selectedPoints: Set<string>;
}) {
    const map = useMap();

    useEffect(() => {
        if (isDragging || (editMode === 'select' && selectedPoints.size > 0)) {
            map.dragging.disable();
        } else {
            map.dragging.enable();
        }
    }, [isDragging, editMode, selectedPoints.size, map]);

    return null;
}

// Add a component to track mouse movement for point dragging
function MouseTracker({ onMove }: { onMove: (pos: [number, number]) => void }) {
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
}

// Add a component to handle mouse up events on the map
function MapMouseUpHandler({ onMouseUp }: { onMouseUp: () => void }) {
    useMapEvents({
        mouseup: onMouseUp,
    });
    return null;
}

// Add a point-in-polygon function
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

export default function MapPlanner() {
    const [area, setArea] = useState<LatLng[]>([]);
    const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
    const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
    const [results, setResults] = useState<LatLng[]>([]);
    const [mapCenter, setMapCenter] = useState<[number, number]>([13.7563, 100.5018]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('Ready to draw your field');
    const [showAllPoints, setShowAllPoints] = useState(false);
    const featureGroupRef = useRef<any>(null);
    const [sprinklers, setSprinklers] = useState<SprinklerType[]>([]);
    const [selectedSprinkler, setSelectedSprinkler] = useState<SprinklerType | null>(null);
    const [pipeLayout, setPipeLayout] = useState<PipeLayout[]>([]);
    const [sprinklerPositions, setSprinklerPositions] = useState<LatLng[]>([]);
    const [exclusionAreas, setExclusionAreas] = useState<LatLng[][]>([]);
    const [searchCenter, setSearchCenter] = useState<[number, number] | null>(null);
    const [elevationInfo, setElevationInfo] = useState<{
        min: number | null;
        max: number | null;
        avg: number | null;
    }>({
        min: null,
        max: null,
        avg: null,
    });
    const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [editMode, setEditMode] = useState<'select' | 'add' | 'delete'>('select');
    const [movingPoint, setMovingPoint] = useState<{
        id: string;
        position: [number, number];
    } | null>(null);
    const [history, setHistory] = useState<LatLng[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [drawMode, setDrawMode] = useState<'polygon' | 'rectangle'>('polygon');
    const mapRef = useRef<any>(null);

    // Calculate displayed points based on showAllPoints state
    const displayedPoints = useMemo(() => {
        // If points are less than 5000, show all of them
        if (results.length <= 5000) return results;

        // If showAllPoints is true, show all points regardless of count
        if (showAllPoints) return results;

        if (!selectedPlant) return results;

        // Calculate grid parameters
        const totalPoints = results.length;
        const pointsPerRow = Math.ceil(
            Math.sqrt((totalPoints * selectedPlant.row_spacing) / selectedPlant.plant_spacing)
        );
        const totalRows = Math.ceil(totalPoints / pointsPerRow);

        // Show every 3rd row, but all plants in each displayed row
        const rowStep = 3;

        // Sample points in a grid pattern
        return results.filter((_, index) => {
            const rowIndex = Math.floor(index / pointsPerRow);
            return rowIndex % rowStep === 0;
        });
    }, [results, showAllPoints, selectedPlant]);

    useEffect(() => {
        // Fetch plant types when component mounts
        const fetchPlantTypes = async () => {
            try {
                const response = await axios.get<PlantType[]>('/api/plant-types');
                setPlantTypes(response.data);
            } catch (error) {
                console.error('Error fetching plant types:', error);
            }
        };
        fetchPlantTypes();
    }, []);

    useEffect(() => {
        if (results.length > 0) {
            const center = results.reduce(
                (acc, point) => [acc[0] + point.lat, acc[1] + point.lng],
                [0, 0]
            );
            setMapCenter([center[0] / results.length, center[1] / results.length]);
        }
    }, [results]);

    useEffect(() => {
        // Fetch sprinklers when component mounts
        const fetchSprinklers = async () => {
            try {
                const response = await axios.get<SprinklerType[]>('/api/sprinklers');
                console.log('Fetched sprinklers:', response.data);
                setSprinklers(response.data);
            } catch (error) {
                console.error('Error fetching sprinklers:', error);
            }
        };
        fetchSprinklers();
    }, []);

    const calculateArea = (points: LatLng[]): number => {
        // Calculate area using the shoelace formula
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].lat * points[j].lng;
            area -= points[j].lat * points[i].lng;
        }
        return Math.abs(area) / 2;
    };

    // Add function to save state to history
    const saveToHistory = (newResults: LatLng[]) => {
        setHistory((prev) => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push([...newResults]);
            return newHistory;
        });
        setHistoryIndex((prev) => prev + 1);
    };

    // Add undo function
    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setResults([...history[newIndex]]);
        }
    };

    const handleSubmit = async () => {
        if (area.length < 3) {
            setError('Please draw a polygon on the map first');
            return;
        }

        if (!selectedPlant) {
            setError('Please select a plant type');
            return;
        }

        // Calculate area in square meters (approximate)
        const areaSize = calculateArea(area);
        const maxArea = 100000; // 100,000 square meters (10 hectares)

        if (areaSize > maxArea) {
            setError(`Area is too large. Maximum allowed area is ${maxArea / 10000} hectares`);
            return;
        }

        setIsLoading(true);
        setError(null);
        setStatus('Calculating optimal plant positions...');

        try {
            console.log('Sending request with area:', area);
            const response = await axios.post<{ plant_locations: LatLng[] }>(
                '/api/generate-planting-points',
                {
                    area,
                    exclusion_areas: exclusionAreas,
                    plant_type_id: selectedPlant.id,
                    plant_spacing: selectedPlant.plant_spacing,
                    row_spacing: selectedPlant.row_spacing,
                }
            );
            console.log('Received response:', response.data);

            setResults(response.data.plant_locations);
            // Initialize history with the initial state
            setHistory([response.data.plant_locations]);
            setHistoryIndex(0);
            setStatus(
                `Successfully generated ${response.data.plant_locations.length} planting points`
            );
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                setError(error.response?.data?.message || 'Error generating points');
                console.error('Error generating points:', error.response?.data || error.message);
            } else {
                setError('An unexpected error occurred');
                console.error('An unexpected error occurred:', error);
            }
            setStatus('Failed to generate planting points');
        } finally {
            setIsLoading(false);
        }
    };

    const calculatePipeLayout = async () => {
        if (!selectedSprinkler || results.length === 0) return;

        try {
            const response = await axios.post('/api/calculate-pipe-layout', {
                area,
                plant_locations: results,
                sprinkler_id: selectedSprinkler.id,
                plant_spacing: selectedPlant?.plant_spacing,
                row_spacing: selectedPlant?.row_spacing,
            });

            console.log('Setting sprinkler positions:', response.data.sprinkler_positions);
            console.log('Setting pipe layout:', response.data.pipe_layout);

            setSprinklerPositions(response.data.sprinkler_positions);
            setPipeLayout(response.data.pipe_layout);

            // Verify state updates
            console.log('Current sprinkler positions:', sprinklerPositions);
            console.log('Current pipe layout:', pipeLayout);

            setStatus('Pipe layout calculated successfully');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError(error.response?.data?.message || 'Error calculating pipe layout');
            } else {
                setError('An unexpected error occurred');
            }
            setStatus('Failed to calculate pipe layout');
        }
    };

    const fetchElevationData = async (coordinates: LatLng[]): Promise<LatLng[]> => {
        try {
            console.log('Sending elevation request for coordinates:', coordinates);
            const response = await axios.post('/api/get-elevation', {
                coordinates: coordinates,
            });

            console.log('Elevation API Response Status:', response.status);
            console.log('Elevation API Response Headers:', response.headers);
            console.log('Raw Elevation API Response:', response.data);

            // Check if we got valid elevation data
            const hasValidElevations = response.data.coordinates.some(
                (coord: LatLng) => coord.elevation && coord.elevation !== 0
            );

            if (hasValidElevations) {
                console.log('Elevation API working - data received:', response.data.coordinates);
                console.log(
                    'Sample elevation values:',
                    response.data.coordinates.slice(0, 3).map((coord: LatLng) => ({
                        lat: coord.lat,
                        lng: coord.lng,
                        elevation: coord.elevation,
                    }))
                );
                setStatus('Elevation data successfully retrieved');
            } else {
                console.warn('Elevation API returned all zeros or no data');
                console.warn(
                    'First few coordinates with elevation:',
                    response.data.coordinates.slice(0, 3).map((coord: LatLng) => ({
                        lat: coord.lat,
                        lng: coord.lng,
                        elevation: coord.elevation,
                    }))
                );
                setStatus('Warning: Could not retrieve elevation data. Using default values.');
            }

            return response.data.coordinates;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Elevation API Error:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message,
                });
            } else {
                console.error('Unexpected error fetching elevation data:', error);
            }
            setStatus('Error: Elevation service unavailable. Using default values.');
            return coordinates; // Return original coordinates if elevation fetch fails
        }
    };

    const calculateElevationInfo = (coordinates: LatLng[]) => {
        const elevations = coordinates
            .map((coord) => coord.elevation)
            .filter((elev): elev is number => elev !== undefined);

        if (elevations.length === 0) return { min: null, max: null, avg: null };

        return {
            min: Math.min(...elevations),
            max: Math.max(...elevations),
            avg: elevations.reduce((a, b) => a + b, 0) / elevations.length,
        };
    };

    const onCreated = async (e: any) => {
        const layer = e.layer;
        const coordinates = layer.getLatLngs()[0].map((latLng: { lat: number; lng: number }) => ({
            lat: latLng.lat,
            lng: latLng.lng,
        }));

        // Skip fetching elevation data
        if (area.length === 0) {
            setArea(coordinates);
            setElevationInfo({ min: null, max: null, avg: null });
            setStatus('Field drawn.');
        } else {
            setExclusionAreas((prev) => [...prev, coordinates]);
            setStatus('Exclusion area added. Draw more or generate points.');
        }
        setError(null);
    };

    const onDeleted = () => {
        setArea([]);
        setExclusionAreas([]);
        setResults([]);
        setPipeLayout([]);
        setSprinklerPositions([]);
        setError(null);
        setStatus('Ready to draw your field');
    };

    const handleSearch = (lat: number, lng: number) => {
        setSearchCenter([lat, lng]);
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
            const pointIndex = results.findIndex(
                (p) => (p.id || `point-${results.indexOf(p)}`) === pointId
            );
            if (pointIndex !== -1) {
                const newResults = results.filter((_, index) => index !== pointIndex);
                saveToHistory(newResults);
                setResults(newResults);
                setSelectedPoints((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(pointId);
                    return newSet;
                });
            }
        }
    };

    const handleMapClick = (e: LeafletMouseEvent) => {
        if (editMode === 'add' && selectedPlant) {
            const newPoint: LatLng = {
                lat: e.latlng.lat,
                lng: e.latlng.lng,
                id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            };
            const newResults = [...results, newPoint];
            saveToHistory(newResults);
            setResults(newResults);
        }
    };

    const handleMouseUp = () => {
        if (movingPoint) {
            const newResults = results.map((p) =>
                (p.id || `point-${results.indexOf(p)}`) === movingPoint.id
                    ? { ...p, lat: movingPoint.position[0], lng: movingPoint.position[1] }
                    : p
            );
            saveToHistory(newResults);
            setResults(newResults);
            setMovingPoint(null);
        }
    };

    const renderEditControls = () => {
        if (results.length === 0) return null;

        return (
            <div className="mb-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-medium text-white">Edit Plant Points</h3>
                    <button
                        onClick={handleUndo}
                        disabled={historyIndex <= 0}
                        className={`rounded px-3 py-1 text-sm ${
                            historyIndex > 0
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'cursor-not-allowed bg-gray-800 text-gray-500'
                        }`}
                    >
                        Undo
                    </button>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setEditMode('select')}
                        className={`rounded px-3 py-1 text-sm ${
                            editMode === 'select'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        Select Points
                    </button>
                    <button
                        onClick={() => setEditMode('add')}
                        className={`rounded px-3 py-1 text-sm ${
                            editMode === 'add'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        Add Points
                    </button>
                    <button
                        onClick={() => setEditMode('delete')}
                        className={`rounded px-3 py-1 text-sm ${
                            editMode === 'delete'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        Delete Points
                    </button>
                </div>
                {selectedPoints.size > 0 && (
                    <div className="mt-2 text-sm text-gray-300">
                        {selectedPoints.size} point{selectedPoints.size !== 1 ? 's' : ''} selected
                    </div>
                )}
            </div>
        );
    };

    // Update the handleMouseMove function to restrict movement to inside the polygon
    const handleMouseMove = (position: [number, number]) => {
        if (movingPoint) {
            // Only update if inside the polygon
            if (isPointInPolygon(position[0], position[1], area)) {
                setMovingPoint((prev) => (prev ? { ...prev, position } : null));
            }
        }
    };

    // Update the renderPlantPoints function to only allow moving selected points, and restrict movement to inside the polygon
    const renderPlantPoints = () => {
        return displayedPoints.map((point: LatLng, index: number) => {
            const pointId = point.id || `point-${index}`;
            const isSelected = selectedPoints.has(pointId);
            const isMoving = movingPoint?.id === pointId;
            // Use the moving position if the point is being moved
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
        });
    };

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <h1 className="mb-4 text-xl font-bold text-white">Plant Layout Generator</h1>
            <p className="mb-4 text-sm text-gray-400">
                Select a plant type and draw a polygon on the map to generate planting points.
                Maximum area: 10 hectares.
            </p>

            <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-800 p-4">
                <div className="flex items-center space-x-2">
                    {isLoading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="h-4 w-4 rounded-full bg-green-500"></div>
                    )}
                    <span className="text-sm text-gray-300">{status}</span>
                </div>
                {elevationInfo.min !== null && (
                    <div className="text-sm text-blue-400">
                        Elevation: {elevationInfo.min.toFixed(1)}m - {elevationInfo.max?.toFixed(1)}
                        m
                        <br />
                        Average: {elevationInfo.avg?.toFixed(1)}m
                    </div>
                )}
                {results.length > 0 && (
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-blue-400">
                            {!showAllPoints ? `Showing ${displayedPoints.length} of ` : ''}
                            {results.length} plants
                        </span>
                        {results.length > 1000 && (
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={showAllPoints}
                                    onChange={(e) => setShowAllPoints(e.target.checked)}
                                    className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-300">
                                    Show all points
                                    {showAllPoints && (
                                        <span className="ml-1 text-yellow-400">
                                            (May affect performance)
                                        </span>
                                    )}
                                </span>
                            </label>
                        )}
                    </div>
                )}
            </div>

            {error && (
                <div className="mb-4 rounded bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-300">
                                Select Plant Type
                            </label>
                            <select
                                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                value={selectedPlant?.id || ''}
                                onChange={(e) => {
                                    const plant = plantTypes.find(
                                        (p) => p.id === Number(e.target.value)
                                    );
                                    setSelectedPlant(plant || null);
                                    if (plant) {
                                        setStatus(
                                            `Selected ${plant.name}. Draw your field or click "Generate Points"`
                                        );
                                    }
                                }}
                            >
                                <option value="">Select a plant...</option>
                                {plantTypes.map((plant) => (
                                    <option key={plant.id} value={plant.id}>
                                        {plant.name} ({plant.type})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedPlant && (
                            <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                                <h3 className="mb-2 font-medium text-white">Plant Details</h3>
                                <p className="mb-4 text-sm text-gray-400">
                                    {selectedPlant.description}
                                </p>

                                <div className="space-y-3">
                                    <div className="rounded border border-gray-700 bg-gray-900 p-3">
                                        <h4 className="mb-2 font-medium text-blue-400">
                                            Spacing Requirements
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="flex items-center text-gray-300">
                                                <svg
                                                    className="mr-2 h-4 w-4 text-blue-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M4 6h16M4 12h16M4 18h16"
                                                    />
                                                </svg>
                                                <span>Plant Spacing:</span>
                                                <span className="ml-1 font-medium text-blue-400">
                                                    {selectedPlant.plant_spacing}m
                                                </span>
                                            </div>
                                            <div className="flex items-center text-gray-300">
                                                <svg
                                                    className="mr-2 h-4 w-4 text-blue-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M4 6h16M4 12h16M4 18h16"
                                                    />
                                                </svg>
                                                <span>Row Spacing:</span>
                                                <span className="ml-1 font-medium text-blue-400">
                                                    {selectedPlant.row_spacing}m
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded border border-gray-700 bg-gray-900 p-3">
                                        <h4 className="mb-2 font-medium text-blue-400">
                                            Water Requirements
                                        </h4>
                                        <div className="flex items-center text-sm text-gray-300">
                                            <svg
                                                className="mr-2 h-4 w-4 text-blue-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                                                />
                                            </svg>
                                            <span>Water Needed per Plant:</span>
                                            <span className="ml-1 font-medium text-blue-400">
                                                {selectedPlant.water_needed}L
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-300">
                                Select Sprinkler Type
                            </label>
                            <select
                                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                value={selectedSprinkler?.id || ''}
                                onChange={(e) => {
                                    const sprinkler = sprinklers.find(
                                        (s) => s.id === Number(e.target.value)
                                    );
                                    setSelectedSprinkler(sprinkler || null);
                                }}
                            >
                                <option value="">Select a sprinkler...</option>
                                {sprinklers.map((sprinkler) => (
                                    <option key={sprinkler.id} value={sprinkler.id}>
                                        {sprinkler.name} ({sprinkler.water_flow}L/min)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedSprinkler && (
                            <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                                <h3 className="mb-2 font-medium text-white">Sprinkler Details</h3>
                                <p className="mb-4 text-sm text-gray-400">
                                    {selectedSprinkler.description}
                                </p>
                                <div className="space-y-3">
                                    <div className="rounded border border-gray-700 bg-gray-900 p-3">
                                        <h4 className="mb-2 font-medium text-blue-400">
                                            Coverage Details
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="flex items-center text-gray-300">
                                                <span>Water Flow:</span>
                                                <span className="ml-1 font-medium text-blue-400">
                                                    {selectedSprinkler.water_flow}L/min
                                                </span>
                                            </div>
                                            <div className="flex items-center text-gray-300">
                                                <span>Coverage Radius:</span>
                                                <span className="ml-1 font-medium text-blue-400">
                                                    {selectedSprinkler.min_radius}-
                                                    {selectedSprinkler.max_radius}m
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            className="w-full rounded bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-700"
                            disabled={area.length < 3 || !selectedPlant || isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    <span>Generating Points...</span>
                                </div>
                            ) : (
                                'Generate Points'
                            )}
                        </button>

                        {results.length > 0 && selectedSprinkler && (
                            <button
                                onClick={calculatePipeLayout}
                                className="w-full rounded bg-green-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-green-700"
                            >
                                Calculate Pipe Layout
                            </button>
                        )}
                        {renderEditControls()}
                    </div>
                </div>

                <div className="relative h-[500px] overflow-hidden rounded-lg border border-gray-700">
                    <MapContainer
                        center={searchCenter || mapCenter}
                        zoom={13}
                        minZoom={3}
                        maxZoom={25}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <SearchControl onSearch={handleSearch} />
                        <MapClickHandler onMapClick={handleMapClick} />
                        <MapDragHandler
                            isDragging={!!movingPoint}
                            editMode={editMode}
                            selectedPoints={selectedPoints}
                        />
                        <MouseTracker onMove={handleMouseMove} />
                        <MapMouseUpHandler onMouseUp={handleMouseUp} />
                        <ZoomLevel />

                        <LayersControl position="topright">
                            <LayersControl.BaseLayer checked name="Street Map">
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    maxZoom={25}
                                />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Satellite">
                                <TileLayer
                                    url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                                    attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
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

                        <FeatureGroup ref={featureGroupRef}>
                            <EditControl
                                position="topright"
                                onCreated={onCreated}
                                onDeleted={onDeleted}
                                draw={{
                                    rectangle: false,
                                    circle: false,
                                    circlemarker: false,
                                    marker: false,
                                    polyline: false,
                                }}
                            />
                        </FeatureGroup>

                        {/* Draw exclusion areas as polygons (yellow) */}

                        {exclusionAreas.map((polygon, idx) => (
                            <Polyline
                                key={`exclusion-${idx}`}
                                positions={polygon.map((pt) => [pt.lat, pt.lng])}
                                color="yellow"
                                weight={2}
                            />
                        ))}

                        {/* Draw pipes */}
                        {pipeLayout.map((pipe, index) => (
                            <Polyline
                                key={`pipe-${index}`}
                                positions={[
                                    [pipe.start.lat, pipe.start.lng],
                                    [pipe.end.lat, pipe.end.lng],
                                ]}
                                color="blue"
                                weight={2}
                            />
                        ))}

                        <div style={{ position: 'absolute', top: 10, right: 10 }}>
                            <button
                                style={{
                                    background:
                                        drawMode === 'polygon'
                                            ? 'rgba(0, 0, 255, 0.7)'
                                            : 'rgba(255, 255, 255, 0.7)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '30px',
                                    height: '30px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                onClick={() => setDrawMode('polygon')}
                                title="Draw polygon"
                            >
                                <svg
                                    style={{ width: '16px', height: '16px', fill: 'white' }}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <polygon points="5,3 19,3 21,12 12,21 3,12" />
                                </svg>
                            </button>
                        </div>

                        {renderPlantPoints()}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
}
