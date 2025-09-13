// resources/js/pages/product.tsx
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { IrrigationInput, QuotationData, QuotationDataCustomer } from './types/interfaces';
import { useCalculations, ZoneCalculationData } from './hooks/useCalculations';
import { calculatePipeRolls, formatNumber } from './utils/calculations';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';
import { refreshCsrfToken } from '../bootstrap';

// Removed old imports from horticultureProjectStats and horticultureUtils
// Will use data directly from HorticultureResultsPage.tsx via localStorage

// Define minimal interfaces we need
interface HorticultureProject {
    projectName: string;
    customerName?: string;
    totalArea: number;
    mainArea?: any[];
    pump?: any;
    zones: Zone[];
    mainPipes?: MainPipe[];
    subMainPipes?: SubMainPipe[];
    plants: any[];
    useZones: boolean;
    irrigationZones?: any[];
    selectedPlantType?: any;
    exclusionAreas?: any[];
    createdAt?: string;
    updatedAt?: string;
}

interface Zone {
    id: string;
    name: string;
    plantCount: number;
    area: number;
    plantData?: any;
}

interface MainPipe {
    id: string;
    toZone: string;
    length?: number;
}

interface SubMainPipe {
    id: string;
    zoneId: string;
    length?: number;
    branchPipes?: any[];
}

import { loadGardenData, GardenPlannerData, GardenZone } from '../utils/homeGardenData';
import { calculateGardenStatistics, GardenStatistics } from '../utils/gardenStatistics';

import {
    getEnhancedFieldCropData,
    migrateToEnhancedFieldCropData,
    FieldCropData,
    calculateEnhancedFieldStats,
} from '../utils/fieldCropData';

import {
    getGreenhouseData,
    migrateLegacyGreenhouseData,
    GreenhousePlanningData,
    EnhancedPlotStats,
    PIXELS_PER_METER,
} from '../utils/greenHouseData';

import { getCropByValue } from './utils/cropData';

import InputForm from './components/InputForm';
import CalculationSummary from './components/CalculationSummary';
import SprinklerSelector from './components/SprinklerSelector';
import PumpSelector from './components/PumpSelector';
import PipeSelector from './components/PipeSelector';
import PipeSystemSummary from './components/PipeSystemSummary';
import CostSummary from './components/CostSummary';
import QuotationModal from './components/QuotationModal';
import QuotationDocument from './components/QuotationDocument';

import { router } from '@inertiajs/react';

type ProjectMode = 'horticulture' | 'garden' | 'field-crop' | 'greenhouse';

interface ZoneOperationGroup {
    id: string;
    zones: string[];
    order: number;
    label: string;
}

const getStoredProjectImage = async (projectMode: ProjectMode): Promise<string | null> => {
    // First check localStorage for backward compatibility
    const imageKeys = ['projectMapImage', `${projectMode}PlanImage`, 'mapCaptureImage'];

    if (projectMode === 'field-crop') {
        imageKeys.push('fieldCropPlanImage');
    } else if (projectMode === 'garden') {
        imageKeys.push('gardenPlanImage', 'homeGardenPlanImage');
    } else if (projectMode === 'greenhouse') {
        imageKeys.push('greenhousePlanImage');
    } else if (projectMode === 'horticulture') {
        imageKeys.push('horticulturePlanImage');
    }

    for (const key of imageKeys) {
        const image = localStorage.getItem(key);
        if (image && image.startsWith('data:image/')) {

            try {
                const metadata = localStorage.getItem('projectMapMetadata');
                if (metadata) {
                    const parsedMetadata = JSON.parse(metadata);
                }
            } catch (error) {
                console.warn('⚠️ Could not parse image metadata:', error);
            }

            return image;
        }
    }

    // If no image in localStorage, try to get from database
    const currentFieldId = localStorage.getItem('currentFieldId');
    if (currentFieldId && !currentFieldId.startsWith('mock-')) {
        try {
            console.log(`🔍 Attempting to load image from database for field: ${currentFieldId}`);
            const response = await axios.get(`/api/fields/${currentFieldId}/image`);
            
            if (response.data.success && response.data.project_image) {
                console.log(`✅ Found project image in database for field: ${currentFieldId}`);
                return response.data.project_image;
            } else {
                console.log(`ℹ️ No image found in database for field: ${currentFieldId}`);
            }
        } catch (error) {
            console.warn(`⚠️ Failed to load image from database for field ${currentFieldId}:`, error);
        }
    }

    console.warn(`⚠️ No project image found for mode: ${projectMode}`);
    return null;
};

const validateImageData = (imageData: string): boolean => {
    if (!imageData || !imageData.startsWith('data:image/')) {
        return false;
    }

    if (imageData.length < 1000) {
        console.warn('⚠️ Image data appears to be too small');
        return false;
    }

    return true;
};

const cleanupOldImages = (): void => {
    const imageKeys = [
        'projectMapImage',
        'fieldCropPlanImage',
        'gardenPlanImage',
        'homeGardenPlanImage',
        'greenhousePlanImage',
        'horticulturePlanImage',
        'mapCaptureImage',
    ];

    let cleanedCount = 0;
    imageKeys.forEach((key) => {
        const image = localStorage.getItem(key);
        if (image && image.startsWith('blob:')) {
            URL.revokeObjectURL(image);
            localStorage.removeItem(key);
            cleanedCount++;
        }
    });

};

export default function Product() {
    const [projectMode, setProjectMode] = useState<ProjectMode>('horticulture');
    const [gardenData, setGardenData] = useState<GardenPlannerData | null>(null);
    const [gardenStats, setGardenStats] = useState<GardenStatistics | null>(null);

    const [fieldCropData, setFieldCropData] = useState<FieldCropData | null>(null);

    const [greenhouseData, setGreenhouseData] = useState<GreenhousePlanningData | null>(null);

    const [projectData, setProjectData] = useState<HorticultureProject | null>(null);
    const [projectStats, setProjectStats] = useState<any>(null);
    const [activeZoneId, setActiveZoneId] = useState<string>('');
    const [zoneInputs, setZoneInputs] = useState<{ [zoneId: string]: IrrigationInput }>({});
    const [zoneSprinklers, setZoneSprinklers] = useState<{ [zoneId: string]: any }>({});
    const [horticultureSystemData, setHorticultureSystemData] = useState<any>(null);

    const [zoneOperationMode, setZoneOperationMode] = useState<
        'sequential' | 'simultaneous' | 'custom'
    >('sequential');
    const [zoneOperationGroups, setZoneOperationGroups] = useState<ZoneOperationGroup[]>([]);

    const { t } = useLanguage();

    const [selectedPipes, setSelectedPipes] = useState<{
        [zoneId: string]: {
            branch?: any;
            secondary?: any;
            main?: any;
            emitter?: any;
        };
    }>({});
    const [selectedPump, setSelectedPump] = useState<any>(null);
    const [showPumpOption, setShowPumpOption] = useState(false);

    const [projectImage, setProjectImage] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(false);
    const [imageLoadError, setImageLoadError] = useState<string | null>(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [showQuotationModal, setShowQuotationModal] = useState(false);
    const [showQuotation, setShowQuotation] = useState(false);
    const [quotationData, setQuotationData] = useState<QuotationData>({
        yourReference: '',
        quotationDate: new Date().toLocaleString('th-TH'),
        salesperson: '',
        paymentTerms: '0',
    });
    const [quotationDataCustomer, setQuotationDataCustomer] = useState<QuotationDataCustomer>({
        name: '',
        projectName: '',
        address: '',
        phone: '',
    });
    const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
    const [saveAction, setSaveAction] = useState<'update' | 'new' | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageLoading(true);
            setImageLoadError(null);

            const reader = new FileReader();
            reader.onload = (event) => {
                const imageData = event.target?.result as string;
                if (validateImageData(imageData)) {
                    setProjectImage(imageData);

                    const saveKeys = [
                        'projectMapImage',
                        `${projectMode}PlanImage`,
                        'userUploadedImage',
                    ];

                    saveKeys.forEach((key) => {
                        try {
                            localStorage.setItem(key, imageData);
                        } catch (error) {
                            console.warn(`Failed to save uploaded image with key ${key}:`, error);
                        }
                    });

                } else {
                    setImageLoadError('Invalid image format');
                }
                setImageLoading(false);
            };

            reader.onerror = () => {
                setImageLoadError('Failed to read image file');
                setImageLoading(false);
            };

            reader.readAsDataURL(file);
        }
    };

    const handleImageDelete = () => {
        if (projectImage && projectImage.startsWith('blob:')) {
            URL.revokeObjectURL(projectImage);
        }

        const keysToRemove = [
            'projectMapImage',
            `${projectMode}PlanImage`,
            'userUploadedImage',
            'mapCaptureImage',
        ];

        keysToRemove.forEach((key) => {
            localStorage.removeItem(key);
        });

        setProjectImage(null);
        setImageLoadError(null);
    };

    // Save and edit functions
    // Clean up old localStorage data to prevent quota exceeded errors
    const cleanupLocalStorage = () => {
        try {
            // Get all keys that start with savedProductProject
            const keysToCheck = Object.keys(localStorage).filter(key => 
                key.startsWith('savedProductProject')
            );
            
            // If we have more than 5 saved projects, remove the oldest ones
            if (keysToCheck.length > 5) {
                const keysToRemove = keysToCheck
                    .sort((a, b) => {
                        try {
                            const dataA = JSON.parse(localStorage.getItem(a) || '{}');
                            const dataB = JSON.parse(localStorage.getItem(b) || '{}');
                            const timeA = new Date(dataA.savedAt || 0).getTime();
                            const timeB = new Date(dataB.savedAt || 0).getTime();
                            return timeA - timeB; // Oldest first
                        } catch {
                            return 0;
                        }
                    })
                    .slice(0, keysToCheck.length - 5); // Keep only the 5 most recent
                
                keysToRemove.forEach(key => {
                    localStorage.removeItem(key);
                    console.log(`🗑️ Removed old saved project: ${key}`);
                });
            }
        } catch (error) {
            console.warn('⚠️ Error cleaning up localStorage:', error);
        }
    };

    // Compress project data by removing large images and unnecessary data
    const compressProjectData = (data: any) => {
        const compressed = { ...data };
        
        // Remove large image data to save space
        if (compressed.projectImage && compressed.projectImage.length > 100000) {
            compressed.projectImage = null; // Remove large images
            console.log('📦 Compressed: Removed large project image to save space');
        }
        
        // Remove unnecessary large data
        if (compressed.projectData?.plants) {
            // Keep all plants - don't limit to 100
            // compressed.projectData.plants = compressed.projectData.plants.slice(0, 100); // Keep only first 100 plants
        }
        
        return compressed;
    };

    // Auto-save function that saves without showing alerts
    const autoSaveProject = async (showAlert: boolean = false) => {
        try {
            // Clean up old data first
            cleanupLocalStorage();
            
            // Get field ID from localStorage (stored when field was opened from home page)
            const fieldId = localStorage.getItem('currentFieldId');
            
            // Save all project data to localStorage
            const projectToSave = {
                projectMode,
                projectData,
                gardenData,
                fieldCropData,
                greenhouseData,
                projectStats,
                activeZoneId,
                zoneInputs,
                zoneSprinklers,
                selectedPipes,
                selectedPump,
                showPumpOption,
                zoneOperationMode,
                zoneOperationGroups,
                projectImage,
                quotationData,
                quotationDataCustomer,
                savedAt: new Date().toISOString(),
                fieldId: fieldId, // Include field ID for reference
            };
            
            // Compress the data to save space
            const compressedData = compressProjectData(projectToSave);
            
            // Save to localStorage with field-specific key if fieldId exists
            const storageKey = fieldId ? `savedProductProject_${fieldId}` : 'savedProductProject';
            
            try {
                localStorage.setItem(storageKey, JSON.stringify(compressedData));
                
                // Also save to general storage for backward compatibility
                localStorage.setItem('savedProductProject', JSON.stringify(compressedData));
                
                setLastSaved(new Date());
                console.log('✅ Project auto-saved successfully');
                
                if (showAlert) {
                    alert(t('บันทึกโครงการสำเร็จ'));
                    
                    // Redirect to home page after successful save
                    setTimeout(() => {
                        router.visit('/');
                    }, 1000); // Wait 1 second to show the success message
                }
            } catch (storageError: any) {
                if (storageError.name === 'QuotaExceededError') {
                    console.warn('⚠️ Storage quota exceeded, attempting to free more space...');
                    
                    // Remove all old saved projects to free space
                    const allKeys = Object.keys(localStorage).filter(key => 
                        key.startsWith('savedProductProject')
                    );
                    allKeys.forEach(key => localStorage.removeItem(key));
                    
                    // Try saving again with even more compression
                    const minimalData = {
                        projectMode: compressedData.projectMode,
                        zoneInputs: compressedData.zoneInputs,
                        zoneSprinklers: compressedData.zoneSprinklers,
                        selectedPipes: compressedData.selectedPipes,
                        selectedPump: compressedData.selectedPump,
                        zoneOperationMode: compressedData.zoneOperationMode,
                        zoneOperationGroups: compressedData.zoneOperationGroups,
                        quotationData: compressedData.quotationData,
                        quotationDataCustomer: compressedData.quotationDataCustomer,
                        savedAt: compressedData.savedAt,
                        fieldId: compressedData.fieldId,
                    };
                    
                    localStorage.setItem(storageKey, JSON.stringify(minimalData));
                    localStorage.setItem('savedProductProject', JSON.stringify(minimalData));
                    
                    setLastSaved(new Date());
                    console.log('✅ Project saved with minimal data due to storage constraints');
                    
                    if (showAlert) {
                        alert(t('บันทึกโครงการสำเร็จ (ข้อมูลถูกบีบอัดเพื่อประหยัดพื้นที่)'));
                        
                        setTimeout(() => {
                            router.visit('/');
                        }, 1000);
                    }
                } else {
                    throw storageError;
                }
            }
        } catch (error) {
            console.error('❌ Error auto-saving project:', error);
            if (showAlert) {
                alert(t('เกิดข้อผิดพลาดในการบันทึกโครงการ'));
            }
        }
    };

    const handleSaveProject = async () => {
        // Check if this is an existing field being edited
        const fieldId = localStorage.getItem('currentFieldId');
        
        if (fieldId && !fieldId.startsWith('mock-')) {
            // This is an existing field, show confirmation modal
            setShowSaveConfirmModal(true);
            return;
        }
        
        // This is a new field, save directly
        await performSaveProject('new');
    };

    const performSaveProject = async (action: 'update' | 'new') => {
        setIsSaving(true);
        try {
            // Get field ID from localStorage (stored when field was opened from home page)
            const fieldId = localStorage.getItem('currentFieldId');
            console.log('🔍 Field ID from localStorage:', fieldId);
            console.log('🔍 Current URL:', window.location.href);

            // First save to localStorage
            await autoSaveProject(false);

            // Prepare complete project data (excluding images)
            const projectDataToSave = {
                status: 'finished',
                is_completed: true,

                // Core project data
                project_mode: projectMode,
                project_data: projectData,
                project_stats: projectStats,

                // Zone-specific data
                zone_inputs: zoneInputs,
                zone_sprinklers: zoneSprinklers,
                zone_operation_mode: zoneOperationMode,
                zone_operation_groups: zoneOperationGroups,
                active_zone_id: activeZoneId,

                // Equipment selections
                selected_pipes: selectedPipes,
                selected_pump: selectedPump,
                show_pump_option: showPumpOption,

                // Quotation data
                quotation_data: quotationData,
                quotation_data_customer: quotationDataCustomer,

                // Calculations and equipment
                effective_equipment: getEffectiveEquipment(),
                zone_calculation_data: createZoneCalculationData(),

                // Additional project data for different modes
                garden_data: gardenData,
                garden_stats: gardenStats,
                field_crop_data: fieldCropData,
                greenhouse_data: greenhouseData,

                // UI state (for restoring user's view)
                last_saved: lastSaved ? lastSaved.toISOString() : null,
            };

            try {
                // Refresh CSRF token before making the API call
                await refreshCsrfToken();
                
                let response;
                
                if (action === 'update' && fieldId && !fieldId.startsWith('mock-')) {
                    // Update existing field
                    console.log('🔄 Updating existing field data in database:', fieldId);
                    console.log('📦 Data being saved:', Object.keys(projectDataToSave));
                    
                    response = await axios.put(`/api/fields/${fieldId}/data`, projectDataToSave);
                } else {
                    // Create new field
                    console.log('🔄 Creating new field in database');
                    console.log('📦 Data being saved:', Object.keys(projectDataToSave));
                    console.log('📊 Project Stats:', projectStats);
                    console.log('📊 Project Data:', projectData);
                    
                    // Get field name from localStorage or use default
                    const fieldName = localStorage.getItem('currentFieldName') || 'New Field';
                    
                    // Calculate area and water need based on project mode
                    let calculatedArea = 0;
                    let calculatedWaterNeed = 0;
                    let calculatedPlants = 0;
                    let areaCoordinates: any[] = [];
                    let category = 'horticulture';
                    
                    if (projectMode === 'garden' && gardenStats) {
                        // Home garden project
                        calculatedArea = gardenStats.summary?.totalArea || 0;
                        calculatedWaterNeed = gardenStats.summary?.totalPipeLength || 0; // Use pipe length as water need estimate
                        calculatedPlants = gardenStats.summary?.totalSprinklers || 0; // Use sprinkler count as plant count
                        areaCoordinates = gardenData?.gardenZones?.[0]?.coordinates || [];
                        category = 'home-garden';
                        console.log('🏡 Home garden data:', { calculatedArea, calculatedWaterNeed, calculatedPlants });
                    } else if (projectMode === 'field-crop' && fieldCropData) {
                        // Field crop project - use available properties
                        calculatedArea = fieldCropData.area?.sizeInRai || 0;
                        calculatedWaterNeed = fieldCropData.summary?.totalWaterRequirementPerDay || 0;
                        calculatedPlants = fieldCropData.summary?.totalPlantingPoints || 0;
                        areaCoordinates = fieldCropData.area?.coordinates || [];
                        category = 'field-crop';
                        console.log('🌾 Field crop data:', { calculatedArea, calculatedWaterNeed, calculatedPlants });
                    } else if (projectMode === 'greenhouse' && greenhouseData) {
                        // Greenhouse project - use available properties
                        calculatedArea = greenhouseData.summary?.totalGreenhouseArea || 0;
                        calculatedWaterNeed = greenhouseData.summary?.waterManagement?.dailyRequirement?.optimal || 0;
                        calculatedPlants = greenhouseData.summary?.overallProduction?.totalPlants || 0;
                        areaCoordinates = greenhouseData.rawData?.shapes?.[0]?.points || [];
                        category = 'greenhouse';
                        console.log('🌱 Greenhouse data:', { calculatedArea, calculatedWaterNeed, calculatedPlants });
                    } else if (projectStats) {
                        // Horticulture project
                        calculatedArea = projectStats.totalAreaInRai || projectStats.totalArea || 0;
                        calculatedWaterNeed = projectStats.totalWaterNeedPerSession || projectStats.totalWaterNeed || 0;
                        calculatedPlants = projectStats.totalPlants || 0;
                        areaCoordinates = projectData?.mainArea || [];
                        console.log('🌳 Horticulture data:', { calculatedArea, calculatedWaterNeed, calculatedPlants });
                    } else if (projectData) {
                        // Fallback calculation from project data
                        if (projectData.mainArea && projectData.mainArea.length > 2) {
                            // Calculate area from coordinates (simplified)
                            calculatedArea = projectData.mainArea.length * 0.1; // Rough estimate
                        }
                        if (projectData.zones && projectData.zones.length > 0) {
                            calculatedPlants = projectData.zones.reduce((total, zone) => total + (zone.plantCount || 0), 0);
                            calculatedWaterNeed = projectData.zones.reduce((total, zone) => total + (zone.plantCount || 0) * (zone.plantData?.waterNeed || 0), 0);
                        }
                        areaCoordinates = projectData?.mainArea || [];
                        console.log('🔄 Fallback data:', { calculatedArea, calculatedWaterNeed, calculatedPlants });
                    }
                    
                    console.log('🧮 Final calculated values:', {
                        area: calculatedArea,
                        waterNeed: calculatedWaterNeed,
                        plants: calculatedPlants,
                        category,
                        areaCoordinatesLength: areaCoordinates.length
                    });
                    
                    const newFieldData = {
                        name: fieldName,
                        customer_name: 'Customer',
                        category: category,
                        area_coordinates: areaCoordinates,
                        plant_type_id: 21, // Default plant type
                        total_plants: calculatedPlants,
                        total_area: calculatedArea,
                        total_water_need: calculatedWaterNeed,
                        area_type: 'polygon',
                        ...projectDataToSave
                    };
                    
                    response = await axios.post('/api/fields', newFieldData);
                }
                
                if (response.data.success) {
                    console.log('✅ Field data saved to database successfully');
                    console.log('📊 Response:', response.data);
                    
                    // Store the field ID (either new or existing)
                    if (response.data.field?.id) {
                        localStorage.setItem('currentFieldId', response.data.field.id);
                        console.log('🆔 Field ID stored:', response.data.field.id);
                    }
                } else {
                    console.warn('⚠️ Failed to save field data to database:', response.data);
                }
            } catch (dbError: any) {
                console.error('❌ Error saving field data to database:', dbError);
                console.error('Error response:', dbError.response?.data);
                console.error('Error status:', dbError.response?.status);
                
                // If it's a CSRF error, try refreshing the token and retry
                if (dbError.response?.status === 419) {
                    console.log('🔄 CSRF token error, attempting to refresh and retry...');
                    try {
                        await refreshCsrfToken();
                        
                        // Always try to create a new field on retry if there was an error
                        const fieldName = localStorage.getItem('currentFieldName') || 'New Field';
                        
                        // Calculate area and water need from project data
                        let calculatedArea = 0;
                        let calculatedWaterNeed = 0;
                        let calculatedPlants = 0;
                        
                        if (projectStats) {
                            calculatedArea = projectStats.totalAreaInRai || projectStats.totalArea || 0;
                            calculatedWaterNeed = projectStats.totalWaterNeedPerSession || projectStats.totalWaterNeed || 0;
                            calculatedPlants = projectStats.totalPlants || 0;
                        } else if (projectData) {
                            // Fallback calculation from project data
                            if (projectData.mainArea && projectData.mainArea.length > 2) {
                                calculatedArea = projectData.mainArea.length * 0.1; // Rough estimate
                            }
                            if (projectData.zones && projectData.zones.length > 0) {
                                calculatedPlants = projectData.zones.reduce((total, zone) => total + (zone.plantCount || 0), 0);
                                calculatedWaterNeed = projectData.zones.reduce((total, zone) => total + (zone.plantCount || 0) * (zone.plantData?.waterNeed || 0), 0);
                            }
                        }
                        
                        const newFieldData = {
                            name: fieldName,
                            customer_name: 'Customer',
                            category: 'horticulture',
                            area_coordinates: projectData?.mainArea || [],
                            plant_type_id: 21,
                            total_plants: calculatedPlants,
                            total_area: calculatedArea,
                            total_water_need: calculatedWaterNeed,
                            area_type: 'polygon',
                            ...projectDataToSave
                        };
                        
                        const retryResponse = await axios.post('/api/fields', newFieldData);
                        
                        if (retryResponse.data.success) {
                            console.log('✅ Field data saved to database after retry');
                            if (retryResponse.data.field?.id) {
                                localStorage.setItem('currentFieldId', retryResponse.data.field.id);
                            }
                        } else {
                            console.warn('⚠️ Failed to save field data to database after retry:', retryResponse.data);
                        }
                    } catch (retryError: any) {
                        console.error('❌ Error saving field data to database after retry:', retryError);
                    }
                }
            }

            console.log('✅ Project saved successfully');
            alert(t('บันทึกโครงการสำเร็จ'));

            // Redirect to home page after successful save
            setTimeout(() => {
                router.visit('/');
            }, 1000); // Wait 1 second to show the success message
        } catch (error) {
            console.error('❌ Error saving project:', error);
            alert(t('เกิดข้อผิดพลาดในการบันทึกโครงการ'));
        } finally {
            setIsSaving(false);
            setShowSaveConfirmModal(false);
        }
    };

    const handleEditProject = () => {
        // Get the current field ID
        const fieldId = localStorage.getItem('currentFieldId');
        
        if (!fieldId || fieldId.startsWith('mock-')) {
            alert(t('no_field_to_edit'));
            return;
        }
        
        // Navigate to appropriate planner based on project mode
        let plannerRoute = '/horticulture/planner';
        
        if (projectMode === 'garden') {
            plannerRoute = '/home-garden/planner';
        } else if (projectMode === 'field-crop') {
            plannerRoute = '/field-crop';
        } else if (projectMode === 'greenhouse') {
            plannerRoute = '/greenhouse-crop';
        }
        
        console.log('🔄 Editing project:', { projectMode, fieldId, plannerRoute });
        
        // For horticulture, pass editFieldId as parameter
        if (projectMode === 'horticulture') {
            router.visit(`${plannerRoute}?editFieldId=${fieldId}`);
        } else {
            // For other modes, the planner will load data using currentFieldId from localStorage
            router.visit(plannerRoute);
        }
    };

    // Manual cleanup function for storage issues
    const handleClearStorage = () => {
        try {
            const keysToRemove = Object.keys(localStorage).filter(key => 
                key.startsWith('savedProductProject')
            );
            keysToRemove.forEach(key => localStorage.removeItem(key));
            console.log(`🗑️ Manually cleared ${keysToRemove.length} saved projects`);
            alert(t('ล้างข้อมูลที่บันทึกไว้แล้ว'));
        } catch (error) {
            console.error('❌ Error clearing storage:', error);
            alert(t('เกิดข้อผิดพลาดในการล้างข้อมูล'));
        }
    };

    // Clear invalid field IDs
    const clearInvalidFieldIds = () => {
        try {
            localStorage.removeItem('currentFieldId');
            localStorage.removeItem('currentFieldName');
            console.log('🗑️ Cleared invalid field IDs from localStorage');
        } catch (error) {
            console.error('❌ Error clearing field IDs:', error);
        }
    };

    // Load field data from database
    const loadFieldDataFromDatabase = async (fieldId: string) => {
        try {
            console.log('🔄 Loading field data from database:', fieldId);
            const response = await axios.get(`/api/fields/${fieldId}`);
            
            if (response.data.success && response.data.field) {
                const field = response.data.field;
                console.log('📦 Field data loaded from database:', Object.keys(field));
                console.log('📊 Database field structure:', {
                    hasProjectData: !!field.project_data,
                    hasProjectStats: !!field.project_stats,
                    hasZoneInputs: !!field.zone_inputs,
                    hasActiveZoneId: !!field.active_zone_id,
                    projectDataKeys: field.project_data ? Object.keys(field.project_data) : [],
                    zoneInputsKeys: field.zone_inputs ? Object.keys(field.zone_inputs) : []
                });
                
                // Debug the actual project_data content
                if (field.project_data) {
                    console.log('🔍 Project data content:', {
                        hasZones: !!field.project_data.zones,
                        zonesCount: field.project_data.zones?.length || 0,
                        hasPlants: !!field.project_data.plants,
                        plantsCount: field.project_data.plants?.length || 0,
                        hasPump: !!field.project_data.pump,
                        hasMainPipes: !!field.project_data.mainPipes,
                        mainPipesCount: field.project_data.mainPipes?.length || 0,
                        hasSubMainPipes: !!field.project_data.subMainPipes,
                        subMainPipesCount: field.project_data.subMainPipes?.length || 0,
                        hasExclusionAreas: !!field.project_data.exclusionAreas,
                        exclusionAreasCount: field.project_data.exclusionAreas?.length || 0,
                        totalArea: field.project_data.totalArea,
                        selectedPlantType: field.project_data.selectedPlantType
                    });
                }
                
                // Restore all field data
                if (field.project_mode) setProjectMode(field.project_mode);
                if (field.project_data) setProjectData(field.project_data);
                if (field.project_stats) setProjectStats(field.project_stats);
                
                // Set active zone - this is critical for loading
                if (field.active_zone_id) {
                    setActiveZoneId(field.active_zone_id);
                } else if (field.project_data?.zones && field.project_data.zones.length > 0) {
                    // If no active zone is set, use the first zone
                    setActiveZoneId(field.project_data.zones[0].id);
                    console.log('🔄 Set active zone to first zone:', field.project_data.zones[0].id);
                } else {
                    // If no zones, use a default
                    setActiveZoneId('main-area');
                    console.log('🔄 Set active zone to default: main-area');
                }
                
                if (field.zone_inputs) setZoneInputs(field.zone_inputs);
                if (field.zone_sprinklers) setZoneSprinklers(field.zone_sprinklers);
                
                // Ensure zone inputs exist for all zones
                if (field.project_data?.zones && (!field.zone_inputs || Object.keys(field.zone_inputs).length === 0)) {
                    console.log('🔄 Creating zone inputs for all zones...');
                    const newZoneInputs: { [key: string]: any } = {};
                    field.project_data.zones.forEach(zone => {
                        newZoneInputs[zone.id] = createZoneInput(zone, {}, [], [], [], 1);
                    });
                    setZoneInputs(newZoneInputs);
                    console.log('✅ Created zone inputs for zones:', Object.keys(newZoneInputs));
                }
                
                // If no zones exist, create zone inputs for main-area
                if ((!field.project_data?.zones || field.project_data.zones.length === 0) && 
                    (!field.zone_inputs || Object.keys(field.zone_inputs).length === 0)) {
                    console.log('🔄 Creating zone inputs for main-area (no zones found)...');
                    const mainAreaZone = {
                        id: 'main-area',
                        name: 'Main Area',
                        coordinates: field.project_data?.mainArea || [],
                        plantData: field.project_data?.selectedPlantType || { id: 1, name: 'Default', plantSpacing: 8, rowSpacing: 8, waterNeed: 50 },
                        plantCount: field.project_data?.plants?.length || 0,
                        totalWaterNeed: (field.project_data?.plants?.length || 0) * (field.project_data?.selectedPlantType?.waterNeed || 50),
                        area: field.project_data?.totalArea || 0,
                        color: '#3b82f6'
                    };
                    const newZoneInputs = {
                        'main-area': createZoneInput(mainAreaZone, {}, [], [], [], 1)
                    };
                    setZoneInputs(newZoneInputs);
                    console.log('✅ Created zone inputs for main-area');
                }
                if (field.selected_pipes) setSelectedPipes(field.selected_pipes);
                if (field.selected_pump) setSelectedPump(field.selected_pump);
                if (field.show_pump_option !== undefined) setShowPumpOption(field.show_pump_option);
                if (field.zone_operation_mode) setZoneOperationMode(field.zone_operation_mode);
                if (field.zone_operation_groups) setZoneOperationGroups(field.zone_operation_groups);
                if (field.quotation_data) setQuotationData(field.quotation_data);
                if (field.quotation_data_customer) setQuotationDataCustomer(field.quotation_data_customer);
                if (field.garden_data) {
                    setGardenData(field.garden_data);
                    console.log('✅ Garden data loaded from database');
                }
                if (field.garden_stats) {
                    setGardenStats(field.garden_stats);
                    console.log('✅ Garden stats loaded from database');
                    
                    // If we have garden data, set up zone inputs for garden mode
                    if (field.garden_data && field.garden_stats && field.project_mode === 'home-garden') {
                        console.log('🔄 Setting up zone inputs for home garden from database data...');
                        const initialZoneInputs: { [zoneId: string]: IrrigationInput } = {};
                        const initialSelectedPipes: {
                            [zoneId: string]: { branch?: any; secondary?: any; main?: any };
                        } = {};

                        if (field.garden_stats.zones.length > 1) {
                            field.garden_stats.zones.forEach((zone: any) => {
                                initialZoneInputs[zone.zoneId] = createGardenZoneInput(
                                    zone,
                                    field.garden_stats,
                                    field.garden_stats.zones.length
                                );
                                initialSelectedPipes[zone.zoneId] = {
                                    branch: undefined,
                                    secondary: undefined,
                                    main: undefined,
                                };
                            });

                            setZoneInputs(initialZoneInputs);
                            setSelectedPipes(initialSelectedPipes);
                            setActiveZoneId(field.garden_stats.zones[0].zoneId);
                            handleZoneOperationModeChange('sequential');
                            console.log('✅ Zone inputs created for home garden (multi-zone)');
                        } else {
                            const singleInput = createSingleGardenInput(field.garden_stats);
                            setZoneInputs({ 'main-area': singleInput });
                            setSelectedPipes({
                                'main-area': { branch: undefined, secondary: undefined, main: undefined },
                            });
                            setActiveZoneId('main-area');
                            console.log('✅ Zone inputs created for home garden (single zone)');
                        }
                    }
                }
                if (field.field_crop_data) setFieldCropData(field.field_crop_data);
                if (field.greenhouse_data) setGreenhouseData(field.greenhouse_data);
                if (field.last_saved) setLastSaved(new Date(field.last_saved));
                
                console.log('✅ Field data restored from database');
                return true;
            }
        } catch (error) {
            console.error('❌ Error loading field data from database:', error);
        }
        return false;
    };



    const hasUnsavedChanges = () => {
        return isEditing && lastSaved;
    };

    useEffect(() => {
        return () => {
            if (projectImage && projectImage.startsWith('blob:')) {
                URL.revokeObjectURL(projectImage);
            }
            cleanupOldImages();
            
            // Clean up localStorage when component unmounts
            cleanupLocalStorage();
        };
    }, [projectImage]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode') as ProjectMode;
        
        if (mode) {
            setProjectMode(mode);
        }
        
        // Auto-load saved project data if fieldId is present
        const fieldId = localStorage.getItem('currentFieldId');
        console.log('🔍 Product page - currentFieldId from localStorage:', fieldId);
        
        // Check if we have horticultureIrrigationData (new field case)
        const horticultureData = localStorage.getItem('horticultureIrrigationData');
        if (horticultureData) {
            try {
                const parsedHorticultureData = JSON.parse(horticultureData);
                console.log('📊 horticultureIrrigationData structure:', {
                    hasZones: !!parsedHorticultureData.zones,
                    zonesCount: parsedHorticultureData.zones?.length || 0,
                    hasPlants: !!parsedHorticultureData.plants,
                    plantsCount: parsedHorticultureData.plants?.length || 0,
                    hasPump: !!parsedHorticultureData.pump,
                    hasMainPipes: !!parsedHorticultureData.mainPipes,
                    mainPipesCount: parsedHorticultureData.mainPipes?.length || 0
                });
            } catch (error) {
                console.error('❌ Error parsing horticultureIrrigationData:', error);
            }
        }
        
        if (fieldId && fieldId.trim() !== '' && !fieldId.startsWith('mock-')) {
            // First try to load from database (most complete data)
            loadFieldDataFromDatabase(fieldId).then((loadedFromDb) => {
                if (!loadedFromDb) {
                    // Fallback to localStorage if database load fails
                    const fieldSpecificKey = `savedProductProject_${fieldId}`;
                    const savedProject = localStorage.getItem(fieldSpecificKey);
                    
                    if (savedProject) {
                        try {
                            const parsedProject = JSON.parse(savedProject);
                            console.log('📊 localStorage project structure:', {
                                hasProjectData: !!parsedProject.projectData,
                                hasProjectStats: !!parsedProject.projectStats,
                                hasZoneInputs: !!parsedProject.zoneInputs,
                                hasActiveZoneId: !!parsedProject.activeZoneId,
                                projectDataKeys: parsedProject.projectData ? Object.keys(parsedProject.projectData) : [],
                                zoneInputsKeys: parsedProject.zoneInputs ? Object.keys(parsedProject.zoneInputs) : []
                            });
                            
                            // Restore all saved state
                            setProjectMode(parsedProject.projectMode || 'horticulture');
                            setProjectData(parsedProject.projectData || null);
                            setGardenData(parsedProject.gardenData || null);
                            setFieldCropData(parsedProject.fieldCropData || null);
                            setGreenhouseData(parsedProject.greenhouseData || null);
                            setProjectStats(parsedProject.projectStats || null);
                            setActiveZoneId(parsedProject.activeZoneId || '');
                            setZoneInputs(parsedProject.zoneInputs || {});
                            setZoneSprinklers(parsedProject.zoneSprinklers || {});
                            setSelectedPipes(parsedProject.selectedPipes || {});
                            setSelectedPump(parsedProject.selectedPump || null);
                            setShowPumpOption(parsedProject.showPumpOption !== undefined ? parsedProject.showPumpOption : true);
                            setZoneOperationMode(parsedProject.zoneOperationMode || 'sequential');
                            setZoneOperationGroups(parsedProject.zoneOperationGroups || []);
                            setProjectImage(parsedProject.projectImage || null);
                            setQuotationData(parsedProject.quotationData || {
                                yourReference: '',
                                quotationDate: new Date().toLocaleString('th-TH'),
                                salesperson: '',
                                paymentTerms: '0',
                            });
                            setQuotationDataCustomer(parsedProject.quotationDataCustomer || {
                                name: '',
                                projectName: '',
                                address: '',
                                phone: '',
                            });
                            
                            // Set last saved time if available
                            if (parsedProject.savedAt) {
                                setLastSaved(new Date(parsedProject.savedAt));
                            }
                            
                            console.log('✅ Auto-loaded saved project data from localStorage for field:', fieldId);
                        } catch (error) {
                            console.error('❌ Error auto-loading saved project from localStorage:', error);
                        }
                    }
                }
            });
        }
    }, []);

    useEffect(() => {
        if (!projectMode) return;

        const loadProjectImage = async () => {
            setImageLoading(true);
            setImageLoadError(null);
            cleanupOldImages();
            
            try {
                const image = await getStoredProjectImage(projectMode);

        if (image && validateImageData(image)) {
            setProjectImage(image);
        } else {
            setProjectImage(null);
            const modeNames = {
                'field-crop': 'Field Crop Summary',
                garden: 'Garden Planner',
                greenhouse: 'Greenhouse Planner',
                horticulture: 'Horticulture Planner',
            };

                    setImageLoadError(
                        `No map image found. Please capture one from ${modeNames[projectMode]} page.`
                    );
                }
            } catch (error) {
                console.error('❌ Error loading project image:', error);
                setProjectImage(null);
                setImageLoadError('Failed to load project image');
            } finally {
                setImageLoading(false);
            }
        };

        loadProjectImage();
    }, [projectMode]);

    useEffect(() => {
        if (projectImage && projectMode) {
            const isValid = validateImageData(projectImage);
            if (!isValid) {
                console.warn('⚠️ Current project image is invalid, attempting to reload...');
                setProjectImage(null);
                
                const reloadImage = async () => {
                    try {
                        const validImage = await getStoredProjectImage(projectMode);
                        if (validImage && validateImageData(validImage)) {
                            setProjectImage(validImage);
                            setImageLoadError(null);
                        } else {
                            setImageLoadError('Invalid or corrupted image data');
                        }
                    } catch (error) {
                        console.error('❌ Error reloading project image:', error);
                        setImageLoadError('Failed to reload project image');
                    }
                };
                
                reloadImage();
            }
        }
    }, [projectImage, projectMode]);

    // Auto-save when important data changes
    useEffect(() => {
        // Only auto-save if we have a fieldId (meaning we're editing an existing field)
        const fieldId = localStorage.getItem('currentFieldId');
        
        if (fieldId && (zoneInputs || selectedPipes || selectedPump || zoneOperationMode)) {
            // Debounce auto-save to avoid too frequent saves
            const timeoutId = setTimeout(() => {
                autoSaveProject(false);
            }, 2000); // Save after 2 seconds of no changes
            
            return () => clearTimeout(timeoutId);
        }
    }, [zoneInputs, selectedPipes, selectedPump, zoneOperationMode, zoneOperationGroups, quotationData, quotationDataCustomer]);

    // Auto-save when sprinkler selections change
    useEffect(() => {
        const fieldId = localStorage.getItem('currentFieldId');
        
        if (fieldId && Object.keys(zoneSprinklers).length > 0) {
            const timeoutId = setTimeout(() => {
                autoSaveProject(false);
            }, 2000);
            
            return () => clearTimeout(timeoutId);
        }
    }, [zoneSprinklers]);

    // Add keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+S for save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSaveProject();
            }
            // Ctrl+E for edit mode toggle
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                handleEditProject();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Add beforeunload event listener
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = t('คุณมีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้าหรือไม่?');
                return t('คุณมีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้าหรือไม่?');
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isEditing, lastSaved, t]);

    // Check for canceled edit session
    useEffect(() => {
        const editSessionCanceled = localStorage.getItem('editSessionCanceled');
        if (editSessionCanceled === 'true') {
            // Clear the flag silently
            localStorage.removeItem('editSessionCanceled');
        }
    }, []);

    // Helper function to get edit mode styling
    const getEditModeStyle = (componentName: string) => {
        if (!isEditing) return {};
        
        return {
            border: '2px dashed #f59e0b',
            backgroundColor: '#fef3c7',
            position: 'relative' as const,
        };
    };

    const renderEditIndicator = (componentName: string) => {
        if (!isEditing) return null;
        
        return (
            <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                ✏️ {t('แก้ไขได้')}
            </div>
        );
    };

    const getZoneName = (zoneId: string): string => {
        if (projectMode === 'garden' && gardenStats) {
            const zone = gardenStats.zones.find((z) => z.zoneId === zoneId);
            return zone?.zoneName || zoneId;
        }
        if (projectMode === 'field-crop' && fieldCropData) {
            const zone = fieldCropData.zones.info.find((z) => z.id === zoneId);
            return zone?.name || zoneId;
        }
        if (projectMode === 'greenhouse' && greenhouseData) {
            // Handle both processed data (with summary) and raw data (without summary)
            if (greenhouseData.summary?.plotStats) {
                const plot = greenhouseData.summary.plotStats.find((p) => p.plotId === zoneId);
                return plot?.plotName || zoneId;
            } else if (greenhouseData.rawData?.shapes) {
                // For raw data, find the shape by ID
                const shape = greenhouseData.rawData?.shapes.find((s) => s.id === zoneId);
                return shape?.name || zoneId;
            }
            return zoneId;
        }
        
        // Check horticultureSystemData first
        const horticultureSystemDataStr = localStorage.getItem('horticultureSystemData');
        if (horticultureSystemDataStr) {
            try {
                const horticultureSystemData = JSON.parse(horticultureSystemDataStr);
                if (horticultureSystemData && horticultureSystemData.zones) {
                    const zone = horticultureSystemData.zones.find((z: any) => z.id === zoneId);
                    if (zone?.name) {
                        return zone.name;
                    }
                }
            } catch (error) {
                // Fall through to default
            }
        }
        
        const zone = projectData?.zones.find((z) => z.id === zoneId);
        return zone?.name || zoneId;
    };

    // แก้ใน product.tsx ประมาณบรรทัด 191-220
    const createGreenhouseZoneInput = (
        plot: EnhancedPlotStats,
        greenhouseData: GreenhousePlanningData,
        totalZones: number
    ): IrrigationInput => {
        const areaInSqm = plot.area;
        // Fix: Convert square meters to rai for consistency
        const areaInRai = areaInSqm / 1600;
        const crop = getCropByValue(plot.cropType || '');
        const totalSprinklers = plot.equipmentCount.sprinklers || plot.production.totalPlants;

        const waterPerSprinkler =
            plot.production.waterRequirementPerIrrigation / Math.max(totalSprinklers, 1);

        const longestBranch = plot.pipeStats.drip.longest || plot.pipeStats.sub.longest || 30;
        const totalBranchLength =
            plot.pipeStats.drip.totalLength || plot.pipeStats.sub.totalLength || 100;
        const longestSubmain = plot.pipeStats.main.longest || 0;
        const totalSubmainLength = plot.pipeStats.main.totalLength || 0;

        return {
            farmSizeRai: formatNumber(areaInRai, 3), // Fix: Now consistently in rai
            totalTrees: totalSprinklers,
            waterPerTreeLiters: formatNumber(waterPerSprinkler, 3),
            numberOfZones: totalZones,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerSecondary: 1,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerLongestSecondary: 1,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(longestBranch, 3),
            totalBranchPipeM: formatNumber(totalBranchLength, 3),
            longestSecondaryPipeM: formatNumber(longestSubmain, 3),
            totalSecondaryPipeM: formatNumber(totalSubmainLength, 3),
            longestMainPipeM: 0,
            totalMainPipeM: 0,
        };
    };

    const createSingleGreenhouseInput = (
        greenhouseData: GreenhousePlanningData
    ): IrrigationInput => {
        const areaInSqm = greenhouseData.summary.totalPlotArea;
        // Fix: Convert square meters to rai for consistency
        const areaInRai = areaInSqm / 1600;
        const totalSprinklers =
            greenhouseData.summary.overallEquipmentCount.sprinklers ||
            greenhouseData.summary.overallProduction.totalPlants;

        const waterPerSprinkler =
            greenhouseData.summary.overallProduction.waterRequirementPerIrrigation /
            Math.max(totalSprinklers, 1);

        return {
            farmSizeRai: formatNumber(areaInRai, 3), // Fix: Now consistently in rai
            totalTrees: totalSprinklers,
            waterPerTreeLiters: formatNumber(waterPerSprinkler, 3),
            numberOfZones: 1,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerSecondary: 1,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerLongestSecondary: 1,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(
                greenhouseData.summary.overallPipeStats.drip.longest ||
                    greenhouseData.summary.overallPipeStats.sub.longest ||
                    30,
                3
            ),
            totalBranchPipeM: formatNumber(
                greenhouseData.summary.overallPipeStats.drip.totalLength ||
                    greenhouseData.summary.overallPipeStats.sub.totalLength ||
                    100,
                3
            ),
            longestSecondaryPipeM: formatNumber(
                greenhouseData.summary.overallPipeStats.main.longest || 0,
                3
            ),
            totalSecondaryPipeM: formatNumber(
                greenhouseData.summary.overallPipeStats.main.totalLength || 0,
                3
            ),
            longestMainPipeM: 0,
            totalMainPipeM: 0,
        };
    };

    const createFieldCropZoneInput = (
        zone: FieldCropData['zones']['info'][0],
        fieldData: FieldCropData,
        totalZones: number
    ): IrrigationInput => {
        const areaInRai = zone.area / 1600;
        const assignedCropValue = fieldData.crops.zoneAssignments[zone.id];
        const crop = assignedCropValue ? getCropByValue(assignedCropValue) : null;

        const totalSprinklers =
            zone.sprinklerCount || Math.max(1, Math.ceil(zone.totalPlantingPoints / 10));

        let waterPerSprinklerLPM = 2.0;
        if (crop && crop.waterRequirement) {
            waterPerSprinklerLPM = crop.waterRequirement;
        } else if (zone.totalWaterRequirementPerDay > 0 && totalSprinklers > 0) {
            const avgIrrigationTimeHours = 0.5;
            waterPerSprinklerLPM =
                zone.totalWaterRequirementPerDay / totalSprinklers / (avgIrrigationTimeHours * 60);
        }

        const zonePipeStats = zone.pipeStats;
        const longestBranch = zonePipeStats.lateral.longest || 30;
        const totalBranchLength = zonePipeStats.lateral.totalLength || 100;
        const longestSubmain = zonePipeStats.submain.longest || 0;
        const totalSubmainLength = zonePipeStats.submain.totalLength || 0;
        const longestMain = zonePipeStats.main.longest || 0;
        const totalMainLength = zonePipeStats.main.totalLength || 0;

        return {
            farmSizeRai: formatNumber(areaInRai, 3),
            totalTrees: totalSprinklers,
            waterPerTreeLiters: formatNumber(waterPerSprinklerLPM, 3),
            numberOfZones: totalZones,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerSecondary: 1,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerLongestSecondary: 1,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(longestBranch, 3),
            totalBranchPipeM: formatNumber(totalBranchLength, 3),
            longestSecondaryPipeM: formatNumber(longestSubmain, 3),
            totalSecondaryPipeM: formatNumber(totalSubmainLength, 3),
            longestMainPipeM: formatNumber(longestMain, 3),
            totalMainPipeM: formatNumber(totalMainLength, 3),
        };
    };

    const createSingleFieldCropInput = (fieldData: FieldCropData): IrrigationInput => {
        const areaInRai = fieldData.area.size / 1600;

        const totalSprinklers =
            fieldData.irrigation.totalCount ||
            fieldData.summary.totalPlantingPoints ||
            Math.max(1, Math.ceil(fieldData.summary.totalPlantingPoints / 10));

        let waterPerSprinklerLPM = 2.0;
        if (fieldData.summary.totalWaterRequirementPerDay > 0 && totalSprinklers > 0) {
            const avgIrrigationTimeHours = 0.5;
            waterPerSprinklerLPM =
                fieldData.summary.totalWaterRequirementPerDay /
                totalSprinklers /
                (avgIrrigationTimeHours * 60);
        }

        return {
            farmSizeRai: formatNumber(areaInRai, 3),
            totalTrees: totalSprinklers,
            waterPerTreeLiters: formatNumber(waterPerSprinklerLPM, 3),
            numberOfZones: 1,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerSecondary: 1,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerLongestSecondary: 1,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(fieldData.pipes.stats.lateral.longest || 30, 3),
            totalBranchPipeM: formatNumber(fieldData.pipes.stats.lateral.totalLength || 100, 3),
            longestSecondaryPipeM: formatNumber(fieldData.pipes.stats.submain.longest || 0, 3),
            totalSecondaryPipeM: formatNumber(fieldData.pipes.stats.submain.totalLength || 0, 3),
            longestMainPipeM: formatNumber(fieldData.pipes.stats.main.longest || 0, 3),
            totalMainPipeM: formatNumber(fieldData.pipes.stats.main.totalLength || 0, 3),
        };
    };

    const createZoneCalculationData = (): ZoneCalculationData[] => {
        const zoneCalcData: ZoneCalculationData[] = [];
        let allZoneIds: string[] = [];

        if (projectMode === 'garden' && gardenStats) {
            allZoneIds = gardenStats.zones.map((z) => z.zoneId);
        } else if (projectMode === 'field-crop' && fieldCropData) {
            allZoneIds = fieldCropData.zones.info.map((z) => z.id);
        } else if (projectMode === 'greenhouse' && greenhouseData) {
            // Handle both processed data (with summary) and raw data (without summary)
            if (greenhouseData.summary?.plotStats) {
                allZoneIds = greenhouseData.summary.plotStats.map((p) => p.plotId);
            } else if (greenhouseData.rawData?.shapes) {
                // For raw data, get plot shapes
                allZoneIds = greenhouseData.rawData?.shapes.filter((s) => s.type === 'plot').map((s) => s.id);
            } else {
                allZoneIds = [];
            }
        } else if (projectData) {
            allZoneIds = projectData.zones.map((z) => z.id);
        }

        allZoneIds.forEach((zoneId) => {
            const zoneInput = zoneInputs[zoneId];
            const zoneSprinkler = zoneSprinklers[zoneId];

            if (zoneInput && zoneSprinkler) {
                let simultaneousZonesForCalc = 1;
                if (zoneOperationMode === 'simultaneous') {
                    simultaneousZonesForCalc = allZoneIds.length;
                } else if (zoneOperationMode === 'custom') {
                    const group = zoneOperationGroups.find((g) => g.zones.includes(zoneId));
                    simultaneousZonesForCalc = group ? group.zones.length : 1;
                }

                const adjustedInput = {
                    ...zoneInput,
                    simultaneousZones: simultaneousZonesForCalc,
                    numberOfZones: allZoneIds.length,
                };

                zoneCalcData.push({
                    zoneId,
                    input: adjustedInput,
                    sprinkler: zoneSprinkler,
                    projectMode,
                });
            }
        });

        return zoneCalcData;
    };

    const createGardenZoneInput = (
        zone: any,
        gardenStats: GardenStatistics,
        totalZones: number
    ): IrrigationInput => {
        const zoneStats = gardenStats.zones.find((z) => z.zoneId === zone.zoneId);

        if (!zoneStats) {
            throw new Error(`Zone statistics not found for zone ${zone.zoneId}`);
        }

        const areaInRai = zoneStats.area / 1600;

        // Fix: Use a more reasonable default based on area instead of sprinklerCount
        // Calculate sprinklers based on area: roughly 10-15 sprinklers per rai for home garden
        const sprinklerCount = zoneStats.sprinklerCount > 0 
            ? zoneStats.sprinklerCount 
            : Math.max(5, Math.ceil(areaInRai * 12)); // 12 sprinklers per rai as default
        


        const waterPerSprinkler = 50;

        return {
            farmSizeRai: formatNumber(areaInRai, 3),
            totalTrees: sprinklerCount,
            waterPerTreeLiters: formatNumber(waterPerSprinkler, 3),
            numberOfZones: totalZones,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(sprinklerCount / 5)),
            branchesPerSecondary: 1,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(sprinklerCount / 5)),
            branchesPerLongestSecondary: 1,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(zoneStats.longestPipeFromSource || 20, 3),
            totalBranchPipeM: formatNumber(zoneStats.totalPipeLength || 100, 3),
            longestSecondaryPipeM: 0,
            totalSecondaryPipeM: 0,
            longestMainPipeM: 0,
            totalMainPipeM: 0,
        };
    };

    const createSingleGardenInput = (stats: GardenStatistics): IrrigationInput => {
        const summary = stats.summary;

        const areaInRai = summary.totalArea / 1600;

        // Fix: Use area-based calculation if no sprinklers are placed
        const totalSprinklers = summary.totalSprinklers > 0 
            ? summary.totalSprinklers 
            : Math.max(5, Math.ceil(areaInRai * 12)); // 12 sprinklers per rai as default

        return {
            farmSizeRai: formatNumber(areaInRai, 3),
            totalTrees: totalSprinklers,
            waterPerTreeLiters: formatNumber(50, 3),
            numberOfZones: 1,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerSecondary: 1,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: Math.max(1, Math.ceil(totalSprinklers / 5)),
            branchesPerLongestSecondary: 1,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(summary.longestPipeFromSource || 20, 3),
            totalBranchPipeM: formatNumber(summary.totalPipeLength || 100, 3),
            longestSecondaryPipeM: 0,
            totalSecondaryPipeM: 0,
            longestMainPipeM: 0,
            totalMainPipeM: 0,
        };
    };

    // Simple replacement for removed createZoneInput function
    const createZoneInput = (zone: any, stats: any, pipes: any[], sprinklers: any[], plants: any[], totalZones: number): IrrigationInput => {
        return {
            farmSizeRai: zone.area || 0,
            totalTrees: zone.plantCount || 0,
            waterPerTreeLiters: zone.plantData?.waterNeed || 50,
            numberOfZones: totalZones,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 30,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,
            sprinklersPerBranch: 1,
            branchesPerSecondary: 1,
            simultaneousZones: 1,
            sprinklersPerLongestBranch: 1,
            branchesPerLongestSecondary: 1,
            secondariesPerLongestMain: 1,
            longestBranchPipeM: 0,
            totalBranchPipeM: 0,
            longestSecondaryPipeM: 0,
            totalSecondaryPipeM: 0,
            longestMainPipeM: 0,
            totalMainPipeM: 0,
        };
    };

    const currentInput = useMemo(() => {
        if (!activeZoneId) {
            console.log('⚠️ No activeZoneId set');
            return null;
        }
        
        if (!zoneInputs[activeZoneId]) {
            console.log('⚠️ No zone inputs for activeZoneId:', activeZoneId);
            // Try to create default zone inputs if they don't exist
            if (projectData && projectData.zones) {
                const zone = projectData.zones.find(z => z.id === activeZoneId);
                if (zone) {
                    console.log('🔄 Creating default zone inputs for zone:', activeZoneId);
                    const defaultInput = createZoneInput(zone, {}, [], [], [], 1);
                    setZoneInputs(prev => ({
                        ...prev,
                        [activeZoneId]: defaultInput
                    }));
                    return defaultInput;
                }
            }
            return null;
        }

        const baseInput = zoneInputs[activeZoneId];

        let simultaneousZonesForCalc = 1;
        let allZoneIds: string[] = [];

        if (projectMode === 'garden' && gardenStats) {
            allZoneIds = gardenStats.zones.map((z) => z.zoneId);
        } else if (projectMode === 'field-crop' && fieldCropData) {
            allZoneIds = fieldCropData.zones.info.map((z) => z.id);
        } else if (projectMode === 'greenhouse' && greenhouseData) {
            // Handle both processed data (with summary) and raw data (without summary)
            if (greenhouseData.summary?.plotStats) {
                allZoneIds = greenhouseData.summary.plotStats.map((p) => p.plotId);
            } else if (greenhouseData.rawData?.shapes) {
                // For raw data, get plot shapes
                allZoneIds = greenhouseData.rawData?.shapes.filter((s) => s.type === 'plot').map((s) => s.id);
            } else {
                allZoneIds = [];
            }
        } else if (projectData) {
            allZoneIds = projectData.zones.map((z) => z.id);
        }

        if (zoneOperationMode === 'simultaneous') {
            simultaneousZonesForCalc = allZoneIds.length;
        } else if (zoneOperationMode === 'custom') {
            const group = zoneOperationGroups.find((g) => g.zones.includes(activeZoneId));
            simultaneousZonesForCalc = group ? group.zones.length : 1;
        }

        const updatedInput = {
            ...baseInput,
            simultaneousZones: simultaneousZonesForCalc,
            numberOfZones: allZoneIds.length,
        };

        return updatedInput;
    }, [
        activeZoneId,
        zoneInputs,
        zoneOperationMode,
        zoneOperationGroups,
        projectMode,
        gardenStats,
        fieldCropData,
        greenhouseData,
        projectData,
    ]);

    const handleZoneOperationModeChange = (mode: 'sequential' | 'simultaneous' | 'custom') => {
        setZoneOperationMode(mode);

        let allZoneIds: string[] = [];

        if (projectMode === 'garden' && gardenStats) {
            allZoneIds = gardenStats.zones.map((z) => z.zoneId);
        } else if (projectMode === 'field-crop' && fieldCropData) {
            allZoneIds = fieldCropData.zones.info.map((z) => z.id);
        } else if (projectMode === 'greenhouse' && greenhouseData) {
            // Handle both processed data (with summary) and raw data (without summary)
            if (greenhouseData.summary?.plotStats) {
                allZoneIds = greenhouseData.summary.plotStats.map((p) => p.plotId);
            } else if (greenhouseData.rawData?.shapes) {
                // For raw data, get plot shapes
                allZoneIds = greenhouseData.rawData?.shapes.filter((s) => s.type === 'plot').map((s) => s.id);
            } else {
                allZoneIds = [];
            }
        } else if (projectData) {
            allZoneIds = projectData.zones.map((z) => z.id);
        }

        if (mode === 'sequential') {
            const groups = allZoneIds.map((zoneId, index) => ({
                id: `group-${index}`,
                zones: [zoneId],
                order: index + 1,
                label: `${getZoneName(zoneId)}`,
            }));
            setZoneOperationGroups(groups);
        } else if (mode === 'simultaneous') {
            setZoneOperationGroups([
                {
                    id: 'group-all',
                    zones: allZoneIds,
                    order: 1,
                    label: t('เปิดทุกโซนพร้อมกัน'),
                },
            ]);
        }
    };

    const addOperationGroup = () => {
        const newGroup: ZoneOperationGroup = {
            id: `group-${Date.now()}`,
            zones: [],
            order: zoneOperationGroups.length + 1,
            label: t(`กลุ่มที่ ${zoneOperationGroups.length + 1}`),
        };
        setZoneOperationGroups([...zoneOperationGroups, newGroup]);
    };

    const updateOperationGroup = (groupId: string, zones: string[]) => {
        setZoneOperationGroups((groups) =>
            groups.map((g) => (g.id === groupId ? { ...g, zones } : g))
        );
    };

    const removeOperationGroup = (groupId: string) => {
        setZoneOperationGroups((groups) =>
            groups
                .filter((g) => g.id !== groupId)
                .map((g, index) => ({
                    ...g,
                    order: index + 1,
                    label: t(`กลุ่มที่ ${index + 1}`),
                }))
        );
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        let mode = urlParams.get('mode') as ProjectMode;
        const storedType = localStorage.getItem('projectType');

        if (!mode && storedType === 'greenhouse') {
            mode = 'greenhouse';
        } else if (!mode && storedType === 'field-crop') {
            mode = 'field-crop';
        } else if (!mode && storedType === 'home-garden') {
            mode = 'garden';
        } else if (!mode && storedType === 'horticulture') {
            mode = 'horticulture';
        }

        if (mode === 'greenhouse') {
            setProjectMode('greenhouse');

            let data = getGreenhouseData();

            if (!data) {
                data = migrateLegacyGreenhouseData();
            }

            if (data) {
                setGreenhouseData(data);

                const initialZoneInputs: { [zoneId: string]: IrrigationInput } = {};
                const initialSelectedPipes: {
                    [zoneId: string]: { branch?: any; secondary?: any; main?: any };
                } = {};

                if (data.summary.plotStats.length > 1) {
                    data.summary.plotStats.forEach((plot) => {
                        initialZoneInputs[plot.plotId] = createGreenhouseZoneInput(
                            plot,
                            data,
                            data.summary.plotStats.length
                        );
                        initialSelectedPipes[plot.plotId] = {
                            branch: undefined,
                            secondary: undefined,
                            main: undefined,
                        };
                    });

                    setZoneInputs(initialZoneInputs);
                    setSelectedPipes(initialSelectedPipes);
                    setActiveZoneId(data.summary.plotStats[0].plotId);
                    handleZoneOperationModeChange('sequential');
                } else if (data.summary.plotStats.length === 1) {
                    const plot = data.summary.plotStats[0];
                    const singleInput = createGreenhouseZoneInput(plot, data, 1);
                    setZoneInputs({ [plot.plotId]: singleInput });
                    setSelectedPipes({
                        [plot.plotId]: { branch: undefined, secondary: undefined, main: undefined },
                    });
                    setActiveZoneId(plot.plotId);
                } else {
                    const singleInput = createSingleGreenhouseInput(data);
                    setZoneInputs({ 'main-area': singleInput });
                    setSelectedPipes({
                        'main-area': { branch: undefined, secondary: undefined, main: undefined },
                    });
                    setActiveZoneId('main-area');
                }
            } else {
                console.warn('⚠️ No greenhouse data found');
                router.visit('/greenhouse-crop');
            }
        } else if (mode === 'field-crop') {
            setProjectMode('field-crop');

            let fieldData = getEnhancedFieldCropData();

            if (!fieldData) {
                fieldData = migrateToEnhancedFieldCropData();
            }

            if (fieldData) {
                setFieldCropData(fieldData);

                const initialZoneInputs: { [zoneId: string]: IrrigationInput } = {};
                const initialSelectedPipes: {
                    [zoneId: string]: { branch?: any; secondary?: any; main?: any };
                } = {};

                if (fieldData.zones.info.length > 1) {
                    fieldData.zones.info.forEach((zone) => {
                        initialZoneInputs[zone.id] = createFieldCropZoneInput(
                            zone,
                            fieldData,
                            fieldData.zones.info.length
                        );
                        initialSelectedPipes[zone.id] = {
                            branch: undefined,
                            secondary: undefined,
                            main: undefined,
                        };
                    });

                    setZoneInputs(initialZoneInputs);
                    setSelectedPipes(initialSelectedPipes);
                    setActiveZoneId(fieldData.zones.info[0].id);
                    handleZoneOperationModeChange('sequential');
                } else if (fieldData.zones.info.length === 1) {
                    const zone = fieldData.zones.info[0];
                    const singleInput = createFieldCropZoneInput(zone, fieldData, 1);
                    setZoneInputs({ [zone.id]: singleInput });
                    setSelectedPipes({
                        [zone.id]: { branch: undefined, secondary: undefined, main: undefined },
                    });
                    setActiveZoneId(zone.id);
                } else {
                    const singleInput = createSingleFieldCropInput(fieldData);
                    setZoneInputs({ 'main-area': singleInput });
                    setSelectedPipes({
                        'main-area': { branch: undefined, secondary: undefined, main: undefined },
                    });
                    setActiveZoneId('main-area');
                }
            } else {
                console.warn('⚠️ No field crop data found');
                router.visit('/field-map');
            }
        } else if (mode === 'garden') {
            setProjectMode('garden');
            
            // Check if we have a field ID - if so, prioritize database data over localStorage
            const fieldId = localStorage.getItem('currentFieldId');
            if (fieldId && !fieldId.startsWith('mock-')) {
                // Try to load from database first
                console.log('🔄 Attempting to load home garden data from database for field:', fieldId);
                loadFieldDataFromDatabase(fieldId).then((loadedFromDb) => {
                    if (loadedFromDb) {
                        console.log('✅ Loaded home garden data from database for field:', fieldId);
                        return; // Exit early since we loaded from database
                    }
                    
                    // Fallback to localStorage if database loading failed
                    console.log('🔄 Falling back to localStorage for home garden data');
                    loadGardenDataFromLocalStorage();
                }).catch((error) => {
                    console.warn('⚠️ Database loading failed, using localStorage for home garden data:', error);
                    loadGardenDataFromLocalStorage();
                });
            } else {
                // No field ID, use localStorage directly
                loadGardenDataFromLocalStorage();
            }
            
            // Helper function to load garden data from localStorage
            function loadGardenDataFromLocalStorage() {
                const gardenPlannerData = loadGardenData();
                if (gardenPlannerData) {
                    setGardenData(gardenPlannerData);
                    const stats = calculateGardenStatistics(gardenPlannerData);
                    setGardenStats(stats);

                    const initialZoneInputs: { [zoneId: string]: IrrigationInput } = {};
                    const initialSelectedPipes: {
                        [zoneId: string]: { branch?: any; secondary?: any; main?: any };
                    } = {};

                    if (stats.zones.length > 1) {
                        stats.zones.forEach((zone) => {
                            initialZoneInputs[zone.zoneId] = createGardenZoneInput(
                                zone,
                                stats,
                                stats.zones.length
                            );
                            initialSelectedPipes[zone.zoneId] = {
                                branch: undefined,
                                secondary: undefined,
                                main: undefined,
                            };
                        });

                        setZoneInputs(initialZoneInputs);
                        setSelectedPipes(initialSelectedPipes);
                        setActiveZoneId(stats.zones[0].zoneId);
                        handleZoneOperationModeChange('sequential');
                    } else {
                        const singleInput = createSingleGardenInput(stats);
                        setZoneInputs({ 'main-area': singleInput });
                        setSelectedPipes({
                            'main-area': { branch: undefined, secondary: undefined, main: undefined },
                        });
                        setActiveZoneId('main-area');
                    }
                }
            }
                } else {
            setProjectMode('horticulture');
            
            // โหลดข้อมูลระบบหัวฉีดและโซนจาก HorticultureResultsPage
            const horticultureSystemDataStr = localStorage.getItem('horticultureSystemData');
            let horticultureSystemData: any = null;
            if (horticultureSystemDataStr) {
                try {
                    horticultureSystemData = JSON.parse(horticultureSystemDataStr);
                    setHorticultureSystemData(horticultureSystemData);
                } catch (error) {
                    console.warn('Failed to parse horticulture system data:', error);
                }
            } else {
                console.warn('No horticultureSystemData found in localStorage');
            }
            
            // โหลดข้อมูลโปรเจกต์จาก localStorage โดยตรง (ไม่ใช้ฟังก์ชันเก่า)
            const currentProjectDataStr = localStorage.getItem('horticultureIrrigationData');
            let data: HorticultureProject | null = null;
            if (currentProjectDataStr) {
                try {
                    data = JSON.parse(currentProjectDataStr);
                    console.log('📊 Loaded project data:', {
                        hasTotalArea: !!data?.totalArea,
                        totalArea: data?.totalArea,
                        hasMainArea: !!data?.mainArea,
                        mainAreaLength: data?.mainArea?.length
                    });
                } catch (error) {
                    console.warn('Failed to parse current project data:', error);
                }
            } else {
                console.warn('No horticultureIrrigationData found in localStorage');
            }
            
            // สร้าง stats object แทนการใช้ getProjectStats()
            let stats: any = null;
            if (data) {
                console.log('📊 Creating stats from data:', {
                    totalArea: data.totalArea,
                    totalAreaInRai: data.totalArea / 1600,
                    plantsLength: data.plants?.length,
                    zonesLength: data.zones?.length
                });
                stats = {
                    totalAreaInRai: data.totalArea / 1600,
                    totalPlants: data.plants?.length || 0,
                    zoneDetails: data.zones?.map((zone: Zone) => ({
                        zoneId: zone.id,
                        zoneName: zone.name,
                        areaInRai: zone.area / 1600,
                        plantCount: zone.plantCount || 0
                    })) || []
                };
            }

            // ถ้าไม่มีข้อมูลโปรเจกต์ ให้สร้างข้อมูล default
            if (!data && horticultureSystemData) {
                data = {
                    projectName: 'Default Project',
                    totalArea: horticultureSystemData.zones[0]?.area || 1600,
                    zones: horticultureSystemData.zones.map((zone: any) => ({
                        id: zone.id,
                        name: zone.name,
                        plantCount: zone.plantCount,
                        area: zone.area
                    })),
                    plants: [],
                    useZones: horticultureSystemData.isMultipleZones,
                    irrigationZones: horticultureSystemData.isMultipleZones ? horticultureSystemData.zones : []
                };
                
                stats = {
                    totalAreaInRai: data.totalArea / 1600,
                    totalPlants: horticultureSystemData.totalPlants || 0,
                    zoneDetails: horticultureSystemData.zones.map((zone: any) => ({
                        zoneId: zone.id,
                        zoneName: zone.name,
                        areaInRai: zone.area / 1600,
                        plantCount: zone.plantCount || 0
                    }))
                };
            }

            if (data && stats) {
                setProjectData(data);
                setProjectStats(stats);

                // ตรวจสอบข้อมูลโซนจาก horticultureSystemData ก่อน
                if (horticultureSystemData && horticultureSystemData.isMultipleZones && horticultureSystemData.zones.length > 0) {
                    // Multiple zones based on horticultureSystemData
                    const initialZoneInputs: { [zoneId: string]: IrrigationInput } = {};
                    const initialSelectedPipes: {
                        [zoneId: string]: { branch?: any; secondary?: any; main?: any; emitter?: any };
                    } = {};

                    horticultureSystemData.zones.forEach((zone: any) => {


                        initialZoneInputs[zone.id] = {
                            farmSizeRai: formatNumber(zone.area / 1600, 3),
                            totalTrees: zone.plantCount,
                            waterPerTreeLiters: formatNumber(zone.waterNeedPerMinute || 50, 3), // ใช้ waterNeedPerMinute (ลิตร/นาที)
                            numberOfZones: horticultureSystemData.zones.length,
                            sprinklersPerTree: 1,
                            irrigationTimeMinutes: 20,
                            staticHeadM: 0,
                            pressureHeadM: 20,
                            pipeAgeYears: 0,
                            sprinklersPerBranch: Math.max(1, Math.ceil(zone.plantCount / 5)),
                            branchesPerSecondary: 1,
                            simultaneousZones: 1,
                            sprinklersPerLongestBranch: Math.max(1, Math.ceil(zone.plantCount / 5)),
                            branchesPerLongestSecondary: 1,
                            secondariesPerLongestMain: 1,
                            // ใช้ข้อมูลท่อจริงจาก Zone Details
                            longestBranchPipeM: zone.pipes?.branchPipes?.longest || 30,
                            totalBranchPipeM: zone.pipes?.branchPipes?.totalLength || 100,
                            longestSecondaryPipeM: zone.pipes?.subMainPipes?.longest || 0,
                            totalSecondaryPipeM: zone.pipes?.subMainPipes?.totalLength || 0,
                            longestMainPipeM: zone.pipes?.mainPipes?.longest || 0,
                            totalMainPipeM: zone.pipes?.mainPipes?.totalLength || 0,
                            longestEmitterPipeM: zone.pipes?.emitterPipes?.longest || 0,
                            totalEmitterPipeM: zone.pipes?.emitterPipes?.totalLength || 0,
                        };

                        initialSelectedPipes[zone.id] = {
                            branch: undefined,
                            secondary: undefined,
                            main: undefined,
                            emitter: undefined,
                        };
                    });

                    setZoneInputs(initialZoneInputs);
                    setSelectedPipes(initialSelectedPipes);
                    setActiveZoneId(horticultureSystemData.zones[0].id);
                    handleZoneOperationModeChange('sequential');
                    
                } else if (data && data.useZones && data.zones.length > 0) {
                    // Fallback to old zone detection method - แต่สร้าง input เองแทน
                    const initialZoneInputs: { [zoneId: string]: IrrigationInput } = {};
                    const initialSelectedPipes: {
                        [zoneId: string]: { branch?: any; secondary?: any; main?: any; emitter?: any };
                    } = {};

                            data.zones.forEach((zone) => {
                                initialZoneInputs[zone.id] = {
                                    farmSizeRai: formatNumber(zone.area / 1600, 3),
                                    totalTrees: zone.plantCount || 100,
                                    waterPerTreeLiters: formatNumber(50, 3), // default water per tree
                                    numberOfZones: data.zones.length,
                                    sprinklersPerTree: 1,
                                    irrigationTimeMinutes: 20,
                                    staticHeadM: 0,
                                    pressureHeadM: 20,
                                    pipeAgeYears: 0,
                                    sprinklersPerBranch: Math.max(1, Math.ceil(zone.plantCount / 5)),
                                    branchesPerSecondary: 1,
                                    simultaneousZones: 1,
                                    sprinklersPerLongestBranch: Math.max(1, Math.ceil(zone.plantCount / 5)),
                                    branchesPerLongestSecondary: 1,
                                    secondariesPerLongestMain: 1,
                                    longestBranchPipeM: 30,
                                    totalBranchPipeM: 100,
                                    longestSecondaryPipeM: 0,
                                    totalSecondaryPipeM: 0,
                                    longestMainPipeM: 0,
                                    totalMainPipeM: 0,
                                    longestEmitterPipeM: 0,
                                    totalEmitterPipeM: 0,
                                };

                        initialSelectedPipes[zone.id] = {
                            branch: undefined,
                            secondary: undefined,
                            main: undefined,
                            emitter: undefined,
                        };
                    });

                    setZoneInputs(initialZoneInputs);
                    setSelectedPipes(initialSelectedPipes);
                    setActiveZoneId(data.zones[0].id);

                    handleZoneOperationModeChange('sequential');
                } else {
                    // Single zone 
                    const singleInput: IrrigationInput = {
                        farmSizeRai: formatNumber(
                            horticultureSystemData?.zones?.[0]?.area / 1600 || 
                            data?.totalArea / 1600 || 
                            1, 
                            3
                        ),
                        totalTrees: 
                            horticultureSystemData?.zones?.[0]?.plantCount || 
                            data?.plants?.length || 
                            100,
                        waterPerTreeLiters: formatNumber(
                            horticultureSystemData?.zones?.[0]?.waterNeedPerMinute || 50, 
                            3
                        ),
                        numberOfZones: 1,
                        sprinklersPerTree: 1,
                        irrigationTimeMinutes: 20,
                        staticHeadM: 0,
                        pressureHeadM: 20,
                        pipeAgeYears: 0,
                        sprinklersPerBranch: 4,
                        branchesPerSecondary: 5,
                        simultaneousZones: 1,
                        sprinklersPerLongestBranch: 4,
                        branchesPerLongestSecondary: 5,
                        secondariesPerLongestMain: 1,
                        // ใช้ข้อมูลท่อจริงจาก Zone Details (single zone)
                        longestBranchPipeM: horticultureSystemData?.zones?.[0]?.pipes?.branchPipes?.longest || 30,
                        totalBranchPipeM: horticultureSystemData?.zones?.[0]?.pipes?.branchPipes?.totalLength || 100,
                        longestSecondaryPipeM: horticultureSystemData?.zones?.[0]?.pipes?.subMainPipes?.longest || 0,
                        totalSecondaryPipeM: horticultureSystemData?.zones?.[0]?.pipes?.subMainPipes?.totalLength || 0,
                        longestMainPipeM: horticultureSystemData?.zones?.[0]?.pipes?.mainPipes?.longest || 0,
                        totalMainPipeM: horticultureSystemData?.zones?.[0]?.pipes?.mainPipes?.totalLength || 0,
                        longestEmitterPipeM: horticultureSystemData?.zones?.[0]?.pipes?.emitterPipes?.longest || 0,
                        totalEmitterPipeM: horticultureSystemData?.zones?.[0]?.pipes?.emitterPipes?.totalLength || 0,
                    };
                    setZoneInputs({ 'main-area': singleInput });
                    setSelectedPipes({
                        'main-area': { branch: undefined, secondary: undefined, main: undefined, emitter: undefined },
                    });
                    setActiveZoneId('main-area');
                }
            } else {
                // ถ้าไม่มีข้อมูลเลย ให้สร้าง default
                const defaultInput: IrrigationInput = {
                    farmSizeRai: 1,
                    totalTrees: 100,
                    waterPerTreeLiters: 50,
                    numberOfZones: 1,
                    sprinklersPerTree: 1,
                    irrigationTimeMinutes: 20,
                    staticHeadM: 0,
                    pressureHeadM: 20,
                    pipeAgeYears: 0,
                    sprinklersPerBranch: 4,
                    branchesPerSecondary: 5,
                    simultaneousZones: 1,
                    sprinklersPerLongestBranch: 4,
                    branchesPerLongestSecondary: 5,
                    secondariesPerLongestMain: 1,
                    longestBranchPipeM: 30,
                    totalBranchPipeM: 100,
                    longestSecondaryPipeM: 0,
                    totalSecondaryPipeM: 0,
                    longestMainPipeM: 0,
                    totalMainPipeM: 0,
                    longestEmitterPipeM: 0,
                    totalEmitterPipeM: 0,
                };
                
                setZoneInputs({ 'main-area': defaultInput });
                setSelectedPipes({
                    'main-area': { branch: undefined, secondary: undefined, main: undefined, emitter: undefined },
                });
                setActiveZoneId('main-area');
            }
        }
    }, []);

    const currentSprinkler = zoneSprinklers[activeZoneId] || null;

    const handleSprinklerChange = (sprinkler: any) => {
        if (activeZoneId && sprinkler) {
            setZoneSprinklers((prev) => ({
                ...prev,
                [activeZoneId]: sprinkler,
            }));
        }
    };

    const handlePipeChange = (pipeType: 'branch' | 'secondary' | 'main' | 'emitter', pipe: any) => {
        if (activeZoneId) {
            setSelectedPipes((prev) => ({
                ...prev,
                [activeZoneId]: {
                    ...prev[activeZoneId],
                    [pipeType]: pipe,
                },
            }));
        }
    };

    const handlePumpChange = (pump: any) => {
        setSelectedPump(pump);
    };

    const allZoneData = useMemo(() => {
        return createZoneCalculationData();
    }, [zoneInputs, zoneSprinklers, zoneOperationMode, zoneOperationGroups]);

    const results = useCalculations(
        currentInput as IrrigationInput,
        currentSprinkler,
        allZoneData,
        zoneOperationGroups
    );

    const hasValidMainPipeData = results?.hasValidMainPipe ?? false;
    const hasValidSubmainPipeData = results?.hasValidSecondaryPipe ?? false;

    const handleInputChange = (input: IrrigationInput) => {
        if (activeZoneId) {
            setZoneInputs((prev) => ({
                ...prev,
                [activeZoneId]: input,
            }));
        }
    };

    const handleQuotationModalConfirm = () => {
        setShowQuotationModal(false);
        setShowQuotation(true);
    };

    const getEffectiveEquipment = () => {
        const currentZonePipes = selectedPipes[activeZoneId] || {};

        return {
            branchPipe: currentZonePipes.branch || results?.autoSelectedBranchPipe,
            secondaryPipe: currentZonePipes.secondary || results?.autoSelectedSecondaryPipe,
            mainPipe: currentZonePipes.main || results?.autoSelectedMainPipe,
            emitterPipe: currentZonePipes.emitter || results?.autoSelectedEmitterPipe,
            pump: selectedPump || results?.autoSelectedPump,
        };
    };

    const getZonesData = () => {
        if (projectMode === 'garden' && gardenStats) {
            return gardenStats.zones.map((z) => ({
                id: z.zoneId,
                name: z.zoneName,
                area: z.area,
                plantCount: z.sprinklerCount,
                totalWaterNeed: z.sprinklerCount * 50,
                plantData: null,
            }));
        }
        if (projectMode === 'field-crop' && fieldCropData) {
            return fieldCropData.zones.info.map((z) => {
                const assignedCropValue = fieldCropData.crops.zoneAssignments[z.id];
                const crop = assignedCropValue ? getCropByValue(assignedCropValue) : null;

                return {
                    id: z.id,
                    name: z.name,
                    area: z.area,
                    plantCount:
                        z.sprinklerCount || Math.max(1, Math.ceil(z.totalPlantingPoints / 10)),
                    totalWaterNeed: z.totalWaterRequirementPerDay,
                    plantData: crop
                        ? {
                              name: crop.name,
                              waterNeed: crop.waterRequirement || 50,
                              category: crop.category,
                          }
                        : null,
                };
            });
        }
        if (projectMode === 'greenhouse' && greenhouseData) {
            // Handle both processed data (with summary) and raw data (without summary)
            if (greenhouseData.summary?.plotStats) {
                return greenhouseData.summary.plotStats.map((p) => {
                    const crop = getCropByValue(p.cropType || '');

                    return {
                        id: p.plotId,
                        name: p.plotName,
                        area: p.area,
                        plantCount: p.production.totalPlants,
                        totalWaterNeed: p.production.waterRequirementPerIrrigation,
                        plantData: crop
                            ? {
                                  name: crop.name,
                                  waterNeed: crop.waterRequirement || 50,
                                  category: crop.category,
                              }
                            : null,
                    };
                });
            } else if (greenhouseData.rawData?.shapes) {
                // For raw data, return basic plot information
                const plots = greenhouseData.rawData?.shapes.filter((s) => s.type === 'plot');
                return plots.map((plot) => {
                    const crop = getCropByValue(plot.cropType || '');

                    return {
                        id: plot.id,
                        name: plot.name,
                        area: 100, // Default area for raw data
                        plantCount: 0, // Will be calculated later
                        totalWaterNeed: 0, // Will be calculated later
                        plantData: crop
                            ? {
                                  name: crop.name,
                                  waterNeed: crop.waterRequirement || 50,
                                  category: crop.category,
                              }
                            : null,
                    };
                });
            }
            return [];
        }
        // For horticulture projects, use irrigationZones instead of zones
        if (projectData?.irrigationZones && projectData.irrigationZones.length > 0) {
            return projectData.irrigationZones.map((zone: any) => ({
                id: zone.id,
                name: zone.name,
                area: zone.area || 0,
                plantCount: zone.plantCount || 0,
                totalWaterNeed: zone.totalWaterNeed || 0,
                plantData: zone.plantData || null,
            }));
        }
        return projectData?.zones || [];
    };

    const getZoneNameForSummary = (zoneId: string): string => {
        if (projectMode === 'garden' && gardenStats) {
            const zone = gardenStats.zones.find((z) => z.zoneId === zoneId);
            return zone?.zoneName || zoneId;
        }
        if (projectMode === 'field-crop' && fieldCropData) {
            const zone = fieldCropData.zones.info.find((z) => z.id === zoneId);
            return zone?.name || zoneId;
        }
        if (projectMode === 'greenhouse' && greenhouseData) {
            // Handle both processed data (with summary) and raw data (without summary)
            if (greenhouseData.summary?.plotStats) {
                const plot = greenhouseData.summary.plotStats.find((p) => p.plotId === zoneId);
                return plot?.plotName || zoneId;
            } else if (greenhouseData.rawData?.shapes) {
                // For raw data, find the shape by ID
                const shape = greenhouseData.rawData?.shapes.find((s) => s.id === zoneId);
                return shape?.name || zoneId;
            }
            return zoneId;
        }
        const zone = projectData?.zones.find((z) => z.id === zoneId);
        return zone?.name || zoneId;
    };

    const getActiveZone = () => {
        if (projectMode === 'garden' && gardenStats) {
            const zone = gardenStats.zones.find((z) => z.zoneId === activeZoneId);
            if (zone) {
                return {
                    id: zone.zoneId,
                    name: zone.zoneName,
                    area: zone.area,
                    plantCount: zone.sprinklerCount,
                    totalWaterNeed: zone.sprinklerCount * 50,
                    plantData: null,
                } as any;
            }
        }
        if (projectMode === 'field-crop' && fieldCropData) {
            const zone = fieldCropData.zones.info.find((z) => z.id === activeZoneId);
            if (zone) {
                const assignedCropValue = fieldCropData.crops.zoneAssignments[zone.id];
                const crop = assignedCropValue ? getCropByValue(assignedCropValue) : null;

                return {
                    id: zone.id,
                    name: zone.name,
                    area: zone.area,
                    plantCount: zone.totalPlantingPoints,
                    totalWaterNeed: zone.totalWaterRequirementPerDay,
                    plantData: crop
                        ? {
                              name: crop.name,
                              waterNeed: crop.waterRequirement || 50,
                              category: crop.category,
                          }
                        : null,
                } as any;
            }
        }
        if (projectMode === 'greenhouse' && greenhouseData) {
            // Handle both processed data (with summary) and raw data (without summary)
            if (greenhouseData.summary?.plotStats) {
                const plot = greenhouseData.summary.plotStats.find((p) => p.plotId === activeZoneId);
                if (plot) {
                    const crop = getCropByValue(plot.cropType || '');

                    return {
                        id: plot.plotId,
                        name: plot.plotName,
                        area: plot.area,
                        plantCount: plot.production.totalPlants,
                        totalWaterNeed: plot.production.waterRequirementPerIrrigation,
                        plantData: crop
                            ? {
                                  name: crop.name,
                                  waterNeed: crop.waterRequirement || 50,
                                  category: crop.category,
                              }
                            : null,
                    } as any;
                }
            } else if (greenhouseData.rawData?.shapes) {
                // For raw data, find the shape by ID
                const shape = greenhouseData.rawData?.shapes.find((s) => s.id === activeZoneId);
                if (shape) {
                    const crop = getCropByValue(shape.cropType || '');

                    return {
                        id: shape.id,
                        name: shape.name,
                        area: 100, // Default area for raw data
                        plantCount: 0, // Will be calculated later
                        totalWaterNeed: 0, // Will be calculated later
                        plantData: crop
                            ? {
                                  name: crop.name,
                                  waterNeed: crop.waterRequirement || 50,
                                  category: crop.category,
                              }
                            : null,
                    } as any;
                }
            }
        }
        return projectData?.zones.find((z) => z.id === activeZoneId);
    };

    // ฟังก์ชันดึงข้อมูลพื้นที่โซนจาก horticultureSystemData หรือข้อมูลโซนที่มีอยู่
    const getZoneAreaData = (): {
        zoneId: string;
        zoneName: string;
        areaInRai: number;
        coordinates?: { lat: number; lng: number }[];
    } | undefined => {
        if (!activeZoneId) return undefined;

        // ลองดึงจาก horticultureSystemData ก่อน (จาก HorticultureResultsPage.tsx)
        if (horticultureSystemData && horticultureSystemData.zones) {
            const zoneFromHorticultureData = horticultureSystemData.zones.find(
                (zone: any) => zone.id === activeZoneId
            );
            
            if (zoneFromHorticultureData) {
                return {
                    zoneId: zoneFromHorticultureData.id as string,
                    zoneName: zoneFromHorticultureData.name as string,
                    areaInRai: zoneFromHorticultureData.area ? zoneFromHorticultureData.area / 1600 : 0, // แปลงจากตร.ม. เป็นไร่
                    coordinates: undefined, // ไม่มี coordinates ใน horticultureSystemData
                };
            }
        }

        // ถ้าไม่เจอใน horticultureSystemData ให้ลองดึงจากข้อมูลโซนปกติ
        const activeZone = getActiveZone();
        if (activeZone && activeZone.area) {
            return {
                zoneId: activeZone.id as string,
                zoneName: (activeZone.name || `โซน ${activeZone.id}`) as string,
                areaInRai: activeZone.area / 1600, // แปลงจากตร.ม. เป็นไร่
                coordinates: undefined,
            };
        }

        return undefined;
    };

    const hasEssentialData =
        (projectMode === 'horticulture' && projectData && projectStats) ||
        (projectMode === 'garden' && gardenData && gardenStats) ||
        (projectMode === 'field-crop' && fieldCropData) ||
        (projectMode === 'greenhouse' && greenhouseData);

    if (!hasEssentialData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 p-6 text-white">
                <div className="text-center">
                    <div className="mb-6 text-6xl">
                        {projectMode === 'garden'
                            ? '🏡'
                            : projectMode === 'field-crop'
                              ? '🌾'
                              : projectMode === 'greenhouse'
                                ? '🏠'
                                : '🌱'}
                    </div>
                    <h1 className="mb-4 text-2xl font-bold text-blue-400">
                        {projectMode === 'garden'
                            ? 'Chaiyo Irrigation System'
                            : projectMode === 'field-crop'
                              ? 'Chaiyo Field Crop Irrigation'
                              : projectMode === 'greenhouse'
                                ? 'Chaiyo Greenhouse Irrigation'
                                : 'Chaiyo Irrigation System'}
                    </h1>
                    <p className="mb-6 text-gray-300">{t('ไม่พบข้อมูลโครงการ')}</p>
                    <button
                        onClick={() =>
                            router.visit(
                                projectMode === 'garden'
                                    ? '/home-garden-planner'
                                    : projectMode === 'field-crop'
                                      ? '/field-map'
                                      : projectMode === 'greenhouse'
                                        ? '/greenhouse-crop'
                                        : '/horticulture/planner'
                            )
                        }
                        className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                    >
                        📐 {t('ไปหน้าวางแผน')}
                    </button>
                </div>
            </div>
        );
    }

    // Add debugging for loading state
    console.log('🔍 Loading state check:', {
        hasResults: !!results,
        hasCurrentInput: !!currentInput,
        activeZoneId,
        zoneInputsKeys: Object.keys(zoneInputs),
        projectData: !!projectData,
        projectMode
    });

    if (!results || !currentInput) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 p-6 text-white">
                <div className="text-center">
                    <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-400"></div>
                    <p className="text-gray-300">{t('กำลังโหลดข้อมูล...')}</p>
                    <p className="text-xs text-gray-500 mt-2">
                        Results: {!!results}, CurrentInput: {!!currentInput}, ActiveZone: {activeZoneId}
                    </p>
                </div>
            </div>
        );
    }

    const effectiveEquipment = getEffectiveEquipment();
    const zones = getZonesData();
    const activeZone = getActiveZone();

    const extraPipeInput = zoneInputs[activeZoneId]?.extraPipePerSprinkler;
    let selectedExtraPipe: any = null;
    if (extraPipeInput && extraPipeInput.pipeId && extraPipeInput.lengthPerHead > 0) {
        let pipe: any = null;
        const pipes = selectedPipes[activeZoneId] || {};
        if (pipes.branch && pipes.branch.id === extraPipeInput.pipeId) pipe = pipes.branch;
        if (pipes.secondary && pipes.secondary.id === extraPipeInput.pipeId) pipe = pipes.secondary;
        if (pipes.main && pipes.main.id === extraPipeInput.pipeId) pipe = pipes.main;
        if (!pipe && results) {
            if (
                results.autoSelectedBranchPipe &&
                results.autoSelectedBranchPipe.id === extraPipeInput.pipeId
            )
                pipe = results.autoSelectedBranchPipe;
            if (
                results.autoSelectedSecondaryPipe &&
                results.autoSelectedSecondaryPipe.id === extraPipeInput.pipeId
            )
                pipe = results.autoSelectedSecondaryPipe;
            if (
                results.autoSelectedMainPipe &&
                results.autoSelectedMainPipe.id === extraPipeInput.pipeId
            )
                pipe = results.autoSelectedMainPipe;
        }
        if (pipe) {
            selectedExtraPipe = {
                pipe,
                lengthPerHead: extraPipeInput.lengthPerHead,
                totalLength: (results?.totalSprinklers || 0) * extraPipeInput.lengthPerHead,
            };
        }
    }

    const handleOpenQuotationModal = () => {
        if (projectData) {
            setQuotationDataCustomer((prev) => ({
                ...prev,
                projectName: projectData.projectName || prev.projectName,
                name: projectData.customerName || prev.name,
            }));
        }
        setShowQuotationModal(true);
    };



    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />
            
            {/* Action Buttons */}
            <div className="max-w-8xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-white">
                            {projectMode === 'garden'
                                ? t('🏡 สวนบ้าน')
                                : projectMode === 'field-crop'
                                  ? t('🌾 พืชไร่')
                                  : projectMode === 'greenhouse'
                                    ? t('🏠 โรงเรือน')
                                    : t('🌱 พืชสวน')} - {t('ผลิตภัณฑ์')}
                        </h1>
                        
                        {/* Save Status Indicator */}
                        {lastSaved && (
                            <div className="flex items-center gap-2 text-sm text-green-400">
                                <span>💾</span>
                                <span>{t('บันทึกล่าสุด:')} {lastSaved.toLocaleTimeString()}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {/* Edit Mode Toggle */}
                        <button
                            onClick={handleEditProject}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                isEditing
                                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                            title={`${isEditing ? t('ปิดโหมดแก้ไข') : t('เปิดโหมดแก้ไข')} (Ctrl+E)`}
                        >
                            {isEditing ? '✏️' : '✏️'} {isEditing ? t('ปิดแก้ไข') : t('แก้ไข')}
                        </button>
                        
                        {/* Save Project Button */}
                        <button
                            onClick={handleSaveProject}
                            disabled={isSaving}
                            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={`${t('บันทึกโครงการ')} (Ctrl+S)`}
                        >
                            {isSaving ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                                    {t('กำลังบันทึก...')}
                                </>
                            ) : (
                                <>💾 {t('บันทึก')}</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Mode Banner */}
            {isEditing && (
                <div className="max-w-8xl mx-auto px-6 pb-2">
                    <div className="rounded-lg bg-yellow-600/20 border border-yellow-500/50 p-3">
                        <div className="flex items-center gap-2 text-yellow-300">
                            <span className="text-lg">✏️</span>
                            <span className="font-medium">{t('โหมดแก้ไขเปิดใช้งาน - คุณสามารถแก้ไขการตั้งค่าต่างๆ ได้')}</span>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="max-w-8xl mx-auto p-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <div className="sticky top-6">
                            <div 
                                className="rounded-lg bg-gray-800 p-4 overflow-auto max-h-[90vh]"
                                style={getEditModeStyle('project-map')}
                            >
                                {renderEditIndicator('project-map')}
                                <div className="mb-3 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-blue-400">
                                        📐 {t('แผนผัง')}
                                    </h2>
                                    {/* Enhanced image status indicator */}
                                    {imageLoading && (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-400"></div>
                                            <span className="text-xs text-blue-400">
                                                Loading...
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {imageLoading ? (
                                    <div className="flex h-[280px] items-center justify-center rounded-lg bg-gray-700">
                                        <div className="text-center">
                                            <div className="mb-2 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-400"></div>
                                            <p className="text-sm text-gray-400">กำลังโหลดภาพ...</p>
                                        </div>
                                    </div>
                                ) : projectImage ? (
                                    <div
                                        className="group relative flex items-center justify-center"
                                        style={{ minHeight: 0 }}
                                    >
                                        <img
                                            src={projectImage}
                                            alt={`${
                                                projectMode === 'garden'
                                                    ? t('สวนบ้าน')
                                                    : projectMode === 'field-crop'
                                                      ? t('พืชไร่')
                                                      : projectMode === 'greenhouse'
                                                        ? t('โรงเรือน')
                                                        : t('พืชสวน')
                                            } Project`}
                                            className="aspect-video max-h-[280px] w-full cursor-pointer rounded-lg object-contain transition-transform hover:scale-105"
                                            style={{ maxHeight: '280px', minHeight: '280px' }}
                                            onClick={() => setShowImageModal(true)}
                                            onError={() => {
                                                console.warn('Failed to load project image');
                                                setImageLoadError('Failed to load image');
                                                setProjectImage(null);
                                            }}
                                        />
                                        <div className="absolute right-2 top-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                            <label className="h-6 w-6 cursor-pointer rounded-full bg-blue-600 text-xs hover:bg-blue-700">
                                                📷
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    className="hidden"
                                                />
                                            </label>
                                            <button
                                                onClick={handleImageDelete}
                                                className="h-6 w-6 rounded-full bg-red-600 text-xs hover:bg-red-700"
                                                title="Delete image"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border-2 border-dashed border-gray-600">
                                        <label className="flex h-[280px] cursor-pointer flex-col items-center justify-center hover:border-blue-500">
                                            <div className="text-4xl text-gray-500">📷</div>
                                            <p className="mt-2 text-sm text-gray-400">
                                                {projectMode === 'garden'
                                                    ? t('เพิ่มรูปแผนผังสวนบ้าน')
                                                    : projectMode === 'field-crop'
                                                      ? t('เพิ่มรูปแผนผังพืชไร่')
                                                      : projectMode === 'greenhouse'
                                                        ? t('เพิ่มรูปแผนผังโรงเรือน')
                                                        : t('เพิ่มรูปแผนผังพืชสวน')}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {projectMode === 'garden'
                                                    ? t('หรือส่งออกจากหน้าสรุปผลสวนบ้าน')
                                                    : projectMode === 'field-crop'
                                                      ? t('หรือส่งออกจากหน้าสรุปผลพืชไร่')
                                                      : projectMode === 'greenhouse'
                                                        ? t('หรือส่งออกจากหน้าสรุปผลโรงเรือน')
                                                        : t('หรือส่งออกจากหน้าสรุปผลพืชสวน')}
                                            </p>
                                            {imageLoadError && (
                                                <p className="mt-2 text-xs text-red-400">
                                                    {imageLoadError}
                                                </p>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>
                            {zones.length > 1 && (
                                <div className="mb-4 mt-4 flex flex-wrap gap-2">
                                    {zones.map((zone) => {
                                        const isActive = activeZoneId === zone.id;
                                        const hasSprinkler = !!zoneSprinklers[zone.id];
                                        
                                        // หาสีของโซนจาก horticultureSystemData
                                        let zoneColor = null;
                                        if (horticultureSystemData && horticultureSystemData.zones) {
                                            const systemZone = horticultureSystemData.zones.find((hz: any) => hz.id === zone.id);
                                            zoneColor = systemZone?.color;
                                        }

                                        const buttonStyle = zoneColor
                                            ? {
                                                backgroundColor: zoneColor,
                                                color: 'black',
                                            }
                                            : {};

                                        return (
                                            <button
                                                key={zone.id}
                                                onClick={() => setActiveZoneId(zone.id)}
                                                className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                                    isActive
                                                        ? 'border-2 border-blue-600 text-blue-400 ring-2 ring-blue-400'
                                                        : 'opacity-80'
                                                }`}
                                                style={buttonStyle}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>{zone.name}</span>
                                                    {hasSprinkler && (
                                                        <span className="text-xs text-green-700">
                                                            ✓
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {zones.length > 1 && (
                                <div className="mb-6 rounded-lg bg-gray-800 p-4">
                                    <div className="rounded bg-blue-900 p-3">
                                        <h4 className="mb-2 text-sm font-medium text-blue-300">
                                            🎯 {t('เลือกรูปแบบการเปิดโซน:')}
                                        </h4>
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                            <label className="flex cursor-pointer items-center gap-2 rounded bg-blue-800 p-1 hover:bg-blue-700">
                                                <input
                                                    type="radio"
                                                    name="zoneOperation"
                                                    value="sequential"
                                                    checked={zoneOperationMode === 'sequential'}
                                                    onChange={() =>
                                                        handleZoneOperationModeChange('sequential')
                                                    }
                                                    className="rounded"
                                                />
                                                <div>
                                                    <p className="text-xs font-medium">
                                                        {t('เปิดทีละโซน')}
                                                    </p>
                                                </div>
                                            </label>
                                            <label className="flex cursor-pointer items-center gap-2 rounded bg-blue-800 p-1 hover:bg-blue-700">
                                                <input
                                                    type="radio"
                                                    name="zoneOperation"
                                                    value="simultaneous"
                                                    checked={zoneOperationMode === 'simultaneous'}
                                                    onChange={() =>
                                                        handleZoneOperationModeChange(
                                                            'simultaneous'
                                                        )
                                                    }
                                                    className="rounded"
                                                />
                                                <div>
                                                    <p className="text-xs font-medium">
                                                        {t('เปิดพร้อมกันทุกโซน')}
                                                    </p>
                                                </div>
                                            </label>
                                            <label className="flex cursor-pointer items-center gap-2 rounded bg-blue-800 p-1 hover:bg-blue-700">
                                                <input
                                                    type="radio"
                                                    name="zoneOperation"
                                                    value="custom"
                                                    checked={zoneOperationMode === 'custom'}
                                                    onChange={() =>
                                                        handleZoneOperationModeChange('custom')
                                                    }
                                                    className="rounded"
                                                />
                                                <div>
                                                    <p className="text-xs font-medium">
                                                        {t('กำหนดเอง')}
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {zoneOperationMode === 'custom' && (
                                        <div className="mt-4 rounded bg-purple-900 p-3">
                                            <div className="mb-3 flex items-center justify-between">
                                                <h4 className="text-sm font-medium text-purple-300">
                                                    📋 {t('จัดการกลุ่มการเปิดโซน:')}
                                                </h4>
                                                <button
                                                    onClick={addOperationGroup}
                                                    className="rounded bg-purple-600 px-3 py-1 text-xs hover:bg-purple-700"
                                                >
                                                    + {t('เพิ่มกลุ่ม')}
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {zoneOperationGroups.map((group) => (
                                                    <div
                                                        key={group.id}
                                                        className="rounded bg-purple-800 p-2"
                                                    >
                                                        <div className="mb-2 flex items-center justify-between">
                                                            <p className="text-sm font-medium text-purple-200">
                                                                {group.label} ({t('ลำดับที่')}{' '}
                                                                {group.order})
                                                                {group.zones.length === 0 && (
                                                                    <span className="ml-2 text-red-300">
                                                                        ({t('ไม่มีโซน')})
                                                                    </span>
                                                                )}
                                                            </p>
                                                            {zoneOperationGroups.length > 1 && (
                                                                <button
                                                                    onClick={() =>
                                                                        removeOperationGroup(
                                                                            group.id
                                                                        )
                                                                    }
                                                                    className="text-xs text-red-400 hover:text-red-300"
                                                                >
                                                                    {t('ลบ')}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                                            {zones.map((zone) => (
                                                                <label
                                                                    key={zone.id}
                                                                    className="flex cursor-pointer items-center gap-1 text-xs"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={group.zones.includes(
                                                                            zone.id
                                                                        )}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                const otherGroups =
                                                                                    zoneOperationGroups.filter(
                                                                                        (g) =>
                                                                                            g.id !==
                                                                                            group.id
                                                                                    );
                                                                                otherGroups.forEach(
                                                                                    (g) => {
                                                                                        updateOperationGroup(
                                                                                            g.id,
                                                                                            g.zones.filter(
                                                                                                (
                                                                                                    z
                                                                                                ) =>
                                                                                                    z !==
                                                                                                    zone.id
                                                                                            )
                                                                                        );
                                                                                    }
                                                                                );
                                                                                updateOperationGroup(
                                                                                    group.id,
                                                                                    [
                                                                                        ...group.zones,
                                                                                        zone.id,
                                                                                    ]
                                                                                );
                                                                            } else {
                                                                                updateOperationGroup(
                                                                                    group.id,
                                                                                    group.zones.filter(
                                                                                        (z) =>
                                                                                            z !==
                                                                                            zone.id
                                                                                    )
                                                                                );
                                                                            }
                                                                        }}
                                                                        className="rounded"
                                                                    />
                                                                    <span>{zone.name}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-2 text-xs text-purple-200">
                                                💡 {t('โซนที่อยู่ในกลุ่มเดียวกันจะเปิดพร้อมกัน')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div 
                        className="space-y-6 lg:col-span-8"
                        style={getEditModeStyle('main-content')}
                    >
                        <div className="mb-6 rounded-lg bg-gray-800 p-4">
                            <h3 className="mb-3 text-lg font-semibold text-purple-400">
                                ⚡ {t('ตัวเลือกปั๊มน้ำ')}
                            </h3>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={showPumpOption}
                                        onChange={(e) => setShowPumpOption(e.target.checked)}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium">
                                        {t('ต้องการใช้ปั๊มน้ำในระบบ')}
                                    </span>
                                </label>
                                {!showPumpOption && (
                                    <p className="text-sm text-gray-400">
                                        ({t('ใช้แรงดันจากระบบประปาบ้าน')})
                                    </p>
                                )}
                            </div>
                        </div>
                        <InputForm
                            key={activeZoneId}
                            input={currentInput}
                            onInputChange={handleInputChange}
                            selectedSprinkler={currentSprinkler}
                            activeZone={activeZone}
                            projectMode={projectMode}
                            zoneAreaData={getZoneAreaData()}
                        />

                        <SprinklerSelector
                            selectedSprinkler={currentSprinkler}
                            onSprinklerChange={handleSprinklerChange}
                            results={results}
                            activeZone={activeZone}
                            allZoneSprinklers={zoneSprinklers}
                            projectMode={projectMode}
                        />

                        {currentSprinkler && (
                            <>
                            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
                                    <PipeSelector
                                        pipeType="branch"
                                        results={results}
                                        input={currentInput}
                                        selectedPipe={effectiveEquipment.branchPipe}
                                        onPipeChange={(pipe) => handlePipeChange('branch', pipe)}
                                        horticultureSystemData={horticultureSystemData}
                                        activeZoneId={activeZoneId}
                                        selectedSprinkler={currentSprinkler}
                                        projectMode={projectMode}
                                    />

                                    {hasValidSubmainPipeData ? (
                                        <PipeSelector
                                            pipeType="secondary"
                                            results={results}
                                            input={currentInput}
                                            selectedPipe={effectiveEquipment.secondaryPipe}
                                            onPipeChange={(pipe) =>
                                                handlePipeChange('secondary', pipe)
                                            }
                                            horticultureSystemData={horticultureSystemData}
                                            activeZoneId={activeZoneId}
                                            selectedSprinkler={currentSprinkler}
                                            projectMode={projectMode}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center rounded-lg bg-gray-800 p-8">
                                            <div className="text-center text-gray-500">
                                                <div className="mb-2 text-4xl">➖</div>
                                                <p>ไม่ใช้ท่อรอง</p>
                                            </div>
                                        </div>
                                    )}

                                    {hasValidMainPipeData && (
                                        <PipeSelector
                                            pipeType="main"
                                            results={results}
                                            input={currentInput}
                                            selectedPipe={effectiveEquipment.mainPipe}
                                            onPipeChange={(pipe) => handlePipeChange('main', pipe)}
                                            horticultureSystemData={horticultureSystemData}
                                            activeZoneId={activeZoneId}
                                            selectedSprinkler={currentSprinkler}
                                            projectMode={projectMode}
                                        />
                                    )}

                                    {(currentInput.longestEmitterPipeM && currentInput.longestEmitterPipeM > 0) ? (
                                        <PipeSelector
                                            pipeType="emitter"
                                            results={results}
                                            input={currentInput}
                                            selectedPipe={effectiveEquipment.emitterPipe}
                                            onPipeChange={(pipe) => handlePipeChange('emitter', pipe)}
                                            horticultureSystemData={horticultureSystemData}
                                            activeZoneId={activeZoneId}
                                            selectedSprinkler={currentSprinkler}
                                            projectMode={projectMode}
                                        />
                                    ) : projectMode === 'horticulture' ? (
                                        <div className="flex items-center justify-center rounded-lg bg-gray-800 p-8">
                                            <div className="text-center text-gray-500">
                                                <div className="mb-2 text-4xl">➖</div>
                                                <p>ไม่ใช้ท่อย่อยแยก</p>
                                            </div>
                                        </div>
                                    ) : null}

                                   
                                </div>

                                {/* สรุปการคำนวณระบบท่อทั้งหมด */}
                                <PipeSystemSummary
                                    horticultureSystemData={horticultureSystemData}
                                    activeZoneId={activeZoneId}
                                    selectedPipes={{
                                        branch: effectiveEquipment.branchPipe,
                                        secondary: effectiveEquipment.secondaryPipe,
                                        main: effectiveEquipment.mainPipe,
                                        emitter: effectiveEquipment.emitterPipe
                                    }}
                                    sprinklerPressure={
                                        horticultureSystemData?.sprinklerConfig?.pressureBar
                                            ? {
                                                pressureBar: horticultureSystemData.sprinklerConfig.pressureBar,
                                                headM: horticultureSystemData.sprinklerConfig.pressureBar * 10,
                                                head20PercentM: (horticultureSystemData.sprinklerConfig.pressureBar * 10) * 0.2
                                            }
                                            : undefined
                                    }
                                    projectMode={projectMode}
                                />

                                {(projectMode === 'horticulture' || showPumpOption) && (
                                        <PumpSelector
                                            results={results}
                                            selectedPump={effectiveEquipment.pump}
                                            onPumpChange={handlePumpChange}
                                            zoneOperationGroups={zoneOperationGroups}
                                            zoneInputs={zoneInputs}
                                            zoneOperationMode={zoneOperationMode}
                                            simultaneousZonesCount={
                                                zoneOperationMode === 'simultaneous'
                                                    ? zones.length
                                                    : zoneOperationMode === 'custom'
                                                      ? Math.max(
                                                            ...zoneOperationGroups.map(
                                                                (g) => g.zones.length
                                                            )
                                                        )
                                                      : 1
                                            }
                                            selectedZones={zones.map((z) => z.id)}
                                            projectMode={projectMode}
                                        />
                                    )}
                                
                                <CalculationSummary
                                    results={results}
                                    input={currentInput}
                                    selectedSprinkler={currentSprinkler}
                                    selectedPump={effectiveEquipment.pump}
                                    selectedBranchPipe={effectiveEquipment.branchPipe}
                                    selectedSecondaryPipe={effectiveEquipment.secondaryPipe}
                                    selectedMainPipe={effectiveEquipment.mainPipe}
                                    activeZone={activeZone}
                                    selectedZones={zones.map((z) => z.id)}
                                    allZoneSprinklers={zoneSprinklers}
                                    projectMode={projectMode}
                                    showPump={projectMode === 'horticulture' || showPumpOption}
                                    simultaneousZonesCount={
                                        zoneOperationMode === 'simultaneous'
                                            ? zones.length
                                            : zoneOperationMode === 'custom'
                                              ? Math.max(
                                                    ...zoneOperationGroups.map(
                                                        (g) => g.zones.length
                                                    )
                                                )
                                              : 1
                                    }
                                    zoneOperationGroups={zoneOperationGroups}
                                    getZoneName={getZoneNameForSummary}
                                    fieldCropData={fieldCropData}
                                    greenhouseData={greenhouseData}
                                />

                                

                                <CostSummary
                                    results={results}
                                    zoneSprinklers={zoneSprinklers}
                                    selectedPipes={selectedPipes}
                                    selectedPump={effectiveEquipment.pump}
                                    activeZoneId={activeZoneId}
                                    projectData={projectData as any}
                                    gardenData={gardenData}
                                    gardenStats={gardenStats}
                                    zoneInputs={zoneInputs}
                                    onQuotationClick={handleOpenQuotationModal}
                                    projectMode={projectMode}
                                    showPump={projectMode === 'horticulture' || showPumpOption}
                                    fieldCropData={fieldCropData}
                                    greenhouseData={greenhouseData}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showImageModal && projectImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
                    onClick={() => setShowImageModal(false)}
                >
                    <div
                        className="relative max-h-[90vh] max-w-[90vw]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowImageModal(false)}
                            className="absolute -right-4 -top-4 rounded-full bg-red-600 p-2 text-white hover:bg-red-700"
                        >
                            ×
                        </button>
                        <div className="relative flex h-[90vh] w-[90vw] items-center justify-center">
                            <img
                                src={projectImage}
                                alt={`${
                                    projectMode === 'garden'
                                        ? t('สวนบ้าน')
                                        : projectMode === 'field-crop'
                                          ? t('พืชไร่')
                                          : projectMode === 'greenhouse'
                                            ? t('โรงเรือน')
                                            : t('พืชสวน')
                                } Project`}
                                className="max-h-full max-w-full rounded-lg"
                            />
                            <div className="absolute left-4 top-4">
                                <div
                                    className={`rounded-lg px-3 py-1 text-sm font-medium ${
                                        projectMode === 'garden'
                                            ? 'bg-green-600 text-white'
                                            : projectMode === 'field-crop'
                                              ? 'bg-yellow-600 text-white'
                                              : projectMode === 'greenhouse'
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-orange-600 text-white'
                                    }`}
                                >
                                    {projectMode === 'garden'
                                        ? t('🏡 สวนบ้าน')
                                        : projectMode === 'field-crop'
                                          ? t('🌾 พืชไร่')
                                          : projectMode === 'greenhouse'
                                            ? t('🏠 โรงเรือน')
                                            : t('🌱 พืชสวน')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <QuotationModal
                show={showQuotationModal}
                quotationData={quotationData}
                quotationDataCustomer={quotationDataCustomer}
                onQuotationDataChange={setQuotationData}
                onQuotationDataCustomerChange={setQuotationDataCustomer}
                onClose={() => setShowQuotationModal(false)}
                onConfirm={handleQuotationModalConfirm}
                t={t}
            />

            <QuotationDocument
                show={showQuotation}
                results={results}
                quotationData={quotationData}
                quotationDataCustomer={quotationDataCustomer}
                selectedSprinkler={currentSprinkler}
                selectedPump={effectiveEquipment.pump}
                selectedBranchPipe={effectiveEquipment.branchPipe}
                selectedSecondaryPipe={effectiveEquipment.secondaryPipe}
                selectedMainPipe={effectiveEquipment.mainPipe}
                selectedExtraPipe={selectedExtraPipe}
                projectImage={projectImage}
                projectData={projectData}
                gardenData={gardenData}
                zoneSprinklers={zoneSprinklers}
                selectedPipes={selectedPipes}
                onClose={() => setShowQuotation(false)}
                projectMode={projectMode}
                showPump={projectMode === 'horticulture' || showPumpOption}
            />
            <Footer />

            {/* Save Confirmation Modal */}
            {showSaveConfirmModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
                    <div className="relative z-[10000] mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
                        <div className="mb-4 flex items-center">
                            <div className="flex-shrink-0">
                                <svg
                                    className="h-6 w-6 text-blue-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-lg font-medium text-white">
                                    {t('save_confirmation')}
                                </h3>
                            </div>
                        </div>
                        <div className="mb-6">
                            <p className="text-gray-300">
                                {t('save_confirmation_message')}
                            </p>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowSaveConfirmModal(false)}
                                disabled={isSaving}
                                className="rounded px-4 py-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-50"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={() => performSaveProject('new')}
                                disabled={isSaving}
                                className="rounded bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                            >
                                {isSaving ? (
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
                                        {t('saving')}
                                    </>
                                ) : (
                                    t('save_as_new')
                                )}
                            </button>
                            <button
                                onClick={() => performSaveProject('update')}
                                disabled={isSaving}
                                className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSaving ? (
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
                                        {t('saving')}
                                    </>
                                ) : (
                                    t('update_existing')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
