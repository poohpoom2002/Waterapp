// ZoneEditButton.tsx - Component สำหรับปุ่มแก้ไขโซนอัตโนมัติ

import React from 'react';
import { IrrigationZone } from '../utils/irrigationZoneUtils';

interface ZoneEditButtonProps {
    zones: IrrigationZone[];
    isEditMode: boolean;
    onToggleEditMode: () => void;
    onExitEditMode: () => void;
    disabled?: boolean;
    className?: string;
}

const ZoneEditButton: React.FC<ZoneEditButtonProps> = ({
    zones,
    isEditMode,
    onToggleEditMode,
    onExitEditMode,
    disabled = false,
    className = ""
}) => {
    const hasZones = zones && zones.length > 0;

    const handleClick = () => {
        if (isEditMode) {
            onExitEditMode();
        } else {
            onToggleEditMode();
        }
    };

    if (!hasZones) {
        return null;
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <button
                onClick={handleClick}
                disabled={disabled}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm
                    transition-all duration-200 ease-in-out
                    ${isEditMode 
                        ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500 shadow-md' 
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400'
                    }
                    ${disabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:shadow-sm active:scale-95'
                    }
                `}
                title={isEditMode ? "ออกจากโหมดแก้ไขโซน" : "แก้ไขโซนอัตโนมัติ"}
            >
                <span className="text-lg">
                    {isEditMode ? '🔧' : '✏️'}
                </span>
                <span>
                    {isEditMode ? 'ออกจากโหมดแก้ไข' : 'แก้ไขโซน'}
                </span>
            </button>

            {isEditMode && (
                <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-md border border-orange-200">
                    <span className="animate-pulse">🎯</span>
                    <span>คลิกที่โซนที่ต้องการแก้ไข</span>
                </div>
            )}
        </div>
    );
};

export default ZoneEditButton;
