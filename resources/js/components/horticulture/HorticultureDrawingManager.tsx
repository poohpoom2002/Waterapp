/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/horticulture/HorticultureDrawingManager.tsx
import React, { useEffect, useRef, useState } from 'react';

interface Coordinate {
    lat: number;
    lng: number;
}

interface DistanceMeasurementProps {
    map: google.maps.Map | null | undefined;
    isActive: boolean;
    editMode: string | null;
}

// Component แสดงระยะทางระหว่างการวาด
const DistanceMeasurement: React.FC<DistanceMeasurementProps> = ({ map, isActive, editMode }) => {
    const [startPoint, setStartPoint] = useState<Coordinate | null>(null);
    const [currentDistance, setCurrentDistance] = useState<number>(0);
    const [mousePosition, setMousePosition] = useState<Coordinate | null>(null);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

    // คำนวณระยะทางระหว่างสองจุด
    const calculateDistance = (point1: Coordinate, point2: Coordinate): number => {
        const R = 6371000; // รัศมีโลกเป็นเมตร
        const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
        const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((point1.lat * Math.PI) / 180) *
                Math.cos((point2.lat * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // ฟอร์แมตระยะทาง
    const formatDistance = (meters: number): string => {
        if (meters < 1000) {
            return `${meters.toFixed(1)} ม.`;
        } else {
            return `${(meters / 1000).toFixed(2)} กม.`;
        }
    };

    useEffect(() => {
        if (!map || !isActive || !editMode) {
            // ล้าง InfoWindow เมื่อไม่ active
            if (infoWindowRef.current) {
                infoWindowRef.current.close();
                infoWindowRef.current = null;
            }
            setStartPoint(null);
            setCurrentDistance(0);
            setMousePosition(null);
            return;
        }

        const listeners: google.maps.MapsEventListener[] = [];

        // ฟังการคลิกแรกเพื่อเริ่มวัดระยะ - ใช้ DOM event listener แทน
        const handleMapClick = (e: google.maps.MapMouseEvent) => {
            if (e.latLng && !startPoint) {
                const clickedPoint = {
                    lat: e.latLng.lat(),
                    lng: e.latLng.lng(),
                };

                // จุดแรก - เริ่มวัดระยะ
                setStartPoint(clickedPoint);
            }
        };

        // ใช้ Google Maps event listener แต่มี priority ก่อน
        const clickListener = google.maps.event.addListener(map, 'click', handleMapClick);
        listeners.push(clickListener);

        // ฟังการ double click เพื่อจบการวัด
        const dblClickListener = map.addListener('dblclick', (e: google.maps.MapMouseEvent) => {
            if (startPoint) {
                setStartPoint(null);
                setCurrentDistance(0);
                setMousePosition(null);
                if (infoWindowRef.current) {
                    infoWindowRef.current.close();
                    infoWindowRef.current = null;
                }
            }
        });
        listeners.push(dblClickListener);

        // ฟังการเคลื่อนไหวของเมาส์
        const mouseMoveListener = google.maps.event.addListener(
            map,
            'mousemove',
            (e: google.maps.MapMouseEvent) => {
                if (startPoint && e.latLng) {
                    const currentPoint = {
                        lat: e.latLng.lat(),
                        lng: e.latLng.lng(),
                    };

                    const distance = calculateDistance(startPoint, currentPoint);
                    setCurrentDistance(distance);
                    setMousePosition(currentPoint);

                    // สร้างหรืออัพเดท InfoWindow
                    if (distance > 0) {
                        const content = `
                        <div style="
                            background: rgba(0,0,0,0.85); 
                            color: white; 
                            padding: 8px 12px; 
                            border-radius: 6px; 
                            font-size: 14px; 
                            font-weight: bold;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            border: 1px solid rgba(255,255,255,0.2);
                            text-align: center;
                            min-width: 60px;
                        ">
                            ${formatDistance(distance)}
                            <div style="
                                font-size: 10px; 
                                color: rgba(255,255,255,0.8); 
                                margin-top: 2px;
                            ">ระยะทาง</div>
                        </div>
                    `;

                        if (infoWindowRef.current) {
                            // อัพเดท InfoWindow ที่มีอยู่
                            infoWindowRef.current.setContent(content);
                            infoWindowRef.current.setPosition(e.latLng);
                        } else {
                            // สร้าง InfoWindow ใหม่
                            const infoWindow = new google.maps.InfoWindow({
                                content,
                                position: e.latLng,
                                disableAutoPan: true,
                                pixelOffset: new google.maps.Size(0, -10),
                            });
                            infoWindow.open(map);
                            infoWindowRef.current = infoWindow;
                        }
                    }
                }
            }
        );
        listeners.push(mouseMoveListener);

        return () => {
            listeners.forEach((listener) => {
                if (listener) {
                    google.maps.event.removeListener(listener);
                }
            });

            if (infoWindowRef.current) {
                infoWindowRef.current.close();
                infoWindowRef.current = null;
            }
        };
    }, [map, isActive, editMode, startPoint]);

    return null;
};

interface HorticultureDrawingManagerProps {
    map?: google.maps.Map;
    editMode: string | null;
    onCreated: (coordinates: Coordinate[], shapeType: string) => void;
    fillColor?: string;
    strokeColor?: string;
    isEditModeEnabled?: boolean;
    mainArea?: Coordinate[]; // เพิ่ม mainArea prop
    pump?: Coordinate | null; // เพิ่ม pump prop
    mainPipes?: any[]; // เพิ่ม mainPipes prop
    subMainPipes?: any[]; // เพิ่ม subMainPipes prop
    onMainPipesUpdate?: (updatedMainPipes: any[]) => void; // เพิ่ม callback สำหรับอัพเดท mainPipes
}

// ฟังก์ชัน snap จุดเข้ากับตำแหน่งปั๊ม
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

// ฟังก์ชัน snap จุดเข้ากับปลายท่อเมนหลัก
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

// ฟังก์ชัน snap จุดเข้ากับเส้นท่อเมนรอง
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

// ฟังก์ชัน snap จุดเข้ากับขอบพื้นที่หลัก
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

// ฟังก์ชันหาจุดที่ใกล้ที่สุดบนเส้นตรง
const findClosestPointOnLineSegment = (
    point: Coordinate,
    lineStart: Coordinate,
    lineEnd: Coordinate
): Coordinate => {
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
        return lineStart;
    }

    const param = dot / lenSq;

    if (param < 0) {
        return lineStart;
    } else if (param > 1) {
        return lineEnd;
    }

    return {
        lat: lineStart.lat + param * C,
        lng: lineStart.lng + param * D,
    };
};

// ฟังก์ชันคำนวณระยะทางระหว่างสองจุด
const calculateDistanceBetweenPoints = (point1: Coordinate, point2: Coordinate): number => {
    const R = 6371000; // รัศมีโลกเป็นเมตร
    const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
    const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((point1.lat * Math.PI) / 180) *
            Math.cos((point2.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// ฟังก์ชันคำนวณความยาวท่อ
const calculatePipeLength = (coordinates: Coordinate[]): number => {
    if (coordinates.length < 2) {
        return 0;
    }

    let totalLength = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
        totalLength += calculateDistanceBetweenPoints(coordinates[i], coordinates[i + 1]);
    }

    return totalLength;
};

// ฟังก์ชัน snap coordinates ทั้งหมด
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

    if (snappedCount > 0) {
        console.log(
            `🔗 Snapped ${snappedCount}/${coordinates.length} points to main area boundary`
        );
    }

    return snappedCoordinates;
};

// ฟังก์ชัน debug เพื่อแสดงข้อมูลเส้นขอบ
const debugMainAreaBoundaries = (mainArea: Coordinate[]): void => {
    if (!mainArea || mainArea.length < 3) {
        console.log('❌ Invalid main area for debugging');
        return;
    }

    console.log('🔍 Main Area Boundaries Debug:');
    for (let i = 0; i < mainArea.length; i++) {
        const start = mainArea[i];
        const end = mainArea[(i + 1) % mainArea.length];
        const edgeLength = calculateDistanceBetweenPoints(start, end);

        // ตรวจสอบว่าเป็นเส้นแนวตั้งหรือแนวนอน
        const latDiff = Math.abs(end.lat - start.lat);
        const lngDiff = Math.abs(end.lng - start.lng);
        const isVertical = latDiff > lngDiff * 10; // ถ้าความแตกต่างของ lat มากกว่า lng มาก
        const isHorizontal = lngDiff > latDiff * 10; // ถ้าความแตกต่างของ lng มากกว่า lat มาก

        let edgeType = 'Diagonal';
        if (isVertical) edgeType = 'Vertical';
        else if (isHorizontal) edgeType = 'Horizontal';

        console.log(`  Edge ${i}: ${edgeType} - Length: ${edgeLength.toFixed(2)}m`);
        console.log(`    Start: (${start.lat.toFixed(6)}, ${start.lng.toFixed(6)})`);
        console.log(`    End: (${end.lat.toFixed(6)}, ${end.lng.toFixed(6)})`);
    }
};

// ฟังก์ชัน snap แบบ advanced ที่มีความแม่นยำมากขึ้น
const advancedSnapToMainArea = (
    coordinates: Coordinate[],
    mainArea: Coordinate[]
): Coordinate[] => {
    if (!mainArea || mainArea.length < 3) {
        return coordinates;
    }

    // Debug: แสดงข้อมูลเส้นขอบ
    debugMainAreaBoundaries(mainArea);

    // หาเส้นขอบที่ยาวที่สุดของพื้นที่หลัก (มักจะเป็นขอบที่สำคัญ)
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

    console.log(`🎯 Longest edge: ${longestEdgeIndex} - Length: ${longestEdge.toFixed(2)}m`);

    // Snap coordinates ที่ใกล้กับเส้นขอบที่ยาวที่สุด
    const snappedCoordinates = coordinates.map((coord, coordIndex) => {
        console.log(
            `\n📍 Processing coordinate ${coordIndex}: (${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)})`
        );

        if (longestEdgeStart && longestEdgeEnd) {
            const distanceToLongestEdge = calculateDistanceBetweenPoints(
                coord,
                findClosestPointOnLineSegment(coord, longestEdgeStart, longestEdgeEnd)
            );

            // ถ้าใกล้กับเส้นขอบที่ยาวที่สุด ให้ snap ด้วย threshold ที่เข้มงวดกว่า
            if (distanceToLongestEdge <= 3) {
                // 3 เมตรสำหรับเส้นขอบหลัก
                const snappedPoint = findClosestPointOnLineSegment(
                    coord,
                    longestEdgeStart,
                    longestEdgeEnd
                );
                console.log(
                    `🎯 Advanced snap to longest edge: ${distanceToLongestEdge.toFixed(2)}m`
                );
                return snappedPoint;
            }
        }

        // Snap ปกติกับทุกเส้นขอบ
        return snapPointToMainAreaBoundary(coord, mainArea, 5);
    });

    // แสดง visual feedback
    const originalCount = coordinates.length;
    const snappedCount = snappedCoordinates.filter(
        (coord, index) =>
            coord.lat !== coordinates[index].lat || coord.lng !== coordinates[index].lng
    ).length;

    if (snappedCount > 0) {
        console.log(`🎯 Advanced snap completed: ${snappedCount}/${originalCount} points snapped`);
        // แสดง notification ถ้ามี
        if (typeof window !== 'undefined' && (window as any).showSnapNotification) {
            (window as any).showSnapNotification(
                `${snappedCount} จุดถูก snap เข้ากับขอบพื้นที่หลัก`
            );
        }
    } else {
        console.log(`❌ No points were snapped`);
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
            return google.maps.drawing.OverlayType.POLYGON;
        case 'mainPipe':
        case 'subMainPipe':
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
            return [
                google.maps.drawing.OverlayType.POLYGON,
                google.maps.drawing.OverlayType.RECTANGLE,
                google.maps.drawing.OverlayType.CIRCLE,
            ];
        case 'mainPipe':
        case 'subMainPipe':
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
        case 'mainPipe':
            return {
                polylineOptions: {
                    strokeColor: '#FF0000', // เปลี่ยนเป็นสีแดง
                    strokeWeight: 6,
                    strokeOpacity: 0.9,
                    editable: true,
                    draggable: true,
                },
            };
        case 'subMainPipe':
            return {
                polylineOptions: {
                    strokeColor: '#8B5CF6',
                    strokeWeight: 5,
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

// ฟังก์ชัน snap แบบ advanced สำหรับท่อเมนหลัก
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

// ฟังก์ชัน snap แบบ advanced สำหรับท่อเมนรอง
const snapSubMainPipeCoordinates = (
    coordinates: Coordinate[],
    mainPipes: any[],
    mainArea: Coordinate[]
): Coordinate[] => {
    if (coordinates.length === 0) {
        return coordinates;
    }

    const snappedCoordinates = [...coordinates];

    if (mainArea && mainArea.length > 0) {
        for (let i = 1; i < snappedCoordinates.length; i++) {
            snappedCoordinates[i] = snapPointToMainAreaBoundary(snappedCoordinates[i], mainArea, 5);
        }
    }

    return snappedCoordinates;
};

// ฟังก์ชันใหม่: ตรวจสอบและ snap ปลายท่อเมนหลักเข้ากับท่อเมนรอง
const snapMainPipeEndToSubMainPipe = (
    mainPipes: any[],
    subMainPipeCoordinates: Coordinate[]
): { mainPipes: any[]; snapped: boolean } => {
    if (
        !mainPipes ||
        mainPipes.length === 0 ||
        !subMainPipeCoordinates ||
        subMainPipeCoordinates.length === 0
    ) {
        return { mainPipes, snapped: false };
    }

    let hasSnapped = false;
    const updatedMainPipes = mainPipes.map((mainPipe) => {
        if (!mainPipe.coordinates || mainPipe.coordinates.length === 0) {
            return mainPipe;
        }

        const mainPipeEnd = mainPipe.coordinates[mainPipe.coordinates.length - 1];

        let closestPoint = mainPipeEnd;
        let minDistance = Infinity;
        let closestSubMainPointIndex = -1;

        for (let i = 0; i < subMainPipeCoordinates.length; i++) {
            const subMainPoint = subMainPipeCoordinates[i];
            const distance = calculateDistanceBetweenPoints(mainPipeEnd, subMainPoint);

            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = subMainPoint;
                closestSubMainPointIndex = i;
            }
        }

        for (let i = 0; i < subMainPipeCoordinates.length - 1; i++) {
            const lineStart = subMainPipeCoordinates[i];
            const lineEnd = subMainPipeCoordinates[i + 1];

            const closestPointOnLine = findClosestPointOnLineSegment(
                mainPipeEnd,
                lineStart,
                lineEnd
            );
            const distanceToLine = calculateDistanceBetweenPoints(mainPipeEnd, closestPointOnLine);

            if (distanceToLine < minDistance) {
                minDistance = distanceToLine;
                closestPoint = closestPointOnLine;
                closestSubMainPointIndex = i;
            }
        }

        if (minDistance <= 5) {
            const updatedCoordinates = [...mainPipe.coordinates];
            updatedCoordinates[updatedCoordinates.length - 1] = closestPoint;

            hasSnapped = true;

            return {
                ...mainPipe,
                coordinates: updatedCoordinates,
                length: calculatePipeLength(updatedCoordinates),
            };
        }

        return mainPipe;
    });

    return { mainPipes: updatedMainPipes, snapped: hasSnapped };
};

const HorticultureDrawingManager: React.FC<HorticultureDrawingManagerProps> = ({
    map,
    editMode,
    onCreated,
    fillColor,
    strokeColor,
    isEditModeEnabled = false,
    mainArea = [], // เพิ่ม mainArea prop
    pump = null, // เพิ่ม pump prop
    mainPipes = [], // เพิ่ม mainPipes prop
    subMainPipes = [], // เพิ่ม subMainPipes prop
    onMainPipesUpdate, // เพิ่ม callback
}) => {
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
    const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);

    const shouldShowDistanceMeasurement =
        editMode === 'mainArea' ||
        editMode === 'zone' ||
        editMode === 'exclusion' ||
        editMode === 'mainPipe' ||
        editMode === 'subMainPipe';

    useEffect(() => {
        if (!map || !window.google?.maps?.drawing || isEditModeEnabled) {
            if (drawingManagerRef.current) {
                drawingManagerRef.current.setMap(null);
                drawingManagerRef.current = null;
            }
            return;
        }

        const drawingMode = getDrawingMode(editMode);
        const drawingModes = getDrawingModes(editMode);
        const shapeOptions = getShapeOptions(editMode, fillColor, strokeColor);

        if (drawingManagerRef.current) {
            drawingManagerRef.current.setMap(null);
        }

        if (!drawingMode || drawingModes.length === 0) {
            return;
        }

        try {
            const drawingManager = new google.maps.drawing.DrawingManager({
                drawingMode: drawingMode,
                drawingControl: true,
                drawingControlOptions: {
                    position: google.maps.ControlPosition.BOTTOM_CENTER,
                    drawingModes: drawingModes,
                },
                ...shapeOptions,
            });

            drawingManager.setMap(map);
            drawingManagerRef.current = drawingManager;
            setIsDrawingEnabled(true);

            const listeners: google.maps.MapsEventListener[] = [];

            listeners.push(
                drawingManager.addListener('polygoncomplete', (polygon: google.maps.Polygon) => {
                    let coordinates = extractCoordinatesFromShape(polygon);

                    // Snap coordinates ถ้าเป็นโซนและมีพื้นที่หลัก
                    if (editMode === 'zone' && mainArea.length > 0) {
                        coordinates = advancedSnapToMainArea(coordinates, mainArea);
                        console.log('🔗 Snapped zone coordinates to main area boundary');
                    }

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

                        // Snap coordinates ถ้าเป็นโซนและมีพื้นที่หลัก
                        if (editMode === 'zone' && mainArea.length > 0) {
                            coordinates = advancedSnapToMainArea(coordinates, mainArea);
                            console.log('🔗 Snapped zone coordinates to main area boundary');
                        }

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

                    // Snap coordinates ถ้าเป็นโซนและมีพื้นที่หลัก
                    if (editMode === 'zone' && mainArea.length > 0) {
                        coordinates = advancedSnapToMainArea(coordinates, mainArea);
                        console.log('🔗 Snapped zone coordinates to main area boundary');
                    }

                    if (coordinates.length > 0) {
                        onCreated(coordinates, 'circle');
                    }
                    circle.setMap(null);
                })
            );

            listeners.push(
                drawingManager.addListener('polylinecomplete', (polyline: google.maps.Polyline) => {
                    let coordinates = extractCoordinatesFromShape(polyline);

                    // Snap coordinates ตามประเภทท่อ
                    if (editMode === 'mainPipe') {
                        coordinates = snapMainPipeCoordinates(
                            coordinates,
                            pump,
                            mainArea,
                            subMainPipes
                        );
                    } else if (editMode === 'subMainPipe') {
                        coordinates = snapSubMainPipeCoordinates(coordinates, mainPipes, mainArea);
                    }

                    if (coordinates.length > 0) {
                        onCreated(coordinates, 'polyline');
                    }
                    polyline.setMap(null);
                })
            );

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
    }, [
        map,
        editMode,
        onCreated,
        fillColor,
        strokeColor,
        isEditModeEnabled,
        mainArea,
        pump,
        mainPipes,
        subMainPipes,
    ]);

    useEffect(() => {
        return () => {
            if (drawingManagerRef.current) {
                drawingManagerRef.current.setMap(null);
                drawingManagerRef.current = null;
            }
        };
    }, []);

    return null;
};

export default HorticultureDrawingManager;
