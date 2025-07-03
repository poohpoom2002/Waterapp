<?php

namespace App\Services;

class HomeGardenService
{
    const EARTH_RADIUS_METERS = 6371000;

    /**
     * Calculate sprinkler positions within a polygon using a grid method.
     *
     * @param array $polygon The vertices of the area [{lat, lng}, ...]
     * @param float $radius The sprinkler radius in meters.
     * @return array
     */
    public function calculateSprinklerPositions(array $polygon, float $radius): array
    {
        if (count($polygon) < 3) {
            return [];
        }

        // Use a hexagonal grid for more efficient coverage (spacing = radius * sqrt(3))
        $spacing = $radius * 1.732; // sqrt(3) for hex grid
        
        // 1. Get Bounding Box
        $minLat = $polygon[0]['lat'];
        $maxLat = $polygon[0]['lat'];
        $minLng = $polygon[0]['lng'];
        $maxLng = $polygon[0]['lng'];

        foreach ($polygon as $point) {
            $minLat = min($minLat, $point['lat']);
            $maxLat = max($maxLat, $point['lat']);
            $minLng = min($minLng, $point['lng']);
            $maxLng = max($maxLng, $point['lng']);
        }

        // 2. Calculate grid steps in degrees
        $latStep = $this->metersToLatitudeDegrees($spacing);
        $lngStep = $this->metersToLongitudeDegrees($spacing, $minLat);

        $sprinklers = [];
        $idCounter = 0;
        $y = $minLat;
        $isOddRow = false;

        while ($y < $maxLat) {
            $x = $minLng;
            if ($isOddRow) {
                $x += $lngStep / 2; // Offset for hexagonal pattern
            }

            while ($x < $maxLng) {
                if ($this->isPointInPolygon(['lat' => $y, 'lng' => $x], $polygon)) {
                    $sprinklers[] = [
                        'lat' => $y,
                        'lng' => $x,
                        'id' => 'sprinkler-' . $idCounter++,
                    ];
                }
                $x += $lngStep;
            }
            $y += $latStep * 0.866; // Move by height of equilateral triangle
            $isOddRow = !$isOddRow;
        }

        return $sprinklers;
    }

    /**
     * Calculate optimal pipe layout using Prim's algorithm for a Minimum Spanning Tree.
     *
     * @param array $sprinklers
     * @param array $waterSource
     * @return array
     */
    public function calculatePipeLayout(array $sprinklers, array $waterSource): array
    {
        $nodes = array_merge([$waterSource], $sprinklers);
        $nodeCount = count($nodes);
        if ($nodeCount < 2) {
            return [];
        }

        $mst = []; // Minimum Spanning Tree (the final pipe layout)
        $visited = array_fill(0, $nodeCount, false);
        $minEdge = array_fill(0, $nodeCount, ['weight' => INF, 'from' => -1]);

        // Start with the water source (node 0)
        $minEdge[0]['weight'] = 0;
        
        for ($i = 0; $i < $nodeCount; $i++) {
            // Find the unvisited node with the smallest edge weight
            $u = -1;
            for ($v = 0; $v < $nodeCount; $v++) {
                if (!$visited[$v] && ($u === -1 || $minEdge[$v]['weight'] < $minEdge[$u]['weight'])) {
                    $u = $v;
                }
            }

            if ($minEdge[$u]['weight'] === INF) continue; // No path found

            $visited[$u] = true;

            // If it's not the starting node, add the edge to the MST
            if ($minEdge[$u]['from'] !== -1) {
                $fromNode = $nodes[$minEdge[$u]['from']];
                $toNode = $nodes[$u];
                $mst[] = [
                    'start' => ['lat' => $fromNode['lat'], 'lng' => $fromNode['lng']],
                    'end' => ['lat' => $toNode['lat'], 'lng' => $toNode['lng']],
                    'length' => $minEdge[$u]['weight'],
                    'from_type' => ($minEdge[$u]['from'] == 0) ? 'source' : 'sprinkler',
                    'to_type' => 'sprinkler',
                    'id' => 'pipe-' . $minEdge[$u]['from'] . '-' . $u,
                ];
            }

            // Update edge weights for adjacent nodes
            for ($v = 0; $v < $nodeCount; $v++) {
                if (!$visited[$v]) {
                    $weight = $this->haversineDistance($nodes[$u], $nodes[$v]);
                    if ($weight < $minEdge[$v]['weight']) {
                        $minEdge[$v] = ['weight' => $weight, 'from' => $u];
                    }
                }
            }
        }

        return $mst;
    }

    /**
     * Check if a point is inside a polygon.
     */
    private function isPointInPolygon(array $point, array $polygon): bool
    {
        $intersections = 0;
        $vertexCount = count($polygon);

        for ($i = 0, $j = $vertexCount - 1; $i < $vertexCount; $j = $i++) {
            $p1 = $polygon[$i];
            $p2 = $polygon[$j];

            if (($p1['lng'] > $point['lng']) != ($p2['lng'] > $point['lng']) &&
                ($point['lat'] < ($p2['lat'] - $p1['lat']) * ($point['lng'] - $p1['lng']) / ($p2['lng'] - $p1['lng']) + $p1['lat'])) {
                $intersections++;
            }
        }
        return ($intersections % 2) != 0;
    }

    /**
     * Calculate distance between two lat/lng points in meters.
     */
    private function haversineDistance(array $point1, array $point2): float
    {
        $lat1 = deg2rad($point1['lat']);
        $lng1 = deg2rad($point1['lng']);
        $lat2 = deg2rad($point2['lat']);
        $lng2 = deg2rad($point2['lng']);

        $dLat = $lat2 - $lat1;
        $dLng = $lng2 - $lng1;

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos($lat1) * cos($lat2) *
             sin($dLng / 2) * sin($dLng / 2);
        
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return self::EARTH_RADIUS_METERS * $c;
    }

    private function metersToLatitudeDegrees(float $meters): float
    {
        return $meters / 111132; // Approximation
    }

    private function metersToLongitudeDegrees(float $meters, float $latitude): float
    {
        return $meters / (111320 * cos(deg2rad($latitude))); // Approximation
    }
}
