import { useState, useRef } from 'react';
import {
    DEFAULT_MAP_CENTER,
    DEFAULT_MAP_ZOOM,
    DEFAULT_SNAP_DISTANCE,
    DEFAULT_PIPE_SNAP_DISTANCE,
    DEFAULT_GRID_SIZE,
    ZONE_COLORS,
    type DrawingStage,
    type DrawingMode,
    type PipeType,
    type MapTileType,
    type EquipmentType,
    type ObstacleType,
} from '@/pages/utils/fieldMapConstants';

// Map State Hook
export const useMapState = () => {
    const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
    const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);
    const [mapType, setMapType] = useState<MapTileType>('hybrid');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLocationSelected, setIsLocationSelected] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const mapRef = useRef<any>(null);
    const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    return {
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
        mapRef,
        blurTimeoutRef,
    };
};

// Step Wizard State Hook
export const useStepWizard = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [stepCompleted, setStepCompleted] = useState<{ [key: number]: boolean }>({});
    const [drawingStage, setDrawingStage] = useState<DrawingStage>('field');

    const validateStep = (
        step: number,
        mainField: any,
        selectedCrops: string[],
        zones: any[],
        zoneAssignments: any,
        pipes: any[],
        irrigationAssignments: any
    ): boolean => {
        switch (step) {
            case 1:
                return mainField !== null && selectedCrops.length > 0;
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

    const nextStep = () => {
        if (currentStep < 4) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const previousStep = () => {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    return {
        currentStep,
        setCurrentStep,
        stepCompleted,
        setStepCompleted,
        drawingStage,
        setDrawingStage,
        validateStep,
        nextStep,
        previousStep,
    };
};

// Field and Zone State Hook
export const useFieldZoneState = () => {
    const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
    const [selectedIrrigationType, setSelectedIrrigationType] = useState<string>('');
    const [mainField, setMainField] = useState<any>(null);
    const [fieldAreaSize, setFieldAreaSize] = useState<number>(0);
    const [zones, setZones] = useState<any[]>([]);
    const [obstacles, setObstacles] = useState<any[]>([]);
    const [currentZoneColor, setCurrentZoneColor] = useState(ZONE_COLORS[0]);
    const [currentObstacleType, setCurrentObstacleType] = useState<ObstacleType>('river');
    const [selectedZone, setSelectedZone] = useState<any>(null);
    const [showPlantSelector, setShowPlantSelector] = useState(false);
    const [zoneAssignments, setZoneAssignments] = useState<{ [key: string]: string }>({});
    const [canDrawZone, setCanDrawZone] = useState(true);
    const [usedColors, setUsedColors] = useState<string[]>([]);
    const [drawingMode, setDrawingMode] = useState<DrawingMode>('zone');

    // Spacing between rows of plants (formerly cropSpacing)
    const [rowSpacing, setRowSpacing] = useState<{ [key: string]: number }>({});
    const [tempRowSpacing, setTempRowSpacing] = useState<{ [key: string]: string }>({});
    const [editingRowSpacingForCrop, setEditingRowSpacingForCrop] = useState<string | null>(null);

    // Spacing between plants in the same row
    const [plantSpacing, setPlantSpacing] = useState<{ [key: string]: number }>({});
    const [tempPlantSpacing, setTempPlantSpacing] = useState<{ [key: string]: string }>({});
    const [editingPlantSpacingForCrop, setEditingPlantSpacingForCrop] = useState<string | null>(
        null
    );

    const featureGroupRef = useRef<any>(null);

    return {
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
        featureGroupRef,
    };
};

// Pipe System State Hook
export const usePipeSystemState = () => {
    const [currentPipeType, setCurrentPipeType] = useState<PipeType>('main');
    const [pipes, setPipes] = useState<any[]>([]);
    const [canDrawPipe, setCanDrawPipe] = useState(true);
    const [pipeSnapEnabled, setPipeSnapEnabled] = useState(true);
    const [pipeSnapDistance, setPipeSnapDistance] = useState(DEFAULT_PIPE_SNAP_DISTANCE);
    const [pipeSnapIndicators, setPipeSnapIndicators] = useState<any[]>([]);
    const [isGeneratingPipes, setIsGeneratingPipes] = useState(false);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [snapDistance, setSnapDistance] = useState(DEFAULT_SNAP_DISTANCE);
    const [snapVisualization, setSnapVisualization] = useState(true);
    const [gridEnabled, setGridEnabled] = useState(false);
    const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);

    return {
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
        pipeSnapIndicators,
        setPipeSnapIndicators,
        isGeneratingPipes,
        setIsGeneratingPipes,
        snapEnabled,
        setSnapEnabled,
        snapDistance,
        setSnapDistance,
        snapVisualization,
        setSnapVisualization,
        gridEnabled,
        setGridEnabled,
        gridSize,
        setGridSize,
    };
};

// Equipment State Hook
export const useEquipmentState = () => {
    const [equipmentIcons, setEquipmentIcons] = useState<any[]>([]);
    const [selectedEquipmentType, setSelectedEquipmentType] = useState<EquipmentType | null>(null);
    const [isPlacingEquipment, setIsPlacingEquipment] = useState(false);
    const [equipmentHistory, setEquipmentHistory] = useState<any[][]>([[]]);
    const [equipmentHistoryIndex, setEquipmentHistoryIndex] = useState(0);

    const saveEquipmentToHistory = (newEquipmentState: any[]) => {
        const newHistory = equipmentHistory.slice(0, equipmentHistoryIndex + 1);
        newHistory.push([...newEquipmentState]);
        setEquipmentHistory(newHistory);
        setEquipmentHistoryIndex(newHistory.length - 1);
    };

    const undoEquipment = () => {
        if (equipmentHistoryIndex > 0) {
            const newIndex = equipmentHistoryIndex - 1;
            const restoredEquipment = equipmentHistory[newIndex];
            setEquipmentIcons([...restoredEquipment]);
            setEquipmentHistoryIndex(newIndex);
            return restoredEquipment;
        }
        return null;
    };

    const redoEquipment = () => {
        if (equipmentHistoryIndex < equipmentHistory.length - 1) {
            const newIndex = equipmentHistoryIndex + 1;
            const restoredEquipment = equipmentHistory[newIndex];
            setEquipmentIcons([...restoredEquipment]);
            setEquipmentHistoryIndex(newIndex);
            return restoredEquipment;
        }
        return null;
    };

    return {
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
        saveEquipmentToHistory,
        undoEquipment,
        redoEquipment,
    };
};

// Irrigation System State Hook
export const useIrrigationState = () => {
    const [irrigationAssignments, setIrrigationAssignments] = useState<{
        [zoneId: string]: string;
    }>({});
    const [irrigationPoints, setIrrigationPoints] = useState<any[]>([]);
    const [irrigationLines, setIrrigationLines] = useState<any[]>([]);
    const [irrigationSettings, setIrrigationSettings] = useState<{ [zoneId: string]: any }>({});
    const [selectedIrrigationZone, setSelectedIrrigationZone] = useState<any>(null);
    const [showIrrigationSettings, setShowIrrigationSettings] = useState(false);
    const [irrigationRadius, setIrrigationRadius] = useState<{ [zoneId: string]: number }>({});
    const [sprinklerOverlap, setSprinklerOverlap] = useState<{ [zoneId: string]: boolean }>({});

    return {
        irrigationAssignments,
        setIrrigationAssignments,
        irrigationPoints,
        setIrrigationPoints,
        irrigationLines,
        setIrrigationLines,
        irrigationSettings,
        setIrrigationSettings,
        selectedIrrigationZone,
        setSelectedIrrigationZone,
        showIrrigationSettings,
        setShowIrrigationSettings,
        irrigationRadius,
        setIrrigationRadius,
        sprinklerOverlap,
        setSprinklerOverlap,
    };
};
