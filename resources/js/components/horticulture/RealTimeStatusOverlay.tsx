import React, { useEffect, useState } from 'react';

interface Coordinate {
    lat: number;
    lng: number;
}
interface PlantData {
    id: number;
    name: string;
    plantSpacing: number;
    rowSpacing: number;
    waterNeed: number;
}
interface Zone {
    id: string;
    name: string;
    coordinates: Coordinate[];
    plantData: PlantData;
    plantCount: number;
    totalWaterNeed: number;
    area: number;
    color: string;
}
interface Pump {
    id: string;
    position: Coordinate;
    type: 'submersible' | 'centrifugal' | 'jet';
    capacity: number;
    head: number;
}
interface MainPipe {
    id: string;
    fromPump: string;
    toZone: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
}
interface SubMainPipe {
    id: string;
    zoneId: string;
    coordinates: Coordinate[];
    length: number;
    diameter: number;
    branchPipes: unknown[];
}
interface PlantLocation {
    id: string;
    position: Coordinate;
    plantData: PlantData;
}
interface ExclusionArea {
    id: string;
    type: 'building' | 'powerplant' | 'river' | 'road' | 'other';
    coordinates: Coordinate[];
    name: string;
    color: string;
}
interface ProjectState {
    mainArea: Coordinate[];
    zones: Zone[];
    pump: Pump | null;
    mainPipes: MainPipe[];
    subMainPipes: SubMainPipe[];
    plants: PlantLocation[];
    exclusionAreas: ExclusionArea[];
    useZones: boolean;
    isEditModeEnabled: boolean;
    selectedItems: {
        plants: string[];
        pipes: string[];
        zones: string[];
    };
    realTimeEditing: {
        activePipeId: string | null;
        activeAngle: number;
        isAdjusting: boolean;
    };
    selectedPlantType: PlantData | null;
}
interface RealTimeStatusOverlayProps {
    projectState: ProjectState;
    editMode: string | null;
    isDragging: boolean;
    isCreatingConnection: boolean;
    t: (key: string) => string;
}

interface WorkflowStep {
    id: string;
    title: string;
    required: boolean;
    isCompleted: boolean;
}

// เรียงตามลำดับ tab จริง
const getWorkflowSteps = (state: ProjectState, t: (key: string) => string): WorkflowStep[] => [
    // Tab 1: พื้นที่
    {
        id: 'main-area',
        title: t('วาดพื้นที่หลัก'),
        required: true,
        isCompleted: state.mainArea.length > 0,
    },
    {
        id: 'exclusion',
        title: t('วาดพื้นที่หลีกเลี่ยง'),
        required: false,
        isCompleted: state.exclusionAreas.length > 0,
    },
    {
        id: 'zones',
        title: t('เลือกว่าจะมีกลายโซนหรือไม่'),
        required: false,
        isCompleted: state.zones.length < 0 || state.useZones === true,
    },
    {
        id: 'draw-zones',
        title: t('วาดโซน(กรณีเลือกหลายโซน)'),
        required: false,
        isCompleted: state.zones.length > 0,
    },
    {
        id: 'plants',
        title: t('เลือกพืชแต่ละพื้นที่'),
        required: true,
        isCompleted: !!state.selectedPlantType,
    },
    // Tab 2: ปั๊ม
    {
        id: 'pump',
        title: t('วางปั๊มน้ำ'),
        required: true,
        isCompleted: !!state.pump,
    },
    // Tab 3: ท่อ
    {
        id: 'main-pipes',
        title: t('วางท่อเมน'),
        required: true,
        isCompleted: state.mainPipes.length > 0,
    },
    {
        id: 'sub-pipes',
        title: t('วางท่อรอง + ท่อย่อย'),
        required: true,
        isCompleted: state.subMainPipes.length > 0,
    },
    {
        id: 'edit',
        title: t('แก้ไข เช่น เพิ่ม/ลบต้นไม้และท่อ'),
        required: false,
        isCompleted: state.isEditModeEnabled,
    },
    {
        id: 'fill-data',
        title: t('กรอกชื่อโครงการและชื่อลูกค้า'),
        required: false,
        isCompleted: false, // ยังไม่มีการตรวจจับข้อมูลโครงการ - ต้องเพิ่มการตรวจจับในอนาคต
    },
    {
        id: 'save',
        title: t('กดปุ่ม บันทึก'),
        required: true,
        isCompleted: false, // ยังไม่มีการตรวจจับการบันทึก - ต้องเพิ่มการตรวจจับในอนาคต
    },
];

const RealTimeStatusOverlay: React.FC<RealTimeStatusOverlayProps> = ({ projectState, t }) => {
    const [steps, setSteps] = useState<WorkflowStep[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(true);

    useEffect(() => {
        const allSteps = getWorkflowSteps(projectState, t);
        setSteps(allSteps);
    }, [projectState, t]);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    // คำนวณความคืบหน้า
    const completedSteps = steps.filter((step) => step.isCompleted).length;
    const totalSteps = steps.length;
    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    // หาขั้นตอนถัดไปที่ต้องทำ
    const nextStep = steps.find((step) => !step.isCompleted && step.required);

    return (
        <div className="absolute right-4 top-16 max-w-xs rounded-lg border border-gray-200 bg-gray-900 p-3 shadow-lg">
            {/* Header with collapse button */}
            <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-white">{t('ขั้นตอนทั้งหมด')}</div>
                <button
                    onClick={toggleCollapse}
                    className="text-gray-400 transition-colors hover:text-white"
                    title={isCollapsed ? 'ขยาย' : 'ย่อ'}
                >
                    {isCollapsed ? (
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
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    ) : (
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
                                d="M5 15l7-7 7 7"
                            />
                        </svg>
                    )}
                </button>
            </div>

            {/* Progress summary - always visible */}
            <div className="">
                <div className="mb-1 flex items-center justify-between text-xs text-gray-300">
                    <span>ความคืบหน้า</span>
                    <span className="font-semibold">
                        {completedSteps}/{totalSteps}
                    </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-700">
                    <div
                        className="h-2 rounded-full bg-green-500 transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
                {nextStep && (
                    <div className="mt-1 flex items-center text-xs text-blue-300">
                        <svg
                            className="mr-1 h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        ขั้นตอนถัดไป: {nextStep.title}
                    </div>
                )}
                {completedSteps === totalSteps && (
                    <div className="mt-1 flex items-center text-xs text-green-400">
                        <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                            />
                        </svg>
                        เสร็จสิ้นทุกขั้นตอนแล้ว!
                    </div>
                )}
                <p className="my-1 text-[12px] text-gray-400">
                    หมายเหตุ: ไม่จำเป็นต้องทำทุกขั้นตอน
                </p>
            </div>

            {/* Collapsible content */}
            {!isCollapsed && (
                <>
                    <div className="mb-1 text-xs font-semibold text-blue-300">Tab: พื้นที่</div>
                    <ol className="ml-5 list-decimal space-y-1">
                        {steps.slice(0, 5).map((step) => (
                            <li
                                key={step.id}
                                className="group flex items-center justify-between rounded px-1 py-0.5 text-xs text-white transition-colors hover:bg-gray-800"
                            >
                                <span className="flex-1">
                                    {step.title}{' '}
                                    {step.required && (
                                        <span className="text-yellow-400">{t('*')}</span>
                                    )}
                                </span>
                                {step.isCompleted ? (
                                    <span
                                        className="ml-2 flex-shrink-0 text-green-400"
                                        title="เสร็จแล้ว"
                                    >
                                        <svg
                                            className="h-4 w-4 animate-pulse"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </span>
                                ) : step.required ? (
                                    <span
                                        className="ml-2 flex-shrink-0 text-yellow-400"
                                        title="รอทำ"
                                    >
                                        <svg
                                            className="h-4 w-4 animate-pulse"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    </span>
                                ) : (
                                    <span
                                        className="ml-2 flex-shrink-0 text-gray-400"
                                        title="ไม่จำเป็น"
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
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ol>
                    <div className="mb-1 mt-2 text-xs font-semibold text-blue-300">
                        Tab: ระบบน้ำ
                    </div>
                    <ol className="ml-5 list-decimal space-y-1" start={6}>
                        {steps.slice(5, 8).map((step) => (
                            <li
                                key={step.id}
                                className="group flex items-center justify-between rounded px-1 py-0.5 text-xs text-white transition-colors hover:bg-gray-800"
                            >
                                <span className="flex-1">
                                    {step.title}{' '}
                                    {step.required && (
                                        <span className="text-yellow-400">{t('*')}</span>
                                    )}
                                </span>
                                {step.isCompleted ? (
                                    <span
                                        className="ml-2 flex-shrink-0 text-green-400"
                                        title="เสร็จแล้ว"
                                    >
                                        <svg
                                            className="h-4 w-4 animate-pulse"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </span>
                                ) : step.required ? (
                                    <span
                                        className="ml-2 flex-shrink-0 text-yellow-400"
                                        title="รอทำ"
                                    >
                                        <svg
                                            className="h-4 w-4 animate-pulse"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    </span>
                                ) : (
                                    <span
                                        className="ml-2 flex-shrink-0 text-gray-400"
                                        title="ไม่จำเป็น"
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
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ol>
                    <div className="mb-1 mt-2 text-xs font-semibold text-blue-300">Tab: แก้ไข</div>
                    <ol className="ml-5 list-decimal space-y-1" start={9}>
                        {steps.slice(8, 9).map((step) => (
                            <li
                                key={step.id}
                                className="group flex items-center justify-between rounded px-1 py-0.5 text-xs text-white transition-colors hover:bg-gray-800"
                            >
                                <span className="flex-1">
                                    {step.title}{' '}
                                    {step.required && (
                                        <span className="text-yellow-400">{t('*')}</span>
                                    )}
                                </span>
                                {step.isCompleted ? (
                                    <span
                                        className="ml-2 flex-shrink-0 text-green-400"
                                        title="เสร็จแล้ว"
                                    >
                                        <svg
                                            className="h-4 w-4 animate-pulse"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </span>
                                ) : step.required ? (
                                    <span
                                        className="ml-2 flex-shrink-0 text-yellow-400"
                                        title="รอทำ"
                                    >
                                        <svg
                                            className="h-4 w-4 animate-pulse"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    </span>
                                ) : (
                                    <span
                                        className="ml-2 flex-shrink-0 text-gray-400"
                                        title="ไม่จำเป็น"
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
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ol>
                    <div className="mb-1 mt-2 text-xs font-semibold text-blue-300">Tab: สรุป</div>
                    <ol className="ml-5 list-decimal space-y-1" start={10}>
                        {steps.slice(9, 11).map((step) => (
                            <li
                                key={step.id}
                                className="group flex items-center justify-between rounded px-1 py-0.5 text-xs text-white transition-colors hover:bg-gray-800"
                            >
                                <span className="flex-1">
                                    {step.title}{' '}
                                    {step.required && (
                                        <span className="text-yellow-400">{t('*')}</span>
                                    )}
                                </span>
                                {step.isCompleted ? (
                                    <span
                                        className="ml-2 flex-shrink-0 text-green-400"
                                        title="เสร็จแล้ว"
                                    >
                                        <svg
                                            className="h-4 w-4 animate-pulse"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </span>
                                ) : step.required ? (
                                    <span
                                        className="ml-2 flex-shrink-0 text-yellow-400"
                                        title="รอทำ"
                                    >
                                        <svg
                                            className="h-4 w-4 animate-pulse"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    </span>
                                ) : (
                                    <span
                                        className="ml-2 flex-shrink-0 text-gray-400"
                                        title="ไม่จำเป็น"
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
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ol>
                    <div className="mt-2 border-t border-gray-700 pt-2 text-xs text-white">
                        <p>
                            เครื่องหมาย <span className="text-yellow-400">*</span>{' '}
                            คือขั้นตอนที่จำเป็นที่ต้องทำ
                        </p>
                        <div className="mt-2 flex items-center space-x-3 text-xs">
                            <div className="flex items-center">
                                <span className="mr-1 text-green-400">✓</span>
                                <span className="text-gray-300">เสร็จแล้ว</span>
                            </div>
                            <div className="flex items-center">
                                <span className="mr-1 text-yellow-400">⏰</span>
                                <span className="text-gray-300">รอทำ</span>
                            </div>
                            <div className="flex items-center">
                                <span className="mr-1 text-gray-400">✗</span>
                                <span className="text-gray-300">ไม่จำเป็น</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default RealTimeStatusOverlay;
