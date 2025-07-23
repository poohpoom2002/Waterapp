import React from 'react';

interface FieldMapSmartControlsProps {
    snapEnabled: boolean;
    setSnapEnabled: (enabled: boolean) => void;
    gridEnabled: boolean;
    setGridEnabled: (enabled: boolean) => void;
    pipeSnapEnabled: boolean;
    setPipeSnapEnabled: (enabled: boolean) => void;
    drawingStage: string;
}

const FieldMapSmartControls: React.FC<FieldMapSmartControlsProps> = ({
    snapEnabled,
    setSnapEnabled,
    gridEnabled,
    setGridEnabled,
    pipeSnapEnabled,
    setPipeSnapEnabled,
    drawingStage,
}) => {
    return (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
            <h4 className="mb-2 text-sm font-medium text-blue-300">Smart Tools</h4>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-white">🎯 Snap</span>
                    <input
                        type="checkbox"
                        checked={snapEnabled}
                        onChange={(e) => setSnapEnabled(e.target.checked)}
                        className="h-3 w-3 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-white">📐 Grid</span>
                    <input
                        type="checkbox"
                        checked={gridEnabled}
                        onChange={(e) => setGridEnabled(e.target.checked)}
                        className="h-3 w-3 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                    />
                </div>
                {drawingStage === 'pipes' && (
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-white">🔗 Pipe Snap</span>
                        <input
                            type="checkbox"
                            checked={pipeSnapEnabled}
                            onChange={(e) => setPipeSnapEnabled(e.target.checked)}
                            className="h-3 w-3 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default FieldMapSmartControls;
