import React, { useState, useEffect, useRef, useCallback } from 'react';

// Types
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
    measurement?: { distance: number; unit: string };
    cropType?: string;
}

interface IrrigationElement {
    id: string;
    type: 'main-pipe' | 'sub-pipe' | 'pump' | 'solenoid-valve' | 'ball-valve' | 'sprinkler' | 'drip-line';
    points: Point[];
    color: string;
    width?: number;
    radius?: number;
}

interface Tool {
    id: string;
    name: string;
    icon: string;
    description: string;
    category: string;
}

interface Crop {
    value: string;
    name: string;
    nameEn: string;
    icon: string;
    category: string;
    description: string;
}

// Tools configuration
const tools: Tool[] = [
    { id: 'select', name: 'เลือก', icon: '↖️', description: 'เลือกและแก้ไของค์ประกอบ', category: 'select' },
    { id: 'main-pipe', name: 'ท่อเมน', icon: '🔵', description: 'วาดท่อเมนหลัก', category: 'pipe' },
    { id: 'sub-pipe', name: 'ท่อย่อย', icon: '🟢', description: 'วาดท่อเมนย่อย', category: 'pipe' },
    { id: 'pump', name: 'ปั๊ม', icon: '⚙️', description: 'วางปั๊มน้ำ', category: 'component' },
    { id: 'solenoid-valve', name: 'โซลินอยด์วาล์ว', icon: '🔧', description: 'วางโซลินอยด์วาล์ว', category: 'component' },
    { id: 'ball-valve', name: 'บอลวาล์ว', icon: '🟡', description: 'วางบอลวาล์ว', category: 'component' },
    { id: 'sprinkler', name: 'สปริงเกลอร์', icon: '💦', description: 'วางสปริงเกลอร์', category: 'irrigation' },
    { id: 'drip-line', name: 'สายน้ำหยด', icon: '💧', description: 'วางสายน้ำหยด', category: 'irrigation' }
];

// Irrigation methods
const irrigationMethods = {
    'sprinkler': { name: 'สปริงเกลอร์', radius: 50, spacing: 80 },
    'mini-sprinkler': { name: 'มินิสปริงเกลอร์', radius: 30, spacing: 50 },
    'drip': { name: 'น้ำหยด', radius: 0, spacing: 20 },
    'mixed': { name: 'แบบผสม', radius: 40, spacing: 60 }
};

const GRID_SIZE = 20;
const CANVAS_SIZE = { width: 1200, height: 800 };

export default function GreenhouseMap() {
    // Canvas and interaction states
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedTool, setSelectedTool] = useState('select');
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [showGrid, setShowGrid] = useState(true);
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
    const [isMouseOverCanvas, setIsMouseOverCanvas] = useState(false);

    // Data states
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [irrigationElements, setIrrigationElements] = useState<IrrigationElement[]>([]);
    const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
    const [availableCrops, setAvailableCrops] = useState<Crop[]>([]);
    const [selectedIrrigationMethod, setSelectedIrrigationMethod] = useState('sprinkler');

    // Drawing states
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [hoveredElement, setHoveredElement] = useState<string | null>(null);

    // Dragging states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);

    // Modal states
    const [showCropSelector, setShowCropSelector] = useState(false);
    const [selectedPlot, setSelectedPlot] = useState<string | null>(null);
    const [sprinklerPattern, setSprinklerPattern] = useState<'grid' | 'zigzag'>('grid');

    // Parse URL parameters on component mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const cropsParam = urlParams.get('crops');
        const shapesParam = urlParams.get('shapes');
        const irrigationParam = urlParams.get('irrigation');

        console.log('Map received:', {
            crops: cropsParam,
            shapes: shapesParam ? 'มีข้อมูล shapes' : 'ไม่มีข้อมูล shapes',
            irrigation: irrigationParam
        });

        // Parse crops
        if (cropsParam) {
            setSelectedCrops(cropsParam.split(',').filter(Boolean));
        }

        // Parse irrigation method
        if (irrigationParam) {
            setSelectedIrrigationMethod(irrigationParam);
        }

        // Parse shapes from planner
        if (shapesParam) {
            try {
                const parsedShapes = JSON.parse(decodeURIComponent(shapesParam));
                console.log('Map: Loaded', parsedShapes.length, 'shapes');
                setShapes(parsedShapes);
            } catch (error) {
                console.error('Error parsing shapes:', error);
            }
        }
    }, []);

    // Utility function to get crop info
    const getCropByValue = useCallback((value: string): Crop | undefined => {
        // Basic crop mapping as fallback
        const basicCrops: Record<string, Crop> = {
            'tomato': { value: 'tomato', name: 'มะเขือเทศ', nameEn: 'Tomato', icon: '🍅', category: 'vegetables', description: 'มะเขือเทศ' },
            'bell-pepper': { value: 'bell-pepper', name: 'พริกหวาน', nameEn: 'Bell Pepper', icon: '🫑', category: 'vegetables', description: 'พริกหวาน' },
            'cucumber': { value: 'cucumber', name: 'แตงกวา', nameEn: 'Cucumber', icon: '🥒', category: 'vegetables', description: 'แตงกวา' },
            'lettuce': { value: 'lettuce', name: 'ผักกาดหอม', nameEn: 'Lettuce', icon: '🥬', category: 'vegetables', description: 'ผักกาดหอม' },
            'strawberry': { value: 'strawberry', name: 'สตรอว์เบอร์รี', nameEn: 'Strawberry', icon: '🍓', category: 'fruits', description: 'สตรอว์เบอร์รี' }
        };
        
        return basicCrops[value] || {
            value: value,
            name: value,
            nameEn: value,
            icon: '🌱',
            category: 'unknown',
            description: value
        };
    }, []);

    // Canvas utility functions
    const snapToGrid = (point: Point): Point => ({
        x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
        y: Math.round(point.y / GRID_SIZE) * GRID_SIZE
    });

    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const rawPoint = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };

        const transformedPoint = {
            x: (rawPoint.x - pan.x) / zoom,
            y: (rawPoint.y - pan.y) / zoom
        };

        return snapToGrid(transformedPoint);
    };

    const getRawMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    // Point-in-shape detection
    const isPointInShape = useCallback((point: Point, element: Shape | IrrigationElement): boolean => {
        if ('type' in element && element.type === 'measurement') return false;
        
        if (element.points.length === 1) {
            const distance = Math.sqrt(
                Math.pow(point.x - element.points[0].x, 2) + 
                Math.pow(point.y - element.points[0].y, 2)
            );
            return distance <= 15;
        }
        
        if (element.points.length < 2) return false;
        
        // For pipes/lines
        if ('type' in element && (element.type === 'main-pipe' || element.type === 'sub-pipe' || element.type === 'drip-line')) {
            for (let i = 0; i < element.points.length - 1; i++) {
                const p1 = element.points[i];
                const p2 = element.points[i + 1];
                
                const A = point.x - p1.x;
                const B = point.y - p1.y;
                const C = p2.x - p1.x;
                const D = p2.y - p1.y;
                
                const dot = A * C + B * D;
                const lenSq = C * C + D * D;
                let param = -1;
                if (lenSq !== 0) param = dot / lenSq;
                
                let xx, yy;
                if (param < 0) {
                    xx = p1.x;
                    yy = p1.y;
                } else if (param > 1) {
                    xx = p2.x;
                    yy = p2.y;
                } else {
                    xx = p1.x + param * C;
                    yy = p1.y + param * D;
                }
                
                const dx = point.x - xx;
                const dy = point.y - yy;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= 10) return true;
            }
            return false;
        }
        
        if (element.points.length < 3) return false;
        
        // Ray casting for polygons
        let inside = false;
        const points = element.points;
        
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            if (((points[i].y > point.y) !== (points[j].y > point.y)) &&
                (point.x < (points[j].x - points[i].x) * (point.y - points[i].y) / (points[j].y - points[i].y) + points[i].x)) {
                inside = !inside;
            }
        }
        
        return inside;
    }, []);

    const findElementAtPoint = useCallback((point: Point): { type: 'shape' | 'irrigation', element: Shape | IrrigationElement } | null => {
        // Check irrigation elements first
        for (let i = irrigationElements.length - 1; i >= 0; i--) {
            if (isPointInShape(point, irrigationElements[i])) {
                return { type: 'irrigation', element: irrigationElements[i] };
            }
        }
        
        // Then check shapes
        for (let i = shapes.length - 1; i >= 0; i--) {
            if (isPointInShape(point, shapes[i])) {
                return { type: 'shape', element: shapes[i] };
            }
        }
        
        return null;
    }, [shapes, irrigationElements, isPointInShape]);

    // Drawing functions
    const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
        if (!showGrid) return;
        
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 0.5;
        
        for (let x = 0; x <= CANVAS_SIZE.width; x += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CANVAS_SIZE.height);
            ctx.stroke();
        }
        
        for (let y = 0; y <= CANVAS_SIZE.height; y += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_SIZE.width, y);
            ctx.stroke();
        }
    }, [showGrid]);

    const drawShapes = useCallback((ctx: CanvasRenderingContext2D) => {
        shapes.forEach(shape => {
            const isSelected = selectedElement === shape.id;
            const isHovered = hoveredElement === shape.id;
            
            if (shape.type === 'measurement') {
                if (shape.points.length >= 2) {
                    const [start, end] = shape.points;
                    
                    ctx.strokeStyle = isSelected ? '#FFD700' : shape.color;
                    ctx.lineWidth = isSelected ? 4 : 2;
                    ctx.setLineDash([8, 4]);
                    
                    ctx.beginPath();
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                    ctx.stroke();
                    
                    ctx.setLineDash([]);
                    
                    if (shape.measurement) {
                        const midX = (start.x + end.x) / 2;
                        const midY = (start.y + end.y) / 2;
                        
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                        ctx.fillRect(midX - 25, midY - 15, 50, 20);
                        
                        ctx.fillStyle = '#FFFFFF';
                        ctx.font = 'bold 12px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(`${shape.measurement.distance}${shape.measurement.unit}`, midX, midY);
                    }
                }
                return;
            }

            if (shape.points.length < 1) return;

            let strokeColor = shape.color;
            let fillColor = shape.fillColor;
            let lineWidth = 2;
            
            if (isSelected) {
                strokeColor = '#FFD700';
                lineWidth = 4;
            } else if (isHovered && selectedTool === 'select') {
                strokeColor = '#60A5FA';
                lineWidth = 3;
            }

            ctx.strokeStyle = strokeColor;
            ctx.fillStyle = fillColor;
            ctx.lineWidth = lineWidth;
            ctx.setLineDash([]);

            // Water source special handling
            if (shape.type === 'water-source') {
                if (shape.points.length === 1) {
                    const point = shape.points[0];
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 15, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                    
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('💧', point.x, point.y + 5);
                } else {
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
                }
                
                if (isSelected) {
                    ctx.fillStyle = '#FFD700';
                    shape.points.forEach(point => {
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                        ctx.fill();
                    });
                }
                return;
            }

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

            // Draw crop icon for plots
            if (shape.type === 'plot' && shape.cropType) {
                const crop = getCropByValue(shape.cropType);
                if (crop && shape.points.length > 0) {
                    const centerX = shape.points.reduce((sum, p) => sum + p.x, 0) / shape.points.length;
                    const centerY = shape.points.reduce((sum, p) => sum + p.y, 0) / shape.points.length;
                    
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '24px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(crop.icon, centerX, centerY + 8);
                    
                    ctx.font = '10px sans-serif';
                    ctx.fillText(crop.name, centerX, centerY + 25);
                }
            } else if (shape.points.length > 0) {
                const centerX = shape.points.reduce((sum, p) => sum + p.x, 0) / shape.points.length;
                const centerY = shape.points.reduce((sum, p) => sum + p.y, 0) / shape.points.length;
                
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(shape.name, centerX, centerY);
            }

            if (isSelected) {
                ctx.fillStyle = '#FFD700';
                shape.points.forEach(point => {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                    ctx.fill();
                });
            }
        });
    }, [shapes, selectedElement, hoveredElement, selectedTool, getCropByValue]);

    const drawIrrigationElements = useCallback((ctx: CanvasRenderingContext2D) => {
        irrigationElements.forEach(element => {
            const isSelected = selectedElement === element.id;
            const isHovered = hoveredElement === element.id;
            
            let strokeColor = element.color;
            let lineWidth = element.width || 2;
            
            if (isSelected) {
                strokeColor = '#FFD700';
                lineWidth = Math.max(lineWidth * 1.5, 4);
            } else if (isHovered && selectedTool === 'select') {
                strokeColor = '#60A5FA';
                lineWidth = Math.max(lineWidth * 1.2, 3);
            }

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.setLineDash([]);

            if (element.type === 'main-pipe' || element.type === 'sub-pipe') {
                if (element.points.length >= 2) {
                    ctx.beginPath();
                    ctx.moveTo(element.points[0].x, element.points[0].y);
                    
                    for (let i = 1; i < element.points.length; i++) {
                        ctx.lineTo(element.points[i].x, element.points[i].y);
                    }
                    
                    ctx.stroke();
                }
            } else if (element.type === 'drip-line') {
                if (element.points.length >= 2) {
                    ctx.setLineDash([10, 5]);
                    ctx.beginPath();
                    ctx.moveTo(element.points[0].x, element.points[0].y);
                    
                    for (let i = 1; i < element.points.length; i++) {
                        ctx.lineTo(element.points[i].x, element.points[i].y);
                    }
                    
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            } else if (element.type === 'sprinkler') {
                if (element.points.length >= 1) {
                    const point = element.points[0];
                    const radius = element.radius || 30;
                    
                    // Coverage area
                    ctx.fillStyle = `${element.color}20`;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Sprinkler
                    ctx.fillStyle = element.color;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('💦', point.x, point.y + 4);
                }
            } else {
                // Components
                if (element.points.length >= 1) {
                    const point = element.points[0];
                    
                    ctx.fillStyle = element.color;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 10, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                    
                    const icons = {
                        'pump': '⚙️',
                        'solenoid-valve': '🔧',
                        'ball-valve': '🟡'
                    };
                    
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'center';
                    const icon = icons[element.type as keyof typeof icons] || '●';
                    ctx.fillText(icon, point.x, point.y + 4);
                }
            }

            if (isSelected) {
                ctx.fillStyle = '#FFD700';
                element.points.forEach(point => {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                    ctx.fill();
                });
            }
        });
    }, [irrigationElements, selectedElement, hoveredElement, selectedTool]);

    const drawCurrentPath = useCallback((ctx: CanvasRenderingContext2D) => {
        if (currentPath.length < 1) return;

        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = selectedTool === 'main-pipe' ? 6 : selectedTool === 'sub-pipe' ? 4 : 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        
        for (let i = 1; i < currentPath.length; i++) {
            ctx.lineTo(currentPath[i].x, currentPath[i].y);
        }
        
        if (mousePos && currentPath.length > 0) {
            ctx.lineTo(mousePos.x, mousePos.y);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#3B82F6';
        currentPath.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }, [currentPath, mousePos, selectedTool]);

    // Main draw function
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        drawGrid(ctx);
        drawShapes(ctx);
        drawIrrigationElements(ctx);
        drawCurrentPath(ctx);

        ctx.restore();
    }, [drawGrid, drawShapes, drawIrrigationElements, drawCurrentPath, zoom, pan]);

    useEffect(() => {
        draw();
    }, [draw]);

    // Event handlers
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const point = getMousePos(e);
        
        if (selectedTool === 'select') {
            const clickedElement = findElementAtPoint(point);
            
            if (clickedElement) {
                if (clickedElement.type === 'shape' && clickedElement.element.type === 'plot') {
                    if (selectedCrops.length === 0) {
                        alert('ไม่พบพืชที่เลือกไว้ กรุณากลับไปเลือกพืชในขั้นตอนแรก');
                        return;
                    }
                    setSelectedPlot(clickedElement.element.id);
                    setShowCropSelector(true);
                } else {
                    setSelectedElement(clickedElement.element.id);
                    setIsDragging(true);
                    
                    const centerX = clickedElement.element.points.reduce((sum, p) => sum + p.x, 0) / clickedElement.element.points.length;
                    const centerY = clickedElement.element.points.reduce((sum, p) => sum + p.y, 0) / clickedElement.element.points.length;
                    setDragOffset({ x: point.x - centerX, y: point.y - centerY });
                }
            } else {
                setSelectedElement(null);
                setIsPanning(true);
                setLastPanPoint(getRawMousePos(e));
            }
            return;
        }

        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            e.preventDefault();
            setIsPanning(true);
            setLastPanPoint(getRawMousePos(e));
            return;
        }

        if (e.button === 0) {
            handleCanvasClick(e);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        
        if (isPanning) {
            setIsPanning(false);
            setLastPanPoint(null);
        }
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isPanning || isDragging) return;

        const point = getMousePos(e);

        if (selectedTool === 'select') return;

        // Single-point tools
        if (['pump', 'solenoid-valve', 'ball-valve', 'sprinkler'].includes(selectedTool)) {
            const elementTypes: Record<string, { color: string; width: number; radius?: number }> = {
                'pump': { color: '#8B5CF6', width: 1 },
                'solenoid-valve': { color: '#F59E0B', width: 1 },
                'ball-valve': { color: '#EAB308', width: 1 },
                'sprinkler': { color: '#3B82F6', width: 1, radius: irrigationMethods[selectedIrrigationMethod].radius }
            };

            const config = elementTypes[selectedTool as keyof typeof elementTypes];
            if (!config) return;

            const newElement: IrrigationElement = {
                id: `${selectedTool}-${Date.now()}`,
                type: selectedTool as any,
                points: [point],
                color: config.color,
                width: config.width,
                radius: config.radius
            };

            setIrrigationElements(prev => [...prev, newElement]);
            return;
        }

        // Line-drawing tools
        if (['main-pipe', 'sub-pipe', 'drip-line'].includes(selectedTool)) {
            if (!isDrawing) {
                setIsDrawing(true);
                setCurrentPath([point]);
            } else {
                setCurrentPath(prev => [...prev, point]);
            }
            return;
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const point = getMousePos(e);
        setMousePos(point);

        if (isPanning && lastPanPoint) {
            const currentPoint = getRawMousePos(e);
            const deltaX = currentPoint.x - lastPanPoint.x;
            const deltaY = currentPoint.y - lastPanPoint.y;
            
            setPan(prevPan => ({
                x: prevPan.x + deltaX,
                y: prevPan.y + deltaY
            }));
            
            setLastPanPoint(currentPoint);
        } else if (isDragging && selectedElement) {
            const element = [...shapes, ...irrigationElements].find(el => el.id === selectedElement);
            if (element) {
                const centerX = element.points.reduce((sum, p) => sum + p.x, 0) / element.points.length;
                const centerY = element.points.reduce((sum, p) => sum + p.y, 0) / element.points.length;
                
                const targetX = point.x - dragOffset.x;
                const targetY = point.y - dragOffset.y;
                
                const offset = { x: targetX - centerX, y: targetY - centerY };
                
                if ('type' in element && ['greenhouse', 'plot', 'walkway', 'water-source', 'measurement'].includes(element.type)) {
                    setShapes(prevShapes => 
                        prevShapes.map(shape => {
                            if (shape.id === selectedElement) {
                                return {
                                    ...shape,
                                    points: shape.points.map(p => 
                                        snapToGrid({ x: p.x + offset.x, y: p.y + offset.y })
                                    )
                                };
                            }
                            return shape;
                        })
                    );
                } else {
                    setIrrigationElements(prevElements => 
                        prevElements.map(el => {
                            if (el.id === selectedElement) {
                                return {
                                    ...el,
                                    points: el.points.map(p => 
                                        snapToGrid({ x: p.x + offset.x, y: p.y + offset.y })
                                    )
                                };
                            }
                            return el;
                        })
                    );
                }
            }
        } else if (selectedTool === 'select') {
            const hoveredElementObj = findElementAtPoint(point);
            setHoveredElement(hoveredElementObj ? hoveredElementObj.element.id : null);
        }
    };

    // Mouse wheel for zooming
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheelEvent = (e: WheelEvent) => {
            if (isMouseOverCanvas) {
                e.preventDefault();
                
                const rect = canvas.getBoundingClientRect();
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
        return () => canvas.removeEventListener('wheel', handleWheelEvent);
    }, [isMouseOverCanvas, zoom, pan]);

    const handleMouseEnter = () => {
        setIsMouseOverCanvas(true);
        document.body.style.overflow = 'hidden';
    };

    const handleMouseLeave = () => {
        setIsMouseOverCanvas(false);
        document.body.style.overflow = 'auto';
        setHoveredElement(null);
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

        const elementTypes = {
            'main-pipe': { color: '#3B82F6', width: 6 },
            'sub-pipe': { color: '#10B981', width: 4 },
            'drip-line': { color: '#06B6D4', width: 2 }
        };

        const config = elementTypes[selectedTool as keyof typeof elementTypes];
        if (!config) return;

        const newElement: IrrigationElement = {
            id: `${selectedTool}-${Date.now()}`,
            type: selectedTool as any,
            points: [...currentPath],
            color: config.color,
            width: config.width
        };

        setIrrigationElements(prev => [...prev, newElement]);
        setIsDrawing(false);
        setCurrentPath([]);
    };

    // Key handlers
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (['Enter', 'Escape', ' ', 'Delete'].includes(e.key)) {
                if (e.key === 'Enter' && isDrawing) {
                    e.preventDefault();
                    finishDrawing();
                    return;
                }
                
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsDrawing(false);
                    setCurrentPath([]);
                    setIsPanning(false);
                    setLastPanPoint(null);
                    setIsDragging(false);
                    setDragOffset({ x: 0, y: 0 });
                    setSelectedElement(null);
                    setShowCropSelector(false);
                    return;
                }
                
                if (e.key === ' ' && !isDrawing) {
                    e.preventDefault();
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                    return;
                }
                
                if (e.key === 'Delete' && selectedElement && selectedTool === 'select') {
                    e.preventDefault();
                    deleteElement();
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isDrawing, selectedElement, selectedTool]);

    // Utility functions
    const deleteElement = () => {
        if (selectedElement) {
            setShapes(prev => prev.filter(s => s.id !== selectedElement));
            setIrrigationElements(prev => prev.filter(el => el.id !== selectedElement));
            setSelectedElement(null);
        }
    };

    const autoGenerateSprinklers = () => {
        const plotShapes = shapes.filter(s => s.type === 'plot' || s.type === 'greenhouse');
        if (plotShapes.length === 0) {
            alert('ไม่พบแปลงปลูกหรือโรงเรือนสำหรับสร้างสปริงเกลอร์');
            return;
        }

        const method = irrigationMethods[selectedIrrigationMethod];
        const newSprinklers: IrrigationElement[] = [];

        plotShapes.forEach(plot => {
            if (plot.points.length < 3) return;

            const minX = Math.min(...plot.points.map(p => p.x));
            const maxX = Math.max(...plot.points.map(p => p.x));
            const minY = Math.min(...plot.points.map(p => p.y));
            const maxY = Math.max(...plot.points.map(p => p.y));

            const spacing = method.spacing;
            const radius = method.radius;

            for (let x = minX + spacing/2; x < maxX; x += spacing) {
                for (let y = minY + spacing/2; y < maxY; y += spacing) {
                    let adjustedX = x;
                    let adjustedY = y;

                    if (sprinklerPattern === 'zigzag') {
                        const rowIndex = Math.floor((y - minY) / spacing);
                        if (rowIndex % 2 === 1) {
                            adjustedX += spacing / 2;
                        }
                    }

                    const point = { x: adjustedX, y: adjustedY };
                    if (isPointInShape(point, plot) && adjustedX < maxX && adjustedY < maxY) {
                        const sprinkler: IrrigationElement = {
                            id: `sprinkler-${Date.now()}-${Math.random()}`,
                            type: 'sprinkler',
                            points: [snapToGrid(point)],
                            color: '#3B82F6',
                            radius: radius
                        };
                        newSprinklers.push(sprinkler);
                    }
                }
            }
        });

        setIrrigationElements(prev => [...prev, ...newSprinklers]);
        alert(`สร้างสปริงเกลอร์ ${newSprinklers.length} ตัวเรียบร้อยแล้ว`);
    };

    const autoGenerateDripLines = () => {
        const plotShapes = shapes.filter(s => s.type === 'plot' || s.type === 'greenhouse');
        if (plotShapes.length === 0) {
            alert('ไม่พบแปลงปลูกหรือโรงเรือนสำหรับสร้างสายน้ำหยด');
            return;
        }

        const newDripLines: IrrigationElement[] = [];

        plotShapes.forEach(plot => {
            if (plot.points.length < 3) return;

            const minX = Math.min(...plot.points.map(p => p.x));
            const maxX = Math.max(...plot.points.map(p => p.x));
            const minY = Math.min(...plot.points.map(p => p.y));
            const maxY = Math.max(...plot.points.map(p => p.y));

            const spacing = 40;

            for (let y = minY + spacing; y < maxY; y += spacing) {
                const startPoint = { x: minX + 20, y: y };
                const endPoint = { x: maxX - 20, y: y };

                if (isPointInShape(startPoint, plot) && isPointInShape(endPoint, plot)) {
                    const dripLine: IrrigationElement = {
                        id: `drip-line-${Date.now()}-${Math.random()}`,
                        type: 'drip-line',
                        points: [snapToGrid(startPoint), snapToGrid(endPoint)],
                        color: '#06B6D4',
                        width: 2
                    };
                    newDripLines.push(dripLine);
                }
            }
        });

        setIrrigationElements(prev => [...prev, ...newDripLines]);
        alert(`สร้างสายน้ำหยด ${newDripLines.length} เส้นเรียบร้อยแล้ว`);
    };

    const assignCropToPlot = (cropValue: string) => {
        if (selectedPlot) {
            setShapes(prev => 
                prev.map(shape => {
                    if (shape.id === selectedPlot) {
                        return { ...shape, cropType: cropValue };
                    }
                    return shape;
                })
            );
            setShowCropSelector(false);
            setSelectedPlot(null);
        }
    };

    // Statistics
    const calculateStats = () => {
        const mainPipeLength = irrigationElements
            .filter(el => el.type === 'main-pipe')
            .reduce((total, pipe) => {
                let length = 0;
                for (let i = 0; i < pipe.points.length - 1; i++) {
                    const p1 = pipe.points[i];
                    const p2 = pipe.points[i + 1];
                    length += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                }
                return total + length;
            }, 0);

        const subPipeLength = irrigationElements
            .filter(el => el.type === 'sub-pipe')
            .reduce((total, pipe) => {
                let length = 0;
                for (let i = 0; i < pipe.points.length - 1; i++) {
                    const p1 = pipe.points[i];
                    const p2 = pipe.points[i + 1];
                    length += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                }
                return total + length;
            }, 0);

        const dripLineLength = irrigationElements
            .filter(el => el.type === 'drip-line')
            .reduce((total, pipe) => {
                let length = 0;
                for (let i = 0; i < pipe.points.length - 1; i++) {
                    const p1 = pipe.points[i];
                    const p2 = pipe.points[i + 1];
                    length += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                }
                return total + length;
            }, 0);

        return {
            mainPipeLength: Math.round(mainPipeLength),
            subPipeLength: Math.round(subPipeLength),
            dripLineLength: Math.round(dripLineLength),
            sprinklerCount: irrigationElements.filter(el => el.type === 'sprinkler').length,
            pumpCount: irrigationElements.filter(el => el.type === 'pump').length,
            valveCount: irrigationElements.filter(el => el.type === 'solenoid-valve' || el.type === 'ball-valve').length
        };
    };

    const stats = calculateStats();

    return (
        <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-700 bg-gray-800 px-6 py-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">💧 ออกแบบระบบน้ำในโรงเรือน</h1>
                        <p className="text-sm text-gray-400">ออกแบบระบบการให้น้ำตามแบบโรงเรือนที่วาดไว้</p>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <span className="text-green-400">✓ เลือกพืช</span>
                        <span>→</span>
                        <span className="text-green-400">✓ วางแผน</span>
                        <span>→</span>
                        <span className="text-green-400">✓ ออกแบบพื้นที่</span>
                        <span>→</span>
                        <span className="text-green-400">✓ เลือกระบบน้ำ</span>
                        <span>→</span>
                        <span className="text-blue-400 font-medium">ออกแบบระบบน้ำ</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Toolbar */}
                <div className="w-80 border-r border-gray-700 bg-gray-800 flex flex-col">
                    <div className="p-4 flex-1 overflow-y-auto">
                        {/* Selected Crops */}
                        <div className="mb-4">
                            <h3 className="mb-2 text-sm font-medium text-gray-300">พืชที่เลือก</h3>
                            <div className="flex flex-wrap gap-1">
                                {selectedCrops.map((cropValue, index) => {
                                    const crop = getCropByValue(cropValue);
                                    return (
                                        <span key={index} className="rounded bg-green-600 px-2 py-1 text-xs text-white flex items-center">
                                            {crop?.icon} {crop?.name || cropValue}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Irrigation Method */}
                        <div className="mb-4">
                            <h3 className="mb-2 text-sm font-medium text-gray-300">วิธีการให้น้ำ</h3>
                            <select
                                value={selectedIrrigationMethod}
                                onChange={(e) => setSelectedIrrigationMethod(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
                            >
                                {Object.entries(irrigationMethods).map(([key, method]) => (
                                    <option key={key} value={key}>{method.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tools */}
                        <div className="mb-4">
                            <h3 className="mb-3 text-sm font-medium text-gray-300">เครื่องมือ</h3>
                            <div className="space-y-1">
                                {tools.map(tool => (
                                    <button
                                        key={tool.id}
                                        onClick={() => setSelectedTool(tool.id)}
                                        className={`w-full rounded p-2 text-left transition-colors ${
                                            selectedTool === tool.id
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                        title={tool.description}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm">{tool.icon}</span>
                                            <span className="text-xs">{tool.name}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Auto Generation */}
                        <div className="mb-4">
                            <h3 className="mb-2 text-sm font-medium text-gray-300">สร้างอัตโนมัติ</h3>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2 mb-2">
                                    <label className="text-xs text-gray-400">รูปแบบ:</label>
                                    <select
                                        value={sprinklerPattern}
                                        onChange={(e) => setSprinklerPattern(e.target.value as 'grid' | 'zigzag')}
                                        className="flex-1 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="grid">แถวตรง</option>
                                        <option value="zigzag">ฟันปลา</option>
                                    </select>
                                </div>
                                <button
                                    onClick={autoGenerateSprinklers}
                                    className="w-full text-xs px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                >
                                    💦 สร้างสปริงเกลอร์
                                </button>
                                <button
                                    onClick={autoGenerateDripLines}
                                    className="w-full text-xs px-3 py-2 rounded bg-cyan-600 text-white hover:bg-cyan-700 transition-colors"
                                >
                                    💧 สร้างสายน้ำหยด
                                </button>
                            </div>
                        </div>

                        {/* View Controls */}
                        <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-300 mb-2">การแสดงผล</h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => setShowGrid(!showGrid)}
                                    className={`w-full text-xs px-3 py-2 rounded transition-colors ${
                                        showGrid ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    📐 แสดงกริด
                                </button>
                                <button
                                    onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                                    className="w-full text-xs px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                                >
                                    🔄 รีเซ็ตมุมมอง
                                </button>
                            </div>
                        </div>

                        {/* Statistics */}
                        <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-300 mb-2">สถิติโครงสร้าง</h3>
                            <div className="text-xs text-gray-400 space-y-1 mb-3">
                                <div className="flex justify-between">
                                    <span>🏠 โรงเรือน:</span>
                                    <span>{shapes.filter(s => s.type === 'greenhouse').length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>🌱 แปลงปลูก:</span>
                                    <span>{shapes.filter(s => s.type === 'plot').length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>🚶 ทางเดิน:</span>
                                    <span>{shapes.filter(s => s.type === 'walkway').length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>💧 แหล่งน้ำ:</span>
                                    <span>{shapes.filter(s => s.type === 'water-source').length}</span>
                                </div>
                            </div>
                            
                            <h3 className="text-sm font-medium text-gray-300 mb-2">สถิติระบบน้ำ</h3>
                            <div className="text-xs text-gray-400 space-y-1">
                                <div className="flex justify-between">
                                    <span>ท่อเมน:</span>
                                    <span>{stats.mainPipeLength} px</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ท่อย่อย:</span>
                                    <span>{stats.subPipeLength} px</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>สายน้ำหยด:</span>
                                    <span>{stats.dripLineLength} px</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>สปริงเกลอร์:</span>
                                    <span>{stats.sprinklerCount} ตัว</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ปั๊ม:</span>
                                    <span>{stats.pumpCount} ตัว</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>วาล์ว:</span>
                                    <span>{stats.valveCount} ตัว</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 relative overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_SIZE.width}
                        height={CANVAS_SIZE.height}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onWheel={(e) => e.preventDefault()}
                        onDoubleClick={finishDrawing}
                        onContextMenu={(e) => e.preventDefault()}
                        className="bg-gray-900 select-none block"
                        style={{ 
                            width: '100%',
                            height: '100%',
                            cursor: isDragging ? 'grabbing' : 
                                   isPanning ? 'grabbing' : 
                                   selectedTool === 'select' && hoveredElement ? 'grab' :
                                   selectedTool === 'select' ? 'default' :
                                   'crosshair'
                        }}
                    />

                    {/* Coordinates Display */}
                    <div className="absolute bottom-4 left-4 rounded bg-black/50 px-3 py-1 text-sm text-white">
                        X: {mousePos.x.toFixed(0)}, Y: {mousePos.y.toFixed(0)} | Zoom: {(zoom * 100).toFixed(0)}%
                    </div>

                    {/* Status Messages */}
                    {isDrawing && (
                        <div className="absolute top-4 left-4 rounded bg-blue-600 px-3 py-1 text-sm text-white">
                            กำลังวาด {selectedTool}... (กด Enter เพื่อจบ, Escape เพื่อยกเลิก)
                        </div>
                    )}

                    {isDragging && (
                        <div className="absolute top-4 left-4 rounded bg-yellow-600 px-3 py-1 text-sm text-white">
                            🤏 กำลังขยับองค์ประกอบ...
                        </div>
                    )}

                    {isPanning && (
                        <div className="absolute top-4 left-4 rounded bg-purple-600 px-3 py-1 text-sm text-white">
                            🤏 กำลังเลื่อนมุมมอง...
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex space-x-2">
                        {selectedElement && selectedTool === 'select' && (
                            <button
                                onClick={deleteElement}
                                className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 shadow-lg transition-colors"
                            >
                                🗑️ ลบองค์ประกอบ
                            </button>
                        )}
                        
                        <button
                            onClick={() => {
                                setIrrigationElements([]);
                                setSelectedElement(null);
                            }}
                            className="rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 shadow-lg transition-colors"
                        >
                            🧹 ล้างระบบน้ำ
                        </button>
                    </div>
                </div>

                {/* Properties Panel */}
                <div className="w-64 border-l border-gray-700 bg-gray-800 flex flex-col">
                    <div className="p-4 flex-1 overflow-y-auto">
                        <h3 className="mb-3 text-sm font-medium text-gray-300">โครงสร้างโรงเรือน</h3>
                        
                        {shapes.length === 0 ? (
                            <p className="text-sm text-gray-500">ไม่มีโครงสร้าง</p>
                        ) : (
                            <div className="space-y-3 mb-4">
                                {/* แปลงปลูก */}
                                {shapes.filter(s => s.type === 'plot').length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-medium text-green-400 mb-2">🌱 แปลงปลูก</h4>
                                        <div className="space-y-1">
                                            {shapes.filter(s => s.type === 'plot').map(plot => {
                                                const crop = plot.cropType ? getCropByValue(plot.cropType) : null;
                                                return (
                                                    <div
                                                        key={plot.id}
                                                        onClick={() => {
                                                            if (selectedCrops.length === 0) {
                                                                alert('ไม่พบพืชที่เลือกไว้ กรุณากลับไปเลือกพืชในขั้นตอนแรก');
                                                                return;
                                                            }
                                                            setSelectedPlot(plot.id);
                                                            setShowCropSelector(true);
                                                        }}
                                                        className={`cursor-pointer rounded p-2 text-sm transition-colors ${
                                                            selectedCrops.length === 0 
                                                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                        }`}
                                                        title={selectedCrops.length === 0 ? 'กรุณาเลือกพืชในขั้นตอนแรก' : 'คลิกเพื่อเลือกพืช'}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="truncate">{plot.name}</span>
                                                            <div className="flex items-center space-x-2">
                                                                {crop ? (
                                                                    <span className="text-lg">{crop.icon}</span>
                                                                ) : (
                                                                    <span className="text-gray-500 text-xs">
                                                                        {selectedCrops.length === 0 ? 'ไม่มีพืชให้เลือก' : 'ยังไม่เลือกพืช'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {crop && (
                                                            <div className="text-xs text-gray-400 mt-1">
                                                                {crop.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                
                                {/* โรงเรือน */}
                                {shapes.filter(s => s.type === 'greenhouse').length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-medium text-green-400 mb-2">🏠 โรงเรือน</h4>
                                        <div className="space-y-1">
                                            {shapes.filter(s => s.type === 'greenhouse').map(greenhouse => (
                                                <div key={greenhouse.id} className="rounded p-2 text-sm bg-gray-700 text-gray-300">
                                                    <div className="flex items-center justify-between">
                                                        <span className="truncate">{greenhouse.name}</span>
                                                        <span className="text-xs text-gray-400">{greenhouse.points.length} จุด</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* ทางเดิน */}
                                {shapes.filter(s => s.type === 'walkway').length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-medium text-gray-400 mb-2">🚶 ทางเดิน</h4>
                                        <div className="space-y-1">
                                            {shapes.filter(s => s.type === 'walkway').map(walkway => (
                                                <div key={walkway.id} className="rounded p-2 text-sm bg-gray-700 text-gray-300">
                                                    <div className="flex items-center justify-between">
                                                        <span className="truncate">{walkway.name}</span>
                                                        <span className="text-xs text-gray-400">{walkway.points.length} จุด</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* แหล่งน้ำ */}
                                {shapes.filter(s => s.type === 'water-source').length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-medium text-blue-400 mb-2">💧 แหล่งน้ำ</h4>
                                        <div className="space-y-1">
                                            {shapes.filter(s => s.type === 'water-source').map(water => (
                                                <div key={water.id} className="rounded p-2 text-sm bg-gray-700 text-gray-300">
                                                    <div className="flex items-center justify-between">
                                                        <span className="truncate">{water.name}</span>
                                                        <span className="text-xs text-gray-400">
                                                            {water.points.length === 1 ? 'จุดเดียว' : `${water.points.length} จุด`}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Irrigation Elements List */}
                        <div className="border-t border-gray-700 pt-4">
                            <h3 className="mb-3 text-sm font-medium text-gray-300">องค์ประกอบระบบน้ำ</h3>
                            
                            {irrigationElements.length === 0 ? (
                                <p className="text-sm text-gray-500">ยังไม่มีองค์ประกอบ</p>
                            ) : (
                                <div className="space-y-2">
                                    {irrigationElements.map(element => {
                                        const typeNames = {
                                            'main-pipe': '🔵 ท่อเมน',
                                            'sub-pipe': '🟢 ท่อย่อย',
                                            'pump': '⚙️ ปั๊ม',
                                            'solenoid-valve': '🔧 โซลินอยด์วาล์ว',
                                            'ball-valve': '🟡 บอลวาล์ว',
                                            'sprinkler': '💦 สปริงเกลอร์',
                                            'drip-line': '💧 สายน้ำหยด'
                                        };
                                        
                                        return (
                                            <div
                                                key={element.id}
                                                onClick={() => setSelectedElement(element.id)}
                                                className={`cursor-pointer rounded p-2 text-sm transition-colors ${
                                                    selectedElement === element.id
                                                        ? 'bg-yellow-600 text-white'
                                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="truncate">
                                                        {typeNames[element.type] || element.type}
                                                    </span>
                                                    {selectedElement === element.id && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteElement();
                                                            }}
                                                            className="text-red-400 hover:text-red-300 transition-colors"
                                                            title="ลบองค์ประกอบ"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {element.points.length} จุด
                                                    {element.radius && ` | รัศมี: ${element.radius}px`}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-700 bg-gray-800 px-6 py-3 flex-shrink-0">
                <div className="flex justify-between">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 transition-colors"
                    >
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        กลับ
                    </button>
                    
                    <button
                        onClick={() => alert('ระบบออกแบบเสร็จสิ้น!')}
                        className="flex items-center rounded bg-green-600 px-6 py-2 text-white hover:bg-green-700 transition-colors"
                    >
                        ✅ เสร็จสิ้นการออกแบบ
                        <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Crop Selector Modal */}
            {showCropSelector && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-white">เลือกพืชสำหรับแปลงนี้</h3>
                            <button
                                onClick={() => {
                                    setShowCropSelector(false);
                                    setSelectedPlot(null);
                                }}
                                className="text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>
                        
                        {selectedCrops.length === 0 && (
                            <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                                <div className="text-yellow-300 text-sm">
                                    ⚠️ ไม่พบพืชที่เลือกไว้ กรุณากลับไปเลือกพืชในขั้นตอนแรก
                                </div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                            {selectedCrops.length === 0 ? (
                                <div className="col-span-2 text-center text-gray-400 py-4">
                                    ไม่มีพืชที่เลือกไว้
                                </div>
                            ) : (
                                selectedCrops.map(cropValue => {
                                    const crop = getCropByValue(cropValue);
                                    if (!crop) return null;
                                    return (
                                        <button
                                            key={crop.value}
                                            onClick={() => assignCropToPlot(crop.value)}
                                            className="p-3 rounded-lg border border-gray-600 bg-gray-700 hover:bg-gray-600 transition-colors text-center"
                                        >
                                            <div className="text-2xl mb-1">{crop.icon}</div>
                                            <div className="text-sm text-white">{crop.name}</div>
                                            <div className="text-xs text-gray-400">{crop.nameEn}</div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-600">
                            <button
                                onClick={() => {
                                    if (selectedPlot) {
                                        setShapes(prev => 
                                            prev.map(shape => {
                                                if (shape.id === selectedPlot) {
                                                    const { cropType, ...shapeWithoutCrop } = shape;
                                                    return shapeWithoutCrop;
                                                }
                                                return shape;
                                            })
                                        );
                                    }
                                    setShowCropSelector(false);
                                    setSelectedPlot(null);
                                }}
                                className="w-full py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                            >
                                ลบพืชออกจากแปลง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}