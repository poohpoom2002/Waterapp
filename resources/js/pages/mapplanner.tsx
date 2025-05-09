import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, FeatureGroup, LayersControl } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

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

type AreaType = 'field' | 'river' | 'powerplant' | 'building';

// Constants
const DEFAULT_MAP_CENTER: [number, number] = [13.7563, 100.5018]; // Bangkok
const MAX_AREA = 100000; // 100,000 square meters (10 hectares)

const AREA_DESCRIPTIONS: Record<AreaType, string> = {
    field: 'Agricultural land for planting crops and vegetation.',
    river: 'Water body for irrigation and water management.',
    powerplant: 'Energy generation facility area.',
    building: 'Structure or facility area.'
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
    isDisabled: boolean;
    onClick: () => void;
}> = ({ type, isSelected, isDisabled, onClick }) => (
    <button
        onClick={onClick}
        className={`w-32 rounded px-4 py-2 text-white transition-colors duration-200 ${
            isSelected
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-700 hover:bg-gray-600'
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

// Main Component
export default function MapPlanner() {
    // State
    const [area, setArea] = useState<LatLng[]>([]);
    const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
    const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
    const [results, setResults] = useState<LatLng[]>([]);
    const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('Draw an area on the map first');
    const [showAllPoints, setShowAllPoints] = useState(false);
    const [selectedAreaTypes, setSelectedAreaTypes] = useState<AreaType[]>([]);
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

    useEffect(() => {
        // Check for pre-selected types in URL
        const urlParams = new URLSearchParams(window.location.search);
        const selectedTypes = urlParams.get('selected_types');
        
        if (selectedTypes) {
            const types = selectedTypes.split(',').map(type => type.trim() as AreaType);
            setSelectedAreaTypes(types);
            setStatus(`Selected types: ${types.join(', ')}`);
        }
    }, []);

    // Memoized values
    const displayedPoints = useMemo(() => {
        if (showAllPoints || !selectedPlant) return results;
        
        const totalPoints = results.length;
        const pointsPerRow = Math.ceil(Math.sqrt(totalPoints * selectedPlant.row_spacing / selectedPlant.plant_spacing));
        return results.filter((_, index) => Math.floor(index / pointsPerRow) % 3 === 0);
    }, [results, showAllPoints, selectedPlant]);

    // Utility functions
    const calculateArea = (points: LatLng[]): number => {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].lat * points[j].lng;
            area -= points[j].lat * points[i].lng;
        }
        return Math.abs(area) / 2;
    };

    // Event handlers
    const handleSubmit = async () => {
        if (area.length < 3) {
            setError('Please draw a polygon on the map first');
            return;
        }

        if (!selectedPlant) {
            setError('Please select a plant type');
            return;
        }

        const areaSize = calculateArea(area);
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
                    area,
                    plant_type_id: selectedPlant.id,
                    plant_spacing: selectedPlant.plant_spacing,
                    row_spacing: selectedPlant.row_spacing,
                    area_type: selectedAreaTypes,
                }
            );
            setResults(response.data.plant_locations);
            setStatus(`Successfully generated ${response.data.plant_locations.length} planting points for ${selectedAreaTypes.join(', ')}`);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError(error.response?.data?.message || 'Error generating points');
            } else {
                setError('An unexpected error occurred');
            }
            setStatus('Failed to generate planting points');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleAreaType = (type: AreaType) => {
        setSelectedAreaTypes(prev => {
            const newTypes = prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type];
            
            setStatus(newTypes.length === 0 
                ? 'Select area type(s) or draw an area on the map.'
                : `Selected ${newTypes.length} type(s): ${newTypes.join(', ')}`);
            
            return newTypes;
        });
    };

    const onCreated = (e: any) => {
        const layer = e.layer;
        const coordinates = layer.getLatLngs()[0].map((latLng: { lat: number; lng: number }) => ({
            lat: latLng.lat,
            lng: latLng.lng,
        }));
        setArea(coordinates);
        setError(null);
        setStatus(selectedAreaTypes.length > 0 
            ? `Area drawn. Selected types: ${selectedAreaTypes.join(', ')}`
            : 'Area drawn. Select area type(s) or continue.');
    };

    const onDeleted = () => {
        setArea([]);
        setResults([]);
        setError(null);
        setStatus(selectedAreaTypes.length > 0 
            ? `Selected types: ${selectedAreaTypes.join(', ')}`
            : 'Select area type(s) or draw an area on the map.');
    };

    const handleNext = () => {
        if (selectedAreaTypes.length === 0 || !area.length || !selectedPlant) return;

        const params = new URLSearchParams();
        params.append('areaType', selectedAreaTypes[0]);
        params.append('area', JSON.stringify(area));
        params.append('plantType', JSON.stringify(selectedPlant));

        window.location.href = `/generate-tree?${params.toString()}`;
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
                                        isDisabled={false}
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
                                        rectangle: false,
                                        circle: false,
                                        circlemarker: false,
                                        marker: false,
                                        polyline: false,
                                    }}
                                />
                            </FeatureGroup>
                        </MapContainer>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={handleNext}
                            disabled={!selectedPlant || area.length < 3 || selectedAreaTypes.length === 0}
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
