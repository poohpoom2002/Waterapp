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
const DistanceMeasurement: React.FC<DistanceMeasurementProps> = ({
    map,
    isActive,
    editMode,
}) => {
    const [startPoint, setStartPoint] = useState<Coordinate | null>(null);
    const [currentDistance, setCurrentDistance] = useState<number>(0);
    const [mousePosition, setMousePosition] = useState<Coordinate | null>(null);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

    // คำนวณระยะทางระหว่างสองจุด
    const calculateDistance = (point1: Coordinate, point2: Coordinate): number => {
        const R = 6371000; // รัศมีโลกเป็นเมตร
        const dLat = (point2.lat - point1.lat) * Math.PI / 180;
        const dLng = (point2.lng - point1.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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
                    lng: e.latLng.lng()
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
        const mouseMoveListener = google.maps.event.addListener(map, 'mousemove', (e: google.maps.MapMouseEvent) => {
            if (startPoint && e.latLng) {
                const currentPoint = {
                    lat: e.latLng.lat(),
                    lng: e.latLng.lng()
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
                            pixelOffset: new google.maps.Size(0, -10)
                        });
                        infoWindow.open(map);
                        infoWindowRef.current = infoWindow;
                    }
                }
            }
        });
        listeners.push(mouseMoveListener);

        return () => {
            listeners.forEach(listener => {
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
}

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
                    strokeColor: '#3B82F6',
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

const HorticultureDrawingManager: React.FC<HorticultureDrawingManagerProps> = ({
    map,
    editMode,
    onCreated,
    fillColor,
    strokeColor,
    isEditModeEnabled = false,
}) => {
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
    const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
    
    // ตรวจสอบว่าควรแสดงการวัดระยะหรือไม่
    const shouldShowDistanceMeasurement = editMode === 'mainArea' || editMode === 'zone' || editMode === 'exclusion' || editMode === 'mainPipe' || editMode === 'subMainPipe';

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
                    const coordinates = extractCoordinatesFromShape(polygon);
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
                        const coordinates = extractCoordinatesFromShape(rectangle);
                        if (coordinates.length > 0) {
                            onCreated(coordinates, 'rectangle');
                        }
                        rectangle.setMap(null);
                    }
                )
            );

            listeners.push(
                drawingManager.addListener('circlecomplete', (circle: google.maps.Circle) => {
                    const coordinates = extractCoordinatesFromShape(circle);
                    if (coordinates.length > 0) {
                        onCreated(coordinates, 'circle');
                    }
                    circle.setMap(null);
                })
            );

            listeners.push(
                drawingManager.addListener('polylinecomplete', (polyline: google.maps.Polyline) => {
                    const coordinates = extractCoordinatesFromShape(polyline);
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
    }, [map, editMode, onCreated, fillColor, strokeColor, isEditModeEnabled]);

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
