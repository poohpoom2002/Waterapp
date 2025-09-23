// irrigationZoneUtils.ts

export interface Coordinate {
    lat: number;
    lng: number;
}

export interface PlantLocation {
    id: string;
    position: Coordinate;
    plantData: {
        id: number;
        name: string;
        plantSpacing: number;
        rowSpacing: number;
        waterNeed: number;
    };
    zoneId?: string;
    plantAreaId?: string;
    plantAreaColor?: string;
}

export interface IrrigationZone {
    id: string;
    name: string;
    coordinates: Coordinate[];
    plants: PlantLocation[];
    totalWaterNeed: number;
    color: string;
    layoutIndex: number;
}

export interface ExclusionArea {
    id: string;
    type: 'building' | 'powerplant' | 'river' | 'road' | 'other';
    coordinates: Coordinate[];
    name: string;
    color: string;
}

export const calculateZoneStats = (zones: IrrigationZone[]) => {
    if (zones.length === 0) return null;

    const waterNeeds = zones.map((zone) => zone.totalWaterNeed);
    const plantCounts = zones.map((zone) => zone.plants.length);

    const avgWaterNeed = waterNeeds.reduce((sum, need) => sum + need, 0) / zones.length;
    const avgPlantCount = plantCounts.reduce((sum, count) => sum + count, 0) / zones.length;

    const waterVariance =
        waterNeeds.reduce((sum, need) => sum + Math.pow(need - avgWaterNeed, 2), 0) / zones.length;
    const waterStdDev = Math.sqrt(waterVariance);

    return {
        totalZones: zones.length,
        averageWaterNeed: avgWaterNeed,
        averagePlantCount: avgPlantCount,
        waterNeedVariance: waterVariance,
        waterNeedStdDev: waterStdDev,
        waterNeedBalance: 1 - waterStdDev / avgWaterNeed,
        totalPlants: plantCounts.reduce((sum, count) => sum + count, 0),
        totalWaterNeed: waterNeeds.reduce((sum, need) => sum + need, 0),
    };
};
