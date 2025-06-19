// components/QuotationModal.tsx
import React from 'react';
import { QuotationData, QuotationDataCustomer } from '../types/interfaces';

interface QuotationModalProps {
    show: boolean;
    quotationData: QuotationData;
    quotationDataCustomer: QuotationDataCustomer;
    onQuotationDataChange: (data: QuotationData) => void;
    onQuotationDataCustomerChange: (data: QuotationDataCustomer) => void;
    onClose: () => void;
    onConfirm: () => void;
}

const QuotationModal: React.FC<QuotationModalProps> = ({
    show,
    quotationData,
    quotationDataCustomer,
    onQuotationDataChange,
    onQuotationDataCustomerChange,
    onClose,
    onConfirm,
}) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 text-gray-800">
                <h3 className="mb-4 text-xl font-bold">ข้อมูลใบเสนอราคา</h3>
                <div className="flex w-full items-center justify-between gap-x-4">
                    <div className="w-1/2 space-y-4">
                        <h1 className="text-xl font-semibold">ผู้ให้บริการ</h1>
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Your Reference:
                            </label>
                            <input
                                type="text"
                                value={quotationData.yourReference}
                                onChange={(e) =>
                                    onQuotationDataChange({
                                        ...quotationData,
                                        yourReference: e.target.value,
                                    })
                                }
                                className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                                placeholder="ชื่อทีม"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Quotation Date:
                            </label>
                            <input
                                type="text"
                                value={quotationData.quotationDate}
                                onChange={(e) =>
                                    onQuotationDataChange({
                                        ...quotationData,
                                        quotationDate: e.target.value,
                                    })
                                }
                                className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">Salesperson:</label>
                            <input
                                type="text"
                                value={quotationData.salesperson}
                                onChange={(e) =>
                                    onQuotationDataChange({
                                        ...quotationData,
                                        salesperson: e.target.value,
                                    })
                                }
                                className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                                placeholder="ผู้ออกใบเสนอราคา"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">Payment Terms:</label>
                            <input
                                type="text"
                                value={quotationData.paymentTerms}
                                onChange={(e) =>
                                    onQuotationDataChange({
                                        ...quotationData,
                                        paymentTerms: e.target.value,
                                    })
                                }
                                className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                                placeholder="เงื่อนไขการชำระเงิน"
                            />
                        </div>
                    </div>
                    <div className="w-1/2 space-y-4">
                        <h1 className="text-xl font-semibold">ผู้ใช้บริการ</h1>
                        {/* <div>
                            <label className="mb-2 block text-sm font-medium">Code:</label>
                            <input
                                type="text"
                                value={quotationDataCustomer.code}
                                onChange={(e) =>
                                    onQuotationDataCustomerChange({
                                        ...quotationDataCustomer,
                                        code: e.target.value,
                                    })
                                }
                                className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                                placeholder="รหัสคำสั่งซื้อ"
                            />
                        </div> */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">Name:</label>
                            <input
                                type="text"
                                value={quotationDataCustomer.name}
                                onChange={(e) =>
                                    onQuotationDataCustomerChange({
                                        ...quotationDataCustomer,
                                        name: e.target.value,
                                    })
                                }
                                className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                                placeholder="ชื่อ - นามสกุล"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">Address1:</label>
                            <input
                                type="text"
                                value={quotationDataCustomer.address1}
                                onChange={(e) =>
                                    onQuotationDataCustomerChange({
                                        ...quotationDataCustomer,
                                        address1: e.target.value,
                                    })
                                }
                                className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                                placeholder="ที่อยู่"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">Address2:</label>
                            <input
                                type="text"
                                value={quotationDataCustomer.address2}
                                onChange={(e) =>
                                    onQuotationDataCustomerChange({
                                        ...quotationDataCustomer,
                                        address2: e.target.value,
                                    })
                                }
                                className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                                placeholder="จังหวัด"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">Phone:</label>
                            <input
                                type="text"
                                value={quotationDataCustomer.phone}
                                onChange={(e) =>
                                    onQuotationDataCustomerChange({
                                        ...quotationDataCustomer,
                                        phone: e.target.value,
                                    })
                                }
                                className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                                placeholder="มือถือ"
                            />
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex space-x-4">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded bg-gray-500 py-2 text-white hover:bg-gray-600"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 rounded bg-blue-500 py-2 text-white hover:bg-blue-600"
                    >
                        ยืนยัน
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuotationModal;
