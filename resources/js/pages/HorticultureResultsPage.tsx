import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import {
    MapContainer,
    TileLayer,
    Polygon,
    Marker,
    Polyline,
    useMap,
    LayersControl,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import {
    HorticultureProjectData,
    ProjectSummaryData,
    calculateProjectSummary,
    formatAreaInRai,
    formatDistance,
    formatWaterVolume,
    loadProjectData,
    navigateToPlanner,
} from '../utils/horticultureUtils';

import {
    createAndDownloadMapImage,
    createPDFReport,
    downloadStatsAsJSON,
    downloadStatsAsCSV,
    getFormattedStats,
} from '../utils/horticultureProjectStats';

// Enhanced Map Bounds Component with better padding
const EnhancedMapBounds = ({ positions }: { positions: Array<{ lat: number; lng: number }> }) => {
    const map = useMap();

    useEffect(() => {
        if (positions.length > 0) {
            try {
                const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
                
                // Enhanced padding for better visualization
                map.fitBounds(bounds, {
                    padding: [50, 50], // Increased padding
                    maxZoom: 20, // Limited max zoom for better overview
                });
                
                console.log('✅ Map bounds fitted with enhanced padding');
            } catch (error) {
                console.error('Error fitting bounds:', error);
            }
        }
    }, [positions, map]);

    return null;
};

// Map Rotation Component
const MapRotationController = ({ 
    rotation, 
    isLocked 
}: { 
    rotation: number; 
    isLocked: boolean; 
}) => {
    const map = useMap();

    useEffect(() => {
        const container = map.getContainer();
        if (container) {
            container.style.transform = `rotate(${rotation}deg)`;
            container.style.transformOrigin = 'center center';
            
            // Disable zoom and interaction when locked
            if (isLocked) {
                map.dragging.disable();
                map.touchZoom.disable();
                map.doubleClickZoom.disable();
                map.scrollWheelZoom.disable();
                map.boxZoom.disable();
                map.keyboard.disable();
                map.zoomControl?.remove();
            } else {
                map.dragging.enable();
                map.touchZoom.enable();
                map.doubleClickZoom.enable();
                map.scrollWheelZoom.enable();
                map.boxZoom.enable();
                map.keyboard.enable();
            }
        }
    }, [rotation, isLocked, map]);

    return null;
};

// Enhanced icon creators with size control
const createEnhancedPumpIcon = (size: number = 20) =>
    L.divIcon({
        html: `<div style="
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(135deg, rgb(59, 130, 246), rgb(30, 64, 175));
        border: 2px solid rgb(255, 255, 255);
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgb(255, 255, 255);
        font-weight: bold;
        font-size: ${Math.max(8, size * 0.6)}px;
    ">P</div>`,
        className: '',
        iconSize: [size + 12, size + 12],
        iconAnchor: [(size + 12) / 2, (size + 12) / 2],
    });

const createEnhancedPlantIcon = (size: number = 16) =>
    L.divIcon({
        html: `<div style="
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
    "><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAABlklEQVR4nI1TW0sCQRTel/plqSlGEUTPQRqRRBSE9tJDd7tApVI+VERRWcvMbNkFDArsSsLOZV8q+yXFiZ20dtdZaeB7OXO+M+d88x1N8xwhCq0WJZ2C4Zyg+FSC4ayMiUKr1uxwTqKC4apgBJSg5N1iKKIkM4aHOSVfvuQaajmJhpe5gvxQ2YPHyr6yiEWN8O/MgpJ3Z8L+zTTMFPth4CgokS8l4ex+1VMIf0hNLGZ0OS9MU4fBQjvEDtsaoJcX3Z2YqEOTatcClOowjnqU5DpQefmvACMZjVNSrAeun/Ku5GQuAFPLIUjlgjC88xPD5RXHr+BTTVBy5uwghXohftAG4xsBWJpph42JMCR2A5I8pnd7BTXsEbJeDexOZosxmEuHYG0yDGtXIzB/HofSc96tgT2CJV2n/G9A26NwnO7z9wQnUe3lZbOFU/ymSrjcSsLJgl8BXP21tsVQRGWku4sM3CL319XwybkRdC8RI4l/W5niIeU+2Pb0G+dHNPzKTRRqupFSExN12ArX15lTvG7H7Dsv4Rsa94hVuqmogAAAAABJRU5ErkJggg==" alt="tree" style="width: 100%; height: 100%; object-fit: contain;"></div>`,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });

export default function EnhancedHorticultureResultsPage() {
    const [projectData, setProjectData] = useState<HorticultureProjectData | null>(null);
    const [projectSummary, setProjectSummary] = useState<ProjectSummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number]>([13.75, 100.5]);
    const [mapZoom, setMapZoom] = useState<number>(16);
    
    // Enhanced Map Control States
    const [mapRotation, setMapRotation] = useState<number>(0);
    const [isMapLocked, setIsMapLocked] = useState<boolean>(false);
    const [pipeSize, setPipeSize] = useState<number>(1); // Multiplier for pipe thickness
    const [iconSize, setIconSize] = useState<number>(1); // Multiplier for icon size
    
    // การจัดการสถานะการสร้างรายงาน
    const [isCreatingImage, setIsCreatingImage] = useState(false);
    const [isCreatingPDF, setIsCreatingPDF] = useState(false);
    const [isCreatingExport, setIsCreatingExport] = useState(false);
    
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const data = loadProjectData();
            if (data) {
                setProjectData(data);
                const summary = calculateProjectSummary(data);
                setProjectSummary(summary);

                // Enhanced map center calculation
                if (data.mainArea && data.mainArea.length > 0) {
                    const centerLat = data.mainArea.reduce((sum, point) => sum + point.lat, 0) / data.mainArea.length;
                    const centerLng = data.mainArea.reduce((sum, point) => sum + point.lng, 0) / data.mainArea.length;
                    setMapCenter([centerLat, centerLng]);

                    const bounds = L.latLngBounds(data.mainArea.map((p) => [p.lat, p.lng]));
                    const boundsSize = bounds.getNorthEast().distanceTo(bounds.getSouthWest());

                    // Enhanced zoom calculation for better fit
                    let initialZoom;
                    if (boundsSize < 50) initialZoom = 20;
                    else if (boundsSize < 100) initialZoom = 19;
                    else if (boundsSize < 200) initialZoom = 18;
                    else if (boundsSize < 500) initialZoom = 17;
                    else if (boundsSize < 1000) initialZoom = 16;
                    else initialZoom = 15;

                    setMapZoom(initialZoom);
                }
            } else {
                console.warn('❌ No project data found, redirecting to planner');
                navigateToPlanner();
            }
        } catch (error) {
            console.error('❌ Error loading project data:', error);
            navigateToPlanner();
        }
        setLoading(false);
    }, []);

    // Map control handlers
    const handleRotationChange = (newRotation: number) => {
        setMapRotation(newRotation);
    };

    const resetMapRotation = () => {
        setMapRotation(0);
    };

    const toggleMapLock = () => {
        setIsMapLocked(!isMapLocked);
    };

    const handlePipeSizeChange = (newSize: number) => {
        setPipeSize(Math.max(0.5, Math.min(3, newSize))); // Limit between 0.5x and 3x
    };

    const handleIconSizeChange = (newSize: number) => {
        setIconSize(Math.max(0.5, Math.min(3, newSize))); // Limit between 0.5x and 3x
    };

    const resetSizes = () => {
        setPipeSize(1);
        setIconSize(1);
    };

    // Enhanced image creation with rotation reset
    const handleCreateMapImage = async () => {
        if (!mapRef.current) {
            alert('ไม่พบแผนที่');
            return;
        }

        setIsCreatingImage(true);
        try {
            console.log('🖼️ เริ่มสร้างภาพแผนที่...');
            
            // Reset rotation temporarily for image capture
            const currentRotation = mapRotation;
            if (currentRotation !== 0) {
                setMapRotation(0);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // แสดงการแจ้งเตือนให้ผู้ใช้รอ
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'image-loading';
            loadingDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 20px;
                border-radius: 10px;
                z-index: 10000;
                text-align: center;
            `;
            loadingDiv.innerHTML = `
                <div>🖼️ กำลังสร้างภาพแผนที่...</div>
                <div style="margin-top: 10px; font-size: 12px;">กรุณารอสักครู่</div>
            `;
            document.body.appendChild(loadingDiv);

            const success = await createAndDownloadMapImage(mapRef.current, {
                quality: 0.9,
                scale: 2,
                filename: `${projectData?.projectName || 'horticulture-layout'}.jpg`
            });

            document.body.removeChild(loadingDiv);

            // Restore rotation
            if (currentRotation !== 0) {
                setMapRotation(currentRotation);
            }

            if (success) {
                alert('✅ ดาวน์โหลดภาพแผนที่สำเร็จ!\n\nหากไม่สามารถดาวน์โหลดได้ กรุณาใช้วิธี Screenshot:\n• กด F11 เพื่อ Fullscreen\n• กด Print Screen\n• หรือกด F12 > Ctrl+Shift+P > พิมพ์ "screenshot"');
            } else {
                alert('⚠️ ไม่สามารถสร้างภาพแผนที่ได้อัตโนมัติ\n\nกรุณาใช้วิธี Screenshot แทน:\n\n1. กด F11 เพื่อเข้าโหมด Fullscreen\n2. กด Print Screen หรือใช้ Snipping Tool\n3. หรือกด F12 > เปิด Developer Tools\n4. กด Ctrl+Shift+P > พิมพ์ "screenshot"\n5. เลือก "Capture full size screenshot"');
            }
        } catch (error) {
            console.error('❌ Error creating map image:', error);
            alert('❌ เกิดข้อผิดพลาดในการสร้างภาพ\n\nกรุณาใช้วิธี Screenshot แทน:\n• กด Print Screen\n• หรือใช้ Extension เช่น "Full Page Screen Capture"');
        } finally {
            setIsCreatingImage(false);
        }
    };

    const handleCreatePDFReport = async () => {
        if (!mapRef.current) {
            alert('ไม่พบแผนที่');
            return;
        }

        setIsCreatingPDF(true);
        try {
            console.log('📄 เริ่มสร้าง PDF Report...');
            
            // Reset rotation for PDF
            const currentRotation = mapRotation;
            if (currentRotation !== 0) {
                setMapRotation(0);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // แสดงการแจ้งเตือนให้ผู้ใช้รอ
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'pdf-loading';
            loadingDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 20px;
                border-radius: 10px;
                z-index: 10000;
                text-align: center;
            `;
            loadingDiv.innerHTML = `
                <div>📄 กำลังสร้างรายงาน PDF...</div>
                <div style="margin-top: 10px; font-size: 12px;">กรุณารอสักครู่</div>
            `;
            document.body.appendChild(loadingDiv);
            
            const success = await createPDFReport(true, mapRef.current);
            
            document.body.removeChild(loadingDiv);
            
            // Restore rotation
            if (currentRotation !== 0) {
                setMapRotation(currentRotation);
            }
            
            if (success) {
                alert('✅ สร้างรายงานสำเร็จ!\n\n• หากเป็น PDF: ไฟล์จะถูกดาวน์โหลดอัตโนมัติ\n• หากเป็น HTML: หน้าต่างใหม่จะเปิดขึ้น\n• สามารถพิมพ์หรือบันทึกเป็น PDF ได้');
            } else {
                alert('⚠️ ไม่สามารถสร้างรายงานอัตโนมัติได้\n\nกรุณาใช้วิธีดาวน์โหลดข้อมูล JSON/CSV แทน\nหรือคัดลอกข้อมูลจากหน้าจอ');
            }
        } catch (error) {
            console.error('❌ Error creating PDF:', error);
            alert('❌ เกิดข้อผิดพลาดในการสร้าง PDF\n\nกรุณาลองใช้:\n• ดาวน์โหลด JSON/CSV\n• Screenshot หน้าจอ\n• คัดลอกข้อมูลด้วยตนเอง');
        } finally {
            setIsCreatingPDF(false);
        }
    };

    const handleDownloadJSON = async () => {
        setIsCreatingExport(true);
        try {
            downloadStatsAsJSON(`${projectData?.projectName || 'horticulture'}-stats`);
            alert('✅ ดาวน์โหลดไฟล์ JSON สำเร็จ!');
        } catch (error) {
            console.error('❌ Error downloading JSON:', error);
            alert('❌ เกิดข้อผิดพลาดในการดาวน์โหลด JSON');
        } finally {
            setIsCreatingExport(false);
        }
    };

    const handleDownloadCSV = async () => {
        setIsCreatingExport(true);
        try {
            downloadStatsAsCSV(`${projectData?.projectName || 'horticulture'}-stats`);
            alert('✅ ดาวน์โหลดไฟล์ CSV สำเร็จ!');
        } catch (error) {
            console.error('❌ Error downloading CSV:', error);
            alert('❌ เกิดข้อผิดพลาดในการดาวน์โหลด CSV');
        } finally {
            setIsCreatingExport(false);
        }
    };

    const handleCopyStats = () => {
        const formattedStats = getFormattedStats();
        if (formattedStats) {
            navigator.clipboard.writeText(formattedStats).then(() => {
                alert('✅ คัดลอกข้อมูลสถิติลงคลิปบอร์ดเรียบร้อยแล้ว!');
            }).catch(() => {
                // Fallback: แสดงข้อมูลในหน้าต่างใหม่
                const newWindow = window.open('', '_blank');
                if (newWindow) {
                    newWindow.document.write(`<pre>${formattedStats}</pre>`);
                    alert('เปิดข้อมูลในหน้าต่างใหม่ กรุณาคัดลอกด้วยตนเอง');
                }
            });
        }
    };

    const handleNewProject = () => {
        navigateToPlanner();
    };

    const handleShowScreenshotGuide = () => {
        const guide = `
🖼️ คู่มือการ Screenshot แผนที่

📱 วิธีที่ 1: Screenshot พื้นฐาน
• กด Print Screen (PrtSc) แล้วไปวางใน Paint
• ใช้ Snipping Tool (Win + Shift + S)
• Mac: กด Cmd + Shift + 4

🔧 วิธีที่ 2: Developer Tools (แนะนำ)
• กด F12 เพื่อเปิด Developer Tools
• กด Ctrl + Shift + P (Cmd + Shift + P ใน Mac)
• พิมพ์ "screenshot"
• เลือก "Capture full size screenshot"

🌐 วิธีที่ 3: Browser Extension
• ติดตั้ง "Full Page Screen Capture"
• หรือ "GoFullPage"
• คลิกที่ Extension แล้วรอให้จับภาพ

💡 เคล็ดลับ:
• กด F11 เพื่อ Fullscreen ก่อน Screenshot
• ปิด Developer Tools ก่อนจับภาพ
• ใช้คุณภาพสูงสุดในการบันทึก
• รีเซ็ตการหมุนแผนที่ก่อน Screenshot
        `;
        
        alert(guide);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-32 w-32 animate-spin rounded-full border-b-2 border-white"></div>
                    <p className="text-xl">กำลังโหลดข้อมูลโครงการ...</p>
                </div>
            </div>
        );
    }

    if (!projectData || !projectSummary) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="mb-4 text-2xl font-bold">ไม่พบข้อมูลโครงการ</h1>
                    <button
                        onClick={handleNewProject}
                        className="rounded-lg bg-blue-600 px-6 py-3 transition-colors hover:bg-blue-700"
                    >
                        กลับไปสร้างโครงการใหม่
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 p-6 text-white">
            <div className="mx-auto w-full">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="mb-4 text-4xl font-bold text-green-400">
                        🌱 รายงานการออกแบบระบบน้ำสวนผลไม้
                    </h1>
                    <h2 className="text-2xl text-gray-300">{projectData.projectName}</h2>
                    <p className="mt-2 text-gray-400">
                        วันที่สร้าง: {new Date(projectData.createdAt).toLocaleDateString('th-TH')}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    {/* Enhanced Map Section */}
                    <div className="rounded-lg bg-gray-800 p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-semibold">🗺️ แผนผังโครงการ</h3>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={handleCreateMapImage}
                                    disabled={isCreatingImage}
                                    className={`rounded px-3 py-1 text-sm transition-colors ${
                                        isCreatingImage
                                            ? 'cursor-not-allowed bg-gray-600 text-gray-400'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    {isCreatingImage ? '⏳ สร้าง...' : '📷 ดาวน์โหลดภาพ'}
                                </button>

                                <button
                                    onClick={handleCreatePDFReport}
                                    disabled={isCreatingPDF}
                                    className={`rounded px-3 py-1 text-sm transition-colors ${
                                        isCreatingPDF
                                            ? 'cursor-not-allowed bg-gray-600 text-gray-400'
                                            : 'bg-red-600 text-white hover:bg-red-700'
                                    }`}
                                >
                                    {isCreatingPDF ? '⏳ สร้าง...' : '📄 สร้างรายงาน'}
                                </button>

                                <button
                                    onClick={handleShowScreenshotGuide}
                                    className="rounded bg-yellow-600 px-3 py-1 text-sm transition-colors hover:bg-yellow-700"
                                >
                                    💡 คู่มือ Screenshot
                                </button>
                            </div>
                        </div>

                        {/* Enhanced Map Controls */}
                        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {/* Rotation Controls */}
                            <div className="rounded-lg bg-gray-700 p-4">
                                <h4 className="mb-3 text-sm font-semibold text-blue-300">🔄 การหมุนแผนที่</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-gray-300 w-16">หมุน:</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="360"
                                            step="1"
                                            value={mapRotation}
                                            onChange={(e) => handleRotationChange(parseInt(e.target.value))}
                                            className="flex-1 accent-blue-600"
                                        />
                                        <span className="text-xs text-blue-300 w-12">{mapRotation}°</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRotationChange(mapRotation - 15)}
                                            className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700"
                                        >
                                            ↺ -15°
                                        </button>
                                        <button
                                            onClick={resetMapRotation}
                                            className="flex-1 rounded bg-gray-600 px-2 py-1 text-xs hover:bg-gray-700"
                                        >
                                            🔄 รีเซ็ต
                                        </button>
                                        <button
                                            onClick={() => handleRotationChange(mapRotation + 15)}
                                            className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700"
                                        >
                                            ↻ +15°
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={isMapLocked}
                                            onChange={toggleMapLock}
                                            className="accent-purple-600"
                                        />
                                        <label className="text-xs text-gray-300">🔒 ล็อกการซูมและลาก</label>
                                    </div>
                                </div>
                            </div>

                            {/* Size Controls */}
                            <div className="rounded-lg bg-gray-700 p-4">
                                <h4 className="mb-3 text-sm font-semibold text-green-300">📏 ขนาดไอคอน</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-gray-300 w-16">ท่อ:</label>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="3"
                                            step="0.1"
                                            value={pipeSize}
                                            onChange={(e) => handlePipeSizeChange(parseFloat(e.target.value))}
                                            className="flex-1 accent-green-600"
                                        />
                                        <span className="text-xs text-green-300 w-12">{pipeSize.toFixed(1)}x</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-gray-300 w-16">ไอคอน:</label>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="3"
                                            step="0.1"
                                            value={iconSize}
                                            onChange={(e) => handleIconSizeChange(parseFloat(e.target.value))}
                                            className="flex-1 accent-yellow-600"
                                        />
                                        <span className="text-xs text-yellow-300 w-12">{iconSize.toFixed(1)}x</span>
                                    </div>
                                    <button
                                        onClick={resetSizes}
                                        className="w-full rounded bg-gray-600 px-3 py-1 text-xs hover:bg-gray-700"
                                    >
                                        🔄 รีเซ็ตขนาด
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Map */}
                        <div
                            ref={mapRef}
                            className="mb-4 h-[500px] w-full overflow-hidden rounded-lg border border-gray-600"
                            style={{ backgroundColor: 'rgb(31, 41, 55)' }}
                        >
                            <MapContainer
                                center={mapCenter}
                                zoom={mapZoom}
                                maxZoom={isMapLocked ? mapZoom : 64}
                                minZoom={isMapLocked ? mapZoom : 1}
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={!isMapLocked}
                                attributionControl={false}
                                dragging={!isMapLocked}
                                scrollWheelZoom={!isMapLocked}
                                doubleClickZoom={!isMapLocked}
                                touchZoom={!isMapLocked}
                                boxZoom={!isMapLocked}
                                keyboard={!isMapLocked}
                                whenReady={() => setMapLoaded(true)}
                            >
                                <LayersControl position="topright">
                                    <LayersControl.BaseLayer checked name="ภาพถ่ายดาวเทียม">
                                        <TileLayer
                                            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                                            attribution="Google Maps"
                                            maxZoom={30}
                                            maxNativeZoom={20}
                                        />
                                    </LayersControl.BaseLayer>
                                    <LayersControl.BaseLayer name="ภาพถ่าย + ป้ายชื่อ">
                                        <TileLayer
                                            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                                            attribution="Google Maps"
                                            maxZoom={30}
                                            maxNativeZoom={20}
                                        />
                                    </LayersControl.BaseLayer>
                                    <LayersControl.BaseLayer name="แผนที่ถนน">
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution="OpenStreetMap"
                                            maxZoom={30}
                                            maxNativeZoom={19}
                                        />
                                    </LayersControl.BaseLayer>
                                </LayersControl>

                                {/* Enhanced Map Bounds with better padding */}
                                {projectData.mainArea.length > 0 && (
                                    <EnhancedMapBounds positions={projectData.mainArea} />
                                )}

                                {/* Map Rotation Controller */}
                                <MapRotationController rotation={mapRotation} isLocked={isMapLocked} />

                                {/* Main Area */}
                                {projectData.mainArea.length > 0 && (
                                    <Polygon
                                        positions={projectData.mainArea.map((coord) => [coord.lat, coord.lng])}
                                        pathOptions={{
                                            color: 'rgb(34, 197, 94)',
                                            fillColor: 'rgb(34, 197, 94)',
                                            fillOpacity: 0.1,
                                            weight: 2 * pipeSize,
                                        }}
                                    />
                                )}

                                {/* Exclusion Areas */}
                                {projectData.exclusionAreas &&
                                    projectData.exclusionAreas.map((area) => (
                                        <Polygon
                                            key={area.id}
                                            positions={area.coordinates.map((coord) => [coord.lat, coord.lng])}
                                            pathOptions={{
                                                color: 'rgb(239, 68, 68)',
                                                fillColor: 'rgb(239, 68, 68)',
                                                fillOpacity: 0.4,
                                                weight: 2 * pipeSize,
                                            }}
                                        />
                                    ))}

                                {/* Zones */}
                                {projectData.zones &&
                                    projectData.zones.map((zone) => (
                                        <Polygon
                                            key={zone.id}
                                            positions={zone.coordinates.map((coord) => [coord.lat, coord.lng])}
                                            pathOptions={{
                                                color: zone.color,
                                                fillColor: zone.color,
                                                fillOpacity: 0.3,
                                                weight: 3 * pipeSize,
                                            }}
                                        />
                                    ))}

                                {/* Enhanced Pump with size control */}
                                {projectData.pump && (
                                    <Marker
                                        position={[projectData.pump.position.lat, projectData.pump.position.lng]}
                                        icon={createEnhancedPumpIcon(20 * iconSize)}
                                    />
                                )}

                                {/* Enhanced Main Pipes with size control */}
                                {projectData.mainPipes &&
                                    projectData.mainPipes.map((pipe) => (
                                        <Polyline
                                            key={pipe.id}
                                            positions={pipe.coordinates.map((coord) => [coord.lat, coord.lng])}
                                            pathOptions={{
                                                color: 'rgb(59, 130, 246)',
                                                weight: 6 * pipeSize,
                                                opacity: 0.9,
                                            }}
                                        />
                                    ))}

                                {/* Enhanced Sub-Main Pipes and Branch Pipes with size control */}
                                {projectData.subMainPipes &&
                                    projectData.subMainPipes.map((pipe) => (
                                        <React.Fragment key={pipe.id}>
                                            <Polyline
                                                positions={pipe.coordinates.map((coord) => [coord.lat, coord.lng])}
                                                pathOptions={{
                                                    color: 'rgb(139, 92, 246)',
                                                    weight: 4 * pipeSize,
                                                    opacity: 0.9,
                                                }}
                                            />
                                            {pipe.branchPipes &&
                                                pipe.branchPipes.map((branchPipe) => (
                                                    <Polyline
                                                        key={branchPipe.id}
                                                        positions={branchPipe.coordinates.map((coord) => [coord.lat, coord.lng])}
                                                        pathOptions={{
                                                            color: '#FFFF66',
                                                            weight: 2 * pipeSize,
                                                            opacity: 0.8,
                                                        }}
                                                    />
                                                ))}
                                        </React.Fragment>
                                    ))}

                                {/* Enhanced Plants with size control */}
                                {projectData.plants &&
                                    projectData.plants.map((plant) => (
                                        <Marker
                                            key={plant.id}
                                            position={[plant.position.lat, plant.position.lng]}
                                            icon={createEnhancedPlantIcon(16 * iconSize)}
                                        />
                                    ))}
                            </MapContainer>
                        </div>

                        {/* Enhanced Map Legend */}
                        <div className="rounded-lg bg-gray-700 p-4">
                            <h4 className="mb-3 text-sm font-semibold">🎨 คำอธิบายสัญลักษณ์</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="h-1 w-4 bg-blue-500" style={{ height: `${2 * pipeSize}px` }}></div>
                                    <span>ท่อเมน (จากปั๊ม)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-1 w-4 bg-purple-500" style={{ height: `${1.5 * pipeSize}px` }}></div>
                                    <span>ท่อเมนรอง</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-1 w-4 bg-yellow-300" style={{ height: `${1 * pipeSize}px` }}></div>
                                    <span>ท่อย่อย</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 bg-red-500 opacity-50"></div>
                                    <span>พื้นที่ต้องหลีกเลี่ยง</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="flex items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white"
                                        style={{ 
                                            width: `18px`, 
                                            height: `18px`,
                                            fontSize: `10px`
                                        }}
                                    >P</div>
                                    <span>ปั๊มน้ำ</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <img
                                        src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAABlklEQVR4nI1TW0sCQRTel/plqSlGEUTPQRqRRBSE9tJDd7tApVI+VERRWcvMbNkFDArsSsLOZV8q+yXFiZ20dtdZaeB7OXO+M+d88x1N8xwhCq0WJZ2C4Zyg+FSC4ayMiUKr1uxwTqKC4apgBJSg5N1iKKIkM4aHOSVfvuQaajmJhpe5gvxQ2YPHyr6yiEWN8O/MgpJ3Z8L+zTTMFPth4CgokS8l4ex+1VMIf0hNLGZ0OS9MU4fBQjvEDtsaoJcX3Z2YqEOTatcClOowjnqU5DpQefmvACMZjVNSrAeun/Ku5GQuAFPLIUjlgjC88xPD5RXHr+BTTVBy5uwghXohftAG4xsBWJpph42JMCR2A5I8pnd7BTXsEbJeDexOZosxmEuHYG0yDGtXIzB/HofSc96tgT2CJV2n/G9A26NwnO7z9wQnUe3lZbOFU/ymSrjcSsLJgl8BXP21tsVQRGWku4sM3CL319XwybkRdC8RI4l/W5niIeU+2Pb0G+dHNPzKTRRqupFSExN12ArX15lTvG7H7Dsv4Rsa94hVuqmogAAAAABJRU5ErkJggg=="
                                        alt="tree"
                                        style={{ 
                                            width: `18px`, 
                                            height: `18px`
                                        }}
                                    />
                                    <span>ต้นไม้</span>
                                </div>
                            </div>
                        </div>

                        {/* Export Options */}
                        <div className="mt-4 rounded-lg bg-gray-700 p-4">
                            <h4 className="mb-3 text-sm font-semibold">📊 ตัวเลือกการส่งออก</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <button
                                    onClick={handleDownloadJSON}
                                    disabled={isCreatingExport}
                                    className={`rounded px-3 py-2 transition-colors ${
                                        isCreatingExport
                                            ? 'cursor-not-allowed bg-gray-600 text-gray-400'
                                            : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                >
                                    📁 ดาวน์โหลด JSON
                                </button>
                                <button
                                    onClick={handleDownloadCSV}
                                    disabled={isCreatingExport}
                                    className={`rounded px-3 py-2 transition-colors ${
                                        isCreatingExport
                                            ? 'cursor-not-allowed bg-gray-600 text-gray-400'
                                            : 'bg-purple-600 text-white hover:bg-purple-700'
                                    }`}
                                >
                                    📊 ดาวน์โหลด CSV
                                </button>
                                <button
                                    onClick={handleCopyStats}
                                    className="col-span-2 rounded bg-orange-600 px-3 py-2 text-white transition-colors hover:bg-orange-700"
                                >
                                    📋 คัดลอกข้อมูลสถิติ
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Summary Data Section - keeping original content */}
                    <div className="space-y-6">
                        {/* Overall Summary */}
                        <div className="rounded-lg bg-gray-800 p-6">
                            <h3 className="mb-4 text-xl font-semibold text-green-400">📊 ข้อมูลโดยรวม</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="rounded bg-gray-700 p-3">
                                    <div className="text-gray-400">พื้นที่รวมทั้งหมด</div>
                                    <div className="text-lg font-bold text-green-400">
                                        {formatAreaInRai(projectSummary.totalAreaInRai)}
                                    </div>
                                </div>
                                <div className="rounded bg-gray-700 p-3">
                                    <div className="text-gray-400">จำนวนโซน</div>
                                    <div className="text-lg font-bold text-blue-400">
                                        {projectSummary.totalZones} โซน
                                    </div>
                                </div>
                                <div className="rounded bg-gray-700 p-3">
                                    <div className="text-gray-400">จำนวนต้นไม้ทั้งหมด</div>
                                    <div className="text-lg font-bold text-yellow-400">
                                        {projectSummary.totalPlants.toLocaleString()} ต้น
                                    </div>
                                </div>
                                <div className="rounded bg-gray-700 p-3">
                                    <div className="text-gray-400">ปริมาณน้ำต่อครั้ง</div>
                                    <div className="text-lg font-bold text-cyan-400">
                                        {formatWaterVolume(projectSummary.totalWaterNeedPerSession)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pipe System Summary */}
                        <div className="rounded-lg bg-gray-800 p-6">
                            <h3 className="mb-4 text-xl font-semibold text-blue-400">🔧 ระบบท่อ</h3>
                            
                            {/* Main Pipes */}
                            <div className="mb-4 rounded bg-gray-700 p-4">
                                <h4 className="mb-2 font-semibold text-blue-300">🔵 ท่อเมน</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-400">ท่อเมนที่ยาวที่สุด:</span>
                                        <div className="font-bold text-yellow-400">
                                            {formatDistance(projectSummary.mainPipes.longest)}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">ท่อเมนยาวรวม:</span>
                                        <div className="font-bold text-blue-400">
                                            {formatDistance(projectSummary.mainPipes.totalLength)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sub-Main Pipes */}
                            <div className="mb-4 rounded bg-gray-700 p-4">
                                <h4 className="mb-2 font-semibold text-purple-300">🟣 ท่อเมนรอง</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-400">ท่อเมนรองที่ยาวที่สุด:</span>
                                        <div className="font-bold text-yellow-400">
                                            {formatDistance(projectSummary.subMainPipes.longest)}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">ท่อเมนรองยาวรวม:</span>
                                        <div className="font-bold text-purple-400">
                                            {formatDistance(projectSummary.subMainPipes.totalLength)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Branch Pipes */}
                            <div className="mb-4 rounded bg-gray-700 p-4">
                                <h4 className="mb-2 font-semibold text-green-300">🟢 ท่อย่อย</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-400">ท่อย่อยที่ยาวที่สุด:</span>
                                        <div className="font-bold text-yellow-400">
                                            {formatDistance(projectSummary.branchPipes.longest)}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">ท่อย่อยยาวรวม:</span>
                                        <div className="font-bold text-green-400">
                                            {formatDistance(projectSummary.branchPipes.totalLength)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Combined Longest Pipes */}
                            <div className="rounded bg-yellow-900/30 p-4">
                                <h4 className="mb-2 font-semibold text-yellow-300">📏 ท่อที่ยาวที่สุดรวมกัน</h4>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-yellow-400">
                                        {formatDistance(projectSummary.longestPipesCombined)}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        (ท่อเมน + ท่อเมนรอง + ท่อย่อยที่ยาวที่สุด)
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Zone Details */}
                        {projectSummary.zoneDetails.length > 0 && (
                            <div className="rounded-lg bg-gray-800 p-6">
                                <h3 className="mb-4 text-xl font-semibold text-green-400">
                                    🏞️ รายละเอียดแต่ละโซน
                                </h3>
                                <div className="space-y-4">
                                    {projectSummary.zoneDetails.map((zone) => (
                                        <div key={zone.zoneId} className="rounded bg-gray-700 p-4">
                                            <h4 className="mb-3 font-semibold text-green-300">
                                                {zone.zoneName}
                                            </h4>
                                            
                                            {/* Zone Basic Info */}
                                            <div className="mb-3 grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-400">พื้นที่โซน:</span>
                                                    <div className="font-bold text-green-400">
                                                        {formatAreaInRai(zone.areaInRai)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">จำนวนต้นไม้:</span>
                                                    <div className="font-bold text-yellow-400">
                                                        {zone.plantCount.toLocaleString()} ต้น
                                                    </div>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-gray-400">ปริมาณน้ำต่อครั้ง:</span>
                                                    <div className="font-bold text-cyan-400">
                                                        {formatWaterVolume(zone.waterNeedPerSession)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Zone Pipes */}
                                            <div className="space-y-2 text-xs">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="rounded bg-blue-900/30 p-2">
                                                        <div className="text-blue-300">ท่อเมนในโซน</div>
                                                        <div>ยาวที่สุด: {formatDistance(zone.mainPipesInZone.longest)}</div>
                                                        <div>รวม: {formatDistance(zone.mainPipesInZone.totalLength)}</div>
                                                    </div>
                                                    <div className="rounded bg-purple-900/30 p-2">
                                                        <div className="text-purple-300">ท่อเมนรองในโซน</div>
                                                        <div>ยาวที่สุด: {formatDistance(zone.subMainPipesInZone.longest)}</div>
                                                        <div>รวม: {formatDistance(zone.subMainPipesInZone.totalLength)}</div>
                                                    </div>
                                                </div>
                                                <div className="rounded bg-green-900/30 p-2">
                                                    <div className="text-green-300">ท่อย่อยในโซน</div>
                                                    <div>ยาวที่สุด: {formatDistance(zone.branchPipesInZone.longest)} | รวม: {formatDistance(zone.branchPipesInZone.totalLength)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Enhanced Tips and Troubleshooting */}
                        <div className="rounded-lg bg-blue-900/20 p-6">
                            <h3 className="mb-4 text-xl font-semibold text-blue-400">💡 เคล็ดลับและแก้ปัญหา</h3>
                            <div className="space-y-3 text-sm">
                                <div className="rounded bg-blue-900/30 p-3">
                                    <h4 className="font-semibold text-blue-300">🗺️ การควบคุมแผนที่:</h4>
                                    <ul className="mt-2 space-y-1 text-xs text-gray-300">
                                        <li>• หมุนแผนที่ได้ 360 องศา ด้วยแถบลื่น</li>
                                        <li>• ล็อกการซูมและลาก เพื่อป้องกันการเปลี่ยนแปลง</li>
                                        <li>• ปรับขนาดท่อและไอคอนเพื่อมองเห็นชัดขึ้น</li>
                                        <li>• รีเซ็ตการหมุนและขนาดได้ตลอดเวลา</li>
                                    </ul>
                                </div>
                                
                                <div className="rounded bg-green-900/30 p-3">
                                    <h4 className="font-semibold text-green-300">📷 การบันทึกภาพแผนที่:</h4>
                                    <ul className="mt-2 space-y-1 text-xs text-gray-300">
                                        <li>• การหมุนจะถูกรีเซ็ตอัตโนมัติเมื่อสร้างภาพ</li>
                                        <li>• ปรับขนาดไอคอนก่อนสร้างภาพเพื่อผลลัพธ์ที่ดี</li>
                                        <li>• ใช้ Screenshot หากการสร้างภาพอัตโนมัติไม่สำเร็จ</li>
                                    </ul>
                                </div>
                                
                                <div className="rounded bg-yellow-900/30 p-3">
                                    <h4 className="font-semibold text-yellow-300">🔧 แก้ปัญหาทั่วไป:</h4>
                                    <ul className="mt-2 space-y-1 text-xs text-gray-300">
                                        <li>• ปิด popup blocker ถ้ารายงานไม่เปิด</li>
                                        <li>• รีเซ็ตการหมุนหากแผนที่ดูแปลก</li>
                                        <li>• ใช้ขนาดไอคอนปานกลาง (1.0x) สำหรับผลลัพธ์ดีที่สุด</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-12 flex justify-center gap-4">
                    <button
                        onClick={handleNewProject}
                        className="rounded-lg bg-green-600 px-6 py-3 font-semibold transition-colors hover:bg-green-700"
                    >
                        ➕ โครงการใหม่
                    </button>
                    <button
                        onClick={() => router.visit('/product')}
                        className="rounded-lg bg-blue-600 px-6 py-3 font-semibold transition-colors hover:bg-blue-700"
                    >
                        คำนวณระบบน้ำ
                    </button>
                </div>

                {/* Enhanced Footer */}
                <div className="mt-12 text-center text-gray-400">
                    <p>
                        ระบบออกแบบการวางระบบน้ำสวนผลไม้ | สร้างเมื่อ{' '}
                        {new Date().toLocaleDateString('th-TH')}
                    </p>
                    <div className="mt-2 text-sm text-green-300">
                        <p>🗺️ <strong>แผนที่แบบใหม่:</strong> หมุนได้ 360° + ล็อกซูม + ปรับขนาดไอคอน</p>
                        <p>📷 <strong>ระบบบันทึกภาพ:</strong> รีเซ็ตการหมุนอัตโนมัติ + คู่มือ Screenshot</p>
                        <p>📄 <strong>ระบบรายงาน:</strong> PDF / HTML / JSON / CSV + แก้ปัญหาครบครัน</p>
                    </div>
                </div>
            </div>
        </div>
    );
}