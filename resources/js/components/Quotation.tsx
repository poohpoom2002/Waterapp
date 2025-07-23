import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Define proper interfaces for the selected items
interface SelectedSprinkler {
    name: string;
    price: number;
}

interface SelectedPump {
    productCode: string;
    price: number;
}

interface SelectedPipe {
    productCode: string;
    price: number;
}

interface QuotationResults {
    totalSprinklers: number;
    branchPipeRolls: number;
    secondaryPipeRolls: number;
    mainPipeRolls: number;
}

export interface QuotationProps {
    quotationNumber: string;
    projectName: string; // ใช้เป็น Your Reference
    date: string; // Quotation Date
    clientName: string; // ชื่อลูกค้า (Address) แสดงใน header ขวา
    salesperson: string;
    paymentTerms: string;
    selectedSprinkler: SelectedSprinkler;
    selectedPump: SelectedPump;
    selectedBranchPipe: SelectedPipe;
    selectedSecondaryPipe: SelectedPipe;
    selectedMainPipe: SelectedPipe;
    results: QuotationResults;
}

export default function Quotation({
    quotationNumber,
    projectName,
    date,
    clientName,
    salesperson,
    paymentTerms,
    selectedSprinkler,
    selectedPump,
    selectedBranchPipe,
    selectedSecondaryPipe,
    selectedMainPipe,
    results,
}: QuotationProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    const items = [
        {
            name: 'สปริงเกอร์',
            model: `${selectedSprinkler.name}`,
            qty: results.totalSprinklers,
            unitPrice: selectedSprinkler.price,
        },
        {
            name: 'ปั๊มน้ำ',
            model: `${selectedPump.productCode}`,
            qty: 1,
            unitPrice: selectedPump.price,
        },
        {
            name: 'ท่อย่อย',
            model: `${selectedBranchPipe.productCode}`,
            qty: results.branchPipeRolls,
            unitPrice: selectedBranchPipe.price,
        },
        {
            name: 'ท่อเมนรอง',
            model: `${selectedSecondaryPipe.productCode}`,
            qty: results.secondaryPipeRolls,
            unitPrice: selectedSecondaryPipe.price,
        },
        {
            name: 'ท่อเมนหลัก',
            model: `${selectedMainPipe.productCode}`,
            qty: results.mainPipeRolls,
            unitPrice: selectedMainPipe.price,
        },
    ];

    const total = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

    const download = async () => {
        if (!ref.current) return;
        const canvas = await html2canvas(ref.current, { scale: 2 });
        const img = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const w = pdf.internal.pageSize.getWidth();
        const h = pdf.internal.pageSize.getHeight();
        pdf.addImage(img, 'PNG', 0, 0, w, h);
        pdf.save(`Quotation_${quotationNumber}.pdf`);
    };

    return (
        <>
            <Button onClick={() => setOpen(true)}>แสดงใบเสนอราคา</Button>
            {open && (
                <div
                    className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="h-[842pt] w-[595pt] overflow-auto bg-white"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div ref={ref} className="p-4 text-gray-800">
                            {/* Header */}
                            <div className="mb-2 flex items-start justify-between">
                                <div>
                                    <div className="font-bold">
                                        บจก. ชัยโยพาย์ไพพ์ (สำนักงานใหญ่)
                                    </div>
                                    <div>15 ซ. พระยามนธาตุ แยก 10</div>
                                    <div>แขวงคลองบางขุน เขตบางบอน</div>
                                    <div>กรุงเทพมหานคร 10150</div>
                                </div>
                                <div className="text-right">
                                    <div>{clientName}</div>
                                </div>
                            </div>
                            <hr />
                            {/* Title */}
                            <div className="mb-4 mt-2">
                                <div className="text-2xl font-bold">
                                    Quotation # {quotationNumber}
                                </div>
                            </div>
                            {/* Info row */}
                            <div className="mb-4 grid grid-cols-4 gap-4 text-sm">
                                <div>
                                    <strong>Your Reference:</strong> {projectName}
                                </div>
                                <div>
                                    <strong>Quotation Date:</strong> {date}
                                </div>
                                <div>
                                    <strong>Salesperson:</strong> {salesperson}
                                </div>
                                <div>
                                    <strong>Payment Terms:</strong> {paymentTerms}
                                </div>
                            </div>
                            <hr />
                            {/* Table */}
                            <table className="mt-4 w-full border-collapse text-sm">
                                <thead>
                                    <tr>
                                        <th className="border p-2">Sequence</th>
                                        <th className="border p-2">Description</th>
                                        <th className="border p-2">Quantity</th>
                                        <th className="border p-2">Unit Price</th>
                                        <th className="border p-2">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it, i) => (
                                        <tr
                                            key={i}
                                            className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                        >
                                            <td className="border p-2 text-center">{i + 1}</td>
                                            <td className="border p-2">
                                                {it.name} {it.model}
                                            </td>
                                            <td className="border p-2 text-center">{it.qty}</td>
                                            <td className="border p-2 text-right">
                                                {it.unitPrice.toLocaleString()}
                                            </td>
                                            <td className="border p-2 text-right">
                                                {(it.qty * it.unitPrice).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={4} className="border p-2 text-right font-bold">
                                            รวมทั้งสิ้น (ไม่รวม VAT)
                                        </td>
                                        <td className="border p-2 text-right font-bold">
                                            {total.toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                            <div className="mt-4 text-center text-xs">
                                <div>Phone: 02-451-1111 &nbsp; Tax ID: 0105549044446</div>
                                <div>Page 1 / 1</div>
                            </div>
                        </div>
                        <div className="border-t p-4 text-center">
                            <Button onClick={download}>ดาวน์โหลด PDF</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
