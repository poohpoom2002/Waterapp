/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
// ฟังก์ชันสำหรับจัดการจุดเชื่อมต่อระหว่างท่อ (ปรับปรุงให้แม่นยำขึ้น)
import { Coordinate } from './horticultureUtils';

export interface ConnectionPoint {
    id: string;
    type: 'main-to-submain' | 'submain-to-main-mid' | 'submain-to-main-intersection';
    position: Coordinate;
    mainPipeId?: string;
    subMainPipeId?: string;
    color: string;
    title: string;
    zIndex: number;
}

export interface ConnectionPointConfig {
    mainToSubMain: {
        color: string;
        title: string;
        zIndex: number;
    };
    subMainToMainMid: {
        color: string;
        title: string;
        zIndex: number;
    };
    subMainToMainIntersection: {
        color: string;
        title: string;
        zIndex: number;
    };
}

// การกำหนดค่าสีและข้อมูลสำหรับจุดเชื่อมต่อแต่ละประเภท
export const CONNECTION_POINT_CONFIG: ConnectionPointConfig = {
    mainToSubMain: {
        color: '#DC2626', // สีแดงเข้มสำหรับท่อเมน-เมนรอง
        title: 'จุดเชื่อมต่อท่อเมน → ท่อเมนรอง',
        zIndex: 2001,
    },
    subMainToMainMid: {
        color: '#8B5CF6', // สีม่วงเข้มสำหรับเมนรอง-กลางเมน
        title: 'จุดเชื่อมท่อเมนรอง → กลางท่อเมน',
        zIndex: 2004,
    },
    subMainToMainIntersection: {
        color: '#3B82F6', // สีน้ำเงินสำหรับตัดเมนรอง-เมน
        title: 'จุดตัดท่อเมนรอง ↔ ท่อเมน',
        zIndex: 2003,
    },
};

// ฟังก์ชันสร้างจุดเชื่อมต่อสำหรับท่อเมน-เมนรอง
export const createMainToSubMainConnectionPoints = (
    mainPipes: any[],
    subMainPipes: any[],
    zones?: any[],
    irrigationZones?: any[],
    snapThreshold: number = 15
): ConnectionPoint[] => {
    const connectionPoints: ConnectionPoint[] = [];

    // Import ฟังก์ชันที่จำเป็น
    const { findMainToSubMainConnections } = require('./lateralPipeUtils');

    const connections = findMainToSubMainConnections(
        mainPipes,
        subMainPipes,
        zones,
        irrigationZones,
        snapThreshold
    );

    connections.forEach((connection) => {
        connectionPoints.push({
            id: `main-submain-${connection.mainPipeId}-${connection.subMainPipeId}`,
            type: 'main-to-submain',
            position: connection.connectionPoint,
            mainPipeId: connection.mainPipeId,
            subMainPipeId: connection.subMainPipeId,
            color: CONNECTION_POINT_CONFIG.mainToSubMain.color,
            title: CONNECTION_POINT_CONFIG.mainToSubMain.title,
            zIndex: CONNECTION_POINT_CONFIG.mainToSubMain.zIndex,
        });
    });

    return connectionPoints;
};

// ฟังก์ชันสร้างจุดเชื่อมต่อสำหรับเมนรอง-กลางเมน
export const createSubMainToMainMidConnectionPoints = (
    subMainPipes: any[],
    mainPipes: any[],
    zones?: any[],
    irrigationZones?: any[],
    snapThreshold: number = 15
): ConnectionPoint[] => {
    const connectionPoints: ConnectionPoint[] = [];

    // Import ฟังก์ชันที่จำเป็น
    const { findMidConnections } = require('./lateralPipeUtils');

    const connections = findMidConnections(
        subMainPipes,
        mainPipes,
        snapThreshold,
        zones,
        irrigationZones
    );

    connections.forEach((connection, index) => {
        connectionPoints.push({
            id: `submain-mainmid-${connection.sourcePipeId}-${connection.targetPipeId}`,
            type: 'submain-to-main-mid',
            position: connection.connectionPoint,
            mainPipeId: connection.targetPipeId,
            subMainPipeId: connection.sourcePipeId,
            color: CONNECTION_POINT_CONFIG.subMainToMainMid.color,
            title: CONNECTION_POINT_CONFIG.subMainToMainMid.title,
            zIndex: CONNECTION_POINT_CONFIG.subMainToMainMid.zIndex,
        });
    });

    return connectionPoints;
};

// ฟังก์ชันสร้างจุดตัดสำหรับเมนรอง-เมน
export const createSubMainToMainIntersectionPoints = (
    subMainPipes: any[],
    mainPipes: any[],
    zones?: any[],
    irrigationZones?: any[]
): ConnectionPoint[] => {
    const connectionPoints: ConnectionPoint[] = [];

    // Import ฟังก์ชันที่จำเป็น
    const { findSubMainToMainIntersections } = require('./lateralPipeUtils');

    const intersections = findSubMainToMainIntersections(
        subMainPipes,
        mainPipes,
        zones,
        irrigationZones
    );

    intersections.forEach((intersection, index) => {
        connectionPoints.push({
            id: `submain-main-intersection-${intersection.subMainPipeId}-${intersection.mainPipeId}`,
            type: 'submain-to-main-intersection',
            position: intersection.intersectionPoint,
            mainPipeId: intersection.mainPipeId,
            subMainPipeId: intersection.subMainPipeId,
            color: CONNECTION_POINT_CONFIG.subMainToMainIntersection.color,
            title: CONNECTION_POINT_CONFIG.subMainToMainIntersection.title,
            zIndex: CONNECTION_POINT_CONFIG.subMainToMainIntersection.zIndex,
        });
    });

    return connectionPoints;
};

// ฟังก์ชันรวมจุดเชื่อมต่อทั้งหมด
export const createAllConnectionPoints = (
    mainPipes: any[],
    subMainPipes: any[],
    zones?: any[],
    irrigationZones?: any[],
    snapThreshold: number = 15
): ConnectionPoint[] => {
    const allConnectionPoints: ConnectionPoint[] = [];

    // เพิ่มจุดเชื่อมต่อแต่ละประเภท
    allConnectionPoints.push(
        ...createMainToSubMainConnectionPoints(
            mainPipes,
            subMainPipes,
            zones,
            irrigationZones,
            snapThreshold
        )
    );

    allConnectionPoints.push(
        ...createSubMainToMainMidConnectionPoints(
            subMainPipes,
            mainPipes,
            zones,
            irrigationZones,
            snapThreshold
        )
    );

    allConnectionPoints.push(
        ...createSubMainToMainIntersectionPoints(subMainPipes, mainPipes, zones, irrigationZones)
    );

    return allConnectionPoints;
};

// ฟังก์ชันสร้าง Google Maps Marker สำหรับจุดเชื่อมต่อ
export const createConnectionPointMarker = (
    connectionPoint: ConnectionPoint,
    map: google.maps.Map
): google.maps.Marker => {
    return new google.maps.Marker({
        position: new google.maps.LatLng(
            connectionPoint.position.lat,
            connectionPoint.position.lng
        ),
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4, // ขนาดที่เห็นชัด
            fillColor: connectionPoint.color,
            fillOpacity: 1.0,
            strokeColor: '#FFFFFF',
            strokeWeight: 2, // ขอบสีขาว
        },
        zIndex: connectionPoint.zIndex,
        title: connectionPoint.title,
    });
};

// ฟังก์ชันสร้าง InfoWindow สำหรับจุดเชื่อมต่อ
export const createConnectionPointInfoWindow = (
    connectionPoint: ConnectionPoint
): google.maps.InfoWindow => {
    let content = `
        <div class="p-2 min-w-[200px]">
            <h4 class="font-bold text-gray-800 mb-2">🔗 ${connectionPoint.title}</h4>
            <div class="space-y-1 text-sm">
    `;

    if (connectionPoint.mainPipeId) {
        content += `<p><strong>ท่อเมน:</strong> ${connectionPoint.mainPipeId}</p>`;
    }

    if (connectionPoint.subMainPipeId) {
        content += `<p><strong>ท่อเมนรอง:</strong> ${connectionPoint.subMainPipeId}</p>`;
    }

    content += `
            </div>
        </div>
    `;

    return new google.maps.InfoWindow({
        content: content,
    });
};

// ฟังก์ชันแสดงจุดเชื่อมต่อทั้งหมดบนแผนที่
export const displayConnectionPointsOnMap = (
    connectionPoints: ConnectionPoint[],
    map: google.maps.Map,
    overlaysRef: React.MutableRefObject<{
        markers: Map<string, google.maps.Marker>;
        polylines: Map<string, google.maps.Polyline>;
        infoWindows: Map<string, google.maps.InfoWindow>;
    }>
): void => {
    connectionPoints.forEach((connectionPoint) => {
        const marker = createConnectionPointMarker(connectionPoint, map);
        const infoWindow = createConnectionPointInfoWindow(connectionPoint);

        // เพิ่ม event listener สำหรับการคลิก
        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });

        // เก็บ reference
        overlaysRef.current.markers.set(connectionPoint.id, marker);
        overlaysRef.current.infoWindows.set(connectionPoint.id, infoWindow);
    });
};

// ฟังก์ชันลบจุดเชื่อมต่อทั้งหมดจากแผนที่
export const clearConnectionPointsFromMap = (
    overlaysRef: React.MutableRefObject<{
        markers: Map<string, google.maps.Marker>;
        polylines: Map<string, google.maps.Polyline>;
        infoWindows: Map<string, google.maps.InfoWindow>;
    }>
): void => {
    // ลบ markers
    overlaysRef.current.markers.forEach((marker) => {
        marker.setMap(null);
    });
    overlaysRef.current.markers.clear();

    // ลบ info windows
    overlaysRef.current.infoWindows.forEach((infoWindow) => {
        infoWindow.close();
    });
    overlaysRef.current.infoWindows.clear();
};

// ฟังก์ชันนับจุดเชื่อมต่อแต่ละประเภท
export const countConnectionPointsByType = (
    connectionPoints: ConnectionPoint[]
): {
    mainToSubMain: number;
    subMainToMainMid: number;
    subMainToMainIntersection: number;
    total: number;
} => {
    const counts = {
        mainToSubMain: 0,
        subMainToMainMid: 0,
        subMainToMainIntersection: 0,
        total: 0,
    };

    connectionPoints.forEach((point) => {
        switch (point.type) {
            case 'main-to-submain':
                counts.mainToSubMain++;
                break;
            case 'submain-to-main-mid':
                counts.subMainToMainMid++;
                break;
            case 'submain-to-main-intersection':
                counts.subMainToMainIntersection++;
                break;
        }
    });

    counts.total =
        counts.mainToSubMain + counts.subMainToMainMid + counts.subMainToMainIntersection;

    return counts;
};
