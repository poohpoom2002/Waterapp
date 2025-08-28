/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    HorticultureProjectData,
    ProjectSummaryData,
    ZoneSummaryData,
    calculateProjectSummary,
    loadProjectData,
    formatAreaInRai,
    formatDistance,
    formatWaterVolume,
} from './horticultureUtils';
import { loadSprinklerConfig, calculateTotalFlowRate, formatFlowRate, formatFlowRatePerHour } from './sprinklerUtils';

interface SprinklerFlowRateInfo {
    totalFlowRatePerMinute: number;
    totalFlowRatePerHour: number;
    formattedFlowRatePerMinute: string;
    formattedFlowRatePerHour: string;
    flowRatePerPlant: number;
    pressureBar: number;
    radiusMeters: number;
}

/**
 * ดึงข้อมูลสถิติโครงการจาก localStorage
 * @returns ProjectSummaryData หรือ null ถ้าไม่มีข้อมูล
 */
export const getProjectStats = (): ProjectSummaryData | null => {
    try {
        const projectData = loadProjectData();
        if (!projectData) {
            console.warn('ไม่พบข้อมูลโครงการ');
            return null;
        }

        const summary = calculateProjectSummary(projectData);
        return summary;
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ:', error);
        return null;
    }
};

/**
 * ดึงข้อมูลสถิติจากข้อมูลโครงการที่ส่งเข้ามา
 * @param projectData ข้อมูลโครงการ
 * @returns ProjectSummaryData
 */
export const getProjectStatsFromData = (
    projectData: HorticultureProjectData
): ProjectSummaryData => {
    return calculateProjectSummary(projectData);
};

/**
 * ดึงข้อมูลโดยรวมของโครงการพร้อมข้อมูลหัวฉีด
 * @returns ข้อมูลโดยรวม หรือ null ถ้าไม่มีข้อมูล
 */
export const getOverallStats = (): {
    totalAreaInRai: number;
    totalZones: number;
    totalPlants: number;
    totalWaterNeedPerSession: number;
    longestPipesCombined: number;
    sprinklerFlowRate?: SprinklerFlowRateInfo;
} | null => {
    const stats = getProjectStats();
    if (!stats) return null;

    // ดึงข้อมูลหัวฉีด
    const sprinklerConfig = loadSprinklerConfig();
    let sprinklerFlowRate: SprinklerFlowRateInfo | undefined = undefined;

    if (sprinklerConfig && stats.totalPlants > 0) {
        const totalFlowRatePerMinute = calculateTotalFlowRate(
            stats.totalPlants,
            sprinklerConfig.flowRatePerMinute
        );
        const totalFlowRatePerHour = totalFlowRatePerMinute * 60;

        sprinklerFlowRate = {
            totalFlowRatePerMinute,
            totalFlowRatePerHour,
            formattedFlowRatePerMinute: formatFlowRate(totalFlowRatePerMinute),
            formattedFlowRatePerHour: formatFlowRatePerHour(totalFlowRatePerHour),
            flowRatePerPlant: sprinklerConfig.flowRatePerMinute,
            pressureBar: sprinklerConfig.pressureBar,
            radiusMeters: sprinklerConfig.radiusMeters,
        };
    }

    return {
        totalAreaInRai: stats.totalAreaInRai,
        totalZones: stats.totalZones,
        totalPlants: stats.totalPlants,
        totalWaterNeedPerSession: stats.totalWaterNeedPerSession,
        longestPipesCombined: stats.longestPipesCombined,
        sprinklerFlowRate,
    };
};

/**
 * ดึงข้อมูลระบบท่อ
 * @returns ข้อมูลระบบท่อ หรือ null ถ้าไม่มีข้อมูล
 */
export const getPipeStats = (): {
    mainPipes: { longest: number; totalLength: number };
    subMainPipes: { longest: number; totalLength: number };
    branchPipes: { longest: number; totalLength: number };
    longestPipesCombined: number;
} | null => {
    const stats = getProjectStats();
    if (!stats) return null;

    return {
        mainPipes: stats.mainPipes,
        subMainPipes: stats.subMainPipes,
        branchPipes: stats.branchPipes,
        longestPipesCombined: stats.longestPipesCombined,
    };
};

/**
 * ดึงข้อมูลแยกโซน
 * @returns อาร์เรย์ข้อมูลโซน หรือ array ว่างถ้าไม่มีข้อมูล
 */
export const getZoneStats = (): ZoneSummaryData[] => {
    const stats = getProjectStats();
    if (!stats) return [];

    return stats.zoneDetails;
};

/**
 * ดึงข้อมูลโซนเฉพาะโซน
 * @param zoneId ID ของโซนที่ต้องการ
 * @returns ข้อมูลโซน หรือ null ถ้าไม่พบ
 */
export const getZoneStatsById = (zoneId: string): ZoneSummaryData | null => {
    const zones = getZoneStats();
    return zones.find((zone) => zone.zoneId === zoneId) || null;
};

/**
 * ดึงข้อมูลท่อย่อยที่ยาวที่สุดในแต่ละโซน พร้อมจำนวนต้นไม้
 * @returns ข้อมูลท่อย่อยที่ยาวที่สุดในแต่ละโซน หรือ null ถ้าไม่มีข้อมูล
 */
export const getLongestBranchPipeStats = ():
    | {
          zoneId: string;
          zoneName: string;
          longestBranchPipe: {
              id: string;
              length: number;
              plantCount: number;
              plantNames: string[];
          };
      }[]
    | null => {
    try {
        const projectData = loadProjectData();
        if (!projectData) {
            console.warn('ไม่พบข้อมูลโครงการ');
            return null;
        }

        const stats: {
            zoneId: string;
            zoneName: string;
            longestBranchPipe: {
                id: string;
                length: number;
                plantCount: number;
                plantNames: string[];
            };
        }[] = [];

        // ปิดการใช้งาน zones แบบเดิม รอการพัฒนาระบบโซนใหม่
        // if (projectData.useZones && projectData.zones && projectData.zones.length > 0) {
        //     projectData.zones.forEach((zone) => {
        //         const zoneSubMainPipes =
        //             projectData.subMainPipes?.filter((pipe) => pipe.zoneId === zone.id) || [];
        //         const allBranchPipes = zoneSubMainPipes.flatMap(
        //             (subMain) => subMain.branchPipes || []
        //         );

        //         if (allBranchPipes.length > 0) {
        //             const longestBranchPipe = allBranchPipes.reduce((longest, current) =>
        //                 current.length > longest.length ? current : longest
        //             );
        //             const plantCount = longestBranchPipe.plants?.length || 0;
        //             const plantNames =
        //             longestBranchPipe.plants?.map((plant) => plant.plantData.name) || [];

        //             stats.push({
        //                 zoneId: zone.id,
        //                 zoneName: zone.name,
        //                 longestBranchPipe: {
        //                     id: longestBranchPipe.id,
        //                     length: longestBranchPipe.length,
        //                     plantCount,
        //                     plantNames,
        //                 },
        //             });
        //         }
        //     });
        // } else {
        const allBranchPipes =
            projectData.subMainPipes?.flatMap((subMain) => subMain.branchPipes || []) || [];

        if (allBranchPipes.length > 0) {
            const longestBranchPipe = allBranchPipes.reduce((longest, current) =>
                current.length > longest.length ? current : longest
            );

            const plantCount = longestBranchPipe.plants?.length || 0;
            const plantNames = longestBranchPipe.plants?.map((plant) => plant.plantData.name) || [];

            stats.push({
                zoneId: 'main-area',
                zoneName: 'พื้นที่หลัก',
                longestBranchPipe: {
                    id: longestBranchPipe.id,
                    length: longestBranchPipe.length,
                    plantCount,
                    plantNames,
                },
            });
        }
        // }

        return stats;
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลท่อย่อยที่ยาวที่สุด:', error);
        return null;
    }
};

/**
 * ดึงข้อมูลจำนวนท่อย่อยที่ออกจากท่อเมนรองในแต่ละโซน
 * @returns ข้อมูลจำนวนท่อย่อยที่ออกจากท่อเมนรองในแต่ละโซน หรือ null ถ้าไม่มีข้อมูล
 */
export const getSubMainPipeBranchCount = ():
    | {
          zoneId: string;
          zoneName: string;
          subMainPipes: {
              id: string;
              length: number;
              branchCount: number;
              totalBranchLength: number;
          }[];
      }[]
    | null => {
    try {
        const projectData = loadProjectData();
        if (!projectData) {
            console.warn('ไม่พบข้อมูลโครงการ');
            return null;
        }

        const stats: {
            zoneId: string;
            zoneName: string;
            subMainPipes: {
                id: string;
                length: number;
                branchCount: number;
                totalBranchLength: number;
            }[];
        }[] = [];

        // ปิดการใช้งาน zones แบบเดิม รอการพัฒนาระบบโซนใหม่
        // if (projectData.useZones && projectData.zones && projectData.zones.length > 0) {
        //     projectData.zones.forEach((zone) => {
        //         const zoneSubMainPipes =
        //             projectData.subMainPipes?.filter((pipe) => pipe.zoneId === zone.id) || [];

        //         const subMainPipesData = zoneSubMainPipes.map((subMain) => {
        //             const branchCount = subMain.branchPipes?.length || 0;
        //             const totalBranchLength =
        //                 subMain.branchPipes?.reduce((sum, branch) => sum + branch.length, 0) || 0;

        //             return {
        //                 id: subMain.id,
        //                 length: subMain.length,
        //                 branchCount,
        //                 totalBranchLength,
        //             };
        //         });

        //         if (subMainPipesData.length > 0) {
        //             stats.push({
        //                 zoneId: zone.id,
        //                 zoneName: zone.name,
        //                 subMainPipes: subMainPipesData,
        //             });
        //         }
        //     });
        // } else {
        const allSubMainPipes = projectData.subMainPipes || [];

        const subMainPipesData = allSubMainPipes.map((subMain) => {
            const branchCount = subMain.branchPipes?.length || 0;
            const totalBranchLength =
                subMain.branchPipes?.reduce((sum, branch) => sum + branch.length, 0) || 0;

            return {
                id: subMain.id,
                length: subMain.length,
                branchCount,
                totalBranchLength,
            };
        });

        if (subMainPipesData.length > 0) {
            stats.push({
                zoneId: 'main-area',
                zoneName: 'พื้นที่หลัก',
                subMainPipes: subMainPipesData,
            });
        }
        // }

        return stats;
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลจำนวนท่อย่อยที่ออกจากท่อเมนรอง:', error);
        return null;
    }
};

/**
 * ดึงข้อมูลสถิติท่อย่อยแบบละเอียด
 * @returns ข้อมูลสถิติท่อย่อยแบบละเอียด หรือ null ถ้าไม่มีข้อมูล
 */
export const getDetailedBranchPipeStats = ():
    | {
          zoneId: string;
          zoneName: string;
          longestBranchPipe: {
              id: string;
              length: number;
              plantCount: number;
              plantNames: string[];
          };
          subMainPipes: {
              id: string;
              length: number;
              branchCount: number;
              totalBranchLength: number;
          }[];
      }[]
    | null => {
    try {
        const longestBranchStats = getLongestBranchPipeStats();
        const subMainBranchCount = getSubMainPipeBranchCount();

        if (!longestBranchStats || !subMainBranchCount) {
            return null;
        }

        const detailedStats = longestBranchStats.map((longestStat) => {
            const subMainData = subMainBranchCount.find(
                (subMain) => subMain.zoneId === longestStat.zoneId
            );

            return {
                zoneId: longestStat.zoneId,
                zoneName: longestStat.zoneName,
                longestBranchPipe: longestStat.longestBranchPipe,
                subMainPipes: subMainData?.subMainPipes || [],
            };
        });

        return detailedStats;
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลสถิติท่อย่อยแบบละเอียด:', error);
        return null;
    }
};

/**
 * Export branch pipe stats as JSON string
 * @returns JSON string of branch pipe stats or null if no data
 */
export const exportBranchPipeStatsAsJSON = (): string | null => {
    const stats = getDetailedBranchPipeStats();
    if (!stats) return null;

    const exportData = {
        branchPipeStats: stats,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
    };

    return JSON.stringify(exportData, null, 2);
};

/**
 * Export branch pipe stats as CSV string
 * @returns CSV string of branch pipe stats or null if no data
 */
export const exportBranchPipeStatsAsCSV = (): string | null => {
    const stats = getDetailedBranchPipeStats();
    if (!stats) return null;

    let csv =
        'Zone ID,Zone Name,Longest Branch Pipe ID,Longest Branch Pipe Length (m),Plant Count in Longest Branch,Plant Names in Longest Branch,Sub-Main Pipe ID,Sub-Main Pipe Length (m),Branch Count from Sub-Main,Total Branch Length from Sub-Main (m)\n';

    stats.forEach((zone) => {
        if (zone.subMainPipes.length > 0) {
            zone.subMainPipes.forEach((subMain) => {
                csv += `"${zone.zoneId}","${zone.zoneName}","${zone.longestBranchPipe.id}",${zone.longestBranchPipe.length.toFixed(2)},${zone.longestBranchPipe.plantCount},"${zone.longestBranchPipe.plantNames.join(', ')}","${subMain.id}",${subMain.length.toFixed(2)},${subMain.branchCount},${subMain.totalBranchLength.toFixed(2)}\n`;
            });
        } else {
            csv += `"${zone.zoneId}","${zone.zoneName}","${zone.longestBranchPipe.id}",${zone.longestBranchPipe.length.toFixed(2)},${zone.longestBranchPipe.plantCount},"${zone.longestBranchPipe.plantNames.join(', ')}","","","",""\n`;
        }
    });

    return csv;
};

/**
 * Download branch pipe stats as JSON file
 * @param filename name of the file (without extension)
 */
export const downloadBranchPipeStatsAsJSON = (filename: string = 'branch-pipe-stats'): void => {
    const jsonData = exportBranchPipeStatsAsJSON();
    if (!jsonData) {
        console.error('ไม่มีข้อมูลท่อย่อยให้ดาวน์โหลด');
        return;
    }

    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

/**
 * Download branch pipe stats as CSV file
 * @param filename name of the file (without extension)
 */
export const downloadBranchPipeStatsAsCSV = (filename: string = 'branch-pipe-stats'): void => {
    const csvData = exportBranchPipeStatsAsCSV();
    if (!csvData) {
        console.error('ไม่มีข้อมูลท่อย่อยให้ดาวน์โหลด');
        return;
    }

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

/**
 * Get formatted branch pipe stats
 * @returns Formatted string of branch pipe stats or null if no data
 */
export const getFormattedBranchPipeStats = (): string | null => {
    const stats = getDetailedBranchPipeStats();
    if (!stats) return null;

    let formatted = `🔧 รายงานสถิติท่อย่อยแบบละเอียด\n\n`;

    stats.forEach((zone, index) => {
        formatted += `🏞️ ${index + 1}. ${zone.zoneName}:\n`;
        formatted += `  📏 ท่อย่อยที่ยาวที่สุด:\n`;
        formatted += `    • ID: ${zone.longestBranchPipe.id}\n`;
        formatted += `    • ความยาว: ${formatDistance(zone.longestBranchPipe.length)}\n`;
        formatted += `    • จำนวนต้นไม้: ${zone.longestBranchPipe.plantCount} ต้น\n`;
        formatted += `    • ชนิดพืช: ${zone.longestBranchPipe.plantNames.join(', ') || 'ไม่ระบุ'}\n\n`;

        if (zone.subMainPipes.length > 0) {
            formatted += `  🔗 ท่อเมนรองในโซน:\n`;
            zone.subMainPipes.forEach((subMain, subIndex) => {
                formatted += `    ${subIndex + 1}. ท่อ ${subMain.id}:\n`;
                formatted += `       • ความยาว: ${formatDistance(subMain.length)}\n`;
                formatted += `       • จำนวนท่อย่อย: ${subMain.branchCount} เส้น\n`;
                formatted += `       • ความยาวท่อย่อยรวม: ${formatDistance(subMain.totalBranchLength)}\n`;
            });
        } else {
            formatted += `  ⚠️ ไม่มีท่อเมนรองในโซนนี้\n`;
        }
        formatted += `\n`;
    });

    formatted += `📅 สร้างรายงาน: ${new Date().toLocaleDateString('th-TH')}`;

    return formatted;
};

/**
 * Export stats as JSON string
 * @returns JSON string of stats or null if no data
 */
export const exportStatsAsJSON = (): string | null => {
    const stats = getProjectStats();
    if (!stats) return null;

    const exportData = {
        summary: stats,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
    };

    return JSON.stringify(exportData, null, 2);
};

/**
 * Export stats as CSV string
 * @returns CSV string of stats or null if no data
 */
export const exportStatsAsCSV = (): string | null => {
    const stats = getProjectStats();
    if (!stats) return null;

    let csv =
        'Zone Name,Area (Rai),Plant Count,Water Need (L),Main Pipe Longest (m),Main Pipe Total (m),Sub-Main Pipe Longest (m),Sub-Main Pipe Total (m),Branch Pipe Longest (m),Branch Pipe Total (m)\n';

    stats.zoneDetails.forEach((zone) => {
        csv += `"${zone.zoneName}",${zone.areaInRai.toFixed(2)},${zone.plantCount},${zone.waterNeedPerSession.toFixed(2)},${zone.mainPipesInZone.longest.toFixed(2)},${zone.mainPipesInZone.totalLength.toFixed(2)},${zone.subMainPipesInZone.longest.toFixed(2)},${zone.subMainPipesInZone.totalLength.toFixed(2)},${zone.branchPipesInZone.longest.toFixed(2)},${zone.branchPipesInZone.totalLength.toFixed(2)}\n`;
    });

    return csv;
};

/**
 * Create map image from HTML element
 * @param mapElement HTML element of the map
 * @param options options for creating the image
 * @returns Promise<string | null> Data URL of the image or null if failed
 */
export const createMapImage = async (
    mapElement: HTMLElement,
    options: {
        quality?: number;
        scale?: number;
        backgroundColor?: string;
        filename?: string;
    } = {}
): Promise<string | null> => {
    if (!mapElement) {
        console.error('❌ ไม่พบ map element');
        return null;
    }

    const {
        quality = 0.9,
        scale = 2,
        backgroundColor = '#1F2937',
        filename: _finalFilename = 'horticulture-layout',
    } = options;

    try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const html2canvas = await import('html2canvas');
        const html2canvasLib = html2canvas.default || html2canvas;
        const canvas = await html2canvasLib(mapElement, {
            useCORS: true,
            allowTaint: false,
            scale: scale,
            logging: false,
            backgroundColor: backgroundColor,
            width: mapElement.offsetWidth,
            height: mapElement.offsetHeight,
            onclone: (clonedDoc) => {
                try {
                    const controls = clonedDoc.querySelectorAll('.leaflet-control-container');
                    controls.forEach((el) => el.remove());

                    const elements = clonedDoc.querySelectorAll('*');
                    elements.forEach((el: Element) => {
                        const htmlEl = el as HTMLElement;
                        if (htmlEl.style.color?.includes('oklch')) {
                            htmlEl.style.color = 'rgb(255, 255, 255)';
                        }
                        if (htmlEl.style.backgroundColor?.includes('oklch')) {
                            htmlEl.style.backgroundColor = 'transparent';
                        }
                    });
                } catch (error) {
                    console.warn('⚠️ คำเตือนใน onclone:', error);
                }
            },
        });

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        return dataUrl;
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการสร้างภาพ:', error);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (ctx) {
                canvas.width = mapElement.offsetWidth || 800;
                canvas.height = mapElement.offsetHeight || 600;

                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = '#FFFFFF';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('แผนผังระบบน้ำสวนผลไม้', canvas.width / 2, canvas.height / 2 - 40);
                ctx.fillText('(ไม่สามารถสร้างภาพแผนที่ได้)', canvas.width / 2, canvas.height / 2);
                ctx.fillText('กรุณาใช้ screenshot แทน', canvas.width / 2, canvas.height / 2 + 40);

                return canvas.toDataURL('image/jpeg', 0.8);
            }
        } catch (fallbackError) {
            console.error('❌ การสร้างภาพ fallback ล้มเหลว:', fallbackError);
        }

        return null;
    }
};

/**
 * Download image
 * @param dataUrl Data URL of the image
 * @param filename name of the file (including extension)
 */
export const downloadImage = (
    dataUrl: string,
    filename: string = 'horticulture-layout.jpg'
): void => {
    try {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการดาวน์โหลดภาพ:', error);
        try {
            window.open(dataUrl);
        } catch (fallbackError) {
            console.error('❌ การดาวน์โหลด fallback ล้มเหลว:', fallbackError);
        }
    }
};

/**
 * สร้างและดาวน์โหลดภาพแผนที่
 * @param mapElement HTML element ของแผนที่
 * @param options ตัวเลือกการสร้างและดาวน์โหลด
 * @returns Promise<boolean> สำเร็จหรือไม่
 */
export const createAndDownloadMapImage = async (
    mapElement: HTMLElement,
    options: {
        quality?: number;
        scale?: number;
        backgroundColor?: string;
        filename?: string;
    } = {}
): Promise<boolean> => {
    try {
        const projectData = loadProjectData();
        const defaultFilename = projectData?.projectName
            ? `${projectData.projectName.replace(/[^a-zA-Z0-9ก-ฮ]/g, '-')}-layout.jpg`
            : 'horticulture-layout.jpg';

        const finalOptions = {
            filename: defaultFilename,
            ...options,
        };

        const imageUrl = await createMapImage(mapElement, finalOptions);

        if (imageUrl) {
            downloadImage(imageUrl, finalOptions.filename);
            return true;
        }

        return false;
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการสร้างและดาวน์โหลดภาพ:', error);
        return false;
    }
};

/**
 * สร้างภาพ PDF จากข้อมูลสถิติ (ต้องติดตั้ง jsPDF)
 * @param includeMap รวมภาพแผนที่หรือไม่
 * @param mapElement HTML element ของแผนที่ (ถ้า includeMap = true)
 * @returns Promise<boolean> สำเร็จหรือไม่
 */
export const createPDFReport = async (
    includeMap: boolean = false,
    mapElement?: HTMLElement
): Promise<boolean> => {
    try {
        const stats = getProjectStats();
        if (!stats) {
            console.error('❌ ไม่พบข้อมูลสถิติ');
            return false;
        }

        const jsPDFModule = await import('jspdf');
        const jsPDF = jsPDFModule.default;

        const doc = new jsPDF('p', 'mm', 'a4');

        let yPosition = 20;

        doc.setFontSize(20);
        doc.text('รายงานโครงการระบบน้ำสวนผลไม้', 105, yPosition, { align: 'center' });
        yPosition += 15;

        doc.setFontSize(16);
        doc.text('ข้อมูลโดยรวม', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(12);
        doc.text(`พื้นที่รวม: ${formatAreaInRai(stats.totalAreaInRai)}`, 20, yPosition);
        yPosition += 7;
        doc.text(`จำนวนโซน: ${stats.totalZones} โซน`, 20, yPosition);
        yPosition += 7;
        doc.text(`จำนวนต้นไม้: ${stats.totalPlants.toLocaleString()} ต้น`, 20, yPosition);
        yPosition += 7;
        doc.text(
            `ปริมาณน้ำต่อครั้ง: ${formatWaterVolume(stats.totalWaterNeedPerSession)}`,
            20,
            yPosition
        );
        yPosition += 15;

        doc.setFontSize(16);
        doc.text('ระบบท่อ', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(12);
        doc.text(`ท่อเมนยาวที่สุด: ${formatDistance(stats.mainPipes.longest)}`, 20, yPosition);
        yPosition += 7;
        doc.text(`ท่อเมนยาวรวม: ${formatDistance(stats.mainPipes.totalLength)}`, 20, yPosition);
        yPosition += 7;
        doc.text(
            `ท่อเมนรองยาวที่สุด: ${formatDistance(stats.subMainPipes.longest)}`,
            20,
            yPosition
        );
        yPosition += 7;
        doc.text(
            `ท่อเมนรองยาวรวม: ${formatDistance(stats.subMainPipes.totalLength)}`,
            20,
            yPosition
        );
        yPosition += 7;
        doc.text(`ท่อย่อยยาวที่สุด: ${formatDistance(stats.branchPipes.longest)}`, 20, yPosition);
        yPosition += 7;
        doc.text(`ท่อย่อยยาวรวม: ${formatDistance(stats.branchPipes.totalLength)}`, 20, yPosition);
        yPosition += 7;
        doc.text(
            `ท่อที่ยาวที่สุดรวมกัน: ${formatDistance(stats.longestPipesCombined)}`,
            20,
            yPosition
        );
        yPosition += 15;

        if (stats.zoneDetails.length > 1) {
            doc.setFontSize(16);
            doc.text('รายละเอียดแต่ละโซน', 20, yPosition);
            yPosition += 10;

            doc.setFontSize(12);
            stats.zoneDetails.forEach((zone, index) => {
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                }

                doc.text(`${index + 1}. ${zone.zoneName}`, 20, yPosition);
                yPosition += 7;
                doc.text(`   พื้นที่: ${formatAreaInRai(zone.areaInRai)}`, 25, yPosition);
                yPosition += 5;
                doc.text(`   ต้นไม้: ${zone.plantCount.toLocaleString()} ต้น`, 25, yPosition);
                yPosition += 5;
                doc.text(
                    `   น้ำต่อครั้ง: ${formatWaterVolume(zone.waterNeedPerSession)}`,
                    25,
                    yPosition
                );
                yPosition += 8;
            });
        }

        if (includeMap && mapElement) {
            const mapImage = await createMapImage(mapElement, { scale: 1, quality: 0.8 });
            if (mapImage) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text('แผนผังโครงการ', 105, 20, { align: 'center' });

                const imgWidth = 170;
                const imgHeight = 120;
                doc.addImage(mapImage, 'JPEG', 20, 30, imgWidth, imgHeight);
            }
        }

        const projectData = loadProjectData();
        const filename = projectData?.projectName
            ? `${projectData.projectName.replace(/[^a-zA-Z0-9ก-ฮ]/g, '-')}-report.pdf`
            : 'horticulture-report.pdf';

        doc.save(filename);
        return true;
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการสร้าง PDF:', error);
        return false;
    }
};

/**
 * Download stats as JSON file
 * @param filename name of the file (without extension)
 */
export const downloadStatsAsJSON = (filename: string = 'horticulture-stats'): void => {
    const jsonData = exportStatsAsJSON();
    if (!jsonData) {
        console.error('ไม่มีข้อมูลสถิติให้ดาวน์โหลด');
        return;
    }

    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

/**
 * Download stats as CSV file
 * @param filename name of the file (without extension)
 */
export const downloadStatsAsCSV = (filename: string = 'horticulture-stats'): void => {
    const csvData = exportStatsAsCSV();
    if (!csvData) {
        console.error('ไม่มีข้อมูลสถิติให้ดาวน์โหลด');
        return;
    }

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

/**
 * Get formatted stats พร้อมข้อมูลหัวฉีด
 * @returns Formatted string of stats or null if no data
 */
export const getFormattedStats = (): string | null => {
    const stats = getProjectStats();
    if (!stats) return null;

    const overallStats = getOverallStats();

    let formatted = `📊 รายงานสถิติโครงการระบบน้ำสวนผลไม้\n\n`;

    formatted += `📐 ข้อมูลโดยรวม:\n`;
    formatted += `  • พื้นที่รวม: ${formatAreaInRai(stats.totalAreaInRai)}\n`;
    formatted += `  • จำนวนโซน: ${stats.totalZones} โซน\n`;
    formatted += `  • จำนวนต้นไม้: ${stats.totalPlants.toLocaleString()} ต้น\n`;
    formatted += `  • ปริมาณน้ำต่อครั้ง: ${formatWaterVolume(stats.totalWaterNeedPerSession)}\n`;

    // เพิ่มข้อมูลหัวฉีด
    if (overallStats?.sprinklerFlowRate) {
        formatted += `\n🚿 ข้อมูลหัวฉีด:\n`;
        formatted += `  • อัตราการไหลต่อต้น: ${overallStats.sprinklerFlowRate.flowRatePerPlant.toFixed(2)} ลิตร/นาที\n`;
        formatted += `  • Q รวมต่อนาที: ${overallStats.sprinklerFlowRate.formattedFlowRatePerMinute}\n`;
        formatted += `  • Q รวมต่อชั่วโมง: ${overallStats.sprinklerFlowRate.formattedFlowRatePerHour}\n`;
        formatted += `  • แรงดันน้ำ: ${overallStats.sprinklerFlowRate.pressureBar.toFixed(1)} บาร์\n`;
        formatted += `  • รัศมีฉีด: ${overallStats.sprinklerFlowRate.radiusMeters.toFixed(1)} เมตร\n`;
    }
    formatted += `\n`;

    formatted += `🔧 ระบบท่อ:\n`;
    formatted += `  • ท่อเมนยาวที่สุด: ${formatDistance(stats.mainPipes.longest)}\n`;
    formatted += `  • ท่อเมนยาวรวม: ${formatDistance(stats.mainPipes.totalLength)}\n`;
    formatted += `  • ท่อเมนรองยาวที่สุด: ${formatDistance(stats.subMainPipes.longest)}\n`;
    formatted += `  • ท่อเมนรองยาวรวม: ${formatDistance(stats.subMainPipes.totalLength)}\n`;
    formatted += `  • ท่อย่อยยาวที่สุด: ${formatDistance(stats.branchPipes.longest)}\n`;
    formatted += `  • ท่อย่อยยาวรวม: ${formatDistance(stats.branchPipes.totalLength)}\n`;
    formatted += `  • ท่อที่ยาวที่สุดรวมกัน: ${formatDistance(stats.longestPipesCombined)}\n\n`;

    if (stats.zoneDetails.length > 1) {
        formatted += `🏞️ รายละเอียดแต่ละโซน:\n`;
        stats.zoneDetails.forEach((zone, index) => {
            formatted += `  ${index + 1}. ${zone.zoneName}:\n`;
            formatted += `     • พื้นที่: ${formatAreaInRai(zone.areaInRai)}\n`;
            formatted += `     • ต้นไม้: ${zone.plantCount.toLocaleString()} ต้น\n`;
            formatted += `     • น้ำต่อครั้ง: ${formatWaterVolume(zone.waterNeedPerSession)}\n`;
            formatted += `     • ท่อเมนยาวที่สุด: ${formatDistance(zone.mainPipesInZone.longest)}\n`;
            formatted += `     • ท่อเมนรองยาวที่สุด: ${formatDistance(zone.subMainPipesInZone.longest)}\n`;
            formatted += `     • ท่อย่อยยาวที่สุด: ${formatDistance(zone.branchPipesInZone.longest)}\n`;
        });
    }

    formatted += `\n📅 สร้างรายงาน: ${new Date().toLocaleDateString('th-TH')}`;

    return formatted;
};

/**
 * Debug stats
 */
export const debugProjectStats = (): void => {
    console.group('🔍 Debug Project Statistics');

    const stats = getProjectStats();
    if (!stats) {
        console.groupEnd();
        return;
    }

    console.groupEnd();
};

if (typeof window !== 'undefined') {
    (window as unknown as { horticultureStats: unknown }).horticultureStats = {
        getProjectStats,
        getOverallStats,
        getPipeStats,
        getZoneStats,
        getZoneStatsById,
        exportStatsAsJSON,
        exportStatsAsCSV,
        downloadStatsAsJSON,
        downloadStatsAsCSV,
        getFormattedStats,
        debugProjectStats,
        createMapImage,
        downloadImage,
        createAndDownloadMapImage,
        createPDFReport,
        getLongestBranchPipeStats,
        getSubMainPipeBranchCount,
        getDetailedBranchPipeStats,
        exportBranchPipeStatsAsJSON,
        exportBranchPipeStatsAsCSV,
        downloadBranchPipeStatsAsJSON,
        downloadBranchPipeStatsAsCSV,
        getFormattedBranchPipeStats,
    };
}

export default {
    getProjectStats,
    getProjectStatsFromData,
    getOverallStats,
    getPipeStats,
    getZoneStats,
    getZoneStatsById,
    exportStatsAsJSON,
    exportStatsAsCSV,
    downloadStatsAsJSON,
    downloadStatsAsCSV,
    getFormattedStats,
    debugProjectStats,
    createMapImage,
    downloadImage,
    createAndDownloadMapImage,
    createPDFReport,
    getLongestBranchPipeStats,
    getSubMainPipeBranchCount,
    getDetailedBranchPipeStats,
    exportBranchPipeStatsAsJSON,
    exportBranchPipeStatsAsCSV,
    downloadBranchPipeStatsAsJSON,
    downloadBranchPipeStatsAsCSV,
    getFormattedBranchPipeStats,
};
