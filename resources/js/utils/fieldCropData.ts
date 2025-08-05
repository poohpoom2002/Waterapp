// resources\js\utils\fieldCropData.ts
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
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

export interface FieldCropData {
    area: {
        size: number; 
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
            totalWaterRequirementPerDay: number; 
            pipeStats: {
                main: EnhancedPipeStats;
                submain: EnhancedPipeStats;
                lateral: EnhancedPipeStats;
                combined: {
                    longestPath: number; 
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
        totalWaterRequirementPerDay: number; 
        totalEstimatedYield: number;
        totalEstimatedIncome: number;
        irrigationEfficiency: number;
    };
}

export const calculateEnhancedPipeLength = (coordinates: any[]): number => {
    if (!coordinates || coordinates.length < 2) return 0;

    try {
        let totalLength = 0;
        
        for (let i = 0; i < coordinates.length - 1; i++) {
            const point1 = coordinates[i];
            const point2 = coordinates[i + 1];
            let lat1: number, lng1: number, lat2: number, lng2: number;
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

            if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
                console.warn('Invalid coordinate values:', { lat1, lng1, lat2, lng2 });
                continue;
            }

            const R = 6371000; 
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                     Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                     Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            totalLength += distance;
        }

        return Math.round(totalLength * 100) / 100; 
    } catch (error) {
        console.error('Error calculating pipe length:', error);
        return 0;
    }
};

export const calculateEnhancedPipeStats = (pipes: any[], pipeType: string): EnhancedPipeStats => {
    const typePipes = pipes.filter(pipe => {
        if (!pipe || !pipe.coordinates || !Array.isArray(pipe.coordinates) || pipe.coordinates.length < 2) {
            return false;
        }

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

export const identifyPipeTypeEnhanced = (pipe: any): string => {
    if (pipe.type) {
        const normalizedType = pipe.type.toLowerCase();
        if (['main', 'submain', 'lateral'].includes(normalizedType)) {
            return normalizedType;
        }
    }

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

    if (pipe.coordinates && pipe.coordinates.length >= 2) {
        const length = calculateEnhancedPipeLength(pipe.coordinates);
        
        if (length > 200) return 'main';      
        if (length > 100) return 'submain';   
        return 'lateral';                     
    }

    return 'lateral';
};

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

    const zonePipes = pipes.filter(pipe => {
        if (!pipe || !pipe.coordinates || !Array.isArray(pipe.coordinates) || pipe.coordinates.length < 2) {
            return false;
        }

        const hasZoneId = pipe.zoneId && pipe.zoneId.toString() === zoneId;
        const isInZone = isPipeInZoneEnhanced(pipe, currentZone);

        return hasZoneId || isInZone;
    });

    const mainStats = calculateEnhancedPipeStats(zonePipes, 'main');
    const submainStats = calculateEnhancedPipeStats(zonePipes, 'submain');
    const lateralStats = calculateEnhancedPipeStats(zonePipes, 'lateral');
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
    return result;
};

export const isPipeInZoneEnhanced = (pipe: any, zone: any): boolean => {
    if (!pipe.coordinates || !Array.isArray(pipe.coordinates) || pipe.coordinates.length < 2) {
        return false;
    }

    if (!zone.coordinates || !Array.isArray(zone.coordinates) || zone.coordinates.length < 3) {
        return false;
    }

    try {
        const testPoints: any[] = [];
        testPoints.push(pipe.coordinates[0]);
        testPoints.push(pipe.coordinates[pipe.coordinates.length - 1]);
        if (pipe.coordinates.length > 2) {
            const midIndex = Math.floor(pipe.coordinates.length / 2);
            testPoints.push(pipe.coordinates[midIndex]);
        }

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

export const calculateEnhancedFieldStats = (summaryData: any): FieldCropData => {
    const zones = Array.isArray(summaryData.zones) ? summaryData.zones : [];
    const pipes = Array.isArray(summaryData.pipes) ? summaryData.pipes : [];
    const irrigationPoints = Array.isArray(summaryData.irrigationPoints) ? summaryData.irrigationPoints : [];
    const irrigationLines = Array.isArray(summaryData.irrigationLines) ? summaryData.irrigationLines : [];
    const mainPipeStats = calculateEnhancedPipeStats(pipes, 'main');
    const submainPipeStats = calculateEnhancedPipeStats(pipes, 'submain');
    const lateralPipeStats = calculateEnhancedPipeStats(pipes, 'lateral');
    const enhancedZones = zones.map((zone: any) => {
        const zoneArea = calculateZoneAreaEnhanced(zone.coordinates);
        const zonePipeStats = calculateEnhancedZonePipeStats(pipes, zone.id.toString(), zones);
        const assignedCropValue = summaryData.zoneAssignments?.[zone.id];
        const crop = assignedCropValue ? getCropByValueEnhanced(assignedCropValue) : null;
        let totalPlantingPoints = 0;
        let sprinklerCount = 0;
        let waterRequirementPerDay = 0; 
        if (crop && zoneArea > 0) {
            const rowSpacing = (summaryData.rowSpacing?.[assignedCropValue] || crop.rowSpacing / 100);
            const plantSpacing = (summaryData.plantSpacing?.[assignedCropValue] || crop.plantSpacing / 100);
            
            if (rowSpacing > 0 && plantSpacing > 0) {
                const plantsPerSquareMeter = (1 / rowSpacing) * (1 / plantSpacing);
                totalPlantingPoints = Math.floor(zoneArea * plantsPerSquareMeter);
            }
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
            if (sprinklerCount > totalPlantingPoints) {
                totalPlantingPoints = sprinklerCount;
            }
            const avgIrrigationTimeHours = 0.5; 
            waterRequirementPerDay = totalPlantingPoints * crop.waterRequirement * (avgIrrigationTimeHours * 60);
        }

        return {
            id: zone.id,
            name: zone.name,
            area: zoneArea,
            plantCount: totalPlantingPoints, 
            sprinklerCount: Math.max(sprinklerCount, 1),
            areaInRai: zoneArea / 1600,
            coordinates: zone.coordinates,
            cropType: assignedCropValue,
            totalPlantingPoints: totalPlantingPoints,
            totalWaterRequirementPerDay: waterRequirementPerDay, 
            pipeStats: zonePipeStats
        };
    });

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

    const totalPlantingPoints = enhancedZones.reduce((sum, zone) => sum + zone.totalPlantingPoints, 0);
    const totalWaterRequirementPerDay = enhancedZones.reduce((sum, zone) => sum + zone.totalWaterRequirementPerDay, 0); 
    const totalArea = summaryData.fieldAreaSize || 0;

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
            totalWaterRequirementPerDay: totalWaterRequirementPerDay, 
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
            irrigationEfficiency: totalPlantingPoints > 0 ? (totalWaterRequirementPerDay / totalPlantingPoints) : 0
        }
    };
};

export const calculateZoneAreaEnhanced = (coordinates: any[]): number => {
    if (!coordinates || coordinates.length < 3) return 0;

    try {
        const points = coordinates.map(coord => {
            if (Array.isArray(coord) && coord.length >= 2) {
                return [parseFloat(coord[0]), parseFloat(coord[1])];
            } else if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
                return [coord.lat, coord.lng];
            }
            return null;
        }).filter(point => point !== null);

        if (points.length < 3) return 0;

        let area = 0;
        const n = points.length;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i][0] * points[j][1];
            area -= points[j][0] * points[i][1];
        }

        area = Math.abs(area) / 2;

        const metersPerDegree = 111320; 
        const areaInSquareMeters = area * metersPerDegree * metersPerDegree;

        return Math.round(areaInSquareMeters);
    } catch (error) {
        console.error('Error calculating zone area:', error);
        return 0;
    }
};

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

export const getCropByValueEnhanced = (cropValue: string): any => {
    try {
        const cropMap: { [key: string]: any } = {
            'rice': {
                name: 'Rice',
                yield: 650,
                price: 12,
                waterRequirement: 4.2, 
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
                waterRequirement: 2.5, 
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
                waterRequirement: 1.5, 
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
                waterRequirement: 3.5, 
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
                waterRequirement: 2.8, 
                rowSpacing: 50,
                plantSpacing: 20,
                category: 'legume',
                irrigationNeeds: 'medium',
                growthPeriod: 95
            }
        };
        
        return cropMap[cropValue] || {
            name: 'Unknown Crop',
            yield: 1000,
            price: 50,
            waterRequirement: 2.0, 
            rowSpacing: 50,
            plantSpacing: 50,
            category: 'general',
            irrigationNeeds: 'medium',
            growthPeriod: 120
        };
        
    } catch (error) {
        console.error('Error getting crop data:', error);
        
        return {
            name: 'Default Crop',
            yield: 1000,
            price: 50,
            waterRequirement: 2.0, 
            rowSpacing: 50,
            plantSpacing: 50,
            category: 'general',
            irrigationNeeds: 'medium',
            growthPeriod: 120
        };
    }
};

export const saveEnhancedFieldCropData = (fieldData: FieldCropData): void => {
    try {
        localStorage.setItem('enhancedFieldCropData', JSON.stringify(fieldData));
    } catch (error) {
        console.error('❌ Error saving enhanced field crop data:', error);
    }
};

export const getEnhancedFieldCropData = (): FieldCropData | null => {
    try {
        const data = localStorage.getItem('enhancedFieldCropData');
        if (data) {
            const parsedData = JSON.parse(data);
            return parsedData;
        }
    } catch (error) {
        console.error('❌ Error loading enhanced field crop data:', error);
    }
    return null;
};

export const migrateToEnhancedFieldCropData = (): FieldCropData | null => {
    try {
        const oldData = localStorage.getItem('fieldMapData');
        if (oldData) {
            const parsedOldData = JSON.parse(oldData);
            
            const enhancedData = calculateEnhancedFieldStats(parsedOldData);
            saveEnhancedFieldCropData(enhancedData);
            
            return enhancedData;
        }
    } catch (error) {
        console.error('❌ Error migrating to enhanced field crop data:', error);
    }
    return null;
};
