import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    MapContainer,
    TileLayer,
    Polygon,
    Marker,
    Polyline,
    useMap,
    LayersControl,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Footer from '../components/Footer';

interface Coordinate {
    lat: number;
    lng: number;
}

interface PlantData {
    id: number;
    name: string;
    plantSpacing: number;
    rowSpacing: number;
    waterNeed: number;
    category?: string;
    description?: string;
}

interface Zone {
    id: string;
    name: string;
    coordinates: Coordinate[];
    plantData: PlantData;
    plantCount: number;
    totalWaterNeed: number;
    area: number;
    color: string;
    isCustomPlant?: boolean;
}

interface Pump {
    id: string;
    position: Coordinate;
    type: 'submersible' | 'centrifugal' | 'jet';
    capacity: number;
    head: number;
    power?: number;
    efficiency?: number;
}

interface MainPipe {
    id: string;
    fromPump: string;
    toZone: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    material?: string;
    pressure?: number;
    flowRate?: number;
}

interface SubMainPipe {
    id: string;
    zoneId: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    branchPipes: BranchPipe[];
    material?: string;
    isEditable?: boolean;
}

interface BranchPipe {
    id: string;
    subMainPipeId: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    plants: PlantLocation[];
    sprinklerType?: string;
    isEditable?: boolean;
}

interface PlantLocation {
    id: string;
    position: Coordinate;
    plantData: PlantData;
    isSelected?: boolean;
    isEditable?: boolean;
    elevation?: number;
    soilType?: string;
    health?: 'good' | 'fair' | 'poor';
}

interface ExclusionArea {
    id: string;
    type: 'building' | 'powerplant' | 'river' | 'road' | 'other';
    coordinates: Coordinate[];
    name: string;
    color: string;
    description?: string;
    isLocked?: boolean;
}

interface HorticultureProjectData {
    projectName: string;
    version?: string;
    totalArea: number;
    mainArea: Coordinate[];
    pump: Pump | null;
    zones: Zone[];
    mainPipes: MainPipe[];
    subMainPipes: SubMainPipe[];
    exclusionAreas: ExclusionArea[];
    plants: PlantLocation[];
    useZones: boolean;
    createdAt: string;
    updatedAt: string;
}

interface ComprehensiveZoneStats {
    zoneId: string;
    zoneName: string;
    plantType: string;
    plantSpacing: number;
    rowSpacing: number;
    actualPlantCount: number;
    waterNeedPerPlant: number;
    actualTotalWaterPerSession: number;
    zoneArea: number;

    longestBranchPipe: number;
    shortestBranchPipe: number;
    averageBranchPipeLength: number;
    totalBranchPipeLength: number;
    branchPipeCount: number;
    branchPipeDetails: Array<{
        id: string;
        length: number;
        plantCount: number;
    }>;

    longestSubMainPipe: number;
    shortestSubMainPipe: number;
    averageSubMainPipeLength: number;
    totalSubMainPipeLength: number;
    subMainPipeCount: number;
    subMainPipeDetails: Array<{
        id: string;
        length: number;
        branchCount: number;
    }>;

    plantDensityPerSquareMeter: number;
    waterEfficiencyPerSquareMeter: number;
    coveragePercentage: number;
}

interface ComprehensiveMainPipeStats {
    totalMainPipes: number;
    longestMainPipe: number;
    shortestMainPipe: number;
    averageMainPipeLength: number;
    totalMainPipeLength: number;

    farthestDestination: {
        zoneName: string;
        distance: number;
        pipeId: string;
    };
    closestDestination: {
        zoneName: string;
        distance: number;
        pipeId: string;
    };

    allMainPipeDetails: Array<{
        pipeId: string;
        fromPump: string;
        toZone: string;
        destinationName: string;
        length: number;
        diameter: number;
        material: string;
        flowRate: number;
        pressure: number;
    }>;

    totalFlowCapacity: number;
    averagePressure: number;
    mainPipeEfficiency: number;
}

interface ComprehensiveProjectStats {
    projectName: string;
    totalArea: number;
    actualTotalPlants: number;
    actualTotalWaterPerSession: number;
    numberOfZones: number;

    zoneStats: ComprehensiveZoneStats[];

    mainPipeStats: ComprehensiveMainPipeStats;

    totalPipeLength: number;
    totalMainPipeLength: number;
    totalSubMainPipeLength: number;
    totalBranchPipeLength: number;

    totalMainPipes: number;
    totalSubMainPipes: number;
    totalBranchPipes: number;
    totalPipeSections: number;

    systemEfficiency: number;
    waterDistributionBalance: number;
    pipeOptimization: number;

    plantVarieties: Record<
        string,
        {
            totalCount: number;
            zones: Array<{
                zoneName: string;
                count: number;
            }>;
        }
    >;
}

const formatArea = (area: number): string => {
    if (typeof area !== 'number' || isNaN(area) || area < 0) return '0 ตร.ม.';

    if (area >= 1600) {
        return `${(area / 1600).toFixed(2)} ไร่`;
    } else {
        return `${area.toFixed(2)} ตร.ม.`;
    }
};

const formatWaterVolume = (volume: number): string => {
    if (typeof volume !== 'number' || isNaN(volume) || volume < 0) return '0 ลิตร';

    if (volume >= 1000000) {
        return `${(volume / 1000000).toFixed(2)} ล้านลิตร`;
    } else if (volume >= 1000) {
        return `${volume.toLocaleString('th-TH')} ลิตร`;
    } else {
        return `${volume.toFixed(2)} ลิตร`;
    }
};

const formatDistance = (distance: number): string => {
    if (typeof distance !== 'number' || isNaN(distance) || distance < 0) return '0 ม.';

    if (distance >= 1000) {
        return `${(distance / 1000).toFixed(2)} กม.`;
    }
    return `${distance.toFixed(2)} ม.`;
};

const isPointInPolygon = (point: Coordinate, polygon: Coordinate[]): boolean => {
    if (!point || !polygon || polygon.length < 3) return false;

    try {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lat;
            const yi = polygon[i].lng;
            const xj = polygon[j].lat;
            const yj = polygon[j].lng;

            const intersect =
                yi > point.lng !== yj > point.lng &&
                point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
        return inside;
    } catch (error) {
        console.error('Error checking point in polygon:', error);
        return false;
    }
};

const calculateComprehensiveProjectStats = (
    projectData: HorticultureProjectData
): ComprehensiveProjectStats => {
    console.log('📊 Calculating comprehensive project statistics...');

    const actualTotalPlants = projectData.plants?.length || 0;
    const actualTotalWaterPerSession =
        projectData.plants?.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0) || 0;

    const zoneStats: ComprehensiveZoneStats[] =
        projectData.useZones && projectData.zones
            ? projectData.zones.map((zone) => {
                  console.log(`🏞️ Processing zone: ${zone.name}`);

                  const plantsInZone =
                      projectData.plants?.filter((plant) =>
                          isPointInPolygon(plant.position, zone.coordinates)
                      ) || [];

                  const actualPlantCount = plantsInZone.length;
                  const actualWaterNeed = plantsInZone.reduce(
                      (sum, plant) => sum + plant.plantData.waterNeed,
                      0
                  );

                  const zoneSubMainPipes =
                      projectData.subMainPipes?.filter((pipe) => pipe.zoneId === zone.id) || [];

                  const subMainLengths = zoneSubMainPipes.map((pipe) => pipe.length);
                  const longestSubMainPipe =
                      subMainLengths.length > 0 ? Math.max(...subMainLengths) : 0;
                  const shortestSubMainPipe =
                      subMainLengths.length > 0 ? Math.min(...subMainLengths) : 0;
                  const averageSubMainPipeLength =
                      subMainLengths.length > 0
                          ? subMainLengths.reduce((sum, length) => sum + length, 0) /
                            subMainLengths.length
                          : 0;
                  const totalSubMainPipeLength = subMainLengths.reduce(
                      (sum, length) => sum + length,
                      0
                  );

                  const subMainPipeDetails = zoneSubMainPipes.map((pipe) => ({
                      id: pipe.id,
                      length: pipe.length,
                      branchCount: pipe.branchPipes?.length || 0,
                  }));

                  const zoneBranchPipes = zoneSubMainPipes.flatMap(
                      (pipe) => pipe.branchPipes || []
                  );

                  const branchLengths = zoneBranchPipes.map((pipe) => pipe.length);
                  const longestBranchPipe =
                      branchLengths.length > 0 ? Math.max(...branchLengths) : 0;
                  const shortestBranchPipe =
                      branchLengths.length > 0 ? Math.min(...branchLengths) : 0;
                  const averageBranchPipeLength =
                      branchLengths.length > 0
                          ? branchLengths.reduce((sum, length) => sum + length, 0) /
                            branchLengths.length
                          : 0;
                  const totalBranchPipeLength = branchLengths.reduce(
                      (sum, length) => sum + length,
                      0
                  );

                  const branchPipeDetails = zoneBranchPipes.map((pipe) => ({
                      id: pipe.id,
                      length: pipe.length,
                      plantCount: pipe.plants?.length || 0,
                  }));

                  const plantDensityPerSquareMeter =
                      zone.area > 0 ? actualPlantCount / zone.area : 0;
                  const waterEfficiencyPerSquareMeter =
                      zone.area > 0 ? actualWaterNeed / zone.area : 0;
                  const coveragePercentage = 100;

                  const zoneStatsItem: ComprehensiveZoneStats = {
                      zoneId: zone.id,
                      zoneName: zone.name,
                      plantType: zone.plantData.name,
                      plantSpacing: zone.plantData.plantSpacing,
                      rowSpacing: zone.plantData.rowSpacing,
                      actualPlantCount,
                      waterNeedPerPlant: zone.plantData.waterNeed,
                      actualTotalWaterPerSession: actualWaterNeed,
                      zoneArea: zone.area,

                      longestBranchPipe,
                      shortestBranchPipe,
                      averageBranchPipeLength,
                      totalBranchPipeLength,
                      branchPipeCount: zoneBranchPipes.length,
                      branchPipeDetails,

                      longestSubMainPipe,
                      shortestSubMainPipe,
                      averageSubMainPipeLength,
                      totalSubMainPipeLength,
                      subMainPipeCount: zoneSubMainPipes.length,
                      subMainPipeDetails,

                      plantDensityPerSquareMeter,
                      waterEfficiencyPerSquareMeter,
                      coveragePercentage,
                  };

                  console.log(`✅ Zone ${zone.name} stats:`, {
                      plants: actualPlantCount,
                      water: actualWaterNeed,
                      subMainPipes: zoneSubMainPipes.length,
                      branchPipes: zoneBranchPipes.length,
                  });

                  return zoneStatsItem;
              })
            : [
                  {
                      zoneId: 'single-zone',
                      zoneName: 'พื้นที่เดียว',
                      plantType: projectData.plants?.[0]?.plantData.name || 'ไม่ระบุ',
                      plantSpacing: projectData.plants?.[0]?.plantData.plantSpacing || 5,
                      rowSpacing: projectData.plants?.[0]?.plantData.rowSpacing || 5,
                      actualPlantCount: actualTotalPlants,
                      waterNeedPerPlant: projectData.plants?.[0]?.plantData.waterNeed || 10,
                      actualTotalWaterPerSession: actualTotalWaterPerSession,
                      zoneArea: projectData.totalArea,

                      longestBranchPipe:
                          projectData.subMainPipes?.flatMap((pipe) => pipe.branchPipes || [])
                              .length > 0
                              ? Math.max(
                                    ...projectData.subMainPipes
                                        .flatMap((pipe) => pipe.branchPipes || [])
                                        .map((b) => b.length)
                                )
                              : 0,
                      shortestBranchPipe:
                          projectData.subMainPipes?.flatMap((pipe) => pipe.branchPipes || [])
                              .length > 0
                              ? Math.min(
                                    ...projectData.subMainPipes
                                        .flatMap((pipe) => pipe.branchPipes || [])
                                        .map((b) => b.length)
                                )
                              : 0,
                      averageBranchPipeLength: (() => {
                          const allBranches =
                              projectData.subMainPipes?.flatMap((pipe) => pipe.branchPipes || []) ||
                              [];
                          return allBranches.length > 0
                              ? allBranches.reduce((sum, branch) => sum + branch.length, 0) /
                                    allBranches.length
                              : 0;
                      })(),
                      totalBranchPipeLength:
                          projectData.subMainPipes
                              ?.flatMap((pipe) => pipe.branchPipes || [])
                              .reduce((sum, branch) => sum + branch.length, 0) || 0,
                      branchPipeCount:
                          projectData.subMainPipes?.flatMap((pipe) => pipe.branchPipes || [])
                              .length || 0,
                      branchPipeDetails:
                          projectData.subMainPipes
                              ?.flatMap((pipe) => pipe.branchPipes || [])
                              .map((branch) => ({
                                  id: branch.id,
                                  length: branch.length,
                                  plantCount: branch.plants?.length || 0,
                              })) || [],

                      longestSubMainPipe:
                          projectData.subMainPipes?.length > 0
                              ? Math.max(...projectData.subMainPipes.map((pipe) => pipe.length))
                              : 0,
                      shortestSubMainPipe:
                          projectData.subMainPipes?.length > 0
                              ? Math.min(...projectData.subMainPipes.map((pipe) => pipe.length))
                              : 0,
                      averageSubMainPipeLength:
                          projectData.subMainPipes?.length > 0
                              ? projectData.subMainPipes.reduce(
                                    (sum, pipe) => sum + pipe.length,
                                    0
                                ) / projectData.subMainPipes.length
                              : 0,
                      totalSubMainPipeLength:
                          projectData.subMainPipes?.reduce((sum, pipe) => sum + pipe.length, 0) ||
                          0,
                      subMainPipeCount: projectData.subMainPipes?.length || 0,
                      subMainPipeDetails:
                          projectData.subMainPipes?.map((pipe) => ({
                              id: pipe.id,
                              length: pipe.length,
                              branchCount: pipe.branchPipes?.length || 0,
                          })) || [],

                      plantDensityPerSquareMeter:
                          projectData.totalArea > 0 ? actualTotalPlants / projectData.totalArea : 0,
                      waterEfficiencyPerSquareMeter:
                          projectData.totalArea > 0
                              ? actualTotalWaterPerSession / projectData.totalArea
                              : 0,
                      coveragePercentage: 100,
                  },
              ];

    const mainPipeStats: ComprehensiveMainPipeStats = (() => {
        if (!projectData.mainPipes || projectData.mainPipes.length === 0) {
            return {
                totalMainPipes: 0,
                longestMainPipe: 0,
                shortestMainPipe: 0,
                averageMainPipeLength: 0,
                totalMainPipeLength: 0,
                farthestDestination: { zoneName: '', distance: 0, pipeId: '' },
                closestDestination: { zoneName: '', distance: 0, pipeId: '' },
                allMainPipeDetails: [],
                totalFlowCapacity: 0,
                averagePressure: 0,
                mainPipeEfficiency: 0,
            };
        }

        const mainPipeLengths = projectData.mainPipes.map((pipe) => pipe.length);
        const longestMainPipe = Math.max(...mainPipeLengths);
        const shortestMainPipe = Math.min(...mainPipeLengths);
        const averageMainPipeLength =
            mainPipeLengths.reduce((sum, length) => sum + length, 0) / mainPipeLengths.length;
        const totalMainPipeLength = mainPipeLengths.reduce((sum, length) => sum + length, 0);

        const longestPipe = projectData.mainPipes.find((pipe) => pipe.length === longestMainPipe);
        const shortestPipe = projectData.mainPipes.find((pipe) => pipe.length === shortestMainPipe);

        const getZoneName = (zoneId: string) => {
            if (projectData.useZones && projectData.zones) {
                const zone = projectData.zones.find((z) => z.id === zoneId);
                return zone ? zone.name : 'พื้นที่หลัก';
            }
            return 'พื้นที่หลัก';
        };

        const farthestDestination = {
            zoneName: longestPipe ? getZoneName(longestPipe.toZone) : '',
            distance: longestMainPipe,
            pipeId: longestPipe?.id || '',
        };

        const closestDestination = {
            zoneName: shortestPipe ? getZoneName(shortestPipe.toZone) : '',
            distance: shortestMainPipe,
            pipeId: shortestPipe?.id || '',
        };

        const allMainPipeDetails = projectData.mainPipes.map((pipe) => ({
            pipeId: pipe.id,
            fromPump: pipe.fromPump,
            toZone: pipe.toZone,
            destinationName: getZoneName(pipe.toZone),
            length: pipe.length,
            diameter: pipe.diameter,
            material: pipe.material || 'PVC',
            flowRate: pipe.flowRate || 0,
            pressure: pipe.pressure || 0,
        }));

        const totalFlowCapacity = allMainPipeDetails.reduce((sum, pipe) => sum + pipe.flowRate, 0);
        const averagePressure =
            allMainPipeDetails.length > 0
                ? allMainPipeDetails.reduce((sum, pipe) => sum + pipe.pressure, 0) /
                  allMainPipeDetails.length
                : 0;

        const mainPipeEfficiency = Math.max(0, 100 - averageMainPipeLength / 100);

        return {
            totalMainPipes: projectData.mainPipes.length,
            longestMainPipe,
            shortestMainPipe,
            averageMainPipeLength,
            totalMainPipeLength,
            farthestDestination,
            closestDestination,
            allMainPipeDetails,
            totalFlowCapacity,
            averagePressure,
            mainPipeEfficiency,
        };
    })();

    const totalSubMainPipeLength = zoneStats.reduce(
        (sum, zone) => sum + zone.totalSubMainPipeLength,
        0
    );
    const totalBranchPipeLength = zoneStats.reduce(
        (sum, zone) => sum + zone.totalBranchPipeLength,
        0
    );
    const totalPipeLength =
        mainPipeStats.totalMainPipeLength + totalSubMainPipeLength + totalBranchPipeLength;

    const totalSubMainPipes = zoneStats.reduce((sum, zone) => sum + zone.subMainPipeCount, 0);
    const totalBranchPipes = zoneStats.reduce((sum, zone) => sum + zone.branchPipeCount, 0);
    const totalPipeSections = mainPipeStats.totalMainPipes + totalSubMainPipes + totalBranchPipes;

    const systemEfficiency = Math.min(
        100,
        (actualTotalPlants > 0 ? 80 : 0) +
            (totalPipeLength > 0 ? 15 : 0) +
            (projectData.pump ? 5 : 0)
    );

    const waterDistributionBalance =
        zoneStats.length > 1
            ? (() => {
                  const zoneWaterNeeds = zoneStats.map((zone) => zone.actualTotalWaterPerSession);
                  const avgWater =
                      zoneWaterNeeds.reduce((sum, need) => sum + need, 0) / zoneWaterNeeds.length;
                  const variance =
                      zoneWaterNeeds.reduce((sum, need) => sum + Math.pow(need - avgWater, 2), 0) /
                      zoneWaterNeeds.length;
                  return Math.max(0, 100 - (Math.sqrt(variance) / avgWater) * 100);
              })()
            : 100;

    const pipeOptimization = Math.max(0, 100 - (totalPipeLength / projectData.totalArea) * 100);

    const plantVarieties: Record<
        string,
        { totalCount: number; zones: Array<{ zoneName: string; count: number }> }
    > = {};

    zoneStats.forEach((zone) => {
        const plantName = zone.plantType;
        if (!plantVarieties[plantName]) {
            plantVarieties[plantName] = { totalCount: 0, zones: [] };
        }
        plantVarieties[plantName].totalCount += zone.actualPlantCount;
        plantVarieties[plantName].zones.push({
            zoneName: zone.zoneName,
            count: zone.actualPlantCount,
        });
    });

    const comprehensiveStats: ComprehensiveProjectStats = {
        projectName: projectData.projectName,
        totalArea: projectData.totalArea,
        actualTotalPlants,
        actualTotalWaterPerSession,
        numberOfZones: projectData.useZones ? projectData.zones?.length || 0 : 1,

        zoneStats,
        mainPipeStats,

        totalPipeLength,
        totalMainPipeLength: mainPipeStats.totalMainPipeLength,
        totalSubMainPipeLength,
        totalBranchPipeLength,

        totalMainPipes: mainPipeStats.totalMainPipes,
        totalSubMainPipes,
        totalBranchPipes,
        totalPipeSections,

        systemEfficiency,
        waterDistributionBalance,
        pipeOptimization,

        plantVarieties,
    };

    console.log('✅ Comprehensive project statistics calculated:', comprehensiveStats);
    return comprehensiveStats;
};

const exportMapAsImage = async (mapElement: HTMLElement): Promise<string | null> => {
    if (!mapElement) {
        console.error('Map element not found');
        return null;
    }

    try {
        console.log('🖼️ Starting enhanced map export...');

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const html2canvas = await import('html2canvas');
        const html2canvasLib = html2canvas.default || html2canvas;

        const canvas = await html2canvasLib(mapElement, {
            useCORS: true,
            allowTaint: false,
            scale: 2,
            logging: false,
            backgroundColor: '#1F2937',
            width: mapElement.offsetWidth,
            height: mapElement.offsetHeight,
            onclone: (clonedDoc) => {
                try {
                    const controls = clonedDoc.querySelectorAll('.leaflet-control-container');
                    controls.forEach((el) => el.remove());

                    const elements = clonedDoc.querySelectorAll('*');
                    elements.forEach((el: Element) => {
                        const htmlEl = el as HTMLElement;
                        if (htmlEl.style.color?.includes('oklch')) {
                            htmlEl.style.color = 'rgb(255, 255, 255)';
                        }
                        if (htmlEl.style.backgroundColor?.includes('oklch')) {
                            htmlEl.style.backgroundColor = 'transparent';
                        }
                    });
                } catch (error) {
                    console.warn('Warning in onclone:', error);
                }
            },
        });

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        console.log('✅ Enhanced map image exported successfully');
        return dataUrl;
    } catch (error) {
        console.error('❌ Error exporting map as image:', error);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (ctx) {
                canvas.width = mapElement.offsetWidth || 800;
                canvas.height = mapElement.offsetHeight || 600;

                ctx.fillStyle = '#1F2937';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = '#FFFFFF';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('แผนผังระบบน้ำสวนผลไม้', canvas.width / 2, canvas.height / 2 - 40);
                ctx.fillText('(ไม่สามารถส่งออกแผนที่ได้)', canvas.width / 2, canvas.height / 2);
                ctx.fillText('กรุณาใช้ screenshot แทน', canvas.width / 2, canvas.height / 2 + 40);

                return canvas.toDataURL('image/jpeg', 0.8);
            }
        } catch (fallbackError) {
            console.error('❌ Fallback export also failed:', fallbackError);
        }

        return null;
    }
};

const downloadImage = (dataUrl: string, filename: string = 'horticulture-layout.jpg'): void => {
    try {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('✅ Image downloaded successfully:', filename);
    } catch (error) {
        console.error('❌ Error downloading image:', error);
        try {
            window.open(dataUrl);
        } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
        }
    }
};

const MapBounds = ({ positions }: { positions: Array<{ lat: number; lng: number }> }) => {
    const map = useMap();

    useEffect(() => {
        if (positions.length > 0) {
            try {
                const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
                map.fitBounds(bounds, {
                    padding: [10, 10],
                    maxZoom: 28,
                });
            } catch (error) {
                console.error('Error fitting bounds:', error);
            }
        }
    }, [positions, map]);

    return null;
};

const createPumpIcon = () =>
    L.divIcon({
        html: `<div style="
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, rgb(59, 130, 246), rgb(30, 64, 175));
        border: 2px solid rgb(255, 255, 255);
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgb(255, 255, 255);
        font-weight: bold;
        font-size: 14px;
    ">P</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

const createPlantIcon = () =>
    L.divIcon({
        html: `<div style="
        width: 16px;
        height: 16px;
    "><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAABlklEQVR4nI1TW0sCQRTel/plqSlGEUTPQRqRRBSE9tJDd7tApVI+VERRWcvMbNkFDArsSsLOZV8q+yXFiZ20dtdZaeB7OXO+M+d88x1N8xwhCq0WJZ2C4Zyg+FSC4ayMiUKr1uxwTqKC4apgBJSg5N1iKKIkM4aHOSVfvuQaajmJhpe5gvxQ2YPHyr6yiEWN8O/MgpJ3Z8L+zTTMFPth4CgokS8l4ex+1VMIf0hNLGZ0OS9MU4fBQjvEDtsaoJcX3Z2YqEOTatcClOowjnqU5DpQefmvACMZjVNSrAeun/Ku5GQuAFPLIUjlgjC88xPD5RXHr+BTTVBy5uwghXohftAG4xsBWJpph42JMCR2A5I8pnd7BTXsEbJeDexOZosxmEuHYG0yDGtXIzB/HofSc96tgT2CJV2n/G9A26NwnO7z9wQnUe3lZbOFU/ymSrjcSsLJgl8BXP21tsVQRGWku4sM3CL319XwybkRdC8RI4l/W5niIeU+2Pb0G+dHNPzKTRRqupFSExN12ArX15lTvG7H7Dsv4Rsa94hVuqmogAAAAABJRU5ErkJggg==" alt="tree"></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [10, 10],
    });

export default function ComprehensiveHorticultureResultsPage() {
    const [projectData, setProjectData] = useState<HorticultureProjectData | null>(null);
    const [projectStats, setProjectStats] = useState<ComprehensiveProjectStats | null>(null);
    const [mapImageUrl, setMapImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [exportingImage, setExportingImage] = useState(false);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number]>([13.75, 100.5]);
    const [mapZoom, setMapZoom] = useState<number>(16);
    const [activeTab, setActiveTab] = useState<'overview' | 'zones' | 'pipes' | 'detailed'>(
        'overview'
    );
    const [savingToDatabase, setSavingToDatabase] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const storedData = localStorage.getItem('horticultureIrrigationData');
            if (storedData) {
                const data = JSON.parse(storedData);
                setProjectData(data);

                console.group('🔍 Loading Comprehensive Project Data');
                console.log('📊 Raw project data:', data);

                const stats = calculateComprehensiveProjectStats(data);
                setProjectStats(stats);

                console.log('📈 Comprehensive stats calculated:', stats);
                console.groupEnd();

                if (data.mainArea && data.mainArea.length > 0) {
                    const centerLat =
                        data.mainArea.reduce((sum, point) => sum + point.lat, 0) /
                        data.mainArea.length;
                    const centerLng =
                        data.mainArea.reduce((sum, point) => sum + point.lng, 0) /
                        data.mainArea.length;
                    setMapCenter([centerLat, centerLng]);

                    const bounds = L.latLngBounds(data.mainArea.map((p) => [p.lat, p.lng]));
                    const boundsSize = bounds.getNorthEast().distanceTo(bounds.getSouthWest());

                    let initialZoom;
                    if (boundsSize < 50) initialZoom = 21;
                    else if (boundsSize < 100) initialZoom = 20;
                    else if (boundsSize < 200) initialZoom = 19;
                    else if (boundsSize < 500) initialZoom = 18;
                    else if (boundsSize < 1000) initialZoom = 17;
                    else initialZoom = 16;

                    setMapZoom(initialZoom);
                }
            } else {
                console.warn('❌ No project data found, redirecting to planner');
                router.visit('/horticulture/planner');
            }
        } catch (error) {
            console.error('❌ Error loading project data:', error);
            router.visit('/horticulture/planner');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (projectData && mapLoaded && !exportingImage && !mapImageUrl) {
            const timer = setTimeout(() => {
                handleExportMapImage();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [projectData, mapLoaded, exportingImage, mapImageUrl]);

    const handleExportMapImage = async () => {
        if (!mapRef.current || exportingImage) return;

        setExportingImage(true);

        try {
            const imageUrl = await exportMapAsImage(mapRef.current);
            if (imageUrl) {
                setMapImageUrl(imageUrl);
                console.log('✅ Map image exported successfully');
            }
        } catch (error) {
            console.error('❌ Error exporting map image:', error);
        }

        setExportingImage(false);
    };

    const handleDownloadImage = () => {
        if (mapImageUrl) {
            downloadImage(mapImageUrl, `${projectData?.projectName || 'horticulture-layout'}.jpg`);
        }
    };

    const handleDownloadStats = () => {
        if (projectData && projectStats) {
            const statsData = {
                projectInfo: {
                    name: projectData.projectName,
                    createdAt: projectData.createdAt,
                    totalArea: projectData.totalArea,
                    useZones: projectData.useZones,
                },
                comprehensiveStats: projectStats,
                exportedAt: new Date().toISOString(),
            };

            const blob = new Blob([JSON.stringify(statsData, null, 2)], {
                type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectData.projectName}-comprehensive-stats.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleNewProject = () => {
        localStorage.removeItem('horticultureIrrigationData');
        localStorage.removeItem('editingFieldId');
        router.visit('/horticulture/planner');
    };

    const handleEditProject = () => {
        // Keep the saved data for editing
        // Don't clear editingFieldId so the planner knows we're editing
        router.visit('/horticulture/planner');
    };

    const handleSaveToDatabase = async () => {
        if (!projectData || !projectStats) return;

        setSavingToDatabase(true);
        setSaveError(null);
        setSaveSuccess(false);

        try {
            // Check if we're editing an existing field by looking for fieldId in URL or localStorage
            const urlParams = new URLSearchParams(window.location.search);
            const fieldId = urlParams.get('fieldId') || localStorage.getItem('editingFieldId');
            
            console.log('Detected fieldId for save operation:', fieldId);
            // Prepare zones data
            const zonesData = projectData.zones?.map(zone => ({
                id: zone.id,
                name: zone.name,
                polygon_coordinates: zone.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                color: zone.color,
                pipe_direction: 'horizontal' // Default direction
            })) || [];

            // Prepare planting points data
            const plantingPointsData = projectData.plants?.map(plant => {
                // Find which zone this plant belongs to
                let zoneId: number | null = null;
                if (projectData.useZones && projectData.zones) {
                    for (const zone of projectData.zones) {
                        if (isPointInPolygon(plant.position, zone.coordinates)) {
                            zoneId = parseInt(zone.id);
                            break;
                        }
                    }
                }
                
                return {
                    lat: plant.position.lat,
                    lng: plant.position.lng,
                    point_id: plant.id, // Keep original ID for new saves, will be regenerated for updates
                    zone_id: zoneId
                };
            }) || [];

            // Prepare main pipes data
            const mainPipesData = projectData.mainPipes?.map(pipe => ({
                type: 'main',
                direction: 'horizontal',
                start_lat: pipe.coordinates[0]?.lat || 0,
                start_lng: pipe.coordinates[0]?.lng || 0,
                end_lat: pipe.coordinates[pipe.coordinates.length - 1]?.lat || 0,
                end_lng: pipe.coordinates[pipe.coordinates.length - 1]?.lng || 0,
                length: pipe.length,
                plants_served: 0,
                water_flow: pipe.flowRate || 0,
                pipe_diameter: pipe.diameter,
                zone_id: null,
                row_index: null,
                col_index: null
            })) || [];

            // Prepare sub-main pipes data
            const subMainPipesData = projectData.subMainPipes?.map(pipe => ({
                type: 'submain',
                direction: 'horizontal',
                start_lat: pipe.coordinates[0]?.lat || 0,
                start_lng: pipe.coordinates[0]?.lng || 0,
                end_lat: pipe.coordinates[pipe.coordinates.length - 1]?.lat || 0,
                end_lng: pipe.coordinates[pipe.coordinates.length - 1]?.lng || 0,
                length: pipe.length,
                plants_served: 0,
                water_flow: 0,
                pipe_diameter: pipe.diameter || 0,
                zone_id: parseInt(pipe.zoneId),
                row_index: null,
                col_index: null
            })) || [];

            // Prepare branch pipes data
            const branchPipesData = projectData.subMainPipes?.flatMap(subMainPipe => 
                subMainPipe.branchPipes?.map(branchPipe => ({
                    type: 'branch',
                    direction: 'horizontal',
                    start_lat: branchPipe.coordinates[0]?.lat || 0,
                    start_lng: branchPipe.coordinates[0]?.lng || 0,
                    end_lat: branchPipe.coordinates[branchPipe.coordinates.length - 1]?.lat || 0,
                    end_lng: branchPipe.coordinates[branchPipe.coordinates.length - 1]?.lng || 0,
                    length: branchPipe.length,
                    plants_served: branchPipe.plants?.length || 0,
                    water_flow: 0,
                    pipe_diameter: branchPipe.diameter || 0,
                    zone_id: parseInt(subMainPipe.zoneId),
                    row_index: null,
                    col_index: null
                })) || []
            ) || [];

            // Prepare layers data (exclusion areas)
            const layersData = projectData.exclusionAreas?.map(area => ({
                type: area.type,
                coordinates: area.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                is_initial_map: false
            })) || [];

            // Add main area as initial map layer
            if (projectData.mainArea && projectData.mainArea.length > 0) {
                layersData.unshift({
                    type: 'other',
                    coordinates: projectData.mainArea.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                    is_initial_map: true
                });
            }

            const requestData = {
                field_name: projectData.projectName,
                area_coordinates: projectData.mainArea,
                plant_type_id: projectData.plants?.[0]?.plantData.id || 1,
                total_plants: projectData.plants?.length || 0,
                total_area: projectData.totalArea,
                total_water_need: projectStats.actualTotalWaterPerSession,
                area_type: 'horticulture',
                layers: layersData,
                zones: zonesData,
                planting_points: plantingPointsData,
                pipes: [...mainPipesData, ...subMainPipesData, ...branchPipesData]
            };

            console.log('Saving horticulture project to database:', requestData);

            let response;
            if (fieldId) {
                // Update existing field
                console.log('Updating existing field with ID:', fieldId);
                response = await axios.put(`/api/fields/${fieldId}`, requestData, {
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
                        'Content-Type': 'application/json',
                    }
                });
            } else {
                // Create new field
                console.log('Creating new field');
                response = await axios.post('/api/save-field', requestData, {
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
                        'Content-Type': 'application/json',
                    }
                });
            }

            if (response.data.success) {
                setSaveSuccess(true);
                console.log('✅ Horticulture project saved successfully');
                
                // Clear editing field ID after successful save
                localStorage.removeItem('editingFieldId');
                
                // Redirect immediately to home page
                router.visit('/');
            } else {
                throw new Error('Failed to save project');
            }

        } catch (error) {
            console.error('❌ Error saving horticulture project:', error);
            const errorMessage = axios.isAxiosError(error) 
                ? error.response?.data?.message || error.response?.data?.error || error.message || 'Error saving project'
                : 'An unexpected error occurred';
            setSaveError(errorMessage);
        } finally {
            setSavingToDatabase(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-32 w-32 animate-spin rounded-full border-b-2 border-white"></div>
                    <p className="text-xl">กำลังโหลดข้อมูลโครงการ...</p>
                </div>
            </div>
        );
    }

    if (!projectData || !projectStats) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="mb-4 text-2xl font-bold">ไม่พบข้อมูลโครงการ</h1>
                    <button
                        onClick={() => router.visit('/horticulture/planner')}
                        className="rounded-lg bg-blue-600 px-6 py-3 transition-colors hover:bg-blue-700"
                    >
                        กลับไปสร้างโครงการใหม่
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 p-6 text-white">
            <div className="mx-auto w-full">
                <div className="mb-8 text-center">
                    <h1 className="mb-4 text-4xl font-bold text-green-400">
                        🌱 รายงานการออกแบบระบบน้ำสวนผลไม้ - ฉบับสมบูรณ์
                    </h1>
                    <h2 className="text-2xl text-gray-300">{projectData.projectName}</h2>
                    <p className="mt-2 text-gray-400">
                        วันที่สร้าง: {new Date(projectData.createdAt).toLocaleDateString('th-TH')}
                    </p>
                </div>

                <div className="mb-8 flex justify-center">
                    <div className="flex rounded-lg bg-gray-800 p-1">
                        {[
                            { id: 'overview', label: '📊 ภาพรวม', icon: '📊' },
                            { id: 'zones', label: '🏞️ รายละเอียดโซน', icon: '🏞️' },
                            { id: 'pipes', label: '🔧 ระบบท่อ', icon: '🔧' },
                            { id: 'detailed', label: '📋 รายงานละเอียด', icon: '📋' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
                    <div className="lg:col-span-2">
                        <div className="rounded-lg bg-gray-800 p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xl font-semibold">🗺️ แผนผังโครงการ</h3>
                                <div className="flex gap-2">
                                    {exportingImage && (
                                        <div className="flex items-center gap-2 text-blue-400">
                                            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-400"></div>
                                            <span className="text-sm">กำลังสร้างภาพ...</span>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleExportMapImage}
                                        disabled={exportingImage || !mapLoaded}
                                        className="rounded bg-blue-600 px-3 py-1 text-sm transition-colors hover:bg-blue-700 disabled:bg-gray-600"
                                    >
                                        {exportingImage ? 'กำลังสร้างภาพ...' : '📷 สร้างภาพใหม่'}
                                    </button>

                                    {mapImageUrl && (
                                        <button
                                            onClick={handleDownloadImage}
                                            className="rounded bg-green-600 px-3 py-1 text-sm transition-colors hover:bg-green-700"
                                        >
                                            💾 ดาวน์โหลดภาพ
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Compact Map */}
                            <div
                                ref={mapRef}
                                className="mb-4 h-[500px] w-full overflow-hidden rounded-lg border border-gray-600"
                                style={{ backgroundColor: 'rgb(31, 41, 55)' }}
                            >
                                <MapContainer
                                    center={mapCenter}
                                    zoom={mapZoom}
                                    maxZoom={64}
                                    style={{ height: '100%', width: '100%' }}
                                    zoomControl={false}
                                    attributionControl={false}
                                    dragging={false}
                                    scrollWheelZoom={false}
                                    doubleClickZoom={false}
                                    touchZoom={false}
                                    boxZoom={false}
                                    keyboard={false}
                                    whenReady={() => setMapLoaded(true)}
                                >
                                    <LayersControl position="topright">
                                        <LayersControl.BaseLayer checked name="ภาพถ่ายดาวเทียม">
                                            <TileLayer
                                                url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                                                attribution="Google Maps"
                                                maxZoom={30}
                                                maxNativeZoom={20}
                                            />
                                        </LayersControl.BaseLayer>
                                    </LayersControl>

                                    {projectData.mainArea.length > 0 && (
                                        <MapBounds positions={projectData.mainArea} />
                                    )}

                                    {/* Main Area */}
                                    {projectData.mainArea.length > 0 && (
                                        <Polygon
                                            positions={projectData.mainArea.map((coord) => [
                                                coord.lat,
                                                coord.lng,
                                            ])}
                                            pathOptions={{
                                                color: 'rgb(34, 197, 94)',
                                                fillColor: 'rgb(34, 197, 94)',
                                                fillOpacity: 0.1,
                                                weight: 2,
                                            }}
                                        />
                                    )}

                                    {/* Exclusion Areas */}
                                    {projectData.exclusionAreas &&
                                        projectData.exclusionAreas.map((area) => (
                                            <Polygon
                                                key={area.id}
                                                positions={area.coordinates.map((coord) => [
                                                    coord.lat,
                                                    coord.lng,
                                                ])}
                                                pathOptions={{
                                                    color: 'rgb(239, 68, 68)',
                                                    fillColor: 'rgb(239, 68, 68)',
                                                    fillOpacity: 0.4,
                                                    weight: 2,
                                                }}
                                            />
                                        ))}

                                    {/* Zones */}
                                    {projectData.zones &&
                                        projectData.zones.map((zone) => (
                                            <Polygon
                                                key={zone.id}
                                                positions={zone.coordinates.map((coord) => [
                                                    coord.lat,
                                                    coord.lng,
                                                ])}
                                                pathOptions={{
                                                    color: zone.color,
                                                    fillColor: zone.color,
                                                    fillOpacity: 0.3,
                                                    weight: 3,
                                                }}
                                            />
                                        ))}

                                    {/* Pump */}
                                    {projectData.pump && (
                                        <Marker
                                            position={[
                                                projectData.pump.position.lat,
                                                projectData.pump.position.lng,
                                            ]}
                                            icon={createPumpIcon()}
                                        />
                                    )}

                                    {/* Main Pipes */}
                                    {projectData.mainPipes &&
                                        projectData.mainPipes.map((pipe) => (
                                            <Polyline
                                                key={pipe.id}
                                                positions={pipe.coordinates.map((coord) => [
                                                    coord.lat,
                                                    coord.lng,
                                                ])}
                                                pathOptions={{
                                                    color: 'rgb(59, 130, 246)',
                                                    weight: 6,
                                                    opacity: 0.9,
                                                }}
                                            />
                                        ))}

                                    {/* Sub-Main Pipes and Branch Pipes */}
                                    {projectData.subMainPipes &&
                                        projectData.subMainPipes.map((pipe) => (
                                            <React.Fragment key={pipe.id}>
                                                <Polyline
                                                    positions={pipe.coordinates.map((coord) => [
                                                        coord.lat,
                                                        coord.lng,
                                                    ])}
                                                    pathOptions={{
                                                        color: 'rgb(139, 92, 246)',
                                                        weight: 4,
                                                        opacity: 0.9,
                                                    }}
                                                />
                                                {pipe.branchPipes &&
                                                    pipe.branchPipes.map((branchPipe) => (
                                                        <Polyline
                                                            key={branchPipe.id}
                                                            positions={branchPipe.coordinates.map(
                                                                (coord) => [coord.lat, coord.lng]
                                                            )}
                                                            pathOptions={{
                                                                color: 'rgb(16, 185, 129)',
                                                                weight: 2,
                                                                opacity: 0.8,
                                                            }}
                                                        />
                                                    ))}
                                            </React.Fragment>
                                        ))}

                                    {/* Plants */}
                                    {projectData.plants &&
                                        projectData.plants.map((plant) => (
                                            <Marker
                                                key={plant.id}
                                                position={[plant.position.lat, plant.position.lng]}
                                                icon={createPlantIcon()}
                                            />
                                        ))}
                                </MapContainer>
                            </div>

                            {/* Map Image Preview */}
                            {mapImageUrl && (
                                <div>
                                    <h4 className="mb-2 text-sm font-medium">
                                        ภาพแผนผังที่ส่งออก (คุณภาพสูง):
                                    </h4>
                                    <img
                                        src={mapImageUrl}
                                        alt="Exported Map Layout"
                                        className="w-full rounded border border-gray-600"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Legend */}
                        <div className="mt-6 rounded-lg bg-gray-800 p-4">
                            <h3 className="mb-3 text-lg font-semibold">🎨 คำอธิบายสัญลักษณ์</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="h-1 w-4 bg-blue-500"></div>
                                    <span>ท่อเมน (จากปั๊ม)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-1 w-4 bg-purple-500"></div>
                                    <span>ท่อเมนรอง</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-1 w-4 bg-green-500"></div>
                                    <span>ท่อย่อย</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 bg-red-500 opacity-50"></div>
                                    <span>พื้นที่ต้องหลีกเลี่ยง</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                                        P
                                    </div>
                                    <span>ปั๊มน้ำ</span>
                                </div>
                                <div className="flex items-center gap-2">
                                <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAABlklEQVR4nI1TW0sCQRTel/plqSlGEUTPQRqRRBSE9tJDd7tApVI+VERRWcvMbNkFDArsSsLOZV8q+yXFiZ20dtdZaeB7OXO+M+d88x1N8xwhCq0WJZ2C4Zyg+FSC4ayMiUKr1uxwTqKC4apgBJSg5N1iKKIkM4aHOSVfvuQaajmJhpe5gvxQ2YPHyr6yiEWN8O/MgpJ3Z8L+zTTMFPth4CgokS8l4ex+1VMIf0hNLGZ0OS9MU4fBQjvEDtsaoJcX3Z2YqEOTatcClOowjnqU5DpQefmvACMZjVNSrAeun/Ku5GQuAFPLIUjlgjC88xPD5RXHr+BTTVBy5uwghXohftAG4xsBWJpph42JMCR2A5I8pnd7BTXsEbJeDexOZosxmEuHYG0yDGtXIzB/HofSc96tgT2CJV2n/G9A26NwnO7z9wQnUe3lZbOFU/ymSrjcSsLJgl8BXP21tsVQRGWku4sM3CL319XwybkRdC8RI4l/W5niIeU+2Pb0G+dHNPzKTRRqupFSExN12ArX15lTvG7H7Dsv4Rsa94hVuqmogAAAAABJRU5ErkJggg==" alt="tree" />
                                    <span>ต้นไม้ (แต่ละจุด)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Content based on active tab */}
                    <div className="lg:col-span-2">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Overall Statistics */}
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h3 className="mb-4 text-xl font-semibold">
                                        📈 สถิติรวมโครงการ
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="rounded bg-gray-700 p-3">
                                            <div className="text-gray-400">พื้นที่รวม</div>
                                            <div className="text-lg font-bold text-green-400">
                                                {formatArea(projectStats.totalArea)}
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-3">
                                            <div className="text-gray-400">จำนวนโซน</div>
                                            <div className="text-lg font-bold text-blue-400">
                                                {projectStats.numberOfZones} โซน
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-3">
                                            <div className="text-gray-400">ต้นไม้รวม</div>
                                            <div className="text-lg font-bold text-yellow-400">
                                                {projectStats.actualTotalPlants.toLocaleString()}{' '}
                                                ต้น
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-3">
                                            <div className="text-gray-400">น้ำต่อครั้ง</div>
                                            <div className="text-lg font-bold text-cyan-400">
                                                {formatWaterVolume(
                                                    projectStats.actualTotalWaterPerSession
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Plant Varieties */}
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h3 className="mb-4 text-xl font-semibold">
                                        🌿 พันธุ์พืชที่ปลูก
                                    </h3>
                                    <div className="space-y-3">
                                        {Object.entries(projectStats.plantVarieties).map(
                                            ([plantName, data]) => (
                                                <div
                                                    key={plantName}
                                                    className="rounded bg-gray-700 p-3"
                                                >
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <span className="font-medium text-green-400">
                                                            {plantName}
                                                        </span>
                                                        <span className="font-bold text-yellow-400">
                                                            {data.totalCount.toLocaleString()} ต้น
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-300">
                                                        กระจายใน:{' '}
                                                        {data.zones
                                                            .map((z) => z.zoneName)
                                                            .join(', ')}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Pipe System Overview */}
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h3 className="mb-4 text-xl font-semibold">🔧 ภาพรวมระบบท่อ</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="rounded bg-gray-700 p-3">
                                            <div className="text-gray-400">ท่อเมน</div>
                                            <div className="text-lg font-bold text-blue-400">
                                                {projectStats.totalMainPipes} เส้น
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {formatDistance(projectStats.totalMainPipeLength)}
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-3">
                                            <div className="text-gray-400">ท่อเมนรอง</div>
                                            <div className="text-lg font-bold text-purple-400">
                                                {projectStats.totalSubMainPipes} เส้น
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {formatDistance(
                                                    projectStats.totalSubMainPipeLength
                                                )}
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-3">
                                            <div className="text-gray-400">ท่อย่อย</div>
                                            <div className="text-lg font-bold text-green-400">
                                                {projectStats.totalBranchPipes} เส้น
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {formatDistance(projectStats.totalBranchPipeLength)}
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-3">
                                            <div className="text-gray-400">รวมทั้งหมด</div>
                                            <div className="text-lg font-bold text-yellow-400">
                                                {formatDistance(projectStats.totalPipeLength)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {projectStats.totalPipeSections} ท่อน
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Performance Analysis */}
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h3 className="mb-4 text-xl font-semibold">
                                        ⚡ การวิเคราะห์ประสิทธิภาพ
                                    </h3>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div className="rounded bg-gray-700 p-3 text-center">
                                            <div className="text-gray-400">ประสิทธิภาพระบบ</div>
                                            <div className="text-2xl font-bold text-green-400">
                                                {projectStats.systemEfficiency.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-3 text-center">
                                            <div className="text-gray-400">ความสมดุลน้ำ</div>
                                            <div className="text-2xl font-bold text-blue-400">
                                                {projectStats.waterDistributionBalance.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-3 text-center">
                                            <div className="text-gray-400">เพิ่มประสิทธิภาพท่อ</div>
                                            <div className="text-2xl font-bold text-purple-400">
                                                {projectStats.pipeOptimization.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Zones Tab - รายละเอียดแต่ละโซน */}
                        {activeTab === 'zones' && (
                            <div className="space-y-6">
                                <h3 className="text-2xl font-semibold text-green-400">
                                    🏞️ รายละเอียดแต่ละโซน
                                </h3>
                                {projectStats.zoneStats.map((zone) => (
                                    <div key={zone.zoneId} className="rounded-lg bg-gray-800 p-6">
                                        <h4 className="mb-4 flex items-center justify-between text-xl font-semibold text-green-400">
                                            <span>{zone.zoneName}</span>
                                            <div
                                                className="h-6 w-6 rounded"
                                                style={{
                                                    backgroundColor:
                                                        projectData.zones.find(
                                                            (z) => z.id === zone.zoneId
                                                        )?.color || '#4ECDC4',
                                                }}
                                            ></div>
                                        </h4>

                                        {/* พื้นฐานของโซน */}
                                        <div className="mb-6 grid grid-cols-2 gap-4">
                                            <div className="rounded bg-gray-700 p-4">
                                                <h5 className="mb-2 font-semibold text-yellow-400">
                                                    🌱 ข้อมูลการปลูก
                                                </h5>
                                                <div className="space-y-1 text-sm">
                                                    <div>
                                                        <strong>พืช:</strong> {zone.plantType}
                                                    </div>
                                                    <div>
                                                        <strong>ระยะห่างต้น:</strong>{' '}
                                                        {zone.plantSpacing} ม.
                                                    </div>
                                                    <div>
                                                        <strong>ระยะห่างแถว:</strong>{' '}
                                                        {zone.rowSpacing} ม.
                                                    </div>
                                                    <div>
                                                        <strong>จำนวนต้นไม้:</strong>{' '}
                                                        <span className="font-bold text-green-400">
                                                            {zone.actualPlantCount.toLocaleString()}{' '}
                                                            ต้น
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <strong>น้ำต่อต้น:</strong>{' '}
                                                        {zone.waterNeedPerPlant} ล./ครั้ง
                                                    </div>
                                                    <div>
                                                        <strong>น้ำรวมต่อครั้ง:</strong>{' '}
                                                        <span className="font-bold text-blue-400">
                                                            {formatWaterVolume(
                                                                zone.actualTotalWaterPerSession
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="rounded bg-gray-700 p-4">
                                                <h5 className="mb-2 font-semibold text-blue-400">
                                                    📐 ข้อมูลพื้นที่
                                                </h5>
                                                <div className="space-y-1 text-sm">
                                                    <div>
                                                        <strong>พื้นที่โซน:</strong>{' '}
                                                        {formatArea(zone.zoneArea)}
                                                    </div>
                                                    <div>
                                                        <strong>ความหนาแน่น:</strong>{' '}
                                                        {zone.plantDensityPerSquareMeter.toFixed(3)}{' '}
                                                        ต้น/ตร.ม.
                                                    </div>
                                                    <div>
                                                        <strong>ประสิทธิภาพน้ำ:</strong>{' '}
                                                        {zone.waterEfficiencyPerSquareMeter.toFixed(
                                                            2
                                                        )}{' '}
                                                        ล./ตร.ม./ครั้ง
                                                    </div>
                                                    <div>
                                                        <strong>การครอบคลุม:</strong>{' '}
                                                        {zone.coveragePercentage.toFixed(1)}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ข้อมูลท่อย่อยละเอียด */}
                                        <div className="mb-6 rounded border border-green-600/30 bg-green-900/20 p-4">
                                            <h5 className="mb-3 font-semibold text-green-400">
                                                🔧 ท่อย่อยในโซนนี้
                                            </h5>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <div>
                                                        <strong>จำนวนท่อย่อย:</strong>{' '}
                                                        {zone.branchPipeCount} เส้น
                                                    </div>
                                                    <div>
                                                        <strong>ท่อย่อยยาวที่สุด:</strong>{' '}
                                                        <span className="font-bold text-yellow-400">
                                                            {formatDistance(zone.longestBranchPipe)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <strong>ท่อย่อยสั้นที่สุด:</strong>{' '}
                                                        {formatDistance(zone.shortestBranchPipe)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div>
                                                        <strong>ความยาวเฉลี่ย:</strong>{' '}
                                                        {formatDistance(
                                                            zone.averageBranchPipeLength
                                                        )}
                                                    </div>
                                                    <div>
                                                        <strong>ท่อย่อยยาวรวม:</strong>{' '}
                                                        <span className="font-bold text-green-400">
                                                            {formatDistance(
                                                                zone.totalBranchPipeLength
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ข้อมูลท่อเมนรองละเอียด */}
                                        <div className="mb-6 rounded border border-purple-600/30 bg-purple-900/20 p-4">
                                            <h5 className="mb-3 font-semibold text-purple-400">
                                                🔩 ท่อเมนรองในโซนนี้
                                            </h5>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <div>
                                                        <strong>จำนวนท่อเมนรอง:</strong>{' '}
                                                        {zone.subMainPipeCount} เส้น
                                                    </div>
                                                    <div>
                                                        <strong>ท่อเมนรองยาวที่สุด:</strong>{' '}
                                                        <span className="font-bold text-yellow-400">
                                                            {formatDistance(
                                                                zone.longestSubMainPipe
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <strong>ท่อเมนรองสั้นที่สุด:</strong>{' '}
                                                        {formatDistance(zone.shortestSubMainPipe)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div>
                                                        <strong>ความยาวเฉลี่ย:</strong>{' '}
                                                        {formatDistance(
                                                            zone.averageSubMainPipeLength
                                                        )}
                                                    </div>
                                                    <div>
                                                        <strong>ท่อเมนรองยาวรวม:</strong>{' '}
                                                        <span className="font-bold text-purple-400">
                                                            {formatDistance(
                                                                zone.totalSubMainPipeLength
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pipes Tab - ระบบท่อ */}
                        {activeTab === 'pipes' && (
                            <div className="space-y-6">
                                <h3 className="text-2xl font-semibold text-blue-400">
                                    🔧 ระบบท่อครบถ้วน
                                </h3>

                                {/* ข้อมูลท่อเมนละเอียด */}
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h4 className="mb-4 text-xl font-semibold text-blue-400">
                                        🚰 ระบบท่อเมนจากปั๊มน้ำ
                                    </h4>

                                    <div className="mb-6 grid grid-cols-2 gap-4">
                                        <div className="rounded bg-gray-700 p-4">
                                            <h5 className="mb-2 font-semibold text-blue-300">
                                                📊 สถิติท่อเมนรวม
                                            </h5>
                                            <div className="space-y-1 text-sm">
                                                <div>
                                                    <strong>จำนวนท่อเมน:</strong>{' '}
                                                    {projectStats.mainPipeStats.totalMainPipes} เส้น
                                                </div>
                                                <div>
                                                    <strong>ท่อเมนยาวที่สุด:</strong>{' '}
                                                    <span className="font-bold text-yellow-400">
                                                        {formatDistance(
                                                            projectStats.mainPipeStats
                                                                .longestMainPipe
                                                        )}
                                                    </span>
                                                </div>
                                                <div>
                                                    <strong>ท่อเมนสั้นที่สุด:</strong>{' '}
                                                    {formatDistance(
                                                        projectStats.mainPipeStats.shortestMainPipe
                                                    )}
                                                </div>
                                                <div>
                                                    <strong>ความยาวเฉลี่ย:</strong>{' '}
                                                    {formatDistance(
                                                        projectStats.mainPipeStats
                                                            .averageMainPipeLength
                                                    )}
                                                </div>
                                                <div>
                                                    <strong>ความยาวรวม:</strong>{' '}
                                                    <span className="font-bold text-blue-400">
                                                        {formatDistance(
                                                            projectStats.mainPipeStats
                                                                .totalMainPipeLength
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="rounded bg-gray-700 p-4">
                                            <h5 className="mb-2 font-semibold text-yellow-300">
                                                🎯 การวิเคราะห์ระยะทาง
                                            </h5>
                                            <div className="space-y-1 text-sm">
                                                <div>
                                                    <strong>ปลายทางไกลสุด:</strong>
                                                </div>
                                                <div className="ml-2 text-yellow-400">
                                                    {
                                                        projectStats.mainPipeStats
                                                            .farthestDestination.zoneName
                                                    }
                                                </div>
                                                <div className="ml-2">
                                                    <span className="font-bold text-red-400">
                                                        {formatDistance(
                                                            projectStats.mainPipeStats
                                                                .farthestDestination.distance
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="mt-2">
                                                    <strong>ปลายทางใกล้สุด:</strong>
                                                </div>
                                                <div className="ml-2 text-green-400">
                                                    {
                                                        projectStats.mainPipeStats
                                                            .closestDestination.zoneName
                                                    }
                                                </div>
                                                <div className="ml-2">
                                                    <span className="font-bold text-green-400">
                                                        {formatDistance(
                                                            projectStats.mainPipeStats
                                                                .closestDestination.distance
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* รายละเอียดท่อเมนแต่ละเส้น */}
                                    <div className="rounded border border-blue-600/30 bg-blue-900/20 p-4">
                                        <h5 className="mb-3 font-semibold text-blue-300">
                                            📋 รายละเอียดท่อเมนแต่ละเส้น
                                        </h5>
                                        <div className="space-y-2 text-sm">
                                            {projectStats.mainPipeStats.allMainPipeDetails.map(
                                                (pipe, index) => (
                                                    <div
                                                        key={pipe.pipeId}
                                                        className="flex items-center justify-between rounded bg-gray-700 p-3"
                                                    >
                                                        <div>
                                                            <strong>ท่อเมน {index + 1}:</strong> ไป
                                                            {pipe.destinationName}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-blue-300">
                                                                {formatDistance(pipe.length)}
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                Ø{pipe.diameter}mm | {pipe.material}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* สรุปท่อแต่ละประเภท */}
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="rounded-lg bg-gray-800 p-4">
                                        <h4 className="mb-3 text-lg font-semibold text-blue-400">
                                            🔵 ท่อเมน
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>จำนวน:</span>
                                                <span className="font-bold">
                                                    {projectStats.totalMainPipes} เส้น
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>ยาวรวม:</span>
                                                <span className="font-bold text-blue-400">
                                                    {formatDistance(
                                                        projectStats.totalMainPipeLength
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>เฉลี่ย:</span>
                                                <span>
                                                    {formatDistance(
                                                        projectStats.mainPipeStats
                                                            .averageMainPipeLength
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-gray-800 p-4">
                                        <h4 className="mb-3 text-lg font-semibold text-purple-400">
                                            🟣 ท่อเมนรอง
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>จำนวน:</span>
                                                <span className="font-bold">
                                                    {projectStats.totalSubMainPipes} เส้น
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>ยาวรวม:</span>
                                                <span className="font-bold text-purple-400">
                                                    {formatDistance(
                                                        projectStats.totalSubMainPipeLength
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>เฉลี่ย:</span>
                                                <span>
                                                    {projectStats.totalSubMainPipes > 0
                                                        ? formatDistance(
                                                              projectStats.totalSubMainPipeLength /
                                                                  projectStats.totalSubMainPipes
                                                          )
                                                        : '0 ม.'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-gray-800 p-4">
                                        <h4 className="mb-3 text-lg font-semibold text-green-400">
                                            🟢 ท่อย่อย
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>จำนวน:</span>
                                                <span className="font-bold">
                                                    {projectStats.totalBranchPipes} เส้น
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>ยาวรวม:</span>
                                                <span className="font-bold text-green-400">
                                                    {formatDistance(
                                                        projectStats.totalBranchPipeLength
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>เฉลี่ย:</span>
                                                <span>
                                                    {projectStats.totalBranchPipes > 0
                                                        ? formatDistance(
                                                              projectStats.totalBranchPipeLength /
                                                                  projectStats.totalBranchPipes
                                                          )
                                                        : '0 ม.'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* สรุปรวมท่อทั้งหมด */}
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h4 className="mb-4 text-xl font-semibold text-yellow-400">
                                        📊 สรุประบบท่อทั้งหมด
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-lg">
                                                <span>ความยาวท่อรวมทั้งหมด:</span>
                                                <span className="font-bold text-yellow-400">
                                                    {formatDistance(projectStats.totalPipeLength)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>จำนวนท่อรวมทั้งหมด:</span>
                                                <span className="font-bold">
                                                    {projectStats.totalPipeSections} ท่อน
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>• ท่อเมน:</span>
                                                <span>
                                                    {formatDistance(
                                                        projectStats.totalMainPipeLength
                                                    )}{' '}
                                                    (
                                                    {(
                                                        (projectStats.totalMainPipeLength /
                                                            projectStats.totalPipeLength) *
                                                        100
                                                    ).toFixed(1)}
                                                    %)
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>• ท่อเมนรอง:</span>
                                                <span>
                                                    {formatDistance(
                                                        projectStats.totalSubMainPipeLength
                                                    )}{' '}
                                                    (
                                                    {(
                                                        (projectStats.totalSubMainPipeLength /
                                                            projectStats.totalPipeLength) *
                                                        100
                                                    ).toFixed(1)}
                                                    %)
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>• ท่อย่อย:</span>
                                                <span>
                                                    {formatDistance(
                                                        projectStats.totalBranchPipeLength
                                                    )}{' '}
                                                    (
                                                    {(
                                                        (projectStats.totalBranchPipeLength /
                                                            projectStats.totalPipeLength) *
                                                        100
                                                    ).toFixed(1)}
                                                    %)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Detailed Tab - รายงานละเอียด */}
                        {activeTab === 'detailed' && (
                            <div className="space-y-6">
                                <h3 className="text-2xl font-semibold text-purple-400">
                                    📋 รายงานสมบูรณ์แบบ
                                </h3>

                                {/* ส่วนหัวรายงาน */}
                                <div className="rounded-lg border border-purple-500/30 bg-gray-800 p-6">
                                    <h4 className="mb-4 text-center text-xl font-semibold">
                                        🌱 รายงานการออกแบบระบบน้ำสวนผลไม้
                                    </h4>
                                    <div className="space-y-1 text-center text-sm text-gray-300">
                                        <div>
                                            โครงการ: <strong>{projectStats.projectName}</strong>
                                        </div>
                                        <div>
                                            วันที่สร้าง:{' '}
                                            {new Date(projectData.createdAt).toLocaleDateString(
                                                'th-TH'
                                            )}
                                        </div>
                                        <div>
                                            รายงาน ณ วันที่:{' '}
                                            {new Date().toLocaleDateString('th-TH')}
                                        </div>
                                    </div>
                                </div>

                                {/* 1. สรุปการปลูก */}
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h4 className="mb-4 text-lg font-bold text-green-400">
                                        1️⃣ สรุปการปลูก
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div>
                                                • พื้นที่รวม:{' '}
                                                <strong>
                                                    {formatArea(projectStats.totalArea)}
                                                </strong>
                                            </div>
                                            <div>
                                                • จำนวนโซน:{' '}
                                                <strong>{projectStats.numberOfZones} โซน</strong>
                                            </div>
                                            <div>
                                                • ต้นไม้ทั้งหมด:{' '}
                                                <strong className="text-green-400">
                                                    {projectStats.actualTotalPlants.toLocaleString()}{' '}
                                                    ต้น
                                                </strong>
                                            </div>
                                        </div>
                                        <div>
                                            <div>
                                                • น้ำต่อครั้งรวม:{' '}
                                                <strong className="text-blue-400">
                                                    {formatWaterVolume(
                                                        projectStats.actualTotalWaterPerSession
                                                    )}
                                                </strong>
                                            </div>
                                            <div>
                                                • ความหนาแน่นเฉลี่ย:{' '}
                                                <strong>
                                                    {(
                                                        projectStats.actualTotalPlants /
                                                        projectStats.totalArea
                                                    ).toFixed(3)}{' '}
                                                    ต้น/ตร.ม.
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. รายละเอียดแต่ละโซน */}
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h4 className="mb-4 text-lg font-bold text-green-400">
                                        2️⃣ รายละเอียดแต่ละโซน
                                    </h4>
                                    <div className="space-y-4">
                                        {projectStats.zoneStats.map((zone, index) => (
                                            <div
                                                key={zone.zoneId}
                                                className="rounded bg-gray-700 p-4"
                                            >
                                                <h5 className="mb-2 font-semibold text-yellow-400">
                                                    โซน {index + 1}: {zone.zoneName}
                                                </h5>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <div>
                                                            • พืช: <strong>{zone.plantType}</strong>
                                                        </div>
                                                        <div>
                                                            • ระยะห่าง:{' '}
                                                            <strong>
                                                                {zone.plantSpacing} ×{' '}
                                                                {zone.rowSpacing} ม.
                                                            </strong>
                                                        </div>
                                                        <div>
                                                            • จำนวนต้นไม้:{' '}
                                                            <strong className="text-green-400">
                                                                {zone.actualPlantCount.toLocaleString()}{' '}
                                                                ต้น
                                                            </strong>
                                                        </div>
                                                        <div>
                                                            • น้ำต่อครั้ง:{' '}
                                                            <strong className="text-blue-400">
                                                                {formatWaterVolume(
                                                                    zone.actualTotalWaterPerSession
                                                                )}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div>
                                                            • ท่อย่อยยาวที่สุด:{' '}
                                                            <strong className="text-yellow-400">
                                                                {formatDistance(
                                                                    zone.longestBranchPipe
                                                                )}
                                                            </strong>
                                                        </div>
                                                        <div>
                                                            • ท่อย่อยยาวรวม:{' '}
                                                            <strong className="text-green-400">
                                                                {formatDistance(
                                                                    zone.totalBranchPipeLength
                                                                )}
                                                            </strong>
                                                        </div>
                                                        <div>
                                                            • ท่อเมนรองยาวที่สุด:{' '}
                                                            <strong className="text-yellow-400">
                                                                {formatDistance(
                                                                    zone.longestSubMainPipe
                                                                )}
                                                            </strong>
                                                        </div>
                                                        <div>
                                                            • ท่อเมนรองยาวรวม:{' '}
                                                            <strong className="text-purple-400">
                                                                {formatDistance(
                                                                    zone.totalSubMainPipeLength
                                                                )}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. ระบบท่อเมน */}
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h4 className="mb-4 text-lg font-bold text-blue-400">
                                        3️⃣ ระบบท่อเมนจากปั๊มน้ำ
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            • จำนวนท่อเมน:{' '}
                                            <strong>
                                                {projectStats.mainPipeStats.totalMainPipes} เส้น
                                            </strong>
                                        </div>
                                        <div>
                                            • ท่อเมนยาวรวม:{' '}
                                            <strong className="text-blue-400">
                                                {formatDistance(
                                                    projectStats.mainPipeStats.totalMainPipeLength
                                                )}
                                            </strong>
                                        </div>
                                        <div>
                                            • ท่อเมนยาวที่สุด:{' '}
                                            <strong className="text-yellow-400">
                                                {formatDistance(
                                                    projectStats.mainPipeStats.longestMainPipe
                                                )}
                                            </strong>
                                        </div>
                                        <div>
                                            • ปลายทางไกลสุด:{' '}
                                            <strong className="text-red-400">
                                                {
                                                    projectStats.mainPipeStats.farthestDestination
                                                        .zoneName
                                                }{' '}
                                                (
                                                {formatDistance(
                                                    projectStats.mainPipeStats.farthestDestination
                                                        .distance
                                                )}
                                                )
                                            </strong>
                                        </div>
                                        <div>
                                            • ปลายทางใกล้สุด:{' '}
                                            <strong className="text-green-400">
                                                {
                                                    projectStats.mainPipeStats.closestDestination
                                                        .zoneName
                                                }{' '}
                                                (
                                                {formatDistance(
                                                    projectStats.mainPipeStats.closestDestination
                                                        .distance
                                                )}
                                                )
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. สรุประบบท่อ */}
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h4 className="mb-4 text-lg font-bold text-purple-400">
                                        4️⃣ สรุประบบท่อทั้งหมด
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div>
                                                • ท่อเมน:{' '}
                                                <strong>
                                                    {projectStats.totalMainPipes} เส้น (
                                                    {formatDistance(
                                                        projectStats.totalMainPipeLength
                                                    )}
                                                    )
                                                </strong>
                                            </div>
                                            <div>
                                                • ท่อเมนรอง:{' '}
                                                <strong>
                                                    {projectStats.totalSubMainPipes} เส้น (
                                                    {formatDistance(
                                                        projectStats.totalSubMainPipeLength
                                                    )}
                                                    )
                                                </strong>
                                            </div>
                                            <div>
                                                • ท่อย่อย:{' '}
                                                <strong>
                                                    {projectStats.totalBranchPipes} เส้น (
                                                    {formatDistance(
                                                        projectStats.totalBranchPipeLength
                                                    )}
                                                    )
                                                </strong>
                                            </div>
                                        </div>
                                        <div>
                                            <div>
                                                • ความยาวรวมทั้งหมด:{' '}
                                                <strong className="text-yellow-400">
                                                    {formatDistance(projectStats.totalPipeLength)}
                                                </strong>
                                            </div>
                                            <div>
                                                • จำนวนท่อรวม:{' '}
                                                <strong>
                                                    {projectStats.totalPipeSections} ท่อน
                                                </strong>
                                            </div>
                                            <div>
                                                • การกระจายท่อ:{' '}
                                                <strong>
                                                    {(
                                                        projectStats.totalPipeLength /
                                                        projectStats.totalArea
                                                    ).toFixed(2)}{' '}
                                                    ม./ตร.ม.
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 5. การวิเคราะห์ประสิทธิภาพ */}
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h4 className="mb-4 text-lg font-bold text-yellow-400">
                                        5️⃣ การวิเคราะห์ประสิทธิภาพ
                                    </h4>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div className="text-center">
                                            <div>ประสิทธิภาพระบบ</div>
                                            <div className="text-2xl font-bold text-green-400">
                                                {projectStats.systemEfficiency.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div>ความสมดุลการกระจายน้ำ</div>
                                            <div className="text-2xl font-bold text-blue-400">
                                                {projectStats.waterDistributionBalance.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div>การเพิ่มประสิทธิภาพท่อ</div>
                                            <div className="text-2xl font-bold text-purple-400">
                                                {projectStats.pipeOptimization.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 6. สรุปพันธุ์พืช */}
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h4 className="mb-4 text-lg font-bold text-green-400">
                                        6️⃣ สรุปพันธุ์พืชที่ปลูก
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        {Object.entries(projectStats.plantVarieties).map(
                                            ([plantName, data]) => (
                                                <div
                                                    key={plantName}
                                                    className="flex justify-between"
                                                >
                                                    <span>• {plantName}:</span>
                                                    <span>
                                                        <strong className="text-green-400">
                                                            {data.totalCount.toLocaleString()} ต้น
                                                        </strong>{' '}
                                                        (กระจายใน:{' '}
                                                        {data.zones
                                                            .map((z) => z.zoneName)
                                                            .join(', ')}
                                                        )
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* 7. ข้อมูลอุปกรณ์ */}
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h4 className="mb-4 text-lg font-bold text-blue-400">
                                        7️⃣ ข้อมูลอุปกรณ์
                                    </h4>
                                    <div className="text-sm">
                                        <div>
                                            • ปั๊มน้ำ:{' '}
                                            <strong>
                                                {projectData.pump ? '1 เครื่อง' : 'ไม่มี'}
                                            </strong>
                                        </div>
                                        {projectData.pump && (
                                            <>
                                                <div className="ml-4">
                                                    - ประเภท:{' '}
                                                    {projectData.pump.type === 'centrifugal'
                                                        ? 'เซนตริฟิวกัล'
                                                        : projectData.pump.type === 'submersible'
                                                          ? 'จมน้ำ'
                                                          : 'เจ็ท'}
                                                </div>
                                                <div className="ml-4">
                                                    - กำลังส่ง: {projectData.pump.capacity} ล./นาที
                                                </div>
                                                <div className="ml-4">
                                                    - ความสูงยก: {projectData.pump.head} ม.
                                                </div>
                                            </>
                                        )}
                                        <div>
                                            • พื้นที่หลีกเลี่ยง:{' '}
                                            <strong>
                                                {projectData.exclusionAreas?.length || 0} พื้นที่
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Success/Error Messages */}
                {saveSuccess && (
                    <div className="mt-6 rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-green-400 flex items-center gap-2">
                        <span className="text-lg">✅</span>
                        <span>โครงการบันทึกสำเร็จ! กำลังกลับไปหน้าหลัก</span>
                    </div>
                )}

                {saveError && (
                    <div className="mt-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-400 flex items-center gap-2">
                        <span className="text-lg">❌</span>
                        <span>เกิดข้อผิดพลาด: {saveError}</span>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-12 flex justify-center gap-4">
                    <button
                        onClick={handleNewProject}
                        className="rounded-lg bg-green-600 px-6 py-3 font-semibold transition-colors hover:bg-green-700"
                    >
                        ➕ โครงการใหม่
                    </button>
                    <button
                        onClick={handleEditProject}
                        className="rounded-lg bg-blue-600 px-6 py-3 font-semibold transition-colors hover:bg-blue-700"
                    >
                        ✏️ แก้ไขโครงการ
                    </button>
                    <button
                        onClick={handleSaveToDatabase}
                        disabled={savingToDatabase || saveSuccess}
                        className="rounded-lg bg-yellow-600 px-6 py-3 font-semibold transition-colors hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {savingToDatabase ? (
                            <>
                                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                                กำลังบันทึก...
                            </>
                        ) : (
                            '💾 บันทึกลงฐานข้อมูล'
                        )}
                    </button>
                    <button
                        onClick={handleDownloadStats}
                        className="rounded-lg bg-purple-600 px-6 py-3 font-semibold transition-colors hover:bg-purple-700"
                    >
                        📊 ดาวน์โหลดรายงาน
                    </button>
                    {mapImageUrl && (
                        <button
                            onClick={handleDownloadImage}
                            className="rounded-lg bg-orange-600 px-6 py-3 font-semibold transition-colors hover:bg-orange-700"
                        >
                            🖼️ ดาวน์โหลดแผนที่
                        </button>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-gray-400">
                    <p>
                        ระบบออกแบบการวางระบบน้ำสวนผลไม้ - รายงานสมบูรณ์ | สร้างเมื่อ{' '}
                        {new Date().toLocaleDateString('th-TH')}
                    </p>
                    <p className="mt-2 text-sm">
                        🌱 <strong>คุณสมบัติใหม่:</strong> รายงานครบถ้วนทุกรายละเอียด,
                        แผนที่ความละเอียดสูง, สถิติลึกระดับโซน
                    </p>
                    <p className="mt-1 text-sm text-green-300">
                        📊 ข้อมูลที่แสดงเป็นจำนวนจริงที่นับจากจุดต้นไม้บนแผนที่
                        พร้อมการวิเคราะห์ครบถ้วนทุกระบบ
                    </p>
                </div>
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
}
