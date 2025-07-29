/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapControlsProps {
    mapCenter: [number, number];
    mapZoom: number;
    mapRef: React.MutableRefObject<any>;
}

const MapControls = React.memo(function MapControls({
    mapCenter,
    mapZoom,
    mapRef,
}: MapControlsProps) {
    const map = useMap();

    useEffect(() => {
        if (mapRef && mapRef.current !== map) {
            mapRef.current = map;
        }
        map.setView(mapCenter, mapZoom);
    }, [map, mapCenter, mapZoom, mapRef]);

    return null;
});

export default MapControls;
