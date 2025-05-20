<?php

namespace App\Http\Controllers;

use App\Models\Farm;
use App\Models\PlantType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class FarmController extends Controller
{
    public function index()
    {
        return inertia('farms/index');
    }

    public function create()
    {
        return inertia('farms/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'size' => 'required|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $farm = Farm::create($validated);

        return redirect()->route('farms.show', $farm)
            ->with('success', 'Farm created successfully.');
    }

    public function show(Farm $farm)
    {
        return inertia('farms/show', [
            'farm' => $farm->load('plantTypes'),
        ]);
    }

    public function edit(Farm $farm)
    {
        return inertia('farms/edit', [
            'farm' => $farm,
        ]);
    }

    public function update(Request $request, Farm $farm)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'size' => 'required|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $farm->update($validated);

        return redirect()->route('farms.show', $farm)
            ->with('success', 'Farm updated successfully.');
    }

    public function destroy(Farm $farm)
    {
        $farm->delete();

        return redirect()->route('farms.index')
            ->with('success', 'Farm deleted successfully.');
    }

    // Map Planner Methods
    public function planner()
    {
        return inertia('mapplanner');
    }

    public function getPlantTypes()
    {
        $plantTypes = PlantType::all();
        return response()->json($plantTypes);
    }

    public function generatePlantingPoints(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'area' => 'required|array|min:3',
            'area.*.lat' => 'required|numeric',
            'area.*.lng' => 'required|numeric',
            'plant_type_id' => 'required|exists:plant_types,id',
            'plant_spacing' => 'required|numeric|min:0',
            'row_spacing' => 'required|numeric|min:0',
            'exclusion_areas' => 'array', // optional
            'exclusion_areas.*' => 'array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $plantType = PlantType::findOrFail($request->plant_type_id);
        $area = $request->area;
        $exclusionAreas = $request->exclusion_areas ?? [];
        
        $plantLocations = $this->calculatePlantLocations($area, $plantType, $exclusionAreas);

        return response()->json(['plant_locations' => $plantLocations]);
    }

    private function calculatePlantLocations($area, $plantType, $exclusionAreas = [])
    {
        $points = [];
        $bounds = $this->getBounds($area);
        $latStep = $plantType->plant_spacing / 111000;
        $lngStep = $plantType->row_spacing / (111000 * cos(deg2rad($bounds['center']['lat'])));
        $buffer = $plantType->row_spacing / 2; // meters

        for ($lat = $bounds['min']['lat']; $lat <= $bounds['max']['lat']; $lat += $latStep) {
            for ($lng = $bounds['min']['lng']; $lng <= $bounds['max']['lng']; $lng += $lngStep) {
                if ($this->isPointInPolygon($lat, $lng, $area)) {
                    // Exclude if inside any exclusion area
                    $inExclusion = false;
                    foreach ($exclusionAreas as $exclusion) {
                        if ($this->isPointInPolygon($lat, $lng, $exclusion)) {
                            $inExclusion = true;
                            break;
                        }
                    }
                    if ($inExclusion) continue;
                    // Check buffer from field edge
                    $minDist = $this->minDistanceToPolygonEdge($lat, $lng, $area);
                    if ($minDist < $buffer) continue;
                    // Check buffer from all exclusion area edges
                    $tooCloseToExclusion = false;
                    foreach ($exclusionAreas as $exclusion) {
                        $distToExclusion = $this->minDistanceToPolygonEdge($lat, $lng, $exclusion);
                        if ($distToExclusion < $buffer) {
                            $tooCloseToExclusion = true;
                            break;
                        }
                    }
                    if ($tooCloseToExclusion) continue;
                    $points[] = ['lat' => $lat, 'lng' => $lng];
                }
            }
        }
        return $points;
    }

    private function getBounds($area)
    {
        $minLat = PHP_FLOAT_MAX;
        $maxLat = -PHP_FLOAT_MAX;
        $minLng = PHP_FLOAT_MAX;
        $maxLng = -PHP_FLOAT_MAX;

        foreach ($area as $point) {
            $minLat = min($minLat, $point['lat']);
            $maxLat = max($maxLat, $point['lat']);
            $minLng = min($minLng, $point['lng']);
            $maxLng = max($maxLng, $point['lng']);
        }

        return [
            'min' => ['lat' => $minLat, 'lng' => $minLng],
            'max' => ['lat' => $maxLat, 'lng' => $maxLng],
            'center' => [
                'lat' => ($minLat + $maxLat) / 2,
                'lng' => ($minLng + $maxLng) / 2
            ]
        ];
    }

    private function isPointInPolygon($lat, $lng, $polygon)
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

    // Helper: minimum distance from point to any edge of polygon (in meters)
    private function minDistanceToPolygonEdge($lat, $lng, $polygon)
    {
        $minDist = null;
        $n = count($polygon);
        for ($i = 0; $i < $n; $i++) {
            $a = $polygon[$i];
            $b = $polygon[($i+1)%$n];
            $dist = $this->pointToSegmentDistance($lat, $lng, $a['lat'], $a['lng'], $b['lat'], $b['lng']);
            if ($minDist === null || $dist < $minDist) {
                $minDist = $dist;
            }
        }
        return $minDist;
    }

    // Helper: distance from point (px,py) to segment (ax,ay)-(bx,by) in meters
    private function pointToSegmentDistance($px, $py, $ax, $ay, $bx, $by)
    {
        // Convert lat/lng to meters using equirectangular approximation
        $R = 6371000; // Earth radius in meters
        $lat1 = deg2rad($ax);
        $lat2 = deg2rad($bx);
        $latP = deg2rad($px);
        $lng1 = deg2rad($ay);
        $lng2 = deg2rad($by);
        $lngP = deg2rad($py);
        $x1 = $R * $lng1 * cos(($lat1+$lat2)/2);
        $y1 = $R * $lat1;
        $x2 = $R * $lng2 * cos(($lat1+$lat2)/2);
        $y2 = $R * $lat2;
        $xP = $R * $lngP * cos(($lat1+$lat2)/2);
        $yP = $R * $latP;
        $dx = $x2 - $x1;
        $dy = $y2 - $y1;
        if ($dx == 0 && $dy == 0) {
            // a==b
            return sqrt(pow($xP-$x1,2) + pow($yP-$y1,2));
        }
        $t = max(0, min(1, (($xP-$x1)*$dx + ($yP-$y1)*$dy) / ($dx*$dx + $dy*$dy)));
        $projX = $x1 + $t*$dx;
        $projY = $y1 + $t*$dy;
        return sqrt(pow($xP-$projX,2) + pow($yP-$projY,2));
    }
}
