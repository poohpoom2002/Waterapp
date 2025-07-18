import { useState, useEffect, useCallback, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import * as turf from '@turf/turf';
import { getCropByValue } from '@/pages/utils/cropData';
import {
    ZONE_COLORS,
    OBSTACLE_TYPES,
    PIPE_TYPES,
    EQUIPMENT_TYPES,
    type PipeType,
    type EquipmentType,
    type ObstacleType,
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
import LocationSearchOverlay from '@/pages/components/Fieldcrop/LocationSearchOverlay';
import FieldMapToolsPanel from '@/pages/components/Fieldcrop/FieldMapToolsPanel';
import FieldMapSmartControls from '@/pages/components/Fieldcrop/FieldMapSmartControls';
import ErrorBoundary from '@/pages/components/ErrorBoundary';
import ErrorMessage from '@/pages/components/ErrorMessage';
import LoadingSpinner from '@/pages/components/LoadingSpinner';

const getGoogleMapsConfig = () => ({
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['drawing', 'geometry', 'places'] as const,
    defaultZoom: 15,
});

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
    onEquipmentPlace?: (equipmentType: EquipmentType, position: { lat: number; lng: number }) => void;
    onZoneClick?: (zone: any) => void;
    mapType: string;
    // Add sync props
    setDrawingMode?: (mode: 'zone' | 'obstacle') => void;
    setCurrentZoneColor?: (color: string) => void;
    setCurrentObstacleType?: (type: ObstacleType) => void;
    setCurrentPipeType?: (type: PipeType) => void;
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
    zones,
    pipes,
    obstacles,
    equipmentIcons,
    mainField,
    onMapClick,
    onEquipmentPlace,
    onZoneClick,
    mapType
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map>();
    const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager>();
    const [currentDrawingMode, setCurrentDrawingMode] = useState<google.maps.drawing.OverlayType | null>(null);

    useEffect(() => {
        if (ref.current && !map) {
            const newMap = new google.maps.Map(ref.current, {
                center,
                zoom,
                mapTypeId: mapType as google.maps.MapTypeId,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: false,
            });

            // Initialize Drawing Manager
            const drawingMgr = new google.maps.drawing.DrawingManager({
                drawingMode: null,
                drawingControl: false, // We'll handle this manually
                polygonOptions: {
                    fillColor: currentZoneColor,
                    fillOpacity: 0.3,
                    strokeColor: currentZoneColor,
                    strokeWeight: 2,
                    clickable: true,
                    editable: true,
                    zIndex: 1
                },
                polylineOptions: {
                    strokeColor: PIPE_TYPES[currentPipeType as keyof typeof PIPE_TYPES]?.color || '#3388ff',
                    strokeWeight: 4,
                    clickable: true,
                    editable: true,
                    zIndex: 1
                }
            });

            drawingMgr.setMap(newMap);

            // Add drawing event listeners
            google.maps.event.addListener(drawingMgr, 'overlaycomplete', (event: any) => {
                const overlay = event.overlay;
                const type = event.type;
                
                // Stop drawing after completion
                drawingMgr.setDrawingMode(null);
                setCurrentDrawingMode(null);
                
                onDrawCreated(overlay, type);
            });

            // Add map click listener
            newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
                if (onMapClick) {
                    onMapClick(e);
                }
            });

            setMap(newMap);
            setDrawingManager(drawingMgr);
            onLoad(newMap);
        }
    }, []);

    // Function to start drawing
    const startDrawing = (type: 'polygon' | 'polyline') => {
        if (drawingManager) {
            const mode = type === 'polygon' ? 
                google.maps.drawing.OverlayType.POLYGON : 
                google.maps.drawing.OverlayType.POLYLINE;
            
            drawingManager.setDrawingMode(mode);
            setCurrentDrawingMode(mode);
        }
    };

    // Function to stop drawing
    const stopDrawing = () => {
        if (drawingManager) {
            drawingManager.setDrawingMode(null);
            setCurrentDrawingMode(null);
        }
    };

    // Update map type when changed
    useEffect(() => {
        if (map) {
            map.setMapTypeId(mapType as google.maps.MapTypeId);
        }
    }, [map, mapType]);

    // Update drawing options based on current stage
    useEffect(() => {
        if (drawingManager) {
            // Update polygon options for zones
            if (drawingStage === 'zones' && drawingMode === 'zone') {
                drawingManager.setOptions({
                    polygonOptions: {
                        fillColor: currentZoneColor,
                        fillOpacity: 0.3,
                        strokeColor: currentZoneColor,
                        strokeWeight: 2,
                        clickable: true,
                        editable: true,
                        zIndex: 1
                    }
                });
            }

            // Update obstacle options
            if (drawingStage === 'zones' && drawingMode === 'obstacle') {
                const obstacleConfig = OBSTACLE_TYPES[currentObstacleType as keyof typeof OBSTACLE_TYPES];
                drawingManager.setOptions({
                    polygonOptions: {
                        fillColor: obstacleConfig?.color || '#FF0000',
                        fillOpacity: 0.4,
                        strokeColor: obstacleConfig?.color || '#FF0000',
                        strokeWeight: 2,
                        clickable: true,
                        editable: true,
                        zIndex: 2
                    }
                });
            }

            // Update polyline options for pipes
            if (drawingStage === 'pipes') {
                drawingManager.setOptions({
                    polylineOptions: {
                        strokeColor: PIPE_TYPES[currentPipeType as keyof typeof PIPE_TYPES]?.color || '#3388ff',
                        strokeWeight: PIPE_TYPES[currentPipeType as keyof typeof PIPE_TYPES]?.weight || 4,
                        strokeOpacity: PIPE_TYPES[currentPipeType as keyof typeof PIPE_TYPES]?.opacity || 1,
                        clickable: true,
                        editable: true,
                        zIndex: 1
                    }
                });
            }
        }
    }, [drawingManager, drawingStage, drawingMode, currentZoneColor, currentPipeType, currentObstacleType]);

    // Update center and zoom
    useEffect(() => {
        if (map) {
            map.setCenter(center);
            map.setZoom(zoom);
        }
    }, [map, center, zoom]);

    return (
        <>
            <div ref={ref} style={{ width: '100%', height: '100%' }} />
            
            {/* Drawing Controls Overlay - Top Left, Smaller */}
            <div className="absolute top-2 left-2 z-10 bg-white rounded-md shadow-md p-2 max-w-xs">
                {/* Step 1: Field Drawing */}
                {drawingStage === 'field' && (
                    <div className="flex flex-col space-y-1">
                        <div className="text-xs font-semibold text-gray-700">Step 1: Draw Field</div>
                        <button
                            onClick={() => startDrawing('polygon')}
                            disabled={currentDrawingMode !== null}
                            className={`px-2 py-1 text-xs rounded ${
                                currentDrawingMode === google.maps.drawing.OverlayType.POLYGON
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                            } disabled:opacity-50`}
                        >
                            🏔️ {currentDrawingMode === google.maps.drawing.OverlayType.POLYGON ? 'Drawing...' : 'Draw Field'}
                        </button>
                        {currentDrawingMode && (
                            <button
                                onClick={stopDrawing}
                                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                            >
                                ❌ Cancel
                            </button>
                        )}
                    </div>
                )}

                {/* Step 2: Zones & Obstacles */}
                {drawingStage === 'zones' && (
                    <div className="flex flex-col space-y-1">
                        <div className="text-xs font-semibold text-gray-700">Step 2: Zones & Obstacles</div>
                        
                        {drawingMode === 'zone' && canDrawZone && (
                            <button
                                onClick={() => startDrawing('polygon')}
                                disabled={currentDrawingMode !== null}
                                className={`px-2 py-1 text-xs rounded ${
                                    currentDrawingMode === google.maps.drawing.OverlayType.POLYGON
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                } disabled:opacity-50`}
                                style={{ borderLeft: `4px solid ${currentZoneColor}` }}
                            >
                                🎨 {currentDrawingMode === google.maps.drawing.OverlayType.POLYGON ? 'Drawing...' : 'Draw Zone'}
                            </button>
                        )}

                        {drawingMode === 'obstacle' && (
                            <button
                                onClick={() => startDrawing('polygon')}
                                disabled={currentDrawingMode !== null}
                                className={`px-2 py-1 text-xs rounded ${
                                    currentDrawingMode === google.maps.drawing.OverlayType.POLYGON
                                        ? 'bg-red-600 text-white'
                                        : 'bg-red-500 text-white hover:bg-red-600'
                                } disabled:opacity-50`}
                            >
                                🚫 {currentDrawingMode === google.maps.drawing.OverlayType.POLYGON ? 'Drawing...' : 'Draw Obstacle'}
                            </button>
                        )}

                        {currentDrawingMode && (
                            <button
                                onClick={stopDrawing}
                                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                            >
                                ❌ Cancel
                            </button>
                        )}
                    </div>
                )}

                {/* Step 3: Pipes */}
                {drawingStage === 'pipes' && canDrawPipe && (
                    <div className="flex flex-col space-y-1">
                        <div className="text-xs font-semibold text-gray-700">Step 3: Pipe System</div>
                        <button
                            onClick={() => startDrawing('polyline')}
                            disabled={currentDrawingMode !== null}
                            className={`px-2 py-1 text-xs rounded ${
                                currentDrawingMode === google.maps.drawing.OverlayType.POLYLINE
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-purple-500 text-white hover:bg-purple-600'
                            } disabled:opacity-50`}
                        >
                            🔧 {currentDrawingMode === google.maps.drawing.OverlayType.POLYLINE ? 'Drawing...' : `Draw ${PIPE_TYPES[currentPipeType as keyof typeof PIPE_TYPES]?.name || 'Pipe'}`}
                        </button>
                        {currentDrawingMode && (
                            <button
                                onClick={stopDrawing}
                                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                            >
                                ❌ Cancel
                            </button>
                        )}
                    </div>
                )}

                {/* Equipment Placement Mode */}
                {isPlacingEquipment && selectedEquipmentType && (
                    <div className="flex flex-col space-y-1">
                        <div className="text-xs font-semibold text-gray-700">Equipment Placement</div>
                        <div className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                            {EQUIPMENT_TYPES[selectedEquipmentType].icon} Click to place {EQUIPMENT_TYPES[selectedEquipmentType].name}
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
        selectedIrrigationType,
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
        pipeSnapEnabled,
        setPipeSnapEnabled,
        pipeSnapDistance,
        setPipeSnapDistance,
        isGeneratingPipes,
        setIsGeneratingPipes,
        snapEnabled,
        setSnapEnabled,
        snapDistance,
        setSnapDistance,
        gridEnabled,
        setGridEnabled,
    } = pipeSystemState;

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

    const [plantingPoints, setPlantingPoints] = useState<any[]>([]);
    const [zoneSummaries, setZoneSummaries] = useState<any>({});

    // New states for error handling and loading
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Map state
    const [map, setMap] = useState<google.maps.Map | null>(null);

    // Store Google Maps objects
    const [mapObjects, setMapObjects] = useState<{
        zones: google.maps.Polygon[];
        pipes: google.maps.Polyline[];
        obstacles: google.maps.Polygon[];
        equipment: google.maps.Marker[];
        irrigation: google.maps.Marker[];
        irrigationCircles: google.maps.Circle[];
        irrigationLines: google.maps.Polyline[];
        plantMarkers: google.maps.Marker[];
    }>({
        zones: [],
        pipes: [],
        obstacles: [],
        equipment: [],
        irrigation: [],
        irrigationCircles: [],
        irrigationLines: [],
        plantMarkers: [],
    });

    // Missing handler functions
    const handleMapClick = (e: google.maps.MapMouseEvent) => {
        if (isPlacingEquipment && selectedEquipmentType && e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            placeEquipmentAtPosition(lat, lng);
        }
    };

    const handleEquipmentPlace = (equipmentType: EquipmentType, position: { lat: number; lng: number }) => {
        placeEquipmentAtPosition(position.lat, position.lng);
    };

    // Parse URL parameters
    useEffect(() => {
        if (crops) {
            const cropArray = crops.split(',').filter(Boolean);
            setSelectedCrops(cropArray);
        }
        if (irrigation) {
            setSelectedIrrigationType(irrigation);
        }
    }, [crops, irrigation]);

    // Selected crop objects
    const selectedCropObjects = selectedCrops
        .map((cropValue) => getCropByValue(cropValue))
        .filter(Boolean);

    // Validation functions
    const validateStep = (step: number): boolean => {
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
    };

    const goToStep = (step: number) => {
        if (step < 1 || step > 4) {
            return;
        }

        if (step > currentStep) {
            for (let i = 1; i < step; i++) {
                if (!validateStep(i)) {
                    return;
                }
            }
        }

        setCurrentStep(step);
        const stages = ['', 'field', 'zones', 'pipes', 'irrigation'];
        setDrawingStage(stages[step] as any);
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setStepCompleted((prev) => ({ ...prev, [currentStep]: true }));
            if (currentStep < 4) {
                goToStep(currentStep + 1);
            }
        }
    };

    const previousStep = () => {
        if (currentStep > 1) {
            goToStep(currentStep - 1);
        }
    };

    const resetAll = () => {
        if (confirm('⚠️ คุณต้องการรีเซ็ตทั้งหมดหรือไม่? ข้อมูลที่วาดไว้จะหายทั้งหมด')) {
            // Clear all Google Maps objects
            clearAllMapObjects();

            // Reset all state
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
            setZoneSummaries({});
            setPlantingPoints([]);
        }
    };

    // Clear all Google Maps objects
    const clearAllMapObjects = () => {
        // Clear zones
        mapObjects.zones.forEach(zone => zone.setMap(null));
        // Clear pipes
        mapObjects.pipes.forEach(pipe => pipe.setMap(null));
        // Clear obstacles
        mapObjects.obstacles.forEach(obstacle => obstacle.setMap(null));
        // Clear equipment
        mapObjects.equipment.forEach(equipment => equipment.setMap(null));
        // Clear irrigation
        mapObjects.irrigation.forEach(irrigation => irrigation.setMap(null));
        mapObjects.irrigationCircles.forEach(circle => circle.setMap(null));
        mapObjects.irrigationLines.forEach(line => line.setMap(null));
        // Clear plant markers
        mapObjects.plantMarkers.forEach(marker => marker.setMap(null));

        // Reset the objects state
        setMapObjects({
            zones: [],
            pipes: [],
            obstacles: [],
            equipment: [],
            irrigation: [],
            irrigationCircles: [],
            irrigationLines: [],
            plantMarkers: [],
        });
    };

    // Equipment functions
    const startPlacingEquipment = (equipmentType: EquipmentType) => {
        setSelectedEquipmentType(equipmentType);
        setIsPlacingEquipment(true);

        if (map) {
            map.setOptions({ draggableCursor: 'crosshair' });
        }
    };

    const cancelPlacingEquipment = () => {
        setIsPlacingEquipment(false);
        setSelectedEquipmentType(null);

        if (map) {
            map.setOptions({ draggableCursor: null });
        }
    };

    const placeEquipmentAtPosition = (lat: number, lng: number) => {
        if (!selectedEquipmentType || !map) return;

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

        // Create Google Maps marker
        let iconHtml = '';
        if (
            selectedEquipmentType === 'pump' ||
            selectedEquipmentType === 'ballvalve' ||
            selectedEquipmentType === 'solenoid'
        ) {
            let imgSrc = '';
            if (selectedEquipmentType === 'pump') imgSrc = '/generateTree/wtpump.png';
            if (selectedEquipmentType === 'ballvalve') imgSrc = '/generateTree/ballv.png';
            if (selectedEquipmentType === 'solenoid') imgSrc = '/generateTree/solv.png';
            iconHtml = `<img src="${imgSrc}" alt="${equipmentConfig.name}" style="width:32px;height:32px;object-fit:contain;display:block;margin:auto;" />`;
        } else {
            iconHtml = equipmentConfig.icon;
        }

        const marker = new google.maps.Marker({
            position: { lat, lng },
            map: map,
            title: equipmentConfig.name,
            icon: {
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="20" cy="20" r="18" fill="white" stroke="${equipmentConfig.color}" stroke-width="2"/>
                        <foreignObject x="6" y="6" width="28" height="28">
                            <div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 16px;">
                                ${iconHtml}
                            </div>
                        </foreignObject>
                    </svg>
                `)}`,
                scaledSize: new google.maps.Size(40, 40),
                anchor: new google.maps.Point(20, 20),
            }
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="text-align: center;">
                    <h3>${equipmentConfig.name}</h3>
                    <p>${equipmentConfig.description}</p>
                    <button onclick="window.removeEquipment('${equipmentId}')" style="background: #dc2626; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 5px;">ลบ</button>
                </div>
            `
        });

        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });

        (newEquipment as any).marker = marker;

        const newEquipmentState = [...equipmentIcons, newEquipment];
        setEquipmentIcons(newEquipmentState);
        setMapObjects(prev => ({
            ...prev,
            equipment: [...prev.equipment, marker]
        }));
        saveEquipmentToHistory(newEquipmentState);
        cancelPlacingEquipment();
    };

    // Make removeEquipment available globally for InfoWindow buttons
    useEffect(() => {
        (window as any).removeEquipment = (equipmentId: string) => {
            const equipmentToRemove = equipmentIcons.find((e) => e.id === equipmentId);
            if (!equipmentToRemove) return;

            const equipmentConfig = EQUIPMENT_TYPES[equipmentToRemove.type];

            if (confirm(`ต้องการลบ ${equipmentConfig.name} หรือไม่?`)) {
                const newEquipmentState = equipmentIcons.filter((e) => e.id !== equipmentId);
                setEquipmentIcons(newEquipmentState);
                saveEquipmentToHistory(newEquipmentState);

                if (equipmentToRemove.marker) {
                    equipmentToRemove.marker.setMap(null);
                    setMapObjects(prev => ({
                        ...prev,
                        equipment: prev.equipment.filter(marker => marker !== equipmentToRemove.marker)
                    }));
                }
            }
        };

        return () => {
            delete (window as any).removeEquipment;
        };
    }, [equipmentIcons]);

    const clearAllEquipment = () => {
        if (equipmentIcons.length === 0) {
            return;
        }

        if (confirm('ต้องการลบอุปกรณ์ทั้งหมดหรือไม่?')) {
            mapObjects.equipment.forEach(marker => marker.setMap(null));
            setMapObjects(prev => ({ ...prev, equipment: [] }));
            setEquipmentIcons([]);
            saveEquipmentToHistory([]);
        }
    };

    const saveEquipmentToHistory = (newEquipmentState: any[]) => {
        const newHistory = equipmentHistory.slice(0, equipmentHistoryIndex + 1);
        newHistory.push([...newEquipmentState]);
        setEquipmentHistory(newHistory);
        setEquipmentHistoryIndex(newHistory.length - 1);
    };

    const undoEquipment = () => {
        if (equipmentHistoryIndex > 0) {
            // Clear current equipment
            mapObjects.equipment.forEach(marker => marker.setMap(null));

            const newIndex = equipmentHistoryIndex - 1;
            const restoredEquipment = equipmentHistory[newIndex];
            setEquipmentIcons([...restoredEquipment]);
            setEquipmentHistoryIndex(newIndex);

            // Recreate markers
            const newMarkers: google.maps.Marker[] = [];
            restoredEquipment.forEach((equipment: any) => {
                const equipmentConfig = EQUIPMENT_TYPES[equipment.type];
                
                let iconHtml = '';
                if (
                    equipment.type === 'pump' ||
                    equipment.type === 'ballvalve' ||
                    equipment.type === 'solenoid'
                ) {
                    let imgSrc = '';
                    if (equipment.type === 'pump') imgSrc = '/generateTree/wtpump.png';
                    if (equipment.type === 'ballvalve') imgSrc = '/generateTree/ballv.png';
                    if (equipment.type === 'solenoid') imgSrc = '/generateTree/solv.png';
                    iconHtml = `<img src="${imgSrc}" alt="${equipmentConfig.name}" style="width:32px;height:32px;object-fit:contain;display:block;margin:auto;" />`;
                } else {
                    iconHtml = equipmentConfig.icon;
                }

                const marker = new google.maps.Marker({
                    position: { lat: equipment.lat, lng: equipment.lng },
                    map: map,
                    title: equipmentConfig.name,
                    icon: {
                        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                            <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="20" cy="20" r="18" fill="white" stroke="${equipmentConfig.color}" stroke-width="2"/>
                                <foreignObject x="6" y="6" width="28" height="28">
                                    <div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 16px;">
                                        ${iconHtml}
                                    </div>
                                </foreignObject>
                            </svg>
                        `)}`,
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 20),
                    }
                });

                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="text-align: center;">
                            <h3>${equipmentConfig.name}</h3>
                            <p>${equipmentConfig.description}</p>
                            <button onclick="window.removeEquipment('${equipment.id}')" style="background: #dc2626; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 5px;">ลบ</button>
                        </div>
                    `
                });

                marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                });

                equipment.marker = marker;
                newMarkers.push(marker);
            });

            setMapObjects(prev => ({ ...prev, equipment: newMarkers }));
        }
    };

    const redoEquipment = () => {
        if (equipmentHistoryIndex < equipmentHistory.length - 1) {
            // Clear current equipment
            mapObjects.equipment.forEach(marker => marker.setMap(null));

            const newIndex = equipmentHistoryIndex + 1;
            const restoredEquipment = equipmentHistory[newIndex];
            setEquipmentIcons([...restoredEquipment]);
            setEquipmentHistoryIndex(newIndex);

            // Recreate markers
            const newMarkers: google.maps.Marker[] = [];
            restoredEquipment.forEach((equipment: any) => {
                const equipmentConfig = EQUIPMENT_TYPES[equipment.type];
                
                let iconHtml = '';
                if (
                    equipment.type === 'pump' ||
                    equipment.type === 'ballvalve' ||
                    equipment.type === 'solenoid'
                ) {
                    let imgSrc = '';
                    if (equipment.type === 'pump') imgSrc = '/generateTree/wtpump.png';
                    if (equipment.type === 'ballvalve') imgSrc = '/generateTree/ballv.png';
                    if (equipment.type === 'solenoid') imgSrc = '/generateTree/solv.png';
                    iconHtml = `<img src="${imgSrc}" alt="${equipmentConfig.name}" style="width:32px;height:32px;object-fit:contain;display:block;margin:auto;" />`;
                } else {
                    iconHtml = equipmentConfig.icon;
                }

                const marker = new google.maps.Marker({
                    position: { lat: equipment.lat, lng: equipment.lng },
                    map: map,
                    title: equipmentConfig.name,
                    icon: {
                        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                            <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="20" cy="20" r="18" fill="white" stroke="${equipmentConfig.color}" stroke-width="2"/>
                                <foreignObject x="6" y="6" width="28" height="28">
                                    <div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 16px;">
                                        ${iconHtml}
                                    </div>
                                </foreignObject>
                            </svg>
                        `)}`,
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 20),
                    }
                });

                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="text-align: center;">
                            <h3>${equipmentConfig.name}</h3>
                            <p>${equipmentConfig.description}</p>
                            <button onclick="window.removeEquipment('${equipment.id}')" style="background: #dc2626; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 5px;">ลบ</button>
                        </div>
                    `
                });

                marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                });

                equipment.marker = marker;
                newMarkers.push(marker);
            });

            setMapObjects(prev => ({ ...prev, equipment: newMarkers }));
        }
    };

    // Irrigation system types
    const irrigationTypes = [
        {
            category: 'sprinkler',
            categoryName: 'การให้น้ำแบบฉีดฝอย (Sprinkler Irrigation)',
            categoryIcon: '💧',
            systems: [
                {
                    value: 'sprinkler',
                    name: 'สปริงเกลอร์ (Sprinkler)',
                    icon: '🌿',
                    description: 'ระบบฉีดน้ำแบบหมุนครอบคลุมพื้นที่กว้าง เหมาะสำหรับพืชไร่',
                    minRadius: 8,
                    maxRadius: 12,
                    defaultRadius: 12,
                    supportsOverlap: true,
                    color: '#22C55E',
                },
                {
                    value: 'mini_sprinkler',
                    name: 'มินิสปริงเกลอร์ (Mini Sprinkler)',
                    icon: '🌱',
                    description: 'สปริงเกลอร์ขนาดเล็ก เหมาะสำหรับต้นไม้และพืชผัก',
                    minRadius: 0.5,
                    maxRadius: 3,
                    defaultRadius: 1.5,
                    supportsOverlap: false,
                    color: '#3B82F6',
                },
            ],
        },
        {
            category: 'localized',
            categoryName: 'การให้น้ำแบบเฉพาะจุด (Localized Irrigation)',
            categoryIcon: '🎯',
            systems: [
                {
                    value: 'micro_spray',
                    name: 'ไมโครสเปรย์ และเจ็ท (Micro Spray & Jet)',
                    icon: '💦',
                    description: 'ระบบฉีดน้ำแบบละอองฝอย เหมาะสำหรับพืชที่ต้องการความชื้น',
                    minRadius: 3,
                    maxRadius: 8,
                    defaultRadius: 5,
                    supportsOverlap: false,
                    color: '#F59E0B',
                },
                {
                    value: 'drip_tape',
                    name: 'จุดน้ำหยด (Drip Points)',
                    icon: '💧',
                    description: 'ระบบจุดน้ำหยดตรงรากพืช ประหยัดน้ำมากที่สุด สามารถปรับระยะห่างได้',
                    minRadius: 0.3,
                    maxRadius: 3.0,
                    defaultRadius: 1.0,
                    supportsOverlap: false,
                    color: '#06B6D4',
                    isLinear: true,
                },
            ],
        },
    ];

    const selectedIrrigationSystem = irrigationTypes
        .flatMap((cat) => cat.systems)
        .find((sys) => sys.value === selectedIrrigationType);

    // Utility functions
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371000;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const isPointInPolygon = (point: { lat: number; lng: number }, polygon: google.maps.Polygon): boolean => {
        if (!polygon) return false;
        
        const path = polygon.getPath();
        return google.maps.geometry.poly.containsLocation(
            new google.maps.LatLng(point.lat, point.lng),
            polygon
        );
    };

    const isPointInObstacle = (point: { lat: number; lng: number }): boolean => {
        return obstacles.some((obstacle) => obstacle.polygon && isPointInPolygon(point, obstacle.polygon));
    };

    const isPointInZone = (point: { lat: number; lng: number }, zone: any): boolean => {
        return zone.polygon && isPointInPolygon(point, zone.polygon);
    };

    // Google Places search functionality using new Places API
    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim() || !map) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        setIsSearching(true);
        setShowDropdown(true);
        try {
            // Use the new Places API
            const { Place } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
            
            // Create a search request using Place.searchByText
            const request = {
                textQuery: query,
                fields: ['displayName', 'location', 'formattedAddress', 'viewport'],
                locationBias: map.getBounds() || undefined,
                maxResultCount: 5,
            };

            const { places } = await Place.searchByText(request);

            if (places && places.length > 0) {
                const searchResults = places.map((place) => ({
                    x: place.location?.lng() || 0,
                    y: place.location?.lat() || 0,
                    label: place.displayName || '',
                    address: place.formattedAddress || '',
                    place_id: place.id,
                    bounds: place.viewport ? {
                        north: place.viewport.getNorthEast().lat(),
                        south: place.viewport.getSouthWest().lat(),
                        east: place.viewport.getNorthEast().lng(),
                        west: place.viewport.getSouthWest().lng(),
                    } : null,
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
            // Fallback to old API if new API fails
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
                            bounds: place.geometry?.viewport ? {
                                north: place.geometry.viewport.getNorthEast().lat(),
                                south: place.geometry.viewport.getSouthWest().lat(),
                                east: place.geometry.viewport.getNorthEast().lng(),
                                west: place.geometry.viewport.getSouthWest().lng(),
                            } : null,
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
            }
        }
    }, [map]);

    // Search input with debounce
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

    // Cleanup
    useEffect(() => {
        return () => {
            if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
            }
        };
    }, []);

    // Debug: Expose state to window for debugging
    useEffect(() => {
        (window as any).debugState = {
            zones: zones.length,
            obstacles: obstacles.length,
            drawingMode,
            canDrawZone,
            currentStep,
            drawingStage,
            currentZoneColor,
            usedColors
        };
    }, [zones.length, obstacles.length, drawingMode, canDrawZone, currentStep, drawingStage, currentZoneColor, usedColors]);

    // Auto-update zone configuration
    useEffect(() => {
        if (currentStep === 2) {
            if (zones.length === 0) {
                console.log('Resetting zone settings for step 2');
                setCanDrawZone(true);
                setUsedColors([]);
                setCurrentZoneColor(ZONE_COLORS[0]);
                setDrawingMode('zone'); // Default to zone mode
            }
        } else if (currentStep === 3) {
            if (pipes.length === 0) {
                setCanDrawPipe(true);
                setCurrentPipeType('main');
            }
        }
    }, [currentStep, zones.length, pipes.length]);

    // Navigate to search result
    const goToLocation = (result: any) => {
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
        }

        // Clear dropdown immediately
        setShowDropdown(false);
        setSearchResults([]);
        
        setMapCenter([parseFloat(result.y), parseFloat(result.x)]);
        setMapZoom(16);
        setIsLocationSelected(true);
        setSearchQuery(result.label || result.address);

        // If bounds are available, fit the map to bounds
        if (result.bounds && map) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(new google.maps.LatLng(result.bounds.south, result.bounds.west));
            bounds.extend(new google.maps.LatLng(result.bounds.north, result.bounds.east));
            map.fitBounds(bounds);
        } else if (map) {
            map.setCenter({ lat: parseFloat(result.y), lng: parseFloat(result.x) });
            map.setZoom(16);
        }
    };

    // Convert Google Maps path to coordinates array
    const pathToCoordinates = (path: google.maps.MVCArray<google.maps.LatLng>): Array<{ lat: number; lng: number }> => {
        const coordinates: Array<{ lat: number; lng: number }> = [];
        for (let i = 0; i < path.getLength(); i++) {
            const latLng = path.getAt(i);
            coordinates.push({ lat: latLng.lat(), lng: latLng.lng() });
        }
        return coordinates;
    };

    // Handle drawing created
    const handleDrawCreated = (overlay: google.maps.MVCObject, type: string) => {
        console.log('Drawing created:', { type, drawingStage, drawingMode });
        
        if (type === 'polygon') {
            const polygon = overlay as google.maps.Polygon;
            const path = polygon.getPath();
            const coordinates = pathToCoordinates(path);

            if (drawingStage === 'field') {
                // Calculate area
                try {
                    const polygonCoords = coordinates.map((coord: any) => [coord.lng, coord.lat]);
                    const firstPoint = polygonCoords[0];
                    const lastPoint = polygonCoords[polygonCoords.length - 1];

                    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
                        polygonCoords.push(firstPoint);
                    }

                    const turfPolygon = turf.polygon([polygonCoords]);
                    const area = turf.area(turfPolygon);
                    setFieldAreaSize(area);

                    // Set polygon style
                    polygon.setOptions({
                        fillColor: '#22C55E',
                        fillOpacity: 0.2,
                        strokeColor: '#22C55E',
                        strokeWeight: 3,
                        clickable: true,
                        editable: true,
                        zIndex: 1
                    });

                    setMainField({
                        polygon: polygon,
                        coordinates: coordinates,
                        area: area,
                    });

                    setMapObjects(prev => ({ ...prev, zones: [...prev.zones, polygon] }));
                    console.log('Field created successfully');
                } catch (error) {
                    console.error('Field creation error:', error);
                    setFieldAreaSize(0);
                }

            } else if (drawingStage === 'zones') {
                if (drawingMode === 'zone' && canDrawZone) {
                    console.log('Creating zone with color:', currentZoneColor);
                    
                    const newZone = {
                        id: Date.now(),
                        polygon: polygon,
                        coordinates: coordinates,
                        color: currentZoneColor,
                        name: `Zone ${zones.length + 1}`,
                    };

                    // Set polygon style with current zone color
                    polygon.setOptions({
                        fillColor: currentZoneColor,
                        fillOpacity: 0.3,
                        strokeColor: currentZoneColor,
                        strokeWeight: 2,
                        clickable: true,
                        editable: true,
                        zIndex: 1
                    });

                    // Add click listener
                    polygon.addListener('click', () => {
                        setSelectedZone(newZone);
                        setShowPlantSelector(true);
                    });

                    setZones((prev) => {
                        const newZones = [...prev, newZone];
                        console.log('Zones updated:', newZones);
                        return newZones;
                    });
                    
                    setUsedColors((prev) => {
                        const newUsedColors = [...prev, currentZoneColor];
                        console.log('Used colors updated:', newUsedColors);
                        return newUsedColors;
                    });

                    // Find next available color
                    const newUsedColors = [...usedColors, currentZoneColor];
                    const availableColors = ZONE_COLORS.filter((color) => 
                        !newUsedColors.includes(color)
                    );
                    
                    console.log('Color management:', {
                        currentColor: currentZoneColor,
                        usedColors: usedColors,
                        newUsedColors: newUsedColors,
                        availableColors: availableColors
                    });
                    
                    if (availableColors.length > 0) {
                        const nextColor = availableColors[0];
                        console.log('Setting next zone color:', nextColor);
                        setCurrentZoneColor(nextColor);
                    } else {
                        console.log('No more colors available, disabling zone drawing');
                        setCanDrawZone(false);
                    }

                    setMapObjects(prev => ({ ...prev, zones: [...prev.zones, polygon] }));

                } else if (drawingMode === 'obstacle') {
                    console.log('Creating obstacle of type:', currentObstacleType);
                    
                    const obstacleConfig = OBSTACLE_TYPES[currentObstacleType as keyof typeof OBSTACLE_TYPES];
                    const newObstacle = {
                        id: Date.now(),
                        polygon: polygon,
                        coordinates: coordinates,
                        type: currentObstacleType,
                        name: `${obstacleConfig?.name || 'Obstacle'} ${obstacles.length + 1}`,
                    };

                    // Set obstacle style
                    polygon.setOptions({
                        fillColor: obstacleConfig?.color || '#FF0000',
                        fillOpacity: 0.4,
                        strokeColor: obstacleConfig?.color || '#FF0000',
                        strokeWeight: 2,
                        clickable: true,
                        editable: true,
                        zIndex: 2
                    });

                    setObstacles((prev) => {
                        const newObstacles = [...prev, newObstacle];
                        console.log('Obstacles updated:', newObstacles);
                        return newObstacles;
                    });
                    setMapObjects(prev => ({ ...prev, obstacles: [...prev.obstacles, polygon] }));
                }
            }
        } else if (type === 'polyline') {
            const polyline = overlay as google.maps.Polyline;
            const path = polyline.getPath();
            const coordinates = pathToCoordinates(path);

            if (drawingStage === 'pipes' && canDrawPipe) {
                console.log('Creating pipe of type:', currentPipeType);
                
                const pipeConfig = PIPE_TYPES[currentPipeType as keyof typeof PIPE_TYPES];
                const newPipe = {
                    id: Date.now(),
                    polyline: polyline,
                    coordinates: coordinates,
                    type: currentPipeType,
                    name: `${pipeConfig?.name || 'Pipe'} ${pipes.filter((p) => p.type === currentPipeType).length + 1}`,
                    color: pipeConfig?.color || '#3388ff',
                };

                // Set pipe style
                polyline.setOptions({
                    strokeColor: pipeConfig?.color || '#3388ff',
                    strokeWeight: pipeConfig?.weight || 4,
                    strokeOpacity: pipeConfig?.opacity || 1,
                    clickable: true,
                    editable: true,
                    zIndex: 1
                });

                setPipes((prev) => {
                    const newPipes = [...prev, newPipe];
                    console.log('Pipes updated:', newPipes);
                    return newPipes;
                });
                setMapObjects(prev => ({ ...prev, pipes: [...prev.pipes, polyline] }));
            }
        }
    };

    // Generate lateral pipes for a specific zone
    const generateLateralPipesForZone = (targetZone: any) => {
        if (isGeneratingPipes) {
            handleError('⚠️ กำลังสร้างท่อย่อยอยู่ กรุณารอสักครู่');
            return;
        }

        if (!targetZone || !targetZone.name) {
            handleError('⚠️ ข้อมูลโซนไม่ถูกต้อง กรุณาลองใหม่');
            return;
        }

        if (currentStep !== 3) {
            handleError('⚠️ กรุณาไปยังขั้นตอนที่ 3 (Pipe System) ก่อน');
            return;
        }

        setIsLoading(true);
        setIsGeneratingPipes(true);

        try {
            const submainPipes = pipes.filter((pipe) => pipe.type === 'submain');

            if (submainPipes.length === 0) {
                setIsGeneratingPipes(false);
                return;
            }

            // Generate lateral pipes logic here
            // This is a simplified version - you'll need to implement the full logic

            const lateralPipes: any[] = [];

            submainPipes.forEach((submainPipe) => {
                if (submainPipe.polyline && map) {
                    const path = submainPipe.polyline.getPath();
                    const coords = pathToCoordinates(path);

                    // Get spacing based on assigned crop
                    const assignedCrop = zoneAssignments[targetZone.id];
                    const optimalSpacing = assignedCrop ? rowSpacing[assignedCrop] || 1.5 : 1.5;

                    // Calculate total length
                    let totalLength = 0;
                    for (let i = 0; i < coords.length - 1; i++) {
                        totalLength += calculateDistance(
                            coords[i].lat,
                            coords[i].lng,
                            coords[i + 1].lat,
                            coords[i + 1].lng
                        );
                    }

                    const numLaterals = Math.floor(totalLength / optimalSpacing);

                    for (let i = 0; i <= numLaterals; i++) {
                        const distance = i * optimalSpacing;

                        // Find point on submain pipe
                        let lateralStart: any;
                        let accumulatedDistance = 0;

                        for (let j = 0; j < coords.length - 1; j++) {
                            const segmentStart = coords[j];
                            const segmentEnd = coords[j + 1];
                            const segmentLength = calculateDistance(
                                segmentStart.lat,
                                segmentStart.lng,
                                segmentEnd.lat,
                                segmentEnd.lng
                            );

                            if (accumulatedDistance + segmentLength >= distance) {
                                const remainingDistance = distance - accumulatedDistance;
                                const ratio = remainingDistance / segmentLength;

                                lateralStart = {
                                    lat: segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * ratio,
                                    lng: segmentStart.lng + (segmentEnd.lng - segmentStart.lng) * ratio,
                                };
                                break;
                            }

                            accumulatedDistance += segmentLength;
                        }

                        if (!lateralStart) {
                            lateralStart = coords[coords.length - 1];
                        }

                        if (!isPointInZone(lateralStart, targetZone)) continue;

                        // Create lateral pipes (simplified)
                        const lateralEnd = {
                            lat: lateralStart.lat + 0.001,
                            lng: lateralStart.lng + 0.001,
                        };

                        const lateralPath = [
                            new google.maps.LatLng(lateralStart.lat, lateralStart.lng),
                            new google.maps.LatLng(lateralEnd.lat, lateralEnd.lng),
                        ];

                        const lateralPolyline = new google.maps.Polyline({
                            path: lateralPath,
                            strokeColor: PIPE_TYPES.lateral.color,
                            strokeWeight: PIPE_TYPES.lateral.weight,
                            strokeOpacity: PIPE_TYPES.lateral.opacity,
                            map: map,
                            clickable: true,
                            editable: true,
                            zIndex: 1
                        });

                        const lateralPipe = {
                            id: Date.now() + lateralPipes.length + Math.random(),
                            polyline: lateralPolyline,
                            type: 'lateral',
                            name: `Lateral ${pipes.filter(p => p.type === 'lateral').length + lateralPipes.length + 1}`,
                            submainId: submainPipe.id,
                            zoneId: targetZone.id,
                            coordinates: [lateralStart, lateralEnd],
                        };

                        lateralPipes.push(lateralPipe);
                    }
                }
            });

            setPipes((prev) => [...prev, ...lateralPipes]);
            setMapObjects(prev => ({
                ...prev,
                pipes: [...prev.pipes, ...lateralPipes.map(pipe => pipe.polyline)]
            }));
            setIsGeneratingPipes(false);
        } catch (error) {
            handleError('เกิดข้อผิดพลาดในการสร้างท่อย่อย');
        } finally {
            setIsLoading(false);
            setIsGeneratingPipes(false);
        }
    };

    // Generate lateral pipes for all zones
    const generateLateralPipes = () => {
        if (zones.length === 0) {
            handleError('กรุณาสร้างโซนก่อน เพื่อที่จะสร้างท่อย่อยได้');
            return;
        }

        setIsLoading(true);
        try {
            zones.forEach((zone) => {
                generateLateralPipesForZone(zone);
            });
        } catch (error) {
            handleError('เกิดข้อผิดพลาดในการสร้างท่อย่อย');
        } finally {
            setIsLoading(false);
        }
    };

    const clearLateralPipes = () => {
        const lateralPipes = pipes.filter((pipe) => pipe.type === 'lateral');
        lateralPipes.forEach((pipe) => {
            if (pipe.polyline) {
                pipe.polyline.setMap(null);
            }
        });
        setPipes((prev) => prev.filter((pipe) => pipe.type !== 'lateral'));
        
        // Update map objects
        setMapObjects(prev => ({
            ...prev,
            pipes: prev.pipes.filter(polyline => 
                !lateralPipes.some(pipe => pipe.polyline === polyline)
            )
        }));
    };

    // Generate irrigation for zone
    const generateIrrigationForZone = (zone: any, irrigationType: string) => {
        if (!zone || !irrigationType || !map) return;

        setIsLoading(true);
        try {
            const irrigationSystem = irrigationTypes
                .flatMap((cat) => cat.systems)
                .find((sys) => sys.value === irrigationType);

            if (!irrigationSystem) return;

            // Clear existing irrigation for this zone
            clearIrrigationForZone(zone.id);

            // Get lateral pipes for this zone
            const zoneLateralPipes = pipes.filter(
                (pipe) => pipe.type === 'lateral' && pipe.zoneId === zone.id
            );

            if (zoneLateralPipes.length === 0) {
                return;
            }

            const newIrrigationPoints: any[] = [];
            const newIrrigationLines: any[] = [];

            // Get current radius setting
            const currentSettings = irrigationSettings[zone.id];
            const isChangingType = currentSettings && currentSettings.type !== irrigationType;

            let radius;
            if (isChangingType) {
                radius = irrigationSystem.defaultRadius;
                setIrrigationRadius((prev) => ({
                    ...prev,
                    [zone.id]: irrigationSystem.defaultRadius,
                }));
            } else {
                radius = irrigationRadius[zone.id];
                if (radius === undefined || radius === null) {
                    radius = irrigationSystem.defaultRadius;
                    setIrrigationRadius((prev) => ({
                        ...prev,
                        [zone.id]: irrigationSystem.defaultRadius,
                    }));
                }
            }

            const overlap = sprinklerOverlap[zone.id] || false;

            if (irrigationSystem.isLinear) {
                // Drip tape logic
                const dripHoleSpacing = radius;

                zoneLateralPipes.forEach((pipe) => {
                    if (pipe.polyline) {
                        const path = pipe.polyline.getPath();
                        const coords = pathToCoordinates(path);

                        // Calculate pipe length
                        let pipeLength = 0;
                        for (let i = 0; i < coords.length - 1; i++) {
                            pipeLength += calculateDistance(
                                coords[i].lat,
                                coords[i].lng,
                                coords[i + 1].lat,
                                coords[i + 1].lng
                            );
                        }

                        if (pipeLength === 0) return;

                        const holesInThisPipe = Math.floor(pipeLength / dripHoleSpacing);

                        // Create line overlay on lateral pipe
                        const dripPolyline = new google.maps.Polyline({
                            path: coords.map(coord => new google.maps.LatLng(coord.lat, coord.lng)),
                            strokeColor: irrigationSystem.color,
                            strokeWeight: 6,
                            strokeOpacity: 0.8,
                            map: map,
                            clickable: true,
                            zIndex: 2
                        });

                        const infoWindow = new google.maps.InfoWindow({
                            content: `
                                <div style="text-align: center; padding: 8px; min-width: 200px;">
                                    <h4 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">
                                        ${irrigationSystem.name}
                                    </h4>
                                    <div style="background: #f5f5f5; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                                        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">ท่อเส้นนี้:</div>
                                        <div style="font-size: 13px; color: #333; font-weight: bold;">
                                            ความยาว: ${pipeLength.toFixed(1)} เมตร
                                        </div>
                                        <div style="font-size: 13px; color: #333; font-weight: bold;">
                                            รู: ${holesInThisPipe} รู
                                        </div>
                                        <div style="font-size: 11px; color: #888;">
                                            ระยะห่างรู: ${dripHoleSpacing.toFixed(1)}m
                                        </div>
                                    </div>
                                    <div style="font-size: 11px; color: #666;">
                                        โซน: ${zone.name}
                                    </div>
                                </div>
                            `
                        });

                        dripPolyline.addListener('click', () => {
                            infoWindow.open(map, dripPolyline);
                        });

                        const irrigationLine = {
                            id: `irrigation_line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            polyline: dripPolyline,
                            type: irrigationType,
                            zoneId: zone.id,
                            zoneName: zone.name,
                            coordinates: coords,
                            pipeLength: pipeLength,
                            holesCount: holesInThisPipe,
                            holeSpacing: dripHoleSpacing,
                        };

                        newIrrigationLines.push(irrigationLine);
                    }
                });
            } else {
                // Point-based systems
                const spacingHorizontal = overlap ? radius * 1.4 : radius * 2;

                zoneLateralPipes.forEach((pipe) => {
                    if (pipe.polyline) {
                        const path = pipe.polyline.getPath();
                        const coords = pathToCoordinates(path);

                        let totalLength = 0;
                        for (let i = 0; i < coords.length - 1; i++) {
                            totalLength += calculateDistance(
                                coords[i].lat,
                                coords[i].lng,
                                coords[i + 1].lat,
                                coords[i + 1].lng
                            );
                        }

                        if (totalLength === 0) return;

                        const startOffset = radius;
                        const numPoints = Math.floor((totalLength - startOffset) / spacingHorizontal);
                        if (numPoints < 0) return;

                        for (let i = 0; i <= numPoints; i++) {
                            const distance = startOffset + i * spacingHorizontal;

                            if (distance > totalLength) continue;

                            let accumulatedDistance = 0;
                            let pointPosition: any = null;

                            for (let j = 0; j < coords.length - 1; j++) {
                                const segmentStart = coords[j];
                                const segmentEnd = coords[j + 1];
                                const segmentLength = calculateDistance(
                                    segmentStart.lat,
                                    segmentStart.lng,
                                    segmentEnd.lat,
                                    segmentEnd.lng
                                );

                                if (accumulatedDistance + segmentLength >= distance) {
                                    const remainingDistance = distance - accumulatedDistance;
                                    const ratio = segmentLength > 0 ? remainingDistance / segmentLength : 0;

                                    pointPosition = {
                                        lat: segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * ratio,
                                        lng: segmentStart.lng + (segmentEnd.lng - segmentStart.lng) * ratio,
                                    };
                                    break;
                                }

                                accumulatedDistance += segmentLength;
                            }

                            if (!pointPosition) {
                                pointPosition = coords[coords.length - 1];
                            }

                            if (!isPointInZone(pointPosition, zone) || isPointInObstacle(pointPosition)) continue;

                            // Create marker
                            const dotSize = irrigationType === 'sprinkler' ? 16 : irrigationType === 'micro_spray' ? 14 : 12;
                            
                            const marker = new google.maps.Marker({
                                position: pointPosition,
                                map: map,
                                title: irrigationSystem.name,
                                icon: {
                                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                        <svg width="${dotSize}" height="${dotSize}" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="${dotSize/2}" cy="${dotSize/2}" r="${dotSize/2-2}" fill="${irrigationSystem.color}" stroke="white" stroke-width="2"/>
                                        </svg>
                                    `)}`,
                                    scaledSize: new google.maps.Size(dotSize, dotSize),
                                    anchor: new google.maps.Point(dotSize / 2, dotSize / 2),
                                }
                            });

                            // Create coverage circle
                            const coverageCircle = new google.maps.Circle({
                                center: pointPosition,
                                radius: radius,
                                strokeColor: irrigationSystem.color,
                                strokeOpacity: 0.6,
                                strokeWeight: irrigationType === 'sprinkler' ? 2 : 1,
                                fillColor: irrigationSystem.color,
                                fillOpacity: irrigationType === 'sprinkler' ? (overlap ? 0.2 : 0.12) : irrigationType === 'micro_spray' ? 0.15 : 0.1,
                                map: map,
                                clickable: false,
                                zIndex: 0
                            });

                            const infoWindow = new google.maps.InfoWindow({
                                content: `
                                    <div style="text-align: center; padding: 4px;">
                                        <div style="font-size: 14px; font-weight: bold; margin-bottom: 2px;">
                                            ${irrigationSystem.name}
                                        </div>
                                        <div style="font-size: 12px; color: #666;">
                                            รัศมี: ${radius}m | โซน: ${zone.name}
                                        </div>
                                        <div style="font-size: 10px; color: #888;">
                                            ระยะห่าง: ${spacingHorizontal.toFixed(1)}m
                                        </div>
                                        ${irrigationSystem.supportsOverlap ? `<div style="font-size: 10px; color: #999;">รูปแบบ: ${overlap ? 'ทับซ้อน (Grid)' : 'มาตรฐาน (Grid)'}</div>` : ''}
                                    </div>
                                `
                            });

                            marker.addListener('click', () => {
                                infoWindow.open(map, marker);
                            });

                            const irrigationPoint = {
                                id: `irrigation_point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                marker: marker,
                                coverageCircle: coverageCircle,
                                type: irrigationType,
                                zoneId: zone.id,
                                zoneName: zone.name,
                                position: pointPosition,
                                radius: radius,
                                overlap: overlap,
                            };

                            newIrrigationPoints.push(irrigationPoint);
                        }
                    }
                });
            }

            // Update state
            setIrrigationPoints((prev) => [...prev, ...newIrrigationPoints]);
            setIrrigationLines((prev) => [...prev, ...newIrrigationLines]);
            setIrrigationAssignments((prev) => ({ ...prev, [zone.id]: irrigationType }));
            setIrrigationSettings((prev) => ({
                ...prev,
                [zone.id]: {
                    type: irrigationType,
                    radius: radius,
                    overlap: overlap,
                    pointsCount: newIrrigationPoints.length,
                    linesCount: newIrrigationLines.length,
                },
            }));

            // Update map objects
            setMapObjects(prev => ({
                ...prev,
                irrigation: [...prev.irrigation, ...newIrrigationPoints.map(point => point.marker)],
                irrigationCircles: [...prev.irrigationCircles, ...newIrrigationPoints.map(point => point.coverageCircle)],
                irrigationLines: [...prev.irrigationLines, ...newIrrigationLines.map(line => line.polyline)]
            }));

        } catch (error) {
            handleError('เกิดข้อผิดพลาดในการสร้างระบบการให้น้ำ');
        } finally {
            setIsLoading(false);
        }
    };

    // Clear irrigation for a specific zone
    const clearIrrigationForZone = (zoneId: string) => {
        const zoneIrrigationPoints = irrigationPoints.filter((point) => point.zoneId === zoneId);
        zoneIrrigationPoints.forEach((point) => {
            if (point.marker) {
                point.marker.setMap(null);
            }
            if (point.coverageCircle) {
                point.coverageCircle.setMap(null);
            }
        });

        const zoneIrrigationLines = irrigationLines.filter((line) => line.zoneId === zoneId);
        zoneIrrigationLines.forEach((line) => {
            if (line.polyline) {
                line.polyline.setMap(null);
            }
        });

        setIrrigationPoints((prev) => prev.filter((point) => point.zoneId !== zoneId));
        setIrrigationLines((prev) => prev.filter((line) => line.zoneId !== zoneId));
        setPlantingPoints((prev) => prev.filter((p) => p.zoneId !== zoneId));

        setIrrigationAssignments((prev) => {
            const newAssignments = { ...prev };
            delete newAssignments[zoneId];
            return newAssignments;
        });

        setIrrigationSettings((prev) => {
            const newSettings = { ...prev };
            delete newSettings[zoneId];
            return newSettings;
        });

        setZoneSummaries((prev) => {
            const newSummaries = { ...prev };
            delete newSummaries[zoneId];
            return newSummaries;
        });

        // Update map objects
        setMapObjects(prev => ({
            ...prev,
            irrigation: prev.irrigation.filter(marker => 
                !zoneIrrigationPoints.some(point => point.marker === marker)
            ),
            irrigationCircles: prev.irrigationCircles.filter(circle => 
                !zoneIrrigationPoints.some(point => point.coverageCircle === circle)
            ),
            irrigationLines: prev.irrigationLines.filter(line => 
                !zoneIrrigationLines.some(lineObj => lineObj.polyline === line)
            )
        }));
    };

    const addNewZone = () => {
        const availableColors = ZONE_COLORS.filter((color) => !usedColors.includes(color));

        if (availableColors.length > 0) {
            const nextColor = availableColors[0];
            setCurrentZoneColor(nextColor);
            setCanDrawZone(true);
        } else {
            setCurrentZoneColor(ZONE_COLORS[0]);
            setCanDrawZone(true);
            setUsedColors([]);
        }
    };

    // Calculate center from field coordinates
    const getFieldCenter = (field: any) => {
        if (field && field.polygon) {
            const bounds = new google.maps.LatLngBounds();
            const path = field.polygon.getPath();
            for (let i = 0; i < path.getLength(); i++) {
                bounds.extend(path.getAt(i));
            }
            const center = bounds.getCenter();
            return [center.lat(), center.lng()];
        }
        return mapCenter;
    };

    const assignPlantToZone = (zoneId: string, plantValue: string) => {
        if (!zoneId || !plantValue) {
            return;
        }

        const targetZone = zones.find((z) => z.id.toString() === zoneId);
        const selectedPlant = getCropByValue(plantValue);

        if (!targetZone || !selectedPlant || !map) {
            return;
        }

        try {
            setZoneAssignments((prev) => ({ ...prev, [zoneId]: plantValue }));
            setShowPlantSelector(false);
            setSelectedZone(null);

            const zone = zones.find((z) => z.id.toString() === zoneId);
            if (zone && zone.polygon) {
                // Calculate center of the polygon
                const bounds = new google.maps.LatLngBounds();
                const path = zone.polygon.getPath();
                for (let i = 0; i < path.getLength(); i++) {
                    bounds.extend(path.getAt(i));
                }
                const center = bounds.getCenter();

                // Remove existing marker if any
                if (zone.plantMarker) {
                    zone.plantMarker.setMap(null);
                    setMapObjects(prev => ({
                        ...prev,
                        plantMarkers: prev.plantMarkers.filter(marker => marker !== zone.plantMarker)
                    }));
                }

                // Create new marker
                const marker = new google.maps.Marker({
                    position: center,
                    map: map,
                    title: selectedPlant.name,
                    icon: {
                        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                            <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="20" cy="20" r="18" fill="white" stroke="${zone.color}" stroke-width="2"/>
                                <text x="20" y="28" font-family="Arial" font-size="20" text-anchor="middle" fill="black">${selectedPlant.icon}</text>
                            </svg>
                        `)}`,
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 20),
                    }
                });

                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="text-align: center;">
                            <div style="font-size: 16px; margin-bottom: 4px;">${selectedPlant.icon}</div>
                            <div style="font-weight: bold; margin-bottom: 2px; color: #333;">${selectedPlant.name}</div>
                            <div style="font-size: 10px; opacity: 0.8; margin-bottom: 4px; line-height: 1.2;">${selectedPlant.description}</div>
                            <div style="font-size: 9px; opacity: 0.6; border-top: 1px solid rgba(0,0,0,0.2); padding-top: 4px; margin-top: 4px;">
                                <div style="color: ${zone.color};">● ${zone.name}</div>
                            </div>
                        </div>
                    `
                });

                marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                });

                zone.plantMarker = marker;
                setZones((prev) =>
                    prev.map((z) => (z.id === zone.id ? { ...z, plantMarker: marker } : z))
                );

                setMapObjects(prev => ({
                    ...prev,
                    plantMarkers: [...prev.plantMarkers, marker]
                }));
            }
        } catch (error) {
            handleError('เกิดข้อผิดพลาดในการกำหนดพืช');
        }
    };

    const removePlantFromZone = (zoneId: string) => {
        setZoneAssignments((prev) => {
            const newAssignments = { ...prev };
            delete newAssignments[zoneId];
            return newAssignments;
        });

        const zone = zones.find((z) => z.id.toString() === zoneId);
        if (zone && zone.plantMarker) {
            zone.plantMarker.setMap(null);
            setMapObjects(prev => ({
                ...prev,
                plantMarkers: prev.plantMarkers.filter(marker => marker !== zone.plantMarker)
            }));
        }
        setZones((prev) => prev.map((z) => (z.id === zone.id ? { ...z, plantMarker: null } : z)));
    };

    const deleteZone = (zoneId: string) => {
        const zone = zones.find((z) => z.id.toString() === zoneId);
        if (!zone) return;

        const assignedPlant = zoneAssignments[zoneId];
        const plantInfo = assignedPlant ? getCropByValue(assignedPlant) : null;

        const confirmMessage = plantInfo
            ? `Are you sure you want to delete ${zone.name} with ${plantInfo.name}? This action cannot be undone.`
            : `Are you sure you want to delete ${zone.name}? This action cannot be undone.`;

        if (!confirm(confirmMessage)) {
            return;
        }

        if (zone.plantMarker) {
            zone.plantMarker.setMap(null);
            setMapObjects(prev => ({
                ...prev,
                plantMarkers: prev.plantMarkers.filter(marker => marker !== zone.plantMarker)
            }));
        }

        if (zone.polygon) {
            zone.polygon.setMap(null);
            setMapObjects(prev => ({
                ...prev,
                zones: prev.zones.filter(polygon => polygon !== zone.polygon)
            }));
        }

        setZoneAssignments((prev) => {
            const newAssignments = { ...prev };
            delete newAssignments[zoneId];
            return newAssignments;
        });

        setUsedColors((prev) => prev.filter((color) => color !== zone.color));

        if (zone.color === currentZoneColor) {
            setCanDrawZone(true);
        }

        setZones((prev) => prev.filter((z) => z.id.toString() !== zoneId));
    };

    // Clear search dropdown
    const clearSearch = () => {
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
        }
        setSearchQuery('');
        setSearchResults([]);
        setIsLocationSelected(false);
        setShowDropdown(false);
        setIsSearching(false);
    };

    // Crop spacing management
    const handleRowSpacingConfirm = (cropValue: string) => {
        const tempValue = tempRowSpacing[cropValue];
        const newSpacing = parseFloat(tempValue);

        if (!isNaN(newSpacing) && newSpacing > 0 && newSpacing <= 10) {
            setRowSpacing((prev) => ({ ...prev, [cropValue]: newSpacing }));
            setEditingRowSpacingForCrop(null);
        } else {
            const currentSpacing = rowSpacing[cropValue] || 1.5;
            setTempRowSpacing((prev) => ({ ...prev, [cropValue]: currentSpacing.toString() }));
            setEditingRowSpacingForCrop(null);
        }
    };

    const handleRowSpacingCancel = (cropValue: string) => {
        const currentSpacing = rowSpacing[cropValue] || 1.5;
        setTempRowSpacing((prev) => ({ ...prev, [cropValue]: currentSpacing.toString() }));
        setEditingRowSpacingForCrop(null);
    };

    const handlePlantSpacingConfirm = (cropValue: string) => {
        const tempValue = tempPlantSpacing[cropValue];
        const newSpacing = parseFloat(tempValue);

        if (!isNaN(newSpacing) && newSpacing > 0 && newSpacing <= 10) {
            setPlantSpacing((prev) => ({ ...prev, [cropValue]: newSpacing }));
            setEditingPlantSpacingForCrop(null);
        } else {
            const currentSpacing = plantSpacing[cropValue] || 1.0;
            setTempPlantSpacing((prev) => ({ ...prev, [cropValue]: currentSpacing.toString() }));
            setEditingPlantSpacingForCrop(null);
        }
    };

    const handlePlantSpacingCancel = (cropValue: string) => {
        const currentSpacing = plantSpacing[cropValue] || 1.0;
        setTempPlantSpacing((prev) => ({ ...prev, [cropValue]: currentSpacing.toString() }));
        setEditingPlantSpacingForCrop(null);
    };

    // Error handling functions
    const handleError = (errorMessage: string) => {
        setError(errorMessage);
        setTimeout(() => setError(null), 5000);
    };

    const clearError = () => {
        setError(null);
    };

    // Get current location
    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setMapCenter([latitude, longitude]);
                    setMapZoom(15);
                },
                () => {
                    handleError('ไม่สามารถรับตำแหน่งปัจจุบันได้');
                }
            );
        }
    };

    // Enhanced capture function
    const handleCaptureMapAndSummary = async () => {
        let optimalCenter = mapCenter;
        let optimalZoom = mapZoom;

        if (mainField && mainField.polygon) {
            try {
                const bounds = new google.maps.LatLngBounds();
                const path = mainField.polygon.getPath();
                for (let i = 0; i < path.getLength(); i++) {
                    bounds.extend(path.getAt(i));
                }
                const center = bounds.getCenter();
                optimalCenter = [center.lat(), center.lng()];

                if (fieldAreaSize > 10000) {
                    optimalZoom = 16;
                } else if (fieldAreaSize > 5000) {
                    optimalZoom = 17;
                } else {
                    optimalZoom = 18;
                }
            } catch (error) {
                console.error('Error calculating optimal center:', error);
            }
        }

        const summaryData = {
            mainField: mainField
                ? {
                      id: Date.now(),
                      name: 'Main Field',
                      coordinates: pathToCoordinates(mainField.polygon.getPath()),
                      area: fieldAreaSize,
                  }
                : null,
            fieldAreaSize,
            selectedCrops: [...selectedCrops],
            zones: zones.map((zone) => ({
                id: zone.id,
                name: zone.name,
                color: zone.color,
                coordinates: zone.polygon ? pathToCoordinates(zone.polygon.getPath()) : [],
                area: 0,
            })),
            zoneAssignments: { ...zoneAssignments },
            zoneSummaries: { ...zoneSummaries },
            pipes: pipes.map((pipe) => ({
                id: pipe.id,
                type: pipe.type,
                name: pipe.name,
                coordinates: pipe.polyline ? pathToCoordinates(pipe.polyline.getPath()) : [],
                length: 0,
            })),
            equipmentIcons: equipmentIcons.map((equipment) => ({
                id: equipment.id,
                type: equipment.type,
                name: equipment.name,
                lat: equipment.lat,
                lng: equipment.lng,
                config: equipment.config,
            })),
            irrigationPoints: irrigationPoints.map((point) => ({
                id: point.id,
                type: point.type,
                zoneId: point.zoneId,
                zoneName: point.zoneName,
                position: point.position ? [point.position.lat, point.position.lng] : null,
                radius: point.radius,
                overlap: point.overlap,
                spacing: point.spacing,
            })),
            irrigationLines: irrigationLines.map((line) => ({
                id: line.id,
                type: line.type,
                zoneId: line.zoneId,
                zoneName: line.zoneName,
                coordinates: line.polyline ? pathToCoordinates(line.polyline.getPath()) : [],
            })),
            irrigationAssignments: { ...irrigationAssignments },
            irrigationSettings: { ...irrigationSettings },
            rowSpacing: { ...rowSpacing },
            plantSpacing: { ...plantSpacing },
            mapCenter: optimalCenter,
            mapZoom: optimalZoom,
            mapType,
            plantingPoints: plantingPoints.map((point) => ({
                id: point.id,
                zoneId: point.zoneId,
                position: point.position ? [point.position.lat, point.position.lng] : null,
            })),
            obstacles: obstacles.map((obstacle) => ({
                id: obstacle.id,
                type: obstacle.type,
                coordinates: obstacle.polygon ? pathToCoordinates(obstacle.polygon.getPath()) : [],
            })),
            timestamp: new Date().toISOString(),
        };

        try {
            localStorage.setItem('fieldMapData', JSON.stringify(summaryData));
            window.location.href = '/field-crop-summary';
        } catch (error) {
            console.error('Error saving data:', error);
            handleError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    };

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-gray-900 text-white">
                <Head title="Field Map - Irrigation Planning" />

                {/* Error Message Display */}
                {error && (
                    <div className="fixed right-4 top-4 z-[9999] max-w-md">
                        <ErrorMessage
                            title="Error"
                            message={error}
                            type="error"
                            onDismiss={clearError}
                        />
                    </div>
                )}

                {/* Loading Spinner */}
                {isLoading && (
                    <LoadingSpinner size="lg" color="blue" text="Processing..." fullScreen={true} />
                )}

                {/* Top Header Section */}
                <div className="border-b border-gray-700 bg-gray-800">
                    <div className="container mx-auto px-4 py-3">
                        <div className="mx-auto max-w-7xl">
                            {/* Back Navigation */}
                            <Link
                                href="/field-crop"
                                className="mb-4 inline-flex items-center text-blue-400 hover:text-blue-300"
                            >
                                <svg
                                    className="mr-2 h-5 w-5"
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

                            {/* Main Title */}
                            <h1 className="mb-2 text-3xl font-bold">🗺️ Field Map Planning</h1>
                            <p className="mb-6 text-gray-400">
                                View and plan irrigation systems for your selected crops
                            </p>

                            {/* Step Wizard Navigation */}
                            <div className="rounded-lg bg-gray-700 p-4">
                                <h3 className="mb-3 text-lg font-semibold">🎨 Planning Wizard</h3>
                                <div className="grid grid-cols-4 gap-4">
                                    {[
                                        { step: 1, title: 'Field & Crops', subtitle: 'Draw field + set spacing', icon: '1️⃣', color: 'green' },
                                        { step: 2, title: 'Zones & Obstacles', subtitle: 'Zones + assign crops', icon: '2️⃣', color: 'blue' },
                                        { step: 3, title: 'Pipe System', subtitle: 'Main + sub + laterals', icon: '3️⃣', color: 'purple' },
                                        { step: 4, title: 'Irrigation System', subtitle: 'Sprinklers + drip + micro', icon: '4️⃣', color: 'cyan' }
                                    ].map((stepInfo) => (
                                        <button
                                            key={stepInfo.step}
                                            onClick={() => goToStep(stepInfo.step)}
                                            className={`flex flex-col items-center rounded-lg border-2 p-3 transition-all ${
                                                currentStep === stepInfo.step
                                                    ? stepInfo.color === 'green'
                                                        ? 'border-green-500 bg-green-500/20 text-green-300'
                                                        : stepInfo.color === 'blue'
                                                          ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                                                          : stepInfo.color === 'purple'
                                                            ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                                                            : 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                                                    : stepCompleted[stepInfo.step]
                                                      ? stepInfo.color === 'green'
                                                        ? 'border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                                        : stepInfo.color === 'blue'
                                                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                                                          : stepInfo.color === 'purple'
                                                            ? 'border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                                                            : 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                                                      : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
                                            }`}
                                        >
                                            <span className="mb-1 text-lg">
                                                {stepCompleted[stepInfo.step] ? '✅' : stepInfo.icon}
                                            </span>
                                            <div className="text-center">
                                                <div className="text-sm font-medium">{stepInfo.title}</div>
                                                <div className="text-xs opacity-75">{stepInfo.subtitle}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="w-full px-4 py-4">
                    <div className="w-full">
                        <div className="grid h-[calc(100vh-100px)] grid-cols-12 gap-6">
                            {/* Left Tools Panel */}
                            <div className="col-span-4 overflow-hidden rounded-lg bg-gray-800">
                                <div className="flex h-full flex-col">
                                    {/* Tools Header */}
                                    <div className="border-b border-gray-600 bg-gray-700 p-4">
                                        <h3 className="text-lg font-semibold text-white">
                                            🛠️ Tools & Settings
                                        </h3>
                                    </div>

                                    {/* Scrollable Tools Content */}
                                    <div className="flex-1 space-y-4 overflow-y-auto p-4">
                                        {/* Smart Controls - Hidden in Step 4 */}
                                        {currentStep !== 4 && (
                                            <FieldMapSmartControls
                                                snapEnabled={snapEnabled}
                                                setSnapEnabled={setSnapEnabled}
                                                gridEnabled={gridEnabled}
                                                setGridEnabled={setGridEnabled}
                                                pipeSnapEnabled={pipeSnapEnabled}
                                                setPipeSnapEnabled={setPipeSnapEnabled}
                                                drawingStage={drawingStage}
                                            />
                                        )}

                                        {/* Tools Panel with all 4 steps */}
                                        <div className="border-t border-gray-600 pt-4">
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
                                                setEditingPlantSpacingForCrop={setEditingPlantSpacingForCrop}
                                                handlePlantSpacingConfirm={handlePlantSpacingConfirm}
                                                handlePlantSpacingCancel={handlePlantSpacingCancel}
                                                handleCaptureMapAndSummary={handleCaptureMapAndSummary}
                                                irrigationSettings={irrigationSettings}
                                                setIrrigationSettings={setIrrigationSettings}
                                                // Add force update key
                                                key={`tools-panel-${zones.length}-${obstacles.length}-${pipes.length}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Map Panel */}
                            <div className="col-span-8 overflow-hidden rounded-lg bg-gray-800">
                                <div className="flex h-full flex-col">
                                    {/* Map Header */}
                                    <div className="border-b border-gray-600 bg-gray-700 p-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-white">
                                                📍 Interactive Map
                                            </h3>

                                            <div className="flex space-x-2">
                                                {[
                                                    { id: 'roadmap', name: '🗺️ Road' },
                                                    { id: 'satellite', name: '🛰️ Satellite' },
                                                    { id: 'hybrid', name: '🔄 Hybrid' },
                                                    { id: 'terrain', name: '🏔️ Terrain' }
                                                ].map(type => (
                                                    <button
                                                        key={type.id}
                                                        onClick={() => {
                                                            setMapType(type.id as "satellite" | "street" | "hybrid");
                                                        }}
                                                        className={`rounded px-3 py-1 text-xs transition-colors ${
                                                            mapType === type.id
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-gray-600 text-white hover:bg-gray-500'
                                                        }`}
                                                    >
                                                        {type.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Map Container */}
                                    <div className="relative flex-1">
                                        <Wrapper
                                            apiKey={getGoogleMapsConfig().apiKey}
                                            render={(status: Status) => {
                                                if (status === Status.LOADING) return <div>Loading...</div>;
                                                if (status === Status.FAILURE) return <div>Error loading maps</div>;
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
                                                zones={zones}
                                                pipes={pipes}
                                                obstacles={obstacles}
                                                equipmentIcons={equipmentIcons}
                                                mainField={mainField}
                                                onMapClick={handleMapClick}
                                                onEquipmentPlace={handleEquipmentPlace}
                                                onZoneClick={(zone) => {
                                                    setSelectedZone(zone);
                                                    setShowPlantSelector(true);
                                                }}
                                                mapType={mapType}
                                                // Add these props for sync
                                                setDrawingMode={setDrawingMode}
                                                setCurrentZoneColor={setCurrentZoneColor}
                                                setCurrentObstacleType={setCurrentObstacleType}
                                                setCurrentPipeType={setCurrentPipeType}
                                            />
                                        </Wrapper>

                                        {/* Location Search Overlay - Top Right, Smaller */}
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
                                                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 shadow-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    />
                                                    {searchQuery && (
                                                        <button
                                                            onClick={clearSearch}
                                                            className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {isSearching && (
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Search Results Dropdown */}
                                                {showDropdown && searchResults.length > 0 && (
                                                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                                        {searchResults.map((result, index) => (
                                                            <button
                                                                key={index}
                                                                onMouseDown={(e) => {
                                                                    // Prevent input blur
                                                                    e.preventDefault();
                                                                    goToLocation(result);
                                                                }}
                                                                className="w-full border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-900 hover:bg-blue-50 last:border-b-0"
                                                            >
                                                                <div className="flex items-start space-x-2">
                                                                    <div className="mt-0.5 text-blue-500">
                                                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        </svg>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-medium text-gray-900 truncate text-xs">
                                                                            {result.label}
                                                                        </div>
                                                                        {result.address && result.address !== result.label && (
                                                                            <div className="text-xs text-gray-500 truncate mt-0.5">
                                                                                {result.address}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* No Results Message */}
                                                {showDropdown && searchResults.length === 0 && !isSearching && searchQuery.trim() && (
                                                    <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-gray-200 bg-white p-3 text-center text-xs text-gray-500 shadow-lg">
                                                        No places found for "{searchQuery}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Equipment Placement Overlay */}
                                        {isPlacingEquipment && selectedEquipmentType && (
                                            <div className="pointer-events-none absolute left-1/2 top-4 z-[1000] -translate-x-1/2 transform rounded-lg bg-black bg-opacity-75 px-4 py-2 text-sm text-white">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-lg">
                                                        {EQUIPMENT_TYPES[selectedEquipmentType].icon}
                                                    </span>
                                                    <span>
                                                        คลิกบนแผนที่เพื่อวาง {EQUIPMENT_TYPES[selectedEquipmentType].name}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Map Controls Footer */}
                                    <div className="border-t border-gray-600 bg-gray-700 p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex space-x-2">
                                                <Tooltip content="Center map view">
                                                    <button
                                                        onClick={() => {
                                                            setMapCenter([14.5995, 120.9842]);
                                                            setMapZoom(13);
                                                        }}
                                                        className="rounded bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-700"
                                                    >
                                                        📍 Center
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="Get your current location">
                                                    <button
                                                        onClick={getCurrentLocation}
                                                        className="rounded bg-green-600 px-3 py-1 text-xs text-white transition-colors hover:bg-green-700"
                                                    >
                                                        🎯 My Location
                                                    </button>
                                                </Tooltip>

                                                {/* Equipment buttons - Only available in Step 3 */}
                                                {currentStep === 3 && (
                                                    <>
                                                        <div className="h-6 w-px bg-gray-500"></div>
                                                        {Object.entries(EQUIPMENT_TYPES).map(([key, config]) => (
                                                            <Tooltip key={key} content={`วาง ${config.name}`}>
                                                                <button
                                                                    onClick={() => startPlacingEquipment(key as EquipmentType)}
                                                                    className={`rounded px-3 py-1 text-xs transition-colors ${
                                                                        selectedEquipmentType === key && isPlacingEquipment
                                                                            ? 'bg-yellow-600 text-white'
                                                                            : 'bg-gray-600 text-white hover:bg-gray-500'
                                                                    }`}
                                                                    disabled={isPlacingEquipment && selectedEquipmentType !== key}
                                                                >
                                                                    {config.icon} {config.name.split(' ')[0]}
                                                                </button>
                                                            </Tooltip>
                                                        ))}

                                                        {isPlacingEquipment && (
                                                            <Tooltip content="ยกเลิกการวางอุปกรณ์">
                                                                <button
                                                                    onClick={cancelPlacingEquipment}
                                                                    className="rounded bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-700"
                                                                >
                                                                    ❌ ยกเลิก
                                                                </button>
                                                            </Tooltip>
                                                        )}

                                                        <Tooltip
                                                            content={
                                                                equipmentIcons.length > 0
                                                                    ? `ล้างอุปกรณ์ทั้งหมด (${equipmentIcons.length} รายการ)`
                                                                    : 'ยังไม่มีอุปกรณ์บนแผนที่'
                                                            }
                                                        >
                                                            <button
                                                                onClick={clearAllEquipment}
                                                                disabled={equipmentIcons.length === 0}
                                                                className={`rounded px-3 py-1 text-xs transition-colors ${
                                                                    equipmentIcons.length === 0
                                                                        ? 'cursor-not-allowed bg-gray-500 text-gray-300'
                                                                        : 'bg-orange-600 text-white hover:bg-orange-700'
                                                                }`}
                                                            >
                                                                🧹 ล้างทั้งหมด
                                                            </button>
                                                        </Tooltip>

                                                        {/* Undo/Redo buttons */}
                                                        <div className="h-6 w-px bg-gray-500"></div>
                                                        <Tooltip content={`Undo (${equipmentHistoryIndex > 0 ? 'มีให้ย้อนกลับ' : 'ไม่มีให้ย้อนกลับ'})`}>
                                                            <button
                                                                onClick={undoEquipment}
                                                                disabled={equipmentHistoryIndex <= 0}
                                                                className={`rounded px-3 py-1 text-xs transition-colors ${
                                                                    equipmentHistoryIndex > 0
                                                                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                                                                        : 'cursor-not-allowed bg-gray-500 text-gray-300'
                                                                }`}
                                                            >
                                                                ↶ Undo
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip content={`Redo (${equipmentHistoryIndex < equipmentHistory.length - 1 ? 'มีให้ทำซ้ำ' : 'ไม่มีให้ทำซ้ำ'})`}>
                                                            <button
                                                                onClick={redoEquipment}
                                                                disabled={equipmentHistoryIndex >= equipmentHistory.length - 1}
                                                                className={`rounded px-3 py-1 text-xs transition-colors ${
                                                                    equipmentHistoryIndex < equipmentHistory.length - 1
                                                                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                                                                        : 'cursor-not-allowed bg-gray-500 text-gray-300'
                                                                }`}
                                                            >
                                                                ↷ Redo
                                                            </button>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                <span className="text-xs text-gray-400">Zoom: {mapZoom}</span>
                                                <div className="flex space-x-1">
                                                    <button
                                                        onClick={() => {
                                                            const newZoom = Math.max(mapZoom - 1, 3);
                                                            setMapZoom(newZoom);
                                                            if (map) map.setZoom(newZoom);
                                                        }}
                                                        className="rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-500"
                                                    >
                                                        −
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const newZoom = Math.min(mapZoom + 1, 20);
                                                            setMapZoom(newZoom);
                                                            if (map) map.setZoom(newZoom);
                                                        }}
                                                        className="rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-500"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Plant Selection Modal */}
                {showPlantSelector && selectedZone && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
                        <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-gray-800 p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-white">
                                    🌱 Assign Plant to {selectedZone.name}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowPlantSelector(false);
                                        setSelectedZone(null);
                                    }}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mb-4">
                                <div className="mb-2 flex items-center">
                                    <span
                                        className="mr-2 h-4 w-4 rounded-full border-2 border-white/20"
                                        style={{ backgroundColor: selectedZone.color }}
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
                                                onClick={() => assignPlantToZone(selectedZone.id.toString(), crop.value)}
                                                className={`rounded-lg border-2 p-4 text-left transition-all ${
                                                    zoneAssignments[selectedZone.id] === crop.value
                                                        ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                                                        : 'border-gray-600 bg-gray-700 text-white hover:border-blue-400 hover:bg-blue-500/10'
                                                }`}
                                            >
                                                <div className="flex items-center">
                                                    <span className="mr-3 text-3xl">{crop.icon}</span>
                                                    <div>
                                                        <h4 className="font-semibold">{crop.name}</h4>
                                                        <p className="text-sm opacity-80">{crop.description}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                )}
                            </div>

                            {selectedCropObjects.length === 0 && (
                                <div className="py-8 text-center text-gray-400">
                                    <p>No crops selected. Please go back to the crop selection page to choose crops.</p>
                                </div>
                            )}

                            <div className="mt-6 flex justify-end space-x-3">
                                {zoneAssignments[selectedZone.id] && (
                                    <button
                                        onClick={() => {
                                            removePlantFromZone(selectedZone.id.toString());
                                            setShowPlantSelector(false);
                                            setSelectedZone(null);
                                        }}
                                        className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                                    >
                                        Remove Plant
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowPlantSelector(false);
                                        setSelectedZone(null);
                                    }}
                                    className="rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
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
};