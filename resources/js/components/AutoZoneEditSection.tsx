// AutoZoneEditSection.tsx - Section สำหรับการแก้ไขโซนอัตโนมัติ

import React from 'react';
import { IrrigationZone, PlantLocation, Coordinate } from '../utils/irrigationZoneUtils';
import { useZoneEditor } from '../hooks/useZoneEditor';
import ZoneEditButton from './ZoneEditButton';
import ZoneControlPoints from './ZoneControlPoints';

interface AutoZoneEditSectionProps {
    zones: IrrigationZone[];
    allPlants: PlantLocation[];
    mainArea: Coordinate[];
    onZonesUpdate: (updatedZones: IrrigationZone[]) => void;
    onDeleteAllZones: () => void;
    className?: string;
}

const AutoZoneEditSection: React.FC<AutoZoneEditSectionProps> = ({
    zones,
    allPlants,
    mainArea,
    onZonesUpdate,
    onDeleteAllZones,
    className = '',
}) => {
    const [statusMessage, setStatusMessage] = React.useState<{
        type: 'success' | 'error' | 'info';
        message: string;
    } | null>(null);

    const zoneEditor = useZoneEditor({
        zones,
        allPlants,
        mainArea,
        onZonesUpdate,
        onError: (error) => {
            setStatusMessage({ type: 'error', message: error });
            setTimeout(() => setStatusMessage(null), 5000);
        },
        onSuccess: (message) => {
            setStatusMessage({ type: 'success', message });
            setTimeout(() => setStatusMessage(null), 3000);
        },
    });

    const handleMapClick = (event: React.MouseEvent) => {
        if (!zoneEditor.isEditMode || zoneEditor.selectedZone) return;

        const rect = (event.target as Element).getBoundingClientRect();
        const pixelX = event.clientX - rect.left;
        const pixelY = event.clientY - rect.top;

        const clickPoint = zoneEditor.pixelToCoordinate(pixelX, pixelY);
        zoneEditor.handleZoneClick(clickPoint);
    };

    const hasZones = zones && zones.length > 0;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Control Buttons */}
            <div className="flex items-center gap-4">
                {/* ปุ่มลบโซนทั้งหมด - เดิม */}
                <button
                    onClick={onDeleteAllZones}
                    disabled={!hasZones}
                    className={`
                        flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium
                        transition-all duration-200 ease-in-out
                        ${
                            hasZones
                                ? 'border-red-500 bg-red-500 text-white hover:bg-red-600 hover:shadow-sm active:scale-95'
                                : 'cursor-not-allowed border-gray-200 bg-gray-200 text-gray-400'
                        }
                    `}
                    title={hasZones ? 'ลบโซนทั้งหมด' : 'ไม่มีโซนให้ลบ'}
                >
                    <span className="text-lg">🗑️</span>
                    <span>ลบโซนทั้งหมด</span>
                </button>

                {/* ปุ่มแก้ไขโซน - ใหม่ */}
                <ZoneEditButton
                    zones={zones}
                    isEditMode={zoneEditor.isEditMode}
                    onToggleEditMode={zoneEditor.toggleEditMode}
                    onExitEditMode={zoneEditor.exitEditMode}
                    disabled={!hasZones}
                />
            </div>

            {/* Status Message */}
            {statusMessage && (
                <div
                    className={`
                    flex items-center gap-2 rounded-lg border px-4 py-3
                    ${
                        statusMessage.type === 'success'
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : statusMessage.type === 'error'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : 'border-blue-200 bg-blue-50 text-blue-700'
                    }
                `}
                >
                    <span className="text-lg">
                        {statusMessage.type === 'success'
                            ? '✅'
                            : statusMessage.type === 'error'
                              ? '❌'
                              : 'ℹ️'}
                    </span>
                    <span className="text-sm font-medium">{statusMessage.message}</span>
                </div>
            )}

            {/* Zone Edit Controls */}
            {zoneEditor.selectedZone && (
                <div className="rounded-lg border bg-white p-4 shadow-lg">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                                แก้ไข: {zoneEditor.selectedZone.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                                ต้นไม้: {zoneEditor.selectedZone.plants.length} ต้น | น้ำ:{' '}
                                {zoneEditor.selectedZone.totalWaterNeed.toFixed(1)} L/min
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={zoneEditor.applyZoneChanges}
                                className="flex items-center gap-2 rounded-md bg-green-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-green-600"
                            >
                                <span>✅</span>
                                <span>บันทึก</span>
                            </button>
                            <button
                                onClick={zoneEditor.cancelZoneChanges}
                                className="flex items-center gap-2 rounded-md bg-gray-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-600"
                            >
                                <span>❌</span>
                                <span>ยกเลิก</span>
                            </button>
                        </div>
                    </div>

                    <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-500">
                        <div className="mb-1 font-medium">วิธีใช้:</div>
                        <div>• ลากจุดสีส้ม (มุม) เพื่อเปลี่ยนรูปทรงโซน</div>
                        <div>• ลากจุดสีน้ำเงิน (กึ่งกลาง) เพื่อเพิ่มจุดใหม่</div>
                        <div>• ไม่สามารถลากออกนอกพื้นที่หลักได้</div>
                    </div>
                </div>
            )}

            {/* Map Overlay for Zone Editing */}
            {zoneEditor.isEditMode && (
                <div
                    className="fixed inset-0 z-40 cursor-crosshair bg-black bg-opacity-10"
                    onClick={handleMapClick}
                >
                    {/* Control Points */}
                    {zoneEditor.selectedZone && (
                        <ZoneControlPoints
                            controlPoints={zoneEditor.editState.controlPoints}
                            onPointDragStart={zoneEditor.handleControlPointDragStart}
                            onPointDrag={zoneEditor.handleControlPointDrag}
                            onPointDragEnd={zoneEditor.handleControlPointDragEnd}
                            isDragging={zoneEditor.editState.isDragging}
                            draggedPointIndex={zoneEditor.editState.draggedPointIndex}
                        />
                    )}
                </div>
            )}

            {/* Zone Information */}
            {hasZones && !zoneEditor.isEditMode && (
                <div className="rounded-lg bg-gray-50 p-4">
                    <h4 className="mb-2 font-semibold text-gray-800">ข้อมูลโซนปัจจุบัน</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                        <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{zones.length}</div>
                            <div className="text-gray-600">โซนทั้งหมด</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                                {zones.reduce((sum, zone) => sum + zone.plants.length, 0)}
                            </div>
                            <div className="text-gray-600">ต้นไม้ทั้งหมด</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-purple-600">
                                {zones
                                    .reduce((sum, zone) => sum + zone.totalWaterNeed, 0)
                                    .toFixed(1)}
                            </div>
                            <div className="text-gray-600">L/min</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-orange-600">
                                {(
                                    zones.reduce((sum, zone) => sum + zone.totalWaterNeed, 0) /
                                    zones.length
                                ).toFixed(1)}
                            </div>
                            <div className="text-gray-600">L/min เฉลี่ย</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutoZoneEditSection;
