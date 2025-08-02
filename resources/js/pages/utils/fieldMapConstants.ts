// Field Map Constants and Configurations
export const ZONE_COLORS = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E9',
];

export const OBSTACLE_TYPES = {
    river: {
        name: 'Water Source', // Translation key - ใช้ใน fieldcrop.ts
        icon: '🌊',
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 0.3,
        description: 'Natural water source, pipes cannot be placed through',
    },
    building: {
        name: 'Building', // Translation key - ใช้ใน fieldcrop.ts
        icon: '🏠',
        color: '#6B7280',
        fillColor: '#6B7280',
        fillOpacity: 0.5,
        description: 'Building or structure, pipes cannot be placed through',
    },
    rock: {
        name: 'Rock', // Translation key - ใช้ใน fieldcrop.ts
        icon: '⛰️',
        color: '#8B5CF6',
        fillColor: '#8B5CF6',
        fillOpacity: 0.4,
        description: 'Rocky area or mountain, pipes cannot be placed through',
    },
} as const;

export const PIPE_TYPES = {
    main: {
        name: 'Main Pipe', // Translation key - ใช้ใน fieldcrop.ts
        icon: '🔵',
        color: '#2563eb',
        weight: 8,
        opacity: 0.9,
        description: 'Large main pipe, carries water from source to area',
        manual: true,
    },
    submain: {
        name: 'Sub Main Pipe', // Translation key - ใช้ใน fieldcrop.ts
        icon: '🟢',
        color: '#16a34a',
        weight: 5,
        opacity: 0.8,
        description: 'Medium-sized pipe, branches from main pipe to each zone',
        manual: true,
    },
    lateral: {
        name: 'Lateral Pipe', // Translation key - ใช้ใน fieldcrop.ts
        icon: '🟡',
        color: '#ca8a04',
        weight: 2,
        opacity: 0.7,
        description: 'Small pipe, distributes water within zone (Auto Generate)',
        manual: false,
    },
} as const;

export const MAP_TILES = {
    street: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        name: 'Street', // Translation key - ใช้ใน fieldcrop.ts
        icon: '🛣️',
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution:
            '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        name: 'Satellite', // Translation key - ใช้ใน fieldcrop.ts
        icon: '🛰️',
    },
    hybrid: {
        url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        attribution:
            '&copy; <a href="https://www.google.com/maps/">Google</a> &mdash; Hybrid satellite with roads',
        name: 'Hybrid', // Translation key - ใช้ใน fieldcrop.ts
        icon: '🗺️',
    },
} as const;

export const EQUIPMENT_TYPES = {
    pump: {
        name: 'Water Pump', // Translation key - ใช้ใน fieldcrop.ts
        icon: 'P',
        imageUrl: '/generateTree/wtpump.png',
        description: 'Water pump for suction and delivery',
        color: '#DC2626',
    },
    ballvalve: {
        name: 'Ball Valve', // Translation key - ใช้ใน fieldcrop.ts
        icon: 'BV',
        imageUrl: '/generateTree/ballv.png',
        description: 'Valve for controlling water flow',
        color: '#2563EB',
    },
    solenoid: {
        name: 'Solenoid Valve', // Translation key - ใช้ใน fieldcrop.ts
        icon: 'SV',
        imageUrl: '/generateTree/solv.png',
        description: 'Automatic valve controlled by electricity',
        color: '#16A34A',
    },
} as const;

export const DEFAULT_MAP_CENTER: [number, number] = [14.5995, 120.9842];
export const DEFAULT_MAP_ZOOM = 13;
export const DEFAULT_SNAP_DISTANCE = 20; // Increased from 8 to 20 (2.5x)
export const DEFAULT_PIPE_SNAP_DISTANCE = 30; // Increased from 15 to 30 (2x)
export const DEFAULT_GRID_SIZE = 10;

// Type definitions
export type PipeType = keyof typeof PIPE_TYPES;
export type MapTileType = keyof typeof MAP_TILES;
export type EquipmentType = keyof typeof EQUIPMENT_TYPES;
export type ObstacleType = keyof typeof OBSTACLE_TYPES;
export type DrawingStage = 'field' | 'zones' | 'pipes' | 'irrigation';
export type DrawingMode = 'zone' | 'obstacle';

// Translation Helper Function
export const getTranslatedName = (t: (key: string) => string, type: 'obstacle' | 'pipe' | 'equipment' | 'map', key: string): string => {
    switch (type) {
        case 'obstacle':
            return t((OBSTACLE_TYPES as any)[key]?.name || key);
        case 'pipe':
            return t((PIPE_TYPES as any)[key]?.name || key);
        case 'equipment':
            return t((EQUIPMENT_TYPES as any)[key]?.name || key);
        case 'map':
            return t((MAP_TILES as any)[key]?.name || key);
        default:
            return key;
    }
};
