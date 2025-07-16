import React from 'react';

interface FieldMapFieldInfoProps {
    mainField: any;
    fieldAreaSize: number;
}

const FieldMapFieldInfo: React.FC<FieldMapFieldInfoProps> = ({ mainField, fieldAreaSize }) => {
    if (!mainField) return null;

    return (
        <div className="rounded-lg bg-gray-700 p-3">
            <div className="mb-2 text-sm text-gray-300">📐 Field Info</div>
            <div className="space-y-1">
                <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Area:</span>
                    <span className="text-white">
                        {fieldAreaSize > 0
                            ? fieldAreaSize >= 1600
                                ? `${(fieldAreaSize / 1600).toFixed(2)} ไร่`
                                : `${fieldAreaSize.toFixed(0)} m²`
                            : 'Calculating...'}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-orange-400">Ready for zones</span>
                </div>
            </div>
        </div>
    );
};

export default FieldMapFieldInfo;
