/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { useLanguage } from '../contexts/LanguageContext';
import HorticultureMapComponent from '../components/horticulture/HorticultureMapComponent';
import HeadLossCalculationModal, { HeadLossResult } from '../components/horticulture/HeadLossCalculationModal';
import SprinklerConfigModal from '../components/horticulture/SprinklerConfigModal';

import {
    HorticultureProjectData,
    ProjectSummaryData,
    calculateProjectSummary,
    formatAreaInRai,
    formatDistance,
    formatWaterVolume,
    loadProjectData,
    navigateToPlanner,
    isPointInPolygon,
} from '../utils/horticultureUtils';

import { IrrigationZone } from '../utils/irrigationZoneUtils';

import { 
    getProjectStats, 
    getOverallStats,
    getPipeStats
} from '../utils/horticultureProjectStats';

// Helper function to calculate distance between two coordinates
const calculateDistance = (coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

// Helper function to calculate total pipe length from coordinates
const calculatePipeLength = (coordinates: { lat: number; lng: number }[]): number => {
    if (!coordinates || coordinates.length < 2) return 0;
    
    let totalLength = 0;
    for (let i = 1; i < coordinates.length; i++) {
        totalLength += calculateDistance(coordinates[i-1], coordinates[i]);
    }
    return totalLength;
};

import {
    loadSprinklerConfig,
    SprinklerConfig,
    calculateTotalFlowRate,
    calculateHourlyFlowRate,
    formatFlowRate,
    formatFlowRatePerHour
} from '../utils/sprinklerUtils';

import { 
    AutoZoneResult,
    createAutomaticZones,
    validateZones
} from '../utils/autoZoneUtils';

const ZONE_COLORS = [
    '#FF69B4', 
    '#00CED1', 
    '#32CD32', 
    '#FFD700', 
    '#FF6347', 
    '#9370DB', 
    '#20B2AA', 
    '#FF1493', 
    '#00FA9A', 
    '#FFA500', 
];

const EXCLUSION_COLORS = {
    building: '#F59E0B',
    powerplant: '#EF4444',
    river: '#3B82F6',
    road: '#6B7280',
    other: '#8B5CF6',
};



const getExclusionTypeName = (type: string, t: (key: string) => string): string => {
    switch (type) {
        case 'building': return t('สิ่งก่อสร้าง');
        case 'powerplant': return t('โรงไฟฟ้า');
        case 'river': return t('แหล่งน้ำ');
        case 'road': return t('ถนน');
        case 'other': return t('อื่นๆ');
        default: return t('พื้นที่หลีกเลี่ยง');
    }
};

const getZoneColor = (index: number): string => {
    return ZONE_COLORS[index % ZONE_COLORS.length];
};

const getPolygonCenter = (coordinates: Coordinate[]): Coordinate => {
    if (coordinates.length === 0) return { lat: 0, lng: 0 };
    
    const totalLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0);
    const totalLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0);
    
    return {
        lat: totalLat / coordinates.length,
        lng: totalLng / coordinates.length
    };
};

const calculateDistanceBetweenPoints = (point1: Coordinate, point2: Coordinate): number => {
    const R = 6371e3;
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
};

const isPointsClose = (point1: Coordinate, point2: Coordinate, threshold: number = 5): boolean => {
    const distance = calculateDistanceBetweenPoints(point1, point2);
    return distance <= threshold;
};





const findClosestPointOnLineSegment = (
    point: Coordinate,
    lineStart: Coordinate,
    lineEnd: Coordinate
): Coordinate => {
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return lineStart;
    
    const param = dot / lenSq;
    
    if (param < 0) {
        return lineStart;
    } else if (param > 1) {
        return lineEnd;
    } else {
        return {
            lat: lineStart.lat + param * C,
            lng: lineStart.lng + param * D
        };
    }
};





const createAreaTextOverlay = (
    map: google.maps.Map,
    coordinates: Coordinate[],
    labelText: string,
    color: string
): google.maps.OverlayView => {
    const center = getPolygonCenter(coordinates);
    
    class TextOverlay extends google.maps.OverlayView {
        private position: google.maps.LatLng;
        private text: string;
        private color: string;
        private div?: HTMLDivElement;

        constructor(position: google.maps.LatLng, text: string, color: string) {
            super();
            this.position = position;
            this.text = text;
            this.color = color;
        }

        onAdd() {
            this.div = document.createElement('div');
            this.div.style.position = 'absolute';
            this.div.style.fontSize = '10px';
            this.div.style.fontWeight = 'normal';
            this.div.style.color = "black";
            this.div.style.textShadow = `
                -1px -1px 0 rgba(255,255,255,0.8),
                1px -1px 0 rgba(255,255,255,0.8),
                -1px 1px 0 rgba(255,255,255,0.8),
                1px 1px 0 rgba(255,255,255,0.8),
                0 0 3px rgba(255,255,255,0.5)
            `;
            this.div.style.pointerEvents = 'none';
            this.div.style.userSelect = 'none';
            this.div.style.opacity = '0.6';
            this.div.style.whiteSpace = 'wrap';
            this.div.style.textAlign = 'center';
            this.div.style.transform = 'translate(-50%, -50%)';
            this.div.innerHTML = this.text;

            const panes = this.getPanes();
            if (panes) {
                panes.overlayLayer.appendChild(this.div);
            }
        }

        draw() {
            if (this.div) {
                const overlayProjection = this.getProjection();
                if (overlayProjection) {
                    const position = overlayProjection.fromLatLngToDivPixel(this.position);
                    if (position) {
                        this.div.style.left = position.x + 'px';
                        this.div.style.top = position.y + 'px';
                    }
                }
            }
        }

        onRemove() {
            if (this.div && this.div.parentNode) {
                this.div.parentNode.removeChild(this.div);
                this.div = undefined;
            }
        }
    }

    const overlay = new TextOverlay(
        new google.maps.LatLng(center.lat, center.lng),
        labelText,
        color
    );
    
    overlay.setMap(map);
    return overlay;
};

interface Coordinate {
    lat: number;
    lng: number;
}

interface Zone {
    id: string;
    name: string;
    coordinates: Coordinate[];
    plantData: any;
    plantCount: number;
    totalWaterNeed: number;
    area: number;
    color: string;
}

interface MainPipe {
    id: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
}

interface SubMainPipe {
    id: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    branchPipes: BranchPipe[];
}

interface BranchPipe {
    id: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    plants: any[];
}

interface PlantLocation {
    id: string;
    position: Coordinate;
    plantData: any;
    rotationAngle?: number;
    zoneId?: string;
    plantAreaId?: string;
    plantAreaColor?: string;
}

interface ExclusionArea {
    id: string;
    type: string;
    coordinates: Coordinate[];
    color: string;
    name?: string;
    description?: string;
}

interface LateralPipe {
    id: string;
    coordinates: Coordinate[];
    length: number;
    plants: PlantLocation[];
    placementMode: 'over_plants' | 'between_plants';
    totalFlowRate: number;
    connectionPoint: Coordinate;
    emitterLines?: {
        id: string;
        lateralPipeId: string;
        plantId: string;
        coordinates: Coordinate[];
        length: number;
        diameter: number;
        emitterType?: string;
    }[];
}

interface IrrigationZoneExtended extends IrrigationZone {
    area?: number;
    plantSpacing?: number;
    rowSpacing?: number;
}

interface EnhancedProjectData extends HorticultureProjectData {
    irrigationZones?: IrrigationZoneExtended[];
    lateralPipes?: LateralPipe[];
    headLossResults?: HeadLossResult[];
    sprinklerConfig?: SprinklerConfig;
    plantRotation?: number;
    autoZoneConfig?: {
        numberOfZones: number;
        balanceWaterNeed: boolean;
        paddingMeters: number;
        useVoronoi: boolean;
    };
}

const GoogleMapsResultsOverlays: React.FC<{
    map: google.maps.Map | null;
    projectData: EnhancedProjectData;
    mapRotation: number;
    pipeSize: number;
    iconSize: number;
    irrigationZones: IrrigationZoneExtended[];
    lateralPipes: LateralPipe[];
    t: (key: string) => string;
}> = ({ map, projectData, mapRotation, pipeSize, iconSize, irrigationZones, lateralPipes, t }) => {
    const overlaysRef = useRef<{
        polygons: Map<string, google.maps.Polygon>;
        polylines: Map<string, google.maps.Polyline>;
        markers: Map<string, google.maps.Marker>;
        overlays: Map<string, google.maps.OverlayView>;
    }>({
        polygons: new Map(),
        polylines: new Map(),
        markers: new Map(),
        overlays: new Map(),
    });

    const clearOverlays = useCallback(() => {
        overlaysRef.current.polygons.forEach((polygon) => polygon.setMap(null));
        overlaysRef.current.polylines.forEach((polyline) => polyline.setMap(null));
        overlaysRef.current.markers.forEach((marker) => marker.setMap(null));
        overlaysRef.current.overlays.forEach((overlay) => overlay.setMap(null));

        overlaysRef.current.polygons.clear();
        overlaysRef.current.polylines.clear();
        overlaysRef.current.markers.clear();
        overlaysRef.current.overlays.clear();
    }, []);

    useEffect(() => {
        if (map) {
            const mapDiv = map.getDiv();
            if (mapDiv) {
                mapDiv.style.transform = `rotate(${mapRotation}deg)`;
                mapDiv.style.transformOrigin = 'center center';
            }
        }
    }, [map, mapRotation]);

    useEffect(() => {
        if (!map || !projectData) return;
        clearOverlays();

        if (projectData.mainArea && projectData.mainArea.length > 0) {
            const mainAreaPolygon = new google.maps.Polygon({
                paths: projectData.mainArea.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                fillColor: '#22C55E',
                fillOpacity: 0.1,
                strokeColor: '#22C55E',
                strokeWeight: 2 * pipeSize,
            });
            mainAreaPolygon.setMap(map);
            overlaysRef.current.polygons.set('main-area', mainAreaPolygon);
        }

        projectData.exclusionAreas?.forEach((area) => {
            const exclusionColor = EXCLUSION_COLORS[area.type as keyof typeof EXCLUSION_COLORS] || EXCLUSION_COLORS.other;
            const exclusionPolygon = new google.maps.Polygon({
                paths: area.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                fillColor: exclusionColor,
                fillOpacity: 0.4,
                strokeColor: exclusionColor,
                strokeWeight: 2 * pipeSize,
            });
            exclusionPolygon.setMap(map);
            overlaysRef.current.polygons.set(area.id, exclusionPolygon);

            const exclusionLabel = createAreaTextOverlay(
                map,
                area.coordinates,
                getExclusionTypeName(area.type, t),
                exclusionColor
            );
            overlaysRef.current.overlays.set(`exclusion-label-${area.id}`, exclusionLabel);
        });

        projectData.zones?.forEach((zone, index) => {
            const zoneColor = getZoneColor(index);
            const zonePolygon = new google.maps.Polygon({
                paths: zone.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                fillColor: zoneColor,
                fillOpacity: 0.3,
                strokeColor: zoneColor,
                strokeWeight: 3 * pipeSize,
            });
            zonePolygon.setMap(map);
            overlaysRef.current.polygons.set(zone.id, zonePolygon);

            const zoneLabel = createAreaTextOverlay(
                map,
                zone.coordinates,
                `${t('โซน')} ${index + 1}`,
                zoneColor
            );
            overlaysRef.current.overlays.set(`zone-label-${zone.id}`, zoneLabel);
        });

        if (projectData.pump) {
            const pumpMarker = new google.maps.Marker({
                position: {
                    lat: projectData.pump.position.lat,
                    lng: projectData.pump.position.lng,
                },
                map: map,
                icon: {
                    url: '/images/water-pump.png',
                    scaledSize: new google.maps.Size(24 * iconSize, 24 * iconSize),
                    anchor: new google.maps.Point(12 * iconSize, 12 * iconSize),
                },
                title: 'ปั๊มน้ำ',
            });
            overlaysRef.current.markers.set('pump', pumpMarker);
        }

        projectData.mainPipes?.forEach((pipe) => {
            const mainPipePolyline = new google.maps.Polyline({
                path: pipe.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                strokeColor: '#FF0000',
                strokeWeight: 6 * pipeSize,
                strokeOpacity: 0.9,
            });
            mainPipePolyline.setMap(map);
            overlaysRef.current.polylines.set(pipe.id, mainPipePolyline);
        });

        projectData.subMainPipes?.forEach((subMainPipe) => {
            const subMainPolyline = new google.maps.Polyline({
                path: subMainPipe.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                strokeColor: '#8B5CF6',
                strokeWeight: 4 * pipeSize,
                strokeOpacity: 0.9,
            });
            subMainPolyline.setMap(map);
            overlaysRef.current.polylines.set(subMainPipe.id, subMainPolyline);

            subMainPipe.branchPipes?.forEach((branchPipe) => {
                const branchPolyline = new google.maps.Polyline({
                    path: branchPipe.coordinates.map((coord) => ({
                        lat: coord.lat,
                        lng: coord.lng,
                    })),
                    strokeColor: '#FFD700',
                    strokeWeight: 2 * pipeSize,
                    strokeOpacity: 0.8,
                });
                branchPolyline.setMap(map);
                overlaysRef.current.polylines.set(branchPipe.id, branchPolyline);
            });
        });

        // Enhanced irrigation zones display
        irrigationZones?.forEach((zone, index) => {
            const irrigationZonePolygon = new google.maps.Polygon({
                paths: zone.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                fillColor: zone.color,
                fillOpacity: 0.2,
                strokeColor: zone.color,
                strokeWeight: 3 * pipeSize,
                strokeOpacity: 0.8,
            });
            irrigationZonePolygon.setMap(map);
            overlaysRef.current.polygons.set(`irrigation-zone-${zone.id}`, irrigationZonePolygon);

            const irrigationZoneLabel = createAreaTextOverlay(
                map,
                zone.coordinates,
                `${zone.name} (${zone.plants.length} ต้น)`,
                zone.color
            );
            overlaysRef.current.overlays.set(`irrigation-zone-label-${zone.id}`, irrigationZoneLabel);
        });

        // Lateral pipes display
        lateralPipes?.forEach((lateralPipe) => {
            const lateralPolyline = new google.maps.Polyline({
                path: lateralPipe.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                strokeColor: '#FFA500', // Orange color for lateral pipes
                strokeWeight: 3 * pipeSize,
                strokeOpacity: 0.9,
            });
            lateralPolyline.setMap(map);
            overlaysRef.current.polylines.set(`lateral-${lateralPipe.id}`, lateralPolyline);

            // Add connection point marker
            const connectionMarker = new google.maps.Marker({
                position: lateralPipe.connectionPoint,
                map: map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 4 * iconSize,
                    fillColor: '#FFA500',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                },
                title: `Lateral Connection (${lateralPipe.plants.length} plants)`,
            });
            overlaysRef.current.markers.set(`lateral-connection-${lateralPipe.id}`, connectionMarker);

            // Display emitter lines (ท่อย่อยแยก) for this lateral pipe

            if (lateralPipe.emitterLines && lateralPipe.emitterLines.length > 0) {
                lateralPipe.emitterLines.forEach((emitterLine) => {
                    const emitterPolyline = new google.maps.Polyline({
                        path: emitterLine.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                        strokeColor: '#90EE90', // Light green color for emitter lines
                        strokeWeight: 1.5 * pipeSize,
                        strokeOpacity: 0.8,
                    });
                    emitterPolyline.setMap(map);
                    overlaysRef.current.polylines.set(`emitter-${emitterLine.id}`, emitterPolyline);

                    // Add small marker at plant connection point
                    if (emitterLine.coordinates.length > 1) {
                        const plantConnectionPoint = emitterLine.coordinates[emitterLine.coordinates.length - 1];
                        const emitterMarker = new google.maps.Marker({
                            position: plantConnectionPoint,
                            map: map,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 2 * iconSize,
                                fillColor: '#90EE90',
                                fillOpacity: 1,
                                strokeColor: '#ffffff',
                                strokeWeight: 1,
                            },
                            title: `Emitter to Plant (${emitterLine.length.toFixed(1)}m)`,
                        });
                        overlaysRef.current.markers.set(`emitter-connection-${emitterLine.id}`, emitterMarker);
                    }
                });
            }
        });

        projectData.plants?.forEach((plant) => {
            // Different icons for plants in different zones
            let plantIcon = '🌳';
            let plantColor = 'white';
            
            if (plant.zoneId && irrigationZones.length > 0) {
                const zone = irrigationZones.find(z => z.id === plant.zoneId);
                if (zone) {
                    plantIcon = '🌳';  // เปลี่ยนกลับเป็นต้นไม้
                    plantColor = zone.color;
                }
            }

            const plantMarker = new google.maps.Marker({
                position: { lat: plant.position.lat, lng: plant.position.lng },
                map: map,
                icon: {
                    url:
                        'data:image/svg+xml;charset=UTF-8,' +
                        encodeURIComponent(`
                        <svg width="${16 * iconSize}" height="${16 * iconSize}" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <text x="8" y="11" text-anchor="middle" fill="${plantColor}" font-size="${12 * iconSize}" stroke="black" stroke-width="0.5">${plantIcon}</text>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(16 * iconSize, 16 * iconSize),
                    anchor: new google.maps.Point(8 * iconSize, 8 * iconSize),
                },
                title: `${plant.plantData.name} ${(plant as any).rotationAngle ? `(${(plant as any).rotationAngle.toFixed(1)}°)` : ''}`,
            });
            overlaysRef.current.markers.set(plant.id, plantMarker);
        });

        const bounds = new google.maps.LatLngBounds();
        projectData.mainArea.forEach((coord) => {
            bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
        });

        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }, [map, projectData, pipeSize, iconSize, irrigationZones, lateralPipes, clearOverlays, t]);

    useEffect(() => {
        return () => {
            clearOverlays();
        };
    }, [clearOverlays]);

    return null;
};

function EnhancedHorticultureResultsPageContent() {
    const page = usePage();
    const auth = (page.props as any).auth;
    const { t } = useLanguage();
    const [projectData, setProjectData] = useState<EnhancedProjectData | null>(null);
    const [projectSummary, setProjectSummary] = useState<ProjectSummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number]>([13.75, 100.5]);
    const [mapZoom, setMapZoom] = useState<number>(16);

    const [mapRotation, setMapRotation] = useState<number>(0);
    const [isMapLocked, setIsMapLocked] = useState<boolean>(false);
    const [pipeSize, setPipeSize] = useState<number>(1);
    const [iconSize, setIconSize] = useState<number>(1);

    const [isCreatingImage, setIsCreatingImage] = useState(false);

    // Enhanced features states
    const [showHeadLossModal, setShowHeadLossModal] = useState(false);
    const [showSprinklerConfigModal, setShowSprinklerConfigModal] = useState(false);
    const [selectedPipeForHeadLoss, setSelectedPipeForHeadLoss] = useState<{
        pipeId: string;
        pipeType: 'mainPipe' | 'subMainPipe' | 'branchPipe';
        zoneName: string;
        zoneId: string;
        length: number;
        pipeName?: string;
    } | null>(null);
    
    const [headLossResults, setHeadLossResults] = useState<HeadLossResult[]>([]);
    const [sprinklerConfig, setSprinklerConfig] = useState<SprinklerConfig | null>(null);
    const [irrigationZones, setIrrigationZones] = useState<IrrigationZoneExtended[]>([]);
    const [lateralPipes, setLateralPipes] = useState<LateralPipe[]>([]);
    const [enhancedStats, setEnhancedStats] = useState<any>(null);
    const [collapsedZones, setCollapsedZones] = useState<Set<string>>(new Set());

    const mapRef = useRef<google.maps.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const data = loadProjectData();
            if (data) {
                // Enhanced data loading - โหลด lateral pipes จากข้อมูลที่บันทึกไว้

        
        // 🔍 Debug localStorage data
        const rawProjectData = localStorage.getItem('currentHorticultureProject');
        if (rawProjectData) {
            const parsedData = JSON.parse(rawProjectData);


        }
                
                let allLateralPipes: LateralPipe[] = [];

                // 1. ลองโหลด lateralPipes ที่บันทึกไว้ก่อน (วิธีใหม่)
                if (data.lateralPipes && data.lateralPipes.length > 0) {
                    allLateralPipes = data.lateralPipes.map(lateralPipe => ({
                        id: lateralPipe.id,
                        coordinates: lateralPipe.coordinates || [],
                        length: lateralPipe.length || calculatePipeLength(lateralPipe.coordinates || []),
                        plants: lateralPipe.plants || [],
                        placementMode: lateralPipe.placementMode || 'over_plants',
                        totalFlowRate: lateralPipe.totalFlowRate || (lateralPipe.plants?.length || 0) * 2.5,
                        connectionPoint: lateralPipe.connectionPoint || (lateralPipe.coordinates?.[0] || { lat: 0, lng: 0 }),
                        emitterLines: lateralPipe.emitterLines || [] // ⚠️ เพิ่ม emitterLines ที่หายไป!
                    }));
                    
                    console.log('🎯 Lateral pipes จากข้อมูลที่บันทึก:', allLateralPipes.map(pipe => ({
                        id: pipe.id,
                        length: pipe.length.toFixed(2),
                        plantsCount: pipe.plants.length,
                        coordinates: pipe.coordinates.length
                    })));
                } 
                
                // 2. ถ้าไม่มี lateralPipes ให้ลองหาจาก subMainPipes.branchPipes (วิธีเก่า - สำรอง)
                else if (data.subMainPipes) {
                    data.subMainPipes.forEach((subMainPipe) => {

                        
                        if (subMainPipe.branchPipes && subMainPipe.branchPipes.length > 0) {
                            subMainPipe.branchPipes.forEach((branchPipe) => {

                                
                                // ใช้ plants ที่อยู่ใน branchPipe.plants (ถ้ามี) หรือหาใกล้เคียง
                                let plantsForPipe = branchPipe.plants || [];
                                
                                // ถ้าไม่มี plants ใน branchPipe ให้ลองหาจาก data.plants
                                if (plantsForPipe.length === 0 && data.plants && branchPipe.coordinates?.length > 0) {
                                    plantsForPipe = data.plants.filter(plant => {
                                        return branchPipe.coordinates.some(coord => {
                                            const distance = calculateDistance(plant.position, coord);
                                            return distance <= 15; // 15 meters radius
                                        });
                                    });
                                }
                                
                                // สร้าง lateral pipe เสมอ ไม่ว่าจะมีพืชหรือไม่
                                if (branchPipe.coordinates && branchPipe.coordinates.length > 0) {
                                    const lateralPipe = {
                                        id: branchPipe.id,
                                        coordinates: branchPipe.coordinates,
                                        length: branchPipe.length || calculatePipeLength(branchPipe.coordinates),
                                        plants: plantsForPipe,
                                        placementMode: 'over_plants' as const,
                                        totalFlowRate: plantsForPipe.length * 2.5,
                                        connectionPoint: branchPipe.coordinates[0]
                                    };
                                    
                                    allLateralPipes.push(lateralPipe);

                                }
                            });
                        }
                    });
                }
                


                const enhancedData: EnhancedProjectData = {
                    ...data,
                    irrigationZones: data.irrigationZones || [],
                    lateralPipes: allLateralPipes,
                    headLossResults: [],
                    sprinklerConfig: loadSprinklerConfig() || undefined,
                    plantRotation: 0
                };

                setLateralPipes(allLateralPipes);

                setProjectData(enhancedData);
                const summary = calculateProjectSummary(data);
                setProjectSummary(summary);

                // Set all zones to collapsed by default
                if (data.irrigationZones && data.irrigationZones.length > 0) {
                    // Set all irrigation zones to collapsed by default
                    const allZoneIds = new Set(data.irrigationZones.map(zone => zone.id));
                    setCollapsedZones(allZoneIds);
                } else if (summary.zoneDetails && summary.zoneDetails.length > 0) {
                    // Set all regular zones to collapsed by default
                    const allZoneIds = new Set(summary.zoneDetails.map(zone => zone.zoneId));
                    setCollapsedZones(allZoneIds);
                }

                // Load enhanced statistics
                const overallStats = getOverallStats();
                setEnhancedStats(overallStats);

                // Load irrigation zones if available
                if (data.irrigationZones && data.irrigationZones.length > 0) {
                    setIrrigationZones(data.irrigationZones);
                }

                // Load sprinkler config
                const config = loadSprinklerConfig();
                if (config) {
                    setSprinklerConfig(config);
                }

                if (data.mainArea && data.mainArea.length > 0) {
                    const centerLat =
                        data.mainArea.reduce((sum, point) => sum + point.lat, 0) /
                        data.mainArea.length;
                    const centerLng =
                        data.mainArea.reduce((sum, point) => sum + point.lng, 0) /
                        data.mainArea.length;
                    setMapCenter([centerLat, centerLng]);

                    const latitudes = data.mainArea.map((p) => p.lat);
                    const longitudes = data.mainArea.map((p) => p.lng);
                    const maxLat = Math.max(...latitudes);
                    const minLat = Math.min(...latitudes);
                    const maxLng = Math.max(...longitudes);
                    const minLng = Math.min(...longitudes);
                    const latDiff = maxLat - minLat;
                    const lngDiff = maxLng - minLng;
                    const maxDiff = Math.max(latDiff, lngDiff);

                    let initialZoom;
                    if (maxDiff < 0.001) initialZoom = 20;
                    else if (maxDiff < 0.002) initialZoom = 19;
                    else if (maxDiff < 0.005) initialZoom = 18;
                    else if (maxDiff < 0.01) initialZoom = 17;
                    else if (maxDiff < 0.02) initialZoom = 16;
                    else initialZoom = 15;

                    setMapZoom(initialZoom);
                }
            } else {
                console.warn('❌ No project data found, redirecting to planner');
                navigateToPlanner();
            }
        } catch (error) {
            console.error('❌ Error loading project data:', error);
            navigateToPlanner();
        }
        setLoading(false);
    }, []);

    const handleRotationChange = (newRotation: number) => {
        setMapRotation(newRotation);
    };

    const resetMapRotation = () => {
        setMapRotation(0);
    };

    const toggleMapLock = () => {
        setIsMapLocked(!isMapLocked);
        if (mapRef.current) {
            if (!isMapLocked) {
                mapRef.current.setOptions({
                    draggable: false,
                    zoomControl: false,
                    scrollwheel: false,
                    disableDoubleClickZoom: true,
                });
            } else {
                mapRef.current.setOptions({
                    draggable: true,
                    zoomControl: true,
                    scrollwheel: true,
                    disableDoubleClickZoom: false,
                });
            }
        }
    };

    const handlePipeSizeChange = (newSize: number) => {
        setPipeSize(Math.max(0.5, Math.min(3, newSize)));
    };

    const handleIconSizeChange = (newSize: number) => {
        setIconSize(Math.max(0.5, Math.min(3, newSize)));
    };

    const resetSizes = () => {
        setPipeSize(1);
        setIconSize(1);
    };

    const handleNewProject = () => {
        
        router.visit('/horticulture/planner');
    };

    const handleEditProject = () => {
        localStorage.setItem('isEditingExistingProject', 'true');
        
        const existingData = localStorage.getItem('horticultureIrrigationData');
        if (!existingData && projectData) {
            localStorage.setItem('horticultureIrrigationData', JSON.stringify(projectData));
        }
        
        router.visit('/horticulture/planner');
    };

    const handleMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        setMapLoaded(true);
    }, []);

    // Enhanced feature handlers
    const handleHeadLossCalculation = (pipeInfo: {
        pipeId: string;
        pipeType: 'mainPipe' | 'subMainPipe' | 'branchPipe';
        zoneName: string;
        zoneId: string;
        length: number;
        pipeName?: string;
    }) => {
        setSelectedPipeForHeadLoss(pipeInfo);
        setShowHeadLossModal(true);
    };

    const handleHeadLossSave = (result: HeadLossResult) => {
        setHeadLossResults(prev => [...prev, result]);
        setShowHeadLossModal(false);
        setSelectedPipeForHeadLoss(null);
        // อัพเดท localStorage
        const updatedData = { ...projectData, headLossResults: [...headLossResults, result] };
        localStorage.setItem('horticultureIrrigationData', JSON.stringify(updatedData));
    };

    const handleSprinklerConfigSave = (config: any) => {
        const sprinklerConfig = loadSprinklerConfig();
        if (sprinklerConfig) {
            setSprinklerConfig(sprinklerConfig);
            // อัพเดท enhanced stats
            const overallStats = getOverallStats();
            setEnhancedStats(overallStats);
        }
        setShowSprinklerConfigModal(false);
    };

    const toggleZoneCollapse = (zoneId: string) => {
        setCollapsedZones(prev => {
            const newSet = new Set(prev);
            if (newSet.has(zoneId)) {
                newSet.delete(zoneId);
            } else {
                newSet.add(zoneId);
            }
            return newSet;
        });
    };



    const handleExportMapToProduct = async () => {
        if (!mapContainerRef.current) {
            alert(t('ไม่พบแผนที่'));
            return;
        }
        setIsCreatingImage(true);
        try {
            const currentRotation = mapRotation;
            if (currentRotation !== 0) {
                setMapRotation(0);
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));

            const html2canvas = await import('html2canvas');
            const html2canvasLib = html2canvas.default || html2canvas;

            const canvas = await html2canvasLib(mapContainerRef.current, {
                useCORS: true,
                allowTaint: true,
                scale: 2,
                logging: false,
                backgroundColor: '#1F2937',
                width: mapContainerRef.current.offsetWidth,
                height: mapContainerRef.current.offsetHeight,
                onclone: (clonedDoc) => {
                    try {
                        const controls = clonedDoc.querySelectorAll(
                            '.leaflet-control-container, .gm-control-active'
                        );
                        controls.forEach((el) => el.remove());

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

                            const outlineColor = computedStyle.outlineColor;
                            if (
                                outlineColor &&
                                (outlineColor.includes('oklch') || outlineColor.includes('hsl'))
                            ) {
                                htmlEl.style.outlineColor = '#374151';
                            }
                        });

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

            if (currentRotation !== 0) {
                setMapRotation(currentRotation);
            }

            if (dataUrl && dataUrl !== 'data:,' && dataUrl.length > 100) {
                localStorage.setItem('projectMapImage', dataUrl);
                localStorage.setItem('projectType', 'horticulture');
                window.location.href = '/product';
            } else {
                throw new Error('ไม่สามารถสร้างภาพแผนที่ได้');
            }
        } catch (error) {
            console.error('❌ Error creating map image:', error);
            alert(
                '❌ เกิดข้อผิดพลาดในการสร้างภาพแผนผัง\n\nกรุณาใช้วิธี Screenshot แทน:\n\n1. กด F11 เพื่อ Fullscreen\n2. กด Print Screen หรือใช้ Snipping Tool\n3. หรือใช้ Extension "Full Page Screen Capture"'
            );
        } finally {
            setIsCreatingImage(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-32 w-32 animate-spin rounded-full border-b-2 border-white"></div>
                    <p className="text-xl">{t('กำลังโหลดข้อมูลโครงการ...')}</p>
                </div>
            </div>
        );
    }

    if (!projectData || !projectSummary) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="mb-4 text-2xl font-bold">{t('ไม่พบข้อมูลโครงการ')}</h1>
                    <button
                        onClick={handleNewProject}
                        className="rounded-lg bg-blue-600 px-6 py-3 transition-colors hover:bg-blue-700"
                    >
                        {t('กลับไปสร้างโครงการใหม่')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />
            <div className="p-4">
                <div className="mx-auto w-full">
                    {/* Header */}
                    <div className="mx-4 mb-4 flex justify-between text-left">
                        <div className="my-4 flex justify-start">
                            <h1 className="mb-2 text-2xl font-bold text-green-400">
                            {t('รายงานการออกแบบระบบน้ำพืชสวน')}
                            </h1>
                            <h2 className="text-xl text-gray-300">{projectData.projectName}</h2>
                        </div>
                        {/* Action Buttons */}
                        <div className="my-4 flex flex-wrap justify-end gap-2">
                            <button
                                onClick={handleNewProject}
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-green-700"
                            >
                                ➕ {t('โครงการใหม่')}
                            </button>
                            <button
                                onClick={handleEditProject}
                                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-orange-700"
                            >
                                ✏️ {t('แก้ไขโครงการ')}
                            </button>
                            {projectData && projectData.plants && projectData.plants.length > 0 && (
                                <button
                                    onClick={() => setShowSprinklerConfigModal(true)}
                                    className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-cyan-700"
                                >
                                    🚿 {t('ตั้งค่าหัวฉีด')}
                                </button>
                            )}
                            <button
                                onClick={handleExportMapToProduct}
                                disabled={isCreatingImage}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                                        {t('กำลังส่งออก...')}
                                    </>
                                ) : (
                                    t('คำนวณระบบน้ำ')
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        <div className="rounded-lg bg-gray-800 p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xl font-semibold">🗺️ {t('แผนผังโครงการ')}</h3>
                            </div>

                            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <div className="rounded-lg bg-gray-700 p-4">
                                    <h4 className="mb-3 text-sm font-semibold text-blue-300">
                                        🔄 {t('การหมุนแผนที่')}
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <label className="w-16 text-xs text-gray-300">
                                                {t('หมุน')}:
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="360"
                                                step="1"
                                                value={mapRotation}
                                                onChange={(e) =>
                                                    handleRotationChange(parseInt(e.target.value))
                                                }
                                                className="flex-1 accent-blue-600"
                                            />
                                            <span className="w-12 text-xs text-blue-300">
                                                {mapRotation}°
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() =>
                                                    handleRotationChange(mapRotation - 15)
                                                }
                                                className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700"
                                            >
                                                ↺ -15°
                                            </button>
                                            <button
                                                onClick={resetMapRotation}
                                                className="flex-1 rounded bg-gray-600 px-2 py-1 text-xs hover:bg-gray-700"
                                            >
                                                🔄 {t('รีเซ็ต')}
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleRotationChange(mapRotation + 15)
                                                }
                                                className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700"
                                            >
                                                ↻ +15°
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isMapLocked}
                                                onChange={toggleMapLock}
                                                className="accent-purple-600"
                                            />
                                            <label className="text-xs text-gray-300">
                                                🔒 {t('ล็อกการลาก')}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg bg-gray-700 p-4">
                                    <h4 className="mb-3 text-sm font-semibold text-green-300">
                                        📏 {t('ขนาดไอคอน')}
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <label className="w-16 text-xs text-gray-300">
                                                {t('ท่อ')}:
                                            </label>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="3"
                                                step="0.1"
                                                value={pipeSize}
                                                onChange={(e) =>
                                                    handlePipeSizeChange(parseFloat(e.target.value))
                                                }
                                                className="flex-1 accent-green-600"
                                            />
                                            <span className="w-12 text-xs text-green-300">
                                                {pipeSize.toFixed(1)}x
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="w-16 text-xs text-gray-300">
                                                {t('ไอคอน')}:
                                            </label>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="3"
                                                step="0.1"
                                                value={iconSize}
                                                onChange={(e) =>
                                                    handleIconSizeChange(parseFloat(e.target.value))
                                                }
                                                className="flex-1 accent-yellow-600"
                                            />
                                            <span className="w-12 text-xs text-yellow-300">
                                                {iconSize.toFixed(1)}x
                                            </span>
                                        </div>
                                        <button
                                            onClick={resetSizes}
                                            className="w-full rounded bg-gray-600 px-3 py-1 text-xs hover:bg-gray-700"
                                        >
                                            🔄 {t('รีเซ็ตขนาด')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div
                                ref={mapContainerRef}
                                className="mb-4 h-[500px] w-full overflow-hidden rounded-lg border border-gray-600"
                                style={{ backgroundColor: 'rgb(31, 41, 55)' }}
                            >
                                <HorticultureMapComponent
                                    center={mapCenter}
                                    zoom={mapZoom}
                                    onMapLoad={handleMapLoad}
                                    mapOptions={{
                                        zoomControl: false,
                                        fullscreenControl: false,
                                        mapTypeControl: false,
                                        streetViewControl: false,
                                        clickableIcons: false,
                                        scrollwheel: false,
                                        disableDoubleClickZoom: false,
                                        gestureHandling: 'none',
                                    }}
                                >
                                    {mapLoaded && (
                                        <GoogleMapsResultsOverlays
                                            map={mapRef.current}
                                            projectData={projectData}
                                            mapRotation={mapRotation}
                                            pipeSize={pipeSize}
                                            iconSize={iconSize}
                                            irrigationZones={irrigationZones}
                                            lateralPipes={lateralPipes}
                                            t={t}
                                        />
                                    )}
                                </HorticultureMapComponent>
                            </div>

                            <div className="rounded-lg bg-gray-700 p-4">
                                <h4 className="mb-3 text-sm font-semibold">
                                    🎨 {t('คำอธิบายสัญลักษณ์')}
                                </h4>
                                <div className="space-y-3">
                                    {/* ท่อ */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-1 w-4"
                                                style={{ 
                                                    backgroundColor: '#FF0000',
                                                    height: `${2 * pipeSize}px` 
                                                }}
                                            ></div>
                                            <span>{t('ท่อเมนหลัก')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-1 w-4"
                                                style={{ 
                                                    backgroundColor: '#8B5CF6',
                                                    height: `${1.5 * pipeSize}px` 
                                                }}
                                            ></div>
                                            <span>{t('ท่อเมนรอง')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-1 w-4"
                                                style={{ 
                                                    backgroundColor: '#FCD34D',
                                                    height: `${1 * pipeSize}px` 
                                                }}
                                            ></div>
                                            <span>{t('ท่อย่อย')}</span>
                                        </div>
                                        {lateralPipes.some(pipe => pipe.emitterLines && pipe.emitterLines.length > 0) && (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-1 w-4"
                                                    style={{ 
                                                        backgroundColor: '#90EE90',
                                                        height: `${1 * pipeSize}px`,
                                                        border: '1px dashed #ffffff80'
                                                    }}
                                                ></div>
                                                <span>{t('ท่อย่อยแยก')}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <img
                                                src="/images/water-pump.png"
                                                alt={t('ปั๊มน้ำ')}
                                                style={{ width: `${18 * iconSize}px`, height: `${18 * iconSize}px` }}
                                            />
                                            <span>{t('ปั๊มน้ำ')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 bg-green-500 opacity-50"></div>
                                            <span>{t('พื้นที่หลัก')}</span>
                                        </div>

                                    </div>
                                    
                                    {/* โซน */}
                                    {projectData?.zones && projectData.zones.length > 0 && (
                                        <div>
                                            <div className="mb-2 text-xs font-semibold text-gray-300">{t('โซน')}:</div>
                                            <div className="grid grid-cols-2 gap-1 text-xs">
                                                {projectData.zones.map((zone, index) => (
                                                    <div key={zone.id} className="flex items-center gap-2">
                                                        <div
                                                            className="h-3 w-3 opacity-70"
                                                            style={{ backgroundColor: getZoneColor(index) }}
                                                        ></div>
                                                        <span>{t('โซน')} {index + 1}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* พื้นที่หลีกเลี่ยง */}
                                    {projectData?.exclusionAreas && projectData.exclusionAreas.length > 0 && (
                                        <div>
                                            <div className="mb-2 text-xs font-semibold text-gray-300">{t('พื้นที่หลีกเลี่ยง')}:</div>
                                            <div className="grid grid-cols-2 gap-1 text-xs">
                                                {projectData.exclusionAreas.map((area) => {
                                                    const exclusionColor = EXCLUSION_COLORS[area.type as keyof typeof EXCLUSION_COLORS] || EXCLUSION_COLORS.other;
                                                    return (
                                                        <div key={area.id} className="flex items-center gap-2">
                                                            <div
                                                                className="h-3 w-3 opacity-70"
                                                                style={{ backgroundColor: exclusionColor }}
                                                            ></div>
                                                            <span>{getExclusionTypeName(area.type, t)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                            </div>

                        </div>

                        <div className="space-y-6">
                            <div className="rounded-lg bg-gray-800 p-6">
                                <h3 className="mb-4 text-xl font-semibold text-green-400">
                                    📊 {t('ข้อมูลโดยรวม')}
                                </h3>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                                    <div className="rounded bg-gray-700 p-3">
                                        <div className="text-gray-400">
                                            {t('พื้นที่รวมทั้งหมด')}
                                        </div>
                                        <div className="text-lg font-bold text-green-400">
                                            {formatAreaInRai(projectSummary.totalAreaInRai)}
                                        </div>
                                    </div>
                                    <div className="rounded bg-gray-700 p-3">
                                        <div className="text-gray-400">{t('จำนวนโซน')}</div>
                                        <div className="text-lg font-bold text-blue-400">
                                            {projectSummary.totalZones} โซน
                                        </div>
                                    </div>
                                    <div className="rounded bg-gray-700 p-3">
                                        <div className="text-gray-400">
                                            {t('ต้นไม้ทั้งหมด')}
                                        </div>
                                        <div className="text-lg font-bold text-yellow-400">
                                            {projectSummary.totalPlants.toLocaleString()} ต้น
                                        </div>
                                    </div>
                                    <div className="rounded bg-gray-700 p-3">
                                        <div className="text-gray-400">
                                            {t('ปริมาณน้ำต่อครั้ง')}
                                        </div>
                                        <div className="text-lg font-bold text-cyan-400">
                                            {formatWaterVolume(
                                                projectSummary.totalWaterNeedPerSession
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Enhanced Statistics */}
                                {enhancedStats && enhancedStats.sprinklerFlowRate && (
                                    <div className="mt-6 rounded bg-gradient-to-r from-blue-900/30 to-cyan-900/30 p-4 border border-blue-700/50">
                                        <h4 className="mb-3 text-lg font-semibold text-cyan-300">
                                            🚿 {t('ข้อมูลระบบหัวฉีดของพื้นที่รวมทั้ังหมด')} (แรงดัน {enhancedStats.sprinklerFlowRate.pressureBar} บาร์ / รัศมี {enhancedStats.sprinklerFlowRate.radiusMeters} ม.)
                                        </h4>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            <div className="text-center">
                                                <div className="text-sm text-gray-400">Q หัวฉีด</div>
                                                <div className="text-lg font-bold text-cyan-400">
                                                    {enhancedStats.sprinklerFlowRate.flowRatePerPlant} L/M
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm text-gray-400">Q รวม/นาที</div>
                                                <div className="text-lg font-bold text-blue-400">
                                                    {enhancedStats.sprinklerFlowRate.formattedFlowRatePerMinute}
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm text-gray-400">Q รวม/ชั่วโมง</div>
                                                <div className="text-lg font-bold text-purple-400">
                                                    {enhancedStats.sprinklerFlowRate.formattedFlowRatePerHour}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}


                            </div>

                            <div className="rounded-lg bg-gray-800 p-6">
                                <h3 className="mb-4 text-xl font-semibold text-blue-400">
                                    🔧 {t('ระบบท่อทั้งหมด')}
                                </h3>

                                                                {/* ท่อเมนหลัก */}
                                <div className="mb-2 rounded bg-red-700/20 p-2">
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                        🔴 {t('ท่อเมนหลัก')} ({projectSummary.mainPipes.count} ท่อ)
                                        </div>
                                        <div className="text-center"><span className="text-gray-400">ยาวรวม:</span> <span className="font-bold text-red-400">{formatDistance(projectSummary.mainPipes.totalLength)}</span></div>
                                        <div className="text-right"><span className="text-gray-400">ยาวสุด:</span> <span className="font-bold text-red-400">{formatDistance(projectSummary.mainPipes.longest)}</span></div>
                                    </div>
                                </div>

                                {/* ท่อเมนรอง */}
                                <div className="mb-2 rounded bg-purple-800/20 p-2">
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                        🟣 {t('ท่อเมนรอง')} ({projectSummary.subMainPipes.count} ท่อ)
                                        </div>
                                        <div className="text-center"><span className="text-gray-400">ยาวรวม:</span> <span className="font-bold text-purple-400">{formatDistance(projectSummary.subMainPipes.totalLength)}</span></div>
                                        <div className="text-right"><span className="text-gray-400">ยาวสุด:</span> <span className="font-bold text-purple-400">{formatDistance(projectSummary.subMainPipes.longest)}</span></div>
                                    </div>
                                </div>

                                                                {/* ท่อย่อย */}
                                <div className="mb-2 rounded bg-yellow-800/20 p-2">
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                        🟡 {t('ท่อย่อย')} ({projectSummary.branchPipes.count} ท่อ)
                                        </div>
                                        <div className="text-center"><span className="text-gray-400">ยาวรวม:</span> <span className="font-bold text-yellow-400">{formatDistance(projectSummary.branchPipes.totalLength)}</span></div>
                                        <div className="text-right"><span className="text-gray-400">ยาวสุด:</span> <span className="font-bold text-yellow-400">{formatDistance(projectSummary.branchPipes.longest)}</span></div>
                                    </div>
                                </div>

                                {/* ท่อย่อยแยก */}
                                {projectSummary.emitterPipes.count > 0 && (
                                    <div className="mb-2 rounded bg-green-800/20 p-2">
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                        🌿 {t('ท่อย่อยแยก')} ({projectSummary.emitterPipes.count} ท่อ)
                                        </div>
                                            <div className="text-center"><span className="text-gray-400">ยาวรวม:</span> <span className="font-bold text-green-400">{formatDistance(projectSummary.emitterPipes.totalLength)}</span></div>
                                            <div className="text-right">
                                                <span className="text-gray-400">ยาวสุด:</span> <span className="font-bold text-green-400">{formatDistance(projectSummary.emitterPipes.longest)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="rounded bg-yellow-900/30 p-2 flex items-center justify-between gap-4">
                                    <h4 className="font-semibold text-yellow-300 whitespace-nowrap flex-shrink-0">
                                        📏 {t('ท่อที่ยาวที่สุดรวมกัน')}
                                    </h4>
                                    <div className="flex flex-col items-start">
                                        <div className="text-2xl font-bold text-yellow-400">
                                            {formatDistance(projectSummary.longestPipesCombined)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            
                            {/* Zone Details Section */}
                            {(irrigationZones.length > 0 || projectSummary.zoneDetails.length > 0) && (
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h3 className="mb-4 text-xl font-semibold text-green-400">
                                        🏞️ {irrigationZones.length > 0 ? t('ข้อมูลโซนการให้น้ำ') : t('ข้อมูลพื้นที่หลัก')}
                                    </h3>
                                    <div className="space-y-2">
                                        {irrigationZones.length > 0 ? (
                                            // แสดงข้อมูลโซนอัตโนมัติ
                                            irrigationZones.map((zone, index) => {
                                                const isCollapsed = collapsedZones.has(zone.id);
                                                return (
                                                <div key={zone.id} className="rounded bg-gray-700 p-4">
                                                    <div 
                                                        className="flex items-center justify-between cursor-pointer hover:bg-gray-600 rounded -m-2 transition-colors"
                                                        onClick={() => toggleZoneCollapse(zone.id)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-lg">
                                                                {isCollapsed ? '▶️' : '🔽'}
                                                            </div>
                                                            <h4 className="text-lg font-semibold text-green-300">
                                                                {zone.name}
                                                            </h4>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="h-4 w-4 rounded"
                                                                style={{ backgroundColor: zone.color }}
                                                            />
                                                            <span className="text-sm text-gray-400">#{index + 1}</span>
                                                        </div>
                                                    </div>

                                                    {!isCollapsed && (
                                                        <div>

                                                    {/* Plant Information */}
                                                    <div className="mb-2 mt-4 rounded bg-green-900/20 p-3 border border-green-700/50">
                                                        <h5 className="mb-2 text-sm font-semibold text-green-300">🌱 ข้อมูลการปลูก</h5>
                                                        <div className="grid grid-cols-4 gap-3 text-sm">
                                                            <div>
                                                                <span className="text-gray-400">จำนวนต้นไม้:</span>
                                                                <div className="font-bold text-green-400">{zone.plants.length.toLocaleString()} ต้น</div>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-400">ปริมาณน้ำรวม:</span>
                                                                <div className="font-bold text-cyan-400">{formatWaterVolume(zone.totalWaterNeed)}</div>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-400">น้ำต่อต้น:</span>
                                                                <div className="font-bold text-cyan-400">{zone.plants.length > 0 ? (zone.totalWaterNeed / zone.plants.length).toFixed(0) : 0} ลิตร</div>
                                                            </div>
                                                            {sprinklerConfig && (
                                                                <div>
                                                                    <span className="text-gray-400">ความต้องการน้ำ/นาที:</span>
                                                                    <div className="font-bold text-cyan-400">{calculateTotalFlowRate(zone.plants.length, sprinklerConfig.flowRatePerMinute).toLocaleString()} L/min</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Pipe System Information for Auto Zones - ZONE SPECIFIC */}
                                                    {(() => {
                                                        // หาข้อมูลโซนที่ตรงกัน
                                                        const zoneData = projectSummary?.zoneDetails?.find(z => z.zoneId === zone.id);
                                                        
                                                        if (!zoneData) {
                                                            return (
                                                                <div className="mb-4 rounded bg-red-900/20 p-3 border border-red-700/50">
                                                                    <h5 className="mb-2 text-sm font-semibold text-red-300">❌ ข้อมูลท่อในโซน</h5>
                                                                    <div className="text-xs text-red-400">ไม่พบข้อมูลท่อสำหรับโซนนี้ (Zone ID: {zone.id})</div>
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <div className="rounded bg-blue-900/20 p-3 border border-blue-700/50">
                                                                <h5 className="mb-2 text-sm font-semibold text-blue-300">🔧 ระบบท่อในโซน</h5>
                                                                <div className="text-xs text-gray-400 mb-2">*ข้อมูลท่อเฉพาะในโซนนี้ (คำนวณตามสัดส่วนต้นไม้)</div>
                                                                
                                                                {/* ท่อเมน */}
                                                                <div className="mb-2 rounded bg-red-700/20 px-2 py-1">
                                                                    <div className="grid grid-cols-3 gap-2 text-xs items-center">
                                                                    <div>
                                                                        🔴 ท่อเมนหลัก ({zoneData.mainPipesInZone?.count || 0} ท่อ)
                                                                    </div>
                                                                        <div className="text-center"><span className="text-gray-400">ยาวรวม:</span><div className="font-bold text-red-400">{formatDistance(zoneData.mainPipesInZone?.totalLength || 0)}</div></div>
                                                                        <div className="text-right"><span className="text-gray-400">ยาวสุด:</span><div className="font-bold text-red-400">{formatDistance(zoneData.mainPipesInZone?.longest || 0)}</div></div>
                                                                    </div>
                                                                </div>

                                                                {/* ท่อเมนรอง */}
                                                                <div className="mb-2 rounded bg-purple-700/20 px-2 py-1">
                                                                    <div className="grid grid-cols-3 gap-2 text-xs items-center">
                                                                    <div>
                                                                        🟣 ท่อเมนรอง ({zoneData.subMainPipesInZone?.count || 0} ท่อ)
                                                                    </div>
                                                                        <div className="text-center"><span className="text-gray-400">ยาวรวม:</span><div className="font-bold text-purple-400">{formatDistance(zoneData.subMainPipesInZone?.totalLength || 0)}</div></div>
                                                                        <div className="text-right"><span className="text-gray-400">ยาวสุด:</span><div className="font-bold text-purple-400">{formatDistance(zoneData.subMainPipesInZone?.longest || 0)}</div></div>
                                                                    </div>
                                                                </div>

                                                                {/* ท่อย่อย */}
                                                                <div className="mb-2 rounded bg-yellow-700/20 px-2 py-1">
                                                                    <div className="grid grid-cols-3 gap-2 text-xs items-center">
                                                                    <div>
                                                                        🟡 ท่อย่อย ({zoneData.branchPipesInZone?.count || 0} ท่อ)
                                                                    </div>
                                                                        <div className="text-center"><span className="text-gray-400">ยาวรวม:</span><div className="font-bold text-yellow-400">{formatDistance(zoneData.branchPipesInZone?.totalLength || 0)}</div></div>
                                                                        <div className="text-right"><span className="text-gray-400">ยาวสุด:</span><div className="font-bold text-yellow-400">{formatDistance(zoneData.branchPipesInZone?.longest || 0)}</div></div>
                                                                    </div>
                                                                </div>

                                                                {/* ท่อย่อยแยก */}
                                                                {(zoneData.emitterPipesInZone?.count || 0) > 0 && (
                                                                    <div className="mb-2 rounded bg-green-700/20 px-2 py-1">
                                                                        <div className="grid grid-cols-3 gap-2 text-xs items-center">
                                                                            <div>
                                                                                🌿 ท่อย่อยแยก ({zoneData.emitterPipesInZone?.count || 0} ท่อ)
                                                                            </div>
                                                                            <div className="text-center"><span className="text-gray-400">ยาวรวม:</span><div className="font-bold text-green-400">{formatDistance(zoneData.emitterPipesInZone?.totalLength || 0)}</div></div>
                                                                            <div className="text-right"><span className="text-gray-400">ยาวสุด:</span><div className="font-bold text-green-400">{formatDistance(zoneData.emitterPipesInZone?.longest || 0)}</div></div>
                                                                            </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                        ) : (
                                            // แสดงข้อมูลโซนปกติ/พื้นที่หลัก
                                            projectSummary.zoneDetails.map((zone, index) => {
                                            const plantInfo = zone.plantData || null;
                                            const plantName = plantInfo?.name || 'ไม่ระบุ';
                                            const waterPerPlant = zone.waterPerPlant || 0;
                                            const plantSpacing = plantInfo?.plantSpacing || 0;
                                            const rowSpacing = plantInfo?.rowSpacing || 0;
                                            const isCollapsed = collapsedZones.has(zone.zoneId);

                                            const zoneColor = projectData.useZones
                                                ? projectData.zones.find(
                                                      (z) => z.id === zone.zoneId
                                                  )?.color
                                                : null;

                                            return (
                                                <div
                                                    key={zone.zoneId}
                                                    className="rounded bg-gray-700 p-4"
                                                >
                                                    <div 
                                                        className="mb-4 flex items-center justify-between cursor-pointer hover:bg-gray-600 rounded p-2 -m-2 transition-colors"
                                                        onClick={() => toggleZoneCollapse(zone.zoneId)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-lg">
                                                                {isCollapsed ? '▶️' : '🔽'}
                                                            </div>
                                                            <h4 className="text-lg font-semibold text-green-300">
                                                                {zone.zoneName}
                                                            </h4>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {zoneColor && (
                                                                <div
                                                                    className="h-4 w-4 rounded"
                                                                    style={{ backgroundColor: zoneColor }}
                                                                />
                                                            )}
                                                            <span className="text-sm text-gray-400">#{index + 1}</span>
                                                        </div>
                                                    </div>

                                                    {!isCollapsed && (
                                                        <div>

                                                    {/* Plant Information */}
                                                    <div className="mb-2 rounded bg-green-900/20 p-3 border border-green-700/50">
                                                        <h5 className="mb-2 text-sm font-semibold text-green-300">🌱 ข้อมูลการปลูก</h5>
                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                        <div>
                                                                <span className="text-gray-400">ชนิดพืช:</span>
                                                                <div className="font-medium text-green-400">{plantName}</div>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-400">จำนวนต้นไม้:</span>
                                                                <div className="font-bold text-green-400">{zone.plantCount.toLocaleString()} ต้น</div>
                                                        </div>
                                                        <div>
                                                                <span className="text-gray-400">ระยะห่างต้นไม้:</span>
                                                                <div className="font-medium text-blue-400">{plantSpacing} ม.</div>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-400">ระยะห่างแถว:</span>
                                                                <div className="font-medium text-blue-400">{rowSpacing} ม.</div>
                                                        </div>
                                                        <div>
                                                                <span className="text-gray-400">น้ำต่อต้น:</span>
                                                                <div className="font-bold text-cyan-400">{waterPerPlant.toFixed(0)} ลิตร</div>
                                                        </div>
                                                        <div>
                                                                <span className="text-gray-400">น้ำรวมต่อครั้ง:</span>
                                                                <div className="font-bold text-cyan-400">{formatWaterVolume(zone.waterNeedPerSession)}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                                                                        {/* Pipe System Information */}
                                                    <div className="rounded bg-blue-900/20 p-3 border border-blue-700/50">
                                                        <h5 className="mb-2 text-sm font-semibold text-blue-300">🔧 ระบบท่อในโซน</h5>
                                                        
                                                        {/* ท่อเมน */}
                                                        <div className="mb-3 rounded bg-red-700/20 p-2">
                                                            <h6 className="text-xs font-medium text-red-300 mb-2">🔴 ท่อเมนหลัก</h6>
                                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                                <div>
                                                                    <span className="text-gray-400">จำนวน:</span>
                                                                    <div className="font-bold text-red-400">{zone.mainPipesInZone.count} ท่อ</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">ยาวรวม:</span>
                                                                    <div className="font-bold text-red-400">{formatDistance(zone.mainPipesInZone.totalLength)}</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">ยาวสุด:</span>
                                                                    <div className="font-bold text-red-400">{formatDistance(zone.mainPipesInZone.longest)}</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* ท่อเมนรอง */}
                                                        <div className="mb-3 rounded bg-purple-700/20 p-2">
                                                            <h6 className="text-xs font-medium text-purple-300 mb-2">🟣 ท่อเมนรอง</h6>
                                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                                <div>
                                                                    <span className="text-gray-400">จำนวน:</span>
                                                                    <div className="font-bold text-purple-400">{zone.subMainPipesInZone.count} ท่อ</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">ยาวรวม:</span>
                                                                    <div className="font-bold text-purple-400">{formatDistance(zone.subMainPipesInZone.totalLength)}</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">ยาวสุด:</span>
                                                                    <div className="font-bold text-purple-400">{formatDistance(zone.subMainPipesInZone.longest)}</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* ท่อย่อย */}
                                                        <div className="mb-3 rounded bg-yellow-700/20 p-2">
                                                            <h6 className="text-xs font-medium text-yellow-300 mb-2">🟡 ท่อย่อย</h6>
                                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                                <div>
                                                                    <span className="text-gray-400">จำนวน:</span>
                                                                    <div className="font-bold text-yellow-400">{zone.branchPipesInZone.count} ท่อ</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">ยาวรวม:</span>
                                                                    <div className="font-bold text-yellow-400">{formatDistance(zone.branchPipesInZone.totalLength)}</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">ยาวสุด:</span>
                                                                    <div className="font-bold text-yellow-400">{formatDistance(zone.branchPipesInZone.longest)}</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* ท่อย่อยแยก */}
                                                        {zone.emitterPipesInZone && zone.emitterPipesInZone.count > 0 && (
                                                            <div className="mb-3 rounded bg-green-700/20 p-2">
                                                                <h6 className="text-xs font-medium text-green-300 mb-2">🌿 ท่อย่อยแยก</h6>
                                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                                    <div>
                                                                        <span className="text-gray-400">จำนวน:</span>
                                                                        <div className="font-bold text-green-400">{zone.emitterPipesInZone.count} ท่อ</div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-400">ยาวรวม:</span>
                                                                        <div className="font-bold text-green-400">{formatDistance(zone.emitterPipesInZone.totalLength)}</div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-400">ยาวสุด:</span>
                                                                        <div className="font-bold text-green-400">{formatDistance(zone.emitterPipesInZone.longest)}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Area Information */}
                                                    <div className="rounded bg-gray-800/50 p-3">
                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                            <div>
                                                                <span className="text-gray-400">พื้นที่โซน:</span>
                                                                <div className="font-bold text-orange-400">{formatAreaInRai(zone.areaInRai)}</div>
                                                        </div>
                                                            <div>
                                                                <span className="text-gray-400">ความต้องการน้ำ/นาที:</span>
                                                                <div className="font-bold text-cyan-400">{(zone.waterNeedPerSession / 60).toFixed(1)} L/min</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Footer />

            {/* Enhanced Feature Modals */}
            {showHeadLossModal && selectedPipeForHeadLoss && (
                <HeadLossCalculationModal
                    isOpen={showHeadLossModal}
                    onClose={() => {
                        setShowHeadLossModal(false);
                        setSelectedPipeForHeadLoss(null);
                    }}
                    onSave={handleHeadLossSave}
                    pipeInfo={selectedPipeForHeadLoss}
                    t={t}
                />
            )}

            {showSprinklerConfigModal && projectData && (
                <SprinklerConfigModal
                    isOpen={showSprinklerConfigModal}
                    onClose={() => setShowSprinklerConfigModal(false)}
                    onSave={handleSprinklerConfigSave}
                    plantCount={projectData.plants?.length || 0}
                    t={t}
                />
            )}
        </div>
    );
}

export default EnhancedHorticultureResultsPageContent;
