import React from 'react';
import { MapPin, Phone, Mail, Globe, Award, Users, Package, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
const Footer: React.FC = () => {
    const { t } = useLanguage();
    return (
        <footer id="contact-footer" className="bg-gray-900 text-gray-300">
            {/* Main Footer Content */}
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {/* Company Info - Kanok Product */}
                    <div className="space-y-4">
                        <h3 className="mb-4 text-xl font-bold text-white">{t('บจก.กนกโปรดักส์')}</h3>
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-blue-400" />
                                <p className="text-sm">
                                {t('15-23 ซ.พระยามนธาตุฯ แยก10 ถ.บางขุนเทียน แขวงคลองบางบอน เขตบางบอน กรุงเทพมหานคร 10150')}
                                </p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Phone className="h-5 w-5 text-green-400" />
                                <p className="text-sm">{t('02-451-1111')}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Globe className="h-5 w-5 text-purple-400" />
                                <a
                                    href="https://www.kanokgroup.com"
                                    className="text-sm transition-colors hover:text-white"
                                >
                                    {t('www.kanokgroup.com')}
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Company Info - Chaiyo */}
                    <div className="space-y-4">
                        <h3 className="mb-4 text-xl font-bold text-white">{t('บจก.ไชโยไปป์แอนด์ฟิตติ้ง')}</h3>
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-blue-400" />
                                <p className="text-sm">
                                {t('71/6 หมู่ 1 ตำบลคอกกระบือ อำเภอเมืองสมุทรสาคร จ.สมุทรสาคร 74000')}
                                </p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Phone className="h-5 w-5 text-green-400" />
                                <p className="text-sm">{t('034-441-841')}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Mail className="h-5 w-5 text-red-400" />
                                <p className="text-sm">{t('info@chaiyopipe.com')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Products & Services */}
                    <div className="space-y-4">
                        <h3 className="mb-4 text-xl font-bold text-white">{t('ผลิตภัณฑ์และบริการ')}</h3>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center space-x-2">
                                <Package className="h-4 w-4 text-orange-400" />
                                <span>{t('ท่อและข้อต่อ PVC')}</span>
                            </li>
                            <li className="flex items-center space-x-2">
                                <Package className="h-4 w-4 text-orange-400" />
                                <span>{t('ท่อและข้อต่อ PE')}</span>
                            </li>
                            <li className="flex items-center space-x-2">
                                <Package className="h-4 w-4 text-orange-400" />
                                <span>{t('สปริงเกอร์และมินิสปริงเกอร์')}</span>
                            </li>
                            <li className="flex items-center space-x-2">
                                <Package className="h-4 w-4 text-orange-400" />
                                <span>{t('ระบบน้ำหยดและมิสติ้ง')}</span>
                            </li>
                            <li className="flex items-center space-x-2">
                                <Package className="h-4 w-4 text-orange-400" />
                                <span>{t('วาล์วและฟุตวาล์ว')}</span>
                            </li>
                            <li className="flex items-center space-x-2">
                                <Package className="h-4 w-4 text-orange-400" />
                                <span>{t('อุปกรณ์การเกษตรอื่นๆ')}</span>
                            </li>
                        </ul>
                    </div>

                    {/* Company Highlights */}
                    <div className="space-y-4">
                        <h3 className="mb-4 text-xl font-bold text-white">{t('จุดเด่นของเรา')}</h3>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                                <Award className="h-5 w-5 text-yellow-400" />
                                <span className="text-sm">{t('มาตรฐาน ISO 9001:2015')}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Award className="h-5 w-5 text-yellow-400" />
                                <span className="text-sm">{t('ได้รับมาตรฐาน TIS')}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Users className="h-5 w-5 text-cyan-400" />
                                <span className="text-sm">{t('ตัวแทนจำหน่าย 8,000+ แห่ง')}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Clock className="h-5 w-5 text-indigo-400" />
                                <span className="text-sm">{t('ประสบการณ์ 25+ ปี')}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Package className="h-5 w-5 text-pink-400" />
                                <span className="text-sm">{t('ผลิตภัณฑ์ 9,000+ รายการ')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Google Map Section */}
                <div className="mt-12 border-t border-gray-700 pt-8">
                    <h3 className="mb-6 text-center text-xl font-bold text-white">
                        {t('แผนที่ตำแหน่งสำนักงาน')}
                    </h3>
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-1">
                        {/* Kanok Product Map */}
                        <div className="overflow-hidden rounded-lg bg-gray-700">
                            <div className="h-80">
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d966.7642280441407!2d100.42009950900939!3d13.665848348465142!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30e2bd69ca5b596f%3A0x9343e7f0feddd541!2z4Lia4LiI4LiBLiDguIHguJnguIHguYLguJvguKPguJTguLHguIHguKrguYwgKOC4quC4s-C4meC4seC4geC4h-C4suC4meC5g-C4q-C4jeC5iCkgS0FOT0sgUFJPRFVDVCBDTy4sIExURC4!5e1!3m2!1sen!2sth!4v1753790987668!5m2!1sen!2sth"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    className="rounded"
                                ></iframe>
                            </div>
                        </div>

                        {/* Chaiyo Map */}
                        {/* <div className="overflow-hidden rounded-lg bg-gray-700">
                            <div className="h-80">
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4599.987907470839!2d100.34470117572982!3d13.601323200758376!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30e2b9544d90f993%3A0xd2371b661d2f2ab5!2z4Lia4Lij4Li04Lip4Lix4LiXIOC5hOC4iuC5guC4oiDguYTguJvguJvguYzguYHguK3guJnguJTguYzguJ_guLTguJXguJXguLHguYnguIcg4LiI4Liz4LiB4Lix4LiU!5e1!3m2!1sen!2sth!4v1753696616180!5m2!1sen!2sth"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    className="rounded"
                                ></iframe>
                            </div>
                        </div> */}
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-700 bg-gray-900">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
                        <div className="text-sm text-gray-300">
                            {t('© 2025 บจก.กนกโปรดักส์ จำกัด และ บจก.ไชโย ไปป์แอนด์ฟิตติ้ง จำกัด สงวนลิขสิทธิ์')}
                        </div>
                        <div className="text-sm text-gray-300">{t('ผู้นำด้านระบบน้ำการเกษตร')}</div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;