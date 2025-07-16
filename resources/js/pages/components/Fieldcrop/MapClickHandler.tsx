import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapClickHandlerProps {
    isPlacingEquipment: boolean;
    onMapClick: (lat: number, lng: number) => void;
}

export default function MapClickHandler({ isPlacingEquipment, onMapClick }: MapClickHandlerProps) {
    const map = useMap();

    useEffect(() => {
        if (!isPlacingEquipment) return;

        const handleMapClick = (e: any) => {
            if (isPlacingEquipment) {
                onMapClick(e.latlng.lat, e.latlng.lng);
            }
        };

        map.on('click', handleMapClick);

        return () => {
            map.off('click', handleMapClick);
        };
    }, [map, isPlacingEquipment, onMapClick]);

    return null;
}
