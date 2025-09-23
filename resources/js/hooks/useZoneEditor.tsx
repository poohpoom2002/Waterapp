// useZoneEditor.tsx - Hook สำหรับจัดการการแก้ไขโซนอัตโนมัติ

import { useState, useCallback, useRef } from 'react';
import { IrrigationZone, PlantLocation, Coordinate } from '../utils/irrigationZoneUtils';
import {
    ZoneEditState,
    ZoneControlPoint,
    createInitialZoneEditState,
    startZoneEditing,
    stopZoneEditing,
    startDragging,
    stopDragging,
    createZoneControlPoints,
    updateZoneCoordinatesOnDrag,
    updateZoneControlPoints,
    findZoneByPoint,
    findPlantsInEditedZone,
    createUpdatedZone,
    deepCopyZone,
} from '../utils/zoneEditUtils';

export interface UseZoneEditorProps {
    zones: IrrigationZone[];
    allPlants: PlantLocation[];
    mainArea: Coordinate[];
    onZonesUpdate: (updatedZones: IrrigationZone[]) => void;
    onError?: (error: string) => void;
    onSuccess?: (message: string) => void;
}

export interface UseZoneEditorReturn {
    // State
    editState: ZoneEditState;
    isEditMode: boolean;
    selectedZone: IrrigationZone | null;

    // Actions
    toggleEditMode: () => void;
    exitEditMode: () => void;
    handleZoneClick: (clickPoint: Coordinate) => void;
    handleControlPointDragStart: (controlPoint: ZoneControlPoint, event: React.MouseEvent) => void;
    handleControlPointDrag: (event: React.MouseEvent | MouseEvent) => void;
    handleControlPointDragEnd: () => void;
    applyZoneChanges: () => void;
    cancelZoneChanges: () => void;

    // Helper functions
    pixelToCoordinate: (pixelX: number, pixelY: number) => Coordinate;
}

export const useZoneEditor = ({
    zones,
    allPlants,
    mainArea,
    onZonesUpdate,
    onError,
    onSuccess,
}: UseZoneEditorProps): UseZoneEditorReturn => {
    const [editState, setEditState] = useState<ZoneEditState>(createInitialZoneEditState());
    const [originalZone, setOriginalZone] = useState<IrrigationZone | null>(null);
    const mapBoundsRef = useRef<{
        north: number;
        south: number;
        east: number;
        west: number;
    } | null>(null);

    // คำนวณขอบเขตแผนที่จาก mainArea
    const calculateMapBounds = useCallback(() => {
        if (!mainArea || mainArea.length === 0) return null;

        const lats = mainArea.map((coord) => coord.lat);
        const lngs = mainArea.map((coord) => coord.lng);

        return {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lngs),
            west: Math.min(...lngs),
        };
    }, [mainArea]);

    // แปลงพิกัด pixel เป็น coordinate
    const pixelToCoordinate = useCallback(
        (pixelX: number, pixelY: number): Coordinate => {
            const bounds = mapBoundsRef.current || calculateMapBounds();
            if (!bounds) return { lat: 0, lng: 0 };

            // สมมติใช้ขนาดแผนที่ 800x600 pixels
            const mapWidth = 800;
            const mapHeight = 600;

            const lat = bounds.north - (pixelY / mapHeight) * (bounds.north - bounds.south);
            const lng = bounds.west + (pixelX / mapWidth) * (bounds.east - bounds.west);

            return { lat, lng };
        },
        [calculateMapBounds]
    );

    // ออกจากโหมดแก้ไข
    const exitEditMode = useCallback(() => {
        setEditState(stopZoneEditing());
        setOriginalZone(null);
    }, []);

    // เริ่มต้นโหมดแก้ไข
    const toggleEditMode = useCallback(() => {
        if (editState.isEditing) {
            exitEditMode();
        } else {
            setEditState((prevState) => ({
                ...prevState,
                isEditing: true,
            }));
            mapBoundsRef.current = calculateMapBounds();
        }
    }, [editState.isEditing, exitEditMode, calculateMapBounds]);

    // จัดการการคลิกโซน
    const handleZoneClick = useCallback(
        (clickPoint: Coordinate) => {
            if (!editState.isEditing) return;

            // หาโซนที่ถูกคลิก
            const clickedZone = findZoneByPoint(clickPoint, zones);
            if (!clickedZone) {
                onError?.('ไม่พบโซนในตำแหน่งที่คลิก');
                return;
            }

            // เริ่มการแก้ไขโซนที่เลือก
            setEditState(startZoneEditing(clickedZone, editState));
            // สร้าง deep copy ของ originalZone เพื่อเก็บสำหรับการ restore
            setOriginalZone(deepCopyZone(clickedZone));

            onSuccess?.(`เริ่มแก้ไขโซน: ${clickedZone.name}`);
        },
        [editState, zones, onError, onSuccess]
    );

    // เริ่มการลากจุดควบคุม
    const handleControlPointDragStart = useCallback(
        (controlPoint: ZoneControlPoint, event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();

            setEditState((prevState) => startDragging(controlPoint, prevState));
        },
        []
    );

    // การลางจุดควบคุม
    const handleControlPointDrag = useCallback(
        (event: React.MouseEvent | MouseEvent) => {
            if (
                !editState.isDragging ||
                editState.draggedPointIndex === null ||
                !editState.editingZone
            ) {
                return;
            }

            const rect =
                (event.target as Element)?.getBoundingClientRect?.() ||
                document.querySelector('.map-container')?.getBoundingClientRect();

            if (!rect) return;

            const pixelX = event.clientX - rect.left;
            const pixelY = event.clientY - rect.top;

            const newPosition = pixelToCoordinate(pixelX, pixelY);

            // อัปเดตพิกัดโซน
            const updateResult = updateZoneCoordinatesOnDrag(
                editState.editingZone,
                editState.draggedPointIndex,
                newPosition,
                mainArea
            );

            if (updateResult.isValid) {
                // อัปเดตโซนที่กำลังแก้ไข - สร้าง deep copy เพื่อหลีกเลี่ยง reference sharing
                const updatedZone: IrrigationZone = {
                    ...deepCopyZone(editState.editingZone),
                    coordinates: updateResult.updatedCoordinates.map((coord) => ({
                        lat: coord.lat,
                        lng: coord.lng,
                    })), // deep copy coordinates
                };

                // อัปเดตเฉพาะจุดควบคุมที่เกี่ยวข้องแทนการสร้างใหม่ทั้งหมด
                const updatedControlPoints = updateZoneControlPoints(
                    editState.controlPoints,
                    updateResult.updatedCoordinates,
                    editState.draggedPointIndex!
                    // editState.editingZone
                );

                setEditState((prevState) => ({
                    ...prevState,
                    editingZone: updatedZone,
                    controlPoints: updatedControlPoints,
                }));
            } else {
                onError?.(updateResult.errorMessage || 'ไม่สามารถแก้ไขโซนได้');
            }
        },
        [
            editState.isDragging,
            editState.draggedPointIndex,
            editState.editingZone,
            editState.controlPoints,
            mainArea,
            pixelToCoordinate,
            onError,
        ]
    );

    // สิ้นสุดการลากจุดควบคุม
    const handleControlPointDragEnd = useCallback(() => {
        if (!editState.isDragging) return;

        setEditState((prevState) => stopDragging(prevState));
    }, [editState.isDragging]);

    // บันทึกการเปลี่ยนแปลง (ปรับปรุงให้มีความปลอดภัยมากขึ้น)
    const applyZoneChanges = useCallback(() => {
        if (!editState.editingZone) return;

        try {
            // 🔧 แก้ไข: ตรวจสอบว่าโซนมี coordinates ที่ถูกต้องหรือไม่
            if (
                !editState.editingZone.coordinates ||
                editState.editingZone.coordinates.length < 3
            ) {
                onError?.('โซนต้องมีพิกัดอย่างน้อย 3 จุด');
                return;
            }

            // 🔧 แก้ไข: ตรวจสอบพิกัดให้ถูกต้อง
            const validCoordinates = editState.editingZone.coordinates.filter(
                (coord) =>
                    coord &&
                    typeof coord.lat === 'number' &&
                    typeof coord.lng === 'number' &&
                    !isNaN(coord.lat) &&
                    !isNaN(coord.lng)
            );

            if (validCoordinates.length < 3) {
                onError?.('โซนมีพิกัดที่ไม่ถูกต้อง');
                return;
            }

            // หาต้นไม้ในโซนที่แก้ไขแล้ว
            const newPlants = findPlantsInEditedZone(validCoordinates, allPlants);

            // สร้างโซนที่อัปเดตแล้ว
            const updatedZone = createUpdatedZone(
                editState.editingZone,
                validCoordinates,
                newPlants
            );

            // 🔧 แก้ไข: ตรวจสอบว่าโซนที่อัปเดตแล้วยังคงอยู่ในรายการหรือไม่
            const existingZoneIndex = zones.findIndex((zone) => zone.id === updatedZone.id);
            if (existingZoneIndex === -1) {
                onError?.('ไม่พบโซนที่ต้องการแก้ไข');
                return;
            }

            // อัปเดตรายการโซนทั้งหมด
            const updatedZones = zones.map((zone) =>
                zone.id === updatedZone.id ? updatedZone : zone
            );

            onZonesUpdate(updatedZones);
            exitEditMode();
            onSuccess?.(`บันทึกการเปลี่ยนแปลงโซน: ${updatedZone.name}`);
        } catch (error) {
            console.error('❌ Error applying zone changes:', error);
            onError?.('เกิดข้อผิดพลาดในการบันทึกการเปลี่ยนแปลง');
        }
    }, [editState.editingZone, allPlants, zones, onZonesUpdate, exitEditMode, onSuccess, onError]);

    // ยกเลิกการเปลี่ยนแปลง
    const cancelZoneChanges = useCallback(() => {
        if (originalZone) {
            // สร้าง deep copy ของ originalZone เพื่อ restore
            const restoredZone = deepCopyZone(originalZone);

            setEditState((prevState) => ({
                ...prevState,
                editingZone: restoredZone,
                controlPoints: createZoneControlPoints(restoredZone),
            }));
        }
        exitEditMode();
    }, [originalZone, exitEditMode]);

    return {
        // State
        editState,
        isEditMode: editState.isEditing,
        selectedZone: editState.editingZone,

        // Actions
        toggleEditMode,
        exitEditMode,
        handleZoneClick,
        handleControlPointDragStart,
        handleControlPointDrag,
        handleControlPointDragEnd,
        applyZoneChanges,
        cancelZoneChanges,

        // Helper functions
        pixelToCoordinate,
    };
};
