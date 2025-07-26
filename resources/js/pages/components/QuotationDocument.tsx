// resources\js\pages\components\QuotationDocument.tsx
import React, { useState, useEffect, useRef } from 'react';
import { CalculationResults, QuotationData, QuotationDataCustomer } from '../types/interfaces';

interface QuotationItem {
    id: string;
    seq: number;
    image: string;
    date: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxes: string;
    originalData?: any;
}

interface Equipment {
    id: number;
    productCode: string;
    name: string;
    brand: string;
    image: string;
    price: number;
    category_id: number;
    category?: {
        name: string;
        display_name: string;
    };
}

interface QuotationDocumentProps {
    show: boolean;
    results: CalculationResults;
    quotationData: QuotationData;
    quotationDataCustomer: QuotationDataCustomer;
    selectedSprinkler: any;
    selectedPump: any;
    selectedBranchPipe: any;
    selectedSecondaryPipe: any;
    selectedMainPipe: any;
    selectedExtraPipe?: any;
    projectImage?: string | null;
    projectMode: 'horticulture' | 'garden' | 'field-crop' | 'greenhouse';
    gardenData: any;
    projectData: any;
    showPump: boolean;
    zoneSprinklers: { [zoneId: string]: any };
    selectedPipes: { [zoneId: string]: { branch?: any; secondary?: any; main?: any } };
    onClose: () => void;
}
const QuotationDocument: React.FC<QuotationDocumentProps> = ({
    show,
    results,
    quotationData,
    quotationDataCustomer,
    selectedSprinkler,
    selectedPump,
    selectedBranchPipe,
    selectedSecondaryPipe,
    selectedMainPipe,
    selectedExtraPipe,
    projectImage,
    projectData,
    projectMode,
    gardenData,
    zoneSprinklers,
    selectedPipes,
    showPump,
    onClose,
}) => {
    const [items, setItems] = useState<QuotationItem[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isEditing, setIsEditing] = useState(false);
    const [showEquipmentSelector, setShowEquipmentSelector] = useState(false);
    const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
    const [equipmentCategories, setEquipmentCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [equipmentSearchTerm, setEquipmentSearchTerm] = useState<string>('');
    const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);

    const [editableProjectImage, setEditableProjectImage] = useState<string | null>(
        projectImage || null
    );

    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    useEffect(() => {
        setEditableProjectImage(projectImage || null);
    }, [projectImage]);

    const hasProjectImagePage = !!editableProjectImage;

    const getItemsPerPage = (page: number, totalPages: number, totalItems: number) => {
        const imagePageOffset = hasProjectImagePage ? 1 : 0;
        const effectivePage = page - imagePageOffset;

        if (hasProjectImagePage && page === 1) {
            return 0;
        }

        if (effectivePage === 1) {
            if (totalPages === 1 + imagePageOffset) {
                return Math.min(10, Math.max(0, totalItems));
            }
            return 10;
        } else if (effectivePage === totalPages - imagePageOffset) {
            return Math.min(11, 14);
        } else {
            return 14;
        }
    };

    const calculateTotalPages = (totalItems: number) => {
        if (totalItems <= 7) return 1;

        let remainingItems = totalItems - 10; // หักหน้าแรก 10 รายการ
        let additionalPages = 0;

        while (remainingItems > 0) {
            if (remainingItems <= 11) {
                additionalPages += 1;
                break;
            } else {
                remainingItems -= 14;
                additionalPages += 1;
            }
        }

        return 1 + additionalPages + imagePageOffset;
    };

    const totalPages = calculateTotalPages(items.length);

    useEffect(() => {
        if (show) {
            loadEquipmentCategories();
        }
    }, [show]);

    const loadEquipmentCategories = async () => {
        try {
            const response = await fetch('/api/equipment-categories');
            if (response.ok) {
                const categories = await response.json();
                setEquipmentCategories(categories);
            }
        } catch (error) {
            console.error('Failed to load equipment categories:', error);
        }
    };

    const loadEquipmentByCategory = async (categoryId: string) => {
        if (!categoryId) {
            setEquipmentList([]);
            return;
        }

        setIsLoadingEquipment(true);
        try {
            const searchParams = new URLSearchParams({
                category_id: categoryId,
                is_active: 'true',
                per_page: '100',
            });

            if (equipmentSearchTerm) {
                searchParams.append('search', equipmentSearchTerm);
            }

            const response = await fetch(`/api/equipments?${searchParams}`);
            if (response.ok) {
                const data = await response.json();
                const equipments = data.data || data;
                setEquipmentList(equipments);
            }
        } catch (error) {
            console.error('Failed to load equipment:', error);
        } finally {
            setIsLoadingEquipment(false);
        }
    };

    useEffect(() => {
        if (selectedCategory) {
            const timeoutId = setTimeout(() => {
                loadEquipmentByCategory(selectedCategory);
            }, 1000);

            return () => clearTimeout(timeoutId);
        }
    }, [selectedCategory, equipmentSearchTerm]);

    const handleProjectImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target?.result as string;
            setEditableProjectImage(imageUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleProjectImageDelete = () => {
        setEditableProjectImage(null);
    };

    const openProjectImageDialog = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                handleProjectImageUpload(file);
            }
        };
        input.click();
    };

    const handleImageUpload = (itemId: string, file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target?.result as string;
            updateItem(itemId, 'image', imageUrl);
        };
        reader.readAsDataURL(file);
    };

    const openFileDialog = (itemId: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                handleImageUpload(itemId, file);
            }
        };
        input.click();
    };

    const addEquipmentFromDatabase = (equipment: Equipment) => {
        const newItem: QuotationItem = {
            id: `equipment_${equipment.id}_${Date.now()}`,
            seq: items.length + 1,
            image: equipment.image || '',
            date: '',
            description: `${equipment.productCode} - ${equipment.name}${equipment.brand ? ` (${equipment.brand})` : ''}`,
            quantity: 1,
            unitPrice: equipment.price,
            discount: 30.0,
            taxes: 'Output\nVAT\n7%',
            originalData: equipment,
        };

        setItems([...items, newItem]);
        setShowEquipmentSelector(false);

        setSelectedCategory('');
        setEquipmentSearchTerm('');
        setEquipmentList([]);
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newItems = [...items];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newItems.length) return;

        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];

        const updatedItems = newItems.map((item, i) => ({ ...item, seq: i + 1 }));
        setItems(updatedItems);
    };

    const getImageUrl = (item: QuotationItem) => {
        if (item.image) return item.image;

        if (item.originalData) {
            const data = item.originalData;
            return data.image_url || data.image || data.imageUrl;
        }

        return null;
    };

    useEffect(() => {
        if (!show) return;

        if (!results) {
            return;
        }

        const initialItems: QuotationItem[] = [];
        let seq = 1;

        const isMultiZone =
            projectData?.useZones && projectData.zones && projectData.zones.length > 1;

        if (isMultiZone) {
            const totalTreesInAllZones = projectData.zones.reduce(
                (sum, zone) => sum + zone.plantCount,
                0
            );

            const equipmentMap = new Map();

            projectData.zones.forEach((zone) => {
                const zoneSprinkler = zoneSprinklers[zone.id];
                const zonePipes = selectedPipes[zone.id] || {};

                if (zoneSprinkler) {
                    const sprinklerKey = `sprinkler_${zoneSprinkler.id}`;
                    if (equipmentMap.has(sprinklerKey)) {
                        const existing = equipmentMap.get(sprinklerKey);
                        existing.quantity += zone.plantCount;
                        existing.zones.push(zone.name);
                    } else {
                        equipmentMap.set(sprinklerKey, {
                            id: sprinklerKey,
                            seq: seq++,
                            image: zoneSprinkler.image_url || zoneSprinkler.image || '',
                            date: '',
                            description: `${zoneSprinkler.productCode || zoneSprinkler.product_code || ''} - ${zoneSprinkler.name || 'สปริงเกอร์'} (${zoneSprinkler.brand || ''})`,
                            quantity: zone.plantCount,
                            unitPrice: zoneSprinkler.price || 0,
                            discount: 30.0,
                            taxes: 'Output\nVAT\n7%',
                            originalData: zoneSprinkler,
                            zones: [zone.name],
                        });
                    }
                }

                const branchPipe = zonePipes.branch || results.autoSelectedBranchPipe;
                if (branchPipe) {
                    const pipeKey = `branch_${branchPipe.id}`;
                    const zoneTreeRatio = zone.plantCount / totalTreesInAllZones;
                    const rolls = Math.max(
                        1,
                        Math.ceil((results.branchPipeRolls || 1) * zoneTreeRatio)
                    );

                    if (equipmentMap.has(pipeKey)) {
                        const existing = equipmentMap.get(pipeKey);
                        existing.quantity += rolls;
                        existing.zones.push(zone.name);
                    } else {
                        equipmentMap.set(pipeKey, {
                            id: pipeKey,
                            seq: seq++,
                            image: branchPipe.image_url || branchPipe.image || '',
                            date: '',
                            description: `${branchPipe.productCode || branchPipe.product_code || ''} - ท่อย่อย ${branchPipe.pipeType || ''} ${branchPipe.sizeMM || ''}mm ยาว ${branchPipe.lengthM || ''} ม./ม้วน`,
                            quantity: rolls,
                            unitPrice: branchPipe.price || 0,
                            discount: 30.0,
                            taxes: 'Output\nVAT\n7%',
                            originalData: branchPipe,
                            zones: [zone.name],
                        });
                    }
                }

                const secondaryPipe = zonePipes.secondary || results.autoSelectedSecondaryPipe;
                if (secondaryPipe && results.hasValidSecondaryPipe) {
                    const pipeKey = `secondary_${secondaryPipe.id}`;
                    const zoneTreeRatio = zone.plantCount / totalTreesInAllZones;
                    const rolls = Math.max(
                        1,
                        Math.ceil((results.secondaryPipeRolls || 1) * zoneTreeRatio)
                    );

                    if (equipmentMap.has(pipeKey)) {
                        const existing = equipmentMap.get(pipeKey);
                        existing.quantity += rolls;
                        existing.zones.push(zone.name);
                    } else {
                        equipmentMap.set(pipeKey, {
                            id: pipeKey,
                            seq: seq++,
                            image: secondaryPipe.image_url || secondaryPipe.image || '',
                            date: '',
                            description: `${secondaryPipe.productCode || secondaryPipe.product_code || ''} - ท่อรอง ${secondaryPipe.pipeType || ''} ${secondaryPipe.sizeMM || ''}mm ยาว ${secondaryPipe.lengthM || ''} ม./ม้วน`,
                            quantity: rolls,
                            unitPrice: secondaryPipe.price || 0,
                            discount: 30.0,
                            taxes: 'Output\nVAT\n7%',
                            originalData: secondaryPipe,
                            zones: [zone.name],
                        });
                    }
                }

                const mainPipe = zonePipes.main || results.autoSelectedMainPipe;
                if (mainPipe && results.hasValidMainPipe) {
                    const pipeKey = `main_${mainPipe.id}`;
                    const zoneTreeRatio = zone.plantCount / totalTreesInAllZones;
                    const rolls = Math.max(
                        1,
                        Math.ceil((results.mainPipeRolls || 1) * zoneTreeRatio)
                    );

                    if (equipmentMap.has(pipeKey)) {
                        const existing = equipmentMap.get(pipeKey);
                        existing.quantity += rolls;
                        existing.zones.push(zone.name);
                    } else {
                        equipmentMap.set(pipeKey, {
                            id: pipeKey,
                            seq: seq++,
                            image: mainPipe.image_url || mainPipe.image || '',
                            date: '',
                            description: `${mainPipe.productCode || mainPipe.product_code || ''} - ท่อหลัก ${mainPipe.pipeType || ''} ${mainPipe.sizeMM || ''}mm ยาว ${mainPipe.lengthM || ''} ม./ม้วน`,
                            quantity: rolls,
                            unitPrice: mainPipe.price || 0,
                            discount: 30.0,
                            taxes: 'Output\nVAT\n7%',
                            originalData: mainPipe,
                            zones: [zone.name],
                        });
                    }
                }
            });

            for (const [key, item] of equipmentMap.entries()) {
                if (item.zones && item.zones.length > 1) {
                    item.description += ` (ใช้ในโซน: ${item.zones.join(', ')})`;
                } else if (item.zones && item.zones.length === 1) {
                    item.description += ` (ใช้ในโซน: ${item.zones[0]})`;
                }
                delete item.zones;
                initialItems.push(item);
            }
        } else {
            if (selectedSprinkler && results) {
                initialItems.push({
                    id: 'sprinkler',
                    seq: seq++,
                    image: selectedSprinkler.image_url || selectedSprinkler.image || '',
                    date: '',
                    description: `${selectedSprinkler.productCode || selectedSprinkler.product_code || ''} - ${selectedSprinkler.name || 'สปริงเกอร์'} (${selectedSprinkler.brand || ''})`,
                    quantity: results.totalSprinklers || 0,
                    unitPrice: selectedSprinkler.price || 0,
                    discount: 30.0,
                    taxes: 'Output\nVAT\n7%',
                    originalData: selectedSprinkler,
                });
            }

            if (selectedBranchPipe && results) {
                initialItems.push({
                    id: 'branchPipe',
                    seq: seq++,
                    image: selectedBranchPipe.image_url || selectedBranchPipe.image || '',
                    date: '',
                    description: `${selectedBranchPipe.productCode || selectedBranchPipe.product_code || ''} - ท่อย่อย ${selectedBranchPipe.pipeType || ''} ${selectedBranchPipe.sizeMM || ''}mm ยาว ${selectedBranchPipe.lengthM || ''} ม./ม้วน`,
                    quantity: results.branchPipeRolls || 0,
                    unitPrice: selectedBranchPipe.price || 0,
                    discount: 30.0,
                    taxes: 'Output\nVAT\n7%',
                    originalData: selectedBranchPipe,
                });
            }

            if (selectedSecondaryPipe && results) {
                initialItems.push({
                    id: 'secondaryPipe',
                    seq: seq++,
                    image: selectedSecondaryPipe.image_url || selectedSecondaryPipe.image || '',
                    date: '',
                    description: `${selectedSecondaryPipe.productCode || selectedSecondaryPipe.product_code || ''} - ท่อรอง ${selectedSecondaryPipe.pipeType || ''} ${selectedSecondaryPipe.sizeMM || ''}mm ยาว ${selectedSecondaryPipe.lengthM || ''} ม./ม้วน`,
                    quantity: results.secondaryPipeRolls || 0,
                    unitPrice: selectedSecondaryPipe.price || 0,
                    discount: 30.0,
                    taxes: 'Output\nVAT\n7%',
                    originalData: selectedSecondaryPipe,
                });
            }

            if (selectedMainPipe && results) {
                initialItems.push({
                    id: 'mainPipe',
                    seq: seq++,
                    image: selectedMainPipe.image_url || selectedMainPipe.image || '',
                    date: '',
                    description: `${selectedMainPipe.productCode || selectedMainPipe.product_code || ''} - ท่อหลัก ${selectedMainPipe.pipeType || ''} ${selectedMainPipe.sizeMM || ''}mm ยาว ${selectedMainPipe.lengthM || ''} ม./ม้วน`,
                    quantity: results.mainPipeRolls || 0,
                    unitPrice: selectedMainPipe.price || 0,
                    discount: 30.0,
                    taxes: 'Output\nVAT\n7%',
                    originalData: selectedMainPipe,
                });
            }
        }

        if (selectedPump && results) {
            const pumpDescription = `${selectedPump.productCode || selectedPump.product_code || ''} - ${selectedPump.name || ''} ${selectedPump.powerHP || ''}HP ${selectedPump.phase || ''}เฟส (${selectedPump.brand || ''})`;

            initialItems.push({
                id: 'pump',
                seq: seq++,
                image: selectedPump.image_url || selectedPump.image || '',
                date: '',
                description: pumpDescription,
                quantity: 1,
                unitPrice: selectedPump.price || 0,
                discount: 30.0,
                taxes: 'Output\nVAT\n7%',
                originalData: selectedPump,
            });

            const accessories = selectedPump.pumpAccessories || selectedPump.pumpAccessory || [];

            if (accessories && accessories.length > 0) {
                accessories
                    .sort(
                        (a: { sort_order: any }, b: { sort_order: any }) =>
                            (a.sort_order || 0) - (b.sort_order || 0)
                    )
                    .forEach(
                        (accessory: {
                            id: any;
                            name: any;
                            size: any;
                            is_included: any;
                            price: any;
                            image_url: any;
                            image: any;
                            accessory_type: any;
                        }) => {
                            if (
                                !accessory.is_included ||
                                (accessory.price && accessory.price > 0)
                            ) {
                                const accessoryTypeMap: { [key: string]: string } = {
                                    foot_valve: 'Foot Valve',
                                    check_valve: 'Check Valve',
                                    ball_valve: 'Ball Valve',
                                    pressure_gauge: 'เกจวัดแรงดัน',
                                    other: 'อุปกรณ์เสริม',
                                };

                                const typeName =
                                    accessoryTypeMap[accessory.accessory_type] ||
                                    accessory.accessory_type ||
                                    '';

                                initialItems.push({
                                    id: `pump_accessory_${accessory.id || seq}`,
                                    seq: seq++,
                                    image: accessory.image_url || accessory.image || '',
                                    date: '',
                                    description: `${accessory.name}${accessory.size ? ` ขนาด ${accessory.size}` : ''} - ${typeName}${accessory.is_included ? ' (รวมในชุด)' : ' (แยกขาย)'}`,
                                    quantity: 1,
                                    unitPrice: accessory.is_included ? 0 : accessory.price || 0,
                                    discount: accessory.is_included ? 0 : 30.0,
                                    taxes: 'Output\nVAT\n7%',
                                    originalData: accessory,
                                });
                            }
                        }
                    );
            }
        }

        if (selectedExtraPipe && selectedExtraPipe.pipe) {
            initialItems.push({
                id: 'extraPipe',
                seq: seq++,
                image: selectedExtraPipe.pipe.image_url || selectedExtraPipe.pipe.image || '',
                date: '',
                description: `${selectedExtraPipe.pipe.productCode || selectedExtraPipe.pipe.product_code || ''} - ท่อเสริม (Riser/แขนง) ${selectedExtraPipe.pipe.sizeMM || ''}mm ยาว ${selectedExtraPipe.pipe.lengthM || ''} ม./ม้วน`,
                quantity: Math.ceil(
                    selectedExtraPipe.totalLength / (selectedExtraPipe.pipe.lengthM || 1)
                ),
                unitPrice: selectedExtraPipe.pipe.price || 0,
                discount: 30.0,
                taxes: 'Output\nVAT\n7%',
                originalData: selectedExtraPipe.pipe,
            });
        }

        setItems(initialItems);
        setCurrentPage(hasProjectImagePage ? 1 : 1);
    }, [
        show,
        selectedSprinkler,
        selectedPump,
        selectedBranchPipe,
        selectedSecondaryPipe,
        selectedMainPipe,
        results,
        zoneSprinklers,
        selectedPipes,
        projectData,
        selectedExtraPipe,
    ]);

    const calculateItemAmount = (item: QuotationItem) => {
        return item.unitPrice * item.quantity - item.unitPrice * (item.discount / 100);
    };

    const calculateTotal = () => {
        return items.reduce((total, item) => total + calculateItemAmount(item), 0);
    };

    const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
        setItems((prevItems) =>
            prevItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
        );
    };

    const addNewItem = () => {
        const newItem: QuotationItem = {
            id: `item_${Date.now()}`,
            seq: items.length + 1,
            image: '',
            date: '',
            description: 'รายการใหม่',
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            taxes: 'Output\nVAT\n7%',
        };
        setItems([...items, newItem]);
    };

    const removeItem = (id: string) => {
        setItems((prevItems) => {
            const filteredItems = prevItems.filter((item) => item.id !== id);
            return filteredItems.map((item, index) => ({ ...item, seq: index + 1 }));
        });
    };

    const getItemsForPage = (page: number) => {
        const imagePageOffset = hasProjectImagePage ? 1 : 0;

        if (hasProjectImagePage && page === 1) {
            return [];
        }

        const effectivePage = page - imagePageOffset;
        const itemsPerPage = getItemsPerPage(page, totalPages, items.length);

        if (effectivePage === 1) {
            return items.slice(0, itemsPerPage);
        } else {
            const startIndex = 10 + (effectivePage - 2) * 14;
            const endIndex = startIndex + itemsPerPage;
            return items.slice(startIndex, endIndex);
        }
    };

    const renderTotalTable = (grandTotal: number, isForPrint: boolean = false) => {
        const tableClasses = isForPrint
            ? 'w-[250px] border-collapse border-gray-400 text-sm'
            : 'w-[250px] border-collapse border-gray-400 text-sm';

        const cellClasses = isForPrint
            ? 'border border-x-0 border-gray-400 p-1 text-left align-top font-bold'
            : 'border border-x-0 border-gray-400 p-1 text-left align-top font-bold';

        const valueCellClasses = isForPrint
            ? 'w-[100px] border border-x-0 border-gray-400 p-1 text-right align-top'
            : 'w-[100px] border border-x-0 border-gray-400 p-1 text-right align-top';

        return `
            <table class="${tableClasses}">
                <tbody>
                    <tr class="border-gray-400">
                        <td class="${cellClasses}">Subtotal</td>
                        <td class="${valueCellClasses}">${grandTotal.toFixed(2)} ฿</td>
                    </tr>
                    <tr class="border-gray-400">
                        <td class="${cellClasses}">Vat 7%</td>
                        <td class="${valueCellClasses}">${(grandTotal * 0.07).toFixed(2)} ฿</td>
                    </tr>
                    <tr class="border-gray-400">
                        <td class="${cellClasses}">Subtotal Without Discount</td>
                        <td class="${valueCellClasses}">${(grandTotal * 1.07).toFixed(2)} ฿</td>
                    </tr>
                    <tr class="border-gray-400">
                        <td class="${cellClasses}">Discount Subtotal</td>
                        <td class="${valueCellClasses}">0.00 ฿</td>
                    </tr>
                    <tr class="border-gray-400">
                        <td class="${cellClasses}">Total</td>
                        <td class="${valueCellClasses}">${(grandTotal * 1.07).toFixed(2)} ฿</td>
                    </tr>
                </tbody>
            </table>
        `;
    };

    const EquipmentSelector = React.memo(() => {
        const [localSearchTerm, setLocalSearchTerm] = useState(equipmentSearchTerm);
        const [localSelectedCategory, setLocalSelectedCategory] = useState(selectedCategory);

        useEffect(() => {
            const timeoutId = setTimeout(() => {
                setEquipmentSearchTerm(localSearchTerm);
            }, 300);
            return () => clearTimeout(timeoutId);
        }, [localSearchTerm]);

        useEffect(() => {
            setSelectedCategory(localSelectedCategory);
        }, [localSelectedCategory]);

        useEffect(() => {
            if (localSelectedCategory !== selectedCategory) {
                setLocalSearchTerm('');
                setEquipmentSearchTerm('');
            }
        }, [localSelectedCategory, selectedCategory]);

        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
                <div className="max-h-[80vh] w-[800px] overflow-auto rounded-lg bg-white p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800">
                            เลือกอุปกรณ์จากฐานข้อมูล
                        </h3>
                        <button
                            onClick={() => {
                                setShowEquipmentSelector(false);
                                setLocalSearchTerm('');
                                setLocalSelectedCategory('');
                            }}
                            className="px-2 py-1 text-xl text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            เลือกประเภทอุปกรณ์
                        </label>
                        <select
                            value={localSelectedCategory}
                            onChange={(e) => setLocalSelectedCategory(e.target.value)}
                            className="w-full rounded border border-gray-300 p-2 text-gray-800 focus:border-blue-500 focus:outline-none"
                        >
                            <option value="">-- เลือกประเภท --</option>
                            {equipmentCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.display_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {localSelectedCategory && (
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                ค้นหาอุปกรณ์
                            </label>
                            <input
                                key={`search-${localSelectedCategory}`}
                                type="text"
                                value={localSearchTerm}
                                onChange={(e) => setLocalSearchTerm(e.target.value)}
                                placeholder="ชื่อ, รุ่น, แบรนด์..."
                                className="w-full rounded border border-gray-300 bg-white p-2 text-gray-800 focus:border-blue-500 focus:outline-none"
                                autoComplete="off"
                            />
                        </div>
                    )}

                    {isLoadingEquipment ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-gray-500">กำลังโหลด...</div>
                        </div>
                    ) : (
                        <div className="max-h-[400px] overflow-auto">
                            {equipmentList.length === 0 && localSelectedCategory ? (
                                <div className="py-8 text-center text-gray-500">ไม่พบอุปกรณ์</div>
                            ) : (
                                <div className="space-y-2">
                                    {equipmentList.map((equipment) => (
                                        <div
                                            key={equipment.id}
                                            className="flex items-center justify-between rounded border border-gray-200 p-3 hover:bg-gray-50"
                                        >
                                            <div className="flex items-center space-x-3">
                                                {equipment.image ? (
                                                    <img
                                                        src={equipment.image}
                                                        alt={equipment.name}
                                                        className="h-10 w-10 rounded object-cover"
                                                        onError={(e) => {
                                                            (
                                                                e.target as HTMLImageElement
                                                            ).style.display = 'none';
                                                            const fallback = (
                                                                e.target as HTMLElement
                                                            ).nextElementSibling as HTMLElement;
                                                            if (fallback)
                                                                fallback.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div
                                                    className="flex h-10 w-10 items-center justify-center rounded bg-gray-200 text-xs text-gray-500"
                                                    style={{
                                                        display: equipment.image ? 'none' : 'flex',
                                                    }}
                                                >
                                                    📦
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-800">
                                                        {equipment.productCode}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        {equipment.name}
                                                        {equipment.brand && ` (${equipment.brand})`}
                                                    </div>
                                                    <div className="text-sm font-medium text-blue-600">
                                                        {equipment.price.toLocaleString()} บาท
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    addEquipmentFromDatabase(equipment);
                                                    setLocalSearchTerm('');
                                                    setLocalSelectedCategory('');
                                                }}
                                                className="rounded bg-blue-500 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-600"
                                            >
                                                เพิ่ม
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    });

    const handlePrint = () => {
        const currentItems = items;
        const currentTotalPages = calculateTotalPages(currentItems.length);

        const printContainer = document.createElement('div');
        printContainer.className = 'print-document-container';
        printContainer.style.display = 'none';

        let allPagesHTML = '';
        for (let page = 1; page <= currentTotalPages; page++) {
            const imagePageOffset = hasProjectImagePage ? 1 : 0;

            if (hasProjectImagePage && page === 1) {
                const imagePageHTML = `
                    <div class="mx-auto flex h-[1123px] w-[794px] flex-col bg-white p-8 text-black shadow-lg" style="page-break-after: always;">
                        <div class="print-page flex min-h-full flex-col">
                            ${renderHeader()}
                            
                            <div class="flex flex-col items-center justify-center">
                                <h1 class="text-2xl font-bold mb-8 text-center">แผนผังโครงการระบบชลประทาน</h1>
                                <div class="flex items-center justify-center w-full max-h-[800px]">
                                    <img
                                        src="${editableProjectImage}"
                                        alt="Project Layout"
                                        class="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                                    />
                                </div>
                            </div>
                            
                            ${renderFooter(page)}
                        </div>
                    </div>
                `;
                allPagesHTML += imagePageHTML;
                continue;
            }

            let pageItems;
            const itemsPerPage = getItemsPerPage(page, currentTotalPages, currentItems.length);

            if (page === 1 + imagePageOffset) {
                pageItems = currentItems.slice(0, itemsPerPage);
            } else {
                const startIndex = 10 + (page - 2 - imagePageOffset) * 14;
                const endIndex = startIndex + itemsPerPage;
                pageItems = currentItems.slice(startIndex, endIndex);
            }

            const headerHTML = renderHeader();

            const customerInfoHTML =
                page === 1 + imagePageOffset
                    ? `
                <div class="print-customer-info mb-6 self-end text-left text-sm">
                    <p class="font-semibold">[1234] ${quotationDataCustomer.name || '-'}</p>
                    <p>${quotationDataCustomer.projectName || '-'}</p>
                    <p>${quotationDataCustomer.address || '-'}</p>
                    <p>${quotationDataCustomer.phone || '-'}</p>
                </div>
            `
                    : '';

            const quotationDetailsHTML =
                page === 1 + imagePageOffset
                    ? `
                <h1 class="print-title mb-4 text-xl font-bold">Quotation # QT1234567890</h1>
                <div class="print-details mb-4 flex flex-row gap-9 text-left text-sm">
                    <div>
                        <strong>Your Reference:</strong>
                        <p>${quotationData.yourReference || '-'}</p>
                    </div>
                    <div>
                        <strong>Quotation Date:</strong>
                        <p>${quotationData.quotationDate || '-'}</p>
                    </div>
                    <div>
                        <strong>Salesperson:</strong>
                        <p>${quotationData.salesperson || '-'}</p>
                    </div>
                    <div>
                        <strong>Payment Terms:</strong>
                        <p>${quotationData.paymentTerms || '-'}</p>
                    </div>
                </div>
            `
                    : '';

            const tableHeaderHTML = `
                <thead>
                    <tr class="bg-gray-100">
                        <th class="border border-gray-400 p-2 text-center" colspan="5">
                            Commitment
                        </th>
                        <th class="border border-gray-400 p-2 text-center" colspan="5">
                            Disc. Fixed
                        </th>
                    </tr>
                    <tr class="bg-gray-100">
                        <th class="w-[50px] border border-gray-400 p-1 text-center">Seq</th>
                        <th class="w-[60px] border border-gray-400 p-1 text-center">Image</th>
                        <th class="w-[80px] border border-gray-400 p-1 text-center">Date</th>
                        <th class="w-[250px] border border-gray-400 p-1 text-center">Description</th>
                        <th class="w-[80px] border border-gray-400 p-1 text-center">Quantity</th>
                        <th class="w-[80px] border border-gray-400 p-1 text-center">Unit Price</th>
                        <th class="w-[80px] border border-gray-400 p-1 text-center">Disc.(%)</th>
                        <th class="w-[80px] border border-gray-400 p-1 text-center">Amount</th>
                        <th class="w-[80px] border border-gray-400 p-1 text-center">Taxes</th>
                        <th class="w-[80px] border border-gray-400 p-1 text-center">Amount</th>
                    </tr>
                </thead>
            `;

            const tableRows = pageItems
                .map((item) => {
                    const itemAmount = calculateItemAmount(item);
                    const imageUrl = getImageUrl(item);
                    const imageHTML = imageUrl
                        ? `<img src="${imageUrl}" alt="item image" class="w-10 h-10 mx-auto object-cover" />`
                        : '';

                    return `
                    <tr>
                        <td class="border border-gray-400 p-1 text-center align-top">${item.seq}</td>
                        <td class="border border-gray-400 p-1 text-center align-top">${imageHTML}</td>
                        <td class="border border-gray-400 p-1 text-center align-top">${item.date}</td>
                        <td class="border border-gray-400 p-1 text-left align-top">${item.description}</td>
                        <td class="border border-gray-400 p-1 text-right align-top">
                            ${item.quantity.toFixed(4)}<br />Unit
                        </td>
                        <td class="border border-gray-400 p-1 text-right align-top">${item.unitPrice.toFixed(4)}</td>
                        <td class="border border-gray-400 p-1 text-right align-top">${item.discount.toFixed(3)}</td>
                        <td class="border border-gray-400 p-1 text-right align-top">${(item.unitPrice * (item.discount / 100)).toFixed(2)}</td>
                        <td class="border border-gray-400 p-1 text-right align-top">${item.taxes.replace(/\n/g, '<br />')}</td>
                        <td class="border border-gray-400 p-1 text-right align-top">${itemAmount.toFixed(2)} ฿</td>
                    </tr>
                `;
                })
                .join('');

            const tableHTML = `
                <table class="print-table w-full border-collapse border border-gray-400 text-xs">
                    ${tableHeaderHTML}
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            `;

            const grandTotal = calculateTotal();
            const totalHTML =
                page === currentTotalPages
                    ? `
                <div class="mt-4 flex justify-end">
                    ${renderTotalTable(grandTotal, true)}
                </div>
            `
                    : '';

            const footerHTML = renderFooter(page);

            const pageBreak = page < currentTotalPages ? 'page-break-after: always;' : '';
            allPagesHTML += `
                <div class="mx-auto flex h-[1123px] w-[794px] flex-col bg-white p-8 text-black shadow-lg" style="${pageBreak}">
                    <div class="print-page flex min-h-full flex-col">
                        ${headerHTML}
                        ${customerInfoHTML}
                        ${quotationDetailsHTML}
                        ${tableHTML}
                        ${totalHTML}
                        ${footerHTML}
                    </div>
                </div>
            `;
        }

        printContainer.innerHTML = allPagesHTML;
        document.body.appendChild(printContainer);

        setTimeout(() => {
            printContainer.style.display = 'block';
            window.print();

            setTimeout(() => {
                if (document.body.contains(printContainer)) {
                    document.body.removeChild(printContainer);
                }
            }, 2000);
        }, 100);
    };

    const renderHeader = () =>
        `<div class="print-header mb-2 flex items-center justify-between">
            <div class="flex items-center">
                <img
                    src="https://f.btwcdn.com/store-50036/store/e4c1b5ae-cf8e-5017-536b-66ecd994018d.jpg"
                    alt="logo"
                    class="print-logo h-10 w-10"
                />
            </div>
        </div>
        <hr class="print-hr mb-4 border-gray-800" />
        <div class="print-company-info mb-4 self-start text-sm">
            <p class="font-semibold">บจก. กนกโปรดักส์ (สำนักงานใหญ่)</p>
            <p>15 ซ. พระยามนธาตุ แยก 10</p>
            <p>แขวงคลองบางบอน เขตบางบอน</p>
            <p>กรุงเทพมหานคร 10150</p>
        </div>`;

    const renderFooter = (page: number) =>
        `<div class="print-footer-container mt-auto text-center text-xs">
            <hr class="print-footer-hr mb-2 border-gray-800" />
            <div class="print-footer">
                <p>Phone: 02-451-1111 Tax ID: 0105549044446</p>
                <p>Page: ${page} / ${totalPages}</p>
            </div>
        </div>`;

    const renderCustomerInfo = () => (
        <div className="print-customer-info mb-6 self-end text-left text-sm">
            <p className="font-semibold">[1234] {quotationDataCustomer.name || '-'}</p>
            <p>{quotationDataCustomer.projectName || '-'}</p>
            <p>{quotationDataCustomer.address || '-'}</p>
            <p>{quotationDataCustomer.phone || '-'}</p>
        </div>
    );

    const renderQuotationDetails = () => (
        <>
            <h1 className="print-title mb-4 text-xl font-bold">Quotation # QT1234567890</h1>
            <div className="print-details mb-4 flex flex-row gap-9 text-left text-sm">
                <div>
                    <strong>Your Reference:</strong>
                    <p>{quotationData.yourReference || '-'}</p>
                </div>
                <div>
                    <strong>Quotation Date:</strong>
                    <p>{quotationData.quotationDate || '-'}</p>
                </div>
                <div>
                    <strong>Salesperson:</strong>
                    <p>{quotationData.salesperson || '-'}</p>
                </div>
                <div>
                    <strong>Payment Terms:</strong>
                    <p>{quotationData.paymentTerms || '-'}</p>
                </div>
            </div>
        </>
    );

    const renderTableHeader = () => (
        <thead>
            <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-center" colSpan={5}>
                    Commitment
                </th>
                <th className="border border-gray-400 p-2 text-center" colSpan={5}>
                    Disc. Fixed
                </th>
            </tr>
            <tr className="bg-gray-100">
                <th className="w-[50px] border border-gray-400 p-1 text-center">Seq</th>
                <th className="w-[60px] border border-gray-400 p-1 text-center">Image</th>
                <th className="w-[80px] border border-gray-400 p-1 text-center">Date</th>
                <th className="w-[250px] border border-gray-400 p-1 text-center">Description</th>
                <th className="w-[80px] border border-gray-400 p-1 text-center">Quantity</th>
                <th className="w-[80px] border border-gray-400 p-1 text-center">Unit Price</th>
                <th className="w-[80px] border border-gray-400 p-1 text-center">Disc.(%)</th>
                <th className="w-[80px] border border-gray-400 p-1 text-center">Amount</th>
                <th className="w-[80px] border border-gray-400 p-1 text-center">Taxes</th>
                <th className="w-[80px] border border-gray-400 p-1 text-center">Amount</th>
                {isEditing && (
                    <th className="no-print w-[120px] border border-gray-400 p-1 text-center">
                        Actions
                    </th>
                )}
            </tr>
        </thead>
    );

    const renderTableRow = (item: QuotationItem, index: number) => {
        const imageUrl = getImageUrl(item);
        const currentPageItems = getItemsForPage(currentPage);
        const currentIndex = currentPageItems.findIndex((i) => i.id === item.id);
        const imagePageOffset = hasProjectImagePage ? 1 : 0;
        const effectivePage = currentPage - imagePageOffset;
        const absoluteIndex =
            effectivePage === 1 ? currentIndex : 10 + (effectivePage - 2) * 14 + currentIndex;

        return (
            <tr key={item.id}>
                <td className="border border-gray-400 p-1 text-center align-top">{item.seq}</td>
                <td className="border border-gray-400 p-1 text-center align-top">
                    {isEditing ? (
                        <div
                            className="group relative mx-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded border-2 border-dashed border-gray-300 hover:border-blue-400"
                            onClick={() => openFileDialog(item.id)}
                            title="คลิกเพื่อเพิ่มรูปภาพ"
                        >
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt="item image"
                                    className="h-full w-full rounded object-cover"
                                />
                            ) : (
                                <span className="text-xs text-gray-400 group-hover:text-blue-400">
                                    📷
                                </span>
                            )}
                            <div className="absolute inset-0 rounded bg-black bg-opacity-0 transition-all duration-200 group-hover:bg-opacity-20"></div>
                        </div>
                    ) : imageUrl ? (
                        <img
                            src={imageUrl}
                            alt="item image"
                            className="mx-auto h-10 w-10 object-cover"
                        />
                    ) : (
                        ''
                    )}
                </td>
                <td className="border border-gray-400 p-1 text-center align-top">
                    {isEditing ? (
                        <input
                            type="date"
                            value={item.date}
                            onChange={(e) => updateItem(item.id, 'date', e.target.value)}
                            className="w-full border-none bg-transparent text-center text-xs"
                        />
                    ) : (
                        item.date
                    )}
                </td>
                <td className="border border-gray-400 p-1 text-left align-top">
                    {isEditing ? (
                        <textarea
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            className="h-12 w-full resize-none border-none bg-transparent text-xs"
                            rows={2}
                        />
                    ) : (
                        item.description
                    )}
                </td>
                <td className="border border-gray-400 p-1 text-right align-top">
                    {isEditing ? (
                        <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                                updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                            }
                            className="w-full border-none bg-transparent text-right text-xs"
                            step="0.0001"
                        />
                    ) : (
                        `${item.quantity.toFixed(4)}`
                    )}
                    <br />
                    Unit
                </td>
                <td className="border border-gray-400 p-1 text-right align-top">
                    {isEditing ? (
                        <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                                updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-full border-none bg-transparent text-right text-xs"
                            step="0.001"
                        />
                    ) : (
                        item.unitPrice.toFixed(4)
                    )}
                </td>
                <td className="border border-gray-400 p-1 text-right align-top">
                    {isEditing ? (
                        <input
                            type="number"
                            value={item.discount}
                            onChange={(e) =>
                                updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)
                            }
                            className="w-full border-none bg-transparent text-right text-xs"
                            step="0.001"
                            max="100"
                            min="0"
                        />
                    ) : (
                        item.discount.toFixed(3)
                    )}
                </td>
                <td className="border border-gray-400 p-1 text-right align-top">
                    {(item.unitPrice * (item.discount / 100)).toFixed(2)}
                </td>
                <td className="border border-gray-400 p-1 text-right align-top">
                    {item.taxes.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                            {line}
                            {i < item.taxes.split('\n').length - 1 && <br />}
                        </React.Fragment>
                    ))}
                </td>
                <td className="border border-gray-400 p-1 text-right align-top">
                    {calculateItemAmount(item).toFixed(2)} ฿
                </td>
                {isEditing && (
                    <td className="no-print border border-gray-400 p-1 text-center align-top">
                        <div className="flex flex-col space-y-1">
                            <div className="flex space-x-1">
                                <button
                                    onClick={() => moveItem(absoluteIndex, 'up')}
                                    disabled={absoluteIndex === 0}
                                    className="rounded px-1 py-0.5 text-xs text-blue-500 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="ขึ้น"
                                >
                                    ↑
                                </button>
                                <button
                                    onClick={() => moveItem(absoluteIndex, 'down')}
                                    disabled={absoluteIndex === items.length - 1}
                                    className="rounded px-1 py-0.5 text-xs text-blue-500 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="ลง"
                                >
                                    ↓
                                </button>
                            </div>
                            <button
                                onClick={() => removeItem(item.id)}
                                className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                            >
                                ลบ
                            </button>
                        </div>
                    </td>
                )}
            </tr>
        );
    };

    const renderProjectImagePage = () => (
        <div className="mx-auto flex h-[1123px] w-[794px] flex-col bg-white p-8 text-black shadow-lg">
            <div className="print-page flex min-h-full flex-col">
                <div className="print-header mb-2 flex items-center justify-between">
                    <div className="flex items-center">
                        <img
                            src="https://f.btwcdn.com/store-50036/store/e4c1b5ae-cf8e-5017-536b-66ecd994018d.jpg"
                            alt="logo"
                            className="print-logo h-10 w-10"
                        />
                    </div>
                </div>
                <hr className="print-hr mb-4 border-gray-800" />
                <div className="print-company-info mb-4 self-start text-sm">
                    <p className="font-semibold">บจก. กนกโปรดักส์ (สำนักงานใหญ่)</p>
                    <p>15 ซ. พระยามนธาตุ แยก 10</p>
                    <p>แขวงคลองบางบอน เขตบางบอน</p>
                    <p>กรุงเทพมหานคร 10150</p>
                </div>

                <div className="flex flex-col items-center justify-center">
                    <h1 className="mb-8 text-center text-2xl font-bold">
                        แผนผังโครงการระบบชลประทาน
                    </h1>
                    <div className="relative flex max-h-[800px] w-full items-center justify-center">
                        {isEditing ? (
                            <div className="group relative">
                                {editableProjectImage ? (
                                    <img
                                        src={editableProjectImage}
                                        alt="Project Layout"
                                        className="max-h-full max-w-full cursor-pointer rounded-lg object-contain shadow-lg"
                                        onClick={openProjectImageDialog}
                                        title="คลิกเพื่อเปลี่ยนรูปภาพ"
                                    />
                                ) : (
                                    <div
                                        className="flex h-[400px] w-[600px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400"
                                        onClick={openProjectImageDialog}
                                        title="คลิกเพื่อเพิ่มรูปภาพ"
                                    >
                                        <div className="text-center">
                                            <div className="mb-4 text-6xl text-gray-400">📷</div>
                                            <p className="text-gray-500">คลิกเพื่อเพิ่มรูปแผนผัง</p>
                                        </div>
                                    </div>
                                )}
                                {editableProjectImage && (
                                    <div className="absolute right-2 top-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openProjectImageDialog();
                                            }}
                                            className="rounded-full bg-blue-500 p-2 text-white shadow-lg hover:bg-blue-600"
                                            title="เปลี่ยนรูปภาพ"
                                        >
                                            📷
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleProjectImageDelete();
                                            }}
                                            className="rounded-full bg-red-500 p-2 text-white shadow-lg hover:bg-red-600"
                                            title="ลบรูปภาพ"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : editableProjectImage ? (
                            <img
                                src={editableProjectImage}
                                alt="Project Layout"
                                className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
                            />
                        ) : (
                            <div className="flex h-[400px] w-[600px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                                <div className="text-center">
                                    <div className="mb-4 text-6xl text-gray-400">📷</div>
                                    <p className="text-gray-500">ไม่มีรูปแผนผัง</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="print-footer-container mt-auto text-center text-xs">
                    <hr className="print-footer-hr mb-2 border-gray-800" />
                    <div className="print-footer">
                        <p>Phone: 02-451-1111 Tax ID: 0105549044446</p>
                        <p>Page: 1 / {totalPages}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    if (!show) return null;

    const imagePageOffset = hasProjectImagePage ? 1 : 0;
    const isImagePage = hasProjectImagePage && currentPage === 1;
    const isEquipmentPage = !isImagePage;

    return (
        <div className="fixed inset-0 z-50 overflow-auto bg-gray-800">
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 0;
                        }
                        
                        * {
                            -webkit-print-color-adjust: exact !important;
                            color-adjust: exact !important;
                            box-sizing: border-box !important;
                        }
                        
                        body > *:not(.print-document-container) {
                            display: none !important;
                        }
                        
                        .print-document-container {
                            display: block !important;
                            position: static !important;
                            width: 100% !important;
                            height: auto !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif !important;
                        }
                        
                        .mx-auto { margin-left: auto !important; margin-right: auto !important; }
                        .flex { display: flex !important; }
                        .h-\\[1123px\\] { height: 1123px !important; }
                        .w-\\[794px\\] { width: 794px !important; }
                        .flex-col { flex-direction: column !important; }
                        .bg-white { background-color: white !important; }
                        .p-8 { padding: 2rem !important; }
                        .text-black { color: black !important; }
                        .shadow-lg { box-shadow: none !important; }
                        
                        .print-page { 
                            display: flex !important; 
                            min-height: 100% !important; 
                            flex-direction: column !important; 
                        }
                        
                        .mb-2 { margin-bottom: 0.5rem !important; }
                        .mb-4 { margin-bottom: 1rem !important; }
                        .mb-6 { margin-bottom: 1.5rem !important; }
                        .mb-8 { margin-bottom: 2rem !important; }
                        .mt-auto { margin-top: auto !important; }
                        .mt-4 { margin-top: 1rem !important; }
                        
                        .items-center { align-items: center !important; }
                        .justify-between { justify-content: space-between !important; }
                        .justify-center { justify-content: center !important; }
                        .justify-end { justify-content: flex-end !important; }
                        .self-start { align-self: flex-start !important; }
                        .self-end { align-self: flex-end !important; }
                        .flex-1 { flex: 1 !important; }
                        
                        .h-10 { height: 2.5rem !important; }
                        .w-10 { width: 2.5rem !important; }
                        .w-full { width: 100% !important; }
                        .max-w-full { max-width: 100% !important; }
                        .max-h-full { max-height: 100% !important; }
                        .max-h-\\[800px\\] { max-height: 800px !important; }
                        
                        .border-gray-800 { border-color: rgb(31, 41, 55) !important; }
                        .border-gray-400 { border-color: rgb(156, 163, 175) !important; }
                        .bg-gray-100 { background-color: rgb(243, 244, 246) !important; }
                        
                        .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
                        .text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
                        .text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
                        .text-2xl { font-size: 1.5rem !important; line-height: 2rem !important; }
                        .text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
                        
                        .font-semibold { font-weight: 600 !important; }
                        .font-bold { font-weight: 700 !important; }
                        
                        .text-left { text-align: left !important; }
                        .text-right { text-align: right !important; }
                        .text-center { text-align: center !important; }
                        
                        .flex-row { flex-direction: row !important; }
                        .gap-9 { gap: 2.25rem !important; }
                        
                        .border-collapse { border-collapse: collapse !important; }
                        .border { border-width: 1px !important; }
                        .border-x-0 { border-left-width: 0 !important; border-right-width: 0 !important; }
                        
                        .w-\\[50px\\] { width: 50px !important; }
                        .w-\\[60px\\] { width: 60px !important; }
                        .w-\\[80px\\] { width: 80px !important; }
                        .w-\\[100px\\] { width: 100px !important; }
                        .w-\\[120px\\] { width: 120px !important; }
                        .w-\\[200px\\] { width: 200px !important; }
                        .w-\\[250px\\] { width: 250px !important; }
                        .w-\\[600px\\] { width: 600px !important; }
                        .h-\\[400px\\] { height: 400px !important; }
                        .p-1 { padding: 0.25rem !important; }
                        .p-2 { padding: 0.5rem !important; }
                        .align-top { vertical-align: top !important; }
                        
                        .object-contain { object-fit: contain !important; }
                        .rounded-lg { border-radius: 0.5rem !important; }
                        
                        .no-print { display: none !important; }
                        
                        strong { font-weight: bold !important; }
                        
                        hr { 
                            border: none !important; 
                            border-top: 1px solid !important; 
                        }
                    }
                `,
                }}
            />

            <div className="mx-auto my-8 max-w-4xl p-4">
                <div className="no-print fixed bottom-4 left-4 rounded bg-gray-900 p-2 text-xs text-white">
                    <div>Items: {items.length}</div>
                    <div>Has image page: {hasProjectImagePage ? 'Yes' : 'No'}</div>
                    <div>
                        Page: {currentPage}/{totalPages}
                    </div>
                    <div>
                        Items on this page: {isImagePage ? 0 : getItemsForPage(currentPage).length}
                    </div>
                    <div>Editing: {isEditing ? 'Yes' : 'No'}</div>
                </div>

                {isEditing && (
                    <div className="no-print fixed left-1/2 top-16 z-50 max-w-md -translate-x-1/2 transform rounded border border-yellow-400 bg-yellow-100 px-4 py-3 text-yellow-700 shadow-lg">
                        <div className="flex">
                            <div className="py-1">
                                <svg
                                    className="mr-4 h-6 w-6 fill-current text-yellow-500"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-bold">หมายเหตุ:</p>
                                <p className="text-sm">
                                    รายการที่เพิ่มใหม่จะหายไปเมื่อรีเฟรชหน้า
                                    เนื่องจากข้อจำกัดของระบบ กรุณาพิมพ์หรือบันทึกก่อนออกจากหน้านี้
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="no-print fixed left-0 right-0 top-0 z-50 flex justify-between bg-gray-900 px-8 py-4">
                    <div className="flex space-x-2">
                        <button
                            onClick={onClose}
                            className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
                        >
                            ปิด
                        </button>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`rounded px-4 py-2 text-white ${
                                isEditing
                                    ? 'bg-green-500 hover:bg-green-600'
                                    : 'bg-yellow-500 hover:bg-yellow-600'
                            }`}
                        >
                            {isEditing ? 'เสร็จสิ้น' : 'แก้ไข'}
                        </button>
                        {isEditing && !isImagePage && (
                            <>
                                <button
                                    onClick={addNewItem}
                                    className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                                >
                                    เพิ่มรายการ
                                </button>
                                <button
                                    onClick={() => setShowEquipmentSelector(true)}
                                    className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
                                >
                                    เลือกจากฐานข้อมูล
                                </button>
                            </>
                        )}
                    </div>

                    <div className="flex items-center space-x-4">
                        {totalPages > 1 && (
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="rounded bg-gray-600 px-3 py-1 text-white disabled:opacity-50"
                                >
                                    ก่อนหน้า
                                </button>
                                <span className="text-white">
                                    หน้า {currentPage} / {totalPages}
                                    {isImagePage && ' (แผนผัง)'}
                                    {!isImagePage && hasProjectImagePage && ' (อุปกรณ์)'}
                                </span>
                                <button
                                    onClick={() =>
                                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                                    }
                                    disabled={currentPage === totalPages}
                                    className="rounded bg-gray-600 px-3 py-1 text-white disabled:opacity-50"
                                >
                                    ถัดไป
                                </button>
                            </div>
                        )}

                        {!isEditing && (
                            <button
                                onClick={handlePrint}
                                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                            >
                                พิมพ์
                            </button>
                        )}
                    </div>
                </div>

                {showEquipmentSelector && <EquipmentSelector />}

                {/* Render project image page or equipment page */}
                {isImagePage ? (
                    renderProjectImagePage()
                ) : (
                    <div className="mx-auto flex h-[1123px] w-[794px] flex-col bg-white p-8 text-black shadow-lg">
                        <div className="print-page flex min-h-full flex-col">
                            <div className="print-header mb-2 flex items-center justify-between">
                                <div className="flex items-center">
                                    <img
                                        src="https://f.btwcdn.com/store-50036/store/e4c1b5ae-cf8e-5017-536b-66ecd994018d.jpg"
                                        alt="logo"
                                        className="print-logo h-10 w-10"
                                    />
                                </div>
                            </div>
                            <hr className="print-hr mb-4 border-gray-800" />
                            <div className="print-company-info mb-4 self-start text-sm">
                                <p className="font-semibold">บจก. กนกโปรดักส์ (สำนักงานใหญ่)</p>
                                <p>15 ซ. พระยามนธาตุ แยก 10</p>
                                <p>แขวงคลองบางบอน เขตบางบอน</p>
                                <p>กรุงเทพมหานคร 10150</p>
                            </div>

                            {currentPage === 1 + imagePageOffset && (
                                <>
                                    {renderCustomerInfo()}
                                    {renderQuotationDetails()}
                                </>
                            )}

                            <table className="print-table w-full border-collapse border border-gray-400 text-xs">
                                {renderTableHeader()}
                                <tbody>
                                    {getItemsForPage(currentPage).map((item, index) =>
                                        renderTableRow(item, index)
                                    )}
                                </tbody>
                            </table>

                            <div className="mt-4 flex justify-end">
                                {currentPage === totalPages && (
                                    <table className="w-[250px] border-collapse border-gray-400 text-sm">
                                        <tbody>
                                            <tr className="border-gray-400">
                                                <td className="border border-x-0 border-gray-400 p-1 text-left align-top font-bold">
                                                    Subtotal
                                                </td>
                                                <td className="w-[100px] border border-x-0 border-gray-400 p-1 text-right align-top">
                                                    {calculateTotal().toFixed(2)} ฿
                                                </td>
                                            </tr>
                                            <tr className="border-gray-400">
                                                <td className="border border-x-0 border-gray-400 p-1 text-left align-top font-bold">
                                                    Vat 7%
                                                </td>
                                                <td className="w-[100px] border border-x-0 border-gray-400 p-1 text-right align-top">
                                                    {(calculateTotal() * 0.07).toFixed(2)} ฿
                                                </td>
                                            </tr>
                                            <tr className="border-gray-400">
                                                <td className="border border-x-0 border-gray-400 p-1 text-left align-top font-bold">
                                                    Subtotal Without Discount
                                                </td>
                                                <td className="w-[100px] border border-x-0 border-gray-400 p-1 text-right align-top">
                                                    {(calculateTotal() * 1.07).toFixed(2)} ฿
                                                </td>
                                            </tr>
                                            <tr className="border-gray-400">
                                                <td className="border border-x-0 border-gray-400 p-1 text-left align-top font-bold">
                                                    Discount Subtotal
                                                </td>
                                                <td className="w-[100px] border border-x-0 border-gray-400 p-1 text-right align-top">
                                                    0.00 ฿
                                                </td>
                                            </tr>
                                            <tr className="border-gray-400">
                                                <td className="border border-x-0 border-gray-400 p-1 text-left align-top font-bold">
                                                    Total
                                                </td>
                                                <td className="w-[100px] border border-x-0 border-gray-400 p-1 text-right align-top">
                                                    {(calculateTotal() * 1.07).toFixed(2)} ฿
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div className="print-footer-container mt-auto text-center text-xs">
                                <hr className="print-footer-hr mb-2 border-gray-800" />
                                <div className="print-footer">
                                    <p>Phone: 02-451-1111 Tax ID: 0105549044446</p>
                                    <p>
                                        Page: {currentPage} / {totalPages}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuotationDocument;
