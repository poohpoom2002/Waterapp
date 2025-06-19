import { router } from '@inertiajs/react';

export interface PipeLengthData {
    mainPipes: {
        longest: number;
        total: number;
        longestPipe: {
            length: number;
            connectedSubmains: number;
            coordinates: [number, number][];
        };
    };
    submainPipes: {
        longest: number;
        total: number;
        longestPipe: {
            length: number;
            connectedBranches: number;
            coordinates: [number, number][];
        };
    };
    zones: Array<{
        id: number;
        name: string;
        longestBranch: number;
        totalBranchLength: number;
        longestBranchPipe: {
            length: number;
            plantCount: number;
            coordinates: [number, number][];
        };
    }>;
    analytics: {
        longestMainPipe: {
            length: number;
            connectedSubmains: number;
            totalPlantsServed: number;
        };
        longestSubmainPipe: {
            length: number;
            connectedBranches: number;
            totalPlantsServed: number;
        };
        longestBranchPipe: {
            length: number;
            plantCount: number;
            zoneName: string;
        };
    };
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

// New analytics functions
export const getLongestMainPipeAnalytics = () => {
    const data = getPipeLengthData();
    return data?.analytics.longestMainPipe;
};

export const getLongestSubmainPipeAnalytics = () => {
    const data = getPipeLengthData();
    return data?.analytics.longestSubmainPipe;
};

export const getLongestBranchPipeAnalytics = () => {
    const data = getPipeLengthData();
    return data?.analytics.longestBranchPipe;
};

// Helper function to check if two line segments intersect
function doLineSegmentsIntersect(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
): boolean {
    // Calculate the orientation of three points
    const orientation = (px: number, py: number, qx: number, qy: number, rx: number, ry: number): number => {
        return (qy - py) * (rx - qx) - (qx - px) * (ry - qy);
    };

    // Check if point q lies on segment pr
    const onSegment = (px: number, py: number, qx: number, qy: number, rx: number, ry: number): boolean => {
        return qx <= Math.max(px, rx) && qx >= Math.min(px, rx) &&
               qy <= Math.max(py, ry) && qy >= Math.min(py, ry);
    };

    // Find the four orientations needed for general and special cases
    const o1 = orientation(x1, y1, x2, y2, x3, y3);
    const o2 = orientation(x1, y1, x2, y2, x4, y4);
    const o3 = orientation(x3, y3, x4, y4, x1, y1);
    const o4 = orientation(x3, y3, x4, y4, x2, y2);

    // General case
    if (o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0) {
        return (o1 * o2 < 0) && (o3 * o4 < 0);
    }

    // Special cases
    // p1, q1 and p2 are collinear and p2 lies on segment p1q1
    if (o1 === 0 && onSegment(x1, y1, x3, y3, x2, y2)) return true;

    // p1, q1 and q2 are collinear and q2 lies on segment p1q1
    if (o2 === 0 && onSegment(x1, y1, x4, y4, x2, y2)) return true;

    // p2, q2 and p1 are collinear and p1 lies on segment p2q2
    if (o3 === 0 && onSegment(x3, y3, x1, y1, x4, y4)) return true;

    // p2, q2 and q1 are collinear and q1 lies on segment p2q2
    if (o4 === 0 && onSegment(x3, y3, x2, y2, x4, y4)) return true;

    return false; // Doesn't fall in any of the above cases
}

// Helper function to calculate pipe intersections
export const calculatePipeIntersections = (pipe1: [number, number][], pipe2: [number, number][]): boolean => {
    // Check if any segment of pipe1 intersects with any segment of pipe2
    for (let i = 0; i < pipe1.length - 1; i++) {
        const p1Start = pipe1[i];
        const p1End = pipe1[i + 1];
        
        for (let j = 0; j < pipe2.length - 1; j++) {
            const p2Start = pipe2[j];
            const p2End = pipe2[j + 1];
            
            if (doLineSegmentsIntersect(
                p1Start[0], p1Start[1], p1End[0], p1End[1],
                p2Start[0], p2Start[1], p2End[0], p2End[1]
            )) {
                return true;
            }
        }
    }
    return false;
};

// Helper function to calculate plants served by a pipe
export const calculatePlantsServedByPipe = (pipeCoords: [number, number][], plantLocations: any[]): number => {
    let plantCount = 0;
    const tolerance = 0.0001; // About 10 meters
    
    for (const plant of plantLocations) {
        // Check if plant is along any segment of the pipe
        for (let i = 0; i < pipeCoords.length - 1; i++) {
            const startLat = pipeCoords[i][0];
            const startLng = pipeCoords[i][1];
            const endLat = pipeCoords[i + 1][0];
            const endLng = pipeCoords[i + 1][1];
            
            // Calculate distance from plant to the pipe line segment
            const A = plant.lat - startLat;
            const B = plant.lng - startLng;
            const C = endLat - startLat;
            const D = endLng - startLng;
            
            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            
            if (lenSq === 0) {
                // Start and end are the same point
                const distance = Math.sqrt(
                    Math.pow(plant.lat - startLat, 2) + 
                    Math.pow(plant.lng - startLng, 2)
                );
                if (distance < tolerance) {
                    plantCount++;
                    break; // Count each plant only once
                }
                continue;
            }
            
            const param = dot / lenSq;
            
            let closestLat, closestLng;
            if (param < 0) {
                // Closest point is the start
                closestLat = startLat;
                closestLng = startLng;
            } else if (param > 1) {
                // Closest point is the end
                closestLat = endLat;
                closestLng = endLng;
            } else {
                // Closest point is along the line segment
                closestLat = startLat + param * C;
                closestLng = startLng + param * D;
            }
            
            // Calculate distance from plant to closest point on pipe
            const distance = Math.sqrt(
                Math.pow(plant.lat - closestLat, 2) + 
                Math.pow(plant.lng - closestLng, 2)
            );
            
            if (distance < tolerance) {
                plantCount++;
                break; // Count each plant only once
            }
        }
    }
    
    return plantCount;
};

// Helper function to calculate main pipe intersections with sub-main pipes
export const calculateMainPipeIntersections = (mainPipe: [number, number][], submainPipes: Array<{coordinates: [number, number][]}>): number => {
    let intersectionCount = 0;
    
    for (const submainPipe of submainPipes) {
        // Check if any segment of main pipe intersects with any segment of submain pipe
        for (let i = 0; i < mainPipe.length - 1; i++) {
            const mainStart = mainPipe[i];
            const mainEnd = mainPipe[i + 1];
            
            for (let j = 0; j < submainPipe.coordinates.length - 1; j++) {
                const submainStart = submainPipe.coordinates[j];
                const submainEnd = submainPipe.coordinates[j + 1];
                
                if (doLineSegmentsIntersect(
                    mainStart[0], mainStart[1], mainEnd[0], mainEnd[1],
                    submainStart[0], submainStart[1], submainEnd[0], submainEnd[1]
                )) {
                    intersectionCount++;
                    break; // Count each submain pipe only once
                }
            }
            if (intersectionCount > 0) break; // Already found intersection with this submain pipe
        }
    }
    
    return intersectionCount;
};

// Helper function to calculate submain pipe intersections with branch pipes
export const calculateSubmainPipeIntersections = (submainPipe: [number, number][], branchPipes: Array<{start: {lat: number, lng: number}, end: {lat: number, lng: number}}>): number => {
    let intersectionCount = 0;
    
    for (const branchPipe of branchPipes) {
        const branchCoords: [number, number][] = [
            [branchPipe.start.lat, branchPipe.start.lng],
            [branchPipe.end.lat, branchPipe.end.lng]
        ];
        
        // Check if any segment of submain pipe intersects with the branch pipe
        for (let i = 0; i < submainPipe.length - 1; i++) {
            const submainStart = submainPipe[i];
            const submainEnd = submainPipe[i + 1];
            
            if (doLineSegmentsIntersect(
                submainStart[0], submainStart[1], submainEnd[0], submainEnd[1],
                branchCoords[0][0], branchCoords[0][1], branchCoords[1][0], branchCoords[1][1]
            )) {
                intersectionCount++;
                break; // Count each branch pipe only once
            }
        }
    }
    
    return intersectionCount;
}; 