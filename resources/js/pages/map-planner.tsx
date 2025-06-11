import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, FeatureGroup, LayersControl, useMapEvents, Circle, Polygon, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { router } from '@inertiajs/react';
import L from 'leaflet';

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

type AreaType = 'river' | 'powerplant' | 'building' | 'pump' | 'custompolygon' | 'solarcell';

type LayerData = {
    type: AreaType;
    coordinates: LatLng[];
    isInitialMap?: boolean;
};

type Suggestion = {
    display_name: string;
    lat: string;
    lon: string;
};

// Add these types after the existing types
type LayerHistory = {
    layers: LayerData[];
    selectedAreaTypes: AreaType[];
    activeButton: AreaType | null;
    pumpLocation: LatLng | null;
};

// Constants
const DEFAULT_MAP_CENTER: [number, number] = [13.7563, 100.5018];
const MAX_AREA = 100000; // 10 hectares

const AREA_DESCRIPTIONS: Record<AreaType, string> = {
    river: 'Water body for irrigation and water management.',
    powerplant: 'Energy generation facility area.',
    building: 'Structure or facility area.',
    pump: 'Water pump station for irrigation system.',
    custompolygon: 'Other area for flexible drawing.',
    solarcell: 'Solar cell installation area.'
};

const AREA_COLORS: Record<AreaType, string> = {
    river: '#3B82F6',    // Blue
    powerplant: '#EF4444', // Red
    building: '#F59E0B',  // Yellow
    pump: '#1E40AF',      // Dark Blue
    custompolygon: '#4B5563', // Black Gray
    solarcell: '#FFD600' // Bright Yellow
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
            isActive ? 'bg-blue-600 hover:bg-blue-700' : 
            isSelected ? 'bg-blue-500 hover:bg-blue-600' : 
            'bg-gray-700 hover:bg-gray-600'
        }`}
    >
        {type === 'custompolygon' ? 'Other' : 
         type.charAt(0).toUpperCase() + type.slice(1).replace('powerplant', 'Power Plant')}
    </button>
);

const MapClickHandler: React.FC<{
    isPumpMode: boolean;
    onPumpPlace: (lat: number, lng: number) => void;
}> = ({ isPumpMode, onPumpPlace }) => {
    useMapEvents({
        click: (e) => {
            if (isPumpMode) {
                onPumpPlace(e.latlng.lat, e.latlng.lng);
            }
        }
    });
    return null;
};

// Add SearchControl component
const SearchControl: React.FC<{ onSearch: (lat: number, lng: number) => void }> = ({ onSearch }) => {
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
        <div className="absolute top-4 left-[60px] z-[1000] w-80">
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
                {error && (
                    <div className="text-sm text-red-400">{error}</div>
                )}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded bg-white shadow-lg">
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

// Create separate components for zoom and center control
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
                    easeLinearity: 0.25
                });
            }
        }
    }, [map, center]);

    return null;
};

// Add MapStateTracker component
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

// Update the ZoomLevelDisplay component position
const ZoomLevelDisplay: React.FC = () => {
    const map = useMap();
    const [zoom, setZoom] = useState(map.getZoom());

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
            Zoom: {zoom.toFixed(1)}
        </div>
    );
};

// Add these helper functions before the MapPlanner component
const isPointInPolygon = (point: LatLng, polygon: LatLng[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng;
        const yi = polygon[i].lat;
        const xj = polygon[j].lng;
        const yj = polygon[j].lat;

        const intersect = ((yi > point.lat) !== (yj > point.lat))
            && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

const isAreaWithinInitialMap = (newArea: LatLng[], initialMap: LatLng[]): boolean => {
    return newArea.every(point => isPointInPolygon(point, initialMap));
};

// Update DrawHandler component
const DrawHandler: React.FC<{
    layers: LayerData[];
    featureGroupRef: React.RefObject<any>;
}> = ({ layers, featureGroupRef }) => {
    const map = useMap();
    const featureGroup = featureGroupRef.current?.leafletElement;

    useEffect(() => {
        if (!map || !featureGroup) return;

        const handleDrawStart = (e: any) => {
            const drawControl = e.target;
            const drawTool = drawControl._toolbar._activeMode;
            drawControl.enable();
        };

        map.on('draw:drawstart', handleDrawStart);

        return () => {
            map.off('draw:drawstart', handleDrawStart);
        };
    }, [map, layers]);

    return null;
};

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
    const [selectedAreaTypes, setSelectedAreaTypes] = useState<AreaType[]>([]);
    const [activeButton, setActiveButton] = useState<AreaType | null>(null);
    const [drawingMode, setDrawingMode] = useState<'polygon' | 'rectangle'>('polygon');
    const [customParams, setCustomParams] = useState<CustomPlantParams>({
        name: '',
        type: '',
        description: '',
        plant_spacing: 10,
        row_spacing: 10,
        water_needed: 1.5
    });

    // Mode States
    const [isPumpMode, setIsPumpMode] = useState(false);
    const [isRiverMode, setIsRiverMode] = useState(false);
    const [isBuildingMode, setIsBuildingMode] = useState(false);
    const [isPowerPlantMode, setIsPowerPlantMode] = useState(false);
    const [isOtherMode, setIsOtherMode] = useState(false);
    const [isSolarcellMode, setIsSolarcellMode] = useState(false);
    const [pumpLocation, setPumpLocation] = useState<LatLng | null>(null);
    const [selectedPlantCategory, setSelectedPlantCategory] = useState<string>('');
    const [filteredPlants, setFilteredPlants] = useState<PlantType[]>([]);

    // Refs
    const featureGroupRef = useRef<any>(null);

    // In the MapPlanner component, add searchCenter state
    const [searchCenter, setSearchCenter] = useState<[number, number] | null>(null);

    // Add these to the state declarations at the top of the MapPlanner component
    const [currentZoom, setCurrentZoom] = useState(13);
    const [currentMapType, setCurrentMapType] = useState('street');
    const [initialZoom, setInitialZoom] = useState<number | null>(null);

    // Add new state for storing initial map position
    const [initialMapPosition, setInitialMapPosition] = useState<[number, number] | null>(null);

    // Add these state declarations in the MapPlanner component
    const [history, setHistory] = useState<LayerHistory[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Effects
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

    // Helper Functions
    const resetModes = () => {
        setIsPumpMode(false);
        setIsRiverMode(false);
        setIsBuildingMode(false);
        setIsPowerPlantMode(false);
        setIsOtherMode(false);
        setIsSolarcellMode(false);
        setActiveButton(null);
    };

    const handlePumpPlace = (lat: number, lng: number) => {
        if (layers.length > 0) {
            const clickedPoint = { lat, lng };
            console.log('Pump Location:', {
                latitude: lat,
                longitude: lng,
                coordinates: clickedPoint
            });
            setPumpLocation(clickedPoint);
            
            // Add pump to layers and save to history
            const pumpLayer: LayerData = {
                type: 'pump',
                coordinates: [clickedPoint]
            };
            const newLayers = [...layers, pumpLayer];
            setLayers(newLayers);
            saveToHistory(newLayers, selectedAreaTypes, activeButton, clickedPoint);
            
            resetModes();
            setActiveButton(null);
            setSelectedAreaTypes(prev => prev.filter(type => type !== 'pump'));
            setStatus('Pump location added. Select another area type to continue.');
        }
    };

    const toggleAreaType = (type: AreaType) => {
        if (activeButton === type) {
            resetModes();
            setSelectedAreaTypes(prev => prev.filter(t => t !== type));
            console.log('Area Type Deselected:', type);
            setStatus('Select an area type to begin');
            return;
        }

        if (activeButton !== null) {
            // If there's an active button, remove its layer first
            setLayers(prevLayers => {
                // Keep the initial map area and remove only the active button's layer
                return prevLayers.filter(layer => 
                    layer.isInitialMap || layer.type !== activeButton
                );
            });
            setSelectedAreaTypes(prev => prev.filter(t => t !== activeButton));
        }

        setActiveButton(type);
        console.log('Area Type Selected:', type);

        const enablePolygonDrawing = () => {
            const map = featureGroupRef.current?.leafletElement?._map;
            if (map) {
                const layers = map._layers as Record<string, any>;
                const drawControl = Object.values(layers).find(layer => layer._drawingMode === 'polygon');
                if (drawControl) {
                    drawControl.enable();
                }
            }
        };

        const modeMap = {
            pump: () => {
                setIsPumpMode(true);
                setSelectedAreaTypes(prev => [...prev, 'pump']);
                setStatus('Click on the map to place a pump');
            },
            river: () => {
                setIsRiverMode(true);
                setDrawingMode('polygon');
                setSelectedAreaTypes(prev => [...prev, 'river']);
                setStatus('Draw the river area');
                enablePolygonDrawing();
            },
            building: () => {
                setIsBuildingMode(true);
                setDrawingMode('polygon');
                setSelectedAreaTypes(prev => [...prev, 'building']);
                setStatus('Draw the building area');
                enablePolygonDrawing();
            },
            powerplant: () => {
                setIsPowerPlantMode(true);
                setDrawingMode('polygon');
                setSelectedAreaTypes(prev => [...prev, 'powerplant']);
                setStatus('Draw the power plant area');
                enablePolygonDrawing();
            },
            custompolygon: () => {
                setIsOtherMode(true);
                setDrawingMode('polygon');
                setSelectedAreaTypes(prev => [...prev, 'custompolygon']);
                setStatus('Draw a custom area');
                enablePolygonDrawing();
            },
            solarcell: () => {
                setIsSolarcellMode(true);
                setDrawingMode('polygon');
                setSelectedAreaTypes(prev => [...prev, 'solarcell']);
                setStatus('Draw the solar cell area');
                enablePolygonDrawing();
            }
        };

        modeMap[type]();
    };

    const onCreated = (e: any) => {
        const layer = e.layer;
        const coordinates = layer.getLatLngs()[0].map((latLng: { lat: number; lng: number }) => ({
            lat: latLng.lat,
            lng: latLng.lng,
        }));

        const styleMap: Record<AreaType, { color: string; fillOpacity: number; dashArray?: string }> = {
            river: { color: '#3B82F6', fillOpacity: 0.3 },
            powerplant: { color: '#EF4444', fillOpacity: 0.3 },
            building: { color: '#F59E0B', fillOpacity: 0.3 },
            pump: { color: '#1E40AF', fillOpacity: 0.3 },
            custompolygon: { color: '#4B5563', fillOpacity: 0.3 },
            solarcell: { color: '#FFD600', fillOpacity: 0.3 }
        };

        if (layers.length === 0) {
            // First draw is the initial map area with light green
            layer.setStyle({
                color: '#90EE90',
                fillColor: '#90EE90',
                fillOpacity: 0.3,
                weight: 2
            });
            
            const newLayer: LayerData = {
                type: 'custompolygon',
                coordinates: coordinates,
                isInitialMap: true
            };
            
            const newLayers = [...layers, newLayer];
            setLayers(newLayers);
            saveToHistory(newLayers, selectedAreaTypes, activeButton, pumpLocation);
            
            // Calculate and set the new center based on the drawn area
            const bounds = layer.getBounds();
            const center = bounds.getCenter();
            const newCenter: [number, number] = [center.lat, center.lng];
            setMapCenter(newCenter);
            setInitialMapPosition(newCenter);
            
            // Store the current zoom level
            const map = featureGroupRef.current?.leafletElement?._map;
            if (map) {
                const currentZoom = map.getZoom();
                setInitialZoom(currentZoom);
                setCurrentZoom(currentZoom);
                // Center the map on the initial polygon
                map.setView(newCenter, currentZoom, {
                    animate: true,
                    duration: 1
                });
            }
            
            setStatus('Initial map area drawn. Now select an area type to continue.');
            return;
        }

        const currentType = isRiverMode ? 'river' : 
                          isBuildingMode ? 'building' : 
                          isPowerPlantMode ? 'powerplant' : 
                          isOtherMode ? 'custompolygon' : null;

        if (currentType && styleMap[currentType]) {
            layer.setStyle({
                ...styleMap[currentType],
                fillColor: styleMap[currentType].color,
                weight: 2
            });
        }

        const newLayer: LayerData = {
            type: (isRiverMode ? 'river' : 
                  isBuildingMode ? 'building' : 
                  isPowerPlantMode ? 'powerplant' : 
                  isOtherMode ? 'custompolygon' :
                  'custompolygon') as AreaType,
            coordinates: coordinates,
            isInitialMap: false
        };

        // Add the layer to the FeatureGroup
        if (featureGroupRef.current?.leafletElement) {
            featureGroupRef.current.leafletElement.addLayer(layer);
        }

        const newLayers = [...layers, newLayer];
        setLayers(newLayers);
        saveToHistory(newLayers, selectedAreaTypes, activeButton, pumpLocation);
        console.log('Area Created:', {
            type: newLayer.type,
            coordinates: newLayer.coordinates
        });

        // Center the map on the newly drawn polygon
        const map = featureGroupRef.current?.leafletElement?._map;
        if (map) {
            const bounds = layer.getBounds();
            const center = bounds.getCenter();
            map.setView([center.lat, center.lng], map.getZoom(), {
                animate: true,
                duration: 1
            });
        }

        resetModes();
        setActiveButton(null);
        setSelectedAreaTypes(prev => prev.filter(type => type !== activeButton));
        setError(null);
        setStatus(`Added ${activeButton === 'custompolygon' ? 'custom polygon' :
                          isRiverMode ? 'river' : 
                          isBuildingMode ? 'building' : 
                          isPowerPlantMode ? 'power plant' : 
                          'custom polygon'} area. Select another area type to continue.`);
    };

    const onDeleted = () => {
        console.log('All Areas Cleared');
        setLayers([]);
        setSelectedAreaTypes([]);
        setPumpLocation(null);
        setError(null);
        setStatus('All drawn areas have been cleared.');
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
            // Get all field-type layers for the main area
            const fieldLayers = layers.filter(layer => 
                ['field', 'river', 'custompolygon'].includes(layer.type)
            );

            // Combine coordinates from all field-type layers
            const combinedCoordinates = fieldLayers.flatMap(layer => layer.coordinates);

            // Create the plant data with current custom values
            const plantData = {
                id: selectedPlant.id,
                name: selectedPlant.name,
                type: selectedPlant.type,
                plant_spacing: Number(customParams.plant_spacing),
                row_spacing: Number(customParams.row_spacing),
                water_needed: Number(customParams.water_needed)
            };

            console.log('Plant Data being sent:', plantData);

            // Format the data for sending
            const formattedData = {
                areaType: selectedAreaTypes.join(','),
                area: combinedCoordinates,
                plantType: {
                    ...plantData,
                    plant_spacing: Number(customParams.plant_spacing),
                    row_spacing: Number(customParams.row_spacing),
                    water_needed: Number(customParams.water_needed)
                },
                layers: layers.map(layer => ({
                    ...layer,
                    coordinates: layer.coordinates.map(coord => ({
                        lat: Number(coord.lat),
                        lng: Number(coord.lng)
                    }))
                }))
            };

            console.log('Formatted Data:', formattedData);

            router.visit('/generate-tree', {
                method: 'get',
                data: {
                    areaType: formattedData.areaType,
                    area: JSON.stringify(formattedData.area),
                    plantType: JSON.stringify(formattedData.plantType),
                    layers: JSON.stringify(formattedData.layers)
                },
                preserveState: false,
                preserveScroll: false
            });
        } catch (error) {
            console.error('Error:', error);
            setError('An error occurred while processing the data.');
        }
    };

    // Update handleBack function
    const handleBack = () => {
        console.log('handleBack called'); // ตรวจสอบว่าฟังก์ชันนี้ถูกเรียก
        setLayers([]);
        setSelectedAreaTypes([]);
        setPumpLocation(null);
        setSelectedPlant(null);
        setSelectedPlantCategory('');
        setCustomParams({
            name: '',
            type: '',
            description: '',
            plant_spacing: 10,
            row_spacing: 10,
            water_needed: 1.5
        });
        setError(null);
        setStatus('Draw an area on the map first');

        // Reset map view to initial position and zoom
        if (initialMapPosition && initialZoom !== null) {
            setMapCenter(initialMapPosition);
            setCurrentZoom(initialZoom);
        }

        // Clear layer that drawed out of initial map
        if (featureGroupRef.current) {
            const leafletElem = featureGroupRef.current.leafletElement;
            if (leafletElem && leafletElem.clearLayers) {
                console.log('Layers: ', layers);
                leafletElem.clearLayers();
            }
        }
    };

    const resetToDefault = () => {
        if (selectedPlant) {
            setCustomParams({
                name: selectedPlant.name,
                type: selectedPlant.type,
                description: selectedPlant.description || 'No description available',
                plant_spacing: Number(selectedPlant.plant_spacing),
                row_spacing: Number(selectedPlant.row_spacing),
                water_needed: Number(selectedPlant.water_needed)
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
            water_needed: Number(plant.water_needed)
        });
        setStatus(`${plant.name} selected`);
    };

    // Update the input handlers
    const handleCustomParamChange = (field: keyof CustomPlantParams, value: string) => {
        const newValue = parseFloat(value) || 0;
        setCustomParams(prev => {
            const updated = {
                ...prev,
                [field]: newValue
            };
            console.log('Updated Custom Parameters:', updated);
            return updated;
        });
    };

    // Add handleSearch function
    const handleSearch = (lat: number, lng: number) => {
        setSearchCenter([lat, lng]);
    };

    // Add this function to calculate center from layers
    const calculateMapCenter = () => {
        if (layers.length > 0) {
            const allPoints = layers.flatMap(layer => layer.coordinates);
            const totalLat = allPoints.reduce((sum: number, point: LatLng) => sum + point.lat, 0);
            const totalLng = allPoints.reduce((sum: number, point: LatLng) => sum + point.lng, 0);
            return [totalLat / allPoints.length, totalLng / allPoints.length] as [number, number];
        }
        return mapCenter;
    };

    // Add these functions in the MapPlanner component
    const saveToHistory = (newLayers: LayerData[], newSelectedTypes: AreaType[], newActiveButton: AreaType | null, newPumpLocation: LatLng | null) => {
        // Clear any existing history after current index
        const newHistory = history.slice(0, historyIndex + 1);
        
        // Save the complete state
        newHistory.push({
            layers: newLayers.map(layer => ({
                ...layer,
                coordinates: layer.coordinates.map(coord => ({
                    lat: coord.lat,
                    lng: coord.lng
                }))
            })),
            selectedAreaTypes: [...newSelectedTypes],
            activeButton: newActiveButton,
            pumpLocation: newPumpLocation ? { ...newPumpLocation } : null
        });
        
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const previousState = history[newIndex];

            // Clear old layers from map
            if (featureGroupRef.current && featureGroupRef.current.leafletElement) {
                const featureGroup = featureGroupRef.current.leafletElement;
                featureGroup.clearLayers(); // สำคัญ!
            }

            setLayers(previousState.layers);
            setSelectedAreaTypes(previousState.selectedAreaTypes);
            setActiveButton(null);
            setPumpLocation(previousState.pumpLocation);
            setHistoryIndex(newIndex);

            setStatus('Undo: Previous state restored');
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            const nextState = history[newIndex];

            // Clear old layers from map
            if (featureGroupRef.current && featureGroupRef.current.leafletElement) {
                const featureGroup = featureGroupRef.current.leafletElement;
                featureGroup.clearLayers(); // สำคัญ!
            }

            setLayers(nextState.layers);
            setSelectedAreaTypes(nextState.selectedAreaTypes);
            setActiveButton(null);
            setPumpLocation(nextState.pumpLocation);
            setHistoryIndex(newIndex);

            setStatus('Redo: Next state restored');
        }
    };

    // Add the arrow controls to the map
    const MapControls: React.FC = () => {
        return (
            <div className="absolute bottom-4 right-4 z-[1000] flex space-x-2">
                <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="rounded bg-white p-2 shadow-md hover:bg-gray-100 disabled:opacity-50"
                >
                    <svg
                        className="h-6 w-6 text-gray-700"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                </button>
                <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="rounded bg-white p-2 shadow-md hover:bg-gray-100 disabled:opacity-50"
                >
                    <svg
                        className="h-6 w-6 text-gray-700"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                </button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <h1 className="mb-4 text-xl font-bold text-white">Plant Layout Generator</h1>
            <p className="mb-4 text-sm text-gray-400">
                Draw an area on the map (recommended not over 10 hectares) and select the area type and plant type to proceed.
            </p>

            <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-800 p-4">
                <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-300">{status}</span>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded bg-red-500/10 p-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className={`space-y-4 ${layers.length > 0 ? 'lg:col-span-1' : 'hidden'}`}>
                    {layers.length > 0 && (
                        <>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-300">
                                    Plant Category
                                </label>
                                <select
                                    value={selectedPlantCategory}
                                    onChange={(e) => {
                                        setSelectedPlantCategory(e.target.value);
                                        setSelectedPlant(null);
                                        console.log('Selected Plant Category:', e.target.value);
                                        if (e.target.value === 'Horticultural') {
                                            const filtered = plantTypes.filter(plant => 
                                                ['Mango', 'Durian', 'Pineapple', 'Longkong'].includes(plant.name)
                                            );
                                            console.log('Filtered Plants:', filtered);
                                            setFilteredPlants(filtered);
                                        } else {
                                            console.log('No plants available for category:', e.target.value);
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
                            </div>

                            {selectedPlantCategory && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-300">
                                        Plant Selection
                                        <span className="ml-2 text-sm font-normal text-gray-400">
                                            {selectedPlant ? `(${selectedPlant.name})` : '(Select a plant)'}
                                        </span>
                                    </label>
                                    <select
                                        value={selectedPlant?.id || ''}
                                        onChange={(e) => {
                                            const plant = filteredPlants.find(p => p.id === Number(e.target.value));
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
                                            onChange={(e) => handleCustomParamChange('plant_spacing', e.target.value)}
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
                                            onChange={(e) => handleCustomParamChange('row_spacing', e.target.value)}
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
                                            onChange={(e) => handleCustomParamChange('water_needed', e.target.value)}
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

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-300">
                                    Area Configuration
                                </label>
                                <div className="space-y-2">
                                    {Object.keys(AREA_DESCRIPTIONS).map((type) => (
                                        <div key={type} className="flex items-center gap-4">
                                            <AreaTypeButton
                                                type={type as AreaType}
                                                isSelected={selectedAreaTypes.includes(type as AreaType)}
                                                isActive={activeButton === type}
                                                onClick={() => toggleAreaType(type as AreaType)}
                                            />
                                            <span className="text-sm text-gray-400">
                                                {AREA_DESCRIPTIONS[type as AreaType]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className={`space-y-4 ${layers.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                    <div className={`${layers.length === 0 ? 'h-[900px]' : 'h-[700px]'} w-full overflow-hidden rounded-lg border border-gray-700 ${layers.length === 0 ? 'w-full' : ''}`}>
                        <MapContainer
                            center={searchCenter || calculateMapCenter()}
                            zoom={initialZoom || currentZoom}
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
                            <CenterController center={searchCenter || calculateMapCenter()} />
                            <MapStateTracker 
                                onZoomChange={setCurrentZoom}
                                onMapTypeChange={setCurrentMapType}
                            />
                            <ZoomLevelDisplay />
                            <MapControls />
                            <DrawHandler layers={layers} featureGroupRef={featureGroupRef} />
                            <MapClickHandler 
                                isPumpMode={isPumpMode} 
                                onPumpPlace={handlePumpPlace}
                            />
                            <LayersControl position="topright">
                                <LayersControl.BaseLayer checked={currentMapType === 'street'} name="Street Map">
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        maxZoom={25}
                                        minZoom={3}
                                    />
                                </LayersControl.BaseLayer>
                                <LayersControl.BaseLayer checked={currentMapType === 'satellite'} name="Satellite">
                                    <TileLayer
                                        url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                                        attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
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
                                        polygon: {
                                            allowIntersection: true,
                                            showArea: true,
                                            drawError: {
                                                color: '#e1e4e8',
                                                message: '<strong>Error:</strong> Cannot draw outside the initial map area!'
                                            },
                                            shapeOptions: {
                                                color: '#3B82F6',
                                                fillOpacity: 0.3,
                                                weight: 2
                                            },
                                            repeatMode: true
                                        }
                                    }}
                                />
                            </FeatureGroup>

                            {pumpLocation && (
                                <Circle
                                    center={[pumpLocation.lat, pumpLocation.lng]}
                                    radius={4}
                                    pathOptions={{
                                        color: AREA_COLORS.pump,
                                        fillColor: AREA_COLORS.pump,
                                        fillOpacity: 1,
                                        weight: 2
                                    }}
                                />
                            )}

                            {layers.map((layer, index) => {
                                const styleMap: Record<AreaType, { color: string; fillOpacity: number; dashArray?: string }> = {
                                    building: { color: AREA_COLORS.building, fillOpacity: 0.5 },
                                    powerplant: { color: AREA_COLORS.powerplant, fillOpacity: 0.5 },
                                    river: { color: AREA_COLORS.river, fillOpacity: 0.5 },
                                    custompolygon: { color: AREA_COLORS.custompolygon, fillOpacity: 0.5 },
                                    pump: { color: AREA_COLORS.pump, fillOpacity: 0.5 },
                                    solarcell: { color: AREA_COLORS.solarcell, fillOpacity: 0.5 }
                                };

                                if (layer.isInitialMap) {
                                    return (
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
                                    );
                                }

                                if (styleMap[layer.type]) {
                                    return (
                                        <Polygon
                                            key={`${layer.type}-${index}`}
                                            positions={layer.coordinates.map(coord => [coord.lat, coord.lng])}
                                            pathOptions={{
                                                ...styleMap[layer.type],
                                                fillColor: styleMap[layer.type].color,
                                                weight: 2
                                            }}
                                        />
                                    );
                                }
                                return null;
                            })}
                        </MapContainer>
                    </div>
                </div>
            </div>
            <div className="mt-4 flex justify-between">
                <button
                    onClick={handleBack}
                    className="rounded bg-gray-600 px-6 py-3 text-white transition-colors duration-200 hover:bg-gray-700"
                >
                    Back
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
