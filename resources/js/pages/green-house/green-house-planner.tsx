import React, { useState, useEffect, useRef, useCallback } from 'react';

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
    type: 'greenhouse' | 'plot' | 'walkway' | 'water-source' | 'measurement';
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

const tools: Tool[] = [
    {
        id: 'select',
        name: 'เลือก',
        icon: '↖️',
        cursor: 'default',
        description: 'เลือกและแก้ไขออบเจ็ค',
        instructions: [
            'คลิกเพื่อเลือกออบเจ็ค',
            'ลากเพื่อขยับออบเจ็ค (ห้ามกด Ctrl)',
            'กด Ctrl+คลิก เพื่อเลื่อนมุมมอง',
            'คลิกพื้นที่ว่างเพื่อเลื่อนมุมมอง',
            'กด Delete เพื่อลบออบเจ็คที่เลือก',
            'กด Escape เพื่อยกเลิกการเลือก',
        ],
    },
    {
        id: 'greenhouse',
        name: 'โรงเรือน',
        icon: '🏠',
        cursor: 'crosshair',
        description: 'วาดโครงสร้างโรงเรือน',
        instructions: [
            'คลิกเพื่อเริ่มวาดโครงสร้างโรงเรือน',
            'คลิกต่อเนื่องเพื่อสร้างมุมต่างๆ',
            'คลิกที่จุดแรก (เขียว) เพื่อปิดรูปร่าง',
            'กด Enter เพื่อจบการวาด',
            'โรงเรือนจะแสดงเป็นพื้นที่สีเขียว',
        ],
    },
    {
        id: 'plot',
        name: 'แปลงปลูก',
        icon: '🌱',
        cursor: 'crosshair',
        description: 'วาดแปลงปลูกพืช',
        instructions: [
            'คลิกเพื่อเริ่มวาดแปลงปลูกพืช',
            'คลิกต่อเนื่องเพื่อกำหนดรูปทรงแปลง',
            'คลิกที่จุดแรก (เขียว) เพื่อปิดรูปร่าง',
            'กด Enter เพื่อจบการวาด',
            'แปลงจะแสดงเป็นพื้นที่สีเหลือง',
        ],
    },
    {
        id: 'walkway',
        name: 'ทางเดิน',
        icon: '🚶',
        cursor: 'crosshair',
        description: 'วาดทางเดินในโรงเรือน',
        instructions: [
            'คลิกเพื่อเริ่มวาดทางเดิน',
            'คลิกต่อเนื่องเพื่อสร้างเส้นทางเดิน',
            'คลิกที่จุดแรก (เขียว) เพื่อปิดรูปร่าง',
            'กด Enter เพื่อจบการวาด',
            'ทางเดินจะแสดงเป็นพื้นที่สีเทา',
        ],
    },
    {
        id: 'water',
        name: 'แหล่งน้ำ',
        icon: '💧',
        cursor: 'crosshair',
        description: 'กำหนดตำแหน่งแหล่งน้ำ',
        instructions: [
            'คลิกจุดเดียวสำหรับแหล่งน้ำแบบจุด',
            'หรือคลิกหลายจุดสำหรับแหล่งน้ำขนาดใหญ่',
            'คลิกที่จุดแรก (เขียว) เพื่อปิดรูปร่าง',
            'กด Enter เพื่อจบการวาด',
            'แหล่งน้ำจะแสดงเป็นสีน้ำเงินพร้อมไอคอน 💧',
        ],
    },
    {
        id: 'measure',
        name: 'วัดระยะ',
        icon: '📏',
        cursor: 'crosshair',
        description: 'วัดระยะทางระหว่างจุด (1 grid = 1 เมตร)',
        instructions: [
            'คลิกจุดแรกเพื่อเริ่มวัด',
            'คลิกจุดที่สองเพื่อวัดระยะ',
            'ระยะทางจะแสดงเป็นเมตรอัตโนมัติ',
            '1 ช่อง grid = 1 เมตร',
            'กด Escape เพื่อยกเลิกการวัด',
        ],
    },
];

const generalInstructions = [
    { icon: '🖱️', text: 'ซูม: ล้อเมาส์ (เมื่อเมาส์อยู่บน Canvas)' },
    { icon: '✋', text: 'แพน: ลากด้วยเมาส์ในโหมดเลือก หรือ Ctrl+ลาก' },
    { icon: '🔄', text: 'รีเซ็ตมุมมอง: กด Spacebar' },
    { icon: '⚡', text: 'จบการวาดทันที: ดับเบิลคลิก' },
    { icon: '🚫', text: 'ยกเลิก: กด Escape' },
    { icon: '↶', text: 'ย้อนกลับ: Ctrl+Z' },
    { icon: '↷', text: 'ทำซ้ำ: Ctrl+Y หรือ Ctrl+Shift+Z' },
];

const GRID_SIZE = 25;
const CANVAS_SIZE = { width: 2400, height: 1600 };

export default function GreenhousePlanner({ crops, method, irrigation }: GreenhousePlannerProps) {
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

    // Selection states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
    const [hoveredShape, setHoveredShape] = useState<string | null>(null);

    // Tooltip states
    const [hoveredTool, setHoveredTool] = useState<string | null>(null);
    const [hoveredInstruction, setHoveredInstruction] = useState<string | null>(null);

    // Undo/Redo states
    const [history, setHistory] = useState<Shape[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);

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

    // Parse crops from URL parameter
    useEffect(() => {
        if (crops) {
            const cropArray = crops.split(',').filter(Boolean);
            setSelectedCrops(cropArray);
        }

        const urlParams = new URLSearchParams(window.location.search);
        const shapesParam = urlParams.get('shapes');

        if (shapesParam) {
            try {
                const parsedShapes = JSON.parse(decodeURIComponent(shapesParam));
                setShapes(parsedShapes);
                addToHistory([[], ...parsedShapes]);
                setHistoryIndex(1);
            } catch (error) {
                console.error('Error parsing shapes:', error);
            }
        }
    }, [crops]);

    // Initialize history with empty shapes
    useEffect(() => {
        if (history.length === 1 && history[0].length === 0 && shapes.length > 0) {
            setHistory([[], [...shapes]]);
            setHistoryIndex(1);
        }
    }, [shapes, history]);

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

    // Draw grid
    const drawGrid = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!showGrid) return;

            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 0.5;

            // Vertical lines
            for (let x = 0; x <= CANVAS_SIZE.width; x += GRID_SIZE) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, CANVAS_SIZE.height);
                ctx.stroke();
            }

            // Horizontal lines
            for (let y = 0; y <= CANVAS_SIZE.height; y += GRID_SIZE) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(CANVAS_SIZE.width, y);
                ctx.stroke();
            }

            // Major grid lines every 100px
            ctx.strokeStyle = '#4B5563';
            ctx.lineWidth = 1;

            for (let x = 0; x <= CANVAS_SIZE.width; x += GRID_SIZE * 4) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, CANVAS_SIZE.height);
                ctx.stroke();
            }

            for (let y = 0; y <= CANVAS_SIZE.height; y += GRID_SIZE * 4) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(CANVAS_SIZE.width, y);
                ctx.stroke();
            }
        },
        [showGrid]
    );

    // Draw shapes
    const drawShapes = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            shapes.forEach((shape) => {
                const isSelected = selectedShape === shape.id;
                const isHovered = hoveredShape === shape.id;

                // Handle measurement shapes differently
                if (shape.type === 'measurement') {
                    if (shape.points.length >= 2) {
                        const [start, end] = shape.points;

                        ctx.strokeStyle = isSelected ? '#FFD700' : shape.color;
                        ctx.lineWidth = isSelected ? 4 : 2;
                        ctx.setLineDash([8, 4]);

                        // Draw measurement line
                        ctx.beginPath();
                        ctx.moveTo(start.x, start.y);
                        ctx.lineTo(end.x, end.y);
                        ctx.stroke();

                        // Draw measurement points
                        ctx.fillStyle = isSelected ? '#FFD700' : shape.color;
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

                if (isSelected) {
                    strokeColor = '#FFD700'; // Gold for selected
                    lineWidth = 4;
                } else if (isHovered && selectedTool === 'select') {
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
                    if (isSelected) {
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
                if (isSelected) {
                    ctx.fillStyle = '#FFD700';
                    shape.points.forEach((point) => {
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                        ctx.fill();
                    });
                }
            });
        },
        [shapes, selectedShape, hoveredShape, selectedTool]
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
        },
        [currentPath, mousePos, isPointNearPoint]
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

            // Calculate distance in meters (1 grid = 25 pixels = 1 meter)
            const pixelDistance = Math.sqrt(
                Math.pow(endPoint.x - measureStart.x, 2) + Math.pow(endPoint.y - measureStart.y, 2)
            );
            const distanceInMeters = pixelDistance / GRID_SIZE; // GRID_SIZE = 25 pixels = 1 meter

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

        ctx.restore();
    }, [drawGrid, drawShapes, drawCurrentPath, drawMeasuringLine, zoom, pan]);

    // Redraw when dependencies change
    useEffect(() => {
        draw();
    }, [draw]);

    // Snap to grid
    const snapToGrid = (point: Point): Point => {
        return {
            x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(point.y / GRID_SIZE) * GRID_SIZE,
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

    // Handle canvas mouse down
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const point = getMousePos(e);

        // Handle panning with middle mouse or Ctrl+click (ตรวจสอบก่อนทุกอย่าง)
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            e.preventDefault();
            setIsPanning(true);
            setLastPanPoint(getRawMousePos(e));
            return;
        }

        // Handle selection tool
        if (selectedTool === 'select') {
            const clickedShape = findShapeAtPoint(point);

            if (clickedShape && !e.ctrlKey) {
                // Select and start dragging (เฉพาะเมื่อไม่กด Ctrl)
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
                // คลิกที่องค์ประกอบขณะกด Ctrl - เฉพาะเลือกองค์ประกอบ ไม่ลาก
                setSelectedShape(clickedShape.id);
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
        setDragOffset({ x: 0, y: 0 });

        if (isPanning) {
            setIsPanning(false);
            setLastPanPoint(null);
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
                const distanceInMeters = pixelDistance / GRID_SIZE; // 1 grid = 1 meter

                const measurementShape: Shape = {
                    id: `measurement-${Date.now()}`,
                    type: 'measurement',
                    points: [measureStart, point],
                    color: '#FF6B6B',
                    fillColor: 'transparent',
                    name: `📏 ${distanceInMeters.toFixed(2)}m`,
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
        } else if (selectedTool === 'select') {
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
                const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));

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

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        if (isMouseOverCanvas) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

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
    const finishDrawing = () => {
        if (currentPath.length < 2) {
            setIsDrawing(false);
            setCurrentPath([]);
            return;
        }

        const shapeTypes = {
            greenhouse: { color: '#10B981', fillColor: '#10B98120', name: '🏠 โรงเรือน' },
            plot: { color: '#F59E0B', fillColor: '#F59E0B20', name: '🌱 แปลงปลูก' },
            walkway: { color: '#6B7280', fillColor: '#6B728020', name: '🚶 ทางเดิน' },
            water: { color: '#3B82F6', fillColor: '#3B82F640', name: '💧 แหล่งน้ำ' },
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
    };

    // Handle key press
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
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
    }, [isDrawing, selectedShape, selectedTool, undo, redo]);

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
            alert('กรุณาวาดโครงสร้างโรงเรือนอย่างน้อย 1 อัน');
            return;
        }

        if (plots.length === 0) {
            alert('กรุณาวาดแปลงปลูกอย่างน้อย 1 แปลง');
            return;
        }

        const queryParams = new URLSearchParams({
            crops: selectedCrops.join(','),
            shapes: encodeURIComponent(JSON.stringify(shapes)), // ⭐ สำคัญ: ส่งข้อมูล shapes
            method: method || 'draw',
        });

        console.log('Planner: Sending shapes data', shapes);
        window.location.href = `/choose-irrigation?${queryParams.toString()}`;
    };

    const handleBack = () => {
        // บันทึกข้อมูลปัจจุบัน
        const currentData = {
            crops: selectedCrops.join(','),
            shapes: shapes,
            method: method || 'draw',
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('plannerData', JSON.stringify(currentData));

        // กลับไปหน้า area-input (planner) พร้อมข้อมูลพืช
        const queryParams = new URLSearchParams();
        if (selectedCrops.length > 0) {
            queryParams.set('crops', selectedCrops.join(','));
        }

        window.location.href = `/area-input-method?${queryParams.toString()}`;
    };

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-gray-900 text-white">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-700 bg-gray-800 px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div>
                            <h1 className="text-xl font-bold">
                                🏗️ ออกแบบพื้นที่โรงเรือน (ขนาดใหญ่)
                            </h1>
                            <p className="text-sm text-gray-400">
                                วาดโครงสร้างโรงเรือนและแปลงปลูกของคุณ - พื้นที่ 2400x1600 pixels (1
                                grid = 1 เมตร)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <span className="text-green-400">เลือกพืช</span>
                        <span>→</span>
                        <span className="text-green-400">วิธีการวางแผน</span>
                        <span>→</span>
                        <span className="font-medium text-blue-400">ออกแบบพื้นที่</span>
                        <span>→</span>
                        <span>ระบบน้ำ</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Toolbar */}
                <div className="flex w-64 flex-col border-r border-gray-700 bg-gray-800">
                    <div className="flex-1 overflow-y-auto p-4">
                        {/* Selected Crops */}
                        <div className="mb-4">
                            <h3 className="mb-2 text-sm font-medium text-gray-300">พืชที่เลือก</h3>
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
                            <h3 className="mb-3 text-sm font-medium text-gray-300">เครื่องมือ</h3>
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
                                คำแนะนำทั่วไป
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
                            <h3 className="text-sm font-medium text-gray-300">ตัวเลือกมุมมอง</h3>
                            <div className="flex flex-col space-y-2">
                                <button
                                    onClick={() => setShowGrid(!showGrid)}
                                    className={`rounded px-3 py-2 text-xs transition-colors ${
                                        showGrid
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    📐 แสดงกริด (1 ช่อง = 1m)
                                </button>
                                <button
                                    onClick={() => setShowCoordinates(!showCoordinates)}
                                    className={`rounded px-3 py-2 text-xs transition-colors ${
                                        showCoordinates
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    📍 แสดงพิกัด
                                </button>
                                <button
                                    onClick={() => {
                                        setZoom(1);
                                        setPan({ x: 0, y: 0 });
                                    }}
                                    className="rounded bg-gray-700 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-600"
                                >
                                    🔄 รีเซ็ตมุมมอง
                                </button>
                            </div>
                        </div>

                        {/* Canvas Info */}
                        <div className="mb-4">
                            <h3 className="mb-2 text-sm font-medium text-gray-300">
                                ข้อมูล Canvas
                            </h3>
                            <div className="space-y-1 text-xs text-gray-400">
                                <p>
                                    📏 ขนาด: {CANVAS_SIZE.width} × {CANVAS_SIZE.height} px
                                </p>
                                <p>📐 Grid: {GRID_SIZE} px = 1 เมตร</p>
                                <p>🔍 Zoom: {(zoom * 100).toFixed(0)}%</p>
                                <p>
                                    📍 Pan: ({pan.x.toFixed(0)}, {pan.y.toFixed(0)})
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
                        onWheel={handleWheel}
                        onDoubleClick={finishDrawing}
                        onContextMenu={(e) => e.preventDefault()}
                        className="block select-none bg-gray-900"
                        style={{
                            width: '100%',
                            height: '100%',
                            cursor: isDragging
                                ? 'grabbing'
                                : isPanning
                                  ? 'grabbing'
                                  : selectedTool === 'select' && hoveredShape
                                    ? 'grab'
                                    : selectedTool === 'select'
                                      ? 'default'
                                      : 'crosshair',
                        }}
                    />

                    {/* Coordinates Display - ล่างซ้าย */}
                    {showCoordinates && (
                        <div className="absolute bottom-4 left-4 rounded bg-black/50 px-3 py-1 text-sm text-white">
                            X: {mousePos.x.toFixed(0)}, Y: {mousePos.y.toFixed(0)} | Zoom:{' '}
                            {(zoom * 100).toFixed(0)}%
                        </div>
                    )}

                    {/* Undo/Redo Controls - บนซ้าย */}
                    <div className="absolute left-4 top-4 flex space-x-2">
                        <button
                            onClick={undo}
                            disabled={historyIndex <= 0}
                            className={`rounded px-3 py-2 text-sm shadow-lg transition-colors ${
                                historyIndex <= 0
                                    ? 'cursor-not-allowed bg-gray-800 text-gray-500'
                                    : 'bg-gray-700 text-white hover:bg-gray-600'
                            }`}
                            title="ย้อนกลับ (Ctrl+Z)"
                        >
                            ↶ Undo
                        </button>
                        <button
                            onClick={redo}
                            disabled={historyIndex >= history.length - 1}
                            className={`rounded px-3 py-2 text-sm shadow-lg transition-colors ${
                                historyIndex >= history.length - 1
                                    ? 'cursor-not-allowed bg-gray-800 text-gray-500'
                                    : 'bg-gray-700 text-white hover:bg-gray-600'
                            }`}
                            title="ทำซ้ำ (Ctrl+Y)"
                        >
                            ↷ Redo
                        </button>
                    </div>

                    {/* Status Messages */}
                    {isDrawing && (
                        <div className="absolute left-4 top-20 rounded bg-blue-600 px-3 py-1 text-sm text-white">
                            กำลังวาด... (กด Enter เพื่อจบ, Escape เพื่อยกเลิก)
                        </div>
                    )}

                    {measuringMode && !measureEnd && (
                        <div className="absolute left-4 top-20 rounded bg-red-600 px-3 py-1 text-sm text-white">
                            📏 คลิกจุดที่สองเพื่อวัดระยะ (1 grid = 1m, Escape เพื่อยกเลิก)
                        </div>
                    )}

                    {isDragging && (
                        <div className="absolute left-4 top-20 rounded bg-yellow-600 px-3 py-1 text-sm text-white">
                            🤏 กำลังขยับออบเจ็ค... (ไม่กด Ctrl)
                        </div>
                    )}

                    {isPanning && (
                        <div className="absolute left-4 top-20 rounded bg-purple-600 px-3 py-1 text-sm text-white">
                            🤏 กำลังเลื่อนมุมมอง... (Ctrl+Drag หรือ คลิกพื้นที่ว่าง)
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="absolute right-4 top-4 flex space-x-2">
                        {selectedShape && selectedTool === 'select' && (
                            <button
                                onClick={deleteShape}
                                className="rounded bg-orange-600 px-4 py-2 text-sm text-white shadow-lg transition-colors hover:bg-orange-700"
                            >
                                ❌ ลบออบเจ็คที่เลือก
                            </button>
                        )}

                        <button
                            onClick={clearAll}
                            className="rounded bg-red-600 px-4 py-2 text-sm text-white shadow-lg transition-colors hover:bg-red-700"
                        >
                            🗑️ ล้างทั้งหมด
                        </button>
                    </div>
                </div>

                {/* Properties Panel */}
                <div className="flex w-64 flex-col border-l border-gray-700 bg-gray-800">
                    <div className="flex-1 overflow-y-auto p-4">
                        <h3 className="mb-3 text-sm font-medium text-gray-300">รายการออบเจ็ค</h3>

                        {shapes.length === 0 ? (
                            <p className="text-sm text-gray-500">ยังไม่มีออบเจ็ค</p>
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
                                                    {shape.points.length} จุด
                                                </span>
                                                {selectedShape === shape.id && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteShape();
                                                        }}
                                                        className="text-red-400 transition-colors hover:text-red-300"
                                                        title="ลบออบเจ็ค (Delete)"
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
                                        ออบเจ็คที่เลือก
                                    </h4>
                                    <button
                                        onClick={deleteShape}
                                        className="rounded bg-red-900/30 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-900/50 hover:text-red-300"
                                        title="ลบออบเจ็ค (Delete)"
                                    >
                                        🗑️ ลบ
                                    </button>
                                </div>
                                {(() => {
                                    const shape = shapes.find((s) => s.id === selectedShape);
                                    if (!shape) return null;
                                    return (
                                        <div className="space-y-1 text-xs text-gray-300">
                                            <p>
                                                <strong>ชื่อ:</strong> {shape.name}
                                            </p>
                                            <p>
                                                <strong>ประเภท:</strong> {shape.type}
                                            </p>
                                            <p>
                                                <strong>จำนวนจุด:</strong> {shape.points.length}
                                            </p>
                                            <div className="mt-2 text-xs text-yellow-300">
                                                <p>• ลากเพื่อขยับ (ไม่กด Ctrl)</p>
                                                <p>• Ctrl+คลิก เพื่อเลื่อนมุมมอง</p>
                                                <p>• กด Delete เพื่อลบ</p>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Statistics */}
                        <div className="border-t border-gray-700 pt-4">
                            <h4 className="mb-2 text-sm font-medium text-gray-300">สถิติ</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">โรงเรือน:</span>
                                    <span>
                                        {shapes.filter((s) => s.type === 'greenhouse').length}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">แปลงปลูก:</span>
                                    <span>{shapes.filter((s) => s.type === 'plot').length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">ทางเดิน:</span>
                                    <span>{shapes.filter((s) => s.type === 'walkway').length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">แหล่งน้ำ:</span>
                                    <span>
                                        {shapes.filter((s) => s.type === 'water-source').length}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">การวัด:</span>
                                    <span>
                                        {shapes.filter((s) => s.type === 'measurement').length}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">รวม:</span>
                                    <span className="font-bold">{shapes.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
                        กลับ
                    </button>

                    <button
                        onClick={handleProceed}
                        className="flex items-center rounded bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
                    >
                        ไปขั้นตอนถัดไป: เลือกระบบน้ำ
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
    );
}
