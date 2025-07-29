/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../components/Navbar';
import { Head, Link, router } from '@inertiajs/react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import * as turf from '@turf/turf';
import lineIntersect from '@turf/line-intersect';
import { getCropByValue } from '@/pages/utils/cropData';
import {
    ZONE_COLORS,
    OBSTACLE_TYPES,
    PIPE_TYPES,
    EQUIPMENT_TYPES,
    type EquipmentType,
} from '@/pages/utils/fieldMapConstants';
import {
    useMapState,
    useStepWizard,
    useFieldZoneState,
    usePipeSystemState,
    useEquipmentState,
    useIrrigationState,
} from '@/pages/hooks/useFieldMapState';
import Tooltip from '@/pages/components/Fieldcrop/Tooltip';
import FieldMapToolsPanel from '@/pages/components/Fieldcrop/FieldMapToolsPanel';
import FieldMapSmartControls from '@/pages/components/Fieldcrop/FieldMapSmartControls';
import ErrorBoundary from '@/pages/components/ErrorBoundary';
import ErrorMessage from '@/pages/components/ErrorMessage';
import LoadingSpinner from '@/pages/components/LoadingSpinner';

interface Coordinate {
    lat: number;
    lng: number;
}

interface SearchResult {
    x: number;
    y: number;
    label: string;
    address: string;
    place_id: string;
    bounds?: {
        north: number;
        south: number;
        east: number;
        west: number;
    } | null;
    raw?: any;
}

interface Zone {
    id: number | string;
    polygon: google.maps.Polygon;
    coordinates: Coordinate[];
    color: string;
    name: string;
}

interface Equipment {
    id: string;
    type: string;
    lat: number;
    lng: number;
    name: string;
    config: any;
    marker?: google.maps.Marker;
}

interface LateralPipe {
    id: number;
    coordinates: { lat: number; lng: number }[];
    type: string;
    name: string;
    color: string;
    zoneId: string | number;
    polyline?: google.maps.Polyline;
}

interface IrrigationPoint {
    id: number;
    lat: number;
    lng: number;
    type: string;
    radius: number;
    zoneId: string | number;
    marker?: google.maps.Marker;
    circle?: google.maps.Circle;
}

const DEFAULT_IRRIGATION_SETTINGS = {
    sprinkler: {
        defaultRadius: 8,
        minRadius: 3,
        maxRadius: 15,
        icon: '💧',
    },
    'drip-tape': {
        defaultSpacing: 0.3, // 30 cm
        minSpacing: 0.2, // 20 cm
        maxSpacing: 0.5, // 50 cm
        icon: '💧',
    },
    microsprinkler: {
        defaultRadius: 1.5,
        minRadius: 0.5,
        maxRadius: 3,
        icon: '🌊',
    },
    default: {
        defaultRadius: 5,
        minRadius: 1,
        maxRadius: 20,
        icon: '💧',
    },
} as const;

const getGoogleMapsConfig = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    
    if (!apiKey) {
        console.error('❌ Google Maps API Key not found! Please set VITE_GOOGLE_MAPS_API_KEY in .env file');
        console.log('Environment variables:', {
            NODE_ENV: import.meta.env.MODE,
            Available_VITE_vars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
        });
    } else {
        console.log('✅ Google Maps API Key loaded:', {
            length: apiKey.length,
            preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
        });
    }

    return {
        apiKey,
        libraries: ['drawing', 'geometry', 'places'] as const,
        defaultZoom: 15,
    };
};

interface GoogleMapComponentProps {
    center: google.maps.LatLngLiteral;
    zoom: number;
    onLoad: (map: google.maps.Map) => void;
    onDrawCreated: (overlay: google.maps.MVCObject, type: string) => void;
    drawingStage: string;
    currentZoneColor: string;
    drawingMode?: string;
    canDrawZone?: boolean;
    canDrawPipe?: boolean;
    currentObstacleType?: string;
    currentPipeType?: string;
    isPlacingEquipment?: boolean;
    selectedEquipmentType?: EquipmentType | null;
    zones?: any[];
    pipes?: any[];
    obstacles?: any[];
    equipmentIcons?: any[];
    mainField?: any;
    onMapClick?: (e: google.maps.MapMouseEvent) => void;
    onZoneClick?: (zone: any) => void;
    mapType: string;
    onCenterChanged?: (center: google.maps.LatLngLiteral) => void;
    onZoomChanged?: (zoom: number) => void;
}

const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
    center,
    zoom,
    onLoad,
    onDrawCreated,
    drawingStage,
    currentZoneColor,
    drawingMode,
    canDrawZone,
    canDrawPipe,
    currentObstacleType,
    currentPipeType,
    isPlacingEquipment,
    selectedEquipmentType,
    onMapClick,
    mapType,
    onCenterChanged,
    onZoomChanged,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map>();
    const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager>();
    const [currentDrawingMode, setCurrentDrawingMode] =
        useState<google.maps.drawing.OverlayType | null>(null);

    const lastExternalCenter = useRef<google.maps.LatLngLiteral>(center);
    const lastExternalZoom = useRef<number>(zoom);
    const isInternalChange = useRef(false);

    // Initialize map
    useEffect(() => {
        if (ref.current && !map && window.google) {
            const newMap = new google.maps.Map(ref.current, {
                center,
                zoom,
                mapTypeId: mapType as google.maps.MapTypeId,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: false,
                gestureHandling: 'greedy',
                disableDoubleClickZoom: false,
                clickableIcons: true,
            });

            const drawingMgr = new google.maps.drawing.DrawingManager({
                drawingMode: null,
                drawingControl: false,
                polygonOptions: {
                    fillColor: '#22C55E',
                    fillOpacity: 0.3,
                    strokeColor: '#22C55E',
                    strokeWeight: 2,
                    clickable: false,
                    editable: false,
                    zIndex: 1,
                },
                polylineOptions: {
                    strokeColor: '#3388ff',
                    strokeWeight: 4,
                    clickable: false,
                    editable: false,
                    zIndex: 1,
                },
            });

            drawingMgr.setMap(newMap);

            google.maps.event.addListener(
                drawingMgr,
                'overlaycomplete',
                (event: google.maps.drawing.OverlayCompleteEvent) => {
                    drawingMgr.setDrawingMode(null);
                    setCurrentDrawingMode(null);
                    onDrawCreated(event.overlay, event.type);
                }
            );

            newMap.addListener('zoom_changed', () => {
                if (!isInternalChange.current) {
                    const newZoom = newMap.getZoom();
                    if (newZoom !== undefined && onZoomChanged) {
                        lastExternalZoom.current = newZoom;
                        onZoomChanged(newZoom);
                    }
                }
            });

            newMap.addListener('center_changed', () => {
                if (!isInternalChange.current) {
                    const newCenter = newMap.getCenter();
                    if (newCenter && onCenterChanged) {
                        const centerObj = {
                            lat: newCenter.lat(),
                            lng: newCenter.lng(),
                        };
                        lastExternalCenter.current = centerObj;
                        onCenterChanged(centerObj);
                    }
                }
            });

            setMap(newMap);
            setDrawingManager(drawingMgr);
            onLoad(newMap);
        }
    }, [center, map, mapType, onCenterChanged, onDrawCreated, onLoad, onZoomChanged, zoom, ref]);
    
    useEffect(() => {
        if (map && onMapClick) {
            const clickListener = google.maps.event.addListener(
                map,
                'click',
                (e: google.maps.MapMouseEvent) => {
                    if (e.stop) e.stop();
                    onMapClick(e);
                }
            );
            return () => {
                google.maps.event.removeListener(clickListener);
            };
        }
    }, [map, onMapClick]);

    // Update center and zoom
    useEffect(() => {
        if (
            map &&
            (Math.abs(center.lat - lastExternalCenter.current.lat) > 0.0001 ||
                Math.abs(center.lng - lastExternalCenter.current.lng) > 0.0001 ||
                Math.abs(zoom - lastExternalZoom.current) > 0.1)
        ) {
            isInternalChange.current = true;
            map.setCenter(center);
            map.setZoom(zoom);
            lastExternalCenter.current = center;
            lastExternalZoom.current = zoom;
            setTimeout(() => {
                isInternalChange.current = false;
            }, 100);
        }
    }, [map, center.lat, center.lng, zoom]);

    // Get current drawing options
    const getCurrentDrawingOptions = useCallback(() => {
        if (drawingStage === 'field') {
            return {
                polygonOptions: {
                    fillColor: '#22C55E',
                    fillOpacity: 0.2,
                    strokeColor: '#22C55E',
                    strokeWeight: 3,
                    clickable: false,
                    editable: false,
                    zIndex: 1,
                },
            };
        } else if (drawingStage === 'zones' && drawingMode === 'zone') {
            return {
                polygonOptions: {
                    fillColor: currentZoneColor,
                    fillOpacity: 0.3,
                    strokeColor: currentZoneColor,
                    strokeWeight: 2,
                    clickable: false,
                    editable: false,
                    zIndex: 2,
                },
            };
        } else if (drawingStage === 'zones' && drawingMode === 'obstacle') {
            const obstacleConfig =
                OBSTACLE_TYPES[currentObstacleType as keyof typeof OBSTACLE_TYPES];
            return {
                polygonOptions: {
                    fillColor: obstacleConfig?.color || '#ff0000',
                    fillOpacity: 0.4,
                    strokeColor: obstacleConfig?.color || '#ff0000',
                    strokeWeight: 2,
                    clickable: false,
                    editable: false,
                    zIndex: 2,
                },
            };
        } else if (drawingStage === 'pipes') {
            const pipeConfig = PIPE_TYPES[currentPipeType as keyof typeof PIPE_TYPES];
            return {
                polylineOptions: {
                    strokeColor: pipeConfig?.color || '#3388ff',
                    strokeWeight: pipeConfig?.weight || 4,
                    strokeOpacity: pipeConfig?.opacity || 1,
                    clickable: false,
                    editable: false,
                    zIndex: 2,
                },
            };
        }
        return {};
    }, [drawingStage, drawingMode, currentZoneColor, currentObstacleType, currentPipeType]);

    // Recreate drawing manager
    const recreateDrawingManager = useCallback(() => {
        if (!map || !drawingManager) return null;

        drawingManager.setMap(null);

        const newDrawingMgr = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false,
            ...getCurrentDrawingOptions(),
        });

        newDrawingMgr.setMap(map);

        google.maps.event.addListener(
            newDrawingMgr,
            'overlaycomplete',
            (event: google.maps.drawing.OverlayCompleteEvent) => {
                newDrawingMgr.setDrawingMode(null);
                setCurrentDrawingMode(null);
                onDrawCreated(event.overlay, event.type);
            }
        );

        setDrawingManager(newDrawingMgr);
        return newDrawingMgr;
    }, [map, drawingManager, getCurrentDrawingOptions, onDrawCreated]);

    // Start drawing
    const startDrawing = useCallback(
        (type: 'polygon' | 'polyline') => {
            const currentDrawingMgr = recreateDrawingManager();
            if (!currentDrawingMgr) return;

            const mode =
                type === 'polygon'
                    ? google.maps.drawing.OverlayType.POLYGON
                    : google.maps.drawing.OverlayType.POLYLINE;

            setTimeout(() => {
                currentDrawingMgr.setDrawingMode(mode);
                setCurrentDrawingMode(mode);
            }, 50);
        },
        [recreateDrawingManager]
    );

    // Stop drawing
    const stopDrawing = useCallback(() => {
        if (drawingManager) {
            drawingManager.setDrawingMode(null);
            setCurrentDrawingMode(null);
        }
    }, [drawingManager]);

    // Update map type
    useEffect(() => {
        if (map && mapType) {
            map.setMapTypeId(mapType as google.maps.MapTypeId);
        }
    }, [map, mapType]);

    // Stop drawing when mode changes
    useEffect(() => {
        if (drawingManager && currentDrawingMode) {
            stopDrawing();
        }
    }, [drawingMode, drawingStage]);

    // Update cursor for equipment placement
    useEffect(() => {
        if (map) {
            if (isPlacingEquipment && selectedEquipmentType) {
                map.setOptions({
                    draggableCursor: 'crosshair',
                    draggingCursor: 'crosshair',
                });
            } else {
                map.setOptions({
                    draggableCursor: null,
                    draggingCursor: null,
                });
            }
        }
    }, [map, isPlacingEquipment, selectedEquipmentType]);

    return (
        <>
            <div ref={ref} style={{ width: '100%', height: '100%' }} />

            {/* Drawing Controls Overlay */}
            <div
                className="absolute left-2 top-2 z-10 max-w-xs rounded-md border border-white p-2 shadow-md"
                style={{ backgroundColor: '#000005' }}
            >
                {/* Step 1: Field Drawing */}
                {drawingStage === 'field' && (
                    <div className="flex flex-col space-y-1">
                        <div className="text-xs font-semibold text-white">Step 1: Draw Field</div>
                        <button
                            onClick={() => startDrawing('polygon')}
                            disabled={currentDrawingMode !== null}
                            className={`rounded border border-white px-2 py-1 text-xs transition-colors ${
                                currentDrawingMode === google.maps.drawing.OverlayType.POLYGON
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                            } disabled:opacity-50`}
                        >
                            🏔️{' '}
                            {currentDrawingMode === google.maps.drawing.OverlayType.POLYGON
                                ? 'Drawing...'
                                : 'Draw Field'}
                        </button>
                        {currentDrawingMode && (
                            <button
                                onClick={stopDrawing}
                                className="rounded border border-white bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                            >
                                ❌ Cancel
                            </button>
                        )}
                    </div>
                )}

                {/* Step 2: Zones & Obstacles */}
                {drawingStage === 'zones' && (
                    <div className="flex flex-col space-y-1">
                        <div className="text-xs font-semibold text-white">
                            Step 2: Zones & Obstacles
                        </div>

                        {drawingMode === 'zone' && canDrawZone && (
                            <button
                                onClick={() => startDrawing('polygon')}
                                disabled={currentDrawingMode !== null}
                                className={`rounded border border-white px-2 py-1 text-xs transition-colors ${
                                    currentDrawingMode === google.maps.drawing.OverlayType.POLYGON
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                } disabled:opacity-50`}
                            >
                                🎨{' '}
                                {currentDrawingMode === google.maps.drawing.OverlayType.POLYGON
                                    ? 'Drawing...'
                                    : 'Draw Zone'}
                            </button>
                        )}

                        {drawingMode === 'obstacle' && (
                            <button
                                onClick={() => startDrawing('polygon')}
                                disabled={currentDrawingMode !== null}
                                className={`rounded border border-white px-2 py-1 text-xs transition-colors ${
                                    currentDrawingMode === google.maps.drawing.OverlayType.POLYGON
                                        ? 'bg-red-600 text-white'
                                        : 'bg-red-500 text-white hover:bg-red-600'
                                } disabled:opacity-50`}
                            >
                                🚫{' '}
                                {currentDrawingMode === google.maps.drawing.OverlayType.POLYGON
                                    ? 'Drawing...'
                                    : 'Draw Obstacle'}
                            </button>
                        )}

                        {currentDrawingMode && (
                            <button
                                onClick={stopDrawing}
                                className="rounded border border-white bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                            >
                                ❌ Cancel
                            </button>
                        )}
                    </div>
                )}

                {/* Step 3: Pipes */}
                {drawingStage === 'pipes' && canDrawPipe && (
                    <div className="flex flex-col space-y-1">
                        <div className="text-xs font-semibold text-white">Step 3: Pipe System</div>
                        <button
                            onClick={() => startDrawing('polyline')}
                            disabled={currentDrawingMode !== null}
                            className={`rounded border border-white px-2 py-1 text-xs transition-colors ${
                                currentDrawingMode === google.maps.drawing.OverlayType.POLYLINE
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-purple-500 text-white hover:bg-purple-600'
                            } disabled:opacity-50`}
                        >
                            🔧{' '}
                            {currentDrawingMode === google.maps.drawing.OverlayType.POLYLINE
                                ? 'Drawing...'
                                : `Draw ${PIPE_TYPES[currentPipeType as keyof typeof PIPE_TYPES]?.name || 'Pipe'}`}
                        </button>
                        {currentDrawingMode && (
                            <button
                                onClick={stopDrawing}
                                className="rounded border border-white bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                            >
                                ❌ Cancel
                            </button>
                        )}
                    </div>
                )}

                {/* Equipment Placement Mode */}
                {isPlacingEquipment && selectedEquipmentType && (
                    <div className="flex flex-col space-y-1">
                        <div className="text-xs font-semibold text-white">Equipment Placement</div>
                        <div className="rounded border border-white bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                            {EQUIPMENT_TYPES[selectedEquipmentType].icon} Click to place{' '}
                            {EQUIPMENT_TYPES[selectedEquipmentType].name}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

interface FieldMapProps {
    crops?: string;
    irrigation?: string;
}

export default function FieldMap({ crops, irrigation }: FieldMapProps) {
    // Custom hooks for state management
    const urlParams = new URLSearchParams(window.location.search);
    const isEditMode = urlParams.get('edit') === 'true';
    const targetStep = parseInt(urlParams.get('step') || '1');

    const mapState = useMapState();
    const stepWizard = useStepWizard();
    const fieldZoneState = useFieldZoneState();
    const pipeSystemState = usePipeSystemState();
    const equipmentState = useEquipmentState();
    const irrigationState = useIrrigationState();

    // Destructure state
    const {
        mapCenter,
        setMapCenter,
        mapZoom,
        setMapZoom,
        mapType,
        setMapType,
        searchQuery,
        setSearchQuery,
        searchResults,
        setSearchResults,
        isSearching,
        setIsSearching,
        isLocationSelected,
        setIsLocationSelected,
        showDropdown,
        setShowDropdown,
        blurTimeoutRef,
    } = mapState;

    const {
        currentStep,
        setCurrentStep,
        stepCompleted,
        setStepCompleted,
        drawingStage,
        setDrawingStage,
    } = stepWizard;

    const {
        selectedCrops,
        setSelectedCrops,
        setSelectedIrrigationType,
        mainField,
        setMainField,
        fieldAreaSize,
        setFieldAreaSize,
        zones,
        setZones,
        obstacles,
        setObstacles,
        currentZoneColor,
        setCurrentZoneColor,
        currentObstacleType,
        setCurrentObstacleType,
        selectedZone,
        setSelectedZone,
        showPlantSelector,
        setShowPlantSelector,
        zoneAssignments,
        setZoneAssignments,
        canDrawZone,
        setCanDrawZone,
        usedColors,
        setUsedColors,
        drawingMode,
        setDrawingMode,
        rowSpacing,
        setRowSpacing,
        tempRowSpacing,
        setTempRowSpacing,
        editingRowSpacingForCrop,
        setEditingRowSpacingForCrop,
        plantSpacing,
        setPlantSpacing,
        tempPlantSpacing,
        setTempPlantSpacing,
        editingPlantSpacingForCrop,
        setEditingPlantSpacingForCrop,
    } = fieldZoneState;

    const {
        currentPipeType,
        setCurrentPipeType,
        pipes,
        setPipes,
        canDrawPipe,
        setCanDrawPipe,
        isGeneratingPipes,
        setIsGeneratingPipes,
    } = pipeSystemState;

    const gridEnabled = false;
    const snapEnabled = false;
    const pipeSnapEnabled = false;
    const setGridEnabled = () => {};
    const setSnapEnabled = () => {};
    const setPipeSnapEnabled = () => {};

    const {
        equipmentIcons,
        setEquipmentIcons,
        selectedEquipmentType,
        setSelectedEquipmentType,
        isPlacingEquipment,
        setIsPlacingEquipment,
        equipmentHistory,
        setEquipmentHistory,
        equipmentHistoryIndex,
        setEquipmentHistoryIndex,
    } = equipmentState;

    const {
        irrigationAssignments,
        setIrrigationAssignments,
        irrigationPoints,
        setIrrigationPoints,
        irrigationLines,
        setIrrigationLines,
        irrigationSettings,
        setIrrigationSettings,
        irrigationRadius,
        setIrrigationRadius,
        sprinklerOverlap,
        setSprinklerOverlap,
    } = irrigationState;

    const [dripSpacing, setDripSpacing] = useState<Record<string, number>>({});

    const [plantingPoints, setPlantingPoints] = useState<any[]>([]);
    const [zoneSummaries, setZoneSummaries] = useState<Record<string, any>>({});

    const createEquipmentMarkerIcon = useCallback(
        (equipmentType: EquipmentType, equipmentConfig: any) => {
            const svg = `
            <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
                <defs>
                    <filter id="equipment-shadow-${Date.now()}" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
                    </filter>
                </defs>
                <circle cx="25" cy="25" r="23" fill="white" stroke="${equipmentConfig.color || '#4F46E5'}" stroke-width="3" filter="url(#equipment-shadow-${Date.now()})"/>
                <text x="25" y="32" text-anchor="middle" font-size="24" fill="${equipmentConfig.color || '#4F46E5'}" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${equipmentConfig.icon || '🔧'}</text>
            </svg>
        `;

            const encodedSvg = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22');

            return {
                url: `data:image/svg+xml;charset=UTF-8,${encodedSvg}`,
                scaledSize: new google.maps.Size(50, 50),
                anchor: new google.maps.Point(25, 25),
            };
        },
        []
    );

    const [error, setError] = useState<string | null>(null);
    const [isLoading] = useState(false);

    // Map instance
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [hasRestoredOnce, setHasRestoredOnce] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const [mapObjects, setMapObjects] = useState<{
        zones: google.maps.Polygon[];
        pipes: google.maps.Polyline[];
        obstacles: google.maps.Polygon[];
        equipment: google.maps.Marker[];
        irrigation: google.maps.Marker[];
        irrigationCircles: google.maps.Circle[];
        irrigationLines: google.maps.Polyline[];
        plantMarkers: google.maps.Marker[];
        zoneLabels: google.maps.Marker[];
    }>({
        zones: [],
        pipes: [],
        obstacles: [],
        equipment: [],
        irrigation: [],
        irrigationCircles: [],
        irrigationLines: [],
        plantMarkers: [],
        zoneLabels: [],
    });

    useEffect(() => {
        if (isEditMode) {
            const savedData = localStorage.getItem('fieldMapData');
            if (savedData) {
                try {
                    const parsedData = JSON.parse(savedData);
                    console.log('🔄 Loading saved project data for editing:', parsedData);

                    if (parsedData.selectedCrops) setSelectedCrops(parsedData.selectedCrops);
                    if (parsedData.fieldAreaSize) setFieldAreaSize(parsedData.fieldAreaSize);
                    if (parsedData.zoneAssignments) setZoneAssignments(parsedData.zoneAssignments);
                    if (parsedData.irrigationAssignments)
                        setIrrigationAssignments(parsedData.irrigationAssignments);
                    if (parsedData.irrigationSettings)
                        setIrrigationSettings(parsedData.irrigationSettings);
                    if (parsedData.rowSpacing) setRowSpacing(parsedData.rowSpacing);
                    if (parsedData.plantSpacing) setPlantSpacing(parsedData.plantSpacing);
                    if (parsedData.mapCenter) setMapCenter(parsedData.mapCenter);
                    if (parsedData.mapZoom) setMapZoom(parsedData.mapZoom);
                    if (parsedData.mapType) setMapType(parsedData.mapType);
                    if (parsedData.dripSpacing) setDripSpacing(parsedData.dripSpacing);
                    if (parsedData.zoneSummaries) setZoneSummaries(parsedData.zoneSummaries);

                    setStepCompleted({
                        1: true,
                        2: true,
                        3: true,
                        4:
                            parsedData.irrigationAssignments &&
                            Object.keys(parsedData.irrigationAssignments).length > 0,
                    });

                    setCurrentStep(targetStep);
                    const stages = ['', 'field', 'zones', 'pipes', 'irrigation'];
                    setDrawingStage(
                        stages[targetStep] as 'field' | 'zones' | 'pipes' | 'irrigation'
                    );

                    console.log(`✅ Edit mode: Set to step ${targetStep}`);
                } catch (error) {
                    console.error('Error loading saved data for editing:', error);
                    handleError('Failed to load saved project data');
                }
            } else {
                console.warn('No saved data found for editing');
                handleError('No saved project data found');
            }
        } else {
            if (crops) {
                const cropArray = crops.split(',').filter(Boolean);
                setSelectedCrops(cropArray);
            }
            if (irrigation) {
                setSelectedIrrigationType(irrigation);
            }
        }
    }, [isEditMode, targetStep, crops, irrigation]);

    const selectedCropObjects = selectedCrops
        .map((cropValue) => getCropByValue(cropValue))
        .filter(Boolean);

    const handleError = useCallback((errorMessage: string) => {
        setError(errorMessage);
        console.error(errorMessage);
        setTimeout(() => setError(null), 5000);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const handleCenterChanged = useCallback(
        (newCenter: google.maps.LatLngLiteral) => {
            setMapCenter([newCenter.lat, newCenter.lng]);
        },
        [setMapCenter]
    );

    const handleZoomChanged = useCallback(
        (newZoom: number) => {
            setMapZoom(newZoom);
        },
        [setMapZoom]
    );

    const validateStep = useCallback(
        (step: number): boolean => {
            switch (step) {
                case 1:
                    return mainField !== null && selectedCropObjects.length > 0;
                case 2:
                    return zones.length > 0 && Object.keys(zoneAssignments).length > 0;
                case 3:
                    return pipes.length > 0;
                case 4:
                    return Object.keys(irrigationAssignments).length > 0;
                default:
                    return false;
            }
        },
        [
            mainField,
            selectedCropObjects.length,
            zones.length,
            zoneAssignments,
            pipes.length,
            irrigationAssignments,
        ]
    );

    const goToStep = useCallback(
        (step: number) => {
            if (step < 1 || step > 4) return;

            if (step > currentStep) {
                for (let i = 1; i < step; i++) {
                    if (!validateStep(i)) {
                        handleError(`Please complete step ${i} first`);
                        return;
                    }
                }
            }

            setCurrentStep(step);
            const stages = ['', 'field', 'zones', 'pipes', 'irrigation'];
            setDrawingStage(stages[step] as 'field' | 'zones' | 'pipes' | 'irrigation');

            if (step !== 3 && isPlacingEquipment) {
                setIsPlacingEquipment(false);
                setSelectedEquipmentType(null);
                if (map) {
                    map.setOptions({ draggableCursor: null });
                }
            }

            if (step === 2) {
                setCanDrawZone(zones.length < ZONE_COLORS.length);
                setDrawingMode('zone');
            } else if (step === 3) {
                setCanDrawPipe(true);
            }
        },
        [
            currentStep,
            validateStep,
            setCurrentStep,
            setDrawingStage,
            zones.length,
            setCanDrawZone,
            setDrawingMode,
            setCanDrawPipe,
            handleError,
            isPlacingEquipment,
            selectedEquipmentType,
            setIsPlacingEquipment,
            setSelectedEquipmentType,
            map,
        ]
    );

    const nextStep = useCallback(() => {
        if (validateStep(currentStep)) {
            setStepCompleted((prev) => ({ ...prev, [currentStep]: true }));
            if (currentStep < 4) {
                goToStep(currentStep + 1);
            }
        } else {
            handleError(`Please complete step ${currentStep} requirements first`);
        }
    }, [validateStep, currentStep, setStepCompleted, goToStep, handleError]);

    const previousStep = useCallback(() => {
        if (currentStep > 1) {
            goToStep(currentStep - 1);
        }
    }, [currentStep, goToStep]);

    const pathToCoordinates = useCallback(
        (path: google.maps.MVCArray<google.maps.LatLng>): Array<{ lat: number; lng: number }> => {
            const coordinates: Array<{ lat: number; lng: number }> = [];
            for (let i = 0; i < path.getLength(); i++) {
                const latLng = path.getAt(i);
                coordinates.push({ lat: latLng.lat(), lng: latLng.lng() });
            }
            return coordinates;
        },
        []
    );

    const startPlacingEquipment = useCallback(
        (equipmentType: EquipmentType) => {
            setSelectedEquipmentType(equipmentType);
            setIsPlacingEquipment(true);
        },
        [setSelectedEquipmentType, setIsPlacingEquipment]
    );

    const cancelPlacingEquipment = useCallback(() => {
        setIsPlacingEquipment(false);
        setSelectedEquipmentType(null);
    }, [setIsPlacingEquipment, setSelectedEquipmentType]);

    const placeEquipmentAtPosition = useCallback(
        (lat: number, lng: number) => {
            if (!selectedEquipmentType || !map) return;

            try {
                const equipmentConfig = EQUIPMENT_TYPES[selectedEquipmentType];
                const equipmentId = Date.now().toString();

                const newEquipment = {
                    id: equipmentId,
                    type: selectedEquipmentType,
                    lat: lat,
                    lng: lng,
                    name: `${equipmentConfig.name} ${equipmentIcons.filter((e) => e.type === selectedEquipmentType).length + 1}`,
                    config: equipmentConfig,
                };

                const marker = new google.maps.Marker({
                    position: { lat, lng },
                    map: map,
                    title: equipmentConfig.name,
                    icon: createEquipmentMarkerIcon(selectedEquipmentType, equipmentConfig),
                    clickable: true,
                    optimized: false,
                    visible: true,
                    zIndex: 1000,
                });

                const infoWindow = new google.maps.InfoWindow({
                    content: `
                    <div style="text-align: center; min-width: 150px;">
                        <h3 style="margin: 0 0 8px 0; color: #333;">${equipmentConfig.name}</h3>
                        <p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">${equipmentConfig.description || 'Equipment'}</p>
                        <button onclick="window.removeEquipment('${equipmentId}')" 
                                style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Remove Equipment
                        </button>
                    </div>
                `,
                });

                marker.addListener('click', () => {
                    mapObjects.equipment.forEach((otherMarker) => {
                        if ((otherMarker as any).infoWindow) {
                            (otherMarker as any).infoWindow.close();
                        }
                    });

                    infoWindow.open(map, marker);
                });

                (marker as any).infoWindow = infoWindow;
                (newEquipment as Equipment).marker = marker;

                const newEquipmentState = [...equipmentIcons, newEquipment];
                setEquipmentIcons(newEquipmentState);
                setMapObjects((prev) => ({
                    ...prev,
                    equipment: [...prev.equipment, marker],
                }));

                setEquipmentHistory((prev) => {
                    const newHistory = prev.slice(0, equipmentHistoryIndex + 1);
                    newHistory.push([...newEquipmentState]);
                    return newHistory;
                });
                setEquipmentHistoryIndex((prev) => prev + 1);
            } catch (error) {
                console.error('Error placing equipment:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                handleError('Error placing equipment: ' + errorMessage);
            }
        },
        [
            selectedEquipmentType,
            map,
            equipmentIcons,
            mapObjects.equipment,
            setEquipmentIcons,
            setMapObjects,
            setEquipmentHistory,
            setEquipmentHistoryIndex,
            equipmentHistoryIndex,
            handleError,
            createEquipmentMarkerIcon,
        ]
    );

    const handleMapClick = useCallback(
        (e: google.maps.MapMouseEvent) => {
            if (isPlacingEquipment && selectedEquipmentType && e.latLng) {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                placeEquipmentAtPosition(lat, lng);
            }
        },
        [isPlacingEquipment, selectedEquipmentType, placeEquipmentAtPosition]
    );

    const handleDrawCreated = useCallback(
        (overlay: google.maps.MVCObject, type: string) => {
            try {
                if (type === 'polygon') {
                    const polygon = overlay as google.maps.Polygon;
                    const path = polygon.getPath();
                    const coordinates = pathToCoordinates(path);

                    if (drawingStage === 'field') {
                        try {
                            const polygonCoords = coordinates.map((coord: Coordinate) => [
                                coord.lng,
                                coord.lat,
                            ]);
                            const firstPoint = polygonCoords[0];
                            const lastPoint = polygonCoords[polygonCoords.length - 1];

                            if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
                                polygonCoords.push(firstPoint);
                            }

                            const turfPolygon = turf.polygon([polygonCoords]);
                            const area = turf.area(turfPolygon);

                            polygon.setOptions({
                                fillColor: '#22C55E',
                                fillOpacity: 0.2,
                                strokeColor: '#22C55E',
                                strokeWeight: 3,
                                clickable: false,
                                editable: false,
                                zIndex: 1,
                            });

                            setMainField({
                                polygon: polygon,
                                coordinates: coordinates,
                                area: area,
                            });

                            setFieldAreaSize(area);
                            setMapObjects((prev) => ({ ...prev, zones: [...prev.zones, polygon] }));
                        } catch (error) {
                            console.error('Field creation error:', error);
                            handleError('Error calculating field area');
                            polygon.setMap(null);
                            return;
                        }
                    } else if (drawingStage === 'zones') {
                        if (drawingMode === 'zone' && canDrawZone) {
                            const newZone = {
                                id: Date.now(),
                                polygon: polygon,
                                coordinates: coordinates,
                                color: currentZoneColor,
                                name: `Zone ${zones.length + 1}`,
                            };

                            polygon.setOptions({
                                fillColor: currentZoneColor,
                                fillOpacity: 0.3,
                                strokeColor: currentZoneColor,
                                strokeWeight: 2,
                                clickable: false,
                                editable: false,
                                zIndex: 1,
                            });

                            polygon.addListener('click', (e: google.maps.MapMouseEvent) => {
                                if (isPlacingEquipment && selectedEquipmentType && e.latLng) {
                                    const lat = e.latLng.lat();
                                    const lng = e.latLng.lng();
                                    placeEquipmentAtPosition(lat, lng);
                                } else if (currentStep === 2) {
                                    setSelectedZone(newZone);
                                    setShowPlantSelector(true);
                                }
                            });

                            setZones((prev) => [...prev, newZone]);
                            setUsedColors((prev) => [...prev, currentZoneColor]);

                            const newUsedColors = [...usedColors, currentZoneColor];
                            const availableColors = ZONE_COLORS.filter(
                                (color) => !newUsedColors.includes(color)
                            );

                            if (availableColors.length > 0) {
                                setCurrentZoneColor(availableColors[0]);
                            } else {
                                setCanDrawZone(false);
                            }

                            setMapObjects((prev) => ({ ...prev, zones: [...prev.zones, polygon] }));
                        } else if (drawingMode === 'obstacle') {
                            const obstacleConfig =
                                OBSTACLE_TYPES[currentObstacleType as keyof typeof OBSTACLE_TYPES];
                            if (!obstacleConfig) {
                                handleError('Invalid obstacle type');
                                polygon.setMap(null);
                                return;
                            }

                            const newObstacle = {
                                id: Date.now(),
                                polygon: polygon,
                                coordinates: coordinates,
                                type: currentObstacleType,
                                name: `${obstacleConfig.name} ${obstacles.length + 1}`,
                            };

                            polygon.setOptions({
                                fillColor: obstacleConfig.color,
                                fillOpacity: 0.4,
                                strokeColor: obstacleConfig.color,
                                strokeWeight: 2,
                                clickable: false,
                                editable: false,
                                zIndex: 2,
                            });

                            setObstacles((prev) => [...prev, newObstacle]);
                            setMapObjects((prev) => ({
                                ...prev,
                                obstacles: [...prev.obstacles, polygon],
                            }));
                        }
                    }
                } else if (type === 'polyline') {
                    const polyline = overlay as google.maps.Polyline;
                    const path = polyline.getPath();
                    const coordinates = pathToCoordinates(path);

                    if (drawingStage === 'pipes' && canDrawPipe) {
                        const pipeConfig = PIPE_TYPES[currentPipeType as keyof typeof PIPE_TYPES];
                        if (!pipeConfig) {
                            handleError('Invalid pipe type');
                            polyline.setMap(null);
                            return;
                        }

                        const newPipe = {
                            id: Date.now(),
                            polyline: polyline,
                            coordinates: coordinates,
                            type: currentPipeType,
                            name: `${pipeConfig.name} ${pipes.filter((p) => p.type === currentPipeType).length + 1}`,
                            color: pipeConfig.color,
                        };

                        polyline.setOptions({
                            strokeColor: pipeConfig.color,
                            strokeWeight: pipeConfig.weight || 4,
                            strokeOpacity: pipeConfig.opacity || 1,
                            clickable: false,
                            editable: false,
                            zIndex: 2,
                        });

                        setPipes((prev) => [...prev, newPipe]);
                        setMapObjects((prev) => ({ ...prev, pipes: [...prev.pipes, polyline] }));
                    }
                }
            } catch (error) {
                console.error('Error in handleDrawCreated:', error);
                handleError('Drawing error. Please try again.');

                if (overlay && 'setMap' in overlay && typeof overlay.setMap === 'function') {
                    overlay.setMap(null);
                }
            }
        },
        [
            drawingStage,
            drawingMode,
            canDrawZone,
            canDrawPipe,
            currentZoneColor,
            currentObstacleType,
            currentPipeType,
            zones,
            obstacles,
            pipes,
            usedColors,
            pathToCoordinates,
            setMainField,
            setFieldAreaSize,
            setZones,
            setUsedColors,
            setCurrentZoneColor,
            setCanDrawZone,
            setObstacles,
            setPipes,
            setMapObjects,
            setSelectedZone,
            setShowPlantSelector,
            handleError,
            isPlacingEquipment,
            selectedEquipmentType,
            placeEquipmentAtPosition,
        ]
    );

    const clearAllZoneLabels = useCallback(() => {
        zoneLabelsRef.current.forEach((marker) => {
            if (marker && typeof marker.setMap === 'function') {
                marker.setMap(null);
            }
        });
        zoneLabelsRef.current = [];
        setMapObjects((prev) => ({ ...prev, zoneLabels: [] }));
    }, []);

    const clearAllMapObjects = useCallback(() => {
        clearAllZoneLabels();

        Object.entries(mapObjects).forEach(([key, objects]) => {
            if (key !== 'zoneLabels' && Array.isArray(objects)) {
                objects.forEach((obj: any) => {
                    if (obj && typeof obj.setMap === 'function') {
                        obj.setMap(null);
                    }
                });
            }
        });

        setMapObjects({
            zones: [],
            pipes: [],
            obstacles: [],
            equipment: [],
            irrigation: [],
            irrigationCircles: [],
            irrigationLines: [],
            plantMarkers: [],
            zoneLabels: [],
        });
    }, [clearAllZoneLabels]);

    const resetAll = useCallback(() => {
        if (confirm('⚠️ Reset all data? All drawn elements will be lost.')) {
            localStorage.removeItem('fieldMapData');

            if (mainField && mainField.polygon) {
                mainField.polygon.setMap(null);
            }

            clearAllMapObjects();

            zoneLabelsRef.current = [];

            setMainField(null);
            setZones([]);
            setObstacles([]);
            setZoneAssignments({});
            setPipes([]);
            setUsedColors([]);
            setCanDrawZone(true);
            setCanDrawPipe(true);
            setCurrentZoneColor(ZONE_COLORS[0]);
            setCurrentPipeType('main');
            setDrawingMode('zone');
            setCurrentStep(1);
            setStepCompleted({});
            setDrawingStage('field');
            setFieldAreaSize(0);
            setEquipmentIcons([]);
            setSelectedEquipmentType(null);
            setIsPlacingEquipment(false);
            setEquipmentHistory([[]]);
            setEquipmentHistoryIndex(0);
            setIrrigationAssignments({});
            setIrrigationPoints([]);
            setIrrigationLines([]);
            setIrrigationSettings({});
            setIrrigationRadius({});
            setSprinklerOverlap({});
            setDripSpacing({});
            setZoneSummaries({});
            setPlantingPoints([]);
            setError(null);
            setHasRestoredOnce(false);
            setIsRestoring(false);

            setTimeout(() => {
                setIsResetting(false);
                console.log('🧹 Reset completed');
            }, 300);
        }
    }, [
        clearAllMapObjects,
        mainField,
        setMainField,
        setZones,
        setObstacles,
        setZoneAssignments,
        setPipes,
        setUsedColors,
        setCanDrawZone,
        setCanDrawPipe,
        setCurrentZoneColor,
        setCurrentPipeType,
        setDrawingMode,
        setCurrentStep,
        setStepCompleted,
        setDrawingStage,
        setFieldAreaSize,
        setEquipmentIcons,
        setSelectedEquipmentType,
        setIsPlacingEquipment,
        setEquipmentHistory,
        setEquipmentHistoryIndex,
        setIrrigationAssignments,
        setIrrigationPoints,
        setIrrigationLines,
        setIrrigationSettings,
        setIrrigationRadius,
        setSprinklerOverlap,
        setDripSpacing,
        setZoneSummaries,
        setPlantingPoints,
    ]);

    const clearAllEquipment = useCallback(() => {
        if (equipmentIcons.length === 0) return;

        if (confirm('Remove all equipment?')) {
            mapObjects.equipment.forEach((marker) => {
                if ((marker as any).infoWindow) {
                    (marker as any).infoWindow.close();
                }
                marker.setMap(null);
            });

            setEquipmentIcons([]);
            setMapObjects((prev) => ({ ...prev, equipment: [] }));
        }
    }, [equipmentIcons, mapObjects.equipment, setEquipmentIcons, setMapObjects]);

    const undoEquipment = useCallback(() => {
        if (equipmentHistoryIndex > 0) {
            const newIndex = equipmentHistoryIndex - 1;
            const restoredEquipment = equipmentHistory[newIndex];

            mapObjects.equipment.forEach((marker) => {
                if ((marker as any).infoWindow) {
                    (marker as any).infoWindow.close();
                }
                marker.setMap(null);
            });

            const newMarkers: google.maps.Marker[] = [];
            restoredEquipment.forEach((equipment: Equipment) => {
                if (map && equipment.lat && equipment.lng) {
                    const equipmentConfig = EQUIPMENT_TYPES[equipment.type as EquipmentType];
                    const markerIcon = createEquipmentMarkerIcon(
                        equipment.type as EquipmentType,
                        equipmentConfig
                    );

                    const marker = new google.maps.Marker({
                        position: { lat: equipment.lat, lng: equipment.lng },
                        map: map,
                        title: equipment.name,
                        icon: markerIcon,
                        optimized: false,
                    });

                    newMarkers.push(marker);
                    equipment.marker = marker;
                }
            });

            setEquipmentIcons([...restoredEquipment]);
            setEquipmentHistoryIndex(newIndex);
            setMapObjects((prev) => ({ ...prev, equipment: newMarkers }));
        }
    }, [
        equipmentHistory,
        equipmentHistoryIndex,
        mapObjects.equipment,
        map,
        setEquipmentIcons,
        setEquipmentHistoryIndex,
        setMapObjects,
        createEquipmentMarkerIcon,
    ]);

    const redoEquipment = useCallback(() => {
        if (equipmentHistoryIndex < equipmentHistory.length - 1) {
            const newIndex = equipmentHistoryIndex + 1;
            const restoredEquipment = equipmentHistory[newIndex];

            mapObjects.equipment.forEach((marker) => {
                if ((marker as any).infoWindow) {
                    (marker as any).infoWindow.close();
                }
                marker.setMap(null);
            });

            const newMarkers: google.maps.Marker[] = [];
            restoredEquipment.forEach((equipment: Equipment) => {
                if (map && equipment.lat && equipment.lng) {
                    const equipmentConfig = EQUIPMENT_TYPES[equipment.type as EquipmentType];
                    const markerIcon = createEquipmentMarkerIcon(
                        equipment.type as EquipmentType,
                        equipmentConfig
                    );

                    const marker = new google.maps.Marker({
                        position: { lat: equipment.lat, lng: equipment.lng },
                        map: map,
                        title: equipment.name,
                        icon: markerIcon,
                        optimized: false,
                    });

                    newMarkers.push(marker);
                    equipment.marker = marker;
                }
            });

            setEquipmentIcons([...restoredEquipment]);
            setEquipmentHistoryIndex(newIndex);
            setMapObjects((prev) => ({ ...prev, equipment: newMarkers }));
        }
    }, [
        equipmentHistory,
        equipmentHistoryIndex,
        mapObjects.equipment,
        map,
        setEquipmentIcons,
        setEquipmentHistoryIndex,
        setMapObjects,
        createEquipmentMarkerIcon,
    ]);

    useEffect(() => {
        (window as any).removeEquipment = (equipmentId: string) => {
            const equipmentToRemove = equipmentIcons.find((e) => e.id === equipmentId);
            if (!equipmentToRemove) return;

            const equipmentConfig = EQUIPMENT_TYPES[equipmentToRemove.type as EquipmentType];

            if (confirm(`Remove ${equipmentConfig.name}?`)) {
                const newEquipmentState = equipmentIcons.filter((e) => e.id !== equipmentId);
                setEquipmentIcons(newEquipmentState);

                if (equipmentToRemove.marker) {
                    if ((equipmentToRemove.marker as any).infoWindow) {
                        (equipmentToRemove.marker as any).infoWindow.close();
                    }
                    equipmentToRemove.marker.setMap(null);
                    setMapObjects((prev) => ({
                        ...prev,
                        equipment: prev.equipment.filter(
                            (marker) => marker !== equipmentToRemove.marker
                        ),
                    }));
                }

                setEquipmentHistory((prev) => {
                    const newHistory = prev.slice(0, equipmentHistoryIndex + 1);
                    newHistory.push([...newEquipmentState]);
                    return newHistory;
                });
                setEquipmentHistoryIndex((prev) => prev + 1);
            }
        };

        return () => {
            delete (window as any).removeEquipment;
        };
    }, [
        equipmentIcons,
        setEquipmentIcons,
        setMapObjects,
        setEquipmentHistory,
        setEquipmentHistoryIndex,
        equipmentHistoryIndex,
    ]);

    const handleSearch = useCallback(
        async (query: string) => {
            if (!query.trim() || !map) {
                setSearchResults([]);
                setShowDropdown(false);
                return;
            }

            setIsSearching(true);
            setShowDropdown(true);
            try {
                const { Place } = (await google.maps.importLibrary(
                    'places'
                )) as google.maps.PlacesLibrary;

                const request = {
                    textQuery: query,
                    fields: ['displayName', 'location', 'formattedAddress', 'viewport'],
                    locationBias: map.getBounds() || undefined,
                    maxResultCount: 5,
                };

                const { places } = await Place.searchByText(request);

                if (places && places.length > 0) {
                    const searchResults: SearchResult[] = places.map((place: any) => ({
                        x: place.location?.lng() || 0,
                        y: place.location?.lat() || 0,
                        label: place.displayName || '',
                        address: place.formattedAddress || '',
                        place_id: (place.place_id || place.id) ?? '',
                        bounds: place.viewport
                            ? {
                                  north: place.viewport.getNorthEast().lat(),
                                  south: place.viewport.getSouthWest().lat(),
                                  east: place.viewport.getNorthEast().lng(),
                                  west: place.viewport.getSouthWest().lng(),
                              }
                            : null,
                        raw: place,
                    }));

                    setSearchResults(searchResults);
                    setShowDropdown(searchResults.length > 0);
                } else {
                    setSearchResults([]);
                    setShowDropdown(false);
                }
                setIsSearching(false);
            } catch (error) {
                console.error('Places search error:', error);

                try {
                    const service = new google.maps.places.PlacesService(map);
                    const request = {
                        query: query,
                        locationBias: map.getBounds() || undefined,
                    };

                    service.textSearch(request, (results, status) => {
                        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                            const searchResults = results.slice(0, 5).map((place) => ({
                                x: place.geometry?.location?.lng() || 0,
                                y: place.geometry?.location?.lat() || 0,
                                label: place.name || '',
                                address: place.formatted_address || '',
                                place_id: place.place_id,
                                bounds: place.geometry?.viewport
                                    ? {
                                          north: place.geometry.viewport.getNorthEast().lat(),
                                          south: place.geometry.viewport.getSouthWest().lat(),
                                          east: place.geometry.viewport.getNorthEast().lng(),
                                          west: place.geometry.viewport.getSouthWest().lng(),
                                      }
                                    : null,
                                raw: place,
                            }));

                            setSearchResults(searchResults);
                            setShowDropdown(searchResults.length > 0);
                        } else {
                            setSearchResults([]);
                            setShowDropdown(false);
                        }
                        setIsSearching(false);
                    });
                } catch (fallbackError) {
                    console.error('Fallback search error:', fallbackError);
                    setSearchResults([]);
                    setShowDropdown(false);
                    setIsSearching(false);
                    handleError('Unable to search places');
                }
            }
        },
        [map, setSearchResults, setShowDropdown, setIsSearching, handleError]
    );

    useEffect(() => {
        if (isLocationSelected) {
            setIsLocationSelected(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            handleSearch(searchQuery);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, isLocationSelected, handleSearch]);

    const goToLocation = useCallback(
        (result: SearchResult) => {
            if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
                blurTimeoutRef.current = null;
            }

            setShowDropdown(false);
            setSearchResults([]);

            setMapCenter([result.y, result.x]);
            setMapZoom(16);
            setIsLocationSelected(true);
            setSearchQuery(result.label || result.address);

            if (result.bounds && map) {
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(new google.maps.LatLng(result.bounds.south, result.bounds.west));
                bounds.extend(new google.maps.LatLng(result.bounds.north, result.bounds.east));
                map.fitBounds(bounds);
            } else if (map) {
                map.setCenter({ lat: result.y, lng: result.x });
                map.setZoom(16);
            }
        },
        [
            blurTimeoutRef,
            setShowDropdown,
            setSearchResults,
            setMapCenter,
            setMapZoom,
            setIsLocationSelected,
            setSearchQuery,
            map,
        ]
    );

    const clearSearch = useCallback(() => {
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
        }
        setSearchQuery('');
        setSearchResults([]);
        setIsLocationSelected(false);
        setShowDropdown(false);
        setIsSearching(false);
    }, [
        blurTimeoutRef,
        setSearchQuery,
        setSearchResults,
        setIsLocationSelected,
        setShowDropdown,
        setIsSearching,
    ]);

    const getCurrentLocation = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setMapCenter([latitude, longitude]);
                    setMapZoom(15);
                },
                () => {
                    handleError('Unable to get current location');
                }
            );
        }
    }, [setMapCenter, setMapZoom, handleError]);

    const addNewZone = useCallback(() => {
        if (zones.length >= ZONE_COLORS.length) {
            handleError('Maximum number of zones reached');
            return;
        }

        const availableColors = ZONE_COLORS.filter((color) => !usedColors.includes(color));
        if (availableColors.length > 0) {
            setCurrentZoneColor(availableColors[0]);
            setCanDrawZone(true);
            setDrawingMode('zone');
        }
    }, [
        zones.length,
        usedColors,
        setCurrentZoneColor,
        setCanDrawZone,
        setDrawingMode,
        handleError,
    ]);

    const zoneLabelsRef = useRef<google.maps.Marker[]>([]);

    const createZoneLabelSVG = useCallback(
        (zoneId: string, zoneColor: string, cropIcon: string) => {
            return `<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
            <defs>
                <filter id="shadow-${zoneId}" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
                </filter>
            </defs>
            <circle cx="25" cy="25" r="23" fill="white" stroke="${zoneColor}" stroke-width="3" filter="url(#shadow-${zoneId})"/>
            <text x="25" y="32" text-anchor="middle" font-size="24" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${cropIcon}</text>
        </svg>`;
        },
        []
    );

    const updateZoneLabel = useCallback(
        (zoneId: string, cropValue: string | null) => {
            if (!map) return;

            const zone = zones.find((z) => z.id.toString() === zoneId);
            if (!zone || !zone.polygon) return;

            const existingIndex = zoneLabelsRef.current.findIndex(
                (marker: any) => marker?.zoneId === zoneId
            );
            if (existingIndex !== -1) {
                const existingMarker = zoneLabelsRef.current[existingIndex];
                if (existingMarker) {
                    existingMarker.setMap(null);
                    zoneLabelsRef.current.splice(existingIndex, 1);
                }
            }

            if (cropValue) {
                const crop = getCropByValue(cropValue);
                if (!crop) return;

                try {
                    const bounds = new google.maps.LatLngBounds();
                    zone.coordinates.forEach((coord: Coordinate) => {
                        bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
                    });
                    const center = bounds.getCenter();

                    const svgIcon = createZoneLabelSVG(zoneId, zone.color, crop.icon);
                    const encodedSvg = encodeURIComponent(svgIcon)
                        .replace(/'/g, '%27')
                        .replace(/"/g, '%22');

                    const marker = new google.maps.Marker({
                        position: center,
                        map: map,
                        title: `${zone.name} - ${crop.name}`,
                        icon: {
                            url: `data:image/svg+xml;charset=UTF-8,${encodedSvg}`,
                            scaledSize: new google.maps.Size(50, 50),
                            anchor: new google.maps.Point(25, 25),
                        },
                        zIndex: 10,
                        clickable: true,
                    });

                    marker.addListener('click', () => {
                        const infoWindow = new google.maps.InfoWindow({
                            content: `
                                <div style="text-align: center; padding: 10px; min-width: 150px;">
                                    <div style="font-size: 24px; margin-bottom: 8px;">${crop.icon}</div>
                                    <h4 style="margin: 0 0 4px 0; color: #333;">${zone.name}</h4>
                                    <p style="margin: 0; color: #666; font-size: 14px;">${crop.name}</p>
                                </div>
                            `,
                        });
                        infoWindow.open(map, marker);
                    });

                    (marker as any).zoneId = zoneId;
                    (marker as any).cropValue = cropValue;

                    zoneLabelsRef.current.push(marker);

                    setMapObjects((prev) => ({
                        ...prev,
                        zoneLabels: [...zoneLabelsRef.current],
                    }));
                } catch (error) {
                    console.error('Error creating zone label:', error);
                }
            }
        },
        [zones, map, createZoneLabelSVG]
    );

    const restoreZoneLabels = useCallback(
        (zoneAssignments: any, restoredZones: Zone[]) => {
            if (!map) return;

            try {
                zoneLabelsRef.current.forEach((marker) => {
                    if (marker && typeof marker.setMap === 'function') {
                        marker.setMap(null);
                    }
                });
                zoneLabelsRef.current = [];

                restoredZones.forEach((zone) => {
                    const zoneId = zone.id.toString();
                    const cropValue = zoneAssignments[zoneId];

                    if (cropValue) {
                        updateZoneLabel(zoneId, cropValue);
                    }
                });
            } catch (error) {
                console.error('Error restoring zone labels:', error);
            }
        },
        [map, updateZoneLabel]
    );

    const assignPlantToZone = useCallback(
        (zoneId: string, cropValue: string) => {
            setZoneAssignments((prev) => ({
                ...prev,
                [zoneId]: cropValue,
            }));

            setTimeout(() => {
                updateZoneLabel(zoneId, cropValue);
            }, 50);

            setShowPlantSelector(false);
            setSelectedZone(null);
        },
        [updateZoneLabel, setZoneAssignments, setShowPlantSelector, setSelectedZone]
    );

    const removePlantFromZone = useCallback(
        (zoneId: string) => {
            setZoneAssignments((prev) => {
                const newAssignments = { ...prev };
                delete newAssignments[zoneId];
                return newAssignments;
            });

            setTimeout(() => {
                updateZoneLabel(zoneId, null);
            }, 50);
        },
        [updateZoneLabel, setZoneAssignments]
    );

    const deleteZone = useCallback(
        (zoneId: string) => {
            const zoneToDelete = zones.find((zone) => zone.id.toString() === zoneId);
            if (!zoneToDelete) return;

            if (confirm(`Delete ${zoneToDelete.name}?`)) {
                if (zoneToDelete.polygon) {
                    zoneToDelete.polygon.setMap(null);
                }

                const labelIndex = zoneLabelsRef.current.findIndex(
                    (marker: any) => marker?.zoneId === zoneId
                );
                if (labelIndex !== -1) {
                    const labelMarker = zoneLabelsRef.current[labelIndex];
                    if (labelMarker) {
                        labelMarker.setMap(null);
                        zoneLabelsRef.current.splice(labelIndex, 1);
                    }
                }

                setZones((prev) => prev.filter((zone) => zone.id.toString() !== zoneId));
                setZoneAssignments((prev) => {
                    const newAssignments = { ...prev };
                    delete newAssignments[zoneId];
                    return newAssignments;
                });

                setUsedColors((prev) => prev.filter((color) => color !== zoneToDelete.color));

                setMapObjects((prev) => ({
                    ...prev,
                    zoneLabels: [...zoneLabelsRef.current],
                }));
            }
        },
        [zones, setZones, setZoneAssignments, setUsedColors]
    );

    const generateLateralPipesForZone = useCallback(
        (zone: Zone) => {
            if (!zone || !zone.coordinates || !map) return;

            try {
                const zonePolygonForTurf = turf.polygon([
                    [
                        ...zone.coordinates.map((c) => [c.lng, c.lat]),
                        [zone.coordinates[0].lng, zone.coordinates[0].lat],
                    ],
                ]);

                const zoneSubmainPipes = pipes
                    .filter(
                        (pipe) =>
                            pipe.type === 'submain' &&
                            pipe.polyline &&
                            pipe.coordinates &&
                            pipe.coordinates.length >= 2
                    )
                    .filter((pipe) => {
                        return pipe.coordinates.some((coord) =>
                            google.maps.geometry.poly.containsLocation(
                                new google.maps.LatLng(coord.lat, coord.lng),
                                zone.polygon
                            )
                        );
                    });

                const lateralPipes: any[] = [];

                if (zoneSubmainPipes.length > 0) {
                    zoneSubmainPipes.forEach((submainPipe, pipeIndex) => {
                        const submainCoords = submainPipe.coordinates;

                        for (
                            let segmentIndex = 0;
                            segmentIndex < submainCoords.length - 1;
                            segmentIndex++
                        ) {
                            const segmentStart = submainCoords[segmentIndex];
                            const segmentEnd = submainCoords[segmentIndex + 1];

                            const segmentStartLatLng = new google.maps.LatLng(
                                segmentStart.lat,
                                segmentStart.lng
                            );
                            const segmentEndLatLng = new google.maps.LatLng(
                                segmentEnd.lat,
                                segmentEnd.lng
                            );

                            const segmentDistance =
                                google.maps.geometry.spherical.computeDistanceBetween(
                                    segmentStartLatLng,
                                    segmentEndLatLng
                                );

                            if (segmentDistance < 1) continue;

                            const heading = google.maps.geometry.spherical.computeHeading(
                                segmentStartLatLng,
                                segmentEndLatLng
                            );
                            const perpHeading = heading + 90;

                            const lateralSpacingMeters = 10;
                            const numLateralsInSegment = Math.floor(
                                segmentDistance / lateralSpacingMeters
                            );

                            for (let i = 0; i <= numLateralsInSegment; i++) {
                                const fraction =
                                    numLateralsInSegment > 0 ? i / numLateralsInSegment : 0;

                                const basePointLatLng = google.maps.geometry.spherical.interpolate(
                                    segmentStartLatLng,
                                    segmentEndLatLng,
                                    fraction
                                );

                                if (
                                    !google.maps.geometry.poly.containsLocation(
                                        basePointLatLng,
                                        zone.polygon
                                    )
                                ) {
                                    continue;
                                }

                                const longLineLength = 5000;
                                const p1 = google.maps.geometry.spherical.computeOffset(
                                    basePointLatLng,
                                    longLineLength / 2,
                                    perpHeading
                                );
                                const p2 = google.maps.geometry.spherical.computeOffset(
                                    basePointLatLng,
                                    -longLineLength / 2,
                                    perpHeading
                                );

                                const turfLine = turf.lineString([
                                    [p1.lng(), p1.lat()],
                                    [p2.lng(), p2.lat()],
                                ]);

                                const intersects = lineIntersect(turfLine, zonePolygonForTurf);
                                if (intersects.features.length >= 2) {
                                    const sorted = intersects.features
                                        .map((f) => f.geometry.coordinates)
                                        .sort((a, b) => {
                                            const da =
                                                Math.pow(a[0] - p1.lng(), 2) +
                                                Math.pow(a[1] - p1.lat(), 2);
                                            const db =
                                                Math.pow(b[0] - p1.lng(), 2) +
                                                Math.pow(b[1] - p1.lat(), 2);
                                            return da - db;
                                        });
                                    const coordinates = sorted.map((coord) => ({
                                        lat: coord[1],
                                        lng: coord[0],
                                    }));
                                    if (coordinates.length < 2) return;
                                    const pipeId =
                                        Date.now() +
                                        Math.random() +
                                        pipeIndex * 10000 +
                                        segmentIndex * 1000 +
                                        i;
                                    const lateralPipe = {
                                        id: pipeId,
                                        coordinates: coordinates,
                                        type: 'lateral',
                                        name: `Lateral ${lateralPipes.length + 1}`,
                                        color: PIPE_TYPES.lateral?.color || '#00ff00',
                                        zoneId: zone.id,
                                    };
                                    const polyline = new google.maps.Polyline({
                                        path: coordinates,
                                        strokeColor: lateralPipe.color,
                                        strokeWeight: 2,
                                        strokeOpacity: 0.8,
                                        map: map,
                                        clickable: false,
                                        zIndex: 2,
                                    });
                                    (lateralPipe as LateralPipe).polyline = polyline;
                                    lateralPipes.push(lateralPipe as LateralPipe);
                                }
                            }
                        }
                    });
                } else {
                    const bounds = new google.maps.LatLngBounds();
                    zone.coordinates.forEach((coord: Coordinate) => {
                        bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
                    });

                    const ne = bounds.getNorthEast();
                    const sw = bounds.getSouthWest();

                    const gridSpacingMeters = 15;
                    const latSpacing = gridSpacingMeters / 111320;

                    for (let lat = sw.lat(); lat <= ne.lat(); lat += latSpacing) {
                        const turfLine = turf.lineString([
                            [sw.lng(), lat],
                            [ne.lng(), lat],
                        ]);
                        const intersects = lineIntersect(turfLine, zonePolygonForTurf);
                        if (intersects.features.length >= 2) {
                            const sorted = intersects.features
                                .map((f) => f.geometry.coordinates)
                                .sort((a, b) => a[0] - b[0]);
                            const coordinates = sorted.map((coord) => ({
                                lat: coord[1],
                                lng: coord[0],
                            }));
                            if (coordinates.length < 2) return;
                            const pipeId = Date.now() + Math.random() + lat * 1000;
                            const lateralPipe = {
                                id: pipeId,
                                coordinates: coordinates,
                                type: 'lateral',
                                name: `Grid Lateral ${lateralPipes.length + 1}`,
                                color: PIPE_TYPES.lateral?.color || '#00ff00',
                                zoneId: zone.id,
                            };
                            const polyline = new google.maps.Polyline({
                                path: coordinates,
                                strokeColor: lateralPipe.color,
                                strokeWeight: 2,
                                strokeOpacity: 0.8,
                                map: map,
                                clickable: false,
                                zIndex: 1,
                            });
                            (lateralPipe as LateralPipe).polyline = polyline;
                            lateralPipes.push(lateralPipe as LateralPipe);
                        }
                    }
                }

                setPipes((prev) => [...prev, ...lateralPipes]);
                setMapObjects((prev) => ({
                    ...prev,
                    pipes: [
                        ...prev.pipes,
                        ...lateralPipes
                            .map((p: any) => p.polyline)
                            .filter(
                                (polyline): polyline is google.maps.Polyline =>
                                    polyline !== undefined
                            ),
                    ],
                }));
            } catch (error) {
                console.error('Error generating lateral pipes for zone:', error);
                handleError(
                    `Error generating pipes for ${zone.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        },
        [map, pipes, setPipes, setMapObjects, handleError]
    );

    const generateLateralPipes = useCallback(() => {
        if (zones.length === 0) {
            handleError('No zones found to generate pipes for');
            return;
        }

        setIsGeneratingPipes(true);

        try {
            zones.forEach((zone) => {
                generateLateralPipesForZone(zone);
            });
        } catch (error) {
            console.error('Error generating lateral pipes:', error);
            handleError('Error generating lateral pipes');
        } finally {
            setIsGeneratingPipes(false);
        }
    }, [zones, setIsGeneratingPipes, handleError, generateLateralPipesForZone]);

    const generateIrrigationForZone = useCallback(
        (zone: Zone, irrigationType: string) => {
            if (!zone || !zone.coordinates || !map) return;

            try {
                const zoneId = zone.id.toString();

                const existingPoints = irrigationPoints.filter(
                    (p) => p.zoneId.toString() === zoneId
                );
                const existingLines = irrigationLines.filter(
                    (l: any) => l.zoneId.toString() === zoneId
                );

                if (existingPoints.length > 0) {
                    existingPoints.forEach((point) => {
                        if (point.marker) point.marker.setMap(null);
                        if (point.circle) point.circle.setMap(null);
                    });
                    setIrrigationPoints((prev) =>
                        prev.filter((p) => p.zoneId.toString() !== zoneId)
                    );
                }

                if (existingLines.length > 0) {
                    existingLines.forEach((line: any) => {
                        if (line.polyline) line.polyline.setMap(null);
                    });
                    setIrrigationLines((prev) =>
                        prev.filter((l: any) => l.zoneId.toString() !== zoneId)
                    );
                }

                setMapObjects((prev) => ({
                    ...prev,
                    irrigation: prev.irrigation.filter(
                        (m) => !existingPoints.some((p) => p.marker === m)
                    ),
                    irrigationCircles: prev.irrigationCircles.filter(
                        (c) => !existingPoints.some((p) => p.circle === c)
                    ),
                    irrigationLines: prev.irrigationLines.filter(
                        (pl) => !existingLines.some((l: any) => l.polyline === pl)
                    ),
                }));

                const zoneLateralPipes = pipes.filter(
                    (pipe) => pipe.type === 'lateral' && pipe.zoneId.toString() === zoneId
                );

                const newIrrigationPoints: any[] = [];
                const newIrrigationCircles: google.maps.Circle[] = [];
                const newIrrigationLines: any[] = [];

                if (irrigationType === 'drip-tape') {
                    const settings = DEFAULT_IRRIGATION_SETTINGS['drip-tape'];
                    const spacingMeters = dripSpacing[zoneId] || settings.defaultSpacing;
                    let totalDripPoints = 0;

                    zoneLateralPipes.forEach((pipe) => {
                        if (pipe.coordinates && pipe.coordinates.length >= 2) {
                            const lineSymbol = {
                                path: 'M 0,-1 0,1',
                                strokeOpacity: 1,
                                scale: 4,
                            };

                            const polyline = new google.maps.Polyline({
                                path: pipe.coordinates,
                                strokeColor: '#3b82f6',
                                strokeOpacity: 0,
                                icons: [
                                    {
                                        icon: lineSymbol,
                                        offset: '0',
                                        repeat: '20px',
                                    },
                                ],
                                map: map,
                                zIndex: 3,
                            });

                            newIrrigationLines.push({
                                id: `drip-line-${pipe.id}`,
                                polyline: polyline,
                                zoneId: zone.id,
                            });

                            for (let i = 0; i < pipe.coordinates.length - 1; i++) {
                                const start = pipe.coordinates[i];
                                const end = pipe.coordinates[i + 1];
                                const segmentStart = new google.maps.LatLng(start.lat, start.lng);
                                const segmentEnd = new google.maps.LatLng(end.lat, end.lng);

                                const totalDistance =
                                    google.maps.geometry.spherical.computeDistanceBetween(
                                        segmentStart,
                                        segmentEnd
                                    );
                                if (totalDistance > 0) {
                                    const numPoints = Math.floor(totalDistance / spacingMeters) + 1;
                                    totalDripPoints += numPoints;
                                }
                            }
                        }
                    });

                    setZoneSummaries((prev) => ({
                        ...prev,
                        [zoneId]: { ...prev[zoneId], dripPointCount: totalDripPoints },
                    }));
                    console.log(
                        `Zone ${zone.name}: Total Drip Points Calculated: ${totalDripPoints}`
                    );
                } else {
                    const defaultSettings =
                        DEFAULT_IRRIGATION_SETTINGS[
                            irrigationType as keyof typeof DEFAULT_IRRIGATION_SETTINGS
                        ] || DEFAULT_IRRIGATION_SETTINGS.default;
                    if (!('defaultRadius' in defaultSettings)) {
                        handleError(
                            `Irrigation type ${irrigationType} is not configured for radius.`
                        );
                        return;
                    }

                    let radius = irrigationRadius[zoneId];
                    if (
                        !radius ||
                        radius < defaultSettings.minRadius ||
                        radius > defaultSettings.maxRadius
                    ) {
                        radius = defaultSettings.defaultRadius;
                        setIrrigationRadius((prev) => ({ ...prev, [zoneId]: radius }));
                    }

                    const overlap = sprinklerOverlap[zoneId] || false;
                    const spacingMultiplier = overlap ? 0.8 : 1.2;
                    const spacingDistance = radius * spacingMultiplier;

                    if (zoneLateralPipes.length > 0) {
                        zoneLateralPipes.forEach((pipe, pipeIndex) => {
                            if (pipe.coordinates && pipe.coordinates.length >= 2) {
                                const start = pipe.coordinates[0];
                                const end = pipe.coordinates[pipe.coordinates.length - 1];
                                const totalDistance =
                                    google.maps.geometry.spherical.computeDistanceBetween(
                                        new google.maps.LatLng(start.lat, start.lng),
                                        new google.maps.LatLng(end.lat, end.lng)
                                    );
                                const numPoints = Math.max(
                                    1,
                                    Math.floor(totalDistance / spacingDistance)
                                );

                                for (let i = 0; i <= numPoints; i++) {
                                    const ratio = numPoints > 0 ? i / numPoints : 0;
                                    const lat = start.lat + (end.lat - start.lat) * ratio;
                                    const lng = start.lng + (end.lng - start.lng) * ratio;
                                    const point = new google.maps.LatLng(lat, lng);

                                    if (
                                        google.maps.geometry.poly.containsLocation(
                                            point,
                                            zone.polygon
                                        )
                                    ) {
                                        const irrigationPoint = {
                                            id: Date.now() + Math.random() + pipeIndex * 1000 + i,
                                            lat,
                                            lng,
                                            type: irrigationType,
                                            radius,
                                            zoneId: zone.id,
                                        };
                                        const marker = new google.maps.Marker({
                                            position: point,
                                            map,
                                            title: `${irrigationType} (R:${radius}m)`,
                                            icon: {
                                                path: google.maps.SymbolPath.CIRCLE,
                                                scale: 4,
                                                fillColor: '#0099ff',
                                                fillOpacity: 1,
                                                strokeColor: 'white',
                                                strokeWeight: 1,
                                            },
                                        });
                                        const circle = new google.maps.Circle({
                                            center: point,
                                            radius,
                                            map,
                                            fillColor: '#0099ff',
                                            fillOpacity: 0.1,
                                            strokeColor: '#0099ff',
                                            strokeWeight: 1,
                                            strokeOpacity: 0.3,
                                        });
                                        (irrigationPoint as any).marker = marker;
                                        (irrigationPoint as any).circle = circle;
                                        newIrrigationPoints.push(irrigationPoint);
                                        newIrrigationCircles.push(circle);
                                    }
                                }
                            }
                        });
                    } else {
                        const bounds = new google.maps.LatLngBounds();
                        zone.coordinates.forEach((coord: Coordinate) =>
                            bounds.extend(new google.maps.LatLng(coord.lat, coord.lng))
                        );
                        const ne = bounds.getNorthEast();
                        const sw = bounds.getSouthWest();
                        const latSpacing = (radius / 111000) * spacingMultiplier;
                        const lngSpacing =
                            (radius / (111000 * Math.cos((sw.lat() * Math.PI) / 180))) *
                            spacingMultiplier;

                        for (let lat = sw.lat(); lat <= ne.lat(); lat += latSpacing) {
                            for (let lng = sw.lng(); lng <= ne.lng(); lng += lngSpacing) {
                                const point = new google.maps.LatLng(lat, lng);
                                if (
                                    google.maps.geometry.poly.containsLocation(point, zone.polygon)
                                ) {
                                    const irrigationPoint = {
                                        id: Date.now() + Math.random(),
                                        lat,
                                        lng,
                                        type: irrigationType,
                                        radius,
                                        zoneId: zone.id,
                                    };
                                    const marker = new google.maps.Marker({
                                        position: point,
                                        map,
                                        title: `${irrigationType} (R:${radius}m)`,
                                        icon: {
                                            path: google.maps.SymbolPath.CIRCLE,
                                            scale: 4,
                                            fillColor: '#0099ff',
                                            fillOpacity: 1,
                                            strokeColor: 'white',
                                            strokeWeight: 1,
                                        },
                                    });
                                    const circle = new google.maps.Circle({
                                        center: point,
                                        radius,
                                        map,
                                        fillColor: '#0099ff',
                                        fillOpacity: 0.1,
                                        strokeColor: '#0099ff',
                                        strokeWeight: 1,
                                        strokeOpacity: 0.3,
                                    });
                                    (irrigationPoint as any).marker = marker;
                                    (irrigationPoint as any).circle = circle;
                                    newIrrigationPoints.push(irrigationPoint);
                                    newIrrigationCircles.push(circle);
                                }
                            }
                        }
                    }
                }

                setIrrigationPoints((prev) => [...prev, ...newIrrigationPoints]);
                setIrrigationLines((prev) => [...prev, ...newIrrigationLines]);
                setMapObjects((prev) => ({
                    ...prev,
                    irrigation: [
                        ...prev.irrigation,
                        ...newIrrigationPoints.map((p: any) => p.marker).filter(Boolean),
                    ],
                    irrigationCircles: [...prev.irrigationCircles, ...newIrrigationCircles],
                    irrigationLines: [
                        ...prev.irrigationLines,
                        ...newIrrigationLines.map((l: any) => l.polyline).filter(Boolean),
                    ],
                }));

                setIrrigationAssignments((prev) => ({
                    ...prev,
                    [zoneId]: irrigationType,
                }));
            } catch (error) {
                console.error('Error generating irrigation for zone:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                handleError(`Error generating ${irrigationType} for ${zone.name}: ${errorMessage}`);
            }
        },
        [
            map,
            irrigationRadius,
            sprinklerOverlap,
            dripSpacing,
            irrigationPoints,
            irrigationLines,
            pipes,
            setIrrigationRadius,
            setIrrigationPoints,
            setIrrigationLines,
            setMapObjects,
            setIrrigationAssignments,
            setZoneSummaries,
            handleError,
        ]
    );

    const clearIrrigationForZone = useCallback(
        (zoneId: string) => {
            const zoneIrrigationPoints = irrigationPoints.filter(
                (point) => point.zoneId.toString() === zoneId
            );
            const zoneIrrigationLines = irrigationLines.filter(
                (line: any) => line.zoneId.toString() === zoneId
            );

            if (zoneIrrigationPoints.length === 0 && zoneIrrigationLines.length === 0) {
                handleError('No irrigation points found for this zone');
                return;
            }

            const zone = zones.find((z) => z.id.toString() === zoneId);
            const zoneName = zone?.name || `Zone ${zoneId}`;

            if (
                confirm(
                    `Remove all irrigation from ${zoneName} (${zoneIrrigationPoints.length} points)?`
                )
            ) {
                zoneIrrigationPoints.forEach((point) => {
                    if (point.marker) point.marker.setMap(null);
                    if (point.circle) point.circle.setMap(null);
                });
                zoneIrrigationLines.forEach((line: any) => {
                    if (line.polyline) line.polyline.setMap(null);
                });

                setIrrigationPoints((prev) =>
                    prev.filter((point) => point.zoneId.toString() !== zoneId)
                );
                setIrrigationLines((prev) =>
                    prev.filter((line: any) => line.zoneId.toString() !== zoneId)
                );
                setMapObjects((prev) => ({
                    ...prev,
                    irrigation: prev.irrigation.filter((marker) => {
                        return !zoneIrrigationPoints.some((point) => point.marker === marker);
                    }),
                    irrigationCircles: prev.irrigationCircles.filter((circle) => {
                        return !zoneIrrigationPoints.some((point) => point.circle === circle);
                    }),
                    irrigationLines: prev.irrigationLines.filter((polyline) => {
                        return !zoneIrrigationLines.some((line: any) => line.polyline === polyline);
                    }),
                }));

                setIrrigationAssignments((prev) => {
                    const newAssignments = { ...prev };
                    delete newAssignments[zoneId];
                    return newAssignments;
                });
                setZoneSummaries((prev) => {
                    const newSummaries = { ...prev };
                    if (newSummaries[zoneId]) {
                        delete newSummaries[zoneId].dripPointCount;
                    }
                    return newSummaries;
                });
            }
        },
        [
            irrigationPoints,
            irrigationLines,
            zones,
            setIrrigationPoints,
            setIrrigationLines,
            setMapObjects,
            setIrrigationAssignments,
            setZoneSummaries,
            handleError,
        ]
    );

    const handleRowSpacingConfirm = useCallback(
        (cropValue: string) => {
            const tempValue = tempRowSpacing[cropValue];
            if (tempValue && !isNaN(parseFloat(tempValue))) {
                setRowSpacing((prev) => ({
                    ...prev,
                    [cropValue]: parseFloat(tempValue),
                }));
                setEditingRowSpacingForCrop(null);
                setTempRowSpacing((prev) => {
                    const updated = { ...prev };
                    delete updated[cropValue];
                    return updated;
                });
            } else {
                handleError('Please enter a valid row spacing value');
            }
        },
        [tempRowSpacing, setRowSpacing, setEditingRowSpacingForCrop, setTempRowSpacing, handleError]
    );

    const handleRowSpacingCancel = useCallback(
        (cropValue: string) => {
            setEditingRowSpacingForCrop(null);
            setTempRowSpacing((prev) => {
                const updated = { ...prev };
                delete updated[cropValue];
                return updated;
            });
        },
        [setEditingRowSpacingForCrop, setTempRowSpacing]
    );

    const handlePlantSpacingConfirm = useCallback(
        (cropValue: string) => {
            const tempValue = tempPlantSpacing[cropValue];
            if (tempValue && !isNaN(parseFloat(tempValue))) {
                setPlantSpacing((prev) => ({
                    ...prev,
                    [cropValue]: parseFloat(tempValue),
                }));
                setEditingPlantSpacingForCrop(null);
                setTempPlantSpacing((prev) => {
                    const updated = { ...prev };
                    delete updated[cropValue];
                    return updated;
                });
            } else {
                handleError('Please enter a valid plant spacing value');
            }
        },
        [
            tempPlantSpacing,
            setPlantSpacing,
            setEditingPlantSpacingForCrop,
            setTempPlantSpacing,
            handleError,
        ]
    );

    const handlePlantSpacingCancel = useCallback(
        (cropValue: string) => {
            setEditingPlantSpacingForCrop(null);
            setTempPlantSpacing((prev) => {
                const updated = { ...prev };
                delete updated[cropValue];
                return updated;
            });
        },
        [setEditingPlantSpacingForCrop, setTempPlantSpacing]
    );

    const handleCaptureMapAndSummary = () => {
        if (!map) {
            handleError('Map is not ready for capture');
            return;
        }

        try {
            const completeData = {
                mainField: mainField
                    ? { coordinates: mainField.coordinates, area: mainField.area }
                    : null,
                fieldAreaSize: fieldAreaSize,
                selectedCrops: selectedCrops,
                zones: zones.map((zone) => ({
                    id: zone.id,
                    name: zone.name,
                    color: zone.color,
                    coordinates: zone.coordinates,
                })),
                zoneAssignments: zoneAssignments,
                pipes: pipes.map((pipe) => ({
                    id: pipe.id,
                    name: pipe.name,
                    type: pipe.type,
                    color: pipe.color,
                    coordinates: pipe.coordinates,
                    zoneId: pipe.zoneId,
                })),
                equipmentIcons: equipmentIcons.map((eq) => ({
                    id: eq.id,
                    type: eq.type,
                    name: eq.name,
                    lat: eq.lat,
                    lng: eq.lng,
                    config: eq.config,
                })),
                irrigationPoints: irrigationPoints.map((point) => ({
                    id: point.id,
                    lat: point.lat,
                    lng: point.lng,
                    type: point.type,
                    radius: point.radius,
                    zoneId: point.zoneId,
                })),
                irrigationLines: irrigationLines.map((line: any) => ({
                    id: line.id,
                    zoneId: line.zoneId,
                    coordinates: line.polyline
                        .getPath()
                        .getArray()
                        .map((p: any) => ({ lat: p.lat(), lng: p.lng() })),
                })),
                irrigationAssignments: irrigationAssignments,
                irrigationSettings: irrigationSettings,
                rowSpacing: rowSpacing,
                plantSpacing: plantSpacing,
                mapCenter: mapCenter,
                mapZoom: mapZoom,
                mapType: mapType,
                dripSpacing: dripSpacing,
                zoneSummaries: zoneSummaries,
            };

            try {
                const dataToSave = JSON.stringify(completeData);
                localStorage.setItem('fieldMapData', dataToSave);
            } catch (localStorageError) {
                console.warn('Failed to save to localStorage:', localStorageError);
            }

            router.visit('/field-crop-summary', {
                method: 'post',
                data: completeData,
            });
        } catch (error: any) {
            console.error('Error capturing map and summary:', error);
            handleError(
                'Failed to capture map summary: ' +
                    (error instanceof Error ? error.message : String(error))
            );
        }
    };

    useEffect(() => {
        if (isEditMode && map && !isRestoring && !hasRestoredOnce && !isResetting) {
            const savedData = localStorage.getItem('fieldMapData');
            if (savedData) {
                setIsRestoring(true);

                setTimeout(() => {
                    try {
                        const parsedData = JSON.parse(savedData);
                        console.log('🗺️ Restoring map objects for editing...');
                        clearAllMapObjects();

                        if (parsedData.mainField && parsedData.mainField.coordinates) {
                            const fieldPolygon = new google.maps.Polygon({
                                paths: parsedData.mainField.coordinates,
                                fillColor: '#22C55E',
                                fillOpacity: 0.2,
                                strokeColor: '#22C55E',
                                strokeWeight: 3,
                                clickable: false,
                                editable: false,
                                zIndex: 1,
                                map: map,
                            });
                            setMainField({
                                polygon: fieldPolygon,
                                coordinates: parsedData.mainField.coordinates,
                                area: parsedData.mainField.area || parsedData.fieldAreaSize,
                            });
                        }

                        if (parsedData.zones && Array.isArray(parsedData.zones)) {
                            const restoredZones: Zone[] = [];
                            const zonePolygons: google.maps.Polygon[] = [];
                            const usedColorsArray: string[] = [];

                            parsedData.zones.forEach((zoneData: any) => {
                                if (zoneData.coordinates && Array.isArray(zoneData.coordinates)) {
                                    const zonePolygon = new google.maps.Polygon({
                                        paths: zoneData.coordinates,
                                        fillColor: zoneData.color,
                                        fillOpacity: 0.3,
                                        strokeColor: zoneData.color,
                                        strokeWeight: 2,
                                        clickable: true,
                                        editable: false,
                                        zIndex: 1,
                                        map: map,
                                    });
                                    zonePolygon.addListener(
                                        'click',
                                        (e: google.maps.MapMouseEvent) => {
                                            if (
                                                isPlacingEquipment &&
                                                selectedEquipmentType &&
                                                e.latLng
                                            ) {
                                                const lat = e.latLng.lat();
                                                const lng = e.latLng.lng();
                                                placeEquipmentAtPosition(lat, lng);
                                            } else if (currentStep === 2) {
                                                const zone = restoredZones.find(
                                                    (z) => z.polygon === zonePolygon
                                                );
                                                if (zone) {
                                                    setSelectedZone(zone);
                                                    setShowPlantSelector(true);
                                                }
                                            }
                                        }
                                    );
                                    const restoredZone: Zone = {
                                        id: zoneData.id,
                                        polygon: zonePolygon,
                                        coordinates: zoneData.coordinates,
                                        color: zoneData.color,
                                        name: zoneData.name,
                                    };
                                    restoredZones.push(restoredZone);
                                    zonePolygons.push(zonePolygon);
                                    usedColorsArray.push(zoneData.color);
                                }
                            });
                            setZones(restoredZones);
                            setUsedColors(usedColorsArray);
                            const availableColors = ZONE_COLORS.filter(
                                (color) => !usedColorsArray.includes(color)
                            );
                            if (availableColors.length > 0) {
                                setCurrentZoneColor(availableColors[0]);
                                setCanDrawZone(true);
                            } else {
                                setCanDrawZone(false);
                            }
                            setMapObjects((prev) => ({ ...prev, zones: zonePolygons }));

                            if (parsedData.zoneAssignments) {
                                restoreZoneLabels(parsedData.zoneAssignments, restoredZones);
                            }
                        }

                        if (parsedData.pipes && Array.isArray(parsedData.pipes)) {
                            const restoredPipes: any[] = [];
                            const pipePolylines: google.maps.Polyline[] = [];
                            parsedData.pipes.forEach((pipeData: any) => {
                                if (pipeData.coordinates && Array.isArray(pipeData.coordinates)) {
                                    const pipePolyline = new google.maps.Polyline({
                                        path: pipeData.coordinates,
                                        strokeColor: pipeData.color,
                                        strokeWeight:
                                            pipeData.type === 'main'
                                                ? 6
                                                : pipeData.type === 'submain'
                                                  ? 4
                                                  : 2,
                                        strokeOpacity: 0.9,
                                        clickable: false,
                                        editable: false,
                                        zIndex: 2,
                                        map: map,
                                    });
                                    const restoredPipe = {
                                        id: pipeData.id,
                                        polyline: pipePolyline,
                                        coordinates: pipeData.coordinates,
                                        type: pipeData.type,
                                        name: pipeData.name,
                                        color: pipeData.color,
                                        zoneId: pipeData.zoneId,
                                    };
                                    restoredPipes.push(restoredPipe);
                                    pipePolylines.push(pipePolyline);
                                }
                            });
                            setPipes(restoredPipes);
                            setMapObjects((prev) => ({ ...prev, pipes: pipePolylines }));
                        }

                        if (parsedData.equipmentIcons && Array.isArray(parsedData.equipmentIcons)) {
                            const restoredEquipment: Equipment[] = [];
                            const equipmentMarkers: google.maps.Marker[] = [];
                            parsedData.equipmentIcons.forEach((equipmentData: any) => {
                                if (equipmentData.lat && equipmentData.lng && equipmentData.type) {
                                    const equipmentConfig =
                                        EQUIPMENT_TYPES[equipmentData.type as EquipmentType];
                                    if (equipmentConfig) {
                                        const markerIcon = createEquipmentMarkerIcon(
                                            equipmentData.type as EquipmentType,
                                            equipmentConfig
                                        );

                                        const marker = new google.maps.Marker({
                                            position: {
                                                lat: equipmentData.lat,
                                                lng: equipmentData.lng,
                                            },
                                            map: map,
                                            title: equipmentData.name,
                                            icon: markerIcon,
                                            clickable: true,
                                            optimized: false,
                                            zIndex: 1000,
                                        });
                                        const infoWindow = new google.maps.InfoWindow({
                                            content: `<div style="text-align: center; min-width: 150px;">
                                                <h3 style="margin: 0 0 8px 0; color: #333;">${equipmentConfig.name}</h3>
                                                <p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">${equipmentConfig.description || 'Equipment'}</p>
                                                <button onclick="window.removeEquipment('${equipmentData.id}')" 
                                                        style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                                    Remove Equipment
                                                </button>
                                            </div>`,
                                        });
                                        marker.addListener('click', () => {
                                            equipmentMarkers.forEach((otherMarker) => {
                                                if ((otherMarker as any).infoWindow) {
                                                    (otherMarker as any).infoWindow.close();
                                                }
                                            });
                                            infoWindow.open(map, marker);
                                        });
                                        (marker as any).infoWindow = infoWindow;
                                        restoredEquipment.push({
                                            id: equipmentData.id,
                                            type: equipmentData.type,
                                            lat: equipmentData.lat,
                                            lng: equipmentData.lng,
                                            name: equipmentData.name,
                                            config: equipmentData.config,
                                            marker: marker,
                                        });
                                        equipmentMarkers.push(marker);
                                    }
                                }
                            });
                            setEquipmentIcons(restoredEquipment);
                            setEquipmentHistory([restoredEquipment]);
                            setEquipmentHistoryIndex(0);
                            setMapObjects((prev) => ({ ...prev, equipment: equipmentMarkers }));
                        }

                        if (
                            parsedData.irrigationPoints &&
                            Array.isArray(parsedData.irrigationPoints)
                        ) {
                            const restoredIrrigationPoints: IrrigationPoint[] = [];
                            const irrigationMarkers: google.maps.Marker[] = [];
                            const irrigationCircles: google.maps.Circle[] = [];

                            parsedData.irrigationPoints
                                .filter((pointData: any) => pointData.type !== 'drip-tape')
                                .forEach((pointData: any) => {
                                    if (pointData.lat && pointData.lng) {
                                        const marker = new google.maps.Marker({
                                            position: { lat: pointData.lat, lng: pointData.lng },
                                            map: map,
                                            title: `${pointData.type} - Zone ${pointData.zoneId}`,
                                            icon: {
                                                path: google.maps.SymbolPath.CIRCLE,
                                                scale: 4,
                                                fillColor: '#0099ff',
                                                fillOpacity: 1,
                                                strokeColor: 'white',
                                                strokeWeight: 1,
                                            },
                                        });

                                        let circle: google.maps.Circle | undefined = undefined;
                                        if (pointData.radius > 0) {
                                            circle = new google.maps.Circle({
                                                center: { lat: pointData.lat, lng: pointData.lng },
                                                radius: pointData.radius,
                                                map: map,
                                                fillColor: '#0099ff',
                                                fillOpacity: 0.1,
                                                strokeColor: '#0099ff',
                                                strokeWeight: 1,
                                                strokeOpacity: 0.3,
                                            });
                                            irrigationCircles.push(circle);
                                        }

                                        restoredIrrigationPoints.push({
                                            id: pointData.id,
                                            lat: pointData.lat,
                                            lng: pointData.lng,
                                            type: pointData.type,
                                            radius: pointData.radius,
                                            zoneId: pointData.zoneId,
                                            marker: marker,
                                            circle: circle,
                                        });
                                        irrigationMarkers.push(marker);
                                    }
                                });
                            setIrrigationPoints(restoredIrrigationPoints);
                            setMapObjects((prev) => ({
                                ...prev,
                                irrigation: irrigationMarkers,
                                irrigationCircles: irrigationCircles,
                            }));
                        }

                        if (
                            parsedData.irrigationLines &&
                            Array.isArray(parsedData.irrigationLines)
                        ) {
                            const restoredIrrigationLines: any[] = [];
                            const irrigationPolylines: google.maps.Polyline[] = [];
                            const lineSymbol = { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4 };

                            parsedData.irrigationLines.forEach((lineData: any) => {
                                if (lineData.coordinates) {
                                    const polyline = new google.maps.Polyline({
                                        path: lineData.coordinates,
                                        strokeColor: '#3b82f6',
                                        strokeOpacity: 0,
                                        icons: [{ icon: lineSymbol, offset: '0', repeat: '20px' }],
                                        map: map,
                                        zIndex: 3,
                                    });
                                    restoredIrrigationLines.push({
                                        id: lineData.id,
                                        polyline: polyline,
                                        zoneId: lineData.zoneId,
                                    });
                                    irrigationPolylines.push(polyline);
                                }
                            });
                            setIrrigationLines(restoredIrrigationLines);
                            setMapObjects((prev) => ({
                                ...prev,
                                irrigationLines: irrigationPolylines,
                            }));
                        }

                        setHasRestoredOnce(true);
                        console.log('✅ Successfully restored all map objects for editing');
                    } catch (error) {
                        console.error('Error restoring map objects:', error);
                        handleError('Failed to restore map data');
                    } finally {
                        setIsRestoring(false);
                    }
                }, 500);
            }
        }
    }, [
        isEditMode,
        map,
        isRestoring,
        hasRestoredOnce,
        isResetting,
        clearAllMapObjects,
        placeEquipmentAtPosition,
        currentStep,
        isPlacingEquipment,
        selectedEquipmentType,
        setSelectedZone,
        setShowPlantSelector,
        handleError,
        setCanDrawZone,
        setCurrentZoneColor,
        setEquipmentHistory,
        setEquipmentHistoryIndex,
        setEquipmentIcons,
        setFieldAreaSize,
        setMainField,
        setMapObjects,
        setObstacles,
        setPipes,
        setUsedColors,
        setZones,
        createEquipmentMarkerIcon,
        restoreZoneLabels,
    ]);

    useEffect(() => {
        if (isEditMode || isRestoring || hasRestoredOnce || isResetting) {
            return;
        }

        if (map && zones.length > 0 && Object.keys(zoneAssignments).length > 0) {
            clearAllZoneLabels();

            const timeoutId = setTimeout(() => {
                Object.entries(zoneAssignments).forEach(([zoneId, cropValue]) => {
                    if (cropValue) {
                        updateZoneLabel(zoneId, cropValue as string);
                    }
                });
            }, 150);

            return () => clearTimeout(timeoutId);
        }
    }, [
        map,
        zones.length,
        Object.keys(zoneAssignments).length,
        isEditMode,
        isRestoring,
        hasRestoredOnce,
        isResetting,
    ]);

    useEffect(() => {
        if (isEditMode || isRestoring || isResetting) {
            return;
        }

        if (currentStep === 2 && zones.length === 0) {
            setCanDrawZone(true);
            setUsedColors([]);
            setCurrentZoneColor(ZONE_COLORS[0]);
            setDrawingMode('zone');
        } else if (currentStep === 3 && pipes.length === 0) {
            setCanDrawPipe(true);
            setCurrentPipeType('main');
        }
    }, [
        currentStep,
        zones.length,
        pipes.length,
        isEditMode,
        isRestoring,
        isResetting,
        setCanDrawZone,
        setUsedColors,
        setCurrentZoneColor,
        setDrawingMode,
        setCanDrawPipe,
        setCurrentPipeType,
    ]);

    useEffect(() => {
        if (!isEditMode && !isResetting) {
            setHasRestoredOnce(false);
            setIsRestoring(false);
        }
    }, [isEditMode, isResetting]);

    useEffect(() => {
        return () => {
            if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
            }
        };
    }, [blurTimeoutRef]);

    const clearLateralPipes = useCallback(() => {
        const lateralPipes = pipes.filter((pipe) => pipe.type === 'lateral');

        if (lateralPipes.length === 0) {
            handleError('No lateral pipes to clear');
            return;
        }

        if (confirm(`Remove all ${lateralPipes.length} lateral pipes?`)) {
            lateralPipes.forEach((pipe) => {
                if ('polyline' in pipe && pipe.polyline) {
                    pipe.polyline.setMap(null);
                }
            });

            setPipes((prev) => prev.filter((pipe) => pipe.type !== 'lateral'));
            setMapObjects((prev) => ({
                ...prev,
                pipes: prev.pipes.filter((polyline) => {
                    return !lateralPipes.some(
                        (pipe) => 'polyline' in pipe && pipe.polyline === polyline
                    );
                }),
            }));
        }
    }, [pipes, setPipes, setMapObjects, handleError]);

    return (
        <ErrorBoundary>
            <div
                className="flex h-screen flex-col overflow-hidden text-white"
                style={{ backgroundColor: '#000005' }}
            >
                <Head title="Field Map - Irrigation Planning" />

                <Navbar />

                {error && (
                    <div className="fixed right-4 top-20 z-[9999] max-w-md">
                        <ErrorMessage
                            title="Error"
                            message={error}
                            type="error"
                            onDismiss={clearError}
                        />
                    </div>
                )}

                {isLoading && (
                    <LoadingSpinner size="lg" color="blue" text="Processing..." fullScreen={true} />
                )}

                <div className="flex flex-1 overflow-hidden">
                    <div
                        className="w-96 border-r border-white"
                        style={{ backgroundColor: '#000005' }}
                    >
                        <div className="flex h-full flex-col">
                            <div
                                className="border-b border-white p-3"
                                style={{ backgroundColor: '#000005' }}
                            >
                                <div className="mb-2">
                                    <Link
                                        href="/field-crop"
                                        className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300"
                                    >
                                        <svg
                                            className="mr-1 h-4 w-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                            />
                                        </svg>
                                        Back to Crop Selection
                                    </Link>
                                </div>
                                <h3 className="text-lg font-semibold text-white">
                                    🛠️ Tools & Settings
                                </h3>
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto p-3">
                                <div
                                    className="rounded-lg border border-white p-3"
                                    style={{ backgroundColor: '#000005' }}
                                >
                                    <div className="mb-2 text-xs font-semibold text-white">
                                        Planning Steps
                                    </div>
                                    <div className="grid grid-cols-4 gap-1">
                                        {[
                                            {
                                                step: 1,
                                                title: 'Field',
                                                icon: '1️⃣',
                                                color: 'green',
                                            },
                                            {
                                                step: 2,
                                                title: 'Zones',
                                                icon: '2️⃣',
                                                color: 'blue',
                                            },
                                            {
                                                step: 3,
                                                title: 'Pipes',
                                                icon: '3️⃣',
                                                color: 'purple',
                                            },
                                            {
                                                step: 4,
                                                title: 'Irrigation',
                                                icon: '4️⃣',
                                                color: 'cyan',
                                            },
                                        ].map((stepInfo) => (
                                            <button
                                                key={stepInfo.step}
                                                onClick={() => goToStep(stepInfo.step)}
                                                className={`flex flex-col items-center rounded-lg border border-white p-1.5 transition-all ${
                                                    currentStep === stepInfo.step
                                                        ? `bg-${stepInfo.color}-600 text-white`
                                                        : stepCompleted[stepInfo.step]
                                                          ? `bg-${stepInfo.color}-500/20 text-${stepInfo.color}-300 hover:bg-${stepInfo.color}-500/30`
                                                          : 'text-gray-400 hover:bg-gray-800'
                                                }`}
                                                style={{
                                                    backgroundColor:
                                                        currentStep === stepInfo.step
                                                            ? undefined
                                                            : '#000005',
                                                }}
                                            >
                                                <span className="mb-0.5 text-xs">
                                                    {stepCompleted[stepInfo.step]
                                                        ? '✅'
                                                        : stepInfo.icon}
                                                </span>
                                                <div className="text-center">
                                                    <div className="text-xs font-medium">
                                                        {stepInfo.title}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {currentStep !== 4 && (
                                    <div
                                        className="rounded border border-white p-2"
                                        style={{ backgroundColor: '#000005' }}
                                    >
                                        <FieldMapSmartControls
                                            snapEnabled={snapEnabled}
                                            setSnapEnabled={setSnapEnabled}
                                            gridEnabled={gridEnabled}
                                            setGridEnabled={setGridEnabled}
                                            pipeSnapEnabled={pipeSnapEnabled}
                                            setPipeSnapEnabled={setPipeSnapEnabled}
                                            drawingStage={drawingStage}
                                        />
                                    </div>
                                )}

                                <div
                                    className="rounded border border-white p-2"
                                    style={{ backgroundColor: '#000005' }}
                                >
                                    <FieldMapToolsPanel
                                        currentStep={currentStep}
                                        setCurrentStep={goToStep}
                                        validateStep={validateStep}
                                        nextStep={nextStep}
                                        previousStep={previousStep}
                                        resetAll={resetAll}
                                        mainField={mainField}
                                        fieldAreaSize={fieldAreaSize}
                                        selectedCrops={selectedCrops}
                                        zones={zones}
                                        pipes={pipes}
                                        obstacles={obstacles}
                                        snapEnabled={snapEnabled}
                                        setSnapEnabled={setSnapEnabled}
                                        gridEnabled={gridEnabled}
                                        setGridEnabled={setGridEnabled}
                                        pipeSnapEnabled={pipeSnapEnabled}
                                        setPipeSnapEnabled={setPipeSnapEnabled}
                                        mapType={mapType}
                                        setMapType={setMapType}
                                        drawingStage={drawingStage}
                                        setDrawingStage={setDrawingStage}
                                        drawingMode={drawingMode}
                                        setDrawingMode={setDrawingMode}
                                        currentZoneColor={currentZoneColor}
                                        setCurrentZoneColor={setCurrentZoneColor}
                                        currentObstacleType={currentObstacleType}
                                        setCurrentObstacleType={setCurrentObstacleType}
                                        currentPipeType={currentPipeType}
                                        setCurrentPipeType={setCurrentPipeType}
                                        isPlacingEquipment={isPlacingEquipment}
                                        selectedEquipmentType={selectedEquipmentType}
                                        startPlacingEquipment={startPlacingEquipment}
                                        cancelPlacingEquipment={cancelPlacingEquipment}
                                        clearAllEquipment={clearAllEquipment}
                                        undoEquipment={undoEquipment}
                                        redoEquipment={redoEquipment}
                                        equipmentIcons={equipmentIcons}
                                        equipmentHistory={equipmentHistory}
                                        equipmentHistoryIndex={equipmentHistoryIndex}
                                        usedColors={usedColors}
                                        addNewZone={addNewZone}
                                        zoneAssignments={zoneAssignments}
                                        assignPlantToZone={assignPlantToZone}
                                        removePlantFromZone={removePlantFromZone}
                                        deleteZone={deleteZone}
                                        generateLateralPipes={generateLateralPipes}
                                        clearLateralPipes={clearLateralPipes}
                                        isGeneratingPipes={isGeneratingPipes}
                                        generateLateralPipesForZone={generateLateralPipesForZone}
                                        irrigationAssignments={irrigationAssignments}
                                        setIrrigationAssignments={setIrrigationAssignments}
                                        irrigationPoints={irrigationPoints}
                                        irrigationLines={irrigationLines}
                                        irrigationRadius={irrigationRadius}
                                        setIrrigationRadius={setIrrigationRadius}
                                        sprinklerOverlap={sprinklerOverlap}
                                        setSprinklerOverlap={setSprinklerOverlap}
                                        generateIrrigationForZone={generateIrrigationForZone}
                                        clearIrrigationForZone={clearIrrigationForZone}
                                        zoneSummaries={zoneSummaries}
                                        plantingPoints={plantingPoints}
                                        selectedCropObjects={selectedCropObjects}
                                        rowSpacing={rowSpacing}
                                        tempRowSpacing={tempRowSpacing}
                                        setTempRowSpacing={setTempRowSpacing}
                                        editingRowSpacingForCrop={editingRowSpacingForCrop}
                                        setEditingRowSpacingForCrop={setEditingRowSpacingForCrop}
                                        handleRowSpacingConfirm={handleRowSpacingConfirm}
                                        handleRowSpacingCancel={handleRowSpacingCancel}
                                        plantSpacing={plantSpacing}
                                        tempPlantSpacing={tempPlantSpacing}
                                        setTempPlantSpacing={setTempPlantSpacing}
                                        editingPlantSpacingForCrop={editingPlantSpacingForCrop}
                                        setEditingPlantSpacingForCrop={
                                            setEditingPlantSpacingForCrop
                                        }
                                        handlePlantSpacingConfirm={handlePlantSpacingConfirm}
                                        handlePlantSpacingCancel={handlePlantSpacingCancel}
                                        handleCaptureMapAndSummary={handleCaptureMapAndSummary}
                                        irrigationSettings={irrigationSettings}
                                        setIrrigationSettings={setIrrigationSettings}
                                        dripSpacing={dripSpacing}
                                        setDripSpacing={setDripSpacing}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col">
                        <div
                            className="border-b border-white p-3"
                            style={{ backgroundColor: '#000005' }}
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">
                                    📍 Interactive Map
                                </h3>

                                <div className="flex space-x-2">
                                    {[
                                        { id: 'street', name: '🗺️' },
                                        { id: 'satellite', name: '🛰️' },
                                        { id: 'hybrid', name: '🔄' },
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() =>
                                                setMapType(
                                                    type.id as 'street' | 'satellite' | 'hybrid'
                                                )
                                            }
                                            className={`rounded border border-white px-2 py-1 text-xs transition-colors ${
                                                mapType === type.id
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-white hover:bg-gray-800'
                                            }`}
                                            style={{
                                                backgroundColor:
                                                    mapType === type.id ? undefined : '#000005',
                                            }}
                                        >
                                            {type.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="relative flex-1">
                            <Wrapper
                                apiKey={getGoogleMapsConfig().apiKey}
                                render={(status: Status) => {
                                    if (status === Status.LOADING) {
                                        return (
                                            <div className="flex h-full items-center justify-center">
                                                <LoadingSpinner
                                                    size="lg"
                                                    color="blue"
                                                    text="Loading Map..."
                                                />
                                            </div>
                                        );
                                    }
                                    if (status === Status.FAILURE) {
                                        return (
                                            <div className="flex h-full items-center justify-center">
                                                <div className="text-center text-red-400">
                                                    <p>Error loading Google Maps</p>
                                                    <p className="text-sm">
                                                        Please check your API key
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return <div style={{ width: '100%', height: '100%' }} />;
                                }}
                                libraries={['drawing', 'geometry', 'places']}
                            >
                                <GoogleMapComponent
                                    center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                                    zoom={mapZoom}
                                    onLoad={setMap}
                                    onDrawCreated={handleDrawCreated}
                                    drawingStage={drawingStage}
                                    currentZoneColor={currentZoneColor}
                                    drawingMode={drawingMode}
                                    canDrawZone={canDrawZone}
                                    canDrawPipe={canDrawPipe}
                                    currentObstacleType={currentObstacleType}
                                    currentPipeType={currentPipeType}
                                    isPlacingEquipment={isPlacingEquipment}
                                    selectedEquipmentType={selectedEquipmentType}
                                    onMapClick={handleMapClick}
                                    mapType={mapType}
                                    onCenterChanged={handleCenterChanged}
                                    onZoomChanged={handleZoomChanged}
                                />
                            </Wrapper>

                            <div className="absolute right-2 top-2 z-10 w-80">
                                <div className="relative">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="🔍 Search places..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => {
                                                if (searchResults.length > 0) {
                                                    setShowDropdown(true);
                                                }
                                            }}
                                            onBlur={() => {
                                                blurTimeoutRef.current = setTimeout(() => {
                                                    setShowDropdown(false);
                                                }, 150);
                                            }}
                                            className="w-full rounded-md border border-white bg-white px-3 py-2 pr-10 text-sm text-gray-900 shadow-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={clearSearch}
                                                className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <svg
                                                    className="h-4 w-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                            </button>
                                        )}
                                        {isSearching && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                                            </div>
                                        )}
                                    </div>

                                    {showDropdown && searchResults.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                            {searchResults.map((result, index) => (
                                                <button
                                                    key={index}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        goToLocation(result);
                                                    }}
                                                    className="w-full border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-900 last:border-b-0 hover:bg-blue-50"
                                                >
                                                    <div className="flex items-start space-x-2">
                                                        <div className="mt-0.5 text-blue-500">
                                                            <svg
                                                                className="h-3 w-3"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                                                />
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                                                />
                                                            </svg>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate text-xs font-medium text-gray-900">
                                                                {result.label}
                                                            </div>
                                                            {result.address &&
                                                                result.address !== result.label && (
                                                                    <div className="mt-0.5 truncate text-xs text-gray-500">
                                                                        {result.address}
                                                                    </div>
                                                                )}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {showDropdown &&
                                        searchResults.length === 0 &&
                                        !isSearching &&
                                        searchQuery.trim() && (
                                            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-gray-200 bg-white p-3 text-center text-xs text-gray-500 shadow-lg">
                                                No places found for "{searchQuery}"
                                            </div>
                                        )}
                                </div>
                            </div>

                            {isPlacingEquipment && selectedEquipmentType && (
                                <div
                                    className="pointer-events-none absolute left-1/2 top-4 z-[1000] -translate-x-1/2 transform rounded-lg border border-white px-4 py-2 text-sm text-white"
                                    style={{ backgroundColor: '#000005' }}
                                >
                                    <div className="flex items-center space-x-2">
                                        <span className="text-lg">
                                            {EQUIPMENT_TYPES[selectedEquipmentType].icon}
                                        </span>
                                        <span>
                                            Click map to place{' '}
                                            {EQUIPMENT_TYPES[selectedEquipmentType].name}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="absolute bottom-3 left-20 z-10 flex space-x-2">
                                <Tooltip content="Center map view">
                                    <button
                                        onClick={() => {
                                            setMapCenter([14.5995, 120.9842]);
                                            setMapZoom(13);
                                        }}
                                        className="flex h-12 w-12 items-center justify-center rounded border border-white text-gray-700 shadow-md transition-colors hover:bg-gray-50"
                                        style={{ backgroundColor: '#ffffff' }}
                                    >
                                        📍
                                    </button>
                                </Tooltip>
                                <Tooltip content="Get your current location">
                                    <button
                                        onClick={getCurrentLocation}
                                        className="flex h-12 w-12 items-center justify-center rounded border border-white text-gray-700 shadow-md transition-colors hover:bg-gray-50"
                                        style={{ backgroundColor: '#ffffff' }}
                                    >
                                        🎯
                                    </button>
                                </Tooltip>

                                {currentStep === 3 && (
                                    <>
                                        <Tooltip content="Place Water Pump">
                                            <button
                                                onClick={() => startPlacingEquipment('pump')}
                                                className={`flex h-12 w-12 items-center justify-center rounded border border-white text-gray-700 shadow-md transition-colors hover:bg-gray-50 ${
                                                    isPlacingEquipment &&
                                                    selectedEquipmentType === 'pump'
                                                        ? 'ring-2 ring-blue-500'
                                                        : ''
                                                }`}
                                                style={{ backgroundColor: '#ffffff' }}
                                            >
                                                <img
                                                    src="./generateTree/wtpump.png"
                                                    alt="Pump"
                                                    className="h-8 w-8 object-contain"
                                                />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="Place Solenoid Valve">
                                            <button
                                                onClick={() => startPlacingEquipment('solenoid')}
                                                className={`flex h-12 w-12 items-center justify-center rounded border border-white text-gray-700 shadow-md transition-colors hover:bg-gray-50 ${
                                                    isPlacingEquipment &&
                                                    selectedEquipmentType === 'solenoid'
                                                        ? 'ring-2 ring-blue-500'
                                                        : ''
                                                }`}
                                                style={{ backgroundColor: '#ffffff' }}
                                            >
                                                <img
                                                    src="./generateTree/solv.png"
                                                    alt="Solenoid Valve"
                                                    className="h-8 w-8 object-contain"
                                                />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="Place Ball Valve">
                                            <button
                                                onClick={() => startPlacingEquipment('ballvalve')}
                                                className={`flex h-12 w-12 items-center justify-center rounded border border-white text-gray-700 shadow-md transition-colors hover:bg-gray-50 ${
                                                    isPlacingEquipment &&
                                                    selectedEquipmentType === 'ballvalve'
                                                        ? 'ring-2 ring-blue-500'
                                                        : ''
                                                }`}
                                                style={{ backgroundColor: '#ffffff' }}
                                            >
                                                <img
                                                    src="./generateTree/ballv.png"
                                                    alt="Ball Valve"
                                                    className="h-8 w-8 object-contain"
                                                />
                                            </button>
                                        </Tooltip>

                                        {isPlacingEquipment && (
                                            <Tooltip content="Cancel Equipment Placement">
                                                <button
                                                    onClick={cancelPlacingEquipment}
                                                    className="flex h-12 w-12 items-center justify-center rounded border border-white bg-red-500 text-white shadow-md transition-colors hover:bg-red-600"
                                                >
                                                    ❌
                                                </button>
                                            </Tooltip>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {showPlantSelector && selectedZone && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
                        <div
                            className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-white p-6"
                            style={{ backgroundColor: '#000005' }}
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-white">
                                    🌱 Assign Plant to{' '}
                                    {typeof selectedZone === 'object' && selectedZone.name}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowPlantSelector(false);
                                        setSelectedZone(null);
                                    }}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <svg
                                        className="h-6 w-6"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>

                            <div className="mb-4">
                                <div className="mb-2 flex items-center">
                                    <span
                                        className="mr-2 h-4 w-4 rounded-full border-2 border-white/20"
                                        style={{
                                            backgroundColor:
                                                typeof selectedZone === 'object'
                                                    ? selectedZone.color
                                                    : '',
                                        }}
                                    ></span>
                                    <span className="text-gray-300">Zone Color</span>
                                </div>
                                <p className="text-sm text-gray-400">
                                    Select a plant from your chosen crops to assign to this zone.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {selectedCropObjects.map(
                                    (crop) =>
                                        crop && (
                                            <button
                                                key={crop.value}
                                                onClick={() =>
                                                    assignPlantToZone(
                                                        (selectedZone as Zone).id.toString(),
                                                        crop.value
                                                    )
                                                }
                                                className={`rounded-lg border-2 border-white p-4 text-left transition-all ${
                                                    zoneAssignments[(selectedZone as Zone).id] ===
                                                    crop.value
                                                        ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                                                        : 'text-white hover:border-blue-400 hover:bg-blue-500/10'
                                                }`}
                                                style={{
                                                    backgroundColor:
                                                        zoneAssignments[
                                                            (selectedZone as Zone).id
                                                        ] === crop.value
                                                            ? undefined
                                                            : '#000005',
                                                }}
                                            >
                                                <div className="flex items-center">
                                                    <span className="mr-3 text-3xl">
                                                        {crop.icon}
                                                    </span>
                                                    <div>
                                                        <h4 className="font-semibold">
                                                            {crop.name}
                                                        </h4>
                                                        <p className="text-sm opacity-80">
                                                            {crop.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                )}
                            </div>

                            {selectedCropObjects.length === 0 && (
                                <div className="py-8 text-center text-gray-400">
                                    <p>
                                        No crops selected. Please go back to the crop selection page
                                        to choose crops.
                                    </p>
                                </div>
                            )}

                            <div className="mt-6 flex justify-end space-x-3">
                                {zoneAssignments[(selectedZone as Zone).id] && (
                                    <button
                                        onClick={() => {
                                            removePlantFromZone(
                                                (selectedZone as Zone).id.toString()
                                            );
                                            setShowPlantSelector(false);
                                            setSelectedZone(null);
                                        }}
                                        className="rounded-lg border border-white bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                                    >
                                        Remove Plant
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowPlantSelector(false);
                                        setSelectedZone(null);
                                    }}
                                    className="rounded-lg border border-white px-4 py-2 text-white transition-colors hover:bg-gray-700"
                                    style={{ backgroundColor: '#000005' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
}
