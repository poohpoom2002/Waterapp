/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { refreshCsrfToken } from '../bootstrap';
import { calculatePolygonArea } from '../utils/homeGardenData';
import {
    FaFolder,
    FaFolderOpen,
    FaArrowLeft,
    FaPlus,
    FaTrash,
    FaEdit,
    FaGripVertical,
} from 'react-icons/fa';

// Types
type Field = {
    id: string;
    name: string;
    customerName?: string;
    userName?: string;
    category?: string;
    folderId?: string | null; // Allow null for unassigned fields
    status?: string; // Added for new system folders
    isCompleted?: boolean; // Added for new system folders
    area: Array<{ lat: number; lng: number }>;
    plantType?: {
        id: number;
        name: string;
        type: string;
        plant_spacing: number;
        row_spacing: number;
        water_needed: number;
    };
    totalPlants?: number;
    totalArea: number;
    total_water_need?: number;
    createdAt: string;
    layers?: Array<{
        type: string;
        coordinates: Array<{ lat: number; lng: number }>;
        isInitialMap?: boolean;
    }>;
    // Additional data for different field types
    garden_data?: any;
    garden_stats?: any;
    greenhouse_data?: any;
    field_crop_data?: any;
    project_data?: any;
    project_stats?: any;
};

// New folder types
type Folder = {
    id: string;
    name: string;
    type: 'finished' | 'unfinished' | 'custom' | 'customer' | 'category';
    parent_id?: string;
    color?: string;
    icon?: string;
    createdAt: string;
    updatedAt: string;
};

type FolderWithChildren = Folder & {
    children?: FolderWithChildren[];
};

type FolderStructure = {
    folders: Folder[];
    fields: Field[];
};

// Plant category types
type PlantCategory = {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    route: string;
    features: string[];
};

// Constants
const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];

// Helper function to build folder tree from flat list
const buildFolderTree = (folders: Folder[]): FolderWithChildren[] => {
    const folderMap = new Map<string, FolderWithChildren>();
    const rootFolders: FolderWithChildren[] = [];

    // Create a map of all folders
    folders.forEach((folder) => {
        folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Build the tree structure
    folders.forEach((folder) => {
        const folderWithChildren = folderMap.get(folder.id)!;

        if (folder.parent_id && folderMap.has(folder.parent_id)) {
            // This is a child folder
            const parent = folderMap.get(folder.parent_id)!;
            if (!parent.children) parent.children = [];
            parent.children.push(folderWithChildren);
        } else {
            // This is a root folder
            rootFolders.push(folderWithChildren);
        }
    });

    return rootFolders;
};

const getPlantCategories = (t: (key: string) => string): PlantCategory[] => [
    {
        id: 'horticulture',
        name: t('horticulture'),
        description: t('horticulture_desc'),
        icon: '🌳',
        color: 'from-green-600 to-green-800',
        route: '/horticulture/planner',
        features: [
            t('zone_based_planning'),
            t('multiple_plant_types'),
            t('advanced_pipe_layout'),
            t('elevation_analysis'),
            t('comprehensive_stats'),
        ],
    },
    {
        id: 'home-garden',
        name: t('home_garden'),
        description: t('home_garden_desc'),
        icon: '🏡',
        color: 'from-blue-600 to-blue-800',
        route: '/home-garden/planner',
        features: [
            t('automated_sprinkler'),
            t('coverage_optimization'),
            t('water_flow_calc'),
            t('easy_interface'),
            t('residential_focus'),
        ],
    },
    {
        id: 'greenhouse',
        name: t('greenhouse'),
        description: t('greenhouse_desc'),
        icon: '🌱',
        color: 'from-purple-600 to-purple-800',
        route: '/greenhouse-crop',
        features: [
            t('controlled_environment'),
            t('precision_irrigation'),
            t('climate_control'),
            t('crop_optimization'),
            t('environmental_monitoring'),
        ],
    },
    {
        id: 'field-crop',
        name: t('field_crop'),
        description: t('field_crop_desc'),
        icon: '🌾',
        color: 'from-yellow-600 to-yellow-800',
	        route: '/choose-crop',
        features: [
            t('large_scale_planning'),
            t('efficient_irrigation'),
            t('crop_rotation'),
            t('weather_integration'),
            t('yield_optimization'),
        ],
    },
];

// Components
const MapBounds = ({ positions }: { positions: Array<{ lat: number; lng: number }> }) => {
    const map = useMap();

    React.useEffect(() => {
        if (positions.length > 0) {
            const bounds = positions.reduce(
                (bounds, point) => bounds.extend([point.lat, point.lng]),
                L.latLngBounds([])
            );
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18, animate: true });
        }
    }, [positions, map]);

    return null;
};

const FieldCard = ({
    field,
    onSelect,
    onDelete,
    onStatusChange,
    onDragStart,
    onDragEnd,
    isDragging,
    t,
}: {
    field: Field;
    onSelect: (field: Field) => void;
    onDelete: (fieldId: string) => void;
    onStatusChange?: (fieldId: string, status: string, isCompleted: boolean) => void;
    onDragStart?: (field: Field) => void;
    onDragEnd?: () => void;
    isDragging?: boolean;
    t: (key: string) => string;
}) => {
    const getCategoryDisplay = (category: string) => {
        const categoryMap: Record<string, string> = {
            horticulture: '🌳',
            'home-garden': '🏡',
            greenhouse: '🌱',
            'field-crop': '🌾',
        };
        return categoryMap[category] || '📁';
    };

    const isFinished = field.status === 'finished' || field.isCompleted;

    return (
        <div
            className={`group relative overflow-hidden rounded-lg border border-gray-700 bg-gray-800 p-6 transition-all duration-200 hover:border-blue-500 hover:bg-blue-900/10 ${
                isDragging ? 'scale-95 opacity-50' : ''
            }`}
            draggable
            onDragStart={() => onDragStart?.(field)}
            onDragEnd={() => onDragEnd?.()}
        >
            {/* Status Badge */}
            <div className="absolute right-3 top-3">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onStatusChange) {
                            const newStatus = isFinished ? 'unfinished' : 'finished';
                            const newIsCompleted = !isFinished;
                            onStatusChange(field.id, newStatus, newIsCompleted);
                        }
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        isFinished
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                    title={isFinished ? t('mark_as_unfinished') : t('mark_as_finished')}
                >
                    {isFinished ? '✅' : '⏳'}
                </button>
            </div>

            {/* Field Content */}
            <div className="cursor-pointer" onClick={() => onSelect(field)}>
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{getCategoryDisplay(field.category || '')}</span>
                        <div>
                            <h3 className="font-semibold text-white">{field.name}</h3>
                            {field.customerName && (
                                <p className="text-sm text-gray-400">{field.customerName}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-2 text-sm text-gray-300">
                    {field.category === 'home-garden' ? (
                        // Home Garden specific display
                        <>
                            <div className="flex justify-between">
                                <span>พื้นที่:</span>
                                <span className="text-white">
                                    {(() => {
                                        // Try multiple sources for area data
                                        const areaFromStats = field.garden_stats?.summary?.totalArea;
                                        const areaFromData = field.garden_data?.gardenZones?.reduce((total, zone) => {
                                            if (zone.coordinates && zone.coordinates.length >= 3) {
                                                // Use proper area calculation
                                                const coords = zone.canvasCoordinates || zone.coordinates;
                                                const scale = field.garden_data?.designMode === 'canvas' || field.garden_data?.designMode === 'image'
                                                    ? (field.garden_data?.canvasData?.scale || field.garden_data?.imageData?.scale || 20)
                                                    : undefined;
                                                return total + calculatePolygonArea(coords, scale);
                                            }
                                            return total;
                                        }, 0);
                                        
                                        if (areaFromStats) {
                                            return `${typeof areaFromStats === 'number' ? areaFromStats.toFixed(2) : parseFloat(areaFromStats || 0).toFixed(2)} ตร.ม.`;
                                        } else if (areaFromData) {
                                            return `${areaFromData.toFixed(2)} ตร.ม.`;
                                        } else if (field.totalArea) {
                                            const areaInSqM = typeof field.totalArea === 'number' 
                                                ? field.totalArea * 1600 
                                                : parseFloat(field.totalArea || 0) * 1600;
                                            return `${areaInSqM.toFixed(2)} ตร.ม.`;
                                        } else {
                                            return 'N/A';
                                        }
                                    })()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>การออกแบบ:</span>
                                <span className="text-white">
                                    {field.garden_data?.designMode === 'image' ? 'ใช้แปลน' : 
                                     field.garden_data?.designMode === 'canvas' ? 'วาดเอง' :
                                     field.garden_data?.designMode === 'map' ? 'ใช้แผนที่' : 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>จำนวนโซน:</span>
                                <span className="text-white">
                                    {(() => {
                                        const zonesFromStats = field.garden_stats?.summary?.totalZones;
                                        const zonesFromData = field.garden_data?.gardenZones?.length;
                                        
                                        if (zonesFromStats) {
                                            return zonesFromStats;
                                        } else if (zonesFromData) {
                                            return zonesFromData;
                                        } else {
                                            return 'N/A';
                                        }
                                    })()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>หัวฉีด:</span>
                                <span className="text-white">
                                    {(() => {
                                        const sprinklersFromStats = field.garden_stats?.summary?.totalSprinklers;
                                        const sprinklersFromData = field.garden_data?.sprinklers?.length;
                                        
                                        if (sprinklersFromStats) {
                                            return sprinklersFromStats;
                                        } else if (sprinklersFromData) {
                                            return sprinklersFromData;
                                        } else {
                                            return 'N/A';
                                        }
                                    })()}
                                </span>
                            </div>
                        </>
                    ) : field.category === 'greenhouse' ? (
                        // Greenhouse specific display
                        <>
                            <div className="flex justify-between">
                                <span>พื้นที่โรงเรือน:</span>
                                <span className="text-white">
                                    {(() => {
                                        const areaFromStats = field.greenhouse_data?.summary?.totalGreenhouseArea;
                                        const areaFromData = field.greenhouse_data?.rawData?.shapes?.filter(s => s.type === 'greenhouse').reduce((total, shape) => {
                                            return total + 100; // Rough estimate per greenhouse
                                        }, 0);
                                        
                                        if (areaFromStats) {
                                            return `${typeof areaFromStats === 'number' ? areaFromStats.toFixed(2) : parseFloat(areaFromStats || 0).toFixed(2)} ตร.ม.`;
                                        } else if (areaFromData) {
                                            return `${areaFromData.toFixed(2)} ตร.ม.`;
                                        } else if (field.totalArea) {
                                            const areaInSqM = typeof field.totalArea === 'number' 
                                                ? field.totalArea * 1600 
                                                : parseFloat(field.totalArea || 0) * 1600;
                                            return `${areaInSqM.toFixed(2)} ตร.ม.`;
                                        } else {
                                            return 'N/A';
                                        }
                                    })()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>จำนวนแปลง:</span>
                                <span className="text-white">
                                    {(() => {
                                        const plotsFromData = field.greenhouse_data?.rawData?.shapes?.filter(s => s.type === 'plot').length;
                                        
                                        if (plotsFromData) {
                                            return plotsFromData;
                                        } else if (field.totalPlants) {
                                            return field.totalPlants;
                                        } else {
                                            return 'N/A';
                                        }
                                    })()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>พืชที่ปลูก:</span>
                                <span className="text-white">
                                    {(() => {
                                        const cropsFromData = field.greenhouse_data?.selectedCrops;
                                        
                                        if (cropsFromData && cropsFromData.length > 0) {
                                            return cropsFromData.join(', ');
                                        } else {
                                            return 'N/A';
                                        }
                                    })()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>ระบบน้ำ:</span>
                                <span className="text-white">
                                    {(() => {
                                        const irrigationFromData = field.greenhouse_data?.irrigationMethod;
                                        
                                        if (irrigationFromData) {
                                            return irrigationFromData === 'mini-sprinkler' ? 'มินิสปริงเกลอร์' :
                                                   irrigationFromData === 'drip' ? 'น้ำหยด' :
                                                   irrigationFromData === 'mixed' ? 'ผสม' : 'N/A';
                                        } else {
                                            return 'N/A';
                                        }
                                    })()}
                                </span>
                            </div>
                        </>
                    ) : (
                        // Default display for other categories
                        <>
                    <div className="flex justify-between">
                        <span>{t('plant_type')}:</span>
                        <span className="text-white">{field.plantType?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>{t('area')}:</span>
                        <span className="text-white">
                            {field.totalArea
                                ? typeof field.totalArea === 'number'
                                    ? field.totalArea.toFixed(2)
                                    : (parseFloat(field.totalArea) || 0).toFixed(2)
                                : 'N/A'}{' '}
                            ไร่
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>{t('plants')}:</span>
                        <span className="text-white">{field.totalPlants || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>{t('water_need')}:</span>
                        <span className="text-white">
                            {field.total_water_need
                                ? typeof field.total_water_need === 'number'
                                    ? field.total_water_need.toFixed(2)
                                    : (parseFloat(field.total_water_need) || 0).toFixed(2)
                                : 'N/A'}{' '}
                            ลิตร/ครั้ง
                        </span>
                    </div>
                        </>
                    )}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                    <span>{new Date(field.createdAt).toLocaleDateString()}</span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(field.id);
                        }}
                        className="text-red-400 hover:text-red-300"
                        title={t('delete_field')}
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

const CategoryCard = ({
    category,
    onSelect,
    t,
}: {
    category: PlantCategory;
    onSelect: (category: PlantCategory) => void;
    t: (key: string) => string;
}) => {
    return (
        <div
            className={`bg-gradient-to-br ${category.color} transform cursor-pointer rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
            onClick={() => onSelect(category)}
        >
            <div className="mb-4 flex items-center">
                <div className="mr-4 text-4xl">{category.icon}</div>
                <div className="min-w-0 flex-1">
                    <h3 className="break-words text-xl font-bold text-white">{category.name}</h3>
                    <p className="break-words text-sm text-white/80">{category.description}</p>
                </div>
            </div>

            <div className="space-y-2">
                {category.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-white/90">
                        <svg
                            className="mr-2 h-4 w-4 text-white/70"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                        {feature}
                    </div>
                ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
                <span className="text-sm text-white/80">{t('click_start_planning')}</span>
                <svg
                    className="h-5 w-5 text-white/80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                    />
                </svg>
            </div>
        </div>
    );
};

const CategorySelectionModal = ({
    isOpen,
    onClose,
    onSelectCategory,
    plantCategories,
    t,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSelectCategory: (category: PlantCategory) => void;
    plantCategories: PlantCategory[];
    t: (key: string) => string;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="relative z-[10000] max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-gray-900 p-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="mb-2 text-3xl font-bold text-white">
                            {t('choose_irrigation_category')}
                        </h2>
                        <p className="text-gray-400">{t('select_irrigation_type')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 transition-colors hover:text-white"
                    >
                        <svg
                            className="h-8 w-8"
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

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {plantCategories.map((category) => (
                        <CategoryCard
                            key={category.id}
                            category={category}
                            onSelect={onSelectCategory}
                            t={t}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// New folder management components
const FolderCard = ({
    folder,
    fieldCount,
    onSelect,
    onEdit,
    onDelete,
    onDrop,
    isSelected,
    t,
}: {
    folder: Folder;
    fieldCount: number;
    onSelect: (folder: Folder) => void;
    onEdit: (folder: Folder) => void;
    onDelete: (folder: Folder) => void;
    onDrop?: (folderId: string | null) => void;
    isSelected: boolean;
    t: (key: string) => string;
}) => {
    const getFolderIcon = () => {
        if (folder.icon) return folder.icon;
        switch (folder.type) {
            case 'customer':
                return '👤';
            case 'category':
                return '📁';
            case 'custom':
                return '📂';
            default:
                return '📁';
        }
    };

    const getFolderColor = () => {
        if (folder.color) return folder.color;
        switch (folder.type) {
            case 'customer':
                return 'border-blue-500 bg-blue-900/10';
            case 'category':
                return 'border-green-500 bg-green-900/10';
            case 'custom':
                return 'border-purple-500 bg-purple-900/10';
            default:
                return 'border-gray-500 bg-gray-900/10';
        }
    };

    return (
        <div
            className={`cursor-pointer rounded-lg border p-4 transition-all hover:scale-105 ${
                isSelected ? 'ring-2 ring-blue-400' : ''
            } ${getFolderColor()}`}
            onClick={() => onSelect(folder)}
            onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-blue-400', 'bg-blue-900/20');
            }}
            onDragLeave={(e) => {
                e.currentTarget.classList.remove('border-blue-400', 'bg-blue-900/20');
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-blue-400', 'bg-blue-900/20');
                onDrop?.(folder.id);
            }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{getFolderIcon()}</span>
                    <div>
                        <h3 className="font-semibold text-white">{folder.name}</h3>
                        <p className="text-sm text-gray-400">
                            {fieldCount} {t('fields')}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(folder);
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
                        title={t('edit_folder')}
                    >
                        <FaEdit className="h-4 w-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(folder);
                        }}
                        className="rounded p-1 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                        title={t('delete_folder')}
                    >
                        <FaTrash className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const CreateFolderModal = ({
    isOpen,
    onClose,
    onCreate,
    parentFolder,
    t,
}: {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>) => void;
    parentFolder?: Folder | null;
    t: (key: string) => string;
}) => {
    const [folderName, setFolderName] = useState('');
    const [folderType, setFolderType] = useState<'custom'>('custom');
    const [folderColor, setFolderColor] = useState('#6366f1');
    const [folderIcon, setFolderIcon] = useState('📁');

    const colors = [
        { name: 'Blue', value: '#3b82f6' },
        { name: 'Green', value: '#10b981' },
        { name: 'Purple', value: '#8b5cf6' },
        { name: 'Red', value: '#ef4444' },
        { name: 'Yellow', value: '#f59e0b' },
        { name: 'Pink', value: '#ec4899' },
    ];

    const icons = ['📁', '📂', '🗂️', '📋', '📝', '📌', '🏷️', '⭐', '💡', '🎯'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!folderName.trim()) return;

        onCreate({
            name: folderName.trim(),
            type: folderType,
            parent_id: parentFolder?.id,
            color: folderColor,
            icon: folderIcon,
        });

        setFolderName('');
        setFolderColor('#6366f1');
        setFolderIcon('📁');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
            <div className="relative z-[10000] mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">
                        {parentFolder
                            ? `Create Sub-folder in "${parentFolder.name}"`
                            : t('create_folder')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
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
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            {t('folder_name')}
                        </label>
                        <input
                            type="text"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                            placeholder={t('enter_folder_name')}
                            autoFocus
                        />
                    </div>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            {t('folder_icon')}
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {icons.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setFolderIcon(icon)}
                                    className={`rounded p-2 text-xl ${
                                        folderIcon === icon
                                            ? 'bg-blue-600'
                                            : 'bg-gray-700 hover:bg-gray-600'
                                    }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            {t('folder_color')}
                        </label>
                        <div className="grid grid-cols-6 gap-2">
                            {colors.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setFolderColor(color.value)}
                                    className={`h-8 w-8 rounded-full border-2 ${
                                        folderColor === color.value
                                            ? 'border-white'
                                            : 'border-gray-600'
                                    }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded px-4 py-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!folderName.trim()}
                            className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                            {t('create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditFolderModal = ({
    isOpen,
    onClose,
    onSave,
    folder,
    t,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (folderId: string, updates: Partial<Folder>) => void;
    folder: Folder | null;
    t: (key: string) => string;
}) => {
    const [folderName, setFolderName] = useState('');
    const [folderColor, setFolderColor] = useState('#6366f1');
    const [folderIcon, setFolderIcon] = useState('📁');

    const colors = [
        { name: 'Blue', value: '#3b82f6' },
        { name: 'Green', value: '#10b981' },
        { name: 'Purple', value: '#8b5cf6' },
        { name: 'Red', value: '#ef4444' },
        { name: 'Yellow', value: '#f59e0b' },
        { name: 'Pink', value: '#ec4899' },
    ];

    const icons = ['📁', '📂', '🗂️', '📋', '📝', '📌', '🏷️', '⭐', '💡', '🎯'];

    useEffect(() => {
        if (folder) {
            setFolderName(folder.name);
            setFolderColor(folder.color || '#6366f1');
            setFolderIcon(folder.icon || '📁');
        }
    }, [folder]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!folder || !folderName.trim()) return;

        onSave(folder.id, {
            name: folderName.trim(),
            color: folderColor,
            icon: folderIcon,
            updatedAt: new Date().toISOString(),
        });

        onClose();
    };

    if (!isOpen || !folder) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
            <div className="relative z-[10000] mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">{t('edit_folder')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
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
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            {t('folder_name')}
                        </label>
                        <input
                            type="text"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                            placeholder={t('enter_folder_name')}
                        />
                    </div>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            {t('folder_icon')}
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {icons.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setFolderIcon(icon)}
                                    className={`rounded p-2 text-xl ${
                                        folderIcon === icon
                                            ? 'bg-blue-600'
                                            : 'bg-gray-700 hover:bg-gray-600'
                                    }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            {t('folder_color')}
                        </label>
                        <div className="grid grid-cols-6 gap-2">
                            {colors.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setFolderColor(color.value)}
                                    className={`h-8 w-8 rounded-full border-2 ${
                                        folderColor === color.value
                                            ? 'border-white'
                                            : 'border-gray-600'
                                    }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded px-4 py-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!folderName.trim()}
                            className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                            {t('save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function Home() {
    // Add safety check for language context
    let t: (key: string) => string;
    try {
        const languageContext = useLanguage();
        t = languageContext.t;
    } catch (error) {
        // Fallback function if context is not available
        t = (key: string) => key;
    }
    
    // Defensive usePage call with error handling
    let page: any = { props: {} };
    let auth: any = null;
    try {
        page = usePage();
        auth = (page.props as any).auth;
        console.log('🔐 Auth object:', auth);
        console.log('👤 User:', auth?.user);
    } catch (error) {
        // Silently handle the error - this is expected during initial render
        // The context will be available after the component mounts
    }
    
    const [fields, setFields] = useState<Field[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [fieldToDelete, setFieldToDelete] = useState<Field | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
    const [folderHistory, setFolderHistory] = useState<Folder[]>([]);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [showEditFolderModal, setShowEditFolderModal] = useState(false);
    const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
    const [showFolderDeleteConfirm, setShowFolderDeleteConfirm] = useState(false);
    const [draggedField, setDraggedField] = useState<Field | null>(null);
    const [draggedFolder, setDraggedFolder] = useState<Folder | null>(null);
    const [parentFolderForModal, setParentFolderForModal] = useState<Folder | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const plantCategories = getPlantCategories(t);

    // Robust navigation function to handle router initialization issues
    const navigateToRoute = (route: string) => {
        try {
            // Check if router is available and has the visit method
            if (router && typeof router.visit === 'function') {
                console.log('Using Inertia router for navigation to:', route);
                router.visit(route);
            } else {
                console.log('Router not ready, using window.location for:', route);
                window.location.href = route;
            }
        } catch (error) {
            console.error('Navigation error, falling back to window.location:', error);
            window.location.href = route;
        }
    };

    // Initialize default folders if none exist
    useEffect(() => {
        // System folders are created in the backend, so we don't need to initialize them here
        // The backend will create them when the user first accesses the folders
    }, [folders.length, t]);

    // Group fields by folder
    const getFieldsByFolder = (folderId: string) => {
        return fields.filter((field) => String(field.folderId) === String(folderId));
    };

    // Get all folders including system folders
    const getAllFolders = () => {
        // Only return root folders (folders without parent_id)
        const rootFolders = folders.filter((folder) => !folder.parent_id);
        console.log('📂 All folders:', folders);
        console.log('🏠 Root folders:', rootFolders);
        return rootFolders;
    };

    // Get fields for current view
    const getCurrentFields = () => {
        if (!selectedFolder) return fields;



        // Check by folder name since system folders are created in the backend
        if (selectedFolder.name === t('finished') || selectedFolder.name === 'Finished') {
            return fields.filter(
                (field) =>
                (field.status === 'finished' || field.isCompleted) && 
                field.folderId === selectedFolder.id
            );
        }
        if (selectedFolder.name === t('unfinished') || selectedFolder.name === 'Unfinished') {
            // Show fields that are unfinished AND are assigned to this specific folder (not unassigned ones)
            return fields.filter(
                (field) =>
                    field.status !== 'finished' &&
                    !field.isCompleted &&
                    field.folderId === selectedFolder.id
            );
        }

        return getFieldsByFolder(selectedFolder.id);
    };

    // Get field count for a specific folder
    const getFieldCountForFolder = (folder: Folder) => {

        
        // Check by folder name since system folders are created in the backend
        if (folder.name === t('finished') || folder.name === 'Finished') {
            return fields.filter(
                (field) =>
                (field.status === 'finished' || field.isCompleted) && 
                field.folderId === folder.id
            ).length;
        }
        if (folder.name === t('unfinished') || folder.name === 'Unfinished') {
            // Count fields that are unfinished AND are assigned to this specific folder (not unassigned ones)
            return fields.filter(
                (field) =>
                    field.status !== 'finished' &&
                    !field.isCompleted &&
                    field.folderId === folder.id
            ).length;
        }

        return getFieldsByFolder(folder.id).length;
    };

    useEffect(() => {
        // Load saved fields and folders from database
        const fetchData = async () => {
            try {
                console.log('🔄 Fetching data from API...');
                console.log('📋 Axios defaults:', {
                    baseURL: axios.defaults.baseURL,
                    headers: axios.defaults.headers.common,
                    withCredentials: axios.defaults.withCredentials,
                });
                
                const [fieldsResponse, foldersResponse] = await Promise.all([
                    axios.get('/fields-api'), // Updated to use new endpoint
                    axios.get('/folders-api'), // Updated to use new route path
                ]);

                console.log('📁 Folders response:', foldersResponse.data);
                console.log('🌾 Fields response:', fieldsResponse.data);

                if (fieldsResponse.data.fields) {
                    setFields(fieldsResponse.data.fields);
                }

                if (foldersResponse.data.folders) {
                    console.log('✅ Setting folders:', foldersResponse.data.folders);
                    setFolders(foldersResponse.data.folders);
                    
                    // Commented out automatic mock field creation to avoid issues
                    // if (fieldsResponse.data.fields.length === 0) {
                    //     createMockField();
                    // }
                } else {
                    console.warn('⚠️ No folders in response:', foldersResponse.data);
                }
            } catch (error: any) {
                console.error('❌ Error fetching data:', error);
                console.error('Error details:', error.response?.data);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        
        // Clear navigation history on mount
        setSelectedFolder(null);
        setFolderHistory([]);
    }, []);

    const handleAddField = () => {
        setShowCategoryModal(true);
    };

    const createMockField = () => {
        // Find the "Unfinished" folder
        const unfinishedFolder = folders.find((f) => f.name === 'Unfinished');
        const folderId = unfinishedFolder ? unfinishedFolder.id : undefined;
        
        const mockField: Field = {
            id: `mock-${Date.now()}`,
            name: 'Test Field',
            customerName: 'Test Customer',
            category: 'horticulture',
            status: 'unfinished',
            isCompleted: false,
            folderId: folderId, // Assign to "Unfinished" folder
            area: [
                { lat: 13.7563, lng: 100.5018 },
                { lat: 13.7564, lng: 100.5019 },
                { lat: 13.7565, lng: 100.502 },
                { lat: 13.7563, lng: 100.5018 },
            ],
            plantType: {
                id: 1,
                name: 'Tomato',
                type: 'vegetable',
                plant_spacing: 0.5,
                row_spacing: 1.0,
                water_needed: 2.5,
            },
            totalPlants: 100,
            totalArea: 50.0,
            total_water_need: 125.0,
            createdAt: new Date().toISOString(),
            layers: [],
        };

        // Add to fields state
        setFields((prev) => [...prev, mockField]);

        console.log('Mock field created for testing:', mockField);
    };

    const handleCategorySelect = (category: PlantCategory) => {
        setShowCategoryModal(false);
        // Clear any saved data when starting a new project
        localStorage.removeItem('horticultureIrrigationData');
        localStorage.removeItem('editingFieldId'); // Clear editing field ID for new projects
        localStorage.removeItem('currentFieldId'); // Clear current field ID for new projects
        localStorage.removeItem('currentFieldName'); // Clear current field name for new projects
        console.log('🆕 Starting new project - cleared field IDs from localStorage');
        
        // Add a small delay to ensure router is fully initialized
        setTimeout(() => {
            navigateToRoute(category.route);
        }, 100);
    };

    const handleFieldSelect = (field: Field) => {
        try {
            // Validate field data before navigation
            if (!field.area || field.area.length < 3) {
                alert('ข้อมูลพื้นที่ไม่ถูกต้อง กรุณาตรวจสอบข้อมูลแปลง');
                return;
            }

            if (!field.plantType) {
                alert('ข้อมูลพืชไม่ถูกต้อง กรุณาตรวจสอบข้อมูลแปลง');
                return;
            }

            // Store field ID in localStorage for later use in product page
            localStorage.setItem('currentFieldId', field.id);
            localStorage.setItem('currentFieldName', field.name);
            console.log('📋 Opening existing field - set currentFieldId:', field.id);
            
            // Check if field is finished - if so, go directly to product page with appropriate mode
            if (field.status === 'finished' || field.isCompleted) {
                console.log('🔄 Opening finished field, navigating to product page');
                const productModeMap: { [key: string]: string } = {
                    'horticulture': '',
                    'home-garden': '?mode=garden',
                    'field-crop': '?mode=field-crop',
                    'greenhouse': '?mode=greenhouse'
                };
                const modeParam = productModeMap[field.category || 'horticulture'] || '';
                navigateToRoute(`/product${modeParam}`);
                return;
            }
            
            // For unfinished fields, go to appropriate planner to continue editing
            console.log('🔄 Opening unfinished field, navigating to planner for category:', field.category);
            
            // Route to appropriate planner based on field category
            switch (field.category) {
                case 'home-garden':
                    // For home garden, navigate to the planner without URL parameters
                    // The data will be loaded from database using currentFieldId
                    navigateToRoute('/home-garden/planner');
                    break;
                    
                case 'field-crop':
                    navigateToRoute('/field-crop');
                    break;
                    
                case 'greenhouse':
                    // Extract crop and method from saved greenhouse data
                    const greenhouseData = field.greenhouse_data;
                    const crops = greenhouseData?.selectedCrops || [];
                    const method = greenhouseData?.planningMethod || 'draw';
                    const lastSavedPage = greenhouseData?.lastSavedPage || 'planner';
                    
                    // Build query parameters
                    const queryParams = new URLSearchParams();
                    if (crops.length > 0) {
                        queryParams.set('crops', crops.join(','));
                    }
                    if (method) {
                        queryParams.set('method', method);
                    }
                    
                    // Navigate to the appropriate page based on where the draft was last saved
                    if (lastSavedPage === 'irrigation-selection') {
                        // If saved from irrigation selection page, go to choose-irrigation
                        if (greenhouseData?.shapes) {
                            queryParams.set('shapes', encodeURIComponent(JSON.stringify(greenhouseData.shapes)));
                        }
                        navigateToRoute(`/choose-irrigation?${queryParams.toString()}`);
                    } else if (lastSavedPage === 'irrigation-design') {
                        // If saved from irrigation design page, go to greenhouse-map
                        if (greenhouseData?.shapes) {
                            queryParams.set('shapes', encodeURIComponent(JSON.stringify(greenhouseData.shapes)));
                        }
                        if (greenhouseData?.irrigationMethod) {
                            queryParams.set('irrigation', greenhouseData.irrigationMethod);
                        }
                        navigateToRoute(`/greenhouse-map?${queryParams.toString()}`);
                    } else {
                        // Default: go to greenhouse planner
                        navigateToRoute(`/greenhouse-planner?${queryParams.toString()}`);
                    }
                    break;
                    
                case 'horticulture':
                default:
                    // Prepare the data in the same format as map-planner for horticulture
            const params = new URLSearchParams({
                area: JSON.stringify(field.area),
                areaType: '',
                plantType: JSON.stringify(field.plantType),
                layers: JSON.stringify(field.layers || []),
                        editFieldId: field.id, // Use editFieldId to match planner expectations
            });
            navigateToRoute(`/horticulture/planner?${params.toString()}`);
                    break;
            }
        } catch (error) {
            console.error('Error preparing field data for navigation:', error);
            alert('เกิดข้อผิดพลาดในการเปิดข้อมูลแปลง กรุณาลองใหม่อีกครั้ง');
        }
    };

    const handleFieldDelete = (fieldId: string) => {
        const field = fields.find((f) => f.id === fieldId);
        if (field) {
            setFieldToDelete(field);
            setShowDeleteConfirm(true);
        }
    };

    const handleFieldStatusChange = async (
        fieldId: string,
        status: string,
        isCompleted: boolean
    ) => {
        try {
            // Convert ID to string and check if this is a mock field (ID starts with 'mock-')
            const fieldIdStr = String(fieldId);
            if (fieldIdStr.startsWith('mock-')) {
                // For mock fields, just update frontend state
                console.log('Updating mock field status:', fieldIdStr);
                setFields((prev) =>
                    prev.map((f) => (f.id === fieldId ? { ...f, status, isCompleted } : f))
                );
            } else {
                // For real fields, make API call to update database
            const response = await axios.put(`/api/fields/${fieldId}/status`, {
                status,
                is_completed: isCompleted,
            });

            if (response.data.success) {
                setFields((prev) =>
                    prev.map((f) => (f.id === fieldId ? { ...f, status, isCompleted } : f))
                );
                }
            }
        } catch (error) {
            console.error('Error updating field status:', error);
            alert('Error updating field status');
        }
    };

    const confirmDelete = async () => {
        if (!fieldToDelete) return;

        setDeleting(true);
        try {
            // Debug: Log the field ID type and value
            console.log('Field to delete:', {
                id: fieldToDelete.id,
                idType: typeof fieldToDelete.id,
                field: fieldToDelete,
            });

            // Convert ID to string and check if this is a mock field (ID starts with 'mock-')
            const fieldId = String(fieldToDelete.id);
            if (fieldId.startsWith('mock-')) {
                // For mock fields, just remove from frontend state
                console.log('Deleting mock field:', fieldId);
                setFields((prev) => prev.filter((f) => f.id !== fieldToDelete.id));
                setShowDeleteConfirm(false);
                setFieldToDelete(null);
            } else {
                // For real fields, make API call to delete from database
                console.log('Making API call to delete field:', fieldToDelete.id);
                console.log('Axios config:', {
                    headers: axios.defaults.headers.common,
                    withCredentials: axios.defaults.withCredentials,
                });
            const response = await axios.delete(`/api/fields/${fieldToDelete.id}`);
                console.log('Delete response:', response.data);
                console.log('Response status:', response.status);

            if (response.data.success) {
                    console.log('Field deleted successfully, updating UI');
                // Remove the field from the list
                setFields((prev) => prev.filter((f) => f.id !== fieldToDelete.id));
                setShowDeleteConfirm(false);
                setFieldToDelete(null);
            } else {
                    console.error('Backend returned success: false');
                alert('Failed to delete field');
            }
            }
        } catch (error: any) {
            console.error('Error deleting field:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);

            // Check if it's a CSRF token error
            if (error.response?.status === 419) {
                console.log('CSRF token error, attempting to refresh token and retry');
                try {
                    await refreshCsrfToken();
                    // Retry the delete request
                    const retryResponse = await axios.delete(`/api/fields/${fieldToDelete.id}`);
                    if (retryResponse.data.success) {
                        console.log('Field deleted successfully on retry');
                        setFields((prev) => prev.filter((f) => f.id !== fieldToDelete.id));
                        setShowDeleteConfirm(false);
                        setFieldToDelete(null);
                        return;
                    }
                } catch (retryError: any) {
                    console.error('Retry failed:', retryError);
                }
            }

            // Check if the field was actually deleted despite the error
            if (error.response?.status === 200 || error.response?.status === 204) {
                console.log('Field was deleted despite error, updating UI');
                setFields((prev) => prev.filter((f) => f.id !== fieldToDelete.id));
                setShowDeleteConfirm(false);
                setFieldToDelete(null);
            } else {
            alert('Error deleting field');
            }
        } finally {
            setDeleting(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setFieldToDelete(null);
    };

    // Folder management functions
    const handleCreateFolder = async (
        folderData: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
        try {
            const response = await axios.post('/folders-api', folderData);
            if (response.data.success) {
                // Use the folder returned from the API with the real database ID
                setFolders((prev) => [...prev, response.data.folder]);
            }
        } catch (error) {
            console.error('Error creating folder:', error);
            alert('Error creating folder');
        }
    };

    const handleCreateSubFolder = (parentFolder: Folder) => {
        setParentFolderForModal(parentFolder);
        setShowCreateFolderModal(true);
    };

    const handleEditFolder = (folder: Folder) => {
        setFolderToEdit(folder);
        setShowEditFolderModal(true);
    };

    const handleSaveFolder = async (folderId: string, updates: Partial<Folder>) => {
        try {
            const response = await axios.put(`/api/folders/${folderId}`, updates);
            if (response.data.success) {
                setFolders((prev) =>
                    prev.map((f) => (f.id === folderId ? { ...f, ...updates } : f))
                );
                setShowEditFolderModal(false);
                setFolderToEdit(null);
            }
        } catch (error) {
            console.error('Error updating folder:', error);
            alert('Error updating folder');
        }
    };

    const handleDeleteFolder = (folder: Folder) => {
        setFolderToDelete(folder);
        setShowFolderDeleteConfirm(true);
    };

    const confirmFolderDelete = async () => {
        if (!folderToDelete) return;

        try {
            console.log('Attempting to delete folder:', folderToDelete);
            console.log('CSRF Token:', axios.defaults.headers.common['X-CSRF-TOKEN']);
            console.log('Axios config:', {
                headers: axios.defaults.headers.common,
                withCredentials: axios.defaults.withCredentials,
            });
            const response = await axios.post(`/folders-api/${folderToDelete.id}/delete`);
            console.log('Delete folder response:', response.data);

            if (response.data.success) {
                // Move fields to uncategorized folder
                setFields((prev) =>
                    prev.map((f) =>
                        f.folderId === folderToDelete.id ? { ...f, folderId: 'uncategorized' } : f
                    )
                );

                // Remove folder and all its sub-folders
                setFolders((prev) =>
                    prev.filter(
                        (f) => f.id !== folderToDelete.id && f.parent_id !== folderToDelete.id
                    )
                );
                setShowFolderDeleteConfirm(false);
                setFolderToDelete(null);

                // If we were viewing the deleted folder, go back to all
                if (selectedFolder?.id === folderToDelete.id) {
                    setSelectedFolder(null);
                }
            }
        } catch (error: any) {
            console.error('Error deleting folder:', error);
            console.error('Error details:', error.response?.data);
            alert('Error deleting folder');
        }
    };

    const cancelFolderDelete = () => {
        setShowFolderDeleteConfirm(false);
        setFolderToDelete(null);
    };

    // Drag and drop functions
    const handleFieldDragStart = (field: Field) => {
        setDraggedField(field);
        setIsDragging(true);
    };

    const handleFieldDragEnd = () => {
        setDraggedField(null);
        setIsDragging(false);
    };

    const handleFolderDrop = async (targetFolderId: string | null) => {
        if (!draggedField) return;
        
        // If targetFolderId is null or "unassigned", remove the field from its current folder
        const newFolderId =
            targetFolderId === null || targetFolderId === 'unassigned' ? null : targetFolderId;
        
        if (draggedField.folderId !== newFolderId) {
            try {
                // Update field in backend
                const response = await axios.put(`/api/fields/${draggedField.id}/folder`, {
                    folder_id: newFolderId ? parseInt(newFolderId) : null,
                });

                if (response.data.success) {
                    console.log('Field moved successfully:', {
                        fieldId: draggedField.id,
                        oldFolderId: draggedField.folderId,
                        newFolderId: newFolderId,
                    });

                    // Update field in frontend
                    setFields((prev) =>
                        prev.map((f) =>
                            f.id === draggedField.id ? { ...f, folderId: newFolderId } : f
                        )
                    );
                }
            } catch (error: any) {
                console.error('Error moving field to folder:', error);
                console.error('Error details:', error.response?.data);

                // For mock fields, still update the frontend state even if backend fails
                const draggedFieldId = String(draggedField.id);
                if (draggedFieldId.startsWith('mock-')) {
                    console.log('Mock field - updating frontend state only');
                    setFields((prev) =>
                        prev.map((f) =>
                            f.id === draggedField.id ? { ...f, folderId: newFolderId } : f
                        )
                    );
                } else {
                    alert(
                        `Error moving field to folder: ${error.response?.data?.message || error.message}`
                    );
                }
            }
        }
    };

    const handleFolderSelect = (folder: Folder) => {
        setSelectedFolder(folder);
        setFolderHistory((prev) => [...prev, folder]);
    };





    const handleGoBack = () => {
        if (folderHistory.length > 0) {
            const newHistory = [...folderHistory];
            newHistory.pop(); // Remove current folder
            const parentFolder = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
            setSelectedFolder(parentFolder);
            setFolderHistory(newHistory);
        } else {
            setSelectedFolder(null);
            setFolderHistory([]);
        }
    };

    const handleGoHome = () => {
        setSelectedFolder(null);
        setFolderHistory([]);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900">
                <div className="text-xl text-white">{t('loading')}</div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1">
                <div className="p-6">
                    <div className="mx-auto max-w-7xl">
                        {/* Main Content Header */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-white">
                                        {t('water_management_system')}
                                    </h1>
                                    <p className="mt-2 text-gray-400">
                                        {t('manage_irrigation_fields')}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowCreateFolderModal(true)}
                                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition-colors duration-200 hover:bg-green-700"
                                    >
                                        <FaPlus className="h-4 w-4" />
                                        {t('create_folder')}
                                    </button>

                                    <button
                                        onClick={handleAddField}
                                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors duration-200 hover:bg-blue-700"
                                    >
                                        <svg
                                            className="h-5 w-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 4v16m8-8H4"
                                            />
                                        </svg>
                                        {t('add_field')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Folder Navigation */}
                        <div className="mb-6">
                            {selectedFolder && (
                                <div className="flex items-center gap-2">
                                    <button
                                        className="flex items-center gap-2 text-blue-400 hover:underline"
                                        onClick={handleGoBack}
                                    >
                                        <FaArrowLeft /> 
                                        {folderHistory.length > 0 ? 'Back' : t('all_folders')}
                                    </button>
                                    
                                    {/* Breadcrumb */}
                                    {folderHistory.length > 0 && (
                                        <div 
                                            className={`flex items-center gap-2 text-gray-400 ${
                                                isDragging
                                                    ? 'rounded border-2 border-dashed border-blue-500 bg-blue-500/10 p-2'
                                                    : ''
                                            }`}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.currentTarget.classList.add(
                                                    'border-2',
                                                    'border-dashed',
                                                    'border-blue-500',
                                                    'bg-blue-500/10',
                                                    'rounded',
                                                    'p-2'
                                                );
                                            }}
                                            onDragLeave={(e) => {
                                                e.currentTarget.classList.remove(
                                                    'border-2',
                                                    'border-dashed',
                                                    'border-blue-500',
                                                    'bg-blue-500/10',
                                                    'rounded',
                                                    'p-2'
                                                );
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.currentTarget.classList.remove(
                                                    'border-2',
                                                    'border-dashed',
                                                    'border-blue-500',
                                                    'bg-blue-500/10',
                                                    'rounded',
                                                    'p-2'
                                                );
                                                // Move field to parent folder, or make unassigned if at root level
                                                const parentFolder =
                                                    folderHistory.length > 1
                                                        ? folderHistory[folderHistory.length - 2]
                                                        : null;
                                                if (parentFolder) {
                                                    handleFolderDrop(parentFolder.id);
                                                } else {
                                                    // At root level, make field unassigned
                                                    handleFolderDrop(null);
                                                }
                                            }}
                                        >
                                            {isDragging && (
                                                <span className="mr-2 text-xs text-blue-400">
                                                    {folderHistory.length > 1 
                                                        ? 'Drop here to move to parent folder' 
                                                        : 'Drop here to make unassigned'}
                                                </span>
                                            )}
                                            <button
                                                className="hover:text-white hover:underline"
                                                onClick={handleGoHome}
                                            >
                                                Home
                                            </button>
                                            <span>/</span>
                                            {folderHistory.map((folder, index) => (
                                                <div
                                                    key={folder.id}
                                                    className="flex items-center gap-2"
                                                >
                                                    <button
                                                        className="hover:text-white hover:underline"
                                                        onClick={() => {
                                                            const newHistory = folderHistory.slice(
                                                                0,
                                                                index + 1
                                                            );
                                                            setFolderHistory(newHistory);
                                                            setSelectedFolder(folder);
                                                        }}
                                                    >
                                                        {folder.name}
                                                    </button>
                                                    {index < folderHistory.length - 1 && (
                                                        <span>/</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        {!selectedFolder ? (
                            // Show all folders and category folders
                            <div>
                                <div className="mb-6 flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-white">
                                        {t('folders')}
                                    </h2>
                                    <div className="text-sm text-gray-400">
                                        {t('click_folder_view')}
                                    </div>
                                </div>
                                
                                {/* System Folders */}
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {getAllFolders().map((folder) => (
                                        <FolderCard
                                            key={folder.id}
                                            folder={folder}
                                            fieldCount={getFieldCountForFolder(folder)}
                                            onSelect={handleFolderSelect}
                                            onEdit={folder.type === 'category' ? () => {} : handleEditFolder}
                                            onDelete={folder.type === 'category' ? () => {} : handleDeleteFolder}
                                            onDrop={handleFolderDrop}
                                            isSelected={false}
                                            t={t}
                                        />
                                    ))}
                                </div>



                                {/* Unassigned Fields Section */}
                                {(() => {
                                    const unassignedFields = fields.filter(
                                        (field) => !field.folderId
                                    );
                                    return unassignedFields.length > 0 ? (
                                        <div className="mt-8">
                                            <h3 className="mb-4 text-lg font-semibold text-white">
                                                Unassigned Fields ({unassignedFields.length})
                                            </h3>
                                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                                {unassignedFields.map((field) => (
                                                    <FieldCard
                                                        key={field.id}
                                                        field={field}
                                                        onSelect={handleFieldSelect}
                                                        onDelete={handleFieldDelete}
                                                        onStatusChange={handleFieldStatusChange}
                                                        onDragStart={handleFieldDragStart}
                                                        onDragEnd={handleFieldDragEnd}
                                                        isDragging={
                                                            isDragging &&
                                                            draggedField?.id === field.id
                                                        }
                                                        t={t}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ) : null;
                                })()}

                                {/* Homepage Drop Zone for Unassigned Fields */}
                                <div className="mt-8">
                                    <div
                                        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                                            isDragging
                                                ? 'border-blue-500 bg-blue-500/10'
                                                : 'border-gray-600 bg-gray-800/50'
                                        }`}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.classList.add(
                                                'border-blue-500',
                                                'bg-blue-500/10'
                                            );
                                        }}
                                        onDragLeave={(e) => {
                                            e.currentTarget.classList.remove(
                                                'border-blue-500',
                                                'bg-blue-500/10'
                                            );
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.classList.remove(
                                                'border-blue-500',
                                                'bg-blue-500/10'
                                            );
                                            handleFolderDrop(null);
                                        }}
                                    >
                                        <div className="text-gray-400">
                                            <svg
                                                className="mx-auto mb-2 h-8 w-8"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 4v16m8-8H4"
                                                />
                                            </svg>
                                            <p className="text-sm">
                                                Drop fields here to make them unassigned
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Show fields and sub-folders in selected folder
                            <div>
                                <div className="mb-6 flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-white">
                                        {selectedFolder.name} ({getCurrentFields().length})
                                    </h2>
                                    <div className="text-sm text-gray-400">
                                        {t('click_field_manage')}
                                    </div>
                                </div>

                                {/* Sub-folders Section */}
                                {(() => {
                                    const subFolders = folders.filter(
                                        (f) => f.parent_id === selectedFolder.id
                                    );
                                    
                                    return subFolders.length > 0 ? (
                                        <div className="mb-8">
                                            <h3 className="mb-4 text-lg font-semibold text-white">
                                                Sub-folders
                                            </h3>
                                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                                {subFolders.map((subFolder) => (
                                                    <FolderCard
                                                        key={subFolder.id}
                                                        folder={subFolder}
                                                        fieldCount={getFieldCountForFolder(
                                                            subFolder
                                                        )}
                                                        onSelect={handleFolderSelect}
                                                        onEdit={handleEditFolder}
                                                        onDelete={handleDeleteFolder}
                                                        onDrop={handleFolderDrop}
                                                        isSelected={false}
                                                        t={t}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ) : null;
                                })()}

                                {/* Category Sections */}
                                {(() => {
                                    const categorySections = plantCategories.map((category) => {
                                        const categoryFields = fields.filter((field) => {
                                            // Check if field is in this folder
                                            const isInFolder = field.folderId === selectedFolder.id;
                                            
                                            // Check if field matches this category
                                            const matchesCategory = field.category === category.id;
                                            
                                            // Special case: if no category is set, treat as horticulture (for existing fields)
                                            const isLegacyHorticulture = !field.category && category.id === 'horticulture';
                                            
                                            return isInFolder && (matchesCategory || isLegacyHorticulture);
                                        });
                                        
                                        // Debug logging
                                        console.log(`🔍 Category ${category.name} (${category.id}):`, {
                                            totalFields: fields.length,
                                            categoryFields: categoryFields.length,
                                            fieldsInFolder: fields.filter(f => f.folderId === selectedFolder.id).length,
                                            sampleField: fields.find(f => f.folderId === selectedFolder.id)
                                        });
                                        
                                        return { category, fields: categoryFields };
                                    });
                                    
                                    const hasAnyCategoryFields = categorySections.some(section => section.fields.length > 0);
                                    
                                    return hasAnyCategoryFields ? (
                                        <div className="mb-8">
                                        <h3 className="mb-4 text-lg font-semibold text-white">
                                                {t('project_categories')}
                                            </h3>
                                            <div className="space-y-6">
                                                {categorySections.map(({ category, fields }) => {
                                                    if (fields.length === 0) return null;
                                                    
                                                    return (
                                                        <div key={category.id} className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                                                            <div className="mb-4 flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-2xl">{category.icon}</span>
                                                                    <h4 className="text-lg font-semibold text-white">
                                                                        {category.name} ({fields.length})
                                                                    </h4>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                                {fields.map((field) => (
                                                                    <FieldCard
                                                                        key={field.id}
                                                                        field={field}
                                                                        onSelect={handleFieldSelect}
                                                                        onDelete={handleFieldDelete}
                                                                        onStatusChange={handleFieldStatusChange}
                                                                        onDragStart={handleFieldDragStart}
                                                                        onDragEnd={handleFieldDragEnd}
                                                                        isDragging={
                                                                            isDragging && draggedField?.id === field.id
                                                                        }
                                                                        t={t}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : null;
                                })()}

                                {/* Uncategorized Fields Section */}
                                {(() => {
                                    const uncategorizedFields = getCurrentFields().filter(field => {
                                        // Check if field has a category
                                        const hasCategory = field.category && field.category !== '';
                                        // Check if field is not in any category section
                                        const isInCategorySection = plantCategories.some(category => {
                                            const matchesCategory = field.category === category.id;
                                            const isLegacyHorticulture = !field.category && category.id === 'horticulture';
                                            return matchesCategory || isLegacyHorticulture;
                                        });
                                        
                                        return !hasCategory && !isInCategorySection;
                                    });
                                    
                                    return uncategorizedFields.length > 0 ? (
                                        <div className="mb-8">
                                            <h3 className="mb-4 text-lg font-semibold text-white">
                                                Uncategorized Fields ({uncategorizedFields.length})
                                        </h3>
                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                                {uncategorizedFields.map((field) => (
                                                <FieldCard
                                                    key={field.id}
                                                    field={field}
                                                    onSelect={handleFieldSelect}
                                                    onDelete={handleFieldDelete}
                                                    onStatusChange={handleFieldStatusChange}
                                                    onDragStart={handleFieldDragStart}
                                                    onDragEnd={handleFieldDragEnd}
                                                    isDragging={
                                                        isDragging && draggedField?.id === field.id
                                                    }
                                                    t={t}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    ) : null;
                                })()}

                                {/* Create Sub-folder Button */}
                                <div className="mt-6">
                                    <button
                                        onClick={() => handleCreateSubFolder(selectedFolder)}
                                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors duration-200 hover:bg-blue-700"
                                    >
                                        <FaPlus className="h-4 w-4" />
                                        Create Sub-folder in "{selectedFolder.name}"
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />

            {/* Modals */}
            <CategorySelectionModal
                isOpen={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                onSelectCategory={handleCategorySelect}
                plantCategories={plantCategories}
                t={t}
            />

            <CreateFolderModal
                isOpen={showCreateFolderModal}
                onClose={() => {
                    setShowCreateFolderModal(false);
                    setParentFolderForModal(null);
                }}
                onCreate={handleCreateFolder}
                parentFolder={parentFolderForModal}
                t={t}
            />

            <EditFolderModal
                isOpen={showEditFolderModal}
                onClose={() => {
                    setShowEditFolderModal(false);
                    setFolderToEdit(null);
                }}
                onSave={handleSaveFolder}
                folder={folderToEdit}
                t={t}
            />

            {/* Delete Field Confirmation Dialog */}
            {showDeleteConfirm && fieldToDelete && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
                    <div className="relative z-[10000] mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
                        <div className="mb-4 flex items-center">
                            <div className="flex-shrink-0">
                                <svg
                                    className="h-6 w-6 text-red-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-lg font-medium text-white">
                                    {t('delete_field')}
                                </h3>
                            </div>
                        </div>
                        <div className="mb-6">
                            <p className="text-gray-300">
                                {t('delete_confirm')}{' '}
                                <span className="font-semibold text-white">
                                    "{fieldToDelete.name}"
                                </span>
                                ?
                            </p>
                            <p className="mt-2 text-sm text-gray-400">{t('delete_warning')}</p>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={cancelDelete}
                                disabled={deleting}
                                className="rounded px-4 py-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-50"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="flex items-center rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? (
                                    <>
                                        <svg
                                            className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                                            xmlns="http://www.w3.org/2000/svg"
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
                                        {t('deleting')}
                                    </>
                                ) : (
                                    t('delete_field')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Folder Confirmation Dialog */}
            {showFolderDeleteConfirm && folderToDelete && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
                    <div className="relative z-[10000] mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
                        <div className="mb-4 flex items-center">
                            <div className="flex-shrink-0">
                                <svg
                                    className="h-6 w-6 text-red-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-lg font-medium text-white">
                                    {t('delete_folder')}
                                </h3>
                            </div>
                        </div>
                        <div className="mb-6">
                            <p className="text-gray-300">
                                {t('delete_folder_confirm')}{' '}
                                <span className="font-semibold text-white">
                                    "{folderToDelete.name}"
                                </span>
                                ?
                            </p>
                            <p className="mt-2 text-sm text-gray-400">
                                {t('delete_folder_warning')}
                            </p>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={cancelFolderDelete}
                                className="rounded px-4 py-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={confirmFolderDelete}
                                className="flex items-center rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                            >
                                {t('delete_folder')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
