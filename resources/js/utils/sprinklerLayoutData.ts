export interface SprinklerLayoutData {
    area: Array<{ lat: number; lng: number }>;
    sprinklerPositions: Array<{ id: string; lat: number; lng: number }>;
    pipeConnections: Array<{
        id: string;
        start: { lat: number; lng: number };
        end: { lat: number; lng: number };
        length: number;
    }>;
    waterSource: { lat: number; lng: number; type: 'tap' | 'pump' } | null;
    sprinklerInfo: {
        radius: number;
        type: string;
    };
    statistics: {
        totalSprinklers: number;
        totalPipeLength: number;
        longestPipe: number;
    };
}

export const getSprinklerLayoutData = (): SprinklerLayoutData | null => {
    try {
        const data = localStorage.getItem('sprinklerLayoutData');
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error loading sprinkler layout data:', error);
        return null;
    }
};

export const saveSprinklerLayoutData = (data: SprinklerLayoutData): void => {
    try {
        localStorage.setItem('sprinklerLayoutData', JSON.stringify(data));
        console.log('Sprinkler layout data saved successfully');
    } catch (e) {
        console.error('Error saving sprinkler layout data:', e);
    }
};

// Type definitions for helper functions
export type SprinklerPosition = { id: string; lat: number; lng: number };
export type PipeConnection = {
    id: string;
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
    length: number;
};
export type WaterSource = { lat: number; lng: number; type: 'tap' | 'pump' } | null;

// Import router if using Inertia.js
import { router } from '@inertiajs/react';

export const useSprinklerLayoutData = () => {
    const data = getSprinklerLayoutData();

    if (!data) {
        console.warn('No sprinkler layout data found. Redirecting to home garden planner...');
        if (typeof router !== 'undefined' && router.visit) {
            router.visit('/home-garden/planner');
        }
        return null;
    }

    return data;
};

// Helper functions to get specific data
export const getSprinklerPositions = (): SprinklerPosition[] => {
    const data = getSprinklerLayoutData();
    return data?.sprinklerPositions || [];
};

export const getPipeConnections = (): PipeConnection[] => {
    const data = getSprinklerLayoutData();
    return data?.pipeConnections || [];
};

export const getWaterSourceLocation = (): WaterSource | null => {
    const data = getSprinklerLayoutData();
    return data?.waterSource || null;
};

export const getSprinklerInfo = () => {
    const data = getSprinklerLayoutData();
    return data?.sprinklerInfo;
};

export const getStatistics = () => {
    const data = getSprinklerLayoutData();
    return data?.statistics;
};

// Calculation functions
export const calculateTotalPipeLength = (connections: PipeConnection[]): number => {
    return connections.reduce((total, pipe) => total + pipe.length, 0);
};

export const findLongestPipe = (connections: PipeConnection[]): number => {
    if (connections.length === 0) return 0;
    return Math.max(...connections.map((pipe) => pipe.length));
};

export const calculateCoverage = (
    sprinklers: SprinklerPosition[],
    radius: number,
    areaCoords: Array<{ lat: number; lng: number }>
): number => {
    if (sprinklers.length === 0 || areaCoords.length === 0) return 0;

    const totalAreaSize = calculateAreaFromCoordinates(areaCoords);
    const totalCoverageArea = sprinklers.length * Math.PI * Math.pow(radius, 2);

    return Math.min((totalCoverageArea / totalAreaSize) * 100, 100);
};

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

export const estimateInstallationCost = (
    sprinklerCount: number,
    pipeLength: number,
    sprinklerPrice: number = 500
): number => {
    const sprinklerCost = sprinklerCount * sprinklerPrice;
    const pipeCost = pipeLength * 50; // 50 baht per meter
    const fittingsCost = sprinklerCount * 100; // 100 baht per connection
    const laborCost = sprinklerCount * 200 + pipeLength * 30;
    const miscCost = 1000;

    return sprinklerCost + pipeCost + fittingsCost + laborCost + miscCost;
};

export const estimateInstallationTime = (sprinklerCount: number, pipeLength: number): number => {
    const planningTime = 1; // 1 hour for planning
    const excavationTime = pipeLength * 0.05; // 3 minutes per meter
    const pipeInstallationTime = pipeLength * 0.08; // 5 minutes per meter
    const sprinklerInstallationTime = sprinklerCount * 0.5; // 30 minutes per sprinkler
    const testingTime = 1; // 1 hour for testing

    return (
        planningTime +
        excavationTime +
        pipeInstallationTime +
        sprinklerInstallationTime +
        testingTime
    );
};

// Distance calculation using Haversine formula
export const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number => {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Formatting functions
export const formatDistance = (distance: number): string => {
    if (distance >= 1000) {
        return `${(distance / 1000).toFixed(2)} km`;
    }
    return `${distance.toFixed(2)} m`;
};

export const formatArea = (area: number): string => {
    if (area >= 10000) {
        return `${(area / 10000).toFixed(2)} hectares`;
    }
    return `${area.toFixed(2)} m²`;
};

export const formatCurrency = (amount: number): string => `฿${amount.toLocaleString()}`;

export const formatTime = (hours: number): string => {
    if (hours >= 8) {
        const days = Math.floor(hours / 8);
        const remainingHours = hours % 8;
        return `${days} day${days > 1 ? 's' : ''} ${remainingHours > 0 ? `${remainingHours.toFixed(1)} hours` : ''}`.trim();
    }
    return `${hours.toFixed(1)} hours`;
};

export const formatPercentage = (percentage: number): string => `${percentage.toFixed(1)}%`;

// Clear data function
export const clearSprinklerLayoutData = (): void => {
    localStorage.removeItem('sprinklerLayoutData');
    console.log('Sprinkler layout data cleared');
};
