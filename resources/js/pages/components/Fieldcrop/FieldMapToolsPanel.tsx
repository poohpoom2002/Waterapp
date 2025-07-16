import React from 'react';
import {
    ZONE_COLORS,
    OBSTACLE_TYPES,
    PIPE_TYPES,
    EQUIPMENT_TYPES,
    MAP_TILES,
    type EquipmentType,
    type PipeType,
    type MapTileType,
    type ObstacleType,
} from '@/pages/utils/fieldMapConstants';
import { getCropByValue } from '@/pages/utils/cropData';
import Tooltip from './Tooltip';
import FieldMapCropSpacing from './FieldMapCropSpacing';

interface FieldMapToolsPanelProps {
    // Step management
    currentStep: number;
    setCurrentStep: (step: number) => void;
    validateStep: (step: number) => boolean;
    nextStep: () => void;
    previousStep: () => void;
    resetAll: () => void;

    // Field data
    mainField: any;
    fieldAreaSize: number;
    selectedCrops: string[];
    zones: any[];
    pipes: any[];
    obstacles: any[];

    // Settings
    snapEnabled: boolean;
    setSnapEnabled: (enabled: boolean) => void;
    gridEnabled: boolean;
    setGridEnabled: (enabled: boolean) => void;
    pipeSnapEnabled: boolean;
    setPipeSnapEnabled: (enabled: boolean) => void;
    mapType: MapTileType;
    setMapType: (type: MapTileType) => void;

    // Drawing modes
    drawingStage: 'field' | 'zones' | 'pipes' | 'irrigation';
    setDrawingStage: React.Dispatch<
        React.SetStateAction<'field' | 'zones' | 'pipes' | 'irrigation'>
    >;
    drawingMode: 'zone' | 'obstacle';
    setDrawingMode: React.Dispatch<React.SetStateAction<'zone' | 'obstacle'>>;
    currentZoneColor: string;
    setCurrentZoneColor: (color: string) => void;
    currentObstacleType: ObstacleType;
    setCurrentObstacleType: (type: ObstacleType) => void;
    currentPipeType: PipeType;
    setCurrentPipeType: (type: PipeType) => void;

    // Equipment
    isPlacingEquipment: boolean;
    selectedEquipmentType: EquipmentType | null;
    startPlacingEquipment: (type: EquipmentType) => void;
    cancelPlacingEquipment: () => void;
    clearAllEquipment: () => void;
    undoEquipment: () => void;
    redoEquipment: () => void;
    equipmentIcons: any[];
    equipmentHistory: any[];
    equipmentHistoryIndex: number;

    // Zone management
    usedColors: string[];
    addNewZone: () => void;
    zoneAssignments: any;
    assignPlantToZone: (zoneId: string, plantValue: string) => void;
    removePlantFromZone: (zoneId: string) => void;
    deleteZone: (zoneId: string) => void;

    // Pipe generation
    generateLateralPipes: () => void;
    generateLateralPipesForZone: (zone: any) => void;
    isGeneratingPipes: boolean;
    clearLateralPipes: () => void;

    // Irrigation
    irrigationAssignments: any;
    setIrrigationAssignments: (assignments: any) => void;
    irrigationPoints: any[];
    irrigationLines: any[];
    irrigationRadius: any;
    setIrrigationRadius: (radius: any) => void;
    sprinklerOverlap: any;
    setSprinklerOverlap: (overlap: any) => void;
    generateIrrigationForZone: (zone: any, type: string) => void;
    clearIrrigationForZone: (zoneId: string) => void;
    irrigationSettings: any;
    setIrrigationSettings: (settings: any) => void;

    // Summary data
    zoneSummaries: any;
    plantingPoints: any[];

    // Crop spacing props
    selectedCropObjects: any[];
    rowSpacing: any;
    tempRowSpacing: any;
    setTempRowSpacing: (spacing: any) => void;
    editingRowSpacingForCrop: string | null;
    setEditingRowSpacingForCrop: (crop: string | null) => void;
    handleRowSpacingConfirm: (cropValue: string) => void;
    handleRowSpacingCancel: (cropValue: string) => void;
    plantSpacing: any;
    tempPlantSpacing: any;
    setTempPlantSpacing: (spacing: any) => void;
    editingPlantSpacingForCrop: string | null;
    setEditingPlantSpacingForCrop: (crop: string | null) => void;
    handlePlantSpacingConfirm: (cropValue: string) => void;
    handlePlantSpacingCancel: (cropValue: string) => void;
    handleCaptureMapAndSummary?: () => void;
}

const FieldMapToolsPanel: React.FC<FieldMapToolsPanelProps> = ({
    currentStep,
    setCurrentStep,
    validateStep,
    nextStep,
    previousStep,
    resetAll,
    mainField,
    fieldAreaSize,
    selectedCrops,
    zones,
    pipes,
    obstacles,
    snapEnabled,
    setSnapEnabled,
    gridEnabled,
    setGridEnabled,
    pipeSnapEnabled,
    setPipeSnapEnabled,
    drawingStage,
    setDrawingStage,
    drawingMode,
    setDrawingMode,
    currentZoneColor,
    setCurrentZoneColor,
    currentObstacleType,
    setCurrentObstacleType,
    currentPipeType,
    setCurrentPipeType,
    isPlacingEquipment,
    selectedEquipmentType,
    startPlacingEquipment,
    cancelPlacingEquipment,
    clearAllEquipment,
    undoEquipment,
    redoEquipment,
    equipmentIcons,
    equipmentHistory,
    equipmentHistoryIndex,
    usedColors,
    addNewZone,
    zoneAssignments,
    assignPlantToZone,
    removePlantFromZone,
    deleteZone,
    generateLateralPipes,
    generateLateralPipesForZone,
    isGeneratingPipes,
    clearLateralPipes,
    irrigationAssignments,
    setIrrigationAssignments,
    irrigationPoints,
    irrigationLines,
    irrigationRadius,
    setIrrigationRadius,
    sprinklerOverlap,
    setSprinklerOverlap,
    generateIrrigationForZone,
    clearIrrigationForZone,
    irrigationSettings,
    setIrrigationSettings,
    zoneSummaries,
    plantingPoints,
    selectedCropObjects,
    rowSpacing,
    tempRowSpacing,
    setTempRowSpacing,
    editingRowSpacingForCrop,
    setEditingRowSpacingForCrop,
    handleRowSpacingConfirm,
    handleRowSpacingCancel,
    plantSpacing,
    tempPlantSpacing,
    setTempPlantSpacing,
    editingPlantSpacingForCrop,
    setEditingPlantSpacingForCrop,
    handlePlantSpacingConfirm,
    handlePlantSpacingCancel,
    handleCaptureMapAndSummary,
}) => {
    return (
        <>
            {/* Current Active Step - Display Only Current Step */}

            {/* Step 1: Field Drawing */}
            {currentStep === 1 && (
                <div className="space-y-3">
                    {/* Step Header */}
                    <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-orange-300">
                                🏗️ Step 1: Field Drawing
                            </span>
                            <span className="text-xs">{mainField ? '✅' : '⏳'}</span>
                        </div>
                        <div className="mt-1 text-xs text-orange-400">
                            Draw your field boundary on the map
                        </div>
                    </div>

                    {/* Crop Spacing Settings */}
                    {selectedCropObjects.length > 0 && (
                        <FieldMapCropSpacing
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
                        />
                    )}

                    {/* Field Area Info */}
                    {mainField && (
                        <div className="rounded-lg bg-gray-700 p-3">
                            <div className="mb-2 text-sm text-gray-300">📐 Field Info</div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Area:</span>
                                    <span className="text-white">
                                        {fieldAreaSize > 0
                                            ? fieldAreaSize >= 1600
                                                ? `${(fieldAreaSize / 1600).toFixed(2)} ไร่`
                                                : `${fieldAreaSize.toFixed(0)} m²`
                                            : 'Calculating...'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Status:</span>
                                    <span className="text-orange-400">Ready for zones</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step Navigation */}
                    <div className="rounded-lg bg-gray-700 p-3">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={resetAll}
                                className="rounded bg-red-600 px-3 py-1 text-sm text-white transition-colors hover:bg-red-700"
                            >
                                🗑️ Reset All
                            </button>
                            <button
                                onClick={nextStep}
                                disabled={!validateStep(1)}
                                className={`rounded px-4 py-1 text-sm transition-colors ${
                                    validateStep(1)
                                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                                        : 'cursor-not-allowed bg-gray-600 text-gray-400'
                                }`}
                            >
                                Next Step ➡️
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Zones & Obstacles */}
            {currentStep === 2 && (
                <div className="space-y-3">
                    {/* Step Header */}
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-300">
                                🎯 Step 2: Zones & Obstacles
                            </span>
                            <span className="text-xs">{zones.length > 0 ? '✅' : '⏳'}</span>
                        </div>
                        <div className="mt-1 text-xs text-blue-400">
                            Create zones and mark obstacles
                        </div>
                    </div>

                    {/* Drawing Mode */}
                    <div className="rounded-lg bg-gray-700 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-300">Drawing Mode</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                            <button
                                onClick={() => setDrawingMode('zone')}
                                className={`rounded p-2 text-xs transition-colors ${
                                    drawingMode === 'zone'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                }`}
                            >
                                🎯 Zones
                            </button>
                            <button
                                onClick={() => setDrawingMode('obstacle')}
                                className={`rounded p-2 text-xs transition-colors ${
                                    drawingMode === 'obstacle'
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                }`}
                            >
                                ⛔ Obstacles
                            </button>
                        </div>
                    </div>

                    {/* Obstacle Type Selector */}
                    {drawingMode === 'obstacle' && (
                        <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-orange-300">
                                    Obstacle Type
                                </span>
                                <span className="text-xs text-orange-400">
                                    {obstacles.length} obstacles
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-1">
                                {Object.entries(OBSTACLE_TYPES).map(([key, config]) => (
                                    <button
                                        key={key}
                                        onClick={() => setCurrentObstacleType(key as ObstacleType)}
                                        className={`rounded-md px-3 py-2 text-left transition-colors ${
                                            currentObstacleType === key
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <span className="text-lg">{config.icon}</span>
                                            <span className="text-xs">{config.name}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Zone Assignment */}
                    {zones.length > 0 && selectedCrops.length > 0 && (
                        <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span className="font-medium text-purple-300">
                                        🌱 Assign Crops
                                    </span>
                                    <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
                                        {zones.length} zones
                                    </span>
                                </div>
                                <div className="text-xs text-purple-400">
                                    {Object.keys(zoneAssignments).length}/{zones.length} assigned
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {zones.map((zone: any, index: number) => {
                                    const assignedCrop = zoneAssignments[zone.id];

                                    return (
                                        <div
                                            key={zone.id}
                                            className="relative rounded-lg border border-gray-600 bg-gray-700/50 p-3 transition-all hover:bg-gray-700/70"
                                        >
                                            <button
                                                onClick={() => deleteZone(zone.id.toString())}
                                                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white shadow-lg transition-all hover:scale-110 hover:bg-red-600"
                                                title={`Delete Zone ${index + 1}`}
                                            >
                                                ×
                                            </button>

                                            <div className="mb-3 flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div
                                                        className="h-4 w-4 rounded-full border-2 border-white/30"
                                                        style={{ backgroundColor: zone.color }}
                                                    ></div>
                                                    <span className="font-medium text-white">
                                                        Zone {index + 1}
                                                    </span>
                                                    {assignedCrop && (
                                                        <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-300">
                                                            ✓ Assigned
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <select
                                                value={assignedCrop || ''}
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        assignPlantToZone(
                                                            zone.id.toString(),
                                                            e.target.value
                                                        );
                                                    } else {
                                                        removePlantFromZone(zone.id.toString());
                                                    }
                                                }}
                                                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                            >
                                                <option value="">
                                                    Select a crop for this zone...
                                                </option>
                                                {selectedCrops.map((cropValue) => {
                                                    const crop = getCropByValue(cropValue);
                                                    return crop ? (
                                                        <option key={crop.value} value={crop.value}>
                                                            {crop.icon}{' '}
                                                            {crop.name.split('/')[0].trim()}
                                                        </option>
                                                    ) : null;
                                                })}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Zone Statistics */}
                    {zones.length > 0 && (
                        <div className="rounded-lg bg-gray-700 p-3">
                            <div className="mb-2 text-sm text-gray-300">📊 Zone Summary</div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                    <span className="text-orange-300">Obstacles:</span>
                                    <span className="ml-1 text-white">{obstacles.length}</span>
                                </div>
                                <div>
                                    <span className="text-green-300">Assigned:</span>
                                    <span className="ml-1 text-white">
                                        {Object.keys(zoneAssignments).length}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-blue-300">Total zones:</span>
                                    <span className="ml-1 text-white">{zones.length}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step Navigation */}
                    <div className="rounded-lg bg-gray-700 p-3">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={previousStep}
                                className="rounded bg-gray-600 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-500"
                            >
                                ⬅️ Previous
                            </button>
                            <button
                                onClick={nextStep}
                                disabled={!validateStep(2)}
                                className={`rounded px-4 py-1 text-sm transition-colors ${
                                    validateStep(2)
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'cursor-not-allowed bg-gray-600 text-gray-400'
                                }`}
                            >
                                Next Step ➡️
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Pipe System */}
            {currentStep === 3 && (
                <div className="space-y-3">
                    {/* Step Header */}
                    <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-purple-300">
                                🚰 Step 3: Pipe System
                            </span>
                            <span className="text-xs">{pipes.length > 0 ? '✅' : '⏳'}</span>
                        </div>
                        <div className="mt-1 text-xs text-purple-400">
                            Design water distribution network
                        </div>
                    </div>

                    {/* Manual Pipe Drawing */}
                    <div className="rounded-lg bg-gray-700 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-300">
                                Manual Drawing
                            </span>
                            <span className="text-xs text-gray-400">
                                {pipes.filter((p) => p.type !== 'lateral').length} pipes
                            </span>
                        </div>

                        <div className="space-y-1">
                            {Object.entries(PIPE_TYPES)
                                .filter(([key, config]) => config.manual)
                                .map(([key, config]) => (
                                    <button
                                        key={key}
                                        onClick={() => setCurrentPipeType(key as any)}
                                        className={`w-full rounded p-2 text-left text-xs transition-colors ${
                                            currentPipeType === key
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <span>{config.icon}</span>
                                            <div
                                                className="h-1 w-8 rounded"
                                                style={{ backgroundColor: config.color }}
                                            ></div>
                                            <span>{config.name.replace('Pipe', '')}</span>
                                        </div>
                                    </button>
                                ))}
                        </div>
                    </div>

                    {/* Auto Generate Laterals */}
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-yellow-300">
                                ⚡ Auto Generate
                            </span>
                            <span className="text-xs text-yellow-400">
                                {pipes.filter((p) => p.type === 'lateral').length} laterals
                            </span>
                        </div>

                        <div className="space-y-2">
                            <button
                                onClick={generateLateralPipes}
                                disabled={
                                    isGeneratingPipes ||
                                    pipes.filter((p) => p.type === 'submain').length === 0
                                }
                                className={`w-full rounded px-3 py-2 text-sm transition-colors ${
                                    pipes.filter((p) => p.type === 'submain').length === 0
                                        ? 'cursor-not-allowed bg-gray-600 text-gray-400'
                                        : isGeneratingPipes
                                          ? 'cursor-not-allowed bg-yellow-500/50 text-gray-300'
                                          : 'bg-yellow-600 text-white hover:bg-yellow-700'
                                }`}
                            >
                                {isGeneratingPipes ? '⏳ Generating...' : '⚡ Generate Laterals'}
                            </button>

                            {pipes.filter((p) => p.type === 'lateral').length > 0 && (
                                <button
                                    onClick={clearLateralPipes}
                                    className="w-full rounded bg-red-600 px-3 py-2 text-sm text-white transition-colors hover:bg-red-700"
                                >
                                    🗑️ Clear Laterals
                                </button>
                            )}
                        </div>

                        {pipes.filter((p) => p.type === 'submain').length === 0 && (
                            <div className="mt-2 text-xs text-yellow-400">
                                💡 Draw submain pipes first
                            </div>
                        )}
                    </div>

                    {/* Pipe Statistics */}
                    {pipes.length > 0 && (
                        <div className="rounded-lg bg-gray-700 p-3">
                            <div className="mb-2 text-sm text-gray-300">📊 Pipe Summary</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-blue-300">Main:</span>
                                    <span className="ml-1 text-white">
                                        {pipes.filter((p) => p.type === 'main').length}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-green-300">Submain:</span>
                                    <span className="ml-1 text-white">
                                        {pipes.filter((p) => p.type === 'submain').length}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-yellow-300">Lateral:</span>
                                    <span className="ml-1 text-white">
                                        {pipes.filter((p) => p.type === 'lateral').length}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-300">Total:</span>
                                    <span className="ml-1 text-white">{pipes.length}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step Navigation */}
                    <div className="rounded-lg bg-gray-700 p-3">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={previousStep}
                                className="rounded bg-gray-600 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-500"
                            >
                                ⬅️ Previous
                            </button>
                            <button
                                onClick={nextStep}
                                disabled={!validateStep(3)}
                                className={`rounded px-4 py-1 text-sm transition-colors ${
                                    validateStep(3)
                                        ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                                        : 'cursor-not-allowed bg-gray-600 text-gray-400'
                                }`}
                            >
                                Next Step ➡️
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4: Irrigation System */}
            {currentStep === 4 && (
                <div className="space-y-3">
                    {/* Step Header */}
                    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-cyan-300">
                                🚿 Step 4: Irrigation System
                            </span>
                            <span className="text-xs">
                                {Object.keys(irrigationAssignments).length > 0 ? '✅' : '⏳'}
                            </span>
                        </div>
                        <div className="mt-1 text-xs text-cyan-400">
                            Set irrigation systems for each zone
                        </div>
                    </div>

                    {/* Zone Irrigation Assignment */}
                    {zones.length > 0 && (
                        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span className="font-medium text-cyan-300">
                                        🚿 Irrigation Systems
                                    </span>
                                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-300">
                                        {zones.length} zones
                                    </span>
                                </div>
                                <div className="text-xs text-cyan-400">
                                    {Object.keys(irrigationAssignments).length}/{zones.length}{' '}
                                    assigned
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {zones.map((zone: any, index: number) => {
                                    const assignedIrrigation = irrigationAssignments[zone.id];
                                    const zoneRadius = irrigationRadius[zone.id] || 5;
                                    const zoneOverlap = sprinklerOverlap[zone.id] || false;

                                    return (
                                        <div
                                            key={zone.id}
                                            className="relative rounded-lg border border-gray-600 bg-gray-700/50 p-3 transition-all hover:bg-gray-700/70"
                                        >
                                            <div className="mb-3 flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div
                                                        className="h-4 w-4 rounded-full border-2 border-white/30"
                                                        style={{ backgroundColor: zone.color }}
                                                    ></div>
                                                    <span className="font-medium text-white">
                                                        Zone {index + 1}
                                                    </span>
                                                    {assignedIrrigation && (
                                                        <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-300">
                                                            ✓ Assigned
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <select
                                                value={assignedIrrigation || ''}
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        setIrrigationAssignments((prev: any) => ({
                                                            ...prev,
                                                            [zone.id]: e.target.value,
                                                        }));
                                                    } else {
                                                        clearIrrigationForZone(zone.id);
                                                    }
                                                }}
                                                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white transition-colors focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                            >
                                                <option value="">
                                                    Select irrigation system...
                                                </option>
                                                <option value="sprinkler">🌿 Sprinkler</option>
                                                <option value="mini_sprinkler">
                                                    🌱 Mini Sprinkler
                                                </option>
                                                <option value="micro_spray">💦 Micro Spray</option>
                                                <option value="drip_tape">💧 Drip Tape</option>
                                            </select>

                                            {/* Irrigation Settings */}
                                            {assignedIrrigation && (
                                                <div className="mt-3 rounded-lg border border-gray-600 bg-gray-800 p-3">
                                                    <div className="mb-2 text-xs text-gray-300">
                                                        Settings:
                                                    </div>

                                                    <div className="space-y-2">
                                                        {/* แยก Controls ตามประเภทระบบน้ำ */}
                                                        {assignedIrrigation === 'drip_tape' ? (
                                                            // Controls สำหรับเทปน้ำหยด - ไม่มี overlap
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs text-gray-400">
                                                                        ระยะห่างจุดน้ำหยด (m):
                                                                    </span>
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="range"
                                                                            min="0.2"
                                                                            max="2.0"
                                                                            step="0.1"
                                                                            value={irrigationSettings[zone.id]?.dripSpacing || 1.0}
                                                                            onChange={(e) => {
                                                                                const newSpacing = parseFloat(e.target.value);
                                                                                setIrrigationSettings((prev: any) => ({
                                                                                    ...prev,
                                                                                    [zone.id]: {
                                                                                        ...prev[zone.id],
                                                                                        dripSpacing: newSpacing,
                                                                                    }
                                                                                }));
                                                                            }}
                                                                            className="w-20"
                                                                        />
                                                                        <span className="w-12 text-xs text-white">
                                                                            {irrigationSettings[zone.id]?.dripSpacing?.toFixed(1) || '1.0'}m
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    ระยะห่างระหว่างจุดหยดน้ำบนเทป
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            // Controls สำหรับสปริงเกลอร์ - มี radius และ overlap
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs text-gray-400">
                                                                        รัศมีการฉีด (m):
                                                                    </span>
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="range"
                                                                            min={
                                                                                assignedIrrigation === 'sprinkler'
                                                                                    ? 8
                                                                                    : assignedIrrigation === 'mini_sprinkler'
                                                                                    ? 0.5
                                                                                    : assignedIrrigation === 'micro_spray'
                                                                                        ? 3
                                                                                        : 0
                                                                            }
                                                                            max={
                                                                                assignedIrrigation === 'sprinkler'
                                                                                    ? 12
                                                                                    : assignedIrrigation === 'mini_sprinkler'
                                                                                    ? 3
                                                                                    : assignedIrrigation === 'micro_spray'
                                                                                        ? 8
                                                                                        : 0
                                                                            }
                                                                            step="0.5"
                                                                            value={zoneRadius}
                                                                            onChange={(e) => {
                                                                                const newRadius = parseFloat(e.target.value);
                                                                                setIrrigationRadius((prev: any) => ({
                                                                                    ...prev,
                                                                                    [zone.id]: newRadius,
                                                                                }));
                                                                            }}
                                                                            className="w-20"
                                                                        />
                                                                        <span className="w-12 text-xs text-white">
                                                                            {zoneRadius.toFixed(1)}m
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Overlap control - เฉพาะ sprinkler เท่านั้น */}
                                                                {assignedIrrigation === 'sprinkler' && (
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs text-gray-400">
                                                                            รูปแบบทับซ้อน:
                                                                        </span>
                                                                        <label className="flex items-center space-x-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={zoneOverlap}
                                                                                onChange={(e) => {
                                                                                    setSprinklerOverlap((prev: any) => ({
                                                                                        ...prev,
                                                                                        [zone.id]: e.target.checked,
                                                                                    }));
                                                                                }}
                                                                                className="h-3 w-3 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500"
                                                                            />
                                                                            <span className="text-xs text-white">
                                                                                {zoneOverlap ? 'เปิด' : 'ปิด'}
                                                                            </span>
                                                                        </label>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-3 flex space-x-2">
                                                        <button
                                                            onClick={() => generateIrrigationForZone(zone, assignedIrrigation)}
                                                            className="flex-1 rounded bg-cyan-600 px-3 py-1 text-xs text-white transition-colors hover:bg-cyan-700"
                                                        >
                                                            🚿 สร้างระบบน้ำ
                                                        </button>
                                                        <button
                                                            onClick={() => clearIrrigationForZone(zone.id)}
                                                            className="rounded bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-700"
                                                        >
                                                            🗑️ ลบ
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Summary Section */}
                    <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-medium text-green-300">
                                📊 Zone Summary
                            </span>
                        </div>
                        <div className="space-y-3">
                            {zones.length > 0 ? (
                                zones.map((zone) => {
                                    const summary = zoneSummaries[zone.id];
                                    const assignedCrop = summary
                                        ? getCropByValue(zoneAssignments[zone.id])
                                        : null;

                                    if (!summary || !assignedCrop) {
                                        return (
                                            <div
                                                key={zone.id}
                                                className="rounded bg-gray-700/50 p-2 text-center text-xs text-gray-400"
                                            >
                                                Generate irrigation for{' '}
                                                <span
                                                    style={{
                                                        color: zone.color,
                                                        fontWeight: 'bold',
                                                    }}
                                                >
                                                    {zone.name}
                                                </span>{' '}
                                                to see summary.
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={zone.id} className="rounded bg-gray-700 p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <span
                                                        className="h-3 w-3 rounded-full"
                                                        style={{ backgroundColor: zone.color }}
                                                    ></span>
                                                    <h4 className="font-bold text-white">
                                                        {zone.name}
                                                    </h4>
                                                </div>
                                                <span className="text-lg">{assignedCrop.icon}</span>
                                            </div>
                                            <div className="space-y-1 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">
                                                        Total Planting Points:
                                                    </span>
                                                    <span className="font-medium text-white">
                                                        {summary.totalPlantingPoints.toLocaleString()}{' '}
                                                        points
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">
                                                        Est. Yield:
                                                    </span>
                                                    <span className="font-medium text-white">
                                                        {summary.estimatedYield.toLocaleString(
                                                            undefined,
                                                            { maximumFractionDigits: 0 }
                                                        )}{' '}
                                                        kg
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">
                                                        Est. Income:
                                                    </span>
                                                    <span className="font-bold text-green-400">
                                                        ฿
                                                        {summary.estimatedPrice.toLocaleString(
                                                            undefined,
                                                            { maximumFractionDigits: 0 }
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="mt-1 border-t border-gray-600 pt-1">
                                                    <Tooltip
                                                        content={summary.plantingPointsByRow
                                                            .map(
                                                                (r: any) =>
                                                                    `Row ${r.row}: ${r.count} points`
                                                            )
                                                            .join('\n')}
                                                    >
                                                        <span className="cursor-help text-gray-500">
                                                            Points per row:{' '}
                                                            {summary.plantingPointsByRow
                                                                .map((r: any) => r.count)
                                                                .join(', ')}
                                                        </span>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-2 text-center text-xs text-gray-500">
                                    No zones created yet.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Irrigation Statistics */}
                    {(irrigationPoints.length > 0 || irrigationLines.length > 0) && (
                        <div className="rounded-lg bg-gray-700 p-3">
                            <div className="mb-2 text-sm text-gray-300">📊 Irrigation Summary</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center">
                                    <div className="mr-2 h-3 w-3 rounded-full bg-green-500"></div>
                                    <span className="text-gray-300">Sprinkler:</span>
                                    <span className="ml-1 font-semibold text-white">
                                        {
                                            irrigationPoints.filter((p) => p.type === 'sprinkler')
                                                .length
                                        }
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <div className="mr-2 h-3 w-3 rounded-full bg-blue-500"></div>
                                    <span className="text-gray-300">Mini Sprinkler:</span>
                                    <span className="ml-1 font-semibold text-white">
                                        {
                                            irrigationPoints.filter(
                                                (p) => p.type === 'mini_sprinkler'
                                            ).length
                                        }
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <div className="mr-2 h-3 w-3 rounded-full bg-orange-500"></div>
                                    <span className="text-gray-300">Micro Spray:</span>
                                    <span className="ml-1 font-semibold text-white">
                                        {
                                            irrigationPoints.filter((p) => p.type === 'micro_spray')
                                                .length
                                        }
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <div className="mr-2 h-3 w-3 rounded-full bg-cyan-500"></div>
                                    <span className="text-gray-300">Drip Lines:</span>
                                    <span className="ml-1 font-semibold text-white">
                                        {
                                            irrigationLines.filter((l) => l.type === 'drip_tape')
                                                .length
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step Navigation */}
                    <div className="rounded-lg bg-gray-700 p-3">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={previousStep}
                                className="rounded bg-gray-600 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-500"
                            >
                                ⬅️ Previous
                            </button>
                            <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-400">Final Step</span>
                                <span className="text-lg">{validateStep(4) ? '✅' : '⏳'}</span>
                            </div>
                        </div>
                    </div>

                    {/* View Summary Button - Only show when step is completed */}
                    {validateStep(4) && handleCaptureMapAndSummary && (
                        <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                            <div className="text-center">
                                <div className="mb-2 text-sm font-medium text-green-300">
                                    🎉 Project Complete!
                                </div>
                                <div className="mb-3 text-xs text-green-400">
                                    All steps completed successfully. Ready to view your project
                                    summary.
                                </div>
                                <button
                                    onClick={handleCaptureMapAndSummary}
                                    className="w-full rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
                                >
                                    📸 บันทึกภาพแผนที่และดูสรุป
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default FieldMapToolsPanel;
