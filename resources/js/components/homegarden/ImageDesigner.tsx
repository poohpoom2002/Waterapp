/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// resources/js/components/homegarden/ImageDesigner.tsx - Fixed with pipe editing and improved radius rendering
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
    CanvasCoordinate,
    GardenZone,
    Sprinkler,
    WaterSource,
    Pipe,
    ZONE_TYPES,
    isPointInPolygon,
    calculateDistance,
    calculatePolygonArea,
    formatArea,
    formatDistance,
    clipCircleToPolygon,
    canvasToGPS,
    calculatePipeStatistics,
} from '../../utils/homeGardenData';
import { useLanguage } from '../../contexts/LanguageContext';

interface ZoneDrawingTool {
    id: string;
    name: string;
    icon: string;
    description: string;
    type: 'freehand' | 'rectangle' | 'circle';
}

interface DimensionLine {
    id: string;
    start: CanvasCoordinate;
    end: CanvasCoordinate;
    label: string;
    distance: number;
    direction: 'auto' | 'left' | 'right' | 'top' | 'bottom';
}

interface ImageDesignerProps {
    imageData: any;
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
    onImageUpload: (file: File) => void;
    onZoneCreated: (coordinates: CanvasCoordinate[]) => void;
    onSprinklerPlaced: (position: CanvasCoordinate) => void;
    onWaterSourcePlaced: (position: CanvasCoordinate) => void;
    onMainPipePoint: (point: CanvasCoordinate) => void;
    onSprinklerDragged: (sprinklerId: string, newPos: CanvasCoordinate) => void;
    onSprinklerClick: (sprinklerId: string) => void;
    onSprinklerDelete: (sprinklerId: string) => void;
    onWaterSourceDelete: () => void;
    onPipeClick: (pipeId: string) => void;
    onScaleChange: (scale: number) => void;
    pipeEditMode?: string;
}

const ImageDesigner: React.FC<ImageDesignerProps> = ({
    imageData,
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
    onImageUpload,
    onZoneCreated,
    onSprinklerPlaced,
    onWaterSourcePlaced,
    onMainPipePoint,
    onSprinklerDragged,
    onSprinklerClick,
    onSprinklerDelete,
    onWaterSourceDelete,
    onPipeClick,
    onScaleChange,
    pipeEditMode,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useLanguage();
    const [currentZoneTool, setCurrentZoneTool] = useState<string>('freehand');
    const [enhancedDrawing, setEnhancedDrawing] = useState({
        isDrawing: false,
        startPoint: null as CanvasCoordinate | null,
        currentPoints: [] as CanvasCoordinate[],
        previewShape: null as CanvasCoordinate[] | null,
    });

    const [dimensionLines, setDimensionLines] = useState<DimensionLine[]>([]);
    const [dimensionMode, setDimensionMode] = useState(false);
    const [tempDimensionPoints, setTempDimensionPoints] = useState<CanvasCoordinate[]>([]);
    const [dimensionDirection, setDimensionDirection] = useState<
        'auto' | 'left' | 'right' | 'top' | 'bottom'
    >('auto');
    const [showDimensionDirectionDialog, setShowDimensionDirectionDialog] = useState(false);

    const [showGrid, setShowGrid] = useState(false);
    const [gridSize, setGridSize] = useState(50);
    const [enableGridSnap, setEnableGridSnap] = useState(false);

    // Auto-enable grid snap when grid is shown
    useEffect(() => {
        setEnableGridSnap(showGrid);
    }, [showGrid]);

    // เพิ่ม state สำหรับการจัดการรูปภาพ
    const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
    const [imageAspectRatio, setImageAspectRatio] = useState(1);

    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStartPos, setPanStartPos] = useState<{ x: number; y: number } | null>(null);
    const [lastPanOffset, setLastPanOffset] = useState({ x: 0, y: 0 });

    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPolygon, setCurrentPolygon] = useState<CanvasCoordinate[]>([]);
    const [draggedItem, setDraggedItem] = useState<{
        type: 'sprinkler' | 'waterSource';
        id: string;
    } | null>(null);

    const [measurementMode, setMeasurementMode] = useState<'line' | null>(null);
    const [measurementLine, setMeasurementLine] = useState<{
        start: CanvasCoordinate | null;
        end: CanvasCoordinate | null;
        pixelDistance?: number;
    }>({ start: null, end: null });
    const [realDistance, setRealDistance] = useState<string>('');
    const [showScaleDialog, setShowScaleDialog] = useState(false);
    const [measurementHistory, setMeasurementHistory] = useState<
        {
            pixelDistance: number;
            realDistance: number;
            scale: number;
            timestamp: Date;
        }[]
    >([]);

    const [distanceCursor, setDistanceCursor] = useState<{ show: boolean; distance: number }>({
        show: false,
        distance: 0,
    });
    const [mousePos, setMousePos] = useState<CanvasCoordinate>({ x: 0, y: 0 });

    const isScaleSet = useMemo(() => {
        const hasValidScale = imageData?.scale && imageData.scale !== 20 && imageData.scale > 0;
        const isMarkedSet = imageData?.isScaleSet === true;
        return hasValidScale || isMarkedSet;
    }, [imageData]);

    const currentScale = useMemo(() => {
        return imageData?.scale || 20;
    }, [imageData?.scale]);

    const zoneDrawingTools: ZoneDrawingTool[] = [
        {
            id: 'freehand',
            name: t('วาดอิสระ'),
            icon: '✏️',
            description: t('วาดโซนด้วยการคลิกทีละจุด (เหมือนเดิม)'),
            type: 'freehand',
        },
        {
            id: 'rectangle',
            name: t('สี่เหลี่ยม'),
            icon: '⬜',
            description: t('วาดโซนสี่เหลี่ยมผืนผ้า (บ้าน, แปลงปลูก)'),
            type: 'rectangle',
        },
        {
            id: 'circle',
            name: t('วงกลม'),
            icon: '⭕',
            description: t('วาดโซนทรงกลม (สนาม, บ่อน้ำ)'),
            type: 'circle',
        },
    ];

    const formatEnhancedDistance = useCallback(
        (pixels: number) => {
            const meters = pixels / currentScale;
            if (meters >= 1) {
                return `${meters.toFixed(2)} ${t('ม.')}`;
            } else {
                return `${(meters * 100).toFixed(1)} ${t('ซม.')}`;
            }
        },
        [currentScale, t]
    );

    const formatEnhancedArea = useCallback(
        (pixels: number) => {
            const sqMeters = pixels / (currentScale * currentScale);
            if (sqMeters >= 1) {
                return `${sqMeters.toFixed(2)} ${t('ตร.ม.')}`;
            } else {
                return `${(sqMeters * 10000).toFixed(0)} ${t('ตร.ซม.')}`;
            }
        },
        [currentScale, t]
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

    const getCanvasCoordinate = useCallback(
        (clientX: number, clientY: number): CanvasCoordinate => {
            if (!containerRef.current) return { x: 0, y: 0 };

            const rect = containerRef.current.getBoundingClientRect();
            let x = (clientX - rect.left - panOffset.x) / zoom;
            let y = (clientY - rect.top - panOffset.y) / zoom;

            // Apply grid snapping if enabled and grid is visible
            // Only snap when drawing zones or adding dimension lines
            if (enableGridSnap && showGrid && (editMode === 'draw' || dimensionMode)) {
                // Snap to fine grid (1/5 of main grid) for more precision
                const fineGridSize = gridSize / 5;
                x = Math.round(x / fineGridSize) * fineGridSize;
                y = Math.round(y / fineGridSize) * fineGridSize;
            }

            return { x, y };
        },
        [zoom, panOffset, enableGridSnap, showGrid, gridSize, editMode, dimensionMode]
    );

    const findSprinklerAtPosition = useCallback(
        (pos: CanvasCoordinate): Sprinkler | null => {
            return (
                sprinklers.find((s) => {
                    if (!s.canvasPosition) return false;
                    const dist = Math.sqrt(
                        Math.pow(pos.x - s.canvasPosition.x, 2) +
                            Math.pow(pos.y - s.canvasPosition.y, 2)
                    );
                    return dist < 20;
                }) || null
            );
        },
        [sprinklers]
    );

    const findWaterSourceAtPosition = useCallback(
        (pos: CanvasCoordinate): boolean => {
            if (!waterSource || !waterSource.canvasPosition) return false;
            const dist = Math.sqrt(
                Math.pow(pos.x - waterSource.canvasPosition.x, 2) +
                    Math.pow(pos.y - waterSource.canvasPosition.y, 2)
            );
            return dist < 25;
        },
        [waterSource]
    );

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
        (pos: CanvasCoordinate): string | null => {
            for (const dimension of dimensionLines) {
                const dx = dimension.end.x - dimension.start.x;
                const dy = dimension.end.y - dimension.start.y;
                const length = Math.sqrt(dx * dx + dy * dy);

                if (length < 1) continue;

                const unitX = dx / length;
                const unitY = dy / length;
                const offsetDistance = 30;

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

                const midX = (dimension.start.x + dimension.end.x) / 2 + offsetX;
                const midY = (dimension.start.y + dimension.end.y) / 2 + offsetY;

                const deleteButtonX = midX + 20;
                const deleteButtonY = midY - 2;

                const distToDelete = Math.sqrt(
                    Math.pow(pos.x - deleteButtonX, 2) + Math.pow(pos.y - deleteButtonY, 2)
                );

                if (distToDelete < 10) {
                    return dimension.id;
                }
            }
            return null;
        },
        [dimensionLines]
    );

    const finalizeEnhancedZone = useCallback(
        (coordinates: CanvasCoordinate[]) => {
            const area = calculatePolygonArea(coordinates, currentScale);

            if (area > 1200) {
                alert(
                    `❌ ${t('ขนาดพื้นที่เกินกำหนด!')}\n\n${t('ขนาดที่วาด:')} ${formatArea(area)}\n${t('ขนาดสูงสุดที่อนุญาต:')} 1200 ${t('ตร.ม.')}\n\n${t('กรุณาวาดพื้นที่ให้มีขนาดเล็กลง')}`
                );
                return;
            }

            onZoneCreated(coordinates);

            // Reset ทุก state ที่เกี่ยวข้องกับการวาด
            setEnhancedDrawing({
                isDrawing: false,
                startPoint: null,
                currentPoints: [],
                previewShape: null,
            });

            setIsDrawing(false);
            setCurrentPolygon([]);
            setDistanceCursor({ show: false, distance: 0 });

            // Reset mouse position เพื่อป้องกัน drift
            setMousePos({ x: 0, y: 0 });
        },
        [currentScale, onZoneCreated, t]
    );

    const cancelDrawing = useCallback(() => {
        setEnhancedDrawing({
            isDrawing: false,
            startPoint: null,
            currentPoints: [],
            previewShape: null,
        });
        setIsDrawing(false);
        setCurrentPolygon([]);
        setDistanceCursor({ show: false, distance: 0 });

        // Reset mouse position และ cursor state
        setMousePos({ x: 0, y: 0 });
    }, []);

    const handleFileChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const imageData = {
                        url: e.target?.result as string,
                        width: img.width,
                        height: img.height,
                        scale: 20,
                        isScaleSet: false,
                    };

                    onImageUpload(file);
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        },
        [onImageUpload]
    );

    // เพิ่ม useEffect เพื่อเรียกใช้ centerImage เมื่อ imageData เปลี่ยน
    useEffect(() => {
        if (imageData) {
            setTimeout(() => {
                centerImage();
            }, 100);
        }
    }, [imageData]);

    // เพิ่มฟังก์ชันสำหรับการจัดการรูปภาพ - แก้ไขให้รูปเต็มพื้นที่
    const centerImage = useCallback(() => {
        if (!containerRef.current || !imageData) return;

        const container = containerRef.current.getBoundingClientRect();
        const containerWidth = container.width;
        const containerHeight = container.height;

        const imageWidth = imageData?.width || 0;
        const imageHeight = imageData?.height || 0;

        // คำนวณอัตราส่วนของรูปภาพ
        const aspectRatio = imageWidth / imageHeight;
        setImageAspectRatio(aspectRatio);

        // คำนวณขนาดให้เต็มพื้นที่
        const containerAspectRatio = containerWidth / containerHeight;

        let displayWidth, displayHeight;

        if (aspectRatio > containerAspectRatio) {
            // รูปภาพกว้างกว่า container ให้ปรับตามความกว้าง
            displayWidth = containerWidth;
            displayHeight = containerWidth / aspectRatio;
        } else {
            // รูปภาพสูงกว่า container ให้ปรับตามความสูง
            displayHeight = containerHeight;
            displayWidth = containerHeight * aspectRatio;
        }

        // คำนวณตำแหน่งกึ่งกลาง
        const centerX = (containerWidth - displayWidth) / 2;
        const centerY = (containerHeight - displayHeight) / 2;

        setImagePosition({ x: centerX, y: centerY });
        setPanOffset({ x: centerX, y: centerY });
        setLastPanOffset({ x: centerX, y: centerY });

        // ตั้งค่า zoom ให้เหมาะสมกับขนาดที่คำนวณ
        const zoomX = displayWidth / imageWidth;
        const zoomY = displayHeight / imageHeight;
        const newZoom = Math.min(zoomX, zoomY);
        setZoom(newZoom);
    }, [imageData]);

    // ปิดการลากรูปภาพในโหมดรูปแบบแปลน
    const handleImageDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        // ไม่ทำการลากรูปภาพในโหมดรูปแบบแปลน
    }, []);

    const handleImageDragMove = useCallback((e: React.MouseEvent) => {
        // ไม่ทำการลากรูปภาพในโหมดรูปแบบแปลน
    }, []);

    const handleImageDragEnd = useCallback(() => {
        // ไม่ทำการลากรูปภาพในโหมดรูปแบบแปลน
    }, []);

    // ฟังก์ชันสำหรับการซูมที่รักษาอัตราส่วน
    const handleZoom = useCallback(
        (delta: number, mouseX: number, mouseY: number) => {
            const zoomFactor = delta > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));

            // คำนวณจุดศูนย์กลางของการซูม
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const centerX = mouseX - rect.left;
            const centerY = mouseY - rect.top;

            // คำนวณการเปลี่ยนแปลงของ pan offset
            const zoomRatio = newZoom / zoom;
            const newPanX = centerX - (centerX - panOffset.x) * zoomRatio;
            const newPanY = centerY - (centerY - panOffset.y) * zoomRatio;

            setZoom(newZoom);
            setPanOffset({ x: newPanX, y: newPanY });
            setLastPanOffset({ x: newPanX, y: newPanY });
        },
        [zoom, panOffset]
    );

    const calculatePixelDistance = useCallback(
        (point1: CanvasCoordinate, point2: CanvasCoordinate): number => {
            const dx = point2.x - point1.x;
            const dy = point2.y - point1.y;
            return Math.sqrt(dx * dx + dy * dy);
        },
        []
    );

    const validateMeasurement = useCallback((pixels: number, meters: number): boolean => {
        if (pixels <= 0 || meters <= 0) return false;
        const calculatedScale = pixels / meters;
        return calculatedScale >= 1 && calculatedScale <= 1000;
    }, []);

    const handleMeasurementClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!containerRef.current || measurementMode !== 'line') return;

            const point = getCanvasCoordinate(e.clientX, e.clientY);
            const clickedSprinkler = findSprinklerAtPosition(point);
            const snapPoint = clickedSprinkler ? clickedSprinkler.canvasPosition! : point;

            if (!measurementLine.start) {
                setMeasurementLine({ start: snapPoint, end: null });
            } else if (!measurementLine.end) {
                const pixelDistance = calculatePixelDistance(measurementLine.start, snapPoint);
                setMeasurementLine({
                    ...measurementLine,
                    end: snapPoint,
                    pixelDistance,
                });
                setShowScaleDialog(true);
            }
        },
        [
            measurementMode,
            measurementLine,
            getCanvasCoordinate,
            findSprinklerAtPosition,
            calculatePixelDistance,
        ]
    );

    const handleScaleSubmit = useCallback(() => {
        if (
            !measurementLine.start ||
            !measurementLine.end ||
            !realDistance ||
            !measurementLine.pixelDistance
        ) {
            return;
        }

        const realDistanceNum = parseFloat(realDistance);
        if (isNaN(realDistanceNum) || realDistanceNum <= 0) {
            return;
        }

        if (!validateMeasurement(measurementLine.pixelDistance, realDistanceNum)) {
            return;
        }

        const newScale = measurementLine.pixelDistance / realDistanceNum;

        const newMeasurement = {
            pixelDistance: measurementLine.pixelDistance,
            realDistance: realDistanceNum,
            scale: newScale,
            timestamp: new Date(),
        };
        setMeasurementHistory((prev) => [...prev, newMeasurement]);

        onScaleChange(newScale);

        setMeasurementMode(null);
        setMeasurementLine({ start: null, end: null });
        setRealDistance('');
        setShowScaleDialog(false);
    }, [measurementLine, realDistance, onScaleChange, validateMeasurement]);

    const resetScale = useCallback(() => {
        onScaleChange(20);
        setMeasurementMode(null);
        setMeasurementLine({ start: null, end: null });
        setRealDistance('');
        setMeasurementHistory([]);

        if (imageData?.isScaleSet) {
            onScaleChange(20);
        }
    }, [onScaleChange, imageData]);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!containerRef.current || !imageData) return;

            if (measurementMode) {
                handleMeasurementClick(e);
                return;
            }

            if (!isScaleSet) {
                return;
            }

            const point = getCanvasCoordinate(e.clientX, e.clientY);

            // ปิดการ panning และการลากรูปภาพในโหมดรูปแบบแปลน
            if (
                e.button === 0 &&
                editMode !== 'draw' &&
                editMode !== 'place' &&
                editMode !== 'edit' &&
                editMode !== 'main-pipe' &&
                editMode !== 'drag-sprinkler' &&
                editMode !== 'connect-sprinklers' &&
                !dimensionMode &&
                !draggedItem &&
                !measurementMode &&
                !pipeEditMode
            ) {
                // ไม่ทำการ panning หรือการลากรูปภาพในโหมดรูปแบบแปลน
                return;
            }

            if (dimensionMode) {
                if (tempDimensionPoints.length === 0) {
                    const clickedSprinkler = findSprinklerAtPosition(point);
                    const snapPoint = clickedSprinkler ? clickedSprinkler.canvasPosition! : point;
                    setTempDimensionPoints([snapPoint]);
                } else if (tempDimensionPoints.length === 1) {
                    const clickedSprinkler = findSprinklerAtPosition(point);
                    const snapPoint = clickedSprinkler ? clickedSprinkler.canvasPosition! : point;
                    const start = tempDimensionPoints[0];
                    const end = snapPoint;
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
                    setTempDimensionPoints([start, snapPoint]);
                }
                return;
            }

            const clickedDimensionId = checkDimensionLineClick(point);
            if (clickedDimensionId) {
                removeDimensionLine(clickedDimensionId);
                return;
            }

            try {
                // Handle pipe click for pipe selection
                if (editMode === 'select-pipes' || pipeEditMode) {
                    for (const pipe of pipes) {
                        if (!pipe.canvasStart || !pipe.canvasEnd) continue;
                        const dist = distanceToLine(point, pipe.canvasStart, pipe.canvasEnd);
                        if (dist < 5) {
                            onPipeClick(pipe.id);
                            return;
                        }
                    }
                }

                if (waterSource && waterSource.canvasPosition) {
                    const dist = Math.sqrt(
                        Math.pow(point.x - waterSource.canvasPosition.x, 2) +
                            Math.pow(point.y - waterSource.canvasPosition.y, 2)
                    );
                    if (dist < 25) {
                        if (editMode === 'drag-sprinkler') {
                            setDraggedItem({ type: 'waterSource', id: waterSource.id });
                            return;
                        }
                    }
                }

                if (editMode === 'drag-sprinkler') {
                    const clickedSprinkler = sprinklers.find((s) => {
                        if (!s.canvasPosition) return false;
                        const dist = Math.sqrt(
                            Math.pow(point.x - s.canvasPosition.x, 2) +
                                Math.pow(point.y - s.canvasPosition.y, 2)
                        );
                        return dist < 20;
                    });

                    if (clickedSprinkler) {
                        setDraggedItem({ type: 'sprinkler', id: clickedSprinkler.id });
                        return;
                    }
                }

                // Handle zone drawing tools (rectangle, circle, polygon) - only when editMode is 'draw'
                if (editMode === 'draw' && ['rectangle', 'circle', 'polygon', 'freehand'].includes(currentZoneTool)) {
                    switch (currentZoneTool) {
                        case 'freehand':
                            if (!enhancedDrawing.isDrawing && !isDrawing) {
                                setIsDrawing(true);
                                setCurrentPolygon([point]);
                                setEnhancedDrawing({
                                    isDrawing: true,
                                    startPoint: point,
                                    currentPoints: [point],
                                    previewShape: null,
                                });
                            } else {
                                setCurrentPolygon([...currentPolygon, point]);
                                setEnhancedDrawing((prev) => ({
                                    ...prev,
                                    currentPoints: [...prev.currentPoints, point],
                                }));
                            }
                            break;

                        case 'rectangle':
                        case 'circle':
                        case 'polygon':
                            if (!enhancedDrawing.isDrawing) {
                                setEnhancedDrawing({
                                    isDrawing: true,
                                    startPoint: point,
                                    currentPoints: [point],
                                    previewShape: null,
                                });
                            } else {
                                let finalPoints: CanvasCoordinate[] = [];

                                switch (currentZoneTool) {
                                    case 'rectangle': {
                                        finalPoints = createRectangleZone(
                                            enhancedDrawing.startPoint!,
                                            point
                                        );
                                        break;
                                    }
                                    case 'circle': {
                                        const radius = calculateDistance(
                                            enhancedDrawing.startPoint!,
                                            point
                                        );
                                        finalPoints = createCircleZone(
                                            enhancedDrawing.startPoint!,
                                            radius
                                        );
                                        break;
                                    }
                                    case 'polygon': {
                                        const polyRadius = calculateDistance(
                                            enhancedDrawing.startPoint!,
                                            point
                                        );
                                        finalPoints = createRegularPolygon(
                                            enhancedDrawing.startPoint!,
                                            polyRadius,
                                            6
                                        );
                                        break;
                                    }
                                }

                                finalizeEnhancedZone(finalPoints);
                            }
                            break;
                    }
                    return;
                }

                // Handle other tools that should work without needing to press "ใช้เครื่องมือวาด"
                if (editMode === 'place') {
                    onSprinklerPlaced(point);
                    return;
                }

                if (editMode === 'edit') {
                    onWaterSourcePlaced(point);
                    return;
                }

                if (editMode === 'main-pipe') {
                    onMainPipePoint(point);
                    return;
                }

                if (editMode === 'connect-sprinklers' || pipeEditMode) {
                    const clickedSprinkler = sprinklers.find((s) => {
                        if (!s.canvasPosition) return false;
                        const dist = Math.sqrt(
                            Math.pow(point.x - s.canvasPosition.x, 2) +
                                Math.pow(point.y - s.canvasPosition.y, 2)
                        );
                        return dist < 20;
                    });

                    if (clickedSprinkler) {
                        onSprinklerClick(clickedSprinkler.id);
                    }
                }
            } catch (error) {
                console.error('Error handling mouse down:', error);
            }
        },
        [
            editMode,
            currentPolygon,
            sprinklers,
            waterSource,
            pipes,
            isDrawing,
            measurementMode,
            isScaleSet,
            handleMeasurementClick,
            imageData,
            dimensionMode,
            tempDimensionPoints,
            currentZoneTool,
            enhancedDrawing,
            createRectangleZone,
            createCircleZone,
            createRegularPolygon,
            finalizeEnhancedZone,
            checkDimensionLineClick,
            removeDimensionLine,
            findSprinklerAtPosition,
            getCanvasCoordinate,
            panOffset,
            draggedItem,
            pipeEditMode,
            distanceToLine,
            onSprinklerPlaced,
            onWaterSourcePlaced,
            onMainPipePoint,
            onSprinklerClick,
            onPipeClick,
        ]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!containerRef.current) return;

            const point = getCanvasCoordinate(e.clientX, e.clientY);
            setMousePos(point);

            // จัดการการลากรูปภาพ
            if (isDraggingImage) {
                handleImageDragMove(e);
                return;
            }

            if (isPanning && panStartPos) {
                const deltaX = e.clientX - panStartPos.x;
                const deltaY = e.clientY - panStartPos.y;
                setPanOffset({
                    x: lastPanOffset.x + deltaX,
                    y: lastPanOffset.y + deltaY,
                });
                return;
            }

            if (draggedItem) {
                if (draggedItem.type === 'sprinkler') {
                    onSprinklerDragged(draggedItem.id, point);
                } else if (draggedItem.type === 'waterSource') {
                    // Handle water source dragging here if needed
                }
                return;
            }

            if (enhancedDrawing.isDrawing && enhancedDrawing.currentPoints.length > 0) {
                const lastPoint =
                    enhancedDrawing.currentPoints[enhancedDrawing.currentPoints.length - 1];
                const distance = calculateDistance(lastPoint, point);
                setDistanceCursor({ show: true, distance });
            } else {
                setDistanceCursor({ show: false, distance: 0 });
            }

            if (enhancedDrawing.isDrawing && enhancedDrawing.startPoint) {
                let previewShape: CanvasCoordinate[] | null = null;

                switch (currentZoneTool) {
                    case 'rectangle': {
                        previewShape = createRectangleZone(enhancedDrawing.startPoint, point);
                        break;
                    }
                    case 'circle': {
                        const radius = calculateDistance(enhancedDrawing.startPoint, point);
                        previewShape = createCircleZone(enhancedDrawing.startPoint, radius);
                        break;
                    }
                    case 'polygon': {
                        const polyRadius = calculateDistance(enhancedDrawing.startPoint, point);
                        previewShape = createRegularPolygon(
                            enhancedDrawing.startPoint,
                            polyRadius,
                            6
                        );
                        break;
                    }
                }

                setEnhancedDrawing((prev) => ({ ...prev, previewShape }));
            }
        },
        [
            draggedItem,
            onSprinklerDragged,
            enhancedDrawing,
            currentZoneTool,
            createRectangleZone,
            createCircleZone,
            createRegularPolygon,
            getCanvasCoordinate,
            isPanning,
            panStartPos,
            lastPanOffset,
        ]
    );

    const handleMouseUp = useCallback(() => {
        setDraggedItem(null);
        setIsPanning(false);
        setPanStartPos(null);

        // จัดการการลากรูปภาพ
        if (isDraggingImage) {
            handleImageDragEnd();
        }
    }, [isDraggingImage]);

    const handleRightClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            e.preventDefault();

            if (!containerRef.current) return;

            const point = getCanvasCoordinate(e.clientX, e.clientY);

            try {
                if (
                    currentZoneTool === 'freehand' &&
                    enhancedDrawing.isDrawing &&
                    enhancedDrawing.currentPoints.length >= 3
                ) {
                    finalizeEnhancedZone(enhancedDrawing.currentPoints);
                    return;
                }

                if (waterSource && waterSource.canvasPosition) {
                    const dist = Math.sqrt(
                        Math.pow(point.x - waterSource.canvasPosition.x, 2) +
                            Math.pow(point.y - waterSource.canvasPosition.y, 2)
                    );
                    if (dist < 25) {
                        onWaterSourceDelete();
                        return;
                    }
                }

                if (editMode === 'drag-sprinkler') {
                    const clickedSprinkler = sprinklers.find((s) => {
                        if (!s.canvasPosition) return false;
                        const dist = Math.sqrt(
                            Math.pow(point.x - s.canvasPosition.x, 2) +
                                Math.pow(point.y - s.canvasPosition.y, 2)
                        );
                        return dist < 20;
                    });

                    if (clickedSprinkler) {
                        onSprinklerDelete(clickedSprinkler.id);
                        return;
                    }
                }

                if (isDrawing && currentPolygon.length >= 3) {
                    onZoneCreated(currentPolygon);
                    setCurrentPolygon([]);
                    setIsDrawing(false);
                    setEnhancedDrawing({
                        isDrawing: false,
                        startPoint: null,
                        currentPoints: [],
                        previewShape: null,
                    });
                }
            } catch (error) {
                console.error('Error handling right click:', error);
            }
        },
        [
            isDrawing,
            currentPolygon,
            editMode,
            sprinklers,
            waterSource,
            onZoneCreated,
            onSprinklerDelete,
            onWaterSourceDelete,
            currentZoneTool,
            enhancedDrawing,
            finalizeEnhancedZone,
            getCanvasCoordinate,
        ]
    );

    // ===== IMPROVED SPRINKLER RADIUS RENDERING =====
    const renderSprinklerRadius = useCallback(
        (sprinkler: Sprinkler) => {
            if (!sprinkler.canvasPosition || !isScaleSet || !currentScale) {
                return null;
            }

            const radiusPixels = sprinkler.type.radius * currentScale;
            const zone = gardenZones.find((z) => z.id === sprinkler.zoneId);
            const isSelected =
                selectedSprinkler === sprinkler.id ||
                selectedSprinklersForPipe.includes(sprinkler.id);

            try {
                // Handle virtual zone or no zone
                if (
                    !zone ||
                    !zone.canvasCoordinates ||
                    zone.canvasCoordinates.length < 3 ||
                    sprinkler.zoneId === 'virtual_zone'
                ) {
                    return (
                        <g key={`radius-${sprinkler.id}`}>
                            <circle
                                cx={sprinkler.canvasPosition.x}
                                cy={sprinkler.canvasPosition.y}
                                r={radiusPixels}
                                fill={isSelected ? '#FFD700' + '15' : sprinkler.type.color + '15'}
                                stroke={isSelected ? '#FFD700' : sprinkler.type.color}
                                strokeWidth={2}
                                strokeDasharray={sprinkler.zoneId === 'virtual_zone' ? '8,4' : '0'}
                            />
                        </g>
                    );
                }

                // Don't show radius for forbidden zones
                if (zone.type === 'forbidden') {
                    return null;
                }

                // Use the same clipping logic as CanvasDesigner
                const clipResult = clipCircleToPolygon(
                    sprinkler.canvasPosition,
                    sprinkler.type.radius,
                    zone.canvasCoordinates,
                    currentScale
                );

                if (clipResult === 'FULL_CIRCLE') {
                    return (
                        <g key={`radius-${sprinkler.id}`}>
                            <circle
                                cx={sprinkler.canvasPosition.x}
                                cy={sprinkler.canvasPosition.y}
                                r={radiusPixels}
                                fill={isSelected ? '#FFD700' + '15' : sprinkler.type.color + '15'}
                                stroke={isSelected ? '#FFD700' : sprinkler.type.color}
                                strokeWidth={2}
                            />
                        </g>
                    );
                } else if (clipResult === 'MASKED_CIRCLE') {
                    return (
                        <g key={`radius-${sprinkler.id}`}>
                            <defs>
                                <clipPath id={`clip-${sprinkler.id}`}>
                                    <polygon
                                        points={zone.canvasCoordinates
                                            .map((p) => `${p.x},${p.y}`)
                                            .join(' ')}
                                    />
                                </clipPath>
                            </defs>

                            <circle
                                cx={sprinkler.canvasPosition.x}
                                cy={sprinkler.canvasPosition.y}
                                r={radiusPixels}
                                fill={isSelected ? '#FFD700' + '15' : sprinkler.type.color + '15'}
                                stroke={isSelected ? '#FFD700' : sprinkler.type.color}
                                strokeWidth={2}
                                clipPath={`url(#clip-${sprinkler.id})`}
                            />
                        </g>
                    );
                } else if (Array.isArray(clipResult) && clipResult.length >= 3) {
                    const canvasResult = clipResult as CanvasCoordinate[];
                    const points = canvasResult.map((p) => `${p.x},${p.y}`).join(' ');
                    return (
                        <g key={`radius-${sprinkler.id}`}>
                            <polygon
                                points={points}
                                fill={isSelected ? '#FFD700' + '15' : sprinkler.type.color + '15'}
                                stroke={isSelected ? '#FFD700' : sprinkler.type.color}
                                strokeWidth={2}
                            />
                        </g>
                    );
                } else {
                    // No coverage, don't show anything to ensure strict zone boundaries
                    return null;
                }
            } catch (error) {
                console.error('Error rendering sprinkler radius:', error);
                return null;
            }
        },
        [gardenZones, isScaleSet, currentScale, selectedSprinkler, selectedSprinklersForPipe]
    );

    const getCursor = useCallback(() => {
        if (measurementMode) return 'crosshair';
        if (dimensionMode) return 'crosshair';
        if (
            editMode === 'draw' ||
            editMode === 'place' ||
            editMode === 'edit' ||
            editMode === 'main-pipe'
        )
            return 'crosshair';
        if (editMode === 'drag-sprinkler') return 'move';
        if (editMode === 'select-pipes' || editMode === 'connect-sprinklers' || pipeEditMode)
            return 'pointer';
        if (isPanning) return 'grabbing';
        return 'grab';
    }, [measurementMode, dimensionMode, editMode, isPanning, pipeEditMode]);

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
        const handleCancelDrawing = () => {
            console.log('🛑 Canceling drawing in Image Designer');

            setEnhancedDrawing({
                isDrawing: false,
                startPoint: null,
                currentPoints: [],
                previewShape: null,
            });

            setIsDrawing(false);
            setCurrentPolygon([]);
            setDistanceCursor({ show: false, distance: 0 });

            // Reset mouse position
            setMousePos({ x: 0, y: 0 });

            setDimensionMode(false);
            setTempDimensionPoints([]);
            setShowDimensionDirectionDialog(false);

            setMeasurementMode(null);
            setMeasurementLine({ start: null, end: null });
            setRealDistance('');
            setShowScaleDialog(false);

            console.log('✅ Image drawing cancelled successfully');
        };

        window.addEventListener('cancelDrawing', handleCancelDrawing);

        return () => {
            window.removeEventListener('cancelDrawing', handleCancelDrawing);
        };
    }, []);

    // ปิดการซูมในโหมดรูปแบบแปลน - เพิ่ม wheel event listener ที่ไม่ทำอะไร
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const wheelHandler = (e: WheelEvent) => {
            e.preventDefault();
            // ไม่ทำการซูมในโหมดรูปแบบแปลน
        };

        container.addEventListener('wheel', wheelHandler, { passive: false });

        return () => {
            container.removeEventListener('wheel', wheelHandler);
        };
    }, []);

    return (
        <div className="flex h-full flex-col items-center justify-center gap-4">
            {!imageData ? (
                <div className="rounded-xl bg-gray-800 p-8 text-center">
                    <div className="mb-4">
                        <div className="mb-3 text-5xl">🖼️</div>
                        <h3 className="mb-2 text-xl font-semibold text-white">
                            {t('อัปโหลดแบบแปลนบ้าน')}
                        </h3>
                        <p className="text-sm text-gray-400">
                            {t('รองรับไฟล์ JPG, PNG (สูงสุด 15MB)')}
                        </p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleFileChange}
                        className="hidden"
                        id="image-upload"
                    />
                    <label
                        htmlFor="image-upload"
                        className="inline-block cursor-pointer rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                    >
                        📁 {t('เลือกไฟล์รูปภาพ')}
                    </label>
                </div>
            ) : (
                <div className="flex h-full w-full gap-4">
                    <div className="w-80 space-y-4 overflow-y-auto rounded-lg bg-gray-800 p-4">
                        <div className="rounded-lg bg-gray-700 p-4">
                            <h4 className="mb-3 text-lg font-semibold text-white">
                                📏 {t('ตั้งค่าขนาดจริง')}
                            </h4>

                            {isScaleSet ? (
                                <div className="space-y-3">
                                    {measurementHistory.length > 0 && (
                                        <div className="rounded-lg bg-blue-900/30 p-3">
                                            <div className="mb-1 text-xs text-blue-300">
                                                {t('วัดเทียบระยะแล้ว:')}
                                            </div>
                                            <div className="text-xs text-blue-200">
                                                {measurementHistory[
                                                    measurementHistory.length - 1
                                                ].pixelDistance.toFixed(1)}{' '}
                                                px ={' '}
                                                {
                                                    measurementHistory[
                                                        measurementHistory.length - 1
                                                    ].realDistance
                                                }{' '}
                                                m
                                            </div>
                                        </div>
                                    )}

                                    {/* Grid Controls */}
                                    {isScaleSet && (
                                        <div className="rounded-lg bg-gray-700">
                                            <div className="space-y-3">
                                                <label className="flex items-center gap-2 text-sm text-white">
                                                    <button
                                                        type="button"
                                                        aria-pressed={showGrid}
                                                        onClick={() => setShowGrid(!showGrid)}
                                                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
                                                            showGrid ? 'bg-blue-600' : 'bg-gray-400'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                                showGrid
                                                                    ? 'translate-x-5'
                                                                    : 'translate-x-1'
                                                            }`}
                                                        />
                                                    </button>
                                                    {t('แสดงตาราง')}
                                                    {showGrid && enableGridSnap && (
                                                        <span className="ml-2 text-xs bg-green-600 px-2 py-1 rounded-full">
                                                            🧲 {t('จับตำแหน่ง')}
                                                        </span>
                                                    )}
                                                </label>

                                                {showGrid && (
                                                    <div>
                                                        <label className="mb-1 block text-xs text-gray-300">
                                                            {t('ระยะห่างตาราง:')}{' '}
                                                            {(gridSize / currentScale).toFixed(1)}{' '}
                                                            {t('ม.')}
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="20"
                                                            max="100"
                                                            step="10"
                                                            value={gridSize}
                                                            onChange={(e) =>
                                                                setGridSize(Number(e.target.value))
                                                            }
                                                            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
                                                        />
                                                        <div className="mt-1 flex justify-between text-xs text-gray-400">
                                                            <span>{t('ใกล้')}</span>
                                                            <span>{t('ไกล')}</span>
                                                        </div>
                                                        {enableGridSnap && (editMode === 'draw' || dimensionMode) && (
                                                            <div className="mt-2 rounded-lg bg-green-900/30 p-2 text-xs text-green-200">
                                                                <div className="flex items-center gap-1">
                                                                    🧲 <span className="font-medium">{t('โหมดจับตำแหน่ง')}</span>
                                                                </div>
                                                                <div className="mt-1 text-green-300/80">
                                                                    {t('เมาส์จะเดินตามจุดตัดของตารางย่อย (ความละเอียดสูง)')}
                                                                </div>
                                                                <div className="mt-1 text-green-400/60 text-xs">
                                                                    📏 {t('ระยะห่างตารางย่อย:')} {((gridSize / 5) / currentScale).toFixed(2)} {t('ม.')}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="rounded-lg bg-amber-900/30 p-3">
                                        <p className="mb-2 text-sm text-amber-200">
                                            🎯 <strong>{t('วิธีการตั้งค่า:')}</strong>
                                        </p>
                                        <ol className="list-inside list-decimal space-y-1 text-xs text-amber-100">
                                            <li>
                                                {t(
                                                    'หาสิ่งที่รู้ขนาดจริง เช่น ประตู (80cm), รถ (4.5m)'
                                                )}
                                            </li>
                                            <li>{t('กดปุ่ม "📐 เริ่มวัดระยะ"')}</li>
                                            <li>{t('คลิกจุดเริ่มต้นและจุดสิ้นสุด')}</li>
                                            <li>{t('กรอกขนาดจริงเป็นเมตร')}</li>
                                        </ol>
                                    </div>

                                    {!measurementMode ? (
                                        <button
                                            onClick={() => {
                                                setMeasurementMode('line');
                                                setMeasurementLine({ start: null, end: null });
                                            }}
                                            className="w-full rounded-lg bg-amber-600 px-4 py-3 font-medium text-white transition-colors hover:bg-amber-700"
                                        >
                                            📐 {t('เริ่มวัดระยะ')}
                                        </button>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="text-sm text-amber-200">
                                                📐{' '}
                                                {measurementLine.start
                                                    ? measurementLine.end
                                                        ? t('วัดเสร็จแล้ว')
                                                        : t('คลิกจุดที่ 2 (หรือคลิกหัวฉีด)')
                                                    : t('คลิกจุดที่ 1 (หรือคลิกหัวฉีด)')}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setMeasurementMode(null);
                                                    setMeasurementLine({ start: null, end: null });
                                                    setRealDistance('');
                                                }}
                                                className="w-full rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                                            >
                                                ❌ {t('ยกเลิกการวัด')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Enhanced Zone Tools Panel - Only show when in draw mode */}
                        {isScaleSet && editMode === 'draw' && (
                            <div className="rounded-lg bg-gray-700 p-4">
                                <h4 className="mb-3 text-lg font-semibold text-blue-400">
                                    🏗️ {t('เครื่องมือวาดรูปทรง')}
                                </h4>

                                {/* Zone Drawing Tools */}
                                <div className="mb-4 grid grid-cols-2 gap-2">
                                    {zoneDrawingTools.map((tool) => (
                                        <button
                                            key={tool.id}
                                            onClick={() => {
                                                setCurrentZoneTool(tool.id);
                                                cancelDrawing();
                                            }}
                                            className={`rounded-lg p-3 text-xs transition-all ${
                                                currentZoneTool === tool.id
                                                    ? 'border-2 border-blue-400 bg-blue-600 text-white'
                                                    : 'border-2 border-transparent bg-gray-600 text-gray-300 hover:bg-gray-500'
                                            }`}
                                            title={tool.description}
                                        >
                                            <div className="text-lg">{tool.icon}</div>
                                            <div className="mt-1">{tool.name}</div>
                                        </button>
                                    ))}
                                </div>

                                {/* Status */}
                                <div className="text-sm text-blue-200">
                                    {currentZoneTool === 'freehand' ? (
                                        <div>
                                            {enhancedDrawing.isDrawing
                                                ? `${t('คลิกเพื่อเพิ่มจุด')} (${enhancedDrawing.currentPoints.length} {t('จุด')}) • {t('คลิกขวาเพื่อจบ')}`
                                                : t('คลิกเพื่อเริ่มวาดโซนอิสระ')}
                                        </div>
                                    ) : (
                                        <div>
                                            {enhancedDrawing.isDrawing
                                                ? t('คลิกจุดที่ 2 เพื่อกำหนดขนาด')
                                                : `${t('คลิกจุดแรกเพื่อเริ่มวาด')}${zoneDrawingTools.find((t) => t.id === currentZoneTool)?.name}`}
                                        </div>
                                    )}
                                    {distanceCursor.show && (
                                        <div className="mt-1 text-green-400">
                                            {t('ระยะทาง:')}{' '}
                                            {formatEnhancedDistance(distanceCursor.distance)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Dimension Tools - Available without draw mode */}
                        {isScaleSet && (
                            <div className="rounded-lg bg-gray-700 p-4">
                                <h4 className="mb-3 text-lg font-semibold text-yellow-400">
                                    📐 {t('เครื่องมือวัด')}
                                </h4>

                                <div className="space-y-2">
                                    <button
                                        onClick={() => {
                                            setDimensionMode(true);
                                            setTempDimensionPoints([]);
                                        }}
                                        className={`w-full rounded-lg p-3 font-medium transition-colors ${
                                            dimensionMode
                                                ? 'bg-yellow-600 text-white'
                                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                        }`}
                                    >
                                        📏 {t('เพิ่มเส้นวัด')}
                                    </button>

                                    {dimensionMode && (
                                        <button
                                            onClick={() => {
                                                setDimensionMode(false);
                                                setTempDimensionPoints([]);
                                            }}
                                            className="w-full rounded-lg bg-red-600 p-3 font-medium text-white transition-colors hover:bg-red-700"
                                        >
                                            ❌ {t('ยกเลิกการวัด')}
                                        </button>
                                    )}

                                    {dimensionLines.length > 0 && (
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
                                            className="w-full rounded-lg bg-red-600 p-2 text-white transition-colors hover:bg-red-700"
                                        >
                                            🗑️ {t('ลบเส้นวัดทั้งหมด')} ({dimensionLines.length})
                                        </button>
                                    )}
                                </div>

                                {dimensionMode && (
                                    <div className="mt-3 rounded-lg bg-yellow-900/30 text-sm text-yellow-200">
                                        💡 {t('คลิกจุดที่ 1 และจุดที่ 2 เพื่อสร้างเส้นวัด')}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Pipe Editing Tools - Available without draw mode */}
                        {isScaleSet && pipes.length > 0 && (
                            <div className="rounded-lg bg-gray-700 p-4">
                                <h4 className="mb-3 text-lg font-semibold text-purple-400">
                                    🔧 {t('แก้ไขระบบท่อ (ใช้งานได้เสมอ)')}
                                </h4>

                                <div className="space-y-3">
                                    {/* Pipe statistics */}
                                    {pipes.length > 0 && (
                                        <div className="rounded-lg bg-purple-900/30 p-3 text-sm text-purple-300">
                                            <div className="mb-1 font-medium">
                                                📊 {t('สถิติระบบท่อ:')}
                                            </div>
                                            <div>
                                                {t('จำนวนท่อ:')} {pipes.length} {t('เส้น')}
                                            </div>
                                            <div>
                                                {t('ความยาวรวม:')}{' '}
                                                {formatDistance(
                                                    calculatePipeStatistics(
                                                        pipes,
                                                        sprinklers,
                                                        waterSource,
                                                        true,
                                                        imageData?.scale || 20
                                                    ).totalLength
                                                )}
                                            </div>
                                            <div>
                                                {t('ท่อที่ยาวที่สุด:')}{' '}
                                                {formatDistance(
                                                    calculatePipeStatistics(
                                                        pipes,
                                                        sprinklers,
                                                        waterSource,
                                                        true,
                                                        imageData?.scale || 20
                                                    ).longestPath
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Pipe edit mode info */}
                                    {pipeEditMode && (
                                        <div className="rounded-lg bg-blue-900/30 p-3 text-sm text-blue-300">
                                            <div className="mb-1 font-medium">
                                                {pipeEditMode === 'add'
                                                    ? '➕' + t('เพิ่มท่อ')
                                                    : '➖' + t('ลบท่อ')}
                                            </div>
                                            <div className="text-xs">
                                                {pipeEditMode === 'add'
                                                    ? `${t('เลือกหัวฉีด 2 ตัวเพื่อเชื่อมต่อ')} (${selectedSprinklersForPipe.length}/{t('2')})`
                                                    : `${t('เลือกหัวฉีด 2 ตัวเพื่อลบท่อ')} (${selectedSprinklersForPipe.length}/{t('2')})`}
                                            </div>
                                        </div>
                                    )}

                                    {/* Selected pipes info */}
                                    {selectedPipes.size > 0 && (
                                        <div className="rounded-lg bg-yellow-900/30 p-3 text-sm text-yellow-300">
                                            <div className="mb-1 font-medium">
                                                📋 {t('เลือกแล้ว:')} {selectedPipes.size} {t('ท่อ')}
                                            </div>
                                            <div className="text-xs">
                                                {t('คลิกที่ท่อเพื่อเลือก/ยกเลิก')}
                                            </div>
                                        </div>
                                    )}

                                    {/* Pipe editing instructions */}
                                    <div className="rounded-lg bg-gray-600 p-3 text-xs text-gray-300">
                                        <div className="mb-2 font-medium">💡 {t('วิธีใช้:')}</div>
                                        <div className="space-y-1">
                                            <div>• {t('คลิกที่ท่อเพื่อเลือก')}</div>
                                            <div>• {t('คลิกหัวฉีด 2 ตัวเพื่อเพิ่ม/ลบท่อ')}</div>
                                            <div>• {t('ใช้ปุ่มด้านล่างเพื่อเปลี่ยนโหมด')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isScaleSet && (
                            <div className="rounded-lg border-l-4 border-amber-400 bg-amber-800 p-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">⚠️</span>
                                    <div>
                                        <div className="mb-1 font-medium text-amber-100">
                                            {t('ต้องตั้งค่าขนาดก่อน!')}
                                        </div>
                                        <p className="text-sm text-amber-200">
                                            {t(
                                                'กรุณาตั้งค่าขนาดจริงเพื่อให้ระบบคำนวณพื้นที่และระยะทางได้ถูกต้อง'
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative flex h-full w-full flex-1 items-center justify-center overflow-hidden rounded-lg border border-gray-600 bg-gray-900">
                        {/* Grid overlay - covers entire container */}
                        {showGrid && isScaleSet && (
                            <svg
                                className="pointer-events-none absolute inset-0 h-full w-full"
                                style={{ zIndex: 1000 }}
                            >
                                <defs>
                                    <pattern
                                        id="fullGrid"
                                        width={gridSize * zoom}
                                        height={gridSize * zoom}
                                        patternUnits="userSpaceOnUse"
                                        x={panOffset.x % (gridSize * zoom)}
                                        y={panOffset.y % (gridSize * zoom)}
                                    >
                                        <path
                                            d={`M ${gridSize * zoom} 0 L 0 0 0 ${gridSize * zoom}`}
                                            fill="none"
                                            stroke="rgb(55, 65, 81)"
                                            strokeWidth="1"
                                        />
                                    </pattern>
                                    <pattern
                                        id="fullGridFine"
                                        width={(gridSize * zoom) / 5}
                                        height={(gridSize * zoom) / 5}
                                        patternUnits="userSpaceOnUse"
                                        x={panOffset.x % ((gridSize * zoom) / 5)}
                                        y={panOffset.y % ((gridSize * zoom) / 5)}
                                    >
                                        <path
                                            d={`M ${(gridSize * zoom) / 5} 0 L 0 0 0 ${(gridSize * zoom) / 5}`}
                                            fill="none"
                                            stroke="rgb(75, 85, 99)"
                                            strokeWidth="0.5"
                                        />
                                    </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#fullGridFine)" />
                                <rect width="100%" height="100%" fill="url(#fullGrid)" />
                            </svg>
                        )}

                        <div
                            ref={containerRef}
                            className="relative h-full w-full overflow-hidden"
                            style={{
                                cursor: getCursor(),
                            }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onContextMenu={handleRightClick}
                            onTouchStart={(e) => {
                                e.preventDefault();
                                if (e.touches.length === 1) {
                                    const touch = e.touches[0];
                                    const syntheticEvent = {
                                        clientX: touch.clientX,
                                        clientY: touch.clientY,
                                        button: 0,
                                        preventDefault: () => {},
                                    } as React.MouseEvent<HTMLDivElement>;
                                    handleMouseDown(syntheticEvent);
                                }
                            }}
                            onTouchMove={(e) => {
                                e.preventDefault();
                                if (e.touches.length === 1) {
                                    const touch = e.touches[0];
                                    const syntheticEvent = {
                                        clientX: touch.clientX,
                                        clientY: touch.clientY,
                                        preventDefault: () => {},
                                    } as React.MouseEvent<HTMLDivElement>;
                                    handleMouseMove(syntheticEvent);
                                }
                            }}
                            onTouchEnd={(e) => {
                                e.preventDefault();
                                handleMouseUp();
                            }}
                            onTouchCancel={(e) => {
                                e.preventDefault();
                                handleMouseUp();
                            }}
                        >
                            <div
                                className="absolute"
                                style={{
                                    transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                                    transformOrigin: '0 0',
                                }}
                            >
                                {imageData && (
                                    <>
                                        <img
                                            src={imageData.url}
                                            alt="House plan"
                                            className="block"
                                            style={{
                                                width: imageData.width * zoom,
                                                height: imageData.height * zoom,
                                                objectFit: 'contain',
                                                aspectRatio: imageAspectRatio,
                                            }}
                                            draggable={false}
                                            onMouseDown={handleImageDragStart}
                                            onMouseMove={handleImageDragMove}
                                            onMouseUp={handleImageDragEnd}
                                            onMouseLeave={handleImageDragEnd}
                                        />

                                        <svg
                                            className="absolute inset-0"
                                            width={imageData.width * zoom}
                                            height={imageData.height * zoom}
                                            viewBox={`0 0 ${imageData.width} ${imageData.height}`}
                                            style={{ pointerEvents: 'none' }}
                                        >
                                    {measurementMode === 'line' && measurementLine.start && (
                                        <g>
                                            <circle
                                                cx={measurementLine.start.x}
                                                cy={measurementLine.start.y}
                                                r="8"
                                                fill="yellow"
                                                stroke="red"
                                                strokeWidth="3"
                                            />
                                            <text
                                                x={measurementLine.start.x}
                                                y={measurementLine.start.y - 15}
                                                fill="white"
                                                fontSize="12"
                                                fontWeight="bold"
                                                textAnchor="middle"
                                                style={{
                                                    filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))',
                                                }}
                                            >
                                                {t('จุดที่ 1')}
                                            </text>

                                            {measurementLine.end && (
                                                <>
                                                    <line
                                                        x1={measurementLine.start.x}
                                                        y1={measurementLine.start.y}
                                                        x2={measurementLine.end.x}
                                                        y2={measurementLine.end.y}
                                                        stroke="yellow"
                                                        strokeWidth="4"
                                                        strokeDasharray="10,5"
                                                    />
                                                    <circle
                                                        cx={measurementLine.end.x}
                                                        cy={measurementLine.end.y}
                                                        r="8"
                                                        fill="yellow"
                                                        stroke="red"
                                                        strokeWidth="3"
                                                    />
                                                    <text
                                                        x={measurementLine.end.x}
                                                        y={measurementLine.end.y - 15}
                                                        fill="white"
                                                        fontSize="12"
                                                        fontWeight="bold"
                                                        textAnchor="middle"
                                                        style={{
                                                            filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))',
                                                        }}
                                                    >
                                                        {t('จุดที่ 2')}
                                                    </text>
                                                    <text
                                                        x={
                                                            (measurementLine.start.x +
                                                                measurementLine.end.x) /
                                                            2
                                                        }
                                                        y={
                                                            (measurementLine.start.y +
                                                                measurementLine.end.y) /
                                                                2 -
                                                            15
                                                        }
                                                        fill="yellow"
                                                        fontSize="16"
                                                        fontWeight="bold"
                                                        textAnchor="middle"
                                                        style={{
                                                            filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))',
                                                        }}
                                                    >
                                                        📏{' '}
                                                        {measurementLine.pixelDistance?.toFixed(1)}{' '}
                                                        {t('พิกเซล')}
                                                    </text>
                                                </>
                                            )}
                                        </g>
                                    )}

                                    {/* Dimension lines */}
                                    {dimensionLines.map((dimension) => (
                                        <g key={dimension.id}>
                                            {/* Calculate dimension line position */}
                                            {(() => {
                                                const dx = dimension.end.x - dimension.start.x;
                                                const dy = dimension.end.y - dimension.start.y;
                                                const length = Math.sqrt(dx * dx + dy * dy);

                                                if (length < 1) return null;

                                                const unitX = dx / length;
                                                const unitY = dy / length;
                                                const offsetDistance = 30;

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
                                                    x: dimension.start.x + offsetX,
                                                    y: dimension.start.y + offsetY,
                                                };
                                                const dimEnd = {
                                                    x: dimension.end.x + offsetX,
                                                    y: dimension.end.y + offsetY,
                                                };

                                                return (
                                                    <>
                                                        {/* Dimension line */}
                                                        <line
                                                            x1={dimStart.x}
                                                            y1={dimStart.y}
                                                            x2={dimEnd.x}
                                                            y2={dimEnd.y}
                                                            stroke="#FFD700"
                                                            strokeWidth="2"
                                                        />

                                                        {/* Extension lines */}
                                                        <line
                                                            x1={dimension.start.x}
                                                            y1={dimension.start.y}
                                                            x2={dimStart.x}
                                                            y2={dimStart.y}
                                                            stroke="#FFD700"
                                                            strokeWidth="1"
                                                            strokeDasharray="3,3"
                                                        />
                                                        <line
                                                            x1={dimension.end.x}
                                                            y1={dimension.end.y}
                                                            x2={dimEnd.x}
                                                            y2={dimEnd.y}
                                                            stroke="#FFD700"
                                                            strokeWidth="1"
                                                            strokeDasharray="3,3"
                                                        />

                                                        {/* Arrows */}
                                                        {(() => {
                                                            const arrowSize = 8;
                                                            const angle1 = Math.atan2(
                                                                dimEnd.y - dimStart.y,
                                                                dimEnd.x - dimStart.x
                                                            );
                                                            const angle2 = angle1 + Math.PI;

                                                            return (
                                                                <>
                                                                    <g
                                                                        stroke="#FFD700"
                                                                        strokeWidth="2"
                                                                        fill="none"
                                                                    >
                                                                        <path
                                                                            d={`M ${dimStart.x} ${dimStart.y} L ${dimStart.x + Math.cos(angle1 + 0.3) * arrowSize} ${dimStart.y + Math.sin(angle1 + 0.3) * arrowSize}`}
                                                                        />
                                                                        <path
                                                                            d={`M ${dimStart.x} ${dimStart.y} L ${dimStart.x + Math.cos(angle1 - 0.3) * arrowSize} ${dimStart.y + Math.sin(angle1 - 0.3) * arrowSize}`}
                                                                        />
                                                                        <path
                                                                            d={`M ${dimEnd.x} ${dimEnd.y} L ${dimEnd.x + Math.cos(angle2 + 0.3) * arrowSize} ${dimEnd.y + Math.sin(angle2 + 0.3) * arrowSize}`}
                                                                        />
                                                                        <path
                                                                            d={`M ${dimEnd.x} ${dimEnd.y} L ${dimEnd.x + Math.cos(angle2 - 0.3) * arrowSize} ${dimEnd.y + Math.sin(angle2 - 0.3) * arrowSize}`}
                                                                        />
                                                                    </g>
                                                                </>
                                                            );
                                                        })()}

                                                        {/* Label with delete button */}
                                                        <g>
                                                            <rect
                                                                x={(dimStart.x + dimEnd.x) / 2 - 25}
                                                                y={(dimStart.y + dimEnd.y) / 2 - 8}
                                                                width="50"
                                                                height="16"
                                                                fill="rgba(0,0,0,0.8)"
                                                                rx="2"
                                                            />
                                                            <text
                                                                x={(dimStart.x + dimEnd.x) / 2}
                                                                y={(dimStart.y + dimEnd.y) / 2}
                                                                fill="#FFD700"
                                                                fontSize="12"
                                                                fontWeight="bold"
                                                                textAnchor="middle"
                                                                dominantBaseline="middle"
                                                            >
                                                                {dimension.label}
                                                            </text>
                                                            <text
                                                                x={(dimStart.x + dimEnd.x) / 2 + 20}
                                                                y={(dimStart.y + dimEnd.y) / 2 - 2}
                                                                fill="#FF4444"
                                                                fontSize="10"
                                                                fontWeight="bold"
                                                                textAnchor="middle"
                                                                dominantBaseline="middle"
                                                                style={{ cursor: 'pointer' }}
                                                            >
                                                                ×
                                                            </text>
                                                        </g>
                                                    </>
                                                );
                                            })()}
                                        </g>
                                    ))}

                                    {/* Temp dimension points */}
                                    {dimensionMode &&
                                        tempDimensionPoints.map((point, index) => (
                                            <g key={index}>
                                                <circle
                                                    cx={point.x}
                                                    cy={point.y}
                                                    r="6"
                                                    fill="#FFD700"
                                                    stroke="white"
                                                    strokeWidth="2"
                                                />
                                                <text
                                                    x={point.x}
                                                    y={point.y - 15}
                                                    fill="white"
                                                    fontSize="12"
                                                    fontWeight="bold"
                                                    textAnchor="middle"
                                                    style={{
                                                        filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))',
                                                    }}
                                                >
                                                    จุดที่ {index + 1}
                                                </text>
                                            </g>
                                        ))}

                                    {/* Temp dimension line */}
                                    {tempDimensionPoints.length === 2 && (
                                        <line
                                            x1={tempDimensionPoints[0].x}
                                            y1={tempDimensionPoints[0].y}
                                            x2={tempDimensionPoints[1].x}
                                            y2={tempDimensionPoints[1].y}
                                            stroke="#FFD700"
                                            strokeWidth="3"
                                            strokeDasharray="5,5"
                                        />
                                    )}

                                    {isScaleSet && (
                                        <>
                                            {/* Enhanced zone preview */}
                                            {enhancedDrawing.previewShape &&
                                                enhancedDrawing.previewShape.length > 2 && (
                                                    <g>
                                                        <polygon
                                                            points={enhancedDrawing.previewShape
                                                                .map((p) => `${p.x},${p.y}`)
                                                                .join(' ')}
                                                            fill={
                                                                ZONE_TYPES.find(
                                                                    (z) => z.id === selectedZoneType
                                                                )?.color + '26' || '#3B82F6' + '26'
                                                            }
                                                            stroke={
                                                                ZONE_TYPES.find(
                                                                    (z) => z.id === selectedZoneType
                                                                )?.color || '#3B82F6'
                                                            }
                                                            strokeWidth="3"
                                                            strokeDasharray="8,6"
                                                        />
                                                        {/* Show area preview */}
                                                        <text
                                                            x={
                                                                enhancedDrawing.previewShape.reduce(
                                                                    (sum, p) => sum + p.x,
                                                                    0
                                                                ) /
                                                                enhancedDrawing.previewShape.length
                                                            }
                                                            y={
                                                                enhancedDrawing.previewShape.reduce(
                                                                    (sum, p) => sum + p.y,
                                                                    0
                                                                ) /
                                                                enhancedDrawing.previewShape.length
                                                            }
                                                            fill="white"
                                                            fontSize="14"
                                                            fontWeight="bold"
                                                            textAnchor="middle"
                                                            style={{
                                                                filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))',
                                                            }}
                                                        >
                                                            {formatEnhancedArea(
                                                                calculatePolygonArea(
                                                                    enhancedDrawing.previewShape,
                                                                    currentScale
                                                                )
                                                            )}
                                                        </text>
                                                    </g>
                                                )}

                                            {/* Guide line for freehand drawing */}
                                            {currentZoneTool === 'freehand' &&
                                                enhancedDrawing.isDrawing &&
                                                enhancedDrawing.currentPoints.length > 0 && (
                                                    <g>
                                                        <line
                                                            x1={
                                                                enhancedDrawing.currentPoints[
                                                                    enhancedDrawing.currentPoints
                                                                        .length - 1
                                                                ].x
                                                            }
                                                            y1={
                                                                enhancedDrawing.currentPoints[
                                                                    enhancedDrawing.currentPoints
                                                                        .length - 1
                                                                ].y
                                                            }
                                                            x2={mousePos.x}
                                                            y2={mousePos.y}
                                                            stroke="#00FF00"
                                                            strokeWidth="2"
                                                            strokeDasharray="5,5"
                                                        />
                                                    </g>
                                                )}

                                            {/* Distance cursor for enhanced drawing */}
                                            {distanceCursor.show && (
                                                <g>
                                                    <text
                                                        x={mousePos.x + 10}
                                                        y={mousePos.y}
                                                        fill="white"
                                                        fontSize="14"
                                                        fontWeight="bold"
                                                        style={{
                                                            filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))',
                                                        }}
                                                    >
                                                        {formatEnhancedDistance(
                                                            distanceCursor.distance
                                                        )}
                                                    </text>
                                                </g>
                                            )}

                                            {gardenZones
                                                .sort((a, b) => {
                                                    if (a.parentZoneId && !b.parentZoneId) return 1;
                                                    if (!a.parentZoneId && b.parentZoneId)
                                                        return -1;
                                                    return 0;
                                                })
                                                .map((zone) => {
                                                    if (
                                                        !zone.canvasCoordinates ||
                                                        zone.canvasCoordinates.length < 3
                                                    )
                                                        return null;

                                                    const zoneType = ZONE_TYPES.find(
                                                        (z) => z.id === zone.type
                                                    );
                                                    // คำนวณตำแหน่งโซนที่ขยายหรือซูมตามรูปภาพ
                                                    const scaledCoordinates =
                                                        zone.canvasCoordinates.map((coord) => ({
                                                            x: coord.x,
                                                            y: coord.y,
                                                        }));
                                                    const points = scaledCoordinates
                                                        .map((c) => `${c.x},${c.y}`)
                                                        .join(' ');

                                                    return (
                                                        <g key={zone.id}>
                                                            <polygon
                                                                points={points}
                                                                fill={zoneType?.color + '33'}
                                                                stroke={zoneType?.color}
                                                                strokeWidth={
                                                                    zone.parentZoneId ? 3 : 2
                                                                }
                                                                strokeDasharray={
                                                                    zone.type === 'forbidden' ||
                                                                    zone.parentZoneId
                                                                        ? '5,5'
                                                                        : undefined
                                                                }
                                                            />
                                                            <text
                                                                x={
                                                                    scaledCoordinates.reduce(
                                                                        (sum, c) => sum + c.x,
                                                                        0
                                                                    ) / scaledCoordinates.length
                                                                }
                                                                y={
                                                                    scaledCoordinates.reduce(
                                                                        (sum, c) => sum + c.y,
                                                                        0
                                                                    ) / scaledCoordinates.length
                                                                }
                                                                textAnchor="middle"
                                                                fill="white"
                                                                fontSize="12"
                                                                fontWeight="bold"
                                                                style={{
                                                                    filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))',
                                                                }}
                                                            >
                                                                {t(zone.name)}
                                                            </text>

                                                            {/* Show area */}
                                                            <text
                                                                x={
                                                                    scaledCoordinates.reduce(
                                                                        (sum, c) => sum + c.x,
                                                                        0
                                                                    ) / scaledCoordinates.length
                                                                }
                                                                y={
                                                                    scaledCoordinates.reduce(
                                                                        (sum, c) => sum + c.y,
                                                                        0
                                                                    ) /
                                                                        scaledCoordinates.length +
                                                                    15
                                                                }
                                                                textAnchor="middle"
                                                                fill="white"
                                                                fontSize="10"
                                                                style={{
                                                                    filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))',
                                                                }}
                                                            >
                                                                {formatArea(
                                                                    calculatePolygonArea(
                                                                        zone.canvasCoordinates,
                                                                        currentScale
                                                                    )
                                                                )}
                                                            </text>
                                                        </g>
                                                    );
                                                })}

                                            {currentPolygon.length > 0 && (
                                                <g>
                                                    <polyline
                                                        points={currentPolygon
                                                            .map((c) => `${c.x},${c.y}`)
                                                            .join(' ')}
                                                        fill="none"
                                                        stroke={
                                                            ZONE_TYPES.find(
                                                                (z) => z.id === selectedZoneType
                                                            )?.color
                                                        }
                                                        strokeWidth={3}
                                                        strokeDasharray="8,4"
                                                    />
                                                    {currentPolygon.map((point, i) => (
                                                        <circle
                                                            key={i}
                                                            cx={point.x}
                                                            cy={point.y}
                                                            r={6}
                                                            fill={
                                                                ZONE_TYPES.find(
                                                                    (z) => z.id === selectedZoneType
                                                                )?.color
                                                            }
                                                            stroke="white"
                                                            strokeWidth="2"
                                                        />
                                                    ))}

                                                    {/* Show area for current polygon */}
                                                    {currentPolygon.length > 2 && (
                                                        <text
                                                            x={
                                                                currentPolygon.reduce(
                                                                    (sum, p) => sum + p.x,
                                                                    0
                                                                ) / currentPolygon.length
                                                            }
                                                            y={
                                                                currentPolygon.reduce(
                                                                    (sum, p) => sum + p.y,
                                                                    0
                                                                ) / currentPolygon.length
                                                            }
                                                            textAnchor="middle"
                                                            fill="white"
                                                            fontSize="14"
                                                            fontWeight="bold"
                                                            style={{
                                                                filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))',
                                                            }}
                                                        >
                                                            {formatArea(
                                                                calculatePolygonArea(
                                                                    currentPolygon,
                                                                    currentScale
                                                                )
                                                            )}
                                                        </text>
                                                    )}
                                                </g>
                                            )}

                                            {/* Disabled: Main pipe drawing - redundant with auto-generated pipes */}
                                            {/* This prevents overlapping lines that confuse users */}
                                            {/*
                                            {mainPipeDrawing.length >= 2 && (
                                                <polyline
                                                    points={mainPipeDrawing
                                                        .map((p) => `${p.x},${p.y}`)
                                                        .join(' ')}
                                                    fill="none"
                                                    stroke="#3B82F6"
                                                    strokeWidth={8}
                                                />
                                            )}
                                            */}

                                            {/* Sort pipes to render selected pipes last (on top) */}
                                            {[...pipes]
                                                .sort((a, b) => {
                                                    const aSelected = selectedPipes.has(a.id);
                                                    const bSelected = selectedPipes.has(b.id);
                                                    if (aSelected && !bSelected) return 1; // Draw selected pipes last
                                                    if (!aSelected && bSelected) return -1; // Draw non-selected pipes first
                                                    return 0; // Keep original order for pipes with same selection state
                                                })
                                                .map((pipe) => {
                                                    if (!pipe.canvasStart || !pipe.canvasEnd)
                                                        return null;
                                                    const isSelected = selectedPipes.has(pipe.id);

                                                    return (
                                                        <g key={pipe.id}>
                                                            <line
                                                                x1={pipe.canvasStart.x}
                                                                y1={pipe.canvasStart.y}
                                                                x2={pipe.canvasEnd.x}
                                                                y2={pipe.canvasEnd.y}
                                                                stroke={isSelected ? '#FBBF24' : '#8B5CF6'}
                                                                strokeWidth={isSelected ? 6 : 4}
                                                                strokeLinecap="round"
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                            {/* Add glow effect for selected pipes */}
                                                            {isSelected && (
                                                                <line
                                                                    x1={pipe.canvasStart.x}
                                                                    y1={pipe.canvasStart.y}
                                                                    x2={pipe.canvasEnd.x}
                                                                    y2={pipe.canvasEnd.y}
                                                                    stroke="#FBBF24"
                                                                    strokeWidth="10"
                                                                    strokeLinecap="round"
                                                                    strokeOpacity="0.3"
                                                                    style={{ pointerEvents: 'none' }}
                                                                />
                                                            )}
                                                        </g>
                                                    );
                                                })}

                                            {/* Render sprinkler radii */}
                                            {sprinklers.map((sprinkler) =>
                                                renderSprinklerRadius(sprinkler)
                                            )}
                                        </>
                                    )}
                                </svg>
                                </>
                            )}

                            {isScaleSet && (
                                    <>
                                        {sprinklers.map((sprinkler) => {
                                            if (!sprinkler.canvasPosition) return null;
                                            const isSelected =
                                                selectedSprinkler === sprinkler.id ||
                                                selectedSprinklersForPipe.includes(sprinkler.id);

                                            return (
                                                <div
                                                    key={sprinkler.id}
                                                    className={`absolute flex h-3 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center ${
                                                        isSelected
                                                            ? 'rounded-full ring-4 ring-yellow-400'
                                                            : ''
                                                    }`}
                                                    style={{
                                                        left: sprinkler.canvasPosition.x * zoom,
                                                        top: sprinkler.canvasPosition.y * zoom,
                                                        cursor:
                                                            editMode === 'drag-sprinkler'
                                                                ? 'move'
                                                                : editMode ===
                                                                        'connect-sprinklers' ||
                                                                    pipeEditMode
                                                                  ? 'pointer'
                                                                  : 'default',
                                                        transform: sprinkler.orientation
                                                            ? `translate(-50%, -50%) scale(${zoom}) rotate(${sprinkler.orientation}deg)`
                                                            : `translate(-50%, -50%) scale(${zoom})`,
                                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
                                                        pointerEvents:
                                                            editMode === 'drag-sprinkler' ||
                                                            editMode === 'connect-sprinklers' ||
                                                            measurementMode ||
                                                            dimensionMode ||
                                                            pipeEditMode
                                                                ? 'auto'
                                                                : 'none',
                                                    }}
                                                >
                                                    <span className="pointer-events-none text-[10px] font-bold">
                                                        {sprinkler.type.icon}
                                                    </span>
                                                </div>
                                            );
                                        })}

                                        {waterSource?.canvasPosition && (
                                            <div
                                                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow-lg"
                                                style={{
                                                    left: waterSource.canvasPosition.x * zoom,
                                                    top: waterSource.canvasPosition.y * zoom,
                                                    width: 24 * zoom,
                                                    height: 24 * zoom,
                                                    cursor:
                                                        editMode === 'drag-sprinkler'
                                                            ? 'move'
                                                            : 'default',
                                                    transform: `translate(-50%, -50%)`,
                                                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))',
                                                    pointerEvents:
                                                        editMode === 'drag-sprinkler' ||
                                                        measurementMode ||
                                                        dimensionMode
                                                            ? 'auto'
                                                            : 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <img
                                                    src="/images/water-pump.png"
                                                    alt="Water Pump"
                                                    className="object-contain"
                                                    style={{ width: 20 * zoom, height: 20 * zoom }}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dimension Direction Dialog */}
            {showDimensionDirectionDialog && tempDimensionPoints.length === 2 && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
                        <h3 className="mb-4 text-lg font-semibold text-yellow-400">
                            📐 {t('เลือกทิศทางเส้นวัด')}
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'auto', label: t('อัตโนมัติ'), icon: '🔄' },
                                    { id: 'top', label: t('บน'), icon: '⬆️' },
                                    { id: 'bottom', label: t('ล่าง'), icon: '⬇️' },
                                    { id: 'left', label: t('ซ้าย'), icon: '⬅️' },
                                    { id: 'right', label: t('ขวา'), icon: '➡️' },
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
                                    {t('สร้างเส้นวัด')}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDimensionDirectionDialog(false);
                                        setTempDimensionPoints([]);
                                        setDimensionMode(false);
                                    }}
                                    className="flex-1 rounded-lg bg-gray-600 px-4 py-2 font-medium transition-colors hover:bg-gray-700"
                                >
                                    {t('ยกเลิก')}
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
                            📐 {t('กรอกระยะทางจริง')}
                        </h3>

                        <div className="mb-4 rounded-lg bg-blue-900/30 p-3">
                            <div className="mb-2 text-sm text-blue-300">
                                📏 {t('ข้อมูลการวัด:')}
                            </div>
                            <div className="space-y-1 text-sm text-blue-200">
                                <div>
                                    • {t('ระยะในรูป:')}{' '}
                                    <span className="font-bold text-yellow-300">
                                        {measurementLine.pixelDistance?.toFixed(1) || 0}{' '}
                                        {t('พิกเซล')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-300">
                                {t('ระยะทางจริง (เมตร):')}
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={realDistance}
                                    onChange={(e) => setRealDistance(e.target.value)}
                                    placeholder={t('เช่น 1.5, 2.4, 80')}
                                    className="flex-1 rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                    autoFocus
                                />
                                <span className="font-medium text-gray-300">{t('เมตร')}</span>
                            </div>
                            <div className="mt-2 text-xs text-gray-400">
                                💡 {t('ตัวอย่าง: ประตู = 0.8, รถยนต์ = 4.5, ห้อง = 3.0')}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleScaleSubmit}
                                disabled={
                                    !realDistance ||
                                    isNaN(parseFloat(realDistance)) ||
                                    parseFloat(realDistance) <= 0
                                }
                                className="flex-1 rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                            >
                                ✅ {t('ตั้งค่า')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowScaleDialog(false);
                                    setRealDistance('');
                                    setMeasurementLine({ start: null, end: null });
                                    setMeasurementMode(null);
                                }}
                                className="flex-1 rounded bg-gray-600 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-700"
                            >
                                ❌ {t('ยกเลิก')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UI Instructions */}
            {editMode === 'drag-sprinkler' && (
                <div className="absolute bottom-4 left-4 rounded-lg border border-orange-500 bg-gray-800/90 p-4 text-sm text-white backdrop-blur">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-orange-400">↔️</span>
                        <span className="font-semibold">{t('โหมดย้ายหัวฉีด')}</span>
                    </div>
                    <div>🖱️ {t('ลากหัวฉีดเพื่อย้ายตำแหน่ง')}</div>
                    <div>🖱️ {t('คลิกขวาเพื่อลบหัวฉีด')}</div>
                    <div className="text-xs text-gray-300">
                        🔍 {t('ใช้ล้อเมาส์เพื่อซูม')} • {t('ลากเพื่อเลื่อนภาพ')}
                    </div>
                </div>
            )}

            {editMode === 'place' && (
                <div className="absolute bottom-4 left-4 rounded-lg border border-green-500 bg-gray-800/90 p-4 text-sm text-white backdrop-blur">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-green-400">💧</span>
                        <span className="font-semibold">{t('โหมดวางหัวฉีด')}</span>
                    </div>
                    <div>🎯 {t('คลิกเพื่อวางหัวฉีด')}</div>
                    <div className="mt-1 text-xs text-gray-300">
                        {t('รัศมี:')} {manualSprinklerRadius}
                        {t('ม.')} • 🔍 {t('ใช้ล้อเมาส์เพื่อซูม')} •{' '}
                        {t('ลากเพื่อเลื่อนภาพ')}
                    </div>
                </div>
            )}

            {editMode === 'edit' && (
                <div className="absolute bottom-4 left-4 rounded-lg border border-yellow-500 bg-gray-800/90 p-4 text-sm text-white backdrop-blur">
                    <div className="mb-2 flex items-center gap-2">
                        <img 
                            src="/images/water-pump.png" 
                            alt="Water Pump" 
                            className="w-4 h-4 object-contain"
                        />
                        <span className="font-semibold">{t('โหมดจัดการแหล่งน้ำ')}</span>
                    </div>
                    <div>🎯 {t('คลิกเพื่อวางแหล่งน้ำ')}</div>
                    <div>🖱️ {t('คลิกขวาบนแหล่งน้ำเพื่อลบ')}</div>
                    <div className="text-xs text-gray-300">
                        🔍 {t('ใช้ล้อเมาส์เพื่อซูม')} • {t('ลากเพื่อเลื่อนภาพ')}
                    </div>
                </div>
            )}

            {(pipeEditMode === 'add' || pipeEditMode === 'remove') && (
                <div className="absolute bottom-12 left-4 rounded-lg border border-purple-500 bg-gray-800/90 p-4 text-sm text-white backdrop-blur">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-purple-400">🔧</span>
                        <span className="font-semibold">
                            {pipeEditMode === 'add'
                                ? t('เพิ่มท่อ')
                                : t('ลบท่อ')}
                        </span>
                    </div>
                    <div>
                        {pipeEditMode === 'add'
                            ? `🎯 ${t('เลือกหัวฉีด 2 ตัวเพื่อเชื่อมต่อ')} (${selectedSprinklersForPipe.length}/2)`
                            : `🎯 ${t('เลือกหัวฉีด 2 ตัวเพื่อลบท่อ')} (${selectedSprinklersForPipe.length}/2)`}
                    </div>
                    <div className="text-xs text-gray-300">
                        🔍 {t('ใช้ล้อเมาส์เพื่อซูม')} • {t('ลากเพื่อเลื่อนภาพ')}
                    </div>
                </div>
            )}

            
        </div>
    );
};

export default ImageDesigner;
