// hooks/useCalculations.ts
import { useMemo } from 'react';
import { IrrigationInput, CalculationResults } from '../types/interfaces';
import { SprinklerData } from '../product/Sprinkler';
import { PipeData } from '../product/Pipe';
import { PumpData } from '../product/Pump';
import {
    calculatePipeRolls,
    calculateImprovedHeadLoss,
    checkVelocity,
    evaluatePipeOverall,
    formatNumber,
} from '../utils/calculations';

export const useCalculations = (
    input: IrrigationInput,
    selectedSprinkler?: any // เพิ่ม parameter สำหรับสปริงเกอร์ที่เลือก
): CalculationResults | null => {
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

        // ตรวจสอบว่ามีข้อมูลท่อหรือไม่
        const hasValidSecondaryPipe =
            input.longestSecondaryPipeM > 0 && input.totalSecondaryPipeM > 0;
        const hasValidMainPipe = input.longestMainPipeM > 0 && input.totalMainPipeM > 0;

        // คำนวณ Flow แบบแยกตามว่ามีท่อไหนบ้าง
        const flowBranch = waterPerSprinklerLPM * input.sprinklersPerBranch;

        // ถ้าไม่มี secondary pipe ให้ branch ไปตรงเป็น main
        const flowSecondary = hasValidSecondaryPipe ? flowBranch * input.branchesPerSecondary : 0; // ไม่คำนวณเลย

        // ถ้าไม่มี secondary pipe ให้ main รับ flow จาก branch โดยตรง
        const flowMain = hasValidMainPipe
            ? hasValidSecondaryPipe
                ? waterPerZoneLPM * input.simultaneousZones // ปกติ
                : flowBranch * (input.totalTrees / input.sprinklersPerBranch) // จาก branch โดยตรง
            : 0; // ไม่คำนวณเลย

        // วิเคราะห์สปริงเกอร์ทั้งหมด
        const analyzedSprinklers = SprinklerData.map((sprinkler) => {
            const minFlow = Array.isArray(sprinkler.waterVolumeLitersPerHour)
                ? sprinkler.waterVolumeLitersPerHour[0]
                : parseFloat(String(sprinkler.waterVolumeLitersPerHour).split('-')[0]);
            const maxFlow = Array.isArray(sprinkler.waterVolumeLitersPerHour)
                ? sprinkler.waterVolumeLitersPerHour[1]
                : parseFloat(String(sprinkler.waterVolumeLitersPerHour).split('-')[1]);

            let score = 0;

            // คะแนนความเหมาะสมของอัตราการไหล (60%)
            const flowDiff = Math.abs(waterPerSprinklerLPH - (minFlow + maxFlow) / 2);
            const flowRange = maxFlow - minFlow;

            if (waterPerSprinklerLPH >= minFlow && waterPerSprinklerLPH <= maxFlow) {
                const positionInRange = (waterPerSprinklerLPH - minFlow) / flowRange;
                if (positionInRange >= 0.2 && positionInRange <= 0.8) {
                    score += 60;
                } else {
                    score += 55;
                }
            } else if (
                waterPerSprinklerLPH >= minFlow * 0.9 &&
                waterPerSprinklerLPH <= maxFlow * 1.1
            ) {
                score += 45;
            } else if (
                waterPerSprinklerLPH >= minFlow * 0.8 &&
                waterPerSprinklerLPH <= maxFlow * 1.2
            ) {
                score += 30;
            } else if (
                waterPerSprinklerLPH >= minFlow * 0.6 &&
                waterPerSprinklerLPH <= maxFlow * 1.4
            ) {
                score += 15;
            } else {
                score += 5;
            }

            // คะแนนราคาต่อประสิทธิภาพ (20%)
            const avgFlow = (minFlow + maxFlow) / 2;
            const pricePerFlow = sprinkler.price / avgFlow;
            if (pricePerFlow < 0.5) score += 20;
            else if (pricePerFlow < 1.0) score += 18;
            else if (pricePerFlow < 2.0) score += 15;
            else if (pricePerFlow < 5.0) score += 10;
            else score += 5;

            // คะแนนรัศมี (10%)
            const minRadius = Array.isArray(sprinkler.radiusMeters)
                ? sprinkler.radiusMeters[0]
                : parseFloat(String(sprinkler.radiusMeters).split('-')[0]);
            const maxRadius = Array.isArray(sprinkler.radiusMeters)
                ? sprinkler.radiusMeters[1]
                : parseFloat(String(sprinkler.radiusMeters).split('-')[1]);
            const avgRadius = (minRadius + maxRadius) / 2;

            if (avgRadius >= 8) score += 10;
            else if (avgRadius >= 6) score += 8;
            else if (avgRadius >= 4) score += 6;
            else score += 3;

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
                score: formatNumber(score, 1),
                flowMatch: waterPerSprinklerLPH >= minFlow && waterPerSprinklerLPH <= maxFlow,
                flowCloseMatch:
                    waterPerSprinklerLPH >= minFlow * 0.9 && waterPerSprinklerLPH <= maxFlow * 1.1,
                isRecommended:
                    score >= 70 &&
                    waterPerSprinklerLPH >= minFlow * 0.9 &&
                    waterPerSprinklerLPH <= maxFlow * 1.1,
                isGoodChoice:
                    score >= 50 &&
                    waterPerSprinklerLPH >= minFlow * 0.8 &&
                    waterPerSprinklerLPH <= maxFlow * 1.2,
                isUsable:
                    score >= 30 &&
                    waterPerSprinklerLPH >= minFlow * 0.6 &&
                    waterPerSprinklerLPH <= maxFlow * 1.4,
                targetFlow: formatNumber(waterPerSprinklerLPH, 3),
                minFlow: formatNumber(minFlow, 3),
                maxFlow: formatNumber(maxFlow, 3),
                avgRadius: formatNumber(avgRadius, 3),
                pricePerFlow: formatNumber(pricePerFlow, 3),
            };
        });

        // หาสปริงเกอร์ที่แนะนำ
        const recommendedSprinklers = analyzedSprinklers.filter((s) => s.isRecommended);

        // วิเคราะห์ท่อแต่ละประเภท - ไม่จำกัดประเภทท่อ เอาท่อทั้งหมดมาวิเคราะห์
        const analyzedBranchPipes = PipeData.map((pipe) =>
            evaluatePipeOverall(
                pipe,
                flowBranch,
                input.longestBranchPipeM,
                'branch',
                input.pipeAgeYears,
                [] // ไม่จำกัดประเภท
            )
        ).sort((a, b) => b.score - a.score);

        // Secondary pipes - วิเคราะห์เฉพาะเมื่อมีข้อมูล
        const analyzedSecondaryPipes = hasValidSecondaryPipe
            ? PipeData.map((pipe) =>
                  evaluatePipeOverall(
                      pipe,
                      flowSecondary,
                      input.longestSecondaryPipeM,
                      'secondary',
                      input.pipeAgeYears,
                      [] // ไม่จำกัดประเภท
                  )
              ).sort((a, b) => b.score - a.score)
            : []; // ไม่มีข้อมูล = array ว่าง

        // Main pipes - วิเคราะห์เฉพาะเมื่อมีข้อมูล
        const analyzedMainPipes = hasValidMainPipe
            ? PipeData.map((pipe) =>
                  evaluatePipeOverall(
                      pipe,
                      flowMain,
                      input.longestMainPipeM,
                      'main',
                      input.pipeAgeYears,
                      [] // ไม่จำกัดประเภท
                  )
              ).sort((a, b) => b.score - a.score)
            : []; // ไม่มีข้อมูล = array ว่าง

        // แยกท่อที่แนะนำ (เฉพาะที่มีข้อมูล)
        const recommendedBranchPipe = analyzedBranchPipes.filter((p) => p.isRecommended);
        const recommendedSecondaryPipe = hasValidSecondaryPipe
            ? analyzedSecondaryPipes.filter((p) => p.isRecommended)
            : [];
        const recommendedMainPipe = hasValidMainPipe
            ? analyzedMainPipes.filter((p) => p.isRecommended)
            : [];

        // เลือกท่อ default (เฉพาะที่มีข้อมูล)
        const defaultBranchPipe =
            analyzedBranchPipes.find((p) => p.isUsable) || analyzedBranchPipes[0];
        const defaultSecondaryPipe = hasValidSecondaryPipe
            ? analyzedSecondaryPipes.find((p) => p.isUsable) || analyzedSecondaryPipes[0]
            : null;
        const defaultMainPipe = hasValidMainPipe
            ? analyzedMainPipes.find((p) => p.isUsable) || analyzedMainPipes[0]
            : null;

        // คำนวณจำนวนม้วนท่อ (เฉพาะที่มีข้อมูล)
        const branchRolls = defaultBranchPipe
            ? calculatePipeRolls(input.totalBranchPipeM, defaultBranchPipe.lengthM)
            : 1;
        const secondaryRolls =
            defaultSecondaryPipe && hasValidSecondaryPipe
                ? calculatePipeRolls(input.totalSecondaryPipeM, defaultSecondaryPipe.lengthM)
                : 0; // ไม่มีข้อมูล = 0 ม้วน
        const mainRolls =
            defaultMainPipe && hasValidMainPipe
                ? calculatePipeRolls(input.totalMainPipeM, defaultMainPipe.lengthM)
                : 0; // ไม่มีข้อมูล = 0 ม้วน

        // คำนวณ Head Loss และ Velocity (เฉพาะท่อที่มีข้อมูล)
        const branchLoss = defaultBranchPipe
            ? calculateImprovedHeadLoss(
                  flowBranch,
                  defaultBranchPipe.sizeMM,
                  input.longestBranchPipeM,
                  defaultBranchPipe.pipeType,
                  'branch',
                  input.pipeAgeYears
              )
            : { major: 0, minor: 0, total: 0, velocity: 0, C: 135 };

        const secondaryLoss =
            defaultSecondaryPipe && hasValidSecondaryPipe
                ? calculateImprovedHeadLoss(
                      flowSecondary,
                      defaultSecondaryPipe.sizeMM,
                      input.longestSecondaryPipeM,
                      defaultSecondaryPipe.pipeType,
                      'secondary',
                      input.pipeAgeYears
                  )
                : { major: 0, minor: 0, total: 0, velocity: 0, C: 140 }; // ไม่มีข้อมูล = 0 loss

        const mainLoss =
            defaultMainPipe && hasValidMainPipe
                ? calculateImprovedHeadLoss(
                      flowMain,
                      defaultMainPipe.sizeMM,
                      input.longestMainPipeM,
                      defaultMainPipe.pipeType,
                      'main',
                      input.pipeAgeYears
                  )
                : { major: 0, minor: 0, total: 0, velocity: 0, C: 145 }; // ไม่มีข้อมูล = 0 loss

        const totalHeadLoss = branchLoss.total + secondaryLoss.total + mainLoss.total;
        const totalMajorLoss = branchLoss.major + secondaryLoss.major + mainLoss.major;
        const totalMinorLoss = branchLoss.minor + secondaryLoss.minor + mainLoss.minor;

        // ตรวจสอบความเร็ว (เฉพาะท่อที่มีข้อมูล)
        const velocityWarnings = [];

        // Branch pipe - ตรวจสอบเสมอ
        velocityWarnings.push(checkVelocity(branchLoss.velocity, 'ท่อย่อย'));

        // Secondary pipe - ตรวจสอบเฉพาะเมื่อมีข้อมูล
        if (hasValidSecondaryPipe && defaultSecondaryPipe) {
            velocityWarnings.push(checkVelocity(secondaryLoss.velocity, 'ท่อรอง'));
        }

        // Main pipe - ตรวจสอบเฉพาะเมื่อมีข้อมูล
        if (hasValidMainPipe && defaultMainPipe) {
            velocityWarnings.push(checkVelocity(mainLoss.velocity, 'ท่อหลัก'));
        }

        // กรองเฉพาะคำเตือนที่ไม่ใช่สีเขียว
        const filteredWarnings = velocityWarnings.filter((warning) => !warning.includes('🟢'));

        // คำนวณแรงดันจากสปริงเกอร์ที่เลือก
        let pressureFromSprinkler = input.pressureHeadM; // ค่าเริ่มต้น

        if (selectedSprinkler) {
            // ใช้แรงดันกลางของสปริงเกอร์ที่เลือก
            const minPressure = Array.isArray(selectedSprinkler.pressureBar)
                ? selectedSprinkler.pressureBar[0]
                : parseFloat(String(selectedSprinkler.pressureBar).split('-')[0]);
            const maxPressure = Array.isArray(selectedSprinkler.pressureBar)
                ? selectedSprinkler.pressureBar[1]
                : parseFloat(String(selectedSprinkler.pressureBar).split('-')[1]);

            // แปลง bar เป็น เมตร (1 bar ≈ 10.2 เมตร)
            const avgPressureBar = (minPressure + maxPressure) / 2;
            pressureFromSprinkler = avgPressureBar * 10.2;
        }

        // คำนวณ Pump Head ที่ต้องการ (ใช้แรงดันจากสปริงเกอร์)
        const pumpHeadRequired = input.staticHeadM + totalHeadLoss + pressureFromSprinkler;

        // ใช้ flow ที่เหมาะสมสำหรับปั๊ม
        const pumpRequiredFlow = hasValidMainPipe
            ? flowMain
            : hasValidSecondaryPipe
              ? flowSecondary
              : flowBranch;

        // วิเคราะห์ปั๊มทั้งหมด
        const analyzedPumps = PumpData.map((pump) => {
            const maxFlow =
                pump.max_flow_rate_lpm ||
                (Array.isArray(pump.flow_rate_lpm) ? pump.flow_rate_lpm[1] : 0);
            const maxHead = pump.max_head_m || (Array.isArray(pump.head_m) ? pump.head_m[0] : 0);

            let score = 0;

            // คะแนนความเหมาะสมของอัตราการไหล (50%)
            if (maxFlow >= pumpRequiredFlow) {
                const flowRatio = maxFlow / pumpRequiredFlow;
                if (flowRatio >= 1.05 && flowRatio <= 1.3) {
                    score += 50;
                } else if (flowRatio >= 1.0 && flowRatio <= 1.8) {
                    score += 40;
                } else if (flowRatio >= 1.0 && flowRatio <= 2.5) {
                    score += 25;
                } else if (flowRatio >= 1.0 && flowRatio <= 3.0) {
                    score += 15;
                } else if (flowRatio >= 1.0) {
                    score += 5;
                } else {
                    score += 0;
                }
            } else {
                score += 0;
            }

            // คะแนนความเหมาะสมของ Head (40%)
            if (maxHead >= pumpHeadRequired) {
                const headRatio = maxHead / pumpHeadRequired;
                if (headRatio >= 1.05 && headRatio <= 1.3) {
                    score += 40;
                } else if (headRatio >= 1.0 && headRatio <= 1.8) {
                    score += 30;
                } else if (headRatio >= 1.0 && headRatio <= 2.5) {
                    score += 20;
                } else if (headRatio >= 1.0 && headRatio <= 3.0) {
                    score += 10;
                } else if (headRatio >= 1.0) {
                    score += 3;
                } else {
                    score += 0;
                }
            } else {
                score += 0;
            }

            // คะแนนประสิทธิภาพต่อราคา (10%)
            const flowPerBaht = maxFlow / pump.price;
            if (flowPerBaht > 0.8) score += 10;
            else if (flowPerBaht > 0.5) score += 8;
            else if (flowPerBaht > 0.3) score += 6;
            else if (flowPerBaht > 0.1) score += 4;
            else score += 2;

            // const powerHP = typeof pump.powerHP === 'string'
            //     ? parseFloat(pump.powerHP.toString().replace(/[^0-9.]/g, ''))
            //     : pump.powerHP;
            const powerHP = pump.powerHP;
            const estimatedHP = pumpRequiredFlow * pumpHeadRequired * 0.00027;
            const flowRatio = maxFlow / pumpRequiredFlow;
            const headRatio = maxHead / pumpHeadRequired;

            return {
                ...pump,
                score: formatNumber(score, 1),
                maxFlow: formatNumber(maxFlow, 3),
                maxHead: formatNumber(maxHead, 3),
                powerHP: formatNumber(powerHP, 1),
                flowRatio: formatNumber(flowRatio, 3),
                headRatio: formatNumber(headRatio, 3),
                flowPerBaht: formatNumber(flowPerBaht, 3),
                estimatedHP: formatNumber(estimatedHP, 3),
                isFlowAdequate: maxFlow >= pumpRequiredFlow,
                isHeadAdequate: maxHead >= pumpHeadRequired,
                isRecommended:
                    score >= 70 &&
                    maxFlow >= pumpRequiredFlow &&
                    maxHead >= pumpHeadRequired &&
                    flowRatio <= 2.0 &&
                    headRatio <= 2.0,
                isGoodChoice:
                    score >= 50 &&
                    maxFlow >= pumpRequiredFlow &&
                    maxHead >= pumpHeadRequired &&
                    flowRatio <= 2.5 &&
                    headRatio <= 2.5,
                isUsable:
                    score >= 30 &&
                    maxFlow >= pumpRequiredFlow &&
                    maxHead >= pumpHeadRequired &&
                    flowRatio <= 3.0 &&
                    headRatio <= 3.0,
            };
        }).sort((a, b) => {
            if (a.isRecommended !== b.isRecommended) return b.isRecommended ? 1 : -1;
            if (a.isGoodChoice !== b.isGoodChoice) return b.isGoodChoice ? 1 : -1;
            if (a.isUsable !== b.isUsable) return b.isUsable ? 1 : -1;
            return b.score - a.score;
        });

        // หาปั๊มที่แนะนำ
        const recommendedPump = analyzedPumps.filter((p) => p.isRecommended);

        return {
            totalWaterRequiredLPH: formatNumber(totalWaterRequiredLPH, 3),
            totalWaterRequiredLPM: formatNumber(totalWaterRequiredLPM, 3),
            waterPerZoneLPH: formatNumber(waterPerZoneLPH, 3),
            waterPerZoneLPM: formatNumber(waterPerZoneLPM, 3),
            totalSprinklers: Math.round(totalSprinklers),
            sprinklersPerZone: formatNumber(sprinklersPerZone, 3),
            waterPerSprinklerLPH: formatNumber(waterPerSprinklerLPH, 3),
            waterPerSprinklerLPM: formatNumber(waterPerSprinklerLPM, 3),
            recommendedSprinklers,
            recommendedBranchPipe,
            recommendedSecondaryPipe,
            recommendedMainPipe,
            recommendedPump,
            branchesPerSecondary: input.branchesPerSecondary,
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
            velocity: {
                branch: formatNumber(branchLoss.velocity, 3),
                secondary: formatNumber(secondaryLoss.velocity, 3),
                main: formatNumber(mainLoss.velocity, 3),
            },
            flows: {
                branch: formatNumber(flowBranch, 3),
                secondary: formatNumber(flowSecondary, 3),
                main: formatNumber(flowMain, 3),
            },
            coefficients: {
                branch: formatNumber(branchLoss.C, 3),
                secondary: formatNumber(secondaryLoss.C, 3),
                main: formatNumber(mainLoss.C, 3),
            },
            pumpHeadRequired: formatNumber(pumpHeadRequired, 3),
            pressureFromSprinkler: formatNumber(pressureFromSprinkler, 3), // เพิ่มข้อมูลแรงดันจากสปริงเกอร์
            safetyFactor,
            adjustedFlow: formatNumber(adjustedFlow, 3),
            velocityWarnings,
            hasValidSecondaryPipe, // เพิ่มข้อมูลสถานะ
            hasValidMainPipe, // เพิ่มข้อมูลสถานะ
        };
    }, [input, selectedSprinkler]);
};
