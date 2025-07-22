// // resources\js\pages\components\SystemSummary.tsx
// import React from 'react';
// import { HorticultureProjectData } from '../../utils/horticultureUtils';

// interface SystemSummaryProps {
//     projectData: HorticultureProjectData;
//     zoneSprinklers: { [zoneId: string]: any };
//     selectedPipes: { [zoneId: string]: { branch?: any; secondary?: any; main?: any } };
//     selectedPump: any;
//     results: any;
// }

// const SystemSummary: React.FC<SystemSummaryProps> = ({
//     projectData,
//     zoneSprinklers,
//     selectedPipes,
//     selectedPump,
//     results,
// }) => {
//     const calculateSystemStats = () => {
//         const stats = {
//             totalZones: projectData.useZones ? projectData.zones.length : 1,
//             totalArea: projectData.totalArea / 1600,
//             totalTrees: 0,
//             uniqueSprinklers: new Set(),
//             uniqueBranchPipes: new Set(),
//             uniqueSecondaryPipes: new Set(),
//             uniqueMainPipes: new Set(),
//             totalEstimatedCost: 0,
//             zonesWithSprinklers: 0,
//             systemComplexity: 'simple' as 'simple' | 'medium' | 'complex',
//         };

//         if (projectData.useZones && projectData.zones.length > 1) {
//             projectData.zones.forEach((zone) => {
//                 stats.totalTrees += zone.plantCount;

//                 const zoneSprinkler = zoneSprinklers[zone.id];
//                 if (zoneSprinkler) {
//                     stats.uniqueSprinklers.add(`${zoneSprinkler.id}-${zoneSprinkler.name}`);
//                     stats.zonesWithSprinklers++;
//                     stats.totalEstimatedCost += zoneSprinkler.price * zone.plantCount;
//                 }

//                 const zonePipes = selectedPipes[zone.id] || {};
//                 if (zonePipes.branch) {
//                     stats.uniqueBranchPipes.add(`${zonePipes.branch.id}-${zonePipes.branch.name}`);
//                 }
//                 if (zonePipes.secondary) {
//                     stats.uniqueSecondaryPipes.add(
//                         `${zonePipes.secondary.id}-${zonePipes.secondary.name}`
//                     );
//                 }
//                 if (zonePipes.main) {
//                     stats.uniqueMainPipes.add(`${zonePipes.main.id}-${zonePipes.main.name}`);
//                 }
//             });
//         } else {
//             stats.totalTrees = projectData.plants?.length || 0;
//             const sprinkler = zoneSprinklers['main-area'];
//             if (sprinkler) {
//                 stats.uniqueSprinklers.add(`${sprinkler.id}-${sprinkler.name}`);
//                 stats.zonesWithSprinklers = 1;
//                 stats.totalEstimatedCost += sprinkler.price * stats.totalTrees;
//             }
//         }

//         const pump = selectedPump || results?.autoSelectedPump;
//         if (pump) {
//             stats.totalEstimatedCost += pump.price;
//         }

//         if (stats.uniqueMainPipes.size > 0 && stats.uniqueSecondaryPipes.size > 0) {
//             stats.systemComplexity = 'complex';
//         } else if (stats.uniqueSecondaryPipes.size > 0 || stats.totalZones > 1) {
//             stats.systemComplexity = 'medium';
//         }

//         return {
//             ...stats,
//             uniqueSprinklers: stats.uniqueSprinklers.size,
//             uniqueBranchPipes: stats.uniqueBranchPipes.size,
//             uniqueSecondaryPipes: stats.uniqueSecondaryPipes.size,
//             uniqueMainPipes: stats.uniqueMainPipes.size,
//         };
//     };

//     const stats = calculateSystemStats();

//     const completionPercentage =
//         projectData.useZones && projectData.zones.length > 1
//             ? Math.round((stats.zonesWithSprinklers / stats.totalZones) * 100)
//             : Object.keys(zoneSprinklers).length > 0
//               ? 100
//               : 0;

//     const getSystemStatus = () => {
//         if (completionPercentage === 100) {
//             return { status: 'complete', color: 'text-green-400', icon: '✅' };
//         } else if (completionPercentage > 50) {
//             return { status: 'partial', color: 'text-yellow-400', icon: '⚠️' };
//         } else {
//             return { status: 'incomplete', color: 'text-red-400', icon: '❌' };
//         }
//     };

//     const systemStatus = getSystemStatus();

//     return (
//         <div className="rounded-lg border border-gray-600 bg-gradient-to-r from-gray-800 to-gray-700 p-6">
//             <h2 className="mb-4 text-xl font-semibold text-blue-400">🏗️ สรุปภาพรวมระบบ</h2>

//             <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
//                 <div className="rounded bg-gray-600 p-4 text-center">
//                     <div className={`text-2xl font-bold ${systemStatus.color}`}>
//                         {systemStatus.icon} {completionPercentage}%
//                     </div>
//                     <p className="text-sm text-gray-300">ความสมบูรณ์</p>
//                     <p className="text-xs text-gray-400">
//                         ({stats.zonesWithSprinklers}/{stats.totalZones} โซน)
//                     </p>
//                 </div>
//                 <div className="rounded bg-gray-600 p-4 text-center">
//                     <div className="text-2xl font-bold text-purple-400">
//                         {stats.systemComplexity === 'complex'
//                             ? '🔧🔧🔧'
//                             : stats.systemComplexity === 'medium'
//                               ? '🔧🔧'
//                               : '🔧'}
//                     </div>
//                     <p className="text-sm text-gray-300">ความซับซ้อน</p>
//                     <p className="text-xs capitalize text-gray-400">{stats.systemComplexity}</p>
//                 </div>
//                 <div className="rounded bg-gray-600 p-4 text-center">
//                     <div className="text-2xl font-bold text-green-400">
//                         {stats.totalEstimatedCost.toLocaleString()} ฿
//                     </div>
//                     <p className="text-sm text-gray-300">ประมาณการต้นทุน</p>
//                     <p className="text-xs text-gray-400">
//                         {stats.totalArea >= 1600 ? <p>({Math.round(stats.totalEstimatedCost / (stats.totalArea)).toLocaleString()} ฿/ไร่)</p> : <p>({Math.round(stats.totalEstimatedCost / (stats.totalArea/1600)).toLocaleString()} ฿/ตร.ม.)</p>}
//                     </p>
//                 </div>
//             </div>

//             <div className="mb-4 rounded bg-blue-900 p-4">
//                 <h3 className="mb-2 text-lg font-semibold text-blue-300">📊 ข้อมูลโครงการ</h3>
//                 <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
//                     <div>
//                         <p className="text-blue-200">ชื่อโครงการ:</p>
//                         <p className="font-medium text-white">{projectData.projectName}</p>
//                     </div>
//                     <div>
//                         <p className="text-blue-200">พื้นที่รวม:</p>
//                         <p className="font-medium text-white">{stats.totalArea >= 1600 ? <p>{(stats.totalArea / 1600).toFixed(1)} ไร่</p> : <p>{stats.totalArea.toFixed(2)} ตร.ม.</p>}</p>
//                     </div>
//                     <div>
//                         <p className="text-blue-200">จำนวนต้นไม้:</p>
//                         <p className="font-medium text-white">
//                             {stats.totalTrees.toLocaleString()} ต้น
//                         </p>
//                     </div>
//                     <div>
//                         <p className="text-blue-200">จำนวนโซน:</p>
//                         <p className="font-medium text-white">{stats.totalZones} โซน</p>
//                     </div>
//                 </div>
//             </div>

//             <div className="mb-4 rounded bg-purple-900 p-4">
//                 <h3 className="mb-2 text-lg font-semibold text-purple-300">🔧 สรุปอุปกรณ์</h3>
//                 <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
//                     <div className="text-center">
//                         <div className="text-xl font-bold text-green-400">
//                             {stats.uniqueSprinklers}
//                         </div>
//                         <p className="text-purple-200">ชนิดสปริงเกอร์</p>
//                     </div>
//                     <div className="text-center">
//                         <div className="text-xl font-bold text-purple-400">
//                             {stats.uniqueBranchPipes}
//                         </div>
//                         <p className="text-purple-200">ชนิดท่อย่อย</p>
//                     </div>
//                     <div className="text-center">
//                         <div className="text-xl font-bold text-orange-400">
//                             {stats.uniqueSecondaryPipes}
//                         </div>
//                         <p className="text-purple-200">ชนิดท่อรอง</p>
//                     </div>
//                     <div className="text-center">
//                         <div className="text-xl font-bold text-cyan-400">
//                             {stats.uniqueMainPipes}
//                         </div>
//                         <p className="text-purple-200">ชนิดท่อหลัก</p>
//                     </div>
//                     <div className="text-center">
//                         <div className="text-xl font-bold text-red-400">1</div>
//                         <p className="text-purple-200">ปั๊มน้ำ</p>
//                     </div>
//                 </div>
//             </div>

//             {projectData.useZones && projectData.zones.length > 1 && (
//                 <div className="mb-4 rounded bg-green-900 p-4">
//                     <h3 className="mb-2 text-lg font-semibold text-green-300">🌱 สถานะแต่ละโซน</h3>
//                     <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
//                         {projectData.zones.map((zone) => {
//                             const hassprinkler = !!zoneSprinklers[zone.id];
//                             const pipes = selectedPipes[zone.id] || {};
//                             const hasEquipment = hassprinkler;

//                             return (
//                                 <div
//                                     key={zone.id}
//                                     className="flex items-center justify-between rounded bg-green-800 p-2"
//                                 >
//                                     <div className="flex items-center space-x-3">
//                                         <div
//                                             className={`h-4 w-4 rounded-full ${hasEquipment ? 'bg-green-400' : 'bg-red-400'}`}
//                                         ></div>
//                                         <div>
//                                             <p className="font-medium text-white">{zone.name}</p>
//                                             <p className="text-xs text-green-200">
//                                                 {zone.area >= 1600 ? <p>{(zone.area / 1600).toFixed(1)} ไร่</p> : <p>{zone.area.toFixed(2)} ตร.ม.</p>} {' '}
//                                                 {zone.plantCount} ต้น
//                                             </p>
//                                         </div>
//                                     </div>
//                                     <div className="text-right text-sm">
//                                         <p
//                                             className={
//                                                 hassprinkler ? 'text-green-300' : 'text-red-300'
//                                             }
//                                         >
//                                             {hassprinkler ? '✅ พร้อม' : '❌ ไม่พร้อม'}
//                                         </p>
//                                         <p className="text-xs text-green-200">
//                                             {hassprinkler
//                                                 ? zoneSprinklers[zone.id].name
//                                                 : 'ยังไม่เลือกสปริงเกอร์'}
//                                         </p>
//                                     </div>
//                                 </div>
//                             );
//                         })}
//                     </div>
//                 </div>
//             )}

//             <div className="rounded bg-yellow-900 p-4">
//                 <h3 className="mb-2 text-lg font-semibold text-yellow-300">💡 คำแนะนำ</h3>
//                 <div className="space-y-2 text-sm text-yellow-100">
//                     {completionPercentage < 100 && (
//                         <p>• กรุณาเลือกสปริงเกอร์ให้ครบทุกโซนเพื่อให้ระบบคำนวณได้ถูกต้อง</p>
//                     )}
//                     {stats.systemComplexity === 'complex' && (
//                         <p>
//                             • ระบบมีความซับซ้อนสูง ควรพิจารณาติดตั้งอุปกรณ์วัดแรงดันและวาล์วควบคุม
//                         </p>
//                     )}
//                     {stats.totalZones > 3 && (
//                         <p>• ระบบหลายโซน ควรวางแผนการติดตั้งเป็นขั้นตอนเพื่อกระจายต้นทุน</p>
//                     )}
//                     {stats.uniqueSprinklers > 1 && (
//                         <p>• ใช้สปริงเกอร์หลายชนิด ควรจัดทำคู่มือการบำรุงรักษาแยกตามชนิด</p>
//                     )}
//                     <p>• ระบบเลือกอุปกรณ์อัตโนมัติและสามารถปรับแต่งได้ตามความต้องการ</p>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default SystemSummary;
