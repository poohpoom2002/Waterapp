// resources/js/components/homegarden/MapDesigner.tsx
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
    MapContainer,
    TileLayer,
    FeatureGroup,
    LayersControl,
    useMap,
    Polygon,
    Marker,
    Polyline,
    Circle,
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';

// Type definitions
interface SearchResult {
    place_id: string;
    display_name: string;
    type: string;
    lat: string;
    lon: string;
}

interface DrawEvent {
    layer: L.Layer;
    layerType: string;
    target: L.Map;
}

interface EditedEvent {
    layers: L.LayerGroup;
    target: L.Map;
}

interface DeletedEvent {
    layers: L.LayerGroup;
    target: L.Map;
}

interface LeafletMouseEvent extends L.LeafletMouseEvent {
    latlng: L.LatLng;
}

interface DragEndEvent {
    target: {
        getLatLng: () => L.LatLng;
    };
}

interface MainPipe {
    points: Coordinate[];
}

import {
    Coordinate,
    GardenZone,
    Sprinkler,
    WaterSource,
    Pipe,
    ZONE_TYPES,
    isPointInPolygon,
    calculateDistance,
    calculatePolygonArea,
    formatArea,
    clipCircleToPolygon,
} from '../../utils/homeGardenData';

interface MapDesignerProps {
    gardenZones: GardenZone[];
    sprinklers: Sprinkler[];
    waterSource: WaterSource | null;
    pipes: Pipe[];
    mainPipe: MainPipe | null;
    selectedZoneType: string;
    editMode: string;
    manualSprinklerType: string;
    manualSprinklerRadius: number;
    selectedSprinkler: string | null;
    selectedPipes: Set<string>;
    selectedSprinklersForPipe: string[];
    mainPipeDrawing: Coordinate[];
    onZoneCreated: (e: DrawEvent) => void;
    onZoneDeleted: (e: DrawEvent) => void;
    onSprinklerPlaced: (position: Coordinate) => void;
    onWaterSourcePlaced: (position: Coordinate) => void;
    onMainPipeClick: (e: LeafletMouseEvent) => void;
    onSprinklerClick: (sprinklerId: string) => void;
    onSprinklerDelete: (sprinklerId: string) => void;
    onSprinklerDragged: (sprinklerId: string, position: Coordinate) => void;
    onWaterSourceDelete: () => void;
    onPipeClick: (pipeId: string) => void;
    onMapClick: (e: LeafletMouseEvent) => void;
    searchQuery: string;
    searchResults: SearchResult[];
    isSearching: boolean;
    showSearchResults: boolean;
    onSearchChange: (value: string) => void;
    onSearchResultClick: (result: SearchResult) => void;
    onClearSearch: () => void;
    mapCenter: [number, number];
}

const MapController: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom }) => {
    const map = useMap();

    useEffect(() => {
        if (map && center) {
            map.flyTo(center, zoom || map.getZoom(), {
                animate: false,
                duration: 0.1,
            });

            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    }, [center, map, zoom]);

    return null;
};

const MapSearchBox: React.FC<{
    searchQuery: string;
    searchResults: SearchResult[];
    isSearching: boolean;
    showSearchResults: boolean;
    onSearchChange: (value: string) => void;
    onResultClick: (result: SearchResult) => void;
    onClear: () => void;
}> = ({
    searchQuery,
    searchResults,
    isSearching,
    showSearchResults,
    onSearchChange,
    onResultClick,
    onClear,
}) => {
    return (
        <div className="absolute left-14 top-4 z-[1000] w-[380px] max-w-[calc(100vw-2rem)] rounded-lg border border-gray-600 bg-gray-800/95 shadow-xl backdrop-blur">
            <div className="relative">
                <input
                    type="text"
                    placeholder="🔍 ค้นหาสถานที่... (เช่น ถนน, ตำบล, อำเภอ, จังหวัด)"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-800/95 px-4 py-3 pr-10 text-sm text-white placeholder-gray-400 shadow-xl backdrop-blur focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                    <button
                        onClick={onClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 transition-colors hover:text-white"
                    >
                        ✕
                    </button>
                )}
                {isSearching && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 transform">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                    </div>
                )}
            </div>

            {showSearchResults && searchResults.length > 0 && (
                <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-600 bg-gray-800/95 shadow-xl backdrop-blur">
                    {searchResults.map((result) => (
                        <button
                            key={result.place_id}
                            onClick={() => onResultClick(result)}
                            className="w-full border-b border-gray-700 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-700/70"
                        >
                            <div className="text-sm font-medium text-white">
                                {result.display_name.split(',')[0]}
                            </div>
                            <div className="truncate text-xs text-gray-400">
                                {result.display_name}
                            </div>
                            <div className="mt-1 text-xs text-blue-400">
                                📍 {result.type} • คลิกเพื่อไปยังตำแหน่ง
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showSearchResults &&
                searchResults.length === 0 &&
                !isSearching &&
                searchQuery.length >= 3 && (
                    <div className="mt-1 rounded-lg border border-gray-600 bg-gray-800/95 shadow-xl backdrop-blur">
                        <div className="px-4 py-3 text-sm text-gray-400">
                            ไม่พบผลการค้นหาสำหรับ "{searchQuery}"
                        </div>
                    </div>
                )}
        </div>
    );
};

// Helper function to create intersection polygon between circle and zone
const createCircleZoneIntersection = (
    center: Coordinate,
    radius: number,
    zoneCoordinates: Coordinate[]
): Coordinate[] => {
    const intersectionPoints: Coordinate[] = [];
    const numCirclePoints = 64; // High resolution for smooth circle

    // Generate circle points
    for (let i = 0; i < numCirclePoints; i++) {
        const angle = (i * 2 * Math.PI) / numCirclePoints;
        const lat = center.lat + (radius / 111000) * Math.cos(angle);
        const lng =
            center.lng +
            (radius / (111000 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(angle);
        const circlePoint = { lat, lng };

        // Only include points inside the zone
        if (isPointInPolygon(circlePoint, zoneCoordinates)) {
            intersectionPoints.push(circlePoint);
        }
    }

    // Add zone vertices that are inside the circle
    zoneCoordinates.forEach((vertex) => {
        const distance = calculateDistance(center, vertex);
        if (distance <= radius) {
            intersectionPoints.push(vertex);
        }
    });

    // Sort points to form a proper polygon
    if (intersectionPoints.length >= 3) {
        // Calculate centroid
        const centroidLat =
            intersectionPoints.reduce((sum, p) => sum + p.lat, 0) / intersectionPoints.length;
        const centroidLng =
            intersectionPoints.reduce((sum, p) => sum + p.lng, 0) / intersectionPoints.length;

        // Sort by angle from centroid
        intersectionPoints.sort((a, b) => {
            const angleA = Math.atan2(a.lat - centroidLat, a.lng - centroidLng);
            const angleB = Math.atan2(b.lat - centroidLat, b.lng - centroidLng);
            return angleA - angleB;
        });
    }

    return intersectionPoints;
};

const createSprinklerIcon = (
    sprinkler: { color: string; icon: string },
    isSelected: boolean = false,
    orientation?: number
) => {
    const selectedClass = isSelected ? 'ring-4 ring-yellow-400 ring-opacity-80' : '';
    const rotationStyle = orientation ? `transform: rotate(${orientation}deg);` : '';
    const shadowStyle = 'filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));';

    return L.divIcon({
        html: `<div class="flex items-center justify-center w-6 h-6 rounded-full ${selectedClass} shadow-lg text-lg transform transition-all duration-200 ${isSelected ? 'scale-110' : ''}" style="border-color: ${sprinkler.color}; ${rotationStyle} ${shadowStyle}">${sprinkler.icon}</div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
    });
};

const createWaterSourceIcon = (type: 'main' | 'pump') =>
    L.divIcon({
        html: `<div class="flex items-center justify-center w-8 h-8 ${type === 'pump' ? 'bg-red-500' : 'bg-blue-600'} border-2 border-white rounded-full shadow-xl text-white text-lg font-bold" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.7));">${type === 'pump' ? '⚡' : '🚰'}</div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });

const MapDesigner: React.FC<MapDesignerProps> = ({
    gardenZones,
    sprinklers,
    waterSource,
    pipes,
    mainPipe,
    editMode,
    selectedSprinkler,
    selectedPipes,
    selectedSprinklersForPipe,
    mainPipeDrawing,
    onZoneCreated,
    onZoneDeleted,
    onSprinklerClick,
    onSprinklerDelete,
    onSprinklerDragged,
    onWaterSourceDelete,
    onPipeClick,
    onMapClick,
    searchQuery,
    searchResults,
    isSearching,
    showSearchResults,
    onSearchChange,
    onSearchResultClick,
    onClearSearch,
    mapCenter,
}) => {
    const featureGroupRef = useRef<L.FeatureGroup>(null);
    const mapRef = useRef<L.Map>(null);

    // EXACT SAME LOGIC as ImageDesigner renderSprinklerRadius - adapted for Map
    const renderSprinklerRadius = useCallback(
        (sprinkler: Sprinkler, isSelected: boolean, debugMode = false): JSX.Element | null => {
            if (!sprinkler.position) {
                if (debugMode) {
                    console.log(`❌ Cannot render radius for ${sprinkler.id}: no position`);
                }
                return null;
            }

            const zone = gardenZones.find((z) => z.id === sprinkler.zoneId);

            if (debugMode) {
                console.log(`🎯 MapDesigner - Sprinkler ${sprinkler.id}:`, {
                    radius: sprinkler.type.radius,
                    zoneId: sprinkler.zoneId,
                    hasZone: !!zone,
                    position: sprinkler.position,
                });
            }

            try {
                // Virtual zone or no zone - show dashed circle EXACTLY like ImageDesigner
                if (
                    !zone ||
                    !zone.coordinates ||
                    zone.coordinates.length < 3 ||
                    sprinkler.zoneId === 'virtual_zone'
                ) {
                    return (
                        <Circle
                            key={`radius-${sprinkler.id}`}
                            center={[sprinkler.position.lat, sprinkler.position.lng]}
                            radius={sprinkler.type.radius}
                            pathOptions={{
                                color: isSelected ? '#FFD700' + '80' : sprinkler.type.color + '80',
                                fillColor: isSelected
                                    ? '#FFD700' + '26'
                                    : sprinkler.type.color + '26',
                                fillOpacity: isSelected ? 0.5 : 0.5,
                                weight: 2,
                                opacity: isSelected ? 0.8 : 0.6,
                                dashArray: sprinkler.zoneId === 'virtual_zone' ? '8,4' : '0',
                            }}
                        />
                    );
                }

                // For forbidden zones, don't show radius EXACTLY like ImageDesigner
                if (zone.type === 'forbidden') {
                    return null;
                }

                // Calculate clipped radius using EXACT same logic as ImageDesigner
                const clipResult = clipCircleToPolygon(
                    sprinkler.position,
                    sprinkler.type.radius,
                    zone.coordinates
                );

                if (clipResult === 'FULL_CIRCLE') {
                    return (
                        <Circle
                            key={`radius-${sprinkler.id}`}
                            center={[sprinkler.position.lat, sprinkler.position.lng]}
                            radius={sprinkler.type.radius}
                            pathOptions={{
                                color: isSelected ? '#FFD700' + '80' : sprinkler.type.color + '80',
                                fillColor: isSelected
                                    ? '#FFD700' + '26'
                                    : sprinkler.type.color + '26',
                                fillOpacity: isSelected ? 0.3 : 0.2,
                                weight: 2,
                                opacity: isSelected ? 0.8 : 0.6,
                            }}
                        />
                    );
                } else if (clipResult === 'MASKED_CIRCLE') {
                    // Create intersection polygon like ImageDesigner clipPath
                    const intersectionPolygon = createCircleZoneIntersection(
                        sprinkler.position,
                        sprinkler.type.radius,
                        zone.coordinates
                    );

                    if (intersectionPolygon.length >= 3) {
                        return (
                            <React.Fragment key={`radius-${sprinkler.id}`}>
                                {/* Show only the intersection area - EXACTLY like ImageDesigner clipPath */}
                                <Polygon
                                    positions={intersectionPolygon.map((p) => [p.lat, p.lng])}
                                    pathOptions={{
                                        color: isSelected
                                            ? '#FFD700' + '80'
                                            : sprinkler.type.color + '80',
                                        fillColor: isSelected
                                            ? '#FFD700' + '26'
                                            : sprinkler.type.color + '26',
                                        fillOpacity: isSelected ? 0.3 : 0.2,
                                        weight: 2,
                                        opacity: isSelected ? 0.8 : 0.6,
                                    }}
                                />

                                {/* Zone boundary indicator EXACTLY like ImageDesigner */}
                                <Polygon
                                    positions={zone.coordinates.map((p) => [p.lat, p.lng])}
                                    pathOptions={{
                                        color: isSelected
                                            ? '#FFD700' + '60'
                                            : sprinkler.type.color + '60',
                                        fillColor: 'none',
                                        fillOpacity: 0,
                                        weight: 1,
                                        opacity: 0.4,
                                        dashArray: '3,3',
                                    }}
                                />
                            </React.Fragment>
                        );
                    } else {
                        // Fallback to no coverage if intersection failed
                        return (
                            <Circle
                                key={`radius-${sprinkler.id}`}
                                center={[sprinkler.position.lat, sprinkler.position.lng]}
                                radius={sprinkler.type.radius}
                                pathOptions={{
                                    color: isSelected
                                        ? '#FFD700' + '40'
                                        : sprinkler.type.color + '40',
                                    fillColor: 'none',
                                    fillOpacity: 0,
                                    weight: 1,
                                    opacity: isSelected ? 0.8 : 0.5,
                                    dashArray: '5,5',
                                }}
                            />
                        );
                    }
                } else if (Array.isArray(clipResult) && clipResult.length >= 3) {
                    const coordinates = clipResult as Coordinate[];
                    return (
                        <Polygon
                            key={`radius-${sprinkler.id}`}
                            positions={coordinates.map((p) => [p.lat, p.lng])}
                            pathOptions={{
                                color: isSelected ? '#FFD700' + '80' : sprinkler.type.color + '80',
                                fillColor: isSelected
                                    ? '#FFD700' + '26'
                                    : sprinkler.type.color + '26',
                                fillOpacity: isSelected ? 0.3 : 0.2,
                                weight: 2,
                                opacity: isSelected ? 0.8 : 0.6,
                            }}
                        />
                    );
                } else {
                    // No coverage - show dashed circle EXACTLY like ImageDesigner
                    return (
                        <Circle
                            key={`radius-${sprinkler.id}`}
                            center={[sprinkler.position.lat, sprinkler.position.lng]}
                            radius={sprinkler.type.radius}
                            pathOptions={{
                                color: isSelected ? '#FFD700' + '40' : sprinkler.type.color + '40',
                                fillColor: 'none',
                                fillOpacity: 0,
                                weight: 1,
                                opacity: isSelected ? 0.8 : 0.5,
                                dashArray: '5,5',
                            }}
                        />
                    );
                }
            } catch (error) {
                console.error('Error rendering sprinkler radius:', error);
                return null;
            }
        },
        [gardenZones]
    );

    // Calculate coverage statistics
    const coverageStats = useMemo(() => {
        let totalCoveredArea = 0;
        let totalZoneArea = 0;
        const zoneStats: { [key: string]: { covered: number; total: number; efficiency: number } } =
            {};

        gardenZones.forEach((zone) => {
            if (
                zone.type === 'forbidden' ||
                zone.parentZoneId ||
                !zone.coordinates ||
                zone.coordinates.length < 3
            ) {
                return;
            }

            const zoneArea = calculatePolygonArea(zone.coordinates);
            totalZoneArea += zoneArea;

            const zoneSprinklers = sprinklers.filter((s) => s.zoneId === zone.id);
            let coveredArea = 0;

            // Calculate unique covered area (avoiding overlap)
            const cellSize = 0.5; // 0.5m grid for coverage calculation
            const cellsPerMeter = 1 / cellSize;
            const coverageGrid = new Set<string>();

            zoneSprinklers.forEach((sprinkler) => {
                const radiusInCells = Math.ceil(sprinkler.type.radius * cellsPerMeter);

                // Check each cell in the sprinkler's radius
                for (let dx = -radiusInCells; dx <= radiusInCells; dx++) {
                    for (let dy = -radiusInCells; dy <= radiusInCells; dy++) {
                        const distance = Math.sqrt(dx * dx + dy * dy) * cellSize;
                        if (distance <= sprinkler.type.radius) {
                            const lat = sprinkler.position.lat + (dy * cellSize) / 111000;
                            const lng =
                                sprinkler.position.lng +
                                (dx * cellSize) /
                                    (111000 * Math.cos((sprinkler.position.lat * Math.PI) / 180));

                            // Check if this point is inside the zone
                            if (isPointInPolygon({ lat, lng }, zone.coordinates)) {
                                const cellKey = `${Math.floor(lat / cellSize)}:${Math.floor(lng / cellSize)}`;
                                coverageGrid.add(cellKey);
                            }
                        }
                    }
                }
            });

            coveredArea = coverageGrid.size * cellSize * cellSize;
            totalCoveredArea += coveredArea;

            const efficiency = zoneArea > 0 ? (coveredArea / zoneArea) * 100 : 0;
            zoneStats[zone.id] = {
                covered: coveredArea,
                total: zoneArea,
                efficiency: Math.min(100, efficiency),
            };
        });

        const overallEfficiency = totalZoneArea > 0 ? (totalCoveredArea / totalZoneArea) * 100 : 0;

        return {
            totalCovered: totalCoveredArea,
            totalArea: totalZoneArea,
            overallEfficiency: Math.min(100, overallEfficiency),
            zoneStats,
        };
    }, [gardenZones, sprinklers]);

    useEffect(() => {
        if (featureGroupRef.current && gardenZones.length === 0) {
            featureGroupRef.current.clearLayers();
        }
    }, [gardenZones]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || editMode === 'draw') return;

        const clickHandler = (e: LeafletMouseEvent) => onMapClick(e);
        map.on('click', clickHandler);

        return () => {
            map.off('click', clickHandler);
        };
    }, [onMapClick, editMode]);

    const handleZoneEdited = useCallback((e: EditedEvent) => {
        console.log('Zone edited:', e);
    }, []);

    const handleZoneDeleted = useCallback((e: DeletedEvent) => {
        console.log('Zone deleted:', e);
    }, []);

    return (
        <>
            <MapSearchBox
                searchQuery={searchQuery}
                searchResults={searchResults}
                isSearching={isSearching}
                showSearchResults={showSearchResults}
                onSearchChange={onSearchChange}
                onResultClick={onSearchResultClick}
                onClear={onClearSearch}
            />

            {/* Coverage Statistics Overlay */}
            {coverageStats && sprinklers.length > 0 && (
                <div className="absolute bottom-4 left-4 z-[1000] max-w-sm rounded-lg bg-black/80 p-4 text-white">
                    <h4 className="mb-2 text-sm font-bold text-blue-400">📊 สถิติการครอบคลุม</h4>
                    <div className="space-y-1 text-xs">
                        <div>🏡 พื้นที่รวม: {formatArea(coverageStats.totalArea)}</div>
                        <div>💧 พื้นที่ครอบคลุม: {formatArea(coverageStats.totalCovered)}</div>
                        <div
                            className={`font-bold ${
                                coverageStats.overallEfficiency >= 80
                                    ? 'text-green-400'
                                    : coverageStats.overallEfficiency >= 60
                                      ? 'text-yellow-400'
                                      : 'text-red-400'
                            }`}
                        >
                            ⚡ ประสิทธิภาพ: {coverageStats.overallEfficiency.toFixed(1)}%
                        </div>

                        <div className="mt-2 border-t border-gray-600 pt-2">
                            <div className="mb-1 font-medium text-gray-300">รายโซน:</div>
                            {Object.entries(coverageStats.zoneStats)
                                .slice(0, 3)
                                .map(([zoneId, stats]) => {
                                    const zone = gardenZones.find((z) => z.id === zoneId);
                                    if (!zone) return null;
                                    return (
                                        <div key={zoneId} className="flex justify-between">
                                            <span className="truncate">{zone.name}:</span>
                                            <span
                                                className={`font-bold ${
                                                    stats.efficiency >= 80
                                                        ? 'text-green-400'
                                                        : stats.efficiency >= 60
                                                          ? 'text-yellow-400'
                                                          : 'text-red-400'
                                                }`}
                                            >
                                                {stats.efficiency.toFixed(1)}%
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}

            <MapContainer
                center={mapCenter}
                zoom={16}
                maxZoom={22}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                ref={mapRef}
            >
                <MapController center={mapCenter} />
                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="ภาพถ่ายดาวเทียม">
                        <TileLayer
                            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                            attribution="Google Maps"
                            maxNativeZoom={22}
                            maxZoom={22}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="แผนที่ถนน">
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="OpenStreetMap"
                            maxNativeZoom={19}
                            maxZoom={22}
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>

                {/* Render Zones */}
                {[...gardenZones]
                    .sort((a, b) => {
                        if (a.parentZoneId && !b.parentZoneId) return 1;
                        if (!a.parentZoneId && b.parentZoneId) return -1;
                        return 0;
                    })
                    .map((zone) => {
                        const zoneType = ZONE_TYPES.find((z) => z.id === zone.type);
                        const isNestedZone = !!zone.parentZoneId;
                        return (
                            <Polygon
                                key={zone.id}
                                positions={zone.coordinates.map((c) => [c.lat, c.lng])}
                                pathOptions={{
                                    color: zoneType?.color || '#666',
                                    fillColor: zoneType?.color || '#666',
                                    fillOpacity:
                                        zone.type === 'forbidden' ? 0.5 : isNestedZone ? 0.6 : 0.25,
                                    weight: isNestedZone ? 3 : 2,
                                    dashArray:
                                        zone.type === 'forbidden'
                                            ? '10,10'
                                            : isNestedZone
                                              ? '5,5'
                                              : undefined,
                                }}
                            />
                        );
                    })}

                {/* Main Pipe Drawing */}
                {mainPipeDrawing.length > 0 && (
                    <Polyline
                        positions={mainPipeDrawing.map((p) => [p.lat, p.lng])}
                        pathOptions={{
                            color: '#60A5FA',
                            weight: 8,
                            opacity: 0.8,
                            dashArray: '15,10',
                        }}
                    />
                )}

                {/* Main Pipe */}
                {mainPipe && (
                    <Polyline
                        positions={mainPipe.points.map((p) => [p.lat, p.lng])}
                        pathOptions={{
                            color: '#3B82F6',
                            weight: 10,
                            opacity: 0.9,
                        }}
                    />
                )}

                {/* Sprinkler Coverage Areas - EXACT SAME LOGIC as ImageDesigner/CanvasDesigner */}
                {sprinklers.map((sprinkler) => {
                    const isSelected =
                        selectedSprinkler === sprinkler.id ||
                        selectedSprinklersForPipe.includes(sprinkler.id);
                    return renderSprinklerRadius(sprinkler, isSelected, false);
                })}

                {/* Sprinkler Markers - Enhanced with better icons */}
                {sprinklers.map((sprinkler) => (
                    <Marker
                        key={`marker-${sprinkler.id}`}
                        position={[sprinkler.position.lat, sprinkler.position.lng]}
                        icon={createSprinklerIcon(
                            sprinkler.type,
                            selectedSprinkler === sprinkler.id ||
                                selectedSprinklersForPipe.includes(sprinkler.id),
                            sprinkler.orientation
                        )}
                        draggable={editMode === 'drag-sprinkler'}
                        eventHandlers={{
                            click: () => onSprinklerClick(sprinkler.id),
                            contextmenu: () => onSprinklerDelete(sprinkler.id),
                            dragstart: () => onSprinklerClick(sprinkler.id),
                            dragend: (e: DragEndEvent) => {
                                const { lat, lng } = e.target.getLatLng();
                                onSprinklerDragged(sprinkler.id, { lat, lng });
                            },
                        }}
                    />
                ))}

                {/* Water Source - Enhanced icon */}
                {waterSource && (
                    <Marker
                        position={[waterSource.position.lat, waterSource.position.lng]}
                        icon={createWaterSourceIcon(waterSource.type)}
                        eventHandlers={{
                            contextmenu: onWaterSourceDelete,
                        }}
                    />
                )}

                {/* Submain Pipes - Enhanced styling */}
                {pipes
                    .filter((p) => p.type === 'pipe')
                    .map((pipe) => (
                        <Polyline
                            key={pipe.id}
                            positions={[
                                [pipe.start.lat, pipe.start.lng],
                                [pipe.end.lat, pipe.end.lng],
                            ]}
                            pathOptions={{
                                color: selectedPipes.has(pipe.id) ? '#FBBF24' : '#8B5CF6',
                                weight: selectedPipes.has(pipe.id) ? 8 : 5,
                                opacity: 0.9,
                            }}
                            eventHandlers={{
                                click: () => onPipeClick(pipe.id),
                            }}
                        />
                    ))}

                {/* Lateral Pipes - Enhanced styling */}
                {pipes
                    .filter((p) => p.type === 'pipe')
                    .map((pipe) => (
                        <Polyline
                            key={pipe.id}
                            positions={[
                                [pipe.start.lat, pipe.start.lng],
                                [pipe.end.lat, pipe.end.lng],
                            ]}
                            pathOptions={{
                                color: selectedPipes.has(pipe.id) ? '#FBBF24' : '#FFFF00',
                                weight: selectedPipes.has(pipe.id) ? 5 : 3,
                                opacity: 0.8,
                            }}
                            eventHandlers={{
                                click: () => onPipeClick(pipe.id),
                            }}
                        />
                    ))}

                {/* Edit Control for Drawing */}
                {editMode === 'draw' && (
                    <FeatureGroup ref={featureGroupRef}>
                        <EditControl
                            position="topleft"
                            onCreated={onZoneCreated}
                            onEdited={handleZoneEdited}
                            onDeleted={handleZoneDeleted}
                            draw={{
                                rectangle: true,
                                circle: false,
                                circlemarker: false,
                                marker: false,
                                polyline: false,
                                polygon: true,
                            }}
                            edit={{
                                edit: false,
                                remove: true,
                            }}
                        />
                    </FeatureGroup>
                )}
            </MapContainer>
        </>
    );
};

export default MapDesigner;
