// resources/js/pages/home-garden-summary.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { router } from '@inertiajs/react';
import {
    MapContainer,
    TileLayer,
    Polygon,
    useMap,
    LayersControl,
    Polyline,
    Circle,
    Marker,
    Tooltip,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getSprinklerLayoutData, SprinklerLayoutData } from '../utils/sprinklerLayoutData';

// Custom Icons (Copied from generate-sprinkler.tsx for consistency)
const createSprinklerIcon = () =>
    L.divIcon({
        html: `<div class="flex items-center justify-center w-5 h-5 bg-blue-500 border-2 border-white rounded-full shadow-lg"><svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 01-1.414 1.414L12 6.414l-2.293 2.293a1 1 0 01-1.414-1.414L10 5m0 14l2.293-2.293a1 1 0 011.414 1.414L12 17.586l2.293-2.293a1 1 0 011.414 1.414L14 19m-4-5a3 3 0 116 0 3 3 0 01-6 0z"></path></svg></div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });
const createWaterSourceIcon = (type: 'tap' | 'pump') =>
    L.divIcon({
        html: `<div class="flex items-center justify-center w-8 h-8 ${type === 'pump' ? 'bg-red-500' : 'bg-green-500'} border-2 border-white rounded-full shadow-xl text-lg">${type === 'pump' ? '⚡' : '🚰'}</div>`,
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
    });

// Helper Components
const MapBounds: React.FC<{ positions: { lat: number; lng: number }[] }> = ({ positions }) => {
    const map = useMap();
    useEffect(() => {
        if (positions.length > 0) {
            const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 20, animate: true });
        }
    }, [positions, map]);
    return null;
};

// Helper functions
const formatDistance = (meters: number): string => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} กม.`;
    return `${meters.toFixed(1)} ม.`;
};
const calculateAreaInSquareMeters = (coordinates: { lat: number; lng: number }[]): number => {
    if (coordinates.length < 3) return 0;
    let area = 0;
    const R = 6378137;
    const polygon = coordinates.map((c) => {
        const x = (R * c.lng * Math.PI) / 180;
        const y = R * Math.log(Math.tan(Math.PI / 4 + (c.lat * Math.PI) / 180 / 2));
        return { x, y };
    });
    for (let i = 0; i < polygon.length; i++) {
        const j = (i + 1) % polygon.length;
        area += polygon[i].x * polygon[j].y;
        area -= polygon[j].x * polygon[i].y;
    }
    return Math.abs(area / 2);
};

export default function HomeGardenSummary() {
    const [layoutData, setLayoutData] = useState<SprinklerLayoutData | null>(null);

    useEffect(() => {
        const data = getSprinklerLayoutData();
        if (data) {
            setLayoutData(data);
        } else {
            router.visit('/home-garden/planner');
        }
    }, []);

    const areaInSquareMeters = useMemo(
        () => (layoutData ? calculateAreaInSquareMeters(layoutData.area) : 0),
        [layoutData]
    );
    const areaInRai = useMemo(() => areaInSquareMeters / 1600, [areaInSquareMeters]);

    if (!layoutData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
                <p>กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    const { area, sprinklerPositions, pipeConnections, waterSource, sprinklerInfo, statistics } =
        layoutData;

    return (
        <div className="min-h-screen bg-gray-900 p-6 text-white">
            <div className="mx-auto max-w-screen-xl">
                <h1 className="mb-4 text-3xl font-bold">📄 สรุปผลการออกแบบระบบ Home Garden</h1>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    {/* Left Panel for Summary */}
                    <div className="space-y-6 lg:col-span-1">
                        <div className="rounded-lg bg-gray-800 p-4">
                            <h3 className="mb-3 text-lg font-semibold">ข้อมูลสรุป</h3>
                            <div className="space-y-2 text-sm text-gray-300">
                                <div className="flex justify-between">
                                    <span>พื้นที่ (ตร.ม.):</span>
                                    <span className="font-medium text-white">
                                        {areaInSquareMeters.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>พื้นที่ (ไร่):</span>
                                    <span className="text-lg font-bold text-green-400">
                                        {areaInRai.toFixed(3)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>รัศมี Sprinkler:</span>
                                    <span className="font-medium text-white">
                                        {sprinklerInfo.radius} ม.
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>จำนวน Sprinkler:</span>
                                    <span className="text-xl font-bold text-blue-400">
                                        {statistics.totalSprinklers}
                                    </span>
                                </div>
                                <hr className="my-2 border-gray-700" />
                                <div className="flex justify-between">
                                    <span>ความยาวท่อรวม:</span>
                                    <span className="font-medium text-white">
                                        {formatDistance(statistics.totalPipeLength)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ท่อยาวที่สุด:</span>
                                    <span className="font-medium text-white">
                                        {formatDistance(statistics.longestPipe)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => router.get('/home-garden/planner')}
                            className="w-full rounded bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-700"
                        >
                            ออกแบบใหม่
                        </button>
                    </div>

                    {/* Right Panel for Map */}
                    <div className="lg:col-span-3">
                        <div className="h-[800px] w-full overflow-hidden rounded-lg border border-gray-700">
                            {/* **[FIXED]** Added maxZoom property to allow deeper zooming */}
                            <MapContainer
                                center={[13.75, 100.5]}
                                zoom={16}
                                maxZoom={22}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <LayersControl position="topright">
                                    <LayersControl.BaseLayer checked name="ภาพถ่ายดาวเทียม">
                                        <TileLayer
                                            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                                            attribution="Google Maps"
                                        />
                                    </LayersControl.BaseLayer>
                                    <LayersControl.BaseLayer name="แผนที่ถนน">
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution="OpenStreetMap"
                                        />
                                    </LayersControl.BaseLayer>
                                </LayersControl>
                                <MapBounds positions={area} />
                                <Polygon
                                    positions={area.map((c) => [c.lat, c.lng])}
                                    pathOptions={{
                                        color: '#22C55E',
                                        fillColor: '#22C55E',
                                        fillOpacity: 0.2,
                                        weight: 2,
                                    }}
                                />
                                {sprinklerPositions.map((sprinkler) => (
                                    <React.Fragment key={sprinkler.id}>
                                        <Marker
                                            position={[sprinkler.lat, sprinkler.lng]}
                                            icon={createSprinklerIcon()}
                                        />
                                        <Circle
                                            center={[sprinkler.lat, sprinkler.lng]}
                                            radius={sprinklerInfo.radius}
                                            pathOptions={{
                                                color: '#3B82F6',
                                                fillColor: '#3B82F6',
                                                fillOpacity: 0.1,
                                                weight: 1,
                                            }}
                                        />
                                    </React.Fragment>
                                ))}
                                {waterSource && (
                                    <Marker
                                        position={[waterSource.lat, waterSource.lng]}
                                        icon={createWaterSourceIcon(waterSource.type)}
                                    />
                                )}
                                {pipeConnections.map((pipe) => (
                                    <Polyline
                                        key={pipe.id}
                                        positions={[
                                            [pipe.start.lat, pipe.start.lng],
                                            [pipe.end.lat, pipe.end.lng],
                                        ]}
                                        pathOptions={{ color: '#10B981', weight: 4, opacity: 0.8 }}
                                    >
                                        <Tooltip sticky>
                                            ความยาว: {formatDistance(pipe.length)}
                                        </Tooltip>
                                    </Polyline>
                                ))}
                            </MapContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
