import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Head } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { useLanguage } from '../../contexts/LanguageContext';
import Navbar from '../../components/Navbar';
import HorticultureMapComponent from '../../components/horticulture/HorticultureMapComponent';
import HorticultureDrawingManager from '../../components/horticulture/HorticultureDrawingManager';
import EnhancedHorticultureSearchControl from '../../components/horticulture/HorticultureSearchControl';
import DistanceMeasurementOverlay from '../../components/horticulture/DistanceMeasurementOverlay';
import { getCropByValue, getTranslatedCropByValue } from './choose-crop';

interface InitialAreaProps {
    crops?: string;
    currentStep?: number;
    completedSteps?: string;
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

// Obstacle interface
interface Obstacle {
    id: string;
    type: 'water_source' | 'other';
    coordinates: { lat: number; lng: number }[];
    name?: string;
}

export default function InitialArea({ crops, currentStep = 1, completedSteps = '' }: InitialAreaProps) {
	const { t, language } = useLanguage();
    const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
    const [completed, setCompleted] = useState<number[]>([]);
    const activeStep = currentStep;

    // Spacing states
    const [rowSpacing, setRowSpacing] = useState<Record<string, number>>({});
    const [plantSpacing, setPlantSpacing] = useState<Record<string, number>>({});
    const [tempRowSpacing, setTempRowSpacing] = useState<Record<string, string>>({});
    const [tempPlantSpacing, setTempPlantSpacing] = useState<Record<string, string>>({});
    const [editingRowSpacingForCrop, setEditingRowSpacingForCrop] = useState<string | null>(null);
    const [editingPlantSpacingForCrop, setEditingPlantSpacingForCrop] = useState<string | null>(null);

    type Coordinate = { lat: number; lng: number };
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([13.7563, 100.5018]);
    const [mapZoom, setMapZoom] = useState<number>(16);
    const [mainArea, setMainArea] = useState<Coordinate[]>([]);
    const [areaRai, setAreaRai] = useState<number | null>(null);
    const [perimeterMeters, setPerimeterMeters] = useState<number | null>(null);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [drawingManagerRef, setDrawingManagerRef] = useState<google.maps.drawing.DrawingManager | null>(null);
    const [selectedShape, setSelectedShape] = useState<string>('polygon');
    const [drawnPolygon, setDrawnPolygon] = useState<google.maps.Polygon | null>(null);
    const [isMainAreaSet, setIsMainAreaSet] = useState<boolean>(false);

    // Plant points and obstacles states
    const [plantPoints, setPlantPoints] = useState<PlantPoint[]>([]);
    const [rotationAngle, setRotationAngle] = useState<number>(0);
    const [obstacles, setObstacles] = useState<Obstacle[]>([]);
    const [isGeneratingPlants, setIsGeneratingPlants] = useState<boolean>(false);
	const [isDrawingObstacle, setIsDrawingObstacle] = useState<boolean>(false);
	const [selectedObstacleType, setSelectedObstacleType] = useState<'water_source' | 'other'>('water_source');
    const [, setPlantPointMarkers] = useState<google.maps.Marker[]>([]);
    const [obstacleOverlays, setObstacleOverlays] = useState<google.maps.Polygon[]>([]);
    const [distanceOverlaysByObstacle, setDistanceOverlaysByObstacle] = useState<Record<string, { lines: google.maps.Polyline[]; labels: google.maps.Marker[] }>>({});

    // Refs to avoid stale state inside Google Maps listeners
    const isMainAreaSetRef = useRef<boolean>(isMainAreaSet);
    const mainAreaRef = useRef<Coordinate[]>(mainArea);
    const obstaclesRef = useRef<Obstacle[]>(obstacles);
    const drawnPolygonRef = useRef<google.maps.Polygon | null>(drawnPolygon);
    const selectedObstacleTypeRef = useRef<'water_source' | 'other'>(selectedObstacleType);
    const renderIdRef = useRef<number>(0);
    const plantPointMarkersRef = useRef<google.maps.Marker[]>([]);

    useEffect(() => { isMainAreaSetRef.current = isMainAreaSet; }, [isMainAreaSet]);
    useEffect(() => { mainAreaRef.current = mainArea; }, [mainArea]);
    useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);
    useEffect(() => { drawnPolygonRef.current = drawnPolygon; }, [drawnPolygon]);
    useEffect(() => { selectedObstacleTypeRef.current = selectedObstacleType; }, [selectedObstacleType]);

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
        } catch {
            setAreaRai(null);
            setPerimeterMeters(null);
        }
    }, []);

    // Helper functions to extract coordinates from Google Maps shapes
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

    // Utility function to check if point is inside polygon (CPU-based calculation)
    const isPointInPolygon = useCallback((point: Coordinate, polygon: Coordinate[]): boolean => {
        let inside = false;
        const x = point.lat;
        const y = point.lng;
        
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lat;
            const yi = polygon[i].lng;
            const xj = polygon[j].lat;
            const yj = polygon[j].lng;
            
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        return inside;
    }, []);

    // Calculate distance from point to polygon edge (CPU-based)
    const distanceToPolygonEdge = useCallback((point: Coordinate, polygon: Coordinate[]): number => {
        let minDistance = Infinity;
        
        for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            const edge1 = polygon[i];
            const edge2 = polygon[j];
            
            // Distance from point to line segment (simplified for performance)
            const A = point.lat - edge1.lat;
            const B = point.lng - edge1.lng;
            const C = edge2.lat - edge1.lat;
            const D = edge2.lng - edge1.lng;
            
            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;
            
            if (lenSq !== 0) {
                param = dot / lenSq;
            }
            
            let xx, yy;
            if (param < 0) {
                xx = edge1.lat;
                yy = edge1.lng;
            } else if (param > 1) {
                xx = edge2.lat;
                yy = edge2.lng;
            } else {
                xx = edge1.lat + param * C;
                yy = edge1.lng + param * D;
            }
            
            const dx = point.lat - xx;
            const dy = point.lng - yy;
            const distance = Math.sqrt(dx * dx + dy * dy) * 111000; // Convert to meters
            
            minDistance = Math.min(minDistance, distance);
        }
        
        return minDistance;
    }, []);

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

    // Old non-oriented generator removed in favor of oriented generation

    // Create optimized markers for plant points (CPU-based rendering)
    const createPlantMarkers = useCallback(async (points: PlantPoint[], renderId: number) => {
        if (!map) return [] as google.maps.Marker[];
        
        const markers: google.maps.Marker[] = [];
        
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
        for (let i = 0; i < points.length; i += batchSize) {
            if (renderIdRef.current !== renderId) {
                // Cancel: remove any markers created in this run
                markers.forEach(m => m.setMap(null));
                return [] as google.maps.Marker[];
            }
            const batch = points.slice(i, i + batchSize);
            for (const point of batch) {
                if (renderIdRef.current !== renderId) {
                    markers.forEach(m => m.setMap(null));
                    return [] as google.maps.Marker[];
                }
                const marker = new google.maps.Marker({
                    position: { lat: point.lat, lng: point.lng },
                    map: map,
                    icon: plantIcon,
                    title: `Plant: ${point.cropType}`,
                    optimized: true,
                    clickable: false
                });
                markers.push(marker);
            }
            await new Promise(resolve => setTimeout(resolve, 1));
        }
        return markers;
    }, [map]);

    // Update existing markers' positions for real-time rotation
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
        let inside = false;
        const x = point.x;
        const y = point.y;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }, []);

    const distanceToPolygonEdgeXY = useCallback((point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): number => {
        let minDistance = Infinity;
        for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            const e1 = polygon[i];
            const e2 = polygon[j];
            const A = point.x - e1.x;
            const B = point.y - e1.y;
            const C = e2.x - e1.x;
            const D = e2.y - e1.y;
            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;
            if (lenSq !== 0) param = dot / lenSq;
            let xx, yy;
            if (param < 0) { xx = e1.x; yy = e1.y; }
            else if (param > 1) { xx = e2.x; yy = e2.y; }
            else { xx = e1.x + param * C; yy = e1.y + param * D; }
            const dx = point.x - xx;
            const dy = point.y - yy;
            const distance = Math.sqrt(dx * dx + dy * dy);
            minDistance = Math.min(minDistance, distance);
        }
        return minDistance;
    }, []);

    // Oriented generation in real-time
    const generatePlantPointsOriented = useCallback(async (angleDeg: number): Promise<PlantPoint[]> => {
        if (mainArea.length < 3 || selectedCrops.length === 0) return [];

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
        let rowIndex = 0;
        for (let y = minY; y <= maxY; y += rowSpacingM) {
            let plantIndex = 0;
            for (let x = minX; x <= maxX; x += plantSpacingM) {
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
                            id: `plant_${rowIndex}_${plantIndex}`,
                            lat: latLng.lat,
                            lng: latLng.lng,
                            cropType: primaryCrop,
                            isValid: true,
                        });
                    }
                }
                plantIndex++;
            }
            rowIndex++;
            if (rowIndex % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
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
                label: { text, color: '#ffffff', fontSize: '10px' },
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
            const mid = { x: (aXY.x + bXY.x) / 2, y: (aXY.y + bXY.y) / 2 };
            const meters = Math.hypot(bXY.x - aXY.x, bXY.y - aXY.y);
            const label = makeLabelMarker(toLatLngFromXY(mid, origin), `${meters.toFixed(1)} m`);
            overlays.labels.push(label);
        };

        if (isFinite(xLeftObs) && isFinite(xLeftMain) && xLeftMain < xLeftObs) {
            addLine({ x: xLeftMain, y: cxy.y }, { x: xLeftObs, y: cxy.y });
        }
        if (isFinite(xRightObs) && isFinite(xRightMain) && xRightMain > xRightObs) {
            addLine({ x: xRightObs, y: cxy.y }, { x: xRightMain, y: cxy.y });
        }
        if (isFinite(yBottomObs) && isFinite(yBottomMain) && yBottomMain < yBottomObs) {
            addLine({ x: cxy.x, y: yBottomMain }, { x: cxy.x, y: yBottomObs });
        }
        if (isFinite(yTopObs) && isFinite(yTopMain) && yTopMain > yTopObs) {
            addLine({ x: cxy.x, y: yTopObs }, { x: cxy.x, y: yTopMain });
        }

        setDistanceOverlaysByObstacle(prev => ({ ...prev, [obstacle.id]: overlays }));
    }, [map, mainArea, computeCentroid, toLocalXY, toLatLngFromXY]);

    // Handle plant point generation
    const handleGeneratePlantPoints = useCallback(async () => {
        if (!isMainAreaSet || selectedCrops.length === 0) {
            alert(t('Please set main area and select crops first'));
            return;
        }
        
        setIsGeneratingPlants(true);
        
        try {
            const currentRenderId = ++renderIdRef.current;
            // Clear previous markers immediately
            plantPointMarkersRef.current.forEach(m => m.setMap(null));
            setPlantPointMarkers([]);
            plantPointMarkersRef.current = [];

            const points = await generatePlantPointsOriented(rotationAngle);
            setPlantPoints(points);
            
            const markers = await createPlantMarkers(points, currentRenderId);
            if (renderIdRef.current === currentRenderId) {
                setPlantPointMarkers(markers);
                plantPointMarkersRef.current = markers;
            } else {
                // Late result; dispose
                markers.forEach(m => m.setMap(null));
            }
        } catch (error) {
            console.error('Error generating plant points:', error);
            alert(t('Error generating plant points'));
        } finally {
            setIsGeneratingPlants(false);
        }
    }, [isMainAreaSet, selectedCrops, rotationAngle, generatePlantPointsOriented, createPlantMarkers, t]);

    // Clear plant points
    const clearPlantPoints = useCallback(() => {
        setPlantPoints([]);
        setRotationAngle(0);
        plantPointMarkersRef.current.forEach(marker => marker.setMap(null));
        setPlantPointMarkers([]);
        plantPointMarkersRef.current = [];
    }, []);

    // Rotation change handler (enabled only after generation)
    const handleRotationChange = useCallback((newAngle: number) => {
        setRotationAngle(newAngle);
        if (!isMainAreaSet || selectedCrops.length === 0) return;
        // Re-generate grid with orientation, then re-render markers in place
        (async () => {
            const currentRenderId = ++renderIdRef.current;
            // Clear existing markers instantly to avoid accumulation
            plantPointMarkersRef.current.forEach(m => m.setMap(null));
            setPlantPointMarkers([]);
            plantPointMarkersRef.current = [];

            const points = await generatePlantPointsOriented(newAngle);
            if (renderIdRef.current !== currentRenderId) return; // Outdated
            setPlantPoints(points);
            const markers = await createPlantMarkers(points, currentRenderId);
            if (renderIdRef.current === currentRenderId) {
                setPlantPointMarkers(markers);
                plantPointMarkersRef.current = markers;
            } else {
                markers.forEach(m => m.setMap(null));
            }
        })();
    }, [isMainAreaSet, selectedCrops, generatePlantPointsOriented, createPlantMarkers]);

    // Water requirement info based on primary crop and current plant count
    const waterRequirementInfo = useMemo(() => {
        if (selectedCrops.length === 0) return { perPlant: null as number | null, total: null as number | null };
        const primary = getCropByValue(selectedCrops[0]);
        if (!primary) return { perPlant: null as number | null, total: null as number | null };
        const perPlant = primary.waterRequirement; // liters/plant/day
        const total = plantPoints.length * perPlant;
        return { perPlant, total };
    }, [selectedCrops, plantPoints.length]);

    // Clear obstacles function
    const clearObstacles = useCallback(() => {
        setObstacles([]);
        obstacleOverlays.forEach(overlay => overlay.setMap(null));
        setObstacleOverlays([]);
        // clear distance overlays
        Object.values(distanceOverlaysByObstacle).forEach(({ lines, labels }) => {
            lines.forEach(l => l.setMap(null));
            labels.forEach(lb => lb.setMap(null));
        });
        setDistanceOverlaysByObstacle({});
        // update main polygon paths to remove holes
        if (drawnPolygon && mainArea.length >= 3) {
            drawnPolygon.setPaths([mainArea]);
            computeAreaAndPerimeter(mainArea, []);
        }
    }, [obstacleOverlays, drawnPolygon, mainArea, computeAreaAndPerimeter, distanceOverlaysByObstacle]);

    // Delete specific obstacle function
    const deleteObstacle = useCallback((obstacleId: string) => {
        const obstacleIndex = obstacles.findIndex(obs => obs.id === obstacleId);
        if (obstacleIndex !== -1) {
            // Remove overlay from map
            if (obstacleOverlays[obstacleIndex]) {
                obstacleOverlays[obstacleIndex].setMap(null);
            }
            
            // Update states
            setObstacles(prev => prev.filter(obs => obs.id !== obstacleId));
            setObstacleOverlays(prev => prev.filter((_, index) => index !== obstacleIndex));
            // Update holes on main polygon
            const remaining = obstacles.filter(obs => obs.id !== obstacleId).map(o => o.coordinates);
            if (drawnPolygon && mainArea.length >= 3) {
                drawnPolygon.setPaths([mainArea, ...remaining]);
                computeAreaAndPerimeter(mainArea, remaining);
            }
        }
    }, [obstacles, obstacleOverlays, drawnPolygon, mainArea, computeAreaAndPerimeter]);

    // Obstacle drawing functions
	const startDrawingObstacle = useCallback((obstacleType: typeof selectedObstacleType) => {
        if (!drawingManagerRef || !isMainAreaSet) return;
        
		setIsDrawingObstacle(true);
		setSelectedObstacleType(obstacleType);

		// Update drawing colors to match obstacle type while drawing
		const obstacleColors = obstacleType === 'water_source'
			? { fill: '#3b82f6', stroke: '#1d4ed8' }
			: { fill: '#6b7280', stroke: '#374151' };
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
			}
		});

		drawingManagerRef.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
	}, [drawingManagerRef, isMainAreaSet]);

	const stopDrawingObstacle = useCallback(() => {
        if (!drawingManagerRef) return;
        
		setIsDrawingObstacle(false);
        drawingManagerRef.setDrawingMode(null);
		// Restore default polygon options for non-obstacle drawings
		drawingManagerRef.setOptions({
			polygonOptions: {
				fillColor: '#86EFAC',
				fillOpacity: 0.3,
				strokeColor: '#22C55E',
				strokeWeight: 2,
				strokeOpacity: 1,
				editable: true,
				draggable: false,
				clickable: true
			}
		});
    }, [drawingManagerRef]);

    // Improved obstacle validation is handled inside map listeners using refs to avoid stale state

    // Removed: separate obstacle overlay not used; obstacles are modeled as holes in the main polygon

    const steps: StepData[] = [
        {
            id: 1,
            key: 'area-creating',
            title: t('Area Creating'),
            description: t('Set up the initial area for your field'),
            route: '/initial-area'
        },
        {
            id: 2,
            key: 'irrigation-generate',
            title: t('Irrigation Generate'),
            description: t('Generate irrigation system and settings'),
            route: '/irrigation-generate'
        },
        {
            id: 3,
            key: 'zone-obstacle',
            title: t('Zone Obstacle'),
            description: t('Define zones and obstacles'),
            route: '/zone-obstacle'
        },
        {
            id: 4,
            key: 'pipe-generate',
            title: t('Pipe Generate'),
            description: t('Generate pipe layout and connections'),
            route: '/pipe-generate'
        }
    ];

    // Initialize spacing data when crops change
	useEffect(() => {
		if (crops) {
			const cropList = crops.split(',').filter(crop => crop.trim());
			setSelectedCrops(cropList);
			
			// Initialize spacing defaults from crop data when not yet set
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
			const completedArray = completedSteps.split(',').map(Number).filter(Boolean);
			setCompleted(completedArray);
		}
	}, [crops, completedSteps]);

    // Spacing handlers
    const handleRowSpacingEdit = (cropValue: string) => {
        setTempRowSpacing(prev => ({ 
            ...prev, 
            [cropValue]: (rowSpacing[cropValue] || 50).toString() 
        }));
        setEditingRowSpacingForCrop(cropValue);
    };

    const handleRowSpacingConfirm = (cropValue: string) => {
        const newValue = parseFloat(tempRowSpacing[cropValue] || '0');
        if (newValue >= 5 && newValue <= 300) {
            setRowSpacing(prev => ({ ...prev, [cropValue]: newValue }));
            setEditingRowSpacingForCrop(null);
            setTempRowSpacing(prev => {
                const updated = { ...prev };
                delete updated[cropValue];
                return updated;
            });
            // Row spacing updated successfully
        } else {
            alert(t('Row spacing should be between 5cm and 300cm'));
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
        const newValue = parseFloat(tempPlantSpacing[cropValue] || '0');
        if (newValue >= 5 && newValue <= 200) {
            setPlantSpacing(prev => ({ ...prev, [cropValue]: newValue }));
            setEditingPlantSpacingForCrop(null);
            setTempPlantSpacing(prev => {
                const updated = { ...prev };
                delete updated[cropValue];
                return updated;
            });
            // Plant spacing updated successfully
        } else {
            alert(t('Plant spacing should be between 5cm and 200cm'));
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
        loadedMap.addListener('zoom_changed', () => {
            setMapZoom(loadedMap.getZoom() || 16);
        });

        // Initialize drawing manager
        if (window.google?.maps?.drawing) {
            const drawingManager = new google.maps.drawing.DrawingManager({
                drawingMode: null,
                drawingControl: false,
                polygonOptions: {
                    fillColor: '#86EFAC',
                    fillOpacity: 0.3,
                    strokeColor: '#22C55E',
                    strokeWeight: 2,
                    strokeOpacity: 1,
                    editable: true,
                    draggable: false,
                },
                rectangleOptions: {
                    fillColor: '#86EFAC',
                    fillOpacity: 0.3,
                    strokeColor: '#22C55E',
                    strokeWeight: 2,
                    strokeOpacity: 1,
                    editable: true,
                    draggable: false,
                },
                circleOptions: {
                    fillColor: '#86EFAC',
                    fillOpacity: 0.3,
                    strokeColor: '#22C55E',
                    strokeWeight: 2,
                    strokeOpacity: 1,
                    editable: true,
                    draggable: false,
                },
            });

            drawingManager.setMap(loadedMap);
            setDrawingManagerRef(drawingManager);

            // Helper to create an editable polygon (supports holes) and keep area/perimeter in sync while editing
            const createEditablePolygon = (coordinates: Coordinate[], holes: Coordinate[][] = []) => {
                const styledPolygon = new google.maps.Polygon({
                    paths: [coordinates, ...holes],
                    fillColor: '#86EFAC',
                    fillOpacity: 0.3,
                    strokeColor: '#22C55E',
                    strokeWeight: 2,
                    strokeOpacity: 1,
                    editable: true,
                    draggable: false,
                    clickable: true,
                });

                styledPolygon.setMap(loadedMap);

                // Only outer ring is editable; holes update from obstacle state
                const paths = styledPolygon.getPaths();
                const outerPath = paths.getAt(0);
                const syncFromPolygonPath = () => {
                    const updated: Coordinate[] = [];
                    for (let i = 0; i < outerPath.getLength(); i++) {
                        const latLng = outerPath.getAt(i);
                        updated.push({ lat: latLng.lat(), lng: latLng.lng() });
                    }
                    setMainArea(updated);
                    // Do not subtract obstacles from area; they are visual overlays/exclusions only
                    computeAreaAndPerimeter(updated, []);
                };

                outerPath.addListener('set_at', syncFromPolygonPath);
                outerPath.addListener('insert_at', syncFromPolygonPath);
                outerPath.addListener('remove_at', syncFromPolygonPath);
                styledPolygon.addListener('dragstart', () => {
                    loadedMap.setOptions({ draggable: false });
                });
                styledPolygon.addListener('dragend', () => {
						loadedMap.setOptions({ draggable: true });
                    syncFromPolygonPath();
                });

                return styledPolygon;
            };

            // Validator using refs to avoid stale closures
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
                    } catch {
                        // fall through to CPU method
                    }
                }

                const edgeToleranceMeters = 2.0;
                return obstacleCoords.every(point => {
                    if (isPointInPolygon(point, mainAreaRef.current)) {
                        return true;
                    }
                    const distanceToEdge = distanceToPolygonEdge(point, mainAreaRef.current);
                    return distanceToEdge <= edgeToleranceMeters;
                });
            };

            // Add shape completion listeners
            drawingManager.addListener('polygoncomplete', (polygon: google.maps.Polygon) => {
                const coordinates = extractCoordinatesFromPolygon(polygon);
                const isObstacleIntent = drawingManager.get('polygonOptions').fillColor !== '#86EFAC';
                
                // Case 1: Drawing an OBSTACLE. Requires a main area to exist and the intent must be for an obstacle.
                if (isMainAreaSetRef.current && isObstacleIntent) {
                    if (validateObstacleInMainAreaWithRefs(coordinates)) {
                        const newObstacle: Obstacle = {
                            id: `obstacle_${Date.now()}`,
                            type: selectedObstacleTypeRef.current,
                            coordinates: coordinates,
                            name: `${selectedObstacleTypeRef.current}_${obstaclesRef.current.length + 1}`
                        };
                        // Keep the drawn polygon as a visual overlay (excluded area)
                        const obstacleColors = newObstacle.type === 'water_source'
                            ? { fill: '#3b82f6', stroke: '#1d4ed8' }
                            : { fill: '#6b7280', stroke: '#374151' };
                        polygon.setOptions({
                            fillColor: obstacleColors.fill,
                            strokeColor: obstacleColors.stroke,
                            fillOpacity: 0.4,
                            strokeOpacity: 1,
                            strokeWeight: 2,
                            editable: false,
                            draggable: false,
                            clickable: true
                        });

                        setObstacles(prev => [...prev, newObstacle]);
                        setObstacleOverlays(prev => [...prev, polygon]);
                        if (newObstacle.type === 'water_source') {
                            createDistanceOverlaysForWaterObstacle(newObstacle);
                        }
                        // Area/perimeter remain based on main area only
                        computeAreaAndPerimeter(mainAreaRef.current, []);
                    } else {
                        alert(t('Obstacle must be within the main area'));
                        polygon.setMap(null);
                    }
                    
                    // Reset drawing state and options directly
                    setIsDrawingObstacle(false);
                    drawingManager.setDrawingMode(null);
                    drawingManager.setOptions({
                        polygonOptions: {
                            fillColor: '#86EFAC',
                            fillOpacity: 0.3,
                            strokeColor: '#22C55E',
                            strokeWeight: 2,
                            strokeOpacity: 1,
                            editable: true,
                            draggable: false,
                            clickable: true
                        }
                    });
                    return; // Explicitly exit
                }

                // Case 2: Drawing the MAIN AREA. Requires NO main area to exist.
                if (!isMainAreaSetRef.current) {
                    setMainArea(coordinates);
                    computeAreaAndPerimeter(coordinates, []);
                    setIsDrawing(false);
                    setIsMainAreaSet(true);
                    drawingManager.setDrawingMode(null);
                    
                    if (drawnPolygonRef.current) {
                        drawnPolygonRef.current.setMap(null);
                    }

                    const styledPolygon = createEditablePolygon(coordinates, []);
                    setDrawnPolygon(styledPolygon);
                    drawnPolygonRef.current = styledPolygon;
                    polygon.setMap(null);
                    return; // Explicitly exit
                }

                // Fallback Case: If we reach here, the drawing was invalid (e.g., a second main area).
                polygon.setMap(null);
                stopDrawingObstacle(); // Reset any weird state just in case
            });

            drawingManager.addListener('rectanglecomplete', (rectangle: google.maps.Rectangle) => {
                if (isMainAreaSetRef.current) {
                    rectangle.setMap(null);
                    return;
                }
                
                const coordinates = extractCoordinatesFromRectangle(rectangle);
                setMainArea(coordinates);
                computeAreaAndPerimeter(coordinates, []);
                setIsDrawing(false);
                setIsMainAreaSet(true);
                drawingManager.setDrawingMode(null);
                
                if (drawnPolygonRef.current) {
                    drawnPolygonRef.current.setMap(null);
                }

                const styledPolygon = createEditablePolygon(coordinates, []);
                setDrawnPolygon(styledPolygon);
                drawnPolygonRef.current = styledPolygon;
                rectangle.setMap(null);
            });

            drawingManager.addListener('circlecomplete', (circle: google.maps.Circle) => {
                if (isMainAreaSetRef.current) {
                    circle.setMap(null);
                    return;
                }
                
                const coordinates = extractCoordinatesFromCircle(circle);
                setMainArea(coordinates);
                computeAreaAndPerimeter(coordinates, []);
                setIsDrawing(false);
                setIsMainAreaSet(true);
                drawingManager.setDrawingMode(null);
                
                if (drawnPolygonRef.current) {
                    drawnPolygonRef.current.setMap(null);
                }

                const styledPolygon = createEditablePolygon(coordinates, []);
                setDrawnPolygon(styledPolygon);
                drawnPolygonRef.current = styledPolygon;
                circle.setMap(null);
            });
        }
    };

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
        
        // Clear plant points
        clearPlantPoints();
        
        // Clear obstacles
        clearObstacles();
        
        if (drawnPolygon) {
            drawnPolygon.setMap(null);
            setDrawnPolygon(null);
        }
        
        stopDrawing();
    };

    const handleDrawingComplete = useCallback((coordinates: Coordinate[], shapeType: string) => {
        if (shapeType === 'polygon' || shapeType === 'rectangle' || shapeType === 'circle') {
            setMainArea(coordinates);
            computeAreaAndPerimeter(coordinates);
        }
    }, [computeAreaAndPerimeter]);

    const handleBack = () => {
        router.get('/choose-crop', { crops: selectedCrops.join(',') });
    };

    const handleStepClick = (step: StepData) => {
        if (step.id === activeStep) {
            return;
        }
        
        if (completed.includes(step.id)) {
            navigateToStep(step);
            return;
        }
        
        if (step.id > activeStep && completed.includes(step.id - 1)) {
            navigateToStep(step);
            return;
        }
        
        if (step.id === 1) {
            navigateToStep(step);
        }
    };

    const navigateToStep = (step: StepData) => {
        const params = {
            crops: selectedCrops.join(','),
            currentStep: step.id,
            completedSteps: completed.join(',')
        };
        router.get(step.route, params);
    };

    const handleContinue = () => {
        const newCompleted = [...completed];
        if (!newCompleted.includes(activeStep)) {
            newCompleted.push(activeStep);
        }
        
        const nextStep = steps.find(s => s.id === activeStep + 1);
        if (nextStep) {
            const params = {
                crops: selectedCrops.join(','),
                currentStep: nextStep.id,
                completedSteps: newCompleted.join(',')
            };
            router.get(nextStep.route, params);
        }
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

    // Memoized plant count for performance
    const plantCount = useMemo(() => plantPoints.length, [plantPoints]);
    const obstacleCount = useMemo(() => obstacles.length, [obstacles]);

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
                                    onClick={handleBack}
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

                                {/* Step Navigation - Horizontal */}
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
                                                        status === 'completed' 
                                                            ? 'bg-green-600 text-white cursor-pointer hover:bg-green-500' 
                                                            : status === 'active'
                                                            ? 'bg-blue-600 text-white cursor-not-allowed'
                                                            : status === 'accessible'
                                                            ? 'bg-gray-600 text-white hover:bg-gray-500 cursor-pointer'
                                                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {status === 'completed' ? (
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    ) : (
                                                        step.id
                                                    )}
                                                </button>
                                                
                                                {index < steps.length - 1 && (
                                                    <div className={`w-8 h-0.5 mx-2 ${
                                                        completed.includes(step.id) ? 'bg-green-600' : 'bg-gray-600'
                                                    }`}></div>
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
                                            <h3 className="text-sm font-semibold text-white mb-3">
                                                {t('Selected Crops')}
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedCrops.map((crop, idx) => (
                                                    <span 
                                                        key={idx} 
                                                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                                                    >
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
                                                <h3 className="text-sm font-semibold text-white">
                                                    {t('Crop Spacing Settings')}
                                                </h3>
                                                <button
                                                    onClick={resetSpacingToDefaults}
                                                    className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-500 transition-colors"
                                                    title={t('Reset Defaults')}
                                                >
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
                                                            <div className="text-xs font-semibold text-blue-300 mb-2">
                                                                {spacingInfo.cropName}
                                                            </div>
                                                            
                                                            {/* Row Spacing */}
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs text-gray-400">
                                                                    {t('Row Spacing')}:
                                                                </span>
                                                                {isEditingRow ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            type="number"
                                                                            value={tempRowSpacing[crop] || ''}
                                                                            onChange={(e) => setTempRowSpacing(prev => ({
                                                                                ...prev,
                                                                                [crop]: e.target.value
                                                                            }))}
                                                                            className="w-16 text-xs bg-gray-700 text-white border border-gray-500 rounded px-1"
                                                                            min="5"
                                                                            max="300"
                                                                            onKeyPress={(e) => {
                                                                                if (e.key === 'Enter') handleRowSpacingConfirm(crop);
                                                                                if (e.key === 'Escape') handleRowSpacingCancel(crop);
                                                                            }}
                                                                            autoFocus
                                                                        />
                                                                        <button
                                                                            onClick={() => handleRowSpacingConfirm(crop)}
                                                                            className="text-xs text-green-400 hover:text-green-300"
                                                                        >
                                                                            ✓
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleRowSpacingCancel(crop)}
                                                                            className="text-xs text-red-400 hover:text-red-300"
                                                                        >
                                                                            ✗
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleRowSpacingEdit(crop)}
                                                                        className={`text-xs hover:bg-gray-600 px-1 rounded transition-colors ${
                                                                            spacingInfo.isRowModified 
                                                                                ? 'text-yellow-400' 
                                                                                : 'text-white'
                                                                        }`}
                                                                    >
                                                                        {spacingInfo.rowSpacing}cm
                                                                        {spacingInfo.isRowModified && ' *'}
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Plant Spacing */}
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs text-gray-400">
                                                                    {t('Plant Spacing')}:
                                                                </span>
                                                                {isEditingPlant ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            type="number"
                                                                            value={tempPlantSpacing[crop] || ''}
                                                                            onChange={(e) => setTempPlantSpacing(prev => ({
                                                                                ...prev,
                                                                                [crop]: e.target.value
                                                                            }))}
                                                                            className="w-16 text-xs bg-gray-700 text-white border border-gray-500 rounded px-1"
                                                                            min="5"
                                                                            max="200"
                                                                            onKeyPress={(e) => {
                                                                                if (e.key === 'Enter') handlePlantSpacingConfirm(crop);
                                                                                if (e.key === 'Escape') handlePlantSpacingCancel(crop);
                                                                            }}
                                                                            autoFocus
                                                                        />
                                                                        <button
                                                                            onClick={() => handlePlantSpacingConfirm(crop)}
                                                                            className="text-xs text-green-400 hover:text-green-300"
                                                                        >
                                                                            ✓
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handlePlantSpacingCancel(crop)}
                                                                            className="text-xs text-red-400 hover:text-red-300"
                                                                        >
                                                                            ✗
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handlePlantSpacingEdit(crop)}
                                                                        className={`text-xs hover:bg-gray-600 px-1 rounded transition-colors ${
                                                                            spacingInfo.isPlantModified 
                                                                                ? 'text-yellow-400' 
                                                                                : 'text-white'
                                                                        }`}
                                                                    >
                                                                        {spacingInfo.plantSpacing}cm
                                                                        {spacingInfo.isPlantModified && ' *'}
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Plant Density */}
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-gray-400">
                                                                    {t('Plants/m²')}:
                                                                </span>
                                                                <span className="text-xs text-green-300">
                                                                    {spacingInfo.plantsPerSqm}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Legend */}
                                            <div className="mt-3 text-xs text-yellow-400">
                                                * {t('Modified spacing')}
                                            </div>
                                        </div>
                                    )}

                                    {/* Main Area Control - Now contains Field Information */}
                                    <div className="rounded-lg p-4 border border-white">
                                        <h3 className="text-sm font-semibold text-white mb-3">
                                            🎯 {t('Main Area')}
                                        </h3>
                                        
                                        {!isMainAreaSet ? (
                                            <div className="space-y-3">
                                                <div className="text-xs text-blue-300 bg-blue-900 bg-opacity-30 p-2 rounded">
                                                    📍 {t('Please draw the main farming area using the tools on the map')}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {t('Status')}: <span className="text-yellow-400">{t('Waiting for area')}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="text-xs text-green-300 bg-green-900 bg-opacity-30 p-2 rounded mb-3">
                                                        ✅ {t('Main area has been set successfully')}
                                                    </div>
                                                    
                                                    {/* Field Information is now here */}
                                                    <div className="space-y-2 text-xs border-t border-gray-700 pt-3">
                                                        <h4 className="text-sm font-semibold text-white mb-2">
                                                            📊 {t('Field Information')}
                                                        </h4>
                                                        <div className="flex justify-between text-gray-400">
                                                            <span>{t('Total Area')}:</span>
                                                            <span>
                                                                {areaRai !== null ? areaRai.toFixed(2) : '--'} {t('rai')}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between text-gray-400">
                                                            <span>{t('Perimeter')}:</span>
                                                            <span>
                                                                {perimeterMeters !== null ? perimeterMeters.toFixed(1) : '--'} {t('meters')}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between text-gray-400">
                                                            <span>{t('Main Area')}:</span>
                                                            {mainArea.length >= 3 ? (
                                                                <span className="text-green-400">✅ {t('Set')}</span>
                                                            ) : (
                                                                <span className="text-yellow-400">⏳ {t('Not Set')}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={clearArea}
                                                    className="w-full bg-orange-600 text-white px-3 py-2 rounded text-xs hover:bg-orange-700 transition-colors"
                                                >
                                                    🗑️ {t('Clear Area & Redraw')}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Obstacles Controls - Show only after main area is set */}
                                    {isMainAreaSet && (
                                        <div className="rounded-lg p-4 border border-white">
                                            <h3 className="text-sm font-semibold text-white mb-3">
                                                🚧 {t('Obstacles & Features')}
                                            </h3>
                                            
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-400">{t('Total Obstacles')}:</span>
                                                    <span className="text-yellow-300">{obstacleCount}</span>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => startDrawingObstacle('water_source')}
                                                        disabled={isDrawingObstacle}
                                                        className="bg-blue-600 text-white px-2 py-2 rounded text-xs hover:bg-blue-700 transition-colors disabled:bg-gray-500 flex items-center justify-center gap-1"
                                                    >
                                                        💧 {t('Water')}
                                                    </button>

                                                    <button
                                                        onClick={() => startDrawingObstacle('other')}
                                                        disabled={isDrawingObstacle}
                                                        className="bg-gray-600 text-white px-2 py-2 rounded text-xs hover:bg-gray-700 transition-colors disabled:bg-gray-500 flex items-center justify-center gap-1"
                                                    >
                                                        🚧 {t('Other obstacles')}
                                                    </button>
                                                </div>
                                                
                                                {isDrawingObstacle && (
                                                    <button
                                                        onClick={stopDrawingObstacle}
                                                        className="w-full bg-red-600 text-white px-3 py-2 rounded text-xs hover:bg-red-700 transition-colors"
                                                    >
                                                        {t('Cancel Drawing')}
                                                    </button>
                                                )}
                                                
                                                {obstacleCount > 0 && (
                                                    <>
                                                        <div className="text-xs text-blue-300 bg-blue-900 bg-opacity-30 p-2 rounded">
                                                            📝 {t('Obstacle Layers')}
                                                        </div>

                                                        {/* List current obstacles - Layer style */}
                                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                                            {obstacles.map((obstacle, index) => (
                                                                <div key={obstacle.id} className="flex items-center justify-between bg-gray-800 p-2 rounded text-xs border-l-4" 
                                                                     style={{ borderLeftColor: obstacle.type === 'water_source' ? '#3b82f6' : '#6b7280' }}>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-lg">
                                                                            {obstacle.type === 'water_source' ? '💧' : '🚧'}
                                                                        </span>
                                                                        <div>
                                                                            <div className="text-white font-medium">
                                                                                {obstacle.type === 'water_source' ? t('Water Source') : t('Obstacle')} {index + 1}
                                                                            </div>
                                                                            <div className="text-gray-400 text-xs">
                                                                                {obstacle.coordinates.length} {t('points')}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => deleteObstacle(obstacle.id)}
                                                                        className="text-red-400 hover:text-red-300 px-2 py-1 hover:bg-red-900 hover:bg-opacity-30 rounded"
                                                                        title={t('Delete obstacle')}
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <button
                                                            onClick={clearObstacles}
                                                            className="w-full bg-red-600 text-white px-3 py-2 rounded text-xs hover:bg-red-700 transition-colors"
                                                        >
                                                            🗑️ {t('Clear All Obstacles')}
                                                        </button>
                                                    </>
                                                )}
                                                
                                                {obstacleCount === 0 && (
                                                    <div className="text-xs text-orange-300 bg-orange-900 bg-opacity-30 p-2 rounded">
                                                        💡 {t('Draw obstacles like water sources, rocks, or buildings within the main area')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Plant Points Controls - Show only after main area is set */}
                                    {isMainAreaSet && selectedCrops.length > 0 && (
                                        <div className="rounded-lg p-4 border border-white">
                                            <h3 className="text-sm font-semibold text-white mb-3">
                                                🌱 {t('Plant Points')}
                                            </h3>
                                            
                                            <div className="space-y-3">
                                                {/* Controls first (Generate / Clear) */}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleGeneratePlantPoints}
                                                        disabled={isGeneratingPlants}
                                                        className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-xs hover:bg-green-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                                                    >
                                                        {isGeneratingPlants ? t('Generating...') : t('Generate Plants')}
                                                    </button>
                                                    
                                                    {plantCount > 0 && (
                                                        <button
                                                            onClick={clearPlantPoints}
                                                            className="bg-red-600 text-white px-3 py-2 rounded text-xs hover:bg-red-700 transition-colors"
                                                        >
                                                            {t('Clear')}
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                {/* Generated points count (moved below buttons) */}
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-400">{t('Generated Points')}:</span>
                                                    <span className="text-green-300">{plantCount}</span>
                                                </div>

                                                {/* Water requirement display */}
                                                {waterRequirementInfo.total !== null && (
                                                    <div className="text-xs text-blue-300 bg-blue-900 bg-opacity-30 p-2 rounded">
                                                        💧 {t('Total Water Requirement')}: {waterRequirementInfo.total?.toFixed(2)} {t('L/day')}
                                                    </div>
                                                )}

                                                {/* Rotation control (only when points exist) */}
                                                {plantCount > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-gray-400">{t('Rotate Plants')}:</span>
                                                            <span className="text-yellow-300">{rotationAngle.toFixed(0)}°</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min={-180}
                                                            max={180}
                                                            step={1}
                                                            value={rotationAngle}
                                                            onChange={(e) => handleRotationChange(parseInt(e.target.value))}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                )}

                                                {plantCount > 0 && (
                                                    <div className="text-xs text-blue-300 bg-blue-900 bg-opacity-30 p-2 rounded">
                                                        💡 {t('Points are placed with 30% buffer from edges for optimal growth')}
                                                    </div>
                                                )}

                                                {plantCount === 0 && (
                                                    <div className="text-xs text-green-300 bg-green-900 bg-opacity-30 p-2 rounded">
                                                        🌱 {t('Generate optimal planting positions based on your crop spacing settings')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>

                            {/* Bottom Action Buttons */}
                            <div className="p-4 border-t border-white">
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleBack}
                                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 transition-colors"
                                    >
                                        {t('Back')}
                                    </button>
                                    
                                    <button 
                                        onClick={handleContinue}
                                        disabled={mainArea.length < 3}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                                    >
                                        {t('Next')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Google Map */}
                        <div className="flex-1 relative">
                            <div className="absolute inset-0 border border-white" style={{ backgroundColor: '#000005' }}>
                                <HorticultureMapComponent
                                    center={mapCenter}
                                    zoom={mapZoom}
                                    onMapLoad={handleMapLoad}
                                    mapOptions={{ maxZoom: 22 }}
                                >
                                    <EnhancedHorticultureSearchControl
                                        onPlaceSelect={handleSearch}
                                        placeholder="🔍 ค้นหาสถานที่..."
                                    />

                                    <HorticultureDrawingManager
                                        editMode={null}
                                        onCreated={handleDrawingComplete}
                                        isEditModeEnabled={true}
                                        mainArea={mainArea}
                                    />

                                    {/* Drawing Tools Overlay - Updated logic */}
                                    <div className="absolute left-4 top-16 z-10 bg-black bg-opacity-80 rounded-lg border border-white p-3 shadow-lg">
                                        <h4 className="text-white text-sm font-semibold mb-2">
                                            {!isMainAreaSet ? '🎯 ' + t('Drawing Tools') : '✅ ' + t('Drawing Complete')}
                                        </h4>
                                        
                                        {!isMainAreaSet ? (
                                            // Show drawing tools only when main area is not set
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => startDrawing('polygon')}
                                                    disabled={isDrawing}
                                                    className={`px-3 py-2 rounded text-xs transition-colors flex items-center gap-2 ${
                                                        isDrawing && selectedShape === 'polygon'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-700 text-white hover:bg-gray-600'
                                                    } disabled:opacity-50`}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 4-4 16-12-20z" />
                                                    </svg>
                                                    {t('Polygon')}
                                                </button>
                                                
                                                <button
                                                    onClick={() => startDrawing('rectangle')}
                                                    disabled={isDrawing}
                                                    className={`px-3 py-2 rounded text-xs transition-colors flex items-center gap-2 ${
                                                        isDrawing && selectedShape === 'rectangle'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-700 text-white hover:bg-gray-600'
                                                    } disabled:opacity-50`}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                                    </svg>
                                                    {t('Rectangle')}
                                                </button>
                                                
                                                <button
                                                    onClick={() => startDrawing('circle')}
                                                    disabled={isDrawing}
                                                    className={`px-3 py-2 rounded text-xs transition-colors flex items-center gap-2 ${
                                                        isDrawing && selectedShape === 'circle'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-700 text-white hover:bg-gray-600'
                                                    } disabled:opacity-50`}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <circle cx="12" cy="12" r="10"/>
                                                    </svg>
                                                    {t('Circle')}
                                                </button>
                                                
                                                {isDrawing && (
                                                    <button
                                                        onClick={stopDrawing}
                                                        className="px-3 py-2 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                        {t('Cancel')}
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            // Show tools for obstacles when main area is set
                                            <div className="flex flex-col gap-2">
                                                <div className="text-xs text-green-300 mb-2">
                                                    📍 {t('Main area completed')}
                                                </div>
                                                
                                                <div className="text-xs text-blue-300 mb-2">
                                                    🚧 {t('Obstacle Tools')}:
                                                </div>
                                                
                                                <button
                                                    onClick={() => startDrawingObstacle('water_source')}
                                                    disabled={isDrawingObstacle}
                                                    className="px-3 py-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-gray-500"
                                                >
                                                    💧 {t('Water Source')}
                                                </button>
                                                
                                                <button
                                                    onClick={() => startDrawingObstacle('other')}
                                                    disabled={isDrawingObstacle}
                                                    className="px-3 py-2 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:bg-gray-500"
                                                >
                                                    🚧 {t('Other Obstacle')}
                                                </button>
                                                
                                                {isDrawingObstacle && (
                                                    <button
                                                        onClick={stopDrawingObstacle}
                                                        className="px-3 py-2 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                        {t('Cancel')}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <DistanceMeasurementOverlay
                                        map={map}
                                        isActive={false}
                                        editMode={'mainArea'}
                                    />
                                </HorticultureMapComponent>

                                {/* Drawing Status Overlay */}
                                {isDrawing && !isMainAreaSet && (
                                    <div className="absolute left-4 bottom-4 z-10 bg-blue-900 bg-opacity-90 rounded-lg border border-blue-500 p-3 shadow-lg">
                                        <div className="text-sm text-white text-center">
                                            <div className="mb-1 font-semibold">🎯 {t('Drawing Mode Active')}</div>
                                            <div className="text-xs text-blue-200">
                                                {selectedShape === 'polygon' 
                                                    ? t('Click points to draw polygon, double-click to finish')
                                                    : selectedShape === 'rectangle'
                                                    ? t('Click and drag to draw rectangle')
                                                    : t('Click and drag to draw circle')
                                                }
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Zoom Level Overlay (next to +/- controls) */}
                                <div className="absolute bottom-4 right-20 z-10">
                                    <div className="px-2 py-1 rounded bg-black bg-opacity-70 border border-white text-xs text-white">
                                        {t('Zoom Level')}: {mapZoom}
                                    </div>
                                </div>

                                {/* Obstacle Drawing Status Overlay */}
                                {isDrawingObstacle && (
                                    <div className="absolute left-4 bottom-4 z-10 bg-purple-900 bg-opacity-90 rounded-lg border border-purple-500 p-3 shadow-lg">
                                        <div className="text-sm text-white text-center">
                                            <div className="mb-1 font-semibold">🚧 {t('Drawing Obstacle')}</div>
                                            <div className="text-xs text-purple-200">
                                                {t('Drawing')}: {selectedObstacleType.replace('_', ' ')}
                                            </div>
                                            <div className="text-xs text-purple-200">
                                                {t('Click points to draw, double-click to finish')}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Plant Generation Status Overlay */}
                                {isGeneratingPlants && (
                                    <div className="absolute right-4 bottom-4 z-10 bg-green-900 bg-opacity-90 rounded-lg border border-green-500 p-3 shadow-lg">
                                        <div className="text-sm text-white text-center">
                                            <div className="mb-1 font-semibold">🌱 {t('Generating Plants')}</div>
                                            <div className="text-xs text-green-200">
                                                {t('Calculating optimal plant positions...')}
                                            </div>
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
