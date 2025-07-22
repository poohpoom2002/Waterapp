import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { FaFolder, FaFolderOpen, FaArrowLeft } from 'react-icons/fa';

// Types
type Field = {
    id: string;
    name: string;
    customerName?: string;
    userName?: string;
    category?: string;
    area: Array<{ lat: number; lng: number }>;
    plantType: {
        id: number;
        name: string;
        type: string;
        plant_spacing: number;
        row_spacing: number;
        water_needed: number;
    };
    totalPlants: number;
    totalArea: number;
    createdAt: string;
    layers?: Array<{
        type: string;
        coordinates: Array<{ lat: number; lng: number }>;
        isInitialMap?: boolean;
    }>;
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
        route: '/greenhouse/planner',
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
        route: '/field-crop/planner',
        features: [
            t('large_scale_planning'),
            t('crop_rotation'),
            t('efficient_distribution'),
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
    t,
}: {
    field: Field;
    onSelect: (field: Field) => void;
    onDelete: (fieldId: string) => void;
    t: (key: string) => string;
}) => {
    const getCategoryDisplay = (category: string) => {
        switch (category) {
            case 'horticulture':
                return { name: 'พืชสวน', icon: '🌳', color: 'text-green-400' };
            case 'home-garden':
                return { name: 'สวนบ้าน', icon: '🏡', color: 'text-blue-400' };
            case 'greenhouse':
                return { name: 'โรงเรือน', icon: '🌱', color: 'text-purple-400' };
            case 'field-crop':
                return { name: 'พืชไร่', icon: '🌾', color: 'text-yellow-400' };
            default:
                return { name: 'พืชสวน', icon: '🌳', color: 'text-green-400' };
        }
    };

    const categoryInfo = getCategoryDisplay(field.category || 'horticulture');

    return (
        <div
            className="cursor-pointer rounded-lg border border-gray-700 bg-gray-800 p-4 transition-colors hover:border-gray-600"
            onClick={() => onSelect(field)}
        >
            <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{field.name}</h3>
                    <div className="mt-2 flex items-center gap-2">
                        <span className={`text-sm ${categoryInfo.color}`}>
                            {categoryInfo.icon} {categoryInfo.name}
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                        <div>{new Date(field.createdAt).toLocaleDateString('th-TH')}</div>
                        {field.customerName && (
                            <div className="text-blue-300">ลูกค้า: {field.customerName}</div>
                        )}
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(field.id);
                    }}
                    className="ml-2 rounded p-1 text-red-400 transition-colors hover:bg-red-900/20 hover:text-red-300"
                    title="Delete field"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                    </svg>
                </button>
            </div>

            <div className="mt-3 border-t border-gray-700 pt-3">
                <div className="h-32 overflow-hidden rounded bg-gray-900">
                    <MapContainer
                        center={DEFAULT_CENTER}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                        scrollWheelZoom={false}
                        dragging={false}
                        doubleClickZoom={false}
                        boxZoom={false}
                        keyboard={false}
                        touchZoom={false}
                        attributionControl={false}
                    >
                        <TileLayer
                            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                            attribution=""
                            maxZoom={25}
                        />
                        <MapBounds positions={field.area} />
                        <Polygon
                            positions={field.area.map((coord) => [coord.lat, coord.lng])}
                            pathOptions={{
                                color: '#22C55E',
                                fillColor: '#22C55E',
                                fillOpacity: 0.3,
                                weight: 2,
                            }}
                        />
                        {field.layers?.map((layer, index) => {
                            if (!layer.isInitialMap) {
                                const styleMap: Record<
                                    string,
                                    { color: string; fillOpacity: number }
                                > = {
                                    river: { color: '#3B82F6', fillOpacity: 0.3 },
                                    powerplant: { color: '#EF4444', fillOpacity: 0.3 },
                                    building: { color: '#F59E0B', fillOpacity: 0.3 },
                                    pump: { color: '#1E40AF', fillOpacity: 0.3 },
                                    custompolygon: { color: '#4B5563', fillOpacity: 0.3 },
                                    solarcell: { color: '#FFD600', fillOpacity: 0.3 },
                                };

                                const style = styleMap[layer.type] || styleMap.custompolygon;

                                return (
                                    <Polygon
                                        key={`layer-${index}`}
                                        positions={layer.coordinates.map((coord) => [
                                            coord.lat,
                                            coord.lng,
                                        ])}
                                        pathOptions={{
                                            ...style,
                                            fillColor: style.color,
                                            weight: 2,
                                        }}
                                    />
                                );
                            }
                            return null;
                        })}
                    </MapContainer>
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
                <div>
                    <h3 className="text-xl font-bold text-white">{category.name}</h3>
                    <p className="text-sm text-white/80">{category.description}</p>
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

export default function Home() {
    const { t } = useLanguage();
    const page = usePage();
    const auth = (page.props as any).auth;
    const [fields, setFields] = useState<Field[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [fieldToDelete, setFieldToDelete] = useState<Field | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const plantCategories = getPlantCategories(t);

    // Group fields by customer and then by category
    const groupedFields = fields.reduce((acc, field) => {
        const customer = field.customerName || 'Unknown';
        const category = field.category || 'Unknown';
        if (!acc[customer]) acc[customer] = {};
        if (!acc[customer][category]) acc[customer][category] = [];
        acc[customer][category].push(field);
        return acc;
    }, {} as Record<string, Record<string, Field[]>>);

    useEffect(() => {
        // Load saved fields from database
        const fetchFields = async () => {
            try {
                const response = await axios.get('/api/fields');
                if (response.data.fields) {
                    setFields(response.data.fields);
                }
            } catch (error) {
                console.error('Error fetching fields:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFields();
    }, []);

    const handleAddField = () => {
        setShowCategoryModal(true);
    };

    const handleCategorySelect = (category: PlantCategory) => {
        setShowCategoryModal(false);
        // Clear any saved data when starting a new project
        localStorage.removeItem('horticultureIrrigationData');
        localStorage.removeItem('editingFieldId'); // Clear editing field ID for new projects
        router.visit(category.route);
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

            // Prepare the data in the same format as map-planner
            const params = new URLSearchParams({
                area: JSON.stringify(field.area),
                areaType: '',
                plantType: JSON.stringify(field.plantType),
                layers: JSON.stringify(field.layers || []),
                fieldId: field.id, // Add field ID for editing
            });

            // Navigate to horticulture planner with URL parameters
            router.visit(`/horticulture/planner?${params.toString()}`);
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

    const confirmDelete = async () => {
        if (!fieldToDelete) return;

        setDeleting(true);
        try {
            const response = await axios.delete(`/api/fields/${fieldToDelete.id}`);
            if (response.data.success) {
                // Remove the field from the list
                setFields((prev) => prev.filter((f) => f.id !== fieldToDelete.id));
                setShowDeleteConfirm(false);
                setFieldToDelete(null);
            } else {
                alert('Failed to delete field');
            }
        } catch (error) {
            console.error('Error deleting field:', error);
            alert('Error deleting field');
        } finally {
            setDeleting(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setFieldToDelete(null);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900">
                <div className="text-xl text-white">{t('loading')}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-900">
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

                        {/* Folder Navigation */}
                        <div className="mb-6">
                            {(selectedCustomer || selectedCategory) && (
                                <button
                                    className="mb-2 flex items-center gap-2 text-blue-400 hover:underline"
                                    onClick={() => {
                                        if (selectedCategory) {
                                            setSelectedCategory(null);
                                        } else {
                                            setSelectedCustomer(null);
                                        }
                                    }}
                                >
                                    <FaArrowLeft /> {selectedCategory ? selectedCustomer : t('all_customers')}
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        {!selectedCustomer ? (
                            // Show customer folders
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {Object.keys(groupedFields).map((customer) => (
                                    <div
                                        key={customer}
                                        className="cursor-pointer rounded-lg border border-gray-700 bg-gray-800 p-6 hover:border-blue-500 hover:bg-blue-900/10"
                                        onClick={() => setSelectedCustomer(customer)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <FaFolder className="text-yellow-400 text-2xl" />
                                            <span className="text-lg font-semibold text-white">{customer}</span>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-400">
                                            {Object.values(groupedFields[customer]).reduce((sum, arr) => sum + arr.length, 0)} {t('fields')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : !selectedCategory ? (
                            // Show category folders for selected customer
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {Object.keys(groupedFields[selectedCustomer]).map((category) => (
                                    <div
                                        key={category}
                                        className="cursor-pointer rounded-lg border border-gray-700 bg-gray-800 p-6 hover:border-green-500 hover:bg-green-900/10"
                                        onClick={() => setSelectedCategory(category)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <FaFolderOpen className="text-green-400 text-2xl" />
                                            <span className="text-lg font-semibold text-white">{category}</span>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-400">
                                            {groupedFields[selectedCustomer][category].length} {t('fields')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Show fields for selected customer and category
                            <div>
                                <div className="mb-6 flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-white">
                                        {selectedCustomer} / {selectedCategory} ({groupedFields[selectedCustomer][selectedCategory].length})
                                    </h2>
                                    <div className="text-sm text-gray-400">
                                        {t('click_field_manage')}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {groupedFields[selectedCustomer][selectedCategory].map((field) => (
                                        <FieldCard
                                            key={field.id}
                                            field={field}
                                            onSelect={handleFieldSelect}
                                            onDelete={handleFieldDelete}
                                            t={t}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
            {/* Category Selection Modal */}
            <CategorySelectionModal
                isOpen={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                onSelectCategory={handleCategorySelect}
                plantCategories={plantCategories}
                t={t}
            />
            {/* Delete Confirmation Dialog */}
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
        </div>
    );
}
