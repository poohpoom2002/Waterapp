// ไฟล์ FieldMapCropSpacing.tsx - เพิ่มส่วนเหล่านี้
import { type TranslatedCrop } from '@/pages/utils/cropData';

interface FieldMapCropSpacingProps {
    selectedCropObjects: TranslatedCrop[];
    rowSpacing: Record<string, number>;
    tempRowSpacing: Record<string, string>;
    setTempRowSpacing: (spacing: Record<string, string>) => void;
    editingRowSpacingForCrop: string | null;
    setEditingRowSpacingForCrop: (crop: string | null) => void;
    handleRowSpacingConfirm: (cropValue: string) => void;
    handleRowSpacingCancel: (cropValue: string) => void;
    plantSpacing: Record<string, number>;
    tempPlantSpacing: Record<string, string>;
    setTempPlantSpacing: (spacing: Record<string, string>) => void;
    editingPlantSpacingForCrop: string | null;
    setEditingPlantSpacingForCrop: (crop: string | null) => void;
    handlePlantSpacingConfirm: (cropValue: string) => void;
    handlePlantSpacingCancel: (cropValue: string) => void;

    // NEW: เพิ่ม props ใหม่
    getCropSpacingInfo?: (cropValue: string) => {
        defaultRowSpacing: number;
        defaultPlantSpacing: number;
        currentRowSpacing: number;
        currentPlantSpacing: number;
        waterRequirement: number;
        irrigationNeedsKey: 'low' | 'medium' | 'high';
        growthPeriod: number;
    };
    resetSpacingToDefaults?: () => void;
    t: (key: string) => string;
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
    getCropSpacingInfo,
    resetSpacingToDefaults,
    t,
}) => {
    return (
        <div className="space-y-4">
            {/* Header with Reset Button */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                    🌱 {t('Crop Spacing Settings')}
                </h3>
                {resetSpacingToDefaults && selectedCropObjects.length > 0 && (
                    <button
                        onClick={resetSpacingToDefaults}
                        className="rounded border border-white bg-gray-600 px-2 py-1 text-xs text-white transition-colors hover:bg-gray-700"
                        title={t('Reset all spacing to crop defaults')}
                    >
                        🔄 {t('Reset Defaults')}
                    </button>
                )}
            </div>

            {selectedCropObjects.length === 0 && (
                <div className="py-4 text-center text-xs text-gray-400">
                    {t('No crops selected for spacing configuration')}
                </div>
            )}

            {selectedCropObjects.map((crop) => {
                const cropInfo = getCropSpacingInfo ? getCropSpacingInfo(crop.value) : null;
                const currentRowSpacing = rowSpacing[crop.value] || crop.rowSpacing;
                const currentPlantSpacing = plantSpacing[crop.value] || crop.plantSpacing;
                const isRowEditing = editingRowSpacingForCrop === crop.value;
                const isPlantEditing = editingPlantSpacingForCrop === crop.value;

                return (
                    <div
                        key={crop.value}
                        className="rounded border border-gray-600 bg-gray-800/50 p-3"
                    >
                        {/* Crop Header */}
                        <div className="mb-3 flex items-center space-x-2">
                            <span className="text-lg">{crop.icon}</span>
                            <div className="flex-1">
                                <h4 className="text-sm font-medium text-white">{crop.name}</h4>
                                <div className="flex items-center space-x-2 text-xs text-gray-400">
                                    <span className="flex items-center">
                                        🕒 {crop.growthPeriod} {t('days')}
                                    </span>
                                    <span className="flex items-center">
                                        💧 {crop.irrigationNeeds}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Row Spacing */}
                        <div className="mb-3">
                            <div className="mb-1 flex items-center justify-between">
                                <label className="text-xs font-medium text-gray-300">
                                    {t('Row Spacing')}:
                                </label>
                                <div className="text-xs text-gray-400">
                                    {t('Default')}: {crop.rowSpacing}cm
                                </div>
                            </div>

                            {isRowEditing ? (
                                <div className="flex items-center space-x-1">
                                    <input
                                        type="number"
                                        value={tempRowSpacing[crop.value] || currentRowSpacing}
                                        onChange={(e) =>
                                            setTempRowSpacing({
                                                ...tempRowSpacing,
                                                [crop.value]: e.target.value,
                                            })
                                        }
                                        className="w-20 rounded border border-gray-500 bg-gray-700 px-2 py-1 text-xs text-white focus:border-blue-500"
                                        min="5"
                                        max="300"
                                        step="1"
                                    />
                                    <span className="text-xs text-gray-400">cm</span>
                                    <button
                                        onClick={() => handleRowSpacingConfirm(crop.value)}
                                        className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                                    >
                                        ✓
                                    </button>
                                    <button
                                        onClick={() => handleRowSpacingCancel(crop.value)}
                                        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setEditingRowSpacingForCrop(crop.value);
                                        setTempRowSpacing({
                                            ...tempRowSpacing,
                                            [crop.value]: currentRowSpacing.toString(),
                                        });
                                    }}
                                    className="flex w-full items-center justify-between rounded border border-gray-500 bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
                                >
                                    <span>
                                        {currentRowSpacing}cm
                                        {currentRowSpacing !== crop.rowSpacing && (
                                            <span className="ml-1 text-yellow-400">*</span>
                                        )}
                                    </span>
                                    <span className="text-gray-400">✏️</span>
                                </button>
                            )}
                        </div>

                        {/* Plant Spacing */}
                        <div className="mb-3">
                            <div className="mb-1 flex items-center justify-between">
                                <label className="text-xs font-medium text-gray-300">
                                    {t('Plant Spacing')}:
                                </label>
                                <div className="text-xs text-gray-400">
                                    {t('Default')}: {crop.plantSpacing}cm
                                </div>
                            </div>

                            {isPlantEditing ? (
                                <div className="flex items-center space-x-1">
                                    <input
                                        type="number"
                                        value={tempPlantSpacing[crop.value] || currentPlantSpacing}
                                        onChange={(e) =>
                                            setTempPlantSpacing({
                                                ...tempPlantSpacing,
                                                [crop.value]: e.target.value,
                                            })
                                        }
                                        className="w-20 rounded border border-gray-500 bg-gray-700 px-2 py-1 text-xs text-white focus:border-blue-500"
                                        min="5"
                                        max="200"
                                        step="1"
                                    />
                                    <span className="text-xs text-gray-400">cm</span>
                                    <button
                                        onClick={() => handlePlantSpacingConfirm(crop.value)}
                                        className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                                    >
                                        ✓
                                    </button>
                                    <button
                                        onClick={() => handlePlantSpacingCancel(crop.value)}
                                        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setEditingPlantSpacingForCrop(crop.value);
                                        setTempPlantSpacing({
                                            ...tempPlantSpacing,
                                            [crop.value]: currentPlantSpacing.toString(),
                                        });
                                    }}
                                    className="flex w-full items-center justify-between rounded border border-gray-500 bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
                                >
                                    <span>
                                        {currentPlantSpacing}cm
                                        {currentPlantSpacing !== crop.plantSpacing && (
                                            <span className="ml-1 text-yellow-400">*</span>
                                        )}
                                    </span>
                                    <span className="text-gray-400">✏️</span>
                                </button>
                            )}
                        </div>

                        {/* Additional Crop Info */}
                        {cropInfo && (
                            <div className="rounded border border-gray-600 bg-gray-900/50 p-2">
                                <div className="text-xs text-gray-400">
                                    <div className="grid grid-cols-2 gap-1">
                                        <span>
                                            {t('Water req')}: {cropInfo.waterRequirement}L/day
                                        </span>
                                        <span>
                                            {t('Growth')}: {cropInfo.growthPeriod} {t('days')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Status Indicators */}
                        <div className="mt-2 flex justify-between text-xs">
                            <div className="flex space-x-2">
                                {currentRowSpacing !== crop.rowSpacing && (
                                    <span className="text-yellow-400">
                                        ⚠️ {t('Modified spacing')}
                                    </span>
                                )}
                            </div>
                            <div className="text-gray-500">
                                {t('Plants/m²')}:{' '}
                                {Math.round(10000 / (currentRowSpacing * currentPlantSpacing))}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Help Text */}
            {selectedCropObjects.length > 0 && (
                <div className="text-xs text-gray-500">
                    💡 {t('Yellow (*) indicates modified values from crop defaults')}
                </div>
            )}
        </div>
    );
};

export default FieldMapCropSpacing;
