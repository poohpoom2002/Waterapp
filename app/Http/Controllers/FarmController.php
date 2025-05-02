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
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $plantType = PlantType::findOrFail($request->plant_type_id);
        $area = $request->area;
        
        $plantLocations = $this->calculatePlantLocations($area, $plantType);

        return response()->json(['plant_locations' => $plantLocations]);
    }

    private function calculatePlantLocations($area, $plantType)
    {
        $points = [];
        $bounds = $this->getBounds($area);
        
        $latStep = $plantType->plant_spacing / 111000;
        $lngStep = $plantType->row_spacing / (111000 * cos(deg2rad($bounds['center']['lat'])));

        for ($lat = $bounds['min']['lat']; $lat <= $bounds['max']['lat']; $lat += $latStep) {
            for ($lng = $bounds['min']['lng']; $lng <= $bounds['max']['lng']; $lng += $lngStep) {
                if ($this->isPointInPolygon($lat, $lng, $area)) {
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
}
