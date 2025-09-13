/* eslint-disable @typescript-eslint/no-explicit-any */
// Horticulture-specific pipe calculation utilities
import { getPipeData, getPipeDataWithSmartSize } from '../pages/components/PipeFrictionLoss';
import { PressureLossCorrectionFactorTableData } from '../pages/components/PressureLossCorrectionFactorTable';

export interface BestPipeInfo {
    id: string;
    length: number;
    count: number; // จำนวนทางออก
    waterFlowRate: number; // ใช้น้ำ L/min
    details?: any;
}

export interface PipeCalculationResult {
    headLoss: number; // ค่า head loss ที่คำนวณได้
    pressureLoss: number; // ค่า X
    correctionFactor: number; // ค่า Y
    pipeLength: number; // ความยาวท่อ
    flowRate: number; // อัตราการไหลที่ใช้
    outletCount: number; // จำนวนทางออกที่ใช้
    calculationDetails: string; // รายละเอียดการคำนวณ
    actualSize?: string; // ขนาดท่อที่ใช้จริงในการคำนวณ
    sizeInfo?: {
        isExactSizeMatch: boolean;
        sizeReason: string;
    };
}

export interface SprinklerPressureInfo {
    pressureBar: number;
    headM: number;
    head20PercentM: number;
}

export interface SelectedPipeSizes {
    main?: number;
    secondary?: number;
    branch?: number;
    emitter?: number;
}

/**
 * หาค่า pressureLoss (X) จากข้อมูลท่อ
 * @param pipeType ประเภทท่อ เช่น "PE", "PVC"
 * @param pressureClass แรงดัน เช่น "PN4", "Class5"
 * @param pipeSize ขนาดท่อ เช่น "25mm"
 * @param flowRate อัตราการไหล L/min
 * @returns ค่า pressureLoss หรือ null ถ้าหาไม่พบ
 */
export function findPressureLoss(
    pipeType: string,
    pressureClass: string,
    pipeSize: string,
    flowRate: number
): { 
    pressureLoss: number; 
    actualFlow: number; 
    actualSize: string;
    sizeInfo?: {
        isExactSizeMatch: boolean;
        sizeReason: string;
    };
} | null {
    try {
        // Use smart pipe data selection with size matching
        const smartPipeResult = getPipeDataWithSmartSize(pipeType, pressureClass, pipeSize);
        
        if (!smartPipeResult || !smartPipeResult.data) {
            return null;
        }

        const { data: pipeData, selectedSize, sizeInfo } = smartPipeResult;

        const sizeData = pipeData[selectedSize];
        
        // หา flow ที่ใกล้เคียงที่มากกว่า
        let selectedFlow = sizeData.find(data => data.flow >= flowRate);
        
        // ถ้าไม่เจอ ให้ใช้ค่าสูงสุด
        if (!selectedFlow) {
            selectedFlow = sizeData[sizeData.length - 1];
        }

        return {
            pressureLoss: selectedFlow.pressureLoss,
            actualFlow: selectedFlow.flow,
            actualSize: selectedSize,
            sizeInfo: {
                isExactSizeMatch: sizeInfo.isExactMatch,
                sizeReason: sizeInfo.reason
            }
        };
    } catch (error) {
        console.error('Error finding pressure loss:', error);
        return null;
    }
}

/**
 * หาค่า CorrectionFactor (Y) จากจำนวนทางออก
 * @param outletCount จำนวนทางออก
 * @returns ค่า CorrectionFactor
 */
export function findCorrectionFactor(outletCount: number): { correctionFactor: number; actualOutletCount: number } {
    // หาจำนวนทางออกที่ใกล้เคียงที่น้อยกว่า
    let selectedEntry = PressureLossCorrectionFactorTableData[0];
    
    for (const entry of PressureLossCorrectionFactorTableData) {
        if (entry.NumberofOutlets <= outletCount) {
            selectedEntry = entry;
        } else {
            break;
        }
    }

    return {
        correctionFactor: selectedEntry.CorrectionFactor,
        actualOutletCount: selectedEntry.NumberofOutlets
    };
}

/**
 * คำนวณ head loss ด้วยสูตรใหม่: (X/10) * ความยาวท่อ * Y
 * @param bestPipeInfo ข้อมูลท่อที่ต้องการน้ำมากที่สุด
 * @param pipeType ประเภทท่อ
 * @param pressureClass แรงดัน
 * @param pipeSize ขนาดท่อ
 * @returns ผลการคำนวณ
 */
export function calculateNewHeadLoss(
    bestPipeInfo: BestPipeInfo,
    pipeType: string,
    pressureClass: string,
    pipeSize: string
): PipeCalculationResult | null {
    try {
        // ตรวจสอบว่าต้องใช้ PN สูงสุดหรือไม่
        let actualPressureClass = pressureClass;
        let pressureNote = '';
        
        // ลองหาข้อมูลท่อก่อน
        let pipeData = getPipeData(pipeType, pressureClass);
        if (!pipeData) {
            // ถ้าไม่พบข้อมูลท่อ ให้ลองใช้ PN สูงสุด
            if (pipeType.toUpperCase() === 'PE') {
                actualPressureClass = 'PN6.3';
                pipeData = getPipeData(pipeType, actualPressureClass);
                if (!pipeData) {
                    actualPressureClass = 'PN63';
                    pipeData = getPipeData(pipeType, actualPressureClass);
                }
                if (actualPressureClass !== pressureClass) {
                    pressureNote = ` (ใช้ ${actualPressureClass} แทน ${pressureClass})`;
                }
            } else if (pipeType.toUpperCase() === 'PVC') {
                actualPressureClass = 'Class8.5';
                pipeData = getPipeData(pipeType, actualPressureClass);
                if (!pipeData) {
                    actualPressureClass = 'Class85';
                    pipeData = getPipeData(pipeType, actualPressureClass);
                }
                if (actualPressureClass !== pressureClass) {
                    pressureNote = ` (ใช้ ${actualPressureClass} แทน ${pressureClass})`;
                }
            }
        }

        // หาค่า X (pressureLoss)
        const pressureLossResult = findPressureLoss(
            pipeType,
            actualPressureClass, // ใช้ actualPressureClass แทน pressureClass
            pipeSize,
            bestPipeInfo.waterFlowRate
        );

        if (!pressureLossResult) {
            return null;
        }

        // หาค่า Y (correctionFactor)
        const correctionResult = findCorrectionFactor(bestPipeInfo.count);

        // คำนวณ head loss: (X/10) * ความยาวท่อ * Y
        const headLoss = (pressureLossResult.pressureLoss / 10) * bestPipeInfo.length * correctionResult.correctionFactor;

        // สร้างรายละเอียดการคำนวณ
        const sizeNote = pressureLossResult.sizeInfo && !pressureLossResult.sizeInfo.isExactSizeMatch 
            ? ` (ใช้ ${pressureLossResult.actualSize} แทน ${pipeSize})`
            : '';

        const calculationDetails = [
            `ใช้ ${pipeType} ${actualPressureClass} ขนาด ${pressureLossResult.actualSize}${pressureNote}${sizeNote}`,
            `อัตราการไหล: ${bestPipeInfo.waterFlowRate.toFixed(1)} L/min → ใช้ค่า ${pressureLossResult.actualFlow} L/min`,
            `ค่า X (pressureLoss): ${pressureLossResult.pressureLoss}`,
            `จำนวนทางออก: ${bestPipeInfo.count} → ใช้ค่า ${correctionResult.actualOutletCount}`,
            `ค่า Y (correctionFactor): ${correctionResult.correctionFactor}`,
            `ความยาวท่อ: ${bestPipeInfo.length.toFixed(1)} ม.`,
            `สูตร: (${pressureLossResult.pressureLoss}/10) × ${bestPipeInfo.length.toFixed(1)} × ${correctionResult.correctionFactor} = ${headLoss.toFixed(3)} ม.`
        ].join('\n');

        return {
            headLoss,
            pressureLoss: pressureLossResult.pressureLoss,
            correctionFactor: correctionResult.correctionFactor,
            pipeLength: bestPipeInfo.length,
            flowRate: pressureLossResult.actualFlow,
            outletCount: correctionResult.actualOutletCount,
            calculationDetails,
            actualSize: pressureLossResult.actualSize,
            sizeInfo: pressureLossResult.sizeInfo
        };
    } catch (error) {
        console.error('Error calculating head loss:', error);
        return null;
    }
}

/**
 * คำนวณข้อมูลแรงดันหัวฉีด
 * @param sprinkler ข้อมูลหัวฉีด
 * @returns ข้อมูลแรงดัน
 */
export function calculateSprinklerPressure(sprinkler: any): SprinklerPressureInfo | null {
    if (!sprinkler || !sprinkler.pressureBar) {
        return null;
    }

    let pressureBar: number;
    
    // จัดการกับข้อมูลแรงดันที่อาจเป็น array หรือ string
    if (Array.isArray(sprinkler.pressureBar)) {
        pressureBar = (sprinkler.pressureBar[0] + sprinkler.pressureBar[1]) / 2;
    } else if (typeof sprinkler.pressureBar === 'string' && sprinkler.pressureBar.includes('-')) {
        const parts = sprinkler.pressureBar.split('-');
        pressureBar = (parseFloat(parts[0]) + parseFloat(parts[1])) / 2;
    } else {
        pressureBar = parseFloat(String(sprinkler.pressureBar));
    }

    const headM = pressureBar * 10; // แปลงจากบาร์เป็นเมตร
    const head20PercentM = headM * 0.2; // 20% ของ Head

    return {
        pressureBar,
        headM,
        head20PercentM
    };
}

/**
 * ตรวจสอบว่าท่อผ่านเงื่อนไขการเลือกหรือไม่
 * @param pipe ข้อมูลท่อ
 * @param pipeType ประเภทท่อ (branch, secondary, main, emitter)
 * @param sprinklerPressure ข้อมูลแรงดันหัวฉีด
 * @param selectedPipes ท่อที่เลือกไว้ในโซนเดียวกัน
 * @returns true ถ้าผ่านเงื่อนไข
 */
export function validatePipeSelection(
    pipe: any,
    pipeType: 'branch' | 'secondary' | 'main' | 'emitter',
    sprinklerPressure: SprinklerPressureInfo,
    selectedPipes: { [key: string]: any } = {}
): { isValid: boolean; reason?: string } {
    try {
        // เงื่อนไขพื้นฐาน: แรงดันท่อต้องไม่ต่ำกว่าแรงดันหัวฉีด
        if (pipe.pn < sprinklerPressure.pressureBar) {
            return {
                isValid: false,
                reason: `แรงดันท่อ (${pipe.pn} บาร์) ต่ำกว่าแรงดันหัวฉีด (${sprinklerPressure.pressureBar.toFixed(1)} บาร์)`
            };
        }

        // เงื่อนไขสำหรับท่อย่อยและท่อย่อยแยก
        if (pipeType === 'branch' || pipeType === 'emitter') {
            if (pipe.sizeMM > 32) {
                return {
                    isValid: false,
                    reason: `ท่อ${pipeType === 'branch' ? 'ย่อย' : 'ย่อยแยก'}ต้องมีขนาด ≤ 32mm (ขนาดปัจจุบัน: ${pipe.sizeMM}mm)`
                };
            }
        }

        // เงื่อนไขสำหรับท่อเมนรองและท่อเมนหลัก
        if (pipeType === 'secondary' || pipeType === 'main') {
            const branchPipe = selectedPipes.branch;
            if (branchPipe && pipe.sizeMM <= branchPipe.sizeMM) {
                return {
                    isValid: false,
                    reason: `ท่อเมน${pipeType === 'secondary' ? 'รอง' : 'หลัก'}ต้องมีขนาดมากกว่าท่อย่อย (${branchPipe.sizeMM}mm)`
                };
            }

            if (pipeType === 'main') {
                const secondaryPipe = selectedPipes.secondary;
                if (secondaryPipe && pipe.sizeMM <= secondaryPipe.sizeMM) {
                    return {
                        isValid: false,
                        reason: `ท่อเมนหลักต้องมีขนาดมากกว่าท่อเมนรอง (${secondaryPipe.sizeMM}mm)`
                    };
                }
            }
        }

        return { isValid: true };
    } catch (error) {
        console.error('Error validating pipe selection:', error);
        return {
            isValid: false,
            reason: 'เกิดข้อผิดพลาดในการตรวจสอบ'
        };
    }
}

/**
 * เลือกท่อที่เหมาะสมที่สุดตามเงื่อนไข
 * @param pipes รายการท่อทั้งหมด
 * @param pipeType ประเภทท่อ
 * @param sprinklerPressure ข้อมูลแรงดันหัวฉีด
 * @param bestPipeInfo ข้อมูลท่อที่ต้องการน้ำมากที่สุด
 * @param selectedPipes ท่อที่เลือกไว้ในโซนเดียวกัน
 * @returns ท่อที่เลือก
 */
export function selectBestPipe(
    pipes: any[],
    pipeType: 'branch' | 'secondary' | 'main' | 'emitter',
    sprinklerPressure: SprinklerPressureInfo,
    bestPipeInfo: BestPipeInfo,
    selectedPipes: { [key: string]: any } = {}
): any | null {
    try {
        // กรองท่อที่ผ่านเงื่อนไข
        const validPipes = pipes.filter(pipe => {
            const validation = validatePipeSelection(pipe, pipeType, sprinklerPressure, selectedPipes);
            return validation.isValid;
        });

        if (validPipes.length === 0) {
            return null;
        }

        // คำนวณ head loss สำหรับแต่ละท่อ
        const pipesWithCalculation = validPipes.map(pipe => {
            const calculation = calculateNewHeadLoss(
                bestPipeInfo,
                pipe.pipeType || 'PE',
                `PN${pipe.pn}`,
                `${pipe.sizeMM}mm`
            );

            return {
                ...pipe,
                calculation,
                hasWarning: calculation ? (
                    calculation.headLoss > sprinklerPressure.head20PercentM
                ) : false
            };
        });

        // เรียงลำดับตามเงื่อนไข:
        // 1. ไม่มี warning
        // 2. PN และ sizeMM น้อยที่สุด
        // 3. ราคาน้อยที่สุด
        const sortedPipes = pipesWithCalculation.sort((a, b) => {
            // เงื่อนไขที่ 1: ไม่มี warning
            if (a.hasWarning !== b.hasWarning) {
                return a.hasWarning ? 1 : -1;
            }

            // เงื่อนไขที่ 2: PN น้อยที่สุด
            if (a.pn !== b.pn) {
                return a.pn - b.pn;
            }

            // เงื่อนไขที่ 3: sizeMM น้อยที่สุด
            if (a.sizeMM !== b.sizeMM) {
                return a.sizeMM - b.sizeMM;
            }

            // เงื่อนไขที่ 4: ราคาน้อยที่สุด
            return (a.price || 0) - (b.price || 0);
        });

        return sortedPipes[0];
    } catch (error) {
        console.error('Error selecting best pipe:', error);
        return null;
    }
}

/**
 * สร้าง summary ของการคำนวณสำหรับแสดงผล
 * @param calculations การคำนวณของแต่ละท่อ
 * @param sprinklerPressure ข้อมูลแรงดันหัวฉีด
 * @returns ข้อมูลสำหรับแสดงผล
 */
export function createCalculationSummary(
    calculations: { [pipeType: string]: PipeCalculationResult | null },
    sprinklerPressure: SprinklerPressureInfo
) {
    const summary = {
        sprinklerPressure,
        pipeCalculations: calculations,
        warnings: [] as string[],
        totalHeadLoss: 0
    };

    // รวมค่า head loss
    Object.values(calculations).forEach(calc => {
        if (calc) {
            summary.totalHeadLoss += calc.headLoss;
        }
    });

    // ตรวจสอบ warnings
    const mainCalc = calculations.main;
    const branchSecondaryTotal = (calculations.branch?.headLoss || 0) + (calculations.secondary?.headLoss || 0);

    if (mainCalc && mainCalc.headLoss > sprinklerPressure.head20PercentM) {
        summary.warnings.push(
            `⚠️ ท่อเมนหลัก: ${mainCalc.headLoss.toFixed(3)}ม. มากกว่า 20% Head หัวฉีด (${sprinklerPressure.head20PercentM.toFixed(1)}ม.)`
        );
    }

    if (branchSecondaryTotal > sprinklerPressure.head20PercentM) {
        summary.warnings.push(
            `⚠️ ท่อย่อย+ท่อเมนรอง: ${branchSecondaryTotal.toFixed(3)}ม. มากกว่า 20% Head หัวฉีด (${sprinklerPressure.head20PercentM.toFixed(1)}ม.)`
        );
    }

    return summary;
}

/**
 * ตรวจสอบว่าขนาดท่อเป็นไปตามลำดับชั้นหรือไม่
 * @param pipeType ประเภทท่อปัจจุบัน
 * @param currentSizeMM ขนาดท่อปัจจุบัน
 * @param selectedPipeSizes ขนาดท่อที่เลือกไว้แล้ว
 * @returns true ถ้าขนาดถูกต้องตามลำดับชั้น
 */
export function validatePipeSizeHierarchy(
    pipeType: string, 
    currentSizeMM: number, 
    selectedPipeSizes: SelectedPipeSizes
): boolean {
    const mainSize = selectedPipeSizes.main || 0;
    const secondarySize = selectedPipeSizes.secondary || 0;
    const branchSize = selectedPipeSizes.branch || 0;
    const emitterSize = selectedPipeSizes.emitter || 0;

    switch (pipeType) {
        case 'main': {
            // ท่อเมนต้องใหญ่กว่าท่อทุกประเภท
            return currentSizeMM > Math.max(secondarySize, branchSize, emitterSize);
        }
        
        case 'secondary': {
            // ท่อเมนรองต้องเล็กกว่าท่อเมน แต่ใหญ่กว่าท่อย่อย
            const isSmaller = mainSize === 0 || currentSizeMM < mainSize;
            const isLarger = currentSizeMM > Math.max(branchSize, emitterSize);
            return isSmaller && isLarger;
        }
        
        case 'branch':
        case 'emitter': {
            // ท่อย่อยและท่อย่อยแยกต้องไม่เกิน 32mm และเล็กกว่าท่อเมน/เมนรอง
            const maxAllowed = 32;
            const isBelowLimit = currentSizeMM <= maxAllowed;
            const isSmaller2 = currentSizeMM < Math.max(mainSize || Number.MAX_VALUE, secondarySize || Number.MAX_VALUE);
            return isBelowLimit && (mainSize === 0 && secondarySize === 0 ? true : isSmaller2);
        }
        
        default:
            return true;
    }
}

/**
 * เลือกท่อที่ดีที่สุดตาม Head Loss เป้าหมาย 1.9 ม.
 * @param availablePipes รายการท่อที่มีให้เลือก
 * @param pipeType ประเภทท่อ
 * @param bestPipeInfo ข้อมูลท่อที่ต้องการน้ำมากที่สุด
 * @param selectedPipeType ประเภทวัสดุท่อ (PE/PVC)
 * @param selectedPipeSizes ขนาดท่อที่เลือกไว้แล้ว
 * @param targetHeadLoss เป้าหมาย Head Loss (เมตร)
 * @returns ท่อที่เหมาะสมที่สุด
 */
export function selectBestPipeByHeadLoss(
    availablePipes: any[],
    pipeType: string,
    bestPipeInfo: BestPipeInfo,
    selectedPipeType: string,
    selectedPipeSizes: SelectedPipeSizes,
    targetHeadLoss: number = 1.9
): any | null {
    if (!availablePipes.length || !bestPipeInfo) {
        return null;
    }

    // กรองท่อที่เป็นไปตามลำดับชั้น
    const validPipes = availablePipes.filter(pipe => {
        return validatePipeSizeHierarchy(pipeType, pipe.sizeMM, selectedPipeSizes);
    });

    if (!validPipes.length) {
        // ถ้าไม่มีท่อที่ตรงตามลำดับชั้น ให้เลือกท่อที่เล็กที่สุดที่เป็นไปได้
        const fallbackPipes = availablePipes.filter(pipe => {
            // สำหรับ branch และ emitter ต้องไม่เกิน 32mm
            if (pipeType === 'branch' || pipeType === 'emitter') {
                return pipe.sizeMM <= 32;
            }
            return true;
        });
        
        return fallbackPipes.length > 0 
            ? fallbackPipes.reduce((smallest, current) => current.sizeMM < smallest.sizeMM ? current : smallest)
            : null;
    }

    // คำนวณ Head Loss สำหรับแต่ละท่อและหาที่ใกล้เคียง 1.9 ม. ที่สุด
    let bestPipe: any = null;
    let bestHeadLossDiff = Number.MAX_VALUE;

    for (const pipe of validPipes) {
        const actualPressureClass = selectedPipeType === 'PE' 
            ? `PN${pipe.pn}` 
            : `Class${pipe.pn}`;
        
        const calculation = calculateNewHeadLoss(
            bestPipeInfo,
            selectedPipeType,
            actualPressureClass,
            `${pipe.sizeMM}mm`
        );

        if (calculation && calculation.headLoss > 0) {
            // หาค่าที่ใกล้เคียงเป้าหมายที่สุด
            const headLossDiff = Math.abs(calculation.headLoss - targetHeadLoss);
            
            if (headLossDiff < bestHeadLossDiff) {
                bestHeadLossDiff = headLossDiff;
                bestPipe = pipe;
            }
        }
    }

    // ถ้าไม่พบท่อที่เหมาะสม ให้เลือกท่อแรก
    return bestPipe || validPipes[0];
}
