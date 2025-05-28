import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, FeatureGroup, LayersControl, useMapEvents, Circle, Polygon } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { router } from '@inertiajs/react';

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
    description?: string;
}

interface CustomPlantParams {
    name: string;
    type: string;
    description: string;
    plant_spacing: number;
    row_spacing: number;
    water_needed: number;
}

type AreaType = 'field' | 'river' | 'powerplant' | 'building' | 'pump' | 'custompolygon' | 'solarcell';

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
    pump: 'Water pump station for irrigation system.',
    custompolygon: 'Other area for flexible drawing.',
    solarcell: 'Solar cell installation area.'
};

const AREA_COLORS: Record<AreaType, string> = {
    river: '#3B82F6',    // Blue
    field: '#22C55E',    // Green
    powerplant: '#EF4444', // Red
    building: '#F59E0B',  // Yellow
    pump: '#1E40AF',      // Dark Blue
    custompolygon: '#A21CAF', // Purple
    solarcell: '#FFD600' // Bright Yellow
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
            isSelected ? 'bg-blue-500 hover:bg-blue-600' : 
            'bg-gray-700 hover:bg-gray-600'
        }`}
    >
        {type === 'custompolygon' ? 'Other' : 
         type.charAt(0).toUpperCase() + type.slice(1).replace('powerplant', 'Power Plant')}
    </button>
);

// Map Event Handlers
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
    const [isFieldMode, setIsFieldMode] = useState(false);
    const [isBuildingMode, setIsBuildingMode] = useState(false);
    const [isPowerPlantMode, setIsPowerPlantMode] = useState(false);
    const [pumpLocation, setPumpLocation] = useState<LatLng | null>(null);
    const [selectedPlantCategory, setSelectedPlantCategory] = useState<string>('');
    const [filteredPlants, setFilteredPlants] = useState<PlantType[]>([]);

    // Refs
    const featureGroupRef = useRef<any>(null);

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
        setIsFieldMode(false);
        setIsBuildingMode(false);
        setIsPowerPlantMode(false);
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
            setLayers(prevLayers => [...prevLayers, {
                type: 'pump',
                coordinates: [clickedPoint]
            }]);
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
            setError('Please finish the current action first');
            return;
        }

        setActiveButton(type);
        console.log('Area Type Selected:', type);

        if (layers.length === 0) {
            setError(`Please draw an area first before adding a ${type}`);
            setActiveButton(null);
            return;
        }

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
                setStatus('Use the polygon tool to draw the river area');
            },
            field: () => {
                setIsFieldMode(true);
                setDrawingMode('polygon');
                setSelectedAreaTypes(prev => [...prev, 'field']);
                setStatus('Use the polygon tool to draw the field area');
            },
            building: () => {
                setIsBuildingMode(true);
                setDrawingMode('polygon');
                setSelectedAreaTypes(prev => [...prev, 'building']);
                setStatus('Use the polygon tool to draw the building area');
            },
            powerplant: () => {
                setIsPowerPlantMode(true);
                setDrawingMode('polygon');
                setSelectedAreaTypes(prev => [...prev, 'powerplant']);
                setStatus('Use the polygon tool to draw the power plant area');
            },
            custompolygon: () => {
                setDrawingMode('polygon');
                setSelectedAreaTypes(prev => [...prev, 'custompolygon']);
                setStatus('Use the polygon tool to draw a custom area');
            },
            solarcell: () => {
                setDrawingMode('polygon');
                setSelectedAreaTypes(prev => [...prev, 'solarcell']);
                setStatus('Use the polygon tool to draw the solar cell area');
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

        const styleMap = {
            river: { color: AREA_COLORS.river, fillOpacity: 0.3, dashArray: '5, 10' },
            field: { color: AREA_COLORS.field, fillOpacity: 0.3, dashArray: '1, 0' },
            building: { color: AREA_COLORS.building, fillOpacity: 1 },
            powerplant: { color: AREA_COLORS.powerplant, fillOpacity: 1 },
            solarcell: { color: AREA_COLORS.solarcell, fillOpacity: 0.7 }
        };

        if (layers.length > 0) {
            const currentType = isRiverMode ? 'river' : 
                              isFieldMode ? 'field' : 
                              isBuildingMode ? 'building' : 
                              isPowerPlantMode ? 'powerplant' : 
                              activeButton === 'solarcell' ? 'solarcell' : null;

            if (currentType && styleMap[currentType]) {
                layer.setStyle({
                    ...styleMap[currentType],
                    fillColor: styleMap[currentType].color,
                    weight: 2
                });
            }
        }

        const newLayer: LayerData = {
            type: (isRiverMode ? 'river' : 
                  isFieldMode ? 'field' : 
                  isBuildingMode ? 'building' : 
                  isPowerPlantMode ? 'powerplant' : 
                  activeButton === 'custompolygon' ? 'custompolygon' :
                  activeButton === 'solarcell' ? 'solarcell' :
                  'custompolygon') as AreaType,
            coordinates: coordinates
        };

        setLayers(prevLayers => [...prevLayers, newLayer]);
        console.log('Area Created:', {
            type: newLayer.type,
            coordinates: newLayer.coordinates
        });

        resetModes();
        setActiveButton(null);
        setSelectedAreaTypes(prev => prev.filter(type => type !== activeButton));
        setError(null);
        setStatus(`Added ${activeButton === 'custompolygon' ? 'custom polygon' :
                          activeButton === 'solarcell' ? 'solar cell' :
                          isRiverMode ? 'river' : 
                          isFieldMode ? 'field' : 
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
                </div>

                <div className="space-y-4 lg:col-span-2">
                    <div className="h-[700px] w-full overflow-hidden rounded-lg border border-gray-700">
                        <MapContainer
                            center={mapCenter}
                            zoom={13}
                            maxZoom={19}
                            minZoom={5}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={true}
                            scrollWheelZoom={true}
                        >
                            <MapClickHandler 
                                isPumpMode={isPumpMode} 
                                onPumpPlace={handlePumpPlace}
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
                                const styleMap: Record<AreaType, { color: string; fillOpacity: number; dashArray?: string }> = {
                                    building: { color: AREA_COLORS.building, fillOpacity: 1 },
                                    powerplant: { color: AREA_COLORS.powerplant, fillOpacity: 1 },
                                    river: { color: AREA_COLORS.river, fillOpacity: 0.3, dashArray: '5, 10' },
                                    field: { color: AREA_COLORS.field, fillOpacity: 0.3, dashArray: '1, 0' },
                                    custompolygon: { color: AREA_COLORS.custompolygon, fillOpacity: 0.4, dashArray: '2, 6' },
                                    pump: { color: AREA_COLORS.pump, fillOpacity: 1 },
                                    solarcell: { color: AREA_COLORS.solarcell, fillOpacity: 0.7 }
                                };

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
                    <div className="flex justify-end">
                        <button
                            onClick={handleNext}
                            disabled={layers.length === 0 || !selectedPlantCategory || !selectedPlant}
                            className="rounded bg-green-600 px-6 py-3 text-white transition-colors duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-700"
                        >
                            {isLoading ? 'Processing...' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
