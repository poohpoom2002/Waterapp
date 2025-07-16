// resources/js/components/homegarden/CanvasDesigner.tsx - Enhanced with pipe editing support
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
    CanvasCoordinate,
    GardenZone,
    Sprinkler,
    WaterSource,
    Pipe,
    ZONE_TYPES,
    SPRINKLER_TYPES,
    CANVAS_GRID_SIZE,
    isPointInPolygon,
    calculateDistance,
    calculatePolygonArea,
    formatArea,
    formatDistance,
    clipCircleToPolygon,
    canvasToGPS,
} from '../../utils/homeGardenData';

// ===== ENHANCED TYPES =====
interface ZoneDrawingTool {
    id: string;
    name: string;
    icon: string;
    description: string;
    type: 'rectangle' | 'freehand' | 'circle';
}

interface SnapPoint {
    x: number;
    y: number;
    type: 'grid' | 'vertex' | 'center' | 'midpoint';
    sourceId?: string;
}

interface DimensionLine {
    id: string;
    start: CanvasCoordinate;
    end: CanvasCoordinate;
    label: string;
    distance: number;
    direction: 'auto' | 'left' | 'right' | 'top' | 'bottom';
}

interface ViewportState {
    zoom: number;
    panX: number;
    panY: number;
    scale: number;
}

interface CanvasDesignerProps {
    gardenZones: GardenZone[];
    sprinklers: Sprinkler[];
    waterSource: WaterSource | null;
    pipes: Pipe[];
    selectedZoneType: string;
    editMode: string;
    manualSprinklerType: string;
    manualSprinklerRadius: number;
    selectedSprinkler: string | null;
    selectedPipes: Set<string>;
    selectedSprinklersForPipe: string[];
    mainPipeDrawing: CanvasCoordinate[];
    canvasData: any;
    onZoneCreated: (coordinates: CanvasCoordinate[]) => void;
    onSprinklerPlaced: (position: CanvasCoordinate) => void;
    onWaterSourcePlaced: (position: CanvasCoordinate) => void;
    onMainPipePoint: (point: CanvasCoordinate) => void;
    onSprinklerDragged: (sprinklerId: string, newPos: CanvasCoordinate) => void;
    onSprinklerClick: (sprinklerId: string) => void;
    onSprinklerDelete: (sprinklerId: string) => void;
    onWaterSourceDelete: () => void;
    onPipeClick: (pipeId: string) => void;
    hasMainArea: boolean;
    pipeEditMode?: string;
}

const CanvasDesigner: React.FC<CanvasDesignerProps> = ({
    gardenZones,
    sprinklers,
    waterSource,
    pipes,
    selectedZoneType,
    editMode,
    manualSprinklerType,
    manualSprinklerRadius,
    selectedSprinkler,
    selectedPipes,
    selectedSprinklersForPipe,
    mainPipeDrawing,
    canvasData,
    onZoneCreated,
    onSprinklerPlaced,
    onWaterSourcePlaced,
    onMainPipePoint,
    onSprinklerDragged,
    onSprinklerClick,
    onSprinklerDelete,
    onWaterSourceDelete,
    onPipeClick,
    hasMainArea,
    pipeEditMode,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number>();

    // ===== VIEWPORT & ZOOM STATES =====
    const [viewport, setViewport] = useState<ViewportState>({
        zoom: 1,
        panX: 0,
        panY: 0,
        scale: 20,
    });

    // ===== ENHANCED MODE STATES =====
    const [enhancedMode, setEnhancedMode] = useState(false);
    const [currentZoneTool, setCurrentZoneTool] = useState<string>('rectangle');

    // Enhanced drawing states
    const [enhancedDrawing, setEnhancedDrawing] = useState({
        isDrawing: false,
        startPoint: null as CanvasCoordinate | null,
        currentPoints: [] as CanvasCoordinate[],
        previewShape: null as CanvasCoordinate[] | null,
    });

    // ===== DIMENSION LINES =====
    const [dimensionLines, setDimensionLines] = useState<DimensionLine[]>([]);
    const [dimensionMode, setDimensionMode] = useState(false);
    const [tempDimensionPoints, setTempDimensionPoints] = useState<CanvasCoordinate[]>([]);
    const [dimensionDirection, setDimensionDirection] = useState<
        'auto' | 'left' | 'right' | 'top' | 'bottom'
    >('auto');
    const [showDimensionDirectionDialog, setShowDimensionDirectionDialog] = useState(false);

    // Display and snap settings
    const [showGrid, setShowGrid] = useState(true);
    const [showRuler, setShowRuler] = useState(true);
    const [showSprinklerRadius, setShowSprinklerRadius] = useState(true);
    const [showMeasurements, setShowMeasurements] = useState(true);
    const [showDimensions, setShowDimensions] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [snapToVertex, setSnapToVertex] = useState(true);
    const [snapDistance, setSnapDistance] = useState(15);
    const [hoveredSnapPoint, setHoveredSnapPoint] = useState<SnapPoint | null>(null);

    // Scale and measurement
    const [enhancedScale, setEnhancedScale] = useState(20);
    const [isSettingScale, setIsSettingScale] = useState(false);
    const [scalePoints, setScalePoints] = useState<CanvasCoordinate[]>([]);
    const [showScaleDialog, setShowScaleDialog] = useState(false);
    const [realDistance, setRealDistance] = useState<string>('');

    // UI states
    const [mousePos, setMousePos] = useState<CanvasCoordinate>({ x: 0, y: 0 });
    const [hoveredItem, setHoveredItem] = useState<{ type: string; id: string } | null>(null);
    const [draggedSprinkler, setDraggedSprinkler] = useState<string | null>(null);
    const [needsRedraw, setNeedsRedraw] = useState(true);
    const [distanceCursor, setDistanceCursor] = useState<{ show: boolean; distance: number }>({
        show: false,
        distance: 0,
    });

    // Canvas size - Dynamic based on container
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

    // Original states for compatibility
    const [currentPolygon, setCurrentPolygon] = useState<CanvasCoordinate[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);

    // ===== ZONE DRAWING TOOLS CONFIGURATION =====
    const zoneDrawingTools: ZoneDrawingTool[] = [
        {
            id: 'rectangle',
            name: 'สี่เหลี่ยม',
            icon: '⬜',
            description: 'วาดโซนสี่เหลี่ยมผืน',
            type: 'rectangle',
        },
        {
            id: 'freehand',
            name: 'วาดอิสระ',
            icon: '✏️',
            description: 'วาดโซนด้วยการคลิกทีละจุด',
            type: 'freehand',
        },
        {
            id: 'circle',
            name: 'วาดวงกลม',
            icon: '🔴',
            description: 'วาดโซนวงกลม',
            type: 'circle',
        },
    ];

    // ===== UTILITY FUNCTIONS =====
    const getEffectiveScale = useCallback(() => {
        return (enhancedMode ? enhancedScale : canvasData.scale) * viewport.zoom;
    }, [enhancedMode, enhancedScale, canvasData.scale, viewport.zoom]);

    const worldToScreen = useCallback(
        (worldPos: CanvasCoordinate): CanvasCoordinate => {
            return {
                x: (worldPos.x + viewport.panX) * viewport.zoom,
                y: (worldPos.y + viewport.panY) * viewport.zoom,
            };
        },
        [viewport]
    );

    const screenToWorld = useCallback(
        (screenPos: CanvasCoordinate): CanvasCoordinate => {
            return {
                x: screenPos.x / viewport.zoom - viewport.panX,
                y: screenPos.y / viewport.zoom - viewport.panY,
            };
        },
        [viewport]
    );

    const pixelsToMeters = useCallback(
        (pixels: number) => pixels / getEffectiveScale(),
        [getEffectiveScale]
    );

    const formatEnhancedDistance = useCallback(
        (pixels: number) => {
            const meters = pixelsToMeters(pixels);
            if (meters >= 1) {
                return `${meters.toFixed(2)} ม.`;
            } else {
                return `${(meters * 100).toFixed(1)} ซม.`;
            }
        },
        [pixelsToMeters]
    );

    const formatEnhancedArea = useCallback(
        (pixels: number) => {
            const scale = getEffectiveScale();
            const sqMeters = pixels / (scale * scale);
            if (sqMeters >= 1) {
                return `${sqMeters.toFixed(2)} ตร.ม.`;
            } else {
                return `${(sqMeters * 10000).toFixed(0)} ตร.ซม.`;
            }
        },
        [getEffectiveScale]
    );

    // ===== PIPE RELATED FUNCTIONS =====
    const distanceToLine = useCallback(
        (
            point: CanvasCoordinate,
            lineStart: CanvasCoordinate,
            lineEnd: CanvasCoordinate
        ): number => {
            const A = point.x - lineStart.x;
            const B = point.y - lineStart.y;
            const C = lineEnd.x - lineStart.x;
            const D = lineEnd.y - lineStart.y;

            const dot = A * C + B * D;
            const lenSq = C * C + D * D;

            if (lenSq === 0) {
                return Math.sqrt(A * A + B * B);
            }

            let param = dot / lenSq;
            param = Math.max(0, Math.min(1, param));

            const nearestX = lineStart.x + param * C;
            const nearestY = lineStart.y + param * D;

            const dx = point.x - nearestX;
            const dy = point.y - nearestY;

            return Math.sqrt(dx * dx + dy * dy);
        },
        []
    );

    // ===== DIMENSION LINE FUNCTIONS =====
    const addDimensionLine = useCallback(
        (
            start: CanvasCoordinate,
            end: CanvasCoordinate,
            direction: 'auto' | 'left' | 'right' | 'top' | 'bottom' = 'auto'
        ) => {
            const distance = calculateDistance(start, end);
            const label = formatEnhancedDistance(distance);
            const newDimension: DimensionLine = {
                id: `dim_${Date.now()}`,
                start,
                end,
                label,
                distance,
                direction,
            };
            setDimensionLines((prev) => {
                const updated = [...prev, newDimension];
                try {
                    localStorage.setItem('gardenDimensionLines', JSON.stringify(updated));
                } catch (error) {
                    console.warn('Could not save dimension lines to localStorage:', error);
                }
                return updated;
            });
        },
        [formatEnhancedDistance]
    );

    const removeDimensionLine = useCallback((dimensionId: string) => {
        setDimensionLines((prev) => {
            const updated = prev.filter((d) => d.id !== dimensionId);
            try {
                localStorage.setItem('gardenDimensionLines', JSON.stringify(updated));
            } catch (error) {
                console.warn('Could not save dimension lines to localStorage:', error);
            }
            return updated;
        });
    }, []);

    const checkDimensionLineClick = useCallback(
        (worldPos: CanvasCoordinate): string | null => {
            for (const dimension of dimensionLines) {
                const startScreen = worldToScreen(dimension.start);
                const endScreen = worldToScreen(dimension.end);

                const dx = endScreen.x - startScreen.x;
                const dy = endScreen.y - startScreen.y;
                const length = Math.sqrt(dx * dx + dy * dy);

                if (length < 1) continue;

                const unitX = dx / length;
                const unitY = dy / length;
                const offsetDistance = 30 / viewport.zoom;

                let offsetX = 0;
                let offsetY = 0;

                if (dimension.direction === 'auto') {
                    offsetX = -unitY * offsetDistance;
                    offsetY = unitX * offsetDistance;
                } else if (dimension.direction === 'left') {
                    offsetX = -offsetDistance;
                    offsetY = 0;
                } else if (dimension.direction === 'right') {
                    offsetX = offsetDistance;
                    offsetY = 0;
                } else if (dimension.direction === 'top') {
                    offsetX = 0;
                    offsetY = -offsetDistance;
                } else if (dimension.direction === 'bottom') {
                    offsetX = 0;
                    offsetY = offsetDistance;
                }

                const midX = (startScreen.x + endScreen.x) / 2 + offsetX;
                const midY = (startScreen.y + endScreen.y) / 2 + offsetY;

                const deleteButtonX = midX + 20 / viewport.zoom;
                const deleteButtonY = midY - 2 / viewport.zoom;

                const clickScreen = worldToScreen(worldPos);
                const distToDelete = Math.sqrt(
                    Math.pow(clickScreen.x - deleteButtonX, 2) +
                        Math.pow(clickScreen.y - deleteButtonY, 2)
                );

                if (distToDelete < 10 / viewport.zoom) {
                    return dimension.id;
                }
            }
            return null;
        },
        [dimensionLines, worldToScreen, viewport]
    );

    // ===== SNAP FUNCTIONS =====
    const getSnapPoints = useCallback((): SnapPoint[] => {
        const snapPoints: SnapPoint[] = [];

        if (snapToGrid && showGrid) {
            const gridSize = CANVAS_GRID_SIZE;
            const startWorldX = Math.floor(-viewport.panX / gridSize) * gridSize;
            const startWorldY = Math.floor(-viewport.panY / gridSize) * gridSize;
            const endWorldX =
                startWorldX + Math.ceil(canvasSize.width / (gridSize * viewport.zoom)) * gridSize;
            const endWorldY =
                startWorldY + Math.ceil(canvasSize.height / (gridSize * viewport.zoom)) * gridSize;

            for (let x = startWorldX; x <= endWorldX; x += gridSize) {
                for (let y = startWorldY; y <= endWorldY; y += gridSize) {
                    snapPoints.push({ x, y, type: 'grid' });
                }
            }
        }

        if (snapToVertex) {
            gardenZones.forEach((zone) => {
                if (zone.canvasCoordinates) {
                    zone.canvasCoordinates.forEach((coord) => {
                        snapPoints.push({
                            x: coord.x,
                            y: coord.y,
                            type: 'vertex',
                            sourceId: zone.id,
                        });
                    });

                    for (let i = 0; i < zone.canvasCoordinates.length; i++) {
                        const current = zone.canvasCoordinates[i];
                        const next =
                            zone.canvasCoordinates[(i + 1) % zone.canvasCoordinates.length];
                        snapPoints.push({
                            x: (current.x + next.x) / 2,
                            y: (current.y + next.y) / 2,
                            type: 'midpoint',
                            sourceId: zone.id,
                        });
                    }
                }
            });

            sprinklers.forEach((sprinkler) => {
                if (sprinkler.canvasPosition) {
                    snapPoints.push({
                        x: sprinkler.canvasPosition.x,
                        y: sprinkler.canvasPosition.y,
                        type: 'vertex',
                        sourceId: sprinkler.id,
                    });
                }
            });
        }

        return snapPoints;
    }, [snapToGrid, snapToVertex, showGrid, gardenZones, sprinklers, canvasSize, viewport]);

    const findNearestSnapPoint = useCallback(
        (x: number, y: number): SnapPoint | null => {
            if (!snapToGrid && !snapToVertex) return null;

            const snapPoints = getSnapPoints();
            let nearest: SnapPoint | null = null;
            let minDistance = snapDistance / viewport.zoom;

            snapPoints.forEach((point) => {
                const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = point;
                }
            });

            return nearest;
        },
        [getSnapPoints, snapDistance, viewport.zoom, snapToGrid, snapToVertex]
    );

    // ===== ENHANCED ZONE CREATION FUNCTIONS =====
    const createRectangleZone = useCallback(
        (start: CanvasCoordinate, end: CanvasCoordinate): CanvasCoordinate[] => {
            return [
                { x: start.x, y: start.y },
                { x: end.x, y: start.y },
                { x: end.x, y: end.y },
                { x: start.x, y: end.y },
            ];
        },
        []
    );

    const createCircleZone = useCallback(
        (center: CanvasCoordinate, radius: number, segments: number = 32): CanvasCoordinate[] => {
            const points: CanvasCoordinate[] = [];
            for (let i = 0; i < segments; i++) {
                const angle = (i * 2 * Math.PI) / segments;
                points.push({
                    x: center.x + radius * Math.cos(angle),
                    y: center.y + radius * Math.sin(angle),
                });
            }
            return points;
        },
        []
    );

    const createRegularPolygon = useCallback(
        (center: CanvasCoordinate, radius: number, sides: number = 6): CanvasCoordinate[] => {
            const points: CanvasCoordinate[] = [];
            for (let i = 0; i < sides; i++) {
                const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
                points.push({
                    x: center.x + radius * Math.cos(angle),
                    y: center.y + radius * Math.sin(angle),
                });
            }
            return points;
        },
        []
    );

    // ===== ZONE FINALIZATION =====
    const finalizeEnhancedZone = useCallback(
        (coordinates: CanvasCoordinate[]) => {
            const scale = enhancedMode ? enhancedScale : canvasData.scale;
            const area = calculatePolygonArea(coordinates, scale);

            if (area > 300) {
                alert(
                    `❌ ขนาดพื้นที่เกินกำหนด!\n\nขนาดที่วาด: ${formatArea(area)}\nขนาดสูงสุดที่อนุญาต: 300 ตร.ม.\n\nกรุณาวาดพื้นที่ให้มีขนาดเล็กลง`
                );
                return;
            }

            onZoneCreated(coordinates);

            setEnhancedDrawing({
                isDrawing: false,
                startPoint: null,
                currentPoints: [],
                previewShape: null,
            });

            setDistanceCursor({ show: false, distance: 0 });
        },
        [enhancedMode, enhancedScale, canvasData.scale, onZoneCreated]
    );

    // ===== ZOOM FUNCTIONS =====
    const handleZoom = useCallback(
        (delta: number, centerX: number, centerY: number) => {
            setViewport((prev) => {
                const zoomFactor = delta > 0 ? 1.1 : 0.9;
                const newZoom = Math.max(0.1, Math.min(5, prev.zoom * zoomFactor));

                const worldCenter = screenToWorld({ x: centerX, y: centerY });
                const newPanX = worldCenter.x - centerX / newZoom;
                const newPanY = worldCenter.y - centerY / newZoom;

                return {
                    ...prev,
                    zoom: newZoom,
                    panX: newPanX,
                    panY: newPanY,
                };
            });
        },
        [screenToWorld]
    );

    // ===== DRAWING FUNCTIONS =====
    const drawGrid = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!showGrid) return;

            ctx.save();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 0.5 / viewport.zoom;

            const gridSize = CANVAS_GRID_SIZE;
            const startX = Math.floor(-viewport.panX / gridSize) * gridSize;
            const startY = Math.floor(-viewport.panY / gridSize) * gridSize;
            const endX =
                startX + Math.ceil(canvasSize.width / (gridSize * viewport.zoom)) * gridSize;
            const endY =
                startY + Math.ceil(canvasSize.height / (gridSize * viewport.zoom)) * gridSize;

            for (let x = startX; x <= endX; x += gridSize) {
                const screenX = (x + viewport.panX) * viewport.zoom;
                if (screenX >= 0 && screenX <= canvasSize.width) {
                    ctx.beginPath();
                    ctx.moveTo(screenX, 0);
                    ctx.lineTo(screenX, canvasSize.height);
                    ctx.stroke();
                }
            }

            for (let y = startY; y <= endY; y += gridSize) {
                const screenY = (y + viewport.panY) * viewport.zoom;
                if (screenY >= 0 && screenY <= canvasSize.height) {
                    ctx.beginPath();
                    ctx.moveTo(0, screenY);
                    ctx.lineTo(canvasSize.width, screenY);
                    ctx.stroke();
                }
            }

            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2 / viewport.zoom;

            const centerX = viewport.panX * viewport.zoom;
            const centerY = viewport.panY * viewport.zoom;

            if (centerY >= 0 && centerY <= canvasSize.height) {
                ctx.beginPath();
                ctx.moveTo(0, centerY);
                ctx.lineTo(canvasSize.width, centerY);
                ctx.stroke();
            }

            if (centerX >= 0 && centerX <= canvasSize.width) {
                ctx.beginPath();
                ctx.moveTo(centerX, 0);
                ctx.lineTo(centerX, canvasSize.height);
                ctx.stroke();
            }

            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 5 / viewport.zoom, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        },
        [showGrid, canvasSize, viewport]
    );

    const drawRuler = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!showRuler || !enhancedMode) return;

            const scale = getEffectiveScale();

            ctx.save();
            ctx.fillStyle = '#444';
            ctx.fillRect(0, 0, canvasSize.width, 30);
            ctx.fillRect(0, 0, 30, canvasSize.height);

            ctx.strokeStyle = '#666';
            ctx.fillStyle = '#ccc';
            ctx.font = `${12 / viewport.zoom}px Arial`;

            const startWorldX = -viewport.panX;
            const endWorldX = startWorldX + canvasSize.width / viewport.zoom;
            const stepMeters = 5;
            const stepPixels = stepMeters * (enhancedMode ? enhancedScale : canvasData.scale);

            for (
                let worldX = Math.floor(startWorldX / stepPixels) * stepPixels;
                worldX <= endWorldX;
                worldX += stepPixels
            ) {
                const screenX = (worldX + viewport.panX) * viewport.zoom;
                if (screenX >= 30 && screenX <= canvasSize.width) {
                    ctx.beginPath();
                    ctx.moveTo(screenX, 25);
                    ctx.lineTo(screenX, 30);
                    ctx.stroke();

                    if (worldX % (stepPixels * 2) === 0) {
                        const meters = worldX / (enhancedMode ? enhancedScale : canvasData.scale);
                        ctx.fillText(`${meters.toFixed(0)}m`, screenX + 2, 20);
                    }
                }
            }

            const startWorldY = -viewport.panY;
            const endWorldY = startWorldY + canvasSize.height / viewport.zoom;

            for (
                let worldY = Math.floor(startWorldY / stepPixels) * stepPixels;
                worldY <= endWorldY;
                worldY += stepPixels
            ) {
                const screenY = (worldY + viewport.panY) * viewport.zoom;
                if (screenY >= 30 && screenY <= canvasSize.height) {
                    ctx.beginPath();
                    ctx.moveTo(25, screenY);
                    ctx.lineTo(30, screenY);
                    ctx.stroke();

                    if (worldY % (stepPixels * 2) === 0 && worldY > 0) {
                        const meters = -worldY / (enhancedMode ? enhancedScale : canvasData.scale);
                        ctx.save();
                        ctx.translate(20, screenY - 2);
                        ctx.rotate(-Math.PI / 2);
                        ctx.fillText(`${meters.toFixed(0)}m`, 0, 0);
                        ctx.restore();
                    }
                }
            }

            ctx.restore();
        },
        [
            showRuler,
            enhancedMode,
            canvasSize,
            viewport,
            getEffectiveScale,
            enhancedScale,
            canvasData.scale,
        ]
    );

    const drawZone = useCallback(
        (ctx: CanvasRenderingContext2D, zone: GardenZone) => {
            if (!zone.canvasCoordinates || zone.canvasCoordinates.length < 3) return;

            const zoneType = ZONE_TYPES.find((z) => z.id === zone.type);
            const isNestedZone = !!zone.parentZoneId;

            ctx.save();
            ctx.fillStyle = zoneType?.color + '33' || '#66666633';
            ctx.strokeStyle = zoneType?.color || '#666666';
            ctx.lineWidth = (isNestedZone ? 3 : 2) / viewport.zoom;

            if (zone.type === 'forbidden' || isNestedZone) {
                ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
            }

            ctx.beginPath();
            const firstScreen = worldToScreen(zone.canvasCoordinates[0]);
            ctx.moveTo(firstScreen.x, firstScreen.y);
            for (let i = 1; i < zone.canvasCoordinates.length; i++) {
                const screenPos = worldToScreen(zone.canvasCoordinates[i]);
                ctx.lineTo(screenPos.x, screenPos.y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);

            const centerX =
                zone.canvasCoordinates.reduce((sum, c) => sum + c.x, 0) /
                zone.canvasCoordinates.length;
            const centerY =
                zone.canvasCoordinates.reduce((sum, c) => sum + c.y, 0) /
                zone.canvasCoordinates.length;
            const centerScreen = worldToScreen({ x: centerX, y: centerY });

            ctx.fillStyle = '#fff';
            ctx.font = `bold ${12 / viewport.zoom}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(zone.name, centerScreen.x, centerScreen.y);

            try {
                const area = calculatePolygonArea(
                    zone.canvasCoordinates,
                    enhancedMode ? enhancedScale : canvasData.scale
                );
                ctx.font = `${10 / viewport.zoom}px Arial`;
                ctx.fillStyle = '#ddd';
                ctx.fillText(formatArea(area), centerScreen.x, centerScreen.y + 15 / viewport.zoom);
            } catch (error) {
                console.error('Error drawing zone area:', error);
            }

            ctx.restore();
        },
        [worldToScreen, viewport, enhancedMode, enhancedScale, canvasData.scale]
    );

    const drawDimensionLines = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!showDimensions) return;

            ctx.save();

            dimensionLines.forEach((dimension) => {
                const startScreen = worldToScreen(dimension.start);
                const endScreen = worldToScreen(dimension.end);

                const dx = endScreen.x - startScreen.x;
                const dy = endScreen.y - startScreen.y;
                const length = Math.sqrt(dx * dx + dy * dy);

                if (length < 1) return;

                const unitX = dx / length;
                const unitY = dy / length;
                const offsetDistance = 30 / viewport.zoom;

                let offsetX = 0;
                let offsetY = 0;

                if (dimension.direction === 'auto') {
                    offsetX = -unitY * offsetDistance;
                    offsetY = unitX * offsetDistance;
                } else if (dimension.direction === 'left') {
                    offsetX = -offsetDistance;
                    offsetY = 0;
                } else if (dimension.direction === 'right') {
                    offsetX = offsetDistance;
                    offsetY = 0;
                } else if (dimension.direction === 'top') {
                    offsetX = 0;
                    offsetY = -offsetDistance;
                } else if (dimension.direction === 'bottom') {
                    offsetX = 0;
                    offsetY = offsetDistance;
                }

                const dimStart = {
                    x: startScreen.x + offsetX,
                    y: startScreen.y + offsetY,
                };
                const dimEnd = {
                    x: endScreen.x + offsetX,
                    y: endScreen.y + offsetY,
                };

                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2 / viewport.zoom;
                ctx.beginPath();
                ctx.moveTo(dimStart.x, dimStart.y);
                ctx.lineTo(dimEnd.x, dimEnd.y);
                ctx.stroke();

                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 1 / viewport.zoom;
                ctx.setLineDash([3 / viewport.zoom, 3 / viewport.zoom]);

                ctx.beginPath();
                ctx.moveTo(startScreen.x, startScreen.y);
                ctx.lineTo(dimStart.x, dimStart.y);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(endScreen.x, endScreen.y);
                ctx.lineTo(dimEnd.x, dimEnd.y);
                ctx.stroke();

                ctx.setLineDash([]);

                const arrowSize = 8 / viewport.zoom;
                const angle1 = Math.atan2(dimEnd.y - dimStart.y, dimEnd.x - dimStart.x);
                const angle2 = angle1 + Math.PI;

                ctx.beginPath();
                ctx.moveTo(dimStart.x, dimStart.y);
                ctx.lineTo(
                    dimStart.x + Math.cos(angle1 + 0.3) * arrowSize,
                    dimStart.y + Math.sin(angle1 + 0.3) * arrowSize
                );
                ctx.moveTo(dimStart.x, dimStart.y);
                ctx.lineTo(
                    dimStart.x + Math.cos(angle1 - 0.3) * arrowSize,
                    dimStart.y + Math.sin(angle1 - 0.3) * arrowSize
                );
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(dimEnd.x, dimEnd.y);
                ctx.lineTo(
                    dimEnd.x + Math.cos(angle2 + 0.3) * arrowSize,
                    dimEnd.y + Math.sin(angle2 + 0.3) * arrowSize
                );
                ctx.moveTo(dimEnd.x, dimEnd.y);
                ctx.lineTo(
                    dimEnd.x + Math.cos(angle2 - 0.3) * arrowSize,
                    dimEnd.y + Math.sin(angle2 - 0.3) * arrowSize
                );
                ctx.stroke();

                const midX = (dimStart.x + dimEnd.x) / 2;
                const midY = (dimStart.y + dimEnd.y) / 2;

                ctx.fillStyle = 'rgba(0,0,0,0.8)';
                const textMetrics = ctx.measureText(dimension.label);
                const textWidth = textMetrics.width;
                const textHeight = 16 / viewport.zoom;

                ctx.fillRect(
                    midX - textWidth / 2 - 4 / viewport.zoom,
                    midY - textHeight / 2,
                    textWidth + 8 / viewport.zoom,
                    textHeight
                );

                ctx.fillStyle = '#FFD700';
                ctx.font = `bold ${12 / viewport.zoom}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(dimension.label, midX, midY);

                ctx.fillStyle = '#FF4444';
                ctx.font = `bold ${10 / viewport.zoom}px Arial`;
                ctx.fillText(
                    '×',
                    midX + textWidth / 2 + 8 / viewport.zoom,
                    midY - 2 / viewport.zoom
                );
            });

            ctx.restore();
        },
        [showDimensions, dimensionLines, worldToScreen, viewport]
    );

    const drawDistanceCursor = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!distanceCursor.show || !enhancedDrawing.startPoint) return;

            const startScreen = worldToScreen(enhancedDrawing.startPoint);
            const endScreen = worldToScreen(mousePos);

            ctx.save();

            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2 / viewport.zoom;
            ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);

            ctx.beginPath();
            ctx.moveTo(startScreen.x, startScreen.y);
            ctx.lineTo(endScreen.x, endScreen.y);
            ctx.stroke();

            ctx.setLineDash([]);

            const distance = formatEnhancedDistance(distanceCursor.distance);

            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.font = `bold ${14 / viewport.zoom}px Arial`;
            const textMetrics = ctx.measureText(distance);
            const textWidth = textMetrics.width;
            const textHeight = 18 / viewport.zoom;

            ctx.fillRect(
                endScreen.x + 10 / viewport.zoom,
                endScreen.y - textHeight / 2,
                textWidth + 8 / viewport.zoom,
                textHeight
            );

            ctx.fillStyle = '#00FF00';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(distance, endScreen.x + 14 / viewport.zoom, endScreen.y);

            ctx.restore();
        },
        [
            distanceCursor,
            enhancedDrawing.startPoint,
            mousePos,
            worldToScreen,
            viewport,
            formatEnhancedDistance,
        ]
    );

    const drawEnhancedPreview = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!enhancedMode || !enhancedDrawing.isDrawing) return;

            const zoneType = ZONE_TYPES.find((z) => z.id === selectedZoneType);

            ctx.save();
            ctx.strokeStyle = zoneType?.color || '#3B82F6';
            ctx.fillStyle = (zoneType?.color || '#3B82F6') + '26';
            ctx.lineWidth = 3 / viewport.zoom;
            ctx.setLineDash([8 / viewport.zoom, 6 / viewport.zoom]);

            if (enhancedDrawing.previewShape && enhancedDrawing.previewShape.length > 2) {
                ctx.beginPath();
                const firstScreen = worldToScreen(enhancedDrawing.previewShape[0]);
                ctx.moveTo(firstScreen.x, firstScreen.y);
                for (let i = 1; i < enhancedDrawing.previewShape.length; i++) {
                    const screenPos = worldToScreen(enhancedDrawing.previewShape[i]);
                    ctx.lineTo(screenPos.x, screenPos.y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                if (showMeasurements) {
                    const area = calculatePolygonArea(enhancedDrawing.previewShape, enhancedScale);
                    const centerX =
                        enhancedDrawing.previewShape.reduce((sum, p) => sum + p.x, 0) /
                        enhancedDrawing.previewShape.length;
                    const centerY =
                        enhancedDrawing.previewShape.reduce((sum, p) => sum + p.y, 0) /
                        enhancedDrawing.previewShape.length;
                    const centerScreen = worldToScreen({ x: centerX, y: centerY });

                    ctx.fillStyle = 'rgba(0,0,0,0.8)';
                    ctx.fillRect(centerScreen.x - 50, centerScreen.y - 15, 100, 30);

                    ctx.fillStyle = '#fff';
                    ctx.font = `bold ${12 / viewport.zoom}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(formatEnhancedArea(area), centerScreen.x, centerScreen.y);
                }
            } else if (currentZoneTool === 'freehand' && enhancedDrawing.currentPoints.length > 0) {
                ctx.beginPath();
                const firstScreen = worldToScreen(enhancedDrawing.currentPoints[0]);
                ctx.moveTo(firstScreen.x, firstScreen.y);
                for (let i = 1; i < enhancedDrawing.currentPoints.length; i++) {
                    const screenPos = worldToScreen(enhancedDrawing.currentPoints[i]);
                    ctx.lineTo(screenPos.x, screenPos.y);
                }
                const mouseScreen = worldToScreen(mousePos);
                ctx.lineTo(mouseScreen.x, mouseScreen.y);
                if (enhancedDrawing.currentPoints.length > 2) {
                    ctx.lineTo(firstScreen.x, firstScreen.y);
                }
                ctx.stroke();

                ctx.fillStyle = zoneType?.color || '#3B82F6';
                enhancedDrawing.currentPoints.forEach((point) => {
                    const screenPos = worldToScreen(point);
                    ctx.beginPath();
                    ctx.arc(screenPos.x, screenPos.y, 6 / viewport.zoom, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            ctx.restore();
        },
        [
            enhancedMode,
            enhancedDrawing,
            selectedZoneType,
            currentZoneTool,
            mousePos,
            showMeasurements,
            enhancedScale,
            formatEnhancedArea,
            worldToScreen,
            viewport,
        ]
    );

    const drawCurrentPolygon = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (currentPolygon.length === 0 || enhancedMode) return;

            const zoneType = ZONE_TYPES.find((z) => z.id === selectedZoneType);

            ctx.save();
            ctx.strokeStyle = zoneType?.color || '#666';
            ctx.lineWidth = 3 / viewport.zoom;
            ctx.setLineDash([8 / viewport.zoom, 6 / viewport.zoom]);

            ctx.beginPath();
            const firstScreen = worldToScreen(currentPolygon[0]);
            ctx.moveTo(firstScreen.x, firstScreen.y);
            for (let i = 1; i < currentPolygon.length; i++) {
                const screenPos = worldToScreen(currentPolygon[i]);
                ctx.lineTo(screenPos.x, screenPos.y);
            }

            if (currentPolygon.length > 2) {
                ctx.lineTo(firstScreen.x, firstScreen.y);
            }

            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = zoneType?.color || '#666';
            for (const point of currentPolygon) {
                const screenPos = worldToScreen(point);
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, 6 / viewport.zoom, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        },
        [currentPolygon, selectedZoneType, enhancedMode, worldToScreen, viewport]
    );

    const drawSprinkler = useCallback(
        (ctx: CanvasRenderingContext2D, sprinkler: Sprinkler) => {
            if (!sprinkler.canvasPosition) return;

            const isSelected =
                selectedSprinkler === sprinkler.id ||
                selectedSprinklersForPipe.includes(sprinkler.id);
            const isHovered = hoveredItem?.type === 'sprinkler' && hoveredItem.id === sprinkler.id;
            const screenPos = worldToScreen(sprinkler.canvasPosition);

            ctx.save();
            ctx.translate(screenPos.x, screenPos.y);
            if (sprinkler.orientation) {
                ctx.rotate((sprinkler.orientation * Math.PI) / 180);
            }

            ctx.fillStyle = isSelected ? '#FFD700' : sprinkler.type.color;
            ctx.font = `bold ${10 / viewport.zoom}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 3 / viewport.zoom;
            ctx.shadowOffsetX = 1 / viewport.zoom;
            ctx.shadowOffsetY = 1 / viewport.zoom;

            ctx.fillText(sprinkler.type.icon, 0, 0);
            ctx.restore();

            if (isSelected || isHovered) {
                ctx.save();
                ctx.strokeStyle = isSelected ? '#FFD700' : '#FFF';
                ctx.lineWidth = (isSelected ? 3 : 2) / viewport.zoom;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, 8 / viewport.zoom, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        },
        [selectedSprinkler, selectedSprinklersForPipe, hoveredItem, worldToScreen, viewport]
    );

    const drawWaterSource = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!waterSource || !waterSource.canvasPosition) return;

            const screenPos = worldToScreen(waterSource.canvasPosition);

            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 8 / viewport.zoom;
            ctx.shadowOffsetX = 2 / viewport.zoom;
            ctx.shadowOffsetY = 2 / viewport.zoom;

            ctx.fillStyle = waterSource.type === 'pump' ? '#EF4444' : '#3B82F6';
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, 8 / viewport.zoom, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${10 / viewport.zoom}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(waterSource.type === 'pump' ? '⚡' : '🚰', screenPos.x, screenPos.y);

            ctx.restore();
        },
        [waterSource, worldToScreen, viewport]
    );

    const drawPipes = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            ctx.save();

            for (const pipe of pipes) {
                if (!pipe.canvasStart || !pipe.canvasEnd) continue;

                const startScreen = worldToScreen(pipe.canvasStart);
                const endScreen = worldToScreen(pipe.canvasEnd);

                const isSelected = selectedPipes.has(pipe.id);

                ctx.lineCap = 'round';
                ctx.strokeStyle = isSelected ? '#FBBF24' : '#8B5CF6';
                ctx.lineWidth = (isSelected ? 8 : 6) / viewport.zoom;
                ctx.beginPath();
                ctx.moveTo(startScreen.x, startScreen.y);
                ctx.lineTo(endScreen.x, endScreen.y);
                ctx.stroke();
            }

            ctx.restore();
        },
        [pipes, worldToScreen, viewport, selectedPipes]
    );

    // ===== MAIN DRAW FUNCTION =====
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        try {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

            ctx.save();

            drawGrid(ctx);

            for (const zone of gardenZones) {
                drawZone(ctx, zone);
            }

            drawEnhancedPreview(ctx);

            drawPipes(ctx);

            for (const sprinkler of sprinklers) {
                drawSprinkler(ctx, sprinkler);
            }

            drawWaterSource(ctx);

            drawCurrentPolygon(ctx);

            drawDimensionLines(ctx);

            drawDistanceCursor(ctx);

            ctx.restore();

            drawRuler(ctx);

            if (enhancedMode && hoveredSnapPoint) {
                const color = {
                    grid: '#6B7280',
                    vertex: '#EF4444',
                    center: '#10B981',
                    midpoint: '#F59E0B',
                }[hoveredSnapPoint.type];

                const screenPos = worldToScreen(hoveredSnapPoint);

                ctx.save();
                ctx.fillStyle = color;
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }

            if (enhancedMode && scalePoints.length > 0) {
                ctx.save();
                ctx.fillStyle = '#EF4444';
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;

                scalePoints.forEach((point) => {
                    const screenPos = worldToScreen(point);
                    ctx.beginPath();
                    ctx.arc(screenPos.x, screenPos.y, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                });

                if (scalePoints.length === 2) {
                    const start = worldToScreen(scalePoints[0]);
                    const end = worldToScreen(scalePoints[1]);

                    ctx.strokeStyle = '#EF4444';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                ctx.restore();
            }

            if (dimensionMode && tempDimensionPoints.length > 0) {
                ctx.save();
                ctx.fillStyle = '#FFD700';
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;

                tempDimensionPoints.forEach((point) => {
                    const screenPos = worldToScreen(point);
                    ctx.beginPath();
                    ctx.arc(screenPos.x, screenPos.y, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                });

                if (tempDimensionPoints.length === 2) {
                    const start = worldToScreen(tempDimensionPoints[0]);
                    const end = worldToScreen(tempDimensionPoints[1]);

                    ctx.strokeStyle = '#FFD700';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                ctx.restore();
            }
        } catch (error) {
            console.error('Error during canvas drawing:', error);
        }
    }, [
        canvasSize,
        viewport,
        gardenZones,
        sprinklers,
        waterSource,
        pipes,
        currentPolygon,
        enhancedMode,
        hoveredSnapPoint,
        scalePoints,
        dimensionMode,
        tempDimensionPoints,
        drawGrid,
        drawZone,
        drawEnhancedPreview,
        drawPipes,
        drawSprinkler,
        drawWaterSource,
        drawCurrentPolygon,
        drawRuler,
        drawDimensionLines,
        drawDistanceCursor,
        worldToScreen,
    ]);

    // ===== EVENT HANDLERS =====
    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;

            let worldPos = screenToWorld({ x, y });

            if (enhancedMode && (snapToGrid || snapToVertex)) {
                const snapPoint = findNearestSnapPoint(worldPos.x, worldPos.y);
                if (snapPoint) {
                    worldPos = { x: snapPoint.x, y: snapPoint.y };
                    setHoveredSnapPoint(snapPoint);
                } else {
                    setHoveredSnapPoint(null);
                }
            }

            setMousePos(worldPos);

            if (enhancedDrawing.isDrawing && enhancedDrawing.startPoint) {
                const distance = calculateDistance(enhancedDrawing.startPoint, worldPos);
                setDistanceCursor({ show: true, distance });
            } else {
                setDistanceCursor({ show: false, distance: 0 });
            }

            if (enhancedMode && enhancedDrawing.isDrawing && enhancedDrawing.startPoint) {
                let previewShape: CanvasCoordinate[] | null = null;

                switch (currentZoneTool) {
                    case 'rectangle':
                        previewShape = createRectangleZone(enhancedDrawing.startPoint, worldPos);
                        break;
                    case 'circle':
                        const radius = calculateDistance(enhancedDrawing.startPoint, worldPos);
                        previewShape = createCircleZone(enhancedDrawing.startPoint, radius);
                        break;
                    case 'polygon':
                        const polyRadius = calculateDistance(enhancedDrawing.startPoint, worldPos);
                        previewShape = createRegularPolygon(
                            enhancedDrawing.startPoint,
                            polyRadius,
                            6
                        );
                        break;
                }

                setEnhancedDrawing((prev) => ({ ...prev, previewShape }));
            }

            let newHoveredItem: { type: 'sprinkler' | 'waterSource' | 'pipe'; id: string } | null =
                null;

            for (const sprinkler of sprinklers) {
                if (!sprinkler.canvasPosition) continue;
                const dist = calculateDistance(worldPos, sprinkler.canvasPosition);
                if (dist < 18 / viewport.zoom) {
                    newHoveredItem = { type: 'sprinkler', id: sprinkler.id };
                    break;
                }
            }

            if (!newHoveredItem && waterSource && waterSource.canvasPosition) {
                const dist = calculateDistance(worldPos, waterSource.canvasPosition);
                if (dist < 25 / viewport.zoom) {
                    newHoveredItem = { type: 'waterSource', id: waterSource.id };
                }
            }

            if (JSON.stringify(newHoveredItem) !== JSON.stringify(hoveredItem)) {
                setHoveredItem(newHoveredItem);
            }

            if (draggedSprinkler) {
                onSprinklerDragged(draggedSprinkler, worldPos);
            }
        },
        [
            enhancedMode,
            snapToGrid,
            snapToVertex,
            findNearestSnapPoint,
            screenToWorld,
            enhancedDrawing,
            currentZoneTool,
            createRectangleZone,
            createCircleZone,
            createRegularPolygon,
            draggedSprinkler,
            sprinklers,
            waterSource,
            hoveredItem,
            viewport,
            onSprinklerDragged,
        ]
    );

    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;

            let worldPos = screenToWorld({ x, y });

            if (enhancedMode && (snapToGrid || snapToVertex)) {
                const snapPoint = findNearestSnapPoint(worldPos.x, worldPos.y);
                if (snapPoint) {
                    worldPos = { x: snapPoint.x, y: snapPoint.y };
                }
            }

            if (dimensionMode) {
                if (tempDimensionPoints.length === 0) {
                    setTempDimensionPoints([worldPos]);
                } else if (tempDimensionPoints.length === 1) {
                    const start = tempDimensionPoints[0];
                    const end = worldPos;
                    const dx = Math.abs(end.x - start.x);
                    const dy = Math.abs(end.y - start.y);

                    let suggestedDirection: 'auto' | 'left' | 'right' | 'top' | 'bottom' = 'auto';
                    if (dx > dy * 2) {
                        suggestedDirection = 'bottom';
                    } else if (dy > dx * 2) {
                        suggestedDirection = 'right';
                    }

                    setDimensionDirection(suggestedDirection);
                    setShowDimensionDirectionDialog(true);
                    setTempDimensionPoints([start, end]);
                }
                return;
            }

            const clickedDimensionId = checkDimensionLineClick(worldPos);
            if (clickedDimensionId) {
                removeDimensionLine(clickedDimensionId);
                return;
            }

            if (isSettingScale) {
                if (scalePoints.length === 0) {
                    setScalePoints([worldPos]);
                } else if (scalePoints.length === 1) {
                    setScalePoints([...scalePoints, worldPos]);
                    setShowScaleDialog(true);
                }
                return;
            }

            // Handle pipe click for pipe selection
            if (editMode === 'select-pipes' || pipeEditMode) {
                for (const pipe of pipes) {
                    if (!pipe.canvasStart || !pipe.canvasEnd) continue;
                    const dist = distanceToLine(worldPos, pipe.canvasStart, pipe.canvasEnd);
                    if (dist < 5 / viewport.zoom) {
                        onPipeClick(pipe.id);
                        return;
                    }
                }
            }

            if (enhancedMode && editMode === 'draw') {
                switch (currentZoneTool) {
                    case 'freehand':
                        if (!enhancedDrawing.isDrawing) {
                            setEnhancedDrawing({
                                isDrawing: true,
                                startPoint: worldPos,
                                currentPoints: [worldPos],
                                previewShape: null,
                            });
                        } else {
                            setEnhancedDrawing((prev) => ({
                                ...prev,
                                currentPoints: [...prev.currentPoints, worldPos],
                            }));
                        }
                        break;

                    case 'rectangle':
                    case 'circle':
                    case 'polygon':
                        if (!enhancedDrawing.isDrawing) {
                            setEnhancedDrawing({
                                isDrawing: true,
                                startPoint: worldPos,
                                currentPoints: [worldPos],
                                previewShape: null,
                            });
                        } else {
                            let finalPoints: CanvasCoordinate[] = [];

                            switch (currentZoneTool) {
                                case 'rectangle':
                                    finalPoints = createRectangleZone(
                                        enhancedDrawing.startPoint!,
                                        worldPos
                                    );
                                    break;
                                case 'circle':
                                    const radius = calculateDistance(
                                        enhancedDrawing.startPoint!,
                                        worldPos
                                    );
                                    finalPoints = createCircleZone(
                                        enhancedDrawing.startPoint!,
                                        radius
                                    );
                                    break;
                                case 'polygon':
                                    const polyRadius = calculateDistance(
                                        enhancedDrawing.startPoint!,
                                        worldPos
                                    );
                                    finalPoints = createRegularPolygon(
                                        enhancedDrawing.startPoint!,
                                        polyRadius,
                                        6
                                    );
                                    break;
                            }

                            finalizeEnhancedZone(finalPoints);
                        }
                        break;
                }
                return;
            }

            if (editMode === 'drag-sprinkler') {
                const clickedSprinkler = sprinklers.find((s) => {
                    if (!s.canvasPosition) return false;
                    const dist = calculateDistance(worldPos, s.canvasPosition);
                    return dist < 18 / viewport.zoom;
                });

                if (clickedSprinkler) {
                    setDraggedSprinkler(clickedSprinkler.id);
                    onSprinklerClick(clickedSprinkler.id);
                    return;
                }
            }

            if (editMode === 'draw' && !enhancedMode) {
                if (!isDrawing) {
                    setIsDrawing(true);
                    setCurrentPolygon([worldPos]);
                } else {
                    setCurrentPolygon([...currentPolygon, worldPos]);
                }
                return;
            }

            if (editMode === 'place') {
                onSprinklerPlaced(worldPos);
                return;
            }

            if (editMode === 'edit' && !waterSource) {
                onWaterSourcePlaced(worldPos);
                return;
            }

            if (editMode === 'main-pipe') {
                onMainPipePoint(worldPos);
                return;
            }

            if (editMode === 'connect-sprinklers' || pipeEditMode) {
                const clickedSprinkler = sprinklers.find((s) => {
                    if (!s.canvasPosition) return false;
                    const dist = calculateDistance(worldPos, s.canvasPosition);
                    return dist < 18 / viewport.zoom;
                });

                if (clickedSprinkler) {
                    onSprinklerClick(clickedSprinkler.id);
                }
            }
        },
        [
            enhancedMode,
            snapToGrid,
            snapToVertex,
            findNearestSnapPoint,
            screenToWorld,
            dimensionMode,
            tempDimensionPoints,
            addDimensionLine,
            isSettingScale,
            scalePoints,
            editMode,
            currentZoneTool,
            enhancedDrawing,
            createRectangleZone,
            createCircleZone,
            createRegularPolygon,
            finalizeEnhancedZone,
            currentPolygon,
            isDrawing,
            waterSource,
            sprinklers,
            viewport,
            pipes,
            distanceToLine,
            pipeEditMode,
            onPipeClick,
            onSprinklerPlaced,
            onWaterSourcePlaced,
            onMainPipePoint,
            onSprinklerClick,
        ]
    );

    const handleRightClick = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            e.preventDefault();

            if (
                enhancedMode &&
                currentZoneTool === 'freehand' &&
                enhancedDrawing.isDrawing &&
                enhancedDrawing.currentPoints.length >= 3
            ) {
                finalizeEnhancedZone(enhancedDrawing.currentPoints);
                return;
            }

            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const worldPos = screenToWorld({ x, y });

            if (waterSource && waterSource.canvasPosition) {
                const dist = calculateDistance(worldPos, waterSource.canvasPosition);
                if (dist < 25 / viewport.zoom) {
                    onWaterSourceDelete();
                    return;
                }
            }

            if (editMode === 'drag-sprinkler') {
                const clickedSprinkler = sprinklers.find((s) => {
                    if (!s.canvasPosition) return false;
                    const dist = calculateDistance(worldPos, s.canvasPosition);
                    return dist < 18 / viewport.zoom;
                });

                if (clickedSprinkler) {
                    onSprinklerDelete(clickedSprinkler.id);
                    return;
                }
            }

            if (isDrawing && currentPolygon.length >= 3 && !enhancedMode) {
                onZoneCreated(currentPolygon);
                setCurrentPolygon([]);
                setIsDrawing(false);
            }
        },
        [
            enhancedMode,
            currentZoneTool,
            enhancedDrawing,
            finalizeEnhancedZone,
            currentPolygon,
            isDrawing,
            waterSource,
            sprinklers,
            editMode,
            viewport,
            screenToWorld,
            onWaterSourceDelete,
            onSprinklerDelete,
            onZoneCreated,
        ]
    );

    const handleMouseUp = useCallback(() => {
        if (draggedSprinkler) {
            setDraggedSprinkler(null);
        }
    }, [draggedSprinkler]);

    const handleWheel = useCallback(
        (e: React.WheelEvent<HTMLCanvasElement>) => {
            e.preventDefault();
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            const centerX = e.clientX - rect.left;
            const centerY = e.clientY - rect.top;

            handleZoom(-e.deltaY, centerX, centerY);
        },
        [handleZoom]
    );

    const handleScaleSet = useCallback(() => {
        if (scalePoints.length === 2 && realDistance) {
            const pixelDistance = calculateDistance(scalePoints[0], scalePoints[1]);
            const realDistanceNum = parseFloat(realDistance);
            if (realDistanceNum > 0) {
                setEnhancedScale(pixelDistance / realDistanceNum);
                setShowScaleDialog(false);
                setScalePoints([]);
                setRealDistance('');
                setIsSettingScale(false);
            }
        }
    }, [scalePoints, realDistance]);

    useEffect(() => {
        const handleCancelDrawing = () => {
            console.log('🛑 Canceling drawing in Canvas Designer');

            setEnhancedDrawing({
                isDrawing: false,
                startPoint: null,
                currentPoints: [],
                previewShape: null,
            });

            setIsDrawing(false);
            setCurrentPolygon([]);
            setDistanceCursor({ show: false, distance: 0 });

            setDimensionMode(false);
            setTempDimensionPoints([]);
            setShowDimensionDirectionDialog(false);

            console.log('✅ Canvas drawing cancelled successfully');
        };

        window.addEventListener('cancelDrawing', handleCancelDrawing);

        return () => {
            window.removeEventListener('cancelDrawing', handleCancelDrawing);
        };
    }, []);

    useEffect(() => {
        const updateCanvasSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setCanvasSize({
                    width: rect.width,
                    height: rect.height,
                });
            }
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);

        return () => {
            window.removeEventListener('resize', updateCanvasSize);
        };
    }, []);

    useEffect(() => {
        try {
            const savedDimensions = localStorage.getItem('gardenDimensionLines');
            if (savedDimensions) {
                const parsed = JSON.parse(savedDimensions) as DimensionLine[];
                setDimensionLines(parsed);
            }
        } catch (error) {
            console.warn('Could not load dimension lines from localStorage:', error);
        }
    }, []);

    useEffect(() => {
        const renderLoop = () => {
            if (needsRedraw) {
                draw();
                setNeedsRedraw(false);
            }
            animationFrameRef.current = requestAnimationFrame(renderLoop);
        };

        renderLoop();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [draw, needsRedraw]);

    useEffect(() => {
        setNeedsRedraw(true);
    }, [
        gardenZones,
        sprinklers,
        waterSource,
        pipes,
        mainPipeDrawing,
        selectedSprinkler,
        selectedPipes,
        selectedSprinklersForPipe,
        currentPolygon,
        showGrid,
        showRuler,
        showSprinklerRadius,
        enhancedDrawing,
        enhancedMode,
        hoveredSnapPoint,
        scalePoints,
        showMeasurements,
        viewport,
        canvasSize,
        dimensionLines,
        showDimensions,
        tempDimensionPoints,
        distanceCursor,
        dimensionDirection,
        showDimensionDirectionDialog,
    ]);

    const renderSprinklerRadius = useCallback(
        (sprinkler: Sprinkler, isSelected: boolean): JSX.Element | null => {
            if (!sprinkler.canvasPosition || !showSprinklerRadius) return null;

            const zone = gardenZones.find((z) => z.id === sprinkler.zoneId);
            const scale = enhancedMode ? enhancedScale : canvasData.scale;

            try {
                if (
                    !zone ||
                    !zone.canvasCoordinates ||
                    zone.canvasCoordinates.length < 3 ||
                    sprinkler.zoneId === 'virtual_zone'
                ) {
                    const radiusPixels = sprinkler.type.radius * scale * viewport.zoom;
                    const screenPos = worldToScreen(sprinkler.canvasPosition);
                    return (
                        <g key={`radius-${sprinkler.id}`}>
                            <circle
                                cx={screenPos.x}
                                cy={screenPos.y}
                                r={radiusPixels}
                                fill={isSelected ? '#FFD700' + '26' : sprinkler.type.color + '26'}
                                stroke={isSelected ? '#FFD700' + '80' : sprinkler.type.color + '80'}
                                strokeWidth={2 / viewport.zoom}
                                strokeDasharray={
                                    sprinkler.zoneId === 'virtual_zone'
                                        ? `${8 / viewport.zoom},${4 / viewport.zoom}`
                                        : '0'
                                }
                            />
                        </g>
                    );
                }

                if (zone.type === 'forbidden') return null;

                const clipResult = clipCircleToPolygon(
                    sprinkler.canvasPosition,
                    sprinkler.type.radius,
                    zone.canvasCoordinates,
                    scale
                );

                const radiusPixels = sprinkler.type.radius * scale * viewport.zoom;
                const screenPos = worldToScreen(sprinkler.canvasPosition);

                if (clipResult === 'FULL_CIRCLE') {
                    return (
                        <g key={`radius-${sprinkler.id}`}>
                            <circle
                                cx={screenPos.x}
                                cy={screenPos.y}
                                r={radiusPixels}
                                fill={isSelected ? '#FFD700' + '26' : sprinkler.type.color + '26'}
                                stroke={isSelected ? '#FFD700' + '80' : sprinkler.type.color + '80'}
                                strokeWidth={2 / viewport.zoom}
                            />
                        </g>
                    );
                } else if (clipResult === 'MASKED_CIRCLE') {
                    const zoneScreenCoords = zone.canvasCoordinates.map(worldToScreen);
                    return (
                        <g key={`radius-${sprinkler.id}`}>
                            <defs>
                                <clipPath id={`clip-${sprinkler.id}`}>
                                    <polygon
                                        points={zoneScreenCoords
                                            .map((p) => `${p.x},${p.y}`)
                                            .join(' ')}
                                    />
                                </clipPath>
                            </defs>

                            <circle
                                cx={screenPos.x}
                                cy={screenPos.y}
                                r={radiusPixels}
                                fill={isSelected ? '#FFD700' + '26' : sprinkler.type.color + '26'}
                                stroke={isSelected ? '#FFD700' + '80' : sprinkler.type.color + '80'}
                                strokeWidth={2 / viewport.zoom}
                                clipPath={`url(#clip-${sprinkler.id})`}
                            />
                        </g>
                    );
                } else if (Array.isArray(clipResult) && clipResult.length >= 3) {
                    const canvasResult = clipResult as CanvasCoordinate[];
                    const screenCoords = canvasResult.map(worldToScreen);
                    const points = screenCoords.map((p) => `${p.x},${p.y}`).join(' ');
                    return (
                        <g key={`radius-${sprinkler.id}`}>
                            <polygon
                                points={points}
                                fill={isSelected ? '#FFD700' + '26' : sprinkler.type.color + '26'}
                                stroke={isSelected ? '#FFD700' + '80' : sprinkler.type.color + '80'}
                                strokeWidth={2 / viewport.zoom}
                            />
                        </g>
                    );
                }

                return null;
            } catch (error) {
                console.error('Error rendering sprinkler radius:', error);
                return null;
            }
        },
        [
            gardenZones,
            enhancedMode,
            enhancedScale,
            canvasData.scale,
            showSprinklerRadius,
            viewport,
            worldToScreen,
        ]
    );

    const handleSprinklerClick = (sprinklerId: string) => {
        if (pipeEditMode === 'add' || pipeEditMode === 'remove') {
            onSprinklerClick(sprinklerId);
        } else {
            onSprinklerClick(sprinklerId);
        }
    };

    return (
        <div ref={containerRef} className="relative h-full w-full">
            <div className="absolute bottom-2 left-2 z-10 flex gap-2">
                <button
                    onClick={() => {
                        setEnhancedMode(!enhancedMode);
                        setIsDrawing(false);
                        setCurrentPolygon([]);
                        setEnhancedDrawing({
                            isDrawing: false,
                            startPoint: null,
                            currentPoints: [],
                            previewShape: null,
                        });
                        setIsSettingScale(false);
                        setScalePoints([]);
                        setDimensionMode(false);
                        setTempDimensionPoints([]);
                    }}
                    className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                        enhancedMode
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                    }`}
                >
                    🛠️ {enhancedMode ? 'โหมดขั้นสูง' : 'เครื่องมือขั้นสูง'}
                </button>
                <div className="rounded bg-gray-800/90 px-2 py-1 text-xs text-white">
                    ซูม: {(viewport.zoom * 100).toFixed(0)}%
                </div>
            </div>

            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="h-full w-full bg-gray-900"
                style={{ cursor: isSettingScale || dimensionMode ? 'crosshair' : 'default' }}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onContextMenu={handleRightClick}
                onWheel={handleWheel}
            />

            {showSprinklerRadius && (
                <svg
                    className="pointer-events-none absolute inset-0"
                    width={canvasSize.width}
                    height={canvasSize.height}
                    viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
                >
                    {sprinklers.map((sprinkler) => {
                        const isSelected =
                            selectedSprinkler === sprinkler.id ||
                            selectedSprinklersForPipe.includes(sprinkler.id);
                        return renderSprinklerRadius(sprinkler, isSelected);
                    })}
                </svg>
            )}

            {enhancedMode && (
                <div className="absolute left-8 top-8 max-w-xs space-y-3 rounded-lg bg-gray-800/95 p-4 backdrop-blur">
                    <h4 className="text-sm font-semibold text-blue-400">
                        🏗️ เครื่องมือวาดโซนขั้นสูง
                    </h4>

                    <div className="grid grid-cols-2 gap-2">
                        {zoneDrawingTools.map((tool) => (
                            <button
                                key={tool.id}
                                onClick={() => {
                                    setCurrentZoneTool(tool.id);
                                    setEnhancedDrawing({
                                        isDrawing: false,
                                        startPoint: null,
                                        currentPoints: [],
                                        previewShape: null,
                                    });
                                }}
                                className={`rounded-lg text-xs transition-all ${
                                    currentZoneTool === tool.id && editMode === 'draw'
                                        ? 'border-2 border-blue-400 bg-blue-600 text-white'
                                        : 'border-2 border-transparent bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                                title={tool.description}
                            >
                                <div className="text-lg">{tool.icon}</div>
                                <div className="mt-1">{tool.name}</div>
                            </button>
                        ))}
                    </div>

                    <div className="border-t border-gray-600 pt-3">
                        <div className="mb-2 text-xs font-medium text-gray-300">
                            📐 เครื่องมือวัด:
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => {
                                    setDimensionMode(true);
                                    setTempDimensionPoints([]);
                                }}
                                className={`rounded p-2 text-xs transition-colors ${
                                    dimensionMode
                                        ? 'bg-yellow-600 text-white'
                                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                }`}
                            >
                                📏 เพิ่มเส้นวัด
                            </button>
                            <button
                                onClick={() => {
                                    setDimensionLines([]);
                                    try {
                                        localStorage.removeItem('gardenDimensionLines');
                                    } catch (error) {
                                        console.warn(
                                            'Could not clear dimension lines from localStorage:',
                                            error
                                        );
                                    }
                                }}
                                disabled={dimensionLines.length === 0}
                                className="rounded bg-red-600 p-2 text-xs text-white transition-colors hover:bg-red-700 disabled:bg-gray-600 disabled:text-gray-400"
                            >
                                🗑️ ลบเส้นวัด
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-gray-600 pt-3">
                        <div className="mb-2 text-xs font-medium text-gray-300">👁️ การแสดงผล:</div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                {
                                    key: 'showMeasurements',
                                    label: 'แสดงการวัด',
                                    state: showMeasurements,
                                    setState: setShowMeasurements,
                                },
                                {
                                    key: 'showDimensions',
                                    label: 'แสดงเส้นวัด',
                                    state: showDimensions,
                                    setState: setShowDimensions,
                                },
                                {
                                    key: 'snapToGrid',
                                    label: 'ดึงไปตาราง',
                                    state: snapToGrid,
                                    setState: setSnapToGrid,
                                },
                                {
                                    key: 'snapToVertex',
                                    label: 'ดึงไปจุดยอด',
                                    state: snapToVertex,
                                    setState: setSnapToVertex,
                                },
                            ].map((option) => (
                                <label key={option.key} className="flex items-center gap-2 text-xs">
                                    <input
                                        type="checkbox"
                                        checked={option.state}
                                        onChange={(e) => option.setState(e.target.checked)}
                                        className="h-3 w-3 rounded"
                                    />
                                    <span className="text-gray-300">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-gray-600 pt-3">
                        <div className="mb-2 text-xs font-medium text-gray-300">🔍 การซูม:</div>
                        <div className="flex gap-1">
                            <button
                                onClick={() =>
                                    handleZoom(-100, canvasSize.width / 2, canvasSize.height / 2)
                                }
                                className="flex-1 rounded bg-gray-600 p-1 text-xs text-white hover:bg-gray-500"
                            >
                                ลด
                            </button>
                            <button
                                onClick={() => {
                                    setViewport({
                                        zoom: 1,
                                        panX: 0,
                                        panY: 0,
                                        scale: enhancedScale,
                                    });
                                }}
                                className="flex-1 rounded bg-gray-600 p-1 text-xs text-white hover:bg-gray-500"
                            >
                                รีเซ็ต
                            </button>
                            <button
                                onClick={() =>
                                    handleZoom(100, canvasSize.width / 2, canvasSize.height / 2)
                                }
                                className="flex-1 rounded bg-gray-600 p-1 text-xs text-white hover:bg-gray-500"
                            >
                                เพิ่ม
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!enhancedMode && (
                <div className="absolute right-4 top-4 space-y-2 rounded-lg bg-gray-800/90 p-4 backdrop-blur">
                    <h4 className="text-sm font-semibold text-blue-400">🎛️ การแสดงผล</h4>

                    <label className="flex items-center gap-2 text-sm text-white">
                        <input
                            type="checkbox"
                            checked={showGrid}
                            onChange={(e) => setShowGrid(e.target.checked)}
                            className="rounded"
                        />
                        🔲 แสดงตาราง
                    </label>

                    <label className="flex items-center gap-2 text-sm text-white">
                        <input
                            type="checkbox"
                            checked={showSprinklerRadius}
                            onChange={(e) => setShowSprinklerRadius(e.target.checked)}
                            className="rounded"
                        />
                        💧 แสดงรัศมีหัวฉีด
                    </label>

                    <label className="flex items-center gap-2 text-sm text-white">
                        <input
                            type="checkbox"
                            checked={snapToGrid}
                            onChange={(e) => setSnapToGrid(e.target.checked)}
                            className="rounded"
                        />
                        🔗 ดึงไปตาราง
                    </label>

                    <div className="border-t border-gray-600 pt-3">
                        <div className="mb-2 text-xs font-medium text-gray-300">🔍 การซูม:</div>
                        <div className="flex gap-1">
                            <button
                                onClick={() =>
                                    handleZoom(-100, canvasSize.width / 2, canvasSize.height / 2)
                                }
                                className="flex-1 rounded bg-gray-600 p-1 text-xs text-white hover:bg-gray-500"
                            >
                                ลด
                            </button>
                            <button
                                onClick={() => {
                                    setViewport({
                                        zoom: 1,
                                        panX: 0,
                                        panY: 0,
                                        scale: canvasData.scale,
                                    });
                                }}
                                className="flex-1 rounded bg-gray-600 p-1 text-xs text-white hover:bg-gray-500"
                            >
                                รีเซ็ต
                            </button>
                            <button
                                onClick={() =>
                                    handleZoom(100, canvasSize.width / 2, canvasSize.height / 2)
                                }
                                className="flex-1 rounded bg-gray-600 p-1 text-xs text-white hover:bg-gray-500"
                            >
                                เพิ่ม
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDimensionDirectionDialog && tempDimensionPoints.length === 2 && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
                        <h3 className="mb-4 text-lg font-semibold text-yellow-400">
                            📐 เลือกทิศทางเส้นวัด
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'auto', label: 'อัตโนมัติ', icon: '🔄' },
                                    { id: 'top', label: 'บน', icon: '⬆️' },
                                    { id: 'bottom', label: 'ล่าง', icon: '⬇️' },
                                    { id: 'left', label: 'ซ้าย', icon: '⬅️' },
                                    { id: 'right', label: 'ขวา', icon: '➡️' },
                                ].map((dir) => (
                                    <button
                                        key={dir.id}
                                        onClick={() => setDimensionDirection(dir.id as any)}
                                        className={`rounded-lg p-3 text-sm transition-all ${
                                            dimensionDirection === dir.id
                                                ? 'border-2 border-yellow-400 bg-yellow-600 text-white'
                                                : 'border-2 border-transparent bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        <div className="text-lg">{dir.icon}</div>
                                        <div className="mt-1">{dir.label}</div>
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        if (tempDimensionPoints.length === 2) {
                                            addDimensionLine(
                                                tempDimensionPoints[0],
                                                tempDimensionPoints[1],
                                                dimensionDirection
                                            );
                                        }
                                        setShowDimensionDirectionDialog(false);
                                        setTempDimensionPoints([]);
                                        setDimensionMode(false);
                                    }}
                                    className="flex-1 rounded-lg bg-yellow-600 px-4 py-2 font-medium transition-colors hover:bg-yellow-700"
                                >
                                    สร้างเส้นวัด
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDimensionDirectionDialog(false);
                                        setTempDimensionPoints([]);
                                        setDimensionMode(false);
                                    }}
                                    className="flex-1 rounded-lg bg-gray-600 px-4 py-2 font-medium transition-colors hover:bg-gray-700"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showScaleDialog && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
                        <h3 className="mb-4 text-lg font-semibold text-yellow-400">
                            📐 ตั้งค่ามาตราส่วน
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    ระยะทางจริงระหว่าง 2 จุดที่วัด (เมตร):
                                </label>
                                <input
                                    type="number"
                                    value={realDistance}
                                    onChange={(e) => setRealDistance(e.target.value)}
                                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white"
                                    placeholder="เช่น 5.5"
                                    step="0.1"
                                    min="0.1"
                                />
                            </div>
                            <div className="text-sm text-gray-400">
                                ระยะทางในพิกเซล:{' '}
                                {scalePoints.length === 2
                                    ? formatEnhancedDistance(
                                          calculateDistance(scalePoints[0], scalePoints[1])
                                      )
                                    : '0 px'}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleScaleSet}
                                    disabled={!realDistance || scalePoints.length !== 2}
                                    className="flex-1 rounded-lg bg-yellow-600 px-4 py-2 font-medium transition-colors hover:bg-yellow-700 disabled:bg-gray-600"
                                >
                                    ตั้งค่า
                                </button>
                                <button
                                    onClick={() => {
                                        setShowScaleDialog(false);
                                        setScalePoints([]);
                                        setRealDistance('');
                                        setIsSettingScale(false);
                                    }}
                                    className="flex-1 rounded-lg bg-gray-600 px-4 py-2 font-medium transition-colors hover:bg-gray-700"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {enhancedMode ? (
                <div className="absolute bottom-4 right-4 max-w-sm rounded-lg border border-blue-500 bg-gray-800/95 p-3 text-sm text-white backdrop-blur">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-blue-400">🛠️</span>
                        <span className="font-semibold">โหมดวาดโซนขั้นสูง</span>
                    </div>
                    {dimensionMode ? (
                        <div>
                            <div className="mb-1 font-semibold text-yellow-400">📐 โหมดวัดระยะ</div>
                            <div>
                                คลิกจุดที่ 1 และจุดที่ 2 เพื่อสร้างเส้นวัด (
                                {tempDimensionPoints.length}/2)
                            </div>
                        </div>
                    ) : isSettingScale ? (
                        <div>
                            <div className="mb-1 font-semibold text-yellow-400">
                                📐 ตั้งค่ามาตราส่วน
                            </div>
                            <div>คลิก 2 จุดเพื่อวัดระยะ ({scalePoints.length}/2)</div>
                        </div>
                    ) : editMode === 'draw' ? (
                        <div>
                            <div className="mb-1 font-semibold text-blue-400">
                                ✏️ กำลังวาดโซน -{' '}
                                {zoneDrawingTools.find((t) => t.id === currentZoneTool)?.name}
                            </div>
                            {currentZoneTool === 'freehand' ? (
                                <div>
                                    {enhancedDrawing.isDrawing
                                        ? `คลิกเพื่อเพิ่มจุด (${enhancedDrawing.currentPoints.length} จุด) • คลิกขวาเพื่อจบ`
                                        : 'คลิกเพื่อเริ่มวาดโซน'}
                                    {distanceCursor.show && (
                                        <div className="mt-1 text-green-400">
                                            ระยะทาง:{' '}
                                            {formatEnhancedDistance(distanceCursor.distance)}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    {enhancedDrawing.isDrawing
                                        ? 'คลิกจุดที่ 2 เพื่อกำหนดขนาด'
                                        : 'คลิกจุดแรกเพื่อเริ่มวาด'}
                                    {distanceCursor.show && (
                                        <div className="mt-1 text-green-400">
                                            ระยะทาง:{' '}
                                            {formatEnhancedDistance(distanceCursor.distance)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : editMode === 'connect-sprinklers' || pipeEditMode ? (
                        <div>
                            <div className="mb-1 font-semibold text-purple-400">
                                🔧 {pipeEditMode === 'add' ? 'เพิ่มท่อ' : pipeEditMode === 'remove' ? 'ลบท่อ' : 'แก้ไขท่อ'}
                            </div>
                            <div>
                                {pipeEditMode === 'add' 
                                    ? `เลือกหัวฉีด 2 ตัวเพื่อเชื่อมต่อ (${selectedSprinklersForPipe.length}/2)`
                                    : pipeEditMode === 'remove'
                                    ? `เลือกหัวฉีด 2 ตัวเพื่อลบท่อ (${selectedSprinklersForPipe.length}/2)`
                                    : 'คลิกหัวฉีดเพื่อเลือก หรือคลิกท่อเพื่อลบ'
                                }
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="mb-1 font-semibold text-gray-400">เลือกเครื่องมือ</div>
                            <div>เลือกเครื่องมือวาดโซนจากแผงด้านซ้าย • ใช้ล้อเมาส์เพื่อซูม</div>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {editMode === 'draw' && (
                        <div className="absolute bottom-4 right-4 max-w-sm rounded-lg border border-blue-500 bg-gray-800/90 p-4 text-sm text-white backdrop-blur">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="text-blue-400">✏️</span>
                                <span className="font-semibold">โหมดวาดโซน</span>
                            </div>
                            {isDrawing ? (
                                <div className="space-y-1">
                                    <div>📍 คลิกเพื่อเพิ่มจุด ({currentPolygon.length} จุด)</div>
                                    <div>🖱️ คลิกขวาเพื่อจบการวาด</div>
                                    <div>🔍 ใช้ล้อเมาส์เพื่อซูม</div>
                                </div>
                            ) : (
                                <div>
                                    <div>
                                        🎯 คลิกเพื่อเริ่มวาดโซน{' '}
                                        {ZONE_TYPES.find((z) => z.id === selectedZoneType)?.name}
                                    </div>
                                    <div>🔍 ใช้ล้อเมาส์เพื่อซูม</div>
                                </div>
                            )}
                        </div>
                    )}

                    {editMode === 'place' && (
                        <div className="absolute bottom-4 left-4 rounded-lg border border-green-500 bg-gray-800/90 p-4 text-sm text-white backdrop-blur">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="text-green-400">💧</span>
                                <span className="font-semibold">โหมดวางหัวฉีด</span>
                            </div>
                            <div>🎯 คลิกเพื่อวางหัวฉีด</div>
                            <div className="mt-1 text-xs text-gray-300">
                                รัศมี: {manualSprinklerRadius}ม. • 🔍 ใช้ล้อเมาส์เพื่อซูม
                            </div>
                        </div>
                    )}

                    {editMode === 'edit' && (
                        <div className="absolute bottom-4 left-4 rounded-lg border border-yellow-500 bg-gray-800/90 p-4 text-sm text-white backdrop-blur">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="text-yellow-400">🚰</span>
                                <span className="font-semibold">โหมดจัดการแหล่งน้ำ</span>
                            </div>
                            <div>🎯 คลิกเพื่อวางแหล่งน้ำ</div>
                            <div>🖱️ คลิกขวาบนแหล่งน้ำเพื่อลบ</div>
                            <div className="text-xs text-gray-300">🔍 ใช้ล้อเมาส์เพื่อซูม</div>
                        </div>
                    )}

                    {editMode === 'drag-sprinkler' && (
                        <div className="absolute bottom-4 left-4 rounded-lg border border-orange-500 bg-gray-800/90 p-4 text-sm text-white backdrop-blur">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="text-orange-400">↔️</span>
                                <span className="font-semibold">โหมดย้ายหัวฉีด</span>
                            </div>
                            <div>🖱️ ลากหัวฉีดเพื่อย้ายตำแหน่ง</div>
                            <div>🖱️ คลิกขวาเพื่อลบหัวฉีด</div>
                            <div className="text-xs text-gray-300">🔍 ใช้ล้อเมาส์เพื่อซูม</div>
                        </div>
                    )}

                    {(editMode === 'connect-sprinklers' || pipeEditMode) && (
                        <div className="absolute bottom-4 left-4 rounded-lg border border-purple-500 bg-gray-800/90 p-4 text-sm text-white backdrop-blur">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="text-purple-400">🔧</span>
                                <span className="font-semibold">
                                    {pipeEditMode === 'add' ? 'เพิ่มท่อ' : pipeEditMode === 'remove' ? 'ลบท่อ' : 'แก้ไขท่อ'}
                                </span>
                            </div>
                            <div>
                                {pipeEditMode === 'add' 
                                    ? `🎯 เลือกหัวฉีด 2 ตัวเพื่อเชื่อมต่อ (${selectedSprinklersForPipe.length}/2)`
                                    : pipeEditMode === 'remove'
                                    ? `🎯 เลือกหัวฉีด 2 ตัวเพื่อลบท่อ (${selectedSprinklersForPipe.length}/2)`
                                    : '🎯 คลิกหัวฉีดเพื่อเลือก หรือคลิกท่อเพื่อลบ'
                                }
                            </div>
                            <div className="text-xs text-gray-300">🔍 ใช้ล้อเมาส์เพื่อซูม</div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CanvasDesigner;