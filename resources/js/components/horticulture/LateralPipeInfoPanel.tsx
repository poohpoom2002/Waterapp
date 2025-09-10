/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { 
    FaWater, 
    FaTree, 
    FaRulerCombined,
    FaInfoCircle,
    FaCheck,
    FaTimes,
    FaTint,
    FaClock
} from 'react-icons/fa';
import { loadSprinklerConfig } from '../../utils/sprinklerUtils';

interface Coordinate {
    lat: number;
    lng: number;
}

interface PlantLocation {
    id: string;
    position: Coordinate;
    plantData: {
        id: number;
        name: string;
        plantSpacing: number;
        rowSpacing: number;
        waterNeed: number;
    };
}

interface LateralPipeInfoPanelProps {
    isVisible: boolean;
    placementMode: 'over_plants' | 'between_plants' | null;
    selectedPlants: PlantLocation[];
    totalWaterNeed: number;
    plantCount: number;
    startPoint: Coordinate | null;
    currentPoint: Coordinate | null;
    snappedStartPoint?: Coordinate | null; // เพิ่มสำหรับคำนวณความยาวท่อสีเขียว
    alignedCurrentPoint?: Coordinate | null; // เพิ่มสำหรับคำนวณความยาวท่อสีเขียว
    // 🚀 เพิ่มสำหรับ multi-segment
    waypoints?: Coordinate[];
    isMultiSegmentMode?: boolean;
    segmentCount?: number;
    onCancel: () => void;
    onConfirm: () => void;
    t: (key: string) => string;
}

const LateralPipeInfoPanel: React.FC<LateralPipeInfoPanelProps> = ({
    isVisible,
    placementMode,
    selectedPlants,
    totalWaterNeed,
    plantCount,
    startPoint,
    currentPoint,
    snappedStartPoint,
    alignedCurrentPoint,
    // 🚀 เพิ่มสำหรับ multi-segment
    waypoints = [],
    isMultiSegmentMode = false,
    segmentCount = 1,
    onCancel,
    onConfirm,
    t
}) => {
    if (!isVisible) return null;

    const calculateLength = (): number => {
        // 🚀 รองรับ multi-segment calculation
        if (isMultiSegmentMode && waypoints.length > 0) {
            // Multi-segment: คำนวณความยาวรวมทุกส่วน
            const effectiveStartPoint = snappedStartPoint || startPoint;
            const effectiveEndPoint = alignedCurrentPoint || currentPoint;
            
            if (!effectiveStartPoint || !effectiveEndPoint) return 0;
            
            const allPoints = [effectiveStartPoint, ...waypoints, effectiveEndPoint];
            let totalLength = 0;
            
            for (let i = 0; i < allPoints.length - 1; i++) {
                const segmentStart = allPoints[i];
                const segmentEnd = allPoints[i + 1];
                
                const R = 6371000; // รัศมีโลกเป็นเมตร
                const dLat = (segmentEnd.lat - segmentStart.lat) * Math.PI / 180;
                const dLng = (segmentEnd.lng - segmentStart.lng) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(segmentStart.lat * Math.PI / 180) * Math.cos(segmentEnd.lat * Math.PI / 180) * 
                        Math.sin(dLng/2) * Math.sin(dLng/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                totalLength += R * c;
            }
            
            return totalLength;
        } else {
            // Single-segment (เดิม)
            const effectiveStartPoint = snappedStartPoint || startPoint;
            const effectiveEndPoint = alignedCurrentPoint || currentPoint;
            
            if (!effectiveStartPoint || !effectiveEndPoint) return 0;
            
            const R = 6371000; // Earth's radius in meters
            const dLat = (effectiveEndPoint.lat - effectiveStartPoint.lat) * Math.PI / 180;
            const dLng = (effectiveEndPoint.lng - effectiveStartPoint.lng) * Math.PI / 180;
            const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(effectiveStartPoint.lat * Math.PI / 180) * Math.cos(effectiveEndPoint.lat * Math.PI / 180) * 
                Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        }
    };

    const length = calculateLength();
    
    // ดึงข้อมูลหัวฉีด
    const sprinklerConfig = loadSprinklerConfig();
    const flowRatePerMinute = sprinklerConfig?.flowRatePerMinute || 0;
    
    // คำนวณความต้องการน้ำ
    const totalFlowRatePerMinute = plantCount * flowRatePerMinute;
    const totalFlowRatePerHour = totalFlowRatePerMinute * 60;

    return (
        <div className="fixed top-[190px] right-[10px] bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[320px] z-[1000]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <FaWater className="text-blue-600" />
                    {t('วางท่อย่อย') || 'วางท่อย่อย'}
                </h3>
                <button
                    onClick={onCancel}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title={t('ปิด') || 'ปิด'}
                >
                    <FaTimes size={16} />
                </button>
            </div>

            {/* Placement Mode */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <FaInfoCircle size={14} />
                    <span className="text-sm font-medium">
                        {t('โหมดการวาง') || 'โหมดการวาง'}
                    </span>
                </div>
                <div className="text-sm text-blue-600">
                    {placementMode === 'over_plants' && (
                        <span>🎯 {t('วางทับแนวต้นไม้') || 'วางทับแนวต้นไม้'}</span>
                    )}
                    {placementMode === 'between_plants' && (
                        <span>🌱 {t('วางระหว่างแนวต้นไม้') || 'วางระหว่างแนวต้นไม้'}</span>
                    )}
                </div>
            </div>

            {/* 🚀 Multi-segment Info */}
            {isMultiSegmentMode && waypoints.length > 0 && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                    <div className="flex items-center gap-2 text-orange-700 mb-2">
                        <span className="text-lg">🔄</span>
                        <span className="text-sm font-medium">
                            {t('ท่อแบบหักเลี้ยว') || 'ท่อแบบหักเลี้ยว'}
                        </span>
                    </div>
                    <div className="text-sm text-orange-600 space-y-1">
                        <div>📍 {t('จุดหักเลี้ยว') || 'จุดหักเลี้ยว'}: {waypoints.length} {t('จุด') || 'จุด'}</div>
                        <div>📏 {t('ส่วนท่อ') || 'ส่วนท่อ'}: {waypoints.length + 1} {t('ส่วน') || 'ส่วน'}</div>
                        <div className="text-xs text-orange-500 mt-2 p-2 bg-orange-100 rounded">
                            💡 {t('คลิกขวาเพื่อเพิ่มจุดหักเลี้ยว, คลิกซ้ายเพื่อจบการวาด') || 'คลิกขวาเพื่อเพิ่มจุดหักเลี้ยว, คลิกซ้ายเพื่อจบการวาด'}
                        </div>
                    </div>
                </div>
            )}

            {/* Real-time Statistics */}
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200 mb-4">
                <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    📊 สถิติแบบ Real-time
                    <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full">LIVE</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                    {/* จำนวนต้นไม้ */}
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center gap-2 text-green-700">
                            <FaTree size={16} />
                            <span className="text-sm font-medium">
                                {t('จำนวนต้นไม้') || 'จำนวนต้นไม้'}
                            </span>
                        </div>
                        <div className="text-lg font-bold text-green-800">
                            {plantCount.toLocaleString()}
                        </div>
                    </div>

                    {/* Q หัวฉีด */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center gap-2 text-blue-700">
                            <FaTint size={16} />
                            <span className="text-sm font-medium">
                                {t('Q หัวฉีด') || 'Q หัวฉีด'}
                            </span>
                        </div>
                        <div className="text-lg font-bold text-blue-800">
                            {flowRatePerMinute.toFixed(1)} L/M
                        </div>
                    </div>
                    
                    {/* ปริมาณน้ำรวม (เดิม) */}
                    <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-md">
                        <div className="flex items-center gap-2 text-teal-700">
                            <FaTint size={16} />
                            <span className="text-sm font-medium">
                                {t('น้ำต้องการ') || 'น้ำต้องการ'}
                            </span>
                        </div>
                        <div className="text-lg font-bold text-teal-800">
                            {totalWaterNeed.toFixed(1)} L
                        </div>
                    </div>

                    {/* ความต้องการน้ำ/นาที */}
                    <div className="flex items-center justify-between p-3 bg-cyan-50 border border-cyan-200 rounded-md">
                        <div className="flex items-center gap-2 text-cyan-700">
                            <FaWater size={16} />
                            <span className="text-sm font-medium">
                                {t('Q รวม/นาที') || 'Q รวม/นาที'}
                            </span>
                        </div>
                        <div className="text-lg font-bold text-cyan-800">
                            {totalFlowRatePerMinute.toLocaleString()} L/M
                        </div>
                    </div>

                    {/* ความต้องการน้ำ/ชั่วโมง */}
                    <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-md">
                        <div className="flex items-center gap-2 text-purple-700">
                            <FaClock size={16} />
                            <span className="text-sm font-medium">
                                {t('Q รวม/ชั่วโมง') || 'Q รวม/ชั่วโมง'}
                            </span>
                        </div>
                        <div className="text-lg font-bold text-purple-800">
                            {totalFlowRatePerHour.toLocaleString()} L/H
                        </div>
                    </div>

                    {/* ความยาวท่อ */}
                    <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-md">
                        <div className="flex items-center gap-2 text-orange-700">
                            <FaRulerCombined size={16} />
                            <span className="text-sm font-medium">
                                {t('ความยาวท่อ') || 'ความยาวท่อ'}
                            </span>
                        </div>
                        <div className="text-lg font-bold text-orange-800">
                            {length.toFixed(1)} m
                        </div>
                    </div>

                </div>
            </div>


            {/* Action Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={onCancel}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors"
                >
                    <FaTimes size={14} />
                    {t('ยกเลิก') || 'ยกเลิก'}
                </button>
                <button
                    onClick={onConfirm}
                    disabled={plantCount === 0 || length === 0}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md font-medium transition-colors ${
                        plantCount > 0 && length > 0
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    <FaCheck size={14} />
                    {t('ยืนยัน') || 'ยืนยัน'}
                </button>
            </div>
        </div>
    );
};

export default LateralPipeInfoPanel;
