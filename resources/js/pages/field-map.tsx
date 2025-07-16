import { useState, useEffect, useCallback } from 'react';
import { Head, Link } from '@inertiajs/react';
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { getCropByValue } from '@/pages/utils/cropData';
import {
    ZONE_COLORS,
    OBSTACLE_TYPES,
    PIPE_TYPES,
    MAP_TILES,
    EQUIPMENT_TYPES,
    type PipeType,
    type EquipmentType,
    type ObstacleType,
} from '@/pages/utils/fieldMapConstants';
import {
    useMapState,
    useStepWizard,
    useFieldZoneState,
    usePipeSystemState,
    useEquipmentState,
    useIrrigationState,
} from '@/pages/hooks/useFieldMapState';
import Tooltip from '@/pages/components/Fieldcrop/Tooltip';
import LocationSearchOverlay from '@/pages/components/Fieldcrop/LocationSearchOverlay';
import MapControls from '@/pages/components/Fieldcrop/MapControls';
import MapClickHandler from '@/pages/components/Fieldcrop/MapClickHandler';
import FieldMapToolsPanel from '@/pages/components/Fieldcrop/FieldMapToolsPanel';
import FieldMapSmartControls from '@/pages/components/Fieldcrop/FieldMapSmartControls';
import FieldMapTypeSelector from '@/pages/components/Fieldcrop/FieldMapTypeSelector';

import ErrorBoundary from '@/pages/components/ErrorBoundary';
import ErrorMessage from '@/pages/components/ErrorMessage';
import LoadingSpinner from '@/pages/components/LoadingSpinner';

// Fix leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FieldMapProps {
    crops?: string;
    irrigation?: string;
}

export default function FieldMap({ crops, irrigation }: FieldMapProps) {
    // Custom hooks for state management
    const mapState = useMapState();
    const stepWizard = useStepWizard();
    const fieldZoneState = useFieldZoneState();
    const pipeSystemState = usePipeSystemState();
    const equipmentState = useEquipmentState();
    const irrigationState = useIrrigationState();

    // Destructure state
    const {
        mapCenter,
        setMapCenter,
        mapZoom,
        setMapZoom,
        mapType,
        setMapType,
        searchQuery,
        setSearchQuery,
        searchResults,
        setSearchResults,
        isSearching,
        setIsSearching,
        isLocationSelected,
        setIsLocationSelected,
        showDropdown,
        setShowDropdown,
        mapRef,
        blurTimeoutRef,
    } = mapState;

    const {
        currentStep,
        setCurrentStep,
        stepCompleted,
        setStepCompleted,
        drawingStage,
        setDrawingStage,
    } = stepWizard;

    const {
        selectedCrops,
        setSelectedCrops,
        selectedIrrigationType,
        setSelectedIrrigationType,
        mainField,
        setMainField,
        fieldAreaSize,
        setFieldAreaSize,
        zones,
        setZones,
        obstacles,
        setObstacles,
        currentZoneColor,
        setCurrentZoneColor,
        currentObstacleType,
        setCurrentObstacleType,
        selectedZone,
        setSelectedZone,
        showPlantSelector,
        setShowPlantSelector,
        zoneAssignments,
        setZoneAssignments,
        canDrawZone,
        setCanDrawZone,
        usedColors,
        setUsedColors,
        drawingMode,
        setDrawingMode,
        rowSpacing,
        setRowSpacing,
        tempRowSpacing,
        setTempRowSpacing,
        editingRowSpacingForCrop,
        setEditingRowSpacingForCrop,
        plantSpacing,
        setPlantSpacing,
        tempPlantSpacing,
        setTempPlantSpacing,
        editingPlantSpacingForCrop,
        setEditingPlantSpacingForCrop,
        featureGroupRef,
    } = fieldZoneState;

    const {
        currentPipeType,
        setCurrentPipeType,
        pipes,
        setPipes,
        canDrawPipe,
        setCanDrawPipe,
        pipeSnapEnabled,
        setPipeSnapEnabled,
        pipeSnapDistance,
        setPipeSnapDistance,
        pipeSnapIndicators,
        setPipeSnapIndicators,
        isGeneratingPipes,
        setIsGeneratingPipes,
        snapEnabled,
        setSnapEnabled,
        snapDistance,
        setSnapDistance,
        gridEnabled,
        setGridEnabled,
    } = pipeSystemState;

    const {
        equipmentIcons,
        setEquipmentIcons,
        selectedEquipmentType,
        setSelectedEquipmentType,
        isPlacingEquipment,
        setIsPlacingEquipment,
        equipmentHistory,
        setEquipmentHistory,
        equipmentHistoryIndex,
        setEquipmentHistoryIndex,
    } = equipmentState;

    const {
        irrigationAssignments,
        setIrrigationAssignments,
        irrigationPoints,
        setIrrigationPoints,
        irrigationLines,
        setIrrigationLines,
        irrigationSettings,
        setIrrigationSettings,
        irrigationRadius,
        setIrrigationRadius,
        sprinklerOverlap,
        setSprinklerOverlap,
    } = irrigationState;

    const [plantingPoints, setPlantingPoints] = useState<any[]>([]);
    const [zoneSummaries, setZoneSummaries] = useState<any>({});

    // New states for error handling and loading
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Parse URL parameters
    useEffect(() => {
        if (crops) {
            const cropArray = crops.split(',').filter(Boolean);
            setSelectedCrops(cropArray);
        }
        if (irrigation) {
            setSelectedIrrigationType(irrigation);
        }
    }, [crops, irrigation]);

    // Selected crop objects
    const selectedCropObjects = selectedCrops
        .map((cropValue) => getCropByValue(cropValue))
        .filter(Boolean);

    // Validation functions
    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                return mainField !== null && selectedCropObjects.length > 0;
            case 2:
                return zones.length > 0 && Object.keys(zoneAssignments).length > 0;
            case 3:
                return pipes.length > 0;
            case 4:
                return Object.keys(irrigationAssignments).length > 0;
            default:
                return false;
        }
    };

    const goToStep = (step: number) => {
        if (step < 1 || step > 4) {
            return;
        }

        if (step > currentStep) {
            for (let i = 1; i < step; i++) {
                if (!validateStep(i)) {
                    return;
                }
            }
        }

        setCurrentStep(step);
        const stages = ['', 'field', 'zones', 'pipes', 'irrigation'];
        setDrawingStage(stages[step] as any);
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setStepCompleted((prev) => ({ ...prev, [currentStep]: true }));
            if (currentStep < 4) {
                goToStep(currentStep + 1);
            }
        }
    };

    const previousStep = () => {
        if (currentStep > 1) {
            goToStep(currentStep - 1);
        }
    };

    const resetAll = () => {
        if (confirm('⚠️ คุณต้องการรีเซ็ตทั้งหมดหรือไม่? ข้อมูลที่วาดไว้จะหายทั้งหมด')) {
            // Clean up markers
            zones.forEach((zone) => {
                if (zone.plantMarker && mapRef.current) {
                    mapRef.current.removeLayer(zone.plantMarker);
                }
            });

            equipmentIcons.forEach((equipment) => {
                if (equipment.marker && mapRef.current) {
                    mapRef.current.removeLayer(equipment.marker);
                }
            });

            if (featureGroupRef.current) {
                featureGroupRef.current.clearLayers();
            }

            // Reset all state
            setMainField(null);
            setZones([]);
            setObstacles([]);
            setZoneAssignments({});
            setPipes([]);
            setUsedColors([]);
            setCanDrawZone(true);
            setCanDrawPipe(true);
            setCurrentZoneColor(ZONE_COLORS[0]);
            setCurrentPipeType('main');
            setDrawingMode('zone');
            setCurrentStep(1);
            setStepCompleted({});
            setDrawingStage('field');
            setFieldAreaSize(0);
            setEquipmentIcons([]);
            setSelectedEquipmentType(null);
            setIsPlacingEquipment(false);
            setEquipmentHistory([[]]);
            setEquipmentHistoryIndex(0);
            setIrrigationAssignments({});
            setIrrigationPoints([]);
            setIrrigationLines([]);
            setIrrigationSettings({});
            setIrrigationRadius({});
            setSprinklerOverlap({});
            hidePipeSnapIndicators();
            setZoneSummaries({});

            // Clear planting points (no markers to remove since we don't display them)
            setPlantingPoints([]);
        }
    };

    // Equipment functions
    const startPlacingEquipment = (equipmentType: EquipmentType) => {
        const equipmentConfig = EQUIPMENT_TYPES[equipmentType];
        setSelectedEquipmentType(equipmentType);
        setIsPlacingEquipment(true);

        if (mapRef.current) {
            mapRef.current.getContainer().style.cursor = 'crosshair';
        }
    };

    const cancelPlacingEquipment = () => {
        setIsPlacingEquipment(false);
        setSelectedEquipmentType(null);

        if (mapRef.current) {
            mapRef.current.getContainer().style.cursor = '';
        }
    };

    const placeEquipmentAtPosition = (lat: number, lng: number) => {
        if (!selectedEquipmentType) return;

        const equipmentConfig = EQUIPMENT_TYPES[selectedEquipmentType];
        const equipmentId = Date.now().toString();

        const newEquipment = {
            id: equipmentId,
            type: selectedEquipmentType,
            lat: lat,
            lng: lng,
            name: `${equipmentConfig.name} ${equipmentIcons.filter((e) => e.type === selectedEquipmentType).length + 1}`,
            config: equipmentConfig,
        };

        // Use image for pump, ballvalve, solenoid; fallback to icon for others
        let iconHtml = '';
        if (
            selectedEquipmentType === 'pump' ||
            selectedEquipmentType === 'ballvalve' ||
            selectedEquipmentType === 'solenoid'
        ) {
            let imgSrc = '';
            if (selectedEquipmentType === 'pump') imgSrc = '/generateTree/wtpump.png';
            if (selectedEquipmentType === 'ballvalve') imgSrc = '/generateTree/ballv.png';
            if (selectedEquipmentType === 'solenoid') imgSrc = '/generateTree/solv.png';
            iconHtml = `<img src="${imgSrc}" alt="${equipmentConfig.name}" style="width:32px;height:32px;object-fit:contain;display:block;margin:auto;" />`;
        } else {
            iconHtml = equipmentConfig.icon;
        }

        const customIcon = L.divIcon({
            html: `<div style="background: white; border: 2px solid ${equipmentConfig.color}; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer;" title="${equipmentConfig.name}">${iconHtml}</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20],
            className: 'custom-equipment-icon',
        });

        const marker = L.marker([lat, lng], { icon: customIcon }).bindPopup(
            `<div style="text-align: center;"><h3>${equipmentConfig.name}</h3><p>${equipmentConfig.description}</p><button onclick="removeEquipment('${equipmentId}')" style="background: #dc2626; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 5px;">ลบ</button></div>`
        );

        if (mapRef.current) {
            marker.addTo(mapRef.current);
        }

        (newEquipment as any).marker = marker;

        const newEquipmentState = [...equipmentIcons, newEquipment];
        setEquipmentIcons(newEquipmentState);
        saveEquipmentToHistory(newEquipmentState);
        cancelPlacingEquipment();
    };

    const removeEquipment = (equipmentId: string) => {
        const equipmentToRemove = equipmentIcons.find((e) => e.id === equipmentId);
        if (!equipmentToRemove) return;

        const equipmentConfig = EQUIPMENT_TYPES[equipmentToRemove.type];

        if (confirm(`ต้องการลบ ${equipmentConfig.name} หรือไม่?`)) {
            const newEquipmentState = equipmentIcons.filter((e) => e.id !== equipmentId);
            setEquipmentIcons(newEquipmentState);
            saveEquipmentToHistory(newEquipmentState);

            if (equipmentToRemove.marker && mapRef.current) {
                mapRef.current.removeLayer(equipmentToRemove.marker);
            }
        }
    };

    const clearAllEquipment = () => {
        if (equipmentIcons.length === 0) {
            return;
        }

        if (confirm('ต้องการลบอุปกรณ์ทั้งหมดหรือไม่?')) {
            equipmentIcons.forEach((equipment) => {
                if (equipment.marker && mapRef.current) {
                    mapRef.current.removeLayer(equipment.marker);
                }
            });

            setEquipmentIcons([]);
            saveEquipmentToHistory([]);
        }
    };

    const saveEquipmentToHistory = (newEquipmentState: any[]) => {
        const newHistory = equipmentHistory.slice(0, equipmentHistoryIndex + 1);
        newHistory.push([...newEquipmentState]);
        setEquipmentHistory(newHistory);
        setEquipmentHistoryIndex(newHistory.length - 1);
    };

    const undoEquipment = () => {
        if (equipmentHistoryIndex > 0) {
            equipmentIcons.forEach((equipment) => {
                if (equipment.marker && mapRef.current) {
                    mapRef.current.removeLayer(equipment.marker);
                }
            });

            const newIndex = equipmentHistoryIndex - 1;
            const restoredEquipment = equipmentHistory[newIndex];
            setEquipmentIcons([...restoredEquipment]);
            setEquipmentHistoryIndex(newIndex);

            restoredEquipment.forEach((equipment: any) => {
                const equipmentConfig = EQUIPMENT_TYPES[equipment.type];

                // Use image for pump, ballvalve, solenoid; fallback to icon for others
                let iconHtml = '';
                if (
                    equipment.type === 'pump' ||
                    equipment.type === 'ballvalve' ||
                    equipment.type === 'solenoid'
                ) {
                    let imgSrc = '';
                    if (equipment.type === 'pump') imgSrc = '/generateTree/wtpump.png';
                    if (equipment.type === 'ballvalve') imgSrc = '/generateTree/ballv.png';
                    if (equipment.type === 'solenoid') imgSrc = '/generateTree/solv.png';
                    iconHtml = `<img src="${imgSrc}" alt="${equipmentConfig.name}" style="width:32px;height:32px;object-fit:contain;display:block;margin:auto;" />`;
                } else {
                    iconHtml = equipmentConfig.icon;
                }

                const customIcon = L.divIcon({
                    html: `<div style="background: white; border: 2px solid ${equipmentConfig.color}; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer;" title="${equipmentConfig.name}">${iconHtml}</div>`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                    popupAnchor: [0, -20],
                    className: 'custom-equipment-icon',
                });

                const marker = L.marker([equipment.lat, equipment.lng], {
                    icon: customIcon,
                }).bindPopup(
                    `<div style="text-align: center;"><h3>${equipmentConfig.name}</h3><p>${equipmentConfig.description}</p><button onclick="removeEquipment('${equipment.id}')" style="background: #dc2626; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 5px;">ลบ</button></div>`
                );

                if (mapRef.current) {
                    marker.addTo(mapRef.current);
                }
                equipment.marker = marker;
            });
        }
    };

    const redoEquipment = () => {
        if (equipmentHistoryIndex < equipmentHistory.length - 1) {
            equipmentIcons.forEach((equipment) => {
                if (equipment.marker && mapRef.current) {
                    mapRef.current.removeLayer(equipment.marker);
                }
            });

            const newIndex = equipmentHistoryIndex + 1;
            const restoredEquipment = equipmentHistory[newIndex];
            setEquipmentIcons([...restoredEquipment]);
            setEquipmentHistoryIndex(newIndex);

            restoredEquipment.forEach((equipment: any) => {
                const equipmentConfig = EQUIPMENT_TYPES[equipment.type];

                // Use image for pump, ballvalve, solenoid; fallback to icon for others
                let iconHtml = '';
                if (
                    equipment.type === 'pump' ||
                    equipment.type === 'ballvalve' ||
                    equipment.type === 'solenoid'
                ) {
                    let imgSrc = '';
                    if (equipment.type === 'pump') imgSrc = '/generateTree/wtpump.png';
                    if (equipment.type === 'ballvalve') imgSrc = '/generateTree/ballv.png';
                    if (equipment.type === 'solenoid') imgSrc = '/generateTree/solv.png';
                    iconHtml = `<img src="${imgSrc}" alt="${equipmentConfig.name}" style="width:32px;height:32px;object-fit:contain;display:block;margin:auto;" />`;
                } else {
                    iconHtml = equipmentConfig.icon;
                }

                const customIcon = L.divIcon({
                    html: `<div style="background: white; border: 2px solid ${equipmentConfig.color}; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer;" title="${equipmentConfig.name}">${iconHtml}</div>`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                    popupAnchor: [0, -20],
                    className: 'custom-equipment-icon',
                });

                const marker = L.marker([equipment.lat, equipment.lng], {
                    icon: customIcon,
                }).bindPopup(
                    `<div style="text-align: center;"><h3>${equipmentConfig.name}</h3><p>${equipmentConfig.description}</p><button onclick="removeEquipment('${equipment.id}')" style="background: #dc2626; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 5px;">ลบ</button></div>`
                );

                if (mapRef.current) {
                    marker.addTo(mapRef.current);
                }
                equipment.marker = marker;
            });
        }
    };

    // Irrigation system types - UPDATED WITH DRIP POINTS
    const irrigationTypes = [
        {
            category: 'sprinkler',
            categoryName: 'การให้น้ำแบบฉีดฝอย (Sprinkler Irrigation)',
            categoryIcon: '💧',
            systems: [
                {
                    value: 'sprinkler',
                    name: 'สปริงเกลอร์ (Sprinkler)',
                    icon: '🌿',
                    description: 'ระบบฉีดน้ำแบบหมุนครอบคลุมพื้นที่กว้าง เหมาะสำหรับพืชไร่',
                    minRadius: 8,
                    maxRadius: 12,
                    defaultRadius: 12,
                    supportsOverlap: true,
                    color: '#22C55E',
                },
                {
                    value: 'mini_sprinkler',
                    name: 'มินิสปริงเกลอร์ (Mini Sprinkler)',
                    icon: '🌱',
                    description: 'สปริงเกลอร์ขนาดเล็ก เหมาะสำหรับต้นไม้และพืชผัก',
                    minRadius: 0.5,
                    maxRadius: 3,
                    defaultRadius: 1.5,
                    supportsOverlap: false,
                    color: '#3B82F6',
                },
            ],
        },
        {
            category: 'localized',
            categoryName: 'การให้น้ำแบบเฉพาะจุด (Localized Irrigation)',
            categoryIcon: '🎯',
            systems: [
                {
                    value: 'micro_spray',
                    name: 'ไมโครสเปรย์ และเจ็ท (Micro Spray & Jet)',
                    icon: '💦',
                    description: 'ระบบฉีดน้ำแบบละอองฝอย เหมาะสำหรับพืชที่ต้องการความชื้น',
                    minRadius: 3,
                    maxRadius: 8,
                    defaultRadius: 5,
                    supportsOverlap: false,
                    color: '#F59E0B',
                },
                {
                    value: 'drip_tape',
                    name: 'จุดน้ำหยด (Drip Points)',
                    icon: '💧',
                    description: 'ระบบจุดน้ำหยดตรงรากพืช ประหยัดน้ำมากที่สุด สามารถปรับระยะห่างได้',
                    minRadius: 0.3,
                    maxRadius: 3.0,
                    defaultRadius: 1.0,
                    supportsOverlap: false,
                    color: '#06B6D4',
                    isLinear: true,
                },
            ],
        },
    ];

    const selectedIrrigationSystem = irrigationTypes
        .flatMap((cat) => cat.systems)
        .find((sys) => sys.value === selectedIrrigationType);

    // Utility functions
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371000;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const getLineIntersection = (p1: any, p2: any, p3: any, p4: any) => {
        const x1 = p1.lng,
            y1 = p1.lat;
        const x2 = p2.lng,
            y2 = p2.lat;
        const x3 = p3.lng,
            y3 = p3.lat;
        const x4 = p4.lng,
            y4 = p4.lat;

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0000001) return null;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                lat: y1 + t * (y2 - y1),
                lng: x1 + t * (x2 - x1),
            };
        }
        return null;
    };

    const isPointInPolygon = (point: any, polygon: any) => {
        if (!polygon || !polygon.getLatLngs) return false;

        try {
            const coords = polygon.getLatLngs()[0];
            if (!coords || !Array.isArray(coords)) return false;

            let inside = false;
            const x = point.lng,
                y = point.lat;

            for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
                const xi = coords[i].lng,
                    yi = coords[i].lat;
                const xj = coords[j].lng,
                    yj = coords[j].lat;

                if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
                    inside = !inside;
                }
            }
            return inside;
        } catch (error) {
            return false;
        }
    };

    const isPointInObstacle = (point: any): boolean => {
        return obstacles.some((obstacle) => isPointInPolygon(point, obstacle.layer));
    };

    const isPointInZone = (point: any, zone: any): boolean => {
        return isPointInPolygon(point, zone.layer);
    };

    // Search functionality
    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        setIsSearching(true);
        setShowDropdown(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&countrycodes=th&addressdetails=1`
            );
            const data = await response.json();

            const results = data.map((item: any) => ({
                x: item.lon,
                y: item.lat,
                label: item.display_name,
                bounds: item.boundingbox
                    ? [
                          [parseFloat(item.boundingbox[0]), parseFloat(item.boundingbox[2])],
                          [parseFloat(item.boundingbox[1]), parseFloat(item.boundingbox[3])],
                      ]
                    : null,
                raw: item,
            }));

            setSearchResults(results);
            setShowDropdown(results.length > 0);
        } catch (error) {
            setSearchResults([]);
            setShowDropdown(false);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Search input with debounce
    useEffect(() => {
        if (isLocationSelected) {
            setIsLocationSelected(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            handleSearch(searchQuery);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, isLocationSelected, handleSearch]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
            }
        };
    }, []);

    // Show/hide snap indicators
    useEffect(() => {
        if (currentStep === 3 && pipeSnapEnabled) {
            showPipeSnapIndicators();
        } else {
            hidePipeSnapIndicators();
        }
    }, [currentStep, pipeSnapEnabled]);

    // Auto-update zone configuration
    useEffect(() => {
        if (currentStep === 2) {
            if (zones.length === 0) {
                setCanDrawZone(true);
                setUsedColors([]);
                setCurrentZoneColor(ZONE_COLORS[0]);
            }
        } else if (currentStep === 3) {
            if (pipes.length === 0) {
                setCanDrawPipe(true);
                setCurrentPipeType('main');
            }
        }
    }, [currentStep, zones.length, pipes.length]);

    // Navigate to search result
    const goToLocation = (result: any) => {
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
        }

        setShowDropdown(false);
        setMapCenter([parseFloat(result.y), parseFloat(result.x)]);
        setMapZoom(15);
        setIsLocationSelected(true);
        setSearchQuery(result.label.split(',')[0] || result.label);
        setSearchResults([]);
    };

    // Drawing event handlers
    const handleDrawCreated = (e: any) => {
        const { layer } = e;

        if (drawingStage === 'field') {
            if (mainField && featureGroupRef.current) {
                featureGroupRef.current.removeLayer(mainField);
            }

            layer.setStyle({
                color: '#22C55E',
                fillColor: '#22C55E',
                fillOpacity: 0.2,
                weight: 2,
                dashArray: undefined,
            });

            // Calculate field area
            try {
                const coords = layer.getLatLngs();
                if (coords && coords[0] && Array.isArray(coords[0])) {
                    const polygonCoords = coords[0].map((coord: any) => [coord.lng, coord.lat]);

                    const firstPoint = polygonCoords[0];
                    const lastPoint = polygonCoords[polygonCoords.length - 1];

                    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
                        polygonCoords.push(firstPoint);
                    }

                    const polygon = turf.polygon([polygonCoords]);
                    const area = turf.area(polygon);
                    setFieldAreaSize(area);
                }
            } catch (error) {
                setFieldAreaSize(0);
            }

            setMainField(layer);
            if (featureGroupRef.current) {
                featureGroupRef.current.addLayer(layer);
            }
        } else if (drawingStage === 'zones') {
            if (drawingMode === 'zone' && canDrawZone) {
                layer.setStyle({
                    color: currentZoneColor,
                    fillColor: currentZoneColor,
                    fillOpacity: 0.3,
                    weight: 2,
                    dashArray: undefined,
                });

                const newZone = {
                    id: Date.now(),
                    layer: layer,
                    color: currentZoneColor,
                    name: `Zone ${zones.length + 1}`,
                    plantMarker: null,
                };

                layer.on('click', () => {
                    setSelectedZone(newZone);
                    setShowPlantSelector(true);
                });

                // Try to snap zone to field boundary
                const wasSnapped = snapPolygonToField(layer);

                setZones((prev) => [...prev, newZone]);
                if (featureGroupRef.current) {
                    featureGroupRef.current.addLayer(layer);
                }

                setUsedColors((prev) => [...prev, currentZoneColor]);

                const availableColors = ZONE_COLORS.filter(
                    (color) => ![...usedColors, currentZoneColor].includes(color)
                );
                if (availableColors.length > 0) {
                    setCurrentZoneColor(availableColors[0]);
                    setCanDrawZone(true);
                } else {
                    setCurrentZoneColor(ZONE_COLORS[0]);
                    setUsedColors([]);
                    setCanDrawZone(true);
                }
            } else if (drawingMode === 'obstacle') {
                const obstacleConfig = OBSTACLE_TYPES[currentObstacleType];

                layer.setStyle({
                    color: obstacleConfig.color,
                    fillColor: obstacleConfig.fillColor,
                    fillOpacity: obstacleConfig.fillOpacity,
                    weight: 2,
                });

                layer.options.obstacleType = currentObstacleType;
                layer.options.obstacleId = Date.now().toString();

                const newObstacle = {
                    id: layer.options.obstacleId,
                    type: currentObstacleType,
                    layer: layer,
                    geometry: layer.toGeoJSON().geometry,
                    config: obstacleConfig,
                };

                setObstacles((prev) => [...prev, newObstacle]);
            }
        } else if (drawingStage === 'pipes' && canDrawPipe && PIPE_TYPES[currentPipeType].manual) {
            const pipeConfig = PIPE_TYPES[currentPipeType];

            layer.setStyle({
                color: pipeConfig.color,
                weight: pipeConfig.weight,
                opacity: pipeConfig.opacity,
                dashArray: undefined,
                fillOpacity: 0,
            });

            const newPipe = {
                id: Date.now(),
                layer: layer,
                type: currentPipeType,
                name: `${pipeConfig.name} ${pipes.filter((p) => p.type === currentPipeType).length + 1}`,
                color: pipeConfig.color,
                coordinates: layer.getLatLngs ? layer.getLatLngs() : [],
            };

            if (currentPipeType === 'main' || currentPipeType === 'submain') {
                snapPipeToOtherPipes(layer, currentPipeType);
            }

            setPipes((prev) => [...prev, newPipe]);
            if (featureGroupRef.current) {
                featureGroupRef.current.addLayer(layer);
            }
        }
    };

    const handleDrawDeleted = (e: any) => {
        const { layers } = e;
        layers.eachLayer((layer: any) => {
            if (layer === mainField) {
                setMainField(null);
                setDrawingStage('field');
                setZones([]);
                setObstacles([]);
                setUsedColors([]);
                setCanDrawZone(true);
                setPipes([]);
            } else {
                const zoneToRemove = zones.find((zone) => zone.layer === layer);
                if (zoneToRemove) {
                    if (zoneToRemove.plantMarker && mapRef.current) {
                        mapRef.current.removeLayer(zoneToRemove.plantMarker);
                    }
                    setZoneAssignments((prev) => {
                        const newAssignments = { ...prev };
                        delete newAssignments[zoneToRemove.id];
                        return newAssignments;
                    });

                    setUsedColors((prev) => prev.filter((color) => color !== zoneToRemove.color));

                    if (zoneToRemove.color === currentZoneColor) {
                        setCanDrawZone(true);
                    }
                }

                const obstacleToRemove = obstacles.find((obstacle) => obstacle.layer === layer);
                if (obstacleToRemove) {
                    setObstacles((prev) => prev.filter((obstacle) => obstacle.layer !== layer));
                }

                const pipeToRemove = pipes.find((pipe) => pipe.layer === layer);
                if (pipeToRemove) {
                    setPipes((prev) => prev.filter((pipe) => pipe.layer !== layer));
                }

                setZones((prev) => prev.filter((zone) => zone.layer !== layer));
            }
        });
    };

    // Snap functions (simplified)
    const getPolygonSnapPoints = () => {
        const snapPoints: any[] = [];

        if (mainField && mainField.getLatLngs) {
            try {
                const coords = mainField.getLatLngs()[0];
                if (coords && Array.isArray(coords)) {
                    coords.forEach((coord: any, index: number) => {
                        snapPoints.push({
                            latlng: coord,
                            type: 'vertex',
                            source: 'field',
                        });

                        const nextCoord = coords[(index + 1) % coords.length];
                        const midLat = (coord.lat + nextCoord.lat) / 2;
                        const midLng = (coord.lng + nextCoord.lng) / 2;
                        snapPoints.push({
                            latlng: { lat: midLat, lng: midLng },
                            type: 'edge-midpoint',
                            source: 'field',
                        });
                    });
                }
            } catch (error) {
                // Silent fail
            }
        }

        zones.forEach((zone) => {
            if (zone.layer && zone.layer.getLatLngs) {
                try {
                    const coords = zone.layer.getLatLngs()[0];
                    if (coords && Array.isArray(coords)) {
                        coords.forEach((coord: any, index: number) => {
                            snapPoints.push({
                                latlng: coord,
                                type: 'vertex',
                                source: 'zone',
                                zoneId: zone.id,
                            });

                            const nextCoord = coords[(index + 1) % coords.length];
                            const midLat = (coord.lat + nextCoord.lat) / 2;
                            const midLng = (coord.lng + nextCoord.lng) / 2;
                            snapPoints.push({
                                latlng: { lat: midLat, lng: midLng },
                                type: 'edge-midpoint',
                                source: 'zone',
                                zoneId: zone.id,
                            });
                        });
                    }
                } catch (error) {
                    // Silent fail
                }
            }
        });

        return snapPoints;
    };

    const getClosestPointOnLine = (point: any, lineStart: any, lineEnd: any) => {
        const A = point.lng - lineStart.lng;
        const B = point.lat - lineStart.lat;
        const C = lineEnd.lng - lineStart.lng;
        const D = lineEnd.lat - lineStart.lat;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        if (lenSq === 0) return lineStart;

        let param = dot / lenSq;

        if (param < 0) param = 0;
        if (param > 1) param = 1;

        return {
            lat: lineStart.lat + param * D,
            lng: lineStart.lng + param * C,
        };
    };

    const snapPipeToOtherPipes = (pipeLayer: any, pipeType: string) => {
        if (!pipeSnapEnabled) return;

        try {
            const coords = pipeLayer.getLatLngs();
            if (!coords || !Array.isArray(coords) || coords.length < 2) return;

            const baseSnapDistance = pipeSnapDistance / 10000;
            const snapDistance = pipeType === 'submain' ? baseSnapDistance * 1.5 : baseSnapDistance;

            let hasSnapped = false;
            const newCoords = [...coords];
            const snappedPoints: string[] = [];

            const targetPipes =
                pipeType === 'submain'
                    ? pipes.filter((p) => p.type === 'main' && p.layer && p.layer.getLatLngs)
                    : pipes.filter(
                          (p) => p.layer && p.layer.getLatLngs && p.id !== pipeLayer._leaflet_id
                      );

            if (targetPipes.length === 0) return;

            // Enhanced snapping for submain pipes
            if (pipeType === 'submain') {
                let bestSnapConnection: any = null;
                let bestSnapDistance = Infinity;

                const originalStart = coords[0];
                const originalEnd = coords[coords.length - 1];

                const mainPipeSnapPoints: any[] = [];

                targetPipes.forEach((targetPipe) => {
                    try {
                        const targetCoords = targetPipe.layer.getLatLngs();
                        if (!targetCoords || !Array.isArray(targetCoords)) return;

                        for (let j = 0; j < targetCoords.length - 1; j++) {
                            const segmentStart = targetCoords[j];
                            const segmentEnd = targetCoords[j + 1];

                            mainPipeSnapPoints.push({
                                point: segmentStart,
                                targetPipe: targetPipe,
                                segmentIndex: j,
                                position: 'vertex',
                            });

                            const numIntermediatePoints = 20;
                            for (let k = 1; k < numIntermediatePoints; k++) {
                                const ratio = k / numIntermediatePoints;
                                const intermediatePoint = {
                                    lat:
                                        segmentStart.lat +
                                        (segmentEnd.lat - segmentStart.lat) * ratio,
                                    lng:
                                        segmentStart.lng +
                                        (segmentEnd.lng - segmentStart.lng) * ratio,
                                };

                                mainPipeSnapPoints.push({
                                    point: intermediatePoint,
                                    targetPipe: targetPipe,
                                    segmentIndex: j,
                                    position: 'intermediate',
                                    ratio: ratio,
                                });
                            }
                        }

                        if (targetCoords.length > 0) {
                            mainPipeSnapPoints.push({
                                point: targetCoords[targetCoords.length - 1],
                                targetPipe: targetPipe,
                                segmentIndex: targetCoords.length - 1,
                                position: 'vertex',
                            });
                        }
                    } catch (error) {
                        // Silent fail
                    }
                });

                // L-junction: Check if either endpoint can connect
                const submainEndpoints = [
                    { point: originalStart, index: 0, type: 'start' },
                    { point: originalEnd, index: coords.length - 1, type: 'end' },
                ];

                submainEndpoints.forEach((endpoint) => {
                    mainPipeSnapPoints.forEach((snapPoint) => {
                        const distance = Math.sqrt(
                            Math.pow(endpoint.point.lat - snapPoint.point.lat, 2) +
                                Math.pow(endpoint.point.lng - snapPoint.point.lng, 2)
                        );

                        if (distance < snapDistance && distance < bestSnapDistance) {
                            bestSnapDistance = distance;
                            bestSnapConnection = {
                                type: 'L-junction',
                                connectionPoint: snapPoint.point,
                                endpointIndex: endpoint.index,
                                endpointType: endpoint.type,
                                targetPipe: snapPoint.targetPipe,
                                actualDistance: distance,
                            };
                        }
                    });
                });

                // T-junction: Check perpendicular connection
                if (!bestSnapConnection || bestSnapDistance > snapDistance * 0.5) {
                    targetPipes.forEach((targetPipe) => {
                        try {
                            const targetCoords = targetPipe.layer.getLatLngs();
                            if (!targetCoords || !Array.isArray(targetCoords)) return;

                            for (let j = 0; j < targetCoords.length - 1; j++) {
                                const segmentStart = targetCoords[j];
                                const segmentEnd = targetCoords[j + 1];

                                const submainMidpoint = {
                                    lat: (originalStart.lat + originalEnd.lat) / 2,
                                    lng: (originalStart.lng + originalEnd.lng) / 2,
                                };

                                const projectionPoint = getClosestPointOnLine(
                                    submainMidpoint,
                                    segmentStart,
                                    segmentEnd
                                );
                                const distance = Math.sqrt(
                                    Math.pow(submainMidpoint.lat - projectionPoint.lat, 2) +
                                        Math.pow(submainMidpoint.lng - projectionPoint.lng, 2)
                                );

                                if (distance < snapDistance && distance < bestSnapDistance) {
                                    const mainDx = segmentEnd.lng - segmentStart.lng;
                                    const mainDy = segmentEnd.lat - segmentStart.lat;
                                    const mainLength = Math.sqrt(mainDx * mainDx + mainDy * mainDy);

                                    if (mainLength > 0) {
                                        const mainUnitX = mainDx / mainLength;
                                        const mainUnitY = mainDy / mainLength;

                                        bestSnapDistance = distance;
                                        bestSnapConnection = {
                                            type: 'T-junction',
                                            connectionPoint: projectionPoint,
                                            targetPipe: targetPipe,
                                            mainUnitX: mainUnitX,
                                            mainUnitY: mainUnitY,
                                            originalLength: Math.sqrt(
                                                Math.pow(originalEnd.lat - originalStart.lat, 2) +
                                                    Math.pow(originalEnd.lng - originalStart.lng, 2)
                                            ),
                                            actualDistance: distance,
                                        };
                                    }
                                }
                            }
                        } catch (error) {
                            // Silent fail
                        }
                    });
                }

                // Apply the best connection
                if (bestSnapConnection) {
                    if (bestSnapConnection.type === 'L-junction') {
                        newCoords[bestSnapConnection.endpointIndex] = L.latLng(
                            bestSnapConnection.connectionPoint.lat,
                            bestSnapConnection.connectionPoint.lng
                        );

                        hasSnapped = true;
                        snappedPoints.push(
                            `ท่อเมนย่อย (${bestSnapConnection.endpointType === 'start' ? 'จุดเริ่มต้น' : 'จุดสิ้นสุด'}) → ${bestSnapConnection.targetPipe.name} (L-junction)`
                        );
                    } else if (bestSnapConnection.type === 'T-junction') {
                        const { connectionPoint, mainUnitX, mainUnitY, originalLength } =
                            bestSnapConnection;

                        const perpUnitX = -mainUnitY;
                        const perpUnitY = mainUnitX;

                        const adjustedLength = Math.max(originalLength * 1.1, 0.001);
                        const halfLength = adjustedLength / 2;

                        const newStart = L.latLng(
                            connectionPoint.lat - perpUnitY * halfLength,
                            connectionPoint.lng - perpUnitX * halfLength
                        );
                        const newEnd = L.latLng(
                            connectionPoint.lat + perpUnitY * halfLength,
                            connectionPoint.lng + perpUnitX * halfLength
                        );
                        const connectionPointLatLng = L.latLng(
                            connectionPoint.lat,
                            connectionPoint.lng
                        );

                        newCoords.splice(0, newCoords.length);
                        newCoords.push(newStart, connectionPointLatLng, newEnd);

                        hasSnapped = true;
                        snappedPoints.push(
                            `ท่อเมนย่อย → ${bestSnapConnection.targetPipe.name} (T-junction)`
                        );
                    }
                }
            }

            // Regular point-to-line snapping
            if (!hasSnapped) {
                for (let i = 0; i < coords.length; i++) {
                    const currentPoint = coords[i];
                    let closestSnapPoint: any = null;
                    let minDistance = Infinity;
                    let closestPipe: any = null;

                    targetPipes.forEach((targetPipe) => {
                        try {
                            const targetCoords = targetPipe.layer.getLatLngs();
                            if (!targetCoords || !Array.isArray(targetCoords)) return;

                            for (let j = 0; j < targetCoords.length - 1; j++) {
                                const segmentStart = targetCoords[j];
                                const segmentEnd = targetCoords[j + 1];

                                const closestPoint = getClosestPointOnLine(
                                    currentPoint,
                                    segmentStart,
                                    segmentEnd
                                );
                                const distance = Math.sqrt(
                                    Math.pow(currentPoint.lat - closestPoint.lat, 2) +
                                        Math.pow(currentPoint.lng - closestPoint.lng, 2)
                                );

                                if (distance < snapDistance && distance < minDistance) {
                                    minDistance = distance;
                                    closestSnapPoint = closestPoint;
                                    closestPipe = targetPipe;
                                }
                            }
                        } catch (error) {
                            // Silent fail
                        }
                    });

                    if (closestSnapPoint && closestPipe) {
                        newCoords[i] = L.latLng(closestSnapPoint.lat, closestSnapPoint.lng);
                        hasSnapped = true;

                        const pointType =
                            i === 0
                                ? 'จุดเริ่มต้น'
                                : i === coords.length - 1
                                  ? 'จุดสิ้นสุด'
                                  : `จุดที่ ${i + 1}`;
                        snappedPoints.push(`${pointType} → ${closestPipe.name}`);
                    }
                }
            }

            // Apply snapped coordinates
            if (hasSnapped) {
                pipeLayer.setLatLngs(newCoords);
            }
        } catch (error) {
            // Silent fail
        }
    };

    // Generate lateral pipes for a specific zone
    const generateLateralPipesForZone = (targetZone: any) => {
        if (isGeneratingPipes) {
            handleError('⚠️ กำลังสร้างท่อย่อยอยู่ กรุณารอสักครู่');
            return;
        }

        if (!targetZone || !targetZone.name) {
            handleError('⚠️ ข้อมูลโซนไม่ถูกต้อง กรุณาลองใหม่');
            return;
        }

        if (currentStep !== 3) {
            handleError('⚠️ กรุณาไปยังขั้นตอนที่ 3 (Pipe System) ก่อน');
            return;
        }

        setIsLoading(true);
        setIsGeneratingPipes(true);

        try {
            const submainPipes = pipes.filter((pipe) => pipe.type === 'submain');

            if (submainPipes.length === 0) {
                setIsGeneratingPipes(false);
                return;
            }

            // Filter submain pipes that pass through this zone
            const zoneSubmainPipes = submainPipes.filter((pipe) => {
                if (!pipe.layer || !pipe.layer.getLatLngs) return false;

                const pipeCoords = pipe.layer.getLatLngs();

                const hasPointInZone = pipeCoords.some((coord: any) => {
                    return isPointInZone(coord, targetZone);
                });

                return hasPointInZone;
            });

            if (zoneSubmainPipes.length === 0) {
                // Check intersections with zone boundaries
                const pipesIntersectingZone = submainPipes.filter((pipe) => {
                    if (!pipe.layer || !pipe.layer.getLatLngs) return false;

                    const pipeCoords = pipe.layer.getLatLngs();
                    if (pipeCoords.length < 2) return false;

                    try {
                        const zoneCoords = targetZone.layer.getLatLngs()[0];
                        for (let i = 0; i < pipeCoords.length - 1; i++) {
                            for (let j = 0; j < zoneCoords.length; j++) {
                                const zoneLine = {
                                    start: zoneCoords[j],
                                    end: zoneCoords[(j + 1) % zoneCoords.length],
                                };

                                const intersection = getLineIntersection(
                                    pipeCoords[i],
                                    pipeCoords[i + 1],
                                    zoneLine.start,
                                    zoneLine.end
                                );

                                if (intersection) {
                                    return true;
                                }
                            }
                        }
                    } catch (error) {
                        // Silent fail
                    }

                    return false;
                });

                if (pipesIntersectingZone.length > 0) {
                    zoneSubmainPipes.push(...pipesIntersectingZone);
                } else {
                    setIsGeneratingPipes(false);
                    return;
                }
            }

            const lateralPipes: any[] = [];

            // Helper: find zone boundary intersection
            const findZoneBoundaryIntersection = (
                start: any,
                end: any,
                zone: any
            ): { point: any; distance: number } | null => {
                try {
                    const zoneCoords = zone.layer.getLatLngs()[0];
                    let closestIntersection: any = null;
                    let minDistance = Infinity;

                    for (let i = 0; i < zoneCoords.length; i++) {
                        const p1 = zoneCoords[i];
                        const p2 = zoneCoords[(i + 1) % zoneCoords.length];

                        const intersection = getLineIntersection(start, end, p1, p2);
                        if (intersection) {
                            const distance = calculateDistance(
                                start.lat,
                                start.lng,
                                intersection.lat,
                                intersection.lng
                            );

                            if (distance > 1 && distance < minDistance) {
                                minDistance = distance;
                                closestIntersection = intersection;
                            }
                        }
                    }

                    return closestIntersection && minDistance >= 1
                        ? { point: closestIntersection, distance: minDistance }
                        : null;
                } catch (error) {
                    return null;
                }
            };

            // Process each submain pipe
            zoneSubmainPipes.forEach((submainPipe, pipeIndex) => {
                try {
                    const submainCoords = submainPipe.layer.getLatLngs();

                    // Calculate pipe length
                    let totalLength = 0;
                    for (let i = 0; i < submainCoords.length - 1; i++) {
                        totalLength += calculateDistance(
                            submainCoords[i].lat,
                            submainCoords[i].lng,
                            submainCoords[i + 1].lat,
                            submainCoords[i + 1].lng
                        );
                    }

                    // Get spacing based on assigned crop
                    const assignedCrop = zoneAssignments[targetZone.id];
                    const optimalSpacing = assignedCrop ? rowSpacing[assignedCrop] || 1.5 : 1.5;
                    const numLaterals = Math.floor(totalLength / optimalSpacing);

                    if (numLaterals === 0) return;

                    // Calculate perpendicular direction
                    const start = submainCoords[0];
                    const end = submainCoords[submainCoords.length - 1];
                    const deltaLat = end.lat - start.lat;
                    const deltaLng = end.lng - start.lng;
                    const length = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);

                    if (length === 0) return;

                    const perpLat = -deltaLng / length;
                    const perpLng = deltaLat / length;

                    // Generate lateral pipes
                    for (let i = 0; i <= numLaterals; i++) {
                        const distance = i * optimalSpacing;

                        // Find point on submain pipe
                        let lateralStart: any;
                        let accumulatedDistance = 0;

                        for (let j = 0; j < submainCoords.length - 1; j++) {
                            const segmentStart = submainCoords[j];
                            const segmentEnd = submainCoords[j + 1];
                            const segmentLength = calculateDistance(
                                segmentStart.lat,
                                segmentStart.lng,
                                segmentEnd.lat,
                                segmentEnd.lng
                            );

                            if (accumulatedDistance + segmentLength >= distance) {
                                const remainingDistance = distance - accumulatedDistance;
                                const ratio = remainingDistance / segmentLength;

                                lateralStart = {
                                    lat:
                                        segmentStart.lat +
                                        (segmentEnd.lat - segmentStart.lat) * ratio,
                                    lng:
                                        segmentStart.lng +
                                        (segmentEnd.lng - segmentStart.lng) * ratio,
                                };
                                break;
                            }

                            accumulatedDistance += segmentLength;
                        }

                        if (!lateralStart) {
                            lateralStart = submainCoords[submainCoords.length - 1];
                        }

                        if (!isPointInZone(lateralStart, targetZone)) continue;

                        // Create lateral pipes on both sides
                        for (const side of [-1, 1]) {
                            const maxLengthDegrees = 0.003;

                            const lateralEnd = {
                                lat: lateralStart.lat + side * perpLat * maxLengthDegrees,
                                lng: lateralStart.lng + side * perpLng * maxLengthDegrees,
                            };

                            const intersection = findZoneBoundaryIntersection(
                                lateralStart,
                                lateralEnd,
                                targetZone
                            );

                            if (intersection && intersection.distance >= 1.5) {
                                const pipeStart = lateralStart;
                                const pipeEnd = intersection.point;

                                // Check for obstacles
                                const startInObstacle = isPointInObstacle(pipeStart);
                                const endInObstacle = isPointInObstacle(pipeEnd);

                                if (!startInObstacle && !endInObstacle) {
                                    const lateralCoords = [
                                        [lateralStart.lat, lateralStart.lng],
                                        [intersection.point.lat, intersection.point.lng],
                                    ];

                                    const lateralLine = L.polyline(lateralCoords, {
                                        color: PIPE_TYPES.lateral.color,
                                        weight: PIPE_TYPES.lateral.weight,
                                        opacity: PIPE_TYPES.lateral.opacity,
                                    });

                                    const lateralPipe = {
                                        id: Date.now() + lateralPipes.length + Math.random(),
                                        layer: lateralLine,
                                        type: 'lateral',
                                        name: `Lateral ${pipeIndex}-${i}-${side > 0 ? 'R' : 'L'}`,
                                        submainId: submainPipe.id,
                                        zoneId: targetZone.id,
                                        length: intersection.distance,
                                        avoidsObstacles: true,
                                    };

                                    lateralPipes.push(lateralPipe);
                                    if (featureGroupRef.current) {
                                        featureGroupRef.current.addLayer(lateralLine);
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    // Silent fail
                }
            });

            setPipes((prev) => [...prev, ...lateralPipes]);
            setIsGeneratingPipes(false);
        } catch (error) {
            handleError('เกิดข้อผิดพลาดในการสร้างท่อย่อย');
        } finally {
            setIsLoading(false);
            setIsGeneratingPipes(false);
        }
    };

    // Generate lateral pipes for all zones
    const generateLateralPipes = () => {
        if (zones.length === 0) {
            handleError('กรุณาสร้างโซนก่อน เพื่อที่จะสร้างท่อย่อยได้');
            return;
        }

        setIsLoading(true);
        try {
            zones.forEach((zone) => {
                generateLateralPipesForZone(zone);
            });
        } catch (error) {
            handleError('เกิดข้อผิดพลาดในการสร้างท่อย่อย');
        } finally {
            setIsLoading(false);
        }
    };

    // Show/hide pipe snap indicators
    const showPipeSnapIndicators = () => {
        if (!pipeSnapEnabled || drawingStage !== 'pipes') return;

        const snapPoints = getPolygonSnapPoints();
        const indicators = snapPoints.map((point) => {
            return L.circleMarker([point.latlng.lat, point.latlng.lng], {
                radius: 4,
                color: point.type === 'vertex' ? '#ef4444' : '#f59e0b',
                fillColor: point.type === 'vertex' ? '#ef4444' : '#f59e0b',
                fillOpacity: 0.8,
                weight: 2,
            });
        });

        setPipeSnapIndicators(indicators);

        indicators.forEach((indicator) => {
            if (featureGroupRef.current) {
                featureGroupRef.current.addLayer(indicator);
            }
        });
    };

    const hidePipeSnapIndicators = () => {
        pipeSnapIndicators.forEach((indicator) => {
            if (featureGroupRef.current) {
                featureGroupRef.current.removeLayer(indicator);
            }
        });
        setPipeSnapIndicators([]);
    };

    // Snap polygon to field edges (vertex only, reliable)
    const snapPolygonToField = (polygonLayer: any) => {
        if (!snapEnabled || !mainField || !mainField.getLatLngs) return false;

        try {
            const polygonCoords = polygonLayer.getLatLngs()[0];
            const fieldCoords = mainField.getLatLngs()[0];

            if (!polygonCoords || !fieldCoords) return false;

            const snapDistance = 0.0005; // ระยะ snap ในหน่วย degrees
            let hasSnapped = false;
            const newCoords: any[] = [];

            // Snap each vertex to the nearest field edge or vertex
            polygonCoords.forEach((vertex: any) => {
                let snappedVertex = vertex;
                let minDistance = Infinity;

                fieldCoords.forEach((edgeStart: any, j: number) => {
                    const edgeEnd = fieldCoords[(j + 1) % fieldCoords.length];
                    // Snap to edge
                    const closestOnEdge = getClosestPointOnLine(vertex, edgeStart, edgeEnd);
                    const edgeDistance = Math.sqrt(
                        Math.pow(vertex.lat - closestOnEdge.lat, 2) +
                            Math.pow(vertex.lng - closestOnEdge.lng, 2)
                    );
                    if (edgeDistance < snapDistance && edgeDistance < minDistance) {
                        minDistance = edgeDistance;
                        snappedVertex = L.latLng(closestOnEdge.lat, closestOnEdge.lng);
                        hasSnapped = true;
                    }
                    // Snap to vertex
                    const vertexDistance = Math.sqrt(
                        Math.pow(vertex.lat - edgeStart.lat, 2) +
                            Math.pow(vertex.lng - edgeStart.lng, 2)
                    );
                    if (vertexDistance < snapDistance && vertexDistance < minDistance) {
                        minDistance = vertexDistance;
                        snappedVertex = L.latLng(edgeStart.lat, edgeStart.lng);
                        hasSnapped = true;
                    }
                });
                newCoords.push(snappedVertex);
            });

            if (hasSnapped) {
                polygonLayer.setLatLngs([newCoords]);
                return true;
            }
        } catch (error) {
            console.warn('Error in polygon snapping:', error);
        }
        return false;
    };

    const clearLateralPipes = () => {
        const lateralPipes = pipes.filter((pipe) => pipe.type === 'lateral');
        lateralPipes.forEach((pipe) => {
            if (pipe.layer && featureGroupRef.current) {
                featureGroupRef.current.removeLayer(pipe.layer);
            }
        });
        setPipes((prev) => prev.filter((pipe) => pipe.type !== 'lateral'));
    };

    // UPDATED IRRIGATION GENERATION FUNCTION - Main enhancement
    const generateIrrigationForZone = (zone: any, irrigationType: string) => {
        if (!zone || !irrigationType) return;

        setIsLoading(true);
        try {
            const irrigationSystem = irrigationTypes
                .flatMap((cat) => cat.systems)
                .find((sys) => sys.value === irrigationType);

            if (!irrigationSystem) return;

            // Clear existing irrigation for this zone
            clearIrrigationForZone(zone.id);

            // Get lateral pipes for this zone
            const zoneLateralPipes = pipes.filter(
                (pipe) => pipe.type === 'lateral' && pipe.zoneId === zone.id
            );

            if (zoneLateralPipes.length === 0) {
                return;
            }

            const newIrrigationPoints: any[] = [];
            const newIrrigationLines: any[] = [];

            // Get current radius and overlap settings for this zone
            // Always preserve user-set radius unless explicitly changing irrigation type
            const currentSettings = irrigationSettings[zone.id];
            const isChangingType = currentSettings && currentSettings.type !== irrigationType;
            
            let radius;
            
            console.log(`🔧 [${zone.name}] Debug irrigation generation:`, {
                currentType: currentSettings?.type,
                newType: irrigationType,
                isChangingType,
                currentRadius: irrigationRadius[zone.id],
                defaultRadius: irrigationSystem.defaultRadius
            });
            
            // Case 1: Changing irrigation type - use new system's default
            if (isChangingType) {
                radius = irrigationSystem.defaultRadius;
                setIrrigationRadius(prev => ({ ...prev, [zone.id]: irrigationSystem.defaultRadius }));
                console.log(`🔄 [${zone.name}] Type changed: setting radius to default ${radius}m`);
            }
            // Case 2: Same irrigation type or no previous settings - use current user setting
            else {
                radius = irrigationRadius[zone.id];
                // If no user setting exists, set to default
                if (radius === undefined || radius === null) {
                    radius = irrigationSystem.defaultRadius;
                    setIrrigationRadius(prev => ({ ...prev, [zone.id]: irrigationSystem.defaultRadius }));
                    console.log(`🆕 [${zone.name}] No radius set: using default ${radius}m`);
                } else {
                    console.log(`✅ [${zone.name}] Using user-set radius: ${radius}m`);
                }
            }
            
            const overlap = sprinklerOverlap[zone.id] || false;

            if (irrigationSystem.isLinear) {
                // UPDATED DRIP TAPE LOGIC - Create overlay lines with calculated info
                // Use the current radius value as spacing for drip holes calculation
                const dripHoleSpacing = radius; // This will use the actual current setting
                
                let totalPipeLength = 0;
                let totalDripHoles = 0;
                let pipeCount = 0;
                
                zoneLateralPipes.forEach((pipe) => {
                    if (pipe.layer && pipe.layer.getLatLngs) {
                        const coords = pipe.layer.getLatLngs();

                        // Calculate pipe length
                        let pipeLength = 0;
                        for (let i = 0; i < coords.length - 1; i++) {
                            pipeLength += mapRef.current?.distance(coords[i], coords[i + 1]) || 0;
                        }

                        if (pipeLength === 0) return;

                        // Calculate number of drip holes for this pipe
                        const holesInThisPipe = Math.floor(pipeLength / dripHoleSpacing);
                        totalPipeLength += pipeLength;
                        totalDripHoles += holesInThisPipe;
                        pipeCount += 1;

                        // Create solid line overlay on lateral pipe
                        const dripLine = L.polyline(coords, {
                            color: irrigationSystem.color,
                            weight: 6, // Slightly thicker to show it's a drip tape
                            opacity: 0.8,
                            dashArray: undefined, // Solid line
                        });

                        // Add popup with detailed info for this specific pipe
                        const pipeInfo = `
                            <div style="text-align: center; padding: 8px; min-width: 200px;">
                                <h4 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">
                                    ${irrigationSystem.name}
                                </h4>
                                <div style="background: #f5f5f5; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                                    <div style="font-size: 12px; color: #666; margin-bottom: 4px;">ท่อเส้นนี้:</div>
                                    <div style="font-size: 13px; color: #333; font-weight: bold;">
                                        ความยาว: ${pipeLength.toFixed(1)} เมตร
                                    </div>
                                    <div style="font-size: 13px; color: #333; font-weight: bold;">
                                        รู: ${holesInThisPipe} รู
                                    </div>
                                    <div style="font-size: 11px; color: #888;">
                                        ระยะห่างรู: ${dripHoleSpacing.toFixed(1)}m
                                    </div>
                                </div>
                                <div style="font-size: 11px; color: #666;">
                                    โซน: ${zone.name}
                                </div>
                            </div>
                        `;

                        dripLine.bindPopup(pipeInfo);

                        const irrigationLine = {
                            id: `irrigation_line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            layer: dripLine,
                            type: irrigationType,
                            zoneId: zone.id,
                            zoneName: zone.name,
                            coordinates: coords,
                            pipeLength: pipeLength,
                            holesCount: holesInThisPipe,
                            holeSpacing: dripHoleSpacing,
                        };

                        newIrrigationLines.push(irrigationLine);
                        if (featureGroupRef.current) {
                            featureGroupRef.current.addLayer(dripLine);
                        }
                    }
                });

                // Create summary irrigation point for statistics (no visual marker)
                if (pipeCount > 0) {
                    const averageHolesPerPipe = Math.round(totalDripHoles / pipeCount);
                    const averagePipeLength = totalPipeLength / pipeCount;
                    
                    const irrigationSummary = {
                        id: `irrigation_summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: irrigationType,
                        zoneId: zone.id,
                        zoneName: zone.name,
                        // Summary statistics
                        totalPipes: pipeCount,
                        totalLength: totalPipeLength,
                        totalHoles: totalDripHoles,
                        averageHolesPerPipe: averageHolesPerPipe,
                        averagePipeLength: averagePipeLength,
                        holeSpacing: dripHoleSpacing,
                        // Store as position for compatibility but no marker
                        position: null,
                        radius: dripHoleSpacing,
                        spacing: dripHoleSpacing,
                        // Visual info
                        summary: `${pipeCount} เส้น, ${totalDripHoles} รู, ระยะ ${dripHoleSpacing.toFixed(1)}m`,
                    };

                    newIrrigationPoints.push(irrigationSummary);
                    
                    console.log(`💧 [${zone.name}] Drip tape summary:`, {
                        pipes: pipeCount,
                        totalHoles: totalDripHoles,
                        avgHolesPerPipe: averageHolesPerPipe,
                        holeSpacing: dripHoleSpacing,
                        totalLength: totalPipeLength.toFixed(1)
                    });
                }
            } else {
                // Point-based systems with grid layout (unchanged logic)
                const spacingHorizontal = overlap ? radius * 1.4 : radius * 2;

                // Sort laterals by their average Y position to ensure consistent pipeIndex
                const getAverageY = (coords: any[]) => {
                    if (!coords || coords.length === 0) return 0;
                    const sumY = coords.reduce((sum, coord) => sum + coord.lat, 0);
                    return sumY / coords.length;
                };

                const sortedLateralPipes = [...zoneLateralPipes].sort((pipeA, pipeB) => {
                    const avgYA = getAverageY(pipeA.layer?.getLatLngs());
                    const avgYB = getAverageY(pipeB.layer?.getLatLngs());
                    return avgYB - avgYA; // Sort from top to bottom (higher lat to lower lat)
                });

                // Point-based systems with grid layout
                sortedLateralPipes.forEach((pipe, pipeIndex) => {
                    if (pipe.layer && pipe.layer.getLatLngs) {
                        const coords = pipe.layer.getLatLngs();

                        let totalLength = 0;
                        for (let i = 0; i < coords.length - 1; i++) {
                            const distance = mapRef.current?.distance(coords[i], coords[i + 1]) || 0;
                            totalLength += distance;
                        }

                        if (totalLength === 0) return;

                        // The first sprinkler is placed at a distance of one radius from the submain.
                        const startOffset = radius;

                        const numPoints = Math.floor((totalLength - startOffset) / spacingHorizontal);
                        if (numPoints < 0) return; // Not enough length for even one sprinkler

                        for (let i = 0; i <= numPoints; i++) {
                            const distance = startOffset + i * spacingHorizontal;

                            if (distance > totalLength) continue;

                            let accumulatedDistance = 0;
                            let pointPosition: any = null;

                            for (let j = 0; j < coords.length - 1; j++) {
                                const segmentStart = coords[j];
                                const segmentEnd = coords[j + 1];
                                const segmentLength = mapRef.current?.distance(segmentStart, segmentEnd) || 0;

                                if (accumulatedDistance + segmentLength >= distance) {
                                    const remainingDistance = distance - accumulatedDistance;
                                    const ratio = segmentLength > 0 ? remainingDistance / segmentLength : 0;

                                    pointPosition = {
                                        lat: segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * ratio,
                                        lng: segmentStart.lng + (segmentEnd.lng - segmentStart.lng) * ratio,
                                    };
                                    break;
                                }

                                accumulatedDistance += segmentLength;
                            }

                            if (!pointPosition) {
                                pointPosition = coords[coords.length - 1];
                            }

                            if (!isPointInZone(pointPosition, zone) || isPointInObstacle(pointPosition))
                                continue;

                            const dotSize = irrigationType === 'sprinkler' ? 16 : irrigationType === 'micro_spray' ? 14 : 12;
                            const marker = L.marker([pointPosition.lat, pointPosition.lng], {
                                icon: L.divIcon({
                                    className: 'irrigation-marker-icon',
                                    html: `
                                    <div style="
                                        position: relative;
                                        width: ${dotSize}px;
                                        height: ${dotSize}px;
                                        border-radius: 50%;
                                        background: ${irrigationSystem.color};
                                        border: 2px solid white;
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                                        cursor: pointer;
                                        transition: all 0.2s ease;
                                    " 
                                    onmouseover="this.style.transform='scale(1.3)'" 
                                    onmouseout="this.style.transform='scale(1)'">
                                    </div>
                                `,
                                    iconSize: [dotSize, dotSize],
                                    iconAnchor: [dotSize / 2, dotSize / 2],
                                }),
                            });

                            const circleOpacity = irrigationType === 'sprinkler'
                                    ? overlap ? 0.2 : 0.12
                                    : irrigationType === 'micro_spray' ? 0.15 : 0.1;
                            const circleWeight = irrigationType === 'sprinkler' ? 2 : 1;

                            const coverageCircle = L.circle([pointPosition.lat, pointPosition.lng], {
                                color: irrigationSystem.color,
                                fillColor: irrigationSystem.color,
                                fillOpacity: circleOpacity,
                                weight: circleWeight,
                                opacity: 0.6,
                                radius: radius,
                            });

                            const tooltipContent = `
                            <div style="text-align: center; padding: 4px;">
                                <div style="font-size: 14px; font-weight: bold; margin-bottom: 2px;">
                                    ${irrigationSystem.name}
                                </div>
                                <div style="font-size: 12px; color: #666;">
                                    รัศมี: ${radius}m | โซน: ${zone.name}
                                </div>
                                <div style="font-size: 10px; color: #888;">
                                    ระยะห่าง: ${spacingHorizontal.toFixed(1)}m
                                </div>
                                ${irrigationSystem.supportsOverlap ? `<div style="font-size: 10px; color: #999;">รูปแบบ: ${overlap ? 'ทับซ้อน (Grid)' : 'มาตรฐาน (Grid)'}</div>` : ''}
                            </div>
                        `;

                            marker.bindTooltip(tooltipContent, {
                                direction: 'top',
                                offset: [0, -10],
                                className: 'irrigation-tooltip',
                            });

                            const irrigationPoint = {
                                id: `irrigation_point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                marker: marker,
                                coverageCircle: coverageCircle,
                                type: irrigationType,
                                zoneId: zone.id,
                                zoneName: zone.name,
                                position: pointPosition,
                                radius: radius,
                                overlap: overlap,
                            };

                            newIrrigationPoints.push(irrigationPoint);

                            if (featureGroupRef.current) {
                                featureGroupRef.current.addLayer(marker);
                                featureGroupRef.current.addLayer(coverageCircle);
                            }
                        }
                    }
                });
            }

            // Update state with the actual radius value used
            setIrrigationPoints((prev) => [...prev, ...newIrrigationPoints]);
            setIrrigationLines((prev) => [...prev, ...newIrrigationLines]);
            setIrrigationAssignments((prev) => ({ ...prev, [zone.id]: irrigationType }));
            setIrrigationSettings((prev) => ({
                ...prev,
                [zone.id]: {
                    type: irrigationType,
                    radius: radius, // Use the actual radius value that was used for generation
                    overlap: overlap,
                    pointsCount: newIrrigationPoints.length,
                    linesCount: newIrrigationLines.length,
                },
            }));

            // Generate planting points (unchanged)
            const assignedCropValue = zoneAssignments[zone.id];
            const assignedCrop = assignedCropValue ? getCropByValue(assignedCropValue) : null;

            if (assignedCrop) {
                const currentPlantSpacing = plantSpacing[assignedCrop.value] || 1.0;
                const newPlantingPointsForZone: any[] = [];
                const plantingPointsByRow: { row: number; count: number }[] = [];

                const sortedLaterals = [...zoneLateralPipes].sort((a, b) => {
                    const aCenter = a.layer.getBounds().getCenter();
                    const bCenter = b.layer.getBounds().getCenter();
                    return bCenter.lat - aCenter.lat; // Sort top to bottom
                });

                sortedLaterals.forEach((pipe, index) => {
                    let pipeLength = 0;
                    const coords = pipe.layer.getLatLngs();
                    for (let i = 0; i < coords.length - 1; i++) {
                        pipeLength += mapRef.current?.distance(coords[i], coords[i + 1]) || 0;
                    }

                    if (pipeLength === 0) {
                        plantingPointsByRow.push({ row: index + 1, count: 0 });
                        return;
                    }

                    const numPoints = Math.floor(pipeLength / currentPlantSpacing);
                    plantingPointsByRow.push({ row: index + 1, count: numPoints });

                    for (let i = 1; i <= numPoints; i++) {
                        const distance = i * currentPlantSpacing;

                        let accumulatedDistance = 0;
                        let pointPosition: any = null;

                        for (let j = 0; j < coords.length - 1; j++) {
                            const segmentStart = coords[j];
                            const segmentEnd = coords[j + 1];
                            const segmentLength = mapRef.current?.distance(segmentStart, segmentEnd) || 0;

                            if (accumulatedDistance + segmentLength >= distance) {
                                const remainingDistance = distance - accumulatedDistance;
                                const ratio = segmentLength > 0 ? remainingDistance / segmentLength : 0;
                                pointPosition = {
                                    lat: segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * ratio,
                                    lng: segmentStart.lng + (segmentEnd.lng - segmentStart.lng) * ratio,
                                };
                                break;
                            }
                            accumulatedDistance += segmentLength;
                        }

                        if (pointPosition && !isPointInObstacle(pointPosition)) {
                            newPlantingPointsForZone.push({
                                id: `plant_${zone.id}_${pipe.id}_${i}`,
                                marker: null, // ไม่สร้าง marker
                                zoneId: zone.id,
                                position: pointPosition, // เก็บตำแหน่งไว้
                            });
                        }
                    }
                });

                setPlantingPoints((prev) => [
                    ...prev.filter((p) => p.zoneId !== zone.id),
                    ...newPlantingPointsForZone,
                ]);

                const totalPointsInZone = plantingPointsByRow.reduce((sum, r) => sum + r.count, 0);

                let estimatedYield = 0;
                let estimatedPrice = 0;
                if (assignedCrop && assignedCrop.yield && assignedCrop.price) {
                    const rowSpacingValue = rowSpacing[assignedCrop.value] || assignedCrop.spacing;
                    const plantSpacingValue = plantSpacing[assignedCrop.value] || assignedCrop.defaultPlantSpacing;
                    const plantsPerRai = 1600 / (rowSpacingValue * plantSpacingValue);
                    const raiEquivalent = totalPointsInZone / plantsPerRai;

                    estimatedYield = raiEquivalent * assignedCrop.yield;
                    estimatedPrice = estimatedYield * assignedCrop.price;
                }

                setZoneSummaries((prev: any) => ({
                    ...prev,
                    [zone.id]: {
                        id: zone.id,
                        cropName: assignedCrop.name,
                        area: 0,
                        totalPlantingPoints: totalPointsInZone,
                        plantCount: totalPointsInZone,
                        estimatedYield: estimatedYield,
                        estimatedPrice: estimatedPrice,
                        plantingPointsByRow: plantingPointsByRow,
                    },
                }));
            }
        } catch (error) {
            handleError('เกิดข้อผิดพลาดในการสร้างระบบการให้น้ำ');
        } finally {
            setIsLoading(false);
        }
    };

    // Clear irrigation for a specific zone
    const clearIrrigationForZone = (zoneId: string) => {
        const zoneIrrigationPoints = irrigationPoints.filter((point) => point.zoneId === zoneId);
        zoneIrrigationPoints.forEach((point) => {
            if (point.marker && featureGroupRef.current) {
                featureGroupRef.current.removeLayer(point.marker);
            }
            if (point.coverageCircle && featureGroupRef.current) {
                featureGroupRef.current.removeLayer(point.coverageCircle);
            }
        });

        const zoneIrrigationLines = irrigationLines.filter((line) => line.zoneId === zoneId);
        zoneIrrigationLines.forEach((line) => {
            if (line.layer && featureGroupRef.current) {
                featureGroupRef.current.removeLayer(line.layer);
            }
        });

        setIrrigationPoints((prev) => prev.filter((point) => point.zoneId !== zoneId));
        setIrrigationLines((prev) => prev.filter((line) => line.zoneId !== zoneId));

        // Clear planting points for the zone (no markers to remove since we don't display them)
        setPlantingPoints((prev) => prev.filter((p) => p.zoneId !== zoneId));

        setIrrigationAssignments((prev) => {
            const newAssignments = { ...prev };
            delete newAssignments[zoneId];
            return newAssignments;
        });

        setIrrigationSettings((prev) => {
            const newSettings = { ...prev };
            delete newSettings[zoneId];
            return newSettings;
        });

        setZoneSummaries((prev) => {
            const newSummaries = { ...prev };
            delete newSummaries[zoneId];
            return newSummaries;
        });
    };

    const addNewZone = () => {
        const availableColors = ZONE_COLORS.filter((color) => !usedColors.includes(color));

        if (availableColors.length > 0) {
            const nextColor = availableColors[0];
            setCurrentZoneColor(nextColor);
            setCanDrawZone(true);
        } else {
            setCurrentZoneColor(ZONE_COLORS[0]);
            setCanDrawZone(true);
            setUsedColors([]);
        }
    };

    const getPolygonCenter = (layer: any) => {
        return layer.getBounds ? layer.getBounds().getCenter() : null;
    };

    // Calculate center from field coordinates
    const getFieldCenter = (field: any) => {
        if (field && field.getLatLngs) {
            try {
                const coords = field.getLatLngs()[0];
                if (coords && coords.length > 0) {
                    const centerLat = coords.reduce((sum: number, coord: any) => sum + coord.lat, 0) / coords.length;
                    const centerLng = coords.reduce((sum: number, coord: any) => sum + coord.lng, 0) / coords.length;
                    return [centerLat, centerLng];
                }
            } catch (error) {
                console.error('Error getting field center:', error);
            }
        }
        return mapCenter;
    };

    const assignPlantToZone = (zoneId: string, plantValue: string) => {
        if (!zoneId || !plantValue) {
            return;
        }

        const targetZone = zones.find((z) => z.id.toString() === zoneId);
        const selectedPlant = getCropByValue(plantValue);

        if (!targetZone) {
            return;
        }

        if (!selectedPlant) {
            return;
        }

        try {
            setZoneAssignments((prev) => ({ ...prev, [zoneId]: plantValue }));
            setShowPlantSelector(false);
            setSelectedZone(null);

            const zone = zones.find((z) => z.id.toString() === zoneId);
            if (zone && zone.layer && mapRef.current) {
                const center = getPolygonCenter(zone.layer);
                if (center) {
                    const plant = getCropByValue(plantValue);
                    if (plant) {
                        if (zone.plantMarker) {
                            try {
                                mapRef.current.removeLayer(zone.plantMarker);
                            } catch (error) {
                                // Silent fail
                            }
                        }

                        const marker = L.marker([center.lat, center.lng], {
                            icon: L.divIcon({
                                className: 'plant-marker-icon',
                                html: `<div style="
                                    background: white;
                                    border: 2px solid ${zone.color};
                                    border-radius: 50%;
                                    width: 40px;
                                    height: 40px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 20px;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                    cursor: pointer;
                                ">${plant.icon}</div>`,
                                iconSize: [40, 40],
                                iconAnchor: [20, 20],
                            }),
                        });

                        const tooltipContent = `
                            <div style="text-align: center;">
                                <div style="font-size: 16px; margin-bottom: 4px;">${plant.icon}</div>
                                <div style="font-weight: bold; margin-bottom: 2px; color: #ffffff;">${plant.name}</div>
                                <div style="font-size: 10px; opacity: 0.8; margin-bottom: 4px; line-height: 1.2;">${plant.description}</div>
                                <div style="font-size: 9px; opacity: 0.6; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 4px; margin-top: 4px;">
                                    <div style="color: ${zone.color};">● ${zone.name}</div>
                                </div>
                            </div>
                        `;

                        marker.bindTooltip(tooltipContent, {
                            permanent: false,
                            direction: 'top',
                            offset: [0, -25],
                            className: 'plant-tooltip',
                            opacity: 0.9,
                        });

                        marker.addTo(mapRef.current);
                        zone.plantMarker = marker;
                        setZones((prev) =>
                            prev.map((z) => (z.id === zone.id ? { ...z, plantMarker: marker } : z))
                        );
                    }
                }
            }
        } catch (error) {
            // Silent fail
        }
    };

    const removePlantFromZone = (zoneId: string) => {
        setZoneAssignments((prev) => {
            const newAssignments = { ...prev };
            delete newAssignments[zoneId];
            return newAssignments;
        });

        const zone = zones.find((z) => z.id.toString() === zoneId);
        if (zone && zone.plantMarker && mapRef.current) {
            mapRef.current.removeLayer(zone.plantMarker);
        }
        setZones((prev) => prev.map((z) => (z.id === zone.id ? { ...z, plantMarker: null } : z)));
    };

    const deleteZone = (zoneId: string) => {
        const zone = zones.find((z) => z.id.toString() === zoneId);
        if (!zone) return;

        const assignedPlant = zoneAssignments[zoneId];
        const plantInfo = assignedPlant ? getCropByValue(assignedPlant) : null;

        const confirmMessage = plantInfo
            ? `Are you sure you want to delete ${zone.name} with ${plantInfo.name}? This action cannot be undone.`
            : `Are you sure you want to delete ${zone.name}? This action cannot be undone.`;

        if (!confirm(confirmMessage)) {
            return;
        }

        if (zone.plantMarker && mapRef.current) {
            mapRef.current.removeLayer(zone.plantMarker);
        }

        if (zone.layer && featureGroupRef.current) {
            featureGroupRef.current.removeLayer(zone.layer);
        }

        setZoneAssignments((prev) => {
            const newAssignments = { ...prev };
            delete newAssignments[zoneId];
            return newAssignments;
        });

        setUsedColors((prev) => prev.filter((color) => color !== zone.color));

        if (zone.color === currentZoneColor) {
            setCanDrawZone(true);
        }

        setZones((prev) => prev.filter((z) => z.id.toString() !== zoneId));
    };

    // Clear search dropdown
    const clearSearch = () => {
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
        }
        setSearchQuery('');
        setSearchResults([]);
        setIsLocationSelected(false);
        setShowDropdown(false);
    };

    // Crop spacing management
    const handleRowSpacingConfirm = (cropValue: string) => {
        const tempValue = tempRowSpacing[cropValue];
        const newSpacing = parseFloat(tempValue);

        if (!isNaN(newSpacing) && newSpacing > 0 && newSpacing <= 10) {
            setRowSpacing((prev) => ({ ...prev, [cropValue]: newSpacing }));
            setEditingRowSpacingForCrop(null);
        } else {
            const currentSpacing = rowSpacing[cropValue] || 1.5;
            setTempRowSpacing((prev) => ({ ...prev, [cropValue]: currentSpacing.toString() }));
            setEditingRowSpacingForCrop(null);
        }
    };

    const handleRowSpacingCancel = (cropValue: string) => {
        const currentSpacing = rowSpacing[cropValue] || 1.5;
        setTempRowSpacing((prev) => ({ ...prev, [cropValue]: currentSpacing.toString() }));
        setEditingRowSpacingForCrop(null);
    };

    const handlePlantSpacingConfirm = (cropValue: string) => {
        const tempValue = tempPlantSpacing[cropValue];
        const newSpacing = parseFloat(tempValue);

        if (!isNaN(newSpacing) && newSpacing > 0 && newSpacing <= 10) {
            setPlantSpacing((prev) => ({ ...prev, [cropValue]: newSpacing }));
            setEditingPlantSpacingForCrop(null);
        } else {
            const currentSpacing = plantSpacing[cropValue] || 1.0;
            setTempPlantSpacing((prev) => ({ ...prev, [cropValue]: currentSpacing.toString() }));
            setEditingPlantSpacingForCrop(null);
        }
    };

    const handlePlantSpacingCancel = (cropValue: string) => {
        const currentSpacing = plantSpacing[cropValue] || 1.0;
        setTempPlantSpacing((prev) => ({ ...prev, [cropValue]: currentSpacing.toString() }));
        setEditingPlantSpacingForCrop(null);
    };

    // Error handling functions
    const handleError = (errorMessage: string) => {
        setError(errorMessage);
        setTimeout(() => setError(null), 5000); // Auto clear after 5 seconds
    };

    const clearError = () => {
        setError(null);
    };

    // Get current location
    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setMapCenter([latitude, longitude]);
                    setMapZoom(15);
                },
                () => {
                    // Silent fail
                }
            );
        }
    };

    // ENHANCED CAPTURE FUNCTION WITH COMPLETE DATA
    const handleCaptureMapAndSummary = async () => {
        // คำนวณ optimal center และ zoom จาก field boundary
        let optimalCenter = mapCenter;
        let optimalZoom = mapZoom;

        if (mainField && mainField.getLatLngs) {
            try {
                const coords = mainField.getLatLngs()[0];
                if (coords && coords.length > 0) {
                    // แปลง [lat, lng] → [lng, lat] สำหรับ turf
                    const turfCoords = coords.map((coord: any) => [coord.lng, coord.lat]);
                    const closedCoords = [...turfCoords, turfCoords[0]];
                    const polygon = turf.polygon([closedCoords]);
                    const centroid = turf.centroid(polygon);
                    const [centerLng, centerLat] = centroid.geometry.coordinates;
                    
                    optimalCenter = [centerLat, centerLng];
                    
                    // คำนวณ zoom ตามขนาดพื้นที่
                    if (fieldAreaSize > 10000) {
                        optimalZoom = 16;
                    } else if (fieldAreaSize > 5000) {
                        optimalZoom = 17;
                    } else {
                        optimalZoom = 18;
                    }
                }
            } catch (error) {
                console.error('Error calculating optimal center:', error);
            }
        }

        // สร้าง summaryData ครบถ้วน
        const summaryData = {
            // Field information
            mainField: mainField
                ? {
                      id: mainField._leaflet_id || Date.now(),
                      name: 'Main Field',
                      coordinates: mainField.getLatLngs ? mainField.getLatLngs()[0].map((coord: any) => [coord.lat, coord.lng]) : [],
                      area: fieldAreaSize,
                  }
                : null,
            fieldAreaSize,
            selectedCrops: [...selectedCrops],

            // Zone information
            zones: zones.map((zone) => ({
                id: zone.id,
                name: zone.name,
                color: zone.color,
                coordinates: zone.layer && zone.layer.getLatLngs ? zone.layer.getLatLngs()[0].map((coord: any) => [coord.lat, coord.lng]) : [],
                area: 0, // Can be calculated if needed
            })),
            zoneAssignments: { ...zoneAssignments },
            zoneSummaries: { ...zoneSummaries },

            // Pipe information
            pipes: pipes.map((pipe) => ({
                id: pipe.id,
                type: pipe.type,
                name: pipe.name,
                coordinates: pipe.layer && pipe.layer.getLatLngs ? pipe.layer.getLatLngs().map((coord: any) => [coord.lat, coord.lng]) : [],
                length: 0, // Can be calculated if needed
            })),

            // Equipment information
            equipmentIcons: equipmentIcons.map((equipment) => ({
                id: equipment.id,
                type: equipment.type,
                name: equipment.name,
                lat: equipment.lat,
                lng: equipment.lng,
                config: equipment.config,
            })),

            // Irrigation information
            irrigationPoints: irrigationPoints.map((point) => ({
                id: point.id,
                type: point.type,
                zoneId: point.zoneId,
                zoneName: point.zoneName,
                position: point.position ? [point.position.lat, point.position.lng] : null,
                radius: point.radius,
                overlap: point.overlap,
                spacing: point.spacing, // For drip tape
            })),
            irrigationLines: irrigationLines.map((line) => ({
                id: line.id,
                type: line.type,
                zoneId: line.zoneId,
                zoneName: line.zoneName,
                coordinates: line.layer && line.layer.getLatLngs ? line.layer.getLatLngs().map((coord: any) => [coord.lat, coord.lng]) : [],
            })),
            irrigationAssignments: { ...irrigationAssignments },
            irrigationSettings: { ...irrigationSettings },

            // Spacing information
            rowSpacing: { ...rowSpacing },
            plantSpacing: { ...plantSpacing },

            // Map settings
            mapCenter: optimalCenter,
            mapZoom: optimalZoom,
            mapType,

            // Planting points (for calculations)
            plantingPoints: plantingPoints.map((point) => ({
                id: point.id,
                zoneId: point.zoneId,
                position: point.position ? [point.position.lat, point.position.lng] : null,
            })),

            // Additional data
            obstacles: obstacles.map((obstacle) => ({
                id: obstacle.id,
                type: obstacle.type,
                geometry: obstacle.geometry,
            })),

            // Timestamp
            timestamp: new Date().toISOString(),
        };

        try {
            localStorage.setItem('fieldMapData', JSON.stringify(summaryData));
            
            // Navigate to summary page
            window.location.href = '/field-crop-summary';
        } catch (error) {
            console.error('Error saving data:', error);
            handleError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    };

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-gray-900 text-white">
                <Head title="Field Map - Irrigation Planning" />

                {/* Error Message Display */}
                {error && (
                    <div className="fixed right-4 top-4 z-[9999] max-w-md">
                        <ErrorMessage
                            title="Error"
                            message={error}
                            type="error"
                            onDismiss={clearError}
                        />
                    </div>
                )}

                {/* Loading Spinner */}
                {isLoading && (
                    <LoadingSpinner size="lg" color="blue" text="Processing..." fullScreen={true} />
                )}

                {/* Top Header Section */}
                <div className="border-b border-gray-700 bg-gray-800">
                    <div className="container mx-auto px-4 py-3">
                        <div className="mx-auto max-w-7xl">
                            {/* Back Navigation */}
                            <Link
                                href="/field-crop"
                                className="mb-4 inline-flex items-center text-blue-400 hover:text-blue-300"
                            >
                                <svg
                                    className="mr-2 h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                    />
                                </svg>
                                Back to Crop Selection
                            </Link>

                            {/* Main Title */}
                            <h1 className="mb-2 text-3xl font-bold">🗺️ Field Map Planning</h1>
                            <p className="mb-6 text-gray-400">
                                View and plan irrigation systems for your selected crops
                            </p>

                            {/* Step Wizard Navigation */}
                            <div className="rounded-lg bg-gray-700 p-4">
                                <h3 className="mb-3 text-lg font-semibold">🎨 Planning Wizard</h3>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => goToStep(1)}
                                        className={`flex cursor-pointer items-center rounded-lg border-2 px-3 py-2 transition-all ${
                                            currentStep === 1
                                                ? 'border-green-500 bg-green-500/20 text-green-300'
                                                : stepCompleted[1]
                                                  ? 'border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                                  : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
                                        }`}
                                    >
                                        <span className="mr-2 text-lg">
                                            {stepCompleted[1] ? '✅' : '1️⃣'}
                                        </span>
                                        <div className="text-left">
                                            <div className="text-sm font-medium">Field & Crops</div>
                                            <div className="text-xs opacity-75">
                                                Draw field + set spacing
                                            </div>
                                        </div>
                                    </button>

                                    <div className="h-0.5 flex-1 bg-gray-600"></div>

                                    <button
                                        onClick={() => goToStep(2)}
                                        className={`flex cursor-pointer items-center rounded-lg border-2 px-3 py-2 transition-all ${
                                            currentStep === 2
                                                ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                                                : stepCompleted[2]
                                                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                                                  : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
                                        }`}
                                    >
                                        <span className="mr-2 text-lg">
                                            {stepCompleted[2] ? '✅' : '2️⃣'}
                                        </span>
                                        <div className="text-left">
                                            <div className="text-sm font-medium">
                                                Zones & Obstacles
                                            </div>
                                            <div className="text-xs opacity-75">
                                                Zones + assign crops
                                            </div>
                                        </div>
                                    </button>

                                    <div className="h-0.5 flex-1 bg-gray-600"></div>

                                    <button
                                        onClick={() => goToStep(3)}
                                        className={`flex cursor-pointer items-center rounded-lg border-2 px-3 py-2 transition-all ${
                                            currentStep === 3
                                                ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                                                : stepCompleted[3]
                                                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                                                  : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
                                        }`}
                                    >
                                        <span className="mr-2 text-lg">
                                            {stepCompleted[3] ? '✅' : '3️⃣'}
                                        </span>
                                        <div className="text-left">
                                            <div className="text-sm font-medium">Pipe System</div>
                                            <div className="text-xs opacity-75">
                                                Main + sub + laterals
                                            </div>
                                        </div>
                                    </button>

                                    <div className="h-0.5 flex-1 bg-gray-600"></div>

                                    <button
                                        onClick={() => goToStep(4)}
                                        className={`flex cursor-pointer items-center rounded-lg border-2 px-3 py-2 transition-all ${
                                            currentStep === 4
                                                ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                                                : stepCompleted[4]
                                                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                                                  : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
                                        }`}
                                    >
                                        <span className="mr-2 text-lg">
                                            {stepCompleted[4] ? '✅' : '4️⃣'}
                                        </span>
                                        <div className="text-left">
                                            <div className="text-sm font-medium">
                                                Irrigation System
                                            </div>
                                            <div className="text-xs opacity-75">
                                                Sprinklers + drip + micro
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="w-full px-4 py-4">
                    <div className="w-full">
                        <div className="grid h-[calc(100vh-100px)] grid-cols-12 gap-6">
                            {/* Left Tools Panel */}
                            <div className="col-span-4 overflow-hidden rounded-lg bg-gray-800">
                                <div className="flex h-full flex-col">
                                    {/* Tools Header */}
                                    <div className="border-b border-gray-600 bg-gray-700 p-4">
                                        <h3 className="text-lg font-semibold text-white">
                                            🛠️ Tools & Settings
                                        </h3>
                                    </div>

                                    {/* Scrollable Tools Content */}
                                    <div className="flex-1 space-y-4 overflow-y-auto p-4">
                                        {/* Smart Controls - Hidden in Step 4 */}
                                        {currentStep !== 4 && (
                                            <FieldMapSmartControls
                                                snapEnabled={snapEnabled}
                                                setSnapEnabled={setSnapEnabled}
                                                gridEnabled={gridEnabled}
                                                setGridEnabled={setGridEnabled}
                                                pipeSnapEnabled={pipeSnapEnabled}
                                                setPipeSnapEnabled={setPipeSnapEnabled}
                                                drawingStage={drawingStage}
                                            />
                                        )}

                                        {/* Tools Panel with all 4 steps */}
                                        <div className="border-t border-gray-600 pt-4">
                                            <FieldMapToolsPanel
                                                currentStep={currentStep}
                                                setCurrentStep={goToStep}
                                                validateStep={validateStep}
                                                nextStep={nextStep}
                                                previousStep={previousStep}
                                                resetAll={resetAll}
                                                mainField={mainField}
                                                fieldAreaSize={fieldAreaSize}
                                                selectedCrops={selectedCrops}
                                                zones={zones}
                                                pipes={pipes}
                                                obstacles={obstacles}
                                                snapEnabled={snapEnabled}
                                                setSnapEnabled={setSnapEnabled}
                                                gridEnabled={gridEnabled}
                                                setGridEnabled={setGridEnabled}
                                                pipeSnapEnabled={pipeSnapEnabled}
                                                setPipeSnapEnabled={setPipeSnapEnabled}
                                                mapType={mapType}
                                                setMapType={setMapType}
                                                drawingStage={drawingStage}
                                                setDrawingStage={setDrawingStage}
                                                drawingMode={drawingMode}
                                                setDrawingMode={setDrawingMode}
                                                currentZoneColor={currentZoneColor}
                                                setCurrentZoneColor={setCurrentZoneColor}
                                                currentObstacleType={currentObstacleType}
                                                setCurrentObstacleType={setCurrentObstacleType}
                                                currentPipeType={currentPipeType}
                                                setCurrentPipeType={setCurrentPipeType}
                                                isPlacingEquipment={isPlacingEquipment}
                                                selectedEquipmentType={selectedEquipmentType}
                                                startPlacingEquipment={startPlacingEquipment}
                                                cancelPlacingEquipment={cancelPlacingEquipment}
                                                clearAllEquipment={clearAllEquipment}
                                                undoEquipment={undoEquipment}
                                                redoEquipment={redoEquipment}
                                                equipmentIcons={equipmentIcons}
                                                equipmentHistory={equipmentHistory}
                                                equipmentHistoryIndex={equipmentHistoryIndex}
                                                usedColors={usedColors}
                                                addNewZone={addNewZone}
                                                zoneAssignments={zoneAssignments}
                                                assignPlantToZone={assignPlantToZone}
                                                removePlantFromZone={removePlantFromZone}
                                                deleteZone={deleteZone}
                                                generateLateralPipes={generateLateralPipes}
                                                clearLateralPipes={clearLateralPipes}
                                                isGeneratingPipes={isGeneratingPipes}
                                                generateLateralPipesForZone={
                                                    generateLateralPipesForZone
                                                }
                                                irrigationAssignments={irrigationAssignments}
                                                setIrrigationAssignments={setIrrigationAssignments}
                                                irrigationPoints={irrigationPoints}
                                                irrigationLines={irrigationLines}
                                                irrigationRadius={irrigationRadius}
                                                setIrrigationRadius={setIrrigationRadius}
                                                sprinklerOverlap={sprinklerOverlap}
                                                setSprinklerOverlap={setSprinklerOverlap}
                                                generateIrrigationForZone={
                                                    generateIrrigationForZone
                                                }
                                                clearIrrigationForZone={clearIrrigationForZone}
                                                zoneSummaries={zoneSummaries}
                                                plantingPoints={plantingPoints}
                                                selectedCropObjects={selectedCropObjects}
                                                rowSpacing={rowSpacing}
                                                tempRowSpacing={tempRowSpacing}
                                                setTempRowSpacing={setTempRowSpacing}
                                                editingRowSpacingForCrop={editingRowSpacingForCrop}
                                                setEditingRowSpacingForCrop={
                                                    setEditingRowSpacingForCrop
                                                }
                                                handleRowSpacingConfirm={handleRowSpacingConfirm}
                                                handleRowSpacingCancel={handleRowSpacingCancel}
                                                plantSpacing={plantSpacing}
                                                tempPlantSpacing={tempPlantSpacing}
                                                setTempPlantSpacing={setTempPlantSpacing}
                                                editingPlantSpacingForCrop={
                                                    editingPlantSpacingForCrop
                                                }
                                                setEditingPlantSpacingForCrop={
                                                    setEditingPlantSpacingForCrop
                                                }
                                                handlePlantSpacingConfirm={
                                                    handlePlantSpacingConfirm
                                                }
                                                handlePlantSpacingCancel={handlePlantSpacingCancel}
                                                handleCaptureMapAndSummary={
                                                    handleCaptureMapAndSummary
                                                }
                                                irrigationSettings={irrigationSettings}
                                                setIrrigationSettings={setIrrigationSettings}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Map Panel */}
                            <div className="col-span-8 overflow-hidden rounded-lg bg-gray-800">
                                <div className="flex h-full flex-col">
                                    {/* Map Header */}
                                    <div className="border-b border-gray-600 bg-gray-700 p-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-white">
                                                📍 Interactive Map
                                            </h3>

                                            {/* Map Type Selector */}
                                            <FieldMapTypeSelector
                                                mapType={mapType}
                                                setMapType={setMapType}
                                            />
                                        </div>
                                    </div>

                                    {/* Map Container */}
                                    <div className="relative flex-1">
                                        <MapContainer
                                            center={mapCenter}
                                            zoom={mapZoom}
                                            maxZoom={20}
                                            minZoom={3}
                                            className={`h-full w-full ${isPlacingEquipment ? 'cursor-crosshair' : ''}`}
                                        >
                                            <TileLayer
                                                key={mapType}
                                                attribution={MAP_TILES[mapType].attribution}
                                                url={MAP_TILES[mapType].url}
                                                maxZoom={20}
                                                maxNativeZoom={18}
                                                keepBuffer={4}
                                            />

                                            <FeatureGroup ref={featureGroupRef}>
                                                <EditControl
                                                    position="topright"
                                                    onCreated={handleDrawCreated}
                                                    onDeleted={handleDrawDeleted}
                                                    draw={{
                                                        rectangle: false,
                                                        polygon:
                                                            drawingStage === 'field' ||
                                                            (drawingStage === 'zones' &&
                                                                drawingMode === 'zone' &&
                                                                canDrawZone) ||
                                                            (drawingStage === 'zones' &&
                                                                drawingMode === 'obstacle')
                                                                ? {
                                                                      shapeOptions:
                                                                          drawingStage === 'field'
                                                                              ? {
                                                                                    color: '#22C55E',
                                                                                    fillColor:
                                                                                        '#22C55E',
                                                                                    fillOpacity: 0.2,
                                                                                }
                                                                              : drawingStage ===
                                                                                      'zones' &&
                                                                                  drawingMode ===
                                                                                      'zone'
                                                                                ? {
                                                                                      color: currentZoneColor,
                                                                                      fillColor:
                                                                                          currentZoneColor,
                                                                                      fillOpacity: 0.3,
                                                                                  }
                                                                                : drawingStage ===
                                                                                        'zones' &&
                                                                                    drawingMode ===
                                                                                        'obstacle'
                                                                                  ? {
                                                                                        color: OBSTACLE_TYPES[
                                                                                            currentObstacleType
                                                                                        ].color,
                                                                                        fillColor:
                                                                                            OBSTACLE_TYPES[
                                                                                                currentObstacleType
                                                                                            ]
                                                                                                .fillColor,
                                                                                        fillOpacity:
                                                                                            OBSTACLE_TYPES[
                                                                                                currentObstacleType
                                                                                            ]
                                                                                                .fillOpacity,
                                                                                    }
                                                                                  : {},
                                                                  }
                                                                : false,
                                                        circle: false,
                                                        polyline:
                                                            drawingStage === 'pipes' &&
                                                            canDrawPipe &&
                                                            PIPE_TYPES[currentPipeType].manual
                                                                ? {
                                                                      shapeOptions: {
                                                                          color: PIPE_TYPES[
                                                                              currentPipeType
                                                                          ].color,
                                                                          weight: PIPE_TYPES[
                                                                              currentPipeType
                                                                          ].weight,
                                                                          opacity:
                                                                              PIPE_TYPES[
                                                                                  currentPipeType
                                                                              ].opacity,
                                                                      },
                                                                  }
                                                                : false,
                                                        marker: false,
                                                        circlemarker: false,
                                                    }}
                                                />
                                            </FeatureGroup>

                                            <MapControls
                                                mapCenter={mapCenter}
                                                mapZoom={mapZoom}
                                                mapRef={mapRef}
                                            />

                                            <MapClickHandler
                                                isPlacingEquipment={isPlacingEquipment}
                                                onMapClick={placeEquipmentAtPosition}
                                            />
                                        </MapContainer>

                                        {/* Location Search Overlay */}
                                        <LocationSearchOverlay
                                            searchQuery={searchQuery}
                                            setSearchQuery={setSearchQuery}
                                            searchResults={searchResults}
                                            isSearching={isSearching}
                                            showDropdown={showDropdown}
                                            setShowDropdown={setShowDropdown}
                                            isLocationSelected={isLocationSelected}
                                            setIsLocationSelected={setIsLocationSelected}
                                            goToLocation={goToLocation}
                                            clearSearch={clearSearch}
                                            blurTimeoutRef={blurTimeoutRef}
                                        />

                                        {/* Equipment Placement Overlay */}
                                        {isPlacingEquipment && selectedEquipmentType && (
                                            <div className="pointer-events-none absolute left-1/2 top-4 z-[1000] -translate-x-1/2 transform rounded-lg bg-black bg-opacity-75 px-4 py-2 text-sm text-white">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-lg">
                                                        {
                                                            EQUIPMENT_TYPES[selectedEquipmentType]
                                                                .icon
                                                        }
                                                    </span>
                                                    <span>
                                                        คลิกบนแผนที่เพื่อวาง{' '}
                                                        {
                                                            EQUIPMENT_TYPES[selectedEquipmentType]
                                                                .name
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Map Controls Footer */}
                                    <div className="border-t border-gray-600 bg-gray-700 p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex space-x-2">
                                                <Tooltip content="Center map view">
                                                    <button
                                                        onClick={() => {
                                                            setMapCenter([14.5995, 120.9842]);
                                                            setMapZoom(13);
                                                        }}
                                                        className="rounded bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-700"
                                                    >
                                                        📍 Center
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="Get your current location">
                                                    <button
                                                        onClick={getCurrentLocation}
                                                        className="rounded bg-green-600 px-3 py-1 text-xs text-white transition-colors hover:bg-green-700"
                                                    >
                                                        🎯 My Location
                                                    </button>
                                                </Tooltip>

                                                {/* Equipment buttons - Only available in Step 3 */}
                                                {currentStep === 3 && (
                                                    <>
                                                        <div className="h-6 w-px bg-gray-500"></div>
                                                        {Object.entries(EQUIPMENT_TYPES).map(
                                                            ([key, config]) => (
                                                                <Tooltip
                                                                    key={key}
                                                                    content={`วาง ${config.name}`}
                                                                >
                                                                    <button
                                                                        onClick={() =>
                                                                            startPlacingEquipment(
                                                                                key as EquipmentType
                                                                            )
                                                                        }
                                                                        className={`rounded px-3 py-1 text-xs transition-colors ${
                                                                            selectedEquipmentType ===
                                                                                key &&
                                                                            isPlacingEquipment
                                                                                ? 'bg-yellow-600 text-white'
                                                                                : 'bg-gray-600 text-white hover:bg-gray-500'
                                                                        }`}
                                                                        disabled={
                                                                            isPlacingEquipment &&
                                                                            selectedEquipmentType !==
                                                                                key
                                                                        }
                                                                    >
                                                                        {config.icon}{' '}
                                                                        {config.name.split(' ')[0]}
                                                                    </button>
                                                                </Tooltip>
                                                            )
                                                        )}

                                                        {isPlacingEquipment && (
                                                            <Tooltip content="ยกเลิกการวางอุปกรณ์">
                                                                <button
                                                                    onClick={cancelPlacingEquipment}
                                                                    className="rounded bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-700"
                                                                >
                                                                    ❌ ยกเลิก
                                                                </button>
                                                            </Tooltip>
                                                        )}

                                                        <Tooltip
                                                            content={
                                                                equipmentIcons.length > 0
                                                                    ? `ล้างอุปกรณ์ทั้งหมด (${equipmentIcons.length} รายการ)`
                                                                    : 'ยังไม่มีอุปกรณ์บนแผนที่'
                                                            }
                                                        >
                                                            <button
                                                                onClick={clearAllEquipment}
                                                                disabled={
                                                                    equipmentIcons.length === 0
                                                                }
                                                                className={`rounded px-3 py-1 text-xs transition-colors ${
                                                                    equipmentIcons.length === 0
                                                                        ? 'cursor-not-allowed bg-gray-500 text-gray-300'
                                                                        : 'bg-orange-600 text-white hover:bg-orange-700'
                                                                }`}
                                                            >
                                                                🧹 ล้างทั้งหมด
                                                            </button>
                                                        </Tooltip>

                                                        {/* Undo/Redo buttons */}
                                                        <div className="h-6 w-px bg-gray-500"></div>
                                                        <Tooltip
                                                            content={`Undo (${equipmentHistoryIndex > 0 ? 'มีให้ย้อนกลับ' : 'ไม่มีให้ย้อนกลับ'})`}
                                                        >
                                                            <button
                                                                onClick={undoEquipment}
                                                                disabled={
                                                                    equipmentHistoryIndex <= 0
                                                                }
                                                                className={`rounded px-3 py-1 text-xs transition-colors ${
                                                                    equipmentHistoryIndex > 0
                                                                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                                                                        : 'cursor-not-allowed bg-gray-500 text-gray-300'
                                                                }`}
                                                            >
                                                                ↶ Undo
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip
                                                            content={`Redo (${equipmentHistoryIndex < equipmentHistory.length - 1 ? 'มีให้ทำซ้ำ' : 'ไม่มีให้ทำซ้ำ'})`}
                                                        >
                                                            <button
                                                                onClick={redoEquipment}
                                                                disabled={
                                                                    equipmentHistoryIndex >=
                                                                    equipmentHistory.length - 1
                                                                }
                                                                className={`rounded px-3 py-1 text-xs transition-colors ${
                                                                    equipmentHistoryIndex <
                                                                    equipmentHistory.length - 1
                                                                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                                                                        : 'cursor-not-allowed bg-gray-500 text-gray-300'
                                                                }`}
                                                            >
                                                                ↷ Redo
                                                            </button>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                <span className="text-xs text-gray-400">
                                                    Zoom: {mapZoom}
                                                </span>
                                                <div className="flex space-x-1">
                                                    <button
                                                        onClick={() =>
                                                            setMapZoom(Math.max(mapZoom - 1, 3))
                                                        }
                                                        className="rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-500"
                                                    >
                                                        −
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setMapZoom(Math.min(mapZoom + 1, 20))
                                                        }
                                                        className="rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-500"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Plant Selection Modal */}
                {showPlantSelector && selectedZone && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
                        <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-gray-800 p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-white">
                                    🌱 Assign Plant to {selectedZone.name}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowPlantSelector(false);
                                        setSelectedZone(null);
                                    }}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <svg
                                        className="h-6 w-6"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>

                            <div className="mb-4">
                                <div className="mb-2 flex items-center">
                                    <span
                                        className="mr-2 h-4 w-4 rounded-full border-2 border-white/20"
                                        style={{ backgroundColor: selectedZone.color }}
                                    ></span>
                                    <span className="text-gray-300">Zone Color</span>
                                </div>
                                <p className="text-sm text-gray-400">
                                    Select a plant from your chosen crops to assign to this zone.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {selectedCropObjects.map(
                                    (crop) =>
                                        crop && (
                                            <button
                                                key={crop.value}
                                                onClick={() =>
                                                    assignPlantToZone(
                                                        selectedZone.id.toString(),
                                                        crop.value
                                                    )
                                                }
                                                className={`rounded-lg border-2 p-4 text-left transition-all ${
                                                    zoneAssignments[selectedZone.id] === crop.value
                                                        ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                                                        : 'border-gray-600 bg-gray-700 text-white hover:border-blue-400 hover:bg-blue-500/10'
                                                }`}
                                            >
                                                <div className="flex items-center">
                                                    <span className="mr-3 text-3xl">
                                                        {crop.icon}
                                                    </span>
                                                    <div>
                                                        <h4 className="font-semibold">
                                                            {crop.name}
                                                        </h4>
                                                        <p className="text-sm opacity-80">
                                                            {crop.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                )}
                            </div>

                            {selectedCropObjects.length === 0 && (
                                <div className="py-8 text-center text-gray-400">
                                    <p>
                                        No crops selected. Please go back to the crop selection page
                                        to choose crops.
                                    </p>
                                </div>
                            )}

                            <div className="mt-6 flex justify-end space-x-3">
                                {zoneAssignments[selectedZone.id] && (
                                    <button
                                        onClick={() => {
                                            removePlantFromZone(selectedZone.id.toString());
                                            setShowPlantSelector(false);
                                            setSelectedZone(null);
                                        }}
                                        className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                                    >
                                        Remove Plant
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowPlantSelector(false);
                                        setSelectedZone(null);
                                    }}
                                    className="rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
}
