// resources/js/pages/home-garden-planner.tsx
import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, FeatureGroup, LayersControl, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { router } from '@inertiajs/react';
import L from 'leaflet';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Footer from '../components/Footer';

// Types
type LatLng = {
    lat: number;
    lng: number;
};

// Constants
const DEFAULT_MAP_CENTER: [number, number] = [13.7563, 100.5018];

// Components
const SearchControl: React.FC<{ onSearch: (lat: number, lng: number) => void }> = ({
    onSearch,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);

    const handleSearchChange = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 3) {
            setSuggestions([]);
            return;
        }

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
            );
            const data = await response.json();
            setSuggestions(data);
        } catch (err) {
            console.error('Suggestion fetch error:', err);
        }
    };

    const handleSuggestionClick = (lat: number, lon: number, displayName: string) => {
        setSearchQuery(displayName);
        setSuggestions([]);
        onSearch(lat, lon);
    };

    return (
        <div className="absolute left-[60px] top-4 z-[1000] w-80">
            <div className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="ค้นหาสถานที่..."
                    className="w-full rounded-t-lg bg-white p-3 text-gray-900 shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {suggestions.length > 0 && (
                    <ul className="absolute max-h-60 w-full overflow-y-auto rounded-b-lg bg-white shadow-lg">
                        {suggestions.map((item) => (
                            <li
                                key={item.place_id}
                                onClick={() =>
                                    handleSuggestionClick(
                                        parseFloat(item.lat),
                                        parseFloat(item.lon),
                                        item.display_name
                                    )
                                }
                                className="cursor-pointer p-3 text-sm text-gray-800 hover:bg-gray-200"
                            >
                                {item.display_name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

const MapController: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom }) => {
    const map = useMap();

    React.useEffect(() => {
        if (map && center) {
            map.setView(center, zoom || map.getZoom(), {
                animate: true,
                duration: 1.5,
            });
        }
    }, [center, map, zoom]);

    return null;
};

// Main Component
export default function HomeGardenPlanner() {
    const { t } = useLanguage();
    const [area, setArea] = useState<LatLng[]>([]);
    const [sprinklerRadius, setSprinklerRadius] = useState<number>(3);
    const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
    const [error, setError] = useState<string | null>(null);
    const featureGroupRef = useRef<L.FeatureGroup>(null);

    const onCreated = (e: any) => {
        if (featureGroupRef.current) {
            featureGroupRef.current.clearLayers();
        }
        const layer = e.layer;
        featureGroupRef.current?.addLayer(layer);

        const coordinates = layer.getLatLngs()[0].map((latLng: { lat: number; lng: number }) => ({
            lat: latLng.lat,
            lng: latLng.lng,
        }));

        setArea(coordinates);

        const bounds = layer.getBounds();
        const newCenter: [number, number] = [bounds.getCenter().lat, bounds.getCenter().lng];
        setMapCenter(newCenter);
        setError(null);
    };

    const onEdited = (e: any) => {
        const layers = e.layers;
        layers.eachLayer((layer: any) => {
            const coordinates = layer
                .getLatLngs()[0]
                .map((latLng: { lat: number; lng: number }) => ({
                    lat: latLng.lat,
                    lng: latLng.lng,
                }));
            setArea(coordinates);
        });
    };

    const onDeleted = () => {
        setArea([]);
        setError(null);
    };

    const handleCalculate = () => {
        if (area.length === 0) {
            setError('กรุณาวาดพื้นที่สวนบนแผนที่ก่อน');
            return;
        }
        if (sprinklerRadius < 0.5 || sprinklerRadius > 20) {
            setError('รัศมี Sprinkler ควรอยู่ระหว่าง 0.5 - 20 เมตร');
            return;
        }
        setError(null);

        router.post(
            '/home-garden/generate-sprinkler',
            {
                area: area,
                sprinkler_radius: sprinklerRadius,
            },
            {
                preserveState: false,
                preserveScroll: true,
                onError: (errors: any) => {
                    setError(errors.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
                },
            }
        );
    };

    const handleSearch = (lat: number, lng: number) => {
        setMapCenter([lat, lng]);
    };

    const areaInSquareMeters =
        area.length > 0
            ? L.GeometryUtil.geodesicArea(area.map((c) => new L.LatLng(c.lat, c.lng)))
            : 0;
    const areaInRai = areaInSquareMeters / 1600;
    const estimatedSprinklers =
        areaInSquareMeters > 0
            ? Math.ceil(areaInSquareMeters / (Math.PI * Math.pow(sprinklerRadius, 2) * 0.8))
            : 0;

    return (
        <div className="min-h-screen bg-gray-900 p-6 text-white">
            <div className="mx-auto w-full">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">🏡 Home Garden Sprinkler Calculator</h1>
                        <p className="text-gray-400">
                            วาดพื้นที่สวน → กำหนดรัศมี Sprinkler → ดูผลการคำนวณ
                        </p>
                    </div>
                    <LanguageSwitcher />
                </div>

                {error && (
                    <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    <div className="space-y-6 lg:col-span-1">
                        <div className="rounded-lg bg-gray-800 p-4">
                            <h3 className="mb-3 text-lg font-semibold">ข้อมูลพื้นที่</h3>
                            <div className="space-y-3 text-sm text-gray-300">
                                <div className="flex justify-between">
                                    <span>ขนาดพื้นที่ (ตร.ม.):</span>
                                    <span className="font-medium text-white">
                                        {areaInSquareMeters.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ขนาดพื้นที่ (ไร่):</span>
                                    <span className="font-medium text-white">
                                        {areaInRai.toFixed(3)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>จุดขอบเขต:</span>
                                    <span className="font-medium text-white">
                                        {area.length} จุด
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-lg bg-gray-800 p-4">
                            <h3 className="mb-3 text-lg font-semibold">ตั้งค่า Sprinkler</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-300">
                                        รัศมีการฉีดน้ำ (เมตร)
                                    </label>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="20"
                                        step="0.5"
                                        value={sprinklerRadius}
                                        onChange={(e) => setSprinklerRadius(Number(e.target.value))}
                                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
                                    />
                                    <div className="mt-2 flex justify-between text-xs text-gray-400">
                                        <span>0.5m</span>
                                        <span className="text-xl font-bold text-blue-400">
                                            {sprinklerRadius}m
                                        </span>
                                        <span>20m</span>
                                    </div>
                                </div>
                                <div className="rounded bg-blue-900/30 p-3">
                                    <div className="text-sm text-blue-300">
                                        <div className="flex justify-between">
                                            <span>พื้นที่คลุม/หัว:</span>
                                            <span className="font-medium">
                                                {(Math.PI * Math.pow(sprinklerRadius, 2)).toFixed(
                                                    1
                                                )}{' '}
                                                ตร.ม.
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>ประมาณการ:</span>
                                            <span className="font-bold text-blue-200">
                                                ~{estimatedSprinklers} หัว
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <button
                                onClick={handleCalculate}
                                disabled={area.length === 0}
                                className="w-full rounded-lg bg-green-600 px-8 py-3 text-lg font-semibold text-white transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:transform-none disabled:cursor-not-allowed disabled:bg-gray-600"
                            >
                                🧮 คำนวณ Sprinkler
                            </button>
                        </div>
                    </div>
                    <div className="lg:col-span-3">
                        <div className="h-[83vh] max-h-[83vh] w-full overflow-hidden rounded-lg border border-gray-700">
                            <MapContainer
                                center={mapCenter}
                                zoom={16}
                                maxZoom={100}
                                scrollWheelZoom={true}
                                touchZoom={true}
                                zoomSnap={0.5} // ซูมทีละ 0.5 step (ความละเอียดสูงขึ้น)
                                zoomDelta={0.25} // ความเร็วการซูมต่อ scroll event
                                style={{ height: '100%', width: '100%' }}
                            >
                                <SearchControl onSearch={handleSearch} />
                                <MapController center={mapCenter} />
                                <LayersControl position="topright">
                                    <LayersControl.BaseLayer checked name="ภาพถ่ายดาวเทียม">
                                        <TileLayer
                                            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                                            attribution="Google Maps"
                                            maxNativeZoom={100}
                                            maxZoom={100}
                                        />
                                    </LayersControl.BaseLayer>
                                    <LayersControl.BaseLayer name="แผนที่ถนน">
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution="OpenStreetMap"
                                            maxNativeZoom={100}
                                            maxZoom={100}
                                        />
                                    </LayersControl.BaseLayer>
                                </LayersControl>
                                <FeatureGroup ref={featureGroupRef}>
                                    <EditControl
                                        position="topright"
                                        onCreated={onCreated}
                                        onDeleted={onDeleted}
                                        onEdited={onEdited}
                                        draw={{
                                            rectangle: true,
                                            circle: false,
                                            circlemarker: false,
                                            marker: false,
                                            polyline: false,
                                            polygon: true,
                                        }}
                                    />
                                </FeatureGroup>
                            </MapContainer>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <Footer />
        </div>
    );
}
