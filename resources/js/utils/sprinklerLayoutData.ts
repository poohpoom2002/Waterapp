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
    } catch (error) {
        console.error('Error saving sprinkler layout data:', error);
    }
};
