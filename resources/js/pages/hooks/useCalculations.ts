// resources\js\pages\hooks\useCalculations.ts - Complete Version
import { useMemo, useState, useEffect } from 'react';
import { IrrigationInput, CalculationResults } from '../types/interfaces';
import {
    calculatePipeRolls,
    calculateImprovedHeadLoss,
    checkVelocity,
    evaluatePipeOverall,
    evaluateSprinklerOverall,
    evaluatePumpOverall,
    formatNumber,
    parseRangeValue,
    // เพิ่มฟังก์ชันใหม่
    evaluateSprinklerAdvanced,
    evaluatePumpAdvanced,
    evaluatePipeAdvanced,
    selectBestEquipmentByPrice,
    detectSignificantInputChanges,
    normalizeEquipmentData,
    validateEquipmentData,
} from '../utils/calculations';

// Enhanced API Functions with better debugging
const fetchEquipmentData = async (categoryName: string) => {
    try {
        console.log(`🔍 Fetching ${categoryName} data from /api/equipments/by-category/${categoryName}`);
        
        // ลองหลาย endpoint เพื่อหา endpoint ที่ถูกต้อง
        const endpoints = [
            `/api/equipments/by-category/${categoryName}`,
            `/api/equipments/category/${categoryName}`,
            `/api/equipments?category=${categoryName}`,
            `/api/equipments/by-category-name/${categoryName}`
        ];
        
        let data: any[] = [];
        let successEndpoint: string | null = null;
        
        for (const endpoint of endpoints) {
            try {
                console.log(`🔗 Trying endpoint: ${endpoint}`);
                const response = await fetch(endpoint);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log(`✅ Success with ${endpoint}:`, {
                        count: Array.isArray(result) ? result.length : 'Not array',
                        sample: Array.isArray(result) && result[0] ? result[0] : result
                    });
                    
                    data = Array.isArray(result) ? result : [];
                    successEndpoint = endpoint;
                    break;
                } else {
                    console.log(`❌ Failed ${endpoint}: ${response.status} ${response.statusText}`);
                }
            } catch (endpointError) {
                console.log(`💥 Error with ${endpoint}:`, endpointError);
            }
        }
        
        if (!successEndpoint) {
            console.warn(`⚠️ No working endpoint found for ${categoryName}, trying fallback...`);
            
            // Fallback: ลองดึงข้อมูลทั้งหมดแล้วกรองตาม category
            try {
                const response = await fetch('/api/equipments');
                if (response.ok) {
                    const allEquipments = await response.json();
                    console.log('📦 All equipments fetched:', allEquipments.length);
                    
                    // กรองตาม category name
                    data = Array.isArray(allEquipments) 
                        ? allEquipments.filter(item => {
                            const categoryMatch = item.category?.name === categoryName ||
                                                item.category?.display_name?.toLowerCase().includes(categoryName.toLowerCase());
                            return categoryMatch;
                          })
                        : [];
                    
                    console.log(`🔎 Filtered ${categoryName} from all equipments:`, data.length);
                }
            } catch (fallbackError) {
                console.error('💥 Fallback also failed:', fallbackError);
            }
        }
        
        // Validate และ log ข้อมูลที่ได้
        if (data.length > 0) {
            console.log(`📊 Final ${categoryName} data analysis:`, {
                total: data.length,
                active: data.filter(item => item.is_active !== false).length,
                sampleItem: data[0],
                categories: [...new Set(data.map(item => item.category?.name || 'unknown'))]
            });
        } else {
            console.warn(`🚨 No ${categoryName} data found. Check:
1. Database has ${categoryName} category
2. Equipment exists in this category
3. Equipment is_active = true
4. API endpoint is correct`);
        }
        
        return data;
    } catch (error) {
        console.error(`💥 Fatal error fetching ${categoryName} data:`, error);
        return [];
    }
};

// ปรับปรุง data transformation ให้รองรับ database format ที่สมบูรณ์
const transformEquipmentData = (equipment: any[], categoryType: 'sprinkler' | 'pump' | 'pipe') => {
    return equipment.map(item => {
        try {
            // สร้าง base object
            const transformed: any = {
                id: item.id,
                productCode: item.product_code || item.productCode, // รองรับทั้งสองแบบ
                product_code: item.product_code || item.productCode,
                name: item.name,
                brand: item.brand,
                image: item.image,
                price: Number(item.price || 0),
                is_active: Boolean(item.is_active),
                description: item.description,
                created_at: item.created_at,
                updated_at: item.updated_at,
                category_id: item.category_id,
            };

            // แปลงและรวม attributes จากหลายแหล่ง
            const allAttributes = {};

            // Priority 1: ใช้จาก root level ก่อน (จาก calculation format)
            Object.keys(item).forEach(key => {
                if (!['id', 'category_id', 'product_code', 'productCode', 'name', 'brand', 'image', 'price', 'description', 'is_active', 'created_at', 'updated_at', 'category', 'attributes', 'formatted_attributes', 'attributes_raw', 'pumpAccessories', 'pumpAccessory'].includes(key)) {
                    (allAttributes as any)[key] = item[key];
                }
            });

            // Priority 2: ใช้จาก attributes object
            if (item.attributes && typeof item.attributes === 'object') {
                Object.keys(item.attributes).forEach(key => {
                    if (!(allAttributes as any)[key]) { // ไม่เขียนทับถ้ามีแล้ว
                        (allAttributes as any)[key] = item.attributes[key];
                    }
                });
            }

            // Priority 3: ใช้จาก attributes_raw
            if (item.attributes_raw && typeof item.attributes_raw === 'object') {
                Object.keys(item.attributes_raw).forEach(key => {
                    if (!(allAttributes as any)[key]) {
                        (allAttributes as any)[key] = item.attributes_raw[key];
                    }
                });
            }

            // Priority 4: ใช้จาก structured attributes (array format)
            if (Array.isArray(item.formatted_attributes)) {
                item.formatted_attributes.forEach((attr: any) => {
                    if (attr.attribute_name && attr.value !== undefined) {
                        if (!(allAttributes as any)[attr.attribute_name]) {
                            (allAttributes as any)[attr.attribute_name] = attr.value;
                        }
                    }
                });
            }

            // รวม attributes เข้ากับ transformed object
            Object.keys(allAttributes).forEach(key => {
                transformed[key] = (allAttributes as any)[key];
            });

            // Handle specific attributes ตาม category type และแปลงข้อมูลให้ถูกต้อง
            switch (categoryType) {
                case 'sprinkler':
                    // Parse และ validate sprinkler attributes
                    if (transformed.waterVolumeLitersPerHour !== undefined) {
                        transformed.waterVolumeLitersPerHour = parseRangeValue(transformed.waterVolumeLitersPerHour);
                    }
                    if (transformed.radiusMeters !== undefined) {
                        transformed.radiusMeters = parseRangeValue(transformed.radiusMeters);
                    }
                    if (transformed.pressureBar !== undefined) {
                        transformed.pressureBar = parseRangeValue(transformed.pressureBar);
                    }
                    
                    // Validate required fields
                    if (!transformed.waterVolumeLitersPerHour || !transformed.radiusMeters || !transformed.pressureBar) {
                        console.warn(`Sprinkler ${transformed.id} missing required attributes:`, {
                            waterVolumeLitersPerHour: transformed.waterVolumeLitersPerHour,
                            radiusMeters: transformed.radiusMeters,
                            pressureBar: transformed.pressureBar
                        });
                    }
                    break;

                case 'pump':
                    // Parse และ validate pump attributes
                    const numericFields = ['powerHP', 'powerKW', 'phase', 'inlet_size_inch', 'outlet_size_inch', 'max_head_m', 'max_flow_rate_lpm', 'suction_depth_m', 'weight_kg'];
                    numericFields.forEach(field => {
                        if (transformed[field] !== undefined) {
                            transformed[field] = Number(transformed[field]) || 0;
                        }
                    });

                    const rangeFields = ['flow_rate_lpm', 'head_m'];
                    rangeFields.forEach(field => {
                        if (transformed[field] !== undefined) {
                            transformed[field] = parseRangeValue(transformed[field]);
                        }
                    });

                    // Handle pump accessories
                    if (item.pumpAccessories || item.pump_accessories) {
                        transformed.pumpAccessories = item.pumpAccessories || item.pump_accessories || [];
                    }
                    
                    // Validate required fields
                    if (!transformed.powerHP || !transformed.flow_rate_lpm || !transformed.head_m) {
                        console.warn(`Pump ${transformed.id} missing required attributes:`, {
                            powerHP: transformed.powerHP,
                            flow_rate_lpm: transformed.flow_rate_lpm,
                            head_m: transformed.head_m
                        });
                    }
                    break;

                case 'pipe':
                    // Parse และ validate pipe attributes
                    if (transformed.pn !== undefined) {
                        transformed.pn = Number(transformed.pn) || 0;
                    }
                    if (transformed.sizeMM !== undefined) {
                        transformed.sizeMM = Number(transformed.sizeMM) || 0;
                    }
                    if (transformed.lengthM !== undefined) {
                        transformed.lengthM = Number(transformed.lengthM) || 0;
                    }
                    
                    // Validate required fields
                    if (!transformed.pipeType || !transformed.sizeMM || !transformed.lengthM) {
                        console.warn(`Pipe ${transformed.id} missing required attributes:`, {
                            pipeType: transformed.pipeType,
                            sizeMM: transformed.sizeMM,
                            lengthM: transformed.lengthM
                        });
                    }
                    break;
            }

            return transformed;
        } catch (error) {
            console.error(`Error transforming ${categoryType} equipment:`, item.id, error);
            throw error; // Re-throw ให้ caller จัดการ
        }
    });
};

// Enhanced calculation functions with better pressure handling
const calculateDynamicPressureHead = (selectedSprinkler: any, defaultPressure: number): number => {
    if (!selectedSprinkler) return defaultPressure;

    try {
        let minPressure, maxPressure;
        
        const pressureData = selectedSprinkler.pressureBar || selectedSprinkler.pressure_bar;
        
        if (Array.isArray(pressureData)) {
            minPressure = pressureData[0];
            maxPressure = pressureData[1];
        } else if (typeof pressureData === 'string' && pressureData.includes('-')) {
            const parts = pressureData.split('-');
            minPressure = parseFloat(parts[0]);
            maxPressure = parseFloat(parts[1]);
        } else {
            minPressure = maxPressure = parseFloat(String(pressureData));
        }
        
        if (isNaN(minPressure) || isNaN(maxPressure)) {
            return defaultPressure;
        }
        
        // Use average pressure and convert from bar to meters (1 bar ≈ 10.2 m)
        const avgPressureBar = (minPressure + maxPressure) / 2;
        return avgPressureBar * 10.2;
    } catch (error) {
        console.error('Error calculating pressure from sprinkler:', error);
        return defaultPressure;
    }
};

// Enhanced flow calculation with better safety factors
const calculateSafetyAdjustedFlow = (baseFlow: number, systemComplexity: string): number => {
    let safetyFactor = 1.25; // Default 25%
    
    switch (systemComplexity) {
        case 'simple': // Only branch pipes
            safetyFactor = 1.15;
            break;
        case 'medium': // Branch + secondary pipes
            safetyFactor = 1.25;
            break;
        case 'complex': // Branch + secondary + main pipes
            safetyFactor = 1.35;
            break;
        default:
            safetyFactor = 1.25;
    }
    
    return baseFlow * safetyFactor;
};

export const useCalculations = (
    input: IrrigationInput,
    selectedSprinkler?: any
): CalculationResults | null => {
    const [sprinklerData, setSprinklerData] = useState<any[]>([]);
    const [pumpData, setPumpData] = useState<any[]>([]);
    const [pipeData, setPipeData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Enhanced data loading with better error handling
    useEffect(() => {
        const loadEquipmentData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                console.log('🔄 Loading equipment data from database...');
                
                const [sprinklers, pumps, pipes] = await Promise.all([
                    fetchEquipmentData('sprinkler'),
                    fetchEquipmentData('pump'),
                    fetchEquipmentData('pipe')
                ]);

                console.log('📦 Raw data from API:', { 
                    sprinklers: { count: sprinklers.length, sample: sprinklers[0] },
                    pumps: { count: pumps.length, sample: pumps[0] },
                    pipes: { count: pipes.length, sample: pipes[0] }
                });

                // Transform and validate data with better error handling
                const transformedSprinklers = sprinklers
                    .map((s: { id: any; }) => {
                        try {
                            return transformEquipmentData([s], 'sprinkler')[0];
                        } catch (error) {
                            console.warn('Failed to transform sprinkler:', s.id, error);
                            return null;
                        }
                    })
                    .filter((s: { is_active: boolean; }) => s && s.is_active !== false);

                const transformedPumps = pumps
                    .map((p: { id: any; }) => {
                        try {
                            return transformEquipmentData([p], 'pump')[0];
                        } catch (error) {
                            console.warn('Failed to transform pump:', p.id, error);
                            return null;
                        }
                    })
                    .filter((p: { is_active: boolean; }) => p && p.is_active !== false);

                const transformedPipes = pipes
                    .map((p: { id: any; }) => {
                        try {
                            return transformEquipmentData([p], 'pipe')[0];
                        } catch (error) {
                            console.warn('Failed to transform pipe:', p.id, error);
                            return null;
                        }
                    })
                    .filter((p: { is_active: boolean; }) => p && p.is_active !== false);

                console.log('✅ Transformed active data:', { 
                    sprinklers: { count: transformedSprinklers.length, sample: transformedSprinklers[0] },
                    pumps: { count: transformedPumps.length, sample: transformedPumps[0] },
                    pipes: { count: transformedPipes.length, sample: transformedPipes[0] }
                });

                // Check if we have minimum required data
                if (transformedSprinklers.length === 0) {
                    console.warn('⚠️ No active sprinklers found');
                }
                if (transformedPumps.length === 0) {
                    console.warn('⚠️ No active pumps found');
                }
                if (transformedPipes.length === 0) {
                    console.warn('⚠️ No active pipes found');
                }

                // Set data even if some categories are empty
                setSprinklerData(transformedSprinklers);
                setPumpData(transformedPumps);
                setPipeData(transformedPipes);

                if (transformedSprinklers.length === 0 && transformedPumps.length === 0 && transformedPipes.length === 0) {
                    setError('ไม่พบข้อมูลอุปกรณ์ที่เปิดใช้งานในระบบ กรุณาตรวจสอบฐานข้อมูล');
                }

            } catch (error) {
                console.error('💥 Failed to load equipment data:', error);
                setError(`ไม่สามารถโหลดข้อมูลอุปกรณ์ได้: ${error instanceof Error ? error.message : 'Unknown error'}`);
                
                // Set empty arrays to prevent null checks
                setSprinklerData([]);
                setPumpData([]);
                setPipeData([]);
            } finally {
                setLoading(false);
            }
        };

        loadEquipmentData();
    }, []);

    return useMemo(() => {
        if (loading || error) {
            console.log('Still loading or error occurred:', { loading, error });
            return null;
        }

        if (!sprinklerData.length || !pumpData.length || !pipeData.length) {
            console.log('Missing equipment data:', { 
                sprinklers: sprinklerData.length, 
                pumps: pumpData.length, 
                pipes: pipeData.length 
            });
            return null;
        }

        console.log('Starting enhanced calculations...');

        // Enhanced water requirement calculations
        const totalWaterRequiredPerDay = input.totalTrees * input.waterPerTreeLiters;
        const irrigationTimeHours = input.irrigationTimeMinutes / 60;
        const totalWaterRequiredLPH = totalWaterRequiredPerDay / irrigationTimeHours;
        const totalWaterRequiredLPM = totalWaterRequiredLPH / 60;

        // Enhanced flow calculations
        const waterPerZoneLPH = totalWaterRequiredLPH / input.numberOfZones;
        const waterPerZoneLPM = waterPerZoneLPH / 60;

        const totalSprinklers = Math.ceil(input.totalTrees * input.sprinklersPerTree);
        const sprinklersPerZone = totalSprinklers / input.numberOfZones;
        const waterPerSprinklerLPH = waterPerZoneLPH / sprinklersPerZone;
        const waterPerSprinklerLPM = waterPerSprinklerLPH / 60;

        // System complexity assessment
        const hasValidSecondaryPipe = input.longestSecondaryPipeM > 0 && input.totalSecondaryPipeM > 0;
        const hasValidMainPipe = input.longestMainPipeM > 0 && input.totalMainPipeM > 0;
        
        let systemComplexity = 'simple';
        if (hasValidSecondaryPipe && hasValidMainPipe) {
            systemComplexity = 'complex';
        } else if (hasValidSecondaryPipe || hasValidMainPipe) {
            systemComplexity = 'medium';
        }

        // Enhanced flow calculations for each pipe section
        const flowBranch = waterPerSprinklerLPM * input.sprinklersPerBranch;
        const flowSecondary = hasValidSecondaryPipe 
            ? flowBranch * input.branchesPerSecondary 
            : 0;
        const flowMain = hasValidMainPipe
            ? waterPerZoneLPM * input.simultaneousZones
            : 0;

        // Apply safety factors based on system complexity
        const adjustedFlowBranch = calculateSafetyAdjustedFlow(flowBranch, systemComplexity);
        const adjustedFlowSecondary = hasValidSecondaryPipe 
            ? calculateSafetyAdjustedFlow(flowSecondary, systemComplexity)
            : 0;
        const adjustedFlowMain = hasValidMainPipe 
            ? calculateSafetyAdjustedFlow(flowMain, systemComplexity)
            : 0;

        // Enhanced pressure calculation using selected sprinkler
        const pressureFromSprinkler = calculateDynamicPressureHead(
            selectedSprinkler, 
            input.pressureHeadM
        );

        // System requirements for enhanced analysis
        const systemRequirements = {
            farmSize: input.farmSizeRai,
            totalLength: input.totalBranchPipeM + input.totalSecondaryPipeM + input.totalMainPipeM,
            pressureRequirement: pressureFromSprinkler
        };

        // Enhanced sprinkler analysis with database integration (ใช้ฟังก์ชันใหม่)
        const analyzedSprinklers = sprinklerData.map(sprinkler => {
            console.log('Analyzing sprinkler:', sprinkler.productCode, sprinkler);
            return evaluateSprinklerAdvanced(sprinkler, waterPerSprinklerLPH, {
                farmSize: input.farmSizeRai,
                numberOfZones: input.numberOfZones,
                irrigationTime: input.irrigationTimeMinutes
            });
        }).sort((a, b) => {
            // เรียงตามระดับคำแนะนำ แล้วตามราคา (สูงไปต่ำ)
            if (a.isRecommended !== b.isRecommended) {
                return b.isRecommended ? 1 : -1;
            }
            if (a.isGoodChoice !== b.isGoodChoice) {
                return b.isGoodChoice ? 1 : -1;
            }
            if (a.isUsable !== b.isUsable) {
                return b.isUsable ? 1 : -1;
            }
            return b.price - a.price; // ราคาสูงไปต่ำในกลุ่มเดียวกัน
        });

        console.log('Analyzed sprinklers sample:', analyzedSprinklers.slice(0, 3));

        // Enhanced pipe analysis with improved scoring (ใช้ฟังก์ชันใหม่)
        const analyzedBranchPipes = pipeData.map(pipe => {
            console.log('Analyzing branch pipe:', pipe.productCode, pipe);
            return evaluatePipeAdvanced(
                pipe,
                adjustedFlowBranch,
                input.longestBranchPipeM,
                'branch',
                input.pipeAgeYears || 0,
                ['LDPE', 'Flexible PE', 'PE-RT', 'PVC', 'HDPE PE 80'],
                systemRequirements
            );
        }).sort((a, b) => {
            // เรียงตามระดับคำแนะนำ แล้วตามราคา (สูงไปต่ำ)
            if (a.isRecommended !== b.isRecommended) {
                return b.isRecommended ? 1 : -1;
            }
            if (a.isGoodChoice !== b.isGoodChoice) {
                return b.isGoodChoice ? 1 : -1;
            }
            if (a.isUsable !== b.isUsable) {
                return b.isUsable ? 1 : -1;
            }
            return b.price - a.price;
        });

        const analyzedSecondaryPipes = hasValidSecondaryPipe 
            ? pipeData.map(pipe =>
                evaluatePipeAdvanced(
                    pipe,
                    adjustedFlowSecondary,
                    input.longestSecondaryPipeM,
                    'secondary',
                    input.pipeAgeYears || 0,
                    ['HDPE PE 80', 'HDPE PE 100', 'PVC'],
                    systemRequirements
                )
              ).sort((a, b) => {
                if (a.isRecommended !== b.isRecommended) {
                    return b.isRecommended ? 1 : -1;
                }
                if (a.isGoodChoice !== b.isGoodChoice) {
                    return b.isGoodChoice ? 1 : -1;
                }
                if (a.isUsable !== b.isUsable) {
                    return b.isUsable ? 1 : -1;
                }
                return b.price - a.price;
              })
            : [];

        const analyzedMainPipes = hasValidMainPipe
            ? pipeData.map(pipe =>
                evaluatePipeAdvanced(
                    pipe,
                    adjustedFlowMain,
                    input.longestMainPipeM,
                    'main',
                    input.pipeAgeYears || 0,
                    ['HDPE PE 100', 'HDPE PE 80'],
                    systemRequirements
                )
              ).sort((a, b) => {
                if (a.isRecommended !== b.isRecommended) {
                    return b.isRecommended ? 1 : -1;
                }
                if (a.isGoodChoice !== b.isGoodChoice) {
                    return b.isGoodChoice ? 1 : -1;
                }
                if (a.isUsable !== b.isUsable) {
                    return b.isUsable ? 1 : -1;
                }
                return b.price - a.price;
              })
            : [];

        // Select best pipes for calculations
        const bestBranchPipe = analyzedBranchPipes.find(p => p.isRecommended) || 
                              analyzedBranchPipes.find(p => p.isUsable) || 
                              analyzedBranchPipes[0];
        
        const bestSecondaryPipe = hasValidSecondaryPipe
            ? (analyzedSecondaryPipes.find(p => p.isRecommended) || 
               analyzedSecondaryPipes.find(p => p.isUsable) || 
               analyzedSecondaryPipes[0])
            : null;
            
        const bestMainPipe = hasValidMainPipe
            ? (analyzedMainPipes.find(p => p.isRecommended) || 
               analyzedMainPipes.find(p => p.isUsable) || 
               analyzedMainPipes[0])
            : null;

        // Enhanced head loss calculations
        const branchLoss = bestBranchPipe
            ? calculateImprovedHeadLoss(
                  adjustedFlowBranch,
                  bestBranchPipe.sizeMM,
                  input.longestBranchPipeM,
                  bestBranchPipe.pipeType,
                  'branch',
                  input.pipeAgeYears || 0
              )
            : { major: 0, minor: 0, total: 0, velocity: 0, C: 135 };

        const secondaryLoss = (bestSecondaryPipe && hasValidSecondaryPipe)
            ? calculateImprovedHeadLoss(
                  adjustedFlowSecondary,
                  bestSecondaryPipe.sizeMM,
                  input.longestSecondaryPipeM,
                  bestSecondaryPipe.pipeType,
                  'secondary',
                  input.pipeAgeYears || 0
              )
            : { major: 0, minor: 0, total: 0, velocity: 0, C: 140 };

        const mainLoss = (bestMainPipe && hasValidMainPipe)
            ? calculateImprovedHeadLoss(
                  adjustedFlowMain,
                  bestMainPipe.sizeMM,
                  input.longestMainPipeM,
                  bestMainPipe.pipeType,
                  'main',
                  input.pipeAgeYears || 0
              )
            : { major: 0, minor: 0, total: 0, velocity: 0, C: 145 };

        const totalHeadLoss = branchLoss.total + secondaryLoss.total + mainLoss.total;
        const totalMajorLoss = branchLoss.major + secondaryLoss.major + mainLoss.major;
        const totalMinorLoss = branchLoss.minor + secondaryLoss.minor + mainLoss.minor;

        // Enhanced pump head calculation
        const pumpHeadRequired = input.staticHeadM + totalHeadLoss + pressureFromSprinkler;
        
        // Determine pump flow requirement
        const pumpRequiredFlow = Math.max(
            adjustedFlowBranch,
            adjustedFlowSecondary,
            adjustedFlowMain
        );

        // Enhanced pump analysis (ใช้ฟังก์ชันใหม่)
        const analyzedPumps = pumpData.map(pump => {
            console.log('Analyzing pump:', pump.productCode, pump);
            return evaluatePumpAdvanced(pump, pumpRequiredFlow, pumpHeadRequired, {
                numberOfZones: input.numberOfZones,
                farmSize: input.farmSizeRai,
                simultaneousZones: input.simultaneousZones
            });
        }).sort((a, b) => {
            // เรียงตามระดับคำแนะนำ แล้วตามราคา (สูงไปต่ำ)
            if (a.isRecommended !== b.isRecommended) {
                return b.isRecommended ? 1 : -1;
            }
            if (a.isGoodChoice !== b.isGoodChoice) {
                return b.isGoodChoice ? 1 : -1;
            }
            if (a.isUsable !== b.isUsable) {
                return b.isUsable ? 1 : -1;
            }
            return b.price - a.price; // ราคาสูงไปต่ำในกลุ่มเดียวกัน
        });

        console.log('Analyzed pumps sample:', analyzedPumps.slice(0, 3));

        // Calculate pipe rolls
        const branchRolls = bestBranchPipe
            ? calculatePipeRolls(input.totalBranchPipeM, bestBranchPipe.lengthM)
            : 1;
        const secondaryRolls = bestSecondaryPipe && hasValidSecondaryPipe
            ? calculatePipeRolls(input.totalSecondaryPipeM, bestSecondaryPipe.lengthM)
            : 0;
        const mainRolls = bestMainPipe && hasValidMainPipe
            ? calculatePipeRolls(input.totalMainPipeM, bestMainPipe.lengthM)
            : 0;

        // Enhanced velocity warnings
        const velocityWarnings: string[] = [];
        if (branchLoss.velocity > 0) {
            const warning = checkVelocity(branchLoss.velocity, 'ท่อย่อย');
            if (!warning.includes('🟢')) velocityWarnings.push(warning);
        }
        
        if (hasValidSecondaryPipe && secondaryLoss.velocity > 0) {
            const warning = checkVelocity(secondaryLoss.velocity, 'ท่อรอง');
            if (!warning.includes('🟢')) velocityWarnings.push(warning);
        }
        
        if (hasValidMainPipe && mainLoss.velocity > 0) {
            const warning = checkVelocity(mainLoss.velocity, 'ท่อหลัก');
            if (!warning.includes('🟢')) velocityWarnings.push(warning);
        }

        // Filter recommendations (ปรับปรุงให้แม่นยำขึ้น)
        const recommendedSprinklers = analyzedSprinklers.filter(s => s.isRecommended);
        const recommendedBranchPipe = analyzedBranchPipes.filter(p => p.isRecommended);
        const recommendedSecondaryPipe = analyzedSecondaryPipes.filter(p => p.isRecommended);
        const recommendedMainPipe = analyzedMainPipes.filter(p => p.isRecommended);
        const recommendedPump = analyzedPumps.filter(p => p.isRecommended);

        console.log('Enhanced calculations completed successfully');
        console.log('Recommendations:', {
            sprinklers: recommendedSprinklers.length,
            branchPipes: recommendedBranchPipe.length,
            secondaryPipes: recommendedSecondaryPipe.length,
            mainPipes: recommendedMainPipe.length,
            pumps: recommendedPump.length
        });

        // เพิ่มข้อมูลการเลือกที่ดีที่สุด (ราคาสูงสุดในกลุ่มแนะนำ)
        const bestSelections = {
            bestSprinkler: selectBestEquipmentByPrice(analyzedSprinklers, true),
            bestBranchPipe: selectBestEquipmentByPrice(analyzedBranchPipes, true),
            bestSecondaryPipe: hasValidSecondaryPipe ? selectBestEquipmentByPrice(analyzedSecondaryPipes, true) : null,
            bestMainPipe: hasValidMainPipe ? selectBestEquipmentByPrice(analyzedMainPipes, true) : null,
            bestPump: selectBestEquipmentByPrice(analyzedPumps, true)
        };

        return {
            totalWaterRequiredLPH: formatNumber(totalWaterRequiredLPH, 3),
            totalWaterRequiredLPM: formatNumber(totalWaterRequiredLPM, 3),
            waterPerZoneLPH: formatNumber(waterPerZoneLPH, 3),
            waterPerZoneLPM: formatNumber(waterPerZoneLPM, 3),
            totalSprinklers,
            sprinklersPerZone: formatNumber(sprinklersPerZone, 3),
            waterPerSprinklerLPH: formatNumber(waterPerSprinklerLPH, 3),
            waterPerSprinklerLPM: formatNumber(waterPerSprinklerLPM, 3),
            
            // Equipment recommendations
            recommendedSprinklers,
            recommendedBranchPipe,
            recommendedSecondaryPipe,
            recommendedMainPipe,
            recommendedPump,
            
            // Analysis results
            analyzedBranchPipes,
            analyzedSecondaryPipes,
            analyzedMainPipes,
            analyzedSprinklers,
            analyzedPumps,
            
            // เพิ่มข้อมูลการเลือกที่ดีที่สุด
            bestSelections,
            
            // Pipe calculations
            branchPipeRolls: branchRolls,
            secondaryPipeRolls: secondaryRolls,
            mainPipeRolls: mainRolls,
            
            // Head loss analysis
            headLoss: {
                branch: {
                    major: formatNumber(branchLoss.major, 3),
                    minor: formatNumber(branchLoss.minor, 3),
                    total: formatNumber(branchLoss.total, 3),
                },
                secondary: {
                    major: formatNumber(secondaryLoss.major, 3),
                    minor: formatNumber(secondaryLoss.minor, 3),
                    total: formatNumber(secondaryLoss.total, 3),
                },
                main: {
                    major: formatNumber(mainLoss.major, 3),
                    minor: formatNumber(mainLoss.minor, 3),
                    total: formatNumber(mainLoss.total, 3),
                },
                totalMajor: formatNumber(totalMajorLoss, 3),
                totalMinor: formatNumber(totalMinorLoss, 3),
                total: formatNumber(totalHeadLoss, 3),
            },
            
            // Velocity analysis
            velocity: {
                branch: formatNumber(branchLoss.velocity, 3),
                secondary: formatNumber(secondaryLoss.velocity, 3),
                main: formatNumber(mainLoss.velocity, 3),
            },
            
            // Flow analysis
            flows: {
                branch: formatNumber(adjustedFlowBranch, 3),
                secondary: formatNumber(adjustedFlowSecondary, 3),
                main: formatNumber(adjustedFlowMain, 3),
            },
            
            // Coefficient analysis
            coefficients: {
                branch: formatNumber(branchLoss.C, 3),
                secondary: formatNumber(secondaryLoss.C, 3),
                main: formatNumber(mainLoss.C, 3),
            },
            
            // Pump requirements
            pumpHeadRequired: formatNumber(pumpHeadRequired, 3),
            pressureFromSprinkler: formatNumber(pressureFromSprinkler, 3),
            
            // System parameters
            safetyFactor: systemComplexity === 'simple' ? 1.15 : 
                         systemComplexity === 'medium' ? 1.25 : 1.35,
            adjustedFlow: formatNumber(Math.max(adjustedFlowBranch, adjustedFlowSecondary, adjustedFlowMain), 3),
            velocityWarnings,
            hasValidSecondaryPipe,
            hasValidMainPipe,
            
            // Additional metadata
            systemComplexity,
            calculationMetadata: {
                equipmentCounts: {
                    sprinklers: sprinklerData.length,
                    pumps: pumpData.length,
                    pipes: pipeData.length
                },
                selectedEquipment: {
                    sprinkler: selectedSprinkler?.name || null,
                    pressureSource: selectedSprinkler ? 'sprinkler' : 'manual'
                },
                analysisTimestamp: new Date().toISOString(),
                dataSource: 'database', // ระบุว่าข้อมูลมาจาก database
                loadingErrors: error ? [error] : [],
                systemRequirements: {
                    farmSize: input.farmSizeRai,
                    complexity: systemComplexity,
                    totalFlow: Math.max(adjustedFlowBranch, adjustedFlowSecondary, adjustedFlowMain),
                    totalHead: pumpHeadRequired
                }
            }
        };
    }, [input, selectedSprinkler, sprinklerData, pumpData, pipeData, loading, error]);
};
