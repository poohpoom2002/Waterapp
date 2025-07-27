import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
    useLanguage();

    return (
        <footer className="mt-auto border-t border-gray-700 bg-gray-800">
            <div className="mx-auto max-w-7xl px-6 py-2">
                <div className="text-center">
                    <div className="rounded-xl bg-gray-900 p-3">
                        <h3 className="mb-2 text-sm font-bold text-white">Contact Us</h3>

                        {/* Contact Buttons with Image Logos */}
                        <div className="mb-2 flex justify-center gap-3">
                            {/* Line with Image Logo */}
                            <a
                                href="https://line.me/ti/p/@kanokproduct"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1 text-white transition-colors hover:bg-green-600"
                            >
                                {/* Line Logo - Replace with your actual Line logo image */}
                                <img
                                    src="/images/line-logo.png"
                                    alt="Line"
                                    className="h-4 w-4"
                                    onError={(e) => {
                                        // Fallback to emoji if image fails to load
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const emojiSpan =
                                            target.nextElementSibling as HTMLSpanElement;
                                        if (emojiSpan) emojiSpan.style.display = 'inline';
                                    }}
                                />
                                <span className="text-sm" style={{ display: 'none' }}>
                                    💬
                                </span>
                                <span className="text-xs font-medium">Line</span>
                            </a>

                            {/* Facebook with Image Logo */}
                            <a
                                href="https://www.facebook.com/kanokproduct"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-white transition-colors hover:bg-blue-700"
                            >
                                {/* Facebook Logo - Replace with your actual Facebook logo image */}
                                <img
                                    src="/images/facebook-logo.png"
                                    alt="Facebook"
                                    className="h-4 w-4"
                                    onError={(e) => {
                                        // Fallback to emoji if image fails to load
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const emojiSpan =
                                            target.nextElementSibling as HTMLSpanElement;
                                        if (emojiSpan) emojiSpan.style.display = 'inline';
                                    }}
                                />
                                <span className="text-sm" style={{ display: 'none' }}>
                                    📘
                                </span>
                                <span className="text-xs font-medium">Facebook</span>
                            </a>

                            {/* Phone - Keep as is */}
                            <a
                                href="tel:024511111"
                                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1 text-white transition-colors hover:bg-green-700"
                            >
                                <span className="text-sm">📞</span>
                                <span className="text-xs font-medium">Phone</span>
                            </a>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-0.5 text-xs text-gray-300">
                            <p className="font-semibold text-white">KANOK PRODUCT</p>
                            <p>โทร. 02-451-1111 กด 2</p>
                            <p>15 ซอย พระยามนธาตุ แยก 10</p>
                            <p>ถนน บางขุนเทียน แขวง คลองบางบอน</p>
                            <p>เขต บางบอน กรุงเทพ 10150</p>
                            <p>Thailand</p>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className="mt-2 text-xs text-gray-400">
                        © 2024 KANOK PRODUCT. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
