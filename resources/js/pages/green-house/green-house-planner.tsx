/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../../components/Navbar';
import { useLanguage } from '../../contexts/LanguageContext';

interface GreenhousePlannerProps {
    crops?: string;
    method?: string;
    irrigation?: string;
}

interface Point {
    x: number;
    y: number;
}

interface Shape {
    id: string;
    type: 'greenhouse' | 'plot' | 'sub-plot' | 'walkway' | 'water-source' | 'measurement';
    points: Point[];
    color: string;
    fillColor: string;
    name: string;
    measurement?: {
        distance: number;
        unit: string;
    };
}

interface Tool {
    id: string;
    name: string;
    icon: string;
    cursor: string;
    description: string;
    instructions: string[];
}

const GRID_SIZE = 25; // legacy constant used for meter conversions (25px ≈ 1m)
const PX_PER_METER = 20;
const MINOR_GRID_STEP = PX_PER_METER * 0.5; // 0.5m
const MAJOR_GRID_STEP = PX_PER_METER * 1;   // 1m
const CANVAS_SIZE = { width: 2400, height: 1600 };

export default function GreenhousePlanner({ crops, method, irrigation }: GreenhousePlannerProps) {
    const { t } = useLanguage();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedTool, setSelectedTool] = useState<string>('select');
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);
    const [selectedShape, setSelectedShape] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [showGrid, setShowGrid] = useState(true);
    const [showCoordinates, setShowCoordinates] = useState(true);
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
    const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
    const [measuringMode, setMeasuringMode] = useState(false);
    const [measureStart, setMeasureStart] = useState<Point | null>(null);
    const [measureEnd, setMeasureEnd] = useState<Point | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
    const [isMouseOverCanvas, setIsMouseOverCanvas] = useState(false);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

    // Selection states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
    const [hoveredShape, setHoveredShape] = useState<string | null>(null);
    const [selectedShapes, setSelectedShapes] = useState<string[]>([]);
    const [isDraggingAll, setIsDraggingAll] = useState(false);
    const [isDragSelecting, setIsDragSelecting] = useState(false);
    const [dragSelectStart, setDragSelectStart] = useState<Point>({ x: 0, y: 0 });
    const [dragSelectEnd, setDragSelectEnd] = useState<Point>({ x: 0, y: 0 });

    // Tooltip states
    const [hoveredTool, setHoveredTool] = useState<string | null>(null);
    const [hoveredInstruction, setHoveredInstruction] = useState<string | null>(null);

    // Undo/Redo states
    const [history, setHistory] = useState<Shape[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Copy/Paste states
    const [copiedShapes, setCopiedShapes] = useState<Shape[]>([]);
    const [isPasteMode, setIsPasteMode] = useState(false);

    // Define tools with translation
    const tools: Tool[] = [
        {
            id: 'select',
            name: t('เลือก'),
            icon: '↖️',
            cursor: 'default',
            description: t('เลือกและแก้ไขออบเจ็ค'),
            instructions: [
                t('คลิกเพื่อเลือกออบเจ็ค'),
                t('ลากเพื่อขยับออบเจ็ค (ไม่กด Ctrl)'),
                t('กด Ctrl+คลิก เพื่อเลื่อนมุมมอง'),
                t('คลิกพื้นที่ว่างเพื่อเลื่อนมุมมอง'),
                t('กด Delete เพื่อลบออบเจ็คที่เลือก'),
                t('กด Escape เพื่อยกเลิกการเลือก'),
                t('แสดงข้อมูลการวัดเมื่อเลือกออบเจ็ค'),
                t('กด Ctrl+C เพื่อคัดลอกแปลงปลูก/แปลงปลูกย่อย'),
                t('กด Ctrl+V เพื่อวางแปลงที่คัดลอก'),
            ],
        },
        {
            id: 'selectAll',
            name: t('เลือกทั้งหมด'),
            icon: '📦',
            cursor: 'default',
            description: t('ลากเลือกและขยับออบเจ็คหลายตัว'),
            instructions: [
                t('ลากในพื้นที่ว่างหรือบนออบเจ็คเพื่อเลือกหลายตัว'),
                t('คลิกที่ออบเจ็คที่เลือกแล้วเพื่อลากขยับ'),
                t('กด Ctrl+คลิกที่ออบเจ็คเพื่อเลือกทั้งหมด'),
                t('กด Ctrl+คลิก เพื่อเลื่อนมุมมอง'),
                t('กด Delete เพื่อลบออบเจ็คที่เลือกทั้งหมด'),
                t('กด Escape เพื่อยกเลิกการเลือก'),
            ],
        },
        {
            id: 'greenhouse',
            name: t('โรงเรือน'),
            icon: '🏠',
            cursor: 'crosshair',
            description: t('วาดโครงสร้างโรงเรือน'),
            instructions: [
                t('คลิกเพื่อเริ่มวาดโครงสร้างโรงเรือน'),
                t('คลิกต่อเนื่องเพื่อสร้างมุม'),
                t('คลิกจุดแรก (สีเขียว) เพื่อปิดรูปร่าง'),
                t('กด Enter เพื่อจบการวาด'),
                t('โรงเรือนจะแสดงเป็นพื้นที่สีเขียว'),
                t('🟢 เขียว: ระยะขอบ'),
                t('🟡 เหลือง: ระยะรวม'),
            ],
        },
        {
            id: 'plot',
            name: t('แปลงปลูก'),
            icon: '🌱',
            cursor: 'crosshair',
            description: t('วาดแปลงปลูกพืช'),
            instructions: [
                t('คลิกเพื่อเริ่มวาดแปลงปลูก'),
                t('คลิกต่อเนื่องเพื่อกำหนดรูปร่างแปลง'),
                t('คลิกจุดแรก (สีเขียว) เพื่อปิดรูปร่าง'),
                t('กด Enter เพื่อจบการวาด'),
                t('แปลงจะแสดงเป็นพื้นที่สีเหลือง'),
                t('🟢 เขียว: ระยะขอบ'),
                t('🟡 เหลือง: ระยะรวม'),
            ],
        },
        {
            id: 'sub-plot',
            name: t('แปลงปลูกย่อย'),
            icon: '🌿',
            cursor: 'crosshair',
            description: t('วาดแปลงปลูกย่อยภายในแปลงปลูกหลัก'),
            instructions: [
                t('คลิกเพื่อเริ่มวาดแปลงปลูกย่อย'),
                t('คลิกต่อเนื่องเพื่อกำหนดรูปร่างแปลงย่อย'),
                t('คลิกจุดแรก (สีเขียว) เพื่อปิดรูปร่าง'),
                t('กด Enter เพื่อจบการวาด'),
                t('แปลงย่อยจะแสดงเป็นพื้นที่สีเขียวอ่อน'),
                t('⚠️ ต้องวาดภายในแปลงปลูกหลักเท่านั้น'),
                t('🟢 เขียว: ระยะขอบ'),
                t('🟡 เหลือง: ระยะรวม'),
            ],
        },
        {
            id: 'walkway',
            name: t('ทางเดิน'),
            icon: '🚶',
            cursor: 'crosshair',
            description: t('วาดทางเดินในโรงเรือน'),
            instructions: [
                t('คลิกเพื่อเริ่มวาดทางเดิน'),
                t('คลิกต่อเนื่องเพื่อสร้างเส้นทางเดิน'),
                t('คลิกจุดแรก (สีเขียว) เพื่อปิดรูปร่าง'),
                t('กด Enter เพื่อจบการวาด'),
                t('ทางเดินจะแสดงเป็นพื้นที่สีเทา'),
                t('🟢 เขียว: ระยะขอบ'),
                t('🟡 เหลือง: ระยะรวม'),
            ],
        },
        {
            id: 'water',
            name: t('แหล่งน้ำ'),
            icon: '💧',
            cursor: 'crosshair',
            description: t('กำหนดตำแหน่งแหล่งน้ำ'),
            instructions: [
                t('คลิกครั้งเดียวสำหรับแหล่งน้ำจุด'),
                t('หรือคลิกหลายจุดสำหรับแหล่งน้ำขนาดใหญ่'),
                t('คลิกจุดแรก (สีเขียว) เพื่อปิดรูปร่าง'),
                t('กด Enter เพื่อจบการวาด'),
                t('แหล่งน้ำจะแสดงเป็นสีน้ำเงินพร้อมไอคอน 💧'),
                t('🟢 เขียว: ระยะขอบ'),
                t('🟡 เหลือง: ระยะรวม'),
            ],
        },
        {
            id: 'measure',
            name: t('วัดระยะ'),
            icon: '📏',
            cursor: 'crosshair',
            description: t('วัดระยะห่างระหว่างจุด (1 กริด = 1 เมตร)'),
            instructions: [
                t('คลิกจุดแรกเพื่อเริ่มวัด'),
                t('คลิกจุดที่สองเพื่อวัดระยะ'),
                t('ระยะจะแสดงเป็นเมตรโดยอัตโนมัติ'),
                t('1 ช่องกริด = 1 เมตร'),
                t('กด Escape เพื่อยกเลิกการวัด'),
            ],
        },
    ];

    const generalInstructions = [
        { icon: '🖱️', text: t('ซูม: ล้อเมาส์ (เมื่อเมาส์อยู่เหนือ Canvas)') },
        { icon: '✋', text: t('เลื่อน: ลากด้วยเมาส์ในโหมดเลือก หรือ Ctrl+ลาก') },
        { icon: '🔄', text: t('รีเซ็ตมุมมอง: กดแป้น Spacebar') },
        { icon: '⚡', text: t('จบการวาดทันที: ดับเบิลคลิก') },
        { icon: '🚫', text: t('ยกเลิก: กด Escape') },
        { icon: '↶', text: t('เลิกทำ: Ctrl+Z') },
        { icon: '↷', text: t('ทำซ้ำ: Ctrl+Y หรือ Ctrl+Shift+Z') },
        { icon: '🟢', text: t('เขียว: ระยะขอบ (แต่ละด้าน)') },
        { icon: '🟡', text: t('เหลือง: ระยะรวม (ทั้งหมด)') },
    ];

    // Calculate distance between two points in meters
    const calculateDistance = useCallback((point1: Point, point2: Point): number => {
        const pixelDistance = Math.sqrt(
            Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
        );
        return pixelDistance / PX_PER_METER; // Convert to meters (1 m = 20 px)
    }, []);

    // Calculate polygon area in square meters
    const calculatePolygonArea = useCallback((points: Point[]): number => {
        if (points.length < 3) return 0;

        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        area = Math.abs(area) / 2;

        // Convert from square pixels to square meters (1 m = 20 px)
        return area / (PX_PER_METER * PX_PER_METER);
    }, []);

    // Calculate perimeter in meters
    const calculatePerimeter = useCallback(
        (points: Point[]): number => {
            if (points.length < 2) return 0;

            let perimeter = 0;
            for (let i = 0; i < points.length; i++) {
                const j = (i + 1) % points.length;
                perimeter += calculateDistance(points[i], points[j]);
            }
            return perimeter;
        },
        [calculateDistance]
    );

    // Add to history
    const addToHistory = useCallback(
        (newShapes: Shape[]) => {
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push([...newShapes]);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        },
        [history, historyIndex]
    );

    // Undo function
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setShapes([...history[newIndex]]);
            setSelectedShape(null);
        }
    }, [history, historyIndex]);

    // Redo function
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setShapes([...history[newIndex]]);
            setSelectedShape(null);
        }
    }, [history, historyIndex]);

    // Helper function to check if point is inside polygon
    const isPointInPolygon = useCallback((point: Point, polygon: Point[]): boolean => {
        if (polygon.length < 3) return false;

        let isInside = false;
        let j = polygon.length - 1;

        for (let i = 0; i < polygon.length; i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            if (yi > point.y !== yj > point.y && 
                point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
                isInside = !isInside;
            }
            j = i;
        }

        return isInside;
    }, []);

    // Copy function for plots and sub-plots
    const copySelectedShapes = useCallback(() => {
        if (selectedShape) {
            const shape = shapes.find(s => s.id === selectedShape);
            if (shape && (shape.type === 'plot' || shape.type === 'sub-plot')) {
                setCopiedShapes([shape]);
                setIsPasteMode(true);
                setSelectedTool('select'); // Switch to select tool for pasting
            }
        }
    }, [selectedShape, shapes]);

    // Paste function
    const pasteShapes = useCallback((position: Point) => {
        if (copiedShapes.length === 0) return;

        const newShapes: Shape[] = copiedShapes.map((shape, index) => {
            // Calculate offset from original position
            const originalCenter = {
                x: shape.points.reduce((sum, p) => sum + p.x, 0) / shape.points.length,
                y: shape.points.reduce((sum, p) => sum + p.y, 0) / shape.points.length,
            };

            const offset = {
                x: position.x - originalCenter.x,
                y: position.y - originalCenter.y,
            };

            // Create new shape with offset points
            const newPoints = shape.points.map(point => ({
                x: point.x + offset.x,
                y: point.y + offset.y,
            }));

            // Validate sub-plot placement if needed
            if (shape.type === 'sub-plot') {
                const mainPlots = shapes.filter(s => s.type === 'plot');
                if (mainPlots.length === 0) {
                    alert(t('ไม่สามารถวางแปลงปลูกย่อยได้ เนื่องจากไม่มีแปลงปลูกหลัก'));
                    return null;
                }

                // Check if all points are inside a main plot
                const isInsideMainPlot = newPoints.every(point => 
                    mainPlots.some(mainPlot => isPointInPolygon(point, mainPlot.points))
                );

                if (!isInsideMainPlot) {
                    alert(t('แปลงปลูกย่อยต้องวางภายในแปลงปลูกหลักเท่านั้น'));
                    return null;
                }
            }

            return {
                ...shape,
                id: `${shape.type}-${Date.now()}-${index}`,
                points: newPoints,
            };
        }).filter(Boolean) as Shape[];

        if (newShapes.length > 0) {
            const updatedShapes = [...shapes, ...newShapes];
            setShapes(updatedShapes);
            addToHistory(updatedShapes);
            setIsPasteMode(false);
            setCopiedShapes([]);
        }
    }, [copiedShapes, shapes, addToHistory, isPointInPolygon, t]);

    // Update shape names when language changes (pure mapping, no new refs)
    useEffect(() => {
        const shapeTypeNames = {
            greenhouse: `🏠 ${t('โรงเรือน')}`,
            plot: `🌱 ${t('แปลงปลูก')}`,
            'sub-plot': `🌿 ${t('แปลงปลูกย่อย')}`,
            walkway: `🚶 ${t('ทางเดิน')}`,
            'water-source': `💧 ${t('แหล่งน้ำ')}`,
        } as const;

        setShapes((prevShapes) => {
            let changed = false;
            const mapped = prevShapes.map((shape) => {
                const newName = shapeTypeNames[shape.type as keyof typeof shapeTypeNames] || shape.name;
                if (newName !== shape.name) {
                    changed = true;
                    return { ...shape, name: newName };
                }
                return shape;
            });
            return changed ? mapped : prevShapes;
        });
    }, [t]);

    // Parse initial data from URL parameters (run once)
    const hasInitializedRef = useRef(false);
    useEffect(() => {
        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;

        const urlParams = new URLSearchParams(window.location.search);
        const cropsParam = urlParams.get('crops');
        const shapesParam = urlParams.get('shapes');

        if (cropsParam) {
            const cropArray = cropsParam.split(',').filter(Boolean);
            setSelectedCrops(cropArray);
        }

        if (shapesParam) {
            try {
                const parsedShapes = JSON.parse(decodeURIComponent(shapesParam));
                setShapes(parsedShapes);
                // Initialize history to match parsed shapes
                setHistory([[], [...parsedShapes]]);
                setHistoryIndex(1);
            } catch (error) {
                console.error('Error parsing shapes:', error);
            }
        }
    }, []);

    // Initialize history when shapes are first set (guard against loops)
    const hasSeededHistoryRef = useRef(false);
    useEffect(() => {
        if (!hasSeededHistoryRef.current && shapes.length > 0) {
            setHistory([[], [...shapes]]);
            setHistoryIndex(1);
            hasSeededHistoryRef.current = true;
        }
    }, [shapes]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    // Check if point is close to another point (for auto-closing shapes)
    const isPointNearPoint = useCallback(
        (point1: Point, point2: Point, threshold: number = 15): boolean => {
            const distance = Math.sqrt(
                Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
            );
            return distance <= threshold;
        },
        []
    );

    // Check if point is inside shape
    const isPointInShape = useCallback((point: Point, shape: Shape): boolean => {
        if (shape.type === 'measurement') return false;

        if (shape.type === 'water-source' && shape.points.length === 1) {
            // Circle check for single point water source
            const distance = Math.sqrt(
                Math.pow(point.x - shape.points[0].x, 2) + Math.pow(point.y - shape.points[0].y, 2)
            );
            return distance <= 15;
        }

        if (shape.points.length < 3) return false;

        // Ray casting algorithm for polygon
        let inside = false;
        const points = shape.points;

        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            if (
                points[i].y > point.y !== points[j].y > point.y &&
                point.x <
                    ((points[j].x - points[i].x) * (point.y - points[i].y)) /
                        (points[j].y - points[i].y) +
                        points[i].x
            ) {
                inside = !inside;
            }
        }

        return inside;
    }, []);

    // Find shape at point
    const findShapeAtPoint = useCallback(
        (point: Point): Shape | null => {
            // Search from top to bottom (last drawn first)
            for (let i = shapes.length - 1; i >= 0; i--) {
                if (isPointInShape(point, shapes[i])) {
                    return shapes[i];
                }
            }
            return null;
        },
        [shapes, isPointInShape]
    );

    // Draw grid (aligned with map): minor 0.5m, major 1m
    const drawGrid = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!showGrid) return;

            // Minor grid (lighter)
            ctx.save();
            ctx.strokeStyle = 'rgba(75,85,99,0.25)';
            ctx.lineWidth = 0.5;
            for (let x = 0; x <= CANVAS_SIZE.width; x += MINOR_GRID_STEP) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, CANVAS_SIZE.height);
                ctx.stroke();
            }
            for (let y = 0; y <= CANVAS_SIZE.height; y += MINOR_GRID_STEP) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(CANVAS_SIZE.width, y);
                ctx.stroke();
            }
            ctx.restore();

            // Major grid (darker)
            ctx.save();
            ctx.strokeStyle = '#4B5563';
            ctx.lineWidth = 1;
            for (let x = 0; x <= CANVAS_SIZE.width; x += MAJOR_GRID_STEP) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, CANVAS_SIZE.height);
                ctx.stroke();
            }
            for (let y = 0; y <= CANVAS_SIZE.height; y += MAJOR_GRID_STEP) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(CANVAS_SIZE.width, y);
                ctx.stroke();
            }
            ctx.restore();
        },
        [showGrid]
    );

    // Draw edge measurements for selected shape
    const drawSelectedShapeMeasurements = useCallback(
        (ctx: CanvasRenderingContext2D, shape: Shape) => {
            if (shape.type === 'measurement' || shape.points.length < 2) return;

            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';

            // Draw measurements for each edge
            for (let i = 0; i < shape.points.length; i++) {
                const point1 = shape.points[i];
                const point2 = shape.points[(i + 1) % shape.points.length];

                // Skip the last edge if it's not a closed shape
                if (i === shape.points.length - 1 && shape.points.length < 3) break;

                const distance = calculateDistance(point1, point2);

                const midX = (point1.x + point2.x) / 2;
                const midY = (point1.y + point2.y) / 2;

                // Calculate text position offset
                const angle = Math.atan2(point2.y - point1.y, point2.x - point1.x);
                const textOffsetX = Math.sin(angle) * 20;
                const textOffsetY = -Math.cos(angle) * 20;

                const textX = midX + textOffsetX;
                const textY = midY + textOffsetY;

                // Background for text
                ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
                const text = `${distance.toFixed(1)}m`;
                const textWidth = ctx.measureText(text).width;
                ctx.fillRect(textX - textWidth / 2 - 3, textY - 12, textWidth + 6, 16);

                // Text
                ctx.fillStyle = '#000000';
                ctx.fillText(text, textX, textY - 2);
            }

            // Show total measurements for polygons
            if (shape.points.length >= 3) {
                const perimeter = calculatePerimeter(shape.points);
                const area = calculatePolygonArea(shape.points);

                // Calculate shape center for info display
                const centerX = shape.points.reduce((sum, p) => sum + p.x, 0) / shape.points.length;
                const centerY = shape.points.reduce((sum, p) => sum + p.y, 0) / shape.points.length;

                // Draw info box near the shape
                const infoX = centerX - 80;
                const infoY = centerY - 50;

                ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
                ctx.fillRect(infoX, infoY, 160, 45);

                ctx.fillStyle = '#000000';
                ctx.font = 'bold 11px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${t('เส้นรอบรูป')}: ${perimeter.toFixed(1)}m`, infoX + 80, infoY + 18);
                ctx.fillText(`${t('พื้นที่')}: ${area.toFixed(1)}m²`, infoX + 80, infoY + 35);
            }
        },
        [calculateDistance, calculatePerimeter, calculatePolygonArea, t]
    );

    // Draw shapes
    const drawShapes = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            shapes.forEach((shape) => {
                const isSelected = selectedShape === shape.id;
                const isSelectedAll = selectedShapes.includes(shape.id);
                const isHovered = hoveredShape === shape.id;

                // Handle measurement shapes differently
                if (shape.type === 'measurement') {
                    if (shape.points.length >= 2) {
                        const [start, end] = shape.points;

                        ctx.strokeStyle = isSelected || isSelectedAll ? '#FFD700' : shape.color;
                        ctx.lineWidth = isSelected || isSelectedAll ? 4 : 2;
                        ctx.setLineDash([8, 4]);

                        // Draw measurement line
                        ctx.beginPath();
                        ctx.moveTo(start.x, start.y);
                        ctx.lineTo(end.x, end.y);
                        ctx.stroke();

                        // Draw measurement points
                        ctx.fillStyle = isSelected || isSelectedAll ? '#FFD700' : shape.color;
                        ctx.setLineDash([]);
                        ctx.beginPath();
                        ctx.arc(start.x, start.y, 4, 0, 2 * Math.PI);
                        ctx.fill();

                        ctx.beginPath();
                        ctx.arc(end.x, end.y, 4, 0, 2 * Math.PI);
                        ctx.fill();

                        // Draw measurement text
                        if (shape.measurement) {
                            const midX = (start.x + end.x) / 2;
                            const midY = (start.y + end.y) / 2;

                            const angle = Math.atan2(end.y - start.y, end.x - start.x);
                            const textOffsetX = Math.sin(angle) * 20;
                            const textOffsetY = -Math.cos(angle) * 20;

                            const textX = midX + textOffsetX;
                            const textY = midY + textOffsetY;

                            // Background for text
                            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                            ctx.fillRect(textX - 25, textY - 15, 50, 20);

                            // Text
                            ctx.fillStyle = '#FFFFFF';
                            ctx.font = 'bold 12px Inter, sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillText(
                                `${shape.measurement.distance}${shape.measurement.unit}`,
                                textX,
                                textY
                            );
                        }
                    }
                    return;
                }

                // Regular shapes
                if (shape.points.length < 1) return;

                // Determine colors based on state
                let strokeColor = shape.color;
                const fillColor = shape.fillColor;
                let lineWidth = 2;

                if (isSelected || isSelectedAll) {
                    strokeColor = '#FFD700'; // Gold for selected
                    lineWidth = 4;
                } else if (isHovered && (selectedTool === 'select' || selectedTool === 'selectAll')) {
                    strokeColor = '#60A5FA'; // Light blue for hover
                    lineWidth = 3;
                }

                ctx.strokeStyle = strokeColor;
                ctx.fillStyle = fillColor;
                ctx.lineWidth = lineWidth;
                ctx.setLineDash([]);

                // Special handling for water sources
                if (shape.type === 'water-source') {
                    if (shape.points.length === 1) {
                        // Single point - draw as circle
                        const point = shape.points[0];
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 15, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();

                        // Draw water icon
                        ctx.fillStyle = '#FFFFFF';
                        ctx.font = '16px Inter, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('💧', point.x, point.y + 5);
                    } else {
                        // Multiple points - draw as filled polygon
                        ctx.beginPath();
                        ctx.moveTo(shape.points[0].x, shape.points[0].y);

                        for (let i = 1; i < shape.points.length; i++) {
                            ctx.lineTo(shape.points[i].x, shape.points[i].y);
                        }

                        if (shape.points.length > 2) {
                            ctx.closePath();
                            ctx.fill();
                        }
                        ctx.stroke();

                        // Draw water icon in center
                        if (shape.points.length > 0) {
                            const centerX =
                                shape.points.reduce((sum, p) => sum + p.x, 0) / shape.points.length;
                            const centerY =
                                shape.points.reduce((sum, p) => sum + p.y, 0) / shape.points.length;

                            ctx.fillStyle = '#FFFFFF';
                            ctx.font = '16px Inter, sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillText('💧', centerX, centerY + 5);
                        }
                    }

                    // Draw selection handles for selected shape
                    if (isSelected || isSelectedAll) {
                        ctx.fillStyle = '#FFD700';
                        shape.points.forEach((point) => {
                            ctx.beginPath();
                            ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                            ctx.fill();
                        });
                    }
                    return;
                }

                // Other shapes need at least 2 points
                if (shape.points.length < 2) return;

                ctx.beginPath();
                ctx.moveTo(shape.points[0].x, shape.points[0].y);

                for (let i = 1; i < shape.points.length; i++) {
                    ctx.lineTo(shape.points[i].x, shape.points[i].y);
                }

                if (shape.points.length > 2) {
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.stroke();

                // Draw shape label
                if (shape.points.length > 0) {
                    const centerX =
                        shape.points.reduce((sum, p) => sum + p.x, 0) / shape.points.length;
                    const centerY =
                        shape.points.reduce((sum, p) => sum + p.y, 0) / shape.points.length;

                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '12px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(shape.name, centerX, centerY);
                }

                // Draw selection handles for selected shape
                if (isSelected || isSelectedAll) {
                    ctx.fillStyle = '#FFD700';
                    shape.points.forEach((point) => {
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                        ctx.fill();
                    });
                }
            });

            // Draw measurements for selected shape
            if (selectedShape) {
                const shape = shapes.find((s) => s.id === selectedShape);
                if (shape && shape.type !== 'measurement') {
                    drawSelectedShapeMeasurements(ctx, shape);
                }
            }

            // Draw measurements for all selected shapes in selectAll mode
            if (selectedTool === 'selectAll' && selectedShapes.length > 0) {
                selectedShapes.forEach(shapeId => {
                    const shape = shapes.find((s) => s.id === shapeId);
                    if (shape && shape.type !== 'measurement') {
                        drawSelectedShapeMeasurements(ctx, shape);
                    }
                });
            }
        },
        [shapes, selectedShape, selectedShapes, hoveredShape, selectedTool, drawSelectedShapeMeasurements]
    );

    // Draw edge measurements for current path
    const drawCurrentPathMeasurements = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (currentPath.length < 1) return;

            // Draw measurements for completed edges
            if (currentPath.length >= 2) {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 12px Inter, sans-serif';
                ctx.textAlign = 'center';

                for (let i = 0; i < currentPath.length - 1; i++) {
                    const point1 = currentPath[i];
                    const point2 = currentPath[i + 1];
                    const distance = calculateDistance(point1, point2);

                    const midX = (point1.x + point2.x) / 2;
                    const midY = (point1.y + point2.y) / 2;

                    // Calculate text position offset
                    const angle = Math.atan2(point2.y - point1.y, point2.x - point1.x);
                    const textOffsetX = Math.sin(angle) * 20;
                    const textOffsetY = -Math.cos(angle) * 20;

                    const textX = midX + textOffsetX;
                    const textY = midY + textOffsetY;

                    // Background for text
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
                    const text = `${distance.toFixed(1)}m`;
                    const textWidth = ctx.measureText(text).width;
                    ctx.fillRect(textX - textWidth / 2 - 4, textY - 14, textWidth + 8, 18);

                    // Text
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(text, textX, textY - 2);
                }
            }

            // Draw measurement for current edge (to mouse) - Green = edge distance
            if (mousePos && currentPath.length > 0) {
                const lastPoint = currentPath[currentPath.length - 1];
                const distance = calculateDistance(lastPoint, mousePos);

                const midX = (lastPoint.x + mousePos.x) / 2;
                const midY = (lastPoint.y + mousePos.y) / 2;

                const angle = Math.atan2(mousePos.y - lastPoint.y, mousePos.x - lastPoint.x);
                const textOffsetX = Math.sin(angle) * 25;
                const textOffsetY = -Math.cos(angle) * 25;

                const textX = midX + textOffsetX;
                const textY = midY + textOffsetY;

                // Background for text - Green for edge distance
                ctx.fillStyle = 'rgba(16, 185, 129, 0.95)'; // Bright green
                const text = `${distance.toFixed(1)}m`;
                ctx.font = 'bold 14px Inter, sans-serif'; // Larger font
                const textWidth = ctx.measureText(text).width;
                ctx.fillRect(textX - textWidth / 2 - 6, textY - 16, textWidth + 12, 22);

                // Border
                ctx.strokeStyle = '#10B981';
                ctx.lineWidth = 2;
                ctx.strokeRect(textX - textWidth / 2 - 6, textY - 16, textWidth + 12, 22);

                // Text
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'center';
                ctx.fillText(text, textX, textY - 2);
            }

            // Show live distance next to mouse
            if (mousePos && currentPath.length > 0 && isDrawing) {
                // Calculate total distance
                let totalDistance = 0;

                // Distance of drawn lines
                for (let i = 0; i < currentPath.length - 1; i++) {
                    totalDistance += calculateDistance(currentPath[i], currentPath[i + 1]);
                }

                // Distance from last point to current mouse position
                const lastPoint = currentPath[currentPath.length - 1];
                totalDistance += calculateDistance(lastPoint, mousePos);

                // Show total distance next to mouse (Yellow = total distance)
                const mouseTextX = mousePos.x + 20;
                const mouseTextY = mousePos.y - 10;

                // Background
                ctx.fillStyle = 'rgba(255, 193, 7, 0.95)'; // Yellow
                const mouseText = `${t('รวม')} ${totalDistance.toFixed(1)}m`;
                ctx.font = 'bold 13px Inter, sans-serif';
                const mouseTextWidth = ctx.measureText(mouseText).width;
                ctx.fillRect(mouseTextX - 4, mouseTextY - 15, mouseTextWidth + 8, 20);

                // Border
                ctx.strokeStyle = '#FFC107';
                ctx.lineWidth = 1;
                ctx.strokeRect(mouseTextX - 4, mouseTextY - 15, mouseTextWidth + 8, 20);

                // Text
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'left';
                ctx.fillText(mouseText, mouseTextX, mouseTextY);
            }

            // Show total perimeter and area for polygons
            if (currentPath.length >= 3) {
                const tempPoints = [...currentPath];
                if (mousePos) tempPoints.push(mousePos);

                const perimeter = calculatePerimeter(tempPoints);
                const area = calculatePolygonArea(tempPoints);

                // Draw info box - make it more prominent
                const infoX = 15;
                const infoY = 15;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.fillRect(infoX, infoY, 180, 70);

                // Border
                ctx.strokeStyle = '#3B82F6';
                ctx.lineWidth = 2;
                ctx.strokeRect(infoX, infoY, 180, 70);

                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 13px Inter, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(`${t('เส้นรอบรูป')}: ${perimeter.toFixed(1)}m`, infoX + 10, infoY + 25);
                ctx.fillText(`${t('พื้นที่')}: ${area.toFixed(1)}m²`, infoX + 10, infoY + 50);
            }
        },
        [
            currentPath,
            mousePos,
            calculateDistance,
            calculatePerimeter,
            calculatePolygonArea,
            isDrawing,
            t,
        ]
    );

    // Draw current path
    const drawCurrentPath = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (currentPath.length < 1) return;

            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);

            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);

            for (let i = 1; i < currentPath.length; i++) {
                ctx.lineTo(currentPath[i].x, currentPath[i].y);
            }

            if (mousePos && currentPath.length > 0) {
                // Check if mouse is near first point to show potential closing
                if (currentPath.length >= 3 && isPointNearPoint(mousePos, currentPath[0])) {
                    ctx.strokeStyle = '#10B981'; // Green when near first point
                    ctx.lineWidth = 3;
                }
                ctx.lineTo(mousePos.x, mousePos.y);
            }

            ctx.stroke();
            ctx.setLineDash([]);

            // Draw points
            ctx.fillStyle = '#3B82F6';
            currentPath.forEach((point, index) => {
                ctx.beginPath();
                if (
                    index === 0 &&
                    currentPath.length >= 3 &&
                    mousePos &&
                    isPointNearPoint(mousePos, point)
                ) {
                    // Highlight first point when mouse is near
                    ctx.fillStyle = '#10B981';
                    ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
                } else {
                    ctx.fillStyle = '#3B82F6';
                    ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                }
                ctx.fill();
            });

            // Draw measurements
            drawCurrentPathMeasurements(ctx);
        },
        [currentPath, mousePos, isPointNearPoint, drawCurrentPathMeasurements]
    );

    // Draw measuring line
    const drawMeasuringLine = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!measuringMode || !measureStart) return;

            const endPoint = measureEnd || mousePos;

            ctx.strokeStyle = '#FF6B6B';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);

            // Draw line
            ctx.beginPath();
            ctx.moveTo(measureStart.x, measureStart.y);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.stroke();

            // Draw measurement points
            ctx.fillStyle = '#FF6B6B';
            ctx.beginPath();
            ctx.arc(measureStart.x, measureStart.y, 5, 0, 2 * Math.PI);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(endPoint.x, endPoint.y, 5, 0, 2 * Math.PI);
            ctx.fill();

            // Calculate distance in meters (1 m = 20 px)
            const pixelDistance = Math.sqrt(
                Math.pow(endPoint.x - measureStart.x, 2) + Math.pow(endPoint.y - measureStart.y, 2)
            );
            const distanceInMeters = pixelDistance / PX_PER_METER; // 1 m = 20 px

            // Show distance in meters
            const midX = (measureStart.x + endPoint.x) / 2;
            const midY = (measureStart.y + endPoint.y) / 2;

            // Calculate text position offset to avoid overlapping with line
            const angle = Math.atan2(endPoint.y - measureStart.y, endPoint.x - measureStart.x);
            const textOffsetX = Math.sin(angle) * 20;
            const textOffsetY = -Math.cos(angle) * 20;

            const textX = midX + textOffsetX;
            const textY = midY + textOffsetY;

            // Background for text
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            const text = `${distanceInMeters.toFixed(2)}m`;
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            const textWidth = ctx.measureText(text).width;
            ctx.fillRect(textX - textWidth / 2 - 5, textY - 18, textWidth + 10, 20);

            // Text
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(text, textX, textY - 5);

            ctx.setLineDash([]);
        },
        [measuringMode, measureStart, measureEnd, mousePos]
    );

    // Draw drag selection rectangle
    const drawDragSelection = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!isDragSelecting) return;

            const minX = Math.min(dragSelectStart.x, dragSelectEnd.x);
            const maxX = Math.max(dragSelectStart.x, dragSelectEnd.x);
            const minY = Math.min(dragSelectStart.y, dragSelectEnd.y);
            const maxY = Math.max(dragSelectStart.y, dragSelectEnd.y);

            // Draw selection rectangle
            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

            // Draw semi-transparent fill
            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
            ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

            ctx.setLineDash([]);
        },
        [isDragSelecting, dragSelectStart, dragSelectEnd]
    );

    // Main draw function
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Apply transform
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        drawGrid(ctx);
        drawShapes(ctx);
        drawCurrentPath(ctx);
        drawMeasuringLine(ctx);
        drawDragSelection(ctx);

        ctx.restore();
    }, [drawGrid, drawShapes, drawCurrentPath, drawMeasuringLine, drawDragSelection, zoom, pan]);

    // Redraw when dependencies change
    useEffect(() => {
        draw();
    }, [draw]);

    // Snap to minor grid (0.5m) to align with map
    const snapToGrid = (point: Point): Point => {
        return {
            x: Math.round(point.x / MINOR_GRID_STEP) * MINOR_GRID_STEP,
            y: Math.round(point.y / MINOR_GRID_STEP) * MINOR_GRID_STEP,
        };
    };

    // Get mouse position relative to canvas
    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();

        // Calculate scale factors for canvas size vs display size
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const rawPoint = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };

        // Apply inverse transform
        const transformedPoint = {
            x: (rawPoint.x - pan.x) / zoom,
            y: (rawPoint.y - pan.y) / zoom,
        };

        return snapToGrid(transformedPoint);
    };

    // Get raw mouse position (for panning)
    const getRawMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();

        // Calculate scale factors for canvas size vs display size
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    // Move shape by offset
    const moveShape = useCallback((shapeId: string, offset: Point) => {
        setShapes((prevShapes) =>
            prevShapes.map((shape) => {
                if (shape.id === shapeId) {
                    return {
                        ...shape,
                        points: shape.points.map((point) =>
                            snapToGrid({
                                x: point.x + offset.x,
                                y: point.y + offset.y,
                            })
                        ),
                    };
                }
                return shape;
            })
        );
    }, []);

    // Move all selected shapes by offset
    const moveAllSelectedShapes = useCallback((offset: Point) => {
        setShapes((prevShapes) =>
            prevShapes.map((shape) => {
                if (selectedShapes.includes(shape.id)) {
                    return {
                        ...shape,
                        points: shape.points.map((point) =>
                            snapToGrid({
                                x: point.x + offset.x,
                                y: point.y + offset.y,
                            })
                        ),
                    };
                }
                return shape;
            })
        );
    }, [selectedShapes]);

    // Select all shapes
    const selectAllShapes = useCallback(() => {
        const allShapeIds = shapes.map(shape => shape.id);
        setSelectedShapes(allShapeIds);
        setSelectedShape(null); // Clear single selection
    }, [shapes]);

    // Clear all selections
    const clearAllSelections = useCallback(() => {
        setSelectedShapes([]);
        setSelectedShape(null);
    }, []);

    // Get shapes within drag selection rectangle
    const getShapesInDragSelection = useCallback((start: Point, end: Point): string[] => {
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);

        return shapes
            .filter(shape => {
                if (shape.type === 'measurement') return false;
                
                // Check if any point of the shape is within the selection rectangle
                return shape.points.some(point => 
                    point.x >= minX && point.x <= maxX && 
                    point.y >= minY && point.y <= maxY
                );
            })
            .map(shape => shape.id);
    }, [shapes]);

    // Delete all selected shapes
    const deleteAllSelectedShapes = useCallback(() => {
        if (selectedShapes.length > 0) {
            const newShapes = shapes.filter((s) => !selectedShapes.includes(s.id));
            setShapes(newShapes);
            addToHistory(newShapes);
            setSelectedShapes([]);
        }
    }, [selectedShapes, shapes, addToHistory]);

    // Handle canvas mouse down
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const point = getMousePos(e);

        // Handle panning with middle mouse or Ctrl+click (check first before everything)
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            e.preventDefault();
            setIsPanning(true);
            setLastPanPoint(getRawMousePos(e));
            return;
        }

        // Handle selection tool
        if (selectedTool === 'select') {
            // Handle paste mode
            if (isPasteMode && copiedShapes.length > 0) {
                pasteShapes(point);
                return;
            }

            const clickedShape = findShapeAtPoint(point);

            if (clickedShape && !e.ctrlKey) {
                // Select and start dragging (only when not holding Ctrl)
                setSelectedShape(clickedShape.id);
                setIsDragging(true);

                // Calculate offset from shape center to mouse
                const centerX =
                    clickedShape.points.reduce((sum, p) => sum + p.x, 0) /
                    clickedShape.points.length;
                const centerY =
                    clickedShape.points.reduce((sum, p) => sum + p.y, 0) /
                    clickedShape.points.length;
                setDragOffset({
                    x: point.x - centerX,
                    y: point.y - centerY,
                });
            } else if (!clickedShape) {
                // Click on empty space - deselect and start panning
                setSelectedShape(null);
                setIsPanning(true);
                setLastPanPoint(getRawMousePos(e));
            } else {
                // Click on element while holding Ctrl - only select element, don't drag
                setSelectedShape(clickedShape.id);
            }
            return;
        }

        // Handle select all tool
        if (selectedTool === 'selectAll') {
            // Handle paste mode
            if (isPasteMode && copiedShapes.length > 0) {
                pasteShapes(point);
                return;
            }

            const clickedShape = findShapeAtPoint(point);

            if (e.ctrlKey) {
                // Click on element while holding Ctrl - only select all, don't drag
                selectAllShapes();
            } else if (clickedShape && selectedShapes.includes(clickedShape.id)) {
                // Click on already selected shape - start dragging all selected shapes
                setIsDraggingAll(true);
                
                // Calculate offset from center of all selected shapes to mouse
                const allShapes = shapes.filter(shape => selectedShapes.includes(shape.id));
                if (allShapes.length > 0) {
                    const allPoints = allShapes.flatMap(shape => shape.points);
                    const centerX = allPoints.reduce((sum, p) => sum + p.x, 0) / allPoints.length;
                    const centerY = allPoints.reduce((sum, p) => sum + p.y, 0) / allPoints.length;
                    setDragOffset({
                        x: point.x - centerX,
                        y: point.y - centerY,
                    });
                }
            } else {
                // Always start drag selection (both on empty space and on shapes)
                setIsDragSelecting(true);
                setDragSelectStart(point);
                setDragSelectEnd(point);
                clearAllSelections();
            }
            return;
        }

        // Regular click handling for drawing
        if (e.button === 0) {
            handleCanvasClick(e);
        }
    };

    // Handle canvas mouse up
    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDragging(false);
        setIsDraggingAll(false);
        setDragOffset({ x: 0, y: 0 });

        if (isPanning) {
            setIsPanning(false);
            setLastPanPoint(null);
        }

        if (isDragSelecting) {
            // Finish drag selection and select shapes within the rectangle
            const selectedShapeIds = getShapesInDragSelection(dragSelectStart, dragSelectEnd);
            setSelectedShapes(selectedShapeIds);
            setSelectedShape(null);
            setIsDragSelecting(false);
            setDragSelectStart({ x: 0, y: 0 });
            setDragSelectEnd({ x: 0, y: 0 });
        }
    };

    // Handle canvas click
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isPanning || isDragging) return;

        const point = getMousePos(e);

        // Handle measuring mode
        if (selectedTool === 'measure') {
            if (!measuringMode) {
                setMeasuringMode(true);
                setMeasureStart(point);
                setMeasureEnd(null);
            } else if (measureStart && !measureEnd) {
                setMeasureEnd(point);
                // Auto-confirm measurement without popup
                const pixelDistance = Math.sqrt(
                    Math.pow(point.x - measureStart.x, 2) + Math.pow(point.y - measureStart.y, 2)
                );
                const distanceInMeters = pixelDistance / PX_PER_METER; // 1 m = 20 px

                const measurementShape: Shape = {
                    id: `measurement-${Date.now()}`,
                    type: 'measurement',
                    points: [measureStart, point],
                    color: '#FF6B6B',
                    fillColor: 'transparent',
                    name: `${distanceInMeters.toFixed(2)}m`,
                    measurement: {
                        distance: parseFloat(distanceInMeters.toFixed(2)),
                        unit: 'm',
                    },
                };

                setShapes((prev) => [...prev, measurementShape]);
                addToHistory([...shapes, measurementShape]);

                // Reset measuring mode
                setMeasuringMode(false);
                setMeasureStart(null);
                setMeasureEnd(null);
            }
            return;
        }

        if (selectedTool === 'select') return;

        if (selectedTool === 'water') {
            if (!isDrawing) {
                setIsDrawing(true);
                setCurrentPath([point]);
            } else {
                // Check if clicking near the first point to auto-close
                if (currentPath.length >= 3 && isPointNearPoint(point, currentPath[0])) {
                    finishDrawing();
                    return;
                }
                setCurrentPath((prev) => [...prev, point]);
            }
            return;
        }

        if (!isDrawing) {
            setIsDrawing(true);
            setCurrentPath([point]);
        } else {
            // Check if clicking near the first point to auto-close
            if (currentPath.length >= 3 && isPointNearPoint(point, currentPath[0])) {
                finishDrawing();
                return;
            }
            setCurrentPath((prev) => [...prev, point]);
        }
    };

    // Handle mouse move
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const point = getMousePos(e);
        setMousePos(point);

        if (isPanning && lastPanPoint) {
            // Handle panning
            const currentPoint = getRawMousePos(e);
            const deltaX = currentPoint.x - lastPanPoint.x;
            const deltaY = currentPoint.y - lastPanPoint.y;

            setPan((prevPan) => ({
                x: prevPan.x + deltaX,
                y: prevPan.y + deltaY,
            }));

            setLastPanPoint(currentPoint);
        } else if (isDragging && selectedShape) {
            // Handle shape dragging
            const selectedShapeObj = shapes.find((s) => s.id === selectedShape);
            if (selectedShapeObj) {
                const centerX =
                    selectedShapeObj.points.reduce((sum, p) => sum + p.x, 0) /
                    selectedShapeObj.points.length;
                const centerY =
                    selectedShapeObj.points.reduce((sum, p) => sum + p.y, 0) /
                    selectedShapeObj.points.length;

                const targetX = point.x - dragOffset.x;
                const targetY = point.y - dragOffset.y;

                const offset = {
                    x: targetX - centerX,
                    y: targetY - centerY,
                };

                moveShape(selectedShape, offset);
            }
        } else if (isDraggingAll && selectedShapes.length > 0) {
            // Handle dragging all selected shapes
            const allShapes = shapes.filter(shape => selectedShapes.includes(shape.id));
            if (allShapes.length > 0) {
                const allPoints = allShapes.flatMap(shape => shape.points);
                const centerX = allPoints.reduce((sum, p) => sum + p.x, 0) / allPoints.length;
                const centerY = allPoints.reduce((sum, p) => sum + p.y, 0) / allPoints.length;

                const targetX = point.x - dragOffset.x;
                const targetY = point.y - dragOffset.y;

                const offset = {
                    x: targetX - centerX,
                    y: targetY - centerY,
                };

                moveAllSelectedShapes(offset);
            }
        } else if (isDragSelecting && selectedTool === 'selectAll') {
            // Handle drag selection
            setDragSelectEnd(point);
        } else if (selectedTool === 'select' || selectedTool === 'selectAll') {
            // Handle hover detection
            const hoveredShapeObj = findShapeAtPoint(point);
            setHoveredShape(hoveredShapeObj ? hoveredShapeObj.id : null);
        }
    };

    // Handle mouse wheel for zooming
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheelEvent = (e: WheelEvent) => {
            if (isMouseOverCanvas) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const rect = canvas.getBoundingClientRect();

                // Calculate scale factors for canvas size vs display size
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;

                const mouseX = (e.clientX - rect.left) * scaleX;
                const mouseY = (e.clientY - rect.top) * scaleY;

                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor));

                const zoomRatio = newZoom / zoom;
                const newPanX = mouseX - (mouseX - pan.x) * zoomRatio;
                const newPanY = mouseY - (mouseY - pan.y) * zoomRatio;

                setZoom(newZoom);
                setPan({ x: newPanX, y: newPanY });
            }
        };

        canvas.addEventListener('wheel', handleWheelEvent, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', handleWheelEvent);
        };
    }, [isMouseOverCanvas, zoom, pan]);



    const handleMouseEnter = () => {
        setIsMouseOverCanvas(true);
        document.body.style.overflow = 'hidden';
    };

    const handleMouseLeave = () => {
        setIsMouseOverCanvas(false);
        document.body.style.overflow = 'auto';
        setHoveredShape(null);
        if (isPanning) {
            setIsPanning(false);
            setLastPanPoint(null);
        }
        if (isDragging) {
            setIsDragging(false);
            setDragOffset({ x: 0, y: 0 });
        }
    };

    // Finish drawing

    // Helper function to check if all points of a shape are inside a main plot
    const isShapeInsideMainPlot = useCallback((shapePoints: Point[]): boolean => {
        const mainPlots = shapes.filter(s => s.type === 'plot');
        
        // If no main plots exist, sub-plots cannot be created
        if (mainPlots.length === 0) return false;

        // Check if all points of the sub-plot are inside at least one main plot
        return shapePoints.every(point => 
            mainPlots.some(mainPlot => isPointInPolygon(point, mainPlot.points))
        );
    }, [shapes, isPointInPolygon]);

    const finishDrawing = useCallback(() => {
        if (currentPath.length < 2) {
            setIsDrawing(false);
            setCurrentPath([]);
            return;
        }

        // Validate sub-plot placement
        if (selectedTool === 'sub-plot') {
            if (!isShapeInsideMainPlot(currentPath)) {
                alert(t('แปลงปลูกย่อยต้องวาดภายในแปลงปลูกหลักเท่านั้น'));
                setIsDrawing(false);
                setCurrentPath([]);
                return;
            }
        }

        const shapeTypes = {
            greenhouse: { color: '#10B981', fillColor: '#10B98120', name: `🏠 ${t('โรงเรือน')}` },
            plot: { color: '#F59E0B', fillColor: '#F59E0B20', name: `🌱 ${t('แปลงปลูก')}` },
            'sub-plot': { color: '#22C55E', fillColor: '#22C55E30', name: `🌿 ${t('แปลงปลูกย่อย')}` },
            walkway: { color: '#6B7280', fillColor: '#6B728020', name: `🚶 ${t('ทางเดิน')}` },
            water: { color: '#3B82F6', fillColor: '#3B82F640', name: `💧 ${t('แหล่งน้ำ')}` },
        };

        const config = shapeTypes[selectedTool as keyof typeof shapeTypes];
        if (!config) return;

        const newShape: Shape = {
            id: `${selectedTool}-${Date.now()}`,
            type: selectedTool === 'water' ? 'water-source' : (selectedTool as any),
            points: [...currentPath],
            color: config.color,
            fillColor: config.fillColor,
            name: config.name,
        };

        setShapes((prev) => [...prev, newShape]);
        addToHistory([...shapes, newShape]);
        setIsDrawing(false);
        setCurrentPath([]);
    }, [currentPath, selectedTool, t, shapes, addToHistory, isShapeInsideMainPlot]);

    // Handle key press
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Handle Ctrl+C for copying
            if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                copySelectedShapes();
                return;
            }

            // Handle Ctrl+V for pasting
            if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (isPasteMode && copiedShapes.length > 0) {
                    // Paste at current mouse position
                    pasteShapes(mousePos);
                }
                return;
            }

            // Prevent default if we're handling the key
            if (['Enter', 'Escape', ' ', 'Delete', 'z', 'y'].includes(e.key)) {
                if (e.key === 'Enter' && isDrawing) {
                    e.preventDefault();
                    finishDrawing();
                    return;
                }

                if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsDrawing(false);
                    setCurrentPath([]);
                    setMeasuringMode(false);
                    setMeasureStart(null);
                    setMeasureEnd(null);
                    setIsPanning(false);
                    setLastPanPoint(null);
                    setIsDragging(false);
                    setDragOffset({ x: 0, y: 0 });
                    setSelectedShape(null);
                    return;
                }

                if (e.key === ' ' && !isDrawing) {
                    e.preventDefault();
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                    return;
                }

                // Delete selected shape with Delete key
                if (e.key === 'Delete' && selectedShape && selectedTool === 'select') {
                    e.preventDefault();
                    deleteShape();
                    return;
                }

                // Delete all selected shapes with Delete key
                if (e.key === 'Delete' && selectedShapes.length > 0 && selectedTool === 'selectAll') {
                    e.preventDefault();
                    deleteAllSelectedShapes();
                    return;
                }

                // Undo with Ctrl+Z
                if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
                    e.preventDefault();
                    undo();
                    return;
                }

                // Redo with Ctrl+Y or Ctrl+Shift+Z
                if (
                    (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
                    (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
                ) {
                    e.preventDefault();
                    redo();
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isDrawing, selectedShape, selectedShapes, selectedTool, undo, redo, copySelectedShapes, isPasteMode, copiedShapes, pasteShapes, mousePos, deleteAllSelectedShapes]);

    // Delete selected shape
    const deleteShape = () => {
        if (selectedShape) {
            const newShapes = shapes.filter((s) => s.id !== selectedShape);
            setShapes(newShapes);
            addToHistory(newShapes);
            setSelectedShape(null);
        }
    };


    // Clear all shapes
    const clearAll = () => {
        setShapes([]);
        addToHistory([]);
        setSelectedShape(null);
        setSelectedShapes([]);
        setIsDrawing(false);
        setCurrentPath([]);
        setMeasuringMode(false);
        setMeasureStart(null);
        setMeasureEnd(null);
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const handleProceed = () => {
        const greenhouses = shapes.filter((s) => s.type === 'greenhouse');
        const plots = shapes.filter((s) => s.type === 'plot');

        if (greenhouses.length === 0) {
            alert(t('กรุณาวาดโครงสร้างโรงเรือนอย่างน้อย 1 อัน'));
            return;
        }

        if (plots.length === 0) {
            alert(t('กรุณาวาดแปลงปลูกอย่างน้อย 1 แปลง'));
            return;
        }

        const queryParams = new URLSearchParams({
            crops: selectedCrops.join(','),
            shapes: encodeURIComponent(JSON.stringify(shapes)), // ⭐ Important: Send shapes data
            method: method || 'draw',
        });

        console.log('Planner: Sending shapes data', shapes);
        window.location.href = `/choose-irrigation?${queryParams.toString()}`;
    };

    const handleBack = () => {
        // Save current data
        const currentData = {
            crops: selectedCrops.join(','),
            shapes: shapes,
            method: method || 'draw',
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('plannerData', JSON.stringify(currentData));

        // Go back to area-input (planner) page with crop data
        const queryParams = new URLSearchParams();
        if (selectedCrops.length > 0) {
            queryParams.set('crops', selectedCrops.join(','));
        }

        window.location.href = `/area-input-method?${queryParams.toString()}`;
    };

    return (
        <div className="h-screen bg-gray-900 text-white overflow-hidden">
            {/* Fixed Navbar */}
            <div className="fixed top-0 left-0 right-0 z-50">
                <Navbar />
            </div>

            {/* Main Content with top padding to account for fixed navbar */}
            <div className="pt-16 h-full flex flex-col">
                {/* Header */}
                {!isHeaderCollapsed ? (
                    <div className="flex-shrink-0 border-b border-gray-700 bg-gray-800 px-6 py-3 relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div>
                                    <h1 className="text-xl font-bold">
                                        {t('ออกแบบพื้นที่โรงเรือน พร้อมระบบวัดระยะ')}
                                    </h1>
                                    <p className="text-sm text-gray-400">
                                        {t('วาดโครงสร้างโรงเรือนและแปลงปลูกของคุณ - พื้นที่ 2400x1600 pixels (เส้นย่อย 0.5 m, เส้นหลัก 1 m)')}
                                        <span className="ml-2 text-blue-300">
                                            {t('แสดงการวัดระยะแบบ Real-time')}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 text-sm text-gray-400">
                                <span className="text-green-400">✓ {t('เลือกพืช')}</span>
                                <span>→</span>
                                <span className="text-green-400">✓ {t('เลือกวิธีการวางแผน')}</span>
                                <span>→</span>
                                <span className="font-medium text-blue-400">{t('ออกแบบพื้นที่')}</span>
                                <span>→</span>
                                <span>{t('ระบบน้ำ')}</span>
                                {isPasteMode && (
                                    <>
                                        <span className="ml-4 text-yellow-400">📋 {t('โหมดวาง')}</span>
                                        <span className="text-yellow-300">{t('คลิกเพื่อวางแปลงที่คัดลอก')}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setIsHeaderCollapsed(true)}
                            className="absolute right-2 top-2 rounded bg-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-gray-600"
                            title={t('ซ่อนแถบหัวข้อ')}
                        >
                            ▲
                        </button>
                    </div>
                ) : (
                    <div className="flex-shrink-0 border-b border-gray-700 bg-gray-800 px-6 py-1 flex items-center justify-between">
                        <span className="text-xs text-gray-400">{t('แถบหัวข้อถูกซ่อน')}</span>
                        <button
                            onClick={() => setIsHeaderCollapsed(false)}
                            className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-gray-600"
                            title={t('แสดงแถบหัวข้อ')}
                        >
                            ▼ {t('แสดง')}
                        </button>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex w-64 flex-col border-r border-gray-700 bg-gray-800">
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Selected Crops */}
                            <div className="mb-4">
                                <h3 className="mb-2 text-sm font-medium text-gray-300">{t('พืชที่เลือก')}</h3>
                                <div className="flex flex-wrap gap-1">
                                    {selectedCrops.map((crop, index) => (
                                        <span
                                            key={index}
                                            className="rounded bg-green-600 px-2 py-1 text-xs text-white"
                                        >
                                            {crop}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Tools */}
                            <div className="mb-4">
                                <h3 className="mb-3 text-sm font-medium text-gray-300">{t('เครื่องมือ')}</h3>
                                <div className="space-y-1">
                                    {tools.map((tool) => (
                                        <div key={tool.id} className="relative">
                                            <button
                                                onClick={() => setSelectedTool(tool.id)}
                                                onMouseEnter={() => setHoveredTool(tool.id)}
                                                onMouseLeave={() => setHoveredTool(null)}
                                                className={`w-full rounded p-3 text-left transition-colors ${
                                                    selectedTool === tool.id
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }`}
                                                title={tool.description}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-lg">{tool.icon}</span>
                                                    <span className="text-sm">{tool.name}</span>
                                                </div>
                                            </button>

                                            {/* Tooltip */}
                                            {hoveredTool === tool.id && (
                                                <div className="absolute left-full top-0 z-50 ml-2 w-64 rounded-lg border border-gray-600 bg-gray-800 p-3 shadow-xl">
                                                    <h4 className="mb-2 text-sm font-medium text-blue-300">
                                                        {tool.name}
                                                    </h4>
                                                    <div className="space-y-1 text-xs text-gray-300">
                                                        {tool.instructions.map((instruction, index) => (
                                                            <p key={index}>• {instruction}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Instructions */}
                            <div className="mb-4">
                                <h3 className="mb-2 text-sm font-medium text-gray-300">
                                    {t('คำแนะนำทั่วไป')}
                                </h3>
                                <div className="space-y-1">
                                    {generalInstructions.map((instruction, index) => (
                                        <div
                                            key={index}
                                            className="flex cursor-help items-center space-x-2 text-xs text-gray-400 transition-colors hover:text-gray-200"
                                            onMouseEnter={() => setHoveredInstruction(instruction.text)}
                                            onMouseLeave={() => setHoveredInstruction(null)}
                                        >
                                            <span>{instruction.icon}</span>
                                            <span className="truncate">{instruction.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* View Controls */}
                            <div className="mb-4 space-y-2">
                                <h3 className="text-sm font-medium text-gray-300">{t('ตัวเลือกมุมมอง')}</h3>
                                <div className="flex flex-col space-y-2">
                                    <button
                                        onClick={() => setShowGrid(!showGrid)}
                                        className={`rounded px-3 py-2 text-xs transition-colors ${
                                            showGrid
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        {t('แสดงกริด (1 ช่อง = 1m)')}
                                    </button>
                                    <button
                                        onClick={() => setShowCoordinates(!showCoordinates)}
                                        className={`rounded px-3 py-2 text-xs transition-colors ${
                                            showCoordinates
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        {t('แสดงพิกัด')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setZoom(1);
                                            setPan({ x: 0, y: 0 });
                                        }}
                                        className="rounded bg-gray-700 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-600"
                                    >
                                        🔄 {t('รีเซ็ตมุมมอง')}
                                    </button>
                                </div>
                            </div>

                            {/* Canvas Info */}
                            <div className="mb-4">
                                <h3 className="mb-2 text-sm font-medium text-gray-300">
                                    {t('ข้อมูล Canvas')}
                                </h3>
                                <div className="space-y-1 text-xs text-gray-400">
                                    <p>
                                        {t('ขนาด')}: {CANVAS_SIZE.width} × {CANVAS_SIZE.height} px
                                    </p>
                                    <p>{t('Grid')}: {GRID_SIZE} px = 1 {t('เมตรหน่วย')}</p>
                                    <p>{t('Zoom')}: {(zoom * 100).toFixed(0)}%</p>
                                    <p>
                                        {t('Pan')}: ({pan.x.toFixed(0)}, {pan.y.toFixed(0)})
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="relative flex-1 overflow-hidden">
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_SIZE.width}
                            height={CANVAS_SIZE.height}
                            onMouseDown={handleMouseDown}
                            onMouseUp={handleMouseUp}
                            onMouseMove={handleMouseMove}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onDoubleClick={finishDrawing}
                            onContextMenu={(e) => e.preventDefault()}
                            onTouchStart={(e) => {
                                e.preventDefault();
                                if (e.touches.length === 1) {
                                    const touch = e.touches[0];
                                    const syntheticEvent = {
                                        clientX: touch.clientX,
                                        clientY: touch.clientY,
                                        button: 0,
                                        preventDefault: () => {},
                                    } as React.MouseEvent<HTMLCanvasElement>;
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
                                    } as React.MouseEvent<HTMLCanvasElement>;
                                    handleMouseMove(syntheticEvent);
                                }
                            }}
                            onTouchEnd={(e) => {
                                e.preventDefault();
                                const syntheticEvent = {
                                    preventDefault: () => {},
                                } as React.MouseEvent<HTMLCanvasElement>;
                                handleMouseUp(syntheticEvent);
                            }}
                            onTouchCancel={(e) => {
                                e.preventDefault();
                                const syntheticEvent = {
                                    preventDefault: () => {},
                                } as React.MouseEvent<HTMLCanvasElement>;
                                handleMouseUp(syntheticEvent);
                            }}
                            className="block select-none bg-gray-900"
                            style={{
                                width: '100%',
                                height: '100%',
                                cursor: isPasteMode ? 'copy' : 
                                       isDragging ? 'grabbing' :
                                       isPanning ? 'grabbing' :
                                       selectedTool === 'select' && hoveredShape ? 'grab' :
                                       selectedTool === 'select' ? 'default' :
                                       'crosshair',
                            }}
                        />

                        {/* Coordinates Display - bottom left */}
                        {showCoordinates && (
                            <div className="absolute bottom-4 left-4 rounded bg-black/50 px-3 py-1 text-sm text-white">
                                X: {mousePos.x.toFixed(0)}, Y: {mousePos.y.toFixed(0)} | {t('Zoom')}:{' '}
                                {(zoom * 100).toFixed(0)}%
                            </div>
                        )}

                        {/* Undo/Redo Controls - top left */}
                        <div className="absolute left-4 top-4 flex space-x-2">
                            <button
                                onClick={undo}
                                disabled={historyIndex <= 0}
                                className={`rounded px-3 py-2 text-sm shadow-lg transition-colors ${
                                    historyIndex <= 0
                                        ? 'cursor-not-allowed bg-gray-800 text-gray-500'
                                        : 'bg-gray-700 text-white hover:bg-gray-600'
                                }`}
                                title={t('เลิกทำ: Ctrl+Z')}
                            >
                                ↶ {t('เลิกทำ')}
                            </button>
                            <button
                                onClick={redo}
                                disabled={historyIndex >= history.length - 1}
                                className={`rounded px-3 py-2 text-sm shadow-lg transition-colors ${
                                    historyIndex >= history.length - 1
                                        ? 'cursor-not-allowed bg-gray-800 text-gray-500'
                                        : 'bg-gray-700 text-white hover:bg-gray-600'
                                }`}
                                title={t('ทำซ้ำ: Ctrl+Y')}
                            >
                                ↷ {t('ทำซ้ำ')}
                            </button>
                        </div>

                        

                        {/* Action Buttons */}
                        <div className="absolute right-4 top-4 flex space-x-2">
                            {selectedShape && selectedTool === 'select' && (
                                <button
                                    onClick={deleteShape}
                                    className="rounded bg-orange-600 px-4 py-2 text-sm text-white shadow-lg transition-colors hover:bg-orange-700"
                                >
                                    ❌ {t('ลบองค์ประกอบ')}
                                </button>
                            )}

                            <button
                                onClick={clearAll}
                                className="rounded bg-red-600 px-4 py-2 text-sm text-white shadow-lg transition-colors hover:bg-red-700"
                            >
                                🗑️ {t('ล้างทั้งหมด')}
                            </button>
                        </div>
                    </div>

                    {/* Properties Panel */}
                    {!isRightPanelCollapsed && (
                        <div className="flex w-64 flex-col border-l border-gray-700 bg-gray-800 relative">
                            <button
                                onClick={() => setIsRightPanelCollapsed(true)}
                                className="absolute -left-3 top-2 rounded bg-gray-700 px-1 py-0.5 text-xs text-gray-200 shadow hover:bg-gray-600"
                                title={t('ซ่อนแผงข้อมูล')}
                            >
                                ▶
                            </button>
                            <div className="flex-1 overflow-y-auto p-4">
                            <h3 className="mb-3 text-sm font-medium text-gray-300">{t('รายการออบเจ็ค')}</h3>

                            {shapes.length === 0 ? (
                                <p className="text-sm text-gray-500">{t('ยังไม่มีออบเจ็ค')}</p>
                            ) : (
                                <div className="mb-4 space-y-2">
                                    {shapes.map((shape) => (
                                        <div
                                            key={shape.id}
                                            onClick={() => setSelectedShape(shape.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Delete' && selectedShape === shape.id) {
                                                    e.preventDefault();
                                                    deleteShape();
                                                }
                                            }}
                                            tabIndex={0}
                                            className={`cursor-pointer rounded p-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                selectedShape === shape.id
                                                    ? 'bg-yellow-600 text-white'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="truncate">{shape.name}</span>
                                                <div className="flex items-center space-x-2">
                                                    <span className="ml-2 text-xs text-gray-400">
                                                        {shape.points.length} {t('จุด')}
                                                    </span>
                                                    {selectedShape === shape.id && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteShape();
                                                            }}
                                                            className="text-red-400 transition-colors hover:text-red-300"
                                                            title={t('ลบออบเจ็ค (Delete)')}
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Selected Shape Info */}
                            {selectedShape && (
                                <div className="mb-4 border-t border-gray-700 pt-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <h4 className="text-sm font-medium text-yellow-300">
                                            {t('ออบเจ็คที่เลือก')}
                                        </h4>
                                        <button
                                            onClick={deleteShape}
                                            className="rounded bg-red-900/30 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-900/50 hover:text-red-300"
                                            title={t('ลบออบเจ็ค (Delete)')}
                                        >
                                            🗑️ {t('ลบ')}
                                        </button>
                                    </div>
                                    {(() => {
                                        const shape = shapes.find((s) => s.id === selectedShape);
                                        if (!shape) return null;
                                        return (
                                            <div className="space-y-1 text-xs text-gray-300">
                                                <p>
                                                    <strong>{t('ชื่อ')}:</strong> {shape.name}
                                                </p>
                                                <p>
                                                    <strong>{t('ประเภท')}:</strong> {shape.type}
                                                </p>
                                                <p>
                                                    <strong>{t('จำนวนจุด')}:</strong> {shape.points.length}
                                                </p>
                                                {shape.type !== 'measurement' &&
                                                    shape.points.length >= 2 && (
                                                        <>
                                                            {shape.points.length >= 3 && (
                                                                <>
                                                                    <p>
                                                                        <strong>{t('เส้นรอบรูป')}:</strong>{' '}
                                                                        {calculatePerimeter(
                                                                            shape.points
                                                                        ).toFixed(1)}
                                                                        m
                                                                    </p>
                                                                    <p>
                                                                        <strong>{t('พื้นที่')}:</strong>{' '}
                                                                        {calculatePolygonArea(
                                                                            shape.points
                                                                        ).toFixed(1)}
                                                                        m²
                                                                    </p>
                                                                </>
                                                            )}
                                                            {shape.points.length === 2 && (
                                                                <p>
                                                                    <strong>{t('ระยะทาง')}:</strong>{' '}
                                                                    {calculateDistance(
                                                                        shape.points[0],
                                                                        shape.points[1]
                                                                    ).toFixed(1)}
                                                                    m
                                                                </p>
                                                            )}
                                                            <div className="mt-2 space-y-1">
                                                                <p>
                                                                    <strong>{t('ขนาดแต่ละด้าน')}:</strong>
                                                                </p>
                                                                {shape.points.map((point, i) => {
                                                                    if (
                                                                        i === shape.points.length - 1 &&
                                                                        shape.points.length < 3
                                                                    )
                                                                        return null;
                                                                    const nextPoint =
                                                                        shape.points[
                                                                            (i + 1) %
                                                                                shape.points.length
                                                                        ];
                                                                    const distance = calculateDistance(
                                                                        point,
                                                                        nextPoint
                                                                    );
                                                                    return (
                                                                        <p
                                                                            key={i}
                                                                            className="ml-2 text-xs text-gray-400"
                                                                        >
                                                                            {t('ด้านที่ {num}:').replace('{num}', (i + 1).toString())}{' '}
                                                                            {distance.toFixed(1)}m
                                                                        </p>
                                                                    );
                                                                })}
                                                            </div>
                                                        </>
                                                    )}
                                                <div className="mt-2 text-xs text-yellow-300">
                                                    <p>• {t('ลากเพื่อขยับ (ไม่กด Ctrl)')}</p>
                                                    <p>• {t('Ctrl+คลิกเพื่อเลื่อนมุมมอง')}</p>
                                                    <p>• {t('กด Delete เพื่อลบ')}</p>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Statistics */}
                            <div className="border-t border-gray-700 pt-4">
                                <h4 className="mb-2 text-sm font-medium text-gray-300">{t('สถิติ')}</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">{t('โรงเรือน')}:</span>
                                        <span>
                                            {shapes.filter((s) => s.type === 'greenhouse').length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">{t('แปลงปลูก')}:</span>
                                        <span>{shapes.filter((s) => s.type === 'plot').length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">{t('แปลงปลูกย่อย')}:</span>
                                        <span>{shapes.filter((s) => s.type === 'sub-plot').length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">{t('ทางเดิน')}:</span>
                                        <span>{shapes.filter((s) => s.type === 'walkway').length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">{t('แหล่งน้ำ')}:</span>
                                        <span>
                                            {shapes.filter((s) => s.type === 'water-source').length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">{t('การวัด')}:</span>
                                        <span>
                                            {shapes.filter((s) => s.type === 'measurement').length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">{t('รวม')}:</span>
                                        <span className="font-bold">{shapes.length}</span>
                                    </div>

                                    {/* Total Area Statistics */}
                                    {shapes.filter(
                                        (s) => s.type !== 'measurement' && s.points.length >= 3
                                    ).length > 0 && (
                                        <>
                                            <div className="mt-2 border-t border-gray-600 pt-2">
                                                <h5 className="mb-1 text-xs font-medium text-gray-400">
                                                    {t('พื้นที่รวม (m²)')}
                                                </h5>
                                                {['greenhouse', 'plot', 'sub-plot', 'walkway', 'water-source'].map(
                                                    (type) => {
                                                        const typeShapes = shapes.filter(
                                                            (s) =>
                                                                s.type === type && s.points.length >= 3
                                                        );
                                                        const totalArea = typeShapes.reduce(
                                                            (sum, shape) =>
                                                                sum +
                                                                calculatePolygonArea(shape.points),
                                                            0
                                                        );

                                                        if (totalArea === 0) return null;

                                                        const typeNames = {
                                                            greenhouse: t('โรงเรือน'),
                                                            plot: t('แปลงปลูก'),
                                                            'sub-plot': t('แปลงปลูกย่อย'),
                                                            walkway: t('ทางเดิน'),
                                                            'water-source': t('แหล่งน้ำ'),
                                                        };

                                                        return (
                                                            <div
                                                                key={type}
                                                                className="flex justify-between text-xs"
                                                            >
                                                                <span className="text-gray-500">
                                                                    {
                                                                        typeNames[
                                                                            type as keyof typeof typeNames
                                                                        ]
                                                                    }
                                                                    :
                                                                </span>
                                                                <span className="text-blue-300">
                                                                    {totalArea.toFixed(1)}m²
                                                                </span>
                                                            </div>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    )}
                    {isRightPanelCollapsed && (
                        <div className="flex w-6 flex-col items-center justify-center border-l border-gray-700 bg-gray-800">
                            <button
                                onClick={() => setIsRightPanelCollapsed(false)}
                                className="text-gray-300 transition-colors hover:text-white"
                                title={t('แสดงแผงข้อมูล')}
                            >
                                ◀
                            </button>
                        </div>
                    )}
                </div>

                {/* Bottom Bar */}
                <div className="flex-shrink-0 border-t border-gray-700 bg-gray-800 px-6 py-3">
                    <div className="flex justify-between">
                        <button
                            onClick={handleBack}
                            className="flex items-center rounded bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
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
                                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                />
                            </svg>
                            {t('กลับ')}
                        </button>

                        <button
                            onClick={handleProceed}
                            className="flex items-center rounded bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
                        >
                            {t('ไปขั้นตอนถัดไป: เลือกระบบน้ำ')}
                            <svg
                                className="ml-2 h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Instruction Tooltip */}
                {hoveredInstruction && (
                    <div className="fixed bottom-20 left-1/2 z-50 max-w-xs -translate-x-1/2 transform rounded-lg border border-gray-600 bg-gray-800 p-3 shadow-xl">
                        <div className="text-center text-sm text-gray-300">{hoveredInstruction}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
