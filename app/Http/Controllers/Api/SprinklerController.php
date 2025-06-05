<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sprinkler;
use Illuminate\Http\Request;

class SprinklerController extends Controller
{
    public function index()
    {
        return response()->json(Sprinkler::all());
    }

    public function calculatePipeLayout(Request $request)
    {
        $request->validate([
            'area' => 'required|array',
            'area.*.lat' => 'required|numeric',
            'area.*.lng' => 'required|numeric',
            'plant_locations' => 'required|array',
            'plant_locations.*.lat' => 'required|numeric',
            'plant_locations.*.lng' => 'required|numeric',
            'sprinkler_id' => 'required|exists:sprinklers,id',
            'plant_spacing' => 'required|numeric',
            'row_spacing' => 'required|numeric'
        ]);

        $sprinkler = Sprinkler::findOrFail($request->sprinkler_id);
        
        // Calculate optimal sprinkler positions based on coverage radius
        $sprinklerPositions = $this->calculateSprinklerPositions(
            $request->plant_locations,
            $sprinkler->max_radius,
            $request->plant_spacing,
            $request->row_spacing
        );

        // Calculate pipe layout connecting sprinklers
        $pipeLayout = $this->calculatePipeConnections($sprinklerPositions);

        return response()->json([
            'sprinkler_positions' => $sprinklerPositions,
            'pipe_layout' => $pipeLayout
        ]);
    }

    private function calculateSprinklerPositions($plantLocations, $coverageRadius, $plantSpacing, $rowSpacing)
    {
        // Group plants into rows
        $rows = [];
        $currentRow = [];
        $lastLat = null;
        $rowTolerance = $rowSpacing / 2;

        foreach ($plantLocations as $plant) {
            if ($lastLat === null || abs($plant['lat'] - $lastLat) <= $rowTolerance) {
                $currentRow[] = $plant;
            } else {
                if (!empty($currentRow)) {
                    $rows[] = $currentRow;
                }
                $currentRow = [$plant];
            }
            $lastLat = $plant['lat'];
        }
        if (!empty($currentRow)) {
            $rows[] = $currentRow;
        }

        // Place one sprinkler per plant
        $sprinklerPositions = [];
        foreach ($rows as $row) {
            foreach ($row as $plant) {
                $sprinklerPositions[] = [
                    'lat' => $plant['lat'],
                    'lng' => $plant['lng']
                ];
            }
        }

        return $sprinklerPositions;
    }

    private function calculatePipeConnections($sprinklerPositions)
    {
        // Group sprinklers into rows by latitude
        $rows = [];
        $currentRow = [];
        $lastLat = null;
        $rowTolerance = 0.0001;

        foreach ($sprinklerPositions as $sprinkler) {
            if ($lastLat === null || abs($sprinkler['lat'] - $lastLat) <= $rowTolerance) {
                $currentRow[] = $sprinkler;
            } else {
                if (!empty($currentRow)) {
                    $rows[] = $currentRow;
                }
                $currentRow = [$sprinkler];
            }
            $lastLat = $sprinkler['lat'];
        }
        if (!empty($currentRow)) {
            $rows[] = $currentRow;
        }

        // Sort rows by latitude (bottom to top)
        usort($rows, function($a, $b) {
            return $a[0]['lat'] <=> $b[0]['lat'];
        });

        // Get the bottom row (lowest latitude)
        $bottomRow = $rows[0];
        usort($bottomRow, function($a, $b) { return $a['lng'] <=> $b['lng']; });

        // Main pipe: from leftmost to rightmost point in the bottom row
        $mainPipeStart = [
            'lat' => $bottomRow[0]['lat'],
            'lng' => $bottomRow[0]['lng']
        ];
        $mainPipeEnd = [
            'lat' => $bottomRow[count($bottomRow)-1]['lat'],
            'lng' => $bottomRow[count($bottomRow)-1]['lng']
        ];

        $pipeLayout = [];
        $pipeLayout[] = [
            'start' => $mainPipeStart,
            'end' => $mainPipeEnd
        ];

        // Group sprinklers by column (unique longitude in bottom row)
        $columns = [];
        foreach ($bottomRow as $sprinkler) {
            $columns[number_format($sprinkler['lng'], 7)] = [];
        }
        // For each sprinkler, assign to the closest column (by longitude)
        foreach ($sprinklerPositions as $sprinkler) {
            $closestLng = null;
            $minDiff = null;
            foreach (array_keys($columns) as $colLngStr) {
                $colLng = floatval($colLngStr);
                $diff = abs($sprinkler['lng'] - $colLng);
                if ($minDiff === null || $diff < $minDiff) {
                    $minDiff = $diff;
                    $closestLng = $colLngStr;
                }
            }
            $columns[$closestLng][] = $sprinkler;
        }
        // For each column, draw a vertical pipe from the main pipe up to the topmost sprinkler
        foreach ($columns as $colLngStr => $colSprinklers) {
            usort($colSprinklers, function($a, $b) { return $a['lat'] <=> $b['lat']; });
            $bottom = $colSprinklers[0];
            $top = $colSprinklers[count($colSprinklers)-1];
            $pipeLayout[] = [
                'start' => ['lat' => $bottom['lat'], 'lng' => $bottom['lng']],
                'end' => ['lat' => $top['lat'], 'lng' => $top['lng']]
            ];
        }

        return $pipeLayout;
    }
} 