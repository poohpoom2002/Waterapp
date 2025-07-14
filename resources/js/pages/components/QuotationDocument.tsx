// components/QuotationDocument.tsx - Enhanced with all fixes + Subtotal fixes
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
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    // หน้าแรก 10 รายการ, หน้าอื่นๆ 14 รายการ
    // แต่หน้าสุดท้ายต้องเหลือพื้นที่สำหรับ total table (ประมาณ 5 แถว)
    const getItemsPerPage = (page: number, totalPages: number, totalItems: number) => {
        if (page === 1) {
            // หน้าแรก: ถ้าเป็นหน้าเดียวและมี total ต้องเหลือพื้นที่
            if (totalPages === 1) {
                return Math.min(10, Math.max(0, totalItems)); // ไม่เกิน 10 รายการ
            }
            return 10;
        } else if (page === totalPages) {
            // หน้าสุดท้าย: เหลือพื้นที่สำหรับ total table (ลด 3 รายการ)
            return Math.min(11, 14); // เหลือพื้นที่สำหรับ total
        } else {
            return 14;
        }
    };

    // คำนวณจำนวนหน้าทั้งหมด - ปรับให้คิดถึง total table
    const calculateTotalPages = (totalItems: number) => {
        if (totalItems <= 7) return 1; // หน้าเดียว เหลือพื้นที่สำหรับ total

        let remainingItems = totalItems - 10; // หักหน้าแรก 10 รายการ
        let additionalPages = 0;

        while (remainingItems > 0) {
            if (remainingItems <= 11) {
                // หน้าสุดท้าย: สามารถใส่ได้สูงสุด 11 รายการ (เหลือพื้นที่สำหรับ total)
                additionalPages += 1;
                break;
            } else {
                // หน้ากลาง: ใส่ได้ 14 รายการ
                remainingItems -= 14;
                additionalPages += 1;
            }
        }

        return 1 + additionalPages;
    };

    const totalPages = calculateTotalPages(items.length);

    // Load equipment data when component mounts
    useEffect(() => {
        if (show) {
            loadEquipmentCategories();
        }
    }, [show]);

    // Load categories
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

    // Load equipment by category
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
                // Handle both paginated and non-paginated responses
                const equipments = data.data || data;
                setEquipmentList(equipments);
            }
        } catch (error) {
            console.error('Failed to load equipment:', error);
        } finally {
            setIsLoadingEquipment(false);
        }
    };

    // Load equipment when category or search term changes
    useEffect(() => {
        if (selectedCategory) {
            const timeoutId = setTimeout(() => {
                loadEquipmentByCategory(selectedCategory);
            }, 1000); // Debounce search

            return () => clearTimeout(timeoutId);
        }
    }, [selectedCategory, equipmentSearchTerm]);

    // ฟังก์ชันจัดการการอัปโหลดรูปภาพ
    const handleImageUpload = (itemId: string, file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target?.result as string;
            updateItem(itemId, 'image', imageUrl);
        };
        reader.readAsDataURL(file);
    };

    // ฟังก์ชันเปิด file dialog
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

    // ฟังก์ชันเพิ่มอุปกรณ์จากฐานข้อมูล
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

        // Reset selector state
        setSelectedCategory('');
        setEquipmentSearchTerm('');
        setEquipmentList([]);
    };

    // ฟังก์ชันจัดเรียงลำดับ
    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newItems = [...items];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newItems.length) return;

        // Swap items
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];

        // Update sequence numbers
        const updatedItems = newItems.map((item, i) => ({ ...item, seq: i + 1 }));
        setItems(updatedItems);
    };

    // Helper function สำหรับการแสดงรูปภาพ - FIXED
    const getImageUrl = (item: QuotationItem) => {
        // ตรวจสอบ field image ทั้งหมดที่เป็นไปได้
        if (item.image) return item.image;

        // ตรวจสอบจาก originalData
        if (item.originalData) {
            const data = item.originalData;
            return data.image_url || data.image || data.imageUrl;
        }

        return null;
    };

    // Initialize items from selected equipment
    useEffect(() => {
        if (!show) return;

        console.log('useEffect triggered with:', {
            show,
            selectedSprinkler: !!selectedSprinkler,
            selectedPump: !!selectedPump,
            selectedBranchPipe: !!selectedBranchPipe,
            selectedSecondaryPipe: !!selectedSecondaryPipe,
            selectedMainPipe: !!selectedMainPipe,
            results: !!results,
        });

        if (
            (!selectedSprinkler &&
                !selectedBranchPipe &&
                !selectedSecondaryPipe &&
                !selectedMainPipe &&
                !selectedPump) ||
            !results
        ) {
            console.log('Missing equipment or results, skipping initialization');
            return;
        }

        const initialItems: QuotationItem[] = [];
        let seq = 1;

        if (selectedSprinkler && results) {
            console.log('Adding sprinkler:', selectedSprinkler);
            initialItems.push({
                id: 'sprinkler',
                seq: seq++,
                image: selectedSprinkler.image_url || selectedSprinkler.image || '',
                date: '',
                description: selectedSprinkler.name || 'Sprinkler',
                quantity: results.totalSprinklers || 0,
                unitPrice: selectedSprinkler.price || 0,
                discount: 30.0,
                taxes: 'Output\nVAT\n7%',
                originalData: selectedSprinkler,
            });
        }

        if (selectedBranchPipe && results) {
            console.log('Adding branch pipe:', selectedBranchPipe);
            initialItems.push({
                id: 'branchPipe',
                seq: seq++,
                image: selectedBranchPipe.image_url || selectedBranchPipe.image || '',
                date: '',
                description: `${selectedBranchPipe.productCode || ''} ${selectedBranchPipe.pipeType || ''} ${selectedBranchPipe.sizeMM || ''}" ยาว ${selectedBranchPipe.lengthM || ''} ม.`,
                quantity: results.branchPipeRolls || 0,
                unitPrice: selectedBranchPipe.price || 0,
                discount: 30.0,
                taxes: 'Output\nVAT\n7%',
                originalData: selectedBranchPipe,
            });
        }

        if (selectedSecondaryPipe && results) {
            console.log('Adding secondary pipe:', selectedSecondaryPipe);
            initialItems.push({
                id: 'secondaryPipe',
                seq: seq++,
                image: selectedSecondaryPipe.image_url || selectedSecondaryPipe.image || '',
                date: '',
                description: `${selectedSecondaryPipe.productCode || ''} ${selectedSecondaryPipe.pipeType || ''} ${selectedSecondaryPipe.sizeMM || ''}" ยาว ${selectedSecondaryPipe.lengthM || ''} ม.`,
                quantity: results.secondaryPipeRolls || 0,
                unitPrice: selectedSecondaryPipe.price || 0,
                discount: 30.0,
                taxes: 'Output\nVAT\n7%',
                originalData: selectedSecondaryPipe,
            });
        }

        if (selectedMainPipe && results) {
            console.log('Adding main pipe:', selectedMainPipe);
            initialItems.push({
                id: 'mainPipe',
                seq: seq++,
                image: selectedMainPipe.image_url || selectedMainPipe.image || '',
                date: '',
                description: `${selectedMainPipe.productCode || ''} ${selectedMainPipe.pipeType || ''} ${selectedMainPipe.sizeMM || ''}" ยาว ${selectedMainPipe.lengthM || ''} ม.`,
                quantity: results.mainPipeRolls || 0,
                unitPrice: selectedMainPipe.price || 0,
                discount: 30.0,
                taxes: 'Output\nVAT\n7%',
                originalData: selectedMainPipe,
            });
        }

        if (selectedPump && results) {
            console.log('Adding pump:', selectedPump);
            initialItems.push({
                id: 'pump',
                seq: seq++,
                image: selectedPump.image_url || selectedPump.image || '', // FIXED
                date: '',
                description: `${selectedPump.productCode || selectedPump.product_code || ''} ${selectedPump.powerHP || ''} HP ${selectedPump.sizeMM || ''}" ${selectedPump.phase || ''} phase`,
                quantity: 1,
                unitPrice: selectedPump.price || 0,
                discount: 30.0,
                taxes: 'Output\nVAT\n7%',
                originalData: selectedPump,
            });

            // เพิ่มอุปกรณ์ประกอบของปั๊ม - FIXED
            if (selectedPump.pumpAccessories && selectedPump.pumpAccessories.length > 0) {
                console.log('Adding pump accessories:', selectedPump.pumpAccessories);
                selectedPump.pumpAccessories
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
                        }) => {
                            initialItems.push({
                                id: `pump_accessory_${accessory.id || seq}`,
                                seq: seq++,
                                image: accessory.image_url || accessory.image || '', // FIXED
                                date: '',
                                description: `${accessory.name}${accessory.size ? ` (${accessory.size})` : ''} - ${accessory.is_included ? 'รวมในชุด' : 'แยกขาย'}`,
                                quantity: 1,
                                unitPrice: accessory.is_included ? 0 : accessory.price || 0,
                                discount: 0,
                                taxes: 'Output\nVAT\n7%',
                                originalData: accessory,
                            });
                        }
                    );
            }

            // ตรวจสอบ pumpAccessory field อีกครั้งเพื่อ backward compatibility
            if (
                !selectedPump.pumpAccessories &&
                selectedPump.pumpAccessory &&
                selectedPump.pumpAccessory.length > 0
            ) {
                console.log(
                    'Adding pump accessories from pumpAccessory field:',
                    selectedPump.pumpAccessory
                );
                selectedPump.pumpAccessory
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
                        }) => {
                            initialItems.push({
                                id: `pump_accessory_${accessory.id || seq}`,
                                seq: seq++,
                                image: accessory.image_url || accessory.image || '', // FIXED
                                date: '',
                                description: `${accessory.name}${accessory.size ? ` (${accessory.size})` : ''} - ${accessory.is_included ? 'รวมในชุด' : 'แยกขาย'}`,
                                quantity: 1,
                                unitPrice: accessory.is_included ? 0 : accessory.price || 0,
                                discount: 30.0,
                                taxes: 'Output\nVAT\n7%',
                                originalData: accessory,
                            });
                        }
                    );
            }
        }

        console.log('Final initialItems:', initialItems);

        if (initialItems.length > 0) {
            setItems(initialItems);
            setCurrentPage(1);
        }
    }, [
        show,
        selectedSprinkler,
        selectedPump,
        selectedBranchPipe,
        selectedSecondaryPipe,
        selectedMainPipe,
        results,
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
        const itemsPerPage = getItemsPerPage(page, totalPages, items.length);

        if (page === 1) {
            return items.slice(0, itemsPerPage);
        } else {
            const startIndex = 10 + (page - 2) * 14;
            const endIndex = startIndex + itemsPerPage;
            return items.slice(startIndex, endIndex);
        }
    };

    // ฟังก์ชันสำหรับ render total table - ใช้ร่วมกันระหว่างหน้าจอและการพิมพ์
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

    // Equipment Selector Modal Component - Fixed input issue
    const EquipmentSelector = React.memo(() => {
        // Local state เพื่อหลีกเลี่ยง re-render จาก parent
        const [localSearchTerm, setLocalSearchTerm] = useState(equipmentSearchTerm);
        const [localSelectedCategory, setLocalSelectedCategory] = useState(selectedCategory);

        // Debounced search effect
        useEffect(() => {
            const timeoutId = setTimeout(() => {
                setEquipmentSearchTerm(localSearchTerm);
            }, 300);
            return () => clearTimeout(timeoutId);
        }, [localSearchTerm]);

        // Category change effect
        useEffect(() => {
            setSelectedCategory(localSelectedCategory);
        }, [localSelectedCategory]);

        // Reset search when category changes
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
                                // Reset states when closing
                                setLocalSearchTerm('');
                                setLocalSelectedCategory('');
                            }}
                            className="px-2 py-1 text-xl text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Category Selection */}
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

                    {/* Search */}
                    {localSelectedCategory && (
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                ค้นหาอุปกรณ์
                            </label>
                            <input
                                key={`search-${localSelectedCategory}`} // Force re-mount when category changes
                                type="text"
                                value={localSearchTerm}
                                onChange={(e) => setLocalSearchTerm(e.target.value)}
                                placeholder="ชื่อ, รุ่น, แบรนด์..."
                                className="w-full rounded border border-gray-300 bg-white p-2 text-gray-800 focus:border-blue-500 focus:outline-none"
                                autoComplete="off"
                            />
                        </div>
                    )}

                    {/* Equipment List */}
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
                                                    // Reset states after adding
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

        // สร้าง print container
        const printContainer = document.createElement('div');
        printContainer.className = 'print-document-container';
        printContainer.style.display = 'none';

        let allPagesHTML = '';
        for (let page = 1; page <= currentTotalPages; page++) {
            let pageItems;
            const itemsPerPage = getItemsPerPage(page, currentTotalPages, currentItems.length);

            if (page === 1) {
                pageItems = currentItems.slice(0, itemsPerPage);
            } else {
                const startIndex = 10 + (page - 2) * 14;
                const endIndex = startIndex + itemsPerPage;
                pageItems = currentItems.slice(startIndex, endIndex);
            }

            // สร้าง HTML structure เหมือนกับหน้าจอทุกประการ
            const headerHTML = `
                <div class="print-header mb-2 flex items-center justify-between">
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
                </div>
            `;

            const customerInfoHTML =
                page === 1
                    ? `
                <div class="print-customer-info mb-6 self-end text-left text-sm">
                    <p class="font-semibold">[1234] ${quotationDataCustomer.name || '-'}</p>
                    <p>${quotationDataCustomer.address1 || '-'}</p>
                    <p>${quotationDataCustomer.address2 || '-'}</p>
                    <p>${quotationDataCustomer.phone || '-'}</p>
                </div>
            `
                    : '';

            const quotationDetailsHTML =
                page === 1
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

            const footerHTML = `
                <div class="print-footer-container mt-auto text-center text-xs">
                    <hr class="print-footer-hr mb-2 border-gray-800" />
                    <div class="print-footer">
                        <p>Phone: 02-451-1111 Tax ID: 0105549044446</p>
                        <p>Page: ${page} / ${currentTotalPages}</p>
                    </div>
                </div>
            `;

            // สร้างหน้าใหม่พร้อม page break และใช้ class structure เดียวกันกับหน้าจอ
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

        // รอให้ DOM โหลดเสร็จก่อนพิมพ์
        setTimeout(() => {
            printContainer.style.display = 'block';
            window.print();

            // ลบ container หลังพิมพ์เสร็จ
            setTimeout(() => {
                if (document.body.contains(printContainer)) {
                    document.body.removeChild(printContainer);
                }
            }, 2000);
        }, 100);
    };

    const renderHeader = () => (
        <>
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
        </>
    );

    const renderFooter = (page: number) => (
        <div className="print-footer-container mt-auto text-center text-xs">
            <hr className="print-footer-hr mb-2 border-gray-800" />
            <div className="print-footer">
                <p>Phone: 02-451-1111 Tax ID: 0105549044446</p>
                <p>
                    Page: {page} / {totalPages}
                </p>
            </div>
        </div>
    );

    const renderCustomerInfo = () => (
        <div className="print-customer-info mb-6 self-end text-left text-sm">
            <p className="font-semibold">[1234] {quotationDataCustomer.name || '-'}</p>
            <p>{quotationDataCustomer.address1 || '-'}</p>
            <p>{quotationDataCustomer.address2 || '-'}</p>
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
        const absoluteIndex =
            currentPage === 1 ? currentIndex : 10 + (currentPage - 2) * 14 + currentIndex;

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
                            {/* Move Up/Down buttons */}
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
                            {/* Delete button */}
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

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-auto bg-gray-800">
            {/* Enhanced Print Styles - ปรับให้ตรงกับ Tailwind structure */}
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
                        
                        /* ใช้ class structure เดียวกันกับหน้าจอ */
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
                        .mt-auto { margin-top: auto !important; }
                        .mt-4 { margin-top: 1rem !important; }
                        
                        .items-center { align-items: center !important; }
                        .justify-between { justify-content: space-between !important; }
                        .justify-end { justify-content: flex-end !important; }
                        .self-start { align-self: flex-start !important; }
                        .self-end { align-self: flex-end !important; }
                        
                        .h-10 { height: 2.5rem !important; }
                        .w-10 { width: 2.5rem !important; }
                        
                        .border-gray-800 { border-color: rgb(31, 41, 55) !important; }
                        .border-gray-400 { border-color: rgb(156, 163, 175) !important; }
                        .bg-gray-100 { background-color: rgb(243, 244, 246) !important; }
                        
                        .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
                        .text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
                        .text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
                        .text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
                        
                        .font-semibold { font-weight: 600 !important; }
                        .font-bold { font-weight: 700 !important; }
                        
                        .text-left { text-align: left !important; }
                        .text-right { text-align: right !important; }
                        .text-center { text-align: center !important; }
                        
                        .flex-row { flex-direction: row !important; }
                        .gap-9 { gap: 2.25rem !important; }
                        
                        .w-full { width: 100% !important; }
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
                        .p-1 { padding: 0.25rem !important; }
                        .p-2 { padding: 0.5rem !important; }
                        .align-top { vertical-align: top !important; }
                        
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
                {/* Debug Information */}
                <div className="no-print fixed bottom-4 left-4 rounded bg-gray-900 p-2 text-xs text-white">
                    <div>Items: {items.length}</div>
                    <div>
                        Page: {currentPage}/{totalPages}
                    </div>
                    <div>Items on this page: {getItemsForPage(currentPage).length}</div>
                    <div>Editing: {isEditing ? 'Yes' : 'No'}</div>
                </div>

                {/* Warning message about data persistence */}
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

                {/* Control buttons */}
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
                        {isEditing && (
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

                {/* Equipment Selector Modal */}
                {showEquipmentSelector && <EquipmentSelector />}

                {/* Document Content for Display - Current Page Only */}
                <div className="mx-auto flex h-[1123px] w-[794px] flex-col bg-white p-8 text-black shadow-lg">
                    <div className="print-page flex min-h-full flex-col">
                        {renderHeader()}

                        {currentPage === 1 && (
                            <>
                                {renderCustomerInfo()}
                                {renderQuotationDetails()}
                            </>
                        )}

                        {/* Table */}
                        <table className="print-table w-full border-collapse border border-gray-400 text-xs">
                            {renderTableHeader()}
                            <tbody>
                                {getItemsForPage(currentPage).map((item, index) =>
                                    renderTableRow(item, index)
                                )}
                            </tbody>
                        </table>

                        {/* Total - แสดงเฉพาะหน้าสุดท้าย */}
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

                        {renderFooter(currentPage)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuotationDocument;

// // components/QuotationDocument.tsx - Enhanced with all fixes + Subtotal fixes
// import React, { useState, useEffect, useRef } from 'react';
// import { CalculationResults, QuotationData, QuotationDataCustomer } from '../types/interfaces';

// interface QuotationItem {
//     id: string;
//     seq: number;
//     image: string;
//     date: string;
//     description: string;
//     quantity: number;
//     unitPrice: number;
//     discount: number;
//     taxes: string;
//     originalData?: any;
// }

// interface Equipment {
//     id: number;
//     productCode: string;
//     name: string;
//     brand: string;
//     image: string;
//     price: number;
//     category_id: number;
//     category?: {
//         name: string;
//         display_name: string;
//     };
// }

// interface QuotationDocumentProps {
//     show: boolean;
//     results: CalculationResults;
//     quotationData: QuotationData;
//     quotationDataCustomer: QuotationDataCustomer;
//     selectedSprinkler: any;
//     selectedPump: any;
//     selectedBranchPipe: any;
//     selectedSecondaryPipe: any;
//     selectedMainPipe: any;
//     onClose: () => void;
// }

// const QuotationDocument: React.FC<QuotationDocumentProps> = ({
//     show,
//     results,
//     quotationData,
//     quotationDataCustomer,
//     selectedSprinkler,
//     selectedPump,
//     selectedBranchPipe,
//     selectedSecondaryPipe,
//     selectedMainPipe,
//     onClose,
// }) => {
//     const [items, setItems] = useState<QuotationItem[]>([]);
//     const [currentPage, setCurrentPage] = useState(1);
//     const [isEditing, setIsEditing] = useState(false);
//     const [showEquipmentSelector, setShowEquipmentSelector] = useState(false);
//     const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
//     const [equipmentCategories, setEquipmentCategories] = useState<any[]>([]);
//     const [selectedCategory, setSelectedCategory] = useState<string>('');
//     const [equipmentSearchTerm, setEquipmentSearchTerm] = useState<string>('');
//     const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
//     const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

//     // หน้าแรก 10 รายการ, หน้าอื่นๆ 14 รายการ
//     // แต่หน้าสุดท้ายต้องเหลือพื้นที่สำหรับ total table (5 แถว) หรือย้ายไปหน้าใหม่
//     const getItemsPerPage = (page: number, totalPages: number, totalItems: number, hasTotal: boolean = false) => {
//         if (page === 1) {
//             if (totalPages === 1) {
//                 // หน้าเดียว: ถ้ามี total และพื้นที่พอ
//                 return hasTotal ? Math.min(5, totalItems) : Math.min(10, totalItems);
//             }
//             return 10;
//         } else if (page === totalPages) {
//             // หน้าสุดท้าย: ถ้าเป็นหน้าที่มีแค่ total table
//             if (hasTotal && totalItems > 0) {
//                 const remainingItems = totalItems - 10 - (totalPages - 2) * 14;
//                 return remainingItems;
//             }
//             return 14;
//         } else {
//             return 14;
//         }
//     };

//     // คำนวณจำนวนหน้าทั้งหมด - ปรับให้คิดถึง total table แบบกลุ่ม
//     const calculateTotalPages = (totalItems: number) => {
//         if (totalItems === 0) return 1;

//         if (totalItems <= 5) {
//             // รายการน้อย สามารถใส่ total ในหน้าเดียวได้
//             return 1;
//         }

//         let remainingItems = totalItems - 10; // หักหน้าแรก 10 รายการ
//         let additionalPages = 0;

//         while (remainingItems > 0) {
//             if (remainingItems <= 9) {
//                 // หน้าสุดท้าย: ถ้าเหลือ 9 รายการหรือน้อยกว่า สามารถใส่ total ได้
//                 additionalPages += 1;
//                 break;
//             } else {
//                 // หน้ากลาง: ใส่ได้ 14 รายการ
//                 remainingItems -= 14;
//                 additionalPages += 1;
//             }
//         }

//         // ตรวจสอบว่าหน้าสุดท้ายมีพื้นที่พอสำหรับ total table หรือไม่
//         const lastPageItems = totalItems - 10 - (additionalPages - 1) * 14;
//         if (lastPageItems > 9) {
//             // ถ้าหน้าสุดท้ายมีรายการมากกว่า 9 รายการ ต้องสร้างหน้าใหม่สำหรับ total
//             additionalPages += 1;
//         }

//         return 1 + additionalPages;
//     };

//     // ตรวจสอบว่าหน้าไหนมี total table
//     const shouldShowTotal = (page: number) => {
//         if (items.length === 0) return page === 1;

//         if (items.length <= 5) {
//             return page === 1; // หน้าเดียว
//         }

//         const itemsInLastPage = items.length - 10 - (totalPages - 2) * 14;
//         if (totalPages > 1 && itemsInLastPage <= 9 && itemsInLastPage > 0) {
//             return page === totalPages; // total อยู่ในหน้าสุดท้ายที่มีรายการ
//         } else {
//             return page === totalPages && itemsInLastPage <= 0; // total อยู่ในหน้าใหม่ที่ไม่มีรายการ
//         }
//     };

//     const totalPages = calculateTotalPages(items.length);

//     // Load equipment data when component mounts
//     useEffect(() => {
//         if (show) {
//             loadEquipmentCategories();
//         }
//     }, [show]);

//     // Load categories
//     const loadEquipmentCategories = async () => {
//         try {
//             const response = await fetch('/api/equipment-categories');
//             if (response.ok) {
//                 const categories = await response.json();
//                 setEquipmentCategories(categories);
//             }
//         } catch (error) {
//             console.error('Failed to load equipment categories:', error);
//         }
//     };

//     // Load equipment by category
//     const loadEquipmentByCategory = async (categoryId: string) => {
//         if (!categoryId) {
//             setEquipmentList([]);
//             return;
//         }

//         setIsLoadingEquipment(true);
//         try {
//             const searchParams = new URLSearchParams({
//                 category_id: categoryId,
//                 is_active: 'true',
//                 per_page: '100',
//             });

//             if (equipmentSearchTerm) {
//                 searchParams.append('search', equipmentSearchTerm);
//             }

//             const response = await fetch(`/api/equipments?${searchParams}`);
//             if (response.ok) {
//                 const data = await response.json();
//                 // Handle both paginated and non-paginated responses
//                 const equipments = data.data || data;
//                 setEquipmentList(equipments);
//             }
//         } catch (error) {
//             console.error('Failed to load equipment:', error);
//         } finally {
//             setIsLoadingEquipment(false);
//         }
//     };

//     // Load equipment when category or search term changes
//     useEffect(() => {
//         if (selectedCategory) {
//             const timeoutId = setTimeout(() => {
//                 loadEquipmentByCategory(selectedCategory);
//             }, 1000); // Debounce search

//             return () => clearTimeout(timeoutId);
//         }
//     }, [selectedCategory, equipmentSearchTerm]);

//     // ฟังก์ชันจัดการการอัปโหลดรูปภาพ
//     const handleImageUpload = (itemId: string, file: File) => {
//         const reader = new FileReader();
//         reader.onload = (e) => {
//             const imageUrl = e.target?.result as string;
//             updateItem(itemId, 'image', imageUrl);
//         };
//         reader.readAsDataURL(file);
//     };

//     // ฟังก์ชันเปิด file dialog
//     const openFileDialog = (itemId: string) => {
//         const input = document.createElement('input');
//         input.type = 'file';
//         input.accept = 'image/*';
//         input.onchange = (e) => {
//             const file = (e.target as HTMLInputElement).files?.[0];
//             if (file) {
//                 handleImageUpload(itemId, file);
//             }
//         };
//         input.click();
//     };

//     // ฟังก์ชันเพิ่มอุปกรณ์จากฐานข้อมูล
//     const addEquipmentFromDatabase = (equipment: Equipment) => {
//         const newItem: QuotationItem = {
//             id: `equipment_${equipment.id}_${Date.now()}`,
//             seq: items.length + 1,
//             image: equipment.image || '',
//             date: '',
//             description: `${equipment.productCode} - ${equipment.name}${equipment.brand ? ` (${equipment.brand})` : ''}`,
//             quantity: 1,
//             unitPrice: equipment.price,
//             discount: 30.0,
//             taxes: 'Output\nVAT\n7%',
//             originalData: equipment,
//         };

//         setItems([...items, newItem]);
//         setShowEquipmentSelector(false);

//         // Reset selector state
//         setSelectedCategory('');
//         setEquipmentSearchTerm('');
//         setEquipmentList([]);
//     };

//     // ฟังก์ชันจัดเรียงลำดับ
//     const moveItem = (index: number, direction: 'up' | 'down') => {
//         const newItems = [...items];
//         const targetIndex = direction === 'up' ? index - 1 : index + 1;

//         if (targetIndex < 0 || targetIndex >= newItems.length) return;

//         // Swap items
//         [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];

//         // Update sequence numbers
//         const updatedItems = newItems.map((item, i) => ({ ...item, seq: i + 1 }));
//         setItems(updatedItems);
//     };

//     // Helper function สำหรับการแสดงรูปภาพ - FIXED
//     const getImageUrl = (item: QuotationItem) => {
//         // ตรวจสอบ field image ทั้งหมดที่เป็นไปได้
//         if (item.image) return item.image;

//         // ตรวจสอบจาก originalData
//         if (item.originalData) {
//             const data = item.originalData;
//             return data.image_url || data.image || data.imageUrl;
//         }

//         return null;
//     };

//     // Initialize items from selected equipment
//     useEffect(() => {
//         if (!show) return;

//         console.log('useEffect triggered with:', {
//             show,
//             selectedSprinkler: !!selectedSprinkler,
//             selectedPump: !!selectedPump,
//             selectedBranchPipe: !!selectedBranchPipe,
//             selectedSecondaryPipe: !!selectedSecondaryPipe,
//             selectedMainPipe: !!selectedMainPipe,
//             results: !!results,
//         });

//         if (
//             (!selectedSprinkler &&
//                 !selectedBranchPipe &&
//                 !selectedSecondaryPipe &&
//                 !selectedMainPipe &&
//                 !selectedPump) ||
//             !results
//         ) {
//             console.log('Missing equipment or results, skipping initialization');
//             return;
//         }

//         const initialItems: QuotationItem[] = [];
//         let seq = 1;

//         if (selectedSprinkler && results) {
//             console.log('Adding sprinkler:', selectedSprinkler);
//             initialItems.push({
//                 id: 'sprinkler',
//                 seq: seq++,
//                 image: selectedSprinkler.image_url || selectedSprinkler.image || '',
//                 date: '',
//                 description: selectedSprinkler.name || 'Sprinkler',
//                 quantity: results.totalSprinklers || 0,
//                 unitPrice: selectedSprinkler.price || 0,
//                 discount: 30.0,
//                 taxes: 'Output\nVAT\n7%',
//                 originalData: selectedSprinkler,
//             });
//         }

//         if (selectedBranchPipe && results) {
//             console.log('Adding branch pipe:', selectedBranchPipe);
//             initialItems.push({
//                 id: 'branchPipe',
//                 seq: seq++,
//                 image: selectedBranchPipe.image_url || selectedBranchPipe.image || '',
//                 date: '',
//                 description: `${selectedBranchPipe.productCode || ''} ${selectedBranchPipe.pipeType || ''} ${selectedBranchPipe.sizeMM || ''}" ยาว ${selectedBranchPipe.lengthM || ''} ม.`,
//                 quantity: results.branchPipeRolls || 0,
//                 unitPrice: selectedBranchPipe.price || 0,
//                 discount: 30.0,
//                 taxes: 'Output\nVAT\n7%',
//                 originalData: selectedBranchPipe,
//             });
//         }

//         if (selectedSecondaryPipe && results) {
//             console.log('Adding secondary pipe:', selectedSecondaryPipe);
//             initialItems.push({
//                 id: 'secondaryPipe',
//                 seq: seq++,
//                 image: selectedSecondaryPipe.image_url || selectedSecondaryPipe.image || '',
//                 date: '',
//                 description: `${selectedSecondaryPipe.productCode || ''} ${selectedSecondaryPipe.pipeType || ''} ${selectedSecondaryPipe.sizeMM || ''}" ยาว ${selectedSecondaryPipe.lengthM || ''} ม.`,
//                 quantity: results.secondaryPipeRolls || 0,
//                 unitPrice: selectedSecondaryPipe.price || 0,
//                 discount: 30.0,
//                 taxes: 'Output\nVAT\n7%',
//                 originalData: selectedSecondaryPipe,
//             });
//         }

//         if (selectedMainPipe && results) {
//             console.log('Adding main pipe:', selectedMainPipe);
//             initialItems.push({
//                 id: 'mainPipe',
//                 seq: seq++,
//                 image: selectedMainPipe.image_url || selectedMainPipe.image || '',
//                 date: '',
//                 description: `${selectedMainPipe.productCode || ''} ${selectedMainPipe.pipeType || ''} ${selectedMainPipe.sizeMM || ''}" ยาว ${selectedMainPipe.lengthM || ''} ม.`,
//                 quantity: results.mainPipeRolls || 0,
//                 unitPrice: selectedMainPipe.price || 0,
//                 discount: 30.0,
//                 taxes: 'Output\nVAT\n7%',
//                 originalData: selectedMainPipe,
//             });
//         }

//         if (selectedPump && results) {
//             console.log('Adding pump:', selectedPump);
//             initialItems.push({
//                 id: 'pump',
//                 seq: seq++,
//                 image: selectedPump.image_url || selectedPump.image || '', // FIXED
//                 date: '',
//                 description: `${selectedPump.productCode || selectedPump.product_code || ''} ${selectedPump.powerHP || ''} HP ${selectedPump.sizeMM || ''}" ${selectedPump.phase || ''} phase`,
//                 quantity: 1,
//                 unitPrice: selectedPump.price || 0,
//                 discount: 30.0,
//                 taxes: 'Output\nVAT\n7%',
//                 originalData: selectedPump,
//             });

//             // เพิ่มอุปกรณ์ประกอบของปั๊ม - FIXED
//             if (selectedPump.pumpAccessories && selectedPump.pumpAccessories.length > 0) {
//                 console.log('Adding pump accessories:', selectedPump.pumpAccessories);
//                 selectedPump.pumpAccessories
//                     .sort(
//                         (a: { sort_order: any }, b: { sort_order: any }) =>
//                             (a.sort_order || 0) - (b.sort_order || 0)
//                     )
//                     .forEach(
//                         (accessory: {
//                             id: any;
//                             name: any;
//                             size: any;
//                             is_included: any;
//                             price: any;
//                             image_url: any;
//                             image: any;
//                         }) => {
//                             initialItems.push({
//                                 id: `pump_accessory_${accessory.id || seq}`,
//                                 seq: seq++,
//                                 image: accessory.image_url || accessory.image || '', // FIXED
//                                 date: '',
//                                 description: `${accessory.name}${accessory.size ? ` (${accessory.size})` : ''} - ${accessory.is_included ? 'รวมในชุด' : 'แยกขาย'}`,
//                                 quantity: 1,
//                                 unitPrice: accessory.is_included ? 0 : accessory.price || 0,
//                                 discount: 0,
//                                 taxes: 'Output\nVAT\n7%',
//                                 originalData: accessory,
//                             });
//                         }
//                     );
//             }

//             // ตรวจสอบ pumpAccessory field อีกครั้งเพื่อ backward compatibility
//             if (
//                 !selectedPump.pumpAccessories &&
//                 selectedPump.pumpAccessory &&
//                 selectedPump.pumpAccessory.length > 0
//             ) {
//                 console.log(
//                     'Adding pump accessories from pumpAccessory field:',
//                     selectedPump.pumpAccessory
//                 );
//                 selectedPump.pumpAccessory
//                     .sort(
//                         (a: { sort_order: any }, b: { sort_order: any }) =>
//                             (a.sort_order || 0) - (b.sort_order || 0)
//                     )
//                     .forEach(
//                         (accessory: {
//                             id: any;
//                             name: any;
//                             size: any;
//                             is_included: any;
//                             price: any;
//                             image_url: any;
//                             image: any;
//                         }) => {
//                             initialItems.push({
//                                 id: `pump_accessory_${accessory.id || seq}`,
//                                 seq: seq++,
//                                 image: accessory.image_url || accessory.image || '', // FIXED
//                                 date: '',
//                                 description: `${accessory.name}${accessory.size ? ` (${accessory.size})` : ''} - ${accessory.is_included ? 'รวมในชุด' : 'แยกขาย'}`,
//                                 quantity: 1,
//                                 unitPrice: accessory.is_included ? 0 : accessory.price || 0,
//                                 discount: 30.0,
//                                 taxes: 'Output\nVAT\n7%',
//                                 originalData: accessory,
//                             });
//                         }
//                     );
//             }
//         }

//         console.log('Final initialItems:', initialItems);

//         if (initialItems.length > 0) {
//             setItems(initialItems);
//             setCurrentPage(1);
//         }
//     }, [
//         show,
//         selectedSprinkler,
//         selectedPump,
//         selectedBranchPipe,
//         selectedSecondaryPipe,
//         selectedMainPipe,
//         results,
//     ]);

//     const calculateItemAmount = (item: QuotationItem) => {
//         return item.unitPrice * item.quantity - item.unitPrice * (item.discount / 100);
//     };

//     const calculateTotal = () => {
//         return items.reduce((total, item) => total + calculateItemAmount(item), 0);
//     };

//     const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
//         setItems((prevItems) =>
//             prevItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
//         );
//     };

//     const addNewItem = () => {
//         const newItem: QuotationItem = {
//             id: `item_${Date.now()}`,
//             seq: items.length + 1,
//             image: '',
//             date: '',
//             description: 'รายการใหม่',
//             quantity: 1,
//             unitPrice: 0,
//             discount: 0,
//             taxes: 'Output\nVAT\n7%',
//         };
//         setItems([...items, newItem]);
//     };

//     const removeItem = (id: string) => {
//         setItems((prevItems) => {
//             const filteredItems = prevItems.filter((item) => item.id !== id);
//             return filteredItems.map((item, index) => ({ ...item, seq: index + 1 }));
//         });
//     };

//     const getItemsForPage = (page: number) => {
//         if (items.length === 0) return [];

//         if (page === 1) {
//             if (totalPages === 1) {
//                 // หน้าเดียว: แสดงรายการทั้งหมด
//                 return items;
//             }
//             return items.slice(0, 10);
//         } else {
//             const startIndex = 10 + (page - 2) * 14;

//             // ตรวจสอบว่าเป็นหน้าสุดท้ายหรือไม่
//             if (page === totalPages) {
//                 const remainingItems = items.length - startIndex;
//                 if (remainingItems <= 9 && remainingItems > 0) {
//                     // หน้าสุดท้ายที่มีรายการและ total
//                     return items.slice(startIndex, startIndex + remainingItems);
//                 } else if (remainingItems <= 0) {
//                     // หน้าสุดท้ายที่มีแค่ total table
//                     return [];
//                 } else {
//                     // หน้าสุดท้ายที่มีรายการเยอะเกินไป ไม่มี total
//                     return items.slice(startIndex, startIndex + 14);
//                 }
//             } else {
//                 // หน้ากลาง
//                 return items.slice(startIndex, startIndex + 14);
//             }
//         }
//     };

//     // ฟังก์ชันสำหรับ render total table - ใช้ร่วมกันระหว่างหน้าจอและการพิมพ์
//     const renderTotalTable = (grandTotal: number, isForPrint: boolean = false) => {
//         const tableClasses = isForPrint ?
//             "w-[250px] border-collapse border-gray-400 text-sm" :
//             "w-[250px] border-collapse border-gray-400 text-sm";

//         const cellClasses = isForPrint ?
//             "border border-x-0 border-gray-400 p-1 text-left align-top font-bold" :
//             "border border-x-0 border-gray-400 p-1 text-left align-top font-bold";

//         const valueCellClasses = isForPrint ?
//             "w-[100px] border border-x-0 border-gray-400 p-1 text-right align-top" :
//             "w-[100px] border border-x-0 border-gray-400 p-1 text-right align-top";

//         return `
//             <table class="${tableClasses}">
//                 <tbody>
//                     <tr class="border-gray-400">
//                         <td class="${cellClasses}">Subtotal</td>
//                         <td class="${valueCellClasses}">${grandTotal.toFixed(2)} ฿</td>
//                     </tr>
//                     <tr class="border-gray-400">
//                         <td class="${cellClasses}">Vat 7%</td>
//                         <td class="${valueCellClasses}">${(grandTotal * 0.07).toFixed(2)} ฿</td>
//                     </tr>
//                     <tr class="border-gray-400">
//                         <td class="${cellClasses}">Subtotal Without Discount</td>
//                         <td class="${valueCellClasses}">${(grandTotal * 1.07).toFixed(2)} ฿</td>
//                     </tr>
//                     <tr class="border-gray-400">
//                         <td class="${cellClasses}">Discount Subtotal</td>
//                         <td class="${valueCellClasses}">0.00 ฿</td>
//                     </tr>
//                     <tr class="border-gray-400">
//                         <td class="${cellClasses}">Total</td>
//                         <td class="${valueCellClasses}">${(grandTotal * 1.07).toFixed(2)} ฿</td>
//                     </tr>
//                 </tbody>
//             </table>
//         `;
//     };

//     // Equipment Selector Modal Component - Fixed input issue
//     const EquipmentSelector = React.memo(() => {
//         // Local state เพื่อหลีกเลี่ยง re-render จาก parent
//         const [localSearchTerm, setLocalSearchTerm] = useState(equipmentSearchTerm);
//         const [localSelectedCategory, setLocalSelectedCategory] = useState(selectedCategory);

//         // Debounced search effect
//         useEffect(() => {
//             const timeoutId = setTimeout(() => {
//                 setEquipmentSearchTerm(localSearchTerm);
//             }, 300);
//             return () => clearTimeout(timeoutId);
//         }, [localSearchTerm]);

//         // Category change effect
//         useEffect(() => {
//             setSelectedCategory(localSelectedCategory);
//         }, [localSelectedCategory]);

//         // Reset search when category changes
//         useEffect(() => {
//             if (localSelectedCategory !== selectedCategory) {
//                 setLocalSearchTerm('');
//                 setEquipmentSearchTerm('');
//             }
//         }, [localSelectedCategory, selectedCategory]);

//         return (
//             <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
//                 <div className="max-h-[80vh] w-[800px] overflow-auto rounded-lg bg-white p-6">
//                     <div className="mb-4 flex items-center justify-between">
//                         <h3 className="text-lg font-semibold text-gray-800">
//                             เลือกอุปกรณ์จากฐานข้อมูล
//                         </h3>
//                         <button
//                             onClick={() => {
//                                 setShowEquipmentSelector(false);
//                                 // Reset states when closing
//                                 setLocalSearchTerm('');
//                                 setLocalSelectedCategory('');
//                             }}
//                             className="px-2 py-1 text-xl text-gray-500 hover:text-gray-700"
//                         >
//                             ✕
//                         </button>
//                     </div>

//                     {/* Category Selection */}
//                     <div className="mb-4">
//                         <label className="mb-2 block text-sm font-medium text-gray-700">
//                             เลือกประเภทอุปกรณ์
//                         </label>
//                         <select
//                             value={localSelectedCategory}
//                             onChange={(e) => setLocalSelectedCategory(e.target.value)}
//                             className="w-full rounded border border-gray-300 p-2 text-gray-800 focus:border-blue-500 focus:outline-none"
//                         >
//                             <option value="">-- เลือกประเภท --</option>
//                             {equipmentCategories.map((category) => (
//                                 <option key={category.id} value={category.id}>
//                                     {category.display_name}
//                                 </option>
//                             ))}
//                         </select>
//                     </div>

//                     {/* Search */}
//                     {localSelectedCategory && (
//                         <div className="mb-4">
//                             <label className="mb-2 block text-sm font-medium text-gray-700">
//                                 ค้นหาอุปกรณ์
//                             </label>
//                             <input
//                                 key={`search-${localSelectedCategory}`} // Force re-mount when category changes
//                                 type="text"
//                                 value={localSearchTerm}
//                                 onChange={(e) => setLocalSearchTerm(e.target.value)}
//                                 placeholder="ชื่อ, รุ่น, แบรนด์..."
//                                 className="w-full rounded border border-gray-300 bg-white p-2 text-gray-800 focus:border-blue-500 focus:outline-none"
//                                 autoComplete="off"
//                             />
//                         </div>
//                     )}

//                     {/* Equipment List */}
//                     {isLoadingEquipment ? (
//                         <div className="flex items-center justify-center py-8">
//                             <div className="text-gray-500">กำลังโหลด...</div>
//                         </div>
//                     ) : (
//                         <div className="max-h-[400px] overflow-auto">
//                             {equipmentList.length === 0 && localSelectedCategory ? (
//                                 <div className="py-8 text-center text-gray-500">ไม่พบอุปกรณ์</div>
//                             ) : (
//                                 <div className="space-y-2">
//                                     {equipmentList.map((equipment) => (
//                                         <div
//                                             key={equipment.id}
//                                             className="flex items-center justify-between rounded border border-gray-200 p-3 hover:bg-gray-50"
//                                         >
//                                             <div className="flex items-center space-x-3">
//                                                 {equipment.image ? (
//                                                     <img
//                                                         src={equipment.image}
//                                                         alt={equipment.name}
//                                                         className="h-10 w-10 rounded object-cover"
//                                                         onError={(e) => {
//                                                             (
//                                                                 e.target as HTMLImageElement
//                                                             ).style.display = 'none';
//                                                             const fallback = (
//                                                                 e.target as HTMLElement
//                                                             ).nextElementSibling as HTMLElement;
//                                                             if (fallback)
//                                                                 fallback.style.display = 'flex';
//                                                         }}
//                                                     />
//                                                 ) : null}
//                                                 <div
//                                                     className="flex h-10 w-10 items-center justify-center rounded bg-gray-200 text-xs text-gray-500"
//                                                     style={{
//                                                         display: equipment.image ? 'none' : 'flex',
//                                                     }}
//                                                 >
//                                                     📦
//                                                 </div>
//                                                 <div>
//                                                     <div className="font-medium text-gray-800">
//                                                         {equipment.productCode}
//                                                     </div>
//                                                     <div className="text-sm text-gray-600">
//                                                         {equipment.name}
//                                                         {equipment.brand && ` (${equipment.brand})`}
//                                                     </div>
//                                                     <div className="text-sm font-medium text-blue-600">
//                                                         {equipment.price.toLocaleString()} บาท
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                             <button
//                                                 onClick={() => {
//                                                     addEquipmentFromDatabase(equipment);
//                                                     // Reset states after adding
//                                                     setLocalSearchTerm('');
//                                                     setLocalSelectedCategory('');
//                                                 }}
//                                                 className="rounded bg-blue-500 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-600"
//                                             >
//                                                 เพิ่ม
//                                             </button>
//                                         </div>
//                                     ))}
//                                 </div>
//                             )}
//                         </div>
//                     )}
//                 </div>
//             </div>
//         );
//     });

//     const handlePrint = () => {
//         const currentItems = items;
//         const currentTotalPages = calculateTotalPages(currentItems.length);

//         // สร้าง print container
//         const printContainer = document.createElement('div');
//         printContainer.className = 'print-document-container';
//         printContainer.style.display = 'none';

//         let allPagesHTML = '';
//         for (let page = 1; page <= currentTotalPages; page++) {
//             // ใช้ function เดียวกันกับการแสดงบนหน้าจอ
//             const pageItems = (() => {
//                 if (currentItems.length === 0) return [];

//                 if (page === 1) {
//                     if (currentTotalPages === 1) {
//                         return currentItems;
//                     }
//                     return currentItems.slice(0, 10);
//                 } else {
//                     const startIndex = 10 + (page - 2) * 14;

//                     if (page === currentTotalPages) {
//                         const remainingItems = currentItems.length - startIndex;
//                         if (remainingItems <= 9 && remainingItems > 0) {
//                             return currentItems.slice(startIndex, startIndex + remainingItems);
//                         } else if (remainingItems <= 0) {
//                             return [];
//                         } else {
//                             return currentItems.slice(startIndex, startIndex + 14);
//                         }
//                     } else {
//                         return currentItems.slice(startIndex, startIndex + 14);
//                     }
//                 }
//             })();

//             // ตรวจสอบว่าหน้านี้มี total หรือไม่
//             const shouldShowTotalOnThisPage = (() => {
//                 if (currentItems.length === 0) return page === 1;

//                 if (currentItems.length <= 5) {
//                     return page === 1;
//                 }

//                 const itemsInLastPage = currentItems.length - 10 - (currentTotalPages - 2) * 14;
//                 if (currentTotalPages > 1 && itemsInLastPage <= 9 && itemsInLastPage > 0) {
//                     return page === currentTotalPages;
//                 } else {
//                     return page === currentTotalPages && itemsInLastPage <= 0;
//                 }
//             })();

//             // สร้าง HTML structure เหมือนกับหน้าจอทุกประการ
//             const headerHTML = `
//                 <div class="print-header mb-2 flex items-center justify-between">
//                     <div class="flex items-center">
//                         <img
//                             src="https://f.btwcdn.com/store-50036/store/e4c1b5ae-cf8e-5017-536b-66ecd994018d.jpg"
//                             alt="logo"
//                             class="print-logo h-10 w-10"
//                         />
//                     </div>
//                 </div>
//                 <hr class="print-hr mb-4 border-gray-800" />
//                 <div class="print-company-info mb-4 self-start text-sm">
//                     <p class="font-semibold">บจก. กนกโปรดักส์ (สำนักงานใหญ่)</p>
//                     <p>15 ซ. พระยามนธาตุ แยก 10</p>
//                     <p>แขวงคลองบางบอน เขตบางบอน</p>
//                     <p>กรุงเทพมหานคร 10150</p>
//                 </div>
//             `;

//             const customerInfoHTML =
//                 page === 1
//                     ? `
//                 <div class="print-customer-info mb-6 self-end text-left text-sm">
//                     <p class="font-semibold">[1234] ${quotationDataCustomer.name || '-'}</p>
//                     <p>${quotationDataCustomer.address1 || '-'}</p>
//                     <p>${quotationDataCustomer.address2 || '-'}</p>
//                     <p>${quotationDataCustomer.phone || '-'}</p>
//                 </div>
//             `
//                     : '';

//             const quotationDetailsHTML =
//                 page === 1
//                     ? `
//                 <h1 class="print-title mb-4 text-xl font-bold">Quotation # QT1234567890</h1>
//                 <div class="print-details mb-4 flex flex-row gap-9 text-left text-sm">
//                     <div>
//                         <strong>Your Reference:</strong>
//                         <p>${quotationData.yourReference || '-'}</p>
//                     </div>
//                     <div>
//                         <strong>Quotation Date:</strong>
//                         <p>${quotationData.quotationDate || '-'}</p>
//                     </div>
//                     <div>
//                         <strong>Salesperson:</strong>
//                         <p>${quotationData.salesperson || '-'}</p>
//                     </div>
//                     <div>
//                         <strong>Payment Terms:</strong>
//                         <p>${quotationData.paymentTerms || '-'}</p>
//                     </div>
//                 </div>
//             `
//                     : '';

//             const tableHeaderHTML = `
//                 <thead>
//                     <tr class="bg-gray-100">
//                         <th class="border border-gray-400 p-2 text-center" colspan="5">
//                             Commitment
//                         </th>
//                         <th class="border border-gray-400 p-2 text-center" colspan="5">
//                             Disc. Fixed
//                         </th>
//                     </tr>
//                     <tr class="bg-gray-100">
//                         <th class="w-[50px] border border-gray-400 p-1 text-center">Seq</th>
//                         <th class="w-[60px] border border-gray-400 p-1 text-center">Image</th>
//                         <th class="w-[80px] border border-gray-400 p-1 text-center">Date</th>
//                         <th class="w-[250px] border border-gray-400 p-1 text-center">Description</th>
//                         <th class="w-[80px] border border-gray-400 p-1 text-center">Quantity</th>
//                         <th class="w-[80px] border border-gray-400 p-1 text-center">Unit Price</th>
//                         <th class="w-[80px] border border-gray-400 p-1 text-center">Disc.(%)</th>
//                         <th class="w-[80px] border border-gray-400 p-1 text-center">Amount</th>
//                         <th class="w-[80px] border border-gray-400 p-1 text-center">Taxes</th>
//                         <th class="w-[80px] border border-gray-400 p-1 text-center">Amount</th>
//                     </tr>
//                 </thead>
//             `;

//             const tableRows = pageItems
//                 .map((item) => {
//                     const itemAmount = calculateItemAmount(item);
//                     const imageUrl = getImageUrl(item);
//                     const imageHTML = imageUrl
//                         ? `<img src="${imageUrl}" alt="item image" class="w-10 h-10 mx-auto object-cover" />`
//                         : '';

//                     return `
//                     <tr>
//                         <td class="border border-gray-400 p-1 text-center align-top">${item.seq}</td>
//                         <td class="border border-gray-400 p-1 text-center align-top">${imageHTML}</td>
//                         <td class="border border-gray-400 p-1 text-center align-top">${item.date}</td>
//                         <td class="border border-gray-400 p-1 text-left align-top">${item.description}</td>
//                         <td class="border border-gray-400 p-1 text-right align-top">
//                             ${item.quantity.toFixed(4)}<br />Unit
//                         </td>
//                         <td class="border border-gray-400 p-1 text-right align-top">${item.unitPrice.toFixed(4)}</td>
//                         <td class="border border-gray-400 p-1 text-right align-top">${item.discount.toFixed(3)}</td>
//                         <td class="border border-gray-400 p-1 text-right align-top">${(item.unitPrice * (item.discount / 100)).toFixed(2)}</td>
//                         <td class="border border-gray-400 p-1 text-right align-top">${item.taxes.replace(/\n/g, '<br />')}</td>
//                         <td class="border border-gray-400 p-1 text-right align-top">${itemAmount.toFixed(2)} ฿</td>
//                     </tr>
//                 `;
//                 })
//                 .join('');

//             const tableHTML = pageItems.length > 0 ? `
//                 <table class="print-table w-full border-collapse border border-gray-400 text-xs">
//                     ${tableHeaderHTML}
//                     <tbody>
//                         ${tableRows}
//                     </tbody>
//                 </table>
//             ` : '';

//             const grandTotal = calculateTotal();
//             const totalHTML =
//                 shouldShowTotalOnThisPage
//                     ? `
//                 <div class="mt-4 flex justify-end">
//                     ${renderTotalTable(grandTotal, true)}
//                 </div>
//             `
//                     : '';

//             const footerHTML = `
//                 <div class="print-footer-container mt-auto text-center text-xs">
//                     <hr class="print-footer-hr mb-2 border-gray-800" />
//                     <div class="print-footer">
//                         <p>Phone: 02-451-1111 Tax ID: 0105549044446</p>
//                         <p>Page: ${page} / ${currentTotalPages}</p>
//                     </div>
//                 </div>
//             `;

//             // สร้างหน้าใหม่พร้อม page break และใช้ class structure เดียวกันกับหน้าจอ
//             const pageBreak = page < currentTotalPages ? 'page-break-after: always;' : '';
//             allPagesHTML += `
//                 <div class="mx-auto flex h-[1123px] w-[794px] flex-col bg-white p-8 text-black shadow-lg" style="${pageBreak}">
//                     <div class="print-page flex min-h-full flex-col">
//                         ${headerHTML}
//                         ${customerInfoHTML}
//                         ${quotationDetailsHTML}
//                         ${tableHTML}
//                         ${totalHTML}
//                         ${footerHTML}
//                     </div>
//                 </div>
//             `;
//         }

//         printContainer.innerHTML = allPagesHTML;
//         document.body.appendChild(printContainer);

//         // รอให้ DOM โหลดเสร็จก่อนพิมพ์
//         setTimeout(() => {
//             printContainer.style.display = 'block';
//             window.print();

//             // ลบ container หลังพิมพ์เสร็จ
//             setTimeout(() => {
//                 if (document.body.contains(printContainer)) {
//                     document.body.removeChild(printContainer);
//                 }
//             }, 2000);
//         }, 100);
//     };

//     const renderHeader = () => (
//         <>
//             <div className="print-header mb-2 flex items-center justify-between">
//                 <div className="flex items-center">
//                     <img
//                         src="https://f.btwcdn.com/store-50036/store/e4c1b5ae-cf8e-5017-536b-66ecd994018d.jpg"
//                         alt="logo"
//                         className="print-logo h-10 w-10"
//                     />
//                 </div>
//             </div>
//             <hr className="print-hr mb-4 border-gray-800" />
//             <div className="print-company-info mb-4 self-start text-sm">
//                 <p className="font-semibold">บจก. กนกโปรดักส์ (สำนักงานใหญ่)</p>
//                 <p>15 ซ. พระยามนธาตุ แยก 10</p>
//                 <p>แขวงคลองบางบอน เขตบางบอน</p>
//                 <p>กรุงเทพมหานคร 10150</p>
//             </div>
//         </>
//     );

//     const renderFooter = (page: number) => (
//         <div className="print-footer-container mt-auto text-center text-xs">
//             <hr className="print-footer-hr mb-2 border-gray-800" />
//             <div className="print-footer">
//                 <p>Phone: 02-451-1111 Tax ID: 0105549044446</p>
//                 <p>
//                     Page: {page} / {totalPages}
//                 </p>
//             </div>
//         </div>
//     );

//     const renderCustomerInfo = () => (
//         <div className="print-customer-info mb-6 self-end text-left text-sm">
//             <p className="font-semibold">[1234] {quotationDataCustomer.name || '-'}</p>
//             <p>{quotationDataCustomer.address1 || '-'}</p>
//             <p>{quotationDataCustomer.address2 || '-'}</p>
//             <p>{quotationDataCustomer.phone || '-'}</p>
//         </div>
//     );

//     const renderQuotationDetails = () => (
//         <>
//             <h1 className="print-title mb-4 text-xl font-bold">Quotation # QT1234567890</h1>
//             <div className="print-details mb-4 flex flex-row gap-9 text-left text-sm">
//                 <div>
//                     <strong>Your Reference:</strong>
//                     <p>{quotationData.yourReference || '-'}</p>
//                 </div>
//                 <div>
//                     <strong>Quotation Date:</strong>
//                     <p>{quotationData.quotationDate || '-'}</p>
//                 </div>
//                 <div>
//                     <strong>Salesperson:</strong>
//                     <p>{quotationData.salesperson || '-'}</p>
//                 </div>
//                 <div>
//                     <strong>Payment Terms:</strong>
//                     <p>{quotationData.paymentTerms || '-'}</p>
//                 </div>
//             </div>
//         </>
//     );

//     const renderTableHeader = () => (
//         <thead>
//             <tr className="bg-gray-100">
//                 <th className="border border-gray-400 p-2 text-center" colSpan={5}>
//                     Commitment
//                 </th>
//                 <th className="border border-gray-400 p-2 text-center" colSpan={5}>
//                     Disc. Fixed
//                 </th>
//             </tr>
//             <tr className="bg-gray-100">
//                 <th className="w-[50px] border border-gray-400 p-1 text-center">Seq</th>
//                 <th className="w-[60px] border border-gray-400 p-1 text-center">Image</th>
//                 <th className="w-[80px] border border-gray-400 p-1 text-center">Date</th>
//                 <th className="w-[250px] border border-gray-400 p-1 text-center">Description</th>
//                 <th className="w-[80px] border border-gray-400 p-1 text-center">Quantity</th>
//                 <th className="w-[80px] border border-gray-400 p-1 text-center">Unit Price</th>
//                 <th className="w-[80px] border border-gray-400 p-1 text-center">Disc.(%)</th>
//                 <th className="w-[80px] border border-gray-400 p-1 text-center">Amount</th>
//                 <th className="w-[80px] border border-gray-400 p-1 text-center">Taxes</th>
//                 <th className="w-[80px] border border-gray-400 p-1 text-center">Amount</th>
//                 {isEditing && (
//                     <th className="no-print w-[120px] border border-gray-400 p-1 text-center">
//                         Actions
//                     </th>
//                 )}
//             </tr>
//         </thead>
//     );

//     const renderTableRow = (item: QuotationItem, index: number) => {
//         const imageUrl = getImageUrl(item);
//         const currentPageItems = getItemsForPage(currentPage);
//         const currentIndex = currentPageItems.findIndex((i) => i.id === item.id);
//         const absoluteIndex =
//             currentPage === 1 ? currentIndex : 10 + (currentPage - 2) * 14 + currentIndex;

//         return (
//             <tr key={item.id}>
//                 <td className="border border-gray-400 p-1 text-center align-top">{item.seq}</td>
//                 <td className="border border-gray-400 p-1 text-center align-top">
//                     {isEditing ? (
//                         <div
//                             className="group relative mx-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded border-2 border-dashed border-gray-300 hover:border-blue-400"
//                             onClick={() => openFileDialog(item.id)}
//                             title="คลิกเพื่อเพิ่มรูปภาพ"
//                         >
//                             {imageUrl ? (
//                                 <img
//                                     src={imageUrl}
//                                     alt="item image"
//                                     className="h-full w-full rounded object-cover"
//                                 />
//                             ) : (
//                                 <span className="text-xs text-gray-400 group-hover:text-blue-400">
//                                     📷
//                                 </span>
//                             )}
//                             <div className="absolute inset-0 rounded bg-black bg-opacity-0 transition-all duration-200 group-hover:bg-opacity-20"></div>
//                         </div>
//                     ) : imageUrl ? (
//                         <img
//                             src={imageUrl}
//                             alt="item image"
//                             className="mx-auto h-10 w-10 object-cover"
//                         />
//                     ) : (
//                         ''
//                     )}
//                 </td>
//                 <td className="border border-gray-400 p-1 text-center align-top">
//                     {isEditing ? (
//                         <input
//                             type="date"
//                             value={item.date}
//                             onChange={(e) => updateItem(item.id, 'date', e.target.value)}
//                             className="w-full border-none bg-transparent text-center text-xs"
//                         />
//                     ) : (
//                         item.date
//                     )}
//                 </td>
//                 <td className="border border-gray-400 p-1 text-left align-top">
//                     {isEditing ? (
//                         <textarea
//                             value={item.description}
//                             onChange={(e) => updateItem(item.id, 'description', e.target.value)}
//                             className="h-12 w-full resize-none border-none bg-transparent text-xs"
//                             rows={2}
//                         />
//                     ) : (
//                         item.description
//                     )}
//                 </td>
//                 <td className="border border-gray-400 p-1 text-right align-top">
//                     {isEditing ? (
//                         <input
//                             type="number"
//                             value={item.quantity}
//                             onChange={(e) =>
//                                 updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
//                             }
//                             className="w-full border-none bg-transparent text-right text-xs"
//                             step="0.0001"
//                         />
//                     ) : (
//                         `${item.quantity.toFixed(4)}`
//                     )}
//                     <br />
//                     Unit
//                 </td>
//                 <td className="border border-gray-400 p-1 text-right align-top">
//                     {isEditing ? (
//                         <input
//                             type="number"
//                             value={item.unitPrice}
//                             onChange={(e) =>
//                                 updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
//                             }
//                             className="w-full border-none bg-transparent text-right text-xs"
//                             step="0.001"
//                         />
//                     ) : (
//                         item.unitPrice.toFixed(4)
//                     )}
//                 </td>
//                 <td className="border border-gray-400 p-1 text-right align-top">
//                     {isEditing ? (
//                         <input
//                             type="number"
//                             value={item.discount}
//                             onChange={(e) =>
//                                 updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)
//                             }
//                             className="w-full border-none bg-transparent text-right text-xs"
//                             step="0.001"
//                             max="100"
//                             min="0"
//                         />
//                     ) : (
//                         item.discount.toFixed(3)
//                     )}
//                 </td>
//                 <td className="border border-gray-400 p-1 text-right align-top">
//                     {(item.unitPrice * (item.discount / 100)).toFixed(2)}
//                 </td>
//                 <td className="border border-gray-400 p-1 text-right align-top">
//                     {item.taxes.split('\n').map((line, i) => (
//                         <React.Fragment key={i}>
//                             {line}
//                             {i < item.taxes.split('\n').length - 1 && <br />}
//                         </React.Fragment>
//                     ))}
//                 </td>
//                 <td className="border border-gray-400 p-1 text-right align-top">
//                     {calculateItemAmount(item).toFixed(2)} ฿
//                 </td>
//                 {isEditing && (
//                     <td className="no-print border border-gray-400 p-1 text-center align-top">
//                         <div className="flex flex-col space-y-1">
//                             {/* Move Up/Down buttons */}
//                             <div className="flex space-x-1">
//                                 <button
//                                     onClick={() => moveItem(absoluteIndex, 'up')}
//                                     disabled={absoluteIndex === 0}
//                                     className="rounded px-1 py-0.5 text-xs text-blue-500 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
//                                     title="ขึ้น"
//                                 >
//                                     ↑
//                                 </button>
//                                 <button
//                                     onClick={() => moveItem(absoluteIndex, 'down')}
//                                     disabled={absoluteIndex === items.length - 1}
//                                     className="rounded px-1 py-0.5 text-xs text-blue-500 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
//                                     title="ลง"
//                                 >
//                                     ↓
//                                 </button>
//                             </div>
//                             {/* Delete button */}
//                             <button
//                                 onClick={() => removeItem(item.id)}
//                                 className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
//                             >
//                                 ลบ
//                             </button>
//                         </div>
//                     </td>
//                 )}
//             </tr>
//         );
//     };

//     if (!show) return null;

//     return (
//         <div className="fixed inset-0 z-50 overflow-auto bg-gray-800">
//             {/* Enhanced Print Styles - ปรับให้ตรงกับ Tailwind structure */}
//             <style
//                 dangerouslySetInnerHTML={{
//                     __html: `
//                     @media print {
//                         @page {
//                             size: A4 portrait;
//                             margin: 0;
//                         }

//                         * {
//                             -webkit-print-color-adjust: exact !important;
//                             color-adjust: exact !important;
//                             box-sizing: border-box !important;
//                         }

//                         body > *:not(.print-document-container) {
//                             display: none !important;
//                         }

//                         .print-document-container {
//                             display: block !important;
//                             position: static !important;
//                             width: 100% !important;
//                             height: auto !important;
//                             margin: 0 !important;
//                             padding: 0 !important;
//                             background: white !important;
//                             font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif !important;
//                         }

//                         /* ใช้ class structure เดียวกันกับหน้าจอ */
//                         .mx-auto { margin-left: auto !important; margin-right: auto !important; }
//                         .flex { display: flex !important; }
//                         .h-\\[1123px\\] { height: 1123px !important; }
//                         .w-\\[794px\\] { width: 794px !important; }
//                         .flex-col { flex-direction: column !important; }
//                         .bg-white { background-color: white !important; }
//                         .p-8 { padding: 2rem !important; }
//                         .text-black { color: black !important; }
//                         .shadow-lg { box-shadow: none !important; }

//                         .print-page {
//                             display: flex !important;
//                             min-height: 100% !important;
//                             flex-direction: column !important;
//                         }

//                         .mb-2 { margin-bottom: 0.5rem !important; }
//                         .mb-4 { margin-bottom: 1rem !important; }
//                         .mb-6 { margin-bottom: 1.5rem !important; }
//                         .mt-auto { margin-top: auto !important; }
//                         .mt-4 { margin-top: 1rem !important; }

//                         .items-center { align-items: center !important; }
//                         .justify-between { justify-content: space-between !important; }
//                         .justify-end { justify-content: flex-end !important; }
//                         .self-start { align-self: flex-start !important; }
//                         .self-end { align-self: flex-end !important; }

//                         .h-10 { height: 2.5rem !important; }
//                         .w-10 { width: 2.5rem !important; }

//                         .border-gray-800 { border-color: rgb(31, 41, 55) !important; }
//                         .border-gray-400 { border-color: rgb(156, 163, 175) !important; }
//                         .bg-gray-100 { background-color: rgb(243, 244, 246) !important; }

//                         .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
//                         .text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
//                         .text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
//                         .text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }

//                         .font-semibold { font-weight: 600 !important; }
//                         .font-bold { font-weight: 700 !important; }

//                         .text-left { text-align: left !important; }
//                         .text-right { text-align: right !important; }
//                         .text-center { text-align: center !important; }

//                         .flex-row { flex-direction: row !important; }
//                         .gap-9 { gap: 2.25rem !important; }

//                         .w-full { width: 100% !important; }
//                         .border-collapse { border-collapse: collapse !important; }
//                         .border { border-width: 1px !important; }
//                         .border-x-0 { border-left-width: 0 !important; border-right-width: 0 !important; }

//                         .w-\\[50px\\] { width: 50px !important; }
//                         .w-\\[60px\\] { width: 60px !important; }
//                         .w-\\[80px\\] { width: 80px !important; }
//                         .w-\\[100px\\] { width: 100px !important; }
//                         .w-\\[120px\\] { width: 120px !important; }
//                         .w-\\[200px\\] { width: 200px !important; }
//                         .w-\\[250px\\] { width: 250px !important; }
//                         .p-1 { padding: 0.25rem !important; }
//                         .p-2 { padding: 0.5rem !important; }
//                         .align-top { vertical-align: top !important; }

//                         .no-print { display: none !important; }

//                         strong { font-weight: bold !important; }

//                         hr {
//                             border: none !important;
//                             border-top: 1px solid !important;
//                         }
//                     }
//                 `,
//                 }}
//             />

//             <div className="mx-auto my-8 max-w-4xl p-4">
//                 {/* Debug Information */}
//                 <div className="no-print fixed bottom-4 left-4 rounded bg-gray-900 p-2 text-xs text-white">
//                     <div>Items: {items.length}</div>
//                     <div>
//                         Page: {currentPage}/{totalPages}
//                     </div>
//                     <div>Items on this page: {getItemsForPage(currentPage).length}</div>
//                     <div>Show Total: {shouldShowTotal(currentPage) ? 'Yes' : 'No'}</div>
//                     <div>Editing: {isEditing ? 'Yes' : 'No'}</div>
//                 </div>

//                 {/* Warning message about data persistence */}
//                 {isEditing && (
//                     <div className="no-print fixed left-1/2 top-16 z-50 max-w-md -translate-x-1/2 transform rounded border border-yellow-400 bg-yellow-100 px-4 py-3 text-yellow-700 shadow-lg">
//                         <div className="flex">
//                             <div className="py-1">
//                                 <svg
//                                     className="mr-4 h-6 w-6 fill-current text-yellow-500"
//                                     xmlns="http://www.w3.org/2000/svg"
//                                     viewBox="0 0 20 20"
//                                 >
//                                     <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z" />
//                                 </svg>
//                             </div>
//                             <div>
//                                 <p className="font-bold">หมายเหตุ:</p>
//                                 <p className="text-sm">
//                                     รายการที่เพิ่มใหม่จะหายไปเมื่อรีเฟรชหน้า
//                                     เนื่องจากข้อจำกัดของระบบ กรุณาพิมพ์หรือบันทึกก่อนออกจากหน้านี้
//                                 </p>
//                             </div>
//                         </div>
//                     </div>
//                 )}

//                 {/* Control buttons */}
//                 <div className="no-print fixed left-0 right-0 top-0 z-50 flex justify-between bg-gray-900 px-8 py-4">
//                     <div className="flex space-x-2">
//                         <button
//                             onClick={onClose}
//                             className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
//                         >
//                             ปิด
//                         </button>
//                         <button
//                             onClick={() => setIsEditing(!isEditing)}
//                             className={`rounded px-4 py-2 text-white ${
//                                 isEditing
//                                     ? 'bg-green-500 hover:bg-green-600'
//                                     : 'bg-yellow-500 hover:bg-yellow-600'
//                             }`}
//                         >
//                             {isEditing ? 'เสร็จสิ้น' : 'แก้ไข'}
//                         </button>
//                         {isEditing && (
//                             <>
//                                 <button
//                                     onClick={addNewItem}
//                                     className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
//                                 >
//                                     เพิ่มรายการ
//                                 </button>
//                                 <button
//                                     onClick={() => setShowEquipmentSelector(true)}
//                                     className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
//                                 >
//                                     เลือกจากฐานข้อมูล
//                                 </button>
//                             </>
//                         )}
//                     </div>

//                     <div className="flex items-center space-x-4">
//                         {totalPages > 1 && (
//                             <div className="flex items-center space-x-2">
//                                 <button
//                                     onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
//                                     disabled={currentPage === 1}
//                                     className="rounded bg-gray-600 px-3 py-1 text-white disabled:opacity-50"
//                                 >
//                                     ก่อนหน้า
//                                 </button>
//                                 <span className="text-white">
//                                     หน้า {currentPage} / {totalPages}
//                                 </span>
//                                 <button
//                                     onClick={() =>
//                                         setCurrentPage(Math.min(totalPages, currentPage + 1))
//                                     }
//                                     disabled={currentPage === totalPages}
//                                     className="rounded bg-gray-600 px-3 py-1 text-white disabled:opacity-50"
//                                 >
//                                     ถัดไป
//                                 </button>
//                             </div>
//                         )}

//                         {!isEditing && (
//                             <button
//                                 onClick={handlePrint}
//                                 className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
//                             >
//                                 พิมพ์
//                             </button>
//                         )}
//                     </div>
//                 </div>

//                 {/* Equipment Selector Modal */}
//                 {showEquipmentSelector && <EquipmentSelector />}

//                 {/* Document Content for Display - Current Page Only */}
//                 <div className="mx-auto flex h-[1123px] w-[794px] flex-col bg-white p-8 text-black shadow-lg">
//                     <div className="print-page flex min-h-full flex-col">
//                         {renderHeader()}

//                         {currentPage === 1 && (
//                             <>
//                                 {renderCustomerInfo()}
//                                 {renderQuotationDetails()}
//                             </>
//                         )}

//                         {/* Table */}
//                         <table className="print-table w-full border-collapse border border-gray-400 text-xs">
//                             {renderTableHeader()}
//                             <tbody>
//                                 {getItemsForPage(currentPage).map((item, index) =>
//                                     renderTableRow(item, index)
//                                 )}
//                             </tbody>
//                         </table>

//                         {/* Total - แสดงตาม logic ใหม่ */}
//                         <div className="mt-4 flex justify-end">
//                             {shouldShowTotal(currentPage) && (
//                                 <table className="w-[250px] border-collapse border-gray-400 text-sm">
//                                     <tbody>
//                                         <tr className="border-gray-400">
//                                             <td className="border border-x-0 border-gray-400 p-1 text-left align-top font-bold">
//                                                 Subtotal
//                                             </td>
//                                             <td className="w-[100px] border border-x-0 border-gray-400 p-1 text-right align-top">
//                                                 {calculateTotal().toFixed(2)} ฿
//                                             </td>
//                                         </tr>
//                                         <tr className="border-gray-400">
//                                             <td className="border border-x-0 border-gray-400 p-1 text-left align-top font-bold">
//                                                 Vat 7%
//                                             </td>
//                                             <td className="w-[100px] border border-x-0 border-gray-400 p-1 text-right align-top">
//                                                 {(calculateTotal() * 0.07).toFixed(2)} ฿
//                                             </td>
//                                         </tr>
//                                         <tr className="border-gray-400">
//                                             <td className="border border-x-0 border-gray-400 p-1 text-left align-top font-bold">
//                                                 Subtotal Without Discount
//                                             </td>
//                                             <td className="w-[100px] border border-x-0 border-gray-400 p-1 text-right align-top">
//                                                 {(calculateTotal() * 1.07).toFixed(2)} ฿
//                                             </td>
//                                         </tr>
//                                         <tr className="border-gray-400">
//                                             <td className="border border-x-0 border-gray-400 p-1 text-left align-top font-bold">
//                                                 Discount Subtotal
//                                             </td>
//                                             <td className="w-[100px] border border-x-0 border-gray-400 p-1 text-right align-top">
//                                                 0.00 ฿
//                                             </td>
//                                         </tr>
//                                         <tr className="border-gray-400">
//                                             <td className="border border-x-0 border-gray-400 p-1 text-left align-top font-bold">
//                                                 Total
//                                             </td>
//                                             <td className="w-[100px] border border-x-0 border-gray-400 p-1 text-right align-top">
//                                                 {(calculateTotal() * 1.07).toFixed(2)} ฿
//                                             </td>
//                                         </tr>
//                                     </tbody>
//                                 </table>
//                             )}
//                         </div>

//                         {renderFooter(currentPage)}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default QuotationDocument;
