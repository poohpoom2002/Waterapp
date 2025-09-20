// resources\js\pages\components\QuotationModal.tsx
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
    t: (key: string) => string;
}

const QuotationModal: React.FC<QuotationModalProps> = ({
    show,
    quotationData,
    quotationDataCustomer,
    onQuotationDataChange,
    onQuotationDataCustomerChange,
    onClose,
    onConfirm,
    t,
}) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 text-gray-800">
                <h3 className="mb-4 text-xl font-bold">{t('ข้อมูลใบเสนอราคา')}</h3>
                <div className="flex w-full items-center justify-between gap-x-4">
                    <div className="w-1/2 space-y-4">
                        <h1 className="text-xl font-semibold">{t('ผู้ให้บริการ')}</h1>
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                {t('Your Reference:')}
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
                                placeholder={t('ชื่อทีม')}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                {t('Quotation Date:')}
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
                            <label className="mb-2 block text-sm font-medium">
                                {t('Salesperson:')}
                            </label>
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
                                placeholder={t('ผู้ออกใบเสนอราคา')}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                {t('Payment Terms:')}
                            </label>
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
                                placeholder={t('เงื่อนไขการชำระเงิน')}
                            />
                        </div>
                    </div>
                    <div className="w-1/2 space-y-4">
                        <h1 className="text-xl font-semibold">{t('ผู้ใช้บริการ')}</h1>
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
                                placeholder={t('รหัสคำสั่งซื้อ')}
                            />
                        </div> */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                {t('ProjectName:')}
                            </label>
                            <input
                                type="text"
                                value={quotationDataCustomer.projectName}
                                onChange={(e) =>
                                    onQuotationDataCustomerChange({
                                        ...quotationDataCustomer,
                                        projectName: e.target.value,
                                    })
                                }
                                className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                                placeholder={t('ชื่อโครงการ')}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">{t('Name:')}</label>
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
                                placeholder={t('ชื่อ - นามสกุล')}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                {t('Address:')}
                            </label>
                            <input
                                type="text"
                                value={quotationDataCustomer.address}
                                onChange={(e) =>
                                    onQuotationDataCustomerChange({
                                        ...quotationDataCustomer,
                                        address: e.target.value,
                                    })
                                }
                                className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                                placeholder={t('ที่อยู่')}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">{t('Phone:')}</label>
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
                                placeholder={t('มือถือ')}
                            />
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex space-x-4">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded bg-gray-500 py-2 text-white hover:bg-gray-600"
                    >
                        {t('ยกเลิก')}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 rounded bg-blue-500 py-2 text-white hover:bg-blue-600"
                    >
                        {t('ยืนยัน')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuotationModal;
