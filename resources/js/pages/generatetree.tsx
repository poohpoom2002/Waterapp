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

type AreaType = 'field' | 'river' | 'powerplant' | 'building';

type Props = {
    areaType: string;
    area: LatLng[];
    plantType: PlantType;
};

const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];

const AREA_DESCRIPTIONS: Record<AreaType, string> = {
    field: 'Agricultural land for planting crops and vegetation.',
    river: 'Water body for irrigation and water management.',
    powerplant: 'Energy generation facility area.',
    building: 'Structure or facility area.'
};

const MapBounds = ({ positions }: { positions: LatLng[] }) => {
    const map = useMap();
    
    useEffect(() => {
        if (positions.length > 0) {
            const bounds = positions.reduce(
                (bounds, point) => bounds.extend([point.lat, point.lng]),
                L.latLngBounds([])
            );
            map.fitBounds(bounds, { 
                padding: [50, 50],
                maxZoom: 19,
                animate: true
            });
        }
    }, [positions, map]);

    return null;
};

export default function GenerateTree({ areaType, area, plantType }: Props) {
    const [plantLocations, setPlantLocations] = useState<LatLng[]>([]);
    const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Parse the area type string and ensure it's an array
    const selectedAreaTypes = React.useMemo(() => {
        if (!areaType) return [];
        return areaType.split(',').map(type => type.trim() as AreaType);
    }, [areaType]);

    useEffect(() => {
        if (area.length > 0) {
            const center = area.reduce(
                (acc, point) => [acc[0] + point.lat, acc[1] + point.lng],
                [0, 0]
            );
            setMapCenter([center[0] / area.length, center[1] / area.length]);
        }
    }, [area]);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.post<{ plant_locations: LatLng[] }>(
                '/api/generate-planting-points',
                {
                    area,
                    plant_type_id: plantType.id,
                    plant_spacing: plantType.plant_spacing,
                    row_spacing: plantType.row_spacing,
                    area_types: selectedAreaTypes
                }
            );
            setPlantLocations(response.data.plant_locations);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError(error.response?.data?.message || 'Error generating points');
            } else {
                setError('An unexpected error occurred');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAreaTypeClick = (type: AreaType) => {
        // Keep all selected types when navigating back
        const currentTypes = selectedAreaTypes.filter(t => t !== type);
        router.get('/planner', {
            selected_types: currentTypes.join(',')
        });
    };

    const renderAreaConfig = () => (
        <div className="rounded-lg bg-gray-800 p-4">
            <h3 className="mb-2 text-lg font-medium text-white">Area Configuration</h3>
            <div className="space-y-2 text-sm text-gray-300">
                <p>
                    <span className="font-medium">Selected {selectedAreaTypes.length} type(s): </span>
                    {selectedAreaTypes.map((type, index) => (
                        <React.Fragment key={type}>
                            <button
                                onClick={() => handleAreaTypeClick(type)}
                                className="text-blue-400 hover:text-blue-300 hover:underline"
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1).replace('powerplant', 'Power Plant')}
                            </button>
                            {index < selectedAreaTypes.length - 1 ? ', ' : ''}
                        </React.Fragment>
                    ))}
                </p>
                <ul className="ml-4 list-disc space-y-1">
                    {selectedAreaTypes.map((type) => (
                        <li key={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1).replace('powerplant', 'Power Plant')} - {AREA_DESCRIPTIONS[type]}
                        </li>
                    ))}
                </ul>
                <p className="mt-2"><span className="font-medium">Number of Points:</span> {area.length}</p>
            </div>
        </div>
    );

    const renderPlantInfo = () => (
        <div className="rounded-lg bg-gray-800 p-4">
            <h3 className="mb-2 text-lg font-medium text-white">{plantType.name}</h3>
            <div className="space-y-2 text-sm text-gray-300">
                <p><span className="font-medium">Type:</span> {plantType.type}</p>
                <p><span className="font-medium">Plant Spacing:</span> {plantType.plant_spacing}m</p>
                <p><span className="font-medium">Row Spacing:</span> {plantType.row_spacing}m</p>
                <p><span className="font-medium">Water Needed:</span> {plantType.water_needed}L/day</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <h1 className="mb-4 text-xl font-bold text-white">Plant Layout Generator</h1>
            <p className="mb-4 text-sm text-gray-400">
                Selected {selectedAreaTypes.length} type(s):{' '}
                {selectedAreaTypes.map((type, index) => (
                    <React.Fragment key={type}>
                        <button
                            onClick={() => handleAreaTypeClick(type)}
                            className="text-blue-400 hover:text-blue-300 hover:underline"
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1).replace('powerplant', 'Power Plant')}
                        </button>
                        {index < selectedAreaTypes.length - 1 ? ', ' : ''}
                    </React.Fragment>
                ))}
            </p>

            {error && (
                <div className="mb-4 rounded bg-red-500/10 p-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-4">
                    {renderAreaConfig()}
                    {renderPlantInfo()}

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
                            maxZoom={19}
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

            <div className="mt-6 flex justify-between">
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
