<?php

namespace App\Http\Controllers;

use App\Models\PlantType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FarmController extends Controller
{
    public function generatePlantingPoints(Request $request): JsonResponse
    {
        $request->validate([
            'area' => 'required|array|min:3',
            'area.*.lat' => 'required|numeric',
            'area.*.lng' => 'required|numeric',
            'plant_type_id' => 'required|exists:plant_types,id',
            'plant_spacing' => 'required|numeric|min:0.1',
            'row_spacing' => 'required|numeric|min:0.1',
        ]);

        $area = $request->input('area');
        $plantType = PlantType::findOrFail($request->input('plant_type_id'));
        $plantSpacing = $request->input('plant_spacing');
        $rowSpacing = $request->input('row_spacing');

        // Calculate the bounding box of the polygon
        $minLat = min(array_column($area, 'lat'));
        $maxLat = max(array_column($area, 'lat'));
        $minLng = min(array_column($area, 'lng'));
        $maxLng = max(array_column($area, 'lng'));

        // Convert meters to degrees (approximate)
        // 1 degree of latitude = 111,320 meters
        // 1 degree of longitude = 111,320 * cos(latitude) meters
        $latToMeters = 111320;
        $lngToMeters = 111320 * cos(deg2rad(($minLat + $maxLat) / 2));

        $plantSpacingDegrees = $plantSpacing / $lngToMeters;
        $rowSpacingDegrees = $rowSpacing / $latToMeters;

        $points = [];
        $currentLat = $minLat;

        while ($currentLat <= $maxLat) {
            $currentLng = $minLng;
            while ($currentLng <= $maxLng) {
                // Check if the point is inside the polygon
                if ($this->isPointInPolygon($currentLat, $currentLng, $area)) {
                    $points[] = [
                        'lat' => $currentLat,
                        'lng' => $currentLng
                    ];
                }
                $currentLng += $plantSpacingDegrees;
            }
            $currentLat += $rowSpacingDegrees;
        }

        return response()->json(['plant_locations' => $points]);
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
