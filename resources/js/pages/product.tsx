// C:\webchaiyo\Waterapp\resources\js\pages\product.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { IrrigationInput, QuotationData, QuotationDataCustomer } from './types/interfaces';
import { useCalculations } from './hooks/useCalculations';
import { SprinklerData } from './product/Sprinkler';
import { PipeData } from './product/Pipe';
import { PumpData } from './product/Pump';
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

export default function Product() {
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

        const longestSecondaryPipeM = hasValidSubmainPipe && submain?.longest ? submain.longest : 0; // ถ้าไม่มีข้อมูลให้เป็น 0
        const totalSecondaryPipeM = hasValidSubmainPipe && submain?.total ? submain.total : 0; // ถ้าไม่มีข้อมูลให้เป็น 0

        const longestMainPipeM = hasValidMainPipe && main?.longest ? main.longest : 0; // ถ้าไม่มีข้อมูลให้เป็น 0

        const totalMainPipeM = hasValidMainPipe && main?.total ? main.total : 0; // ถ้าไม่มีข้อมูลให้เป็น 0

        const result = {
            farmSizeRai: formatNumber(area, 3),
            totalTrees: Math.round(plants),
            waterPerTreeLiters: formatNumber(plants ? totalWater / plants : 50, 3),
            numberOfZones: zones.length || 1,
            sprinklersPerTree: 1,
            irrigationTimeMinutes: 20,
            staticHeadM: 0,
            pressureHeadM: 20, // ค่าเริ่มต้น จะถูกเปลี่ยนจากสปริงเกอร์ที่เลือกในภายหลัง
            pipeAgeYears: 0,
            sprinklersPerBranch: 1,
            branchesPerSecondary: 1,
            simultaneousZones: 1,
            longestBranchPipeM: formatNumber(longestBranchPipeM, 3),
            totalBranchPipeM: formatNumber(totalBranchPipeM, 3),
            longestSecondaryPipeM: formatNumber(longestSecondaryPipeM, 3),
            totalSecondaryPipeM: formatNumber(totalSecondaryPipeM, 3),
            longestMainPipeM: formatNumber(longestMainPipeM, 3),
            totalMainPipeM: formatNumber(totalMainPipeM, 3),
        };

        console.log('Calculated initialInput:', result);
        console.log('Pipe data validity:', {
            hasValidMainPipe,
            hasValidSubmainPipe,
            hasBranchData: branches.length > 0,
        });

        return result;
    }, [farmData, pipeLengthData]);

    // State for irrigation inputs
    const [input, setInput] = useState<IrrigationInput>(initialInput);

    // Equipment selections
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

    // Perform calculations - ส่ง selectedSprinkler ไปด้วย
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

    // Default selections when results update
    useEffect(() => {
        if (!results) return;

        console.log('Setting default equipment selections');

        // Sprinkler - เลือกที่แนะนำหรือที่มีคะแนนสูงสุด
        if (!selectedSprinkler) {
            const newSelectedSprinkler = results.recommendedSprinklers.length
                ? results.recommendedSprinklers.sort((a, b) => b.score - a.score)[0]
                : results.analyzedSprinklers?.find((s) => s.isUsable) ||
                  SprinklerData.sort((a, b) => b.price - a.price)[0];
            setSelectedSprinkler(newSelectedSprinkler);
        }

        // Branch pipe - เลือกจากทุกประเภทท่อ
        if (!selectedBranchPipe) {
            setSelectedBranchPipe(
                results.recommendedBranchPipe.length
                    ? results.recommendedBranchPipe.sort((a, b) => b.score - a.score)[0]
                    : results.analyzedBranchPipes?.find((p) => p.isUsable) ||
                          PipeData.sort((a, b) => a.sizeMM - b.sizeMM)[0] // เลือกขนาดเล็กสุดเป็น default
            );
        }

        // Secondary pipe - เฉพาะเมื่อมีข้อมูล
        if (hasValidSubmainPipeData && !selectedSecondaryPipe) {
            setSelectedSecondaryPipe(
                results.recommendedSecondaryPipe.length
                    ? results.recommendedSecondaryPipe.sort((a, b) => b.score - a.score)[0]
                    : results.analyzedSecondaryPipes?.find((p) => p.isUsable) ||
                          PipeData.sort((a, b) => a.sizeMM - b.sizeMM)[0]
            );
        } else if (!hasValidSubmainPipeData) {
            setSelectedSecondaryPipe(null);
        }

        // Main pipe - เฉพาะเมื่อมีข้อมูล
        if (hasValidMainPipeData && !selectedMainPipe) {
            setSelectedMainPipe(
                results.recommendedMainPipe.length
                    ? results.recommendedMainPipe.sort((a, b) => b.score - a.score)[0]
                    : results.analyzedMainPipes?.find((p) => p.isUsable) ||
                          PipeData.sort((a, b) => a.sizeMM - b.sizeMM)[0]
            );
        } else if (!hasValidMainPipeData) {
            setSelectedMainPipe(null);
        }

        // Pump
        if (!selectedPump) {
            setSelectedPump(
                results.recommendedPump.length
                    ? results.recommendedPump.sort((a, b) => a.price - b.price)[0]
                    : results.analyzedPumps?.find((p) => p.isUsable) ||
                          PumpData.sort((a, b) => a.price - b.price)[0]
            );
        }
    }, [results, hasValidMainPipeData, hasValidSubmainPipeData]);

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
                            onClick={() => (window.location.href = '/generate-tree')}
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
                    <div className="text-center">กำลังคำนวณ...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-800 p-6 text-white">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex items-center justify-start gap-4">
                    <img
                        src="https://f.btwcdn.com/store-50036/store/e4c1b5ae-cf8e-5017-536b-66ecd994018d.jpg"
                        alt="logo"
                        className="h-[80px] w-[80px] rounded-xl"
                    />
                    <div>
                        <h1 className="text-left text-3xl font-bold text-blue-400">
                            Irrigation Layout Planning Application
                        </h1>
                        <p className="mt-2 text-left text-lg text-blue-400">
                            แอปพลิเคชันวางแผนผังชลประทานน้ำ บจก.กนกโปรดักส์ จำกัด
                        </p>
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
                        <PumpSelector
                            selectedPump={selectedPump}
                            onPumpChange={setSelectedPump}
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
                        ) : null}
                    </div>

                    {/* ท่อเมนหลัก - แสดงเฉพาะเมื่อมีข้อมูล */}
                    {hasValidMainPipeData && (
                        <div className="lg:col-span-2">
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
                <CostSummary
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
                    selectedSprinkler={selectedSprinkler}
                    selectedPump={selectedPump}
                    selectedBranchPipe={selectedBranchPipe}
                    selectedSecondaryPipe={selectedSecondaryPipe}
                    selectedMainPipe={selectedMainPipe}
                    onQuotationClick={() => setShowQuotationModal(true)}
                />
            </div>
            {/* <div className="no-print">
                <ChatBox />
            </div> */}
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
                <button
                    onClick={() => (location.href = '/planner')}
                    className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                    เริ่มต้นใหม่
                </button>
            </div>
        </div>
    );
}
