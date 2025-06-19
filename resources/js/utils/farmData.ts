// resources/js/utils/farmData.ts
import { router } from '@inertiajs/react';

export interface FarmData {
    total: {
        area: number;
        plants: number;
        waterNeed: number;
    };
    zones: Array<{
        id: number;
        name: string;
        area: number;
        plants: number;
        waterNeed: number;
    }>;
}

export const getFarmData = (): FarmData | null => {
    // Try to get from localStorage first
    const storedData = localStorage.getItem('farmData');
    if (storedData) {
        return JSON.parse(storedData);
    }
    return null;
};

export const useFarmData = () => {
    const data = getFarmData();

    // If no data is found, you might want to redirect to the generate-tree page
    if (!data) {
        console.warn('No farm data found. Redirecting to generate-tree page...');
        router.visit('/generate-tree');
        return null;
    }

    return data;
};

// Helper functions to get specific data
export const getTotalFarmData = () => {
    const data = getFarmData();
    return data?.total;
};

export const getZoneFarmData = (zoneId?: number) => {
    const data = getFarmData();
    if (!data) return null;

    if (zoneId) {
        return data.zones.find((zone) => zone.id === zoneId);
    }
    return data.zones;
};

// Formatting helpers
export const formatArea = (area: number) => `${area.toFixed(2)} rai`;
export const formatWaterNeed = (waterNeed: number) => `${waterNeed.toFixed(2)} L/day`;
export const formatPlantCount = (count: number) => count.toString();
