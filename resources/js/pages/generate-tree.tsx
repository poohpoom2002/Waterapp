import React, { useState, useMemo, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { MapContainer, TileLayer, CircleMarker, Polygon, useMap, FeatureGroup, LayersControl } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
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
    layers?: Array<{
        type: string;
        coordinates: LatLng[];
        isInitialMap?: boolean;
    }>;
};

// Constants
const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];

const AREA_COLORS: Record<string, string> = {
    river: '#3B82F6',    // Blue
    field: '#22C55E',    // Green
    powerplant: '#EF4444', // Red
    building: '#F59E0B',  // Yellow
    pump: '#1E40AF',      // Dark Blue
    custompolygon: '#4B5563', // Black Gray
    solarcell: '#FFD600', // Bright Yellow
};

// Components
const MapBounds = ({ positions }: { positions: LatLng[] }) => {
    const map = useMap();
    
    React.useEffect(() => {
        if (positions.length > 0) {
            const bounds = positions.reduce(
                (bounds, point) => bounds.extend([point.lat, point.lng]),
                L.latLngBounds([])
            );
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 22, animate: true });
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

const PointManagementControls = () => {
    const map = useMap();
    const featureGroupRef = React.useRef<L.FeatureGroup>(null);

    const handleAddPoints = () => {
        if (featureGroupRef.current) {
            map.fire('draw:drawstart');
        }
    };

    const handleDeletePoints = () => {
        if (featureGroupRef.current) {
            map.fire('draw:deletestart');
        }
    };

    const handleMovePoints = () => {
        if (featureGroupRef.current) {
            map.fire('draw:editstart');
        }
    };

    return (
        <div className="absolute top-4 left-[60px] z-[1000] flex gap-2 bg-white p-2 rounded-lg shadow-lg">
            <button
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                onClick={handleAddPoints}
            >
                Add Points
            </button>
            <button
                className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                onClick={handleDeletePoints}
            >
                Delete Points
            </button>
            <button
                className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                onClick={handleMovePoints}
            >
                Move Points
            </button>
        </div>
    );
};

// Helper Functions
const calculateAreaInRai = (coordinates: LatLng[]): number => {
    if (coordinates.length < 3) return 0;

    const toMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                 Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                 Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    let area = 0;
    for (let i = 0; i < coordinates.length; i++) {
        const j = (i + 1) % coordinates.length;
        area += coordinates[i].lat * coordinates[j].lng;
        area -= coordinates[j].lat * coordinates[i].lng;
    }
    area = Math.abs(area) / 2;

    const areaInSquareMeters = area * 111000 * 111000 * Math.cos(coordinates[0].lat * Math.PI / 180);
    return areaInSquareMeters / 1600;
};

// Main Component
export default function GenerateTree({ areaType, area, plantType, layers = [] }: Props) {
    const [plantLocations, setPlantLocations] = useState<LatLng[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPlantLayoutGenerated, setIsPlantLayoutGenerated] = useState(false);

    const areaInRai = useMemo(() => calculateAreaInRai(area), [area]);
    const processedPlantType = useMemo(() => ({
        ...plantType,
        plant_spacing: Number(plantType.plant_spacing),
        row_spacing: Number(plantType.row_spacing),
        water_needed: Number(plantType.water_needed)
    }), [plantType]);

    const mapCenter = useMemo(() => {
        if (area.length === 0) return DEFAULT_CENTER;
        const center = area.reduce(
            (acc, point) => [acc[0] + point.lat, acc[1] + point.lng],
            [0, 0]
        );
        return [center[0] / area.length, center[1] / area.length] as [number, number];
    }, [area]);

    // Add useEffect to automatically generate tree points
    useEffect(() => {
        const generatePoints = async () => {
            if (area.length > 0 && !isPlantLayoutGenerated) {
                await handleGenerate();
            }
        };
        generatePoints();
    }, [area, processedPlantType, layers]); // Dependencies that should trigger regeneration

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const areaTypes = areaType ? areaType.split(',').map(type => type.trim()) : ['default'];
            const { data } = await axios.post<{ plant_locations: LatLng[] }>(
                '/api/generate-planting-points',
                {
                    area,
                    plant_type_id: processedPlantType.id,
                    plant_spacing: processedPlantType.plant_spacing,
                    row_spacing: processedPlantType.row_spacing,
                    area_types: areaTypes,
                    layers
                }
            );
            
            if (!data?.plant_locations) {
                throw new Error('Invalid response format from server');
            }

            setPlantLocations(data.plant_locations);
            setIsPlantLayoutGenerated(true);
        } catch (error) {
            console.error('Error details:', error);
            setError(axios.isAxiosError(error) 
                ? error.response?.data?.message || error.message || 'Error generating points'
                : 'An unexpected error occurred'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleGeneratePipeLayout = async () => {
        setIsLoading(true);
        setError(null);

        try {
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
                            <p><span className="font-medium">Plant Category:</span> {processedPlantType.name}</p>
                            <p><span className="font-medium">Plant Selection:</span> {processedPlantType.type}</p>
                        </InfoItem>
                        <InfoItem title="Spacing Requirements">
                            <p><span className="font-medium">Plant Spacing:</span> {processedPlantType.plant_spacing.toFixed(2)}m</p>
                            <p><span className="font-medium">Row Spacing:</span> {processedPlantType.row_spacing.toFixed(2)}m</p>
                        </InfoItem>
                        <InfoItem title="Water Requirements">
                            <p><span className="font-medium">Daily Water Need:</span> {processedPlantType.water_needed.toFixed(2)}L/day</p>
                        </InfoItem>
                    </InfoSection>

                    <InfoSection title="Area Information">
                        <InfoItem title="Area Size">
                            <p>{areaInRai.toFixed(2)} rai</p>
                        </InfoItem>
                        <InfoItem title="Number of Plants">
                            <p>{plantLocations.length} plants</p>
                        </InfoItem>
                        <InfoItem title="Total Water Need">
                            <p>{(plantLocations.length * processedPlantType.water_needed).toFixed(2)} L/day</p>
                        </InfoItem>
                    </InfoSection>
                </div>

                <div className="space-y-4 lg:col-span-3">
                    <div className="h-[900px] w-full overflow-hidden rounded-lg border border-gray-700">
                        <MapContainer
                            center={mapCenter}
                            zoom={18}
                            maxZoom={19}
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
                            <MapBounds positions={area} />
                            
                            <FeatureGroup>
                                <EditControl
                                    position="topright"
                                    onCreated={(e) => {
                                        const layer = e.layer;
                                        if (layer instanceof L.Marker) {
                                            const latlng = layer.getLatLng();
                                            console.log('New point added:', { lat: latlng.lat, lng: latlng.lng });
                                        }
                                    }}
                                    onDeleted={() => {
                                        console.log('Points deleted');
                                    }}
                                    draw={{
                                        rectangle: false,
                                        circle: false,
                                        circlemarker: false,
                                        marker: false,
                                        polyline: false,
                                        polygon: false
                                    }}
                                    edit={{
                                        edit: {
                                            selectedPathOptions: {
                                                dashArray: '10, 10'
                                            }
                                        },
                                        remove: true
                                    }}
                                />
                            </FeatureGroup>
                            <PointManagementControls />
                            
                            {layers.map((layer, index) => {
                                const styleMap: Record<string, { color: string; fillOpacity: number; dashArray?: string }> = {
                                    river: { color: AREA_COLORS.river, fillOpacity: 0.5 },
                                    field: { color: AREA_COLORS.field, fillOpacity: 0.5 },
                                    building: { color: AREA_COLORS.building, fillOpacity: 0.5 },
                                    powerplant: { color: AREA_COLORS.powerplant, fillOpacity: 0.5 },
                                    solarcell: { color: AREA_COLORS.solarcell, fillOpacity: 0.5 },
                                    custompolygon: { color: AREA_COLORS.custompolygon, fillOpacity: 0.5 }
                                };

                                if (layer.type === 'pump') {
                                    return (
                                        <CircleMarker
                                            key={`${layer.type}-${index}`}
                                            center={[layer.coordinates[0].lat, layer.coordinates[0].lng]}
                                            radius={5}
                                            pathOptions={{
                                                color: AREA_COLORS.pump,
                                                fillColor: AREA_COLORS.pump,
                                                fillOpacity: 1,
                                                weight: 2
                                            }}
                                        />
                                    );
                                }

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

                            {plantLocations.map((location, index) => (
                                <CircleMarker
                                    key={`plant-${index}`}
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
                    <div className="grid grid-cols-1 gap-4">
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
