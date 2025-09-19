// LOD (Level of Detail) utility functions for plant points
// This file contains reusable functions for Level of Detail management

export interface PlantPoint {
    id: string;
    lat: number;
    lng: number;
    cropType: string;
    isValid: boolean;
}

// Calculate LOD level based on zoom level
export const calculateLodLevel = (zoom: number): number => {
    if (zoom >= 19) return 1; // Show all points at very high zoom
    if (zoom >= 17) return 2; // Show every 2nd point
    if (zoom >= 15) return 4; // Show every 4th point
    if (zoom >= 13) return 8; // Show every 8th point
    if (zoom >= 11) return 16; // Show every 16th point
    if (zoom >= 9) return 32; // Show every 32nd point
    return 64; // Show every 64th point at very low zoom
};

// Filter plant points based on LOD level
export const filterPlantPointsByLod = (points: PlantPoint[], lodLevel: number): PlantPoint[] => {
    if (lodLevel <= 1) return points; // Show all points
    
    // For better distribution, use a more sophisticated sampling
    // This ensures points are distributed evenly across the area
    const targetCount = Math.max(1, Math.floor(points.length / lodLevel));
    const step = Math.max(1, Math.floor(points.length / targetCount));
    return points.filter((_, index) => index % step === 0);
};


// Create plant point marker
export const createPlantPointMarker = (point: PlantPoint, map: google.maps.Map): google.maps.Marker => {
    const plantIcon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
                <circle cx="4" cy="4" r="3" fill="#22c55e" stroke="#16a34a" stroke-width="1"/>
            </svg>
        `),
        scaledSize: new google.maps.Size(8, 8),
        anchor: new google.maps.Point(4, 4)
    };

    return new google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map: map,
        icon: plantIcon,
        title: `Plant: ${point.cropType}`,
        optimized: true,
        clickable: false,
        zIndex: 1
    });
};

// Clear all markers from array
export const clearMarkers = (markers: google.maps.Marker[]): void => {
    markers.forEach(marker => {
        if (marker && marker.setMap) {
            marker.setMap(null);
        }
    });
    markers.length = 0;
};

// Log function for debugging
export const log = (message: string, ...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[LOD] ${message}`, ...args);
    }
};
