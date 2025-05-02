import React, { useState } from 'react';
import axios from 'axios';

type LatLng = {
  lat: number;
  lng: number;
};

export default function MapPlanner() {
  const [area, setArea] = useState<LatLng[]>([]);
  const [spacing, setSpacing] = useState<number>(6);
  const [results, setResults] = useState<LatLng[]>([]);

  const handleSubmit = async () => {
    try {
      const response = await axios.post<{ plant_locations: LatLng[] }>('/api/generate-planting-points', {
        area,
        spacing,
      });
      setResults(response.data.plant_locations);
    } catch (error: any) {
      console.error('Error generating points:', error.response?.data || error.message);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Plant Layout Generator</h1>

      {/* Simulate coordinate input (replace with actual map later) */}
      <textarea
        className="w-full h-32 p-2 border"
        placeholder="Paste lat/lng JSON array here"
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          try {
            const parsed = JSON.parse(e.target.value);
            if (Array.isArray(parsed)) {
              setArea(parsed);
            }
          } catch {
            setArea([]);
          }
        }}
      />

      <input
        type="number"
        className="border p-2 mt-2"
        value={spacing}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpacing(Number(e.target.value))}
        placeholder="Spacing in meters"
      />

      <button
        onClick={handleSubmit}
        className="bg-blue-500 text-white px-4 py-2 mt-4 rounded"
      >
        Generate Points
      </button>

      {results.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold">Resulting Points:</h2>
          <pre className="bg-gray-100 p-4 overflow-auto h-64">{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}