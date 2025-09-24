import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import Navbar from '../../components/Navbar';
import { useLanguage } from '../../contexts/LanguageContext';
import HorticultureMapComponent from '../../components/horticulture/HorticultureMapComponent';
import { getCropByValue } from './choose-crop';
import type { FieldData } from './pipe-generate';
import { parseCompletedSteps, toCompletedStepsCsv } from '../../utils/stepUtils';

// Zone interface removed - zones are handled in zone-obstacle page only

interface Obstacle {
	id: string;
	coordinates: { lat: number; lng: number }[];
	type: 'water_source' | 'other' | 'building' | 'rock';
	name?: string;
}

interface StepData {
    id: number;
    key: string;
    title: string;
    description: string;
    route: string;
}

interface IrrigationPositions {
	sprinklers: { lat: number; lng: number }[];
	pivots: { lat: number; lng: number }[];
	dripTapes: { lat: number; lng: number }[];
	waterJets: { lat: number; lng: number }[];
}

// Debug logger toggle (set to true only when actively debugging rendering)
const __DEBUG_LOGS__ = false;
const dbg = (...args: unknown[]) => { if (__DEBUG_LOGS__) console.log(...args); };

// Helper function to safely save data to localStorage with size optimization
const safeSetItem = (key: string, data: unknown, maxSizeKB: number = 5000) => {
	try {
		const dataString = JSON.stringify(data);
		const dataSizeKB = new Blob([dataString]).size / 1024;
		
		if (dataSizeKB > maxSizeKB) {
			console.warn(`Data size (${dataSizeKB.toFixed(2)}KB) exceeds limit (${maxSizeKB}KB), optimizing...`);
			
			// Optimize by reducing precision
			const dataObj = data as Record<string, unknown>;
			const optimizedData = {
				...dataObj,
				mainArea: Array.isArray(dataObj.mainArea) ? dataObj.mainArea.map((coord: unknown) => {
					const c = coord as { lat: number; lng: number };
					return {
						lat: Math.round(c.lat * 1000000) / 1000000,
						lng: Math.round(c.lng * 1000000) / 1000000
					};
				}) : [],
				obstacles: Array.isArray(dataObj.obstacles) ? dataObj.obstacles.map((obs: unknown) => {
					const o = obs as { coordinates: unknown[]; [key: string]: unknown };
					return {
						...o,
						coordinates: Array.isArray(o.coordinates) ? o.coordinates.map((coord: unknown) => {
							const c = coord as { lat: number; lng: number };
							return {
								lat: Math.round(c.lat * 1000000) / 1000000,
								lng: Math.round(c.lng * 1000000) / 1000000
							};
						}) : []
					};
				}) : [],
				plantPoints: Array.isArray(dataObj.plantPoints) ? dataObj.plantPoints.map((point: unknown) => {
					const p = point as { lat: number; lng: number; cropType: string; isValid: boolean };
					return {
						lat: Math.round(p.lat * 1000000) / 1000000,
						lng: Math.round(p.lng * 1000000) / 1000000,
						cropType: p.cropType,
						isValid: p.isValid
					};
				}) : [],
				irrigationPositions: (() => {
					const irrigationPos = dataObj.irrigationPositions as Record<string, unknown>;
					return {
						sprinklers: Array.isArray(irrigationPos?.sprinklers) ? 
							irrigationPos.sprinklers.map((pos: unknown) => {
								const p = pos as { lat: number; lng: number };
								return {
									lat: Math.round(p.lat * 1000000) / 1000000,
									lng: Math.round(p.lng * 1000000) / 1000000
								};
							}) : [],
						pivots: Array.isArray(irrigationPos?.pivots) ? 
							irrigationPos.pivots.map((pos: unknown) => {
								const p = pos as { lat: number; lng: number };
								return {
									lat: Math.round(p.lat * 1000000) / 1000000,
									lng: Math.round(p.lng * 1000000) / 1000000
								};
							}) : [],
						dripTapes: Array.isArray(irrigationPos?.dripTapes) ? 
							irrigationPos.dripTapes.map((pos: unknown) => {
								const p = pos as { lat: number; lng: number };
								return {
									lat: Math.round(p.lat * 1000000) / 1000000,
									lng: Math.round(p.lng * 1000000) / 1000000
								};
							}) : [],
						waterJets: Array.isArray(irrigationPos?.waterJets) ? 
							irrigationPos.waterJets.map((pos: unknown) => {
								const p = pos as { lat: number; lng: number };
								return {
									lat: Math.round(p.lat * 1000000) / 1000000,
									lng: Math.round(p.lng * 1000000) / 1000000
								};
							}) : []
					};
				})()
			};
			
			const optimizedString = JSON.stringify(optimizedData);
			const optimizedSizeKB = new Blob([optimizedString]).size / 1024;
			
			if (optimizedSizeKB > maxSizeKB) {
				console.warn('Data still too large after optimization, further reducing plant points...');
				// Further reduce plant points precision
				const dataObj = optimizedData as Record<string, unknown>;
				const furtherOptimizedData = {
					...dataObj,
					plantPoints: Array.isArray(dataObj.plantPoints) ? dataObj.plantPoints.map((point: unknown) => {
						const p = point as { lat: number; lng: number; cropType: string; isValid: boolean };
						return {
							lat: Math.round(p.lat * 100000) / 100000, // 5 decimal places
							lng: Math.round(p.lng * 100000) / 100000,
							cropType: p.cropType,
							isValid: p.isValid
						};
					}) : []
				};
				
				const furtherOptimizedString = JSON.stringify(furtherOptimizedData);
				const furtherOptimizedSizeKB = new Blob([furtherOptimizedString]).size / 1024;
				
				if (furtherOptimizedSizeKB > maxSizeKB) {
					console.warn('Data still too large, sampling plant points...');
					// Sample plant points (keep every 2nd point)
					const sampledPlantPoints = Array.isArray(furtherOptimizedData.plantPoints) ? 
						furtherOptimizedData.plantPoints.filter((_, index) => index % 2 === 0) : [];
					const finalData = {
						...furtherOptimizedData,
						plantPoints: sampledPlantPoints
					};
					localStorage.setItem(key, JSON.stringify(finalData));
				} else {
					localStorage.setItem(key, furtherOptimizedString);
				}
			} else {
				localStorage.setItem(key, optimizedString);
			}
		} else {
			localStorage.setItem(key, dataString);
		}
		return true;
	} catch (error) {
		console.error('Error saving to localStorage:', error);
		return false;
	}
};

export default function IrrigationGenerate({
	selectedCrops = [],
	mainArea = [],
	obstacles = [],
	mapCenter = { lat: 13.7563, lng: 100.5018 },
	mapZoom = 18,
	crops,
	currentStep = 2,
	completedSteps = '',
	mainAreaData,
	obstaclesData,
	plantPointsData,
	areaRai,
	perimeterMeters,
	rotationAngle,
	rowSpacing,
	plantSpacing,
}: {
	selectedCrops?: string[];
	mainArea?: { lat: number; lng: number }[];
	obstacles?: Obstacle[];
	mapCenter?: { lat: number; lng: number };
	mapZoom?: number;
	crops?: string;
	currentStep?: number;
	completedSteps?: string;
	mainAreaData?: string;
	obstaclesData?: string;
	plantPointsData?: string;
	areaRai?: string;
	perimeterMeters?: string;
	rotationAngle?: string;
	rowSpacing?: string;
	plantSpacing?: string;
}) {
	const { t } = useLanguage();

	// Keep UI responsive during heavy loops - using inline Promise for better performance
	
	// Parse data from URL parameters
	const [parsedMainArea, setParsedMainArea] = useState<{ lat: number; lng: number }[]>([]);
	const [parsedObstacles, setParsedObstacles] = useState<Obstacle[]>([]);
	const [parsedPlantPoints, setParsedPlantPoints] = useState<{ id: string; lat: number; lng: number; cropType: string; isValid: boolean }[]>([]);
	const [realPlantCount, setRealPlantCount] = useState<number>(0); // Track real plant count for calculations
	const [parsedAreaRai, setParsedAreaRai] = useState<number | null>(null);
	const [parsedPerimeterMeters, setParsedPerimeterMeters] = useState<number | null>(null);
	const [parsedRotationAngle, setParsedRotationAngle] = useState<number>(0);
	const [parsedRowSpacing, setParsedRowSpacing] = useState<Record<string, number>>({});
	const [parsedPlantSpacing, setParsedPlantSpacing] = useState<Record<string, number>>({});
	const [parsedSelectedCrops, setParsedSelectedCrops] = useState<string[]>([]);
	const [parsedMapCenter, setParsedMapCenter] = useState<{ lat: number; lng: number }>({ lat: 13.7563, lng: 100.5018 });
	const [parsedMapZoom, setParsedMapZoom] = useState<number>(18);
	const hasInitializedRef = useRef<boolean>(false);

	// Plant points state
	const [hideAllPoints, setHideAllPoints] = useState<boolean>(false); // Hide all points toggle

	// Parse data on component mount
	useEffect(() => {
		if (hasInitializedRef.current) return;
		hasInitializedRef.current = true;
		
		// On fresh page load (no URL parameters), make behavior match the Reset button
		// Treat as "Reset irrigation only" while keeping existing field data
		const hasUrlParams = !!(crops || completedSteps || mainAreaData || obstaclesData || plantPointsData || areaRai || perimeterMeters || rotationAngle || rowSpacing || plantSpacing);
		
		if (!hasUrlParams) {
			try {
				const fieldDataStr = localStorage.getItem('fieldCropData');
				if (fieldDataStr) {
					const fieldData = JSON.parse(fieldDataStr) as FieldData;
					
					// Load field data first before sanitizing
					if (fieldData.mainArea) {
						dbg('Loading mainArea from localStorage:', fieldData.mainArea.length, 'points');
						setParsedMainArea(fieldData.mainArea);
					}
					
					if (fieldData.obstacles) {
						dbg('Loading obstacles from localStorage:', fieldData.obstacles.length, 'items');
						setParsedObstacles(fieldData.obstacles);
					}
					
					if (fieldData.plantPoints) {
						dbg('Loading plantPoints from localStorage:', fieldData.plantPoints.length, 'points');
						setParsedPlantPoints(fieldData.plantPoints);
					}
					
					if (fieldData.areaRai) {
						dbg('Loading areaRai from localStorage:', fieldData.areaRai);
						setParsedAreaRai(fieldData.areaRai);
					}
					
					if (fieldData.perimeterMeters) {
						dbg('Loading perimeterMeters from localStorage:', fieldData.perimeterMeters);
						setParsedPerimeterMeters(fieldData.perimeterMeters);
					}
					
					if (fieldData.rotationAngle) {
						dbg('Loading rotationAngle from localStorage:', fieldData.rotationAngle);
						setParsedRotationAngle(fieldData.rotationAngle);
					}
					
					if (fieldData.rowSpacing) {
						dbg('Loading rowSpacing from localStorage:', fieldData.rowSpacing);
						setParsedRowSpacing(fieldData.rowSpacing);
					}
					
					if (fieldData.plantSpacing) {
						dbg('Loading plantSpacing from localStorage:', fieldData.plantSpacing);
						setParsedPlantSpacing(fieldData.plantSpacing);
					}
					
					if (fieldData.selectedCrops) {
						dbg('Loading selectedCrops from localStorage:', fieldData.selectedCrops);
						setParsedSelectedCrops(fieldData.selectedCrops);
					}
					
					// Load map state
					if (fieldData.mapCenter) {
						dbg('Loading mapCenter from localStorage:', fieldData.mapCenter);
						setParsedMapCenter(fieldData.mapCenter);
					}
					
					if (fieldData.mapZoom) {
						dbg('Loading mapZoom from localStorage:', fieldData.mapZoom);
						setParsedMapZoom(fieldData.mapZoom);
					}
					
					if (typeof fieldData.hideAllPoints === 'boolean') {
						console.log('Irrigation - Loading hideAllPoints from localStorage (fresh load):', fieldData.hideAllPoints);
						setHideAllPoints(fieldData.hideAllPoints);
					}
					
					// Then sanitize irrigation data
					const sanitized: FieldData = {
						...fieldData,
						selectedIrrigationType: '',
						irrigationCounts: { sprinkler_system: 0, pivot: 0, drip_tape: 0, water_jet_tape: 0 },
						irrigationSettings: {
							sprinkler_system: { coverageRadius: 8, overlap: 0, flow: 10, pressure: 2.5 },
							pivot: { coverageRadius: 165, overlap: 0, flow: 50, pressure: 3.0 },
							drip_tape: { emitterSpacing: 20, placement: 'along_rows', side: 'left', flow: 0.24, pressure: 1.0 },
							water_jet_tape: { emitterSpacing: 20, placement: 'along_rows', side: 'left', flow: 1.5, pressure: 1.5 }
						},
						irrigationPositions: { sprinklers: [], pivots: [], dripTapes: [], waterJets: [] },
						hideAllPoints: fieldData.hideAllPoints // Preserve hideAllPoints state
					};
					safeSetItem('fieldCropData', sanitized);
				}
			} catch (e) {
				console.error('Error sanitizing irrigation data on fresh load:', e);
			}
			// Clear irrigation overlays if map is loaded
			if (mapRef.current) {
				irrigationMarkersRef.current.forEach(marker => marker.setMap(null));
				irrigationMarkersRef.current = [];
				irrigationCirclesRef.current.forEach(circle => circle.setMap(null));
				irrigationCirclesRef.current = [];
			}
		}
		
		// Parse selectedCrops from crops parameter
		if (crops) {
			const cropList = crops.split(',').filter(crop => crop.trim());
			setParsedSelectedCrops(cropList);
		}
		
		// Load data from localStorage if available (back navigation or fresh reload with stored data)
		const shouldLoadFromStorage = (() => {
			try { return !!localStorage.getItem('fieldCropData'); } catch { return false; }
		})();
		if (hasUrlParams || shouldLoadFromStorage) {
			try {
				dbg('Checking localStorage for fieldCropData...');
				const fieldDataStr = localStorage.getItem('fieldCropData');
				dbg('localStorage fieldCropData:', fieldDataStr ? 'found' : 'not found');
				if (fieldDataStr) {
					const fieldData = JSON.parse(fieldDataStr) as FieldData;
					dbg('Loaded field data from localStorage:', fieldData);
				
					if (fieldData.mainArea) {
						dbg('Setting parsedMainArea:', fieldData.mainArea.length, 'points');
						setParsedMainArea(fieldData.mainArea);
					}
					
					if (fieldData.obstacles) {
						dbg('Setting parsedObstacles:', fieldData.obstacles.length, 'items');
						dbg('Obstacles data:', fieldData.obstacles);
						setParsedObstacles(fieldData.obstacles);
					}
					
					if (fieldData.plantPoints) {
						dbg('Setting parsedPlantPoints:', fieldData.plantPoints.length, 'points');
						setParsedPlantPoints(fieldData.plantPoints);
						
						// Extract real count if available (from initial-area.tsx with real count)
						const plantPointsWithRealCount = fieldData.plantPoints as typeof fieldData.plantPoints & { __realCount?: number };
						const realCount = plantPointsWithRealCount.__realCount || fieldData.plantPoints.length;
						setRealPlantCount(realCount);
						dbg('Real plant count:', realCount);
					}
					
					if (fieldData.areaRai) {
						dbg('Setting parsedAreaRai:', fieldData.areaRai);
						setParsedAreaRai(fieldData.areaRai);
					}
					
					if (fieldData.perimeterMeters) {
						dbg('Setting parsedPerimeterMeters:', fieldData.perimeterMeters);
						setParsedPerimeterMeters(fieldData.perimeterMeters);
					}
					
					if (fieldData.rotationAngle) {
						dbg('Setting parsedRotationAngle:', fieldData.rotationAngle);
						setParsedRotationAngle(fieldData.rotationAngle);
					}
					
					if (fieldData.rowSpacing) {
						dbg('Setting parsedRowSpacing:', fieldData.rowSpacing);
						setParsedRowSpacing(fieldData.rowSpacing);
					}
					
					if (fieldData.plantSpacing) {
						dbg('Setting parsedPlantSpacing:', fieldData.plantSpacing);
						setParsedPlantSpacing(fieldData.plantSpacing);
					}
					
					// Load map state
					if (fieldData.mapCenter) {
						dbg('Setting parsedMapCenter:', fieldData.mapCenter);
						setParsedMapCenter(fieldData.mapCenter);
					}
					
					if (fieldData.mapZoom) {
						dbg('Setting parsedMapZoom:', fieldData.mapZoom);
						setParsedMapZoom(fieldData.mapZoom);
					}
					
					if (typeof fieldData.hideAllPoints === 'boolean') {
						console.log('Irrigation - Loading hideAllPoints from localStorage (with URL params):', fieldData.hideAllPoints);
						setHideAllPoints(fieldData.hideAllPoints);
					}
					
					// Load irrigation data if exists
					if (fieldData.selectedIrrigationType) {
						setSelectedIrrigationType(fieldData.selectedIrrigationType);
					}
					
					if (fieldData.irrigationCounts) {
						setIrrigationCounts(fieldData.irrigationCounts as typeof irrigationCounts);
					}
					
					if (fieldData.totalWaterRequirement) {
						// Will be recalculated based on current data
					}
					
					if (fieldData.irrigationSettings) {
						setIrrigationSettings(fieldData.irrigationSettings as typeof irrigationSettings);
					}
					
					if (fieldData.irrigationPositions) {
						setIrrigationPositions(fieldData.irrigationPositions);
					}
					
					// Note: Distance overlays will be recreated from obstacle data
					// distanceOverlaysByObstacle is not saved due to circular reference
				} else {
					dbg('No field data found in localStorage');
				}
			} catch (e) {
				console.error('Error loading field data from localStorage:', e);
			}
		}
	}, [areaRai, completedSteps, crops, mainAreaData, obstaclesData, perimeterMeters, plantPointsData, plantSpacing, rotationAngle, rowSpacing, selectedCrops]);

	// Use parsed data or fallback to props
	const finalMainArea = parsedMainArea.length > 0 ? parsedMainArea : mainArea;
	const finalObstacles = parsedObstacles.length > 0 ? parsedObstacles : obstacles;
	const finalPlantPoints = useMemo(() => (
		parsedPlantPoints.length > 0 ? parsedPlantPoints : []
	), [parsedPlantPoints]);

	
	const finalAreaRai = parsedAreaRai !== null ? parsedAreaRai : null;
	const finalPerimeterMeters = parsedPerimeterMeters !== null ? parsedPerimeterMeters : null;
	const finalRotationAngle = parsedRotationAngle !== 0 ? parsedRotationAngle : 0;
	const finalRowSpacing = Object.keys(parsedRowSpacing).length > 0 ? parsedRowSpacing : {};
	const finalPlantSpacing = Object.keys(parsedPlantSpacing).length > 0 ? parsedPlantSpacing : {};
	const finalSelectedCrops = parsedSelectedCrops.length > 0 ? parsedSelectedCrops : selectedCrops;
	const finalMapCenter = parsedMapCenter.lat !== 13.7563 || parsedMapCenter.lng !== 100.5018 ? parsedMapCenter : mapCenter;
	const finalMapZoom = parsedMapZoom !== 18 ? parsedMapZoom : mapZoom;
	
	
	// (moved below irrigationPositions state)

	// Calculate map center from main area if available, or use saved position
	const calculatedMapCenter = finalMainArea.length >= 3 
		? {
			lat: finalMainArea.reduce((sum, coord) => sum + coord.lat, 0) / finalMainArea.length,
			lng: finalMainArea.reduce((sum, coord) => sum + coord.lng, 0) / finalMainArea.length
		}
		: finalMapCenter;
	
	// Map references
	const mapRef = useRef<google.maps.Map | null>(null);
	const mainAreaPolygonRef = useRef<google.maps.Polygon | null>(null);
	const obstaclePolygonsRef = useRef<google.maps.Polygon[]>([]);
	const plantPointMarkersRef = useRef<google.maps.Marker[]>([]);
	const distanceOverlaysRef = useRef<Record<string, { lines: google.maps.Polyline[]; labels: google.maps.Marker[] }>>({});
	const irrigationMarkersRef = useRef<google.maps.Marker[]>([]);
	const irrigationCirclesRef = useRef<google.maps.Circle[]>([]);

	// State management
	const [isMapLoaded, setIsMapLoaded] = useState(false);
	const [selectedIrrigationType, setSelectedIrrigationType] = useState<string>('');
	const [isGeneratingIrrigation, setIsGeneratingIrrigation] = useState(false);
	const [irrigationCounts, setIrrigationCounts] = useState({
		sprinkler_system: 0,
		pivot: 0,
		drip_tape: 0,
		water_jet_tape: 0,
	});
	
	// เพิ่ม state สำหรับเก็บตำแหน่งอุปกรณ์ irrigation
	const [irrigationPositions, setIrrigationPositions] = useState<IrrigationPositions>({
		sprinklers: [],
		pivots: [],
		dripTapes: [],
		waterJets: []
	});

	// Require at least one generated irrigation type before proceeding
	const hasGeneratedIrrigation = (
		irrigationPositions.sprinklers.length > 0 ||
		irrigationPositions.pivots.length > 0 ||
		irrigationPositions.dripTapes.length > 0 ||
		irrigationPositions.waterJets.length > 0
	);
	
	// Irrigation settings for different types
	const [irrigationSettings, setIrrigationSettings] = useState({
		sprinkler_system: {
			coverageRadius: 8, // 1-15m
			overlap: 0, // 0-50%
			flow: 10, // L/min
			pressure: 2.5, // bar
		},
		pivot: {
			coverageRadius: 165, // 80-250m
			overlap: 0, // 0-50%
			flow: 50, // L/min
			pressure: 3.0, // bar
		},
		drip_tape: {
			emitterSpacing: 20, // 10,15,20,30cm
			placement: 'along_rows', // 'along_rows' | 'staggered'
			side: 'left', // 'left' | 'right'
			flow: 0.24, // L/min per emitter (fixed in UI)
			pressure: 1.0, // bar (display only)
		},
		water_jet_tape: {
			emitterSpacing: 20, // 10,20,30cm
			placement: 'along_rows', // 'along_rows' | 'staggered'
			side: 'left', // 'left' | 'right'
			flow: 1.5, // L/min (adjustable)
			pressure: 1.5, // bar (adjustable)
		},
	});

	// Calculate total water requirement
	const totalWaterRequirement = useMemo(() => {
		// Get water requirement per plant for the primary crop
		const primaryCrop = finalSelectedCrops[0];
		const crop = getCropByValue(primaryCrop);
		const waterPerPlant = crop ? crop.waterRequirement : 0;
		
		// Calculate total water requirement for all plants using real count
		const totalWaterRequirement = waterPerPlant * realPlantCount;
		
		return totalWaterRequirement;
	}, [finalSelectedCrops, realPlantCount]);

	const handleBack = () => {
		// Update completed steps automatically
		const updatedCompletedSteps = updateCompletedSteps();
		
		// Store the actual parsed data in localStorage to preserve all information including irrigation data
		const allData: FieldData = {
			selectedCrops: finalSelectedCrops,
			mainArea: parsedMainArea.length > 0 ? parsedMainArea : finalMainArea,
			zones: [],
			obstacles: parsedObstacles.length > 0 ? parsedObstacles : finalObstacles,
			plantPoints: parsedPlantPoints.length > 0 ? parsedPlantPoints : finalPlantPoints,
			pipes: [],
			areaRai: parsedAreaRai !== null ? parsedAreaRai : finalAreaRai,
			perimeterMeters: parsedPerimeterMeters !== null ? parsedPerimeterMeters : finalPerimeterMeters,
			rotationAngle: parsedRotationAngle,
			rowSpacing: Object.keys(parsedRowSpacing).length > 0 ? parsedRowSpacing : finalRowSpacing,
			plantSpacing: Object.keys(parsedPlantSpacing).length > 0 ? parsedPlantSpacing : finalPlantSpacing,
			selectedIrrigationType,
			irrigationCounts,
			totalWaterRequirement,
			irrigationSettings,
			irrigationPositions,
			mapCenter: parsedMapCenter || finalMapCenter,
			mapZoom: parsedMapZoom || finalMapZoom,
			hideAllPoints, // Save hideAllPoints state
		};
		try { safeSetItem('fieldCropData', allData); } catch { /* ignore storage errors */ }
		
		router.get('/step1-field-area', { 
			crops: crops || selectedCrops.join(','),
			currentStep: 1,
			completedSteps: updatedCompletedSteps,
		});
	};

	const steps: StepData[] = [
		{
			id: 1,
			key: 'initial-area',
			title: t('Initial Area'),
			description: t('Set up the initial area for your field'),
			route: '/step1-field-area'
		},
		{
			id: 2,
			key: 'irrigation-generate',
			title: t('Irrigation Generate'),
			description: t('Generate irrigation system and settings'),
			route: '/step2-irrigation-system'
		},
		{
			id: 3,
			key: 'zone-obstacle',
			title: t('Zone Obstacle'),
			description: t('Define zones and obstacles'),
			route: '/step3-zones-obstacles'
		},
		{
			id: 4,
			key: 'pipe-generate',
			title: t('Pipe Generate'),
			description: t('Generate pipe layout and connections'),
			route: '/step4-pipe-system'
		}
	];

	const persistIrrigation = () => {
		try {
			const existingData = localStorage.getItem('fieldCropData');
			let fieldData: FieldData = existingData ? (JSON.parse(existingData) as FieldData) : {
				selectedCrops: finalSelectedCrops,
				mainArea: finalMainArea,
				zones: [],
				obstacles: finalObstacles,
				plantPoints: finalPlantPoints,
				pipes: [],
				areaRai: finalAreaRai,
				perimeterMeters: finalPerimeterMeters,
				rotationAngle: finalRotationAngle,
				rowSpacing: finalRowSpacing,
				plantSpacing: finalPlantSpacing,
				selectedIrrigationType: '',
				irrigationCounts: { sprinkler_system: 0, pivot: 0, drip_tape: 0, water_jet_tape: 0 },
				totalWaterRequirement: 0,
				irrigationSettings,
				irrigationPositions,
				mapCenter: calculatedMapCenter,
				mapZoom: finalMapZoom,
				hideAllPoints: false, // Default value for new data
			};
			fieldData = {
				...fieldData,
				selectedCrops: finalSelectedCrops,
				mainArea: finalMainArea,
				obstacles: finalObstacles,
				plantPoints: finalPlantPoints,
				areaRai: finalAreaRai,
				perimeterMeters: finalPerimeterMeters,
				rotationAngle: finalRotationAngle,
				rowSpacing: finalRowSpacing,
				plantSpacing: finalPlantSpacing,
				mapCenter: calculatedMapCenter,
				mapZoom: finalMapZoom,
				selectedIrrigationType,
				irrigationSettings,
				irrigationCounts,
				totalWaterRequirement,
				irrigationPositions,
				hideAllPoints, // Save hideAllPoints state
			};
			safeSetItem('fieldCropData', fieldData);
		} catch {
			// ignore storage errors
		}
	};

	const handleStepClick = (step: StepData) => {
		// Check if all 4 steps are completed
		const parsedSteps = parseCompletedSteps(completedSteps);
		const allStepsCompleted = parsedSteps.length >= 4 && parsedSteps.includes(1) && parsedSteps.includes(2) && parsedSteps.includes(3) && parsedSteps.includes(4);
		
		// If all steps are completed, allow free navigation
		if (allStepsCompleted) {
			persistIrrigation();
			const params = {
				crops: crops || selectedCrops.join(','),
				currentStep: step.id,
				completedSteps: completedSteps
			};
			router.get(step.route, params);
			return;
		}
		
		// Original logic for incomplete steps
		// Gate: must generate irrigation before moving to zones
		if (step.id === 3 && !hasGeneratedIrrigation) {
			alert(t('Please generate at least one Irrigation Type before continuing to Zones'));
			return;
		}
		// Persist current irrigation state
		persistIrrigation();
		// Update completed steps before navigating
		const updatedCompletedSteps = updateCompletedSteps();
		
		const params = {
			crops: crops || selectedCrops.join(','),
			currentStep: step.id,
			completedSteps: updatedCompletedSteps
		};
		router.get(step.route, params);
	};

	// Helper function to check if current step is completed
	const isCurrentStepCompleted = () => {
		switch (currentStep) {
			case 1: // Initial Area
				return finalMainArea.length >= 3;
			case 2: // Irrigation Generate
				// Do not auto-complete on data presence; only mark as completed on Next
				return false;
			case 3: // Zone Obstacle
				// This will be handled in the zone-obstacle page
				return false;
			case 4: // Pipe Generate
				// This will be handled in the pipe-generate page
				return false;
			default:
				return false;
		}
	};

	// Helper function to update completed steps
	const updateCompletedSteps = () => {
		const existing = parseCompletedSteps(completedSteps);
		let result = existing;
		if (isCurrentStepCompleted()) {
			result = Array.from(new Set([...existing, currentStep]));
		}
		return toCompletedStepsCsv(result);
	};

	const handleNext = () => {
		// Guard: must generate at least one irrigation type before proceeding to zones
		if (!hasGeneratedIrrigation) {
			alert(t('Please generate at least one Irrigation Type before continuing to Zones'));
			return;
		}

		// บันทึกข้อมูล irrigation ลง localStorage
		try {
			const existingData = localStorage.getItem('fieldCropData');
			let fieldData: FieldData = existingData ? (JSON.parse(existingData) as FieldData) : {
				selectedCrops: finalSelectedCrops,
				mainArea: finalMainArea,
				zones: [],
				obstacles: finalObstacles,
				plantPoints: finalPlantPoints,
				pipes: [],
				areaRai: finalAreaRai,
				perimeterMeters: finalPerimeterMeters,
				rotationAngle: finalRotationAngle,
				rowSpacing: finalRowSpacing,
				plantSpacing: finalPlantSpacing,
				selectedIrrigationType: '',
				irrigationCounts: { sprinkler_system: 0, pivot: 0, drip_tape: 0, water_jet_tape: 0 },
				totalWaterRequirement: 0,
				irrigationSettings,
				irrigationPositions,
				mapCenter: calculatedMapCenter,
				mapZoom: finalMapZoom,
				hideAllPoints: false, // Default value for new data
			};
			
			// เพิ่มข้อมูล irrigation ใหม่
			fieldData = {
				...fieldData,
				selectedCrops: finalSelectedCrops,
				mainArea: finalMainArea,
				obstacles: finalObstacles,
				plantPoints: finalPlantPoints,
				areaRai: finalAreaRai,
				perimeterMeters: finalPerimeterMeters,
				rotationAngle: finalRotationAngle,
				rowSpacing: finalRowSpacing,
				plantSpacing: finalPlantSpacing,
				mapCenter: calculatedMapCenter,
				mapZoom: finalMapZoom,
				// Irrigation
				selectedIrrigationType,
				irrigationSettings,
				irrigationCounts,
				totalWaterRequirement,
				irrigationPositions,
				hideAllPoints, // Save hideAllPoints state
			};
			
			safeSetItem('fieldCropData', fieldData);
			
		} catch (error) {
			console.error('Error saving irrigation data to localStorage:', error);
		}
		
		// Update completed steps automatically
		const updatedCompletedSteps = updateCompletedSteps();
		
		// ส่งข้อมูลผ่าน URL parameters (minimal)
		const params = {
			crops: crops || selectedCrops.join(','),
			currentStep: 3,
			// Ensure step 2 is marked completed when proceeding to zones
			completedSteps: toCompletedStepsCsv([...parseCompletedSteps(updatedCompletedSteps), 2]),
		};
		
		router.get('/step3-zones-obstacles', params);
	};

	// Helper function to calculate point size based on point count
	const calculatePointSize = useCallback((pointCount: number): number => {
		if (pointCount >= 5000) {
			return 6 * 0.4; // 60% reduction (40% of original size)
		} else if (pointCount >= 2000) {
			return 6 * 0.6; // 40% reduction (60% of original size)
		} else if (pointCount >= 800) {
			return 6 * 0.8; // 20% reduction (80% of original size)
		} else {
			return 6; // Original size
		}
	}, []);

	// Helper function to filter points based on zoom level and total point count
	const filterPointsByZoom = useCallback((points: { lat: number; lng: number; cropType: string; isValid: boolean }[], zoom: number, totalPointCount: number): { lat: number; lng: number; cropType: string; isValid: boolean }[] => {
		// If we have fewer than 800 points, show all points regardless of zoom
		if (totalPointCount < 800) {
			return points;
		}

		// Calculate maximum reduction factor based on total point count
		let maxReductionFactor = 1; // No reduction by default
		
		if (totalPointCount >= 5000) {
			maxReductionFactor = 4; // Up to 4x reduction (show 1/4 of points)
		} else if (totalPointCount >= 2000) {
			maxReductionFactor = 3; // Up to 3x reduction (show 1/3 of points)
		} else if (totalPointCount >= 800) {
			maxReductionFactor = 2; // Up to 2x reduction (show 1/2 of points)
		}

		// Calculate zoom-based reduction (5 levels: zoom 20, 19, 18, 17, 16)
		let reductionFactor = 1;
		
		if (zoom >= 20) {
			// Zoom 20+: show all points
			reductionFactor = 1;
		} else if (zoom >= 19) {
			// Zoom 19: 25% of max reduction
			reductionFactor = 1 + (maxReductionFactor - 1) * 0.25;
		} else if (zoom >= 18) {
			// Zoom 18: 50% of max reduction
			reductionFactor = 1 + (maxReductionFactor - 1) * 0.5;
		} else if (zoom >= 17) {
			// Zoom 17: 75% of max reduction
			reductionFactor = 1 + (maxReductionFactor - 1) * 0.75;
		} else {
			// Zoom < 17: maximum reduction
			reductionFactor = maxReductionFactor;
		}

		// If no reduction needed, return all points
		if (reductionFactor <= 1) {
			return points;
		}

		// Sample points based on reduction factor
		const step = Math.ceil(reductionFactor);
		return points.filter((_, index) => index % step === 0);
	}, []);

	const handleMapLoad = useCallback((map: google.maps.Map) => {
		mapRef.current = map;
		setIsMapLoaded(true);
		
		// Add zoom change listener
		map.addListener('zoom_changed', () => {
			const newZoom = map.getZoom() || 18;
			setParsedMapZoom(newZoom);
		});
	}, []);



	// Fit map to main area when main area changes
	useEffect(() => {
		if (mapRef.current && finalMainArea.length >= 3) {
			const bounds = new google.maps.LatLngBounds();
			finalMainArea.forEach(coord => {
				bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
			});
			mapRef.current.fitBounds(bounds);
		}
	}, [finalMainArea]);

	const handleIrrigationTypeSelect = (type: string) => {
		// Clear all existing irrigation overlays when switching types
		irrigationMarkersRef.current.forEach(marker => marker.setMap(null));
		irrigationMarkersRef.current = [];
		irrigationCirclesRef.current.forEach(circle => circle.setMap(null));
		irrigationCirclesRef.current = [];
		
		// Reset irrigation counts when switching types
		setIrrigationCounts({
			sprinkler_system: 0,
			pivot: 0,
			drip_tape: 0,
			water_jet_tape: 0,
		});
		
		// Clear irrigation positions when switching types
		setIrrigationPositions({
			sprinklers: [],
			pivots: [],
			dripTapes: [],
			waterJets: []
		});
		
		setSelectedIrrigationType(type);
	};

	// Function for updating irrigation settings
	const handleSettingsChange = (type: string, field: string, value: number | string) => {
		setIrrigationSettings(prev => ({
			...prev,
			[type]: {
				...prev[type as keyof typeof prev],
				[field]: value,
			},
		}));
	};

	// Helper function to check if point is inside polygon
	const isPointInPolygon = useCallback((point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]): boolean => {
		let inside = false;
		const x = point.lat;
		const y = point.lng;
		
		for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
			const xi = polygon[i].lat;
			const yi = polygon[i].lng;
			const xj = polygon[j].lat;
			const yj = polygon[j].lng;
			
			if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
				inside = !inside;
			}
		}
		
		return inside;
	}, []);

	// Helper function to check if point is inside any obstacle
	const isPointInObstacle = useCallback((point: { lat: number; lng: number }): boolean => {
		return finalObstacles.some(obstacle => {
			if (obstacle.coordinates.length < 3) return false;
			return isPointInPolygon(point, obstacle.coordinates);
		});
	}, [finalObstacles, isPointInPolygon]);

	// Optimized generateSprinklerSystem function with better performance and resource management
	const generateSprinklerSystem = useCallback(async () => {
		if (!mapRef.current || finalMainArea.length < 3) return;
		
		setIsGeneratingIrrigation(true);
		
		try {
			// Clear existing irrigation overlays
			irrigationMarkersRef.current.forEach(marker => marker.setMap(null));
			irrigationMarkersRef.current = [];
			irrigationCirclesRef.current.forEach(circle => circle.setMap(null));
			irrigationCirclesRef.current = [];
			
			const radius = irrigationSettings.sprinkler_system.coverageRadius;
			const overlap = irrigationSettings.sprinkler_system.overlap / 100;
			const effectiveSpacing = radius * 2 * (1 - overlap);
			const rotationAngleRad = (finalRotationAngle * Math.PI) / 180;
			const bufferDistance = effectiveSpacing * 0.3;
			
			// Pre-calculate trigonometric values for better performance
			const cosA = Math.cos(-rotationAngleRad);
			const sinA = Math.sin(-rotationAngleRad);
			const cosBack = Math.cos(rotationAngleRad);
			const sinBack = Math.sin(rotationAngleRad);
			
			// Optimized geometry helper functions
			const computeCentroid = (points: { lat: number; lng: number }[]) => {
				if (points.length === 0) return { lat: 0, lng: 0 };
				let sumLat = 0, sumLng = 0;
				for (const p of points) {
					sumLat += p.lat;
					sumLng += p.lng;
				}
				return { lat: sumLat / points.length, lng: sumLng / points.length };
			};
			
			const toLocalXY = (p: { lat: number; lng: number }, origin: { lat: number; lng: number }) => {
				const latFactor = 111000;
				const lngFactor = 111000 * Math.cos((origin.lat * Math.PI) / 180);
				return {
					x: (p.lng - origin.lng) * lngFactor,
					y: (p.lat - origin.lat) * latFactor,
				};
			};
			
			const toLatLngFromXY = (xy: { x: number; y: number }, origin: { lat: number; lng: number }) => {
				const latFactor = 111000;
				const lngFactor = 111000 * Math.cos((origin.lat * Math.PI) / 180);
				return {
					lat: xy.y / latFactor + origin.lat,
					lng: xy.x / lngFactor + origin.lng,
				};
			};
			
			// Optimized rotation function using pre-calculated values
			const rotateXY = (xy: { x: number; y: number }, useBackRotation = false) => {
				const cos = useBackRotation ? cosBack : cosA;
				const sin = useBackRotation ? sinBack : sinA;
				return {
					x: xy.x * cos - xy.y * sin,
					y: xy.x * sin + xy.y * cos,
				};
			};
			
			// Optimized point-in-polygon check
			const isPointInPolygonXY = (point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean => {
				let inside = false;
				const { x, y } = point;
				for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
					const xi = polygon[i].x, yi = polygon[i].y;
					const xj = polygon[j].x, yj = polygon[j].y;
					if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
						inside = !inside;
					}
				}
				return inside;
			};
			
			// Convert and rotate coordinates once
			const origin = computeCentroid(finalMainArea);
			const mainAreaXY = finalMainArea.map(p => toLocalXY(p, origin));
			const obstaclesXY = finalObstacles.map(o => o.coordinates.map(p => toLocalXY(p, origin)));
			
			const rotatedMain = mainAreaXY.map(p => rotateXY(p));
			const rotatedObstacles = obstaclesXY.map(poly => poly.map(p => rotateXY(p)));
			
			// Calculate bounds efficiently
			const xs = rotatedMain.map(p => p.x);
			const ys = rotatedMain.map(p => p.y);
			const minX = Math.min(...xs), maxX = Math.max(...xs);
			const minY = Math.min(...ys), maxY = Math.max(...ys);
			
			// Generate grid positions more efficiently
			const centerX = (minX + maxX) / 2;
			const centerY = (minY + maxY) / 2;
			
			const totalWidth = maxX - minX;
			const totalHeight = maxY - minY;
			const maxCols = Math.floor(totalWidth / effectiveSpacing);
			const maxRows = Math.floor(totalHeight / effectiveSpacing);
			
			// Generate all grid positions at once
			const allPositions: { x: number; y: number }[] = [];
			
			// Generate rows and columns more efficiently
			const halfCols = Math.floor(maxCols / 2);
			const halfRows = Math.floor(maxRows / 2);
			
			for (let row = -halfRows; row <= halfRows; row++) {
				const y = centerY + (row * effectiveSpacing);
				if (y < minY || y > maxY) continue;
				
				for (let col = -halfCols; col <= halfCols; col++) {
					const x = centerX + (col * effectiveSpacing);
					if (x < minX || x > maxX) continue;
					
					allPositions.push({ x, y });
				}
			}
			
			
			// Process positions in batches for better performance
			const sprinklers: { lat: number; lng: number }[] = [];
			const batchSize = 100; // Process 100 positions at a time
			
			for (let i = 0; i < allPositions.length; i += batchSize) {
				// Yield to browser every batch
				await new Promise(resolve => requestAnimationFrame(resolve));
				
				const batch = allPositions.slice(i, i + batchSize);
				
				for (const pt of batch) {
					const insideMain = isPointInPolygonXY(pt, rotatedMain);
					if (!insideMain) continue;
					
					const insideAnyHole = rotatedObstacles.some(poly => isPointInPolygonXY(pt, poly));
					if (insideAnyHole) continue;
					
					// Simplified distance check - only check main area edge
					let minDistance = Infinity;
					for (let j = 0; j < rotatedMain.length; j++) {
						const k = (j + 1) % rotatedMain.length;
						const e1 = rotatedMain[j], e2 = rotatedMain[k];
						const A = pt.x - e1.x, B = pt.y - e1.y;
						const C = e2.x - e1.x, D = e2.y - e1.y;
						const dot = A * C + B * D;
						const lenSq = C * C + D * D;
						const param = lenSq !== 0 ? Math.max(0, Math.min(1, dot / lenSq)) : 0;
						const xx = e1.x + param * C, yy = e1.y + param * D;
						const dx = pt.x - xx, dy = pt.y - yy;
						const distance = Math.sqrt(dx * dx + dy * dy);
						minDistance = Math.min(minDistance, distance);
					}
					
					if (minDistance >= bufferDistance) {
						const unrotated = rotateXY(pt, true);
						const latLng = toLatLngFromXY(unrotated, origin);
						sprinklers.push(latLng);
					}
				}
			}
			
			
			// Update irrigation count
			setIrrigationCounts(prev => ({ ...prev, sprinkler_system: sprinklers.length }));
			setIrrigationPositions(prev => ({ ...prev, sprinklers }));
			
			// Create markers and circles in batches for better performance
			const markerBatchSize = 50;
			for (let i = 0; i < sprinklers.length; i += markerBatchSize) {
				await new Promise(resolve => requestAnimationFrame(resolve));
				
				const batch = sprinklers.slice(i, i + markerBatchSize);
				
				batch.forEach((pos, batchIndex) => {
					const index = i + batchIndex;
					
					// Create marker with optimized icon
					const marker = new google.maps.Marker({
						position: pos,
						map: mapRef.current,
						icon: {
							url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
								<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
									<circle cx="6" cy="6" r="5" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"/>
									<circle cx="6" cy="6" r="2" fill="#ffffff"/>
								</svg>
							`),
							scaledSize: new google.maps.Size(12, 12),
							anchor: new google.maps.Point(6, 6)
						},
						title: `Sprinkler ${index + 1}`,
						optimized: true,
						clickable: false,
						zIndex: 2000
					});
					irrigationMarkersRef.current.push(marker);
					
					// Create coverage circle
					const circle = new google.maps.Circle({
						center: pos,
						radius: radius,
						fillColor: '#3b82f6',
						fillOpacity: 0.2,
						strokeColor: '#1d4ed8',
						strokeOpacity: 0.6,
						strokeWeight: 1,
						map: mapRef.current,
						clickable: false,
						zIndex: 2000
					});
					irrigationCirclesRef.current.push(circle);
				});
			}
			
		} catch (error) {
			console.error('Error generating sprinkler system:', error);
		} finally {
			setIsGeneratingIrrigation(false);
		}
	}, [finalMainArea, finalObstacles, finalRotationAngle, irrigationSettings.sprinkler_system.coverageRadius, irrigationSettings.sprinkler_system.overlap]);
	
	// Updated generatePivotSystem function to use center-first row placement like plant points
	const generatePivotSystem = useCallback(async () => {
		if (!mapRef.current || finalMainArea.length < 3) return;
		
		setIsGeneratingIrrigation(true);
		
		try {
			// Clear existing irrigation overlays
			irrigationMarkersRef.current.forEach(marker => marker.setMap(null));
			irrigationMarkersRef.current = [];
			irrigationCirclesRef.current.forEach(circle => circle.setMap(null));
			irrigationCirclesRef.current = [];
			
			const radius = irrigationSettings.pivot.coverageRadius;
			const overlap = irrigationSettings.pivot.overlap / 100;
			const effectiveSpacing = radius * 2 * (1 - overlap); // Distance between pivot centers
			const rotationAngleRad = (finalRotationAngle * Math.PI) / 180;
			const bufferDistance = effectiveSpacing * 0.3; // Buffer from edges like plant points
			
			
			// Geometry helper functions (same as plant point generation)
			const computeCentroid = (points: { lat: number; lng: number }[]) => {
				if (points.length === 0) return { lat: 0, lng: 0 };
				let sumLat = 0;
				let sumLng = 0;
				for (const p of points) {
					sumLat += p.lat;
					sumLng += p.lng;
				}
				return { lat: sumLat / points.length, lng: sumLng / points.length };
			};
			
			const toLocalXY = (p: { lat: number; lng: number }, origin: { lat: number; lng: number }) => {
				const latFactor = 111000;
				const lngFactor = 111000 * Math.cos((origin.lat * Math.PI) / 180);
				return {
					x: (p.lng - origin.lng) * lngFactor,
					y: (p.lat - origin.lat) * latFactor,
				};
			};
			
			const toLatLngFromXY = (xy: { x: number; y: number }, origin: { lat: number; lng: number }) => {
				const latFactor = 111000;
				const lngFactor = 111000 * Math.cos((origin.lat * Math.PI) / 180);
				return {
					lat: xy.y / latFactor + origin.lat,
					lng: xy.x / lngFactor + origin.lng,
				};
			};
			
			const rotateXY = (xy: { x: number; y: number }, angleRad: number) => {
				const cosA = Math.cos(angleRad);
				const sinA = Math.sin(angleRad);
				return {
					x: xy.x * cosA - xy.y * sinA,
					y: xy.x * sinA + xy.y * cosA,
				};
			};
			
			const isPointInPolygonXY = (point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean => {
				let inside = false;
				const x = point.x;
				const y = point.y;
				for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
					const xi = polygon[i].x;
					const yi = polygon[i].y;
					const xj = polygon[j].x;
					const yj = polygon[j].y;
					if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
						inside = !inside;
					}
				}
				return inside;
			};
			
			const distanceToPolygonEdgeXY = (point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): number => {
				let minDistance = Infinity;
				for (let i = 0; i < polygon.length; i++) {
					const j = (i + 1) % polygon.length;
					const e1 = polygon[i];
					const e2 = polygon[j];
					const A = point.x - e1.x;
					const B = point.y - e1.y;
					const C = e2.x - e1.x;
					const D = e2.y - e1.y;
					const dot = A * C + B * D;
					const lenSq = C * C + D * D;
					let param = -1;
					if (lenSq !== 0) param = dot / lenSq;
					let xx, yy;
					if (param < 0) { xx = e1.x; yy = e1.y; }
					else if (param > 1) { xx = e2.x; yy = e2.y; }
					else { xx = e1.x + param * C; yy = e1.y + param * D; }
					const dx = point.x - xx;
					const dy = point.y - yy;
					const distance = Math.sqrt(dx * dx + dy * dy);
					minDistance = Math.min(minDistance, distance);
				}
				return minDistance;
			};
			
			// Convert main area and obstacles to local coordinates
			const origin = computeCentroid(finalMainArea);
			const mainAreaXY = finalMainArea.map(p => toLocalXY(p, origin));
			const obstaclesXY = finalObstacles.map(o => o.coordinates.map(p => toLocalXY(p, origin)));
			
			// Rotate main area and obstacles to align with rotation angle
			const rotatedMain = mainAreaXY.map(p => rotateXY(p, -rotationAngleRad));
			const rotatedObstacles = obstaclesXY.map(poly => poly.map(p => rotateXY(p, -rotationAngleRad)));
			
			// Calculate bounds of rotated main area
			const xs = rotatedMain.map(p => p.x);
			const ys = rotatedMain.map(p => p.y);
			const minX = Math.min(...xs);
			const maxX = Math.max(...xs);
			const minY = Math.min(...ys);
			const maxY = Math.max(...ys);
			
			
			// Calculate center Y coordinate for starting from the middle (like plant points)
			const centerY = (minY + maxY) / 2;
			
			// Calculate how many rows we can fit above and below center
			const totalHeight = maxY - minY;
			const maxRows = Math.floor(totalHeight / effectiveSpacing);
			const rowsAboveCenter = Math.floor(maxRows / 2);
			const rowsBelowCenter = maxRows - rowsAboveCenter;
			
			
			// Generate rows starting from center and expanding outward
			const allRowYs: number[] = [];
			
			// Add center row first
			allRowYs.push(centerY);
			
			// Add rows above center (going up)
			for (let i = 1; i <= rowsAboveCenter; i++) {
				const yAbove = centerY + (i * effectiveSpacing);
				if (yAbove <= maxY) {
					allRowYs.push(yAbove);
				}
			}
			
			// Add rows below center (going down)
			for (let i = 1; i <= rowsBelowCenter; i++) {
				const yBelow = centerY - (i * effectiveSpacing);
				if (yBelow >= minY) {
					allRowYs.push(yBelow);
				}
			}
			
			// Sort rows from bottom to top for consistent ordering
			allRowYs.sort((a, b) => a - b);
			
			
			// Generate pivots for each row with improved symmetrical placement
			const pivots: { lat: number; lng: number }[] = [];
			
			// Calculate center X coordinate for symmetrical column placement
			const centerX = (minX + maxX) / 2;
			
			// Calculate how many columns we can fit left and right of center
			const totalWidth = maxX - minX;
			const maxCols = Math.floor(totalWidth / effectiveSpacing);
			const colsLeftOfCenter = Math.floor(maxCols / 2);
			const colsRightOfCenter = maxCols - colsLeftOfCenter;
			
			
			// Generate columns starting from center and expanding outward
			const allColXs: number[] = [];
			
			// Add center column first
			allColXs.push(centerX);
			
			// Add columns right of center (going right)
			for (let i = 1; i <= colsRightOfCenter; i++) {
				const xRight = centerX + (i * effectiveSpacing);
				if (xRight <= maxX) {
					allColXs.push(xRight);
				}
			}
			
			// Add columns left of center (going left)
			for (let i = 1; i <= colsLeftOfCenter; i++) {
				const xLeft = centerX - (i * effectiveSpacing);
				if (xLeft >= minX) {
					allColXs.push(xLeft);
				}
			}
			
			// Sort columns from left to right for consistent ordering
			allColXs.sort((a, b) => a - b);
			
			
			for (let rowIndex = 0; rowIndex < allRowYs.length; rowIndex++) {
				const y = allRowYs[rowIndex];
				
				for (let colIndex = 0; colIndex < allColXs.length; colIndex++) {
					const x = allColXs[colIndex];
					const pt = { x, y };
					const insideMain = isPointInPolygonXY(pt, rotatedMain);
					const insideAnyHole = rotatedObstacles.some(poly => isPointInPolygonXY(pt, poly));
					
					if (insideMain && !insideAnyHole) {
						// Check distance from edges (like plant points)
						const distanceFromEdge = Math.min(
							distanceToPolygonEdgeXY(pt, rotatedMain),
							...rotatedObstacles.map(poly => distanceToPolygonEdgeXY(pt, poly))
						);
						
						if (distanceFromEdge >= bufferDistance) {
							// Rotate back to original space
							const unrotated = rotateXY(pt, rotationAngleRad);
							const latLng = toLatLngFromXY(unrotated, origin);
							
							pivots.push(latLng);
						}
					}
				}
			}
			
			
			// Update irrigation count
			setIrrigationCounts(prev => ({ ...prev, pivot: pivots.length }));
			
			// Save pivot positions
			setIrrigationPositions(prev => ({ ...prev, pivots }));
			
			// Create markers and circles in batches for better performance
			const markerBatchSize = 50;
			for (let i = 0; i < pivots.length; i += markerBatchSize) {
				await new Promise(resolve => requestAnimationFrame(resolve));
				
				const batch = pivots.slice(i, i + markerBatchSize);
				
				batch.forEach((pos, batchIndex) => {
					const index = i + batchIndex;
					
					// Create marker
					const marker = new google.maps.Marker({
						position: pos,
						map: mapRef.current,
						icon: {
							url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
								<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
									<circle cx="6" cy="6" r="5" fill="#f97316" stroke="#ea580c" stroke-width="1"/>
									<circle cx="6" cy="6" r="2" fill="#ffffff"/>
								</svg>
							`),
							scaledSize: new google.maps.Size(12, 12),
							anchor: new google.maps.Point(6, 6)
						},
						title: `Pivot ${index + 1}`,
						optimized: true,
						clickable: false,
						zIndex: 2000
					});
					irrigationMarkersRef.current.push(marker);

					// Create coverage circle
					const circle = new google.maps.Circle({
						center: pos,
						radius: radius,
						fillColor: '#f97316',
						fillOpacity: 0.2,
						strokeColor: '#ea580c',
						strokeOpacity: 1.0,
						strokeWeight: 1,
						map: mapRef.current,
						clickable: false,
						zIndex: 2000
					});
					irrigationCirclesRef.current.push(circle);
				});
			}
			
		} catch (error) {
			console.error('Error generating pivot system:', error);
		} finally {
			setIsGeneratingIrrigation(false);
		}
	}, [finalMainArea, finalObstacles, finalRotationAngle, irrigationSettings.pivot.coverageRadius, irrigationSettings.pivot.overlap]);
	
	// Updated generateDripTape function to use center-first row placement like plant points
	const generateDripTape = useCallback(async () => {
		if (!mapRef.current || finalPlantPoints.length === 0) return;
		
		setIsGeneratingIrrigation(true);
		
		try {
			// Clear existing irrigation overlays
			irrigationMarkersRef.current.forEach(marker => marker.setMap(null));
			irrigationMarkersRef.current = [];
			
			const spacing = irrigationSettings.drip_tape.emitterSpacing / 100; // Convert cm to meters
			const side = irrigationSettings.drip_tape.side;
			
			// Group plant points by rows (approximate)
			const rows: { lat: number; lng: number }[][] = [];
			const tolerance = spacing * 2; // Group plants within 2x spacing
			
			finalPlantPoints.forEach(point => {
				let addedToRow = false;
				for (const row of rows) {
					if (row.length > 0) {
						const firstPlant = row[0];
						const distance = google.maps.geometry.spherical.computeDistanceBetween(
							new google.maps.LatLng(firstPlant.lat, firstPlant.lng),
							new google.maps.LatLng(point.lat, point.lng)
						);
						if (distance < tolerance) {
							row.push({ lat: point.lat, lng: point.lng });
							addedToRow = true;
							break;
						}
					}
				}
				if (!addedToRow) {
					rows.push([{ lat: point.lat, lng: point.lng }]);
				}
			});
			
			// Sort rows by latitude to find center row
			rows.sort((a, b) => {
				const avgLatA = a.reduce((sum, p) => sum + p.lat, 0) / a.length;
				const avgLatB = b.reduce((sum, p) => sum + p.lat, 0) / b.length;
				return avgLatA - avgLatB;
			});
			
			// Reorder rows to start from center
			const centerIndex = Math.floor(rows.length / 2);
			const reorderedRows: { lat: number; lng: number }[][] = [];
			
			// Add center row first
			if (rows.length > 0) {
				reorderedRows.push(rows[centerIndex]);
			}
			
			// Add rows above center (going up)
			for (let i = centerIndex + 1; i < rows.length; i++) {
				reorderedRows.push(rows[i]);
			}
			
			// Add rows below center (going down)
			for (let i = centerIndex - 1; i >= 0; i--) {
				reorderedRows.push(rows[i]);
			}
			
			
			// Generate drip tape positions
			const dripPositions: { lat: number; lng: number }[] = [];
			
			reorderedRows.forEach((row) => {
				// Sort plants in row by longitude
				row.sort((a, b) => a.lng - b.lng);
				
				// Calculate offset based on side
				const offset = side === 'left' ? -spacing : spacing;
				
				// Generate drip positions along the row
				for (let i = 0; i < row.length; i++) {
					const plant = row[i];
					
					// Calculate perpendicular offset
					const angle = Math.atan2(row[Math.min(i + 1, row.length - 1)].lng - row[Math.max(i - 1, 0)].lng,
											row[Math.min(i + 1, row.length - 1)].lat - row[Math.max(i - 1, 0)].lat) + Math.PI / 2;
					
					const dripLat = plant.lat + (offset / 111000) * Math.cos(angle);
					const dripLng = plant.lng + (offset / (111000 * Math.cos(plant.lat * Math.PI / 180))) * Math.sin(angle);
					
					// Check if position is inside main area and not in any obstacle
					if (isPointInPolygon({ lat: dripLat, lng: dripLng }, finalMainArea) && !isPointInObstacle({ lat: dripLat, lng: dripLng })) {
						dripPositions.push({ lat: dripLat, lng: dripLng });
					}
				}
			});
			
			
			// Update irrigation count
			setIrrigationCounts(prev => ({ ...prev, drip_tape: dripPositions.length }));
			
			// บันทึกตำแหน่ง drip tapes
			setIrrigationPositions(prev => ({ ...prev, dripTapes: dripPositions }));
			
			// Create markers
			dripPositions.forEach((pos, index) => {
				const marker = new google.maps.Marker({
					position: pos,
					map: mapRef.current,
					icon: {
						url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
							<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
								<circle cx="4" cy="4" r="3" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"/>
							</svg>
						`),
						scaledSize: new google.maps.Size(8, 8),
						anchor: new google.maps.Point(4, 4)
					},
					title: `Drip ${index + 1}`,
					optimized: true,
					clickable: false
				});
				irrigationMarkersRef.current.push(marker);
			});
			
		} catch (error) {
			console.error('Error generating drip tape:', error);
		} finally {
			setIsGeneratingIrrigation(false);
		}
	}, [finalPlantPoints, finalMainArea, irrigationSettings.drip_tape.emitterSpacing, irrigationSettings.drip_tape.side, isPointInObstacle, isPointInPolygon]);
	
	// Updated generateWaterJetTape function to use center-first row placement like plant points
	const generateWaterJetTape = useCallback(async () => {
		if (!mapRef.current || finalPlantPoints.length === 0) return;
		
		setIsGeneratingIrrigation(true);
		
		try {
			// Clear existing irrigation overlays
			irrigationMarkersRef.current.forEach(marker => marker.setMap(null));
			irrigationMarkersRef.current = [];
			
			const spacing = irrigationSettings.water_jet_tape.emitterSpacing / 100; // Convert cm to meters
			const side = irrigationSettings.water_jet_tape.side;
			
			// Group plant points by rows (approximate)
			const rows: { lat: number; lng: number }[][] = [];
			const tolerance = spacing * 2;
			
			finalPlantPoints.forEach(point => {
				let addedToRow = false;
				for (const row of rows) {
					if (row.length > 0) {
						const firstPlant = row[0];
						const distance = google.maps.geometry.spherical.computeDistanceBetween(
							new google.maps.LatLng(firstPlant.lat, firstPlant.lng),
							new google.maps.LatLng(point.lat, point.lng)
						);
						if (distance < tolerance) {
							row.push({ lat: point.lat, lng: point.lng });
							addedToRow = true;
							break;
						}
					}
				}
				if (!addedToRow) {
					rows.push([{ lat: point.lat, lng: point.lng }]);
				}
			});
			
			// Sort rows by latitude to find center row
			rows.sort((a, b) => {
				const avgLatA = a.reduce((sum, p) => sum + p.lat, 0) / a.length;
				const avgLatB = b.reduce((sum, p) => sum + p.lat, 0) / b.length;
				return avgLatA - avgLatB;
			});
			
			// Reorder rows to start from center
			const centerIndex = Math.floor(rows.length / 2);
			const reorderedRows: { lat: number; lng: number }[][] = [];
			
			// Add center row first
			if (rows.length > 0) {
				reorderedRows.push(rows[centerIndex]);
			}
			
			// Add rows above center (going up)
			for (let i = centerIndex + 1; i < rows.length; i++) {
				reorderedRows.push(rows[i]);
			}
			
			// Add rows below center (going down)
			for (let i = centerIndex - 1; i >= 0; i--) {
				reorderedRows.push(rows[i]);
			}
			
			
			// Generate water jet positions
			const jetPositions: { lat: number; lng: number }[] = [];
			
			reorderedRows.forEach((row) => {
				// Sort plants in row by longitude
				row.sort((a, b) => a.lng - b.lng);
				
				// Calculate offset based on side
				const offset = side === 'left' ? -spacing : spacing;
				
				// Generate jet positions along the row
				for (let i = 0; i < row.length; i++) {
					const plant = row[i];
					
					// Calculate perpendicular offset
					const angle = Math.atan2(row[Math.min(i + 1, row.length - 1)].lng - row[Math.max(i - 1, 0)].lng,
											row[Math.min(i + 1, row.length - 1)].lat - row[Math.max(i - 1, 0)].lat) + Math.PI / 2;
					
					const jetLat = plant.lat + (offset / 111000) * Math.cos(angle);
					const jetLng = plant.lng + (offset / (111000 * Math.cos(plant.lat * Math.PI / 180))) * Math.sin(angle);
					
					// Check if position is inside main area and not in any obstacle
					if (isPointInPolygon({ lat: jetLat, lng: jetLng }, finalMainArea) && !isPointInObstacle({ lat: jetLat, lng: jetLng })) {
						jetPositions.push({ lat: jetLat, lng: jetLng });
					}
				}
			});
			
			
			// Update irrigation count
			setIrrigationCounts(prev => ({ ...prev, water_jet_tape: jetPositions.length }));
			
			// บันทึกตำแหน่ง water jets
			setIrrigationPositions(prev => ({ ...prev, waterJets: jetPositions }));
			
			// Create markers
			jetPositions.forEach((pos, index) => {
				const marker = new google.maps.Marker({
					position: pos,
					map: mapRef.current,
					icon: {
						url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
							<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
								<circle cx="4" cy="4" r="3" fill="#f97316" stroke="#ea580c" stroke-width="1"/>
							</svg>
						`),
						scaledSize: new google.maps.Size(8, 8),
						anchor: new google.maps.Point(4, 4)
					},
					title: `Water Jet ${index + 1}`,
					optimized: true,
					clickable: false
				});
				irrigationMarkersRef.current.push(marker);
			});
			
		} catch (error) {
			console.error('Error generating water jet tape:', error);
		} finally {
			setIsGeneratingIrrigation(false);
		}
	}, [finalPlantPoints, finalMainArea, irrigationSettings.water_jet_tape.emitterSpacing, irrigationSettings.water_jet_tape.side, isPointInObstacle, isPointInPolygon]);
	
	// Function to render irrigation settings based on selected type
	const renderIrrigationSettings = () => {
		if (!selectedIrrigationType) return null;

		switch (selectedIrrigationType) {
			case 'sprinkler_system':
				return (
					<div className="rounded p-3 border border-white" style={{ backgroundColor: '#000005' }}>
						<h4 className="font-medium text-white mb-3 text-sm">{t('Sprinkler System Settings')}</h4>
						<div className="space-y-4">
							<div>
								<label className="block text-xs text-gray-400 mb-2">
									{t('Coverage Radius')}: {irrigationSettings.sprinkler_system.coverageRadius}m
								</label>
								<input
									type="range"
									min={1}
									max={15}
									step={1}
									value={irrigationSettings.sprinkler_system.coverageRadius}
									onChange={(e) => handleSettingsChange('sprinkler_system', 'coverageRadius', parseInt(e.target.value))}
									className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
									style={{
										background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((irrigationSettings.sprinkler_system.coverageRadius - 1) / 14) * 100}%, #6b7280 ${((irrigationSettings.sprinkler_system.coverageRadius - 1) / 14) * 100}%, #6b7280 100%)`
									}}
								/>
								<div className="flex justify-between text-xs text-gray-400 mt-1">
									<span>1m</span>
									<span>15m</span>
								</div>
							</div>
							
							<div>
								<label className="block text-xs text-gray-400 mb-2">
									{t('Overlap')}: {irrigationSettings.sprinkler_system.overlap}%
								</label>
								<input
									type="range"
									min={0}
									max={50}
									step={5}
									value={irrigationSettings.sprinkler_system.overlap}
									onChange={(e) => handleSettingsChange('sprinkler_system', 'overlap', parseInt(e.target.value))}
									className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
									style={{
										background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(irrigationSettings.sprinkler_system.overlap / 50) * 100}%, #6b7280 ${(irrigationSettings.sprinkler_system.overlap / 50) * 100}%, #6b7280 100%)`
									}}
								/>
								<div className="flex justify-between text-xs text-gray-400 mt-1">
									<span>0%</span>
									<span>50%</span>
								</div>
							</div>
							
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs text-gray-400 mb-2">
										{t('Flow')} (L/min)
									</label>
									<input
										type="number"
										min={5}
										max={30}
										step={1}
										value={irrigationSettings.sprinkler_system.flow}
										onChange={(e) => handleSettingsChange('sprinkler_system', 'flow', parseInt(e.target.value) || 10)}
										className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
										placeholder="10"
									/>
								</div>
								
								<div>
									<label className="block text-xs text-gray-400 mb-2">
										{t('Pressure')} (bar)
									</label>
									<input
										type="number"
										min={1.5}
										max={4.0}
										step={0.1}
										value={irrigationSettings.sprinkler_system.pressure}
										onChange={(e) => handleSettingsChange('sprinkler_system', 'pressure', parseFloat(e.target.value) || 2.5)}
										className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
										placeholder="2.5"
									/>
								</div>
							</div>
							
							<button
								onClick={() => generateSprinklerSystem()}
								disabled={isGeneratingIrrigation}
								className="w-full bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
							>
								{isGeneratingIrrigation ? t('Generating...') : t('Generate Sprinkler System')}
							</button>
							{irrigationCounts.sprinkler_system > 0 && (
								<div className="text-center text-xs text-blue-400 mt-2">
									{t('Generated')}: {irrigationCounts.sprinkler_system} {t('sprinklers')}
								</div>
							)}
						</div>
					</div>
				);

			case 'pivot':
				return (
					<div className="rounded p-3 border border-white" style={{ backgroundColor: '#000005' }}>
						<h4 className="font-medium text-white mb-3 text-sm">{t('System Pivot Settings')}</h4>
						<div className="space-y-4">
							<div>
								<label className="block text-xs text-gray-400 mb-2">
									{t('Coverage Radius')}: {irrigationSettings.pivot.coverageRadius}m
								</label>
								<input
									type="range"
									min={80}
									max={250}
									step={5}
									value={irrigationSettings.pivot.coverageRadius}
									onChange={(e) => handleSettingsChange('pivot', 'coverageRadius', parseInt(e.target.value))}
									className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
									style={{
										background: `linear-gradient(to right, #f97316 0%, #f97316 ${((irrigationSettings.pivot.coverageRadius - 80) / 170) * 100}%, #6b7280 ${((irrigationSettings.pivot.coverageRadius - 80) / 170) * 100}%, #6b7280 100%)`
									}}
								/>
								<div className="flex justify-between text-xs text-gray-400 mt-1">
									<span>80m</span>
									<span>250m</span>
								</div>
							</div>
							
							<div>
								<label className="block text-xs text-gray-400 mb-2">
									{t('Overlap')}: {irrigationSettings.pivot.overlap}%
								</label>
								<input
									type="range"
									min={0}
									max={50}
									step={5}
									value={irrigationSettings.pivot.overlap}
									onChange={(e) => handleSettingsChange('pivot', 'overlap', parseInt(e.target.value))}
									className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
									style={{
										background: `linear-gradient(to right, #f97316 0%, #f97316 ${(irrigationSettings.pivot.overlap / 50) * 100}%, #6b7280 ${(irrigationSettings.pivot.overlap / 50) * 100}%, #6b7280 100%)`
									}}
								/>
								<div className="flex justify-between text-xs text-gray-400 mt-1">
									<span>0%</span>
									<span>50%</span>
								</div>
							</div>
							
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs text-gray-400 mb-2">
										{t('Flow')} (L/min)
									</label>
									<input
										type="number"
										min={20}
										max={100}
										step={5}
										value={irrigationSettings.pivot.flow}
										onChange={(e) => handleSettingsChange('pivot', 'flow', parseInt(e.target.value) || 50)}
										className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-orange-500"
										placeholder="50"
									/>
								</div>
								
								<div>
									<label className="block text-xs text-gray-400 mb-2">
										{t('Pressure')} (bar)
									</label>
									<input
										type="number"
										min={2.0}
										max={5.0}
										step={0.1}
										value={irrigationSettings.pivot.pressure}
										onChange={(e) => handleSettingsChange('pivot', 'pressure', parseFloat(e.target.value) || 3.0)}
										className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-orange-500"
										placeholder="3.0"
									/>
								</div>
							</div>
							
							<button
								onClick={() => generatePivotSystem()}
								disabled={isGeneratingIrrigation}
								className="w-full bg-orange-600 text-white px-3 py-2 rounded text-xs hover:bg-orange-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
							>
								{isGeneratingIrrigation ? t('Generating...') : t('Generate Pivot System')}
							</button>
							{irrigationCounts.pivot > 0 && (
								<div className="text-center text-xs text-orange-400 mt-2">
									{t('Generated')}: {irrigationCounts.pivot} {t('pivots')}
								</div>
							)}
						</div>
					</div>
				);

			case 'drip_tape': {
				const dripOptions = [10, 15, 20, 30];
				return (
					<div className="rounded p-3 border border-white" style={{ backgroundColor: '#000005' }}>
						<h4 className="font-medium text-white mb-3 text-sm">{t('Drip Tape Settings')}</h4>
						<div className="space-y-4">
							<div>
								<label className="block text-xs text-gray-400 mb-2">
									{t('Emitter Spacing')}: {irrigationSettings.drip_tape.emitterSpacing}cm
								</label>
								<div className="grid grid-cols-4 gap-2">
									{dripOptions.map(option => (
										<button
											key={option}
											onClick={() => handleSettingsChange('drip_tape', 'emitterSpacing', option)}
											className={`px-3 py-2 rounded text-xs font-medium transition-colors border border-white ${
												irrigationSettings.drip_tape.emitterSpacing === option
													? 'bg-blue-600 text-white'
													: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
											}`}
										>
											{option}cm
										</button>
									))}
								</div>
							</div>
							
							<div>
								<label className="block text-xs text-gray-400 mb-2">
									{t('Placement')}
								</label>
								<div className="grid grid-cols-2 gap-2">
									<button
										onClick={() => handleSettingsChange('drip_tape', 'placement', 'along_rows')}
										className={`px-3 py-2 rounded text-xs font-medium transition-colors border border-white ${
											irrigationSettings.drip_tape.placement === 'along_rows'
												? 'bg-blue-600 text-white'
												: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
										}`}
									>
										{t('Along Rows')}
									</button>
									<button
										onClick={() => handleSettingsChange('drip_tape', 'placement', 'staggered')}
										className={`px-3 py-2 rounded text-xs font-medium transition-colors border border-white ${
											irrigationSettings.drip_tape.placement === 'staggered'
												? 'bg-blue-600 text-white'
												: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
										}`}
									>
										{t('Staggered')}
									</button>
								</div>
							</div>
							
							<div>
								<label className="block text-xs text-gray-400 mb-2">
									{t('Side')}
								</label>
								<div className="grid grid-cols-2 gap-2">
									<button
										onClick={() => handleSettingsChange('drip_tape', 'side', 'left')}
										className={`px-3 py-2 rounded text-xs font-medium transition-colors border border-white ${
											irrigationSettings.drip_tape.side === 'left'
												? 'bg-blue-600 text-white'
												: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
										}`}
									>
										{t('Left')}
									</button>
									<button
										onClick={() => handleSettingsChange('drip_tape', 'side', 'right')}
										className={`px-3 py-2 rounded text-xs font-medium transition-colors border border-white ${
											irrigationSettings.drip_tape.side === 'right'
												? 'bg-blue-600 text-white'
												: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
										}`}
									>
										{t('Right')}
									</button>
								</div>
							</div>
							
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs text-gray-400 mb-2">
										{t('Flow')} (L/min)
									</label>
									<input
										type="number"
										min={0.24}
										max={0.24}
										step={0.01}
										value={0.24}
										readOnly
										className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
									/>
								</div>
								<div>
									<label className="block text-xs text-gray-400 mb-2">
										{t('Pressure')} (bar)
									</label>
									<input
										type="number"
										min={0.5}
										max={2.0}
										step={0.1}
										value={irrigationSettings.drip_tape.pressure}
										onChange={(e) => handleSettingsChange('drip_tape', 'pressure', parseFloat(e.target.value) || 1.0)}
										className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
										placeholder="1.0"
									/>
								</div>
							</div>
							
							<button
								onClick={() => generateDripTape()}
								disabled={isGeneratingIrrigation}
								className="w-full bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
							>
								{isGeneratingIrrigation ? t('Generating...') : t('Generate Drip Tape')}
							</button>
							{irrigationCounts.drip_tape > 0 && (
								<div className="text-center text-xs text-blue-400 mt-2">
									{t('Generated')}: {irrigationCounts.drip_tape} {t('drip points')}
								</div>
							)}
						</div>
					</div>
				);
			}

			case 'water_jet_tape': {
				const jetOptions = [10, 20, 30];
				return (
					<div className="rounded p-3 border border-white" style={{ backgroundColor: '#000005' }}>
						<h4 className="font-medium text-white mb-3 text-sm">{t('Water Jet Tape Settings')}</h4>
						<div className="space-y-4">
							<div>
								<label className="block text-xs text-gray-400 mb-2">
									{t('Jet Spacing')}: {irrigationSettings.water_jet_tape.emitterSpacing}cm
								</label>
								<div className="grid grid-cols-3 gap-2">
									{jetOptions.map(option => (
										<button
											key={option}
											onClick={() => handleSettingsChange('water_jet_tape', 'emitterSpacing', option)}
											className={`px-3 py-2 rounded text-xs font-medium transition-colors border border-white ${
												irrigationSettings.water_jet_tape.emitterSpacing === option
													? 'bg-orange-600 text-white'
													: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
											}`}
										>
											{option}cm
										</button>
									))}
								</div>
							</div>
							
							<div>
								<label className="block text-xs text-gray-400 mb-2">
									{t('Placement')}
								</label>
								<div className="grid grid-cols-2 gap-2">
									<button
										onClick={() => handleSettingsChange('water_jet_tape', 'placement', 'along_rows')}
										className={`px-3 py-2 rounded text-xs font-medium transition-colors border border-white ${
											irrigationSettings.water_jet_tape.placement === 'along_rows'
												? 'bg-orange-600 text-white'
												: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
										}`}
									>
										{t('Along Rows')}
									</button>
									<button
										onClick={() => handleSettingsChange('water_jet_tape', 'placement', 'staggered')}
										className={`px-3 py-2 rounded text-xs font-medium transition-colors border border-white ${
											irrigationSettings.water_jet_tape.placement === 'staggered'
												? 'bg-orange-600 text-white'
												: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
										}`}
									>
										{t('Staggered')}
									</button>
								</div>
							</div>
							
							<div>
								<label className="block text-xs text-gray-400 mb-2">
									{t('Side')}
								</label>
								<div className="grid grid-cols-2 gap-2">
									<button
										onClick={() => handleSettingsChange('water_jet_tape', 'side', 'left')}
										className={`px-3 py-2 rounded text-xs font-medium transition-colors border border-white ${
											irrigationSettings.water_jet_tape.side === 'left'
												? 'bg-orange-600 text-white'
												: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
										}`}
									>
										{t('Left')}
									</button>
									<button
										onClick={() => handleSettingsChange('water_jet_tape', 'side', 'right')}
										className={`px-3 py-2 rounded text-xs font-medium transition-colors border border-white ${
											irrigationSettings.water_jet_tape.side === 'right'
												? 'bg-orange-600 text-white'
												: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
										}`}
									>
										{t('Right')}
									</button>
								</div>
							</div>
							
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs text-gray-400 mb-2">
										{t('Flow')} (L/min)
									</label>
									<input
										type="number"
										min={0.5}
										max={10}
										step={0.1}
										value={irrigationSettings.water_jet_tape.flow}
										onChange={(e) => handleSettingsChange('water_jet_tape', 'flow', parseFloat(e.target.value) || 1.5)}
										className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-orange-500"
										placeholder="1.5"
									/>
								</div>
								<div>
									<label className="block text-xs text-gray-400 mb-2">
										{t('Pressure')} (bar)
									</label>
									<input
										type="number"
										min={0.5}
										max={3.0}
										step={0.1}
										value={irrigationSettings.water_jet_tape.pressure}
										onChange={(e) => handleSettingsChange('water_jet_tape', 'pressure', parseFloat(e.target.value) || 1.5)}
										className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-orange-500"
										placeholder="1.5"
									/>
								</div>
							</div>
							
							<button
								onClick={() => generateWaterJetTape()}
								disabled={isGeneratingIrrigation}
								className="w-full bg-orange-600 text-white px-3 py-2 rounded text-xs hover:bg-orange-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
							>
								{isGeneratingIrrigation ? t('Generating...') : t('Generate Water Jet Tape')}
							</button>
							{irrigationCounts.water_jet_tape > 0 && (
								<div className="text-center text-xs text-orange-400 mt-2">
									{t('Generated')}: {irrigationCounts.water_jet_tape} {t('water jets')}
								</div>
							)}
						</div>
					</div>
				);
			}

			default:
				return null;
		}
	};

	// Render main area polygon
	useEffect(() => {
		if (!mapRef.current || !finalMainArea.length || !isMapLoaded) {
			return;
		}

		if (mainAreaPolygonRef.current) {
			mainAreaPolygonRef.current.setMap(null);
		}

		const polygon = new google.maps.Polygon({
			paths: [finalMainArea],
			fillColor: '#86EFAC',
			fillOpacity: 0.3,
			strokeColor: '#22C55E',
			strokeWeight: 2,
			strokeOpacity: 1,
			map: mapRef.current,
			clickable: false,
			zIndex: 1000,
		});

		mainAreaPolygonRef.current = polygon;
		dbg('Main area polygon created and added to map');
	}, [finalMainArea, isMapLoaded]);

	// Note: Zone rendering is removed from irrigation page
	// Zones should only be displayed in the zone-obstacle page (Step 3)
	// This page focuses only on irrigation system generation

	// [FIX] Simplified distance overlay creation
	const createSimpleDistanceOverlays = useCallback((obstacle: Obstacle) => {
		if (!mapRef.current) {
			dbg('Cannot create distance overlays: map not ready');
			return;
		}

		dbg('Creating simplified distance overlays for water source:', obstacle.id);

		const overlays: { lines: google.maps.Polyline[]; labels: google.maps.Marker[] } = { lines: [], labels: [] };

		// Distance lines and labels are now disabled
		// The function structure is kept for potential future use
		dbg('Distance overlays disabled - no lines or labels created');

		distanceOverlaysRef.current[obstacle.id] = overlays;
		dbg('Successfully created distance overlays for obstacle:', obstacle.id);
	}, []);

	// [FIX] Improved obstacles rendering effect
	useEffect(() => {
		if (!mapRef.current || !isMapLoaded) {
			return;
		}

		// Clear existing obstacle polygons
		obstaclePolygonsRef.current.forEach(poly => poly.setMap(null));
		obstaclePolygonsRef.current = [];

		// Clear existing distance overlays
		Object.values(distanceOverlaysRef.current).forEach(({ lines, labels }) => {
			lines.forEach(l => l.setMap(null));
			labels.forEach(lb => lb.setMap(null));
		});
		distanceOverlaysRef.current = {};

		// Don't use setTimeout - render immediately for better synchronization
		if (finalObstacles.length > 0) {
			dbg('Creating obstacle polygons for:', finalObstacles.length, 'obstacles');
			
			finalObstacles.forEach((obstacle, index) => {
				dbg(`Processing obstacle ${index + 1}:`, {
					id: obstacle.id,
					type: obstacle.type,
					coordinates: obstacle.coordinates.length,
					firstCoord: obstacle.coordinates[0],
					lastCoord: obstacle.coordinates[obstacle.coordinates.length - 1]
				});
				
				// Validate obstacle has valid coordinates
				if (!obstacle.coordinates || obstacle.coordinates.length < 3) {
					console.warn(`Skipping obstacle ${index + 1} - insufficient coordinates:`, obstacle.coordinates?.length || 0);
					return;
				}
				
				// Validate coordinates are valid numbers
				const validCoordinates = obstacle.coordinates.filter(coord => 
					typeof coord.lat === 'number' && 
					typeof coord.lng === 'number' && 
					!isNaN(coord.lat) && 
					!isNaN(coord.lng) &&
					coord.lat >= -90 && coord.lat <= 90 &&
					coord.lng >= -180 && coord.lng <= 180
				);
				
				if (validCoordinates.length < 3) {
					console.warn(`Skipping obstacle ${index + 1} - invalid coordinates:`, obstacle.coordinates);
					return;
				}
				
				const colors = obstacle.type === 'water_source' 
					? { fill: '#3b82f6', stroke: '#1d4ed8' } 
					: { fill: '#6b7280', stroke: '#374151' };
				
				try {
					const poly = new google.maps.Polygon({
						paths: [validCoordinates],
						fillColor: colors.fill,
						fillOpacity: 0.3,
						strokeColor: colors.stroke,
						strokeWeight: 2,
						strokeOpacity: 1,
						map: mapRef.current,
						clickable: false,
						zIndex: 1600
					});
					obstaclePolygonsRef.current.push(poly);
					dbg(`Successfully created polygon for obstacle ${index + 1}`);

					// Create distance overlays for water sources
					if (obstacle.type === 'water_source' && finalMainArea.length >= 3) {
						dbg('Creating distance overlays for water source:', obstacle.id);
						try {
							createSimpleDistanceOverlays(obstacle);
						} catch (error) {
							console.error('Error creating distance overlays for obstacle:', obstacle.id, error);
						}
					}
				} catch (error) {
					console.error(`Error creating polygon for obstacle ${index + 1}:`, error);
				}
			});
			
			dbg(`Successfully created ${obstaclePolygonsRef.current.length} obstacle polygons out of ${finalObstacles.length} obstacles`);
		}
	}, [finalObstacles, isMapLoaded, createSimpleDistanceOverlays, finalMainArea.length]);

	// Render plant points
	useEffect(() => {
		if (!mapRef.current || !isMapLoaded || finalPlantPoints.length === 0) {
			return;
		}

		// Clear existing markers
		plantPointMarkersRef.current.forEach(marker => marker.setMap(null));
		plantPointMarkersRef.current = [];
		
		// Don't show points if hideAllPoints is true
		console.log('Irrigation - Rendering plant points - hideAllPoints:', hideAllPoints, 'finalPlantPoints.length:', finalPlantPoints.length);
		if (hideAllPoints) {
			console.log('Irrigation - Hiding all plant points due to hideAllPoints = true');
			return;
		}

		// Filter points based on zoom level and total point count
		const filteredPoints = filterPointsByZoom(finalPlantPoints, parsedMapZoom, realPlantCount);
		
		// Calculate dynamic point size based on total point count (not filtered count)
		const pointSize = calculatePointSize(realPlantCount);
		const anchorPoint = pointSize / 2;

		// Create markers for filtered plant points
		filteredPoints.forEach((point, index) => {
			const marker = new google.maps.Marker({
				position: { lat: point.lat, lng: point.lng },
				map: mapRef.current,
				icon: {
					url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
						<svg width="${pointSize}" height="${pointSize}" viewBox="0 0 ${pointSize} ${pointSize}" xmlns="http://www.w3.org/2000/svg">
							<circle cx="${anchorPoint}" cy="${anchorPoint}" r="${anchorPoint * 0.83}" fill="#22C55E" stroke="#16A34A" stroke-width="1"/>
						</svg>
					`),
					scaledSize: new google.maps.Size(pointSize, pointSize),
					anchor: new google.maps.Point(anchorPoint, anchorPoint)
				},
				title: `Plant ${index + 1}`,
				optimized: true,
				clickable: false,
				zIndex: 1000
			});
			plantPointMarkersRef.current.push(marker);
			
		});
		
		dbg(`Created ${filteredPoints.length} plant point markers (filtered from ${finalPlantPoints.length} total)`);
	}, [finalPlantPoints, isMapLoaded, hideAllPoints, parsedPlantPoints.length, filterPointsByZoom, parsedMapZoom, realPlantCount, calculatePointSize]);

	// Render irrigation overlays when data is loaded from localStorage
	const renderIrrigationOverlays = useCallback(async () => {
		if (!mapRef.current || !isMapLoaded) return;

		// Clear existing irrigation overlays
		irrigationMarkersRef.current.forEach(marker => marker.setMap(null));
		irrigationMarkersRef.current = [];
		irrigationCirclesRef.current.forEach(circle => circle.setMap(null));
		irrigationCirclesRef.current = [];

		// Recreate sprinkler overlays with batch processing
		if (irrigationPositions.sprinklers.length > 0) {
			const radius = irrigationSettings.sprinkler_system.coverageRadius;
			const markerBatchSize = 50;
			
			for (let i = 0; i < irrigationPositions.sprinklers.length; i += markerBatchSize) {
				await new Promise(resolve => requestAnimationFrame(resolve));
				
				const batch = irrigationPositions.sprinklers.slice(i, i + markerBatchSize);
				
				batch.forEach((pos, batchIndex) => {
					const index = i + batchIndex;
					
					// Create marker
					const marker = new google.maps.Marker({
						position: pos,
						map: mapRef.current,
						icon: {
							url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
								<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
									<circle cx="6" cy="6" r="5" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"/>
									<circle cx="6" cy="6" r="2" fill="#ffffff"/>
								</svg>
							`),
							scaledSize: new google.maps.Size(12, 12),
							anchor: new google.maps.Point(6, 6)
						},
						title: `Sprinkler ${index + 1}`,
						optimized: true,
						clickable: false,
						zIndex: 2000
					});
					irrigationMarkersRef.current.push(marker);

					// Create coverage circle
					const circle = new google.maps.Circle({
						center: pos,
						radius: radius,
						fillColor: '#3b82f6',
						fillOpacity: 0.2,
						strokeColor: '#1d4ed8',
						strokeOpacity: 0.6,
						strokeWeight: 1,
						map: mapRef.current,
						clickable: false,
						zIndex: 2000
					});
					irrigationCirclesRef.current.push(circle);
				});
			}
		}

		// Recreate pivot overlays with batch processing
		if (irrigationPositions.pivots.length > 0) {
			const radius = irrigationSettings.pivot.coverageRadius;
			const markerBatchSize = 50;
			
			for (let i = 0; i < irrigationPositions.pivots.length; i += markerBatchSize) {
				await new Promise(resolve => requestAnimationFrame(resolve));
				
				const batch = irrigationPositions.pivots.slice(i, i + markerBatchSize);
				
				batch.forEach((pos, batchIndex) => {
					const index = i + batchIndex;
					
					// Create marker
					const marker = new google.maps.Marker({
						position: pos,
						map: mapRef.current,
						icon: {
							url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
								<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
									<circle cx="6" cy="6" r="5" fill="#f97316" stroke="#ea580c" stroke-width="1"/>
									<circle cx="6" cy="6" r="2" fill="#ffffff"/>
								</svg>
							`),
							scaledSize: new google.maps.Size(12, 12),
							anchor: new google.maps.Point(6, 6)
						},
						title: `Pivot ${index + 1}`,
						optimized: true,
						clickable: false,
						zIndex: 2000
					});
					irrigationMarkersRef.current.push(marker);

					// Create coverage circle
					const circle = new google.maps.Circle({
						center: pos,
						radius: radius,
						fillColor: '#f97316',
						fillOpacity: 0.2,
						strokeColor: '#ea580c',
						strokeOpacity: 0.6,
						strokeWeight: 1,
						map: mapRef.current,
						clickable: false,
						zIndex: 2000
					});
					irrigationCirclesRef.current.push(circle);
				});
			}
		}

		// Recreate drip tape overlays
		if (irrigationPositions.dripTapes.length > 0) {
			
			irrigationPositions.dripTapes.forEach((pos, index) => {
				const marker = new google.maps.Marker({
					position: pos,
					map: mapRef.current,
					icon: {
						url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
							<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
								<circle cx="4" cy="4" r="3" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"/>
							</svg>
						`),
						scaledSize: new google.maps.Size(8, 8),
						anchor: new google.maps.Point(4, 4)
					},
					title: `Drip ${index + 1}`,
					optimized: true,
					clickable: false
				});
				irrigationMarkersRef.current.push(marker);
			});
		}

		// Recreate water jet overlays
		if (irrigationPositions.waterJets.length > 0) {
			
			irrigationPositions.waterJets.forEach((pos, index) => {
				const marker = new google.maps.Marker({
					position: pos,
					map: mapRef.current,
					icon: {
						url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
							<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
								<circle cx="4" cy="4" r="3" fill="#f97316" stroke="#ea580c" stroke-width="1"/>
							</svg>
						`),
						scaledSize: new google.maps.Size(8, 8),
						anchor: new google.maps.Point(4, 4)
					},
					title: `Water Jet ${index + 1}`,
					optimized: true,
					clickable: false
				});
				irrigationMarkersRef.current.push(marker);
			});
		}
		
	}, [
		isMapLoaded,
		irrigationSettings.sprinkler_system.coverageRadius,
		irrigationSettings.pivot.coverageRadius,
		irrigationPositions.dripTapes,
		irrigationPositions.pivots,
		irrigationPositions.sprinklers,
		irrigationPositions.waterJets
	]);

	// Additional effect to ensure irrigation overlays are recreated when data is loaded from localStorage
	useEffect(() => {
		if (isMapLoaded && mapRef.current) {
			// Check if we have irrigation data that should be displayed
			const hasIrrigationData = irrigationPositions.sprinklers.length > 0 ||
				irrigationPositions.pivots.length > 0 ||
				irrigationPositions.dripTapes.length > 0 ||
				irrigationPositions.waterJets.length > 0;
			
			if (hasIrrigationData) {
				renderIrrigationOverlays();
			}
		}
	}, [
		isMapLoaded,
		irrigationSettings.sprinkler_system?.coverageRadius,
		irrigationSettings.pivot?.coverageRadius,
		irrigationPositions.dripTapes,
		irrigationPositions.pivots,
		irrigationPositions.sprinklers,
		irrigationPositions.waterJets,
		renderIrrigationOverlays
	]);

	return (
		<>
			<Head title={t('Irrigation System')} />
			
			<div className="min-h-screen text-white overflow-hidden" style={{ backgroundColor: '#000005' }}>
				{/* Navbar */}
				<Navbar />
				
				<div className="h-[calc(100vh-4rem)] overflow-hidden">
					<div className="flex h-full">
						{/* Left Side - Control Panel */}
						<div className="w-80 border-r border-white flex flex-col" style={{ backgroundColor: '#000005' }}>
							{/* Header */}
							<div className="p-4 border-b border-white">
								<button
									onClick={handleBack}
									className="mb-3 flex items-center text-blue-400 hover:text-blue-300 text-sm"
								>
									<svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
									</svg>
									{t('Back to Initial Area')}
								</button>
								
								<div className="mb-3">
									<h1 className="text-lg font-bold text-white">
										{steps.find(s => s.id === currentStep)?.title}
									</h1>
								</div>

								{/* Step Navigation - Horizontal */}
								<div className="flex items-center justify-between mb-4">
									{steps.map((step, index) => {
										const isActive = step.id === currentStep;
										const isCompleted = parseInt(completedSteps) >= step.id;
										
										// Check if step has been completed based on current data
										const hasStepData = (() => {
											switch (step.id) {
												case 1: // Initial Area
													return finalMainArea.length >= 3;
												case 2: // Irrigation Generate
													return irrigationPositions.sprinklers.length > 0 ||
														irrigationPositions.pivots.length > 0 ||
														irrigationPositions.dripTapes.length > 0 ||
														irrigationPositions.waterJets.length > 0;
												default:
													return false;
											}
										})();
										
										// Step is completed only if previously marked as completed; do not auto-check step 2 by data presence
										const stepIsCompleted = step.id === 2 ? isCompleted : (isCompleted || hasStepData);
										
										return (
											<div key={step.id} className="flex items-center">
												<button
													onClick={() => handleStepClick(step)}
													className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
														stepIsCompleted 
															? 'bg-green-600 text-white cursor-pointer hover:bg-green-500' 
															: isActive
															? 'bg-blue-600 text-white cursor-not-allowed'
															: 'bg-gray-600 text-white hover:bg-gray-500 cursor-pointer'
													}`}
												>
													{stepIsCompleted ? (
														<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
															<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
														</svg>
													) : (
														step.id
													)}
												</button>
												
												{index < steps.length - 1 && (
													<div className={`w-8 h-0.5 mx-2 ${
														stepIsCompleted ? 'bg-green-600' : 'bg-gray-600'
													}`}></div>
												)}
											</div>
										);
									})}
								</div>
							</div>

							{/* Scrollable Content */}
							<div className="flex-1 overflow-y-auto">
								<div className="p-4 space-y-6">
									
									{/* Selected Crops Display */}
									{finalSelectedCrops.length > 0 && (
										<div className="rounded-lg p-4 border border-white">
											<h3 className="text-sm font-semibold text-white mb-3">
												{t('Selected Crops')}
											</h3>
											
											<div className="flex flex-wrap gap-2">
												{finalSelectedCrops.map((crop, idx) => {
													const cropData = getCropByValue(crop);
													return (
														<span key={idx} className="bg-blue-600 text-white px-3 py-1 rounded text-xs border border-white flex items-center gap-1">
															<span className="text-sm">{cropData?.icon || '🌱'}</span>
															<span>{cropData?.name || crop}</span>
														</span>
													);
												})}
											</div>
										</div>
									)}


									{/* Field Information Display */}
									{finalMainArea.length > 0 && (
										<div className="rounded-lg p-4 border border-white" style={{ backgroundColor: '#000005' }}>
											<h3 className="text-sm font-semibold text-white mb-3">
												{t('Field Information')}
											</h3>
											<div className="space-y-2 text-xs">
												<div className="flex justify-between text-gray-400">
													<span>{t('Area')}:</span>
													<span className="text-green-400">
														{finalAreaRai !== null ? finalAreaRai.toFixed(2) : '--'} {t('rai')}
													</span>
												</div>
												<div className="flex justify-between text-gray-400">
													<span>{t('Total Plant Points')}:</span>
													<span className="text-green-400">
														{realPlantCount} {t('points')}
													</span>
												</div>
												{realPlantCount > 500 && (
													<div className="text-xs text-yellow-300 bg-yellow-900 bg-opacity-30 p-2 rounded">
														⚠️ {t('Map displays up to 500 points for performance. Water calculation uses all')} {realPlantCount} {t('points')}
													</div>
												)}
												<div className="flex justify-between text-gray-400">
													<span>ปริมาณน้ำที่ต้องใช้ทั้งหมด:</span>
													<span className="text-green-400">
														{totalWaterRequirement.toFixed(1)} ลิตร/ครั้ง
													</span>
												</div>
												<div className="flex justify-between text-gray-400">
													<span>{t('Obstacles')}:</span>
													<span className="text-green-400">
														{finalObstacles.length} {t('items')}
													</span>
												</div>
												<div className="flex justify-between text-gray-400">
													<span>{t('Rotation Angle')}:</span>
													<span className="text-green-400">
														{finalRotationAngle.toFixed(0)}°
													</span>
												</div>
												
												{/* Crop Spacing Information */}
												{Object.keys(finalRowSpacing).length > 0 && (
													<>
														<div className="border-t border-gray-600 pt-2 mt-2">
															<div className="text-xs font-semibold text-blue-300 mb-2">
																🌱 {t('Crop Spacing')}:
															</div>
															{Object.entries(finalRowSpacing).map(([crop, rowSpacing]) => (
																<div key={crop} className="flex justify-between text-gray-400">
																	<span>{crop}:</span>
																	<span className="text-blue-400">
																		{rowSpacing}cm / {finalPlantSpacing[crop] || '--'}cm
																	</span>
																</div>
															))}
														</div>
													</>
												)}
											</div>
										</div>
									)}

									{/* Irrigation Types */}
									<div className="rounded-lg p-4 border border-white" style={{ backgroundColor: '#000005' }}>
										<h3 className="text-sm font-semibold text-white mb-3">
											{t('Irrigation Types')}
										</h3>
										<div className="grid grid-cols-2 gap-2">
											<div 
												onClick={() => handleIrrigationTypeSelect('sprinkler_system')}
												className={`rounded p-2 text-center cursor-pointer transition-colors border border-white ${
													selectedIrrigationType === 'sprinkler_system' 
														? 'bg-blue-600 border-blue-400' 
														: 'hover:bg-gray-800'
												}`} 
												style={{ backgroundColor: selectedIrrigationType === 'sprinkler_system' ? '#3b82f6' : '#000005' }}
											>
												<div className="text-lg mb-1">🚿</div>
												<h4 className="text-xs font-medium text-white">{t('Sprinkler')}</h4>
												<p className="text-xs text-gray-400">{t('Wide area coverage')}</p>
												{irrigationCounts.sprinkler_system > 0 && (
													<div className="text-xs text-blue-300 mt-1">
														{irrigationCounts.sprinkler_system} {t('generated')}
													</div>
												)}
											</div>
											
											<div 
												onClick={() => handleIrrigationTypeSelect('pivot')}
												className={`rounded p-2 text-center cursor-pointer transition-colors border border-white ${
													selectedIrrigationType === 'pivot' 
														? 'bg-blue-600 border-blue-400' 
														: 'hover:bg-gray-800'
												}`}
												style={{ backgroundColor: selectedIrrigationType === 'pivot' ? '#3b82f6' : '#000005' }}
											>
												<div className="text-lg mb-1">🔄</div>
												<h4 className="text-xs font-medium text-white">{t('System Pivot')}</h4>
												<p className="text-xs text-gray-400">{t('Rotating irrigation')}</p>
												{irrigationCounts.pivot > 0 && (
													<div className="text-xs text-orange-300 mt-1">
														{irrigationCounts.pivot} {t('generated')}
													</div>
												)}
											</div>
											
											<div 
												className="rounded p-2 text-center cursor-not-allowed transition-colors border border-gray-600 opacity-50"
												style={{ backgroundColor: '#000005' }}
											>
												<div className="text-lg mb-1">🌊</div>
												<h4 className="text-xs font-medium text-gray-500">{t('Water Jet Tape')}</h4>
												<p className="text-xs text-gray-600">{t('Precise water jets')}</p>
												<div className="text-xs text-gray-600 mt-1">
													{t('Disabled')}
												</div>
											</div>
											
											<div 
												className="rounded p-2 text-center cursor-not-allowed transition-colors border border-gray-600 opacity-50"
												style={{ backgroundColor: '#000005' }}
											>
												<div className="text-lg mb-1">💧</div>
												<h4 className="text-xs font-medium text-gray-500">{t('Drip Tape')}</h4>
												<p className="text-xs text-gray-600">{t('Water efficient dripping')}</p>
												<div className="text-xs text-gray-600 mt-1">
													{t('Disabled')}
												</div>
											</div>
										</div>
									</div>

									{/* Irrigation Settings - Show only when type is selected */}
									{selectedIrrigationType && (
										<div className="rounded-lg p-4 border border-white" style={{ backgroundColor: '#000005' }}>
											<h3 className="text-sm font-semibold text-white mb-3">
												{t('Irrigation Settings')}
											</h3>
											{renderIrrigationSettings()}
										</div>
									)}
								</div>
							</div>

							{/* Bottom Action Buttons */}
							<div className="p-4 border-t border-white">
								<div className="flex gap-2">
									<button 
										onClick={handleBack}
										className="flex-1 px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 transition-colors border border-white"
									>
										{t('Back')}
									</button>
									
									<button 
										onClick={() => {
											// Clear irrigation settings but keep field data
											setSelectedIrrigationType('');
											setIrrigationSettings({
												sprinkler_system: { coverageRadius: 8, overlap: 0, flow: 10, pressure: 2.5 },
												pivot: { coverageRadius: 165, overlap: 0, flow: 50, pressure: 3.0 },
												drip_tape: { emitterSpacing: 20, placement: 'along_rows', side: 'left', flow: 0.24, pressure: 1.0 },
												water_jet_tape: { emitterSpacing: 20, placement: 'along_rows', side: 'left', flow: 1.5, pressure: 1.5 },
											});
											
											// Clear irrigation counts
											setIrrigationCounts({
												sprinkler_system: 0,
												pivot: 0,
												drip_tape: 0,
												water_jet_tape: 0,
											});
											
											// Clear irrigation positions
											setIrrigationPositions({
												sprinklers: [],
												pivots: [],
												dripTapes: [],
												waterJets: []
											});
											
											// Clear irrigation overlays
											irrigationMarkersRef.current.forEach(marker => marker.setMap(null));
											irrigationMarkersRef.current = [];
											irrigationCirclesRef.current.forEach(circle => circle.setMap(null));
											irrigationCirclesRef.current = [];
										}}
										className="flex-1 px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-500 transition-colors border border-white"
									>
										{t('Reset')}
									</button>
									
									<button 
										onClick={handleNext}
										className="flex-1 px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors border border-white"
										disabled={!hasGeneratedIrrigation}
									>
										{t('Next')}
									</button>
								</div>
							</div>
						</div>

						{/* Right Side - Google Map */}
						<div className="flex-1 relative">
							<div className="absolute inset-0 border border-white" style={{ backgroundColor: '#000005' }}>
								{!isMapLoaded && (
									<div className="flex items-center justify-center h-full">
										<div className="text-white text-center">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
											<p className="text-sm">{t('Loading Map...')}</p>
										</div>
									</div>
								)}
								<HorticultureMapComponent
									center={[calculatedMapCenter.lat, calculatedMapCenter.lng]}
									zoom={finalMapZoom}
									onMapLoad={handleMapLoad}
									mapOptions={{ maxZoom: 22, fullscreenControl: true }}
								/>
								<div className="absolute top-2.5 right-16 z-10 bg-black bg-opacity-80 rounded-lg border border-white p-3 text-xs">
									<div className="text-white flex gap-2">
										<span>Lat: {calculatedMapCenter.lat.toFixed(4)}</span>
										<span>Lng: {calculatedMapCenter.lng.toFixed(4)}</span>
									</div>
								</div>
								
								{/* Hide/Show Points Button */}
								{realPlantCount > 0 && (
									<div className="absolute top-2.5 right-60 z-10">
										<button 
											onClick={() => {
												const newHideState = !hideAllPoints;
												console.log('Irrigation - Toggling hideAllPoints from', hideAllPoints, 'to', newHideState);
												setHideAllPoints(newHideState);
												
												// Save the new state to localStorage immediately
												try {
													const existingData = localStorage.getItem('fieldCropData');
													if (existingData) {
														const fieldData = JSON.parse(existingData) as FieldData;
														const updatedData = {
															...fieldData,
															hideAllPoints: newHideState
														};
														console.log('Irrigation - Saving hideAllPoints to localStorage:', newHideState);
														safeSetItem('fieldCropData', updatedData);
													}
												} catch (error) {
													console.error('Error saving hideAllPoints state:', error);
												}
											}}
											className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 shadow-lg border ${
												hideAllPoints 
													? 'bg-red-600 text-white border-red-500 hover:bg-red-500' 
													: 'bg-green-600 text-white border-green-500 hover:bg-green-500'
											}`}
											title={hideAllPoints ? t('Show All Points') : t('Hide All Points')}
										>
											{hideAllPoints ? (
												<div className="flex items-center gap-1">
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
													{t('Show')}
												</div>
											) : (
												<div className="flex items-center gap-1">
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
													</svg>
													{t('Hide')}
												</div>
											)}
										</button>
									</div>
								)}
								<div className="absolute bottom-4 right-20 z-10 pointer-events-none">
									<div className="px-2 py-1 rounded bg-black bg-opacity-70 border border-white text-xs text-white mb-1">
										{t('Zoom Level')}: {parsedMapZoom}
									</div>
									{finalPlantPoints.length > 0 && (
										<div className="px-2 py-1 rounded bg-black bg-opacity-70 border border-white text-xs text-white mb-1">
											{t('Points')}: {finalPlantPoints.length.toLocaleString()} / {realPlantCount.toLocaleString()}
											{realPlantCount > finalPlantPoints.length && (
												<span className="text-yellow-300 ml-1">
													({Math.round((1 - finalPlantPoints.length / realPlantCount) * 100)}% {t('reduced')})
												</span>
											)}
										</div>
									)}
									{finalPlantPoints.length > 0 && realPlantCount >= 800 && (
										<div className="px-2 py-1 rounded bg-blue-900 bg-opacity-70 border border-blue-500 text-xs text-white mb-1">
											{parsedMapZoom >= 20 && <span className="text-green-300">{t('All points visible')}</span>}
											{parsedMapZoom >= 19 && parsedMapZoom < 20 && <span className="text-yellow-300">{t('25% reduction')}</span>}
											{parsedMapZoom >= 18 && parsedMapZoom < 19 && <span className="text-orange-300">{t('50% reduction')}</span>}
											{parsedMapZoom >= 17 && parsedMapZoom < 18 && <span className="text-red-300">{t('75% reduction')}</span>}
											{parsedMapZoom < 17 && <span className="text-red-500">{t('Maximum reduction')}</span>}
										</div>
									)}
									{finalPlantPoints.length > 0 && (
										<div className="px-2 py-1 rounded bg-green-900 bg-opacity-70 border border-green-500 text-xs text-white">
											<div>{finalPlantPoints.length} {t('points')} {t('visible')}</div>
											{realPlantCount > finalPlantPoints.length && (
												<div className="text-yellow-200 text-xs">
													{t('Performance optimized')}
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}