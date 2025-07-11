// resources\js\pages\product.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { IrrigationInput, QuotationData, QuotationDataCustomer } from './types/interfaces';
import { useCalculations } from './hooks/useCalculations';
import { calculatePipeRolls, formatNumber } from './utils/calculations';

// Helpers for loading saved data
import { getFarmData } from '../utils/farmData';
import { getPipeLengthData } from '../utils/pipeData';

// Components
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

export default function Product() {
    const { t } = useLanguage();
    // Load saved farm & pipe-length data with state to track changes
    const [farmData, setFarmData] = useState(() => getFarmData());
    const [pipeLengthData, setPipeLengthData] = useState(() => getPipeLengthData());

    // Debug logging
    useEffect(() => {
        console.log('=== Farm & Pipe Data Status ===');
        console.log('Farm Data:', farmData);
        console.log('Pipe Length Data:', pipeLengthData);

        if (pipeLengthData) {
            console.log('Main Pipes Valid:', isValidPipeData(pipeLengthData, 'main'));
            console.log('Submain Pipes Valid:', isValidPipeData(pipeLengthData, 'submain'));

            const main = pipeLengthData.mainPipes;
            const submain = pipeLengthData.submainPipes;

            if (main) {
                console.log('Main Pipes - Longest:', main.longest, 'Total:', main.total);
            }
            if (submain) {
                console.log('Submain Pipes - Longest:', submain.longest, 'Total:', submain.total);
            }
        }
        console.log('================================');
    }, [farmData, pipeLengthData]);

    // Refresh data when component mounts or when navigating back
    useEffect(() => {
        const handleFocus = () => {
            console.log('Refreshing data...');
            const newFarmData = getFarmData();
            const newPipeData = getPipeLengthData();

            console.log('New farmData from localStorage:', newFarmData);
            console.log('New pipeData from localStorage:', newPipeData);

            if (newFarmData) {
                setFarmData(newFarmData);
            }
            if (newPipeData) {
                setPipeLengthData(newPipeData);
            }
        };

        // Check data when component mounts
        handleFocus();

        // Listen for when user comes back to this page
        window.addEventListener('focus', handleFocus);

        // Also listen for custom event that we can trigger when needed
        window.addEventListener('storage', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('storage', handleFocus);
        };
    }, []);

    // Helper functions to check if pipe data is valid and not zero
    const isValidPipeData = (pipeData: any, type: 'main' | 'submain'): boolean => {
        if (!pipeData) return false;

        const data = type === 'main' ? pipeData.mainPipes : pipeData.submainPipes;
        if (!data) return false;

        // Check that both longest and total exist and are greater than 0
        return (
            typeof data.longest === 'number' &&
            data.longest > 0 &&
            typeof data.total === 'number' &&
            data.total > 0
        );
    };

    // Prepare initial irrigation input, recalculated when data changes
    const initialInput: IrrigationInput = useMemo(() => {
        console.log('Recalculating initialInput with:', { farmData, pipeLengthData });

        const totalFarm = farmData?.total;
        const zones = farmData?.zones ?? [];
        const main = pipeLengthData?.mainPipes;
        const submain = pipeLengthData?.submainPipes;
        const branches = pipeLengthData?.zones ?? [];

        const area = totalFarm?.area ?? 10;
        const plants = totalFarm?.plants ?? 100;
        const totalWater = totalFarm?.waterNeed ?? plants * 50;

        // Check if we have valid pipe data
        const hasValidMainPipe = isValidPipeData(pipeLengthData, 'main');
        const hasValidSubmainPipe = isValidPipeData(pipeLengthData, 'submain');

        // Use pipe data only if it's valid, otherwise use default values
        const longestBranchPipeM =
            branches.length && branches.some((z) => z.longestBranch > 0)
                ? Math.max(...branches.map((z) => z.longestBranch))
                : 30; // ค่าเริ่มต้นสำหรับท่อย่อย

        const totalBranchPipeM =
            branches.length && branches.some((z) => z.totalBranchLength > 0)
                ? branches.reduce((sum, z) => sum + z.totalBranchLength, 0)
                : 500; // ค่าเริ่มต้นสำหรับท่อย่อย

        const longestSecondaryPipeM = hasValidSubmainPipe && submain?.longest ? submain.longest : 0;
        const totalSecondaryPipeM = hasValidSubmainPipe && submain?.total ? submain.total : 0;
        const longestMainPipeM = hasValidMainPipe && main?.longest ? main.longest : 0;
        const totalMainPipeM = hasValidMainPipe && main?.total ? main.total : 0;

        // คำนวณค่าเริ่มต้นสำหรับฟิลด์ใหม่โดยใช้ข้อมูลจากฟาร์ม
        const totalTrees = Math.round(plants);
        const numberOfZones = zones.length || 1;

        // คำนวณจำนวนสปริงเกอร์ต่อท่อย่อยโดยประมาณ
        const estimatedSprinklersPerBranch = Math.max(
            1,
            Math.ceil(totalTrees / (numberOfZones * 10))
        ); // ประมาณ 10 ท่อย่อยต่อโซน

        // สำหรับท่อย่อยเส้นที่ยาวที่สุด อาจมีสปริงเกอร์มากกว่าเฉลี่ย 20-50%
        const sprinklersPerLongestBranch = Math.max(
            estimatedSprinklersPerBranch,
            Math.ceil(estimatedSprinklersPerBranch * 1.3)
        );

        // คำนวณจำนวนท่อย่อยต่อท่อรอง
        const estimatedBranchesPerSecondary = hasValidSubmainPipe
            ? Math.max(1, Math.ceil(totalTrees / (numberOfZones * sprinklersPerLongestBranch)))
            : 1;
        const branchesPerLongestSecondary = hasValidSubmainPipe
            ? Math.max(
                  estimatedBranchesPerSecondary,
                  Math.ceil(estimatedBranchesPerSecondary * 1.2)
              )
            : 1;

        // คำนวณจำนวนท่อรองต่อท่อเมน
        const estimatedSecondariesPerMain = hasValidMainPipe
            ? Math.max(1, Math.ceil(estimatedBranchesPerSecondary / 2))
            : 1;
        const secondariesPerLongestMain = hasValidMainPipe
            ? Math.max(estimatedSecondariesPerMain, Math.ceil(estimatedSecondariesPerMain * 1.1))
            : 1;

        const result = {
            farmSizeRai: formatNumber(area, 3),
            totalTrees: totalTrees,
            waterPerTreeLiters: formatNumber(totalTrees ? totalWater / totalTrees : 50, 3),
            numberOfZones: numberOfZones,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 20,
            staticHeadM: 0,
            pressureHeadM: 20, // ค่าเริ่มต้น จะถูกเปลี่ยนจากสปริงเกอร์ที่เลือกในภายหลัง
            pipeAgeYears: 0,

            // ฟิลด์เดิม
            sprinklersPerBranch: estimatedSprinklersPerBranch,
            branchesPerSecondary: estimatedBranchesPerSecondary,
            simultaneousZones: 1,

            // ฟิลด์ใหม่สำหรับการคำนวณแบบละเอียด
            sprinklersPerLongestBranch: sprinklersPerLongestBranch,
            branchesPerLongestSecondary: branchesPerLongestSecondary,
            secondariesPerLongestMain: secondariesPerLongestMain,

            // ข้อมูลท่อ
            longestBranchPipeM: formatNumber(longestBranchPipeM, 3),
            totalBranchPipeM: formatNumber(totalBranchPipeM, 3),
            longestSecondaryPipeM: formatNumber(longestSecondaryPipeM, 3),
            totalSecondaryPipeM: formatNumber(totalSecondaryPipeM, 3),
            longestMainPipeM: formatNumber(longestMainPipeM, 3),
            totalMainPipeM: formatNumber(totalMainPipeM, 3),
        };

        console.log('Calculated initialInput with detailed fields:', result);
        console.log('Pipe data validity:', {
            hasValidMainPipe,
            hasValidSubmainPipe,
            hasBranchData: branches.length > 0,
        });
        console.log('Calculated system design:', {
            estimatedSprinklersPerBranch,
            sprinklersPerLongestBranch,
            branchesPerLongestSecondary,
            secondariesPerLongestMain,
        });

        return result;
    }, [farmData, pipeLengthData]);

    // State for irrigation inputs
    const [input, setInput] = useState<IrrigationInput>(initialInput);

    // Equipment selections - เก็บเป็น database format
    const [selectedSprinkler, setSelectedSprinkler] = useState<any>(null);
    const [selectedBranchPipe, setSelectedBranchPipe] = useState<any>(null);
    const [selectedSecondaryPipe, setSelectedSecondaryPipe] = useState<any>(null);
    const [selectedMainPipe, setSelectedMainPipe] = useState<any>(null);
    const [selectedPump, setSelectedPump] = useState<any>(null);

    // Update input when initialInput changes
    useEffect(() => {
        console.log('InitialInput changed, updating input state');
        setInput(initialInput);
    }, [initialInput]);

    // Perform calculations - ส่ง selectedSprinkler ไปด้วย (ใช้ข้อมูลจาก database)
    const results = useCalculations(input, selectedSprinkler);

    // ตรวจสอบว่ามีข้อมูลท่อหรือไม่
    const hasValidMainPipeData = results?.hasValidMainPipe ?? false;
    const hasValidSubmainPipeData = results?.hasValidSecondaryPipe ?? false;

    // Quotation states
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

    // Default selections when results update (ใช้ข้อมูลจาก database)
    useEffect(() => {
        if (!results) return;

        console.log('Setting default equipment selections from database');

        // ฟังก์ชันเลือกอุปกรณ์ที่ดีที่สุด (ราคาสูงสุดในกลุ่มแนะนำ)
        const selectBestEquipment = (recommended: any[], analyzed: any[], currentSelected: any) => {
            // ถ้ามีอุปกรณ์ปัจจุบันและยังอยู่ในกลุ่มแนะนำ ให้ใช้ต่อ
            if (currentSelected) {
                const currentInRecommended = recommended.find(
                    (item) => item.id === currentSelected.id
                );
                if (currentInRecommended && currentInRecommended.isRecommended) {
                    return currentSelected;
                }
            }

            // เลือกจากกลุ่มแนะนำ (ราคาสูงสุด)
            if (recommended.length > 0) {
                return recommended.sort((a, b) => b.price - a.price)[0];
            }

            // เลือกจากกลุ่มที่ใช้ได้ (ราคาสูงสุด)
            const usableItems = analyzed?.filter((item) => item.isUsable) || [];
            if (usableItems.length > 0) {
                return usableItems.sort((a, b) => b.price - a.price)[0];
            }

            // เลือกจากทั้งหมด (คะแนนสูงสุด)
            if (analyzed && analyzed.length > 0) {
                return analyzed.sort((a, b) => b.score - a.score)[0];
            }

            return null;
        };

        // Sprinkler - เลือกราคาสูงสุดในกลุ่มแนะนำ
        const newSelectedSprinkler = selectBestEquipment(
            results.recommendedSprinklers || [],
            results.analyzedSprinklers || [],
            selectedSprinkler
        );
        if (newSelectedSprinkler && newSelectedSprinkler.id !== selectedSprinkler?.id) {
            setSelectedSprinkler(newSelectedSprinkler);
        }

        // Branch pipe - เลือกราคาสูงสุดในกลุ่มแนะนำ
        const newSelectedBranchPipe = selectBestEquipment(
            results.recommendedBranchPipe || [],
            results.analyzedBranchPipes || [],
            selectedBranchPipe
        );
        if (newSelectedBranchPipe && newSelectedBranchPipe.id !== selectedBranchPipe?.id) {
            setSelectedBranchPipe(newSelectedBranchPipe);
        }

        // Secondary pipe - เฉพาะเมื่อมีข้อมูล
        if (hasValidSubmainPipeData) {
            const newSelectedSecondaryPipe = selectBestEquipment(
                results.recommendedSecondaryPipe || [],
                results.analyzedSecondaryPipes || [],
                selectedSecondaryPipe
            );
            if (
                newSelectedSecondaryPipe &&
                newSelectedSecondaryPipe.id !== selectedSecondaryPipe?.id
            ) {
                setSelectedSecondaryPipe(newSelectedSecondaryPipe);
            }
        } else if (selectedSecondaryPipe) {
            setSelectedSecondaryPipe(null);
        }

        // Main pipe - เฉพาะเมื่อมีข้อมูล
        if (hasValidMainPipeData) {
            const newSelectedMainPipe = selectBestEquipment(
                results.recommendedMainPipe || [],
                results.analyzedMainPipes || [],
                selectedMainPipe
            );
            if (newSelectedMainPipe && newSelectedMainPipe.id !== selectedMainPipe?.id) {
                setSelectedMainPipe(newSelectedMainPipe);
            }
        } else if (selectedMainPipe) {
            setSelectedMainPipe(null);
        }

        // Pump - เลือกราคาสูงสุดในกลุ่มแนะนำ
        const newSelectedPump = selectBestEquipment(
            results.recommendedPump || [],
            results.analyzedPumps || [],
            selectedPump
        );
        if (newSelectedPump && newSelectedPump.id !== selectedPump?.id) {
            setSelectedPump(newSelectedPump);
        }
    }, [results, hasValidMainPipeData, hasValidSubmainPipeData, input]);

    useEffect(() => {
        if (!results) return;

        // ตรวจสอบว่า input เปลี่ยนแปลงมากพอที่จะต้อง reset
        const shouldReset =
            // เปลี่ยนจำนวนโซน
            input.numberOfZones !== (input.numberOfZones || 1) ||
            // เปลี่ยนจำนวนต้นไม้มากกว่า 20%
            Math.abs((input.totalTrees || 0) - (input.totalTrees || 0)) / (input.totalTrees || 1) >
                0.2 ||
            // เปลี่ยนความต้องการน้ำมากกว่า 20%
            Math.abs((input.waterPerTreeLiters || 0) - (input.waterPerTreeLiters || 0)) /
                (input.waterPerTreeLiters || 1) >
                0.2;

        if (shouldReset) {
            console.log('Major input change detected, resetting equipment selections');
            setSelectedSprinkler(null);
            setSelectedBranchPipe(null);
            setSelectedSecondaryPipe(null);
            setSelectedMainPipe(null);
            setSelectedPump(null);
        }
    }, [input.numberOfZones, input.totalTrees, input.waterPerTreeLiters]);

    // Update pipe-rolls calculations when pipes change
    useEffect(() => {
        if (!results || !selectedBranchPipe) return;

        // Only calculate for pipes that are selected and have valid data
        if (selectedBranchPipe) {
            calculatePipeRolls(input.totalBranchPipeM, selectedBranchPipe.lengthM);
        }
        if (selectedSecondaryPipe) {
            calculatePipeRolls(input.totalSecondaryPipeM, selectedSecondaryPipe.lengthM);
        }
        if (selectedMainPipe) {
            calculatePipeRolls(input.totalMainPipeM, selectedMainPipe.lengthM);
        }
    }, [selectedBranchPipe, selectedSecondaryPipe, selectedMainPipe, input, results]);

    const handleQuotationModalConfirm = () => {
        setShowQuotationModal(false);
        setShowQuotation(true);
    };

    // Check if we have essential data for calculations
    const hasEssentialData = farmData && farmData.total;

    // Show loading state if no essential data
    if (!hasEssentialData) {
        return (
            <div className="min-h-screen bg-gray-800 p-6 text-white">
                <div className="mx-auto max-w-7xl">
                    <h1 className="mb-8 text-center text-3xl font-bold text-blue-400">
                        Irrigation Layout Planning Application
                    </h1>
                    <div className="text-center">
                        <p className="mb-4 text-yellow-400">ไม่พบข้อมูลจากหน้า Generate Tree</p>
                        <p className="text-gray-300">กรุณากลับไปทำการวางแผนการปลูกและวางท่อก่อน</p>
                        <button
                            onClick={() => router.visit('/horticulture/planner')}
                            className="mt-4 rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                        >
                            ไปหน้า Generate Tree
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="min-h-screen bg-gray-800 p-6 text-white">
                <div className="mx-auto max-w-7xl">
                    <h1 className="mb-8 text-center text-3xl font-bold text-blue-400">
                        Irrigation Layout Planning Application
                    </h1>
                    <InputForm input={input} onInputChange={setInput} />
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
                        <p className="mt-2">กำลังโหลดข้อมูลอุปกรณ์จากฐานข้อมูล...</p>
                        <div className="mt-4 text-sm text-gray-400">
                            <p>🔄 กำลังดึงข้อมูลสปริงเกอร์, ปั๊ม, และท่อจากระบบ</p>
                            <p>⚙️ กำลังประมวลผลการคำนวณ</p>
                            <p className="mt-2 text-xs text-blue-400">
                                💡 หากโหลดนานเกินไป ลองรีเฟรชหน้าเว็บหรือตรวจสอบการเชื่อมต่อ
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Check for calculation errors or missing data
    if (
        results.calculationMetadata?.loadingErrors?.length > 0 ||
        (!results.analyzedSprinklers?.length &&
            !results.analyzedPumps?.length &&
            !results.analyzedBranchPipes?.length)
    ) {
        return (
            <div className="min-h-screen bg-gray-800 p-6 text-white">
                <div className="mx-auto max-w-7xl">
                    <h1 className="mb-8 text-center text-3xl font-bold text-blue-400">
                        Irrigation Layout Planning Application
                    </h1>
                    <InputForm input={input} onInputChange={setInput} />
                    <div className="text-center">
                        <div className="rounded-lg bg-yellow-900 p-6 text-center">
                            <h2 className="mb-4 text-xl font-bold text-yellow-300">
                                ไม่พบข้อมูลอุปกรณ์
                            </h2>
                            <div className="space-y-2 text-yellow-200">
                                {results.calculationMetadata?.loadingErrors?.length > 0 ? (
                                    results.calculationMetadata.loadingErrors.map(
                                        (
                                            error:
                                                | string
                                                | number
                                                | boolean
                                                | React.ReactElement<
                                                      any,
                                                      string | React.JSXElementConstructor<any>
                                                  >
                                                | Iterable<React.ReactNode>
                                                | React.ReactPortal
                                                | null
                                                | undefined,
                                            index: React.Key | null | undefined
                                        ) => <p key={index}>{error}</p>
                                    )
                                ) : (
                                    <div>
                                        <p>📊 สถานะข้อมูล:</p>
                                        <p>
                                            • สปริงเกอร์: {results.analyzedSprinklers?.length || 0}{' '}
                                            รายการ
                                        </p>
                                        <p>
                                            • ปั๊มน้ำ: {results.analyzedPumps?.length || 0} รายการ
                                        </p>
                                        <p>
                                            • ท่อ: {results.analyzedBranchPipes?.length || 0} รายการ
                                        </p>
                                        <p className="mt-2 text-sm">
                                            กรุณาตรวจสอบข้อมูลในฐานข้อมูล
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 space-x-4">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                >
                                    รีเฟรชหน้า
                                </button>
                                <button
                                    onClick={() =>
                                        window.open(
                                            '/equipment-crud',
                                            '_blank',
                                            'noopener,noreferrer'
                                        )
                                    }
                                    className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                                >
                                    จัดการข้อมูลอุปกรณ์
                                </button>
                                <button
                                    onClick={() => {
                                        console.log('🔍 Debug Info:', results);
                                        alert('ตรวจสอบ Console เพื่อดูข้อมูล debug');
                                    }}
                                    className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                                >
                                    Debug Info
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-800 p-6 text-white">
            <div className="flex w-full items-start justify-start gap-4">
                {/* Fixed sidebar - ลดขนาดลง */}
                <div className="fixed left-2 top-6 z-50 flex w-[570px] flex-col items-center ml-4 justify-center gap-3">
                    <div className="w-full">
                        <h1 className="mb-2 text-center text-xl font-bold text-blue-400">
                            แผนผังโครงการ
                        </h1>
                        <img
                            src="https://f.btwcdn.com/store-50036/store/e4c1b5ae-cf8e-5017-536b-66ecd994018d.jpg"
                            alt=""
                            className="h-[350px] w-full rounded-lg shadow-lg"
                        />
                    </div>
                    <div className="no-print w-full">
                        <ChatBox />
                    </div>
                </div>

                {/* Main content area - เพิ่ม margin ซ้ายให้มากขึ้น */}
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
                                    🔗 ระบบเชื่อมต่อกับฐานข้อมูลอุปกรณ์แบบเรียลไทม์
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

                    <InputForm
                        input={input}
                        onInputChange={setInput}
                        selectedSprinkler={selectedSprinkler}
                    />
                    <CalculationSummary
                        results={results}
                        input={input}
                        selectedSprinkler={selectedSprinkler}
                        selectedPump={selectedPump}
                        selectedBranchPipe={selectedBranchPipe}
                        selectedSecondaryPipe={selectedSecondaryPipe}
                        selectedMainPipe={selectedMainPipe}
                    />
                    <div className="mb-6 space-y-6">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <SprinklerSelector
                                selectedSprinkler={selectedSprinkler}
                                onSprinklerChange={setSelectedSprinkler}
                                results={results}
                            />

                            {/* ท่อย่อย - แสดงเสมอ */}
                            <PipeSelector
                                pipeType="branch"
                                selectedPipe={selectedBranchPipe}
                                onPipeChange={setSelectedBranchPipe}
                                results={{
                                    ...results,
                                    branchPipeRolls: selectedBranchPipe
                                        ? calculatePipeRolls(
                                              input.totalBranchPipeM,
                                              selectedBranchPipe.lengthM
                                          )
                                        : results.branchPipeRolls,
                                }}
                                input={input}
                            />

                            {/* ท่อเมนรอง - แสดงเฉพาะเมื่อมีข้อมูล */}
                            {hasValidSubmainPipeData ? (
                                <PipeSelector
                                    pipeType="secondary"
                                    selectedPipe={selectedSecondaryPipe}
                                    onPipeChange={setSelectedSecondaryPipe}
                                    results={{
                                        ...results,
                                        secondaryPipeRolls: selectedSecondaryPipe
                                            ? calculatePipeRolls(
                                                  input.totalSecondaryPipeM,
                                                  selectedSecondaryPipe.lengthM
                                              )
                                            : results.secondaryPipeRolls,
                                    }}
                                    input={input}
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

                            {/* ท่อเมนหลัก - แสดงเฉพาะเมื่อมีข้อมูล */}
                            {hasValidMainPipeData && (
                                <div>
                                    <PipeSelector
                                        pipeType="main"
                                        selectedPipe={selectedMainPipe}
                                        onPipeChange={setSelectedMainPipe}
                                        results={{
                                            ...results,
                                            mainPipeRolls: selectedMainPipe
                                                ? calculatePipeRolls(
                                                      input.totalMainPipeM,
                                                      selectedMainPipe.lengthM
                                                  )
                                                : results.mainPipeRolls,
                                        }}
                                        input={input}
                                    />
                                </div>
                            )}
                        </div>

                        <PumpSelector
                            selectedPump={selectedPump}
                            onPumpChange={setSelectedPump}
                            results={results}
                        />
                    </div>
                    <CostSummary
                        results={{
                            ...results,
                            branchPipeRolls: selectedBranchPipe
                                ? calculatePipeRolls(
                                      input.totalBranchPipeM,
                                      selectedBranchPipe.lengthM
                                  )
                                : results.branchPipeRolls,
                            secondaryPipeRolls: selectedSecondaryPipe
                                ? calculatePipeRolls(
                                      input.totalSecondaryPipeM,
                                      selectedSecondaryPipe.lengthM
                                  )
                                : results.secondaryPipeRolls,
                            mainPipeRolls: selectedMainPipe
                                ? calculatePipeRolls(input.totalMainPipeM, selectedMainPipe.lengthM)
                                : results.mainPipeRolls,
                        }}
                        selectedSprinkler={selectedSprinkler}
                        selectedPump={selectedPump}
                        selectedBranchPipe={selectedBranchPipe}
                        selectedSecondaryPipe={selectedSecondaryPipe}
                        selectedMainPipe={selectedMainPipe}
                        onQuotationClick={() => setShowQuotationModal(true)}
                    />
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
                results={{
                    ...results,
                    branchPipeRolls: selectedBranchPipe
                        ? calculatePipeRolls(input.totalBranchPipeM, selectedBranchPipe.lengthM)
                        : results.branchPipeRolls,
                    secondaryPipeRolls: selectedSecondaryPipe
                        ? calculatePipeRolls(
                              input.totalSecondaryPipeM,
                              selectedSecondaryPipe.lengthM
                          )
                        : results.secondaryPipeRolls,
                    mainPipeRolls: selectedMainPipe
                        ? calculatePipeRolls(input.totalMainPipeM, selectedMainPipe.lengthM)
                        : results.mainPipeRolls,
                }}
                quotationData={quotationData}
                quotationDataCustomer={quotationDataCustomer}
                selectedSprinkler={selectedSprinkler}
                selectedPump={selectedPump}
                selectedBranchPipe={selectedBranchPipe}
                selectedSecondaryPipe={selectedSecondaryPipe}
                selectedMainPipe={selectedMainPipe}
                onClose={() => setShowQuotation(false)}
            />
            <div className="mt-4 text-center text-sm">
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => (location.href = '/')}
                        className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                    >
                        เริ่มต้นใหม่
                    </button>
                    {/* <div className="text-green-400 text-xs flex items-center">
                        <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                        ข้อมูลจากฐานข้อมูล: {results?.analyzedSprinklers?.length || 0} สปริงเกอร์, {results?.analyzedPumps?.length || 0} ปั๊ม, {results?.analyzedBranchPipes?.length || 0} ท่อ
                    </div> */}
                </div>
            </div>
        </div>
    );
}
