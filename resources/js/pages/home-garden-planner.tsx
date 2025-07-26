// resources/js/pages/home-garden-planner.tsx
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { router } from '@inertiajs/react';

import GoogleMapDesigner from '../components/homegarden/GoogleMapDesigner';
import CanvasDesigner from '../components/homegarden/CanvasDesigner';
import ImageDesigner from '../components/homegarden/ImageDesigner';
import Navbar from '../components/Navbar';
import { useLanguage } from '../contexts/LanguageContext';

import {
    Coordinate,
    CanvasCoordinate,
    GardenZone,
    SprinklerType,
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
    isPointInPolygon,
    calculateDistance,
    calculatePolygonArea,
    formatDistance,
    formatArea,
    saveGardenData,
    loadGardenData,
    clearGardenData,
    createInitialData,
    validateGardenData,
    canvasToGPS,
    getValidScale,
    generateSmartPipeNetwork,
    addCustomPipe,
    removePipeById,
    findPipesBetweenSprinklers,
} from '../utils/homeGardenData';

interface HistoryState {
    gardenZones: GardenZone[];
    sprinklers: Sprinkler[];
    waterSource: WaterSource | null;
    pipes: Pipe[];
    timestamp: number;
}

const ModeSelection: React.FC<{
    onSelectMode: (mode: 'map' | 'canvas' | 'image') => void;
}> = ({ onSelectMode }) => {
    const { t } = useLanguage();
    const modes = [
        {
            id: 'map',
            icon: '🗺️',
            title: t('Google Map'),
            desc: t('ใช้แผนที่ดาวเทียมเพื่อดูพื้นที่จริงของบ้านคุณ (แนะนำสำหรับบ้านหลังใหญ่)'),
            features: [
                t('เห็นพื้นที่จริงจากดาวเทียม'),
                t('วัดระยะทางแม่นยำ'),
                t('ค้นหาตำแหน่งได้ง่าย'),
            ],
            color: 'blue',
        },
        {
            id: 'canvas',
            icon: '✏️',
            title: t('วาดเอง'),
            desc: t('วาดแผนผังบ้านด้วยตัวเอง มีเครื่องมือช่วยวาด ตาราง และไม้บรรทัด'),
            features: [
                t('ไม่ต้องใช้อินเทอร์เน็ต'),
                t('มีตารางและไม้บรรทัดช่วย'),
                t('วาดได้อิสระตามต้องการ'),
            ],
            color: 'green',
        },
        {
            id: 'image',
            icon: '🖼️',
            title: t('ใช้รูปแบบแปลน'),
            desc: t('อัปโหลดรูปแบบแปลนบ้านที่มีอยู่แล้ว และวางระบบน้ำบนรูป'),
            features: [
                t('ใช้แบบแปลนที่มีอยู่แล้ว'),
                t('วางระบบบนรูปได้ทันที'),
                t('รองรับไฟล์ JPG, PNG'),
            ],
            color: 'purple',
        },
    ];

    return (
        <div className="min-h-screen w-full overflow-hidden bg-gray-900">
            <Navbar />
            <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center bg-gray-900 p-6">
                <div className="w-full max-w-4xl">
                    <h1 className="mb-8 text-center text-3xl font-bold text-white">
                        🏡 {t('เลือกวิธีการออกแบบระบบน้ำ')}
                    </h1>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {modes.map((mode) => (
                            <div
                                key={mode.id}
                                onClick={() => onSelectMode(mode.id as any)}
                                className={`cursor-pointer rounded-xl border-2 border-transparent bg-gray-800 p-6 transition-all hover:scale-105 hover:border-${mode.color}-500 hover:bg-gray-700`}
                            >
                                <div className="mb-4 text-center">
                                    <div className="mb-3 text-5xl">{mode.icon}</div>
                                    <h3 className="mb-2 text-xl font-semibold text-white">
                                        {mode.title}
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-300">{mode.desc}</p>
                                <ul className="mt-4 space-y-1 text-xs text-gray-400">
                                    {mode.features.map((feature, i) => (
                                        <li key={i}>✓ {feature}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 text-center text-sm text-gray-400">
                        {t('เลือกวิธีที่เหมาะสมกับคุณ • ข้อมูลทั้งหมดจะถูกบันทึกอัตโนมัติ')}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function HomeGardenPlanner() {
    const [designMode, setDesignMode] = useState<'map' | 'canvas' | 'image' | null>(null);
    const [activeTab, setActiveTab] = useState<'zones' | 'sprinklers' | 'pipes'>('zones');
    const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
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

    const [isGeneratingPipes, setIsGeneratingPipes] = useState(false);
    const [pipeGenerationError, setPipeGenerationError] = useState<string | null>(null);

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { t } = useLanguage();

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
                <span>{t('Undo')}</span>
            </button>
            <div className="h-4 w-px bg-gray-600"></div>
            <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="flex items-center gap-1 rounded px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500 disabled:hover:bg-transparent"
                title={`Redo (${historyIndex + 1}/${history.length})`}
            >
                <span className="text-base">↷</span>
                <span>{t('Redo')}</span>
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
                    t('ขนาดพื้นที่เกินกำหนด!') +
                        '\n\n' +
                        t('ขนาดที่วาด:') +
                        ' ' +
                        formatArea(area) +
                        '\n\n' +
                        t('ขนาดสูงสุดที่อนุญาต:') +
                        ' 300 ตร.ม.\n\n' +
                        t('กรุณาวาดพื้นที่ให้มีขนาดเล็กลง')
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
                    ? `${zoneTypeInfo?.name} (${t('ใน')} ${gardenZones.find((z) => z.id === parentZoneId)?.name}) ${baseNameCount}`
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
                    ? `${zoneTypeInfo?.name} (${t('ใน')} ${gardenZones.find((z) => z.id === parentZoneId)?.name}) ${baseNameCount}`
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

    const handleZoneDeleted = useCallback((e: any) => {
        const deletedLayers = e.layers.getLayers();

        deletedLayers.forEach((layer: any) => {
            const layerCoords = layer.getLatLngs()[0].map((latLng: any) => ({
                lat: latLng.lat,
                lng: latLng.lng,
            }));

            setGardenZones((prevZones) => {
                const zoneToDelete = prevZones.find((zone) => {
                    if (zone.coordinates.length !== layerCoords.length) return false;

                    return zone.coordinates.every((coord, index) => {
                        const tolerance = 0.000001;
                        return (
                            Math.abs(coord.lat - layerCoords[index].lat) < tolerance &&
                            Math.abs(coord.lng - layerCoords[index].lng) < tolerance
                        );
                    });
                });

                if (zoneToDelete) {
                    const zonesToDelete = [
                        zoneToDelete.id,
                        ...prevZones
                            .filter((z) => z.parentZoneId === zoneToDelete.id)
                            .map((z) => z.id),
                    ];

                    setSprinklers((prevSprinklers) =>
                        prevSprinklers.filter((s) => !zonesToDelete.includes(s.zoneId))
                    );

                    setPipes((prevPipes) =>
                        prevPipes.filter((p) => !zonesToDelete.includes(p.zoneId || ''))
                    );

                    return prevZones.filter((z) => !zonesToDelete.includes(z.id));
                }

                return prevZones;
            });
        });
    }, []);

    const handleCanvasSprinklerPlaced = useCallback(
        (position: CanvasCoordinate) => {
            const selectedSprinklerType = SPRINKLER_TYPES.find((s) => s.id === manualSprinklerType);
            if (!selectedSprinklerType) return;

            const sprinklerType = { ...selectedSprinklerType, radius: manualSprinklerRadius };

            let targetZone = gardenZones.find((zone) => {
                if (zone.type === 'forbidden') return false;
                return zone.canvasCoordinates && isPointInPolygon(position, zone.canvasCoordinates);
            });

            let zoneId = 'virtual_zone';
            if (targetZone) {
                if (targetZone.parentZoneId) {
                    alert(t('ไม่สามารถวางหัวฉีดในพื้นที่ย่อยได้ กรุณาวางในพื้นที่หลักเท่านั้น'));
                    return;
                }

                if (
                    targetZone.type === 'grass' &&
                    isPointInAvoidanceZone(position, targetZone.id)
                ) {
                    alert(t('ไม่สามารถวางหัวฉีดในพื้นที่ดอกไม้ ต้นไม้ หรือพื้นที่ต้องห้าม'));
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
        (zone: GardenZone, sprinklerType: SprinklerType) => {
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

    const generatePipeNetwork = useCallback(async () => {
        if (!waterSource) {
            return;
        }

        if (sprinklers.length === 0) {
            return;
        }

        setPipeGenerationError(null);
        setIsGeneratingPipes(true);

        try {
            const pipeNetwork = generateSmartPipeNetwork({
                waterSource,
                sprinklers,
                gardenZones,
                designMode,
                canvasData,
                imageData,
            });

            if (pipeNetwork.length === 0) {
                throw new Error(t('ไม่สามารถสร้างระบบท่อได้ กรุณาตรวจสอบตำแหน่งแหล่งน้ำและหัวฉีด'));
            }

            setPipes(pipeNetwork);
        } catch (error) {
            let errorMessage = t('เกิดข้อผิดพลาดในการสร้างระบบท่อ');

            if (error instanceof Error) {
                errorMessage = error.message;
            }

            setPipeGenerationError(errorMessage);
        } finally {
            setIsGeneratingPipes(false);
        }
    }, [waterSource, sprinklers, gardenZones, designMode, canvasData, imageData]);

    const clearPipes = useCallback(() => {
        setPipes([]);
        setSelectedPipes(new Set());
        setSelectedSprinklersForPipe([]);
        setPipeEditMode('view');
        setPipeGenerationError(null);
    }, []);

    const handleSprinklerClickForPipe = useCallback(
        (sprinklerId: string) => {
            if (pipeEditMode === 'add') {
                setSelectedSprinklersForPipe((prev) => {
                    if (prev.includes(sprinklerId)) {
                        return prev.filter((id) => id !== sprinklerId);
                    } else if (prev.length < 2) {
                        return [...prev, sprinklerId];
                    } else {
                        return [prev[0], sprinklerId];
                    }
                });
            } else if (pipeEditMode === 'remove') {
                setSelectedSprinklersForPipe((prev) => {
                    if (prev.includes(sprinklerId)) {
                        return prev.filter((id) => id !== sprinklerId);
                    } else {
                        return [...prev, sprinklerId];
                    }
                });
            } else {
                setSelectedSprinkler((prev) => (prev === sprinklerId ? null : sprinklerId));
            }
        },
        [pipeEditMode]
    );

    const addPipeBetweenSprinklers = useCallback(() => {
        if (selectedSprinklersForPipe.length !== 2) {
            return;
        }

        const [sprinkler1Id, sprinkler2Id] = selectedSprinklersForPipe;
        const isCanvasMode = designMode === 'canvas' || designMode === 'image';
        const scale = isCanvasMode ? canvasData?.scale || imageData?.scale || 20 : 20;

        const newPipe = addCustomPipe(
            sprinkler1Id,
            sprinkler2Id,
            sprinklers,
            isCanvasMode,
            scale,
            canvasData,
            imageData
        );

        if (newPipe) {
            setPipes((prev) => [...prev, newPipe]);
            setSelectedSprinklersForPipe([]);
        }
    }, [selectedSprinklersForPipe, sprinklers, designMode, canvasData, imageData]);

    const removePipesBetweenSprinklers = useCallback(() => {
        if (selectedSprinklersForPipe.length !== 2) {
            return;
        }

        const [sprinkler1Id, sprinkler2Id] = selectedSprinklersForPipe;
        const pipesToRemove = findPipesBetweenSprinklers(
            sprinkler1Id,
            sprinkler2Id,
            pipes,
            sprinklers
        );

        if (pipesToRemove.length > 0) {
            const pipeIdsToRemove = pipesToRemove.map((p) => p.id);
            setPipes((prev) => prev.filter((p) => !pipeIdsToRemove.includes(p.id)));
        }

        setSelectedSprinklersForPipe([]);
    }, [selectedSprinklersForPipe, pipes, sprinklers]);

    const handlePipeClick = useCallback((pipeId: string) => {
        setSelectedPipes((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(pipeId)) {
                newSet.delete(pipeId);
            } else {
                newSet.add(pipeId);
            }
            return newSet;
        });
    }, []);

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

    const deleteSprinklersByZone = useCallback(
        (zoneId: string) => {
            const selectedSprinklerInZone = sprinklers.find(
                (s) => s.id === selectedSprinkler && s.zoneId === zoneId
            );
            if (selectedSprinklerInZone) {
                setSelectedSprinkler(null);
            }
            setSprinklers((prev) => prev.filter((s) => s.zoneId !== zoneId));
        },
        [sprinklers, selectedSprinkler]
    );

    const handleMapClick = useCallback(
        (e: any) => {
            const { lat, lng } = e.latlng;

            if (editMode === 'place') {
                const selectedSprinklerType = SPRINKLER_TYPES.find(
                    (s) => s.id === manualSprinklerType
                );
                if (!selectedSprinklerType) return;

                const sprinklerType = { ...selectedSprinklerType, radius: manualSprinklerRadius };

                let targetZone = gardenZones.find((zone) => {
                    if (zone.type === 'forbidden') return false;
                    return isPointInPolygon({ lat, lng }, zone.coordinates);
                });

                let zoneId = 'virtual_zone';
                if (targetZone) {
                    if (targetZone.parentZoneId) {
                        return;
                    }

                    if (
                        targetZone.type === 'grass' &&
                        isPointInAvoidanceZone({ lat, lng }, targetZone.id)
                    ) {
                        return;
                    }
                    zoneId = targetZone.id;
                }

                const orientation = targetZone ? findLongestEdgeAngle(targetZone.coordinates) : 0;

                const newSprinkler: Sprinkler = {
                    id: `sprinkler_${Date.now()}`,
                    position: { lat, lng },
                    type: sprinklerType,
                    zoneId: zoneId,
                    orientation: orientation,
                };

                setSprinklers((prev) => [...prev, newSprinkler]);
            } else if (editMode === 'edit') {
                setWaterSource({
                    id: `source_${Date.now()}`,
                    position: { lat, lng },
                    type: 'main',
                });
            }
        },
        [
            editMode,
            gardenZones,
            findLongestEdgeAngle,
            isPointInAvoidanceZone,
            manualSprinklerType,
            manualSprinklerRadius,
        ]
    );

    const handleCanvasSprinklerDragged = useCallback(
        (sprinklerId: string, newPos: CanvasCoordinate) => {
            setSprinklers((prev) =>
                prev.map((s) =>
                    s.id === sprinklerId
                        ? {
                              ...s,
                              position: canvasToGPS(newPos, canvasData),
                              canvasPosition: newPos,
                          }
                        : s
                )
            );
        },
        [canvasData]
    );

    const handleCanvasSprinklerClick = useCallback(
        (sprinklerId: string) => {
            handleSprinklerClickForPipe(sprinklerId);
        },
        [handleSprinklerClickForPipe]
    );

    const handleCanvasWaterSourcePlaced = useCallback(
        (position: CanvasCoordinate) => {
            setWaterSource({
                id: `source_${Date.now()}`,
                position: canvasToGPS(position, canvasData),
                canvasPosition: position,
                type: 'main',
            });
        },
        [canvasData]
    );

    const handleWaterSourceDelete = useCallback(() => {
        setWaterSource(null);
    }, []);

    const handleImageUpload = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                setImageData({
                    url: e.target?.result as string,
                    width: img.width,
                    height: img.height,
                    scale: 20,
                    isScaleSet: false,
                });
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    }, []);

    const statistics = useMemo(() => {
        const activeZones = Object.keys(
            sprinklers.reduce((acc, s) => ({ ...acc, [s.zoneId]: true }), {})
        ).length;

        return { activeZones };
    }, [sprinklers]);

    const navigateToSummary = useCallback(() => {
        const data: GardenPlannerData = {
            gardenZones,
            sprinklers,
            waterSource,
            pipes,
            designMode,
            imageData,
            canvasData,
        };

        const errors = validateGardenData(data);
        if (errors.length > 0) {
            setValidationErrors(errors);
            setShowValidationErrors(true);
            return;
        }

        saveGardenData(data);
        router.visit('/home-garden/summary');
    }, [gardenZones, sprinklers, waterSource, pipes, designMode, imageData, canvasData]);

    React.useEffect(() => {
        setSelectedSprinkler(null);
        setSelectedSprinklersForPipe([]);
        setPipeEditMode('view');
    }, [editMode]);

    React.useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (designMode && (gardenZones.length > 0 || sprinklers.length > 0)) {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = setTimeout(() => {
                const data: GardenPlannerData = {
                    gardenZones,
                    sprinklers,
                    waterSource,
                    pipes,
                    designMode,
                    imageData,
                    canvasData,
                };
                saveGardenData(data);
            }, 1000);
        }
    }, [gardenZones, sprinklers, waterSource, pipes, designMode, imageData, canvasData]);

    useEffect(() => {
        if (pipeEditMode === 'add' && selectedSprinklersForPipe.length === 2) {
            addPipeBetweenSprinklers();
        }
        if (pipeEditMode === 'remove' && selectedSprinklersForPipe.length === 2) {
            removePipesBetweenSprinklers();
        }
    }, [selectedSprinklersForPipe, pipeEditMode]);

    if (!designMode) {
        return <ModeSelection onSelectMode={setDesignMode} />;
    }

    return (
        <div className="min-h-screen w-full overflow-hidden bg-gray-900">
            <Navbar />
            {showValidationErrors && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50">
                    <div className="mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
                        <h3 className="mb-4 text-xl font-bold text-red-400">
                            ❌ {t('ไม่สามารถดูสรุปผลได้')}
                        </h3>
                        <div className="mb-4 text-gray-200">
                            <p className="mb-2">{t('กรุณาแก้ไขปัญหาต่อไปนี้ก่อน:')}</p>
                            <ul className="list-inside list-disc space-y-1">
                                {validationErrors.map((error, index) => (
                                    <li key={index} className="text-sm text-gray-300">
                                        {error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button
                            onClick={() => setShowValidationErrors(false)}
                            className="w-full rounded-lg bg-blue-600 py-2 text-white transition-colors hover:bg-blue-700"
                        >
                            {t('ตกลง')}
                        </button>
                    </div>
                </div>
            )}

            <div className="mx-auto h-[calc(100vh-65px)] w-full overflow-auto px-4 py-2">
                <div className="mb-2 text-left">
                    <div className="flex items-center justify-between">
                        <h1 className="text-lg font-bold text-white">
                            🏡 {t('ระบบออกแบบระบบน้ำสำหรับสวนบ้าน')}
                            <span className="ml-2 text-xs font-normal text-gray-400">
                                (
                                {designMode === 'map'
                                    ? 'Google Map'
                                    : designMode === 'canvas'
                                      ? t('วาดเอง')
                                      : t('รูปแบบแปลน')}
                                )
                            </span>
                        </h1>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    resetAllData();
                                    setDesignMode(null);
                                }}
                                className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-600"
                            >
                                {t('เปลี่ยนวิธี')}
                            </button>
                            <button
                                onClick={() => {
                                    resetAllData();
                                }}
                                className="rounded-lg bg-red-600 px-4 py-2 text-xs text-white transition-colors hover:bg-red-700"
                            >
                                🗑️ {t('ลบทั้งหมด')}
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex rounded-lg bg-gray-800 p-1">
                                {[
                                    { id: 'zones', name: t('กำหนดโซน'), icon: '🗺️' },
                                    { id: 'sprinklers', name: t('วางหัวฉีด'), icon: '💧' },
                                    { id: 'pipes', name: t('ระบบท่อ'), icon: '🔧' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`rounded-md px-6 py-3 text-xs font-medium transition-all ${
                                            activeTab === tab.id
                                                ? 'bg-blue-600 text-white shadow-lg'
                                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                        }`}
                                    >
                                        {tab.icon} {tab.name}
                                    </button>
                                ))}
                            </div>

                            <UndoRedoButtons />

                            <button
                                onClick={navigateToSummary}
                                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 text-xs font-medium text-white shadow-lg transition-all hover:from-purple-700 hover:to-blue-700"
                            >
                                📊 {t('ดูสรุปผล')}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    {/* <div className="space-y-6 lg:col-span-1"> */}
                    <div className="order-2 space-y-6 overflow-auto lg:order-1 lg:col-span-1">
                        {activeTab === 'zones' && (
                            <div className="rounded-xl bg-gray-800/90 p-6 shadow-2xl backdrop-blur">
                                <h3 className="mb-4 text-xl font-semibold text-blue-400">
                                    🗺️ {t('จัดการโซนพื้นที่')}
                                </h3>

                                <div className="mb-4">
                                    <label className="mb-2 block text-sm font-medium text-gray-100">
                                        {t('เลือกประเภทโซน:')}
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
                                            ✏️ {t('เริ่มวาดโซนพื้นที่')}
                                        </button>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="rounded-lg bg-blue-900/30 p-3 text-center">
                                                <div className="text-sm font-medium text-blue-300">
                                                    🎯 {t('กำลังวาดโซน:')}
                                                    {
                                                        ZONE_TYPES.find(
                                                            (z) => z.id === selectedZoneType
                                                        )?.name
                                                    }
                                                </div>
                                                <div className="mt-1 text-xs text-blue-200">
                                                    {designMode === 'map'
                                                        ? t('คลิกและลากในแผนที่เพื่อวาดโซน')
                                                        : t('คลิกเพื่อวาดจุดต่าง ๆ ของโซน')}
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
                                                ❌ {t('ยกเลิกการวาด')}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {gardenZones.length > 0 && (
                                    <div>
                                        <h4 className="mb-2 text-sm font-medium text-gray-300">
                                            {t('โซนที่สร้างแล้ว:')}
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
                                                                                    ↳ {t('ใน')}
                                                                                    {
                                                                                        parentZone.name
                                                                                    }
                                                                                </span>
                                                                            )}
                                                                    </div>
                                                                    <div className="text-xs text-gray-200">
                                                                        {zoneSprinklers.length}{' '}
                                                                        {t('หัวฉีด')} •{' '}
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
                                                                                )?.nameEN
                                                                            }
                                                                            • {t('รัศมี')}
                                                                            {
                                                                                zone.sprinklerConfig
                                                                                    .radius
                                                                            }
                                                                            {t('ม.')}
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
                                                                            title={t(
                                                                                'ตั้งค่าหัวฉีด'
                                                                            )}
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
                                                                            title={t(
                                                                                'วางหัวฉีดในโซนนี้'
                                                                            )}
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
                                                                            title={t(
                                                                                'ลบหัวฉีดในโซนนี้'
                                                                            )}
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
                                                                    title={t('ลบโซน')}
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
                                                                            {t(
                                                                                'เลือกประเภทหัวฉีด:'
                                                                            )}
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
                                                                                                sprinkler.nameEN
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
                                                                                {t('รัศมีการฉีดน้ำ (เมตร):')}
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
                                                                                    {t('ม.')}
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
                                    💧 {t('จัดการหัวฉีดน้ำ')}
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
                                            🤖 {t('วางหัวฉีดอัตโนมัติ (ทุกโซน)')}
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
                                                    ? t('กำลังวางหัวฉีด - คลิกในแผนที่')
                                                    : t('กำลังวางหัวฉีด - คลิกในพื้นที่')
                                                : t('วางหัวฉีดเอง')}
                                        </button>

                                        {editMode === 'place' && (
                                            <div className="mt-3 space-y-3 border-t border-gray-600 pt-3">
                                                <div>
                                                    <label className="mb-2 block text-xs font-medium text-gray-300">
                                                        {t('เลือกประเภทหัวฉีด:')}
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
                                                                        {sprinkler.nameEN}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-xs font-medium text-gray-300">
                                                        {t('รัศมีการฉีดน้ำ (เมตร):')}
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
                                                            {manualSprinklerRadius} {t('ม.')}
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
                                                    ? t('กำลังวางแหล่งน้ำ - คลิกแผนที่')
                                                    : t('กำลังวางแหล่งน้ำ - คลิกในพื้นที่')
                                                : t('วางแหล่งน้ำ')}
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
                                                ? t('กำลังปรับตำแหน่ง - ลากหัวฉีด')
                                                : t('ปรับตำแหน่งหัวฉีด')}
                                        </button>

                                        {sprinklers.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    setSelectedSprinkler(null);
                                                    setSprinklers([]);
                                                }}
                                                className="w-full rounded-lg bg-red-600 py-3 font-medium text-white transition-all hover:bg-red-700"
                                            >
                                                🗑️ {t('ลบหัวฉีดทั้งหมด')}
                                            </button>
                                        )}
                                    </div>

                                    {sprinklers.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium text-gray-300">
                                                {t('สรุปหัวฉีด:')} {sprinklers.length} {t('ตัว')}
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
                                                                            {t('หัว')}
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
                                                                                    )?.nameEN
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
                                                                    {t('หัวฉีดแบบกำหนดเอง')}
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
                                                                    {t('หัว')}
                                                                </div>
                                                                <div className="text-gray-400">
                                                                    {t('หัวฉีดผสม')}
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
                                    🔧 {t('ระบบท่อน้ำ')}
                                </h3>

                                <div className="space-y-4">
                                    {!waterSource ? (
                                        <div className="rounded-lg border border-amber-500 bg-amber-900/30 p-4 text-amber-200">
                                            <div className="mb-2 flex items-center gap-2">
                                                <span className="text-lg">⚠️</span>
                                                <span className="font-semibold">
                                                    {t('ต้องวางแหล่งน้ำก่อน')}
                                                </span>
                                            </div>
                                            <p className="text-sm">
                                                {t('กรุณาไปแท็บ "วางหัวฉีด" และกดปุ่ม "วางแหล่งน้ำ" ก่อนสร้างระบบท่อ')}
                                            </p>
                                        </div>
                                    ) : sprinklers.length === 0 ? (
                                        <div className="rounded-lg border border-amber-500 bg-amber-900/30 p-4 text-amber-200">
                                            <div className="mb-2 flex items-center gap-2">
                                                <span className="text-lg">⚠️</span>
                                                <span className="font-semibold">
                                                    {t('ต้องวางหัวฉีดก่อน')}
                                                </span>
                                            </div>
                                            <p className="text-sm">
                                                {t('กรุณาไปแท็บ')} {t('"วางหัวฉีด"')}{' '}
                                                {t('และวางหัวฉีดก่อนสร้างระบบท่อ')}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="rounded-lg bg-green-900/30 p-3 text-xs text-green-300">
                                                <div className="mb-1 font-medium">
                                                    ✅ {t('พร้อมสร้างระบบท่อแล้ว')}
                                                </div>
                                                <div>
                                                    {t('แหล่งน้ำ:')} 1 {t('จุด')} • {t('หัวฉีด:')}{' '}
                                                    {sprinklers.length} {t('ตัว')}
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
                                                        🔧 {t('กำลังสร้างระบบท่อ...')}
                                                    </div>
                                                ) : (
                                                    '🚀 ' + t('สร้างระบบท่ออัตโนมัติ')
                                                )}
                                            </button>

                                            {pipeGenerationError && (
                                                <div className="rounded-lg border border-red-500 bg-red-900/30 p-3 text-red-200">
                                                    <div className="mb-1 flex items-center gap-2">
                                                        <span className="text-lg">❌</span>
                                                        <span className="font-semibold">
                                                            {t('เกิดข้อผิดพลาด')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm">{pipeGenerationError}</p>
                                                </div>
                                            )}

                                            {pipes.length > 0 && (
                                                <div className="space-y-3">
                                                    <div className="rounded-lg bg-purple-900/30 p-3 text-sm text-purple-300">
                                                        <div className="mb-1 font-medium">
                                                            📊 {t('สถิติระบบท่อ (สีม่วง):')}
                                                        </div>
                                                        <div>
                                                            {t('จำนวนท่อทั้งหมด:')} {pipes.length}{' '}
                                                            {t('เส้น')}
                                                        </div>
                                                        <div>
                                                            {t('ความยาวรวม:')}
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
                                                            🔧 {t('แก้ไขระบบท่อ:')}
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
                                                                ➕ {t('เพิ่มท่อ')}
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
                                                                ➖ {t('ลบท่อ')}
                                                            </button>
                                                        </div>

                                                        {pipeEditMode === 'add' && (
                                                            <div className="space-y-2">
                                                                <div className="text-xs text-blue-200">
                                                                    {t('เลือกหัวฉีด')} 2
                                                                    {t('ตัวเพื่อเชื่อมต่อท่อ')} (
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
                                                                        ✅ {t('เชื่อมต่อท่อ')}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {pipeEditMode === 'remove' && (
                                                            <div className="space-y-2">
                                                                <div className="text-xs text-red-200">
                                                                    {t('เลือกหัวฉีด')} 2
                                                                    {t('ตัวเพื่อลบท่อระหว่างกัน')} (
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
                                                                        {t(
                                                                            'ลบท่อระหว่างหัวฉีดที่เลือก'
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {selectedPipes.size > 0 && (
                                                            <div className="mt-2 space-y-2">
                                                                <div className="text-xs text-yellow-200">
                                                                    {t('เลือกแล้ว:')}{' '}
                                                                    {selectedPipes.size} {t('ท่อ')}
                                                                </div>
                                                                <button
                                                                    onClick={deleteSelectedPipes}
                                                                    className="w-full rounded bg-red-700 py-2 text-xs font-medium text-white hover:bg-red-600"
                                                                >
                                                                    🗑️ {t('ลบท่อที่เลือก')}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={clearPipes}
                                                        className="w-full rounded-lg bg-red-600 py-3 font-medium text-white transition-all hover:bg-red-700"
                                                    >
                                                        🗑️ {t('ลบระบบท่อทั้งหมด')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </div>
                            </div>
                        )}
                    </div>

                    {/* <div className="lg:col-span-3"> */}
                    <div className="order-1 lg:order-2 lg:col-span-3">
                        <div className="relative h-[83vh] overflow-hidden rounded-xl border border-gray-600 shadow-2xl">
                            {designMode === 'map' && (
                                <GoogleMapDesigner
                                    gardenZones={gardenZones}
                                    sprinklers={sprinklers}
                                    waterSource={waterSource}
                                    pipes={pipes}
                                    selectedZoneType={selectedZoneType}
                                    editMode={editMode}
                                    manualSprinklerType={manualSprinklerType}
                                    manualSprinklerRadius={manualSprinklerRadius}
                                    selectedSprinkler={selectedSprinkler}
                                    selectedPipes={selectedPipes}
                                    selectedSprinklersForPipe={selectedSprinklersForPipe}
                                    mainPipeDrawing={[]}
                                    onZoneCreated={handleZoneCreated}
                                    onZoneDeleted={handleZoneDeleted}
                                    onSprinklerPlaced={(position) => {
                                        const { lat, lng } = position;
                                        handleMapClick({ latlng: { lat, lng } });
                                    }}
                                    onWaterSourcePlaced={(position) => {
                                        setWaterSource({
                                            id: `source_${Date.now()}`,
                                            position,
                                            type: 'main',
                                        });
                                    }}
                                    onMainPipeClick={() => {}}
                                    onSprinklerClick={handleSprinklerClickForPipe}
                                    onSprinklerDelete={(sprinklerId) => {
                                        setSprinklers((prev) =>
                                            prev.filter((s) => s.id !== sprinklerId)
                                        );
                                        if (selectedSprinkler === sprinklerId) {
                                            setSelectedSprinkler(null);
                                        }
                                        setSelectedSprinklersForPipe((prev) =>
                                            prev.filter((id) => id !== sprinklerId)
                                        );
                                    }}
                                    onSprinklerDragged={(sprinklerId, position) => {
                                        setSprinklers((prev) =>
                                            prev.map((s) =>
                                                s.id === sprinklerId ? { ...s, position } : s
                                            )
                                        );
                                    }}
                                    onWaterSourceDelete={() => setWaterSource(null)}
                                    onPipeClick={handlePipeClick}
                                    onMapClick={handleMapClick}
                                    mapCenter={mapCenter}
                                    pipeEditMode={pipeEditMode}
                                />
                            )}

                            {designMode === 'canvas' && (
                                <div className="flex h-full w-full items-center justify-center bg-gray-900">
                                    <CanvasDesigner
                                        gardenZones={gardenZones}
                                        sprinklers={sprinklers}
                                        waterSource={waterSource}
                                        pipes={pipes}
                                        selectedZoneType={selectedZoneType}
                                        editMode={editMode}
                                        manualSprinklerType={manualSprinklerType}
                                        manualSprinklerRadius={manualSprinklerRadius}
                                        selectedSprinkler={selectedSprinkler}
                                        selectedPipes={selectedPipes}
                                        selectedSprinklersForPipe={selectedSprinklersForPipe}
                                        mainPipeDrawing={[]}
                                        canvasData={canvasData}
                                        onZoneCreated={handleCanvasZoneCreated}
                                        onSprinklerPlaced={handleCanvasSprinklerPlaced}
                                        onWaterSourcePlaced={handleCanvasWaterSourcePlaced}
                                        onMainPipePoint={() => {}}
                                        onSprinklerDragged={handleCanvasSprinklerDragged}
                                        onSprinklerClick={handleCanvasSprinklerClick}
                                        onSprinklerDelete={(id) => {
                                            setSprinklers((prev) =>
                                                prev.filter((s) => s.id !== id)
                                            );
                                            if (selectedSprinkler === id) {
                                                setSelectedSprinkler(null);
                                            }
                                            setSelectedSprinklersForPipe((prev) =>
                                                prev.filter((sprinklerId) => sprinklerId !== id)
                                            );
                                        }}
                                        onWaterSourceDelete={handleWaterSourceDelete}
                                        onPipeClick={handlePipeClick}
                                        hasMainArea={true}
                                        pipeEditMode={pipeEditMode}
                                    />
                                </div>
                            )}

                            {designMode === 'image' && (
                                <div className="h-full w-full items-center justify-center bg-gray-900 p-4">
                                    <ImageDesigner
                                        imageData={imageData}
                                        gardenZones={gardenZones}
                                        sprinklers={sprinklers}
                                        waterSource={waterSource}
                                        pipes={pipes}
                                        selectedZoneType={selectedZoneType}
                                        editMode={editMode}
                                        manualSprinklerType={manualSprinklerType}
                                        manualSprinklerRadius={manualSprinklerRadius}
                                        selectedSprinkler={selectedSprinkler}
                                        selectedPipes={selectedPipes}
                                        selectedSprinklersForPipe={selectedSprinklersForPipe}
                                        mainPipeDrawing={[]}
                                        onImageUpload={handleImageUpload}
                                        onZoneCreated={handleCanvasZoneCreated}
                                        onSprinklerPlaced={handleCanvasSprinklerPlaced}
                                        onWaterSourcePlaced={handleCanvasWaterSourcePlaced}
                                        onMainPipePoint={() => {}}
                                        onSprinklerDragged={handleCanvasSprinklerDragged}
                                        onSprinklerClick={handleCanvasSprinklerClick}
                                        onSprinklerDelete={(id) => {
                                            setSprinklers((prev) =>
                                                prev.filter((s) => s.id !== id)
                                            );
                                            if (selectedSprinkler === id) {
                                                setSelectedSprinkler(null);
                                            }
                                            setSelectedSprinklersForPipe((prev) =>
                                                prev.filter((sprinklerId) => sprinklerId !== id)
                                            );
                                        }}
                                        onWaterSourceDelete={handleWaterSourceDelete}
                                        onPipeClick={handlePipeClick}
                                        onScaleChange={(scale) => {
                                            setImageData((prev: any) => ({
                                                ...prev,
                                                scale,
                                                isScaleSet: true,
                                            }));
                                        }}
                                        pipeEditMode={pipeEditMode}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
