import { router } from '@inertiajs/react';

export interface SprinklerPosition {
    lat: number;
    lng: number;
    id: string;
}

export interface WaterSource {
    lat: number;
    lng: number;
    type: 'tap' | 'pump';
    id?: string;
}

export interface SprinklerInfo {
    id: number;
    name: string;
    radius: number;
    water_flow: number;
}

export interface PipeConnection {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
    length: number;
    from_type: 'source' | 'sprinkler';
    to_type: 'sprinkler';
    id: string;
}

export interface HomeGardenData {
    area: {
        size: number; // in square meters
        coordinates: Array<{ lat: number; lng: number }>;
    };
    sprinklers: {
        info: SprinklerInfo;
        positions: SprinklerPosition[];
        totalCount: number;
        coverage: number; // percentage
    };
    waterSource: WaterSource;
    pipes: {
        totalLength: number;
        longestPipe: number;
        connections: number;
    };
    summary: {
        totalWaterFlow: number; // L/min
        estimatedCost: number;
        installationTime: number; // hours
    };
}

export interface SprinklerLayoutData {
    sprinklerPositions: SprinklerPosition[];
    pipeConnections: PipeConnection[];
    waterSource: WaterSource | null;
    sprinklerInfo: SprinklerInfo;
    area: Array<{ lat: number; lng: number }>;
    statistics: {
        totalSprinklers: number;
        totalPipeLength: number;
        longestPipe: number;
        coverage: number;
        estimatedCost: number;
        installationTime: number;
    };
}

/**
 * Local storage handlers
 */
export const getHomeGardenData = (): HomeGardenData | null => {
    const storedData = localStorage.getItem('homeGardenData');
    if (storedData) {
        try {
            return JSON.parse(storedData);
        } catch (e) {
            console.error('Error parsing home garden data:', e);
            return null;
        }
    }
    return null;
};

export const saveHomeGardenData = (data: HomeGardenData): void => {
    try {
        localStorage.setItem('homeGardenData', JSON.stringify(data));
        console.log('Home garden data saved successfully');
    } catch (e) {
        console.error('Error saving home garden data:', e);
    }
};

export const useHomeGardenData = () => {
    const data = getHomeGardenData();

    if (!data) {
        console.warn('No home garden data found. Redirecting to home garden planner...');
        router.visit('/home-garden/planner');
        return null;
    }

    return data;
};

// Helper getters
export const getSprinklerData = () => getHomeGardenData()?.sprinklers;
export const getWaterSourceData = () => getHomeGardenData()?.waterSource;
export const getPipeData = () => getHomeGardenData()?.pipes;
export const getAreaData = () => getHomeGardenData()?.area;
export const getSummaryData = () => getHomeGardenData()?.summary;

// Formatting helpers
export const formatArea = (area: number): string => {
    if (area >= 10000) {
        return `${(area / 10000).toFixed(2)} hectares`;
    }
    return `${area.toFixed(2)} m²`;
};

export const formatWaterFlow = (flow: number): string => `${flow.toFixed(2)} L/min`;

export const formatDistance = (distance: number): string => {
    if (distance >= 1000) {
        return `${(distance / 1000).toFixed(2)} km`;
    }
    return `${distance.toFixed(2)} m`;
};

export const formatCurrency = (amount: number): string => `฿${amount.toLocaleString()}`;

export const formatTime = (hours: number): string => {
    if (hours >= 8) {
        const days = Math.floor(hours / 8);
        const remainingHours = hours % 8;
        return `${days} day${days > 1 ? 's' : ''}${remainingHours > 0 ? ` ${remainingHours.toFixed(1)} hours` : ''}`.trim();
    }
    return `${hours.toFixed(1)} hours`;
};

// Calculation helpers
export const calculateAreaFromCoordinates = (
    coordinates: Array<{ lat: number; lng: number }>
): number => {
    if (coordinates.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < coordinates.length; i++) {
        const j = (i + 1) % coordinates.length;
        area += coordinates[i].lat * coordinates[j].lng;
        area -= coordinates[j].lat * coordinates[i].lng;
    }
    area = Math.abs(area) / 2;

    // Convert to square meters (approximate)
    const areaInSquareMeters =
        area * 111000 * 111000 * Math.cos((coordinates[0].lat * Math.PI) / 180);
    return areaInSquareMeters;
};

export const calculateSprinklerCoverage = (
    sprinklers: SprinklerPosition[],
    radius: number,
    totalArea: number
): number => {
    const totalCoverageArea = sprinklers.length * Math.PI * Math.pow(radius, 2);
    return Math.min((totalCoverageArea / totalArea) * 100, 100);
};

export const estimateInstallationCost = (
    sprinklerCount: number,
    pipeLength: number,
    sprinklerInfo: SprinklerInfo
): number => {
    const sprinklerCost = sprinklerCount * 500; // 500 baht per sprinkler
    const pipeCost = pipeLength * 50; // 50 baht per meter
    const laborCost = sprinklerCount * 200 + pipeLength * 30;
    const miscCost = 1000;

    return sprinklerCost + pipeCost + laborCost + miscCost;
};

export const estimateInstallationTime = (sprinklerCount: number, pipeLength: number): number => {
    const sprinklerTime = sprinklerCount * 0.5; // 30 minutes per sprinkler
    const pipeTime = pipeLength * 0.1; // 6 minutes per meter
    const setupTime = 2;

    return sprinklerTime + pipeTime + setupTime;
};

// Clear data function
export const clearHomeGardenData = (): void => {
    localStorage.removeItem('homeGardenData');
    console.log('Home garden data cleared');
};
