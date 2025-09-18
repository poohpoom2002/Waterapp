import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import { useLanguage } from '../../contexts/LanguageContext';
import Navbar from '../../components/Navbar';
import HorticultureMapComponent from '../../components/horticulture/HorticultureMapComponent';
import HorticultureDrawingManager from '../../components/horticulture/HorticultureDrawingManager';
import EnhancedHorticultureSearchControl from '../../components/horticulture/HorticultureSearchControl';
import DistanceMeasurementOverlay from '../../components/horticulture/DistanceMeasurementOverlay';
import { getCropByValue, getTranslatedCropByValue } from './choose-crop';
import { parseCompletedSteps, toCompletedStepsCsv } from '../../utils/stepUtils';

// Lightweight env-aware logger to reduce noisy logs in production
const __DEV__ = typeof import.meta !== 'undefined' ? ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV ?? true) : (typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true);
const log = (...args: unknown[]) => { if (__DEV__) console.log(...args); };
const warn = (...args: unknown[]) => { if (__DEV__) console.warn(...args); };
const errorLog = (...args: unknown[]) => { console.error(...args); };

// Yield back to the browser between heavy batches without blocking UI
const yieldToFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

// Type guard and helper to safely detach Google Maps overlays without TS errors
const hasSetMap = (obj: unknown): obj is { setMap: (map: google.maps.Map | null) => void } => {
    return typeof obj === 'object' && obj !== null && 'setMap' in (obj as Record<string, unknown>);
};
const detachOverlay = (overlay: unknown) => { if (hasSetMap(overlay)) overlay.setMap(null); };

// Types and Interfaces
type Coordinate = { lat: number; lng: number };

interface InitialAreaProps {
    crops?: string;
    currentStep?: number;
    completedSteps?: string;
    mainArea?: string;
    obstacles?: string;
    plantPoints?: string;
    areaRai?: string;
    perimeterMeters?: string;
    rotationAngle?: string;
    rowSpacing?: string;
    plantSpacing?: string;
}

interface StepData {
    id: number;
    key: string;
    title: string;
    description: string;
    route: string;
}

interface PlantPoint {
    id: string;
    lat: number;
    lng: number;
    cropType: string;
    isValid: boolean;
}

interface Obstacle {
    id: string;
    type: 'water_source' | 'other';
    coordinates: Coordinate[];
    name?: string;
}

export default function InitialArea({ 
    crops, 
    currentStep = 1, 
    completedSteps = '',
    mainArea: mainAreaData,
    obstacles: obstaclesData,
    plantPoints: plantPointsData,
    areaRai: areaRaiData,
    perimeterMeters: perimeterMetersData,
    rotationAngle: rotationAngleData,
    rowSpacing: rowSpacingData,
    plantSpacing: plantSpacingData
}: InitialAreaProps) {
	const { t, language } = useLanguage();
    const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
    const [completed, setCompleted] = useState<number[]>([]);
    const activeStep = currentStep;

    // Map and Area States
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([13.7563, 100.5018]);
    const [mapZoom, setMapZoom] = useState<number>(16);
    const [mainArea, setMainArea] = useState<Coordinate[]>([]);
    const [areaRai, setAreaRai] = useState<number | null>(null);
    const [perimeterMeters, setPerimeterMeters] = useState<number | null>(null);
    const [isMainAreaSet, setIsMainAreaSet] = useState<boolean>(false);
    const [isEditingMainArea, setIsEditingMainArea] = useState<boolean>(false);

    // Drawing States
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [drawingManagerRef, setDrawingManagerRef] = useState<google.maps.drawing.DrawingManager | null>(null);
    const [selectedShape, setSelectedShape] = useState<string>('polygon');
    const [drawnPolygon, setDrawnPolygon] = useState<google.maps.Polygon | null>(null);

    // Plant and Obstacle States
    const [plantPoints, setPlantPoints] = useState<PlantPoint[]>([]);
    const [isGeneratingPlants, setIsGeneratingPlants] = useState<boolean>(false);
    const [obstacles, setObstacles] = useState<Obstacle[]>([]);
    const [isDrawingObstacle, setIsDrawingObstacle] = useState<boolean>(false);
    const [selectedObstacleType, setSelectedObstacleType] = useState<'water_source' | 'other'>('water_source');
    const [selectedObstacleShape, setSelectedObstacleShape] = useState<string>('polygon');
    const [obstacleOverlays, setObstacleOverlays] = useState<google.maps.Polygon[]>([]);
    const [distanceOverlaysByObstacle, setDistanceOverlaysByObstacle] = useState<Record<string, { lines: google.maps.Polyline[]; labels: google.maps.Marker[] }>>({});

    // Rotation State
    const [rotationAngle, setRotationAngle] = useState<number>(0);

    // Spacing States
    const [rowSpacing, setRowSpacing] = useState<Record<string, number>>({});
    const [plantSpacing, setPlantSpacing] = useState<Record<string, number>>({});
    const [tempRowSpacing, setTempRowSpacing] = useState<Record<string, string>>({});
    const [tempPlantSpacing, setTempPlantSpacing] = useState<Record<string, string>>({});
    const [editingRowSpacingForCrop, setEditingRowSpacingForCrop] = useState<string | null>(null);
    const [editingPlantSpacingForCrop, setEditingPlantSpacingForCrop] = useState<string | null>(null);

    // Refs for state synchronization
    const mainAreaRef = useRef<Coordinate[]>(mainArea);
    const obstaclesRef = useRef<Obstacle[]>(obstacles);
    const drawnPolygonRef = useRef<google.maps.Polygon | null>(drawnPolygon);
    const selectedObstacleTypeRef = useRef<'water_source' | 'other'>(selectedObstacleType);
    const isDrawingObstacleRef = useRef<boolean>(false);
    const obstacleOverlaysRef = useRef<google.maps.Polygon[]>([]);
    const distanceOverlaysByObstacleRef = useRef<Record<string, { lines: google.maps.Polyline[]; labels: google.maps.Marker[] }>>({});
    const drawingManagerObjRef = useRef<google.maps.drawing.DrawingManager | null>(null);

    // Refs for race condition prevention and cleanup
    const currentGenerationIdRef = useRef<number>(0);
    const plantPointMarkersRef = useRef<google.maps.Marker[]>([]);
    const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
    const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);

    // State synchronization effects
    useEffect(() => { mainAreaRef.current = mainArea; }, [mainArea]);
    useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);
    useEffect(() => { drawnPolygonRef.current = drawnPolygon; }, [drawnPolygon]);
    useEffect(() => { selectedObstacleTypeRef.current = selectedObstacleType; }, [selectedObstacleType]);
    useEffect(() => { isDrawingObstacleRef.current = isDrawingObstacle; }, [isDrawingObstacle]);
    useEffect(() => { obstacleOverlaysRef.current = obstacleOverlays; }, [obstacleOverlays]);
    useEffect(() => { distanceOverlaysByObstacleRef.current = distanceOverlaysByObstacle; }, [distanceOverlaysByObstacle]);
    useEffect(() => { drawingManagerObjRef.current = drawingManagerRef; }, [drawingManagerRef]);
    
    // Component cleanup effect
    useEffect(() => {
        const startingGenerationId = currentGenerationIdRef.current;
        return () => {
            log("Cleaning up InitialArea component...");
            
            // Cancel any pending rotation timer
            if (rotationTimerRef.current) {
                clearTimeout(rotationTimerRef.current);
                rotationTimerRef.current = null;
            }
            
            // Increment generation ID to cancel any ongoing operations using captured value
            currentGenerationIdRef.current = startingGenerationId + 1;
            
            // Remove all stored event listeners to prevent memory leaks
            listenersRef.current.forEach(listener => google.maps.event.removeListener(listener));
            listenersRef.current = [];

            // Remove all overlays from the map
            drawnPolygonRef.current?.setMap(null);
            obstacleOverlaysRef.current.forEach(overlay => overlay.setMap(null));
            
            // Clear all plant point markers
            plantPointMarkersRef.current.forEach(marker => {
                if (marker && marker.setMap) {
                    marker.setMap(null);
                }
            });
            plantPointMarkersRef.current = [];
            
            Object.values(distanceOverlaysByObstacleRef.current).forEach(({ lines, labels }) => {
                lines.forEach(l => l.setMap(null));
                labels.forEach(lb => lb.setMap(null));
            });
            drawingManagerObjRef.current?.setMap(null);
            log("Cleanup complete.");
        };
    }, []);

    // ===== UTILITY FUNCTIONS =====
    
    // Compute area and perimeter for a set of coordinates with optional holes
    const computeAreaAndPerimeter = useCallback((coordinates: Coordinate[], holes: Coordinate[][] = []) => {
        try {
            if (!window.google?.maps?.geometry?.spherical || coordinates.length < 3) {
                setAreaRai(null);
                setPerimeterMeters(null);
                return;
            }
            const latLngs = coordinates.map(c => new google.maps.LatLng(c.lat, c.lng));
            let areaSqm = google.maps.geometry.spherical.computeArea(latLngs);
            // subtract holes
            if (holes && holes.length > 0) {
                for (const hole of holes) {
                    if (hole.length >= 3) {
                        const holeLatLngs = hole.map(c => new google.maps.LatLng(c.lat, c.lng));
                        areaSqm -= google.maps.geometry.spherical.computeArea(holeLatLngs);
                    }
                }
            }
            const pathForPerimeter = [...latLngs, latLngs[0]];
            const perimeter = google.maps.geometry.spherical.computeLength(pathForPerimeter);
            setAreaRai(areaSqm > 0 ? areaSqm / 1600 : 0);
            setPerimeterMeters(perimeter);
        } catch(e) {
            errorLog("Error computing area and perimeter:", e);
            setAreaRai(null);
            setPerimeterMeters(null);
        }
    }, []);

    // Coordinate extraction functions
    const extractCoordinatesFromPolygon = useCallback((polygon: google.maps.Polygon): Coordinate[] => {
        const coordinates: Coordinate[] = [];
        const path = polygon.getPath();
        for (let i = 0; i < path.getLength(); i++) {
            const latLng = path.getAt(i);
            coordinates.push({ lat: latLng.lat(), lng: latLng.lng() });
        }
        return coordinates;
    }, []);

    const extractCoordinatesFromRectangle = useCallback((rectangle: google.maps.Rectangle): Coordinate[] => {
        const bounds = rectangle.getBounds();
        if (!bounds) return [];
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        return [
            { lat: ne.lat(), lng: ne.lng() },
            { lat: ne.lat(), lng: sw.lng() },
            { lat: sw.lat(), lng: sw.lng() },
            { lat: sw.lat(), lng: ne.lng() },
        ];
    }, []);

    const extractCoordinatesFromCircle = useCallback((circle: google.maps.Circle): Coordinate[] => {
        const center = circle.getCenter();
        const radius = circle.getRadius();
        const coordinates: Coordinate[] = [];
        if (!center) return [];
        const points = 32;
        for (let i = 0; i < points; i++) {
            const angle = (i * 2 * Math.PI) / points;
            const lat = center.lat() + (radius / 111000) * Math.cos(angle);
            const lng = center.lng() + (radius / (111000 * Math.cos((center.lat() * Math.PI) / 180))) * Math.sin(angle);
            coordinates.push({ lat, lng });
        }
        return coordinates;
    }, []);

    // Generic helpers to unify polygon operations across coordinate systems
    const pointInPolygonGeneric = useCallback(<T,>(point: T, polygon: T[], getX: (p: T) => number, getY: (p: T) => number): boolean => {
        let inside = false;
        const x = getX(point);
        const y = getY(point);
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = getX(polygon[i]);
            const yi = getY(polygon[i]);
            const xj = getX(polygon[j]);
            const yj = getY(polygon[j]);
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
        }
        return inside;
    }, []);

    const distanceToPolygonEdgeGeneric = useCallback(<T,>(point: T, polygon: T[], getX: (p: T) => number, getY: (p: T) => number): number => {
        let minDistance = Infinity;
        const px = getX(point);
        const py = getY(point);
        for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            const x1 = getX(polygon[i]);
            const y1 = getY(polygon[i]);
            const x2 = getX(polygon[j]);
            const y2 = getY(polygon[j]);
            const A = px - x1;
            const B = py - y1;
            const C = x2 - x1;
            const D = y2 - y1;
            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            const param = lenSq !== 0 ? (dot / lenSq) : -1;
            let xx: number, yy: number;
            if (param < 0) { xx = x1; yy = y1; }
            else if (param > 1) { xx = x2; yy = y2; }
            else { xx = x1 + param * C; yy = y1 + param * D; }
            const dx = px - xx;
            const dy = py - yy;
            const distance = Math.sqrt(dx * dx + dy * dy);
            minDistance = Math.min(minDistance, distance);
        }
        return minDistance;
    }, []);

    // Utility function to check if point is inside polygon (lat/lng)
    const isPointInPolygon = useCallback((point: Coordinate, polygon: Coordinate[]): boolean => {
        return pointInPolygonGeneric(point, polygon, p => p.lat, p => p.lng);
    }, [pointInPolygonGeneric]);

    // Calculate distance from point to polygon edge (CPU-based)
    const distanceToPolygonEdge = useCallback((point: Coordinate, polygon: Coordinate[]): number => {
        // convert degrees to meters approximation applied after
        const d = distanceToPolygonEdgeGeneric(point, polygon, p => p.lat, p => p.lng);
        return d * 111000; // rough conversion to meters
    }, [distanceToPolygonEdgeGeneric]);

    // ===== CROP AND SPACING FUNCTIONS =====
    
	const getCropSpacingInfo = useCallback((cropValue: string) => {
		const crop = getCropByValue(cropValue);
		const defaultRowSpacing = crop?.rowSpacing ?? 50;
		const defaultPlantSpacing = crop?.plantSpacing ?? 20;
		const currentRowSpacing = rowSpacing[cropValue] ?? defaultRowSpacing;
		const currentPlantSpacing = plantSpacing[cropValue] ?? defaultPlantSpacing;
		
		return {
			rowSpacing: currentRowSpacing,
			plantSpacing: currentPlantSpacing,
			plantsPerSqm: (10000 / (currentRowSpacing * currentPlantSpacing)).toFixed(1),
			isRowModified: currentRowSpacing !== defaultRowSpacing,
			isPlantModified: currentPlantSpacing !== defaultPlantSpacing,
			cropName: getTranslatedCropByValue(cropValue, (language as 'en' | 'th'))?.name || cropValue
		};
	}, [rowSpacing, plantSpacing, language]);

    // ===== PLANT POINT FUNCTIONS =====
    
    // Enhanced function to clear all existing plant markers immediately
    const clearAllPlantMarkers = useCallback(() => {
        log('Clearing all existing plant markers...');
        
        // Clear markers from the map
        plantPointMarkersRef.current.forEach(marker => {
            if (marker && marker.setMap) {
                marker.setMap(null);
            }
        });
        
        // Reset the arrays
        plantPointMarkersRef.current = [];
        
        log('All plant markers cleared successfully');
    }, []);

    // [FIX] Create optimized markers for plant points with race condition prevention and validation
    const createPlantMarkers = useCallback(async (points: PlantPoint[], generationId: number) => {
        if (!map) return [] as google.maps.Marker[];
        
        log(`Creating ${points.length} plant markers for generation ${generationId}`);
        const markers: google.maps.Marker[] = [];
        
        // Validate input points
        const validPoints = points.filter(point => 
            point && 
            typeof point.lat === 'number' && 
            typeof point.lng === 'number' && 
            !isNaN(point.lat) && 
            !isNaN(point.lng) &&
            point.lat >= -90 && point.lat <= 90 &&
            point.lng >= -180 && point.lng <= 180
        );
        
        if (validPoints.length !== points.length) {
            warn(`Filtered out ${points.length - validPoints.length} invalid points`);
        }
        
        const plantIcon = {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="4" cy="4" r="3" fill="#22c55e" stroke="#16a34a" stroke-width="1"/>
                </svg>
            `),
            scaledSize: new google.maps.Size(8, 8),
            anchor: new google.maps.Point(4, 4)
        };
        
        const batchSize = 100;
        for (let i = 0; i < validPoints.length; i += batchSize) {
            // Check if this generation is still current
            if (currentGenerationIdRef.current !== generationId) {
                log(`Generation ${generationId} cancelled, cleaning up partial markers`);
                markers.forEach(m => m.setMap(null));
                return [] as google.maps.Marker[];
            }
            
            const batch = validPoints.slice(i, i + batchSize);
            for (const point of batch) {
                // Double check before creating each marker
                if (currentGenerationIdRef.current !== generationId) {
                    log(`Generation ${generationId} cancelled mid-batch`);
                    markers.forEach(m => m.setMap(null));
                    return [] as google.maps.Marker[];
                }
                
                try {
                    const marker = new google.maps.Marker({
                        position: { lat: point.lat, lng: point.lng },
                        map: map,
                        icon: plantIcon,
                        title: `Plant: ${point.cropType}`,
                        optimized: true,
                        clickable: false
                    });
                    markers.push(marker);
                } catch (error) {
                    errorLog('Error creating marker for point:', point, error);
                    // Continue with other markers instead of failing completely
                }
            }
            
            // Yield to the main thread between batches to keep UI responsive
            await yieldToFrame();
        }
        
        log(`Successfully created ${markers.length} markers for generation ${generationId}`);
        return markers;
    }, [map]);

    // Geometry helpers
    const computeCentroid = useCallback((points: Coordinate[]): Coordinate => {
        if (points.length === 0) return { lat: 0, lng: 0 };
        let sumLat = 0;
        let sumLng = 0;
        for (const p of points) {
            sumLat += p.lat;
            sumLng += p.lng;
        }
        return { lat: sumLat / points.length, lng: sumLng / points.length };
    }, []);

    const toLocalXY = useCallback((p: Coordinate, origin: Coordinate) => {
        const latFactor = 111000;
        const lngFactor = 111000 * Math.cos((origin.lat * Math.PI) / 180);
        return {
            x: (p.lng - origin.lng) * lngFactor,
            y: (p.lat - origin.lat) * latFactor,
        };
    }, []);

    const toLatLngFromXY = useCallback((xy: { x: number; y: number }, origin: Coordinate) => {
        const latFactor = 111000;
        const lngFactor = 111000 * Math.cos((origin.lat * Math.PI) / 180);
        return {
            lat: xy.y / latFactor + origin.lat,
            lng: xy.x / lngFactor + origin.lng,
        };
    }, []);

    const rotateXY = useCallback((xy: { x: number; y: number }, angleRad: number) => {
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);
        return {
            x: xy.x * cosA - xy.y * sinA,
            y: xy.x * sinA + xy.y * cosA,
        };
    }, []);

    const isPointInPolygonXY = useCallback((point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean => {
        return pointInPolygonGeneric(point, polygon, p => p.x, p => p.y);
    }, [pointInPolygonGeneric]);

    const distanceToPolygonEdgeXY = useCallback((point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): number => {
        return distanceToPolygonEdgeGeneric(point, polygon, p => p.x, p => p.y);
    }, [distanceToPolygonEdgeGeneric]);

    // [FIX] Enhanced oriented generation with center-first row placement for better uniformity
    const generatePlantPointsOriented = useCallback(async (angleDeg: number, generationId: number): Promise<PlantPoint[]> => {
        if (mainArea.length < 3 || selectedCrops.length === 0) return [];

        log(`Starting plant generation for angle ${angleDeg}, generation ${generationId}`);

        const primaryCrop = selectedCrops[0];
        const cropInfo = getCropSpacingInfo(primaryCrop);
        const rowSpacingM = cropInfo.rowSpacing / 100;
        const plantSpacingM = cropInfo.plantSpacing / 100;
        const bufferDistance = plantSpacingM * 0.3;

        const origin = computeCentroid(mainArea);
        const angleRad = (angleDeg * Math.PI) / 180;

        const mainXY = mainArea.map(p => toLocalXY(p, origin));
        const rotatedMain = mainXY.map(p => rotateXY(p, -angleRad));
        const obstaclesXY = obstacles.map(o => o.coordinates.map(p => toLocalXY(p, origin)));
        const rotatedObstacles = obstaclesXY.map(poly => poly.map(p => rotateXY(p, -angleRad)));

        const xs = rotatedMain.map(p => p.x);
        const ys = rotatedMain.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const plantPointsOut: PlantPoint[] = [];
        
        // Calculate center Y coordinate for starting from the middle
        const centerY = (minY + maxY) / 2;
        
        // Calculate how many rows we can fit above and below center
        const totalHeight = maxY - minY;
        const maxRows = Math.floor(totalHeight / rowSpacingM);
        const rowsAboveCenter = Math.floor(maxRows / 2);
        const rowsBelowCenter = maxRows - rowsAboveCenter;
        
        log(`Plant generation: center Y=${centerY.toFixed(2)}, rows above=${rowsAboveCenter}, rows below=${rowsBelowCenter}`);
        
        // Generate rows starting from center and expanding outward
        const allRowYs: number[] = [];
        
        // Add center row first
        allRowYs.push(centerY);
        
        // Add rows above center (going up)
        for (let i = 1; i <= rowsAboveCenter; i++) {
            const yAbove = centerY + (i * rowSpacingM);
            if (yAbove <= maxY) {
                allRowYs.push(yAbove);
            }
        }
        
        // Add rows below center (going down)
        for (let i = 1; i <= rowsBelowCenter; i++) {
            const yBelow = centerY - (i * rowSpacingM);
            if (yBelow >= minY) {
                allRowYs.push(yBelow);
            }
        }
        
        // Sort rows from bottom to top for consistent ordering
        allRowYs.sort((a, b) => a - b);
        
        log(`Generated ${allRowYs.length} rows starting from center`);
        
        // Generate plants for each row
        for (let rowIndex = 0; rowIndex < allRowYs.length; rowIndex++) {
            const y = allRowYs[rowIndex];
            
            // Check generation ID frequently during long operations
            if (rowIndex % 10 === 0) {
                if (currentGenerationIdRef.current !== generationId) { 
                    log(`Plant generation ${generationId} cancelled at row ${rowIndex}`);
                    return []; 
                }
                await yieldToFrame();
            }

            let plantIndex = 0;
            for (let x = minX; x <= maxX; x += plantSpacingM) {
                // Additional check for very long rows
                if (plantIndex % 50 === 0 && currentGenerationIdRef.current !== generationId) {
                    log(`Plant generation ${generationId} cancelled at plant ${plantIndex} in row ${rowIndex}`);
                    return [];
                }
                
                const pt = { x, y };
                const insideMain = isPointInPolygonXY(pt, rotatedMain);
                const insideAnyHole = rotatedObstacles.some(poly => isPointInPolygonXY(pt, poly));
                if (insideMain && !insideAnyHole) {
                    const distanceFromEdge = Math.min(
                        distanceToPolygonEdgeXY(pt, rotatedMain),
                        ...rotatedObstacles.map(poly => distanceToPolygonEdgeXY(pt, poly))
                    );
                    if (distanceFromEdge >= bufferDistance) {
                        const unrotated = rotateXY(pt, angleRad);
                        const latLng = toLatLngFromXY(unrotated, origin);
                        plantPointsOut.push({
                            id: `plant_${generationId}_${rowIndex}_${plantIndex}`,
                            lat: latLng.lat,
                            lng: latLng.lng,
                            cropType: primaryCrop,
                            isValid: true,
                        });
                    }
                }
                plantIndex++;
            }
        }
        
        log(`Plant generation ${generationId} completed with ${plantPointsOut.length} points using center-first approach`);
        return plantPointsOut;
    }, [mainArea, selectedCrops, obstacles, getCropSpacingInfo, computeCentroid, toLocalXY, rotateXY, isPointInPolygonXY, distanceToPolygonEdgeXY, toLatLngFromXY]);

    // Create distance overlays (lines + labels) for a water obstacle
    const createDistanceOverlaysForWaterObstacle = useCallback((obstacle: Obstacle) => {
        if (!map || mainArea.length < 3) return;

        const origin = computeCentroid(mainArea);
        const mainXY = mainArea.map(p => toLocalXY(p, origin));
        const obsXY = obstacle.coordinates.map(p => toLocalXY(p, origin));

        const centroidObs = computeCentroid(obstacle.coordinates);
        const cxy = toLocalXY(centroidObs, origin);

        // helpers to compute line-polygon intersections
        const intersectHorizontal = (y: number, poly: Array<{ x: number; y: number }>): number[] => {
            const xs: number[] = [];
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const a = poly[i];
                const b = poly[j];
                if ((a.y > y) !== (b.y > y)) {
                    const x = a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y);
                    xs.push(x);
                }
            }
            return xs.sort((a, b) => a - b);
        };
        const intersectVertical = (x: number, poly: Array<{ x: number; y: number }>): number[] => {
            const ys: number[] = [];
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const a = poly[i];
                const b = poly[j];
                if ((a.x > x) !== (b.x > x)) {
                    const y = a.y + ((x - a.x) * (b.y - a.y)) / (b.x - a.x);
                    ys.push(y);
                }
            }
            return ys.sort((a, b) => a - b);
        };

        const xsObs = intersectHorizontal(cxy.y, obsXY);
        const xsMain = intersectHorizontal(cxy.y, mainXY);
        const ysObs = intersectVertical(cxy.x, obsXY);
        const ysMain = intersectVertical(cxy.x, mainXY);

        let xLeftObs = Math.max(...xsObs.filter(x => x < cxy.x));
        let xRightObs = Math.min(...xsObs.filter(x => x > cxy.x));
        let xLeftMain = Math.max(...xsMain.filter(x => x < cxy.x));
        let xRightMain = Math.min(...xsMain.filter(x => x > cxy.x));

        let yBottomObs = Math.max(...ysObs.filter(y => y < cxy.y));
        let yTopObs = Math.min(...ysObs.filter(y => y > cxy.y));
        let yBottomMain = Math.max(...ysMain.filter(y => y < cxy.y));
        let yTopMain = Math.min(...ysMain.filter(y => y > cxy.y));

        // Fallback to bounding boxes if intersections are not finite
        const obsXs = obsXY.map(p => p.x); const obsYs = obsXY.map(p => p.y);
        const mainXs = mainXY.map(p => p.x); const mainYs = mainXY.map(p => p.y);
        const obsBBox = { minX: Math.min(...obsXs), maxX: Math.max(...obsXs), minY: Math.min(...obsYs), maxY: Math.max(...obsYs) };
        const mainBBox = { minX: Math.min(...mainXs), maxX: Math.max(...mainXs), minY: Math.min(...mainYs), maxY: Math.max(...mainYs) };
        if (!isFinite(xLeftObs)) xLeftObs = obsBBox.minX;
        if (!isFinite(xRightObs)) xRightObs = obsBBox.maxX;
        if (!isFinite(xLeftMain)) xLeftMain = mainBBox.minX;
        if (!isFinite(xRightMain)) xRightMain = mainBBox.maxX;
        if (!isFinite(yBottomObs)) yBottomObs = obsBBox.minY;
        if (!isFinite(yTopObs)) yTopObs = obsBBox.maxY;
        if (!isFinite(yBottomMain)) yBottomMain = mainBBox.minY;
        if (!isFinite(yTopMain)) yTopMain = mainBBox.maxY;

        const overlays: { lines: google.maps.Polyline[]; labels: google.maps.Marker[] } = { lines: [], labels: [] };

        const makeLabelMarker = (pos: google.maps.LatLngLiteral, text: string) => {
            const svg = `<?xml version="1.0"?><svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'></svg>`; // placeholder, use label instead
            return new google.maps.Marker({
                position: pos,
                map: map,
                label: { text, color: '#22c55e', fontSize: '12px', fontWeight: 'bold' },
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
                    anchor: new google.maps.Point(0, 0),
                    scaledSize: new google.maps.Size(0, 0)
                },
                clickable: false,
                optimized: true,
            });
        };

        const addLine = (aXY: { x: number; y: number }, bXY: { x: number; y: number }) => {
            const a = toLatLngFromXY(aXY, origin);
            const b = toLatLngFromXY(bXY, origin);
            const line = new google.maps.Polyline({
                path: [a, b],
                strokeColor: '#ffffff',
                strokeOpacity: 1,
                strokeWeight: 2,
                map: map,
                clickable: false,
                zIndex: 999,
            });
            overlays.lines.push(line);
            const meters = Math.hypot(bXY.x - aXY.x, bXY.y - aXY.y);
            // Place label outside the main area: from main-boundary point (aXY), step outward (away from obstacle)
            // using only the outward direction to keep labels aligned horizontally/vertically
            const vx = aXY.x - bXY.x; // outward direction from boundary toward outside (opposite to interior)
            const vy = aXY.y - bXY.y;
            const vlen = Math.hypot(vx, vy) || 1;
            const ux = vx / vlen;
            const uy = vy / vlen;
            // Increase outward distance a bit more for left-right (horizontal) labels
            const isHorizontal = Math.abs(vx) > Math.abs(vy);
            const outward = isHorizontal ? 5 : 3; // meters outside the main area
            const labelXY = { x: aXY.x + ux * outward, y: aXY.y + uy * outward };
            const label = makeLabelMarker(toLatLngFromXY(labelXY, origin), `📏 ${meters.toFixed(1)} m`);
            overlays.labels.push(label);
        };

        if (isFinite(xLeftObs) && isFinite(xLeftMain) && xLeftMain < xLeftObs) {
            // main-boundary -> obstacle
            addLine({ x: xLeftMain, y: cxy.y }, { x: xLeftObs, y: cxy.y });
        }
        if (isFinite(xRightObs) && isFinite(xRightMain) && xRightMain > xRightObs) {
            // main-boundary -> obstacle (swap order to keep bXY = obstacle)
            addLine({ x: xRightMain, y: cxy.y }, { x: xRightObs, y: cxy.y });
        }
        if (isFinite(yBottomObs) && isFinite(yBottomMain) && yBottomMain < yBottomObs) {
            // main-boundary -> obstacle
            addLine({ x: cxy.x, y: yBottomMain }, { x: cxy.x, y: yBottomObs });
        }
        if (isFinite(yTopObs) && isFinite(yTopMain) && yTopMain > yTopObs) {
            // main-boundary -> obstacle (swap order to keep bXY = obstacle)
            addLine({ x: cxy.x, y: yTopMain }, { x: cxy.x, y: yTopObs });
        }

        setDistanceOverlaysByObstacle(prev => ({ ...prev, [obstacle.id]: overlays }));
    }, [map, mainArea, computeCentroid, toLocalXY, toLatLngFromXY]);

    // Main area polygon rendering effect
    useEffect(() => {
        if (!map || !isMainAreaSet || mainArea.length < 3 || isEditingMainArea) return;

        // Recreate main area polygon
        if (drawnPolygonRef.current) {
            detachOverlay(drawnPolygonRef.current);
        }

        const createEditablePolygon = (coordinates: Coordinate[], holes: Coordinate[][] = []) => {
            const styledPolygon = new google.maps.Polygon({
                paths: [coordinates, ...holes],
                fillColor: '#86EFAC',
                fillOpacity: 0.3,
                strokeColor: '#22C55E',
                strokeWeight: 2,
                strokeOpacity: 1,
                editable: false,
                draggable: false,
                clickable: true,
            });

            styledPolygon.setMap(map);

            const paths = styledPolygon.getPaths();
            const outerPath = paths.getAt(0);
            const syncFromPolygonPath = () => {
                const updated: Coordinate[] = [];
                for (let i = 0; i < outerPath.getLength(); i++) {
                    const latLng = outerPath.getAt(i);
                    updated.push({ lat: latLng.lat(), lng: latLng.lng() });
                }
                setMainArea(updated);
                computeAreaAndPerimeter(updated, []);
            };
            
            listenersRef.current.push(outerPath.addListener('set_at', syncFromPolygonPath));
            listenersRef.current.push(outerPath.addListener('insert_at', syncFromPolygonPath));
            listenersRef.current.push(outerPath.addListener('remove_at', syncFromPolygonPath));
            listenersRef.current.push(styledPolygon.addListener('dragstart', () => {
                map.setOptions({ draggable: false });
            }));
            listenersRef.current.push(styledPolygon.addListener('dragend', () => {
                map.setOptions({ draggable: true });
                syncFromPolygonPath();
            }));

            return styledPolygon;
        };

        const styledPolygon = createEditablePolygon(mainArea, []);
        setDrawnPolygon(styledPolygon);
        drawnPolygonRef.current = styledPolygon;

        log('Recreated main area polygon from localStorage data');
    }, [map, isMainAreaSet, mainArea, computeAreaAndPerimeter, isEditingMainArea]);

    // Obstacle overlays rendering effect
    useEffect(() => {
        if (!map || obstacles.length === 0) return;

        obstacleOverlaysRef.current.forEach(overlay => overlay.setMap(null));
        setObstacleOverlays([]);

        Object.values(distanceOverlaysByObstacleRef.current).forEach(({ lines, labels }) => {
            lines.forEach(l => l.setMap(null));
            labels.forEach(lb => lb.setMap(null));
        });
        setDistanceOverlaysByObstacle({});

        const newObstacleOverlays: google.maps.Polygon[] = [];
        obstacles.forEach((obstacle) => {
            const obstacleColors = obstacle.type === 'water_source'
                ? { fill: '#3b82f6', stroke: '#1d4ed8' }
                : { fill: '#6b7280', stroke: '#374151' };

            const polygon = new google.maps.Polygon({
                paths: [obstacle.coordinates],
                fillColor: obstacleColors.fill,
                strokeColor: obstacleColors.stroke,
                fillOpacity: 0.4,
                strokeOpacity: 1,
                strokeWeight: 2,
                editable: false,
                draggable: false,
                clickable: true,
                map: map
            });

            newObstacleOverlays.push(polygon);

            if (obstacle.type === 'water_source') {
                createDistanceOverlaysForWaterObstacle(obstacle);
            }
        });

        setObstacleOverlays(newObstacleOverlays);
        log('Recreated obstacle overlays from localStorage data:', obstacles.length, 'obstacles');
    }, [map, obstacles, createDistanceOverlaysForWaterObstacle]);

    // Plant points markers rendering effect
    useEffect(() => {
        if (!map) return;
        
        // Always clear existing markers first
        clearAllPlantMarkers();
        
        if (plantPoints.length === 0) return;

        log('Recreating plant point markers from localStorage data:', plantPoints.length, 'points');

        // Increment generation ID for this recreation
        const generationId = ++currentGenerationIdRef.current;

        const plantIcon = {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="4" cy="4" r="3" fill="#22c55e" stroke="#16a34a" stroke-width="1"/>
                </svg>
            `),
            scaledSize: new google.maps.Size(8, 8),
            anchor: new google.maps.Point(4, 4)
        };

        const newMarkers: google.maps.Marker[] = [];
        plantPoints.forEach((point) => {
            // Check if still current generation
            if (currentGenerationIdRef.current !== generationId) {
                // Clean up any markers created so far
                newMarkers.forEach(m => m.setMap(null));
                return;
            }
            
            const marker = new google.maps.Marker({
                position: { lat: point.lat, lng: point.lng },
                map: map,
                icon: plantIcon,
                title: `Plant: ${point.cropType}`,
                optimized: true,
                clickable: false
            });
            newMarkers.push(marker);
        });

        // Only update if still current generation
        if (currentGenerationIdRef.current === generationId) {
            plantPointMarkersRef.current = newMarkers;
            log('Successfully recreated plant point markers');
        } else {
            // Clean up if generation was cancelled
            newMarkers.forEach(m => m.setMap(null));
        }
    }, [map, plantPoints, clearAllPlantMarkers]);
    
    // [FIX] Enhanced plant generation logic with proper race condition handling and error recovery
    const runPlantGeneration = useCallback(async (angle: number) => {
        log(`Starting plant generation for angle ${angle}`);
        setIsGeneratingPlants(true);
        
        try {
            // Increment generation ID to start a new generation, invalidating previous ones
            const generationId = ++currentGenerationIdRef.current;
            log(`New generation started: ${generationId}`);

            // Clear previous markers immediately for better UX
            clearAllPlantMarkers();

            // Generate new plant points with timeout protection
            const points = await Promise.race([
                generatePlantPointsOriented(angle, generationId),
                new Promise<PlantPoint[]>((_, reject) => 
                    setTimeout(() => reject(new Error('Plant generation timeout')), 30000)
                )
            ]);
            
            // Check if this is still the latest request before proceeding
            if (currentGenerationIdRef.current !== generationId) {
                log(`Generation ${generationId} was cancelled, aborting`);
                return;
            }

            // Validate generated points
            if (!Array.isArray(points) || points.length === 0) {
                warn(`Generation ${generationId} produced no valid points`);
                setPlantPoints([]);
                return;
            }

            // Update plant points state
            setPlantPoints(points);
            
            // Create markers for the new points with batch processing
            const markers = await createPlantMarkers(points, generationId);
            
            // Final check before rendering markers
            if (currentGenerationIdRef.current === generationId) {
                plantPointMarkersRef.current = markers;
                log(`Generation ${generationId} completed successfully with ${markers.length} markers`);
            } else {
                log(`Generation ${generationId} was cancelled during marker creation, cleaning up`);
                markers.forEach(m => m.setMap(null));
            }
        } catch (error) {
            errorLog('Error generating plant points:', error);
            if (error instanceof Error && error.message === 'Plant generation timeout') {
                alert(t('Plant generation took too long. Please try with a smaller area or different spacing.'));
            } else {
                alert(t('Error generating plant points. Please check your area and spacing settings.'));
            }
            // Clear any partial results
            setPlantPoints([]);
            clearAllPlantMarkers();
        } finally {
            setIsGeneratingPlants(false);
        }
    }, [generatePlantPointsOriented, createPlantMarkers, clearAllPlantMarkers, t]);

    // Handle plant point generation
    const handleGeneratePlantPoints = useCallback(async () => {
        if (!isMainAreaSet || selectedCrops.length === 0) {
            alert(t('Please set main area and select crops first'));
            return;
        }
        runPlantGeneration(rotationAngle);
    }, [isMainAreaSet, selectedCrops, rotationAngle, runPlantGeneration, t]);

    // [FIX] Enhanced clear plant points with proper cleanup
    const clearPlantPoints = useCallback(() => {
        log('Clearing plant points...');
        
        // Increment generation ID to cancel any ongoing operations
        currentGenerationIdRef.current++;
        
        // Clear states
        setPlantPoints([]);
        setRotationAngle(0);
        
        // Clear all markers
        clearAllPlantMarkers();
        
        log('Plant points cleared successfully');
    }, [clearAllPlantMarkers]);

    // [FIX] Enhanced rotation change handler with proper throttling and cancellation
    const handleRotationChange = useCallback((newAngle: number) => {
        setRotationAngle(newAngle); // Update slider UI instantly
        
        if (!isMainAreaSet || selectedCrops.length === 0) return;

        // Clear existing timer
        if (rotationTimerRef.current) {
            clearTimeout(rotationTimerRef.current);
        }

        // Cancel any ongoing generation by incrementing ID
        currentGenerationIdRef.current++;

        // Set a new timer to run the generation after a short delay
        rotationTimerRef.current = setTimeout(() => {
            runPlantGeneration(newAngle);
        }, 150); // 150ms delay for throttling
    }, [isMainAreaSet, selectedCrops, runPlantGeneration]);

    // Water requirement info based on primary crop and current plant count
    const waterRequirementInfo = useMemo(() => {
        if (selectedCrops.length === 0) return { perPlant: null as number | null, total: null as number | null };
        const primary = getCropByValue(selectedCrops[0]);
        if (!primary) return { perPlant: null as number | null, total: null as number | null };
        const perPlant = primary.waterRequirement; // liters/plant/day
        const total = plantPoints.length * perPlant;
        return { perPlant, total };
    }, [selectedCrops, plantPoints.length]);

    // ===== OBSTACLE FUNCTIONS =====
    
    // Clear obstacles function
    const clearObstacles = useCallback(() => {
        setObstacles([]);
        obstacleOverlays.forEach(overlay => overlay.setMap(null));
        setObstacleOverlays([]);
        Object.values(distanceOverlaysByObstacle).forEach(({ lines, labels }) => {
            lines.forEach(l => l.setMap(null));
            labels.forEach(lb => lb.setMap(null));
        });
        setDistanceOverlaysByObstacle({});
        if (drawnPolygon && mainArea.length >= 3) {
            drawnPolygon.setPaths([mainArea]);
            computeAreaAndPerimeter(mainArea, []);
        }
    }, [obstacleOverlays, drawnPolygon, mainArea, computeAreaAndPerimeter, distanceOverlaysByObstacle]);

    // Delete specific obstacle function
    const deleteObstacle = useCallback((obstacleId: string) => {
        const obstacleIndex = obstacles.findIndex(obs => obs.id === obstacleId);
        if (obstacleIndex !== -1) {
            if (obstacleOverlays[obstacleIndex]) {
                obstacleOverlays[obstacleIndex].setMap(null);
            }
            
            setObstacles(prev => prev.filter(obs => obs.id !== obstacleId));
            setObstacleOverlays(prev => prev.filter((_, index) => index !== obstacleIndex));
            const remaining = obstacles.filter(obs => obs.id !== obstacleId).map(o => o.coordinates);
            if (drawnPolygon && mainArea.length >= 3) {
                drawnPolygon.setPaths([mainArea, ...remaining]);
                computeAreaAndPerimeter(mainArea, remaining);
            }
        }
    }, [obstacles, obstacleOverlays, drawnPolygon, mainArea, computeAreaAndPerimeter]);

    // Obstacle drawing functions
	const startDrawingObstacle = useCallback((obstacleType: typeof selectedObstacleType, shapeType: string = 'polygon') => {
        if (!drawingManagerRef || !isMainAreaSet) return;
        
		setIsDrawingObstacle(true);
		setSelectedObstacleType(obstacleType);
		setSelectedObstacleShape(shapeType);

		const obstacleColors = obstacleType === 'water_source'
			? { fill: '#3b82f6', stroke: '#1d4ed8' }
			: { fill: '#6b7280', stroke: '#374151' };

		const drawingMode = shapeType === 'rectangle' 
			? google.maps.drawing.OverlayType.RECTANGLE
			: shapeType === 'circle'
			? google.maps.drawing.OverlayType.CIRCLE
			: google.maps.drawing.OverlayType.POLYGON;

		drawingManagerRef.setOptions({
			polygonOptions: {
				fillColor: obstacleColors.fill,
				fillOpacity: 0.4,
				strokeColor: obstacleColors.stroke,
				strokeWeight: 2,
				strokeOpacity: 1,
				editable: true,
				draggable: false,
				clickable: true
			},
			rectangleOptions: {
				fillColor: obstacleColors.fill,
				fillOpacity: 0.4,
				strokeColor: obstacleColors.stroke,
				strokeWeight: 2,
				strokeOpacity: 1,
				editable: true,
				draggable: false,
				clickable: true
			},
			circleOptions: {
				fillColor: obstacleColors.fill,
				fillOpacity: 0.4,
				strokeColor: obstacleColors.stroke,
				strokeWeight: 2,
				strokeOpacity: 1,
				editable: true,
				draggable: false,
				clickable: true
			}
		});

		drawingManagerRef.setDrawingMode(drawingMode);
	}, [drawingManagerRef, isMainAreaSet]);

	const stopDrawingObstacle = useCallback(() => {
        if (!drawingManagerRef) return;
        
		setIsDrawingObstacle(false);
        drawingManagerRef.setDrawingMode(null);
		drawingManagerRef.setOptions({
			polygonOptions: {
				fillColor: '#86EFAC',
				fillOpacity: 0.3,
				strokeColor: '#22C55E',
				strokeWeight: 3,
				strokeOpacity: 1,
				editable: true,
				draggable: false,
				clickable: true
			},
			rectangleOptions: {
				fillColor: '#86EFAC',
				fillOpacity: 0.3,
				strokeColor: '#22C55E',
				strokeWeight: 3,
				strokeOpacity: 1,
				editable: true,
				draggable: false,
				clickable: true
			},
			circleOptions: {
				fillColor: '#86EFAC',
				fillOpacity: 0.3,
				strokeColor: '#22C55E',
				strokeWeight: 3,
				strokeOpacity: 1,
				editable: true,
				draggable: false,
				clickable: true
			}
		});
    }, [drawingManagerRef]);

    const steps: StepData[] = [
        {
            id: 1,
            key: 'area-creating',
            title: t('Area Creating'),
            description: t('Set up the initial area for your field'),
            route: '/step1-field-area'
        },
        {
            id: 2,
            key: 'irrigation-generate',
            title: t('Irrigation Generate'),
            description: t('Generate irrigation system and settings'),
            route: '/step2-irrigation-system'
        },
        {
            id: 3,
            key: 'zone-obstacle',
            title: t('Zone Obstacle'),
            description: t('Define zones and obstacles'),
            route: '/step3-zones-obstacles'
        },
        {
            id: 4,
            key: 'pipe-generate',
            title: t('Pipe Generate'),
            description: t('Generate pipe layout and connections'),
            route: '/step4-pipe-system'
        }
    ];

    // Data initialization effect
	useEffect(() => {
		// If this is a browser reload, mirror the Reset behavior on this page
		const navEntries = (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function')
			? (performance.getEntriesByType('navigation') as PerformanceEntry[])
			: [];
		const navTiming = navEntries[0] as PerformanceNavigationTiming | undefined;
		const legacyNav = (typeof performance !== 'undefined'
			? (performance as Performance & { navigation?: PerformanceNavigation }).navigation
			: undefined);
		const isReload = (navTiming?.type === 'reload') || (legacyNav?.type === 1);
		// Detect presence of currentStep in the URL to avoid false "fresh load" resets when navigating back
		const currentStepParamPresent = (() => {
			try {
				if (typeof window === 'undefined') return false;
				const qs = new URLSearchParams(window.location.search);
				return qs.has('currentStep');
			} catch { return false; }
		})();
		if (isReload) {
				if (!currentStepParamPresent) {
					log('Page reload detected - applying Reset behavior for Initial Area');
					localStorage.removeItem('fieldCropData');
					setMainArea([]);
					setAreaRai(null);
					setPerimeterMeters(null);
					setIsMainAreaSet(false);
					setPlantPoints([]);
					setRotationAngle(0);
					setObstacles([]);
					setRowSpacing({});
					setPlantSpacing({});
					setMapCenter([13.7563, 100.5018]);
					setMapZoom(16);
					if (map) {
						if (drawnPolygonRef.current) { drawnPolygonRef.current.setMap(null); drawnPolygonRef.current = null; }
						obstacleOverlaysRef.current.forEach(overlay => overlay.setMap(null));
						setObstacleOverlays([]);
						clearAllPlantMarkers();
						Object.values(distanceOverlaysByObstacleRef.current).forEach(({ lines, labels }) => {
							lines.forEach(l => l.setMap(null));
							labels.forEach(lb => lb.setMap(null));
						});
						setDistanceOverlaysByObstacle({});
					}
				} else {
					log('Reload detected but currentStep present - skipping reset to preserve state');
				}
		}


		const hasUrlParams = crops || completedSteps || mainAreaData || obstaclesData || plantPointsData || areaRaiData || perimeterMetersData || rotationAngleData || rowSpacingData || plantSpacingData || currentStepParamPresent;
		
		if (!hasUrlParams) {
			log('Fresh page load detected - clearing localStorage');
			// Only clear storage if not navigating within flow
			if (!currentStepParamPresent) {
				localStorage.removeItem('fieldCropData');
			}
			// Reset all state to initial values
			setMainArea([]);
			setAreaRai(null);
			setPerimeterMeters(null);
			setIsMainAreaSet(false);
			setPlantPoints([]);
			setRotationAngle(0);
			setObstacles([]);
			setRowSpacing({});
			setPlantSpacing({});
			setMapCenter([13.7563, 100.5018]);
			setMapZoom(16);
			
			if (map) {
				if (drawnPolygonRef.current) {
					drawnPolygonRef.current.setMap(null);
					drawnPolygonRef.current = null;
				}
				obstacleOverlaysRef.current.forEach(overlay => overlay.setMap(null));
				setObstacleOverlays([]);
				clearAllPlantMarkers();
				Object.values(distanceOverlaysByObstacleRef.current).forEach(({ lines, labels }) => {
					lines.forEach(l => l.setMap(null));
					labels.forEach(lb => lb.setMap(null));
				});
				setDistanceOverlaysByObstacle({});
			}
			
			return; // Exit early to prevent any data loading
		}

		if (crops) {
			const cropList = crops.split(',').filter(crop => crop.trim());
			setSelectedCrops(cropList);
			
			setRowSpacing(prev => {
				const updated: Record<string, number> = { ...prev };
				cropList.forEach(cropValue => {
					const crop = getCropByValue(cropValue);
					if (crop !== undefined && updated[cropValue] === undefined) {
						updated[cropValue] = crop.rowSpacing;
					}
				});
				return updated;
			});
			setPlantSpacing(prev => {
				const updated: Record<string, number> = { ...prev };
				cropList.forEach(cropValue => {
					const crop = getCropByValue(cropValue);
					if (crop !== undefined && updated[cropValue] === undefined) {
						updated[cropValue] = crop.plantSpacing;
					}
				});
				return updated;
			});
		}
		
		if (completedSteps) {
			const completedArray = parseCompletedSteps(completedSteps);
			setCompleted(completedArray);
		}

		if (hasUrlParams) {
			try {
				const fieldDataStr = localStorage.getItem('fieldCropData');
				if (fieldDataStr) {
					const fieldData = JSON.parse(fieldDataStr);
					log('Loading field data from localStorage for back navigation:', fieldData);
					
					// Validate and load main area data
					if (fieldData.mainArea && Array.isArray(fieldData.mainArea) && fieldData.mainArea.length >= 3) {
						// Validate coordinates
						const validMainArea = fieldData.mainArea.filter((coord: unknown) => 
							coord && 
							typeof (coord as Coordinate).lat === 'number' && 
							typeof (coord as Coordinate).lng === 'number' && 
							!isNaN((coord as Coordinate).lat) && 
							!isNaN((coord as Coordinate).lng) &&
							(coord as Coordinate).lat >= -90 && (coord as Coordinate).lat <= 90 &&
							(coord as Coordinate).lng >= -180 && (coord as Coordinate).lng <= 180
						) as Coordinate[];
						
						if (validMainArea.length >= 3) {
							setMainArea(validMainArea);
							setIsMainAreaSet(true);
						} else {
							warn('Invalid main area coordinates found, skipping');
						}
					}
					
					// Validate and load obstacles data
					if (fieldData.obstacles && Array.isArray(fieldData.obstacles) && fieldData.obstacles.length > 0) {
						const validObstacles = fieldData.obstacles.filter((obstacle: unknown) => {
							const obs = obstacle as Obstacle;
							return obs && 
								obs.id && 
								obs.type && 
								Array.isArray(obs.coordinates) && 
								obs.coordinates.length >= 3 &&
								obs.coordinates.every((coord: Coordinate) => 
									coord && 
									typeof coord.lat === 'number' && 
									typeof coord.lng === 'number' && 
									!isNaN(coord.lat) && 
									!isNaN(coord.lng) &&
									coord.lat >= -90 && coord.lat <= 90 &&
									coord.lng >= -180 && coord.lng <= 180
								);
						}) as Obstacle[];
						
						if (validObstacles.length > 0) {
							setObstacles(validObstacles);
						} else {
							warn('Invalid obstacles data found, skipping');
						}
					}
					
					// Validate and load plant points data
					if (fieldData.plantPoints && Array.isArray(fieldData.plantPoints) && fieldData.plantPoints.length > 0) {
						const validPlantPoints = fieldData.plantPoints.filter((point: unknown) => {
							const pt = point as PlantPoint;
							return pt && 
								pt.id && 
								typeof pt.lat === 'number' && 
								typeof pt.lng === 'number' && 
								!isNaN(pt.lat) && 
								!isNaN(pt.lng) &&
								pt.lat >= -90 && pt.lat <= 90 &&
								pt.lng >= -180 && pt.lng <= 180;
						}) as PlantPoint[];
						
						if (validPlantPoints.length > 0) {
							setPlantPoints(validPlantPoints);
						} else {
							warn('Invalid plant points data found, skipping');
						}
					}
					
					// Validate and load numeric data
					if (fieldData.areaRai !== null && fieldData.areaRai !== undefined && !isNaN(fieldData.areaRai)) {
						setAreaRai(fieldData.areaRai);
					}
					
					if (fieldData.perimeterMeters !== null && fieldData.perimeterMeters !== undefined && !isNaN(fieldData.perimeterMeters)) {
						setPerimeterMeters(fieldData.perimeterMeters);
					}
					
					if (fieldData.rotationAngle !== null && fieldData.rotationAngle !== undefined && !isNaN(fieldData.rotationAngle)) {
						setRotationAngle(fieldData.rotationAngle);
					}
					
					// Validate and load spacing data
					if (fieldData.rowSpacing && typeof fieldData.rowSpacing === 'object') {
						const validRowSpacing: Record<string, number> = {};
						Object.entries(fieldData.rowSpacing).forEach(([key, value]) => {
							if (typeof value === 'number' && !isNaN(value) && value > 0 && value <= 300) {
								validRowSpacing[key] = value;
							}
						});
						if (Object.keys(validRowSpacing).length > 0) {
							setRowSpacing(validRowSpacing);
						}
					}
					
					if (fieldData.plantSpacing && typeof fieldData.plantSpacing === 'object') {
						const validPlantSpacing: Record<string, number> = {};
						Object.entries(fieldData.plantSpacing).forEach(([key, value]) => {
							if (typeof value === 'number' && !isNaN(value) && value > 0 && value <= 200) {
								validPlantSpacing[key] = value;
							}
						});
						if (Object.keys(validPlantSpacing).length > 0) {
							setPlantSpacing(validPlantSpacing);
						}
					}
					
					// Validate and load map data
					if (fieldData.mapCenter && 
						typeof fieldData.mapCenter.lat === 'number' && 
						typeof fieldData.mapCenter.lng === 'number' &&
						!isNaN(fieldData.mapCenter.lat) && 
						!isNaN(fieldData.mapCenter.lng) &&
						fieldData.mapCenter.lat >= -90 && fieldData.mapCenter.lat <= 90 &&
						fieldData.mapCenter.lng >= -180 && fieldData.mapCenter.lng <= 180) {
						setMapCenter([fieldData.mapCenter.lat, fieldData.mapCenter.lng]);
					}
					
					if (fieldData.mapZoom && typeof fieldData.mapZoom === 'number' && !isNaN(fieldData.mapZoom) && fieldData.mapZoom >= 1 && fieldData.mapZoom <= 22) {
						setMapZoom(fieldData.mapZoom);
					}
					
					return;
				}
			} catch (e) {
				errorLog('Error loading field data from localStorage:', e);
				// Clear corrupted data
				localStorage.removeItem('fieldCropData');
			}
		}

		if (mainAreaData) {
			try {
				const parsed = JSON.parse(mainAreaData);
				setMainArea(parsed);
				setIsMainAreaSet(true);
			} catch (e) { errorLog('Error parsing mainAreaData:', e); }
		}
		
		if (obstaclesData) {
			try {
				const parsed = JSON.parse(obstaclesData);
				setObstacles(parsed);
			} catch (e) { errorLog('Error parsing obstaclesData:', e); }
		}
		
		if (plantPointsData) {
			try {
				const parsed = JSON.parse(plantPointsData);
				setPlantPoints(parsed);
			} catch (e) { errorLog('Error parsing plantPointsData:', e); }
		}
		
		if (areaRaiData) { setAreaRai(parseFloat(areaRaiData)); }
		if (perimeterMetersData) { setPerimeterMeters(parseFloat(perimeterMetersData)); }
		if (rotationAngleData) { setRotationAngle(parseFloat(rotationAngleData)); }
		
		if (rowSpacingData) {
			try {
				const parsed = JSON.parse(rowSpacingData);
				setRowSpacing(parsed);
			} catch (e) { errorLog('Error parsing rowSpacingData:', e); }
		}
		
		if (plantSpacingData) {
			try {
				const parsed = JSON.parse(plantSpacingData);
				setPlantSpacing(parsed);
			} catch (e) { errorLog('Error parsing plantSpacingData:', e); }
		}
	}, [crops, completedSteps, mainAreaData, obstaclesData, plantPointsData, areaRaiData, perimeterMetersData, rotationAngleData, rowSpacingData, plantSpacingData, map, clearAllPlantMarkers]);

    // Spacing handlers
    const handleRowSpacingEdit = (cropValue: string) => {
        setTempRowSpacing(prev => ({ 
            ...prev, 
            [cropValue]: (rowSpacing[cropValue] || 50).toString() 
        }));
        setEditingRowSpacingForCrop(cropValue);
    };

    const handleRowSpacingConfirm = (cropValue: string) => {
        const newValue = parseFloat(tempRowSpacing[cropValue] || '');
        if (!isNaN(newValue) && newValue > 0) {
            setRowSpacing(prev => ({ ...prev, [cropValue]: newValue }));
            setEditingRowSpacingForCrop(null);
            setTempRowSpacing(prev => {
                const updated = { ...prev };
                delete updated[cropValue];
                return updated;
            });
        } else {
            alert(t('Please enter a positive number for row spacing'));
        }
    };

    const handleRowSpacingCancel = (cropValue: string) => {
        setEditingRowSpacingForCrop(null);
        setTempRowSpacing(prev => {
            const updated = { ...prev };
            delete updated[cropValue];
            return updated;
        });
    };

    const handlePlantSpacingEdit = (cropValue: string) => {
        setTempPlantSpacing(prev => ({ 
            ...prev, 
            [cropValue]: (plantSpacing[cropValue] || 20).toString() 
        }));
        setEditingPlantSpacingForCrop(cropValue);
    };

    const handlePlantSpacingConfirm = (cropValue: string) => {
        const newValue = parseFloat(tempPlantSpacing[cropValue] || '');
        if (!isNaN(newValue) && newValue > 0) {
            setPlantSpacing(prev => ({ ...prev, [cropValue]: newValue }));
            setEditingPlantSpacingForCrop(null);
            setTempPlantSpacing(prev => {
                const updated = { ...prev };
                delete updated[cropValue];
                return updated;
            });
        } else {
            alert(t('Please enter a positive number for plant spacing'));
        }
    };

    const handlePlantSpacingCancel = (cropValue: string) => {
        setEditingPlantSpacingForCrop(null);
        setTempPlantSpacing(prev => {
            const updated = { ...prev };
            delete updated[cropValue];
            return updated;
        });
    };

	const resetSpacingToDefaults = () => {
		setRowSpacing(prev => {
			const updated: Record<string, number> = { ...prev };
			selectedCrops.forEach(cropValue => {
				const crop = getCropByValue(cropValue);
				if (crop) updated[cropValue] = crop.rowSpacing;
			});
			return updated;
		});
		setPlantSpacing(prev => {
			const updated: Record<string, number> = { ...prev };
			selectedCrops.forEach(cropValue => {
				const crop = getCropByValue(cropValue);
				if (crop) updated[cropValue] = crop.plantSpacing;
			});
			return updated;
		});
		setEditingRowSpacingForCrop(null);
		setEditingPlantSpacingForCrop(null);
		setTempRowSpacing({});
		setTempPlantSpacing({});
	};
    

    const handleMapLoad = (loadedMap: google.maps.Map) => {
        setMap(loadedMap);
        listenersRef.current.push(
            loadedMap.addListener('zoom_changed', () => {
                setMapZoom(loadedMap.getZoom() || 16);
            })
        );
        
        if (!window.google?.maps?.drawing) {
            console.error("Google Maps Drawing library not available.");
            alert("Drawing tools could not be loaded. Please refresh the page.");
            return;
        }

        const drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false,
            polygonOptions: {
                fillColor: '#86EFAC',
                fillOpacity: 0.3,
                strokeColor: '#22C55E',
                strokeWeight: 3,
                strokeOpacity: 1,
                editable: true,
                draggable: false,
                clickable: true,
            },
            rectangleOptions: {
                fillColor: '#86EFAC',
                fillOpacity: 0.3,
                strokeColor: '#22C55E',
                strokeWeight: 3,
                strokeOpacity: 1,
                editable: true,
                draggable: false,
                clickable: true,
            },
            circleOptions: {
                fillColor: '#86EFAC',
                fillOpacity: 0.3,
                strokeColor: '#22C55E',
                strokeWeight: 3,
                strokeOpacity: 1,
                editable: true,
                draggable: false,
                clickable: true,
            },
        });

        drawingManager.setMap(loadedMap);
        setDrawingManagerRef(drawingManager);

        const createEditablePolygon = (coordinates: Coordinate[], holes: Coordinate[][] = [], isEditable: boolean = false) => {
            const styledPolygon = new google.maps.Polygon({
                paths: [coordinates, ...holes],
                fillColor: '#86EFAC', 
                fillOpacity: 0.3, 
                strokeColor: '#22C55E',
                strokeWeight: isEditable ? 4 : 3, // Thicker stroke when editing for better visibility
                strokeOpacity: 1, 
                editable: isEditable,
                draggable: false, 
                clickable: true,
            });
            styledPolygon.setMap(loadedMap);

            if (isEditable) {
                const paths = styledPolygon.getPaths();
                const outerPath = paths.getAt(0);
                const syncFromPolygonPath = () => {
                    const updated: Coordinate[] = [];
                    for (let i = 0; i < outerPath.getLength(); i++) {
                        const latLng = outerPath.getAt(i);
                        updated.push({ lat: latLng.lat(), lng: latLng.lng() });
                    }
                    setMainArea(updated);
                    computeAreaAndPerimeter(updated, []);
                };
                listenersRef.current.push(outerPath.addListener('set_at', syncFromPolygonPath));
                listenersRef.current.push(outerPath.addListener('insert_at', syncFromPolygonPath));
                listenersRef.current.push(outerPath.addListener('remove_at', syncFromPolygonPath));
                listenersRef.current.push(styledPolygon.addListener('dragstart', () => loadedMap.setOptions({ draggable: false })));
                listenersRef.current.push(styledPolygon.addListener('dragend', () => {
                    loadedMap.setOptions({ draggable: true });
                    syncFromPolygonPath();
                }));
            }
            return styledPolygon;
        };

        const validateObstacleInMainAreaWithRefs = (obstacleCoords: Coordinate[]): boolean => {
            if (mainAreaRef.current.length < 3) return false;
            if (drawnPolygonRef.current && window.google?.maps?.geometry?.poly) {
                try {
                    const tolerance = 5e-6;
                    return obstacleCoords.every((point) => {
                        const latLng = new google.maps.LatLng(point.lat, point.lng);
                        const inPoly = google.maps.geometry.poly.containsLocation(latLng, drawnPolygonRef.current as google.maps.Polygon);
                        const onEdge = google.maps.geometry.poly.isLocationOnEdge(latLng, drawnPolygonRef.current as google.maps.Polygon, tolerance);
                        return inPoly || onEdge;
                    });
                } catch { /* fall through to CPU method */ }
            }
            const edgeToleranceMeters = 2.0;
            return obstacleCoords.every(point => {
                if (isPointInPolygon(point, mainAreaRef.current)) return true;
                const distanceToEdge = distanceToPolygonEdge(point, mainAreaRef.current);
                return distanceToEdge <= edgeToleranceMeters;
            });
        };
        
        listenersRef.current.push(drawingManager.addListener('polygoncomplete', (polygon: google.maps.Polygon) => {
            const coordinates = extractCoordinatesFromPolygon(polygon);
            const isObstacleIntent = drawingManager.get('polygonOptions').fillColor !== '#86EFAC';
            
            if ((drawnPolygonRef.current != null) && isObstacleIntent) {
                if (validateObstacleInMainAreaWithRefs(coordinates)) {
                    const newObstacle: Obstacle = {
                        id: `obstacle_${Date.now()}`,
                        type: selectedObstacleTypeRef.current,
                        coordinates: coordinates,
                        name: `${selectedObstacleTypeRef.current}_${obstaclesRef.current.length + 1}`
                    };
                    const obstacleColors = newObstacle.type === 'water_source' ? { fill: '#3b82f6', stroke: '#1d4ed8' } : { fill: '#6b7280', stroke: '#374151' };
                    polygon.setOptions({
                        fillColor: obstacleColors.fill, strokeColor: obstacleColors.stroke,
                        fillOpacity: 0.4, strokeOpacity: 1, strokeWeight: 2,
                        editable: false, draggable: false, clickable: true
                    });
                    setObstacles(prev => [...prev, newObstacle]);
                    setObstacleOverlays(prev => [...prev, polygon]);
                    if (newObstacle.type === 'water_source') createDistanceOverlaysForWaterObstacle(newObstacle);
                    // Remove any plant points overlapped by this obstacle
                    try {
                        setPlantPoints(prev => {
                            const thresholdMeters = 0.5;
                            return prev.filter(pt => {
                                if (isPointInPolygon(pt, newObstacle.coordinates)) return false;
                                const d = distanceToPolygonEdge(pt, newObstacle.coordinates);
                                return d > thresholdMeters;
                            });
                        });
                    } catch (e) {
                        console.warn('Failed to remove overlapped plant points:', e);
                    }
                    computeAreaAndPerimeter(mainAreaRef.current, []);
                } else {
                    alert(t('Obstacle must be within the main area'));
                    polygon.setMap(null);
                }
                
                setIsDrawingObstacle(false);
                drawingManager.setDrawingMode(null);
                drawingManager.setOptions({
                    polygonOptions: {
                        fillColor: '#86EFAC', fillOpacity: 0.3, strokeColor: '#22C55E',
                        strokeWeight: 2, strokeOpacity: 1, editable: true,
                        draggable: false, clickable: true
                    }
                });
                return;
            }

            if (drawnPolygonRef.current == null) {
                setMainArea(coordinates);
                computeAreaAndPerimeter(coordinates, []);
                setIsDrawing(false);
                setIsMainAreaSet(true);
                setIsEditingMainArea(false); // Start in confirm mode
                drawingManager.setDrawingMode(null);
                
                const prevPoly = drawnPolygonRef.current;
                if (prevPoly) { detachOverlay(prevPoly); }

                // Create polygon in confirm mode (not editable)
                const styledPolygon = createEditablePolygon(coordinates, [], false);
                setDrawnPolygon(styledPolygon);
                drawnPolygonRef.current = styledPolygon;
                polygon.setMap(null);
                return;
            }

            polygon.setMap(null);
            stopDrawingObstacle();
        }));

        listenersRef.current.push(drawingManager.addListener('rectanglecomplete', (rectangle: google.maps.Rectangle) => {
            const coordinates = extractCoordinatesFromRectangle(rectangle);
            const isObstacleIntent = drawingManager.get('rectangleOptions').fillColor !== '#86EFAC';
            
            if (isObstacleIntent && isDrawingObstacleRef.current) {
                if (validateObstacleInMainAreaWithRefs(coordinates)) {
                    const newObstacle: Obstacle = {
                        id: `obstacle-${Date.now()}`,
                        type: selectedObstacleTypeRef.current,
                        coordinates: coordinates,
                        name: selectedObstacleTypeRef.current === 'water_source' ? t('Water Source') : t('Other Obstacle')
                    };
                    
                    setObstacles(prev => [...prev, newObstacle]);
                    
                    const styledPolygon = createEditablePolygon(coordinates, [], true);
                    setObstacleOverlays(prev => [...prev, styledPolygon]);
                    
                    try {
                        setPlantPoints(prev => {
                            const thresholdMeters = 0.5;
                            return prev.filter(pt => {
                                if (!isPointInPolygon(pt, mainAreaRef.current)) return true;
                                if (isPointInPolygon(pt, newObstacle.coordinates)) return false;
                                const d = distanceToPolygonEdge(pt, newObstacle.coordinates);
                                return d > thresholdMeters;
                            });
                        });
                    } catch (e) {
                        console.warn('Failed to remove overlapped plant points:', e);
                    }
                    computeAreaAndPerimeter(mainAreaRef.current, []);
                } else {
                    alert(t('Obstacle must be within the main area'));
                    rectangle.setMap(null);
                }
                
                setIsDrawingObstacle(false);
                drawingManager.setDrawingMode(null);
                drawingManager.setOptions({
                    rectangleOptions: {
                        fillColor: '#86EFAC', fillOpacity: 0.3, strokeColor: '#22C55E',
                        strokeWeight: 2, strokeOpacity: 1, editable: true,
                        draggable: false, clickable: true
                    }
                });
                return;
            }

            if (drawnPolygonRef.current != null) { rectangle.setMap(null); return; }
            setMainArea(coordinates);
            computeAreaAndPerimeter(coordinates, []);
            setIsDrawing(false);
            setIsMainAreaSet(true);
            setIsEditingMainArea(false); // Start in confirm mode
            drawingManager.setDrawingMode(null);
            const prevPoly = drawnPolygonRef.current;
            if (prevPoly) { detachOverlay(prevPoly); }
            const styledPolygon = createEditablePolygon(coordinates, [], false);
            setDrawnPolygon(styledPolygon);
            drawnPolygonRef.current = styledPolygon;
            rectangle.setMap(null);
        }));

        listenersRef.current.push(drawingManager.addListener('circlecomplete', (circle: google.maps.Circle) => {
            const coordinates = extractCoordinatesFromCircle(circle);
            const isObstacleIntent = drawingManager.get('circleOptions').fillColor !== '#86EFAC';
            
            if (isObstacleIntent && isDrawingObstacleRef.current) {
                if (validateObstacleInMainAreaWithRefs(coordinates)) {
                    const newObstacle: Obstacle = {
                        id: `obstacle-${Date.now()}`,
                        type: selectedObstacleTypeRef.current,
                        coordinates: coordinates,
                        name: selectedObstacleTypeRef.current === 'water_source' ? t('Water Source') : t('Other Obstacle')
                    };
                    
                    setObstacles(prev => [...prev, newObstacle]);
                    
                    const styledPolygon = createEditablePolygon(coordinates, [], true);
                    setObstacleOverlays(prev => [...prev, styledPolygon]);
                    
                    try {
                        setPlantPoints(prev => {
                            const thresholdMeters = 0.5;
                            return prev.filter(pt => {
                                if (!isPointInPolygon(pt, mainAreaRef.current)) return true;
                                if (isPointInPolygon(pt, newObstacle.coordinates)) return false;
                                const d = distanceToPolygonEdge(pt, newObstacle.coordinates);
                                return d > thresholdMeters;
                            });
                        });
                    } catch (e) {
                        console.warn('Failed to remove overlapped plant points:', e);
                    }
                    computeAreaAndPerimeter(mainAreaRef.current, []);
                } else {
                    alert(t('Obstacle must be within the main area'));
                    circle.setMap(null);
                }
                
                setIsDrawingObstacle(false);
                drawingManager.setDrawingMode(null);
                drawingManager.setOptions({
                    circleOptions: {
                        fillColor: '#86EFAC', fillOpacity: 0.3, strokeColor: '#22C55E',
                        strokeWeight: 2, strokeOpacity: 1, editable: true,
                        draggable: false, clickable: true
                    }
                });
                return;
            }

            if (drawnPolygonRef.current != null) { circle.setMap(null); return; }
            setMainArea(coordinates);
            computeAreaAndPerimeter(coordinates, []);
            setIsDrawing(false);
            setIsMainAreaSet(true);
            setIsEditingMainArea(false); // Start in confirm mode
            drawingManager.setDrawingMode(null);
            const prevPoly = drawnPolygonRef.current;
            if (prevPoly) { detachOverlay(prevPoly); }
            const styledPolygon = createEditablePolygon(coordinates, [], false);
            setDrawnPolygon(styledPolygon);
            drawnPolygonRef.current = styledPolygon;
            circle.setMap(null);
        }));
    };

    // ===== EVENT HANDLERS =====
    
    const handleSearch = useCallback((lat: number, lng: number) => {
        setMapCenter([lat, lng]);
        if (map) {
            map.panTo({ lat, lng });
            map.setZoom(17);
        }
    }, [map]);

    // Drawing control functions
    const startDrawing = (shapeType: string) => {
        if (!drawingManagerRef || isMainAreaSet) return;
        
        setIsDrawing(true);
        setSelectedShape(shapeType);
        
        const drawingMode = shapeType === 'rectangle' 
            ? google.maps.drawing.OverlayType.RECTANGLE
            : shapeType === 'circle'
            ? google.maps.drawing.OverlayType.CIRCLE
            : google.maps.drawing.OverlayType.POLYGON;
            
        drawingManagerRef.setDrawingMode(drawingMode);
    };

    const stopDrawing = () => {
        if (!drawingManagerRef) return;
        
        setIsDrawing(false);
        drawingManagerRef.setDrawingMode(null);
    };

    const clearArea = () => {
        setMainArea([]);
        setAreaRai(null);
        setPerimeterMeters(null);
        setIsMainAreaSet(false);
        setIsEditingMainArea(false);
        clearPlantPoints();
        clearObstacles();
        if (drawnPolygon) {
            drawnPolygon.setMap(null);
            setDrawnPolygon(null);
        }
        stopDrawing();
    };

    const confirmMainArea = () => {
        if (drawnPolygonRef.current) {
            drawnPolygonRef.current.setEditable(false);
            drawnPolygonRef.current.setOptions({
                strokeWeight: 3, // Normal stroke weight when confirmed
                strokeColor: '#22C55E'
            });
            setIsEditingMainArea(false);
        }
    };

    const editMainArea = () => {
        if (drawnPolygonRef.current) {
            drawnPolygonRef.current.setEditable(true);
            drawnPolygonRef.current.setOptions({
                strokeWeight: 4, // Thicker stroke weight when editing for better visibility
                strokeColor: '#22C55E'
            });
            setIsEditingMainArea(true);
        }
    };

    const handleDrawingComplete = useCallback((coordinates: Coordinate[], shapeType: string) => {
        if (shapeType === 'polygon' || shapeType === 'rectangle' || shapeType === 'circle') {
            setMainArea(coordinates);
            computeAreaAndPerimeter(coordinates);
        }
    }, [computeAreaAndPerimeter]);

    const handleBackToCropSelection = () => {
        log('Going back to choose-crop - clearing localStorage');
        localStorage.removeItem('fieldCropData');
        router.get('/choose-crop', { crops: selectedCrops.join(',') });
    };

    const handleBack = () => {
        log('Going back to previous step - preserving data');
        // Don't clear localStorage when going back to previous step
        // The data should be preserved for navigation between steps
        router.get('/choose-crop', { crops: selectedCrops.join(',') });
    };

    const handleStepClick = (step: StepData) => {
        if (step.id === activeStep) return;
        if (completed.includes(step.id)) { navigateToStep(step); return; }
        if (step.id > activeStep && completed.includes(step.id - 1)) { navigateToStep(step); return; }
        if (step.id === 1) navigateToStep(step);
    };

    const navigateToStep = (step: StepData) => {
        // Persist current field state so going forward/back preserves the main area and overlays
        try {
            const fieldData = {
                mainArea: mainArea.length >= 3 ? mainArea : [],
                obstacles: obstacles.filter(obs => obs.coordinates.length >= 3),
                plantPoints: plantPoints.filter(point => 
                    point && typeof point.lat === 'number' && typeof point.lng === 'number' && !isNaN(point.lat) && !isNaN(point.lng)
                ),
                areaRai: typeof areaRai === 'number' && !isNaN(areaRai) ? areaRai : null,
                perimeterMeters: typeof perimeterMeters === 'number' && !isNaN(perimeterMeters) ? perimeterMeters : null,
                rotationAngle: typeof rotationAngle === 'number' && !isNaN(rotationAngle) ? rotationAngle : 0,
                rowSpacing: Object.fromEntries(
                    Object.entries(rowSpacing).filter(([, value]) => typeof value === 'number' && !isNaN(value) && value > 0)
                ),
                plantSpacing: Object.fromEntries(
                    Object.entries(plantSpacing).filter(([, value]) => typeof value === 'number' && !isNaN(value) && value > 0)
                ),
                mapCenter: map ? { 
                    lat: map.getCenter()?.lat() || 13.7563, 
                    lng: map.getCenter()?.lng() || 100.5018 
                } : { lat: 13.7563, lng: 100.5018 },
                mapZoom: map ? Math.max(1, Math.min(22, map.getZoom() || 16)) : 16
            };
            localStorage.setItem('fieldCropData', JSON.stringify(fieldData));
        } catch (e) {
            errorLog('Error saving field data before navigation:', e);
        }

        const params = {
            crops: selectedCrops.join(','),
            currentStep: step.id,
            completedSteps: toCompletedStepsCsv(completed)
        };
        router.get(step.route, params);
    };

    const handleContinue = () => {
        // Enforce: 1) main area set, 2) at least one water source, 3) generated plant points
        if (mainArea.length < 3 || !hasWaterSource || plantCount === 0) {
            alert(t('Please set main area, add a water source, and generate plant points before continuing'));
            return;
        }
        const newCompleted = [...completed];
        if (!newCompleted.includes(activeStep)) newCompleted.push(activeStep);
        
        // Validate data before saving
        const fieldData = {
            mainArea: mainArea.length >= 3 ? mainArea : [],
            obstacles: obstacles.filter(obs => obs.coordinates.length >= 3),
            plantPoints: plantPoints.filter(point => 
                point && 
                typeof point.lat === 'number' && 
                typeof point.lng === 'number' && 
                !isNaN(point.lat) && 
                !isNaN(point.lng)
            ),
            areaRai: typeof areaRai === 'number' && !isNaN(areaRai) ? areaRai : null,
            perimeterMeters: typeof perimeterMeters === 'number' && !isNaN(perimeterMeters) ? perimeterMeters : null,
            rotationAngle: typeof rotationAngle === 'number' && !isNaN(rotationAngle) ? rotationAngle : 0,
            rowSpacing: Object.fromEntries(
                Object.entries(rowSpacing).filter(([, value]) => 
                    typeof value === 'number' && !isNaN(value) && value > 0
                )
            ),
            plantSpacing: Object.fromEntries(
                Object.entries(plantSpacing).filter(([, value]) => 
                    typeof value === 'number' && !isNaN(value) && value > 0
                )
            ),
            mapCenter: map ? { 
                lat: map.getCenter()?.lat() || 13.7563, 
                lng: map.getCenter()?.lng() || 100.5018 
            } : { lat: 13.7563, lng: 100.5018 },
            mapZoom: map ? Math.max(1, Math.min(22, map.getZoom() || 16)) : 16
        };
        
        try {
            localStorage.setItem('fieldCropData', JSON.stringify(fieldData));
            log('Field data saved successfully:', fieldData);
        } catch (error) {
            errorLog('Error saving field data to localStorage:', error);
            // Continue without saving if localStorage fails
        }
        
        const params = {
            crops: selectedCrops.join(','),
            currentStep: 2,
            completedSteps: toCompletedStepsCsv(newCompleted)
        };
        log('Sending data to irrigation-generate:', params);
        router.get('/step2-irrigation-system', params);
    };

    const isStepAccessible = (stepId: number): boolean => {
        if (stepId === 1) return true;
        if (stepId === activeStep) return false;
        return completed.includes(stepId) || completed.includes(stepId - 1);
    };

    const getStepStatus = (stepId: number): 'completed' | 'active' | 'accessible' | 'disabled' => {
        if (completed.includes(stepId)) return 'completed';
        if (stepId === activeStep) return 'active';
        if (stepId === 1) return 'accessible';
        if (completed.includes(stepId - 1)) return 'accessible';
        return 'disabled';
    };
    
    const plantCount = useMemo(() => plantPoints.length, [plantPoints]);
    const obstacleCount = useMemo(() => obstacles.length, [obstacles]);
    const hasWaterSource = useMemo(() => obstacles.some(o => o.type === 'water_source'), [obstacles]);

    return (
        <>
            <Head title={t('Initial Area Setup')} />
            
            <div className="min-h-screen text-white overflow-hidden" style={{ backgroundColor: '#000005' }}>
                <Navbar />
                
                <div className="h-[calc(100vh-4rem)] overflow-hidden">
                    <div className="flex h-full">
                        {/* Left Side - Control Panel */}
                        <div className="w-80 border-r border-white flex flex-col" style={{ backgroundColor: '#000005' }}>
                            {/* Header with Step Navigation */}
                            <div className="p-4 border-b border-white">
								<button
									onClick={handleBackToCropSelection}
									className="mb-4 flex items-center text-blue-400 hover:text-blue-300 text-sm"
								>
									<svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
									</svg>
									{t('Back to Crop Selection')}
								</button>
                                
                                <div className="mb-3">
                                    <h1 className="text-lg font-bold text-white">
                                        {steps.find(s => s.id === activeStep)?.title}
                                    </h1>
                                </div>

                                {/* Step Navigation */}
                                <div className="flex items-center justify-between mb-4">
                                    {steps.map((step, index) => {
                                        const status = getStepStatus(step.id);
                                        const isClickable = isStepAccessible(step.id);
                                        
                                        return (
                                            <div key={step.id} className="flex items-center">
                                                <button
                                                    onClick={() => isClickable && handleStepClick(step)}
                                                    disabled={!isClickable}
                                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                                                        status === 'completed' ? 'bg-green-600 text-white cursor-pointer hover:bg-green-500' 
                                                        : status === 'active' ? 'bg-blue-600 text-white cursor-not-allowed'
                                                        : status === 'accessible' ? 'bg-gray-600 text-white hover:bg-gray-500 cursor-pointer'
                                                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {status === 'completed' ? (
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    ) : ( step.id )}
                                                </button>
                                                
                                                {index < steps.length - 1 && (
                                                    <div className={`w-8 h-0.5 mx-2 ${ completed.includes(step.id) ? 'bg-green-600' : 'bg-gray-600'}`}></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-4 space-y-6">
                                    
                                    {/* Selected Crops */}
                                    {selectedCrops.length > 0 && (
                                        <div className="rounded-lg p-4 border border-white">
                                            <h3 className="text-sm font-semibold text-white mb-3">{t('Selected Crops')}</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedCrops.map((crop, idx) => (
                                                    <span key={idx} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                                                        {getTranslatedCropByValue(crop, language as 'en' | 'th')?.name || crop}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Crop Spacing Settings */}
                                    {selectedCrops.length > 0 && (
                                        <div className="rounded-lg p-4 border border-white">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-sm font-semibold text-white">{t('Crop Spacing Settings')}</h3>
                                                <button onClick={resetSpacingToDefaults} className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-500 transition-colors" title={t('Reset Defaults')}>
                                                    ↺ {t('Reset Defaults')}
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                {selectedCrops.map(crop => {
                                                    const spacingInfo = getCropSpacingInfo(crop);
                                                    const isEditingRow = editingRowSpacingForCrop === crop;
                                                    const isEditingPlant = editingPlantSpacingForCrop === crop;
                                                    return (
                                                        <div key={crop} className="border border-gray-600 rounded p-3">
                                                            <div className="text-xs font-semibold text-blue-300 mb-2">{spacingInfo.cropName}</div>
                                                            {/* Row Spacing */}
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs text-gray-400">{t('Row Spacing')}:</span>
                                                                {isEditingRow ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <input type="number" value={tempRowSpacing[crop] || ''}
                                                                            onChange={(e) => setTempRowSpacing(prev => ({...prev, [crop]: e.target.value}))}
                                                                            className="w-16 text-xs bg-gray-700 text-white border border-gray-500 rounded px-1"
                                                                            autoFocus
                                                                            onKeyPress={(e) => { if (e.key === 'Enter') handleRowSpacingConfirm(crop); if (e.key === 'Escape') handleRowSpacingCancel(crop); }}
                                                                        />
                                                                        <button onClick={() => handleRowSpacingConfirm(crop)} className="text-xs text-green-400 hover:text-green-300">✓</button>
                                                                        <button onClick={() => handleRowSpacingCancel(crop)} className="text-xs text-red-400 hover:text-red-300">✗</button>
                                                                    </div>
                                                                ) : (
                                                                    <button onClick={() => handleRowSpacingEdit(crop)}
                                                                        className={`text-xs hover:bg-gray-600 px-1 rounded transition-colors ${spacingInfo.isRowModified ? 'text-yellow-400' : 'text-white'}`}>
                                                                        {spacingInfo.rowSpacing}cm {spacingInfo.isRowModified && ' *'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {/* Plant Spacing */}
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs text-gray-400">{t('Plant Spacing')}:</span>
                                                                {isEditingPlant ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <input type="number" value={tempPlantSpacing[crop] || ''}
                                                                            onChange={(e) => setTempPlantSpacing(prev => ({...prev, [crop]: e.target.value}))}
                                                                            className="w-16 text-xs bg-gray-700 text-white border border-gray-500 rounded px-1"
                                                                            autoFocus
                                                                            onKeyPress={(e) => { if (e.key === 'Enter') handlePlantSpacingConfirm(crop); if (e.key === 'Escape') handlePlantSpacingCancel(crop); }}
                                                                        />
                                                                        <button onClick={() => handlePlantSpacingConfirm(crop)} className="text-xs text-green-400 hover:text-green-300">✓</button>
                                                                        <button onClick={() => handlePlantSpacingCancel(crop)} className="text-xs text-red-400 hover:text-red-300">✗</button>
                                                                    </div>
                                                                ) : (
                                                                    <button onClick={() => handlePlantSpacingEdit(crop)}
                                                                        className={`text-xs hover:bg-gray-600 px-1 rounded transition-colors ${spacingInfo.isPlantModified ? 'text-yellow-400' : 'text-white'}`}>
                                                                        {spacingInfo.plantSpacing}cm {spacingInfo.isPlantModified && ' *'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {/* Plant Density removed as requested */}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-3 text-xs text-yellow-400">* {t('Modified spacing')}</div>
                                        </div>
                                    )}

                                    {/* Main Area Control */}
                                    <div className="rounded-lg p-4 border border-white">
                                        <h3 className="text-sm font-semibold text-white mb-3">🎯 {t('Main Area')}</h3>
                                        {!isMainAreaSet ? (
                                            <div className="space-y-3">
                                                <div className="text-xs text-blue-300 bg-blue-900 bg-opacity-30 p-2 rounded">🔍 {t('Please draw the main farming area using the tools on the map')}</div>
                                                <div className="text-xs text-gray-400">{t('Status')}: <span className="text-yellow-400">{t('Waiting for area')}</span></div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div>
                                                    <div className={`text-xs p-2 rounded mb-3 ${isEditingMainArea ? 'text-yellow-300 bg-yellow-900 bg-opacity-30' : 'text-green-300 bg-green-900 bg-opacity-30'}`}>
                                                        {isEditingMainArea ? '✏️ ' + t('Editing main area shape - drag points to modify') : '✅ ' + t('Main area has been set successfully')}
                                                    </div>
                                                    <div className="space-y-2 text-xs border-t border-gray-700 pt-3">
                                                        <h4 className="text-sm font-semibold text-white mb-2">📊 {t('Field Information')}</h4>
                                                        <div className="flex justify-between text-gray-400"><span>{t('Total Area')}:</span><span>{areaRai !== null ? areaRai.toFixed(2) : '--'} {t('rai')}</span></div>
                                                        <div className="flex justify-between text-gray-400"><span>{t('Perimeter')}:</span><span>{perimeterMeters !== null ? perimeterMeters.toFixed(1) : '--'} {t('meters')}</span></div>
                                                        <div className="flex justify-between text-gray-400"><span>{t('Main Area')}:</span>{mainArea.length >= 3 ? (<span className="text-green-400">✅ {t('Set')}</span>) : (<span className="text-yellow-400">⏳ {t('Not Set')}</span>)}</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {!isEditingMainArea ? (
                                                        <button onClick={editMainArea} className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 transition-colors">✏️ {t('Edit Shape')}</button>
                                                    ) : (
                                                        <button onClick={confirmMainArea} className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-xs hover:bg-green-700 transition-colors">✅ {t('Confirm Shape')}</button>
                                                    )}
                                                    <button onClick={clearArea} className="flex-1 bg-orange-600 text-white px-3 py-2 rounded text-xs hover:bg-orange-700 transition-colors">🗑️ {t('Clear Area')}</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Obstacles Controls */}
                                    <div className="rounded-lg p-4 border border-white">
                                        <h3 className="text-sm font-semibold text-white mb-3">🚧 {t('Obstacles & Features')}</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-xs"><span className="text-gray-400">{t('Total Obstacles')}:</span><span className="text-yellow-300">{obstacleCount}</span></div>
                                            <div className="space-y-2">
                                                <div className="text-xs text-blue-200">💧 {t('Water Source')}:</div>
                                                <div className="grid grid-cols-3 gap-1">
                                                    <button onClick={() => startDrawingObstacle('water_source', 'polygon')} disabled={isDrawingObstacle || !isMainAreaSet} className="bg-blue-600 text-white px-1 py-1 rounded text-xs hover:bg-blue-700 transition-colors disabled:bg-gray-500 flex items-center justify-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 4-4 16-12-20z" /></svg>{t('Polygon')}
                                                    </button>
                                                    <button onClick={() => startDrawingObstacle('water_source', 'rectangle')} disabled={isDrawingObstacle || !isMainAreaSet} className="bg-blue-600 text-white px-1 py-1 rounded text-xs hover:bg-blue-700 transition-colors disabled:bg-gray-500 flex items-center justify-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>{t('Rectangle')}
                                                    </button>
                                                    <button onClick={() => startDrawingObstacle('water_source', 'circle')} disabled={isDrawingObstacle || !isMainAreaSet} className="bg-blue-600 text-white px-1 py-1 rounded text-xs hover:bg-blue-700 transition-colors disabled:bg-gray-500 flex items-center justify-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>{t('Circle')}
                                                    </button>
                                                </div>
                                                <div className="text-xs text-gray-200">🚧 {t('Other obstacles')}:</div>
                                                <div className="grid grid-cols-3 gap-1">
                                                    <button onClick={() => startDrawingObstacle('other', 'polygon')} disabled={isDrawingObstacle || !isMainAreaSet} className="bg-gray-600 text-white px-1 py-1 rounded text-xs hover:bg-gray-700 transition-colors disabled:bg-gray-500 flex items-center justify-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 4-4 16-12-20z" /></svg>{t('Polygon')}
                                                    </button>
                                                    <button onClick={() => startDrawingObstacle('other', 'rectangle')} disabled={isDrawingObstacle || !isMainAreaSet} className="bg-gray-600 text-white px-1 py-1 rounded text-xs hover:bg-gray-700 transition-colors disabled:bg-gray-500 flex items-center justify-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>{t('Rectangle')}
                                                    </button>
                                                    <button onClick={() => startDrawingObstacle('other', 'circle')} disabled={isDrawingObstacle || !isMainAreaSet} className="bg-gray-600 text-white px-1 py-1 rounded text-xs hover:bg-gray-700 transition-colors disabled:bg-gray-500 flex items-center justify-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>{t('Circle')}
                                                    </button>
                                                </div>
                                            </div>
                                            {!isMainAreaSet && (
                                                <div className="text-xs text-orange-300 bg-orange-900 bg-opacity-30 p-2 rounded">🔒 {t('Please set main area before adding obstacles')}</div>
                                            )}
                                            {isDrawingObstacle && (<button onClick={stopDrawingObstacle} className="w-full bg-red-600 text-white px-3 py-2 rounded text-xs hover:bg-red-700 transition-colors">{t('Cancel Drawing')}</button>)}
                                            {obstacleCount > 0 && (
                                                <>
                                                    <div className="text-xs text-blue-300 bg-blue-900 bg-opacity-30 p-2 rounded">🔍 {t('Obstacle Layers')}</div>
                                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                                        {obstacles.map((obstacle, index) => (
                                                            <div key={obstacle.id} className="flex items-center justify-between bg-gray-800 p-2 rounded text-xs border-l-4" style={{ borderLeftColor: obstacle.type === 'water_source' ? '#3b82f6' : '#6b7280' }}>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-lg">{obstacle.type === 'water_source' ? '💧' : '🚧'}</span>
                                                                    <div>
                                                                        <div className="text-white font-medium">{obstacle.type === 'water_source' ? t('Water Source') : t('Obstacle')} {index + 1}</div>
                                                                        <div className="text-gray-400 text-xs">{obstacle.coordinates.length} {t('points')}</div>
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => deleteObstacle(obstacle.id)} className="text-red-400 hover:text-red-300 px-2 py-1 hover:bg-red-900 hover:bg-opacity-30 rounded" title={t('Delete obstacle')}>🗑️</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button onClick={clearObstacles} className="w-full bg-red-600 text-white px-3 py-2 rounded text-xs hover:bg-red-700 transition-colors">🗑️ {t('Clear All Obstacles')}</button>
                                                </>
                                            )}
                                            {obstacleCount === 0 && isMainAreaSet && (<div className="text-xs text-orange-300 bg-orange-900 bg-opacity-30 p-2 rounded">💡 {t('Draw obstacles like water sources, rocks, or buildings within the main area')}</div>)}
                                        </div>
                                    </div>

                                    {/* Plant Points Controls */}
                                    <div className="rounded-lg p-4 border border-white">
                                        <h3 className="text-sm font-semibold text-white mb-3">🌱 {t('Plant Points')}</h3>
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <button onClick={handleGeneratePlantPoints} disabled={isGeneratingPlants || !isMainAreaSet} className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-xs hover:bg-green-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">{isGeneratingPlants ? t('Generating...') : t('Generate Plants')}</button>
                                                {plantCount > 0 && (<button onClick={clearPlantPoints} className="bg-red-600 text-white px-3 py-2 rounded text-xs hover:bg-red-700 transition-colors">{t('Clear')}</button>)}
                                            </div>
                                            {!isMainAreaSet && (
                                                <div className="text-xs text-orange-300 bg-orange-900 bg-opacity-30 p-2 rounded">🔒 {t('Please set main area before generating plants')}</div>
                                            )}
                                            <div className="flex items-center justify-between text-xs"><span className="text-gray-400">{t('Generated Points')}:</span><span className="text-green-300">{plantCount}</span></div>
                                            {waterRequirementInfo.total !== null && (<div className="text-xs text-blue-300 bg-blue-900 bg-opacity-30 p-2 rounded">💧 {t('Total Water Requirement')}: {waterRequirementInfo.total?.toFixed(2)} {t('ลิตร/ครั้ง')}</div>)}
                                            {plantCount > 0 && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-xs"><span className="text-gray-400">{t('Rotate Plants')}:</span><span className="text-yellow-300">{rotationAngle.toFixed(0)}°</span></div>
                                                    <input type="range" min={-180} max={180} step={1} value={rotationAngle} onChange={(e) => handleRotationChange(parseInt(e.target.value))} className="w-full" />
                                                </div>
                                            )}
                                            {plantCount > 0 && (<div className="text-xs text-blue-300 bg-blue-900 bg-opacity-30 p-2 rounded">💡 {t('Points are placed with 30% buffer from edges for optimal growth')}</div>)}
                                            {plantCount === 0 && (<div className="text-xs text-green-300 bg-green-900 bg-opacity-30 p-2 rounded">🌱 {t('Generate optimal planting positions based on your crop spacing settings')}</div>)}
                                        </div>
                                    </div>
                                </div>
                            </div>

							{/* Bottom Action Buttons */}
							<div className="p-4 border-t border-white">
								<div className="flex gap-2">
									<button onClick={handleBack} className="flex-1 px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 transition-colors">{t('Back')}</button>
									<button onClick={() => {
                                            log('Resetting initial area - clearing drawn areas but keeping crops');
                                            setMainArea([]); setAreaRai(null); setPerimeterMeters(null);
                                            setIsMainAreaSet(false); setPlantPoints([]); setRotationAngle(0);
                                            setObstacles([]); setRowSpacing({}); setPlantSpacing({});
                                            setMapCenter([13.7563, 100.5018]); setMapZoom(16);
                                            if (map) {
                                                if (drawnPolygonRef.current) { detachOverlay(drawnPolygonRef.current); drawnPolygonRef.current = null; }
                                                obstacleOverlaysRef.current.forEach(overlay => overlay.setMap(null)); setObstacleOverlays([]);
                                                clearAllPlantMarkers();
                                                Object.values(distanceOverlaysByObstacleRef.current).forEach(({ lines, labels }) => {
                                                    lines.forEach(l => l.setMap(null));
                                                    labels.forEach(lb => lb.setMap(null));
                                                });
                                                setDistanceOverlaysByObstacle({});
                                            }
                                            localStorage.removeItem('fieldCropData');
                                        }} className="flex-1 px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-500 transition-colors">
										{t('Reset')}
									</button>
                                    <button onClick={handleContinue} disabled={mainArea.length < 3 || !hasWaterSource || plantCount === 0} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">{t('Next')}</button>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Google Map */}
                        <div className="flex-1 relative">
                            <div className="absolute inset-0 border border-white" style={{ backgroundColor: '#000005' }}>
                                <HorticultureMapComponent center={mapCenter} zoom={mapZoom} onMapLoad={handleMapLoad} mapOptions={{ maxZoom: 22 }} >
                                    <EnhancedHorticultureSearchControl onPlaceSelect={handleSearch} placeholder="🔍 ค้นหาสถานที่..." />
                                    <HorticultureDrawingManager editMode={null} onCreated={handleDrawingComplete} isEditModeEnabled={true} mainArea={mainArea} />

                                    {/* Drawing Tools Overlay - Only show for main area drawing */}
                                    {!isMainAreaSet && (
                                        <div className="absolute left-4 top-16 z-10 bg-black bg-opacity-80 rounded-lg border border-white p-2 shadow-lg pointer-events-none">
                                            <h4 className="text-white text-xs font-semibold mb-1">🎯 {t('Drawing Tools')}</h4>
                                            <div className="flex flex-col gap-1 pointer-events-auto">
                                                <button onClick={() => startDrawing('polygon')} disabled={isDrawing} className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${isDrawing && selectedShape === 'polygon' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'} disabled:opacity-50`}>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 4-4 16-12-20z" /></svg>{t('Polygon')}
                                                </button>
                                                <button onClick={() => startDrawing('rectangle')} disabled={isDrawing} className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${isDrawing && selectedShape === 'rectangle' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'} disabled:opacity-50`}>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>{t('Rectangle')}
                                                </button>
                                                <button onClick={() => startDrawing('circle')} disabled={isDrawing} className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${isDrawing && selectedShape === 'circle' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'} disabled:opacity-50`}>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>{t('Circle')}
                                                </button>
                                                {isDrawing && (<button onClick={stopDrawing} className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>{t('Cancel')}</button>)}
                                            </div>
                                        </div>
                                    )}
                                    <DistanceMeasurementOverlay map={map} isActive={false} editMode={'mainArea'} />
                                </HorticultureMapComponent>

                                {/* Overlays */}
                                {isDrawing && !isMainAreaSet && (
                                    <div className="absolute left-4 bottom-4 z-10 bg-blue-900 bg-opacity-90 rounded-lg border border-blue-500 p-3 shadow-lg pointer-events-none">
                                        <div className="text-sm text-white text-center">
                                            <div className="mb-1 font-semibold">🎯 {t('Drawing Mode Active')}</div>
                                            <div className="text-xs text-blue-200">{selectedShape === 'polygon' ? t('Click points to draw polygon, double-click to finish') : selectedShape === 'rectangle' ? t('Click and drag to draw rectangle') : t('Click and drag to draw circle')}</div>
                                        </div>
                                    </div>
                                )}
                                {isEditingMainArea && (
                                    <div className="absolute left-4 bottom-4 z-10 bg-yellow-900 bg-opacity-90 rounded-lg border border-yellow-500 p-3 shadow-lg pointer-events-none">
                                        <div className="text-sm text-white text-center">
                                            <div className="mb-1 font-semibold">✏️ {t('Editing Main Area')}</div>
                                            <div className="text-xs text-yellow-200">{t('Drag the white points to modify the shape')}</div>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute bottom-4 right-20 z-10 pointer-events-none"><div className="px-2 py-1 rounded bg-black bg-opacity-70 border border-white text-xs text-white">{t('Zoom Level')}: {mapZoom}</div></div>
                                {isDrawingObstacle && (
                                    <div className="absolute left-4 bottom-4 z-10 bg-purple-900 bg-opacity-90 rounded-lg border border-purple-500 p-3 shadow-lg pointer-events-none">
                                        <div className="text-sm text-white text-center">
                                            <div className="mb-1 font-semibold">🚧 {t('Drawing Obstacle')}</div>
                                            <div className="text-xs text-purple-200">{t('Drawing')}: {selectedObstacleType.replace('_', ' ')} ({selectedObstacleShape})</div>
                                            <div className="text-xs text-purple-200">
                                                {selectedObstacleShape === 'polygon' ? t('Click points to draw polygon, double-click to finish') : 
                                                 selectedObstacleShape === 'rectangle' ? t('Click and drag to draw rectangle') : 
                                                 t('Click and drag to draw circle')}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {isGeneratingPlants && (
                                    <div className="absolute right-4 bottom-4 z-10 bg-green-900 bg-opacity-90 rounded-lg border border-green-500 p-3 shadow-lg pointer-events-none">
                                        <div className="text-sm text-white text-center">
                                            <div className="mb-1 font-semibold">🌱 {t('Generating Plants')}</div>
                                            <div className="text-xs text-green-200">{t('Calculating optimal plant positions...')}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
