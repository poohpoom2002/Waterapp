import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import {
    MapContainer,
    TileLayer,
    FeatureGroup,
    Polygon,
    Polyline,
    Marker,
    CircleMarker,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { getCropByValue } from '@/utils/cropData';
import {
    ZONE_COLORS,
    OBSTACLE_TYPES,
    PIPE_TYPES,
    MAP_TILES,
    EQUIPMENT_TYPES,
    type PipeType,
    type EquipmentType,
    type ObstacleType,
} from '@/utils/fieldMapConstants';

// Fix leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FieldCropSummaryProps {
    // Field data
    mainField?: any;
    fieldAreaSize?: number;
    selectedCrops?: string[];

    // Zones and crops
    zones?: any[];
    zoneAssignments?: any;
    zoneSummaries?: any;

    // Pipes
    pipes?: any[];

    // Equipment
    equipmentIcons?: any[];

    // Irrigation
    irrigationPoints?: any[];
    irrigationLines?: any[];
    irrigationAssignments?: any;
    irrigationSettings?: any;

    // Spacing
    rowSpacing?: any;
    plantSpacing?: any;

    // Map state
    mapCenter?: [number, number];
    mapZoom?: number;
    mapType?: string;
}

export default function FieldCropSummary() {
    // Get data from localStorage or URL parameters
    const [summaryData, setSummaryData] = useState<any>(null);

    useEffect(() => {
        // Try to get data from localStorage first
        const savedData = localStorage.getItem('fieldMapData');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                setSummaryData(parsedData);
            } catch (error) {
                console.error('Error parsing saved data:', error);
            }
        }
    }, []);

    // Default values if no data is available
    const {
        mainField,
        fieldAreaSize = 0,
        selectedCrops = [],
        zones = [],
        zoneAssignments = {},
        zoneSummaries = {},
        pipes = [],
        equipmentIcons = [],
        irrigationPoints = [],
        irrigationLines = [],
        irrigationAssignments = {},
        irrigationSettings = {},
        rowSpacing = {},
        plantSpacing = {},
        mapCenter = [14.5995, 120.9842],
        mapZoom = 18,
        mapType = 'satellite',
    } = summaryData || {};

    // Calculate optimal map center and zoom based on field data
    const calculateMapBounds = () => {
        if (mainField && mainField.coordinates && mainField.coordinates.length > 0) {
            // แปลง [lat, lng] → [lng, lat] สำหรับ turf
            const coords = mainField.coordinates.map(([lat, lng]) => [lng, lat]);
            const closedCoords = [...coords, coords[0]];
            const polygon = turf.polygon([closedCoords]);
            const centroid = turf.centroid(polygon);
            const [centerLng, centerLat] = centroid.geometry.coordinates;

            let optimalZoom = 18;
            if (fieldAreaSize > 10000) {
                optimalZoom = 16;
            } else if (fieldAreaSize > 5000) {
                optimalZoom = 17;
            } else {
                optimalZoom = 18;
            }

            return { center: [centerLat, centerLng], zoom: optimalZoom };
        }
        return { center: mapCenter, zoom: mapZoom };
    };

    const { center: optimalCenter, zoom: optimalZoom } = calculateMapBounds();

    // Handle case where zones might be just a number (from minimal data)
    const actualZones = Array.isArray(zones) ? zones : [];
    const actualPipes = Array.isArray(pipes) ? pipes : [];
    const actualEquipmentIcons = Array.isArray(equipmentIcons) ? equipmentIcons : [];
    const actualIrrigationPoints = Array.isArray(irrigationPoints) ? irrigationPoints : [];
    const actualIrrigationLines = Array.isArray(irrigationLines) ? irrigationLines : [];

    // Calculate totals
    const totalZones = actualZones.length;
    const totalPipes = actualPipes.length;
    const totalEquipment = actualEquipmentIcons.length;
    const totalIrrigationPoints = actualIrrigationPoints.length;
    const totalIrrigationLines = actualIrrigationLines.length;

    // Calculate pipe types
    const mainPipes = actualPipes.filter((p) => p.type === 'main').length;
    const submainPipes = actualPipes.filter((p) => p.type === 'submain').length;
    const lateralPipes = actualPipes.filter((p) => p.type === 'lateral').length;

    // Calculate irrigation types
    const sprinklerPoints = actualIrrigationPoints.filter((p) => p.type === 'sprinkler').length;
    const miniSprinklerPoints = actualIrrigationPoints.filter(
        (p) => p.type === 'mini_sprinkler'
    ).length;
    const microSprayPoints = actualIrrigationPoints.filter((p) => p.type === 'micro_spray').length;
    const dripLines = actualIrrigationLines.filter((l) => l.type === 'drip_tape').length;

    // Calculate equipment types
    const pumpCount = actualEquipmentIcons.filter((e) => e.type === 'pump').length;
    const valveCount = actualEquipmentIcons.filter((e) => e.type === 'ballvalve').length;
    const solenoidCount = actualEquipmentIcons.filter((e) => e.type === 'solenoid').length;

    // Calculate total estimated yield and income
    const totalEstimatedYield = Object.values(zoneSummaries).reduce((sum: number, summary: any) => {
        return sum + (summary.estimatedYield || 0);
    }, 0);

    const totalEstimatedIncome = Object.values(zoneSummaries).reduce(
        (sum: number, summary: any) => {
            return sum + (summary.estimatedPrice || 0);
        },
        0
    );

    // Calculate total planting points
    const totalPlantingPoints = Object.values(zoneSummaries).reduce((sum: number, summary: any) => {
        return sum + (summary.totalPlantingPoints || 0);
    }, 0);

    // Format area
    const areaInRai = fieldAreaSize / 1600;
    const areaInAcres = fieldAreaSize / 4046.86;

    // Selected crop objects
    const selectedCropObjects = selectedCrops
        .map((cropValue) => getCropByValue(cropValue))
        .filter(Boolean);

    // Show loading or no data message
    if (!summaryData) {
        return (
            <div className="min-h-screen bg-gray-900 text-white">
                <Head title="Field Crop Summary - Irrigation Planning" />

                {/* Header */}
                <div className="border-b border-gray-700 bg-gray-800">
                    <div className="container mx-auto px-4 py-6">
                        <div className="mx-auto max-w-7xl">
                            {/* Back Navigation */}
                            <Link
                                href="/field-map"
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
                                Back to Field Map
                            </Link>

                            {/* Main Title */}
                            <h1 className="mb-2 text-4xl font-bold">📊 Field Crop Summary</h1>
                            <p className="mb-6 text-gray-400">
                                Complete overview of your irrigation planning project
                            </p>
                        </div>
                    </div>
                </div>

                {/* No Data Message */}
                <div className="container mx-auto px-4 py-6">
                    <div className="mx-auto max-w-7xl">
                        <div className="rounded-lg bg-gray-800 p-8 text-center">
                            <div className="mb-4 text-6xl">📋</div>
                            <h2 className="mb-4 text-2xl font-bold text-yellow-400">
                                No Project Data Found
                            </h2>
                            <p className="mb-6 text-gray-400">
                                It looks like you haven't completed a field mapping project yet, or
                                the data has been cleared.
                            </p>
                            <div className="space-y-4">
                                <p className="text-gray-300">To view a summary, please:</p>
                                <ol className="mx-auto max-w-md space-y-2 text-left text-gray-300">
                                    <li className="flex items-start">
                                        <span className="mr-2 text-blue-400">1.</span>
                                        Go to the Field Map page
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2 text-blue-400">2.</span>
                                        Complete all 4 steps of the planning wizard
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2 text-blue-400">3.</span>
                                        Click the "View Summary" button that appears
                                    </li>
                                </ol>
                            </div>
                            <div className="mt-8">
                                <Link
                                    href="/field-map"
                                    className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                                >
                                    🗺️ Start Field Mapping
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Head title="Field Crop Summary - Irrigation Planning" />

            {/* Header */}
            <div className="border-b border-gray-700 bg-gray-800">
                <div className="container mx-auto px-4 py-6">
                    <div className="mx-auto max-w-7xl">
                        {/* Back Navigation */}
                        <Link
                            href="/field-map"
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
                            Back to Field Map
                        </Link>

                        {/* Main Title */}
                        <h1 className="mb-2 text-4xl font-bold">📊 Field Crop Summary</h1>
                        <p className="mb-6 text-gray-400">
                            Complete overview of your irrigation planning project
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6">
                <div className="mx-auto max-w-7xl">
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        {/* Left Panel - Data Summary */}
                        <div className="space-y-6">
                            {/* Project Overview */}
                            <div className="rounded-lg bg-gray-800 p-6">
                                <h2 className="mb-4 text-2xl font-bold text-green-400">
                                    🏡 Project Overview
                                </h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-lg bg-gray-700 p-4">
                                        <div className="mb-1 text-3xl font-bold text-blue-400">
                                            {areaInRai.toFixed(2)}
                                        </div>
                                        <div className="text-sm text-gray-400">ไร่ (Rai)</div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-4">
                                        <div className="mb-1 text-3xl font-bold text-green-400">
                                            {totalZones}
                                        </div>
                                        <div className="text-sm text-gray-400">โซน (Zones)</div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-4">
                                        <div className="mb-1 text-3xl font-bold text-purple-400">
                                            {totalPlantingPoints.toLocaleString()}
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            จุดปลูก (Planting Points)
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-4">
                                        <div className="mb-1 text-3xl font-bold text-yellow-400">
                                            {totalEstimatedYield.toLocaleString()}
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            กก. (Estimated Yield)
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Crop Information */}
                            <div className="rounded-lg bg-gray-800 p-6">
                                <h2 className="mb-4 text-2xl font-bold text-green-400">
                                    🌱 Crop Information
                                </h2>
                                <div className="space-y-3">
                                    {selectedCropObjects.map(
                                        (crop, index) =>
                                            crop && (
                                                <div
                                                    key={crop.value}
                                                    className="rounded-lg bg-gray-700 p-4"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3">
                                                            <span className="text-2xl">
                                                                {crop.icon}
                                                            </span>
                                                            <div>
                                                                <h3 className="font-semibold text-white">
                                                                    {crop.name}
                                                                </h3>
                                                                <p className="text-sm text-gray-400">
                                                                    {crop.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm text-gray-400">
                                                                Row Spacing
                                                            </div>
                                                            <div className="font-semibold text-blue-400">
                                                                {rowSpacing[crop.value] ||
                                                                    crop.spacing ||
                                                                    1.5}
                                                                m
                                                            </div>
                                                            <div className="mt-1 text-sm text-gray-400">
                                                                Plant Spacing
                                                            </div>
                                                            <div className="font-semibold text-green-400">
                                                                {plantSpacing[crop.value] ||
                                                                    crop.defaultPlantSpacing ||
                                                                    1.0}
                                                                m
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                    )}
                                </div>
                            </div>

                            {/* Zone Details */}
                            <div className="rounded-lg bg-gray-800 p-6">
                                <h2 className="mb-4 text-2xl font-bold text-blue-400">
                                    🎯 Zone Details
                                </h2>
                                <div className="space-y-3">
                                    {actualZones.map((zone, index) => {
                                        const summary = zoneSummaries[zone.id];
                                        const assignedCrop = zoneAssignments[zone.id]
                                            ? getCropByValue(zoneAssignments[zone.id])
                                            : null;
                                        const irrigationType = irrigationAssignments[zone.id];

                                        return (
                                            <div
                                                key={zone.id}
                                                className="rounded-lg bg-gray-700 p-4"
                                            >
                                                <div className="mb-3 flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div
                                                            className="h-4 w-4 rounded-full border-2 border-white/20"
                                                            style={{ backgroundColor: zone.color }}
                                                        ></div>
                                                        <h3 className="font-semibold text-white">
                                                            {zone.name}
                                                        </h3>
                                                    </div>
                                                    {assignedCrop && (
                                                        <span className="text-2xl">
                                                            {assignedCrop.icon}
                                                        </span>
                                                    )}
                                                </div>

                                                {summary && (
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <div className="text-gray-400">
                                                                Crop
                                                            </div>
                                                            <div className="font-semibold text-white">
                                                                {summary.cropName}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400">
                                                                Planting Points
                                                            </div>
                                                            <div className="font-semibold text-green-400">
                                                                {summary.totalPlantingPoints.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400">
                                                                Est. Yield
                                                            </div>
                                                            <div className="font-semibold text-yellow-400">
                                                                {summary.estimatedYield.toLocaleString()}{' '}
                                                                kg
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400">
                                                                Est. Income
                                                            </div>
                                                            <div className="font-semibold text-green-400">
                                                                ฿
                                                                {summary.estimatedPrice.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        {irrigationType && (
                                                            <div className="col-span-2">
                                                                <div className="text-gray-400">
                                                                    Irrigation System
                                                                </div>
                                                                <div className="font-semibold text-cyan-400">
                                                                    {irrigationType === 'sprinkler'
                                                                        ? '🌿 Sprinkler'
                                                                        : irrigationType ===
                                                                            'mini_sprinkler'
                                                                          ? '🌱 Mini Sprinkler'
                                                                          : irrigationType ===
                                                                              'micro_spray'
                                                                            ? '💦 Micro Spray'
                                                                            : irrigationType ===
                                                                                'drip_tape'
                                                                              ? '💧 Drip Tape'
                                                                              : irrigationType}
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

                            {/* Infrastructure Summary */}
                            <div className="rounded-lg bg-gray-800 p-6">
                                <h2 className="mb-4 text-2xl font-bold text-purple-400">
                                    🔧 Infrastructure Summary
                                </h2>

                                {/* Pipes */}
                                <div className="mb-6">
                                    <h3 className="mb-3 text-lg font-semibold text-blue-400">
                                        📏 Pipe System
                                    </h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="rounded-lg bg-gray-700 p-3 text-center">
                                            <div className="text-2xl font-bold text-blue-400">
                                                {mainPipes}
                                            </div>
                                            <div className="text-xs text-gray-400">Main Pipes</div>
                                        </div>
                                        <div className="rounded-lg bg-gray-700 p-3 text-center">
                                            <div className="text-2xl font-bold text-green-400">
                                                {submainPipes}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Submain Pipes
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-gray-700 p-3 text-center">
                                            <div className="text-2xl font-bold text-purple-400">
                                                {lateralPipes}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Lateral Pipes
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Equipment */}
                                <div className="mb-6">
                                    <h3 className="mb-3 text-lg font-semibold text-orange-400">
                                        ⚙️ Equipment
                                    </h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="rounded-lg bg-gray-700 p-3 text-center">
                                            <div className="text-2xl font-bold text-orange-400">
                                                {pumpCount}
                                            </div>
                                            <div className="text-xs text-gray-400">Pumps</div>
                                        </div>
                                        <div className="rounded-lg bg-gray-700 p-3 text-center">
                                            <div className="text-2xl font-bold text-red-400">
                                                {valveCount}
                                            </div>
                                            <div className="text-xs text-gray-400">Valves</div>
                                        </div>
                                        <div className="rounded-lg bg-gray-700 p-3 text-center">
                                            <div className="text-2xl font-bold text-yellow-400">
                                                {solenoidCount}
                                            </div>
                                            <div className="text-xs text-gray-400">Solenoids</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Irrigation Points */}
                                <div>
                                    <h3 className="mb-3 text-lg font-semibold text-cyan-400">
                                        💧 Irrigation System
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-lg bg-gray-700 p-3 text-center">
                                            <div className="text-2xl font-bold text-green-400">
                                                {sprinklerPoints}
                                            </div>
                                            <div className="text-xs text-gray-400">Sprinklers</div>
                                        </div>
                                        <div className="rounded-lg bg-gray-700 p-3 text-center">
                                            <div className="text-2xl font-bold text-blue-400">
                                                {miniSprinklerPoints}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Mini Sprinklers
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-gray-700 p-3 text-center">
                                            <div className="text-2xl font-bold text-orange-400">
                                                {microSprayPoints}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Micro Sprays
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-gray-700 p-3 text-center">
                                            <div className="text-2xl font-bold text-cyan-400">
                                                {dripLines}
                                            </div>
                                            <div className="text-xs text-gray-400">Drip Lines</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Summary */}
                            <div className="rounded-lg bg-gray-800 p-6">
                                <h2 className="mb-4 text-2xl font-bold text-green-400">
                                    💰 Financial Summary
                                </h2>
                                <div className="space-y-4">
                                    <div className="rounded-lg bg-gray-700 p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400">
                                                Total Estimated Yield
                                            </span>
                                            <span className="text-2xl font-bold text-yellow-400">
                                                {totalEstimatedYield.toLocaleString()} kg
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400">
                                                Total Estimated Income
                                            </span>
                                            <span className="text-2xl font-bold text-green-400">
                                                ฿{totalEstimatedIncome.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400">
                                                Total Planting Points
                                            </span>
                                            <span className="text-2xl font-bold text-blue-400">
                                                {totalPlantingPoints.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="rounded-lg bg-gray-800 p-6">
                                <h2 className="mb-4 text-2xl font-bold text-purple-400">
                                    📋 Actions
                                </h2>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Link
                                        href="/field-map"
                                        className="rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-700"
                                    >
                                        🔄 Edit Project
                                    </Link>
                                    <button
                                        onClick={() => window.print()}
                                        className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700"
                                    >
                                        🖨️ Print Summary
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Panel - Map Visualization */}
                        <div className="overflow-hidden rounded-lg bg-gray-800">
                            <div className="flex h-full flex-col">
                                {/* Map Header */}
                                <div className="border-b border-gray-600 bg-gray-700 p-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-white">
                                            🗺️ Project Map Overview
                                        </h3>
                                                                            <div className="text-sm text-gray-300">
                                        Zoom: {optimalZoom} | Area: {areaInRai.toFixed(2)} Rai | Center: {optimalCenter[0].toFixed(4)}, {optimalCenter[1].toFixed(4)}
                                    </div>
                                    </div>
                                </div>
                                {/* MapContainer แบบ lock interaction */}
                                <div className="relative flex-1" style={{ minHeight: 400 }}>
                                    <MapContainer
                                        center={optimalCenter}
                                        zoom={optimalZoom}
                                        style={{ height: '600px', width: '100%' }}
                                        dragging={true}
                                        scrollWheelZoom={true}
                                        doubleClickZoom={true}
                                        zoomControl={true}
                                        attributionControl={false}
                                        minZoom={18}
                                        maxZoom={20}
                                    >
                                        <TileLayer
                                            attribution={MAP_TILES[mapType].attribution}
                                            url={MAP_TILES[mapType].url}
                                            maxZoom={20}
                                            maxNativeZoom={20}
                                            keepBuffer={4}
                                        />
                                        <FeatureGroup>
                                            {/* Field Boundary */}
                                            {mainField && mainField.coordinates && (
                                                <Polygon
                                                    positions={mainField.coordinates}
                                                    pathOptions={{
                                                        color: '#22C55E',
                                                        fillColor: '#22C55E',
                                                        fillOpacity: 0.2,
                                                    }}
                                                />
                                            )}
                                            {/* Zones */}
                                            {actualZones.map((zone, index) =>
                                                zone.coordinates ? (
                                                    <Polygon
                                                        key={zone.id}
                                                        positions={zone.coordinates}
                                                        pathOptions={{
                                                            color: zone.color,
                                                            fillColor: zone.color,
                                                            fillOpacity: 0.3,
                                                        }}
                                                    />
                                                ) : null
                                            )}
                                            {/* Pipes */}
                                            {actualPipes.map((pipe, index) =>
                                                pipe.coordinates ? (
                                                    <Polyline
                                                        key={pipe.id}
                                                        positions={pipe.coordinates}
                                                        pathOptions={{
                                                            color: '#2563eb',
                                                            weight: 3,
                                                            opacity: 0.7,
                                                        }}
                                                    />
                                                ) : null
                                            )}
                                            {/* Equipment */}
                                            {actualEquipmentIcons.map((equipment, index) =>
                                                equipment.position ? (
                                                    <Marker
                                                        key={equipment.id}
                                                        position={equipment.position}
                                                        icon={L.divIcon({
                                                            className: 'equipment-marker-icon',
                                                            html: `<span style='font-size:24px;'>${equipment.type === 'pump' ? '💧' : '🔧'}</span>`,
                                                        })}
                                                    />
                                                ) : null
                                            )}
                                            {/* Irrigation Points */}
                                            {actualIrrigationPoints.map((point, index) =>
                                                point.position ? (
                                                    <CircleMarker
                                                        key={point.id}
                                                        center={point.position}
                                                        radius={4}
                                                        pathOptions={{
                                                            color: '#0ea5e9',
                                                            fillColor: '#38bdf8',
                                                            fillOpacity: 1,
                                                            weight: 1,
                                                        }}
                                                    />
                                                ) : null
                                            )}
                                        </FeatureGroup>
                                    </MapContainer>
                                </div>
                                {/* Map Legend */}
                                <div className="border-t border-gray-600 bg-gray-700 p-4">
                                    <h4 className="mb-2 text-sm font-semibold text-white">
                                        Legend
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center space-x-2">
                                            <div className="h-3 w-3 rounded bg-green-500"></div>
                                            <span className="text-gray-300">Field Boundary</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="h-3 w-3 rounded bg-blue-500"></div>
                                            <span className="text-gray-300">Zones</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="h-3 w-3 rounded bg-red-500"></div>
                                            <span className="text-gray-300">Pipes</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="h-3 w-3 rounded bg-yellow-500"></div>
                                            <span className="text-gray-300">Equipment</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="h-3 w-3 rounded bg-cyan-500"></div>
                                            <span className="text-gray-300">Irrigation</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="h-3 w-3 rounded bg-purple-500"></div>
                                            <span className="text-gray-300">Planting Points</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
