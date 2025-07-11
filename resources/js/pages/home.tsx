import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Footer from '../components/Footer';

// Types
type Field = {
    id: string;
    name: string;
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
            t('comprehensive_stats')
        ]
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
            t('residential_focus')
        ]
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
            t('environmental_monitoring')
        ]
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
            t('yield_optimization')
        ]
    }
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

const FieldCard = ({ field, onSelect, onDelete, t }: { 
    field: Field; 
    onSelect: (field: Field) => void;
    onDelete: (fieldId: string) => void;
    t: (key: string) => string;
}) => {
    const calculateAreaInRai = (coordinates: Array<{ lat: number; lng: number }>): number => {
        if (coordinates.length < 3) return 0;

        const toMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
            const R = 6371000;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                     Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        };

        let area = 0;
        for (let i = 0; i < coordinates.length; i++) {
            const j = (i + 1) % coordinates.length;
            area += coordinates[i].lat * coordinates[j].lng;
            area -= coordinates[j].lat * coordinates[i].lng;
        }
        area = Math.abs(area) / 2;

        const areaInSquareMeters = area * 111000 * 111000 * Math.cos(coordinates[0].lat * Math.PI / 180);
        return areaInSquareMeters / 1600;
    };

    const areaInRai = calculateAreaInRai(field.area);
    const totalWaterNeed = field.totalPlants * field.plantType.water_needed;

    return (
        <div 
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
            onClick={() => onSelect(field)}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{field.name}</h3>
                    <span className="text-xs text-gray-400">
                        {new Date(field.createdAt).toLocaleDateString()}
                    </span>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(field.id);
                    }}
                    className="ml-2 p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                    title="Delete field"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
            
            <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                            <span className="text-gray-400">{t('plant_type')}:</span>
                            <span className="text-white">{field.plantType.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">{t('area')}:</span>
                            <span className="text-white">{areaInRai.toFixed(2)} rai</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">{t('plants')}:</span>
                            <span className="text-white">{field.totalPlants}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">{t('water_need')}:</span>
                            <span className="text-white">{totalWaterNeed.toFixed(2)} L/day</span>
                        </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="h-32 rounded bg-gray-900 overflow-hidden">
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
                            positions={field.area.map(coord => [coord.lat, coord.lng])}
                            pathOptions={{
                                color: '#22C55E',
                                fillColor: '#22C55E',
                                fillOpacity: 0.3,
                                weight: 2
                            }}
                        />
                        {field.layers?.map((layer, index) => {
                            if (!layer.isInitialMap) {
                                const styleMap: Record<string, { color: string; fillOpacity: number }> = {
                                    river: { color: '#3B82F6', fillOpacity: 0.3 },
                                    powerplant: { color: '#EF4444', fillOpacity: 0.3 },
                                    building: { color: '#F59E0B', fillOpacity: 0.3 },
                                    pump: { color: '#1E40AF', fillOpacity: 0.3 },
                                    custompolygon: { color: '#4B5563', fillOpacity: 0.3 },
                                    solarcell: { color: '#FFD600', fillOpacity: 0.3 }
                                };

                                const style = styleMap[layer.type] || styleMap.custompolygon;

                                return (
                                    <Polygon
                                        key={`layer-${index}`}
                                        positions={layer.coordinates.map(coord => [coord.lat, coord.lng])}
                                        pathOptions={{
                                            ...style,
                                            fillColor: style.color,
                                            weight: 2
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

const CategoryCard = ({ category, onSelect, t }: { 
    category: PlantCategory; 
    onSelect: (category: PlantCategory) => void;
    t: (key: string) => string;
}) => {
    return (
        <div 
            className={`bg-gradient-to-br ${category.color} rounded-xl p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
            onClick={() => onSelect(category)}
        >
            <div className="flex items-center mb-4">
                <div className="text-4xl mr-4">{category.icon}</div>
                <div>
                    <h3 className="text-xl font-bold text-white">{category.name}</h3>
                    <p className="text-white/80 text-sm">{category.description}</p>
                </div>
            </div>
            
            <div className="space-y-2">
                {category.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-white/90 text-sm">
                        <svg className="w-4 h-4 mr-2 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                    </div>
                ))}
            </div>
            
            <div className="mt-6 flex items-center justify-between">
                <span className="text-white/80 text-sm">{t('click_start_planning')}</span>
                <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </div>
    );
};

const CategorySelectionModal = ({ isOpen, onClose, onSelectCategory, plantCategories, t }: {
    isOpen: boolean;
    onClose: () => void;
    onSelectCategory: (category: PlantCategory) => void;
    plantCategories: PlantCategory[];
    t: (key: string) => string;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto relative z-[10000]">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {t('choose_irrigation_category')}
                        </h2>
                        <p className="text-gray-400">
                            {t('select_irrigation_type')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
    const [fields, setFields] = useState<Field[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [fieldToDelete, setFieldToDelete] = useState<Field | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    
    const plantCategories = getPlantCategories(t);

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
        router.visit(category.route);
    };

    const handleFieldSelect = (field: Field) => {
        // Prepare the data in the same format as map-planner
        const params = new URLSearchParams({
            area: JSON.stringify(field.area),
            areaType: '',
            plantType: JSON.stringify(field.plantType),
            layers: JSON.stringify(field.layers || []),
            fieldId: field.id // Add field ID for editing
        });
        
                        // Navigate to horticulture planner with URL parameters
                router.visit(`/horticulture/planner?${params.toString()}`);
    };

    const handleFieldDelete = (fieldId: string) => {
        const field = fields.find(f => f.id === fieldId);
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
                setFields(prev => prev.filter(f => f.id !== fieldToDelete.id));
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
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">{t('loading')}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">{t('water_management_system')}</h1>
                        <p className="text-gray-400 mt-2">{t('manage_irrigation_fields')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <LanguageSwitcher />
                        <button
                            onClick={handleAddField}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t('add_field')}
                        </button>
                    </div>
                </div>

                {/* Content */}
                {fields.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">🌾</div>
                        <h2 className="text-2xl font-semibold text-white mb-2">{t('no_fields_yet')}</h2>
                        <p className="text-gray-400 mb-6">{t('start_first_field')}</p>
                        <button
                            onClick={handleAddField}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200"
                        >
                            {t('create_first_field')}
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-white">{t('your_fields')} ({fields.length})</h2>
                            <div className="text-sm text-gray-400">
                                {t('click_field_manage')}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {fields.map((field) => (
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

            {/* Footer */}
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 relative z-[10000]">
                        <div className="flex items-center mb-4">
                            <div className="flex-shrink-0">
                                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-lg font-medium text-white">{t('delete_field')}</h3>
                            </div>
                        </div>
                        <div className="mb-6">
                            <p className="text-gray-300">
                                {t('delete_confirm')} <span className="font-semibold text-white">"{fieldToDelete.name}"</span>?
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                                {t('delete_warning')}
                            </p>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={cancelDelete}
                                disabled={deleting}
                                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 flex items-center"
                            >
                                {deleting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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