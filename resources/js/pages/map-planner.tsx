import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    MapContainer,
    TileLayer,
    FeatureGroup,
    LayersControl,
    Polygon,
    useMap,
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { router } from '@inertiajs/react';
import L from 'leaflet';

// --- (All existing types, con stants, and helper components remain the same) ---

// Types
type LatLng = {
    lat: number;
    lng: number;
};

type PlantType = {
    id: number;
    name: string;
    type: string;
    plant_spacing: number;
    row_spacing: number;
    water_needed: number;
    description?: string;
};

type CustomPlantParams = {
    name: string;
    type: string;
    description: string;
    plant_spacing: number;
    row_spacing: number;
    water_needed: number;
};

type AreaType = 'initial' | 'river' | 'powerplant' | 'building' | 'custompolygon' | 'solarcell';

type LayerData = {
    type: AreaType;
    coordinates: LatLng[];
    isInitialMap?: boolean;
    leafletId?: number;
};

type Suggestion = {
    display_name: string;
    lat: string;
    lon: string;
};

// Constants
const DEFAULT_MAP_CENTER: [number, number] = [13.7563, 100.5018];
const MAX_AREA = 100000; // 10 hectares

const AREA_DESCRIPTIONS: Record<AreaType, string> = {
    initial: 'Main farm area boundary.',
    river: 'Water body for irrigation and water management.',
    powerplant: 'Energy generation facility area.',
    building: 'Structure or facility area.',
    solarcell: 'Solar cell installation area.',
    custompolygon: 'Other area for flexible drawing.',
};

const AREA_COLORS: Record<AreaType, string> = {
    initial: '#90EE90', // Light green
    river: '#3B82F6', // Blue
    powerplant: '#EF4444', // Red
    building: '#F59E0B', // Yellow
    solarcell: '#FFD600', // Bright Yellow
    custompolygon: '#4B5563', // Black Gray
};

// Components
const LoadingSpinner = () => (
    <div className="flex items-center justify-center space-x-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        <span className="text-sm text-blue-500">Processing...</span>
    </div>
);

const AreaTypeButton: React.FC<{
    type: AreaType;
    isSelected: boolean;
    isActive: boolean;
    onClick: () => void;
}> = ({ type, isSelected, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-32 rounded px-4 py-2 text-white transition-colors duration-200 ${
            isActive
                ? 'bg-blue-600 hover:bg-blue-700'
                : isSelected
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-gray-700 hover:bg-gray-600'
        }`}
    >
        {type === 'custompolygon'
            ? 'Other'
            : type.charAt(0).toUpperCase() + type.slice(1).replace('powerplant', 'Power Plant')}
    </button>
);

// MapClickHandler component removed - pump functionality no longer needed

const SearchControl: React.FC<{ onSearch: (lat: number, lng: number) => void }> = ({
    onSearch,
}) => {
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

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

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
            }, 300);
        } else {
            setSuggestions([]);
        }
    };

    const handleSuggestionClick = (suggestion: Suggestion) => {
        const lat = parseFloat(suggestion.lat);
        const lng = parseFloat(suggestion.lon);

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
};

const ZoomController: React.FC<{ zoom?: number }> = ({ zoom }) => {
    const map = useMap();

    useEffect(() => {
        if (map && zoom) {
            map.setZoom(zoom);
        }
    }, [map, zoom]);

    return null;
};

const CenterController: React.FC<{ center: [number, number] }> = ({ center }) => {
    const map = useMap();

    useEffect(() => {
        if (map && center) {
            const currentCenter = map.getCenter();
            if (currentCenter.lat !== center[0] || currentCenter.lng !== center[1]) {
                map.setView(center, map.getZoom(), {
                    animate: true,
                    duration: 1.5,
                    easeLinearity: 0.25,
                });
            }
        }
    }, [map, center]);

    return null;
};

const MapStateTracker: React.FC<{
    onZoomChange: (zoom: number) => void;
    onMapTypeChange: (type: string) => void;
}> = ({ onZoomChange, onMapTypeChange }) => {
    const map = useMap();

    useEffect(() => {
        const handleZoomEnd = () => {
            onZoomChange(map.getZoom());
        };

        const handleBaseLayerChange = (e: any) => {
            onMapTypeChange(e.name.toLowerCase());
        };

        map.on('zoomend', handleZoomEnd);
        map.on('baselayerchange', handleBaseLayerChange);

        return () => {
            map.off('zoomend', handleZoomEnd);
            map.off('baselayerchange', handleBaseLayerChange);
        };
    }, [map, onZoomChange, onMapTypeChange]);

    return null;
};

const ZoomLevelDisplay: React.FC = () => {
    const map = useMap();
    const [zoom, setZoom] = useState<number | undefined>(map?.getZoom?.());

    useEffect(() => {
        const handleZoom = () => {
            setZoom(map.getZoom());
        };

        map.on('zoomend', handleZoom);
        return () => {
            map.off('zoomend', handleZoom);
        };
    }, [map]);

    return (
        <div className="absolute bottom-4 left-4 z-[1000] rounded bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-md">
            Zoom: {typeof zoom === 'number' ? zoom.toFixed(1) : '-'}
        </div>
    );
};

const isPointInPolygon = (point: LatLng, polygon: LatLng[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng;
        const yi = polygon[i].lat;
        const xj = polygon[j].lng;
        const yj = polygon[j].lat;

        const intersect =
            yi > point.lat !== yj > point.lat &&
            point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
};

const isAreaWithinInitialMap = (newArea: LatLng[], initialMap: LatLng[]): boolean => {
    return newArea.every((point) => isPointInPolygon(point, initialMap));
};

// Toast Notification Component
const Toast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
    <div className="fixed right-6 top-6 z-[2000] flex animate-fade-in items-center rounded-lg bg-green-600 px-6 py-3 text-white shadow-lg">
        <span>{message}</span>
        <button
            onClick={onClose}
            className="ml-4 text-white hover:text-gray-200 focus:outline-none"
        >
            &times;
        </button>
    </div>
);

// Area Configurator Component
const AreaConfigurator: React.FC<{
    layers: LayerData[];
    activeButton: AreaType | null;
    setActiveButton: (type: AreaType | null) => void;
    toggleAreaType: (type: AreaType) => void;
    AREA_DESCRIPTIONS: Record<AreaType, string>;
    AREA_COLORS: Record<AreaType, string>;
    canDraw: boolean;
}> = ({
    layers,
    activeButton,
    setActiveButton,
    toggleAreaType,
    AREA_DESCRIPTIONS,
    AREA_COLORS,
    canDraw,
}) => (
    <div className="sticky top-6 animate-fade-in">
        <label className="mb-1 block text-sm font-medium text-gray-300">Area Configuration</label>
        <div className="space-y-2">
            {Object.keys(AREA_DESCRIPTIONS)
                .filter((type) => type !== 'initial')
                .map((type) => (
                    <div key={type} className="flex items-center gap-4">
                        <span
                            className="inline-block h-5 w-5 rounded-full border border-gray-400"
                            style={{ background: AREA_COLORS[type as AreaType] }}
                        ></span>
                        <button
                            type="button"
                            onClick={() => canDraw && toggleAreaType(type as AreaType)}
                            className={`w-32 rounded px-4 py-2 text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400
              ${activeButton === type ? 'scale-105 bg-blue-600 shadow-lg' : 'bg-gray-700'}
              ${!canDraw ? 'cursor-not-allowed opacity-50' : ''}`}
                            style={{
                                borderColor: AREA_COLORS[type as AreaType],
                                borderWidth: activeButton === type ? 2 : 0,
                            }}
                            aria-pressed={activeButton === type}
                            aria-label={AREA_DESCRIPTIONS[type as AreaType]}
                            title={AREA_DESCRIPTIONS[type as AreaType]}
                            tabIndex={canDraw ? 0 : -1}
                            disabled={!canDraw}
                        >
                            {type === 'custompolygon'
                                ? 'Other'
                                : type.charAt(0).toUpperCase() +
                                  type.slice(1).replace('powerplant', 'Power Plant')}
                        </button>
                    </div>
                ))}
        </div>
    </div>
);

// Main Component
export default function MapPlanner() {
    // State Management
    const [layers, setLayers] = useState<LayerData[]>([]);
    const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
    const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
    const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('Draw an area on the map first');
    const [activeButton, setActiveButton] = useState<AreaType | null>(null);
    const [customParams, setCustomParams] = useState<CustomPlantParams>({
        name: '',
        type: '',
        description: '',
        plant_spacing: 10,
        row_spacing: 10,
        water_needed: 1.5,
    });
    const [selectedPlantCategory, setSelectedPlantCategory] = useState<string>('');
    const [filteredPlants, setFilteredPlants] = useState<PlantType[]>([]);
    const featureGroupRef = useRef<any>(null);
    const [currentZoom, setCurrentZoom] = useState(13);
    const [currentMapType, setCurrentMapType] = useState('street');
    const [initialZoom, setInitialZoom] = useState<number | null>(null);
    const [initialMapPosition, setInitialMapPosition] = useState<[number, number] | null>(null);
    const [searchCenter, setSearchCenter] = useState<[number, number] | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [mapShouldRecenter, setMapShouldRecenter] = useState(false);
    const mapRef = useRef<any>(null);
    const [recenterKey, setRecenterKey] = useState(0);
    const [sidebarPanned, setSidebarPanned] = useState(false);

    useEffect(() => {
        const fetchPlantTypes = async () => {
            try {
                const response = await axios.get<PlantType[]>('/api/plant-types');
                setPlantTypes(response.data);
                setFilteredPlants(response.data);
            } catch (error) {
                console.error('Error fetching plant types:', error);
            }
        };
        fetchPlantTypes();
    }, []);

    const resetModes = () => setActiveButton(null);

    const toggleAreaType = (type: AreaType) => {
        if (activeButton === type) {
            resetModes();
            setStatus('Select an area type to begin');
            return;
        }
        setActiveButton(type);
        setStatus(
            `Draw the ${type === 'custompolygon' ? 'custom' : type.replace('powerplant', 'power plant')} area`
        );
        // Enable polygon drawing
        const map = featureGroupRef.current?.leafletElement?._map;
        if (map) {
            const drawControl = Object.values(map._layers).find(
                (layer: any) => layer._drawingMode === 'polygon'
            );
            if (drawControl) (drawControl as any).enable();
        }
    };

    const onCreated = (e: any) => {
        const layer = e.layer;
        const leafletId = layer._leaflet_id;
        let coordinates: LatLng[] = [];
        if (layer instanceof L.Rectangle) {
            const bounds = layer.getBounds();
            coordinates = [
                { lat: bounds.getNorthEast().lat, lng: bounds.getNorthEast().lng },
                { lat: bounds.getNorthEast().lat, lng: bounds.getSouthWest().lng },
                { lat: bounds.getSouthWest().lat, lng: bounds.getSouthWest().lng },
                { lat: bounds.getSouthWest().lat, lng: bounds.getNorthEast().lng },
            ];
        } else if (layer.getLatLngs) {
            const latLngs = layer.getLatLngs()[0];
            coordinates = latLngs.map((latLng: any) => ({ lat: latLng.lat, lng: latLng.lng }));
        }
        const styleMap: Record<AreaType, { color: string; fillOpacity: number }> = {
            initial: { color: '#90EE90', fillOpacity: 0.5 },
            river: { color: '#3B82F6', fillOpacity: 0.3 },
            powerplant: { color: '#EF4444', fillOpacity: 0.3 },
            building: { color: '#F59E0B', fillOpacity: 0.3 },
            custompolygon: { color: '#4B5563', fillOpacity: 0.3 },
            solarcell: { color: '#FFD600', fillOpacity: 0.3 },
        };
        if (layers.length === 0) {
            layer.setStyle({ color: '#90EE90', fillColor: '#90EE90', fillOpacity: 0.5, weight: 2 });
            setLayers([{ type: 'initial', coordinates, isInitialMap: true, leafletId }]);
            const bounds = layer.getBounds();
            const center = bounds.getCenter();
            const newCenter: [number, number] = [center.lat, center.lng];
            setMapCenter(newCenter);
            setInitialMapPosition(newCenter);
            const map = featureGroupRef.current?.leafletElement?._map;
            if (map) {
                const currentZoom = map.getZoom();
                setInitialZoom(currentZoom);
                setCurrentZoom(currentZoom);
                setTimeout(() => {
                    map.invalidateSize();
                    map.setView(newCenter, currentZoom, {
                        animate: true,
                        duration: 1,
                        padding: [50, 50],
                    });
                }, 100);
            }
            setStatus('Initial map area drawn. Now select an area type to continue.');
            setToast('Initial map area created!');
            setMapShouldRecenter(true);
            return;
        }
        const currentType = activeButton;
        if (!currentType) {
            featureGroupRef.current?.leafletElement?.removeLayer(layer);
            setStatus('Please select an area type before drawing.');
            return;
        }
        if (styleMap[currentType]) {
            layer.setStyle({
                color: styleMap[currentType].color,
                fillColor: styleMap[currentType].color,
                fillOpacity: 0.5,
                weight: 2,
            });
        }
        setLayers((prevLayers) => [
            ...prevLayers,
            { type: currentType, coordinates, isInitialMap: false, leafletId },
        ]);
        resetModes();
        setStatus(`${currentType} area added. Select another area type to continue.`);
        setToast(`${currentType.charAt(0).toUpperCase() + currentType.slice(1)} area created!`);
        setActiveButton(null);
    };

    const onDeleted = (e: any) => {
        const deletedLayerIds = new Set();
        e.layers.eachLayer((layer: any) => {
            deletedLayerIds.add(layer._leaflet_id);
        });
        if (deletedLayerIds.size > 0) {
            setLayers((prevLayers) => prevLayers.filter((l) => !deletedLayerIds.has(l.leafletId)));
            setStatus('Area deleted. Select another area type to continue.');
            setToast('Area deleted!');
        }
    };

    const handleNext = () => {
        if (layers.length === 0) {
            setError('Please draw an area on the map first.');
            return;
        }

        if (!selectedPlantCategory) {
            setError('Please select a plant category.');
            return;
        }

        if (!selectedPlant) {
            setError('Please select a plant.');
            return;
        }

        try {
            const initialMapLayer = layers.find((layer) => layer.isInitialMap);

            if (!initialMapLayer) {
                setError(
                    'The initial map area is missing. Please draw the main area for your farm first.'
                );
                return;
            }

            const mainAreaCoordinates = initialMapLayer.coordinates;

            const plantData = {
                id: selectedPlant.id,
                name: selectedPlant.name,
                type: selectedPlant.type,
                plant_spacing: Number(customParams.plant_spacing),
                row_spacing: Number(customParams.row_spacing),
                water_needed: Number(customParams.water_needed),
            };

            const areaTypes = layers
                .filter((layer) => !layer.isInitialMap)
                .map((layer) => layer.type);
            const uniqueAreaTypes = Array.from(new Set(areaTypes));

            const formattedLayers = layers.map((layer) => ({
                type: layer.type,
                coordinates: layer.coordinates.map((coord) => ({
                    lat: Number(coord.lat),
                    lng: Number(coord.lng),
                })),
                isInitialMap: layer.isInitialMap,
            }));

            const formattedData = {
                areaType: uniqueAreaTypes.join(','),
                area: JSON.stringify(mainAreaCoordinates),
                plantType: JSON.stringify(plantData),
                layers: JSON.stringify(formattedLayers),
            };

            // Log the final data being sent
            console.log('Data being sent to horticulture planner page:', formattedData);

            router.visit('/horticulture/planner', {
                method: 'get',
                data: formattedData,
                preserveState: true,
                preserveScroll: true,
            });
        } catch (error) {
            console.error('Error preparing data:', error);
            setError('An error occurred while preparing the data. Please try again.');
        }
    };

    // Update handleBack function
    const handleBack = () => {
        // Navigate back to homepage
        router.visit('/');
    };

    const resetToDefault = () => {
        if (selectedPlant) {
            setCustomParams({
                name: selectedPlant.name,
                type: selectedPlant.type,
                description: selectedPlant.description || 'No description available',
                plant_spacing: Number(selectedPlant.plant_spacing),
                row_spacing: Number(selectedPlant.row_spacing),
                water_needed: Number(selectedPlant.water_needed),
            });
        }
    };

    // Update the select handler for plants
    const handlePlantSelect = (plant: PlantType) => {
        setSelectedPlant(plant);
        setCustomParams({
            name: plant.name,
            type: plant.type,
            description: plant.description || 'No description available',
            plant_spacing: Number(plant.plant_spacing),
            row_spacing: Number(plant.row_spacing),
            water_needed: Number(plant.water_needed),
        });
        setStatus(`${plant.name} selected`);
    };

    // Update the input handlers
    const handleCustomParamChange = (field: keyof CustomPlantParams, value: string) => {
        const newValue = parseFloat(value) || 0;
        setCustomParams((prev) => {
            const updated = {
                ...prev,
                [field]: newValue,
            };
            console.log('Updated Custom Parameters:', updated);
            return updated;
        });
    };

    // Add handleSearch function
    const handleSearch = (lat: number, lng: number) => {
        setSearchCenter([lat, lng]);
        setMapShouldRecenter(true);
    };

    // Add this function to calculate center from layers
    const calculateMapCenter = () => {
        const initialLayer = layers.find((layer) => layer.isInitialMap);
        if (initialLayer && initialLayer.coordinates.length > 0) {
            const coords = initialLayer.coordinates;
            const totalLat = coords.reduce((sum, point) => sum + point.lat, 0);
            const totalLng = coords.reduce((sum, point) => sum + point.lng, 0);
            return [totalLat / coords.length, totalLng / coords.length] as [number, number];
        }
        if (layers.length > 0) {
            const allPoints = layers.flatMap((layer) => layer.coordinates);
            const totalLat = allPoints.reduce((sum: number, point: LatLng) => sum + point.lat, 0);
            const totalLng = allPoints.reduce((sum: number, point: LatLng) => sum + point.lng, 0);
            return [totalLat / allPoints.length, totalLng / allPoints.length] as [number, number];
        }
        return mapCenter;
    };

    // Effect to recenter the map only when needed
    useEffect(() => {
        if (mapShouldRecenter && mapRef.current) {
            const map = mapRef.current;
            const center = searchCenter || calculateMapCenter();
            map.setView(center, map.getZoom(), { animate: true });
            setMapShouldRecenter(false);
        }
    }, [mapShouldRecenter, searchCenter, layers]);

    // Recenter handler
    const handleRecenter = () => {
        setRecenterKey((prev) => prev + 1);
        setMapShouldRecenter(true);
    };

    // Pan map to the right when sidebar appears
    useEffect(() => {
        if (mapRef.current && layers.length > 0 && !sidebarPanned) {
            // Estimate sidebar width (1/3 of screen on large screens)
            const sidebarWidth = window.innerWidth >= 1024 ? window.innerWidth / 3 : 0;
            if (sidebarWidth > 0) {
                mapRef.current.panBy([sidebarWidth / 3, 0], { animate: true });
                setSidebarPanned(true);
            }
        }
        if (layers.length === 0 && sidebarPanned) {
            setSidebarPanned(false); // Reset if user removes all layers
        }
    }, [layers.length, sidebarPanned]);

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            {/* Toast Notification */}
            {toast && <Toast message={toast} onClose={() => setToast(null)} />}
            <h1 className="mb-4 text-xl font-bold text-white">Plant Layout Generator</h1>
            <p className="mb-4 text-sm text-gray-400">
                Draw an area on the map (recommended not over 10 hectares) and select the area type
                and plant type to proceed.
            </p>

            <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-800 p-4">
                <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-300">{status}</span>
                </div>
                {/* Recenter Map Button */}
                <button
                    onClick={handleRecenter}
                    className="rounded bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    title="Recenter map to main area"
                >
                    Recenter Map
                </button>
            </div>

            {error && (
                <div className="mb-4 rounded bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className={`space-y-4 ${layers.length > 0 ? 'lg:col-span-1' : 'hidden'}`}>
                    {layers.length > 0 && (
                        <>
                            {/* ==============update Home Garden ============== */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-300">
                                    Plant Category
                                </label>
                                <select
                                    value={selectedPlantCategory}
                                    onChange={(e) => {
                                        const selectedCategory = e.target.value;
                                        setSelectedPlantCategory(selectedCategory);
                                        setSelectedPlant(null);
                                        console.log('Selected Plant Category:', e.target.value);

                                        // เพิ่มการจัดการ Home Garden
                                        if (e.target.value === 'Home Garden') {
                                            // Redirect ไปยัง Home Garden Planner แทน
                                            if (
                                                confirm(
                                                    'Home Garden uses a different planning system. Do you want to continue to Home Garden Planner?'
                                                )
                                            ) {
                                                router.visit('/home-garden/planner');
                                            }
                                            return;
                                        }

                                        if (e.target.value === 'Horticultural') {
                                            // Redirect to Horticultural Irrigation System
                                            if (
                                                confirm(
                                                    'Horticultural category uses an advanced irrigation system planner. Do you want to continue to Horticultural Irrigation Planner?'
                                                )
                                            ) {
                                                router.visit('/horticulture-planner');
                                            }
                                            return;
                                        } else if (e.target.value === 'Field Crop') {
                                            const filtered = plantTypes.filter((plant) =>
                                                ['Rice', 'Corn', 'Sugarcane'].includes(plant.name)
                                            );
                                            setFilteredPlants(filtered);
                                        } else {
                                            console.log(
                                                'No plants available for category:',
                                                selectedCategory
                                            );
                                            setFilteredPlants([]);
                                        }
                                    }}
                                    className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="">Select a plant category</option>
                                    <option value="Horticultural">Horticultural</option>
                                    <option value="Field Crop">Field Crop</option>
                                    <option value="Greenhouse">Greenhouse</option>
                                    <option value="Home Garden">Home Garden</option>
                                </select>

                                {/* เพิ่ม info text สำหรับ Home Garden */}
                                {selectedPlantCategory === 'Home Garden' && (
                                    <div className="mt-2 rounded bg-blue-900/30 p-3">
                                        <p className="text-sm text-blue-300">
                                            🏡 Home Garden category uses a specialized sprinkler
                                            system planner. Click "Continue to Home Garden Planner"
                                            to design your automated watering system.
                                        </p>
                                        <button
                                            onClick={() => router.visit('/home-garden/planner')}
                                            className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                                        >
                                            Continue to Home Garden Planner
                                        </button>
                                    </div>
                                )}
                            </div>
                            {/* ==============update Home Garden ============== */}

                            {selectedPlantCategory && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-300">
                                        Plant Selection
                                        <span className="ml-2 text-sm font-normal text-gray-400">
                                            {selectedPlant
                                                ? `(${selectedPlant.name})`
                                                : '(Select a plant)'}
                                        </span>
                                    </label>
                                    <select
                                        value={selectedPlant?.id || ''}
                                        onChange={(e) => {
                                            const plant = filteredPlants.find(
                                                (p) => p.id === Number(e.target.value)
                                            );
                                            if (plant) {
                                                handlePlantSelect(plant);
                                            } else {
                                                setSelectedPlant(null);
                                                setStatus('Select a plant');
                                            }
                                        }}
                                        className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="">Select a plant</option>
                                        {filteredPlants.map((plant) => (
                                            <option key={plant.id} value={plant.id}>
                                                {plant.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedPlant && (
                                <div className="space-y-4 rounded-lg bg-gray-800 p-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-300">
                                            Plant Spacing (m)
                                        </label>
                                        <input
                                            type="number"
                                            value={customParams.plant_spacing}
                                            onChange={(e) =>
                                                handleCustomParamChange(
                                                    'plant_spacing',
                                                    e.target.value
                                                )
                                            }
                                            min="0"
                                            step="0.1"
                                            className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-300">
                                            Row Spacing (m)
                                        </label>
                                        <input
                                            type="number"
                                            value={customParams.row_spacing}
                                            onChange={(e) =>
                                                handleCustomParamChange(
                                                    'row_spacing',
                                                    e.target.value
                                                )
                                            }
                                            min="0"
                                            step="0.1"
                                            className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-300">
                                            Water Needed (L/day)
                                        </label>
                                        <input
                                            type="number"
                                            value={customParams.water_needed}
                                            onChange={(e) =>
                                                handleCustomParamChange(
                                                    'water_needed',
                                                    e.target.value
                                                )
                                            }
                                            min="0"
                                            step="0.1"
                                            className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={resetToDefault}
                                        className="mt-4 w-full rounded bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700"
                                    >
                                        Reset to Default Values
                                    </button>
                                </div>
                            )}

                            {/* Area Configurator - only allow drawing if initial area exists */}
                            <AreaConfigurator
                                layers={layers}
                                activeButton={activeButton}
                                setActiveButton={setActiveButton}
                                toggleAreaType={toggleAreaType}
                                AREA_DESCRIPTIONS={AREA_DESCRIPTIONS}
                                AREA_COLORS={AREA_COLORS}
                                canDraw={!!layers.find((l) => l.isInitialMap)}
                            />
                        </>
                    )}
                </div>

                <div
                    className={`space-y-4 ${layers.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}
                >
                    <div
                        className={`relative ${layers.length === 0 ? 'h-[800px]' : 'h-[750px]'} w-full overflow-hidden rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl ${layers.length === 0 ? 'w-full' : ''}`}
                    >
                        <MapContainer
                            center={searchCenter || calculateMapCenter()}
                            zoom={initialZoom || currentZoom}
                            ref={mapRef}
                            maxZoom={25}
                            minZoom={3}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={true}
                            scrollWheelZoom={true}
                            doubleClickZoom={true}
                            dragging={true}
                        >
                            <SearchControl onSearch={handleSearch} />
                            <ZoomController zoom={initialZoom || currentZoom} />
                            <MapStateTracker
                                onZoomChange={setCurrentZoom}
                                onMapTypeChange={setCurrentMapType}
                            />
                            <ZoomLevelDisplay />
                            <LayersControl position="topright">
                                <LayersControl.BaseLayer
                                    checked={currentMapType === 'street'}
                                    name="Street Map"
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        maxZoom={25}
                                        minZoom={3}
                                    />
                                </LayersControl.BaseLayer>
                                <LayersControl.BaseLayer
                                    checked={currentMapType === 'satellite'}
                                    name="Satellite"
                                >
                                    <TileLayer
                                        url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                                        attribution='© <a href="https://www.google.com/maps">Google Maps</a>'
                                        maxZoom={25}
                                        minZoom={3}
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
                                        polygon:
                                            layers.length === 0 || activeButton
                                                ? {
                                                      allowIntersection: true,
                                                      showArea: true,
                                                      drawError: {
                                                          color: '#e1e4e8',
                                                          message:
                                                              '<strong>Error:</strong> Cannot draw outside the initial map area!',
                                                      },
                                                      shapeOptions: {
                                                          color: '#3B82F6',
                                                          fillOpacity: 0.3,
                                                          weight: 2,
                                                      },
                                                      repeatMode: true,
                                                  }
                                                : false,
                                    }}
                                />
                            </FeatureGroup>
                        </MapContainer>
                        {/* Floating Legend - only show in area config, smaller size */}
                        {layers.length > 0 && (
                            <div className="absolute bottom-4 right-4 z-[1100] flex w-fit min-w-[120px] flex-col gap-1 rounded-lg bg-white/90 p-2 text-sm shadow-lg">
                                <div className="mb-1 text-xs font-semibold text-gray-800">
                                    Legend
                                </div>
                                {Object.entries(AREA_DESCRIPTIONS)
                                    .filter(([type]) => type !== 'initial')
                                    .map(([type, desc]) => (
                                        <div key={type} className="flex items-center gap-1">
                                            <span
                                                className="inline-block h-3 w-3 rounded-full border border-gray-400"
                                                style={{
                                                    background: AREA_COLORS[type as AreaType],
                                                }}
                                            ></span>
                                            <span className="text-xs text-gray-700">{desc}</span>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-4 flex justify-between">
                <button
                    onClick={handleBack}
                    className="rounded bg-gray-600 px-6 py-3 text-white transition-colors duration-200 hover:bg-gray-700"
                >
                    Back to Home
                </button>
                <button
                    onClick={handleNext}
                    disabled={layers.length === 0 || !selectedPlantCategory || !selectedPlant}
                    className="rounded bg-green-600 px-6 py-3 text-white transition-colors duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-700"
                >
                    {isLoading ? 'Processing...' : 'Next'}
                </button>
            </div>
        </div>
    );
}
