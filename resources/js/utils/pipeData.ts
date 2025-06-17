import { router } from '@inertiajs/react';

export interface PipeLengthData {
    mainPipes: {
        longest: number;
        total: number;
    };
    submainPipes: {
        longest: number;
        total: number;
    };
    zones: Array<{
        id: number;
        name: string;
        longestBranch: number;
        totalBranchLength: number;
    }>;
}

export const getPipeLengthData = (): PipeLengthData | null => {
    // Try to get from localStorage first
    const storedData = localStorage.getItem('pipeLengthData');
    if (storedData) {
        return JSON.parse(storedData);
    }
    return null;
};

export const usePipeLengthData = () => {
    const data = getPipeLengthData();
    
    // If no data is found, you might want to redirect to the generate-tree page
    if (!data) {
        console.warn('No pipe length data found. Redirecting to generate-tree page...');
        router.visit('/generate-tree');
        return null;
    }
    
    return data;
};

// Helper functions to get specific data
export const getMainPipeData = () => {
    const data = getPipeLengthData();
    return data?.mainPipes;
};

export const getSubmainPipeData = () => {
    const data = getPipeLengthData();
    return data?.submainPipes;
};

export const getZoneData = (zoneId?: number) => {
    const data = getPipeLengthData();
    if (!data) return null;
    
    if (zoneId) {
        return data.zones.find(zone => zone.id === zoneId);
    }
    return data.zones;
}; 