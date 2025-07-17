import { Head } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';

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
    angle?: number;
    spacing?: number;
}

interface GreenhouseSummaryData {
    // From crop selection
    selectedCrops: string[];
    
    // From area input
    planningMethod: 'draw' | 'import';
    
    // From planner
    shapes: Shape[];
    canvasData?: string; // Base64 image of the canvas
    
    // From irrigation selection
    irrigationMethod: 'mini-sprinkler' | 'drip' | 'mixed';
    
    // From irrigation map
    irrigationElements?: IrrigationElement[];
    irrigationCanvasData?: string; // Base64 image of irrigation design
    
    // Calculated data
    greenhouseArea?: number;
    plotCount?: number;
    totalPlantingArea?: number;
    
    // Timestamps
    createdAt?: string;
    updatedAt?: string;
}

export default function GreenhouseSummary() {
    const [summaryData, setSummaryData] = useState<GreenhouseSummaryData | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleEditProject = () => {
        if (summaryData) {
            // บันทึกข้อมูลใน localStorage ก่อนย้อนกลับ
            const dataToSave = {
                ...summaryData,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem('greenhousePlanningData', JSON.stringify(dataToSave));
            
            // สร้าง URL parameters สำหรับ green-house-map
            const queryParams = new URLSearchParams();
            if (summaryData.selectedCrops && summaryData.selectedCrops.length > 0) {
                queryParams.set('crops', summaryData.selectedCrops.join(','));
            }
            if (summaryData.shapes && summaryData.shapes.length > 0) {
                queryParams.set('shapes', encodeURIComponent(JSON.stringify(summaryData.shapes)));
            }
            if (summaryData.planningMethod) {
                queryParams.set('method', summaryData.planningMethod);
            }
            if (summaryData.irrigationMethod) {
                queryParams.set('irrigation', summaryData.irrigationMethod);
            }
            
            // นำทางไปยัง green-house-map พร้อมข้อมูล
            window.location.href = `/greenhouse-map?${queryParams.toString()}`;
        } else {
            // หากไม่มีข้อมูล ให้ไปหน้าเลือกพืชใหม่
            window.location.href = '/greenhouse-crop';
        }
    };

    const handleBackNavigation = () => {
        handleEditProject(); // ใช้ฟังก์ชันเดียวกัน
    };

    useEffect(() => {
        // Get data from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const crops = urlParams.get('crops');
        const method = urlParams.get('method');
        const shapesParam = urlParams.get('shapes');
        const irrigationParam = urlParams.get('irrigation');
        
        // Try to get complete data from localStorage
        const savedData = localStorage.getItem('greenhousePlanningData');
        
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                console.log('Summary: Loaded data from localStorage:', parsedData);
                console.log('Summary: Irrigation elements:', parsedData.irrigationElements);
                setSummaryData(parsedData);
            } catch (error) {
                console.error('Error parsing saved data:', error);
                
                // Fallback to URL parameters
                if (crops || shapesParam) {
                    const newData: GreenhouseSummaryData = {
                        selectedCrops: crops ? crops.split(',') : [],
                        planningMethod: (method as 'draw' | 'import') || 'draw',
                        shapes: shapesParam ? JSON.parse(decodeURIComponent(shapesParam)) : [],
                        irrigationMethod: (irrigationParam as any) || 'mini-sprinkler',
                        irrigationElements: [], // Initialize empty array for irrigation elements
                        createdAt: new Date().toISOString()
                    };
                    setSummaryData(newData);
                }
            }
        } else if (crops || shapesParam) {
            // Create new data from URL parameters
            const newData: GreenhouseSummaryData = {
                selectedCrops: crops ? crops.split(',') : [],
                planningMethod: (method as 'draw' | 'import') || 'draw',
                shapes: shapesParam ? JSON.parse(decodeURIComponent(shapesParam)) : [],
                irrigationMethod: (irrigationParam as any) || 'mini-sprinkler',
                irrigationElements: [], // Initialize empty array for irrigation elements
                createdAt: new Date().toISOString()
            };
            setSummaryData(newData);
        }
    }, []);

    // Helper function to draw component shapes (irrigation equipment)
    const drawComponentShape = (ctx: CanvasRenderingContext2D, type: string, point: Point, color: string, scale: number = 1) => {
        const size = 8 * scale;
        
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 * scale;
        
        switch (type) {
            case 'pump':
                ctx.beginPath();
                ctx.arc(point.x, point.y, size, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                
                // Draw pump blades
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1.5 * scale;
                for (let i = 0; i < 4; i++) {
                    const angle = (i * Math.PI) / 2;
                    const startX = point.x + Math.cos(angle) * (size * 0.3);
                    const startY = point.y + Math.sin(angle) * (size * 0.3);
                    const endX = point.x + Math.cos(angle) * (size * 0.7);
                    const endY = point.y + Math.sin(angle) * (size * 0.7);
                    
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
                break;
                
            case 'solenoid-valve':
                ctx.fillRect(point.x - size/2, point.y - size/2, size, size);
                ctx.strokeRect(point.x - size/2, point.y - size/2, size, size);
                
                // Draw solenoid lines
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1 * scale;
                for (let i = 0; i < 3; i++) {
                    const y = point.y - size/3 + (i * size/3);
                    ctx.beginPath();
                    ctx.moveTo(point.x - size/3, y);
                    ctx.lineTo(point.x + size/3, y);
                    ctx.stroke();
                }
                break;
                
            case 'ball-valve':
                ctx.beginPath();
                ctx.arc(point.x, point.y, size, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                
                // Draw valve line
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2 * scale;
                ctx.beginPath();
                ctx.moveTo(point.x - size * 0.7, point.y);
                ctx.lineTo(point.x + size * 0.7, point.y);
                ctx.stroke();
                break;
                
            case 'sprinkler':
                // Draw sprinkler as a small circle with radiating lines
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(point.x, point.y, size * 0.5, 0, 2 * Math.PI);
                ctx.fill();
                
                // Draw radiating lines to show spray pattern
                ctx.strokeStyle = color;
                ctx.lineWidth = 1 * scale;
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI) / 4;
                    const endX = point.x + Math.cos(angle) * (size * 1.5);
                    const endY = point.y + Math.sin(angle) * (size * 1.5);
                    
                    ctx.beginPath();
                    ctx.moveTo(point.x, point.y);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
                break;
        }
    };

    // Helper function to draw drip points
    const drawDripPoints = (ctx: CanvasRenderingContext2D, element: IrrigationElement, scale: number = 1) => {
        if (element.points.length < 2) return;
        
        const spacing = (element.spacing || 0.3) * 20 * scale;
        
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
                    y: p1.y + direction.y * currentDistance
                };
                
                ctx.fillStyle = '#06B6D4';
                ctx.beginPath();
                ctx.arc(dripPoint.x, dripPoint.y, 1.5 * scale, 0, 2 * Math.PI);
                ctx.fill();
                
                currentDistance += spacing;
            }
        }
    };

    // Draw irrigation elements on canvas
    const drawIrrigationElements = (ctx: CanvasRenderingContext2D, elements: IrrigationElement[], scale: number = 1, offsetX: number = 0, offsetY: number = 0) => {
        elements.forEach(element => {
            ctx.strokeStyle = element.color;
            ctx.lineWidth = (element.width || 2) * scale;
            ctx.setLineDash([]);

            if (element.type === 'main-pipe' || element.type === 'sub-pipe') {
                if (element.points.length >= 2) {
                    ctx.beginPath();
                    ctx.moveTo(element.points[0].x * scale + offsetX, element.points[0].y * scale + offsetY);
                    
                    for (let i = 1; i < element.points.length; i++) {
                        ctx.lineTo(element.points[i].x * scale + offsetX, element.points[i].y * scale + offsetY);
                    }
                    
                    ctx.stroke();
                }
            } else if (element.type === 'drip-line') {
                if (element.points.length >= 2) {
                    // Draw dashed line for drip line
                    ctx.setLineDash([5 * scale, 3 * scale]);
                    ctx.beginPath();
                    ctx.moveTo(element.points[0].x * scale + offsetX, element.points[0].y * scale + offsetY);
                    
                    for (let i = 1; i < element.points.length; i++) {
                        ctx.lineTo(element.points[i].x * scale + offsetX, element.points[i].y * scale + offsetY);
                    }
                    
                    ctx.stroke();
                    ctx.setLineDash([]);
                    
                    // Draw drip points
                    const scaledElement = {
                        ...element,
                        points: element.points.map(p => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY }))
                    };
                    drawDripPoints(ctx, scaledElement, scale);
                }
            } else if (element.type === 'sprinkler') {
                if (element.points.length >= 1) {
                    const point = {
                        x: element.points[0].x * scale + offsetX,
                        y: element.points[0].y * scale + offsetY
                    };
                    
                    // Draw sprinkler coverage area (optional, can be removed for cleaner look)
                    if (element.radius) {
                        ctx.strokeStyle = element.color + '40';
                        ctx.setLineDash([3 * scale, 2 * scale]);
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, element.radius * scale, 0, 2 * Math.PI);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                    
                    drawComponentShape(ctx, element.type, point, element.color, scale);
                }
            } else {
                if (element.points.length >= 1) {
                    const point = {
                        x: element.points[0].x * scale + offsetX,
                        y: element.points[0].y * scale + offsetY
                    };
                    drawComponentShape(ctx, element.type, point, element.color, scale);
                }
            }
        });
    };

    // Calculate metrics from shapes data (ปรับปรุงใหม่)
    const calculateMetrics = () => {
        if (!summaryData?.shapes) return {
            shapeTypeCount: 0,
            greenhouseArea: 0,
            plotArea: 0,
            plotCount: 0,
            waterSourceCount: 0,
            walkwayArea: 0
        };

        const shapes = summaryData.shapes;
        const greenhouses = shapes.filter(s => s.type === 'greenhouse');
        const plots = shapes.filter(s => s.type === 'plot');
        const walkways = shapes.filter(s => s.type === 'walkway');
        const waterSources = shapes.filter(s => s.type === 'water-source');

        // Get unique shape types
        const shapeTypes = new Set(shapes.map(s => s.type));
        const shapeTypeCount = shapeTypes.size;

        // Calculate polygon area using Shoelace formula (1 grid = 25 pixels = 1 meter)
        const calculatePolygonArea = (points: { x: number; y: number }[]) => {
            if (points.length < 3) return 0;
            let area = 0;
            for (let i = 0; i < points.length; i++) {
                const j = (i + 1) % points.length;
                area += points[i].x * points[j].y;
                area -= points[j].x * points[i].y;
            }
            // Convert from pixels to square meters (25 pixels = 1 meter, so 625 pixels² = 1 m²)
            return Math.abs(area / 2) / 625;
        };

        const greenhouseArea = greenhouses.reduce((sum, gh) => sum + calculatePolygonArea(gh.points), 0);
        const plotArea = plots.reduce((sum, plot) => sum + calculatePolygonArea(plot.points), 0);
        const walkwayArea = walkways.reduce((sum, walkway) => sum + calculatePolygonArea(walkway.points), 0);

        return {
            shapeTypeCount,
            greenhouseArea: Math.round(greenhouseArea * 100) / 100, // Round to 2 decimal places
            plotArea: Math.round(plotArea * 100) / 100,
            plotCount: plots.length,
            waterSourceCount: waterSources.length,
            walkwayArea: Math.round(walkwayArea * 100) / 100
        };
    };

    const metrics = calculateMetrics();

    // Calculate irrigation equipment from irrigationElements (ปรับปรุงใหม่)
    const calculateIrrigationMetrics = () => {
        if (!summaryData?.irrigationElements) {
            console.log('Summary: No irrigation elements found');
            return {
                maxMainPipeLength: 0,
                maxSubPipeLength: 0,
                pumps: 0,
                solenoidValves: 0,
                ballValves: 0,
                sprinklers: 0,
                dripLines: 0
            };
        }

        const elements = summaryData.irrigationElements;
        console.log('Summary: Calculating metrics for irrigation elements:', elements);
        
        // Calculate pipe length
        const calculatePipeLength = (points: Point[]) => {
            if (points.length < 2) return 0;
            let totalLength = 0;
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];
                const segmentLength = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                totalLength += segmentLength;
            }
            // Convert from pixels to meters (25 pixels = 1 meter)
            return totalLength / 25;
        };

        // Find longest main pipe
        const mainPipes = elements.filter(e => e.type === 'main-pipe');
        let maxMainPipeLength = 0;
        if (mainPipes.length > 0) {
            const mainPipeLengths = mainPipes.map(pipe => calculatePipeLength(pipe.points));
            maxMainPipeLength = Math.max(...mainPipeLengths);
        }

        // Find longest sub pipe
        const subPipes = elements.filter(e => e.type === 'sub-pipe');
        let maxSubPipeLength = 0;
        if (subPipes.length > 0) {
            const subPipeLengths = subPipes.map(pipe => calculatePipeLength(pipe.points));
            maxSubPipeLength = Math.max(...subPipeLengths);
        }

        return {
            maxMainPipeLength: Math.round(maxMainPipeLength * 100) / 100, // Round to 2 decimal places
            maxSubPipeLength: Math.round(maxSubPipeLength * 100) / 100,
            pumps: elements.filter(e => e.type === 'pump').length,
            solenoidValves: elements.filter(e => e.type === 'solenoid-valve').length,
            ballValves: elements.filter(e => e.type === 'ball-valve').length,
            sprinklers: elements.filter(e => e.type === 'sprinkler').length,
            dripLines: elements.filter(e => e.type === 'drip-line').length
        };
    };

    const irrigationMetrics = calculateIrrigationMetrics();

    // Simple print function that shows browser print dialog
    const handlePrint = () => {
        // Simply trigger the browser's print dialog
        window.print();
    };



    // ปิดการใช้งานปุ่มบันทึกข้อมูลชั่วคราว
    const handleSaveData = () => {
        alert('ฟีเจอร์การบันทึกข้อมูลยังอยู่ระหว่างการพัฒนา กรุณารอการอัพเดทในเวอร์ชันถัดไป');
    };

    // Update canvas when data changes (ปรับปรุงใหม่)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && summaryData) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = 600;
                canvas.height = 400;
                
                // Clear canvas
                ctx.fillStyle = '#F3F4F6';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Calculate bounds of all elements
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                
                // Find bounds from shapes
                if (summaryData.shapes && summaryData.shapes.length > 0) {
                    summaryData.shapes.forEach(shape => {
                        shape.points.forEach(point => {
                            minX = Math.min(minX, point.x);
                            minY = Math.min(minY, point.y);
                            maxX = Math.max(maxX, point.x);
                            maxY = Math.max(maxY, point.y);
                        });
                    });
                }
                
                // Find bounds from irrigation elements
                if (summaryData.irrigationElements && summaryData.irrigationElements.length > 0) {
                    summaryData.irrigationElements.forEach(element => {
                        element.points.forEach(point => {
                            minX = Math.min(minX, point.x);
                            minY = Math.min(minY, point.y);
                            maxX = Math.max(maxX, point.x);
                            maxY = Math.max(maxY, point.y);
                        });
                    });
                }
                
                // If no elements found, use default values
                if (minX === Infinity) {
                    minX = 0;
                    minY = 0;
                    maxX = 1200;
                    maxY = 800;
                }
                
                // Add padding
                const padding = 50;
                const contentWidth = maxX - minX;
                const contentHeight = maxY - minY;
                
                // Calculate scale to fit content in canvas with padding
                const scaleX = (canvas.width - 2 * padding) / contentWidth;
                const scaleY = (canvas.height - 2 * padding) / contentHeight;
                const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size
                
                // Calculate offset to center the content
                const scaledWidth = contentWidth * scale;
                const scaledHeight = contentHeight * scale;
                const offsetX = (canvas.width - scaledWidth) / 2 - minX * scale;
                const offsetY = (canvas.height - scaledHeight) / 2 - minY * scale;
                
                // Draw shapes first
                if (summaryData.shapes && summaryData.shapes.length > 0) {
                    summaryData.shapes.forEach(shape => {
                        if (shape.points.length < 2) return;
                        
                        // Handle measurement shapes
                        if (shape.type === 'measurement') {
                            if (shape.points.length >= 2) {
                                const [start, end] = shape.points;
                                
                                ctx.strokeStyle = shape.color;
                                ctx.lineWidth = 2;
                                ctx.setLineDash([8, 4]);
                                
                                ctx.beginPath();
                                ctx.moveTo(start.x * scale + offsetX, start.y * scale + offsetY);
                                ctx.lineTo(end.x * scale + offsetX, end.y * scale + offsetY);
                                ctx.stroke();
                                ctx.setLineDash([]);
                                
                                if (shape.measurement) {
                                    const midX = ((start.x + end.x) / 2) * scale + offsetX;
                                    const midY = ((start.y + end.y) / 2) * scale + offsetY;
                                    
                                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                                    ctx.fillRect(midX - 15, midY - 10, 30, 15);
                                    
                                    ctx.fillStyle = '#FFFFFF';
                                    ctx.font = 'bold 8px Arial';
                                    ctx.textAlign = 'center';
                                    ctx.fillText(`${shape.measurement.distance}${shape.measurement.unit}`, midX, midY);
                                }
                            }
                            return;
                        }

                        // Handle water sources
                        if (shape.type === 'water-source') {
                            if (shape.points.length === 1) {
                                const point = shape.points[0];
                                const scaledX = point.x * scale + offsetX;
                                const scaledY = point.y * scale + offsetY;
                                
                                ctx.fillStyle = shape.fillColor;
                                ctx.strokeStyle = shape.color;
                                ctx.lineWidth = 2;
                                ctx.beginPath();
                                ctx.arc(scaledX, scaledY, 8 * scale, 0, 2 * Math.PI);
                                ctx.fill();
                                ctx.stroke();
                                
                                ctx.fillStyle = '#FFFFFF';
                                ctx.font = `${10 * scale}px Arial`;
                                ctx.textAlign = 'center';
                                ctx.fillText('💧', scaledX, scaledY + 3);
                            } else {
                                ctx.strokeStyle = shape.color;
                                ctx.fillStyle = shape.fillColor;
                                ctx.lineWidth = 2;
                                
                                ctx.beginPath();
                                ctx.moveTo(shape.points[0].x * scale + offsetX, shape.points[0].y * scale + offsetY);
                                
                                for (let i = 1; i < shape.points.length; i++) {
                                    ctx.lineTo(shape.points[i].x * scale + offsetX, shape.points[i].y * scale + offsetY);
                                }
                                
                                if (shape.points.length > 2) {
                                    ctx.closePath();
                                    ctx.fill();
                                }
                                ctx.stroke();
                            }
                            return;
                        }

                        // Regular shapes
                        ctx.strokeStyle = shape.color;
                        ctx.fillStyle = shape.fillColor;
                        ctx.lineWidth = 2;
                        
                        ctx.beginPath();
                        ctx.moveTo(shape.points[0].x * scale + offsetX, shape.points[0].y * scale + offsetY);
                        
                        for (let i = 1; i < shape.points.length; i++) {
                            ctx.lineTo(shape.points[i].x * scale + offsetX, shape.points[i].y * scale + offsetY);
                        }
                        
                        if (shape.points.length > 2) {
                            ctx.closePath();
                            ctx.fill();
                        }
                        ctx.stroke();
                    });
                }
                
                // Draw irrigation elements on top
                if (summaryData.irrigationElements && summaryData.irrigationElements.length > 0) {
                    drawIrrigationElements(ctx, summaryData.irrigationElements, scale, offsetX, offsetY);
                }
            }
        }
    }, [summaryData]);

    // Show loading or no data message
    if (!summaryData) {
        return (
            <div className="min-h-screen bg-gray-900 text-white">
                <Head title="Greenhouse Summary - Growing System Planning" />

                {/* Header */}
                <div className="border-b border-gray-700 bg-gray-800">
                    <div className="container mx-auto px-4 py-6">
                        <div className="mx-auto max-w-7xl">
                            {/* Back Navigation */}
                            <button
                                onClick={handleBackNavigation}
                                className="mb-4 inline-flex items-center text-blue-400 hover:text-blue-300 bg-transparent border-none cursor-pointer"
                            >
                                <svg
                                    className="mr-2 h-5 w-5"
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
                                Back to Greenhouse Map
                            </button>
                            {/* Main Title */}
                            <h1 className="mb-2 text-4xl font-bold">🏠 Greenhouse Summary</h1>
                            <p className="mb-6 text-gray-400">
                                Complete overview of your greenhouse system planning project
                            </p>
                        </div>
                    </div>
                </div>

                {/* No Data Message */}
                <div className="container mx-auto px-4 py-6">
                    <div className="mx-auto max-w-7xl">
                        <div className="rounded-lg bg-gray-800 p-8 text-center">
                            <div className="mb-4 text-6xl">🏠</div>
                            <h2 className="mb-4 text-2xl font-bold text-yellow-400">
                                No Greenhouse Data Found
                            </h2>
                            <p className="mb-6 text-gray-400">
                                It looks like you haven't completed a greenhouse planning project yet, or
                                the data has been cleared.
                            </p>
                            <div className="space-y-4">
                                <p className="text-gray-300">To view a summary, please:</p>
                                <ol className="mx-auto max-w-md space-y-2 text-left text-gray-300">
                                    <li className="flex items-start">
                                        <span className="mr-2 text-blue-400">1.</span>
                                        Go to the Greenhouse planning page
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2 text-blue-400">2.</span>
                                        Complete the greenhouse design process
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2 text-blue-400">3.</span>
                                        Click the "View Summary" button that appears
                                    </li>
                                </ol>
                            </div>
                            <div className="mt-8">
                            <button
                                onClick={() => window.location.href = '/greenhouse-crop'}
                                className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                            >
                                🏠 เริ่มต้นใหม่
                            </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white print:bg-white print:text-black">
            <Head title="Greenhouse Summary - Growing System Planning" />

            {/* Header */}
            <div className="border-b border-gray-700 bg-gray-800 print:border-gray-300 print:bg-white print:hidden">
                <div className="container mx-auto px-4 py-4">
                    <div className="mx-auto max-w-7xl">
                        {/* Back Navigation */}
                        <button
                            onClick={handleBackNavigation}
                            className="mb-2 inline-flex items-center text-blue-400 hover:text-blue-300 bg-transparent border-none cursor-pointer"
                        >
                            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                           </svg>
                            Back to Greenhouse Map
                        </button>

                        {/* Main Title */}
                        <h1 className="mb-1 text-3xl font-bold">🏠 สรุปการวางแผนโรงเรือน</h1>
                        <p className="mb-4 text-gray-400">
                            ภาพรวมการออกแบบโรงเรือนและระบบการให้น้ำ
                        </p>
                    </div>
                </div>
            </div>

            {/* Print Header - หน้าที่ 1 */}
            <div className="hidden print:block print:mb-6">
                <h1 className="text-2xl font-bold text-black">🏠 สรุปการวางแผนโรงเรือน</h1>
                <p className="text-gray-600">ภาพรวมการออกแบบโรงเรือนและระบบการให้น้ำ</p>
                <hr className="my-2 border-gray-300" />
                <p className="text-sm text-gray-500">วันที่: {new Date().toLocaleDateString('th-TH')}</p>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-4 print:px-0 print:py-0">
                <div className="mx-auto max-w-7xl">
                    {/* Single Column Layout for Print */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-1 print:gap-4">
                        {/* Project Overview & Equipment Info - หน้าที่ 1 สำหรับการพิมพ์ */}
                        <div className="space-y-4 print:space-y-4 print:page-break-after-avoid">
                            {/* Project Overview - ปรับปรุงใหม่ */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-4">
                                <h2 className="mb-3 text-lg font-bold text-green-400 print:text-lg print:text-black">
                                    🏠 ภาพรวมโครงการ
                                </h2>
                                <div className="grid grid-cols-3 gap-2 print:grid-cols-3 print:gap-3">
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="text-lg font-bold text-blue-400 print:text-lg print:text-black">
                                            {metrics.shapeTypeCount}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-sm print:text-gray-600">ชนิดพื้นที่</div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="text-lg font-bold text-green-400 print:text-lg print:text-black">
                                            {metrics.greenhouseArea.toFixed(1)}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-sm print:text-gray-600">พื้นที่โรงเรือน (ตร.ม.)</div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="text-lg font-bold text-purple-400 print:text-lg print:text-black">
                                            {metrics.plotArea.toFixed(1)}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-sm print:text-gray-600">พื้นที่แปลงปลูก (ตร.ม.)</div>
                                    </div>
                                </div>
                                
                                {/* Additional metrics row */}
                                <div className="grid grid-cols-3 gap-2 mt-3 print:grid-cols-3 print:gap-3 print:mt-4">
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="text-lg font-bold text-orange-400 print:text-lg print:text-black">
                                            {metrics.plotCount}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-sm print:text-gray-600">จำนวนแปลงปลูก</div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="text-lg font-bold text-cyan-400 print:text-lg print:text-black">
                                            {metrics.waterSourceCount}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-sm print:text-gray-600">จำนวนแหล่งน้ำ</div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="text-lg font-bold text-pink-400 print:text-lg print:text-black">
                                            {metrics.walkwayArea.toFixed(1)}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-sm print:text-gray-600">พื้นที่ทางเดิน (ตร.ม.)</div>
                                    </div>
                                </div>
                            </div>

                            {/* Planning Method & Progress */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-4">
                                <h2 className="mb-3 text-lg font-bold text-blue-400 print:text-lg print:text-black">
                                    📋 วิธีการวางแผน
                                </h2>
                                <div className="space-y-2 print:space-y-3">
                                    <div className="rounded-lg bg-gray-700 p-2 print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400 print:text-sm print:text-gray-600">
                                                วิธีการออกแบบ
                                            </span>
                                            <span className="text-sm font-bold text-orange-400 print:text-sm print:text-black">
                                                {summaryData?.planningMethod === 'draw' ? '✏️ วาดเอง' : '📁 นำเข้าไฟล์'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400 print:text-sm print:text-gray-600">
                                                ระบบการให้น้ำ
                                            </span>
                                            <span className="text-sm font-bold text-cyan-400 print:text-sm print:text-black">
                                                {summaryData?.irrigationMethod === 'mini-sprinkler' ? '💧 มินิสปริงเกลอร์' : 
                                                 summaryData?.irrigationMethod === 'drip' ? '💧🌱 น้ำหยด' : '🔄 แบบผสม'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400 print:text-sm print:text-gray-600">
                                                วันที่สร้าง
                                            </span>
                                            <span className="text-sm font-bold text-purple-400 print:text-sm print:text-black">
                                                {summaryData?.createdAt ? new Date(summaryData.createdAt).toLocaleDateString('th-TH') : 'วันนี้'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Equipment Summary - ปรับปรุงใหม่ */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-4">
                                <h2 className="mb-3 text-lg font-bold text-purple-400 print:text-lg print:text-black">
                                    ⚙️ สรุปอุปกรณ์การให้น้ำ
                                </h2>

                                {/* Pipe System - ปรับปรุงใหม่ */}
                                <div className="mb-3">
                                    <h3 className="mb-2 text-sm font-semibold text-orange-400 print:text-sm print:text-black">
                                        🔵 ระบบท่อ
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2 print:gap-3">
                                        <div className="rounded bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                            <div className="text-sm font-bold text-blue-400 print:text-sm print:text-black">
                                                {irrigationMetrics.maxMainPipeLength.toFixed(1)} ม.
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">ความยาวท่อเมนสูงสุด</div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                            <div className="text-sm font-bold text-green-400 print:text-sm print:text-black">
                                                {irrigationMetrics.maxSubPipeLength.toFixed(1)} ม.
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">ความยาวท่อย่อยสูงสุด</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Control Equipment */}
                                <div className="mb-3">
                                    <h3 className="mb-2 text-sm font-semibold text-red-400 print:text-sm print:text-black">
                                        🔧 อุปกรณ์ควบคุม
                                    </h3>
                                    <div className="grid grid-cols-3 gap-1 print:gap-2">
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-2">
                                            <div className="text-sm font-bold text-orange-400 print:text-sm print:text-black">
                                                {irrigationMetrics.pumps}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">ปั๊ม</div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-2">
                                            <div className="text-sm font-bold text-red-400 print:text-sm print:text-black">
                                                {irrigationMetrics.solenoidValves}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">โซลินอยด์วาล์ว</div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-2">
                                            <div className="text-sm font-bold text-yellow-400 print:text-sm print:text-black">
                                                {irrigationMetrics.ballValves}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">บอลวาล์ว</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Irrigation Equipment */}
                                <div>
                                    <h3 className="mb-2 text-sm font-semibold text-cyan-400 print:text-sm print:text-black">
                                        💧 อุปกรณ์การให้น้ำ
                                    </h3>
                                    <div className="grid grid-cols-2 gap-1 print:gap-2">
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-2">
                                            <div className="text-sm font-bold text-cyan-400 print:text-sm print:text-black">
                                                {irrigationMetrics.sprinklers}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">สปริงเกลอร์</div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-2">
                                            <div className="text-sm font-bold text-purple-400 print:text-sm print:text-black">
                                                {irrigationMetrics.dripLines}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">สายน้ำหยด</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="rounded-lg bg-gray-800 p-4 print:hidden">
                                <h2 className="mb-3 text-lg font-bold text-purple-400">
                                    📋 การจัดการ
                                </h2>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <button
                                    onClick={handleBackNavigation}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-center font-semibold text-white transition-colors hover:bg-blue-700"
                                >
                                    🔄 แก้ไขโครงการ
                                </button>
                                    <button
                                        onClick={handleSaveData}
                                        disabled={true}
                                        className="rounded-lg bg-gray-500 px-4 py-2 font-semibold text-white cursor-not-allowed opacity-50"
                                        title="ฟีเจอร์นี้อยู่ระหว่างการพัฒนา"
                                    >
                                        💾 บันทึกข้อมูล (เร็วๆ นี้)
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-green-700"
                                    >
                                        🖨️ พิมพ์แบบแปลน
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Greenhouse Layout Image - หน้าที่ 2 สำหรับการพิมพ์ */}
                        <div className="space-y-4 print:page-break-before-always print:space-y-0">
                            {/* Print Header สำหรับหน้าที่ 2 */}
                            <div className="hidden print:block print:mb-6">
                                <h1 className="text-xl font-bold text-black">📐 แบบแปลนโรงเรือนพร้อมระบบการให้น้ำ</h1>
                                <p className="text-gray-600">รายละเอียดโครงสร้างโรงเรือนและการติดตั้งอุปกรณ์</p>
                                <hr className="my-2 border-gray-300" />
                            </div>

                            {/* Greenhouse Layout - หลัก */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border-0 print:bg-white print:p-0">
                                <h2 className="mb-3 text-lg font-bold text-green-400 print:hidden">
                                    🏠 แบบแปลนโรงเรือน (พร้อมระบบน้ำ)
                                </h2>
                                <div className="rounded-lg overflow-hidden bg-white print:h-96">
                                    <canvas
                                        ref={canvasRef}
                                        className="w-full h-auto object-contain border border-gray-300 print:w-full print:h-full print:border-2 print:border-gray-400"
                                        style={{ maxHeight: '500px', display: 'block' }}
                                    />
                                </div>
                                <div className="mt-2 text-xs text-gray-400 text-center print:hidden">
                                    แบบแปลนโรงเรือนพร้อมระบบการให้น้ำและอุปกรณ์ทั้งหมด (อยู่ตรงกลาง)
                                </div>
                            </div>

                            {/* Print Notes สำหรับหน้าที่ 2 */}
                            <div className="hidden print:block print:mt-8">
                                <div className="border border-gray-300 p-4 bg-gray-50">
                                    <h3 className="text-sm font-bold text-black mb-3">📝 หมายเหตุการใช้งาน</h3>
                                    <div className="text-xs text-gray-700 space-y-1">
                                        <p>• แบบแปลนนี้แสดงตำแหน่งของโครงสร้างโรงเรือนและระบบการให้น้ำทั้งหมด</p>
                                        <p>• สีน้ำเงิน: ท่อเมนและท่อย่อย | สีเขียว: พื้นที่แปลงปลูก | สีน้ำตาล: โครงสร้างโรงเรือน</p>
                                        <p>• สัญลักษณ์ต่างๆ แสดงตำแหน่งอุปกรณ์การให้น้ำ เช่น ปั๊ม วาล์ว สปริงเกลอร์</p>
                                        <p>• ขนาดและตำแหน่งอาจต้องปรับตามสภาพพื้นที่จริง</p>
                                    </div>
                                </div>
                            </div>

                            {/* Growing Information - สำหรับหน้าที่ 2 ในการพิมพ์ */}
                            <div className="hidden print:block print:mt-6">
                                <div className="border border-gray-300 p-4 bg-white">
                                    <h3 className="text-sm font-bold text-black mb-3">🌱 ข้อมูลการปลูก</h3>
                                    <div className="space-y-2">
                                        {summaryData?.selectedCrops?.map((crop, index) => (
                                            <div key={index} className="flex items-center justify-between border-b border-gray-200 pb-1">
                                                <span className="text-sm text-gray-700">🌿 {crop}</span>
                                                <span className="text-xs text-gray-500">สภาพแวดล้อมควบคุม</span>
                                            </div>
                                        )) || <p className="text-sm text-gray-500">ยังไม่ได้เลือกพืช</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Growing Information - แสดงในหน้าจอปกติ */}
                            <div className="rounded-lg bg-gray-800 p-4 print:hidden">
                                <h2 className="mb-3 text-lg font-bold text-yellow-400">
                                    🌱 ข้อมูลการปลูก
                                </h2>
                                <div className="space-y-2">
                                    {summaryData?.selectedCrops?.map((crop, index) => (
                                        <div
                                            key={index}
                                            className="rounded-lg bg-gray-700 p-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-lg">
                                                        🌿
                                                    </span>
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-white">
                                                            {crop}
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-400">
                                                        สภาพแวดล้อมควบคุม
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!summaryData?.selectedCrops || summaryData.selectedCrops.length === 0) && (
                                        <div className="rounded-lg bg-gray-700 p-2 text-center">
                                            <span className="text-sm text-gray-400">
                                                ยังไม่ได้เลือกพืช
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* System Specifications - แสดงในหน้าจอปกติ */}
                            <div className="rounded-lg bg-gray-800 p-4 print:hidden">
                                <h2 className="mb-3 text-lg font-bold text-orange-400">
                                    🔧 สรุปรายละเอียดระบบ
                                </h2>
                                <div className="space-y-2">
                                    <div className="rounded-lg bg-gray-700 p-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400">
                                                โครงสร้างโรงเรือน
                                            </span>
                                            <span className="text-sm font-bold text-blue-400">
                                                {summaryData?.shapes?.filter(s => s.type === 'greenhouse').length || 0} หลัง
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400">
                                                จำนวนแปลงปลูก
                                            </span>
                                            <span className="text-sm font-bold text-green-400">
                                                {metrics.plotCount} แปลง
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400">
                                                อุปกรณ์ทั้งหมด
                                            </span>
                                            <span className="text-sm font-bold text-yellow-400">
                                                {Object.values(irrigationMetrics).reduce((sum, count) => sum + count, 0)} ชิ้น
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer สำหรับหน้าที่ 2 */}
                            <div className="hidden print:block print:mt-8 print:text-center">
                                <p className="text-xs text-gray-500">เอกสารนี้สร้างโดยระบบวางแผนโรงเรือนอัตโนมัติ - หน้า 2/2</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer สำหรับหน้าที่ 1 */}
            <div className="hidden print:block print:mt-8 print:text-center print:page-break-after-avoid">
                <p className="text-xs text-gray-500">เอกสารนี้สร้างโดยระบบวางแผนโรงเรือนอัตโนมัติ - หน้า 1/2</p>
            </div>
        </div>
    );
}