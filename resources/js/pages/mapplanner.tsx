import React, { useState, useEffect, useRef } from 'react';
import axios, { AxiosError } from 'axios';
import { MapContainer, TileLayer, CircleMarker, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

type LatLng = {
  lat: number;
  lng: number;
};

type PlantType = {
  id: number;
  name: string;
  type: string;
  plant_spacing: number;
  row_spacing: number;
  water_needed: number;
  description: string;
};

export default function MapPlanner() {
  const [area, setArea] = useState<LatLng[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [results, setResults] = useState<LatLng[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.7563, 100.5018]); // Default to Bangkok
  const featureGroupRef = useRef<any>(null);

  useEffect(() => {
    // Fetch plant types when component mounts
    const fetchPlantTypes = async () => {
      try {
        const response = await axios.get<PlantType[]>('/api/plant-types');
        setPlantTypes(response.data);
      } catch (error) {
        console.error('Error fetching plant types:', error);
      }
    };
    fetchPlantTypes();
  }, []);

  useEffect(() => {
    if (results.length > 0) {
      const center = results.reduce(
        (acc, point) => [acc[0] + point.lat, acc[1] + point.lng],
        [0, 0]
      );
      setMapCenter([center[0] / results.length, center[1] / results.length]);
    }
  }, [results]);

  const handleSubmit = async () => {
    if (area.length < 3) {
      alert('Please draw a polygon on the map first');
      return;
    }

    if (!selectedPlant) {
      alert('Please select a plant type');
      return;
    }

    try {
      const response = await axios.post<{ plant_locations: LatLng[] }>('/api/generate-planting-points', {
        area,
        plant_type_id: selectedPlant.id,
        plant_spacing: selectedPlant.plant_spacing,
        row_spacing: selectedPlant.row_spacing,
      });
      setResults(response.data.plant_locations);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('Error generating points:', error.response?.data || error.message);
      } else {
        console.error('An unexpected error occurred:', error);
      }
    }
  };

  const onCreated = (e: any) => {
    const layer = e.layer;
    const coordinates = layer.getLatLngs()[0].map((latLng: { lat: number; lng: number }) => ({
      lat: latLng.lat,
      lng: latLng.lng
    }));
    setArea(coordinates);
  };

  const onDeleted = () => {
    setArea([]);
    setResults([]);
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h1 className="text-xl font-bold mb-4 text-white">Plant Layout Generator</h1>
      <p className="text-sm text-gray-400 mb-4">
        Select a plant type and draw a polygon on the map to generate planting points.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Select Plant Type
              </label>
              <select
                className="bg-gray-800 border border-gray-700 text-white p-2 w-full rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedPlant?.id || ''}
                onChange={(e) => {
                  const plant = plantTypes.find(p => p.id === Number(e.target.value));
                  setSelectedPlant(plant || null);
                }}
              >
                <option value="">Select a plant...</option>
                {plantTypes.map((plant) => (
                  <option key={plant.id} value={plant.id}>
                    {plant.name} ({plant.type})
                  </option>
                ))}
              </select>
            </div>

            {selectedPlant && (
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h3 className="font-medium mb-2 text-white">Plant Details</h3>
                <p className="text-sm text-gray-400 mb-4">{selectedPlant.description}</p>
                
                <div className="space-y-3">
                  <div className="bg-gray-900 p-3 rounded border border-gray-700">
                    <h4 className="font-medium text-blue-400 mb-2">Spacing Requirements</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center text-gray-300">
                        <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span>Plant Spacing:</span>
                        <span className="ml-1 font-medium text-blue-400">{selectedPlant.plant_spacing}m</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span>Row Spacing:</span>
                        <span className="ml-1 font-medium text-blue-400">{selectedPlant.row_spacing}m</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900 p-3 rounded border border-gray-700">
                    <h4 className="font-medium text-blue-400 mb-2">Water Requirements</h4>
                    <div className="flex items-center text-sm text-gray-300">
                      <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      <span>Water Needed per Plant:</span>
                      <span className="ml-1 font-medium text-blue-400">{selectedPlant.water_needed}L</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full transition-colors duration-200 disabled:bg-gray-700 disabled:cursor-not-allowed"
              disabled={area.length < 3 || !selectedPlant}
            >
              Generate Points
            </button>
          </div>
        </div>

        <div className="h-[500px] border border-gray-700 rounded-lg overflow-hidden">
          <MapContainer
            center={mapCenter}
            zoom={13}
            maxZoom={25}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            <FeatureGroup ref={featureGroupRef}>
              <EditControl
                position="topright"
                onCreated={onCreated}
                onDeleted={onDeleted}
                draw={{
                  rectangle: false,
                  circle: false,
                  circlemarker: false,
                  marker: false,
                  polyline: false
                }}
              />
            </FeatureGroup>
            
            {results.map((point, index) => (
              <CircleMarker
                key={index}
                center={[point.lat, point.lng]}
                radius={0.5}
                pathOptions={{ 
                  color: 'red',
                  fillColor: 'red',
                  fillOpacity: 1
                }}
              />
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}