import { X, Shield, Lock, Eye, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrivacyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative mx-4 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-green-100 p-2">
                            <Shield className="h-5 w-5 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">นโยบายความเป็นส่วนตัว (PDPA)</h2>
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
                        <div className="mb-6 rounded-lg bg-green-50 p-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <Lock className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800">ความปลอดภัยของข้อมูลส่วนบุคคล</span>
                            </div>
                            <p className="text-sm text-green-800">
                                <strong>วันที่มีผลบังคับใช้:</strong> 1 มกราคม 2025<br />
                                นโยบายนี้เป็นไปตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
                            </p>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                            <Database className="h-5 w-5 text-blue-600" />
                            <span>1. ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม</span>
                        </h3>
                        <p className="mb-4 text-gray-700">
                            เราเก็บรวบรวมข้อมูลส่วนบุคคลของท่านดังต่อไปนี้:
                        </p>
                        <div className="mb-6 grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                <h4 className="font-semibold text-blue-900 mb-2">ข้อมูลพื้นฐาน</h4>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• ชื่อ-นามสกุล</li>
                                    <li>• อีเมล</li>
                                    <li>• รหัสผ่าน (เข้ารหัส)</li>
                                    <li>• วันที่สมัครสมาชิก</li>
                                </ul>
                            </div>
                            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                                <h4 className="font-semibold text-purple-900 mb-2">ข้อมูลการใช้งาน</h4>
                                <ul className="text-sm text-purple-800 space-y-1">
                                    <li>• ประวัติการเข้าสู่ระบบ</li>
                                    <li>• การคำนวณและโครงการ</li>
                                    <li>• IP Address</li>
                                    <li>• ข้อมูล Browser และ Device</li>
                                </ul>
                            </div>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                            <Eye className="h-5 w-5 text-green-600" />
                            <span>2. วัตถุประสงค์ในการเก็บรวบรวมข้อมูล</span>
                        </h3>
                        <div className="mb-6 space-y-3">
                            <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-4">
                                <h4 className="font-semibold text-green-900 mb-2">การให้บริการหลัก</h4>
                                <ul className="text-sm text-green-800 space-y-1">
                                    <li>• สร้างและจัดการบัญชีผู้ใช้</li>
                                    <li>• ให้บริการระบบคำนวณอุปกรณ์ชลประทาน</li>
                                    <li>• บันทึกและจัดเก็บโครงการของท่าน</li>
                                    <li>• ให้การสนับสนุนทางเทคนิค</li>
                                </ul>
                            </div>
                            <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
                                <h4 className="font-semibold text-blue-900 mb-2">การปรับปรุงบริการ</h4>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• วิเคราะห์การใช้งานเพื่อพัฒนาระบบ</li>
                                    <li>• ป้องกันการใช้งานที่ผิดปกติ</li>
                                    <li>• รักษาความปลอดภัยของระบบ</li>
                                </ul>
                            </div>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-4">3. การแชร์ข้อมูลกับบุคคลที่สาม</h3>
                        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <Shield className="h-4 w-4 text-red-600" />
                                <span className="font-semibold text-red-900">นโยบายการไม่แชร์ข้อมูล</span>
                            </div>
                            <p className="text-sm text-red-800">
                                <strong>เราไม่ขาย แชร์ หรือให้เช่าข้อมูลส่วนบุคคลของท่านกับบุคคลที่สาม</strong> 
                                ยกเว้นในกรณีดังต่อไปนี้:
                            </p>
                            <ul className="mt-2 text-sm text-red-800 space-y-1">
                                <li>• เมื่อได้รับความยินยอมจากท่าน</li>
                                <li>• เพื่อปฏิบัติตามกฎหมายหรือคำสั่งศาล</li>
                                <li>• เพื่อป้องกันอันตรายต่อความปลอดภัย</li>
                            </ul>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-4">4. การรักษาความปลอดภัยข้อมูล</h3>
                        <div className="mb-6 grid gap-4 md:grid-cols-3">
                            <div className="rounded-lg bg-gray-50 p-4 text-center">
                                <Lock className="mx-auto mb-2 h-8 w-8 text-gray-600" />
                                <h4 className="font-semibold text-gray-900 mb-1">การเข้ารหัส</h4>
                                <p className="text-xs text-gray-600">ข้อมูลถูกเข้ารหัสด้วย SSL/TLS</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-4 text-center">
                                <Shield className="mx-auto mb-2 h-8 w-8 text-gray-600" />
                                <h4 className="font-semibold text-gray-900 mb-1">การควบคุมการเข้าถึง</h4>
                                <p className="text-xs text-gray-600">เฉพาะบุคลากรที่ได้รับอนุญาต</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-4 text-center">
                                <Database className="mx-auto mb-2 h-8 w-8 text-gray-600" />
                                <h4 className="font-semibold text-gray-900 mb-1">การสำรองข้อมูล</h4>
                                <p className="text-xs text-gray-600">สำรองข้อมูลอย่างปลอดภัย</p>
                            </div>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-4">5. สิทธิของเจ้าของข้อมูลส่วนบุคคล</h3>
                        <p className="mb-4 text-gray-700">ตามกฎหมาย PDPA ท่านมีสิทธิดังต่อไปนี้:</p>
                        <div className="mb-6 grid gap-3 md:grid-cols-2">
                            <div className="flex items-start space-x-3 rounded-lg border p-3">
                                <div className="rounded-full bg-blue-100 p-1">
                                    <Eye className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">สิทธิในการเข้าถึง</h4>
                                    <p className="text-sm text-gray-600">ขอดูข้อมูลส่วนบุคคลที่เราเก็บไว้</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3 rounded-lg border p-3">
                                <div className="rounded-full bg-green-100 p-1">
                                    <Database className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">สิทธิในการแก้ไข</h4>
                                    <p className="text-sm text-gray-600">ขอแก้ไขข้อมูลที่ไม่ถูกต้อง</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3 rounded-lg border p-3">
                                <div className="rounded-full bg-red-100 p-1">
                                    <X className="h-4 w-4 text-red-600" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">สิทธิในการลบ</h4>
                                    <p className="text-sm text-gray-600">ขอลบข้อมูลส่วนบุคคล</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3 rounded-lg border p-3">
                                <div className="rounded-full bg-purple-100 p-1">
                                    <Shield className="h-4 w-4 text-purple-600" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">สิทธิในการคัดค้าน</h4>
                                    <p className="text-sm text-gray-600">คัดค้านการประมวลผลข้อมูล</p>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-4">6. การเก็บรักษาข้อมูล</h3>
                        <p className="mb-4 text-gray-700">
                            เราจะเก็บรักษาข้อมูลส่วนบุคคลของท่านตราบเท่าที่จำเป็นเพื่อวัตถุประสงค์ที่ระบุไว้ 
                            หรือตามที่กฎหมายกำหนด โดยทั่วไป:
                        </p>
                        <ul className="mb-6 list-disc pl-6 text-gray-700">
                            <li>ข้อมูลบัญชีผู้ใช้: เก็บไว้ตลอดระยะเวลาที่มีบัญชี + 3 ปี</li>
                            <li>ข้อมูลการใช้งาน: เก็บไว้ 2 ปี เพื่อการวิเคราะห์และปรับปรุง</li>
                            <li>ข้อมูล Log: เก็บไว้ 1 ปี เพื่อความปลอดภัย</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-gray-900 mb-4">7. การใช้ Cookies</h3>
                        <p className="mb-4 text-gray-700">
                            เราใช้ Cookies เพื่อปรับปรุงประสบการณ์การใช้งานของท่าน รวมถึง:
                        </p>
                        <ul className="mb-6 list-disc pl-6 text-gray-700">
                            <li>จดจำการเข้าสู่ระบบ</li>
                            <li>บันทึกการตั้งค่าของท่าน</li>
                            <li>วิเคราะห์การใช้งานเว็บไซต์</li>
                        </ul>

                        <div className="mt-8 rounded-lg bg-gray-50 p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">การติดต่อเรื่องข้อมูลส่วนบุคคล</h4>
                            <p className="text-sm text-gray-600 mb-2">
                                หากท่านต้องการใช้สิทธิหรือมีข้อสงสัยเกี่ยวกับการคุ้มครองข้อมูลส่วนบุคคล กรุณาติดต่อ:
                            </p>
                            <div className="text-sm text-gray-600">
                                <strong>เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)</strong><br />
                                บริษัท กนกส์โปรดักส์ จำกัด<br />
                                โทรศัพท์: 02-451-1111 กด 2<br />
                                <strong>เวลาทำการ:</strong> จันทร์-เสาร์ 8:00-17:00 น.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 border-t bg-white px-6 py-4">
                    <div className="flex justify-end">
                        <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                            ปิด
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
