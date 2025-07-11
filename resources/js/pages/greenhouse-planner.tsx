import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
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
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Footer from '../components/Footer';

type LatLng = {
    lat: number;
    lng: number;
    elevation?: number;
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
    growth_stage?: string;
    climate_requirements?: string;
};

type SprinklerType = {
    id: number;
    name: string;
    water_flow: number;
    min_radius: number;
    max_radius: number;
    description: string;
    mist_system?: boolean;
    fog_system?: boolean;
};

type PipeLayout = {
    start: LatLng;
    end: LatLng;
};

const LoadingSpinner = () => (
    <div className="flex items-center justify-center space-x-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        <span className="text-sm text-blue-500">Processing...</span>
    </div>
);

export default function GreenhousePlanner() {
    const { t } = useLanguage();
    const [area, setArea] = useState<LatLng[]>([]);
    const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
    const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
    const [results, setResults] = useState<LatLng[]>([]);
    const [mapCenter, setMapCenter] = useState<[number, number]>([13.7563, 100.5018]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('Ready to draw your greenhouse area');
    const [sprinklers, setSprinklers] = useState<SprinklerType[]>([]);
    const [selectedSprinkler, setSelectedSprinkler] = useState<SprinklerType | null>(null);
    const [pipeLayout, setPipeLayout] = useState<PipeLayout[]>([]);
    const [sprinklerPositions, setSprinklerPositions] = useState<LatLng[]>([]);
    const [exclusionAreas, setExclusionAreas] = useState<LatLng[][]>([]);
    const [climateControl, setClimateControl] = useState({
        temperature: 25,
        humidity: 70,
        ventilation: true,
        heating: false,
        cooling: false,
    });
    const [environmentalFactors, setEnvironmentalFactors] = useState({
        light_intensity: 'medium',
        co2_level: 400,
        air_circulation: true,
    });

    useEffect(() => {
        // Fetch plant types when component mounts
        const fetchPlantTypes = async () => {
            try {
                const response = await fetch('/api/plant-types');
                const data = await response.json();
                setPlantTypes(data);
            } catch (error) {
                console.error('Error fetching plant types:', error);
            }
        };
        fetchPlantTypes();
    }, []);

    useEffect(() => {
        // Fetch sprinklers when component mounts
        const fetchSprinklers = async () => {
            try {
                const response = await fetch('/api/sprinklers');
                const data = await response.json();
                setSprinklers(data);
            } catch (error) {
                console.error('Error fetching sprinklers:', error);
            }
        };
        fetchSprinklers();
    }, []);

    const calculateArea = (points: LatLng[]): number => {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].lat * points[j].lng;
            area -= points[j].lat * points[i].lng;
        }
        return Math.abs(area) / 2;
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

        const areaSize = calculateArea(area);
        const maxArea = 50000; // 50,000 square meters (5 hectares) for greenhouse

        if (areaSize > maxArea) {
            setError(`Area is too large. Maximum allowed area is ${maxArea / 10000} hectares`);
            return;
        }

        setIsLoading(true);
        setError(null);
        setStatus('Calculating optimal plant positions for greenhouse environment...');

        try {
            const response = await fetch('/api/generate-planting-points', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    area,
                    exclusion_areas: exclusionAreas,
                    plant_type_id: selectedPlant.id,
                    plant_spacing: selectedPlant.plant_spacing,
                    row_spacing: selectedPlant.row_spacing,
                    environment: 'greenhouse',
                    climate_control: climateControl,
                    environmental_factors: environmentalFactors,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setResults(data.plant_locations);
                setStatus(`Successfully generated ${data.plant_locations.length} planting points for greenhouse`);
            } else {
                setError(data.message || 'Error generating points');
            }
        } catch (error) {
            setError('An unexpected error occurred');
            console.error('Error generating points:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const calculatePipeLayout = async () => {
        if (!selectedSprinkler || results.length === 0) return;

        try {
            const response = await fetch('/api/calculate-pipe-layout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    area,
                    plant_locations: results,
                    sprinkler_id: selectedSprinkler.id,
                    plant_spacing: selectedPlant?.plant_spacing,
                    row_spacing: selectedPlant?.row_spacing,
                    environment: 'greenhouse',
                    climate_control: climateControl,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setSprinklerPositions(data.sprinkler_positions);
                setPipeLayout(data.pipe_layout);
                setStatus('Greenhouse pipe layout calculated successfully');
            } else {
                setError(data.message || 'Error calculating pipe layout');
            }
        } catch (error) {
            setError('An unexpected error occurred');
            console.error('Error calculating pipe layout:', error);
        }
    };

    const onCreated = (e: any) => {
        const layer = e.layer;
        const coordinates = layer.getLatLngs()[0].map((latLng: { lat: number; lng: number }) => ({
            lat: latLng.lat,
            lng: latLng.lng,
        }));

        if (area.length === 0) {
            setArea(coordinates);
            setStatus('Greenhouse area drawn.');
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
        setStatus('Ready to draw your greenhouse area');
    };

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">🌱 Greenhouse Irrigation Planner</h1>
                    <p className="text-gray-400">
                        Design specialized irrigation systems for controlled environment agriculture
                    </p>
                </div>
                <LanguageSwitcher />
            </div>

            <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-800 p-4">
                <div className="flex items-center space-x-2">
                    {isLoading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="h-4 w-4 rounded-full bg-green-500"></div>
                    )}
                    <span className="text-sm text-gray-300">{status}</span>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                <div className="space-y-6 lg:col-span-1">
                    {/* Plant Selection */}
                    <div className="rounded-lg bg-gray-800 p-4">
                        <h3 className="mb-3 text-lg font-semibold text-white">🌿 Plant Selection</h3>
                        <select
                            className="w-full rounded border border-gray-700 bg-gray-700 p-2 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            value={selectedPlant?.id || ''}
                            onChange={(e) => {
                                const plant = plantTypes.find((p) => p.id === Number(e.target.value));
                                setSelectedPlant(plant || null);
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

                    {/* Climate Control */}
                    <div className="rounded-lg bg-gray-800 p-4">
                        <h3 className="mb-3 text-lg font-semibold text-white">🌡️ Climate Control</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Temperature (°C)</label>
                                <input
                                    type="range"
                                    min="15"
                                    max="35"
                                    value={climateControl.temperature}
                                    onChange={(e) =>
                                        setClimateControl((prev) => ({ ...prev, temperature: Number(e.target.value) }))
                                    }
                                    className="w-full"
                                />
                                <span className="text-sm text-gray-400">{climateControl.temperature}°C</span>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Humidity (%)</label>
                                <input
                                    type="range"
                                    min="40"
                                    max="90"
                                    value={climateControl.humidity}
                                    onChange={(e) =>
                                        setClimateControl((prev) => ({ ...prev, humidity: Number(e.target.value) }))
                                    }
                                    className="w-full"
                                />
                                <span className="text-sm text-gray-400">{climateControl.humidity}%</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={climateControl.ventilation}
                                    onChange={(e) =>
                                        setClimateControl((prev) => ({ ...prev, ventilation: e.target.checked }))
                                    }
                                    className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                                />
                                <label className="text-sm text-gray-300">Ventilation System</label>
                            </div>
                        </div>
                    </div>

                    {/* Environmental Factors */}
                    <div className="rounded-lg bg-gray-800 p-4">
                        <h3 className="mb-3 text-lg font-semibold text-white">🌍 Environmental Factors</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Light Intensity</label>
                                <select
                                    value={environmentalFactors.light_intensity}
                                    onChange={(e) =>
                                        setEnvironmentalFactors((prev) => ({ ...prev, light_intensity: e.target.value }))
                                    }
                                    className="w-full rounded border border-gray-700 bg-gray-700 p-2 text-white"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">CO₂ Level (ppm)</label>
                                <input
                                    type="number"
                                    value={environmentalFactors.co2_level}
                                    onChange={(e) =>
                                        setEnvironmentalFactors((prev) => ({ ...prev, co2_level: Number(e.target.value) }))
                                    }
                                    className="w-full rounded border border-gray-700 bg-gray-700 p-2 text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sprinkler Selection */}
                    <div className="rounded-lg bg-gray-800 p-4">
                        <h3 className="mb-3 text-lg font-semibold text-white">💧 Irrigation System</h3>
                        <select
                            className="w-full rounded border border-gray-700 bg-gray-700 p-2 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            value={selectedSprinkler?.id || ''}
                            onChange={(e) => {
                                const sprinkler = sprinklers.find((s) => s.id === Number(e.target.value));
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

                    <button
                        onClick={handleSubmit}
                        className="w-full rounded bg-green-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-700"
                        disabled={area.length < 3 || !selectedPlant || isLoading}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                <span>Generating Points...</span>
                            </div>
                        ) : (
                            'Generate Greenhouse Layout'
                        )}
                    </button>

                    {results.length > 0 && selectedSprinkler && (
                        <button
                            onClick={calculatePipeLayout}
                            className="w-full rounded bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700"
                        >
                            Calculate Pipe Layout
                        </button>
                    )}
                </div>

                <div className="lg:col-span-3">
                    <div className="h-[83vh] max-h-[83vh] w-full overflow-hidden rounded-lg border border-gray-700">
                        <MapContainer
                            center={mapCenter}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <LayersControl position="topright">
                                <LayersControl.BaseLayer checked name="Street Map">
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                </LayersControl.BaseLayer>
                                <LayersControl.BaseLayer name="Satellite">
                                    <TileLayer
                                        url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                                        attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                                    />
                                </LayersControl.BaseLayer>
                            </LayersControl>

                            <FeatureGroup>
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

                            {/* Draw exclusion areas */}
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

                            {/* Draw plant points */}
                            {results.map((point: LatLng, index: number) => (
                                <CircleMarker
                                    key={`point-${index}`}
                                    center={[point.lat, point.lng]}
                                    radius={2}
                                    pathOptions={{
                                        color: 'green',
                                        fillColor: 'green',
                                        fillOpacity: 0.7,
                                    }}
                                />
                            ))}
                        </MapContainer>
                    </div>
                </div>
            </div>
            {/* Footer */}
            <Footer />
        </div>
    );
} 