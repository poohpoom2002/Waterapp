// resources/js/pages/product.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { IrrigationInput, QuotationData, QuotationDataCustomer } from './types/interfaces';
import { useCalculations } from './hooks/useCalculations';
import { calculatePipeRolls, formatNumber } from './utils/calculations';

// Import from horticulture modules instead of farmData/pipeData
import {
    getProjectStats,
    getLongestBranchPipeStats,
    getSubMainPipeBranchCount,
    getDetailedBranchPipeStats,
} from '../utils/horticultureProjectStats';
import {
    loadProjectData,
    HorticultureProjectData,
    Zone,
    MainPipe,
    SubMainPipe,
} from '../utils/horticultureUtils';

import InputForm from './components/InputForm';
import CalculationSummary from './components/CalculationSummary';
import SprinklerSelector from './components/SprinklerSelector';
import PumpSelector from './components/PumpSelector';
import PipeSelector from './components/PipeSelector';
import CostSummary from './components/CostSummary';
import QuotationModal from './components/QuotationModal';
import QuotationDocument from './components/QuotationDocument';

import ChatBox from '@/components/ChatBox';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { router } from '@inertiajs/react';
// ตรวจสอบให้แน่ใจว่า path ถูกต้องตามโครงสร้างโปรเจกต์ของคุณ
import AiChatComponent from '@/components/AiChatComponent';
import { getFarmData } from '@/utils/farmData';
import { getPipeLengthData } from '@/utils/pipeData';

export default function Product() {
    // State for horticulture project data
    const [projectData, setProjectData] = useState<HorticultureProjectData | null>(null);
    const [projectStats, setProjectStats] = useState<any>(null);
    const [selectedZones, setSelectedZones] = useState<string[]>([]);
    const [activeZoneId, setActiveZoneId] = useState<string>('');
    const [zoneInputs, setZoneInputs] = useState<{ [zoneId: string]: IrrigationInput }>({});
    const [zoneSprinklers, setZoneSprinklers] = useState<{ [zoneId: string]: any }>({});

    const { t } = useLanguage();
    // Load saved farm & pipe-length data with state to track changes
    const [farmData, setFarmData] = useState(() => getFarmData());
    const [pipeLengthData, setPipeLengthData] = useState(() => getPipeLengthData());

    // NEW: State for manual equipment selection (override auto-selection)
    const [selectedPipes, setSelectedPipes] = useState<{
        [zoneId: string]: {
            branch?: any;
            secondary?: any;
            main?: any;
        };
    }>({});
    const [selectedPump, setSelectedPump] = useState<any>(null);

    const [projectImage, setProjectImage] = useState<string | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setProjectImage(url);
        }
    };

    const handleImageDelete = () => {
        if (projectImage) {
            URL.revokeObjectURL(projectImage);
            setProjectImage(null);
        }
    };

    // Load horticulture project data
    useEffect(() => {
        console.log('Loading horticulture project data...');
        const data = loadProjectData();
        const stats = getProjectStats();

        if (data && stats) {
            setProjectData(data);
            setProjectStats(stats);

            // Initialize zone inputs for each zone
            if (data.useZones && data.zones.length > 0) {
                const initialZoneInputs: { [zoneId: string]: IrrigationInput } = {};
                const initialSelectedPipes: {
                    [zoneId: string]: { branch?: any; secondary?: any; main?: any };
                } = {};

                data.zones.forEach((zone) => {
                    const zoneStats = stats.zoneDetails.find((z: any) => z.zoneId === zone.id);
                    const zoneMainPipes = data.mainPipes.filter((p) => p.toZone === zone.id);
                    const zoneSubMainPipes = data.subMainPipes.filter((p) => p.zoneId === zone.id);
                    const zoneBranchPipes = zoneSubMainPipes.flatMap((s) => s.branchPipes || []);

                    initialZoneInputs[zone.id] = createZoneInput(
                        zone,
                        zoneStats,
                        zoneMainPipes,
                        zoneSubMainPipes,
                        zoneBranchPipes,
                        data.zones.length
                    );

                    // Initialize pipe selection for each zone
                    initialSelectedPipes[zone.id] = {
                        branch: null,
                        secondary: null,
                        main: null,
                    };
                });

                setZoneInputs(initialZoneInputs);
                setSelectedPipes(initialSelectedPipes);
                setActiveZoneId(data.zones[0].id);
                setSelectedZones([data.zones[0].id]); // Default select first zone
            } else {
                // Single zone mode
                const singleInput = createSingleZoneInput(data, stats);
                setZoneInputs({ 'main-area': singleInput });
                setSelectedPipes({ 'main-area': { branch: null, secondary: null, main: null } });
                setActiveZoneId('main-area');
                setSelectedZones(['main-area']);
            }
        }
    }, []);

    // Helper function to create zone input
    const createZoneInput = (
        zone: Zone,
        zoneStats: any,
        mainPipes: MainPipe[],
        subMainPipes: SubMainPipe[],
        branchPipes: any[],
        totalZones: number
    ): IrrigationInput => {
        const longestBranch =
            branchPipes.length > 0 ? Math.max(...branchPipes.map((b) => b.length)) : 30;
        const totalBranchLength = branchPipes.reduce((sum, b) => sum + b.length, 0) || 500;

        const longestSubMain =
            subMainPipes.length > 0 ? Math.max(...subMainPipes.map((s) => s.length)) : 0;
        const totalSubMainLength = subMainPipes.reduce((sum, s) => sum + s.length, 0) || 0;

        const longestMain = mainPipes.length > 0 ? Math.max(...mainPipes.map((m) => m.length)) : 0;
        const totalMainLength = mainPipes.reduce((sum, m) => sum + m.length, 0) || 0;

        // Calculate sprinklers configuration
        const totalTrees = zone.plantCount || 100;
        const waterPerTree = zone.totalWaterNeed / totalTrees || 50;

        // Get actual branch pipe statistics from horticulture data
        const branchStats = getLongestBranchPipeStats();
        const subMainStats = getSubMainPipeBranchCount();

        let actualSprinklersPerLongestBranch = 4; // default
        let actualBranchesPerLongestSecondary = 5; // default

        if (branchStats) {
            // Find the zone-specific data
            const zoneBranchStats = branchStats.find((stat) => stat.zoneId === zone.id);
            if (zoneBranchStats) {
                actualSprinklersPerLongestBranch = zoneBranchStats.longestBranchPipe.plantCount;
            }
        }

        if (subMainStats) {
            // Find the zone-specific data
            const zoneSubMainStats = subMainStats.find((stat) => stat.zoneId === zone.id);
            if (zoneSubMainStats && zoneSubMainStats.subMainPipes.length > 0) {
                // Find the sub-main pipe with the most branches
                const maxBranchSubMain = zoneSubMainStats.subMainPipes.reduce((max, current) =>
                    current.branchCount > max.branchCount ? current : max
                );
                actualBranchesPerLongestSecondary = maxBranchSubMain.branchCount;
            }
        }

        return {
            farmSizeRai: formatNumber(zone.area / 1600, 3),
            totalTrees: totalTrees,
            waterPerTreeLiters: formatNumber(waterPerTree, 3),
            numberOfZones: totalZones,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 20,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(1, Math.ceil(totalTrees / 10)),
            branchesPerSecondary: Math.max(1, Math.ceil(totalTrees / 50)),
            simultaneousZones: 1,

            sprinklersPerLongestBranch: actualSprinklersPerLongestBranch,
            branchesPerLongestSecondary: actualBranchesPerLongestSecondary,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(longestBranch, 3),
            totalBranchPipeM: formatNumber(totalBranchLength, 3),
            longestSecondaryPipeM: formatNumber(longestSubMain, 3),
            totalSecondaryPipeM: formatNumber(totalSubMainLength, 3),
            longestMainPipeM: formatNumber(longestMain, 3),
            totalMainPipeM: formatNumber(totalMainLength, 3),
        };
    };

    // Helper function for single zone
    const createSingleZoneInput = (data: HorticultureProjectData, stats: any): IrrigationInput => {
        const totalStats = stats.zoneDetails[0]; // Main area stats

        // Get actual branch pipe statistics from horticulture data
        const branchStats = getLongestBranchPipeStats();
        const subMainStats = getSubMainPipeBranchCount();

        let actualSprinklersPerLongestBranch = 4; // default
        let actualBranchesPerLongestSecondary = 5; // default

        if (branchStats && branchStats.length > 0) {
            // For single zone, use the first (and only) zone data
            actualSprinklersPerLongestBranch = branchStats[0].longestBranchPipe.plantCount;
        }

        if (subMainStats && subMainStats.length > 0) {
            // For single zone, find the sub-main pipe with the most branches
            const zoneSubMainStats = subMainStats[0];
            if (zoneSubMainStats.subMainPipes.length > 0) {
                const maxBranchSubMain = zoneSubMainStats.subMainPipes.reduce((max, current) =>
                    current.branchCount > max.branchCount ? current : max
                );
                actualBranchesPerLongestSecondary = maxBranchSubMain.branchCount;
            }
        }

        return {
            farmSizeRai: formatNumber(data.totalArea / 1600, 3),
            totalTrees: data.plants?.length || 100,
            waterPerTreeLiters: formatNumber(totalStats.waterPerPlant || 50, 3),
            numberOfZones: 1,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 20,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: 4,
            branchesPerSecondary: 5,
            simultaneousZones: 1,

            sprinklersPerLongestBranch: actualSprinklersPerLongestBranch,
            branchesPerLongestSecondary: actualBranchesPerLongestSecondary,
            secondariesPerLongestMain: 1,

            longestBranchPipeM: formatNumber(totalStats.branchPipesInZone.longest || 30, 3),
            totalBranchPipeM: formatNumber(totalStats.branchPipesInZone.totalLength || 500, 3),
            longestSecondaryPipeM: formatNumber(totalStats.subMainPipesInZone.longest || 0, 3),
            totalSecondaryPipeM: formatNumber(totalStats.subMainPipesInZone.totalLength || 0, 3),
            longestMainPipeM: formatNumber(totalStats.mainPipesInZone.longest || 0, 3),
            totalMainPipeM: formatNumber(totalStats.mainPipesInZone.totalLength || 0, 3),
        };
    };

    // Get current input based on active zone
    const currentInput = useMemo(() => {
        if (!activeZoneId || !zoneInputs[activeZoneId]) {
            return null;
        }

        // If multiple zones selected, calculate combined input
        if (selectedZones.length > 1) {
            // Calculate combined input for pump sizing
            let combinedInput = { ...zoneInputs[activeZoneId] };

            // Sum up total trees and water requirements
            let totalTrees = 0;
            let totalWater = 0;
            let maxLongestBranch = 0;
            let maxLongestSecondary = 0;
            let maxLongestMain = 0;

            selectedZones.forEach((zoneId) => {
                const zoneInput = zoneInputs[zoneId];
                if (zoneInput) {
                    totalTrees += zoneInput.totalTrees;
                    totalWater += zoneInput.totalTrees * zoneInput.waterPerTreeLiters;
                    maxLongestBranch = Math.max(maxLongestBranch, zoneInput.longestBranchPipeM);
                    maxLongestSecondary = Math.max(
                        maxLongestSecondary,
                        zoneInput.longestSecondaryPipeM
                    );
                    maxLongestMain = Math.max(maxLongestMain, zoneInput.longestMainPipeM);
                }
            });

            // Get actual branch pipe statistics for combined zones
            const branchStats = getLongestBranchPipeStats();
            const subMainStats = getSubMainPipeBranchCount();

            let maxSprinklersPerLongestBranch = 4; // default
            let maxBranchesPerLongestSecondary = 5; // default

            if (branchStats) {
                // Find the maximum plant count across all selected zones
                selectedZones.forEach((zoneId) => {
                    const zoneBranchStats = branchStats.find((stat) => stat.zoneId === zoneId);
                    if (zoneBranchStats) {
                        maxSprinklersPerLongestBranch = Math.max(
                            maxSprinklersPerLongestBranch,
                            zoneBranchStats.longestBranchPipe.plantCount
                        );
                    }
                });
            }

            if (subMainStats) {
                // Find the maximum branch count across all selected zones
                selectedZones.forEach((zoneId) => {
                    const zoneSubMainStats = subMainStats.find((stat) => stat.zoneId === zoneId);
                    if (zoneSubMainStats && zoneSubMainStats.subMainPipes.length > 0) {
                        const maxBranchSubMain = zoneSubMainStats.subMainPipes.reduce(
                            (max, current) =>
                                current.branchCount > max.branchCount ? current : max
                        );
                        maxBranchesPerLongestSecondary = Math.max(
                            maxBranchesPerLongestSecondary,
                            maxBranchSubMain.branchCount
                        );
                    }
                });
            }

            combinedInput.simultaneousZones = selectedZones.length;
            combinedInput.longestBranchPipeM = maxLongestBranch;
            combinedInput.longestSecondaryPipeM = maxLongestSecondary;
            combinedInput.longestMainPipeM = maxLongestMain;
            combinedInput.sprinklersPerLongestBranch = maxSprinklersPerLongestBranch;
            combinedInput.branchesPerLongestSecondary = maxBranchesPerLongestSecondary;

            return combinedInput;
        }

        return zoneInputs[activeZoneId];
    }, [activeZoneId, zoneInputs, selectedZones]);

    // Get current sprinkler for active zone
    const currentSprinkler = zoneSprinklers[activeZoneId] || null;

    // Handle sprinkler selection per zone
    const handleSprinklerChange = (sprinkler: any) => {
        if (activeZoneId && sprinkler) {
            setZoneSprinklers((prev) => ({
                ...prev,
                [activeZoneId]: sprinkler,
            }));
        }
    };

    // NEW: Handle pipe selection per zone
    const handlePipeChange = (pipeType: 'branch' | 'secondary' | 'main', pipe: any) => {
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

    // NEW: Handle pump selection
    const handlePumpChange = (pump: any) => {
        setSelectedPump(pump);
    };

    // Calculate results based on selected sprinkler and zone
    const results = useCalculations(currentInput as IrrigationInput, currentSprinkler);

    const hasValidMainPipeData = results?.hasValidMainPipe ?? false;
    const hasValidSubmainPipeData = results?.hasValidSecondaryPipe ?? false;

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
        address1: '',
        address2: '',
        phone: '',
    });

    // Handle zone selection
    const handleZoneSelection = (zoneId: string, selected: boolean) => {
        if (selected) {
            setSelectedZones((prev) => [...prev, zoneId]);
        } else {
            setSelectedZones((prev) => prev.filter((id) => id !== zoneId));
        }
    };

    // Handle input change for specific zone
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

    // NEW: Get effective equipment (manual selection takes priority over auto-selection)
    const getEffectiveEquipment = () => {
        const currentZonePipes = selectedPipes[activeZoneId] || {};

        return {
            branchPipe: currentZonePipes.branch || results?.autoSelectedBranchPipe,
            secondaryPipe: currentZonePipes.secondary || results?.autoSelectedSecondaryPipe,
            mainPipe: currentZonePipes.main || results?.autoSelectedMainPipe,
            pump: selectedPump || results?.autoSelectedPump,
        };
    };

    const hasEssentialData = projectData && projectStats;

    if (!hasEssentialData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-800 p-6 text-white">
                <div className="mx-auto max-w-7xl">
                    <h1 className="mb-8 text-center text-3xl font-bold text-blue-400">
                        Irrigation Layout Planning Application
                    </h1>
                    <div className="text-center">
                        <p className="mb-4 text-yellow-400">ไม่พบข้อมูลโครงการระบบน้ำสวนผลไม้</p>
                        <p className="text-gray-300">กรุณากลับไปทำการวางแผนการปลูกและวางท่อก่อน</p>
                        <button
                            onClick={() => router.visit('/horticulture/planner')}
                            className="mt-4 rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                        >
                            ไปหน้า Horticulture Planner
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!results || !currentInput) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-800 p-6 text-white">
                <div className="mx-auto max-w-7xl">
                    <h1 className="mb-8 text-center text-3xl font-bold text-blue-400">
                        Irrigation Layout Planning Application
                    </h1>
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
                        <p className="mt-2">กำลังโหลดข้อมูลอุปกรณ์จากฐานข้อมูล...</p>
                    </div>
                </div>
            </div>
        );
    }

    const effectiveEquipment = getEffectiveEquipment();

    return (
        <div className="min-h-screen bg-gray-800 p-6 text-white">
            <div className="flex w-full items-start justify-start gap-4">
                {/* Left Fixed Panel */}
                <div className="fixed left-2 top-6 z-40 ml-4 flex w-[570px] flex-col items-center justify-center gap-3">
                    <div className="w-full">
                        <h1 className="mb-2 text-center text-xl font-bold text-blue-400">
                            แผนผังโครงการ
                        </h1>

                        {projectImage ? (
                            <div className="relative">
                                <img
                                    src={projectImage}
                                    alt="Project preview"
                                    className="h-[350px] w-full rounded-lg bg-gray-700 object-contain shadow-lg"
                                />
                                <button
                                    onClick={handleImageDelete}
                                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-lg font-bold text-white shadow-lg transition-colors duration-200 hover:bg-red-700"
                                    title="ลบรูปภาพ"
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <div className="flex h-[350px] w-full flex-col items-center justify-center rounded-lg bg-gray-700 text-gray-400">
                                ยังไม่ได้เลือกรูปภาพ
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="mt-2 w-1/3 text-sm text-white file:mr-4 file:rounded file:border-0 file:bg-blue-600 file:bg-none file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-blue-700"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="ml-[600px] w-full max-w-full">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center justify-start gap-4">
                            <img
                                src="https://f.btwcdn.com/store-50036/store/e4c1b5ae-cf8e-5017-536b-66ecd994018d.jpg"
                                alt="logo"
                                className="h-[80px] w-[80px] rounded-xl"
                            />
                            <div>
                                <h1 className="text-left text-3xl font-bold text-blue-400">
                                    Irrigation Layout Planning
                                </h1>
                                <p className="mt-2 text-left text-lg text-blue-400">
                                    แอปพลิเคชันวางแผนผังชลประทานน้ำ บจก.กนกโปรดักส์ จำกัด
                                </p>
                                <p className="mt-1 text-sm text-green-400">
                                    🔗 ระบบเชื่อมต่อกับข้อมูลโครงการ Horticulture | 🤖
                                    เลือกอุปกรณ์อัตโนมัติ | 🎛️ ปรับแต่งได้
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-4">
                            <LanguageSwitcher />
                            <button
                                onClick={() => (window.location.href = '/equipment-crud')}
                                className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                            >
                                จัดการอุปกรณ์
                            </button>
                        </div>
                    </div>

                    {/* Zone Selection */}
                    {projectData?.useZones && projectData.zones.length > 1 && (
                        <div className="mb-6 rounded-lg bg-gray-700 p-4">
                            <h3 className="mb-3 text-lg font-semibold text-yellow-400">
                                เลือกโซนสำหรับการคำนวณ
                            </h3>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                {projectData.zones.map((zone) => (
                                    <div key={zone.id} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`zone-${zone.id}`}
                                            checked={selectedZones.includes(zone.id)}
                                            onChange={(e) =>
                                                handleZoneSelection(zone.id, e.target.checked)
                                            }
                                            className="mr-2"
                                        />
                                        <label htmlFor={`zone-${zone.id}`} className="text-sm">
                                            {zone.name} ({(zone.area / 1600).toFixed(2)} ไร่)
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 text-sm text-gray-300">
                                <p>โซนที่เลือก: {selectedZones.length} โซน</p>
                                <p>
                                    การคำนวณปั๊มจะใช้ข้อมูลจากโซนที่เลือกพร้อมกัน (ท่อแยกแต่ละโซน)
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Active Zone Tabs */}
                    {projectData?.useZones && projectData.zones.length > 1 && (
                        <div className="mb-4 flex space-x-2">
                            {projectData.zones.map((zone) => (
                                <button
                                    key={zone.id}
                                    onClick={() => setActiveZoneId(zone.id)}
                                    className={`rounded px-4 py-2 text-sm ${
                                        activeZoneId === zone.id
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                    }`}
                                >
                                    {zone.name}
                                    {/* Show if zone has sprinkler selected */}
                                    {zoneSprinklers[zone.id] && (
                                        <span className="ml-1 text-green-300">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    <InputForm
                        input={currentInput}
                        onInputChange={handleInputChange}
                        selectedSprinkler={currentSprinkler}
                        activeZone={projectData?.zones.find((z) => z.id === activeZoneId)}
                    />

                    {/* Sprinkler must be selected first */}
                    <div className="mb-6">
                        <div className="mb-4 rounded-lg bg-yellow-900 p-4">
                            <p className="text-yellow-300">
                                ⚡ กรุณาเลือกสปริงเกอร์ก่อน
                                เพื่อคำนวณความต้องการน้ำและขนาดท่อที่เหมาะสม
                                {projectData?.useZones && projectData.zones.length > 1 && (
                                    <span className="mt-1 block text-sm">
                                        แต่ละโซนสามารถเลือกสปริงเกอร์ที่แตกต่างกันได้
                                    </span>
                                )}
                            </p>
                            <p className="mt-2 text-sm text-yellow-200">
                                🤖 ระบบจะเลือกท่อและปั๊มอัตโนมัติหลังจากเลือกสปริงเกอร์แล้ว
                                (ปรับแต่งได้)
                            </p>
                        </div>

                        <SprinklerSelector
                            selectedSprinkler={currentSprinkler}
                            onSprinklerChange={handleSprinklerChange}
                            results={results}
                            activeZone={projectData?.zones.find((z) => z.id === activeZoneId)}
                            allZoneSprinklers={zoneSprinklers}
                        />
                    </div>

                    {currentSprinkler && (
                        <>
                            <CalculationSummary
                                results={results}
                                input={currentInput}
                                selectedSprinkler={currentSprinkler}
                                selectedPump={effectiveEquipment.pump}
                                selectedBranchPipe={effectiveEquipment.branchPipe}
                                selectedSecondaryPipe={effectiveEquipment.secondaryPipe}
                                selectedMainPipe={effectiveEquipment.mainPipe}
                                activeZone={projectData?.zones.find((z) => z.id === activeZoneId)}
                                selectedZones={selectedZones}
                                allZoneSprinklers={zoneSprinklers}
                            />

                            <div className="mb-6 space-y-6">
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    <PipeSelector
                                        pipeType="branch"
                                        results={results}
                                        input={currentInput}
                                        selectedPipe={effectiveEquipment.branchPipe}
                                        onPipeChange={(pipe) => handlePipeChange('branch', pipe)}
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
                                        />
                                    ) : (
                                        <div className="rounded bg-gray-900 p-3">
                                            <div className="mb-3 flex h-full items-center justify-center text-center text-white">
                                                <h4 className="text-2xl font-bold text-gray-500">
                                                    ไม่ได้ใช้ท่อเมนรอง
                                                </h4>
                                            </div>
                                        </div>
                                    )}

                                    {hasValidMainPipeData && (
                                        <div>
                                            <PipeSelector
                                                pipeType="main"
                                                results={results}
                                                input={currentInput}
                                                selectedPipe={effectiveEquipment.mainPipe}
                                                onPipeChange={(pipe) =>
                                                    handlePipeChange('main', pipe)
                                                }
                                            />
                                        </div>
                                    )}
                                </div>

                                <PumpSelector
                                    results={results}
                                    selectedPump={effectiveEquipment.pump}
                                    onPumpChange={handlePumpChange}
                                />
                            </div>

                            <CostSummary
                                results={results}
                                zoneSprinklers={zoneSprinklers}
                                selectedPipes={selectedPipes}
                                selectedPump={effectiveEquipment.pump}
                                activeZoneId={activeZoneId}
                                projectData={projectData}
                                onQuotationClick={() => setShowQuotationModal(true)}
                            />
                        </>
                    )}
                </div>
            </div>

            <QuotationModal
                show={showQuotationModal}
                quotationData={quotationData}
                quotationDataCustomer={quotationDataCustomer}
                onQuotationDataChange={setQuotationData}
                onQuotationDataCustomerChange={setQuotationDataCustomer}
                onClose={() => setShowQuotationModal(false)}
                onConfirm={handleQuotationModalConfirm}
            />

            <QuotationDocument
                show={showQuotation}
                results={results}
                quotationData={quotationData}
                quotationDataCustomer={quotationDataCustomer}
                selectedSprinkler={null}
                selectedPump={effectiveEquipment.pump}
                selectedBranchPipe={selectedPipes.branch}
                selectedSecondaryPipe={selectedPipes.secondary}
                selectedMainPipe={selectedPipes.main}
                onClose={() => setShowQuotation(false)}
            />

            {/* --- AI Chat Component --- */}
            {/* วางไว้ที่นี่เพื่อให้เป็น Floating Component ที่แสดงผลทับ UI ทั้งหมด */}
            <div className="no-print">
                <AiChatComponent />
            </div>
        </div>
    );
}
