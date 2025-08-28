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
    className = ""
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
        }
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
                        flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm
                        transition-all duration-200 ease-in-out
                        ${hasZones
                            ? 'bg-red-500 hover:bg-red-600 text-white border-red-500 hover:shadow-sm active:scale-95'
                            : 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed'
                        }
                    `}
                    title={hasZones ? "ลบโซนทั้งหมด" : "ไม่มีโซนให้ลบ"}
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
                <div className={`
                    flex items-center gap-2 px-4 py-3 rounded-lg border
                    ${statusMessage.type === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-700' 
                        : statusMessage.type === 'error' 
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                    }
                `}>
                    <span className="text-lg">
                        {statusMessage.type === 'success' ? '✅' : 
                         statusMessage.type === 'error' ? '❌' : 'ℹ️'}
                    </span>
                    <span className="text-sm font-medium">{statusMessage.message}</span>
                </div>
            )}

            {/* Zone Edit Controls */}
            {zoneEditor.selectedZone && (
                <div className="bg-white rounded-lg shadow-lg border p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                                แก้ไข: {zoneEditor.selectedZone.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                                ต้นไม้: {zoneEditor.selectedZone.plants.length} ต้น | 
                                น้ำ: {zoneEditor.selectedZone.totalWaterNeed.toFixed(1)} L/min
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={zoneEditor.applyZoneChanges}
                                className="flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-md transition-colors"
                            >
                                <span>✅</span>
                                <span>บันทึก</span>
                            </button>
                            <button
                                onClick={zoneEditor.cancelZoneChanges}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
                            >
                                <span>❌</span>
                                <span>ยกเลิก</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
                        <div className="font-medium mb-1">วิธีใช้:</div>
                        <div>• ลากจุดสีส้ม (มุม) เพื่อเปลี่ยนรูปทรงโซน</div>
                        <div>• ลากจุดสีน้ำเงิน (กึ่งกลาง) เพื่อเพิ่มจุดใหม่</div>
                        <div>• ไม่สามารถลากออกนอกพื้นที่หลักได้</div>
                    </div>
                </div>
            )}

            {/* Map Overlay for Zone Editing */}
            {zoneEditor.isEditMode && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-10 z-40 cursor-crosshair"
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
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">ข้อมูลโซนปัจจุบัน</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                            <div className="font-bold text-lg text-blue-600">{zones.length}</div>
                            <div className="text-gray-600">โซนทั้งหมด</div>
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-lg text-green-600">
                                {zones.reduce((sum, zone) => sum + zone.plants.length, 0)}
                            </div>
                            <div className="text-gray-600">ต้นไม้ทั้งหมด</div>
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-lg text-purple-600">
                                {zones.reduce((sum, zone) => sum + zone.totalWaterNeed, 0).toFixed(1)}
                            </div>
                            <div className="text-gray-600">L/min</div>
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-lg text-orange-600">
                                {(zones.reduce((sum, zone) => sum + zone.totalWaterNeed, 0) / zones.length).toFixed(1)}
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
