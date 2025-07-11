import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
    const { t } = useLanguage();

    return (
        <footer className="bg-gray-800 border-t border-gray-700 mt-8">
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="text-center">
                    <div className="bg-gray-900 rounded-xl p-4">
                        <h3 className="text-lg font-bold text-white mb-3">
                            Contact Us
                        </h3>
                        
                        {/* Contact Buttons */}
                        <div className="flex justify-center gap-3 mb-4">
                            <a 
                                href="https://line.me/ti/p/@kanokproduct" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                <span className="text-lg">💬</span>
                                <span className="text-sm font-medium">Line</span>
                            </a>
                            
                            <a 
                                href="https://www.facebook.com/kanokproduct" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                <span className="text-lg">📘</span>
                                <span className="text-sm font-medium">Facebook</span>
                            </a>
                            
                            <a 
                                href="tel:024511111" 
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                <span className="text-lg">📞</span>
                                <span className="text-sm font-medium">Phone</span>
                            </a>
                        </div>

                        {/* Contact Information */}
                        <div className="text-gray-300 text-sm space-y-1">
                            <p className="font-semibold text-white">KANOK PRODUCT</p>
                            <p>โทร. 02-451-1111 กด 2</p>
                            <p>15 ซอย พระยามนธาตุ แยก 10</p>
                            <p>ถนน บางขุนเทียน แขวง คลองบางบอน</p>
                            <p>เขต บางบอน กรุงเทพ 10150</p>
                            <p>Thailand</p>
                        </div>
                    </div>
                    
                    {/* Copyright */}
                    <div className="mt-4 text-gray-400 text-xs">
                        © 2024 KANOK PRODUCT. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer; 