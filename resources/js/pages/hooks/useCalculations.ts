// hooks/useCalculations.ts
import { useMemo } from 'react';
import { IrrigationInput, CalculationResults } from '../types/interfaces';
import { SprinklerData } from '../product/Sprinkler';
import { PipeData } from '../product/Pipe';
import { PumpData } from '../product/Pump';
import {
    calculatePipeRolls,
    calculateImprovedHeadLoss,
    checkVelocity
} from '../utils/calculations';

// ฟังก์ชันคำนวณท่อที่แนะนำ
const getRecommendedPipes = (
    flow_lpm: number,
    length_m: number,
    allowedTypes: string[],
    sectionType: string,
    pipeAgeYears: number,
    minSize: number = 16,
    maxSize: number = 300
) => {
    const pipes = PipeData.filter(pipe => allowedTypes.includes(pipe.pipeType));
    
    const analyzed = pipes.map(pipe => {
        const headLossData = calculateImprovedHeadLoss(
            flow_lpm,
            pipe.sizeMM,
            length_m,
            pipe.pipeType,
            sectionType,
            pipeAgeYears
        );
        
        // คำนวณคะแนนความเหมาะสม
        let score = 0;
        const velocity = headLossData.velocity;
        
        // คะแนนความเร็ว (40%)
        if (velocity >= 0.8 && velocity <= 2.0) {
            score += 40; // ช่วงที่ดีที่สุด
        } else if (velocity >= 0.5 && velocity <= 2.5) {
            score += 30; // ช่วงดี
        } else if (velocity >= 0.3 && velocity <= 3.0) {
            score += 20; // ใช้ได้
        } else {
            score += 0; // ไม่เหมาะสม
        }
        
        // คะแนนขนาด (30%)
        if (pipe.sizeMM >= minSize && pipe.sizeMM <= maxSize) {
            score += 30;
        } else if (pipe.sizeMM >= minSize * 0.8 && pipe.sizeMM <= maxSize * 1.2) {
            score += 20;
        } else {
            score += 5;
        }
        
        // คะแนนราคาต่อประสิทธิภาพ (20%)
        const costEfficiency = (pipe.lengthM * 1000) / (pipe.price * pipe.sizeMM);
        if (costEfficiency > 50) {
            score += 20;
        } else if (costEfficiency > 30) {
            score += 15;
        } else if (costEfficiency > 20) {
            score += 10;
        } else {
            score += 5;
        }
        
        // คะแนน Head Loss (10%)
        if (headLossData.total < 1) {
            score += 10;
        } else if (headLossData.total < 2) {
            score += 8;
        } else if (headLossData.total < 5) {
            score += 5;
        } else {
            score += 2;
        }
        
        return {
            ...pipe,
            score,
            velocity,
            headLoss: headLossData.total,
            isRecommended: score >= 60,
            isGoodChoice: score >= 40,
            isUsable: score >= 20 && velocity >= 0.3 && velocity <= 3.0
        };
    });
    
    // เรียงตามคะแนน แล้วตามราคา
    return analyzed.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.price - b.price; // ราคาถูกกว่าดีกว่า
    });
};

export const useCalculations = (input: IrrigationInput): CalculationResults | null => {
    return useMemo(() => {
        const totalWaterRequiredPerDay = input.totalTrees * input.waterPerTreeLiters;
        const irrigationTimeHours = input.irrigationTimeMinutes / 60;
        const totalWaterRequiredLPH = totalWaterRequiredPerDay / irrigationTimeHours;
        const totalWaterRequiredLPM = totalWaterRequiredLPH / 60;

        const safetyFactor = 1.25;
        const adjustedFlow = totalWaterRequiredLPM * safetyFactor;

        const waterPerZoneLPH = totalWaterRequiredLPH / input.numberOfZones;
        const waterPerZoneLPM = waterPerZoneLPH / 60;

        const totalSprinklers = input.totalTrees * input.sprinklersPerTree;
        const sprinklersPerZone = totalSprinklers / input.numberOfZones;
        const waterPerSprinklerLPH = waterPerZoneLPH / sprinklersPerZone;
        const waterPerSprinklerLPM = waterPerSprinklerLPH / 60;

        // คำนวณ Flow ที่ถูกต้องสำหรับแต่ละประเภทท่อ
        const flowBranch = waterPerSprinklerLPM * input.sprinklersPerBranch;
        const flowSecondary = flowBranch * input.branchesPerSecondary;
        const flowMain = waterPerZoneLPM * input.simultaneousZones;

        // วิเคราะห์สปริงเกอร์ทั้งหมด
        const analyzedSprinklers = SprinklerData.map(sprinkler => {
            const minFlow = Array.isArray(sprinkler.waterVolumeLitersPerHour)
                ? sprinkler.waterVolumeLitersPerHour[0]
                : parseFloat(String(sprinkler.waterVolumeLitersPerHour).split('-')[0]);
            const maxFlow = Array.isArray(sprinkler.waterVolumeLitersPerHour)
                ? sprinkler.waterVolumeLitersPerHour[1]
                : parseFloat(String(sprinkler.waterVolumeLitersPerHour).split('-')[1]);

            let score = 0;
            
            // คะแนนความเหมาะสมของอัตราการไหล (50%) - เข้มงวดมากขึ้น
            if (waterPerSprinklerLPH >= minFlow && waterPerSprinklerLPH <= maxFlow) {
                // อยู่ในช่วงที่เหมาะสม
                const flowRange = maxFlow - minFlow;
                const positionInRange = (waterPerSprinklerLPH - minFlow) / flowRange;
                if (positionInRange >= 0.3 && positionInRange <= 0.7) {
                    score += 50; // อยู่กลางช่วง
                } else {
                    score += 45; // อยู่ในช่วงแต่ไม่ได้กลาง
                }
            } else if (waterPerSprinklerLPH >= minFlow * 0.9 && waterPerSprinklerLPH <= maxFlow * 1.1) {
                // ใกล้เคียงมาก (ช่วงแคบลง)
                score += 35;
            } else if (waterPerSprinklerLPH >= minFlow * 0.7 && waterPerSprinklerLPH <= maxFlow * 1.3) {
                // ใกล้เคียงพอใช้
                score += 20;
            } else if (waterPerSprinklerLPH >= minFlow * 0.5 && waterPerSprinklerLPH <= maxFlow * 1.5) {
                // ห่างไกลแต่ยังใช้ได้
                score += 10;
            } else {
                // ไม่เหมาะสมเลย
                score += 0;
            }

            // คะแนนราคาต่อประสิทธิภาพ (25%)
            const avgFlow = (minFlow + maxFlow) / 2;
            const pricePerFlow = sprinkler.price / avgFlow;
            if (pricePerFlow < 1) score += 25;
            else if (pricePerFlow < 2) score += 20;
            else if (pricePerFlow < 5) score += 15;
            else if (pricePerFlow < 10) score += 10;
            else score += 5;

            // คะแนนรัศมี (15%)
            const minRadius = Array.isArray(sprinkler.radiusMeters)
                ? sprinkler.radiusMeters[0]
                : parseFloat(String(sprinkler.radiusMeters).split('-')[0]);
            const maxRadius = Array.isArray(sprinkler.radiusMeters)
                ? sprinkler.radiusMeters[1]
                : parseFloat(String(sprinkler.radiusMeters).split('-')[1]);
            const avgRadius = (minRadius + maxRadius) / 2;
            
            if (avgRadius >= 8) score += 15;
            else if (avgRadius >= 5) score += 12;
            else if (avgRadius >= 3) score += 8;
            else score += 5;

            // คะแนนช่วงแรงดัน (10%)
            const minPressure = Array.isArray(sprinkler.pressureBar)
                ? sprinkler.pressureBar[0]
                : parseFloat(String(sprinkler.pressureBar).split('-')[0]);
            const maxPressure = Array.isArray(sprinkler.pressureBar)
                ? sprinkler.pressureBar[1]
                : parseFloat(String(sprinkler.pressureBar).split('-')[1]);
            const pressureRange = maxPressure - minPressure;
            
            if (pressureRange >= 3) score += 10;
            else if (pressureRange >= 2) score += 8;
            else if (pressureRange >= 1) score += 6;
            else score += 4;

            return {
                ...sprinkler,
                score,
                flowMatch: waterPerSprinklerLPH >= minFlow && waterPerSprinklerLPH <= maxFlow,
                flowCloseMatch: waterPerSprinklerLPH >= minFlow * 0.9 && waterPerSprinklerLPH <= maxFlow * 1.1,
                isRecommended: score >= 60 && (waterPerSprinklerLPH >= minFlow * 0.9 && waterPerSprinklerLPH <= maxFlow * 1.1),
                isGoodChoice: score >= 40 && (waterPerSprinklerLPH >= minFlow * 0.7 && waterPerSprinklerLPH <= maxFlow * 1.3),
                isUsable: score >= 20 && (waterPerSprinklerLPH >= minFlow * 0.5 && waterPerSprinklerLPH <= maxFlow * 1.5),
                targetFlow: waterPerSprinklerLPH,
                minFlow,
                maxFlow,
                avgRadius,
                pricePerFlow
            };
        });

        // หาสปริงเกอร์ที่แนะนำ
        const recommendedSprinklers = analyzedSprinklers.filter(s => s.isRecommended);

        // หาท่อที่เหมาะสมแบบใหม่
        const analyzedBranchPipes = getRecommendedPipes(
            flowBranch,
            input.longestBranchPipeM,
            ['LDPE', 'Flexible PE', 'PE-RT'],
            'branch',
            input.pipeAgeYears,
            16, // ขนาดขั้นต่ำ
            50  // ขนาดสูงสุด
        );

        const analyzedSecondaryPipes = getRecommendedPipes(
            flowSecondary,
            input.longestSecondaryPipeM,
            ['HDPE PE 80', 'HDPE PE 100', 'PVC'],
            'secondary',
            input.pipeAgeYears,
            25, // ขนาดขั้นต่ำ
            110 // ขนาดสูงสุด
        );

        const analyzedMainPipes = getRecommendedPipes(
            flowMain,
            input.longestMainPipeM,
            ['HDPE PE 100', 'HDPE PE 80'],
            'main',
            input.pipeAgeYears,
            40,  // ขนาดขั้นต่ำ
            200  // ขนาดสูงสุด
        );

        // แยกท่อที่แนะนำ
        const recommendedBranchPipe = analyzedBranchPipes.filter(p => p.isRecommended);
        const recommendedSecondaryPipe = analyzedSecondaryPipes.filter(p => p.isRecommended);
        const recommendedMainPipe = analyzedMainPipes.filter(p => p.isRecommended);

        // เลือกท่อ default (คะแนนสูงสุด)
        const defaultBranchPipe = analyzedBranchPipes.find(p => p.isUsable) || analyzedBranchPipes[0];
        const defaultSecondaryPipe = analyzedSecondaryPipes.find(p => p.isUsable) || analyzedSecondaryPipes[0];
        const defaultMainPipe = analyzedMainPipes.find(p => p.isUsable) || analyzedMainPipes[0];

        // คำนวณจำนวนม้วนท่อ
        const branchRolls = defaultBranchPipe
            ? calculatePipeRolls(input.totalBranchPipeM, defaultBranchPipe.lengthM) : 1;
        const secondaryRolls = defaultSecondaryPipe
            ? calculatePipeRolls(input.totalSecondaryPipeM, defaultSecondaryPipe.lengthM) : 1;
        const mainRolls = defaultMainPipe
            ? calculatePipeRolls(input.totalMainPipeM, defaultMainPipe.lengthM) : 1;

        // คำนวณ Head Loss และ Velocity
        const branchLoss = defaultBranchPipe
            ? calculateImprovedHeadLoss(
                flowBranch, defaultBranchPipe.sizeMM, input.longestBranchPipeM,
                defaultBranchPipe.pipeType, 'branch', input.pipeAgeYears
            )
            : { major: 0, minor: 0, total: 0, velocity: 0, C: 135 };

        const secondaryLoss = defaultSecondaryPipe
            ? calculateImprovedHeadLoss(
                flowSecondary, defaultSecondaryPipe.sizeMM, input.longestSecondaryPipeM,
                defaultSecondaryPipe.pipeType, 'secondary', input.pipeAgeYears
            )
            : { major: 0, minor: 0, total: 0, velocity: 0, C: 140 };

        const mainLoss = defaultMainPipe
            ? calculateImprovedHeadLoss(
                flowMain, defaultMainPipe.sizeMM, input.longestMainPipeM,
                defaultMainPipe.pipeType, 'main', input.pipeAgeYears
            )
            : { major: 0, minor: 0, total: 0, velocity: 0, C: 145 };

        const totalHeadLoss = branchLoss.total + secondaryLoss.total + mainLoss.total;
        const totalMajorLoss = branchLoss.major + secondaryLoss.major + mainLoss.major;
        const totalMinorLoss = branchLoss.minor + secondaryLoss.minor + mainLoss.minor;

        // ตรวจสอบความเร็ว
        const velocityWarnings = [
            checkVelocity(branchLoss.velocity, 'ท่อย่อย'),
            checkVelocity(secondaryLoss.velocity, 'ท่อรอง'),
            checkVelocity(mainLoss.velocity, 'ท่อหลัก'),
        ].filter(warning => !warning.includes('🟢'));

        // คำนวณ Pump Head ที่ต้องการ
        const pumpHeadRequired = input.staticHeadM + totalHeadLoss + input.pressureHeadM;

        // วิเคราะห์ปั๊มทั้งหมด
        const analyzedPumps = PumpData.map(pump => {
            const maxFlow = pump.max_flow_rate_lpm || (Array.isArray(pump.flow_rate_lpm) ? pump.flow_rate_lpm[1] : 0);
            const maxHead = pump.max_head_m || (Array.isArray(pump.head_m) ? pump.head_m[0] : 0);

            let score = 0;

            // คะแนนความเหมาะสมของอัตราการไหล (40%) - เข้มงวดมากขึ้น
            if (maxFlow >= flowMain) {
                const flowRatio = maxFlow / flowMain;
                if (flowRatio >= 1.05 && flowRatio <= 1.5) {
                    score += 40; // เหมาะสมมาก
                } else if (flowRatio >= 1.0 && flowRatio <= 2.0) {
                    score += 30; // เหมาะสมดี
                } else if (flowRatio >= 1.0 && flowRatio <= 2.5) {
                    score += 20; // ใช้ได้แต่ใหญ่ไปหน่อย
                } else if (flowRatio >= 1.0 && flowRatio <= 3.0) {
                    score += 10; // ใหญ่เกินไป
                } else if (flowRatio >= 1.0) {
                    score += 5; // ใหญ่เกินไปมาก
                } else {
                    score += 0; // ไม่เพียงพอ
                }
            } else {
                score += 0; // ไม่เพียงพอ
            }

            // คะแนนความเหมาะสมของ Head (35%) - เข้มงวดมากขึ้น
            if (maxHead >= pumpHeadRequired) {
                const headRatio = maxHead / pumpHeadRequired;
                if (headRatio >= 1.05 && headRatio <= 1.5) {
                    score += 35; // เหมาะสมมาก
                } else if (headRatio >= 1.0 && headRatio <= 2.0) {
                    score += 25; // เหมาะสมดี
                } else if (headRatio >= 1.0 && headRatio <= 2.5) {
                    score += 15; // ใช้ได้แต่ใหญ่ไปหน่อย
                } else if (headRatio >= 1.0 && headRatio <= 3.0) {
                    score += 8; // ใหญ่เกินไป
                } else if (headRatio >= 1.0) {
                    score += 3; // ใหญ่เกินไปมาก
                } else {
                    score += 0; // ไม่เพียงพอ
                }
            } else {
                score += 0; // ไม่เพียงพอ
            }

            // คะแนนประสิทธิภาพต่อราคา (15%)
            const flowPerBaht = maxFlow / pump.price;
            if (flowPerBaht > 0.5) score += 15;
            else if (flowPerBaht > 0.3) score += 12;
            else if (flowPerBaht > 0.1) score += 8;
            else if (flowPerBaht > 0.05) score += 5;
            else score += 2;

            // คะแนนกำลังที่เหมาะสม (10%)
            const powerHP = typeof pump.powerHP === 'string' ? 
                parseFloat(pump.powerHP.toString().replace(/[^0-9.]/g, '')) : pump.powerHP;
            const estimatedHP = (flowMain * pumpHeadRequired * 0.00027);
            const powerRatio = powerHP / estimatedHP;
            
            if (powerRatio >= 1.0 && powerRatio <= 2.5) score += 10;
            else if (powerRatio >= 0.8 && powerRatio <= 3.0) score += 7;
            else if (powerRatio >= 0.6 && powerRatio <= 4.0) score += 4;
            else score += 1;

            return {
                ...pump,
                score,
                maxFlow,
                maxHead,
                powerHP,
                flowRatio: maxFlow / flowMain,
                headRatio: maxHead / pumpHeadRequired,
                flowPerBaht,
                estimatedHP,
                isFlowAdequate: maxFlow >= flowMain,
                isHeadAdequate: maxHead >= pumpHeadRequired,
                isRecommended: score >= 60 && maxFlow >= flowMain && maxHead >= pumpHeadRequired && 
                              (maxFlow / flowMain <= 2.0) && (maxHead / pumpHeadRequired <= 2.0),
                isGoodChoice: score >= 40 && maxFlow >= flowMain && maxHead >= pumpHeadRequired && 
                             (maxFlow / flowMain <= 2.5) && (maxHead / pumpHeadRequired <= 2.5),
                isUsable: score >= 20 && maxFlow >= flowMain && maxHead >= pumpHeadRequired &&
                         (maxFlow / flowMain <= 3.0) && (maxHead / pumpHeadRequired <= 3.0)
            };
        });

        // หาปั๊มที่แนะนำ (ใช้ข้อมูลจาก analyzed แทน)
        const recommendedPump = analyzedPumps.filter(p => p.isRecommended).sort((a, b) => {
            const aScore = Math.abs(a.flowRatio - 1.3) + Math.abs(a.headRatio - 1.2);
            const bScore = Math.abs(b.flowRatio - 1.3) + Math.abs(b.headRatio - 1.2);
            return aScore - bScore;
        });

        return {
            totalWaterRequiredLPH,
            totalWaterRequiredLPM,
            waterPerZoneLPH,
            waterPerZoneLPM,
            totalSprinklers,
            sprinklersPerZone,
            waterPerSprinklerLPH,
            waterPerSprinklerLPM,
            recommendedSprinklers,
            recommendedBranchPipe: recommendedBranchPipe,
            recommendedSecondaryPipe: recommendedSecondaryPipe,
            recommendedMainPipe: recommendedMainPipe,
            recommendedPump,
            // เพิ่มข้อมูลที่วิเคราะห์แล้ว
            analyzedBranchPipes,
            analyzedSecondaryPipes,
            analyzedMainPipes,
            analyzedSprinklers,
            analyzedPumps,
            branchPipeRolls: branchRolls,
            secondaryPipeRolls: secondaryRolls,
            mainPipeRolls: mainRolls,
            headLoss: {
                branch: {
                    major: branchLoss.major,
                    minor: branchLoss.minor,
                    total: branchLoss.total,
                },
                secondary: {
                    major: secondaryLoss.major,
                    minor: secondaryLoss.minor,
                    total: secondaryLoss.total,
                },
                main: {
                    major: mainLoss.major,
                    minor: mainLoss.minor,
                    total: mainLoss.total,
                },
                totalMajor: totalMajorLoss,
                totalMinor: totalMinorLoss,
                total: totalHeadLoss,
            },
            velocity: {
                branch: branchLoss.velocity,
                secondary: secondaryLoss.velocity,
                main: mainLoss.velocity,
            },
            flows: {
                branch: flowBranch,
                secondary: flowSecondary,
                main: flowMain,
            },
            coefficients: {
                branch: branchLoss.C,
                secondary: secondaryLoss.C,
                main: mainLoss.C,
            },
            pumpHeadRequired,
            safetyFactor,
            adjustedFlow,
            velocityWarnings,
        };
    }, [input]);
};