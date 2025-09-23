/* eslint-disable @typescript-eslint/no-explicit-any */
// Pipe Friction Loss Data (Pressure drop in kgf/cm²/km)
// Data extracted from pipe friction tables

export interface PipeFlowData {
    flow: number; // Flow rate (liters/minute)
    pressureLoss: number; // Pressure loss (kgf/cm²/km)
}

export interface PipeSizeData {
    [size: string]: PipeFlowData[];
}

// PE PN 2.5 Data
export function getPE_PN25_Data(): PipeSizeData {
    return {
        '20mm': [
            // 0.5 นิ้ว
            { flow: 1, pressureLoss: 0.01 },
            { flow: 2, pressureLoss: 0.02 },
            { flow: 3, pressureLoss: 0.04 },
            { flow: 4, pressureLoss: 0.07 },
            { flow: 5, pressureLoss: 0.1 },
            { flow: 6, pressureLoss: 0.14 },
            { flow: 7, pressureLoss: 0.19 },
            { flow: 8, pressureLoss: 0.24 },
            { flow: 9, pressureLoss: 0.3 },
            { flow: 10, pressureLoss: 0.36 },
            { flow: 12, pressureLoss: 0.51 },
            { flow: 14, pressureLoss: 0.67 },
            { flow: 16, pressureLoss: 0.86 },
            { flow: 18, pressureLoss: 1.07 },
            { flow: 20, pressureLoss: 1.3 },
            { flow: 22, pressureLoss: 1.55 },
            { flow: 24, pressureLoss: 1.82 },
            { flow: 26, pressureLoss: 2.12 },
            { flow: 28, pressureLoss: 2.43 },
            { flow: 30, pressureLoss: 2.76 },
            { flow: 32, pressureLoss: 3.11 },
            { flow: 34, pressureLoss: 3.48 },
            { flow: 36, pressureLoss: 3.87 },
            { flow: 38, pressureLoss: 4.27 },
            { flow: 40, pressureLoss: 4.7 },
        ],
        '25mm': [
            // 0.75 นิ้ว
            { flow: 3, pressureLoss: 0.01 },
            { flow: 4, pressureLoss: 0.02 },
            { flow: 5, pressureLoss: 0.03 },
            { flow: 6, pressureLoss: 0.05 },
            { flow: 7, pressureLoss: 0.06 },
            { flow: 8, pressureLoss: 0.08 },
            { flow: 9, pressureLoss: 0.1 },
            { flow: 10, pressureLoss: 0.12 },
            { flow: 12, pressureLoss: 0.17 },
            { flow: 14, pressureLoss: 0.22 },
            { flow: 16, pressureLoss: 0.28 },
            { flow: 18, pressureLoss: 0.35 },
            { flow: 20, pressureLoss: 0.43 },
            { flow: 22, pressureLoss: 0.51 },
            { flow: 24, pressureLoss: 0.6 },
            { flow: 26, pressureLoss: 0.7 },
            { flow: 28, pressureLoss: 0.8 },
            { flow: 30, pressureLoss: 0.91 },
            { flow: 32, pressureLoss: 1.03 },
            { flow: 34, pressureLoss: 1.15 },
            { flow: 36, pressureLoss: 1.28 },
            { flow: 38, pressureLoss: 1.41 },
            { flow: 40, pressureLoss: 1.55 },
            { flow: 42, pressureLoss: 1.7 },
            { flow: 44, pressureLoss: 1.85 },
            { flow: 46, pressureLoss: 2.01 },
            { flow: 48, pressureLoss: 2.18 },
            { flow: 50, pressureLoss: 2.35 },
            { flow: 55, pressureLoss: 2.8 },
            { flow: 60, pressureLoss: 3.29 },
            { flow: 65, pressureLoss: 3.82 },
            { flow: 70, pressureLoss: 4.38 },
            { flow: 75, pressureLoss: 4.97 },
        ],
        '32mm': [
            // 1 นิ้ว
            { flow: 6, pressureLoss: 0.01 },
            { flow: 7, pressureLoss: 0.02 },
            { flow: 8, pressureLoss: 0.02 },
            { flow: 9, pressureLoss: 0.03 },
            { flow: 10, pressureLoss: 0.04 },
            { flow: 12, pressureLoss: 0.05 },
            { flow: 14, pressureLoss: 0.07 },
            { flow: 16, pressureLoss: 0.08 },
            { flow: 18, pressureLoss: 0.11 },
            { flow: 20, pressureLoss: 0.13 },
            { flow: 22, pressureLoss: 0.15 },
            { flow: 24, pressureLoss: 0.18 },
            { flow: 26, pressureLoss: 0.21 },
            { flow: 28, pressureLoss: 0.24 },
            { flow: 30, pressureLoss: 0.27 },
            { flow: 32, pressureLoss: 0.31 },
            { flow: 34, pressureLoss: 0.34 },
            { flow: 36, pressureLoss: 0.38 },
            { flow: 38, pressureLoss: 0.42 },
            { flow: 40, pressureLoss: 0.46 },
            { flow: 42, pressureLoss: 0.51 },
            { flow: 44, pressureLoss: 0.55 },
            { flow: 46, pressureLoss: 0.6 },
            { flow: 48, pressureLoss: 0.65 },
            { flow: 50, pressureLoss: 0.7 },
            { flow: 55, pressureLoss: 0.83 },
            { flow: 60, pressureLoss: 0.98 },
            { flow: 65, pressureLoss: 1.13 },
            { flow: 70, pressureLoss: 1.3 },
            { flow: 75, pressureLoss: 1.48 },
            { flow: 80, pressureLoss: 1.67 },
            { flow: 85, pressureLoss: 1.86 },
            { flow: 90, pressureLoss: 2.07 },
            { flow: 95, pressureLoss: 2.29 },
            { flow: 100, pressureLoss: 2.52 },
            { flow: 110, pressureLoss: 3.01 },
            { flow: 120, pressureLoss: 3.52 },
            { flow: 130, pressureLoss: 4.1 },
            { flow: 140, pressureLoss: 4.7 },
        ],
        '40mm': [
            // 1.25 นิ้ว
            { flow: 10, pressureLoss: 0.01 },
            { flow: 12, pressureLoss: 0.02 },
            { flow: 14, pressureLoss: 0.02 },
            { flow: 16, pressureLoss: 0.03 },
            { flow: 18, pressureLoss: 0.04 },
            { flow: 20, pressureLoss: 0.04 },
            { flow: 22, pressureLoss: 0.05 },
            { flow: 24, pressureLoss: 0.06 },
            { flow: 26, pressureLoss: 0.07 },
            { flow: 28, pressureLoss: 0.08 },
            { flow: 30, pressureLoss: 0.09 },
            { flow: 32, pressureLoss: 0.11 },
            { flow: 34, pressureLoss: 0.12 },
            { flow: 36, pressureLoss: 0.13 },
            { flow: 38, pressureLoss: 0.15 },
            { flow: 40, pressureLoss: 0.16 },
            { flow: 42, pressureLoss: 0.18 },
            { flow: 44, pressureLoss: 0.19 },
            { flow: 46, pressureLoss: 0.21 },
            { flow: 48, pressureLoss: 0.23 },
            { flow: 50, pressureLoss: 0.24 },
            { flow: 55, pressureLoss: 0.3 },
            { flow: 60, pressureLoss: 0.34 },
            { flow: 65, pressureLoss: 0.4 },
            { flow: 70, pressureLoss: 0.45 },
            { flow: 75, pressureLoss: 0.52 },
            { flow: 80, pressureLoss: 0.58 },
            { flow: 85, pressureLoss: 0.65 },
            { flow: 90, pressureLoss: 0.72 },
            { flow: 95, pressureLoss: 0.8 },
            { flow: 100, pressureLoss: 0.88 },
            { flow: 110, pressureLoss: 1.05 },
            { flow: 120, pressureLoss: 1.23 },
            { flow: 130, pressureLoss: 1.43 },
            { flow: 140, pressureLoss: 1.64 },
            { flow: 150, pressureLoss: 1.86 },
            { flow: 160, pressureLoss: 2.1 },
            { flow: 170, pressureLoss: 2.35 },
            { flow: 180, pressureLoss: 2.61 },
            { flow: 190, pressureLoss: 2.89 },
            { flow: 200, pressureLoss: 3.18 },
            { flow: 220, pressureLoss: 3.79 },
            { flow: 240, pressureLoss: 4.45 },
        ],
        '50mm': [
            // 1.5 นิ้ว
            { flow: 20, pressureLoss: 0.01 },
            { flow: 22, pressureLoss: 0.02 },
            { flow: 24, pressureLoss: 0.02 },
            { flow: 26, pressureLoss: 0.02 },
            { flow: 28, pressureLoss: 0.03 },
            { flow: 30, pressureLoss: 0.03 },
            { flow: 32, pressureLoss: 0.04 },
            { flow: 34, pressureLoss: 0.04 },
            { flow: 36, pressureLoss: 0.04 },
            { flow: 38, pressureLoss: 0.05 },
            { flow: 40, pressureLoss: 0.05 },
            { flow: 42, pressureLoss: 0.06 },
            { flow: 44, pressureLoss: 0.06 },
            { flow: 46, pressureLoss: 0.07 },
            { flow: 48, pressureLoss: 0.07 },
            { flow: 50, pressureLoss: 0.08 },
            { flow: 55, pressureLoss: 0.1 },
            { flow: 60, pressureLoss: 0.11 },
            { flow: 65, pressureLoss: 0.13 },
            { flow: 70, pressureLoss: 0.15 },
            { flow: 75, pressureLoss: 0.17 },
            { flow: 80, pressureLoss: 0.19 },
            { flow: 85, pressureLoss: 0.22 },
            { flow: 90, pressureLoss: 0.24 },
            { flow: 95, pressureLoss: 0.26 },
            { flow: 100, pressureLoss: 0.29 },
            { flow: 110, pressureLoss: 0.35 },
            { flow: 120, pressureLoss: 0.41 },
            { flow: 130, pressureLoss: 0.47 },
            { flow: 140, pressureLoss: 0.54 },
            { flow: 150, pressureLoss: 0.62 },
            { flow: 160, pressureLoss: 0.69 },
            { flow: 170, pressureLoss: 0.78 },
            { flow: 180, pressureLoss: 0.86 },
            { flow: 190, pressureLoss: 0.95 },
            { flow: 200, pressureLoss: 1.05 },
            { flow: 220, pressureLoss: 1.25 },
            { flow: 240, pressureLoss: 1.47 },
            { flow: 260, pressureLoss: 1.7 },
            { flow: 280, pressureLoss: 1.96 },
            { flow: 300, pressureLoss: 2.22 },
            { flow: 320, pressureLoss: 2.51 },
            { flow: 340, pressureLoss: 2.8 },
            { flow: 360, pressureLoss: 3.12 },
            { flow: 380, pressureLoss: 3.45 },
            { flow: 400, pressureLoss: 3.79 },
            { flow: 420, pressureLoss: 4.13 },
            { flow: 440, pressureLoss: 4.52 },
            { flow: 460, pressureLoss: 4.91 },
        ],
        '63mm': [
            // 2 นิ้ว
            { flow: 36, pressureLoss: 0.01 },
            { flow: 38, pressureLoss: 0.02 },
            { flow: 40, pressureLoss: 0.02 },
            { flow: 42, pressureLoss: 0.02 },
            { flow: 44, pressureLoss: 0.02 },
            { flow: 46, pressureLoss: 0.02 },
            { flow: 48, pressureLoss: 0.02 },
            { flow: 50, pressureLoss: 0.03 },
            { flow: 55, pressureLoss: 0.04 },
            { flow: 60, pressureLoss: 0.04 },
            { flow: 65, pressureLoss: 0.04 },
            { flow: 70, pressureLoss: 0.05 },
            { flow: 75, pressureLoss: 0.06 },
            { flow: 80, pressureLoss: 0.06 },
            { flow: 85, pressureLoss: 0.07 },
            { flow: 90, pressureLoss: 0.08 },
            { flow: 95, pressureLoss: 0.09 },
            { flow: 100, pressureLoss: 0.09 },
            { flow: 110, pressureLoss: 0.11 },
            { flow: 120, pressureLoss: 0.13 },
            { flow: 130, pressureLoss: 0.15 },
            { flow: 140, pressureLoss: 0.18 },
            { flow: 150, pressureLoss: 0.2 },
            { flow: 160, pressureLoss: 0.22 },
            { flow: 170, pressureLoss: 0.25 },
            { flow: 180, pressureLoss: 0.28 },
            { flow: 190, pressureLoss: 0.31 },
            { flow: 200, pressureLoss: 0.34 },
            { flow: 220, pressureLoss: 0.41 },
            { flow: 240, pressureLoss: 0.48 },
            { flow: 260, pressureLoss: 0.55 },
            { flow: 280, pressureLoss: 0.63 },
            { flow: 300, pressureLoss: 0.72 },
            { flow: 320, pressureLoss: 0.81 },
            { flow: 340, pressureLoss: 0.91 },
            { flow: 360, pressureLoss: 1.01 },
            { flow: 380, pressureLoss: 1.11 },
            { flow: 400, pressureLoss: 1.23 },
            { flow: 420, pressureLoss: 1.34 },
            { flow: 440, pressureLoss: 1.46 },
            { flow: 460, pressureLoss: 1.59 },
            { flow: 480, pressureLoss: 1.72 },
            { flow: 500, pressureLoss: 1.85 },
            { flow: 550, pressureLoss: 2.21 },
            { flow: 600, pressureLoss: 2.6 },
            { flow: 650, pressureLoss: 3.01 },
            { flow: 700, pressureLoss: 3.46 },
            { flow: 750, pressureLoss: 3.93 },
        ],
    };
}

// PE PN 4 Data
export function getPE_PN4_Data(): PipeSizeData {
    return {
        '16mm': [
            // 0.375 นิ้ว หรือ 3 หุน 3/8"
            { flow: 1, pressureLoss: 0.02 },
            { flow: 2, pressureLoss: 0.07 },
            { flow: 3, pressureLoss: 0.15 },
            { flow: 4, pressureLoss: 0.26 },
            { flow: 5, pressureLoss: 0.39 },
            { flow: 6, pressureLoss: 0.55 },
            { flow: 7, pressureLoss: 0.73 },
            { flow: 8, pressureLoss: 0.93 },
            { flow: 9, pressureLoss: 1.16 },
            { flow: 10, pressureLoss: 1.41 },
            { flow: 12, pressureLoss: 1.98 },
            { flow: 14, pressureLoss: 2.63 },
            { flow: 16, pressureLoss: 3.37 },
            { flow: 18, pressureLoss: 4.19 },
            { flow: 20, pressureLoss: 5.09 },
        ],
        '20mm': [
            // 0.5 นิ้ว
            { flow: 3, pressureLoss: 0.05 },
            { flow: 4, pressureLoss: 0.09 },
            { flow: 5, pressureLoss: 0.13 },
            { flow: 6, pressureLoss: 0.18 },
            { flow: 7, pressureLoss: 0.25 },
            { flow: 8, pressureLoss: 0.32 },
            { flow: 9, pressureLoss: 0.39 },
            { flow: 10, pressureLoss: 0.48 },
            { flow: 12, pressureLoss: 0.67 },
            { flow: 14, pressureLoss: 0.89 },
            { flow: 16, pressureLoss: 1.14 },
            { flow: 18, pressureLoss: 1.41 },
            { flow: 20, pressureLoss: 1.72 },
            { flow: 22, pressureLoss: 2.05 },
            { flow: 24, pressureLoss: 2.41 },
            { flow: 26, pressureLoss: 2.79 },
            { flow: 28, pressureLoss: 3.21 },
            { flow: 30, pressureLoss: 3.64 },
            { flow: 32, pressureLoss: 4.11 },
            { flow: 34, pressureLoss: 4.59 },
        ],
        '25mm': [
            // 0.75 นิ้ว
            { flow: 5, pressureLoss: 0.05 },
            { flow: 6, pressureLoss: 0.06 },
            { flow: 7, pressureLoss: 0.08 },
            { flow: 8, pressureLoss: 0.11 },
            { flow: 9, pressureLoss: 0.13 },
            { flow: 10, pressureLoss: 0.16 },
            { flow: 12, pressureLoss: 0.23 },
            { flow: 14, pressureLoss: 0.3 },
            { flow: 16, pressureLoss: 0.39 },
            { flow: 18, pressureLoss: 0.48 },
            { flow: 20, pressureLoss: 0.59 },
            { flow: 22, pressureLoss: 0.7 },
            { flow: 24, pressureLoss: 0.82 },
            { flow: 26, pressureLoss: 0.95 },
            { flow: 28, pressureLoss: 1.1 },
            { flow: 30, pressureLoss: 1.24 },
            { flow: 32, pressureLoss: 1.4 },
            { flow: 34, pressureLoss: 1.57 },
            { flow: 36, pressureLoss: 1.74 },
            { flow: 38, pressureLoss: 1.93 },
            { flow: 40, pressureLoss: 2.12 },
            { flow: 42, pressureLoss: 2.32 },
            { flow: 44, pressureLoss: 2.53 },
            { flow: 46, pressureLoss: 2.75 },
            { flow: 48, pressureLoss: 2.97 },
            { flow: 50, pressureLoss: 3.2 },
            { flow: 55, pressureLoss: 3.82 },
            { flow: 60, pressureLoss: 4.49 },
        ],
        '32mm': [
            // 1 นิ้ว
            { flow: 10, pressureLoss: 0.05 },
            { flow: 12, pressureLoss: 0.07 },
            { flow: 14, pressureLoss: 0.09 },
            { flow: 16, pressureLoss: 0.12 },
            { flow: 18, pressureLoss: 0.14 },
            { flow: 20, pressureLoss: 0.17 },
            { flow: 22, pressureLoss: 0.21 },
            { flow: 24, pressureLoss: 0.24 },
            { flow: 26, pressureLoss: 0.28 },
            { flow: 28, pressureLoss: 0.33 },
            { flow: 30, pressureLoss: 0.37 },
            { flow: 32, pressureLoss: 0.42 },
            { flow: 34, pressureLoss: 0.47 },
            { flow: 36, pressureLoss: 0.52 },
            { flow: 38, pressureLoss: 0.57 },
            { flow: 40, pressureLoss: 0.63 },
            { flow: 42, pressureLoss: 0.69 },
            { flow: 44, pressureLoss: 0.75 },
            { flow: 46, pressureLoss: 0.82 },
            { flow: 48, pressureLoss: 0.88 },
            { flow: 50, pressureLoss: 0.95 },
            { flow: 55, pressureLoss: 1.14 },
            { flow: 60, pressureLoss: 1.34 },
            { flow: 65, pressureLoss: 1.55 },
            { flow: 70, pressureLoss: 1.78 },
            { flow: 75, pressureLoss: 2.02 },
            { flow: 80, pressureLoss: 2.28 },
            { flow: 85, pressureLoss: 2.55 },
            { flow: 90, pressureLoss: 2.83 },
            { flow: 95, pressureLoss: 3.13 },
            { flow: 100, pressureLoss: 3.44 },
            { flow: 110, pressureLoss: 4.11 },
            { flow: 120, pressureLoss: 4.82 },
        ],
        '40mm': [
            // 1.25 นิ้ว
            { flow: 18, pressureLoss: 0.05 },
            { flow: 20, pressureLoss: 0.06 },
            { flow: 22, pressureLoss: 0.07 },
            { flow: 24, pressureLoss: 0.08 },
            { flow: 26, pressureLoss: 0.1 },
            { flow: 28, pressureLoss: 0.11 },
            { flow: 30, pressureLoss: 0.12 },
            { flow: 32, pressureLoss: 0.14 },
            { flow: 34, pressureLoss: 0.16 },
            { flow: 36, pressureLoss: 0.18 },
            { flow: 38, pressureLoss: 0.19 },
            { flow: 40, pressureLoss: 0.21 },
            { flow: 42, pressureLoss: 0.23 },
            { flow: 44, pressureLoss: 0.25 },
            { flow: 46, pressureLoss: 0.28 },
            { flow: 48, pressureLoss: 0.3 },
            { flow: 50, pressureLoss: 0.32 },
            { flow: 55, pressureLoss: 0.38 },
            { flow: 60, pressureLoss: 0.45 },
            { flow: 65, pressureLoss: 0.52 },
            { flow: 70, pressureLoss: 0.6 },
            { flow: 75, pressureLoss: 0.68 },
            { flow: 80, pressureLoss: 0.77 },
            { flow: 85, pressureLoss: 0.86 },
            { flow: 90, pressureLoss: 0.96 },
            { flow: 95, pressureLoss: 1.06 },
            { flow: 100, pressureLoss: 1.16 },
            { flow: 110, pressureLoss: 1.39 },
            { flow: 120, pressureLoss: 1.63 },
            { flow: 130, pressureLoss: 1.89 },
            { flow: 140, pressureLoss: 2.17 },
            { flow: 150, pressureLoss: 2.46 },
            { flow: 160, pressureLoss: 2.77 },
            { flow: 170, pressureLoss: 3.1 },
            { flow: 180, pressureLoss: 3.45 },
            { flow: 190, pressureLoss: 3.81 },
            { flow: 200, pressureLoss: 4.19 },
            { flow: 220, pressureLoss: 5.0 },
        ],
        '50mm': [
            // 1.5 นิ้ว
            { flow: 32, pressureLoss: 0.05 },
            { flow: 34, pressureLoss: 0.05 },
            { flow: 36, pressureLoss: 0.06 },
            { flow: 38, pressureLoss: 0.06 },
            { flow: 40, pressureLoss: 0.07 },
            { flow: 42, pressureLoss: 0.08 },
            { flow: 44, pressureLoss: 0.08 },
            { flow: 46, pressureLoss: 0.09 },
            { flow: 48, pressureLoss: 0.1 },
            { flow: 50, pressureLoss: 0.11 },
            { flow: 55, pressureLoss: 0.13 },
            { flow: 60, pressureLoss: 0.15 },
            { flow: 65, pressureLoss: 0.17 },
            { flow: 70, pressureLoss: 0.2 },
            { flow: 75, pressureLoss: 0.23 },
            { flow: 80, pressureLoss: 0.26 },
            { flow: 85, pressureLoss: 0.29 },
            { flow: 90, pressureLoss: 0.32 },
            { flow: 95, pressureLoss: 0.35 },
            { flow: 100, pressureLoss: 0.39 },
            { flow: 110, pressureLoss: 0.46 },
            { flow: 120, pressureLoss: 0.54 },
            { flow: 130, pressureLoss: 0.63 },
            { flow: 140, pressureLoss: 0.72 },
            { flow: 150, pressureLoss: 0.82 },
            { flow: 160, pressureLoss: 0.93 },
            { flow: 170, pressureLoss: 1.04 },
            { flow: 180, pressureLoss: 1.15 },
            { flow: 190, pressureLoss: 1.27 },
            { flow: 200, pressureLoss: 1.4 },
            { flow: 220, pressureLoss: 1.67 },
            { flow: 240, pressureLoss: 1.96 },
            { flow: 260, pressureLoss: 2.28 },
            { flow: 280, pressureLoss: 2.61 },
            { flow: 300, pressureLoss: 2.97 },
            { flow: 320, pressureLoss: 3.34 },
            { flow: 340, pressureLoss: 3.74 },
            { flow: 360, pressureLoss: 4.16 },
            { flow: 380, pressureLoss: 4.6 },
            { flow: 400, pressureLoss: 5.05 },
        ],
        '63mm': [
            // 2 นิ้ว
            { flow: 60, pressureLoss: 0.05 },
            { flow: 65, pressureLoss: 0.06 },
            { flow: 70, pressureLoss: 0.07 },
            { flow: 75, pressureLoss: 0.07 },
            { flow: 80, pressureLoss: 0.08 },
            { flow: 85, pressureLoss: 0.09 },
            { flow: 90, pressureLoss: 0.1 },
            { flow: 95, pressureLoss: 0.12 },
            { flow: 100, pressureLoss: 0.13 },
            { flow: 110, pressureLoss: 0.15 },
            { flow: 120, pressureLoss: 0.18 },
            { flow: 130, pressureLoss: 0.21 },
            { flow: 140, pressureLoss: 0.24 },
            { flow: 150, pressureLoss: 0.27 },
            { flow: 160, pressureLoss: 0.3 },
            { flow: 170, pressureLoss: 0.34 },
            { flow: 180, pressureLoss: 0.38 },
            { flow: 190, pressureLoss: 0.42 },
            { flow: 200, pressureLoss: 0.46 },
            { flow: 220, pressureLoss: 0.55 },
            { flow: 240, pressureLoss: 0.64 },
            { flow: 260, pressureLoss: 0.74 },
            { flow: 280, pressureLoss: 0.85 },
            { flow: 300, pressureLoss: 0.97 },
            { flow: 320, pressureLoss: 1.09 },
            { flow: 340, pressureLoss: 1.22 },
            { flow: 360, pressureLoss: 1.36 },
            { flow: 380, pressureLoss: 1.5 },
            { flow: 400, pressureLoss: 1.65 },
            { flow: 420, pressureLoss: 1.81 },
            { flow: 440, pressureLoss: 1.97 },
            { flow: 460, pressureLoss: 2.14 },
            { flow: 480, pressureLoss: 2.32 },
            { flow: 500, pressureLoss: 2.5 },
            { flow: 550, pressureLoss: 2.98 },
            { flow: 600, pressureLoss: 3.5 },
            { flow: 650, pressureLoss: 4.05 },
            { flow: 700, pressureLoss: 4.66 },
        ],
    };
}

// PE PN 6.3 Data
export function getPE_PN63_Data(): PipeSizeData {
    return {
        '16mm': [
            // 0.375 นิ้ว (เพิ่มเพื่อทดสอบ Smart Size Selection)
            { flow: 1, pressureLoss: 0.03 },
            { flow: 2, pressureLoss: 0.08 },
            { flow: 3, pressureLoss: 0.16 },
            { flow: 4, pressureLoss: 0.28 },
            { flow: 5, pressureLoss: 0.42 },
            { flow: 10, pressureLoss: 1.52 },
            { flow: 15, pressureLoss: 3.25 },
            { flow: 20, pressureLoss: 5.63 },
            { flow: 25, pressureLoss: 8.67 },
            { flow: 30, pressureLoss: 12.38 },
        ],
        '20mm': [
            // 0.5 นิ้ว (เพิ่มเพื่อรองรับ PN16 → PN6.3)
            { flow: 1, pressureLoss: 0.02 },
            { flow: 2, pressureLoss: 0.05 },
            { flow: 3, pressureLoss: 0.1 },
            { flow: 4, pressureLoss: 0.16 },
            { flow: 5, pressureLoss: 0.23 },
            { flow: 10, pressureLoss: 0.85 },
            { flow: 15, pressureLoss: 1.82 },
            { flow: 20, pressureLoss: 3.15 },
            { flow: 25, pressureLoss: 4.85 },
            { flow: 30, pressureLoss: 6.94 },
            { flow: 35, pressureLoss: 9.4 },
            { flow: 40, pressureLoss: 12.25 },
            { flow: 45, pressureLoss: 15.47 },
            { flow: 50, pressureLoss: 19.06 },
            { flow: 55, pressureLoss: 23.02 },
            { flow: 60, pressureLoss: 27.34 },
        ],
        '25mm': [
            // 0.75 นิ้ว
            { flow: 2, pressureLoss: 0.01 },
            { flow: 3, pressureLoss: 0.02 },
            { flow: 4, pressureLoss: 0.03 },
            { flow: 5, pressureLoss: 0.04 },
            { flow: 6, pressureLoss: 0.06 },
            { flow: 7, pressureLoss: 0.07 },
            { flow: 8, pressureLoss: 0.09 },
            { flow: 9, pressureLoss: 0.12 },
            { flow: 10, pressureLoss: 0.14 },
            { flow: 12, pressureLoss: 0.2 },
            { flow: 14, pressureLoss: 0.26 },
            { flow: 16, pressureLoss: 0.34 },
            { flow: 18, pressureLoss: 0.42 },
            { flow: 20, pressureLoss: 0.51 },
            { flow: 22, pressureLoss: 0.61 },
            { flow: 24, pressureLoss: 0.72 },
            { flow: 26, pressureLoss: 0.83 },
            { flow: 28, pressureLoss: 0.96 },
            { flow: 30, pressureLoss: 1.09 },
            { flow: 32, pressureLoss: 1.23 },
            { flow: 34, pressureLoss: 1.37 },
            { flow: 36, pressureLoss: 1.52 },
            { flow: 38, pressureLoss: 1.68 },
            { flow: 40, pressureLoss: 1.85 },
            { flow: 42, pressureLoss: 2.03 },
            { flow: 44, pressureLoss: 2.21 },
            { flow: 46, pressureLoss: 2.4 },
            { flow: 48, pressureLoss: 2.59 },
            { flow: 50, pressureLoss: 2.8 },
            { flow: 55, pressureLoss: 3.34 },
            { flow: 60, pressureLoss: 3.92 },
            { flow: 65, pressureLoss: 4.55 },
        ],
        '32mm': [
            // 1 นิ้ว
            { flow: 10, pressureLoss: 0.04 },
            { flow: 12, pressureLoss: 0.06 },
            { flow: 14, pressureLoss: 0.08 },
            { flow: 16, pressureLoss: 0.1 },
            { flow: 18, pressureLoss: 0.12 },
            { flow: 20, pressureLoss: 0.15 },
            { flow: 22, pressureLoss: 0.17 },
            { flow: 24, pressureLoss: 0.21 },
            { flow: 26, pressureLoss: 0.24 },
            { flow: 28, pressureLoss: 0.27 },
            { flow: 30, pressureLoss: 0.31 },
            { flow: 32, pressureLoss: 0.35 },
            { flow: 34, pressureLoss: 0.39 },
            { flow: 36, pressureLoss: 0.44 },
            { flow: 38, pressureLoss: 0.48 },
            { flow: 40, pressureLoss: 0.53 },
            { flow: 42, pressureLoss: 0.58 },
            { flow: 44, pressureLoss: 0.63 },
            { flow: 46, pressureLoss: 0.69 },
            { flow: 48, pressureLoss: 0.74 },
            { flow: 50, pressureLoss: 0.8 },
            { flow: 55, pressureLoss: 0.95 },
            { flow: 60, pressureLoss: 1.12 },
            { flow: 65, pressureLoss: 1.3 },
            { flow: 70, pressureLoss: 1.49 },
            { flow: 75, pressureLoss: 1.69 },
            { flow: 80, pressureLoss: 1.91 },
            { flow: 85, pressureLoss: 2.14 },
            { flow: 90, pressureLoss: 2.37 },
            { flow: 95, pressureLoss: 2.63 },
            { flow: 100, pressureLoss: 2.89 },
            { flow: 110, pressureLoss: 3.44 },
            { flow: 120, pressureLoss: 4.05 },
            { flow: 130, pressureLoss: 4.59 },
        ],
        '40mm': [
            // 1.25 นิ้ว
            { flow: 18, pressureLoss: 0.04 },
            { flow: 20, pressureLoss: 0.05 },
            { flow: 22, pressureLoss: 0.06 },
            { flow: 24, pressureLoss: 0.07 },
            { flow: 26, pressureLoss: 0.08 },
            { flow: 28, pressureLoss: 0.09 },
            { flow: 30, pressureLoss: 0.11 },
            { flow: 32, pressureLoss: 0.12 },
            { flow: 34, pressureLoss: 0.13 },
            { flow: 36, pressureLoss: 0.15 },
            { flow: 38, pressureLoss: 0.16 },
            { flow: 40, pressureLoss: 0.18 },
            { flow: 42, pressureLoss: 0.2 },
            { flow: 44, pressureLoss: 0.21 },
            { flow: 46, pressureLoss: 0.23 },
            { flow: 48, pressureLoss: 0.25 },
            { flow: 50, pressureLoss: 0.27 },
            { flow: 55, pressureLoss: 0.32 },
            { flow: 60, pressureLoss: 0.38 },
            { flow: 65, pressureLoss: 0.44 },
            { flow: 70, pressureLoss: 0.51 },
            { flow: 75, pressureLoss: 0.58 },
            { flow: 80, pressureLoss: 0.65 },
            { flow: 85, pressureLoss: 0.73 },
            { flow: 90, pressureLoss: 0.81 },
            { flow: 95, pressureLoss: 0.89 },
            { flow: 100, pressureLoss: 0.98 },
            { flow: 110, pressureLoss: 1.17 },
            { flow: 120, pressureLoss: 1.38 },
            { flow: 130, pressureLoss: 1.6 },
            { flow: 140, pressureLoss: 1.83 },
            { flow: 150, pressureLoss: 2.08 },
            { flow: 160, pressureLoss: 2.34 },
            { flow: 170, pressureLoss: 2.62 },
            { flow: 180, pressureLoss: 2.92 },
            { flow: 190, pressureLoss: 3.29 },
            { flow: 200, pressureLoss: 3.54 },
            { flow: 220, pressureLoss: 4.23 },
            { flow: 240, pressureLoss: 4.97 },
        ],
        '50mm': [
            // 1.5 นิ้ว
            { flow: 36, pressureLoss: 0.05 },
            { flow: 38, pressureLoss: 0.06 },
            { flow: 40, pressureLoss: 0.06 },
            { flow: 42, pressureLoss: 0.07 },
            { flow: 44, pressureLoss: 0.07 },
            { flow: 46, pressureLoss: 0.08 },
            { flow: 48, pressureLoss: 0.09 },
            { flow: 50, pressureLoss: 0.09 },
            { flow: 55, pressureLoss: 0.11 },
            { flow: 60, pressureLoss: 0.13 },
            { flow: 65, pressureLoss: 0.15 },
            { flow: 70, pressureLoss: 0.17 },
            { flow: 75, pressureLoss: 0.19 },
            { flow: 80, pressureLoss: 0.22 },
            { flow: 85, pressureLoss: 0.25 },
            { flow: 90, pressureLoss: 0.27 },
            { flow: 95, pressureLoss: 0.3 },
            { flow: 100, pressureLoss: 0.33 },
            { flow: 110, pressureLoss: 0.4 },
            { flow: 120, pressureLoss: 0.46 },
            { flow: 130, pressureLoss: 0.54 },
            { flow: 140, pressureLoss: 0.62 },
            { flow: 150, pressureLoss: 0.7 },
            { flow: 160, pressureLoss: 0.79 },
            { flow: 170, pressureLoss: 0.89 },
            { flow: 180, pressureLoss: 0.98 },
            { flow: 190, pressureLoss: 1.09 },
            { flow: 200, pressureLoss: 1.2 },
            { flow: 220, pressureLoss: 1.43 },
            { flow: 240, pressureLoss: 1.68 },
            { flow: 260, pressureLoss: 1.94 },
            { flow: 280, pressureLoss: 2.23 },
            { flow: 300, pressureLoss: 2.54 },
            { flow: 320, pressureLoss: 2.86 },
            { flow: 340, pressureLoss: 3.2 },
            { flow: 360, pressureLoss: 3.55 },
            { flow: 380, pressureLoss: 3.93 },
            { flow: 400, pressureLoss: 4.32 },
            { flow: 420, pressureLoss: 4.73 },
        ],
        '63mm': [
            // 2 นิ้ว
            { flow: 60, pressureLoss: 0.04 },
            { flow: 65, pressureLoss: 0.05 },
            { flow: 70, pressureLoss: 0.06 },
            { flow: 75, pressureLoss: 0.06 },
            { flow: 80, pressureLoss: 0.07 },
            { flow: 85, pressureLoss: 0.08 },
            { flow: 90, pressureLoss: 0.09 },
            { flow: 95, pressureLoss: 0.1 },
            { flow: 100, pressureLoss: 0.11 },
            { flow: 110, pressureLoss: 0.13 },
            { flow: 120, pressureLoss: 0.15 },
            { flow: 130, pressureLoss: 0.18 },
            { flow: 140, pressureLoss: 0.2 },
            { flow: 150, pressureLoss: 0.23 },
            { flow: 160, pressureLoss: 0.26 },
            { flow: 170, pressureLoss: 0.29 },
            { flow: 180, pressureLoss: 0.32 },
            { flow: 190, pressureLoss: 0.35 },
            { flow: 200, pressureLoss: 0.39 },
            { flow: 220, pressureLoss: 0.47 },
            { flow: 240, pressureLoss: 0.55 },
            { flow: 260, pressureLoss: 0.63 },
            { flow: 280, pressureLoss: 0.73 },
            { flow: 300, pressureLoss: 0.83 },
            { flow: 320, pressureLoss: 0.93 },
            { flow: 340, pressureLoss: 1.04 },
            { flow: 360, pressureLoss: 1.16 },
            { flow: 380, pressureLoss: 1.28 },
            { flow: 400, pressureLoss: 1.41 },
            { flow: 420, pressureLoss: 1.54 },
            { flow: 440, pressureLoss: 1.68 },
            { flow: 460, pressureLoss: 1.82 },
            { flow: 480, pressureLoss: 1.97 },
            { flow: 500, pressureLoss: 2.13 },
            { flow: 550, pressureLoss: 2.58 },
            { flow: 600, pressureLoss: 3.11 },
            { flow: 650, pressureLoss: 3.46 },
            { flow: 700, pressureLoss: 3.97 },
            { flow: 750, pressureLoss: 4.71 },
        ],
        '75mm': [
            // 2.5 นิ้ว
            { flow: 110, pressureLoss: 0.05 },
            { flow: 120, pressureLoss: 0.06 },
            { flow: 130, pressureLoss: 0.07 },
            { flow: 140, pressureLoss: 0.09 },
            { flow: 150, pressureLoss: 0.1 },
            { flow: 160, pressureLoss: 0.11 },
            { flow: 170, pressureLoss: 0.12 },
            { flow: 180, pressureLoss: 0.14 },
            { flow: 190, pressureLoss: 0.15 },
            { flow: 200, pressureLoss: 0.16 },
            { flow: 220, pressureLoss: 0.2 },
            { flow: 240, pressureLoss: 0.23 },
            { flow: 260, pressureLoss: 0.27 },
            { flow: 280, pressureLoss: 0.31 },
            { flow: 300, pressureLoss: 0.35 },
            { flow: 320, pressureLoss: 0.4 },
            { flow: 340, pressureLoss: 0.44 },
            { flow: 360, pressureLoss: 0.49 },
            { flow: 380, pressureLoss: 0.55 },
            { flow: 400, pressureLoss: 0.6 },
            { flow: 420, pressureLoss: 0.66 },
            { flow: 440, pressureLoss: 0.72 },
            { flow: 460, pressureLoss: 0.78 },
            { flow: 480, pressureLoss: 0.84 },
            { flow: 500, pressureLoss: 0.91 },
            { flow: 550, pressureLoss: 1.08 },
            { flow: 600, pressureLoss: 1.46 },
            { flow: 650, pressureLoss: 1.48 },
            { flow: 700, pressureLoss: 1.69 },
            { flow: 750, pressureLoss: 1.92 },
        ],
        '90mm': [
            // 3 นิ้ว
            { flow: 170, pressureLoss: 0.05 },
            { flow: 180, pressureLoss: 0.06 },
            { flow: 190, pressureLoss: 0.06 },
            { flow: 200, pressureLoss: 0.07 },
            { flow: 220, pressureLoss: 0.08 },
            { flow: 240, pressureLoss: 0.1 },
            { flow: 260, pressureLoss: 0.11 },
            { flow: 280, pressureLoss: 0.13 },
            { flow: 300, pressureLoss: 0.15 },
            { flow: 320, pressureLoss: 0.16 },
            { flow: 340, pressureLoss: 0.18 },
            { flow: 360, pressureLoss: 0.2 },
            { flow: 380, pressureLoss: 0.22 },
            { flow: 400, pressureLoss: 0.25 },
            { flow: 420, pressureLoss: 0.27 },
            { flow: 440, pressureLoss: 0.3 },
            { flow: 460, pressureLoss: 0.32 },
            { flow: 480, pressureLoss: 0.35 },
            { flow: 500, pressureLoss: 0.37 },
            { flow: 550, pressureLoss: 0.45 },
            { flow: 600, pressureLoss: 0.53 },
            { flow: 650, pressureLoss: 0.61 },
            { flow: 700, pressureLoss: 0.7 },
            { flow: 750, pressureLoss: 0.79 },
        ],
    };
}

// PVC Class 5 Data
export function getPVC_Class5_Data(): PipeSizeData {
    return {
        '35mm': [
            // 1.25 นิ้ว
            { flow: 10, pressureLoss: 0.01 },
            { flow: 20, pressureLoss: 0.03 },
            { flow: 22, pressureLoss: 0.04 },
            { flow: 24, pressureLoss: 0.04 },
            { flow: 26, pressureLoss: 0.05 },
            { flow: 28, pressureLoss: 0.06 },
            { flow: 30, pressureLoss: 0.06 },
            { flow: 32, pressureLoss: 0.07 },
            { flow: 34, pressureLoss: 0.08 },
            { flow: 36, pressureLoss: 0.09 },
            { flow: 38, pressureLoss: 0.1 },
            { flow: 40, pressureLoss: 0.11 },
            { flow: 42, pressureLoss: 0.12 },
            { flow: 44, pressureLoss: 0.13 },
            { flow: 46, pressureLoss: 0.14 },
            { flow: 48, pressureLoss: 0.15 },
            { flow: 50, pressureLoss: 0.17 },
            { flow: 55, pressureLoss: 0.2 },
            { flow: 60, pressureLoss: 0.23 },
            { flow: 65, pressureLoss: 0.27 },
            { flow: 70, pressureLoss: 0.31 },
            { flow: 75, pressureLoss: 0.35 },
            { flow: 80, pressureLoss: 0.39 },
            { flow: 85, pressureLoss: 0.44 },
            { flow: 90, pressureLoss: 0.49 },
            { flow: 95, pressureLoss: 0.54 },
            { flow: 100, pressureLoss: 0.6 },
            { flow: 110, pressureLoss: 0.71 },
            { flow: 120, pressureLoss: 0.84 },
            { flow: 130, pressureLoss: 0.97 },
            { flow: 140, pressureLoss: 1.11 },
            { flow: 150, pressureLoss: 1.26 },
            { flow: 160, pressureLoss: 1.42 },
            { flow: 170, pressureLoss: 1.59 },
            { flow: 180, pressureLoss: 1.77 },
            { flow: 190, pressureLoss: 1.96 },
            { flow: 200, pressureLoss: 2.15 },
            { flow: 220, pressureLoss: 2.57 },
            { flow: 240, pressureLoss: 3.02 },
            { flow: 260, pressureLoss: 3.5 },
            { flow: 280, pressureLoss: 4.01 },
            { flow: 300, pressureLoss: 4.56 },
        ],
        '40mm': [
            // 1.5 นิ้ว
            { flow: 24, pressureLoss: 0.02 },
            { flow: 26, pressureLoss: 0.02 },
            { flow: 28, pressureLoss: 0.02 },
            { flow: 30, pressureLoss: 0.03 },
            { flow: 32, pressureLoss: 0.04 },
            { flow: 34, pressureLoss: 0.04 },
            { flow: 36, pressureLoss: 0.04 },
            { flow: 38, pressureLoss: 0.05 },
            { flow: 40, pressureLoss: 0.05 },
            { flow: 42, pressureLoss: 0.06 },
            { flow: 44, pressureLoss: 0.06 },
            { flow: 46, pressureLoss: 0.07 },
            { flow: 48, pressureLoss: 0.08 },
            { flow: 50, pressureLoss: 0.08 },
            { flow: 55, pressureLoss: 0.1 },
            { flow: 60, pressureLoss: 0.12 },
            { flow: 65, pressureLoss: 0.13 },
            { flow: 70, pressureLoss: 0.15 },
            { flow: 75, pressureLoss: 0.17 },
            { flow: 80, pressureLoss: 0.2 },
            { flow: 85, pressureLoss: 0.22 },
            { flow: 90, pressureLoss: 0.24 },
            { flow: 95, pressureLoss: 0.27 },
            { flow: 100, pressureLoss: 0.3 },
            { flow: 110, pressureLoss: 0.35 },
            { flow: 120, pressureLoss: 0.42 },
            { flow: 130, pressureLoss: 0.48 },
            { flow: 140, pressureLoss: 0.55 },
            { flow: 150, pressureLoss: 0.63 },
            { flow: 160, pressureLoss: 0.71 },
            { flow: 170, pressureLoss: 0.79 },
            { flow: 180, pressureLoss: 0.88 },
            { flow: 190, pressureLoss: 0.98 },
            { flow: 200, pressureLoss: 1.07 },
            { flow: 220, pressureLoss: 1.28 },
            { flow: 240, pressureLoss: 1.5 },
            { flow: 260, pressureLoss: 1.74 },
            { flow: 280, pressureLoss: 2.0 },
            { flow: 300, pressureLoss: 2.27 },
            { flow: 320, pressureLoss: 2.56 },
            { flow: 340, pressureLoss: 2.87 },
            { flow: 360, pressureLoss: 3.19 },
            { flow: 380, pressureLoss: 3.52 },
            { flow: 400, pressureLoss: 3.87 },
            { flow: 420, pressureLoss: 4.24 },
            { flow: 440, pressureLoss: 4.62 },
            { flow: 460, pressureLoss: 5.02 },
        ],
        '55mm': [
            // 2 นิ้ว
            { flow: 36, pressureLoss: 0.01 },
            { flow: 38, pressureLoss: 0.02 },
            { flow: 40, pressureLoss: 0.02 },
            { flow: 42, pressureLoss: 0.02 },
            { flow: 44, pressureLoss: 0.02 },
            { flow: 46, pressureLoss: 0.02 },
            { flow: 48, pressureLoss: 0.03 },
            { flow: 50, pressureLoss: 0.03 },
            { flow: 55, pressureLoss: 0.03 },
            { flow: 60, pressureLoss: 0.04 },
            { flow: 65, pressureLoss: 0.04 },
            { flow: 70, pressureLoss: 0.05 },
            { flow: 75, pressureLoss: 0.06 },
            { flow: 80, pressureLoss: 0.07 },
            { flow: 85, pressureLoss: 0.07 },
            { flow: 90, pressureLoss: 0.08 },
            { flow: 95, pressureLoss: 0.09 },
            { flow: 100, pressureLoss: 0.1 },
            { flow: 110, pressureLoss: 0.12 },
            { flow: 120, pressureLoss: 0.14 },
            { flow: 130, pressureLoss: 0.16 },
            { flow: 140, pressureLoss: 0.18 },
            { flow: 150, pressureLoss: 0.21 },
            { flow: 160, pressureLoss: 0.23 },
            { flow: 170, pressureLoss: 0.26 },
            { flow: 180, pressureLoss: 0.29 },
            { flow: 190, pressureLoss: 0.33 },
            { flow: 200, pressureLoss: 0.36 },
            { flow: 220, pressureLoss: 0.43 },
            { flow: 240, pressureLoss: 0.5 },
            { flow: 260, pressureLoss: 0.58 },
            { flow: 280, pressureLoss: 0.67 },
            { flow: 300, pressureLoss: 0.76 },
            { flow: 320, pressureLoss: 0.85 },
            { flow: 340, pressureLoss: 0.96 },
            { flow: 360, pressureLoss: 1.06 },
            { flow: 380, pressureLoss: 1.17 },
            { flow: 400, pressureLoss: 1.29 },
            { flow: 420, pressureLoss: 1.41 },
            { flow: 440, pressureLoss: 1.54 },
            { flow: 460, pressureLoss: 1.67 },
            { flow: 480, pressureLoss: 1.95 },
            { flow: 500, pressureLoss: 2.23 },
            { flow: 520, pressureLoss: 2.23 },
            { flow: 600, pressureLoss: 2.73 },
            { flow: 650, pressureLoss: 3.17 },
            { flow: 700, pressureLoss: 3.64 },
            { flow: 750, pressureLoss: 4.13 },
            { flow: 800, pressureLoss: 4.66 },
            { flow: 850, pressureLoss: 5.21 },
        ],
        '65mm': [
            // 2.5 นิ้ว
            { flow: 65, pressureLoss: 0.01 },
            { flow: 70, pressureLoss: 0.02 },
            { flow: 75, pressureLoss: 0.02 },
            { flow: 80, pressureLoss: 0.02 },
            { flow: 85, pressureLoss: 0.02 },
            { flow: 90, pressureLoss: 0.03 },
            { flow: 95, pressureLoss: 0.03 },
            { flow: 100, pressureLoss: 0.03 },
            { flow: 110, pressureLoss: 0.04 },
            { flow: 120, pressureLoss: 0.04 },
            { flow: 130, pressureLoss: 0.05 },
            { flow: 140, pressureLoss: 0.06 },
            { flow: 150, pressureLoss: 0.07 },
            { flow: 160, pressureLoss: 0.07 },
            { flow: 170, pressureLoss: 0.08 },
            { flow: 180, pressureLoss: 0.09 },
            { flow: 190, pressureLoss: 0.1 },
            { flow: 200, pressureLoss: 0.11 },
            { flow: 220, pressureLoss: 0.13 },
            { flow: 240, pressureLoss: 0.16 },
            { flow: 260, pressureLoss: 0.18 },
            { flow: 280, pressureLoss: 0.21 },
            { flow: 300, pressureLoss: 0.24 },
            { flow: 320, pressureLoss: 0.27 },
            { flow: 340, pressureLoss: 0.3 },
            { flow: 360, pressureLoss: 0.33 },
            { flow: 380, pressureLoss: 0.37 },
            { flow: 400, pressureLoss: 0.4 },
            { flow: 420, pressureLoss: 0.44 },
            { flow: 440, pressureLoss: 0.48 },
            { flow: 460, pressureLoss: 0.53 },
            { flow: 480, pressureLoss: 0.57 },
            { flow: 500, pressureLoss: 0.61 },
            { flow: 520, pressureLoss: 0.72 },
            { flow: 600, pressureLoss: 0.86 },
            { flow: 650, pressureLoss: 0.99 },
            { flow: 700, pressureLoss: 1.14 },
            { flow: 750, pressureLoss: 1.3 },
            { flow: 800, pressureLoss: 1.46 },
            { flow: 850, pressureLoss: 1.63 },
            { flow: 900, pressureLoss: 1.81 },
            { flow: 950, pressureLoss: 2.01 },
            { flow: 1000, pressureLoss: 2.21 },
            { flow: 1050, pressureLoss: 2.41 },
            { flow: 1100, pressureLoss: 2.63 },
            { flow: 1150, pressureLoss: 2.86 },
            { flow: 1200, pressureLoss: 3.09 },
            { flow: 1250, pressureLoss: 3.33 },
            { flow: 1300, pressureLoss: 3.59 },
            { flow: 1350, pressureLoss: 3.84 },
            { flow: 1400, pressureLoss: 4.11 },
            { flow: 1450, pressureLoss: 4.39 },
            { flow: 1500, pressureLoss: 4.67 },
            { flow: 1550, pressureLoss: 4.97 },
        ],
        '80mm': [
            // 3 นิ้ว
            { flow: 100, pressureLoss: 0.01 },
            { flow: 110, pressureLoss: 0.02 },
            { flow: 120, pressureLoss: 0.02 },
            { flow: 130, pressureLoss: 0.02 },
            { flow: 140, pressureLoss: 0.03 },
            { flow: 150, pressureLoss: 0.03 },
            { flow: 160, pressureLoss: 0.03 },
            { flow: 170, pressureLoss: 0.04 },
            { flow: 190, pressureLoss: 0.05 },
            { flow: 200, pressureLoss: 0.05 },
            { flow: 220, pressureLoss: 0.06 },
            { flow: 240, pressureLoss: 0.07 },
            { flow: 260, pressureLoss: 0.08 },
            { flow: 280, pressureLoss: 0.1 },
            { flow: 300, pressureLoss: 0.11 },
            { flow: 320, pressureLoss: 0.12 },
            { flow: 340, pressureLoss: 0.14 },
            { flow: 360, pressureLoss: 0.15 },
            { flow: 380, pressureLoss: 0.17 },
            { flow: 400, pressureLoss: 0.19 },
            { flow: 420, pressureLoss: 0.2 },
            { flow: 440, pressureLoss: 0.22 },
            { flow: 460, pressureLoss: 0.24 },
            { flow: 480, pressureLoss: 0.26 },
            { flow: 500, pressureLoss: 0.28 },
            { flow: 520, pressureLoss: 0.34 },
            { flow: 600, pressureLoss: 0.39 },
            { flow: 650, pressureLoss: 0.46 },
            { flow: 700, pressureLoss: 0.52 },
            { flow: 750, pressureLoss: 0.6 },
            { flow: 800, pressureLoss: 0.67 },
            { flow: 850, pressureLoss: 0.75 },
            { flow: 900, pressureLoss: 0.83 },
            { flow: 950, pressureLoss: 0.92 },
            { flow: 1000, pressureLoss: 1.01 },
            { flow: 1050, pressureLoss: 1.11 },
            { flow: 1100, pressureLoss: 1.21 },
            { flow: 1150, pressureLoss: 1.31 },
            { flow: 1200, pressureLoss: 1.42 },
            { flow: 1250, pressureLoss: 1.53 },
            { flow: 1300, pressureLoss: 1.65 },
            { flow: 1350, pressureLoss: 1.77 },
            { flow: 1600, pressureLoss: 2.43 },
            { flow: 1650, pressureLoss: 2.56 },
            { flow: 1700, pressureLoss: 2.71 },
            { flow: 1750, pressureLoss: 2.86 },
            { flow: 1800, pressureLoss: 3.01 },
            { flow: 1850, pressureLoss: 3.17 },
            { flow: 1900, pressureLoss: 3.33 },
            { flow: 1950, pressureLoss: 3.49 },
            { flow: 2000, pressureLoss: 3.66 },
            { flow: 2050, pressureLoss: 3.83 },
            { flow: 2100, pressureLoss: 4.01 },
            { flow: 2150, pressureLoss: 4.18 },
            { flow: 2200, pressureLoss: 4.37 },
            { flow: 2250, pressureLoss: 4.55 },
            { flow: 2300, pressureLoss: 4.74 },
            { flow: 2350, pressureLoss: 4.93 },
        ],
        '100mm': [
            // 4 นิ้ว
            { flow: 190, pressureLoss: 0.01 },
            { flow: 200, pressureLoss: 0.02 },
            { flow: 220, pressureLoss: 0.03 },
            { flow: 240, pressureLoss: 0.02 },
            { flow: 260, pressureLoss: 0.03 },
            { flow: 280, pressureLoss: 0.03 },
            { flow: 300, pressureLoss: 0.03 },
            { flow: 320, pressureLoss: 0.04 },
            { flow: 340, pressureLoss: 0.04 },
            { flow: 360, pressureLoss: 0.05 },
            { flow: 380, pressureLoss: 0.05 },
            { flow: 400, pressureLoss: 0.06 },
            { flow: 420, pressureLoss: 0.06 },
            { flow: 440, pressureLoss: 0.07 },
            { flow: 460, pressureLoss: 0.08 },
            { flow: 480, pressureLoss: 0.08 },
            { flow: 500, pressureLoss: 0.08 },
            { flow: 520, pressureLoss: 0.1 },
            { flow: 600, pressureLoss: 0.12 },
            { flow: 650, pressureLoss: 0.14 },
            { flow: 700, pressureLoss: 0.16 },
            { flow: 750, pressureLoss: 0.18 },
            { flow: 800, pressureLoss: 0.2 },
            { flow: 850, pressureLoss: 0.22 },
            { flow: 900, pressureLoss: 0.25 },
            { flow: 950, pressureLoss: 0.28 },
            { flow: 1000, pressureLoss: 0.3 },
            { flow: 1050, pressureLoss: 0.33 },
            { flow: 1100, pressureLoss: 0.36 },
            { flow: 1150, pressureLoss: 0.39 },
            { flow: 1200, pressureLoss: 0.43 },
            { flow: 1250, pressureLoss: 0.46 },
            { flow: 1300, pressureLoss: 0.49 },
            { flow: 1350, pressureLoss: 0.53 },
            { flow: 1400, pressureLoss: 0.57 },
            { flow: 1450, pressureLoss: 0.6 },
            { flow: 1500, pressureLoss: 0.64 },
            { flow: 1550, pressureLoss: 0.68 },
            { flow: 1600, pressureLoss: 0.73 },
            { flow: 1650, pressureLoss: 0.77 },
            { flow: 1700, pressureLoss: 0.81 },
            { flow: 1750, pressureLoss: 0.86 },
            { flow: 1800, pressureLoss: 0.9 },
            { flow: 1850, pressureLoss: 0.95 },
            { flow: 1900, pressureLoss: 1.0 },
            { flow: 1950, pressureLoss: 1.05 },
            { flow: 2000, pressureLoss: 1.1 },
            { flow: 2050, pressureLoss: 1.15 },
            { flow: 2100, pressureLoss: 1.2 },
            { flow: 2150, pressureLoss: 1.26 },
            { flow: 2200, pressureLoss: 1.31 },
            { flow: 2250, pressureLoss: 1.36 },
            { flow: 2300, pressureLoss: 1.42 },
            { flow: 2350, pressureLoss: 1.48 },
            { flow: 2400, pressureLoss: 1.54 },
            { flow: 2450, pressureLoss: 1.6 },
            { flow: 2500, pressureLoss: 1.66 },
            { flow: 2550, pressureLoss: 1.72 },
            { flow: 2600, pressureLoss: 1.78 },
            { flow: 2650, pressureLoss: 1.85 },
            { flow: 2700, pressureLoss: 1.91 },
            { flow: 2750, pressureLoss: 1.98 },
            { flow: 2800, pressureLoss: 2.05 },
            { flow: 2850, pressureLoss: 2.11 },
            { flow: 2900, pressureLoss: 2.18 },
            { flow: 2950, pressureLoss: 2.29 },
            { flow: 3000, pressureLoss: 2.33 },
            { flow: 3050, pressureLoss: 2.3 },
            { flow: 3100, pressureLoss: 2.47 },
        ],
        '125mm': [
            // 5 นิ้ว
            { flow: 320, pressureLoss: 0.01 },
            { flow: 340, pressureLoss: 0.02 },
            { flow: 360, pressureLoss: 0.02 },
            { flow: 380, pressureLoss: 0.03 },
            { flow: 400, pressureLoss: 0.03 },
            { flow: 420, pressureLoss: 0.02 },
            { flow: 440, pressureLoss: 0.03 },
            { flow: 460, pressureLoss: 0.03 },
            { flow: 480, pressureLoss: 0.03 },
            { flow: 500, pressureLoss: 0.03 },
            { flow: 520, pressureLoss: 0.04 },
            { flow: 600, pressureLoss: 0.04 },
            { flow: 650, pressureLoss: 0.05 },
            { flow: 700, pressureLoss: 0.06 },
            { flow: 750, pressureLoss: 0.07 },
            { flow: 800, pressureLoss: 0.07 },
            { flow: 850, pressureLoss: 0.08 },
            { flow: 900, pressureLoss: 0.09 },
            { flow: 950, pressureLoss: 0.1 },
            { flow: 1000, pressureLoss: 0.11 },
            { flow: 1050, pressureLoss: 0.12 },
            { flow: 1100, pressureLoss: 0.13 },
            { flow: 1150, pressureLoss: 0.14 },
            { flow: 1200, pressureLoss: 0.16 },
            { flow: 1250, pressureLoss: 0.17 },
            { flow: 1300, pressureLoss: 0.18 },
            { flow: 1350, pressureLoss: 0.19 },
            { flow: 1400, pressureLoss: 0.31 },
            { flow: 1450, pressureLoss: 0.32 },
            { flow: 1500, pressureLoss: 0.34 },
            { flow: 1550, pressureLoss: 0.35 },
            { flow: 1600, pressureLoss: 0.37 },
            { flow: 1650, pressureLoss: 0.38 },
            { flow: 1700, pressureLoss: 0.39 },
            { flow: 1750, pressureLoss: 0.41 },
            { flow: 1800, pressureLoss: 0.43 },
            { flow: 1850, pressureLoss: 0.44 },
            { flow: 1900, pressureLoss: 0.46 },
            { flow: 1950, pressureLoss: 0.48 },
            { flow: 2000, pressureLoss: 0.49 },
            { flow: 2050, pressureLoss: 0.51 },
            { flow: 2100, pressureLoss: 0.53 },
            { flow: 2150, pressureLoss: 0.54 },
            { flow: 2200, pressureLoss: 0.56 },
            { flow: 2250, pressureLoss: 0.58 },
            { flow: 2300, pressureLoss: 0.6 },
            { flow: 2350, pressureLoss: 0.62 },
            { flow: 2400, pressureLoss: 0.64 },
            { flow: 2450, pressureLoss: 0.66 },
            { flow: 2500, pressureLoss: 0.68 },
            { flow: 2550, pressureLoss: 0.7 },
            { flow: 2600, pressureLoss: 0.72 },
            { flow: 2650, pressureLoss: 0.74 },
            { flow: 2700, pressureLoss: 0.76 },
            { flow: 2750, pressureLoss: 0.78 },
            { flow: 2800, pressureLoss: 0.8 },
            { flow: 2850, pressureLoss: 0.82 },
            { flow: 2900, pressureLoss: 0.84 },
            { flow: 2950, pressureLoss: 0.86 },
            { flow: 3000, pressureLoss: 0.88 },
            { flow: 3050, pressureLoss: 2.3 },
            { flow: 3100, pressureLoss: 0.91 },
        ],
    };
}

// PVC Class 8.5 Data
export function getPVC_Class85_Data(): PipeSizeData {
    return {
        '18mm': [
            // 0.5 นิ้ว
            { flow: 1, pressureLoss: 0.01 },
            { flow: 2, pressureLoss: 0.02 },
            { flow: 3, pressureLoss: 0.04 },
            { flow: 4, pressureLoss: 0.07 },
            { flow: 5, pressureLoss: 0.1 },
            { flow: 6, pressureLoss: 0.14 },
            { flow: 7, pressureLoss: 0.19 },
            { flow: 8, pressureLoss: 0.24 },
            { flow: 9, pressureLoss: 0.3 },
            { flow: 10, pressureLoss: 0.36 },
            { flow: 12, pressureLoss: 0.51 },
            { flow: 14, pressureLoss: 0.67 },
            { flow: 16, pressureLoss: 0.86 },
            { flow: 18, pressureLoss: 1.07 },
            { flow: 20, pressureLoss: 1.3 },
            { flow: 22, pressureLoss: 1.55 },
            { flow: 24, pressureLoss: 1.82 },
            { flow: 26, pressureLoss: 2.12 },
            { flow: 28, pressureLoss: 2.43 },
            { flow: 30, pressureLoss: 2.76 },
            { flow: 32, pressureLoss: 3.11 },
            { flow: 34, pressureLoss: 3.48 },
            { flow: 36, pressureLoss: 3.87 },
            { flow: 38, pressureLoss: 4.27 },
            { flow: 40, pressureLoss: 4.7 },
            { flow: 42, pressureLoss: 5.14 },
        ],
        '20mm': [
            // 0.75 นิ้ว
            { flow: 2, pressureLoss: 0.01 },
            { flow: 3, pressureLoss: 0.02 },
            { flow: 4, pressureLoss: 0.04 },
            { flow: 5, pressureLoss: 0.06 },
            { flow: 6, pressureLoss: 0.08 },
            { flow: 7, pressureLoss: 0.11 },
            { flow: 8, pressureLoss: 0.14 },
            { flow: 9, pressureLoss: 0.18 },
            { flow: 10, pressureLoss: 0.22 },
            { flow: 12, pressureLoss: 0.3 },
            { flow: 14, pressureLoss: 0.4 },
            { flow: 16, pressureLoss: 0.52 },
            { flow: 18, pressureLoss: 0.64 },
            { flow: 20, pressureLoss: 0.78 },
            { flow: 22, pressureLoss: 0.93 },
            { flow: 24, pressureLoss: 1.09 },
            { flow: 26, pressureLoss: 1.27 },
            { flow: 28, pressureLoss: 1.45 },
            { flow: 30, pressureLoss: 1.65 },
            { flow: 32, pressureLoss: 1.86 },
            { flow: 34, pressureLoss: 2.08 },
            { flow: 36, pressureLoss: 2.32 },
            { flow: 38, pressureLoss: 2.56 },
            { flow: 40, pressureLoss: 2.81 },
            { flow: 42, pressureLoss: 3.08 },
            { flow: 44, pressureLoss: 3.36 },
            { flow: 46, pressureLoss: 3.65 },
            { flow: 48, pressureLoss: 3.95 },
        ],
        '25mm': [
            // 1 นิ้ว
            { flow: 8, pressureLoss: 0.01 },
            { flow: 9, pressureLoss: 0.02 },
            { flow: 10, pressureLoss: 0.03 },
            { flow: 12, pressureLoss: 0.03 },
            { flow: 14, pressureLoss: 0.04 },
            { flow: 16, pressureLoss: 0.05 },
            { flow: 18, pressureLoss: 0.07 },
            { flow: 20, pressureLoss: 0.08 },
            { flow: 22, pressureLoss: 0.09 },
            { flow: 24, pressureLoss: 0.11 },
            { flow: 26, pressureLoss: 0.13 },
            { flow: 28, pressureLoss: 0.15 },
            { flow: 30, pressureLoss: 0.17 },
            { flow: 32, pressureLoss: 0.19 },
            { flow: 34, pressureLoss: 0.21 },
            { flow: 36, pressureLoss: 0.24 },
            { flow: 38, pressureLoss: 0.26 },
            { flow: 40, pressureLoss: 0.29 },
            { flow: 42, pressureLoss: 0.31 },
            { flow: 44, pressureLoss: 0.34 },
            { flow: 46, pressureLoss: 0.37 },
            { flow: 48, pressureLoss: 0.4 },
            { flow: 50, pressureLoss: 0.43 },
            { flow: 55, pressureLoss: 0.52 },
            { flow: 60, pressureLoss: 0.61 },
            { flow: 65, pressureLoss: 0.7 },
            { flow: 70, pressureLoss: 0.81 },
            { flow: 75, pressureLoss: 0.92 },
            { flow: 80, pressureLoss: 1.03 },
            { flow: 85, pressureLoss: 1.15 },
            { flow: 90, pressureLoss: 1.28 },
            { flow: 95, pressureLoss: 1.42 },
            { flow: 100, pressureLoss: 1.56 },
            { flow: 110, pressureLoss: 1.86 },
            { flow: 120, pressureLoss: 2.19 },
            { flow: 130, pressureLoss: 2.54 },
            { flow: 140, pressureLoss: 2.91 },
            { flow: 150, pressureLoss: 3.31 },
            { flow: 160, pressureLoss: 3.73 },
            { flow: 170, pressureLoss: 4.17 },
            { flow: 180, pressureLoss: 4.63 },
            { flow: 190, pressureLoss: 5.12 },
        ],
        '35mm': [
            // 1.25 นิ้ว
            { flow: 12, pressureLoss: 0.01 },
            { flow: 14, pressureLoss: 0.02 },
            { flow: 16, pressureLoss: 0.02 },
            { flow: 18, pressureLoss: 0.03 },
            { flow: 20, pressureLoss: 0.03 },
            { flow: 22, pressureLoss: 0.04 },
            { flow: 24, pressureLoss: 0.05 },
            { flow: 26, pressureLoss: 0.06 },
            { flow: 28, pressureLoss: 0.06 },
            { flow: 30, pressureLoss: 0.07 },
            { flow: 32, pressureLoss: 0.08 },
            { flow: 34, pressureLoss: 0.09 },
            { flow: 36, pressureLoss: 0.1 },
            { flow: 38, pressureLoss: 0.11 },
            { flow: 40, pressureLoss: 0.12 },
            { flow: 42, pressureLoss: 0.14 },
            { flow: 44, pressureLoss: 0.15 },
            { flow: 46, pressureLoss: 0.16 },
            { flow: 48, pressureLoss: 0.17 },
            { flow: 50, pressureLoss: 0.19 },
            { flow: 55, pressureLoss: 0.22 },
            { flow: 60, pressureLoss: 0.26 },
            { flow: 65, pressureLoss: 0.3 },
            { flow: 70, pressureLoss: 0.35 },
            { flow: 75, pressureLoss: 0.4 },
            { flow: 80, pressureLoss: 0.45 },
            { flow: 85, pressureLoss: 0.5 },
            { flow: 90, pressureLoss: 0.56 },
            { flow: 95, pressureLoss: 0.62 },
            { flow: 100, pressureLoss: 0.68 },
            { flow: 110, pressureLoss: 0.81 },
            { flow: 120, pressureLoss: 0.95 },
            { flow: 130, pressureLoss: 1.1 },
            { flow: 140, pressureLoss: 1.26 },
            { flow: 150, pressureLoss: 1.43 },
            { flow: 160, pressureLoss: 1.62 },
            { flow: 170, pressureLoss: 1.81 },
            { flow: 180, pressureLoss: 2.01 },
            { flow: 190, pressureLoss: 2.22 },
            { flow: 200, pressureLoss: 2.44 },
            { flow: 220, pressureLoss: 2.91 },
            { flow: 240, pressureLoss: 3.42 },
            { flow: 260, pressureLoss: 3.97 },
            { flow: 280, pressureLoss: 4.55 },
            { flow: 300, pressureLoss: 5.17 },
        ],
        '40mm': [
            // 1.5 นิ้ว
            { flow: 18, pressureLoss: 0.01 },
            { flow: 20, pressureLoss: 0.02 },
            { flow: 22, pressureLoss: 0.02 },
            { flow: 24, pressureLoss: 0.02 },
            { flow: 26, pressureLoss: 0.03 },
            { flow: 28, pressureLoss: 0.03 },
            { flow: 30, pressureLoss: 0.04 },
            { flow: 32, pressureLoss: 0.04 },
            { flow: 34, pressureLoss: 0.05 },
            { flow: 36, pressureLoss: 0.05 },
            { flow: 38, pressureLoss: 0.06 },
            { flow: 40, pressureLoss: 0.06 },
            { flow: 42, pressureLoss: 0.07 },
            { flow: 44, pressureLoss: 0.08 },
            { flow: 46, pressureLoss: 0.08 },
            { flow: 48, pressureLoss: 0.09 },
            { flow: 50, pressureLoss: 0.1 },
            { flow: 55, pressureLoss: 0.12 },
            { flow: 60, pressureLoss: 0.14 },
            { flow: 65, pressureLoss: 0.16 },
            { flow: 70, pressureLoss: 0.18 },
            { flow: 75, pressureLoss: 0.21 },
            { flow: 80, pressureLoss: 0.23 },
            { flow: 85, pressureLoss: 0.26 },
            { flow: 90, pressureLoss: 0.29 },
            { flow: 95, pressureLoss: 0.32 },
            { flow: 100, pressureLoss: 0.35 },
            { flow: 110, pressureLoss: 0.42 },
            { flow: 120, pressureLoss: 0.5 },
            { flow: 130, pressureLoss: 0.58 },
            { flow: 140, pressureLoss: 0.66 },
            { flow: 150, pressureLoss: 0.75 },
            { flow: 160, pressureLoss: 0.85 },
            { flow: 170, pressureLoss: 0.95 },
            { flow: 180, pressureLoss: 1.05 },
            { flow: 190, pressureLoss: 1.16 },
            { flow: 200, pressureLoss: 1.28 },
            { flow: 220, pressureLoss: 1.53 },
            { flow: 240, pressureLoss: 1.79 },
            { flow: 260, pressureLoss: 2.08 },
            { flow: 280, pressureLoss: 2.39 },
            { flow: 300, pressureLoss: 2.71 },
            { flow: 320, pressureLoss: 3.05 },
            { flow: 340, pressureLoss: 3.42 },
            { flow: 360, pressureLoss: 3.8 },
            { flow: 380, pressureLoss: 4.2 },
            { flow: 400, pressureLoss: 4.62 },
            { flow: 420, pressureLoss: 5.05 },
        ],
        '55mm': [
            // 2 นิ้ว
            { flow: 32, pressureLoss: 0.01 },
            { flow: 34, pressureLoss: 0.02 },
            { flow: 36, pressureLoss: 0.02 },
            { flow: 38, pressureLoss: 0.02 },
            { flow: 40, pressureLoss: 0.02 },
            { flow: 42, pressureLoss: 0.02 },
            { flow: 44, pressureLoss: 0.03 },
            { flow: 46, pressureLoss: 0.03 },
            { flow: 48, pressureLoss: 0.03 },
            { flow: 50, pressureLoss: 0.03 },
            { flow: 55, pressureLoss: 0.04 },
            { flow: 60, pressureLoss: 0.05 },
            { flow: 65, pressureLoss: 0.05 },
            { flow: 70, pressureLoss: 0.06 },
            { flow: 75, pressureLoss: 0.07 },
            { flow: 80, pressureLoss: 0.08 },
            { flow: 85, pressureLoss: 0.09 },
            { flow: 90, pressureLoss: 0.1 },
            { flow: 95, pressureLoss: 0.11 },
            { flow: 100, pressureLoss: 0.12 },
            { flow: 110, pressureLoss: 0.14 },
            { flow: 120, pressureLoss: 0.17 },
            { flow: 130, pressureLoss: 0.2 },
            { flow: 140, pressureLoss: 0.22 },
            { flow: 150, pressureLoss: 0.25 },
            { flow: 160, pressureLoss: 0.29 },
            { flow: 170, pressureLoss: 0.32 },
            { flow: 180, pressureLoss: 0.36 },
            { flow: 190, pressureLoss: 0.39 },
            { flow: 200, pressureLoss: 0.43 },
            { flow: 220, pressureLoss: 0.52 },
            { flow: 240, pressureLoss: 0.61 },
            { flow: 260, pressureLoss: 0.71 },
            { flow: 280, pressureLoss: 0.81 },
            { flow: 300, pressureLoss: 0.92 },
            { flow: 320, pressureLoss: 1.04 },
            { flow: 340, pressureLoss: 1.16 },
            { flow: 360, pressureLoss: 1.29 },
            { flow: 380, pressureLoss: 1.42 },
            { flow: 400, pressureLoss: 1.57 },
            { flow: 420, pressureLoss: 1.71 },
            { flow: 440, pressureLoss: 1.87 },
            { flow: 460, pressureLoss: 2.03 },
            { flow: 480, pressureLoss: 2.2 },
            { flow: 500, pressureLoss: 2.37 },
            { flow: 520, pressureLoss: 2.82 },
            { flow: 600, pressureLoss: 3.32 },
            { flow: 650, pressureLoss: 3.85 },
            { flow: 700, pressureLoss: 4.42 },
            { flow: 750, pressureLoss: 5.02 },
        ],
        '65mm': [
            // 2.5 นิ้ว
            { flow: 60, pressureLoss: 0.01 },
            { flow: 65, pressureLoss: 0.02 },
            { flow: 70, pressureLoss: 0.02 },
            { flow: 75, pressureLoss: 0.02 },
            { flow: 80, pressureLoss: 0.02 },
            { flow: 85, pressureLoss: 0.03 },
            { flow: 90, pressureLoss: 0.03 },
            { flow: 95, pressureLoss: 0.03 },
            { flow: 100, pressureLoss: 0.04 },
            { flow: 110, pressureLoss: 0.04 },
            { flow: 120, pressureLoss: 0.05 },
            { flow: 130, pressureLoss: 0.06 },
            { flow: 140, pressureLoss: 0.07 },
            { flow: 150, pressureLoss: 0.08 },
            { flow: 160, pressureLoss: 0.09 },
            { flow: 170, pressureLoss: 0.1 },
            { flow: 180, pressureLoss: 0.11 },
            { flow: 190, pressureLoss: 0.12 },
            { flow: 200, pressureLoss: 0.13 },
            { flow: 220, pressureLoss: 0.16 },
            { flow: 240, pressureLoss: 0.19 },
            { flow: 260, pressureLoss: 0.22 },
            { flow: 280, pressureLoss: 0.25 },
            { flow: 300, pressureLoss: 0.28 },
            { flow: 320, pressureLoss: 0.32 },
            { flow: 340, pressureLoss: 0.36 },
            { flow: 360, pressureLoss: 0.4 },
            { flow: 380, pressureLoss: 0.44 },
            { flow: 400, pressureLoss: 0.48 },
            { flow: 420, pressureLoss: 0.53 },
            { flow: 440, pressureLoss: 0.58 },
            { flow: 460, pressureLoss: 0.63 },
            { flow: 480, pressureLoss: 0.68 },
            { flow: 500, pressureLoss: 0.73 },
            { flow: 550, pressureLoss: 0.87 },
            { flow: 600, pressureLoss: 1.03 },
            { flow: 650, pressureLoss: 1.19 },
            { flow: 700, pressureLoss: 1.36 },
            { flow: 750, pressureLoss: 1.55 },
            { flow: 800, pressureLoss: 1.75 },
            { flow: 850, pressureLoss: 1.95 },
            { flow: 900, pressureLoss: 2.17 },
            { flow: 950, pressureLoss: 2.4 },
            { flow: 1000, pressureLoss: 2.64 },
            { flow: 1050, pressureLoss: 2.89 },
            { flow: 1100, pressureLoss: 3.15 },
            { flow: 1150, pressureLoss: 3.42 },
            { flow: 1200, pressureLoss: 3.7 },
            { flow: 1250, pressureLoss: 3.99 },
            { flow: 1300, pressureLoss: 4.29 },
            { flow: 1350, pressureLoss: 4.6 },
            { flow: 1400, pressureLoss: 4.92 },
        ],
        '80mm': [
            // 3 นิ้ว
            { flow: 90, pressureLoss: 0.01 },
            { flow: 95, pressureLoss: 0.02 },
            { flow: 100, pressureLoss: 0.02 },
            { flow: 110, pressureLoss: 0.02 },
            { flow: 120, pressureLoss: 0.02 },
            { flow: 130, pressureLoss: 0.03 },
            { flow: 140, pressureLoss: 0.03 },
            { flow: 150, pressureLoss: 0.04 },
            { flow: 160, pressureLoss: 0.04 },
            { flow: 170, pressureLoss: 0.05 },
            { flow: 180, pressureLoss: 0.05 },
            { flow: 190, pressureLoss: 0.06 },
            { flow: 200, pressureLoss: 0.06 },
            { flow: 220, pressureLoss: 0.07 },
            { flow: 240, pressureLoss: 0.09 },
            { flow: 260, pressureLoss: 0.1 },
            { flow: 280, pressureLoss: 0.12 },
            { flow: 300, pressureLoss: 0.13 },
            { flow: 320, pressureLoss: 0.15 },
            { flow: 340, pressureLoss: 0.17 },
            { flow: 360, pressureLoss: 0.18 },
            { flow: 380, pressureLoss: 0.2 },
            { flow: 400, pressureLoss: 0.23 },
            { flow: 420, pressureLoss: 0.25 },
            { flow: 440, pressureLoss: 0.27 },
            { flow: 460, pressureLoss: 0.29 },
            { flow: 480, pressureLoss: 0.31 },
            { flow: 500, pressureLoss: 0.34 },
            { flow: 550, pressureLoss: 0.4 },
            { flow: 600, pressureLoss: 0.48 },
            { flow: 650, pressureLoss: 0.55 },
            { flow: 700, pressureLoss: 0.63 },
            { flow: 750, pressureLoss: 0.72 },
            { flow: 800, pressureLoss: 0.81 },
            { flow: 850, pressureLoss: 0.91 },
            { flow: 900, pressureLoss: 1.01 },
            { flow: 950, pressureLoss: 1.11 },
            { flow: 1000, pressureLoss: 1.22 },
            { flow: 1050, pressureLoss: 1.34 },
            { flow: 1100, pressureLoss: 1.46 },
            { flow: 1150, pressureLoss: 1.59 },
            { flow: 1200, pressureLoss: 1.72 },
            { flow: 1250, pressureLoss: 1.85 },
            { flow: 1300, pressureLoss: 1.99 },
            { flow: 1350, pressureLoss: 2.14 },
            { flow: 1400, pressureLoss: 2.38 },
            { flow: 1450, pressureLoss: 2.44 },
            { flow: 1500, pressureLoss: 2.6 },
            { flow: 1550, pressureLoss: 2.76 },
            { flow: 1600, pressureLoss: 2.92 },
            { flow: 1650, pressureLoss: 3.1 },
            { flow: 1700, pressureLoss: 3.27 },
            { flow: 1750, pressureLoss: 3.45 },
            { flow: 1800, pressureLoss: 3.64 },
            { flow: 1850, pressureLoss: 3.83 },
            { flow: 1900, pressureLoss: 4.02 },
            { flow: 1950, pressureLoss: 4.22 },
            { flow: 2000, pressureLoss: 4.42 },
            { flow: 2050, pressureLoss: 4.63 },
            { flow: 2100, pressureLoss: 4.84 },
            { flow: 2150, pressureLoss: 5.06 },
        ],
        '100mm': [
            // 4 นิ้ว
            { flow: 170, pressureLoss: 0.01 },
            { flow: 180, pressureLoss: 0.02 },
            { flow: 190, pressureLoss: 0.02 },
            { flow: 200, pressureLoss: 0.02 },
            { flow: 220, pressureLoss: 0.02 },
            { flow: 240, pressureLoss: 0.03 },
            { flow: 260, pressureLoss: 0.03 },
            { flow: 280, pressureLoss: 0.03 },
            { flow: 300, pressureLoss: 0.04 },
            { flow: 320, pressureLoss: 0.04 },
            { flow: 340, pressureLoss: 0.05 },
            { flow: 360, pressureLoss: 0.05 },
            { flow: 380, pressureLoss: 0.06 },
            { flow: 400, pressureLoss: 0.06 },
            { flow: 420, pressureLoss: 0.07 },
            { flow: 440, pressureLoss: 0.07 },
            { flow: 460, pressureLoss: 0.08 },
            { flow: 480, pressureLoss: 0.08 },
            { flow: 500, pressureLoss: 0.08 },
            { flow: 520, pressureLoss: 0.1 },
            { flow: 600, pressureLoss: 0.12 },
            { flow: 650, pressureLoss: 0.14 },
            { flow: 700, pressureLoss: 0.16 },
            { flow: 750, pressureLoss: 0.18 },
            { flow: 800, pressureLoss: 0.2 },
            { flow: 850, pressureLoss: 0.22 },
            { flow: 900, pressureLoss: 0.25 },
            { flow: 950, pressureLoss: 0.28 },
            { flow: 1000, pressureLoss: 0.3 },
            { flow: 1050, pressureLoss: 0.33 },
            { flow: 1100, pressureLoss: 0.36 },
            { flow: 1150, pressureLoss: 0.39 },
            { flow: 1200, pressureLoss: 0.43 },
            { flow: 1250, pressureLoss: 0.46 },
            { flow: 1300, pressureLoss: 0.49 },
            { flow: 1350, pressureLoss: 0.53 },
            { flow: 1400, pressureLoss: 0.57 },
            { flow: 1450, pressureLoss: 0.6 },
            { flow: 1500, pressureLoss: 0.64 },
            { flow: 1550, pressureLoss: 0.68 },
            { flow: 1600, pressureLoss: 0.73 },
            { flow: 1650, pressureLoss: 0.77 },
            { flow: 1700, pressureLoss: 0.81 },
            { flow: 1750, pressureLoss: 0.86 },
            { flow: 1800, pressureLoss: 0.9 },
            { flow: 1850, pressureLoss: 0.95 },
            { flow: 1900, pressureLoss: 1.0 },
            { flow: 1950, pressureLoss: 1.05 },
            { flow: 2000, pressureLoss: 1.1 },
            { flow: 2050, pressureLoss: 1.15 },
            { flow: 2100, pressureLoss: 1.2 },
            { flow: 2150, pressureLoss: 1.26 },
            { flow: 2200, pressureLoss: 1.31 },
            { flow: 2250, pressureLoss: 1.36 },
            { flow: 2300, pressureLoss: 1.42 },
            { flow: 2350, pressureLoss: 1.48 },
            { flow: 2400, pressureLoss: 1.54 },
            { flow: 2450, pressureLoss: 1.6 },
            { flow: 2500, pressureLoss: 1.66 },
            { flow: 2550, pressureLoss: 1.72 },
            { flow: 2600, pressureLoss: 1.78 },
            { flow: 2650, pressureLoss: 1.85 },
            { flow: 2700, pressureLoss: 1.91 },
            { flow: 2750, pressureLoss: 1.98 },
            { flow: 2800, pressureLoss: 2.05 },
            { flow: 2850, pressureLoss: 2.11 },
            { flow: 2900, pressureLoss: 2.18 },
            { flow: 2950, pressureLoss: 2.29 },
            { flow: 3000, pressureLoss: 2.33 },
            { flow: 3050, pressureLoss: 2.3 },
            { flow: 3100, pressureLoss: 2.47 },
            { flow: 3200, pressureLoss: 3.15 },
        ],
        '125mm': [
            // 5 นิ้ว
            { flow: 300, pressureLoss: 0.01 },
            { flow: 320, pressureLoss: 0.02 },
            { flow: 340, pressureLoss: 0.02 },
            { flow: 360, pressureLoss: 0.02 },
            { flow: 380, pressureLoss: 0.02 },
            { flow: 400, pressureLoss: 0.02 },
            { flow: 420, pressureLoss: 0.02 },
            { flow: 440, pressureLoss: 0.03 },
            { flow: 460, pressureLoss: 0.03 },
            { flow: 480, pressureLoss: 0.03 },
            { flow: 500, pressureLoss: 0.03 },
            { flow: 520, pressureLoss: 0.04 },
            { flow: 600, pressureLoss: 0.04 },
            { flow: 650, pressureLoss: 0.05 },
            { flow: 700, pressureLoss: 0.06 },
            { flow: 750, pressureLoss: 0.07 },
            { flow: 800, pressureLoss: 0.07 },
            { flow: 850, pressureLoss: 0.08 },
            { flow: 900, pressureLoss: 0.09 },
            { flow: 950, pressureLoss: 0.1 },
            { flow: 1000, pressureLoss: 0.11 },
            { flow: 1050, pressureLoss: 0.12 },
            { flow: 1100, pressureLoss: 0.13 },
            { flow: 1150, pressureLoss: 0.14 },
            { flow: 1200, pressureLoss: 0.16 },
            { flow: 1250, pressureLoss: 0.17 },
            { flow: 1300, pressureLoss: 0.18 },
            { flow: 1350, pressureLoss: 0.19 },
            { flow: 1400, pressureLoss: 0.31 },
            { flow: 1450, pressureLoss: 0.32 },
            { flow: 1500, pressureLoss: 0.34 },
            { flow: 1550, pressureLoss: 0.35 },
            { flow: 1600, pressureLoss: 0.37 },
            { flow: 1650, pressureLoss: 0.38 },
            { flow: 1700, pressureLoss: 0.39 },
            { flow: 1750, pressureLoss: 0.41 },
            { flow: 1800, pressureLoss: 0.43 },
            { flow: 1850, pressureLoss: 0.44 },
            { flow: 1900, pressureLoss: 0.46 },
            { flow: 1950, pressureLoss: 0.48 },
            { flow: 2000, pressureLoss: 0.49 },
            { flow: 2050, pressureLoss: 0.51 },
            { flow: 2100, pressureLoss: 0.53 },
            { flow: 2150, pressureLoss: 0.54 },
            { flow: 2200, pressureLoss: 0.56 },
            { flow: 2250, pressureLoss: 0.58 },
            { flow: 2300, pressureLoss: 0.6 },
            { flow: 2350, pressureLoss: 0.62 },
            { flow: 2400, pressureLoss: 0.64 },
            { flow: 2450, pressureLoss: 0.66 },
            { flow: 2500, pressureLoss: 0.68 },
            { flow: 2550, pressureLoss: 0.7 },
            { flow: 2600, pressureLoss: 0.72 },
            { flow: 2650, pressureLoss: 0.74 },
            { flow: 2700, pressureLoss: 0.76 },
            { flow: 2750, pressureLoss: 0.78 },
            { flow: 2800, pressureLoss: 0.8 },
            { flow: 2850, pressureLoss: 0.82 },
            { flow: 2900, pressureLoss: 0.84 },
            { flow: 2950, pressureLoss: 0.86 },
            { flow: 3000, pressureLoss: 0.88 },
            { flow: 3050, pressureLoss: 2.3 },
            { flow: 3100, pressureLoss: 0.91 },
            { flow: 3200, pressureLoss: 0.52 },
            { flow: 3400, pressureLoss: 0.58 },
            { flow: 3600, pressureLoss: 0.65 },
            { flow: 3800, pressureLoss: 0.72 },
            { flow: 4000, pressureLoss: 0.79 },
            { flow: 4200, pressureLoss: 0.86 },
            { flow: 4400, pressureLoss: 0.94 },
            { flow: 4600, pressureLoss: 1.02 },
            { flow: 4800, pressureLoss: 1.1 },
            { flow: 5000, pressureLoss: 1.19 },
            { flow: 5200, pressureLoss: 1.28 },
            { flow: 5400, pressureLoss: 1.37 },
            { flow: 5600, pressureLoss: 1.47 },
            { flow: 5800, pressureLoss: 1.57 },
            { flow: 6000, pressureLoss: 1.67 },
            { flow: 6200, pressureLoss: 1.77 },
            { flow: 6400, pressureLoss: 1.88 },
            { flow: 6600, pressureLoss: 1.99 },
            { flow: 6800, pressureLoss: 2.1 },
            { flow: 7000, pressureLoss: 2.22 },
            { flow: 7500, pressureLoss: 2.52 },
            { flow: 8000, pressureLoss: 2.84 },
            { flow: 8500, pressureLoss: 3.18 },
            { flow: 9000, pressureLoss: 3.53 },
            { flow: 9500, pressureLoss: 3.9 },
            { flow: 10000, pressureLoss: 9.58 },
        ],
        '150mm': [
            // 6 นิ้ว
            { flow: 1200, pressureLoss: 0.08 },
            { flow: 1300, pressureLoss: 0.1 },
            { flow: 1400, pressureLoss: 0.11 },
            { flow: 1500, pressureLoss: 0.13 },
            { flow: 2000, pressureLoss: 0.22 },
            { flow: 2200, pressureLoss: 0.26 },
            { flow: 2400, pressureLoss: 0.31 },
            { flow: 2600, pressureLoss: 0.35 },
            { flow: 2800, pressureLoss: 0.41 },
            { flow: 3000, pressureLoss: 0.46 },
            { flow: 3200, pressureLoss: 0.52 },
            { flow: 3400, pressureLoss: 0.58 },
            { flow: 3600, pressureLoss: 0.65 },
            { flow: 3800, pressureLoss: 0.72 },
            { flow: 4000, pressureLoss: 0.79 },
            { flow: 4200, pressureLoss: 0.86 },
            { flow: 4400, pressureLoss: 0.94 },
            { flow: 4600, pressureLoss: 1.02 },
            { flow: 4800, pressureLoss: 1.1 },
            { flow: 5000, pressureLoss: 1.19 },
            { flow: 5200, pressureLoss: 1.28 },
            { flow: 5400, pressureLoss: 1.37 },
            { flow: 5600, pressureLoss: 1.47 },
            { flow: 5800, pressureLoss: 1.57 },
            { flow: 6000, pressureLoss: 1.67 },
            { flow: 6200, pressureLoss: 1.77 },
            { flow: 6400, pressureLoss: 1.88 },
            { flow: 6600, pressureLoss: 1.99 },
            { flow: 6800, pressureLoss: 2.1 },
            { flow: 7000, pressureLoss: 2.22 },
            { flow: 7500, pressureLoss: 2.52 },
            { flow: 8000, pressureLoss: 2.84 },
            { flow: 8500, pressureLoss: 3.18 },
            { flow: 9000, pressureLoss: 3.53 },
            { flow: 9500, pressureLoss: 3.9 },
            { flow: 10000, pressureLoss: 4.29 },
        ],
        '200mm': [
            // 8 นิ้ว
            { flow: 2200, pressureLoss: 0.07 },
            { flow: 2400, pressureLoss: 0.08 },
            { flow: 2600, pressureLoss: 0.09 },
            { flow: 2800, pressureLoss: 0.1 },
            { flow: 3000, pressureLoss: 0.12 },
            { flow: 3200, pressureLoss: 0.13 },
            { flow: 3400, pressureLoss: 0.15 },
            { flow: 3600, pressureLoss: 0.17 },
            { flow: 3800, pressureLoss: 0.18 },
            { flow: 4000, pressureLoss: 0.2 },
            { flow: 4200, pressureLoss: 0.22 },
            { flow: 4400, pressureLoss: 0.24 },
            { flow: 4600, pressureLoss: 0.26 },
            { flow: 4800, pressureLoss: 0.28 },
            { flow: 5000, pressureLoss: 0.31 },
            { flow: 5200, pressureLoss: 0.33 },
            { flow: 5400, pressureLoss: 0.35 },
            { flow: 5600, pressureLoss: 0.38 },
            { flow: 5800, pressureLoss: 0.4 },
            { flow: 6000, pressureLoss: 0.43 },
            { flow: 6200, pressureLoss: 0.45 },
            { flow: 6400, pressureLoss: 0.48 },
            { flow: 6600, pressureLoss: 0.51 },
            { flow: 6800, pressureLoss: 0.54 },
            { flow: 7000, pressureLoss: 0.57 },
            { flow: 7500, pressureLoss: 0.65 },
            { flow: 8000, pressureLoss: 0.73 },
            { flow: 8500, pressureLoss: 0.82 },
            { flow: 9000, pressureLoss: 0.91 },
            { flow: 9500, pressureLoss: 1.0 },
            { flow: 10000, pressureLoss: 1.1 },
        ],
        '250mm': [
            // 10 นิ้ว
            { flow: 2800, pressureLoss: 0.04 },
            { flow: 3000, pressureLoss: 0.04 },
            { flow: 3200, pressureLoss: 0.05 },
            { flow: 3400, pressureLoss: 0.05 },
            { flow: 3600, pressureLoss: 0.03 },
            { flow: 3800, pressureLoss: 0.03 },
            { flow: 4000, pressureLoss: 0.03 },
            { flow: 4200, pressureLoss: 0.03 },
            { flow: 4400, pressureLoss: 0.04 },
            { flow: 4600, pressureLoss: 0.04 },
            { flow: 4800, pressureLoss: 0.04 },
            { flow: 5000, pressureLoss: 0.05 },
            { flow: 5200, pressureLoss: 0.05 },
            { flow: 5400, pressureLoss: 0.05 },
            { flow: 5600, pressureLoss: 0.06 },
            { flow: 5800, pressureLoss: 0.06 },
            { flow: 6000, pressureLoss: 0.07 },
            { flow: 6200, pressureLoss: 0.07 },
            { flow: 6400, pressureLoss: 0.07 },
            { flow: 6600, pressureLoss: 0.08 },
            { flow: 6800, pressureLoss: 0.08 },
            { flow: 7000, pressureLoss: 0.09 },
            { flow: 7500, pressureLoss: 0.1 },
            { flow: 8000, pressureLoss: 0.11 },
            { flow: 8500, pressureLoss: 0.12 },
            { flow: 9000, pressureLoss: 0.14 },
            { flow: 9500, pressureLoss: 0.15 },
            { flow: 10000, pressureLoss: 0.39 },
        ],
        '300mm': [
            // 12 นิ้ว
            { flow: 3600, pressureLoss: 0.03 },
            { flow: 3800, pressureLoss: 0.03 },
            { flow: 4000, pressureLoss: 0.03 },
            { flow: 4200, pressureLoss: 0.03 },
            { flow: 4400, pressureLoss: 0.04 },
            { flow: 4600, pressureLoss: 0.04 },
            { flow: 4800, pressureLoss: 0.04 },
            { flow: 5000, pressureLoss: 0.05 },
            { flow: 5200, pressureLoss: 0.05 },
            { flow: 5400, pressureLoss: 0.05 },
            { flow: 5600, pressureLoss: 0.06 },
            { flow: 5800, pressureLoss: 0.06 },
            { flow: 6000, pressureLoss: 0.07 },
            { flow: 6200, pressureLoss: 0.07 },
            { flow: 6400, pressureLoss: 0.07 },
            { flow: 6600, pressureLoss: 0.08 },
            { flow: 6800, pressureLoss: 0.08 },
            { flow: 7000, pressureLoss: 0.09 },
            { flow: 7500, pressureLoss: 0.1 },
            { flow: 8000, pressureLoss: 0.11 },
            { flow: 8500, pressureLoss: 0.12 },
            { flow: 9000, pressureLoss: 0.14 },
            { flow: 9500, pressureLoss: 0.15 },
            { flow: 10000, pressureLoss: 0.17 },
        ],
    };
}

// Smart pipe data selection with conservative approach
function getSmartPipeData(pipeType: string, pressureClass: string): PipeSizeData | null {
    const type = pipeType.toUpperCase();

    // Extract numeric value from pressure class
    const numericValue = extractNumericValue(pressureClass);
    if (numericValue === null) return null;

    if (type === 'PE') {
        return selectPEData(numericValue);
    } else if (type === 'PVC') {
        return selectPVCData(numericValue);
    }

    return null;
}

// Extract numeric value from pressure class string
function extractNumericValue(pressureClass: string): number | null {
    const cleanString = pressureClass.toUpperCase().replace(/[^0-9.]/g, '');
    const value = parseFloat(cleanString);
    return isNaN(value) ? null : value;
}

// Select appropriate PE data based on PN value
function selectPEData(pnValue: number): PipeSizeData | null {
    const availablePNs = [2.5, 4, 6.3];

    // If exact match exists
    if (availablePNs.includes(pnValue)) {
        switch (pnValue) {
            case 2.5:
                return getPE_PN25_Data();
            case 4:
                return getPE_PN4_Data();
            case 6.3:
                return getPE_PN63_Data();
        }
    }

    // Conservative approach: use higher value if between ranges
    if (pnValue < 2.5) {
        return getPE_PN25_Data(); // Use lowest available
    } else if (pnValue > 2.5 && pnValue < 4) {
        return getPE_PN4_Data(); // Use PN4 (higher than PN2.5)
    } else if (pnValue > 4 && pnValue < 6.3) {
        return getPE_PN63_Data(); // Use PN6.3 (higher than PN4)
    } else if (pnValue > 6.3) {
        return getPE_PN63_Data(); // Use highest available PN6.3
    }

    return getPE_PN25_Data(); // Fallback
}

// Select appropriate PVC data based on Class value
function selectPVCData(classValue: number): PipeSizeData | null {
    const availableClasses = [5, 8.5];

    // If exact match exists
    if (availableClasses.includes(classValue)) {
        switch (classValue) {
            case 5:
                return getPVC_Class5_Data();
            case 8.5:
                return getPVC_Class85_Data();
        }
    }

    // Conservative approach: use higher value if between ranges
    if (classValue < 5) {
        return getPVC_Class5_Data(); // Use lowest available
    } else if (classValue > 5 && classValue < 8.5) {
        return getPVC_Class85_Data(); // Use Class 8.5 (higher than Class 5)
    } else if (classValue > 8.5) {
        return getPVC_Class85_Data(); // Use highest available Class 8.5
    }

    return getPVC_Class5_Data(); // Fallback
}

// Utility functions to get pipe data by type and class/PN
export function getPipeData(pipeType: string, pressureClass: string): PipeSizeData | null {
    // First try smart selection
    const smartData = getSmartPipeData(pipeType, pressureClass);
    if (smartData) return smartData;

    // Fallback to exact matching (backward compatibility)
    const key = `${pipeType.toUpperCase()}_${pressureClass.toUpperCase()}`;

    switch (key) {
        case 'PE_PN2.5':
        case 'PE_PN25':
            return getPE_PN25_Data();

        case 'PE_PN4':
            return getPE_PN4_Data();

        case 'PE_PN6.3':
        case 'PE_PN63':
            return getPE_PN63_Data();

        case 'PVC_CLASS5':
        case 'PVC_5':
            return getPVC_Class5_Data();

        case 'PVC_CLASS8.5':
        case 'PVC_85':
            return getPVC_Class85_Data();

        default:
            return null;
    }
}

// Function to find pressure loss for a given flow rate and pipe size
export function getPressureLoss(
    pipeType: string,
    pressureClass: string,
    pipeSize: string,
    flowRate: number
): number | null {
    const data = getPipeData(pipeType, pressureClass);
    if (!data || !data[pipeSize]) {
        return null;
    }

    const sizeData = data[pipeSize];

    // Find exact match first
    const exactMatch = sizeData.find((item) => item.flow === flowRate);
    if (exactMatch) {
        return exactMatch.pressureLoss;
    }

    // Linear interpolation between two closest points
    let lowerPoint: PipeFlowData | null = null;
    let upperPoint: PipeFlowData | null = null;

    for (let i = 0; i < sizeData.length - 1; i++) {
        if (sizeData[i].flow <= flowRate && sizeData[i + 1].flow >= flowRate) {
            lowerPoint = sizeData[i];
            upperPoint = sizeData[i + 1];
            break;
        }
    }

    if (lowerPoint !== null && upperPoint !== null) {
        const ratio = (flowRate - lowerPoint.flow) / (upperPoint.flow - lowerPoint.flow);
        return (
            lowerPoint.pressureLoss + ratio * (upperPoint.pressureLoss - lowerPoint.pressureLoss)
        );
    }

    return null;
}

// Function to get available pipe sizes for a given type and class
export function getAvailableSizes(pipeType: string, pressureClass: string): string[] {
    const data = getPipeData(pipeType, pressureClass);
    return data ? Object.keys(data) : [];
}

// Function to get flow range for a specific pipe size
export function getFlowRange(
    pipeType: string,
    pressureClass: string,
    pipeSize: string
): { min: number; max: number } | null {
    const data = getPipeData(pipeType, pressureClass);
    if (!data || !data[pipeSize]) {
        return null;
    }

    const sizeData = data[pipeSize];
    const flows = sizeData.map((item) => item.flow);

    return {
        min: Math.min(...flows),
        max: Math.max(...flows),
    };
}

// Function to get comprehensive information about pipe data selection
export function getSelectedPipeDataInfo(
    pipeType: string,
    pressureClass: string,
    pipeSize?: string
): {
    originalValue: string;
    selectedValue: string;
    reason: string;
    isExactMatch: boolean;
    sizeInfo?: {
        originalSize: string;
        selectedSize: string;
        sizeReason: string;
        isExactSizeMatch: boolean;
    };
} | null {
    const type = pipeType.toUpperCase();
    const numericValue = extractNumericValue(pressureClass);

    if (numericValue === null) return null;

    let selectedValue = '';
    let reason = '';
    let isExactMatch = false;

    if (type === 'PE') {
        const availablePNs = [2.5, 4, 6.3];

        if (availablePNs.includes(numericValue)) {
            selectedValue = `PN${numericValue}`;
            reason = 'ค่าตรงกับข้อมูลในตาราง';
            isExactMatch = true;
        } else if (numericValue < 2.5) {
            selectedValue = 'PN2.5';
            reason = 'ใช้ค่าต่ำสุดที่มี (Conservative approach)';
        } else if (numericValue > 2.5 && numericValue < 4) {
            selectedValue = 'PN4';
            reason = `PN${numericValue} อยู่ระหว่าง PN2.5 และ PN4 จึงใช้ค่าที่สูงกว่า (PN4)`;
        } else if (numericValue > 4 && numericValue < 6.3) {
            selectedValue = 'PN6.3';
            reason = `PN${numericValue} อยู่ระหว่าง PN4 และ PN6.3 จึงใช้ค่าที่สูงกว่า (PN6.3)`;
        } else if (numericValue > 6.3) {
            selectedValue = 'PN6.3';
            reason = `PN${numericValue} สูงกว่าค่าสูงสุดในตาราง จึงใช้ค่าสูงสุดที่มี (PN6.3)`;
        }
    } else if (type === 'PVC') {
        const availableClasses = [5, 8.5];

        if (availableClasses.includes(numericValue)) {
            selectedValue = `Class${numericValue}`;
            reason = 'ค่าตรงกับข้อมูลในตาราง';
            isExactMatch = true;
        } else if (numericValue < 5) {
            selectedValue = 'Class5';
            reason = 'ใช้ค่าต่ำสุดที่มี (Conservative approach)';
        } else if (numericValue > 5 && numericValue < 8.5) {
            selectedValue = 'Class8.5';
            reason = `Class${numericValue} อยู่ระหว่าง Class5 และ Class8.5 จึงใช้ค่าที่สูงกว่า (Class8.5)`;
        } else if (numericValue > 8.5) {
            selectedValue = 'Class8.5';
            reason = `Class${numericValue} สูงกว่าค่าสูงสุดในตาราง จึงใช้ค่าสูงสุดที่มี (Class8.5)`;
        }
    }

    const result: any = {
        originalValue: pressureClass,
        selectedValue: selectedValue,
        reason: reason,
        isExactMatch: isExactMatch,
    };

    // Add size information if pipe size is provided
    if (pipeSize) {
        const smartPipeResult = getPipeDataWithSmartSize(pipeType, selectedValue, pipeSize);
        if (smartPipeResult) {
            result.sizeInfo = {
                originalSize: pipeSize,
                selectedSize: smartPipeResult.selectedSize,
                sizeReason: smartPipeResult.sizeInfo.reason,
                isExactSizeMatch: smartPipeResult.sizeInfo.isExactMatch,
            };
        }
    }

    return result;
}

// Function to find the nearest available pipe size (conservative approach)
function findNearestPipeSize(
    requestedSize: string,
    availableSizes: string[]
): {
    selectedSize: string;
    isExactMatch: boolean;
    reason: string;
} {
    // Extract numeric value from size string
    const requestedValue = parseFloat(requestedSize.replace(/[^0-9.]/g, ''));

    if (isNaN(requestedValue)) {
        return {
            selectedSize: availableSizes[0],
            isExactMatch: false,
            reason: 'ไม่สามารถระบุขนาดท่อได้ ใช้ขนาดเล็กสุดที่มี',
        };
    }

    // Check for exact match first
    const exactMatch = availableSizes.find((size) => {
        const sizeValue = parseFloat(size.replace(/[^0-9.]/g, ''));
        return Math.abs(sizeValue - requestedValue) < 0.1; // Allow small tolerance
    });

    if (exactMatch) {
        return {
            selectedSize: exactMatch,
            isExactMatch: true,
            reason: 'ขนาดตรงกับข้อมูลในตาราง',
        };
    }

    // Convert sizes to numbers for comparison
    const sizePairs = availableSizes
        .map((size) => ({
            size,
            value: parseFloat(size.replace(/[^0-9.]/g, '')),
        }))
        .sort((a, b) => a.value - b.value);

    // Find the smallest size that is larger than requested
    const largerSize = sizePairs.find((pair) => pair.value > requestedValue);

    if (largerSize) {
        return {
            selectedSize: largerSize.size,
            isExactMatch: false,
            reason: `${requestedSize} ไม่มีในตาราง ใช้ขนาดที่ใกล้ที่สุดที่ใหญ่กว่า (${largerSize.size})`,
        };
    }

    // If no larger size found, use the largest available
    const largestSize = sizePairs[sizePairs.length - 1];
    return {
        selectedSize: largestSize.size,
        isExactMatch: false,
        reason: `${requestedSize} ใหญ่กว่าขนาดสูงสุดในตาราง ใช้ขนาดสูงสุดที่มี (${largestSize.size})`,
    };
}

// Enhanced function to get pipe data with smart size selection
export function getPipeDataWithSmartSize(
    pipeType: string,
    pressureClass: string,
    requestedSize: string
): {
    data: PipeSizeData | null;
    selectedSize: string;
    sizeInfo: {
        isExactMatch: boolean;
        reason: string;
    };
} | null {
    // First get pipe data for the pressure class
    const pipeData = getPipeData(pipeType, pressureClass);
    if (!pipeData) {
        return null;
    }

    const availableSizes = Object.keys(pipeData);
    const sizeSelection = findNearestPipeSize(requestedSize, availableSizes);

    return {
        data: pipeData,
        selectedSize: sizeSelection.selectedSize,
        sizeInfo: {
            isExactMatch: sizeSelection.isExactMatch,
            reason: sizeSelection.reason,
        },
    };
}

// Function to get all available pipe types and classes
export function getAvailablePipeTypes(): {
    PE: number[];
    PVC: number[];
} {
    return {
        PE: [2.5, 4, 6.3],
        PVC: [5, 8.5],
    };
}
