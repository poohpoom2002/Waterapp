import { Head } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { greenhouseCrops, getCropByValue } from '../components/Greenhouse/CropData';

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
    type:
        | 'main-pipe'
        | 'sub-pipe'
        | 'pump'
        | 'solenoid-valve'
        | 'ball-valve'
        | 'sprinkler'
        | 'drip-line';
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

    // Image cache for component icons
    const [componentImages, setComponentImages] = useState<{ [key: string]: HTMLImageElement }>({});

    // Load component images
    useEffect(() => {
        const imageConfigs = {
            pump: '/generateTree/wtpump.png',
            'solenoid-valve': '/generateTree/solv.png',
            'ball-valve': '/generateTree/ballv.png',
        };

        const loadImages = async () => {
            const images: { [key: string]: HTMLImageElement } = {};

            for (const [type, src] of Object.entries(imageConfigs)) {
                try {
                    const img = new Image();
                    img.src = src;
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
                    images[type] = img;
                } catch (error) {
                    console.warn(`Failed to load image for ${type}:`, error);
                }
            }

            setComponentImages(images);
        };

        loadImages().catch(console.error);
    }, []);

    const handleEditProject = () => {
        if (summaryData) {
            // บันทึกข้อมูลใน localStorage ก่อนย้อนกลับ รวมทั้ง irrigationElements
            const dataToSave = {
                ...summaryData,
                updatedAt: new Date().toISOString(),
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
            // เพิ่ม flag เพื่อบอกว่าต้องโหลด irrigation elements
            queryParams.set('loadIrrigation', 'true');

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
        console.log('=== useEffect START ===');
        // Get data from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const crops = urlParams.get('crops');
        const method = urlParams.get('method');
        const shapesParam = urlParams.get('shapes');
        const irrigationParam = urlParams.get('irrigation');

        console.log('URL Parameters:', { crops, method, shapesParam, irrigationParam });

        // Try to get complete data from localStorage
        const savedData = localStorage.getItem('greenhousePlanningData');
        console.log('Raw localStorage data:', savedData);

        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                console.log('Summary: Loaded data from localStorage:', parsedData);
                console.log('Summary: Irrigation elements:', parsedData.irrigationElements);
                console.log(
                    'Summary: Irrigation elements length:',
                    parsedData.irrigationElements?.length || 'undefined'
                );
                console.log('Summary: Keys in parsedData:', Object.keys(parsedData));

                // Check if irrigationElements exists and is an array
                if (parsedData.irrigationElements) {
                    console.log(
                        'irrigationElements is array:',
                        Array.isArray(parsedData.irrigationElements)
                    );
                    console.log('irrigationElements type:', typeof parsedData.irrigationElements);
                } else {
                    console.log('irrigationElements is missing or falsy');
                }

                setSummaryData(parsedData);
            } catch (error) {
                console.error('Error parsing saved data:', error);

                // Fallback to URL parameters
                if (crops || shapesParam) {
                    console.log('Falling back to URL parameters');
                    const newData: GreenhouseSummaryData = {
                        selectedCrops: crops ? crops.split(',') : [],
                        planningMethod: (method as 'draw' | 'import') || 'draw',
                        shapes: shapesParam ? JSON.parse(decodeURIComponent(shapesParam)) : [],
                        irrigationMethod: (irrigationParam as any) || 'mini-sprinkler',
                        irrigationElements: [], // Initialize empty array for irrigation elements
                        createdAt: new Date().toISOString(),
                    };
                    console.log('Created fallback data:', newData);
                    setSummaryData(newData);
                }
            }
        } else if (crops || shapesParam) {
            console.log('No localStorage data, creating from URL parameters');
            // Create new data from URL parameters
            const newData: GreenhouseSummaryData = {
                selectedCrops: crops ? crops.split(',') : [],
                planningMethod: (method as 'draw' | 'import') || 'draw',
                shapes: shapesParam ? JSON.parse(decodeURIComponent(shapesParam)) : [],
                irrigationMethod: (irrigationParam as any) || 'mini-sprinkler',
                irrigationElements: [], // Initialize empty array for irrigation elements
                createdAt: new Date().toISOString(),
            };
            console.log('Created new data from URL:', newData);
            setSummaryData(newData);
        } else {
            console.log('No data source available');
        }
        console.log('=== useEffect END ===');
    }, []);

    // Helper function to check if a point is inside a polygon (Ray casting algorithm)
    const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
        if (polygon.length < 3) return false;

        let isInside = false;
        let j = polygon.length - 1;

        for (let i = 0; i < polygon.length; i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;

            if (
                yi > point.y !== yj > point.y &&
                point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
            ) {
                isInside = !isInside;
            }
            j = i;
        }

        return isInside;
    };

    // Helper function to calculate distance between two points
    const distanceBetweenPoints = (p1: Point, p2: Point): number => {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    };

    // Helper function to find closest point on line segment
    const closestPointOnLineSegment = (
        point: Point,
        lineStart: Point,
        lineEnd: Point
    ): { point: Point; distance: number; t: number } => {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        let t = 0;
        if (lenSq !== 0) {
            t = Math.max(0, Math.min(1, dot / lenSq));
        }

        const closestPoint = {
            x: lineStart.x + t * C,
            y: lineStart.y + t * D,
        };

        const distance = distanceBetweenPoints(point, closestPoint);

        return { point: closestPoint, distance, t };
    };

    // Helper function to get crop icon based on crop name using CropData
    const getCropIcon = (cropType: string): string => {
        // หากเป็น "ยังไม่ได้เลือกพืช" ให้ใช้ไอคอนเริ่มต้น
        if (cropType === 'ยังไม่ได้เลือกพืช') {
            return '🌱';
        }

        // ค้นหาจาก value ก่อน
        let crop = getCropByValue(cropType);

        // หากไม่พบ ให้ค้นหาจากชื่อไทย
        if (!crop) {
            crop = greenhouseCrops.find((c) => c.name === cropType);
        }

        // หากยังไม่พบ ให้ค้นหาจากชื่ออังกฤษ
        if (!crop) {
            crop = greenhouseCrops.find((c) => c.nameEn.toLowerCase() === cropType.toLowerCase());
        }

        // หากยังไม่พบ ให้ค้นหาแบบ partial match
        if (!crop) {
            const lowerCropType = cropType.toLowerCase();
            crop = greenhouseCrops.find(
                (c) =>
                    c.name.toLowerCase().includes(lowerCropType) ||
                    c.nameEn.toLowerCase().includes(lowerCropType) ||
                    lowerCropType.includes(c.name.toLowerCase()) ||
                    lowerCropType.includes(c.nameEn.toLowerCase())
            );
        }

        // คืนไอคอนหากพบ หรือไอคอนเริ่มต้นหากไม่พบ
        return crop ? crop.icon : '🌿';
    };

    // Calculate cumulative pipe lengths for each plot (Enhanced version)
    const calculatePipeInPlots = () => {
        console.log('=== calculatePipeInPlots START ===');
        console.log('summaryData:', summaryData);
        console.log('summaryData?.irrigationElements:', summaryData?.irrigationElements);
        console.log('irrigationElements length:', summaryData?.irrigationElements?.length);

        if (!summaryData?.shapes || !summaryData?.irrigationElements) {
            console.log('Missing data - shapes or irrigationElements');
            return [];
        }

        const plots = summaryData.shapes.filter((s) => s.type === 'plot');
        const elements = summaryData.irrigationElements;

        // Sort plots by position (top to bottom, then left to right)
        const sortedPlots = plots
            .map((plot, originalIndex) => ({
                ...plot,
                originalIndex,
                // Calculate plot center for sorting
                centerY: plot.points.reduce((sum, p) => sum + p.y, 0) / plot.points.length,
                centerX: plot.points.reduce((sum, p) => sum + p.x, 0) / plot.points.length,
            }))
            .sort((a, b) => {
                // Sort by Y first (top to bottom), then by X (left to right)
                const yDiff = a.centerY - b.centerY;
                if (Math.abs(yDiff) > 50) {
                    // If Y difference is significant
                    return yDiff;
                }
                return a.centerX - b.centerX; // Otherwise sort by X
            });

        return sortedPlots.map((plot, sortedIndex) => {
            const plotPipeData = {
                plotName: plot.name || `แปลงปลูกที่ ${sortedIndex + 1}`,
                cropType:
                    plot.cropType ||
                    (summaryData.selectedCrops && summaryData.selectedCrops[plot.originalIndex]) ||
                    'ยังไม่ได้เลือกพืช',
                maxMainPipeLength: 0,
                maxSubPipeLength: 0,
                maxTotalPipeLength: 0,
                totalMainPipeLength: 0,
                totalSubPipeLength: 0,
                totalPipeLength: 0,
                hasPipes: false,
            };

            // Find main pipes and sub pipes
            const mainPipes = elements.filter((e) => e.type === 'main-pipe');
            const subPipes = elements.filter((e) => e.type === 'sub-pipe');

            if (mainPipes.length === 0) return plotPipeData;

            let maxMainDistanceForThisPlot = 0;

            // For each main pipe, find sub pipes that connect to it and serve this plot
            mainPipes.forEach((mainPipe) => {
                if (mainPipe.points.length < 2) return;

                // Create cumulative distance array for this main pipe
                const cumulativeDistances = [0];
                let totalDistance = 0;

                for (let i = 1; i < mainPipe.points.length; i++) {
                    const segmentLength = distanceBetweenPoints(
                        mainPipe.points[i - 1],
                        mainPipe.points[i]
                    );
                    totalDistance += segmentLength;
                    cumulativeDistances.push(totalDistance);
                }

                // Find sub pipes that connect to this main pipe and serve this plot
                subPipes.forEach((subPipe) => {
                    if (subPipe.points.length < 1) return;

                    // Check if this sub pipe serves this plot (any point in plot)
                    const servesThisPlot = subPipe.points.some((point) =>
                        isPointInPolygon(point, plot.points)
                    );

                    if (!servesThisPlot) return;

                    const subPipeStart = subPipe.points[0];

                    // Find the closest connection point on the main pipe
                    let closestDistance = Infinity;
                    let connectionCumulativeDistance = 0;
                    let connectionFound = false;

                    for (let i = 0; i < mainPipe.points.length - 1; i++) {
                        const result = closestPointOnLineSegment(
                            subPipeStart,
                            mainPipe.points[i],
                            mainPipe.points[i + 1]
                        );

                        if (result.distance < closestDistance) {
                            closestDistance = result.distance;
                            // Calculate cumulative distance to this connection point
                            connectionCumulativeDistance =
                                cumulativeDistances[i] +
                                result.t *
                                    distanceBetweenPoints(
                                        mainPipe.points[i],
                                        mainPipe.points[i + 1]
                                    );
                            connectionFound = true;
                        }
                    }

                    // If connection is found within reasonable tolerance
                    if (connectionFound && closestDistance < 50) {
                        // 50 pixels tolerance
                        // Convert to meters and update distance for this plot
                        const connectionDistanceInMeters = connectionCumulativeDistance / 25;
                        maxMainDistanceForThisPlot = Math.max(
                            maxMainDistanceForThisPlot,
                            connectionDistanceInMeters
                        );
                        plotPipeData.hasPipes = true;
                    }
                });
            });

            // Set the main pipe lengths (both max and total should be the same for cumulative calculation)
            plotPipeData.maxMainPipeLength = maxMainDistanceForThisPlot;
            plotPipeData.totalMainPipeLength = maxMainDistanceForThisPlot;

            // Calculate sub pipe lengths in this plot
            let maxSubPipeLength = 0;
            let totalSubLengthInPlot = 0;

            subPipes.forEach((subPipe) => {
                let subPipeLengthInPlot = 0;
                let hasSegmentInPlot = false;

                for (let i = 0; i < subPipe.points.length - 1; i++) {
                    const p1 = subPipe.points[i];
                    const p2 = subPipe.points[i + 1];

                    // Check if this segment is in the plot
                    const midPoint = {
                        x: (p1.x + p2.x) / 2,
                        y: (p1.y + p2.y) / 2,
                    };

                    if (
                        isPointInPolygon(p1, plot.points) ||
                        isPointInPolygon(p2, plot.points) ||
                        isPointInPolygon(midPoint, plot.points)
                    ) {
                        const segmentLength = distanceBetweenPoints(p1, p2) / 25; // Convert to meters
                        subPipeLengthInPlot += segmentLength;
                        hasSegmentInPlot = true;
                    }
                }

                if (hasSegmentInPlot) {
                    totalSubLengthInPlot += subPipeLengthInPlot;
                    maxSubPipeLength = Math.max(maxSubPipeLength, subPipeLengthInPlot);
                    plotPipeData.hasPipes = true;
                }
            });

            // Set final values
            plotPipeData.maxSubPipeLength = Math.round(maxSubPipeLength * 100) / 100;
            plotPipeData.maxTotalPipeLength =
                Math.round((plotPipeData.maxMainPipeLength + maxSubPipeLength) * 100) / 100;
            plotPipeData.totalSubPipeLength = Math.round(totalSubLengthInPlot * 100) / 100;
            plotPipeData.totalPipeLength =
                Math.round((plotPipeData.totalMainPipeLength + totalSubLengthInPlot) * 100) / 100;
            plotPipeData.maxMainPipeLength = Math.round(plotPipeData.maxMainPipeLength * 100) / 100;
            plotPipeData.totalMainPipeLength =
                Math.round(plotPipeData.totalMainPipeLength * 100) / 100;

            // Debug logging
            console.log(`=== ${plotPipeData.plotName} ===`);
            console.log(`ความยาวท่อเมนสูงสุด: ${plotPipeData.maxMainPipeLength} ม.`);
            console.log(`ความยาวท่อเมนทั้งหมด: ${plotPipeData.totalMainPipeLength} ม.`);
            console.log(`ความยาวท่อย่อยสูงสุด: ${plotPipeData.maxSubPipeLength} ม.`);
            console.log(`ความยาวท่อย่อยทั้งหมด: ${plotPipeData.totalSubPipeLength} ม.`);
            console.log(`มีระบบท่อ: ${plotPipeData.hasPipes}`);
            console.log(`พืชที่ปลูก: ${plotPipeData.cropType}`);
            console.log('---');

            return plotPipeData;
        });
    };

    const plotPipeData = calculatePipeInPlots();
    console.log('=== plotPipeData RESULT ===');
    console.log('plotPipeData:', plotPipeData);

    // Calculate metrics from shapes data
    const calculateMetrics = () => {
        if (!summaryData?.shapes)
            return {
                shapeTypeCount: 0,
                greenhouseArea: 0,
                plotArea: 0,
                plotCount: 0,
                waterSourceCount: 0,
                walkwayArea: 0,
            };

        const shapes = summaryData.shapes;
        const greenhouses = shapes.filter((s) => s.type === 'greenhouse');
        const plots = shapes.filter((s) => s.type === 'plot');
        const walkways = shapes.filter((s) => s.type === 'walkway');
        const waterSources = shapes.filter((s) => s.type === 'water-source');

        // Get unique shape types
        const shapeTypes = new Set(shapes.map((s) => s.type));
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

        const greenhouseArea = greenhouses.reduce(
            (sum, gh) => sum + calculatePolygonArea(gh.points),
            0
        );
        const plotArea = plots.reduce((sum, plot) => sum + calculatePolygonArea(plot.points), 0);
        const walkwayArea = walkways.reduce(
            (sum, walkway) => sum + calculatePolygonArea(walkway.points),
            0
        );

        return {
            shapeTypeCount,
            greenhouseArea: Math.round(greenhouseArea * 100) / 100,
            plotArea: Math.round(plotArea * 100) / 100,
            plotCount: plots.length,
            waterSourceCount: waterSources.length,
            walkwayArea: Math.round(walkwayArea * 100) / 100,
        };
    };

    const metrics = calculateMetrics();

    // Enhanced Calculate irrigation equipment from irrigationElements
    const calculateIrrigationMetrics = () => {
        console.log('=== calculateIrrigationMetrics START ===');
        console.log('summaryData in calculateIrrigationMetrics:', summaryData);
        console.log(
            'summaryData?.irrigationElements in calculateIrrigationMetrics:',
            summaryData?.irrigationElements
        );
        console.log('irrigationElements exists?', !!summaryData?.irrigationElements);
        console.log('irrigationElements is array?', Array.isArray(summaryData?.irrigationElements));
        console.log('irrigationElements length:', summaryData?.irrigationElements?.length);

        if (!summaryData?.irrigationElements || summaryData.irrigationElements.length === 0) {
            console.log('Summary: No irrigation elements found or empty array');
            console.log('Reason: irrigationElements =', summaryData?.irrigationElements);
            return {
                maxMainPipeLength: 0,
                maxSubPipeLength: 0,
                maxTotalPipeLength: 0,
                totalMainPipeLength: 0,
                totalSubPipeLength: 0,
                totalPipeLength: 0,
                pumps: 0,
                solenoidValves: 0,
                ballValves: 0,
                sprinklers: 0,
                dripLines: 0,
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
                const segmentLength = Math.sqrt(
                    Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
                );
                totalLength += segmentLength;
            }
            // Convert from pixels to meters (25 pixels = 1 meter)
            return totalLength / 25;
        };

        // Calculate for main pipes
        const mainPipes = elements.filter((e) => e.type === 'main-pipe');
        let maxMainPipeLength = 0;
        let totalMainPipeLength = 0;
        if (mainPipes.length > 0) {
            const mainPipeLengths = mainPipes.map((pipe) => calculatePipeLength(pipe.points));
            maxMainPipeLength = Math.max(...mainPipeLengths);
            totalMainPipeLength = mainPipeLengths.reduce((sum, length) => sum + length, 0);
        }

        // Calculate for sub pipes
        const subPipes = elements.filter((e) => e.type === 'sub-pipe');
        let maxSubPipeLength = 0;
        let totalSubPipeLength = 0;
        if (subPipes.length > 0) {
            const subPipeLengths = subPipes.map((pipe) => calculatePipeLength(pipe.points));
            maxSubPipeLength = Math.max(...subPipeLengths);
            totalSubPipeLength = subPipeLengths.reduce((sum, length) => sum + length, 0);
        }

        // Calculate combined metrics
        const maxTotalPipeLength = maxMainPipeLength + maxSubPipeLength;
        const totalPipeLength = totalMainPipeLength + totalSubPipeLength;

        return {
            maxMainPipeLength: Math.round(maxMainPipeLength * 100) / 100,
            maxSubPipeLength: Math.round(maxSubPipeLength * 100) / 100,
            maxTotalPipeLength: Math.round(maxTotalPipeLength * 100) / 100,
            totalMainPipeLength: Math.round(totalMainPipeLength * 100) / 100,
            totalSubPipeLength: Math.round(totalSubPipeLength * 100) / 100,
            totalPipeLength: Math.round(totalPipeLength * 100) / 100,
            pumps: elements.filter((e) => e.type === 'pump').length,
            solenoidValves: elements.filter((e) => e.type === 'solenoid-valve').length,
            ballValves: elements.filter((e) => e.type === 'ball-valve').length,
            sprinklers: elements.filter((e) => e.type === 'sprinkler').length,
            dripLines: elements.filter((e) => e.type === 'drip-line').length,
        };
    };

    const irrigationMetrics = calculateIrrigationMetrics();

    // Helper function to draw component shapes (irrigation equipment)
    const drawComponentShape = (
        ctx: CanvasRenderingContext2D,
        type: string,
        point: Point,
        color: string,
        scale: number = 1
    ) => {
        // Try to use image first
        if (componentImages[type]) {
            const img = componentImages[type];

            // Different sizes for different components
            let imgSize, containerSize;
            if (type === 'pump') {
                imgSize = 18 * scale;
                containerSize = 24 * scale;
            } else {
                // valves
                imgSize = 12 * scale;
                containerSize = 18 * scale;
            }

            ctx.save();

            // Draw circular container background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 1.5 * scale;
            ctx.beginPath();
            ctx.arc(point.x, point.y, containerSize / 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();

            // Draw the component image
            ctx.drawImage(img, point.x - imgSize / 2, point.y - imgSize / 2, imgSize, imgSize);
            ctx.restore();
            return;
        }

        // Fallback to original drawing if image not loaded
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
                ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
                ctx.strokeRect(point.x - size / 2, point.y - size / 2, size, size);

                // Draw solenoid lines
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1 * scale;
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
    const drawDripPoints = (
        ctx: CanvasRenderingContext2D,
        element: IrrigationElement,
        scale: number = 1
    ) => {
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
                    y: p1.y + direction.y * currentDistance,
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
    const drawIrrigationElements = (
        ctx: CanvasRenderingContext2D,
        elements: IrrigationElement[],
        scale: number = 1,
        offsetX: number = 0,
        offsetY: number = 0
    ) => {
        elements.forEach((element) => {
            ctx.strokeStyle = element.color;
            ctx.lineWidth = (element.width || 2) * scale;
            ctx.setLineDash([]);

            if (element.type === 'main-pipe' || element.type === 'sub-pipe') {
                if (element.points.length >= 2) {
                    ctx.beginPath();
                    ctx.moveTo(
                        element.points[0].x * scale + offsetX,
                        element.points[0].y * scale + offsetY
                    );

                    for (let i = 1; i < element.points.length; i++) {
                        ctx.lineTo(
                            element.points[i].x * scale + offsetX,
                            element.points[i].y * scale + offsetY
                        );
                    }

                    ctx.stroke();
                }
            } else if (element.type === 'drip-line') {
                if (element.points.length >= 2) {
                    // Draw dashed line for drip line
                    ctx.setLineDash([5 * scale, 3 * scale]);
                    ctx.beginPath();
                    ctx.moveTo(
                        element.points[0].x * scale + offsetX,
                        element.points[0].y * scale + offsetY
                    );

                    for (let i = 1; i < element.points.length; i++) {
                        ctx.lineTo(
                            element.points[i].x * scale + offsetX,
                            element.points[i].y * scale + offsetY
                        );
                    }

                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Draw drip points
                    const scaledElement = {
                        ...element,
                        points: element.points.map((p) => ({
                            x: p.x * scale + offsetX,
                            y: p.y * scale + offsetY,
                        })),
                    };
                    drawDripPoints(ctx, scaledElement, scale);
                }
            } else if (element.type === 'sprinkler') {
                if (element.points.length >= 1) {
                    const point = {
                        x: element.points[0].x * scale + offsetX,
                        y: element.points[0].y * scale + offsetY,
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
                        y: element.points[0].y * scale + offsetY,
                    };
                    drawComponentShape(ctx, element.type, point, element.color, scale);
                }
            }
        });
    };

    // Simple print function that shows browser print dialog
    const handlePrint = () => {
        // Simply trigger the browser's print dialog
        window.print();
    };

    // ปิดการใช้งานปุ่มบันทึกข้อมูลชั่วคราว
    const handleSaveData = () => {
        alert('ฟีเจอร์การบันทึกข้อมูลยังอยู่ระหว่างการพัฒนา กรุณารอการอัพเดทในเวอร์ชันถัดไป');
    };

    // Update canvas when data changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && summaryData) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = 600;
                canvas.height = 400;

                // Clear canvas with black background
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Calculate bounds of all elements
                let minX = Infinity,
                    minY = Infinity,
                    maxX = -Infinity,
                    maxY = -Infinity;

                // Find bounds from shapes
                if (summaryData.shapes && summaryData.shapes.length > 0) {
                    summaryData.shapes.forEach((shape) => {
                        shape.points.forEach((point) => {
                            minX = Math.min(minX, point.x);
                            minY = Math.min(minY, point.y);
                            maxX = Math.max(maxX, point.x);
                            maxY = Math.max(maxY, point.y);
                        });
                    });
                }

                // Find bounds from irrigation elements
                if (summaryData.irrigationElements && summaryData.irrigationElements.length > 0) {
                    summaryData.irrigationElements.forEach((element) => {
                        element.points.forEach((point) => {
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
                    summaryData.shapes.forEach((shape) => {
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
                                    ctx.fillText(
                                        `${shape.measurement.distance}${shape.measurement.unit}`,
                                        midX,
                                        midY
                                    );
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
                                ctx.moveTo(
                                    shape.points[0].x * scale + offsetX,
                                    shape.points[0].y * scale + offsetY
                                );

                                for (let i = 1; i < shape.points.length; i++) {
                                    ctx.lineTo(
                                        shape.points[i].x * scale + offsetX,
                                        shape.points[i].y * scale + offsetY
                                    );
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
                        ctx.moveTo(
                            shape.points[0].x * scale + offsetX,
                            shape.points[0].y * scale + offsetY
                        );

                        for (let i = 1; i < shape.points.length; i++) {
                            ctx.lineTo(
                                shape.points[i].x * scale + offsetX,
                                shape.points[i].y * scale + offsetY
                            );
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
                    drawIrrigationElements(
                        ctx,
                        summaryData.irrigationElements,
                        scale,
                        offsetX,
                        offsetY
                    );
                }
            }
        }
    }, [summaryData, componentImages]);

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
                                className="mb-4 inline-flex cursor-pointer items-center border-none bg-transparent text-blue-400 hover:text-blue-300"
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
                                It looks like you haven't completed a greenhouse planning project
                                yet, or the data has been cleared.
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
                                    onClick={() => (window.location.href = '/greenhouse-crop')}
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
            <div className="border-b border-gray-700 bg-gray-800 print:hidden print:border-gray-300 print:bg-white">
                <div className="container mx-auto px-4 py-4">
                    <div className="mx-auto max-w-7xl">
                        {/* Back Navigation */}
                        <button
                            onClick={handleBackNavigation}
                            className="mb-2 inline-flex cursor-pointer items-center border-none bg-transparent text-blue-400 hover:text-blue-300"
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
                        <h1 className="mb-1 text-3xl font-bold">🏠 สรุปการวางแผนโรงเรือน</h1>
                        <p className="mb-4 text-gray-400">
                            ภาพรวมการออกแบบโรงเรือนและระบบการให้น้ำ
                        </p>
                    </div>
                </div>
            </div>

            {/* Print Header - หน้าที่ 1 */}
            <div className="hidden print:mb-6 print:block">
                <h1 className="text-2xl font-bold text-black">🏠 สรุปการวางแผนโรงเรือน</h1>
                <p className="text-gray-600">ภาพรวมการออกแบบโรงเรือนและระบบการให้น้ำ</p>
                <hr className="my-2 border-gray-300" />
                <p className="text-sm text-gray-500">
                    วันที่: {new Date().toLocaleDateString('th-TH')}
                </p>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-4 print:px-0 print:py-0">
                <div className="mx-auto max-w-7xl">
                    {/* Single Column Layout for Print */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-1 print:gap-4">
                        {/* Project Overview & Equipment Info - หน้าที่ 1 สำหรับการพิมพ์ */}
                        <div className="print:page-break-after-avoid space-y-4 print:space-y-4">
                            {/* Project Overview */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-4">
                                <h2 className="mb-3 text-lg font-bold text-green-400 print:text-lg print:text-black">
                                    🏠 ภาพรวมโครงการ
                                </h2>
                                <div className="grid grid-cols-3 gap-2 print:grid-cols-3 print:gap-3">
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="text-lg font-bold text-blue-400 print:text-lg print:text-black">
                                            {metrics.shapeTypeCount}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-sm print:text-gray-600">
                                            ชนิดพื้นที่
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="text-lg font-bold text-green-400 print:text-lg print:text-black">
                                            {metrics.greenhouseArea.toFixed(1)}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-sm print:text-gray-600">
                                            พื้นที่โรงเรือน (ตร.ม.)
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="text-lg font-bold text-purple-400 print:text-lg print:text-black">
                                            {metrics.plotArea.toFixed(1)}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-sm print:text-gray-600">
                                            พื้นที่แปลงปลูก (ตร.ม.)
                                        </div>
                                    </div>
                                </div>

                                {/* Additional metrics row */}
                                <div className="mt-3 grid grid-cols-3 gap-2 print:mt-4 print:grid-cols-3 print:gap-3">
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="text-lg font-bold text-orange-400 print:text-lg print:text-black">
                                            {metrics.plotCount}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-sm print:text-gray-600">
                                            จำนวนแปลงปลูก
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="text-lg font-bold text-cyan-400 print:text-lg print:text-black">
                                            {metrics.waterSourceCount}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-sm print:text-gray-600">
                                            จำนวนแหล่งน้ำ
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="text-lg font-bold text-pink-400 print:text-lg print:text-black">
                                            {metrics.walkwayArea.toFixed(1)}
                                        </div>
                                        <div className="text-xs text-gray-400 print:text-sm print:text-gray-600">
                                            พื้นที่ทางเดิน (ตร.ม.)
                                        </div>
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
                                                {summaryData?.planningMethod === 'draw'
                                                    ? '✏️ วาดเอง'
                                                    : '📁 นำเข้าไฟล์'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400 print:text-sm print:text-gray-600">
                                                ระบบการให้น้ำ
                                            </span>
                                            <span className="text-sm font-bold text-cyan-400 print:text-sm print:text-black">
                                                {summaryData?.irrigationMethod === 'mini-sprinkler'
                                                    ? '💧 มินิสปริงเกลอร์'
                                                    : summaryData?.irrigationMethod === 'drip'
                                                      ? '💧🌱 น้ำหยด'
                                                      : '🔄 แบบผสม'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-700 p-2 print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400 print:text-sm print:text-gray-600">
                                                วันที่สร้าง
                                            </span>
                                            <span className="text-sm font-bold text-purple-400 print:text-sm print:text-black">
                                                {summaryData?.createdAt
                                                    ? new Date(
                                                          summaryData.createdAt
                                                      ).toLocaleDateString('th-TH')
                                                    : 'วันนี้'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Enhanced Equipment Summary */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border print:border-gray-300 print:bg-white print:p-4">
                                <h2 className="mb-3 text-lg font-bold text-purple-400 print:text-lg print:text-black">
                                    ⚙️ สรุปอุปกรณ์การให้น้ำ
                                </h2>

                                {/* Pipe System - Enhanced with 6 rows */}
                                <div className="mb-3">
                                    <h3 className="mb-2 text-sm font-semibold text-orange-400 print:text-sm print:text-black">
                                        🔵 ระบบท่อ
                                    </h3>
                                    {/* First row: Max pipe lengths */}
                                    <div className="mb-2 grid grid-cols-3 gap-1 print:gap-2">
                                        <div className="rounded bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                            <div className="text-sm font-bold text-blue-400 print:text-sm print:text-black">
                                                {irrigationMetrics.maxMainPipeLength.toFixed(1)} ม.
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">
                                                ท่อเมนสูงสุด
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                            <div className="text-sm font-bold text-green-400 print:text-sm print:text-black">
                                                {irrigationMetrics.maxSubPipeLength.toFixed(1)} ม.
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">
                                                ท่อย่อยสูงสุด
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                            <div className="text-sm font-bold text-purple-400 print:text-sm print:text-black">
                                                {irrigationMetrics.maxTotalPipeLength.toFixed(1)} ม.
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">
                                                ความยาวสูงสุดรวม
                                            </div>
                                        </div>
                                    </div>
                                    {/* Second row: Total pipe lengths */}
                                    <div className="grid grid-cols-3 gap-1 print:gap-2">
                                        <div className="rounded bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                            <div className="text-sm font-bold text-cyan-400 print:text-sm print:text-black">
                                                {irrigationMetrics.totalMainPipeLength.toFixed(1)}{' '}
                                                ม.
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">
                                                ท่อเมนทั้งหมด
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                            <div className="text-sm font-bold text-yellow-400 print:text-sm print:text-black">
                                                {irrigationMetrics.totalSubPipeLength.toFixed(1)} ม.
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">
                                                ท่อย่อยทั้งหมด
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-2 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                                            <div className="text-sm font-bold text-pink-400 print:text-sm print:text-black">
                                                {irrigationMetrics.totalPipeLength.toFixed(1)} ม.
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">
                                                ความยาวรวมทั้งหมด
                                            </div>
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
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">
                                                ปั๊ม
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-2">
                                            <div className="text-sm font-bold text-red-400 print:text-sm print:text-black">
                                                {irrigationMetrics.solenoidValves}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">
                                                โซลินอยด์วาล์ว
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-2">
                                            <div className="text-sm font-bold text-yellow-400 print:text-sm print:text-black">
                                                {irrigationMetrics.ballValves}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">
                                                บอลวาล์ว
                                            </div>
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
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">
                                                สปริงเกลอร์
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-1 text-center print:border print:border-gray-200 print:bg-gray-50 print:p-2">
                                            <div className="text-sm font-bold text-purple-400 print:text-sm print:text-black">
                                                {irrigationMetrics.dripLines}
                                            </div>
                                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600">
                                                สายน้ำหยด
                                            </div>
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
                                        className="cursor-not-allowed rounded-lg bg-gray-500 px-4 py-2 font-semibold text-white opacity-50"
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
                        <div className="print:page-break-before-always space-y-4 print:space-y-0">
                            {/* Print Header สำหรับหน้าที่ 2 */}
                            <div className="hidden print:mb-6 print:block">
                                <h1 className="text-xl font-bold text-black">
                                    📐 แบบแปลนโรงเรือนพร้อมระบบการให้น้ำ
                                </h1>
                                <p className="text-gray-600">
                                    รายละเอียดโครงสร้างโรงเรือนและการติดตั้งอุปกรณ์
                                </p>
                                <hr className="my-2 border-gray-300" />
                            </div>

                            {/* Greenhouse Layout - หลัก */}
                            <div className="rounded-lg bg-gray-800 p-4 print:border-0 print:bg-white print:p-0">
                                <h2 className="mb-3 text-lg font-bold text-green-400 print:hidden">
                                    🏠 แบบแปลนโรงเรือน (พร้อมระบบน้ำ)
                                </h2>
                                <div className="overflow-hidden rounded-lg bg-white print:h-96">
                                    <canvas
                                        ref={canvasRef}
                                        className="h-auto w-full border border-gray-300 object-contain print:h-full print:w-full print:border-2 print:border-gray-400"
                                        style={{ maxHeight: '500px', display: 'block' }}
                                    />
                                </div>
                                <div className="mt-2 text-center text-xs text-gray-400 print:hidden">
                                    แบบแปลนโรงเรือนพร้อมระบบการให้น้ำและอุปกรณ์ทั้งหมด (อยู่ตรงกลาง)
                                </div>
                            </div>

                            {/* Print Notes สำหรับหน้าที่ 2 */}
                            <div className="hidden print:mt-8 print:block">
                                <div className="border border-gray-300 bg-gray-50 p-4">
                                    <h3 className="mb-3 text-sm font-bold text-black">
                                        📝 หมายเหตุการใช้งาน
                                    </h3>
                                    <div className="space-y-1 text-xs text-gray-700">
                                        <p>
                                            •
                                            แบบแปลนนี้แสดงตำแหน่งของโครงสร้างโรงเรือนและระบบการให้น้ำทั้งหมด
                                        </p>
                                        <p>
                                            • สีน้ำเงิน: ท่อเมนและท่อย่อย | สีเขียว: พื้นที่แปลงปลูก
                                            | สีน้ำตาล: โครงสร้างโรงเรือน
                                        </p>
                                        <p>
                                            • สัญลักษณ์ต่างๆ แสดงตำแหน่งอุปกรณ์การให้น้ำ เช่น ปั๊ม
                                            วาล์ว สปริงเกลอร์
                                        </p>
                                        <p>• ขนาดและตำแหน่งอาจต้องปรับตามสภาพพื้นที่จริง</p>
                                        <p>
                                            • ความยาวท่อทั้งหมด:{' '}
                                            {irrigationMetrics.totalPipeLength.toFixed(1)} เมตร
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Growing Information - สำหรับหน้าที่ 2 ในการพิมพ์ */}
                            <div className="hidden print:mt-6 print:block">
                                <div className="border border-gray-300 bg-white p-4">
                                    <h3 className="mb-3 text-sm font-bold text-black">
                                        🌱 ข้อมูลการปลูก
                                    </h3>
                                    <div className="space-y-3">
                                        {plotPipeData.length > 0 ? (
                                            plotPipeData.map((plot, index) => (
                                                <div
                                                    key={index}
                                                    className="border-b border-gray-200 pb-3"
                                                >
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <span className="text-sm font-semibold text-gray-700">
                                                            {getCropIcon(plot.cropType)}{' '}
                                                            {plot.plotName}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            สภาพแวดล้อมควบคุม
                                                        </span>
                                                    </div>
                                                    <p className="mb-2 text-xs text-gray-600">
                                                        พืชที่ปลูก: {plot.cropType}
                                                    </p>

                                                    {plot.hasPipes ? (
                                                        <div className="space-y-2">
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <div className="border border-gray-200 bg-gray-50 p-2 text-center">
                                                                    <div className="text-xs font-bold text-black">
                                                                        {plot.maxMainPipeLength.toFixed(
                                                                            1
                                                                        )}{' '}
                                                                        ม.
                                                                    </div>
                                                                    <div className="text-xs text-gray-600">
                                                                        ท่อเมนสูงสุด
                                                                    </div>
                                                                </div>
                                                                <div className="border border-gray-200 bg-gray-50 p-2 text-center">
                                                                    <div className="text-xs font-bold text-black">
                                                                        {plot.maxSubPipeLength.toFixed(
                                                                            1
                                                                        )}{' '}
                                                                        ม.
                                                                    </div>
                                                                    <div className="text-xs text-gray-600">
                                                                        ท่อย่อยสูงสุด
                                                                    </div>
                                                                </div>
                                                                <div className="border border-gray-200 bg-gray-50 p-2 text-center">
                                                                    <div className="text-xs font-bold text-black">
                                                                        {plot.maxTotalPipeLength.toFixed(
                                                                            1
                                                                        )}{' '}
                                                                        ม.
                                                                    </div>
                                                                    <div className="text-xs text-gray-600">
                                                                        รวมสูงสุด
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <div className="border border-gray-200 bg-gray-50 p-2 text-center">
                                                                    <div className="text-xs font-bold text-black">
                                                                        {plot.totalMainPipeLength.toFixed(
                                                                            1
                                                                        )}{' '}
                                                                        ม.
                                                                    </div>
                                                                    <div className="text-xs text-gray-600">
                                                                        ท่อเมนทั้งหมด
                                                                    </div>
                                                                </div>
                                                                <div className="border border-gray-200 bg-gray-50 p-2 text-center">
                                                                    <div className="text-xs font-bold text-black">
                                                                        {plot.totalSubPipeLength.toFixed(
                                                                            1
                                                                        )}{' '}
                                                                        ม.
                                                                    </div>
                                                                    <div className="text-xs text-gray-600">
                                                                        ท่อย่อยทั้งหมด
                                                                    </div>
                                                                </div>
                                                                <div className="border border-gray-200 bg-gray-50 p-2 text-center">
                                                                    <div className="text-xs font-bold text-black">
                                                                        {plot.totalPipeLength.toFixed(
                                                                            1
                                                                        )}{' '}
                                                                        ม.
                                                                    </div>
                                                                    <div className="text-xs text-gray-600">
                                                                        รวมทั้งหมด
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="border border-gray-200 bg-gray-50 p-2 text-center">
                                                            <span className="text-xs text-gray-600">
                                                                ไม่มีระบบท่อในแปลงนี้
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <>
                                                {summaryData?.selectedCrops?.map((crop, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between border-b border-gray-200 pb-1"
                                                    >
                                                        <span className="text-sm text-gray-700">
                                                            {getCropIcon(crop)} {crop}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            สภาพแวดล้อมควบคุม
                                                        </span>
                                                    </div>
                                                )) || (
                                                    <p className="text-sm text-gray-500">
                                                        ยังไม่ได้เลือกพืช
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Growing Information - แสดงในหน้าจอปกติ */}
                            <div className="rounded-lg bg-gray-800 p-4 print:hidden">
                                <h2 className="mb-3 text-lg font-bold text-yellow-400">
                                    🌱 ข้อมูลการปลูก
                                </h2>
                                <div className="space-y-3">
                                    {plotPipeData.length > 0 ? (
                                        plotPipeData.map((plot, index) => (
                                            <div key={index} className="rounded-lg bg-gray-700 p-3">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-lg">
                                                            {getCropIcon(plot.cropType)}
                                                        </span>
                                                        <div>
                                                            <h3 className="text-sm font-semibold text-white">
                                                                {plot.plotName}
                                                            </h3>
                                                            <p className="text-xs text-gray-400">
                                                                พืชที่ปลูก: {plot.cropType}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-gray-400">
                                                            สภาพแวดล้อมควบคุม
                                                        </div>
                                                    </div>
                                                </div>

                                                {plot.hasPipes ? (
                                                    <div className="mt-2 space-y-2">
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="rounded bg-gray-600 p-2 text-center">
                                                                <div className="text-xs font-bold text-blue-400">
                                                                    {plot.maxMainPipeLength.toFixed(
                                                                        1
                                                                    )}{' '}
                                                                    ม.
                                                                </div>
                                                                <div className="text-xs text-gray-400">
                                                                    ท่อเมนสูงสุด
                                                                </div>
                                                            </div>
                                                            <div className="rounded bg-gray-600 p-2 text-center">
                                                                <div className="text-xs font-bold text-green-400">
                                                                    {plot.maxSubPipeLength.toFixed(
                                                                        1
                                                                    )}{' '}
                                                                    ม.
                                                                </div>
                                                                <div className="text-xs text-gray-400">
                                                                    ท่อย่อยสูงสุด
                                                                </div>
                                                            </div>
                                                            <div className="rounded bg-gray-600 p-2 text-center">
                                                                <div className="text-xs font-bold text-purple-400">
                                                                    {plot.maxTotalPipeLength.toFixed(
                                                                        1
                                                                    )}{' '}
                                                                    ม.
                                                                </div>
                                                                <div className="text-xs text-gray-400">
                                                                    รวมสูงสุด
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="rounded bg-gray-600 p-2 text-center">
                                                                <div className="text-xs font-bold text-cyan-400">
                                                                    {plot.totalMainPipeLength.toFixed(
                                                                        1
                                                                    )}{' '}
                                                                    ม.
                                                                </div>
                                                                <div className="text-xs text-gray-400">
                                                                    ท่อเมนทั้งหมด
                                                                </div>
                                                            </div>
                                                            <div className="rounded bg-gray-600 p-2 text-center">
                                                                <div className="text-xs font-bold text-yellow-400">
                                                                    {plot.totalSubPipeLength.toFixed(
                                                                        1
                                                                    )}{' '}
                                                                    ม.
                                                                </div>
                                                                <div className="text-xs text-gray-400">
                                                                    ท่อย่อยทั้งหมด
                                                                </div>
                                                            </div>
                                                            <div className="rounded bg-gray-600 p-2 text-center">
                                                                <div className="text-xs font-bold text-pink-400">
                                                                    {plot.totalPipeLength.toFixed(
                                                                        1
                                                                    )}{' '}
                                                                    ม.
                                                                </div>
                                                                <div className="text-xs text-gray-400">
                                                                    รวมทั้งหมด
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="mt-2 rounded bg-gray-600 p-2 text-center">
                                                        <span className="text-xs text-gray-400">
                                                            ไม่มีระบบท่อในแปลงนี้
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <>
                                            {summaryData?.selectedCrops?.map((crop, index) => (
                                                <div
                                                    key={index}
                                                    className="rounded-lg bg-gray-700 p-2"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-lg">
                                                                {getCropIcon(crop)}
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
                                            )) || (
                                                <div className="rounded-lg bg-gray-700 p-2 text-center">
                                                    <span className="text-sm text-gray-400">
                                                        ยังไม่ได้เลือกพืช
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Footer สำหรับหน้าที่ 2 */}
                            <div className="hidden print:mt-8 print:block print:text-center">
                                <p className="text-xs text-gray-500">
                                    เอกสารนี้สร้างโดยระบบวางแผนโรงเรือนอัตโนมัติ - หน้า 2/2
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer สำหรับหน้าที่ 1 */}
            <div className="print:page-break-after-avoid hidden print:mt-8 print:block print:text-center">
                <p className="text-xs text-gray-500">
                    เอกสารนี้สร้างโดยระบบวางแผนโรงเรือนอัตโนมัติ - หน้า 1/2
                </p>
            </div>
        </div>
    );
}
