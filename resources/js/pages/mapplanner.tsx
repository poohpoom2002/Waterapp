import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, FeatureGroup, LayersControl, useMapEvents, Circle, Polygon } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { router } from '@inertiajs/react';
import { route } from 'ziggy-js';

// Types
interface LatLng {
    lat: number;
    lng: number;
}

interface PlantType {
    id: number;
    name: string;
    type: string;
    plant_spacing: number;
    row_spacing: number;
    water_needed: number;
    description: string;
}

type AreaType = 'field' | 'river' | 'powerplant' | 'building' | 'pump';

interface LayerData {
    type: AreaType;
    coordinates: LatLng[];
}

// Constants
const DEFAULT_MAP_CENTER: [number, number] = [13.7563, 100.5018];
const MAX_AREA = 100000; // 10 hectares

const AREA_DESCRIPTIONS: Record<AreaType, string> = {
    field: 'Agricultural land for planting crops and vegetation.',
    river: 'Water body for irrigation and water management.',
    powerplant: 'Energy generation facility area.',
    building: 'Structure or facility area.',
    pump: 'Water pump station for irrigation system.'
};

const AREA_COLORS: Record<AreaType, string> = {
    river: '#3B82F6',    // Blue
    field: '#22C55E',    // Green
    powerplant: '#EF4444', // Red
    building: '#F59E0B',  // Yellow
    pump: '#1E40AF'      // Dark Blue
};

// Helper Components
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
            isSelected ? 'bg-gray-600 hover:bg-gray-500' : 
            'bg-gray-700 hover:bg-gray-600'
        }`}
    >
        {type.charAt(0).toUpperCase() + type.slice(1).replace('powerplant', 'Power Plant')}
    </button>
);

const PlantInfo: React.FC<{ plant: PlantType }> = ({ plant }) => (
    <div className="rounded-lg bg-gray-800 p-4">
        <h3 className="mb-2 text-lg font-medium text-white">{plant.name}</h3>
        <div className="space-y-2 text-sm text-gray-300">
            <p><span className="font-medium">Type:</span> {plant.type}</p>
            <p><span className="font-medium">Plant Spacing:</span> {plant.plant_spacing}m</p>
            <p><span className="font-medium">Row Spacing:</span> {plant.row_spacing}m</p>
            <p><span className="font-medium">Water Needed:</span> {plant.water_needed}L/day</p>
            <p className="mt-2 text-gray-400">{plant.description}</p>
        </div>
    </div>
);

// Map Event Handlers
const MapClickHandler: React.FC<{
    isPumpMode: boolean;
    isBuildingMode: boolean;
    isPowerPlantMode: boolean;
    onPumpPlace: (lat: number, lng: number) => void;
    onBuildingPlace: (lat: number, lng: number) => void;
    onPowerPlantPlace: (lat: number, lng: number) => void;
}> = ({ isPumpMode, isBuildingMode, isPowerPlantMode, onPumpPlace, onBuildingPlace, onPowerPlantPlace }) => {
    useMapEvents({
        click: (e) => {
            if (isPumpMode) {
                onPumpPlace(e.latlng.lat, e.latlng.lng);
            } else if (isBuildingMode) {
                onBuildingPlace(e.latlng.lat, e.latlng.lng);
            } else if (isPowerPlantMode) {
                onPowerPlantPlace(e.latlng.lat, e.latlng.lng);
            }
        }
    });
    return null;
};

// Main Component
export default function MapPlanner() {
    // State Management
    const [layers, setLayers] = useState<LayerData[]>([]);
    const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
    const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
    const [results, setResults] = useState<LatLng[]>([]);
    const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('Draw an area on the map first');
    const [selectedAreaTypes, setSelectedAreaTypes] = useState<AreaType[]>([]);
    const [currentDrawingType, setCurrentDrawingType] = useState<AreaType>('field');
    const [activeButton, setActiveButton] = useState<AreaType | null>(null);
    const [drawingMode, setDrawingMode] = useState<'polygon' | 'rectangle'>('polygon');

    // Mode States
    const [isPumpMode, setIsPumpMode] = useState(false);
    const [isRiverMode, setIsRiverMode] = useState(false);
    const [isFieldMode, setIsFieldMode] = useState(false);
    const [isBuildingMode, setIsBuildingMode] = useState(false);
    const [isPowerPlantMode, setIsPowerPlantMode] = useState(false);
    const [pumpLocation, setPumpLocation] = useState<LatLng | null>(null);

    // Refs
    const featureGroupRef = useRef<any>(null);

    // Effects
    useEffect(() => {
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

    // Helper Functions
    const calculateArea = (points: LatLng[]): number => {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].lat * points[j].lng;
            area -= points[j].lat * points[i].lng;
        }
        return Math.abs(area) / 2;
    };

    const resetModes = () => {
        setIsPumpMode(false);
        setIsRiverMode(false);
        setIsFieldMode(false);
        setIsBuildingMode(false);
        setIsPowerPlantMode(false);
        setActiveButton(null);
    };

    // Event Handlers
    const handleSubmit = async () => {
        if (layers.length < 1) {
            setError('Please draw an area on the map first');
            return;
        }

        if (!selectedPlant) {
            setError('Please select a plant type');
            return;
        }

        const areaSize = calculateArea(layers[0].coordinates);
        if (areaSize > MAX_AREA) {
            setError(`Area is too large. Maximum allowed area is ${MAX_AREA/10000} hectares`);
            return;
        }

        setIsLoading(true);
        setError(null);
        setStatus(`Calculating optimal plant positions for ${selectedAreaTypes.join(', ')}...`);

        try {
            const response = await axios.post<{ plant_locations: LatLng[] }>(
                '/api/generate-planting-points',
                {
                    area: layers[0].coordinates,
                    plant_type_id: selectedPlant.id,
                    plant_spacing: selectedPlant.plant_spacing,
                    row_spacing: selectedPlant.row_spacing,
                    area_type: selectedAreaTypes,
                }
            );
            setResults(response.data.plant_locations);
            setStatus(`Successfully generated ${response.data.plant_locations.length} planting points`);
        } catch (error) {
            setError(axios.isAxiosError(error) ? error.response?.data?.message || 'Error generating points' : 'An unexpected error occurred');
            setStatus('Failed to generate planting points');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleAreaType = (type: AreaType) => {
        // Toggle off if clicking the same button
        if (activeButton === type) {
            resetModes();
            setStatus('Select an area type to begin');
            return;
        }

        // Prevent multiple active buttons
        if (activeButton !== null) {
            setError('Please finish the current action first');
            return;
        }

        setActiveButton(type);

        // Validate initial area exists
        if (layers.length === 0) {
            setError(`Please draw an area first before adding a ${type}`);
            setActiveButton(null);
            return;
        }

        // Handle different area types
        switch (type) {
            case 'pump':
                setIsPumpMode(true);
                setSelectedAreaTypes(prev => [...prev, 'pump']);
                setStatus('Click on the map to place a pump');
                break;
            case 'river':
                setIsRiverMode(true);
                setDrawingMode('polygon');
                setSelectedAreaTypes(prev => [...prev, 'river']);
                setStatus('Use the polygon tool to draw the river area');
                break;
            case 'field':
                setIsFieldMode(true);
                setDrawingMode('polygon');
                setSelectedAreaTypes(prev => [...prev, 'field']);
                setStatus('Use the polygon tool to draw the field area');
                break;
            case 'building':
                setIsBuildingMode(true);
                setDrawingMode('rectangle');
                setSelectedAreaTypes(prev => [...prev, 'building']);
                setStatus('Use the rectangle tool to draw the building area');
                break;
            case 'powerplant':
                setIsPowerPlantMode(true);
                setDrawingMode('rectangle');
                setSelectedAreaTypes(prev => [...prev, 'powerplant']);
                setStatus('Use the rectangle tool to draw the power plant area');
                break;
        }
    };

    const onCreated = (e: any) => {
        const layer = e.layer;
        const coordinates = layer.getLatLngs()[0].map((latLng: { lat: number; lng: number }) => ({
            lat: latLng.lat,
            lng: latLng.lng,
        }));

        // Apply styles for non-first layers
        if (layers.length > 0) {
            if (isRiverMode) {
                layer.setStyle({
                    color: AREA_COLORS.river,
                    fillColor: AREA_COLORS.river,
                    fillOpacity: 0.3,
                    weight: 2,
                    dashArray: '5, 10'
                });
            } else if (isFieldMode) {
                layer.setStyle({
                    color: AREA_COLORS.field,
                    fillColor: AREA_COLORS.field,
                    fillOpacity: 0.3,
                    weight: 2,
                    dashArray: '1, 0'
                });
            }
        }

        // Add new layer
        setLayers(prevLayers => [...prevLayers, {
            type: isRiverMode ? 'river' : 
                  isFieldMode ? 'field' : 
                  isBuildingMode ? 'building' : 
                  isPowerPlantMode ? 'powerplant' : 
                  currentDrawingType,
            coordinates: coordinates
        }]);

        // Reset modes and update status
        resetModes();
        setError(null);
        setStatus(`Added ${isRiverMode ? 'river' : 
                          isFieldMode ? 'field' : 
                          isBuildingMode ? 'building' : 
                          isPowerPlantMode ? 'power plant' : 
                          currentDrawingType} area. Select another area type to continue.`);
    };

    const onDeleted = (e: any) => {
        setLayers(prevLayers => prevLayers.filter((_, index) => index !== e.layers.length - 1));
        setError(null);
        setStatus(selectedAreaTypes.length > 0 
            ? `Selected types: ${selectedAreaTypes.join(', ')}`
            : 'Select area type(s) or draw an area on the map.');
    };

    const handleNext = () => {
        if (selectedAreaTypes.length === 0 || layers.length === 0 || !selectedPlant) {
            setError('Please select an area type, draw an area, and select a plant type before proceeding.');
            return;
        }

        const params = new URLSearchParams();
        params.append('areaType', selectedAreaTypes[0]);
        params.append('area', JSON.stringify(layers[0].coordinates));
        params.append('plantType', JSON.stringify(selectedPlant));

        router.visit(route('generate.tree') + '?' + params.toString(), {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            onError: (errors) => {
                setError('Failed to navigate to the next page. Please make sure you are logged in.');
                console.error('Navigation error:', errors);
            }
        });
    };

    const handlePumpPlace = (lat: number, lng: number) => {
        if (layers.length > 0) {
            const clickedPoint = { lat, lng };
            setPumpLocation(clickedPoint);
            setLayers(prevLayers => [...prevLayers, {
                type: 'pump',
                coordinates: [clickedPoint]
            }]);
            resetModes();
            setStatus('Pump location added. Select another area type to continue.');
        }
    };

    const handleBuildingPlace = (lat: number, lng: number) => {
        if (layers.length > 0) {
            const size = 0.0001;
            const coordinates = [
                { lat: lat - size, lng: lng - size },
                { lat: lat - size, lng: lng + size },
                { lat: lat + size, lng: lng + size },
                { lat: lat + size, lng: lng - size }
            ];
            setLayers(prevLayers => [...prevLayers, {
                type: 'building',
                coordinates: coordinates
            }]);
            resetModes();
            setStatus('Building added. Select another area type to continue.');
        }
    };

    const handlePowerPlantPlace = (lat: number, lng: number) => {
        if (layers.length > 0) {
            const size = 0.0001;
            const coordinates = [
                { lat: lat - size, lng: lng - size },
                { lat: lat - size, lng: lng + size },
                { lat: lat + size, lng: lng + size },
                { lat: lat + size, lng: lng - size }
            ];
            setLayers(prevLayers => [...prevLayers, {
                type: 'powerplant',
                coordinates: coordinates
            }]);
            resetModes();
            setStatus('Power plant added. Select another area type to continue.');
        }
    };

    // Render
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
                <div className="space-y-4 lg:col-span-1">
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

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-300">
                            Plant Selection
                            <span className="ml-2 text-sm font-normal text-gray-400">
                                {selectedPlant ? `(${selectedPlant.name})` : '(Select a plant type)'}
                            </span>
                        </label>
                        <select
                            value={selectedPlant?.id || ''}
                            onChange={(e) => {
                                const plant = plantTypes.find(p => p.id === Number(e.target.value));
                                setSelectedPlant(plant || null);
                                setStatus(plant ? `${plant.name} selected` : 'Select a plant type');
                            }}
                            className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                        >
                            <option value="">Select a plant type</option>
                            {plantTypes.map((plant) => (
                                <option key={plant.id} value={plant.id}>
                                    {plant.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedPlant && <PlantInfo plant={selectedPlant} />}
                </div>

                <div className="space-y-4 lg:col-span-2">
                    <div className="h-[600px] w-full overflow-hidden rounded-lg border border-gray-700">
                        <MapContainer
                            center={mapCenter}
                            zoom={13}
                            maxZoom={19}
                            minZoom={3}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={true}
                            scrollWheelZoom={true}
                        >
                            <MapClickHandler 
                                isPumpMode={isPumpMode} 
                                isBuildingMode={isBuildingMode}
                                isPowerPlantMode={isPowerPlantMode}
                                onPumpPlace={handlePumpPlace}
                                onBuildingPlace={handleBuildingPlace}
                                onPowerPlantPlace={handlePowerPlantPlace}
                            />
                            <LayersControl position="topright">
                                <LayersControl.BaseLayer checked name="Street Map">
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        maxZoom={19}
                                    />
                                </LayersControl.BaseLayer>
                                <LayersControl.BaseLayer name="Satellite">
                                    <TileLayer
                                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                                        maxZoom={19}
                                    />
                                </LayersControl.BaseLayer>
                            </LayersControl>

                            <FeatureGroup ref={featureGroupRef}>
                                <EditControl
                                    position="topright"
                                    onCreated={onCreated}
                                    onDeleted={onDeleted}
                                    draw={{
                                        rectangle: drawingMode === 'rectangle',
                                        circle: false,
                                        circlemarker: false,
                                        marker: false,
                                        polyline: false,
                                        polygon: drawingMode === 'polygon'
                                    }}
                                />
                            </FeatureGroup>

                            {pumpLocation && (
                                <Circle
                                    center={[pumpLocation.lat, pumpLocation.lng]}
                                    radius={5}
                                    pathOptions={{
                                        color: AREA_COLORS.pump,
                                        fillColor: AREA_COLORS.pump,
                                        fillOpacity: 1,
                                        weight: 2
                                    }}
                                />
                            )}

                            {layers.map((layer, index) => {
                                if (layer.type === 'building') {
                                    return (
                                        <Polygon
                                            key={`building-${index}`}
                                            positions={layer.coordinates.map(coord => [coord.lat, coord.lng])}
                                            pathOptions={{
                                                color: AREA_COLORS.building,
                                                fillColor: AREA_COLORS.building,
                                                fillOpacity: 1,
                                                weight: 2
                                            }}
                                        />
                                    );
                                }
                                if (layer.type === 'powerplant') {
                                    return (
                                        <Polygon
                                            key={`powerplant-${index}`}
                                            positions={layer.coordinates.map(coord => [coord.lat, coord.lng])}
                                            pathOptions={{
                                                color: AREA_COLORS.powerplant,
                                                fillColor: AREA_COLORS.powerplant,
                                                fillOpacity: 1,
                                                weight: 2
                                            }}
                                        />
                                    );
                                }
                                if (layer.type === 'river') {
                                    return (
                                        <Polygon
                                            key={`river-${index}`}
                                            positions={layer.coordinates.map(coord => [coord.lat, coord.lng])}
                                            pathOptions={{
                                                color: AREA_COLORS.river,
                                                fillColor: AREA_COLORS.river,
                                                fillOpacity: 0.3,
                                                weight: 2,
                                                dashArray: '5, 10'
                                            }}
                                        />
                                    );
                                }
                                if (layer.type === 'field') {
                                    return (
                                        <Polygon
                                            key={`field-${index}`}
                                            positions={layer.coordinates.map(coord => [coord.lat, coord.lng])}
                                            pathOptions={{
                                                color: AREA_COLORS.field,
                                                fillColor: AREA_COLORS.field,
                                                fillOpacity: 0.3,
                                                weight: 2,
                                                dashArray: '1, 0'
                                            }}
                                        />
                                    );
                                }
                                return null;
                            })}
                        </MapContainer>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={handleNext}
                            disabled={!selectedPlant || layers.length === 0 || selectedAreaTypes.length === 0}
                            className="rounded bg-green-600 px-6 py-3 text-white transition-colors duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-700"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}