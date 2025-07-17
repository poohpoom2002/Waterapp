import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
    const { t } = useLanguage();

    return (
        <footer className="mt-8 border-t border-gray-700 bg-gray-800">
            <div className="mx-auto max-w-7xl px-6 py-4">
                <div className="text-center">
                    <div className="rounded-xl bg-gray-900 p-4">
                        <h3 className="mb-3 text-lg font-bold text-white">Contact Us</h3>

                        {/* Contact Buttons with Image Logos */}
                        <div className="mb-3 flex justify-center gap-4">
                            {/* Line with Image Logo */}
                            <a
                                href="https://line.me/ti/p/@kanokproduct"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600"
                            >
                                {/* Line Logo - Replace with your actual Line logo image */}
                                <img
                                    src="/images/line-logo.png"
                                    alt="Line"
                                    className="h-5 w-5"
                                    onError={(e) => {
                                        // Fallback to emoji if image fails to load
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const emojiSpan =
                                            target.nextElementSibling as HTMLSpanElement;
                                        if (emojiSpan) emojiSpan.style.display = 'inline';
                                    }}
                                />
                                <span className="text-lg" style={{ display: 'none' }}>
                                    💬
                                </span>
                                <span className="text-sm font-medium">Line</span>
                            </a>

                            {/* Facebook with Image Logo */}
                            <a
                                href="https://www.facebook.com/kanokproduct"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                            >
                                {/* Facebook Logo - Replace with your actual Facebook logo image */}
                                <img
                                    src="/images/facebook-logo.png"
                                    alt="Facebook"
                                    className="h-5 w-5"
                                    onError={(e) => {
                                        // Fallback to emoji if image fails to load
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const emojiSpan =
                                            target.nextElementSibling as HTMLSpanElement;
                                        if (emojiSpan) emojiSpan.style.display = 'inline';
                                    }}
                                />
                                <span className="text-lg" style={{ display: 'none' }}>
                                    📘
                                </span>
                                <span className="text-sm font-medium">Facebook</span>
                            </a>

                            {/* Phone - Keep as is */}
                            <a
                                href="tel:024511111"
                                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
                            >
                                <span className="text-lg">📞</span>
                                <span className="text-sm font-medium">Phone</span>
                            </a>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-0.5 text-sm text-gray-300">
                            <p className="font-semibold text-white">KANOK PRODUCT</p>
                            <p>โทร. 02-451-1111 กด 2</p>
                            <p>15 ซอย พระยามนธาตุ แยก 10</p>
                            <p>ถนน บางขุนเทียน แขวง คลองบางบอน</p>
                            <p>เขต บางบอน กรุงเทพ 10150</p>
                            <p>Thailand</p>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className="mt-3 text-xs text-gray-400">
                        © 2024 KANOK PRODUCT. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
