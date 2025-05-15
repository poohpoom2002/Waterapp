import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { MapContainer, TileLayer, CircleMarker, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import L from 'leaflet';

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

const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];

const MapBounds = ({ positions }: { positions: LatLng[] }) => {
    const map = useMap();
    
    useEffect(() => {
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

const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-lg bg-gray-800 p-4">
        <h3 className="mb-2 text-lg font-medium text-white">{title}</h3>
        <div className="space-y-2 text-sm text-gray-300">{children}</div>
    </div>
);

export default function GenerateTree({ areaType, area, plantType }: Props) {
    const [plantLocations, setPlantLocations] = useState<LatLng[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            const { data } = await axios.post<{ plant_locations: LatLng[] }>(
                '/api/generate-planting-points',
                {
                    area,
                    plant_type_id: plantType.id,
                    plant_spacing: plantType.plant_spacing,
                    row_spacing: plantType.row_spacing,
                    area_types: areaType.split(',').map(type => type.trim())
                }
            );
            setPlantLocations(data.plant_locations);
        } catch (error) {
            setError(axios.isAxiosError(error) 
                ? error.response?.data?.message || 'Error generating points'
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-4">
                    <InfoCard title={plantType.name}>
                        <p><span className="font-medium">Type:</span> {plantType.type}</p>
                        <p><span className="font-medium">Plant Spacing:</span> {plantType.plant_spacing}m</p>
                        <p><span className="font-medium">Row Spacing:</span> {plantType.row_spacing}m</p>
                        <p><span className="font-medium">Water Needed:</span> {plantType.water_needed}L/day</p>
                    </InfoCard>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full rounded bg-green-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-700"
                    >
                        {isLoading ? 'Generating...' : 'Generate Plant Layout'}
                    </button>
                </div>

                <div className="h-[600px] w-full overflow-hidden rounded-lg border border-gray-700">
                    <MapContainer
                        center={mapCenter}
                        zoom={17}
                        maxZoom={19}
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
