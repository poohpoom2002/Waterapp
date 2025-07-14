import React, { useState, useEffect, useRef, useMemo, useCallback, useReducer } from 'react';
import axios from 'axios';

import L, { LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

import {
    MapContainer,
    TileLayer,
    Polygon,
    Marker,
    Polyline,
    Circle,
    Rectangle,
    FeatureGroup,
    useMap,
    LayersControl,
    Popup,
    useMapEvents,
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { FaTree, FaUndo, FaRedo, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { router } from '@inertiajs/react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Footer from '../components/Footer';

import {
    isPointInPolygon,
    calculatePipeLength,
    generateBranchPipes,
    generateUniqueId,
    calculateAreaFromCoordinates,
} from '@/utils/horticultureUtils';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Coordinate {
    lat: number;
    lng: number;
}

interface PlantData {
    id: number;
    name: string;
    plantSpacing: number;
    rowSpacing: number;
    waterNeed: number;
    category?: string;
    description?: string;
}

interface Zone {
    id: string;
    name: string;
    coordinates: Coordinate[];
    plantData: PlantData;
    plantCount: number;
    totalWaterNeed: number;
    area: number;
    color: string;
    isLocked?: boolean;
    createdAt?: string;
    updatedAt?: string;
    shape?: 'circle' | 'polygon' | 'rectangle';
    isCustomPlant?: boolean;
}

interface Pump {
    id: string;
    position: Coordinate;
    type: 'submersible' | 'centrifugal' | 'jet';
    capacity: number;
    head: number;
    power?: number;
    efficiency?: number;
}

interface MainPipe {
    id: string;
    fromPump: string;
    toZone: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    material?: 'pvc' | 'hdpe' | 'steel';
    pressure?: number;
    flowRate?: number;
}

interface SubMainPipe {
    id: string;
    zoneId: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    branchPipes: BranchPipe[];
    material?: 'pvc' | 'hdpe' | 'steel';
    isEditable?: boolean;
}

interface BranchPipe {
    id: string;
    subMainPipeId: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    plants: PlantLocation[];
    sprinklerType?: string;
    isEditable?: boolean;
    isSelected?: boolean;
    isHovered?: boolean;
    isHighlighted?: boolean;
    isDisabled?: boolean;
    isVisible?: boolean;
    isActive?: boolean;
}

interface PlantLocation {
    id: string;
    position: Coordinate;
    plantData: PlantData;
    isSelected?: boolean;
    isEditable?: boolean;
    elevation?: number;
    soilType?: string;
    health?: 'good' | 'fair' | 'poor';
}

interface ExclusionArea {
    id: string;
    type: 'building' | 'powerplant' | 'river' | 'road' | 'other';
    coordinates: Coordinate[];
    name: string;
    color: string;
    description?: string;
    isLocked?: boolean;
    shape?: 'circle' | 'polygon' | 'rectangle';
}

interface ProjectState {
    mainArea: Coordinate[];
    zones: Zone[];
    pump: Pump | null;
    mainPipes: MainPipe[];
    subMainPipes: SubMainPipe[];
    plants: PlantLocation[];
    exclusionAreas: ExclusionArea[];
    useZones: boolean;
    selectedPlantType: PlantData;
    availablePlants: PlantData[];
    areaUtilizationStats: {
        totalBranches: number;
        averageUtilization: number;
        maxUtilization: number;
        minUtilization: number;
    };
}

interface HistoryState {
    past: ProjectState[];
    present: ProjectState;
    future: ProjectState[];
}

type HistoryAction =
    | { type: 'PUSH_STATE'; state: ProjectState }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'CLEAR_HISTORY' };

const DEFAULT_PLANT_TYPES: PlantData[] = [
    {
        id: 1,
        name: 'มะม่วง',
        plantSpacing: 8,
        rowSpacing: 8,
        waterNeed: 50,
        category: 'ผลไม้',
        description: 'ไม้ผลเขตร้อน',
    },
    {
        id: 2,
        name: 'ทุเรียน',
        plantSpacing: 10,
        rowSpacing: 10,
        waterNeed: 80,
        category: 'ผลไม้',
        description: 'ไม้ผลมีค่า',
    },
    {
        id: 3,
        name: 'สับปะรด',
        plantSpacing: 1,
        rowSpacing: 1.2,
        waterNeed: 3,
        category: 'ผลไม้',
        description: 'ไม้ผลทุ่งหญ้า',
    },
    {
        id: 99,
        name: 'กำหนดเอง',
        plantSpacing: 5,
        rowSpacing: 5,
        waterNeed: 10,
        category: 'กำหนดเอง',
        description: 'พืชกำหนดเอง',
    },
];

const ZONE_COLORS = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#FFA07A',
    '#87CEEB',
    '#98FB98',
    '#F0E68C',
];

const EXCLUSION_COLORS = {
    building: '#F59E0B',
    powerplant: '#EF4444',
    river: '#3B82F6',
    road: '#6B7280',
    other: '#8B5CF6',
};

const formatArea = (area: number): string => {
    if (typeof area !== 'number' || isNaN(area) || area < 0) return '0 ตร.ม.';

    if (area >= 1600) {
        return `${(area / 1600).toFixed(2)} ไร่`;
    } else {
        return `${area.toFixed(2)} ตร.ม.`;
    }
};

const formatWaterVolume = (volume: number): string => {
    if (typeof volume !== 'number' || isNaN(volume) || volume < 0) return '0 ลิตร';

    if (volume >= 1000000) {
        return `${(volume / 1000000).toFixed(2)} ล้านลิตร`;
    } else if (volume >= 1000) {
        return `${volume.toLocaleString('th-TH')} ลิตร`;
    } else {
        return `${volume.toFixed(2)} ลิตร`;
    }
};

const getZoneColor = (index: number): string => {
    return ZONE_COLORS[index % ZONE_COLORS.length];
};

const calculatePlantCount = (
    zoneArea: number,
    plantSpacing: number,
    rowSpacing: number
): number => {
    if (zoneArea <= 0 || plantSpacing <= 0 || rowSpacing <= 0) return 0;

    try {
        const effectiveArea = zoneArea * 0.85;
        const plantArea = plantSpacing * rowSpacing;
        const estimatedPlants = Math.floor(effectiveArea / plantArea);

        return Math.max(0, estimatedPlants);
    } catch (error) {
        console.error('Error calculating plant count:', error);
        return 0;
    }
};

const extractCoordinatesFromLayer = (layer: any): Coordinate[] => {
    try {
        let coordinates: Coordinate[] = [];

        if (layer instanceof L.Rectangle) {
            const latLngs = layer.getLatLngs();
            if (Array.isArray(latLngs) && latLngs.length > 0) {
                const coords = latLngs[0];
                coordinates = (coords as any[]).map((latLng: any) => ({
                    lat: latLng.lat,
                    lng: latLng.lng,
                }));
            }
        } else if (layer instanceof L.Circle) {
            const center = layer.getLatLng();
            const radius = layer.getRadius();
            const points = 32;

            for (let i = 0; i < points; i++) {
                const angle = (i * 360) / points;
                const rad = (angle * Math.PI) / 180;
                const latOffset = (radius / 111320) * Math.cos(rad);
                const lngOffset =
                    (radius / (111320 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(rad);

                coordinates.push({
                    lat: center.lat + latOffset,
                    lng: center.lng + lngOffset,
                });
            }
        } else if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
            const latLngs = layer.getLatLngs();
            if (Array.isArray(latLngs) && latLngs.length > 0) {
                const coords =
                    Array.isArray(latLngs[0]) && (latLngs[0] as any).lat === undefined
                        ? latLngs[0]
                        : latLngs;

                coordinates = (coords as any[]).map((latLng: any) => ({
                    lat: latLng.lat,
                    lng: latLng.lng,
                }));
            }
        }

        return coordinates;
    } catch (error) {
        console.error('❌ Error extracting coordinates:', error);
        return [];
    }
};

// History reducer
const historyReducer = (state: HistoryState, action: HistoryAction): HistoryState => {
    switch (action.type) {
        case 'PUSH_STATE':
            return {
                past: [...state.past, state.present],
                present: action.state,
                future: [],
            };
        case 'UNDO':
            if (state.past.length === 0) return state;
            return {
                past: state.past.slice(0, -1),
                present: state.past[state.past.length - 1],
                future: [state.present, ...state.future],
            };
        case 'REDO':
            if (state.future.length === 0) return state;
            return {
                past: [...state.past, state.present],
                present: state.future[0],
                future: state.future.slice(1),
            };
        case 'CLEAR_HISTORY':
            return {
                past: [],
                present: state.present,
                future: [],
            };
        default:
            return state;
    }
};

const CustomPlantModal = ({
    isOpen,
    onClose,
    onSave,
    defaultValues,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (plantData: PlantData) => void;
    defaultValues?: Partial<PlantData>;
}) => {
    const [plantData, setPlantData] = useState<PlantData>({
        id: Date.now(),
        name: defaultValues?.name || '',
        plantSpacing: defaultValues?.plantSpacing || 5,
        rowSpacing: defaultValues?.rowSpacing || 5,
        waterNeed: defaultValues?.waterNeed || 10,
        category: 'กำหนดเอง',
        description: defaultValues?.description || '',
    });

    const handleSave = () => {
        if (plantData.name.trim() === '') {
            alert('กรุณากรอกชื่อพืช');
            return;
        }
        if (plantData.plantSpacing <= 0 || plantData.rowSpacing <= 0 || plantData.waterNeed <= 0) {
            alert('กรุณากรอกค่าที่มากกว่า 0');
            return;
        }
        onSave(plantData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-gray-800 p-6 text-white">
                <h3 className="mb-4 text-xl font-semibold">🌱 กำหนดพืชใหม่</h3>

                <div className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">ชื่อพืช *</label>
                        <input
                            type="text"
                            value={plantData.name}
                            onChange={(e) => setPlantData({ ...plantData, name: e.target.value })}
                            className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="เช่น มะม่วงพันธุ์ใหม่"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                ระยะห่างต้น (ม.) *
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={plantData.plantSpacing}
                                onChange={(e) =>
                                    setPlantData({
                                        ...plantData,
                                        plantSpacing: parseFloat(e.target.value) || 0,
                                    })
                                }
                                className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                ระยะห่างแถว (ม.) *
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={plantData.rowSpacing}
                                onChange={(e) =>
                                    setPlantData({
                                        ...plantData,
                                        rowSpacing: parseFloat(e.target.value) || 0,
                                    })
                                }
                                className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            น้ำต่อต้น (ลิตร/ครั้ง) *
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={plantData.waterNeed}
                            onChange={(e) =>
                                setPlantData({
                                    ...plantData,
                                    waterNeed: parseFloat(e.target.value) || 0,
                                })
                            }
                            className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            รายละเอียดเพิ่มเติม
                        </label>
                        <textarea
                            value={plantData.description}
                            onChange={(e) =>
                                setPlantData({ ...plantData, description: e.target.value })
                            }
                            className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="ข้อมูลเพิ่มเติมเกี่ยวกับพืชชนิดนี้"
                        />
                    </div>

                    <div className="rounded bg-blue-900/30 p-3 text-sm text-blue-300">
                        <div>📊 ประมาณการ:</div>
                        <div>
                            • พื้นที่ต่อต้น:{' '}
                            {(plantData.plantSpacing * plantData.rowSpacing).toFixed(2)} ตร.ม.
                        </div>
                        <div>
                            • ต้นต่อไร่:{' '}
                            {Math.floor(
                                1600 / (plantData.plantSpacing * plantData.rowSpacing)
                            ).toLocaleString()}{' '}
                            ต้น
                        </div>
                        <div>
                            • น้ำต่อไร่:{' '}
                            {formatWaterVolume(
                                Math.floor(1600 / (plantData.plantSpacing * plantData.rowSpacing)) *
                                    plantData.waterNeed
                            )}
                        </div>
                        <div className="mt-2 text-xs text-green-300">
                            ✅ FIXED: ปลายท่อห่างจากขอบ {(plantData.plantSpacing * 0.3).toFixed(1)}{' '}
                            ม. (30%)
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded bg-gray-600 px-4 py-2 transition-colors hover:bg-gray-700"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 rounded bg-green-600 px-4 py-2 transition-colors hover:bg-green-700"
                    >
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
};

const ZonePlantSelectionModal = ({
    isOpen,
    onClose,
    zone,
    availablePlants,
    onSave,
    onCreateCustomPlant,
}: {
    isOpen: boolean;
    onClose: () => void;
    zone: Zone | null;
    availablePlants: PlantData[];
    onSave: (zoneId: string, plantData: PlantData) => void;
    onCreateCustomPlant: () => void;
}) => {
    const [selectedPlant, setSelectedPlant] = useState<PlantData | null>(zone?.plantData || null);

    useEffect(() => {
        if (zone) {
            setSelectedPlant(zone.plantData);
        }
    }, [zone]);

    const handleSave = () => {
        if (!selectedPlant || !zone) return;
        onSave(zone.id, selectedPlant);
        onClose();
    };

    if (!isOpen || !zone) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-gray-800 p-6 text-white">
                <h3 className="mb-4 text-xl font-semibold">🌱 เลือกพืชสำหรับ {zone.name}</h3>

                <div className="mb-4 rounded bg-blue-900/30 p-3 text-sm">
                    <div>📐 ข้อมูลโซน:</div>
                    <div>• พื้นที่: {formatArea(zone.area)}</div>
                    <div>
                        • สี:{' '}
                        <span
                            className="inline-block h-4 w-4 rounded"
                            style={{ backgroundColor: zone.color }}
                        ></span>
                    </div>
                </div>

                <div className="max-h-64 space-y-2 overflow-y-auto">
                    {availablePlants.map((plant) => (
                        <div
                            key={plant.id}
                            onClick={() => setSelectedPlant(plant)}
                            className={`cursor-pointer rounded p-3 transition-colors ${
                                selectedPlant?.id === plant.id
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                        >
                            <div className="font-medium">{plant.name}</div>
                            <div className="text-sm text-gray-300">
                                ระยะ: {plant.plantSpacing}×{plant.rowSpacing}ม. | น้ำ:{' '}
                                {plant.waterNeed}ล./ครั้ง
                            </div>
                            <div className="text-xs text-gray-400">{plant.description}</div>
                        </div>
                    ))}
                </div>

                <div className="mt-4">
                    <button
                        onClick={onCreateCustomPlant}
                        className="w-full rounded bg-purple-600 px-4 py-2 text-sm transition-colors hover:bg-purple-700"
                    >
                        ➕ สร้างพืชใหม่
                    </button>
                </div>

                {selectedPlant && (
                    <div className="mt-4 rounded bg-green-900/30 p-3 text-sm">
                        <div>
                            ✅ พืชที่เลือก: <strong>{selectedPlant.name}</strong>
                        </div>
                        <div>• ระยะห่างต้น: {selectedPlant.plantSpacing} ม.</div>
                        <div>• ระยะห่างแถว: {selectedPlant.rowSpacing} ม.</div>
                        <div>• น้ำต่อต้น: {selectedPlant.waterNeed} ลิตร/ครั้ง</div>

                        <div className="mt-2 border-t border-green-600 pt-2">
                            <div>📊 ประมาณการในโซนนี้:</div>
                            <div>
                                • ต้นไม้:{' '}
                                {calculatePlantCount(
                                    zone.area,
                                    selectedPlant.plantSpacing,
                                    selectedPlant.rowSpacing
                                ).toLocaleString()}{' '}
                                ต้น
                            </div>
                            <div>
                                • น้ำรวม:{' '}
                                {formatWaterVolume(
                                    calculatePlantCount(
                                        zone.area,
                                        selectedPlant.plantSpacing,
                                        selectedPlant.rowSpacing
                                    ) * selectedPlant.waterNeed
                                )}
                            </div>
                            <div className="text-xs text-green-300">
                                ✅ FIXED: ปลายท่อห่างจากขอบ{' '}
                                {(selectedPlant.plantSpacing * 0.3).toFixed(1)} ม.
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded bg-gray-600 px-4 py-2 transition-colors hover:bg-gray-700"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!selectedPlant}
                        className={`flex-1 rounded px-4 py-2 transition-colors ${
                            selectedPlant
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'cursor-not-allowed bg-gray-600'
                        }`}
                    >
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
};

// Plant Edit Modal
const PlantEditModal = ({
    isOpen,
    onClose,
    plant,
    onSave,
    onDelete,
    availablePlants,
}: {
    isOpen: boolean;
    onClose: () => void;
    plant: PlantLocation | null;
    onSave: (plantId: string, newPosition: Coordinate, newPlantData: PlantData) => void;
    onDelete: (plantId: string) => void;
    availablePlants: PlantData[];
}) => {
    const [position, setPosition] = useState<Coordinate>({ lat: 0, lng: 0 });
    const [selectedPlantData, setSelectedPlantData] = useState<PlantData | null>(null);

    useEffect(() => {
        if (plant) {
            setPosition(plant.position);
            setSelectedPlantData(plant.plantData);
        }
    }, [plant]);

    const handleSave = () => {
        if (!plant || !selectedPlantData) return;
        onSave(plant.id, position, selectedPlantData);
        onClose();
    };

    const handleDelete = () => {
        if (!plant) return;
        if (confirm('คุณต้องการลบต้นไม้นี้หรือไม่?')) {
            onDelete(plant.id);
            onClose();
        }
    };

    if (!isOpen || !plant) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-gray-800 p-6 text-white">
                <h3 className="mb-4 text-xl font-semibold">✏️ แก้ไขต้นไม้</h3>

                <div className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">ตำแหน่ง</label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-gray-400">Latitude</label>
                                <input
                                    type="number"
                                    step="0.000001"
                                    value={position.lat}
                                    onChange={(e) =>
                                        setPosition({
                                            ...position,
                                            lat: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Longitude</label>
                                <input
                                    type="number"
                                    step="0.000001"
                                    value={position.lng}
                                    onChange={(e) =>
                                        setPosition({
                                            ...position,
                                            lng: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">ชนิดพืช</label>
                        <select
                            value={selectedPlantData?.id || ''}
                            onChange={(e) => {
                                const plantData = availablePlants.find(
                                    (p) => p.id === Number(e.target.value)
                                );
                                setSelectedPlantData(plantData || null);
                            }}
                            className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {availablePlants.map((plant) => (
                                <option key={plant.id} value={plant.id}>
                                    {plant.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedPlantData && (
                        <div className="rounded bg-green-900/30 p-3 text-sm">
                            <div>
                                <strong>พืช:</strong> {selectedPlantData.name}
                            </div>
                            <div>
                                <strong>ระยะห่างต้น:</strong> {selectedPlantData.plantSpacing} ม.
                            </div>
                            <div>
                                <strong>ระยะห่างแถว:</strong> {selectedPlantData.rowSpacing} ม.
                            </div>
                            <div>
                                <strong>น้ำต่อต้น:</strong> {selectedPlantData.waterNeed} ลิตร/ครั้ง
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded bg-gray-600 px-4 py-2 transition-colors hover:bg-gray-700"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleDelete}
                        className="flex-1 rounded bg-red-600 px-4 py-2 transition-colors hover:bg-red-700"
                    >
                        <FaTrash className="mr-2 inline" />
                        ลบ
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 rounded bg-green-600 px-4 py-2 transition-colors hover:bg-green-700"
                    >
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
};

// Pipe Edit Modal
const PipeEditModal = ({
    isOpen,
    onClose,
    pipe,
    onSave,
    onDelete,
    type,
}: {
    isOpen: boolean;
    onClose: () => void;
    pipe: MainPipe | SubMainPipe | BranchPipe | null;
    onSave: (pipe: MainPipe | SubMainPipe | BranchPipe) => void;
    onDelete: (pipeId: string) => void;
    type: 'main' | 'subMain' | 'branch';
}) => {
    const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
    const [diameter, setDiameter] = useState<number>(100);

    useEffect(() => {
        if (pipe) {
            setCoordinates([...pipe.coordinates]);
            setDiameter(pipe.diameter);
        }
    }, [pipe]);

    const handleSave = () => {
        if (!pipe) return;
        const updatedPipe = {
            ...pipe,
            coordinates,
            diameter,
            length: calculatePipeLength(coordinates),
        };
        onSave(updatedPipe);
        onClose();
    };

    const handleDelete = () => {
        if (!pipe) return;
        if (confirm('คุณต้องการลบท่อนี้หรือไม่?')) {
            onDelete(pipe.id);
            onClose();
        }
    };

    const updateCoordinate = (index: number, field: 'lat' | 'lng', value: number) => {
        const newCoordinates = [...coordinates];
        newCoordinates[index] = { ...newCoordinates[index], [field]: value };
        setCoordinates(newCoordinates);
    };

    const addCoordinate = () => {
        const lastCoord = coordinates[coordinates.length - 1];
        const newCoord = lastCoord
            ? { lat: lastCoord.lat + 0.0001, lng: lastCoord.lng + 0.0001 }
            : { lat: 0, lng: 0 };
        setCoordinates([...coordinates, newCoord]);
    };

    const removeCoordinate = (index: number) => {
        if (coordinates.length > 2) {
            setCoordinates(coordinates.filter((_, i) => i !== index));
        }
    };

    if (!isOpen || !pipe) return null;

    const typeNames = {
        main: 'ท่อเมน',
        subMain: 'ท่อเมนรอง',
        branch: 'ท่อย่อย',
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-gray-800 p-6 text-white">
                <h3 className="mb-4 text-xl font-semibold">✏️ แก้ไข{typeNames[type]}</h3>

                <div className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            เส้นผ่านศูนย์กลาง (มม.)
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={diameter}
                            onChange={(e) => setDiameter(parseInt(e.target.value) || 100)}
                            className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <label className="text-sm font-medium">จุดพิกัด</label>
                            <button
                                onClick={addCoordinate}
                                className="rounded bg-green-600 px-3 py-1 text-sm transition-colors hover:bg-green-700"
                            >
                                <FaPlus className="mr-1 inline" />
                                เพิ่มจุด
                            </button>
                        </div>
                        <div className="max-h-64 space-y-2 overflow-y-auto">
                            {coordinates.map((coord, index) => (
                                <div key={index} className="grid grid-cols-5 gap-2">
                                    <div className="col-span-2">
                                        <label className="text-xs text-gray-400">Lat</label>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={coord.lat}
                                            onChange={(e) =>
                                                updateCoordinate(
                                                    index,
                                                    'lat',
                                                    parseFloat(e.target.value) || 0
                                                )
                                            }
                                            className="w-full rounded bg-gray-700 px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-gray-400">Lng</label>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={coord.lng}
                                            onChange={(e) =>
                                                updateCoordinate(
                                                    index,
                                                    'lng',
                                                    parseFloat(e.target.value) || 0
                                                )
                                            }
                                            className="w-full rounded bg-gray-700 px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400">&nbsp;</label>
                                        <button
                                            onClick={() => removeCoordinate(index)}
                                            disabled={coordinates.length <= 2}
                                            className="w-full rounded bg-red-600 px-2 py-1 text-sm transition-colors hover:bg-red-700 disabled:bg-gray-600"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded bg-blue-900/30 p-3 text-sm">
                        <div>
                            <strong>ความยาวท่อ:</strong>{' '}
                            {calculatePipeLength(coordinates).toFixed(2)} ม.
                        </div>
                        <div>
                            <strong>จำนวนจุด:</strong> {coordinates.length} จุด
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded bg-gray-600 px-4 py-2 transition-colors hover:bg-gray-700"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleDelete}
                        className="flex-1 rounded bg-red-600 px-4 py-2 transition-colors hover:bg-red-700"
                    >
                        <FaTrash className="mr-2 inline" />
                        ลบ
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 rounded bg-green-600 px-4 py-2 transition-colors hover:bg-green-700"
                    >
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
};

const SearchControl: React.FC<{ onSearch: (lat: number, lng: number) => void }> = ({
    onSearch,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearchChange = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (query.length < 3) {
            setSuggestions([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
            );
            const data = await response.json();
            setSuggestions(data);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    }, []);

    return (
        <div className="absolute left-[60px] top-4 z-[1000] w-80">
            <div className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="ค้นหาสถานที่..."
                    className="w-full rounded-t-lg bg-white p-3 text-gray-900 shadow-md focus:border-blue-500 focus:outline-none"
                />
                {isSearching && (
                    <div className="absolute right-3 top-3">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                    </div>
                )}
                {suggestions.length > 0 && (
                    <ul className="absolute max-h-60 w-full overflow-y-auto rounded-b-lg bg-white shadow-lg">
                        {suggestions.map((item) => (
                            <li
                                key={item.place_id}
                                onClick={() => {
                                    setSearchQuery(item.display_name);
                                    setSuggestions([]);
                                    onSearch(parseFloat(item.lat), parseFloat(item.lon));
                                }}
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

export default function EnhancedHorticulturePlannerPage() {
    const [projectName, setProjectName] = useState<string>('โครงการระบบน้ำพืชสวน จ.จันทบุรี');
    const [showCustomPlantModal, setShowCustomPlantModal] = useState(false);
    const [showZonePlantModal, setShowZonePlantModal] = useState(false);
    const [selectedZoneForPlant, setSelectedZoneForPlant] = useState<Zone | null>(null);
    const [editingPlant, setEditingPlant] = useState<PlantData | null>(null);

    // Step-by-step wizard system
    const [currentStep, setCurrentStep] = useState(1);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const steps = [
        { id: 1, name: 'พื้นที่หลัก', description: 'วาดพื้นที่หลักของโครงการ', icon: '🗺️' },
        { id: 2, name: 'พืชและโซน', description: 'เลือกพืชและแบ่งโซน', icon: '🌱' },
        { id: 3, name: 'ปั๊มน้ำ', description: 'วางปั๊มน้ำ', icon: '🚰' },
        { id: 4, name: 'ท่อน้ำ', description: 'วางท่อเมนและท่อย่อย', icon: '🔧' },
        { id: 5, name: 'บันทึกและดูผล', description: 'บันทึกและดูผลลัพธ์', icon: '💾' },
    ];

    const getStepStatus = (stepId: number) => {
        if (stepId < currentStep) return 'completed';
        if (stepId === currentStep) return 'active';
        return 'pending';
    };

    const canProceedToStep = (stepId: number) => {
        switch (stepId) {
            case 1:
                return true; // Always can start
            case 2:
                return history.present.mainArea.length > 0;
            case 3:
                return (
                    history.present.mainArea.length > 0 &&
                    (history.present.useZones ? history.present.zones.length > 0 : true)
                );
            case 4:
                return history.present.pump !== null;
            case 5:
                return history.present.mainArea.length > 0 && history.present.pump !== null; // Allow access to step 5 if basic requirements met
            default:
                return false;
        }
    };

    const handleStepClick = (stepId: number) => {
        if (canProceedToStep(stepId)) {
            setCurrentStep(stepId);
        }
    };

    const handleNextStep = () => {
        if (currentStep < steps.length && canProceedToStep(currentStep + 1)) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const [editMode, setEditMode] = useState<string | null>(null);
    const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
    const [selectedExclusionType, setSelectedExclusionType] =
        useState<keyof typeof EXCLUSION_COLORS>('building');
    const [mapCenter, setMapCenter] = useState<[number, number]>([12.609731, 102.050412]);
    const [drawingMainPipe, setDrawingMainPipe] = useState<{ toZone: string | null }>({
        toZone: null,
    });

    // Edit modals
    const [showPlantEditModal, setShowPlantEditModal] = useState(false);
    const [selectedPlantForEdit, setSelectedPlantForEdit] = useState<PlantLocation | null>(null);
    const [showPipeEditModal, setShowPipeEditModal] = useState(false);
    const [selectedPipeForEdit, setSelectedPipeForEdit] = useState<
        MainPipe | SubMainPipe | BranchPipe | null
    >(null);
    const [selectedPipeType, setSelectedPipeType] = useState<'main' | 'subMain' | 'branch'>('main');

    // Dragging state
    const [isDragging, setIsDragging] = useState(false);
    const [draggedPlant, setDraggedPlant] = useState<PlantLocation | null>(null);

    const featureGroupRef = useRef<L.FeatureGroup | null>(null);
    const mapRef = useRef<any>(null);

    // Initialize project state
    const initialState: ProjectState = {
        mainArea: [],
        zones: [],
        pump: null,
        mainPipes: [],
        subMainPipes: [],
        plants: [],
        exclusionAreas: [],
        useZones: false,
        selectedPlantType: DEFAULT_PLANT_TYPES[0],
        availablePlants: DEFAULT_PLANT_TYPES,
        areaUtilizationStats: {
            totalBranches: 0,
            averageUtilization: 0,
            maxUtilization: 0,
            minUtilization: 0,
        },
    };

    // History management
    const [history, dispatchHistory] = useReducer(historyReducer, {
        past: [],
        present: initialState,
        future: [],
    });

    const totalArea = useMemo(
        () => calculateAreaFromCoordinates(history.present.mainArea),
        [history.present.mainArea]
    );
    const actualTotalPlants = useMemo(
        () => history.present.plants.length,
        [history.present.plants]
    );
    const actualTotalWaterNeed = useMemo(() => {
        return history.present.plants.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0);
    }, [history.present.plants]);

    // Push state to history
    const pushToHistory = useCallback(
        (newState: Partial<ProjectState>) => {
            const updatedState = { ...history.present, ...newState };
            dispatchHistory({ type: 'PUSH_STATE', state: updatedState });
        },
        [history.present]
    );

    // Undo/Redo functions
    const handleUndo = useCallback(() => {
        dispatchHistory({ type: 'UNDO' });
    }, []);

    const handleRedo = useCallback(() => {
        dispatchHistory({ type: 'REDO' });
    }, []);

    useEffect(() => {
        if (!history.present.useZones && editMode === 'mainPipe') {
            setDrawingMainPipe({ toZone: 'main-area' });
            console.log('🎯 Set main pipe target to main-area for single zone mode');
        }
    }, [history.present.useZones, editMode]);

    const handleCreateCustomPlant = useCallback((plantData?: PlantData) => {
        setEditingPlant(plantData || null);
        setShowCustomPlantModal(true);
    }, []);

    const handleSaveCustomPlant = useCallback(
        (plantData: PlantData) => {
            const newPlant = {
                ...plantData,
                id: plantData.id || Date.now(),
            };

            const updatedAvailablePlants = history.present.availablePlants.some(
                (p) => p.id === newPlant.id
            )
                ? history.present.availablePlants.map((p) => (p.id === newPlant.id ? newPlant : p))
                : [...history.present.availablePlants, newPlant];

            let updatedZones = history.present.zones;
            if (editingPlant) {
                updatedZones = history.present.zones.map((zone) =>
                    zone.plantData.id === editingPlant.id
                        ? {
                              ...zone,
                              plantData: newPlant,
                              plantCount: calculatePlantCount(
                                  zone.area,
                                  newPlant.plantSpacing,
                                  newPlant.rowSpacing
                              ),
                              totalWaterNeed:
                                  calculatePlantCount(
                                      zone.area,
                                      newPlant.plantSpacing,
                                      newPlant.rowSpacing
                                  ) * newPlant.waterNeed,
                          }
                        : zone
                );
            }

            pushToHistory({
                availablePlants: updatedAvailablePlants,
                zones: updatedZones,
            });

            console.log('✅ Custom plant saved:', newPlant);
            setEditingPlant(null);
        },
        [editingPlant, history.present.availablePlants, history.present.zones, pushToHistory]
    );

    const handleZonePlantSelection = useCallback((zone: Zone) => {
        setSelectedZoneForPlant(zone);
        setShowZonePlantModal(true);
    }, []);

    // Load saved field data from URL parameters
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const fieldId = urlParams.get('fieldId');

        if (fieldId) {
            console.log('🔄 Loading saved field data for fieldId:', fieldId);

            // Store fieldId in localStorage for the results page to detect editing mode
            localStorage.setItem('editingFieldId', fieldId);

            // Load saved data from localStorage or fetch from API
            const loadSavedField = async () => {
                try {
                    // First try to get from localStorage (if it was saved from results page)
                    const savedData = localStorage.getItem('horticultureIrrigationData');

                    if (savedData) {
                        const data = JSON.parse(savedData);
                        console.log('📊 Loaded saved data from localStorage:', data);

                        // Convert saved data to planner format
                        const loadedState: ProjectState = {
                            mainArea: data.mainArea || [],
                            zones: data.zones || [],
                            pump: data.pump || null,
                            mainPipes: data.mainPipes || [],
                            subMainPipes: data.subMainPipes || [],
                            plants: data.plants || [],
                            exclusionAreas: data.exclusionAreas || [],
                            useZones: data.useZones || false,
                            selectedPlantType:
                                data.plants?.[0]?.plantData || DEFAULT_PLANT_TYPES[0],
                            availablePlants: DEFAULT_PLANT_TYPES,
                            areaUtilizationStats: {
                                totalBranches: 0,
                                averageUtilization: 0,
                                maxUtilization: 0,
                                minUtilization: 0,
                            },
                        };

                        // Update project name if available
                        if (data.projectName) {
                            setProjectName(data.projectName);
                        }

                        // Set the loaded state
                        dispatchHistory({ type: 'PUSH_STATE', state: loadedState });

                        // Auto-advance to step 4 (pipes) if we have pump and zones
                        if (
                            loadedState.pump &&
                            (loadedState.useZones ? loadedState.zones.length > 0 : true)
                        ) {
                            setCurrentStep(4);
                        } else if (loadedState.pump) {
                            setCurrentStep(3);
                        } else if (
                            loadedState.useZones
                                ? loadedState.zones.length > 0
                                : loadedState.mainArea.length > 0
                        ) {
                            setCurrentStep(2);
                        }

                        console.log('✅ Successfully loaded saved field data');
                    } else {
                        // If no localStorage data, try to fetch from API
                        console.log('📡 Fetching field data from API...');
                        const response = await axios.get(`/api/fields/${fieldId}`);

                        if (response.data.success && response.data.field) {
                            const fieldData = response.data.field;
                            console.log('📊 Loaded field data from API:', fieldData);

                            // Convert API data to planner format
                            const loadedState: ProjectState = {
                                mainArea: fieldData.area_coordinates || [],
                                zones:
                                    fieldData.zones?.map((zone: any) => ({
                                        id: zone.id.toString(),
                                        name: zone.name,
                                        coordinates: zone.polygon_coordinates || [],
                                        plantData: {
                                            id: 1,
                                            name: 'พืชทั่วไป',
                                            plantSpacing: 5,
                                            rowSpacing: 5,
                                            waterNeed: 50,
                                        },
                                        plantCount: 0,
                                        totalWaterNeed: 0,
                                        area: 0,
                                        color: zone.color || '#4ECDC4',
                                    })) || [],
                                pump: null, // Will need to be reconstructed from pipes
                                mainPipes:
                                    fieldData.pipes
                                        ?.filter((pipe: any) => pipe.type === 'main')
                                        .map((pipe: any) => ({
                                            id: pipe.id,
                                            fromPump: 'pump-1',
                                            toZone: pipe.zone_id?.toString() || 'main-area',
                                            coordinates: [
                                                { lat: pipe.start_lat, lng: pipe.start_lng },
                                                { lat: pipe.end_lat, lng: pipe.end_lng },
                                            ],
                                            length: pipe.length || 0,
                                            diameter: pipe.pipe_diameter || 50,
                                            material: 'pvc',
                                            pressure: 0,
                                            flowRate: pipe.water_flow || 0,
                                        })) || [],
                                subMainPipes:
                                    fieldData.pipes
                                        ?.filter((pipe: any) => pipe.type === 'submain')
                                        .map((pipe: any) => ({
                                            id: pipe.id,
                                            zoneId: pipe.zone_id?.toString() || 'main-area',
                                            coordinates: [
                                                { lat: pipe.start_lat, lng: pipe.start_lng },
                                                { lat: pipe.end_lat, lng: pipe.end_lng },
                                            ],
                                            length: pipe.length || 0,
                                            diameter: pipe.pipe_diameter || 32,
                                            branchPipes: [],
                                            material: 'pvc',
                                        })) || [],
                                plants:
                                    fieldData.planting_points?.map((point: any) => ({
                                        id: point.point_id,
                                        position: { lat: point.lat, lng: point.lng },
                                        plantData: {
                                            id: 1,
                                            name: 'พืชทั่วไป',
                                            plantSpacing: 5,
                                            rowSpacing: 5,
                                            waterNeed: 50,
                                        },
                                    })) || [],
                                exclusionAreas: [],
                                useZones: fieldData.zones && fieldData.zones.length > 0,
                                selectedPlantType: DEFAULT_PLANT_TYPES[0],
                                availablePlants: DEFAULT_PLANT_TYPES,
                                areaUtilizationStats: {
                                    totalBranches: 0,
                                    averageUtilization: 0,
                                    maxUtilization: 0,
                                    minUtilization: 0,
                                },
                            };

                            // Set the loaded state
                            dispatchHistory({ type: 'PUSH_STATE', state: loadedState });

                            // Update project name
                            if (fieldData.field_name) {
                                setProjectName(fieldData.field_name);
                            }

                            // Auto-advance to appropriate step
                            if (
                                loadedState.mainPipes.length > 0 ||
                                loadedState.subMainPipes.length > 0
                            ) {
                                setCurrentStep(4);
                            } else if (loadedState.plants.length > 0) {
                                setCurrentStep(2);
                            }

                            console.log('✅ Successfully loaded field data from API');
                        }
                    }
                } catch (error) {
                    console.error('❌ Error loading saved field data:', error);
                }
            };

            loadSavedField();
        }
    }, []);

    const handleSaveZonePlant = useCallback(
        (zoneId: string, plantData: PlantData) => {
            const updatedZones = history.present.zones.map((zone) => {
                if (zone.id === zoneId) {
                    const newPlantCount = calculatePlantCount(
                        zone.area,
                        plantData.plantSpacing,
                        plantData.rowSpacing
                    );
                    const newWaterNeed = newPlantCount * plantData.waterNeed;

                    return {
                        ...zone,
                        plantData,
                        plantCount: newPlantCount,
                        totalWaterNeed: newWaterNeed,
                        isCustomPlant: plantData.category === 'กำหนดเอง',
                    };
                }
                return zone;
            });

            pushToHistory({ zones: updatedZones });
            console.log(`✅ Zone ${zoneId} plant updated to:`, plantData);
        },
        [history.present.zones, pushToHistory]
    );

    // Plant management functions
    const handlePlantEdit = useCallback((plant: PlantLocation) => {
        setSelectedPlantForEdit(plant);
        setShowPlantEditModal(true);
    }, []);

    const handlePlantSave = useCallback(
        (plantId: string, newPosition: Coordinate, newPlantData: PlantData) => {
            const updatedPlants = history.present.plants.map((plant) =>
                plant.id === plantId
                    ? { ...plant, position: newPosition, plantData: newPlantData }
                    : plant
            );
            pushToHistory({ plants: updatedPlants });
        },
        [history.present.plants, pushToHistory]
    );

    const handlePlantDelete = useCallback(
        (plantId: string) => {
            const updatedPlants = history.present.plants.filter((plant) => plant.id !== plantId);
            pushToHistory({ plants: updatedPlants });
        },
        [history.present.plants, pushToHistory]
    );

    // Pipe management functions
    const handlePipeEdit = useCallback(
        (pipe: MainPipe | SubMainPipe | BranchPipe, type: 'main' | 'subMain' | 'branch') => {
            setSelectedPipeForEdit(pipe);
            setSelectedPipeType(type);
            setShowPipeEditModal(true);
        },
        []
    );

    const handlePipeSave = useCallback(
        (updatedPipe: MainPipe | SubMainPipe | BranchPipe) => {
            let newState: Partial<ProjectState> = {};

            if (selectedPipeType === 'main') {
                const updatedMainPipes = history.present.mainPipes.map((pipe) =>
                    pipe.id === updatedPipe.id ? (updatedPipe as MainPipe) : pipe
                );
                newState.mainPipes = updatedMainPipes;
            } else if (selectedPipeType === 'subMain') {
                const updatedSubMainPipes = history.present.subMainPipes.map((pipe) =>
                    pipe.id === updatedPipe.id ? (updatedPipe as SubMainPipe) : pipe
                );
                newState.subMainPipes = updatedSubMainPipes;
            } else if (selectedPipeType === 'branch') {
                const updatedSubMainPipes = history.present.subMainPipes.map((subMainPipe) => {
                    const updatedBranchPipes = subMainPipe.branchPipes.map((branchPipe) =>
                        branchPipe.id === updatedPipe.id ? (updatedPipe as BranchPipe) : branchPipe
                    );
                    return { ...subMainPipe, branchPipes: updatedBranchPipes };
                });
                newState.subMainPipes = updatedSubMainPipes;
            }

            pushToHistory(newState);
        },
        [selectedPipeType, history.present.mainPipes, history.present.subMainPipes, pushToHistory]
    );

    const handlePipeDelete = useCallback(
        (pipeId: string) => {
            let newState: Partial<ProjectState> = {};

            if (selectedPipeType === 'main') {
                const updatedMainPipes = history.present.mainPipes.filter(
                    (pipe) => pipe.id !== pipeId
                );
                newState.mainPipes = updatedMainPipes;
            } else if (selectedPipeType === 'subMain') {
                const updatedSubMainPipes = history.present.subMainPipes.filter(
                    (pipe) => pipe.id !== pipeId
                );
                newState.subMainPipes = updatedSubMainPipes;
            } else if (selectedPipeType === 'branch') {
                const updatedSubMainPipes = history.present.subMainPipes.map((subMainPipe) => {
                    const updatedBranchPipes = subMainPipe.branchPipes.filter(
                        (branchPipe) => branchPipe.id !== pipeId
                    );
                    return { ...subMainPipe, branchPipes: updatedBranchPipes };
                });
                newState.subMainPipes = updatedSubMainPipes;
            }

            pushToHistory(newState);
        },
        [selectedPipeType, history.present.mainPipes, history.present.subMainPipes, pushToHistory]
    );

    const MapClickHandler: React.FC<{
        editMode: string | null;
        onPumpPlace: (latlng: L.LatLng) => void;
        onPlantPlace: (latlng: L.LatLng) => void;
    }> = ({ editMode, onPumpPlace, onPlantPlace }) => {
        useMapEvents({
            click: (e) => {
                if (editMode === 'pump') {
                    e.originalEvent?.stopPropagation();
                    onPumpPlace(e.latlng);
                } else if (editMode === 'plant') {
                    e.originalEvent?.stopPropagation();
                    onPlantPlace(e.latlng);
                }
            },
        });
        return null;
    };

    const MapBounds = ({ positions }: { positions: Coordinate[] }) => {
        const map = useMap();

        useEffect(() => {
            if (positions.length > 0) {
                const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 25 });
            }
        }, [positions, map]);

        return null;
    };

    const handleSearch = useCallback((lat: number, lng: number) => {
        setMapCenter([lat, lng]);
    }, []);

    const handlePumpPlace = useCallback(
        (latlng: L.LatLng) => {
            const clickPoint = { lat: latlng.lat, lng: latlng.lng };

            if (history.present.mainArea.length > 0) {
                const isInMainArea = isPointInPolygon(clickPoint, history.present.mainArea);
                if (!isInMainArea) {
                    console.warn('⚠️ Pump placement outside main area');
                    return;
                }
            }

            const newPump: Pump = {
                id: generateUniqueId('pump'),
                position: { lat: latlng.lat, lng: latlng.lng },
                type: 'centrifugal',
                capacity: 100,
                head: 50,
            };

            pushToHistory({ pump: newPump });
            setEditMode(null);
            console.log('✅ Pump placed successfully');
        },
        [history.present.mainArea, pushToHistory]
    );

    const handlePlantPlace = useCallback(
        (latlng: L.LatLng) => {
            const newPlant: PlantLocation = {
                id: generateUniqueId('plant'),
                position: { lat: latlng.lat, lng: latlng.lng },
                plantData: history.present.selectedPlantType,
                isSelected: false,
                isEditable: true,
                health: 'good',
            };
            pushToHistory({ plants: [...history.present.plants, newPlant] });
            console.log('✅ Plant placed successfully');
        },
        [history.present.selectedPlantType, history.present.plants, pushToHistory]
    );

    const onCreated = useCallback(
        (e: any) => {
            const layer = e.layer;
            const coordinates = extractCoordinatesFromLayer(layer);

            if (coordinates.length === 0) {
                console.error('❌ Failed to extract coordinates');
                return;
            }

            const isPolyline = editMode === 'mainPipe' || editMode === 'subMainPipe';
            const isValidForPolyline = isPolyline && coordinates.length >= 2;
            const isValidForPolygon = !isPolyline && coordinates.length >= 3;

            if (!isValidForPolyline && !isValidForPolygon) {
                console.error('❌ Invalid coordinates for mode:', editMode);
                return;
            }

            if (history.present.mainArea.length === 0) {
                console.log('🎯 Creating main area');
                const center = coordinates.reduce(
                    (acc, point) => [acc[0] + point.lat, acc[1] + point.lng],
                    [0, 0]
                );
                setMapCenter([center[0] / coordinates.length, center[1] / coordinates.length]);
                pushToHistory({ mainArea: coordinates });
                return;
            }

            if (editMode === 'zone') {
                const zoneArea = calculateAreaFromCoordinates(coordinates);
                const plantDataForZone = history.present.selectedPlantType;
                const estimatedPlantCount = calculatePlantCount(
                    zoneArea,
                    plantDataForZone.plantSpacing,
                    plantDataForZone.rowSpacing
                );
                const estimatedWaterNeed = estimatedPlantCount * plantDataForZone.waterNeed;

                const newZone: Zone = {
                    id: generateUniqueId('zone'),
                    name: `โซน ${history.present.zones.length + 1}`,
                    coordinates,
                    plantData: plantDataForZone,
                    plantCount: estimatedPlantCount,
                    totalWaterNeed: estimatedWaterNeed,
                    area: zoneArea,
                    color: getZoneColor(history.present.zones.length),
                    isCustomPlant: plantDataForZone.category === 'กำหนดเอง',
                };

                pushToHistory({ zones: [...history.present.zones, newZone] });
                setEditMode(null);
                console.log(`✅ Zone created: ${newZone.name}`);
            } else if (editMode === 'exclusion') {
                const newExclusion: ExclusionArea = {
                    id: generateUniqueId('exclusion'),
                    type: selectedExclusionType,
                    coordinates,
                    name: `${selectedExclusionType} ${history.present.exclusionAreas.filter((e) => e.type === selectedExclusionType).length + 1}`,
                    color: EXCLUSION_COLORS[selectedExclusionType],
                };

                pushToHistory({
                    exclusionAreas: [...history.present.exclusionAreas, newExclusion],
                });
                setEditMode(null);
                console.log(`✅ Exclusion area created: ${newExclusion.name}`);
            } else if (editMode === 'mainPipe' && history.present.pump && drawingMainPipe.toZone) {
                const pipeLength = calculatePipeLength(coordinates);
                const newMainPipe: MainPipe = {
                    id: generateUniqueId('mainpipe'),
                    fromPump: history.present.pump.id,
                    toZone: drawingMainPipe.toZone,
                    coordinates,
                    length: pipeLength,
                    diameter: 100,
                };

                pushToHistory({ mainPipes: [...history.present.mainPipes, newMainPipe] });
                setDrawingMainPipe({ toZone: null });
                setEditMode(null);
                console.log(`✅ Main pipe created: ${pipeLength.toFixed(2)}m`);
            } else if (editMode === 'subMainPipe') {
                console.log(
                    '🔩 Creating sub-main pipe with COMPLETE COVERAGE branch generation...'
                );

                const pipeLength = calculatePipeLength(coordinates);
                const targetZone = selectedZone || {
                    id: 'main-area',
                    name: 'พื้นที่หลัก',
                    coordinates: history.present.mainArea,
                    plantData: history.present.selectedPlantType,
                    plantCount: 0,
                    totalWaterNeed: 0,
                    area: calculateAreaFromCoordinates(history.present.mainArea),
                    color: '#4ECDC4',
                };

                const branchPipes = generateBranchPipes(
                    coordinates,
                    targetZone,
                    targetZone.plantData,
                    history.present.exclusionAreas,
                    history.present.mainArea,
                    history.present.useZones
                );

                const newSubMainPipe: SubMainPipe = {
                    id: generateUniqueId('submainpipe'),
                    zoneId: targetZone.id,
                    coordinates,
                    length: pipeLength,
                    diameter: 75,
                    branchPipes,
                };

                const newPlants = branchPipes.flatMap((pipe) => pipe.plants);

                const utilizationStats = branchPipes.map((pipe) => {
                    const endPlantBuffer = targetZone.plantData.plantSpacing * 0.3;
                    const theoreticalMaxLength = pipe.length + endPlantBuffer;
                    const actualUtilization = (pipe.length / theoreticalMaxLength) * 100;
                    return actualUtilization;
                });

                const avgUtilization =
                    utilizationStats.length > 0
                        ? utilizationStats.reduce((sum, util) => sum + util, 0) /
                          utilizationStats.length
                        : 0;

                const areaUtilizationStats = {
                    totalBranches: branchPipes.length,
                    averageUtilization: avgUtilization,
                    maxUtilization: utilizationStats.length > 0 ? Math.max(...utilizationStats) : 0,
                    minUtilization: utilizationStats.length > 0 ? Math.min(...utilizationStats) : 0,
                };

                pushToHistory({
                    subMainPipes: [...history.present.subMainPipes, newSubMainPipe],
                    plants: [...history.present.plants, ...newPlants],
                    areaUtilizationStats,
                });

                console.log(
                    `✅ COMPLETE COVERAGE: ${branchPipes.length} branches, ${newPlants.length} plants in ${targetZone.name}`
                );
                console.log(
                    `📊 COMPLETE COVERAGE utilization: ${avgUtilization.toFixed(1)}% average`
                );

                setEditMode(null);
                setSelectedZone(null);
            }

            if (featureGroupRef.current) {
                featureGroupRef.current.removeLayer(layer);
            }
        },
        [
            history.present.mainArea,
            editMode,
            history.present.selectedPlantType,
            history.present.zones,
            selectedExclusionType,
            history.present.exclusionAreas,
            history.present.pump,
            drawingMainPipe,
            selectedZone,
            history.present.useZones,
            history.present.subMainPipes,
            history.present.plants,
            pushToHistory,
        ]
    );

    const handleSaveProject = useCallback(() => {
        if (!history.present.pump || history.present.mainArea.length === 0) {
            return;
        }

        const projectData = {
            projectName,
            version: '3.0.0',
            totalArea,
            mainArea: history.present.mainArea,
            pump: history.present.pump,
            zones: history.present.zones,
            mainPipes: history.present.mainPipes,
            subMainPipes: history.present.subMainPipes,
            exclusionAreas: history.present.exclusionAreas,
            plants: history.present.plants,
            useZones: history.present.useZones,
            areaUtilizationStats: history.present.areaUtilizationStats,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        try {
            localStorage.setItem('horticultureIrrigationData', JSON.stringify(projectData));
            console.log(`✅ COMPLETE COVERAGE: Project saved with enhanced branch system`);
            router.visit('/horticulture/results');
        } catch (error) {
            console.error('❌ Save failed:', error);
        }
    }, [
        history.present.pump,
        history.present.mainArea,
        projectName,
        totalArea,
        history.present.zones,
        history.present.mainPipes,
        history.present.subMainPipes,
        history.present.exclusionAreas,
        history.present.plants,
        history.present.useZones,
        history.present.areaUtilizationStats,
    ]);

    const canSaveProject = history.present.pump && history.present.mainArea.length > 0;

    const { t } = useLanguage();

    return (
        <div className="min-h-screen overflow-hidden bg-gray-900 p-6 text-white">
            <div className="mx-auto w-full">
                {/* Header with Language Switcher */}
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold">
                        <FaTree color="green" /> ระบบออกแบบระบบน้ำพืชสวน
                    </h1>
                    <LanguageSwitcher />
                </div>

                {/* Step-by-Step Progress Indicator */}
                <div className="mb-8">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-300">
                            ขั้นตอนที่ {currentStep} จาก {steps.length}:{' '}
                            {steps[currentStep - 1].name}
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrevStep}
                                disabled={currentStep === 1}
                                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                    currentStep === 1
                                        ? 'cursor-not-allowed bg-gray-700 text-gray-500'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                ← ก่อนหน้า
                            </button>
                            <button
                                onClick={handleNextStep}
                                disabled={!canProceedToStep(currentStep + 1)}
                                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                    !canProceedToStep(currentStep + 1)
                                        ? 'cursor-not-allowed bg-gray-700 text-gray-500'
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                            >
                                ถัดไป →
                            </button>
                        </div>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => {
                            const status = getStepStatus(step.id);
                            const isClickable = canProceedToStep(step.id);

                            return (
                                <div key={step.id} className="flex items-center">
                                    <button
                                        onClick={() => handleStepClick(step.id)}
                                        disabled={!isClickable}
                                        className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${
                                            status === 'completed'
                                                ? 'bg-green-600 text-white hover:bg-green-700'
                                                : status === 'active'
                                                  ? 'bg-blue-600 text-white'
                                                  : isClickable
                                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                    : 'cursor-not-allowed bg-gray-800 text-gray-500'
                                        }`}
                                    >
                                        <span className="text-lg">{step.icon}</span>
                                        <div className="text-left">
                                            <div className="font-medium">{step.name}</div>
                                            <div className="text-xs opacity-75">
                                                {step.description}
                                            </div>
                                        </div>
                                    </button>

                                    {index < steps.length - 1 && (
                                        <div
                                            className={`mx-2 h-0.5 w-8 ${
                                                status === 'completed'
                                                    ? 'bg-green-600'
                                                    : 'bg-gray-600'
                                            }`}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    <div className="h-[88vh] space-y-6 overflow-y-auto lg:col-span-1">
                        {/* Project Info - Always Visible */}
                        <div className="rounded-lg bg-gray-800 p-4">
                            <h3 className="mb-3 text-lg font-semibold">📊 ข้อมูลโครงการ</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        ชื่อโครงการ
                                    </label>
                                    <input
                                        type="text"
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="text-sm text-gray-300">
                                    <div className="flex justify-between">
                                        <span>พื้นที่รวม:</span>
                                        <span className="font-medium">{formatArea(totalArea)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>จำนวนโซน:</span>
                                        <span className="font-medium">
                                            {history.present.useZones
                                                ? history.present.zones.length
                                                : 1}{' '}
                                            โซน
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>ต้นไม้จริง:</span>
                                        <span className="font-medium text-green-400">
                                            ✅ {actualTotalPlants} ต้น
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>น้ำจริงต่อครั้ง:</span>
                                        <span className="font-medium text-blue-400">
                                            ✅ {formatWaterVolume(actualTotalWaterNeed)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 1: Main Area */}
                        {currentStep === 1 && (
                            <div className="rounded-lg bg-blue-900/30 p-4">
                                <h3 className="mb-3 text-lg font-semibold text-blue-400">
                                    🗺️ ขั้นตอนที่ 1: วาดพื้นที่หลัก
                                </h3>
                                <p className="mb-4 text-sm text-blue-200">
                                    วาดพื้นที่หลักของโครงการบนแผนที่ ใช้เครื่องมือวาดด้านขวา
                                </p>
                                <div className="space-y-3">
                                    <div className="rounded bg-blue-800/50 p-3">
                                        <h4 className="mb-2 font-medium text-blue-300">วิธีการ:</h4>
                                        <ul className="space-y-1 text-xs text-blue-200">
                                            <li>• คลิกที่เครื่องมือวาดด้านขวา</li>
                                            <li>• วาดรูปหลายเหลี่ยมรอบพื้นที่</li>
                                            <li>• คลิก "ถัดไป" เมื่อเสร็จ</li>
                                        </ul>
                                    </div>
                                    {history.present.mainArea.length > 0 && (
                                        <div className="rounded bg-green-800/50 p-3">
                                            <div className="flex items-center gap-2 text-green-300">
                                                <span>✅</span>
                                                <span className="font-medium">
                                                    วาดพื้นที่เสร็จแล้ว
                                                </span>
                                            </div>
                                            <div className="mt-1 text-xs text-green-200">
                                                ขนาด: {formatArea(totalArea)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Plants and Zones */}
                        {currentStep === 2 && (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-green-900/30 p-4">
                                    <h3 className="mb-3 text-lg font-semibold text-green-400">
                                        🌱 ขั้นตอนที่ 2: เลือกพืชและโซน
                                    </h3>
                                    <p className="mb-4 text-sm text-green-200">
                                        เลือกชนิดพืชและกำหนดโซนการปลูก
                                    </p>
                                </div>

                                {/* Zone Configuration */}
                                <div className="rounded-lg bg-gray-800 p-4">
                                    <h3 className="mb-3 text-lg font-semibold">🏞️ การจัดการโซน</h3>
                                    <div className="space-y-4">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={history.present.useZones}
                                                onChange={(e) =>
                                                    pushToHistory({ useZones: e.target.checked })
                                                }
                                                className="rounded border-gray-600 bg-gray-700 text-blue-500"
                                            />
                                            <span className="text-sm">แบ่งเป็นหลายโซน</span>
                                        </label>
                                        {!history.present.useZones && (
                                            <div className="rounded bg-yellow-900/20 p-2 text-xs text-yellow-400">
                                                จะใช้พื้นที่ทั้งหมดเป็นโซนเดียว
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Plant Management */}
                                <div className="rounded-lg bg-gray-800 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="text-lg font-semibold">🌿 การจัดการพืช</h3>
                                        <button
                                            onClick={() => handleCreateCustomPlant()}
                                            className="rounded bg-purple-600 px-3 py-1 text-sm transition-colors hover:bg-purple-700"
                                        >
                                            ➕ สร้างพืชใหม่
                                        </button>
                                    </div>

                                    {!history.present.useZones && (
                                        <div className="space-y-3">
                                            <label className="mb-2 block text-sm font-medium">
                                                เลือกชนิดพืช (โซนเดียว)
                                            </label>
                                            <select
                                                value={history.present.selectedPlantType.id}
                                                onChange={(e) => {
                                                    const plantType =
                                                        history.present.availablePlants.find(
                                                            (p) => p.id === Number(e.target.value)
                                                        );
                                                    if (plantType) {
                                                        pushToHistory({
                                                            selectedPlantType: plantType,
                                                        });
                                                    }
                                                }}
                                                className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                {history.present.availablePlants.map((plant) => (
                                                    <option key={plant.id} value={plant.id}>
                                                        {plant.category === 'กำหนดเอง'
                                                            ? '🔧'
                                                            : '🌱'}{' '}
                                                        {plant.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="text-sm text-gray-300">
                                                <div className="flex justify-between">
                                                    <span>ระยะห่างต้น:</span>
                                                    <span>
                                                        {
                                                            history.present.selectedPlantType
                                                                .plantSpacing
                                                        }{' '}
                                                        ม.
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>ระยะห่างแถว:</span>
                                                    <span>
                                                        {
                                                            history.present.selectedPlantType
                                                                .rowSpacing
                                                        }{' '}
                                                        ม.
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>น้ำต่อต้น:</span>
                                                    <span>
                                                        {
                                                            history.present.selectedPlantType
                                                                .waterNeed
                                                        }{' '}
                                                        ล./ครั้ง
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Zone Plant List */}
                                    {history.present.useZones &&
                                        history.present.zones.length > 0 && (
                                            <div className="space-y-2">
                                                <div className="text-sm font-medium text-gray-300">
                                                    พืชในแต่ละโซน:
                                                </div>
                                                <div className="max-h-48 space-y-2 overflow-y-auto">
                                                    {history.present.zones.map((zone) => (
                                                        <div
                                                            key={zone.id}
                                                            className="rounded bg-gray-700 p-3"
                                                        >
                                                            <div className="mb-2 flex items-center justify-between">
                                                                <span className="font-medium">
                                                                    {zone.name}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <div
                                                                        className="h-4 w-4 rounded"
                                                                        style={{
                                                                            backgroundColor:
                                                                                zone.color,
                                                                        }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                            <div className="text-sm text-gray-300">
                                                                <div className="flex items-center gap-2">
                                                                    <span>
                                                                        {zone.isCustomPlant
                                                                            ? '🌱'
                                                                            : '🌱'}{' '}
                                                                        {zone.plantData.name}
                                                                    </span>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleZonePlantSelection(
                                                                                zone
                                                                            )
                                                                        }
                                                                        className="ml-auto rounded bg-blue-600 px-2 py-1 text-xs transition-colors hover:bg-blue-700"
                                                                    >
                                                                        เปลี่ยน
                                                                    </button>
                                                                </div>
                                                                <div className="mt-1 text-xs text-gray-400">
                                                                    {zone.plantData.plantSpacing}×
                                                                    {zone.plantData.rowSpacing}ม. |{' '}
                                                                    {zone.plantData.waterNeed}
                                                                    ล./ครั้ง
                                                                </div>
                                                                <div className="text-xs text-gray-400">
                                                                    ประมาณ:{' '}
                                                                    {zone.plantCount.toLocaleString()}{' '}
                                                                    ต้น
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Pump */}
                        {currentStep === 3 && (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-blue-900/30 p-4">
                                    <h3 className="mb-3 text-lg font-semibold text-blue-400">
                                        🚰 ขั้นตอนที่ 3: วางปั๊มน้ำ
                                    </h3>
                                    <p className="mb-4 text-sm text-blue-200">
                                        วางปั๊มน้ำในตำแหน่งที่เหมาะสม
                                    </p>
                                </div>

                                <div className="rounded-lg bg-gray-800 p-4">
                                    <h3 className="mb-3 text-lg font-semibold">🚰 ปั๊มน้ำ</h3>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => {
                                                const newMode = editMode === 'pump' ? null : 'pump';
                                                setEditMode(newMode);
                                            }}
                                            className={`w-full rounded px-4 py-2 text-white transition-colors ${
                                                editMode === 'pump'
                                                    ? 'bg-blue-600'
                                                    : 'bg-blue-500 hover:bg-blue-600'
                                            }`}
                                        >
                                            {history.present.pump
                                                ? editMode === 'pump'
                                                    ? '⏹ หยุดวางปั๊ม'
                                                    : '🔄 เปลี่ยนตำแหน่งปั๊ม'
                                                : editMode === 'pump'
                                                  ? '⏹ หยุดวางปั๊ม'
                                                  : '🚰 วางปั๊มน้ำ'}
                                        </button>

                                        {history.present.pump && (
                                            <div className="rounded bg-green-800/50 p-3">
                                                <div className="flex items-center gap-2 text-green-300">
                                                    <span>✅</span>
                                                    <span className="font-medium">
                                                        วางปั๊มเสร็จแล้ว
                                                    </span>
                                                </div>
                                                <div className="mt-1 text-xs text-green-200">
                                                    ประเภท: {history.present.pump.type}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Pipes */}
                        {currentStep === 4 && (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-purple-900/30 p-4">
                                    <h3 className="mb-3 text-lg font-semibold text-purple-400">
                                        🔧 ขั้นตอนที่ 4: วางท่อน้ำ
                                    </h3>
                                    <p className="mb-4 text-sm text-purple-200">
                                        วางท่อเมนและท่อย่อยเพื่อกระจายน้ำ
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() =>
                                            setEditMode(editMode === 'mainPipe' ? null : 'mainPipe')
                                        }
                                        disabled={
                                            !history.present.pump ||
                                            (history.present.useZones &&
                                                history.present.zones.length === 0)
                                        }
                                        className={`w-full rounded px-4 py-2 text-white transition-colors ${
                                            !history.present.pump ||
                                            (history.present.useZones &&
                                                history.present.zones.length === 0)
                                                ? 'cursor-not-allowed bg-gray-600'
                                                : editMode === 'mainPipe'
                                                  ? 'bg-green-600'
                                                  : 'bg-green-500 hover:bg-green-600'
                                        }`}
                                    >
                                        {editMode === 'mainPipe'
                                            ? '⏹ หยุดวางท่อเมน'
                                            : '🔧 วางท่อเมน'}
                                    </button>

                                    <button
                                        onClick={() =>
                                            setEditMode(
                                                editMode === 'subMainPipe' ? null : 'subMainPipe'
                                            )
                                        }
                                        disabled={
                                            (history.present.useZones &&
                                                history.present.zones.length === 0) ||
                                            (!history.present.useZones &&
                                                history.present.mainArea.length === 0)
                                        }
                                        className={`w-full rounded px-4 py-2 text-white transition-colors ${
                                            (history.present.useZones &&
                                                history.present.zones.length === 0) ||
                                            (!history.present.useZones &&
                                                history.present.mainArea.length === 0)
                                                ? 'cursor-not-allowed bg-gray-600'
                                                : editMode === 'subMainPipe'
                                                  ? 'bg-purple-600'
                                                  : 'bg-purple-500 hover:bg-purple-600'
                                        }`}
                                    >
                                        {editMode === 'subMainPipe'
                                            ? '⏹ หยุดวางท่อเมนรอง'
                                            : '🔧 วางท่อเมนรอง + ท่อย่อยปลาย'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Save and Continue */}
                        {currentStep === 5 && (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-green-900/30 p-4">
                                    <h3 className="mb-3 text-lg font-semibold text-green-400">
                                        💾 ขั้นตอนที่ 5: บันทึกและดูผลลัพธ์
                                    </h3>
                                    <p className="mb-4 text-sm text-green-200">
                                        บันทึกโครงการและดูผลลัพธ์การออกแบบ
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={handleSaveProject}
                                        disabled={!canSaveProject}
                                        className={`w-full rounded px-4 py-3 font-semibold text-white transition-colors ${
                                            canSaveProject
                                                ? 'bg-green-600 hover:bg-green-700'
                                                : 'cursor-not-allowed bg-gray-600'
                                        }`}
                                    >
                                        💾 บันทึกและดูผลลัพธ์
                                    </button>

                                    {canSaveProject && (
                                        <div className="rounded bg-green-800/50 p-3">
                                            <div className="flex items-center gap-2 text-green-300">
                                                <span>✅</span>
                                                <span className="font-medium">
                                                    พร้อมบันทึกและดูผลลัพธ์
                                                </span>
                                            </div>
                                            <div className="mt-1 text-xs text-green-200">
                                                คลิกปุ่มด้านบนเพื่อบันทึกและไปยังหน้าผลลัพธ์
                                            </div>
                                        </div>
                                    )}

                                    {!canSaveProject && (
                                        <div className="rounded bg-yellow-800/50 p-3">
                                            <div className="flex items-center gap-2 text-yellow-300">
                                                <span>⚠️</span>
                                                <span className="font-medium">
                                                    ยังไม่พร้อมบันทึก
                                                </span>
                                            </div>
                                            <div className="mt-1 text-xs text-yellow-200">
                                                ต้องมีพื้นที่หลักและปั๊มน้ำก่อนบันทึกได้
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Advanced Controls - Collapsible */}
                        <div className="rounded-lg bg-gray-800 p-4">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex w-full items-center justify-between text-left"
                            >
                                <h3 className="text-lg font-semibold">⚙️ ตัวเลือกขั้นสูง</h3>
                                <svg
                                    className={`h-5 w-5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>

                            {showAdvanced && (
                                <div className="mt-4 space-y-4">
                                    {/* Undo/Redo Controls */}
                                    <div className="rounded-lg bg-gray-700 p-3">
                                        <h4 className="mb-2 text-sm font-medium">🔄 การควบคุม</h4>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleUndo}
                                                disabled={history.past.length === 0}
                                                className={`flex-1 rounded px-3 py-2 text-sm transition-colors ${
                                                    history.past.length === 0
                                                        ? 'cursor-not-allowed bg-gray-600 text-gray-400'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                            >
                                                <FaUndo className="mr-2 inline" />
                                                ย้อนกลับ
                                            </button>
                                            <button
                                                onClick={handleRedo}
                                                disabled={history.future.length === 0}
                                                className={`flex-1 rounded px-3 py-2 text-sm transition-colors ${
                                                    history.future.length === 0
                                                        ? 'cursor-not-allowed bg-gray-600 text-gray-400'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                            >
                                                <FaRedo className="mr-2 inline" />
                                                ไปข้างหน้า
                                            </button>
                                        </div>
                                    </div>

                                    {/* Exclusion Areas */}
                                    <div className="rounded-lg bg-gray-700 p-3">
                                        <h4 className="mb-2 text-sm font-medium">
                                            🚫 พื้นที่ต้องหลีกเลี่ยง
                                        </h4>
                                        <div className="space-y-2">
                                            <select
                                                value={selectedExclusionType}
                                                onChange={(e) =>
                                                    setSelectedExclusionType(
                                                        e.target
                                                            .value as keyof typeof EXCLUSION_COLORS
                                                    )
                                                }
                                                className="w-full rounded bg-gray-600 px-3 py-2 text-white focus:outline-none"
                                            >
                                                <option value="building">สิ่งก่อสร้าง</option>
                                                <option value="powerplant">โรงไฟฟ้า</option>
                                                <option value="river">แหล่งน้ำ</option>
                                                <option value="road">ถนน</option>
                                                <option value="other">อื่นๆ</option>
                                            </select>
                                            <button
                                                onClick={() =>
                                                    setEditMode(
                                                        editMode === 'exclusion'
                                                            ? null
                                                            : 'exclusion'
                                                    )
                                                }
                                                className={`w-full rounded px-3 py-2 text-white transition-colors ${
                                                    editMode === 'exclusion'
                                                        ? 'bg-orange-600'
                                                        : 'bg-orange-500 hover:bg-orange-600'
                                                }`}
                                            >
                                                {editMode === 'exclusion'
                                                    ? '⏹ หยุดวาด'
                                                    : '🚫 วาดพื้นที่หลีกเลี่ยง'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Plant Placement */}
                                    <div className="rounded-lg bg-gray-700 p-3">
                                        <h4 className="mb-2 text-sm font-medium">🌱 วางต้นไม้</h4>
                                        <button
                                            onClick={() =>
                                                setEditMode(editMode === 'plant' ? null : 'plant')
                                            }
                                            disabled={history.present.mainArea.length === 0}
                                            className={`w-full rounded px-3 py-2 text-white transition-colors ${
                                                history.present.mainArea.length === 0
                                                    ? 'cursor-not-allowed bg-gray-600'
                                                    : editMode === 'plant'
                                                      ? 'bg-yellow-600'
                                                      : 'bg-yellow-500 hover:bg-yellow-600'
                                            }`}
                                        >
                                            {editMode === 'plant'
                                                ? '⏹ หยุดวางต้นไม้'
                                                : '🌱 วางต้นไม้แบบกดเลือก'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status Indicators - Always Visible */}
                        <div className="space-y-3">
                            {/* Step Progress */}
                            <div className="rounded-lg bg-gray-800 p-3">
                                <h4 className="mb-2 text-sm font-medium text-gray-300">
                                    📊 ความคืบหน้า
                                </h4>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span>พื้นที่หลัก:</span>
                                        <span
                                            className={
                                                history.present.mainArea.length > 0
                                                    ? 'text-green-400'
                                                    : 'text-gray-500'
                                            }
                                        >
                                            {history.present.mainArea.length > 0
                                                ? '✅ เสร็จแล้ว'
                                                : '⏳ รอวาด'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>ปั๊มน้ำ:</span>
                                        <span
                                            className={
                                                history.present.pump
                                                    ? 'text-green-400'
                                                    : 'text-gray-500'
                                            }
                                        >
                                            {history.present.pump ? '✅ วางแล้ว' : '⏳ รอวาง'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>ท่อน้ำ:</span>
                                        <span
                                            className={
                                                history.present.mainPipes.length > 0 ||
                                                history.present.subMainPipes.length > 0
                                                    ? 'text-green-400'
                                                    : 'text-gray-500'
                                            }
                                        >
                                            {history.present.mainPipes.length > 0 ||
                                            history.present.subMainPipes.length > 0
                                                ? '✅ วางแล้ว'
                                                : '⏳ รอวาง'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>ต้นไม้:</span>
                                        <span
                                            className={
                                                actualTotalPlants > 0
                                                    ? 'text-green-400'
                                                    : 'text-gray-500'
                                            }
                                        >
                                            {actualTotalPlants > 0
                                                ? `✅ ${actualTotalPlants} ต้น`
                                                : '⏳ รอวาง'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Utilization Stats */}
                            {history.present.areaUtilizationStats.totalBranches > 0 && (
                                <div className="rounded-lg border border-green-600/50 bg-green-900/30 p-3">
                                    <h4 className="mb-2 text-sm font-semibold text-green-400">
                                        🎯 การใช้พื้นที่
                                    </h4>
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span>ท่อย่อย:</span>
                                            <span className="font-medium text-green-300">
                                                {history.present.areaUtilizationStats.totalBranches}{' '}
                                                เส้น
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>การใช้พื้นที่เฉลี่ย:</span>
                                            <span className="font-bold text-green-300">
                                                {history.present.areaUtilizationStats.averageUtilization.toFixed(
                                                    1
                                                )}
                                                %
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Quick Stats */}
                            {(history.present.subMainPipes.length > 0 ||
                                history.present.mainPipes.length > 0 ||
                                history.present.plants.length > 0) && (
                                <div className="rounded-lg bg-gray-800 p-3">
                                    <h4 className="mb-2 text-sm font-semibold">📊 สถิติ</h4>
                                    <div className="space-y-1 text-xs text-gray-300">
                                        {history.present.mainPipes.length > 0 && (
                                            <div className="flex justify-between">
                                                <span>ท่อเมน:</span>
                                                <span>{history.present.mainPipes.length} เส้น</span>
                                            </div>
                                        )}
                                        {history.present.subMainPipes.length > 0 && (
                                            <div className="flex justify-between">
                                                <span>ท่อเมนรอง:</span>
                                                <span>
                                                    {history.present.subMainPipes.length} เส้น
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between border-t border-gray-600 pt-1">
                                            <span className="font-semibold">ต้นไม้:</span>
                                            <span className="font-bold text-green-400">
                                                {actualTotalPlants} ต้น
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-semibold">น้ำรวม:</span>
                                            <span className="font-bold text-blue-400">
                                                {formatWaterVolume(actualTotalWaterNeed)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Map */}
                    <div className="lg:col-span-3">
                        <div className="top-18 sticky z-10 h-[88vh]">
                            <div
                                ref={mapRef}
                                className="h-full w-full overflow-hidden rounded-lg border border-gray-700"
                            >
                                <MapContainer
                                    center={mapCenter}
                                    zoom={16}
                                    maxZoom={30}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <SearchControl onSearch={handleSearch} />

                                    <LayersControl position="topright">
                                        <LayersControl.BaseLayer checked name="ภาพถ่ายดาวเทียม">
                                            <TileLayer
                                                url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                                                attribution="Google Maps"
                                                maxZoom={30}
                                                maxNativeZoom={20}
                                            />
                                        </LayersControl.BaseLayer>
                                        <LayersControl.BaseLayer name="ภาพถ่าย + ป้ายชื่อ">
                                            <TileLayer
                                                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                                                attribution="Google Maps"
                                                maxZoom={30}
                                                maxNativeZoom={20}
                                            />
                                        </LayersControl.BaseLayer>
                                        <LayersControl.BaseLayer name="แผนที่ถนน">
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                attribution="OpenStreetMap"
                                                maxZoom={30}
                                                maxNativeZoom={19}
                                            />
                                        </LayersControl.BaseLayer>
                                    </LayersControl>

                                    <MapBounds positions={history.present.mainArea} />

                                    <MapClickHandler
                                        editMode={editMode}
                                        onPumpPlace={handlePumpPlace}
                                        onPlantPlace={handlePlantPlace}
                                    />

                                    {/* Main Area */}
                                    {history.present.mainArea.length > 0 && (
                                        <Polygon
                                            positions={history.present.mainArea.map((coord) => [
                                                coord.lat,
                                                coord.lng,
                                            ])}
                                            pathOptions={{
                                                color: '#22C55E',
                                                fillColor: '#22C55E',
                                                fillOpacity: 0.1,
                                                weight: 3,
                                            }}
                                            eventHandlers={{
                                                click: (e) => {
                                                    if (editMode === 'pump') {
                                                        e.originalEvent?.stopPropagation();
                                                        handlePumpPlace(e.latlng);
                                                    }
                                                },
                                            }}
                                        >
                                            <Popup>
                                                <div className="text-center">
                                                    <strong>พื้นที่หลัก</strong>
                                                    <br />
                                                    ขนาด: {formatArea(totalArea)}
                                                    <br />
                                                    <div className="text-xs text-green-600">
                                                        🎯 ท่อย่อยครอบคลุมจนปลาย
                                                        <br />✅ ต้นไม้กระจายตลอดความยาว
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Polygon>
                                    )}

                                    {/* Exclusion Areas */}
                                    {history.present.exclusionAreas.map((area) => (
                                        <Polygon
                                            key={area.id}
                                            positions={area.coordinates.map((coord) => [
                                                coord.lat,
                                                coord.lng,
                                            ])}
                                            pathOptions={{
                                                color: area.color,
                                                fillColor: area.color,
                                                fillOpacity: 0.4,
                                                weight: 2,
                                            }}
                                        >
                                            <Popup>
                                                <div className="text-center">
                                                    <strong>{area.name}</strong>
                                                    <br />
                                                    ประเภท: {area.type}
                                                </div>
                                            </Popup>
                                        </Polygon>
                                    ))}

                                    {/* Zones */}
                                    {history.present.useZones &&
                                        history.present.zones.map((zone) => (
                                            <Polygon
                                                key={zone.id}
                                                positions={zone.coordinates.map((coord) => [
                                                    coord.lat,
                                                    coord.lng,
                                                ])}
                                                pathOptions={{
                                                    color: zone.color,
                                                    fillColor: zone.color,
                                                    fillOpacity: 0.2,
                                                    weight: 2,
                                                }}
                                                eventHandlers={{
                                                    dblclick: () => handleZonePlantSelection(zone),
                                                }}
                                            >
                                                <Popup>
                                                    <div className="text-center">
                                                        <strong>{zone.name}</strong>
                                                        <br />
                                                        พืช: {zone.isCustomPlant ? '🔧' : '🌱'}{' '}
                                                        {zone.plantData.name}
                                                        <br />
                                                        ขนาด: {formatArea(zone.area)}
                                                        <br />
                                                        ประมาณ: {zone.plantCount.toLocaleString()}{' '}
                                                        ต้น
                                                        <br />
                                                        น้ำ:{' '}
                                                        {formatWaterVolume(zone.totalWaterNeed)}
                                                        <br />
                                                        <div className="text-xs text-green-600">
                                                            🎯 ท่อย่อยครอบคลุมปลาย
                                                            <br />✅ ใช้พื้นที่เต็มศักยภาพ
                                                        </div>
                                                        <div className="mt-2">
                                                            <button
                                                                onClick={() =>
                                                                    handleZonePlantSelection(zone)
                                                                }
                                                                className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                                                            >
                                                                เปลี่ยนพืช
                                                            </button>
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Polygon>
                                        ))}

                                    {/* Pump */}
                                    {history.present.pump && (
                                        <Marker
                                            position={[
                                                history.present.pump.position.lat,
                                                history.present.pump.position.lng,
                                            ]}
                                            icon={L.divIcon({
                                                html: `<div style="
                                            width: 36px;
                                            height: 36px;
                                            background: linear-gradient(135deg, #3B82F6, #1E40AF);
                                            border: 3px solid #ffffff;
                                            border-radius: 50%;
                                            box-shadow: 0 3px 12px rgba(0,0,0,0.4);
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            color: white;
                                            font-weight: bold;
                                            font-size: 14px;
                                        ">🚰</div>`,
                                                className: '',
                                                iconSize: [36, 36],
                                                iconAnchor: [18, 18],
                                            })}
                                        >
                                            <Popup>
                                                <div className="text-center">
                                                    <strong>ปั๊มน้ำ</strong>
                                                    <br />
                                                    ประเภท: {history.present.pump.type}
                                                    <br />
                                                    กำลัง: {history.present.pump.capacity} L/min
                                                    <br />
                                                    แรงดัน: {history.present.pump.head} ม.
                                                </div>
                                            </Popup>
                                        </Marker>
                                    )}

                                    {/* Main Pipes */}
                                    {history.present.mainPipes.map((pipe) => (
                                        <Polyline
                                            key={pipe.id}
                                            positions={pipe.coordinates.map((coord) => [
                                                coord.lat,
                                                coord.lng,
                                            ])}
                                            pathOptions={{
                                                color: '#3B82F6',
                                                weight: 6,
                                                opacity: 0.9,
                                            }}
                                            eventHandlers={{
                                                dblclick: () => handlePipeEdit(pipe, 'main'),
                                            }}
                                        >
                                            <Popup>
                                                <div className="text-center">
                                                    <strong>ท่อเมน</strong>
                                                    <br />
                                                    ความยาว: {pipe.length.toFixed(2)} ม.
                                                    <br />
                                                    เส้นผ่านศูนย์กลาง: {pipe.diameter} มม.
                                                    <br />
                                                    <div className="text-xs text-blue-600">
                                                        🎯 AUTO: เลือกจุดหมายอัตโนมัติ
                                                    </div>
                                                    <div className="mt-2">
                                                        <button
                                                            onClick={() =>
                                                                handlePipeEdit(pipe, 'main')
                                                            }
                                                            className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700"
                                                        >
                                                            <FaEdit className="mr-1 inline" />
                                                            แก้ไข
                                                        </button>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Polyline>
                                    ))}

                                    {/* Sub-Main Pipes and Branch Pipes */}
                                    {history.present.subMainPipes.map((pipe) => (
                                        <React.Fragment key={pipe.id}>
                                            <Polyline
                                                positions={pipe.coordinates.map((coord) => [
                                                    coord.lat,
                                                    coord.lng,
                                                ])}
                                                pathOptions={{
                                                    color: '#8B5CF6',
                                                    weight: 5,
                                                    opacity: 0.9,
                                                }}
                                                eventHandlers={{
                                                    dblclick: () => handlePipeEdit(pipe, 'subMain'),
                                                }}
                                            >
                                                <Popup>
                                                    <div className="text-center">
                                                        <strong>ท่อเมนรอง</strong>
                                                        <br />
                                                        ความยาว: {pipe.length.toFixed(2)} ม.
                                                        <br />
                                                        ท่อย่อย: {pipe.branchPipes.length} เส้น
                                                        <br />
                                                        ต้นไม้:{' '}
                                                        {pipe.branchPipes.reduce(
                                                            (sum, branch) =>
                                                                sum + branch.plants.length,
                                                            0
                                                        )}{' '}
                                                        ต้น
                                                        <br />
                                                        <div className="text-xs text-green-600">
                                                            🎯 ครอบคลุมจนปลาย submain
                                                            <br />✅ ใช้พื้นที่สูงสุด &gt;95%
                                                        </div>
                                                        <div className="mt-2">
                                                            <button
                                                                onClick={() =>
                                                                    handlePipeEdit(pipe, 'subMain')
                                                                }
                                                                className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700"
                                                            >
                                                                <FaEdit className="mr-1 inline" />
                                                                แก้ไข
                                                            </button>
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Polyline>

                                            {/* Branch Pipes */}
                                            {pipe.branchPipes.map((branchPipe) => (
                                                <Polyline
                                                    key={branchPipe.id}
                                                    positions={branchPipe.coordinates.map(
                                                        (coord) => [coord.lat, coord.lng]
                                                    )}
                                                    pathOptions={{
                                                        color: '#10B981',
                                                        weight: 2,
                                                        opacity: 0.8,
                                                    }}
                                                    eventHandlers={{
                                                        dblclick: () =>
                                                            handlePipeEdit(branchPipe, 'branch'),
                                                    }}
                                                >
                                                    <Popup>
                                                        <div className="text-center">
                                                            <strong>ท่อย่อย</strong>
                                                            <br />
                                                            ความยาว: {branchPipe.length.toFixed(
                                                                2
                                                            )}{' '}
                                                            ม.
                                                            <br />
                                                            ต้นไม้: {branchPipe.plants.length} ต้น
                                                            <br />
                                                            <div className="text-xs text-green-600">
                                                                🎯 ครอบคลุมปลาย submain
                                                                <br />✅ การใช้พื้นที่เต็มที่
                                                            </div>
                                                            <div className="mt-2">
                                                                <button
                                                                    onClick={() =>
                                                                        handlePipeEdit(
                                                                            branchPipe,
                                                                            'branch'
                                                                        )
                                                                    }
                                                                    className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700"
                                                                >
                                                                    <FaEdit className="mr-1 inline" />
                                                                    แก้ไข
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </Popup>
                                                </Polyline>
                                            ))}
                                        </React.Fragment>
                                    ))}

                                    {/* Plants */}
                                    {history.present.plants.map((plant) => (
                                        <Marker
                                            key={plant.id}
                                            position={[plant.position.lat, plant.position.lng]}
                                            icon={L.divIcon({
                                                html: `<div style="
                                            width: 24px;
                                            height: 24px;
                                        "><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAABlklEQVR4nI1TW0sCQRTel/plqSlGEUTPQRqRRBSE9tJDd7tApVI+VERRWcvMbNkFDArsSsLOZV8q+yXFiZ20dtdZaeB7OXO+M+d88x1N8xwhCq0WJZ2C4Zyg+FSC4ayMiUKr1uxwTqKC4apgBJSg5N1iKKIkM4aHOSVfvuQaajmJhpe5gvxQ2YPHyr6yiEWN8O/MgpJ3Z8L+zTTMFPth4CgokS8l4ex+1VMIf0hNLGZ0OS9MU4fBQjvEDtsaoJcX3Z2YqEOTatcClOowjnqU5DpQefmvACMZjVNSrAeun/Ku5GQuAFPLIUjlgjC88xPD5RXHr+BTTVBy5uwghXohftAG4xsBWJpph42JMCR2A5I8pnd7BTXsEbJeDexOZosxmEuHYG0yDGtXIzB/HofSc96tgT2CJV2n/G9A26NwnO7z9wQnUe3lZbOFU/ymSrjcSsLJgl8BXP21tsVQRGWku4sM3CL319XwybkRdC8RI4l/W5niIeU+2Pb0G+dHNPzKTRRqupFSExN12ArX15lTvG7H7Dsv4Rsa94hVuqmogAAAAABJRU5ErkJggg==" alt="tree"></div>`,
                                                className: '',
                                                iconSize: [24, 24],
                                                iconAnchor: [12, 12],
                                            })}
                                            eventHandlers={{
                                                dblclick: () => handlePlantEdit(plant),
                                            }}
                                        >
                                            <Popup>
                                                <div className="text-center">
                                                    <strong>{plant.plantData.name}</strong>
                                                    <br />
                                                    น้ำ: {plant.plantData.waterNeed} ล./ครั้ง
                                                    <br />
                                                    ระยะปลูก: {plant.plantData.plantSpacing}×
                                                    {plant.plantData.rowSpacing} ม.
                                                    <br />
                                                    <div className="text-xs text-green-600">
                                                        🎯 กระจายตลอดความยาวท่อ
                                                        <br />
                                                        ✅ ระยะห่างจากขอบเหมาะสม
                                                        <br />✅ ครอบคลุมจนปลาย submain
                                                    </div>
                                                    <div className="mt-2">
                                                        <button
                                                            onClick={() => handlePlantEdit(plant)}
                                                            className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700"
                                                        >
                                                            <FaEdit className="mr-1 inline" />
                                                            แก้ไข
                                                        </button>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}

                                    {/* Drawing Controls */}
                                    <FeatureGroup ref={featureGroupRef}>
                                        <EditControl
                                            position="topright"
                                            onCreated={onCreated}
                                            draw={{
                                                rectangle:
                                                    editMode === 'zone' ||
                                                    editMode === 'exclusion' ||
                                                    !editMode,
                                                circle:
                                                    editMode === 'zone' ||
                                                    editMode === 'exclusion' ||
                                                    !editMode,
                                                polygon:
                                                    editMode === 'zone' ||
                                                    editMode === 'exclusion' ||
                                                    !editMode,
                                                polyline:
                                                    editMode === 'mainPipe' ||
                                                    editMode === 'subMainPipe',
                                                marker: false,
                                                circlemarker: false,
                                            }}
                                        />
                                    </FeatureGroup>
                                </MapContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals */}
                <CustomPlantModal
                    isOpen={showCustomPlantModal}
                    onClose={() => {
                        setShowCustomPlantModal(false);
                        setEditingPlant(null);
                    }}
                    onSave={handleSaveCustomPlant}
                    defaultValues={editingPlant || undefined}
                />

                <ZonePlantSelectionModal
                    isOpen={showZonePlantModal}
                    onClose={() => {
                        setShowZonePlantModal(false);
                        setSelectedZoneForPlant(null);
                    }}
                    zone={selectedZoneForPlant}
                    availablePlants={history.present.availablePlants}
                    onSave={handleSaveZonePlant}
                    onCreateCustomPlant={() => {
                        setShowZonePlantModal(false);
                        handleCreateCustomPlant();
                    }}
                />

                <PlantEditModal
                    isOpen={showPlantEditModal}
                    onClose={() => {
                        setShowPlantEditModal(false);
                        setSelectedPlantForEdit(null);
                    }}
                    plant={selectedPlantForEdit}
                    onSave={handlePlantSave}
                    onDelete={handlePlantDelete}
                    availablePlants={history.present.availablePlants}
                />

                <PipeEditModal
                    isOpen={showPipeEditModal}
                    onClose={() => {
                        setShowPipeEditModal(false);
                        setSelectedPipeForEdit(null);
                    }}
                    pipe={selectedPipeForEdit}
                    onSave={handlePipeSave}
                    onDelete={handlePipeDelete}
                    type={selectedPipeType}
                />
            </div>
            {/* Footer */}
            <Footer />
        </div>
    );
}
