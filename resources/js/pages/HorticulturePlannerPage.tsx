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
import { router } from '@inertiajs/react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

import {
    FaTree,
    FaUndo,
    FaRedo,
    FaEdit,
    FaTrash,
    FaPlus,
    FaSave,
    FaTimes,
    FaArrowsAlt,
    FaCog,
    FaSearch,
    FaSpinner,
    FaLink,
    FaUnlink,
} from 'react-icons/fa';

const isPointInPolygon = (
    point: { lat: number; lng: number },
    polygon: { lat: number; lng: number }[]
): boolean => {
    if (!point || !polygon || polygon.length < 3) return false;

    try {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lat;
            const yi = polygon[i].lng;
            const xj = polygon[j].lat;
            const yj = polygon[j].lng;

            const intersect =
                yi > point.lng !== yj > point.lng &&
                point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
        return inside;
    } catch (error) {
        console.error('Error checking point in polygon:', error);
        return false;
    }
};

const calculatePipeLength = (coordinates: { lat: number; lng: number }[]): number => {
    if (!coordinates || coordinates.length < 2) return 0;

    try {
        let totalLength = 0;
        for (let i = 1; i < coordinates.length; i++) {
            totalLength += calculateDistanceBetweenPoints(coordinates[i - 1], coordinates[i]);
        }
        return totalLength;
    } catch (error) {
        console.error('Error calculating pipe length:', error);
        return 0;
    }
};

const calculateDistanceBetweenPoints = (
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
): number => {
    try {
        const R = 6371000;
        const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
        const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((point1.lat * Math.PI) / 180) *
                Math.cos((point2.lat * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.max(0, R * c);
    } catch (error) {
        console.error('Error calculating distance:', error);
        return 0;
    }
};

const generateUniqueId = (prefix: string = 'id'): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}-${timestamp}-${random}`;
};

const calculateAreaFromCoordinates = (coordinates: { lat: number; lng: number }[]): number => {
    if (!coordinates || coordinates.length < 3) return 0;

    try {
        let area = 0;
        for (let i = 0; i < coordinates.length; i++) {
            const j = (i + 1) % coordinates.length;
            area += coordinates[i].lat * coordinates[j].lng;
            area -= coordinates[j].lat * coordinates[i].lng;
        }
        area = Math.abs(area) / 2;

        const avgLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0) / coordinates.length;
        const latFactor = 111000;
        const lngFactor = 111000 * Math.cos((avgLat * Math.PI) / 180);

        const areaInSquareMeters = area * latFactor * lngFactor;
        return Math.max(0, areaInSquareMeters);
    } catch (error) {
        console.error('Error calculating area:', error);
        return 0;
    }
};

const interpolatePositionAlongPipe = (
    coordinates: { lat: number; lng: number }[],
    targetDistance: number
): { lat: number; lng: number } | null => {
    if (!coordinates || coordinates.length < 2 || targetDistance < 0) return null;

    try {
        let accumulatedDistance = 0;

        for (let i = 1; i < coordinates.length; i++) {
            const segmentLength = calculateDistanceBetweenPoints(
                coordinates[i - 1],
                coordinates[i]
            );

            if (accumulatedDistance + segmentLength >= targetDistance) {
                const segmentProgress =
                    segmentLength > 0 ? (targetDistance - accumulatedDistance) / segmentLength : 0;

                return {
                    lat:
                        coordinates[i - 1].lat +
                        (coordinates[i].lat - coordinates[i - 1].lat) * segmentProgress,
                    lng:
                        coordinates[i - 1].lng +
                        (coordinates[i].lng - coordinates[i - 1].lng) * segmentProgress,
                };
            }

            accumulatedDistance += segmentLength;
        }

        return coordinates[coordinates.length - 1];
    } catch (error) {
        console.error('Error interpolating position:', error);
        return null;
    }
};

const findClosestPointOnPipe = (
    position: { lat: number; lng: number },
    pipeCoordinates: { lat: number; lng: number }[]
): { position: { lat: number; lng: number }; distance: number; segmentIndex: number } | null => {
    if (!pipeCoordinates || pipeCoordinates.length < 2) return null;

    let closestPoint: { lat: number; lng: number } | null = null;
    let minDistance = Infinity;
    let bestSegmentIndex = 0;

    for (let i = 0; i < pipeCoordinates.length - 1; i++) {
        const segmentStart = pipeCoordinates[i];
        const segmentEnd = pipeCoordinates[i + 1];

        const segmentLength = calculateDistanceBetweenPoints(segmentStart, segmentEnd);
        if (segmentLength === 0) continue;

        const t = Math.max(
            0,
            Math.min(
                1,
                ((position.lat - segmentStart.lat) * (segmentEnd.lat - segmentStart.lat) +
                    (position.lng - segmentStart.lng) * (segmentEnd.lng - segmentStart.lng)) /
                    ((segmentLength * segmentLength) / (111000 * 111000))
            )
        );

        const closestOnSegment = {
            lat: segmentStart.lat + t * (segmentEnd.lat - segmentStart.lat),
            lng: segmentStart.lng + t * (segmentEnd.lng - segmentStart.lng),
        };

        const distance = calculateDistanceBetweenPoints(position, closestOnSegment);

        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = closestOnSegment;
            bestSegmentIndex = i;
        }
    }

    return closestPoint
        ? {
              position: closestPoint,
              distance: minDistance,
              segmentIndex: bestSegmentIndex,
          }
        : null;
};

const generateEnhancedBranchPipes = (
    subMainCoordinates: { lat: number; lng: number }[],
    zone: any,
    plantData: any,
    exclusions: any[],
    mainArea: { lat: number; lng: number }[],
    useZones?: boolean,
    branchSettings?: any
): any[] => {
    const branchPipes: any[] = [];
    const pipeLength = calculatePipeLength(subMainCoordinates);

    const settings = branchSettings || {
        defaultAngle: 90,
        maxAngle: 180,
        minAngle: 0,
        angleStep: 1,
    };

    let targetArea: { lat: number; lng: number }[];
    let zoneName: string;

    if (useZones && zone.coordinates && zone.coordinates.length > 0) {
        targetArea = zone.coordinates;
        zoneName = zone.name;
    } else {
        targetArea = mainArea;
        zoneName = 'พื้นที่หลัก';
    }

    if (!targetArea || targetArea.length < 3) {
        console.error('❌ Invalid target area for enhanced branch generation');
        return [];
    }

    const exactRowSpacing = plantData.rowSpacing;
    const numberOfBranches = Math.max(2, Math.floor(pipeLength / exactRowSpacing) + 1);

    for (let i = 0; i < numberOfBranches; i++) {
        const distanceFromStart = exactRowSpacing * 0.5 + i * exactRowSpacing;
        if (distanceFromStart > pipeLength) break;

        const position = interpolatePositionAlongPipe(subMainCoordinates, distanceFromStart);

        if (position) {
            const segmentIndex = Math.max(
                0,
                Math.min(
                    Math.floor((distanceFromStart / pipeLength) * (subMainCoordinates.length - 1)),
                    subMainCoordinates.length - 2
                )
            );

            const direction = calculatePipeDirection(subMainCoordinates, segmentIndex);
            const perpendicular = calculatePerpendicularDirection(direction);

            ['left', 'right'].forEach((side, sideIndex) => {
                const multiplier = sideIndex === 0 ? -1 : 1;
                const branchAngle = settings.defaultAngle;
                const adjustedDirection = rotatePerpendicular(perpendicular, branchAngle - 90);

                const optimalDistance = calculateOptimalDistanceToPolygonBoundary(
                    position,
                    adjustedDirection,
                    multiplier,
                    targetArea,
                    plantData.plantSpacing
                );

                if (optimalDistance >= 15) {
                    const endPosition = calculateBranchEndPosition(
                        position,
                        adjustedDirection,
                        multiplier,
                        optimalDistance
                    );

                    const startInTargetArea = isPointInPolygon(position, targetArea);
                    const endInTargetArea = isPointInPolygon(endPosition, targetArea);

                    if (startInTargetArea && endInTargetArea) {
                        const branchCoordinates = [position, endPosition];
                        const plants = generateOptimalSpacingPlants(
                            branchCoordinates,
                            plantData,
                            exclusions,
                            targetArea
                        );

                        const branchPipe = {
                            id: generateUniqueId('branch'),
                            subMainPipeId: '',
                            coordinates: branchCoordinates,
                            length: calculatePipeLength(branchCoordinates),
                            diameter: 25,
                            plants,
                            isEditable: true,
                            sprinklerType: 'standard',
                            angle: branchAngle,
                            connectionPoint: distanceFromStart / pipeLength,
                        };

                        branchPipes.push(branchPipe);
                    }
                }
            });
        }
    }

    return branchPipes;
};

const calculatePipeDirection = (
    coordinates: { lat: number; lng: number }[],
    segmentIndex: number
) => {
    const start = coordinates[segmentIndex];
    const end = coordinates[Math.min(segmentIndex + 1, coordinates.length - 1)];
    return { lat: end.lat - start.lat, lng: end.lng - start.lng };
};

const calculatePerpendicularDirection = (direction: { lat: number; lng: number }) => {
    const perpendicular = { lat: -direction.lng, lng: direction.lat };
    const length = Math.sqrt(perpendicular.lat ** 2 + perpendicular.lng ** 2);
    return length > 0
        ? { lat: perpendicular.lat / length, lng: perpendicular.lng / length }
        : { lat: 0, lng: 1 };
};

const rotatePerpendicular = (direction: { lat: number; lng: number }, angleDegrees: number) => {
    const angleRad = (angleDegrees * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return {
        lat: direction.lat * cos - direction.lng * sin,
        lng: direction.lat * sin + direction.lng * cos,
    };
};

const calculateOptimalDistanceToPolygonBoundary = (
    startPoint: { lat: number; lng: number },
    direction: { lat: number; lng: number },
    multiplier: number,
    polygon: { lat: number; lng: number }[],
    plantSpacing: number
): number => {
    if (!polygon || polygon.length < 3) return 0;

    try {
        const maxTestDistance = 500;
        let low = 0;
        let high = maxTestDistance;
        let maxValidDistance = 0;

        while (high - low > 0.1) {
            const mid = (low + high) / 2;
            const testPoint = calculateBranchEndPosition(startPoint, direction, multiplier, mid);

            if (isPointInPolygon(testPoint, polygon)) {
                maxValidDistance = mid;
                low = mid;
            } else {
                high = mid;
            }
        }

        const startBufferFromSubMain = plantSpacing * 0.5;
        const availableLengthForPlants = maxValidDistance - startBufferFromSubMain;

        if (availableLengthForPlants <= 0) return 0;

        const numberOfPlantsOnBranch = Math.max(
            1,
            Math.floor(availableLengthForPlants / plantSpacing) + 1
        );
        const optimalBranchLength =
            startBufferFromSubMain + (numberOfPlantsOnBranch - 1) * plantSpacing;
        return Math.min(optimalBranchLength, maxValidDistance);
    } catch (error) {
        console.error('Error calculating optimal distance to boundary:', error);
        return 0;
    }
};

const calculateBranchEndPosition = (
    startPos: { lat: number; lng: number },
    direction: { lat: number; lng: number },
    multiplier: number,
    length: number
) => {
    return {
        lat: startPos.lat + (direction.lat * multiplier * length) / 111000,
        lng:
            startPos.lng +
            (direction.lng * multiplier * length) /
                (111000 * Math.cos((startPos.lat * Math.PI) / 180)),
    };
};

const generateOptimalSpacingPlants = (
    pipeCoordinates: { lat: number; lng: number }[],
    plantData: any,
    exclusionAreas: any[] = [],
    zoneCoordinates: { lat: number; lng: number }[]
): any[] => {
    if (!pipeCoordinates || pipeCoordinates.length < 2 || !plantData) return [];

    try {
        const plants: any[] = [];
        const pipeLength = calculatePipeLength(pipeCoordinates);
        const exactSpacing = plantData.plantSpacing;
        const startBuffer = exactSpacing * 0.5;
        const availableLength = pipeLength - startBuffer;
        const numberOfPlants = Math.max(1, Math.floor(availableLength / exactSpacing) + 1);

        for (let i = 0; i < numberOfPlants; i++) {
            const exactDistanceOnPipe = startBuffer + i * exactSpacing;
            if (exactDistanceOnPipe > pipeLength) break;

            const position = interpolatePositionAlongPipe(pipeCoordinates, exactDistanceOnPipe);

            if (position) {
                const inZone = isPointInPolygon(position, zoneCoordinates);
                const inExclusion = exclusionAreas.some((exclusion) =>
                    isPointInPolygon(position, exclusion.coordinates)
                );

                if (inZone && !inExclusion) {
                    plants.push({
                        id: generateUniqueId('plant'),
                        position,
                        plantData,
                        isSelected: false,
                        isEditable: true,
                        health: 'good',
                    });
                }
            }
        }

        return plants;
    } catch (error) {
        console.error('Error generating enhanced optimal spacing plants:', error);
        return [];
    }
};

const extractCoordinatesFromLayer = (layer: any): { lat: number; lng: number }[] => {
    try {
        let coordinates: { lat: number; lng: number }[] = [];

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

// Interface definitions
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
    angle?: number;
    connectionPoint?: number;
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
    zoneId?: string;
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
    spacingValidationStats: {
        totalBranches: number;
        averageRowSpacing: number;
        averagePlantSpacing: number;
        spacingAccuracy: number;
    };
    areaUtilizationStats: {
        totalBranches: number;
        averageUtilization: number;
        maxUtilization: number;
    };
    isEditModeEnabled: boolean;
    branchPipeSettings: {
        defaultAngle: number;
        maxAngle: number;
        minAngle: number;
        angleStep: number;
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

// Default data
const DEFAULT_PLANT_TYPES: PlantData[] = [
    { id: 1, name: 'มะม่วง', plantSpacing: 8, rowSpacing: 8, waterNeed: 50 },
    { id: 2, name: 'ทุเรียน', plantSpacing: 10, rowSpacing: 10, waterNeed: 80 },
    { id: 3, name: 'สับปะรด', plantSpacing: 1, rowSpacing: 1.2, waterNeed: 3 },
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

// Utility functions
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

const findZoneContainingPoint = (point: Coordinate, zones: Zone[]): Zone | null => {
    for (const zone of zones) {
        if (isPointInPolygon(point, zone.coordinates)) {
            return zone;
        }
    }
    return null;
};

const findZoneForPipe = (coordinates: Coordinate[], zones: Zone[]): Zone | null => {
    if (coordinates.length === 0) return null;
    const midIndex = Math.floor(coordinates.length / 2);
    const midPoint = coordinates[midIndex];
    const midZone = findZoneContainingPoint(midPoint, zones);
    if (midZone) return midZone;
    const startZone = findZoneContainingPoint(coordinates[0], zones);
    if (startZone) return startZone;
    const endZone = findZoneContainingPoint(coordinates[coordinates.length - 1], zones);
    return endZone;
};

const findTargetZoneForMainPipe = (
    coordinates: Coordinate[],
    zones: Zone[],
    useZones: boolean
): string => {
    if (!useZones || zones.length === 0) {
        return 'main-area';
    }
    const endPoint = coordinates[coordinates.length - 1];
    const targetZone = findZoneContainingPoint(endPoint, zones);
    return targetZone ? targetZone.id : zones[0].id;
};

const calculateExactSpacingStats = (subMainPipes: SubMainPipe[]) => {
    let totalBranches = 0;
    const totalRowSpacings: number[] = [];
    const totalPlantSpacings: number[] = [];

    subMainPipes.forEach((subMain) => {
        const branchCount = subMain.branchPipes.length;
        totalBranches += branchCount;

        if (branchCount > 1) {
            for (let i = 1; i < subMain.branchPipes.length; i++) {
                const prevBranch = subMain.branchPipes[i - 1];
                const currentBranch = subMain.branchPipes[i];

                const distance1 = calculateDistanceAlongPipe(
                    subMain.coordinates,
                    prevBranch.coordinates[0]
                );
                const distance2 = calculateDistanceAlongPipe(
                    subMain.coordinates,
                    currentBranch.coordinates[0]
                );
                const branchSpacing = Math.abs(distance2 - distance1);

                totalRowSpacings.push(branchSpacing);
            }
        }

        subMain.branchPipes.forEach((branch) => {
            if (branch.plants.length > 1) {
                for (let i = 1; i < branch.plants.length; i++) {
                    const plant1 = branch.plants[i - 1];
                    const plant2 = branch.plants[i];

                    const distance1 = calculateDistanceAlongPipe(
                        branch.coordinates,
                        plant1.position
                    );
                    const distance2 = calculateDistanceAlongPipe(
                        branch.coordinates,
                        plant2.position
                    );
                    const plantSpacing = Math.abs(distance2 - distance1);

                    totalPlantSpacings.push(plantSpacing);
                }
            }
        });
    });

    const averageRowSpacing =
        totalRowSpacings.length > 0
            ? totalRowSpacings.reduce((sum, spacing) => sum + spacing, 0) / totalRowSpacings.length
            : 0;

    const averagePlantSpacing =
        totalPlantSpacings.length > 0
            ? totalPlantSpacings.reduce((sum, spacing) => sum + spacing, 0) /
              totalPlantSpacings.length
            : 0;

    return {
        totalBranches,
        averageRowSpacing,
        averagePlantSpacing,
        spacingAccuracy: 100,
    };
};

const calculateDistanceAlongPipe = (pipeCoords: Coordinate[], targetPoint: Coordinate): number => {
    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < pipeCoords.length; i++) {
        const distance = Math.sqrt(
            Math.pow(pipeCoords[i].lat - targetPoint.lat, 2) +
                Math.pow(pipeCoords[i].lng - targetPoint.lng, 2)
        );
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
        }
    }

    let accumulatedDistance = 0;
    for (let i = 1; i <= closestIndex; i++) {
        const segmentDistance = calculateDistanceBetweenPoints(pipeCoords[i - 1], pipeCoords[i]);
        accumulatedDistance += segmentDistance;
    }

    return accumulatedDistance;
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

// Set up Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component definitions
const SearchControl: React.FC<{ onSearch: (lat: number, lng: number) => void }> = ({
    onSearch,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string>('');

    const handleSearchChange = useCallback(async (query: string) => {
        setSearchQuery(query);
        setSearchError('');

        if (query.length < 3) {
            setSuggestions([]);
            return;
        }

        setIsSearching(true);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                    `format=json&q=${encodeURIComponent(query)}&limit=8&` +
                    `countrycodes=th&addressdetails=1&dedupe=1&` +
                    `accept-language=th,en&bounded=0`,
                {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'HorticulturePlanner/1.0',
                        Accept: 'application/json',
                    },
                }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (Array.isArray(data)) {
                setSuggestions(data);
                if (data.length === 0) {
                    setSearchError('ไม่พบสถานที่ที่ค้นหา');
                }
            } else {
                setSuggestions([]);
                setSearchError('ข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง');
            }
        } catch (error: any) {
            console.error('Search error:', error);
            setSuggestions([]);

            if (error.name === 'AbortError') {
                setSearchError('การค้นหาใช้เวลานานเกินไป กรุณาลองใหม่');
            } else if (error.message.includes('fetch')) {
                setSearchError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
            } else {
                setSearchError('เกิดข้อผิดพลาดในการค้นหา');
            }
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleSuggestionClick = (item: any) => {
        setSearchQuery(item.display_name);
        setSuggestions([]);
        setSearchError('');
        onSearch(parseFloat(item.lat), parseFloat(item.lon));
    };

    return (
        <div className="absolute left-[60px] top-4 z-[1000] w-80">
            <div className="relative">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="ค้นหาสถานที่ในประเทศไทย..."
                        className="w-full rounded-t-lg bg-white py-3 pl-10 pr-10 text-gray-900 shadow-md focus:border-blue-500 focus:outline-none"
                    />
                    {isSearching && (
                        <FaSpinner className="absolute right-3 top-1/2 -translate-y-1/2 transform animate-spin text-blue-500" />
                    )}
                </div>

                {searchError && (
                    <div className="w-full border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-700">
                        ⚠️ {searchError}
                    </div>
                )}

                {suggestions.length > 0 && (
                    <ul className="absolute max-h-60 w-full overflow-y-auto rounded-b-lg border-t border-gray-200 bg-white shadow-lg">
                        {suggestions.map((item) => (
                            <li
                                key={item.place_id}
                                onClick={() => handleSuggestionClick(item)}
                                className="cursor-pointer border-b border-gray-100 p-3 text-sm text-gray-800 last:border-b-0 hover:bg-gray-100"
                            >
                                <div className="font-medium text-gray-900">
                                    {item.display_name.split(',')[0]}
                                </div>
                                <div className="mt-1 text-xs text-gray-600">
                                    {item.display_name}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
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
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium">ชื่อพืช *</label>
                            <input
                                type="text"
                                value={plantData.name}
                                onChange={(e) =>
                                    setPlantData({ ...plantData, name: e.target.value })
                                }
                                className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="เช่น มะม่วงพันธุ์ใหม่"
                            />
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
                        </div>
                    ))}
                </div>

                <div className="mt-4">
                    <button
                        onClick={onCreateCustomPlant}
                        className="w-full rounded bg-purple-600 px-4 py-2 text-sm transition-colors hover:bg-purple-700"
                    >
                        ➕ เพิ่มพืชใหม่
                    </button>
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

const EnhancedPlantEditModal = ({
    isOpen,
    onClose,
    plant,
    onSave,
    onDelete,
    availablePlants,
    isNewPlant = false,
    onCreateConnection,
}: {
    isOpen: boolean;
    onClose: () => void;
    plant: PlantLocation | null;
    onSave: (plantId: string, newPosition: Coordinate, newPlantData: PlantData) => void;
    onDelete: (plantId: string) => void;
    availablePlants: PlantData[];
    isNewPlant?: boolean;
    onCreateConnection?: (plantId: string) => void;
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

    const handleCreateConnection = () => {
        if (!plant || !onCreateConnection) return;
        onCreateConnection(plant.id);
        onClose();
    };

    const adjustPosition = (
        direction: 'up' | 'down' | 'left' | 'right',
        amount: number = 0.00001
    ) => {
        setPosition((prev) => {
            switch (direction) {
                case 'up':
                    return { ...prev, lat: prev.lat + amount };
                case 'down':
                    return { ...prev, lat: prev.lat - amount };
                case 'left':
                    return { ...prev, lng: prev.lng - amount };
                case 'right':
                    return { ...prev, lng: prev.lng + amount };
                default:
                    return prev;
            }
        });
    };

    if (!isOpen || !plant) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-gray-800 p-6 text-white">
                <h3 className="mb-4 text-xl font-semibold">
                    {isNewPlant ? '🌱 เพิ่มต้นไม้ใหม่' : '✏️ แก้ไขต้นไม้'}
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">ตำแหน่ง</label>

                        <div className="mb-3 rounded bg-gray-700 p-4">
                            <div className="mb-2 text-center text-sm text-gray-300">
                                ปรับตำแหน่งด้วยปุ่ม
                            </div>
                            <div className="mx-auto grid w-32 grid-cols-3 gap-2">
                                <div></div>
                                <button
                                    onClick={() => adjustPosition('up')}
                                    className="rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700"
                                >
                                    ↑
                                </button>
                                <div></div>
                                <button
                                    onClick={() => adjustPosition('left')}
                                    className="rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700"
                                >
                                    ←
                                </button>
                                <div className="flex items-center justify-center">
                                    <FaArrowsAlt className="text-gray-400" />
                                </div>
                                <button
                                    onClick={() => adjustPosition('right')}
                                    className="rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700"
                                >
                                    →
                                </button>
                                <div></div>
                                <button
                                    onClick={() => adjustPosition('down')}
                                    className="rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700"
                                >
                                    ↓
                                </button>
                                <div></div>
                            </div>
                        </div>

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

                    {/* New Connection Feature */}
                    {isNewPlant && onCreateConnection && (
                        <div className="rounded bg-blue-900/30 p-4">
                            <h4 className="mb-3 text-sm font-semibold text-blue-300">
                                🔗 เชื่อมต่อท่อย่อย
                            </h4>
                            <p className="mb-3 text-xs text-gray-300">
                                หลังจากบันทึกต้นไม้แล้ว
                                คุณสามารถสร้างท่อย่อยเชื่อมต่อไปยังท่อเมนรองหรือท่อย่อยอื่นได้
                            </p>
                            <button
                                onClick={handleCreateConnection}
                                className="w-full rounded bg-blue-600 px-4 py-2 text-sm transition-colors hover:bg-blue-700"
                            >
                                <FaLink className="mr-2 inline" />
                                สร้างท่อเชื่อมต่อ
                            </button>
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
                    {!isNewPlant && (
                        <button
                            onClick={handleDelete}
                            className="flex-1 rounded bg-red-600 px-4 py-2 transition-colors hover:bg-red-700"
                        >
                            <FaTrash className="mr-2 inline" />
                            ลบ
                        </button>
                    )}
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

const EnhancedPipeEditModal = ({
    isOpen,
    onClose,
    pipe,
    onSave,
    onDelete,
    type,
    branchSettings,
    onDeleteBranchPipe,
}: {
    isOpen: boolean;
    onClose: () => void;
    pipe: MainPipe | SubMainPipe | BranchPipe | null;
    onSave: (pipe: MainPipe | SubMainPipe | BranchPipe) => void;
    onDelete: (pipeId: string) => void;
    type: 'main' | 'subMain' | 'branch';
    branchSettings?: {
        defaultAngle: number;
        maxAngle: number;
        minAngle: number;
        angleStep: number;
    };
    onDeleteBranchPipe?: (branchId: string, subMainId: string) => void;
}) => {
    const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
    const [diameter, setDiameter] = useState<number>(100);
    const [selectedPointIndex, setSelectedPointIndex] = useState<number>(-1);
    const [angle, setAngle] = useState<number>(90);
    const [connectionPoint, setConnectionPoint] = useState<number>(0.5);

    useEffect(() => {
        if (pipe) {
            setCoordinates([...pipe.coordinates]);
            setDiameter(pipe.diameter);

            if (type === 'branch' && 'angle' in pipe) {
                setAngle(pipe.angle || 90);
                setConnectionPoint(pipe.connectionPoint || 0.5);
            }
        }
    }, [pipe, type]);

    const handleSave = () => {
        if (!pipe) return;

        const updatedPipe = {
            ...pipe,
            coordinates,
            diameter,
            length: calculatePipeLength(coordinates),
        };

        if (type === 'branch') {
            (updatedPipe as BranchPipe).angle = angle;
            (updatedPipe as BranchPipe).connectionPoint = connectionPoint;
        }

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

    const handleDeleteBranchPipe = () => {
        if (!pipe || type !== 'branch' || !onDeleteBranchPipe) return;
        if (confirm('คุณต้องการลบท่อย่อยนี้หรือไม่? ต้นไม้ที่เชื่อมต่อจะถูกลบด้วย')) {
            onDeleteBranchPipe(pipe.id, (pipe as BranchPipe).subMainPipeId);
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
            if (selectedPointIndex === index) {
                setSelectedPointIndex(-1);
            } else if (selectedPointIndex > index) {
                setSelectedPointIndex(selectedPointIndex - 1);
            }
        }
    };

    const insertCoordinate = (index: number) => {
        if (index < coordinates.length - 1) {
            const coord1 = coordinates[index];
            const coord2 = coordinates[index + 1];
            const midPoint = {
                lat: (coord1.lat + coord2.lat) / 2,
                lng: (coord1.lng + coord2.lng) / 2,
            };
            const newCoordinates = [...coordinates];
            newCoordinates.splice(index + 1, 0, midPoint);
            setCoordinates(newCoordinates);
        }
    };

    const adjustPoint = (
        index: number,
        direction: 'up' | 'down' | 'left' | 'right',
        amount: number = 0.00001
    ) => {
        const newCoordinates = [...coordinates];
        switch (direction) {
            case 'up':
                newCoordinates[index].lat += amount;
                break;
            case 'down':
                newCoordinates[index].lat -= amount;
                break;
            case 'left':
                newCoordinates[index].lng -= amount;
                break;
            case 'right':
                newCoordinates[index].lng += amount;
                break;
        }
        setCoordinates(newCoordinates);
    };

    const rotatePipe = (angleIncrement: number) => {
        if (coordinates.length < 2) return;

        const centerLat =
            coordinates.reduce((sum, coord) => sum + coord.lat, 0) / coordinates.length;
        const centerLng =
            coordinates.reduce((sum, coord) => sum + coord.lng, 0) / coordinates.length;

        const angleRad = (angleIncrement * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        const newCoordinates = coordinates.map((coord) => {
            const dx = coord.lat - centerLat;
            const dy = coord.lng - centerLng;

            return {
                lat: centerLat + dx * cos - dy * sin,
                lng: centerLng + dx * sin + dy * cos,
            };
        });

        setCoordinates(newCoordinates);
    };

    if (!isOpen || !pipe) return null;

    const typeNames = {
        main: 'ท่อเมน',
        subMain: 'ท่อเมนรอง',
        branch: 'ท่อย่อย',
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-gray-800 p-6 text-white">
                <h3 className="mb-4 text-xl font-semibold">✏️ แก้ไข{typeNames[type]}</h3>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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

                        <div className="rounded bg-gray-700 p-4">
                            <h4 className="mb-3 text-sm font-semibold">🔄 การหมุนท่อ (แม่นยำ)</h4>
                            <div className="mb-3 grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => rotatePipe(1)}
                                    className="rounded bg-purple-600 px-3 py-2 text-xs transition-colors hover:bg-purple-700"
                                >
                                    ↻ +1°
                                </button>
                                <button
                                    onClick={() => rotatePipe(-1)}
                                    className="rounded bg-purple-600 px-3 py-2 text-xs transition-colors hover:bg-purple-700"
                                >
                                    ↺ -1°
                                </button>
                                <button
                                    onClick={() => rotatePipe(5)}
                                    className="rounded bg-purple-600 px-3 py-2 text-xs transition-colors hover:bg-purple-700"
                                >
                                    ↻ +5°
                                </button>
                                <button
                                    onClick={() => rotatePipe(-5)}
                                    className="rounded bg-purple-600 px-3 py-2 text-xs transition-colors hover:bg-purple-700"
                                >
                                    ↺ -5°
                                </button>
                                <button
                                    onClick={() => rotatePipe(15)}
                                    className="rounded bg-purple-600 px-3 py-2 text-xs transition-colors hover:bg-purple-700"
                                >
                                    ↻ +15°
                                </button>
                                <button
                                    onClick={() => rotatePipe(-15)}
                                    className="rounded bg-purple-600 px-3 py-2 text-xs transition-colors hover:bg-purple-700"
                                >
                                    ↺ -15°
                                </button>
                                <button
                                    onClick={() => rotatePipe(45)}
                                    className="rounded bg-indigo-600 px-3 py-2 text-xs transition-colors hover:bg-indigo-700"
                                >
                                    ↻ +45°
                                </button>
                                <button
                                    onClick={() => rotatePipe(90)}
                                    className="rounded bg-indigo-600 px-3 py-2 text-xs transition-colors hover:bg-indigo-700"
                                >
                                    ↻ +90°
                                </button>
                            </div>
                        </div>

                        {type === 'branch' && branchSettings && (
                            <div className="rounded bg-yellow-900/30 p-4">
                                <h4 className="mb-3 text-sm font-semibold">🔧 การควบคุมท่อย่อย</h4>

                                <div className="space-y-3">
                                    <div>
                                        <label className="mb-2 block text-xs font-medium">
                                            มุมของท่อย่อย: {angle}°
                                        </label>
                                        <input
                                            type="range"
                                            min={branchSettings.minAngle}
                                            max={branchSettings.maxAngle}
                                            step={branchSettings.angleStep}
                                            value={angle}
                                            onChange={(e) => setAngle(parseFloat(e.target.value))}
                                            className="w-full accent-yellow-600"
                                        />
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span>{branchSettings.minAngle}°</span>
                                            <span>{branchSettings.maxAngle}°</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-medium">
                                            จุดต่อกับท่อเมนรอง: {(connectionPoint * 100).toFixed(1)}
                                            %
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={connectionPoint}
                                            onChange={(e) =>
                                                setConnectionPoint(parseFloat(e.target.value))
                                            }
                                            className="w-full accent-blue-600"
                                        />
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span>จุดเริ่ม</span>
                                            <span>จุดสิ้นสุด</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="rounded bg-gray-700 p-4">
                            <h4 className="mb-3 text-sm font-semibold">การดำเนินการท่อ</h4>
                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    onClick={addCoordinate}
                                    className="rounded bg-green-600 px-3 py-2 text-sm transition-colors hover:bg-green-700"
                                >
                                    <FaPlus className="mr-1 inline" />
                                    เพิ่มจุด
                                </button>

                                {/* Branch pipe specific delete button */}
                                {type === 'branch' && onDeleteBranchPipe && (
                                    <button
                                        onClick={handleDeleteBranchPipe}
                                        className="rounded bg-red-600 px-3 py-2 text-sm transition-colors hover:bg-red-700"
                                    >
                                        <FaUnlink className="mr-1 inline" />
                                        ลบท่อย่อย
                                    </button>
                                )}
                            </div>
                        </div>

                        {selectedPointIndex >= 0 && (
                            <div className="rounded bg-blue-900/30 p-4">
                                <h4 className="mb-3 text-sm font-semibold">
                                    แก้ไขจุด {selectedPointIndex + 1}
                                </h4>
                                <div className="mx-auto mb-3 grid w-32 grid-cols-3 gap-2">
                                    <div></div>
                                    <button
                                        onClick={() =>
                                            adjustPoint(selectedPointIndex, 'up', 0.00001)
                                        }
                                        className="rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700"
                                    >
                                        ↑
                                    </button>
                                    <div></div>
                                    <button
                                        onClick={() =>
                                            adjustPoint(selectedPointIndex, 'left', 0.00001)
                                        }
                                        className="rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700"
                                    >
                                        ←
                                    </button>
                                    <div className="flex items-center justify-center">
                                        <FaArrowsAlt className="text-gray-400" />
                                    </div>
                                    <button
                                        onClick={() =>
                                            adjustPoint(selectedPointIndex, 'right', 0.00001)
                                        }
                                        className="rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700"
                                    >
                                        →
                                    </button>
                                    <div></div>
                                    <button
                                        onClick={() =>
                                            adjustPoint(selectedPointIndex, 'down', 0.00001)
                                        }
                                        className="rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700"
                                    >
                                        ↓
                                    </button>
                                    <div></div>
                                </div>

                                <div className="mb-2 grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() =>
                                            adjustPoint(selectedPointIndex, 'up', 0.000001)
                                        }
                                        className="rounded bg-cyan-600 px-2 py-1 text-xs hover:bg-cyan-700"
                                    >
                                        ↑ ละเอียด
                                    </button>
                                    <button
                                        onClick={() =>
                                            adjustPoint(selectedPointIndex, 'down', 0.000001)
                                        }
                                        className="rounded bg-cyan-600 px-2 py-1 text-xs hover:bg-cyan-700"
                                    >
                                        ↓ ละเอียด
                                    </button>
                                    <button
                                        onClick={() =>
                                            adjustPoint(selectedPointIndex, 'left', 0.000001)
                                        }
                                        className="rounded bg-cyan-600 px-2 py-1 text-xs hover:bg-cyan-700"
                                    >
                                        ← ละเอียด
                                    </button>
                                    <button
                                        onClick={() =>
                                            adjustPoint(selectedPointIndex, 'right', 0.000001)
                                        }
                                        className="rounded bg-cyan-600 px-2 py-1 text-xs hover:bg-cyan-700"
                                    >
                                        → ละเอียด
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => insertCoordinate(selectedPointIndex)}
                                        className="flex-1 rounded bg-green-600 px-3 py-1 text-xs transition-colors hover:bg-green-700"
                                        disabled={selectedPointIndex >= coordinates.length - 1}
                                    >
                                        ➕ แทรกจุด
                                    </button>
                                    <button
                                        onClick={() => removeCoordinate(selectedPointIndex)}
                                        className="flex-1 rounded bg-red-600 px-3 py-1 text-xs transition-colors hover:bg-red-700"
                                        disabled={coordinates.length <= 2}
                                    >
                                        🗑️ ลบจุด
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="rounded bg-blue-900/30 p-3 text-sm">
                            <div>
                                <strong>ความยาวท่อ:</strong>{' '}
                                {calculatePipeLength(coordinates).toFixed(2)} ม.
                            </div>
                            <div>
                                <strong>จำนวนจุด:</strong> {coordinates.length} จุด
                            </div>
                            {type === 'branch' && (
                                <>
                                    <div>
                                        <strong>มุม:</strong> {angle}°
                                    </div>
                                    <div>
                                        <strong>จุดต่อ:</strong>{' '}
                                        {(connectionPoint * 100).toFixed(1)}%
                                    </div>
                                </>
                            )}
                            <div className="text-xs text-green-300">
                                ✅ แก้ไขได้แม่นยำทีละ 1 องศา
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="mb-2 flex items-center justify-between">
                            <label className="text-sm font-medium">จุดพิกัด</label>
                        </div>
                        <div className="max-h-96 space-y-2 overflow-y-auto">
                            {coordinates.map((coord, index) => (
                                <div
                                    key={index}
                                    className={`grid cursor-pointer grid-cols-6 gap-2 rounded p-2 transition-colors ${
                                        selectedPointIndex === index
                                            ? 'bg-blue-600'
                                            : 'bg-gray-700 hover:bg-gray-600'
                                    }`}
                                    onClick={() =>
                                        setSelectedPointIndex(
                                            selectedPointIndex === index ? -1 : index
                                        )
                                    }
                                >
                                    <div className="col-span-1 flex items-center justify-center text-xs text-gray-300">
                                        {index + 1}
                                    </div>
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
                                            className="w-full rounded bg-gray-600 px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                            className="w-full rounded bg-gray-600 px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="col-span-1 flex items-center justify-center">
                                        {selectedPointIndex === index && (
                                            <FaEdit className="text-blue-300" />
                                        )}
                                    </div>
                                </div>
                            ))}
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

export default function EnhancedHorticulturePlannerPage() {
    const [projectName, setProjectName] = useState<string>('โครงการระบบน้ำพืชสวน จ.จันทบุรี');
    const [customerName, setCustomerName] = useState<string>('');
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

    const [showPlantEditModal, setShowPlantEditModal] = useState(false);
    const [selectedPlantForEdit, setSelectedPlantForEdit] = useState<PlantLocation | null>(null);
    const [showPipeEditModal, setShowPipeEditModal] = useState(false);
    const [selectedPipeForEdit, setSelectedPipeForEdit] = useState<
        MainPipe | SubMainPipe | BranchPipe | null
    >(null);
    const [selectedPipeType, setSelectedPipeType] = useState<'main' | 'subMain' | 'branch'>('main');

    const [isNewPlantMode, setIsNewPlantMode] = useState(false);
    const [isCreatingConnection, setIsCreatingConnection] = useState(false);
    const [connectionStartPlant, setConnectionStartPlant] = useState<PlantLocation | null>(null);
    const [highlightedPipes, setHighlightedPipes] = useState<string[]>([]);
    const [dragMode, setDragMode] = useState<'none' | 'connecting'>('none');
    const [tempConnectionLine, setTempConnectionLine] = useState<Coordinate[] | null>(null);

    const featureGroupRef = useRef<L.FeatureGroup | null>(null);
    const mapRef = useRef<any>(null);

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
        spacingValidationStats: {
            totalBranches: 0,
            averageRowSpacing: 0,
            averagePlantSpacing: 0,
            spacingAccuracy: 0,
        },
        areaUtilizationStats: {
            totalBranches: 0,
            averageUtilization: 0,
            maxUtilization: 0,
        },
        isEditModeEnabled: false,
        branchPipeSettings: {
            defaultAngle: 90,
            maxAngle: 180,
            minAngle: 0,
            angleStep: 1,
        },
    };

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

    const canEnableEditMode = useMemo(() => {
        return (
            history.present.mainArea.length > 0 &&
            history.present.pump &&
            history.present.plants.length > 0 &&
            (history.present.mainPipes.length > 0 || history.present.subMainPipes.length > 0)
        );
    }, [history.present]);

    const pushToHistory = useCallback(
        (newState: Partial<ProjectState>) => {
            const updatedState = { ...history.present, ...newState };
            dispatchHistory({ type: 'PUSH_STATE', state: updatedState });
        },
        [history.present]
    );

    const handleUndo = useCallback(() => {
        dispatchHistory({ type: 'UNDO' });
    }, []);

    const handleRedo = useCallback(() => {
        dispatchHistory({ type: 'REDO' });
    }, []);

    const handleToggleEditMode = useCallback(() => {
        if (!canEnableEditMode) {
            alert('กรุณาสร้างพื้นที่หลัก ปั๊ม และสร้างท่อพร้อมต้นไม้ก่อนเข้าสู่โหมดแก้ไข');
            return;
        }

        pushToHistory({
            isEditModeEnabled: !history.present.isEditModeEnabled,
        });

        if (!history.present.isEditModeEnabled) {
            setEditMode(null);
        }

        setIsNewPlantMode(false);
        setIsCreatingConnection(false);
        setConnectionStartPlant(null);
        setHighlightedPipes([]);
        setDragMode('none');
        setTempConnectionLine(null);
    }, [canEnableEditMode, history.present.isEditModeEnabled, pushToHistory]);

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
            const newPlant = { ...plantData, id: plantData.id || Date.now() };

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
                        isCustomPlant: plantData.id === 99,
                    };
                }
                return zone;
            });

            pushToHistory({ zones: updatedZones });
            console.log(`✅ Zone ${zoneId} plant updated to:`, plantData);
        },
        [history.present.zones, pushToHistory]
    );

    const handlePlantEdit = useCallback((plant: PlantLocation) => {
        setSelectedPlantForEdit(plant);
        setIsNewPlantMode(false);
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

            const updatedSubMainPipes = history.present.subMainPipes.map((subMain) => ({
                ...subMain,
                branchPipes: subMain.branchPipes
                    .filter((branch) => {
                        const hasOtherPlants = branch.plants.some((plant) => plant.id !== plantId);
                        return hasOtherPlants || branch.plants.length === 0;
                    })
                    .map((branch) => ({
                        ...branch,
                        plants: branch.plants.filter((plant) => plant.id !== plantId),
                    })),
            }));

            pushToHistory({
                plants: updatedPlants,
                subMainPipes: updatedSubMainPipes,
            });
        },
        [history.present.plants, history.present.subMainPipes, pushToHistory]
    );

    const handleAddPlant = useCallback(
        (position: Coordinate, plantData?: PlantData) => {
            const newPlant: PlantLocation = {
                id: generateUniqueId('plant'),
                position,
                plantData: plantData || history.present.selectedPlantType,
                isSelected: false,
                isEditable: true,
                health: 'good',
                zoneId: history.present.useZones
                    ? findZoneContainingPoint(position, history.present.zones)?.id
                    : 'main-area',
            };

            const updatedPlants = [...history.present.plants, newPlant];
            pushToHistory({ plants: updatedPlants });

            setConnectionStartPlant(newPlant);
            setIsCreatingConnection(true);
            setDragMode('connecting');
            setIsNewPlantMode(true);
            setSelectedPlantForEdit(newPlant);
            setShowPlantEditModal(true);

            console.log('✅ New plant added, entering connection mode');
        },
        [
            history.present.plants,
            history.present.selectedPlantType,
            history.present.useZones,
            history.present.zones,
            pushToHistory,
        ]
    );

    const handleCreatePlantConnection = useCallback(
        (plantId: string) => {
            const plant = history.present.plants.find((p) => p.id === plantId);
            if (!plant) return;

            setConnectionStartPlant(plant);
            setIsCreatingConnection(true);
            setDragMode('connecting');

            const availablePipeIds: string[] = [
                ...history.present.subMainPipes.map((p) => p.id),
                ...history.present.subMainPipes.flatMap((sm) => sm.branchPipes.map((bp) => bp.id)),
            ];
            setHighlightedPipes(availablePipeIds);

            console.log('🔗 Connection mode activated for plant:', plant.id);
        },
        [history.present.plants, history.present.subMainPipes]
    );

    const handleConnectToPipe = useCallback(
        (clickPosition: Coordinate, pipeId: string, pipeType: 'subMain' | 'branch') => {
            if (!connectionStartPlant || !isCreatingConnection) return;

            let targetPipe: SubMainPipe | BranchPipe | null = null;
            let targetSubMainId = '';

            if (pipeType === 'subMain') {
                targetPipe = history.present.subMainPipes.find((p) => p.id === pipeId) || null;
                targetSubMainId = pipeId;
            } else {
                for (const subMain of history.present.subMainPipes) {
                    const branch = subMain.branchPipes.find((bp) => bp.id === pipeId);
                    if (branch) {
                        targetPipe = branch;
                        targetSubMainId = subMain.id;
                        break;
                    }
                }
            }

            if (!targetPipe) return;

            const closestPoint = findClosestPointOnPipe(clickPosition, targetPipe.coordinates);
            if (!closestPoint) return;

            const newBranchPipe: BranchPipe = {
                id: generateUniqueId('branch'),
                subMainPipeId: targetSubMainId,
                coordinates: [closestPoint.position, connectionStartPlant.position],
                length: calculateDistanceBetweenPoints(
                    closestPoint.position,
                    connectionStartPlant.position
                ),
                diameter: 20,
                plants: [connectionStartPlant],
                isEditable: true,
                sprinklerType: 'standard',
                angle: 90,
                connectionPoint: 0.5,
            };

            const updatedSubMainPipes = history.present.subMainPipes.map((subMain) => {
                if (subMain.id === targetSubMainId) {
                    return {
                        ...subMain,
                        branchPipes: [...subMain.branchPipes, newBranchPipe],
                    };
                }
                return subMain;
            });

            pushToHistory({ subMainPipes: updatedSubMainPipes });

            setIsCreatingConnection(false);
            setConnectionStartPlant(null);
            setHighlightedPipes([]);
            setDragMode('none');
            setTempConnectionLine(null);

            console.log('✅ Created new branch pipe connection to', pipeType, pipeId);
        },
        [connectionStartPlant, isCreatingConnection, history.present.subMainPipes, pushToHistory]
    );

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
            const newState: Partial<ProjectState> = {};

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
            const newState: Partial<ProjectState> = {};

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

    const handleDeleteBranchPipe = useCallback(
        (branchId: string, subMainId: string) => {
            const updatedSubMainPipes = history.present.subMainPipes.map((subMainPipe) => {
                if (subMainPipe.id === subMainId) {
                    const branchToDelete = subMainPipe.branchPipes.find((bp) => bp.id === branchId);
                    if (branchToDelete) {
                        const plantsToRemove = branchToDelete.plants.map((p) => p.id);
                        const updatedPlants = history.present.plants.filter(
                            (plant) => !plantsToRemove.includes(plant.id)
                        );

                        pushToHistory({ plants: updatedPlants });
                    }

                    return {
                        ...subMainPipe,
                        branchPipes: subMainPipe.branchPipes.filter(
                            (branchPipe) => branchPipe.id !== branchId
                        ),
                    };
                }
                return subMainPipe;
            });

            pushToHistory({ subMainPipes: updatedSubMainPipes });
            console.log('✅ Deleted branch pipe and associated plants');
        },
        [history.present.subMainPipes, history.present.plants, pushToHistory]
    );

    const MapClickHandler: React.FC<{
        editMode: string | null;
        isEditModeEnabled: boolean;
        onPumpPlace: (latlng: L.LatLng) => void;
        onPlantPlace: (latlng: L.LatLng) => void;
        onAddPlant: (position: Coordinate) => void;
        onConnectToPipe?: (
            position: Coordinate,
            pipeId: string,
            pipeType: 'subMain' | 'branch'
        ) => void;
        isCreatingConnection?: boolean;
    }> = ({
        editMode,
        isEditModeEnabled,
        onPumpPlace,
        onPlantPlace,
        onAddPlant,
        onConnectToPipe,
        isCreatingConnection,
    }) => {
        useMapEvents({
            click: (e: LeafletMouseEvent) => {
                if (!isEditModeEnabled) return;

                if (editMode === 'pump') {
                    e.originalEvent?.stopPropagation();
                    onPumpPlace(e.latlng);
                } else if (editMode === 'plant') {
                    e.originalEvent?.stopPropagation();
                    onPlantPlace(e.latlng);
                } else if (editMode === 'addPlant') {
                    e.originalEvent?.stopPropagation();
                    onAddPlant({ lat: e.latlng.lat, lng: e.latlng.lng });
                } else if (isCreatingConnection && onConnectToPipe) {
                    onConnectToPipe({ lat: e.latlng.lat, lng: e.latlng.lng }, '', 'subMain');
                }
            },
        });

        return null;
    };

    const MapBounds = ({ positions }: { positions: Coordinate[] }) => {
        const map = useMap();

        React.useEffect(() => {
            if (positions.length > 0) {
                const bounds = positions.reduce(
                    (bounds, point) => bounds.extend([point.lat, point.lng]),
                    L.latLngBounds([])
                );
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18, animate: true });
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
                position: clickPoint,
                type: 'submersible',
                capacity: 1000,
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
            const clickPoint = { lat: latlng.lat, lng: latlng.lng };

            let targetZoneId = 'main-area';
            if (history.present.useZones && history.present.zones.length > 0) {
                const containingZone = findZoneContainingPoint(clickPoint, history.present.zones);
                if (containingZone) {
                    targetZoneId = containingZone.id;
                } else {
                    console.warn('⚠️ Plant placement outside any zone');
                    return;
                }
            }

            const newPlant: PlantLocation = {
                id: generateUniqueId('plant'),
                position: { lat: latlng.lat, lng: latlng.lng },
                plantData: history.present.selectedPlantType,
                isSelected: false,
                isEditable: true,
                health: 'good',
                zoneId: targetZoneId,
            };

            pushToHistory({ plants: [...history.present.plants, newPlant] });
            console.log('✅ Plant placed successfully in zone:', targetZoneId);
        },
        [
            history.present.selectedPlantType,
            history.present.plants,
            history.present.useZones,
            history.present.zones,
            pushToHistory,
        ]
    );

    const onCreated = useCallback(
        (e: any) => {
            const layer = e.layer;
            const coordinates = extractCoordinatesFromLayer(layer);

            if (!coordinates || coordinates.length === 0) {
                console.error('❌ No valid coordinates extracted from layer');
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
                    isCustomPlant: plantDataForZone.id === 99,
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
            } else if (editMode === 'mainPipe' && history.present.pump) {
                const pipeLength = calculatePipeLength(coordinates);
                const targetZoneId = findTargetZoneForMainPipe(
                    coordinates,
                    history.present.zones,
                    history.present.useZones
                );

                const newMainPipe: MainPipe = {
                    id: generateUniqueId('mainpipe'),
                    fromPump: history.present.pump.id,
                    toZone: targetZoneId,
                    coordinates,
                    length: pipeLength,
                    diameter: 50,
                };

                pushToHistory({ mainPipes: [...history.present.mainPipes, newMainPipe] });
                setDrawingMainPipe({ toZone: null });
                setEditMode(null);
                console.log(
                    `✅ Main pipe created: ${pipeLength.toFixed(2)}m to zone: ${targetZoneId}`
                );
            } else if (editMode === 'subMainPipe') {
                console.log('🔩 Creating enhanced sub-main pipe with optimal branch generation...');

                const pipeLength = calculatePipeLength(coordinates);

                let targetZone: Zone;
                if (history.present.useZones) {
                    if (selectedZone) {
                        targetZone = selectedZone;
                    } else {
                        const detectedZone = findZoneForPipe(coordinates, history.present.zones);
                        if (!detectedZone) {
                            console.error('❌ Cannot create sub-main pipe: not in any zone');
                            return;
                        }
                        targetZone = detectedZone;
                    }
                } else {
                    targetZone = {
                        id: 'main-area',
                        name: 'พื้นที่หลัก',
                        coordinates: history.present.mainArea,
                        plantData: history.present.selectedPlantType,
                        plantCount: 0,
                        totalWaterNeed: 0,
                        area: calculateAreaFromCoordinates(history.present.mainArea),
                        color: '#4ECDC4',
                    };
                }

                const branchPipes = generateEnhancedBranchPipes(
                    coordinates,
                    targetZone,
                    targetZone.plantData,
                    history.present.exclusionAreas,
                    targetZone.coordinates,
                    history.present.useZones,
                    history.present.branchPipeSettings
                );

                // Extract plants from branch pipes
                const newPlants = branchPipes.flatMap((branch) => branch.plants || []);

                const newSubMainPipe: SubMainPipe = {
                    id: generateUniqueId('submain'),
                    zoneId: targetZone.id,
                    coordinates,
                    length: pipeLength,
                    diameter: 32,
                    branchPipes,
                    material: 'pvc',
                };

                const exactSpacingStats = calculateExactSpacingStats([
                    ...history.present.subMainPipes,
                    newSubMainPipe,
                ]);

                pushToHistory({
                    subMainPipes: [...history.present.subMainPipes, newSubMainPipe],
                    plants: [...history.present.plants, ...newPlants],
                    spacingValidationStats: exactSpacingStats,
                });

                console.log(
                    `✅ ENHANCED: ${branchPipes.length} branches, ${newPlants.length} plants in ${targetZone.name}`
                );
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
            history.present.branchPipeSettings,
            pushToHistory,
        ]
    );

    const handleSaveProject = useCallback(() => {
        if (!history.present.pump || history.present.mainArea.length === 0) {
            alert('กรุณาวางปั๊มและสร้างพื้นที่หลักก่อนบันทึก');
            return;
        }

        const projectData = {
            projectName,
            customerName,
            version: '3.2.0',
            totalArea,
            mainArea: history.present.mainArea,
            pump: history.present.pump,
            zones: history.present.zones,
            mainPipes: history.present.mainPipes,
            subMainPipes: history.present.subMainPipes,
            exclusionAreas: history.present.exclusionAreas,
            plants: history.present.plants,
            useZones: history.present.useZones,
            branchPipeSettings: history.present.branchPipeSettings,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        localStorage.setItem('horticultureIrrigationData', JSON.stringify(projectData));
        console.log('✅ Project saved to localStorage');

        // Navigate to results page
        const params = new URLSearchParams({
            projectName,
            customerName,
            totalArea: totalArea.toString(),
        });

        router.visit(`/horticulture/results?${params.toString()}`);
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
        history.present.branchPipeSettings,
    ]);

    const canSaveProject = history.present.pump && history.present.mainArea.length > 0;

    const { t } = useLanguage();

    return (
        <div className="min-h-screen overflow-hidden bg-gray-900 text-white">
            <Navbar />
            <div className="p-4">
                <div className="mx-auto w-full">
                    <div className="flex items-center justify-between">
                        <h1 className="mb-4 text-2xl font-bold">🌳 ระบบออกแบบระบบน้ำพืชสวน</h1>
                        <div className="mb-4">
                            <button
                                onClick={handleUndo}
                                disabled={history.past.length === 0}
                                className={`mr-2 flex-1 rounded px-2 py-2 text-sm transition-colors ${
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
                                className={`flex-1 rounded px-2 py-2 text-sm transition-colors ${
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
                    {/* Step Navigation */}
                    <div className="mb-6 rounded-lg bg-gray-800 p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">📋 ขั้นตอนการทำงาน</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePrevStep}
                                    disabled={currentStep <= 1}
                                    className={`rounded px-3 py-1 text-sm transition-colors ${
                                        currentStep <= 1
                                            ? 'cursor-not-allowed bg-gray-600 text-gray-400'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    ← ก่อนหน้า
                                </button>
                                <button
                                    onClick={handleNextStep}
                                    disabled={currentStep >= 5}
                                    className={`rounded px-3 py-1 text-sm transition-colors ${
                                        currentStep >= 5
                                            ? 'cursor-not-allowed bg-gray-600 text-gray-400'
                                            : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                >
                                    ถัดไป →
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-5 gap-2">
                            {[1, 2, 3, 4, 5].map((stepId) => (
                                <button
                                    key={stepId}
                                    onClick={() => handleStepClick(stepId)}
                                    disabled={!canProceedToStep(stepId)}
                                    className={`rounded-lg p-3 text-center text-sm font-medium transition-all ${
                                        getStepStatus(stepId) === 'active'
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : getStepStatus(stepId) === 'completed'
                                              ? 'bg-green-600 text-white'
                                              : canProceedToStep(stepId)
                                                ? 'cursor-pointer bg-blue-500 text-white hover:bg-blue-600'
                                                : 'cursor-not-allowed bg-gray-600 text-gray-400'
                                    }`}
                                >
                                    <div className="mb-1 text-lg">
                                        {stepId === 1 && '🗺️'}
                                        {stepId === 2 && '🌿'}
                                        {stepId === 3 && '🚰'}
                                        {stepId === 4 && '🔧'}
                                        {stepId === 5 && '✅'}
                                    </div>
                                    <div className="text-xs">
                                        {stepId === 1 && 'พื้นที่หลัก'}
                                        {stepId === 2 && 'พืช/โซน'}
                                        {stepId === 3 && 'ปั๊มน้ำ'}
                                        {stepId === 4 && 'ท่อน้ำ'}
                                        {stepId === 5 && 'เสร็จสิ้น'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                        <div className="h-[88vh] space-y-6 overflow-y-auto lg:col-span-1">
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
                                            disabled={history.present.isEditModeEnabled}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium">
                                            ชื่อลูกค้า
                                        </label>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="ชื่อ - นามสกุล"
                                            disabled={history.present.isEditModeEnabled}
                                        />
                                    </div>
                                    <div className="text-sm text-gray-300">
                                        <div className="flex justify-between">
                                            <span>พื้นที่รวม:</span>
                                            <span className="font-medium">
                                                {formatArea(totalArea)}
                                            </span>
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

                            {canEnableEditMode && (
                                <div className="rounded-lg bg-gradient-to-r from-purple-800 to-blue-800 p-4">
                                    <h3 className="mb-3 text-lg font-semibold text-yellow-300">
                                        ✨ โหมดแก้ไขขั้นสูง
                                    </h3>
                                    <div className="space-y-3">
                                        <button
                                            onClick={handleToggleEditMode}
                                            className={`w-full rounded px-4 py-3 font-semibold transition-all ${
                                                history.present.isEditModeEnabled
                                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                                    : 'bg-green-600 text-white hover:bg-green-700'
                                            }`}
                                        >
                                            {history.present.isEditModeEnabled ? (
                                                <>
                                                    <FaTimes className="mr-2 inline" />
                                                    ออกจากโหมดแก้ไข
                                                </>
                                            ) : (
                                                <>
                                                    <FaEdit className="mr-2 inline" />
                                                    เข้าสู่โหมดแก้ไข
                                                </>
                                            )}
                                        </button>

                                        {isCreatingConnection && (
                                            <div className="rounded bg-blue-900/50 p-3 text-sm">
                                                <div className="mb-2 font-semibold text-blue-300">
                                                    🔗 โหมดเชื่อมต่อท่อ
                                                </div>
                                                <div className="text-xs text-gray-300">
                                                    คลิกที่ท่อเมนรองหรือท่อย่อยเพื่อเชื่อมต่อ
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setIsCreatingConnection(false);
                                                        setConnectionStartPlant(null);
                                                        setHighlightedPipes([]);
                                                        setDragMode('none');
                                                    }}
                                                    className="mt-2 w-full rounded bg-red-600 px-3 py-1 text-xs hover:bg-red-700"
                                                >
                                                    ยกเลิกการเชื่อมต่อ
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 1: Main Area */}
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    <div className="rounded-lg bg-green-900/30 p-4">
                                        <h3 className="mb-3 text-lg font-semibold text-green-400">
                                            🗺️ ขั้นตอนที่ 1: สร้างพื้นที่หลัก
                                        </h3>
                                        <p className="mb-4 text-sm text-green-200">
                                            วาดพื้นที่หลักของโครงการบนแผนที่
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-gray-800 p-4">
                                        <h3 className="mb-3 text-lg font-semibold">
                                            🗺️ พื้นที่หลัก
                                        </h3>
                                        <div className="space-y-3">
                                            <button
                                                onClick={() =>
                                                    setEditMode(
                                                        editMode === 'mainArea' ? null : 'mainArea'
                                                    )
                                                }
                                                className={`w-full rounded px-4 py-2 text-white transition-colors ${
                                                    editMode === 'mainArea'
                                                        ? 'bg-green-600'
                                                        : 'bg-green-500 hover:bg-green-600'
                                                }`}
                                            >
                                                {editMode === 'mainArea'
                                                    ? '⏹ หยุดวาดพื้นที่'
                                                    : '🗺️ วาดพื้นที่หลัก'}
                                            </button>

                                            {history.present.mainArea.length > 0 && (
                                                <div className="rounded bg-green-800/50 p-3">
                                                    <div className="flex items-center gap-2 text-green-300">
                                                        <span>✅</span>
                                                        <span className="font-medium">
                                                            สร้างพื้นที่หลักเสร็จแล้ว
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 text-xs text-green-200">
                                                        พื้นที่: {formatArea(totalArea)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Plants and Zones */}
                            {currentStep === 2 && (
                                <div className="space-y-4">
                                    <div className="rounded-lg bg-orange-900/30 p-4">
                                        <h3 className="mb-3 text-lg font-semibold text-orange-400">
                                            🌿 ขั้นตอนที่ 2: กำหนดพืชและโซน
                                        </h3>
                                        <p className="mb-4 text-sm text-orange-200">
                                            เลือกชนิดพืชและแบ่งโซน (ถ้าต้องการ)
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Zone Configuration */}
                                        <div className="rounded-lg bg-gray-800 p-4">
                                            <h3 className="mb-3 text-lg font-semibold">
                                                🏞️ การจัดการโซน
                                            </h3>
                                            <div className="space-y-4">
                                                <label className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={history.present.useZones}
                                                        onChange={(e) =>
                                                            pushToHistory({
                                                                useZones: e.target.checked,
                                                            })
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
                                                <h3 className="text-lg font-semibold">
                                                    🌿 การจัดการพืช
                                                </h3>
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
                                                                    (p) =>
                                                                        p.id ===
                                                                        Number(e.target.value)
                                                                );
                                                            if (plantType) {
                                                                pushToHistory({
                                                                    selectedPlantType: plantType,
                                                                });
                                                            }
                                                        }}
                                                        className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        {history.present.availablePlants.map(
                                                            (plant) => (
                                                                <option
                                                                    key={plant.id}
                                                                    value={plant.id}
                                                                >
                                                                    {plant.id > 3 ? '🔧' : '🌱'}{' '}
                                                                    {plant.name}
                                                                </option>
                                                            )
                                                        )}
                                                    </select>
                                                    <div className="text-sm text-gray-300">
                                                        <div className="flex justify-between">
                                                            <span>ระยะห่างต้น:</span>
                                                            <span>
                                                                {
                                                                    history.present
                                                                        .selectedPlantType
                                                                        .plantSpacing
                                                                }{' '}
                                                                ม.
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>ระยะห่างแถว:</span>
                                                            <span>
                                                                {
                                                                    history.present
                                                                        .selectedPlantType
                                                                        .rowSpacing
                                                                }{' '}
                                                                ม.
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>น้ำต่อต้น:</span>
                                                            <span>
                                                                {
                                                                    history.present
                                                                        .selectedPlantType.waterNeed
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
                                                                                {
                                                                                    zone.plantData
                                                                                        .name
                                                                                }
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
                                                                            {
                                                                                zone.plantData
                                                                                    .plantSpacing
                                                                            }
                                                                            ×
                                                                            {
                                                                                zone.plantData
                                                                                    .rowSpacing
                                                                            }
                                                                            ม. |{' '}
                                                                            {
                                                                                zone.plantData
                                                                                    .waterNeed
                                                                            }
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
                                                    const newMode =
                                                        editMode === 'pump' ? null : 'pump';
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
                                                setEditMode(
                                                    editMode === 'mainPipe' ? null : 'mainPipe'
                                                )
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
                                                    editMode === 'subMainPipe'
                                                        ? null
                                                        : 'subMainPipe'
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
                                            <h4 className="mb-2 text-sm font-medium">
                                                🔄 การควบคุม
                                            </h4>
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
                                            <h4 className="mb-2 text-sm font-medium">
                                                🌱 วางต้นไม้
                                            </h4>
                                            <button
                                                onClick={() =>
                                                    setEditMode(
                                                        editMode === 'plant' ? null : 'plant'
                                                    )
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

                            {editMode === 'subMainPipe' && history.present.useZones && (
                                <div className="rounded-lg bg-purple-900/30 p-4">
                                    <h4 className="mb-2 text-sm font-medium">
                                        🔧 เลือกโซนสำหรับท่อเมนรอง
                                    </h4>
                                    <select
                                        value={selectedZone?.id || ''}
                                        onChange={(e) => {
                                            const zone = history.present.zones.find(
                                                (z) => z.id === e.target.value
                                            );
                                            setSelectedZone(zone || null);
                                        }}
                                        className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">เลือกโซน</option>
                                        {history.present.zones.map((zone) => (
                                            <option key={zone.id} value={zone.id}>
                                                {zone.name} ({zone.plantData.name})
                                            </option>
                                        ))}
                                    </select>
                                    {!selectedZone && (
                                        <p className="mt-2 text-xs text-yellow-400">
                                            ⚠️ ต้องเลือกโซนก่อนวาดท่อเมนรอง (หรือจะ AUTO-DETECT
                                            จากที่วาด)
                                        </p>
                                    )}
                                    {selectedZone && (
                                        <div className="mt-2 rounded bg-green-900/30 p-2 text-xs text-green-300">
                                            ✅ พร้อมสร้างท่อครอบคลุมในโซน {selectedZone.name}
                                            <br />
                                            พืช: {selectedZone.plantData.name}
                                            <br />
                                            มุมเริ่มต้น:{' '}
                                            {history.present.branchPipeSettings.defaultAngle}°
                                        </div>
                                    )}
                                </div>
                            )}

                            {editMode === 'subMainPipe' && !history.present.useZones && (
                                <div className="rounded-lg bg-purple-900/30 p-4">
                                    <h4 className="mb-2 text-sm font-medium">
                                        🔧 โหมดพื้นที่เดียว
                                    </h4>
                                    <p className="text-xs text-purple-300">
                                        ✅
                                        พร้อมวาดท่อเมนรองและสร้างท่อย่อยครอบคลุมปลายแบบเพิ่มประสิทธิภาพ
                                    </p>
                                    <p className="mt-1 text-xs text-gray-400">
                                        พืช: {history.present.selectedPlantType.name}(
                                        {history.present.selectedPlantType.plantSpacing}×
                                        {history.present.selectedPlantType.rowSpacing}ม.)
                                        <br />
                                        มุมเริ่มต้น:{' '}
                                        {history.present.branchPipeSettings.defaultAngle}°
                                    </p>
                                    <div className="mt-2 text-xs text-green-300">
                                        🎯 ท่อย่อยจะยาวถึงต้นสุดท้าย
                                        <br />
                                        ⚙️ สามารถปรับมุมและตำแหน่งในโหมดแก้ไข
                                    </div>
                                </div>
                            )}

                            {editMode === 'mainPipe' && (
                                <div className="rounded-lg bg-green-900/30 p-4">
                                    <h4 className="mb-2 text-sm font-medium">
                                        🎯 โหมด AUTO ท่อเมน
                                    </h4>
                                    <div className="rounded bg-gray-700 px-3 py-2 text-center text-green-400">
                                        {history.present.useZones
                                            ? '🎯 AUTO: ตรวจหาโซนจากปลายท่อ'
                                            : '🎯 AUTO: พื้นที่หลัก'}
                                    </div>
                                    <p className="mt-2 text-xs text-green-300">
                                        ✅ ระบบจะเลือกโซนปลายทางอัตโนมัติ
                                        <br />✅ ไม่ต้องเลือกโซนเป้าหมายด้วยตนเอง
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleSaveProject}
                                disabled={!canSaveProject || history.present.isEditModeEnabled}
                                className={`w-full rounded px-4 py-3 font-semibold text-white transition-colors ${
                                    canSaveProject && !history.present.isEditModeEnabled
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'cursor-not-allowed bg-gray-600'
                                }`}
                            >
                                💾 บันทึกและดูผลลัพธ์
                            </button>

                            {(history.present.subMainPipes.length > 0 ||
                                history.present.mainPipes.length > 0 ||
                                history.present.plants.length > 0) && (
                                <div className="rounded-lg bg-gray-800 p-4">
                                    <h3 className="mb-3 text-lg font-semibold">📊 สถิติปัจจุบัน</h3>
                                    <div className="space-y-1 text-sm text-gray-300">
                                        {history.present.mainPipes.length > 0 && (
                                            <div className="flex justify-between">
                                                <span>ท่อย่อย:</span>
                                                <span className="font-medium text-green-300">
                                                    {
                                                        history.present.areaUtilizationStats
                                                            .totalBranches
                                                    }{' '}
                                                    เส้น
                                                </span>
                                            </div>
                                        )}
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
                                    <div className="mt-2 rounded bg-purple-900/20 p-2 text-xs text-purple-300">
                                        �� ปรับปรุงใหม่: ลบท่อย่อย, ลากเชื่อมต่อท่อ, แก้ไขขั้นสูง
                                    </div>
                                </div>
                            )}
                        </div>

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
                                            isEditModeEnabled={history.present.isEditModeEnabled}
                                            onPumpPlace={handlePumpPlace}
                                            onPlantPlace={handlePlantPlace}
                                            onAddPlant={handleAddPlant}
                                            onConnectToPipe={handleConnectToPipe}
                                            isCreatingConnection={isCreatingConnection}
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
                                                        } else if (
                                                            history.present.isEditModeEnabled &&
                                                            !editMode
                                                        ) {
                                                            e.originalEvent?.stopPropagation();
                                                            handleAddPlant({
                                                                lat: e.latlng.lat,
                                                                lng: e.latlng.lng,
                                                            });
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
                                                            {history.present.isEditModeEnabled && (
                                                                <>
                                                                    <br />
                                                                    🎛️ คลิกเพื่อเพิ่มต้นไม้
                                                                </>
                                                            )}
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
                                                        dblclick: () =>
                                                            !history.present.isEditModeEnabled &&
                                                            handleZonePlantSelection(zone),
                                                        click: (e) => {
                                                            if (
                                                                history.present.isEditModeEnabled &&
                                                                !editMode
                                                            ) {
                                                                e.originalEvent?.stopPropagation();
                                                                handleAddPlant({
                                                                    lat: e.latlng.lat,
                                                                    lng: e.latlng.lng,
                                                                });
                                                            }
                                                        },
                                                    }}
                                                >
                                                    <Popup>
                                                        <div className="text-center">
                                                            <strong>{zone.name}</strong>
                                                            <br />
                                                            พืช: {zone.isCustomPlant
                                                                ? '🔧'
                                                                : '🌱'}{' '}
                                                            {zone.plantData.name}
                                                            <br />
                                                            ขนาด: {formatArea(zone.area)}
                                                            <br />
                                                            ประมาณ:{' '}
                                                            {zone.plantCount.toLocaleString()} ต้น
                                                            <br />
                                                            น้ำ:{' '}
                                                            {formatWaterVolume(zone.totalWaterNeed)}
                                                            <br />
                                                            <div className="text-xs text-green-600">
                                                                {history.present
                                                                    .isEditModeEnabled && (
                                                                    <>
                                                                        <br />
                                                                        🎛️ คลิกเพื่อเพิ่มต้นไม้
                                                                    </>
                                                                )}
                                                            </div>
                                                            {!history.present.isEditModeEnabled && (
                                                                <div className="mt-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            handleZonePlantSelection(
                                                                                zone
                                                                            )
                                                                        }
                                                                        className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                                                                    >
                                                                        เปลี่ยนพืช
                                                                    </button>
                                                                </div>
                                                            )}
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
                                            width: 24px;
                                            height: 24px;
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
                                                    iconSize: [24, 24],
                                                    iconAnchor: [12, 12],
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
                                                        {history.present.isEditModeEnabled && (
                                                            <div className="mt-2 text-xs text-yellow-600">
                                                                💡 ในโหมดแก้ไข:
                                                                สร้างปั๊มใหม่เพื่อเปลี่ยนตำแหน่ง
                                                            </div>
                                                        )}
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
                                                    dblclick: () =>
                                                        history.present.isEditModeEnabled &&
                                                        handlePipeEdit(pipe, 'main'),
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
                                                        ไปยังโซน: {pipe.toZone}
                                                        <br />
                                                        <div className="text-xs text-blue-600">
                                                            🎯 AUTO-DETECT โซนปลายทาง
                                                        </div>
                                                        {history.present.isEditModeEnabled && (
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
                                                        )}
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
                                                        color: highlightedPipes.includes(pipe.id)
                                                            ? '#FFD700'
                                                            : '#8B5CF6',
                                                        weight: highlightedPipes.includes(pipe.id)
                                                            ? 7
                                                            : 5,
                                                        opacity: highlightedPipes.includes(pipe.id)
                                                            ? 1
                                                            : 0.9,
                                                    }}
                                                    eventHandlers={{
                                                        dblclick: () =>
                                                            history.present.isEditModeEnabled &&
                                                            handlePipeEdit(pipe, 'subMain'),
                                                        click: (e) => {
                                                            if (
                                                                isCreatingConnection &&
                                                                highlightedPipes.includes(pipe.id)
                                                            ) {
                                                                e.originalEvent?.stopPropagation();
                                                                handleConnectToPipe(
                                                                    {
                                                                        lat: e.latlng.lat,
                                                                        lng: e.latlng.lng,
                                                                    },
                                                                    pipe.id,
                                                                    'subMain'
                                                                );
                                                            }
                                                        },
                                                    }}
                                                >
                                                    <Popup>
                                                        <div className="text-center">
                                                            <strong>ท่อเมนรอง</strong>
                                                            <br />
                                                            ความยาว: {pipe.length.toFixed(2)} ม.
                                                            <br />
                                                            โซน: {pipe.zoneId}
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
                                                                ✅ ปรับปรุง: ท่อย่อยยาวถึงต้นสุดท้าย
                                                                <br />
                                                                🎯 ปรับมุมและตำแหน่งได้
                                                                <br />
                                                                🌱 ต้นไม้ = plantSpacing
                                                            </div>
                                                            {history.present.isEditModeEnabled && (
                                                                <div className="mt-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            handlePipeEdit(
                                                                                pipe,
                                                                                'subMain'
                                                                            )
                                                                        }
                                                                        className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700"
                                                                    >
                                                                        <FaEdit className="mr-1 inline" />
                                                                        แก้ไข
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {isCreatingConnection &&
                                                                highlightedPipes.includes(
                                                                    pipe.id
                                                                ) && (
                                                                    <div className="mt-2 text-xs text-yellow-300">
                                                                        🔗 คลิกเพื่อเชื่อมต่อ
                                                                    </div>
                                                                )}
                                                        </div>
                                                    </Popup>
                                                </Polyline>

                                                {pipe.branchPipes.map((branchPipe) => (
                                                    <Polyline
                                                        key={branchPipe.id}
                                                        positions={branchPipe.coordinates.map(
                                                            (coord) => [coord.lat, coord.lng]
                                                        )}
                                                        pathOptions={{
                                                            color: highlightedPipes.includes(
                                                                branchPipe.id
                                                            )
                                                                ? '#FFD700'
                                                                : '#FFFF66',
                                                            weight: highlightedPipes.includes(
                                                                branchPipe.id
                                                            )
                                                                ? 4
                                                                : 2,
                                                            opacity: highlightedPipes.includes(
                                                                branchPipe.id
                                                            )
                                                                ? 1
                                                                : 0.8,
                                                        }}
                                                        eventHandlers={{
                                                            dblclick: () =>
                                                                history.present.isEditModeEnabled &&
                                                                handlePipeEdit(
                                                                    branchPipe,
                                                                    'branch'
                                                                ),
                                                            click: (e) => {
                                                                if (
                                                                    isCreatingConnection &&
                                                                    highlightedPipes.includes(
                                                                        branchPipe.id
                                                                    )
                                                                ) {
                                                                    e.originalEvent?.stopPropagation();
                                                                    handleConnectToPipe(
                                                                        {
                                                                            lat: e.latlng.lat,
                                                                            lng: e.latlng.lng,
                                                                        },
                                                                        branchPipe.id,
                                                                        'branch'
                                                                    );
                                                                }
                                                            },
                                                        }}
                                                    >
                                                        <Popup>
                                                            <div className="text-center">
                                                                <strong>ท่อย่อย</strong>
                                                                <br />
                                                                ความยาว:{' '}
                                                                {branchPipe.length.toFixed(2)} ม.
                                                                <br />
                                                                ต้นไม้: {
                                                                    branchPipe.plants.length
                                                                }{' '}
                                                                ต้น
                                                                <br />
                                                                {branchPipe.angle && (
                                                                    <>
                                                                        มุม: {branchPipe.angle}°
                                                                        <br />
                                                                    </>
                                                                )}
                                                                {branchPipe.connectionPoint && (
                                                                    <>
                                                                        จุดต่อ:{' '}
                                                                        {(
                                                                            branchPipe.connectionPoint *
                                                                            100
                                                                        ).toFixed(1)}
                                                                        %
                                                                        <br />
                                                                    </>
                                                                )}
                                                                <div className="text-xs text-green-600">
                                                                    ✅ ปรับปรุง: ยาวถึงต้นสุดท้าย
                                                                    <br />
                                                                    🎯 ปรับมุม 0-180° ได้
                                                                    <br />
                                                                    🔧 ลากจุดต่อได้ตามต้องการ
                                                                </div>
                                                                {history.present
                                                                    .isEditModeEnabled && (
                                                                    <div className="mt-2">
                                                                        <button
                                                                            onClick={() =>
                                                                                handlePipeEdit(
                                                                                    branchPipe,
                                                                                    'branch'
                                                                                )
                                                                            }
                                                                            className="mr-2 rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700"
                                                                        >
                                                                            <FaEdit className="mr-1 inline" />
                                                                            แก้ไข
                                                                        </button>
                                                                        <button
                                                                            onClick={() =>
                                                                                handleDeleteBranchPipe(
                                                                                    branchPipe.id,
                                                                                    pipe.id
                                                                                )
                                                                            }
                                                                            className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                                                                        >
                                                                            <FaUnlink className="mr-1 inline" />
                                                                            ลบท่อย่อย
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                {isCreatingConnection &&
                                                                    highlightedPipes.includes(
                                                                        branchPipe.id
                                                                    ) && (
                                                                        <div className="mt-2 text-xs text-yellow-300">
                                                                            🔗 คลิกเพื่อเชื่อมต่อ
                                                                        </div>
                                                                    )}
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
                                            cursor: ${history.present.isEditModeEnabled ? 'pointer' : 'default'};
                                            ${plant.id === connectionStartPlant?.id ? 'border: 3px solid #FFD700; border-radius: 50%;' : ''}
                                        "><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAABlklEQVR4nI1TW0sCQRTel/plqSlGEUTPQRqRRBSE9tJDd7tApVI+VERRWcvMbNkFDArsSsLOZV8q+yXFiZ20dtdZaeB7OXO+M+d88x1N8xwhCq0WJZ2C4Zyg+FSC4ayMiUKr1uxwTqKC4apgBJSg5N1iKKIkM4aHOSVfvuQaajmJhpe5gvxQ2YPHyr6yiEWN8O/MgpJ3Z8L+zTTMFPth4CgokS8l4ex+1VMIf0hNLGZ0OS9MU4fBQjvEDtsaoJcX3Z2YqEOTatcClOowjnqU5DpQefmvACMZjVNSrAeun/Ku5GQuAFPLIUjlgjC88xPD5RXHr+BTTVBy5uwghXohftAG4xsBWJpph42JMCR2A5I8pnd7BTXsEbJeDexOZosxmEuHYG0yDGtXIzB/HofSc96tgT2CJV2n/G9A26NwnO7z9wQnUe3lZbOFU/ymSrjcSsLJgl8BXP21tsVQRGWku4sM3CL319XwybkRdC8RI4l/W5niIeU+2Pb0G+dHNPzKTRRqupFSExN12ArX15lTvG7H7Dsv4Rsa94hVuqmogAAAAABJRU5ErkJggg==" alt="tree"></div>`,
                                                    className: '',
                                                    iconSize: [24, 24],
                                                    iconAnchor: [12, 12],
                                                })}
                                                eventHandlers={{
                                                    dblclick: () =>
                                                        history.present.isEditModeEnabled &&
                                                        handlePlantEdit(plant),
                                                    click: () => {
                                                        if (
                                                            history.present.isEditModeEnabled &&
                                                            !isCreatingConnection
                                                        ) {
                                                            handleCreatePlantConnection(plant.id);
                                                        }
                                                    },
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
                                                        {plant.zoneId && (
                                                            <>
                                                                โซน: {plant.zoneId}
                                                                <br />
                                                            </>
                                                        )}
                                                        {history.present.isEditModeEnabled && (
                                                            <div className="mt-2">
                                                                <button
                                                                    onClick={() =>
                                                                        handlePlantEdit(plant)
                                                                    }
                                                                    className="mr-2 rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700"
                                                                >
                                                                    <FaEdit className="mr-1 inline" />
                                                                    แก้ไข
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        handleCreatePlantConnection(
                                                                            plant.id
                                                                        )
                                                                    }
                                                                    className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                                                                >
                                                                    <FaLink className="mr-1 inline" />
                                                                    เชื่อมต่อ
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}

                                        {/* Temporary connection line */}
                                        {tempConnectionLine && (
                                            <Polyline
                                                positions={tempConnectionLine.map((coord) => [
                                                    coord.lat,
                                                    coord.lng,
                                                ])}
                                                pathOptions={{
                                                    color: '#FFD700',
                                                    weight: 3,
                                                    opacity: 0.7,
                                                    dashArray: '10, 10',
                                                }}
                                            />
                                        )}

                                        {!history.present.isEditModeEnabled && (
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
                                        )}

                                        {history.present.isEditModeEnabled && (
                                            <div className="absolute right-4 top-4 z-[1000] rounded-lg bg-black bg-opacity-70 p-4 text-white">
                                                <h4 className="mb-2 font-semibold text-yellow-300">
                                                    🎛️ โหมดแก้ไขขั้นสูง
                                                </h4>
                                                <div className="space-y-1 text-sm">
                                                    <div>• คลิกแผนที่ = เพิ่มต้นไม้</div>
                                                    <div>• ดับเบิลคลิก = แก้ไข/ลบ</div>
                                                    <div>• คลิกต้นไม้ = สร้างการเชื่อมต่อ</div>
                                                    <div>• ลบท่อย่อยได้ในโปอปอัพ</div>
                                                    <div>• ลากเชื่อมต่อท่อได้ทุกจุด</div>
                                                    <div>• หมุนท่อ = แม่นยำทีละ 1°</div>
                                                    <div>• ปรับมุมท่อย่อย = 0-180°</div>
                                                </div>
                                                {isCreatingConnection && (
                                                    <div className="mt-3 rounded bg-yellow-900/50 p-2 text-xs">
                                                        <div className="font-semibold text-yellow-300">
                                                            🔗 กำลังเชื่อมต่อ
                                                        </div>
                                                        <div>คลิกท่อที่ต้องการเชื่อมต่อ</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
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

                    <EnhancedPlantEditModal
                        isOpen={showPlantEditModal}
                        onClose={() => {
                            setShowPlantEditModal(false);
                            setSelectedPlantForEdit(null);
                            setIsNewPlantMode(false);
                        }}
                        plant={selectedPlantForEdit}
                        onSave={handlePlantSave}
                        onDelete={handlePlantDelete}
                        availablePlants={history.present.availablePlants}
                        isNewPlant={isNewPlantMode}
                        onCreateConnection={handleCreatePlantConnection}
                    />

                    <EnhancedPipeEditModal
                        isOpen={showPipeEditModal}
                        onClose={() => {
                            setShowPipeEditModal(false);
                            setSelectedPipeForEdit(null);
                        }}
                        pipe={selectedPipeForEdit}
                        onSave={handlePipeSave}
                        onDelete={handlePipeDelete}
                        type={selectedPipeType}
                        branchSettings={history.present.branchPipeSettings}
                        onDeleteBranchPipe={handleDeleteBranchPipe}
                    />
                </div>
            </div>
            {/* Footer */}
            <Footer />
        </div>
    );
}
