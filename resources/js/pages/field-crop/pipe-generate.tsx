import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useLanguage } from '../../contexts/LanguageContext';
import Navbar from '../../components/Navbar';
import HorticultureMapComponent from '../../components/horticulture/HorticultureMapComponent';
import NotificationModal from '../../components/NotificationModal';
import { isPointInPolygonEnhanced } from '../../utils/fieldCropData';
import { parseCompletedSteps, toCompletedStepsCsv } from '../../utils/stepUtils';

// ===== TYPES =====
// ... (ส่วนนี้เหมือนเดิมทั้งหมด) ...
interface PipeGenerateProps {
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
    selectedIrrigationType?: string;
    irrigationCounts?: string;
    totalWaterRequirement?: string;
    irrigationSettings?: string;
    irrigationPositions?: string;
    zones?: string;
}

// Extended Google Maps types
interface ExtendedPolyline extends google.maps.Polyline {
    pipeId?: string;
    drawingManagerCreated?: boolean;
}

interface ExtendedMarker extends google.maps.Marker {
    dragListener?: google.maps.MapsEventListener;
}

interface ExtendedMap extends google.maps.Map {
    mapEventListeners?: google.maps.MapsEventListener[];
}

type Coordinate = { lat: number; lng: number };
type PipeType = 'main' | 'submain' | 'lateral';
type CurveType = 'straight' | 'bezier' | 'spline';
type LateralMode = 'inRow' | 'betweenRows';

interface Pipe {
    id: string;
    type: PipeType;
    coordinates: Coordinate[];
    curveType?: CurveType;
    controlPoints?: Coordinate[]; // For Bezier curves
    tension?: number; // For Spline curves (0-1)
    diameter?: number;
    length?: number;
    fromZone?: string;
    toZone?: string;
    // สำหรับท่อตรงที่โค้งมุม: เก็บสถานะต่อมุม (รองรับข้อมูลเรขาคณิตเพื่อปรับซ้ำ)
    roundedCorners?: {
        cornerIndex: number;
        handle?: Coordinate;
        A?: Coordinate;
        B?: Coordinate;
        C?: Coordinate;
        r?: number;
    }[];
}

interface Zone {
    id: string;
    name: string;
    coordinates: Coordinate[];
    color: string;
    cropType?: string;
    waterRequirement?: number;
    plantCount?: number;
    waterStatus?: 'normal' | 'warning' | 'error';
    waterMessage?: string;
}

interface Obstacle {
    id: string;
    type: 'water_source' | 'building' | 'rock' | 'other';
    coordinates: Coordinate[];
    name?: string;
}

interface PlantPoint {
    id: string;
    lat: number;
    lng: number;
    cropType: string;
    isValid: boolean;
}

interface Pump {
    id: string;
    lat: number;
    lng: number;
    type: 'water_pump';
    name?: string;
    capacity?: number; // liters per hour
}

// Typed shape for equipment data persisted in storage
type StoredEquipment = {
    id?: string;
    type?: string;
    lat?: number;
    lng?: number;
    name?: string;
};

// Styled pill label overlay for better readability on map
interface PillLabelOptions {
    offsetX?: number;
    offsetY?: number;
    zIndex?: number;
    backgroundColor?: string;
    textColor?: string;
    fontSize?: string;
    fontWeight?: string;
    padding?: string;
    borderRadius?: string;
    boxShadow?: string;
}

class PillLabel {
    private position: google.maps.LatLngLiteral;
    private text: string;
    div: HTMLDivElement | null = null;
    private options: PillLabelOptions;
    // Backing overlay created only when Google Maps API is available
    private overlay: (google.maps.OverlayView & { draw: () => void }) | null = null;

    constructor(position: google.maps.LatLngLiteral, text: string, options: PillLabelOptions = {}) {
        this.position = position;
        this.text = text;
        this.options = options;

        const g =
            typeof window !== 'undefined'
                ? (window as Window & { google?: typeof google }).google
                : undefined;
        if (g?.maps?.OverlayView) {
            class InnerOverlay extends g.maps.OverlayView {
                private outer: PillLabel;
                constructor(outer: PillLabel) {
                    super();
                    this.outer = outer;
                }
                onAdd() {
                    const div = document.createElement('div');
                    div.style.position = 'absolute';
                    div.style.pointerEvents = 'none';
                    div.style.whiteSpace = 'pre';
                    div.style.background =
                        this.outer.options.backgroundColor ?? 'rgba(0, 0, 0, 0.7)';
                    div.style.color = this.outer.options.textColor ?? '#ffffff';
                    div.style.padding = this.outer.options.padding ?? '4px 8px';
                    div.style.borderRadius = this.outer.options.borderRadius ?? '12px';
                    div.style.boxShadow =
                        this.outer.options.boxShadow ?? '0 1px 3px rgba(0,0,0,0.35)';
                    div.style.fontSize = this.outer.options.fontSize ?? '14px';
                    div.style.fontWeight = this.outer.options.fontWeight ?? '600';
                    div.style.transform = 'translate(-50%, -110%)';
                    div.style.zIndex = String(this.outer.options.zIndex ?? 1002);
                    div.textContent = this.outer.text;
                    this.outer.div = div;
                    this.getPanes()?.floatPane.appendChild(div);
                }
                draw() {
                    if (!this.outer.div) return;
                    const proj = this.getProjection();
                    if (!proj || !g?.maps) return;
                    const point = proj.fromLatLngToDivPixel(new g.maps.LatLng(this.outer.position));
                    if (!point) return;
                    const offsetX = this.outer.options.offsetX ?? 0;
                    const offsetY = this.outer.options.offsetY ?? 0;
                    this.outer.div.style.left = `${point.x + offsetX}px`;
                    this.outer.div.style.top = `${point.y + offsetY}px`;
                }
                onRemove() {
                    if (this.outer.div && this.outer.div.parentNode) {
                        this.outer.div.parentNode.removeChild(this.outer.div);
                    }
                    this.outer.div = null;
                }
            }
            this.overlay = new InnerOverlay(this) as unknown as google.maps.OverlayView & {
                draw: () => void;
            };
        }
    }

    setMap(map: google.maps.Map | null) {
        this.overlay?.setMap(map);
    }

    setPosition(position: google.maps.LatLngLiteral) {
        this.position = position;
        this.overlay?.draw();
    }

    setText(text: string) {
        this.text = text;
        if (this.div) this.div.textContent = text;
    }
}

type PipeLabelOverlay = google.maps.Marker | PillLabel;

export interface IrrigationPositions {
    sprinklers: Coordinate[];
    pivots: Coordinate[];
    dripTapes: Coordinate[];
    waterJets: Coordinate[];
}

interface IrrigationSettings {
    sprinkler_system?: { coverageRadius?: number; [key: string]: unknown };
    pivot?: { coverageRadius?: number; [key: string]: unknown };
    drip_tape?: { [key: string]: unknown };
    water_jet_tape?: { [key: string]: unknown };
    [key: string]: unknown;
}

export interface FieldData {
    selectedCrops: string[];
    mainArea: Coordinate[];
    zones: Zone[];
    obstacles: Obstacle[];
    plantPoints: PlantPoint[];
    pipes: Pipe[];
    areaRai: number | null;
    perimeterMeters: number | null;
    rotationAngle?: number;
    rowSpacing: Record<string, number>;
    plantSpacing: Record<string, number>;
    selectedIrrigationType: string;
    irrigationCounts: Record<string, number>;
    totalWaterRequirement: number;
    irrigationSettings: IrrigationSettings;
    irrigationPositions: IrrigationPositions;
    mapCenter: { lat: number; lng: number };
    mapZoom: number;
}

interface DrawingState {
    isDrawing: boolean;
    currentCoordinates: Coordinate[];
    currentDistance: number;
    startPoint: Coordinate | null;
    currentPoint: Coordinate | null;
    connectedSprinklers?: Coordinate[]; // สำหรับเก็บสปริงเกลอร์ที่เชื่อมต่อแล้ว
    currentFlowRate?: number; // อัตราการไหลปัจจุบัน (L/min)
}

// ===== UTILITY FUNCTIONS =====
// ... (ส่วนนี้เหมือนเดิมทั้งหมด) ...
const calculateDistance = (coordinates: Coordinate[]): number => {
    if (coordinates.length < 2) return 0;

    // Check if Google Maps API and geometry library are loaded
    if (
        typeof google === 'undefined' ||
        !google.maps ||
        !google.maps.geometry ||
        !google.maps.geometry.spherical
    ) {
        console.warn(
            'Google Maps geometry library not loaded, using fallback distance calculation'
        );
        // Fallback to simple distance calculation using Haversine formula
        let totalDistance = 0;
        for (let i = 1; i < coordinates.length; i++) {
            const lat1 = (coordinates[i - 1].lat * Math.PI) / 180;
            const lat2 = (coordinates[i].lat * Math.PI) / 180;
            const deltaLat = ((coordinates[i].lat - coordinates[i - 1].lat) * Math.PI) / 180;
            const deltaLng = ((coordinates[i].lng - coordinates[i - 1].lng) * Math.PI) / 180;

            const a =
                Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = 6371000 * c; // Earth's radius in meters
            totalDistance += distance;
        }
        return Math.round(totalDistance);
    }

    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(coordinates[i - 1].lat, coordinates[i - 1].lng),
            new google.maps.LatLng(coordinates[i].lat, coordinates[i].lng)
        );
        totalDistance += distance;
    }
    return Math.round(totalDistance);
};

// Generate Bezier curve points
const generateBezierCurve = (
    start: Coordinate,
    end: Coordinate,
    controlPoint: Coordinate,
    steps: number = 50
): Coordinate[] => {
    const points: Coordinate[] = [];

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lat =
            Math.pow(1 - t, 2) * start.lat +
            2 * (1 - t) * t * controlPoint.lat +
            Math.pow(t, 2) * end.lat;
        const lng =
            Math.pow(1 - t, 2) * start.lng +
            2 * (1 - t) * t * controlPoint.lng +
            Math.pow(t, 2) * end.lng;
        points.push({ lat, lng });
    }

    return points;
};

// Generate Spline curve points using Catmull-Rom spline
const generateSplineCurve = (
    points: Coordinate[],
    tension: number = 0.5,
    steps: number = 50
): Coordinate[] => {
    if (points.length < 3) return points;

    const result: Coordinate[] = [];

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i < points.length - 2 ? points[i + 2] : p2;

        for (let j = 0; j <= steps; j++) {
            const t = j / steps;
            const t2 = t * t;
            const t3 = t2 * t;

            // Catmull-Rom spline coefficients
            const a = -tension * t3 + 2 * tension * t2 - tension * t;
            const b = (2 - tension) * t3 + (tension - 3) * t2 + 1;
            const c = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * t;
            const d = tension * t3 - tension * t2;

            const lat = a * p0.lat + b * p1.lat + c * p2.lat + d * p3.lat;
            const lng = a * p0.lng + b * p1.lng + c * p2.lng + d * p3.lng;

            result.push({ lat, lng });
        }
    }

    return result;
};

// Generate smooth curve through multiple points
const generateSmoothCurve = (
    points: Coordinate[],
    curveType: CurveType,
    tension: number = 0.5
): Coordinate[] => {
    if (points.length < 2) return points;

    switch (curveType) {
        case 'bezier':
            if (points.length === 2) {
                // For 2 points, create a control point in the middle
                const midPoint = {
                    lat: (points[0].lat + points[1].lat) / 2,
                    lng: (points[0].lng + points[1].lng) / 2,
                };
                return generateBezierCurve(points[0], points[1], midPoint);
            } else if (points.length === 3) {
                // For 3 points, use the middle point as control point
                return generateBezierCurve(points[0], points[2], points[1]);
            } else {
                // For more points, create multiple Bezier segments
                const result: Coordinate[] = [];
                for (let i = 0; i < points.length - 1; i++) {
                    const start = points[i];
                    const end = points[i + 1];
                    const control =
                        i < points.length - 2
                            ? points[i + 1]
                            : {
                                  lat: (start.lat + end.lat) / 2,
                                  lng: (start.lng + end.lng) / 2,
                              };
                    const segment = generateBezierCurve(start, end, control);
                    if (i === 0) {
                        result.push(...segment);
                    } else {
                        result.push(...segment.slice(1)); // Avoid duplicate points
                    }
                }
                return result;
            }

        case 'spline':
            return generateSplineCurve(points, tension);

        case 'straight':
        default:
            return points;
    }
};

// ===== Helper geometry for corner rounding (planar approximation) =====
const toXY = (c: Coordinate) => ({ x: c.lng, y: c.lat });
const fromXY = (p: { x: number; y: number }): Coordinate => ({ lat: p.y, lng: p.x });
const subV = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: a.x - b.x,
    y: a.y - b.y,
});
const addV = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: a.x + b.x,
    y: a.y + b.y,
});
const mulV = (a: { x: number; y: number }, s: number) => ({ x: a.x * s, y: a.y * s });
const lenV = (a: { x: number; y: number }) => Math.hypot(a.x, a.y);
const normV = (a: { x: number; y: number }) => {
    const l = lenV(a);
    return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
};
const dotV = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x * b.x + a.y * b.y;
const crossV = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x * b.y - a.y * b.x;
const lineIntersection = (
    p: { x: number; y: number },
    u: { x: number; y: number },
    q: { x: number; y: number },
    v: { x: number; y: number }
) => {
    const denom = crossV(u, v);
    if (Math.abs(denom) < 1e-9) return null;
    const t = crossV(subV(q, p), v) / denom;
    return addV(p, mulV(u, t));
};

const getPipeConfig = (type: PipeType) => {
    const configs = {
        main: { color: '#dc2626', weight: 8, opacity: 1.0 },
        submain: { color: '#8b5cf6', weight: 5, opacity: 1.0 },
        lateral: { color: '#fbbf24', weight: 3, opacity: 1.0 },
    };

    return configs[type];
};

const getObstacleColors = (type: string) => {
    const colors = {
        water_source: { fill: '#3B82F6', stroke: '#1D4ED8' },
        building: { fill: '#6B7280', stroke: '#374151' },
        rock: { fill: '#8B5CF6', stroke: '#5B21B6' },
        other: { fill: '#6B7280', stroke: '#374151' },
        default: { fill: '#6B7280', stroke: '#374151' },
    };
    return colors[type as keyof typeof colors] || colors.default;
};

const calculateDistanceBetweenPoints = (point1: Coordinate, point2: Coordinate): number => {
    // Check if Google Maps API and geometry library are loaded
    if (
        typeof google === 'undefined' ||
        !google.maps ||
        !google.maps.geometry ||
        !google.maps.geometry.spherical
    ) {
        console.warn(
            'Google Maps geometry library not loaded, using fallback distance calculation'
        );
        // Fallback to simple distance calculation using Haversine formula
        const lat1 = (point1.lat * Math.PI) / 180;
        const lat2 = (point2.lat * Math.PI) / 180;
        const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
        const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

        const a =
            Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return 6371000 * c; // Earth's radius in meters
    }

    return google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(point1.lat, point1.lng),
        new google.maps.LatLng(point2.lat, point2.lng)
    );
};

const getClosestPointOnSegment = (
    p: Coordinate,
    a: Coordinate,
    b: Coordinate
): { point: Coordinate; distance: number } => {
    const refLatRad = (((a.lat + b.lat) / 2) * Math.PI) / 180;
    const metersPerDegLat = 110574;
    const metersPerDegLng = 111320 * Math.cos(refLatRad);

    const ax = a.lng * metersPerDegLng;
    const ay = a.lat * metersPerDegLat;
    const bx = b.lng * metersPerDegLng;
    const by = b.lat * metersPerDegLat;
    const px = p.lng * metersPerDegLng;
    const py = p.lat * metersPerDegLat;

    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const abLen2 = abx * abx + aby * aby;

    if (abLen2 === 0) {
        const dist = calculateDistanceBetweenPoints(p, a);
        return { point: a, distance: dist };
    }

    let t = (apx * abx + apy * aby) / abLen2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;

    const cx = ax + t * abx;
    const cy = ay + t * aby;

    const snapped: Coordinate = {
        lat: cy / metersPerDegLat,
        lng: cx / metersPerDegLng,
    };

    const distance = calculateDistanceBetweenPoints(p, snapped);
    return { point: snapped, distance };
};

// ===== CUSTOM HOOKS =====
// ... (useFieldData, usePipeManager, useSnapSystem เหมือนเดิม) ...
const useFieldData = () => {
    const saveToStorage = useCallback((data: Partial<FieldData>) => {
        try {
            const existing = localStorage.getItem('fieldCropData');
            const existingData = existing ? JSON.parse(existing) : {};
            const mergedData = { ...existingData, ...data };
            localStorage.setItem('fieldCropData', JSON.stringify(mergedData));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }, []);

    const loadFromStorage = useCallback((): Partial<FieldData> | null => {
        try {
            const data = localStorage.getItem('fieldCropData');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    }, []);

    const clearStorage = useCallback(() => {
        localStorage.removeItem('fieldCropData');
    }, []);

    // เพิ่มฟังก์ชัน reset เฉพาะสำหรับ pipes
    const resetPipesOnly = useCallback(() => {
        // ล้างเฉพาะ pipes ใน localStorage โดยไม่ล้างข้อมูลอื่น
        try {
            const existing = localStorage.getItem('fieldCropData');
            if (existing) {
                const existingData = JSON.parse(existing);
                // ลบเฉพาะ pipes ออกจากข้อมูล
                delete existingData.pipes;
                localStorage.setItem('fieldCropData', JSON.stringify(existingData));
            }
        } catch (error) {
            console.error('Error resetting pipes only:', error);
        }
    }, []);

    return { saveToStorage, loadFromStorage, clearStorage, resetPipesOnly };
};

const usePipeManager = () => {
    const [pipes, setPipes] = useState<Pipe[]>([]);
    // History stacks for undo/redo of pipe drawing
    const [pipeHistory, setPipeHistory] = useState<Pipe[][]>([[]]);
    const [pipeHistoryIndex, setPipeHistoryIndex] = useState(0);
    const isApplyingHistoryRef = useRef(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [selectedType, setSelectedType] = useState<PipeType>('main');
    const [selectedCurveType, setSelectedCurveType] = useState<CurveType>('straight');
    const [lateralMode, setLateralMode] = useState<LateralMode>('inRow');
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingPipeId, setEditingPipeId] = useState<string | null>(null);
    const [drawingState, setDrawingState] = useState<DrawingState>({
        isDrawing: false,
        currentCoordinates: [],
        currentDistance: 0,
        startPoint: null,
        currentPoint: null,
    });

    const deepCopyPipes = useCallback((src: Pipe[]): Pipe[] => {
        // structured clone for simple JSON-friendly data
        return JSON.parse(JSON.stringify(src)) as Pipe[];
    }, []);

    const recordHistory = useCallback(
        (nextPipes: Pipe[], resetHistory?: boolean) => {
            if (isApplyingHistoryRef.current) return;
            const snapshot = deepCopyPipes(nextPipes);
            if (resetHistory) {
                setPipeHistory([snapshot]);
                setPipeHistoryIndex(0);
                return;
            }
            setPipeHistory((prev) => {
                const upto = prev.slice(0, pipeHistoryIndex + 1);
                return [...upto, snapshot];
            });
            setPipeHistoryIndex((prev) => prev + 1);
        },
        [pipeHistoryIndex, deepCopyPipes]
    );

    const setPipesWithHistory = useCallback(
        (
            updater: Pipe[] | ((prev: Pipe[]) => Pipe[]),
            options?: { silent?: boolean; resetHistory?: boolean }
        ) => {
            if (typeof updater === 'function') {
                setPipes((prev) => {
                    const next = (updater as (p: Pipe[]) => Pipe[])(prev);
                    if (!options?.silent) recordHistory(next, options?.resetHistory);
                    return next;
                });
            } else {
                const next = updater as Pipe[];
                setPipes(next);
                if (!options?.silent) recordHistory(next, options?.resetHistory);
            }
        },
        [recordHistory]
    );

    const addPipe = useCallback(
        (pipe: Pipe) => {
            setPipes((prev) => {
                const newPipes = [...prev, pipe];

                // record history outside of state functional updater for clarity
                recordHistory(newPipes);
                return newPipes;
            });
        },
        [recordHistory]
    );

    const updatePipe = useCallback(
        (pipeId: string, updates: Partial<Pipe>) => {
            setPipes((prev) => {
                const next = prev.map((pipe) =>
                    pipe.id === pipeId ? { ...pipe, ...updates } : pipe
                );
                recordHistory(next);
                return next;
            });
        },
        [recordHistory]
    );

    const removePipe = useCallback(
        (pipeId: string) => {
            setPipes((prev) => {
                const next = prev.filter((pipe) => pipe.id !== pipeId);
                recordHistory(next);
                return next;
            });
        },
        [recordHistory]
    );

    const getTotalLength = useCallback(
        (type?: PipeType) => {
            const filtered = type ? pipes.filter((p) => p.type === type) : pipes;
            return filtered.reduce((total, pipe) => total + (pipe.length || 0), 0);
        },
        [pipes]
    );

    const getPipeCount = useCallback(
        (type?: PipeType) => {
            return type ? pipes.filter((p) => p.type === type).length : pipes.length;
        },
        [pipes]
    );

    const updateDrawingState = useCallback((updates: Partial<DrawingState>) => {
        setDrawingState((prev) => ({ ...prev, ...updates }));
    }, []);

    const resetDrawingState = useCallback(() => {
        setDrawingState({
            isDrawing: false,
            currentCoordinates: [],
            currentDistance: 0,
            startPoint: null,
            currentPoint: null,
            connectedSprinklers: [],
            currentFlowRate: 0,
        });
    }, []);

    const updateCurrentDistance = useCallback((coordinates: Coordinate[]) => {
        if (coordinates.length < 2) {
            setDrawingState((prev) => ({ ...prev, currentDistance: 0 }));
            return;
        }

        const distance = calculateDistance(coordinates);
        setDrawingState((prev) => ({ ...prev, currentDistance: distance }));
    }, []);

    // ฟังก์ชันสำหรับคำนวณอัตราการไหลจากสปริงเกลอร์ที่เชื่อมต่อ
    const calculateFlowRate = useCallback(
        (connectedSprinklers: Coordinate[], perSprinklerLpm?: number): number => {
            const sprinklerFlowRate =
                typeof perSprinklerLpm === 'number' && !isNaN(perSprinklerLpm)
                    ? perSprinklerLpm
                    : 10; // L/min per sprinkler (fallback 10)
            const flowRate = connectedSprinklers.length * sprinklerFlowRate;

            return flowRate;
        },
        []
    );

    // ฟังก์ชันสำหรับหาสปริงเกลอร์ที่อยู่ใกล้เส้นท่อ
    const findNearbyConnectedSprinklers = useCallback(
        (
            coordinates: Coordinate[],
            sprinklers: Coordinate[],
            snapRadius: number = 2
        ): Coordinate[] => {
            if (coordinates.length < 2 || sprinklers.length === 0) return [];

            const connectedSprinklers: Coordinate[] = [];

            // ตรวจสอบแต่ละสปริงเกลอร์ว่าอยู่ใกล้เส้นท่อหรือไม่ (นับเฉพาะหัวที่ท่อพาดผ่านจริง: ระยะ <= snapRadius เมตร จาก segment เท่านั้น)
            sprinklers.forEach((sprinkler) => {
                // ตรวจสอบแต่ละส่วนของเส้นท่ออย่างเดียว เพื่อให้ "นับแค่ตัวที่เส้นท่อย่อยลากผ่านเท่านั้น"
                let intersects = false;
                for (let i = 0; i < coordinates.length - 1; i++) {
                    const { distance } = getClosestPointOnSegment(
                        sprinkler,
                        coordinates[i],
                        coordinates[i + 1]
                    );
                    if (distance <= snapRadius) {
                        intersects = true;
                        break;
                    }
                }
                if (intersects) {
                    connectedSprinklers.push(sprinkler);
                }
            });

            return connectedSprinklers;
        },
        []
    );

    // โหมดวาดระหว่างแถว: ตรวจจับหัวสปริงเกลอร์สองแถวที่อยู่คนละฝั่งของเส้น โดยประมาณ half-spacing แบบอัตโนมัติจากข้อมูลจริง
    const findNearbyConnectedSprinklersBetweenRows = useCallback(
        (
            coordinates: Coordinate[],
            sprinklers: Coordinate[],
            halfWidthMeters: number = 1.5
        ): Coordinate[] => {
            if (coordinates.length < 2 || sprinklers.length === 0) return [];
            // 1) เก็บระยะตั้งฉากของหัวทั้งหมดใกล้เส้น (ภายในระยะสูงสุด)
            const maxConsiderDistance = Math.max(6, halfWidthMeters * 3);
            const distances: number[] = [];
            const pointDistances: { sprinkler: Coordinate; dist: number }[] = [];
            for (const s of sprinklers) {
                let best = Infinity;
                for (let i = 0; i < coordinates.length - 1; i++) {
                    const { distance } = getClosestPointOnSegment(
                        s,
                        coordinates[i],
                        coordinates[i + 1]
                    );
                    if (distance < best) best = distance;
                }
                if (best <= maxConsiderDistance) {
                    distances.push(Math.abs(best));
                    pointDistances.push({ sprinkler: s, dist: Math.abs(best) });
                }
            }
            if (pointDistances.length === 0) return [];
            // 2) ประมาณค่า half-spacing จาก median ของระยะที่มากกว่า threshold เล็กน้อย (เลี่ยงระยะ 0)
            const meaningful = distances.filter((d) => d > 0.4);
            const median = (arr: number[]) => {
                if (arr.length === 0) return halfWidthMeters;
                const a = [...arr].sort((x, y) => x - y);
                const n = a.length;
                return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
            };
            const estHalf = median(meaningful);
            const halfSpacing = Math.max(halfWidthMeters, Math.min(estHalf, maxConsiderDistance));
            const tol = Math.max(0.6, halfSpacing * 0.35);
            // 3) เลือกหัวที่มีระยะใกล้กับ half-spacing (ทั้งสองฝั่ง)
            const selected: Coordinate[] = [];
            for (const pd of pointDistances) {
                if (Math.abs(pd.dist - halfSpacing) <= tol) selected.push(pd.sprinkler);
            }
            return selected;
        },
        []
    );

    // ฟังก์ชันสำหรับหาจุดเชื่อมต่อทั้งหมด (สปริงเกลอร์, เทปน้ำหยด, เทปน้ำพุ่ง, pivot)
    const findNearbyConnectedIrrigationPoints = useCallback(
        (
            coordinates: Coordinate[],
            irrigationPositions: IrrigationPositions,
            snapRadius: number = 2,
            options?: { lateralMode?: LateralMode; betweenRowsHalfWidth?: number }
        ) => {
            if (coordinates.length < 2)
                return { sprinklers: [], dripTapes: [], waterJets: [], pivots: [] };

            const mode: LateralMode | undefined = options?.lateralMode;
            const halfWidth = options?.betweenRowsHalfWidth ?? 1.5;

            if (mode === 'betweenRows') {
                const connectedSprinklers = findNearbyConnectedSprinklersBetweenRows(
                    coordinates,
                    irrigationPositions.sprinklers,
                    halfWidth
                );
                const connectedDripTapes = findNearbyConnectedSprinklersBetweenRows(
                    coordinates,
                    irrigationPositions.dripTapes,
                    halfWidth
                );
                const connectedWaterJets = findNearbyConnectedSprinklersBetweenRows(
                    coordinates,
                    irrigationPositions.waterJets,
                    halfWidth
                );
                const connectedPivots = findNearbyConnectedSprinklersBetweenRows(
                    coordinates,
                    irrigationPositions.pivots,
                    halfWidth
                );
                return {
                    sprinklers: connectedSprinklers,
                    dripTapes: connectedDripTapes,
                    waterJets: connectedWaterJets,
                    pivots: connectedPivots,
                };
            }

            const connectedSprinklers = findNearbyConnectedSprinklers(
                coordinates,
                irrigationPositions.sprinklers,
                snapRadius
            );
            const connectedDripTapes = findNearbyConnectedSprinklers(
                coordinates,
                irrigationPositions.dripTapes,
                snapRadius
            );
            const connectedWaterJets = findNearbyConnectedSprinklers(
                coordinates,
                irrigationPositions.waterJets,
                snapRadius
            );
            const connectedPivots = findNearbyConnectedSprinklers(
                coordinates,
                irrigationPositions.pivots,
                snapRadius
            );
            return {
                sprinklers: connectedSprinklers,
                dripTapes: connectedDripTapes,
                waterJets: connectedWaterJets,
                pivots: connectedPivots,
            };
        },
        [findNearbyConnectedSprinklers, findNearbyConnectedSprinklersBetweenRows]
    );

    // ฟังก์ชันคำนวณอัตราการไหลรวมสำหรับทุกประเภท
    const calculateTotalFlowRate = useCallback(
        (
            connectedPoints: {
                sprinklers: Coordinate[];
                dripTapes: Coordinate[];
                waterJets: Coordinate[];
                pivots: Coordinate[];
            },
            irrigationSettings: IrrigationSettings
        ) => {
            let totalFlow = 0;

            // สปริงเกลอร์
            const sprinklerFlow = Number(irrigationSettings.sprinkler_system?.flow) || 10;
            totalFlow += connectedPoints.sprinklers.length * sprinklerFlow;

            // เทปน้ำหยด (0.24 L/min per emitter)
            const dripFlow = 0.24;
            totalFlow += connectedPoints.dripTapes.length * dripFlow;

            // เทปน้ำพุ่ง
            const waterJetFlow = Number(irrigationSettings.water_jet_tape?.flow) || 1.5;
            totalFlow += connectedPoints.waterJets.length * waterJetFlow;

            // Pivot
            const pivotFlow = Number(irrigationSettings.pivot?.flow) || 50;
            totalFlow += connectedPoints.pivots.length * pivotFlow;

            return totalFlow;
        },
        []
    );

    // ปรับปรุงฟังก์ชัน updateCurrentDistance สำหรับ lateral เพื่อติดตามสปริงเกลอร์ที่เชื่อมต่อ (รองรับโหมดระหว่างแถว)
    const updateCurrentDistanceWithSprinklers = useCallback(
        (
            coordinates: Coordinate[],
            pipeType: PipeType,
            sprinklers: Coordinate[],
            perSprinklerLpm?: number,
            snapRadius: number = 2
        ) => {
            if (coordinates.length < 2) {
                setDrawingState((prev) => ({
                    ...prev,
                    currentDistance: 0,
                    connectedSprinklers: [],
                    currentFlowRate: 0,
                }));
                return;
            }

            const distance = calculateDistance(coordinates);

            // หาสปริงเกลอร์ที่เชื่อมต่อเฉพาะเมื่อวาดท่อ lateral
            if (pipeType === 'lateral') {
                const connectedSprinklers =
                    lateralMode === 'betweenRows'
                        ? findNearbyConnectedSprinklersBetweenRows(coordinates, sprinklers, 1.5)
                        : findNearbyConnectedSprinklers(coordinates, sprinklers, snapRadius);
                const flowRate = calculateFlowRate(connectedSprinklers, perSprinklerLpm);

                setDrawingState((prev) => ({
                    ...prev,
                    currentDistance: distance,
                    connectedSprinklers,
                    currentFlowRate: flowRate,
                }));
            } else {
                setDrawingState((prev) => ({
                    ...prev,
                    currentDistance: distance,
                    connectedSprinklers: [],
                    currentFlowRate: 0,
                }));
            }
        },
        [
            findNearbyConnectedSprinklers,
            findNearbyConnectedSprinklersBetweenRows,
            calculateFlowRate,
            lateralMode,
        ]
    );

    return {
        pipes,
        setPipes: setPipesWithHistory,
        isDrawing,
        setIsDrawing,
        selectedType,
        setSelectedType,
        selectedCurveType,
        setSelectedCurveType,
        isGenerating,
        setIsGenerating,
        drawingState,
        updateDrawingState,
        resetDrawingState,
        updateCurrentDistance,
        // expose helpers for synchronous preview updates
        findNearbyConnectedSprinklers,
        findNearbyConnectedIrrigationPoints,
        calculateFlowRate,
        calculateTotalFlowRate,
        updateCurrentDistanceWithSprinklers, // เพิ่มฟังก์ชันใหม่
        lateralMode,
        setLateralMode,
        addPipe,
        updatePipe,
        removePipe,
        getTotalLength,
        getPipeCount,
        editingPipeId,
        setEditingPipeId,
        // history API
        undo: () => {
            if (pipeHistoryIndex > 0) {
                const newIndex = pipeHistoryIndex - 1;
                isApplyingHistoryRef.current = true;
                setPipes(deepCopyPipes(pipeHistory[newIndex]));
                setPipeHistoryIndex(newIndex);
                isApplyingHistoryRef.current = false;
            }
        },
        redo: () => {
            if (pipeHistoryIndex < pipeHistory.length - 1) {
                const newIndex = pipeHistoryIndex + 1;
                isApplyingHistoryRef.current = true;
                setPipes(deepCopyPipes(pipeHistory[newIndex]));
                setPipeHistoryIndex(newIndex);
                isApplyingHistoryRef.current = false;
            }
        },
        pipeHistoryIndex,
        pipeHistoryLength: pipeHistory.length,
        resetHistory: (initial?: Pipe[]) => {
            const base = deepCopyPipes(initial || []);
            setPipeHistory([base]);
            setPipeHistoryIndex(0);
        },
    };
};

const useSnapSystem = () => {
    const [isEnabled, setIsEnabled] = useState(true);
    const [distance, setDistance] = useState(3);
    const [point, setPoint] = useState<Coordinate | null>(null);

    const showIndicator = useCallback((snapPoint: Coordinate) => {
        setPoint(snapPoint);
    }, []);

    const hideIndicator = useCallback(() => {
        setPoint(null);
    }, []);

    const findSnapPoint = useCallback(
        (
            point: Coordinate,
            pipeType: PipeType,
            pipes: Pipe[],
            irrigationPositions: IrrigationPositions,
            pumpsParam: Pump[] = [],
            options?: { lateralMode?: LateralMode }
        ): Coordinate | null => {
            if (!isEnabled) return null;

            let closestPoint: Coordinate | null = null;
            // For main and submain pipes, clamp snap distance to 1-5 meters
            const effectiveDistance =
                pipeType === 'main' || pipeType === 'submain'
                    ? Math.min(Math.max(distance, 1), 5)
                    : distance;
            let minDistance = effectiveDistance;

            // For main pipes, snap to submain pipes and pumps
            if (pipeType === 'main') {
                // 1) Snap to pumps
                pumpsParam.forEach((pump) => {
                    const pumpCoord = { lat: pump.lat, lng: pump.lng } as Coordinate;
                    const dist = calculateDistanceBetweenPoints(point, pumpCoord);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestPoint = pumpCoord;
                    }
                });

                // 2) Snap to submain and main pipes
                const targetPipes = pipes.filter((p) => p.type === 'submain' || p.type === 'main');
                for (const pipe of targetPipes) {
                    if (!pipe.coordinates || pipe.coordinates.length < 2) continue;
                    [pipe.coordinates[0], pipe.coordinates[pipe.coordinates.length - 1]].forEach(
                        (coord) => {
                            const dist = calculateDistanceBetweenPoints(point, coord);
                            if (dist < minDistance) {
                                minDistance = dist;
                                closestPoint = coord;
                            }
                        }
                    );
                    for (let i = 0; i < pipe.coordinates.length - 1; i++) {
                        const a = pipe.coordinates[i];
                        const b = pipe.coordinates[i + 1];
                        const { point: segSnap, distance: segDist } = getClosestPointOnSegment(
                            point,
                            a,
                            b
                        );
                        if (segDist < minDistance) {
                            minDistance = segDist;
                            closestPoint = segSnap;
                        }
                    }
                }
                return closestPoint;
            }

            // For submain and lateral: only lateral snaps to sprinklers, drip tapes, water jets, and pivots
            // BUT: In 'betweenRows' lateral mode, do NOT snap to irrigation points at all
            const isBetweenRows = options?.lateralMode === 'betweenRows';
            const allIrrigationPoints =
                pipeType === 'lateral' && !isBetweenRows
                    ? [
                          ...irrigationPositions.sprinklers,
                          ...irrigationPositions.dripTapes,
                          ...irrigationPositions.waterJets,
                          ...irrigationPositions.pivots,
                      ]
                    : [];

            for (const irrigationPoint of allIrrigationPoints) {
                const dist = calculateDistanceBetweenPoints(point, irrigationPoint);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestPoint = irrigationPoint;
                }
            }

            // Allow submain and lateral to snap to both main and submain
            const targetPipeTypes =
                pipeType === 'submain'
                    ? ['main']
                    : pipeType === 'lateral'
                      ? ['main', 'submain']
                      : [];
            const targetPipes = pipes.filter((p) => targetPipeTypes.includes(p.type));

            for (const pipe of targetPipes) {
                if (!pipe.coordinates || pipe.coordinates.length < 2) continue;

                [pipe.coordinates[0], pipe.coordinates[pipe.coordinates.length - 1]].forEach(
                    (coord) => {
                        const dist = calculateDistanceBetweenPoints(point, coord);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestPoint = coord;
                        }
                    }
                );

                for (let i = 0; i < pipe.coordinates.length - 1; i++) {
                    const a = pipe.coordinates[i];
                    const b = pipe.coordinates[i + 1];
                    const { point: segSnap, distance: segDist } = getClosestPointOnSegment(
                        point,
                        a,
                        b
                    );
                    if (segDist < minDistance) {
                        minDistance = segDist;
                        closestPoint = segSnap;
                    }
                }
            }

            return closestPoint;
        },
        [isEnabled, distance]
    );

    const cleanup = useCallback(() => {
        hideIndicator();
    }, [hideIndicator]);

    return {
        isEnabled,
        setIsEnabled,
        distance,
        setDistance,
        point,
        showIndicator,
        hideIndicator,
        findSnapPoint,
        cleanup,
    };
};

// ======================= MODIFIED SECTION START =======================
const useMapManager = () => {
    const mapRef = useRef<google.maps.Map | null>(null);
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
    const overlaysRef = useRef<{
        mainArea?: google.maps.Polygon;
        // ใช้ Map เพื่อเก็บ overlays โดยใช้ ID เป็น key เพื่อประสิทธิภาพ
        zones: Map<string, google.maps.Polygon>;
        obstacles: Map<string, google.maps.Polygon>;
        plants: Map<string, google.maps.Marker>;
        irrigation: Map<string, google.maps.Marker>;
        circles: Map<string, google.maps.Circle>;
        pipes: Map<string, ExtendedPolyline>;
        drawingPreview?: google.maps.Polyline;
        // Reusable preview labels/markers to avoid flicker
        previewEndLabel?: PipeLabelOverlay;
        previewEndPill?: PillLabel;
        previewTypeLabel?: PipeLabelOverlay;
        previewMidLabel?: PipeLabelOverlay;
        previewMidPill?: PillLabel;
        connectedSprinklerMarkers?: google.maps.Marker[];
        distanceLabels: google.maps.Marker[];
        distanceLine?: google.maps.Polyline;
        pumps: Map<string, google.maps.Marker>;
        controlHandles: ExtendedMarker[];
        cornerPreview?: google.maps.Polyline;
        drawingListeners?: google.maps.MapsEventListener[];
        // Labels associated with pipes (e.g., sprinklers count and flow)
        pipeLabels: Map<string, PipeLabelOverlay[]>;
        pipeLabelPills: Map<string, PillLabel[]>;
        // Connection points for lateral pipes
        connectionPoints: Map<string, google.maps.Marker>;
        // Connection lines between lateral pipes and sprinklers
        connectionLines: Map<string, google.maps.Polyline>;
        // no DOM dblclick handler; handled via click timeout logic
    }>({
        zones: new Map(),
        obstacles: new Map(),
        plants: new Map(),
        irrigation: new Map(),
        circles: new Map(),
        pipes: new Map(),
        distanceLabels: [],
        pumps: new Map(),
        controlHandles: [],
        cornerPreview: undefined,
        pipeLabels: new Map(),
        pipeLabelPills: new Map(),
        connectionPoints: new Map(),
        connectionLines: new Map(),
    });

    const clearAllOverlays = useCallback(() => {
        const overlays = overlaysRef.current;

        overlays.mainArea?.setMap(null);
        overlays.mainArea = undefined;

        // วนลูปผ่าน Map และลบแต่ละ overlay
        overlays.zones.forEach((overlay) => overlay.setMap(null));
        overlays.obstacles.forEach((overlay) => overlay.setMap(null));
        overlays.plants.forEach((overlay) => overlay.setMap(null));
        overlays.irrigation.forEach((overlay) => overlay.setMap(null));
        overlays.circles.forEach((overlay) => overlay.setMap(null));
        overlays.pipes.forEach((overlay) => overlay.setMap(null));
        overlays.pipeLabels.forEach((markers) =>
            markers.forEach((m) => m.setMap && m.setMap(null))
        );
        overlays.pipeLabelPills.forEach((pills) => pills.forEach((p) => p.setMap(null)));
        overlays.connectionPoints.forEach((overlay) => overlay.setMap(null));
        overlays.connectionLines.forEach((overlay) => overlay.setMap(null));
        overlays.pumps.forEach((overlay) => overlay.setMap(null));
        overlays.controlHandles.forEach((overlay) => overlay.setMap(null));
        overlays.distanceLabels.forEach((overlay) => overlay.setMap(null));
        overlays.cornerPreview?.setMap(null);

        overlays.distanceLine?.setMap(null);
        overlays.distanceLine = undefined;

        // Reset refs ให้เป็น Map ว่าง
        overlaysRef.current = {
            zones: new Map(),
            obstacles: new Map(),
            plants: new Map(),
            irrigation: new Map(),
            circles: new Map(),
            pipes: new Map(),
            distanceLabels: [],
            pumps: new Map(),
            controlHandles: [],
            cornerPreview: undefined,
            pipeLabels: new Map(),
            pipeLabelPills: new Map(),
            connectionPoints: new Map(),
            connectionLines: new Map(),
        };
    }, []);

    // ลบเส้นเชื่อมต่อที่เกี่ยวข้องกับท่อย่อยที่ถูกลบ
    const removeConnectionLinesForPipe = useCallback((pipeId: string) => {
        const overlays = overlaysRef.current;
        if (!overlays.connectionLines) return;

        // หาเส้นเชื่อมต่อที่เกี่ยวข้องกับท่อย่อยนี้
        const linesToRemove: string[] = [];
        overlays.connectionLines.forEach((line, lineId) => {
            if (lineId.startsWith(`${pipeId}-connection-`)) {
                linesToRemove.push(lineId);
            }
        });

        // ลบเส้นเชื่อมต่อที่เกี่ยวข้อง
        linesToRemove.forEach((lineId) => {
            const line = overlays.connectionLines.get(lineId);
            if (line) {
                line.setMap(null);
                overlays.connectionLines.delete(lineId);
            }
        });

        console.log(`🗑️ Removed ${linesToRemove.length} connection lines for pipe ${pipeId}`);
    }, []);

    const clearPipeOverlays = useCallback(
        (type?: PipeType) => {
            const pipesToRemove: string[] = [];
            overlaysRef.current.pipes.forEach((pipePolyline, pipeId) => {
                if (!type) {
                    pipesToRemove.push(pipeId);
                    return;
                }
                const strokeColor = pipePolyline.get('strokeColor');
                const targetColor = getPipeConfig(type).color;
                if (strokeColor === targetColor) {
                    pipesToRemove.push(pipeId);
                }
            });

            pipesToRemove.forEach((pipeId) => {
                overlaysRef.current.pipes.get(pipeId)?.setMap(null);
                overlaysRef.current.pipes.delete(pipeId);
                // also clear any labels linked to this pipe
                const labels = overlaysRef.current.pipeLabels.get(pipeId);
                if (labels) {
                    labels.forEach((m) => m.setMap && m.setMap(null));
                    overlaysRef.current.pipeLabels.delete(pipeId);
                }
                const pills = overlaysRef.current.pipeLabelPills.get(pipeId);
                if (pills) {
                    pills.forEach((p) => p.setMap(null));
                    overlaysRef.current.pipeLabelPills.delete(pipeId);
                }
                // ลบเส้นเชื่อมต่อที่เกี่ยวข้องกับท่อย่อยที่ถูกลบ
                removeConnectionLinesForPipe(pipeId);
            });

            // ลบจุดเชื่อมต่อเมื่อลบท่อย่อยจะถูกจัดการใน useEffect
        },
        [removeConnectionLinesForPipe]
    );

    // clearDrawingPreview and updateDrawingPreview เหมือนเดิม
    const clearDrawingPreview = useCallback(() => {
        if (overlaysRef.current.drawingPreview) {
            overlaysRef.current.drawingPreview.setMap(null);
            overlaysRef.current.drawingPreview = undefined;
        }
        if (overlaysRef.current.distanceLine) {
            overlaysRef.current.distanceLine.setMap(null);
            overlaysRef.current.distanceLine = undefined;
        }
        // Hide reusable preview markers instead of destroying
        if (overlaysRef.current.previewEndLabel instanceof google.maps.Marker)
            overlaysRef.current.previewEndLabel.setMap(null);
        if (overlaysRef.current.previewTypeLabel instanceof google.maps.Marker)
            overlaysRef.current.previewTypeLabel.setMap(null);
        if (overlaysRef.current.previewMidLabel instanceof google.maps.Marker)
            overlaysRef.current.previewMidLabel.setMap(null);
        if (overlaysRef.current.previewEndPill) overlaysRef.current.previewEndPill.setMap(null);
        if (overlaysRef.current.previewMidPill) overlaysRef.current.previewMidPill.setMap(null);
        overlaysRef.current.previewEndLabel = undefined;
        overlaysRef.current.previewTypeLabel = undefined;
        overlaysRef.current.previewMidLabel = undefined;
        overlaysRef.current.previewEndPill = undefined;
        overlaysRef.current.previewMidPill = undefined;
        if (overlaysRef.current.connectedSprinklerMarkers) {
            overlaysRef.current.connectedSprinklerMarkers.forEach((m) => m.setMap(null));
            overlaysRef.current.connectedSprinklerMarkers = [];
        }
        overlaysRef.current.distanceLabels.forEach((label) => {
            label.setMap(null);
        });
        overlaysRef.current.distanceLabels = [];
    }, []);

    const updateDrawingPreview = useCallback(
        (
            coordinates: Coordinate[],
            pipeType: PipeType,
            distance: number,
            curveType: CurveType = 'straight',
            connectedSprinklers?: Coordinate[],
            flowRate?: number
        ) => {
            if (!mapRef.current || coordinates.length < 2) {
                clearDrawingPreview();
                return;
            }

            const config = getPipeConfig(pipeType);

            // Generate curved preview if needed
            let previewCoordinates = coordinates;
            if (curveType !== 'straight') {
                previewCoordinates = generateSmoothCurve(coordinates, curveType, 0.5);
            }

            // Update or create drawing preview line
            if (!overlaysRef.current.drawingPreview) {
                overlaysRef.current.drawingPreview = new google.maps.Polyline({
                    strokeColor: config.color,
                    strokeWeight: config.weight,
                    strokeOpacity: config.opacity,
                    map: mapRef.current,
                    clickable: false,
                    zIndex: 999,
                });
            } else {
                // Ensure style matches current pipe type when reusing preview
                overlaysRef.current.drawingPreview.setOptions({
                    strokeColor: config.color,
                    strokeWeight: config.weight,
                    strokeOpacity: config.opacity,
                });
            }

            overlaysRef.current.drawingPreview.setPath(previewCoordinates);

            // Do not hide markers each frame to avoid flicker. We reuse and update them.

            // Create a simple distance label at the end of the path
            if (previewCoordinates.length > 0) {
                const finalCoord = previewCoordinates[previewCoordinates.length - 1];

                // Create a simple text-based label with better visibility
                // สำหรับ lateral แสดงจำนวนหัว + อัตราการไหลเป็นบรรทัดเดียว (ไม่ขึ้นบรรทัดใหม่)
                let labelText = `${distance.toFixed(1)}m`;
                if (pipeType === 'lateral') {
                    const totalPoints =
                        connectedSprinklers && connectedSprinklers.length
                            ? connectedSprinklers.length
                            : 0;
                    const roundedFlow =
                        typeof flowRate === 'number' ? Math.round(flowRate) : undefined;
                    const parts: string[] = [];
                    if (totalPoints > 0) {
                        parts.push(`🔗 ${totalPoints}`);
                    }
                    if (typeof roundedFlow === 'number') parts.push(`💧 ${roundedFlow} L/min`);
                    const headerText =
                        totalPoints > 0 || typeof roundedFlow === 'number' ? parts.join(' • ') : '';
                    if (headerText) {
                        // แสดงเฉพาะหัวข้อแบบบรรทัดเดียว ไม่แสดงระยะทางในป้ายนี้
                        labelText = `${headerText}`;
                    }
                }

                if (pipeType === 'lateral') {
                    if (!overlaysRef.current.previewEndPill) {
                        overlaysRef.current.previewEndPill = new PillLabel(finalCoord, labelText, {
                            backgroundColor: 'rgba(17, 24, 39, 0.85)',
                            textColor: '#fff',
                            fontSize: '14px',
                            fontWeight: '700',
                            padding: '6px 10px',
                            borderRadius: '999px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                            zIndex: 1002,
                        });
                        overlaysRef.current.previewEndPill.setMap(mapRef.current);
                    } else {
                        overlaysRef.current.previewEndPill.setPosition(finalCoord);
                        overlaysRef.current.previewEndPill.setText(labelText);
                        overlaysRef.current.previewEndPill.setMap(mapRef.current);
                    }
                } else {
                    if (
                        !overlaysRef.current.previewEndLabel ||
                        !(overlaysRef.current.previewEndLabel instanceof google.maps.Marker)
                    ) {
                        overlaysRef.current.previewEndLabel = new google.maps.Marker({
                            position: finalCoord,
                            map: mapRef.current,
                            clickable: false,
                            zIndex: 1002,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: config.color,
                                fillOpacity: 0.9,
                                strokeColor: 'white',
                                strokeWeight: 2,
                            },
                            label: {
                                text: labelText,
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: 'bold',
                            },
                        });
                    } else {
                        overlaysRef.current.previewEndLabel.setPosition(finalCoord);
                        overlaysRef.current.previewEndLabel.setMap(mapRef.current);
                        if (overlaysRef.current.previewEndLabel instanceof google.maps.Marker)
                            overlaysRef.current.previewEndLabel.setLabel({
                                text: labelText,
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: 'bold',
                            } as google.maps.MarkerLabel);
                    }
                }

                // Add pipe type label slightly offset (avoid duplicating sprinklers info shown in end label)
                const typeText = `${pipeType.toUpperCase()}${curveType !== 'straight' ? ` (${curveType})` : ''}`;

                const typePos = { lat: finalCoord.lat + 0.0001, lng: finalCoord.lng + 0.0001 };
                if (!overlaysRef.current.previewTypeLabel) {
                    overlaysRef.current.previewTypeLabel = new google.maps.Marker({
                        position: typePos,
                        map: mapRef.current,
                        clickable: false,
                        zIndex: 1001,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 0,
                            fillColor: 'transparent',
                            fillOpacity: 0,
                            strokeColor: 'transparent',
                            strokeWeight: 0,
                        },
                        label: {
                            text: typeText,
                            color: config.color,
                            fontSize: '12px',
                            fontWeight: 'bold',
                        },
                    });
                } else {
                    overlaysRef.current.previewTypeLabel.setPosition(typePos);
                    overlaysRef.current.previewTypeLabel.setMap(mapRef.current);
                    if (overlaysRef.current.previewTypeLabel instanceof google.maps.Marker)
                        overlaysRef.current.previewTypeLabel.setLabel({
                            text: typeText,
                            color: config.color,
                            fontSize: '12px',
                            fontWeight: 'bold',
                        } as google.maps.MarkerLabel);
                }

                // เพิ่มจุดแสดงสปริงเกลอร์ที่เชื่อมต่อแล้วสำหรับ lateral
                if (pipeType === 'lateral' && connectedSprinklers) {
                    overlaysRef.current.connectedSprinklerMarkers =
                        overlaysRef.current.connectedSprinklerMarkers || [];
                    const needed = connectedSprinklers.length;
                    // Ensure pool size
                    for (
                        let i = overlaysRef.current.connectedSprinklerMarkers.length;
                        i < needed;
                        i++
                    ) {
                        const marker = new google.maps.Marker({
                            position: previewCoordinates[0],
                            map: mapRef.current!,
                            clickable: false,
                            zIndex: 1003,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 6,
                                fillColor: '#00ff00',
                                fillOpacity: 0.8,
                                strokeColor: '#ffffff',
                                strokeWeight: 2,
                            },
                        });
                        overlaysRef.current.connectedSprinklerMarkers.push(marker);
                    }
                    // Update positions and show
                    for (let i = 0; i < overlaysRef.current.connectedSprinklerMarkers.length; i++) {
                        const marker = overlaysRef.current.connectedSprinklerMarkers[i];
                        if (i < needed) {
                            const pos = connectedSprinklers[i];
                            marker.setPosition(pos);
                            marker.setVisible(true);
                            marker.setMap(mapRef.current);
                        } else {
                            marker.setVisible(false);
                        }
                    }
                }
            }

            // Add intermediate on-line label (for lateral: show sprinklers + flow) or distance for others
            if (previewCoordinates.length > 6) {
                const midPoint = Math.floor(previewCoordinates.length / 2);
                const midCoord = previewCoordinates[midPoint];
                const midDistance = calculateDistance(previewCoordinates.slice(0, midPoint + 1));
                // สร้างข้อความสำหรับกลางเส้น: ถ้าเป็น lateral แสดงจำนวนหัวและอัตราการไหล (แบบเรียลไทม์) ด้วยรูปแบบอ่านง่าย
                let midLabelText = `${midDistance.toFixed(1)}m`;
                if (
                    pipeType === 'lateral' &&
                    connectedSprinklers &&
                    connectedSprinklers.length >= 0
                ) {
                    if (typeof flowRate === 'number') {
                        midLabelText = `🔗 ${connectedSprinklers.length} • 💧 ${Math.round(flowRate)} L/min`;
                    } else {
                        midLabelText = `🔗 ${connectedSprinklers.length}`;
                    }
                }

                if (pipeType === 'lateral') {
                    if (!overlaysRef.current.previewMidPill) {
                        overlaysRef.current.previewMidPill = new PillLabel(midCoord, midLabelText, {
                            backgroundColor: 'rgba(31, 41, 55, 0.85)',
                            textColor: '#fff',
                            fontSize: '13px',
                            fontWeight: '700',
                            padding: '4px 8px',
                            borderRadius: '999px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                            zIndex: 1001,
                        });
                        overlaysRef.current.previewMidPill.setMap(mapRef.current);
                    } else {
                        overlaysRef.current.previewMidPill.setPosition(midCoord);
                        overlaysRef.current.previewMidPill.setText(midLabelText);
                        overlaysRef.current.previewMidPill.setMap(mapRef.current);
                    }
                } else {
                    if (
                        !overlaysRef.current.previewMidLabel ||
                        !(overlaysRef.current.previewMidLabel instanceof google.maps.Marker)
                    ) {
                        overlaysRef.current.previewMidLabel = new google.maps.Marker({
                            position: midCoord,
                            map: mapRef.current,
                            clickable: false,
                            zIndex: 1001,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 6,
                                fillColor: config.color,
                                fillOpacity: 0.7,
                                strokeColor: 'white',
                                strokeWeight: 1,
                            },
                            label: {
                                text: midLabelText,
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 'bold',
                            },
                        });
                    } else {
                        overlaysRef.current.previewMidLabel.setPosition(midCoord);
                        overlaysRef.current.previewMidLabel.setMap(mapRef.current);
                        if (overlaysRef.current.previewMidLabel instanceof google.maps.Marker)
                            overlaysRef.current.previewMidLabel.setLabel({
                                text: midLabelText,
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 'bold',
                            } as google.maps.MarkerLabel);
                    }
                }
            }
        },
        [mapRef, clearDrawingPreview]
    );

    // drawMainArea เหมือนเดิม
    const drawMainArea = useCallback((coordinates: Coordinate[]) => {
        if (!mapRef.current || coordinates.length < 3) return;

        if (!overlaysRef.current.mainArea) {
            const polygon = new google.maps.Polygon({
                paths: [coordinates],
                fillColor: '#86EFAC',
                fillOpacity: 0.15,
                strokeColor: '#22C55E',
                strokeWeight: 2,
                strokeOpacity: 1,
                map: mapRef.current,
                clickable: false,
                zIndex: 500,
            });

            overlaysRef.current.mainArea = polygon;
        } else {
            overlaysRef.current.mainArea.setPaths([coordinates]);
        }
    }, []);

    // ปรับปรุง drawZones ให้มีประสิทธิภาพ
    const drawZones = useCallback((zones: Zone[]) => {
        if (!mapRef.current) return;
        const currentZoneMap = overlaysRef.current.zones;
        const newZoneIds = new Set(zones.map((z) => z.id));

        // ลบโซนที่ไม่มีในข้อมูลใหม่
        currentZoneMap.forEach((polygon, zoneId) => {
            if (!newZoneIds.has(zoneId)) {
                polygon.setMap(null);
                currentZoneMap.delete(zoneId);
            }
        });

        // เพิ่มโซนใหม่ หรืออัปเดตโซนที่มีอยู่
        zones.forEach((zone) => {
            const existing = currentZoneMap.get(zone.id);
            if (existing) {
                existing.setOptions({
                    fillColor: zone.color,
                    fillOpacity: 0.35,
                    strokeColor: zone.color,
                    strokeWeight: 2,
                    strokeOpacity: 0.9,
                    zIndex: 800,
                    clickable: false,
                });
                existing.setPaths([zone.coordinates]);
            } else {
                const polygon = new google.maps.Polygon({
                    paths: [zone.coordinates],
                    fillColor: zone.color,
                    fillOpacity: 0.35,
                    strokeColor: zone.color,
                    strokeWeight: 2,
                    strokeOpacity: 0.9,
                    map: mapRef.current,
                    zIndex: 800,
                    clickable: false,
                });
                currentZoneMap.set(zone.id, polygon);
            }
        });
    }, []);

    // ปรับปรุง drawObstacles ให้มีประสิทธิภาพ
    const drawObstacles = useCallback((obstacles: Obstacle[]) => {
        if (!mapRef.current) return;
        const currentObstacleMap = overlaysRef.current.obstacles;
        const newObstacleIds = new Set(obstacles.map((o) => o.id));

        currentObstacleMap.forEach((polygon, obstacleId) => {
            if (!newObstacleIds.has(obstacleId)) {
                polygon.setMap(null);
                currentObstacleMap.delete(obstacleId);
            }
        });

        obstacles.forEach((obstacle) => {
            if (!currentObstacleMap.has(obstacle.id)) {
                const colors = getObstacleColors(obstacle.type);
                const polygon = new google.maps.Polygon({
                    paths: [obstacle.coordinates],
                    fillColor: colors.fill,
                    fillOpacity: 0.3,
                    strokeColor: colors.stroke,
                    strokeWeight: 1,
                    strokeOpacity: 0.8,
                    map: mapRef.current,
                    clickable: false,
                });
                currentObstacleMap.set(obstacle.id, polygon);
            }
        });
    }, []);

    // ปรับปรุง drawPlantPoints ให้มีประสิทธิภาพ
    const drawPlantPoints = useCallback((plants: PlantPoint[]) => {
        if (!mapRef.current) return;

        const currentPlantMap = overlaysRef.current.plants;
        const newPlantIds = new Set(plants.map((p) => p.id));

        // 1. ลบ Markers ที่ไม่มีในข้อมูลชุดใหม่
        currentPlantMap.forEach((marker, plantId) => {
            if (!newPlantIds.has(plantId)) {
                marker.setMap(null);
                currentPlantMap.delete(plantId);
            }
        });

        // 2. เพิ่ม Markers ใหม่
        const plantIcon = {
            url:
                'data:image/svg+xml;charset=UTF-8,' +
                encodeURIComponent(`
          <svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
            <circle cx="4" cy="4" r="3" fill="#22c55e" stroke="#16a34a" stroke-width="1"/>
          </svg>
        `),
            scaledSize: new google.maps.Size(8, 8),
            anchor: new google.maps.Point(4, 4),
        };

        plants.forEach((plant) => {
            if (!currentPlantMap.has(plant.id)) {
                const marker = new google.maps.Marker({
                    position: { lat: plant.lat, lng: plant.lng },
                    map: mapRef.current,
                    icon: plantIcon,
                    title: `Plant: ${plant.cropType}`,
                    optimized: true, // เปิดใช้งาน optimized rendering
                    clickable: false,
                });
                currentPlantMap.set(plant.id, marker);
            }
        });
    }, []);

    // irrigation และ pumps จะยังคงใช้ logic เดิมก่อนเพื่อความง่าย แต่สามารถปรับปรุงได้เช่นกัน
    //...
    const createIrrigationMarkers = useCallback(
        (map: google.maps.Map, positions: IrrigationPositions, settings: IrrigationSettings) => {
            const totalIrrigationCount =
                positions.sprinklers.length +
                positions.pivots.length +
                positions.dripTapes.length +
                positions.waterJets.length;

            if (overlaysRef.current.irrigation.size !== totalIrrigationCount) {
                overlaysRef.current.irrigation.forEach((marker) => marker.setMap(null));
                overlaysRef.current.circles.forEach((circle) => circle.setMap(null));
                overlaysRef.current.irrigation = new Map();
                overlaysRef.current.circles = new Map();

                // Create sprinkler markers
                positions.sprinklers.forEach((pos, index) => {
                    const id = `sprinkler-${index}`;
                    const marker = new google.maps.Marker({
                        position: pos,
                        map: map,
                        icon: {
                            url:
                                'data:image/svg+xml;charset=UTF-8,' +
                                encodeURIComponent(`
              <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                <circle cx="6" cy="6" r="5" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"/>
                <circle cx="6" cy="6" r="2" fill="#ffffff"/>
              </svg>
            `),
                            scaledSize: new google.maps.Size(12, 12),
                            anchor: new google.maps.Point(6, 6),
                        },
                        title: `Sprinkler ${index + 1}`,
                        optimized: true,
                        clickable: false,
                        zIndex: 650,
                    });
                    overlaysRef.current.irrigation.set(id, marker);

                    if (settings?.sprinkler_system?.coverageRadius) {
                        const circle = new google.maps.Circle({
                            center: pos,
                            radius: settings.sprinkler_system.coverageRadius,
                            fillColor: '#3b82f6',
                            fillOpacity: 0.2,
                            strokeColor: '#1d4ed8',
                            strokeOpacity: 0.6,
                            strokeWeight: 1,
                            map: map,
                            clickable: false,
                            zIndex: 700,
                        });
                        overlaysRef.current.circles.set(id, circle);
                    }
                });

                // Create pivot markers
                positions.pivots.forEach((pos, index) => {
                    const id = `pivot-${index}`;
                    const marker = new google.maps.Marker({
                        position: pos,
                        map: map,
                        icon: {
                            url:
                                'data:image/svg+xml;charset=UTF-8,' +
                                encodeURIComponent(`
              <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                <circle cx="6" cy="6" r="5" fill="#f97316" stroke="#ea580c" stroke-width="1"/>
                <circle cx="6" cy="6" r="2" fill="#ffffff"/>
              </svg>
            `),
                            scaledSize: new google.maps.Size(12, 12),
                            anchor: new google.maps.Point(6, 6),
                        },
                        title: `Pivot ${index + 1}`,
                        optimized: true,
                        clickable: false,
                        zIndex: 650,
                    });
                    overlaysRef.current.irrigation.set(id, marker);

                    if (settings?.pivot?.coverageRadius) {
                        const circle = new google.maps.Circle({
                            center: pos,
                            radius: settings.pivot.coverageRadius,
                            fillColor: '#f97316',
                            fillOpacity: 0.2,
                            strokeColor: '#ea580c',
                            strokeOpacity: 1.0,
                            strokeWeight: 1,
                            map: map,
                            clickable: false,
                            zIndex: 700,
                        });
                        overlaysRef.current.circles.set(id, circle);
                    }
                });

                // Create drip tape and water jet markers
                [
                    { points: positions.dripTapes, name: 'Drip Tape', color: '#3b82f6' },
                    { points: positions.waterJets, name: 'Water Jet', color: '#f97316' },
                ].forEach(({ points, name, color }) => {
                    points.forEach((pos, index) => {
                        const id = `${name.toLowerCase().replace(' ', '')}-${index}`;
                        const marker = new google.maps.Marker({
                            position: pos,
                            map: map,
                            icon: {
                                url:
                                    'data:image/svg+xml;charset=UTF-8,' +
                                    encodeURIComponent(`
                <svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="4" cy="4" r="3" fill="${color}" stroke="${color}" stroke-width="1"/>
                </svg>
              `),
                                scaledSize: new google.maps.Size(8, 8),
                                anchor: new google.maps.Point(4, 4),
                            },
                            title: `${name} ${index + 1}`,
                            optimized: true,
                            clickable: false,
                            zIndex: 650,
                        });
                        overlaysRef.current.irrigation.set(id, marker);
                    });
                });
            }
        },
        []
    );

    const drawIrrigation = useCallback(
        (positions: IrrigationPositions, settings: IrrigationSettings) => {
            if (!mapRef.current) return;
            createIrrigationMarkers(mapRef.current, positions, settings);
        },
        [createIrrigationMarkers]
    );

    // ปรับปรุง drawPumps ให้มีประสิทธิภาพ
    const drawPumps = useCallback((pumps: Pump[], onRemovePump?: (pumpId: string) => void) => {
        if (!mapRef.current) return;

        const currentPumpMap = overlaysRef.current.pumps;
        const newPumpIds = new Set(pumps.map((p) => p.id));

        // ลบ pumps ที่ไม่มี
        currentPumpMap.forEach((marker, pumpId) => {
            if (!newPumpIds.has(pumpId)) {
                marker.setMap(null);
                currentPumpMap.delete(pumpId);
            }
        });

        // เพิ่ม pumps ใหม่
        pumps.forEach((pump) => {
            if (!currentPumpMap.has(pump.id)) {
                const pumpIcon = {
                    url: '/generateTree/wtpump.png',
                    scaledSize: new google.maps.Size(32, 32),
                    anchor: new google.maps.Point(16, 16),
                };

                const marker = new google.maps.Marker({
                    position: { lat: pump.lat, lng: pump.lng },
                    map: mapRef.current,
                    icon: pumpIcon,
                    title: `${pump.name} (${pump.capacity} L/h)`,
                    clickable: true,
                    zIndex: 3000,
                });

                marker.addListener('click', () => {
                    const infoWindow = new google.maps.InfoWindow({
                        content: `
                <div style="padding: 10px; font-family: Arial, sans-serif; min-width: 200px;">
                  <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">${pump.name}</h3>
                  <p style="margin: 5px 0; color: #666; font-size: 14px;">
                    <strong>Capacity:</strong> ${pump.capacity} L/h
                  </p>
                  <p style="margin: 5px 0; color: #666; font-size: 14px;">
                    <strong>Location:</strong> ${pump.lat.toFixed(6)}, ${pump.lng.toFixed(6)}
                  </p>
                  <div style="margin-top: 15px; text-align: center;">
                    <button 
                      onclick="window.deletePump('${pump.id}')" 
                      style="
                        background-color: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 4px; 
                        cursor: pointer; font-size: 14px;"
                      onmouseover="this.style.backgroundColor='#b91c1c'"
                      onmouseout="this.style.backgroundColor='#dc2626'"
                    >
                      🗑️ Delete Pump
                    </button>
                  </div>
                </div>
              `,
                        maxWidth: 250,
                    });

                    (window as { deletePump?: (pumpId: string) => void }).deletePump = (
                        pumpId: string
                    ) => {
                        if (onRemovePump) onRemovePump(pumpId);
                        infoWindow.close();
                    };

                    infoWindow.open(mapRef.current, marker);
                });
                currentPumpMap.set(pump.id, marker);
            }
        });
    }, []);

    // ปรับปรุง drawPipes ให้มีประสิทธิภาพ
    const drawPipes = useCallback(
        (pipes: Pipe[], editingPipeId: string | null, onPipeClick: (pipeId: string) => void) => {
            if (!mapRef.current) return;

            const currentPipeMap = overlaysRef.current.pipes;
            const newPipeIds = new Set(pipes.map((p) => p.id));

            // ลบ pipes ที่ไม่มี
            currentPipeMap.forEach((polyline, pipeId) => {
                if (!newPipeIds.has(pipeId)) {
                    google.maps.event.clearInstanceListeners(polyline);
                    polyline.setMap(null);
                    currentPipeMap.delete(pipeId);
                    // remove any info labels associated with this pipe
                    const labels = overlaysRef.current.pipeLabels.get(pipeId);
                    if (labels) {
                        labels.forEach((m) => m.setMap(null));
                        overlaysRef.current.pipeLabels.delete(pipeId);
                    }
                    const pills = overlaysRef.current.pipeLabelPills.get(pipeId);
                    if (pills) {
                        pills.forEach((p) => p.setMap(null));
                        overlaysRef.current.pipeLabelPills.delete(pipeId);
                    }
                    // ลบเส้นเชื่อมต่อที่เกี่ยวข้องกับท่อย่อยที่ถูกลบ
                    removeConnectionLinesForPipe(pipeId);
                }
            });

            // เพิ่ม/อัปเดต pipes
            pipes.forEach((pipe) => {
                const isEditing = pipe.id === editingPipeId;
                const config = getPipeConfig(pipe.type);
                const existingPolyline = currentPipeMap.get(pipe.id);

                if (existingPolyline) {
                    // อัปเดต pipe ที่มีอยู่
                    existingPolyline.setPath(pipe.coordinates);
                    existingPolyline.setOptions({
                        strokeWeight: isEditing ? config.weight + 2 : config.weight,
                        strokeOpacity: isEditing ? 1 : config.opacity,
                        zIndex: isEditing ? 3500 : 3200,
                    });
                } else {
                    // สร้าง pipe ใหม่
                    const polyline = new google.maps.Polyline({
                        path: pipe.coordinates,
                        strokeColor: config.color,
                        strokeWeight: isEditing ? config.weight + 2 : config.weight,
                        strokeOpacity: isEditing ? 1 : config.opacity,
                        map: mapRef.current,
                        clickable: true,
                        zIndex: isEditing ? 3500 : 3200,
                    }) as ExtendedPolyline;

                    polyline.pipeId = pipe.id;

                    google.maps.event.addListener(polyline, 'click', () => onPipeClick(pipe.id));
                    currentPipeMap.set(pipe.id, polyline);
                }
            });
        },
        [removeConnectionLinesForPipe]
    );

    // drawControlHandles เหมือนเดิม

    // แสดงจุดเชื่อมต่อของท่อย่อยบนแผนที่
    const drawConnectionPoints = useCallback(
        (
            connectionPoints: Array<{
                id: string;
                position: Coordinate;
                connectedLaterals: string[];
                submainId: string;
                type: 'single' | 'junction' | 'crossing' | 'l_shape' | 't_shape' | 'cross_shape';
            }>
        ) => {
            const overlays = overlaysRef.current;

            // ลบจุดเชื่อมต่อเก่าทั้งหมด
            if (overlays.connectionPoints) {
                overlays.connectionPoints.forEach((marker) => marker.setMap(null));
                overlays.connectionPoints.clear();
            }

            if (!mapRef.current) return;

            connectionPoints.forEach((connectionPoint) => {
                let title;

                // ใช้ SVG แทน SymbolPath เพื่อลดการกระพริบ
                let color = '#FFD700'; // default yellow
                let size = 8;

                if (connectionPoint.type === 'junction') {
                    color = '#FFD700'; // สีเหลือง
                    size = 8;
                    title = `จุดเชื่อมต่อ (${connectionPoint.connectedLaterals.length} ท่อ)`;
                } else if (connectionPoint.type === 'crossing') {
                    color = '#4CAF50'; // สีเขียว
                    size = 7;
                    title = `จุดข้ามท่อเมนย่อย (${connectionPoint.connectedLaterals.length} ท่อ)`;
                } else if (connectionPoint.type === 'l_shape') {
                    color = '#F44336'; // สีแดง
                    size = 8;
                    title = 'จุดเชื่อมต่อรูปตัว L (ปลายท่อเมน)';
                } else if (connectionPoint.type === 't_shape') {
                    color = '#2196F3'; // สีน้ำเงิน
                    size = 8;
                    title = 'จุดเชื่อมต่อรูปตัว T (ผ่านปลายท่อเมน)';
                } else if (connectionPoint.type === 'cross_shape') {
                    color = '#9C27B0'; // สีม่วง
                    size = 8;
                    title = 'จุดเชื่อมต่อรูป + (ผ่านเส้นท่อเมน)';
                } else {
                    color = '#FFD700'; // สีเหลือง
                    size = 6;
                    title = 'จุดเชื่อมต่อท่อย่อย';
                }

                const icon = {
                    url:
                        'data:image/svg+xml;charset=UTF-8,' +
                        encodeURIComponent(`
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${color}" stroke="#FFFFFF" stroke-width="1"/>
          </svg>
        `),
                    scaledSize: new google.maps.Size(size, size),
                    anchor: new google.maps.Point(size / 2, size / 2),
                };

                const marker = new google.maps.Marker({
                    position: connectionPoint.position,
                    map: mapRef.current,
                    icon: icon,
                    title: title,
                    zIndex: 650, // ใช้ zIndex เดียวกับจุดสปริงเกลอร์
                    optimized: true, // เปิดการปรับปรุงประสิทธิภาพเพื่อลดการกระพริบ
                    animation: null, // ปิดการเคลื่อนไหวเพื่อลดการกระพริบ
                    clickable: false, // ปิดการคลิกเพื่อลดการกระพริบเหมือนจุดสปริงเกลอร์
                    draggable: false,
                });

                if (overlays.connectionPoints) {
                    overlays.connectionPoints.set(connectionPoint.id, marker);
                }
            });
        },
        []
    );

    // วาดเส้นเชื่อมต่อระหว่างท่อย่อยกับสปริงเกลอร์
    const drawConnectionLines = useCallback(
        (
            lateralPipes: Pipe[],
            irrigationPositions: IrrigationPositions,
            lateralMode: LateralMode,
            findNearbyConnectedIrrigationPoints: (
                coordinates: Coordinate[],
                irrigationPositions: IrrigationPositions,
                radius: number,
                options: { lateralMode: LateralMode; betweenRowsHalfWidth: number }
            ) => {
                sprinklers: Coordinate[];
                dripTapes: Coordinate[];
                waterJets: Coordinate[];
                pivots: Coordinate[];
            }
        ) => {
            const overlays = overlaysRef.current;

            // ลบเส้นเชื่อมต่อเก่าทั้งหมด
            if (overlays.connectionLines) {
                overlays.connectionLines.forEach((line) => line.setMap(null));
                overlays.connectionLines.clear();
            }

            if (!mapRef.current) return;

            // สร้าง Map สำหรับเก็บเส้นเชื่อมต่อ
            if (!overlays.connectionLines) {
                overlays.connectionLines = new Map();
            }

            // Set สำหรับเก็บสปริงเกลอร์ที่เชื่อมต่อแล้ว
            const connectedSprinklers = new Set<string>();

            lateralPipes.forEach((lateral) => {
                if (!lateral.coordinates || lateral.coordinates.length < 2) return;

                // หาสปริงเกลอร์ที่เชื่อมต่อกับท่อย่อยนี้
                const connectedPoints = findNearbyConnectedIrrigationPoints(
                    lateral.coordinates,
                    irrigationPositions,
                    2,
                    { lateralMode, betweenRowsHalfWidth: 1.5 }
                );

                // รวมจุดให้น้ำทั้งหมด
                const allConnectedPoints = [
                    ...connectedPoints.sprinklers,
                    ...connectedPoints.dripTapes,
                    ...connectedPoints.waterJets,
                    ...connectedPoints.pivots,
                ];

                // วาดเส้นเชื่อมต่อจากท่อย่อยไปยังแต่ละจุดให้น้ำ
                allConnectedPoints.forEach((irrigationPoint, index) => {
                    // สร้าง unique key สำหรับสปริงเกลอร์นี้
                    const sprinklerKey = `${irrigationPoint.lat.toFixed(6)}-${irrigationPoint.lng.toFixed(6)}`;

                    // ตรวจสอบว่าสปริงเกลอร์นี้เชื่อมต่อแล้วหรือยัง
                    if (connectedSprinklers.has(sprinklerKey)) {
                        return; // ข้ามสปริงเกลอร์นี้
                    }

                    // หาจุดที่ใกล้ที่สุดบนท่อย่อย
                    let closestPointOnLateral = lateral.coordinates[0];
                    let minDistance = calculateDistanceBetweenPoints(
                        irrigationPoint,
                        closestPointOnLateral
                    );

                    for (let i = 0; i < lateral.coordinates.length - 1; i++) {
                        const { point, distance } = getClosestPointOnSegment(
                            irrigationPoint,
                            lateral.coordinates[i],
                            lateral.coordinates[i + 1]
                        );
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestPointOnLateral = point;
                        }
                    }

                    // สร้างเส้นเชื่อมต่อเฉพาะจากท่อย่อยไปยังสปริงเกลอร์
                    const connectionLine = new google.maps.Polyline({
                        path: [closestPointOnLateral, irrigationPoint],
                        strokeColor: '#00ff00',
                        strokeWeight: 1,
                        strokeOpacity: 0.7,
                        map: mapRef.current,
                        clickable: false,
                        zIndex: 998,
                    });

                    // เก็บเส้นเชื่อมต่อใน Map
                    const lineId = `${lateral.id}-connection-${index}`;
                    overlays.connectionLines.set(lineId, connectionLine);

                    // บันทึกว่าสปริงเกลอร์นี้เชื่อมต่อแล้ว
                    connectedSprinklers.add(sprinklerKey);
                });
            });

            console.log(
                `🔗 Created ${overlays.connectionLines.size} connection lines for ${lateralPipes.length} lateral pipes, connected ${connectedSprinklers.size} unique sprinklers`
            );
        },
        []
    );

    const drawControlHandles = useCallback(
        (
            pipe: Pipe | undefined,
            onHandleDrag: (index: number, newPosition: Coordinate) => void
        ) => {
            if (!mapRef.current || !pipe) {
                overlaysRef.current.controlHandles.forEach((h) => {
                    if (h.dragListener) {
                        google.maps.event.removeListener(h.dragListener);
                    }
                    h.setMap(null);
                });
                overlaysRef.current.controlHandles = [];
                return;
            }

            // ล้างจุดควบคุมเก่าก่อน
            overlaysRef.current.controlHandles.forEach((h) => {
                if (h.dragListener) {
                    google.maps.event.removeListener(h.dragListener);
                }
                h.setMap(null);
            });
            overlaysRef.current.controlHandles = [];

            // เตรียมจุดสำหรับแสดงผลบนแผนที่
            let displayPoints: Coordinate[] = [];
            let controlPoints: Coordinate[] = [];
            // เมทาดาต้าสำหรับท่อตรง เพื่ออ้างถึงมุมที่แท้จริง/มุมที่ทำโค้งไว้
            const straightMetas: Array<
                | { type: 'sharp'; cornerIndex: number }
                | {
                      type: 'rounded';
                      rc: {
                          cornerIndex: number;
                          A: Coordinate;
                          B: Coordinate;
                          C: Coordinate;
                          r: number;
                      };
                  }
            > = [];

            if (pipe.curveType === 'bezier') {
                // ใช้ controlPoints ที่บันทึกไว้ถ้ามี มิฉะนั้นคำนวณจากเส้นปัจจุบัน
                if (pipe.controlPoints && pipe.controlPoints.length >= 3) {
                    controlPoints = [
                        pipe.controlPoints[0],
                        pipe.controlPoints[1],
                        pipe.controlPoints[2],
                    ];
                } else if (pipe.coordinates.length >= 2) {
                    const start = pipe.coordinates[0];
                    const end = pipe.coordinates[pipe.coordinates.length - 1];
                    let control = undefined as unknown as Coordinate;
                    if (pipe.coordinates.length >= 3) {
                        const midIndex = Math.floor(pipe.coordinates.length / 2);
                        control = pipe.coordinates[midIndex];
                    } else {
                        control = {
                            lat: (start.lat + end.lat) / 2,
                            lng: (start.lng + end.lng) / 2,
                        };
                    }
                    controlPoints = [start, control, end];
                }

                if (controlPoints.length === 3) {
                    const [start, control, end] = controlPoints;
                    // แสดง handle ตรงจุดบนโค้ง (t = 0.5) เพื่อให้ handle อยู่บนเส้นท่อขณะลาก
                    const midOnCurve: Coordinate = {
                        lat: 0.25 * start.lat + 0.5 * control.lat + 0.25 * end.lat,
                        lng: 0.25 * start.lng + 0.5 * control.lng + 0.25 * end.lng,
                    };
                    displayPoints = [start, midOnCurve, end];
                }
            } else if (pipe.curveType === 'spline') {
                // ใช้ controlPoints ที่บันทึกไว้ถ้ามี มิฉะนั้นสุ่มตัวอย่างจากเส้นท่อ
                if (pipe.controlPoints && pipe.controlPoints.length >= 2) {
                    controlPoints = [...pipe.controlPoints];
                } else {
                    const step = Math.max(1, Math.floor(pipe.coordinates.length / 4));
                    for (let i = 0; i < pipe.coordinates.length; i += step) {
                        controlPoints.push(pipe.coordinates[i]);
                    }
                    if (
                        controlPoints.length === 0 ||
                        controlPoints[controlPoints.length - 1] !==
                            pipe.coordinates[pipe.coordinates.length - 1]
                    ) {
                        controlPoints.push(pipe.coordinates[pipe.coordinates.length - 1]);
                    }
                }
                displayPoints = controlPoints;
            } else if (!pipe.curveType || pipe.curveType === 'straight') {
                // แสดงจุดปรับที่มุมภายใน (exclude endpoints)
                const coords = pipe.coordinates;
                for (let i = 1; i < coords.length - 1; i++) {
                    const A = toXY(coords[i - 1]);
                    const B = toXY(coords[i]);
                    const C = toXY(coords[i + 1]);
                    const v1 = normV(subV(B, A));
                    const v2 = normV(subV(C, B));
                    const seg1 = lenV(subV(B, A));
                    const seg2 = lenV(subV(C, B));
                    const cosTheta = Math.max(-1, Math.min(1, dotV(mulV(v1, -1), v2)));
                    const theta = (Math.acos(cosTheta) * 180) / Math.PI;
                    if (seg1 > 1e-6 && seg2 > 1e-6 && theta < 170) {
                        displayPoints.push(coords[i]);
                        straightMetas.push({ type: 'sharp', cornerIndex: i });
                    }
                }
                // เพิ่ม handles สำหรับมุมที่ถูกโค้งไว้ก่อนหน้าให้ใช้ลากต่อได้
                (pipe.roundedCorners || []).forEach((rc) => {
                    if (
                        !rc ||
                        rc.r === undefined ||
                        rc.A === undefined ||
                        rc.B === undefined ||
                        rc.C === undefined
                    )
                        return;
                    const A = toXY(rc.A);
                    const B = toXY(rc.B);
                    const C = toXY(rc.C);
                    const u1 = normV(subV(B, A));
                    const u2 = normV(subV(C, B));
                    const P = addV(B, mulV(u1, -rc.r!));
                    const Q = addV(B, mulV(u2, rc.r!));
                    const I = lineIntersection(P, u1, Q, u2) || B;
                    const mid = mulV(addV(addV(P, mulV(I, 2)), Q), 0.25);
                    const midCoord = fromXY(mid);
                    displayPoints.push(midCoord);
                    straightMetas.push({
                        type: 'rounded',
                        rc: { cornerIndex: rc.cornerIndex, A: rc.A, B: rc.B, C: rc.C, r: rc.r! },
                    });
                });
            }

            // ผูก index กับ metadata เพื่อใช้หา corner index เดิมได้แม่นยำหลัง redraw
            displayPoints.forEach((point, index) => {
                const handle = new google.maps.Marker({
                    position: point,
                    map: mapRef.current,
                    draggable: true,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor:
                            !pipe.curveType || pipe.curveType === 'straight'
                                ? '#FFD700'
                                : index === 0
                                  ? '#2ecc71'
                                  : index === displayPoints.length - 1
                                    ? '#e74c3c'
                                    : '#FFD700',
                        fillOpacity: 1,
                        strokeColor: '#000000',
                        strokeWeight: 2,
                    },
                    optimized: false,
                    title:
                        !pipe.curveType || pipe.curveType === 'straight'
                            ? 'Corner'
                            : index === 0
                              ? 'Start Point'
                              : index === displayPoints.length - 1
                                ? 'End Point'
                                : pipe.curveType === 'bezier'
                                  ? 'Curve Midpoint'
                                  : `Control Point ${index}`,
                    zIndex: 1002,
                }) as ExtendedMarker;
                // ผูกเมทาดาต้า (เฉพาะท่อตรง) เพื่อใช้คง index มุมระหว่างลากและหลังอัปเดต
                if (!pipe.curveType || pipe.curveType === 'straight') {
                    const meta = straightMetas[index];
                    if (meta) handle.set('meta', meta);
                }

                // เพิ่ม drag listeners แบบ persistent
                const dragListener = handle.addListener('drag', () => {
                    const newPosition = handle.getPosition();
                    if (newPosition) {
                        // ใช้ requestAnimationFrame เพื่อให้การอัปเดตเป็นแบบ smooth
                        requestAnimationFrame(() => {
                            // สำหรับท่อตรง: แสดง preview ตามตำแหน่งลาก (ไม่ต้องให้จุดอยู่บนเส้น) และให้ลากกลับได้
                            if (!pipe.curveType || pipe.curveType === 'straight') {
                                const coords = pipe.coordinates;
                                const meta = handle.get('meta') as
                                    | { type: 'sharp'; cornerIndex: number }
                                    | {
                                          type: 'rounded';
                                          rc: {
                                              cornerIndex: number;
                                              A: Coordinate;
                                              B: Coordinate;
                                              C: Coordinate;
                                              r: number;
                                          };
                                      }
                                    | undefined;
                                const cornerIdx =
                                    meta?.type === 'sharp'
                                        ? meta.cornerIndex
                                        : meta?.type === 'rounded'
                                          ? meta.rc.cornerIndex
                                          : undefined;
                                if (cornerIdx !== undefined) {
                                    const A = toXY(coords[cornerIdx - 1]);
                                    const B = toXY(coords[cornerIdx]);
                                    const C = toXY(coords[cornerIdx + 1]);
                                    const AB = subV(B, A);
                                    const BC = subV(C, B);
                                    const u1 = normV(AB);
                                    const u2 = normV(BC);
                                    // ให้ใช้ระยะ r ตามตำแหน่งลากโดยฉายบนแกนของแต่ละขา เพื่อให้ลากไป-กลับได้อิสระ
                                    const T = { x: newPosition.lng(), y: newPosition.lat() };
                                    const r1 = Math.max(0, dotV(subV(T, B), mulV(u1, -1)));
                                    const r2 = Math.max(0, dotV(subV(T, B), u2));
                                    const r = Math.min(
                                        r1,
                                        r2,
                                        Math.min(lenV(AB), lenV(BC)) * 0.499
                                    );
                                    const P = addV(B, mulV(u1, -r));
                                    const Q = addV(B, mulV(u2, r));
                                    const I = lineIntersection(P, u1, Q, u2) || B;
                                    // แสดง preview จาก P-I-Q ตาม r นี้ โดยไม่บังคับตำแหน่งจุดลากให้อยู่บนเส้น
                                    if (overlaysRef.current.cornerPreview) {
                                        const tempCoords: Coordinate[] = [];
                                        for (let j = 0; j < coords.length; j++) {
                                            if (j === cornerIdx) {
                                                const startC = fromXY(P);
                                                const endC = fromXY(Q);
                                                const controlC = fromXY(I || B);
                                                const curved = generateBezierCurve(
                                                    startC,
                                                    endC,
                                                    controlC,
                                                    24
                                                );
                                                tempCoords.push(...curved);
                                            } else {
                                                if (j === cornerIdx - 1) {
                                                    tempCoords.push(fromXY(A));
                                                    tempCoords.push(fromXY(P));
                                                } else if (j === cornerIdx + 1) {
                                                    tempCoords.push(fromXY(Q));
                                                    tempCoords.push(fromXY(C));
                                                } else {
                                                    tempCoords.push(coords[j]);
                                                }
                                            }
                                        }
                                        overlaysRef.current.cornerPreview.setPath(tempCoords);
                                    }
                                }
                            } else if (pipe.curveType === 'bezier') {
                                // Bezier: ให้จุดกลางอยู่บนเส้น (t=0.5) ระหว่างลาก
                                const start = pipe.coordinates[0];
                                const end = pipe.coordinates[pipe.coordinates.length - 1];
                                if (index === 1 && start && end) {
                                    const raw = { lat: newPosition.lat(), lng: newPosition.lng() };
                                    // แปลงตำแหน่งที่ลาก (mid on curve) -> control จริง
                                    const newControl = {
                                        lat: 2 * raw.lat - (start.lat + end.lat) / 2,
                                        lng: 2 * raw.lng - (start.lng + end.lng) / 2,
                                    };
                                    const mid = {
                                        lat:
                                            0.25 * start.lat +
                                            0.5 * newControl.lat +
                                            0.25 * end.lat,
                                        lng:
                                            0.25 * start.lng +
                                            0.5 * newControl.lng +
                                            0.25 * end.lng,
                                    };
                                    handle.setPosition(new google.maps.LatLng(mid.lat, mid.lng));
                                    onHandleDrag(index, newControl);
                                } else {
                                    onHandleDrag(index, {
                                        lat: newPosition.lat(),
                                        lng: newPosition.lng(),
                                    });
                                }
                            } else {
                                onHandleDrag(index, {
                                    lat: newPosition.lat(),
                                    lng: newPosition.lng(),
                                });
                            }
                        });
                    }
                });

                // ระบุสถานะกำลังลาก เพื่อป้องกันการ redraw handles ระหว่างลาก
                handle.addListener('dragstart', () => {
                    (
                        overlaysRef.current as unknown as { isDraggingControl?: boolean }
                    ).isDraggingControl = true;
                    // สร้าง corner preview polyline เมื่อเริ่มลากมุมของท่อตรง
                    if (!pipe.curveType || pipe.curveType === 'straight') {
                        if (!overlaysRef.current.cornerPreview) {
                            overlaysRef.current.cornerPreview = new google.maps.Polyline({
                                map: mapRef.current!,
                                strokeColor: '#FFD700',
                                strokeOpacity: 0.9,
                                strokeWeight: 3,
                                zIndex: 1003,
                                clickable: false,
                            });
                        }
                    }
                });
                handle.addListener('dragend', () => {
                    (
                        overlaysRef.current as unknown as { isDraggingControl?: boolean }
                    ).isDraggingControl = false;
                    const endPos = handle.getPosition();
                    if (endPos) {
                        const endLatLng = { lat: endPos.lat(), lng: endPos.lng() };
                        if (!pipe.curveType || pipe.curveType === 'straight') {
                            // คำนวณ r ตามแนว bisector แล้วปรับใช้ครั้งเดียว โดยคงความยาวท่อเดิม
                            const coords = pipe.coordinates;
                            const cornerIndices: number[] = [];
                            for (let i = 1; i < coords.length - 1; i++) {
                                const A = toXY(coords[i - 1]);
                                const B = toXY(coords[i]);
                                const C = toXY(coords[i + 1]);
                                const v1 = normV(subV(B, A));
                                const v2 = normV(subV(C, B));
                                const seg1 = lenV(subV(B, A));
                                const seg2 = lenV(subV(C, B));
                                const cosTheta = Math.max(-1, Math.min(1, dotV(mulV(v1, -1), v2)));
                                const theta = (Math.acos(cosTheta) * 180) / Math.PI;
                                if (seg1 > 1e-6 && seg2 > 1e-6 && theta < 170)
                                    cornerIndices.push(i);
                            }
                            const cornerIdx = cornerIndices[index];
                            if (cornerIdx !== undefined) {
                                const A = toXY(coords[cornerIdx - 1]);
                                const B = toXY(coords[cornerIdx]);
                                const C = toXY(coords[cornerIdx + 1]);
                                const AB = subV(B, A);
                                const BC = subV(C, B);
                                const u1 = normV(AB);
                                const u2 = normV(BC);
                                const bis = normV(addV(mulV(u1, -1), u2));
                                if (lenV(bis) > 0) {
                                    const T = { x: endLatLng.lng, y: endLatLng.lat };
                                    const projLen = dotV(subV(T, B), bis);
                                    const seg1 = lenV(AB);
                                    const seg2 = lenV(BC);
                                    const rMax = Math.max(0, Math.min(seg1, seg2) * 0.499);
                                    // หา r ที่คงความยาวเดิม: ใช้ binary search หา r* ที่ทำให้ |AB|+|BC| ≈ |AB|-r + arc + |BC|-r
                                    const originalLength = calculateDistance(coords);
                                    const computeLengthWith = (rTest: number) => {
                                        const P = addV(B, mulV(u1, -rTest));
                                        const Q = addV(B, mulV(u2, rTest));
                                        const I = lineIntersection(P, u1, Q, u2) || B;
                                        const startC = fromXY(P);
                                        const endC = fromXY(Q);
                                        const controlC = fromXY(I);
                                        const curved = generateBezierCurve(
                                            startC,
                                            endC,
                                            controlC,
                                            24
                                        );
                                        const temp: Coordinate[] = [];
                                        for (let j = 0; j < coords.length; j++) {
                                            if (j === cornerIdx) {
                                                temp.push(...curved);
                                            } else if (j === cornerIdx - 1) {
                                                temp.push(fromXY(A));
                                                temp.push(fromXY(P));
                                            } else if (j === cornerIdx + 1) {
                                                temp.push(fromXY(Q));
                                                temp.push(fromXY(C));
                                            } else {
                                                temp.push(coords[j]);
                                            }
                                        }
                                        return calculateDistance(temp);
                                    };
                                    let low = 0,
                                        high = Math.max(0, Math.min(rMax, projLen));
                                    for (let it = 0; it < 18; it++) {
                                        const mid = (low + high) / 2;
                                        const lenMid = computeLengthWith(mid);
                                        if (lenMid > originalLength) {
                                            // โค้งยาวเกิน ลด r
                                            high = mid;
                                        } else {
                                            // โค้งสั้นไป เพิ่ม r
                                            low = mid;
                                        }
                                    }
                                    const rStar = (low + high) / 2;
                                    const bisPoint = addV(B, mulV(bis, rStar));
                                    // ส่งค่าที่คำนวณแล้วไปอัปเดตเส้นจริงครั้งเดียว
                                    onHandleDrag(index, { lat: bisPoint.y, lng: bisPoint.x });
                                    // เก็บสถานะมุมที่โค้งไว้ เพื่อให้ลากต่อได้และไม่หาย
                                    const Acoord = fromXY(A);
                                    const Bcoord = fromXY(B);
                                    const Ccoord = fromXY(C);
                                    const existing = pipe.roundedCorners || [];
                                    const updatedRounded = [
                                        ...existing.filter((rc) => rc.cornerIndex !== cornerIdx),
                                        {
                                            cornerIndex: cornerIdx,
                                            A: Acoord,
                                            B: Bcoord,
                                            C: Ccoord,
                                            r: rStar,
                                        },
                                    ];
                                    // อัปเดต metadata ลงใน state ของ pipe (ไม่เปลี่ยนความยาว)
                                    const currentPipe = pipe;
                                    currentPipe.roundedCorners = updatedRounded;
                                }
                            }
                        } else {
                            onHandleDrag(index, endLatLng);
                        }
                    }
                    // ล้าง corner preview หลังลากเสร็จ
                    if (overlaysRef.current.cornerPreview) {
                        overlaysRef.current.cornerPreview.setMap(null);
                        overlaysRef.current.cornerPreview = undefined;
                    }
                });

                // เก็บ reference ของ listener เพื่อล้างในภายหลัง
                handle.dragListener = dragListener;

                overlaysRef.current.controlHandles.push(handle);
            });
        },
        []
    );

    // fitBounds เหมือนเดิม
    const fitBounds = useCallback((coordinates: Coordinate[]) => {
        if (!mapRef.current || coordinates.length === 0) return;
        const bounds = new google.maps.LatLngBounds();
        coordinates.forEach((coord) => bounds.extend(new google.maps.LatLng(coord.lat, coord.lng)));
        mapRef.current.fitBounds(bounds);
    }, []);

    // updateMapVisuals เรียกใช้ฟังก์ชันที่ปรับปรุงแล้ว
    const updateMapVisuals = useCallback(
        (fieldData: FieldData) => {
            if (!mapRef.current) return;

            if (fieldData.mainArea.length > 0) {
                drawMainArea(fieldData.mainArea);
            }
            if (fieldData.zones.length > 0) {
                drawZones(fieldData.zones);
            }
            if (fieldData.obstacles.length > 0) {
                drawObstacles(fieldData.obstacles);
            }
            if (fieldData.plantPoints.length > 0) {
                drawPlantPoints(fieldData.plantPoints);
            }
            if (fieldData.irrigationPositions) {
                drawIrrigation(fieldData.irrigationPositions, fieldData.irrigationSettings);
            }
        },
        [drawMainArea, drawZones, drawObstacles, drawPlantPoints, drawIrrigation]
    );

    const exposeOverlaysRef = useCallback(() => {
        return overlaysRef as React.MutableRefObject<{
            mainArea?: google.maps.Polygon;
            zones: Map<string, google.maps.Polygon>;
            obstacles: Map<string, google.maps.Polygon>;
            plants: Map<string, google.maps.Marker>;
            irrigation: Map<string, google.maps.Marker>;
            circles: Map<string, google.maps.Circle>;
            pipes: Map<string, ExtendedPolyline>;
            drawingPreview?: google.maps.Polyline;
            previewEndLabel?: PipeLabelOverlay;
            previewEndPill?: PillLabel;
            previewTypeLabel?: PipeLabelOverlay;
            previewMidLabel?: PipeLabelOverlay;
            previewMidPill?: PillLabel;
            connectedSprinklerMarkers?: google.maps.Marker[];
            distanceLabels: google.maps.Marker[];
            distanceLine?: google.maps.Polyline;
            pumps: Map<string, google.maps.Marker>;
            controlHandles: ExtendedMarker[];
            cornerPreview?: google.maps.Polyline;
            drawingListeners?: google.maps.MapsEventListener[];
            isDraggingControl?: boolean;
            pipeLabels: Map<string, PipeLabelOverlay[]>;
            pipeLabelPills: Map<string, PillLabel[]>;
            connectionPoints: Map<string, google.maps.Marker>;
            connectionLines: Map<string, google.maps.Polyline>;
        }>;
    }, []);

    return useMemo(
        () => ({
            mapRef,
            drawingManagerRef,
            overlaysRef: exposeOverlaysRef(),
            clearAllOverlays,
            clearPipeOverlays,
            clearDrawingPreview,
            updateDrawingPreview,
            drawPumps,
            drawPipes,
            drawControlHandles,
            drawConnectionPoints,
            drawConnectionLines,
            removeConnectionLinesForPipe,
            fitBounds,
            updateMapVisuals,
        }),
        [
            mapRef,
            drawingManagerRef,
            exposeOverlaysRef,
            clearAllOverlays,
            clearPipeOverlays,
            clearDrawingPreview,
            updateDrawingPreview,
            drawPumps,
            drawPipes,
            drawControlHandles,
            drawConnectionPoints,
            drawConnectionLines,
            removeConnectionLinesForPipe,
            fitBounds,
            updateMapVisuals,
        ]
    );
};
// ======================== MODIFIED SECTION END ========================

// ===== MAIN COMPONENT =====
export default function PipeGenerate(props: PipeGenerateProps) {
    const { t } = useLanguage();
    const { saveToStorage, loadFromStorage, resetPipesOnly } = useFieldData();

    // On fresh reload (no URL params), match Reset: clear only pipes from storage
    useEffect(() => {
        const hasUrlParams = Object.values(props).some((v) => v !== undefined);
        if (!hasUrlParams) {
            try {
                resetPipesOnly();
            } catch (e) {
                console.error('Error clearing pipes on fresh reload:', e);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const pipeManager = usePipeManager();
    const { setPipes } = pipeManager;
    const snapSystem = useSnapSystem();
    const mapManager = useMapManager();

    // ... (ส่วน state และ useEffects อื่นๆ ที่ไม่เกี่ยวกับการ re-render แผนที่ เหมือนเดิม) ...
    // ... (โค้ดส่วนที่เหลือทั้งหมดเหมือนเดิมทุกประการ) ...

    const [fieldData, setFieldData] = useState<FieldData>({
        selectedCrops: [],
        mainArea: [],
        zones: [],
        obstacles: [],
        plantPoints: [],
        pipes: [],
        areaRai: null,
        perimeterMeters: null,
        rowSpacing: {},
        plantSpacing: {},
        selectedIrrigationType: '',
        irrigationCounts: {
            sprinkler_system: 0,
            pivot: 0,
            drip_tape: 0,
            water_jet_tape: 0,
        },
        totalWaterRequirement: 0,
        irrigationSettings: {},
        irrigationPositions: {
            sprinklers: [],
            pivots: [],
            dripTapes: [],
            waterJets: [],
        },
        mapCenter: { lat: 13.7563, lng: 100.5018 },
        mapZoom: 16,
    });

    const [mapStatus, setMapStatus] = useState({
        center: { lat: 13.7563, lng: 100.5018 },
        zoom: 16,
    });

    const [lateralReference, setLateralReference] = useState<{
        pipeId: string;
        length: number;
        flowLpm: number;
    } | null>(null);

    // Notification modal state
    const [notificationModal, setNotificationModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        warningMessage: '',
        type: 'info' as 'info' | 'warning' | 'success' | 'error',
        showColorOptions: false,
        onConfirm: null as ((selectedPattern?: 'extending' | 'crossing') => void) | null,
        onCancel: null as (() => void) | null,
    });

    // ===== Sprinkler-based recommended pipe length warnings (submain & lateral only) =====
    // Deprecated legacy maps for prior logic removed

    const pipeOverLengthWarnings = useMemo(() => {
        // ตรรกะใหม่: ใช้ท่อย่อยเส้นอ้างอิง (เส้นแรกที่วาดหรือที่ผู้ใช้ยอมรับแทน) เป็นเกณฑ์เดียว
        type Warning = {
            pipeId: string;
            type: PipeType;
            actualLength: number;
            recommendedLength: number;
        };
        const warnings: Warning[] = [];

        if (!lateralReference) return warnings;
        const threshold = lateralReference.length;

        const lateralPipes = pipeManager.pipes.filter(
            (p) => p.type === 'lateral' && p.coordinates && p.coordinates.length >= 2
        );
        for (const pipe of lateralPipes) {
            if (pipe.id === lateralReference.pipeId) continue; // ข้ามท่ออ้างอิงเอง
            const actualLength = pipe.length ?? calculateDistance(pipe.coordinates!);
            if (actualLength > threshold) {
                warnings.push({
                    pipeId: pipe.id,
                    type: pipe.type,
                    actualLength,
                    recommendedLength: threshold,
                });
            }
        }

        return warnings;
    }, [pipeManager.pipes, lateralReference]);

    const [pumps, setPumps] = useState<Pump[]>([]);
    const [isPlacingPump, setIsPlacingPump] = useState(false);
    const isPlacingPumpRef = useRef(false);
    const [showLegend, setShowLegend] = useState(true);

    // Debounce timers - moved to top level to follow React Hook rules
    const zoomDebounceTimer = useRef<NodeJS.Timeout | null>(null);
    const centerDebounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Data comparison refs เพื่อป้องกัน re-render ที่ไม่จำเป็น
    const fieldDataHashRef = useRef<string>('');
    const mapVisualsDebounceTimer = useRef<NodeJS.Timeout | null>(null);
    const connectionPointsDebounceTimer = useRef<NodeJS.Timeout | null>(null);
    const lastZoomLevel = useRef<number | null>(null);

    // สร้าง hash ของ fieldData เพื่อเปรียบเทียบ
    const createFieldDataHash = useCallback((data: FieldData) => {
        return JSON.stringify({
            mainAreaLength: data.mainArea.length,
            zonesLength: data.zones.length,
            obstaclesLength: data.obstacles.length,
            plantPointsLength: data.plantPoints.length,
            irrigationSprinklersLength: data.irrigationPositions?.sprinklers?.length || 0,
            irrigationPivotsLength: data.irrigationPositions?.pivots?.length || 0,
            irrigationDripTapesLength: data.irrigationPositions?.dripTapes?.length || 0,
            irrigationWaterJetsLength: data.irrigationPositions?.waterJets?.length || 0,
            selectedCropsLength: data.selectedCrops.length,
            areaRai: data.areaRai,
            perimeterMeters: data.perimeterMeters,
        });
    }, []);

    // Debug state changes
    useEffect(() => {
        isPlacingPumpRef.current = isPlacingPump;
    }, [isPlacingPump]);

    useEffect(() => {
        const loadData = () => {
            const propsData: Partial<FieldData> = {};

            if (props.crops)
                propsData.selectedCrops = props.crops.split(',').filter((c) => c.trim());
            if (props.mainArea) {
                try {
                    propsData.mainArea = JSON.parse(props.mainArea);
                } catch (e) {
                    console.error('Parse mainArea error:', e);
                }
            }
            if (props.zones) {
                try {
                    propsData.zones = JSON.parse(props.zones);
                } catch (e) {
                    console.error('Parse zones error:', e);
                }
            }
            if (props.obstacles) {
                try {
                    propsData.obstacles = JSON.parse(props.obstacles);
                } catch (e) {
                    console.error('Parse obstacles error:', e);
                }
            }
            if (props.plantPoints) {
                try {
                    propsData.plantPoints = JSON.parse(props.plantPoints);
                } catch (e) {
                    console.error('Parse plantPoints error:', e);
                }
            }
            if (props.irrigationPositions) {
                try {
                    propsData.irrigationPositions = JSON.parse(props.irrigationPositions);
                } catch (e) {
                    console.error('Parse irrigationPositions error:', e);
                }
            }
            if (props.irrigationSettings) {
                try {
                    propsData.irrigationSettings = JSON.parse(props.irrigationSettings);
                } catch (e) {
                    console.error('Parse irrigationSettings error:', e);
                }
            }
            if (props.irrigationCounts) {
                try {
                    propsData.irrigationCounts = JSON.parse(props.irrigationCounts);
                } catch (e) {
                    console.error('Parse irrigationCounts error:', e);
                }
            }
            if (props.rowSpacing) {
                try {
                    propsData.rowSpacing = JSON.parse(props.rowSpacing);
                } catch (e) {
                    console.error('Parse rowSpacing error:', e);
                }
            }
            if (props.plantSpacing) {
                try {
                    propsData.plantSpacing = JSON.parse(props.plantSpacing);
                } catch (e) {
                    console.error('Parse plantSpacing error:', e);
                }
            }
            if (props.selectedIrrigationType)
                propsData.selectedIrrigationType = props.selectedIrrigationType;
            if (props.totalWaterRequirement)
                propsData.totalWaterRequirement = parseFloat(props.totalWaterRequirement);
            if (props.areaRai) propsData.areaRai = parseFloat(props.areaRai);
            if (props.perimeterMeters)
                propsData.perimeterMeters = parseFloat(props.perimeterMeters);

            const hasProps = Object.keys(propsData).length > 0;
            if (!hasProps) {
                const storageData = loadFromStorage();
                if (storageData) {
                    setFieldData((prev) => ({ ...prev, ...storageData }));
                    if (storageData.pipes) {
                        setPipes(storageData.pipes, { resetHistory: true });
                    }
                    // Restore pumps from equipment/equipmentIcons saved in storage
                    try {
                        const eqSource = (storageData ?? {}) as Partial<{
                            equipment: StoredEquipment[];
                            equipmentIcons: StoredEquipment[];
                        }>;
                        const eq: StoredEquipment[] =
                            eqSource.equipment ?? eqSource.equipmentIcons ?? [];
                        if (Array.isArray(eq) && eq.length > 0) {
                            const restored = eq
                                .filter(
                                    (e) =>
                                        (e?.type === 'pump' || e?.type === 'water_pump') &&
                                        typeof e?.lat === 'number' &&
                                        typeof e?.lng === 'number'
                                )
                                .map(
                                    (e, idx) =>
                                        ({
                                            id: e.id ?? `pump-${idx}`,
                                            lat: e.lat as number,
                                            lng: e.lng as number,
                                            type: 'water_pump',
                                            name: e.name ?? `Water Pump ${idx + 1}`,
                                        }) as Pump
                                );
                            if (restored.length > 0) setPumps(restored);
                        }
                    } catch {
                        // ignore pump restore errors
                    }
                    if (storageData.mapCenter && storageData.mapZoom) {
                        setMapStatus({ center: storageData.mapCenter, zoom: storageData.mapZoom });
                    }
                    return;
                }
            }

            setFieldData((prev) => ({ ...prev, ...propsData }));

            const storageData = loadFromStorage();
            if (storageData) {
                const mergedData = { ...storageData, ...propsData };
                setFieldData((prev) => ({ ...prev, ...mergedData }));
                if (storageData.pipes && !propsData.pipes) {
                    setPipes(storageData.pipes, { resetHistory: true });
                }
                // Restore pumps if present in storage and not provided via props
                try {
                    const eqSource = (storageData ?? {}) as Partial<{
                        equipment: StoredEquipment[];
                        equipmentIcons: StoredEquipment[];
                    }>;
                    const eq: StoredEquipment[] =
                        eqSource.equipment ?? eqSource.equipmentIcons ?? [];
                    if (Array.isArray(eq) && eq.length > 0) {
                        const restored = eq
                            .filter(
                                (e) =>
                                    (e?.type === 'pump' || e?.type === 'water_pump') &&
                                    typeof e?.lat === 'number' &&
                                    typeof e?.lng === 'number'
                            )
                            .map(
                                (e, idx) =>
                                    ({
                                        id: e.id ?? `pump-${idx}`,
                                        lat: e.lat as number,
                                        lng: e.lng as number,
                                        type: 'water_pump',
                                        name: e.name ?? `Water Pump ${idx + 1}`,
                                    }) as Pump
                            );
                        if (restored.length > 0) setPumps(restored);
                    }
                } catch {
                    // ignore pump restore errors
                }
            }
        };

        loadData();
    }, [props, loadFromStorage, setPipes]);

    // Use ref to track previous fieldData to avoid infinite re-renders
    const previousFieldDataRef = useRef<FieldData | null>(null);
    const previousPipesRef = useRef<Pipe[]>([]);

    useEffect(() => {
        // Only save if fieldData changed (excluding pipes)
        const fieldDataWithoutPipes = { ...fieldData };
        const previousData = previousFieldDataRef.current;

        if (
            !previousData ||
            JSON.stringify(previousData) !== JSON.stringify(fieldDataWithoutPipes)
        ) {
            // Save only non-pipe field data here; pipes are handled in a separate effect
            saveToStorage(fieldDataWithoutPipes);
            previousFieldDataRef.current = fieldDataWithoutPipes;
        }
    }, [fieldData, saveToStorage]);

    // Separate effect for pipe changes
    useEffect(() => {
        const pipesChanged =
            JSON.stringify(previousPipesRef.current) !== JSON.stringify(pipeManager.pipes);
        if (pipesChanged) {
            const baseData = previousFieldDataRef.current || {};
            const currentData = { ...(baseData as FieldData), pipes: pipeManager.pipes };
            saveToStorage(currentData);
            previousPipesRef.current = pipeManager.pipes;
        }
    }, [pipeManager.pipes, saveToStorage]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        // สร้าง hash ของ fieldData ปัจจุบัน
        const currentHash = createFieldDataHash(fieldData);

        // เปรียบเทียบกับ hash เก่า
        if (currentHash !== fieldDataHashRef.current) {
            fieldDataHashRef.current = currentHash;

            // ใช้ debounce เพื่อลดการเรียกซ้ำ
            if (mapVisualsDebounceTimer.current) {
                clearTimeout(mapVisualsDebounceTimer.current);
            }

            mapVisualsDebounceTimer.current = setTimeout(() => {
                mapManager.updateMapVisuals(fieldData);
            }, 100); // 100ms debounce สำหรับ map visuals
        }

        return () => {
            if (mapVisualsDebounceTimer.current) {
                clearTimeout(mapVisualsDebounceTimer.current);
            }
        };
    }, [fieldData, createFieldDataHash, mapManager]); // Removed mapManager from dependencies

    // useEffect แยกสำหรับการโหลดข้อมูลทันทีเมื่อเข้าสู่หน้า
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (fieldData.mainArea.length > 0 && mapManager.mapRef.current) {
            // อัปเดต map visuals ทันทีเมื่อมีข้อมูลและ map พร้อม
            mapManager.updateMapVisuals(fieldData);
        }
    }, [fieldData, mapManager]); // Removed mapManager from dependencies

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!mapManager.mapRef.current) return;
        mapManager.drawPipes(pipeManager.pipes, pipeManager.editingPipeId, (pipeId) =>
            pipeManager.setEditingPipeId(pipeId)
        );
    }, [pipeManager.pipes, pipeManager.editingPipeId, mapManager, pipeManager]); // Removed mapManager and pipeManager.setEditingPipeId from dependencies

    // Control point drag handler - moved outside useEffect
    const handleControlPointDrag = useCallback(
        (index: number, newPosition: Coordinate) => {
            const editingPipe = pipeManager.pipes.find((p) => p.id === pipeManager.editingPipeId);
            if (!editingPipe) return;

            // เตรียม controlPoints โดยพยายามใช้ที่บันทึกไว้ก่อน
            let controlPoints: Coordinate[] = [];
            if (editingPipe.curveType === 'bezier') {
                if (editingPipe.controlPoints && editingPipe.controlPoints.length === 3) {
                    controlPoints = [...editingPipe.controlPoints];
                } else if (editingPipe.coordinates.length >= 2) {
                    const start = editingPipe.coordinates[0];
                    const end = editingPipe.coordinates[editingPipe.coordinates.length - 1];
                    let control: Coordinate;
                    if (editingPipe.coordinates.length >= 3) {
                        const midIndex = Math.floor(editingPipe.coordinates.length / 2);
                        control = editingPipe.coordinates[midIndex];
                    } else {
                        control = {
                            lat: (start.lat + end.lat) / 2,
                            lng: (start.lng + end.lng) / 2,
                        };
                    }
                    controlPoints = [start, control, end];
                }
            } else if (editingPipe.curveType === 'spline') {
                if (editingPipe.controlPoints && editingPipe.controlPoints.length >= 2) {
                    controlPoints = [...editingPipe.controlPoints];
                } else {
                    const step = Math.max(1, Math.floor(editingPipe.coordinates.length / 4));
                    for (let i = 0; i < editingPipe.coordinates.length; i += step) {
                        controlPoints.push(editingPipe.coordinates[i]);
                    }
                    if (
                        controlPoints.length === 0 ||
                        controlPoints[controlPoints.length - 1] !==
                            editingPipe.coordinates[editingPipe.coordinates.length - 1]
                    ) {
                        controlPoints.push(
                            editingPipe.coordinates[editingPipe.coordinates.length - 1]
                        );
                    }
                }
            } else if (editingPipe.curveType === 'straight') {
                // โหมดมุมเหลี่ยม: index อ้างถึงมุม (ไม่รวมต้น-ปลาย)
                const coords = [...editingPipe.coordinates];
                // หา corner index จริงจาก display index: display แสดงเฉพาะมุมภายใน
                const cornerIndices: number[] = [];
                for (let i = 1; i < coords.length - 1; i++) {
                    const A = toXY(coords[i - 1]);
                    const B = toXY(coords[i]);
                    const C = toXY(coords[i + 1]);
                    const v1 = normV(subV(B, A));
                    const v2 = normV(subV(C, B));
                    const seg1 = lenV(subV(B, A));
                    const seg2 = lenV(subV(C, B));
                    const cosTheta = Math.max(-1, Math.min(1, dotV(mulV(v1, -1), v2)));
                    const theta = (Math.acos(cosTheta) * 180) / Math.PI;
                    if (seg1 > 1e-6 && seg2 > 1e-6 && theta < 170) cornerIndices.push(i);
                }
                const cornerIdx = cornerIndices[index];
                if (cornerIdx === undefined) return;

                const A = toXY(coords[cornerIdx - 1]);
                const B = toXY(coords[cornerIdx]);
                const C = toXY(coords[cornerIdx + 1]);

                const AB = subV(B, A);
                const BC = subV(C, B);
                const u1 = normV(AB);
                const u2 = normV(BC);
                const bis = normV(addV(mulV(u1, -1), u2));
                if (lenV(bis) === 0) return;

                // ระยะที่ผู้ใช้ลากจากจุดมุมไปยังตำแหน่งใหม่ (ฉายบนแนว angle bisector)
                const Bxy = B;
                const T = toXY(newPosition);
                const projLen = dotV(subV(T, Bxy), bis);
                const seg1 = lenV(AB);
                const seg2 = lenV(BC);
                const rMax = Math.max(0, Math.min(seg1, seg2) * 0.499); // จำกัดไม่เกินครึ่งของช่วงสั้นสุด
                const r = Math.max(0, Math.min(rMax, projLen));

                // จุดสัมผัสบนแต่ละช่วง
                const P = addV(B, mulV(u1, -r));
                const Q = addV(B, mulV(u2, r));

                // สร้าง tangents ผ่าน P (ขนาน AB) และ Q (ขนาน BC)
                const tangentP_dir = u1;
                const tangentQ_dir = u2;
                // หาจุดตัดของสองเส้นเพื่อเป็น control point สำหรับ quadratic Bezier
                const I = lineIntersection(P, tangentP_dir, Q, tangentQ_dir);
                const control = I ? I : B; // เผื่อกรณีขนานสมบูรณ์

                // แทนที่จุดมุม B ด้วยสามส่วน: ... A-P , โค้ง P-control-Q , Q-C ...
                // เราใช้ quadratic -> แปลงเป็น cubic แบบพิกัด control เดียว โดยยึด generateBezierCurve(start,end,control)
                const startC = fromXY(P);
                const endC = fromXY(Q);
                const controlC = fromXY(control);
                const curved = generateBezierCurve(startC, endC, controlC, 32);

                // สร้าง path ใหม่
                const newCoords: Coordinate[] = [];
                for (let i = 0; i < coords.length; i++) {
                    if (i === cornerIdx) {
                        // แทรกโค้งแทนจุดมุมเดิม
                        newCoords.push(...curved);
                    } else {
                        // กรณี i == cornerIdx-1: กำหนดปลายเป็น P
                        if (i === cornerIdx - 1) {
                            newCoords.push(fromXY(A));
                            newCoords.push(fromXY(P));
                        } else if (i === cornerIdx + 1) {
                            // เริ่มจาก Q แล้วไปต่อ
                            // ข้ามการใส่ B เดิมเพราะถูกแทนที่แล้ว
                            newCoords.push(fromXY(Q));
                            newCoords.push(fromXY(C));
                        } else {
                            // ปกติ
                            newCoords.push(coords[i]);
                        }
                    }
                }

                // อัปเดตมุมที่ถูกโค้งไว้เพื่อให้ handle คงอยู่และลากต่อได้
                const updatedRounded = [
                    ...(editingPipe.roundedCorners || []).filter(
                        (rc) => rc.cornerIndex !== cornerIdx
                    ),
                    { cornerIndex: cornerIdx, A: fromXY(A), B: fromXY(B), C: fromXY(C), r },
                ];

                pipeManager.updatePipe(editingPipe.id, {
                    coordinates: newCoords,
                    curveType: 'straight',
                    roundedCorners: updatedRounded,
                    // ยอมรับว่าความยาวอาจเปลี่ยนเล็กน้อยเพื่อความเรียบง่ายและเสถียร
                    length: calculateDistance(newCoords),
                });
                return;
            }

            // คำนวณและอัปเดตตามจุดที่ถูกลาก
            let newCoordinates: Coordinate[] = [];
            if (editingPipe.curveType === 'bezier' && controlPoints.length === 3) {
                const start = controlPoints[0];
                const end = controlPoints[2];
                if (index === 1) {
                    // ผู้ใช้ลากจุดกึ่งกลางบนเส้น (t=0.5) -> แปลงกลับเป็น control point ที่แท้จริง
                    const newControl: Coordinate = {
                        lat: 2 * newPosition.lat - (start.lat + end.lat) / 2,
                        lng: 2 * newPosition.lng - (start.lng + end.lng) / 2,
                    };
                    controlPoints = [start, newControl, end];
                } else if (index === 0) {
                    controlPoints = [newPosition, controlPoints[1], end];
                } else if (index === 2) {
                    controlPoints = [start, controlPoints[1], newPosition];
                }
                newCoordinates = generateBezierCurve(
                    controlPoints[0],
                    controlPoints[2],
                    controlPoints[1]
                );
            } else if (editingPipe.curveType === 'spline' && controlPoints.length >= 2) {
                controlPoints[index] = newPosition;
                newCoordinates = generateSplineCurve(controlPoints, editingPipe.tension || 0.5);
            }

            if (newCoordinates.length > 0) {
                pipeManager.updatePipe(editingPipe.id, {
                    coordinates: newCoordinates,
                    controlPoints: controlPoints,
                    length: calculateDistance(newCoordinates),
                });
            }
        },
        [pipeManager]
    );

    // ใช้ ref เพื่อเก็บ editing pipe state เพื่อป้องกัน re-render
    const editingPipeRef = useRef<Pipe | null>(null);
    const editingPipeDataRef = useRef<string>(''); // เก็บ hash ของข้อมูล editing pipe

    useEffect(() => {
        const currentEditingPipe =
            pipeManager.pipes.find((p) => p.id === pipeManager.editingPipeId) || null;

        // สร้าง hash ของข้อมูล pipe เพื่อเปรียบเทียบ
        const currentDataHash = currentEditingPipe
            ? JSON.stringify({
                  id: currentEditingPipe.id,
                  coordinates: currentEditingPipe.coordinates,
                  curveType: currentEditingPipe.curveType,
                  controlPoints: currentEditingPipe.controlPoints,
                  tension: currentEditingPipe.tension,
              })
            : '';

        // เปรียบเทียบข้อมูลปัจจุบันกับข้อมูลเดิม
        if (currentDataHash !== editingPipeDataRef.current) {
            editingPipeRef.current = currentEditingPipe;
            editingPipeDataRef.current = currentDataHash;
        }
    }, [pipeManager.editingPipeId, pipeManager.pipes]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        // ใช้ ref แทนการหา pipe ทุกครั้ง เพื่อป้องกัน re-render
        const editingPipe = editingPipeRef.current;

        if (!editingPipe) {
            // ล้างจุดควบคุมเมื่อไม่มี pipe ที่กำลังแก้ไข
            mapManager.drawControlHandles(undefined, handleControlPointDrag);
            return;
        }

        // ใช้ setTimeout เพื่อให้การอัปเดตเป็นแบบ debounced
        const debouncedDrawHandles = setTimeout(() => {
            const ref = mapManager.overlaysRef as React.MutableRefObject<{
                isDraggingControl?: boolean;
            }>;
            if (!ref.current?.isDraggingControl) {
                mapManager.drawControlHandles(editingPipe, handleControlPointDrag);
            }
        }, 50);

        return () => {
            clearTimeout(debouncedDrawHandles);
        };
    }, [handleControlPointDrag, mapManager]); // Removed mapManager and pipeManager from dependencies

    const stopDrawing = useCallback(() => {
        pipeManager.setIsDrawing(false);
        pipeManager.resetDrawingState();
        snapSystem.hideIndicator();
        mapManager.clearDrawingPreview();
        if (mapManager.mapRef.current) {
            mapManager.mapRef.current.setOptions({ draggableCursor: null });
        }
        // Remove temporary map listeners
        const overlayRefStop = mapManager.overlaysRef as React.MutableRefObject<{
            drawingListeners?: google.maps.MapsEventListener[];
        }>;
        if (mapManager.mapRef.current && overlayRefStop.current?.drawingListeners) {
            overlayRefStop.current.drawingListeners.forEach((l: google.maps.MapsEventListener) =>
                google.maps.event.removeListener(l)
            );
            overlayRefStop.current.drawingListeners = [];
            // Restore default double click zoom
            mapManager.mapRef.current.setOptions({ disableDoubleClickZoom: false });
        }
        // No DOM dblclick handler; click timeout logic only
    }, [pipeManager, mapManager, snapSystem]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (pipeManager.isDrawing) {
                    // If currently drawing, ESC cancels drawing
                    stopDrawing();
                    return;
                }
                // If a pipe is selected, ESC deletes that pipe
                if (pipeManager.editingPipeId) {
                    const toDelete = pipeManager.editingPipeId;
                    // ลบเส้นเชื่อมต่อที่เกี่ยวข้องกับท่อย่อยที่ถูกลบ
                    mapManager.removeConnectionLinesForPipe(toDelete);
                    pipeManager.removePipe(toDelete);
                    pipeManager.setEditingPipeId(null);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [stopDrawing, mapManager, pipeManager]); // Removed pipeManager from dependencies

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        return () => {
            snapSystem.cleanup();
            // ไม่ต้อง clearAllOverlays ที่นี่ เพราะจะทำให้รูปทรงและอุปกรณ์หายไป
            // จะ clear เฉพาะเมื่อ component unmount จริงๆ เท่านั้น

            // ล้าง map event listeners
            if (mapManager.mapRef.current) {
                const extendedMap = mapManager.mapRef.current as ExtendedMap;
                if (extendedMap.mapEventListeners) {
                    extendedMap.mapEventListeners.forEach((listener) => {
                        google.maps.event.removeListener(listener);
                    });
                }
            }

            // ล้าง timers ทั้งหมด
            if (zoomDebounceTimer.current) {
                clearTimeout(zoomDebounceTimer.current);
            }
            if (centerDebounceTimer.current) {
                clearTimeout(centerDebounceTimer.current);
            }
            if (mapVisualsDebounceTimer.current) {
                clearTimeout(mapVisualsDebounceTimer.current);
            }
            if (connectionPointsDebounceTimer.current) {
                clearTimeout(connectionPointsDebounceTimer.current);
            }
        };
    }, [snapSystem, mapManager.mapRef]); // Removed mapManager from dependencies

    useEffect(() => {
        return () => {
            // Clear overlays เฉพาะเมื่อ component unmount จริงๆ
            mapManager.clearAllOverlays();
        };
    }, [mapManager]); // Removed mapManager from dependencies

    const applySnapToCoordinates = useCallback(
        (coordinates: Coordinate[], pipeType: PipeType): Coordinate[] => {
            if (!snapSystem.isEnabled) return coordinates;

            const snappedCoordinates = [...coordinates];

            if (coordinates.length > 0) {
                const firstSnap = snapSystem.findSnapPoint(
                    coordinates[0],
                    pipeType,
                    pipeManager.pipes,
                    fieldData.irrigationPositions,
                    pumps,
                    { lateralMode: pipeManager.lateralMode }
                );
                if (firstSnap) snappedCoordinates[0] = firstSnap;
            }

            if (coordinates.length > 1) {
                const lastSnap = snapSystem.findSnapPoint(
                    coordinates[coordinates.length - 1],
                    pipeType,
                    pipeManager.pipes,
                    fieldData.irrigationPositions,
                    pumps,
                    { lateralMode: pipeManager.lateralMode }
                );
                if (lastSnap) snappedCoordinates[coordinates.length - 1] = lastSnap;
            }

            return snappedCoordinates;
        },
        [
            snapSystem,
            pipeManager.pipes,
            pipeManager.lateralMode,
            fieldData.irrigationPositions,
            pumps,
        ]
    );

    const getNearestPointOnPipes = useCallback(
        (
            point: Coordinate,
            types: PipeType[] = ['submain', 'main']
        ): { snapPoint: Coordinate; distance: number } | null => {
            let best: { snapPoint: Coordinate; distance: number } | null = null;
            const candidates = pipeManager.pipes.filter(
                (p) => types.includes(p.type) && p.coordinates && p.coordinates.length >= 2
            );
            for (const pipe of candidates) {
                const coords = pipe.coordinates as Coordinate[];
                for (let i = 0; i < coords.length - 1; i++) {
                    const { point: segSnap, distance } = getClosestPointOnSegment(
                        point,
                        coords[i],
                        coords[i + 1]
                    );
                    if (best === null || distance < best.distance) {
                        best = { snapPoint: segSnap, distance };
                    }
                }
            }
            return best;
        },
        [pipeManager.pipes]
    );

    // generateGuidedLateralsFromTemplate will be defined later (hoisted via function declaration)

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const startDrawing = useCallback(
        (type: PipeType, curveType: CurveType = 'straight') => {
            if (typeof google === 'undefined' || !google.maps) {
                console.error('Google Maps not available');
                alert(t('Map library not loaded. Please refresh the page.'));
                return;
            }
            if (!mapManager.mapRef.current) {
                console.error('Map not available');
                alert(t('Map not loaded. Please wait for the map to load.'));
                return;
            }

            if (pipeManager.isDrawing) {
                stopDrawing();
            }

            pipeManager.setEditingPipeId(null);
            pipeManager.setSelectedType(type);
            pipeManager.setSelectedCurveType(curveType);
            pipeManager.setIsDrawing(true);
            pipeManager.resetDrawingState();

            const map = mapManager.mapRef.current;
            const listeners: google.maps.MapsEventListener[] = [];
            const overlayRefStart = mapManager.overlaysRef as React.MutableRefObject<{
                drawingListeners?: google.maps.MapsEventListener[];
            }>;
            overlayRefStart.current.drawingListeners =
                overlayRefStart.current.drawingListeners || [];
            // Prevent default double-click zoom during drawing and show crosshair cursor
            map.setOptions({ disableDoubleClickZoom: true, draggableCursor: 'crosshair' });

            let hasFinalized = false;
            let hasStarted = false;
            let currentPath: google.maps.LatLng[] = [];

            const finalizeDrawing = (coords: Coordinate[]) => {
                if (coords.length < 2) {
                    stopDrawing();
                    return;
                }
                try {
                    // For lateral: preserve user path exactly, no smoothing; for others, keep existing behavior
                    let outputCoordinates: Coordinate[];
                    let controlPoints: Coordinate[] = [];
                    const tension = 0.5;
                    if (type === 'lateral') {
                        outputCoordinates = [...coords];
                        // Auto-center between rows after finalize for better accuracy and convenience
                        if (
                            pipeManager.lateralMode === 'betweenRows' &&
                            outputCoordinates.length >= 2
                        ) {
                            const origin = outputCoordinates[0];
                            // Use latitude-aware meters-per-degree for better geometric accuracy
                            const originLatRad = (origin.lat * Math.PI) / 180;
                            const M_PER_DEG_LAT = 110574;
                            const M_PER_DEG_LNG = 111320 * Math.cos(originLatRad);
                            const toXYmLocal = (c: Coordinate) => ({
                                x: (c.lng - origin.lng) * M_PER_DEG_LNG,
                                y: (c.lat - origin.lat) * M_PER_DEG_LAT,
                            });
                            const fromXYmLocal = (p: { x: number; y: number }): Coordinate => ({
                                lat: origin.lat + p.y / M_PER_DEG_LAT,
                                lng: origin.lng + p.x / M_PER_DEG_LNG,
                            });

                            // Direction of the line using first and last points
                            const a0 = toXYmLocal(outputCoordinates[0]);
                            const a1 = toXYmLocal(outputCoordinates[outputCoordinates.length - 1]);
                            const ux = a1.x - a0.x;
                            const uy = a1.y - a0.y;
                            const uLen = Math.hypot(ux, uy) || 1;
                            const u = { x: ux / uLen, y: uy / uLen };
                            const n = { x: -u.y, y: u.x }; // left-hand normal

                            // Find signed perpendicular distance to the nearest segment on the polyline
                            const closestSignedPerpDistance = (p: Coordinate): number => {
                                let best: {
                                    proj: Coordinate | null;
                                    segU: { x: number; y: number } | null;
                                    dist: number;
                                } = { proj: null, segU: null, dist: Infinity };
                                for (let i = 0; i < outputCoordinates.length - 1; i++) {
                                    const A = outputCoordinates[i];
                                    const B = outputCoordinates[i + 1];
                                    const { point: proj, distance } = getClosestPointOnSegment(
                                        p,
                                        A,
                                        B
                                    );
                                    if (distance < best.dist) {
                                        const Axy = toXYmLocal(A);
                                        const Bxy = toXYmLocal(B);
                                        const segUx = Bxy.x - Axy.x;
                                        const segUy = Bxy.y - Axy.y;
                                        const segLen = Math.hypot(segUx, segUy) || 1;
                                        best = {
                                            proj,
                                            segU: { x: segUx / segLen, y: segUy / segLen },
                                            dist: distance,
                                        };
                                    }
                                }
                                if (!best.proj || !best.segU) return 0;
                                const Pxy = toXYmLocal(p);
                                const Qxy = toXYmLocal(best.proj);
                                const v = { x: Pxy.x - Qxy.x, y: Pxy.y - Qxy.y };
                                const cross = best.segU.x * v.y - best.segU.y * v.x;
                                const sign = cross >= 0 ? 1 : -1;
                                return sign * best.dist;
                            };

                            // Collect distances from nearby sprinklers only (ignore others)
                            const sprinklers = fieldData.irrigationPositions?.sprinklers || [];
                            const signedDistances: number[] = [];
                            const maxBandM = 6; // consider only sprinklers close to the line
                            for (const s of sprinklers) {
                                let minD = Infinity;
                                for (let i = 0; i < outputCoordinates.length - 1; i++) {
                                    const { distance } = getClosestPointOnSegment(
                                        s,
                                        outputCoordinates[i],
                                        outputCoordinates[i + 1]
                                    );
                                    if (distance < minD) minD = distance;
                                }
                                if (minD <= maxBandM)
                                    signedDistances.push(closestSignedPerpDistance(s));
                            }

                            const left = signedDistances.filter((d) => d > 0).map(Math.abs);
                            const right = signedDistances.filter((d) => d < 0).map(Math.abs);
                            const median = (arr: number[]) => {
                                const a = [...arr].sort((x, y) => x - y);
                                const n = a.length;
                                if (n === 0) return 0;
                                return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
                            };

                            if (left.length > 0 && right.length > 0) {
                                const mL = median(left);
                                const mR = median(right);
                                // offset to make distances equal => center between two median rows
                                let offsetM = (mL - mR) / 2;
                                // Clamp to avoid large jumps if outliers present
                                if (offsetM > 2) offsetM = 2;
                                if (offsetM < -2) offsetM = -2;
                                if (Math.abs(offsetM) > 0.02) {
                                    outputCoordinates = outputCoordinates.map((c) => {
                                        const xy = toXYmLocal(c);
                                        const shifted = {
                                            x: xy.x + n.x * offsetM,
                                            y: xy.y + n.y * offsetM,
                                        };
                                        return fromXYmLocal(shifted);
                                    });
                                }
                            }
                        }
                    } else {
                        const snappedCoordinates = applySnapToCoordinates(coords, type);
                        let finalCoordinates = snappedCoordinates;
                        if (curveType !== 'straight') {
                            finalCoordinates = generateSmoothCurve(
                                snappedCoordinates,
                                curveType,
                                tension
                            );
                            if (curveType === 'bezier' && snappedCoordinates.length >= 3) {
                                controlPoints = snappedCoordinates.slice(1, -1);
                            } else if (curveType === 'bezier' && snappedCoordinates.length === 2) {
                                controlPoints = [
                                    {
                                        lat:
                                            (snappedCoordinates[0].lat +
                                                snappedCoordinates[1].lat) /
                                            2,
                                        lng:
                                            (snappedCoordinates[0].lng +
                                                snappedCoordinates[1].lng) /
                                            2,
                                    },
                                ];
                            }
                        }
                        outputCoordinates = finalCoordinates;
                    }
                    if (type === 'main' && outputCoordinates.length >= 2) {
                        const joinThreshold = Math.max(
                            Math.min(Math.max(snapSystem.distance ?? 3, 1), 5),
                            1
                        );
                        const endpoints: Array<{ idx: number; pt: Coordinate }> = [
                            { idx: 0, pt: outputCoordinates[0] },
                            {
                                idx: outputCoordinates.length - 1,
                                pt: outputCoordinates[outputCoordinates.length - 1],
                            },
                        ];
                        const targetTypes: PipeType[] = ['submain', 'main'];
                        endpoints.forEach(({ idx, pt }) => {
                            let best: {
                                pipe: Pipe | null;
                                segIndex: number;
                                point: Coordinate | null;
                                dist: number;
                            } = { pipe: null, segIndex: -1, point: null, dist: Infinity };
                            pipeManager.pipes
                                .filter(
                                    (p) =>
                                        targetTypes.includes(p.type) &&
                                        p.coordinates &&
                                        p.coordinates.length >= 2
                                )
                                .forEach((p) => {
                                    const coords = p.coordinates as Coordinate[];
                                    for (let i = 0; i < coords.length - 1; i++) {
                                        const { point, distance } = getClosestPointOnSegment(
                                            pt,
                                            coords[i],
                                            coords[i + 1]
                                        );
                                        if (distance < best.dist)
                                            best = { pipe: p, segIndex: i, point, dist: distance };
                                    }
                                });
                            if (best.pipe && best.point && best.dist <= joinThreshold) {
                                outputCoordinates = outputCoordinates.map((c, k) =>
                                    k === idx ? (best.point as Coordinate) : c
                                );
                                const tgt = best.pipe;
                                const coords = tgt.coordinates as Coordinate[];
                                const left = coords[best.segIndex];
                                const right = coords[best.segIndex + 1];
                                const isSameAs = (a: Coordinate, b: Coordinate) =>
                                    calculateDistanceBetweenPoints(a, b) < 0.1;
                                if (!isSameAs(left, best.point) && !isSameAs(right, best.point)) {
                                    const newCoords = [
                                        ...coords.slice(0, best.segIndex + 1),
                                        best.point,
                                        ...coords.slice(best.segIndex + 1),
                                    ];
                                    pipeManager.updatePipe(tgt.id, { coordinates: newCoords });
                                }
                            }
                        });
                    }
                    const newPipe: Pipe = {
                        id: `${type}-${Date.now()}`,
                        type,
                        coordinates: outputCoordinates,
                        curveType: curveType,
                        controlPoints: controlPoints.length > 0 ? controlPoints : undefined,
                        tension: curveType === 'spline' ? 0.5 : undefined,
                        length: calculateDistance(outputCoordinates),
                    };
                    pipeManager.addPipe(newPipe);
                    if (type === 'submain') {
                        const newSubmainId = newPipe.id;
                        const joinThreshold = Math.max(
                            Math.min(Math.max(snapSystem.distance ?? 3, 1), 5),
                            1
                        );
                        pipeManager.setPipes((prev) => {
                            const next = prev.map((p) => ({
                                ...p,
                                coordinates: p.coordinates ? [...p.coordinates] : [],
                            }));
                            const subIndex = next.findIndex((p) => p.id === newSubmainId);
                            if (subIndex === -1) return prev;
                            const sub = next[subIndex];
                            let subCoords = [...(sub.coordinates || [])];
                            const isSameAs = (a: Coordinate, b: Coordinate) =>
                                calculateDistanceBetweenPoints(a, b) < 0.1;
                            for (let i = 0; i < next.length; i++) {
                                const pipe = next[i];
                                if (
                                    pipe.type !== 'main' ||
                                    !pipe.coordinates ||
                                    pipe.coordinates.length < 2
                                )
                                    continue;
                                const endpoints: Array<{ idx: number; pt: Coordinate }> = [
                                    { idx: 0, pt: pipe.coordinates[0] },
                                    {
                                        idx: pipe.coordinates.length - 1,
                                        pt: pipe.coordinates[pipe.coordinates.length - 1],
                                    },
                                ];
                                let changedMain = false;
                                for (const { idx, pt } of endpoints) {
                                    let best = {
                                        segIndex: -1,
                                        point: null as Coordinate | null,
                                        dist: Infinity,
                                    };
                                    for (let s = 0; s < subCoords.length - 1; s++) {
                                        const { point, distance } = getClosestPointOnSegment(
                                            pt,
                                            subCoords[s],
                                            subCoords[s + 1]
                                        );
                                        if (distance < best.dist)
                                            best = { segIndex: s, point, dist: distance };
                                    }
                                    if (best.point && best.dist <= joinThreshold) {
                                        pipe.coordinates[idx] = best.point;
                                        changedMain = true;
                                        const left = subCoords[best.segIndex];
                                        const right = subCoords[best.segIndex + 1];
                                        if (
                                            !isSameAs(left, best.point) &&
                                            !isSameAs(right, best.point)
                                        ) {
                                            subCoords = [
                                                ...subCoords.slice(0, best.segIndex + 1),
                                                best.point,
                                                ...subCoords.slice(best.segIndex + 1),
                                            ];
                                        }
                                    }
                                }
                                if (changedMain) {
                                    pipe.length = calculateDistance(pipe.coordinates);
                                }
                            }
                            next[subIndex] = {
                                ...sub,
                                coordinates: subCoords,
                                length: calculateDistance(subCoords),
                            };
                            return next;
                        });
                    }
                    if (type === 'lateral') {
                        const connectedPoints = pipeManager.findNearbyConnectedIrrigationPoints(
                            outputCoordinates,
                            fieldData.irrigationPositions,
                            2,
                            { lateralMode: pipeManager.lateralMode, betweenRowsHalfWidth: 1.5 }
                        );
                        const totalFlow = pipeManager.calculateTotalFlowRate(
                            connectedPoints,
                            fieldData.irrigationSettings
                        );
                        const endCoord = outputCoordinates[outputCoordinates.length - 1];

                        // สร้างข้อความแสดงจำนวนจุดเชื่อมแต่ละประเภท
                        const totalPoints =
                            connectedPoints.sprinklers.length +
                            connectedPoints.dripTapes.length +
                            connectedPoints.waterJets.length +
                            connectedPoints.pivots.length;
                        let labelText = `💧 ${Math.round(totalFlow)} L/min`;
                        if (totalPoints > 0) {
                            const parts: string[] = [];
                            if (connectedPoints.sprinklers.length > 0)
                                parts.push(`🚿${connectedPoints.sprinklers.length}`);
                            if (connectedPoints.dripTapes.length > 0)
                                parts.push(`💧${connectedPoints.dripTapes.length}`);
                            if (connectedPoints.waterJets.length > 0)
                                parts.push(`🌊${connectedPoints.waterJets.length}`);
                            if (connectedPoints.pivots.length > 0)
                                parts.push(`🔄${connectedPoints.pivots.length}`);
                            labelText = `${parts.join(' ')} • ${labelText}`;
                        }

                        const pill = new PillLabel(endCoord, labelText, {
                            backgroundColor: 'rgba(17, 24, 39, 0.85)',
                            textColor: '#fff',
                            fontSize: '13px',
                            fontWeight: '700',
                            padding: '4px 8px',
                            borderRadius: '999px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                            zIndex: 1003,
                        });
                        pill.setMap(mapManager.mapRef.current!);
                        const labelsMap = mapManager.overlaysRef.current.pipeLabelPills;
                        const existing = labelsMap.get(newPipe.id) || [];
                        labelsMap.set(newPipe.id, [...existing, pill]);

                        // สร้างจุดเชื่อมต่อสำหรับท่อย่อยที่สร้างขึ้นจะถูกจัดการใน useEffect

                        // วาดเส้นเชื่อมต่อระหว่างท่อย่อยกับสปริงเกลอร์
                        const lateralPipes = pipeManager.pipes.filter((p) => p.type === 'lateral');
                        mapManager.drawConnectionLines(
                            lateralPipes,
                            fieldData.irrigationPositions,
                            pipeManager.lateralMode,
                            pipeManager.findNearbyConnectedIrrigationPoints
                        );

                        // ตั้งท่อเส้นแรกเป็นอ้างอิง หากยังไม่มีการตั้งค่า
                        if (!lateralReference) {
                            setLateralReference({
                                pipeId: newPipe.id,
                                length: newPipe.length || calculateDistance(outputCoordinates),
                                flowLpm: totalFlow,
                            });
                        }

                        // สร้างท่อด้านตรงข้ามโดยอัตโนมัติ (เฉพาะโหมดระหว่างแถวและเริ่มจากท่อเมนย่อย)
                        if (
                            pipeManager.lateralMode === 'betweenRows' &&
                            outputCoordinates.length >= 2
                        ) {
                            try {
                                const start = outputCoordinates[0];
                                // หา segment ของท่อเมนย่อยที่ใกล้จุดเริ่มที่สุด
                                let best: {
                                    A: Coordinate;
                                    B: Coordinate;
                                    proj: Coordinate;
                                    dist: number;
                                } | null = null;
                                const submains = pipeManager.pipes.filter(
                                    (p) =>
                                        p.type === 'submain' &&
                                        p.coordinates &&
                                        p.coordinates.length >= 2
                                );
                                for (const sm of submains) {
                                    const coords = sm.coordinates as Coordinate[];
                                    for (let i = 0; i < coords.length - 1; i++) {
                                        const A = coords[i];
                                        const B = coords[i + 1];
                                        const { point, distance } = getClosestPointOnSegment(
                                            start,
                                            A,
                                            B
                                        );
                                        if (!best || distance < best.dist)
                                            best = { A, B, proj: point, dist: distance };
                                    }
                                }
                                // เฉพาะเมื่ออยู่ใกล้ท่อเมนย่อยพอสมควรจึงสร้างเส้นฝั่งตรงข้าม
                                if (best && best.dist <= 3) {
                                    const originLatRad = (start.lat * Math.PI) / 180;
                                    const M_PER_DEG_LAT = 110574;
                                    const M_PER_DEG_LNG = 111320 * Math.cos(originLatRad);
                                    const toXY = (c: Coordinate) => ({
                                        x: (c.lng - best!.A.lng) * M_PER_DEG_LNG,
                                        y: (c.lat - best!.A.lat) * M_PER_DEG_LAT,
                                    });
                                    const fromXY = (p: { x: number; y: number }): Coordinate => ({
                                        lat: best!.A.lat + p.y / M_PER_DEG_LAT,
                                        lng: best!.A.lng + p.x / M_PER_DEG_LNG,
                                    });
                                    // เวกเตอร์แนวท่อเมนย่อย
                                    const Axy = toXY(best.A);
                                    const Bxy = toXY(best.B);
                                    const ux = Bxy.x - Axy.x;
                                    const uy = Bxy.y - Axy.y;
                                    const uLen = Math.hypot(ux, uy) || 1;
                                    const u = { x: ux / uLen, y: uy / uLen };
                                    const n = { x: -u.y, y: u.x }; // นอร์มัลซ้ายมือ
                                    // สะท้อนจุดทุกจุดของท่อใหม่ข้ามเส้น AB
                                    const mirrorCoords: Coordinate[] = outputCoordinates.map(
                                        (c) => {
                                            const P = toXY(c);
                                            const V = { x: P.x - Axy.x, y: P.y - Axy.y };
                                            const t = V.x * u.x + V.y * u.y; // ระยะตามแนวท่อ
                                            const s = V.x * n.x + V.y * n.y; // ระยะตั้งฉาก (มีเครื่องหมาย)
                                            const Pm = {
                                                x: Axy.x + t * u.x - s * n.x,
                                                y: Axy.y + t * u.y - s * n.y,
                                            };
                                            return fromXY(Pm);
                                        }
                                    );
                                    // ป้องกันการซ้ำซ้อนกับท่อที่มีอยู่แล้ว (วัดจากจุดกึ่งกลาง)
                                    const midIdx = Math.floor(mirrorCoords.length / 2);
                                    const midPt = mirrorCoords[midIdx];
                                    const pointToPolylineDistance = (
                                        pt: Coordinate,
                                        line: Coordinate[]
                                    ): number => {
                                        let bestD = Infinity;
                                        for (let i = 0; i < line.length - 1; i++) {
                                            const { distance } = getClosestPointOnSegment(
                                                pt,
                                                line[i],
                                                line[i + 1]
                                            );
                                            if (distance < bestD) bestD = distance;
                                        }
                                        return bestD;
                                    };
                                    const overlapsExisting = pipeManager.pipes.some(
                                        (p) =>
                                            p.type === 'lateral' &&
                                            p.coordinates &&
                                            p.coordinates.length >= 2 &&
                                            pointToPolylineDistance(
                                                midPt,
                                                p.coordinates as Coordinate[]
                                            ) < 0.5
                                    );
                                    if (!overlapsExisting) {
                                        const oppositePipe: Pipe = {
                                            id: `lateral-mirror-${Date.now()}`,
                                            type: 'lateral',
                                            coordinates: mirrorCoords,
                                            length: calculateDistance(mirrorCoords),
                                        };
                                        pipeManager.addPipe(oppositePipe);
                                        // แสดงป้ายอัตราการไหลให้เส้นฝั่งตรงข้ามด้วย
                                        const oppConnected =
                                            pipeManager.findNearbyConnectedIrrigationPoints(
                                                mirrorCoords,
                                                fieldData.irrigationPositions,
                                                2,
                                                {
                                                    lateralMode: pipeManager.lateralMode,
                                                    betweenRowsHalfWidth: 1.5,
                                                }
                                            );
                                        const oppFlow = pipeManager.calculateTotalFlowRate(
                                            oppConnected,
                                            fieldData.irrigationSettings
                                        );
                                        const oppEnd = mirrorCoords[mirrorCoords.length - 1];
                                        const oppLabel = new PillLabel(
                                            oppEnd,
                                            `💧 ${Math.round(oppFlow)} L/min`,
                                            {
                                                backgroundColor: 'rgba(17, 24, 39, 0.85)',
                                                textColor: '#fff',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                padding: '4px 8px',
                                                borderRadius: '999px',
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                                                zIndex: 1003,
                                            }
                                        );
                                        oppLabel.setMap(mapManager.mapRef.current!);
                                        const mapLabels =
                                            mapManager.overlaysRef.current.pipeLabelPills;
                                        const existOpp = mapLabels.get(oppositePipe.id) || [];
                                        mapLabels.set(oppositePipe.id, [...existOpp, oppLabel]);

                                        // ปรับปรุงความยาวอ้างอิงให้พิจารณาทั้งเส้นแรกและเส้นฝั่งตรงข้าม
                                        const firstLen =
                                            newPipe.length || calculateDistance(outputCoordinates);
                                        const mirrorLen =
                                            oppositePipe.length || calculateDistance(mirrorCoords);
                                        const refLen = Math.min(firstLen, mirrorLen);
                                        const refFlow = Math.min(totalFlow, oppFlow);
                                        if (
                                            !lateralReference ||
                                            lateralReference.pipeId === newPipe.id
                                        ) {
                                            setLateralReference({
                                                pipeId: newPipe.id,
                                                length: refLen,
                                                flowLpm: refFlow,
                                            });
                                        }

                                        // วาดเส้นเชื่อมต่อสำหรับท่อย่อยที่สร้างอัตโนมัติ
                                        const updatedLateralPipes = pipeManager.pipes.filter(
                                            (p) => p.type === 'lateral'
                                        );
                                        mapManager.drawConnectionLines(
                                            updatedLateralPipes,
                                            fieldData.irrigationPositions,
                                            pipeManager.lateralMode,
                                            pipeManager.findNearbyConnectedIrrigationPoints
                                        );
                                    }
                                }
                            } catch (err) {
                                console.warn('Auto-create opposite lateral failed:', err);
                            }
                        }

                        // Show notification modal instead of confirm dialog
                        setNotificationModal({
                            isOpen: true,
                            title: t('การสร้างท่อย่อยอัตโนมัติ'),
                            message: t('เลือกรูปแบบการสร้างท่อย่อย:'),
                            warningMessage: t(
                                'การวาดท่ออัตโนมัติ กรุณาวาดให้เป็นเส้นตรง ไม่งั้นการสร้างท่ออาจจะผิดปกติ'
                            ),
                            type: 'warning',
                            showColorOptions: true,
                            onConfirm: (selectedPattern?: 'extending' | 'crossing') => {
                                const generated = generateGuidedLateralsFromTemplate(
                                    newPipe,
                                    selectedPattern
                                );
                                if (generated.length > 0) {
                                    pipeManager.setPipes((prev) => [...prev, ...generated]);

                                    // วาดเส้นเชื่อมต่อสำหรับท่อย่อยที่สร้างตามแนวเสร็จ
                                    const allLateralPipes = pipeManager.pipes.filter(
                                        (p) => p.type === 'lateral'
                                    );
                                    mapManager.drawConnectionLines(
                                        allLateralPipes,
                                        fieldData.irrigationPositions,
                                        pipeManager.lateralMode,
                                        pipeManager.findNearbyConnectedIrrigationPoints
                                    );
                                }
                                setNotificationModal((prev) => ({ ...prev, isOpen: false }));
                            },
                            onCancel: () => {
                                setNotificationModal((prev) => ({ ...prev, isOpen: false }));
                            },
                        });
                    }
                    snapSystem.hideIndicator();
                    // Explicitly end drawing after successful finalize
                    hasFinalized = true;
                    stopDrawing();
                } catch (error) {
                    console.error('finalizeDrawing error', error);
                    // Ensure cleanup on error as well
                    hasFinalized = true;
                    stopDrawing();
                }
            };

            // Note: start drawing on first click (not mousedown) to mimic previous mode

            const processSingleClick = (e: google.maps.MapMouseEvent) => {
                if (!e.latLng) return;
                if (hasFinalized) return;
                if (!hasStarted) {
                    if (type === 'lateral') {
                        const start = { lat: e.latLng.lat(), lng: e.latLng.lng() } as Coordinate;
                        const nearest = getNearestPointOnPipes(start, ['submain', 'main']);
                        // ลบเงื่อนไขการตรวจสอบระยะห่าง 10m เพื่อให้สามารถวาดท่อย่อยแบบลากผ่านได้
                        let startPoint = start;
                        if (nearest && nearest.distance < 5) {
                            // snap เฉพาะเมื่อใกล้มาก (5m)
                            startPoint = nearest.snapPoint;
                        }
                        const snappedLatLng = new google.maps.LatLng(
                            startPoint.lat,
                            startPoint.lng
                        );
                        pipeManager.setIsDrawing(true);
                        hasStarted = true;
                        currentPath = [snappedLatLng];
                        pipeManager.updateDrawingState({
                            isDrawing: true,
                            startPoint: startPoint,
                            currentPoint: startPoint,
                            currentCoordinates: [startPoint],
                        });
                    } else {
                        pipeManager.setIsDrawing(true);
                        hasStarted = true;
                        let startLatLng = e.latLng;
                        if (type === 'main') {
                            const start = {
                                lat: e.latLng.lat(),
                                lng: e.latLng.lng(),
                            } as Coordinate;
                            const snapped = snapSystem.findSnapPoint(
                                start,
                                type,
                                pipeManager.pipes,
                                fieldData.irrigationPositions,
                                pumps,
                                { lateralMode: pipeManager.lateralMode }
                            );
                            if (snapped)
                                startLatLng = new google.maps.LatLng(snapped.lat, snapped.lng);
                        }
                        currentPath = [startLatLng];
                    }
                } else {
                    if (type === 'lateral') {
                        const point: Coordinate = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                        const snapped = snapSystem.findSnapPoint(
                            point,
                            type,
                            pipeManager.pipes,
                            fieldData.irrigationPositions,
                            pumps,
                            { lateralMode: pipeManager.lateralMode }
                        );
                        const nextLatLng = snapped
                            ? new google.maps.LatLng(snapped.lat, snapped.lng)
                            : e.latLng;
                        currentPath = [...currentPath, nextLatLng];
                    } else {
                        let nextLatLng = e.latLng;
                        if (type === 'main') {
                            const point: Coordinate = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                            const snapped = snapSystem.findSnapPoint(
                                point,
                                type,
                                pipeManager.pipes,
                                fieldData.irrigationPositions,
                                pumps,
                                { lateralMode: pipeManager.lateralMode }
                            );
                            if (snapped)
                                nextLatLng = new google.maps.LatLng(snapped.lat, snapped.lng);
                        }
                        currentPath = [...currentPath, nextLatLng];
                    }
                }
                const coordinates = currentPath.map((latLng) => ({
                    lat: latLng.lat(),
                    lng: latLng.lng(),
                }));
                pipeManager.updateDrawingState({
                    isDrawing: true,
                    currentPoint: { lat: e.latLng.lat(), lng: e.latLng.lng() },
                    currentCoordinates: coordinates,
                });
                if (type === 'lateral') {
                    const connectedPoints = pipeManager.findNearbyConnectedIrrigationPoints(
                        coordinates,
                        fieldData.irrigationPositions,
                        2,
                        { lateralMode: pipeManager.lateralMode, betweenRowsHalfWidth: 1.5 }
                    );
                    const totalFlow = pipeManager.calculateTotalFlowRate(
                        connectedPoints,
                        fieldData.irrigationSettings
                    );
                    mapManager.updateDrawingPreview(
                        coordinates,
                        type,
                        calculateDistance(coordinates),
                        curveType,
                        connectedPoints.sprinklers,
                        totalFlow
                    );
                } else {
                    mapManager.updateDrawingPreview(
                        coordinates,
                        type,
                        calculateDistance(coordinates),
                        curveType
                    );
                }
            };

            const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
                processSingleClick(e);
            });
            listeners.push(clickListener);

            const dblClickListener = map.addListener('dblclick', (e: google.maps.MapMouseEvent) => {
                // Prevent unintended default behaviors and bubbling
                const anyEvt = e as unknown as {
                    domEvent?: { preventDefault?: () => void; stopPropagation?: () => void };
                    stop?: () => void;
                };
                anyEvt.domEvent?.preventDefault?.();
                anyEvt.domEvent?.stopPropagation?.();
                anyEvt.stop?.();
                if (!hasStarted || hasFinalized) return;
                if (currentPath.length >= 2) {
                    // Drop duplicate last point caused by second click of a dblclick
                    const last = currentPath[currentPath.length - 1];
                    const prev = currentPath[currentPath.length - 2];
                    if (last && prev) {
                        const dLat = Math.abs(last.lat() - prev.lat());
                        const dLng = Math.abs(last.lng() - prev.lng());
                        if (dLat < 1e-6 && dLng < 1e-6) {
                            currentPath.pop();
                        }
                    }
                    const coordinates = currentPath.map((latLng) => ({
                        lat: latLng.lat(),
                        lng: latLng.lng(),
                    }));
                    hasFinalized = true;
                    finalizeDrawing(coordinates);
                } else {
                    // Not enough points, cancel cleanly
                    stopDrawing();
                }
            });
            listeners.push(dblClickListener);

            const mouseMoveListener = map.addListener(
                'mousemove',
                (e: google.maps.MapMouseEvent) => {
                    if (!hasStarted || hasFinalized || !e.latLng) return;
                    if (currentPath.length === 0) return;
                    // Build preview from fixed vertices + hovered point (snapped)
                    let hover = e.latLng;
                    const hoverCoord: Coordinate = { lat: hover.lat(), lng: hover.lng() };
                    if (type === 'lateral' || type === 'main') {
                        const snapped = snapSystem.findSnapPoint(
                            hoverCoord,
                            type,
                            pipeManager.pipes,
                            fieldData.irrigationPositions,
                            pumps,
                            { lateralMode: pipeManager.lateralMode }
                        );
                        if (snapped) hover = new google.maps.LatLng(snapped.lat, snapped.lng);
                    }
                    const fixed = currentPath.map((latLng) => ({
                        lat: latLng.lat(),
                        lng: latLng.lng(),
                    }));
                    const coordinates = [...fixed, { lat: hover.lat(), lng: hover.lng() }];
                    pipeManager.updateDrawingState({
                        currentPoint: { lat: hover.lat(), lng: hover.lng() },
                        currentCoordinates: coordinates,
                    });
                    if (type === 'lateral') {
                        const connectedPoints = pipeManager.findNearbyConnectedIrrigationPoints(
                            coordinates,
                            fieldData.irrigationPositions,
                            2,
                            { lateralMode: pipeManager.lateralMode, betweenRowsHalfWidth: 1.5 }
                        );
                        const totalFlow = pipeManager.calculateTotalFlowRate(
                            connectedPoints,
                            fieldData.irrigationSettings
                        );
                        pipeManager.updateCurrentDistanceWithSprinklers(
                            coordinates,
                            type,
                            connectedPoints.sprinklers,
                            totalFlow,
                            2
                        );
                        mapManager.updateDrawingPreview(
                            coordinates,
                            type,
                            calculateDistance(coordinates),
                            curveType,
                            connectedPoints.sprinklers,
                            totalFlow
                        );
                    } else {
                        pipeManager.updateCurrentDistance(coordinates);
                        mapManager.updateDrawingPreview(
                            coordinates,
                            type,
                            pipeManager.drawingState.currentDistance,
                            curveType
                        );
                    }
                }
            );
            listeners.push(mouseMoveListener);

            // Note: we deliberately do NOT stop drawing on mouseup; end with native dblclick instead

            const overlayRefAssign = mapManager.overlaysRef as React.MutableRefObject<{
                drawingListeners?: google.maps.MapsEventListener[];
            }>;
            overlayRefAssign.current.drawingListeners = listeners;
            // eslint-disable-next-line react-hooks/exhaustive-deps
        },
        [
            pipeManager,
            mapManager,
            snapSystem,
            applySnapToCoordinates,
            stopDrawing,
            t,
            fieldData,
            getNearestPointOnPipes,
            pumps,
            lateralReference,
        ]
    );

    // NOTE: generator retained for future use; intentionally referenced in a noop to avoid linter errors
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const generateLateralPipes = useCallback(() => {
        const submainPipes = pipeManager.pipes.filter((p) => p.type === 'submain');
        if (submainPipes.length === 0) {
            alert(t('Draw submain pipes first'));
            return;
        }

        const lateralPipes: Pipe[] = [];
        submainPipes.forEach((submain, submainIndex) => {
            for (let i = 0; i < submain.coordinates.length - 1; i++) {
                const start = submain.coordinates[i];
                const end = submain.coordinates[i + 1];

                const deltaLat = end.lat - start.lat;
                const deltaLng = end.lng - start.lng;
                const perpLat = -deltaLng * 0.0001;
                const perpLng = deltaLat * 0.0001;

                const midPoint = {
                    lat: (start.lat + end.lat) / 2,
                    lng: (start.lng + end.lng) / 2,
                };

                ['left', 'right'].forEach((side, sideIndex) => {
                    const multiplier = sideIndex === 0 ? 1 : -1;
                    lateralPipes.push({
                        id: `lateral-${submainIndex}-${i}-${side}`,
                        type: 'lateral',
                        coordinates: [
                            midPoint,
                            {
                                lat: midPoint.lat + perpLat * multiplier,
                                lng: midPoint.lng + perpLng * multiplier,
                            },
                        ],
                        length: 10,
                    });
                });
            }
        });

        pipeManager.setPipes((prev) => [...prev, ...lateralPipes]);
    }, [pipeManager, t]);
    // Noop reference to satisfy linter that the function is used somewhere
    useEffect(() => {
        void generateLateralPipes;
    }, [generateLateralPipes]);

    // หาจุดตัดของเส้นสองเส้น
    const getLineIntersection = useCallback(
        (p1: Coordinate, p2: Coordinate, p3: Coordinate, p4: Coordinate): Coordinate | null => {
            const x1 = p1.lng,
                y1 = p1.lat;
            const x2 = p2.lng,
                y2 = p2.lat;
            const x3 = p3.lng,
                y3 = p3.lat;
            const x4 = p4.lng,
                y4 = p4.lat;

            const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
            if (Math.abs(denom) < 1e-10) return null; // เส้นขนาน

            const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
            const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

            if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
                return {
                    lat: y1 + t * (y2 - y1),
                    lng: x1 + t * (x2 - x1),
                };
            }

            return null;
        },
        []
    );

    // ตรวจสอบการลากท่อย่อยข้ามท่อเมนย่อย
    const checkLateralCrossingSubmain = useCallback(
        (
            startPoint: Coordinate,
            endPoint: Coordinate,
            submainPipes: Pipe[]
        ): {
            crosses: boolean;
            intersectionPoints: Coordinate[];
            submainId: string | null;
        } => {
            const intersectionPoints: Coordinate[] = [];
            let crosses = false;
            let submainId: string | null = null;

            for (const submain of submainPipes) {
                if (!submain.coordinates || submain.coordinates.length < 2) continue;

                for (let i = 0; i < submain.coordinates.length - 1; i++) {
                    const subStart = submain.coordinates[i];
                    const subEnd = submain.coordinates[i + 1];

                    // ตรวจสอบการตัดกันของเส้น
                    const intersection = getLineIntersection(
                        startPoint,
                        endPoint,
                        subStart,
                        subEnd
                    );
                    if (intersection) {
                        intersectionPoints.push(intersection);
                        crosses = true;
                        submainId = submain.id;
                    }
                }
            }

            return { crosses, intersectionPoints, submainId };
        },
        [getLineIntersection]
    );

    // สร้างจุดเชื่อมต่อของท่อย่อยที่ต่อกับท่อเมนย่อย
    const createLateralConnectionPoints = useCallback(
        (lateralPipes: Pipe[]) => {
            const connectionPoints: Array<{
                id: string;
                position: Coordinate;
                connectedLaterals: string[];
                submainId: string;
                type: 'single' | 'junction' | 'crossing' | 'l_shape' | 't_shape' | 'cross_shape';
            }> = [];

            // หาท่อเมนย่อยทั้งหมด
            const submainPipes = pipeManager.pipes.filter((p) => p.type === 'submain');

            lateralPipes.forEach((lateral) => {
                if (!lateral.coordinates || lateral.coordinates.length < 2) return;

                const lateralStart = lateral.coordinates[0];
                const lateralEnd = lateral.coordinates[lateral.coordinates.length - 1];

                // ตรวจสอบการข้ามท่อเมนย่อย
                const crossingInfo = checkLateralCrossingSubmain(
                    lateralStart,
                    lateralEnd,
                    submainPipes
                );

                if (crossingInfo.crosses && crossingInfo.intersectionPoints.length > 0) {
                    // ท่อย่อยข้ามท่อเมนย่อย - สร้างจุดเชื่อมต่อที่จุดตัด
                    crossingInfo.intersectionPoints.forEach((intersectionPoint, index) => {
                        const existingPoint = connectionPoints.find(
                            (cp) =>
                                calculateDistanceBetweenPoints(cp.position, intersectionPoint) < 1
                        );

                        if (existingPoint) {
                            existingPoint.connectedLaterals.push(lateral.id);
                            existingPoint.type = 'junction';
                        } else {
                            // ใช้ deterministic ID แทน Date.now()
                            const positionHash = `${intersectionPoint.lat.toFixed(6)}-${intersectionPoint.lng.toFixed(6)}`;
                            connectionPoints.push({
                                id: `crossing-${lateral.id}-${index}-${positionHash}`,
                                position: intersectionPoint,
                                connectedLaterals: [lateral.id],
                                submainId: crossingInfo.submainId || 'unknown',
                                type: 'crossing',
                            });
                        }
                    });
                } else {
                    // ท่อย่อยไม่ข้ามท่อเมนย่อย - หาจุดเชื่อมต่อแบบเดิม
                    let nearestSubmain: Pipe | null = null;
                    let nearestPoint: Coordinate | null = null;
                    let minDistance = Infinity;

                    submainPipes.forEach((submain) => {
                        if (!submain.coordinates || submain.coordinates.length < 2) return;

                        // ตรวจสอบจุดเริ่มต้นของท่อย่อย
                        for (let i = 0; i < submain.coordinates.length - 1; i++) {
                            const { point, distance } = getClosestPointOnSegment(
                                lateralStart,
                                submain.coordinates[i],
                                submain.coordinates[i + 1]
                            );
                            if (distance < minDistance) {
                                minDistance = distance;
                                nearestSubmain = submain;
                                nearestPoint = point;
                            }
                        }

                        // ตรวจสอบจุดสิ้นสุดของท่อย่อย
                        for (let i = 0; i < submain.coordinates.length - 1; i++) {
                            const { point, distance } = getClosestPointOnSegment(
                                lateralEnd,
                                submain.coordinates[i],
                                submain.coordinates[i + 1]
                            );
                            if (distance < minDistance) {
                                minDistance = distance;
                                nearestSubmain = submain;
                                nearestPoint = point;
                            }
                        }
                    });

                    if (nearestSubmain && nearestPoint && minDistance < 2) {
                        // ระยะห่างไม่เกิน 2 เมตร
                        // ตรวจสอบว่ามีจุดเชื่อมต่ออยู่แล้วหรือไม่
                        const existingPoint = connectionPoints.find(
                            (cp) => calculateDistanceBetweenPoints(cp.position, nearestPoint!) < 1
                        );

                        if (existingPoint) {
                            // เพิ่มท่อย่อยนี้เข้าไปในจุดเชื่อมต่อที่มีอยู่
                            existingPoint.connectedLaterals.push(lateral.id);
                            existingPoint.type = 'junction';
                        } else {
                            // สร้างจุดเชื่อมต่อใหม่ - ใช้ deterministic ID แทน Date.now()
                            const position = nearestPoint as Coordinate;
                            const positionHash = `${position.lat.toFixed(6)}-${position.lng.toFixed(6)}`;
                            connectionPoints.push({
                                id: `connection-${lateral.id}-${positionHash}`,
                                position: position,
                                connectedLaterals: [lateral.id],
                                submainId: (nearestSubmain as Pipe).id || 'unknown',
                                type: 'single',
                            });
                        }
                    }
                }
            });

            return connectionPoints;
        },
        [pipeManager.pipes, checkLateralCrossingSubmain]
    );

    // สร้างจุดเชื่อมต่อของท่อเมนย่อยกับท่อเมน
    const createSubmainToMainConnectionPoints = useCallback(() => {
        const connectionPoints: Array<{
            id: string;
            position: Coordinate;
            connectedLaterals: string[];
            submainId: string;
            type: 'single' | 'junction' | 'crossing' | 'l_shape' | 't_shape' | 'cross_shape';
        }> = [];

        // หาท่อเมนและท่อเมนย่อยทั้งหมด
        const mainPipes = pipeManager.pipes.filter((p) => p.type === 'main');
        const submainPipes = pipeManager.pipes.filter((p) => p.type === 'submain');

        if (mainPipes.length === 0 || submainPipes.length === 0) {
            return connectionPoints;
        }

        submainPipes.forEach((submain) => {
            if (!submain.coordinates || submain.coordinates.length < 2) return;

            const submainStart = submain.coordinates[0];
            const submainEnd = submain.coordinates[submain.coordinates.length - 1];

            mainPipes.forEach((main) => {
                if (!main.coordinates || main.coordinates.length < 2) return;

                // ตรวจสอบการเชื่อมต่อที่ปลายท่อเมน (L-shape และ T-shape)
                const mainStart = main.coordinates[0];
                const mainEnd = main.coordinates[main.coordinates.length - 1];

                const threshold = 2; // ระยะห่างไม่เกิน 2 เมตร

                // ตรวจสอบ L-shape: ท่อเมนย่อยลากออกจากปลายท่อเมน
                // ตรวจสอบว่าปลายท่อเมนย่อยอยู่ใกล้ปลายท่อเมน (L-shape)
                const submainStartToMainStart = calculateDistanceBetweenPoints(
                    submainStart,
                    mainStart
                );
                const submainStartToMainEnd = calculateDistanceBetweenPoints(submainStart, mainEnd);
                const submainEndToMainStart = calculateDistanceBetweenPoints(submainEnd, mainStart);
                const submainEndToMainEnd = calculateDistanceBetweenPoints(submainEnd, mainEnd);

                // L-shape: ปลายท่อเมนย่อยอยู่ใกล้ปลายท่อเมน (ลากออกจาก)
                if (submainStartToMainStart < threshold) {
                    const positionHash = `${mainStart.lat.toFixed(6)}-${mainStart.lng.toFixed(6)}`;
                    const existingPoint = connectionPoints.find(
                        (cp) => calculateDistanceBetweenPoints(cp.position, mainStart) < 1
                    );

                    if (!existingPoint) {
                        connectionPoints.push({
                            id: `l-shape-start-${submain.id}-${positionHash}`,
                            position: mainStart,
                            connectedLaterals: [submain.id],
                            submainId: submain.id,
                            type: 'l_shape',
                        });
                    }
                }

                if (submainStartToMainEnd < threshold) {
                    const positionHash = `${mainEnd.lat.toFixed(6)}-${mainEnd.lng.toFixed(6)}`;
                    const existingPoint = connectionPoints.find(
                        (cp) => calculateDistanceBetweenPoints(cp.position, mainEnd) < 1
                    );

                    if (!existingPoint) {
                        connectionPoints.push({
                            id: `l-shape-end-${submain.id}-${positionHash}`,
                            position: mainEnd,
                            connectedLaterals: [submain.id],
                            submainId: submain.id,
                            type: 'l_shape',
                        });
                    }
                }

                if (submainEndToMainStart < threshold) {
                    const positionHash = `${mainStart.lat.toFixed(6)}-${mainStart.lng.toFixed(6)}`;
                    const existingPoint = connectionPoints.find(
                        (cp) => calculateDistanceBetweenPoints(cp.position, mainStart) < 1
                    );

                    if (!existingPoint) {
                        connectionPoints.push({
                            id: `l-shape-start-${submain.id}-${positionHash}`,
                            position: mainStart,
                            connectedLaterals: [submain.id],
                            submainId: submain.id,
                            type: 'l_shape',
                        });
                    }
                }

                if (submainEndToMainEnd < threshold) {
                    const positionHash = `${mainEnd.lat.toFixed(6)}-${mainEnd.lng.toFixed(6)}`;
                    const existingPoint = connectionPoints.find(
                        (cp) => calculateDistanceBetweenPoints(cp.position, mainEnd) < 1
                    );

                    if (!existingPoint) {
                        connectionPoints.push({
                            id: `l-shape-end-${submain.id}-${positionHash}`,
                            position: mainEnd,
                            connectedLaterals: [submain.id],
                            submainId: submain.id,
                            type: 'l_shape',
                        });
                    }
                }

                // ตรวจสอบ T-shape: ท่อเมนย่อยลากผ่านปลายท่อเมน
                // T-shape คือเมื่อท่อเมนย่อยตัดกับท่อเมนที่จุดใดจุดหนึ่ง และจุดตัดนั้นอยู่ใกล้ปลายท่อเมน

                // ตรวจสอบการตัดกันจริงๆ ระหว่างท่อเมนย่อยกับท่อเมน
                for (let i = 0; i < main.coordinates.length - 1; i++) {
                    const mainSegmentStart = main.coordinates[i];
                    const mainSegmentEnd = main.coordinates[i + 1];

                    // ตรวจสอบการตัดกันระหว่างท่อเมนย่อยกับส่วนของท่อเมน
                    const intersection = getLineIntersection(
                        submainStart,
                        submainEnd,
                        mainSegmentStart,
                        mainSegmentEnd
                    );

                    if (intersection) {
                        // ตรวจสอบว่าเป็นจุดตัดที่ปลายท่อเมนหรือไม่ (T-shape)
                        const isAtMainStart =
                            calculateDistanceBetweenPoints(intersection, mainStart) < threshold;
                        const isAtMainEnd =
                            calculateDistanceBetweenPoints(intersection, mainEnd) < threshold;

                        // ถ้าเป็นจุดตัดที่ปลายท่อเมน ให้เป็น T-shape
                        if (isAtMainStart) {
                            // ตรวจสอบว่าไม่ใช่ L-shape ก่อน
                            const isLShape =
                                submainStartToMainStart < threshold ||
                                submainEndToMainStart < threshold;
                            if (!isLShape) {
                                const positionHash = `${mainStart.lat.toFixed(6)}-${mainStart.lng.toFixed(6)}`;
                                const existingPoint = connectionPoints.find(
                                    (cp) =>
                                        calculateDistanceBetweenPoints(cp.position, mainStart) < 1
                                );

                                if (!existingPoint) {
                                    connectionPoints.push({
                                        id: `t-shape-start-${submain.id}-${positionHash}`,
                                        position: mainStart,
                                        connectedLaterals: [submain.id],
                                        submainId: submain.id,
                                        type: 't_shape',
                                    });
                                }
                            }
                        }

                        if (isAtMainEnd) {
                            // ตรวจสอบว่าไม่ใช่ L-shape ก่อน
                            const isLShape =
                                submainStartToMainEnd < threshold ||
                                submainEndToMainEnd < threshold;
                            if (!isLShape) {
                                const positionHash = `${mainEnd.lat.toFixed(6)}-${mainEnd.lng.toFixed(6)}`;
                                const existingPoint = connectionPoints.find(
                                    (cp) => calculateDistanceBetweenPoints(cp.position, mainEnd) < 1
                                );

                                if (!existingPoint) {
                                    connectionPoints.push({
                                        id: `t-shape-end-${submain.id}-${positionHash}`,
                                        position: mainEnd,
                                        connectedLaterals: [submain.id],
                                        submainId: submain.id,
                                        type: 't_shape',
                                    });
                                }
                            }
                        }
                    }
                }

                // T-shape (Additional): submain passes through main but not at ends
                for (let i = 0; i < main.coordinates.length - 1; i++) {
                    const intersection = getLineIntersection(
                        submainStart,
                        submainEnd,
                        main.coordinates[i],
                        main.coordinates[i + 1]
                    );
                    if (intersection) {
                        const isAtMainStart =
                            calculateDistanceBetweenPoints(intersection, mainStart) < threshold;
                        const isAtMainEnd =
                            calculateDistanceBetweenPoints(intersection, mainEnd) < threshold;

                        // ถ้าตัดกันแต่ไม่ใช่ที่ปลาย และไม่ใช่ + shape
                        if (!isAtMainStart && !isAtMainEnd) {
                            // ตรวจสอบว่า submain ผ่าน main ใกล้ปลาย main หรือไม่
                            const distanceToStart = calculateDistanceBetweenPoints(
                                intersection,
                                mainStart
                            );
                            const distanceToEnd = calculateDistanceBetweenPoints(
                                intersection,
                                mainEnd
                            );
                            const mainLength = calculateDistanceBetweenPoints(mainStart, mainEnd);

                            // ถ้าอยู่ใกล้ปลาย main (ภายใน 30% ของความยาว main)
                            if (
                                distanceToStart < mainLength * 0.3 ||
                                distanceToEnd < mainLength * 0.3
                            ) {
                                const positionHash = `${intersection.lat.toFixed(6)}-${intersection.lng.toFixed(6)}`;
                                const existingPoint = connectionPoints.find(
                                    (cp) =>
                                        calculateDistanceBetweenPoints(cp.position, intersection) <
                                        1
                                );
                                if (!existingPoint) {
                                    connectionPoints.push({
                                        id: `t-shape-through-${submain.id}-${i}-${positionHash}`,
                                        position: intersection,
                                        connectedLaterals: [submain.id],
                                        submainId: submain.id,
                                        type: 't_shape',
                                    });
                                }
                            }
                        }
                    }
                }

                // ตรวจสอบ Auto-snap: ท่อเมนย่อยอยู่ใกล้ท่อเมนมาก (สำหรับกรณีที่วาดท่อย่อยก่อน)
                // ตรวจสอบระยะห่างระหว่างท่อเมนย่อยกับส่วนต่างๆ ของท่อเมน
                for (let i = 0; i < main.coordinates.length - 1; i++) {
                    const mainSegmentStart = main.coordinates[i];
                    const mainSegmentEnd = main.coordinates[i + 1];

                    // หาจุดที่ใกล้ที่สุดบนส่วนของท่อเมนจากท่อเมนย่อย
                    const { point: closestPointOnMain, distance: distanceToMain } =
                        getClosestPointOnSegment(submainStart, mainSegmentStart, mainSegmentEnd);

                    const { point: closestPointOnMain2, distance: distanceToMain2 } =
                        getClosestPointOnSegment(submainEnd, mainSegmentStart, mainSegmentEnd);

                    // ถ้าท่อเมนย่อยอยู่ใกล้ท่อเมนมาก (auto-snap scenario)
                    if (distanceToMain < threshold || distanceToMain2 < threshold) {
                        const closestPoint =
                            distanceToMain < distanceToMain2
                                ? closestPointOnMain
                                : closestPointOnMain2;

                        // ตรวจสอบว่าจุดที่ใกล้ที่สุดอยู่ใกล้ปลายท่อเมนหรือไม่
                        const isNearMainStart =
                            calculateDistanceBetweenPoints(closestPoint, mainStart) < threshold;
                        const isNearMainEnd =
                            calculateDistanceBetweenPoints(closestPoint, mainEnd) < threshold;

                        // ถ้าอยู่ใกล้ปลายท่อเมน ให้เป็น T-shape (auto-snap)
                        if (isNearMainStart) {
                            // ตรวจสอบว่าไม่ใช่ L-shape ก่อน
                            const isLShape =
                                submainStartToMainStart < threshold ||
                                submainEndToMainStart < threshold;
                            if (!isLShape) {
                                const positionHash = `${mainStart.lat.toFixed(6)}-${mainStart.lng.toFixed(6)}`;
                                const existingPoint = connectionPoints.find(
                                    (cp) =>
                                        calculateDistanceBetweenPoints(cp.position, mainStart) < 1
                                );

                                if (!existingPoint) {
                                    connectionPoints.push({
                                        id: `t-shape-snap-start-${submain.id}-${positionHash}`,
                                        position: mainStart,
                                        connectedLaterals: [submain.id],
                                        submainId: submain.id,
                                        type: 't_shape',
                                    });
                                }
                            }
                        }

                        if (isNearMainEnd) {
                            // ตรวจสอบว่าไม่ใช่ L-shape ก่อน
                            const isLShape =
                                submainStartToMainEnd < threshold ||
                                submainEndToMainEnd < threshold;
                            if (!isLShape) {
                                const positionHash = `${mainEnd.lat.toFixed(6)}-${mainEnd.lng.toFixed(6)}`;
                                const existingPoint = connectionPoints.find(
                                    (cp) => calculateDistanceBetweenPoints(cp.position, mainEnd) < 1
                                );

                                if (!existingPoint) {
                                    connectionPoints.push({
                                        id: `t-shape-snap-end-${submain.id}-${positionHash}`,
                                        position: mainEnd,
                                        connectedLaterals: [submain.id],
                                        submainId: submain.id,
                                        type: 't_shape',
                                    });
                                }
                            }
                        }
                    }
                }

                // ตรวจสอบ +-shape: ท่อเมนย่อยลากผ่านเส้นท่อเมน
                for (let i = 0; i < main.coordinates.length - 1; i++) {
                    const mainSegmentStart = main.coordinates[i];
                    const mainSegmentEnd = main.coordinates[i + 1];

                    // ตรวจสอบการตัดกันจริงๆ ระหว่างท่อเมนย่อยกับส่วนของท่อเมน
                    const intersection = getLineIntersection(
                        submainStart,
                        submainEnd,
                        mainSegmentStart,
                        mainSegmentEnd
                    );

                    if (intersection) {
                        // ตรวจสอบว่าเป็นจุดตัดที่ปลายท่อเมนหรือไม่
                        const isAtMainStart =
                            calculateDistanceBetweenPoints(intersection, mainStart) < threshold;
                        const isAtMainEnd =
                            calculateDistanceBetweenPoints(intersection, mainEnd) < threshold;

                        // ถ้าไม่ใช่ที่ปลายท่อเมน ให้เป็น cross-shape
                        if (!isAtMainStart && !isAtMainEnd) {
                            // ตรวจสอบว่าไม่ใช่ T-shape (ไม่ใกล้ปลาย main)
                            const distanceToStart = calculateDistanceBetweenPoints(
                                intersection,
                                mainStart
                            );
                            const distanceToEnd = calculateDistanceBetweenPoints(
                                intersection,
                                mainEnd
                            );
                            const mainLength = calculateDistanceBetweenPoints(mainStart, mainEnd);

                            // ถ้าไม่ใกล้ปลาย main (เกิน 30% ของความยาว main) ให้เป็น + shape
                            if (
                                distanceToStart >= mainLength * 0.3 &&
                                distanceToEnd >= mainLength * 0.3
                            ) {
                                const positionHash = `${intersection.lat.toFixed(6)}-${intersection.lng.toFixed(6)}`;
                                const existingPoint = connectionPoints.find(
                                    (cp) =>
                                        calculateDistanceBetweenPoints(cp.position, intersection) <
                                        1
                                );

                                if (!existingPoint) {
                                    connectionPoints.push({
                                        id: `cross-shape-${submain.id}-${i}-${positionHash}`,
                                        position: intersection,
                                        connectedLaterals: [submain.id],
                                        submainId: submain.id,
                                        type: 'cross_shape',
                                    });
                                }
                            }
                        }
                    }
                }

                // ตรวจสอบ Auto-snap สำหรับ +-shape: ท่อเมนย่อยอยู่ใกล้ท่อเมนมาก (ไม่ใช่ที่ปลาย)
                for (let i = 0; i < main.coordinates.length - 1; i++) {
                    const mainSegmentStart = main.coordinates[i];
                    const mainSegmentEnd = main.coordinates[i + 1];

                    // หาจุดที่ใกล้ที่สุดบนส่วนของท่อเมนจากท่อเมนย่อย
                    const { point: closestPointOnMain, distance: distanceToMain } =
                        getClosestPointOnSegment(submainStart, mainSegmentStart, mainSegmentEnd);

                    const { point: closestPointOnMain2, distance: distanceToMain2 } =
                        getClosestPointOnSegment(submainEnd, mainSegmentStart, mainSegmentEnd);

                    // ถ้าท่อเมนย่อยอยู่ใกล้ท่อเมนมาก (auto-snap scenario)
                    if (distanceToMain < threshold || distanceToMain2 < threshold) {
                        const closestPoint =
                            distanceToMain < distanceToMain2
                                ? closestPointOnMain
                                : closestPointOnMain2;

                        // ตรวจสอบว่าจุดที่ใกล้ที่สุดไม่อยู่ใกล้ปลายท่อเมน (เป็น +-shape)
                        const isNearMainStart =
                            calculateDistanceBetweenPoints(closestPoint, mainStart) < threshold;
                        const isNearMainEnd =
                            calculateDistanceBetweenPoints(closestPoint, mainEnd) < threshold;

                        // ถ้าไม่อยู่ใกล้ปลายท่อเมน ให้เป็น +-shape (auto-snap)
                        if (!isNearMainStart && !isNearMainEnd) {
                            // ตรวจสอบว่าไม่ใช่ T-shape (ไม่ใกล้ปลาย main)
                            const distanceToStart = calculateDistanceBetweenPoints(
                                closestPoint,
                                mainStart
                            );
                            const distanceToEnd = calculateDistanceBetweenPoints(
                                closestPoint,
                                mainEnd
                            );
                            const mainLength = calculateDistanceBetweenPoints(mainStart, mainEnd);

                            // ถ้าไม่ใกล้ปลาย main (เกิน 30% ของความยาว main) ให้เป็น + shape
                            if (
                                distanceToStart >= mainLength * 0.3 &&
                                distanceToEnd >= mainLength * 0.3
                            ) {
                                const positionHash = `${closestPoint.lat.toFixed(6)}-${closestPoint.lng.toFixed(6)}`;
                                const existingPoint = connectionPoints.find(
                                    (cp) =>
                                        calculateDistanceBetweenPoints(cp.position, closestPoint) <
                                        1
                                );

                                if (!existingPoint) {
                                    connectionPoints.push({
                                        id: `cross-shape-snap-${submain.id}-${i}-${positionHash}`,
                                        position: closestPoint,
                                        connectedLaterals: [submain.id],
                                        submainId: submain.id,
                                        type: 'cross_shape',
                                    });
                                }
                            }
                        }
                    }
                }
            });
        });

        return connectionPoints;
    }, [pipeManager.pipes, getLineIntersection]);

    // สร้างจุดเชื่อมต่อสำหรับท่อย่อยทั้งหมด - ใช้ debounce เพื่อป้องกันการกระพริบ
    useEffect(() => {
        if (!mapManager.mapRef.current) return;

        // ล้าง timer เก่า
        if (connectionPointsDebounceTimer.current) {
            clearTimeout(connectionPointsDebounceTimer.current);
        }

        // ใช้ debounce เพื่อลดการอัปเดตที่บ่อยเกินไป และป้องกันการอัปเดตระหว่างการซูม
        connectionPointsDebounceTimer.current = setTimeout(() => {
            // ตรวจสอบว่าแผนที่ยังคงอยู่และไม่มีการซูมอยู่
            if (!mapManager.mapRef.current) return;

            // ตรวจสอบ zoom level เพื่อป้องกันการอัปเดตระหว่างการซูม
            const currentZoom = mapManager.mapRef.current.getZoom();
            if (currentZoom !== undefined) {
                if (
                    lastZoomLevel.current !== null &&
                    Math.abs(currentZoom - lastZoomLevel.current) > 0.1
                ) {
                    // กำลังมีการซูม ให้ข้ามการอัปเดตครั้งนี้
                    lastZoomLevel.current = currentZoom;
                    return;
                }
                lastZoomLevel.current = currentZoom;
            }
            const lateralPipes = pipeManager.pipes.filter((p) => p.type === 'lateral');
            const allConnectionPoints: Array<{
                id: string;
                position: Coordinate;
                connectedLaterals: string[];
                submainId: string;
                type: 'single' | 'junction' | 'crossing' | 'l_shape' | 't_shape' | 'cross_shape';
            }> = [];

            // สร้างจุดเชื่อมต่อของท่อย่อยกับท่อเมนย่อย
            if (lateralPipes.length > 0) {
                const lateralConnectionPoints = createLateralConnectionPoints(lateralPipes);
                allConnectionPoints.push(...lateralConnectionPoints);

                // วาดเส้นเชื่อมต่อระหว่างท่อย่อยกับสปริงเกลอร์
                mapManager.drawConnectionLines(
                    lateralPipes,
                    fieldData.irrigationPositions,
                    pipeManager.lateralMode,
                    pipeManager.findNearbyConnectedIrrigationPoints
                );
            }

            // สร้างจุดเชื่อมต่อของท่อเมนย่อยกับท่อเมน
            const submainToMainConnectionPoints = createSubmainToMainConnectionPoints();
            allConnectionPoints.push(...submainToMainConnectionPoints);

            // วาดจุดเชื่อมต่อทั้งหมด
            if (allConnectionPoints.length > 0) {
                mapManager.drawConnectionPoints(allConnectionPoints);
            } else {
                // ลบจุดเชื่อมต่อทั้งหมดเมื่อไม่มีจุดเชื่อมต่อ
                const overlays = mapManager.overlaysRef.current;
                if (overlays.connectionPoints) {
                    overlays.connectionPoints.forEach((marker) => marker.setMap(null));
                    overlays.connectionPoints.clear();
                }
                if (overlays.connectionLines) {
                    overlays.connectionLines.forEach((line) => line.setMap(null));
                    overlays.connectionLines.clear();
                }
            }
        }, 200); // 200ms debounce

        return () => {
            if (connectionPointsDebounceTimer.current) {
                clearTimeout(connectionPointsDebounceTimer.current);
            }
        };
    }, [
        pipeManager.pipes,
        pipeManager.findNearbyConnectedIrrigationPoints,
        pipeManager.lateralMode,
        mapManager,
        createLateralConnectionPoints,
        createSubmainToMainConnectionPoints,
        fieldData.irrigationPositions,
    ]);

    // วิเคราะห์รูปแบบของท่อต้นแบบ: "ลากผ่าน" หรือ "ออกจากด้านใดด้านหนึ่ง"
    const analyzeTemplatePattern = useCallback(
        (template: Pipe, nearestSubmain: Pipe): 'crossing' | 'extending' => {
            if (
                !template.coordinates ||
                template.coordinates.length < 2 ||
                !nearestSubmain.coordinates
            ) {
                return 'extending'; // default
            }

            const templateStart = template.coordinates[0];
            const templateEnd = template.coordinates[template.coordinates.length - 1];
            const submainCoords = nearestSubmain.coordinates as Coordinate[];

            const threshold = 2; // ระยะห่างไม่เกิน 2 เมตร

            // ตรวจสอบว่าท่อต้นแบบลากผ่านท่อเมนย่อยหรือไม่
            for (let i = 0; i < submainCoords.length - 1; i++) {
                const submainStart = submainCoords[i];
                const submainEnd = submainCoords[i + 1];

                // ตรวจสอบการตัดกันจริงๆ ระหว่างท่อต้นแบบกับส่วนของท่อเมนย่อย
                const intersection = getLineIntersection(
                    templateStart,
                    templateEnd,
                    submainStart,
                    submainEnd
                );

                if (intersection) {
                    // ถ้ามีจุดตัด = ลากผ่าน
                    return 'crossing';
                }
            }

            // ตรวจสอบ auto-snap: ท่อต้นแบบอยู่ใกล้ท่อเมนย่อยมาก
            for (let i = 0; i < submainCoords.length - 1; i++) {
                const submainStart = submainCoords[i];
                const submainEnd = submainCoords[i + 1];

                // หาจุดที่ใกล้ที่สุดบนท่อเมนย่อยจากท่อต้นแบบ
                const { point: closestPointOnSubmain, distance: minDistance } =
                    getClosestPointOnSegment(templateStart, submainStart, submainEnd);

                const { point: closestPointOnSubmain2, distance: minDistance2 } =
                    getClosestPointOnSegment(templateEnd, submainStart, submainEnd);

                const closestPoint =
                    minDistance < minDistance2 ? closestPointOnSubmain : closestPointOnSubmain2;
                const closestDistance = Math.min(minDistance, minDistance2);

                if (closestDistance < threshold) {
                    // ตรวจสอบว่าท่อต้นแบบข้ามท่อเมนย่อยหรือไม่
                    // โดยดูว่าจุดที่ใกล้ที่สุดอยู่ระหว่างปลายท่อต้นแบบหรือไม่

                    // คำนวณระยะห่างจากจุดที่ใกล้ที่สุดไปยังปลายท่อต้นแบบ
                    const distanceToStart = calculateDistanceBetweenPoints(
                        closestPoint,
                        templateStart
                    );
                    const distanceToEnd = calculateDistanceBetweenPoints(closestPoint, templateEnd);
                    const templateLength = calculateDistanceBetweenPoints(
                        templateStart,
                        templateEnd
                    );

                    // ถ้าจุดที่ใกล้ที่สุดอยู่ใกล้ปลายท่อต้นแบบมาก = ออกจากด้านใดด้านหนึ่ง
                    if (
                        distanceToStart < templateLength * 0.3 ||
                        distanceToEnd < templateLength * 0.3
                    ) {
                        return 'extending';
                    }

                    // ถ้าจุดที่ใกล้ที่สุดอยู่ใกล้จุดกลางของท่อต้นแบบ = ลากผ่าน
                    const templateMid = {
                        lat: (templateStart.lat + templateEnd.lat) / 2,
                        lng: (templateStart.lng + templateEnd.lng) / 2,
                    };
                    const distanceToMid = calculateDistanceBetweenPoints(closestPoint, templateMid);

                    if (distanceToMid < templateLength * 0.4) {
                        return 'crossing';
                    }
                }
            }

            // ถ้าไม่ตรงเงื่อนไขใดๆ ให้เป็น default
            return 'extending';
        },
        [getLineIntersection]
    );

    // สร้างท่อย่อยตาม "แถวของจุดให้น้ำ" โดยใช้มุมการหมุนของแปลง
    const generateGuidedLateralsFromTemplate = useCallback(
        (template: Pipe, selectedPattern?: 'extending' | 'crossing'): Pipe[] => {
            if (!template.coordinates || template.coordinates.length < 2) return [];

            // เลือกโซนเดียวกับต้นแบบเพื่อจำกัดขอบเขตการสร้าง
            const guideStart = template.coordinates[0];
            const findZoneForPoint = (p: Coordinate) =>
                fieldData.zones.find((z) =>
                    isPointInPolygonEnhanced([p.lat, p.lng], z.coordinates)
                );
            const zone = findZoneForPoint(guideStart);
            if (!zone) return [];

            // ดึงจุดให้น้ำทั้งหมดในโซนนั้น
            const allIrrigationPoints = [
                ...fieldData.irrigationPositions.sprinklers,
                ...fieldData.irrigationPositions.dripTapes,
                ...fieldData.irrigationPositions.waterJets,
                ...fieldData.irrigationPositions.pivots,
            ].filter((point) => isPointInPolygonEnhanced([point.lat, point.lng], zone.coordinates));

            if (allIrrigationPoints.length < 2) return [];

            // เตรียม helper สำหรับ หมุน/แปลงพิกัด (หน่วยเมตรแบบ local)
            const origin = allIrrigationPoints[0];
            const originLatRad = (origin.lat * Math.PI) / 180;
            const M_PER_DEG_LAT = 110574;
            const M_PER_DEG_LNG = 111320 * Math.cos(originLatRad);
            const toXYm = (c: Coordinate) => ({
                x: (c.lng - origin.lng) * M_PER_DEG_LNG,
                y: (c.lat - origin.lat) * M_PER_DEG_LAT,
            });
            const fromXYm = (p: { x: number; y: number }): Coordinate => ({
                lat: origin.lat + p.y / M_PER_DEG_LAT,
                lng: origin.lng + p.x / M_PER_DEG_LNG,
            });
            // หาองศาของท่อต้นแบบ แล้วหมุนระบบพิกัดให้ท่อต้นแบบขนานแกน X
            const vStart = toXYm(guideStart);
            const vEnd = toXYm(template.coordinates[template.coordinates.length - 1]);
            const theta = Math.atan2(vEnd.y - vStart.y, vEnd.x - vStart.x);
            const cosT = Math.cos(-theta);
            const sinT = Math.sin(-theta);
            const rotateXY = (p: { x: number; y: number }) => ({
                x: p.x * cosT - p.y * sinT,
                y: p.x * sinT + p.y * cosT,
            });
            const unrotateXY = (p: { x: number; y: number }) => {
                const cosB = Math.cos(theta);
                const sinB = Math.sin(theta);
                return { x: p.x * cosB - p.y * sinB, y: p.x * sinB + p.y * cosB };
            };

            // หมุนจุดให้น้ำทั้งหมดให้แถวขนานแกน X "ตามแนวท่อต้นแบบ"
            const rotated = allIrrigationPoints.map((point) => ({
                point,
                xy: rotateXY(toXYm(point)),
            }));

            // หา submain ที่ใกล้จุดเริ่มท่อต้นแบบที่สุด และแปลงเป็นพิกัดที่หมุนแล้ว
            const submains = pipeManager.pipes.filter(
                (p) => p.type === 'submain' && p.coordinates && p.coordinates.length >= 2
            );
            if (submains.length === 0) return [];
            let nearestSubmain: Pipe | null = null;
            let bestDist = Infinity;
            for (const sm of submains) {
                const coords = sm.coordinates as Coordinate[];
                for (let i = 0; i < coords.length - 1; i++) {
                    const { distance } = getClosestPointOnSegment(
                        guideStart,
                        coords[i],
                        coords[i + 1]
                    );
                    if (distance < bestDist) {
                        bestDist = distance;
                        nearestSubmain = sm;
                    }
                }
            }
            if (!nearestSubmain) return [];

            // วิเคราะห์รูปแบบของท่อต้นแบบ: "ลากผ่าน" หรือ "ออกจากด้านใดด้านหนึ่ง"
            // ถ้ามี selectedPattern ให้ใช้แทนการวิเคราะห์อัตโนมัติ
            const templatePattern =
                selectedPattern || analyzeTemplatePattern(template, nearestSubmain);

            // Debug logging สำหรับ templatePattern
            console.log('🔍 Template Pattern Analysis:', {
                selectedPattern,
                analyzedPattern: analyzeTemplatePattern(template, nearestSubmain),
                finalTemplatePattern: templatePattern,
                mode: pipeManager.lateralMode,
            });
            const subRot = (nearestSubmain.coordinates as Coordinate[]).map((c) =>
                rotateXY(toXYm(c))
            );
            // หา x ที่จุดตัดระหว่างเส้นแนวนอน y=y0 กับเส้น submain ในพิกัดที่หมุนแล้ว
            const horizontalIntersectionsX = (y0: number): number[] => {
                const xs: number[] = [];
                for (let i = 0; i < subRot.length - 1; i++) {
                    const A = subRot[i];
                    const B = subRot[i + 1];
                    const dy = B.y - A.y;
                    if (Math.abs(dy) < 1e-9) {
                        // ช่วงแนวนอน: หาก y0 ตรงกับระดับนี้ ให้รับช่วง x ทั้งช่วง
                        if (Math.abs(y0 - A.y) < 1e-6) {
                            xs.push(A.x, B.x);
                        }
                        continue;
                    }
                    const t = (y0 - A.y) / dy;
                    if (t >= 0 && t <= 1) {
                        const x = A.x + (B.x - A.x) * t;
                        xs.push(x);
                    }
                }
                return xs.sort((a, b) => a - b);
            };
            // วิเคราะห์ช่องไฟระหว่างแถวโดยดูความต่าง y ที่มีนัยสำคัญ
            const ys = rotated.map((r) => r.xy.y).sort((a, b) => a - b);
            const deltas: number[] = [];
            for (let i = 1; i < ys.length; i++) {
                const d = Math.abs(ys[i] - ys[i - 1]);
                if (d > 0.2) deltas.push(d); // ข้ามความคลาดเคลื่อนเล็กๆ
            }
            const median = (arr: number[]) => {
                const a = [...arr].sort((x, y) => x - y);
                const n = a.length;
                if (n === 0) return 2.0;
                return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
            };
            const spacingEst = median(deltas) || 2.0; // ค่าโดยประมาณของระยะระหว่างแถว (เมตร)
            const tol = Math.max(0.3, spacingEst * 0.3); // tolerance สำหรับจับกลุ่มเป็นแถว

            // จัดกลุ่มเป็นแถวด้วยการจับคู่ตาม y ใกล้เคียง (หลังหมุนด้วยแนวท่อต้นแบบ)
            type Row = { y: number; points: { point: Coordinate; xy: { x: number; y: number } }[] };
            const rows: Row[] = [];
            for (const r of rotated) {
                let assigned: Row | null = null;
                for (const row of rows) {
                    if (Math.abs(r.xy.y - row.y) <= tol) {
                        assigned = row;
                        break;
                    }
                }
                if (!assigned) {
                    assigned = { y: r.xy.y, points: [] };
                    rows.push(assigned);
                }
                assigned.points.push({ point: r.point, xy: r.xy });
                // อัปเดตค่า y เฉลี่ยของแถวเพื่อเพิ่มความเสถียร
                const sumY = assigned.points.reduce((acc, p) => acc + p.xy.y, 0);
                assigned.y = sumY / assigned.points.length;
            }

            // Ensure row order is by Y so adjacent indices are truly neighboring rows
            rows.sort((a, b) => a.y - b.y);

            // สร้างท่อต่อแถว: เชื่อมจุดซ้ายสุด-ขวาสุดในแกน X (หลังหมุน)
            const generated: Pipe[] = [];
            const pointToPolylineDistance = (pt: Coordinate, line: Coordinate[]): number => {
                let best = Infinity;
                for (let i = 0; i < line.length - 1; i++) {
                    const { distance } = getClosestPointOnSegment(pt, line[i], line[i + 1]);
                    if (distance < best) best = distance;
                }
                return best;
            };
            const already = pipeManager.pipes.filter((p) => p.type === 'lateral');
            const mode = pipeManager.lateralMode;
            if (mode === 'betweenRows') {
                // ตรวจสอบ templatePattern ที่ผู้ใช้เลือก
                console.log('🌾 Between Rows Mode - Template Pattern:', templatePattern);
                if (templatePattern === 'crossing') {
                    // รูปแบบ "ลากผ่าน": สร้างท่อย่อยเส้นเดียวผ่านแถว (ระหว่างแถว)
                    console.log('✅ Creating crossing pattern (single line between rows)');

                    // หาแถวที่ใกล้กับท่อต้นแบบที่สุด
                    const minSeparationBase = Math.max(0.8, spacingEst * 0.5);

                    // สร้างท่อย่อยระหว่างแถว (เว้นแถว - ท่อย่อยหนึ่งเส้นเชื่อมสองแถว)
                    console.log(
                        `📊 Total rows: ${rows.length}, Creating between-rows laterals (skip every other row)`
                    );

                    // หาแถวที่ใกล้กับท่อต้นแบบที่สุดเพื่อกำหนด parity
                    const tStartR = rotateXY(vStart);
                    const tEndR = rotateXY(vEnd);
                    const templateMidY = (tStartR.y + tEndR.y) / 2;

                    // หาแถวที่ใกล้กับท่อต้นแบบที่สุด
                    let nearestRowIndex = 0;
                    let nearestRowDistance = Infinity;
                    for (let i = 0; i < rows.length; i++) {
                        const distance = Math.abs(rows[i].y - templateMidY);
                        if (distance < nearestRowDistance) {
                            nearestRowDistance = distance;
                            nearestRowIndex = i;
                        }
                    }

                    // กำหนด parity เริ่มต้น (0 หรือ 1) เพื่อเว้นแถว
                    const startParity = nearestRowIndex % 2;
                    console.log(
                        `🎯 Template near row ${nearestRowIndex}, starting with parity ${startParity} (skip every other row)`
                    );

                    for (let r = startParity; r < rows.length - 1; r += 2) {
                        const rowA = rows[r];
                        const rowB = rows[r + 1];

                        // ตรวจสอบว่าระยะห่างระหว่างแถวเหมาะสม
                        const separation = Math.abs(rowB.y - rowA.y);
                        if (separation < minSeparationBase) {
                            console.log(
                                `⏭️ Skipping rows ${r}-${r + 1}: separation too small (${separation.toFixed(2)}m < ${minSeparationBase.toFixed(2)}m)`
                            );
                            continue;
                        }

                        const midY = (rowA.y + rowB.y) / 2;
                        const xs = horizontalIntersectionsX(midY);
                        if (xs.length === 0) {
                            console.log(`⏭️ Skipping rows ${r}-${r + 1}: no submain intersections`);
                            continue;
                        }

                        // รวมจุดจากทั้งสองแถว
                        const ptsA = [...rowA.points].sort((a, b) => a.xy.x - b.xy.x);
                        const ptsB = [...rowB.points].sort((a, b) => a.xy.x - b.xy.x);
                        const allPts = [...ptsA, ...ptsB];

                        if (allPts.length < 2) {
                            console.log(
                                `⏭️ Skipping rows ${r}-${r + 1}: insufficient points (${allPts.length})`
                            );
                            continue;
                        }

                        // หาจุดซ้ายสุดและขวาสุด
                        const leftmost = allPts[0];
                        const rightmost = allPts[allPts.length - 1];

                        console.log(
                            `✅ Processing rows ${r}-${r + 1}: ${ptsA.length} + ${ptsB.length} = ${allPts.length} points, separation: ${separation.toFixed(2)}m`
                        );

                        // สร้างท่อย่อยเส้นเดียวจากจุดซ้ายสุดไปจุดขวาสุด (ระหว่างแถว)
                        const startXY = unrotateXY({ x: leftmost.xy.x, y: midY });
                        const endXY = unrotateXY({ x: rightmost.xy.x, y: midY });
                        const start = fromXYm(startXY);
                        const end = fromXYm(endXY);

                        if (
                            isPointInPolygonEnhanced([start.lat, start.lng], zone.coordinates) &&
                            isPointInPolygonEnhanced([end.lat, end.lng], zone.coordinates)
                        ) {
                            const mid = {
                                lat: (start.lat + end.lat) / 2,
                                lng: (start.lng + end.lng) / 2,
                            };
                            const minGapM = 0.6;
                            const templateGapM = Math.max(1.5, spacingEst * 0.8);
                            const distToTemplate = pointToPolylineDistance(
                                mid,
                                template.coordinates || []
                            );
                            const distStartToTemplate = pointToPolylineDistance(
                                start,
                                template.coordinates || []
                            );
                            const distEndToTemplate = pointToPolylineDistance(
                                end,
                                template.coordinates || []
                            );
                            const minDistToTemplate = Math.min(
                                distToTemplate,
                                distStartToTemplate,
                                distEndToTemplate
                            );

                            if (minDistToTemplate >= templateGapM) {
                                const overlapsGenerated = generated.some(
                                    (g) =>
                                        pointToPolylineDistance(mid, g.coordinates || []) < minGapM
                                );
                                let overlapsExisting = false;
                                if (!overlapsGenerated) {
                                    for (const p of already) {
                                        if (!p.coordinates || p.coordinates.length < 2) continue;
                                        for (let i = 0; i < p.coordinates.length - 1; i++) {
                                            const { distance } = getClosestPointOnSegment(
                                                mid,
                                                p.coordinates[i],
                                                p.coordinates[i + 1]
                                            );
                                            if (distance < minGapM) {
                                                overlapsExisting = true;
                                                break;
                                            }
                                        }
                                        if (overlapsExisting) break;
                                    }
                                }
                                const lengthM = calculateDistance([start, end]);
                                if (lengthM >= 2 && !overlapsGenerated && !overlapsExisting) {
                                    generated.push({
                                        id: `lateral-betweenrows-${Date.now()}-${generated.length}-crossing`,
                                        type: 'lateral',
                                        coordinates: [start, end],
                                        length: lengthM,
                                    });
                                    console.log(
                                        `🎯 Created between-rows lateral: ${lengthM.toFixed(2)}m, rows ${r}-${r + 1} (connects 2 rows, skips next 2 rows)`
                                    );
                                } else {
                                    console.log(
                                        `❌ Failed to create lateral: length=${lengthM.toFixed(2)}m, overlapsGenerated=${overlapsGenerated}, overlapsExisting=${overlapsExisting}`
                                    );
                                }
                            }
                        }
                    }

                    // แสดงสรุปการสร้างท่อย่อยระหว่างแถว
                    console.log(
                        `📋 Between-rows crossing pattern summary: Created ${generated.length} laterals, skipped every other row pair`
                    );
                } else {
                    // รูปแบบ "ออกจากด้านใดด้านหนึ่ง": สร้างท่อย่อยแยกเป็นสองเส้น (ด้านละเส้น)
                    console.log('✅ Creating extending pattern (split lines left-right)');
                    // Determine which adjacent-row parity to use so that we alternate relative to the template line
                    const tStartR = rotateXY(vStart);
                    const tEndR = rotateXY(vEnd);
                    const templateMidY = (tStartR.y + tEndR.y) / 2;
                    const minSeparationBase = Math.max(0.8, spacingEst * 0.5);
                    let nearestPairIndex = 0;
                    let nearestPairDy = Infinity;
                    for (let i = 0; i < rows.length - 1; i++) {
                        const dy = Math.abs(rows[i + 1].y - rows[i].y);
                        if (dy < minSeparationBase) continue; // ignore degenerate pairs
                        const midY = (rows[i].y + rows[i + 1].y) / 2;
                        const d = Math.abs(midY - templateMidY);
                        if (d < nearestPairDy) {
                            nearestPairDy = d;
                            nearestPairIndex = i;
                        }
                    }
                    // Use same parity as the template's nearest pair so we generate indices j0±2, j0±4, ... (แถวเว้นแถว)
                    const startParity = nearestPairIndex % 2;

                    // Generate mid-row laterals parallel to the template line, centered between adjacent rows
                    // แถวเว้นแถว: ใช้ parity ที่เลือกเพื่อเว้นเส้นติดกับเส้นต้นแบบ
                    for (let r = startParity; r < rows.length - 1; r += 2) {
                        if (r === nearestPairIndex) continue; // don't duplicate the template's own midline
                        const rowA = rows[r];
                        const rowB = rows[r + 1];
                        // Skip if two rows are effectively the same band (bad clustering) to avoid on-row lines
                        const separation = Math.abs(rowB.y - rowA.y);
                        const minSeparation = minSeparationBase;
                        if (separation < minSeparation) continue;
                        const midY = (rowA.y + rowB.y) / 2;
                        const xs = horizontalIntersectionsX(midY);
                        if (xs.length === 0) continue;
                        const ptsA = [...rowA.points].sort((a, b) => a.xy.x - b.xy.x);
                        const ptsB = [...rowB.points].sort((a, b) => a.xy.x - b.xy.x);
                        const allPts = [...ptsA, ...ptsB];
                        const rowXs = allPts.map((p) => p.xy.x);
                        const medianX = rowXs[Math.floor(rowXs.length / 2)];
                        let anchorX = xs[0];
                        let bestDx = Math.abs(anchorX - medianX);
                        for (let i = 1; i < xs.length; i++) {
                            const dx = Math.abs(xs[i] - medianX);
                            if (dx < bestDx) {
                                bestDx = dx;
                                anchorX = xs[i];
                            }
                        }

                        // Right side (outward)
                        const outward = allPts.filter((p) => p.xy.x > anchorX);
                        if (outward.length > 0) {
                            const endX = outward[outward.length - 1].xy.x;
                            if (Math.abs(endX - anchorX) >= 0.5) {
                                const startXY = unrotateXY({ x: anchorX, y: midY });
                                const endXY = unrotateXY({ x: endX, y: midY });
                                const start = fromXYm(startXY);
                                const end = fromXYm(endXY);
                                if (
                                    isPointInPolygonEnhanced(
                                        [start.lat, start.lng],
                                        zone.coordinates
                                    ) &&
                                    isPointInPolygonEnhanced([end.lat, end.lng], zone.coordinates)
                                ) {
                                    const mid = {
                                        lat: (start.lat + end.lat) / 2,
                                        lng: (start.lng + end.lng) / 2,
                                    };
                                    const minGapM = 0.6;
                                    const templateGapM = Math.max(1.5, spacingEst * 0.8); // เพิ่มระยะห่างจากท่อต้นแบบ
                                    const distToTemplate = pointToPolylineDistance(
                                        mid,
                                        template.coordinates || []
                                    );

                                    // ตรวจสอบระยะห่างจากทุกจุดของท่อที่สร้างไปยังท่อต้นแบบ
                                    const distStartToTemplate = pointToPolylineDistance(
                                        start,
                                        template.coordinates || []
                                    );
                                    const distEndToTemplate = pointToPolylineDistance(
                                        end,
                                        template.coordinates || []
                                    );
                                    const minDistToTemplate = Math.min(
                                        distToTemplate,
                                        distStartToTemplate,
                                        distEndToTemplate
                                    );

                                    if (minDistToTemplate >= templateGapM) {
                                        const overlapsGenerated = generated.some(
                                            (g) =>
                                                pointToPolylineDistance(mid, g.coordinates || []) <
                                                minGapM
                                        );
                                        let overlapsExisting = false;
                                        if (!overlapsGenerated) {
                                            for (const p of already) {
                                                if (!p.coordinates || p.coordinates.length < 2)
                                                    continue;
                                                for (let i = 0; i < p.coordinates.length - 1; i++) {
                                                    const { distance } = getClosestPointOnSegment(
                                                        mid,
                                                        p.coordinates[i],
                                                        p.coordinates[i + 1]
                                                    );
                                                    if (distance < minGapM) {
                                                        overlapsExisting = true;
                                                        break;
                                                    }
                                                }
                                                if (overlapsExisting) break;
                                            }
                                        }
                                        const lengthM = calculateDistance([start, end]);
                                        if (
                                            lengthM >= 2 &&
                                            !overlapsGenerated &&
                                            !overlapsExisting
                                        ) {
                                            generated.push({
                                                id: `lateral-midrow-${Date.now()}-${generated.length}-right`,
                                                type: 'lateral',
                                                coordinates: [start, end],
                                                length: lengthM,
                                            });
                                        }
                                    }
                                }
                            }
                        }

                        // Left side (inward)
                        const inward = allPts.filter((p) => p.xy.x < anchorX);
                        if (inward.length > 0) {
                            const endX = inward[0].xy.x;
                            if (Math.abs(endX - anchorX) >= 0.5) {
                                const startXY = unrotateXY({ x: anchorX, y: midY });
                                const endXY = unrotateXY({ x: endX, y: midY });
                                const start = fromXYm(startXY);
                                const end = fromXYm(endXY);
                                if (
                                    isPointInPolygonEnhanced(
                                        [start.lat, start.lng],
                                        zone.coordinates
                                    ) &&
                                    isPointInPolygonEnhanced([end.lat, end.lng], zone.coordinates)
                                ) {
                                    const mid = {
                                        lat: (start.lat + end.lat) / 2,
                                        lng: (start.lng + end.lng) / 2,
                                    };
                                    const minGapM = 0.6;
                                    const templateGapM = Math.max(1.5, spacingEst * 0.8); // เพิ่มระยะห่างจากท่อต้นแบบ
                                    const distToTemplate = pointToPolylineDistance(
                                        mid,
                                        template.coordinates || []
                                    );

                                    // ตรวจสอบระยะห่างจากทุกจุดของท่อที่สร้างไปยังท่อต้นแบบ
                                    const distStartToTemplate = pointToPolylineDistance(
                                        start,
                                        template.coordinates || []
                                    );
                                    const distEndToTemplate = pointToPolylineDistance(
                                        end,
                                        template.coordinates || []
                                    );
                                    const minDistToTemplate = Math.min(
                                        distToTemplate,
                                        distStartToTemplate,
                                        distEndToTemplate
                                    );

                                    if (minDistToTemplate >= templateGapM) {
                                        const overlapsGenerated = generated.some(
                                            (g) =>
                                                pointToPolylineDistance(mid, g.coordinates || []) <
                                                minGapM
                                        );
                                        let overlapsExisting = false;
                                        if (!overlapsGenerated) {
                                            for (const p of already) {
                                                if (!p.coordinates || p.coordinates.length < 2)
                                                    continue;
                                                for (let i = 0; i < p.coordinates.length - 1; i++) {
                                                    const { distance } = getClosestPointOnSegment(
                                                        mid,
                                                        p.coordinates[i],
                                                        p.coordinates[i + 1]
                                                    );
                                                    if (distance < minGapM) {
                                                        overlapsExisting = true;
                                                        break;
                                                    }
                                                }
                                                if (overlapsExisting) break;
                                            }
                                        }
                                        const lengthM = calculateDistance([start, end]);
                                        if (
                                            lengthM >= 2 &&
                                            !overlapsGenerated &&
                                            !overlapsExisting
                                        ) {
                                            generated.push({
                                                id: `lateral-midrow-${Date.now()}-${generated.length}-left`,
                                                type: 'lateral',
                                                coordinates: [start, end],
                                                length: lengthM,
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                for (const row of rows) {
                    if (row.points.length < 2) continue;
                    // จุดตัดกับท่อเมนย่อยที่ y ของแถว เพื่อให้แน่ใจว่าเส้นเริ่มบนท่อเมนย่อย
                    const xs = horizontalIntersectionsX(row.y);
                    if (xs.length === 0) continue;
                    const pts = [...row.points].sort((a, b) => a.xy.x - b.xy.x);
                    const rowXs = pts.map((p) => p.xy.x);
                    const medianX = rowXs[Math.floor(rowXs.length / 2)];
                    // เลือก x ของจุดตัดที่อยู่ใกล้ median ของแถวนั้นสุด เพื่อเป็นจุดเชื่อมต่อ
                    let anchorX = xs[0];
                    let bestDx = Math.abs(anchorX - medianX);
                    for (let i = 1; i < xs.length; i++) {
                        const dx = Math.abs(xs[i] - medianX);
                        if (dx < bestDx) {
                            bestDx = dx;
                            anchorX = xs[i];
                        }
                    }
                    // สร้างท่อย่อยตามรูปแบบของท่อต้นแบบ
                    if (templatePattern === 'crossing') {
                        // รูปแบบ "ลากผ่าน": สร้างท่อย่อยจากจุดซ้ายสุดไปจุดขวาสุด (เส้นเดียวต่อแถว)
                        const allPts = [...pts].sort((a, b) => a.xy.x - b.xy.x);

                        if (allPts.length >= 2) {
                            const leftmost = allPts[0];
                            const rightmost = allPts[allPts.length - 1];

                            // สร้างท่อย่อยจากจุดซ้ายสุดไปจุดขวาสุด (เส้นเดียวต่อแถว)
                            const startXY = unrotateXY({ x: leftmost.xy.x, y: row.y });
                            const endXY = unrotateXY({ x: rightmost.xy.x, y: row.y });
                            const start = fromXYm(startXY);
                            const end = fromXYm(endXY);

                            // ความยาวต้องพอสมควรและอยู่ในโซน
                            if (
                                isPointInPolygonEnhanced(
                                    [start.lat, start.lng],
                                    zone.coordinates
                                ) &&
                                isPointInPolygonEnhanced([end.lat, end.lng], zone.coordinates)
                            ) {
                                const mid = {
                                    lat: (start.lat + end.lat) / 2,
                                    lng: (start.lng + end.lng) / 2,
                                };

                                // กันซ้อนกับท่อเดิม/ที่สร้างระหว่างรอบนี้ และห้ามทับท่อต้นแบบ
                                const minGapM = 0.6;
                                const templateGapM = Math.max(1.5, spacingEst * 0.8); // เพิ่มระยะห่างจากท่อต้นแบบ
                                const distToTemplate = pointToPolylineDistance(
                                    mid,
                                    template.coordinates || []
                                );

                                // ตรวจสอบระยะห่างจากทุกจุดของท่อที่สร้างไปยังท่อต้นแบบ
                                const distStartToTemplate = pointToPolylineDistance(
                                    start,
                                    template.coordinates || []
                                );
                                const distEndToTemplate = pointToPolylineDistance(
                                    end,
                                    template.coordinates || []
                                );
                                const minDistToTemplate = Math.min(
                                    distToTemplate,
                                    distStartToTemplate,
                                    distEndToTemplate
                                );

                                if (minDistToTemplate >= templateGapM) {
                                    // ใกล้ท่อต้นแบบเกินไป ไม่สร้างซ้ำแนวเดียวกัน
                                    const overlapsGenerated = generated.some(
                                        (g) =>
                                            pointToPolylineDistance(mid, g.coordinates || []) <
                                            minGapM
                                    );
                                    let overlapsExisting = false;
                                    if (!overlapsGenerated) {
                                        for (const p of already) {
                                            if (!p.coordinates || p.coordinates.length < 2)
                                                continue;
                                            for (let i = 0; i < p.coordinates.length - 1; i++) {
                                                const { distance } = getClosestPointOnSegment(
                                                    mid,
                                                    p.coordinates[i],
                                                    p.coordinates[i + 1]
                                                );
                                                if (distance < minGapM) {
                                                    overlapsExisting = true;
                                                    break;
                                                }
                                            }
                                            if (overlapsExisting) break;
                                        }
                                    }
                                    const lengthM = calculateDistance([start, end]);
                                    if (lengthM >= 2 && !overlapsGenerated && !overlapsExisting) {
                                        generated.push({
                                            id: `lateral-row-${Date.now()}-${generated.length}-crossing`,
                                            type: 'lateral',
                                            coordinates: [start, end],
                                            length: lengthM,
                                        });
                                    }
                                }
                            }
                        }
                    } else {
                        // รูปแบบ "ออกจากด้านใดด้านหนึ่ง": สร้างท่อย่อยแยกเป็นสองเส้น (ด้านละเส้น)
                        const outward = pts.filter((p) => p.xy.x > anchorX);
                        const inward = pts.filter((p) => p.xy.x < anchorX);

                        // สร้างท่อฝั่งขวา (outward)
                        if (outward.length > 0) {
                            const endX = outward[outward.length - 1].xy.x; // ค่าสูงสุดด้านนอก
                            if (Math.abs(endX - anchorX) >= 0.5) {
                                // สั้นเกินไป
                                const startXY = unrotateXY({ x: anchorX, y: row.y });
                                const endXY = unrotateXY({ x: endX, y: row.y });
                                const start = fromXYm(startXY);
                                const end = fromXYm(endXY);

                                // ความยาวต้องพอสมควรและอยู่ในโซน
                                if (
                                    isPointInPolygonEnhanced(
                                        [start.lat, start.lng],
                                        zone.coordinates
                                    ) &&
                                    isPointInPolygonEnhanced([end.lat, end.lng], zone.coordinates)
                                ) {
                                    const mid = {
                                        lat: (start.lat + end.lat) / 2,
                                        lng: (start.lng + end.lng) / 2,
                                    };

                                    // กันซ้อนกับท่อเดิม/ที่สร้างระหว่างรอบนี้ และห้ามทับท่อต้นแบบ
                                    const minGapM = 0.6;
                                    const templateGapM = Math.max(1.5, spacingEst * 0.8); // เพิ่มระยะห่างจากท่อต้นแบบ
                                    const distToTemplate = pointToPolylineDistance(
                                        mid,
                                        template.coordinates || []
                                    );

                                    // ตรวจสอบระยะห่างจากทุกจุดของท่อที่สร้างไปยังท่อต้นแบบ
                                    const distStartToTemplate = pointToPolylineDistance(
                                        start,
                                        template.coordinates || []
                                    );
                                    const distEndToTemplate = pointToPolylineDistance(
                                        end,
                                        template.coordinates || []
                                    );
                                    const minDistToTemplate = Math.min(
                                        distToTemplate,
                                        distStartToTemplate,
                                        distEndToTemplate
                                    );

                                    if (minDistToTemplate >= templateGapM) {
                                        // ใกล้ท่อต้นแบบเกินไป ไม่สร้างซ้ำแนวเดียวกัน
                                        const overlapsGenerated = generated.some(
                                            (g) =>
                                                pointToPolylineDistance(mid, g.coordinates || []) <
                                                minGapM
                                        );
                                        let overlapsExisting = false;
                                        if (!overlapsGenerated) {
                                            for (const p of already) {
                                                if (!p.coordinates || p.coordinates.length < 2)
                                                    continue;
                                                for (let i = 0; i < p.coordinates.length - 1; i++) {
                                                    const { distance } = getClosestPointOnSegment(
                                                        mid,
                                                        p.coordinates[i],
                                                        p.coordinates[i + 1]
                                                    );
                                                    if (distance < minGapM) {
                                                        overlapsExisting = true;
                                                        break;
                                                    }
                                                }
                                                if (overlapsExisting) break;
                                            }
                                        }
                                        const lengthM = calculateDistance([start, end]);
                                        if (
                                            lengthM >= 2 &&
                                            !overlapsGenerated &&
                                            !overlapsExisting
                                        ) {
                                            generated.push({
                                                id: `lateral-row-${Date.now()}-${generated.length}-right`,
                                                type: 'lateral',
                                                coordinates: [start, end],
                                                length: lengthM,
                                            });
                                        }
                                    }
                                }
                            }
                        }

                        // สร้างท่อฝั่งซ้าย (inward)
                        if (inward.length > 0) {
                            const endX = inward[0].xy.x; // ค่าต่ำสุดด้านใน
                            if (Math.abs(endX - anchorX) >= 0.5) {
                                // สั้นเกินไป
                                const startXY = unrotateXY({ x: anchorX, y: row.y });
                                const endXY = unrotateXY({ x: endX, y: row.y });
                                const start = fromXYm(startXY);
                                const end = fromXYm(endXY);

                                // ความยาวต้องพอสมควรและอยู่ในโซน
                                if (
                                    isPointInPolygonEnhanced(
                                        [start.lat, start.lng],
                                        zone.coordinates
                                    ) &&
                                    isPointInPolygonEnhanced([end.lat, end.lng], zone.coordinates)
                                ) {
                                    const mid = {
                                        lat: (start.lat + end.lat) / 2,
                                        lng: (start.lng + end.lng) / 2,
                                    };

                                    // กันซ้อนกับท่อเดิม/ที่สร้างระหว่างรอบนี้ และห้ามทับท่อต้นแบบ
                                    const minGapM = 0.6;
                                    const templateGapM = Math.max(1.5, spacingEst * 0.8); // เพิ่มระยะห่างจากท่อต้นแบบ
                                    const distToTemplate = pointToPolylineDistance(
                                        mid,
                                        template.coordinates || []
                                    );

                                    // ตรวจสอบระยะห่างจากทุกจุดของท่อที่สร้างไปยังท่อต้นแบบ
                                    const distStartToTemplate = pointToPolylineDistance(
                                        start,
                                        template.coordinates || []
                                    );
                                    const distEndToTemplate = pointToPolylineDistance(
                                        end,
                                        template.coordinates || []
                                    );
                                    const minDistToTemplate = Math.min(
                                        distToTemplate,
                                        distStartToTemplate,
                                        distEndToTemplate
                                    );

                                    if (minDistToTemplate >= templateGapM) {
                                        // ใกล้ท่อต้นแบบเกินไป ไม่สร้างซ้ำแนวเดียวกัน
                                        const overlapsGenerated = generated.some(
                                            (g) =>
                                                pointToPolylineDistance(mid, g.coordinates || []) <
                                                minGapM
                                        );
                                        let overlapsExisting = false;
                                        if (!overlapsGenerated) {
                                            for (const p of already) {
                                                if (!p.coordinates || p.coordinates.length < 2)
                                                    continue;
                                                for (let i = 0; i < p.coordinates.length - 1; i++) {
                                                    const { distance } = getClosestPointOnSegment(
                                                        mid,
                                                        p.coordinates[i],
                                                        p.coordinates[i + 1]
                                                    );
                                                    if (distance < minGapM) {
                                                        overlapsExisting = true;
                                                        break;
                                                    }
                                                }
                                                if (overlapsExisting) break;
                                            }
                                        }
                                        const lengthM = calculateDistance([start, end]);
                                        if (
                                            lengthM >= 2 &&
                                            !overlapsGenerated &&
                                            !overlapsExisting
                                        ) {
                                            generated.push({
                                                id: `lateral-row-${Date.now()}-${generated.length}-left`,
                                                type: 'lateral',
                                                coordinates: [start, end],
                                                length: lengthM,
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // สร้างจุดเชื่อมต่อสำหรับท่อย่อยที่สร้างขึ้นจะถูกจัดการใน useEffect

            return generated;
        },
        [
            fieldData.zones,
            fieldData.irrigationPositions,
            pipeManager.pipes,
            pipeManager.lateralMode,
            analyzeTemplatePattern,
        ]
    );

    const clearPipes = useCallback(
        (type?: PipeType) => {
            if (type) {
                pipeManager.setPipes((prev) => prev.filter((p) => p.type !== type));
            } else {
                pipeManager.setPipes([], { resetHistory: true });
            }
            // ไม่ต้องเรียก mapManager.clearPipeOverlays โดยตรง เพราะ useEffect จะจัดการเอง
            if (!type || type === 'lateral') {
                setLateralReference(null);
                // ลบจุดเชื่อมต่อเมื่อลบท่อย่อยจะถูกจัดการใน useEffect
            }
            if (mapManager.drawingManagerRef.current) {
                mapManager.drawingManagerRef.current.setDrawingMode(null);
            }
            pipeManager.setIsDrawing(false);
            pipeManager.resetDrawingState();
        },
        [pipeManager, mapManager]
    );

    // Extracted from inline JSX to avoid complex nested braces causing TSX parsing issues
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleAcceptAsReference = useCallback(
        (pipeId: string) => {
            const p = pipeManager.pipes.find((pp) => pp.id === pipeId);
            if (!p || !p.coordinates) return;
            const connectedPoints = pipeManager.findNearbyConnectedIrrigationPoints(
                p.coordinates,
                fieldData.irrigationPositions
            );
            const totalFlow = pipeManager.calculateTotalFlowRate(
                connectedPoints,
                fieldData.irrigationSettings
            );
            const newThreshold = p.length || calculateDistance(p.coordinates);
            if (confirm(t('Use this lateral as new reference?'))) {
                setLateralReference({ pipeId, length: newThreshold, flowLpm: totalFlow });
            }
        },
        [fieldData.irrigationSettings, fieldData.irrigationPositions, pipeManager, t]
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleSelectWarningPipe = useCallback(
        (pipeId: string, e?: React.MouseEvent) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            const p = pipeManager.pipes.find((pp) => pp.id === pipeId);
            if (!p || !p.coordinates || p.coordinates.length < 2) return;
            // retrigger highlight if same pipe clicked consecutively
            if (pipeManager.editingPipeId === pipeId) {
                pipeManager.setEditingPipeId(null);
                setTimeout(() => pipeManager.setEditingPipeId(pipeId), 0);
            } else {
                pipeManager.setEditingPipeId(pipeId);
            }
            try {
                mapManager.fitBounds(p.coordinates);
            } catch (err) {
                console.warn('fitBounds failed for pipe', pipeId, err);
            }
            // Do not change reference lateral automatically on selection
        },
        [pipeManager, mapManager]
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleMapClick = useCallback(
        (e: google.maps.MapMouseEvent) => {
            if (isPlacingPumpRef.current && e.latLng) {
                setPumps((prev) => {
                    const newPump: Pump = {
                        id: `pump-${Date.now()}`,
                        lat: e.latLng!.lat(),
                        lng: e.latLng!.lng(),
                        type: 'water_pump',
                        name: `Water Pump ${prev.length + 1}`,
                        capacity: 5000,
                    };
                    return [...prev, newPump];
                });
                setIsPlacingPump(false);
            } else if (!pipeManager.isDrawing) {
                pipeManager.setEditingPipeId(null);
            }
        },
        [pipeManager]
    );

    // ======================= MODIFIED SECTION START =======================
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleMapLoad = useCallback(
        (loadedMap: google.maps.Map) => {
            mapManager.mapRef.current = loadedMap;

            loadedMap.addListener('zoom_changed', () => {
                if (zoomDebounceTimer.current) {
                    clearTimeout(zoomDebounceTimer.current);
                }
                zoomDebounceTimer.current = setTimeout(() => {
                    const newZoom = loadedMap.getZoom() || 16;
                    setMapStatus((prev) => ({ ...prev, zoom: newZoom }));
                }, 150); // 150ms delay
            });

            loadedMap.addListener('center_changed', () => {
                if (centerDebounceTimer.current) {
                    clearTimeout(centerDebounceTimer.current);
                }
                centerDebounceTimer.current = setTimeout(() => {
                    const center = loadedMap.getCenter();
                    if (center) {
                        setMapStatus((prev) => ({
                            ...prev,
                            center: { lat: center.lat(), lng: center.lng() },
                        }));
                    }
                }, 150); // 150ms delay
            });

            loadedMap.addListener('click', handleMapClick);

            if (fieldData.mainArea.length >= 3) {
                mapManager.fitBounds(fieldData.mainArea);
            }

            // Initial draw
            mapManager.updateMapVisuals(fieldData);

            // Ensure pipes are drawn on first map load with currently loaded state
            try {
                mapManager.drawPipes(pipeManager.pipes, pipeManager.editingPipeId, (pipeId) =>
                    pipeManager.setEditingPipeId(pipeId)
                );
            } catch (err) {
                console.warn('drawPipes on initial map load failed:', err);
            }
        },
        [fieldData, mapManager, handleMapClick, pipeManager]
    );
    // ======================== MODIFIED SECTION END ========================

    const steps = [
        { id: 1, key: 'initial-area', title: t('Initial Area'), route: '/step1-field-area' },
        {
            id: 2,
            key: 'irrigation-generate',
            title: t('Irrigation Generate'),
            route: '/step2-irrigation-system',
        },
        { id: 3, key: 'zone-obstacle', title: t('Zone Obstacle'), route: '/step3-zones-obstacles' },
        { id: 4, key: 'pipe-generate', title: t('Pipe Generate'), route: '/step4-pipe-system' },
    ];

    const handleBack = useCallback(() => {
        // บันทึกข้อมูลทั้งหมดรวมถึง pipes ที่วาดไว้ และคงค่า zones จาก storage หากมี
        const stored = loadFromStorage();
        const equipmentFromPumps = (pumps || []).map((p, idx) => ({
            id: p.id ?? `pump-${idx}`,
            type: 'pump',
            lat: p.lat,
            lng: p.lng,
            name: p.name ?? `Water Pump ${idx + 1}`,
        }));
        const allData = {
            ...fieldData,
            // รับประกันว่า zones ถูกเก็บก่อนกลับไปหน้าโซน
            zones:
                stored && Array.isArray(stored.zones)
                    ? (stored.zones as unknown as Zone[])
                    : fieldData.zones,
            pipes: pipeManager.pipes,
            equipment: equipmentFromPumps,
            equipmentIcons: equipmentFromPumps,
            mapCenter: mapStatus.center,
            mapZoom: mapStatus.zoom,
        };
        saveToStorage(allData);

        const params = {
            crops: fieldData.selectedCrops.join(','),
            currentStep: 3,
            completedSteps: toCompletedStepsCsv(parseCompletedSteps(props.completedSteps)),
        };
        router.get('/step3-zones-obstacles', params);
    }, [
        fieldData,
        pipeManager.pipes,
        mapStatus,
        props.completedSteps,
        saveToStorage,
        loadFromStorage,
        pumps,
    ]);

    const handleContinue = useCallback(() => {
        // Prepare a rich dataset and store to localStorage for the summary page
        try {
            const equipmentFromPumps = (pumps || []).map((p, idx) => ({
                id: p.id ?? `pump-${idx}`,
                type: 'pump',
                lat: p.lat,
                lng: p.lng,
                name: p.name ?? `Water Pump ${idx + 1}`,
            }));
            const fieldMapData = {
                mainField:
                    fieldData.mainArea && fieldData.mainArea.length > 0
                        ? { coordinates: fieldData.mainArea }
                        : undefined,
                fieldAreaSize:
                    typeof fieldData.areaRai === 'number' ? fieldData.areaRai * 1600 : undefined,
                selectedCrops: fieldData.selectedCrops,
                zones: fieldData.zones,
                obstacles: fieldData.obstacles,
                pipes: pipeManager.pipes,
                equipment: equipmentFromPumps,
                equipmentIcons: equipmentFromPumps,
                irrigationPoints:
                    fieldData.irrigationPositions?.sprinklers?.map((s, i) => ({
                        id: `sprinkler-${i}`,
                        lat: s.lat,
                        lng: s.lng,
                        type: 'sprinkler',
                    })) || [],
                irrigationLines: [],
                irrigationSettings: fieldData.irrigationSettings || {},
                rowSpacing: fieldData.rowSpacing || {},
                plantSpacing: fieldData.plantSpacing || {},
                mapCenter: fieldData.mapCenter
                    ? ([fieldData.mapCenter.lat, fieldData.mapCenter.lng] as [number, number])
                    : undefined,
                mapZoom: fieldData.mapZoom,
            };
            localStorage.setItem('fieldMapData', JSON.stringify(fieldMapData));
            // Persist unified fieldCropData with equipment to support summary fallback
            const existing = localStorage.getItem('fieldCropData');
            const base = existing ? JSON.parse(existing) : {};
            localStorage.setItem(
                'fieldCropData',
                JSON.stringify({
                    ...base,
                    equipment: equipmentFromPumps,
                    equipmentIcons: equipmentFromPumps,
                    pipes: pipeManager.pipes,
                })
            );
        } catch (e) {
            console.warn('Failed to persist fieldMapData to localStorage', e);
        }

        // Build a safe POST payload (JSON-encode complex structures)
        const payload: Record<string, string | number | boolean | string[] | null | undefined> = {
            summary: undefined,
            mainField: JSON.stringify(
                fieldData.mainArea && fieldData.mainArea.length > 0
                    ? { coordinates: fieldData.mainArea }
                    : null
            ),
            fieldAreaSize:
                typeof fieldData.areaRai === 'number'
                    ? Math.round(fieldData.areaRai * 1600)
                    : undefined,
            selectedCrops: fieldData.selectedCrops,
            zones: JSON.stringify(fieldData.zones || []),
            zoneAssignments: undefined,
            zoneSummaries: undefined,
            pipes: JSON.stringify(pipeManager.pipes || []),
            obstacles: JSON.stringify(fieldData.obstacles || []),
            equipment: JSON.stringify(
                (pumps || []).map((p, idx) => ({
                    id: p.id ?? `pump-${idx}`,
                    type: 'pump',
                    lat: p.lat,
                    lng: p.lng,
                    name: p.name ?? `Water Pump ${idx + 1}`,
                }))
            ),
            equipmentIcons: JSON.stringify(
                (pumps || []).map((p, idx) => ({
                    id: p.id ?? `pump-${idx}`,
                    type: 'pump',
                    lat: p.lat,
                    lng: p.lng,
                    name: p.name ?? `Water Pump ${idx + 1}`,
                }))
            ),
            irrigationPoints: JSON.stringify(
                fieldData.irrigationPositions?.sprinklers?.map((s, i) => ({
                    id: `sprinkler-${i}`,
                    lat: s.lat,
                    lng: s.lng,
                    type: 'sprinkler',
                })) || []
            ),
            irrigationLines: JSON.stringify([]),
            irrigationAssignments: undefined,
            irrigationSettings: JSON.stringify(fieldData.irrigationSettings || {}),
            rowSpacing: JSON.stringify(fieldData.rowSpacing || {}),
            plantSpacing: JSON.stringify(fieldData.plantSpacing || {}),
            mapCenter: JSON.stringify(
                fieldData.mapCenter ? [fieldData.mapCenter.lat, fieldData.mapCenter.lng] : null
            ),
            mapZoom: fieldData.mapZoom,
            mapType: undefined,
            currentStep: 5,
            completedSteps: toCompletedStepsCsv([...parseCompletedSteps(props.completedSteps), 4]),
        };
        router.post('/field-crop-summary', payload);
    }, [fieldData, pipeManager.pipes, props.completedSteps, pumps]);

    const startPumpPlacement = useCallback(() => {
        if (pipeManager.isDrawing) {
            stopDrawing();
        }
        if (mapManager.drawingManagerRef.current) {
            mapManager.drawingManagerRef.current.setDrawingMode(null);
            mapManager.drawingManagerRef.current.setMap(null);
            mapManager.drawingManagerRef.current = null;
        }
        setIsPlacingPump(true);
    }, [pipeManager.isDrawing, stopDrawing, mapManager]);

    const removePump = useCallback((pumpId: string) => {
        setPumps((prev) => prev.filter((pump) => pump.id !== pumpId));
    }, []);

    const removeAllPumps = useCallback(() => {
        setPumps([]);
    }, []);

    useEffect(() => {
        mapManager.drawPumps(pumps, removePump);
    }, [pumps, removePump, mapManager]); // Removed mapManager from dependencies

    // Persist pumps to localStorage so summary page can read them
    useEffect(() => {
        try {
            const existing = localStorage.getItem('fieldCropData');
            const base = existing ? JSON.parse(existing) : {};
            const equipmentFromPumps = (pumps || []).map((p, idx) => ({
                id: p.id ?? `pump-${idx}`,
                type: 'pump',
                lat: p.lat,
                lng: p.lng,
                name: p.name ?? `Water Pump ${idx + 1}`,
            }));
            localStorage.setItem(
                'fieldCropData',
                JSON.stringify({
                    ...base,
                    equipment: equipmentFromPumps,
                    equipmentIcons: equipmentFromPumps,
                })
            );
        } catch {
            // ignore persistence errors
        }
    }, [pumps]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleStepClick = useCallback(
        (step: (typeof steps)[0]) => {
            const params = {
                crops: fieldData.selectedCrops.join(','),
                currentStep: step.id,
                completedSteps: toCompletedStepsCsv(parseCompletedSteps(props.completedSteps)),
            };
            router.get(step.route, params);
        },
        [fieldData.selectedCrops, props.completedSteps]
    );

    return (
        <>
            <Head title={t('Pipe Generate')} />
            {/* JSX Part */}
            {/* ส่วน JSX ทั้งหมดเหมือนเดิมทุกประการ */}
            <div
                className="min-h-screen overflow-hidden text-white"
                style={{ backgroundColor: '#000005' }}
            >
                <Navbar />

                <div className="h-[calc(100vh-4rem)] overflow-hidden">
                    <div className="flex h-full">
                        <div
                            className="flex w-80 flex-col border-r border-white"
                            style={{ backgroundColor: '#000005' }}
                        >
                            <div className="border-b border-white p-4">
                                <button
                                    onClick={handleBack}
                                    className="mb-3 flex items-center text-sm text-blue-400 hover:text-blue-300"
                                >
                                    <svg
                                        className="mr-2 h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 19l-7-7 7-7"
                                        />
                                    </svg>
                                    {t('Back to Zone Obstacle')}
                                </button>

                                <div className="mb-3">
                                    <h1 className="text-lg font-bold text-white">
                                        {
                                            steps.find((s) => s.id === (props.currentStep || 4))
                                                ?.title
                                        }
                                    </h1>
                                </div>

                                <div className="mb-4 flex items-center justify-between">
                                    {steps.map((step, index) => {
                                        const isActive = step.id === (props.currentStep || 4);
                                        const isCompleted =
                                            parseCompletedSteps(props.completedSteps).includes(
                                                step.id
                                            ) ||
                                            Math.max(
                                                0,
                                                ...parseCompletedSteps(props.completedSteps)
                                            ) >= step.id;

                                        return (
                                            <div key={step.id} className="flex items-center">
                                                <button
                                                    onClick={() => handleStepClick(step)}
                                                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                                                        isCompleted
                                                            ? 'cursor-pointer bg-green-600 text-white hover:bg-green-500'
                                                            : isActive
                                                              ? 'cursor-not-allowed bg-blue-600 text-white'
                                                              : 'cursor-pointer bg-gray-600 text-white hover:bg-gray-500'
                                                    }`}
                                                >
                                                    {isCompleted ? (
                                                        <svg
                                                            className="h-3 w-3"
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                    ) : (
                                                        step.id
                                                    )}
                                                </button>

                                                {index < steps.length - 1 && (
                                                    <div
                                                        className={`mx-2 h-0.5 w-8 ${
                                                            isCompleted
                                                                ? 'bg-green-600'
                                                                : 'bg-gray-600'
                                                        }`}
                                                    ></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <div className="space-y-6 p-4" style={{ willChange: 'auto' }}>
                                    {fieldData.selectedCrops.length > 0 && (
                                        <div
                                            className="rounded-lg border border-white p-4"
                                            style={{ backgroundColor: '#000005' }}
                                        >
                                            <h3 className="mb-3 text-sm font-semibold text-white">
                                                {t('Selected Crops')}
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {fieldData.selectedCrops.map((crop, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="rounded border border-white bg-blue-600 px-2 py-1 text-xs text-white"
                                                    >
                                                        {crop}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {fieldData.mainArea.length > 0 && (
                                        <div
                                            className="rounded-lg border border-white p-4"
                                            style={{ backgroundColor: '#000005' }}
                                        >
                                            <h3 className="mb-3 text-sm font-semibold text-white">
                                                📊 {t('Field Information')}
                                            </h3>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between text-gray-400">
                                                    <span>{t('Total Area')}:</span>
                                                    <span className="text-green-400">
                                                        {fieldData.areaRai !== null
                                                            ? fieldData.areaRai.toFixed(2)
                                                            : '--'}{' '}
                                                        {t('rai')}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-gray-400">
                                                    <span>{t('Perimeter')}:</span>
                                                    <span className="text-green-400">
                                                        {fieldData.perimeterMeters !== null
                                                            ? fieldData.perimeterMeters.toFixed(1)
                                                            : '--'}{' '}
                                                        {t('meters')}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-gray-400">
                                                    <span>{t('Plant Points')}:</span>
                                                    <span className="text-green-400">
                                                        {fieldData.plantPoints.length} {t('points')}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-gray-400">
                                                    <span>{t('Zones')}:</span>
                                                    <span className="text-green-400">
                                                        {fieldData.zones.length} {t('zones')}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-gray-400">
                                                    <span>{t('Obstacles')}:</span>
                                                    <span className="text-green-400">
                                                        {fieldData.obstacles.length} {t('items')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {fieldData.selectedIrrigationType && (
                                        <div
                                            className="rounded-lg border border-white p-4"
                                            style={{ backgroundColor: '#000005' }}
                                        >
                                            <h3 className="mb-3 text-sm font-semibold text-white">
                                                💧 {t('Irrigation Information')}
                                            </h3>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between text-gray-400">
                                                    <span>{t('Irrigation Type')}:</span>
                                                    <span className="text-blue-400">
                                                        {fieldData.selectedIrrigationType.replace(
                                                            '_',
                                                            ' '
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-gray-400">
                                                    <span>{t('Total Water Requirement')}:</span>
                                                    <span className="text-blue-400">
                                                        {fieldData.totalWaterRequirement.toFixed(1)}{' '}
                                                        ลิตร/ครั้ง
                                                    </span>
                                                </div>

                                                <div className="mt-2 border-t border-gray-600 pt-2">
                                                    <div className="mb-2 text-xs font-semibold text-blue-300">
                                                        {t('Equipment on Map')}:
                                                    </div>
                                                    <div className="mb-2 text-xs text-green-400">
                                                        🎯 {t('Total connection points')}:{' '}
                                                        {fieldData.irrigationPositions.sprinklers
                                                            .length +
                                                            fieldData.irrigationPositions.pivots
                                                                .length +
                                                            fieldData.irrigationPositions.dripTapes
                                                                .length +
                                                            fieldData.irrigationPositions.waterJets
                                                                .length}
                                                    </div>
                                                    {fieldData.irrigationPositions.sprinklers
                                                        .length > 0 && (
                                                        <div className="flex justify-between text-gray-400">
                                                            <span>🌊 {t('Sprinklers')}:</span>
                                                            <span className="text-blue-400">
                                                                {
                                                                    fieldData.irrigationPositions
                                                                        .sprinklers.length
                                                                }{' '}
                                                                {t('units')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {fieldData.irrigationPositions.sprinklers
                                                        .length > 0 && (
                                                        <div className="mt-1 flex justify-between text-gray-400">
                                                            <span>
                                                                💧 {t('Total Sprinkler Flow')}:
                                                            </span>
                                                            <span className="text-blue-400">
                                                                {(() => {
                                                                    const flowCfg = fieldData
                                                                        .irrigationSettings
                                                                        ?.sprinkler_system as
                                                                        | { flow?: number }
                                                                        | undefined;
                                                                    const perSprinkler =
                                                                        typeof flowCfg?.flow ===
                                                                        'number'
                                                                            ? flowCfg.flow
                                                                            : 10;
                                                                    const total =
                                                                        fieldData
                                                                            .irrigationPositions
                                                                            .sprinklers.length *
                                                                        perSprinkler;
                                                                    return total.toFixed(0);
                                                                })()}{' '}
                                                                L/min
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div
                                        className="rounded-lg border border-white p-4"
                                        style={{ backgroundColor: '#000005' }}
                                    >
                                        <h3 className="mb-3 text-sm font-semibold text-white">
                                            🔧 {t('Pipe Generation')}
                                        </h3>

                                        {/* Distance Meter Display */}
                                        {pipeManager.isDrawing && (
                                            <div className="mb-4 rounded-lg border border-blue-600/30 bg-blue-600/20 p-3">
                                                <div className="text-center">
                                                    <div className="text-lg font-bold text-blue-400">
                                                        📏{' '}
                                                        {pipeManager.drawingState.currentDistance.toFixed(
                                                            1
                                                        )}
                                                        m
                                                    </div>
                                                    <div className="text-xs text-blue-300">
                                                        {t('Current Pipe Length')}
                                                    </div>

                                                    {/* แสดงข้อมูลอุปกรณ์ให้น้ำและอัตราการไหลสำหรับ lateral */}
                                                    {pipeManager.selectedType === 'lateral' && (
                                                        <div className="mt-2 space-y-1">
                                                            <div className="text-sm font-bold text-purple-400">
                                                                💧{' '}
                                                                {pipeManager.drawingState
                                                                    .currentFlowRate || 0}{' '}
                                                                L/min
                                                            </div>
                                                            <div className="text-xs text-purple-300">
                                                                {t('Current Flow Rate')}
                                                            </div>
                                                            <div className="text-xs text-purple-200">
                                                                🔗{' '}
                                                                {pipeManager.drawingState
                                                                    .connectedSprinklers?.length ||
                                                                    0}{' '}
                                                                {t('Equipment Connected')}
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                {t(
                                                                    'Includes sprinklers, pivots, drip tapes, and water jets'
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {pipeManager.drawingState.startPoint &&
                                                        pipeManager.drawingState.currentPoint && (
                                                            <div className="mt-1 text-xs text-blue-200">
                                                                📍 {t('Start')}: (
                                                                {pipeManager.drawingState.startPoint.lat.toFixed(
                                                                    4
                                                                )}
                                                                ,{' '}
                                                                {pipeManager.drawingState.startPoint.lng.toFixed(
                                                                    4
                                                                )}
                                                                )
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            {/* Main Pipe Section with Curve Options */}
                                            <div className="space-y-2">
                                                <div className="mb-2 text-xs font-semibold text-red-400">
                                                    🔴 {t('Main Pipe')} - {t('Curved Drawing')}
                                                </div>

                                                {/* Curve Type Selection */}
                                                <div className="mb-2 grid grid-cols-3 gap-1">
                                                    <button
                                                        onClick={() =>
                                                            pipeManager.setSelectedCurveType(
                                                                'straight'
                                                            )
                                                        }
                                                        className={`rounded border px-2 py-1 text-xs transition-colors ${
                                                            pipeManager.selectedCurveType ===
                                                            'straight'
                                                                ? 'border-gray-500 bg-gray-600 text-white'
                                                                : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                        }`}
                                                    >
                                                        📏 {t('Straight')}
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            pipeManager.setSelectedCurveType(
                                                                'bezier'
                                                            )
                                                        }
                                                        className={`rounded border px-2 py-1 text-xs transition-colors ${
                                                            pipeManager.selectedCurveType ===
                                                            'bezier'
                                                                ? 'border-blue-500 bg-blue-600 text-white'
                                                                : 'border-blue-600 bg-blue-700 text-blue-300 hover:bg-blue-600'
                                                        }`}
                                                    >
                                                        🎯 {t('Bezier')}
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            pipeManager.setSelectedCurveType(
                                                                'spline'
                                                            )
                                                        }
                                                        className={`rounded border px-2 py-1 text-xs transition-colors ${
                                                            pipeManager.selectedCurveType ===
                                                            'spline'
                                                                ? 'border-green-500 bg-green-600 text-white'
                                                                : 'border-green-600 bg-green-700 text-green-300 hover:bg-green-600'
                                                        }`}
                                                    >
                                                        🌊 {t('Spline')}
                                                    </button>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            startDrawing(
                                                                'main',
                                                                pipeManager.selectedCurveType
                                                            );
                                                        }}
                                                        className={`flex flex-1 items-center justify-center rounded border border-white px-3 py-2 text-xs text-white transition-colors ${
                                                            pipeManager.isDrawing &&
                                                            pipeManager.selectedType === 'main'
                                                                ? 'cursor-not-allowed bg-red-700'
                                                                : 'cursor-pointer bg-red-600 hover:bg-red-700'
                                                        }`}
                                                        disabled={
                                                            pipeManager.isDrawing &&
                                                            pipeManager.selectedType !== 'main'
                                                        }
                                                    >
                                                        <span className="mr-2">🔴</span>
                                                        {pipeManager.isDrawing &&
                                                        pipeManager.selectedType === 'main'
                                                            ? `${t('Drawing')} ${t('Main Pipe')} (${pipeManager.selectedCurveType})...`
                                                            : `${t('Draw')} ${t('Main Pipe')} (${pipeManager.selectedCurveType})`}
                                                    </button>
                                                    <button
                                                        onClick={() => clearPipes('main')}
                                                        className="flex items-center justify-center rounded border border-white bg-red-600/80 px-2 py-2 text-xs text-white transition-colors hover:bg-red-600"
                                                        title={t('Clear Main Pipes')}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>

                                                {/* Curve Type Info */}
                                                {pipeManager.selectedCurveType !== 'straight' && (
                                                    <div className="rounded border border-gray-700 bg-gray-800/50 p-2 text-xs text-gray-400">
                                                        {pipeManager.selectedCurveType ===
                                                            'bezier' && (
                                                            <div>
                                                                <strong>
                                                                    🎯 {t('Bezier Curve')}:
                                                                </strong>{' '}
                                                                {t(
                                                                    'Click 3 points: start, control, end'
                                                                )}
                                                            </div>
                                                        )}
                                                        {pipeManager.selectedCurveType ===
                                                            'spline' && (
                                                            <div>
                                                                <strong>
                                                                    🌊 {t('Spline Curve')}:
                                                                </strong>{' '}
                                                                {t(
                                                                    'Click multiple points for smooth curve'
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => {
                                                        startDrawing('submain');
                                                    }}
                                                    className={`flex flex-1 items-center justify-center rounded border border-white px-3 py-2 text-xs text-white transition-colors ${
                                                        pipeManager.isDrawing &&
                                                        pipeManager.selectedType === 'submain'
                                                            ? 'cursor-not-allowed bg-purple-700'
                                                            : 'cursor-pointer bg-purple-600 hover:bg-purple-700'
                                                    }`}
                                                    disabled={
                                                        pipeManager.isDrawing &&
                                                        pipeManager.selectedType !== 'submain'
                                                    }
                                                >
                                                    <span className="mr-2">🟣</span>
                                                    {pipeManager.isDrawing &&
                                                    pipeManager.selectedType === 'submain'
                                                        ? t('Drawing Submain Pipe...')
                                                        : t('Draw Submain Pipe')}
                                                </button>
                                                <button
                                                    onClick={() => clearPipes('submain')}
                                                    className="flex items-center justify-center rounded border border-white bg-purple-600/80 px-2 py-2 text-xs text-white transition-colors hover:bg-purple-600"
                                                    title={t('Clear Submain Pipes')}
                                                >
                                                    🗑️
                                                </button>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => {
                                                        startDrawing('lateral');
                                                    }}
                                                    className={`flex flex-1 items-center justify-center rounded border border-white px-3 py-2 text-xs text-white transition-colors ${
                                                        pipeManager.isDrawing &&
                                                        pipeManager.selectedType === 'lateral'
                                                            ? 'cursor-not-allowed bg-green-700'
                                                            : 'cursor-pointer bg-green-600 hover:bg-green-700'
                                                    }`}
                                                    disabled={
                                                        pipeManager.isDrawing &&
                                                        pipeManager.selectedType !== 'lateral'
                                                    }
                                                >
                                                    <span className="mr-2">🟢</span>
                                                    {pipeManager.isDrawing &&
                                                    pipeManager.selectedType === 'lateral'
                                                        ? t('Drawing Lateral Pipe...')
                                                        : t('Draw Lateral Pipe')}
                                                </button>
                                                <button
                                                    onClick={() => clearPipes('lateral')}
                                                    className="flex items-center justify-center rounded border border-white bg-green-600/80 px-2 py-2 text-xs text-white transition-colors hover:bg-green-600"
                                                    title={t('Clear Lateral Pipes')}
                                                >
                                                    🗑️
                                                </button>
                                            </div>

                                            {/* Lateral mode toggle */}
                                            <div className="mt-2 flex items-center space-x-2">
                                                <span className="text-xs text-gray-300">
                                                    {t('Lateral Mode')}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        pipeManager.setLateralMode('inRow')
                                                    }
                                                    className={`rounded border px-2 py-1 text-xs transition-colors ${
                                                        pipeManager.lateralMode === 'inRow'
                                                            ? 'border-green-500 bg-green-600 text-white'
                                                            : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                    }`}
                                                >
                                                    {t('ภายในแถว')}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        pipeManager.setLateralMode('betweenRows')
                                                    }
                                                    className={`rounded border px-2 py-1 text-xs transition-colors ${
                                                        pipeManager.lateralMode === 'betweenRows'
                                                            ? 'border-green-500 bg-green-600 text-white'
                                                            : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                    }`}
                                                >
                                                    {t('ระหว่างแถว')}
                                                </button>
                                            </div>

                                            {pipeManager.isDrawing && (
                                                <button
                                                    onClick={stopDrawing}
                                                    className="flex w-full items-center justify-center rounded border border-white bg-gray-600 px-3 py-2 text-xs text-white transition-colors hover:bg-gray-700"
                                                >
                                                    <span className="mr-2">⏹️</span>
                                                    {t('Stop Drawing')}
                                                </button>
                                            )}

                                            <button
                                                onClick={() => clearPipes()}
                                                className="flex w-full items-center justify-center rounded border border-white bg-gray-600 px-3 py-2 text-xs text-white transition-colors hover:bg-gray-700"
                                                disabled={pipeManager.isDrawing}
                                            >
                                                <span className="mr-2">🗑️</span>
                                                {t('Clear All Pipes')}
                                            </button>
                                        </div>
                                    </div>

                                    <div
                                        className="rounded-lg border border-white p-4"
                                        style={{ backgroundColor: '#000005' }}
                                    >
                                        <h3 className="mb-3 text-sm font-semibold text-white">
                                            🎯 {t('Snap Settings')}
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-300">
                                                    {t('Snap Mode')}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        snapSystem.setIsEnabled(
                                                            !snapSystem.isEnabled
                                                        )
                                                    }
                                                    className={`rounded border px-3 py-1 text-xs transition-colors ${
                                                        snapSystem.isEnabled
                                                            ? 'border-green-500 bg-green-600 text-white'
                                                            : 'border-gray-500 bg-gray-600 text-gray-300'
                                                    }`}
                                                >
                                                    {snapSystem.isEnabled
                                                        ? t('Enabled')
                                                        : t('Disabled')}
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-300">
                                                    {t('Snap Distance')}:{' '}
                                                    {Math.min(Math.max(snapSystem.distance, 1), 5)}m
                                                </label>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="5"
                                                    value={Math.min(
                                                        Math.max(snapSystem.distance, 1),
                                                        5
                                                    )}
                                                    onChange={(e) =>
                                                        snapSystem.setDistance(
                                                            Math.min(
                                                                Math.max(
                                                                    parseInt(e.target.value),
                                                                    1
                                                                ),
                                                                5
                                                            )
                                                        )
                                                    }
                                                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="rounded-lg border border-white p-4"
                                        style={{ backgroundColor: '#000005' }}
                                    >
                                        <h3 className="mb-3 text-sm font-semibold text-white">
                                            ⚙️ {t('Pump Management')}
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="mb-2 text-xs text-gray-300">
                                                {t('Placed Pumps')}: {pumps.length}
                                            </div>

                                            {pumps.length > 0 && (
                                                <div className="max-h-32 space-y-2 overflow-y-auto">
                                                    {pumps.map((pump) => (
                                                        <div
                                                            key={pump.id}
                                                            className="flex items-center justify-between rounded border border-orange-600/30 bg-orange-600/10 p-2 text-xs"
                                                        >
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-orange-400">
                                                                    ⚙️
                                                                </span>
                                                                <div>
                                                                    <div className="font-semibold text-gray-300">
                                                                        {pump.name}
                                                                    </div>
                                                                    <div className="text-gray-400">
                                                                        {pump.capacity} L/h
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => removePump(pump.id)}
                                                                className="text-xs text-red-400 hover:text-red-300"
                                                                title={t('Remove Pump')}
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {pumps.length > 0 && (
                                                <button
                                                    onClick={removeAllPumps}
                                                    className="flex w-full items-center justify-center rounded border border-white bg-red-600 px-3 py-2 text-xs text-white transition-colors hover:bg-red-700"
                                                >
                                                    <span className="mr-2">🗑️</span>
                                                    {t('Remove All Pumps')}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div
                                        className="rounded-lg border border-white p-4"
                                        style={{ backgroundColor: '#000005' }}
                                    >
                                        <h3 className="mb-3 text-sm font-semibold text-white">
                                            📈 {t('Pipe Summary')}
                                        </h3>
                                        <div className="mb-3 grid grid-cols-2 gap-3 text-center">
                                            <div className="rounded border border-red-600/30 bg-red-600/20 p-2">
                                                <div className="text-sm font-bold text-red-400">
                                                    {pipeManager.getPipeCount('main')}
                                                </div>
                                                <div className="text-xs text-gray-300">
                                                    {t('Main')}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {pipeManager.getTotalLength('main')}m
                                                </div>
                                            </div>
                                            <div className="rounded border border-purple-600/30 bg-purple-600/20 p-2">
                                                <div className="text-sm font-bold text-purple-400">
                                                    {pipeManager.getPipeCount('submain')}
                                                </div>
                                                <div className="text-xs text-gray-300">
                                                    {t('Submain')}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {pipeManager.getTotalLength('submain')}m
                                                </div>
                                            </div>
                                            <div className="rounded border border-green-600/30 bg-green-600/20 p-2">
                                                <div className="text-sm font-bold text-green-400">
                                                    {pipeManager.getPipeCount('lateral')}
                                                </div>
                                                <div className="text-xs text-gray-300">
                                                    {t('Lateral')}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {pipeManager.getTotalLength('lateral')}m
                                                </div>
                                            </div>
                                            <div className="rounded border border-gray-600/30 bg-gray-600/20 p-2">
                                                <div className="text-sm font-bold text-gray-400">
                                                    {pipeManager.getPipeCount()}
                                                </div>
                                                <div className="text-xs text-gray-300">
                                                    {t('Total')}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {pipeManager.getTotalLength()}m
                                                </div>
                                            </div>
                                        </div>

                                        {pipeManager.pipes.length > 0 && (
                                            <div className="mt-3">
                                                <div className="mb-2 text-xs font-semibold text-gray-300">
                                                    {t('Drawn Pipes')}:
                                                </div>
                                                <div className="max-h-32 space-y-1 overflow-y-auto">
                                                    {pipeManager.pipes
                                                        .slice()
                                                        .reverse()
                                                        .map((pipe, index) => {
                                                            const config = getPipeConfig(pipe.type);
                                                            const isEditing =
                                                                pipeManager.editingPipeId ===
                                                                pipe.id;
                                                            return (
                                                                <div
                                                                    key={pipe.id}
                                                                    className="flex items-center justify-between rounded border p-1 text-xs"
                                                                    style={{
                                                                        borderColor: isEditing
                                                                            ? '#ff6b35'
                                                                            : config.color + '40',
                                                                        backgroundColor: isEditing
                                                                            ? '#ff6b35' + '20'
                                                                            : config.color + '10',
                                                                    }}
                                                                >
                                                                    <div className="flex items-center space-x-2">
                                                                        <div
                                                                            className="h-1 w-3 rounded"
                                                                            style={{
                                                                                backgroundColor:
                                                                                    config.color,
                                                                            }}
                                                                        ></div>
                                                                        <span className="text-gray-300">
                                                                            {pipe.type} #{index + 1}
                                                                        </span>
                                                                        {pipe.curveType &&
                                                                            pipe.curveType !==
                                                                                'straight' && (
                                                                                <span className="rounded bg-gray-700 px-1 py-0.5 text-xs text-gray-300">
                                                                                    {pipe.curveType ===
                                                                                    'bezier'
                                                                                        ? '🎯'
                                                                                        : '🌊'}
                                                                                </span>
                                                                            )}
                                                                        {isEditing && (
                                                                            <span className="rounded bg-orange-600 px-1 py-0.5 text-xs text-white">
                                                                                ✏️
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center space-x-1">
                                                                        <span className="text-gray-400">
                                                                            {pipe.length
                                                                                ? `${pipe.length}m`
                                                                                : '--'}
                                                                        </span>
                                                                        {(pipe.curveType ===
                                                                            'bezier' ||
                                                                            pipe.curveType ===
                                                                                'spline') && (
                                                                            <button
                                                                                onClick={() =>
                                                                                    pipeManager.setEditingPipeId(
                                                                                        isEditing
                                                                                            ? null
                                                                                            : pipe.id
                                                                                    )
                                                                                }
                                                                                className={`rounded px-1 py-0.5 text-xs transition-colors ${
                                                                                    isEditing
                                                                                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                                                                                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                                                                }`}
                                                                                title={
                                                                                    isEditing
                                                                                        ? t(
                                                                                              'Done Editing'
                                                                                          )
                                                                                        : t(
                                                                                              'Edit Control Points'
                                                                                          )
                                                                                }
                                                                            >
                                                                                {isEditing
                                                                                    ? '✕'
                                                                                    : '✏️'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-white p-4">
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleBack}
                                        className="flex-1 rounded border border-white bg-gray-600 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-500"
                                    >
                                        {t('Back')}
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    t(
                                                        '⚠️ Reset all pipes? All drawn pipes will be lost.'
                                                    )
                                                )
                                            ) {
                                                pipeManager.setPipes([], { resetHistory: true });
                                                resetPipesOnly();
                                            }
                                        }}
                                        className="flex-1 rounded border border-white bg-orange-600 px-4 py-2 text-sm text-white transition-colors hover:bg-orange-500"
                                    >
                                        {t('Reset')}
                                    </button>

                                    <button
                                        onClick={handleContinue}
                                        className="flex-1 rounded border border-white bg-green-600 px-4 py-2 text-sm text-white transition-colors hover:bg-green-700"
                                    >
                                        {t('Continue')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="relative flex-1">
                            <div
                                className="absolute inset-0 border border-white"
                                style={{ backgroundColor: '#000005' }}
                            >
                                <HorticultureMapComponent
                                    onMapLoad={handleMapLoad}
                                    center={[fieldData.mapCenter.lat, fieldData.mapCenter.lng]}
                                    zoom={fieldData.mapZoom}
                                    mapOptions={{
                                        maxZoom: 22,
                                        disableDefaultUI: false,
                                        zoomControl: true,
                                        mapTypeControl: false,
                                        scaleControl: false,
                                        streetViewControl: false,
                                        rotateControl: false,
                                        fullscreenControl: false,
                                    }}
                                />

                                {/* Undo/Redo buttons top-left */}
                                <div className="absolute left-1 top-1 z-10">
                                    <div className="flex space-x-1 rounded-lg border border-white bg-black bg-opacity-80 p-1">
                                        <button
                                            onClick={() => pipeManager.undo()}
                                            disabled={pipeManager.pipeHistoryIndex <= 0}
                                            className={`rounded border border-white px-2 py-1 text-xs text-white ${pipeManager.pipeHistoryIndex <= 0 ? 'cursor-not-allowed bg-gray-500 opacity-50' : 'bg-gray-600 hover:bg-gray-700'}`}
                                            title={t('Undo')}
                                        >
                                            ⟲
                                        </button>
                                        <button
                                            onClick={() => pipeManager.redo()}
                                            disabled={
                                                pipeManager.pipeHistoryIndex >=
                                                pipeManager.pipeHistoryLength - 1
                                            }
                                            className={`rounded border border-white px-2 py-1 text-xs text-white ${pipeManager.pipeHistoryIndex >= pipeManager.pipeHistoryLength - 1 ? 'cursor-not-allowed bg-gray-500 opacity-50' : 'bg-gray-600 hover:bg-gray-700'}`}
                                            title={t('Redo')}
                                        >
                                            ⟳
                                        </button>
                                        {/* Sprinkler-based warnings indicator */}
                                        {pipeOverLengthWarnings.length > 0 && (
                                            <div
                                                className="ml-1 rounded border border-white bg-yellow-600 px-2 py-1 text-xs text-white"
                                                title={t(
                                                    'Some pipes may be too long based on sprinkler rows'
                                                )}
                                            >
                                                ⚠️ {t('Pipe length warning')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="absolute right-1 top-1 z-10 rounded-lg border border-white bg-black bg-opacity-80 p-3 text-xs">
                                    <div className="text-white">
                                        <div>
                                            Lat: {mapStatus.center.lat.toFixed(3)}, Lng:{' '}
                                            {mapStatus.center.lng.toFixed(3)}
                                        </div>
                                    </div>
                                </div>

                                {pipeManager.isDrawing && (
                                    <div className="absolute left-1 top-11 z-10 rounded-lg border border-blue-400 bg-blue-600 bg-opacity-90 p-3 text-xs">
                                        <div className="font-bold text-white">
                                            ✏️ {t('Drawing')}: {pipeManager.selectedType} pipe
                                            {pipeManager.selectedCurveType !== 'straight' && (
                                                <span className="text-yellow-300">
                                                    {' '}
                                                    ({pipeManager.selectedCurveType})
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-blue-200">
                                            {pipeManager.selectedCurveType === 'straight' &&
                                                t('Click on map to draw. Double-click to finish.')}
                                            {pipeManager.selectedCurveType === 'bezier' &&
                                                t(
                                                    'Click 3 points: start, control, end. Double-click to finish.'
                                                )}
                                            {pipeManager.selectedCurveType === 'spline' &&
                                                t(
                                                    'Click multiple points for smooth curve. Double-click to finish.'
                                                )}
                                        </div>
                                        {snapSystem.isEnabled && (
                                            <div className="text-green-300">
                                                🎯 {t('Snap enabled')} ({snapSystem.distance}m)
                                            </div>
                                        )}
                                        {snapSystem.point && (
                                            <div className="text-yellow-300">
                                                {t('Snap Point')}: {snapSystem.point.lat.toFixed(4)}
                                                , {snapSystem.point.lng.toFixed(4)}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {pipeManager.editingPipeId && (
                                    <div className="absolute left-1 top-11 z-10 rounded-lg border border-yellow-400 bg-yellow-600 bg-opacity-90 p-3 text-xs">
                                        <div className="font-bold text-white">
                                            ✍️ {t('Editing Pipe')}
                                        </div>
                                        <div className="text-yellow-200">
                                            {t('Drag the yellow handles to adjust the curve.')}
                                        </div>
                                        <button
                                            onClick={() => pipeManager.setEditingPipeId(null)}
                                            className="mt-2 w-full rounded bg-gray-600 px-2 py-1 text-xs text-white transition-colors hover:bg-gray-700"
                                        >
                                            {t('Done Editing')}
                                        </button>
                                    </div>
                                )}

                                {/* Detailed warning panel & reference lateral controls */}
                                {(pipeOverLengthWarnings.length > 0 || lateralReference) && (
                                    <div className="absolute left-1 top-36 z-10 max-w-sm rounded-lg border border-yellow-400 bg-yellow-700 bg-opacity-90 p-2 text-xs">
                                        <div className="mb-1 font-bold text-white">
                                            ⚠️ {t('Pipe Length Advisory')}
                                        </div>
                                        {lateralReference && (
                                            <div className="mb-2 rounded bg-yellow-800/60 p-1 text-yellow-100">
                                                <div>
                                                    {t('Reference Lateral')}: #
                                                    {lateralReference.pipeId.split('-').pop()}
                                                </div>
                                                <div>
                                                    📏 {t('Length')}:{' '}
                                                    {Math.round(lateralReference.length)} m
                                                </div>
                                                <div>
                                                    💧 {t('Flow Rate')}:{' '}
                                                    {Math.round(lateralReference.flowLpm)} L/min
                                                </div>
                                            </div>
                                        )}
                                        {pipeOverLengthWarnings.length > 0 && (
                                            <div className="max-h-56 space-y-1 overflow-y-auto pr-1 text-yellow-100">
                                                {pipeOverLengthWarnings.map((w) => (
                                                    <div
                                                        key={w.pipeId}
                                                        className="flex items-center justify-between"
                                                    >
                                                        <button
                                                            className="text-yellow-200 underline hover:text-white"
                                                            onClick={(e) =>
                                                                handleSelectWarningPipe(w.pipeId, e)
                                                            }
                                                            title={t('Select and focus this pipe')}
                                                        >
                                                            {w.type === 'submain'
                                                                ? t('Submain')
                                                                : t('Lateral')}{' '}
                                                            #{w.pipeId.split('-').pop()}
                                                        </button>
                                                        <span className="ml-1">
                                                            {Math.round(w.actualLength)}m →{' '}
                                                            {Math.round(w.recommendedLength)}m
                                                        </span>
                                                        <div className="ml-2 flex space-x-1">
                                                            <button
                                                                className="rounded border border-yellow-300 bg-yellow-500 px-1.5 py-0.5 text-[10px] text-black hover:bg-yellow-400"
                                                                onClick={() =>
                                                                    handleAcceptAsReference(
                                                                        w.pipeId
                                                                    )
                                                                }
                                                            >
                                                                {t('Accept as reference')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Floating Distance Meter */}
                                {pipeManager.isDrawing &&
                                    pipeManager.drawingState.currentDistance > 0 && (
                                        <div className="absolute left-80 top-1 z-10 rounded-lg border border-green-400 bg-green-600 bg-opacity-90 p-3 text-xs">
                                            <div className="flex items-center space-x-3">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-bold text-white">
                                                        📏 {t('Distance')}:
                                                    </span>
                                                    <span className="text-lg font-bold text-green-200">
                                                        {pipeManager.drawingState.currentDistance.toFixed(
                                                            1
                                                        )}
                                                        m
                                                    </span>
                                                    <span className="text-green-300">
                                                        {pipeManager.selectedType} {t('pipe')}
                                                    </span>
                                                </div>
                                                {pipeManager.selectedType === 'lateral' && (
                                                    <div className="flex items-center space-x-2 border-l border-green-400/50 pl-3">
                                                        <span className="font-bold text-white">
                                                            💧 {t('Flow Rate')}:
                                                        </span>
                                                        <span className="text-lg font-bold text-green-200">
                                                            {pipeManager.drawingState
                                                                .currentFlowRate ?? 0}{' '}
                                                            L/min
                                                        </span>
                                                        <span className="text-green-300">
                                                            🚿{' '}
                                                            {pipeManager.drawingState
                                                                .connectedSprinklers?.length ?? 0}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Pump Placement Indicator */}
                                {isPlacingPump && (
                                    <div className="absolute left-4 top-4 z-10 rounded-lg border border-blue-400 bg-blue-600 bg-opacity-90 p-3 text-xs">
                                        <div className="font-bold text-white">
                                            ⚙️ {t('Pump Placement Mode')}
                                        </div>
                                        <div className="text-blue-200">
                                            {t('Click anywhere on the map to place a water pump')}
                                        </div>
                                        <button
                                            onClick={() => setIsPlacingPump(false)}
                                            className="mt-2 w-full rounded bg-gray-600 px-2 py-1 text-xs text-white transition-colors hover:bg-gray-700"
                                        >
                                            {t('Cancel')}
                                        </button>
                                    </div>
                                )}

                                {/* Pump Placement Button */}
                                <div className="absolute bottom-1 left-20 z-10">
                                    <div className="rounded-lg border border-white bg-black bg-opacity-80 p-2">
                                        <div className="mb-2 text-center text-xs font-bold text-white">
                                            {t('Pump Tools')}
                                        </div>
                                        <div className="flex flex-col space-y-2">
                                            <button
                                                onClick={() => startPumpPlacement()}
                                                className={`flex items-center justify-center rounded border px-3 py-2 text-xs transition-colors ${
                                                    isPlacingPump
                                                        ? 'cursor-not-allowed border-blue-500 bg-blue-700 text-white'
                                                        : 'cursor-pointer border-blue-500 bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                                disabled={isPlacingPump}
                                                title={t('Place Water Pump')}
                                            >
                                                <span className="mr-1">💧</span>
                                                {t('Water Pump')}
                                            </button>
                                        </div>
                                        {isPlacingPump && (
                                            <div className="mt-2 text-center">
                                                <div className="text-xs text-yellow-300">
                                                    {t('Click on map to place pump')}
                                                </div>
                                                <button
                                                    onClick={() => setIsPlacingPump(false)}
                                                    className="mt-1 rounded bg-gray-600 px-2 py-1 text-xs text-white transition-colors hover:bg-gray-700"
                                                >
                                                    {t('Cancel')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {showLegend ? (
                                    <div className="absolute bottom-4 right-14 z-10 max-w-[365px] rounded-lg border border-white bg-black bg-opacity-80 p-2 text-[11px]">
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="font-bold text-white">
                                                {t('Legend')}
                                            </div>
                                            <button
                                                onClick={() => setShowLegend(false)}
                                                className="rounded border border-gray-500 bg-gray-700 px-1.5 py-0.5 text-[10px] text-white hover:bg-gray-600"
                                                title={t('Hide Legend')}
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                            <div className="flex items-center space-x-2">
                                                <div className="h-1 w-4 rounded bg-red-600"></div>
                                                <span className="text-gray-300">
                                                    {t('Main Pipe')}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <div className="h-1 w-4 rounded bg-purple-600"></div>
                                                <span className="text-gray-300">
                                                    {t('Submain Pipe')}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <div className="h-1 w-4 rounded bg-green-600"></div>
                                                <span className="text-gray-300">
                                                    {t('Lateral Pipe')}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                                                <span className="text-gray-300">
                                                    {t('Sprinkler')}
                                                </span>
                                            </div>
                                            <div className="mt-2 w-full border-t border-gray-600 pt-1">
                                                <div className="mb-1 text-xs font-semibold text-gray-400">
                                                    {t('Curve Types')}:
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-yellow-400">🎯</span>
                                                        <span className="text-xs text-gray-300">
                                                            {t('Bezier Curve')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-cyan-400">🌊</span>
                                                        <span className="text-xs text-gray-300">
                                                            {t('Spline Curve')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-2 w-full border-t border-gray-600 pt-1">
                                                <div className="mb-1 text-xs font-semibold text-gray-400">
                                                    {t('Control Points')}:
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                                        <span className="text-xs text-gray-300">
                                                            {t('Start Point')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                                        <span className="text-xs text-gray-300">
                                                            {t('End Point')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                                                        <span className="text-xs text-gray-300">
                                                            {t('Control Points')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowLegend(true)}
                                        className="absolute bottom-4 right-14 z-10 rounded border border-white bg-black bg-opacity-80 px-2 py-1 text-[11px] text-white hover:bg-opacity-90"
                                        title={t('Show Legend')}
                                    >
                                        {t('Legend')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Modal */}
            <NotificationModal
                isOpen={notificationModal.isOpen}
                onClose={() => setNotificationModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={notificationModal.onConfirm || undefined}
                onCancel={notificationModal.onCancel || undefined}
                title={notificationModal.title}
                message={notificationModal.message}
                warningMessage={notificationModal.warningMessage}
                type={notificationModal.type}
                showConfirmButton={!!notificationModal.onConfirm}
                confirmText={t('ยืนยัน')}
                cancelText={t('ยกเลิก')}
                showColorOptions={notificationModal.showColorOptions}
            />
        </>
    );
}
