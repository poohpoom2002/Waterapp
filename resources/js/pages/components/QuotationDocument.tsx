// components/QuotationDocument.tsx
import React, { useState, useEffect } from 'react';
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
    originalData?: any; // เก็บข้อมูลต้นฉบับของอุปกรณ์
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
    const itemsPerPage = 10; // จำนวนรายการต่อหน้า

    // Initialize items from selected equipment
    useEffect(() => {
        if (!show) return; // ไม่ initialize ถ้าไม่ได้แสดง component
        
        console.log('useEffect triggered with:', {
            show,
            selectedSprinkler: !!selectedSprinkler,
            selectedPump: !!selectedPump,
            selectedBranchPipe: !!selectedBranchPipe,
            selectedSecondaryPipe: !!selectedSecondaryPipe,
            selectedMainPipe: !!selectedMainPipe,
            results: !!results
        });

        // ตรวจสอบว่ามีข้อมูลอุปกรณ์อย่างน้อย 1 ชิ้น และมี results
        if ((!selectedSprinkler && !selectedBranchPipe && !selectedSecondaryPipe && !selectedMainPipe && !selectedPump) || !results) {
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
                image: '🌱',
                date: '',
                description: selectedSprinkler.name || 'Sprinkler',
                quantity: results.totalSprinklers || 0,
                unitPrice: selectedSprinkler.price || 0,
                discount: 30.0,
                taxes: 'Output\nVAT\n7%',
                originalData: selectedSprinkler
            });
        }

        if (selectedBranchPipe && results) {
            console.log('Adding branch pipe:', selectedBranchPipe);
            initialItems.push({
                id: 'branchPipe',
                seq: seq++,
                image: '',
                date: '',
                description: `${selectedBranchPipe.productCode || ''} ${selectedBranchPipe.pipeType || ''} ${selectedBranchPipe.sizeMM || ''}" ยาว ${selectedBranchPipe.lengthM || ''} ม.`,
                quantity: results.branchPipeRolls || 0,
                unitPrice: selectedBranchPipe.price || 0,
                discount: 30.0,
                taxes: 'Output\nVAT\n7%',
                originalData: selectedBranchPipe
            });
        }

        if (selectedSecondaryPipe && results) {
            console.log('Adding secondary pipe:', selectedSecondaryPipe);
            initialItems.push({
                id: 'secondaryPipe',
                seq: seq++,
                image: '',
                date: '',
                description: `${selectedSecondaryPipe.productCode || ''} ${selectedSecondaryPipe.pipeType || ''} ${selectedSecondaryPipe.sizeMM || ''}" ยาว ${selectedSecondaryPipe.lengthM || ''} ม.`,
                quantity: results.secondaryPipeRolls || 0,
                unitPrice: selectedSecondaryPipe.price || 0,
                discount: 30.0,
                taxes: 'Output\nVAT\n7%',
                originalData: selectedSecondaryPipe
            });
        }

        if (selectedMainPipe && results) {
            console.log('Adding main pipe:', selectedMainPipe);
            initialItems.push({
                id: 'mainPipe',
                seq: seq++,
                image: '',
                date: '',
                description: `${selectedMainPipe.productCode || ''} ${selectedMainPipe.pipeType || ''} ${selectedMainPipe.sizeMM || ''}" ยาว ${selectedMainPipe.lengthM || ''} ม.`,
                quantity: results.mainPipeRolls || 0,
                unitPrice: selectedMainPipe.price || 0,
                discount: 30.0,
                taxes: 'Output\nVAT\n7%',
                originalData: selectedMainPipe
            });
        }

        if (selectedPump && results) {
            console.log('Adding pump:', selectedPump);
            initialItems.push({
                id: 'pump',
                seq: seq++,
                image: '',
                date: '',
                description: `${selectedPump.productCode || ''} ${selectedPump.powerHP || ''} HP ${selectedPump.sizeMM || ''}" ${selectedPump.phase || ''} phase`,
                quantity: 1,
                unitPrice: selectedPump.price || 0,
                discount: 30.0,
                taxes: 'Output\nVAT\n7%',
                originalData: selectedPump
            });
        }

        console.log('Final initialItems:', initialItems);
        
        // เซ็ต items เฉพาะเมื่อมีรายการ
        if (initialItems.length > 0) {
            setItems(initialItems);
            setCurrentPage(1); // รีเซ็ตหน้าเป็นหน้าแรก
        }
    }, [show, selectedSprinkler, selectedPump, selectedBranchPipe, selectedSecondaryPipe, selectedMainPipe, results]);

    const totalPages = Math.ceil(items.length / itemsPerPage);

    const calculateItemAmount = (item: QuotationItem) => {
        const discountAmount = item.unitPrice * (item.discount / 100);
        return (item.unitPrice - discountAmount) * item.quantity;
    };

    const calculateTotal = () => {
        return items.reduce((total, item) => total + calculateItemAmount(item), 0);
    };

    const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
        setItems(prevItems =>
            prevItems.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
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
            taxes: 'Output\nVAT\n7%'
        };
        setItems([...items, newItem]);
    };

    const removeItem = (id: string) => {
        setItems(prevItems => {
            const filteredItems = prevItems.filter(item => item.id !== id);
            // อัพเดท seq ใหม่
            return filteredItems.map((item, index) => ({ ...item, seq: index + 1 }));
        });
    };

    const getItemsForPage = (page: number) => {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return items.slice(startIndex, endIndex);
    };

    const handlePrint = () => {
        // รับค่าล่าสุดของ items และ totalPages
        const currentItems = items;
        const currentTotalPages = Math.ceil(currentItems.length / itemsPerPage);
        
        // สร้าง print container ที่มีทุกหน้า
        const printContainer = document.createElement('div');
        printContainer.className = 'print-document-container';
        
        let allPagesHTML = '';
        for (let page = 1; page <= currentTotalPages; page++) {
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageItems = currentItems.slice(startIndex, endIndex);
            
            // สร้าง HTML สำหรับแต่ละหน้า
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
                <div class="print-company-info self-start text-sm mb-4">
                    <p class="font-semibold">บจก. กนกโปรดักส์ (สำนักงานใหญ่)</p>
                    <p>15 ซ. พระยามนธาตุ แยก 10</p>
                    <p>แขวงคลองบางบอน เขตบางบอน</p>
                    <p>กรุงเทพมหานคร 10150</p>
                </div>
            `;

            const customerInfoHTML = page === 1 ? `
                <div class="print-customer-info mb-6 self-end text-left text-sm">
                    <p class="font-semibold">
                        [${quotationDataCustomer.code}] ${quotationDataCustomer.name}
                    </p>
                    <p>${quotationDataCustomer.address}</p>
                    <p>${quotationDataCustomer.phone}</p>
                    <p>${quotationDataCustomer.email}</p>
                </div>
            ` : '';

            const quotationDetailsHTML = page === 1 ? `
                <h1 class="print-title mb-4 text-xl font-bold">
                    Quotation # QT1234567890
                </h1>
                <div class="print-details mb-4 flex flex-row gap-9 text-left text-sm">
                    <div>
                        <strong>Your Reference:</strong>
                        <p>${quotationData.yourReference}</p>
                    </div>
                    <div>
                        <strong>Quotation Date:</strong>
                        <p>${quotationData.quotationDate}</p>
                    </div>
                    <div>
                        <strong>Salesperson:</strong>
                        <p>${quotationData.salesperson}</p>
                    </div>
                    <div>
                        <strong>Payment Terms:</strong>
                        <p>${quotationData.paymentTerms}</p>
                    </div>
                </div>
            ` : '';

            const tableRows = pageItems.map(item => {
                const itemAmount = (item.unitPrice - (item.unitPrice * (item.discount / 100))) * item.quantity;
                return `
                    <tr>
                        <td class="border border-gray-400 p-1 text-center align-top">${item.seq}</td>
                        <td class="border border-gray-400 p-1 text-center align-top">${item.image}</td>
                        <td class="border border-gray-400 p-1 text-center align-top">${item.date}</td>
                        <td class="border border-gray-400 p-1 text-left align-top">${item.description}</td>
                        <td class="border border-gray-400 p-1 text-right align-top">
                            ${item.quantity.toFixed(4)}<br />Unit
                        </td>
                        <td class="border border-gray-400 p-1 text-right align-top">${item.unitPrice.toFixed(4)}</td>
                        <td class="border border-gray-400 p-1 text-right align-top">${item.discount.toFixed(3)}</td>
                        <td class="border border-gray-400 p-1 text-right align-top">
                            ${(item.unitPrice * (item.discount / 100)).toFixed(2)}
                        </td>
                        <td class="border border-gray-400 p-1 text-right align-top">
                            ${item.taxes.replace(/\n/g, '<br />')}
                        </td>
                        <td class="border border-gray-400 p-1 text-right align-top">
                            ${itemAmount.toFixed(2)} ฿
                        </td>
                    </tr>
                `;
            }).join('');

            const tableHTML = `
                <table class="print-table w-full border-collapse border border-gray-400 text-xs">
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
                            <th class="w-[10px] border border-gray-400 p-1 text-center">Seq</th>
                            <th class="w-[10px] border border-gray-400 p-1 text-center">Image</th>
                            <th class="w-[10px] border border-gray-400 p-1 text-center">Date</th>
                            <th class="w-[10px] border border-gray-400 p-1 text-center">Description</th>
                            <th class="w-[10px] border border-gray-400 p-1 text-center">Quantity</th>
                            <th class="w-[10px] border border-gray-400 p-1 text-center">Unit Price</th>
                            <th class="w-[10px] border border-gray-400 p-1 text-center">Disc.(%)</th>
                            <th class="w-[10px] border border-gray-400 p-1 text-center">Amount</th>
                            <th class="w-[10px] border border-gray-400 p-1 text-center">Taxes</th>
                            <th class="w-[10px] border border-gray-400 p-1 text-center">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            `;

            // คำนวณยอดรวมจากรายการทั้งหมด
            const grandTotal = currentItems.reduce((total, item) => {
                const itemAmount = (item.unitPrice - (item.unitPrice * (item.discount / 100))) * item.quantity;
                return total + itemAmount;
            }, 0);

            const totalHTML = page === currentTotalPages ? `
                <div class="print-total text-right">
                    <p class="text-lg font-bold">
                        รวมทั้งหมด: ${grandTotal.toLocaleString()} บาท
                    </p>
                </div>
            ` : '';

            const footerHTML = `
                <div class="print-footer-container mt-auto text-center text-xs">
                    <hr class="print-footer-hr mb-2 border-gray-800" />
                    <div class="print-footer">
                        <p>Phone: 02-451-1111 Tax ID: 0105549044446</p>
                        <p>Page: ${page} / ${currentTotalPages}</p>
                    </div>
                </div>
            `;
            
            allPagesHTML += `
                <div class="print-page">
                    ${headerHTML}
                    ${customerInfoHTML}
                    ${quotationDetailsHTML}
                    ${tableHTML}
                    ${totalHTML}
                    ${footerHTML}
                </div>
            `;
        }
        
        printContainer.innerHTML = allPagesHTML;
        document.body.appendChild(printContainer);

        // Print
        window.print();

        // Remove print container after printing
        setTimeout(() => {
            document.body.removeChild(printContainer);
        }, 1000);
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
            <div className="print-company-info self-start text-sm mb-4">
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
                <p>Page: {page} / {totalPages}</p>
            </div>
        </div>
    );

    const renderCustomerInfo = () => (
        <div className="print-customer-info mb-6 self-end text-left text-sm">
            <p className="font-semibold">
                [{quotationDataCustomer.code}] {quotationDataCustomer.name}
            </p>
            <p>{quotationDataCustomer.address}</p>
            <p>{quotationDataCustomer.phone}</p>
            <p>{quotationDataCustomer.email}</p>
        </div>
    );

    const renderQuotationDetails = () => (
        <>
            <h1 className="print-title mb-4 text-xl font-bold">
                Quotation # QT1234567890
            </h1>
            <div className="print-details mb-4 flex flex-row gap-9 text-left text-sm">
                <div>
                    <strong>Your Reference:</strong>
                    <p>{quotationData.yourReference}</p>
                </div>
                <div>
                    <strong>Quotation Date:</strong>
                    <p>{quotationData.quotationDate}</p>
                </div>
                <div>
                    <strong>Salesperson:</strong>
                    <p>{quotationData.salesperson}</p>
                </div>
                <div>
                    <strong>Payment Terms:</strong>
                    <p>{quotationData.paymentTerms}</p>
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
                <th className="w-[10px] border border-gray-400 p-1 text-center">Seq</th>
                <th className="w-[10px] border border-gray-400 p-1 text-center">Image</th>
                <th className="w-[10px] border border-gray-400 p-1 text-center">Date</th>
                <th className="w-[10px] border border-gray-400 p-1 text-center">Description</th>
                <th className="w-[10px] border border-gray-400 p-1 text-center">Quantity</th>
                <th className="w-[10px] border border-gray-400 p-1 text-center">Unit Price</th>
                <th className="w-[10px] border border-gray-400 p-1 text-center">Disc.(%)</th>
                <th className="w-[10px] border border-gray-400 p-1 text-center">Amount</th>
                <th className="w-[10px] border border-gray-400 p-1 text-center">Taxes</th>
                <th className="w-[10px] border border-gray-400 p-1 text-center">Amount</th>
                {isEditing && <th className="w-[10px] border border-gray-400 p-1 text-center no-print">Actions</th>}
            </tr>
        </thead>
    );

    const renderTableRow = (item: QuotationItem) => (
        <tr key={item.id}>
            <td className="border border-gray-400 p-1 text-center align-top">{item.seq}</td>
            <td className="border border-gray-400 p-1 text-center align-top">{item.image}</td>
            <td className="border border-gray-400 p-1 text-center align-top">{item.date}</td>
            <td className="border border-gray-400 p-1 text-left align-top">
                {isEditing ? (
                    <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="w-full border-none bg-transparent text-xs"
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
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full border-none bg-transparent text-xs text-right"
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
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full border-none bg-transparent text-xs text-right"
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
                        onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                        className="w-full border-none bg-transparent text-xs text-right"
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
                <td className="border border-gray-400 p-1 text-center align-top no-print">
                    <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                    >
                        ลบ
                    </button>
                </td>
            )}
        </tr>
    );

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-auto bg-gray-800">
            {/* Print Styles */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 15mm;
                        }
                        
                        body > *:not(.print-document-container) {
                            display: none !important;
                        }
                        
                        .print-document-container {
                            position: fixed !important;
                            top: 0 !important;
                            left: 0 !important;
                            width: 100% !important;
                            height: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            z-index: 99999 !important;
                        }
                        
                        .print-page {
                            width: 100% !important;
                            min-height: 100vh !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            font-family: Arial, sans-serif !important;
                            color: black !important;
                            background: white !important;
                            display: flex !important;
                            flex-direction: column !important;
                            page-break-after: always !important;
                        }
                        
                        .print-page:last-child {
                            page-break-after: avoid !important;
                        }
                        
                        .print-header {
                            display: flex !important;
                            align-items: center !important;
                            justify-content: space-between !important;
                            margin-bottom: 16px !important;
                        }
                        
                        .print-logo {
                            width: 40px !important;
                            height: 40px !important;
                            border-radius: 50% !important;
                        }
                        
                        .print-hr {
                            border: none !important;
                            border-top: 1px solid #1f2937 !important;
                            margin: 0 !important;
                        }
                        
                        .print-company-info {
                            font-size: 14px !important;
                            line-height: 1.4 !important;
                        }
                        
                        .print-company-info p {
                            margin: 2px 0 !important;
                        }
                        
                        .print-customer-info {
                            font-size: 14px !important;
                            line-height: 1.4 !important;
                            text-align: left !important;
                        }
                        
                        .print-customer-info p {
                            margin: 2px 0 !important;
                        }
                        
                        .print-title {
                            font-size: 20px !important;
                            font-weight: bold !important;
                            margin-bottom: 16px !important;
                        }
                        
                        .print-details {
                            display: flex !important;
                            gap: 36px !important;
                            font-size: 14px !important;
                            margin-bottom: 16px !important;
                            text-align: left !important;
                        }
                        
                        .print-details > div {
                            flex-shrink: 0 !important;
                        }
                        
                        .print-details strong {
                            font-weight: bold !important;
                            display: block !important;
                            margin-bottom: 2px !important;
                        }
                        
                        .print-details p {
                            margin: 0 !important;
                        }
                        
                        .print-table {
                            width: 100% !important;
                            border-collapse: collapse !important;
                            font-size: 12px !important;
                            margin: 12px 0 !important;
                        }
                        
                        .print-table th,
                        .print-table td {
                            border: 1px solid #9ca3af !important;
                            padding: 8px 4px !important;
                            vertical-align: top !important;
                        }
                        
                        .print-table th {
                            background-color: #f3f4f6 !important;
                            font-weight: bold !important;
                            text-align: center !important;
                        }
                        
                        .print-table .text-left {
                            text-align: left !important;
                        }
                        
                        .print-table .text-right {
                            text-align: right !important;
                        }
                        
                        .print-table .text-center {
                            text-align: center !important;
                        }
                        
                        .print-total {
                            text-align: right !important;
                            margin: 16px 0 !important;
                        }
                        
                        .print-total p {
                            font-size: 18px !important;
                            font-weight: bold !important;
                            margin: 0 !important;
                        }
                        
                        .print-footer-container {
                            margin-top: auto !important;
                            text-align: center !important;
                            font-size: 12px !important;
                            padding-top: 20px !important;
                        }
                        
                        .print-footer-hr {
                            border: none !important;
                            border-top: 1px solid #1f2937 !important;
                            margin-bottom: 8px !important;
                        }
                        
                        .print-footer p {
                            margin: 2px 0 !important;
                        }
                        
                        .no-print {
                            display: none !important;
                        }
                        
                        .font-semibold {
                            font-weight: 600 !important;
                        }
                        
                        .font-bold {
                            font-weight: bold !important;
                        }
                    }
                `,
                }}
            />

            <div className="mx-auto my-8 max-w-4xl p-4">
                {/* Debug Information - จะถูกซ่อนเมื่อพิมพ์ */}
                <div className="no-print fixed bottom-4 left-4 bg-gray-900 text-white p-2 text-xs rounded">
                    <div>Items: {items.length}</div>
                    <div>Page: {currentPage}/{totalPages}</div>
                    <div>Editing: {isEditing ? 'Yes' : 'No'}</div>
                </div>

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
                            <button
                                onClick={addNewItem}
                                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                            >
                                เพิ่มรายการ
                            </button>
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
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="rounded bg-gray-600 px-3 py-1 text-white disabled:opacity-50"
                                >
                                    ถัดไป
                                </button>
                            </div>
                        )}
                        
                        <button
                            onClick={handlePrint}
                            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                        >
                            พิมพ์
                        </button>
                    </div>
                </div>

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
                                {getItemsForPage(currentPage).map(renderTableRow)}
                            </tbody>
                        </table>

                        {/* Total - แสดงเฉพาะหน้าสุดท้าย */}
                        {currentPage === totalPages && (
                            <div className="print-total text-right">
                                <p className="text-lg font-bold">
                                    รวมทั้งหมด: {calculateTotal().toLocaleString()} บาท
                                </p>
                            </div>
                        )}

                        {renderFooter(currentPage)}
                    </div>
                </div>
            </div>
        </div>
    );


};

export default QuotationDocument;