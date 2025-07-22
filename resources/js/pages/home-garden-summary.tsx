// resources/js/pages/home-garden-summary.tsx - แก้ไขปุ่มคำนวณอุปกรณ์
import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { router } from '@inertiajs/react';

// Import Google Maps component instead of Leaflet
import GoogleMapSummary from '../components/homegarden/GoogleMapSummary';

import {
    Coordinate,
    CanvasCoordinate,
    GardenPlannerData,
    GardenStatistics,
    ZONE_TYPES,
    SPRINKLER_TYPES,
    loadGardenData,
    calculateStatistics,
    formatArea,
    formatDistance,
    validateGardenData,
    clipCircleToPolygon,
    isCornerSprinkler,
    canvasToGPS,
    calculateDistance,
} from '../utils/homeGardenData';

interface HomeGardenSummaryProps {
    data?: GardenPlannerData;
}

// Enhanced interface for dimension lines
interface DimensionLine {
    id: string;
    start: CanvasCoordinate;
    end: CanvasCoordinate;
    label: string;
    distance: number;
    direction: 'auto' | 'left' | 'right' | 'top' | 'bottom';
}

// Error Boundary Component
class SummaryErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Summary Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-gray-900 p-6">
                    <div className="rounded-lg bg-red-900 p-6 text-center text-white">
                        <h2 className="mb-4 text-xl font-bold">เกิดข้อผิดพลาดในการแสดงสรุปผล</h2>
                        <p className="mb-4">ไม่สามารถโหลดข้อมูลการออกแบบได้</p>
                        <button
                            onClick={() => router.visit('/home-garden-planner')}
                            className="rounded bg-red-600 px-4 py-2 hover:bg-red-700"
                        >
                            กลับไปหน้าออกแบบ
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Enhanced Canvas Renderer with dimension lines and auto-centering
const CanvasRenderer: React.FC<{
    gardenData: GardenPlannerData;
    canvasRef?: React.RefObject<HTMLCanvasElement>;
}> = ({ gardenData, canvasRef }) => {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const activeCanvasRef = canvasRef || internalCanvasRef;

    // Extract dimension lines from gardenData (if available)
    const dimensionLines = useMemo(() => {
        // Try to get dimension lines from localStorage or gardenData
        try {
            const savedDimensions = localStorage.getItem('gardenDimensionLines');
            if (savedDimensions) {
                return JSON.parse(savedDimensions) as DimensionLine[];
            }
        } catch (error) {
            console.warn('Could not load dimension lines:', error);
        }
        return [];
    }, []);

    // Calculate bounds and centering for canvas content
    const canvasBounds = useMemo(() => {
        const allPoints: CanvasCoordinate[] = [];

        // Collect all points from zones
        gardenData.gardenZones?.forEach((zone) => {
            if (zone.canvasCoordinates) {
                allPoints.push(...zone.canvasCoordinates);
            }
        });

        // Collect all points from sprinklers
        gardenData.sprinklers?.forEach((sprinkler) => {
            if (sprinkler.canvasPosition) {
                allPoints.push(sprinkler.canvasPosition);
            }
        });

        // Collect all points from pipes
        gardenData.pipes?.forEach((pipe) => {
            if (pipe.canvasStart) allPoints.push(pipe.canvasStart);
            if (pipe.canvasEnd) allPoints.push(pipe.canvasEnd);
        });

        // Collect all points from dimension lines
        dimensionLines.forEach((dim) => {
            allPoints.push(dim.start, dim.end);
        });

        // Collect water source
        if (gardenData.waterSource?.canvasPosition) {
            allPoints.push(gardenData.waterSource.canvasPosition);
        }

        if (allPoints.length === 0) {
            return {
                minX: 0,
                maxX: 800,
                minY: 0,
                maxY: 600,
                width: 800,
                height: 600,
                centerX: 400,
                centerY: 300,
            };
        }

        const minX = Math.min(...allPoints.map((p) => p.x));
        const maxX = Math.max(...allPoints.map((p) => p.x));
        const minY = Math.min(...allPoints.map((p) => p.y));
        const maxY = Math.max(...allPoints.map((p) => p.y));

        const width = maxX - minX;
        const height = maxY - minY;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        return { minX, maxX, minY, maxY, width, height, centerX, centerY };
    }, [gardenData, dimensionLines]);

    // Calculate transform for centering
    const transform = useMemo(() => {
        const canvas = activeCanvasRef.current;
        if (!canvas) return { scale: 1, offsetX: 0, offsetY: 0 };

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const padding = 50; // Padding around content

        // Calculate scale to fit content with padding
        const scaleX = (canvasWidth - 2 * padding) / Math.max(canvasBounds.width, 1);
        const scaleY = (canvasHeight - 2 * padding) / Math.max(canvasBounds.height, 1);
        const scale = Math.min(scaleX, scaleY, 2); // Max scale of 2

        // Calculate offset to center content
        const scaledWidth = canvasBounds.width * scale;
        const scaledHeight = canvasBounds.height * scale;
        const offsetX = (canvasWidth - scaledWidth) / 2 - canvasBounds.minX * scale;
        const offsetY = (canvasHeight - scaledHeight) / 2 - canvasBounds.minY * scale;

        return { scale, offsetX, offsetY };
    }, [canvasBounds, activeCanvasRef]);

    // Transform function
    const transformPoint = useCallback(
        (point: CanvasCoordinate) => {
            return {
                x: point.x * transform.scale + transform.offsetX,
                y: point.y * transform.scale + transform.offsetY,
            };
        },
        [transform]
    );

    // Draw dimension lines
    const drawDimensionLines = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (dimensionLines.length === 0) return;

            ctx.save();

            dimensionLines.forEach((dimension) => {
                const startScreen = transformPoint(dimension.start);
                const endScreen = transformPoint(dimension.end);

                // Calculate line direction
                const dx = endScreen.x - startScreen.x;
                const dy = endScreen.y - startScreen.y;
                const length = Math.sqrt(dx * dx + dy * dy);

                if (length < 1) return;

                const unitX = dx / length;
                const unitY = dy / length;
                const offsetDistance = 30 * transform.scale;

                // Determine offset direction based on dimension.direction
                let offsetX = 0;
                let offsetY = 0;

                if (dimension.direction === 'auto') {
                    // Auto direction - perpendicular to line
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

                // Draw dimension line
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2 * transform.scale;
                ctx.beginPath();
                ctx.moveTo(dimStart.x, dimStart.y);
                ctx.lineTo(dimEnd.x, dimEnd.y);
                ctx.stroke();

                // Draw extension lines
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 1 * transform.scale;
                ctx.setLineDash([3 * transform.scale, 3 * transform.scale]);

                ctx.beginPath();
                ctx.moveTo(startScreen.x, startScreen.y);
                ctx.lineTo(dimStart.x, dimStart.y);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(endScreen.x, endScreen.y);
                ctx.lineTo(dimEnd.x, dimEnd.y);
                ctx.stroke();

                ctx.setLineDash([]);

                // Draw arrows
                const arrowSize = 8 * transform.scale;
                const angle1 = Math.atan2(dimEnd.y - dimStart.y, dimEnd.x - dimStart.x);
                const angle2 = angle1 + Math.PI;

                // Arrow at start
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

                // Arrow at end
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

                // Draw label
                const midX = (dimStart.x + dimEnd.x) / 2;
                const midY = (dimStart.y + dimEnd.y) / 2;

                ctx.fillStyle = 'rgba(0,0,0,0.8)';
                ctx.font = `bold ${12 * transform.scale}px Arial`;
                const textMetrics = ctx.measureText(dimension.label);
                const textWidth = textMetrics.width;
                const textHeight = 16 * transform.scale;

                ctx.fillRect(
                    midX - textWidth / 2 - 4 * transform.scale,
                    midY - textHeight / 2,
                    textWidth + 8 * transform.scale,
                    textHeight
                );

                ctx.fillStyle = '#FFD700';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(dimension.label, midX, midY);
            });

            ctx.restore();
        },
        [dimensionLines, transformPoint, transform]
    );

    const draw = useCallback(() => {
        const canvas = activeCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        try {
            const isImageMode = gardenData.designMode === 'image';

            // Get correct scale
            let scale: number;
            if (isImageMode) {
                scale = gardenData.imageData?.scale || 20;
                console.log(
                    'Image mode scale:',
                    scale,
                    'isScaleSet:',
                    gardenData.imageData?.isScaleSet
                );
            } else {
                scale = gardenData.canvasData?.scale || 20;
                console.log('Canvas mode scale:', scale);
            }

            // Clear canvas
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Apply transform
            ctx.save();
            ctx.scale(transform.scale, transform.scale);
            ctx.translate(transform.offsetX / transform.scale, transform.offsetY / transform.scale);

            if (isImageMode && gardenData.imageData?.url) {
                const img = new Image();
                img.onload = () => {
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    try {
                        ctx.save();
                        ctx.scale(transform.scale, transform.scale);
                        ctx.translate(
                            transform.offsetX / transform.scale,
                            transform.offsetY / transform.scale
                        );
                        ctx.drawImage(
                            img,
                            0,
                            0,
                            canvas.width / transform.scale,
                            canvas.height / transform.scale
                        );
                        ctx.restore();
                        drawElements(ctx, scale);
                    } catch (error) {
                        console.error('Error drawing image:', error);
                        drawElements(ctx, scale);
                    }
                };
                img.onerror = () => {
                    console.error('Error loading image');
                    drawElements(ctx, scale);
                };
                img.src = gardenData.imageData.url;
            } else {
                drawElements(ctx, scale);
            }

            function drawElements(ctx: CanvasRenderingContext2D, scale: number) {
                try {
                    console.log('Drawing with scale:', scale);

                    // Restore transform for drawing elements
                    ctx.restore();
                    ctx.save();

                    // Draw zones
                    gardenData.gardenZones?.forEach((zone) => {
                        if (!zone.canvasCoordinates || zone.canvasCoordinates.length < 3) return;

                        const zoneType = ZONE_TYPES.find((z) => z.id === zone.type);
                        ctx.fillStyle = zoneType?.color + '33' || '#66666633';
                        ctx.strokeStyle = zoneType?.color || '#666666';
                        ctx.lineWidth = (zone.parentZoneId ? 3 : 2) * transform.scale;

                        if (zone.type === 'forbidden' || zone.parentZoneId) {
                            ctx.setLineDash([5 * transform.scale, 5 * transform.scale]);
                        }

                        ctx.beginPath();
                        const firstPoint = transformPoint(zone.canvasCoordinates[0]);
                        ctx.moveTo(firstPoint.x, firstPoint.y);
                        zone.canvasCoordinates.forEach((coord) => {
                            const point = transformPoint(coord);
                            ctx.lineTo(point.x, point.y);
                        });
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                        ctx.setLineDash([]);

                        // Zone label
                        const centerX =
                            zone.canvasCoordinates.reduce((sum, c) => sum + c.x, 0) /
                            zone.canvasCoordinates.length;
                        const centerY =
                            zone.canvasCoordinates.reduce((sum, c) => sum + c.y, 0) /
                            zone.canvasCoordinates.length;
                        const centerPoint = transformPoint({ x: centerX, y: centerY });

                        ctx.fillStyle = '#fff';
                        ctx.font = `bold ${12 * transform.scale}px Arial`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(zone.name, centerPoint.x, centerPoint.y);

                        // Area label
                        try {
                            const area =
                                gardenData.canvasData && zone.canvasCoordinates
                                    ? zone.canvasCoordinates.reduce((sum, coord, i) => {
                                          const nextCoord =
                                              zone.canvasCoordinates![
                                                  (i + 1) % zone.canvasCoordinates!.length
                                              ];
                                          return (
                                              sum + (coord.x * nextCoord.y - nextCoord.x * coord.y)
                                          );
                                      }, 0) /
                                      2 /
                                      (scale * scale)
                                    : 0;
                            ctx.font = `${10 * transform.scale}px Arial`;
                            ctx.fillStyle = '#ddd';
                            ctx.fillText(
                                formatArea(Math.abs(area)),
                                centerPoint.x,
                                centerPoint.y + 15 * transform.scale
                            );
                        } catch (error) {
                            console.error('Error drawing zone area:', error);
                        }
                    });

                    // Draw pipes (simplified single type)
                    gardenData.pipes?.forEach((pipe) => {
                        if (!pipe.canvasStart || !pipe.canvasEnd) return;

                        const startPoint = transformPoint(pipe.canvasStart);
                        const endPoint = transformPoint(pipe.canvasEnd);

                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.strokeStyle = '#FFFF00'; // Yellow for all pipes
                        ctx.lineWidth = 3 * transform.scale;

                        ctx.beginPath();
                        ctx.moveTo(startPoint.x, startPoint.y);
                        ctx.lineTo(endPoint.x, endPoint.y);
                        ctx.stroke();
                    });

                    // Draw enhanced sprinkler radii
                    gardenData.sprinklers?.forEach((sprinkler) => {
                        if (!sprinkler.canvasPosition) return;

                        const zone = gardenData.gardenZones?.find((z) => z.id === sprinkler.zoneId);
                        const sprinklerPoint = transformPoint(sprinkler.canvasPosition);

                        console.log(`Sprinkler ${sprinkler.id}:`, {
                            radius: sprinkler.type.radius,
                            scale: scale,
                            radiusPixels: sprinkler.type.radius * scale * transform.scale,
                            zoneId: sprinkler.zoneId,
                            hasZone: !!zone,
                        });

                        if (zone && zone.canvasCoordinates && zone.canvasCoordinates.length >= 3) {
                            // Don't show radius for forbidden zones
                            if (zone.type === 'forbidden') {
                                return;
                            }

                            try {
                                const clipResult = clipCircleToPolygon(
                                    sprinkler.canvasPosition,
                                    sprinkler.type.radius,
                                    zone.canvasCoordinates,
                                    scale
                                );

                                const radiusPixels =
                                    sprinkler.type.radius * scale * transform.scale;
                                console.log(
                                    `Drawing full circle with radius: ${radiusPixels}px (${sprinkler.type.radius}m * ${scale} * ${transform.scale})`
                                );

                                ctx.save();

                                if (clipResult === 'FULL_CIRCLE') {
                                    ctx.fillStyle = sprinkler.type.color + '33';
                                    ctx.strokeStyle = sprinkler.type.color + '99';
                                    ctx.lineWidth = 2 * transform.scale;
                                    ctx.beginPath();
                                    ctx.arc(
                                        sprinklerPoint.x,
                                        sprinklerPoint.y,
                                        radiusPixels,
                                        0,
                                        Math.PI * 2
                                    );
                                    ctx.fill();
                                    ctx.stroke();
                                } else if (clipResult === 'MASKED_CIRCLE') {
                                    console.log(
                                        `Drawing masked circle with radius: ${radiusPixels}px`
                                    );

                                    // Create clipping path for zone
                                    ctx.save();
                                    ctx.beginPath();
                                    const firstZonePoint = transformPoint(
                                        zone.canvasCoordinates[0]
                                    );
                                    ctx.moveTo(firstZonePoint.x, firstZonePoint.y);
                                    for (let i = 1; i < zone.canvasCoordinates.length; i++) {
                                        const zonePoint = transformPoint(zone.canvasCoordinates[i]);
                                        ctx.lineTo(zonePoint.x, zonePoint.y);
                                    }
                                    ctx.closePath();
                                    ctx.clip();

                                    // Draw circle within clip
                                    ctx.fillStyle = sprinkler.type.color + '33';
                                    ctx.beginPath();
                                    ctx.arc(
                                        sprinklerPoint.x,
                                        sprinklerPoint.y,
                                        radiusPixels,
                                        0,
                                        Math.PI * 2
                                    );
                                    ctx.fill();
                                    ctx.restore();

                                    // Draw full circle outline with dashes
                                    ctx.strokeStyle = sprinkler.type.color + '66';
                                    ctx.lineWidth = 1 * transform.scale;
                                    ctx.setLineDash([3 * transform.scale, 3 * transform.scale]);
                                    ctx.beginPath();
                                    ctx.arc(
                                        sprinklerPoint.x,
                                        sprinklerPoint.y,
                                        radiusPixels,
                                        0,
                                        Math.PI * 2
                                    );
                                    ctx.stroke();
                                    ctx.setLineDash([]);
                                } else if (Array.isArray(clipResult) && clipResult.length >= 3) {
                                    const canvasResult = clipResult as CanvasCoordinate[];
                                    console.log(
                                        `Drawing clipped polygon with ${canvasResult.length} points`
                                    );

                                    ctx.fillStyle = sprinkler.type.color + '33';
                                    ctx.strokeStyle = sprinkler.type.color + '99';
                                    ctx.lineWidth = 2 * transform.scale;
                                    ctx.beginPath();
                                    const firstClipPoint = transformPoint(canvasResult[0]);
                                    ctx.moveTo(firstClipPoint.x, firstClipPoint.y);
                                    canvasResult.forEach((point) => {
                                        const clipPoint = transformPoint(point);
                                        ctx.lineTo(clipPoint.x, clipPoint.y);
                                    });
                                    ctx.closePath();
                                    ctx.fill();
                                    ctx.stroke();
                                }

                                ctx.restore();
                            } catch (error) {
                                console.error('Error drawing sprinkler radius:', error);
                                // Fallback - simple circle
                                const radiusPixels =
                                    sprinkler.type.radius * scale * transform.scale;
                                ctx.fillStyle = sprinkler.type.color + '26';
                                ctx.strokeStyle = sprinkler.type.color + '80';
                                ctx.lineWidth = 1 * transform.scale;
                                ctx.beginPath();
                                ctx.arc(
                                    sprinklerPoint.x,
                                    sprinklerPoint.y,
                                    radiusPixels,
                                    0,
                                    Math.PI * 2
                                );
                                ctx.fill();
                                ctx.stroke();
                            }
                        } else if (sprinkler.zoneId === 'virtual_zone') {
                            // Virtual zone - dashed circle
                            const radiusPixels = sprinkler.type.radius * scale * transform.scale;
                            console.log(
                                `Drawing virtual zone circle with radius: ${radiusPixels}px`
                            );

                            ctx.fillStyle = sprinkler.type.color + '26';
                            ctx.strokeStyle = sprinkler.type.color + '80';
                            ctx.lineWidth = 1 * transform.scale;
                            ctx.setLineDash([8 * transform.scale, 4 * transform.scale]);
                            ctx.beginPath();
                            ctx.arc(
                                sprinklerPoint.x,
                                sprinklerPoint.y,
                                radiusPixels,
                                0,
                                Math.PI * 2
                            );
                            ctx.fill();
                            ctx.stroke();
                            ctx.setLineDash([]);
                        }
                    });

                    // Draw sprinklers with enhanced styling
                    gardenData.sprinklers?.forEach((sprinkler) => {
                        if (!sprinkler.canvasPosition) return;

                        const sprinklerPoint = transformPoint(sprinkler.canvasPosition);

                        ctx.save();

                        // Add shadow
                        ctx.shadowColor = 'rgba(0,0,0,0.8)';
                        ctx.shadowBlur = 3 * transform.scale;
                        ctx.shadowOffsetX = 1 * transform.scale;
                        ctx.shadowOffsetY = 1 * transform.scale;

                        ctx.fillStyle = sprinkler.type.color;
                        ctx.font = `bold ${8 * transform.scale}px Arial`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';

                        if (sprinkler.orientation) {
                            ctx.translate(sprinklerPoint.x, sprinklerPoint.y);
                            ctx.rotate((sprinkler.orientation * Math.PI) / 180);
                            ctx.fillText(sprinkler.type.icon, 0, 0);
                            ctx.restore();
                        } else {
                            ctx.fillText(sprinkler.type.icon, sprinklerPoint.x, sprinklerPoint.y);
                            ctx.restore();
                        }
                    });

                    // Draw water source with enhanced styling
                    if (gardenData.waterSource?.canvasPosition) {
                        const waterSourcePoint = transformPoint(
                            gardenData.waterSource.canvasPosition
                        );

                        ctx.save();

                        // Shadow
                        ctx.shadowColor = 'rgba(0,0,0,0.6)';
                        ctx.shadowBlur = 8 * transform.scale;
                        ctx.shadowOffsetX = 2 * transform.scale;
                        ctx.shadowOffsetY = 2 * transform.scale;

                        ctx.fillStyle =
                            gardenData.waterSource.type === 'pump' ? '#EF4444' : '#3B82F6';
                        ctx.beginPath();
                        ctx.arc(
                            waterSourcePoint.x,
                            waterSourcePoint.y,
                            8 * transform.scale,
                            0,
                            Math.PI * 2
                        );
                        ctx.fill();

                        ctx.shadowColor = 'transparent';
                        ctx.fillStyle = '#fff';
                        ctx.font = `bold ${10 * transform.scale}px Arial`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(
                            gardenData.waterSource.type === 'pump' ? '⚡' : '🚰',
                            waterSourcePoint.x,
                            waterSourcePoint.y
                        );

                        ctx.restore();
                    }

                    ctx.restore();

                    // Draw dimension lines (outside transform)
                    drawDimensionLines(ctx);
                } catch (error) {
                    console.error('Error drawing canvas elements:', error);
                }
            }
        } catch (error) {
            console.error('Error in canvas draw function:', error);
        }
    }, [gardenData, activeCanvasRef, transform, transformPoint, drawDimensionLines]);

    useEffect(() => {
        draw();
    }, [draw]);

    const width = gardenData.imageData?.width || gardenData.canvasData?.width || 800;
    const height = gardenData.imageData?.height || gardenData.canvasData?.height || 600;

    return (
        <div className="flex h-full w-full items-center justify-center bg-gray-900 p-4">
            <canvas
                ref={activeCanvasRef}
                width={width}
                height={height}
                className="rounded-lg border border-gray-600 bg-gray-900 shadow-xl"
                style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                }}
                id="canvas-container"
            />
        </div>
    );
};

export default function HomeGardenSummary({ data: propsData }: HomeGardenSummaryProps) {
    const [gardenData, setGardenData] = useState<GardenPlannerData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSavingImage, setIsSavingImage] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const initializeData = async () => {
            try {
                setIsLoading(true);

                if (propsData) {
                    setGardenData(propsData);
                } else {
                    const savedData = loadGardenData();
                    if (savedData) {
                        const errors = validateGardenData(savedData);
                        if (errors.length > 0) {
                            setError('ข้อมูลไม่สมบูรณ์: ' + errors.join(', '));
                        } else {
                            setGardenData(savedData);
                        }
                    } else {
                        setError('ไม่พบข้อมูลการออกแบบ');
                    }
                }
            } catch (err) {
                console.error('Error loading data:', err);
                setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
            } finally {
                setIsLoading(false);
            }
        };

        initializeData();
    }, [propsData]);

    const statistics = useMemo<GardenStatistics | null>(() => {
        if (!gardenData) return null;
        try {
            return calculateStatistics(gardenData);
        } catch (err) {
            console.error('Error calculating statistics:', err);
            return null;
        }
    }, [gardenData]);

    const mapCenter = useMemo(() => {
        if (!gardenData) return [13.5799071, 100.8325833] as [number, number];

        try {
            const allPoints: Coordinate[] = [];

            if (gardenData.gardenZones) {
                gardenData.gardenZones.forEach((zone) => {
                    if (zone.coordinates && zone.coordinates.length > 0) {
                        allPoints.push(...zone.coordinates);
                    } else if (
                        zone.canvasCoordinates &&
                        zone.canvasCoordinates.length > 0 &&
                        gardenData.canvasData
                    ) {
                        const gpsCoords = zone.canvasCoordinates.map((c) =>
                            canvasToGPS(c, gardenData.canvasData)
                        );
                        allPoints.push(...gpsCoords);
                    }
                });
            }

            if (gardenData.sprinklers) {
                gardenData.sprinklers.forEach((s) => {
                    if (s.position) allPoints.push(s.position);
                });
            }

            if (gardenData.waterSource?.position) {
                allPoints.push(gardenData.waterSource.position);
            }

            // Add pipe points
            if (gardenData.pipes) {
                gardenData.pipes.forEach((pipe) => {
                    allPoints.push(pipe.start, pipe.end);
                });
            }

            if (allPoints.length === 0) return [13.5799071, 100.8325833] as [number, number];

            const validPoints = allPoints.filter(
                (p) =>
                    typeof p.lat === 'number' &&
                    typeof p.lng === 'number' &&
                    !isNaN(p.lat) &&
                    !isNaN(p.lng)
            );

            if (validPoints.length === 0) return [13.5799071, 100.8325833] as [number, number];

            const lats = validPoints.map((p) => p.lat);
            const lngs = validPoints.map((p) => p.lng);

            return [
                (Math.min(...lats) + Math.max(...lats)) / 2,
                (Math.min(...lngs) + Math.max(...lngs)) / 2,
            ] as [number, number];
        } catch (error) {
            console.error('Error calculating map center:', error);
            return [13.5799071, 100.8325833] as [number, number];
        }
    }, [gardenData]);

    const calculateZoomLevel = useMemo(() => {
        if (!gardenData || !gardenData.gardenZones || gardenData.gardenZones.length === 0)
            return 22;

        try {
            const allPoints: Coordinate[] = [];
            gardenData.gardenZones.forEach((zone) => {
                if (zone.coordinates && zone.coordinates.length > 0) {
                    allPoints.push(...zone.coordinates);
                } else if (
                    zone.canvasCoordinates &&
                    zone.canvasCoordinates.length > 0 &&
                    gardenData.canvasData
                ) {
                    const gpsCoords = zone.canvasCoordinates.map((c) =>
                        canvasToGPS(c, gardenData.canvasData)
                    );
                    allPoints.push(...gpsCoords);
                }
            });

            if (allPoints.length === 0) return 20;

            const validPoints = allPoints.filter(
                (p) =>
                    typeof p.lat === 'number' &&
                    typeof p.lng === 'number' &&
                    !isNaN(p.lat) &&
                    !isNaN(p.lng)
            );

            if (validPoints.length === 0) return 20;

            const lats = validPoints.map((p) => p.lat);
            const lngs = validPoints.map((p) => p.lng);

            const latDiff = Math.max(...lats) - Math.min(...lats);
            const lngDiff = Math.max(...lngs) - Math.min(...lngs);
            const maxDiff = Math.max(latDiff, lngDiff);

            if (maxDiff < 0.0005) return 80;
            if (maxDiff < 0.001) return 60;
            if (maxDiff < 0.002) return 50;
            if (maxDiff < 0.005) return 40;
            if (maxDiff < 0.01) return 30;
            return 20;
        } catch (error) {
            console.error('Error calculating zoom level:', error);
            return 20;
        }
    }, [gardenData]);

    const handleSaveImage = useCallback(async () => {
        if (!gardenData) return;

        setIsSavingImage(true);
        try {
            // Dynamic import for html2canvas
            const { default: html2canvas } = await import('html2canvas');

            // Target the specific container
            let elementId = gardenData.designMode === 'map' ? 'map-container' : 'canvas-container';
            const element = document.getElementById(elementId);

            if (element) {
                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    allowTaint: true,
                    backgroundColor: '#1a1a1a',
                });

                // Create download link
                const link = document.createElement('a');
                link.download = `garden-design-${new Date().toISOString().split('T')[0]}.png`;
                link.href = canvas.toDataURL('image/png');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err) {
            console.error('Error saving image:', err);
            setError('เกิดข้อผิดพลาดในการบันทึกรูปภาพ');
        } finally {
            setIsSavingImage(false);
        }
    }, [gardenData]);

    const handlePrintImage = useCallback(() => {
        try {
            // Get the specific container
            let elementId = gardenData?.designMode === 'map' ? 'map-container' : 'canvas-container';
            const element = document.getElementById(elementId);

            if (element) {
                // Create a new window for printing
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(`
                        <html>
                            <head>
                                <title>แผนผังระบบน้ำสำหรับสวนบ้าน</title>
                                <style>
                                    body { 
                                        margin: 0; 
                                        padding: 20px; 
                                        background: white;
                                        font-family: Arial, sans-serif;
                                    }
                                    .print-container { 
                                        width: 100%; 
                                        height: auto; 
                                        text-align: center;
                                    }
                                    .print-title {
                                        font-size: 18px;
                                        font-weight: bold;
                                        margin-bottom: 20px;
                                        color: #333;
                                    }
                                    @media print {
                                        body { 
                                            margin: 0; 
                                            padding: 0; 
                                        }
                                        .print-container {
                                            width: 100%;
                                            height: 100vh;
                                            display: flex;
                                            flex-direction: column;
                                            justify-content: center;
                                            align-items: center;
                                        }
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="print-container">
                                    <div class="print-title">แผนผังระบบน้ำสำหรับสวนบ้าน - ${new Date().toLocaleDateString('th-TH')}</div>
                                    ${element.outerHTML}
                                </div>
                            </body>
                        </html>
                    `);
                    printWindow.document.close();
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }
            }
        } catch (error) {
            console.error('Error printing:', error);
            setError('เกิดข้อผิดพลาดในการพิมพ์');
        }
    }, [gardenData]);

    // Enhanced handler for equipment calculation button with debugging
    const handleEquipmentCalculation = useCallback(() => {
        try {
            console.log('🏡 กดปุ่มคำนวณอุปกรณ์ Home Garden');
            console.log('🏡 ข้อมูลสวน:', {
                hasData: !!gardenData,
                zones: gardenData?.gardenZones?.length || 0,
                sprinklers: gardenData?.sprinklers?.length || 0,
                designMode: gardenData?.designMode,
            });

            // บันทึกข้อมูลเพิ่มเติมลง localStorage เพื่อให้แน่ใจ
            if (gardenData) {
                localStorage.setItem('garden_planner_data', JSON.stringify(gardenData));
                console.log('🏡 บันทึกข้อมูลสวนแล้ว');
            }

            // บันทึกข้อมูลสถิติ
            if (statistics) {
                localStorage.setItem('garden_statistics', JSON.stringify(statistics));
                console.log('🏡 บันทึกสถิติแล้ว:', {
                    totalArea: statistics.totalArea,
                    zones: statistics.totalZones,
                    sprinklers: statistics.totalSprinklers,
                });
            }

            // ไปยังหน้าคำนวณพร้อม mode parameter
            router.visit('/product?mode=garden');
        } catch (error) {
            console.error('🏡 Error navigating to equipment calculation:', error);
            setError('เกิดข้อผิดพลาดในการไปยังหน้าคำนวณอุปกรณ์');
        }
    }, [gardenData, statistics]);

    // Error display
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-gray-900 p-6">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-white"></div>
                    <p className="text-white">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    if (error || !gardenData || !statistics) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-gray-900 p-6">
                <div className="text-center">
                    <h1 className="mb-4 text-2xl font-bold text-white">
                        {error || 'ไม่พบข้อมูลการออกแบบ'}
                    </h1>
                    <button
                        onClick={() => router.visit('/home-garden-planner')}
                        className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                    >
                        กลับไปหน้าออกแบบ
                    </button>
                </div>
            </div>
        );
    }

    return (
        <SummaryErrorBoundary>
            <div className="min-h-screen w-full bg-gray-900 p-6">
                {/* Error notification */}
                {error && (
                    <div className="fixed left-4 top-4 z-50 rounded-lg bg-red-600 p-4 text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <span>{error}</span>
                            <button
                                onClick={() => setError(null)}
                                className="ml-4 text-white hover:text-gray-200"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h1 className="mb-2 text-2xl font-bold text-white">
                            📊 สรุปผลการออกแบบระบบน้ำ
                            <span className="ml-2 text-sm font-normal text-gray-400">
                                (
                                {gardenData.designMode === 'map'
                                    ? 'Google Map'
                                    : gardenData.designMode === 'canvas'
                                      ? 'วาดเอง'
                                      : 'รูปแบบแปลน'}
                                )
                            </span>
                        </h1>
                        <div className="flex gap-2">
                            <button
                                onClick={() => router.visit('/home-garden-planner')}
                                className="rounded-lg bg-gray-700 px-4 py-2 text-gray-300 transition-colors hover:bg-gray-600"
                            >
                                ← กลับไปหน้าออกแบบ
                            </button>
                            <button
                                onClick={handleSaveImage}
                                disabled={isSavingImage}
                                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                            >
                                {isSavingImage ? '⏳ กำลังบันทึก...' : '💾 บันทึกรูปภาพ (.png)'}
                            </button>
                            <button
                                onClick={handlePrintImage}
                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                            >
                                🖨️ พิมพ์รูปภาพ
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleEquipmentCalculation}
                                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
                                    title="คำนวณอุปกรณ์สำหรับสวนบ้าน"
                                >
                                    💰 คำนวณอุปกรณ์
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="text-right text-sm text-gray-400">
                        <div>วันที่: {new Date().toLocaleDateString('th-TH')}</div>
                        <div>เวลา: {new Date().toLocaleTimeString('th-TH')}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <div className="rounded-xl bg-gray-800 p-6">
                            <h3 className="mb-4 text-lg font-semibold text-blue-400">
                                🗺️ แผนผังโครงการ
                            </h3>
                            <div className="h-[600px] overflow-hidden rounded-lg border border-gray-600 bg-gray-900">
                                {gardenData.designMode === 'map' && (
                                    <div id="map-container" className="h-full">
                                        <GoogleMapSummary
                                            gardenData={gardenData}
                                            mapCenter={mapCenter}
                                            calculateZoomLevel={calculateZoomLevel}
                                        />
                                    </div>
                                )}

                                {(gardenData.designMode === 'canvas' ||
                                    gardenData.designMode === 'image') && (
                                    <CanvasRenderer gardenData={gardenData} canvasRef={canvasRef} />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-xl bg-gray-800 p-6">
                            <h3 className="mb-4 text-lg font-semibold text-blue-400">
                                📊 ข้อมูลรวม
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="rounded-lg bg-gray-700 p-3">
                                    <div className="mb-1 text-gray-400">พื้นที่รวมทั้งหมด</div>
                                    <div className="text-xl font-bold text-white">
                                        {formatArea(statistics.totalArea)}
                                    </div>
                                </div>

                                <div className="rounded-lg bg-gray-700 p-3">
                                    <div className="mb-1 text-gray-400">
                                        จำนวนโซน (ไม่รวมพื้นที่ห้าม)
                                    </div>
                                    <div className="text-xl font-bold text-green-400">
                                        {statistics.totalZones} โซน
                                    </div>
                                </div>

                                <div className="rounded-lg bg-gray-700 p-3">
                                    <div className="mb-1 text-gray-400">จำนวนหัวฉีดทั้งหมด</div>
                                    <div className="text-xl font-bold text-blue-400">
                                        {statistics.totalSprinklers} ตัว
                                    </div>
                                </div>

                                <div className="rounded-lg bg-gray-700 p-3">
                                    <div className="mb-1 text-gray-400">ระบบท่อ</div>
                                    <div className="mt-1 grid grid-cols-2 gap-2">
                                        <div>
                                            <div className="text-xs text-gray-500">
                                                ท่อที่ยาวที่สุด
                                            </div>
                                            <div className="font-bold text-yellow-400">
                                                {formatDistance(statistics.longestPipe)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500">ความยาวรวม</div>
                                            <div className="font-bold text-yellow-400">
                                                {formatDistance(statistics.totalPipeLength)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {statistics.zoneStatistics.length > 0 && (
                    <div className="mt-6 rounded-xl bg-gray-800 p-6">
                        <h3 className="mb-4 text-lg font-semibold text-green-400">
                            📍 ข้อมูลแยกตามโซน
                        </h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {statistics.zoneStatistics.map((zone, index) => (
                                <div key={zone.zoneId} className="rounded-lg bg-gray-700 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h4 className="font-semibold text-white">
                                            {index + 1}. {zone.zoneName}
                                        </h4>
                                        <span
                                            className={`rounded bg-gray-600 px-2 py-1 text-xs ${
                                                zone.zoneType === 'สนามหญ้า'
                                                    ? 'bg-green-200 text-green-600'
                                                    : zone.zoneType === 'แปลงดอกไม้'
                                                      ? 'bg-pink-200 text-pink-600'
                                                      : zone.zoneType === 'ต้นไม้'
                                                        ? 'bg-green-300 text-green-800'
                                                        : ''
                                            }`}
                                        >
                                            {zone.zoneType}
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">พื้นที่:</span>
                                            <span className="font-medium text-white">
                                                {formatArea(zone.area)}
                                            </span>
                                        </div>

                                        <div className="flex justify-between">
                                            <span className="text-gray-400">จำนวนหัวฉีด:</span>
                                            <span className="font-medium text-blue-400">
                                                {zone.sprinklerCount} ตัว
                                            </span>
                                        </div>
                                        {zone.sprinklerCount > 0 && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">
                                                        ประเภทหัวฉีด:
                                                    </span>
                                                    <div className="text-right">
                                                        {zone.sprinklerTypes.length > 0 ? (
                                                            <div className="text-xs">
                                                                {zone.sprinklerTypes.map(
                                                                    (type, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            className="font-medium text-cyan-400"
                                                                        >
                                                                            {type}
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="font-medium text-gray-500">
                                                                -
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">รัศมี:</span>
                                                    <span className="font-medium text-cyan-400">
                                                        {zone.sprinklerRadius > 0
                                                            ? `${zone.sprinklerRadius.toFixed(1)} ม.`
                                                            : '-'}
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        {zone.pipeLength > 0 && (
                                            <div className="border-t border-gray-600 pt-2">
                                                <div className="mb-1 text-gray-400">ระบบท่อ:</div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <span className="text-gray-500">
                                                            ยาวที่สุด:{' '}
                                                        </span>
                                                        <span className="text-yellow-400">
                                                            {formatDistance(zone.longestPipe)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">รวม: </span>
                                                        <span className="text-yellow-400">
                                                            {formatDistance(zone.pipeLength)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Print styles */}
                <style>{`
                    @media print {
                        .bg-gray-900 { background-color: white !important; }
                        .bg-gray-800 { background-color: #f3f4f6 !important; border: 1px solid #d1d5db !important; }
                        .bg-gray-700 { background-color: #e5e7eb !important; }
                        .bg-orange-700 { background-color: #fed7aa !important; }
                        .text-white { color: black !important; }
                        .text-gray-300, .text-gray-400, .text-gray-500 { color: #374151 !important; }
                        .text-gray-200 { color: #1f2937 !important; }
                        .text-blue-400 { color: #2563eb !important; }
                        .text-green-400 { color: #16a34a !important; }
                        .text-purple-400 { color: #7c3aed !important; }
                        .text-yellow-400 { color: #ca8a04 !important; }
                        .text-orange-400 { color: #ea580c !important; }
                        button { display: none !important; }
                    }
                `}</style>
            </div>
        </SummaryErrorBoundary>
    );
}
