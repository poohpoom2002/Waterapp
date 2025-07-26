/**
 * horticultureProjectStats.ts
 * ไฟล์สำหรับส่งออกข้อมูลสถิติโครงการระบบน้ำสวนผลไม้
 * รวมถึงการสร้างและดาวน์โหลดภาพแผนที่
 * สามารถ import เพื่อนำไปใช้ในไฟล์อื่นๆ ได้
 */

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
        console.log('✅ ดึงข้อมูลสถิติโครงการสำเร็จ');
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
 * ดึงข้อมูลโดยรวมของโครงการ
 * @returns ข้อมูลโดยรวม หรือ null ถ้าไม่มีข้อมูล
 */
export const getOverallStats = (): {
    totalAreaInRai: number;
    totalZones: number;
    totalPlants: number;
    totalWaterNeedPerSession: number;
    longestPipesCombined: number;
} | null => {
    const stats = getProjectStats();
    if (!stats) return null;

    return {
        totalAreaInRai: stats.totalAreaInRai,
        totalZones: stats.totalZones,
        totalPlants: stats.totalPlants,
        totalWaterNeedPerSession: stats.totalWaterNeedPerSession,
        longestPipesCombined: stats.longestPipesCombined,
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

        if (projectData.useZones && projectData.zones && projectData.zones.length > 0) {
            // โหมดหลายโซน
            projectData.zones.forEach((zone) => {
                // หาท่อเมนรองในโซนนี้
                const zoneSubMainPipes =
                    projectData.subMainPipes?.filter((pipe) => pipe.zoneId === zone.id) || [];

                // หาท่อย่อยทั้งหมดในโซนนี้
                const allBranchPipes = zoneSubMainPipes.flatMap(
                    (subMain) => subMain.branchPipes || []
                );

                if (allBranchPipes.length > 0) {
                    // หาท่อย่อยที่ยาวที่สุด
                    const longestBranchPipe = allBranchPipes.reduce((longest, current) =>
                        current.length > longest.length ? current : longest
                    );

                    // นับจำนวนต้นไม้ในท่อย่อยที่ยาวที่สุด
                    const plantCount = longestBranchPipe.plants?.length || 0;
                    const plantNames =
                        longestBranchPipe.plants?.map((plant) => plant.plantData.name) || [];

                    stats.push({
                        zoneId: zone.id,
                        zoneName: zone.name,
                        longestBranchPipe: {
                            id: longestBranchPipe.id,
                            length: longestBranchPipe.length,
                            plantCount,
                            plantNames,
                        },
                    });
                }
            });
        } else {
            // โหมดโซนเดียว
            const allBranchPipes =
                projectData.subMainPipes?.flatMap((subMain) => subMain.branchPipes || []) || [];

            if (allBranchPipes.length > 0) {
                // หาท่อย่อยที่ยาวที่สุด
                const longestBranchPipe = allBranchPipes.reduce((longest, current) =>
                    current.length > longest.length ? current : longest
                );

                // นับจำนวนต้นไม้ในท่อย่อยที่ยาวที่สุด
                const plantCount = longestBranchPipe.plants?.length || 0;
                const plantNames =
                    longestBranchPipe.plants?.map((plant) => plant.plantData.name) || [];

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
        }

        console.log('✅ ดึงข้อมูลท่อย่อยที่ยาวที่สุดสำเร็จ:', stats);
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

        if (projectData.useZones && projectData.zones && projectData.zones.length > 0) {
            // โหมดหลายโซน
            projectData.zones.forEach((zone) => {
                // หาท่อเมนรองในโซนนี้
                const zoneSubMainPipes =
                    projectData.subMainPipes?.filter((pipe) => pipe.zoneId === zone.id) || [];

                const subMainPipesData = zoneSubMainPipes.map((subMain) => {
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
                        zoneId: zone.id,
                        zoneName: zone.name,
                        subMainPipes: subMainPipesData,
                    });
                }
            });
        } else {
            // โหมดโซนเดียว
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
        }

        console.log('✅ ดึงข้อมูลจำนวนท่อย่อยที่ออกจากท่อเมนรองสำเร็จ:', stats);
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

        // รวมข้อมูลจากทั้งสองฟังก์ชัน
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

        console.log('✅ ดึงข้อมูลสถิติท่อย่อยแบบละเอียดสำเร็จ:', detailedStats);
        return detailedStats;
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลสถิติท่อย่อยแบบละเอียด:', error);
        return null;
    }
};

/**
 * ส่งออกข้อมูลท่อย่อยเป็น JSON string
 * @returns JSON string ของข้อมูลท่อย่อย หรือ null ถ้าไม่มีข้อมูล
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
 * ส่งออกข้อมูลท่อย่อยเป็น CSV string
 * @returns CSV string ของข้อมูลท่อย่อย หรือ null ถ้าไม่มีข้อมูล
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
            // กรณีไม่มีท่อเมนรอง
            csv += `"${zone.zoneId}","${zone.zoneName}","${zone.longestBranchPipe.id}",${zone.longestBranchPipe.length.toFixed(2)},${zone.longestBranchPipe.plantCount},"${zone.longestBranchPipe.plantNames.join(', ')}","","","",""\n`;
        }
    });

    return csv;
};

/**
 * ดาวน์โหลดข้อมูลท่อย่อยเป็นไฟล์ JSON
 * @param filename ชื่อไฟล์ (ไม่รวมนามสกุล)
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

    console.log('✅ ดาวน์โหลดไฟล์ JSON ท่อย่อยสำเร็จ');
};

/**
 * ดาวน์โหลดข้อมูลท่อย่อยเป็นไฟล์ CSV
 * @param filename ชื่อไฟล์ (ไม่รวมนามสกุล)
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

    console.log('✅ ดาวน์โหลดไฟล์ CSV ท่อย่อยสำเร็จ');
};

/**
 * แสดงข้อมูลท่อย่อยในรูปแบบที่อ่านง่าย
 * @returns สตริงข้อมูลท่อย่อยที่จัดรูปแบบแล้ว หรือ null ถ้าไม่มีข้อมูล
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
 * ส่งออกข้อมูลสถิติเป็น JSON string
 * @returns JSON string ของข้อมูลสถิติ หรือ null ถ้าไม่มีข้อมูล
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
 * ส่งออกข้อมูลสถิติเป็น CSV string
 * @returns CSV string ของข้อมูลสธิติ หรือ null ถ้าไม่มีข้อมูล
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
 * สร้างภาพแผนที่จาก HTML element
 * @param mapElement HTML element ของแผนที่
 * @param options ตัวเลือกการสร้างภาพ
 * @returns Promise<string | null> Data URL ของภาพ หรือ null ถ้าไม่สำเร็จ
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
        console.log('🖼️ เริ่มสร้างภาพแผนที่...');

        // รอให้แผนที่โหลดเสร็จ
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
                    // ลบ controls ที่ไม่ต้องการออกจากภาพ
                    const controls = clonedDoc.querySelectorAll('.leaflet-control-container');
                    controls.forEach((el) => el.remove());

                    // ปรับสีที่อาจมีปัญหา
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
        console.log('✅ สร้างภาพแผนที่สำเร็จ');
        return dataUrl;
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการสร้างภาพ:', error);

        // สร้างภาพ fallback
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
 * ดาวน์โหลดภาพ
 * @param dataUrl Data URL ของภาพ
 * @param filename ชื่อไฟล์ (รวมนามสกุล)
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

        console.log('✅ ดาวน์โหลดภาพสำเร็จ:', filename);
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการดาวน์โหลดภาพ:', error);
        try {
            // ลองเปิดในหน้าต่างใหม่แทน
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

        // ใช้ dynamic import สำหรับ jsPDF
        const jsPDFModule = await import('jspdf');
        const jsPDF = jsPDFModule.default;

        const doc = new jsPDF('p', 'mm', 'a4');

        // เพิ่มฟอนต์ภาษาไทย (ถ้ามี)
        // doc.addFont('path/to/thai-font.ttf', 'THSarabunNew', 'normal');
        // doc.setFont('THSarabunNew');

        let yPosition = 20;

        // หัวข้อ
        doc.setFontSize(20);
        doc.text('รายงานโครงการระบบน้ำสวนผลไม้', 105, yPosition, { align: 'center' });
        yPosition += 15;

        // ข้อมูลโดยรวม
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

        // ระบบท่อ
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

        // ข้อมูลโซน
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

        // เพิ่มภาพแผนที่ (ถ้าต้องการ)
        if (includeMap && mapElement) {
            const mapImage = await createMapImage(mapElement, { scale: 1, quality: 0.8 });
            if (mapImage) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text('แผนผังโครงการ', 105, 20, { align: 'center' });

                // ปรับขนาดภาพให้พอดีกับหน้า A4
                const imgWidth = 170;
                const imgHeight = 120;
                doc.addImage(mapImage, 'JPEG', 20, 30, imgWidth, imgHeight);
            }
        }

        // บันทึกไฟล์
        const projectData = loadProjectData();
        const filename = projectData?.projectName
            ? `${projectData.projectName.replace(/[^a-zA-Z0-9ก-ฮ]/g, '-')}-report.pdf`
            : 'horticulture-report.pdf';

        doc.save(filename);
        console.log('✅ สร้างไฟล์ PDF สำเร็จ');
        return true;
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการสร้าง PDF:', error);
        return false;
    }
};

/**
 * ดาวน์โหลดข้อมูลสถิติเป็นไฟล์ JSON
 * @param filename ชื่อไฟล์ (ไม่รวมนามสกุล)
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

    console.log('✅ ดาวน์โหลดไฟล์ JSON สำเร็จ');
};

/**
 * ดาวน์โหลดข้อมูลสถิติเป็นไฟล์ CSV
 * @param filename ชื่อไฟล์ (ไม่รวมนามสกุล)
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

    console.log('✅ ดาวน์โหลดไฟล์ CSV สำเร็จ');
};

/**
 * แสดงข้อมูลสถิติในรูปแบบที่อ่านง่าย
 * @returns สตริงข้อมูลสถิติที่จัดรูปแบบแล้ว หรือ null ถ้าไม่มีข้อมูล
 */
export const getFormattedStats = (): string | null => {
    const stats = getProjectStats();
    if (!stats) return null;

    let formatted = `📊 รายงานสถิติโครงการระบบน้ำสวนผลไม้\n\n`;

    formatted += `📐 ข้อมูลโดยรวม:\n`;
    formatted += `  • พื้นที่รวม: ${formatAreaInRai(stats.totalAreaInRai)}\n`;
    formatted += `  • จำนวนโซน: ${stats.totalZones} โซน\n`;
    formatted += `  • จำนวนต้นไม้: ${stats.totalPlants.toLocaleString()} ต้น\n`;
    formatted += `  • ปริมาณน้ำต่อครั้ง: ${formatWaterVolume(stats.totalWaterNeedPerSession)}\n\n`;

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
 * Debug ข้อมูลสถิติ
 */
export const debugProjectStats = (): void => {
    console.group('🔍 Debug Project Statistics');

    const stats = getProjectStats();
    if (!stats) {
        console.log('❌ ไม่พบข้อมูลสถิติ');
        console.groupEnd();
        return;
    }

    console.log('📊 ข้อมูลโดยรวม:');
    console.log(`  พื้นที่: ${stats.totalAreaInRai.toFixed(2)} ไร่`);
    console.log(`  โซน: ${stats.totalZones}`);
    console.log(`  ต้นไม้: ${stats.totalPlants}`);
    console.log(`  น้ำ: ${stats.totalWaterNeedPerSession} ลิตร`);

    console.log('🔧 ระบบท่อ:');
    console.log(`  ท่อเมนยาวที่สุด: ${stats.mainPipes.longest.toFixed(2)} ม.`);
    console.log(`  ท่อเมนรองยาวที่สุด: ${stats.subMainPipes.longest.toFixed(2)} ม.`);
    console.log(`  ท่อย่อยยาวที่สุด: ${stats.branchPipes.longest.toFixed(2)} ม.`);
    console.log(`  ท่อยาวที่สุดรวม: ${stats.longestPipesCombined.toFixed(2)} ม.`);

    console.log('🏞️ โซน:');
    stats.zoneDetails.forEach((zone, index) => {
        console.log(
            `  ${index + 1}. ${zone.zoneName}: ${zone.areaInRai.toFixed(2)} ไร่, ${zone.plantCount} ต้น`
        );
    });

    console.groupEnd();
};

// ทำให้ฟังก์ชันเหล่านี้สามารถเรียกใช้จาก window ได้ (สำหรับ debugging)
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
        // ฟังก์ชันใหม่สำหรับท่อย่อย
        getLongestBranchPipeStats,
        getSubMainPipeBranchCount,
        getDetailedBranchPipeStats,
        exportBranchPipeStatsAsJSON,
        exportBranchPipeStatsAsCSV,
        downloadBranchPipeStatsAsJSON,
        downloadBranchPipeStatsAsCSV,
        getFormattedBranchPipeStats,
    };

    console.log('🌱 Horticulture Project Stats API available at window.horticultureStats');
    console.log('📷 Image functions: createMapImage, downloadImage, createAndDownloadMapImage');
    console.log('📄 PDF function: createPDFReport');
    console.log(
        '🔧 Branch pipe functions: getLongestBranchPipeStats, getSubMainPipeBranchCount, getDetailedBranchPipeStats'
    );
}

// ตัวอย่างการใช้งานฟังก์ชันใหม่
/**
 * ตัวอย่างการใช้งานฟังก์ชันท่อย่อย:
 *
 * // 1. ดึงข้อมูลท่อย่อยที่ยาวที่สุดในแต่ละโซน
 * const longestBranchStats = getLongestBranchPipeStats();
 * console.log('ท่อย่อยที่ยาวที่สุด:', longestBranchStats);
 *
 * // 2. ดึงข้อมูลจำนวนท่อย่อยที่ออกจากท่อเมนรอง
 * const subMainBranchCount = getSubMainPipeBranchCount();
 * console.log('จำนวนท่อย่อยจากท่อเมนรอง:', subMainBranchCount);
 *
 * // 3. ดึงข้อมูลสถิติท่อย่อยแบบละเอียด
 * const detailedStats = getDetailedBranchPipeStats();
 * console.log('สถิติท่อย่อยแบบละเอียด:', detailedStats);
 *
 * // 4. Export เป็น JSON
 * downloadBranchPipeStatsAsJSON('my-project-branch-stats');
 *
 * // 5. Export เป็น CSV
 * downloadBranchPipeStatsAsCSV('my-project-branch-stats');
 *
 * // 6. แสดงข้อมูลในรูปแบบที่อ่านง่าย
 * const formattedStats = getFormattedBranchPipeStats();
 * console.log(formattedStats);
 */

// Export default object สำหรับ import ทั้งหมด
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
    // ฟังก์ชันใหม่สำหรับท่อย่อย
    getLongestBranchPipeStats,
    getSubMainPipeBranchCount,
    getDetailedBranchPipeStats,
    exportBranchPipeStatsAsJSON,
    exportBranchPipeStatsAsCSV,
    downloadBranchPipeStatsAsJSON,
    downloadBranchPipeStatsAsCSV,
    getFormattedBranchPipeStats,
};
