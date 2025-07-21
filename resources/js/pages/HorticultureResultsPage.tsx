import React, { useState, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
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
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { useLanguage } from '../contexts/LanguageContext';

import {
    HorticultureProjectData,
    ProjectSummaryData,
    calculateProjectSummary,
    formatAreaInRai,
    formatDistance,
    formatWaterVolume,
    loadProjectData,
    navigateToPlanner,
    isPointInPolygon,
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
const MapRotationController = ({ rotation, isLocked }: { rotation: number; isLocked: boolean }) => {
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

function EnhancedHorticultureResultsPageContent() {
    const page = usePage();
    const auth = (page.props as any).auth;
    const { t } = useLanguage();
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

    // Database save states
    const [savingToDatabase, setSavingToDatabase] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

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
                    const centerLat =
                        data.mainArea.reduce((sum, point) => sum + point.lat, 0) /
                        data.mainArea.length;
                    const centerLng =
                        data.mainArea.reduce((sum, point) => sum + point.lng, 0) /
                        data.mainArea.length;
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
            alert(t('ไม่พบแผนที่'));
            return;
        }

        setIsCreatingImage(true);
        try {
            console.log('🖼️ ' + t('เริ่มสร้างภาพแผนที่') + '...');

            // Reset rotation temporarily for image capture
            const currentRotation = mapRotation;
            if (currentRotation !== 0) {
                setMapRotation(0);
                await new Promise((resolve) => setTimeout(resolve, 500));
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
                <div>🖼️ {t('กำลังสร้างภาพแผนที่')}...</div>
                <div style="margin-top: 10px; font-size: 12px;">กรุณารอสักครู่</div>
            `;
            document.body.appendChild(loadingDiv);

            const success = await createAndDownloadMapImage(mapRef.current, {
                quality: 0.9,
                scale: 2,
                filename: `${projectData?.projectName || 'horticulture-layout'}.jpg`,
            });

            document.body.removeChild(loadingDiv);

            // Restore rotation
            if (currentRotation !== 0) {
                setMapRotation(currentRotation);
            }

            if (success) {
                alert(
                    '✅ ' +
                        t('ดาวน์โหลดภาพแผนที่สำเร็จ') +
                        '!\n\nหากไม่สามารถดาวน์โหลดได้ กรุณาใช้วิธี Screenshot:\n• กด F11 เพื่อ Fullscreen\n• กด Print Screen\n• หรือกด F12 > Ctrl+Shift+P > พิมพ์ "screenshot"'
                );
            } else {
                alert(
                    '⚠️ ' +
                        t('ไม่สามารถสร้างภาพแผนที่ได้อัตโนมัติ') +
                        '\n\nกรุณาใช้วิธี Screenshot แทน:\n\n1. กด F11 เพื่อเข้าโหมด Fullscreen\n2. กด Print Screen หรือใช้ Snipping Tool\n3. หรือกด F12 > เปิด Developer Tools\n4. กด Ctrl+Shift+P > พิมพ์ "screenshot"\n5. เลือก "Capture full size screenshot"'
                );
            }
        } catch (error) {
            console.error('❌ Error creating map image:', error);
            alert(
                '❌ ' +
                    t('เกิดข้อผิดพลาดในการสร้างภาพ') +
                    '\n\nกรุณาใช้วิธี Screenshot แทน:\n• กด Print Screen\n• หรือใช้ Extension เช่น "Full Page Screen Capture"'
            );
        } finally {
            setIsCreatingImage(false);
        }
    };

    const handleCreatePDFReport = async () => {
        if (!mapRef.current) {
            alert(t('ไม่พบแผนที่'));
            return;
        }

        setIsCreatingPDF(true);
        try {
            console.log('📄 ' + t('เริ่มสร้าง PDF Report') + '...');

            // Reset rotation for PDF
            const currentRotation = mapRotation;
            if (currentRotation !== 0) {
                setMapRotation(0);
                await new Promise((resolve) => setTimeout(resolve, 500));
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
                alert(
                    '✅ ' +
                        t('สร้างรายงานสำเร็จ') +
                        '!\n\n• หากเป็น PDF: ไฟล์จะถูกดาวน์โหลดอัตโนมัติ\n• หากเป็น HTML: หน้าต่างใหม่จะเปิดขึ้น\n• สามารถพิมพ์หรือบันทึกเป็น PDF ได้'
                );
            } else {
                alert(
                    '⚠️ ' +
                        t('ไม่สามารถสร้างรายงานอัตโนมัติได้') +
                        '\n\nกรุณาใช้วิธีดาวน์โหลดข้อมูล JSON/CSV แทน\nหรือคัดลอกข้อมูลจากหน้าจอ'
                );
            }
        } catch (error) {
            console.error('❌ Error creating PDF:', error);
            alert(
                '❌ ' +
                    t('เกิดข้อผิดพลาดในการสร้าง PDF') +
                    '\n\nกรุณาลองใช้:\n• ดาวน์โหลด JSON/CSV\n• Screenshot หน้าจอ\n• คัดลอกข้อมูลด้วยตนเอง'
            );
        } finally {
            setIsCreatingPDF(false);
        }
    };

    const handleDownloadJSON = async () => {
        setIsCreatingExport(true);
        try {
            downloadStatsAsJSON(`${projectData?.projectName || 'horticulture'}-stats`);
            alert('✅ ' + t('ดาวน์โหลดไฟล์ JSON สำเร็จ') + '!');
        } catch (error) {
            console.error('❌ Error downloading JSON:', error);
            alert('❌ ' + t('เกิดข้อผิดพลาดในการดาวน์โหลด JSON'));
        } finally {
            setIsCreatingExport(false);
        }
    };

    const handleDownloadCSV = async () => {
        setIsCreatingExport(true);
        try {
            downloadStatsAsCSV(`${projectData?.projectName || 'horticulture'}-stats`);
            alert('✅ ' + t('ดาวน์โหลดไฟล์ CSV สำเร็จ') + '!');
        } catch (error) {
            console.error('❌ Error downloading CSV:', error);
            alert('❌ ' + t('เกิดข้อผิดพลาดในการดาวน์โหลด CSV'));
        } finally {
            setIsCreatingExport(false);
        }
    };

    const handleCopyStats = () => {
        const formattedStats = getFormattedStats();
        if (formattedStats) {
            navigator.clipboard
                .writeText(formattedStats)
                .then(() => {
                    alert('✅ ' + t('คัดลอกข้อมูลสถิติลงคลิปบอร์ดเรียบร้อยแล้ว') + '!');
                })
                .catch(() => {
                    // Fallback: แสดงข้อมูลในหน้าต่างใหม่
                    const newWindow = window.open('', '_blank');
                    if (newWindow) {
                        newWindow.document.write(`<pre>${formattedStats}</pre>`);
                        alert(t('เปิดข้อมูลในหน้าต่างใหม่ กรุณาคัดลอกด้วยตนเอง'));
                    }
                });
        }
    };

    const handleNewProject = () => {
        localStorage.removeItem('horticultureIrrigationData');
        localStorage.removeItem('editingFieldId');
        router.visit('/horticulture/planner');
    };

    const handleEditProject = () => {
        // Keep the saved data for editing
        // Don't clear editingFieldId so the planner knows we're editing
        router.visit('/horticulture/planner');
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

    const handleSaveToDatabase = async () => {
        if (!projectData || !projectSummary) return;

        setSavingToDatabase(true);
        setSaveError(null);
        setSaveSuccess(false);

        try {
            // Check if we're editing an existing field by looking for fieldId in URL or localStorage
            const urlParams = new URLSearchParams(window.location.search);
            let fieldId = urlParams.get('fieldId') || localStorage.getItem('editingFieldId');

            // Validate fieldId - if it's invalid, treat as new project
            if (fieldId && (fieldId === 'null' || fieldId === 'undefined' || fieldId === '')) {
                fieldId = null;
                localStorage.removeItem('editingFieldId');
            }

            console.log('Detected fieldId for save operation:', fieldId);
            console.log('URL params:', window.location.search);
            console.log('localStorage editingFieldId:', localStorage.getItem('editingFieldId'));
            // Prepare zones data
            const zonesData =
                projectData.zones?.map((zone) => ({
                    id: zone.id,
                    name: zone.name,
                    polygon_coordinates: zone.coordinates.map((coord) => ({
                        lat: coord.lat,
                        lng: coord.lng,
                    })),
                    color: zone.color,
                    pipe_direction: 'horizontal', // Default direction
                })) || [];

            // Prepare planting points data
            const plantingPointsData =
                projectData.plants?.map((plant) => {
                    // Find which zone this plant belongs to
                    let zoneId: number | null = null;
                    if (projectData.useZones && projectData.zones) {
                        for (const zone of projectData.zones) {
                            if (isPointInPolygon(plant.position, zone.coordinates)) {
                                zoneId = parseInt(zone.id);
                                break;
                            }
                        }
                    }

                    return {
                        lat: plant.position.lat,
                        lng: plant.position.lng,
                        point_id: plant.id, // Keep original ID for new saves, will be regenerated for updates
                        zone_id: zoneId,
                    };
                }) || [];

            // Prepare main pipes data
            const mainPipesData =
                projectData.mainPipes?.map((pipe) => ({
                    type: 'main',
                    direction: 'horizontal',
                    start_lat: pipe.coordinates[0]?.lat || 0,
                    start_lng: pipe.coordinates[0]?.lng || 0,
                    end_lat: pipe.coordinates[pipe.coordinates.length - 1]?.lat || 0,
                    end_lng: pipe.coordinates[pipe.coordinates.length - 1]?.lng || 0,
                    length: pipe.length,
                    plants_served: 0,
                    water_flow: pipe.flowRate || 0,
                    pipe_diameter: pipe.diameter,
                    zone_id: null,
                    row_index: null,
                    col_index: null,
                })) || [];

            // Prepare sub-main pipes data
            const subMainPipesData =
                projectData.subMainPipes?.map((pipe) => ({
                    type: 'submain',
                    direction: 'horizontal',
                    start_lat: pipe.coordinates[0]?.lat || 0,
                    start_lng: pipe.coordinates[0]?.lng || 0,
                    end_lat: pipe.coordinates[pipe.coordinates.length - 1]?.lat || 0,
                    end_lng: pipe.coordinates[pipe.coordinates.length - 1]?.lng || 0,
                    length: pipe.length,
                    plants_served: 0,
                    water_flow: 0,
                    pipe_diameter: pipe.diameter || 0,
                    zone_id: parseInt(pipe.zoneId),
                    row_index: null,
                    col_index: null,
                })) || [];

            // Prepare branch pipes data
            const branchPipesData =
                projectData.subMainPipes?.flatMap(
                    (subMainPipe) =>
                        subMainPipe.branchPipes?.map((branchPipe) => ({
                            type: 'branch',
                            direction: 'horizontal',
                            start_lat: branchPipe.coordinates[0]?.lat || 0,
                            start_lng: branchPipe.coordinates[0]?.lng || 0,
                            end_lat:
                                branchPipe.coordinates[branchPipe.coordinates.length - 1]?.lat || 0,
                            end_lng:
                                branchPipe.coordinates[branchPipe.coordinates.length - 1]?.lng || 0,
                            length: branchPipe.length,
                            plants_served: branchPipe.plants?.length || 0,
                            water_flow: 0,
                            pipe_diameter: branchPipe.diameter || 0,
                            zone_id: parseInt(subMainPipe.zoneId),
                            row_index: null,
                            col_index: null,
                        })) || []
                ) || [];

            // Prepare layers data (exclusion areas)
            const layersData =
                projectData.exclusionAreas?.map((area) => ({
                    type: area.type,
                    coordinates: area.coordinates.map((coord) => ({
                        lat: coord.lat,
                        lng: coord.lng,
                    })),
                    is_initial_map: false,
                })) || [];

            // Add main area as initial map layer
            if (projectData.mainArea && projectData.mainArea.length > 0) {
                layersData.unshift({
                    type: 'other',
                    coordinates: projectData.mainArea.map((coord) => ({
                        lat: coord.lat,
                        lng: coord.lng,
                    })),
                    is_initial_map: true,
                });
            }

            const requestData = {
                field_name: projectData.projectName,
                customer_name: projectData.customerName || '',
                category: 'horticulture', // Set category for horticulture projects
                area_coordinates: projectData.mainArea,
                plant_type_id: projectData.plants?.[0]?.plantData.id || 1,
                total_plants: projectData.plants?.length || 0,
                total_area: projectData.totalArea,
                total_water_need: projectSummary.totalWaterNeedPerSession,
                area_type: 'horticulture',
                layers: layersData,
                zones: zonesData,
                planting_points: plantingPointsData,
                pipes: [...mainPipesData, ...subMainPipesData, ...branchPipesData],
            };

            console.log('Saving horticulture project to database:', requestData);

            let response;
            if (fieldId && fieldId !== 'null' && fieldId !== 'undefined') {
                // Verify field exists before updating
                try {
                    const fieldCheck = await axios.get(`/api/fields/${fieldId}`);
                    if (!fieldCheck.data.success) {
                        console.log('Field not found, creating new field instead');
                        fieldId = null;
                        localStorage.removeItem('editingFieldId');
                    }
                } catch (error) {
                    console.log('Error checking field existence, creating new field instead');
                    fieldId = null;
                    localStorage.removeItem('editingFieldId');
                }
            }

            if (fieldId && fieldId !== 'null' && fieldId !== 'undefined') {
                // Update existing field
                console.log('Updating existing field with ID:', fieldId);
                response = await axios.put(`/api/fields/${fieldId}`, requestData, {
                    headers: {
                        'X-CSRF-TOKEN': document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content'),
                        'Content-Type': 'application/json',
                    },
                });
            } else {
                // Create new field
                console.log('Creating new field');
                response = await axios.post('/api/save-field', requestData, {
                    headers: {
                        'X-CSRF-TOKEN': document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content'),
                        'Content-Type': 'application/json',
                    },
                });
            }

            if (response.data.success) {
                setSaveSuccess(true);
                console.log('✅ Horticulture project saved successfully');

                // Clear editing field ID after successful save
                localStorage.removeItem('editingFieldId');

                // Redirect immediately to home page
                router.visit('/');
            } else {
                throw new Error('Failed to save project');
            }
        } catch (error) {
            console.error('❌ Error saving horticulture project:', error);
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.message ||
                  error.response?.data?.error ||
                  error.message ||
                  'Error saving project'
                : 'An unexpected error occurred';
            setSaveError(errorMessage);
        } finally {
            setSavingToDatabase(false);
        }
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
                        {t('กลับไปสร้างโครงการใหม่')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />
            <div className="p-6">
                <div className="mx-auto w-full">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <h1 className="mb-4 text-4xl font-bold text-green-400">
                            🌱 {t('รายงานการออกแบบระบบน้ำสวนผลไม้')}
                        </h1>
                        <h2 className="text-2xl text-gray-300">{projectData.projectName}</h2>
                        <p className="mt-2 text-gray-400">
                            {t('วันที่สร้าง')}:{' '}
                            {new Date(projectData.createdAt).toLocaleDateString('th-TH')}
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
                                        {isCreatingImage
                                            ? '⏳ ' + t('สร้าง...')
                                            : '📷 ' + t('ดาวน์โหลดภาพ')}
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
                                        {isCreatingPDF
                                            ? '⏳ ' + t('สร้าง...')
                                            : '📄 ' + t('สร้างรายงาน')}
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
                                    <h4 className="mb-3 text-sm font-semibold text-blue-300">
                                        🔄 การหมุนแผนที่
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <label className="w-16 text-xs text-gray-300">
                                                หมุน:
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="360"
                                                step="1"
                                                value={mapRotation}
                                                onChange={(e) =>
                                                    handleRotationChange(parseInt(e.target.value))
                                                }
                                                className="flex-1 accent-blue-600"
                                            />
                                            <span className="w-12 text-xs text-blue-300">
                                                {mapRotation}°
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() =>
                                                    handleRotationChange(mapRotation - 15)
                                                }
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
                                                onClick={() =>
                                                    handleRotationChange(mapRotation + 15)
                                                }
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
                                            <label className="text-xs text-gray-300">
                                                🔒 ล็อกการซูมและลาก
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Size Controls */}
                                <div className="rounded-lg bg-gray-700 p-4">
                                    <h4 className="mb-3 text-sm font-semibold text-green-300">
                                        📏 ขนาดไอคอน
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <label className="w-16 text-xs text-gray-300">
                                                ท่อ:
                                            </label>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="3"
                                                step="0.1"
                                                value={pipeSize}
                                                onChange={(e) =>
                                                    handlePipeSizeChange(parseFloat(e.target.value))
                                                }
                                                className="flex-1 accent-green-600"
                                            />
                                            <span className="w-12 text-xs text-green-300">
                                                {pipeSize.toFixed(1)}x
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="w-16 text-xs text-gray-300">
                                                ไอคอน:
                                            </label>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="3"
                                                step="0.1"
                                                value={iconSize}
                                                onChange={(e) =>
                                                    handleIconSizeChange(parseFloat(e.target.value))
                                                }
                                                className="flex-1 accent-yellow-600"
                                            />
                                            <span className="w-12 text-xs text-yellow-300">
                                                {iconSize.toFixed(1)}x
                                            </span>
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
                                    <MapRotationController
                                        rotation={mapRotation}
                                        isLocked={isMapLocked}
                                    />

                                    {/* Main Area */}
                                    {projectData.mainArea.length > 0 && (
                                        <Polygon
                                            positions={projectData.mainArea.map((coord) => [
                                                coord.lat,
                                                coord.lng,
                                            ])}
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
                                                positions={area.coordinates.map((coord) => [
                                                    coord.lat,
                                                    coord.lng,
                                                ])}
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
                                                positions={zone.coordinates.map((coord) => [
                                                    coord.lat,
                                                    coord.lng,
                                                ])}
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
                                            position={[
                                                projectData.pump.position.lat,
                                                projectData.pump.position.lng,
                                            ]}
                                            icon={createEnhancedPumpIcon(20 * iconSize)}
                                        />
                                    )}

                                    {/* Enhanced Main Pipes with size control */}
                                    {projectData.mainPipes &&
                                        projectData.mainPipes.map((pipe) => (
                                            <Polyline
                                                key={pipe.id}
                                                positions={pipe.coordinates.map((coord) => [
                                                    coord.lat,
                                                    coord.lng,
                                                ])}
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
                                                    positions={pipe.coordinates.map((coord) => [
                                                        coord.lat,
                                                        coord.lng,
                                                    ])}
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
                                                            positions={branchPipe.coordinates.map(
                                                                (coord) => [coord.lat, coord.lng]
                                                            )}
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
                                        <div
                                            className="h-1 w-4 bg-blue-500"
                                            style={{ height: `${2 * pipeSize}px` }}
                                        ></div>
                                        <span>ท่อเมน (จากปั๊ม)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-1 w-4 bg-purple-500"
                                            style={{ height: `${1.5 * pipeSize}px` }}
                                        ></div>
                                        <span>ท่อเมนรอง</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-1 w-4 bg-yellow-300"
                                            style={{ height: `${1 * pipeSize}px` }}
                                        ></div>
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
                                                fontSize: `10px`,
                                            }}
                                        >
                                            P
                                        </div>
                                        <span>ปั๊มน้ำ</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <img
                                            src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAABlklEQVR4nI1TW0sCQRTel/plqSlGEUTPQRqRRBSE9tJDd7tApVI+VERRWcvMbNkFDArsSsLOZV8q+yXFiZ20dtdZaeB7OXO+M+d88x1N8xwhCq0WJZ2C4Zyg+FSC4ayMiUKr1uxwTqKC4apgBJSg5N1iKKIkM4aHOSVfvuQaajmJhpe5gvxQ2YPHyr6yiEWN8O/MgpJ3Z8L+zTTMFPth4CgokS8l4ex+1VMIf0hNLGZ0OS9MU4fBQjvEDtsaoJcX3Z2YqEOTatcClOowjnqU5DpQefmvACMZjVNSrAeun/Ku5GQuAFPLIUjlgjC88xPD5RXHr+BTTVBy5uwghXohftAG4xsBWJpph42JMCR2A5I8pnd7BTXsEbJeDexOZosxmEuHYG0yDGtXIzB/HofSc96tgT2CJV2n/G9A26NwnO7z9wQnUe3lZbOFU/ymSrjcSsLJgl8BXP21tsVQRGWku4sM3CL319XwybkRdC8RI4l/W5niIeU+2Pb0G+dHNPzKTRRqupFSExN12ArX15lTvG7H7Dsv4Rsa94hVuqmogAAAAABJRU5ErkJggg=="
                                            alt="tree"
                                            style={{
                                                width: `18px`,
                                                height: `18px`,
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
                                <h3 className="mb-4 text-xl font-semibold text-green-400">
                                    📊 ข้อมูลโดยรวม
                                </h3>
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
                                            {formatWaterVolume(
                                                projectSummary.totalWaterNeedPerSession
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pipe System Summary */}
                            <div className="rounded-lg bg-gray-800 p-6">
                                <h3 className="mb-4 text-xl font-semibold text-blue-400">
                                    🔧 ระบบท่อ
                                </h3>

                                {/* Main Pipes */}
                                <div className="mb-4 rounded bg-gray-700 p-4">
                                    <h4 className="mb-2 font-semibold text-blue-300">🔵 ท่อเมน</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-400">
                                                ท่อเมนที่ยาวที่สุด:
                                            </span>
                                            <div className="font-bold text-blue-400">
                                                {formatDistance(projectSummary.mainPipes.longest)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">ท่อเมนยาวรวม:</span>
                                            <div className="font-bold text-blue-400">
                                                {formatDistance(
                                                    projectSummary.mainPipes.totalLength
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sub-Main Pipes */}
                                <div className="mb-4 rounded bg-gray-700 p-4">
                                    <h4 className="mb-2 font-semibold text-purple-300">
                                        🟣 ท่อเมนรอง
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-400">
                                                ท่อเมนรองที่ยาวที่สุด:
                                            </span>
                                            <div className="font-bold text-purple-400">
                                                {formatDistance(
                                                    projectSummary.subMainPipes.longest
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">ท่อเมนรองยาวรวม:</span>
                                            <div className="font-bold text-purple-400">
                                                {formatDistance(
                                                    projectSummary.subMainPipes.totalLength
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Branch Pipes */}
                                <div className="mb-4 rounded bg-gray-700 p-4">
                                    <h4 className="mb-2 font-semibold text-yellow-300">
                                        🟡 ท่อย่อย
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-400">
                                                ท่อย่อยที่ยาวที่สุด:
                                            </span>
                                            <div className="font-bold text-yellow-400">
                                                {formatDistance(projectSummary.branchPipes.longest)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">ท่อย่อยยาวรวม:</span>
                                            <div className="font-bold text-yellow-400">
                                                {formatDistance(
                                                    projectSummary.branchPipes.totalLength
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Combined Longest Pipes */}
                                <div className="rounded bg-yellow-900/30 p-4">
                                    <h4 className="mb-2 font-semibold text-yellow-300">
                                        📏 ท่อที่ยาวที่สุดรวมกัน
                                    </h4>
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
                                        {projectSummary.zoneDetails.map((zone, index) => {
                                            // ดึงข้อมูลพืชจาก zoneDetails โดยตรง
                                            const plantInfo = zone.plantData || null;
                                            const plantName = plantInfo?.name || 'ไม่ระบุ';
                                            const waterPerPlant = zone.waterPerPlant || 0;
                                            const plantSpacing = plantInfo?.plantSpacing || 0;
                                            const rowSpacing = plantInfo?.rowSpacing || 0;

                                            // Debug ข้อมูลพืช
                                            console.log(`🔍 Zone ${index} plant data:`, {
                                                zoneId: zone.zoneId,
                                                zoneName: zone.zoneName,
                                                plantInfo,
                                                plantName,
                                                plantSpacing,
                                                rowSpacing,
                                            });

                                            // ดึงข้อมูลสีของโซน (เฉพาะเมื่อใช้โซน)
                                            const zoneColor = projectData.useZones
                                                ? projectData.zones.find(
                                                      (z) => z.id === zone.zoneId
                                                  )?.color
                                                : null;

                                            return (
                                                <div
                                                    key={zone.zoneId}
                                                    className="rounded bg-gray-700 p-4"
                                                >
                                                    {/* Zone Header */}
                                                    <div className="mb-3 flex items-center justify-between">
                                                        <h4 className="font-semibold text-green-300">
                                                            {zone.zoneName}
                                                        </h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-gray-400">
                                                                🌱 {plantName}
                                                            </span>
                                                            {zoneColor && (
                                                                <div
                                                                    className="h-4 w-4 rounded"
                                                                    style={{
                                                                        backgroundColor: zoneColor,
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Zone Basic Info - แสดงข้อมูลน้ำต่อต้นด้วย */}
                                                    <div className="mb-3 grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-gray-400">
                                                                พื้นที่โซน:
                                                            </span>
                                                            <div className="font-bold text-green-400">
                                                                {formatAreaInRai(zone.areaInRai)}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">
                                                                จำนวนต้นไม้:
                                                            </span>
                                                            <div className="font-bold text-yellow-400">
                                                                {zone.plantCount.toLocaleString()}{' '}
                                                                ต้น
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">
                                                                น้ำต่อต้นต่อครั้ง:
                                                            </span>
                                                            <div className="font-bold text-blue-400">
                                                                {waterPerPlant} ลิตร/ต้น
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">
                                                                ปริมาณน้ำรวมต่อครั้ง:
                                                            </span>
                                                            <div className="font-bold text-cyan-400">
                                                                {formatWaterVolume(
                                                                    zone.waterNeedPerSession
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Plant Spacing Info */}
                                                    <div className="mb-3 rounded bg-gray-600/50 p-2 text-xs">
                                                        <span className="text-gray-400">
                                                            ระยะปลูก:
                                                        </span>
                                                        <span className="ml-2 text-white">
                                                            {plantSpacing} × {rowSpacing} เมตร
                                                            (ระหว่างต้น × ระหว่างแถว)
                                                        </span>
                                                    </div>

                                                    {/* Zone Pipes */}
                                                    <div className="space-y-2 text-xs">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="rounded bg-blue-900/30 p-2">
                                                                <div className="text-blue-300">
                                                                    ท่อเมนในโซน
                                                                </div>
                                                                <div>
                                                                    ยาวที่สุด:{' '}
                                                                    {formatDistance(
                                                                        zone.mainPipesInZone.longest
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    รวม:{' '}
                                                                    {formatDistance(
                                                                        zone.mainPipesInZone
                                                                            .totalLength
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="rounded bg-purple-900/30 p-2">
                                                                <div className="text-purple-300">
                                                                    ท่อเมนรองในโซน
                                                                </div>
                                                                <div>
                                                                    ยาวที่สุด:{' '}
                                                                    {formatDistance(
                                                                        zone.subMainPipesInZone
                                                                            .longest
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    รวม:{' '}
                                                                    {formatDistance(
                                                                        zone.subMainPipesInZone
                                                                            .totalLength
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="rounded bg-green-900/30 p-2">
                                                            <div className="text-green-300">
                                                                ท่อย่อยในโซน
                                                            </div>
                                                            <div>
                                                                ยาวที่สุด:{' '}
                                                                {formatDistance(
                                                                    zone.branchPipesInZone.longest
                                                                )}{' '}
                                                                | รวม:{' '}
                                                                {formatDistance(
                                                                    zone.branchPipesInZone
                                                                        .totalLength
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Summary Calculation */}
                                                    <div className="mt-3 rounded bg-blue-900/20 p-2 text-xs">
                                                        <div className="text-blue-300">
                                                            สรุปการคำนวณ:
                                                        </div>
                                                        <div className="mt-1 text-gray-300">
                                                            {zone.plantCount.toLocaleString()} ต้น ×{' '}
                                                            {waterPerPlant} ลิตร/ต้น ={' '}
                                                            {formatWaterVolume(
                                                                zone.waterNeedPerSession
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Success/Error Messages */}
                    {saveSuccess && (
                        <div className="mt-6 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-green-400">
                            <span className="text-lg">✅</span>
                            <span>โครงการบันทึกสำเร็จ! กำลังกลับไปหน้าหลัก</span>
                        </div>
                    )}

                    {saveError && (
                        <div className="mt-6 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
                            <span className="text-lg">❌</span>
                            <span>เกิดข้อผิดพลาด: {saveError}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-12 flex justify-center gap-4">
                        <button
                            onClick={handleSaveToDatabase}
                            disabled={savingToDatabase}
                            className="rounded-lg bg-purple-600 px-6 py-3 font-semibold transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {savingToDatabase ? (
                                <>
                                    <svg
                                        className="mr-2 inline h-4 w-4 animate-spin"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    กำลังบันทึก...
                                </>
                            ) : (
                                '💾 บันทึกโครงการ'
                            )}
                        </button>
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
                            <p>
                                🗺️ <strong>แผนที่แบบใหม่:</strong> หมุนได้ 360° + ล็อกซูม +
                                ปรับขนาดไอคอน
                            </p>
                            <p>
                                📷 <strong>ระบบบันทึกภาพ:</strong> รีเซ็ตการหมุนอัตโนมัติ + คู่มือ
                                Screenshot
                            </p>
                            <p>
                                📄 <strong>ระบบรายงาน:</strong> PDF / HTML / JSON / CSV +
                                แก้ปัญหาครบครัน
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
}
