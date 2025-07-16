// import React, { useState, useEffect } from 'react';
// import { getCropByValue } from '@/pages/utils/cropData';

// interface EnhancedIrrigationControlsProps {
//     zones: any[];
//     zoneAssignments: any;
//     irrigationAssignments: any;
//     setIrrigationAssignments: (assignments: any) => void;
//     irrigationRadius: any;
//     setIrrigationRadius: (radius: any) => void;
//     sprinklerOverlap: any;
//     setSprinklerOverlap: (overlap: any) => void;
//     irrigationSettings: any;
//     setIrrigationSettings: (settings: any) => void;
//     generateIrrigationForZone: (zone: any, irrigationType: string) => void;
//     clearIrrigationForZone: (zoneId: string) => void;
//     zoneSummaries: any;
//     irrigationPoints: any[];
//     irrigationLines: any[];
//     // Add missing handler functions
//     handleIrrigationRadiusChange?: (zoneId: string, newRadius: number) => void;
//     handleDripSpacingChange?: (zoneId: string, newSpacing: number) => void;
//     handleIrrigationTypeChange?: (zoneId: string, irrigationType: string) => void;
// }

// // Enhanced irrigation system types with drip spacing support
// const irrigationTypes = [
//     {
//         category: 'sprinkler',
//         categoryName: 'การให้น้ำแบบฉีดฝอย (Sprinkler Irrigation)',
//         categoryIcon: '💧',
//         systems: [
//             {
//                 value: 'sprinkler',
//                 name: 'สปริงเกลอร์ (Sprinkler)',
//                 icon: '🌿',
//                 description: 'ระบบฉีดน้ำแบบหมุนครอบคลุมพื้นที่กว้าง เหมาะสำหรับพืชไร่',
//                 minRadius: 8,
//                 maxRadius: 12,
//                 defaultRadius: 12,
//                 supportsOverlap: true,
//                 color: '#22C55E',
//             },
//             {
//                 value: 'mini_sprinkler',
//                 name: 'มินิสปริงเกลอร์ (Mini Sprinkler)',
//                 icon: '🌱',
//                 description: 'สปริงเกลอร์ขนาดเล็ก เหมาะสำหรับต้นไม้และพืชผัก',
//                 minRadius: 0.5,
//                 maxRadius: 3,
//                 defaultRadius: 1.5,
//                 supportsOverlap: false,
//                 color: '#3B82F6',
//             },
//         ],
//     },
//     {
//         category: 'localized',
//         categoryName: 'การให้น้ำแบบเฉพาะจุด (Localized Irrigation)',
//         categoryIcon: '🎯',
//         systems: [
//             {
//                 value: 'micro_spray',
//                 name: 'ไมโครสเปรย์ และเจ็ท (Micro Spray & Jet)',
//                 icon: '💦',
//                 description: 'ระบบฉีดน้ำแบบละอองฝอย เหมาะสำหรับพืชที่ต้องการความชื้น',
//                 minRadius: 3,
//                 maxRadius: 8,
//                 defaultRadius: 5,
//                 supportsOverlap: false,
//                 color: '#F59E0B',
//             },
//             {
//                 value: 'drip_tape',
//                 name: 'เทปน้ำหยด (Drip Tape)',
//                 icon: '💧',
//                 description: 'ระบบเทปน้ำหยดตรงรากพืช ประหยัดน้ำมากที่สุด',
//                 minRadius: 0,
//                 maxRadius: 0,
//                 defaultRadius: 0,
//                 supportsOverlap: false,
//                 color: '#06B6D4',
//                 isLinear: true,
//                 minSpacing: 0.2,
//                 maxSpacing: 2.0,
//                 defaultSpacing: 1.0,
//             },
//         ],
//     },
// ];

// export default function EnhancedIrrigationControls({
//     zones,
//     zoneAssignments,
//     irrigationAssignments,
//     setIrrigationAssignments,
//     irrigationRadius,
//     setIrrigationRadius,
//     sprinklerOverlap,
//     setSprinklerOverlap,
//     irrigationSettings,
//     setIrrigationSettings,
//     generateIrrigationForZone,
//     clearIrrigationForZone,
//     zoneSummaries,
//     irrigationPoints,
//     irrigationLines,
//     handleIrrigationRadiusChange,
//     handleDripSpacingChange,
//     handleIrrigationTypeChange,
// }: EnhancedIrrigationControlsProps) {
//     const [selectedZoneForIrrigation, setSelectedZoneForIrrigation] = useState<string | null>(null);
//     const [tempRadius, setTempRadius] = useState<{ [key: string]: number }>({});
//     const [tempSpacing, setTempSpacing] = useState<{ [key: string]: number }>({});

//     // Get all irrigation systems flattened
//     const allIrrigationSystems = irrigationTypes.flatMap((cat) => cat.systems);

//     // ✅ เพิ่มฟังก์ชันเช็คว่ามี irrigation อยู่แล้วหรือไม่
//     const hasIrrigationInZone = (zoneId: string) => {
//         return irrigationPoints.some(point => point.zoneId.toString() === zoneId) || 
//                irrigationLines.some(line => line.zoneId.toString() === zoneId);
//     };

//     // ✅ แก้ไข Handle irrigation type change - ไม่สร้างอัตโนมัติ
//     const handleInternalIrrigationTypeChange = (zoneId: string, irrigationType: string) => {
//         if (handleIrrigationTypeChange) {
//             handleIrrigationTypeChange(zoneId, irrigationType);
//             return;
//         }

//         // Fallback to internal logic - แต่ไม่สร้างอัตโนมัติ
//         const system = allIrrigationSystems.find((sys) => sys.value === irrigationType);
//         if (!system) return;

//         const zone = zones.find((z) => z.id.toString() === zoneId);
//         if (!zone) return;

//         // Clear existing irrigation for this zone first
//         clearIrrigationForZone(zoneId);

//         // Update assignments
//         setIrrigationAssignments((prev: any) => ({ ...prev, [zoneId]: irrigationType }));

//         // Set default radius/spacing immediately based on system type
//         if (system.isLinear) {
//             // For drip tape, set default spacing
//             const defaultSpacing = system.defaultSpacing || 1.0;
//             setIrrigationSettings((prev: any) => ({
//                 ...prev,
//                 [zoneId]: {
//                     ...prev[zoneId],
//                     dripSpacing: defaultSpacing,
//                     type: irrigationType,
//                 },
//             }));
//             setTempSpacing((prev) => ({ ...prev, [zoneId]: defaultSpacing }));
//         } else {
//             // For sprinkler systems, set default radius
//             const defaultRadius = system.defaultRadius;
//             setIrrigationRadius((prev: any) => ({ ...prev, [zoneId]: defaultRadius }));
//             setTempRadius((prev) => ({ ...prev, [zoneId]: defaultRadius }));
//         }

//         // ❌ เอาการสร้างอัตโนมัติออก - ให้ผู้ใช้กดสร้างเอง
//         // setTimeout(() => {
//         //     generateIrrigationForZone(zone, irrigationType);
//         // }, 100);
//     };

//     // ✅ แก้ไข Handle radius change - ไม่ regenerate อัตโนมัติ
//     const handleInternalRadiusChange = (zoneId: string, newRadius: number) => {
//         setTempRadius((prev) => ({ ...prev, [zoneId]: newRadius }));
        
//         if (handleIrrigationRadiusChange) {
//             handleIrrigationRadiusChange(zoneId, newRadius);
//             return;
//         }

//         // เปลี่ยนแค่ค่า radius ไม่ regenerate อัตโนมัติ
//         setIrrigationRadius((prev: any) => ({ ...prev, [zoneId]: newRadius }));

//         // ❌ เอาส่วน regenerate อัตโนมัติออก
//         // const zone = zones.find((z) => z.id.toString() === zoneId);
//         // const irrigationType = irrigationAssignments[zoneId];
//         // if (zone && irrigationType && irrigationType !== 'drip_tape') {
//         //     setTimeout(() => {
//         //         generateIrrigationForZone(zone, irrigationType);
//         //     }, 300);
//         // }
//     };

//     // ✅ แก้ไข Handle drip spacing change - ไม่ regenerate อัตโนมัติ
//     const handleInternalSpacingChange = (zoneId: string, newSpacing: number) => {
//         setTempSpacing((prev) => ({ ...prev, [zoneId]: newSpacing }));
        
//         if (handleDripSpacingChange) {
//             handleDripSpacingChange(zoneId, newSpacing);
//             return;
//         }

//         // เปลี่ยนแค่ค่า spacing ไม่ regenerate อัตโนมัติ
//         setIrrigationSettings((prev: any) => ({
//             ...prev,
//             [zoneId]: {
//                 ...prev[zoneId],
//                 dripSpacing: newSpacing,
//             },
//         }));

//         // ❌ เอาส่วน regenerate อัตโนมัติออก
//         // const zone = zones.find((z) => z.id.toString() === zoneId);
//         // const irrigationType = irrigationAssignments[zoneId];
//         // if (zone && irrigationType === 'drip_tape') {
//         //     setTimeout(() => {
//         //         generateIrrigationForZone(zone, irrigationType);
//         //     }, 300);
//         // }
//     };

//     // ✅ แก้ไข Handle overlap change - ไม่ regenerate อัตโนมัติ
//     const handleOverlapChange = (zoneId: string, overlap: boolean) => {
//         setSprinklerOverlap((prev: any) => ({ ...prev, [zoneId]: overlap }));

//         // ❌ เอาส่วน regenerate อัตโนมัติออก
//         // const zone = zones.find((z) => z.id.toString() === zoneId);
//         // const irrigationType = irrigationAssignments[zoneId];
//         // if (zone && irrigationType && irrigationType !== 'drip_tape') {
//         //     setTimeout(() => {
//         //         generateIrrigationForZone(zone, irrigationType);
//         //     }, 100);
//         // }
//     };

//     // ✅ เพิ่มฟังก์ชัน manual regenerate
//     const handleManualRegenerate = (zoneId: string) => {
//         const zone = zones.find(z => z.id.toString() === zoneId);
//         const irrigationType = irrigationAssignments[zoneId];
        
//         if (zone && irrigationType) {
//             generateIrrigationForZone(zone, irrigationType);
//         }
//     };

//     // Initialize temp values when zones change
//     useEffect(() => {
//         zones.forEach((zone) => {
//             const zoneId = zone.id.toString();
//             const irrigationType = irrigationAssignments[zoneId];
//             const system = allIrrigationSystems.find((sys) => sys.value === irrigationType);

//             if (system) {
//                 if (system.isLinear) {
//                     const currentSpacing = irrigationSettings[zoneId]?.dripSpacing || system.defaultSpacing || 1.0;
//                     setTempSpacing((prev) => ({ ...prev, [zoneId]: currentSpacing }));
//                 } else {
//                     const currentRadius = irrigationRadius[zoneId] || system.defaultRadius;
//                     setTempRadius((prev) => ({ ...prev, [zoneId]: currentRadius }));
//                 }
//             }
//         });
//     }, [zones, irrigationAssignments, irrigationRadius, irrigationSettings, allIrrigationSystems]);

//     return (
//         <div className="space-y-4">
//             <div className="rounded-lg bg-gray-700 p-4">
//                 <h3 className="mb-3 text-lg font-semibold text-cyan-400">💧 Irrigation System</h3>
                
//                 {zones.length === 0 ? (
//                     <p className="text-gray-400">กรุณาสร้างโซนและท่อก่อนติดตั้งระบบน้ำ</p>
//                 ) : (
//                     <div className="space-y-4">
//                         {/* Irrigation Type Selection */}
//                         <div>
//                             <h4 className="mb-2 text-sm font-medium text-white">เลือกชนิดระบบน้ำ</h4>
//                             <div className="space-y-3">
//                                 {irrigationTypes.map((category) => (
//                                     <div key={category.category}>
//                                         <h5 className="mb-2 text-xs font-medium text-gray-300">
//                                             {category.categoryIcon} {category.categoryName}
//                                         </h5>
//                                         <div className="grid grid-cols-1 gap-2">
//                                             {category.systems.map((system) => (
//                                                 <div
//                                                     key={system.value}
//                                                     className="rounded-lg border border-gray-600 bg-gray-800 p-3"
//                                                 >
//                                                     <div className="flex items-center justify-between">
//                                                         <div className="flex items-center space-x-2">
//                                                             <span className="text-lg">{system.icon}</span>
//                                                             <div>
//                                                                 <h6 className="text-sm font-medium text-white">
//                                                                     {system.name}
//                                                                 </h6>
//                                                                 <p className="text-xs text-gray-400">
//                                                                     {system.description}
//                                                                 </p>
//                                                             </div>
//                                                         </div>
//                                                     </div>

//                                                     {/* Zone Assignment */}
//                                                     <div className="mt-3 space-y-2">
//                                                         {zones.map((zone) => {
//                                                             const zoneId = zone.id.toString();
//                                                             const assignedCrop = zoneAssignments[zoneId] 
//                                                                 ? getCropByValue(zoneAssignments[zoneId]) 
//                                                                 : null;
//                                                             const currentIrrigation = irrigationAssignments[zoneId];
//                                                             const isSelected = currentIrrigation === system.value;
//                                                             const zoneIrrigationPoints = irrigationPoints.filter(
//                                                                 (p) => p.zoneId.toString() === zoneId
//                                                             );
//                                                             const zoneIrrigationLines = irrigationLines.filter(
//                                                                 (l) => l.zoneId.toString() === zoneId
//                                                             );
//                                                             const hasIrrigation = hasIrrigationInZone(zoneId);

//                                                             return (
//                                                                 <div key={zoneId} className="space-y-2">
//                                                                     <div className="flex items-center justify-between">
//                                                                         <div className="flex items-center space-x-2">
//                                                                             <div
//                                                                                 className="h-3 w-3 rounded-full border border-white/20"
//                                                                                 style={{ backgroundColor: zone.color }}
//                                                                             ></div>
//                                                                             <span className="text-sm text-white">
//                                                                                 {zone.name}
//                                                                             </span>
//                                                                             {assignedCrop && (
//                                                                                 <span className="text-sm">
//                                                                                     {assignedCrop.icon}
//                                                                                 </span>
//                                                                             )}
//                                                                         </div>
//                                                                         <div className="flex items-center space-x-2">
//                                                                             <button
//                                                                                 onClick={() =>
//                                                                                     handleInternalIrrigationTypeChange(
//                                                                                         zoneId,
//                                                                                         system.value
//                                                                                     )
//                                                                                 }
//                                                                                 className={`rounded px-3 py-1 text-xs transition-colors ${
//                                                                                     isSelected
//                                                                                         ? 'bg-cyan-600 text-white'
//                                                                                         : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
//                                                                                 }`}
//                                                                             >
//                                                                                 {isSelected ? '✓ เลือกแล้ว' : 'เลือก'}
//                                                                             </button>
//                                                                             {isSelected && (
//                                                                                 <button
//                                                                                     onClick={() =>
//                                                                                         clearIrrigationForZone(zoneId)
//                                                                                     }
//                                                                                     className="rounded bg-red-600 px-2 py-1 text-xs text-white transition-colors hover:bg-red-700"
//                                                                                 >
//                                                                                     ลบ
//                                                                                 </button>
//                                                                             )}
//                                                                         </div>
//                                                                     </div>

//                                                                     {/* ✅ Settings for selected irrigation type */}
//                                                                     {isSelected && (
//                                                                         <div className="ml-5 space-y-2 rounded bg-gray-900 p-2">
//                                                                             {system.isLinear ? (
//                                                                                 // Drip tape spacing control
//                                                                                 <div>
//                                                                                     <label className="block text-xs text-gray-300 mb-1">
//                                                                                         ระยะห่างจุดน้ำหยด: {tempSpacing[zoneId]?.toFixed(1) || system.defaultSpacing}m
//                                                                                     </label>
//                                                                                     <div className="flex items-center space-x-2">
//                                                                                         <input
//                                                                                             type="range"
//                                                                                             min={system.minSpacing}
//                                                                                             max={system.maxSpacing}
//                                                                                             step="0.1"
//                                                                                             value={tempSpacing[zoneId] || system.defaultSpacing}
//                                                                                             onChange={(e) =>
//                                                                                                 handleInternalSpacingChange(
//                                                                                                     zoneId,
//                                                                                                     parseFloat(e.target.value)
//                                                                                                 )
//                                                                                             }
//                                                                                             className="flex-1"
//                                                                                         />
//                                                                                         {/* ✅ เพิ่มปุ่ม update manual */}
//                                                                                         {hasIrrigation && (
//                                                                                             <button
//                                                                                                 onClick={() => handleManualRegenerate(zoneId)}
//                                                                                                 className="px-2 py-1 bg-cyan-600 text-white rounded text-xs hover:bg-cyan-700 flex-shrink-0"
//                                                                                                 title="อัพเดทระบบน้ำด้วยค่าใหม่"
//                                                                                             >
//                                                                                                 ↻
//                                                                                             </button>
//                                                                                         )}
//                                                                                     </div>
//                                                                                     <div className="flex justify-between text-xs text-gray-400 mt-1">
//                                                                                         <span>{system.minSpacing}m</span>
//                                                                                         <span>{system.maxSpacing}m</span>
//                                                                                     </div>
//                                                                                 </div>
//                                                                             ) : (
//                                                                                 // Sprinkler radius control
//                                                                                 <div>
//                                                                                     <label className="block text-xs text-gray-300 mb-1">
//                                                                                         รัศมีการฉีด: {tempRadius[zoneId]?.toFixed(1) || system.defaultRadius}m
//                                                                                     </label>
//                                                                                     <div className="flex items-center space-x-2">
//                                                                                         <input
//                                                                                             type="range"
//                                                                                             min={system.minRadius}
//                                                                                             max={system.maxRadius}
//                                                                                             step="0.5"
//                                                                                             value={tempRadius[zoneId] || system.defaultRadius}
//                                                                                             onChange={(e) =>
//                                                                                                 handleInternalRadiusChange(
//                                                                                                     zoneId,
//                                                                                                     parseFloat(e.target.value)
//                                                                                                 )
//                                                                                             }
//                                                                                             className="flex-1"
//                                                                                         />
//                                                                                         {/* ✅ เพิ่มปุ่ม update manual */}
//                                                                                         {hasIrrigation && (
//                                                                                             <button
//                                                                                                 onClick={() => handleManualRegenerate(zoneId)}
//                                                                                                 className="px-2 py-1 bg-cyan-600 text-white rounded text-xs hover:bg-cyan-700 flex-shrink-0"
//                                                                                                 title="อัพเดทระบบน้ำด้วยค่าใหม่"
//                                                                                             >
//                                                                                                 ↻
//                                                                                             </button>
//                                                                                         )}
//                                                                                     </div>
//                                                                                     <div className="flex justify-between text-xs text-gray-400 mt-1">
//                                                                                         <span>{system.minRadius}m</span>
//                                                                                         <span>{system.maxRadius}m</span>
//                                                                                     </div>

//                                                                                     {/* Overlap control for sprinklers */}
//                                                                                     {system.supportsOverlap && (
//                                                                                         <div className="mt-2 flex items-center justify-between">
//                                                                                             <label className="flex items-center space-x-2 text-xs text-gray-300">
//                                                                                                 <input
//                                                                                                     type="checkbox"
//                                                                                                     checked={sprinklerOverlap[zoneId] || false}
//                                                                                                     onChange={(e) =>
//                                                                                                         handleOverlapChange(
//                                                                                                             zoneId,
//                                                                                                             e.target.checked
//                                                                                                         )
//                                                                                                     }
//                                                                                                     className="rounded"
//                                                                                                 />
//                                                                                                 <span>รูปแบบทับซ้อน (Overlapping Coverage)</span>
//                                                                                             </label>
//                                                                                             {/* ✅ เพิ่มปุ่ม update manual สำหรับ overlap */}
//                                                                                             {hasIrrigation && (
//                                                                                                 <button
//                                                                                                     onClick={() => handleManualRegenerate(zoneId)}
//                                                                                                     className="px-2 py-1 bg-cyan-600 text-white rounded text-xs hover:bg-cyan-700 flex-shrink-0"
//                                                                                                     title="อัพเดทรูปแบบทับซ้อน"
//                                                                                                 >
//                                                                                                     ↻
//                                                                                                 </button>
//                                                                                             )}
//                                                                                         </div>
//                                                                                     )}
//                                                                                 </div>
//                                                                             )}

//                                                                             {/* ✅ Manual Create/Update buttons */}
//                                                                             <div className="mt-3 flex space-x-2">
//                                                                                 <button
//                                                                                     onClick={() => handleManualRegenerate(zoneId)}
//                                                                                     className="flex-1 rounded bg-cyan-600 px-3 py-1 text-xs text-white transition-colors hover:bg-cyan-700"
//                                                                                 >
//                                                                                     {hasIrrigation ? '🔄 อัพเดทระบบน้ำ' : '🚿 สร้างระบบน้ำ'}
//                                                                                 </button>
//                                                                                 {hasIrrigation && (
//                                                                                     <button
//                                                                                         onClick={() => clearIrrigationForZone(zoneId)}
//                                                                                         className="rounded bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-700"
//                                                                                     >
//                                                                                         🗑️ ลบ
//                                                                                     </button>
//                                                                                 )}
//                                                                             </div>

//                                                                             {/* Status information */}
//                                                                             <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
//                                                                                 {system.isLinear ? (
//                                                                                     <div className="grid grid-cols-2 gap-2">
//                                                                                         <div>📏 เส้นน้ำหยด: <span className="text-white font-medium">{zoneIrrigationLines.length}</span></div>
//                                                                                         <div>💧 จุดน้ำหยด: <span className="text-white font-medium">{zoneIrrigationPoints.length}</span></div>
//                                                                                     </div>
//                                                                                 ) : (
//                                                                                     <div className="grid grid-cols-2 gap-2">
//                                                                                         <div>🌿 จุดพ่นน้ำ: <span className="text-white font-medium">{zoneIrrigationPoints.length}</span></div>
//                                                                                         <div>📐 รัศมี: <span className="text-white font-medium">{tempRadius[zoneId]?.toFixed(1) || system.defaultRadius}m</span></div>
//                                                                                     </div>
//                                                                                 )}
//                                                                                 {hasIrrigation && (
//                                                                                     <div className="mt-1 text-green-400">
//                                                                                         ✅ ระบบน้ำถูกติดตั้งแล้ว
//                                                                                     </div>
//                                                                                 )}
//                                                                             </div>
//                                                                         </div>
//                                                                     )}
//                                                                 </div>
//                                                             );
//                                                         })}
//                                                     </div>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>

//                         {/* Summary Statistics */}
//                         <div className="rounded-lg bg-gray-800 p-3">
//                             <h4 className="mb-2 text-sm font-medium text-white">📊 สรุประบบน้ำ</h4>
//                             <div className="grid grid-cols-2 gap-3 text-xs">
//                                 <div className="rounded bg-gray-700 p-2">
//                                     <div className="text-cyan-400">จุดพ่นน้ำรวม</div>
//                                     <div className="text-lg font-bold text-white">
//                                         {irrigationPoints.length}
//                                     </div>
//                                 </div>
//                                 <div className="rounded bg-gray-700 p-2">
//                                     <div className="text-blue-400">เส้นน้ำหยด</div>
//                                     <div className="text-lg font-bold text-white">
//                                         {irrigationLines.length}
//                                     </div>
//                                 </div>
//                                 <div className="rounded bg-gray-700 p-2">
//                                     <div className="text-green-400">โซนที่ติดตั้ง</div>
//                                     <div className="text-lg font-bold text-white">
//                                         {Object.keys(irrigationAssignments).length} / {zones.length}
//                                     </div>
//                                 </div>
//                                 <div className="rounded bg-gray-700 p-2">
//                                     <div className="text-purple-400">ประเภทระบบ</div>
//                                     <div className="text-sm text-white">
//                                         {[...new Set(Object.values(irrigationAssignments))].length} ชนิด
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* ✅ เพิ่มคำแนะนำการใช้งาน */}
//                             {zones.length > 0 && Object.keys(irrigationAssignments).length === 0 && (
//                                 <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
//                                     <div className="text-xs text-blue-300">
//                                         💡 <strong>วิธีใช้:</strong> เลือกชนิดระบบน้ำสำหรับแต่ละโซน แล้วกดปุ่ม "สร้างระบบน้ำ" เพื่อติดตั้ง
//                                     </div>
//                                 </div>
//                             )}

//                             {/* ✅ แสดงสถานะการติดตั้ง */}
//                             {Object.keys(irrigationAssignments).length > 0 && (
//                                 <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded">
//                                     <div className="text-xs text-green-300">
//                                         ✅ <strong>สถานะ:</strong> ติดตั้งระบบน้ำแล้ว {Object.keys(irrigationAssignments).length} จาก {zones.length} โซน
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }