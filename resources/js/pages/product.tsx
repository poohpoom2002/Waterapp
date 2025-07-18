// resources/js/pages/product.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { IrrigationInput, QuotationData, QuotationDataCustomer } from './types/interfaces';
import { useCalculations } from './hooks/useCalculations';
import { calculatePipeRolls, formatNumber } from './utils/calculations';

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
import FloatingAiChat from '@/components/FloatingAiChat';
import { getFarmData } from '@/utils/farmData';
import { getPipeLengthData } from '@/utils/pipeData';

export default function Product() {
    const [projectData, setProjectData] = useState<HorticultureProjectData | null>(null);
    const [projectStats, setProjectStats] = useState<any>(null);
    const [selectedZones, setSelectedZones] = useState<string[]>([]);
    const [activeZoneId, setActiveZoneId] = useState<string>('');
    const [zoneInputs, setZoneInputs] = useState<{ [zoneId: string]: IrrigationInput }>({});
    const [zoneSprinklers, setZoneSprinklers] = useState<{ [zoneId: string]: any }>({});

    const [showFloatingAiChat, setShowFloatingAiChat] = useState(false);
    const [isAiChatMinimized, setIsAiChatMinimized] = useState(false);

    const { t } = useLanguage();
    const [farmData, setFarmData] = useState(() => getFarmData());
    const [pipeLengthData, setPipeLengthData] = useState(() => getPipeLengthData());

    const [selectedPipes, setSelectedPipes] = useState<{
        [zoneId: string]: {
            branch?: any;
            secondary?: any;
            main?: any;
        };
    }>({});
    const [selectedPump, setSelectedPump] = useState<any>(null);

    const [projectImage, setProjectImage] = useState<string | null>(null);
    const [showImageModal, setShowImageModal] = useState(false);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setProjectImage(url);
        }
    };

    const handleImageDelete = () => {
        if (projectImage && projectImage.startsWith('blob:')) {
            URL.revokeObjectURL(projectImage);
        }
        setProjectImage(null);
    };

    useEffect(() => {
        return () => {
            if (projectImage && projectImage.startsWith('blob:')) {
                URL.revokeObjectURL(projectImage);
            }
        };
    }, [projectImage]);

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

        const totalTrees = zone.plantCount || 100;
        const waterPerTree = zone.plantData?.waterNeed || 50;

        const branchStats = getLongestBranchPipeStats();
        const subMainStats = getSubMainPipeBranchCount();

        let actualSprinklersPerLongestBranch = 4;
        let actualBranchesPerLongestSecondary = 5;

        if (branchStats) {
            const zoneBranchStats = branchStats.find((stat) => stat.zoneId === zone.id);
            if (zoneBranchStats) {
                actualSprinklersPerLongestBranch = zoneBranchStats.longestBranchPipe.plantCount;
            }
        }

        if (subMainStats) {
            const zoneSubMainStats = subMainStats.find((stat) => stat.zoneId === zone.id);
            if (zoneSubMainStats && zoneSubMainStats.subMainPipes.length > 0) {
                const maxBranchSubMain = zoneSubMainStats.subMainPipes.reduce((max, current) =>
                    current.branchCount > max.branchCount ? current : max
                );
                actualBranchesPerLongestSecondary = maxBranchSubMain.branchCount;
            }
        }

        const input: IrrigationInput = {
            farmSizeRai: formatNumber(zone.area / 1600, 3),
            totalTrees: totalTrees,
            waterPerTreeLiters: formatNumber(waterPerTree, 3),
            numberOfZones: totalZones,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 20,
            staticHeadM: 0,
            pressureHeadM: 20,
            pipeAgeYears: 0,

            sprinklersPerBranch: Math.max(
                1,
                Math.ceil(totalTrees / Math.max(branchPipes.length, 1))
            ),
            branchesPerSecondary: Math.max(
                1,
                Math.ceil(branchPipes.length / Math.max(subMainPipes.length, 1))
            ),
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

        console.log(`📊 Created zone input for ${zone.name}:`, {
            area: input.farmSizeRai,
            trees: input.totalTrees,
            waterPerTree: input.waterPerTreeLiters,
            longestBranch: input.longestBranchPipeM,
            sprinklersPerLongestBranch: input.sprinklersPerLongestBranch,
        });

        return input;
    };

    const createSingleZoneInput = (data: HorticultureProjectData, stats: any): IrrigationInput => {
        const totalStats = stats.zoneDetails[0];

        const branchStats = getLongestBranchPipeStats();
        const subMainStats = getSubMainPipeBranchCount();

        let actualSprinklersPerLongestBranch = 4;
        let actualBranchesPerLongestSecondary = 5;

        if (branchStats && branchStats.length > 0) {
            actualSprinklersPerLongestBranch = branchStats[0].longestBranchPipe.plantCount;
        }

        if (subMainStats && subMainStats.length > 0) {
            const zoneSubMainStats = subMainStats[0];
            if (zoneSubMainStats.subMainPipes.length > 0) {
                const maxBranchSubMain = zoneSubMainStats.subMainPipes.reduce((max, current) =>
                    current.branchCount > max.branchCount ? current : max
                );
                actualBranchesPerLongestSecondary = maxBranchSubMain.branchCount;
            }
        }

        const plantData = data.selectedPlantType || data.plants?.[0]?.plantData;
        const waterPerTree = plantData?.waterNeed || totalStats.waterPerPlant || 50;

        return {
            farmSizeRai: formatNumber(data.totalArea / 1600, 3),
            totalTrees: data.plants?.length || 100,
            waterPerTreeLiters: formatNumber(waterPerTree, 3),
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

    const currentInput = useMemo(() => {
        if (!activeZoneId || !zoneInputs[activeZoneId]) {
            return null;
        }

        const baseInput = zoneInputs[activeZoneId];

        if (selectedZones.length > 1) {
            let totalTrees = 0;
            let totalWater = 0;
            let totalFarmSize = 0;

            const activeInput = zoneInputs[activeZoneId];

            selectedZones.forEach((zoneId) => {
                const zoneInput = zoneInputs[zoneId];
                if (zoneInput) {
                    totalTrees += zoneInput.totalTrees;
                    totalWater += zoneInput.totalTrees * zoneInput.waterPerTreeLiters;
                    totalFarmSize += zoneInput.farmSizeRai;
                }
            });

            const avgWaterPerTree =
                totalTrees > 0 ? totalWater / totalTrees : baseInput.waterPerTreeLiters;

            return {
                ...activeInput,
                farmSizeRai: formatNumber(totalFarmSize, 3),
                totalTrees: totalTrees,
                waterPerTreeLiters: formatNumber(avgWaterPerTree, 3),
                numberOfZones: selectedZones.length,
                simultaneousZones: selectedZones.length,
            };
        }

        return baseInput;
    }, [activeZoneId, zoneInputs, selectedZones]);

    useEffect(() => {
        const data = loadProjectData();
        const stats = getProjectStats();

        if (data && stats) {
            setProjectData(data);
            setProjectStats(stats);

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

                    initialSelectedPipes[zone.id] = {
                        branch: null,
                        secondary: null,
                        main: null,
                    };
                });

                setZoneInputs(initialZoneInputs);
                setSelectedPipes(initialSelectedPipes);
                setActiveZoneId(data.zones[0].id);
                setSelectedZones([data.zones[0].id]);

                console.log('🔧 Multi-zone setup completed:', {
                    zones: data.zones.length,
                    activeZone: data.zones[0].id,
                    inputs: Object.keys(initialZoneInputs),
                });
            } else {
                const singleInput = createSingleZoneInput(data, stats);
                setZoneInputs({ 'main-area': singleInput });
                setSelectedPipes({ 'main-area': { branch: null, secondary: null, main: null } });
                setActiveZoneId('main-area');
                setSelectedZones(['main-area']);

                console.log('🔧 Single zone setup completed:', {
                    input: singleInput,
                });
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
            console.log(`💧 Sprinkler selected for zone ${activeZoneId}:`, sprinkler.name);
        }
    };

    const handlePipeChange = (pipeType: 'branch' | 'secondary' | 'main', pipe: any) => {
        if (activeZoneId) {
            setSelectedPipes((prev) => ({
                ...prev,
                [activeZoneId]: {
                    ...prev[activeZoneId],
                    [pipeType]: pipe,
                },
            }));
            console.log(
                `🔧 ${pipeType} pipe selected for zone ${activeZoneId}:`,
                pipe?.name || 'auto'
            );
        }
    };

    const handlePumpChange = (pump: any) => {
        setSelectedPump(pump);
        console.log('⚡ Pump selected:', pump?.name || 'auto');
    };

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

    const handleZoneSelection = (zoneId: string, selected: boolean) => {
        if (selected) {
            setSelectedZones((prev) => [...prev, zoneId]);
        } else {
            setSelectedZones((prev) => prev.filter((id) => id !== zoneId));
        }
        console.log(`🌱 Zone ${zoneId} ${selected ? 'selected' : 'deselected'}`);
    };

    const handleInputChange = (input: IrrigationInput) => {
        if (activeZoneId) {
            setZoneInputs((prev) => ({
                ...prev,
                [activeZoneId]: input,
            }));
            console.log(`📝 Input updated for zone ${activeZoneId}`);
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
            pump: selectedPump || results?.autoSelectedPump,
        };
    };

    const hasEssentialData = projectData && projectStats;

    if (!hasEssentialData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 p-6 text-white">
                <div className="text-center">
                    <div className="mb-6 text-6xl">🌱</div>
                    <h1 className="mb-4 text-2xl font-bold text-blue-400">ระบบชลประทาน</h1>
                    <p className="mb-6 text-gray-300">ไม่พบข้อมูลโครงการ</p>
                    <button
                        onClick={() => router.visit('/horticulture/planner')}
                        className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                    >
                        📐 ไปหน้าวางแผน
                    </button>
                </div>
            </div>
        );
    }

    if (!results || !currentInput) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900 p-6 text-white">
                <div className="text-center">
                    <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-400"></div>
                    <p className="text-gray-300">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    const effectiveEquipment = getEffectiveEquipment();

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="border-b border-gray-700 bg-gray-800 p-4">
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img
                            src="https://f.btwcdn.com/store-50036/store/e4c1b5ae-cf8e-5017-536b-66ecd994018d.jpg"
                            alt="logo"
                            className="h-12 w-12 rounded-lg"
                        />
                        <div>
                            <h1 className="text-xl font-bold text-blue-400">🌱 ระบบชลประทาน</h1>
                            <p className="text-sm text-gray-400">กนกโปรดักส์</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />
                        <button
                            onClick={() => setShowFloatingAiChat(true)}
                            className="rounded-lg bg-gradient-to-r from-green-500 to-blue-500 px-4 py-2 text-sm font-medium transition-all hover:from-green-600 hover:to-blue-600"
                        >
                            🤖 AI ช่วยเหลือ
                        </button>
                        <button
                            onClick={() => (window.location.href = '/equipment-crud')}
                            className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-700"
                        >
                            ⚙️ จัดการอุปกรณ์
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-8xl mx-auto p-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <div className="sticky top-6">
                            <div className="h-[350px] rounded-lg bg-gray-800 p-4">
                                <h2 className="mb-3 text-lg font-semibold text-blue-400">
                                    📐 แผนผัง
                                </h2>

                                {projectImage ? (
                                    <div className="group relative">
                                        <img
                                            src={projectImage}
                                            alt="Project"
                                            className="w-full cursor-pointer rounded-lg transition-transform hover:scale-105"
                                            onClick={() => setShowImageModal(true)}
                                        />
                                        <div className="absolute right-2 top-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                            <label className="cursor-pointer rounded-full bg-blue-600 p-2 text-sm hover:bg-blue-700">
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
                                                className="rounded-full bg-red-600 p-2 text-sm hover:bg-red-700"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex h-[280px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-600 hover:border-blue-500">
                                        <div className="text-4xl text-gray-500">📷</div>
                                        <p className="mt-2 text-sm text-gray-400">เพิ่มรูปแผนผัง</p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8">
                        {projectData?.useZones && projectData.zones.length > 1 && (
                            <div className="mb-6 rounded-lg bg-gray-800 p-4">
                                <h3 className="mb-3 text-lg font-semibold text-yellow-400">
                                    🏗️ เลือกโซนสำหรับการคำนวณ
                                </h3>
                                <div className="mb-3 rounded bg-blue-900 p-3">
                                    <h4 className="mb-2 text-sm font-medium text-blue-300">
                                        💡 วิธีการทำงาน:
                                    </h4>
                                    <ul className="space-y-1 text-xs text-blue-200">
                                        <li>• เลือกโซนที่ต้องการคำนวณ (สามารถเลือกหลายโซนได้)</li>
                                        <li>• คลิกที่แท็บโซนเพื่อดูรายละเอียดและเลือกอุปกรณ์</li>
                                        <li>• ระบบจะคำนวณปั๊มตามโซนที่ทำงานพร้อมกัน</li>
                                        <li>• อุปกรณ์อื่นๆ คำนวณแยกตามแต่ละโซน</li>
                                    </ul>
                                </div>
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                    {projectData.zones.map((zone) => (
                                        <label
                                            key={zone.id}
                                            className="flex cursor-pointer items-center gap-2 rounded bg-gray-700 p-2 hover:bg-gray-600"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedZones.includes(zone.id)}
                                                onChange={(e) =>
                                                    handleZoneSelection(zone.id, e.target.checked)
                                                }
                                                className="rounded"
                                            />
                                            <div className="flex-1">
                                                <span className="text-sm font-medium">
                                                    {zone.name}
                                                </span>
                                                <div className="text-xs text-gray-400">
                                                    <p>{(zone.area / 1600).toFixed(1)} ไร่</p>
                                                    <p>{zone.plantCount} ต้น</p>
                                                </div>
                                            </div>
                                            {zoneSprinklers[zone.id] && (
                                                <span className="text-lg text-green-400">✓</span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                                {selectedZones.length > 1 && (
                                    <div className="mt-3 rounded bg-yellow-900 p-2">
                                        <p className="text-sm text-yellow-300">
                                            ⚠️ เลือก {selectedZones.length} โซน -
                                            ปั๊มจะคำนวณสำหรับการทำงานพร้อมกัน
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {projectData?.useZones && projectData.zones.length > 1 && (
                            <div className="mb-6 flex flex-wrap gap-2">
                                {projectData.zones.map((zone) => {
                                    const isActive = activeZoneId === zone.id;
                                    const isSelected = selectedZones.includes(zone.id);
                                    const hasSprinkler = !!zoneSprinklers[zone.id];

                                    return (
                                        <button
                                            key={zone.id}
                                            onClick={() => setActiveZoneId(zone.id)}
                                            disabled={!isSelected}
                                            className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                                isActive && isSelected
                                                    ? 'bg-blue-600 text-white'
                                                    : isSelected
                                                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                      : 'cursor-not-allowed bg-gray-800 text-gray-500'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>{zone.name}</span>
                                                {hasSprinkler && (
                                                    <span className="text-xs text-green-400">
                                                        ✓
                                                    </span>
                                                )}
                                                {!isSelected && (
                                                    <span className="text-xs text-gray-500">○</span>
                                                )}
                                            </div>
                                            <div className="text-xs opacity-75">
                                                {(zone.area / 1600).toFixed(1)}ไร่ •{' '}
                                                {zone.plantCount}ต้น
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <InputForm
                            input={currentInput}
                            onInputChange={handleInputChange}
                            selectedSprinkler={currentSprinkler}
                            activeZone={projectData?.zones.find((z) => z.id === activeZoneId)}
                        />

                        <div className="mb-6 rounded-lg bg-yellow-800 p-4">
                            <div className="flex items-center gap-2 text-yellow-200">
                                <span className="text-2xl">⚡</span>
                                <div>
                                    <p className="font-medium">เลือกสปริงเกอร์ก่อน</p>
                                    <p className="text-sm">ระบบจะเลือกอุปกรณ์อื่นให้อัตโนมัติ</p>
                                    {selectedZones.length > 1 && (
                                        <p className="mt-1 text-xs text-yellow-300">
                                            💡 เลือกสปริงเกอร์สำหรับโซน{' '}
                                            {
                                                projectData?.zones.find(
                                                    (z) => z.id === activeZoneId
                                                )?.name
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <SprinklerSelector
                            selectedSprinkler={currentSprinkler}
                            onSprinklerChange={handleSprinklerChange}
                            results={results}
                            activeZone={projectData?.zones.find((z) => z.id === activeZoneId)}
                            allZoneSprinklers={zoneSprinklers}
                        />

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
                                    activeZone={projectData?.zones.find(
                                        (z) => z.id === activeZoneId
                                    )}
                                    selectedZones={selectedZones}
                                    allZoneSprinklers={zoneSprinklers}
                                />

                                <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
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
                                        <div className="flex items-center justify-center rounded-lg bg-gray-800 p-8">
                                            <div className="text-center text-gray-500">
                                                <div className="mb-2 text-4xl">➖</div>
                                                <p>ไม่ใช้ท่อรอง</p>
                                            </div>
                                        </div>
                                    )}

                                    {hasValidMainPipeData && (
                                        <div className="md:col-span-2">
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

                                <CostSummary
                                    results={results}
                                    zoneSprinklers={zoneSprinklers}
                                    selectedPipes={selectedPipes}
                                    selectedPump={effectiveEquipment.pump}
                                    activeZoneId={activeZoneId}
                                    projectData={projectData}
                                    zoneInputs={zoneInputs}
                                    onQuotationClick={() => setShowQuotationModal(true)}
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
                        <img
                            src={projectImage}
                            alt="Project"
                            className="max-h-full max-w-full rounded-lg"
                        />
                    </div>
                </div>
            )}

            <FloatingAiChat
                isOpen={showFloatingAiChat}
                onClose={() => setShowFloatingAiChat(false)}
                onMinimize={() => setIsAiChatMinimized(!isAiChatMinimized)}
                isMinimized={isAiChatMinimized}
            />

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
                selectedSprinkler={currentSprinkler}
                selectedPump={effectiveEquipment.pump}
                selectedBranchPipe={effectiveEquipment.branchPipe}
                selectedSecondaryPipe={effectiveEquipment.secondaryPipe}
                selectedMainPipe={effectiveEquipment.mainPipe}
                projectImage={projectImage}
                projectData={projectData}
                zoneSprinklers={zoneSprinklers}
                selectedPipes={selectedPipes}
                onClose={() => setShowQuotation(false)}
            />
        </div>
    );
}
