// resources/js/pages/home-garden-summary.tsx
import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { router } from '@inertiajs/react';

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

interface DimensionLine {
    id: string;
    start: CanvasCoordinate;
    end: CanvasCoordinate;
    label: string;
    distance: number;
    direction: 'auto' | 'left' | 'right' | 'top' | 'bottom';
}

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

const CanvasRenderer: React.FC<{
    gardenData: GardenPlannerData;
    canvasRef?: React.RefObject<HTMLCanvasElement>;
}> = ({ gardenData, canvasRef }) => {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const activeCanvasRef = canvasRef || internalCanvasRef;

    const dimensionLines = useMemo(() => {
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

    const canvasBounds = useMemo(() => {
        const allPoints: CanvasCoordinate[] = [];

        gardenData.gardenZones?.forEach((zone) => {
            if (zone.canvasCoordinates) {
                allPoints.push(...zone.canvasCoordinates);
            }
        });

        gardenData.sprinklers?.forEach((sprinkler) => {
            if (sprinkler.canvasPosition) {
                allPoints.push(sprinkler.canvasPosition);
            }
        });

        gardenData.pipes?.forEach((pipe) => {
            if (pipe.canvasStart) allPoints.push(pipe.canvasStart);
            if (pipe.canvasEnd) allPoints.push(pipe.canvasEnd);
        });

        dimensionLines.forEach((dim) => {
            allPoints.push(dim.start, dim.end);
        });

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

    const transform = useMemo(() => {
        const canvas = activeCanvasRef.current;
        if (!canvas) return { scale: 1, offsetX: 0, offsetY: 0 };

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const padding = 50;

        const scaleX = (canvasWidth - 2 * padding) / Math.max(canvasBounds.width, 1);
        const scaleY = (canvasHeight - 2 * padding) / Math.max(canvasBounds.height, 1);
        const scale = Math.min(scaleX, scaleY, 2);

        const scaledWidth = canvasBounds.width * scale;
        const scaledHeight = canvasBounds.height * scale;
        const offsetX = (canvasWidth - scaledWidth) / 2 - canvasBounds.minX * scale;
        const offsetY = (canvasHeight - scaledHeight) / 2 - canvasBounds.minY * scale;

        return { scale, offsetX, offsetY };
    }, [canvasBounds, activeCanvasRef]);

    const transformPoint = useCallback(
        (point: CanvasCoordinate) => {
            return {
                x: point.x * transform.scale + transform.offsetX,
                y: point.y * transform.scale + transform.offsetY,
            };
        },
        [transform]
    );

    const drawDimensionLines = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (dimensionLines.length === 0) return;

            ctx.save();

            dimensionLines.forEach((dimension) => {
                const startScreen = transformPoint(dimension.start);
                const endScreen = transformPoint(dimension.end);

                const dx = endScreen.x - startScreen.x;
                const dy = endScreen.y - startScreen.y;
                const length = Math.sqrt(dx * dx + dy * dy);

                if (length < 1) return;

                const unitX = dx / length;
                const unitY = dy / length;
                const offsetDistance = 30 * transform.scale;

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
                ctx.lineWidth = 2 * transform.scale;
                ctx.beginPath();
                ctx.moveTo(dimStart.x, dimStart.y);
                ctx.lineTo(dimEnd.x, dimEnd.y);
                ctx.stroke();

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

                const arrowSize = 8 * transform.scale;
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

            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

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

                    ctx.restore();
                    ctx.save();

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

                    gardenData.pipes?.forEach((pipe) => {
                        if (!pipe.canvasStart || !pipe.canvasEnd) return;

                        const startPoint = transformPoint(pipe.canvasStart);
                        const endPoint = transformPoint(pipe.canvasEnd);

                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.strokeStyle = '#FFFF00';
                        ctx.lineWidth = 3 * transform.scale;

                        ctx.beginPath();
                        ctx.moveTo(startPoint.x, startPoint.y);
                        ctx.lineTo(endPoint.x, endPoint.y);
                        ctx.stroke();
                    });

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

                    gardenData.sprinklers?.forEach((sprinkler) => {
                        if (!sprinkler.canvasPosition) return;

                        const sprinklerPoint = transformPoint(sprinkler.canvasPosition);

                        ctx.save();

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

                    if (gardenData.waterSource?.canvasPosition) {
                        const waterSourcePoint = transformPoint(
                            gardenData.waterSource.canvasPosition
                        );

                        ctx.save();

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
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [isCreatingImage, setIsCreatingImage] = useState(false);

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

    // ฟังก์ชันสร้างภาพแผนที่ เหมือนใน HorticultureResultsPage.tsx
    const createMapImage = async () => {
        console.log('🏡 เริ่มสร้างภาพแผนที่สวนบ้าน...');

        // หา element ที่จะ capture
        let targetElement: HTMLElement | null = null;

<<<<<<< HEAD
        if (gardenData?.designMode === 'map' && mapContainerRef.current) {
            targetElement = mapContainerRef.current;
            console.log('🏡 ใช้ Google Map container');
        } else if (
            (gardenData?.designMode === 'canvas' || gardenData?.designMode === 'image') &&
            canvasRef.current
        ) {
            targetElement = canvasRef.current;
            console.log('🏡 ใช้ Canvas element');
        }

        if (!targetElement) {
            console.error('🏡 ไม่พบ element สำหรับ capture');
            return null;
=======
            // Target the specific container
            const elementId =
                gardenData.designMode === 'map' ? 'map-container' : 'canvas-container';
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
>>>>>>> main
        }

        try {
<<<<<<< HEAD
            // รอให้ element โหลดเสร็จ
            await new Promise((resolve) => setTimeout(resolve, 2000));
=======
            // Get the specific container
            const elementId =
                gardenData?.designMode === 'map' ? 'map-container' : 'canvas-container';
            const element = document.getElementById(elementId);
>>>>>>> main

            const html2canvas = await import('html2canvas');
            const html2canvasLib = html2canvas.default || html2canvas;

            console.log('🏡 เริ่ม capture element:', targetElement);

            const canvas = await html2canvasLib(targetElement, {
                useCORS: true,
                allowTaint: true,
                scale: 2,
                logging: false,
                backgroundColor: '#1F2937',
                width: targetElement.offsetWidth,
                height: targetElement.offsetHeight,
                onclone: (clonedDoc) => {
                    try {
                        // ลบ controls ที่ไม่ต้องการออกจากภาพ
                        const controls = clonedDoc.querySelectorAll(
                            '.leaflet-control-container, .gm-control-active, .gm-style-cc'
                        );
                        controls.forEach((el) => el.remove());

                        // ปรับสีที่อาจมีปัญหา
                        const elements = clonedDoc.querySelectorAll('*');
                        elements.forEach((el: Element) => {
                            const htmlEl = el as HTMLElement;
                            const computedStyle = window.getComputedStyle(htmlEl);

                            const color = computedStyle.color;
                            if (color && (color.includes('oklch') || color.includes('hsl'))) {
                                htmlEl.style.color = '#FFFFFF';
                            }

                            const backgroundColor = computedStyle.backgroundColor;
                            if (
                                backgroundColor &&
                                (backgroundColor.includes('oklch') ||
                                    backgroundColor.includes('hsl'))
                            ) {
                                if (
                                    backgroundColor.includes('transparent') ||
                                    backgroundColor.includes('rgba(0,0,0,0)')
                                ) {
                                    htmlEl.style.backgroundColor = 'transparent';
                                } else {
                                    htmlEl.style.backgroundColor = '#1F2937';
                                }
                            }

                            const borderColor = computedStyle.borderColor;
                            if (
                                borderColor &&
                                (borderColor.includes('oklch') || borderColor.includes('hsl'))
                            ) {
                                htmlEl.style.borderColor = '#374151';
                            }
                        });

                        // ลบ element ที่อาจมีปัญหา
                        const problematicElements = clonedDoc.querySelectorAll(
                            '[style*="oklch"], [style*="hsl"]'
                        );
                        problematicElements.forEach((el) => {
                            const htmlEl = el as HTMLElement;
                            htmlEl.style.removeProperty('color');
                            htmlEl.style.removeProperty('background-color');
                            htmlEl.style.removeProperty('border-color');
                            htmlEl.style.removeProperty('outline-color');
                        });
                    } catch (error) {
                        console.warn('⚠️ คำเตือนใน onclone:', error);
                    }
                },
            });

            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            console.log('🏡 สร้างภาพสำเร็จ, ขนาด:', dataUrl.length, 'characters');

            if (dataUrl && dataUrl !== 'data:,' && dataUrl.length > 100) {
                return dataUrl;
            } else {
                throw new Error('ไม่สามารถสร้างภาพแผนที่ได้');
            }
        } catch (error) {
            console.error('🏡 Error creating map image:', error);

            // สร้างภาพ fallback
            try {
                const fallbackCanvas = document.createElement('canvas');
                const ctx = fallbackCanvas.getContext('2d');

                if (ctx) {
                    fallbackCanvas.width = 800;
                    fallbackCanvas.height = 600;

                    ctx.fillStyle = '#1F2937';
                    ctx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);

                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '24px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(
                        '🏡 แผนผังสวนบ้าน',
                        fallbackCanvas.width / 2,
                        fallbackCanvas.height / 2 - 40
                    );
                    ctx.fillText(
                        '(ไม่สามารถสร้างภาพแผนที่ได้)',
                        fallbackCanvas.width / 2,
                        fallbackCanvas.height / 2
                    );
                    ctx.fillText(
                        'กรุณาใช้ screenshot แทน',
                        fallbackCanvas.width / 2,
                        fallbackCanvas.height / 2 + 40
                    );

                    return fallbackCanvas.toDataURL('image/jpeg', 0.8);
                }
            } catch (fallbackError) {
                console.error('🏡 การสร้างภาพ fallback ล้มเหลว:', fallbackError);
            }

            return null;
        }
    };

    const handleEquipmentCalculation = useCallback(async () => {
        try {
            console.log('🏡 กดปุ่มคำนวณอุปกรณ์ Home Garden');
            setIsCreatingImage(true);

            // สร้างหน้าต่างโหลด
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'garden-image-loading';
            loadingDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 20px;
                border-radius: 10px;
                z-index: 10000;
                text-align: center;
            `;
            loadingDiv.innerHTML = `
                <div>🏡 กำลังเตรียมข้อมูลสวนบ้าน...</div>
                <div style="margin-top: 10px; font-size: 12px;">กรุณารอสักครู่</div>
            `;
            document.body.appendChild(loadingDiv);

            console.log('🏡 ข้อมูลสวน:', {
                hasData: !!gardenData,
                zones: gardenData?.gardenZones?.length || 0,
                sprinklers: gardenData?.sprinklers?.length || 0,
                designMode: gardenData?.designMode,
            });

            // บันทึกข้อมูลลง localStorage
            if (gardenData) {
                localStorage.setItem('garden_planner_data', JSON.stringify(gardenData));
                console.log('🏡 บันทึกข้อมูลสวนแล้ว');
            }

            if (statistics) {
                localStorage.setItem('garden_statistics', JSON.stringify(statistics));
                console.log('🏡 บันทึกสถิติแล้ว:', {
                    totalArea: statistics.totalArea,
                    zones: statistics.totalZones,
                    sprinklers: statistics.totalSprinklers,
                });
            }

            // สร้างภาพแผนที่
            const imageUrl = await createMapImage();

            if (imageUrl) {
                localStorage.setItem('projectMapImage', imageUrl);
                localStorage.setItem('projectType', 'home-garden');
                console.log('🏡 บันทึกภาพแผนที่สำเร็จ');

                // ลบหน้าต่างโหลด
                document.body.removeChild(loadingDiv);

                // ไปหน้า product
                window.location.href = '/product?mode=garden';
            } else {
                // ลบหน้าต่างโหลด
                document.body.removeChild(loadingDiv);

                console.log('🏡 ไม่สามารถสร้างภาพได้ แต่จะไปหน้า product ต่อไป');

                // ไปหน้า product แม้ไม่มีรูป
                router.visit('/product?mode=garden');
            }
        } catch (error) {
            console.error('🏡 Error navigating to equipment calculation:', error);
            setError('เกิดข้อผิดพลาดในการไปยังหน้าคำนวณอุปกรณ์');

            // ลบหน้าต่างโหลดถ้าไม่ได้ลบแล้ว
            const loadingDiv = document.getElementById('garden-image-loading');
            if (loadingDiv) {
                document.body.removeChild(loadingDiv);
            }
        } finally {
            setIsCreatingImage(false);
        }
    }, [gardenData, statistics]);

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
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleEquipmentCalculation}
                                    disabled={isCreatingImage}
                                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="คำนวณอุปกรณ์สำหรับสวนบ้าน"
                                >
                                    {isCreatingImage ? (
                                        <>
                                            <svg
                                                className="mr-2 inline h-4 w-4 animate-spin"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            กำลังเตรียม...
                                        </>
                                    ) : (
                                        '💰 คำนวณอุปกรณ์'
                                    )}
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
                                    <div
                                        ref={mapContainerRef}
                                        id="map-container"
                                        className="h-full"
                                    >
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
