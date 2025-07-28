import React from 'react';

interface FieldMapCropSpacingProps {
    selectedCropObjects: any[];
    rowSpacing: { [key: string]: number };
    tempRowSpacing: { [key: string]: string };
    setTempRowSpacing: (spacing: any) => void;
    editingRowSpacingForCrop: string | null;
    setEditingRowSpacingForCrop: (crop: string | null) => void;
    handleRowSpacingConfirm: (cropValue: string) => void;
    handleRowSpacingCancel: (cropValue: string) => void;
    plantSpacing: { [key: string]: number };
    tempPlantSpacing: { [key: string]: string };
    setTempPlantSpacing: (spacing: any) => void;
    editingPlantSpacingForCrop: string | null;
    setEditingPlantSpacingForCrop: (crop: string | null) => void;
    handlePlantSpacingConfirm: (cropValue: string) => void;
    handlePlantSpacingCancel: (cropValue: string) => void;
}

const FieldMapCropSpacing: React.FC<FieldMapCropSpacingProps> = ({
    selectedCropObjects,
    rowSpacing,
    tempRowSpacing,
    setTempRowSpacing,
    editingRowSpacingForCrop,
    setEditingRowSpacingForCrop,
    handleRowSpacingConfirm,
    handleRowSpacingCancel,
    plantSpacing,
    tempPlantSpacing,
    setTempPlantSpacing,
    editingPlantSpacingForCrop,
    setEditingPlantSpacingForCrop,
    handlePlantSpacingConfirm,
    handlePlantSpacingCancel,
}) => {
    if (selectedCropObjects.length === 0) return null;

    return (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
            <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-300">📏 Crop Spacing Settings</span>
            </div>

            <div className="space-y-3">
                {selectedCropObjects.map(
                    (crop) =>
                        crop && (
                            <div key={crop.value} className="rounded bg-gray-700 p-3">
                                <div className="mb-2 flex items-center space-x-2">
                                    <span className="text-sm">{crop.icon}</span>
                                    <span className="text-sm font-medium text-white">
                                        {crop.name.split('/')[0].trim()}
                                    </span>
                                </div>

                                {/* Row Spacing */}
                                <div className="mb-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-300">
                                            Row Spacing (m)
                                        </span>
                                        {editingRowSpacingForCrop !== crop.value ? (
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs text-blue-200">
                                                    {rowSpacing[crop.value] || crop.spacing || 1.5}m
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setEditingRowSpacingForCrop(crop.value);
                                                        const currentSpacing =
                                                            rowSpacing[crop.value] ||
                                                            crop.spacing ||
                                                            1.5;
                                                        setTempRowSpacing((prev: any) => ({
                                                            ...prev,
                                                            [crop.value]: currentSpacing.toString(),
                                                        }));
                                                    }}
                                                    className="px-1 py-0.5 text-xs text-blue-400 hover:text-blue-300"
                                                >
                                                    ✏️
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-1">
                                                <input
                                                    type="number"
                                                    value={tempRowSpacing[crop.value] || '1.5'}
                                                    onChange={(e) =>
                                                        setTempRowSpacing((prev: any) => ({
                                                            ...prev,
                                                            [crop.value]: e.target.value,
                                                        }))
                                                    }
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleRowSpacingConfirm(crop.value);
                                                        } else if (e.key === 'Escape') {
                                                            handleRowSpacingCancel(crop.value);
                                                        }
                                                    }}
                                                    min="0.1"
                                                    max="10"
                                                    step="0.1"
                                                    className="w-16 rounded border border-gray-600 bg-gray-800 px-2 py-0.5 text-xs text-white"
                                                />
                                                <button
                                                    onClick={() =>
                                                        handleRowSpacingConfirm(crop.value)
                                                    }
                                                    className="px-1 text-xs text-green-400"
                                                >
                                                    ✅
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleRowSpacingCancel(crop.value)
                                                    }
                                                    className="px-1 text-xs text-red-400"
                                                >
                                                    ❌
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Plant Spacing */}
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-300">
                                            Plant Spacing (m)
                                        </span>
                                        {editingPlantSpacingForCrop !== crop.value ? (
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs text-green-200">
                                                    {plantSpacing[crop.value] ||
                                                        crop.defaultPlantSpacing ||
                                                        0.3}
                                                    m
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setEditingPlantSpacingForCrop(crop.value);
                                                        const currentSpacing =
                                                            plantSpacing[crop.value] ||
                                                            crop.defaultPlantSpacing ||
                                                            0.3;
                                                        setTempPlantSpacing((prev: any) => ({
                                                            ...prev,
                                                            [crop.value]: currentSpacing.toString(),
                                                        }));
                                                    }}
                                                    className="px-1 py-0.5 text-xs text-green-400 hover:text-green-300"
                                                >
                                                    ✏️
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-1">
                                                <input
                                                    type="number"
                                                    value={tempPlantSpacing[crop.value] || '0.3'}
                                                    onChange={(e) =>
                                                        setTempPlantSpacing((prev: any) => ({
                                                            ...prev,
                                                            [crop.value]: e.target.value,
                                                        }))
                                                    }
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handlePlantSpacingConfirm(crop.value);
                                                        } else if (e.key === 'Escape') {
                                                            handlePlantSpacingCancel(crop.value);
                                                        }
                                                    }}
                                                    min="0.1"
                                                    max="5"
                                                    step="0.1"
                                                    className="w-16 rounded border border-gray-600 bg-gray-800 px-2 py-0.5 text-xs text-white"
                                                />
                                                <button
                                                    onClick={() =>
                                                        handlePlantSpacingConfirm(crop.value)
                                                    }
                                                    className="px-1 text-xs text-green-400"
                                                >
                                                    ✅
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handlePlantSpacingCancel(crop.value)
                                                    }
                                                    className="px-1 text-xs text-red-400"
                                                >
                                                    ❌
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                )}
            </div>
        </div>
    );
};

export default FieldMapCropSpacing;
