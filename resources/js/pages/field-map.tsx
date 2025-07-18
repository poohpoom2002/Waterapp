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
    raw?: unknown;
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
    config: unknown;
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
    zones?: unknown[];
    pipes?: unknown[];
    obstacles?: unknown[];
    equipmentIcons?: unknown[];
    mainField?: unknown;
    onMapClick?: (e: google.maps.MapMouseEvent) => void;
    onZoneClick?: (zone: unknown) => void;
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
    onZoomChanged
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map>();
    const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager>();
    const [currentDrawingMode, setCurrentDrawingMode] = useState<google.maps.drawing.OverlayType | null>(null);
    
    // Track internal vs external changes to prevent infinite loops
    const lastExternalCenter = useRef<google.maps.LatLngLiteral>(center);
    const lastExternalZoom = useRef<number>(zoom);
    const isInternalChange = useRef(false);

    // Initialize map once
    useEffect(() => {
        if (ref.current && !map && window.google) {
            console.log('Initializing Google Map...');
            
            const newMap = new google.maps.Map(ref.current, {
                center,
                zoom,
                mapTypeId: mapType as google.maps.MapTypeId,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: false,
                gestureHandling: 'greedy',
            });

            // Initialize Drawing Manager with default options
            const drawingMgr = new google.maps.drawing.DrawingManager({
                drawingMode: null,
                drawingControl: false,
                polygonOptions: {
                    fillColor: '#22C55E', // Default field color
                    fillOpacity: 0.3,
                    strokeColor: '#22C55E',
                    strokeWeight: 2,
                    clickable: true,
                    editable: false,
                    zIndex: 1
                },
                polylineOptions: {
                    strokeColor: '#3388ff',
                    strokeWeight: 4,
                    clickable: true,
                    editable: false,
                    zIndex: 1
                }
            });

            drawingMgr.setMap(newMap);

            // Add drawing event listeners
            google.maps.event.addListener(drawingMgr, 'overlaycomplete', (event: google.maps.drawing.OverlayCompleteEvent) => {
                const overlay = event.overlay;
                const type = event.type;
                
                console.log('Drawing completed:', { type, drawingStage, drawingMode });
                
                // Stop drawing after completion
                drawingMgr.setDrawingMode(null);
                setCurrentDrawingMode(null);
                
                onDrawCreated(overlay, type);
            });

            // Track user-initiated zoom/center changes
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
                            lng: newCenter.lng()
                        };
                        lastExternalCenter.current = centerObj;
                        onCenterChanged(centerObj);
                    }
                }
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
    }, [ref.current]);

    // Update center and zoom only when externally changed (not from user interaction)
    useEffect(() => {
        if (map && (
            Math.abs(center.lat - lastExternalCenter.current.lat) > 0.0001 ||
            Math.abs(center.lng - lastExternalCenter.current.lng) > 0.0001 ||
            Math.abs(zoom - lastExternalZoom.current) > 0.1
        )) {
            console.log('Updating map view externally');
            isInternalChange.current = true;
            
            map.setCenter(center);
            map.setZoom(zoom);
            
            lastExternalCenter.current = center;
            lastExternalZoom.current = zoom;
            
            // Reset flag after a short delay
            setTimeout(() => {
                isInternalChange.current = false;
            }, 100);
        }
    }, [map, center.lat, center.lng, zoom]);

    // Function to get current drawing options based on stage and mode
    const getCurrentDrawingOptions = useCallback(() => {
        if (drawingStage === 'field') {
            return {
                polygonOptions: {
                    fillColor: '#22C55E',
                    fillOpacity: 0.2,
                    strokeColor: '#22C55E',
                    strokeWeight: 3,
                    clickable: true,
                    editable: false,
                    zIndex: 1
                }
            };
        } else if (drawingStage === 'zones' && drawingMode === 'zone') {
            return {
                polygonOptions: {
                    fillColor: currentZoneColor,
                    fillOpacity: 0.3,
                    strokeColor: currentZoneColor,
                    strokeWeight: 2,
                    clickable: true,
                    editable: false,
                    zIndex: 1
                }
            };
        } else if (drawingStage === 'zones' && drawingMode === 'obstacle') {
            const obstacleConfig = OBSTACLE_TYPES[currentObstacleType as keyof typeof OBSTACLE_TYPES];
            return {
                polygonOptions: {
                    fillColor: obstacleConfig?.color || '#ff0000',
                    fillOpacity: 0.4,
                    strokeColor: obstacleConfig?.color || '#ff0000',
                    strokeWeight: 2,
                    clickable: true,
                    editable: false,
                    zIndex: 2
                }
            };
        } else if (drawingStage === 'pipes') {
            const pipeConfig = PIPE_TYPES[currentPipeType as keyof typeof PIPE_TYPES];
            return {
                polylineOptions: {
                    strokeColor: pipeConfig?.color || '#3388ff',
                    strokeWeight: pipeConfig?.weight || 4,
                    strokeOpacity: pipeConfig?.opacity || 1,
                    clickable: true,
                    editable: false,
                    zIndex: 1
                }
            };
        }
        return {};
    }, [drawingStage, drawingMode, currentZoneColor, currentObstacleType, currentPipeType]);

    // Function to recreate drawing manager with current options (Google Maps best practice)
    const recreateDrawingManager = useCallback(() => {
        if (!map || !drawingManager) return null;

        // Remove old drawing manager
        drawingManager.setMap(null);

        // Create new drawing manager with current options
        const newDrawingMgr = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false,
            ...getCurrentDrawingOptions()
        });

        newDrawingMgr.setMap(map);

        // Re-add event listeners
        google.maps.event.addListener(newDrawingMgr, 'overlaycomplete', (event: google.maps.drawing.OverlayCompleteEvent) => {
            const overlay = event.overlay;
            const type = event.type;
            
            console.log('Drawing completed:', { type, drawingStage, drawingMode });
            
            // Stop drawing after completion
            newDrawingMgr.setDrawingMode(null);
            setCurrentDrawingMode(null);
            
            onDrawCreated(overlay, type);
        });

        setDrawingManager(newDrawingMgr);
        return newDrawingMgr;
    }, [map, drawingManager, getCurrentDrawingOptions, drawingStage, drawingMode, onDrawCreated]);

    // Function to start drawing
    const startDrawing = useCallback((type: 'polygon' | 'polyline') => {
        console.log('Starting drawing:', { type, drawingStage, drawingMode, currentZoneColor, currentObstacleType });
        
        // Recreate drawing manager with current options to ensure they are applied
        const currentDrawingMgr = recreateDrawingManager();
        
        if (!currentDrawingMgr) {
            console.warn('Drawing manager not ready');
            return;
        }

        const mode = type === 'polygon' ? 
            google.maps.drawing.OverlayType.POLYGON : 
            google.maps.drawing.OverlayType.POLYLINE;
        
        // Small delay to ensure options are applied
        setTimeout(() => {
            currentDrawingMgr.setDrawingMode(mode);
            setCurrentDrawingMode(mode);
            console.log('Drawing mode set to:', mode);
        }, 50);
        
    }, [drawingStage, drawingMode, currentZoneColor, currentObstacleType, currentPipeType, recreateDrawingManager]);

    // Function to stop drawing
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

    // Stop drawing when drawing mode changes
    useEffect(() => {
        if (drawingManager && currentDrawingMode) {
            // Stop current drawing when mode changes
            stopDrawing();
            console.log('Drawing mode changed, stopping current drawing');
        }
    }, [drawingMode, drawingStage]);

    return (
        <>
            <div ref={ref} style={{ width: '100%', height: '100%' }} />
            
            {/* Drawing Controls Overlay */}
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
        isGeneratingPipes,
        setIsGeneratingPipes,
        snapEnabled,
        setSnapEnabled,
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

    const [plantingPoints, setPlantingPoints] = useState<unknown[]>([]);
    const [zoneSummaries, setZoneSummaries] = useState<Record<string, unknown>>({});

    // Error handling and loading states
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Map instance
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

    // Error handling helper
    const handleError = useCallback((errorMessage: string) => {
        setError(errorMessage);
        console.error(errorMessage);
        setTimeout(() => setError(null), 5000);
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Handle map center/zoom changes from map interaction
    const handleCenterChanged = useCallback((newCenter: google.maps.LatLngLiteral) => {
        setMapCenter([newCenter.lat, newCenter.lng]);
    }, [setMapCenter]);

    const handleZoomChanged = useCallback((newZoom: number) => {
        setMapZoom(newZoom);
    }, [setMapZoom]);

    // Validation functions
    const validateStep = useCallback((step: number): boolean => {
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
    }, [mainField, selectedCropObjects.length, zones.length, zoneAssignments, pipes.length, irrigationAssignments]);

    const goToStep = useCallback((step: number) => {
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

        // Reset drawing capabilities for new step
        if (step === 2) {
            setCanDrawZone(zones.length < ZONE_COLORS.length);
            setDrawingMode('zone');
        } else if (step === 3) {
            setCanDrawPipe(true);
        }
    }, [currentStep, validateStep, setCurrentStep, setDrawingStage, zones.length, setCanDrawZone, setDrawingMode, setCanDrawPipe, handleError]);

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

    // Convert Google Maps path to coordinates array
    const pathToCoordinates = useCallback((path: google.maps.MVCArray<google.maps.LatLng>): Array<{ lat: number; lng: number }> => {
        const coordinates: Array<{ lat: number; lng: number }> = [];
        for (let i = 0; i < path.getLength(); i++) {
            const latLng = path.getAt(i);
            coordinates.push({ lat: latLng.lat(), lng: latLng.lng() });
        }
        return coordinates;
    }, []);

    // Handle drawing created with improved error handling and state management
    const handleDrawCreated = useCallback((overlay: google.maps.MVCObject, type: string) => {
        console.log('Drawing created:', { type, drawingStage, drawingMode });
        
        try {
            if (type === 'polygon') {
                const polygon = overlay as google.maps.Polygon;
                const path = polygon.getPath();
                const coordinates = pathToCoordinates(path);

                if (drawingStage === 'field') {
                    console.log('Creating field...');
                    try {
                        // Calculate area using turf
                        const polygonCoords = coordinates.map((coord: Coordinate) => [coord.lng, coord.lat]);
                        const firstPoint = polygonCoords[0];
                        const lastPoint = polygonCoords[polygonCoords.length - 1];

                        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
                            polygonCoords.push(firstPoint);
                        }

                        const turfPolygon = turf.polygon([polygonCoords]);
                        const area = turf.area(turfPolygon);

                        // Set polygon style
                        polygon.setOptions({
                            fillColor: '#22C55E',
                            fillOpacity: 0.2,
                            strokeColor: '#22C55E',
                            strokeWeight: 3,
                            clickable: true,
                            editable: false,
                            zIndex: 1
                        });

                        setMainField({
                            polygon: polygon,
                            coordinates: coordinates,
                            area: area,
                        });

                        setFieldAreaSize(area);
                        setMapObjects(prev => ({ ...prev, zones: [...prev.zones, polygon] }));
                        console.log('Field created successfully with area:', area);
                    } catch (error) {
                        console.error('Field creation error:', error);
                        handleError('Error calculating field area');
                        polygon.setMap(null); // Remove failed polygon
                        return;
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
                            editable: false,
                            zIndex: 1
                        });

                        // Add click listener
                        polygon.addListener('click', () => {
                            setSelectedZone(newZone);
                            setShowPlantSelector(true);
                        });

                        setZones((prev) => {
                            const updatedZones = [...prev, newZone];
                            console.log('Zones updated:', updatedZones.length);
                            return updatedZones;
                        });
                        setUsedColors((prev) => [...prev, currentZoneColor]);

                        // Find next available color
                        const newUsedColors = [...usedColors, currentZoneColor];
                        const availableColors = ZONE_COLORS.filter((color) => 
                            !newUsedColors.includes(color)
                        );
                        
                        if (availableColors.length > 0) {
                            setCurrentZoneColor(availableColors[0]);
                        } else {
                            setCanDrawZone(false);
                        }

                        setMapObjects(prev => ({ ...prev, zones: [...prev.zones, polygon] }));

                    } else if (drawingMode === 'obstacle') {
                        console.log('Creating obstacle of type:', currentObstacleType);
                        
                        const obstacleConfig = OBSTACLE_TYPES[currentObstacleType as keyof typeof OBSTACLE_TYPES];
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

                        // Set obstacle style
                        polygon.setOptions({
                            fillColor: obstacleConfig.color,
                            fillOpacity: 0.4,
                            strokeColor: obstacleConfig.color,
                            strokeWeight: 2,
                            clickable: true,
                            editable: false,
                            zIndex: 2
                        });

                        setObstacles((prev) => {
                            const updatedObstacles = [...prev, newObstacle];
                            console.log('Obstacles updated:', updatedObstacles.length);
                            return updatedObstacles;
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

                    // Set pipe style
                    polyline.setOptions({
                        strokeColor: pipeConfig.color,
                        strokeWeight: pipeConfig.weight || 4,
                        strokeOpacity: pipeConfig.opacity || 1,
                        clickable: true,
                        editable: false,
                        zIndex: 1
                    });

                    setPipes((prev) => [...prev, newPipe]);
                    setMapObjects(prev => ({ ...prev, pipes: [...prev.pipes, polyline] }));
                }
            }
        } catch (error) {
            console.error('Error in handleDrawCreated:', error);
            handleError('เกิดข้อผิดพลาดในการวาด กรุณาลองใหม่');
            
            // Clean up failed overlay
            if (overlay && 'setMap' in overlay && typeof overlay.setMap === 'function') {
                overlay.setMap(null);
            }
        }
    }, [drawingStage, drawingMode, canDrawZone, canDrawPipe, currentZoneColor, currentObstacleType, currentPipeType, zones, obstacles, pipes, usedColors, pathToCoordinates, setMainField, setFieldAreaSize, setZones, setUsedColors, setCurrentZoneColor, setCanDrawZone, setObstacles, setPipes, setMapObjects, setSelectedZone, setShowPlantSelector, handleError]);

    // Clear all Google Maps objects
    const clearAllMapObjects = useCallback(() => {
        Object.values(mapObjects).flat().forEach((obj: any) => {
            if (obj && typeof obj.setMap === 'function') {
                obj.setMap(null);
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
        });
    }, [mapObjects, setMapObjects]);

    const resetAll = useCallback(() => {
        if (confirm('⚠️ คุณต้องการรีเซ็ตทั้งหมดหรือไม่? ข้อมูลที่วาดไว้จะหายทั้งหมด')) {
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
            setError(null);
        }
    }, [clearAllMapObjects, setMainField, setZones, setObstacles, setZoneAssignments, setPipes, setUsedColors, setCanDrawZone, setCanDrawPipe, setCurrentZoneColor, setCurrentPipeType, setDrawingMode, setCurrentStep, setStepCompleted, setDrawingStage, setFieldAreaSize, setEquipmentIcons, setSelectedEquipmentType, setIsPlacingEquipment, setEquipmentHistory, setEquipmentHistoryIndex, setIrrigationAssignments, setIrrigationPoints, setIrrigationLines, setIrrigationSettings, setIrrigationRadius, setSprinklerOverlap, setZoneSummaries, setPlantingPoints]);

    // Auto-update zone configuration based on step changes
    useEffect(() => {
        if (currentStep === 2 && zones.length === 0) {
            setCanDrawZone(true);
            setUsedColors([]);
            setCurrentZoneColor(ZONE_COLORS[0]);
            setDrawingMode('zone');
        } else if (currentStep === 3 && pipes.length === 0) {
            setCanDrawPipe(true);
            setCurrentPipeType('main');
        }
    }, [currentStep, zones.length, pipes.length, setCanDrawZone, setUsedColors, setCurrentZoneColor, setDrawingMode, setCanDrawPipe, setCurrentPipeType]);

    // Equipment functions
    const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (isPlacingEquipment && selectedEquipmentType && e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            placeEquipmentAtPosition(lat, lng);
        }
    }, [isPlacingEquipment, selectedEquipmentType]);

    const startPlacingEquipment = useCallback((equipmentType: EquipmentType) => {
        setSelectedEquipmentType(equipmentType);
        setIsPlacingEquipment(true);

        if (map) {
            map.setOptions({ draggableCursor: 'crosshair' });
        }
    }, [map, setSelectedEquipmentType, setIsPlacingEquipment]);

    const cancelPlacingEquipment = useCallback(() => {
        setIsPlacingEquipment(false);
        setSelectedEquipmentType(null);

        if (map) {
            map.setOptions({ draggableCursor: null });
        }
    }, [map, setIsPlacingEquipment, setSelectedEquipmentType]);

    const placeEquipmentAtPosition = useCallback((lat: number, lng: number) => {
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

            (newEquipment as Equipment).marker = marker;

            const newEquipmentState = [...equipmentIcons, newEquipment];
            setEquipmentIcons(newEquipmentState);
            setMapObjects(prev => ({
                ...prev,
                equipment: [...prev.equipment, marker]
            }));
            
            cancelPlacingEquipment();
        } catch (error) {
            console.error('Error placing equipment:', error);
            handleError('เกิดข้อผิดพลาดในการวางอุปกรณ์');
        }
    }, [selectedEquipmentType, map, equipmentIcons, setEquipmentIcons, setMapObjects, cancelPlacingEquipment, handleError]);

    // Clear all equipment
    const clearAllEquipment = useCallback(() => {
        if (equipmentIcons.length === 0) return;
        
        if (confirm('ต้องการลบอุปกรณ์ทั้งหมดหรือไม่?')) {
            // Remove all markers from map
            mapObjects.equipment.forEach(marker => marker.setMap(null));
            
            // Clear state
            setEquipmentIcons([]);
            setMapObjects(prev => ({ ...prev, equipment: [] }));
            
            console.log('All equipment cleared');
        }
    }, [equipmentIcons, mapObjects.equipment, setEquipmentIcons, setMapObjects]);

    // Undo equipment placement
    const undoEquipment = useCallback(() => {
        if (equipmentHistoryIndex > 0) {
            const newIndex = equipmentHistoryIndex - 1;
            const restoredEquipment = equipmentHistory[newIndex];
            
            // Clear current equipment from map
            mapObjects.equipment.forEach(marker => marker.setMap(null));
            
            // Restore equipment from history
            const newMarkers: google.maps.Marker[] = [];
            restoredEquipment.forEach((equipment: Equipment) => {
                if (map && equipment.lat && equipment.lng) {
                    // Recreate marker
                    const marker = new google.maps.Marker({
                        position: { lat: equipment.lat, lng: equipment.lng },
                        map: map,
                        title: equipment.name,
                        icon: equipment.marker?.getIcon()
                    });
                    
                    newMarkers.push(marker);
                    equipment.marker = marker;
                }
            });
            
            setEquipmentIcons([...restoredEquipment]);
            setEquipmentHistoryIndex(newIndex);
            setMapObjects(prev => ({ ...prev, equipment: newMarkers }));
            
            console.log('Equipment undone to index:', newIndex);
        }
    }, [equipmentHistory, equipmentHistoryIndex, mapObjects.equipment, map, setEquipmentIcons, setEquipmentHistoryIndex, setMapObjects]);

    // Redo equipment placement
    const redoEquipment = useCallback(() => {
        if (equipmentHistoryIndex < equipmentHistory.length - 1) {
            const newIndex = equipmentHistoryIndex + 1;
            const restoredEquipment = equipmentHistory[newIndex];
            
            // Clear current equipment from map
            mapObjects.equipment.forEach(marker => marker.setMap(null));
            
            // Restore equipment from history
            const newMarkers: google.maps.Marker[] = [];
            restoredEquipment.forEach((equipment: Equipment) => {
                if (map && equipment.lat && equipment.lng) {
                    // Recreate marker
                    const marker = new google.maps.Marker({
                        position: { lat: equipment.lat, lng: equipment.lng },
                        map: map,
                        title: equipment.name,
                        icon: equipment.marker?.getIcon()
                    });
                    
                    newMarkers.push(marker);
                    equipment.marker = marker;
                }
            });
            
            setEquipmentIcons([...restoredEquipment]);
            setEquipmentHistoryIndex(newIndex);
            setMapObjects(prev => ({ ...prev, equipment: newMarkers }));
            
            console.log('Equipment redone to index:', newIndex);
        }
    }, [equipmentHistory, equipmentHistoryIndex, mapObjects.equipment, map, setEquipmentIcons, setEquipmentHistoryIndex, setMapObjects]);

    // Make removeEquipment available globally for InfoWindow buttons
    useEffect(() => {
        (window as any).removeEquipment = (equipmentId: string) => {
            const equipmentToRemove = equipmentIcons.find((e) => e.id === equipmentId);
            if (!equipmentToRemove) return;

            const equipmentConfig = EQUIPMENT_TYPES[equipmentToRemove.type];

            if (confirm(`ต้องการลบ ${equipmentConfig.name} หรือไม่?`)) {
                const newEquipmentState = equipmentIcons.filter((e) => e.id !== equipmentId);
                setEquipmentIcons(newEquipmentState);

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
    }, [equipmentIcons, setEquipmentIcons, setMapObjects]);

    // Google Places search functionality
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
                handleError('ไม่สามารถค้นหาสถานที่ได้');
            }
        }
    }, [map, setSearchResults, setShowDropdown, setIsSearching, handleError]);

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

    // Navigate to search result
    const goToLocation = useCallback((result: SearchResult) => {
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
        }

        // Clear dropdown immediately
        setShowDropdown(false);
        setSearchResults([]);
        
        setMapCenter([result.y, result.x]);
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
            map.setCenter({ lat: result.y, lng: result.x });
            map.setZoom(16);
        }
    }, [blurTimeoutRef, setShowDropdown, setSearchResults, setMapCenter, setMapZoom, setIsLocationSelected, setSearchQuery, map]);

    // Clear search dropdown
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
    }, [blurTimeoutRef, setSearchQuery, setSearchResults, setIsLocationSelected, setShowDropdown, setIsSearching]);

    // Get current location
    const getCurrentLocation = useCallback(() => {
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
    }, [setMapCenter, setMapZoom, handleError]);

    // Zone management functions
    const addNewZone = useCallback(() => {
        if (zones.length >= ZONE_COLORS.length) {
            handleError('Maximum number of zones reached');
            return;
        }
        
        const availableColors = ZONE_COLORS.filter(color => !usedColors.includes(color));
        if (availableColors.length > 0) {
            setCurrentZoneColor(availableColors[0]);
            setCanDrawZone(true);
            setDrawingMode('zone');
        }
    }, [zones.length, usedColors, setCurrentZoneColor, setCanDrawZone, setDrawingMode, handleError]);

    const assignPlantToZone = useCallback((zoneId: string, cropValue: string) => {
        setZoneAssignments(prev => ({
            ...prev,
            [zoneId]: cropValue
        }));
        setShowPlantSelector(false);
        setSelectedZone(null);
    }, [setZoneAssignments, setShowPlantSelector, setSelectedZone]);

    const removePlantFromZone = useCallback((zoneId: string) => {
        setZoneAssignments(prev => {
            const newAssignments = { ...prev };
            delete newAssignments[zoneId];
            return newAssignments;
        });
    }, [setZoneAssignments]);

    const deleteZone = useCallback((zoneId: string) => {
        const zoneToDelete = zones.find(zone => zone.id.toString() === zoneId);
        if (!zoneToDelete) return;

        if (confirm(`ต้องการลบ ${zoneToDelete.name} หรือไม่?`)) {
            // Remove from map
            if (zoneToDelete.polygon) {
                zoneToDelete.polygon.setMap(null);
            }

            // Remove from state
            setZones(prev => prev.filter(zone => zone.id.toString() !== zoneId));
            setZoneAssignments(prev => {
                const newAssignments = { ...prev };
                delete newAssignments[zoneId];
                return newAssignments;
            });

            // Update used colors
            setUsedColors(prev => prev.filter(color => color !== zoneToDelete.color));
        }
    }, [zones, setZones, setZoneAssignments, setUsedColors]);

    // Generate lateral pipes for all zones
    const generateLateralPipes = useCallback(() => {
        if (zones.length === 0) {
            handleError('No zones found to generate pipes for');
            return;
        }

        setIsGeneratingPipes(true);
        
        try {
            zones.forEach(zone => {
                generateLateralPipesForZone(zone);
            });
            console.log('Generated lateral pipes for all zones');
        } catch (error) {
            console.error('Error generating lateral pipes:', error);
            handleError('Error generating lateral pipes');
        } finally {
            setIsGeneratingPipes(false);
        }
    }, [zones, setIsGeneratingPipes, handleError]);

    // Generate lateral pipes for a specific zone
    const generateLateralPipesForZone = useCallback((zone: Zone) => {
        if (!zone || !zone.coordinates || !map) return;

        try {
            // Calculate zone bounds
            const bounds = new google.maps.LatLngBounds();
            zone.coordinates.forEach((coord: Coordinate) => {
                bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
            });

            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();

            // Generate lateral pipes in a grid pattern
            const spacing = 0.0001; // Adjust spacing as needed
            const lateralPipes: unknown[] = [];

            // Generate horizontal laterals
            for (let lat = sw.lat(); lat <= ne.lat(); lat += spacing) {
                const startPoint = { lat: lat, lng: sw.lng() };
                const endPoint = { lat: lat, lng: ne.lng() };
                
                const pipeId = Date.now() + Math.random();
                const lateralPipe = {
                    id: pipeId,
                    coordinates: [startPoint, endPoint],
                    type: 'lateral',
                    name: `Lateral Pipe ${lateralPipes.length + 1}`,
                    color: PIPE_TYPES.lateral?.color || '#00ff00',
                    zoneId: zone.id
                };

                // Create polyline on map
                const polyline = new google.maps.Polyline({
                    path: [startPoint, endPoint],
                    strokeColor: lateralPipe.color,
                    strokeWeight: 2,
                    strokeOpacity: 0.8,
                    map: map
                });

                (lateralPipe as LateralPipe).polyline = polyline;
                lateralPipes.push(lateralPipe as LateralPipe);
            }

            // Add to pipes state
            setPipes(prev => [...prev, ...lateralPipes]);
            setMapObjects(prev => ({
                ...prev,
                pipes: [...prev.pipes, ...lateralPipes.map((p: any) => p.polyline).filter((polyline): polyline is google.maps.Polyline => polyline !== undefined)]
            }));

            console.log(`Generated ${lateralPipes.length} lateral pipes for zone ${zone.name}`);
        } catch (error) {
            console.error('Error generating lateral pipes for zone:', error);
            handleError(`Error generating pipes for ${zone.name}`);
        }
    }, [map, setPipes, setMapObjects, handleError]);

    // Clear all lateral pipes
    const clearLateralPipes = useCallback(() => {
        const lateralPipes = pipes.filter(pipe => pipe.type === 'lateral');
        
        if (lateralPipes.length === 0) {
            handleError('No lateral pipes to clear');
            return;
        }

        if (confirm(`ต้องการลบท่อน้ำแบบ Lateral ทั้งหมด ${lateralPipes.length} เส้นหรือไม่?`)) {
            // Remove lateral pipes from map
            lateralPipes.forEach(pipe => {
                if (pipe.polyline) {
                    pipe.polyline.setMap(null);
                }
            });

            // Remove from state
            setPipes(prev => prev.filter(pipe => pipe.type !== 'lateral'));
            setMapObjects(prev => ({
                ...prev,
                pipes: prev.pipes.filter(polyline => {
                    return !lateralPipes.some(pipe => pipe.polyline === polyline);
                })
            }));

            console.log('Cleared all lateral pipes');
        }
    }, [pipes, setPipes, setMapObjects, handleError]);

    // Generate irrigation for a specific zone
    const generateIrrigationForZone = useCallback((zone: Zone, irrigationType: string) => {
        if (!zone || !zone.coordinates || !map) return;

        try {
            const zoneId = zone.id.toString();
            const radius = irrigationRadius[zoneId] || 10; // Default 10m radius
            const overlap = sprinklerOverlap[zoneId] || false;

            // Calculate zone bounds
            const bounds = new google.maps.LatLngBounds();
            zone.coordinates.forEach((coord: Coordinate) => {
                bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
            });

            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            
            // Calculate spacing based on radius and overlap
            const spacingMultiplier = overlap ? 0.8 : 1.2;
            const latSpacing = (radius / 111000) * spacingMultiplier; // Convert meters to degrees
            const lngSpacing = (radius / (111000 * Math.cos(sw.lat() * Math.PI / 180))) * spacingMultiplier;

            const newIrrigationPoints: unknown[] = [];
            const newIrrigationCircles: google.maps.Circle[] = [];

            // Generate irrigation points in a grid pattern
            for (let lat = sw.lat(); lat <= ne.lat(); lat += latSpacing) {
                for (let lng = sw.lng(); lng <= ne.lng(); lng += lngSpacing) {
                    const point = new google.maps.LatLng(lat, lng);
                    
                    // Check if point is inside the zone polygon
                    if (google.maps.geometry.poly.containsLocation(point, zone.polygon)) {
                        const irrigationPoint = {
                            id: Date.now() + Math.random(),
                            lat: lat,
                            lng: lng,
                            type: irrigationType,
                            radius: radius,
                            zoneId: zone.id
                        };

                        // Create marker for irrigation point
                        const marker = new google.maps.Marker({
                            position: point,
                            map: map,
                            title: `${irrigationType} - ${zone.name}`,
                            icon: {
                                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                    <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="10" cy="10" r="8" fill="blue" stroke="white" stroke-width="2"/>
                                        <text x="10" y="14" text-anchor="middle" fill="white" font-size="12">💧</text>
                                    </svg>
                                `),
                                scaledSize: new google.maps.Size(20, 20),
                                anchor: new google.maps.Point(10, 10)
                            }
                        });

                        // Create coverage circle
                        const circle = new google.maps.Circle({
                            center: point,
                            radius: radius,
                            map: map,
                            fillColor: '#0099ff',
                            fillOpacity: 0.1,
                            strokeColor: '#0099ff',
                            strokeWeight: 1,
                            strokeOpacity: 0.3
                        });

                        (irrigationPoint as any).marker = marker;
                        (irrigationPoint as any).circle = circle;
                        
                        newIrrigationPoints.push(irrigationPoint);
                        newIrrigationCircles.push(circle);
                    }
                }
            }

            // Update state
            setIrrigationPoints(prev => [...prev, ...newIrrigationPoints]);
            setMapObjects(prev => ({
                ...prev,
                irrigation: [...prev.irrigation, ...newIrrigationPoints.map((p: any) => p.marker).filter((marker): marker is google.maps.Marker => marker !== undefined)],
                irrigationCircles: [...prev.irrigationCircles, ...newIrrigationCircles]
            }));

            // Update irrigation assignments
            setIrrigationAssignments(prev => ({
                ...prev,
                [zoneId]: irrigationType
            }));

            console.log(`Generated ${newIrrigationPoints.length} ${irrigationType} points for zone ${zone.name}`);
        } catch (error) {
            console.error('Error generating irrigation for zone:', error);
            handleError(`Error generating ${irrigationType} for ${zone.name}`);
        }
    }, [map, irrigationRadius, sprinklerOverlap, setIrrigationPoints, setMapObjects, setIrrigationAssignments, handleError]);

    // Clear irrigation for a specific zone
    const clearIrrigationForZone = useCallback((zoneId: string) => {
        const zoneIrrigationPoints = irrigationPoints.filter(point => point.zoneId.toString() === zoneId);
        
        if (zoneIrrigationPoints.length === 0) {
            handleError('No irrigation points found for this zone');
            return;
        }

        const zone = zones.find(z => z.id.toString() === zoneId);
        const zoneName = zone?.name || `Zone ${zoneId}`;

        if (confirm(`ต้องการลบระบบน้ำของ ${zoneName} ทั้งหมด ${zoneIrrigationPoints.length} จุดหรือไม่?`)) {
            // Remove markers and circles from map
            zoneIrrigationPoints.forEach(point => {
                if (point.marker) point.marker.setMap(null);
                if (point.circle) point.circle.setMap(null);
            });

            // Remove from state
            setIrrigationPoints(prev => prev.filter(point => point.zoneId.toString() !== zoneId));
            setMapObjects(prev => ({
                ...prev,
                irrigation: prev.irrigation.filter(marker => {
                    return !zoneIrrigationPoints.some(point => point.marker === marker);
                }),
                irrigationCircles: prev.irrigationCircles.filter(circle => {
                    return !zoneIrrigationPoints.some(point => point.circle === circle);
                })
            }));

            // Remove irrigation assignment
            setIrrigationAssignments(prev => {
                const newAssignments = { ...prev };
                delete newAssignments[zoneId];
                return newAssignments;
            });

            console.log(`Cleared irrigation for zone ${zoneName}`);
        }
    }, [irrigationPoints, zones, setIrrigationPoints, setMapObjects, setIrrigationAssignments, handleError]);

    // Handle row spacing confirmation
    const handleRowSpacingConfirm = useCallback((cropValue: string) => {
        const tempValue = tempRowSpacing[cropValue];
        if (tempValue && !isNaN(parseFloat(tempValue))) {
            setRowSpacing(prev => ({
                ...prev,
                [cropValue]: parseFloat(tempValue)
            }));
            setEditingRowSpacingForCrop(null);
            setTempRowSpacing(prev => {
                const updated = { ...prev };
                delete updated[cropValue];
                return updated;
            });
            console.log(`Row spacing for ${cropValue} set to ${tempValue}m`);
        } else {
            handleError('Please enter a valid row spacing value');
        }
    }, [tempRowSpacing, setRowSpacing, setEditingRowSpacingForCrop, setTempRowSpacing, handleError]);

    // Handle row spacing cancellation
    const handleRowSpacingCancel = useCallback((cropValue: string) => {
        setEditingRowSpacingForCrop(null);
        setTempRowSpacing(prev => {
            const updated = { ...prev };
            delete updated[cropValue];
            return updated;
        });
        console.log(`Row spacing edit cancelled for ${cropValue}`);
    }, [setEditingRowSpacingForCrop, setTempRowSpacing]);

    // Handle plant spacing confirmation
    const handlePlantSpacingConfirm = useCallback((cropValue: string) => {
        const tempValue = tempPlantSpacing[cropValue];
        if (tempValue && !isNaN(parseFloat(tempValue))) {
            setPlantSpacing(prev => ({
                ...prev,
                [cropValue]: parseFloat(tempValue)
            }));
            setEditingPlantSpacingForCrop(null);
            setTempPlantSpacing(prev => {
                const updated = { ...prev };
                delete updated[cropValue];
                return updated;
            });
            console.log(`Plant spacing for ${cropValue} set to ${tempValue}m`);
        } else {
            handleError('Please enter a valid plant spacing value');
        }
    }, [tempPlantSpacing, setPlantSpacing, setEditingPlantSpacingForCrop, setTempPlantSpacing, handleError]);

    // Handle plant spacing cancellation
    const handlePlantSpacingCancel = useCallback((cropValue: string) => {
        setEditingPlantSpacingForCrop(null);
        setTempPlantSpacing(prev => {
            const updated = { ...prev };
            delete updated[cropValue];
            return updated;
        });
        console.log(`Plant spacing edit cancelled for ${cropValue}`);
    }, [setEditingPlantSpacingForCrop, setTempPlantSpacing]);

    // Handle capture map and summary
    const handleCaptureMapAndSummary = useCallback(() => {
        if (!map) {
            handleError('Map is not ready for capture');
            return;
        }

        try {
            // Calculate summary data
            const totalZones = zones.length;
            const assignedZones = Object.keys(zoneAssignments).length;
            const totalPipes = pipes.length;
            const totalEquipment = equipmentIcons.length;
            const totalIrrigationPoints = irrigationPoints.length;

            const summary = {
                fieldArea: fieldAreaSize,
                totalZones,
                assignedZones,
                unassignedZones: totalZones - assignedZones,
                totalPipes,
                totalEquipment,
                totalIrrigationPoints,
                completionPercentage: Math.round((assignedZones / Math.max(totalZones, 1)) * 100),
                zones: zones.map(zone => ({
                    name: zone.name,
                    color: zone.color,
                    assignedCrop: zoneAssignments[zone.id] ? getCropByValue(zoneAssignments[zone.id])?.name : 'Unassigned',
                    irrigationType: irrigationAssignments[zone.id] || 'Not set'
                })),
                pipes: pipes.map(pipe => ({
                    name: pipe.name,
                    type: pipe.type,
                    color: pipe.color
                })),
                equipment: equipmentIcons.map(eq => ({
                    name: eq.name,
                    type: eq.type,
                    position: { lat: eq.lat, lng: eq.lng }
                }))
            };

            // Update zone summaries
            setZoneSummaries(summary);

            // Log summary
            console.log('Map and summary captured:', summary);

            // You could also implement map screenshot functionality here
            // For example, using html2canvas or similar library

            // Show success message
            alert('Map summary captured successfully! Check the console for details.');

        } catch (error) {
            console.error('Error capturing map and summary:', error);
            handleError('Failed to capture map summary');
        }
    }, [map, zones, zoneAssignments, pipes, equipmentIcons, irrigationPoints, irrigationAssignments, fieldAreaSize, setZoneSummaries, handleError]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
            }
        };
    }, [blurTimeoutRef]);

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

                                        {/* Tools Panel */}
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
                                                    { id: 'hybrid', name: '🔄 Hybrid' }
                                                ].map(type => (
                                                    <button
                                                        key={type.id}
                                                        onClick={() => setMapType(type.id as "street" | "satellite" | "hybrid")}
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
                                                if (status === Status.LOADING) {
                                                    return (
                                                        <div className="flex h-full items-center justify-center">
                                                            <LoadingSpinner size="lg" color="blue" text="Loading Map..." />
                                                        </div>
                                                    );
                                                }
                                                if (status === Status.FAILURE) {
                                                    return (
                                                        <div className="flex h-full items-center justify-center">
                                                            <div className="text-center text-red-400">
                                                                <p>Error loading Google Maps</p>
                                                                <p className="text-sm">Please check your API key</p>
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
                                                zones={zones}
                                                pipes={pipes}
                                                obstacles={obstacles}
                                                equipmentIcons={equipmentIcons}
                                                mainField={mainField}
                                                onMapClick={handleMapClick}
                                                onZoneClick={(zone) => {
                                                    setSelectedZone(zone);
                                                    setShowPlantSelector(true);
                                                }}
                                                mapType={mapType}
                                                onCenterChanged={handleCenterChanged}
                                                onZoomChanged={handleZoomChanged}
                                            />
                                        </Wrapper>

                                        {/* Location Search Overlay - Top Right */}
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

                                        {/* Map Controls - Bottom Left */}
                                        <div className="absolute bottom-3 left-20 z-10 flex space-x-2">
                                            <Tooltip content="Center map view">
                                                <button
                                                    onClick={() => {
                                                        setMapCenter([14.5995, 120.9842]);
                                                        setMapZoom(13);
                                                    }}
                                                    className="rounded bg-white px-3 py-2 text-sm text-gray-700 shadow-md transition-colors hover:bg-gray-50"
                                                >
                                                    📍
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Get your current location">
                                                <button
                                                    onClick={getCurrentLocation}
                                                    className="rounded bg-white px-3 py-2 text-sm text-gray-700 shadow-md transition-colors hover:bg-gray-50"
                                                >
                                                    🎯
                                                </button>
                                            </Tooltip>
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
