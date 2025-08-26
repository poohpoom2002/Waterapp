// autoZoneUtils.ts - Automatic Zone Division Utilities

import { Coordinate, PlantLocation, IrrigationZone } from './irrigationZoneUtils';

// Seeded random number generator (LCG - Linear Congruential Generator)
class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    next(): number {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }

    // เหมือน Math.random() - 0.5 แต่ใช้ seed
    compareFunction(): number {
        return this.next() - 0.5;
    }
}

export interface AutoZoneConfig {
    numberOfZones: number;
    balanceWaterNeed: boolean;
    debugMode: boolean;
    paddingMeters: number;
    useVoronoi: boolean;
    randomSeed?: number; // เพื่อสร้างรูปแบบโซนที่แตกต่างกัน
}

export interface AutoZoneResult {
    zones: IrrigationZone[];
    debugInfo: AutoZoneDebugInfo;
    success: boolean;
    error?: string;
    validation?: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
}

export interface AutoZoneDebugInfo {
    totalPlants: number;
    totalWaterNeed: number;
    averageWaterNeedPerZone: number;
    actualWaterNeedPerZone: number[];
    waterNeedVariance: number;
    waterNeedStandardDeviation: number;
    waterBalanceEfficiency: number; // 0-100% how well balanced the water needs are
    maxWaterNeedDeviation: number;
    minWaterNeedDeviation: number;
    waterNeedDeviationPercent: number; // Max deviation as percentage of average
    convexHullPoints: Coordinate[][];
    plantAssignments: { [plantId: string]: string }; // plantId -> zoneId
    timeTaken: number;
    waterBalanceDetails: {
        zoneIndex: number;
        waterNeed: number;
        deviation: number;
        deviationPercent: number;
        plantCount: number;
    }[];
}

// Generate unique colors for zones
export const generateZoneColors = (count: number, randomSeed?: number): string[] => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D2B4DE'
    ];
    
    // Shuffle colors if randomSeed is provided for more visual variety
    const availableColors = [...colors];
    if (randomSeed !== undefined) {
        const seededRandom = new SeededRandom(randomSeed + 1000); // Add offset to differentiate from clustering seed
        availableColors.sort(() => seededRandom.compareFunction());
    }
    
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
        if (i < availableColors.length) {
            result.push(availableColors[i]);
        } else {
            // Generate additional colors using HSL with optional randomization
            let hue = (i * 137.508) % 360; // Golden angle approximation
            if (randomSeed !== undefined) {
                const seededRandom = new SeededRandom(randomSeed + 2000 + i);
                hue = seededRandom.next() * 360;
            }
            result.push(`hsl(${hue}, 70%, 60%)`);
        }
    }
    return result;
};

// Convex Hull using Graham Scan algorithm
export const convexHull = (points: Coordinate[]): Coordinate[] => {
    if (points.length < 3) return points;

    // Find the bottom-most point (and leftmost in case of tie)
    let start = 0;
    for (let i = 1; i < points.length; i++) {
        if (points[i].lat < points[start].lat || 
            (points[i].lat === points[start].lat && points[i].lng < points[start].lng)) {
            start = i;
        }
    }

    // Sort points by polar angle with respect to start point
    const startPoint = points[start];
    const sortedPoints = points.filter((_, i) => i !== start).sort((a, b) => {
        const angleA = Math.atan2(a.lat - startPoint.lat, a.lng - startPoint.lng);
        const angleB = Math.atan2(b.lat - startPoint.lat, b.lng - startPoint.lng);
        
        if (angleA === angleB) {
            // If angles are equal, sort by distance
            const distA = Math.pow(a.lat - startPoint.lat, 2) + Math.pow(a.lng - startPoint.lng, 2);
            const distB = Math.pow(b.lat - startPoint.lat, 2) + Math.pow(b.lng - startPoint.lng, 2);
            return distA - distB;
        }
        return angleA - angleB;
    });

    const hull = [startPoint];
    
    for (const point of sortedPoints) {
        // Remove points that make clockwise turn
        while (hull.length > 1 && 
               crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
            hull.pop();
        }
        hull.push(point);
    }

    return hull;
};

// Calculate cross product for three points
const crossProduct = (o: Coordinate, a: Coordinate, b: Coordinate): number => {
    return (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
};

// Check if a point is inside a polygon using ray casting algorithm
export const isPointInPolygon = (point: Coordinate, polygon: Coordinate[]): boolean => {
    let inside = false;
    const x = point.lng;
    const y = point.lat;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng;
        const yi = polygon[i].lat;
        const xj = polygon[j].lng;
        const yj = polygon[j].lat;

        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }

    return inside;
};

// Water-need-aware K-means clustering for plant grouping
export const kMeansCluster = (plants: PlantLocation[], k: number, maxIterations: number = 100, balanceWaterNeed: boolean = false, randomSeed?: number): PlantLocation[][] => {
    if (plants.length === 0 || k <= 0) return [];
    if (k >= plants.length) return plants.map(plant => [plant]);

    if (balanceWaterNeed) {
        return waterNeedAwareCluster(plants, k, maxIterations, randomSeed);
    }

    // Initialize centroids randomly with seeded randomization
    const centroids: Coordinate[] = [];
    const seededRandom = randomSeed !== undefined ? new SeededRandom(randomSeed) : null;
    
    // Create multiple shuffled versions and select the best spread
    const shuffled = [...plants].sort(() => seededRandom ? seededRandom.compareFunction() : Math.random() - 0.5);
    
    // Use K-means++ initialization for better initial centroids when using seeded random
    if (seededRandom) {
        // Choose first centroid randomly
        const firstIndex = Math.floor(seededRandom.next() * shuffled.length);
        centroids.push({ ...shuffled[firstIndex].position });
        
        // Choose remaining centroids based on distance from existing ones
        for (let i = 1; i < k && i < shuffled.length; i++) {
            const distances = shuffled.map(plant => {
                const minDist = Math.min(...centroids.map(centroid => 
                    calculateDistance(plant.position, centroid)
                ));
                return minDist * minDist; // Square the distance for K-means++
            });
            
            const totalDistance = distances.reduce((sum, d) => sum + d, 0);
            const randomValue = seededRandom.next() * totalDistance;
            
            let cumulativeDistance = 0;
            let selectedIndex = 0;
            for (let j = 0; j < distances.length; j++) {
                cumulativeDistance += distances[j];
                if (cumulativeDistance >= randomValue) {
                    selectedIndex = j;
                    break;
                }
            }
            
            centroids.push({ ...shuffled[selectedIndex].position });
        }
    } else {
        // Standard random initialization
        for (let i = 0; i < k; i++) {
            centroids.push({ ...shuffled[i].position });
        }
    }

    let clusters: PlantLocation[][] = Array(k).fill(null).map(() => []);
    let iteration = 0;

    while (iteration < maxIterations) {
        // Clear clusters
        clusters = Array(k).fill(null).map(() => []);

        // Assign each plant to nearest centroid
        for (const plant of plants) {
            let minDistance = Infinity;
            let closestCentroid = 0;

            for (let i = 0; i < centroids.length; i++) {
                const distance = calculateDistance(plant.position, centroids[i]);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCentroid = i;
                }
            }

            clusters[closestCentroid].push(plant);
        }

        // Update centroids
        let converged = true;
        for (let i = 0; i < k; i++) {
            if (clusters[i].length === 0) continue;

            const newCentroid = {
                lat: clusters[i].reduce((sum, plant) => sum + plant.position.lat, 0) / clusters[i].length,
                lng: clusters[i].reduce((sum, plant) => sum + plant.position.lng, 0) / clusters[i].length
            };

            if (calculateDistance(centroids[i], newCentroid) > 0.0001) {
                converged = false;
            }

            centroids[i] = newCentroid;
        }

        if (converged) break;
        iteration++;
    }

    return clusters.filter(cluster => cluster.length > 0);
};

// Improved water-need-aware clustering algorithm with perfect balance
export const waterNeedAwareCluster = (plants: PlantLocation[], k: number, maxIterations: number = 100, randomSeed?: number): PlantLocation[][] => {
    const totalWaterNeed = plants.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0);
    const targetWaterNeedPerZone = totalWaterNeed / k;
    
    // Use improved perfect water balance algorithm
    return perfectWaterBalanceCluster(plants, k, targetWaterNeedPerZone, maxIterations, randomSeed);
};

// Perfect water balance clustering using greedy algorithm
const perfectWaterBalanceCluster = (plants: PlantLocation[], k: number, targetWaterNeed: number, maxIterations: number = 100, randomSeed?: number): PlantLocation[][] => {
    const seededRandom = randomSeed !== undefined ? new SeededRandom(randomSeed) : null;
    const tolerance = targetWaterNeed * 0.01; // 1% tolerance for perfect balance
    
    // Initialize clusters
    const clusters: PlantLocation[][] = Array(k).fill(null).map(() => []);
    const clusterWaterNeeds: number[] = Array(k).fill(0);
    
    // Sort plants by water need (descending) for greedy assignment
    const sortedPlants = [...plants].sort((a, b) => {
        const waterDiff = b.plantData.waterNeed - a.plantData.waterNeed;
        // Add randomization for equal water needs
        if (Math.abs(waterDiff) < 0.001) {
            return seededRandom ? seededRandom.compareFunction() : Math.random() - 0.5;
        }
        return waterDiff;
    });
    
    // Greedy assignment: assign each plant to the cluster with least water need
    sortedPlants.forEach(plant => {
        let bestClusterIndex = 0;
        let minWaterNeed = clusterWaterNeeds[0];
        
        // Find cluster with minimum water need
        for (let i = 1; i < k; i++) {
            if (clusterWaterNeeds[i] < minWaterNeed) {
                minWaterNeed = clusterWaterNeeds[i];
                bestClusterIndex = i;
            }
        }
        
        clusters[bestClusterIndex].push(plant);
        clusterWaterNeeds[bestClusterIndex] += plant.plantData.waterNeed;
    });
    
    // Fine-tune with iterative improvements for perfect balance
    for (let iteration = 0; iteration < maxIterations; iteration++) {
        let improved = false;
        
        // Check if balance is already perfect
        const maxDeviation = Math.max(...clusterWaterNeeds.map(need => Math.abs(need - targetWaterNeed)));
        if (maxDeviation <= tolerance) {
            break; // Perfect balance achieved
        }
        
        // Try to improve balance by swapping plants
        for (let i = 0; i < k && !improved; i++) {
            for (let j = i + 1; j < k && !improved; j++) {
                const clusterI = clusters[i];
                const clusterJ = clusters[j];
                const waterI = clusterWaterNeeds[i];
                const waterJ = clusterWaterNeeds[j];
                
                // Skip if both clusters are already balanced
                if (Math.abs(waterI - targetWaterNeed) <= tolerance && 
                    Math.abs(waterJ - targetWaterNeed) <= tolerance) {
                    continue;
                }
                
                // Try swapping plants between clusters
                for (let pi = 0; pi < clusterI.length && !improved; pi++) {
                    for (let pj = 0; pj < clusterJ.length && !improved; pj++) {
                        const plantI = clusterI[pi];
                        const plantJ = clusterJ[pj];
                        
                        // Calculate new water needs after swap
                        const newWaterI = waterI - plantI.plantData.waterNeed + plantJ.plantData.waterNeed;
                        const newWaterJ = waterJ - plantJ.plantData.waterNeed + plantI.plantData.waterNeed;
                        
                        // Check if swap improves balance
                        const currentDeviation = Math.abs(waterI - targetWaterNeed) + Math.abs(waterJ - targetWaterNeed);
                        const newDeviation = Math.abs(newWaterI - targetWaterNeed) + Math.abs(newWaterJ - targetWaterNeed);
                        
                        if (newDeviation < currentDeviation) {
                            // Perform swap
                            clusterI[pi] = plantJ;
                            clusterJ[pj] = plantI;
                            clusterWaterNeeds[i] = newWaterI;
                            clusterWaterNeeds[j] = newWaterJ;
                            improved = true;
                        }
                    }
                }
                
                // Try moving single plants between clusters
                if (!improved) {
                    for (let pi = 0; pi < clusterI.length && !improved; pi++) {
                        const plant = clusterI[pi];
                        const newWaterI = waterI - plant.plantData.waterNeed;
                        const newWaterJ = waterJ + plant.plantData.waterNeed;
                        
                        const currentDeviation = Math.abs(waterI - targetWaterNeed) + Math.abs(waterJ - targetWaterNeed);
                        const newDeviation = Math.abs(newWaterI - targetWaterNeed) + Math.abs(newWaterJ - targetWaterNeed);
                        
                        if (newDeviation < currentDeviation) {
                            // Move plant from i to j
                            clusterI.splice(pi, 1);
                            clusterJ.push(plant);
                            clusterWaterNeeds[i] = newWaterI;
                            clusterWaterNeeds[j] = newWaterJ;
                            improved = true;
                        }
                    }
                }
            }
        }
        
        if (!improved) break;
    }
    
    return clusters.filter(cluster => cluster.length > 0);

};



// Calculate distance between two coordinates
export const calculateDistance = (coord1: Coordinate, coord2: Coordinate): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Balance water needs across zones by reassigning plants
export const balanceWaterNeeds = (
    clusters: PlantLocation[][],
    targetWaterNeedPerZone: number,
    tolerance: number = 0.1
): PlantLocation[][] => {
    const balancedClusters = clusters.map(cluster => [...cluster]);
    
    // Calculate current water needs
    const getClusterWaterNeed = (cluster: PlantLocation[]): number => {
        return cluster.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0);
    };

    let improved = true;
    let iterations = 0;
    const maxIterations = 100;

    while (improved && iterations < maxIterations) {
        improved = false;
        iterations++;

        for (let i = 0; i < balancedClusters.length; i++) {
            for (let j = i + 1; j < balancedClusters.length; j++) {
                const waterNeedI = getClusterWaterNeed(balancedClusters[i]);
                const waterNeedJ = getClusterWaterNeed(balancedClusters[j]);

                // Skip if both zones are already balanced
                if (Math.abs(waterNeedI - targetWaterNeedPerZone) <= targetWaterNeedPerZone * tolerance &&
                    Math.abs(waterNeedJ - targetWaterNeedPerZone) <= targetWaterNeedPerZone * tolerance) {
                    continue;
                }

                // Try swapping plants between clusters
                for (let pi = 0; pi < balancedClusters[i].length; pi++) {
                    for (let pj = 0; pj < balancedClusters[j].length; pj++) {
                        const plantI = balancedClusters[i][pi];
                        const plantJ = balancedClusters[j][pj];

                        // Calculate new water needs after swap
                        const newWaterNeedI = waterNeedI - plantI.plantData.waterNeed + plantJ.plantData.waterNeed;
                        const newWaterNeedJ = waterNeedJ - plantJ.plantData.waterNeed + plantI.plantData.waterNeed;

                        // Calculate current and new variance
                        const currentVariance = Math.pow(waterNeedI - targetWaterNeedPerZone, 2) + 
                                              Math.pow(waterNeedJ - targetWaterNeedPerZone, 2);
                        const newVariance = Math.pow(newWaterNeedI - targetWaterNeedPerZone, 2) + 
                                          Math.pow(newWaterNeedJ - targetWaterNeedPerZone, 2);

                        // If swap improves balance, do it
                        if (newVariance < currentVariance) {
                            balancedClusters[i][pi] = plantJ;
                            balancedClusters[j][pj] = plantI;
                            improved = true;
                        }
                    }
                }
            }
        }
    }

    return balancedClusters;
};

// Enhanced water need balancing with adaptive tolerance for better zone distribution
export const enhancedBalanceWaterNeeds = (
    clusters: PlantLocation[][],
    targetWaterNeedPerZone: number,
    tolerance: number = 0.05 // Increased to 5% for more realistic balance, especially for 3+ zones
): PlantLocation[][] => {
    const balancedClusters = clusters.map(cluster => [...cluster]);
    
    // Adaptive tolerance based on number of zones - more zones = more tolerance needed
    const adaptiveTolerance = Math.min(0.10, tolerance + (clusters.length - 2) * 0.01); // Max 10% tolerance
    
    const getClusterWaterNeed = (cluster: PlantLocation[]): number => {
        return cluster.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0);
    };

    const getMaxDeviation = (clusters: PlantLocation[][]): number => {
        const waterNeeds = clusters.map(getClusterWaterNeed);
        return Math.max(...waterNeeds.map(need => Math.abs(need - targetWaterNeedPerZone)));
    };

    let improved = true;
    let iterations = 0;
    const maxIterations = Math.min(1000, clusters.length * 200); // Scale iterations with zone count
    let currentMaxDeviation = getMaxDeviation(balancedClusters);
    const strictTolerance = targetWaterNeedPerZone * adaptiveTolerance;

    console.log(`🔧 Starting enhanced water balance for ${clusters.length} zones:`);
    console.log(`   - Target water per zone: ${targetWaterNeedPerZone.toFixed(2)}`);
    console.log(`   - Base tolerance: ${(tolerance * 100).toFixed(1)}%`);
    console.log(`   - Adaptive tolerance: ${(adaptiveTolerance * 100).toFixed(1)}%`);
    console.log(`   - Strict tolerance: ±${strictTolerance.toFixed(2)}`);
    console.log(`   - Initial max deviation: ${currentMaxDeviation.toFixed(2)}`);

    while (improved && iterations < maxIterations && currentMaxDeviation > strictTolerance) {
        improved = false;
        iterations++;

        // Get current water needs
        const clusterWaterNeeds = balancedClusters.map((cluster, index) => ({
            index,
            waterNeed: getClusterWaterNeed(cluster),
            deviation: Math.abs(getClusterWaterNeed(cluster) - targetWaterNeedPerZone),
            cluster
        }));

        // Sort by deviation (most unbalanced first)
        clusterWaterNeeds.sort((a, b) => b.deviation - a.deviation);

        // Find most and least water clusters with smart target selection
        const mostUnbalanced = clusterWaterNeeds[0];
        
        // Find the best target cluster for balancing (considering both water need and geographic distribution)
        let bestTarget = null;
        let bestBalanceScore = -1;
        
        for (const candidate of clusterWaterNeeds) {
            if (candidate.index === mostUnbalanced.index) continue;
            
            // Calculate potential balance improvement
            const waterDiff = mostUnbalanced.waterNeed - candidate.waterNeed;
            const avgWaterDiff = Math.abs(waterDiff / 2);
            
            // Calculate how much this would improve overall balance
            const currentTotalDeviation = mostUnbalanced.deviation + candidate.deviation;
            const potentialNewDeviation = Math.abs((mostUnbalanced.waterNeed - avgWaterDiff) - targetWaterNeedPerZone) + 
                                        Math.abs((candidate.waterNeed + avgWaterDiff) - targetWaterNeedPerZone);
            
            const balanceScore = currentTotalDeviation - potentialNewDeviation;
            
            // Prefer targets that would create better balance
            if (balanceScore > bestBalanceScore) {
                bestBalanceScore = balanceScore;
                bestTarget = candidate;
            }
        }
        
        if (!bestTarget) continue;

        // Try precision balancing strategies
        improved = tryPrecisionBalancing(balancedClusters, mostUnbalanced, bestTarget, targetWaterNeedPerZone, strictTolerance);
        
        if (!improved && iterations % 50 === 0) {
            // Try more aggressive rebalancing every 50 iterations
            improved = tryAggressiveRebalancing(balancedClusters, targetWaterNeedPerZone, strictTolerance);
        }

        if (improved) {
            currentMaxDeviation = getMaxDeviation(balancedClusters);
            if (iterations % 100 === 0) {
                console.log(`📊 Iteration ${iterations}: Max deviation = ${currentMaxDeviation.toFixed(3)}`);
            }
        }
    }

    const finalMaxDeviation = getMaxDeviation(balancedClusters);
    const finalWaterNeeds = balancedClusters.map(getClusterWaterNeed);
    const finalDeviations = finalWaterNeeds.map(need => Math.abs(need - targetWaterNeedPerZone));
    const deviationPercentages = finalDeviations.map(dev => (dev / targetWaterNeedPerZone * 100));
    
    console.log(`✅ Enhanced balance completed for ${clusters.length} zones:`);
    console.log(`   - Iterations used: ${iterations}/${maxIterations}`);
    console.log(`   - Final max deviation: ${finalMaxDeviation.toFixed(2)} (${(finalMaxDeviation / targetWaterNeedPerZone * 100).toFixed(1)}%)`);
    console.log(`   - Zone water needs: ${finalWaterNeeds.map(w => w.toFixed(1)).join(', ')}`);
    console.log(`   - Deviations (%): ${deviationPercentages.map(p => p.toFixed(1)).join(', ')}`);
    console.log(`   - Balance quality: ${finalMaxDeviation <= strictTolerance ? '✅ EXCELLENT' : finalMaxDeviation <= targetWaterNeedPerZone * 0.1 ? '⚠️ ACCEPTABLE' : '❌ POOR'}`);

    return balancedClusters;
};

// Calculate geographic distance between two plant locations
const calculatePlantDistance = (plant1: PlantLocation, plant2: PlantLocation): number => {
    return calculateDistance(plant1.position, plant2.position);
};

// Find geographic center of a cluster
const getClusterCenter = (cluster: PlantLocation[]): Coordinate => {
    if (cluster.length === 0) return { lat: 0, lng: 0 };
    
    const totalLat = cluster.reduce((sum, plant) => sum + plant.position.lat, 0);
    const totalLng = cluster.reduce((sum, plant) => sum + plant.position.lng, 0);
    
    return {
        lat: totalLat / cluster.length,
        lng: totalLng / cluster.length
    };
};

// Precision balancing between two clusters with geographic considerations
const tryPrecisionBalancing = (
    clusters: PlantLocation[][],
    mostUnbalanced: { index: number; waterNeed: number; deviation: number },
    target: { index: number; waterNeed: number; deviation: number },
    targetWater: number,
    tolerance: number
): boolean => {
    const clusterA = clusters[mostUnbalanced.index];
    const clusterB = clusters[target.index];
    
    if (clusterA.length === 0 || clusterB.length === 0) return false;
    
    // Get cluster centers for geographic considerations
    const centerA = getClusterCenter(clusterA);
    const centerB = getClusterCenter(clusterB);
    
    // Calculate ideal water exchange
    const waterNeedA = mostUnbalanced.waterNeed;
    const waterNeedB = target.waterNeed;
    const idealExchange = (waterNeedA - waterNeedB) / 2;
    
    // If the difference is too small, no need to balance
    if (Math.abs(idealExchange) < tolerance / 2) return false;
    const totalWater = mostUnbalanced.waterNeed + target.waterNeed;
    const idealWaterA = totalWater / 2;
    const waterToMove = mostUnbalanced.waterNeed - idealWaterA;
    
    if (Math.abs(waterToMove) < 0.01) return false;
    
    // Find best single plant to move
    const sourceCluster = waterToMove > 0 ? clusterA : clusterB;
    const destCluster = waterToMove > 0 ? clusterB : clusterA;
    const targetMove = Math.abs(waterToMove);
    
    let bestPlant: PlantLocation | null = null;
    let bestImprovement = 0;
    
    sourceCluster.forEach(plant => {
        const plantWater = plant.plantData.waterNeed;
        
        // Calculate water balance improvement
        const newDeviationSource = Math.abs((mostUnbalanced.waterNeed - plantWater) - targetWater);
        const newDeviationTarget = Math.abs((target.waterNeed + plantWater) - targetWater);
        const currentDeviation = mostUnbalanced.deviation + target.deviation;
        const newDeviation = newDeviationSource + newDeviationTarget;
        const balanceImprovement = currentDeviation - newDeviation;
        
        if (balanceImprovement > 0) {
            // Calculate geographic penalty - prefer moving plants that are closer to destination center
            const sourceCenter = sourceCluster === clusterA ? centerA : centerB;
            const destCenter = sourceCluster === clusterA ? centerB : centerA;
            const distanceToSource = calculateDistance(plant.position, sourceCenter);
            const distanceToDestination = calculateDistance(plant.position, destCenter);
            
            // Geographic bonus: negative penalty if plant is closer to destination than to current center
            const geographicPenalty = Math.max(0, distanceToSource - distanceToDestination) * 0.1;
            
            // Combined score: balance improvement minus geographic penalty
            const overallScore = balanceImprovement - geographicPenalty;
            
            if (overallScore > bestImprovement || bestPlant === null) {
                bestPlant = plant;
                bestImprovement = overallScore;
            }
        }
    });
    
    if (bestPlant && bestImprovement > 0.01) {
        // Move the plant
        const plantIndex = sourceCluster.findIndex(p => p.id === bestPlant!.id);
        if (plantIndex !== -1) {
            sourceCluster.splice(plantIndex, 1);
            destCluster.push(bestPlant);
            return true;
        }
    }
    
    return false;
};

// Aggressive rebalancing when precision methods fail
const tryAggressiveRebalancing = (
    clusters: PlantLocation[][],
    targetWater: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _tolerance: number
): boolean => {
    const getClusterWaterNeed = (cluster: PlantLocation[]): number => {
        return cluster.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0);
    };
    
    // Find most problematic pair
    let bestImprovement = 0;
    let bestMove: { from: number; to: number; plantIndex: number } | null = null;
    
    for (let i = 0; i < clusters.length; i++) {
        for (let j = 0; j < clusters.length; j++) {
            if (i === j) continue;
            
            const waterI = getClusterWaterNeed(clusters[i]);
            const waterJ = getClusterWaterNeed(clusters[j]);
            
            clusters[i].forEach((plant, plantIndex) => {
                const newWaterI = waterI - plant.plantData.waterNeed;
                const newWaterJ = waterJ + plant.plantData.waterNeed;
                
                const currentDeviation = Math.abs(waterI - targetWater) + Math.abs(waterJ - targetWater);
                const newDeviation = Math.abs(newWaterI - targetWater) + Math.abs(newWaterJ - targetWater);
                const improvement = currentDeviation - newDeviation;
                
                if (improvement > bestImprovement) {
                    bestImprovement = improvement;
                    bestMove = { from: i, to: j, plantIndex };
                }
            });
        }
    }
    
    if (bestMove && bestImprovement > 0.001) {
        const moveData = bestMove as { from: number; to: number; plantIndex: number };
        const plant = clusters[moveData.from].splice(moveData.plantIndex, 1)[0];
        clusters[moveData.to].push(plant);
        return true;
    }
    
    return false;
};



// Create true non-overlapping Voronoi zones that cover the entire main area
// Helper function to find plants that are actually inside a polygon
const findPlantsInPolygon = (plants: PlantLocation[], polygon: Coordinate[]): PlantLocation[] => {
    if (polygon.length < 3) return [];
    
    return plants.filter(plant => {
        return isPointInPolygon(plant.position, polygon);
    });
};

export const createVoronoiZones = (
    clusters: PlantLocation[][],
    mainArea: Coordinate[],
    colors: string[]
): IrrigationZone[] => {
    const zones: IrrigationZone[] = [];
    
    if (clusters.length === 0) return zones;

    // Calculate weighted centroids for each cluster (considering plant water needs)
    const centroids = clusters.map(cluster => {
        if (cluster.length === 0) return null;
        
        // Use water-weighted centroid for better zone distribution
        const totalWater = cluster.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0);
        if (totalWater === 0) {
            return {
                lat: cluster.reduce((sum, plant) => sum + plant.position.lat, 0) / cluster.length,
                lng: cluster.reduce((sum, plant) => sum + plant.position.lng, 0) / cluster.length
            };
        }
        
        const weightedLat = cluster.reduce((sum, plant) => 
            sum + plant.position.lat * plant.plantData.waterNeed, 0) / totalWater;
        const weightedLng = cluster.reduce((sum, plant) => 
            sum + plant.position.lng * plant.plantData.waterNeed, 0) / totalWater;
        
        return { lat: weightedLat, lng: weightedLng };
    }).filter(centroid => centroid !== null) as Coordinate[];

    console.log(`🔷 Creating ${centroids.length} non-overlapping Voronoi zones...`);

    // Create true Voronoi diagram using mathematical approach
    const voronoiZones = createTrueVoronoiZones(centroids, mainArea);
    
    // Collect all plants from all clusters for accurate assignment
    const allPlants = clusters.flat();
    
    // Assign clusters to their corresponding Voronoi zones
    clusters.forEach((cluster, index) => {
        if (cluster.length === 0 || index >= voronoiZones.length) return;

        const zoneCoordinates = voronoiZones[index];
        
        // Validate that zone is valid
        if (zoneCoordinates.length < 3) {
            console.warn(`⚠️ Zone ${index + 1} has insufficient points, using fallback method...`);
            
            // Fallback to buffered plant positions
            const plantPositions = cluster.map(plant => plant.position);
            const fallbackZone = createFallbackZone(plantPositions, mainArea, 10); // 10m buffer
            
            if (fallbackZone.length >= 3) {
                // Find plants that are actually in the fallback polygon
                const plantsInPolygon = findPlantsInPolygon(allPlants, fallbackZone);
                const totalWaterNeed = plantsInPolygon.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0);
                
                console.log(`📊 Zone ${index + 1} (fallback): Original cluster had ${cluster.length} plants, polygon contains ${plantsInPolygon.length} plants`);
                
                const zone: IrrigationZone = {
                    id: `auto-zone-${index + 1}`,
                    name: `โซนอัตโนมัติ ${index + 1}`,
                    coordinates: fallbackZone,
                    plants: plantsInPolygon, // Use actual plants in polygon
                    totalWaterNeed,
                    color: colors[index] || '#888888',
                    layoutIndex: index
                };
                zones.push(zone);
            }
            return;
        }

        // Find plants that are actually inside this polygon (not just assigned cluster)
        const plantsInPolygon = findPlantsInPolygon(allPlants, zoneCoordinates);
        const totalWaterNeed = plantsInPolygon.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0);

        console.log(`📊 Zone ${index + 1}: Original cluster had ${cluster.length} plants, polygon contains ${plantsInPolygon.length} plants`);

        const zone: IrrigationZone = {
            id: `auto-zone-${index + 1}`,
            name: `โซนอัตโนมัติ ${index + 1}`,
            coordinates: zoneCoordinates,
            plants: plantsInPolygon, // Use actual plants in polygon instead of original cluster
            totalWaterNeed,
            color: colors[index] || '#888888',
            layoutIndex: index
        };

        zones.push(zone);
    });

    console.log(`✅ Created ${zones.length} non-overlapping zones`);
    return zones;
};

// Create true Voronoi diagram using mathematical approach
const createTrueVoronoiZones = (
    centroids: Coordinate[], 
    mainArea: Coordinate[]
): Coordinate[][] => {
    if (centroids.length === 0) return [];
    if (centroids.length === 1) return [mainArea];
    
    const zones: Coordinate[][] = [];
    
    // For each centroid, create its Voronoi cell
    centroids.forEach((centroid, index) => {
        let voronoiCell = [...mainArea]; // Start with main area
        
        // Clip against all other centroids
        centroids.forEach((otherCentroid, otherIndex) => {
            if (index === otherIndex) return;
            
            // Create perpendicular bisector line between current centroid and other centroid
            const midpoint = {
                lat: (centroid.lat + otherCentroid.lat) / 2,
                lng: (centroid.lng + otherCentroid.lng) / 2
            };
            
            // Vector from centroid to other centroid
            const direction = {
                lat: otherCentroid.lat - centroid.lat,
                lng: otherCentroid.lng - centroid.lng
            };
            
            // Perpendicular vector (rotate 90 degrees)
            const perpendicular = {
                lat: -direction.lng,
                lng: direction.lat
            };
            
            // Normalize perpendicular vector
            const length = Math.sqrt(perpendicular.lat * perpendicular.lat + perpendicular.lng * perpendicular.lng);
            if (length > 0) {
                perpendicular.lat /= length;
                perpendicular.lng /= length;
            }
            
            // Create bisector line (extend far enough to cross main area)
            const extent = 0.1; // Extend 0.1 degrees in both directions
            const bisectorLine = [
                {
                    lat: midpoint.lat - perpendicular.lat * extent,
                    lng: midpoint.lng - perpendicular.lng * extent
                },
                {
                    lat: midpoint.lat + perpendicular.lat * extent,
                    lng: midpoint.lng + perpendicular.lng * extent
                }
            ];
            
            // Clip Voronoi cell against this bisector (keep side closer to current centroid)
            voronoiCell = clipPolygonAgainstLine(voronoiCell, bisectorLine, centroid);
        });
        
        zones.push(voronoiCell);
    });
    
    return zones;
};

// Clip polygon against a line, keeping the side that contains the reference point
const clipPolygonAgainstLine = (
    polygon: Coordinate[], 
    line: Coordinate[], 
    referencePoint: Coordinate
): Coordinate[] => {
    if (polygon.length < 3 || line.length < 2) return polygon;
    
    const clippedPolygon: Coordinate[] = [];
    
    if (polygon.length === 0) return clippedPolygon;
    
    let s = polygon[polygon.length - 1];
    
    for (const e of polygon) {
        const sOnCorrectSide = isPointOnCorrectSideOfLine(s, line, referencePoint);
        const eOnCorrectSide = isPointOnCorrectSideOfLine(e, line, referencePoint);
        
        if (eOnCorrectSide) {
            if (!sOnCorrectSide) {
                // Entering correct side - add intersection
                const intersection = findLineIntersection(s, e, line[0], line[1]);
                if (intersection) {
                    clippedPolygon.push(intersection);
                }
            }
            clippedPolygon.push(e);
        } else if (sOnCorrectSide) {
            // Leaving correct side - add intersection
            const intersection = findLineIntersection(s, e, line[0], line[1]);
            if (intersection) {
                clippedPolygon.push(intersection);
            }
        }
        
        s = e;
    }
    
    return clippedPolygon;
};

// Check if point is on correct side of line (same side as reference point)
const isPointOnCorrectSideOfLine = (
    point: Coordinate, 
    line: Coordinate[], 
    referencePoint: Coordinate
): boolean => {
    if (line.length < 2) return true;
    
    const lineVector = {
        lat: line[1].lat - line[0].lat,
        lng: line[1].lng - line[0].lng
    };
    
    const pointVector = {
        lat: point.lat - line[0].lat,
        lng: point.lng - line[0].lng
    };
    
    const referenceVector = {
        lat: referencePoint.lat - line[0].lat,
        lng: referencePoint.lng - line[0].lng
    };
    
    // Cross product to determine which side of line
    const pointCross = lineVector.lat * pointVector.lng - lineVector.lng * pointVector.lat;
    const referenceCross = lineVector.lat * referenceVector.lng - lineVector.lng * referenceVector.lat;
    
    // Same side if cross products have same sign
    return pointCross * referenceCross >= 0;
};

// Find intersection between two lines
const findLineIntersection = (
    p1: Coordinate, p2: Coordinate,
    p3: Coordinate, p4: Coordinate
): Coordinate | null => {
    const x1 = p1.lng, y1 = p1.lat;
    const x2 = p2.lng, y2 = p2.lat;
    const x3 = p3.lng, y3 = p3.lat;
    const x4 = p4.lng, y4 = p4.lat;
    
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    
    return {
        lng: x1 + t * (x2 - x1),
        lat: y1 + t * (y2 - y1)
    };
};

// Create fallback zone when Voronoi fails
const createFallbackZone = (
    plantPositions: Coordinate[], 
    mainArea: Coordinate[], 
    bufferMeters: number
): Coordinate[] => {
    if (plantPositions.length === 0) return [];
    
    // Create convex hull of plant positions
    let hull = convexHull(plantPositions);
    
    // Add buffer
    if (bufferMeters > 0) {
        hull = addPolygonPadding(hull, bufferMeters);
    }
    
    // Clip to main area
    hull = clipPolygonToMainArea(hull, mainArea);
    
    return hull;
};



// Create zones from plant clusters (with padding option)
export const createZonesFromClusters = (
    clusters: PlantLocation[][],
    mainArea: Coordinate[],
    colors: string[],
    paddingMeters: number = 2,
    useVoronoi: boolean = true
): IrrigationZone[] => {
    // Use Voronoi-based zones for better area coverage
    if (useVoronoi) {
        return createVoronoiZones(clusters, mainArea, colors);
    }

    // Original method with padding
    const zones: IrrigationZone[] = [];
    
    // Collect all plants from all clusters for accurate assignment
    const allPlants = clusters.flat();

    clusters.forEach((cluster, index) => {
        if (cluster.length === 0) return;

        // Create convex hull for the cluster
        const plantPositions = cluster.map(plant => plant.position);
        let zoneCoordinates = convexHull(plantPositions);

        // Add padding to the zone with bounds checking
        zoneCoordinates = addPolygonPadding(zoneCoordinates, paddingMeters, mainArea);

        // Validate that we still have a valid polygon after clipping
        if (zoneCoordinates.length < 3) {
            console.warn(`⚠️ Zone ${index + 1} has insufficient points after clipping, skipping...`);
            return;
        }

        // Find plants that are actually inside this polygon (not just assigned cluster)
        const plantsInPolygon = findPlantsInPolygon(allPlants, zoneCoordinates);
        const totalWaterNeed = plantsInPolygon.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0);

        console.log(`📊 Zone ${index + 1} (convex hull): Original cluster had ${cluster.length} plants, polygon contains ${plantsInPolygon.length} plants`);

        const zone: IrrigationZone = {
            id: `auto-zone-${index + 1}`,
            name: `โซนอัตโนมัติ ${index + 1}`,
            coordinates: zoneCoordinates,
            plants: plantsInPolygon, // Use actual plants in polygon instead of original cluster
            totalWaterNeed,
            color: colors[index] || '#888888',
            layoutIndex: index
        };

        zones.push(zone);
    });

    return zones;
};

// Add padding to polygon with proper bounds checking
export const addPolygonPadding = (polygon: Coordinate[], paddingMeters: number, mainArea?: Coordinate[]): Coordinate[] => {
    if (polygon.length < 3 || paddingMeters <= 0) return polygon;

    // Convert meters to degrees using more accurate formula for Thailand (approximately 14°N)
    const latMidpoint = polygon.reduce((sum, p) => sum + p.lat, 0) / polygon.length;
    const metersPerDegLat = 111320; // More accurate for latitude
    const metersPerDegLng = 111320 * Math.cos(latMidpoint * Math.PI / 180); // Adjust for longitude
    
    const paddingDegreesLat = paddingMeters / metersPerDegLat;
    const paddingDegreesLng = paddingMeters / metersPerDegLng;

    console.log(`🔧 Adding ${paddingMeters}m padding (${paddingDegreesLat.toFixed(6)}° lat, ${paddingDegreesLng.toFixed(6)}° lng)`);

    // Use offset curve algorithm for better padding
    const expandedPolygon = createOffsetPolygon(polygon, paddingDegreesLat, paddingDegreesLng);
    
    // If mainArea is provided, ensure padded polygon doesn't exceed it
    if (mainArea && mainArea.length >= 3) {
        const clippedPolygon = clipPolygonToMainArea(expandedPolygon, mainArea);
        
        // If clipping reduces the polygon too much, use conservative padding
        if (clippedPolygon.length < 3 || calculatePolygonArea(clippedPolygon) < calculatePolygonArea(polygon) * 0.5) {
            console.warn(`⚠️ Padding would exceed main area bounds, using conservative approach`);
            return createConservativePadding(polygon, mainArea, paddingMeters);
        }
        
        return clippedPolygon;
    }
    
    return expandedPolygon;
};

// Create offset polygon using proper geometric algorithms
const createOffsetPolygon = (polygon: Coordinate[], paddingLat: number, paddingLng: number): Coordinate[] => {
    if (polygon.length < 3) return polygon;
    
    const offsetPoints: Coordinate[] = [];
    const n = polygon.length;
    
    for (let i = 0; i < n; i++) {
        const prev = polygon[(i - 1 + n) % n];
        const curr = polygon[i];
        const next = polygon[(i + 1) % n];
        
        // Calculate edge vectors
        const edge1 = { lat: curr.lat - prev.lat, lng: curr.lng - prev.lng };
        const edge2 = { lat: next.lat - curr.lat, lng: next.lng - curr.lng };
        
        // Calculate edge normals (perpendicular vectors pointing outward)
        const normal1 = { lat: -edge1.lng, lng: edge1.lat };
        const normal2 = { lat: -edge2.lng, lng: edge2.lat };
        
        // Normalize normals
        const len1 = Math.sqrt(normal1.lat * normal1.lat + normal1.lng * normal1.lng);
        const len2 = Math.sqrt(normal2.lat * normal2.lat + normal2.lng * normal2.lng);
        
        if (len1 > 0) {
            normal1.lat /= len1;
            normal1.lng /= len1;
        }
        if (len2 > 0) {
            normal2.lat /= len2;
            normal2.lng /= len2;
        }
        
        // Calculate average normal
        const avgNormal = {
            lat: (normal1.lat + normal2.lat) / 2,
            lng: (normal1.lng + normal2.lng) / 2
        };
        
        // Normalize average normal
        const avgLen = Math.sqrt(avgNormal.lat * avgNormal.lat + avgNormal.lng * avgNormal.lng);
        if (avgLen > 0) {
            avgNormal.lat /= avgLen;
            avgNormal.lng /= avgLen;
        }
        
        // Calculate offset point
        const offsetPoint = {
            lat: curr.lat + avgNormal.lat * paddingLat,
            lng: curr.lng + avgNormal.lng * paddingLng
        };
        
        offsetPoints.push(offsetPoint);
    }
    
    return offsetPoints;
};

// Create conservative padding that stays within main area
const createConservativePadding = (polygon: Coordinate[], mainArea: Coordinate[], paddingMeters: number): Coordinate[] => {
    const maxIterations = 10;
    let currentPadding = paddingMeters;
    let result = polygon;
    
    for (let i = 0; i < maxIterations && currentPadding > 0.1; i++) {
        const testPadding = addPolygonPadding(polygon, currentPadding);
        const clipped = clipPolygonToMainArea(testPadding, mainArea);
        
        if (clipped.length >= 3 && calculatePolygonArea(clipped) >= calculatePolygonArea(polygon) * 1.1) {
            result = clipped;
            break;
        }
        
        currentPadding *= 0.5; // Reduce padding by half each iteration
    }
    
    return result;
};

// Calculate polygon area using shoelace formula
const calculatePolygonArea = (polygon: Coordinate[]): number => {
    if (polygon.length < 3) return 0;
    
    let area = 0;
    const n = polygon.length;
    
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += polygon[i].lat * polygon[j].lng;
        area -= polygon[j].lat * polygon[i].lng;
    }
    
    return Math.abs(area) / 2;
};

// Improved Sutherland-Hodgman polygon clipping algorithm with strict bounds enforcement
export const clipPolygonToMainArea = (polygon: Coordinate[], mainArea: Coordinate[]): Coordinate[] => {
    if (polygon.length === 0 || mainArea.length === 0) return [];
    if (mainArea.length < 3) return [];

    console.log(`✂️ Clipping polygon (${polygon.length} points) to main area (${mainArea.length} points)`);

    let clippedPolygon = [...polygon];

    // Clip against each edge of the main area
    for (let i = 0; i < mainArea.length; i++) {
        const clipVertex1 = mainArea[i];
        const clipVertex2 = mainArea[(i + 1) % mainArea.length];
        
        const inputList = clippedPolygon;
        clippedPolygon = [];

        if (inputList.length === 0) break;

        let s = inputList[inputList.length - 1];

        for (const e of inputList) {
            if (isInsideEdge(e, clipVertex1, clipVertex2)) {
                if (!isInsideEdge(s, clipVertex1, clipVertex2)) {
                    const intersection = getLineIntersection(s, e, clipVertex1, clipVertex2);
                    if (intersection) {
                        clippedPolygon.push(intersection);
                    }
                }
                clippedPolygon.push(e);
            } else if (isInsideEdge(s, clipVertex1, clipVertex2)) {
                const intersection = getLineIntersection(s, e, clipVertex1, clipVertex2);
                if (intersection) {
                    clippedPolygon.push(intersection);
                }
            }
            s = e;
        }
    }

    // Strict validation: ensure all points are truly inside main area
    const validatedPolygon = clippedPolygon.filter(point => isPointInPolygon(point, mainArea));
    
    // If clipping resulted in too few points, return empty array (strict enforcement)
    if (validatedPolygon.length < 3) {
        console.warn(`⚠️ Clipping resulted in insufficient points (${validatedPolygon.length}), returning empty polygon`);
        
        // Last resort: try to find the intersection of polygons
        const intersection = findPolygonIntersection(polygon, mainArea);
        if (intersection.length >= 3) {
            console.log(`🔄 Using polygon intersection as fallback (${intersection.length} points)`);
            return intersection;
        }
        
        // Absolutely no valid intersection - return empty array
        console.error(`❌ No valid intersection found between polygon and main area`);
        return [];
    }

    console.log(`✅ Clipping successful: ${polygon.length} → ${validatedPolygon.length} points`);
    return validatedPolygon;
};

// Find intersection between two polygons using more robust method
const findPolygonIntersection = (poly1: Coordinate[], poly2: Coordinate[]): Coordinate[] => {
    if (poly1.length < 3 || poly2.length < 3) return [];
    
    // Find all intersection points between polygon edges
    const intersectionPoints: Coordinate[] = [];
    
    // Add vertices of poly1 that are inside poly2
    poly1.forEach(vertex => {
        if (isPointInPolygon(vertex, poly2)) {
            intersectionPoints.push(vertex);
        }
    });
    
    // Add vertices of poly2 that are inside poly1
    poly2.forEach(vertex => {
        if (isPointInPolygon(vertex, poly1)) {
            intersectionPoints.push(vertex);
        }
    });
    
    // Add edge intersection points
    for (let i = 0; i < poly1.length; i++) {
        const p1Start = poly1[i];
        const p1End = poly1[(i + 1) % poly1.length];
        
        for (let j = 0; j < poly2.length; j++) {
            const p2Start = poly2[j];
            const p2End = poly2[(j + 1) % poly2.length];
            
            const intersection = getLineIntersection(p1Start, p1End, p2Start, p2End);
            if (intersection) {
                // Check if intersection is actually on both line segments
                if (isPointOnLineSegment(intersection, p1Start, p1End) &&
                    isPointOnLineSegment(intersection, p2Start, p2End)) {
                    intersectionPoints.push(intersection);
                }
            }
        }
    }
    
    // Remove duplicate points
    const uniquePoints = removeDuplicatePoints(intersectionPoints);
    
    if (uniquePoints.length < 3) return [];
    
    // Create convex hull of intersection points
    return convexHull(uniquePoints);
};

// Check if point is on line segment
const isPointOnLineSegment = (point: Coordinate, start: Coordinate, end: Coordinate): boolean => {
    const epsilon = 1e-10;
    
    // Check if point is collinear with line segment
    const crossProduct = (point.lat - start.lat) * (end.lng - start.lng) - 
                        (point.lng - start.lng) * (end.lat - start.lat);
    
    if (Math.abs(crossProduct) > epsilon) return false;
    
    // Check if point is within line segment bounds
    const dotProduct = (point.lat - start.lat) * (end.lat - start.lat) + 
                      (point.lng - start.lng) * (end.lng - start.lng);
    const squaredLength = (end.lat - start.lat) * (end.lat - start.lat) + 
                         (end.lng - start.lng) * (end.lng - start.lng);
    
    return dotProduct >= 0 && dotProduct <= squaredLength;
};

// Remove duplicate points from array
const removeDuplicatePoints = (points: Coordinate[]): Coordinate[] => {
    const epsilon = 1e-8; // Tolerance for considering points as duplicates
    const unique: Coordinate[] = [];
    
    points.forEach(point => {
        const isDuplicate = unique.some(existing => 
            Math.abs(existing.lat - point.lat) < epsilon && 
            Math.abs(existing.lng - point.lng) < epsilon
        );
        
        if (!isDuplicate) {
            unique.push(point);
        }
    });
    
    return unique;
};

// Check if point is inside (on the left side of) an edge
const isInsideEdge = (point: Coordinate, edgeStart: Coordinate, edgeEnd: Coordinate): boolean => {
    return ((edgeEnd.lng - edgeStart.lng) * (point.lat - edgeStart.lat) - 
            (edgeEnd.lat - edgeStart.lat) * (point.lng - edgeStart.lng)) >= 0;
};

// Get intersection point of two line segments
const getLineIntersection = (
    p1: Coordinate, p2: Coordinate, 
    p3: Coordinate, p4: Coordinate
): Coordinate | null => {
    const x1 = p1.lng, y1 = p1.lat;
    const x2 = p2.lng, y2 = p2.lat;
    const x3 = p3.lng, y3 = p3.lat;
    const x4 = p4.lng, y4 = p4.lat;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null; // Lines are parallel

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    
    return {
        lng: x1 + t * (x2 - x1),
        lat: y1 + t * (y2 - y1)
    };
};

// Main function to create automatic zones
export const createAutomaticZones = (
    plants: PlantLocation[],
    mainArea: Coordinate[],
    config: AutoZoneConfig
): AutoZoneResult => {
    const startTime = Date.now();
    
    // Debug log for randomSeed
    if (config.randomSeed !== undefined) {
        console.log(`🎲 Using randomSeed: ${config.randomSeed} for zone creation`);
    }
    
    const debugInfo: AutoZoneDebugInfo = {
        totalPlants: plants.length,
        totalWaterNeed: 0,
        averageWaterNeedPerZone: 0,
        actualWaterNeedPerZone: [],
        waterNeedVariance: 0,
        waterNeedStandardDeviation: 0,
        waterBalanceEfficiency: 0,
        maxWaterNeedDeviation: 0,
        minWaterNeedDeviation: 0,
        waterNeedDeviationPercent: 0,
        convexHullPoints: [],
        plantAssignments: {},
        timeTaken: 0,
        waterBalanceDetails: []
    };

    try {

        // Validate input
        if (plants.length === 0) {
            throw new Error('ไม่มีต้นไม้ในพื้นที่');
        }

        if (config.numberOfZones <= 0 || config.numberOfZones > plants.length) {
            throw new Error('จำนวนโซนไม่ถูกต้อง');
        }

        // Calculate total water need
        debugInfo.totalWaterNeed = plants.reduce((sum, plant) => sum + plant.plantData.waterNeed, 0);
        debugInfo.averageWaterNeedPerZone = debugInfo.totalWaterNeed / config.numberOfZones;

        // Perform clustering with water need awareness
        let clusters: PlantLocation[][];
        if (config.balanceWaterNeed) {
            clusters = kMeansCluster(plants, config.numberOfZones, 100, true, config.randomSeed);
            
            // Additional refinement for perfect water balance
            clusters = enhancedBalanceWaterNeeds(clusters, debugInfo.averageWaterNeedPerZone);
        } else {
            clusters = kMeansCluster(plants, config.numberOfZones, 100, false, config.randomSeed);
        }

        // Generate zone colors (ไม่เปลี่ยนสี เปลี่ยนแค่รูปแบบโซน)
        const colors = generateZoneColors(config.numberOfZones);

        // Create zones from clusters with configurable options
        let zones = createZonesFromClusters(clusters, mainArea, colors, config.paddingMeters, config.useVoronoi);

        console.log(`🏗️ Initial zone creation completed: ${zones.length} zones created`);

        // Filter out invalid zones (zones with no coordinates or insufficient points)
        const validZones = zones.filter(zone => zone.coordinates && zone.coordinates.length >= 3);
        if (validZones.length < zones.length) {
            console.warn(`⚠️ Filtered out ${zones.length - validZones.length} invalid zones`);
            zones = validZones;
        }

        if (zones.length === 0) {
            throw new Error('ไม่สามารถสร้างโซนที่ถูกต้องได้ กรุณาตรวจสอบข้อมูลต้นไม้และพื้นที่');
        }

        // Validate zones with strict requirements
        const validation = validateZones(zones, mainArea);
        
        // Log validation results
        if (validation.errors.length > 0) {
            console.error('❌ Zone validation failed:', validation.errors);
        }
        if (validation.warnings.length > 0) {
            console.warn('⚠️ Zone validation warnings:', validation.warnings);
        }

        // Calculate detailed debug information
        debugInfo.actualWaterNeedPerZone = zones.map(zone => zone.totalWaterNeed);
        debugInfo.convexHullPoints = zones.map(zone => zone.coordinates);
        
        // Calculate water need statistics
        const mean = debugInfo.averageWaterNeedPerZone;
        debugInfo.waterNeedVariance = debugInfo.actualWaterNeedPerZone.reduce(
            (sum, waterNeed) => sum + Math.pow(waterNeed - mean, 2), 0
        ) / zones.length;
        debugInfo.waterNeedStandardDeviation = Math.sqrt(debugInfo.waterNeedVariance);
        
        // Calculate deviations
        const deviations = debugInfo.actualWaterNeedPerZone.map(waterNeed => Math.abs(waterNeed - mean));
        debugInfo.maxWaterNeedDeviation = Math.max(...deviations);
        debugInfo.minWaterNeedDeviation = Math.min(...deviations);
        debugInfo.waterNeedDeviationPercent = (debugInfo.maxWaterNeedDeviation / mean) * 100;
        
        // Calculate balance efficiency (0-100%, higher is better)
        const maxPossibleDeviation = mean; // Worst case: one zone has all water, others have none
        debugInfo.waterBalanceEfficiency = Math.max(0, 100 * (1 - debugInfo.maxWaterNeedDeviation / maxPossibleDeviation));
        
        // Create detailed balance information for each zone
        debugInfo.waterBalanceDetails = zones.map((zone, index) => ({
            zoneIndex: index + 1,
            waterNeed: zone.totalWaterNeed,
            deviation: Math.abs(zone.totalWaterNeed - mean),
            deviationPercent: ((Math.abs(zone.totalWaterNeed - mean) / mean) * 100),
            plantCount: zone.plants.length
        }));
        


        // Create plant assignments
        zones.forEach(zone => {
            zone.plants.forEach(plant => {
                debugInfo.plantAssignments[plant.id] = zone.id;
            });
        });

        debugInfo.timeTaken = Date.now() - startTime;

        // Log final statistics
        console.log(`📊 Zone creation summary:`);
        console.log(`   - Total zones: ${zones.length}`);
        console.log(`   - Total plants: ${debugInfo.totalPlants}`);
        console.log(`   - Water balance efficiency: ${debugInfo.waterBalanceEfficiency.toFixed(1)}%`);
        console.log(`   - Max water deviation: ${debugInfo.waterNeedDeviationPercent.toFixed(2)}%`);
        console.log(`   - Validation result: ${validation.isValid ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`   - Time taken: ${debugInfo.timeTaken}ms`);

        if (config.debugMode) {
            console.log('🔍 Full Debug Info:', debugInfo);
        }

        return {
            zones,
            debugInfo,
            success: true,
            validation
        };

    } catch (error) {
        debugInfo.timeTaken = Date.now() - startTime;
        
        return {
            zones: [],
            debugInfo,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

// Comprehensive zone validation with strict requirements
export const validateZones = (zones: IrrigationZone[], mainArea: Coordinate[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
} => {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log(`🔍 Starting comprehensive zone validation for ${zones.length} zones...`);

    if (zones.length === 0) {
        errors.push('ไม่มีโซนให้ตรวจสอบ');
        return { isValid: false, errors, warnings };
    }

    // 1. STRICT WATER BALANCE VALIDATION (≤1% deviation)
    const waterBalanceValidation = validateWaterBalance(zones);
    errors.push(...waterBalanceValidation.errors);
    warnings.push(...waterBalanceValidation.warnings);

    // 2. STRICT ZONE OVERLAP VALIDATION (zero tolerance)
    const overlapValidation = validateZoneOverlaps(zones);
    errors.push(...overlapValidation.errors);
    warnings.push(...overlapValidation.warnings);

    // 3. STRICT BOUNDARY VALIDATION (all points must be inside main area)
    const boundaryValidation = validateZoneBoundaries(zones, mainArea);
    errors.push(...boundaryValidation.errors);
    warnings.push(...boundaryValidation.warnings);

    // 4. GEOMETRIC VALIDATION
    const geometryValidation = validateZoneGeometry(zones);
    errors.push(...geometryValidation.errors);
    warnings.push(...geometryValidation.warnings);

    // 5. PLANT ASSIGNMENT VALIDATION
    const plantValidation = validatePlantAssignment(zones);
    errors.push(...plantValidation.errors);
    warnings.push(...plantValidation.warnings);

    const isValid = errors.length === 0;
    
    console.log(`${isValid ? '✅' : '❌'} Zone validation complete: ${errors.length} errors, ${warnings.length} warnings`);
    
    return { isValid, errors, warnings };
};

// Validate water balance with strict 1% tolerance
const validateWaterBalance = (zones: IrrigationZone[]): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (zones.length <= 1) return { errors, warnings };

    const waterNeeds = zones.map(zone => zone.totalWaterNeed);
    const avgWaterNeed = waterNeeds.reduce((sum, need) => sum + need, 0) / zones.length;
    const tolerance = avgWaterNeed * 0.01; // 1% tolerance

    console.log(`💧 Water balance check: Average = ${avgWaterNeed.toFixed(2)}, Tolerance = ${tolerance.toFixed(2)}`);

    let hasStrictError = false;
    zones.forEach((zone, index) => {
        const deviation = Math.abs(zone.totalWaterNeed - avgWaterNeed);
        const deviationPercent = (deviation / avgWaterNeed) * 100;

        if (deviation > tolerance) {
            errors.push(`โซน ${index + 1} มีความต้องการน้ำเบี่ยงเบนเกินกำหนด: ${zone.totalWaterNeed.toFixed(2)} ลิตร (เบี่ยงเบน ${deviationPercent.toFixed(2)}%)`);
            hasStrictError = true;
        } else if (deviation > tolerance * 0.5) {
            warnings.push(`โซน ${index + 1} มีความต้องการน้ำเบี่ยงเบนเล็กน้อย: ${deviationPercent.toFixed(2)}%`);
        }
    });

    if (!hasStrictError) {
        console.log(`✅ Water balance validation passed`);
    }

    return { errors, warnings };
};

// Validate zone overlaps with zero tolerance
const validateZoneOverlaps = (zones: IrrigationZone[]): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log(`🔄 Checking for zone overlaps...`);

    for (let i = 0; i < zones.length; i++) {
        for (let j = i + 1; j < zones.length; j++) {
            const zone1 = zones[i];
            const zone2 = zones[j];
            
            // Check for shared plants (critical error)
            const sharedPlants = zone1.plants.filter(plant1 => 
                zone2.plants.some(plant2 => plant1.id === plant2.id)
            );
            
            if (sharedPlants.length > 0) {
                errors.push(`โซน ${i + 1} และโซน ${j + 1} มีต้นไม้ร่วมกัน ${sharedPlants.length} ต้น - ต้องไม่มีการทับซ้อนเลย`);
            }

            // Check for polygon intersection using robust method
            const hasPolygonOverlap = checkPolygonIntersection(zone1.coordinates, zone2.coordinates);
            if (hasPolygonOverlap) {
                errors.push(`โซน ${i + 1} และโซน ${j + 1} มีพื้นที่ทับซ้อนกัน - ต้องแยกจากกันอย่างสมบูรณ์`);
            }

            // Check for points inside other zones
            const zone1InZone2 = zone1.coordinates.some(coord => isPointInPolygon(coord, zone2.coordinates));
            const zone2InZone1 = zone2.coordinates.some(coord => isPointInPolygon(coord, zone1.coordinates));
            
            if (zone1InZone2 || zone2InZone1) {
                warnings.push(`โซน ${i + 1} และโซน ${j + 1} มีจุดบางจุดอยู่ในพื้นที่ของกันและกัน`);
            }
        }
    }

    if (errors.length === 0) {
        console.log(`✅ Zone overlap validation passed`);
    }

    return { errors, warnings };
};

// Validate zone boundaries are within main area
const validateZoneBoundaries = (zones: IrrigationZone[], mainArea: Coordinate[]): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (mainArea.length < 3) {
        errors.push('พื้นที่หลักไม่ถูกต้อง');
        return { errors, warnings };
    }

    console.log(`🔲 Checking zone boundaries...`);

    zones.forEach((zone, index) => {
        // Check every single point
        const outsidePoints = zone.coordinates.filter(coord => !isPointInPolygon(coord, mainArea));
        if (outsidePoints.length > 0) {
            errors.push(`โซน ${index + 1} มี ${outsidePoints.length} จุดอยู่นอกพื้นที่หลัก - ทุกจุดต้องอยู่ในพื้นที่หลักเท่านั้น`);
        }

        // Check if zone polygon is entirely contained within main area
        const isFullyContained = zone.coordinates.every(coord => isPointInPolygon(coord, mainArea));
        if (!isFullyContained) {
            errors.push(`โซน ${index + 1} ไม่ได้อยู่ภายในพื้นที่หลักทั้งหมด`);
        }

        // Additional check: ensure zone area doesn't exceed main area bounds
        const zoneArea = calculatePolygonArea(zone.coordinates);
        const mainAreaSize = calculatePolygonArea(mainArea);
        if (zoneArea > mainAreaSize) {
            errors.push(`โซน ${index + 1} มีพื้นที่เกินขนาดพื้นที่หลัก`);
        }
    });

    if (errors.length === 0) {
        console.log(`✅ Zone boundary validation passed`);
    }

    return { errors, warnings };
};

// Validate zone geometry
const validateZoneGeometry = (zones: IrrigationZone[]): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log(`📐 Checking zone geometry...`);

    zones.forEach((zone, index) => {
        // Check minimum points
        if (zone.coordinates.length < 3) {
            errors.push(`โซน ${index + 1} มีจุดไม่เพียงพอสำหรับสร้างรูปหลายเหลี่ยม (${zone.coordinates.length} จุด)`);
        }

        // Check for duplicate points
        const uniquePoints = removeDuplicatePoints(zone.coordinates);
        if (uniquePoints.length !== zone.coordinates.length) {
            warnings.push(`โซน ${index + 1} มีจุดซ้ำกัน`);
        }

        // Check for minimum area
        const area = calculatePolygonArea(zone.coordinates);
        if (area < 1e-10) {
            errors.push(`โซน ${index + 1} มีพื้นที่เกือบเป็นศูนย์`);
        }

        // Check for self-intersection (basic check)
        if (hasPolygonSelfIntersection(zone.coordinates)) {
            errors.push(`โซน ${index + 1} มีเส้นขอบตัดกันเอง`);
        }
    });

    if (errors.length === 0) {
        console.log(`✅ Zone geometry validation passed`);
    }

    return { errors, warnings };
};

// Validate plant assignments
const validatePlantAssignment = (zones: IrrigationZone[]): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log(`🌱 Checking plant assignments...`);

    const allPlantIds = new Set<string>();
    let totalPlants = 0;

    zones.forEach((zone, index) => {
        if (zone.plants.length === 0) {
            warnings.push(`โซน ${index + 1} ไม่มีต้นไม้`);
        }

        totalPlants += zone.plants.length;

        // Check for duplicate plant IDs
        zone.plants.forEach(plant => {
            if (allPlantIds.has(plant.id)) {
                errors.push(`ต้นไม้ ID ${plant.id} ถูกกำหนดให้มากกว่า 1 โซน`);
            } else {
                allPlantIds.add(plant.id);
            }
        });

        // Check if plants are within zone boundaries
        zone.plants.forEach(plant => {
            if (!isPointInPolygon(plant.position, zone.coordinates)) {
                warnings.push(`ต้นไม้ ${plant.id} ในโซน ${index + 1} อยู่นอกขอบเขตโซน`);
            }
        });
    });

    console.log(`📊 Plant assignment summary: ${totalPlants} plants in ${zones.length} zones, ${allPlantIds.size} unique plants`);

    if (errors.length === 0) {
        console.log(`✅ Plant assignment validation passed`);
    }

    return { errors, warnings };
};

// Check if two polygons intersect
const checkPolygonIntersection = (poly1: Coordinate[], poly2: Coordinate[]): boolean => {
    // Simple intersection check: if any edge of poly1 intersects any edge of poly2
    for (let i = 0; i < poly1.length; i++) {
        const p1Start = poly1[i];
        const p1End = poly1[(i + 1) % poly1.length];
        
        for (let j = 0; j < poly2.length; j++) {
            const p2Start = poly2[j];
            const p2End = poly2[(j + 1) % poly2.length];
            
            if (doLineSegmentsIntersect(p1Start, p1End, p2Start, p2End)) {
                return true;
            }
        }
    }
    
    return false;
};

// Check if two line segments intersect
const doLineSegmentsIntersect = (p1: Coordinate, q1: Coordinate, p2: Coordinate, q2: Coordinate): boolean => {
    const orientation = (p: Coordinate, q: Coordinate, r: Coordinate): number => {
        const val = (q.lng - p.lng) * (r.lat - q.lat) - (q.lat - p.lat) * (r.lng - q.lng);
        if (Math.abs(val) < 1e-10) return 0; // Collinear
        return val > 0 ? 1 : 2; // Clockwise or Counterclockwise
    };

    const onSegment = (p: Coordinate, q: Coordinate, r: Coordinate): boolean => {
        return q.lng <= Math.max(p.lng, r.lng) && q.lng >= Math.min(p.lng, r.lng) &&
               q.lat <= Math.max(p.lat, r.lat) && q.lat >= Math.min(p.lat, r.lat);
    };

    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    // General case
    if (o1 !== o2 && o3 !== o4) return true;

    // Special cases
    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;

    return false;
};

// Check for polygon self-intersection (basic implementation)
const hasPolygonSelfIntersection = (polygon: Coordinate[]): boolean => {
    const n = polygon.length;
    if (n < 4) return false;

    for (let i = 0; i < n; i++) {
        const line1Start = polygon[i];
        const line1End = polygon[(i + 1) % n];
        
        for (let j = i + 2; j < n; j++) {
            // Skip adjacent edges
            if (j === (i - 1 + n) % n || j === (i + 1) % n) continue;
            
            const line2Start = polygon[j];
            const line2End = polygon[(j + 1) % n];
            
            if (doLineSegmentsIntersect(line1Start, line1End, line2Start, line2End)) {
                return true;
            }
        }
    }
    
    return false;
};
