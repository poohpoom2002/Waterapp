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
    Circle,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { getCropByValue } from '@/pages/utils/cropData';
import {
    ZONE_COLORS,
    OBSTACLE_TYPES,
    PIPE_TYPES,
    MAP_TILES,
    EQUIPMENT_TYPES,
    type PipeType,
    type EquipmentType,
    type ObstacleType,
} from '@/pages/utils/fieldMapConstants';

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
    const dripPoints = actualIrrigationPoints.filter((p) => p.type === 'drip_tape').length;
    const dripLines = actualIrrigationLines.filter((l) => l.type === 'drip_tape').length;

    // Calculate drip tape statistics
    const dripTapeSummary = actualIrrigationPoints.find((p) => p.type === 'drip_tape');
    const totalDripHoles = dripTapeSummary ? dripTapeSummary.totalHoles || 0 : 0;

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

    // Create custom equipment icons for map display
    const createEquipmentIcon = (equipment: any) => {
        const equipmentConfig = EQUIPMENT_TYPES[equipment.type];
        if (!equipmentConfig) return null;

        // Use images for pump, ballvalve, solenoid; fallback to icon for others
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
            iconHtml = `<img src="${imgSrc}" alt="${equipmentConfig.name}" style="width:20px;height:20px;object-fit:contain;display:block;margin:auto;" />`;
        } else {
            iconHtml = `<span style="font-size: 12px;">${equipmentConfig.icon}</span>`;
        }

        return L.divIcon({
            html: `<div style="background: white; border: 2px solid ${equipmentConfig.color}; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${iconHtml}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            className: 'equipment-marker-icon',
        });
    };

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
        <div className="min-h-screen bg-gray-900 text-white print:bg-white print:text-black">
            <Head title="Field Crop Summary - Irrigation Planning" />

            {/* Header */}
            <div className="border-b border-gray-700 bg-gray-800 print:hidden print:border-gray-300 print:bg-white">
                <div className="container mx-auto px-4 py-4">
                    <div className="mx-auto max-w-7xl">
                        {/* Back Navigation */}
                        <Link
                            href="/field-map"
                            className="mb-2 inline-flex items-center text-blue-400 hover:text-blue-300"
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
                        <h1 className="mb-1 text-3xl font-bold">📊 Field Crop Summary</h1>
                        <p className="mb-4 text-gray-400">
                            Complete overview of your irrigation planning project
                        </p>
                    </div>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:mb-4 print:block">
                <h1 className="text-2xl font-bold text-black">📊 Field Crop Summary</h1>
                <p className="text-gray-600">
                    Complete overview of your irrigation planning project
                </p>
                <hr className="my-2 border-gray-300" />
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-4 print:px-0 print:py-0">
                <div className="mx-auto max-w-7xl">
                    {/* Single Column Layout for Print */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-1 print:gap-2">
                        {/* Project Overview & Crop Info */}
                        <div className="space-y-4 print:space-y-2">
                            {/* Project Overview */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                <h2 className="mb-3 text-lg font-bold text-green-400 print:text-base print:text-black">
                                    🏡 Project Overview
                                </h2>
                                <div className="grid grid-cols-4 gap-2 print:gap-1">
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                        <div className="text-lg font-bold text-blue-400 print:text-sm print:text-black">
                                            {areaInRai.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-gray-600">
                                            ไร่
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                        <div className="text-lg font-bold text-green-400 print:text-sm print:text-black">
                                            {totalZones}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-gray-600">
                                            โซน
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                        <div className="text-lg font-bold text-purple-400 print:text-sm print:text-black">
                                            {totalPlantingPoints.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-gray-600">
                                            จุดปลูก
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                        <div className="text-lg font-bold text-yellow-400 print:text-sm print:text-black">
                                            {totalEstimatedYield.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-gray-600">
                                            กก.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Crop Information */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                <h2 className="mb-3 text-lg font-bold text-green-400 print:text-base print:text-black">
                                    🌱 Crop Information
                                </h2>
                                <div className="space-y-2 print:space-y-1">
                                    {selectedCropObjects.map(
                                        (crop, index) =>
                                            crop && (
                                                <div
                                                    key={crop.value}
                                                    className="rounded-lg bg-gray-700 p-2 print:border print:border-gray-200 print:bg-gray-50 print:p-1"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-lg print:text-sm">
                                                                {crop.icon}
                                                            </span>
                                                            <div>
                                                                <h3 className="text-sm font-semibold text-white print:text-xs print:text-black">
                                                                    {crop.name}
                                                                </h3>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                                แถว:{' '}
                                                                {rowSpacing[crop.value] ||
                                                                    crop.spacing ||
                                                                    1.5}
                                                                m
                                                            </div>
                                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                                ต้น:{' '}
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

                            {/* Infrastructure Summary */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                <h2 className="mb-3 text-lg font-bold text-purple-400 print:text-base print:text-black">
                                    🔧 Infrastructure Summary
                                </h2>

                                {/* Pipes */}
                                <div className="mb-3">
                                    <h3 className="mb-2 text-sm font-semibold text-blue-400 print:text-xs print:text-black">
                                        📏 Pipe System
                                    </h3>
                                    <div className="grid grid-cols-3 gap-1">
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-blue-400 print:text-xs print:text-black">
                                                {mainPipes}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Main
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-green-400 print:text-xs print:text-black">
                                                {submainPipes}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Submain
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-purple-400 print:text-xs print:text-black">
                                                {lateralPipes}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Lateral
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Equipment */}
                                <div className="mb-3">
                                    <h3 className="mb-2 text-sm font-semibold text-orange-400 print:text-xs print:text-black">
                                        ⚙️ Equipment
                                    </h3>
                                    <div className="grid grid-cols-3 gap-1">
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-orange-400 print:text-xs print:text-black">
                                                {pumpCount}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Pumps
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-red-400 print:text-xs print:text-black">
                                                {valveCount}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Valves
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-yellow-400 print:text-xs print:text-black">
                                                {solenoidCount}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Solenoids
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Irrigation Points */}
                                <div>
                                    <h3 className="mb-2 text-sm font-semibold text-cyan-400 print:text-xs print:text-black">
                                        💧 Irrigation System
                                    </h3>
                                    <div className="grid grid-cols-2 gap-1">
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-green-400 print:text-xs print:text-black">
                                                {sprinklerPoints}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Sprinklers
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-blue-400 print:text-xs print:text-black">
                                                {miniSprinklerPoints}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Mini Sprinklers
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-orange-400 print:text-xs print:text-black">
                                                {microSprayPoints}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Micro Sprays
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50">
                                            <div className="text-sm font-bold text-cyan-400 print:text-xs print:text-black">
                                                {dripPoints + dripLines}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-gray-600">
                                                Drip Points
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Summary */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                <h2 className="mb-3 text-lg font-bold text-green-400 print:text-base print:text-black">
                                    💰 Financial Summary
                                </h2>
                                <div className="space-y-2 print:space-y-1">
                                    <div className="rounded-lg bg-gray-700 p-2 print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400 print:text-xs print:text-gray-600">
                                                Total Estimated Yield
                                            </span>
                                            <span className="text-sm font-bold text-yellow-400 print:text-xs print:text-black">
                                                {totalEstimatedYield.toLocaleString()} kg
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 print:border print:border-gray-200 print:bg-gray-50 print:p-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400 print:text-xs print:text-gray-600">
                                                Total Estimated Income
                                            </span>
                                            <span className="text-sm font-bold text-green-400 print:text-xs print:text-black">
                                                ฿{totalEstimatedIncome.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="rounded-lg bg-gray-800 p-4 print:hidden">
                                <h2 className="mb-3 text-lg font-bold text-purple-400">
                                    📋 Actions
                                </h2>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <Link
                                        href="/field-map"
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-center font-semibold text-white transition-colors hover:bg-blue-700"
                                    >
                                        🔄 Edit Project
                                    </Link>
                                    <button
                                        onClick={() => window.print()}
                                        className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-green-700"
                                    >
                                        🖨️ Print Summary
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Zone Details & Map */}
                        <div className="space-y-4 print:space-y-2">
                            {/* Zone Details */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-3">
                                <h2 className="mb-3 text-lg font-bold text-blue-400 print:text-base print:text-black">
                                    🎯 Zone Details
                                </h2>
                                <div className="space-y-2 print:space-y-1">
                                    {actualZones.map((zone, index) => {
                                        const summary = zoneSummaries[zone.id];
                                        const assignedCrop = zoneAssignments[zone.id]
                                            ? getCropByValue(zoneAssignments[zone.id])
                                            : null;
                                        const irrigationType = irrigationAssignments[zone.id];

                                        return (
                                            <div
                                                key={zone.id}
                                                className="rounded-lg bg-gray-700 p-2 print:border print:border-gray-200 print:bg-gray-50 print:p-1"
                                            >
                                                <div className="mb-1 flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <div
                                                            className="h-2 w-2 rounded-full border border-white/20 print:border-gray-400"
                                                            style={{ backgroundColor: zone.color }}
                                                        ></div>
                                                        <h3 className="text-sm font-semibold text-white print:text-xs print:text-black">
                                                            {zone.name}
                                                        </h3>
                                                    </div>
                                                    {assignedCrop && (
                                                        <span className="text-sm print:text-xs">
                                                            {assignedCrop.icon}
                                                        </span>
                                                    )}
                                                </div>

                                                {summary && (
                                                    <div className="grid grid-cols-2 gap-2 text-xs print:gap-1 print:text-xs">
                                                        <div>
                                                            <div className="text-gray-400 print:text-gray-600">
                                                                Crop
                                                            </div>
                                                            <div className="font-semibold text-white print:text-black">
                                                                {summary.cropName}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400 print:text-gray-600">
                                                                Points
                                                            </div>
                                                            <div className="font-semibold text-green-400 print:text-black">
                                                                {summary.totalPlantingPoints.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400 print:text-gray-600">
                                                                Yield
                                                            </div>
                                                            <div className="font-semibold text-yellow-400 print:text-black">
                                                                {summary.estimatedYield.toLocaleString()}{' '}
                                                                kg
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400 print:text-gray-600">
                                                                Income
                                                            </div>
                                                            <div className="font-semibold text-green-400 print:text-black">
                                                                ฿
                                                                {summary.estimatedPrice.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        {irrigationType && (
                                                            <div className="col-span-2">
                                                                <div className="text-gray-400 print:text-gray-600">
                                                                    Irrigation
                                                                </div>
                                                                <div className="font-semibold text-cyan-400 print:text-black">
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
                                                                              ? '💧 Drip Points'
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

                            {/* Map Visualization */}
                            <div className="overflow-hidden rounded-lg bg-gray-800 print:border print:border-gray-300 print:bg-white">
                                <div className="flex h-full flex-col">
                                    {/* Map Header */}
                                    <div className="border-b border-gray-600 bg-gray-700 p-2 print:border-gray-300 print:bg-gray-100 print:p-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-white print:text-xs print:text-black">
                                                🗺️ Project Map Overview
                                            </h3>
                                            <div className="text-xs text-gray-300 print:text-xs print:text-gray-600">
                                                Area: {areaInRai.toFixed(2)} Rai
                                            </div>
                                        </div>
                                    </div>
                                    {/* MapContainer */}
                                    <div
                                        className="relative print:h-64"
                                        style={{ minHeight: 300, height: '400px' }}
                                    >
                                        <MapContainer
                                            center={optimalCenter}
                                            zoom={optimalZoom}
                                            style={{ height: '100%', width: '100%' }}
                                            dragging={true}
                                            scrollWheelZoom={true}
                                            doubleClickZoom={true}
                                            zoomControl={true}
                                            attributionControl={false}
                                            minZoom={optimalZoom - 2}
                                            maxZoom={optimalZoom + 2}
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
                                                            weight: 2,
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
                                                                weight: 2,
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
                                                                color:
                                                                    pipe.type === 'main'
                                                                        ? '#2563eb'
                                                                        : pipe.type === 'submain'
                                                                          ? '#059669'
                                                                          : '#8b5cf6',
                                                                weight:
                                                                    pipe.type === 'main'
                                                                        ? 4
                                                                        : pipe.type === 'submain'
                                                                          ? 3
                                                                          : 2,
                                                                opacity: 0.8,
                                                            }}
                                                        />
                                                    ) : null
                                                )}
                                                {/* Equipment with proper icons */}
                                                {actualEquipmentIcons.map((equipment, index) => {
                                                    if (!equipment.lat || !equipment.lng)
                                                        return null;

                                                    const customIcon =
                                                        createEquipmentIcon(equipment);
                                                    if (!customIcon) return null;

                                                    return (
                                                        <Marker
                                                            key={equipment.id}
                                                            position={[
                                                                equipment.lat,
                                                                equipment.lng,
                                                            ]}
                                                            icon={customIcon}
                                                        />
                                                    );
                                                })}
                                                {/* Irrigation Points */}
                                                {actualIrrigationPoints.map((point, index) => {
                                                    if (!point.position) return null;

                                                    const [lat, lng] = Array.isArray(point.position)
                                                        ? point.position
                                                        : [point.position.lat, point.position.lng];

                                                    return (
                                                        <CircleMarker
                                                            key={point.id}
                                                            center={[lat, lng]}
                                                            radius={4}
                                                            pathOptions={{
                                                                color:
                                                                    point.type === 'sprinkler'
                                                                        ? '#22C55E'
                                                                        : point.type ===
                                                                            'mini_sprinkler'
                                                                          ? '#3B82F6'
                                                                          : point.type ===
                                                                              'micro_spray'
                                                                            ? '#F59E0B'
                                                                            : '#06B6D4',
                                                                fillColor:
                                                                    point.type === 'sprinkler'
                                                                        ? '#22C55E'
                                                                        : point.type ===
                                                                            'mini_sprinkler'
                                                                          ? '#3B82F6'
                                                                          : point.type ===
                                                                              'micro_spray'
                                                                            ? '#F59E0B'
                                                                            : '#06B6D4',
                                                                fillOpacity: 1,
                                                                weight: 2,
                                                            }}
                                                        />
                                                    );
                                                })}
                                                {/* Irrigation Lines (Drip Tape) */}
                                                {actualIrrigationLines.map((line, index) =>
                                                    line.coordinates ? (
                                                        <Polyline
                                                            key={line.id}
                                                            positions={line.coordinates}
                                                            pathOptions={{
                                                                color: '#06B6D4',
                                                                weight: 3,
                                                                opacity: 0.8,
                                                            }}
                                                        />
                                                    ) : null
                                                )}
                                                {/* Coverage Circles for Sprinklers */}
                                                {actualIrrigationPoints.map((point, index) => {
                                                    if (
                                                        !point.position ||
                                                        !point.radius ||
                                                        point.type === 'drip_tape'
                                                    )
                                                        return null;

                                                    const [lat, lng] = Array.isArray(point.position)
                                                        ? point.position
                                                        : [point.position.lat, point.position.lng];

                                                    return (
                                                        <Circle
                                                            key={`${point.id}-coverage`}
                                                            center={[lat, lng]}
                                                            radius={point.radius}
                                                            pathOptions={{
                                                                color:
                                                                    point.type === 'sprinkler'
                                                                        ? '#22C55E'
                                                                        : point.type ===
                                                                            'mini_sprinkler'
                                                                          ? '#3B82F6'
                                                                          : point.type ===
                                                                              'micro_spray'
                                                                            ? '#F59E0B'
                                                                            : '#06B6D4',
                                                                fillColor:
                                                                    point.type === 'sprinkler'
                                                                        ? '#22C55E'
                                                                        : point.type ===
                                                                            'mini_sprinkler'
                                                                          ? '#3B82F6'
                                                                          : point.type ===
                                                                              'micro_spray'
                                                                            ? '#F59E0B'
                                                                            : '#06B6D4',
                                                                fillOpacity: 0.1,
                                                                weight: 1,
                                                                opacity: 0.4,
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </FeatureGroup>
                                        </MapContainer>
                                    </div>
                                    {/* Map Legend */}
                                    <div className="border-t border-gray-600 bg-gray-700 p-2 print:border-gray-300 print:bg-gray-100 print:p-1">
                                        <h4 className="mb-1 text-xs font-semibold text-white print:text-black">
                                            Legend
                                        </h4>
                                        <div className="grid grid-cols-3 gap-1 text-xs print:grid-cols-6">
                                            <div className="flex items-center space-x-1">
                                                <div className="h-2 w-2 rounded bg-green-500"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Field
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="h-2 w-2 rounded bg-blue-500"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Zones
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="h-2 w-2 rounded bg-red-500"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Pipes
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="h-2 w-2 rounded bg-yellow-500"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Equipment
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="h-2 w-2 rounded bg-cyan-500"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Irrigation
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="h-2 w-2 rounded bg-purple-500"></div>
                                                <span className="text-gray-300 print:text-gray-700">
                                                    Coverage
                                                </span>
                                            </div>
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
