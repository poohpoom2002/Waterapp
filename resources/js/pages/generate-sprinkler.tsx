// resources/js/pages/generate-sprinkler.tsx
import React, { useState, useMemo, useEffect } from 'react';
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
import axios from 'axios';
import L, { LeafletMouseEvent } from 'leaflet';

// **[MODIFIED]** Import functions for saving data to both utility files
import { saveSprinklerLayoutData } from '../utils/sprinklerLayoutData';
import { saveHomeGardenData } from '../utils/homeGardenData';

// Types
type LatLng = { lat: number; lng: number };
type SprinklerPosition = { lat: number; lng: number; id: string };
type WaterSource = { lat: number; lng: number; type: 'tap' | 'pump'; id: string };
type PipeConnection = { start: LatLng; end: LatLng; length: number; id: string };
type Props = { area: LatLng[]; sprinkler_radius: number };

// Custom Icons
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
const MapBounds: React.FC<{ positions: LatLng[] }> = ({ positions }) => {
    const map = useMap();
    useEffect(() => {
        if (positions.length > 0) {
            const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 20, animate: true });
        }
    }, [positions, map]);
    return null;
};
const MapClickHandler: React.FC<{
    onMapClick: (e: LeafletMouseEvent) => void;
    isPlacingWaterSource: boolean;
}> = ({ onMapClick, isPlacingWaterSource }) => {
    const map = useMap();
    useEffect(() => {
        if (isPlacingWaterSource) {
            L.DomUtil.addClass(map.getContainer(), 'cursor-crosshair');
            map.on('click', onMapClick);
            return () => {
                L.DomUtil.removeClass(map.getContainer(), 'cursor-crosshair');
                map.off('click', onMapClick);
            };
        }
    }, [map, onMapClick, isPlacingWaterSource]);
    return null;
};

// Helper functions
const formatDistance = (meters: number): string => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} กม.`;
    return `${meters.toFixed(1)} ม.`;
};

const calculateAreaInSquareMeters = (coordinates: LatLng[]): number => {
    if (coordinates.length < 3) return 0;
    let area = 0;
    const R = 6378137; // Earth's radius in meters
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

// Main Component
export default function GenerateSprinkler({ area, sprinkler_radius }: Props) {
    const [sprinklerPositions, setSprinklerPositions] = useState<SprinklerPosition[]>([]);
    const [pipeConnections, setPipeConnections] = useState<PipeConnection[]>([]);
    const [waterSource, setWaterSource] = useState<WaterSource | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPlacingWaterSource, setIsPlacingWaterSource] = useState(false);
    const [waterSourceType, setWaterSourceType] = useState<'tap' | 'pump'>('tap');
    const [showCoverage, setShowCoverage] = useState(true);

    const areaInSquareMeters = useMemo(() => calculateAreaInSquareMeters(area), [area]);
    const areaInRai = useMemo(() => areaInSquareMeters / 1600, [areaInSquareMeters]);

    useEffect(() => {
        if (area.length > 0 && sprinklerPositions.length === 0) {
            handleGenerateSprinklers();
        }
    }, [area]);

    const handleGenerateSprinklers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data } = await axios.post('/api/home-garden/generate-sprinkler-layout', {
                area,
                sprinkler_radius,
            });
            if (!data?.sprinkler_positions) throw new Error('Invalid response from server');
            setSprinklerPositions(data.sprinkler_positions);
        } catch (err: any) {
            setError(err.response?.data?.message || 'ไม่สามารถคำนวณตำแหน่ง Sprinkler ได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGeneratePipeLayout = async () => {
        if (!waterSource) {
            setError('กรุณาวางแหล่งน้ำก่อน');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const { data } = await axios.post('/api/home-garden/generate-pipe-layout', {
                sprinkler_positions: sprinklerPositions,
                water_source: waterSource,
            });
            if (!data?.pipe_layout) throw new Error('Invalid response from server');
            setPipeConnections(data.pipe_layout);
        } catch (err: any) {
            setError(err.response?.data?.message || 'ไม่สามารถคำนวณเส้นทางท่อได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMapClick = (e: LeafletMouseEvent) => {
        if (isPlacingWaterSource) {
            setWaterSource({
                lat: e.latlng.lat,
                lng: e.latlng.lng,
                type: waterSourceType,
                id: `ws-${Date.now()}`,
            });
            setIsPlacingWaterSource(false);
        }
    };

    const handlePlaceWaterSource = (type: 'tap' | 'pump') => {
        setWaterSourceType(type);
        setIsPlacingWaterSource(true);
        setError(null);
    };

    const totalPipeLength = useMemo(
        () => pipeConnections.reduce((total, pipe) => total + pipe.length, 0),
        [pipeConnections]
    );
    const longestPipe = useMemo(
        () =>
            pipeConnections.length > 0
                ? Math.max(...pipeConnections.map((pipe) => pipe.length))
                : 0,
        [pipeConnections]
    );

    const handleSaveAndFinish = () => {
        if (!waterSource) {
            setError('กรุณาวางแหล่งน้ำก่อนบันทึก');
            return;
        }

        const sprinklerLayoutData = {
            sprinklerPositions,
            pipeConnections,
            waterSource,
            sprinklerInfo: { radius: sprinkler_radius },
            area,
            statistics: {
                totalSprinklers: sprinklerPositions.length,
                totalPipeLength,
                longestPipe,
            },
        };
        saveSprinklerLayoutData(sprinklerLayoutData as any);

        const homeGardenData = {
            area: {
                size: areaInSquareMeters,
                coordinates: area,
            },
            sprinklers: {
                info: { radius: sprinkler_radius },
                positions: sprinklerPositions,
                totalCount: sprinklerPositions.length,
            },
            waterSource: waterSource,
            pipes: {
                totalLength: totalPipeLength,
                longestPipe: longestPipe,
                connections: pipeConnections.length,
            },
            summary: {
                /* No cost data as requested */
            },
        };
        saveHomeGardenData(homeGardenData as any);

        router.visit('/home-garden/summary');
    };

    return (
        <div className="min-h-screen bg-gray-900 p-6 text-white">
            <div className="mx-auto max-w-screen-xl">
                <h1 className="mb-4 text-3xl font-bold">🏡 ผลการคำนวณและวางระบบท่อ</h1>
                {error && (
                    <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    {/* Left Panel for Controls and Summary */}
                    <div className="space-y-6 lg:col-span-1">
                        <div className="rounded-lg bg-gray-800 p-4">
                            <h3 className="mb-3 text-lg font-semibold">สรุปข้อมูลพื้นที่</h3>
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
                                        {sprinkler_radius} ม.
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>จำนวน Sprinkler:</span>
                                    <span className="text-xl font-bold text-blue-400">
                                        {sprinklerPositions.length}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-lg bg-gray-800 p-4">
                            <h3 className="mb-3 text-lg font-semibold">
                                ขั้นตอนที่ 1: วางแหล่งน้ำ
                            </h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => handlePlaceWaterSource('tap')}
                                    disabled={isPlacingWaterSource}
                                    className="w-full rounded bg-green-600 px-3 py-2 text-white transition hover:bg-green-700 disabled:bg-gray-600"
                                >
                                    {isPlacingWaterSource && waterSourceType === 'tap'
                                        ? 'คลิกบนแผนที่...'
                                        : '🚰 วางก๊อกน้ำ'}
                                </button>
                                <button
                                    onClick={() => handlePlaceWaterSource('pump')}
                                    disabled={isPlacingWaterSource}
                                    className="w-full rounded bg-red-600 px-3 py-2 text-white transition hover:bg-red-700 disabled:bg-gray-600"
                                >
                                    {isPlacingWaterSource && waterSourceType === 'pump'
                                        ? 'คลิกบนแผนที่...'
                                        : '⚡ วางปั๊มน้ำ'}
                                </button>
                                {waterSource && (
                                    <p className="pt-2 text-center text-sm text-green-400">
                                        ✅ วางแหล่งน้ำแล้ว
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="rounded-lg bg-gray-800 p-4">
                            <h3 className="mb-3 text-lg font-semibold">
                                ขั้นตอนที่ 2: คำนวณเส้นท่อ
                            </h3>
                            <button
                                onClick={handleGeneratePipeLayout}
                                disabled={isLoading || !waterSource}
                                className="w-full rounded bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:bg-gray-600"
                            >
                                {isLoading ? 'กำลังคำนวณ...' : '🔧 คำนวณเส้นทางท่ออัตโนมัติ'}
                            </button>
                        </div>
                        {pipeConnections.length > 0 && (
                            <div className="animate-fade-in rounded-lg bg-gray-800 p-4">
                                <h3 className="mb-3 text-lg font-semibold">ข้อมูลระบบท่อ</h3>
                                <div className="space-y-2 text-sm text-gray-300">
                                    <div className="flex justify-between">
                                        <span>ความยาวท่อรวม:</span>
                                        <span className="font-medium text-white">
                                            {formatDistance(totalPipeLength)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>ท่อยาวที่สุด:</span>
                                        <span className="font-medium text-white">
                                            {formatDistance(longestPipe)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>จำนวนท่อ:</span>
                                        <span className="font-medium text-white">
                                            {pipeConnections.length}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="rounded-lg bg-gray-800 p-4">
                            <h3 className="mb-3 text-lg font-semibold">ขั้นตอนที่ 3: เสร็จสิ้น</h3>
                            <button
                                onClick={handleSaveAndFinish}
                                disabled={pipeConnections.length === 0}
                                className="w-full rounded bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700 disabled:bg-gray-600"
                            >
                                ✅ บันทึกและดูสรุปผล
                            </button>
                        </div>
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
                                <MapClickHandler
                                    onMapClick={handleMapClick}
                                    isPlacingWaterSource={isPlacingWaterSource}
                                />
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
                                        {showCoverage && (
                                            <Circle
                                                center={[sprinkler.lat, sprinkler.lng]}
                                                radius={sprinkler_radius}
                                                pathOptions={{
                                                    color: '#3B82F6',
                                                    fillColor: '#3B82F6',
                                                    fillOpacity: 0.1,
                                                    weight: 1,
                                                }}
                                            />
                                        )}
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
                <div className="mt-6 flex justify-between">
                    <button
                        onClick={() => router.get('/home-garden/planner')}
                        className="rounded bg-gray-700 px-6 py-2 text-white transition hover:bg-gray-600"
                    >
                        ← กลับไปแก้ไข
                    </button>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="showCoverage"
                            checked={showCoverage}
                            onChange={(e) => setShowCoverage(e.target.checked)}
                            className="rounded"
                        />
                        <label htmlFor="showCoverage" className="text-sm text-gray-300">
                            แสดงรัศมีครอบคลุม
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
