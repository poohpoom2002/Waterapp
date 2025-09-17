/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';
import CurvedPipeDrawingManager from './CurvedPipeDrawingManager';
import CurvedPipeControlPanel from './CurvedPipeControlPanel';
import {
    snapMainPipeEndToSubMainPipe as utilsSnapMainPipeEndToSubMainPipe,
    findClosestPointOnLineSegment as utilsFindClosestPointOnLineSegment,
    calculateDistanceBetweenPoints as utilsCalculateDistanceBetweenPoints,
    calculatePipeLength as utilsCalculatePipeLength,
} from '../../utils/horticultureUtils';

interface Coordinate {
    lat: number;
    lng: number;
}



interface HorticultureDrawingManagerProps {
    map?: google.maps.Map;
    editMode: string | null;
    onCreated: (coordinates: Coordinate[], shapeType: string) => void;
    fillColor?: string;
    strokeColor?: string;
    isEditModeEnabled?: boolean;
    mainArea?: Coordinate[];
    pump?: Coordinate | null;
    mainPipes?: any[];
    subMainPipes?: any[];
    onMainPipesUpdate?: (updatedMainPipes: any[]) => void;
    enableCurvedDrawing?: boolean;
    t?: (key: string) => string;
    onMainPipeClick?: (pipeId: string, clickPosition: Coordinate) => void;
    onLateralPipeClick?: (event: google.maps.MapMouseEvent) => void;
    onLateralPipeMouseMove?: (event: google.maps.MapMouseEvent) => void;
}

    const snapPointToPump = (
        point: Coordinate,
        pumpPosition: Coordinate | null,
        snapThreshold: number = 10
    ): Coordinate => {
        if (!pumpPosition) {
            return point;
        }

        const distance = calculateDistanceBetweenPoints(point, pumpPosition);

        if (distance <= snapThreshold) {
            return pumpPosition;
        }

        return point;
    };

    const snapPointToMainPipeEnd = (
        point: Coordinate,
        mainPipes: any[],
        snapThreshold: number = 5
    ): Coordinate => {
        if (!mainPipes || mainPipes.length === 0) {
            return point;
        }

        let closestPoint = point;
        let minDistance = Infinity;
        let closestPipeId = '';

        for (const mainPipe of mainPipes) {
            if (!mainPipe.coordinates || mainPipe.coordinates.length === 0) {
                continue;
            }

            const pipeEnd = mainPipe.coordinates[mainPipe.coordinates.length - 1];
            const distance = calculateDistanceBetweenPoints(point, pipeEnd);

            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = pipeEnd;
                closestPipeId = mainPipe.id;
            }
        }

        if (minDistance <= snapThreshold) {
            return closestPoint;
        }

        return point;
    };

    const snapPointToSubMainPipe = (
        point: Coordinate,
        subMainPipes: any[],
        snapThreshold: number = 5
    ): Coordinate => {
        if (!subMainPipes || subMainPipes.length === 0) {
            return point;
        }

        let closestPoint = point;
        let minDistance = Infinity;
        let closestPipeId = '';

        for (const subMainPipe of subMainPipes) {
            if (!subMainPipe.coordinates || subMainPipe.coordinates.length < 2) {
                continue;
            }

            for (let i = 0; i < subMainPipe.coordinates.length - 1; i++) {
                const start = subMainPipe.coordinates[i];
                const end = subMainPipe.coordinates[i + 1];
                
                const closestPointOnSegment = findClosestPointOnLineSegment(point, start, end);
                const distance = calculateDistanceBetweenPoints(point, closestPointOnSegment);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = closestPointOnSegment;
                    closestPipeId = subMainPipe.id;
                }
            }
        }

        if (minDistance <= snapThreshold) {
            return closestPoint;
        }

        return point;
    };

    const snapPointToMainAreaBoundary = (
        point: Coordinate,
        mainArea: Coordinate[],
        snapThreshold: number = 5
    ): Coordinate => {
        if (!mainArea || mainArea.length < 3) {
            return point;
        }

        let closestPoint = point;
        let minDistance = Infinity;
        let snappedEdgeIndex = -1;

        for (let i = 0; i < mainArea.length; i++) {
            const start = mainArea[i];
            const end = mainArea[(i + 1) % mainArea.length];

            const closestPointOnSegment = findClosestPointOnLineSegment(point, start, end);
            const distance = calculateDistanceBetweenPoints(point, closestPointOnSegment);

            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = closestPointOnSegment;
                snappedEdgeIndex = i;
            }
        }

        if (minDistance <= snapThreshold) {
            return closestPoint;
        }

        return point;
    };

// ใช้ฟังก์ชัน findClosestPointOnLineSegment จาก horticultureUtils.ts
const findClosestPointOnLineSegment = utilsFindClosestPointOnLineSegment;

// ใช้ฟังก์ชัน calculateDistanceBetweenPoints จาก horticultureUtils.ts
const calculateDistanceBetweenPoints = utilsCalculateDistanceBetweenPoints;

// ใช้ฟังก์ชัน calculatePipeLength จาก horticultureUtils.ts
const calculatePipeLength = utilsCalculatePipeLength;

const snapCoordinatesToMainArea = (
    coordinates: Coordinate[],
    mainArea: Coordinate[]
): Coordinate[] => {
    if (!mainArea || mainArea.length < 3) {
        return coordinates;
    }

    let snappedCount = 0;
    const snappedCoordinates = coordinates.map((coord, index) => {
        const snappedCoord = snapPointToMainAreaBoundary(coord, mainArea);
        if (snappedCoord.lat !== coord.lat || snappedCoord.lng !== coord.lng) {
            snappedCount++;
        }
        return snappedCoord;
    });

    return snappedCoordinates;
};

const debugMainAreaBoundaries = (mainArea: Coordinate[]): void => {
    if (!mainArea || mainArea.length < 3) {
        return;
    }

    for (let i = 0; i < mainArea.length; i++) {
        const start = mainArea[i];
        const end = mainArea[(i + 1) % mainArea.length];
        const edgeLength = calculateDistanceBetweenPoints(start, end);
        
        const latDiff = Math.abs(end.lat - start.lat);
        const lngDiff = Math.abs(end.lng - start.lng);
        const isVertical = latDiff > lngDiff * 10; 
        const isHorizontal = lngDiff > latDiff * 10; 
        
        let edgeType = 'Diagonal';
        if (isVertical) edgeType = 'Vertical';
        else if (isHorizontal) edgeType = 'Horizontal';
    }
};

const advancedSnapToMainArea = (
    coordinates: Coordinate[],
    mainArea: Coordinate[]
): Coordinate[] => {
    if (!mainArea || mainArea.length < 3) {
        return coordinates;
    }
    debugMainAreaBoundaries(mainArea);

    let longestEdge = 0;
    let longestEdgeStart: Coordinate | null = null;
    let longestEdgeEnd: Coordinate | null = null;
    let longestEdgeIndex = -1;

    for (let i = 0; i < mainArea.length; i++) {
        const start = mainArea[i];
        const end = mainArea[(i + 1) % mainArea.length];
        const edgeLength = calculateDistanceBetweenPoints(start, end);
        
        if (edgeLength > longestEdge) {
            longestEdge = edgeLength;
            longestEdgeStart = start;
            longestEdgeEnd = end;
            longestEdgeIndex = i;
        }
    }
    const snappedCoordinates = coordinates.map((coord) => {
        if (longestEdgeStart && longestEdgeEnd) {
            const distanceToLongestEdge = calculateDistanceBetweenPoints(
                coord,
                findClosestPointOnLineSegment(coord, longestEdgeStart, longestEdgeEnd)
            );
            
            if (distanceToLongestEdge <= 3) { 
                const snappedPoint = findClosestPointOnLineSegment(coord, longestEdgeStart, longestEdgeEnd);
                return snappedPoint;
            }
        }

        return snapPointToMainAreaBoundary(coord, mainArea, 5);
    });

    const originalCount = coordinates.length;
    const snappedCount = snappedCoordinates.filter((coord, index) => 
        coord.lat !== coordinates[index].lat || coord.lng !== coordinates[index].lng
    ).length;

    if (snappedCount > 0) {
        if (typeof window !== 'undefined' && (window as any).showSnapNotification) {
            (window as any).showSnapNotification(`${snappedCount} points snapped to main area boundary`);
        }
    }

    return snappedCoordinates;
};

const extractCoordinatesFromShape = (shape: any): Coordinate[] => {
    try {
        let coordinates: Coordinate[] = [];

        if (shape instanceof google.maps.Rectangle) {
            const bounds = shape.getBounds();
            if (bounds) {
                const ne = bounds.getNorthEast();
                const sw = bounds.getSouthWest();
                coordinates = [
                    { lat: sw.lat(), lng: sw.lng() },
                    { lat: ne.lat(), lng: sw.lng() },
                    { lat: ne.lat(), lng: ne.lng() },
                    { lat: sw.lat(), lng: ne.lng() },
                ];
            }
        } else if (shape instanceof google.maps.Circle) {
            const center = shape.getCenter();
            const radius = shape.getRadius();
            const points = 32;

            if (center) {
                for (let i = 0; i < points; i++) {
                    const angle = (i * 360) / points;
                    const rad = (angle * Math.PI) / 180;
                    const latOffset = (radius / 111320) * Math.cos(rad);
                    const lngOffset =
                        (radius / (111320 * Math.cos((center.lat() * Math.PI) / 180))) *
                        Math.sin(rad);

                    coordinates.push({
                        lat: center.lat() + latOffset,
                        lng: center.lng() + lngOffset,
                    });
                }
            }
        } else if (shape instanceof google.maps.Polygon) {
            const path = shape.getPath();
            if (path) {
                for (let i = 0; i < path.getLength(); i++) {
                    const latLng = path.getAt(i);
                    coordinates.push({ lat: latLng.lat(), lng: latLng.lng() });
                }
            }
        } else if (shape instanceof google.maps.Polyline) {
            const path = shape.getPath();
            if (path) {
                for (let i = 0; i < path.getLength(); i++) {
                    const latLng = path.getAt(i);
                    coordinates.push({ lat: latLng.lat(), lng: latLng.lng() });
                }
            }
        }

        return coordinates;
    } catch (error) {
        console.error('Error extracting coordinates:', error);
        return [];
    }
};

const getDrawingMode = (editMode: string | null): google.maps.drawing.OverlayType | null => {
    switch (editMode) {
        case 'mainArea':
        case 'zone':
        case 'exclusion':
        case 'plantArea':
        case 'manualZone':
            return google.maps.drawing.OverlayType.POLYGON;
        case 'mainPipe':
        case 'subMainPipe':
        case 'lateralPipe':
            return google.maps.drawing.OverlayType.POLYLINE;
        default:
            return null;
    }
};

const getDrawingModes = (editMode: string | null): google.maps.drawing.OverlayType[] => {
    switch (editMode) {
        case 'mainArea':
        case 'zone':
        case 'exclusion':
        case 'plantArea':
        case 'manualZone':
            return [
                google.maps.drawing.OverlayType.POLYGON,
                google.maps.drawing.OverlayType.RECTANGLE,
                google.maps.drawing.OverlayType.CIRCLE,
            ];
        case 'mainPipe':
        case 'subMainPipe':
        case 'lateralPipe':
            return [google.maps.drawing.OverlayType.POLYLINE];
        default:
            return [];
    }
};

const getShapeOptions = (editMode: string | null, fillColor?: string, strokeColor?: string) => {
    const defaultColor = fillColor || '#4ECDC4';
    const defaultStroke = strokeColor || '#4ECDC4';

    const baseOptions = {
        fillColor: defaultColor,
        fillOpacity: 0.3,
        strokeColor: defaultStroke,
        strokeOpacity: 1,
        strokeWeight: 2,
        editable: true,
        draggable: true,
    };

    switch (editMode) {
        case 'mainArea':
            return {
                polygonOptions: { ...baseOptions, fillColor: '#22C55E', strokeColor: '#22C55E' },
                rectangleOptions: { ...baseOptions, fillColor: '#22C55E', strokeColor: '#22C55E' },
                circleOptions: { ...baseOptions, fillColor: '#22C55E', strokeColor: '#22C55E' },
            };
        case 'zone':
            return {
                polygonOptions: baseOptions,
                rectangleOptions: baseOptions,
                circleOptions: baseOptions,
            };
        case 'exclusion':
            return {
                polygonOptions: { ...baseOptions, fillColor: '#F59E0B', strokeColor: '#F59E0B' },
                rectangleOptions: { ...baseOptions, fillColor: '#F59E0B', strokeColor: '#F59E0B' },
                circleOptions: { ...baseOptions, fillColor: '#F59E0B', strokeColor: '#F59E0B' },
            };
        case 'plantArea':
            return {
                polygonOptions: { ...baseOptions, fillColor: '#8B5CF6', strokeColor: '#8B5CF6' },
                rectangleOptions: { ...baseOptions, fillColor: '#8B5CF6', strokeColor: '#8B5CF6' },
                circleOptions: { ...baseOptions, fillColor: '#8B5CF6', strokeColor: '#8B5CF6' },
            };
        case 'manualZone':
            return {
                polygonOptions: { ...baseOptions, fillColor: '#3B82F6', strokeColor: '#3B82F6' },
                rectangleOptions: { ...baseOptions, fillColor: '#3B82F6', strokeColor: '#3B82F6' },
                circleOptions: { ...baseOptions, fillColor: '#3B82F6', strokeColor: '#3B82F6' },
            };
        case 'mainPipe':
            return {
                polylineOptions: {
                    strokeColor: '#FF0000',
                    strokeWeight: 2,
                    strokeOpacity: 0.9,
                    editable: true,
                    draggable: true,
                },
            };
        case 'subMainPipe':
            return {
                polylineOptions: {
                    strokeColor: '#8B5CF6',
                    strokeWeight: 3,
                    strokeOpacity: 0.9,
                    editable: true,
                    draggable: true,
                },
            };
        case 'lateralPipe':
            return {
                polylineOptions: {
                    strokeColor: '#FFD700',
                    strokeWeight: 2,
                    strokeOpacity: 0.9,
                    editable: true,
                    draggable: true,
                },
            };
        default:
            return {
                polygonOptions: baseOptions,
                rectangleOptions: baseOptions,
                circleOptions: baseOptions,
                polylineOptions: {
                    strokeColor: defaultStroke,
                    strokeWeight: 3,
                    strokeOpacity: 0.9,
                    editable: true,
                    draggable: true,
                },
            };
    }
};

    const snapMainPipeCoordinates = (
        coordinates: Coordinate[],
        pumpPosition: Coordinate | null,
        mainArea: Coordinate[],
        subMainPipes: any[] = []
    ): Coordinate[] => {
        if (coordinates.length === 0) {
            return coordinates;
        }

        const snappedCoordinates = [...coordinates];
        if (pumpPosition) {
            snappedCoordinates[0] = snapPointToPump(coordinates[0], pumpPosition);
        }

        return snappedCoordinates;
    };

    const snapSubMainPipeCoordinates = (
        coordinates: Coordinate[],
        mainPipes: any[],
        mainArea: Coordinate[]
    ): Coordinate[] => {
        // 🚫 ปิดการ snap ท่อ sub main ทั้งหมด - ห้ามขยับท่อ sub main!
        // ให้คืนค่า coordinates เดิมโดยไม่มีการแก้ไขใดๆ
        return coordinates;
    };

    // ฟังก์ชันใหม่สำหรับ snap ไปยังท่อเมน
    const snapPointToMainPipe = (
        point: Coordinate,
        mainPipes: any[],
        snapThreshold: number = 10
    ): Coordinate => {
        if (!mainPipes || mainPipes.length === 0) {
            return point;
        }

        let closestPoint = point;
        let minDistance = Infinity;
        let closestPipeId = '';

        for (const mainPipe of mainPipes) {
            if (!mainPipe.coordinates || mainPipe.coordinates.length < 2) {
                continue;
            }

            // ตรวจสอบทุกส่วนของท่อเมน
            for (let i = 0; i < mainPipe.coordinates.length - 1; i++) {
                const start = mainPipe.coordinates[i];
                const end = mainPipe.coordinates[i + 1];
                
                const closestPointOnSegment = findClosestPointOnLineSegment(point, start, end);
                const distance = calculateDistanceBetweenPoints(point, closestPointOnSegment);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = closestPointOnSegment;
                    closestPipeId = mainPipe.id;
                }
            }
        }

        if (minDistance <= snapThreshold) {
            return closestPoint;
        }

        return point;
    };

    // ใช้ฟังก์ชัน snap จาก horticultureUtils.ts แทนฟังก์ชันเดิม
    const snapMainPipeEndToSubMainPipe = utilsSnapMainPipeEndToSubMainPipe;



const HorticultureDrawingManager: React.FC<HorticultureDrawingManagerProps> = ({
    map,
    editMode,
    onCreated,
    fillColor,
    strokeColor,
    isEditModeEnabled = false,
    mainArea = [], 
    pump = null, 
    mainPipes = [], 
    subMainPipes = [], 
    onMainPipesUpdate,
    enableCurvedDrawing = false,
    t = (key: string) => key,
    onMainPipeClick,
    onLateralPipeClick,
    onLateralPipeMouseMove,
}) => {
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
    const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
    const [showCurvedPipePanel, setShowCurvedPipePanel] = useState(false);
    const [isCurvedDrawingActive, setIsCurvedDrawingActive] = useState(false);
    const [anchorPointsCount, setAnchorPointsCount] = useState(0);
    const [showGuides, setShowGuides] = useState(true);
    


    useEffect(() => {

        
        if (!map || !window.google?.maps?.drawing) {
            if (drawingManagerRef.current) {
                drawingManagerRef.current.setMap(null);
                drawingManagerRef.current = null;
            }
            return;
        }

        if (isEditModeEnabled && !editMode && editMode !== 'manualZone') {
            if (drawingManagerRef.current) {
                drawingManagerRef.current.setMap(null);
                drawingManagerRef.current = null;
            }
            return;
        }


        const drawingModes = getDrawingModes(editMode);
        const shapeOptions = getShapeOptions(editMode, fillColor, strokeColor);



        if (drawingManagerRef.current) {
            drawingManagerRef.current.setMap(null);
        }

        if (drawingModes.length === 0) {
            return;
        }


        try {
            // ตั้งค่า default drawing mode ตาม editMode
            const defaultDrawingMode = getDrawingMode(editMode);
            
            const drawingManager = new google.maps.drawing.DrawingManager({
                drawingMode: defaultDrawingMode, 
                drawingControl: true,
                drawingControlOptions: {
                    position: google.maps.ControlPosition.BOTTOM_CENTER,
                    drawingModes: drawingModes,
                },
                polygonOptions: {
                    ...shapeOptions.polygonOptions,
                    clickable: false,
                    editable: true,
                    draggable: true,
                },
                rectangleOptions: {
                    ...shapeOptions.rectangleOptions,
                    clickable: false,
                    editable: true,
                    draggable: true,
                },
                circleOptions: {
                    ...shapeOptions.circleOptions,
                    clickable: false,
                    editable: true,
                    draggable: true,
                },
            });

            drawingManager.setMap(map);
            drawingManagerRef.current = drawingManager;
            setIsDrawingEnabled(true);

            // ไม่ต้องรีเซ็ต drawing mode เป็น null แล้ว เพราะเราตั้งค่า default ไว้แล้ว
            
            drawingManager.addListener('drawingmode_changed', () => {
                const currentMode = drawingManager.getDrawingMode();
            });
            
            drawingManager.addListener('overlaycomplete', (event) => {
            });
            
            drawingManager.addListener('click', (event) => {
            });
            
            drawingManager.addListener('mousedown', (event) => {
            });
            
            drawingManager.addListener('mouseup', (event) => {
            });
            
            drawingManager.addListener('dblclick', (event) => {
            });
            
            drawingManager.addListener('rightclick', (event) => {
            });
            
            drawingManager.addListener('dragstart', (event) => {
            });
            
            drawingManager.addListener('dragend', (event) => {
            });
            
            drawingManager.addListener('drag', (event) => {
            });
            
            drawingManager.addListener('mouseover', (event) => {
            });
            
            drawingManager.addListener('mouseout', (event) => {
            });
            
            drawingManager.addListener('mousemove', (event) => {
                // จัดการ mousemove สำหรับ lateral pipe
                if (editMode === 'lateralPipe' && onLateralPipeMouseMove) {
                    onLateralPipeMouseMove(event);
                }
            });
            
            drawingManager.addListener('contextmenu', (event) => {
            });
            drawingManager.addListener('tilt_changed', (event) => {
            });

            const listeners: google.maps.MapsEventListener[] = [];

            listeners.push(
                drawingManager.addListener('polygoncomplete', (polygon: google.maps.Polygon) => {
                    let coordinates = extractCoordinatesFromShape(polygon);
                    
                    if (editMode === 'zone' && mainArea.length > 0) {
                        coordinates = advancedSnapToMainArea(coordinates, mainArea);
                    }
                    // ลบการ snap สำหรับ manualZone ออก
                    
                    if (coordinates.length > 0) {
                        onCreated(coordinates, 'polygon');
                    }
                    polygon.setMap(null);
                })
            );

            listeners.push(
                drawingManager.addListener(
                    'rectanglecomplete',
                    (rectangle: google.maps.Rectangle) => {
                        let coordinates = extractCoordinatesFromShape(rectangle);
                        
                        if (editMode === 'zone' && mainArea.length > 0) {
                            coordinates = advancedSnapToMainArea(coordinates, mainArea);
                        }
                        // ลบการ snap สำหรับ manualZone ออก
                        
                        if (coordinates.length > 0) {
                            onCreated(coordinates, 'rectangle');
                        }
                        rectangle.setMap(null);
                    }
                )
            );

            listeners.push(
                drawingManager.addListener('circlecomplete', (circle: google.maps.Circle) => {
                    let coordinates = extractCoordinatesFromShape(circle);
                    
                    if (editMode === 'zone' && mainArea.length > 0) {
                        coordinates = advancedSnapToMainArea(coordinates, mainArea);
                    }
                    // ลบการ snap สำหรับ manualZone ออก
                    
                    if (coordinates.length > 0) {
                        onCreated(coordinates, 'circle');
                    }
                    circle.setMap(null);
                })
            );

            listeners.push(
                drawingManager.addListener('polylinecomplete', (polyline: google.maps.Polyline) => {
                    let coordinates = extractCoordinatesFromShape(polyline);
                    
                    if (editMode === 'mainPipe') {
                        coordinates = snapMainPipeCoordinates(coordinates, pump, mainArea, subMainPipes);
                    } else if (editMode === 'subMainPipe') {
                        coordinates = snapSubMainPipeCoordinates(coordinates, mainPipes, mainArea);
                    } else if (editMode === 'lateralPipe') {
                        // สำหรับ lateral pipe ใช้ coordinates ที่วาดได้เลย
                        // การ snap และการจัดการจะทำใน handleLateralPipeClick
                    }
                    
                    if (coordinates.length > 0) {
                        onCreated(coordinates, 'polyline');
                    }
                    polyline.setMap(null);
                })
            );

            // เพิ่มการจัดการคลิกที่ท่อเมนเมื่ออยู่ในโหมดวาดท่อเมนรอง
            if (editMode === 'subMainPipe' && onMainPipeClick) {
                // สร้าง polyline สำหรับท่อเมนที่มีอยู่เพื่อให้สามารถคลิกได้
                mainPipes.forEach((mainPipe) => {
                    if (mainPipe.coordinates && mainPipe.coordinates.length >= 2) {
                        const mainPipePolyline = new google.maps.Polyline({
                            path: mainPipe.coordinates.map(coord => ({ lat: coord.lat, lng: coord.lng })),
                            geodesic: true,
                            strokeColor: '#FF0000',
                            strokeOpacity: 0.9,
                            strokeWeight: 2,
                            map: map,
                            clickable: true,
                            zIndex: 998
                        });

                        // เพิ่ม hover effect
                        mainPipePolyline.addListener('mouseover', () => {
                            mainPipePolyline.setOptions({
                                strokeColor: '#FF6B6B',
                                strokeWeight: 10
                            });
                        });

                        mainPipePolyline.addListener('mouseout', () => {
                            mainPipePolyline.setOptions({
                                strokeColor: '#FF0000',
                                strokeWeight: 2
                            });
                        });

                        // เพิ่ม click listener สำหรับท่อเมน
                        mainPipePolyline.addListener('click', (event: google.maps.MapMouseEvent) => {
                            if (event.latLng) {
                                const clickPosition = {
                                    lat: event.latLng.lat(),
                                    lng: event.latLng.lng()
                                };
                                onMainPipeClick(mainPipe.id, clickPosition);
                                
                                // แสดง visual feedback
                                mainPipePolyline.setOptions({
                                    strokeColor: '#00FF00',
                                    strokeWeight: 12
                                });
                                
                                setTimeout(() => {
                                    mainPipePolyline.setOptions({
                                        strokeColor: '#FF0000',
                                        strokeWeight: 3
                                    });
                                }, 500);
                            }
                        });

                        // เก็บ reference เพื่อลบภายหลัง
                        setTimeout(() => {
                            mainPipePolyline.setMap(null);
                        }, 1000);
                    }
                });
            }

            // เพิ่มการจัดการคลิกที่ท่อเมนรองเมื่ออยู่ในโหมดวาดท่อย่อย
            if (editMode === 'lateralPipe' && onLateralPipeClick) {
                // สร้าง polyline สำหรับท่อเมนรองที่มีอยู่เพื่อให้สามารถคลิกได้
                subMainPipes.forEach((subMainPipe) => {
                    if (subMainPipe.coordinates && subMainPipe.coordinates.length >= 2) {
                        const subMainPipePolyline = new google.maps.Polyline({
                            path: subMainPipe.coordinates.map(coord => ({ lat: coord.lat, lng: coord.lng })),
                            geodesic: true,
                            strokeColor: '#8B5CF6',
                            strokeOpacity: 0.9,
                            strokeWeight: 3,
                            map: map,
                            clickable: true,
                            zIndex: 998
                        });

                        // เพิ่ม hover effect
                        subMainPipePolyline.addListener('mouseover', () => {
                            subMainPipePolyline.setOptions({
                                strokeColor: '#A78BFA',
                                strokeWeight: 3
                            });
                        });

                        subMainPipePolyline.addListener('mouseout', () => {
                            subMainPipePolyline.setOptions({
                                strokeColor: '#8B5CF6',
                                strokeWeight: 3
                            });
                        });

                        // เพิ่ม click listener สำหรับท่อเมนรอง
                        subMainPipePolyline.addListener('click', (event: google.maps.MapMouseEvent) => {
                            if (event.latLng) {
                                const clickPosition = {
                                    lat: event.latLng.lat(),
                                    lng: event.latLng.lng()
                                };
                                onLateralPipeClick(event);
                                
                                // แสดง visual feedback
                                subMainPipePolyline.setOptions({
                                    strokeColor: '#00FF00',
                                    strokeWeight: 10
                                });
                                
                                setTimeout(() => {
                                    subMainPipePolyline.setOptions({
                                        strokeColor: '#8B5CF6',
                                        strokeWeight: 3
                                    });
                                }, 500);
                            }
                        });

                        // เก็บ reference เพื่อลบภายหลัง
                        setTimeout(() => {
                            subMainPipePolyline.setMap(null);
                        }, 1000);
                    }
                });


            }



            return () => {
                listeners.forEach((listener) => {
                    if (listener) {
                        google.maps.event.removeListener(listener);
                    }
                });
                

                
                if (drawingManagerRef.current) {
                    drawingManagerRef.current.setMap(null);
                    drawingManagerRef.current = null;
                }
                setIsDrawingEnabled(false);
            };
        } catch (error) {
            console.error('Error creating DrawingManager:', error);
            setIsDrawingEnabled(false);
        }
    }, [map, editMode, onCreated, fillColor, strokeColor, isEditModeEnabled, mainArea, pump, mainPipes, subMainPipes, onLateralPipeClick, onLateralPipeMouseMove]);

    // ฟังก์ชันจัดการการเริ่มต้นการวาดแบบโค้ง
    const handleStartCurvedDrawing = () => {
        setIsCurvedDrawingActive(true);
        setAnchorPointsCount(0);
        
        // ปิด regular drawing manager โดยสมบูรณ์
        if (drawingManagerRef.current) {
            try {
                drawingManagerRef.current.setDrawingMode(null);
                drawingManagerRef.current.setOptions({ drawingControl: false });
                drawingManagerRef.current.setMap(null);
                drawingManagerRef.current = null;
            } catch (e) {
                drawingManagerRef.current = null;
            }
        }
        
        // ซ่อน drawing controls บน UI
        try {
            if (map) {
                const mapDiv = map.getDiv();
                const drawingControls = mapDiv?.querySelectorAll('.gmnoprint');
                drawingControls?.forEach(control => {
                    if (control instanceof HTMLElement) {
                        control.style.display = 'none';
                    }
                });
            }
        } catch (e) {
            // ignore errors
        }
    };

    // ฟังก์ชันจัดการการจบการวาดแบบโค้ง
    const handleFinishCurvedDrawing = () => {
        setIsCurvedDrawingActive(false);
        setAnchorPointsCount(0);
    };

    // ฟังก์ชันจัดการการยกเลิกการวาดแบบโค้ง
    const handleCancelCurvedDrawing = () => {
        setIsCurvedDrawingActive(false);
        setAnchorPointsCount(0);
        setShowCurvedPipePanel(false);
    };

    // ฟังก์ชันจัดการการล้างทั้งหมด
    const handleClearAll = () => {
        setIsCurvedDrawingActive(false);
        setAnchorPointsCount(0);
    };

    // Corner rounding functionality removed as it was unused

    // ฟังก์ชันจัดการเมื่อท่อโค้งเสร็จสิ้น
    const handleCurvedPipeComplete = (coordinates: Coordinate[], pipeType: string) => {
        onCreated(coordinates, pipeType);
        setIsCurvedDrawingActive(false);
        setAnchorPointsCount(0);
        
        // Log completion info for debugging
        console.log(`PE Pipe completed: ${coordinates.length} points, type: ${pipeType}`);
    };

    // ฟังก์ชันอัปเดตจำนวนจุดควบคุม
    const handleAnchorPointsChange = (count: number) => {
        setAnchorPointsCount(count);
    };



    // Effect สำหรับแสดง control panel เมื่อเริ่มวาดท่อ
    useEffect(() => {
        if (enableCurvedDrawing && (editMode === 'mainPipe' || editMode === 'subMainPipe')) {
            setShowCurvedPipePanel(true);
            // เริ่มการวาดโค้งทันทีโดยไม่ต้องกดปุ่ม "เริ่มวาด"
            setIsCurvedDrawingActive(true);
            setAnchorPointsCount(0);
        } else {
            setShowCurvedPipePanel(false);
            setIsCurvedDrawingActive(false);
        }
    }, [enableCurvedDrawing, editMode]);

    useEffect(() => {
    }, [editMode, isEditModeEnabled]);

    useEffect(() => {
        return () => {
            if (drawingManagerRef.current) {
                try {
                    drawingManagerRef.current.setDrawingMode(null);
                    drawingManagerRef.current.setOptions({ drawingControl: false });
                    drawingManagerRef.current.setMap(null);
                } catch (e) {
                    console.log('Error cleaning up drawing manager:', e);
                }
                drawingManagerRef.current = null;
            }
        };
    }, []);

    return (
        <>
            {/* Control Panel สำหรับการวาดแบบโค้ง */}
            {enableCurvedDrawing && showCurvedPipePanel && (
                <CurvedPipeControlPanel
                    isActive={showCurvedPipePanel}
                    onFinishDrawing={handleFinishCurvedDrawing}
                    onCancelDrawing={handleCancelCurvedDrawing}
                    onClearAll={handleClearAll}
                    anchorPointsCount={anchorPointsCount}
                    showGuides={showGuides}
                    onShowGuidesChange={setShowGuides}
                    t={t}
                />
            )}

            {/* Simple Curved Pipe Drawing Manager */}
            {enableCurvedDrawing && (editMode === 'mainPipe' || editMode === 'subMainPipe') && (
                <CurvedPipeDrawingManager
                    map={map}
                    isActive={isCurvedDrawingActive}
                    pipeType={editMode as 'mainPipe' | 'subMainPipe'}
                    onPipeComplete={handleCurvedPipeComplete}
                    onCancel={handleCancelCurvedDrawing}
                    strokeColor={strokeColor}
                    strokeWeight={3}
                    showGuides={showGuides}
                    onAnchorPointsChange={setAnchorPointsCount}
                />
            )}

        </>
    );
};

export default HorticultureDrawingManager;
