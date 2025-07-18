// components/horticulture/HorticultureDrawingManager.tsx
import React, { useEffect, useRef, useState } from 'react';

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
                    position: google.maps.ControlPosition.TOP_CENTER,
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
                        console.log('✅ Polygon created with', coordinates.length, 'points');
                    }
                    polygon.setMap(null);
                })
            );

            listeners.push(
                drawingManager.addListener('rectanglecomplete', (rectangle: google.maps.Rectangle) => {
                    const coordinates = extractCoordinatesFromShape(rectangle);
                    if (coordinates.length > 0) {
                        onCreated(coordinates, 'rectangle');
                        console.log('✅ Rectangle created with', coordinates.length, 'points');
                    }
                    rectangle.setMap(null);
                })
            );

            listeners.push(
                drawingManager.addListener('circlecomplete', (circle: google.maps.Circle) => {
                    const coordinates = extractCoordinatesFromShape(circle);
                    if (coordinates.length > 0) {
                        onCreated(coordinates, 'circle');
                        console.log('✅ Circle created with', coordinates.length, 'points');
                    }
                    circle.setMap(null);
                })
            );

            listeners.push(
                drawingManager.addListener('polylinecomplete', (polyline: google.maps.Polyline) => {
                    const coordinates = extractCoordinatesFromShape(polyline);
                    if (coordinates.length > 0) {
                        onCreated(coordinates, 'polyline');
                        console.log('✅ Polyline created with', coordinates.length, 'points');
                    }
                    polyline.setMap(null);
                })
            );

            return () => {
                listeners.forEach(listener => {
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