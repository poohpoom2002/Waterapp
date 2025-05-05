import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios, { AxiosError } from 'axios';
import { MapContainer, TileLayer, CircleMarker, FeatureGroup, LayersControl } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

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
    description: string;
};

const LoadingSpinner = () => (
    <div className="flex items-center justify-center space-x-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        <span className="text-sm text-blue-500">Processing...</span>
    </div>
);

export default function MapPlanner() {
    const [area, setArea] = useState<LatLng[]>([]);
    const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
    const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
    const [results, setResults] = useState<LatLng[]>([]);
    const [mapCenter, setMapCenter] = useState<[number, number]>([13.7563, 100.5018]); // Default to Bangkok
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('Ready to draw your field');
    const [showAllPoints, setShowAllPoints] = useState(false);
    const featureGroupRef = useRef<any>(null);

    // Calculate displayed points based on showAllPoints state
    const displayedPoints = useMemo(() => {
        if (showAllPoints) return results;
        if (!selectedPlant) return results;
        
        // Calculate grid parameters
        const totalPoints = results.length;
        const pointsPerRow = Math.ceil(Math.sqrt(totalPoints * selectedPlant.row_spacing / selectedPlant.plant_spacing));
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
            setError(`Area is too large. Maximum allowed area is ${maxArea/10000} hectares`);
            return;
        }

        setIsLoading(true);
        setError(null);
        setStatus('Calculating optimal plant positions...');

        try {
            const response = await axios.post<{ plant_locations: LatLng[] }>(
                '/api/generate-planting-points',
                {
                    area,
                    plant_type_id: selectedPlant.id,
                    plant_spacing: selectedPlant.plant_spacing,
                    row_spacing: selectedPlant.row_spacing,
                }
            );
            setResults(response.data.plant_locations);
            setStatus(`Successfully generated ${response.data.plant_locations.length} planting points`);
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

    const onCreated = (e: any) => {
        const layer = e.layer;
        const coordinates = layer.getLatLngs()[0].map((latLng: { lat: number; lng: number }) => ({
            lat: latLng.lat,
            lng: latLng.lng,
        }));
        setArea(coordinates);
        setError(null);
        setStatus('Field drawn. Select a plant type and click "Generate Points"');
    };

    const onDeleted = () => {
        setArea([]);
        setResults([]);
        setError(null);
        setStatus('Ready to draw your field');
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
                {results.length > 0 && (
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-blue-400">
                            {!showAllPoints ? `Showing ${displayedPoints.length} of ` : ''}{results.length} plants
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
                <div className="mb-4 rounded bg-red-500/10 p-3 text-sm text-red-400">
                    {error}
                </div>
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
                                        setStatus(`Selected ${plant.name}. Draw your field or click "Generate Points"`);
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
                    </div>
                </div>

                <div className="h-[500px] overflow-hidden rounded-lg border border-gray-700">
                    <MapContainer
                        center={mapCenter}
                        zoom={13}
                        maxZoom={25}
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
                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
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

                        {displayedPoints.map((point, index) => (
                            <CircleMarker
                                key={index}
                                center={[point.lat, point.lng]}
                                radius={0.5}
                                pathOptions={{
                                    color: 'red',
                                    fillColor: 'red',
                                    fillOpacity: 1,
                                }}
                            />
                        ))}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
}
