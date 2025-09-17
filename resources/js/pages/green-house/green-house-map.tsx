/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import { useLanguage } from '../../contexts/LanguageContext';

// Types
interface Point {
    x: number;
    y: number;
}

interface Shape {
    id: string;
    type: 'greenhouse' | 'plot' | 'walkway' | 'water-source' | 'measurement' | 'fertilizer-area' | 'fertilizer-machine';
    points: Point[];
    color: string;
    fillColor: string;
    name: string;
    measurement?: { distance: number; unit: string };
    cropType?: string;
    connections?: string[]; // Array of connected element IDs
}

interface IrrigationElement {
    id: string;
    type:
        | 'main-pipe'
        | 'sub-pipe'
        | 'pump'
        | 'solenoid-valve'
        | 'ball-valve'
        | 'sprinkler'
        | 'drip-line'
        | 'water-tank'
        | 'fertilizer-machine';
    points: Point[];
    color: string;
    width?: number;
    radius?: number;
    angle?: number;
    spacing?: number;
    capacityLiters?: number;
    overlap?: number; // 0.0 - 0.5 (0% - 50%)
    connections?: string[]; // Array of connected element IDs
}

// History state interface
interface HistoryState {
    shapes: Shape[];
    irrigationElements: IrrigationElement[];
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

export default function GreenhouseMap() {
    const { t } = useLanguage();
    
    // Tools configuration
    const tools: Tool[] = [
        {
            id: 'select',
            name: t('เลือก'),
            icon: '↖️',
            description: t('เลือกและแก้ไขอุปกรณ์'),
            category: 'select',
        },
        { id: 'main-pipe', name: t('ท่อเมน'), icon: '🔴', description: t('วาดท่อเมน'), category: 'pipe' },
        { id: 'sub-pipe', name: t('ท่อย่อย'), icon: '🟣', description: t('วาดท่อย่อย'), category: 'pipe' },
        { id: 'pump', name: t('ปั๊ม'), icon: '⚙️', description: t('วางปั๊มน้ำ'), category: 'component' },
        {
            id: 'solenoid-valve',
            name: t('โซลินอยด์วาล์ว'),
            icon: '🔧',
            description: t('วางโซลินอยด์วาล์ว'),
            category: 'component',
        },
        {
            id: 'ball-valve',
            name: t('บอลวาล์ว'),
            icon: '🟡',
            description: t('วางบอลวาล์ว'),
            category: 'component',
        },
        {
            id: 'water-tank',
            name: t('ถังเก็บน้ำ'),
            icon: '🗂️',
            description: t('วางถังเก็บน้ำ'),
            category: 'component',
        },
        {
            id: 'fertilizer-machine',
            name: t('เครื่องให้ปุ๋ย'),
            icon: '🧪',
            description: t('วางเครื่องให้ปุ๋ย'),
            category: 'component',
        },
        {
            id: 'sprinkler',
            name: t('มินิสปริงเกลอร์'),
            icon: '💦',
            description: t('วางมินิสปริงเกลอร์'),
            category: 'irrigation',
        },
        {
            id: 'drip-line',
            name: t('สายน้ำหยด'),
            icon: '💧',
            description: t('วางสายน้ำหยด'),
            category: 'irrigation',
        },
    ];

    // Irrigation methods
    const irrigationMethods = {
        'mini-sprinkler': { name: t('มินิสปริงเกลอร์'), radius: 30, spacing: 50 },
        drip: { name: t('น้ำหยด'), radius: 0, spacing: 20 },
    };

    const GRID_SIZE = 25;
    const CANVAS_SIZE = { width: 2400, height: 1600 };
    // Grid scale constants (1 m = 20 px)
    const PX_PER_METER = 20;
    const MINOR_GRID_STEP = PX_PER_METER * 0.5; // 0.5 m
    const MAJOR_GRID_STEP = PX_PER_METER * 1;   // 1 m

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
    const [selectedIrrigationMethod, setSelectedIrrigationMethod] = useState('mini-sprinkler');

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

    // Radius and spacing adjustment states
    const [globalRadius, setGlobalRadius] = useState(1.5);
    const [globalDripSpacing, setGlobalDripSpacing] = useState(20); // Default to 20cm
    const [globalSprinklerOverlap, setGlobalSprinklerOverlap] = useState(0);
    
    // Flow rate and pressure settings
    const [sprinklerFlowRate, setSprinklerFlowRate] = useState(10); // L/min
    const [sprinklerPressure, setSprinklerPressure] = useState(2.5); // bar
    const [dripFlowRate, setDripFlowRate] = useState(0.24); // L/min (fixed)
    const [dripPressure, setDripPressure] = useState(1.0); // bar
    
    // Drip spacing options in cm
    const dripSpacingOptions = [10, 15, 20, 30];

    // Image cache for component icons
    const [componentImages, setComponentImages] = useState<{ [key: string]: HTMLImageElement }>({});

    // Undo/Redo states
    const [history, setHistory] = useState<HistoryState[]>([{ shapes: [], irrigationElements: [] }]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Collapsible panel states
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

    // Connection states
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStart, setConnectionStart] = useState<{ elementId: string; pointIndex: number } | null>(null);
    const [snapTarget, setSnapTarget] = useState<{ elementId: string; point: Point } | null>(null);

    // Add to history function
    const addToHistory = useCallback(
        (newShapes: Shape[], newIrrigationElements: IrrigationElement[]) => {
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push({
                shapes: [...newShapes],
                irrigationElements: [...newIrrigationElements]
            });
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        },
        [history, historyIndex]
    );

    // Connection utility functions
    const createConnection = useCallback((fromElementId: string, toElementId: string) => {
        // Update irrigation elements (pipes)
        setIrrigationElements(prevElements => 
            prevElements.map(element => {
                if (element.id === fromElementId) {
                    const connections = element.connections || [];
                    if (!connections.includes(toElementId)) {
                        return { ...element, connections: [...connections, toElementId] };
                    }
                }
                return element;
            })
        );

        // Update shapes (fertilizer machines) - add connections property if needed
        setShapes(prevShapes =>
            prevShapes.map(shape => {
                if (shape.id === toElementId && shape.type === 'fertilizer-machine') {
                    const connections = shape.connections || [];
                    if (!connections.includes(fromElementId)) {
                        return { ...shape, connections: [...connections, fromElementId] };
                    }
                }
                return shape;
            })
        );
    }, []);

    // Finish drawing function - moved before useEffect that uses it
    const finishDrawing = useCallback(() => {
        if (currentPath.length < 2) {
            setIsDrawing(false);
            setCurrentPath([]);
            return;
        }

        const elementTypes = {
            'main-pipe': { color: '#EF4444', width: 6 },
            'sub-pipe': { color: '#8B5CF6', width: 4 },
            'drip-line': { color: '#06B6D4', width: 2 },
        };

        // Handle fertilizer area shape creation
        if (selectedTool === 'fertilizer-area') {
            const newShape: Shape = {
                id: `fertilizer-area-${Date.now()}`,
                type: 'fertilizer-area',
                points: [...currentPath],
                color: '#22C55E',
                fillColor: '#22C55E40',
                name: `${t('พื้นที่ให้ปุ๋ย')} ${shapes.filter(s => s.type === 'fertilizer-area').length + 1}`,
            };

            const newShapes = [...shapes, newShape];
            setShapes(newShapes);
            addToHistory(newShapes, irrigationElements);
            setIsDrawing(false);
            setCurrentPath([]);
            return;
        }

        // (Removed) fertilizer-machine as drawn shape → now placed as a component on click

        const config = elementTypes[selectedTool as keyof typeof elementTypes];
        if (!config) return;

        const newElement: IrrigationElement = {
            id: `${selectedTool}-${Date.now()}`,
            type: selectedTool as IrrigationElement['type'],
            points: [...currentPath],
            color: config.color,
            width: config.width,
            spacing: selectedTool === 'drip-line' ? globalDripSpacing : undefined,
            connections: snapTarget ? [snapTarget.elementId] : [],
        };

        const newIrrigationElements = [...irrigationElements, newElement];
        setIrrigationElements(newIrrigationElements);
        
        // Create connection if there's a snap target
        if (snapTarget) {
            createConnection(newElement.id, snapTarget.elementId);
        }
        
        addToHistory(shapes, newIrrigationElements);
        
        setIsDrawing(false);
        setCurrentPath([]);
        setSnapTarget(null);
    }, [currentPath, selectedTool, globalDripSpacing, irrigationElements, shapes, addToHistory, t, snapTarget, createConnection]);

    // Undo function
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            const previousState = history[newIndex];
            setShapes([...previousState.shapes]);
            setIrrigationElements([...previousState.irrigationElements]);
            setSelectedElement(null);
        }
    }, [history, historyIndex]);

    // Redo function
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            const nextState = history[newIndex];
            setShapes([...nextState.shapes]);
            setIrrigationElements([...nextState.irrigationElements]);
            setSelectedElement(null);
        }
    }, [history, historyIndex]);

    // Load component images
    useEffect(() => {
        const imageConfigs = {
            pump: '/generateTree/wtpump.png',
            'solenoid-valve': '/generateTree/solv.png',
            'ball-valve': '/generateTree/ballv.png',
            'water-tank': '/generateTree/silo.png',
            'fertilizer-machine': '/generateTree/fertilizer.png',
        };

        const loadImages = async () => {
            const images: { [key: string]: HTMLImageElement } = {};

            for (const [type, src] of Object.entries(imageConfigs)) {
                const img = new Image();
                img.src = src;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
                images[type] = img;
            }

            setComponentImages(images);
        };

        loadImages().catch(console.error);
    }, []);

    // Parse URL parameters on component mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const cropsParam = urlParams.get('crops');
        const shapesParam = urlParams.get('shapes');
        const irrigationParam = urlParams.get('irrigation');
        const loadIrrigationParam = urlParams.get('loadIrrigation');

        console.log('Map received:', {
            crops: cropsParam,
            shapes: shapesParam ? 'Has shapes data' : 'No shapes data',
            irrigation: irrigationParam,
            loadIrrigation: loadIrrigationParam,
        });

        if (cropsParam) {
            setSelectedCrops(cropsParam.split(',').filter(Boolean));
        }

        if (
            irrigationParam &&
            irrigationMethods[irrigationParam as keyof typeof irrigationMethods]
        ) {
            setSelectedIrrigationMethod(irrigationParam);
        }

        if (shapesParam) {
            try {
                const parsedShapes = JSON.parse(decodeURIComponent(shapesParam));
                console.log('Map: Loaded', parsedShapes.length, 'shapes');
                setShapes(parsedShapes);
                
                setHistory([{ shapes: [], irrigationElements: [] }, { shapes: parsedShapes, irrigationElements: [] }]);
                setHistoryIndex(1);
            } catch (error) {
                console.error('Error parsing shapes:', error);
            }
        }

        // Load irrigation elements from localStorage only when loadIrrigation=true is sent
        if (loadIrrigationParam === 'true') {
            const savedData = localStorage.getItem('greenhousePlanningData');
            if (savedData) {
                try {
                    const parsedData = JSON.parse(savedData);
                    if (parsedData.irrigationElements) {
                        console.log(
                            'Map: Loading irrigation elements from localStorage:',
                            parsedData.irrigationElements
                        );
                        setIrrigationElements(parsedData.irrigationElements);
                        
                        const currentShapes = shapesParam ? JSON.parse(decodeURIComponent(shapesParam)) : [];
                        setHistory([
                            { shapes: [], irrigationElements: [] }, 
                            { shapes: currentShapes, irrigationElements: parsedData.irrigationElements }
                        ]);
                        setHistoryIndex(1);
                    }
                } catch (error) {
                    console.error('Error loading irrigation data:', error);
                }
            }
        } else {
            setIrrigationElements([]);
        }
    }, []);

    // Initialize history when no shapes are loaded from URL
    useEffect(() => {
        if (history.length === 1 && history[0].shapes.length === 0 && history[0].irrigationElements.length === 0) {
            if (shapes.length > 0 || irrigationElements.length > 0) {
                setHistory([
                    { shapes: [], irrigationElements: [] },
                    { shapes: [...shapes], irrigationElements: [...irrigationElements] }
                ]);
                setHistoryIndex(1);
            }
        }
    }, [shapes, irrigationElements, history]);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Prevent handling if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
                return;
            }

            switch (e.key) {
                case 'Enter':
                    if (isDrawing) {
                        e.preventDefault();
                        finishDrawing();
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    setIsDrawing(false);
                    setCurrentPath([]);
                    setIsPanning(false);
                    setLastPanPoint(null);
                    setIsDragging(false);
                    setDragOffset({ x: 0, y: 0 });
                    setSelectedElement(null);
                    setShowCropSelector(false);
                    break;
                case ' ':
                    if (!isDrawing) {
                        e.preventDefault();
                        setZoom(1);
                        setPan({ x: 0, y: 0 });
                    }
                    break;
                case 'Delete':
                    if (selectedElement && selectedTool === 'select') {
                        e.preventDefault();
                        deleteElement();
                    }
                    break;
                // Undo with Ctrl+Z
                case 'z':
                    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
                        e.preventDefault();
                        undo();
                    }
                    break;
                // Redo with Ctrl+Y or Ctrl+Shift+Z
                case 'y':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        redo();
                    }
                    break;
            }

            // Handle Ctrl+Shift+Z for redo
            if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isDrawing, selectedElement, selectedTool, finishDrawing, undo, redo]);

    // Memoized crop lookup function
    const getCropByValue = useCallback((value: string): Crop | undefined => {
        const basicCrops: Record<string, Crop> = {
            tomato: {
                value: 'tomato',
                name: t('มะเขือเทศ'),
                nameEn: 'Tomato',
                icon: '🍅',
                category: 'vegetables',
                description: t('มะเขือเทศ'),
            },
            'bell-pepper': {
                value: 'bell-pepper',
                name: t('พริกหวาน'),
                nameEn: 'Bell Pepper',
                icon: '🫑',
                category: 'vegetables',
                description: t('พริกหวาน'),
            },
            cucumber: {
                value: 'cucumber',
                name: t('แตงกวา'),
                nameEn: 'Cucumber',
                icon: '🥒',
                category: 'vegetables',
                description: t('แตงกวา'),
            },
            lettuce: {
                value: 'lettuce',
                name: t('ผักกาดหอม'),
                nameEn: 'Lettuce',
                icon: '🥬',
                category: 'vegetables',
                description: t('ผักกาดหอม'),
            },
            strawberry: {
                value: 'strawberry',
                name: t('สตรอเบอร์รี่'),
                nameEn: 'Strawberry',
                icon: '🍓',
                category: 'fruits',
                description: t('สตรอเบอร์รี่'),
            },
        };

        return (
            basicCrops[value] || {
                value: value,
                name: value,
                nameEn: value,
                icon: '🌱',
                category: 'unknown',
                description: value,
            }
        );
    }, [t]);

    // Check if prerequisites are met for auto generation
    const canAutoGenerate = useMemo(() => {
        const hasMainPipe = irrigationElements.some((el) => el.type === 'main-pipe');
        const hasSubPipe = irrigationElements.some((el) => el.type === 'sub-pipe');
        return hasMainPipe && hasSubPipe;
    }, [irrigationElements]);

    // Check if all plots have crops assigned
    const plotsWithoutCrops = useMemo(() => {
        return shapes.filter((shape) => shape.type === 'plot' && !shape.cropType);
    }, [shapes]);

    const canGoToSummary = useMemo(() => {
        return plotsWithoutCrops.length === 0 && shapes.some((shape) => shape.type === 'plot');
    }, [plotsWithoutCrops, shapes]);

    // Canvas utility functions
    const snapToGrid = useCallback(
        (point: Point): Point => ({
            x: Math.round(point.x / (MINOR_GRID_STEP)) * (MINOR_GRID_STEP),
            y: Math.round(point.y / (MINOR_GRID_STEP)) * (MINOR_GRID_STEP),
        }),
        []
    );

    const getMousePos = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>): Point => {
            const canvas = canvasRef.current;
            if (!canvas) return { x: 0, y: 0 };

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const rawPoint = {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
            };

            const transformedPoint = {
                x: (rawPoint.x - pan.x) / zoom,
                y: (rawPoint.y - pan.y) / zoom,
            };

            return snapToGrid(transformedPoint);
        },
        [pan, zoom, snapToGrid]
    );

    const getRawMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }, []);

    // Point-in-shape detection
    const isPointInShape = useCallback(
        (point: Point, element: Shape | IrrigationElement): boolean => {
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
            if (
                'type' in element &&
                (element.type === 'main-pipe' ||
                    element.type === 'sub-pipe' ||
                    element.type === 'drip-line')
            ) {
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
        },
        []
    );

    const findElementAtPoint = useCallback(
        (
            point: Point
        ): { type: 'shape' | 'irrigation'; element: Shape | IrrigationElement } | null => {
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
        },
        [shapes, irrigationElements, isPointInShape]
    );

    // Connection utility functions
    const getConnectionPoints = useCallback((element: IrrigationElement | Shape): Point[] => {
        if (element.type === 'fertilizer-machine') {
            // Two-side connection points (left and right of center)
            if (element.points.length === 0) return [];
            const c = element.points[0];
            const dx = 30; // half width ~ matches drawn image width (~52-60px)
            return [
                { x: c.x - dx, y: c.y },
                { x: c.x + dx, y: c.y },
            ];
        }
        if (element.type === 'water-tank' || element.type === 'pump') {
            // Single center connection point for these equipments
            return element.points.length > 0 ? [element.points[0]] : [];
        }
        // For pipes, return start and end points
        if (element.points.length >= 2) {
            return [element.points[0], element.points[element.points.length - 1]];
        }
        return element.points;
    }, []);

    const findNearestConnectionPoint = useCallback(
        (point: Point, excludeElementId?: string): { elementId: string; connectionPoint: Point; distance: number } | null => {
            // Require clicking essentially on the connection point (tight threshold)
            const SNAP_DISTANCE = 6; // pixels
            let nearest: { elementId: string; connectionPoint: Point; distance: number } | null = null;

            // Check irrigation elements (water tanks, pumps)
            irrigationElements.forEach(element => {
                if (element.id === excludeElementId) return;
                
                // Allow connections to water tanks and pumps
                if (element.type !== 'water-tank' && element.type !== 'pump') return;

                const connectionPoints = getConnectionPoints(element);
                connectionPoints.forEach(connectionPoint => {
                    const distance = Math.sqrt(
                        Math.pow(point.x - connectionPoint.x, 2) + 
                        Math.pow(point.y - connectionPoint.y, 2)
                    );
                    
                    if (distance <= SNAP_DISTANCE && (!nearest || distance < nearest.distance)) {
                        nearest = {
                            elementId: element.id,
                            connectionPoint,
                            distance
                        };
                    }
                });
            });

            // Check shapes (fertilizer machines)
            shapes.forEach(shape => {
                if (shape.id === excludeElementId) return;
                
                // Only allow connections to fertilizer machines
                if (shape.type !== 'fertilizer-machine') return;

                const connectionPoints = getConnectionPoints(shape);
                connectionPoints.forEach(connectionPoint => {
                    const distance = Math.sqrt(
                        Math.pow(point.x - connectionPoint.x, 2) + 
                        Math.pow(point.y - connectionPoint.y, 2)
                    );
                    
                    if (distance <= SNAP_DISTANCE && (!nearest || distance < nearest.distance)) {
                        nearest = {
                            elementId: shape.id,
                            connectionPoint,
                            distance
                        };
                    }
                });
            });

            return nearest;
        },
        [irrigationElements, shapes, getConnectionPoints]
    );

    const findPipeEndpointAtPoint = useCallback((point: Point): { elementId: string; pointIndex: number } | null => {
        // Also tighten endpoint click detection to avoid accidental grabs
        const ENDPOINT_RADIUS = 6;
        
        for (const element of irrigationElements) {
            if (element.type === 'main-pipe' || element.type === 'sub-pipe') {
                if (element.points.length >= 2) {
                    // Check start point
                    const startDistance = Math.sqrt(
                        Math.pow(point.x - element.points[0].x, 2) + 
                        Math.pow(point.y - element.points[0].y, 2)
                    );
                    if (startDistance <= ENDPOINT_RADIUS) {
                        return { elementId: element.id, pointIndex: 0 };
                    }
                    
                    // Check end point
                    const endDistance = Math.sqrt(
                        Math.pow(point.x - element.points[element.points.length - 1].x, 2) + 
                        Math.pow(point.y - element.points[element.points.length - 1].y, 2)
                    );
                    if (endDistance <= ENDPOINT_RADIUS) {
                        return { elementId: element.id, pointIndex: element.points.length - 1 };
                    }
                }
            }
        }
        
        return null;
    }, [irrigationElements]);

    // Helper function to draw component shapes
    const drawComponentShape = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            type: string,
            point: Point,
            color: string,
            isSelected: boolean
        ) => {
            const size = isSelected ? 24 : 20;

            // Try to use image first
            if (componentImages[type]) {
                const img = componentImages[type];

                // Different sizes for different components
                let imgSize, containerSize;
                if (type === 'pump') {
                    // Bigger pump icon and no container
                    imgSize = isSelected ? 56 : 48;
                    containerSize = 0; // unused for pump
                } else if (type === 'water-tank') {
                    imgSize = isSelected ? 84 : 72;
                    containerSize = isSelected ? 64 : 56;
                } else if (type === 'fertilizer-machine') {
                    imgSize = isSelected ? 30 : 26;
                    containerSize = isSelected ? 38 : 34;
                } else {
                    // valves
                    imgSize = isSelected ? 20 : 16;
                    containerSize = isSelected ? 28 : 24;
                }

                ctx.save();

                // Draw circular container background for all except water-tank and pump
                if (type !== 'water-tank' && type !== 'pump') {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.strokeStyle = isSelected ? '#FFD700' : '#666666';
                    ctx.lineWidth = isSelected ? 3 : 2;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, containerSize / 2, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                }

                // Draw the component image
                ctx.drawImage(img, point.x - imgSize / 2, point.y - imgSize / 2, imgSize, imgSize);

                // Capacity text is drawn in drawIrrigationElements for reliability
                ctx.restore();
                return;
            }

            // Fallback to original drawing if image not loaded
            ctx.fillStyle = color;
            ctx.strokeStyle = isSelected ? '#FFD700' : color;
            ctx.lineWidth = isSelected ? 3 : 2;

            switch (type) {
                case 'pump': {
                    const pumpSize = isSelected ? 28 : 24;
                    // Draw simplified pump shape (rounded rectangle + impeller mark)
                    const w = pumpSize * 2.0;
                    const h = pumpSize * 1.2;
                    const r = 6;
                    ctx.beginPath();
                    ctx.moveTo(point.x - w / 2 + r, point.y - h / 2);
                    ctx.lineTo(point.x + w / 2 - r, point.y - h / 2);
                    ctx.quadraticCurveTo(point.x + w / 2, point.y - h / 2, point.x + w / 2, point.y - h / 2 + r);
                    ctx.lineTo(point.x + w / 2, point.y + h / 2 - r);
                    ctx.quadraticCurveTo(point.x + w / 2, point.y + h / 2, point.x + w / 2 - r, point.y + h / 2);
                    ctx.lineTo(point.x - w / 2 + r, point.y + h / 2);
                    ctx.quadraticCurveTo(point.x - w / 2, point.y + h / 2, point.x - w / 2, point.y + h / 2 - r);
                    ctx.lineTo(point.x - w / 2, point.y - h / 2 + r);
                    ctx.quadraticCurveTo(point.x - w / 2, point.y - h / 2, point.x - w / 2 + r, point.y - h / 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Impeller mark
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;
                    for (let i = 0; i < 3; i++) {
                        const angle = (i * 2 * Math.PI) / 3;
                        const sx = point.x + Math.cos(angle) * (h * 0.15);
                        const sy = point.y + Math.sin(angle) * (h * 0.15);
                        const ex = point.x + Math.cos(angle) * (h * 0.35);
                        const ey = point.y + Math.sin(angle) * (h * 0.35);
                        ctx.beginPath();
                        ctx.moveTo(sx, sy);
                        ctx.lineTo(ex, ey);
                        ctx.stroke();
                    }
                    break;
                }

                case 'solenoid-valve':
                    ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
                    ctx.strokeRect(point.x - size / 2, point.y - size / 2, size, size);

                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 1.5;
                    for (let i = 0; i < 3; i++) {
                        const y = point.y - size / 3 + (i * size) / 3;
                        ctx.beginPath();
                        ctx.moveTo(point.x - size / 3, y);
                        ctx.lineTo(point.x + size / 3, y);
                        ctx.stroke();
                    }
                    break;

                case 'ball-valve':
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, size, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();

                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(point.x - size * 0.7, point.y);
                    ctx.lineTo(point.x + size * 0.7, point.y);
                    ctx.stroke();
                    break;

                case 'water-tank':
                    // Draw water tank as cylinder
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, size, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();

                    // Draw water level indicator
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;
                    for (let i = 0; i < 3; i++) {
                        const y = point.y - size + (i * size * 0.6);
                        ctx.beginPath();
                        ctx.moveTo(point.x - size * 0.6, y);
                        ctx.lineTo(point.x + size * 0.6, y);
                        ctx.stroke();
                    }
                    break;

                case 'fertilizer-machine':
                    // Draw fertilizer machine as rounded rect
                    ctx.fillRect(point.x - size, point.y - size, size * 2, size * 2);
                    ctx.strokeRect(point.x - size, point.y - size, size * 2, size * 2);

                    // Draw fertilizer symbol
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(point.x - size * 0.5, point.y - size * 0.5);
                    ctx.lineTo(point.x + size * 0.5, point.y + size * 0.5);
                    ctx.moveTo(point.x + size * 0.5, point.y - size * 0.5);
                    ctx.lineTo(point.x - size * 0.5, point.y + size * 0.5);
                    ctx.stroke();
                    break;
            }
        },
        [componentImages]
    );

    // Helper function to draw sprinkler coverage
    const drawSprinklerCoverage = useCallback(
        (ctx: CanvasRenderingContext2D, point: Point, radius: number, color: string) => {
            // Use only 360 degrees (full circle)
            ctx.fillStyle = `${color}20`;
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
            ctx.fill();
        },
        [irrigationElements, shapes, isPointInShape]
    );

    // Helper function to draw drip points
    const drawDripPoints = useCallback(
        (ctx: CanvasRenderingContext2D, element: IrrigationElement) => {
            if (element.points.length < 2) return;

            const spacing = (element.spacing || globalDripSpacing / 100) * 20;

            for (let i = 0; i < element.points.length - 1; i++) {
                const p1 = element.points[i];
                const p2 = element.points[i + 1];

                const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                if (distance === 0) continue;

                const direction = { x: (p2.x - p1.x) / distance, y: (p2.y - p1.y) / distance };

                let currentDistance = spacing;
                while (currentDistance < distance) {
                    const dripPoint = {
                        x: p1.x + direction.x * currentDistance,
                        y: p1.y + direction.y * currentDistance,
                    };

                    // Draw white border for better visibility
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath();
                    ctx.arc(dripPoint.x, dripPoint.y, 2.5, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Draw main drip point
                    ctx.fillStyle = '#06B6D4';
                    ctx.beginPath();
                    ctx.arc(dripPoint.x, dripPoint.y, 1.5, 0, 2 * Math.PI);
                    ctx.fill();

                    currentDistance += spacing;
                }
            }
        },
        [globalDripSpacing]
    );

    // Drawing functions
    const drawGrid = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!showGrid) return;

            // Define scale: 1 meter = 20px (used elsewhere in app)
            const minorStep = MINOR_GRID_STEP;
            const majorStep = MAJOR_GRID_STEP;

            // Draw minor grid (lighter)
            ctx.save();
            ctx.strokeStyle = 'rgba(75,85,99,0.25)'; // gray-600 at 25% alpha
            ctx.lineWidth = 0.5;
            for (let x = 0; x <= CANVAS_SIZE.width; x += minorStep) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, CANVAS_SIZE.height);
                ctx.stroke();
            }
            for (let y = 0; y <= CANVAS_SIZE.height; y += minorStep) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(CANVAS_SIZE.width, y);
                ctx.stroke();
            }
            ctx.restore();

            // Draw major grid (darker, thicker)
            ctx.save();
            ctx.strokeStyle = '#4B5563'; // gray-600
            ctx.lineWidth = 1;
            for (let x = 0; x <= CANVAS_SIZE.width; x += majorStep) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, CANVAS_SIZE.height);
                ctx.stroke();
            }
            for (let y = 0; y <= CANVAS_SIZE.height; y += majorStep) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(CANVAS_SIZE.width, y);
                ctx.stroke();
            }
            ctx.restore();
        },
        [showGrid]
    );

    const drawShapes = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            shapes.forEach((shape) => {
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
                            ctx.fillText(
                                `${shape.measurement.distance}${shape.measurement.unit}`,
                                midX,
                                midY
                            );
                        }
                    }
                    return;
                }

                if (shape.points.length < 1) return;

                let strokeColor = shape.color;
                const fillColor = shape.fillColor;
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

                        // Draw water icon in center (match planner behavior)
                        if (shape.points.length > 0) {
                            const centerX = shape.points.reduce((sum, p) => sum + p.x, 0) / shape.points.length;
                            const centerY = shape.points.reduce((sum, p) => sum + p.y, 0) / shape.points.length;

                            ctx.fillStyle = '#FFFFFF';
                            ctx.font = '16px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillText('💧', centerX, centerY + 5);
                        }
                    }

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

                // Render fertilizer-machine image with label
                if (shape.type === 'fertilizer-machine') {
                    const point = shape.points[0];
                    const img = componentImages['fertilizer-machine'];
                    const imgSize = isSelected ? 60 : 52;
                    const labelOffset = 10;
                    ctx.save();
                    if (img) {
                        ctx.drawImage(img, point.x - imgSize / 2, point.y - imgSize / 2, imgSize, imgSize);
                    } else {
                        // fallback rectangle if image not loaded
                        ctx.fillStyle = '#84CC16';
                        ctx.strokeStyle = isSelected ? '#FFD700' : '#84CC16';
                        ctx.lineWidth = isSelected ? 3 : 2;
                        ctx.fillRect(point.x - 24, point.y - 16, 48, 32);
                        ctx.strokeRect(point.x - 24, point.y - 16, 48, 32);
                    }
                    // label
                    ctx.fillStyle = '#FFFFFF';
                    ctx.textAlign = 'center';
                    ctx.font = '12px sans-serif';
                    ctx.fillText(`${t('เครื่องให้ปุ๋ย')}`, point.x, point.y - imgSize / 2 - labelOffset);
                    ctx.restore();
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

                if (shape.type === 'plot' && shape.cropType) {
                    const crop = getCropByValue(shape.cropType);
                    if (crop && shape.points.length > 0) {
                        const centerX =
                            shape.points.reduce((sum, p) => sum + p.x, 0) / shape.points.length;
                        const centerY =
                            shape.points.reduce((sum, p) => sum + p.y, 0) / shape.points.length;

                        ctx.fillStyle = '#FFFFFF';
                        ctx.font = '24px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(crop.icon, centerX, centerY + 8);

                        ctx.font = '10px sans-serif';
                        ctx.fillText(crop.name, centerX, centerY + 25);
                    }
                } else if (shape.type === 'fertilizer-area' && shape.points.length > 0) {
                    const centerX =
                        shape.points.reduce((sum, p) => sum + p.x, 0) / shape.points.length;
                    const centerY =
                        shape.points.reduce((sum, p) => sum + p.y, 0) / shape.points.length;

                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '20px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('🧪', centerX, centerY + 8);

                    ctx.font = '10px sans-serif';
                    ctx.fillText(shape.name || t('พื้นที่ให้ปุ๋ย'), centerX, centerY + 25);
                } else if (shape.points.length > 0) {
                    const centerX =
                        shape.points.reduce((sum, p) => sum + p.x, 0) / shape.points.length;
                    const centerY =
                        shape.points.reduce((sum, p) => sum + p.y, 0) / shape.points.length;

                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(shape.name, centerX, centerY);
                }

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
        [shapes, selectedElement, hoveredElement, selectedTool, getCropByValue, t]
    );

    const drawIrrigationElements = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            irrigationElements.forEach((element) => {
                // Prevent double-draw: fertilizer-machine is rendered in drawShapes (with image & label)
                if (element.type === 'fertilizer-machine') return;
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
                        if (selectedIrrigationMethod === 'drip') {
                            drawDripPoints(ctx, element);
                        } else {
                            ctx.setLineDash([10, 5]);
                            ctx.beginPath();
                            ctx.moveTo(element.points[0].x, element.points[0].y);

                            for (let i = 1; i < element.points.length; i++) {
                                ctx.lineTo(element.points[i].x, element.points[i].y);
                            }

                            ctx.stroke();
                            ctx.setLineDash([]);
                        }
                    }
                } else if (element.type === 'sprinkler') {
                    if (element.points.length >= 1) {
                        const point = element.points[0];
                        const radius = element.radius || 30;

                        drawSprinklerCoverage(ctx, point, radius, element.color);

                        ctx.fillStyle = element.color;
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                } else {
                    if (element.points.length >= 1) {
                        const point = element.points[0];
                        drawComponentShape(ctx, element.type, point, element.color, isSelected);
                        if (element.type === 'water-tank' && typeof element.capacityLiters === 'number') {
                            ctx.fillStyle = '#FFFFFF';
                            ctx.font = '12px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillText(`${element.capacityLiters}L`, point.x, point.y + 48);
                        }
                    }
                }

                if (isSelected) {
                    ctx.fillStyle = '#FFD700';
                    element.points.forEach((point) => {
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                        ctx.fill();
                    });
                }
            });
        },
        [
            irrigationElements,
            selectedElement,
            hoveredElement,
            selectedTool,
            selectedIrrigationMethod,
            drawDripPoints,
            drawSprinklerCoverage,
            drawComponentShape,
        ]
    );

    const drawCurrentPath = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (currentPath.length < 1) return;

            let strokeColor = '#EF4444';
            let lineWidth = 2;

            if (selectedTool === 'main-pipe') {
                lineWidth = 6;
                strokeColor = '#EF4444';
            } else if (selectedTool === 'sub-pipe') {
                lineWidth = 4;
                strokeColor = '#8B5CF6';
            } else if (selectedTool === 'fertilizer-area') {
                strokeColor = '#22C55E';
                lineWidth = 3;
            }

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
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

            ctx.fillStyle = strokeColor;
            currentPath.forEach((point) => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                ctx.fill();
            });
        },
        [currentPath, mousePos, selectedTool]
    );

    // Main draw function with better performance
    const drawConnectionPoints = useCallback((ctx: CanvasRenderingContext2D) => {
        // Draw connection points for water tanks and pumps
        irrigationElements.forEach(element => {
            if (element.type === 'water-tank' || element.type === 'pump') {
                const connectionPoints = getConnectionPoints(element);
                connectionPoints.forEach(point => {
                    ctx.save();
                    ctx.fillStyle = '#00FF00';
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                });
            }
        });

        // Draw connection points for fertilizer machines (shapes)
        shapes.forEach(shape => {
            if (shape.type === 'fertilizer-machine') {
                const connectionPoints = getConnectionPoints(shape);
                connectionPoints.forEach(point => {
                    ctx.save();
                    ctx.fillStyle = '#00FF00';
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                });
            }
        });

        // Draw pipe endpoints when select tool is active
        if (selectedTool === 'select') {
            irrigationElements.forEach(element => {
                if (element.type === 'main-pipe' || element.type === 'sub-pipe') {
                    if (element.points.length >= 2) {
                        // Draw start point
                        ctx.save();
                        ctx.fillStyle = '#FF6B6B';
                        ctx.strokeStyle = '#FFFFFF';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(element.points[0].x, element.points[0].y, 5, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();
                        ctx.restore();

                        // Draw end point
                        ctx.save();
                        ctx.fillStyle = '#FF6B6B';
                        ctx.strokeStyle = '#FFFFFF';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(element.points[element.points.length - 1].x, element.points[element.points.length - 1].y, 5, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            });
        }

        // Draw snap target indicator
        if (snapTarget) {
            ctx.save();
            ctx.fillStyle = '#FFD700';
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(snapTarget.point.x, snapTarget.point.y, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }, [irrigationElements, shapes, getConnectionPoints, snapTarget, selectedTool]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Apply transformations
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        // Draw in order
        try {
            drawGrid(ctx);
            drawShapes(ctx);
            drawIrrigationElements(ctx);
            drawCurrentPath(ctx);
            drawConnectionPoints(ctx);
        } catch (error) {
            console.error('Drawing error:', error);
        }

        ctx.restore();
    }, [drawGrid, drawShapes, drawIrrigationElements, drawCurrentPath, drawConnectionPoints, zoom, pan]);

    // Effect for drawing with throttling
    useEffect(() => {
        const animationId: number = requestAnimationFrame(draw);

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [draw]);

    // Event handlers - FIXED MOUSE DOWN
    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            const point = getMousePos(e);

            // Handle panning with middle mouse or Ctrl+click (check first before everything)
            if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
                e.preventDefault();
                setIsPanning(true);
                setLastPanPoint(getRawMousePos(e));
                return;
            }

            if (selectedTool === 'select') {
                // First check for pipe endpoint dragging
                const pipeEndpoint = findPipeEndpointAtPoint(point);
                if (pipeEndpoint) {
                    setConnectionStart(pipeEndpoint);
                    setIsConnecting(true);
                    return;
                }

                const clickedElement = findElementAtPoint(point);

                if (clickedElement && !e.ctrlKey) {
                    // Select and start dragging (only when not holding Ctrl)
                    if (clickedElement.type === 'shape' && clickedElement.element.type === 'plot') {
                        if (selectedCrops.length === 0) {
                            alert(t('ไม่มีพืชที่เลือกไว้ กรุณากลับไปเลือกพืชในขั้นตอนแรก'));
                            return;
                        }
                        setSelectedPlot(clickedElement.element.id);
                        setShowCropSelector(true);
                    } else {
                        setSelectedElement(clickedElement.element.id);
                        setIsDragging(true);

                        const centerX =
                            clickedElement.element.points.reduce((sum, p) => sum + p.x, 0) /
                            clickedElement.element.points.length;
                        const centerY =
                            clickedElement.element.points.reduce((sum, p) => sum + p.y, 0) /
                            clickedElement.element.points.length;
                        setDragOffset({ x: point.x - centerX, y: point.y - centerY });
                    }
                } else if (!clickedElement) {
                    // Click on empty space - deselect and start panning
                    setSelectedElement(null);
                    setIsPanning(true);
                    setLastPanPoint(getRawMousePos(e));
                } else {
                    // Click on element while holding Ctrl - only select element, don't drag
                    setSelectedElement(clickedElement.element.id);
                }
                return;
            }

            // Only handle left mouse button for drawing
            if (e.button === 0) {
                // For line drawing tools, handle directly here to avoid conflicts
                if (['main-pipe', 'sub-pipe', 'drip-line', 'fertilizer-area'].includes(selectedTool)) {
                    if (!isDrawing) {
                        // Check for snap target when starting pipe drawing
                        const snapTarget = findNearestConnectionPoint(point);
                        if (snapTarget) {
                            setSnapTarget({ elementId: snapTarget.elementId, point: snapTarget.connectionPoint });
                            setCurrentPath([snapTarget.connectionPoint]);
                        } else {
                            setSnapTarget(null);
                            setCurrentPath([point]);
                        }
                        setIsDrawing(true);
                    } else {
                        // Check for snap target when adding points
                        const snapTarget = findNearestConnectionPoint(point);
                        if (snapTarget) {
                            setSnapTarget({ elementId: snapTarget.elementId, point: snapTarget.connectionPoint });
                            setCurrentPath((prev) => [...prev, snapTarget.connectionPoint]);
                        } else {
                            setSnapTarget(null);
                            setCurrentPath((prev) => [...prev, point]);
                        }
                    }
                    return;
                }

                // For single-point tools (including fertilizer-machine placement)
                if (['pump', 'solenoid-valve', 'ball-valve', 'sprinkler', 'water-tank', 'fertilizer-machine'].includes(selectedTool)) {
                    const elementTypes: Record<
                        string,
                        { color: string; width: number; radius?: number }
                    > = {
                        pump: { color: '#8B5CF6', width: 1 },
                        'solenoid-valve': { color: '#F59E0B', width: 1 },
                        'ball-valve': { color: '#EAB308', width: 1 },
                        'water-tank': { color: '#0EA5E9', width: 1 },
                        'fertilizer-machine': { color: '#84CC16', width: 1 },
                        sprinkler: {
                            color: '#3B82F6',
                            width: 1,
                            radius: globalRadius * 20,
                        },
                    };

                    const config = elementTypes[selectedTool as keyof typeof elementTypes];
                    if (config) {
                        let capacityLiters: number | undefined = undefined;
                        if (selectedTool === 'water-tank') {
                            const input = prompt(t('ขนาดถัง (ลิตร) เช่น 2000')) || '';
                            const parsed = parseInt(input.replace(/[^0-9]/g, ''), 10);
                            if (!isNaN(parsed) && parsed > 0) {
                                capacityLiters = parsed;
                            }
                        }
                        if (selectedTool === 'fertilizer-machine') {
                            // Place as a Shape (to match connection logic already using shapes)
                            const newShape: Shape = {
                                id: `fertilizer-machine-${Date.now()}`,
                                type: 'fertilizer-machine',
                                points: [point],
                                color: '#84CC16',
                                fillColor: '#84CC1640',
                                name: `${t('เครื่องให้ปุ๋ย')} ${shapes.filter(s => s.type === 'fertilizer-machine').length + 1}`,
                            };
                            const newShapes = [...shapes, newShape];
                            setShapes(newShapes);
                            // Mirror as irrigation element so summary can render it
                            const fertEl: IrrigationElement = {
                                id: `fert-el-${Date.now()}`,
                                type: 'fertilizer-machine',
                                points: [point],
                                color: '#84CC16',
                                width: 1,
                            };
                            const newIrrEls = [...irrigationElements, fertEl];
                            setIrrigationElements(newIrrEls);
                            addToHistory(newShapes, newIrrEls);
                        } else {
                            const newElement: IrrigationElement = {
                                id: `${selectedTool}-${Date.now()}`,
                                type: selectedTool as IrrigationElement['type'],
                                points: [point],
                                color: config.color,
                                width: config.width,
                                radius: config.radius,
                                capacityLiters,
                            };

                            const newIrrigationElements = [...irrigationElements, newElement];
                            setIrrigationElements(newIrrigationElements);
                            addToHistory(shapes, newIrrigationElements);
                        }
                    }
                    return;
                }
            }
        },
        [
            selectedTool,
            getMousePos,
            findElementAtPoint,
            selectedCrops.length,
            getRawMousePos,
            isDrawing,
            globalRadius,
            t,
            irrigationElements,
            shapes,
            addToHistory,
        ]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });

        if (isPanning) {
            setIsPanning(false);
            setLastPanPoint(null);
        }

        // Handle pipe connection completion
        if (isConnecting && connectionStart && snapTarget) {
            // Update the pipe endpoint to the snap target
            setIrrigationElements(prevElements =>
                prevElements.map(element => {
                    if (element.id === connectionStart.elementId) {
                        const newPoints = [...element.points];
                        newPoints[connectionStart.pointIndex] = snapTarget.point;
                        return { ...element, points: newPoints };
                    }
                    return element;
                })
            );

            // Create connection between pipe and equipment
            createConnection(connectionStart.elementId, snapTarget.elementId);
        }

        // Reset connection state
        setIsConnecting(false);
        setConnectionStart(null);
        setSnapTarget(null);
    }, [isPanning, isConnecting, connectionStart, snapTarget, createConnection]);

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            const point = getMousePos(e);
            setMousePos(point);

            if (isPanning && lastPanPoint) {
                const currentPoint = getRawMousePos(e);
                const deltaX = currentPoint.x - lastPanPoint.x;
                const deltaY = currentPoint.y - lastPanPoint.y;

                setPan((prevPan) => ({
                    x: prevPan.x + deltaX,
                    y: prevPan.y + deltaY,
                }));

                setLastPanPoint(currentPoint);
            } else if (isDragging && selectedElement) {
                const element = [...shapes, ...irrigationElements].find(
                    (el) => el.id === selectedElement
                );
                if (element) {
                    const centerX =
                        element.points.reduce((sum, p) => sum + p.x, 0) / element.points.length;
                    const centerY =
                        element.points.reduce((sum, p) => sum + p.y, 0) / element.points.length;

                    const targetX = point.x - dragOffset.x;
                    const targetY = point.y - dragOffset.y;

                    const offset = { x: targetX - centerX, y: targetY - centerY };

                    if (
                        'type' in element &&
                        ['greenhouse', 'plot', 'walkway', 'water-source', 'measurement', 'fertilizer-area'].includes(
                            element.type
                        )
                    ) {
                        setShapes((prevShapes) =>
                            prevShapes.map((shape) => {
                                if (shape.id === selectedElement) {
                                    return {
                                        ...shape,
                                        points: shape.points.map((p) =>
                                            snapToGrid({ x: p.x + offset.x, y: p.y + offset.y })
                                        ),
                                    };
                                }
                                return shape;
                            })
                        );
                    } else {
                        setIrrigationElements((prevElements) =>
                            prevElements.map((el) => {
                                if (el.id === selectedElement) {
                                    return {
                                        ...el,
                                        points: el.points.map((p) =>
                                            snapToGrid({ x: p.x + offset.x, y: p.y + offset.y })
                                        ),
                                    };
                                }
                                return el;
                            })
                        );
                    }
                }
            } else if (selectedTool === 'select') {
                if (isConnecting && connectionStart) {
                    // Handle pipe endpoint dragging
                    const snapTarget = findNearestConnectionPoint(point, connectionStart.elementId);
                    if (snapTarget) {
                        setSnapTarget({ elementId: snapTarget.elementId, point: snapTarget.connectionPoint });
                    } else {
                        setSnapTarget(null);
                    }
                } else {
                    const hoveredElementObj = findElementAtPoint(point);
                    setHoveredElement(hoveredElementObj ? hoveredElementObj.element.id : null);
                }
            } else if (['main-pipe', 'sub-pipe'].includes(selectedTool) && isDrawing) {
                // Check for snap targets during pipe drawing
                const snapTarget = findNearestConnectionPoint(point);
                if (snapTarget) {
                    setSnapTarget({ elementId: snapTarget.elementId, point: snapTarget.connectionPoint });
                } else {
                    setSnapTarget(null);
                }
            }
        },
        [
            getMousePos,
            isPanning,
            lastPanPoint,
            getRawMousePos,
            isDragging,
            selectedElement,
            shapes,
            irrigationElements,
            dragOffset,
            snapToGrid,
            selectedTool,
            findElementAtPoint,
            isDrawing,
            findNearestConnectionPoint,
            isConnecting,
            connectionStart,
        ]
    );

    // Fixed wheel event handler
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheelEvent = (e: WheelEvent) => {
            if (!isMouseOverCanvas) return;

            e.preventDefault();

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

            setZoom((prevZoom) => {
                const newZoom = Math.max(0.1, Math.min(10, prevZoom * zoomFactor));

                setPan((prevPan) => {
                    const zoomRatio = newZoom / prevZoom;
                    const newPanX = mouseX - (mouseX - prevPan.x) * zoomRatio;
                    const newPanY = mouseY - (mouseY - prevPan.y) * zoomRatio;
                    return { x: newPanX, y: newPanY };
                });

                return newZoom;
            });
        };

        canvas.addEventListener('wheel', handleWheelEvent, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheelEvent);
    }, [isMouseOverCanvas]);

    const handleMouseEnter = useCallback(() => {
        setIsMouseOverCanvas(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsMouseOverCanvas(false);
        setHoveredElement(null);
        if (isPanning) {
            setIsPanning(false);
            setLastPanPoint(null);
        }
        if (isDragging) {
            setIsDragging(false);
            setDragOffset({ x: 0, y: 0 });
        }
    }, [isPanning, isDragging]);

    // Utility functions
    const getSprinklersNearPipe = useCallback((pipe: IrrigationElement): IrrigationElement[] => {
        const related: IrrigationElement[] = [];
        if (!pipe || pipe.type !== 'sub-pipe') return related;

        const sprinklers = irrigationElements.filter((el) => el.type === 'sprinkler');
        sprinklers.forEach((sprinkler) => {
            const sprinklerPoint = sprinkler.points[0];
            for (let i = 0; i < pipe.points.length - 1; i++) {
                const p1 = pipe.points[i];
                const p2 = pipe.points[i + 1];
                const A = sprinklerPoint.x - p1.x;
                const B = sprinklerPoint.y - p1.y;
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
                const distanceToLine = Math.sqrt(
                    Math.pow(sprinklerPoint.x - xx, 2) + Math.pow(sprinklerPoint.y - yy, 2)
                );
                if (distanceToLine < 2) {
                    related.push(sprinkler);
                    break;
                }
            }
        });
        return related;
    }, [irrigationElements]);

    const updateSelectedSubPipeSprinklerRadius = useCallback((newRadiusMeters: number) => {
        if (!selectedElement) return;
        const pipe = irrigationElements.find((el) => el.id === selectedElement && el.type === 'sub-pipe');
        if (!pipe) return;
        const related = getSprinklersNearPipe(pipe);
        if (related.length === 0) return;
        const newRadiusPx = newRadiusMeters * 20;
        const relatedIds = new Set(related.map((s) => s.id));
        const updated = irrigationElements.map((el) =>
            relatedIds.has(el.id) ? { ...el, radius: newRadiusPx } : el
        );
        setIrrigationElements(updated);
        addToHistory(shapes, updated);
    }, [selectedElement, irrigationElements, getSprinklersNearPipe, addToHistory, shapes]);

    const getSelectedSubPipeSprinklerRadiusMeters = useCallback((): number => {
        if (!selectedElement) return globalRadius;
        const pipe = irrigationElements.find((el) => el.id === selectedElement && el.type === 'sub-pipe');
        if (!pipe) return globalRadius;
        const related = getSprinklersNearPipe(pipe);
        if (related.length === 0) return globalRadius;
        const avgPx = related.reduce((sum, s) => sum + (s.radius || 30), 0) / related.length;
        return parseFloat((avgPx / 20).toFixed(1));
    }, [selectedElement, irrigationElements, getSprinklersNearPipe, globalRadius]);
    const deleteElement = useCallback(() => {
        if (selectedElement) {
            // Find the element to delete
            const elementToDelete = irrigationElements.find((el) => el.id === selectedElement);

            let newShapes = shapes;
            let newIrrigationElements = irrigationElements;

            // หากเป็นท่อย่อย ให้หาและลบสปริงเกลอร์ที่เกี่ยวข้องด้วย
            if (elementToDelete && elementToDelete.type === 'sub-pipe') {
                const relatedSprinklers: string[] = [];

                // หาสปริงเกลอร์ที่อยู่ใกล้กับท่อย่อยนี้
                irrigationElements
                    .filter((el) => el.type === 'sprinkler')
                    .forEach((sprinkler) => {
                        const sprinklerPoint = sprinkler.points[0];

                        // ตรวจสอบว่าสปริงเกลอร์อยู่ใกล้กับท่อย่อยหรือไม่
                        for (let i = 0; i < elementToDelete.points.length - 1; i++) {
                            const p1 = elementToDelete.points[i];
                            const p2 = elementToDelete.points[i + 1];

                            // Calculate distance from sprinkler point to pipe segment
                            const A = sprinklerPoint.x - p1.x;
                            const B = sprinklerPoint.y - p1.y;
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

                            const distanceToLine = Math.sqrt(
                                Math.pow(sprinklerPoint.x - xx, 2) +
                                    Math.pow(sprinklerPoint.y - yy, 2)
                            );

                            // If distance is less than 30 pixels, consider them related
                            if (distanceToLine < 30) {
                                relatedSprinklers.push(sprinkler.id);
                                break;
                            }
                        }
                    });

                // ลบท่อย่อยและสปริงเกลอร์ที่เกี่ยวข้องเรียบร้อยแล้ว
                newIrrigationElements = irrigationElements.filter(
                    (el) => el.id !== selectedElement && !relatedSprinklers.includes(el.id)
                );

                // แสดงข้อความแจ้งเตือน
                if (relatedSprinklers.length > 0) {
                    alert(
                        t('ลบท่อย่อยและสปริงเกลอร์ {count} ตัวที่เกี่ยวข้องเรียบร้อยแล้ว').replace('{count}', relatedSprinklers.length.toString())
                    );
                }
            } else if (elementToDelete && elementToDelete.type === 'drip-line') {
                // If it's a drip line, delete only the drip line
                newIrrigationElements = irrigationElements.filter((el) => el.id !== selectedElement);
            } else {
                // For other elements, delete normally
                newShapes = shapes.filter((s) => s.id !== selectedElement);
                newIrrigationElements = irrigationElements.filter((el) => el.id !== selectedElement);
            }

            setShapes(newShapes);
            setIrrigationElements(newIrrigationElements);
            addToHistory(newShapes, newIrrigationElements);
            setSelectedElement(null);
        }
    }, [selectedElement, irrigationElements, t, shapes, addToHistory]);

    const autoGenerateSprinklers = useCallback(() => {
        if (!canAutoGenerate) {
            alert(t('กรุณาวาดท่อเมนและท่อย่อยก่อนการสร้างอัตโนมัติ'));
            return;
        }

        if (selectedIrrigationMethod !== 'mini-sprinkler') {
            alert(t('ฟังก์ชันนี้ใช้ได้เฉพาะระบบสปริงเกลอร์เท่านั้น'));
            return;
        }

        const subPipes = irrigationElements.filter((el) => el.type === 'sub-pipe');
        // Remove all existing sprinklers before regeneration to reflect new overlap
        const existingSprinklers = irrigationElements.filter((el) => el.type === 'sprinkler');
        const baseElements = irrigationElements.filter((el) => el.type !== 'sprinkler');
        const newSprinklers: IrrigationElement[] = [];
        // Overlap handling: use globalSprinklerOverlap (0..0.5)
        const baseRadiusPx = globalRadius * 20;
        const spacing = 2 * baseRadiusPx * (1 - globalSprinklerOverlap); // pixel spacing along pipe
        const radius = baseRadiusPx;

        subPipes.forEach((pipe, pipeIndex) => {
            // Use global overlap for all sub-pipes
            const radiusPx = baseRadiusPx;
            const pipeSpacing = 2 * radiusPx * (1 - globalSprinklerOverlap);
            for (let i = 0; i < pipe.points.length - 1; i++) {
                const p1 = pipe.points[i];
                const p2 = pipe.points[i + 1];

                const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                const direction = { x: (p2.x - p1.x) / distance, y: (p2.y - p1.y) / distance };

                // Place sprinklers at fixed center distance = pipeSpacing, starting at half spacing
                let placedIndex = 0;
                for (let s = pipeSpacing / 2; s < distance; s += pipeSpacing) {
                    const point = {
                        x: p1.x + direction.x * s,
                        y: p1.y + direction.y * s,
                    };

                    const sprinkler: IrrigationElement = {
                        id: `sprinkler-${Date.now()}-${Math.random()}-${placedIndex++}`,
                        type: 'sprinkler',
                        points: [point],
                        color: '#3B82F6',
                        radius: radiusPx,
                    };
                    newSprinklers.push(sprinkler);
                }
            }
        });

        if (newSprinklers.length > 0) {
            const newIrrigationElements = [...baseElements, ...newSprinklers];
            setIrrigationElements(newIrrigationElements);
            
            addToHistory(shapes, newIrrigationElements);
            
            alert(t('สร้างมินิสปริงเกลอร์ {count} ตัวตามแนวท่อย่อยใหม่เรียบร้อยแล้ว').replace('{count}', newSprinklers.length.toString()));
        } else {
            alert(t('ท่อย่อยทั้งหมดมีมินิสปริงเกลอร์อยู่แล้ว'));
        }
    }, [canAutoGenerate, selectedIrrigationMethod, irrigationElements, globalRadius, globalSprinklerOverlap, t, shapes, addToHistory]);

    const autoGenerateDripLines = useCallback(() => {
        if (!canAutoGenerate) {
            alert(t('กรุณาวาดท่อเมนและท่อย่อยก่อนการสร้างอัตโนมัติ'));
            return;
        }

        if (selectedIrrigationMethod !== 'drip') {
            alert(t('ฟังก์ชันนี้ใช้ได้เฉพาะระบบน้ำหยดเท่านั้น'));
            return;
        }

        const subPipes = irrigationElements.filter((el) => el.type === 'sub-pipe');
        const existingDripLines = irrigationElements.filter((el) => el.type === 'drip-line');
        const newDripLines: IrrigationElement[] = [];

        // Function to check if sub-pipe already has drip line
        const pipeHasDripLine = (pipe: IrrigationElement): boolean => {
            return existingDripLines.some((dripLine) => {
                // Check if drip line has points that match or are close to the sub-pipe
                if (dripLine.points.length !== pipe.points.length) return false;

                // Check if each point is close to each other (distance less than 30 pixels)
                for (let i = 0; i < pipe.points.length; i++) {
                    const pipePoint = pipe.points[i];
                    const dripPoint = dripLine.points[i];

                    const distance = Math.sqrt(
                        Math.pow(pipePoint.x - dripPoint.x, 2) +
                            Math.pow(pipePoint.y - dripPoint.y, 2)
                    );

                    if (distance > 30) return false;
                }

                return true;
            });
        };

        subPipes.forEach((pipe) => {
            // Skip pipes that already have drip lines
            if (pipeHasDripLine(pipe)) {
                return;
            }

            if (pipe.points.length >= 2) {
                const dripLine: IrrigationElement = {
                    id: `drip-line-${Date.now()}-${Math.random()}`,
                    type: 'drip-line',
                    points: [...pipe.points],
                    color: '#06B6D4',
                    width: 2,
                    spacing: globalDripSpacing / 100, // Convert cm to meters
                };
                newDripLines.push(dripLine);
            }
        });

        if (newDripLines.length > 0) {
            const newIrrigationElements = [...irrigationElements, ...newDripLines];
            setIrrigationElements(newIrrigationElements);
            
            addToHistory(shapes, newIrrigationElements);
            
            alert(t('สร้างสายน้ำหยด {count} เส้นตามแนวท่อย่อยใหม่เรียบร้อยแล้ว').replace('{count}', newDripLines.length.toString()));
        } else {
            alert(t('ท่อย่อยทั้งหมดมีสายน้ำหยดอยู่แล้ว'));
        }
    }, [canAutoGenerate, selectedIrrigationMethod, irrigationElements, globalDripSpacing, t, shapes, addToHistory]);

    const assignCropToPlot = useCallback(
        (cropValue: string) => {
            if (selectedPlot) {
                const newShapes = shapes.map((shape) => {
                    if (shape.id === selectedPlot) {
                        return { ...shape, cropType: cropValue };
                    }
                    return shape;
                });
                
                setShapes(newShapes);
                
                addToHistory(newShapes, irrigationElements);
                
                setShowCropSelector(false);
                setSelectedPlot(null);
            }
        },
        [selectedPlot, shapes, irrigationElements, addToHistory]
    );

    // Radius adjustment functions
    const updateAllSprinklerRadius = useCallback((newRadius: number) => {
        const radiusInPixels = newRadius * 20;
        const newIrrigationElements = irrigationElements.map((el) => {
            if (el.type === 'sprinkler') {
                return { ...el, radius: radiusInPixels };
            }
            return el;
        });
        
        setIrrigationElements(newIrrigationElements);
        setGlobalRadius(newRadius);
        
        addToHistory(shapes, newIrrigationElements);
    }, [irrigationElements, shapes, addToHistory]);

    const updateSelectedSprinklerRadius = useCallback(
        (newRadius: number) => {
            if (selectedElement) {
                const radiusInPixels = newRadius * 20;
                const newIrrigationElements = irrigationElements.map((el) => {
                    if (el.id === selectedElement && el.type === 'sprinkler') {
                        return { ...el, radius: radiusInPixels };
                    }
                    return el;
                });
                
                setIrrigationElements(newIrrigationElements);
                
                addToHistory(shapes, newIrrigationElements);
            }
        },
        [selectedElement, irrigationElements, shapes, addToHistory]
    );

    const updateGlobalDripSpacing = useCallback((newSpacing: number) => {
        const spacingInMeters = newSpacing / 100; // Convert cm to meters
        const newIrrigationElements = irrigationElements.map((el) => {
            if (el.type === 'drip-line') {
                return { ...el, spacing: spacingInMeters };
            }
            return el;
        });
        
        setIrrigationElements(newIrrigationElements);
        setGlobalDripSpacing(newSpacing);
        
        addToHistory(shapes, newIrrigationElements);
    }, [irrigationElements, shapes, addToHistory]);

    const updateSelectedDripSpacing = useCallback(
        (newSpacing: number) => {
            if (selectedElement) {
                const spacingInMeters = newSpacing / 100; // Convert cm to meters
                const newIrrigationElements = irrigationElements.map((el) => {
                    if (el.id === selectedElement && el.type === 'drip-line') {
                        return { ...el, spacing: spacingInMeters };
                    }
                    return el;
                });
                
                setIrrigationElements(newIrrigationElements);
                
                addToHistory(shapes, newIrrigationElements);
            }
        },
        [selectedElement, irrigationElements, shapes, addToHistory]
    );

    // Statistics
    const calculateStats = useMemo(() => {
        const mainPipeLength = irrigationElements
            .filter((el) => el.type === 'main-pipe')
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
            .filter((el) => el.type === 'sub-pipe')
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
            .filter((el) => el.type === 'drip-line')
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
            sprinklerCount: irrigationElements.filter((el) => el.type === 'sprinkler').length,
            pumpCount: irrigationElements.filter((el) => el.type === 'pump').length,
            valveCount: irrigationElements.filter(
                (el) => el.type === 'solenoid-valve' || el.type === 'ball-valve'
            ).length,
            waterTankCount: irrigationElements.filter((el) => el.type === 'water-tank').length,
            fertilizerMachineCount: irrigationElements.filter((el) => el.type === 'fertilizer-machine').length,
            fertilizerAreaCount: shapes.filter((s) => s.type === 'fertilizer-area').length,
        };
    }, [irrigationElements, shapes]);

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
                            <div>
                                <h1 className="text-xl font-bold">💧 {t('ออกแบบระบบน้ำในโรงเรือน (ขนาดใหญ่)')}</h1>
                                <p className="text-sm text-gray-400">
                                    {t('ออกแบบระบบการให้น้ำแบบ')}:{' '}
                                    {
                                        irrigationMethods[
                                            selectedIrrigationMethod as keyof typeof irrigationMethods
                                        ]?.name
                                    }{' '}
                                    - {t('พื้นที่')} 2400x1600 pixels
                                </p>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-400">
                                <span className="text-green-400">✓ {t('เลือกพืช')}</span>
                                <span>→</span>
                                <span className="text-green-400">✓ {t('วางแผน')}</span>
                                <span>→</span>
                                <span className="text-green-400">✓ {t('ออกแบบพื้นที่')}</span>
                                <span>→</span>
                                <span className="text-green-400">✓ {t('เลือกระบบน้ำ')}</span>
                                <span>→</span>
                                <span className="font-medium text-blue-400">{t('ออกแบบระบบน้ำ')}</span>
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
                    <div className="flex w-80 flex-col border-r border-gray-700 bg-gray-800">
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Selected Crops */}
                            <div className="mb-4">
                                <h3 className="mb-2 text-sm font-medium text-gray-300">{t('พืชที่เลือก')}</h3>
                                <div className="flex flex-wrap gap-1">
                                    {selectedCrops.map((cropValue, index) => {
                                        const crop = getCropByValue(cropValue);
                                        return (
                                            <span
                                                key={index}
                                                className="flex items-center rounded bg-green-600 px-2 py-1 text-xs text-white"
                                            >
                                                {crop?.icon} {crop?.name || cropValue}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Irrigation Method */}
                            <div className="mb-4">
                                <h3 className="mb-2 text-sm font-medium text-gray-300">
                                    {t('วิธีการให้น้ำที่เลือก')}
                                </h3>
                                <div className="rounded border border-blue-500 bg-blue-600 px-3 py-2 text-sm text-white">
                                    {
                                        irrigationMethods[
                                            selectedIrrigationMethod as keyof typeof irrigationMethods
                                        ]?.name
                                    }
                                </div>
                            </div>

                            {/* Tools */}
                            <div className="mb-4">
                                <h3 className="mb-3 text-sm font-medium text-gray-300">{t('เครื่องมือ')}</h3>
                                <div className="space-y-1">
                                    {tools.map((tool) => (
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
                                            {tool.id === 'select' && (
                                                <div className="mt-1 text-xs text-gray-400">
                                                    {t('คลิกเลือก + Ctrl = แพนมุมมอง')}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Prerequisites Check */}
                            <div className="mb-4">
                                <h3 className="mb-2 text-sm font-medium text-gray-300">
                                    {t('ข้อกำหนดเบื้องต้น')}
                                </h3>
                                <div className="space-y-1 text-xs">
                                    <div
                                        className={`flex items-center space-x-2 ${
                                            irrigationElements.some((el) => el.type === 'main-pipe')
                                                ? 'text-green-400'
                                                : 'text-red-400'
                                        }`}
                                    >
                                        <span>
                                            {irrigationElements.some((el) => el.type === 'main-pipe')
                                                ? '✓'
                                                : '✗'}
                                        </span>
                                        <span>{t('ท่อเมนแมพ')}</span>
                                    </div>
                                    <div
                                        className={`flex items-center space-x-2 ${
                                            irrigationElements.some((el) => el.type === 'sub-pipe')
                                                ? 'text-green-400'
                                                : 'text-red-400'
                                        }`}
                                    >
                                        <span>
                                            {irrigationElements.some((el) => el.type === 'sub-pipe')
                                                ? '✓'
                                                : '✗'}
                                        </span>
                                        <span>{t('ท่อเมนย่อยแมพ')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Crop Assignment Status */}
                            {shapes.filter((s) => s.type === 'plot').length > 0 && (
                                <div className="mb-4">
                                    <h3 className="mb-2 text-sm font-medium text-gray-300">
                                        {t('สถานะการเลือกพืช')}
                                    </h3>
                                    <div className="space-y-1 text-xs">
                                        <div
                                            className={`flex items-center space-x-2 ${
                                                plotsWithoutCrops.length === 0
                                                    ? 'text-green-400'
                                                    : 'text-yellow-400'
                                            }`}
                                        >
                                            <span>{plotsWithoutCrops.length === 0 ? '✓' : '⚠️'}</span>
                                            <span>
                                                {t('เลือกพืชครบทุกแปลง ({assigned}/{total})')
                                                    .replace('{assigned}', shapes.filter((s) => s.type === 'plot' && s.cropType).length.toString())
                                                    .replace('{total}', shapes.filter((s) => s.type === 'plot').length.toString())}
                                            </span>
                                        </div>
                                        <div
                                            className={`flex items-center space-x-2 ${
                                                canGoToSummary ? 'text-green-400' : 'text-red-400'
                                            }`}
                                        >
                                            <span>{canGoToSummary ? '✓' : '✗'}</span>
                                            <span>{t('พร้อมไปดูสรุป')}</span>
                                        </div>
                                    </div>
                                    {plotsWithoutCrops.length > 0 && (
                                        <div className="mt-2 text-xs text-yellow-400">
                                            {t('แปลงที่ยังไม่เลือก')}:{' '}
                                            {plotsWithoutCrops.map((plot) => plot.name).join(', ')}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Canvas Info */}
                            <div className="mb-4">
                                <h3 className="mb-2 text-sm font-medium text-gray-300">
                                    {t('ข้อมูล Canvas')}
                                </h3>
                                <div className="space-y-1 text-xs text-gray-400">
                                    <p>
                                        📏 {t('ขนาด')}: {CANVAS_SIZE.width} × {CANVAS_SIZE.height} px
                                    </p>
                                    <p>📏 {t('กริด')}: {GRID_SIZE} px</p>
                                    <p>📏 {t('ซูม')}: {(zoom * 100).toFixed(0)}%</p>
                                    <p>
                                        📏 {t('แพน')}: ({pan.x.toFixed(0)}, {pan.y.toFixed(0)})
                                    </p>
                                </div>
                            </div>

                            {/* Irrigation Settings */}
                            {selectedIrrigationMethod === 'mini-sprinkler' && (
                                <div className="mb-4">
                                    <h3 className="mb-2 text-sm font-medium text-gray-300">
                                        {t('ตั้งค่ามินิสปริงเกลอร์')}
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="mb-1 block text-xs text-gray-400">
                                                {t('รัศมีทั้งหมด')}:
                                            </label>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="range"
                                                    min="0.5"
                                                    max="3"
                                                    step="0.1"
                                                    value={globalRadius}
                                                    onChange={(e) =>
                                                        updateAllSprinklerRadius(
                                                            parseFloat(e.target.value)
                                                        )
                                                    }
                                                    className="flex-1"
                                                />
                                                <span className="min-w-[2rem] text-xs text-white">
                                                    {globalRadius}m
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs text-gray-400">
                                                {t('อัตราการไหล')} (L/min):
                                            </label>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="number"
                                                    min="5"
                                                    max="30"
                                                    step="1"
                                                    value={sprinklerFlowRate}
                                                    onChange={(e) => setSprinklerFlowRate(parseFloat(e.target.value) || 10)}
                                                    className="flex-1 rounded bg-gray-600 px-2 py-1 text-xs text-white"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs text-gray-400">
                                                {t('แรงดัน')} (bar):
                                            </label>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="number"
                                                    min="1.5"
                                                    max="4.0"
                                                    step="0.1"
                                                    value={sprinklerPressure}
                                                    onChange={(e) => setSprinklerPressure(parseFloat(e.target.value) || 2.5)}
                                                    className="flex-1 rounded bg-gray-600 px-2 py-1 text-xs text-white"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs text-gray-400">
                                                {t('Overlap ทั้งหมด (0-50%)')}:
                                            </label>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="0.5"
                                                    step="0.05"
                                                    value={globalSprinklerOverlap}
                                                    onChange={(e) =>
                                                        setGlobalSprinklerOverlap(
                                                            Math.min(0.5, Math.max(0, parseFloat(e.target.value)))
                                                        )
                                                    }
                                                    className="flex-1"
                                                />
                                                <span className="min-w-[3rem] text-xs text-white">
                                                    {Math.round(globalSprinklerOverlap * 100)}%
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[10px] text-gray-400">
                                                {t('50% หมายถึงระยะห่างจุดศูนย์กลางเท่ากับ 1R')}
                                            </p>
                                        </div>

                                        {selectedElement &&
                                            irrigationElements.find(
                                                (el) => el.id === selectedElement && el.type === 'sub-pipe'
                                            ) && (
                                                <div className="mt-3 rounded bg-gray-700 p-2">
                                                    <div className="mb-2 text-xs text-yellow-300">
                                                        {t('ปรับตามท่อย่อยที่เลือก')}:
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-xs text-gray-400">
                                                            {t('รัศมีของสปริงเกลอร์ตามท่อย่อย')}:
                                                        </label>
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="range"
                                                                min="0.5"
                                                                max="3"
                                                                step="0.1"
                                                                value={getSelectedSubPipeSprinklerRadiusMeters()}
                                                                onChange={(e) =>
                                                                    updateSelectedSubPipeSprinklerRadius(
                                                                        parseFloat(e.target.value)
                                                                    )
                                                                }
                                                                className="flex-1"
                                                            />
                                                            <span className="min-w-[2rem] text-xs text-white">
                                                                {getSelectedSubPipeSprinklerRadiusMeters()}m
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        {selectedElement &&
                                            irrigationElements.find(
                                                (el) =>
                                                    el.id === selectedElement && el.type === 'sprinkler'
                                            ) && (
                                                <div className="mt-3 rounded bg-gray-700 p-2">
                                                    <div className="mb-2 text-xs text-yellow-300">
                                                        {t('ปรับตัวที่เลือก')}:
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div>
                                                            <label className="mb-1 block text-xs text-gray-400">
                                                                {t('รัศมี')}:
                                                            </label>
                                                            <div className="flex items-center space-x-2">
                                                                <input
                                                                    type="range"
                                                                    min="0.5"
                                                                    max="3"
                                                                    step="0.1"
                                                                    value={
                                                                        (irrigationElements.find(
                                                                            (el) =>
                                                                                el.id ===
                                                                                selectedElement
                                                                        )?.radius || 30) / 20
                                                                    }
                                                                    onChange={(e) =>
                                                                        updateSelectedSprinklerRadius(
                                                                            parseFloat(e.target.value)
                                                                        )
                                                                    }
                                                                    className="flex-1"
                                                                />
                                                                <span className="min-w-[2rem] text-xs text-white">
                                                                    {(
                                                                        (irrigationElements.find(
                                                                            (el) =>
                                                                                el.id ===
                                                                                selectedElement
                                                                        )?.radius || 30) / 20
                                                                    ).toFixed(1)}
                                                                    m
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            )}

                            {/* Drip Irrigation Settings */}
                            {selectedIrrigationMethod === 'drip' && (
                                <div className="mb-4">
                                    <h3 className="mb-2 text-sm font-medium text-gray-300">
                                        {t('ตั้งค่าน้ำหยด')}
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="mb-1 block text-xs text-gray-400">
                                                {t('ระยะห่างจุดน้ำหยดทั้งหมด')}:
                                            </label>
                                            <div className="flex items-center space-x-2">
                                                <select
                                                    value={globalDripSpacing}
                                                    onChange={(e) =>
                                                        updateGlobalDripSpacing(
                                                            parseInt(e.target.value)
                                                        )
                                                    }
                                                    className="flex-1 rounded bg-gray-600 px-2 py-1 text-xs text-white"
                                                >
                                                    {dripSpacingOptions.map((spacing) => (
                                                        <option key={spacing} value={spacing}>
                                                            {spacing} ซม
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs text-gray-400">
                                                {t('อัตราการไหล')} (L/min):
                                            </label>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="number"
                                                    min="0.24"
                                                    max="0.24"
                                                    step="0.01"
                                                    value={dripFlowRate}
                                                    readOnly
                                                    className="flex-1 rounded bg-gray-700 px-2 py-1 text-xs text-white"
                                                />
                                                <span className="text-xs text-gray-400">
                                                    {t('คงที่')}
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs text-gray-400">
                                                {t('แรงดัน')} (bar):
                                            </label>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="number"
                                                    min="0.5"
                                                    max="2.0"
                                                    step="0.1"
                                                    value={dripPressure}
                                                    onChange={(e) => setDripPressure(parseFloat(e.target.value) || 1.0)}
                                                    className="flex-1 rounded bg-gray-600 px-2 py-1 text-xs text-white"
                                                />
                                            </div>
                                        </div>

                                        {selectedElement &&
                                            irrigationElements.find(
                                                (el) =>
                                                    el.id === selectedElement && el.type === 'drip-line'
                                            ) && (
                                                <div className="mt-2 rounded bg-gray-700 p-2">
                                                    <div className="mb-1 text-xs text-yellow-300">
                                                        {t('ปรับเส้นที่เลือก')}:
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <select
                                                            value={
                                                                Math.round(
                                                                    (irrigationElements.find(
                                                                        (el) => el.id === selectedElement
                                                                    )?.spacing || globalDripSpacing / 100) * 100
                                                                )
                                                            }
                                                            onChange={(e) =>
                                                                updateSelectedDripSpacing(
                                                                    parseInt(e.target.value)
                                                                )
                                                            }
                                                            className="flex-1 rounded bg-gray-600 px-2 py-1 text-xs text-white"
                                                        >
                                                            {dripSpacingOptions.map((spacing) => (
                                                                <option key={spacing} value={spacing}>
                                                                    {spacing} ซม
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            )}

                            {/* Auto Generation */}
                            <div className="mb-4">
                                <h3 className="mb-2 text-sm font-medium text-gray-300">
                                    {t('สร้างอัตโนมัติ')}
                                </h3>
                                <div className="space-y-2">
                                    {selectedIrrigationMethod === 'mini-sprinkler' && (
                                        <div className="space-y-2">
                                            <button
                                                onClick={autoGenerateSprinklers}
                                                disabled={!canAutoGenerate}
                                                className={`w-full rounded px-3 py-2 text-xs transition-colors ${
                                                    canAutoGenerate
                                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                        : 'cursor-not-allowed bg-gray-600 text-gray-400'
                                                }`}
                                            >
                                                💦 {t('สร้างมินิสปริงเกลอร์ (แถวตรง)')}
                                            </button>
                                        </div>
                                    )}

                                    {selectedIrrigationMethod === 'drip' && (
                                        <button
                                            onClick={autoGenerateDripLines}
                                            disabled={!canAutoGenerate}
                                            className={`w-full rounded px-3 py-2 text-xs transition-colors ${
                                                canAutoGenerate
                                                    ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                                                    : 'cursor-not-allowed bg-gray-600 text-gray-400'
                                            }`}
                                        >
                                            💧 {t('สร้างสายน้ำหยด')}
                                        </button>
                                    )}

                                    {!canAutoGenerate && (
                                        <div className="mt-1 text-xs text-yellow-400">
                                            ⚠️ {t('ต้องมีท่อเมนและท่อย่อยก่อนสร้าง')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* View Controls */}
                            <div className="mb-4">
                                <h3 className="mb-2 text-sm font-medium text-gray-300">{t('การแสดงผล')}</h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setShowGrid(!showGrid)}
                                        className={`w-full rounded px-3 py-2 text-xs transition-colors ${
                                            showGrid
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        📏 {t('แสดงกริด')} ({GRID_SIZE}px)
                                    </button>
                                    <button
                                        onClick={() => {
                                            setZoom(1);
                                            setPan({ x: 0, y: 0 });
                                        }}
                                        className="w-full rounded bg-gray-700 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-600"
                                    >
                                        🔄 {t('รีเซ็ตมุมมอง')}
                                    </button>
                                </div>
                            </div>

                            {/* Statistics */}
                            <div className="mb-4">
                                <h3 className="mb-2 text-sm font-medium text-gray-300">
                                    {t('สถิติโครงสร้าง')}
                                </h3>
                                <div className="mb-3 space-y-1 text-xs text-gray-400">
                                    <div className="flex justify-between">
                                        <span>🏠 {t('โรงเรือน')}:</span>
                                        <span>
                                            {shapes.filter((s) => s.type === 'greenhouse').length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>🌱 {t('แปลงปลูก')}:</span>
                                        <span>{shapes.filter((s) => s.type === 'plot').length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>🚶 {t('ทางเดิน')}:</span>
                                        <span>{shapes.filter((s) => s.type === 'walkway').length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>💧 {t('แหล่งน้ำ')}:</span>
                                        <span>
                                            {shapes.filter((s) => s.type === 'water-source').length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>🌿 {t('พื้นที่ให้ปุ๋ย')}:</span>
                                        <span>{calculateStats.fertilizerAreaCount}</span>
                                    </div>
                                </div>

                                <h3 className="mb-2 text-sm font-medium text-gray-300">{t('สถิติระบบน้ำ')}</h3>
                                <div className="space-y-1 text-xs text-gray-400">
                                    <div className="flex justify-between">
                                        <span>{t('ท่อเมนแมพ')}:</span>
                                        <span>{calculateStats.mainPipeLength} px</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('ท่อเมนย่อยแมพ')}:</span>
                                        <span>{calculateStats.subPipeLength} px</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('สายน้ำหยด')}:</span>
                                        <span>{calculateStats.dripLineLength} px</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('มินิสปริงเกลอร์')}:</span>
                                        <span>{calculateStats.sprinklerCount} {t('หน่วย')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('ปั๊ม')}:</span>
                                        <span>{calculateStats.pumpCount} {t('หน่วย')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('วาล์ว')}:</span>
                                        <span>{calculateStats.valveCount} {t('หน่วย')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('ถังน้ำ')}:</span>
                                        <span>{calculateStats.waterTankCount} {t('หน่วย')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('เครื่องให้ปุ๋ย')}:</span>
                                        <span>{calculateStats.fertilizerMachineCount} {t('หน่วย')}</span>
                                    </div>
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
                                handleMouseUp();
                            }}
                            onTouchCancel={(e) => {
                                e.preventDefault();
                                handleMouseUp();
                            }}
                            className="block select-none bg-gray-900"
                            style={{
                                width: '100%',
                                height: '100%',
                                cursor: isDragging
                                    ? 'grabbing'
                                    : isPanning
                                      ? 'grabbing'
                                      : selectedTool === 'select' && hoveredElement
                                        ? 'grab'
                                        : selectedTool === 'select'
                                          ? 'default'
                                          : 'crosshair',
                            }}
                        />

                        {/* Coordinates Display */}
                        <div className="absolute bottom-4 left-4 rounded bg-black/50 px-3 py-1 text-sm text-white">
                            X: {mousePos.x.toFixed(0)}, Y: {mousePos.y.toFixed(0)} | {t('ซูม')}:{' '}
                            {(zoom * 100).toFixed(0)}%
                        </div>

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
                            {selectedElement && selectedTool === 'select' && (
                                <button
                                    onClick={deleteElement}
                                    className="rounded bg-red-600 px-4 py-2 text-sm text-white shadow-lg transition-colors hover:bg-red-700"
                                >
                                    🗑️ {t('ลบองค์ประกอบ')}
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    const newIrrigationElements: IrrigationElement[] = [];
                                    setIrrigationElements(newIrrigationElements);
                                    setSelectedElement(null);
                                    
                                    addToHistory(shapes, newIrrigationElements);
                                }}
                                className="rounded bg-orange-600 px-4 py-2 text-sm text-white shadow-lg transition-colors hover:bg-orange-700"
                            >
                                🧹 {t('ล้างระบบน้ำ')}
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
                            <h3 className="mb-3 text-sm font-medium text-gray-300">
                                {t('โครงสร้างโรงเรือน')}
                            </h3>

                            {shapes.length === 0 ? (
                                <p className="text-sm text-gray-500">{t('ไม่มีโครงสร้าง')}</p>
                            ) : (
                                <div className="mb-4 space-y-3">
                                    {shapes.filter((s) => s.type === 'plot').length > 0 && (
                                        <div>
                                            <h4 className="mb-2 text-xs font-medium text-green-400">
                                                🌱 {t('แปลงปลูก')}
                                            </h4>
                                            <div className="space-y-1">
                                                {shapes
                                                    .filter((s) => s.type === 'plot')
                                                    .map((plot) => {
                                                        const crop = plot.cropType
                                                            ? getCropByValue(plot.cropType)
                                                            : null;
                                                        return (
                                                            <div
                                                                key={plot.id}
                                                                onClick={() => {
                                                                    if (selectedCrops.length === 0) {
                                                                        alert(
                                                                            t('ไม่มีพืชที่เลือกไว้ กรุณากลับไปเลือกพืชในขั้นตอนแรก')
                                                                        );
                                                                        return;
                                                                    }
                                                                    setSelectedPlot(plot.id);
                                                                    setShowCropSelector(true);
                                                                }}
                                                                className={`cursor-pointer rounded p-2 text-sm transition-colors ${
                                                                    selectedCrops.length === 0
                                                                        ? 'cursor-not-allowed bg-gray-700 text-gray-500'
                                                                        : plot.cropType
                                                                          ? 'bg-green-700 text-gray-300 hover:bg-green-600'
                                                                          : 'bg-yellow-700 text-gray-300 hover:bg-yellow-600'
                                                                }`}
                                                                title={
                                                                    selectedCrops.length === 0
                                                                        ? t('กรุณาเลือกพืชก่อน')
                                                                        : plot.cropType
                                                                          ? t('คลิกเพื่อเปลี่ยนพืช')
                                                                          : t('คลิกเพื่อเลือกพืช (จำเป็น)')
                                                                }
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span className="truncate">
                                                                        {plot.name}
                                                                        {!plot.cropType && (
                                                                            <span className="ml-1 text-yellow-400">
                                                                                ⚠️
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    <div className="flex items-center space-x-2">
                                                                        {crop ? (
                                                                            <span className="text-lg">
                                                                                {crop.icon}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-xs text-yellow-400">
                                                                                {selectedCrops.length ===
                                                                                0
                                                                                    ? t('ไม่มีพืชให้เลือก')
                                                                                    : t('ยังไม่เลือกพืช')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {crop && (
                                                                    <div className="mt-1 text-xs text-gray-400">
                                                                        {crop.name}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    )}

                                    {shapes.filter((s) => s.type === 'greenhouse').length > 0 && (
                                        <div>
                                            <h4 className="mb-2 text-xs font-medium text-green-400">
                                                🏠 {t('โรงเรือน')}
                                            </h4>
                                            <div className="space-y-1">
                                                {shapes
                                                    .filter((s) => s.type === 'greenhouse')
                                                    .map((greenhouse) => (
                                                        <div
                                                            key={greenhouse.id}
                                                            className="rounded bg-gray-700 p-2 text-sm text-gray-300"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="truncate">
                                                                    {greenhouse.name}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    {greenhouse.points.length} {t('จุด')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {shapes.filter((s) => s.type === 'walkway').length > 0 && (
                                        <div>
                                            <h4 className="mb-2 text-xs font-medium text-gray-400">
                                                🚶 {t('ทางเดิน')}
                                            </h4>
                                            <div className="space-y-1">
                                                {shapes
                                                    .filter((s) => s.type === 'walkway')
                                                    .map((walkway) => (
                                                        <div
                                                            key={walkway.id}
                                                            className="rounded bg-gray-700 p-2 text-sm text-gray-300"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="truncate">
                                                                    {walkway.name}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    {walkway.points.length} {t('จุด')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {shapes.filter((s) => s.type === 'water-source').length > 0 && (
                                        <div>
                                            <h4 className="mb-2 text-xs font-medium text-blue-400">
                                                💧 {t('แหล่งน้ำ')}
                                            </h4>
                                            <div className="space-y-1">
                                                {shapes
                                                    .filter((s) => s.type === 'water-source')
                                                    .map((water) => (
                                                        <div
                                                            key={water.id}
                                                            className="rounded bg-gray-700 p-2 text-sm text-gray-300"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="truncate">
                                                                    {water.name}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    {water.points.length === 1
                                                                        ? t('จุดเดียว')
                                                                        : `${water.points.length} ${t('จุด')}`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {shapes.filter((s) => s.type === 'fertilizer-area').length > 0 && (
                                        <div>
                                            <h4 className="mb-2 text-xs font-medium text-green-400">
                                                🌿 {t('พื้นที่ให้ปุ๋ย')}
                                            </h4>
                                            <div className="space-y-1">
                                                {shapes
                                                    .filter((s) => s.type === 'fertilizer-area')
                                                    .map((area) => (
                                                        <div
                                                            key={area.id}
                                                            className="rounded bg-gray-700 p-2 text-sm text-gray-300"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="truncate">
                                                                    {area.name}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    {area.points.length} {t('จุด')}
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
                                <h3 className="mb-3 text-sm font-medium text-gray-300">
                                    {t('องค์ประกอบระบบน้ำ')}
                                </h3>

                                {irrigationElements.length === 0 ? (
                                    <p className="text-sm text-gray-500">{t('ยังไม่มีองค์ประกอบ')}</p>
                                ) : (
                                    <div className="space-y-2">
                                        {irrigationElements.map((element) => {
                                            const typeNames = {
                                                'main-pipe': '🔵 ' + t('ท่อเมนแมพ'),
                                                'sub-pipe': '🟢 ' + t('ท่อเมนย่อยแมพ'),
                                                pump: '⚙️ ' + t('ปั๊ม'),
                                                'solenoid-valve': '🔧 ' + t('โซลินอยด์วาล์ว'),
                                                'ball-valve': '🟡 ' + t('บอลวาล์ว'),
                                                'water-tank': '🗂️ ' + t('ถังเก็บน้ำ'),
                                                'fertilizer-machine': '🧪 ' + t('เครื่องให้ปุ๋ย'),
                                                sprinkler: '💦 ' + t('มินิสปริงเกลอร์'),
                                                'drip-line': '💧 ' + t('สายน้ำหยด'),
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
                                                                className="text-red-400 transition-colors hover:text-red-300"
                                                                title={t('ลบอุปกรณ์')}
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="mt-1 text-xs text-gray-400">
                                                        {element.points.length} {t('จุด')}
                                                        {element.radius &&
                                                            ` | ${t('รัศมี')}: ${(element.radius / 20).toFixed(1)}m`}
                                                        {element.spacing &&
                                                            ` | ${t('ระยะห่าง')}: ${element.spacing.toFixed(2)}m`}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
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
                    {/* Warning Message */}
                    {plotsWithoutCrops.length > 0 && (
                        <div className="mb-3 rounded-lg border border-yellow-600 bg-yellow-900/30 p-3">
                            <div className="text-sm text-yellow-300">
                                ⚠️ {t('กรุณาเลือกพืชให้ครบทุกแปลงปลูกก่อนไปดูสรุป')}
                            </div>
                            <div className="mt-1 text-xs text-yellow-400">
                                {t('แปลงที่ยังไม่เลือก')}:{' '}
                                {plotsWithoutCrops.map((plot) => plot.name).join(', ')}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between">
                        <button
                            onClick={() => {
                                // Save irrigation system data
                                const summaryData = {
                                    selectedCrops: selectedCrops,
                                    planningMethod: 'draw',
                                    shapes: shapes,
                                    irrigationElements: irrigationElements, // Added this line
                                    irrigationMethod: selectedIrrigationMethod,
                                    updatedAt: new Date().toISOString(),
                                };

                                const queryParams = new URLSearchParams();
                                if (selectedCrops && selectedCrops.length > 0) {
                                    queryParams.set('crops', selectedCrops.join(','));
                                }
                                if (shapes && shapes.length > 0) {
                                    queryParams.set(
                                        'shapes',
                                        encodeURIComponent(JSON.stringify(shapes))
                                    );
                                }
                                if (selectedIrrigationMethod) {
                                    queryParams.set('irrigation', selectedIrrigationMethod); // Added this line
                                }

                                window.location.href = `/choose-irrigation?${queryParams.toString()}`;
                            }}
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
                            onClick={() => {
                                if (!canGoToSummary) {
                                    alert(t('กรุณาเลือกพืชให้ครบทุกแปลงปลูกก่อนไปดูสรุป'));
                                    return;
                                }

                                const summaryData = {
                                    selectedCrops: selectedCrops,
                                    planningMethod: 'draw',
                                    shapes: shapes,
                                    irrigationElements: irrigationElements,
                                    irrigationMethod: selectedIrrigationMethod,
                                    sprinklerFlowRate: sprinklerFlowRate,
                                    dripEmitterFlowRate: dripFlowRate,
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString(),
                                };

                                localStorage.setItem(
                                    'greenhousePlanningData',
                                    JSON.stringify(summaryData)
                                );

                                window.location.href = '/green-house-summary';
                            }}
                            disabled={!canGoToSummary}
                            className={`flex items-center rounded px-6 py-2 transition-colors ${
                                canGoToSummary
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'cursor-not-allowed bg-gray-600 text-gray-400'
                            }`}
                            title={!canGoToSummary ? t('กรุณาเลือกพืชให้ครบทุกแปลงปลูกก่อน') : ''}
                        >
                            📊 {t('ดูสรุป')}
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
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Crop Selector Modal */}
                {showCropSelector && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="mx-4 w-full max-w-md rounded-lg border border-gray-600 bg-gray-800 p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-lg font-medium text-white">
                                    {t('เลือกพืชสำหรับแปลงนี้')}
                                </h3>
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
                                <div className="mb-4 rounded-lg border border-yellow-600 bg-yellow-900/30 p-3">
                                    <div className="text-sm text-yellow-300">
                                        ⚠️ {t('ไม่มีพืชที่เลือกไว้ กรุณากลับไปเลือกพืชในขั้นตอนแรก')}
                                    </div>
                                </div>
                            )}

                            <div className="grid max-h-64 grid-cols-2 gap-3 overflow-y-auto">
                                {selectedCrops.length === 0 ? (
                                    <div className="col-span-2 py-4 text-center text-gray-400">
                                        {t('ไม่มีพืชที่เลือกไว้')}
                                    </div>
                                ) : (
                                    selectedCrops.map((cropValue) => {
                                        const crop = getCropByValue(cropValue);
                                        if (!crop) return null;
                                        return (
                                            <button
                                                key={crop.value}
                                                onClick={() => assignCropToPlot(crop.value)}
                                                className="rounded-lg border border-gray-600 bg-gray-700 p-3 text-center transition-colors hover:bg-gray-600"
                                            >
                                                <div className="mb-1 text-2xl">{crop.icon}</div>
                                                <div className="text-sm text-white">{crop.name}</div>
                                                <div className="text-xs text-gray-400">
                                                    {crop.nameEn}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            <div className="mt-4 border-t border-gray-600 pt-4">
                                <button
                                    onClick={() => {
                                        if (selectedPlot) {
                                            const newShapes = shapes.map((shape) => {
                                                if (shape.id === selectedPlot) {
                                                    const { cropType, ...shapeWithoutCrop } = shape;
                                                    return shapeWithoutCrop;
                                                }
                                                return shape;
                                            });
                                            
                                            setShapes(newShapes);
                                            
                                            addToHistory(newShapes, irrigationElements);
                                        }
                                        setShowCropSelector(false);
                                        setSelectedPlot(null);
                                    }}
                                    className="w-full rounded bg-red-600 py-2 text-sm text-white transition-colors hover:bg-red-700"
                                >
                                    {t('ลบพืชออกจากแปลง')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
