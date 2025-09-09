/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { useLanguage } from '../contexts/LanguageContext';
import HorticultureMapComponent from '../components/horticulture/HorticultureMapComponent';

import {
    HorticultureProjectData,
    ProjectSummaryData,
    calculateProjectSummary,
    formatAreaInRai,
    formatDistance,
    formatWaterVolume,
    loadProjectData,
    navigateToPlanner,
    isPointInPolygon,
} from '../utils/horticultureUtils';

// Function to clean up localStorage when quota is exceeded
const cleanupLocalStorage = () => {
    try {
        console.log('🧹 Cleaning up localStorage...');
        
        // Get all keys
        const keys = Object.keys(localStorage);
        console.log('📦 Total localStorage items:', keys.length);
        
        // Remove old project data (keep only the most recent)
        const projectKeys = keys.filter(key => 
            key.startsWith('horticultureIrrigationData') || 
            key.startsWith('savedProductProject_') ||
            key.startsWith('projectMapImage')
        );
        
        if (projectKeys.length > 3) {
            // Keep only the 3 most recent items
            const keysToRemove = projectKeys.slice(0, projectKeys.length - 3);
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log('🗑️ Removed:', key);
            });
        }
        
        // Remove old mock fields
        const mockKeys = keys.filter(key => key.startsWith('mock-'));
        mockKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log('🗑️ Removed mock field:', key);
        });
        
        console.log('✅ localStorage cleanup completed');
        return true;
    } catch (error) {
        console.error('❌ Error during localStorage cleanup:', error);
        return false;
    }
};

// Make cleanup function available globally for console access
if (typeof window !== 'undefined') {
    (window as any).clearHorticultureStorage = () => {
        console.log('🧹 Manual localStorage cleanup initiated...');
        if (cleanupLocalStorage()) {
            console.log('✅ Manual cleanup successful!');
            alert('localStorage cleanup completed successfully!');
        } else {
            console.log('❌ Manual cleanup failed!');
            alert('localStorage cleanup failed!');
        }
    };
    
    (window as any).clearAllStorage = () => {
        console.log('🧹 Clearing ALL localStorage...');
        localStorage.clear();
        console.log('✅ All localStorage cleared!');
        alert('All localStorage cleared!');
    };
}

// Function to safely save to localStorage with cleanup
const safeLocalStorageSet = (key: string, value: string): boolean => {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
            console.warn('⚠️ localStorage quota exceeded, attempting cleanup...');
            if (cleanupLocalStorage()) {
                try {
                    localStorage.setItem(key, value);
                    console.log('✅ Successfully saved after cleanup');
                    return true;
                } catch (retryError) {
                    console.error('❌ Still failed after cleanup:', retryError);
                    return false;
                }
            }
        }
        console.error('❌ localStorage save failed:', error);
        return false;
    }
};

const ZONE_COLORS = [
    '#FF69B4', // Hot Pink - โซน 1
    '#00CED1', // Dark Turquoise - โซน 2
    '#32CD32', // Lime Green - โซน 3
    '#FFD700', // Gold - โซน 4
    '#FF6347', // Tomato - โซน 5
    '#9370DB', // Medium Purple - โซน 6
    '#20B2AA', // Light Sea Green - โซน 7
    '#FF1493', // Deep Pink - โซน 8
    '#00FA9A', // Medium Spring Green - โซน 9
    '#FFA500', // Orange - โซน 10
];

const EXCLUSION_COLORS = {
    building: '#F59E0B',
    powerplant: '#EF4444',
    river: '#3B82F6',
    road: '#6B7280',
    other: '#8B5CF6',
};

interface PipeConnectorSummary {
    twoWay: number;
    threeWay: number;
    fourWay: number;
    total: number;
    details: {
        mainPipes: {
            twoWay: number;
            threeWay: number;
            fourWay: number;
        };
        subMainPipes: {
            twoWay: number;
            threeWay: number;
            fourWay: number;
        };
        branchPipes: {
            twoWay: number;
            threeWay: number;
            fourWay: number;
        };
        plants: {
            twoWay: number;
            threeWay: number;
            fourWay: number;
        };
    };
}

const getExclusionTypeName = (type: string, t: (key: string) => string): string => {
    switch (type) {
        case 'building':
            return t('สิ่งก่อสร้าง');
        case 'powerplant':
            return t('โรงไฟฟ้า');
        case 'river':
            return t('แหล่งน้ำ');
        case 'road':
            return t('ถนน');
        case 'other':
            return t('อื่นๆ');
        default:
            return t('พื้นที่หลีกเลี่ยง');
    }
};

const getZoneColor = (index: number): string => {
    return ZONE_COLORS[index % ZONE_COLORS.length];
};

const getPolygonCenter = (coordinates: Coordinate[]): Coordinate => {
    if (coordinates.length === 0) return { lat: 0, lng: 0 };

    const totalLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0);
    const totalLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0);

    return {
        lat: totalLat / coordinates.length,
        lng: totalLng / coordinates.length,
    };
};

const calculateDistanceBetweenPoints = (point1: Coordinate, point2: Coordinate): number => {
    const R = 6371e3;
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

const isPointsClose = (point1: Coordinate, point2: Coordinate, threshold: number = 5): boolean => {
    const distance = calculateDistanceBetweenPoints(point1, point2);
    return distance <= threshold;
};

// ฟังก์ชันตรวจสอบว่าจุดบนท่อเมนรองเป็นจุดเริ่มต้นหรือไม่
const isPointAtSubMainPipeStart = (
    point: Coordinate,
    subMainPipeCoordinates: Coordinate[],
    threshold: number = 5
): boolean => {
    if (subMainPipeCoordinates.length === 0) return false;
    const startPoint = subMainPipeCoordinates[0];
    const distance = calculateDistanceBetweenPoints(point, startPoint);
    return distance <= threshold;
};

// ฟังก์ชันตรวจสอบว่าจุดอยู่ระหว่างท่อเมนรองหรือไม่ (ไม่ใช่จุดเริ่มต้น)
const isPointOnSubMainPipeMidway = (
    point: Coordinate,
    subMainPipeCoordinates: Coordinate[],
    threshold: number = 5
): boolean => {
    if (subMainPipeCoordinates.length < 2) return false;

    // ตรวจสอบว่าไม่ใช่จุดเริ่มต้น
    if (isPointAtSubMainPipeStart(point, subMainPipeCoordinates, threshold)) {
        return false;
    }

    // ตรวจสอบระยะห่างจากแต่ละเส้นของท่อเมนรอง
    for (let i = 0; i < subMainPipeCoordinates.length - 1; i++) {
        const start = subMainPipeCoordinates[i];
        const end = subMainPipeCoordinates[i + 1];

        const closestPoint = findClosestPointOnLineSegment(point, start, end);
        const distance = calculateDistanceBetweenPoints(point, closestPoint);

        if (distance <= threshold) {
            return true;
        }
    }
    return false;
};

// ฟังก์ชันหาจุดที่ใกล้ที่สุดบนเส้นระหว่างสองจุด
const findClosestPointOnLineSegment = (
    point: Coordinate,
    lineStart: Coordinate,
    lineEnd: Coordinate
): Coordinate => {
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return lineStart;

    const param = dot / lenSq;

    if (param < 0) {
        return lineStart;
    } else if (param > 1) {
        return lineEnd;
    } else {
        return {
            lat: lineStart.lat + param * C,
            lng: lineStart.lng + param * D,
        };
    }
};

// ฟังก์ชันคำนวณข้อต่อท่อเมนหลักตามจำนวนจุดและการ snap กับท่อเมนรอง
const calculateMainPipeConnectors = (
    coordinates: Coordinate[],
    subMainPipes: any[] = []
): number => {
    const pointCount = coordinates.length;

    // คำนวณข้อต่อจากจำนวนจุดในการวาด (เหมือนเดิม)
    let baseConnectors = 0;
    if (pointCount === 2) {
        baseConnectors = 0; // เส้นตรง ไม่ต้องใช้ข้อต่อ
    } else if (pointCount === 3) {
        baseConnectors = 1; // มี 3 จุด ใช้ 2 ทาง 1 ตัว
    } else if (pointCount === 4) {
        baseConnectors = 2; // มี 4 จุด ใช้ 2 ทาง 2 ตัว
    } else if (pointCount > 4) {
        baseConnectors = pointCount - 2; // สำหรับจุดที่มากกว่า 4 จุด
    }

    // ตรวจสอบการ snap ของปลายท่อเมนหลักกับท่อเมนรอง
    let snapConnectors = 0;
    if (coordinates.length > 0 && subMainPipes.length > 0) {
        const mainPipeEnd = coordinates[coordinates.length - 1];

        for (const subMainPipe of subMainPipes) {
            if (!subMainPipe.coordinates || subMainPipe.coordinates.length === 0) continue;

            // ตรวจสอบว่า snap เข้ากับจุดเริ่มต้นของท่อเมนรอง
            if (isPointAtSubMainPipeStart(mainPipeEnd, subMainPipe.coordinates)) {
                snapConnectors += 1; // เพิ่มข้อต่อ 2 ทาง 1 ตัว
                break; // หยุดตรวจสอบเมื่อพบการ snap แล้ว
            }
            // ตรวจสอบว่า snap เข้ากับระหว่างท่อเมนรอง (ไม่ใช่จุดเริ่มต้น)
            else if (isPointOnSubMainPipeMidway(mainPipeEnd, subMainPipe.coordinates)) {
                snapConnectors += 2; // เพิ่มข้อต่อ 3 ทาง 1 ตัว (2 หน่วยสำหรับ 3 ทาง)
                break; // หยุดตรวจสอบเมื่อพบการ snap แล้ว
            }
        }
    }

    return baseConnectors + snapConnectors;
};

const calculatePipeConnectors = (projectData: HorticultureProjectData): PipeConnectorSummary => {
    const summary: PipeConnectorSummary = {
        twoWay: 0,
        threeWay: 0,
        fourWay: 0,
        total: 0,
        details: {
            mainPipes: { twoWay: 0, threeWay: 0, fourWay: 0 },
            subMainPipes: { twoWay: 0, threeWay: 0, fourWay: 0 },
            branchPipes: { twoWay: 0, threeWay: 0, fourWay: 0 },
            plants: { twoWay: 0, threeWay: 0, fourWay: 0 },
        },
    };

    // คำนวณข้อต่อท่อเมนหลักตามจำนวนจุดที่ใช้ในการวาดและการ snap กับท่อเมนรอง
    projectData.mainPipes.forEach((mainPipe) => {
        if (mainPipe.coordinates.length === 0) return;

        const connectorCount = calculateMainPipeConnectors(
            mainPipe.coordinates,
            projectData.subMainPipes
        );

        // คำนวณข้อต่อพื้นฐานจากจำนวนจุดในการวาดท่อ
        const baseConnectors =
            mainPipe.coordinates.length > 2 ? mainPipe.coordinates.length - 2 : 0;

        // คำนวณข้อต่อเพิ่มเติมจากการ snap กับท่อเมนรอง
        const snapConnectors = connectorCount - baseConnectors;

        // จัดสรรข้อต่อแต่ละประเภท:
        // - ข้อต่อพื้นฐาน: 2 ทาง
        // - snap เข้ากับจุดเริ่มต้นท่อเมนรอง: เพิ่ม 2 ทาง 1 ตัว (+1 หน่วย)
        // - snap เข้ากับระหว่างท่อเมนรอง: เพิ่ม 3 ทาง 1 ตัว (+1 หน่วยใน threeWay)
        if (snapConnectors === 1) {
            // snap กับจุดเริ่มต้น: เพิ่ม 2 ทาง
            summary.details.mainPipes.twoWay += baseConnectors + 1;
        } else if (snapConnectors === 2) {
            // snap กับระหว่างท่อ: เพิ่ม 3 ทาง (snapConnectors = 2 หมายถึง 3 ทาง 1 ตัว)
            summary.details.mainPipes.twoWay += baseConnectors;
            summary.details.mainPipes.threeWay += 1;
        } else {
            // ไม่มีการ snap หรือกรณีปกติ
            summary.details.mainPipes.twoWay += connectorCount;
        }
    });

    const hasBranchesOnBothSides = (subMainPipe: any, branchPipes: any[]): boolean => {
        const validBranches = branchPipes.filter((bp) => bp.coordinates.length > 0);

        if (validBranches.length < 2) return false;

        const connectedBranches = validBranches.filter((bp) => {
            const branchStart = bp.coordinates[0];
            const minDistance = Math.min(
                ...subMainPipe.coordinates.map((coord) =>
                    Math.sqrt(
                        Math.pow(coord.lat - branchStart.lat, 2) +
                            Math.pow(coord.lng - branchStart.lng, 2)
                    )
                )
            );
            return minDistance < 5;
        });

        if (connectedBranches.length < 2) return false;

        const branchesBySide = { left: 0, right: 0 };

        connectedBranches.forEach((branch) => {
            const branchStart = branch.coordinates[0];

            // หาตำแหน่งที่ใกล้ที่สุดบนท่อเมนรอง
            let closestIndex = 0;
            let minDistance = Infinity;

            subMainPipe.coordinates.forEach((coord: any, index: number) => {
                const distance = Math.sqrt(
                    Math.pow(coord.lat - branchStart.lat, 2) +
                        Math.pow(coord.lng - branchStart.lng, 2)
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = index;
                }
            });

            const branchDirection = branch.coordinates[1]
                ? Math.atan2(
                      branch.coordinates[1].lng - branch.coordinates[0].lng,
                      branch.coordinates[1].lat - branch.coordinates[0].lat
                  )
                : 0;

            const pipeDirection = subMainPipe.coordinates[1]
                ? Math.atan2(
                      subMainPipe.coordinates[1].lng - subMainPipe.coordinates[0].lng,
                      subMainPipe.coordinates[1].lat - subMainPipe.coordinates[0].lat
                  )
                : 0;

            // ตรวจสอบว่าท่อย่อยออกจากด้านซ้ายหรือขวาของท่อเมนรอง
            const relativeAngle = branchDirection - pipeDirection;
            const normalizedAngle = ((relativeAngle + Math.PI) % (2 * Math.PI)) - Math.PI;

            if (normalizedAngle > 0) {
                branchesBySide.right++;
            } else {
                branchesBySide.left++;
            }
        });

        return branchesBySide.left > 0 && branchesBySide.right > 0;
    };

    const findOppositeBranchPipes = (
        subMainPipe: any,
        branchPipes: any[]
    ): Map<string, string[]> => {
        const oppositePairs = new Map<string, string[]>();

        if (subMainPipe.coordinates.length < 2) return oppositePairs;

        const connectedBranches = branchPipes.filter((bp) => {
            if (bp.coordinates.length === 0) return false;

            const branchStart = bp.coordinates[0];

            const minDistance = Math.min(
                ...subMainPipe.coordinates.map((coord) =>
                    Math.sqrt(
                        Math.pow(coord.lat - branchStart.lat, 2) +
                            Math.pow(coord.lng - branchStart.lng, 2)
                    )
                )
            );

            return minDistance < 3;
        });

        if (connectedBranches.length < 2) return oppositePairs;

        // คำนวณระยะทางรวมของท่อเมนรอง
        let totalPipeLength = 0;
        for (let i = 1; i < subMainPipe.coordinates.length; i++) {
            const prev = subMainPipe.coordinates[i - 1];
            const curr = subMainPipe.coordinates[i];
            totalPipeLength += Math.sqrt(
                Math.pow(curr.lat - prev.lat, 2) + Math.pow(curr.lng - prev.lng, 2)
            );
        }

        const branchPositions = connectedBranches.map((branch) => {
            const branchStart = branch.coordinates[0];

            // หาตำแหน่งที่ใกล้ที่สุดบนท่อเมนรอง
            let closestIndex = 0;
            let minDistance = Infinity;

            subMainPipe.coordinates.forEach((coord: any, index: number) => {
                const distance = Math.sqrt(
                    Math.pow(coord.lat - branchStart.lat, 2) +
                        Math.pow(coord.lng - branchStart.lng, 2)
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = index;
                }
            });

            let distanceFromStart = 0;
            for (let i = 1; i <= closestIndex; i++) {
                const prev = subMainPipe.coordinates[i - 1];
                const curr = subMainPipe.coordinates[i];
                distanceFromStart += Math.sqrt(
                    Math.pow(curr.lat - prev.lat, 2) + Math.pow(curr.lng - prev.lng, 2)
                );
            }

            return {
                branch,
                position: distanceFromStart / totalPipeLength,
                distanceFromStart,
            };
        });

        const leftBranches: typeof branchPositions = [];
        const rightBranches: typeof branchPositions = [];

        branchPositions.forEach((branchPos) => {
            const branch = branchPos.branch;
            const branchStart = branch.coordinates[0];

            const pipeDirection = subMainPipe.coordinates[1]
                ? Math.atan2(
                      subMainPipe.coordinates[1].lng - subMainPipe.coordinates[0].lng,
                      subMainPipe.coordinates[1].lat - subMainPipe.coordinates[0].lat
                  )
                : 0;

            const branchDirection = branch.coordinates[1]
                ? Math.atan2(
                      branch.coordinates[1].lng - branch.coordinates[0].lng,
                      branch.coordinates[1].lat - branch.coordinates[0].lat
                  )
                : 0;

            // ตรวจสอบว่าท่อย่อยออกจากด้านซ้ายหรือขวาของท่อเมนรอง
            const relativeAngle = branchDirection - pipeDirection;
            const normalizedAngle = ((relativeAngle + Math.PI) % (2 * Math.PI)) - Math.PI;

            if (normalizedAngle > 0) {
                rightBranches.push(branchPos);
            } else {
                leftBranches.push(branchPos);
            }
        });

        if (leftBranches.length > 0 && rightBranches.length > 0) {
            leftBranches.sort((a, b) => a.position - b.position);
            rightBranches.sort((a, b) => a.position - b.position);

            const maxPairs = Math.min(leftBranches.length, rightBranches.length);
            for (let i = 0; i < maxPairs; i++) {
                const leftBranch = leftBranches[i];
                const rightBranch = rightBranches[i];

                const pairKey = `${leftBranch.branch.id}-${rightBranch.branch.id}`;
                oppositePairs.set(pairKey, [leftBranch.branch.id, rightBranch.branch.id]);
            }
        }

        return oppositePairs;
    };

    // ฟังก์ชันตรวจสอบว่าท่อย่อยอยู่ตรงกลางหรือขอบของท่อเมนรอง
    const isBranchAtCenter = (branch: any, subMainPipe: any, branchPipes: any[]): boolean => {
        if (subMainPipe.coordinates.length < 2) return false;

        const branchStart = branch.coordinates[0];

        // หาตำแหน่งที่ใกล้ที่สุดบนท่อเมนรอง
        let closestIndex = 0;
        let minDistance = Infinity;

        subMainPipe.coordinates.forEach((coord: any, index: number) => {
            const distance = Math.sqrt(
                Math.pow(coord.lat - branchStart.lat, 2) + Math.pow(coord.lng - branchStart.lng, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        // คำนวณระยะทางรวมของท่อเมนรอง
        let totalPipeLength = 0;
        for (let i = 1; i < subMainPipe.coordinates.length; i++) {
            const prev = subMainPipe.coordinates[i - 1];
            const curr = subMainPipe.coordinates[i];
            totalPipeLength += Math.sqrt(
                Math.pow(curr.lat - prev.lat, 2) + Math.pow(curr.lng - prev.lng, 2)
            );
        }

        // คำนวณระยะทางจากจุดเริ่มต้นถึงตำแหน่งที่ใกล้ที่สุด
        let distanceFromStart = 0;
        for (let i = 1; i <= closestIndex; i++) {
            const prev = subMainPipe.coordinates[i - 1];
            const curr = subMainPipe.coordinates[i];
            distanceFromStart += Math.sqrt(
                Math.pow(curr.lat - prev.lat, 2) + Math.pow(curr.lng - prev.lng, 2)
            );
        }

        // สำหรับท่อที่มีแค่ 2 จุด ให้ใช้วิธีพิเศษ
        if (subMainPipe.coordinates.length === 2) {
            // หาท่อย่อยทั้งหมดที่เชื่อมต่อกับท่อเมนรองนี้
            const allBranches = branchPipes.filter((bp) => {
                if (bp.coordinates.length === 0) return false;
                const bpStart = bp.coordinates[0];
                const minDist = Math.min(
                    ...subMainPipe.coordinates.map((coord) =>
                        Math.sqrt(
                            Math.pow(coord.lat - bpStart.lat, 2) +
                                Math.pow(coord.lng - bpStart.lng, 2)
                        )
                    )
                );
                return minDist < 3;
            });

            if (allBranches.length <= 2) {
                // ถ้ามีท่อย่อยน้อยกว่า 2 ตัว ให้ถือว่าทั้งหมดเป็น edge
                return false;
            }

            // เรียงลำดับท่อย่อยตามตำแหน่ง
            const branchPositions = allBranches.map((bp) => {
                const bpStart = bp.coordinates[0];
                let bpClosestIndex = 0;
                let bpMinDistance = Infinity;

                subMainPipe.coordinates.forEach((coord: any, index: number) => {
                    const distance = Math.sqrt(
                        Math.pow(coord.lat - bpStart.lat, 2) + Math.pow(coord.lng - bpStart.lng, 2)
                    );

                    if (distance < bpMinDistance) {
                        bpMinDistance = distance;
                        bpClosestIndex = index;
                    }
                });

                let bpDistanceFromStart = 0;
                for (let i = 1; i <= bpClosestIndex; i++) {
                    const prev = subMainPipe.coordinates[i - 1];
                    const curr = subMainPipe.coordinates[i];
                    bpDistanceFromStart += Math.sqrt(
                        Math.pow(curr.lat - prev.lat, 2) + Math.pow(curr.lng - prev.lng, 2)
                    );
                }

                return {
                    branch: bp,
                    distanceFromStart: bpDistanceFromStart,
                    position: bpDistanceFromStart / totalPipeLength,
                };
            });

            // เรียงลำดับตามตำแหน่ง
            branchPositions.sort((a, b) => a.position - b.position);

            // หาตำแหน่งของท่อย่อยปัจจุบัน
            const currentBranchIndex = branchPositions.findIndex(
                (bp) => bp.branch.id === branch.id
            );

            if (currentBranchIndex === -1) return false;

            // ถ้าอยู่ในตำแหน่งแรกหรือสุดท้าย ให้ถือว่าเป็น edge
            if (currentBranchIndex === 0 || currentBranchIndex === branchPositions.length - 1) {
                return false;
            }

            // ถ้าอยู่ในตำแหน่งกลาง ให้ถือว่าเป็น center
            return true;
        }

        // สำหรับท่อที่มีมากกว่า 2 จุด ใช้วิธีเดิม
        const positionRatio = distanceFromStart / totalPipeLength;
        const isCenter = positionRatio >= 0.15 && positionRatio <= 0.85;

        console.log(
            `🔍 Branch ${branch.id}: position ratio ${positionRatio.toFixed(3)}, center: ${isCenter}`
        );

        return isCenter;
    };

    const calculateSubMainPipeConnectors = (subMainPipe: any, branchPipes: any[]) => {
        const validBranches = branchPipes.filter((bp) => bp.coordinates.length > 0);

        if (validBranches.length === 0) return;

        const hasBothSides = hasBranchesOnBothSides(subMainPipe, validBranches);

        if (hasBothSides) {
            const oppositePairs = findOppositeBranchPipes(subMainPipe, validBranches);
            const usedBranches = new Set<string>();

            let fourWayCount = 0;
            oppositePairs.forEach((pair, key) => {
                const [branch1Id, branch2Id] = pair;

                if (!usedBranches.has(branch1Id) && !usedBranches.has(branch2Id)) {
                    const branch1 = validBranches.find((b) => b.id === branch1Id);
                    const branch2 = validBranches.find((b) => b.id === branch2Id);

                    if (branch1 && branch2) {
                        const branch1IsCenter = isBranchAtCenter(
                            branch1,
                            subMainPipe,
                            validBranches
                        );
                        const branch2IsCenter = isBranchAtCenter(
                            branch2,
                            subMainPipe,
                            validBranches
                        );

                        if (branch1IsCenter && branch2IsCenter) {
                            fourWayCount++;
                            usedBranches.add(branch1Id);
                            usedBranches.add(branch2Id);
                        }
                    }
                }
            });

            let threeWayCount = 0;

            oppositePairs.forEach((pair, key) => {
                const [branch1Id, branch2Id] = pair;

                if (!usedBranches.has(branch1Id) && !usedBranches.has(branch2Id)) {
                    const branch1 = validBranches.find((b) => b.id === branch1Id);
                    const branch2 = validBranches.find((b) => b.id === branch2Id);

                    if (branch1 && branch2) {
                        const branch1IsCenter = isBranchAtCenter(
                            branch1,
                            subMainPipe,
                            validBranches
                        );
                        const branch2IsCenter = isBranchAtCenter(
                            branch2,
                            subMainPipe,
                            validBranches
                        );

                        if (branch1IsCenter !== branch2IsCenter) {
                            if (!branch1IsCenter) {
                                threeWayCount++;
                                usedBranches.add(branch1Id);
                                usedBranches.add(branch2Id);
                            } else {
                                threeWayCount++;
                                usedBranches.add(branch2Id);
                                usedBranches.add(branch1Id);
                            }
                        }
                    }
                }
            });

            validBranches.forEach((branch) => {
                if (usedBranches.has(branch.id)) return;

                let hasOpposite = false;
                oppositePairs.forEach((pair) => {
                    if (pair.includes(branch.id)) {
                        hasOpposite = true;
                    }
                });

                if (!hasOpposite && !isBranchAtCenter(branch, subMainPipe, validBranches)) {
                    threeWayCount++;
                    usedBranches.add(branch.id);
                }
            });

            const remainingBranches = validBranches.filter(
                (branch) => !usedBranches.has(branch.id)
            );
            const twoWayCount = remainingBranches.filter((branch) =>
                isBranchAtCenter(branch, subMainPipe, validBranches)
            ).length;

            summary.details.subMainPipes.twoWay += twoWayCount;
            summary.details.subMainPipes.threeWay += threeWayCount;
            summary.details.subMainPipes.fourWay += fourWayCount;
        } else {
            const branchPipesCount = validBranches.length;

            if (branchPipesCount > 0) {
                summary.details.subMainPipes.twoWay += 2;

                if (branchPipesCount > 2) {
                    summary.details.subMainPipes.threeWay += branchPipesCount - 2;
                }
            }
        }
    };

    projectData.subMainPipes.forEach((subMainPipe) => {
        if (subMainPipe.coordinates.length === 0) return;

        calculateSubMainPipeConnectors(subMainPipe, subMainPipe.branchPipes);
    });

    projectData.subMainPipes.forEach((subMainPipe) => {
        subMainPipe.branchPipes.forEach((branchPipe) => {
            if (branchPipe.coordinates.length === 0) return;

            if (branchPipe.coordinates.length > 2) {
                summary.details.branchPipes.twoWay += branchPipe.coordinates.length - 2;
            }

            if (branchPipe.plants && branchPipe.plants.length > 0) {
                branchPipe.plants.forEach((plant, index) => {
                    if (index === branchPipe.plants.length - 1) {
                        summary.details.plants.twoWay++;
                    } else {
                        summary.details.plants.threeWay++;
                    }
                });
            }

            if (!branchPipe.plants || branchPipe.plants.length === 0) {
                summary.details.branchPipes.twoWay++;
            }
        });
    });

    summary.twoWay =
        summary.details.mainPipes.twoWay +
        summary.details.subMainPipes.twoWay +
        summary.details.branchPipes.twoWay +
        summary.details.plants.twoWay;

    summary.threeWay =
        summary.details.mainPipes.threeWay +
        summary.details.subMainPipes.threeWay +
        summary.details.branchPipes.threeWay +
        summary.details.plants.threeWay;

    summary.fourWay =
        summary.details.mainPipes.fourWay +
        summary.details.subMainPipes.fourWay +
        summary.details.branchPipes.fourWay;

    summary.total = summary.twoWay + summary.threeWay + summary.fourWay;

    return summary;
};

const createAreaTextOverlay = (
    map: google.maps.Map,
    coordinates: Coordinate[],
    labelText: string,
    color: string
): google.maps.OverlayView => {
    const center = getPolygonCenter(coordinates);

    class TextOverlay extends google.maps.OverlayView {
        private position: google.maps.LatLng;
        private text: string;
        private color: string;
        private div?: HTMLDivElement;

        constructor(position: google.maps.LatLng, text: string, color: string) {
            super();
            this.position = position;
            this.text = text;
            this.color = color;
        }

        onAdd() {
            this.div = document.createElement('div');
            this.div.style.position = 'absolute';
            this.div.style.fontSize = '10px';
            this.div.style.fontWeight = 'normal';
            this.div.style.color = 'black';
            this.div.style.textShadow = `
                -1px -1px 0 rgba(255,255,255,0.8),
                1px -1px 0 rgba(255,255,255,0.8),
                -1px 1px 0 rgba(255,255,255,0.8),
                1px 1px 0 rgba(255,255,255,0.8),
                0 0 3px rgba(255,255,255,0.5)
            `;
            this.div.style.pointerEvents = 'none';
            this.div.style.userSelect = 'none';
            this.div.style.opacity = '0.6';
            this.div.style.whiteSpace = 'wrap';
            this.div.style.textAlign = 'center';
            this.div.style.transform = 'translate(-50%, -50%)';
            this.div.innerHTML = this.text;

            const panes = this.getPanes();
            if (panes) {
                panes.overlayLayer.appendChild(this.div);
            }
        }

        draw() {
            if (this.div) {
                const overlayProjection = this.getProjection();
                if (overlayProjection) {
                    const position = overlayProjection.fromLatLngToDivPixel(this.position);
                    if (position) {
                        this.div.style.left = position.x + 'px';
                        this.div.style.top = position.y + 'px';
                    }
                }
            }
        }

        onRemove() {
            if (this.div && this.div.parentNode) {
                this.div.parentNode.removeChild(this.div);
                this.div = undefined;
            }
        }
    }

    const overlay = new TextOverlay(
        new google.maps.LatLng(center.lat, center.lng),
        labelText,
        color
    );

    overlay.setMap(map);
    return overlay;
};

interface Coordinate {
    lat: number;
    lng: number;
}

interface Zone {
    id: string;
    name: string;
    coordinates: Coordinate[];
    plantData: any;
    plantCount: number;
    totalWaterNeed: number;
    area: number;
    color: string;
}

interface MainPipe {
    id: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
}

interface SubMainPipe {
    id: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    branchPipes: BranchPipe[];
}

interface BranchPipe {
    id: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    plants: any[];
}

interface PlantLocation {
    id: string;
    position: Coordinate;
    plantData: any;
}

interface ExclusionArea {
    id: string;
    type: string;
    coordinates: Coordinate[];
    color: string;
}

const GoogleMapsResultsOverlays: React.FC<{
    map: google.maps.Map | null;
    projectData: HorticultureProjectData;
    mapRotation: number;
    pipeSize: number;
    iconSize: number;
    t: (key: string) => string;
}> = ({ map, projectData, mapRotation, pipeSize, iconSize, t }) => {
    const overlaysRef = useRef<{
        polygons: Map<string, google.maps.Polygon>;
        polylines: Map<string, google.maps.Polyline>;
        markers: Map<string, google.maps.Marker>;
        overlays: Map<string, google.maps.OverlayView>;
    }>({
        polygons: new Map(),
        polylines: new Map(),
        markers: new Map(),
        overlays: new Map(),
    });

    const clearOverlays = useCallback(() => {
        overlaysRef.current.polygons.forEach((polygon) => polygon.setMap(null));
        overlaysRef.current.polylines.forEach((polyline) => polyline.setMap(null));
        overlaysRef.current.markers.forEach((marker) => marker.setMap(null));
        overlaysRef.current.overlays.forEach((overlay) => overlay.setMap(null));

        overlaysRef.current.polygons.clear();
        overlaysRef.current.polylines.clear();
        overlaysRef.current.markers.clear();
        overlaysRef.current.overlays.clear();
    }, []);

    useEffect(() => {
        if (map) {
            const mapDiv = map.getDiv();
            if (mapDiv) {
                mapDiv.style.transform = `rotate(${mapRotation}deg)`;
                mapDiv.style.transformOrigin = 'center center';
            }
        }
    }, [map, mapRotation]);

    useEffect(() => {
        if (!map || !projectData) return;
        clearOverlays();

        if (projectData.mainArea && projectData.mainArea.length > 0) {
            const mainAreaPolygon = new google.maps.Polygon({
                paths: projectData.mainArea.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                fillColor: '#22C55E',
                fillOpacity: 0.1,
                strokeColor: '#22C55E',
                strokeWeight: 2 * pipeSize,
            });
            mainAreaPolygon.setMap(map);
            overlaysRef.current.polygons.set('main-area', mainAreaPolygon);
        }

        projectData.exclusionAreas?.forEach((area) => {
            const exclusionColor =
                EXCLUSION_COLORS[area.type as keyof typeof EXCLUSION_COLORS] ||
                EXCLUSION_COLORS.other;
            const exclusionPolygon = new google.maps.Polygon({
                paths: area.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                fillColor: exclusionColor,
                fillOpacity: 0.4,
                strokeColor: exclusionColor,
                strokeWeight: 2 * pipeSize,
            });
            exclusionPolygon.setMap(map);
            overlaysRef.current.polygons.set(area.id, exclusionPolygon);

            const exclusionLabel = createAreaTextOverlay(
                map,
                area.coordinates,
                getExclusionTypeName(area.type, t),
                exclusionColor
            );
            overlaysRef.current.overlays.set(`exclusion-label-${area.id}`, exclusionLabel);
        });

        projectData.zones?.forEach((zone, index) => {
            const zoneColor = getZoneColor(index);
            const zonePolygon = new google.maps.Polygon({
                paths: zone.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                fillColor: zoneColor,
                fillOpacity: 0.3,
                strokeColor: zoneColor,
                strokeWeight: 3 * pipeSize,
            });
            zonePolygon.setMap(map);
            overlaysRef.current.polygons.set(zone.id, zonePolygon);

            const zoneLabel = createAreaTextOverlay(
                map,
                zone.coordinates,
                `${t('โซน')} ${index + 1}`,
                zoneColor
            );
            overlaysRef.current.overlays.set(`zone-label-${zone.id}`, zoneLabel);
        });

        if (projectData.pump) {
            const pumpMarker = new google.maps.Marker({
                position: {
                    lat: projectData.pump.position.lat,
                    lng: projectData.pump.position.lng,
                },
                map: map,
                icon: {
                    url: '/images/water-pump.png',
                    scaledSize: new google.maps.Size(24 * iconSize, 24 * iconSize),
                    anchor: new google.maps.Point(12 * iconSize, 12 * iconSize),
                },
                title: 'ปั๊มน้ำ',
            });
            overlaysRef.current.markers.set('pump', pumpMarker);
        }

        projectData.mainPipes?.forEach((pipe) => {
            const mainPipePolyline = new google.maps.Polyline({
                path: pipe.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                strokeColor: '#FF0000',
                strokeWeight: 6 * pipeSize,
                strokeOpacity: 0.9,
            });
            mainPipePolyline.setMap(map);
            overlaysRef.current.polylines.set(pipe.id, mainPipePolyline);
        });

        projectData.subMainPipes?.forEach((subMainPipe) => {
            const subMainPolyline = new google.maps.Polyline({
                path: subMainPipe.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                strokeColor: '#8B5CF6',
                strokeWeight: 4 * pipeSize,
                strokeOpacity: 0.9,
            });
            subMainPolyline.setMap(map);
            overlaysRef.current.polylines.set(subMainPipe.id, subMainPolyline);

            subMainPipe.branchPipes?.forEach((branchPipe) => {
                const branchPolyline = new google.maps.Polyline({
                    path: branchPipe.coordinates.map((coord) => ({
                        lat: coord.lat,
                        lng: coord.lng,
                    })),
                    strokeColor: '#FFFF66',
                    strokeWeight: 2 * pipeSize,
                    strokeOpacity: 0.8,
                });
                branchPolyline.setMap(map);
                overlaysRef.current.polylines.set(branchPipe.id, branchPolyline);
            });
        });

        projectData.plants?.forEach((plant) => {
            const plantMarker = new google.maps.Marker({
                position: { lat: plant.position.lat, lng: plant.position.lng },
                map: map,
                icon: {
                    url:
                        'data:image/svg+xml;charset=UTF-8,' +
                        encodeURIComponent(`
                        <svg width="${16 * iconSize}" height="${16 * iconSize}" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <text x="8" y="11" text-anchor="middle" fill="white" font-size="${16 * iconSize}">🌳</text>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(16 * iconSize, 16 * iconSize),
                    anchor: new google.maps.Point(8 * iconSize, 8 * iconSize),
                },
                title: plant.plantData.name,
            });
            overlaysRef.current.markers.set(plant.id, plantMarker);
        });

        const bounds = new google.maps.LatLngBounds();
        projectData.mainArea.forEach((coord) => {
            bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
        });

        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }, [map, projectData, pipeSize, iconSize, clearOverlays]);

    useEffect(() => {
        return () => {
            clearOverlays();
        };
    }, [clearOverlays]);

    return null;
};

function EnhancedHorticultureResultsPageContent() {
    // Defensive usePage call with error handling
    let page;
    let auth;
    try {
        page = usePage();
        auth = (page.props as any).auth;
    } catch (error) {
        console.warn(
            'Inertia context not available in HorticultureResultsPage, using fallback values'
        );
        page = { props: {} };
        auth = null;
    }

    const { t } = useLanguage();
    const [projectData, setProjectData] = useState<HorticultureProjectData | null>(null);
    const [projectSummary, setProjectSummary] = useState<ProjectSummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number]>([13.75, 100.5]);
    const [mapZoom, setMapZoom] = useState<number>(16);

    const [mapRotation, setMapRotation] = useState<number>(0);
    const [isMapLocked, setIsMapLocked] = useState<boolean>(false);
    const [pipeSize, setPipeSize] = useState<number>(1);
    const [iconSize, setIconSize] = useState<number>(1);

    const [isCreatingImage, setIsCreatingImage] = useState(false);
    const [isCreatingPDF, setIsCreatingPDF] = useState(false);
    const [isCreatingExport, setIsCreatingExport] = useState(false);

    const [savingToDatabase, setSavingToDatabase] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const mapRef = useRef<google.maps.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const data = loadProjectData();
            if (data) {
                setProjectData(data);
                const summary = calculateProjectSummary(data);
                setProjectSummary(summary);

                if (data.mainArea && data.mainArea.length > 0) {
                    const centerLat =
                        data.mainArea.reduce((sum, point) => sum + point.lat, 0) /
                        data.mainArea.length;
                    const centerLng =
                        data.mainArea.reduce((sum, point) => sum + point.lng, 0) /
                        data.mainArea.length;
                    setMapCenter([centerLat, centerLng]);

                    const latitudes = data.mainArea.map((p) => p.lat);
                    const longitudes = data.mainArea.map((p) => p.lng);
                    const maxLat = Math.max(...latitudes);
                    const minLat = Math.min(...latitudes);
                    const maxLng = Math.max(...longitudes);
                    const minLng = Math.min(...longitudes);
                    const latDiff = maxLat - minLat;
                    const lngDiff = maxLng - minLng;
                    const maxDiff = Math.max(latDiff, lngDiff);

                    let initialZoom;
                    if (maxDiff < 0.001) initialZoom = 20;
                    else if (maxDiff < 0.002) initialZoom = 19;
                    else if (maxDiff < 0.005) initialZoom = 18;
                    else if (maxDiff < 0.01) initialZoom = 17;
                    else if (maxDiff < 0.02) initialZoom = 16;
                    else initialZoom = 15;

                    setMapZoom(initialZoom);
                }
            } else {
                console.warn('❌ No project data found, redirecting to planner');
                navigateToPlanner();
            }
        } catch (error) {
            console.error('❌ Error loading project data:', error);
            navigateToPlanner();
        }
        setLoading(false);
    }, []);

    const handleRotationChange = (newRotation: number) => {
        setMapRotation(newRotation);
    };

    const resetMapRotation = () => {
        setMapRotation(0);
    };

    const toggleMapLock = () => {
        setIsMapLocked(!isMapLocked);
        if (mapRef.current) {
            if (!isMapLocked) {
                mapRef.current.setOptions({
                    draggable: false,
                    zoomControl: false,
                    scrollwheel: false,
                    disableDoubleClickZoom: true,
                });
            } else {
                mapRef.current.setOptions({
                    draggable: true,
                    zoomControl: true,
                    scrollwheel: true,
                    disableDoubleClickZoom: false,
                });
            }
        }
    };

    const handlePipeSizeChange = (newSize: number) => {
        setPipeSize(Math.max(0.5, Math.min(3, newSize)));
    };

    const handleIconSizeChange = (newSize: number) => {
        setIconSize(Math.max(0.5, Math.min(3, newSize)));
    };

    const resetSizes = () => {
        setPipeSize(1);
        setIconSize(1);
    };

    const handleNewProject = () => {
        router.visit('/horticulture/planner');
    };

    const handleEditProject = () => {
        // ตั้งค่า flag บอกว่ากำลังแก้ไขโครงการเดิม
        if (!safeLocalStorageSet('isEditingExistingProject', 'true')) {
            console.error('❌ Failed to save isEditingExistingProject flag');
        }

        // ตรวจสอบว่าข้อมูลโครงการยังอยู่ใน localStorage หรือไม่
        const existingData = localStorage.getItem('horticultureIrrigationData');
        if (!existingData && projectData) {
            // หากไม่มีข้อมูลใน localStorage แต่มี projectData ให้บันทึกกลับ
            if (!safeLocalStorageSet('horticultureIrrigationData', JSON.stringify(projectData))) {
                console.error('❌ Failed to save projectData to localStorage');
            }
        }

        router.visit('/horticulture/planner');
    };

    const handleMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        setMapLoaded(true);
    }, []);

    const handleManualCleanup = () => {
        if (cleanupLocalStorage()) {
            alert(t('localStorage_cleanup_success') || 'ล้างข้อมูล localStorage สำเร็จ!');
        } else {
            alert(t('localStorage_cleanup_failed') || 'ล้างข้อมูล localStorage ล้มเหลว!');
        }
    };

    const handleExportMapToProduct = async () => {
        if (!mapContainerRef.current) {
            alert(t('ไม่พบแผนที่'));
            return;
        }
        setIsCreatingImage(true);
        try {
            const currentRotation = mapRotation;
            if (currentRotation !== 0) {
                setMapRotation(0);
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));

            const html2canvas = await import('html2canvas');
            const html2canvasLib = html2canvas.default || html2canvas;

            const canvas = await html2canvasLib(mapContainerRef.current, {
                useCORS: true,
                allowTaint: true,
                scale: 2,
                logging: false,
                backgroundColor: '#1F2937',
                width: mapContainerRef.current.offsetWidth,
                height: mapContainerRef.current.offsetHeight,
                onclone: (clonedDoc) => {
                    try {
                        const controls = clonedDoc.querySelectorAll(
                            '.leaflet-control-container, .gm-control-active'
                        );
                        controls.forEach((el) => el.remove());

                        const elements = clonedDoc.querySelectorAll('*');
                        elements.forEach((el: Element) => {
                            const htmlEl = el as HTMLElement;
                            const computedStyle = window.getComputedStyle(htmlEl);

                            const color = computedStyle.color;
                            if (color && (color.includes('oklch') || color.includes('hsl'))) {
                                htmlEl.style.color = '#FFFFFF';
                            }

                            const backgroundColor = computedStyle.backgroundColor;
                            if (
                                backgroundColor &&
                                (backgroundColor.includes('oklch') ||
                                    backgroundColor.includes('hsl'))
                            ) {
                                if (
                                    backgroundColor.includes('transparent') ||
                                    backgroundColor.includes('rgba(0,0,0,0)')
                                ) {
                                    htmlEl.style.backgroundColor = 'transparent';
                                } else {
                                    htmlEl.style.backgroundColor = '#1F2937';
                                }
                            }

                            const borderColor = computedStyle.borderColor;
                            if (
                                borderColor &&
                                (borderColor.includes('oklch') || borderColor.includes('hsl'))
                            ) {
                                htmlEl.style.borderColor = '#374151';
                            }

                            const outlineColor = computedStyle.outlineColor;
                            if (
                                outlineColor &&
                                (outlineColor.includes('oklch') || outlineColor.includes('hsl'))
                            ) {
                                htmlEl.style.outlineColor = '#374151';
                            }
                        });

                        const problematicElements = clonedDoc.querySelectorAll(
                            '[style*="oklch"], [style*="hsl"]'
                        );
                        problematicElements.forEach((el) => {
                            const htmlEl = el as HTMLElement;
                            htmlEl.style.removeProperty('color');
                            htmlEl.style.removeProperty('background-color');
                            htmlEl.style.removeProperty('border-color');
                            htmlEl.style.removeProperty('outline-color');
                        });
                    } catch (error) {
                        console.warn('⚠️ คำเตือนใน onclone:', error);
                    }
                },
            });

            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

            if (currentRotation !== 0) {
                setMapRotation(currentRotation);
            }

            if (dataUrl && dataUrl !== 'data:,' && dataUrl.length > 100) {
                // Get current field ID from localStorage
                const currentFieldId = localStorage.getItem('currentFieldId');
                
                if (currentFieldId && !currentFieldId.startsWith('mock-')) {
                    // Save complete project data and image to database
                    try {
                        console.log('🔄 Saving complete project data to database...');
                        
                        // Prepare complete project data
                        const completeProjectData = {
                            status: 'finished',
                            is_completed: true,
                            project_data: projectData,
                            project_stats: projectSummary,
                            project_mode: 'horticulture',
                            show_pump_option: true,
                            last_saved: new Date().toISOString(),
                            project_image: dataUrl,
                            project_image_type: 'image/png',
                        };
                        
                        // Save complete project data
                        const dataResponse = await axios.put(`/api/fields/${currentFieldId}/data`, completeProjectData);
                        
                        if (dataResponse.data.success) {
                            console.log('✅ Complete project data saved to database successfully');
                            
                            // Save project data to localStorage for product page compatibility
                            if (!safeLocalStorageSet('horticultureIrrigationData', JSON.stringify(projectData))) {
                                console.warn('⚠️ Failed to save horticultureIrrigationData to localStorage, but data is saved to database');
                            }
                            
                            // Still save project type to localStorage for product page
                            if (!safeLocalStorageSet('projectType', 'horticulture')) {
                                console.warn('⚠️ Failed to save projectType to localStorage, but data is saved to database');
                            }
                            
                            router.visit('/product');
                        } else {
                            throw new Error('Database save failed: ' + dataResponse.data.message);
                        }
                    } catch (error) {
                        console.error('❌ Failed to save complete project data to database:', error);
                        // Fallback to localStorage if database fails
                        if (!safeLocalStorageSet('projectMapImage', dataUrl)) {
                            throw new Error('ไม่สามารถบันทึกภาพแผนที่ได้ - ทั้ง database และ localStorage ล้มเหลว');
                        }
                        if (!safeLocalStorageSet('horticultureIrrigationData', JSON.stringify(projectData))) {
                            throw new Error('ไม่สามารถบันทึกข้อมูลโครงการได้ - localStorage เต็ม');
                        }
                        if (!safeLocalStorageSet('projectType', 'horticulture')) {
                            throw new Error('ไม่สามารถบันทึกประเภทโครงการได้ - localStorage เต็ม');
                        }
                        router.visit('/product');
                    }
                } else {
                    // Fallback to localStorage for mock fields or when no field ID
                    if (!safeLocalStorageSet('projectMapImage', dataUrl)) {
                        throw new Error('ไม่สามารถบันทึกภาพแผนที่ได้ - localStorage เต็ม');
                    }
                    if (!safeLocalStorageSet('horticultureIrrigationData', JSON.stringify(projectData))) {
                        throw new Error('ไม่สามารถบันทึกข้อมูลโครงการได้ - localStorage เต็ม');
                    }
                    if (!safeLocalStorageSet('projectType', 'horticulture')) {
                        throw new Error('ไม่สามารถบันทึกประเภทโครงการได้ - localStorage เต็ม');
                    }
                    router.visit('/product');
                }
            } else {
                throw new Error('ไม่สามารถสร้างภาพแผนที่ได้');
            }
        } catch (error) {
            console.error('❌ Error creating map image:', error);
            alert(
                '❌ เกิดข้อผิดพลาดในการสร้างภาพแผนผัง\n\nกรุณาใช้วิธี Screenshot แทน:\n\n1. กด F11 เพื่อ Fullscreen\n2. กด Print Screen หรือใช้ Snipping Tool\n3. หรือใช้ Extension "Full Page Screen Capture"'
            );
        } finally {
            setIsCreatingImage(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-32 w-32 animate-spin rounded-full border-b-2 border-white"></div>
                    <p className="text-xl">{t('กำลังโหลดข้อมูลโครงการ...')}</p>
                </div>
            </div>
        );
    }

    if (!projectData || !projectSummary) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="mb-4 text-2xl font-bold">{t('ไม่พบข้อมูลโครงการ')}</h1>
                    <button
                        onClick={handleNewProject}
                        className="rounded-lg bg-blue-600 px-6 py-3 transition-colors hover:bg-blue-700"
                    >
                        {t('กลับไปสร้างโครงการใหม่')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />
            <div className="p-4">
                <div className="mx-auto w-full">
                    {/* Header */}
                    <div className="mx-4 mb-4 flex justify-between text-left">
                        <div className="my-4 flex justify-start">
                            <h1 className="mb-2 text-2xl font-bold text-green-400">
                                {t('รายงานการออกแบบระบบน้ำพืชสวน')}
                            </h1>
                            <h2 className="text-xl text-gray-300">{projectData.projectName}</h2>
                        </div>
                        {/* Action Buttons */}
                        <div className="my-4 flex justify-end gap-4">
                            <button
                                onClick={handleNewProject}
                                className="rounded-lg bg-green-600 px-6 py-3 font-semibold transition-colors hover:bg-green-700"
                            >
                                ➕ {t('โครงการใหม่')}
                            </button>
                            <button
                                onClick={handleEditProject}
                                className="rounded-lg bg-orange-600 px-6 py-3 font-semibold transition-colors hover:bg-orange-700"
                            >
                                ✏️ {t('แก้ไขโครงการ')}
                            </button>
                            <button
                                onClick={handleManualCleanup}
                                className="rounded-lg bg-yellow-600 px-6 py-3 font-semibold transition-colors hover:bg-yellow-700"
                                title={t('ล้างข้อมูล localStorage เมื่อเกิดข้อผิดพลาด') || 'ล้างข้อมูล localStorage เมื่อเกิดข้อผิดพลาด'}
                            >
                                🗑️ {t('ล้างข้อมูล') || 'ล้างข้อมูล'}
                            </button>
                            <button
                                onClick={handleExportMapToProduct}
                                disabled={isCreatingImage}
                                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isCreatingImage ? (
                                    <>
                                        <svg
                                            className="mr-2 inline h-4 w-4 animate-spin"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        {t('กำลังส่งออก...')}
                                    </>
                                ) : (
                                    t('คำนวณระบบน้ำ')
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        <div className="rounded-lg bg-gray-800 p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xl font-semibold">🗺️ {t('แผนผังโครงการ')}</h3>
                            </div>

                            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <div className="rounded-lg bg-gray-700 p-4">
                                    <h4 className="mb-3 text-sm font-semibold text-blue-300">
                                        🔄 {t('การหมุนแผนที่')}
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <label className="w-16 text-xs text-gray-300">
                                                {t('หมุน')}:
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="360"
                                                step="1"
                                                value={mapRotation}
                                                onChange={(e) =>
                                                    handleRotationChange(parseInt(e.target.value))
                                                }
                                                className="flex-1 accent-blue-600"
                                            />
                                            <span className="w-12 text-xs text-blue-300">
                                                {mapRotation}°
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() =>
                                                    handleRotationChange(mapRotation - 15)
                                                }
                                                className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700"
                                            >
                                                ↺ -15°
                                            </button>
                                            <button
                                                onClick={resetMapRotation}
                                                className="flex-1 rounded bg-gray-600 px-2 py-1 text-xs hover:bg-gray-700"
                                            >
                                                🔄 {t('รีเซ็ต')}
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleRotationChange(mapRotation + 15)
                                                }
                                                className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700"
                                            >
                                                ↻ +15°
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isMapLocked}
                                                onChange={toggleMapLock}
                                                className="accent-purple-600"
                                            />
                                            <label className="text-xs text-gray-300">
                                                🔒 {t('ล็อกการซูมและลาก')}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg bg-gray-700 p-4">
                                    <h4 className="mb-3 text-sm font-semibold text-green-300">
                                        📏 {t('ขนาดไอคอน')}
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <label className="w-16 text-xs text-gray-300">
                                                {t('ท่อ')}:
                                            </label>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="3"
                                                step="0.1"
                                                value={pipeSize}
                                                onChange={(e) =>
                                                    handlePipeSizeChange(parseFloat(e.target.value))
                                                }
                                                className="flex-1 accent-green-600"
                                            />
                                            <span className="w-12 text-xs text-green-300">
                                                {pipeSize.toFixed(1)}x
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="w-16 text-xs text-gray-300">
                                                {t('ไอคอน')}:
                                            </label>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="3"
                                                step="0.1"
                                                value={iconSize}
                                                onChange={(e) =>
                                                    handleIconSizeChange(parseFloat(e.target.value))
                                                }
                                                className="flex-1 accent-yellow-600"
                                            />
                                            <span className="w-12 text-xs text-yellow-300">
                                                {iconSize.toFixed(1)}x
                                            </span>
                                        </div>
                                        <button
                                            onClick={resetSizes}
                                            className="w-full rounded bg-gray-600 px-3 py-1 text-xs hover:bg-gray-700"
                                        >
                                            🔄 {t('รีเซ็ตขนาด')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div
                                ref={mapContainerRef}
                                className="mb-4 h-[500px] w-full overflow-hidden rounded-lg border border-gray-600"
                                style={{ backgroundColor: 'rgb(31, 41, 55)' }}
                            >
                                <HorticultureMapComponent
                                    center={mapCenter}
                                    zoom={mapZoom}
                                    onMapLoad={handleMapLoad}
                                    mapOptions={{
                                        zoomControl: false,
                                        fullscreenControl: false,
                                        mapTypeControl: false,
                                        streetViewControl: false,
                                        clickableIcons: false,
                                        scrollwheel: false,
                                        disableDoubleClickZoom: false,
                                        gestureHandling: 'none',
                                    }}
                                >
                                    {mapLoaded && (
                                        <GoogleMapsResultsOverlays
                                            map={mapRef.current}
                                            projectData={projectData}
                                            mapRotation={mapRotation}
                                            pipeSize={pipeSize}
                                            iconSize={iconSize}
                                            t={t}
                                        />
                                    )}
                                </HorticultureMapComponent>
                            </div>

                            <div className="rounded-lg bg-gray-700 p-4">
                                <h4 className="mb-3 text-sm font-semibold">
                                    🎨 {t('คำอธิบายสัญลักษณ์')}
                                </h4>
                                <div className="space-y-3">
                                    {/* ท่อ */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-1 w-4"
                                                style={{
                                                    backgroundColor: '#FF0000',
                                                    height: `${2 * pipeSize}px`,
                                                }}
                                            ></div>
                                            <span>{t('ท่อเมนหลัก')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-1 w-4"
                                                style={{
                                                    backgroundColor: '#8B5CF6',
                                                    height: `${1.5 * pipeSize}px`,
                                                }}
                                            ></div>
                                            <span>{t('ท่อเมนรอง')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-1 w-4"
                                                style={{
                                                    backgroundColor: '#FCD34D',
                                                    height: `${1 * pipeSize}px`,
                                                }}
                                            ></div>
                                            <span>{t('ท่อย่อย')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <img
                                                src="/images/water-pump.png"
                                                alt={t('ปั๊มน้ำ')}
                                                style={{
                                                    width: `${18 * iconSize}px`,
                                                    height: `${18 * iconSize}px`,
                                                }}
                                            />
                                            <span>{t('ปั๊มน้ำ')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 bg-green-500 opacity-50"></div>
                                            <span>{t('พื้นที่หลัก')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-1 w-4"
                                                style={{
                                                    backgroundColor: '#FCD34D',
                                                    height: `${1 * pipeSize}px`,
                                                }}
                                            ></div>
                                            <span>{t('ท่อย่อย')}</span>
                                        </div>
                                    </div>

                                    {/* โซน */}
                                    {projectData?.zones && projectData.zones.length > 0 && (
                                        <div>
                                            <div className="mb-2 text-xs font-semibold text-gray-300">
                                                {t('โซน')}:
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 text-xs">
                                                {projectData.zones.map((zone, index) => (
                                                    <div
                                                        key={zone.id}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <div
                                                            className="h-3 w-3 opacity-70"
                                                            style={{
                                                                backgroundColor:
                                                                    getZoneColor(index),
                                                            }}
                                                        ></div>
                                                        <span>
                                                            {t('โซน')} {index + 1}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* พื้นที่หลีกเลี่ยง */}
                                    {projectData?.exclusionAreas &&
                                        projectData.exclusionAreas.length > 0 && (
                                            <div>
                                                <div className="mb-2 text-xs font-semibold text-gray-300">
                                                    {t('พื้นที่หลีกเลี่ยง')}:
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 text-xs">
                                                    {projectData.exclusionAreas.map((area) => {
                                                        const exclusionColor =
                                                            EXCLUSION_COLORS[
                                                                area.type as keyof typeof EXCLUSION_COLORS
                                                            ] || EXCLUSION_COLORS.other;
                                                        return (
                                                            <div
                                                                key={area.id}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <div
                                                                    className="h-3 w-3 opacity-70"
                                                                    style={{
                                                                        backgroundColor:
                                                                            exclusionColor,
                                                                    }}
                                                                ></div>
                                                                <span>
                                                                    {getExclusionTypeName(
                                                                        area.type,
                                                                        t
                                                                    )}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                </div>
                            </div>
                            {/* ส่วนแสดงผลข้อมูลข้อต่อท่อ */}
                            <div className="mt-4 rounded-lg bg-gray-800">
                                <h3 className="mb-4 text-xl font-semibold text-orange-400">
                                    🔧 {t('ข้อต่อท่อ')}
                                </h3>

                                {(() => {
                                    const connectorSummary = calculatePipeConnectors(projectData);
                                    return (
                                        <>
                                            {/* สรุปยอดรวม */}
                                            <div className="mb-6 rounded bg-gray-700 p-4">
                                                <h4 className="mb-3 text-lg font-semibold text-orange-300">
                                                    📊 {t('สรุปยอดรวม')}
                                                </h4>
                                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                                    <div className="rounded bg-gray-600 p-3 text-center">
                                                        <div className="text-sm text-gray-400">
                                                            {t('ข้อต่อ 2 ทาง')}
                                                        </div>
                                                        <div className="text-xl font-bold text-blue-400">
                                                            {connectorSummary.twoWay}
                                                        </div>
                                                    </div>
                                                    <div className="rounded bg-gray-600 p-3 text-center">
                                                        <div className="text-sm text-gray-400">
                                                            {t('ข้อต่อ 3 ทาง')}
                                                        </div>
                                                        <div className="text-xl font-bold text-green-400">
                                                            {connectorSummary.threeWay}
                                                        </div>
                                                    </div>
                                                    <div className="rounded bg-gray-600 p-3 text-center">
                                                        <div className="text-sm text-gray-400">
                                                            {t('ข้อต่อ 4 ทาง')}
                                                        </div>
                                                        <div className="text-xl font-bold text-purple-400">
                                                            {connectorSummary.fourWay}
                                                        </div>
                                                    </div>
                                                    <div className="rounded bg-orange-600 p-3 text-center">
                                                        <div className="text-sm text-white">
                                                            {t('รวมทั้งหมด')}
                                                        </div>
                                                        <div className="text-xl font-bold text-white">
                                                            {connectorSummary.total}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* รายละเอียดแยกตามประเภท */}
                                            <div className="space-y-4">
                                                {/* ท่อเมนหลัก */}
                                                <div className="rounded bg-gray-700 p-4">
                                                    <h4 className="mb-3 font-semibold text-blue-300">
                                                        🔵 {t('ท่อเมนหลัก')}
                                                    </h4>
                                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                                        <div className="rounded bg-blue-900/30 p-2 text-center">
                                                            <div className="text-blue-300">
                                                                {t('2 ทาง')}
                                                            </div>
                                                            <div className="font-bold text-blue-400">
                                                                {
                                                                    connectorSummary.details
                                                                        .mainPipes.twoWay
                                                                }
                                                            </div>
                                                        </div>
                                                        <div className="rounded bg-blue-900/30 p-2 text-center">
                                                            <div className="text-blue-300">
                                                                {t('3 ทาง')}
                                                            </div>
                                                            <div className="font-bold text-blue-400">
                                                                {
                                                                    connectorSummary.details
                                                                        .mainPipes.threeWay
                                                                }
                                                            </div>
                                                        </div>
                                                        <div className="rounded bg-blue-900/30 p-2 text-center">
                                                            <div className="text-blue-300">
                                                                {t('4 ทาง')}
                                                            </div>
                                                            <div className="font-bold text-blue-400">
                                                                {
                                                                    connectorSummary.details
                                                                        .mainPipes.fourWay
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ท่อเมนรอง */}
                                                <div className="rounded bg-gray-700 p-4">
                                                    <h4 className="mb-3 font-semibold text-purple-300">
                                                        🟣 {t('ท่อเมนรอง')}
                                                    </h4>
                                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                                        <div className="rounded bg-purple-900/30 p-2 text-center">
                                                            <div className="text-purple-300">
                                                                {t('2 ทาง')}
                                                            </div>
                                                            <div className="font-bold text-purple-400">
                                                                {
                                                                    connectorSummary.details
                                                                        .subMainPipes.twoWay
                                                                }
                                                            </div>
                                                        </div>
                                                        <div className="rounded bg-purple-900/30 p-2 text-center">
                                                            <div className="text-purple-300">
                                                                {t('3 ทาง')}
                                                            </div>
                                                            <div className="font-bold text-purple-400">
                                                                {
                                                                    connectorSummary.details
                                                                        .subMainPipes.threeWay
                                                                }
                                                            </div>
                                                        </div>
                                                        <div className="rounded bg-purple-900/30 p-2 text-center">
                                                            <div className="text-purple-300">
                                                                {t('4 ทาง')}
                                                            </div>
                                                            <div className="font-bold text-purple-400">
                                                                {
                                                                    connectorSummary.details
                                                                        .subMainPipes.fourWay
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ท่อย่อย */}
                                                <div className="rounded bg-gray-700 p-4">
                                                    <h4 className="mb-3 font-semibold text-yellow-300">
                                                        🟡 {t('ท่อย่อย')}
                                                    </h4>
                                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                                        <div className="rounded bg-yellow-900/30 p-2 text-center">
                                                            <div className="text-yellow-300">
                                                                {t('2 ทาง')}
                                                            </div>
                                                            <div className="font-bold text-yellow-400">
                                                                {
                                                                    connectorSummary.details.plants
                                                                        .twoWay
                                                                }
                                                            </div>
                                                        </div>
                                                        <div className="rounded bg-yellow-900/30 p-2 text-center">
                                                            <div className="text-yellow-300">
                                                                {t('3 ทาง')}
                                                            </div>
                                                            <div className="font-bold text-yellow-400">
                                                                {
                                                                    connectorSummary.details.plants
                                                                        .threeWay
                                                                }
                                                            </div>
                                                        </div>
                                                        <div className="rounded bg-yellow-900/30 p-2 text-center">
                                                            <div className="text-yellow-300">
                                                                {t('4 ทาง')}
                                                            </div>
                                                            <div className="font-bold text-yellow-400">
                                                                {
                                                                    connectorSummary.details.plants
                                                                        .fourWay
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="rounded-lg bg-gray-800 p-6">
                                <h3 className="mb-4 text-xl font-semibold text-green-400">
                                    📊 {t('ข้อมูลโดยรวม')}
                                </h3>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                                    <div className="rounded bg-gray-700 p-3">
                                        <div className="text-gray-400">
                                            {t('พื้นที่รวมทั้งหมด')}
                                        </div>
                                        <div className="text-lg font-bold text-green-400">
                                            {formatAreaInRai(projectSummary.totalAreaInRai)}
                                        </div>
                                    </div>
                                    <div className="rounded bg-gray-700 p-3">
                                        <div className="text-gray-400">{t('จำนวนโซน')}</div>
                                        <div className="text-lg font-bold text-blue-400">
                                            {projectSummary.totalZones} โซน
                                        </div>
                                    </div>
                                    <div className="rounded bg-gray-700 p-3">
                                        <div className="text-gray-400">
                                            {t('จำนวนต้นไม้ทั้งหมด')}
                                        </div>
                                        <div className="text-lg font-bold text-yellow-400">
                                            {projectSummary.totalPlants.toLocaleString()} ต้น
                                        </div>
                                    </div>
                                    <div className="rounded bg-gray-700 p-3">
                                        <div className="text-gray-400">
                                            {t('ปริมาณน้ำต่อครั้ง')}
                                        </div>
                                        <div className="text-lg font-bold text-cyan-400">
                                            {formatWaterVolume(
                                                projectSummary.totalWaterNeedPerSession
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg bg-gray-800 p-6">
                                <h3 className="mb-4 text-xl font-semibold text-blue-400">
                                    🔧 {t('ระบบท่อ')}
                                </h3>

                                <div className="mb-4 rounded bg-gray-700 p-4">
                                    <h4 className="mb-2 font-semibold text-blue-300">
                                        🔵 {t('ท่อเมน')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-400">
                                                {t('ท่อเมนที่ยาวที่สุด')}:
                                            </span>
                                            <div className="font-bold text-blue-400">
                                                {formatDistance(projectSummary.mainPipes.longest)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">
                                                {t('ท่อเมนยาวรวม')}:
                                            </span>
                                            <div className="font-bold text-blue-400">
                                                {formatDistance(
                                                    projectSummary.mainPipes.totalLength
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4 rounded bg-gray-700 p-4">
                                    <h4 className="mb-2 font-semibold text-purple-300">
                                        🟣 {t('ท่อเมนรอง')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-400">
                                                {t('ท่อเมนรองที่ยาวที่สุด')}:
                                            </span>
                                            <div className="font-bold text-purple-400">
                                                {formatDistance(
                                                    projectSummary.subMainPipes.longest
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">
                                                {t('ท่อเมนรองยาวรวม')}:
                                            </span>
                                            <div className="font-bold text-purple-400">
                                                {formatDistance(
                                                    projectSummary.subMainPipes.totalLength
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4 rounded bg-gray-700 p-4">
                                    <h4 className="mb-2 font-semibold text-yellow-300">
                                        🟡 {t('ท่อย่อย')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-400">
                                                {t('ท่อย่อยที่ยาวที่สุด')}:
                                            </span>
                                            <div className="font-bold text-yellow-400">
                                                {formatDistance(projectSummary.branchPipes.longest)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">
                                                {t('ท่อย่อยยาวรวม')}:
                                            </span>
                                            <div className="font-bold text-yellow-400">
                                                {formatDistance(
                                                    projectSummary.branchPipes.totalLength
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded bg-yellow-900/30 p-4">
                                    <h4 className="mb-2 font-semibold text-yellow-300">
                                        📏 {t('ท่อที่ยาวที่สุดรวมกัน')}
                                    </h4>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-yellow-400">
                                            {formatDistance(projectSummary.longestPipesCombined)}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            ({t('ท่อเมน')} + {t('ท่อเมนรอง')} +{' '}
                                            {t('ท่อย่อยที่ยาวที่สุด')})
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {projectSummary.zoneDetails.length > 0 && (
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h3 className="mb-4 text-xl font-semibold text-green-400">
                                        🏞️ {t('รายละเอียดแต่ละโซน')}
                                    </h3>
                                    <div className="space-y-4">
                                        {projectSummary.zoneDetails.map((zone, index) => {
                                            const plantInfo = zone.plantData || null;
                                            const plantName = plantInfo?.name || 'ไม่ระบุ';
                                            const waterPerPlant = zone.waterPerPlant || 0;
                                            const plantSpacing = plantInfo?.plantSpacing || 0;
                                            const rowSpacing = plantInfo?.rowSpacing || 0;

                                            const zoneColor = projectData.useZones
                                                ? projectData.zones.find(
                                                      (z) => z.id === zone.zoneId
                                                  )?.color
                                                : null;

                                            return (
                                                <div
                                                    key={zone.zoneId}
                                                    className="rounded bg-gray-700 p-4"
                                                >
                                                    <div className="mb-3 flex items-center justify-between">
                                                        <h4 className="font-semibold text-green-300">
                                                            {zone.zoneName}
                                                        </h4>
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-2 text-xs">
                                                                <span className="text-gray-400">
                                                                    {t('ระยะปลูก')}:
                                                                </span>
                                                                <span className="ml-2 text-white">
                                                                    {plantSpacing} × {rowSpacing}{' '}
                                                                    {t('เมตร')}
                                                                </span>
                                                            </div>
                                                            <span className="text-sm text-gray-400">
                                                                🌱 {plantName}
                                                            </span>
                                                            {zoneColor && (
                                                                <div
                                                                    className="h-4 w-4 rounded"
                                                                    style={{
                                                                        backgroundColor: zoneColor,
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="mb-3 grid grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-gray-400">
                                                                {t('พื้นที่โซน')}:
                                                            </span>
                                                            <div className="font-bold text-green-400">
                                                                {formatAreaInRai(zone.areaInRai)}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">
                                                                {t('จำนวนต้นไม้')}:
                                                            </span>
                                                            <div className="font-bold text-yellow-400">
                                                                {zone.plantCount.toLocaleString()}{' '}
                                                                {t('ต้น')}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">
                                                                {t('น้ำต่อต้นต่อครั้ง')}:
                                                            </span>
                                                            <div className="font-bold text-blue-400">
                                                                {waterPerPlant} {t('ลิตร/ต้น')}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">
                                                                {t('ปริมาณน้ำรวมต่อครั้ง')}:
                                                            </span>
                                                            <div className="font-bold text-cyan-400">
                                                                {formatWaterVolume(
                                                                    zone.waterNeedPerSession
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 text-xs">
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="rounded bg-blue-900/30 p-2">
                                                                <div className="text-blue-300">
                                                                    {t('ท่อเมนในโซน')}
                                                                </div>
                                                                <div>
                                                                    {t('ยาวที่สุด')}:{' '}
                                                                    {formatDistance(
                                                                        zone.mainPipesInZone.longest
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    {t('รวม')}:{' '}
                                                                    {formatDistance(
                                                                        zone.mainPipesInZone
                                                                            .totalLength
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="rounded bg-purple-900/30 p-2">
                                                                <div className="text-purple-300">
                                                                    {t('ท่อเมนรองในโซน')}
                                                                </div>
                                                                <div>
                                                                    {t('ยาวที่สุด')}:{' '}
                                                                    {formatDistance(
                                                                        zone.subMainPipesInZone
                                                                            .longest
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    {t('รวม')}:{' '}
                                                                    {formatDistance(
                                                                        zone.subMainPipesInZone
                                                                            .totalLength
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="rounded bg-yellow-900/30 p-2">
                                                                <div className="text-yellow-300">
                                                                    {t('ท่อย่อยในโซน')}
                                                                </div>
                                                                <div>
                                                                    {t('ยาวที่สุด')}:{' '}
                                                                    {formatDistance(
                                                                        zone.branchPipesInZone
                                                                            .longest
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    {t('รวม')}:{' '}
                                                                    {formatDistance(
                                                                        zone.branchPipesInZone
                                                                            .totalLength
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 rounded bg-blue-900/20 p-2 text-xs">
                                                        <div className="text-blue-300">
                                                            {t('สรุปการคำนวณ')}:
                                                        </div>
                                                        <div className="mt-1 text-gray-300">
                                                            {zone.plantCount.toLocaleString()}{' '}
                                                            {t('ต้น')} × {waterPerPlant}{' '}
                                                            {t('ลิตร/ต้น')} ={' '}
                                                            {formatWaterVolume(
                                                                zone.waterNeedPerSession
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}

export default EnhancedHorticultureResultsPageContent;
