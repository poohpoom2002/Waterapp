/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { useLanguage } from '../contexts/LanguageContext';
import HorticultureMapComponent from '../components/horticulture/HorticultureMapComponent';

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

interface Coordinate {
    lat: number;
    lng: number;
}

interface Zone {
    id: string;
    name: string;
    coordinates: Coordinate[];
    plantData: any;
    plantCount: number;
    totalWaterNeed: number;
    area: number;
    color: string;
}

interface MainPipe {
    id: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
}

interface SubMainPipe {
    id: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    branchPipes: BranchPipe[];
}

interface BranchPipe {
    id: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    plants: any[];
}

interface PlantLocation {
    id: string;
    position: Coordinate;
    plantData: any;
}

interface ExclusionArea {
    id: string;
    type: string;
    coordinates: Coordinate[];
    color: string;
}

const GoogleMapsResultsOverlays: React.FC<{
    map: google.maps.Map | null;
    projectData: HorticultureProjectData;
    mapRotation: number;
    pipeSize: number;
    iconSize: number;
}> = ({ map, projectData, mapRotation, pipeSize, iconSize }) => {
    const overlaysRef = useRef<{
        polygons: Map<string, google.maps.Polygon>;
        polylines: Map<string, google.maps.Polyline>;
        markers: Map<string, google.maps.Marker>;
    }>({
        polygons: new Map(),
        polylines: new Map(),
        markers: new Map(),
    });

    const clearOverlays = useCallback(() => {
        overlaysRef.current.polygons.forEach((polygon) => polygon.setMap(null));
        overlaysRef.current.polylines.forEach((polyline) => polyline.setMap(null));
        overlaysRef.current.markers.forEach((marker) => marker.setMap(null));

        overlaysRef.current.polygons.clear();
        overlaysRef.current.polylines.clear();
        overlaysRef.current.markers.clear();
    }, []);

    useEffect(() => {
        if (map) {
            const mapDiv = map.getDiv();
            if (mapDiv) {
                mapDiv.style.transform = `rotate(${mapRotation}deg)`;
                mapDiv.style.transformOrigin = 'center center';
            }
        }
    }, [map, mapRotation]);

    useEffect(() => {
        if (!map || !projectData) return;
        clearOverlays();

        if (projectData.mainArea && projectData.mainArea.length > 0) {
            const mainAreaPolygon = new google.maps.Polygon({
                paths: projectData.mainArea.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                fillColor: '#22C55E',
                fillOpacity: 0.1,
                strokeColor: '#22C55E',
                strokeWeight: 2 * pipeSize,
            });
            mainAreaPolygon.setMap(map);
            overlaysRef.current.polygons.set('main-area', mainAreaPolygon);
        }

        projectData.exclusionAreas?.forEach((area) => {
            const exclusionPolygon = new google.maps.Polygon({
                paths: area.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                fillColor: '#EF4444',
                fillOpacity: 0.4,
                strokeColor: '#EF4444',
                strokeWeight: 2 * pipeSize,
            });
            exclusionPolygon.setMap(map);
            overlaysRef.current.polygons.set(area.id, exclusionPolygon);
        });

        projectData.zones?.forEach((zone) => {
            const zonePolygon = new google.maps.Polygon({
                paths: zone.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                fillColor: zone.color,
                fillOpacity: 0.3,
                strokeColor: zone.color,
                strokeWeight: 3 * pipeSize,
            });
            zonePolygon.setMap(map);
            overlaysRef.current.polygons.set(zone.id, zonePolygon);
        });

        if (projectData.pump) {
            const pumpMarker = new google.maps.Marker({
                position: {
                    lat: projectData.pump.position.lat,
                    lng: projectData.pump.position.lng,
                },
                map: map,
                icon: {
                    url:
                        'data:image/svg+xml;charset=UTF-8,' +
                        encodeURIComponent(`
                        <svg width="${24 * iconSize}" height="${24 * iconSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="12" fill="#3B82F6" stroke="#ffffff" stroke-width="3"/>
                            <text x="12" y="16" text-anchor="middle" fill="white" font-size="${14 * iconSize}">P</text>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(24 * iconSize, 24 * iconSize),
                    anchor: new google.maps.Point(12 * iconSize, 12 * iconSize),
                },
                title: 'ปั๊มน้ำ',
            });
            overlaysRef.current.markers.set('pump', pumpMarker);
        }

        projectData.mainPipes?.forEach((pipe) => {
            const mainPipePolyline = new google.maps.Polyline({
                path: pipe.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                strokeColor: '#3B82F6',
                strokeWeight: 6 * pipeSize,
                strokeOpacity: 0.9,
            });
            mainPipePolyline.setMap(map);
            overlaysRef.current.polylines.set(pipe.id, mainPipePolyline);
        });

        projectData.subMainPipes?.forEach((subMainPipe) => {
            const subMainPolyline = new google.maps.Polyline({
                path: subMainPipe.coordinates.map((coord) => ({ lat: coord.lat, lng: coord.lng })),
                strokeColor: '#8B5CF6',
                strokeWeight: 4 * pipeSize,
                strokeOpacity: 0.9,
            });
            subMainPolyline.setMap(map);
            overlaysRef.current.polylines.set(subMainPipe.id, subMainPolyline);

            subMainPipe.branchPipes?.forEach((branchPipe) => {
                const branchPolyline = new google.maps.Polyline({
                    path: branchPipe.coordinates.map((coord) => ({
                        lat: coord.lat,
                        lng: coord.lng,
                    })),
                    strokeColor: '#FFFF66',
                    strokeWeight: 2 * pipeSize,
                    strokeOpacity: 0.8,
                });
                branchPolyline.setMap(map);
                overlaysRef.current.polylines.set(branchPipe.id, branchPolyline);
            });
        });

        projectData.plants?.forEach((plant) => {
            const plantMarker = new google.maps.Marker({
                position: { lat: plant.position.lat, lng: plant.position.lng },
                map: map,
                icon: {
                    url:
                        'data:image/svg+xml;charset=UTF-8,' +
                        encodeURIComponent(`
                        <svg width="${16 * iconSize}" height="${16 * iconSize}" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <text x="8" y="11" text-anchor="middle" fill="white" font-size="${16 * iconSize}">🌳</text>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(16 * iconSize, 16 * iconSize),
                    anchor: new google.maps.Point(8 * iconSize, 8 * iconSize),
                },
                title: plant.plantData.name,
            });
            overlaysRef.current.markers.set(plant.id, plantMarker);
        });

        const bounds = new google.maps.LatLngBounds();
        projectData.mainArea.forEach((coord) => {
            bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
        });

        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }, [map, projectData, pipeSize, iconSize, clearOverlays]);

    useEffect(() => {
        return () => {
            clearOverlays();
        };
    }, [clearOverlays]);

    return null;
};

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

    const [mapRotation, setMapRotation] = useState<number>(0);
    const [isMapLocked, setIsMapLocked] = useState<boolean>(false);
    const [pipeSize, setPipeSize] = useState<number>(1);
    const [iconSize, setIconSize] = useState<number>(1);

    const [isCreatingImage, setIsCreatingImage] = useState(false);
    const [isCreatingPDF, setIsCreatingPDF] = useState(false);
    const [isCreatingExport, setIsCreatingExport] = useState(false);

    const [savingToDatabase, setSavingToDatabase] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const mapRef = useRef<google.maps.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const data = loadProjectData();
            if (data) {
                setProjectData(data);
                const summary = calculateProjectSummary(data);
                setProjectSummary(summary);

                if (data.mainArea && data.mainArea.length > 0) {
                    const centerLat =
                        data.mainArea.reduce((sum, point) => sum + point.lat, 0) /
                        data.mainArea.length;
                    const centerLng =
                        data.mainArea.reduce((sum, point) => sum + point.lng, 0) /
                        data.mainArea.length;
                    setMapCenter([centerLat, centerLng]);

                    const latitudes = data.mainArea.map((p) => p.lat);
                    const longitudes = data.mainArea.map((p) => p.lng);
                    const maxLat = Math.max(...latitudes);
                    const minLat = Math.min(...latitudes);
                    const maxLng = Math.max(...longitudes);
                    const minLng = Math.min(...longitudes);
                    const latDiff = maxLat - minLat;
                    const lngDiff = maxLng - minLng;
                    const maxDiff = Math.max(latDiff, lngDiff);

                    let initialZoom;
                    if (maxDiff < 0.001) initialZoom = 20;
                    else if (maxDiff < 0.002) initialZoom = 19;
                    else if (maxDiff < 0.005) initialZoom = 18;
                    else if (maxDiff < 0.01) initialZoom = 17;
                    else if (maxDiff < 0.02) initialZoom = 16;
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

    const handleRotationChange = (newRotation: number) => {
        setMapRotation(newRotation);
    };

    const resetMapRotation = () => {
        setMapRotation(0);
    };

    const toggleMapLock = () => {
        setIsMapLocked(!isMapLocked);
        if (mapRef.current) {
            if (!isMapLocked) {
                mapRef.current.setOptions({
                    draggable: false,
                    zoomControl: false,
                    scrollwheel: false,
                    disableDoubleClickZoom: true,
                });
            } else {
                mapRef.current.setOptions({
                    draggable: true,
                    zoomControl: true,
                    scrollwheel: true,
                    disableDoubleClickZoom: false,
                });
            }
        }
    };

    const handlePipeSizeChange = (newSize: number) => {
        setPipeSize(Math.max(0.5, Math.min(3, newSize)));
    };

    const handleIconSizeChange = (newSize: number) => {
        setIconSize(Math.max(0.5, Math.min(3, newSize)));
    };

    const resetSizes = () => {
        setPipeSize(1);
        setIconSize(1);
    };

    const handleNewProject = () => {
        localStorage.removeItem('horticultureIrrigationData');
        localStorage.removeItem('editingFieldId');
        handleExportMapToProduct();
        router.visit('/horticulture/planner');
    };

    const handleEditProject = () => {
        // ตั้งค่า flag บอกว่ากำลังแก้ไขโครงการเดิม
        localStorage.setItem('isEditingExistingProject', 'true');
        
        // ตรวจสอบว่าข้อมูลโครงการยังอยู่ใน localStorage หรือไม่
        const existingData = localStorage.getItem('horticultureIrrigationData');
        if (!existingData && projectData) {
            // หากไม่มีข้อมูลใน localStorage แต่มี projectData ให้บันทึกกลับ
            localStorage.setItem('horticultureIrrigationData', JSON.stringify(projectData));
        }
        
        router.visit('/horticulture/planner');
    };

    const handleMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        setMapLoaded(true);
    }, []);


    const handleExportMapToProduct = async () => {
        if (!mapContainerRef.current) {
            alert(t('ไม่พบแผนที่'));
            return;
        }
        setIsCreatingImage(true);
        try {
            const currentRotation = mapRotation;
            if (currentRotation !== 0) {
                setMapRotation(0);
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));

            const html2canvas = await import('html2canvas');
            const html2canvasLib = html2canvas.default || html2canvas;

            const canvas = await html2canvasLib(mapContainerRef.current, {
                useCORS: true,
                allowTaint: true,
                scale: 2,
                logging: false,
                backgroundColor: '#1F2937',
                width: mapContainerRef.current.offsetWidth,
                height: mapContainerRef.current.offsetHeight,
                onclone: (clonedDoc) => {
                    try {
                        const controls = clonedDoc.querySelectorAll(
                            '.leaflet-control-container, .gm-control-active'
                        );
                        controls.forEach((el) => el.remove());

                        const elements = clonedDoc.querySelectorAll('*');
                        elements.forEach((el: Element) => {
                            const htmlEl = el as HTMLElement;
                            const computedStyle = window.getComputedStyle(htmlEl);

                            const color = computedStyle.color;
                            if (color && (color.includes('oklch') || color.includes('hsl'))) {
                                htmlEl.style.color = '#FFFFFF';
                            }

                            const backgroundColor = computedStyle.backgroundColor;
                            if (
                                backgroundColor &&
                                (backgroundColor.includes('oklch') ||
                                    backgroundColor.includes('hsl'))
                            ) {
                                if (
                                    backgroundColor.includes('transparent') ||
                                    backgroundColor.includes('rgba(0,0,0,0)')
                                ) {
                                    htmlEl.style.backgroundColor = 'transparent';
                                } else {
                                    htmlEl.style.backgroundColor = '#1F2937';
                                }
                            }

                            const borderColor = computedStyle.borderColor;
                            if (
                                borderColor &&
                                (borderColor.includes('oklch') || borderColor.includes('hsl'))
                            ) {
                                htmlEl.style.borderColor = '#374151';
                            }

                            const outlineColor = computedStyle.outlineColor;
                            if (
                                outlineColor &&
                                (outlineColor.includes('oklch') || outlineColor.includes('hsl'))
                            ) {
                                htmlEl.style.outlineColor = '#374151';
                            }
                        });

                        const problematicElements = clonedDoc.querySelectorAll(
                            '[style*="oklch"], [style*="hsl"]'
                        );
                        problematicElements.forEach((el) => {
                            const htmlEl = el as HTMLElement;
                            htmlEl.style.removeProperty('color');
                            htmlEl.style.removeProperty('background-color');
                            htmlEl.style.removeProperty('border-color');
                            htmlEl.style.removeProperty('outline-color');
                        });
                    } catch (error) {
                        console.warn('⚠️ คำเตือนใน onclone:', error);
                    }
                },
            });

            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

            if (currentRotation !== 0) {
                setMapRotation(currentRotation);
            }

            if (dataUrl && dataUrl !== 'data:,' && dataUrl.length > 100) {
                localStorage.setItem('projectMapImage', dataUrl);
                localStorage.setItem('projectType', 'horticulture');
                window.location.href = '/product';
            } else {
                throw new Error('ไม่สามารถสร้างภาพแผนที่ได้');
            }
        } catch (error) {
            console.error('❌ Error creating map image:', error);
            alert(
                '❌ เกิดข้อผิดพลาดในการสร้างภาพแผนผัง\n\nกรุณาใช้วิธี Screenshot แทน:\n\n1. กด F11 เพื่อ Fullscreen\n2. กด Print Screen หรือใช้ Snipping Tool\n3. หรือใช้ Extension "Full Page Screen Capture"'
            );
        } finally {
            setIsCreatingImage(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-32 w-32 animate-spin rounded-full border-b-2 border-white"></div>
                    <p className="text-xl">{t('กำลังโหลดข้อมูลโครงการ...')}</p>
                </div>
            </div>
        );
    }

    if (!projectData || !projectSummary) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="mb-4 text-2xl font-bold">{t('ไม่พบข้อมูลโครงการ')}</h1>
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
            <div className="p-4">
                <div className="mx-auto w-full">
                    {/* Header */}
                    <div className="mx-4 mb-4 flex justify-between text-left">
                        <div className="my-4 flex justify-start">
                            <h1 className="mb-2 text-2xl font-bold text-green-400">
                            {t('รายงานการออกแบบระบบน้ำพืชสวน')}
                            </h1>
                            <h2 className="text-xl text-gray-300">{projectData.projectName}</h2>
                        </div>
                        {/* Action Buttons */}
                        <div className="my-4 flex justify-end gap-4">
                            <button
                                onClick={handleNewProject}
                                className="rounded-lg bg-green-600 px-6 py-3 font-semibold transition-colors hover:bg-green-700"
                            >
                                ➕ {t('โครงการใหม่')}
                            </button>
                            <button
                                onClick={handleEditProject}
                                className="rounded-lg bg-orange-600 px-6 py-3 font-semibold transition-colors hover:bg-orange-700"
                            >
                                ✏️ {t('แก้ไขโครงการ')}
                            </button>
                            <button
                                onClick={handleExportMapToProduct}
                                disabled={isCreatingImage}
                                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isCreatingImage ? (
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
                                        {t('กำลังส่งออก...')}
                                    </>
                                ) : (
                                    t('คำนวณระบบน้ำ')
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        <div className="rounded-lg bg-gray-800 p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xl font-semibold">🗺️ {t('แผนผังโครงการ')}</h3>
                            </div>

                            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <div className="rounded-lg bg-gray-700 p-4">
                                    <h4 className="mb-3 text-sm font-semibold text-blue-300">
                                        🔄 {t('การหมุนแผนที่')}
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <label className="w-16 text-xs text-gray-300">
                                                {t('หมุน')}:
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
                                                🔄 {t('รีเซ็ต')}
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
                                                🔒 {t('ล็อกการซูมและลาก')}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg bg-gray-700 p-4">
                                    <h4 className="mb-3 text-sm font-semibold text-green-300">
                                        📏 {t('ขนาดไอคอน')}
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <label className="w-16 text-xs text-gray-300">
                                                {t('ท่อ')}:
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
                                                {t('ไอคอน')}:
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
                                            🔄 {t('รีเซ็ตขนาด')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div
                                ref={mapContainerRef}
                                className="mb-4 h-[500px] w-full overflow-hidden rounded-lg border border-gray-600"
                                style={{ backgroundColor: 'rgb(31, 41, 55)' }}
                            >
                                <HorticultureMapComponent
                                    center={mapCenter}
                                    zoom={mapZoom}
                                    onMapLoad={handleMapLoad}
                                    mapOptions={{
                                        zoomControl: false,
                                        fullscreenControl: false,
                                        mapTypeControl: false,
                                        streetViewControl: false,
                                        clickableIcons: false,
                                        scrollwheel: false,
                                        disableDoubleClickZoom: false,
                                        gestureHandling: 'none',
                                    }}
                                >
                                    {mapLoaded && (
                                        <GoogleMapsResultsOverlays
                                            map={mapRef.current}
                                            projectData={projectData}
                                            mapRotation={mapRotation}
                                            pipeSize={pipeSize}
                                            iconSize={iconSize}
                                        />
                                    )}
                                </HorticultureMapComponent>
                            </div>

                            <div className="rounded-lg bg-gray-700 p-4">
                                <h4 className="mb-3 text-sm font-semibold">
                                    🎨 {t('คำอธิบายสัญลักษณ์')}
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-1 w-4 bg-blue-500"
                                            style={{ height: `${2 * pipeSize}px` }}
                                        ></div>
                                        <span>{t('ท่อเมนหลัก')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-1 w-4 bg-purple-500"
                                            style={{ height: `${1.5 * pipeSize}px` }}
                                        ></div>
                                        <span>{t('ท่อเมนรอง')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-1 w-4 bg-yellow-300"
                                            style={{ height: `${1 * pipeSize}px` }}
                                        ></div>
                                        <span>{t('ท่อย่อย')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 bg-red-500 opacity-50"></div>
                                        <span>{t('พื้นที่ต้องหลีกเลี่ยง')}</span>
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
                                        <span>{t('ปั๊มน้ำ')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="flex items-center justify-center"
                                            style={{
                                                width: `18px`,
                                                height: `18px`,
                                                fontSize: `18px`,
                                            }}
                                        >
                                            🌳
                                        </div>
                                        <span>{t('ต้นไม้')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="rounded-lg bg-gray-800 p-6">
                                <h3 className="mb-4 text-xl font-semibold text-green-400">
                                    📊 {t('ข้อมูลโดยรวม')}
                                </h3>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="rounded bg-gray-700 p-3">
                                        <div className="text-gray-400">
                                            {t('พื้นที่รวมทั้งหมด')}
                                        </div>
                                        <div className="text-lg font-bold text-green-400">
                                            {formatAreaInRai(projectSummary.totalAreaInRai)}
                                        </div>
                                    </div>
                                    <div className="rounded bg-gray-700 p-3">
                                        <div className="text-gray-400">{t('จำนวนโซน')}</div>
                                        <div className="text-lg font-bold text-blue-400">
                                            {projectSummary.totalZones} โซน
                                        </div>
                                    </div>
                                    <div className="rounded bg-gray-700 p-3">
                                        <div className="text-gray-400">
                                            {t('จำนวนต้นไม้ทั้งหมด')}
                                        </div>
                                        <div className="text-lg font-bold text-yellow-400">
                                            {projectSummary.totalPlants.toLocaleString()} ต้น
                                        </div>
                                    </div>
                                    <div className="rounded bg-gray-700 p-3">
                                        <div className="text-gray-400">
                                            {t('ปริมาณน้ำต่อครั้ง')}
                                        </div>
                                        <div className="text-lg font-bold text-cyan-400">
                                            {formatWaterVolume(
                                                projectSummary.totalWaterNeedPerSession
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg bg-gray-800 p-6">
                                <h3 className="mb-4 text-xl font-semibold text-blue-400">
                                    🔧 {t('ระบบท่อ')}
                                </h3>

                                <div className="mb-4 rounded bg-gray-700 p-4">
                                    <h4 className="mb-2 font-semibold text-blue-300">
                                        🔵 {t('ท่อเมน')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-400">
                                                {t('ท่อเมนที่ยาวที่สุด')}:
                                            </span>
                                            <div className="font-bold text-blue-400">
                                                {formatDistance(projectSummary.mainPipes.longest)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">
                                                {t('ท่อเมนยาวรวม')}:
                                            </span>
                                            <div className="font-bold text-blue-400">
                                                {formatDistance(
                                                    projectSummary.mainPipes.totalLength
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4 rounded bg-gray-700 p-4">
                                    <h4 className="mb-2 font-semibold text-purple-300">
                                        🟣 {t('ท่อเมนรอง')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-400">
                                                {t('ท่อเมนรองที่ยาวที่สุด')}:
                                            </span>
                                            <div className="font-bold text-purple-400">
                                                {formatDistance(
                                                    projectSummary.subMainPipes.longest
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">
                                                {t('ท่อเมนรองยาวรวม')}:
                                            </span>
                                            <div className="font-bold text-purple-400">
                                                {formatDistance(
                                                    projectSummary.subMainPipes.totalLength
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4 rounded bg-gray-700 p-4">
                                    <h4 className="mb-2 font-semibold text-yellow-300">
                                        🟡 {t('ท่อย่อย')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-400">
                                                {t('ท่อย่อยที่ยาวที่สุด')}:
                                            </span>
                                            <div className="font-bold text-yellow-400">
                                                {formatDistance(projectSummary.branchPipes.longest)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">
                                                {t('ท่อย่อยยาวรวม')}:
                                            </span>
                                            <div className="font-bold text-yellow-400">
                                                {formatDistance(
                                                    projectSummary.branchPipes.totalLength
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded bg-yellow-900/30 p-4">
                                    <h4 className="mb-2 font-semibold text-yellow-300">
                                        📏 {t('ท่อที่ยาวที่สุดรวมกัน')}
                                    </h4>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-yellow-400">
                                            {formatDistance(projectSummary.longestPipesCombined)}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            ({t('ท่อเมน')} + {t('ท่อเมนรอง')} +{' '}
                                            {t('ท่อย่อยที่ยาวที่สุด')})
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {projectSummary.zoneDetails.length > 0 && (
                                <div className="rounded-lg bg-gray-800 p-6">
                                    <h3 className="mb-4 text-xl font-semibold text-green-400">
                                        🏞️ {t('รายละเอียดแต่ละโซน')}
                                    </h3>
                                    <div className="space-y-4">
                                        {projectSummary.zoneDetails.map((zone, index) => {
                                            const plantInfo = zone.plantData || null;
                                            const plantName = plantInfo?.name || 'ไม่ระบุ';
                                            const waterPerPlant = zone.waterPerPlant || 0;
                                            const plantSpacing = plantInfo?.plantSpacing || 0;
                                            const rowSpacing = plantInfo?.rowSpacing || 0;

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

                                                    <div className="mb-3 grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-gray-400">
                                                                {t('พื้นที่โซน')}:
                                                            </span>
                                                            <div className="font-bold text-green-400">
                                                                {formatAreaInRai(zone.areaInRai)}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">
                                                                {t('จำนวนต้นไม้')}:
                                                            </span>
                                                            <div className="font-bold text-yellow-400">
                                                                {zone.plantCount.toLocaleString()}{' '}
                                                                {t('ต้น')}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">
                                                                {t('น้ำต่อต้นต่อครั้ง')}:
                                                            </span>
                                                            <div className="font-bold text-blue-400">
                                                                {waterPerPlant} {t('ลิตร/ต้น')}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">
                                                                {t('ปริมาณน้ำรวมต่อครั้ง')}:
                                                            </span>
                                                            <div className="font-bold text-cyan-400">
                                                                {formatWaterVolume(
                                                                    zone.waterNeedPerSession
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mb-3 rounded bg-gray-600/50 p-2 text-xs">
                                                        <span className="text-gray-400">
                                                            {t('ระยะปลูก')}:
                                                        </span>
                                                        <span className="ml-2 text-white">
                                                            {plantSpacing} × {rowSpacing}{' '}
                                                            {t('เมตร')}({t('ระหว่างต้น')} ×{' '}
                                                            {t('ระหว่างแถว')})
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2 text-xs">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="rounded bg-blue-900/30 p-2">
                                                                <div className="text-blue-300">
                                                                    {t('ท่อเมนในโซน')}
                                                                </div>
                                                                <div>
                                                                    {t('ยาวที่สุด')}:{' '}
                                                                    {formatDistance(
                                                                        zone.mainPipesInZone.longest
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    {t('รวม')}:{' '}
                                                                    {formatDistance(
                                                                        zone.mainPipesInZone
                                                                            .totalLength
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="rounded bg-purple-900/30 p-2">
                                                                <div className="text-purple-300">
                                                                    {t('ท่อเมนรองในโซน')}
                                                                </div>
                                                                <div>
                                                                    {t('ยาวที่สุด')}:{' '}
                                                                    {formatDistance(
                                                                        zone.subMainPipesInZone
                                                                            .longest
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    {t('รวม')}:{' '}
                                                                    {formatDistance(
                                                                        zone.subMainPipesInZone
                                                                            .totalLength
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="rounded bg-green-900/30 p-2">
                                                            <div className="text-green-300">
                                                                {t('ท่อย่อยในโซน')}
                                                            </div>
                                                            <div>
                                                                {t('ยาวที่สุด')}:{' '}
                                                                {formatDistance(
                                                                    zone.branchPipesInZone.longest
                                                                )}{' '}
                                                                | {t('รวม')}:{' '}
                                                                {formatDistance(
                                                                    zone.branchPipesInZone
                                                                        .totalLength
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 rounded bg-blue-900/20 p-2 text-xs">
                                                        <div className="text-blue-300">
                                                            {t('สรุปการคำนวณ')}:
                                                        </div>
                                                        <div className="mt-1 text-gray-300">
                                                            {zone.plantCount.toLocaleString()}{' '}
                                                            {t('ต้น')} × {waterPerPlant}{' '}
                                                            {t('ลิตร/ต้น')} ={' '}
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
                </div>
            </div>

            <Footer />
        </div>
    );
}

export default EnhancedHorticultureResultsPageContent;
