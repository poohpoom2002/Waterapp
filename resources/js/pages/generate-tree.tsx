import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { MapContainer, TileLayer, CircleMarker, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
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
};

type Props = {
    areaType: string;
    area: LatLng[];
    plantType: PlantType;
};

// Constants
const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];

// Components
const MapBounds = ({ positions }: { positions: LatLng[] }) => {
    const map = useMap();
    
    React.useEffect(() => {
        if (positions.length > 0) {
            const bounds = positions.reduce(
                (bounds, point) => bounds.extend([point.lat, point.lng]),
                L.latLngBounds([])
            );
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 19, animate: true });
        }
    }, [positions, map]);

    return null;
};

const InfoSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="h-[440px] rounded-lg bg-gray-800 p-4">
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

// Main Component
export default function GenerateTree({ areaType, area, plantType }: Props) {
    const [plantLocations, setPlantLocations] = useState<LatLng[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPlantLayoutGenerated, setIsPlantLayoutGenerated] = useState(false);

    const mapCenter = React.useMemo(() => {
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
            const areaTypes = areaType ? areaType.split(',').map(type => type.trim()) : ['default'];

            const { data } = await axios.post<{ plant_locations: LatLng[] }>(
                '/api/generate-planting-points',
                {
                    area,
                    plant_type_id: plantType.id,
                    plant_spacing: plantType.plant_spacing,
                    row_spacing: plantType.row_spacing,
                    area_types: areaTypes
                }
            );
            
            if (!data?.plant_locations) {
                throw new Error('Invalid response format from server');
            }

            setPlantLocations(data.plant_locations);
            setIsPlantLayoutGenerated(true);
        } catch (error) {
            console.error('Error details:', error);
            
            if (axios.isAxiosError(error)) {
                const errorMessage = error.response?.data?.message 
                    || error.response?.data?.error 
                    || error.message 
                    || 'Error generating points';
                setError(`Error: ${errorMessage}`);
            } else if (error instanceof Error) {
                setError(`Error: ${error.message}`);
            } else {
                setError('An unexpected error occurred while generating plant layout');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGeneratePipeLayout = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // TODO: Implement pipe layout generation API call
            console.log('Generating pipe layout...');
        } catch (error) {
            setError(axios.isAxiosError(error) 
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
                            <p><span className="font-medium">Plant Category:</span> {plantType.name}</p>
                            <p><span className="font-medium">Plant Selection:</span> {plantType.type}</p>
                        </InfoItem>
                        <InfoItem title="Spacing Requirements">
                            <p><span className="font-medium">Plant Spacing:</span> {plantType.plant_spacing}m</p>
                            <p><span className="font-medium">Row Spacing:</span> {plantType.row_spacing}m</p>
                        </InfoItem>
                        <InfoItem title="Water Requirements">
                            <p><span className="font-medium">Daily Water Need:</span> {plantType.water_needed}L/day</p>
                        </InfoItem>
                    </InfoSection>

                    <InfoSection title="Area Information">
                        <InfoItem title="Area Size">
                            <p>To be calculated.</p>
                        </InfoItem>
                        <InfoItem title="Number of Plants">
                            <p>To be calculated.</p>
                        </InfoItem>
                        <InfoItem title="Total Water Need">
                            <p>To be calculated.</p>
                        </InfoItem>
                    </InfoSection>
                </div>

                <div className="space-y-4 lg:col-span-3">
                    <div className="h-[900px] w-full overflow-hidden rounded-lg border border-gray-700">
                        <MapContainer
                            center={mapCenter}
                            zoom={17}
                            maxZoom={18}
                            minZoom={3}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={true}
                            scrollWheelZoom={true}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            <MapBounds positions={area} />
                            <Polygon
                                positions={area}
                                pathOptions={{
                                    color: 'blue',
                                    fillColor: 'blue',
                                    fillOpacity: 0.2,
                                    weight: 2
                                }}
                            />
                            {plantLocations.map((location, index) => (
                                <CircleMarker
                                    key={index}
                                    center={[location.lat, location.lng]}
                                    radius={3}
                                    pathOptions={{
                                        color: 'green',
                                        fillColor: 'green',
                                        fillOpacity: 0.7,
                                    }}
                                />
                            ))}
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
