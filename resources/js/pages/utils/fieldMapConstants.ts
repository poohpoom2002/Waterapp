// Field Map Constants และ Configurations
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
        name: 'แม่น้ำ/ลำธาร (River)',
        icon: '🌊',
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 0.3,
        description: 'แหล่งน้ำธรรมชาติ ท่อไม่สามารถวางผ่านได้',
    },
    building: {
        name: 'อาคาร/สิ่งปลูกสร้าง (Building)',
        icon: '🏠',
        color: '#6B7280',
        fillColor: '#6B7280',
        fillOpacity: 0.5,
        description: 'อาคารหรือสิ่งปลูกสร้าง ท่อไม่สามารถวางผ่านได้',
    },
    rock: {
        name: 'หิน/ภูเขา (Rock/Mountain)',
        icon: '⛰️',
        color: '#8B5CF6',
        fillColor: '#8B5CF6',
        fillOpacity: 0.4,
        description: 'พื้นที่หินหรือภูเขา ท่อไม่สามารถวางผ่านได้',
    },
} as const;

export const PIPE_TYPES = {
    main: {
        name: 'ท่อเมน',
        icon: '🔵',
        color: '#2563eb',
        weight: 8,
        opacity: 0.9,
        description: 'ท่อหลักขนาดใหญ่ นำน้ำจากแหล่งน้ำสู่พื้นที่',
        manual: true,
    },
    submain: {
        name: 'ท่อเมนย่อย',
        icon: '🟢',
        color: '#16a34a',
        weight: 5,
        opacity: 0.8,
        description: 'ท่อขนาดกลาง แยกจากท่อเมนไปยังแต่ละโซน',
        manual: true,
    },
    lateral: {
        name: 'ท่อย่อย',
        icon: '🟡',
        color: '#ca8a04',
        weight: 2,
        opacity: 0.7,
        description: 'ท่อขนาดเล็ก กระจายน้ำภายในโซน (Auto Generate)',
        manual: false,
    },
} as const;

export const MAP_TILES = {
    street: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        name: 'Street Map',
        icon: '🛣️',
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution:
            '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        name: 'Satellite',
        icon: '🛰️',
    },
    hybrid: {
        url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        attribution:
            '&copy; <a href="https://www.google.com/maps/">Google</a> &mdash; Hybrid satellite with roads',
        name: 'Hybrid',
        icon: '🗺️',
    },
} as const;

export const EQUIPMENT_TYPES = {
    pump: {
        name: 'ปั๊ม (Pump)',
        icon: '⚡',
        imageUrl: '/generateTree/wtpump.png',
        description: 'ปั๊มน้ำสำหรับดูดส่งน้ำ',
        color: '#DC2626',
    },
    ballvalve: {
        name: 'บอลวาล์ว (Ball Valve)',
        icon: '🔘',
        imageUrl: '/generateTree/ballv.png',
        description: 'วาล์วควบคุมการไหลของน้ำ',
        color: '#2563EB',
    },
    solenoid: {
        name: 'โซลินอยด์วาล์ว (Solenoid Valve)',
        icon: '🔌',
        imageUrl: '/generateTree/solv.png',
        description: 'วาล์วอัตโนมัติควบคุมด้วยไฟฟ้า',
        color: '#16A34A',
    },
} as const;

export const DEFAULT_MAP_CENTER: [number, number] = [14.5995, 120.9842];
export const DEFAULT_MAP_ZOOM = 13;
export const DEFAULT_SNAP_DISTANCE = 20; // เพิ่มจาก 8 เป็น 20 (2.5 เท่า)
export const DEFAULT_PIPE_SNAP_DISTANCE = 30; // เพิ่มจาก 15 เป็น 30 (2 เท่า)
export const DEFAULT_GRID_SIZE = 10;

// Type definitions
export type PipeType = keyof typeof PIPE_TYPES;
export type MapTileType = keyof typeof MAP_TILES;
export type EquipmentType = keyof typeof EQUIPMENT_TYPES;
export type ObstacleType = keyof typeof OBSTACLE_TYPES;
export type DrawingStage = 'field' | 'zones' | 'pipes' | 'irrigation';
export type DrawingMode = 'zone' | 'obstacle';
