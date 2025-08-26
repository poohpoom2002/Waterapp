/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Coordinate {
    lat: number;
    lng: number;
}

interface EditablePipe {
    id: string;
    coordinates: Coordinate[];
    type: 'mainPipe' | 'subMainPipe';
    anchorPoints: Coordinate[];
    isEditing: boolean;
}

interface CurvedPipeEditorProps {
    map?: google.maps.Map;
    pipes: EditablePipe[];
    onPipeUpdate: (pipeId: string, newCoordinates: Coordinate[]) => void;
    onEditingChange: (pipeId: string, isEditing: boolean) => void;
    strokeColor?: string;
    strokeWeight?: number;
    editMode?: boolean;
}

const createSmoothCurve = (anchorPoints: Coordinate[], segments: number = 30): Coordinate[] => {
    if (anchorPoints.length < 2) return anchorPoints;
    if (anchorPoints.length === 2) {
        const points: Coordinate[] = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const lat = anchorPoints[0].lat + t * (anchorPoints[1].lat - anchorPoints[0].lat);
            const lng = anchorPoints[0].lng + t * (anchorPoints[1].lng - anchorPoints[0].lng);
            points.push({ lat, lng });
        }
        return points;
    }
    
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
            allPoints.push(...segmentPoints.slice(1));
        }
    }
    
    return allPoints;
};

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

const extractAnchorPoints = (coordinates: Coordinate[], maxPoints: number = 8): Coordinate[] => {
    if (coordinates.length <= maxPoints) {
        return coordinates;
    }
    const anchorPoints: Coordinate[] = [];
    const step = Math.floor(coordinates.length / (maxPoints - 1));
    anchorPoints.push(coordinates[0]);
    for (let i = step; i < coordinates.length - step; i += step) {
        anchorPoints.push(coordinates[i]);
    }
    anchorPoints.push(coordinates[coordinates.length - 1]);
    
    return anchorPoints;
};

const createSmoothCurvePreservingEnds = (anchorPoints: Coordinate[], segments: number = 30): Coordinate[] => {
    if (anchorPoints.length < 2) return anchorPoints;
    if (anchorPoints.length === 2) {
        const points: Coordinate[] = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const lat = anchorPoints[0].lat + t * (anchorPoints[1].lat - anchorPoints[0].lat);
            const lng = anchorPoints[0].lng + t * (anchorPoints[1].lng - anchorPoints[0].lng);
            points.push({ lat, lng });
        }
        return points;
    }
    
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
            allPoints.push(...segmentPoints.slice(1));
        }
    }
    
    if (allPoints.length > 0) {
        const originalFirst = { lat: anchorPoints[0].lat, lng: anchorPoints[0].lng };
        const originalLast = { lat: anchorPoints[anchorPoints.length - 1].lat, lng: anchorPoints[anchorPoints.length - 1].lng };
        
        allPoints[0] = originalFirst;
        allPoints[allPoints.length - 1] = originalLast;
    }
    
    return allPoints;
};

const CurvedPipeEditor: React.FC<CurvedPipeEditorProps> = ({
    map,
    pipes,
    onPipeUpdate,
    onEditingChange,
    strokeColor = '#2563eb',
    strokeWeight = 4,
    editMode = false
}) => {
    const polylineRefs = useRef<Map<string, google.maps.Polyline>>(new Map());
    const anchorMarkerRefs = useRef<Map<string, google.maps.Marker[]>>(new Map());
    const originalEndPointsRef = useRef<Map<string, { first: Coordinate, last: Coordinate }>>(new Map());
    const [editingPipeId, setEditingPipeId] = useState<string | null>(null);

    const createAnchorMarker = useCallback((
        position: Coordinate, 
        pipeId: string, 
        index: number
    ): google.maps.Marker => {
        if (!map) throw new Error('Map not available');
        
        const pipe = pipes.find(p => p.id === pipeId);
        const isEndPoint = pipe && (index === 0 || index === pipe.anchorPoints.length - 1);
        
        const marker = new google.maps.Marker({
            position: { lat: position.lat, lng: position.lng },
            map,
            draggable: !isEndPoint,
            clickable: !isEndPoint,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: '#ef4444',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
            },
            title: isEndPoint ? `ปลายท่อ ${index === 0 ? 'เริ่มต้น' : 'สิ้นสุด'} (ไม่สามารถลากได้)` : `จุดควบคุม ${index + 1}`,
            zIndex: 1001,
            visible: editMode
        });

        marker.addListener('dragstart', () => {
            if (isEndPoint) {
                marker.setDraggable(false);
            }
        });

        marker.addListener('dragend', () => {
            const newPosition = marker.getPosition();
            
            if (newPosition && !isEndPoint) {
                const pipe = pipes.find(p => p.id === pipeId);
                if (pipe) {
                    const updatedAnchorPoints = [...pipe.anchorPoints];
                    updatedAnchorPoints[index] = {
                        lat: newPosition.lat(),
                        lng: newPosition.lng()
                    };
                    
                    if (updatedAnchorPoints.length > 0) {
                        const originalEndPoints = originalEndPointsRef.current.get(pipeId);
                        const originalFirst = originalEndPoints?.first || { lat: pipe.anchorPoints[0].lat, lng: pipe.anchorPoints[0].lng };
                        const originalLast = originalEndPoints?.last || { 
                            lat: pipe.anchorPoints[pipe.anchorPoints.length - 1].lat, 
                            lng: pipe.anchorPoints[pipe.anchorPoints.length - 1].lng 
                        };
                        
                        if (!originalEndPoints) {
                            originalEndPointsRef.current.set(pipeId, { first: originalFirst, last: originalLast });
                        }
                        
                        updatedAnchorPoints[0] = originalFirst;
                        updatedAnchorPoints[updatedAnchorPoints.length - 1] = originalLast;
                    }
                    
                    const newCoordinates = createSmoothCurvePreservingEnds(updatedAnchorPoints, 50);
                    onPipeUpdate(pipeId, newCoordinates);
                }
            } else if (newPosition && isEndPoint) {
                marker.setPosition({ lat: position.lat, lng: position.lng });
            }
        });

        marker.addListener('dblclick', () => {
            const pipe = pipes.find(p => p.id === pipeId);
            if (pipe && pipe.anchorPoints.length > 2 && !isEndPoint) {
                const updatedAnchorPoints = pipe.anchorPoints.filter((_, i) => i !== index);
                const newCoordinates = createSmoothCurvePreservingEnds(updatedAnchorPoints, 50);
                onPipeUpdate(pipeId, newCoordinates);
            }
        });

        return marker;
    }, [map, pipes, onPipeUpdate, editMode]);

    const createPolyline = useCallback((pipe: EditablePipe): google.maps.Polyline => {
        if (!map) throw new Error('Map not available');
        
        // กำหนดสีตามประเภทท่อ
        let pipeColor = strokeColor;
        if (!pipe.isEditing) {
            if (pipe.type === 'mainPipe') {
                pipeColor = '#FF0000'; // สีแดงสำหรับท่อเมน
            } else if (pipe.type === 'subMainPipe') {
                pipeColor = '#8B5CF6'; // สีม่วงสำหรับท่อเมนรอง
            }
        }

        const polyline = new google.maps.Polyline({
            path: pipe.coordinates.map(coord => ({ lat: coord.lat, lng: coord.lng })),
            geodesic: true,
            strokeColor: pipe.isEditing ? '#ef4444' : pipeColor,
            strokeOpacity: pipe.isEditing ? 1 : 0.8,
            strokeWeight: pipe.isEditing ? strokeWeight + 2 : strokeWeight,
            map: map,
            zIndex: pipe.isEditing ? 1000 : 999,
            clickable: true
        });

        polyline.addListener('click', (event: google.maps.MapMouseEvent) => {
            if (editMode && event.latLng) {
                togglePipeEditing(pipe.id);
            }
        });

        polyline.addListener('rightclick', (event: google.maps.MapMouseEvent) => {
            if (editMode && pipe.isEditing && event.latLng) {
                const newPoint = {
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng()
                };
                
                const insertIndex = findBestInsertPosition(newPoint, pipe.anchorPoints);
                const updatedAnchorPoints = [...pipe.anchorPoints];
                updatedAnchorPoints.splice(insertIndex, 0, newPoint);
                
                const newCoordinates = createSmoothCurvePreservingEnds(updatedAnchorPoints, 50);
                onPipeUpdate(pipe.id, newCoordinates);
            }
        });

        return polyline;
    }, [map, strokeColor, strokeWeight, editMode, onPipeUpdate]);

    const findBestInsertPosition = (newPoint: Coordinate, anchorPoints: Coordinate[]): number => {
        let minDistance = Infinity;
        let bestIndex = 1;
        
        for (let i = 1; i < anchorPoints.length - 1; i++) {
            const distance = distanceFromPointToLineSegment(
                newPoint,
                anchorPoints[i],
                anchorPoints[i + 1]
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                bestIndex = i + 1;
            }
        }
        
        if (anchorPoints.length <= 2) {
            return 1;
        }
        
        return bestIndex;
    };

    const distanceFromPointToLineSegment = (
        point: Coordinate,
        lineStart: Coordinate,
        lineEnd: Coordinate
    ): number => {
        const A = point.lat - lineStart.lat;
        const B = point.lng - lineStart.lng;
        const C = lineEnd.lat - lineStart.lat;
        const D = lineEnd.lng - lineStart.lng;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;
        if (param < 0) {
            xx = lineStart.lat;
            yy = lineStart.lng;
        } else if (param > 1) {
            xx = lineEnd.lat;
            yy = lineEnd.lng;
        } else {
            xx = lineStart.lat + param * C;
            yy = lineStart.lng + param * D;
        }

        const dx = point.lat - xx;
        const dy = point.lng - yy;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const togglePipeEditing = useCallback((pipeId: string) => {
        const pipe = pipes.find(p => p.id === pipeId);
        if (!pipe) return;

        const newEditingState = !pipe.isEditing;
        
        if (newEditingState) {
            setEditingPipeId(pipeId);
            pipes.forEach(p => {
                if (p.id !== pipeId && p.isEditing) {
                    onEditingChange(p.id, false);
                }
            });
        } else {
            setEditingPipeId(null);
            originalEndPointsRef.current.delete(pipeId);
        }
        
        onEditingChange(pipeId, newEditingState);
    }, [pipes, onEditingChange]);

    const updatePolylines = useCallback(() => {
        if (!map) return;

        polylineRefs.current.forEach(polyline => polyline.setMap(null));
        polylineRefs.current.clear();

        pipes.forEach(pipe => {
            const polyline = createPolyline(pipe);
            polylineRefs.current.set(pipe.id, polyline);
            
            if (pipe.isEditing && editMode) {
                const markers = anchorMarkerRefs.current.get(pipe.id);
                if (markers) {
                    markers.forEach((marker, index) => {
                        const isEndPoint = index === 0 || index === pipe.anchorPoints.length - 1;
                        if (isEndPoint) {
                            const originalEndPoints = originalEndPointsRef.current.get(pipe.id);
                            let originalPoint: Coordinate;
                            
                            if (originalEndPoints) {
                                originalPoint = index === 0 ? originalEndPoints.first : originalEndPoints.last;
                            } else {
                                originalPoint = pipe.anchorPoints[index];
                                if (!originalEndPointsRef.current.has(pipe.id)) {
                                    originalEndPointsRef.current.set(pipe.id, {
                                        first: pipe.anchorPoints[0],
                                        last: pipe.anchorPoints[pipe.anchorPoints.length - 1]
                                    });
                                }
                            }
                            
                            marker.setPosition({ lat: originalPoint.lat, lng: originalPoint.lng });
                            marker.setDraggable(false);
                        }
                    });
                }
            }
        });
    }, [map, pipes, createPolyline, editMode]);

    const updateAnchorMarkers = useCallback(() => {
        if (!map) return;
        anchorMarkerRefs.current.forEach(markers => {
            markers.forEach(marker => marker.setMap(null));
        });
        anchorMarkerRefs.current.clear();
        pipes.forEach(pipe => {
            if (pipe.isEditing && editMode) {
                const markers = pipe.anchorPoints.map((point, index) => {
                    const marker = createAnchorMarker(point, pipe.id, index);
                    const isEndPoint = index === 0 || index === pipe.anchorPoints.length - 1;
                    if (isEndPoint) {
                        const originalEndPoints = originalEndPointsRef.current.get(pipe.id);
                        let originalPoint: Coordinate;
                        
                        if (originalEndPoints) {
                            originalPoint = index === 0 ? originalEndPoints.first : originalEndPoints.last;
                        } else {
                            originalPoint = point;
                            if (!originalEndPointsRef.current.has(pipe.id)) {
                                originalEndPointsRef.current.set(pipe.id, {
                                    first: pipe.anchorPoints[0],
                                    last: pipe.anchorPoints[pipe.anchorPoints.length - 1]
                                });
                            }
                        }
                        
                        marker.setPosition({ lat: originalPoint.lat, lng: originalPoint.lng });
                        marker.setDraggable(false);
                        marker.setClickable(false);
                    }
                    return marker;
                });
                anchorMarkerRefs.current.set(pipe.id, markers);
            }
        });
    }, [map, pipes, createAnchorMarker, editMode]);

    useEffect(() => {
        updatePolylines();
    }, [updatePolylines]);

    useEffect(() => {
        updateAnchorMarkers();
    }, [updateAnchorMarkers]);

    useEffect(() => {
        anchorMarkerRefs.current.forEach(markers => {
            markers.forEach(marker => marker.setVisible(editMode));
        });
    }, [editMode]);

    useEffect(() => {
        return () => {
            polylineRefs.current.forEach(polyline => polyline.setMap(null));
            anchorMarkerRefs.current.forEach(markers => {
                markers.forEach(marker => marker.setMap(null));
            });
        };
    }, []);

    return null;
};

export default CurvedPipeEditor;
