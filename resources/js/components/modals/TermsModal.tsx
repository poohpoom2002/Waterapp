import { X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative mx-4 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-blue-100 p-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">เงื่อนไขการใช้บริการ</h2>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-gray-100"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="max-h-[calc(90vh-120px)] overflow-y-auto px-6 py-6">
                    <div className="prose prose-gray max-w-none">
                        <div className="mb-6 rounded-lg bg-blue-50 p-4">
                            <p className="text-sm text-blue-800">
                                <strong>วันที่มีผลบังคับใช้:</strong> 1 มกราคม 2025
                            </p>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-4">1. การยอมรับเงื่อนไข</h3>
                        <p className="mb-4 text-gray-700">
                            การใช้บริการระบบคำนวณอุปกรณ์สำหรับชลประทาน ("บริการ") ของบริษัท กนก โปรดักส์ และ ไชโย ไปป์แอนด์ฟิตติ้ง จำกัด 
                            ถือว่าท่านได้อ่าน เข้าใจ และยอมรับเงื่อนไขการใช้บริการนี้แล้ว
                        </p>

                        <h3 className="text-lg font-semibold text-gray-900 mb-4">2. การใช้บริการ</h3>
                        <ul className="mb-4 list-disc pl-6 text-gray-700">
                            <li>ท่านต้องมีอายุไม่ต่ำกว่า 18 ปี หรือได้รับอนุญาตจากผู้ปกครอง</li>
                            <li>ท่านต้องให้ข้อมูลที่ถูกต้องและเป็นจริงในการสมัครสมาชิก</li>
                            <li>ท่านรับผิดชอบในการรักษาความปลอดภัยของบัญชีผู้ใช้</li>
                            <li>ห้ามใช้บริการเพื่อวัตถุประสงค์ที่ผิดกฎหมายหรือเป็นอันตราย</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-gray-900 mb-4">3. ความรับผิดชอบของผู้ใช้</h3>
                        <p className="mb-4 text-gray-700">
                            ท่านรับผิดชอบในการ:
                        </p>
                        <ul className="mb-4 list-disc pl-6 text-gray-700">
                            <li>ตรวจสอบความถูกต้องของข้อมูลที่ได้จากการคำนวณ</li>
                            <li>ใช้ผลการคำนวณอย่างเหมาะสมและปลอดภัย</li>
                            <li>ปฏิบัติตามกฎหมายและข้อบังคับที่เกี่ยวข้อง</li>
                            <li>ไม่แชร์ข้อมูลบัญชีกับบุคคลอื่น</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-gray-900 mb-4">4. ข้อจำกัดความรับผิดชอบ</h3>
                        <p className="mb-4 text-gray-700">
                            บริษัทฯ ไม่รับผิดชอบต่อ:
                        </p>
                        <ul className="mb-4 list-disc pl-6 text-gray-700">
                            <li>ความเสียหายที่เกิดจากการใช้ข้อมูลจากระบบอย่างไม่ถูกต้อง</li>
                            <li>การหยุดชะงักของบริการที่เกิดจากสาเหตุเหนือการควบคุม</li>
                            <li>ความเสียหายทางอ้อมหรือผลกระทบต่อเนื่อง</li>
                            <li>การสูญหายของข้อมูลที่เกิดจากเหตุสุดวิสัย</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-gray-900 mb-4">5. ทรัพย์สินทางปัญญา</h3>
                        <p className="mb-4 text-gray-700">
                            ระบบ เนื้อหา และข้อมูลทั้งหมดในบริการเป็นทรัพย์สินทางปัญญาของบริษัทฯ 
                            ท่านไม่สามารถคัดลอก แจกจ่าย หรือใช้เพื่อการค้าโดยไม่ได้รับอนุญาต
                        </p>

                        <h3 className="text-lg font-semibold text-gray-900 mb-4">6. การยกเลิกบริการ</h3>
                        <p className="mb-4 text-gray-700">
                            บริษัทฯ ขอสงวนสิทธิ์ในการยกเลิกหรือระงับบริการของท่านได้ 
                            หากมีการใช้บริการผิดเงื่อนไขหรือเป็นอันตรายต่อระบบ
                        </p>

                        <h3 className="text-lg font-semibold text-gray-900 mb-4">7. การแก้ไขเงื่อนไข</h3>
                        <p className="mb-4 text-gray-700">
                            บริษัทฯ อาจแก้ไขเงื่อนไขการใช้บริการได้ตลอดเวลา 
                            โดยจะแจ้งให้ทราบล่วงหน้าผ่านระบบหรือช่องทางการติดต่อ
                        </p>

                        <h3 className="text-lg font-semibold text-gray-900 mb-4">8. กฎหมายที่ใช้บังคับ</h3>
                        <p className="mb-4 text-gray-700">
                            เงื่อนไขนี้อยู่ภายใต้กฎหมายไทย และข้อพิพาทจะอยู่ในเขตอำนาจศาลไทย
                        </p>

                        <div className="mt-8 rounded-lg bg-gray-50 p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">ติดต่อเรา</h4>
                            <p className="text-sm text-gray-600">
                                หากมีข้อสงสัยเกี่ยวกับเงื่อนไขการใช้บริการ กรุณาติดต่อ:<br />
                                <strong>บริษัท กนกส์โปรดักส์ จำกัด</strong><br />
                                โทรศัพท์: 02-451-1111 กด 2<br />
                                <strong>เวลาทำการ:</strong> จันทร์-เสาร์ 8:00-17:00 น.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 border-t bg-white px-6 py-4">
                    <div className="flex justify-end">
                        <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
                            ปิด
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
