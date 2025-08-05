// resources/js/pages/HorticulturePlannerPage.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef, useMemo, useCallback, useReducer } from 'react';

import HorticultureMapComponent from '../components/horticulture/HorticultureMapComponent';
import HorticultureDrawingManager from '../components/horticulture/HorticultureDrawingManager';
import EnhancedHorticultureSearchControl from '../components/horticulture/HorticultureSearchControl';
import DistanceMeasurementOverlay from '../components/horticulture/DistanceMeasurementOverlay';
import { router } from '@inertiajs/react';
import { useLanguage } from '../contexts/LanguageContext';
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
    FaCog,
    FaSearch,
    FaSpinner,
    FaLink,
    FaUnlink,
    FaBars,
    FaCompress,
    FaExpand,
    FaCopy,
    FaPaste,
    FaMousePointer,
    FaSquare,
    FaRuler,
    FaLayerGroup,
    FaEye,
    FaEyeSlash,
    FaLock,
    FaUnlock,
    FaHome,
    FaPlay,
    FaPause,
    FaStop,
    FaMagic,
    FaClone,
    FaObjectGroup,
    FaObjectUngroup,
    FaSlidersH,
    FaAdjust,
    FaCheck,
    FaCut,
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
    return `${prefix}_${timestamp}_${random}`;
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

                if (optimalDistance >= 5) {
                    const endPosition = calculateBranchEndPosition(
                        position,
                        adjustedDirection,
                        multiplier,
                        optimalDistance
                    );

                    const startInTargetArea = isPointInPolygon(position, targetArea);
                    const endInTargetArea = isPointInPolygon(endPosition, targetArea);

                    if (startInTargetArea || endInTargetArea) {
                        const adjustedEndPosition = adjustEndPointBeforeExclusions(position, endPosition, exclusions);
                        let branchCoordinates = [position, adjustedEndPosition];
                        
                        const adjustedEndInTargetArea = isPointInPolygon(adjustedEndPosition, targetArea);
                        
                        if (adjustedEndInTargetArea || startInTargetArea) {
                            const plants = generateOptimalSpacingPlants(
                                branchCoordinates,
                                plantData,
                                exclusions,
                                targetArea
                            );

                            if (plants.length >= 0) {
                                if (plants.length > 0) {
                                    const lastPlant = plants[plants.length - 1];
                                    branchCoordinates = [position, lastPlant.position];
                                }

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
                    }
                }
            });
        }
    }

    return branchPipes;
};

const regenerateBranchPipesWithAngle = (
    subMainPipe: SubMainPipe,
    newAngle: number,
    zone: any,
    exclusions: any[],
    useZones: boolean,
    mainArea: { lat: number; lng: number }[]
): BranchPipe[] => {
    const pipeLength = calculatePipeLength(subMainPipe.coordinates);

    let targetArea: { lat: number; lng: number }[];
    if (useZones && zone.coordinates && zone.coordinates.length > 0) {
        targetArea = zone.coordinates;
    } else {
        targetArea = mainArea;
    }

    if (!targetArea || targetArea.length < 3) {
        return subMainPipe.branchPipes;
    }

    const plantData = subMainPipe.branchPipes[0]?.plants[0]?.plantData;
    if (!plantData) return subMainPipe.branchPipes;

    const exactRowSpacing = plantData.rowSpacing;
    const numberOfBranches = Math.max(2, Math.floor(pipeLength / exactRowSpacing) + 1);

    const newBranchPipes: BranchPipe[] = [];

    for (let i = 0; i < numberOfBranches; i++) {
        const distanceFromStart = exactRowSpacing * 0.5 + i * exactRowSpacing;
        if (distanceFromStart > pipeLength) break;

        const position = interpolatePositionAlongPipe(subMainPipe.coordinates, distanceFromStart);

        if (position) {
            const segmentIndex = Math.max(
                0,
                Math.min(
                    Math.floor(
                        (distanceFromStart / pipeLength) * (subMainPipe.coordinates.length - 1)
                    ),
                    subMainPipe.coordinates.length - 2
                )
            );

            const direction = calculatePipeDirection(subMainPipe.coordinates, segmentIndex);
            const perpendicular = calculatePerpendicularDirection(direction);

            ['left', 'right'].forEach((side, sideIndex) => {
                const multiplier = sideIndex === 0 ? -1 : 1;
                const adjustedDirection = rotatePerpendicular(perpendicular, newAngle - 90);

                const optimalDistance = calculateOptimalDistanceToPolygonBoundary(
                    position,
                    adjustedDirection,
                    multiplier,
                    targetArea,
                    plantData.plantSpacing
                );

                if (optimalDistance >= 5) {
                    const endPosition = calculateBranchEndPosition(
                        position,
                        adjustedDirection,
                        multiplier,
                        optimalDistance
                    );

                    const startInTargetArea = isPointInPolygon(position, targetArea);
                    const endInTargetArea = isPointInPolygon(endPosition, targetArea);

                    if (startInTargetArea || endInTargetArea) {
                        const adjustedEndPosition = adjustEndPointBeforeExclusions(position, endPosition, exclusions);
                        let branchCoordinates = [position, adjustedEndPosition];
                        
                        const adjustedEndInTargetArea = isPointInPolygon(adjustedEndPosition, targetArea);
                        
                        if (adjustedEndInTargetArea || startInTargetArea) {
                            const plants = generateOptimalSpacingPlants(
                                branchCoordinates,
                                plantData,
                                exclusions,
                                targetArea
                            );

                            if (plants.length >= 0) {
                                if (plants.length > 0) {
                                    const lastPlant = plants[plants.length - 1];
                                    branchCoordinates = [position, lastPlant.position];
                                }

                                const branchPipe: BranchPipe = {
                                    id: generateUniqueId('branch'),
                                    subMainPipeId: subMainPipe.id,
                                    coordinates: branchCoordinates,
                                    length: calculatePipeLength(branchCoordinates),
                                    diameter: 25,
                                    plants,
                                    isEditable: true,
                                    sprinklerType: 'standard',
                                    angle: newAngle,
                                    connectionPoint: distanceFromStart / pipeLength,
                                };

                                newBranchPipes.push(branchPipe);
                            }
                        }
                    }
                }
            });
        }
    }

    return newBranchPipes;
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
    plantSpacing: number,
): number => {
    if (!polygon || polygon.length < 3) {
        return 0;
    }

    try {
        const maxTestDistance = 300; 
        let low = 0;
        let high = maxTestDistance;
        let maxValidDistance = 0;

        while (high - low > 0.5) { 
            const mid = (low + high) / 2;
            const testPoint = calculateBranchEndPosition(startPoint, direction, multiplier, mid);

            if (isPointInPolygon(testPoint, polygon)) {
                maxValidDistance = mid;
                low = mid;
            } else {
                high = mid;
            }
        }

        const startBufferFromSubMain = Math.min(plantSpacing * 0.3, 2); 
        const availableLengthForPlants = maxValidDistance - startBufferFromSubMain;

        if (availableLengthForPlants <= 0) {
            return 0;
        }

        const numberOfPlantsOnBranch = Math.max(
            0, 
            Math.floor(availableLengthForPlants / plantSpacing)
        );
        
        const optimalBranchLength = Math.min(
            startBufferFromSubMain + numberOfPlantsOnBranch * plantSpacing,
            maxValidDistance * 0.95 
        );

        return Math.max(optimalBranchLength, 5); 
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
            if (!pipeCoordinates || pipeCoordinates.length < 2 || !plantData) {
                return [];
            }

            try {
        
        const plants: any[] = [];
        const pipeLength = calculatePipeLength(pipeCoordinates);
        const exactSpacing = plantData.plantSpacing;
        const startBuffer = exactSpacing * 0.5; 
        const endBuffer = exactSpacing * 0.2;
                        const availableLength = pipeLength - startBuffer - endBuffer;
                const numberOfPlants = Math.max(0, Math.floor(availableLength / exactSpacing));

        const tempPlants: any[] = [];
        
        for (let i = 0; i <= numberOfPlants; i++) {
            const exactDistanceOnPipe = startBuffer + i * exactSpacing;
            if (exactDistanceOnPipe > pipeLength - endBuffer) break;

            const position = interpolatePositionAlongPipe(pipeCoordinates, exactDistanceOnPipe);

            if (position) {
                
                const inZone = isPointInPolygon(position, zoneCoordinates);
                const inExclusion = exclusionAreas.some((exclusion) =>
                                                isPointInPolygon(position, exclusion.coordinates)
                        );

                if (inZone && !inExclusion) {   
                    const validBoundaryDistance = isValidDistanceFromBoundary(
                        position, 
                        zoneCoordinates, 
                        plantData.plantSpacing, 
                                                    0.05 
                        );
                        
                        if (validBoundaryDistance) {
                        tempPlants.push({
                            id: generateUniqueId('plant'),
                            position,
                            plantData,
                            isSelected: false,
                            isEditable: true,
                            health: 'good',
                            distanceOnPipe: exactDistanceOnPipe,
                                                        });
                            }
                        }
            }
        }
        
        if (tempPlants.length > 1) {
            const lastPlant = tempPlants[tempPlants.length - 1];
            const isLastPlantTooClose = !isValidDistanceFromBoundary(
                lastPlant.position,
                zoneCoordinates,
                plantData.plantSpacing,
                0.15
            );
            
            if (isLastPlantTooClose) {
                tempPlants.pop();
            }
                        }
        
        tempPlants.forEach(plant => {
            plants.push({
                id: plant.id,
                position: plant.position,
                plantData: plant.plantData,
                isSelected: plant.isSelected,
                isEditable: plant.isEditable,
                health: plant.health,
            });
                        });

                return plants;
    } catch (error) {
        console.error('Error generating enhanced optimal spacing plants:', error);
        return [];
    }
};

const isValidDistanceFromBoundary = (
    point: { lat: number; lng: number },
    polygon: { lat: number; lng: number }[],
    plantSpacing: number,
    minPercentage: number = 0.4
): boolean => {
    if (!polygon || polygon.length < 3) return true;
    
    try {
        let minDistance = Infinity;
        
        for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            const edge1 = polygon[i];
            const edge2 = polygon[j];
            
            const distance = distanceFromPointToLineSegment(point, edge1, edge2);
            minDistance = Math.min(minDistance, distance);
        }
        
        const requiredDistance = plantSpacing * minPercentage;
        return minDistance >= requiredDistance;
    } catch (error) {
        console.error('Error checking boundary distance:', error);
        return true;
    }
};

const distanceFromPointToLineSegment = (
    point: { lat: number; lng: number },
    lineStart: { lat: number; lng: number },
    lineEnd: { lat: number; lng: number }
): number => {
    // Vectors in a pseudo-Cartesian space for projection calculation
    // This is an approximation, but the final distance will use Haversine.
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) { // lineStart and lineEnd are the same point
        return calculateDistanceBetweenPoints(point, lineStart);
    }
    
    const param = dot / lenSq;
    
    let closestPointOnSegment: { lat: number; lng: number };
    
    if (param < 0) {
        closestPointOnSegment = lineStart;
    } else if (param > 1) {
        closestPointOnSegment = lineEnd;
    } else {
        closestPointOnSegment = {
            lat: lineStart.lat + param * C,
            lng: lineStart.lng + param * D,
        };
    }

    // Use the accurate Haversine formula for the final distance calculation
    return calculateDistanceBetweenPoints(point, closestPointOnSegment);
};

const adjustEndPointBeforeExclusions = (
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    exclusions: any[]
): { lat: number; lng: number } => {
    if (!exclusions || exclusions.length === 0) return end;
    
    try {
        let shortestDistance = Infinity;
        let bestEndPoint = end;
        
        for (const exclusion of exclusions) {
            const intersectionPoint = findLinePolygonIntersection(start, end, exclusion.coordinates);
            
                    if (intersectionPoint) {
            const distanceToIntersection = calculateDistanceBetweenPoints(start, intersectionPoint);
                
                if (distanceToIntersection < shortestDistance) {
                    shortestDistance = distanceToIntersection;
                    
                    const lineDirection = {
                        lat: end.lat - start.lat,
                        lng: end.lng - start.lng
                    };
                    const lineLength = Math.sqrt(lineDirection.lat * lineDirection.lat + lineDirection.lng * lineDirection.lng);
                    
                    if (lineLength > 0) {
                        const normalizedDirection = {
                            lat: lineDirection.lat / lineLength,
                            lng: lineDirection.lng / lineLength
                        };
                        
                        const bufferMeters = 5;
                        const safeDistanceMeters = Math.max(0, distanceToIntersection - bufferMeters);
                        
                        bestEndPoint = {
                            lat: start.lat + normalizedDirection.lat * safeDistanceMeters / 111000,
                            lng: start.lng + normalizedDirection.lng * safeDistanceMeters / (111000 * Math.cos((start.lat * Math.PI) / 180))
                        };
                    }
                }
            }
        }
        
        return bestEndPoint;
    } catch (error) {
        console.error('Error adjusting end point before exclusions:', error);
        return end;
    }
};

const findLinePolygonIntersection = (
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    polygon: { lat: number; lng: number }[]
): { lat: number; lng: number } | null => {
    if (!polygon || polygon.length < 3) return null;
    
    if (isPointInPolygon(start, polygon)) {
        return start;
    }
    
    let closestIntersection: { lat: number; lng: number } | null = null;
    let closestDistance = Infinity;
    
    for (let i = 0; i < polygon.length; i++) {
        const j = (i + 1) % polygon.length;
        const intersection = findLineIntersection(start, end, polygon[i], polygon[j]);
        
        if (intersection) {
            const distance = calculateDistanceBetweenPoints(start, intersection);
            if (distance < closestDistance && distance > 0.00001) { 
                closestDistance = distance;
                closestIntersection = intersection;
            }
        }
    }
    
    return closestIntersection;
};

const findLineIntersection = (
    lineStart: { lat: number; lng: number },
    lineEnd: { lat: number; lng: number },
    segmentStart: { lat: number; lng: number },
    segmentEnd: { lat: number; lng: number }
): { lat: number; lng: number } | null => {
    const x1 = lineStart.lat, y1 = lineStart.lng;
    const x2 = lineEnd.lat, y2 = lineEnd.lng;
    const x3 = segmentStart.lat, y3 = segmentStart.lng;
    const x4 = segmentEnd.lat, y4 = segmentEnd.lng;
    
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    
    if (Math.abs(denom) < 1e-10) return null; 
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
            lat: x1 + t * (x2 - x1),
            lng: y1 + t * (y2 - y1)
        };
    }
    
    return null;
};



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
    currentAngle?: number;
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
    isDragging?: boolean;
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

interface PipeSegment {
    index: number;
    startPlant: PlantLocation;
    endPlant: PlantLocation;
    length: number;
    label: string;
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
    selectedItems: {
        plants: string[];
        pipes: string[];
        zones: string[];
    };
    clipboard: {
        plants: PlantLocation[];
        pipes: (MainPipe | SubMainPipe | BranchPipe)[];
    };
    editModeSettings: {
        snapToGrid: boolean;
        gridSize: number;
        showMeasurements: boolean;
        autoConnect: boolean;
        batchMode: boolean;
        selectionMode: 'single' | 'multi' | 'rectangle';
        dragMode: 'none' | 'plant' | 'pipe';
    };
    layerVisibility: {
        plants: boolean;
        pipes: boolean;
        zones: boolean;
        exclusions: boolean;
        grid: boolean;
        measurements: boolean;
    };
    realTimeEditing: {
        activePipeId: string | null;
        activeAngle: number;
        isAdjusting: boolean;
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

const DEFAULT_PLANT_TYPES = (t: (key: string) => string): PlantData[] => [
    { id: 1, name: t('มะม่วง'), plantSpacing: 8, rowSpacing: 8, waterNeed: 50 },
    { id: 2, name: t('ทุเรียน'), plantSpacing: 10, rowSpacing: 10, waterNeed: 80 },
    { id: 3, name: t('สับปะรด'), plantSpacing: 1, rowSpacing: 1.2, waterNeed: 3 },
    { id: 4, name: t('กล้วย'), plantSpacing: 2.5, rowSpacing: 3, waterNeed: 25 },
    { id: 5, name: t('มะละกอ'), plantSpacing: 2.5, rowSpacing: 2.5, waterNeed: 15 },
    { id: 6, name: t('มะพร้าว'), plantSpacing: 9, rowSpacing: 9, waterNeed: 100 },
    { id: 7, name: t('กาแฟอาราบิก้า'), plantSpacing: 2, rowSpacing: 2, waterNeed: 5 },
    { id: 8, name: t('โกโก้'), plantSpacing: 3, rowSpacing: 3, waterNeed: 15 },
    { id: 9, name: t('ปาล์มน้ำมัน'), plantSpacing: 9, rowSpacing: 9, waterNeed: 150 },
    { id: 10, name: t('ยางพารา'), plantSpacing: 7, rowSpacing: 3, waterNeed: 0 },
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

const formatArea = (area: number, t: (key: string) => string): string => {
    if (typeof area !== 'number' || isNaN(area) || area < 0) return `0 ${t('ตร.ม.')}`;
    if (area >= 1600) {
        return `${(area / 1600).toFixed(2)} ${t('ไร่')}`;
    } else {
        return `${area.toFixed(2)} ${t('ตร.ม.')}`;
    }
};

const formatWaterVolume = (volume: number, t: (key: string) => string): string => {
    if (typeof volume !== 'number' || isNaN(volume) || volume < 0) return `0 ${t('ลิตร')}`;
    if (volume >= 1000000) {
        return `${(volume / 1000000).toFixed(2)} ${t('ล้านลิตร')}`;
    } else if (volume >= 1000) {
        return `${volume.toLocaleString('th-TH')} ${t('ลิตร')}`;
    } else {
        return `${volume.toFixed(2)} ${t('ลิตร')}`;
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

const CustomPlantModal = ({
    isOpen,
    onClose,
    onSave,
    defaultValues,
    t,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (plantData: PlantData) => void;
    defaultValues?: Partial<PlantData>;
    t: (key: string) => string;
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
            alert(t('กรุณากรอกชื่อพืช'));
            return;
        }
        if (plantData.plantSpacing <= 0 || plantData.rowSpacing <= 0 || plantData.waterNeed <= 0) {
            alert(t('กรุณากรอกค่าที่มากกว่า 0'));
            return;
        }
        onSave(plantData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-gray-900 p-6 shadow-2xl">
                <h3 className="mb-4 text-xl font-semibold text-white">🌱 {t('กำหนดพืชใหม่')}</h3>

                <div className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-white">
                            {t('ชื่อพืช *')}
                        </label>
                        <input
                            type="text"
                            value={plantData.name}
                            onChange={(e) => setPlantData({ ...plantData, name: e.target.value })}
                            className="w-full rounded border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder={t('เช่น มะม่วงพันธุ์ใหม่')}
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-white">
                            {t('น้ำต่อต้น (ลิตร/ครั้ง) *')}
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
                            className="w-full rounded border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-white">
                                {t('ระยะห่างต้น (ม.) *')}
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
                                className="w-full rounded border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-white">
                                {t('ระยะห่างแถว (ม.) *')}
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
                                className="w-full rounded border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded bg-gray-100 px-4 py-2 text-black transition-colors hover:bg-gray-200"
                    >
                        {t('ยกเลิก')}
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 rounded bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
                    >
                        {t('บันทึก')}
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
    t,
}: {
    isOpen: boolean;
    onClose: () => void;
    zone: Zone | null;
    availablePlants: PlantData[];
    onSave: (zoneId: string, plantData: PlantData) => void;
    onCreateCustomPlant: () => void;
    t: (key: string) => string;
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
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-2xl">
                <h3 className="mb-4 text-xl font-semibold text-gray-900">
                    🌱 {t('เลือกพืชสำหรับ')} {t(zone.name)}
                </h3>

                <div className="mb-4 rounded bg-blue-50 p-3 text-sm">
                    <div className="text-gray-700">📐 {t('ข้อมูลโซน')}:</div>
                    <div className="text-gray-600">
                        • {t('พื้นที่')}: {formatArea(zone.area, t)}
                    </div>
                    <div className="flex items-center">
                        <span className="text-gray-600">• {t('สี')}: </span>
                        <span
                            className="ml-2 inline-block h-4 w-4 rounded"
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
                                    ? 'border border-green-300 bg-green-100'
                                    : 'border border-gray-200 bg-gray-50 hover:bg-gray-100'
                            }`}
                        >
                            <div className="font-medium text-gray-900">{t(plant.name)}</div>
                            <div className="text-sm text-gray-600">
                                {t('ระยะ')}: {plant.plantSpacing}×{plant.rowSpacing}
                                {t('ม.')} | {t('น้ำ')}: {plant.waterNeed} {t('ล./ครั้ง')}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4">
                    <button
                        onClick={onCreateCustomPlant}
                        className="w-full rounded border border-purple-300 bg-purple-100 px-4 py-2 text-sm text-purple-700 transition-colors hover:bg-purple-200"
                    >
                        ➕ {t('เพิ่มพืชใหม่')}
                    </button>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
                    >
                        {t('ยกเลิก')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!selectedPlant}
                        className={`flex-1 rounded px-4 py-2 transition-colors ${
                            selectedPlant
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'cursor-not-allowed bg-gray-300 text-gray-500'
                        }`}
                    >
                        {t('บันทึก')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SimpleMousePlantEditModal = ({
    isOpen,
    onClose,
    plant,
    onSave,
    onDelete,
    availablePlants,
    t,
}: {
    isOpen: boolean;
    onClose: () => void;
    plant: PlantLocation | null;
    onSave: (plantId: string, newPlantData: PlantData) => void;
    onDelete: (plantId: string) => void;
    availablePlants: PlantData[];
    t: (key: string) => string;
}) => {
    const [selectedPlantData, setSelectedPlantData] = useState<PlantData | null>(null);

    useEffect(() => {
        if (plant) {
            setSelectedPlantData(plant.plantData);
        }
    }, [plant]);

    const handleSave = () => {
        if (!plant || !selectedPlantData) return;
        onSave(plant.id, selectedPlantData);
        onClose();
    };

    const handleDelete = () => {
        if (!plant) return;
        onDelete(plant.id);
        onClose();
    };

    if (!isOpen || !plant) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-gray-900 p-6 shadow-2xl">
                <h3 className="mb-4 text-xl font-semibold text-white">🌱 {t('แก้ไขต้นไม้')}</h3>

                <div className="mb-4 rounded-lg border border-blue-200 bg-gray-900 p-3 text-sm text-white">
                    💡 <strong>{t('การปรับตำแหน่ง')}:</strong> {t('ลากต้นไม้บนแผนที่ได้โดยตรง')}(
                    {t('เฉพาะในโหมดแก้ไข')})
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-white">
                            {t('ชนิดพืช')}
                        </label>
                        <select
                            value={selectedPlantData?.id || ''}
                            onChange={(e) => {
                                const plantData = availablePlants.find(
                                    (p) => p.id === Number(e.target.value)
                                );
                                setSelectedPlantData(plantData || null);
                            }}
                            className="w-full rounded border border-gray-300 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {availablePlants.map((plant) => (
                                <option key={plant.id} value={plant.id}>
                                    {t(plant.name)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedPlantData && (
                        <div className="rounded-lg border border-green-200 bg-gray-900 p-3 text-sm">
                            <div className="text-white">
                                <strong>{t('พืช')}:</strong> {t(selectedPlantData.name)}
                            </div>
                            <div className="text-white">
                                <strong>{t('ระยะห่างต้น')}:</strong>{' '}
                                {selectedPlantData.plantSpacing} {t('ม.')}
                            </div>
                            <div className="text-white">
                                <strong>{t('ระยะห่างแถว')}:</strong> {selectedPlantData.rowSpacing}{' '}
                                {t('ม.')}
                            </div>
                            <div className="text-white">
                                <strong>{t('น้ำต่อต้น')}:</strong> {selectedPlantData.waterNeed}{' '}
                                {t('ลิตร/ครั้ง')}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                    >
                        {t('ยกเลิก')}
                    </button>
                    <button
                        onClick={handleDelete}
                        className="flex-1 rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                    >
                        <FaTrash className="mr-2 inline" />
                        {t('ลบ')}
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 rounded bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
                    >
                        {t('บันทึก')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PipeSegmentSelectionModal = ({
    isOpen,
    onClose,
    branchPipe,
    onDeleteSegment,
    onDeleteWholePipe,
    t,
}: {
    isOpen: boolean;
    onClose: () => void;
    branchPipe: BranchPipe | null;
    onDeleteSegment: (branchPipeId: string, segmentIndex: number) => void;
    onDeleteWholePipe: (branchPipeId: string) => void;
    t: (key: string) => string;
}) => {
    const [selectedSegment, setSelectedSegment] = useState<number | null>(null);

    useEffect(() => {
        if (branchPipe && branchPipe.plants.length >= 2) {
            setSelectedSegment(0);
        }
    }, [branchPipe]);

    const handleDeleteSegment = () => {
        if (!branchPipe || selectedSegment === null) return;
        onDeleteSegment(branchPipe.id, selectedSegment);
        onClose();
    };

    const handleDeleteWhole = () => {
        if (!branchPipe) return;
        onDeleteWholePipe(branchPipe.id);
        onClose();
    };

    if (!isOpen || !branchPipe) return null;

    const segments: PipeSegment[] = [];
    for (let i = 0; i < branchPipe.plants.length - 1; i++) {
        const startPlant = branchPipe.plants[i];
        const endPlant = branchPipe.plants[i + 1];
        const segmentLength = calculateDistanceBetweenPoints(
            startPlant.position,
            endPlant.position
        );

        segments.push({
            index: i,
            startPlant,
            endPlant,
            length: segmentLength,
            label: `ส่วนที่ ${i + 1}: ต้นไม้ ${i + 1} → ต้นไม้ ${i + 2}`,
        });
    }

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-gray-900 p-6 shadow-2xl">
                <h3 className="mb-4 text-xl font-semibold text-white">
                    <FaCut className="mr-2 inline" />
                    {t('ลบท่อย่อยระหว่างต้นไม้')}
                </h3>

                <div className="mb-4 rounded-lg border border-blue-200 bg-gray-900 p-3 text-sm text-white">
                    <div className="font-medium">{t('ข้อมูลท่อ')}:</div>
                    <div>
                        • {t('ความยาวรวม')}: {branchPipe.length.toFixed(2)} {t('ม.')}
                    </div>
                    <div>
                        • {t('จำนวนต้นไม้')}: {branchPipe.plants.length} {t('ต้น')}
                    </div>
                    <div>
                        • {t('จำนวนส่วนที่ตัดได้')}: {segments.length} {t('ส่วน')}
                    </div>
                </div>

                {segments.length > 0 ? (
                    <div className="space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-white">
                                {t('เลือกส่วนท่อที่ต้องการลบ')}:
                            </label>
                            <div className="max-h-40 space-y-2 overflow-y-auto">
                                {segments.map((segment, index) => (
                                    <div
                                        key={index}
                                        onClick={() => setSelectedSegment(segment.index)}
                                        className={`cursor-pointer rounded p-3 transition-colors ${
                                            selectedSegment === segment.index
                                                ? 'border border-red-300 bg-red-900'
                                                : 'border border-gray-300 bg-gray-800 hover:bg-gray-700'
                                        }`}
                                    >
                                        <div className="font-medium text-white">
                                            {segment.label}
                                        </div>
                                        <div className="text-sm text-gray-300">
                                            {t('ความยาวส่วน')}: {segment.length.toFixed(2)}{' '}
                                            {t('ม.')}
                                        </div>
                                        <div className="text-xs text-yellow-300">
                                            💡 {t('ลบท่อระหว่างต้นไม้')} - {t('ต้นไม้ยังอยู่')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-lg border border-yellow-200 bg-gray-900 p-3 text-sm text-white">
                            <div className="mb-2 font-medium text-yellow-400">
                                💡 {t('วิธีการทำงาน')}:
                            </div>
                            <div>• {t('เลือกส่วนท่อระหว่างต้นไม้ที่ต้องการลบ')}</div>
                            <div>• {t('ต้นไม้จะไม่ถูกลบ แต่ท่อเชื่อมต่อจะหาย')}</div>
                            <div>• {t('ท่อย่อยจะแยกเป็นส่วนๆ หรือสั้นลง')}</div>
                            <div>• {t('สามารถลบทั้งเส้นได้ถ้าต้องการ')}</div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 rounded bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                            >
                                {t('ยกเลิก')}
                            </button>
                            <button
                                onClick={handleDeleteWhole}
                                className="flex-1 rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                            >
                                <FaTrash className="mr-1 inline" />
                                {t('ลบทั้งเส้น')}
                            </button>
                            <button
                                onClick={handleDeleteSegment}
                                disabled={selectedSegment === null}
                                className={`flex-1 rounded px-4 py-2 transition-colors ${
                                    selectedSegment !== null
                                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                                        : 'cursor-not-allowed bg-gray-300 text-gray-500'
                                }`}
                            >
                                <FaCut className="mr-1 inline" />
                                {t('ลบส่วนนี้')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-lg border border-gray-300 bg-gray-800 p-3 text-center text-gray-300">
                            {t('ไม่สามารถแยกส่วนได้')} - {t('มีต้นไม้น้อยเกินไป')}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 rounded bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                            >
                                {t('ยกเลิก')}
                            </button>
                            <button
                                onClick={handleDeleteWhole}
                                className="flex-1 rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                            >
                                <FaTrash className="mr-1 inline" />
                                {t('ลบทั้งเส้น')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const BatchOperationsModal = ({
    isOpen,
    onClose,
    selectedItems,
    onBatchDelete,
    onBatchMove,
    onBatchCopy,
    onBatchPaste,
    onCreateTemplate,
    onDeleteSpecificPlants,
    onDeleteBranchPipe,
    onSegmentedPipeDeletion,
    t,
}: {
    isOpen: boolean;
    onClose: () => void;
    selectedItems: { plants: string[]; pipes: string[]; zones: string[] };
    onBatchDelete: () => void;
    onBatchMove: (offset: Coordinate) => void;
    onBatchCopy: () => void;
    onBatchPaste: () => void;
    onCreateTemplate: (name: string) => void;
    onDeleteSpecificPlants?: (plantIds: string[]) => void;
    onDeleteBranchPipe?: (branchPipeIds: string[]) => void;
    onSegmentedPipeDeletion?: (branchPipeId: string) => void;
    t: (key: string) => string;
}) => {
    const [moveOffset, setMoveOffset] = useState<Coordinate>({ lat: 0, lng: 0 });
    const [templateName, setTemplateName] = useState('');

    const totalSelected =
        selectedItems.plants.length + selectedItems.pipes.length + selectedItems.zones.length;

    if (!isOpen || totalSelected === 0) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-gray-900 p-6 shadow-2xl">
                <h3 className="mb-4 text-xl font-semibold text-white">
                    🔧 {t('การดำเนินการแบบกลุ่ม')}
                </h3>

                <div className="mb-4 rounded-lg border border-blue-200 bg-gray-900 p-3">
                    <div className="text-sm text-white">
                        <div className="font-medium">{t('รายการที่เลือก')}:</div>
                        <div>
                            • {t('ต้นไม้')}: {selectedItems.plants.length} {t('ต้น')}
                        </div>
                        <div>
                            • {t('ท่อ')}: {selectedItems.pipes.length} {t('เส้น')}
                        </div>
                        <div>
                            • {t('โซน')}: {selectedItems.zones.length} {t('โซน')}
                        </div>
                        <div className="mt-1 font-medium">
                            {t('รวม')}: {totalSelected} {t('รายการ')}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {selectedItems.plants.length > 0 && onDeleteSpecificPlants && (
                        <div className="rounded-lg border border-orange-200 bg-gray-900 p-4">
                            <h4 className="mb-3 font-medium text-white">🌱 {t('จัดการต้นไม้')}</h4>
                            <button
                                onClick={() => onDeleteSpecificPlants(selectedItems.plants)}
                                className="w-full rounded bg-orange-600 px-3 py-2 text-sm text-white transition-colors hover:bg-orange-700"
                            >
                                🗑️ {t('ลบต้นไม้ที่เลือก')} ({selectedItems.plants.length} {t('ต้น')}
                                )
                            </button>
                            <div className="mt-2 text-xs text-orange-300">
                                * {t('ลบเฉพาะต้นไม้')} {t('ไม่ลบท่อย่อยทั้งเส้น')}
                            </div>
                        </div>
                    )}

                    {selectedItems.pipes.length > 0 && onDeleteBranchPipe && (
                        <div className="rounded-lg border border-red-200 bg-gray-900 p-4">
                            <h4 className="mb-3 font-medium text-white">🚰 {t('จัดการท่อ')}</h4>
                            <div className="space-y-2">
                                <button
                                    onClick={() => onDeleteBranchPipe(selectedItems.pipes)}
                                    className="w-full rounded bg-red-600 px-3 py-2 text-sm text-white transition-colors hover:bg-red-700"
                                >
                                    🗑️ {t('ลบท่อที่เลือก')} ({selectedItems.pipes.length}{' '}
                                    {t('เส้น')})
                                </button>

                                {selectedItems.pipes.length === 1 && onSegmentedPipeDeletion && (
                                    <button
                                        onClick={() =>
                                            onSegmentedPipeDeletion(selectedItems.pipes[0])
                                        }
                                        className="w-full rounded bg-orange-600 px-3 py-2 text-sm text-white transition-colors hover:bg-orange-700"
                                    >
                                        <FaCut className="mr-1 inline" />
                                        {t('ลบท่อระหว่างต้นไม้')}
                                    </button>
                                )}
                            </div>
                            <div className="mt-2 text-xs text-red-300">
                                * {t('ลบท่อย่อยโดยไม่ลบต้นไม้')} {t('หรือลบแค่ส่วนระหว่างต้นไม้')}
                            </div>
                        </div>
                    )}

                    <div className="rounded-lg border border-green-200 bg-gray-900 p-4">
                        <h4 className="mb-3 font-medium text-white">📋 {t('คัดลอกและวาง')}</h4>
                        <div className="flex gap-2">
                            <button
                                onClick={onBatchCopy}
                                className="flex-1 rounded bg-green-600 px-3 py-2 text-sm text-white transition-colors hover:bg-green-700"
                            >
                                <FaCopy className="mr-1 inline" />
                                {t('คัดลอก')}
                            </button>
                            <button
                                onClick={onBatchPaste}
                                className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                            >
                                <FaPaste className="mr-1 inline" />
                                {t('วาง')}
                            </button>
                        </div>
                    </div>

                    <div className="rounded-lg border border-purple-200 bg-gray-900 p-4">
                        <h4 className="mb-3 font-medium text-white">📄 {t('สร้างแม่แบบ')}</h4>
                        <div className="mb-3">
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder={t('ชื่อแม่แบบ')}
                                className="w-full rounded border border-gray-300 bg-gray-900 px-3 py-2 text-sm text-white"
                            />
                        </div>
                        <button
                            onClick={() => {
                                if (templateName.trim()) {
                                    onCreateTemplate(templateName);
                                    setTemplateName('');
                                }
                            }}
                            disabled={!templateName.trim()}
                            className="w-full rounded bg-purple-600 px-3 py-2 text-sm text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                        >
                            <FaMagic className="mr-1 inline" />
                            {t('สร้างแม่แบบ')}
                        </button>
                    </div>

                    <div className="rounded-lg border border-red-200 bg-gray-900 p-4">
                        <h4 className="mb-3 font-medium text-white">🗑️ {t('ลบรายการ')}</h4>
                        <button
                            onClick={onBatchDelete}
                            className="w-full rounded bg-red-600 px-3 py-2 text-sm text-white transition-colors hover:bg-red-700"
                        >
                            <FaTrash className="mr-1 inline" />
                            {t('ลบรายการที่เลือก')} ({totalSelected} {t('รายการ')})
                        </button>
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                    >
                        {t('ปิด')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const RealTimeBranchControlModal = ({
    isOpen,
    onClose,
    subMainPipe,
    currentAngle,
    onAngleChange,
    onApply,
    branchSettings,
    t,
}: {
    isOpen: boolean;
    onClose: () => void;
    subMainPipe: SubMainPipe | null;
    currentAngle: number;
    onAngleChange: (angle: number) => void;
    onApply: () => void;
    branchSettings: {
        defaultAngle: number;
        maxAngle: number;
        minAngle: number;
        angleStep: number;
    };
    t: (key: string) => string;
}) => {
    if (!isOpen || !subMainPipe) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-start justify-start bg-black bg-opacity-50">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-gray-900 p-6 shadow-2xl">
                <h3 className="mb-4 text-xl font-semibold text-white">
                    🎛️ {t('ปรับมุมท่อย่อยแบบเรียลไทม์')}
                </h3>

                <div className="mb-4 rounded-lg border border-blue-200 bg-gray-900 p-3 text-sm text-white">
                    <div>
                        <strong>{t('ท่อเมนรอง')}:</strong> {subMainPipe.id}
                    </div>
                    <div>
                        <strong>{t('จำนวนท่อย่อย')}:</strong> {subMainPipe.branchPipes.length}{' '}
                        {t('เส้น')}
                    </div>
                    <div>
                        <strong>{t('จำนวนต้นไม้')}:</strong>{' '}
                        {subMainPipe.branchPipes.reduce((sum, bp) => sum + bp.plants.length, 0)}{' '}
                        {t('ต้น')}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-white">
                            {t('มุมท่อย่อย')}: {currentAngle}°
                        </label>
                        <input
                            type="range"
                            min={branchSettings.minAngle}
                            max={branchSettings.maxAngle}
                            step={branchSettings.angleStep}
                            value={currentAngle}
                            onChange={(e) => onAngleChange(parseFloat(e.target.value))}
                            className="w-full accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-white">
                            <span>{branchSettings.minAngle}°</span>
                            <span>90°</span>
                            <span>{branchSettings.maxAngle}°</span>
                        </div>
                    </div>

                    <div className="rounded-lg border border-yellow-200 bg-gray-900 p-3 text-sm text-white">
                        <div className="mb-2 font-medium">💡 {t('การใช้งาน')}:</div>
                        <div>• {t('ลากแถบเลื่อนเพื่อดูผลแบบเรียลไทม์')}</div>
                        <div>• {t('คลิก "ยืนยัน" เพื่อบันทึกการเปลี่ยนแปลง')}</div>
                        <div>• {t('ท่อย่อยและต้นไม้จะปรับตำแหน่งตามมุมใหม่')}</div>
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                    >
                        {t('ยกเลิก')}
                    </button>
                    <button
                        onClick={onApply}
                        className="flex-1 rounded bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
                    >
                        <FaCheck className="mr-2 inline" />
                        {t('ยืนยัน')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DistanceIndicator = ({
    map,
    isActive,
    editMode,
}: {
    map: google.maps.Map | null;
    isActive: boolean;
    editMode: string | null;
}) => {
    const [currentDistance, setCurrentDistance] = useState<number>(0);
    const [startPoint, setStartPoint] = useState<Coordinate | null>(null);
    const [mousePosition, setMousePosition] = useState<Coordinate | null>(null);
    const indicatorRef = useRef<HTMLDivElement | null>(null);
    const { t } = useLanguage();

    useEffect(() => {
        if (!map || !isActive || editMode !== 'zone') return;

        let isFirstClick = true;
        let tempStartPoint: Coordinate | null = null;

        const clickListener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
            if (event.latLng && isFirstClick) {
                tempStartPoint = { lat: event.latLng.lat(), lng: event.latLng.lng() };
                setStartPoint(tempStartPoint);
                isFirstClick = false;
            }
        });

        const mouseMoveListener = map.addListener(
            'mousemove',
            (event: google.maps.MapMouseEvent) => {
                if (event.latLng && tempStartPoint) {
                    const currentPos = { lat: event.latLng.lat(), lng: event.latLng.lng() };
                    setMousePosition(currentPos);

                    const distance = calculateDistanceBetweenPoints(tempStartPoint, currentPos);
                    setCurrentDistance(distance);

                    const pixel = map.getProjection()?.fromLatLngToPoint(event.latLng);
                    if (pixel && indicatorRef.current) {
                        const scale = Math.pow(2, map.getZoom() || 16);
                        const worldCoordinate = new google.maps.Point(
                            pixel.x * scale,
                            pixel.y * scale
                        );

                        const topLeft = new google.maps.Point(0, 0);
                        const topRight = new google.maps.Point(map.getDiv().offsetWidth, 0);
                        const bottomLeft = new google.maps.Point(0, map.getDiv().offsetHeight);

                        indicatorRef.current.style.left = `${worldCoordinate.x - topLeft.x + 10}px`;
                        indicatorRef.current.style.top = `${worldCoordinate.y - topLeft.y - 10}px`;
                        indicatorRef.current.style.display = 'block';
                    }
                }
            }
        );

        const rightClickListener = map.addListener('rightclick', () => {
            setStartPoint(null);
            setMousePosition(null);
            setCurrentDistance(0);
            isFirstClick = true;
            tempStartPoint = null;
            if (indicatorRef.current) {
                indicatorRef.current.style.display = 'none';
            }
        });

        return () => {
            google.maps.event.removeListener(clickListener);
            google.maps.event.removeListener(mouseMoveListener);
            google.maps.event.removeListener(rightClickListener);
        };
    }, [map, isActive, editMode]);

    if (!isActive || editMode !== 'zone' || !startPoint || !mousePosition) {
        return null;
    }

    return (
        <div
            ref={indicatorRef}
            className="absolute z-50 rounded bg-black bg-opacity-75 px-2 py-1 text-xs text-white"
            style={{ display: 'none', pointerEvents: 'none' }}
        >
            📏 {currentDistance.toFixed(2)} {t('ม')}
        </div>
    );
};

export default function EnhancedHorticulturePlannerPage() {
    const { t } = useLanguage();

    const [projectName, setProjectName] = useState<string>('');
    const [customerName, setCustomerName] = useState<string>('');

    const [showCustomPlantModal, setShowCustomPlantModal] = useState(false);
    const [showZonePlantModal, setShowZonePlantModal] = useState(false);
    const [selectedZoneForPlant, setSelectedZoneForPlant] = useState<Zone | null>(null);
    const [editingPlant, setEditingPlant] = useState<PlantData | null>(null);
    const [showPlantEditModal, setShowPlantEditModal] = useState(false);
    const [selectedPlantForEdit, setSelectedPlantForEdit] = useState<PlantLocation | null>(null);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [showRealTimeBranchModal, setShowRealTimeBranchModal] = useState(false);

    const [showPipeSegmentModal, setShowPipeSegmentModal] = useState(false);
    const [selectedBranchForSegment, setSelectedBranchForSegment] = useState<BranchPipe | null>(
        null
    );

    const [activeTab, setActiveTab] = useState('area');
    const [editMode, setEditMode] = useState<string | null>(null);
    const [isCompactMode, setIsCompactMode] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);

    const [mapCenter, setMapCenter] = useState<[number, number]>([12.609731, 102.050412]);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
    const [selectedExclusionType, setSelectedExclusionType] =
        useState<keyof typeof EXCLUSION_COLORS>('building');
    const [drawingMainPipe, setDrawingMainPipe] = useState<{ toZone: string | null }>({
        toZone: null,
    });

    const [isNewPlantMode, setIsNewPlantMode] = useState(false);
    const [isCreatingConnection, setIsCreatingConnection] = useState(false);
    const [connectionStartPlant, setConnectionStartPlant] = useState<PlantLocation | null>(null);
    const [highlightedPipes, setHighlightedPipes] = useState<string[]>([]);
    const [dragMode, setDragMode] = useState<'none' | 'connecting'>('none');
    const [tempConnectionLine, setTempConnectionLine] = useState<Coordinate[] | null>(null);

    const [showQuickActionPanel, setShowQuickActionPanel] = useState(false);

    const [isDragging, setIsDragging] = useState(false);
    const [dragTarget, setDragTarget] = useState<{ id: string; type: 'plant' | 'pipe' } | null>(
        null
    );

    const mapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
    const polygonsRef = useRef<Map<string, google.maps.Polygon>>(new Map());
    const polylinesRef = useRef<Map<string, google.maps.Polyline>>(new Map());
    const featureGroupRef = useRef<any>(null);

    const initialState: ProjectState = {
        mainArea: [],
        zones: [],
        pump: null,
        mainPipes: [],
        subMainPipes: [],
        plants: [],
        exclusionAreas: [],
        useZones: false,
        selectedPlantType: DEFAULT_PLANT_TYPES(t)[0],
        availablePlants: DEFAULT_PLANT_TYPES(t),
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
        selectedItems: {
            plants: [],
            pipes: [],
            zones: [],
        },
        clipboard: {
            plants: [],
            pipes: [],
        },
        editModeSettings: {
            snapToGrid: false,
            gridSize: 1,
            showMeasurements: false,
            autoConnect: true,
            batchMode: false,
            selectionMode: 'single',
            dragMode: 'none',
        },
        layerVisibility: {
            plants: true,
            pipes: true,
            zones: true,
            exclusions: true,
            grid: false,
            measurements: false,
        },
        realTimeEditing: {
            activePipeId: null,
            activeAngle: 90,
            isAdjusting: false,
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

    const selectedItemsCount = useMemo(() => {
        return (
            history.present.selectedItems.plants.length +
            history.present.selectedItems.pipes.length +
            history.present.selectedItems.zones.length
        );
    }, [history.present.selectedItems]);

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

    useEffect(() => {
        const isEditingExisting = localStorage.getItem('isEditingExistingProject');
        const savedData = localStorage.getItem('horticultureIrrigationData');

        if (isEditingExisting === 'true' && savedData) {
            try {
                const projectData = JSON.parse(savedData);

                const loadedState: ProjectState = {
                    ...initialState,
                    mainArea: projectData.mainArea || [],
                    zones: projectData.zones || [],
                    pump: projectData.pump || null,
                    mainPipes: projectData.mainPipes || [],
                    subMainPipes: projectData.subMainPipes || [],
                    plants: projectData.plants || [],
                    exclusionAreas: projectData.exclusionAreas || [],
                    useZones: projectData.useZones || false,
                    selectedPlantType: projectData.selectedPlantType || DEFAULT_PLANT_TYPES(t)[0],
                    availablePlants: DEFAULT_PLANT_TYPES(t),
                    branchPipeSettings: projectData.branchPipeSettings || {
                        defaultAngle: 90,
                        maxAngle: 180,
                        minAngle: 0,
                        angleStep: 1,
                    },
                };

                dispatchHistory({ type: 'PUSH_STATE', state: loadedState });

                if (projectData.mainArea && projectData.mainArea.length > 0) {
                    setTimeout(() => {
                        if (mapRef.current) {
                            try {
                                const bounds = new google.maps.LatLngBounds();

                                projectData.mainArea.forEach((coord: any) => {
                                    bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
                                });

                                mapRef.current.fitBounds(bounds, {
                                    top: 50,
                                    right: 50,
                                    bottom: 50,
                                    left: 50,
                                });
                            } catch (error) {
                                console.warn('⚠️ Could not auto-zoom to area:', error);
                            }
                        }
                    }, 1000);
                }

                localStorage.removeItem('isEditingExistingProject');
            } catch (error) {
                console.error('❌ Error loading project data:', error);
                localStorage.removeItem('isEditingExistingProject');
            }
        }
    }, []);

    const tabs = [
        {
            id: 'area',
            name: t('พื้นที่'),
            icon: '🗺️',
            description: t('จัดการพื้นที่หลักและโซน'),
        },
        {
            id: 'water',
            name: t('ระบบน้ำ'),
            icon: '🚰',
            description: t('ปั๊มและท่อน้ำ'),
        },
        {
            id: 'advanced',
            name: t('แก้ไข'),
            icon: '⚙️',
            description: t('เครื่องมือแก้ไข'),
        },
        {
            id: 'summary',
            name: t('สรุป'),
            icon: '📊',
            description: t('สถิติและบันทึก'),
        },
    ];

    const handleToggleEditMode = useCallback(() => {
        if (!canEnableEditMode) {
            alert(t('กรุณาสร้างพื้นที่หลัก ปั๊ม และสร้างท่อพร้อมต้นไม้ก่อนเข้าสู่โหมดแก้ไข'));
            return;
        }

        const newEditModeEnabled = !history.present.isEditModeEnabled;

        pushToHistory({
            isEditModeEnabled: newEditModeEnabled,
            selectedItems: { plants: [], pipes: [], zones: [] },
        });

        if (!newEditModeEnabled) {
            setEditMode(null);
            setShowQuickActionPanel(false);
        } else {
            setShowQuickActionPanel(true);
        }

        setIsNewPlantMode(false);
        setIsCreatingConnection(false);
        setConnectionStartPlant(null);
        setHighlightedPipes([]);
        setDragMode('none');
        setTempConnectionLine(null);
    }, [canEnableEditMode, history.present.isEditModeEnabled, pushToHistory, t]);

    const handleSelectItem = useCallback(
        (id: string, type: 'plants' | 'pipes' | 'zones') => {
            const currentSelection = history.present.selectedItems[type];
            const isSelected = currentSelection.includes(id);

            let newSelection: string[];

            if (history.present.editModeSettings.selectionMode === 'multi') {
                newSelection = isSelected
                    ? currentSelection.filter((item) => item !== id)
                    : [...currentSelection, id];
            } else {
                newSelection = isSelected ? [] : [id];
            }

            pushToHistory({
                selectedItems: {
                    ...history.present.selectedItems,
                    [type]: newSelection,
                },
            });
        },
        [
            history.present.selectedItems,
            history.present.editModeSettings.selectionMode,
            pushToHistory,
        ]
    );

    const handleSelectAll = useCallback(
        (type: 'plants' | 'pipes' | 'zones') => {
            let allIds: string[] = [];

            switch (type) {
                case 'plants':
                    allIds = history.present.plants.map((plant) => plant.id);
                    break;
                case 'pipes':
                    allIds = [
                        ...history.present.mainPipes.map((pipe) => pipe.id),
                        ...history.present.subMainPipes.map((pipe) => pipe.id),
                        ...history.present.subMainPipes.flatMap((sm) =>
                            sm.branchPipes.map((bp) => bp.id)
                        ),
                    ];
                    break;
                case 'zones':
                    allIds = history.present.zones.map((zone) => zone.id);
                    break;
            }

            pushToHistory({
                selectedItems: {
                    ...history.present.selectedItems,
                    [type]: allIds,
                },
            });
        },
        [history.present, pushToHistory]
    );

    const handleClearSelection = useCallback(() => {
        pushToHistory({
            selectedItems: { plants: [], pipes: [], zones: [] },
        });
    }, [pushToHistory]);

    const handleDeleteSpecificPlants = useCallback(
        (plantIds: string[]) => {
            const remainingPlants = history.present.plants.filter(
                (plant) => !plantIds.includes(plant.id)
            );

            const updatedSubMainPipes = history.present.subMainPipes.map((subMain) => ({
                ...subMain,
                branchPipes: subMain.branchPipes.map((branch) => {
                    const remainingBranchPlants = branch.plants.filter(
                        (plant) => !plantIds.includes(plant.id)
                    );

                    if (remainingBranchPlants.length === 0) {
                        return {
                            ...branch,
                            plants: [],
                        };
                    }

                    const lastPlant = remainingBranchPlants[remainingBranchPlants.length - 1];
                    const newCoordinates = [branch.coordinates[0], lastPlant.position];

                    return {
                        ...branch,
                        plants: remainingBranchPlants,
                        coordinates: newCoordinates,
                        length: calculatePipeLength(newCoordinates),
                    };
                }),
            }));

            pushToHistory({
                plants: remainingPlants,
                subMainPipes: updatedSubMainPipes,
                selectedItems: { plants: [], pipes: [], zones: [] },
            });
        },
        [history.present, pushToHistory]
    );

    const handleDeleteBranchPipe = useCallback(
        (branchPipeIds: string[]) => {
            const updatedSubMainPipes = history.present.subMainPipes.map((subMain) => {
                const remainingBranchPipes = subMain.branchPipes.filter((branch) => {
                    return !branchPipeIds.includes(branch.id);
                });

                return {
                    ...subMain,
                    branchPipes: remainingBranchPipes,
                };
            });

            pushToHistory({
                subMainPipes: updatedSubMainPipes,
                selectedItems: { plants: [], pipes: [], zones: [] },
            });
        },
        [history.present, pushToHistory]
    );

    const handleDeletePipeSegment = useCallback(
        (branchPipeId: string, segmentIndex: number) => {
            const updatedSubMainPipes = history.present.subMainPipes.map((subMain) => ({
                ...subMain,
                branchPipes: subMain.branchPipes
                    .map((branch) => {
                        if (branch.id !== branchPipeId) return branch;

                        if (branch.plants.length <= 2) {
                            return null;
                        }

                        const beforePlants = branch.plants.slice(0, segmentIndex + 1);
                        const afterPlants = branch.plants.slice(segmentIndex + 1);

                        if (beforePlants.length >= 2) {
                            const newCoordinates1 = [
                                branch.coordinates[0],
                                ...beforePlants.map((plant) => plant.position),
                            ];

                            return {
                                ...branch,
                                plants: beforePlants,
                                coordinates: newCoordinates1,
                                length: calculatePipeLength(newCoordinates1),
                                id: generateUniqueId('branch'),
                            };
                        }

                        if (afterPlants.length >= 1) {
                            const newCoordinates = [
                                branch.coordinates[0],
                                ...beforePlants.map((plant) => plant.position),
                            ];

                            return {
                                ...branch,
                                plants: beforePlants,
                                coordinates: newCoordinates,
                                length: calculatePipeLength(newCoordinates),
                            };
                        }

                        return branch;
                    })
                    .filter(Boolean) as BranchPipe[],
            }));

            pushToHistory({
                subMainPipes: updatedSubMainPipes,
                selectedItems: { plants: [], pipes: [], zones: [] },
            });
        },
        [history.present, pushToHistory]
    );

    const handleSegmentedPipeDeletion = useCallback(
        (branchPipeId: string) => {
            let targetBranch: BranchPipe | null = null;
            for (const subMain of history.present.subMainPipes) {
                const branch = subMain.branchPipes.find((bp) => bp.id === branchPipeId);
                if (branch) {
                    targetBranch = branch;
                    break;
                }
            }

            if (targetBranch) {
                setSelectedBranchForSegment(targetBranch);
                setShowPipeSegmentModal(true);
            }
        },
        [history.present.subMainPipes]
    );

    const handleBatchDelete = useCallback(() => {
        const { plants: plantIds, pipes: pipeIds, zones: zoneIds } = history.present.selectedItems;
        const remainingPlants = history.present.plants.filter(
            (plant) => !plantIds.includes(plant.id)
        );

        const remainingMainPipes = history.present.mainPipes.filter(
            (pipe) => !pipeIds.includes(pipe.id)
        );
        const remainingSubMainPipes = history.present.subMainPipes
            .filter((pipe) => !pipeIds.includes(pipe.id))
            .map((subMain) => ({
                ...subMain,
                branchPipes: subMain.branchPipes.filter((branch) => !pipeIds.includes(branch.id)),
            }));

        const remainingZones = history.present.zones.filter((zone) => !zoneIds.includes(zone.id));

        pushToHistory({
            plants: remainingPlants,
            mainPipes: remainingMainPipes,
            subMainPipes: remainingSubMainPipes,
            zones: remainingZones,
            selectedItems: { plants: [], pipes: [], zones: [] },
        });
    }, [history.present, pushToHistory]);

    const handleBatchMove = useCallback(
        (offset: Coordinate) => {
            const { plants: plantIds } = history.present.selectedItems;

            const updatedPlants = history.present.plants.map((plant) => {
                if (plantIds.includes(plant.id)) {
                    return {
                        ...plant,
                        position: {
                            lat: plant.position.lat + offset.lat,
                            lng: plant.position.lng + offset.lng,
                        },
                    };
                }
                return plant;
            });

            pushToHistory({ plants: updatedPlants });
        },
        [history.present, pushToHistory]
    );

    const handleBatchCopy = useCallback(() => {
        const { plants: plantIds } = history.present.selectedItems;

        const selectedPlants = history.present.plants.filter((plant) =>
            plantIds.includes(plant.id)
        );

        pushToHistory({
            clipboard: {
                ...history.present.clipboard,
                plants: selectedPlants,
            },
        });
    }, [history.present, pushToHistory]);

    const handleBatchPaste = useCallback(() => {
        const { plants: clipboardPlants } = history.present.clipboard;

        if (clipboardPlants.length === 0) return;

        const offset = { lat: 0.001, lng: 0.001 };

        const pastedPlants = clipboardPlants.map((plant) => ({
            ...plant,
            id: generateUniqueId('plant'),
            position: {
                lat: plant.position.lat + offset.lat,
                lng: plant.position.lng + offset.lng,
            },
        }));

        pushToHistory({
            plants: [...history.present.plants, ...pastedPlants],
        });
    }, [history.present, pushToHistory]);

    const handleCreateTemplate = useCallback(
        (name: string) => {
            const { plants: plantIds, pipes: pipeIds } = history.present.selectedItems;

            const selectedPlants = history.present.plants.filter((plant) =>
                plantIds.includes(plant.id)
            );

            const template = {
                name,
                plants: selectedPlants,
                createdAt: new Date().toISOString(),
            };
        },
        [history.present]
    );

    const handleToggleLayer = useCallback(
        (layer: keyof ProjectState['layerVisibility']) => {
            pushToHistory({
                layerVisibility: {
                    ...history.present.layerVisibility,
                    [layer]: !history.present.layerVisibility[layer],
                },
            });
        },
        [history.present.layerVisibility, pushToHistory]
    );

    const handleUpdateEditSettings = useCallback(
        (settings: Partial<ProjectState['editModeSettings']>) => {
            pushToHistory({
                editModeSettings: {
                    ...history.present.editModeSettings,
                    ...settings,
                },
            });
        },
        [history.present.editModeSettings, pushToHistory]
    );

    const handleStartRealTimeBranchEdit = useCallback(
        (subMainPipe: SubMainPipe) => {
            pushToHistory({
                realTimeEditing: {
                    activePipeId: subMainPipe.id,
                    activeAngle:
                        subMainPipe.currentAngle || history.present.branchPipeSettings.defaultAngle,
                    isAdjusting: true,
                },
            });
            setShowRealTimeBranchModal(true);
        },
        [history.present.branchPipeSettings.defaultAngle, pushToHistory]
    );

    const handleRealTimeBranchAngleChange = useCallback(
        (newAngle: number) => {
            const { activePipeId } = history.present.realTimeEditing;
            if (!activePipeId) return;

            const subMainPipe = history.present.subMainPipes.find((sm) => sm.id === activePipeId);
            if (!subMainPipe) return;

            const targetZone = history.present.useZones
                ? history.present.zones.find((z) => z.id === subMainPipe.zoneId)
                : {
                      id: 'main-area',
                      coordinates: history.present.mainArea,
                      plantData: history.present.selectedPlantType,
                  };

            if (!targetZone) return;

            const newBranchPipes = regenerateBranchPipesWithAngle(
                subMainPipe,
                newAngle,
                targetZone,
                history.present.exclusionAreas,
                history.present.useZones,
                history.present.mainArea
            );

            const updatedSubMainPipes = history.present.subMainPipes.map((sm) =>
                sm.id === activePipeId
                    ? { ...sm, branchPipes: newBranchPipes, currentAngle: newAngle }
                    : sm
            );

            const newPlants = [
                ...history.present.plants.filter((plant) => {
                    return !subMainPipe.branchPipes.some((bp) =>
                        bp.plants.some((p) => p.id === plant.id)
                    );
                }),
                ...newBranchPipes.flatMap((bp) => bp.plants),
            ];

            pushToHistory({
                subMainPipes: updatedSubMainPipes,
                plants: newPlants,
                realTimeEditing: {
                    ...history.present.realTimeEditing,
                    activeAngle: newAngle,
                },
            });
        },
        [history.present, pushToHistory]
    );

    const handleApplyRealTimeBranchEdit = useCallback(() => {
        pushToHistory({
            realTimeEditing: {
                activePipeId: null,
                activeAngle: 90,
                isAdjusting: false,
            },
        });
        setShowRealTimeBranchModal(false);
    }, [pushToHistory]);

    const handlePlantDragStart = useCallback(
        (plantId: string) => {
            if (!history.present.isEditModeEnabled) {
                return;
            }

            setIsDragging(true);
            setDragTarget({ id: plantId, type: 'plant' });

            pushToHistory({
                editModeSettings: {
                    ...history.present.editModeSettings,
                    dragMode: 'plant',
                },
            });
        },
        [history.present.isEditModeEnabled, history.present.editModeSettings, pushToHistory]
    );

    const handlePlantDragEnd = useCallback(
        (plantId: string, newPosition: Coordinate) => {
            if (
                !isDragging ||
                !dragTarget ||
                dragTarget.id !== plantId ||
                !history.present.isEditModeEnabled
            ) {
                return;
            }

            let canPlace = true;
            let targetZoneId = 'main-area';

            if (history.present.useZones && history.present.zones.length > 0) {
                const containingZone = findZoneContainingPoint(newPosition, history.present.zones);
                if (containingZone) {
                    targetZoneId = containingZone.id;
                } else {
                    const isInMainArea =
                        history.present.mainArea.length > 0 &&
                        isPointInPolygon(newPosition, history.present.mainArea);
                    if (!isInMainArea) {
                        canPlace = false;
                    }
                }
            } else if (history.present.mainArea.length > 0) {
                const isInMainArea = isPointInPolygon(newPosition, history.present.mainArea);
                if (!isInMainArea) {
                    canPlace = false;
                }
            }

            if (!canPlace) {
                alert('❌ ' + t('ไม่สามารถวางต้นไม้นอกพื้นที่หลักหรือโซนได้'));
                setIsDragging(false);
                setDragTarget(null);
                return;
            }

            let finalPosition = newPosition;
            if (history.present.editModeSettings.snapToGrid) {
                const gridSize = history.present.editModeSettings.gridSize;
                const latGrid =
                    Math.round(newPosition.lat * (111000 / gridSize)) / (111000 / gridSize);
                const lngGrid =
                    Math.round(newPosition.lng * (111000 / gridSize)) / (111000 / gridSize);
                finalPosition = { lat: latGrid, lng: lngGrid };
            }

            const updatedPlants = history.present.plants.map((plant) =>
                plant.id === plantId
                    ? { ...plant, position: finalPosition, isDragging: false, zoneId: targetZoneId }
                    : plant
            );

            const updatedSubMainPipes = history.present.subMainPipes.map((subMain) => ({
                ...subMain,
                branchPipes: subMain.branchPipes.map((branch) => {
                    const plantIndex = branch.plants.findIndex((p) => p.id === plantId);
                    if (plantIndex === -1) return branch;

                    const updatedPlants = branch.plants.map((p) =>
                        p.id === plantId
                            ? { ...p, position: finalPosition, zoneId: targetZoneId }
                            : p
                    );

                    if (plantIndex === branch.plants.length - 1) {
                        const newCoordinates = [branch.coordinates[0], finalPosition];
                        return {
                            ...branch,
                            plants: updatedPlants,
                            coordinates: newCoordinates,
                            length: calculatePipeLength(newCoordinates),
                        };
                    }

                    return { ...branch, plants: updatedPlants };
                }),
            }));

            pushToHistory({
                plants: updatedPlants,
                subMainPipes: updatedSubMainPipes,
                editModeSettings: {
                    ...history.present.editModeSettings,
                    dragMode: 'none',
                },
            });

            setIsDragging(false);
            setDragTarget(null);
        },
        [isDragging, dragTarget, history.present, pushToHistory]
    );

    useEffect(() => {
        if (!history.present.useZones && editMode === 'mainPipe') {
            setDrawingMainPipe({ toZone: 'main-area' });
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
        },
        [history.present.zones, pushToHistory]
    );

    const handlePlantEdit = useCallback((plant: PlantLocation) => {
        setSelectedPlantForEdit(plant);
        setIsNewPlantMode(false);
        setShowPlantEditModal(true);
    }, []);

    const handlePlantSave = useCallback(
        (plantId: string, newPlantData: PlantData) => {
            const updatedPlants = history.present.plants.map((plant) =>
                plant.id === plantId ? { ...plant, plantData: newPlantData } : plant
            );

            const updatedSubMainPipes = history.present.subMainPipes.map((subMain) => ({
                ...subMain,
                branchPipes: subMain.branchPipes.map((branch) => ({
                    ...branch,
                    plants: branch.plants.map((plant) =>
                        plant.id === plantId ? { ...plant, plantData: newPlantData } : plant
                    ),
                })),
            }));

            pushToHistory({
                plants: updatedPlants,
                subMainPipes: updatedSubMainPipes,
            });
        },
        [history.present.plants, history.present.subMainPipes, pushToHistory]
    );

    const handlePlantDelete = useCallback(
        (plantId: string) => {
            handleDeleteSpecificPlants([plantId]);
        },
        [handleDeleteSpecificPlants]
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

            const availablePlantIds = history.present.plants
                .filter((p) => p.id !== plantId)
                .map((p) => p.id);

            setHighlightedPipes([...availablePipeIds, ...availablePlantIds]);
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
        },
        [connectionStartPlant, isCreatingConnection, history.present.subMainPipes, pushToHistory]
    );

    const handleConnectToPlant = useCallback(
        (targetPlantId: string) => {
            if (!connectionStartPlant || !isCreatingConnection) return;

            const targetPlant = history.present.plants.find((p) => p.id === targetPlantId);
            if (!targetPlant) return;

            const newBranchPipe: BranchPipe = {
                id: generateUniqueId('branch'),
                subMainPipeId: 'standalone',
                coordinates: [connectionStartPlant.position, targetPlant.position],
                length: calculateDistanceBetweenPoints(
                    connectionStartPlant.position,
                    targetPlant.position
                ),
                diameter: 20,
                plants: [connectionStartPlant, targetPlant],
                isEditable: true,
                sprinklerType: 'standard',
                angle: 90,
                connectionPoint: 0.5,
            };

            const hasExistingSubMain = history.present.subMainPipes.length > 0;

            if (hasExistingSubMain) {
                const targetSubMain = history.present.subMainPipes[0];
                const updatedSubMainPipes = history.present.subMainPipes.map((subMain) => {
                    if (subMain.id === targetSubMain.id) {
                        return {
                            ...subMain,
                            branchPipes: [
                                ...subMain.branchPipes,
                                { ...newBranchPipe, subMainPipeId: subMain.id },
                            ],
                        };
                    }
                    return subMain;
                });
                pushToHistory({ subMainPipes: updatedSubMainPipes });
            } else {
                const newSubMainPipe: SubMainPipe = {
                    id: generateUniqueId('submain'),
                    zoneId: 'main-area',
                    coordinates: [connectionStartPlant.position, targetPlant.position],
                    length: calculateDistanceBetweenPoints(
                        connectionStartPlant.position,
                        targetPlant.position
                    ),
                    diameter: 32,
                    branchPipes: [{ ...newBranchPipe, subMainPipeId: generateUniqueId('submain') }],
                    material: 'pvc',
                    currentAngle: history.present.branchPipeSettings.defaultAngle,
                };

                pushToHistory({
                    subMainPipes: [...history.present.subMainPipes, newSubMainPipe],
                });
            }

            setIsCreatingConnection(false);
            setConnectionStartPlant(null);
            setHighlightedPipes([]);
            setDragMode('none');
            setTempConnectionLine(null);
        },
        [
            connectionStartPlant,
            isCreatingConnection,
            history.present.plants,
            history.present.subMainPipes,
            history.present.branchPipeSettings.defaultAngle,
            pushToHistory,
        ]
    );

    const handleSearch = useCallback((lat: number, lng: number, placeDetails?: any) => {
        setMapCenter([lat, lng]);
        if (mapRef.current) {
            mapRef.current.setCenter({ lat, lng });

            let zoomLevel = 18;

            if (placeDetails?.types) {
                const types = placeDetails.types;

                if (types.includes('country')) {
                    zoomLevel = 6;
                } else if (
                    types.includes('administrative_area_level_1') ||
                    types.includes('state')
                ) {
                    zoomLevel = 8;
                } else if (
                    types.includes('administrative_area_level_2') ||
                    types.includes('city')
                ) {
                    zoomLevel = 12;
                } else if (types.includes('locality') || types.includes('sublocality')) {
                    zoomLevel = 15;
                } else if (types.includes('route') || types.includes('street_address')) {
                    zoomLevel = 18;
                } else if (types.includes('premise') || types.includes('building')) {
                    zoomLevel = 20;
                } else if (types.includes('park') || types.includes('airport')) {
                    zoomLevel = 16;
                } else if (types.includes('restaurant') || types.includes('store')) {
                    zoomLevel = 19;
                }
            }

            mapRef.current.setZoom(zoomLevel);
        }
    }, []);

    const handleMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        setMap(map);

        map.addListener('zoom_changed', () => {
            if (mapRef.current) {
                const currentZoom = mapRef.current.getZoom();
            }
        });
    }, []);

    const zoomToMainArea = useCallback(() => {
        if (!mapRef.current || history.present.mainArea.length === 0) {
            console.warn('❌ No map or main area to zoom to');
            return;
        }

        try {
            const bounds = new google.maps.LatLngBounds();

            history.present.mainArea.forEach((coord) => {
                bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
            });

            mapRef.current.fitBounds(bounds, {
                top: 50,
                right: 50,
                bottom: 50,
                left: 50,
            });
        } catch (error) {
            console.error('❌ Error zooming to main area:', error);
        }
    }, [history.present.mainArea]);

    const handleDrawingComplete = useCallback(
        (coordinates: Coordinate[], shapeType: string) => {
            if (!coordinates || coordinates.length === 0) {
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
                    name: `${t('โซน')} ${history.present.zones.length + 1}`,
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
            } else if (editMode === 'exclusion') {
                const newExclusion: ExclusionArea = {
                    id: generateUniqueId('exclusion'),
                    type: selectedExclusionType,
                    coordinates,
                    name: `${selectedExclusionType} ${
                        history.present.exclusionAreas.filter(
                            (e) => e.type === selectedExclusionType
                        ).length + 1
                    }`,
                    color: EXCLUSION_COLORS[selectedExclusionType],
                };

                pushToHistory({
                    exclusionAreas: [...history.present.exclusionAreas, newExclusion],
                });
                setEditMode(null);
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
            } else if (editMode === 'subMainPipe') {
                const pipeLength = calculatePipeLength(coordinates);

                let targetZone: Zone;
                if (history.present.useZones) {
                    if (selectedZone) {
                        targetZone = selectedZone;
                    } else {
                        const detectedZone = findZoneForPipe(coordinates, history.present.zones);
                        if (!detectedZone) {
                            alert('กรุณาเลือกโซนก่อนวางปั๊ม');
                            return;
                        }
                        targetZone = detectedZone;
                    }
                } else {
                    targetZone = {
                        id: 'main-area',
                        name: t('พื้นที่หลัก'),
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
                    history.present.mainArea,
                    history.present.useZones,
                    history.present.branchPipeSettings
                );

                const newPlants = branchPipes.flatMap((branch) => branch.plants || []);

                const newSubMainPipe: SubMainPipe = {
                    id: generateUniqueId('submain'),
                    zoneId: targetZone.id,
                    coordinates,
                    length: pipeLength,
                    diameter: 32,
                    branchPipes,
                    material: 'pvc',
                    currentAngle: history.present.branchPipeSettings.defaultAngle,
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

                setEditMode(null);
            }
        },
        [
            editMode,
            history.present.mainArea,
            history.present.selectedPlantType,
            history.present.zones,
            selectedExclusionType,
            history.present.exclusionAreas,
            history.present.pump,
            selectedZone,
            history.present.useZones,
            history.present.subMainPipes,
            history.present.plants,
            history.present.branchPipeSettings,
            pushToHistory,
        ]
    );

    const handleMapClick = useCallback(
        (event: google.maps.MapMouseEvent) => {
            if (!event.latLng) return;

            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            const clickPoint = { lat, lng };

            if (editMode === 'pump') {
                if (history.present.mainArea.length > 0) {
                    const isInMainArea = isPointInPolygon(clickPoint, history.present.mainArea);
                    if (!isInMainArea) {
                        console.warn('⚠️ Pump placement outside main area');
                        alert(t('กรุณาวางปั๊มภายในพื้นที่หลัก'));
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
                return;
            }

            const isPlantMode = editMode === 'plant';

            if (isPlantMode) {
                if (!history.present.selectedPlantType) {
                    console.error('❌ No plant type selected');
                    alert('❌ ' + t('กรุณาเลือกชนิดพืชก่อนวางต้นไม้'));
                    return;
                }

                if (history.present.mainArea.length === 0 && history.present.zones.length === 0) {
                    console.error('❌ No main area or zones defined');
                    alert('❌ ' + t('กรุณากำหนดพื้นที่หลักหรือโซนก่อนวางต้นไม้'));
                    return;
                }

                let canPlacePlant = false;
                let targetZoneId = 'main-area';

                if (history.present.useZones && history.present.zones.length > 0) {
                    const containingZone = findZoneContainingPoint(
                        clickPoint,
                        history.present.zones
                    );

                    if (containingZone) {
                        targetZoneId = containingZone.id;
                        canPlacePlant = true;
                    } else if (history.present.mainArea.length > 0) {
                        const inMainArea = isPointInPolygon(clickPoint, history.present.mainArea);
                        canPlacePlant = inMainArea;
                    }
                } else if (history.present.mainArea.length > 0) {
                    const inMainArea = isPointInPolygon(clickPoint, history.present.mainArea);
                    canPlacePlant = inMainArea;
                }

                if (!canPlacePlant) {
                    console.error('❌ Cannot place plant - outside valid area');
                    alert('❌ ' + t('กรุณาวางต้นไม้ภายในพื้นที่หลักหรือโซนที่กำหนด'));
                    return;
                }

                const newPlant: PlantLocation = {
                    id: generateUniqueId('plant'),
                    position: clickPoint,
                    plantData: history.present.selectedPlantType,
                    isSelected: false,
                    isEditable: true,
                    health: 'good',
                    zoneId: targetZoneId,
                };

                pushToHistory({ plants: [...history.present.plants, newPlant] });

                return;
            }

            if (history.present.isEditModeEnabled && !editMode) {
                 alert('กรุณาเลือกโหมดแก้ไข');
                 return;
            }
        },
        [
            editMode,
            history.present.isEditModeEnabled,
            history.present.mainArea,
            history.present.selectedPlantType,
            history.present.plants,
            history.present.useZones,
            history.present.zones,
            pushToHistory,
            t,
        ]
    );

    const handleSaveProject = useCallback(() => {
        if (!history.present.pump || history.present.mainArea.length === 0) {
            alert(t('กรุณาวางปั๊มและสร้างพื้นที่หลักก่อนบันทึก'));
            return;
        }

        const projectData = {
            projectName,
            customerName,
            version: '4.0.0',
            totalArea,
            mainArea: history.present.mainArea,
            pump: history.present.pump,
            zones: history.present.zones,
            mainPipes: history.present.mainPipes,
            subMainPipes: history.present.subMainPipes,
            exclusionAreas: history.present.exclusionAreas,
            plants: history.present.plants,
            useZones: history.present.useZones,
            selectedPlantType: history.present.selectedPlantType,
            branchPipeSettings: history.present.branchPipeSettings,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        localStorage.setItem('horticultureIrrigationData', JSON.stringify(projectData));

        const params = new URLSearchParams({
            projectName,
            customerName,
            totalArea: totalArea.toString(),
        });

        router.visit(`/horticulture/results?${params.toString()}`);
    }, [history.present.pump, history.present.mainArea, history.present.zones, history.present.mainPipes, history.present.subMainPipes, history.present.exclusionAreas, history.present.plants, history.present.useZones, history.present.selectedPlantType, history.present.branchPipeSettings, projectName, customerName, totalArea, t]);

    const canSaveProject = history.present.pump && history.present.mainArea.length > 0;

    const handleRetry = () => {
        setIsRetrying(true);
        setError(null);
        window.location.reload();
    };

    useEffect(() => {
        polygonsRef.current.forEach((polygon) => polygon.setMap(null));
        polygonsRef.current.clear();
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current.clear();
        polylinesRef.current.forEach((polyline) => polyline.setMap(null));
        polylinesRef.current.clear();
    }, [
        history.present.mainArea,
        history.present.zones,
        history.present.exclusionAreas,
        history.present.pump,
        history.present.mainPipes,
        history.present.subMainPipes,
        history.present.plants,
    ]);

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 text-white">
                <Navbar />
                <div className="flex h-screen items-center justify-center">
                    <div className="mx-auto max-w-md rounded-lg bg-gray-800 p-8 text-center">
                        <div className="mb-4 text-6xl">⚠️</div>
                        <h2 className="mb-4 text-xl font-semibold text-red-400">
                            {t('เกิดข้อผิดพลาด')}
                        </h2>
                        <p className="mb-6 text-gray-300">{error}</p>
                        <div className="space-y-3">
                            <button
                                onClick={handleRetry}
                                disabled={isRetrying}
                                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isRetrying ? (
                                    <div className="flex items-center justify-center">
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                        {t('กำลังลองใหม่...')}
                                    </div>
                                ) : (
                                    t('ลองใหม่')
                                )}
                            </button>
                            <button
                                onClick={() => (window.location.href = '/')}
                                className="w-full rounded-lg bg-gray-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-gray-700"
                            >
                                {t('กลับไปหน้าหลัก')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const handleToggleAddPlantMode = () => {
        const newMode = editMode === 'plant' ? null : 'plant';
        setEditMode(newMode);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <header className="sticky top-0 z-50 border-b border-gray-200 bg-gray-800 shadow-sm">
                <Navbar />
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                                <FaTree className="text-xl text-green-600" />
                                <h1 className="text-xl font-bold text-white">
                                    {t('ระบบออกแบบระบบน้ำพืชสวน')}
                                </h1>
                            </div>

                            {!isCompactMode && (
                                <div className="hidden items-center space-x-4 rounded-lg bg-gray-900 px-3 py-1 text-sm text-white md:flex">
                                    <div className="flex items-center space-x-1">
                                        <span>🗺️</span>
                                        <span>{formatArea(totalArea, t)}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <span>🌱</span>
                                        <span>
                                            {actualTotalPlants} {t('ต้น')}
                                        </span>
                                    </div>
                                    {history.present.pump && (
                                        <div className="flex items-center space-x-1 text-green-600">
                                            <span>🚰</span>
                                            <span>{t('ปั๊มพร้อม')}</span>
                                        </div>
                                    )}
                                    {history.present.isEditModeEnabled && (
                                        <div className="flex items-center space-x-1 text-yellow-400">
                                            <span>⚙️</span>
                                            <span>{t('โหมดแก้ไข')}</span>
                                        </div>
                                    )}
                                    {isDragging && (
                                        <div className="flex items-center space-x-1 text-blue-400">
                                            <span>🖱️</span>
                                            <span>{t('กำลังลาก')}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={zoomToMainArea}
                                disabled={history.present.mainArea.length === 0}
                                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                    history.present.mainArea.length === 0
                                        ? 'bg-gray-600 text-white opacity-50 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                                title={t('ซูมไปยังพื้นที่หลัก')}
                                type="button"
                            >
                               🎯 {t('ซูม')}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    if (history.present.subMainPipes.length === 0 && editMode !== 'plant') {
                                        alert(t('กรุณาวางท่อเมนรองก่อนเพิ่มต้นไม้'));
                                        return;
                                    }

                                    handleToggleAddPlantMode();
                                }}
                                disabled={history.present.subMainPipes.length === 0 && editMode !== 'plant'}
                                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                    editMode === 'plant'
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : history.present.subMainPipes.length === 0
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                                title={
                                    editMode === 'plant' 
                                        ? t('หยุดเพิ่มต้นไม้') 
                                        : history.present.subMainPipes.length === 0
                                        ? t('กรุณาวางท่อเมนรองก่อนเพิ่มต้นไม้')
                                        : t('เพิ่มต้นไม้')
                                }
                                type="button"
                            >
                                {editMode === 'plant' ? (
                                    <>
                                        <FaTimes className="mr-1 inline" />
                                        {t('หยุดเพิ่ม')}
                                    </>
                                ) : (
                                    <>
                                        <FaPlus className="mr-1 inline" />
                                        {t('เพิ่มต้นไม้')}
                                    </>
                                )}
                            </button>

                            {history.present.isEditModeEnabled && (
                                <div className="flex items-center rounded-lg border border-yellow-300 bg-yellow-50 px-2 py-1">
                                    <button
                                        onClick={() =>
                                            setShowQuickActionPanel(!showQuickActionPanel)
                                        }
                                        className="rounded p-1 text-yellow-700 hover:bg-yellow-100"
                                        title={t('แผงเครื่องมือด่วน')}
                                    >
                                        <FaBars />
                                    </button>

                                    {selectedItemsCount > 0 && (
                                        <>
                                            <div className="mx-2 h-4 w-px bg-yellow-300"></div>
                                            <span className="text-xs text-yellow-700">
                                                {t('เลือก')}: {selectedItemsCount}
                                            </span>
                                            <button
                                                onClick={() => setShowBatchModal(true)}
                                                className="ml-1 rounded bg-yellow-200 px-2 py-1 text-xs text-yellow-800 hover:bg-yellow-300"
                                            >
                                                <FaCog className="mr-1 inline" />
                                                {t('จัดการ')}
                                            </button>
                                            <button
                                                onClick={handleClearSelection}
                                                className="ml-1 rounded bg-red-200 px-2 py-1 text-xs text-red-800 hover:bg-red-300"
                                            >
                                                <FaTimes />
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center rounded-lg border border-gray-200">
                                <button
                                    onClick={handleUndo}
                                    disabled={history.past.length === 0}
                                    className={`rounded-l-lg p-2 transition-colors ${
                                        history.past.length === 0
                                            ? 'cursor-not-allowed text-gray-400 bg-gray-600'
                                            : 'text-gray-100 bg-blue-600 hover:bg-blue-500'
                                    }`}
                                    title={t('ย้อนกลับ')}
                                >
                                    <FaUndo />
                                </button>

                                <button
                                    onClick={handleRedo}
                                    disabled={history.future.length === 0}
                                    className={`rounded-r-lg border-l border-gray-200 p-2 transition-colors ${
                                        history.future.length === 0
                                            ? 'cursor-not-allowed text-gray-400 bg-gray-600'
                                            : 'text-gray-100 bg-blue-600 hover:bg-blue-500'
                                    }`}
                                    title={t('ไปข้างหน้า')}
                                >
                                    <FaRedo />
                                </button>
                            </div>

                            <button
                                onClick={() => setIsCompactMode(!isCompactMode)}
                                className="rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-100"
                                title={isCompactMode ? 'ขยายแผง' : 'ย่อแผง'}
                            >
                                {isCompactMode ? <FaExpand /> : <FaCompress />}
                            </button>

                            <button
                                onClick={handleSaveProject}
                                disabled={!canSaveProject}
                                className={`flex items-center space-x-2 rounded-lg px-4 py-2 font-medium transition-colors ${
                                    canSaveProject
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'cursor-not-allowed bg-gray-300 text-gray-500'
                                }`}
                            >
                                <FaSave />
                                <span>{t('บันทึก')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>


            <div className="flex h-[calc(91vh-64px)]">
                <div
                    className={`flex flex-col border-r border-gray-200 bg-gray-800 transition-all duration-300 ${
                        isCompactMode ? 'w-16' : 'w-80'
                    }`}
                >
                    <div className="border-b border-gray-200 bg-red-500">
                        <nav className={`${isCompactMode ? 'px-2' : 'px-4'} py-2`}>
                            <div
                                className={`grid gap-1 ${isCompactMode ? 'grid-cols-1' : 'grid-cols-4'}`}
                            >
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`rounded-lg p-1 text-sm font-medium transition-colors ${
                                            activeTab === tab.id
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'text-white hover:bg-gray-200'
                                        }`}
                                        title={isCompactMode ? tab.name : undefined}
                                    >
                                        <div className="flex flex-col items-center">
                                            <span className="text-lg">{tab.icon}</span>
                                            {!isCompactMode && (
                                                <span className="mt-1 text-xs">{tab.name}</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </nav>
                    </div>

                    {!isCompactMode && (
                        <div className="flex-1 overflow-y-auto">
                            {activeTab === 'area' && (
                                <div className="p-4">
                                    <h3 className="mb-4 flex items-center font-semibold text-white">
                                        <span className="mr-2">🗺️</span>
                                        {t('จัดการพื้นที่')}
                                    </h3>

                                    <div className="space-y-4">
                                        <div className="rounded-lg border border-gray-200 bg-gray-900 p-4">
                                            <h4 className="mb-3 font-medium text-white">
                                                {t('พื้นที่หลัก')}
                                            </h4>

                                            <button
                                                onClick={() =>
                                                    setEditMode(
                                                        editMode === 'mainArea' ? null : 'mainArea'
                                                    )
                                                }
                                                className={`w-full rounded-lg border px-4 py-3 font-medium transition-colors ${
                                                    editMode === 'mainArea'
                                                        ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                                                        : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                                                }`}
                                            >
                                                {editMode === 'mainArea' ? (
                                                    <>{t('❌ หยุดวาดพื้นที่')}</>
                                                ) : (
                                                    <>✏️ {t('วาดพื้นที่หลัก')}</>
                                                )}
                                            </button>

                                            {history.present.mainArea.length > 0 && (
                                                <div className="mt-3 rounded-lg border border-green-200 bg-gray-900 p-3">
                                                    <div className="flex items-center text-sm text-green-700">
                                                        <span className="mr-1">✅</span>
                                                        <span className="font-medium">
                                                            {t('สร้างพื้นที่หลักแล้ว')} : {formatArea(totalArea, t)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="rounded-lg border border-gray-200 bg-gray-900 p-4">
                                            <h4 className="mb-3 font-medium text-white">
                                                {t('พื้นที่หลีกเลี่ยง')}
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
                                                    className="w-full rounded-lg border border-gray-300 bg-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                >
                                                    <option value="building">
                                                        {t('สิ่งก่อสร้าง')}
                                                    </option>
                                                    <option value="powerplant">
                                                        {t('โรงไฟฟ้า')}
                                                    </option>
                                                    <option value="river">{t('แหล่งน้ำ')}</option>
                                                    <option value="road">{t('ถนน')}</option>
                                                    <option value="other">{t('อื่นๆ')}</option>
                                                </select>

                                                <button
                                                    onClick={() =>
                                                        setEditMode(
                                                            editMode === 'exclusion'
                                                                ? null
                                                                : 'exclusion'
                                                        )
                                                    }
                                                    className={`w-full rounded-lg border px-4 py-2 font-medium transition-colors ${
                                                        editMode === 'exclusion'
                                                            ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                                                            : 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'
                                                    }`}
                                                >
                                                    {editMode === 'exclusion' ? (
                                                        <>{t('❌ หยุดวาด')}</>
                                                    ) : (
                                                        <>✏️ {t('วาดพื้นที่หลีกเลี่ยง')}</>
                                                    )}
                                                </button>
                                            </div>

                                            {history.present.exclusionAreas.length > 0 && (
                                                <div className="mt-3 max-h-32 space-y-2 overflow-y-auto">
                                                    {history.present.exclusionAreas.map((area) => (
                                                        <div
                                                            key={area.id}
                                                            className="rounded border bg-gray-900 p-2 text-xs"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-medium">
                                                                    {area.name}
                                                                </span>
                                                                <div
                                                                    className="h-3 w-3 rounded"
                                                                    style={{
                                                                        backgroundColor: area.color,
                                                                    }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="rounded-lg border border-gray-200 bg-gray-900 p-4">
                                            <div className="mb-3">
                                                <label className="flex items-center justify-between space-x-3 cursor-pointer select-none">
                                                    <span className="text-lg text-white">
                                                        {t('แบ่งเป็นหลายโซน')}
                                                    </span>
                                                    <span className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in">
                                                        <input
                                                            type="checkbox"
                                                            checked={history.present.useZones}
                                                            onChange={(e) =>
                                                                pushToHistory({
                                                                    useZones: e.target.checked,
                                                                })
                                                            }
                                                            className="peer absolute left-0 top-0 h-0 w-0 opacity-0"
                                                        />
                                                        <span
                                                            className={`
                                                                block h-6 w-12 rounded-full border border-gray-400 bg-gray-300 transition-colors duration-200
                                                                peer-checked:bg-green-500
                                                            `}
                                                        ></span>
                                                        <span
                                                            className={`
                                                                absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200
                                                                peer-checked:translate-x-6
                                                            `}
                                                        ></span>
                                                    </span>
                                                </label>
                                            </div>

                                            {history.present.useZones ? (
                                                <div className="space-y-3">
                                                    <button
                                                        onClick={() =>
                                                            setEditMode(
                                                                editMode === 'zone' ? null : 'zone'
                                                            )
                                                        }
                                                        disabled={
                                                            history.present.mainArea.length === 0
                                                        }
                                                        className={`w-full rounded-lg border px-4 py-3 font-medium transition-colors ${
                                                            history.present.mainArea.length === 0
                                                                ? 'cursor-not-allowed border-gray-300 bg-gray-200 text-gray-500'
                                                                : editMode === 'zone'
                                                                  ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                                                                  : 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'
                                                        }`}
                                                    >
                                                        {editMode === 'zone' ? (
                                                            <>{t('❌ หยุดวาดโซน')}</>
                                                        ) : (
                                                            <>✏️ {t('วาดโซน')}</>
                                                        )}
                                                    </button>

                                                    {history.present.zones.length > 0 && (
                                                        <div className="max-h-40 space-y-2 overflow-y-auto">
                                                            {history.present.zones.map(
                                                                (zone, index) => (
                                                                    <div
                                                                        key={zone.id}
                                                                        className="rounded-lg border bg-gray-900 p-3"
                                                                    >
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center space-x-2">
                                                                                <div
                                                                                    className="h-4 w-4 rounded"
                                                                                    style={{
                                                                                        backgroundColor:
                                                                                            zone.color,
                                                                                    }}
                                                                                ></div>
                                                                                <span className="text-sm font-medium">
                                                                                    {t(zone.name)}
                                                                                </span>
                                                                            </div>
                                                                            <button
                                                                                onClick={() =>
                                                                                    handleZonePlantSelection(
                                                                                        zone
                                                                                    )
                                                                                }
                                                                                className="text-gray-400 hover:text-gray-600"
                                                                            >
                                                                                <FaEdit />
                                                                            </button>
                                                                        </div>
                                                                        <div className="mt-1 text-xs text-white">
                                                                            {formatArea(
                                                                                zone.area,
                                                                                t
                                                                            )}{' '}
                                                                            |{' '}
                                                                            {t(zone.plantData.name)}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="rounded-lg border border-blue-200 bg-gray-900 p-3 text-sm text-white">
                                                    ℹ️ {t('จะใช้พื้นที่ทั้งหมดเป็นโซนเดียว')}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            {history.present.zones.length < 1 ? (
                                                <div className="rounded-lg border border-gray-200 bg-gray-900 p-4">
                                                    <h4 className="mb-3 font-medium text-white">
                                                        {t('เลือกชนิดพืช')}
                                                    </h4>

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
                                                        className="mb-3 w-full rounded-lg border border-gray-300 bg-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        {history.present.availablePlants.map(
                                                            (plant) => (
                                                                <option
                                                                    key={plant.id}
                                                                    value={plant.id}
                                                                >
                                                                    {t(plant.name)}
                                                                </option>
                                                            )
                                                        )}
                                                    </select>

                                                    <div className="rounded-lg border bg-gray-900 p-3">
                                                        <div className="space-y-1 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-white">
                                                                    {t('ระยะห่างต้น')}:
                                                                </span>
                                                                <span className="font-medium">
                                                                    {
                                                                        history.present
                                                                            .selectedPlantType
                                                                            .plantSpacing
                                                                    }{' '}
                                                                    {t('ม')}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-white">
                                                                    {t('ระยะห่างแถว')}:
                                                                </span>
                                                                <span className="font-medium">
                                                                    {
                                                                        history.present
                                                                            .selectedPlantType
                                                                            .rowSpacing
                                                                    }{' '}
                                                                    {t('ม')}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-white">
                                                                    {t('น้ำต่อต้น')}:
                                                                </span>
                                                                <span className="font-medium">
                                                                    {
                                                                        history.present
                                                                            .selectedPlantType
                                                                            .waterNeed
                                                                    }{' '}
                                                                    {t('ล./ครั้ง')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleCreateCustomPlant()}
                                                        className="mt-3 w-full rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-purple-700 transition-colors hover:bg-purple-100"
                                                    >
                                                        <FaPlus className="mr-2 inline" />
                                                        {t('เพิ่มพืชใหม่')}
                                                    </button>
                                                </div>
                                            ) : (
                                                ''
                                            )}

                                            {actualTotalPlants > 0 && (
                                                <div className="rounded-lg border border-green-200 bg-gray-900 p-4">
                                                    <h4 className="mb-2 font-medium text-green-800">
                                                        {t('สถิติพืช')}
                                                    </h4>
                                                    <div className="space-y-1 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-green-700">
                                                                {t('จำนวนต้น')}:
                                                            </span>
                                                            <span className="font-bold text-green-800">
                                                                {actualTotalPlants} {t('ต้น')}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-green-700">
                                                                {t('น้ำรวม')}:
                                                            </span>
                                                            <span className="font-bold text-blue-800">
                                                                {formatWaterVolume(
                                                                    actualTotalWaterNeed,
                                                                    t
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'water' && (
                                <div className="p-4">
                                    <h3 className="mb-4 flex items-center font-semibold text-white">
                                        <span className="mr-2">🚰</span>
                                        {t('ระบบน้ำ')}
                                    </h3>

                                    <div className="space-y-4">
                                        <div className="rounded-lg border border-gray-200 bg-gray-900 p-4">
                                            <h4 className="mb-3 font-medium text-white">
                                                {t('ปั๊มน้ำ')}
                                            </h4>

                                            <button
                                                onClick={() =>
                                                    setEditMode(editMode === 'pump' ? null : 'pump')
                                                }
                                                className={`w-full rounded-lg border px-4 py-3 font-medium transition-colors ${
                                                    editMode === 'pump'
                                                        ? 'border-red-300 bg-red-300 text-red-900 hover:bg-red-100'
                                                        : 'border-blue-300 bg-blue-300 text-blue-900 hover:bg-blue-100'
                                                }`}
                                            >
                                                {history.present.pump ? (
                                                    editMode === 'pump' ? (
                                                        <>{t('❌ หยุดวางปั๊ม')}</>
                                                    ) : (
                                                        <>
                                                            <FaEdit className="mr-2 inline" />
                                                            {t('เปลี่ยนตำแหน่งปั๊ม')}
                                                        </>
                                                    )
                                                ) : editMode === 'pump' ? (
                                                    <>{t('❌ หยุดวางปั๊ม')}</>
                                                ) : (
                                                    <>🚰 {t('วางปั๊มน้ำ')}</>
                                                )}
                                            </button>

                                            {history.present.pump && (
                                                <div className="mt-3 rounded-lg border border-blue-200 bg-gray-900 p-3">
                                                    <div className="flex items-center text-sm text-blue-700">
                                                        <span className="mr-1">✅</span>
                                                        <span className="font-medium">
                                                            {t('ปั๊มพร้อมใช้งาน')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="rounded-lg border border-gray-200 bg-gray-900 p-4">
                                            <h4 className="mb-3 font-medium text-white">
                                                🎛️ {t('การตั้งค่าท่อย่อย')}
                                            </h4>

                                            <div className="space-y-3">
                                                <div>
                                                    <label className="mb-1 block text-sm text-white">
                                                        {t('มุมเริ่มต้น')}:{' '}
                                                        {
                                                            history.present.branchPipeSettings
                                                                .defaultAngle
                                                        }
                                                        °
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="180"
                                                        value={
                                                            history.present.branchPipeSettings
                                                                .defaultAngle
                                                        }
                                                        onChange={(e) => {
                                                            pushToHistory({
                                                                branchPipeSettings: {
                                                                    ...history.present
                                                                        .branchPipeSettings,
                                                                    defaultAngle: parseInt(
                                                                        e.target.value
                                                                    ),
                                                                },
                                                            });
                                                        }}
                                                        className="w-full"
                                                    />
                                                    <div className="flex justify-between text-xs text-white">
                                                        <span>0°</span>
                                                        <span>90°</span>
                                                        <span>180°</span>
                                                    </div>
                                                </div>

                                                {history.present.subMainPipes.length > 0 && (
                                                    <div className="rounded-lg border border-yellow-200 bg-gray-900 p-3">
                                                        <div className="mb-2 text-sm font-medium text-white">
                                                            ⚡ {t('ปรับมุมแบบเรียลไทม์')}
                                                        </div>
                                                        <div className="space-y-2">
                                                            {history.present.subMainPipes.map(
                                                                (subMain) => (
                                                                    <div
                                                                        key={subMain.id}
                                                                        className="flex items-center justify-between rounded bg-gray-900 p-2"
                                                                    >
                                                                        <div className="text-xs text-white">
                                                                            <div>
                                                                                {t('มุม')}:{' '}
                                                                                {subMain.currentAngle ||
                                                                                    history.present
                                                                                        .branchPipeSettings
                                                                                        .defaultAngle}
                                                                                °
                                                                            </div>
                                                                            <div>
                                                                                {
                                                                                    subMain
                                                                                        .branchPipes
                                                                                        .length
                                                                                }{' '}
                                                                                {t('ท่อย่อย')}
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            onClick={() =>
                                                                                handleStartRealTimeBranchEdit(
                                                                                    subMain
                                                                                )
                                                                            }
                                                                            className="rounded bg-yellow-600 px-2 py-1 text-xs text-white hover:bg-yellow-700"
                                                                        >
                                                                            <FaAdjust className="mr-1 inline" />
                                                                            {t('ปรับ')}
                                                                        </button>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-gray-200 bg-gray-900 p-4">
                                            <h4 className="mb-3 font-medium text-white">
                                                {t('ท่อน้ำ')}
                                            </h4>

                                            <div className="space-y-2">
                                                <button
                                                    onClick={() =>
                                                        setEditMode(
                                                            editMode === 'mainPipe'
                                                                ? null
                                                                : 'mainPipe'
                                                        )
                                                    }
                                                    disabled={
                                                        !history.present.pump ||
                                                        (history.present.useZones &&
                                                            history.present.zones.length === 0)
                                                    }
                                                    className={`w-full rounded-lg border px-4 py-3 font-medium transition-colors ${
                                                        !history.present.pump ||
                                                        (history.present.useZones &&
                                                            history.present.zones.length === 0)
                                                            ? 'cursor-not-allowed border-blue-300 bg-blue-300 text-blue-900'
                                                            : editMode === 'mainPipe'
                                                              ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                                                              : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                                                    }`}
                                                >
                                                    {editMode === 'mainPipe' ? (
                                                        <>❌ {t('หยุดวางท่อเมน')}</>
                                                    ) : (
                                                        <>🔧 {t('วางท่อเมน')}</>
                                                    )}
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
                                                    className={`w-full rounded-lg border px-4 py-3 font-medium transition-colors ${
                                                        (history.present.useZones &&
                                                            history.present.zones.length === 0) ||
                                                        (!history.present.useZones &&
                                                            history.present.mainArea.length === 0)
                                                            ? 'cursor-not-allowed border-purple-300 bg-purple-300 text-purple-900'
                                                            : editMode === 'subMainPipe'
                                                              ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                                                              : 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                                                    }`}
                                                >
                                                    {editMode === 'subMainPipe' ? (
                                                        <>❌ {t('หยุดวางท่อเมนรอง')}</>
                                                    ) : (
                                                        <>🔧 {t('วางท่อเมนรอง + ท่อย่อย')}</>
                                                    )}
                                                </button>
                                            </div>

                                            {!history.present.pump && (
                                                <div className="mt-3 rounded-lg border border-amber-200 bg-gray-900 p-3 text-sm text-white">
                                                    ⚠️ {t('ต้องวางปั๊มก่อนจึงจะสร้างท่อได้')}
                                                </div>
                                            )}

                                            {(history.present.mainPipes.length > 0 ||
                                                history.present.subMainPipes.length > 0) && (
                                                <div className="mt-3 rounded-lg border bg-gray-900 p-3">
                                                    <div className="text-sm text-white">
                                                        <div className="flex justify-between">
                                                            <span>{t('ท่อเมน')}:</span>
                                                            <span className="font-medium">
                                                                {history.present.mainPipes.length}{' '}
                                                                {t('เส้น')}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>{t('ท่อเมนรอง')}:</span>
                                                            <span className="font-medium">
                                                                {
                                                                    history.present.subMainPipes
                                                                        .length
                                                                }{' '}
                                                                {t('เส้น')}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>{t('ท่อย่อย')}:</span>
                                                            <span className="font-medium">
                                                                {history.present.subMainPipes.reduce(
                                                                    (sum, sm) =>
                                                                        sum + sm.branchPipes.length,
                                                                    0
                                                                )}{' '}
                                                                {t('เส้น')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {editMode === 'subMainPipe' && history.present.useZones && (
                                            <div className="rounded-lg border border-purple-200 bg-gray-900 p-4">
                                                <h4 className="mb-3 font-medium text-white">
                                                    🔧 {t('เลือกโซนสำหรับท่อเมนรอง')}
                                                </h4>
                                                <select
                                                    value={selectedZone?.id || ''}
                                                    onChange={(e) => {
                                                        const zone = history.present.zones.find(
                                                            (z) => z.id === e.target.value
                                                        );
                                                        setSelectedZone(zone || null);
                                                    }}
                                                    className="w-full rounded-lg border border-gray-300 bg-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                >
                                                    <option value="">{t('เลือกโซน')}</option>
                                                    {history.present.zones.map((zone) => (
                                                        <option key={zone.id} value={zone.id}>
                                                            {zone.name} ({zone.plantData.name})
                                                        </option>
                                                    ))}
                                                </select>
                                                {!selectedZone && (
                                                    <p className="mt-2 rounded bg-gray-900 p-2 text-xs text-white">
                                                        ⚠️ {t('ต้องเลือกโซนก่อนวาดท่อเมนรอง')}
                                                    </p>
                                                )}
                                                {selectedZone && (
                                                    <div className="mt-2 rounded bg-gray-900 p-2 text-xs text-white">
                                                        ✅ {t('พร้อมสร้างท่อครอบคลุมในโซน')}{' '}
                                                        {selectedZone.name}
                                                        <br />
                                                        {t('พืช')}: {selectedZone.plantData.name}
                                                        <br />
                                                        {t('มุมเริ่มต้น')}:{' '}
                                                        {
                                                            history.present.branchPipeSettings
                                                                .defaultAngle
                                                        }
                                                        °
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'advanced' && (
                                <div className="p-4">
                                    <h3 className="mb-4 flex items-center font-semibold text-white">
                                        <span className="mr-2">⚙️</span>
                                        {t('แก้ไข')}
                                    </h3>

                                    <div className="space-y-4">
                                        <div className="rounded-lg border border-gray-200 bg-gray-900 p-4">
                                            <h4 className="mb-3 font-medium text-white">
                                                {t('โหมดแก้ไข')}
                                            </h4>

                                            <button
                                                onClick={handleToggleEditMode}
                                                disabled={!canEnableEditMode}
                                                className={`w-full rounded-lg border px-4 py-3 font-medium transition-colors ${
                                                    !canEnableEditMode
                                                        ? 'cursor-not-allowed border-green-300 bg-green-300 text-green-900'
                                                        : history.present.isEditModeEnabled
                                                          ? 'border-red-300 bg-red-300 text-red-900 hover:bg-red-100'
                                                          : 'border-green-300 bg-green-300 text-green-900 hover:bg-green-100'
                                                }`}
                                            >
                                                {history.present.isEditModeEnabled ? (
                                                    <>
                                                        <FaTimes className="mr-2 inline" />
                                                        {t('ออกจากโหมดแก้ไข')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaEdit className="mr-2 inline" />
                                                        {t('เข้าสู่โหมดแก้ไข')}
                                                    </>
                                                )}
                                            </button>

                                            {!canEnableEditMode && (
                                                <div className="mt-3 rounded-lg border border-amber-200 bg-gray-900 p-3 text-sm text-white">
                                                    ⚠️{' '}
                                                    {t(
                                                        'ต้องมีพื้นที่หลัก, ปั๊ม, ท่อและต้นไม้ก่อนเข้าโหมดแก้ไข'
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {history.present.isEditModeEnabled && (
                                            <>
                                                <div className="rounded-lg border border-blue-200 bg-gray-900 p-4">
                                                    <h4 className="mb-3 font-medium text-white">
                                                        🎯 {t('การเลือก')}
                                                    </h4>

                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="mb-2 block text-sm text-white">
                                                                {t('โหมดการเลือก')}
                                                            </label>
                                                            <select
                                                                value={
                                                                    history.present.editModeSettings
                                                                        .selectionMode
                                                                }
                                                                onChange={(e) =>
                                                                    handleUpdateEditSettings({
                                                                        selectionMode: e.target
                                                                            .value as
                                                                            | 'single'
                                                                            | 'multi'
                                                                            | 'rectangle',
                                                                    })
                                                                }
                                                                className="w-full rounded border border-gray-300 bg-gray-900 px-3 py-2 text-white"
                                                            >
                                                                <option value="single">
                                                                    {t('เลือกทีละตัว')}
                                                                </option>
                                                                <option value="multi">
                                                                    {t('เลือกหลายตัว')}
                                                                </option>
                                                                <option value="rectangle">
                                                                    {t('เลือกโดยพื้นที่')}
                                                                </option>
                                                            </select>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    handleSelectAll('plants')
                                                                }
                                                                className="rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                                                            >
                                                                <FaObjectGroup className="mr-1 inline" />
                                                                {t('เลือกต้นไม้ทั้งหมด')}
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleSelectAll('pipes')
                                                                }
                                                                className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                                                            >
                                                                <FaObjectGroup className="mr-1 inline" />
                                                                {t('เลือกท่อทั้งหมด')}
                                                            </button>
                                                        </div>

                                                        <button
                                                            onClick={handleClearSelection}
                                                            className="w-full rounded bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700"
                                                        >
                                                            <FaObjectUngroup className="mr-1 inline" />
                                                            {t('ยกเลิกการเลือก')}
                                                        </button>

                                                        {selectedItemsCount > 0 && (
                                                            <div className="rounded border border-yellow-300 bg-gray-900 p-3 text-sm">
                                                                <div className="font-medium text-yellow-400">
                                                                    {t('เลือกแล้ว')}:{' '}
                                                                    {selectedItemsCount}{' '}
                                                                    {t('รายการ')}
                                                                </div>
                                                                <div className="text-yellow-300">
                                                                    • {t('ต้นไม้')}:{' '}
                                                                    {
                                                                        history.present
                                                                            .selectedItems.plants
                                                                            .length
                                                                    }
                                                                    • {t('ท่อ')}:{' '}
                                                                    {
                                                                        history.present
                                                                            .selectedItems.pipes
                                                                            .length
                                                                    }
                                                                    • {t('โซน')}:{' '}
                                                                    {
                                                                        history.present
                                                                            .selectedItems.zones
                                                                            .length
                                                                    }
                                                                </div>
                                                                <button
                                                                    onClick={() =>
                                                                        setShowBatchModal(true)
                                                                    }
                                                                    className="mt-2 rounded bg-yellow-600 px-3 py-1 text-sm text-white hover:bg-yellow-700"
                                                                >
                                                                    {t('จัดการแบบกลุ่ม')}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="rounded-lg border border-purple-200 bg-gray-900 p-4">
                                                    <h4 className="mb-3 font-medium text-white">
                                                        👁️ {t('การแสดงผล')}
                                                    </h4>

                                                    <div className="space-y-2">
                                                        {Object.entries(
                                                            history.present.layerVisibility
                                                        )
                                                            .filter(
                                                                ([key]) =>
                                                                    ![
                                                                        'grid',
                                                                        'measurements',
                                                                    ].includes(key)
                                                            )
                                                            .map(([key, visible]) => (
                                                                <label
                                                                    key={key}
                                                                    className="flex items-center space-x-2"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={visible}
                                                                        onChange={() =>
                                                                            handleToggleLayer(
                                                                                key as keyof ProjectState['layerVisibility']
                                                                            )
                                                                        }
                                                                        className="h-4 w-4 rounded border-gray-300"
                                                                    />
                                                                    <span className="text-sm text-white">
                                                                        {visible ? (
                                                                            <FaEye className="mr-1 inline" />
                                                                        ) : (
                                                                            <FaEyeSlash className="mr-1 inline" />
                                                                        )}
                                                                        {key === 'plants' &&
                                                                            t('ต้นไม้')}
                                                                        {key === 'pipes' &&
                                                                            t('ท่อน้ำ')}
                                                                        {key === 'zones' &&
                                                                            t('โซน')}
                                                                        {key === 'exclusions' &&
                                                                            t('พื้นที่หลีกเลี่ยง')}
                                                                    </span>
                                                                </label>
                                                            ))}
                                                    </div>
                                                </div>

                                                <div className="rounded-lg border border-green-200 bg-gray-900 p-4">
                                                    <h4 className="mb-3 font-medium text-white">
                                                        🛠️ {t('การตั้งค่าแก้ไข')}
                                                    </h4>

                                                    <div className="space-y-3">
                                                        <label className="flex items-center space-x-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    history.present.editModeSettings
                                                                        .autoConnect
                                                                }
                                                                onChange={(e) =>
                                                                    handleUpdateEditSettings({
                                                                        autoConnect:
                                                                            e.target.checked,
                                                                    })
                                                                }
                                                                className="h-4 w-4 rounded border-gray-300"
                                                            />
                                                            <span className="text-sm text-white">
                                                                <FaLink className="mr-1 inline" />
                                                                {t('เชื่อมต่ออัตโนมัติ')}
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {isCreatingConnection && (
                                            <div className="rounded-lg border border-blue-200 bg-gray-900 p-4">
                                                <h4 className="mb-2 font-medium text-white">
                                                    🔗 {t('โหมดเชื่อมต่อท่อ')}
                                                </h4>
                                                <p className="mb-3 text-sm text-white">
                                                    {t(
                                                        'คลิกที่ท่อเมนรองหรือท่อย่อยหรือต้นไม้เพื่อเชื่อมต่อ'
                                                    )}
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        setIsCreatingConnection(false);
                                                        setConnectionStartPlant(null);
                                                        setHighlightedPipes([]);
                                                        setDragMode('none');
                                                    }}
                                                    className="w-full rounded bg-red-100 px-3 py-2 text-red-700 transition-colors hover:bg-red-200"
                                                >
                                                    {t('ยกเลิกการเชื่อมต่อ')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'summary' && (
                                <div className="p-4">
                                    <h3 className="mb-4 flex items-center font-semibold text-white">
                                        <span className="mr-2">📊</span>
                                        {t('สรุปโครงการ')}
                                    </h3>

                                    <div className="mb-4 rounded-lg border border-gray-100 bg-gray-900 p-4">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-white">
                                                    {t('ชื่อโครงการ')}:
                                                </label>
                                                <input
                                                    type="text"
                                                    value={projectName}
                                                    onChange={(e) => setProjectName(e.target.value)}
                                                    className="w-full rounded-lg border border-gray-300 bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={history.present.isEditModeEnabled}
                                                    placeholder={t('ชื่อโครงการ')}
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-white">
                                                    {t('ชื่อลูกค้า')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={customerName}
                                                    onChange={(e) =>
                                                        setCustomerName(e.target.value)
                                                    }
                                                    placeholder={t('ชื่อ - นามสกุล')}
                                                    className="w-full rounded-lg border border-gray-300 bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={history.present.isEditModeEnabled}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="rounded border bg-gray-900 p-2">
                                                    <div className="text-white">
                                                        {t('พื้นที่รวม')}
                                                    </div>
                                                    <div className="font-semibold text-green-600">
                                                        {formatArea(totalArea, t)}
                                                    </div>
                                                </div>
                                                <div className="rounded border bg-gray-900 p-2">
                                                    <div className="text-white">{t('ต้นไม้')}</div>
                                                    <div className="font-semibold text-green-600">
                                                        {actualTotalPlants} {t('ต้น')}
                                                    </div>
                                                </div>
                                                <div className="rounded border bg-gray-900 p-2">
                                                    <div className="text-white">{t('โซน')}</div>
                                                    <div className="font-semibold text-blue-600">
                                                        {history.present.useZones
                                                            ? history.present.zones.length
                                                            : 1}{' '}
                                                        {t('โซน')}
                                                    </div>
                                                </div>
                                                <div className="rounded border bg-gray-900 p-2">
                                                    <div className="text-white">
                                                        {t('น้ำ/ครั้ง')}
                                                    </div>
                                                    <div className="font-semibold text-blue-600">
                                                        {formatWaterVolume(actualTotalWaterNeed, t)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="rounded-lg border border-gray-200 bg-gray-900 p-4">
                                            <h4 className="mb-3 font-medium text-white">
                                                {t('ข้อมูลโครงการ')}
                                            </h4>

                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-white">
                                                        {t('พื้นที่รวม')}:
                                                    </span>
                                                    <span className="font-medium">
                                                        {formatArea(totalArea, t)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-white">
                                                        {t('จำนวนโซน')}:
                                                    </span>
                                                    <span className="font-medium">
                                                        {history.present.useZones
                                                            ? history.present.zones.length
                                                            : 1}{' '}
                                                        {t('โซน')}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-white">
                                                        {t('จำนวนต้นไม้')}:
                                                    </span>
                                                    <span className="font-medium text-green-600">
                                                        {actualTotalPlants} {t('ต้น')}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-white">
                                                        {t('น้ำต่อครั้ง')}:
                                                    </span>
                                                    <span className="font-medium text-blue-600">
                                                        {formatWaterVolume(actualTotalWaterNeed, t)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-white">
                                                        {t('สถานะปั๊ม')}:
                                                    </span>
                                                    <span
                                                        className={`font-medium ${history.present.pump ? 'text-green-600' : 'text-red-600'}`}
                                                    >
                                                        {history.present.pump
                                                            ? t('พร้อมใช้งาน')
                                                            : t('ยังไม่ได้วาง')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {history.present.isEditModeEnabled && (
                                            <div className="rounded-lg border border-yellow-200 bg-gray-900 p-4">
                                                <h4 className="mb-3 font-medium text-white">
                                                    📈 {t('สถิติการแก้ไข')}
                                                </h4>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-white">
                                                            {t('รายการที่เลือก')}:
                                                        </span>
                                                        <span className="font-medium text-yellow-600">
                                                            {selectedItemsCount} {t('รายการ')}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-white">
                                                            {t('โหมดการเลือก')}:
                                                        </span>
                                                        <span className="font-medium">
                                                            {history.present.editModeSettings
                                                                .selectionMode === 'single' &&
                                                                t('เลือกทีละตัว')}
                                                            {history.present.editModeSettings
                                                                .selectionMode === 'multi' &&
                                                                t('เลือกหลายตัว')}
                                                            {history.present.editModeSettings
                                                                .selectionMode === 'rectangle' &&
                                                                t('เลือกโดยพื้นที่')}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-white">
                                                            {t('ประวัติการแก้ไข')}:
                                                        </span>
                                                        <span className="font-medium text-blue-600">
                                                            {history.past.length} {t('ขั้นตอน')}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-white">
                                                            {t('การลากวัตถุ')}:
                                                        </span>
                                                        <span
                                                            className={`font-medium ${isDragging ? 'text-orange-400' : 'text-gray-400'}`}
                                                        >
                                                            {isDragging
                                                                ? t('กำลังลาง')
                                                                : t('พร้อม')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="relative flex-1 bg-gray-900">
                    <div className="h-full w-full">
                        <HorticultureMapComponent
                            center={mapCenter}
                            zoom={mapRef.current ? mapRef.current.getZoom() || 16 : 16}
                            onMapLoad={handleMapLoad}
                        >
                            <EnhancedHorticultureSearchControl
                                onPlaceSelect={handleSearch}
                                placeholder="🔍 ค้นหาสถานที่..."
                            />

                            <HorticultureDrawingManager
                                editMode={editMode}
                                onCreated={handleDrawingComplete}
                                fillColor={
                                    editMode === 'zone'
                                        ? getZoneColor(history.present.zones.length)
                                        : editMode === 'exclusion'
                                          ? EXCLUSION_COLORS[selectedExclusionType]
                                          : undefined
                                }
                                strokeColor={
                                    editMode === 'zone'
                                        ? getZoneColor(history.present.zones.length)
                                        : editMode === 'exclusion'
                                          ? EXCLUSION_COLORS[selectedExclusionType]
                                          : undefined
                                }
                                isEditModeEnabled={history.present.isEditModeEnabled}
                            />

                            <DistanceIndicator
                                map={mapRef.current}
                                isActive={editMode === 'zone'}
                                editMode={editMode}
                            />

                            <DistanceMeasurementOverlay
                                map={mapRef.current}
                                isActive={editMode === 'mainArea' || editMode === 'zone' || editMode === 'exclusion' || editMode === 'mainPipe' || editMode === 'subMainPipe'}
                                editMode={editMode}
                            />

                            <EnhancedGoogleMapsOverlays
                                map={mapRef.current}
                                data={history.present}
                                onMapClick={handleMapClick}
                                onPlantEdit={handlePlantEdit}
                                onConnectToPipe={handleConnectToPipe}
                                onConnectToPlant={handleConnectToPlant}
                                isCreatingConnection={isCreatingConnection}
                                highlightedPipes={highlightedPipes}
                                connectionStartPlant={connectionStartPlant}
                                tempConnectionLine={tempConnectionLine}
                                handleZonePlantSelection={handleZonePlantSelection}
                                handleCreatePlantConnection={handleCreatePlantConnection}
                                editMode={editMode}
                                onSelectItem={handleSelectItem}
                                onPlantDragStart={handlePlantDragStart}
                                onPlantDragEnd={handlePlantDragEnd}
                                onStartRealTimeBranchEdit={handleStartRealTimeBranchEdit}
                                onSegmentedPipeDeletion={handleSegmentedPipeDeletion}
                                isDragging={isDragging}
                                dragTarget={dragTarget}
                                t={t}
                            />

                            <div className="absolute right-4 top-16 rounded-lg border border-gray-200 bg-gray-900 p-3 shadow-lg">
                                <div className="mb-2 text-sm font-medium text-white">
                                    {t('สถานะปัจจุบัน')}
                                </div>
                                <div className="space-y-1 text-xs">
                                    <div
                                        className={`flex items-center ${history.present.mainArea.length > 0 ? 'text-green-600' : 'text-gray-400'}`}
                                    >
                                        <span className="mr-1">
                                            {history.present.mainArea.length > 0 ? '✅' : '○'}
                                        </span>
                                        {t('พื้นที่หลัก')}
                                    </div>
                                    <div
                                        className={`flex items-center ${history.present.pump ? 'text-green-600' : 'text-gray-400'}`}
                                    >
                                        <span className="mr-1">
                                            {history.present.pump ? '✅' : '○'}
                                        </span>
                                        {t('ปั๊มน้ำ')}
                                    </div>
                                    <div
                                        className={`flex items-center ${actualTotalPlants > 0 ? 'text-green-600' : 'text-gray-400'}`}
                                    >
                                        <span className="mr-1">
                                            {actualTotalPlants > 0 ? '✅' : '○'}
                                        </span>
                                        {t('ต้นไม้')} ({actualTotalPlants} {t('ต้น')})
                                    </div>
                                    {history.present.isEditModeEnabled && (
                                        <div className="flex items-center text-yellow-400">
                                            <span className="mr-1">⚙️</span>
                                            {t('โหมดแก้ไข')}
                                        </div>
                                    )}
                                    {selectedItemsCount > 0 && (
                                        <div className="flex items-center text-blue-400">
                                            <span className="mr-1">🎯</span>
                                            {t('เลือก')}: {selectedItemsCount}
                                        </div>
                                    )}
                                    {isDragging && (
                                        <div className="flex items-center text-orange-400">
                                            <span className="mr-1">🖱️</span>
                                            {t('กำลังลาก')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </HorticultureMapComponent>
                    </div>
                </div>
            </div>

            <CustomPlantModal
                isOpen={showCustomPlantModal}
                onClose={() => {
                    setShowCustomPlantModal(false);
                    setEditingPlant(null);
                }}
                onSave={handleSaveCustomPlant}
                defaultValues={editingPlant || undefined}
                t={t}
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
                t={t}
            />

            <SimpleMousePlantEditModal
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
                t={t}
            />

            <PipeSegmentSelectionModal
                isOpen={showPipeSegmentModal}
                onClose={() => {
                    setShowPipeSegmentModal(false);
                    setSelectedBranchForSegment(null);
                }}
                branchPipe={selectedBranchForSegment}
                onDeleteSegment={handleDeletePipeSegment}
                onDeleteWholePipe={(branchPipeId) => handleDeleteBranchPipe([branchPipeId])}
                t={t}
            />

            <BatchOperationsModal
                isOpen={showBatchModal}
                onClose={() => setShowBatchModal(false)}
                selectedItems={history.present.selectedItems}
                onBatchDelete={handleBatchDelete}
                onBatchMove={handleBatchMove}
                onBatchCopy={handleBatchCopy}
                onBatchPaste={handleBatchPaste}
                onCreateTemplate={handleCreateTemplate}
                onDeleteSpecificPlants={handleDeleteSpecificPlants}
                onDeleteBranchPipe={handleDeleteBranchPipe}
                onSegmentedPipeDeletion={handleSegmentedPipeDeletion}
                t={t}
            />

            <RealTimeBranchControlModal
                isOpen={showRealTimeBranchModal}
                onClose={() => setShowRealTimeBranchModal(false)}
                subMainPipe={
                    history.present.subMainPipes.find(
                        (sm) => sm.id === history.present.realTimeEditing.activePipeId
                    ) || null
                }
                currentAngle={history.present.realTimeEditing.activeAngle}
                onAngleChange={handleRealTimeBranchAngleChange}
                onApply={handleApplyRealTimeBranchEdit}
                branchSettings={history.present.branchPipeSettings}
                t={t}
            />
        </div>
    );
}

const EnhancedGoogleMapsOverlays: React.FC<{
    map: google.maps.Map | null;
    data: ProjectState;
    onMapClick: (event: google.maps.MapMouseEvent) => void;
    onPlantEdit: (plant: PlantLocation) => void;
    onConnectToPipe: (position: Coordinate, pipeId: string, pipeType: 'subMain' | 'branch') => void;
    onConnectToPlant: (plantId: string) => void;
    isCreatingConnection: boolean;
    highlightedPipes: string[];
    connectionStartPlant: PlantLocation | null;
    tempConnectionLine: Coordinate[] | null;
    handleZonePlantSelection: (zone: Zone) => void;
    handleCreatePlantConnection: (plantId: string) => void;
    editMode: string | null;
    onSelectItem: (id: string, type: 'plants' | 'pipes' | 'zones') => void;
    onPlantDragStart: (plantId: string) => void;
    onPlantDragEnd: (plantId: string, newPosition: Coordinate) => void;
    onStartRealTimeBranchEdit: (subMainPipe: SubMainPipe) => void;
    onSegmentedPipeDeletion: (branchPipeId: string) => void;
    isDragging: boolean;
    dragTarget: { id: string; type: 'plant' | 'pipe' } | null;
    t: (key: string) => string;
}> = ({
    map,
    data,
    onMapClick,
    onPlantEdit,
    onConnectToPipe,
    onConnectToPlant,
    isCreatingConnection,
    highlightedPipes,
    connectionStartPlant,
    tempConnectionLine,
    handleZonePlantSelection,
    handleCreatePlantConnection,
    editMode,
    onSelectItem,
    onPlantDragStart,
    onPlantDragEnd,
    onStartRealTimeBranchEdit,
    onSegmentedPipeDeletion,
    isDragging,
    dragTarget,
    t,
}) => {
    const overlaysRef = useRef<{
        polygons: Map<string, google.maps.Polygon>;
        polylines: Map<string, google.maps.Polyline>;
        markers: Map<string, google.maps.Marker>;
        infoWindows: Map<string, google.maps.InfoWindow>;
    }>({
        polygons: new Map(),
        polylines: new Map(),
        markers: new Map(),
        infoWindows: new Map(),
    });

    const clearOverlays = useCallback(() => {
        overlaysRef.current.polygons.forEach((polygon) => polygon.setMap(null));
        overlaysRef.current.polylines.forEach((polyline) => polyline.setMap(null));
        overlaysRef.current.markers.forEach((marker) => marker.setMap(null));
        overlaysRef.current.infoWindows.forEach((infoWindow) => infoWindow.close());

        overlaysRef.current.polygons.clear();
        overlaysRef.current.polylines.clear();
        overlaysRef.current.markers.clear();
        overlaysRef.current.infoWindows.clear();
    }, []);

    useEffect(() => {
        if (!map) return;
        const mapDiv = map.getDiv();

        const domClickHandler = (event: MouseEvent) => {
            const bounds = map.getBounds();
            if (!bounds) return;

            const mapBounds = mapDiv.getBoundingClientRect();
            const relativeX = (event.clientX - mapBounds.left) / mapBounds.width;
            const relativeY = (event.clientY - mapBounds.top) / mapBounds.height;

            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            const lng = sw.lng() + (ne.lng() - sw.lng()) * relativeX;
            const lat = ne.lat() + (sw.lat() - ne.lat()) * relativeY;

            const fakeMapEvent = {
                latLng: new google.maps.LatLng(lat, lng),
                domEvent: event,
                pixel: new google.maps.Point(
                    event.clientX - mapBounds.left,
                    event.clientY - mapBounds.top
                ),
                stop: () => {},
            } as unknown as google.maps.MapMouseEvent;

            onMapClick(fakeMapEvent);
        };

        const googleClickListener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
            if (event.latLng) {
                onMapClick(event);
            }
        });

        if (mapDiv) {
            mapDiv.addEventListener('click', domClickHandler);
        }

        return () => {
            if (mapDiv) {
                mapDiv.removeEventListener('click', domClickHandler);
            }
            google.maps.event.removeListener(googleClickListener);
        };
    }, [map, onMapClick, editMode]);

    useEffect(() => {
        if (!map) return;
        clearOverlays();

        const { layerVisibility } = data;

        if (data.mainArea.length > 0) {
            const mainAreaPolygon = new google.maps.Polygon({
                paths: data.mainArea.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                fillColor: '#22C55E',
                fillOpacity: 0.1,
                strokeColor: '#22C55E',
                strokeWeight: 3,
                clickable: editMode !== 'pump',
            });

            mainAreaPolygon.setMap(map);
            overlaysRef.current.polygons.set('main-area', mainAreaPolygon);

            if (editMode !== 'pump') {
                mainAreaPolygon.addListener('click', (event: google.maps.MapMouseEvent) => {
                    if (!data.isEditModeEnabled && editMode !== 'plant' && event.latLng) {
                        event.stop();
                    } else if (event.latLng) {
                        event.stop();
                    }
                });
            }
        }

        if (layerVisibility.zones) {
            data.zones.forEach((zone) => {
                const isSelected = data.selectedItems.zones.includes(zone.id);

                const zonePolygon = new google.maps.Polygon({
                    paths: zone.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                    fillColor: zone.color,
                    fillOpacity: isSelected ? 0.4 : 0.2,
                    strokeColor: zone.color,
                    strokeWeight: isSelected ? 4 : 2,
                    clickable: editMode !== 'pump',
                });

                zonePolygon.setMap(map);
                overlaysRef.current.polygons.set(zone.id, zonePolygon);

                if (editMode !== 'pump') {
                    zonePolygon.addListener('dblclick', () => {
                        if (!data.isEditModeEnabled) {
                            handleZonePlantSelection(zone);
                        }
                    });

                    zonePolygon.addListener('click', (event: google.maps.MapMouseEvent) => {
                        const domEvent = event.domEvent as MouseEvent;
                        if (
                            data.isEditModeEnabled &&
                            data.editModeSettings.selectionMode !== 'single' &&
                            domEvent?.ctrlKey
                        ) {
                            event.stop();
                            onSelectItem(zone.id, 'zones');
                        } else if (
                            !data.isEditModeEnabled &&
                            editMode !== 'plant' &&
                            event.latLng
                        ) {
                            event.stop();
                        } else if (event.latLng) {
                            event.stop();
                        }
                    });
                }
            });
        }

        if (layerVisibility.exclusions) {
            data.exclusionAreas.forEach((area) => {
                const exclusionPolygon = new google.maps.Polygon({
                    paths: area.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                    fillColor: area.color,
                    fillOpacity: 0.4,
                    strokeColor: area.color,
                    strokeWeight: 2,
                    clickable: editMode !== 'pump',
                });

                exclusionPolygon.setMap(map);
                overlaysRef.current.polygons.set(area.id, exclusionPolygon);

                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="color: black; text-align: center;">
                            <strong>${area.name}</strong><br/>
                            ${t('ประเภท')}: ${area.type}
                        </div>
                    `,
                });

                if (editMode !== 'pump') {
                    exclusionPolygon.addListener('click', (event: google.maps.MapMouseEvent) => {
                        infoWindow.setPosition(event.latLng);
                        infoWindow.open(map);
                    });
                }

                overlaysRef.current.infoWindows.set(area.id, infoWindow);
            });
        }

        if (data.pump) {
            const pumpMarker = new google.maps.Marker({
                position: { lat: data.pump.position.lat, lng: data.pump.position.lng },
                map: map,
                icon: {
                    url:
                        'data:image/svg+xml;charset=UTF-8,' +
                        encodeURIComponent(`
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="16" cy="16" r="15" fill="#3B82F6" stroke="#ffffff" stroke-width="3"/>
                            <text x="16" y="20" text-anchor="middle" fill="white" font-size="16">🚰</text>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(32, 32),
                    anchor: new google.maps.Point(16, 16),
                },
                title: t('ปั๊มน้ำ'),
            });

            overlaysRef.current.markers.set(data.pump.id, pumpMarker);

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="color: black; text-align: center;">
                        <strong>${t('ปั๊มน้ำ')}</strong><br/>
                    </div>
                `,
            });

            pumpMarker.addListener('click', () => {
                infoWindow.open(map, pumpMarker);
            });

            overlaysRef.current.infoWindows.set(data.pump.id, infoWindow);
        }

        if (layerVisibility.pipes) {
            data.mainPipes.forEach((pipe) => {
                const isSelected = data.selectedItems.pipes.includes(pipe.id);

                const mainPipePolyline = new google.maps.Polyline({
                    path: pipe.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                    strokeColor: isSelected ? '#FFD700' : '#3B82F6',
                    strokeWeight: isSelected ? 8 : 6,
                    strokeOpacity: 0.9,
                    clickable: true,
                });

                mainPipePolyline.setMap(map);
                overlaysRef.current.polylines.set(pipe.id, mainPipePolyline);

                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="color: black; text-align: center;">
                            <strong>${t('ท่อเมน')}</strong><br/>
                            ${t('ความยาว')}: ${pipe.length.toFixed(2)} ${t('ม.')}<br/>
                            ${t('เส้นผ่านศูนย์กลาง')}: ${pipe.diameter} ${t('มม.')}<br/>
                            ${t('ไปยังโซน')}: ${pipe.toZone}<br/>
                            ${data.isEditModeEnabled ? '<br/><button onclick="window.selectPipe(\'' + pipe.id + '\')" style="background: #9333EA; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">' + (isSelected ? t('ยกเลิกเลือก') : t('เลือกท่อ')) + '</button>' : ''}
                        </div>
                    `,
                });

                mainPipePolyline.addListener('click', (event: google.maps.MapMouseEvent) => {
                    const domEvent = event.domEvent as MouseEvent;
                    if (
                        data.isEditModeEnabled &&
                        data.editModeSettings.selectionMode !== 'single' &&
                        domEvent?.ctrlKey
                    ) {
                        event.stop();
                        onSelectItem(pipe.id, 'pipes');
                    } else {
                        infoWindow.setPosition(event.latLng);
                        infoWindow.open(map);
                    }
                });

                overlaysRef.current.infoWindows.set(pipe.id, infoWindow);
            });

            data.subMainPipes.forEach((pipe) => {
                const isHighlighted = highlightedPipes.includes(pipe.id);
                const isSelected = data.selectedItems.pipes.includes(pipe.id);

                const subMainPipePolyline = new google.maps.Polyline({
                    path: pipe.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                    strokeColor: isSelected ? '#FFD700' : isHighlighted ? '#FFD700' : '#8B5CF6',
                    strokeWeight: isSelected ? 8 : isHighlighted ? 7 : 5,
                    strokeOpacity: isHighlighted || isSelected ? 1 : 0.9,
                    clickable: true,
                });

                subMainPipePolyline.setMap(map);
                overlaysRef.current.polylines.set(pipe.id, subMainPipePolyline);

                subMainPipePolyline.addListener('click', (event: google.maps.MapMouseEvent) => {
                    if (isCreatingConnection && isHighlighted && event.latLng) {
                        event.stop();
                        onConnectToPipe(
                            { lat: event.latLng.lat(), lng: event.latLng.lng() },
                            pipe.id,
                            'subMain'
                        );
                    } else {
                        const domEvent = event.domEvent as MouseEvent;
                        if (
                            data.isEditModeEnabled &&
                            data.editModeSettings.selectionMode !== 'single' &&
                            domEvent?.ctrlKey
                        ) {
                            event.stop();
                            onSelectItem(pipe.id, 'pipes');
                        }
                    }
                });

                pipe.branchPipes.forEach((branchPipe) => {
                    const isBranchHighlighted = highlightedPipes.includes(branchPipe.id);
                    const isBranchSelected = data.selectedItems.pipes.includes(branchPipe.id);

                    const branchPolyline = new google.maps.Polyline({
                        path: branchPipe.coordinates.map((coord) => ({
                            lat: coord.lat,
                            lng: coord.lng,
                        })),
                        strokeColor: isBranchSelected
                            ? '#FFD700'
                            : isBranchHighlighted
                              ? '#FFD700'
                              : '#FFFF66',
                        strokeWeight: isBranchSelected ? 5 : isBranchHighlighted ? 4 : 2,
                        strokeOpacity: isBranchHighlighted || isBranchSelected ? 1 : 0.8,
                        clickable: true,
                    });

                    branchPolyline.setMap(map);
                    overlaysRef.current.polylines.set(branchPipe.id, branchPolyline);

                    const branchInfoWindow = new google.maps.InfoWindow({
                        content: `
                            <div style="color: black; text-align: center;">
                                <strong>${t('ท่อย่อย')}</strong><br/>
                                ${t('ความยาว')}: ${branchPipe.length.toFixed(2)} ${t('ม.')}<br/>
                                ${t('ต้นไม้')}: ${branchPipe.plants.length} ${t('ต้น')}<br/>
                                ${branchPipe.angle ? `${t('มุม')}: ${branchPipe.angle}°<br/>` : ''}
                                ${branchPipe.connectionPoint ? `${t('จุดต่อ')}: ${(branchPipe.connectionPoint * 100).toFixed(1)}%<br/>` : ''}
                                ${data.isEditModeEnabled ? '<br/><button onclick="window.segmentedPipeDeletion(\'' + branchPipe.id + '\')" style="background: #F97316; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">✂️ ' + t('ลบท่อระหว่างต้นไม้') + '</button>' : ''}
                                ${data.isEditModeEnabled ? '<br/><button onclick="window.selectPipe(\'' + branchPipe.id + '\')" style="background: #9333EA; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">' + (isBranchSelected ? t('ยกเลิกเลือก') : t('เลือกท่อ')) + '</button>' : ''}
                                ${isCreatingConnection && isBranchHighlighted ? '<br/><div style="font-size: 12px; color: #FCD34D;">🔗 ' + t('คลิกเพื่อเชื่อมต่อ') + '</div>' : ''}
                            </div>
                        `,
                    });

                    branchPolyline.addListener('click', (event: google.maps.MapMouseEvent) => {
                        if (isCreatingConnection && isBranchHighlighted && event.latLng) {
                            event.stop();
                            onConnectToPipe(
                                { lat: event.latLng.lat(), lng: event.latLng.lng() },
                                branchPipe.id,
                                'branch'
                            );
                        } else {
                            const domEvent = event.domEvent as MouseEvent;
                            if (
                                data.isEditModeEnabled &&
                                data.editModeSettings.selectionMode !== 'single' &&
                                domEvent?.ctrlKey
                            ) {
                                event.stop();
                                onSelectItem(branchPipe.id, 'pipes');
                            } else {
                                branchInfoWindow.setPosition(event.latLng);
                                branchInfoWindow.open(map);
                            }
                        }
                    });

                    overlaysRef.current.infoWindows.set(branchPipe.id, branchInfoWindow);
                });
            });
        }

        if (layerVisibility.plants) {
            data.plants.forEach((plant) => {
                const isConnectionStart = connectionStartPlant?.id === plant.id;
                const isSelected = data.selectedItems.plants.includes(plant.id);
                const isCurrentlyDragging =
                    isDragging && dragTarget?.id === plant.id && dragTarget.type === 'plant';
                const isHighlightedForConnection = highlightedPipes.includes(plant.id);

                const plantMarker = new google.maps.Marker({
                    position: { lat: plant.position.lat, lng: plant.position.lng },
                    map: map,
                    icon: {
                        url:
                            'data:image/svg+xml;charset=UTF-8,' +
                            encodeURIComponent(`
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                ${isConnectionStart ? '<circle cx="16" cy="16" r="14" fill="none" stroke="#FFD700" stroke-width="3"/>' : ''}
                                ${isSelected ? '<circle cx="16" cy="16" r="13" fill="none" stroke="#9333EA" stroke-width="2"/>' : ''}
                                ${isCurrentlyDragging ? '<circle cx="16" cy="16" r="12" fill="none" stroke="#FF6B35" stroke-width="3"/>' : ''}
                                ${isHighlightedForConnection ? '<circle cx="16" cy="16" r="13" fill="none" stroke="#FFD700" stroke-width="2"/>' : ''}
                                <text x="16" y="22" text-anchor="middle" fill="white" font-size="16" font-weight="bold">🌳</text>
                            </svg>
                        `),
                        scaledSize: new google.maps.Size(32, 32),
                        anchor: new google.maps.Point(16, 16),
                    },
                    title: `${plant.plantData.name} (${plant.id})`,
                    draggable: data.isEditModeEnabled,
                    zIndex: 1000,
                });

                overlaysRef.current.markers.set(plant.id, plantMarker);

                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="color: black; text-align: center;">
                            <strong>${t(plant.plantData.name)}</strong><br/>
                            ${t('น้ำ')}: ${plant.plantData.waterNeed} ${t('ล./ครั้ง')}<br/>
                            ${t('ระยะปลูก')}: ${plant.plantData.plantSpacing}×${plant.plantData.rowSpacing} ${t('ม.')}<br/>
                            ${plant.zoneId ? `${t('โซน')}: ${plant.zoneId}<br/>` : ''}
                            ${data.isEditModeEnabled ? `<div style="font-size: 12px; color: #22C55E;">🖱️ ${t('ลากเพื่อเปลี่ยนตำแหน่ง')}</div>` : ''}
                            ${
                                data.isEditModeEnabled
                                    ? `
                                <br/>
                                <button onclick="window.editPlant('${plant.id}')" style="background: #F59E0B; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin: 2px;">✏️ ${t('แก้ไข')}</button>
                                <button onclick="window.createPlantConnection('${plant.id}')" style="background: #3B82F6; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin: 2px;">🔗 ${t('เชื่อมต่อ')}</button>
                                <br/>
                                <button onclick="window.selectPlant('${plant.id}')" style="background: #9333EA; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin: 2px;">${isSelected ? t('ยกเลิกเลือก') : t('เลือกต้นไม้')}</button>
                            `
                                    : ''
                            }
                            ${isCreatingConnection && isHighlightedForConnection ? '<br/><div style="font-size: 12px; color: #FCD34D;">🔗 คลิกเพื่อเชื่อมต่อ</div>' : ''}
                        </div>
                    `,
                });

                plantMarker.addListener('dblclick', () => {
                    onPlantEdit(plant);
                });

                plantMarker.addListener('click', (event: google.maps.MapMouseEvent) => {
                    if (isCreatingConnection && isHighlightedForConnection) {
                        onConnectToPlant(plant.id);
                    } else {
                        const domEvent = event.domEvent as MouseEvent;
                        if (
                            data.isEditModeEnabled &&
                            data.editModeSettings.selectionMode !== 'single' &&
                            domEvent?.ctrlKey
                        ) {
                            onSelectItem(plant.id, 'plants');
                        } else if (data.isEditModeEnabled && !isCreatingConnection) {
                            handleCreatePlantConnection(plant.id);
                        } else {
                            infoWindow.open(map, plantMarker);
                        }
                    }
                });

                if (data.isEditModeEnabled) {
                    plantMarker.addListener('dragstart', () => {
                        onPlantDragStart(plant.id);
                    });

                    plantMarker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
                        if (event.latLng) {
                            const newPosition = {
                                lat: event.latLng.lat(),
                                lng: event.latLng.lng(),
                            };

                            onPlantDragEnd(plant.id, newPosition);
                        }
                    });
                }

                overlaysRef.current.infoWindows.set(plant.id, infoWindow);
            });
        }

        if (tempConnectionLine && tempConnectionLine.length >= 2) {
            const tempPolyline = new google.maps.Polyline({
                path: tempConnectionLine.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                strokeColor: '#FFD700',
                strokeWeight: 3,
                strokeOpacity: 0.7,
                clickable: false,
            });

            tempPolyline.setMap(map);
            overlaysRef.current.polylines.set('temp-connection', tempPolyline);
        }

        (window as any).selectZonePlant = (zoneId: string) => {
            const zone = data.zones.find((z) => z.id === zoneId);
            if (zone) {
                handleZonePlantSelection(zone);
            }
        };

        (window as any).selectZone = (zoneId: string) => {
            onSelectItem(zoneId, 'zones');
        };

        (window as any).selectPipe = (pipeId: string) => {
            onSelectItem(pipeId, 'pipes');
        };

        (window as any).selectPlant = (plantId: string) => {
            onSelectItem(plantId, 'plants');
        };

        (window as any).editPlant = (plantId: string) => {
            const plant = data.plants.find((p) => p.id === plantId);
            if (plant) {
                onPlantEdit(plant);
            }
        };

        (window as any).createPlantConnection = (plantId: string) => {
            handleCreatePlantConnection(plantId);
        };

        (window as any).startRealTimeBranchEdit = (pipeId: string) => {
            const subMainPipe = data.subMainPipes.find((sm) => sm.id === pipeId);
            if (subMainPipe) {
                onStartRealTimeBranchEdit(subMainPipe);
            }
        };

        (window as any).segmentedPipeDeletion = (branchPipeId: string) => {
            onSegmentedPipeDeletion(branchPipeId);
        };
    }, [map, data, highlightedPipes, isCreatingConnection, connectionStartPlant, tempConnectionLine, editMode, onPlantEdit, onConnectToPipe, onConnectToPlant, onSelectItem, onPlantDragStart, onPlantDragEnd, onStartRealTimeBranchEdit, onSegmentedPipeDeletion, isDragging, dragTarget, handleZonePlantSelection, handleCreatePlantConnection, clearOverlays, t]);

    useEffect(() => {
        return () => {
            clearOverlays();
        };
    }, [clearOverlays]);

    return null;
};

const extractCoordinatesFromLayer = (layer: any): Coordinate[] => {
    if (!layer) return [];

    try {
        if (layer.getLatLngs) {
            const latlngs = layer.getLatLngs();
            if (Array.isArray(latlngs)) {
                return latlngs.map((latlng: any) => ({
                    lat: latlng.lat,
                    lng: latlng.lng,
                }));
            }
        }

        if (layer.getLatLng) {
            const latlng = layer.getLatLng();
            return [{ lat: latlng.lat, lng: latlng.lng }];
        }

        return [];
    } catch (error) {
        console.error('Error extracting coordinates from layer:', error);
        return [];
    }
};
