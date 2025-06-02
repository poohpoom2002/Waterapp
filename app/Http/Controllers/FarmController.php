<?php

namespace App\Http\Controllers;

use App\Models\Farm;
use App\Models\PlantType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Illuminate\Support\Facades\Http;

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

        // No elevation fetching or usage

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

                    // Add point (no elevation)
                    $points[] = [
                        'lat' => $lat,
                        'lng' => $lng
                    ];
                }
            }
        }
        return $points;
    }

    private function getAreaElevationData($bounds)
    {
        try {
            \Log::info('Fetching elevation data for bounds:', $bounds);
            
            $response = Http::get('https://portal.opentopography.org/API/globaldem', [
                'demtype' => 'SRTMGL1',
                'south' => $bounds['min']['lat'],
                'north' => $bounds['max']['lat'],
                'east' => $bounds['max']['lng'],
                'west' => $bounds['min']['lng'],
                'outputFormat' => 'AAIGrid',
                'API_Key' => '4cd21a1605439f9d3cc521cb698900b5'
            ]);

            if ($response->successful()) {
                \Log::info('Elevation API response received');
                $elevationData = $this->parseElevationData($response->body());
                \Log::info('Parsed elevation data:', ['count' => count($elevationData)]);
                return $elevationData;
            } else {
                \Log::error('Elevation API error:', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Error fetching area elevation data: ' . $e->getMessage());
        }
        return [];
    }

    private function parseElevationData($responseBody)
    {
        try {
            \Log::info('Starting elevation data parsing');
            
            if (empty($responseBody)) {
                \Log::error('Empty response body received');
                return [];
            }
            
            // Split the response into lines
            $lines = explode("\n", $responseBody);
            \Log::info('Response split into lines:', ['count' => count($lines)]);
            
            if (count($lines) < 7) {
                \Log::error('Invalid response format: too few lines', ['line_count' => count($lines)]);
                return [];
            }
            
            // Parse header information
            $header = [];
            $requiredHeaders = ['ncols', 'nrows', 'xllcorner', 'yllcorner', 'cellsize', 'NODATA_value'];
            $headerFound = 0;
            
            for ($i = 0; $i < 6; $i++) {
                if (isset($lines[$i])) {
                    $parts = preg_split('/\s+/', trim($lines[$i]));
                    if (count($parts) >= 2) {
                        $key = strtolower($parts[0]);
                        $value = floatval($parts[1]);
                        $header[$key] = $value;
                        if (in_array($key, $requiredHeaders)) {
                            $headerFound++;
                        }
                    }
                }
            }
            
            if ($headerFound < count($requiredHeaders)) {
                \Log::error('Missing required header information', [
                    'found_headers' => array_keys($header),
                    'required_headers' => $requiredHeaders
                ]);
                return [];
            }
            
            // Extract grid parameters
            $ncols = intval($header['ncols']);
            $nrows = intval($header['nrows']);
            $xllcorner = floatval($header['xllcorner']);
            $yllcorner = floatval($header['yllcorner']);
            $cellsize = floatval($header['cellsize']);
            $NODATA_value = floatval($header['NODATA_value']);
            
            \Log::info('Grid parameters:', [
                'ncols' => $ncols,
                'nrows' => $nrows,
                'xllcorner' => $xllcorner,
                'yllcorner' => $yllcorner,
                'cellsize' => $cellsize,
                'NODATA_value' => $NODATA_value
            ]);
            
            if ($ncols <= 0 || $nrows <= 0 || $cellsize <= 0) {
                \Log::error('Invalid grid parameters', [
                    'ncols' => $ncols,
                    'nrows' => $nrows,
                    'cellsize' => $cellsize
                ]);
                return [];
            }
            
            $elevations = [];
            $dataStart = 6; // Skip header lines
            $validPoints = 0;
            $invalidPoints = 0;
            
            for ($i = $dataStart; $i < count($lines); $i++) {
                $line = trim($lines[$i]);
                if (empty($line)) continue;
                
                $rowIndex = $i - $dataStart;
                if ($rowIndex >= $nrows) break; // Stop if we've processed all rows
                
                $values = preg_split('/\s+/', $line);
                if (count($values) !== $ncols) {
                    \Log::warning('Invalid number of columns in row', [
                        'row' => $rowIndex,
                        'expected' => $ncols,
                        'found' => count($values)
                    ]);
                    continue;
                }
                
                foreach ($values as $colIndex => $value) {
                    if (is_numeric($value)) {
                        $elevation = floatval($value);
                        if ($elevation > $NODATA_value) {
                            // Calculate lat/lng for this grid cell
                            // Note: AAIGrid uses bottom-left corner, so we need to adjust
                            $lat = $yllcorner + ($nrows - $rowIndex - 0.5) * $cellsize;
                            $lng = $xllcorner + ($colIndex + 0.5) * $cellsize;
                            
                            $elevations[] = [
                                'lat' => $lat,
                                'lng' => $lng,
                                'elevation' => $elevation
                            ];
                            $validPoints++;
                        } else {
                            $invalidPoints++;
                        }
                    }
                }
            }
            
            \Log::info('Parsed elevations:', [
                'total_points' => count($elevations),
                'valid_points' => $validPoints,
                'invalid_points' => $invalidPoints,
                'min' => count($elevations) > 0 ? min(array_column($elevations, 'elevation')) : null,
                'max' => count($elevations) > 0 ? max(array_column($elevations, 'elevation')) : null,
                'sample' => array_slice($elevations, 0, 5)
            ]);
            
            if (count($elevations) === 0) {
                \Log::error('No valid elevation points found in the data');
                return [];
            }
            
            return $elevations;
        } catch (\Exception $e) {
            \Log::error('Error parsing elevation data: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return [];
        }
    }

    private function getPointElevation($lat, $lng, $elevationData)
    {
        if (empty($elevationData)) {
            \Log::warning('No elevation data available for point', ['lat' => $lat, 'lng' => $lng]);
            return 0;
        }

        \Log::info('Getting elevation for point:', [
            'lat' => $lat,
            'lng' => $lng,
            'elevation_data_count' => count($elevationData)
        ]);

        // Find the closest elevation point
        $closestElevation = null;
        $minDistance = PHP_FLOAT_MAX;
        $closestPoint = null;

        foreach ($elevationData as $point) {
            if (isset($point['lat']) && isset($point['lng']) && isset($point['elevation'])) {
                $distance = $this->calculateDistance($lat, $lng, $point['lat'], $point['lng']);
                if ($distance < $minDistance) {
                    $minDistance = $distance;
                    $closestElevation = $point['elevation'];
                    $closestPoint = $point;
                }
            }
        }

        \Log::info('Found closest elevation point:', [
            'closest_point' => $closestPoint,
            'distance' => $minDistance,
            'elevation' => $closestElevation
        ]);

        return $closestElevation ?? 0;
    }

    private function calculateDistance($lat1, $lng1, $lat2, $lng2)
    {
        $R = 6371000; // Earth radius in meters
        $lat1 = deg2rad($lat1);
        $lat2 = deg2rad($lat2);
        $dlat = deg2rad($lat2 - $lat1);
        $dlng = deg2rad($lng2 - $lng1);

        $a = sin($dlat/2) * sin($dlat/2) +
             cos($lat1) * cos($lat2) *
             sin($dlng/2) * sin($dlng/2);
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));

        return $R * $c;
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

    public function getElevation(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'coordinates' => 'required|array',
            'coordinates.*.lat' => 'required|numeric',
            'coordinates.*.lng' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $coordinates = $request->coordinates;
        $coordinatesWithElevation = [];
        $retryCount = 0;
        $maxRetries = 3;

        foreach ($coordinates as $coord) {
            try {
                // Calculate a bounding box that's at least 250 meters on each side
                // 0.0025 degrees is approximately 250 meters at the equator
                $latOffset = 0.0025;
                $lngOffset = 0.0025 / cos(deg2rad($coord['lat'])); // Adjust for latitude

                $elevation = null;
                $retryCount = 0;

                while ($elevation === null && $retryCount < $maxRetries) {
                    try {
                        \Log::info('Attempting to fetch elevation data', [
                            'attempt' => $retryCount + 1,
                            'lat' => $coord['lat'],
                            'lng' => $coord['lng']
                        ]);

                        // Call OpenTopography API to get elevation data
                        $response = Http::timeout(30)->get('https://portal.opentopography.org/API/globaldem', [
                            'demtype' => 'SRTMGL1',
                            'south' => $coord['lat'] - $latOffset,
                            'north' => $coord['lat'] + $latOffset,
                            'east' => $coord['lng'] + $lngOffset,
                            'west' => $coord['lng'] - $lngOffset,
                            'outputFormat' => 'AAIGrid',
                            'API_Key' => '4cd21a1605439f9d3cc521cb698900b5'
                        ]);

                        \Log::info('OpenTopography API response', [
                            'status' => $response->status(),
                            'headers' => $response->headers(),
                            'body_length' => strlen($response->body())
                        ]);

                        \Log::info('OpenTopography raw response body', [
                            'lat' => $coord['lat'],
                            'lng' => $coord['lng'],
                            'body' => $response->body()
                        ]);

                        if ($response->successful()) {
                            $elevationData = $this->parseElevationData($response->body());
                            
                            if (!empty($elevationData)) {
                                // Get the elevation at the center point
                                $elevation = $this->getPointElevation($coord['lat'], $coord['lng'], $elevationData);
                                
                                if ($elevation !== null && $elevation !== 0) {
                                    \Log::info('Successfully retrieved elevation', [
                                        'lat' => $coord['lat'],
                                        'lng' => $coord['lng'],
                                        'elevation' => $elevation
                                    ]);
                                    break; // Exit the retry loop on success
                                }
                                
                                \Log::warning('Invalid elevation value received', [
                                    'lat' => $coord['lat'],
                                    'lng' => $coord['lng'],
                                    'elevation' => $elevation,
                                    'elevation_data_count' => count($elevationData)
                                ]);
                            } else {
                                \Log::warning('No elevation data parsed from response', [
                                    'lat' => $coord['lat'],
                                    'lng' => $coord['lng'],
                                    'response_length' => strlen($response->body())
                                ]);
                            }
                        } else {
                            \Log::error('OpenTopography API error', [
                                'status' => $response->status(),
                                'body' => $response->body(),
                                'lat' => $coord['lat'],
                                'lng' => $coord['lng']
                            ]);
                        }
                        
                        $retryCount++;
                        if ($retryCount < $maxRetries) {
                            sleep(1); // Wait 1 second before retrying
                        }
                    } catch (\Exception $e) {
                        \Log::error('Error during elevation fetch attempt', [
                            'attempt' => $retryCount + 1,
                            'error' => $e->getMessage(),
                            'lat' => $coord['lat'],
                            'lng' => $coord['lng']
                        ]);
                        $retryCount++;
                        if ($retryCount < $maxRetries) {
                            sleep(1); // Wait 1 second before retrying
                        }
                    }
                }

                // If we still don't have a valid elevation after all retries
                if ($elevation === null || $elevation === 0) {
                    \Log::error('Failed to get valid elevation after all retries', [
                        'lat' => $coord['lat'],
                        'lng' => $coord['lng']
                    ]);
                }

                $coordinatesWithElevation[] = [
                    'lat' => $coord['lat'],
                    'lng' => $coord['lng'],
                    'elevation' => $elevation ?? 0
                ];

            } catch (\Exception $e) {
                \Log::error('Error in elevation processing', [
                    'error' => $e->getMessage(),
                    'lat' => $coord['lat'],
                    'lng' => $coord['lng']
                ]);
                $coordinatesWithElevation[] = [
                    'lat' => $coord['lat'],
                    'lng' => $coord['lng'],
                    'elevation' => 0
                ];
            }
        }

        return response()->json(['coordinates' => $coordinatesWithElevation]);
    }
}
