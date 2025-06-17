// // ไฟล์นี้อยู่ที่ C:\webchaiyo\Waterapp\resources\js\pages\product.tsx
// Product.tsx (Main Component)
import React, { useState, useEffect } from 'react';
import { IrrigationInput, QuotationData, QuotationDataCustomer } from './types/interfaces';
import { useCalculations } from './hooks/useCalculations';
import { SprinklerData } from './product/Sprinkler';
import { PipeData } from './product/Pipe';
import { PumpData } from './product/Pump';
import { calculatePipeRolls } from './utils/calculations';

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
    // State สำหรับข้อมูลอินพุต
    const [input, setInput] = useState<IrrigationInput>({
        // ข้อมูลพื้นฐาน - สวนทุเรียน 10 ไร่
        farmSizeRai: 10,
        totalTrees: 111,
        waterPerTreeLiters: 100,
        numberOfZones: 1,
        sprinklersPerTree: 1,
        irrigationTimeMinutes: 30,
        staticHeadM: 0,
        pressureHeadM: 2,
        pipeAgeYears: 0,
        sprinklersPerBranch: 4,
        branchesPerSecondary: 5,
        simultaneousZones: 1,
        longestBranchPipeM: 30,
        totalBranchPipeM: 1400,
        longestSecondaryPipeM: 80,
        totalSecondaryPipeM: 600,
        longestMainPipeM: 200,
        totalMainPipeM: 400,
    });

    // ใช้ custom hook สำหรับการคำนวณ
    const results = useCalculations(input);

    // State สำหรับอุปกรณ์ที่เลือก
    const [selectedSprinkler, setSelectedSprinkler] = useState<any>(null);
    const [selectedBranchPipe, setSelectedBranchPipe] = useState<any>(null);
    const [selectedSecondaryPipe, setSelectedSecondaryPipe] = useState<any>(null);
    const [selectedMainPipe, setSelectedMainPipe] = useState<any>(null);
    const [selectedPump, setSelectedPump] = useState<any>(null);

    // State สำหรับใบเสนอราคา
    const [showQuotationModal, setShowQuotationModal] = useState(false);
    const [showQuotation, setShowQuotation] = useState(false);
    const [quotationData, setQuotationData] = useState<QuotationData>({
        yourReference: '',
        quotationDate: new Date().toLocaleString('th-TH'),
        salesperson: '',
        paymentTerms: '0',
    });
    const [quotationDataCustomer, setQuotationDataCustomer] = useState<QuotationDataCustomer>({
        code: '',
        name: '',
        address: '',
        phone: '',
        email: '',
    });

    // ฟังก์ชันสำหรับเลือกอุปกรณ์ default เมื่อมีผลลัพธ์การคำนวณ
    useEffect(() => {
        if (!results) return;

        // เลือกสปริงเกอร์ default
        if (results.recommendedSprinklers.length > 0) {
            setSelectedSprinkler(
                results.recommendedSprinklers.sort((a, b) => b.price - a.price)[0]
            );
        } else {
            setSelectedSprinkler(SprinklerData.sort((a, b) => b.price - a.price)[0]);
        }

        // เลือกท่อย่อย default
        const defaultBranchPipe =
            results.recommendedBranchPipe.length > 0
                ? results.recommendedBranchPipe.sort((a, b) => a.sizeMM - b.sizeMM)[0]
                : PipeData.filter((pipe) => pipe.pipeType === 'LDPE' && pipe.sizeMM >= 20).sort(
                      (a, b) => a.sizeMM - b.sizeMM
                  )[0];
        setSelectedBranchPipe(defaultBranchPipe);

        // เลือกท่อรอง default
        const defaultSecondaryPipe =
            results.recommendedSecondaryPipe.length > 0
                ? results.recommendedSecondaryPipe.sort((a, b) => a.sizeMM - b.sizeMM)[0]
                : PipeData.filter(
                      (pipe) => pipe.pipeType === 'HDPE PE 80' && pipe.sizeMM >= 40
                  ).sort((a, b) => a.sizeMM - b.sizeMM)[0];
        setSelectedSecondaryPipe(defaultSecondaryPipe);

        // เลือกท่อหลัก default
        const defaultMainPipe =
            results.recommendedMainPipe.length > 0
                ? results.recommendedMainPipe.sort((a, b) => a.sizeMM - b.sizeMM)[0]
                : PipeData.filter(
                      (pipe) => pipe.pipeType === 'HDPE PE 100' && pipe.sizeMM >= 63
                  ).sort((a, b) => a.sizeMM - b.sizeMM)[0];
        setSelectedMainPipe(defaultMainPipe);

        // เลือกปั๊ม default
        if (results.recommendedPump.length > 0) {
            setSelectedPump(results.recommendedPump.sort((a, b) => a.price - b.price)[0]);
        } else {
            setSelectedPump(PumpData.sort((a, b) => a.price - b.price)[0]);
        }
    }, [results]);

    // อัพเดทการคำนวณจำนวนม้วนท่อเมื่อเปลี่ยนท่อ
    useEffect(() => {
        if (!results || !selectedBranchPipe || !selectedSecondaryPipe || !selectedMainPipe) return;

        const branchRolls = calculatePipeRolls(input.totalBranchPipeM, selectedBranchPipe.lengthM);
        const secondaryRolls = calculatePipeRolls(
            input.totalSecondaryPipeM,
            selectedSecondaryPipe.lengthM
        );
        const mainRolls = calculatePipeRolls(input.totalMainPipeM, selectedMainPipe.lengthM);

        // Note: ในที่นี้เราไม่สามารถแก้ไข results โดยตรงได้ เพราะมันมาจาก useMemo
        // แต่การแสดงผลจะใช้ค่าจาก selectedPipe แทน
    }, [selectedBranchPipe, selectedSecondaryPipe, selectedMainPipe, input, results]);

    // Handler functions
    const handleQuotationModalConfirm = () => {
        setShowQuotationModal(false);
        setShowQuotation(true);
    };

    if (!results) {
        return (
            <div className="min-h-screen bg-gray-800 p-6 text-white">
                <div className="mx-auto max-w-7xl">
                    <h1 className="mb-8 text-center text-3xl font-bold text-blue-400">
                        ระบบคำนวณเลือกอุปกรณ์การให้น้ำพืช
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
                <div className="mb-6 flex items-center justify-center gap-4">
                    <img
                        src="https://scontent.fbkk17-1.fna.fbcdn.net/v/t39.30808-6/329365639_863669681576432_9072509434807570833_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeHzH0DSWRVrgxX-EPgYJXWZa6wVAKl2SdJrrBUAqXZJ0oxyybhLN1NBN_23fG_LnsJ6WcMd43_CHfgauuKawq9u&_nc_ohc=AYHmXGdPpb4Q7kNvwGjNIyW&_nc_oc=Adn8gkjmK5ho0NtNd0I0aDcp_32sp2juklFr_jP0eF8617DZ6crKViCr4e0-DZzT5uQ&_nc_zt=23&_nc_ht=scontent.fbkk17-1.fna&_nc_gid=Zfi-XqpAeRcnvD0MriwK7A&oh=00_AfO7sOig231Gxwr0PwWWUoNs5XOC5lL5YPLds-YxiQGHdg&oe=6856A38C"
                        alt=""
                        className="h-[80px] w-[80px] rounded-full"
                    />
                    <h1 className="text-center text-3xl font-bold text-blue-400">
                        ระบบคำนวณเลือกอุปกรณ์การให้น้ำพืช
                    </h1>
                </div>
                {/* Input Form */}
                <InputForm input={input} onInputChange={setInput} />
                {/* แสดงข้อมูลสำคัญและสรุปการคำนวณ */}
                <CalculationSummary
                    results={results}
                    input={input}
                    selectedSprinkler={selectedSprinkler}
                    selectedPump={selectedPump}
                    selectedBranchPipe={selectedBranchPipe}
                    selectedSecondaryPipe={selectedSecondaryPipe}
                    selectedMainPipe={selectedMainPipe}
                />

                {/* Equipment Selection */}
                <div className="mb-6 space-y-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Sprinkler Selection */}
                        <SprinklerSelector
                            selectedSprinkler={selectedSprinkler}
                            onSprinklerChange={setSelectedSprinkler}
                            results={results}
                        />

                        {/* Pump Selection */}
                        <PumpSelector
                            selectedPump={selectedPump}
                            onPumpChange={setSelectedPump}
                            results={results}
                        />

                        {/* Branch Pipe Selection */}
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

                        {/* Secondary Pipe Selection */}
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

                        {/* Main Pipe Selection */}
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
                    </div>
                </div>

                {/* Cost Summary */}
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

            {/* ChatBox */}
            <div className="">
                <ChatBox />
            </div>

            {/* Quotation Modal */}
            <QuotationModal
                show={showQuotationModal}
                quotationData={quotationData}
                quotationDataCustomer={quotationDataCustomer}
                onQuotationDataChange={setQuotationData}
                onQuotationDataCustomerChange={setQuotationDataCustomer}
                onClose={() => setShowQuotationModal(false)}
                onConfirm={handleQuotationModalConfirm}
            />

            {/* Quotation Document */}
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
        </div>
    );
}
// import React, { useState, useEffect } from 'react';
// import { PipeData } from './product/Pipe';
// import { PumpData } from './product/Pump';
// import { SprinklerData } from './product/Sprinkler';
// import ChatBox from '@/components/ChatBox';
// import Quotation from '@/components/Quotation';

// interface IrrigationInput {
//     farmSizeRai: number;
//     totalTrees: number;
//     waterPerTreeLiters: number;
//     numberOfZones: number;
//     sprinklersPerTree: number;
//     longestBranchPipeM: number;
//     totalBranchPipeM: number;
//     longestSecondaryPipeM: number;
//     totalSecondaryPipeM: number;
//     longestMainPipeM: number;
//     totalMainPipeM: number;
//     irrigationTimeMinutes: number;
//     staticHeadM: number;
//     pressureHeadM: number;
//     pipeAgeYears: number;
//     // เพิ่มการตั้งค่าการออกแบบระบบ
//     sprinklersPerBranch: number; // จำนวนสปริงเกอร์ต่อท่อย่อย 1 เส้น
//     branchesPerSecondary: number; // จำนวนท่อย่อยต่อท่อรอง 1 เส้น
//     simultaneousZones: number; // จำนวนโซนที่ทำงานพร้อมกัน
// }

// interface CalculationResults {
//     totalWaterRequiredLPH: number;
//     totalWaterRequiredLPM: number;
//     waterPerZoneLPH: number;
//     waterPerZoneLPM: number;
//     totalSprinklers: number;
//     sprinklersPerZone: number;
//     waterPerSprinklerLPH: number;
//     waterPerSprinklerLPM: number;
//     recommendedSprinklers: any[];
//     recommendedBranchPipe: any[];
//     recommendedSecondaryPipe: any[];
//     recommendedMainPipe: any[];
//     recommendedPump: any[];
//     branchPipeRolls: number;
//     secondaryPipeRolls: number;
//     mainPipeRolls: number;
//     headLoss: {
//         branch: {
//             major: number;
//             minor: number;
//             total: number;
//         };
//         secondary: {
//             major: number;
//             minor: number;
//             total: number;
//         };
//         main: {
//             major: number;
//             minor: number;
//             total: number;
//         };
//         totalMajor: number;
//         totalMinor: number;
//         total: number;
//     };
//     velocity: {
//         branch: number;
//         secondary: number;
//         main: number;
//     };
//     flows: {
//         branch: number;
//         secondary: number;
//         main: number;
//     };
//     coefficients: {
//         branch: number;
//         secondary: number;
//         main: number;
//     };
//     pumpHeadRequired: number;
//     safetyFactor: number;
//     adjustedFlow: number;
//     velocityWarnings: string[];
// }

// interface QuotationData {
//     yourReference: string;
//     quotationDate: string;
//     salesperson: string;
//     paymentTerms: string;
// }

// interface QuotationDataCustomer {
//     code: string;
//     name: string;
//     address: string;
//     phone: string;
//     email: string;
// }

// export default function Product() {
//     const [input, setInput] = useState<IrrigationInput>({
//         // ข้อมูลพื้นฐาน - สวนทุเรียน 10 ไร่
//         farmSizeRai: 10, // 10 ไร่ = 16,000 ตร.ม.
//         totalTrees: 111, // 16,000 ÷ (12×12) = 111 ต้น
//         waterPerTreeLiters: 100, // 100 ลิตร/ต้น/วัน (ทุเรียนต้องการน้ำมาก)
//         numberOfZones: 1, // 1 โซน (เพื่อกระจายโหลด)
//         sprinklersPerTree: 1, // 1 หัว/ต้น (ทรงพุ่มใหญ่)
//         irrigationTimeMinutes: 30, // 30 นาที/วัน (รดน้ำนานกว่า)

//         // ความสูงและแรงดัน
//         staticHeadM: 0, // ความสูงต้นทุเรียน 0 เมตร
//         pressureHeadM: 2, // แรงดันสูงกว่า เพื่อครอบคลุมทรงพุ่มใหญ่
//         pipeAgeYears: 0, // ท่อใหม่

//         // การตั้งค่าระบบ - เหมาะสำหรับทุเรียน
//         sprinklersPerBranch: 4, // 4 สปริงเกอร์/ท่อย่อย (2 ต้น × 2 หัว/ต้น)
//         branchesPerSecondary: 5, // 5 ท่อย่อย/ท่อรอง
//         simultaneousZones: 1, // ทำงานทีละ 1 โซน

//         // ข้อมูลท่อ - เหมาะสำหรับสวนทุเรียนขนาดใหญ่

//         // ท่อย่อย (Branch Pipe) - LDPE 20-32mm
//         longestBranchPipeM: 30, // ครอบคลุม 2 ต้น (12m×2 + เผื่อ)
//         totalBranchPipeM: 1400, // 56 เส้น × 25m เฉลี่ย

//         // ท่อเมนรอง (Secondary Pipe) - HDPE PE 80, 40-63mm
//         longestSecondaryPipeM: 80, // ครอบคลุม 5 ท่อย่อย
//         totalSecondaryPipeM: 600, // 12 เส้น × 50m เฉลี่ย

//         // ท่อเมนหลัก (Main Pipe) - HDPE PE 100, 75-110mm
//         longestMainPipeM: 200, // จากปั๊มไปขอบไกลสุดของไร่
//         totalMainPipeM: 400, // เส้นหลักและแยกไปแต่ละโซน
//     });

//     const [results, setResults] = useState<CalculationResults | null>(null);
//     const [selectedSprinkler, setSelectedSprinkler] = useState<any>(null);
//     const [selectedBranchPipe, setSelectedBranchPipe] = useState<any>(null);
//     const [selectedSecondaryPipe, setSelectedSecondaryPipe] = useState<any>(null);
//     const [selectedMainPipe, setSelectedMainPipe] = useState<any>(null);
//     const [selectedPump, setSelectedPump] = useState<any>(null);

//     // State สำหรับใบเสนอราคา
//     const [showQuotationModal, setShowQuotationModal] = useState(false);
//     const [showQuotation, setShowQuotation] = useState(false);
//     const [quotationData, setQuotationData] = useState<QuotationData>({
//         yourReference: '',
//         quotationDate: new Date().toLocaleString('th-TH'),
//         salesperson: '',
//         paymentTerms: '0',
//     });
//     const [quotationDataCustomer, setQuotationDataCustomer] = useState<QuotationDataCustomer>({
//         code: '',
//         name: '',
//         address: '',
//         phone: '',
//         email: '',
//     });

//     // ฟังก์ชันสำหรับจัดเรียง dropdown
//     const sortForDropdown = (allItems: any[], recommendedItems: any[]) => {
//         const recommended = recommendedItems.sort((a, b) => b.price - a.price);
//         const others = allItems
//             .filter((item) => !recommendedItems.includes(item))
//             .sort((a, b) => b.price - a.price);
//         return [...recommended, ...others];
//     };

//     // คำนวณจำนวนม้วนท่อ
//     const calculatePipeRolls = (totalLength: number, rollLength: number): number => {
//         return Math.ceil(totalLength / rollLength);
//     };

//     // ปรับค่า C ตามประเภทท่อและอายุ
//     const getAdjustedC = (pipeType: string, age: number): number => {
//         let baseC;
//         switch (pipeType) {
//             case 'HDPE PE 100':
//                 baseC = 145;
//                 break;
//             case 'HDPE PE 80':
//                 baseC = 140;
//                 break;
//             case 'LDPE':
//                 baseC = 135;
//                 break;
//             case 'PVC':
//                 baseC = 150;
//                 break;
//             case 'PE-RT':
//                 baseC = 145;
//                 break;
//             case 'Flexible PE':
//                 baseC = 130;
//                 break;
//             default:
//                 baseC = 135;
//         }

//         // ลดค่า C ตามอายุ (2.5 ต่อปี แต่ไม่ต่ำกว่า 100)
//         const adjustedC = Math.max(100, baseC - age * 2.5);
//         return adjustedC;
//     };

//     // กำหนด Minor Loss Ratio ตามประเภทท่อ (ปรับปรุงให้สมจริงกว่า)
//     const getMinorLossRatio = (sectionType: string): number => {
//         switch (sectionType) {
//             case 'branch':
//                 return 0.2; // ลดจาก 35% เป็น 20% (มีข้อต่อเยอะ แต่ไม่มากขนาดนั้น)
//             case 'secondary':
//                 return 0.15; // ลดจาก 25% เป็น 15% (มีข้อต่อปานกลาง)
//             case 'main':
//                 return 0.1; // ลดจาก 20% เป็น 10% (ข้อต่อน้อย)
//             default:
//                 return 0.15;
//         }
//     };

//     // คำนวณ Head Loss แบบปรับปรุง
//     const calculateImprovedHeadLoss = (
//         flow_lpm: number,
//         diameter_mm: number,
//         length_m: number,
//         pipeType: string,
//         sectionType: string
//     ) => {
//         const Q = flow_lpm / 60000; // แปลง LPM เป็ m³/s
//         const D = diameter_mm / 1000; // แปลง mm เป็ม
//         const C = getAdjustedC(pipeType, input.pipeAgeYears);

//         // Major Loss (Hazen-Williams)
//         const majorLoss =
//             (10.67 * length_m * Math.pow(Q, 1.852)) / (Math.pow(C, 1.852) * Math.pow(D, 4.87));

//         // Minor Loss (ปรับปรุงให้สมจริงกว่า)
//         const minorLossRatio = getMinorLossRatio(sectionType);
//         const minorLoss = majorLoss * minorLossRatio;

//         // คำนวณความเร็ว
//         const A = Math.PI * Math.pow(D / 2, 2); // พื้นที่หน้าตัด m²
//         const velocity = Q / A; // m/s

//         return {
//             major: majorLoss,
//             minor: minorLoss,
//             total: majorLoss + minorLoss,
//             velocity: velocity,
//             C: C,
//         };
//     };

//     // ตรวจสอบความเร็วน้ำ
//     const checkVelocity = (velocity: number, section: string): string => {
//         if (velocity > 3.0)
//             return `🔴 ${section}: ความเร็วสูงมาก (${velocity.toFixed(2)} m/s) - อาจเกิด water hammer`;
//         if (velocity > 2.5)
//             return `🟡 ${section}: ความเร็วค่อนข้างสูง (${velocity.toFixed(2)} m/s) - ควรพิจารณาเพิ่มขนาดท่อ`;
//         if (velocity < 0.3)
//             return `🔵 ${section}: ความเร็วต่ำมาก (${velocity.toFixed(2)} m/s) - อาจมีการตกตะกอน`;
//         return `🟢 ${section}: ความเร็วเหมาะสม (${velocity.toFixed(2)} m/s)`;
//     };

//     // คำนวณความต้องการน้ำและแนะนำอุปกรณ์
//     const calculateRecommendations = () => {
//         const totalWaterRequiredPerDay = input.totalTrees * input.waterPerTreeLiters;
//         const irrigationTimeHours = input.irrigationTimeMinutes / 60;
//         const totalWaterRequiredLPH = totalWaterRequiredPerDay / irrigationTimeHours;
//         const totalWaterRequiredLPM = totalWaterRequiredLPH / 60;

//         // เพิ่ม Safety Factor 25%
//         const safetyFactor = 1.25;
//         const adjustedFlow = totalWaterRequiredLPM * safetyFactor;

//         const waterPerZoneLPH = totalWaterRequiredLPH / input.numberOfZones;
//         const waterPerZoneLPM = waterPerZoneLPH / 60;

//         const totalSprinklers = input.totalTrees * input.sprinklersPerTree;
//         const sprinklersPerZone = totalSprinklers / input.numberOfZones;
//         const waterPerSprinklerLPH = waterPerZoneLPH / sprinklersPerZone;
//         const waterPerSprinklerLPM = waterPerSprinklerLPH / 60;

//         // คำนวณ Flow ที่ถูกต้องสำหรับแต่ละประเภทท่อ
//         const flowBranch = waterPerSprinklerLPM * input.sprinklersPerBranch; // LPM ต่อท่อย่อย 1 เส้น
//         const flowSecondary = flowBranch * input.branchesPerSecondary; // LPM ต่อท่อรอง 1 เส้น
//         const flowMain = waterPerZoneLPM * input.simultaneousZones; // LPM สำหรับท่อหลัก

//         // หาสปริงเกอร์ที่เหมาะสม
//         const recommendedSprinklers = SprinklerData.filter((sprinkler) => {
//             const minFlow = Array.isArray(sprinkler.waterVolumeLitersPerHour)
//                 ? sprinkler.waterVolumeLitersPerHour[0]
//                 : parseFloat(String(sprinkler.waterVolumeLitersPerHour).split('-')[0]);
//             const maxFlow = Array.isArray(sprinkler.waterVolumeLitersPerHour)
//                 ? sprinkler.waterVolumeLitersPerHour[1]
//                 : parseFloat(String(sprinkler.waterVolumeLitersPerHour).split('-')[1]);

//             return waterPerSprinklerLPH >= minFlow && waterPerSprinklerLPH <= maxFlow;
//         });

//         // หาท่อที่เหมาะสม - ปรับเกณฑ์ให้เหมาะสมกว่า
//         const recommendedBranchPipe = PipeData.filter((pipe) => {
//             // รองรับหลายประเภทท่อสำหรับท่อย่อย
//             if (!['LDPE', 'Flexible PE', 'PE-RT'].includes(pipe.pipeType)) return false;
//             const velocity = calculateImprovedHeadLoss(
//                 flowBranch,
//                 pipe.sizeMM,
//                 input.longestBranchPipeM,
//                 pipe.pipeType,
//                 'branch'
//             ).velocity;
//             // ขยายช่วงขนาดและความเร็ว
//             return pipe.sizeMM >= 16 && pipe.sizeMM <= 40 && velocity >= 0.3 && velocity <= 3.0;
//         });

//         const recommendedSecondaryPipe = PipeData.filter((pipe) => {
//             // รองรับหลายประเภทท่อสำหรับท่อรอง
//             if (!['HDPE PE 80', 'HDPE PE 100', 'PVC'].includes(pipe.pipeType)) return false;
//             const velocity = calculateImprovedHeadLoss(
//                 flowSecondary,
//                 pipe.sizeMM,
//                 input.longestSecondaryPipeM,
//                 pipe.pipeType,
//                 'secondary'
//             ).velocity;
//             // ขยายช่วงขนาดและความเร็ว
//             return pipe.sizeMM >= 32 && pipe.sizeMM <= 75 && velocity >= 0.3 && velocity <= 3.0;
//         });

//         const recommendedMainPipe = PipeData.filter((pipe) => {
//             // รองรับเฉพาะท่อคุณภาพสูงสำหรับท่อหลัก
//             if (!['HDPE PE 100', 'HDPE PE 80'].includes(pipe.pipeType)) return false;
//             const velocity = calculateImprovedHeadLoss(
//                 flowMain,
//                 pipe.sizeMM,
//                 input.longestMainPipeM,
//                 pipe.pipeType,
//                 'main'
//             ).velocity;
//             // ปรับช่วงขนาดให้เหมาะสมกับอัตราการไหล (เพิ่มขนาดขั้นต่ำ)
//             return pipe.sizeMM >= 63 && pipe.sizeMM <= 125 && velocity >= 0.3 && velocity <= 2.5;
//         });

//         // เลือกท่อ default (เลือกที่มีความเร็วเหมาะสมที่สุด)
//         const defaultBranchPipe =
//             recommendedBranchPipe.length > 0
//                 ? recommendedBranchPipe.sort((a, b) => {
//                       // เรียงตามความเร็วที่ใกล้เคียง 1.0 m/s ที่สุด
//                       const velocityA = calculateImprovedHeadLoss(
//                           flowBranch,
//                           a.sizeMM,
//                           input.longestBranchPipeM,
//                           a.pipeType,
//                           'branch'
//                       ).velocity;
//                       const velocityB = calculateImprovedHeadLoss(
//                           flowBranch,
//                           b.sizeMM,
//                           input.longestBranchPipeM,
//                           b.pipeType,
//                           'branch'
//                       ).velocity;
//                       return Math.abs(velocityA - 1.0) - Math.abs(velocityB - 1.0);
//                   })[0]
//                 : PipeData.filter((pipe) => pipe.pipeType === 'LDPE' && pipe.sizeMM >= 20).sort(
//                       (a, b) => a.sizeMM - b.sizeMM
//                   )[0];

//         const defaultSecondaryPipe =
//             recommendedSecondaryPipe.length > 0
//                 ? recommendedSecondaryPipe.sort((a, b) => {
//                       // เรียงตามความเร็วที่ใกล้เคียง 1.5 m/s ที่สุด
//                       const velocityA = calculateImprovedHeadLoss(
//                           flowSecondary,
//                           a.sizeMM,
//                           input.longestSecondaryPipeM,
//                           a.pipeType,
//                           'secondary'
//                       ).velocity;
//                       const velocityB = calculateImprovedHeadLoss(
//                           flowSecondary,
//                           b.sizeMM,
//                           input.longestSecondaryPipeM,
//                           b.pipeType,
//                           'secondary'
//                       ).velocity;
//                       return Math.abs(velocityA - 1.5) - Math.abs(velocityB - 1.5);
//                   })[0]
//                 : PipeData.filter(
//                       (pipe) => pipe.pipeType === 'HDPE PE 80' && pipe.sizeMM >= 40
//                   ).sort((a, b) => a.sizeMM - b.sizeMM)[0];

//         const defaultMainPipe =
//             recommendedMainPipe.length > 0
//                 ? recommendedMainPipe.sort((a, b) => {
//                       // เรียงตามความเร็วที่ใกล้เคียง 1.5 m/s ที่สุด
//                       const velocityA = calculateImprovedHeadLoss(
//                           flowMain,
//                           a.sizeMM,
//                           input.longestMainPipeM,
//                           a.pipeType,
//                           'main'
//                       ).velocity;
//                       const velocityB = calculateImprovedHeadLoss(
//                           flowMain,
//                           b.sizeMM,
//                           input.longestMainPipeM,
//                           b.pipeType,
//                           'main'
//                       ).velocity;
//                       return Math.abs(velocityA - 1.5) - Math.abs(velocityB - 1.5);
//                   })[0]
//                 : PipeData.filter(
//                       (pipe) => pipe.pipeType === 'HDPE PE 100' && pipe.sizeMM >= 63
//                   ).sort((a, b) => a.sizeMM - b.sizeMM)[0];

//         // คำนวณจำนวนม้วนท่อ
//         const branchRolls = defaultBranchPipe
//             ? calculatePipeRolls(input.totalBranchPipeM, defaultBranchPipe.lengthM)
//             : 1;
//         const secondaryRolls = defaultSecondaryPipe
//             ? calculatePipeRolls(input.totalSecondaryPipeM, defaultSecondaryPipe.lengthM)
//             : 1;
//         const mainRolls = defaultMainPipe
//             ? calculatePipeRolls(input.totalMainPipeM, defaultMainPipe.lengthM)
//             : 1;

//         // คำนวณ Head Loss และ Velocity ด้วยวิธีปรับปรุง
//         const branchLoss = defaultBranchPipe
//             ? calculateImprovedHeadLoss(
//                   flowBranch,
//                   defaultBranchPipe.sizeMM,
//                   input.longestBranchPipeM,
//                   defaultBranchPipe.pipeType,
//                   'branch'
//               )
//             : { major: 0, minor: 0, total: 0, velocity: 0, C: 135 };

//         const secondaryLoss = defaultSecondaryPipe
//             ? calculateImprovedHeadLoss(
//                   flowSecondary,
//                   defaultSecondaryPipe.sizeMM,
//                   input.longestSecondaryPipeM,
//                   defaultSecondaryPipe.pipeType,
//                   'secondary'
//               )
//             : { major: 0, minor: 0, total: 0, velocity: 0, C: 140 };

//         const mainLoss = defaultMainPipe
//             ? calculateImprovedHeadLoss(
//                   flowMain,
//                   defaultMainPipe.sizeMM,
//                   input.longestMainPipeM,
//                   defaultMainPipe.pipeType,
//                   'main'
//               )
//             : { major: 0, minor: 0, total: 0, velocity: 0, C: 145 };

//         const totalHeadLoss = branchLoss.total + secondaryLoss.total + mainLoss.total;
//         const totalMajorLoss = branchLoss.major + secondaryLoss.major + mainLoss.major;
//         const totalMinorLoss = branchLoss.minor + secondaryLoss.minor + mainLoss.minor;

//         // ตรวจสอบความเร็ว
//         const velocityWarnings = [
//             checkVelocity(branchLoss.velocity, 'ท่อย่อย'),
//             checkVelocity(secondaryLoss.velocity, 'ท่อรอง'),
//             checkVelocity(mainLoss.velocity, 'ท่อหลัก'),
//         ];

//         // คำนวณ Pump Head ที่ต้องการ
//         const pumpHeadRequired = input.staticHeadM + totalHeadLoss + input.pressureHeadM;

//         // หาปั๊มที่เหมาะสม (ปรับเกณฑ์ให้สมจริงกว่า)
//         const recommendedPump = PumpData.filter((pump) => {
//             const maxFlow =
//                 pump.max_flow_rate_lpm ||
//                 (Array.isArray(pump.flow_rate_lpm) ? pump.flow_rate_lpm[1] : 0);
//             const maxHead = pump.max_head_m || (Array.isArray(pump.head_m) ? pump.head_m[0] : 0);

//             // ปรับเกณฑ์การเลือกปั๊มให้เหมาะสมกว่า
//             return (
//                 maxFlow >= flowMain * 1.05 && // ลด safety margin จาก 1.1 เป็น 1.05
//                 maxFlow <= flowMain * 2.5 && // ลดจาก 3 เป็น 2.5
//                 maxHead >= pumpHeadRequired * 1.05 && // เพิ่ม safety margin เล็กน้อย
//                 maxHead <= pumpHeadRequired * 2.0 // จำกัดไม่ให้ใหญ่เกินไป
//             );
//         });

//         const calculationResults: CalculationResults = {
//             totalWaterRequiredLPH,
//             totalWaterRequiredLPM,
//             waterPerZoneLPH,
//             waterPerZoneLPM,
//             totalSprinklers,
//             sprinklersPerZone,
//             waterPerSprinklerLPH,
//             waterPerSprinklerLPM,
//             recommendedSprinklers,
//             recommendedBranchPipe,
//             recommendedSecondaryPipe,
//             recommendedMainPipe,
//             recommendedPump,
//             branchPipeRolls: branchRolls,
//             secondaryPipeRolls: secondaryRolls,
//             mainPipeRolls: mainRolls,
//             headLoss: {
//                 branch: {
//                     major: branchLoss.major,
//                     minor: branchLoss.minor,
//                     total: branchLoss.total,
//                 },
//                 secondary: {
//                     major: secondaryLoss.major,
//                     minor: secondaryLoss.minor,
//                     total: secondaryLoss.total,
//                 },
//                 main: {
//                     major: mainLoss.major,
//                     minor: mainLoss.minor,
//                     total: mainLoss.total,
//                 },
//                 totalMajor: totalMajorLoss,
//                 totalMinor: totalMinorLoss,
//                 total: totalHeadLoss,
//             },
//             velocity: {
//                 branch: branchLoss.velocity,
//                 secondary: secondaryLoss.velocity,
//                 main: mainLoss.velocity,
//             },
//             flows: {
//                 branch: flowBranch,
//                 secondary: flowSecondary,
//                 main: flowMain,
//             },
//             coefficients: {
//                 branch: branchLoss.C,
//                 secondary: secondaryLoss.C,
//                 main: mainLoss.C,
//             },
//             pumpHeadRequired,
//             safetyFactor,
//             adjustedFlow,
//             velocityWarnings,
//         };

//         setResults(calculationResults);

//         // เลือกอุปกรณ์ default
//         if (recommendedSprinklers.length > 0) {
//             setSelectedSprinkler(recommendedSprinklers.sort((a, b) => b.price - a.price)[0]);
//         } else {
//             setSelectedSprinkler(SprinklerData.sort((a, b) => b.price - a.price)[0]);
//         }

//         setSelectedBranchPipe(defaultBranchPipe);
//         setSelectedSecondaryPipe(defaultSecondaryPipe);
//         setSelectedMainPipe(defaultMainPipe);

//         if (recommendedPump.length > 0) {
//             setSelectedPump(recommendedPump.sort((a, b) => a.price - b.price)[0]); // เลือกที่ถูกที่สุดแทน
//         } else {
//             setSelectedPump(PumpData.sort((a, b) => a.price - b.price)[0]); // เลือกที่ถูกที่สุดแทน
//         }
//     };

//     // อัพเดทการคำนวณเมื่อเปลี่ยนท่อ
//     useEffect(() => {
//         if (results && selectedBranchPipe && selectedSecondaryPipe && selectedMainPipe) {
//             const branchRolls = calculatePipeRolls(
//                 input.totalBranchPipeM,
//                 selectedBranchPipe.lengthM
//             );
//             const secondaryRolls = calculatePipeRolls(
//                 input.totalSecondaryPipeM,
//                 selectedSecondaryPipe.lengthM
//             );
//             const mainRolls = calculatePipeRolls(input.totalMainPipeM, selectedMainPipe.lengthM);

//             setResults((prev) => ({
//                 ...prev!,
//                 branchPipeRolls: branchRolls,
//                 secondaryPipeRolls: secondaryRolls,
//                 mainPipeRolls: mainRolls,
//             }));
//         }
//     }, [
//         selectedBranchPipe,
//         selectedSecondaryPipe,
//         selectedMainPipe,
//         input.totalBranchPipeM,
//         input.totalSecondaryPipeM,
//         input.totalMainPipeM,
//     ]);

//     // คำนวณใหม่เมื่อค่า input เปลี่ยน
//     useEffect(() => {
//         calculateRecommendations();
//     }, [input]);

//     const formatWaterFlow = (waterFlow: any) => {
//         if (Array.isArray(waterFlow)) {
//             return `${waterFlow[0]}-${waterFlow[1]}`;
//         }
//         return waterFlow.toString();
//     };

//     const formatRadius = (radius: any) => {
//         if (Array.isArray(radius)) {
//             return `${radius[0]}-${radius[1]}`;
//         }
//         return radius.toString();
//     };

//     const isRecommended = (item: any, recommendedList: any[]) => {
//         return recommendedList.includes(item);
//     };

//     return (
//         <div className="min-h-screen bg-gray-800 p-6 text-white">
//             <div className="mx-auto max-w-7xl">
//                 <h1 className="mb-8 text-center text-3xl font-bold text-blue-400">
//                     ระบบคำนวณเลือกอุปกรณ์การให้น้ำพืช (เวอร์ชันปรับปรุงใหม่)
//                 </h1>

//                 {/* แสดงข้อมูลสำคัญก่อนเริ่มต้น */}
//                 {results && (
//                     <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-4">
//                         <h2 className="mb-2 text-lg font-bold text-white">🎯 ข้อมูลสำคัญ</h2>
//                         <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
//                             <div className="text-center">
//                                 <p className="text-blue-200">ความต้องการน้ำ</p>
//                                 <p className="text-xl font-bold">
//                                     {results.totalWaterRequiredLPM.toFixed(1)} LPM
//                                 </p>
//                             </div>
//                             <div className="text-center">
//                                 <p className="text-green-200">Head Loss รวม</p>
//                                 <p className="text-xl font-bold text-yellow-300">
//                                     {results.headLoss.total.toFixed(1)} m
//                                 </p>
//                             </div>
//                             <div className="text-center">
//                                 <p className="text-purple-200">Pump Head</p>
//                                 <p className="text-xl font-bold text-orange-300">
//                                     {results.pumpHeadRequired.toFixed(1)} m
//                                 </p>
//                             </div>
//                             <div className="text-center">
//                                 <p className="text-pink-200">ประมาณการ</p>
//                                 <p className="text-xl font-bold text-green-300">
//                                     {(
//                                         (selectedSprinkler?.price || 0) * results.totalSprinklers +
//                                         (selectedPump?.price || 0) +
//                                         (selectedBranchPipe?.price || 0) * results.branchPipeRolls +
//                                         (selectedSecondaryPipe?.price || 0) *
//                                             results.secondaryPipeRolls +
//                                         (selectedMainPipe?.price || 0) * results.mainPipeRolls
//                                     ).toLocaleString()}{' '}
//                                     ฿
//                                 </p>
//                             </div>
//                         </div>
//                     </div>
//                 )}

//                 {/* Input Section */}
//                 <div className="mb-8 rounded-lg bg-gray-700 p-6">
//                     <h2 className="mb-4 text-xl font-semibold text-green-400">ข้อมูลพื้นฐาน</h2>
//                     <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
//                         <div>
//                             <label className="mb-2 block text-sm font-medium">
//                                 ขนาดพื้นที่ (ไร่)
//                             </label>
//                             <input
//                                 type="number"
//                                 value={input.farmSizeRai}
//                                 onChange={(e) =>
//                                     setInput({
//                                         ...input,
//                                         farmSizeRai: parseFloat(e.target.value) || 0,
//                                     })
//                                 }
//                                 className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                             />
//                         </div>
//                         <div>
//                             <label className="mb-2 block text-sm font-medium">
//                                 จำนวนต้นไม้ (ต้น)
//                             </label>
//                             <input
//                                 type="number"
//                                 value={input.totalTrees}
//                                 onChange={(e) =>
//                                     setInput({
//                                         ...input,
//                                         totalTrees: parseInt(e.target.value) || 0,
//                                     })
//                                 }
//                                 className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                             />
//                         </div>
//                         <div>
//                             <label className="mb-2 block text-sm font-medium">
//                                 น้ำต่อต้น (ลิตร/วัน)
//                             </label>
//                             <input
//                                 type="number"
//                                 value={input.waterPerTreeLiters}
//                                 onChange={(e) =>
//                                     setInput({
//                                         ...input,
//                                         waterPerTreeLiters: parseFloat(e.target.value) || 0,
//                                     })
//                                 }
//                                 className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                             />
//                         </div>
//                         <div>
//                             <label className="mb-2 block text-sm font-medium">จำนวนโซน</label>
//                             <input
//                                 type="number"
//                                 value={input.numberOfZones}
//                                 onChange={(e) =>
//                                     setInput({
//                                         ...input,
//                                         numberOfZones: parseInt(e.target.value) || 1,
//                                     })
//                                 }
//                                 className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                             />
//                         </div>
//                         <div>
//                             <label className="mb-2 block text-sm font-medium">
//                                 สปริงเกอร์ต่อต้น
//                             </label>
//                             <input
//                                 type="number"
//                                 step="0.1"
//                                 value={input.sprinklersPerTree}
//                                 onChange={(e) =>
//                                     setInput({
//                                         ...input,
//                                         sprinklersPerTree: parseFloat(e.target.value) || 1,
//                                     })
//                                 }
//                                 className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                             />
//                         </div>
//                         <div>
//                             <label className="mb-2 block text-sm font-medium">
//                                 เวลารดน้ำ (นาที/วัน)
//                             </label>
//                             <input
//                                 type="number"
//                                 step="1"
//                                 value={input.irrigationTimeMinutes}
//                                 onChange={(e) =>
//                                     setInput({
//                                         ...input,
//                                         irrigationTimeMinutes: parseFloat(e.target.value) || 1,
//                                     })
//                                 }
//                                 className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                             />
//                         </div>
//                         <div>
//                             <label className="mb-2 block text-sm font-medium">
//                                 ความสูงจริง (เมตร)
//                             </label>
//                             <input
//                                 type="number"
//                                 step="0.1"
//                                 value={input.staticHeadM}
//                                 onChange={(e) =>
//                                     setInput({
//                                         ...input,
//                                         staticHeadM: parseFloat(e.target.value) || 0,
//                                     })
//                                 }
//                                 className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                                 placeholder="ความสูงจากปั๊มไปจุดสูงสุด"
//                             />
//                         </div>
//                         <div>
//                             <label className="mb-2 block text-sm font-medium">
//                                 แรงดันที่ต้องการ (เมตร)
//                             </label>
//                             <input
//                                 type="number"
//                                 step="0.1"
//                                 value={input.pressureHeadM}
//                                 onChange={(e) =>
//                                     setInput({
//                                         ...input,
//                                         pressureHeadM: parseFloat(e.target.value) || 0,
//                                     })
//                                 }
//                                 className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                                 placeholder="แรงดันที่หัวสปริงเกอร์"
//                             />
//                         </div>
//                         <div>
//                             <label className="mb-2 block text-sm font-medium">อายุท่อ (ปี)</label>
//                             <input
//                                 type="number"
//                                 min="0"
//                                 max="20"
//                                 value={input.pipeAgeYears}
//                                 onChange={(e) =>
//                                     setInput({
//                                         ...input,
//                                         pipeAgeYears: parseInt(e.target.value) || 0,
//                                     })
//                                 }
//                                 className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                                 placeholder="0 = ท่อใหม่"
//                             />
//                         </div>
//                     </div>

//                     {/* การตั้งค่าระบบ */}
//                     <h3 className="mb-4 mt-6 text-lg font-semibold text-orange-400">
//                         การตั้งค่าระบบ
//                     </h3>
//                     <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
//                         <div>
//                             <label className="mb-2 block text-sm font-medium">
//                                 สปริงเกอร์ต่อท่อย่อย 1 เส้น
//                             </label>
//                             <input
//                                 type="number"
//                                 min="1"
//                                 value={input.sprinklersPerBranch}
//                                 onChange={(e) =>
//                                     setInput({
//                                         ...input,
//                                         sprinklersPerBranch: parseInt(e.target.value) || 1,
//                                     })
//                                 }
//                                 className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                             />
//                         </div>
//                         <div>
//                             <label className="mb-2 block text-sm font-medium">
//                                 ท่อย่อยต่อท่อรอง 1 เส้น
//                             </label>
//                             <input
//                                 type="number"
//                                 min="1"
//                                 value={input.branchesPerSecondary}
//                                 onChange={(e) =>
//                                     setInput({
//                                         ...input,
//                                         branchesPerSecondary: parseInt(e.target.value) || 1,
//                                     })
//                                 }
//                                 className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                             />
//                         </div>
//                         <div>
//                             <label className="mb-2 block text-sm font-medium">
//                                 โซนทำงานพร้อมกัน
//                             </label>
//                             <input
//                                 type="number"
//                                 min="1"
//                                 max={input.numberOfZones}
//                                 value={input.simultaneousZones}
//                                 onChange={(e) =>
//                                     setInput({
//                                         ...input,
//                                         simultaneousZones: parseInt(e.target.value) || 1,
//                                     })
//                                 }
//                                 className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                             />
//                         </div>
//                     </div>

//                     {/* ข้อมูลท่อ */}
//                     <h3 className="mb-4 mt-6 text-lg font-semibold text-blue-400">ข้อมูลท่อ</h3>
//                     <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
//                         <div className="space-y-4">
//                             <h4 className="text-md font-medium text-purple-300">
//                                 ท่อย่อย (Branch Pipe)
//                             </h4>
//                             <div>
//                                 <label className="mb-2 block text-sm font-medium">
//                                     ท่อย่อยเส้นที่ยาวที่สุด (เมตร)
//                                 </label>
//                                 <input
//                                     type="number"
//                                     value={input.longestBranchPipeM}
//                                     onChange={(e) =>
//                                         setInput({
//                                             ...input,
//                                             longestBranchPipeM: parseFloat(e.target.value) || 0,
//                                         })
//                                     }
//                                     className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                                 />
//                             </div>
//                             <div>
//                                 <label className="mb-2 block text-sm font-medium">
//                                     ท่อย่อยรวมทั้งหมด (เมตร)
//                                 </label>
//                                 <input
//                                     type="number"
//                                     value={input.totalBranchPipeM}
//                                     onChange={(e) =>
//                                         setInput({
//                                             ...input,
//                                             totalBranchPipeM: parseFloat(e.target.value) || 0,
//                                         })
//                                     }
//                                     className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                                 />
//                             </div>
//                         </div>

//                         <div className="space-y-4">
//                             <h4 className="text-md font-medium text-orange-300">
//                                 ท่อเมนรอง (Secondary Pipe)
//                             </h4>
//                             <div>
//                                 <label className="mb-2 block text-sm font-medium">
//                                     ท่อเมนรองเส้นที่ยาวที่สุด (เมตร)
//                                 </label>
//                                 <input
//                                     type="number"
//                                     value={input.longestSecondaryPipeM}
//                                     onChange={(e) =>
//                                         setInput({
//                                             ...input,
//                                             longestSecondaryPipeM: parseFloat(e.target.value) || 0,
//                                         })
//                                     }
//                                     className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                                 />
//                             </div>
//                             <div>
//                                 <label className="mb-2 block text-sm font-medium">
//                                     ท่อเมนรองรวมทั้งหมด (เมตร)
//                                 </label>
//                                 <input
//                                     type="number"
//                                     value={input.totalSecondaryPipeM}
//                                     onChange={(e) =>
//                                         setInput({
//                                             ...input,
//                                             totalSecondaryPipeM: parseFloat(e.target.value) || 0,
//                                         })
//                                     }
//                                     className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                                 />
//                             </div>
//                         </div>

//                         <div className="space-y-4 md:col-span-2">
//                             <h4 className="text-md font-medium text-cyan-300">
//                                 ท่อเมนหลัก (Main Pipe)
//                             </h4>
//                             <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//                                 <div>
//                                     <label className="mb-2 block text-sm font-medium">
//                                         ท่อเมนหลักเส้นที่ยาวที่สุด (เมตร)
//                                     </label>
//                                     <input
//                                         type="number"
//                                         value={input.longestMainPipeM}
//                                         onChange={(e) =>
//                                             setInput({
//                                                 ...input,
//                                                 longestMainPipeM: parseFloat(e.target.value) || 0,
//                                             })
//                                         }
//                                         className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                                     />
//                                 </div>
//                                 <div>
//                                     <label className="mb-2 block text-sm font-medium">
//                                         ท่อเมนหลักรวมทั้งหมด (เมตร)
//                                     </label>
//                                     <input
//                                         type="number"
//                                         value={input.totalMainPipeM}
//                                         onChange={(e) =>
//                                             setInput({
//                                                 ...input,
//                                                 totalMainPipeM: parseFloat(e.target.value) || 0,
//                                             })
//                                         }
//                                         className="w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                                     />
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Results Section */}
//                 {results && (
//                     <div className="space-y-6">
//                         {/* Summary */}
//                         <div className="rounded-lg bg-gray-700 p-6">
//                             <h2 className="mb-4 text-xl font-semibold text-yellow-400">
//                                 สรุปการคำนวณ (เวอร์ชันปรับปรุงใหม่) ✨
//                             </h2>
//                             <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
//                                 {/* การไหลและอัตรา */}
//                                 <div className="rounded bg-gray-600 p-4">
//                                     <h3 className="mb-2 font-medium text-blue-300">
//                                         ความต้องการน้ำรวม
//                                     </h3>
//                                     <p className="text-lg font-bold">
//                                         {results.totalWaterRequiredLPM.toFixed(1)} ลิตร/นาที
//                                     </p>
//                                     <p className="text-sm text-gray-300">+ Safety Factor 25%</p>
//                                     <p className="text-sm font-bold text-green-300">
//                                         {results.adjustedFlow.toFixed(1)} ลิตร/นาที
//                                     </p>
//                                 </div>

//                                 <div className="rounded bg-gray-600 p-4">
//                                     <h3 className="mb-2 font-medium text-purple-300">
//                                         น้ำต่อหัวสปริงเกอร์
//                                     </h3>
//                                     <p className="text-lg font-bold">
//                                         {results.waterPerSprinklerLPH.toFixed(1)} ลิตร/ชั่วโมง
//                                     </p>
//                                     <p className="text-sm text-gray-300">
//                                         ({results.waterPerSprinklerLPM.toFixed(3)} ลิตร/นาที)
//                                     </p>
//                                 </div>

//                                 <div className="rounded bg-gray-600 p-4">
//                                     <h3 className="mb-2 font-medium text-green-300">
//                                         จำนวนสปริงเกอร์
//                                     </h3>
//                                     <p className="text-lg font-bold">
//                                         {results.totalSprinklers} หัว
//                                     </p>
//                                     <p className="text-sm text-gray-300">
//                                         {results.sprinklersPerZone.toFixed(1)} หัว/โซน
//                                     </p>
//                                 </div>

//                                 {/* อัตราการไหลในแต่ละประเภทท่อ */}
//                                 <div className="rounded bg-gray-600 p-4">
//                                     <h3 className="mb-2 font-medium text-yellow-300">
//                                         อัตราการไหลแต่ละท่อ
//                                     </h3>
//                                     <div className="text-sm">
//                                         <p>
//                                             ท่อย่อย:{' '}
//                                             <span className="font-bold text-purple-300">
//                                                 {results.flows.branch.toFixed(1)} LPM
//                                             </span>
//                                         </p>
//                                         <p>
//                                             ท่อรอง:{' '}
//                                             <span className="font-bold text-orange-300">
//                                                 {results.flows.secondary.toFixed(1)} LPM
//                                             </span>
//                                         </p>
//                                         <p>
//                                             ท่อหลัก:{' '}
//                                             <span className="font-bold text-cyan-300">
//                                                 {results.flows.main.toFixed(1)} LPM
//                                             </span>
//                                         </p>
//                                     </div>
//                                     <p className="mt-1 text-xs text-gray-400">ตามการออกแบบระบบ</p>
//                                 </div>

//                                 {/* Head Loss รายละเอียด */}
//                                 <div className="rounded bg-gray-600 p-4">
//                                     <h3 className="mb-2 font-medium text-red-300">
//                                         Head Loss รายละเอียด
//                                     </h3>
//                                     <div className="text-sm">
//                                         <p>
//                                             Major Loss:{' '}
//                                             <span className="font-bold text-red-400">
//                                                 {results.headLoss.totalMajor.toFixed(2)} m
//                                             </span>
//                                         </p>
//                                         <p>
//                                             Minor Loss:{' '}
//                                             <span className="font-bold text-orange-400">
//                                                 {results.headLoss.totalMinor.toFixed(2)} m
//                                             </span>
//                                         </p>
//                                         <p>
//                                             รวม:{' '}
//                                             <span
//                                                 className={`font-bold ${results.headLoss.total > 20 ? 'text-red-400' : results.headLoss.total > 15 ? 'text-yellow-400' : 'text-green-400'}`}
//                                             >
//                                                 {results.headLoss.total.toFixed(1)} m
//                                             </span>
//                                         </p>
//                                     </div>
//                                     <div className="mt-2 text-xs text-gray-300">
//                                         <p>ย่อย: {results.headLoss.branch.total.toFixed(1)}m</p>
//                                         <p>รอง: {results.headLoss.secondary.total.toFixed(1)}m</p>
//                                         <p>หลัก: {results.headLoss.main.total.toFixed(1)}m</p>
//                                     </div>
//                                 </div>

//                                 {/* ความเร็วน้ำ */}
//                                 <div className="rounded bg-gray-600 p-4">
//                                     <h3 className="mb-2 font-medium text-cyan-300">
//                                         ความเร็วน้ำ (m/s)
//                                     </h3>
//                                     <div className="text-sm">
//                                         <p>
//                                             ย่อย:{' '}
//                                             <span
//                                                 className={`font-bold ${results.velocity.branch > 2.5 ? 'text-red-400' : results.velocity.branch < 0.3 ? 'text-blue-400' : 'text-green-400'}`}
//                                             >
//                                                 {results.velocity.branch.toFixed(2)}
//                                             </span>
//                                         </p>
//                                         <p>
//                                             รอง:{' '}
//                                             <span
//                                                 className={`font-bold ${results.velocity.secondary > 2.5 ? 'text-red-400' : results.velocity.secondary < 0.3 ? 'text-blue-400' : 'text-green-400'}`}
//                                             >
//                                                 {results.velocity.secondary.toFixed(2)}
//                                             </span>
//                                         </p>
//                                         <p>
//                                             หลัก:{' '}
//                                             <span
//                                                 className={`font-bold ${results.velocity.main > 2.5 ? 'text-red-400' : results.velocity.main < 0.3 ? 'text-blue-400' : 'text-green-400'}`}
//                                             >
//                                                 {results.velocity.main.toFixed(2)}
//                                             </span>
//                                         </p>
//                                     </div>
//                                     <p className="mt-1 text-xs text-gray-400">แนะนำ: 0.3-2.5 m/s</p>
//                                 </div>

//                                 {/* Pump Head */}
//                                 <div className="rounded bg-gray-600 p-4">
//                                     <h3 className="mb-2 font-medium text-orange-300">
//                                         Pump Head ที่ต้องการ
//                                     </h3>
//                                     <p
//                                         className={`text-lg font-bold ${results.pumpHeadRequired > 60 ? 'text-red-400' : results.pumpHeadRequired > 40 ? 'text-yellow-400' : 'text-green-400'}`}
//                                     >
//                                         {results.pumpHeadRequired.toFixed(1)} เมตร
//                                     </p>
//                                     <div className="text-xs text-gray-300">
//                                         <p>Static: {input.staticHeadM.toFixed(1)}m</p>
//                                         <p>Head Loss: {results.headLoss.total.toFixed(1)}m</p>
//                                         <p>Pressure: {input.pressureHeadM.toFixed(1)}m</p>
//                                     </div>
//                                 </div>

//                                 {/* ท่อที่เลือก */}
//                                 <div className="rounded bg-gray-600 p-4">
//                                     <h3 className="mb-2 font-medium text-pink-300">
//                                         ขนาดท่อที่เลือก
//                                     </h3>
//                                     <div className="text-sm">
//                                         <p>
//                                             ย่อย:{' '}
//                                             <span className="font-bold text-purple-300">
//                                                 {selectedBranchPipe?.sizeMM || 'N/A'}mm
//                                             </span>
//                                         </p>
//                                         <p>
//                                             รอง:{' '}
//                                             <span className="font-bold text-orange-300">
//                                                 {selectedSecondaryPipe?.sizeMM || 'N/A'}mm
//                                             </span>
//                                         </p>
//                                         <p>
//                                             หลัก:{' '}
//                                             <span className="font-bold text-cyan-300">
//                                                 {selectedMainPipe?.sizeMM || 'N/A'}mm
//                                             </span>
//                                         </p>
//                                     </div>
//                                     <p className="mt-1 text-xs text-gray-400">ขนาดที่ระบบแนะนำ</p>
//                                 </div>
//                             </div>

//                             {/* การเตือนความเร็ว */}
//                             {results.velocityWarnings.length > 0 && (
//                                 <div className="mt-6 rounded bg-gray-600 p-4">
//                                     <h3 className="mb-2 font-medium text-yellow-300">
//                                         การตรวจสอบความเร็วน้ำ
//                                     </h3>
//                                     <div className="space-y-1">
//                                         {results.velocityWarnings.map((warning, index) => (
//                                             <p key={index} className="text-sm">
//                                                 {warning}
//                                             </p>
//                                         ))}
//                                     </div>
//                                 </div>
//                             )}
//                         </div>

//                         {/* Equipment Selection - ใช้โค้ดเดิม */}
//                         <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
//                             {/* Sprinkler Selection */}
//                             <div className="rounded-lg bg-gray-700 p-6">
//                                 <h3 className="mb-4 text-lg font-semibold text-green-400">
//                                     เลือกสปริงเกอร์
//                                 </h3>
//                                 <select
//                                     value={selectedSprinkler?.id || ''}
//                                     onChange={(e) => {
//                                         const selected = SprinklerData.find(
//                                             (s) => s.id === parseInt(e.target.value)
//                                         );
//                                         setSelectedSprinkler(selected);
//                                     }}
//                                     className="mb-4 w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                                 >
//                                     {sortForDropdown(
//                                         SprinklerData,
//                                         results.recommendedSprinklers
//                                     ).map((sprinkler) => (
//                                         <option key={sprinkler.id} value={sprinkler.id}>
//                                             {sprinkler.name} - {sprinkler.price} บาท
//                                             {isRecommended(sprinkler, results.recommendedSprinklers)
//                                                 ? ' 🌟 แนะนำ'
//                                                 : ''}
//                                         </option>
//                                     ))}
//                                 </select>
//                                 {selectedSprinkler && (
//                                     <div className="rounded bg-gray-600 p-3">
//                                         <p>
//                                             <strong>อัตราการไหล:</strong>{' '}
//                                             {formatWaterFlow(
//                                                 selectedSprinkler.waterVolumeLitersPerHour
//                                             )}{' '}
//                                             ลิตร/ชั่วโมง
//                                         </p>
//                                         <p>
//                                             <strong>รัศมี:</strong>{' '}
//                                             {formatRadius(selectedSprinkler.radiusMeters)} เมตร
//                                         </p>
//                                         <p>
//                                             <strong>ราคาต่อหัว:</strong> {selectedSprinkler.price}{' '}
//                                             บาท
//                                         </p>
//                                         <p>
//                                             <strong>จำนวนที่ต้องใช้:</strong>{' '}
//                                             {results.totalSprinklers} หัว
//                                         </p>
//                                         <p>
//                                             <strong>ราคารวม:</strong>{' '}
//                                             <span className="text-green-300">
//                                                 {(
//                                                     selectedSprinkler.price *
//                                                     results.totalSprinklers
//                                                 ).toLocaleString()}
//                                             </span>{' '}
//                                             บาท
//                                         </p>
//                                     </div>
//                                 )}
//                             </div>

//                             {/* Pump Selection */}
//                             <div className="rounded-lg bg-gray-700 p-6">
//                                 <h3 className="mb-4 text-lg font-semibold text-red-400">
//                                     เลือกปั๊มน้ำ
//                                 </h3>
//                                 <select
//                                     value={selectedPump?.id || ''}
//                                     onChange={(e) => {
//                                         const selected = PumpData.find(
//                                             (p) => p.id === parseInt(e.target.value)
//                                         );
//                                         setSelectedPump(selected);
//                                     }}
//                                     className="mb-4 w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                                 >
//                                     {sortForDropdown(PumpData, results.recommendedPump).map(
//                                         (pump) => (
//                                             <option key={pump.id} value={pump.id}>
//                                                 {pump.productCode} ({pump.powerHP}HP) - {pump.price}{' '}
//                                                 บาท
//                                                 {isRecommended(pump, results.recommendedPump)
//                                                     ? ' 🌟 แนะนำ'
//                                                     : ''}
//                                             </option>
//                                         )
//                                     )}
//                                 </select>
//                                 {selectedPump && (
//                                     <div className="rounded bg-gray-600 p-3">
//                                         <p>
//                                             <strong>กำลัง:</strong> {selectedPump.powerHP} HP
//                                         </p>
//                                         <p>
//                                             <strong>อัตราการไหลสูงสุด:</strong>{' '}
//                                             {selectedPump.max_flow_rate_lpm || 'N/A'} LPM
//                                         </p>
//                                         <p>
//                                             <strong>ความสูงยกสูงสุด:</strong>{' '}
//                                             {selectedPump.max_head_m || 'N/A'} เมตร
//                                         </p>
//                                         <p>
//                                             <strong>ราคา:</strong> {selectedPump.price} บาท
//                                         </p>
//                                         <div className="mt-2 text-sm">
//                                             <p
//                                                 className={`${(selectedPump.max_flow_rate_lpm || 0) >= results.flows.main * 1.05 ? 'text-green-300' : 'text-red-300'}`}
//                                             >
//                                                 Flow:{' '}
//                                                 {(selectedPump.max_flow_rate_lpm || 0) >=
//                                                 results.flows.main * 1.05
//                                                     ? '✅ เพียงพอ'
//                                                     : '❌ ไม่เพียงพอ'}
//                                             </p>
//                                             <p
//                                                 className={`${(selectedPump.max_head_m || 0) >= results.pumpHeadRequired ? 'text-green-300' : 'text-red-300'}`}
//                                             >
//                                                 Head:{' '}
//                                                 {(selectedPump.max_head_m || 0) >=
//                                                 results.pumpHeadRequired
//                                                     ? '✅ เพียงพอ'
//                                                     : '❌ ไม่เพียงพอ'}
//                                             </p>
//                                         </div>
//                                     </div>
//                                 )}
//                             </div>

//                             {/* Branch Pipe Selection */}
//                             <div className="rounded-lg bg-gray-700 p-6">
//                                 <h3 className="mb-4 text-lg font-semibold text-purple-400">
//                                     เลือกท่อย่อย
//                                 </h3>
//                                 <p className="mb-3 text-sm text-gray-300">
//                                     สำหรับแยกไปสปริงเกอร์ ({input.sprinklersPerBranch} หัว/ท่อ)
//                                 </p>
//                                 <select
//                                     value={selectedBranchPipe?.id || ''}
//                                     onChange={(e) => {
//                                         const selected = PipeData.find(
//                                             (p) => p.id === parseInt(e.target.value)
//                                         );
//                                         setSelectedBranchPipe(selected);
//                                     }}
//                                     className="mb-4 w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                                 >
//                                     {sortForDropdown(
//                                         PipeData.filter((pipe) =>
//                                             ['LDPE', 'Flexible PE', 'PE-RT'].includes(pipe.pipeType)
//                                         ),
//                                         results.recommendedBranchPipe
//                                     ).map((pipe) => (
//                                         <option key={pipe.id} value={pipe.id}>
//                                             {pipe.productCode} ({pipe.sizeMM}mm, {pipe.lengthM}m) -{' '}
//                                             {pipe.price} บาท
//                                             {isRecommended(pipe, results.recommendedBranchPipe)
//                                                 ? ' 🌟 แนะนำ'
//                                                 : ''}
//                                         </option>
//                                     ))}
//                                 </select>
//                                 {selectedBranchPipe && (
//                                     <div className="rounded bg-gray-600 p-3">
//                                         <p>
//                                             <strong>ประเภท:</strong> {selectedBranchPipe.pipeType}
//                                         </p>
//                                         <p>
//                                             <strong>ขนาด:</strong> {selectedBranchPipe.sizeMM} มม.
//                                         </p>
//                                         <p>
//                                             <strong>ความยาวต่อม้วน:</strong>{' '}
//                                             {selectedBranchPipe.lengthM} เมตร
//                                         </p>
//                                         <p>
//                                             <strong>อัตราการไหล:</strong>{' '}
//                                             {results.flows.branch.toFixed(1)} LPM
//                                         </p>
//                                         <p>
//                                             <strong>ความเร็ว:</strong>{' '}
//                                             <span
//                                                 className={`${results.velocity.branch > 2.5 ? 'text-red-400' : results.velocity.branch < 0.3 ? 'text-blue-400' : 'text-green-400'}`}
//                                             >
//                                                 {results.velocity.branch.toFixed(2)} m/s
//                                             </span>
//                                         </p>
//                                         <p>
//                                             <strong>จำนวนม้วน:</strong>{' '}
//                                             <span className="text-yellow-300">
//                                                 {results.branchPipeRolls}
//                                             </span>{' '}
//                                             ม้วน
//                                         </p>
//                                         <p>
//                                             <strong>ราคารวม:</strong>{' '}
//                                             <span className="text-green-300">
//                                                 {(
//                                                     selectedBranchPipe.price *
//                                                     results.branchPipeRolls
//                                                 ).toLocaleString()}
//                                             </span>{' '}
//                                             บาท
//                                         </p>
//                                     </div>
//                                 )}
//                             </div>

//                             {/* Secondary Pipe Selection */}
//                             <div className="rounded-lg bg-gray-700 p-6">
//                                 <h3 className="mb-4 text-lg font-semibold text-orange-400">
//                                     เลือกท่อเมนรอง
//                                 </h3>
//                                 <p className="mb-3 text-sm text-gray-300">
//                                     รวบรวมน้ำจาก {input.branchesPerSecondary} ท่อย่อย
//                                 </p>
//                                 <select
//                                     value={selectedSecondaryPipe?.id || ''}
//                                     onChange={(e) => {
//                                         const selected = PipeData.find(
//                                             (p) => p.id === parseInt(e.target.value)
//                                         );
//                                         setSelectedSecondaryPipe(selected);
//                                     }}
//                                     className="mb-4 w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                                 >
//                                     {sortForDropdown(
//                                         PipeData.filter((pipe) =>
//                                             ['HDPE PE 80', 'HDPE PE 100', 'PVC'].includes(
//                                                 pipe.pipeType
//                                             )
//                                         ),
//                                         results.recommendedSecondaryPipe
//                                     ).map((pipe) => (
//                                         <option key={pipe.id} value={pipe.id}>
//                                             {pipe.productCode} ({pipe.sizeMM}mm, {pipe.lengthM}m) -{' '}
//                                             {pipe.price} บาท
//                                             {isRecommended(pipe, results.recommendedSecondaryPipe)
//                                                 ? ' 🌟 แนะนำ'
//                                                 : ''}
//                                         </option>
//                                     ))}
//                                 </select>
//                                 {selectedSecondaryPipe && (
//                                     <div className="rounded bg-gray-600 p-3">
//                                         <p>
//                                             <strong>ประเภท:</strong>{' '}
//                                             {selectedSecondaryPipe.pipeType}
//                                         </p>
//                                         <p>
//                                             <strong>ขนาด:</strong> {selectedSecondaryPipe.sizeMM}{' '}
//                                             มม.
//                                         </p>
//                                         <p>
//                                             <strong>ความยาวต่อม้วน:</strong>{' '}
//                                             {selectedSecondaryPipe.lengthM} เมตร
//                                         </p>
//                                         <p>
//                                             <strong>อัตราการไหล:</strong>{' '}
//                                             {results.flows.secondary.toFixed(1)} LPM
//                                         </p>
//                                         <p>
//                                             <strong>ความเร็ว:</strong>{' '}
//                                             <span
//                                                 className={`${results.velocity.secondary > 2.5 ? 'text-red-400' : results.velocity.secondary < 0.3 ? 'text-blue-400' : 'text-green-400'}`}
//                                             >
//                                                 {results.velocity.secondary.toFixed(2)} m/s
//                                             </span>
//                                         </p>
//                                         <p>
//                                             <strong>จำนวนม้วน:</strong>{' '}
//                                             <span className="text-yellow-300">
//                                                 {results.secondaryPipeRolls}
//                                             </span>{' '}
//                                             ม้วน
//                                         </p>
//                                         <p>
//                                             <strong>ราคารวม:</strong>{' '}
//                                             <span className="text-green-300">
//                                                 {(
//                                                     selectedSecondaryPipe.price *
//                                                     results.secondaryPipeRolls
//                                                 ).toLocaleString()}
//                                             </span>{' '}
//                                             บาท
//                                         </p>
//                                     </div>
//                                 )}
//                             </div>

//                             {/* Main Pipe Selection */}
//                             <div className="rounded-lg bg-gray-700 p-6 lg:col-span-2">
//                                 <h3 className="mb-4 text-lg font-semibold text-cyan-400">
//                                     เลือกท่อเมนหลัก
//                                 </h3>
//                                 <p className="mb-3 text-sm text-gray-300">
//                                     ท่อหลักจากปั๊ม ({input.simultaneousZones} โซนพร้อมกัน)
//                                 </p>
//                                 <select
//                                     value={selectedMainPipe?.id || ''}
//                                     onChange={(e) => {
//                                         const selected = PipeData.find(
//                                             (p) => p.id === parseInt(e.target.value)
//                                         );
//                                         setSelectedMainPipe(selected);
//                                     }}
//                                     className="mb-4 w-full rounded border border-gray-500 bg-gray-600 p-2 text-white focus:border-blue-400"
//                                 >
//                                     {sortForDropdown(
//                                         PipeData.filter((pipe) =>
//                                             ['HDPE PE 100', 'HDPE PE 80'].includes(pipe.pipeType)
//                                         ),
//                                         results.recommendedMainPipe
//                                     ).map((pipe) => (
//                                         <option key={pipe.id} value={pipe.id}>
//                                             {pipe.productCode} ({pipe.sizeMM}mm, {pipe.lengthM}m) -{' '}
//                                             {pipe.price} บาท
//                                             {isRecommended(pipe, results.recommendedMainPipe)
//                                                 ? ' 🌟 แนะนำ'
//                                                 : ''}
//                                         </option>
//                                     ))}
//                                 </select>
//                                 {selectedMainPipe && (
//                                     <div className="rounded bg-gray-600 p-3">
//                                         <p>
//                                             <strong>ประเภท:</strong> {selectedMainPipe.pipeType}
//                                         </p>
//                                         <p>
//                                             <strong>ขนาด:</strong> {selectedMainPipe.sizeMM} มม.
//                                         </p>
//                                         <p>
//                                             <strong>ความยาวต่อม้วน:</strong>{' '}
//                                             {selectedMainPipe.lengthM} เมตร
//                                         </p>
//                                         <p>
//                                             <strong>อัตราการไหล:</strong>{' '}
//                                             {results.flows.main.toFixed(1)} LPM
//                                         </p>
//                                         <p>
//                                             <strong>ความเร็ว:</strong>{' '}
//                                             <span
//                                                 className={`${results.velocity.main > 2.5 ? 'text-red-400' : results.velocity.main < 0.3 ? 'text-blue-400' : 'text-green-400'}`}
//                                             >
//                                                 {results.velocity.main.toFixed(2)} m/s
//                                             </span>
//                                         </p>
//                                         <p>
//                                             <strong>จำนวนม้วน:</strong>{' '}
//                                             <span className="text-yellow-300">
//                                                 {results.mainPipeRolls}
//                                             </span>{' '}
//                                             ม้วน
//                                         </p>
//                                         <p>
//                                             <strong>ราคารวม:</strong>{' '}
//                                             <span className="text-green-300">
//                                                 {(
//                                                     selectedMainPipe.price * results.mainPipeRolls
//                                                 ).toLocaleString()}
//                                             </span>{' '}
//                                             บาท
//                                         </p>
//                                         {selectedMainPipe.lengthM < input.longestMainPipeM && (
//                                             <p className="text-sm text-red-400">
//                                                 ⚠️ เตือน: ท่อม้วนละ {selectedMainPipe.lengthM}m
//                                                 สั้นกว่าระยะที่ยาวที่สุด {input.longestMainPipeM}m
//                                             </p>
//                                         )}
//                                     </div>
//                                 )}
//                             </div>
//                         </div>

//                         {/* Total Cost Summary */}
//                         <div className="rounded-lg bg-gray-700 p-6">
//                             <h2 className="mb-4 text-xl font-semibold text-yellow-400">
//                                 สรุปราคารวม 💰
//                             </h2>
//                             <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
//                                 <div className="rounded bg-gray-600 p-4">
//                                     <h4 className="font-medium text-green-300">สปริงเกอร์</h4>
//                                     <p className="text-sm">จำนวน: {results.totalSprinklers} หัว</p>
//                                     <p className="text-xl font-bold">
//                                         {(
//                                             (selectedSprinkler?.price || 0) *
//                                             results.totalSprinklers
//                                         ).toLocaleString()}{' '}
//                                         บาท
//                                     </p>
//                                 </div>
//                                 <div className="rounded bg-gray-600 p-4">
//                                     <h4 className="font-medium text-red-300">ปั๊มน้ำ</h4>
//                                     <p className="text-sm">
//                                         จำนวน: 1 ตัว ({selectedPump?.powerHP || 'N/A'} HP)
//                                     </p>
//                                     <p className="text-xl font-bold">
//                                         {(selectedPump?.price || 0).toLocaleString()} บาท
//                                     </p>
//                                 </div>
//                                 <div className="rounded bg-gray-600 p-4">
//                                     <h4 className="font-medium text-purple-300">ท่อย่อย</h4>
//                                     <p className="text-sm">
//                                         จำนวน: {results.branchPipeRolls} ม้วน (
//                                         {selectedBranchPipe?.sizeMM || 'N/A'}mm)
//                                     </p>
//                                     <p className="text-xl font-bold">
//                                         {(
//                                             (selectedBranchPipe?.price || 0) *
//                                             results.branchPipeRolls
//                                         ).toLocaleString()}{' '}
//                                         บาท
//                                     </p>
//                                 </div>
//                                 <div className="rounded bg-gray-600 p-4">
//                                     <h4 className="font-medium text-orange-300">ท่อเมนรอง</h4>
//                                     <p className="text-sm">
//                                         จำนวน: {results.secondaryPipeRolls} ม้วน (
//                                         {selectedSecondaryPipe?.sizeMM || 'N/A'}mm)
//                                     </p>
//                                     <p className="text-xl font-bold">
//                                         {(
//                                             (selectedSecondaryPipe?.price || 0) *
//                                             results.secondaryPipeRolls
//                                         ).toLocaleString()}{' '}
//                                         บาท
//                                     </p>
//                                 </div>
//                                 <div className="rounded bg-gray-600 p-4">
//                                     <h4 className="font-medium text-cyan-300">ท่อเมนหลัก</h4>
//                                     <p className="text-sm">
//                                         จำนวน: {results.mainPipeRolls} ม้วน (
//                                         {selectedMainPipe?.sizeMM || 'N/A'}mm)
//                                     </p>
//                                     <p className="text-xl font-bold">
//                                         {(
//                                             (selectedMainPipe?.price || 0) * results.mainPipeRolls
//                                         ).toLocaleString()}{' '}
//                                         บาท
//                                     </p>
//                                 </div>
//                                 <div className="rounded bg-gradient-to-r from-green-600 to-blue-600 p-4">
//                                     <h4 className="font-medium text-white">💎 รวมทั้งหมด</h4>
//                                     <p className="text-sm text-green-100">ราคาสุทธิ (ไม่รวม VAT)</p>
//                                     <p className="text-2xl font-bold text-white">
//                                         {(
//                                             (selectedSprinkler?.price || 0) *
//                                                 results.totalSprinklers +
//                                             (selectedPump?.price || 0) +
//                                             (selectedBranchPipe?.price || 0) *
//                                                 results.branchPipeRolls +
//                                             (selectedSecondaryPipe?.price || 0) *
//                                                 results.secondaryPipeRolls +
//                                             (selectedMainPipe?.price || 0) * results.mainPipeRolls
//                                         ).toLocaleString()}{' '}
//                                         บาท
//                                     </p>
//                                 </div>
//                             </div>

//                             {/* ปุ่มออกใบเสนอราคา */}
//                             <div className="mt-6 text-center">
//                                 <button
//                                     onClick={() => setShowQuotationModal(true)}
//                                     className="rounded bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 text-lg font-bold text-white hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 >
//                                     📋 ออกใบเสนอราคา
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 )}
//             </div>
//             <div className="">
//                 <ChatBox />
//             </div>

//             {/* Modal สำหรับกรอกข้อมูลใบเสนอราคา */}
//             {showQuotationModal && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
//                     <div className="w-full max-w-2xl rounded-lg bg-white p-6 text-gray-800">
//                         <h3 className="mb-4 text-xl font-bold">ข้อมูลใบเสนอราคา</h3>
//                         <div className="flex w-full items-center justify-between gap-x-4">
//                             <div className="space-y-4 w-1/2">
//                                 <h1 className="text-xl font-semibold">ผู้ให้บริการ</h1>
//                                 <div>
//                                     <label className="mb-2 block text-sm font-medium">
//                                         Your Reference:
//                                     </label>
//                                     <input
//                                         type="text"
//                                         value={quotationData.yourReference}
//                                         onChange={(e) =>
//                                             setQuotationData({
//                                                 ...quotationData,
//                                                 yourReference: e.target.value,
//                                             })
//                                         }
//                                         className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
//                                         placeholder="ชื่อทีม"
//                                     />
//                                 </div>
//                                 <div>
//                                     <label className="mb-2 block text-sm font-medium">
//                                         Quotation Date:
//                                     </label>
//                                     <input
//                                         type="text"
//                                         value={quotationData.quotationDate}
//                                         onChange={(e) =>
//                                             setQuotationData({
//                                                 ...quotationData,
//                                                 quotationDate: e.target.value,
//                                             })
//                                         }
//                                         className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
//                                     />
//                                 </div>
//                                 <div>
//                                     <label className="mb-2 block text-sm font-medium">
//                                         Salesperson:
//                                     </label>
//                                     <input
//                                         type="text"
//                                         value={quotationData.salesperson}
//                                         onChange={(e) =>
//                                             setQuotationData({
//                                                 ...quotationData,
//                                                 salesperson: e.target.value,
//                                             })
//                                         }
//                                         className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
//                                         placeholder="ผู้ออกใบเสนอราคา"
//                                     />
//                                 </div>
//                                 <div>
//                                     <label className="mb-2 block text-sm font-medium">
//                                         Payment Terms:
//                                     </label>
//                                     <input
//                                         type="text"
//                                         value={quotationData.paymentTerms}
//                                         onChange={(e) =>
//                                             setQuotationData({
//                                                 ...quotationData,
//                                                 paymentTerms: e.target.value,
//                                             })
//                                         }
//                                         className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
//                                         placeholder="เงื่อนไขการชำระเงิน"
//                                     />
//                                 </div>
//                             </div>
//                             <div className="space-y-4 w-1/2">
//                                 <h1 className="text-xl font-semibold">ผู้ใช้บริการ</h1>
//                                 <div>
//                                     <label className="mb-2 block text-sm font-medium">Code:</label>
//                                     <input
//                                         type="text"
//                                         value={quotationDataCustomer.code}
//                                         onChange={(e) =>
//                                             setQuotationDataCustomer({
//                                                 ...quotationDataCustomer,
//                                                 code: e.target.value,
//                                             })
//                                         }
//                                         className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
//                                         placeholder="รหัสคำสั่งซื้อ"
//                                     />
//                                 </div>
//                                 <div>
//                                     <label className="mb-2 block text-sm font-medium">Name:</label>
//                                     <input
//                                         type="text"
//                                         value={quotationDataCustomer.name}
//                                         onChange={(e) =>
//                                             setQuotationDataCustomer({
//                                                 ...quotationDataCustomer,
//                                                 name: e.target.value,
//                                             })
//                                         }
//                                         className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
//                                         placeholder="ชื่อ - นามสกุล"
//                                     />
//                                 </div>
//                                 <div>
//                                     <label className="mb-2 block text-sm font-medium">
//                                         Address:
//                                     </label>
//                                     <input
//                                         type="text"
//                                         value={quotationDataCustomer.address}
//                                         onChange={(e) =>
//                                             setQuotationDataCustomer({
//                                                 ...quotationDataCustomer,
//                                                 address: e.target.value,
//                                             })
//                                         }
//                                         className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
//                                         placeholder="ที่อยู่"
//                                     />
//                                 </div>
//                                 <div>
//                                     <label className="mb-2 block text-sm font-medium">Phone:</label>
//                                     <input
//                                         type="text"
//                                         value={quotationDataCustomer.phone}
//                                         onChange={(e) =>
//                                             setQuotationDataCustomer({
//                                                 ...quotationDataCustomer,
//                                                 phone: e.target.value,
//                                             })
//                                         }
//                                         className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
//                                         placeholder="มือถือ"
//                                     />
//                                 </div>

//                             </div>
//                         </div>
//                         <div className="mt-6 flex space-x-4">
//                             <button
//                                 onClick={() => setShowQuotationModal(false)}
//                                 className="flex-1 rounded bg-gray-500 py-2 text-white hover:bg-gray-600"
//                             >
//                                 ยกเลิก
//                             </button>
//                             <button
//                                 onClick={() => {
//                                     setShowQuotationModal(false);
//                                     setShowQuotation(true);
//                                 }}
//                                 className="flex-1 rounded bg-blue-500 py-2 text-white hover:bg-blue-600"
//                             >
//                                 ยืนยัน
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* ใบเสนอราคา */}
//             {showQuotation && results && (
//                 <div className="fixed inset-0 z-50 overflow-auto bg-gray-800">
//                     <div className="mx-auto my-8 max-h-screen p-8 text-black print:min-h-[297mm] print:w-[210mm] print:p-4">
//                         {/* ปุ่มควบคุม */}
//                         <div className="fixed left-0 right-0 top-0 z-50 flex justify-between bg-gray-900 px-8 py-4 print:hidden">
//                             <button
//                                 onClick={() => setShowQuotation(false)}
//                                 className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
//                             >
//                                 ปิด
//                             </button>
//                             <div className="space-x-2">
//                                 <button
//                                     onClick={() => window.print()}
//                                     className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
//                                 >
//                                     พิมพ์
//                                 </button>
//                             </div>
//                         </div>

//                         {/* เนื้อหาใบเสนอราคา */}
//                         <div
//                             className="flex-1  bg-white px-8 py-4 text-black print:p-0"
//                             style={{ minHeight: '297mm', width: '210mm', margin: '0 auto' }}
//                         >
//                             {/* หัวกระดาษ */}
//                             <div className="mb-2 flex h-10 w-10 items-center justify-center rounded bg-none">
//                                 <img
//                                     src="https://scontent.fbkk17-1.fna.fbcdn.net/v/t39.30808-6/329365639_863669681576432_9072509434807570833_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeHzH0DSWRVrgxX-EPgYJXWZa6wVAKl2SdJrrBUAqXZJ0oxyybhLN1NBN_23fG_LnsJ6WcMd43_CHfgauuKawq9u&_nc_ohc=AYHmXGdPpb4Q7kNvwGjNIyW&_nc_oc=Adn8gkjmK5ho0NtNd0I0aDcp_32sp2juklFr_jP0eF8617DZ6crKViCr4e0-DZzT5uQ&_nc_zt=23&_nc_ht=scontent.fbkk17-1.fna&_nc_gid=yQcuPmACGvR7YC1W1imnRg&oh=00_AfPIGiKMCEtqlh5mCSA0bp46jj9ogkArAXfW8y1b_gxo1A&oe=68558A4C"
//                                     alt="logo"
//                                     className="h-8 w-8 rounded-full"
//                                 />
//                             </div>
//                             <hr className="border-gray-800" />
//                             <div className="flex w-full flex-col items-start gap-y-4">
//                                 {/* บล็อกแรก ชิดซ้ายตามปกติ */}
//                                 <div className="mt-3 text-[12px]">
//                                     <p>บจก. กนกโปรดักส์ (สำนักงานใหญ่)</p>
//                                     <p>15 ซ. พระยามนธาตุ แยก 10</p>
//                                     <p>แขวงคลองบางบอน เขตบางบอน</p>
//                                     <p>กรุงเทพมหานคร 10150</p>
//                                 </div>

//                                 {/* บล็อกสอง เลื่อนไปชิดขวา */}
//                                 <div className="mr-10 self-end text-left text-[12px]">
//                                     <p>[{quotationDataCustomer.code}] {quotationDataCustomer.name}</p>
//                                     <p>{quotationDataCustomer.address}</p>
//                                     <p>{quotationDataCustomer.phone}</p>
//                                     <p>{quotationDataCustomer.email}</p>
//                                 </div>
//                             </div>

//                             {/* หัวข้อใบเสนอราคา */}
//                             <h1 className="mb-6 text-left text-xl font-bold">
//                                 Quotation # QT{new Date().getFullYear()}
//                                 {(new Date().getMonth() + 1).toString().padStart(2, '0')}
//                                 {new Date().getDate().toString().padStart(2, '0')}
//                                 {Math.floor(Math.random() * 10000)
//                                     .toString()
//                                     .padStart(4, '0')}
//                             </h1>

//                             {/* ข้อมูลใบเสนอราคา */}
//                             <div className="mb-6 flex flex-row gap-x-8 text-[12px]">
//                                 <div>
//                                     <strong>Your Reference:</strong>
//                                     <p>{quotationData.yourReference}</p>
//                                 </div>
//                                 <div>
//                                     <strong>Quotation Date:</strong>
//                                     <p>{quotationData.quotationDate}</p>
//                                 </div>
//                                 <div>
//                                     <strong>Salesperson:</strong>
//                                     <p>{quotationData.salesperson}</p>
//                                 </div>
//                                 <div>
//                                     <strong>Payment Terms:</strong>
//                                     <p>{quotationData.paymentTerms}</p>
//                                 </div>
//                             </div>

//                             {/* ตารางรายการสินค้า */}
//                             <table className="w-full border-collapse border border-gray-300 text-[10px]">
//                                 <thead>
//                                     <tr className="bg-gray-100">
//                                         <th
//                                             className="border border-gray-300 p-2 text-center"
//                                             colSpan={5}
//                                         >
//                                             Commitment
//                                         </th>
//                                         <th
//                                             className="border border-gray-300 p-2 text-center"
//                                             colSpan={4}
//                                         >
//                                             Disc. Fixed
//                                         </th>
//                                     </tr>
//                                     <tr className="bg-gray-100">
//                                         <th className="border border-gray-300 p-2 text-center">
//                                             Sequence
//                                         </th>
//                                         <th className="border border-gray-300 p-2 text-center">
//                                             Image
//                                         </th>
//                                         <th className="border border-gray-300 p-2 text-center">
//                                             Date
//                                         </th>
//                                         {/* <th className="border border-gray-300 p-2 text-center">
//                                             Commitment
//                                         </th> */}
//                                         <th className="border border-gray-300 p-2 text-center">
//                                             Description
//                                         </th>
//                                         <th className="border border-gray-300 p-2 text-center">
//                                             Quantity
//                                         </th>
//                                         <th className="border border-gray-300 p-2 text-center">
//                                             Unit Price
//                                         </th>
//                                         <th className="border border-gray-300 p-2 text-center">
//                                             Disc.(%)
//                                         </th>
//                                         <th className="border border-gray-300 p-2 text-center">
//                                             Amount Taxes
//                                         </th>
//                                         <th className="border border-gray-300 p-2 text-center">
//                                             Amount
//                                         </th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {/* สปริงเกอร์ */}
//                                     {selectedSprinkler && (
//                                         <tr>
//                                             <td className="border border-gray-300 p-2">1</td>
//                                             <td className="border border-gray-300 p-2">🌱</td>
//                                             <td className="border border-gray-300 p-2"></td>
//                                             <td className="border border-gray-300 p-2">
//                                                 {selectedSprinkler.name}
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {results.totalSprinklers}.0000
//                                                 <br />
//                                                 Unit
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {selectedSprinkler.price.toFixed(4)}
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 30.00000
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {(selectedSprinkler.price * 0.3).toFixed(2)}100
//                                                 Output
//                                                 <br />
//                                                 VAT
//                                                 <br />
//                                                 7%
//                                             </td>

//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {(
//                                                    ( selectedSprinkler.price *
//                                                     results.totalSprinklers) * 0.3
//                                                 ).toFixed(2)}{' '}
//                                                 ฿
//                                             </td>
//                                         </tr>
//                                     )}

//                                     {/* ท่อย่อย */}
//                                     {selectedBranchPipe && (
//                                         <tr>
//                                             <td className="border border-gray-300 p-2">2</td>
//                                             <td className="border border-gray-300 p-2"></td>
//                                             <td className="border border-gray-300 p-2"></td>
//                                             <td className="border border-gray-300 p-2">
//                                                 {selectedBranchPipe.productCode}{' '}
//                                                 {selectedBranchPipe.pipeType}{' '}
//                                                 {selectedBranchPipe.sizeMM}"{' ยาว '}
//                                                 {selectedBranchPipe.lengthM} ม.
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {results.branchPipeRolls}.0000
//                                                 <br />
//                                                 Unit
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {selectedBranchPipe.price.toFixed(4)}
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 30.00000
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {(selectedBranchPipe.price * 0.3).toFixed(3)}100
//                                                 Output
//                                                 <br />
//                                                 VAT
//                                                 <br />
//                                                 7%
//                                             </td>

//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {(
//                                                     (selectedBranchPipe.price *
//                                                     results.branchPipeRolls) * 0.3
//                                                 ).toFixed(2)}{' '}
//                                                 ฿
//                                             </td>
//                                         </tr>
//                                     )}

//                                     {/* ท่อรอง */}
//                                     {selectedSecondaryPipe && (
//                                         <tr>
//                                             <td className="border border-gray-300 p-2">3</td>
//                                             <td className="border border-gray-300 p-2"></td>
//                                             <td className="border border-gray-300 p-2"></td>
//                                             <td className="border border-gray-300 p-2">
//                                                 <br />
//                                                 {selectedSecondaryPipe.pipeType}{' '}
//                                                 {selectedSecondaryPipe.sizeMM}"
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {results.secondaryPipeRolls}.0000
//                                                 <br />
//                                                 Unit
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {selectedSecondaryPipe.price.toFixed(5)}
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 30.00000
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {(selectedSecondaryPipe.price * 0.3).toFixed(5)}00
//                                                 Output
//                                                 <br />
//                                                 VAT
//                                                 <br />
//                                                 7%
//                                             </td>

//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {(
//                                                     (selectedSecondaryPipe.price *
//                                                     results.secondaryPipeRolls) * 0.3
//                                                 ).toFixed(2)}{' '}
//                                                 ฿
//                                             </td>
//                                         </tr>
//                                     )}

//                                     {/* ท่อหลัก */}
//                                     {selectedMainPipe && (
//                                         <tr>
//                                             <td className="border border-gray-300 p-2">4</td>
//                                             <td className="border border-gray-300 p-2"></td>
//                                             <td className="border border-gray-300 p-2"></td>
//                                             <td className="border border-gray-300 p-2">
//                                                 {selectedMainPipe.pipeType}
//                                                 <br />
//                                                 {selectedMainPipe.sizeMM}
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {results.mainPipeRolls}.0000
//                                                 <br />
//                                                 Unit
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {selectedMainPipe.price.toFixed(5)}
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 30.00000
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {(selectedMainPipe.price * 0.86).toFixed(5)}1200
//                                                 Output
//                                                 <br />
//                                                 VAT
//                                                 <br />
//                                                 7%
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {(
//                                                     (selectedMainPipe.price *
//                                                     results.mainPipeRolls) * 0.3
//                                                 ).toFixed(2)}{' '}
//                                                 ฿
//                                             </td>
//                                         </tr>
//                                     )}

//                                     {/* ปั๊ม */}
//                                     {selectedPump && (
//                                         <tr>
//                                             <td className="border border-gray-300 p-2">5</td>
//                                             <td className="border border-gray-300 p-2"></td>
//                                             <td className="border border-gray-300 p-2"></td>
//                                             <td className="border border-gray-300 p-2">
//                                                 {selectedPump.productCode}
//                                                 <br />
//                                                 {selectedPump.powerHP}
//                                                 <br />
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 1.0000
//                                                 <br />
//                                                 Unit
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {selectedPump.price.toFixed(5)}
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 30.00000
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {(selectedPump.price * 0.13).toFixed(5)}700 Output
//                                                 <br />
//                                                 VAT
//                                                 <br />
//                                                 7%
//                                             </td>
//                                             <td className="border border-gray-300 p-2 text-right">
//                                                 {(
//                                                     (selectedPump.price *
//                                                     1) * 0.3
//                                                 ).toFixed(2)}{' '}
//                                                 ฿
//                                             </td>
//                                         </tr>
//                                     )}
//                                 </tbody>
//                             </table>

//                             {/* รวมราคา */}
//                             <div className="mt-4 text-right">
//                                 <p className="text-lg font-bold">
//                                     รวมทั้งหมด:{' '}
//                                     {(
//                                         (selectedSprinkler?.price || 0) * results.totalSprinklers +
//                                         (selectedPump?.price || 0) +
//                                         (selectedBranchPipe?.price || 0) * results.branchPipeRolls +
//                                         (selectedSecondaryPipe?.price || 0) *
//                                             results.secondaryPipeRolls +
//                                         (selectedMainPipe?.price || 0) * results.mainPipeRolls
//                                     ).toLocaleString()}{' '}
//                                     บาท
//                                 </p>
//                             </div>

//                             {/* ข้อมูลติดต่อ */}
//                             <div className="mt-8 border-t pt-4 text-center text-xs">
//                                 <p>Phone: 02-451-1111 Tax ID: 0105549044446</p>
//                                 <p>Page: 1 / 7</p>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }
