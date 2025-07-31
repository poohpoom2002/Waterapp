/* eslint-disable @typescript-eslint/no-explicit-any */
// Enhanced utilities for field crop data processing - fixes water calculation issues

// Interface for enhanced pipe statistics
interface EnhancedPipeStats {
    count: number;
    longest: number;
    totalLength: number;
    averageLength: number;
    details: Array<{
        id: string;
        length: number;
        type: string;
        zoneId?: string;
    }>;
}

// ✅ Enhanced interface for field crop data with correct water calculations
export interface FieldCropData {
    area: {
        size: number; // square meters
        sizeInRai: number;
        coordinates: any[];
    };
    zones: {
        count: number;
        info: Array<{
            id: string;
            name: string;
            area: number;
            areaInRai: number;
            coordinates: any[];
            cropType?: string;
            totalPlantingPoints: number;
            sprinklerCount: number;
            // ✅ แก้ไขแล้ว: ใช้ Per Day แทน Per Irrigation เพื่อให้ตรงกับ cropData.ts
            totalWaterRequirementPerDay: number; // liters/day (from cropData.waterRequirement)
            // Enhanced pipe stats for each zone
            pipeStats: {
                main: EnhancedPipeStats;
                submain: EnhancedPipeStats;
                lateral: EnhancedPipeStats;
                combined: {
                    longestPath: number; // longest main + submain + lateral
                    totalLength: number;
                    totalCount: number;
                };
            };
        }>;
    };
    pipes: {
        stats: {
            main: EnhancedPipeStats;
            submain: EnhancedPipeStats;
            lateral: EnhancedPipeStats;
            overall: {
                longestCombined: number;
                totalLength: number;
                totalCount: number;
            };
        };
        details: Array<{
            id: string;
            type: 'main' | 'submain' | 'lateral';
            coordinates: any[];
            length: number;
            zoneId?: string;
        }>;
    };
    irrigation: {
        totalCount: number;
        byType: {
            sprinkler: number;
            miniSprinkler: number;
            microSpray: number;
            dripTape: number;
        };
        points: any[];
        lines: any[];
    };
    crops: {
        selectedCrops: string[];
        zoneAssignments: Record<string, string>;
    };
    summary: {
        totalPlantingPoints: number;
        // ✅ แก้ไขแล้ว: เปลี่ยนเป็น Per Day
        totalWaterRequirementPerDay: number; // liters/day (from cropData.waterRequirement)
        totalEstimatedYield: number;
        totalEstimatedIncome: number;
        irrigationEfficiency: number;
    };
}

// Enhanced pipe length calculation with better accuracy
export const calculateEnhancedPipeLength = (coordinates: any[]): number => {
    if (!coordinates || coordinates.length < 2) return 0;

    try {
        let totalLength = 0;
        
        for (let i = 0; i < coordinates.length - 1; i++) {
            const point1 = coordinates[i];
            const point2 = coordinates[i + 1];

            let lat1: number, lng1: number, lat2: number, lng2: number;

            // Handle different coordinate formats
            if (Array.isArray(point1) && Array.isArray(point2)) {
                [lat1, lng1] = point1.length === 2 ? point1 : [point1[0], point1[1]];
                [lat2, lng2] = point2.length === 2 ? point2 : [point2[0], point2[1]];
            } else if (point1?.lat !== undefined && point1?.lng !== undefined && 
                       point2?.lat !== undefined && point2?.lng !== undefined) {
                lat1 = point1.lat;
                lng1 = point1.lng;
                lat2 = point2.lat;
                lng2 = point2.lng;
            } else {
                console.warn('Invalid coordinate format:', point1, point2);
                continue;
            }

            // Validate coordinates
            if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
                console.warn('Invalid coordinate values:', { lat1, lng1, lat2, lng2 });
                continue;
            }

            // Use Haversine formula for accurate distance calculation
            const R = 6371000; // Earth's radius in meters
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                     Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                     Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            totalLength += distance;
        }

        return Math.round(totalLength * 100) / 100; // Round to 2 decimal places
    } catch (error) {
        console.error('Error calculating pipe length:', error);
        return 0;
    }
};

// Enhanced pipe statistics calculation
export const calculateEnhancedPipeStats = (pipes: any[], pipeType: string): EnhancedPipeStats => {
    const typePipes = pipes.filter(pipe => {
        if (!pipe || !pipe.coordinates || !Array.isArray(pipe.coordinates) || pipe.coordinates.length < 2) {
            return false;
        }

        // Identify pipe type more accurately
        const identifiedType = identifyPipeTypeEnhanced(pipe);
        return identifiedType === pipeType;
    });

    if (typePipes.length === 0) {
        return {
            count: 0,
            longest: 0,
            totalLength: 0,
            averageLength: 0,
            details: []
        };
    }

    const pipeDetails = typePipes.map(pipe => {
        const length = calculateEnhancedPipeLength(pipe.coordinates);
        return {
            id: pipe.id,
            length: length,
            type: pipeType,
            zoneId: pipe.zoneId
        };
    });

    const lengths = pipeDetails.map(detail => detail.length);
    const totalLength = lengths.reduce((sum, length) => sum + length, 0);
    const longestLength = Math.max(...lengths, 0);
    const averageLength = totalLength / lengths.length;

    return {
        count: typePipes.length,
        longest: Math.round(longestLength * 100) / 100,
        totalLength: Math.round(totalLength * 100) / 100,
        averageLength: Math.round(averageLength * 100) / 100,
        details: pipeDetails
    };
};

// Enhanced pipe type identification
export const identifyPipeTypeEnhanced = (pipe: any): string => {
    // Method 1: Use explicit type if available
    if (pipe.type) {
        const normalizedType = pipe.type.toLowerCase();
        if (['main', 'submain', 'lateral'].includes(normalizedType)) {
            return normalizedType;
        }
    }

    // Method 2: Identify by color with enhanced mapping
    const colorMappings = [
        { colors: ['blue', '#2563eb', '#3b82f6', 'rgb(37, 99, 235)'], type: 'main' },
        { colors: ['green', '#16a34a', '#22c55e', 'rgb(22, 163, 74)'], type: 'submain' },
        { colors: ['orange', 'purple', '#ea580c', '#8b5cf6', 'rgb(234, 88, 12)', 'rgb(139, 92, 246)'], type: 'lateral' },
        { colors: ['yellow', '#eab308', '#fbbf24', 'rgb(234, 179, 8)'], type: 'lateral' }
    ];

    const pipeColor = (pipe.color || pipe.pathOptions?.color || '').toLowerCase();
    
    for (const mapping of colorMappings) {
        if (mapping.colors.some(color => pipeColor.includes(color))) {
            return mapping.type;
        }
    }

    // Method 3: Identify by length (heuristic)
    if (pipe.coordinates && pipe.coordinates.length >= 2) {
        const length = calculateEnhancedPipeLength(pipe.coordinates);
        
        // Heuristic based on typical pipe lengths
        if (length > 200) return 'main';      // Long pipes are likely main
        if (length > 100) return 'submain';   // Medium pipes are likely submain
        return 'lateral';                     // Short pipes are likely lateral
    }

    // Default fallback
    return 'lateral';
};

// Enhanced zone pipe statistics calculation
export const calculateEnhancedZonePipeStats = (pipes: any[], zoneId: string, zones: any[]) => {
    const currentZone = zones.find(zone => zone.id.toString() === zoneId);
    if (!currentZone) {
        return {
            main: { count: 0, longest: 0, totalLength: 0, averageLength: 0, details: [] },
            submain: { count: 0, longest: 0, totalLength: 0, averageLength: 0, details: [] },
            lateral: { count: 0, longest: 0, totalLength: 0, averageLength: 0, details: [] },
            combined: { longestPath: 0, totalLength: 0, totalCount: 0 }
        };
    }

    console.log(`🔍 Enhanced pipe stats calculation for zone ${zoneId} (${currentZone.name})...`);

    // Filter pipes that belong to this zone
    const zonePipes = pipes.filter(pipe => {
        if (!pipe || !pipe.coordinates || !Array.isArray(pipe.coordinates) || pipe.coordinates.length < 2) {
            return false;
        }

        // Check if pipe is assigned to zone or physically in zone
        const hasZoneId = pipe.zoneId && pipe.zoneId.toString() === zoneId;
        const isInZone = isPipeInZoneEnhanced(pipe, currentZone);

        return hasZoneId || isInZone;
    });

    console.log(`📊 Found ${zonePipes.length} pipes in zone ${zoneId}`);

    // Calculate stats for each type
    const mainStats = calculateEnhancedPipeStats(zonePipes, 'main');
    const submainStats = calculateEnhancedPipeStats(zonePipes, 'submain');
    const lateralStats = calculateEnhancedPipeStats(zonePipes, 'lateral');

    // Calculate combined stats
    const longestPath = mainStats.longest + submainStats.longest + lateralStats.longest;
    const totalLength = mainStats.totalLength + submainStats.totalLength + lateralStats.totalLength;
    const totalCount = mainStats.count + submainStats.count + lateralStats.count;

    const result = {
        main: mainStats,
        submain: submainStats,
        lateral: lateralStats,
        combined: {
            longestPath: Math.round(longestPath * 100) / 100,
            totalLength: Math.round(totalLength * 100) / 100,
            totalCount: totalCount
        }
    };

    console.log(`📋 Enhanced zone ${zoneId} pipe stats:`, result);
    return result;
};

// Enhanced point-in-polygon check for pipe-zone association
export const isPipeInZoneEnhanced = (pipe: any, zone: any): boolean => {
    if (!pipe.coordinates || !Array.isArray(pipe.coordinates) || pipe.coordinates.length < 2) {
        return false;
    }

    if (!zone.coordinates || !Array.isArray(zone.coordinates) || zone.coordinates.length < 3) {
        return false;
    }

    try {
        // Simple point-in-polygon check for pipe endpoints and midpoints
        const testPoints: any[] = [];
        
        // Add start and end points
        testPoints.push(pipe.coordinates[0]);
        testPoints.push(pipe.coordinates[pipe.coordinates.length - 1]);
        
        // Add midpoint if pipe has more than 2 coordinates
        if (pipe.coordinates.length > 2) {
            const midIndex = Math.floor(pipe.coordinates.length / 2);
            testPoints.push(pipe.coordinates[midIndex]);
        }

        // Check if any test point is inside the zone
        for (const point of testPoints) {
            let lat: number, lng: number;
            
            if (Array.isArray(point) && point.length >= 2) {
                [lat, lng] = point;
            } else if (point && typeof point.lat === 'number' && typeof point.lng === 'number') {
                lat = point.lat;
                lng = point.lng;
            } else {
                continue;
            }

            if (isPointInPolygonEnhanced([lat, lng], zone.coordinates)) {
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking pipe in zone:', error);
        return false;
    }
};

// Enhanced point-in-polygon algorithm
export const isPointInPolygonEnhanced = (point: [number, number], polygon: any[]): boolean => {
    const [lat, lng] = point;
    let inside = false;

    const polygonPoints = polygon.map(coord => {
        if (Array.isArray(coord) && coord.length >= 2) {
            return [coord[0], coord[1]];
        } else if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
            return [coord.lat, coord.lng];
        }
        return null;
    }).filter(p => p !== null);

    if (polygonPoints.length < 3) return false;

    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
        const [xi, yi] = polygonPoints[i];
        const [xj, yj] = polygonPoints[j];

        if (((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }

    return inside;
};

// ✅ Enhanced field crop data calculation with correct water calculations
export const calculateEnhancedFieldStats = (summaryData: any): FieldCropData => {
    console.log('🧮 Calculating enhanced field stats with accurate water calculations...');

    const zones = Array.isArray(summaryData.zones) ? summaryData.zones : [];
    const pipes = Array.isArray(summaryData.pipes) ? summaryData.pipes : [];
    const irrigationPoints = Array.isArray(summaryData.irrigationPoints) ? summaryData.irrigationPoints : [];
    const irrigationLines = Array.isArray(summaryData.irrigationLines) ? summaryData.irrigationLines : [];

    // Calculate overall pipe statistics with enhanced methods
    const mainPipeStats = calculateEnhancedPipeStats(pipes, 'main');
    const submainPipeStats = calculateEnhancedPipeStats(pipes, 'submain');
    const lateralPipeStats = calculateEnhancedPipeStats(pipes, 'lateral');

    // Calculate enhanced zone information
    const enhancedZones = zones.map((zone: any) => {
        const zoneArea = calculateZoneAreaEnhanced(zone.coordinates);
        const zonePipeStats = calculateEnhancedZonePipeStats(pipes, zone.id.toString(), zones);
        
        // Get crop assignment and calculate production data
        const assignedCropValue = summaryData.zoneAssignments?.[zone.id];
        const crop = assignedCropValue ? getCropByValueEnhanced(assignedCropValue) : null;
        
        let totalPlantingPoints = 0;
        let sprinklerCount = 0;
        let waterRequirementPerDay = 0; // ✅ เปลี่ยนชื่อให้ตรงกับ interface

        if (crop && zoneArea > 0) {
            // Calculate planting points based on crop spacing
            const rowSpacing = (summaryData.rowSpacing?.[assignedCropValue] || crop.rowSpacing / 100);
            const plantSpacing = (summaryData.plantSpacing?.[assignedCropValue] || crop.plantSpacing / 100);
            
            if (rowSpacing > 0 && plantSpacing > 0) {
                const plantsPerSquareMeter = (1 / rowSpacing) * (1 / plantSpacing);
                totalPlantingPoints = Math.floor(zoneArea * plantsPerSquareMeter);
            }

            // Count irrigation points in this zone
            sprinklerCount = irrigationPoints.filter((point: any) => {
                if (!point || (!point.lat && !point.position)) return false;
                
                let pointCoords: [number, number];
                if (point.lat && point.lng) {
                    pointCoords = [point.lat, point.lng];
                } else if (Array.isArray(point.position) && point.position.length >= 2) {
                    pointCoords = point.position;
                } else {
                    return false;
                }

                return isPointInPolygonEnhanced(pointCoords, zone.coordinates);
            }).length;

            // Use actual sprinkler count if higher than calculated planting points
            if (sprinklerCount > totalPlantingPoints) {
                totalPlantingPoints = sprinklerCount;
            }

            // ✅ แก้ไขการคำนวณน้ำ: ใช้ค่าจาก cropData.waterRequirement ตรงๆ
            // crop.waterRequirement เป็น liters/plant/day ตาม interface ใน cropData.ts
            waterRequirementPerDay = totalPlantingPoints * crop.waterRequirement;

            console.log(`💧 Zone ${zone.name} water calculation:`, {
                crop: crop.name,
                plants: totalPlantingPoints,
                waterPerPlant: crop.waterRequirement,
                totalWater: waterRequirementPerDay,
                unit: 'liters/day'
            });
        }

        return {
            id: zone.id,
            name: zone.name,
            area: zoneArea,
            areaInRai: zoneArea / 1600,
            coordinates: zone.coordinates,
            cropType: assignedCropValue,
            totalPlantingPoints: totalPlantingPoints,
            sprinklerCount: Math.max(sprinklerCount, 1), // Ensure at least 1 for calculations
            totalWaterRequirementPerDay: waterRequirementPerDay, // ✅ ใช้ชื่อใหม่
            pipeStats: zonePipeStats
        };
    });

    // Calculate irrigation statistics
    const irrigationByType = {
        sprinkler: 0,
        miniSprinkler: 0,
        microSpray: 0,
        dripTape: 0
    };

    irrigationPoints.forEach((point: any) => {
        const normalizedType = normalizeIrrigationTypeEnhanced(point.type);
        if (normalizedType === 'sprinkler') irrigationByType.sprinkler++;
        else if (normalizedType === 'mini_sprinkler') irrigationByType.miniSprinkler++;
        else if (normalizedType === 'micro_spray') irrigationByType.microSpray++;
        else if (normalizedType === 'drip_tape') irrigationByType.dripTape++;
    });

    irrigationLines.forEach((line: any) => {
        const normalizedType = normalizeIrrigationTypeEnhanced(line.type);
        if (normalizedType === 'drip_tape') irrigationByType.dripTape++;
    });

    // Calculate summary statistics
    const totalPlantingPoints = enhancedZones.reduce((sum, zone) => sum + zone.totalPlantingPoints, 0);
    const totalWaterRequirementPerDay = enhancedZones.reduce((sum, zone) => sum + zone.totalWaterRequirementPerDay, 0); // ✅ เปลี่ยนชื่อ
    const totalArea = summaryData.fieldAreaSize || 0;

    console.log('✅ Field stats calculation completed:', {
        totalPlants: totalPlantingPoints,
        totalWaterPerDay: totalWaterRequirementPerDay,
        avgWaterPerPlant: totalPlantingPoints > 0 ? (totalWaterRequirementPerDay / totalPlantingPoints).toFixed(2) : 0,
        unit: 'liters/day'
    });

    return {
        area: {
            size: totalArea,
            sizeInRai: totalArea / 1600,
            coordinates: summaryData.mainField?.coordinates || []
        },
        zones: {
            count: enhancedZones.length,
            info: enhancedZones
        },
        pipes: {
            stats: {
                main: mainPipeStats,
                submain: submainPipeStats,
                lateral: lateralPipeStats,
                overall: {
                    longestCombined: mainPipeStats.longest + submainPipeStats.longest + lateralPipeStats.longest,
                    totalLength: mainPipeStats.totalLength + submainPipeStats.totalLength + lateralPipeStats.totalLength,
                    totalCount: mainPipeStats.count + submainPipeStats.count + lateralPipeStats.count
                }
            },
            details: pipes.map((pipe: any) => ({
                id: pipe.id,
                type: identifyPipeTypeEnhanced(pipe),
                coordinates: pipe.coordinates,
                length: calculateEnhancedPipeLength(pipe.coordinates),
                zoneId: pipe.zoneId
            }))
        },
        irrigation: {
            totalCount: irrigationPoints.length + irrigationLines.length,
            byType: irrigationByType,
            points: irrigationPoints,
            lines: irrigationLines
        },
        crops: {
            selectedCrops: summaryData.selectedCrops || [],
            zoneAssignments: summaryData.zoneAssignments || {}
        },
        summary: {
            totalPlantingPoints: totalPlantingPoints,
            totalWaterRequirementPerDay: totalWaterRequirementPerDay, // ✅ เปลี่ยนชื่อ
            totalEstimatedYield: enhancedZones.reduce((sum, zone) => {
                const crop = zone.cropType ? getCropByValueEnhanced(zone.cropType) : null;
                if (crop) {
                    const areaInRai = zone.area / 1600;
                    return sum + (areaInRai * crop.yield);
                }
                return sum;
            }, 0),
            totalEstimatedIncome: enhancedZones.reduce((sum, zone) => {
                const crop = zone.cropType ? getCropByValueEnhanced(zone.cropType) : null;
                if (crop) {
                    const areaInRai = zone.area / 1600;
                    const cropYield = areaInRai * crop.yield;
                    return sum + (cropYield * crop.price);
                }
                return sum;
            }, 0),
            irrigationEfficiency: totalWaterRequirementPerDay > 0 ? (totalPlantingPoints / totalWaterRequirementPerDay) * 1000 : 0 // ✅ เปลี่ยนชื่อ
        }
    };
};

// Enhanced zone area calculation
export const calculateZoneAreaEnhanced = (coordinates: any[]): number => {
    if (!coordinates || coordinates.length < 3) return 0;

    try {
        // Convert coordinates to a consistent format
        const points = coordinates.map(coord => {
            if (Array.isArray(coord) && coord.length >= 2) {
                return [parseFloat(coord[0]), parseFloat(coord[1])];
            } else if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
                return [coord.lat, coord.lng];
            }
            return null;
        }).filter(point => point !== null);

        if (points.length < 3) return 0;

        // Use shoelace formula for polygon area calculation
        let area = 0;
        const n = points.length;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i][0] * points[j][1];
            area -= points[j][0] * points[i][1];
        }

        area = Math.abs(area) / 2;

        // Convert from degrees to square meters (approximate)
        // This is a rough approximation; for precise calculations, use proper geographic projections
        const metersPerDegree = 111320; // approximate meters per degree at equator
        const areaInSquareMeters = area * metersPerDegree * metersPerDegree;

        return Math.round(areaInSquareMeters);
    } catch (error) {
        console.error('Error calculating zone area:', error);
        return 0;
    }
};

// Helper function to normalize irrigation types
export const normalizeIrrigationTypeEnhanced = (type: string): string => {
    if (!type) return 'unknown';
    
    const normalizedType = type.toLowerCase().trim();
    const typeMapping: { [key: string]: string } = {
        'sprinkler': 'sprinkler',
        'sprinkler-system': 'sprinkler',
        'mini-sprinkler': 'mini_sprinkler',
        'mini_sprinkler': 'mini_sprinkler',
        'minisprinkler': 'mini_sprinkler',
        'micro-spray': 'micro_spray',
        'micro_spray': 'micro_spray',
        'microspray': 'micro_spray',
        'micro': 'micro_spray',
        'drip': 'drip_tape',
        'drip-tape': 'drip_tape',
        'drip_tape': 'drip_tape',
        'drip-irrigation': 'drip_tape'
    };
    
    return typeMapping[normalizedType] || normalizedType;
};

// ✅ Enhanced crop data retrieval with proper fallback
export const getCropByValueEnhanced = (cropValue: string): any => {
    // First try to import and use the actual getCropByValue function
    try {
        // This should be replaced with actual import when used in the real application
        // import { getCropByValue } from '@/pages/utils/cropData';
        // return getCropByValue(cropValue);
        
        // For now, return a placeholder that uses the correct structure from cropData.ts
        const cropMap: { [key: string]: any } = {
            'rice': {
                name: 'Rice',
                yield: 650,
                price: 12,
                waterRequirement: 4.2, // ✅ liters/plant/day
                rowSpacing: 25,
                plantSpacing: 25,
                category: 'cereal',
                irrigationNeeds: 'high',
                growthPeriod: 120
            },
            'corn': {
                name: 'Field Corn',
                yield: 750,
                price: 9.5,
                waterRequirement: 2.5, // ✅ liters/plant/day
                rowSpacing: 75,
                plantSpacing: 25,
                category: 'cereal',
                irrigationNeeds: 'medium',
                growthPeriod: 115
            },
            'cassava': {
                name: 'Cassava',
                yield: 3500,
                price: 3.0,
                waterRequirement: 1.5, // ✅ liters/plant/day
                rowSpacing: 100,
                plantSpacing: 80,
                category: 'root',
                irrigationNeeds: 'low',
                growthPeriod: 300
            },
            'sugarcane': {
                name: 'Sugarcane',
                yield: 12000,
                price: 1.2,
                waterRequirement: 3.5, // ✅ liters/plant/day
                rowSpacing: 150,
                plantSpacing: 50,
                category: 'industrial',
                irrigationNeeds: 'high',
                growthPeriod: 365
            },
            'soybean': {
                name: 'Soybean',
                yield: 280,
                price: 18,
                waterRequirement: 2.8, // ✅ liters/plant/day
                rowSpacing: 50,
                plantSpacing: 20,
                category: 'legume',
                irrigationNeeds: 'medium',
                growthPeriod: 95
            }
            // Add more crops as needed...
        };
        
        return cropMap[cropValue] || {
            name: 'Unknown Crop',
            yield: 1000,
            price: 50,
            waterRequirement: 2.0, // ✅ Default liters/plant/day
            rowSpacing: 50,
            plantSpacing: 50,
            category: 'general',
            irrigationNeeds: 'medium',
            growthPeriod: 120
        };
        
    } catch (error) {
        console.error('Error getting crop data:', error);
        
        // Fallback with correct water requirement structure
        return {
            name: 'Default Crop',
            yield: 1000,
            price: 50,
            waterRequirement: 2.0, // ✅ liters/plant/day
            rowSpacing: 50,
            plantSpacing: 50,
            category: 'general',
            irrigationNeeds: 'medium',
            growthPeriod: 120
        };
    }
};

// Enhanced field crop data saving
export const saveEnhancedFieldCropData = (fieldData: FieldCropData): void => {
    try {
        localStorage.setItem('enhancedFieldCropData', JSON.stringify(fieldData));
        console.log('✅ Enhanced field crop data saved successfully');
    } catch (error) {
        console.error('❌ Error saving enhanced field crop data:', error);
    }
};

// Enhanced field crop data loading
export const getEnhancedFieldCropData = (): FieldCropData | null => {
    try {
        const data = localStorage.getItem('enhancedFieldCropData');
        if (data) {
            const parsedData = JSON.parse(data);
            console.log('✅ Enhanced field crop data loaded successfully');
            return parsedData;
        }
    } catch (error) {
        console.error('❌ Error loading enhanced field crop data:', error);
    }
    return null;
};

// Migration function from old field crop data to enhanced version
export const migrateToEnhancedFieldCropData = (): FieldCropData | null => {
    try {
        // Try to load old field map data
        const oldData = localStorage.getItem('fieldMapData');
        if (oldData) {
            const parsedOldData = JSON.parse(oldData);
            console.log('🔄 Migrating field map data to enhanced format...');
            
            const enhancedData = calculateEnhancedFieldStats(parsedOldData);
            saveEnhancedFieldCropData(enhancedData);
            
            return enhancedData;
        }
    } catch (error) {
        console.error('❌ Error migrating to enhanced field crop data:', error);
    }
    return null;
};
