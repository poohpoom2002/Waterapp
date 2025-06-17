// components/QuotationDocument.tsx
import React from 'react';
import { CalculationResults, QuotationData, QuotationDataCustomer } from '../types/interfaces';

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
    if (!show) return null;

    const totalCost =
        (selectedSprinkler?.price || 0) * results.totalSprinklers +
        (selectedPump?.price || 0) +
        (selectedBranchPipe?.price || 0) * results.branchPipeRolls +
        (selectedSecondaryPipe?.price || 0) * results.secondaryPipeRolls +
        (selectedMainPipe?.price || 0) * results.mainPipeRolls;

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
                        
                        /* Hide everything except our document */
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
                        
                        .print-content {
                            width: 100% !important;
                            max-width: none !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            font-family: Arial, sans-serif !important;
                            color: black !important;
                            background: white !important;
                            transform: scale(1) !important;
                            display: flex !important;
                            flex-direction: column !important;
                            min-height: 100vh !important;
                        }
                        
                        /* Header styling to match screen */
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
                        
                        /* Horizontal line */
                        .print-hr {
                            border: none !important;
                            border-top: 1px solid #1f2937 !important;
                            margin: 0 !important;
                        }
                        
                        /* Company and Customer info section */
                        .print-info-section {
                            display: flex !important;
                            justify-content: space-between !important;
                            margin: 18px 0 !important;
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
                        
                        /* Title */
                        .print-title {
                            font-size: 20px !important;
                            font-weight: bold !important;
                            margin-bottom: 16px !important;
                        }
                        
                        /* Details section */
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
                        
                        /* Table styling to match exactly */
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
                        
                        /* Total section */
                        .print-total {
                            text-align: right !important;
                            margin: 16px 0 !important;
                        }
                        
                        .print-total p {
                            font-size: 18px !important;
                            font-weight: bold !important;
                            margin: 0 !important;
                        }
                        
                        /* Footer */
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
                        
                        /* Font weight adjustments */
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
                {/* Control buttons */}
                <div className="no-print fixed left-0 right-0 top-0 z-50 flex justify-between bg-gray-900 px-8 py-4">
                    <button
                        onClick={onClose}
                        className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
                    >
                        ปิด
                    </button>
                    <div className="space-x-2">
                        <button
                            onClick={() => {
                                // Add print container to body for printing
                                const printContainer = document.createElement('div');
                                printContainer.className = 'print-document-container';
                                printContainer.innerHTML =
                                    document.querySelector('.print-content')?.outerHTML || '';
                                document.body.appendChild(printContainer);

                                // Print
                                window.print();

                                // Remove print container after printing
                                setTimeout(() => {
                                    document.body.removeChild(printContainer);
                                }, 1000);
                            }}
                            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                        >
                            พิมพ์
                        </button>
                    </div>
                </div>

                {/* Document Content for Display */}
                <div className="mx-auto flex h-[1123px] w-[794px] flex-col bg-white p-8 text-black shadow-lg">
                    {/* This is the content that will be printed */}
                    <div className="print-content flex min-h-full flex-col">
                        {/* Header */}
                        <div className="print-header mb-4 flex items-center justify-between">
                            <div className="flex items-center">
                                <img
                                    src="https://scontent.fbkk17-1.fna.fbcdn.net/v/t39.30808-6/329365639_863669681576432_9072509434807570833_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeHzH0DSWRVrgxX-EPgYJXWZa6wVAKl2SdJrrBUAqXZJ0oxyybhLN1NBN_23fG_LnsJ6WcMd43_CHfgauuKawq9u&_nc_ohc=AYHmXGdPpb4Q7kNvwGjNIyW&_nc_oc=Adn8gkjmK5ho0NtNd0I0aDcp_32sp2juklFr_jP0eF8617DZ6crKViCr4e0-DZzT5uQ&_nc_zt=23&_nc_ht=scontent.fbkk17-1.fna&_nc_gid=yQcuPmACGvR7YC1W1imnRg&oh=00_AfPIGiKMCEtqlh5mCSA0bp46jj9ogkArAXfW8y1b_gxo1A&oe=68558A4C"
                                    alt="logo"
                                    className="print-logo h-10 w-10 rounded-full"
                                />
                            </div>
                        </div>

                        <hr className="print-hr mb-4 border-gray-800" />

                        {/* Company and Customer Info */}
                        <div className="print-info-section mb-6 flex flex-col">
                            <div className="print-company-info self-start text-sm">
                                <p className="font-semibold">บจก. กนกโปรดักส์ (สำนักงานใหญ่)</p>
                                <p>15 ซ. พระยามนธาตุ แยก 10</p>
                                <p>แขวงคลองบางบอน เขตบางบอน</p>
                                <p>กรุงเทพมหานคร 10150</p>
                            </div>

                            <div className="print-customer-info mt-4 self-end text-left text-sm">
                                <p className="font-semibold">
                                    [{quotationDataCustomer.code}] {quotationDataCustomer.name}
                                </p>
                                <p>{quotationDataCustomer.address}</p>
                                <p>{quotationDataCustomer.phone}</p>
                                <p>{quotationDataCustomer.email}</p>
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="print-title mb-4 text-xl font-bold">
                            Quotation # QT1234567890
                        </h1>

                        {/* Details */}
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

                        {/* Table */}
                        <table className="print-table w-full border-collapse border border-gray-400 text-xs">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th
                                        className="border border-gray-400 p-2 text-center"
                                        colSpan={5}
                                    >
                                        Commitment
                                    </th>
                                    <th
                                        className="border border-gray-400 p-2 text-center"
                                        colSpan={5}
                                    >
                                        Disc. Fixed
                                    </th>
                                </tr>
                                <tr className="bg-gray-100">
                                    <th className="w-[10px] border border-gray-400 p-1 text-center">
                                        Seq
                                    </th>
                                    <th className="w-[10px] border border-gray-400 p-1 text-center">
                                        Image
                                    </th>
                                    <th className="w-[10px] border border-gray-400 p-1 text-center">
                                        Date
                                    </th>
                                    <th className="w-[10px] border border-gray-400 p-1 text-center">
                                        Description
                                    </th>
                                    <th className="w-[10px] border border-gray-400 p-1 text-center">
                                        Quantity
                                    </th>
                                    <th className="w-[10px] border border-gray-400 p-1 text-center">
                                        Unit Price
                                    </th>
                                    <th className="w-[10px] border border-gray-400 p-1 text-center">
                                        Disc.(%)
                                    </th>
                                    <th className="w-[10px] border border-gray-400 p-1 text-center">
                                        Amount
                                    </th>
                                    <th className="w-[10px] border border-gray-400 p-1 text-center">
                                        Taxes
                                    </th>
                                    <th className="w-[10px] border border-gray-400 p-1 text-center">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedSprinkler && (
                                    <tr>
                                        <td className="border border-gray-400 p-1 text-center align-top">
                                            1
                                        </td>
                                        <td className="border border-gray-400 p-1 text-center align-top">
                                            🌱
                                        </td>
                                        <td className="border border-gray-400 p-1 text-center align-top"></td>
                                        <td className="border border-gray-400 p-1 text-left align-top">
                                            {selectedSprinkler.name}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {results.totalSprinklers}.0000
                                            <br />
                                            Unit
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {selectedSprinkler.price.toFixed(4)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            30.000
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {(selectedSprinkler.price * 0.3).toFixed(2)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            Output
                                            <br />
                                            VAT <br /> 7%
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {(
                                                selectedSprinkler.price *
                                                results.totalSprinklers *
                                                0.3
                                            ).toFixed(2)}{' '}
                                            ฿
                                        </td>
                                    </tr>
                                )}

                                {selectedBranchPipe && (
                                    <tr>
                                        <td className="border border-gray-400 p-1 text-center align-top">
                                            2
                                        </td>
                                        <td className="border border-gray-400 p-1 text-center align-top"></td>
                                        <td className="border border-gray-400 p-1 text-center align-top"></td>
                                        <td className="border border-gray-400 p-1 text-left align-top">
                                            {selectedBranchPipe.productCode}{' '}
                                            {selectedBranchPipe.pipeType}{' '}
                                            {selectedBranchPipe.sizeMM}" ยาว{' '}
                                            {selectedBranchPipe.lengthM} ม.
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {results.branchPipeRolls}.000
                                            <br />
                                            Unit
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {selectedBranchPipe.price.toFixed(3)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            30.000
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {(selectedBranchPipe.price * 0.3).toFixed(2)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            Output
                                            <br />
                                            VAT <br /> 7%
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {(
                                                selectedBranchPipe.price *
                                                results.branchPipeRolls *
                                                0.3
                                            ).toFixed(2)}{' '}
                                            ฿
                                        </td>
                                    </tr>
                                )}

                                {selectedSecondaryPipe && (
                                    <tr>
                                        <td className="border border-gray-400 p-1 text-center align-top">
                                            3
                                        </td>
                                        <td className="border border-gray-400 p-1 text-center align-top"></td>
                                        <td className="border border-gray-400 p-1 text-center align-top"></td>
                                        <td className="border border-gray-400 p-1 text-left align-top">
                                            {selectedSecondaryPipe.productCode}{' '}
                                            {selectedSecondaryPipe.pipeType}{' '}
                                            {selectedSecondaryPipe.sizeMM}" ยาว{' '}
                                            {selectedSecondaryPipe.lengthM} ม.
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {results.secondaryPipeRolls}.0000
                                            <br />
                                            Unit
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {selectedSecondaryPipe.price.toFixed(3)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            30.000
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {(selectedSecondaryPipe.price * 0.3).toFixed(2)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            Output
                                            <br />
                                            VAT <br /> 7%
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {(
                                                selectedSecondaryPipe.price *
                                                results.secondaryPipeRolls *
                                                0.3
                                            ).toFixed(2)}{' '}
                                            ฿
                                        </td>
                                    </tr>
                                )}

                                {selectedMainPipe && (
                                    <tr>
                                        <td className="border border-gray-400 p-1 text-center align-top">
                                            4
                                        </td>
                                        <td className="border border-gray-400 p-1 text-center align-top"></td>
                                        <td className="border border-gray-400 p-1 text-center align-top"></td>
                                        <td className="border border-gray-400 p-1 text-left align-top">
                                            {selectedMainPipe.productCode}{' '}
                                            {selectedMainPipe.pipeType} {selectedMainPipe.sizeMM}"
                                            ยาว {selectedMainPipe.lengthM} ม.
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {results.mainPipeRolls}.0000
                                            <br />
                                            Unit
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {selectedMainPipe.price.toFixed(3)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            30.000
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {(selectedMainPipe.price * 0.86).toFixed(2)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            Output
                                            <br />
                                            VAT <br /> 7%
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {(
                                                selectedMainPipe.price *
                                                results.mainPipeRolls *
                                                0.3
                                            ).toFixed(2)}{' '}
                                            ฿
                                        </td>
                                    </tr>
                                )}

                                {selectedPump && (
                                    <tr>
                                        <td className="border border-gray-400 p-1 text-center align-top">
                                            5
                                        </td>
                                        <td className="border border-gray-400 p-1 text-center align-top"></td>
                                        <td className="border border-gray-400 p-1 text-center align-top"></td>
                                        <td className="border border-gray-400 p-1 text-left align-top">
                                            {selectedPump.productCode} {selectedPump.powerHP} HP{' '}
                                            {selectedPump.sizeMM}" {selectedPump.phase} phase
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            1.0000
                                            <br />
                                            Unit
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {selectedPump.price.toFixed(3)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            30.000
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {(selectedPump.price * 0.13).toFixed(2)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            Output
                                            <br />
                                            VAT <br /> 7%
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right align-top">
                                            {(selectedPump.price * 1 * 0.3).toFixed(2)} ฿
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Total */}
                        <div className="print-total text-right">
                            <p className="text-lg font-bold">
                                รวมทั้งหมด: {totalCost.toLocaleString()} บาท
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="print-footer-container mt-auto text-center text-xs">
                            <hr className="print-footer-hr mb-2 border-gray-800" />
                            <div className="print-footer">
                                <p>Phone: 02-451-1111 Tax ID: 0105549044446</p>
                                <p>Page: 1 / 1</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuotationDocument;
