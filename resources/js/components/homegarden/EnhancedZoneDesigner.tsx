// // resources/js/components/homegarden/EnhancedZoneDesigner.tsx
// import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
// import {
//     CanvasCoordinate,
//     GardenZone,
//     Sprinkler,
//     WaterSource,
//     Pipe,
//     ZONE_TYPES,
//     SPRINKLER_TYPES,
//     CANVAS_GRID_SIZE,
//     isPointInPolygon,
//     calculateDistance,
//     calculatePolygonArea,
//     formatArea,
//     formatDistance,
//     clipCircleToPolygon,
//     canvasToGPS,
// } from '../../utils/homeGardenData';

// // ===== ENHANCED ZONE DRAWING TYPES =====
// interface ZoneDrawingTool {
//     id: string;
//     name: string;
//     icon: string;
//     description: string;
//     type: 'freehand' | 'rectangle' | 'circle' | 'regular-polygon';
// }

// interface ZoneDrawingState {
//     isDrawing: boolean;
//     currentPoints: CanvasCoordinate[];
//     previewPoints: CanvasCoordinate[];
//     tool: string;
//     zoneType: string;
// }

// interface SnapPoint {
//     x: number;
//     y: number;
//     type: 'grid' | 'vertex' | 'center' | 'midpoint';
//     sourceId?: string;
// }

// interface EnhancedZoneDesignerProps {
//     gardenZones: GardenZone[];
//     sprinklers: Sprinkler[];
//     waterSource: WaterSource | null;
//     pipes: Pipe[];
//     selectedZoneType: string;
//     editMode: string;
//     manualSprinklerType: string;
//     manualSprinklerRadius: number;
//     selectedSprinkler: string | null;
//     selectedPipes: Set<string>;
//     selectedSprinklersForPipe: string[];
//     mainPipeDrawing: CanvasCoordinate[];
//     canvasData: any;
//     onZoneCreated: (coordinates: CanvasCoordinate[]) => void;
//     onSprinklerPlaced: (position: CanvasCoordinate) => void;
//     onWaterSourcePlaced: (position: CanvasCoordinate) => void;
//     onMainPipePoint: (point: CanvasCoordinate) => void;
//     onSprinklerDragged: (sprinklerId: string, newPos: CanvasCoordinate) => void;
//     onSprinklerClick: (sprinklerId: string) => void;
//     onSprinklerDelete: (sprinklerId: string) => void;
//     onWaterSourceDelete: () => void;
//     onPipeClick: (pipeId: string) => void;
//     hasMainArea: boolean;
//     // Enhanced callbacks
//     onEnhancedZoneCreated?: (coordinates: CanvasCoordinate[], zoneType: string, metadata?: any) => void;
// }

// const EnhancedZoneDesigner: React.FC<EnhancedZoneDesignerProps> = ({
//     gardenZones,
//     sprinklers,
//     waterSource,
//     pipes,
//     selectedZoneType,
//     editMode,
//     manualSprinklerType,
//     manualSprinklerRadius,
//     selectedSprinkler,
//     selectedPipes,
//     selectedSprinklersForPipe,
//     mainPipeDrawing,
//     canvasData,
//     onZoneCreated,
//     onSprinklerPlaced,
//     onWaterSourcePlaced,
//     onMainPipePoint,
//     onSprinklerDragged,
//     onSprinklerClick,
//     onSprinklerDelete,
//     onWaterSourceDelete,
//     onPipeClick,
//     hasMainArea,
//     onEnhancedZoneCreated,
// }) => {
//     const canvasRef = useRef<HTMLCanvasElement>(null);
//     const animationFrameRef = useRef<number>();

//     // ===== ENHANCED ZONE DRAWING STATES =====
//     const [enhancedMode, setEnhancedMode] = useState(false);
//     const [currentDrawingTool, setCurrentDrawingTool] = useState<string>('freehand');
//     const [drawingState, setDrawingState] = useState<ZoneDrawingState>({
//         isDrawing: false,
//         currentPoints: [],
//         previewPoints: [],
//         tool: 'freehand',
//         zoneType: selectedZoneType,
//     });

//     // Enhanced display and snap settings
//     const [showGrid, setShowGrid] = useState(true);
//     const [showRuler, setShowRuler] = useState(true);
//     const [showSprinklerRadius, setShowSprinklerRadius] = useState(true);
//     const [showMeasurements, setShowMeasurements] = useState(true);
//     const [snapToGrid, setSnapToGrid] = useState(true);
//     const [snapToVertex, setSnapToVertex] = useState(true);
//     const [snapDistance, setSnapDistance] = useState(15);
//     const [hoveredSnapPoint, setHoveredSnapPoint] = useState<SnapPoint | null>(null);

//     // Scale and measurement for enhanced precision
//     const [enhancedScale, setEnhancedScale] = useState(20);
//     const [isSettingScale, setIsSettingScale] = useState(false);
//     const [scalePoints, setScalePoints] = useState<CanvasCoordinate[]>([]);
//     const [showScaleDialog, setShowScaleDialog] = useState(false);
//     const [realDistance, setRealDistance] = useState<string>('');

//     // UI states
//     const [mousePos, setMousePos] = useState<CanvasCoordinate>({ x: 0, y: 0 });
//     const [hoveredItem, setHoveredItem] = useState<{ type: string; id: string } | null>(null);
//     const [draggedSprinkler, setDraggedSprinkler] = useState<string | null>(null);
//     const [needsRedraw, setNeedsRedraw] = useState(true);

//     // Original states for compatibility
//     const [currentPolygon, setCurrentPolygon] = useState<CanvasCoordinate[]>([]);
//     const [isDrawing, setIsDrawing] = useState(false);

//     // ===== ZONE DRAWING TOOLS CONFIGURATION =====
//     const zoneDrawingTools: ZoneDrawingTool[] = [
//         {
//             id: 'freehand',
//             name: 'วาดอิสระ',
//             icon: '✏️',
//             description: 'วาดโซนด้วยการคลิกทีละจุด (เหมือนเดิม)',
//             type: 'freehand'
//         },
//         {
//             id: 'rectangle',
//             name: 'สี่เหลี่ยม',
//             icon: '⬜',
//             description: 'วาดโซนสี่เหลี่ยมผืนผ้า (บ้าน, แปลงปลูก)',
//             type: 'rectangle'
//         },
//         {
//             id: 'circle',
//             name: 'วงกลม',
//             icon: '⭕',
//             description: 'วาดโซนทรงกลม (สนาม, บ่อน้ำ)',
//             type: 'circle'
//         },
//         {
//             id: 'regular-polygon',
//             name: 'รูปหลายเหลี่ยมสม่ำเสมอ',
//             icon: '🔶',
//             description: 'วาดโซนหลายเหลี่ยมสม่ำเสมอ (6, 8 เหลี่ยม)',
//             type: 'regular-polygon'
//         }
//     ];

//     // ===== UTILITY FUNCTIONS =====
//     const pixelsToMeters = useCallback((pixels: number) => pixels / enhancedScale, [enhancedScale]);
//     const metersToPixels = useCallback((meters: number) => meters * enhancedScale, [enhancedScale]);
    
//     const formatEnhancedDistance = useCallback((pixels: number) => {
//         const meters = pixelsToMeters(pixels);
//         if (meters >= 1) {
//             return `${meters.toFixed(2)} ม.`;
//         } else {
//             return `${(meters * 100).toFixed(1)} ซม.`;
//         }
//     }, [pixelsToMeters]);
    
//     const formatEnhancedArea = useCallback((pixels: number) => {
//         const sqMeters = pixels / (enhancedScale * enhancedScale);
//         if (sqMeters >= 1) {
//             return `${sqMeters.toFixed(2)} ตร.ม.`;
//         } else {
//             return `${(sqMeters * 10000).toFixed(0)} ตร.ซม.`;
//         }
//     }, [enhancedScale]);

//     // ===== SNAP FUNCTIONS =====
//     const getSnapPoints = useCallback((): SnapPoint[] => {
//         const snapPoints: SnapPoint[] = [];
        
//         if (snapToGrid && showGrid) {
//             for (let x = 0; x <= canvasData.width; x += CANVAS_GRID_SIZE) {
//                 for (let y = 0; y <= canvasData.height; y += CANVAS_GRID_SIZE) {
//                     snapPoints.push({ x, y, type: 'grid' });
//                 }
//             }
//         }
        
//         if (snapToVertex) {
//             // Snap to existing garden zones
//             gardenZones.forEach(zone => {
//                 if (zone.canvasCoordinates) {
//                     zone.canvasCoordinates.forEach(coord => {
//                         snapPoints.push({
//                             x: coord.x,
//                             y: coord.y,
//                             type: 'vertex',
//                             sourceId: zone.id
//                         });
//                     });
                    
//                     // Add midpoints for zone edges
//                     for (let i = 0; i < zone.canvasCoordinates.length; i++) {
//                         const current = zone.canvasCoordinates[i];
//                         const next = zone.canvasCoordinates[(i + 1) % zone.canvasCoordinates.length];
//                         const midX = (current.x + next.x) / 2;
//                         const midY = (current.y + next.y) / 2;
//                         snapPoints.push({
//                             x: midX,
//                             y: midY,
//                             type: 'midpoint',
//                             sourceId: zone.id
//                         });
//                     }
//                 }
//             });
            
//             // Snap to sprinklers
//             sprinklers.forEach(sprinkler => {
//                 if (sprinkler.canvasPosition) {
//                     snapPoints.push({
//                         x: sprinkler.canvasPosition.x,
//                         y: sprinkler.canvasPosition.y,
//                         type: 'vertex',
//                         sourceId: sprinkler.id
//                     });
//                 }
//             });
//         }
        
//         return snapPoints;
//     }, [snapToGrid, snapToVertex, showGrid, gardenZones, sprinklers, canvasData]);
    
//     const findNearestSnapPoint = useCallback((x: number, y: number): SnapPoint | null => {
//         const snapPoints = getSnapPoints();
//         let nearest: SnapPoint | null = null;
//         let minDistance = snapDistance;
        
//         snapPoints.forEach(point => {
//             const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
//             if (distance < minDistance) {
//                 minDistance = distance;
//                 nearest = point;
//             }
//         });
        
//         return nearest;
//     }, [getSnapPoints, snapDistance]);

//     // ===== ZONE CREATION FUNCTIONS =====
//     const createRectangleZone = useCallback((start: CanvasCoordinate, end: CanvasCoordinate): CanvasCoordinate[] => {
//         return [
//             { x: start.x, y: start.y },
//             { x: end.x, y: start.y },
//             { x: end.x, y: end.y },
//             { x: start.x, y: end.y }
//         ];
//     }, []);

//     const createCircleZone = useCallback((center: CanvasCoordinate, radius: number, segments: number = 32): CanvasCoordinate[] => {
//         const points: CanvasCoordinate[] = [];
//         for (let i = 0; i < segments; i++) {
//             const angle = (i * 2 * Math.PI) / segments;
//             points.push({
//                 x: center.x + radius * Math.cos(angle),
//                 y: center.y + radius * Math.sin(angle)
//             });
//         }
//         return points;
//     }, []);

//     const createRegularPolygon = useCallback((center: CanvasCoordinate, radius: number, sides: number): CanvasCoordinate[] => {
//         const points: CanvasCoordinate[] = [];
//         for (let i = 0; i < sides; i++) {
//             const angle = (i * 2 * Math.PI) / sides - Math.PI / 2; // Start from top
//             points.push({
//                 x: center.x + radius * Math.cos(angle),
//                 y: center.y + radius * Math.sin(angle)
//             });
//         }
//         return points;
//     }, []);

//     // ===== ZONE FINALIZATION =====
//     const finalizeZone = useCallback((coordinates: CanvasCoordinate[], zoneType: string) => {
//         // Validate zone size
//         const area = calculatePolygonArea(coordinates, enhancedMode ? enhancedScale : canvasData.scale);
//         if (area > 300) {
//             alert(
//                 `❌ ขนาดพื้นที่เกินกำหนด!\n\nขนาดที่วาด: ${formatArea(area)}\nขนาดสูงสุดที่อนุญาต: 300 ตร.ม.\n\nกรุณาวาดพื้นที่ให้มีขนาดเล็กลง`
//             );
//             return;
//         }

//         // Find parent zone if applicable
//         const centerPoint = {
//             x: coordinates.reduce((sum, c) => sum + c.x, 0) / coordinates.length,
//             y: coordinates.reduce((sum, c) => sum + c.y, 0) / coordinates.length,
//         };

//         let parentZoneId: string | undefined;
//         if (zoneType !== 'grass') {
//             const parentGrassZone = gardenZones.find((zone) => {
//                 if (zone.type !== 'grass' || zone.parentZoneId) return false;
//                 if (zone.canvasCoordinates) {
//                     return isPointInPolygon(centerPoint, zone.canvasCoordinates);
//                 }
//                 return false;
//             });
//             if (parentGrassZone) {
//                 parentZoneId = parentGrassZone.id;
//             }
//         }

//         // Create zone with sprinkler configuration
//         const suitableSprinklers = SPRINKLER_TYPES.filter((s) =>
//             s.suitableFor.includes(zoneType)
//         );
//         const defaultSprinkler = suitableSprinklers[0];
//         const zoneTypeInfo = ZONE_TYPES.find((z) => z.id === zoneType);
//         const baseNameCount = gardenZones.filter((z) => z.type === zoneType).length + 1;

//         // Enhanced metadata for zone
//         const metadata = {
//             drawingTool: currentDrawingTool,
//             area: area,
//             enhancedScale: enhancedMode ? enhancedScale : undefined,
//             createdAt: new Date().toISOString()
//         };

//         // Use enhanced callback if available, otherwise use original
//         if (onEnhancedZoneCreated) {
//             onEnhancedZoneCreated(coordinates, zoneType, metadata);
//         } else {
//             onZoneCreated(coordinates);
//         }

//         // Reset drawing state
//         setDrawingState({
//             isDrawing: false,
//             currentPoints: [],
//             previewPoints: [],
//             tool: currentDrawingTool,
//             zoneType: zoneType,
//         });
//     }, [
//         currentDrawingTool, 
//         enhancedMode, 
//         enhancedScale, 
//         canvasData.scale, 
//         gardenZones,
//         onEnhancedZoneCreated,
//         onZoneCreated
//     ]);

//     // ===== EVENT HANDLERS =====
//     const handleMouseMove = useCallback(
//         (e: React.MouseEvent<HTMLCanvasElement>) => {
//             const canvas = canvasRef.current;
//             if (!canvas) return;

//             const rect = canvas.getBoundingClientRect();
//             let x = e.clientX - rect.left;
//             let y = e.clientY - rect.top;

//             // Enhanced mode snap handling
//             if (enhancedMode && (snapToGrid || snapToVertex)) {
//                 const snapPoint = findNearestSnapPoint(x, y);
//                 if (snapPoint) {
//                     x = snapPoint.x;
//                     y = snapPoint.y;
//                     setHoveredSnapPoint(snapPoint);
//                 } else {
//                     setHoveredSnapPoint(null);
//                 }
//             }

//             setMousePos({ x, y });

//             // Update preview for enhanced tools
//             if (enhancedMode && drawingState.isDrawing) {
//                 const newPreviewPoints = [...drawingState.currentPoints];
                
//                 switch (currentDrawingTool) {
//                     case 'rectangle':
//                         if (drawingState.currentPoints.length === 1) {
//                             const rectPoints = createRectangleZone(drawingState.currentPoints[0], { x, y });
//                             newPreviewPoints.push(...rectPoints.slice(1));
//                         }
//                         break;
                        
//                     case 'circle':
//                         if (drawingState.currentPoints.length === 1) {
//                             const radius = calculateDistance(drawingState.currentPoints[0], { x, y });
//                             const circlePoints = createCircleZone(drawingState.currentPoints[0], radius);
//                             newPreviewPoints.push(...circlePoints.slice(1));
//                         }
//                         break;
                        
//                     case 'regular-polygon':
//                         if (drawingState.currentPoints.length === 1) {
//                             const radius = calculateDistance(drawingState.currentPoints[0], { x, y });
//                             const polygonPoints = createRegularPolygon(drawingState.currentPoints[0], radius, 6);
//                             newPreviewPoints.push(...polygonPoints.slice(1));
//                         }
//                         break;
                        
//                     case 'freehand':
//                         // For freehand, just add the current mouse position as preview
//                         if (drawingState.currentPoints.length > 0) {
//                             newPreviewPoints.push({ x, y });
//                         }
//                         break;
//                 }
                
//                 setDrawingState(prev => ({ ...prev, previewPoints: newPreviewPoints }));
//             }

//             // Original functionality for sprinkler dragging and hover detection
//             const worldPos = { x, y }; // In enhanced mode, we work directly with canvas coordinates
//             let newHoveredItem: { type: 'sprinkler' | 'waterSource' | 'pipe'; id: string } | null = null;

//             for (const sprinkler of sprinklers) {
//                 if (!sprinkler.canvasPosition) continue;
//                 const dist = calculateDistance(worldPos, sprinkler.canvasPosition);
//                 if (dist < 18) {
//                     newHoveredItem = { type: 'sprinkler', id: sprinkler.id };
//                     break;
//                 }
//             }

//             if (!newHoveredItem && waterSource && waterSource.canvasPosition) {
//                 const dist = calculateDistance(worldPos, waterSource.canvasPosition);
//                 if (dist < 25) {
//                     newHoveredItem = { type: 'waterSource', id: waterSource.id };
//                 }
//             }

//             if (JSON.stringify(newHoveredItem) !== JSON.stringify(hoveredItem)) {
//                 setHoveredItem(newHoveredItem);
//             }

//             if (draggedSprinkler) {
//                 onSprinklerDragged(draggedSprinkler, worldPos);
//             }
//         },
//         [
//             enhancedMode, snapToGrid, snapToVertex, findNearestSnapPoint,
//             drawingState, currentDrawingTool, createRectangleZone, createCircleZone, createRegularPolygon,
//             draggedSprinkler, sprinklers, waterSource, hoveredItem,
//             onSprinklerDragged
//         ]
//     );

//     const handleMouseDown = useCallback(
//         (e: React.MouseEvent<HTMLCanvasElement>) => {
//             const canvas = canvasRef.current;
//             if (!canvas) return;

//             const rect = canvas.getBoundingClientRect();
//             let x = e.clientX - rect.left;
//             let y = e.clientY - rect.top;

//             // Enhanced mode snap
//             if (enhancedMode && (snapToGrid || snapToVertex)) {
//                 const snapPoint = findNearestSnapPoint(x, y);
//                 if (snapPoint) {
//                     x = snapPoint.x;
//                     y = snapPoint.y;
//                 }
//             }

//             const point = { x, y };

//             // Handle scale setting mode
//             if (isSettingScale) {
//                 if (scalePoints.length === 0) {
//                     setScalePoints([point]);
//                 } else if (scalePoints.length === 1) {
//                     setScalePoints([...scalePoints, point]);
//                     setShowScaleDialog(true);
//                 }
//                 return;
//             }

//             // Enhanced drawing mode
//             if (enhancedMode && editMode === 'draw') {
//                 switch (currentDrawingTool) {
//                     case 'freehand':
//                         if (!drawingState.isDrawing) {
//                             setDrawingState({
//                                 isDrawing: true,
//                                 currentPoints: [point],
//                                 previewPoints: [],
//                                 tool: currentDrawingTool,
//                                 zoneType: selectedZoneType,
//                             });
//                         } else {
//                             setDrawingState(prev => ({
//                                 ...prev,
//                                 currentPoints: [...prev.currentPoints, point]
//                             }));
//                         }
//                         break;
                        
//                     case 'rectangle':
//                     case 'circle':
//                     case 'regular-polygon':
//                         if (!drawingState.isDrawing) {
//                             setDrawingState({
//                                 isDrawing: true,
//                                 currentPoints: [point],
//                                 previewPoints: [],
//                                 tool: currentDrawingTool,
//                                 zoneType: selectedZoneType,
//                             });
//                         } else {
//                             // Complete the shape
//                             let finalPoints: CanvasCoordinate[] = [];
                            
//                             switch (currentDrawingTool) {
//                                 case 'rectangle':
//                                     finalPoints = createRectangleZone(drawingState.currentPoints[0], point);
//                                     break;
//                                 case 'circle':
//                                     const radius = calculateDistance(drawingState.currentPoints[0], point);
//                                     finalPoints = createCircleZone(drawingState.currentPoints[0], radius);
//                                     break;
//                                 case 'regular-polygon':
//                                     const polyRadius = calculateDistance(drawingState.currentPoints[0], point);
//                                     finalPoints = createRegularPolygon(drawingState.currentPoints[0], polyRadius, 6);
//                                     break;
//                             }
                            
//                             finalizeZone(finalPoints, selectedZoneType);
//                         }
//                         break;
//                 }
//                 return;
//             }

//             // Original functionality for other modes
//             if (waterSource && waterSource.canvasPosition) {
//                 const dist = calculateDistance(point, waterSource.canvasPosition);
//                 if (dist < 25) {
//                     if (editMode === 'drag-sprinkler') {
//                         return;
//                     }
//                 }
//             }

//             if (editMode === 'drag-sprinkler') {
//                 const clickedSprinkler = sprinklers.find((s) => {
//                     if (!s.canvasPosition) return false;
//                     const dist = calculateDistance(point, s.canvasPosition);
//                     return dist < 18;
//                 });

//                 if (clickedSprinkler) {
//                     setDraggedSprinkler(clickedSprinkler.id);
//                     onSprinklerClick(clickedSprinkler.id);
//                     return;
//                 }
//             }

//             // Original zone drawing (fallback)
//             if (editMode === 'draw' && !enhancedMode) {
//                 if (!isDrawing) {
//                     setIsDrawing(true);
//                     setCurrentPolygon([point]);
//                 } else {
//                     setCurrentPolygon([...currentPolygon, point]);
//                 }
//                 return;
//             }

//             if (editMode === 'place') {
//                 onSprinklerPlaced(point);
//                 return;
//             }

//             if (editMode === 'edit' && !waterSource) {
//                 onWaterSourcePlaced(point);
//                 return;
//             }

//             if (editMode === 'main-pipe') {
//                 onMainPipePoint(point);
//                 return;
//             }

//             if (editMode === 'connect-sprinklers' || editMode === 'drag-sprinkler') {
//                 const clickedSprinkler = sprinklers.find((s) => {
//                     if (!s.canvasPosition) return false;
//                     const dist = calculateDistance(point, s.canvasPosition);
//                     return dist < 18;
//                 });

//                 if (clickedSprinkler) {
//                     onSprinklerClick(clickedSprinkler.id);
//                 }
//             }
//         },
//         [
//             enhancedMode, snapToGrid, snapToVertex, findNearestSnapPoint,
//             isSettingScale, scalePoints, editMode, currentDrawingTool, drawingState, selectedZoneType,
//             createRectangleZone, createCircleZone, createRegularPolygon, finalizeZone,
//             currentPolygon, isDrawing, waterSource, sprinklers, draggedSprinkler,
//             onSprinklerPlaced, onWaterSourcePlaced, onMainPipePoint, onSprinklerClick
//         ]
//     );

//     const handleRightClick = useCallback(
//         (e: React.MouseEvent<HTMLCanvasElement>) => {
//             e.preventDefault();

//             // Enhanced mode - complete freehand zone
//             if (enhancedMode && currentDrawingTool === 'freehand' && drawingState.isDrawing && drawingState.currentPoints.length >= 3) {
//                 finalizeZone(drawingState.currentPoints, selectedZoneType);
//                 return;
//             }

//             // Original functionality preserved
//             const canvas = canvasRef.current;
//             if (!canvas) return;

//             const rect = canvas.getBoundingClientRect();
//             const x = e.clientX - rect.left;
//             const y = e.clientY - rect.top;
//             const worldPos = { x, y };

//             if (waterSource && waterSource.canvasPosition) {
//                 const dist = calculateDistance(worldPos, waterSource.canvasPosition);
//                 if (dist < 25) {
//                     onWaterSourceDelete();
//                     return;
//                 }
//             }

//             if (editMode === 'drag-sprinkler') {
//                 const clickedSprinkler = sprinklers.find((s) => {
//                     if (!s.canvasPosition) return false;
//                     const dist = calculateDistance(worldPos, s.canvasPosition);
//                     return dist < 18;
//                 });

//                 if (clickedSprinkler) {
//                     onSprinklerDelete(clickedSprinkler.id);
//                     return;
//                 }
//             }

//             if (isDrawing && currentPolygon.length >= 3 && !enhancedMode) {
//                 onZoneCreated(currentPolygon);
//                 setCurrentPolygon([]);
//                 setIsDrawing(false);
//             }
//         },
//         [
//             enhancedMode, currentDrawingTool, drawingState, selectedZoneType, finalizeZone,
//             currentPolygon, isDrawing, waterSource, sprinklers, editMode,
//             onWaterSourceDelete, onSprinklerDelete, onZoneCreated
//         ]
//     );

//     const handleMouseUp = useCallback(() => {
//         if (draggedSprinkler) {
//             setDraggedSprinkler(null);
//         }
//     }, [draggedSprinkler]);

//     // Scale setting handler
//     const handleScaleSet = useCallback(() => {
//         if (scalePoints.length === 2 && realDistance) {
//             const pixelDistance = calculateDistance(scalePoints[0], scalePoints[1]);
//             const realDistanceNum = parseFloat(realDistance);
//             if (realDistanceNum > 0) {
//                 setEnhancedScale(pixelDistance / realDistanceNum);
//                 setShowScaleDialog(false);
//                 setScalePoints([]);
//                 setRealDistance('');
//                 setIsSettingScale(false);
//             }
//         }
//     }, [scalePoints, realDistance]);

//     // Rest of the component implementation would continue here...
//     // Including draw functions, render functions, and JSX return
    
//     return (
//         <div className="relative">
//             {/* Implementation continues... */}
//             <canvas
//                 ref={canvasRef}
//                 width={canvasData.width}
//                 height={canvasData.height}
//                 className="bg-gray-900"
//                 onMouseMove={handleMouseMove}
//                 onMouseDown={handleMouseDown}
//                 onMouseUp={handleMouseUp}
//                 onContextMenu={handleRightClick}
//             />
//             {/* Additional UI components would be added here */}
//         </div>
//     );
// };

// export default EnhancedZoneDesigner;