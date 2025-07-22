// resources/js/pages/home-garden-planner.tsx
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, FeatureGroup, LayersControl, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { router } from '@inertiajs/react';
import L from 'leaflet';

import {
    Coordinate,
    CanvasCoordinate,
    GardenZone,
    Sprinkler,
    WaterSource,
    Pipe,
    GardenPlannerData,
    ZONE_TYPES,
    SPRINKLER_TYPES,
    DEFAULT_CENTER,
    CANVAS_DEFAULT_WIDTH,
    CANVAS_DEFAULT_HEIGHT,
    CANVAS_DEFAULT_SCALE,
    CANVAS_GRID_SIZE,
    calculatePolygonArea,
    calculateDistance,
    formatArea,
    isPointInPolygon,
    canvasToGPS,
    getValidScale,
    loadGardenData,
    clearGardenData,
} from '../utils/homeGardenData';

// Types
type LatLng = {
    lat: number;
    lng: number;
};

interface HistoryState {
    gardenZones: GardenZone[];
    sprinklers: Sprinkler[];
    waterSource: WaterSource | null;
    pipes: Pipe[];
    timestamp: number;
}

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

const MapController: React.FC<{ center: [number, number] }> = ({ center }) => {
    const map = useMap();

    useEffect(() => {
        if (map && center) {
            map.flyTo(center, map.getZoom(), {
                animate: false,
                duration: 0.1,
            });
        }
    }, [center, map]);

    return null;
};

export default function HomeGardenPlanner() {
    const [designMode, setDesignMode] = useState<'map' | 'canvas' | 'image' | null>(null);
    const [activeTab, setActiveTab] = useState<'zones' | 'sprinklers' | 'pipes'>('zones');
    const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
    const [selectedZoneType, setSelectedZoneType] = useState<string>('grass');
    const [selectedZoneForConfig, setSelectedZoneForConfig] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<
        'draw' | 'place' | 'edit' | 'auto-place' | 'drag-sprinkler' | 'view' | 'edit-pipe' | ''
    >('view');

    const [gardenZones, setGardenZones] = useState<GardenZone[]>([]);
    const [sprinklers, setSprinklers] = useState<Sprinkler[]>([]);
    const [waterSource, setWaterSource] = useState<WaterSource | null>(null);
    const [pipes, setPipes] = useState<Pipe[]>([]);
    const [selectedSprinkler, setSelectedSprinkler] = useState<string | null>(null);
    const [selectedPipes, setSelectedPipes] = useState<Set<string>>(new Set());

    // New state for pipe editing
    const [pipeEditMode, setPipeEditMode] = useState<'add' | 'remove' | 'view'>('view');
    const [selectedSprinklersForPipe, setSelectedSprinklersForPipe] = useState<string[]>([]);

    const [manualSprinklerType, setManualSprinklerType] = useState<string>('pop-up-sprinkler');
    const [manualSprinklerRadius, setManualSprinklerRadius] = useState<number>(4);

    const [showValidationErrors, setShowValidationErrors] = useState<boolean>(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [history, setHistory] = useState<HistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isRestoringFromHistory, setIsRestoringFromHistory] = useState(false);

    const [imageData, setImageData] = useState<any>(null);
    const [canvasData, setCanvasData] = useState({
        width: CANVAS_DEFAULT_WIDTH,
        height: CANVAS_DEFAULT_HEIGHT,
        scale: CANVAS_DEFAULT_SCALE,
        gridSize: CANVAS_GRID_SIZE,
    });

    // Loading and error states for pipe generation
    const [isGeneratingPipes, setIsGeneratingPipes] = useState(false);
    const [pipeGenerationError, setPipeGenerationError] = useState<string | null>(null);

    // Additional state variables
    const [area, setArea] = useState<Coordinate[]>([]);
    const [sprinklerRadius, setSprinklerRadius] = useState<number>(4);
    const [error, setError] = useState<string | null>(null);
    const featureGroupRef = useRef<L.FeatureGroup>(null);

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const currentScale = useMemo(() => {
        const currentData: GardenPlannerData = {
            gardenZones,
            sprinklers,
            waterSource,
            pipes,
            designMode,
            imageData,
            canvasData,
        };
        return getValidScale(currentData);
    }, [gardenZones, sprinklers, waterSource, pipes, designMode, imageData, canvasData]);

    const calculateZoneArea = useCallback(
        (zone: GardenZone): number => {
            const coords = zone.canvasCoordinates || zone.coordinates;
            if (!coords || coords.length < 3) return 0;
            const scale = zone.canvasCoordinates ? currentScale : undefined;
            return calculatePolygonArea(coords, scale);
        },
        [currentScale]
    );

    const createSnapshot = useCallback((): HistoryState => {
        return {
            gardenZones: JSON.parse(JSON.stringify(gardenZones)),
            sprinklers: JSON.parse(JSON.stringify(sprinklers)),
            waterSource: waterSource ? JSON.parse(JSON.stringify(waterSource)) : null,
            pipes: JSON.parse(JSON.stringify(pipes)),
            timestamp: Date.now(),
        };
    }, [gardenZones, sprinklers, waterSource, pipes]);

    const saveToHistory = useCallback(() => {
        if (isRestoringFromHistory) return;

        const newSnapshot = createSnapshot();

        setHistory((prev) => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(newSnapshot);

            if (newHistory.length > 50) {
                newHistory.shift();
                return newHistory;
            }

            return newHistory;
        });

        setHistoryIndex((prev) => Math.min(prev + 1, 49));
    }, [createSnapshot, historyIndex, isRestoringFromHistory]);

    const handleUndo = useCallback(() => {
        if (historyIndex <= 0) return;

        const targetIndex = historyIndex - 1;
        const targetState = history[targetIndex];

        if (targetState) {
            setIsRestoringFromHistory(true);

            setGardenZones(targetState.gardenZones);
            setSprinklers(targetState.sprinklers);
            setWaterSource(targetState.waterSource);
            setPipes(targetState.pipes);

            setHistoryIndex(targetIndex);

            setTimeout(() => setIsRestoringFromHistory(false), 100);
        }
    }, [history, historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex >= history.length - 1) return;

        const targetIndex = historyIndex + 1;
        const targetState = history[targetIndex];

        if (targetState) {
            setIsRestoringFromHistory(true);

            setGardenZones(targetState.gardenZones);
            setSprinklers(targetState.sprinklers);
            setWaterSource(targetState.waterSource);
            setPipes(targetState.pipes);

            setHistoryIndex(targetIndex);

            setTimeout(() => setIsRestoringFromHistory(false), 100);
        }
    }, [history, historyIndex]);

    const initializeHistory = useCallback(() => {
        const initialSnapshot = createSnapshot();
        setHistory([initialSnapshot]);
        setHistoryIndex(0);
    }, [createSnapshot]);

    useEffect(() => {
        if (isRestoringFromHistory) return;

        if (gardenZones.length > 0 || sprinklers.length > 0 || waterSource || pipes.length > 0) {
            const timeoutId = setTimeout(saveToHistory, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [gardenZones, sprinklers, waterSource, pipes, saveToHistory, isRestoringFromHistory]);

    useEffect(() => {
        initializeHistory();
    }, []);

    const UndoRedoButtons = () => (
        <div className="flex items-center gap-1 rounded-lg bg-gray-800 p-1">
            <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="flex items-center gap-1 rounded px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500 disabled:hover:bg-transparent"
                title={`Undo (${historyIndex}/${history.length})`}
            >
                <span className="text-base">↶</span>
                <span>Undo</span>
            </button>
            <div className="h-4 w-px bg-gray-600"></div>
            <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="flex items-center gap-1 rounded px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500 disabled:hover:bg-transparent"
                title={`Redo (${historyIndex + 1}/${history.length})`}
            >
                <span className="text-base">↷</span>
                <span>Redo</span>
            </button>
        </div>
    );

    useEffect(() => {
        const savedData = loadGardenData();
        if (savedData && savedData.designMode) {
            setGardenZones(savedData.gardenZones || []);
            setSprinklers(savedData.sprinklers || []);
            setWaterSource(savedData.waterSource);
            setPipes(savedData.pipes || []);
            setDesignMode(savedData.designMode);
            if (savedData.imageData) {
                const imageDataWithScale = {
                    ...savedData.imageData,
                    isScaleSet:
                        savedData.imageData.isScaleSet ||
                        (savedData.imageData.scale && savedData.imageData.scale !== 20) ||
                        false,
                };
                setImageData(imageDataWithScale);
            }
            setCanvasData(savedData.canvasData || canvasData);
        }
    }, []);

    const resetAllData = useCallback(() => {
        setGardenZones([]);
        setSprinklers([]);
        setWaterSource(null);
        setPipes([]);
        setSelectedSprinkler(null);
        setSelectedPipes(new Set());
        setSelectedSprinklersForPipe([]);
        setPipeEditMode('view');
        setImageData(null);
        setCanvasData({
            width: CANVAS_DEFAULT_WIDTH,
            height: CANVAS_DEFAULT_HEIGHT,
            scale: CANVAS_DEFAULT_SCALE,
            gridSize: CANVAS_GRID_SIZE,
        });
        setEditMode('view');
        setActiveTab('zones');
        setSelectedZoneType('grass');
        setSelectedZoneForConfig(null);
        setPipeGenerationError(null);
        clearGardenData();
    }, []);

    const findParentGrassZone = useCallback(
        (point: Coordinate | CanvasCoordinate) => {
            return gardenZones.find((zone) => {
                if (zone.type !== 'grass' || zone.parentZoneId) return false;
                if ('x' in point && zone.canvasCoordinates) {
                    return isPointInPolygon(point, zone.canvasCoordinates);
                } else if ('lat' in point && zone.coordinates) {
                    return isPointInPolygon(point, zone.coordinates);
                }
                return false;
            });
        },
        [gardenZones]
    );

    const getNestedZonesInParent = useCallback(
        (parentZoneId: string) => {
            return gardenZones.filter((zone) => zone.parentZoneId === parentZoneId);
        },
        [gardenZones]
    );

    const isPointInAvoidanceZone = useCallback(
        (point: Coordinate | CanvasCoordinate, grassZoneId: string) => {
            const nestedZones = getNestedZonesInParent(grassZoneId);
            return nestedZones.some((nestedZone) => {
                if ('x' in point && nestedZone.canvasCoordinates) {
                    return isPointInPolygon(point, nestedZone.canvasCoordinates);
                } else if ('lat' in point && nestedZone.coordinates) {
                    return isPointInPolygon(point, nestedZone.coordinates);
                }
                return false;
            });
        },
        [getNestedZonesInParent]
    );

    const handleCanvasZoneCreated = useCallback(
        (coordinates: CanvasCoordinate[]) => {
            const area = calculatePolygonArea(coordinates, currentScale);
            if (area > 300) {
                alert(
                    `❌ ขนาดพื้นที่เกินกำหนด!\n\nขนาดที่วาด: ${formatArea(area)}\nขนาดสูงสุดที่อนุญาต: 300 ตร.ม.\n\nกรุณาวาดพื้นที่ให้มีขนาดเล็กลง`
                );
                return;
            }

            const centerPoint = {
                x: coordinates.reduce((sum, c) => sum + c.x, 0) / coordinates.length,
                y: coordinates.reduce((sum, c) => sum + c.y, 0) / coordinates.length,
            };

            let parentZoneId: string | undefined;
            if (selectedZoneType !== 'grass') {
                const parentGrassZone = findParentGrassZone(centerPoint);
                if (parentGrassZone) {
                    parentZoneId = parentGrassZone.id;
                }
            }

            const suitableSprinklers = SPRINKLER_TYPES.filter((s) =>
                s.suitableFor.includes(selectedZoneType)
            );
            const defaultSprinkler = suitableSprinklers[0];
            const zoneTypeInfo = ZONE_TYPES.find((z) => z.id === selectedZoneType);
            const baseNameCount = gardenZones.filter((z) => z.type === selectedZoneType).length + 1;
            const gpsCoordinates = coordinates.map((c) => canvasToGPS(c, canvasData));

            const newZone: GardenZone = {
                id: `zone_${Date.now()}`,
                type: selectedZoneType as any,
                coordinates: gpsCoordinates,
                canvasCoordinates: coordinates,
                name: parentZoneId
                    ? `${zoneTypeInfo?.name} (ใน ${gardenZones.find((z) => z.id === parentZoneId)?.name}) ${baseNameCount}`
                    : `${zoneTypeInfo?.name} ${baseNameCount}`,
                parentZoneId,
                sprinklerConfig:
                    selectedZoneType !== 'forbidden' && defaultSprinkler
                        ? { type: defaultSprinkler.id, radius: defaultSprinkler.radius }
                        : undefined,
            };

            setGardenZones((prev) => [...prev, newZone]);
        },
        [selectedZoneType, gardenZones, findParentGrassZone, canvasData, currentScale]
    );

    const handleZoneCreated = useCallback(
        (e: any) => {
            const layer = e.layer;
            const coordinates = layer.getLatLngs()[0].map((latLng: any) => ({
                lat: latLng.lat,
                lng: latLng.lng,
            }));

            const area = calculatePolygonArea(coordinates);
            if (area > 300) {
                alert(
                    `❌ ขนาดพื้นที่เกินกำหนด!\n\nขนาดที่วาด: ${formatArea(area)}\nขนาดสูงสุดที่อนุญาต: 300 ตร.ม.\n\nกรุณาวาดพื้นที่ให้มีขนาดเล็กลง`
                );
                return;
            }

            const centerPoint = {
                lat: coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length,
                lng: coordinates.reduce((sum, c) => sum + c.lng, 0) / coordinates.length,
            };

            let parentZoneId: string | undefined;
            if (selectedZoneType !== 'grass') {
                const parentGrassZone = findParentGrassZone(centerPoint);
                if (parentGrassZone) {
                    parentZoneId = parentGrassZone.id;
                }
            }

            const suitableSprinklers = SPRINKLER_TYPES.filter((s) =>
                s.suitableFor.includes(selectedZoneType)
            );
            const defaultSprinkler = suitableSprinklers[0];
            const zoneTypeInfo = ZONE_TYPES.find((z) => z.id === selectedZoneType);
            const baseNameCount = gardenZones.filter((z) => z.type === selectedZoneType).length + 1;

            const newZone: GardenZone = {
                id: `zone_${Date.now()}`,
                type: selectedZoneType as any,
                coordinates,
                name: parentZoneId
                    ? `${zoneTypeInfo?.name} (ใน ${gardenZones.find((z) => z.id === parentZoneId)?.name}) ${baseNameCount}`
                    : `${zoneTypeInfo?.name} ${baseNameCount}`,
                parentZoneId,
                sprinklerConfig:
                    selectedZoneType !== 'forbidden' && defaultSprinkler
                        ? { type: defaultSprinkler.id, radius: defaultSprinkler.radius }
                        : undefined,
            };

            setGardenZones((prev) => [...prev, newZone]);
        },
        [selectedZoneType, gardenZones, findParentGrassZone]
    );

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

    const handleCanvasSprinklerPlaced = useCallback(
        (position: CanvasCoordinate) => {
            const selectedSprinklerType = SPRINKLER_TYPES.find((s) => s.id === manualSprinklerType);
            if (!selectedSprinklerType) return;

            const sprinklerType = { ...selectedSprinklerType, radius: manualSprinklerRadius };

            const targetZone = gardenZones.find((zone) => {
                if (zone.type === 'forbidden') return false;
                return zone.canvasCoordinates && isPointInPolygon(position, zone.canvasCoordinates);
            });

            let zoneId = 'virtual_zone';
            if (targetZone) {
                if (targetZone.parentZoneId) {
                    alert('ไม่สามารถวางหัวฉีดในพื้นที่ย่อยได้ กรุณาวางในพื้นที่หลักเท่านั้น');
                    return;
                }

                if (
                    targetZone.type === 'grass' &&
                    isPointInAvoidanceZone(position, targetZone.id)
                ) {
                    alert('ไม่สามารถวางหัวฉีดในพื้นที่ดอกไม้ ต้นไม้ หรือพื้นที่ต้องห้าม');
                    return;
                }
                zoneId = targetZone.id;
            }

            const gpsPosition = canvasToGPS(position, canvasData);

            const newSprinkler: Sprinkler = {
                id: `sprinkler_${Date.now()}`,
                position: gpsPosition,
                canvasPosition: position,
                type: sprinklerType,
                zoneId: zoneId,
                orientation: 0,
            };

            setSprinklers((prev) => [...prev, newSprinkler]);
        },
        [
            gardenZones,
            manualSprinklerType,
            manualSprinklerRadius,
            canvasData,
            isPointInAvoidanceZone,
        ]
    );

    const findLongestEdgeAngle = useCallback(
        (coordinates: Coordinate[] | CanvasCoordinate[]) => {
            if (!coordinates || coordinates.length < 3) return 0;

            let longestDistance = 0;
            let longestEdgeAngle = 0;

            for (let i = 0; i < coordinates.length; i++) {
                const start = coordinates[i];
                const end = coordinates[(i + 1) % coordinates.length];

                const distance = calculateDistance(
                    start,
                    end,
                    'x' in start ? currentScale : undefined
                );

                if (distance > longestDistance) {
                    longestDistance = distance;

                    if ('x' in start && 'x' in end) {
                        const deltaX = end.x - start.x;
                        const deltaY = end.y - start.y;
                        longestEdgeAngle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
                    } else {
                        const coord1 = start as Coordinate;
                        const coord2 = end as Coordinate;
                        const centerLat = (coord1.lat + coord2.lat) / 2;
                        const latToMeter =
                            111132.92 - 559.82 * Math.cos((2 * centerLat * Math.PI) / 180);
                        const lngToMeter = 111412.84 * Math.cos((centerLat * Math.PI) / 180);

                        const deltaLatMeter = (coord2.lat - coord1.lat) * latToMeter;
                        const deltaLngMeter = (coord2.lng - coord1.lng) * lngToMeter;

                        longestEdgeAngle =
                            (Math.atan2(deltaLatMeter, deltaLngMeter) * 180) / Math.PI;
                    }
                }
            }

            return longestEdgeAngle;
        },
        [currentScale]
    );

    const placeCornerSprinklers = useCallback(
        (zone: GardenZone, sprinklerType: any) => {
            const cornerSprinklers: Sprinkler[] = [];
            let sprinklerCounter = 0;

            const coordinates = zone.canvasCoordinates || zone.coordinates;

            coordinates.forEach((corner, index) => {
                let shouldAvoid = false;
                if (zone.type === 'grass') {
                    shouldAvoid = isPointInAvoidanceZone(corner, zone.id);
                } else {
                    shouldAvoid = gardenZones.some(
                        (forbiddenZone) =>
                            forbiddenZone.type === 'forbidden' &&
                            !forbiddenZone.parentZoneId &&
                            isPointInPolygon(
                                corner,
                                forbiddenZone.canvasCoordinates || forbiddenZone.coordinates
                            )
                    );
                }

                if (!shouldAvoid) {
                    const orientation = findLongestEdgeAngle(coordinates);

                    if ('x' in corner) {
                        const gpsPos = canvasToGPS(corner as CanvasCoordinate, canvasData);
                        cornerSprinklers.push({
                            id: `${zone.id}_corner_${index}_${Date.now()}_${sprinklerCounter++}`,
                            position: gpsPos,
                            canvasPosition: corner as CanvasCoordinate,
                            type: sprinklerType,
                            zoneId: zone.id,
                            orientation: orientation,
                        });
                    } else {
                        cornerSprinklers.push({
                            id: `${zone.id}_corner_${index}_${Date.now()}_${sprinklerCounter++}`,
                            position: corner as Coordinate,
                            type: sprinklerType,
                            zoneId: zone.id,
                            orientation: orientation,
                        });
                    }
                }
            });

            return cornerSprinklers;
        },
        [isPointInAvoidanceZone, findLongestEdgeAngle, gardenZones, canvasData]
    );

    const autoPlaceSprinklersInZone = useCallback(
        (zoneId: string) => {
            const zone = gardenZones.find((z) => z.id === zoneId);
            if (!zone || zone.type === 'forbidden' || !zone.sprinklerConfig) return;

            const sprinklerTypeData = SPRINKLER_TYPES.find(
                (s) => s.id === zone.sprinklerConfig!.type
            );
            if (!sprinklerTypeData) return;

            const sprinklerType = { ...sprinklerTypeData, radius: zone.sprinklerConfig.radius };
            const coordinates = zone.canvasCoordinates || zone.coordinates;
            const isCanvas = !!zone.canvasCoordinates;
            const scale = isCanvas ? currentScale : 1;

            const longestEdgeAngle = findLongestEdgeAngle(coordinates);
            const radians = (longestEdgeAngle * Math.PI) / 180;

            let centerX: number, centerY: number;
            if (isCanvas) {
                const canvasCoords = coordinates as CanvasCoordinate[];
                centerX = canvasCoords.reduce((sum, c) => sum + c.x, 0) / canvasCoords.length;
                centerY = canvasCoords.reduce((sum, c) => sum + c.y, 0) / canvasCoords.length;
            } else {
                const gpsCoords = coordinates as Coordinate[];
                centerX = gpsCoords.reduce((sum, c) => sum + c.lng, 0) / gpsCoords.length;
                centerY = gpsCoords.reduce((sum, c) => sum + c.lat, 0) / gpsCoords.length;
            }

            const spacing = sprinklerType.radius;
            const newSprinklers: Sprinkler[] = [];
            let sprinklerCounter = 0;

            const cornerSprinklers = placeCornerSprinklers(zone, sprinklerType);
            newSprinklers.push(...cornerSprinklers);
            sprinklerCounter += cornerSprinklers.length;

            if (isCanvas) {
                const spacingPixels = spacing * scale;
                const cos = Math.cos(radians);
                const sin = Math.sin(radians);

                const canvasCoords = coordinates as CanvasCoordinate[];
                const rotatedPoints = canvasCoords.map((coord) => {
                    const relX = coord.x - centerX;
                    const relY = coord.y - centerY;
                    return { u: relX * cos - relY * sin, v: relX * sin + relY * cos };
                });

                const minU = Math.min(...rotatedPoints.map((p) => p.u));
                const maxU = Math.max(...rotatedPoints.map((p) => p.u));
                const minV = Math.min(...rotatedPoints.map((p) => p.v));
                const maxV = Math.max(...rotatedPoints.map((p) => p.v));

                for (let v = minV + spacingPixels / 2; v <= maxV; v += spacingPixels) {
                    for (let u = minU + spacingPixels / 2; u <= maxU; u += spacingPixels) {
                        const x = centerX + (u * cos + v * sin);
                        const y = centerY + (u * -sin + v * cos);
                        const point = { x, y };

                        if (isPointInPolygon(point, canvasCoords)) {
                            const tooCloseToCorner = cornerSprinklers.some(
                                (corner) =>
                                    corner.canvasPosition &&
                                    calculateDistance(point, corner.canvasPosition, scale) <
                                        spacing * 0.9
                            );

                            if (tooCloseToCorner) continue;

                            let shouldAvoid = false;

                            if (zone.type === 'grass') {
                                shouldAvoid = isPointInAvoidanceZone(point, zone.id);
                            } else {
                                shouldAvoid = gardenZones.some(
                                    (forbiddenZone) =>
                                        forbiddenZone.type === 'forbidden' &&
                                        !forbiddenZone.parentZoneId &&
                                        forbiddenZone.canvasCoordinates &&
                                        isPointInPolygon(point, forbiddenZone.canvasCoordinates)
                                );
                            }

                            if (!shouldAvoid) {
                                const gpsPos = canvasToGPS(
                                    point,
                                    isCanvas ? canvasData : imageData
                                );
                                newSprinklers.push({
                                    id: `${zone.id}_sprinkler_${Date.now()}_${sprinklerCounter++}`,
                                    position: gpsPos,
                                    canvasPosition: point,
                                    type: sprinklerType,
                                    zoneId: zone.id,
                                    orientation: longestEdgeAngle,
                                });
                            }
                        }
                    }
                }
            } else {
                const gpsCoords = coordinates as Coordinate[];
                const centerLat = centerY;
                const centerLng = centerX;

                const latSpacing = spacing / 111000;
                const lngSpacing = spacing / (111000 * Math.cos((centerLat * Math.PI) / 180));

                const cos = Math.cos(radians);
                const sin = Math.sin(radians);

                const rotatedPoints = gpsCoords.map((coord) => {
                    const relLat = coord.lat - centerLat;
                    const relLng = coord.lng - centerLng;
                    return { u: relLng * cos - relLat * sin, v: relLng * sin + relLat * cos };
                });

                const minU = Math.min(...rotatedPoints.map((p) => p.u));
                const maxU = Math.max(...rotatedPoints.map((p) => p.u));
                const minV = Math.min(...rotatedPoints.map((p) => p.v));
                const maxV = Math.max(...rotatedPoints.map((p) => p.v));

                const rotatedLatSpacing = latSpacing;
                const rotatedLngSpacing = lngSpacing;

                for (let v = minV + rotatedLatSpacing / 2; v <= maxV; v += rotatedLatSpacing) {
                    for (let u = minU + rotatedLngSpacing / 2; u <= maxU; u += rotatedLngSpacing) {
                        const lat = centerLat + (u * -sin + v * cos);
                        const lng = centerLng + (u * cos + v * sin);
                        const point = { lat, lng };

                        if (isPointInPolygon(point, gpsCoords)) {
                            const tooCloseToCorner = cornerSprinklers.some(
                                (corner) =>
                                    calculateDistance(point, corner.position) < spacing * 0.9
                            );

                            if (tooCloseToCorner) continue;

                            let shouldAvoid = false;

                            if (zone.type === 'grass') {
                                shouldAvoid = isPointInAvoidanceZone(point, zone.id);
                            } else {
                                shouldAvoid = gardenZones.some(
                                    (forbiddenZone) =>
                                        forbiddenZone.type === 'forbidden' &&
                                        !forbiddenZone.parentZoneId &&
                                        isPointInPolygon(point, forbiddenZone.coordinates)
                                );
                            }

                            if (!shouldAvoid) {
                                newSprinklers.push({
                                    id: `${zone.id}_sprinkler_${Date.now()}_${sprinklerCounter++}`,
                                    position: point,
                                    type: sprinklerType,
                                    zoneId: zone.id,
                                    orientation: longestEdgeAngle,
                                });
                            }
                        }
                    }
                }
            }

            setSelectedSprinkler(null);
            setSprinklers((prev) => [...prev.filter((s) => s.zoneId !== zoneId), ...newSprinklers]);
        },
        [
            gardenZones,
            findLongestEdgeAngle,
            isPointInAvoidanceZone,
            placeCornerSprinklers,
            canvasData,
            imageData,
            currentScale,
        ]
    );

    const autoPlaceAllSprinklers = useCallback(() => {
        setSelectedSprinkler(null);
        setSprinklers([]);
        gardenZones.forEach((zone) => {
            if (zone.type !== 'forbidden' && zone.sprinklerConfig) {
                autoPlaceSprinklersInZone(zone.id);
            }
        });
    }, [gardenZones, autoPlaceSprinklersInZone]);

    // ===== ENHANCED PIPE GENERATION FUNCTION =====
    const generatePipeNetwork = useCallback(async () => {
        if (!waterSource) {
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
                area: JSON.stringify(area),
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
    }, [waterSource, sprinklerRadius, area]);

    const deleteSelectedPipes = useCallback(() => {
        if (selectedPipes.size === 0) {
            return;
        }

        setPipes((prev) => prev.filter((p) => !selectedPipes.has(p.id)));
        setSelectedPipes(new Set());
    }, [selectedPipes, pipes]);

    const updateZoneConfig = useCallback(
        (zoneId: string, sprinklerType: string, radius: number) => {
            setGardenZones((prev) =>
                prev.map((zone) =>
                    zone.id === zoneId
                        ? { ...zone, sprinklerConfig: { type: sprinklerType, radius } }
                        : zone
                )
            );
            setSprinklers((prev) => prev.filter((s) => s.zoneId !== zoneId));
        },
        []
    );

    const deleteZone = useCallback(
        (zoneId: string) => {
            const zonesToDelete = [
                zoneId,
                ...gardenZones.filter((z) => z.parentZoneId === zoneId).map((z) => z.id),
            ];

            setGardenZones((prev) => prev.filter((z) => !zonesToDelete.includes(z.id)));
            setSprinklers((prev) => prev.filter((s) => !zonesToDelete.includes(s.zoneId)));
            setPipes((prev) => prev.filter((p) => !zonesToDelete.includes(p.zoneId || '')));
        },
        [gardenZones]
    );

    // Additional handlers
    const handleCalculate = useCallback(() => {
        // Implementation for handleCalculate
        console.log('Calculate clicked');
    }, []);

    const handleSearch = useCallback((lat: number, lng: number) => {
        setMapCenter([lat, lng]);
    }, []);

    const onCreated = useCallback(
        (e: any) => {
            handleZoneCreated(e);
        },
        [handleZoneCreated]
    );

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
            <div className="mx-auto max-w-screen-xl">
                <h1 className="mb-4 text-3xl font-bold">🏡 Home Garden Sprinkler Calculator</h1>
                <p className="mb-6 text-gray-400">
                    วาดพื้นที่สวน → กำหนดรัศมี Sprinkler → ดูผลการคำนวณ
                </p>

                {error && (
                    <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    <div className="space-y-6 lg:col-span-1">
                        {activeTab === 'zones' && (
                            <div className="rounded-xl bg-gray-800/90 p-6 shadow-2xl backdrop-blur">
                                <h3 className="mb-4 text-xl font-semibold text-blue-400">
                                    🗺️ จัดการโซนพื้นที่
                                </h3>

                                <div className="mb-4">
                                    <label className="mb-2 block text-sm font-medium text-gray-100">
                                        เลือกประเภทโซน:
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 text-gray-100">
                                        {ZONE_TYPES.map((zone) => (
                                            <button
                                                key={zone.id}
                                                onClick={() => setSelectedZoneType(zone.id)}
                                                className={`rounded-lg p-3 text-center transition-all ${
                                                    selectedZoneType === zone.id
                                                        ? 'shadow-lg ring-2 ring-blue-400'
                                                        : 'hover:bg-gray-700'
                                                }`}
                                                style={{
                                                    backgroundColor:
                                                        selectedZoneType === zone.id
                                                            ? zone.color + '20'
                                                            : 'transparent',
                                                }}
                                            >
                                                <div className="text-2xl">{zone.icon}</div>
                                                <div className="text-xs font-medium">
                                                    {zone.name}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-4 space-y-2">
                                    {editMode !== 'draw' ? (
                                        <button
                                            onClick={() => setEditMode('draw')}
                                            className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white shadow-lg transition-all hover:bg-blue-700"
                                        >
                                            ✏️ เริ่มวาดโซนพื้นที่
                                        </button>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="rounded-lg bg-blue-900/30 p-3 text-center">
                                                <div className="text-sm font-medium text-blue-300">
                                                    🎯 กำลังวาดโซน:{' '}
                                                    {
                                                        ZONE_TYPES.find(
                                                            (z) => z.id === selectedZoneType
                                                        )?.name
                                                    }
                                                </div>
                                                <div className="mt-1 text-xs text-blue-200">
                                                    {designMode === 'map'
                                                        ? 'คลิกและลากในแผนที่เพื่อวาดโซน'
                                                        : 'คลิกเพื่อวาดจุดต่าง ๆ ของโซน'}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setEditMode('view');
                                                    if (
                                                        designMode === 'canvas' ||
                                                        designMode === 'image'
                                                    ) {
                                                        window.dispatchEvent(
                                                            new CustomEvent('cancelDrawing')
                                                        );
                                                    }
                                                    setSelectedZoneForConfig(null);
                                                }}
                                                className="w-full rounded-lg bg-red-600 py-2 font-medium text-white transition-all hover:bg-red-700"
                                            >
                                                ❌ ยกเลิกการวาด
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {gardenZones.length > 0 && (
                                    <div>
                                        <h4 className="mb-2 text-sm font-medium text-gray-300">
                                            โซนที่สร้างแล้ว:
                                        </h4>
                                        <div className="max-h-96 space-y-3 overflow-y-auto">
                                            {gardenZones.map((zone) => {
                                                const zoneType = ZONE_TYPES.find(
                                                    (z) => z.id === zone.type
                                                );
                                                const zoneSprinklers = sprinklers.filter(
                                                    (s) => s.zoneId === zone.id
                                                );
                                                const isConfigOpen =
                                                    selectedZoneForConfig === zone.id;
                                                const isNestedZone = !!zone.parentZoneId;
                                                const parentZone = zone.parentZoneId
                                                    ? gardenZones.find(
                                                          (z) => z.id === zone.parentZoneId
                                                      )
                                                    : null;

                                                const zoneArea = calculateZoneArea(zone);

                                                return (
                                                    <div
                                                        key={zone.id}
                                                        className={`space-y-2 rounded-lg p-3 ${
                                                            isNestedZone
                                                                ? 'ml-4 border-l-4 bg-gray-600'
                                                                : 'bg-gray-700'
                                                        }`}
                                                        style={{
                                                            borderLeftColor: isNestedZone
                                                                ? zoneType?.color
                                                                : undefined,
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-lg">
                                                                    {zoneType?.icon}
                                                                </span>
                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-100">
                                                                        {zone.name}
                                                                        {isNestedZone &&
                                                                            parentZone && (
                                                                                <span className="block text-xs text-gray-400">
                                                                                    ↳ ใน{' '}
                                                                                    {
                                                                                        parentZone.name
                                                                                    }
                                                                                </span>
                                                                            )}
                                                                    </div>
                                                                    <div className="text-xs text-gray-200">
                                                                        {zoneSprinklers.length}{' '}
                                                                        หัวฉีด •{' '}
                                                                        {formatArea(zoneArea)}
                                                                    </div>
                                                                    {zone.sprinklerConfig && (
                                                                        <div className="text-xs text-blue-300">
                                                                            {
                                                                                SPRINKLER_TYPES.find(
                                                                                    (s) =>
                                                                                        s.id ===
                                                                                        zone
                                                                                            .sprinklerConfig!
                                                                                            .type
                                                                                )?.name
                                                                            }
                                                                            • รัศมี{' '}
                                                                            {
                                                                                zone.sprinklerConfig
                                                                                    .radius
                                                                            }
                                                                            ม.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex space-x-1">
                                                                {zone.type !== 'forbidden' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() =>
                                                                                setSelectedZoneForConfig(
                                                                                    isConfigOpen
                                                                                        ? null
                                                                                        : zone.id
                                                                                )
                                                                            }
                                                                            className="text-blue-400 hover:text-blue-300"
                                                                            title="ตั้งค่าหัวฉีด"
                                                                        >
                                                                            ⚙️
                                                                        </button>
                                                                        <button
                                                                            onClick={() =>
                                                                                autoPlaceSprinklersInZone(
                                                                                    zone.id
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                !zone.sprinklerConfig
                                                                            }
                                                                            className="text-green-400 hover:text-green-300 disabled:cursor-not-allowed disabled:text-gray-500"
                                                                            title="วางหัวฉีดในโซนนี้"
                                                                        >
                                                                            🤖
                                                                        </button>
                                                                        <button
                                                                            onClick={() =>
                                                                                deleteSprinklersByZone(
                                                                                    zone.id
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                zoneSprinklers.length ===
                                                                                0
                                                                            }
                                                                            className="text-yellow-400 hover:text-yellow-300 disabled:cursor-not-allowed disabled:text-gray-500"
                                                                            title="ลบหัวฉีดในโซนนี้"
                                                                        >
                                                                            💧
                                                                        </button>
                                                                    </>
                                                                )}
                                                                <button
                                                                    onClick={() =>
                                                                        deleteZone(zone.id)
                                                                    }
                                                                    className="text-red-400 hover:text-red-300"
                                                                    title="ลบโซน"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {isConfigOpen &&
                                                            zone.type !== 'forbidden' && (
                                                                <div className="mt-3 space-y-3 border-t border-gray-600 pt-3">
                                                                    <div>
                                                                        <label className="mb-2 block text-xs font-medium text-gray-300">
                                                                            เลือกประเภทหัวฉีด:
                                                                        </label>
                                                                        <div className="grid grid-cols-1 gap-1">
                                                                            {SPRINKLER_TYPES.filter(
                                                                                (s) =>
                                                                                    s.suitableFor.includes(
                                                                                        zone.type
                                                                                    )
                                                                            ).map((sprinkler) => (
                                                                                <button
                                                                                    key={
                                                                                        sprinkler.id
                                                                                    }
                                                                                    onClick={() => {
                                                                                        const currentRadius =
                                                                                            zone
                                                                                                .sprinklerConfig
                                                                                                ?.radius ||
                                                                                            sprinkler.radius;
                                                                                        updateZoneConfig(
                                                                                            zone.id,
                                                                                            sprinkler.id,
                                                                                            currentRadius
                                                                                        );
                                                                                    }}
                                                                                    className={`rounded p-2 text-left text-xs transition-all ${
                                                                                        zone
                                                                                            .sprinklerConfig
                                                                                            ?.type ===
                                                                                        sprinkler.id
                                                                                            ? 'bg-blue-900/30 ring-1 ring-blue-400'
                                                                                            : 'hover:bg-gray-600'
                                                                                    }`}
                                                                                >
                                                                                    <div className="flex items-center space-x-2">
                                                                                        <span>
                                                                                            {
                                                                                                sprinkler.icon
                                                                                            }
                                                                                        </span>
                                                                                        <span className="font-medium text-gray-100">
                                                                                            {
                                                                                                sprinkler.name
                                                                                            }
                                                                                        </span>
                                                                                    </div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    {zone.sprinklerConfig && (
                                                                        <div>
                                                                            <label className="mb-2 block text-xs font-medium text-gray-300">
                                                                                รัศมีการฉีดน้ำ
                                                                                (เมตร):
                                                                            </label>
                                                                            <div className="flex items-center space-x-3">
                                                                                <input
                                                                                    type="range"
                                                                                    min="1"
                                                                                    max="15"
                                                                                    step="0.5"
                                                                                    value={
                                                                                        zone
                                                                                            .sprinklerConfig
                                                                                            .radius
                                                                                    }
                                                                                    onChange={(e) =>
                                                                                        updateZoneConfig(
                                                                                            zone.id,
                                                                                            zone
                                                                                                .sprinklerConfig!
                                                                                                .type,
                                                                                            Number(
                                                                                                e
                                                                                                    .target
                                                                                                    .value
                                                                                            )
                                                                                        )
                                                                                    }
                                                                                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-600"
                                                                                />
                                                                                <span className="min-w-[3rem] text-sm font-bold text-blue-400">
                                                                                    {
                                                                                        zone
                                                                                            .sprinklerConfig
                                                                                            .radius
                                                                                    }
                                                                                    ม.
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'sprinklers' && (
                            <div className="rounded-xl bg-gray-800/90 p-6 shadow-2xl backdrop-blur">
                                <h3 className="mb-4 text-xl font-semibold text-blue-400">
                                    💧 จัดการหัวฉีดน้ำ
                                </h3>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <button
                                            onClick={autoPlaceAllSprinklers}
                                            disabled={
                                                gardenZones.filter(
                                                    (z) =>
                                                        z.type !== 'forbidden' && z.sprinklerConfig
                                                ).length === 0
                                            }
                                            className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white transition-all hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                                        >
                                            🤖 วางหัวฉีดอัตโนมัติ (ทุกโซน)
                                        </button>

                                        <button
                                            onClick={() => setEditMode('place')}
                                            className={`w-full rounded-lg py-3 font-medium transition-all ${
                                                editMode === 'place'
                                                    ? 'bg-green-600 text-white shadow-lg'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            📍{' '}
                                            {editMode === 'place'
                                                ? designMode === 'map'
                                                    ? 'กำลังวางหัวฉีด - คลิกในแผนที่'
                                                    : 'กำลังวางหัวฉีด - คลิกในพื้นที่'
                                                : 'วางหัวฉีดเอง'}
                                        </button>

                                        {editMode === 'place' && (
                                            <div className="mt-3 space-y-3 border-t border-gray-600 pt-3">
                                                <div>
                                                    <label className="mb-2 block text-xs font-medium text-gray-300">
                                                        เลือกประเภทหัวฉีด:
                                                    </label>
                                                    <div className="grid grid-cols-1 gap-1">
                                                        {SPRINKLER_TYPES.map((sprinkler) => (
                                                            <button
                                                                key={sprinkler.id}
                                                                onClick={() =>
                                                                    setManualSprinklerType(
                                                                        sprinkler.id
                                                                    )
                                                                }
                                                                className={`rounded p-2 text-left text-xs transition-all ${
                                                                    manualSprinklerType ===
                                                                    sprinkler.id
                                                                        ? 'bg-blue-900/30 ring-1 ring-blue-400'
                                                                        : 'hover:bg-gray-600'
                                                                }`}
                                                            >
                                                                <div className="flex items-center space-x-2">
                                                                    <span>{sprinkler.icon}</span>
                                                                    <span className="font-medium text-gray-100">
                                                                        {sprinkler.name}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-xs font-medium text-gray-300">
                                                        รัศมีการฉีดน้ำ (เมตร):
                                                    </label>
                                                    <div className="flex items-center space-x-3">
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="15"
                                                            step="0.5"
                                                            value={manualSprinklerRadius}
                                                            onChange={(e) =>
                                                                setManualSprinklerRadius(
                                                                    Number(e.target.value)
                                                                )
                                                            }
                                                            className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-600"
                                                        />
                                                        <span className="min-w-[3rem] text-sm font-bold text-blue-400">
                                                            {manualSprinklerRadius}ม.
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setEditMode('edit')}
                                            className={`w-full rounded-lg py-3 font-medium transition-all ${
                                                editMode === 'edit'
                                                    ? 'bg-yellow-600 text-white shadow-lg'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            🚰{' '}
                                            {editMode === 'edit'
                                                ? designMode === 'map'
                                                    ? 'กำลังวางแหล่งน้ำ - คลิกแผนที่'
                                                    : 'กำลังวางแหล่งน้ำ - คลิกในพื้นที่'
                                                : 'วางแหล่งน้ำ'}
                                        </button>

                                        <button
                                            onClick={() => setEditMode('drag-sprinkler')}
                                            className={`w-full rounded-lg py-3 font-medium transition-all ${
                                                editMode === 'drag-sprinkler'
                                                    ? 'bg-orange-600 text-white shadow-lg'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            ↔️{' '}
                                            {editMode === 'drag-sprinkler'
                                                ? 'กำลังปรับตำแหน่ง - ลากหัวฉีด'
                                                : 'ปรับตำแหน่งหัวฉีด'}
                                        </button>

                                        {sprinklers.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    setSelectedSprinkler(null);
                                                    setSprinklers([]);
                                                }}
                                                className="w-full rounded-lg bg-red-600 py-3 font-medium text-white transition-all hover:bg-red-700"
                                            >
                                                🗑️ ลบหัวฉีดทั้งหมด
                                            </button>
                                        )}
                                    </div>

                                    {sprinklers.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium text-gray-300">
                                                สรุปหัวฉีด: {sprinklers.length} ตัว
                                            </h4>
                                            <div className="max-h-40 space-y-2 overflow-y-auto">
                                                {gardenZones
                                                    .filter((zone) => zone.type !== 'forbidden')
                                                    .map((zone) => {
                                                        const zoneSprinklers = sprinklers.filter(
                                                            (s) => s.zoneId === zone.id
                                                        );
                                                        if (zoneSprinklers.length === 0)
                                                            return null;

                                                        const zoneType = ZONE_TYPES.find(
                                                            (z) => z.id === zone.type
                                                        );
                                                        const isNestedZone = !!zone.parentZoneId;

                                                        return (
                                                            <div
                                                                key={zone.id}
                                                                className={`rounded-lg p-2 text-xs ${
                                                                    isNestedZone
                                                                        ? 'ml-4 border-l-2 bg-gray-600'
                                                                        : 'bg-gray-700'
                                                                }`}
                                                                style={{
                                                                    borderLeftColor: isNestedZone
                                                                        ? zoneType?.color
                                                                        : undefined,
                                                                }}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center space-x-2">
                                                                        <span>
                                                                            {zoneType?.icon}
                                                                        </span>
                                                                        <span className="font-medium text-gray-100">
                                                                            {zone.name}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="font-bold text-blue-400">
                                                                            {zoneSprinklers.length}{' '}
                                                                            หัว
                                                                        </div>
                                                                        {zone.sprinklerConfig && (
                                                                            <div className="text-gray-400">
                                                                                {
                                                                                    SPRINKLER_TYPES.find(
                                                                                        (s) =>
                                                                                            s.id ===
                                                                                            zone
                                                                                                .sprinklerConfig!
                                                                                                .type
                                                                                    )?.name
                                                                                }
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                {sprinklers.filter(
                                                    (s) => s.zoneId === 'virtual_zone'
                                                ).length > 0 && (
                                                    <div className="rounded-lg bg-gray-700 p-2 text-xs">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-2">
                                                                <span>⚙️</span>
                                                                <span className="font-medium text-gray-100">
                                                                    หัวฉีดแบบกำหนดเอง
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="font-bold text-blue-400">
                                                                    {
                                                                        sprinklers.filter(
                                                                            (s) =>
                                                                                s.zoneId ===
                                                                                'virtual_zone'
                                                                        ).length
                                                                    }{' '}
                                                                    หัว
                                                                </div>
                                                                <div className="text-gray-400">
                                                                    หัวฉีดผสม
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'pipes' && (
                            <div className="rounded-xl bg-gray-800/90 p-6 shadow-2xl backdrop-blur">
                                <h3 className="mb-4 text-xl font-semibold text-blue-400">
                                    🔧 ระบบท่อน้ำ
                                </h3>

                                <div className="space-y-4">
                                    {!waterSource ? (
                                        <div className="rounded-lg border border-amber-500 bg-amber-900/30 p-4 text-amber-200">
                                            <div className="mb-2 flex items-center gap-2">
                                                <span className="text-lg">⚠️</span>
                                                <span className="font-semibold">
                                                    ต้องวางแหล่งน้ำก่อน
                                                </span>
                                            </div>
                                            <p className="text-sm">
                                                กรุณาไปแท็บ "วางหัวฉีด" และกดปุ่ม "วางแหล่งน้ำ"
                                                ก่อนสร้างระบบท่อ
                                            </p>
                                        </div>
                                    ) : sprinklers.length === 0 ? (
                                        <div className="rounded-lg border border-amber-500 bg-amber-900/30 p-4 text-amber-200">
                                            <div className="mb-2 flex items-center gap-2">
                                                <span className="text-lg">⚠️</span>
                                                <span className="font-semibold">
                                                    ต้องวางหัวฉีดก่อน
                                                </span>
                                            </div>
                                            <p className="text-sm">
                                                กรุณาไปแท็บ "วางหัวฉีด" และวางหัวฉีดก่อนสร้างระบบท่อ
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="rounded-lg bg-green-900/30 p-3 text-xs text-green-300">
                                                <div className="mb-1 font-medium">
                                                    ✅ พร้อมสร้างระบบท่อแล้ว
                                                </div>
                                                <div>
                                                    แหล่งน้ำ: 1 จุด • หัวฉีด: {sprinklers.length}{' '}
                                                    ตัว
                                                </div>
                                            </div>

                                            <button
                                                onClick={generatePipeNetwork}
                                                disabled={
                                                    !waterSource ||
                                                    sprinklers.length === 0 ||
                                                    isGeneratingPipes
                                                }
                                                className="w-full rounded-lg bg-blue-600 py-4 text-lg font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                                            >
                                                {isGeneratingPipes ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                                        🔧 กำลังสร้างระบบท่อ...
                                                    </div>
                                                ) : (
                                                    '🚀 สร้างระบบท่ออัตโนมัติ'
                                                )}
                                            </button>

                                            {pipeGenerationError && (
                                                <div className="rounded-lg border border-red-500 bg-red-900/30 p-3 text-red-200">
                                                    <div className="mb-1 flex items-center gap-2">
                                                        <span className="text-lg">❌</span>
                                                        <span className="font-semibold">
                                                            เกิดข้อผิดพลาด
                                                        </span>
                                                    </div>
                                                    <p className="text-sm">{pipeGenerationError}</p>
                                                </div>
                                            )}

                                            {pipes.length > 0 && (
                                                <div className="space-y-3">
                                                    <div className="rounded-lg bg-purple-900/30 p-3 text-sm text-purple-300">
                                                        <div className="mb-1 font-medium">
                                                            📊 สถิติระบบท่อ (สีเหลือง):
                                                        </div>
                                                        <div>
                                                            จำนวนท่อทั้งหมด: {pipes.length} เส้น
                                                        </div>
                                                        <div>
                                                            ความยาวรวม:{' '}
                                                            {formatDistance(
                                                                pipes.reduce(
                                                                    (sum, p) => sum + p.length,
                                                                    0
                                                                )
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Pipe editing controls */}
                                                    <div className="rounded-lg bg-blue-900/30 p-3">
                                                        <div className="mb-2 text-sm font-medium text-blue-300">
                                                            🔧 แก้ไขระบบท่อ:
                                                        </div>

                                                        <div className="mb-3 flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setPipeEditMode(
                                                                        pipeEditMode === 'add'
                                                                            ? 'view'
                                                                            : 'add'
                                                                    );
                                                                    setSelectedSprinklersForPipe(
                                                                        []
                                                                    );
                                                                }}
                                                                className={`flex-1 rounded py-2 text-xs font-medium transition-all ${
                                                                    pipeEditMode === 'add'
                                                                        ? 'bg-green-600 text-white'
                                                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                                }`}
                                                            >
                                                                ➕ เพิ่มท่อ
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setPipeEditMode(
                                                                        pipeEditMode === 'remove'
                                                                            ? 'view'
                                                                            : 'remove'
                                                                    );
                                                                    setSelectedSprinklersForPipe(
                                                                        []
                                                                    );
                                                                }}
                                                                className={`flex-1 rounded py-2 text-xs font-medium transition-all ${
                                                                    pipeEditMode === 'remove'
                                                                        ? 'bg-red-600 text-white'
                                                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                                }`}
                                                            >
                                                                ➖ ลบท่อ
                                                            </button>
                                                        </div>

                                                        {pipeEditMode === 'add' && (
                                                            <div className="space-y-2">
                                                                <div className="text-xs text-blue-200">
                                                                    เลือกหัวฉีด 2
                                                                    ตัวเพื่อเชื่อมต่อท่อ (
                                                                    {
                                                                        selectedSprinklersForPipe.length
                                                                    }
                                                                    /2)
                                                                </div>
                                                                {selectedSprinklersForPipe.length ===
                                                                    2 && (
                                                                    <button
                                                                        onClick={
                                                                            addPipeBetweenSprinklers
                                                                        }
                                                                        className="w-full rounded bg-green-700 py-2 text-xs font-medium text-white hover:bg-green-600"
                                                                    >
                                                                        ✅ เชื่อมต่อท่อ
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {pipeEditMode === 'remove' && (
                                                            <div className="space-y-2">
                                                                <div className="text-xs text-red-200">
                                                                    เลือกหัวฉีด 2
                                                                    ตัวเพื่อลบท่อระหว่างกัน (
                                                                    {
                                                                        selectedSprinklersForPipe.length
                                                                    }
                                                                    /2)
                                                                </div>
                                                                {selectedSprinklersForPipe.length ===
                                                                    2 && (
                                                                    <button
                                                                        onClick={
                                                                            removePipesBetweenSprinklers
                                                                        }
                                                                        className="w-full rounded bg-red-700 py-2 text-xs font-medium text-white hover:bg-red-600"
                                                                    >
                                                                        🗑️
                                                                        ลบท่อระหว่างหัวฉีดที่เลือก
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {selectedPipes.size > 0 && (
                                                            <div className="mt-2 space-y-2">
                                                                <div className="text-xs text-yellow-200">
                                                                    เลือกแล้ว: {selectedPipes.size}{' '}
                                                                    ท่อ
                                                                </div>
                                                                <button
                                                                    onClick={deleteSelectedPipes}
                                                                    className="w-full rounded bg-red-700 py-2 text-xs font-medium text-white hover:bg-red-600"
                                                                >
                                                                    🗑️ ลบท่อที่เลือก
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={clearPipes}
                                                        className="w-full rounded-lg bg-red-600 py-3 font-medium text-white transition-all hover:bg-red-700"
                                                    >
                                                        🗑️ ลบระบบท่อทั้งหมด
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="border-t border-gray-600 pt-4">
                                        <h4 className="mb-2 text-sm font-semibold text-gray-300">
                                            💡 วิธีการทำงาน (ระบบใหม่):
                                        </h4>
                                        <div className="space-y-2 text-xs text-gray-400">
                                            <div className="flex items-start gap-2">
                                                <span className="text-blue-400">1.</span>
                                                <span>วิเคราะห์จำนวนหัวฉีดและตำแหน่ง</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <span className="text-blue-400">2.</span>
                                                <span>เชื่อมต่อตรงสำหรับ ≤3 หัวฉีด</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <span className="text-blue-400">3.</span>
                                                <span>ใช้ MST algorithm สำหรับ &gt;3 หัวฉีด</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <span className="text-blue-400">4.</span>
                                                <span>
                                                    ท่อทุกเส้นมีขนาดเดียวกัน (ไม่แบ่งหลัก/สาขา)
                                                </span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <span className="text-green-400">5.</span>
                                                <span>สามารถแก้ไขเพิ่ม/ลบท่อได้หลังสร้างแล้ว</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-3">
                        <div className="h-[700px] w-full overflow-hidden rounded-lg border border-gray-700">
                            <MapContainer
                                center={mapCenter}
                                zoom={16}
                                maxZoom={22}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <SearchControl onSearch={handleSearch} />
                                <MapController center={mapCenter} />
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
                                <FeatureGroup ref={featureGroupRef}>
                                    <EditControl
                                        position="topleft"
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
        </div>
    );
}
