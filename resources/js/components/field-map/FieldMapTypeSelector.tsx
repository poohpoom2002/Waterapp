import React from 'react';
import { MAP_TILES, type MapTileType } from '@/utils/fieldMapConstants';
import Tooltip from './Tooltip';

interface FieldMapTypeSelectorProps {
    mapType: MapTileType;
    setMapType: (type: MapTileType) => void;
}

const FieldMapTypeSelector: React.FC<FieldMapTypeSelectorProps> = ({ mapType, setMapType }) => {
    return (
        <div className="flex space-x-2">
            {Object.entries(MAP_TILES).map(([key, config]) => (
                <Tooltip key={key} content={`Switch to ${config.name} view`}>
                    <button
                        onClick={() => setMapType(key as MapTileType)}
                        className={`rounded px-3 py-1 text-xs transition-colors ${
                            mapType === key
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                    >
                        {config.icon} {config.name}
                    </button>
                </Tooltip>
            ))}
        </div>
    );
};

export default FieldMapTypeSelector;
