/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Coordinate {
    lat: number;
    lng: number;
}

interface ControlPoint {
    id: string;
    position: Coordinate;
    type: 'anchor' | 'control';
    index: number;
    parentIndex?: number; // For control points, which anchor they belong to
}

interface CurvedPipe {
    id: string;
    anchorPoints: Coordinate[];
    controlPoints: ControlPoint[];
    smoothedPath: Coordinate[];
    type: 'mainPipe' | 'subMainPipe';
}

interface CurvedPipeDrawingManagerProps {
    map?: google.maps.Map;
    isActive: boolean;
    pipeType: 'mainPipe' | 'subMainPipe';
    onPipeComplete: (coordinates: Coordinate[], pipeType: string) => void;
    onCancel?: () => void;
    strokeColor?: string;
    strokeWeight?: number;
}

// ฟังก์ชันสำหรับสร้าง Bezier curve
const createBezierCurve = (
    start: Coordinate,
    control1: Coordinate,
    control2: Coordinate,
    end: Coordinate,
    segments: number = 50
): Coordinate[] => {
    const points: Coordinate[] = [];
    
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const invT = 1 - t;
        
        const lat = 
            invT * invT * invT * start.lat +
            3 * invT * invT * t * control1.lat +
            3 * invT * t * t * control2.lat +
            t * t * t * end.lat;
            
        const lng = 
            invT * invT * invT * start.lng +
            3 * invT * invT * t * control1.lng +
            3 * invT * t * t * control2.lng +
            t * t * t * end.lng;
            
        points.push({ lat, lng });
    }
    
    return points;
};

// ฟังก์ชันสำหรับสร้าง smooth curve ผ่านหลาย anchor points
const createSmoothCurve = (anchorPoints: Coordinate[], segments: number = 30): Coordinate[] => {
    if (anchorPoints.length < 2) return anchorPoints;
    if (anchorPoints.length === 2) {
        // สำหรับ 2 จุด ใช้เส้นตรง
        const points: Coordinate[] = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const lat = anchorPoints[0].lat + t * (anchorPoints[1].lat - anchorPoints[0].lat);
            const lng = anchorPoints[0].lng + t * (anchorPoints[1].lng - anchorPoints[0].lng);
            points.push({ lat, lng });
        }
        return points;
    }
    
    // สำหรับ 3 จุดขึ้นไป ใช้ Catmull-Rom spline
    const allPoints: Coordinate[] = [];
    
    for (let i = 0; i < anchorPoints.length - 1; i++) {
        const p0 = i === 0 ? anchorPoints[0] : anchorPoints[i - 1];
        const p1 = anchorPoints[i];
        const p2 = anchorPoints[i + 1];
        const p3 = i === anchorPoints.length - 2 ? anchorPoints[i + 1] : anchorPoints[i + 2];
        
        const segmentPoints = createCatmullRomSegment(p0, p1, p2, p3, segments);
        
        if (i === 0) {
            allPoints.push(...segmentPoints);
        } else {
            allPoints.push(...segmentPoints.slice(1)); // ข้าม point แรกเพื่อไม่ให้ซ้ำ
        }
    }
    
    // ตรวจสอบให้แน่ใจว่าจุดแรกและจุดสุดท้ายตรงกับ anchor points อย่างสมบูรณ์
    if (allPoints.length > 0) {
        allPoints[0] = { lat: anchorPoints[0].lat, lng: anchorPoints[0].lng }; // รักษาจุดแรก
        allPoints[allPoints.length - 1] = { lat: anchorPoints[anchorPoints.length - 1].lat, lng: anchorPoints[anchorPoints.length - 1].lng }; // รักษาจุดสุดท้าย
    }
    
    return allPoints;
};

// ฟังก์ชันสำหรับสร้าง Catmull-Rom spline segment
const createCatmullRomSegment = (
    p0: Coordinate,
    p1: Coordinate,
    p2: Coordinate,
    p3: Coordinate,
    segments: number
): Coordinate[] => {
    const points: Coordinate[] = [];
    
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const t2 = t * t;
        const t3 = t2 * t;
        
        const lat = 0.5 * (
            (2 * p1.lat) +
            (-p0.lat + p2.lat) * t +
            (2 * p0.lat - 5 * p1.lat + 4 * p2.lat - p3.lat) * t2 +
            (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lat) * t3
        );
        
        const lng = 0.5 * (
            (2 * p1.lng) +
            (-p0.lng + p2.lng) * t +
            (2 * p0.lng - 5 * p1.lng + 4 * p2.lng - p3.lng) * t2 +
            (-p0.lng + 3 * p1.lng - 3 * p2.lng + p3.lng) * t3
        );
        
        points.push({ lat, lng });
    }
    
    return points;
};

// ฟังก์ชันคำนวณระยะห่างระหว่างจุด
const calculateDistance = (point1: Coordinate, point2: Coordinate): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

// ฟังก์ชันสร้าง control point ที่ตำแหน่งที่เหมาะสม
const generateControlPoint = (
    prev: Coordinate,
    current: Coordinate,
    next: Coordinate,
    tension: number = 0.3
): Coordinate => {
    const deltaLat = next.lat - prev.lat;
    const deltaLng = next.lng - prev.lng;
    
    return {
        lat: current.lat + deltaLat * tension,
        lng: current.lng + deltaLng * tension
    };
};

const CurvedPipeDrawingManager: React.FC<CurvedPipeDrawingManagerProps> = ({
    map,
    isActive,
    pipeType,
    onPipeComplete,
    onCancel,
    strokeColor = '#2563eb',
    strokeWeight = 4
}) => {
    const [anchorPoints, setAnchorPoints] = useState<Coordinate[]>([]);
    const [previewPath, setPreviewPath] = useState<Coordinate[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentMousePosition, setCurrentMousePosition] = useState<Coordinate | null>(null);
    
    const previewPolylineRef = useRef<google.maps.Polyline | null>(null);
    const anchorMarkersRef = useRef<google.maps.Marker[]>([]);
    const mouseListenerRef = useRef<google.maps.MapsEventListener | null>(null);
    const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
    const rightClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

    // ฟังก์ชันสร้าง anchor marker
    const createAnchorMarker = useCallback((position: Coordinate, index: number): google.maps.Marker => {
        if (!map) throw new Error('Map not available');
        
        const isEndPoint = index === 0 || index === anchorPoints.length - 1;
        
        const marker = new google.maps.Marker({
            position: { lat: position.lat, lng: position.lng },
            map,
            draggable: !isEndPoint, // จุดปลายท่อไม่สามารถลากได้
            clickable: !isEndPoint, // จุดปลายท่อไม่สามารถคลิกได้
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#ef4444', // จุดควบคุมสีแดง
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
            },
            title: isEndPoint ? `ปลายท่อ ${index === 0 ? 'เริ่มต้น' : 'สิ้นสุด'} (ไม่สามารถลากได้)` : `จุดควบคุม ${index + 1}`,
            zIndex: 1000
        });

        // เพิ่ม drag listener
        marker.addListener('dragstart', () => {
            if (isEndPoint) {
                // ป้องกันการลากจุดปลายท่อตั้งแต่ต้น
                marker.setDraggable(false);
            }
        });

        marker.addListener('dragend', () => {
            const newPosition = marker.getPosition();
            
            if (newPosition && !isEndPoint) { // ไม่ให้ขยับจุดปลายท่อ
                setAnchorPoints(prev => {
                    const updatedPoints = [...prev];
                    updatedPoints[index] = {
                        lat: newPosition.lat(),
                        lng: newPosition.lng()
                    };
                    
                    // รักษาตำแหน่งจุดปลายท่อให้คงที่
                    if (updatedPoints.length > 0) {
                        const originalFirst = { lat: anchorPoints[0].lat, lng: anchorPoints[0].lng };
                        const originalLast = { 
                            lat: anchorPoints[anchorPoints.length - 1].lat, 
                            lng: anchorPoints[anchorPoints.length - 1].lng 
                        };
                        
                        updatedPoints[0] = originalFirst;
                        updatedPoints[updatedPoints.length - 1] = originalLast;
                    }
                    
                    return updatedPoints;
                });
            } else if (newPosition && isEndPoint) {
                // ถ้าเป็นจุดปลายท่อ ให้กลับไปตำแหน่งเดิม
                marker.setPosition({ lat: position.lat, lng: position.lng });
            }
        });

        return marker;
    }, [map, anchorPoints.length]);

    // Effect สำหรับอัปเดต preview path
    useEffect(() => {
        if (anchorPoints.length === 0) {
            setPreviewPath([]);
            return;
        }

        const pathPoints = [...anchorPoints];
        if (currentMousePosition && isDrawing) {
            pathPoints.push(currentMousePosition);
        }

        if (pathPoints.length >= 2) {
            // ใช้ฟังก์ชันที่รักษาตำแหน่งปลายท่อ
            const smoothPath = createSmoothCurve(pathPoints, 40);
            setPreviewPath(smoothPath);
        } else {
            setPreviewPath(pathPoints);
        }
    }, [anchorPoints, currentMousePosition, isDrawing]);

    // Effect สำหรับเริ่ม/หยุดการวาด
    useEffect(() => {
        if (isActive && !isDrawing) {
            setIsDrawing(true);
            setAnchorPoints([]);
            setPreviewPath([]);

            if (!map) return;

            // เพิ่ม mouse move listener
            mouseListenerRef.current = map.addListener('mousemove', (event: google.maps.MapMouseEvent) => {
                if (event.latLng) {
                    const mousePos = {
                        lat: event.latLng.lat(),
                        lng: event.latLng.lng()
                    };
                    setCurrentMousePosition(mousePos);
                }
            });

            // เพิ่ม click listener สำหรับเพิ่มจุด
            clickListenerRef.current = map.addListener('click', (event: google.maps.MapMouseEvent) => {
                if (event.latLng) {
                    const newPoint = {
                        lat: event.latLng.lat(),
                        lng: event.latLng.lng()
                    };

                    setAnchorPoints(prev => {
                        const newAnchorPoints = [...prev, newPoint];
                        // สร้าง marker สำหรับจุดใหม่
                        if (map) {
                            const isEndPoint = newAnchorPoints.length === 1 || newAnchorPoints.length === 2; // จุดแรกและจุดที่สอง (เริ่มต้นและสิ้นสุด)
                            const marker = new google.maps.Marker({
                                position: { lat: newPoint.lat, lng: newPoint.lng },
                                map,
                                draggable: !isEndPoint, // จุดปลายท่อไม่สามารถลากได้
                                clickable: !isEndPoint, // จุดปลายท่อไม่สามารถคลิกได้
                                icon: {
                                    path: google.maps.SymbolPath.CIRCLE,
                                    scale: 8,
                                    fillColor: '#ef4444', // จุดควบคุมสีแดง
                                    fillOpacity: 1,
                                    strokeColor: '#ffffff',
                                    strokeWeight: 2,
                                },
                                title: isEndPoint ? `ปลายท่อ ${newAnchorPoints.length === 1 ? 'เริ่มต้น' : 'สิ้นสุด'} (ไม่สามารถลากได้)` : `จุดควบคุม ${newAnchorPoints.length}`,
                                zIndex: 1000
                            });

                            // เพิ่ม drag listener
                            const markerIndex = newAnchorPoints.length - 1;

                            marker.addListener('dragstart', () => {
                                if (isEndPoint) {
                                    // ป้องกันการลากจุดปลายท่อตั้งแต่ต้น
                                    marker.setDraggable(false);
                                }
                            });

                            marker.addListener('dragend', () => {
                                const newPosition = marker.getPosition();
                                
                                if (newPosition && !isEndPoint) { // ไม่ให้ขยับจุดปลายท่อ
                                    setAnchorPoints(current => {
                                        const updatedPoints = [...current];
                                        updatedPoints[markerIndex] = {
                                            lat: newPosition.lat(),
                                            lng: newPosition.lng()
                                        };
                                        
                                        // รักษาตำแหน่งจุดปลายท่อให้คงที่
                                        if (updatedPoints.length > 0) {
                                            const originalFirst = { lat: current[0].lat, lng: current[0].lng };
                                            const originalLast = { 
                                                lat: current[current.length - 1].lat, 
                                                lng: current[current.length - 1].lng 
                                            };
                                            
                                            updatedPoints[0] = originalFirst;
                                            updatedPoints[updatedPoints.length - 1] = originalLast;
                                        }
                                        
                                        return updatedPoints;
                                    });
                                } else if (newPosition && isEndPoint) {
                                    // ถ้าเป็นจุดปลายท่อ ให้กลับไปตำแหน่งเดิม
                                    marker.setPosition({ lat: newPoint.lat, lng: newPoint.lng });
                                }
                            });

                            anchorMarkersRef.current.push(marker);
                        }
                        return newAnchorPoints;
                    });
                }
            });

            // เพิ่ม right click listener สำหรับจบการวาด
            rightClickListenerRef.current = map.addListener('rightclick', () => {
                setAnchorPoints(prev => {
                    if (prev.length >= 2) {
                        // ใช้ฟังก์ชันที่รักษาตำแหน่งปลายท่อ
                        const finalPath = createSmoothCurve(prev, 50);
                        onPipeComplete(finalPath, pipeType);
                    }
                    return [];
                });
                
                setIsDrawing(false);
                setPreviewPath([]);
                setCurrentMousePosition(null);

                // ล้าง markers
                anchorMarkersRef.current.forEach(marker => marker.setMap(null));
                anchorMarkersRef.current = [];

                // ล้าง listeners
                if (mouseListenerRef.current) {
                    google.maps.event.removeListener(mouseListenerRef.current);
                    mouseListenerRef.current = null;
                }
                if (clickListenerRef.current) {
                    google.maps.event.removeListener(clickListenerRef.current);
                    clickListenerRef.current = null;
                }
                if (rightClickListenerRef.current) {
                    google.maps.event.removeListener(rightClickListenerRef.current);
                    rightClickListenerRef.current = null;
                }
            });

        } else if (!isActive && isDrawing) {
            setIsDrawing(false);
            setAnchorPoints([]);
            setPreviewPath([]);
            setCurrentMousePosition(null);

            // ล้าง markers
            anchorMarkersRef.current.forEach(marker => marker.setMap(null));
            anchorMarkersRef.current = [];

            // ล้าง listeners
            if (mouseListenerRef.current) {
                google.maps.event.removeListener(mouseListenerRef.current);
                mouseListenerRef.current = null;
            }
            if (clickListenerRef.current) {
                google.maps.event.removeListener(clickListenerRef.current);
                clickListenerRef.current = null;
            }
            if (rightClickListenerRef.current) {
                google.maps.event.removeListener(rightClickListenerRef.current);
                rightClickListenerRef.current = null;
            }

            if (onCancel) {
                onCancel();
            }
        }
    }, [isActive, isDrawing, map, pipeType, onPipeComplete, onCancel]);

    // Effect สำหรับอัปเดต preview polyline
    useEffect(() => {
        if (!map) return;

        // ล้าง polyline เก่า
        if (previewPolylineRef.current) {
            previewPolylineRef.current.setMap(null);
        }

        // สร้าง polyline ใหม่ถ้ามี path
        if (previewPath.length >= 2) {
            // กำหนดสีตามประเภทท่อ
            let pipeColor = strokeColor;
            if (pipeType === 'mainPipe') {
                pipeColor = '#FF0000'; // สีแดงสำหรับท่อเมน
            } else if (pipeType === 'subMainPipe') {
                pipeColor = '#8B5CF6'; // สีม่วงสำหรับท่อเมนรอง
            }

            previewPolylineRef.current = new google.maps.Polyline({
                path: previewPath.map(point => ({ lat: point.lat, lng: point.lng })),
                geodesic: true,
                strokeColor: pipeColor,
                strokeOpacity: 0.8,
                strokeWeight: strokeWeight,
                map: map,
                zIndex: 999
            });
        }

        return () => {
            if (previewPolylineRef.current) {
                previewPolylineRef.current.setMap(null);
                previewPolylineRef.current = null;
            }
        };
    }, [map, previewPath, strokeColor, strokeWeight]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // ล้าง markers
            anchorMarkersRef.current.forEach(marker => marker.setMap(null));
            anchorMarkersRef.current = [];

            // ล้าง listeners
            if (mouseListenerRef.current) {
                google.maps.event.removeListener(mouseListenerRef.current);
                mouseListenerRef.current = null;
            }
            if (clickListenerRef.current) {
                google.maps.event.removeListener(clickListenerRef.current);
                clickListenerRef.current = null;
            }
            if (rightClickListenerRef.current) {
                google.maps.event.removeListener(rightClickListenerRef.current);
                rightClickListenerRef.current = null;
            }

            if (previewPolylineRef.current) {
                previewPolylineRef.current.setMap(null);
            }
        };
    }, []);

    return null;
};

export default CurvedPipeDrawingManager;
