<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FarmController extends Controller
{
    public function generatePlantingPoints(Request $request): JsonResponse
    {
        $request->validate([
            'area' => 'required|array',
            'area.*.lat' => 'required|numeric',
            'area.*.lng' => 'required|numeric',
            'spacing' => 'required|numeric|min:1',
        ]);

        $area = $request->input('area');
        $spacing = $request->input('spacing');

        // Calculate the bounding box of the area
        $minLat = min(array_column($area, 'lat'));
        $maxLat = max(array_column($area, 'lat'));
        $minLng = min(array_column($area, 'lng'));
        $maxLng = max(array_column($area, 'lng'));

        // Generate grid points
        $plantLocations = [];
        $lat = $minLat;
        while ($lat <= $maxLat) {
            $lng = $minLng;
            while ($lng <= $maxLng) {
                // Check if point is inside the polygon (area)
                if ($this->isPointInPolygon($lat, $lng, $area)) {
                    $plantLocations[] = [
                        'lat' => $lat,
                        'lng' => $lng,
                    ];
                }
                // Move to next point (spacing in degrees, approximately)
                $lng += $spacing / 111320; // Convert meters to degrees (approximate)
            }
            $lat += $spacing / 111320; // Convert meters to degrees (approximate)
        }

        return response()->json(['plant_locations' => $plantLocations]);
    }

    private function isPointInPolygon(float $lat, float $lng, array $polygon): bool
    {
        $inside = false;
        $j = count($polygon) - 1;

        for ($i = 0; $i < count($polygon); $i++) {
            if (($polygon[$i]['lat'] > $lat) != ($polygon[$j]['lat'] > $lat) &&
                ($lng < ($polygon[$j]['lng'] - $polygon[$i]['lng']) * ($lat - $polygon[$i]['lat']) /
                    ($polygon[$j]['lat'] - $polygon[$i]['lat']) + $polygon[$i]['lng'])) {
                $inside = !$inside;
            }
            $j = $i;
        }

        return $inside;
    }
}
