// resources/js/components/Navigation.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { cropTypes } from '@/pages/utils/cropData';

interface NavItem {
    name: string;
    href: string;
    icon: string;
    description?: string;
    badge?: string;
}

const Navigation: React.FC = () => {
    // Defensive usePage call with error handling
    let url = '';
    try {
        url = usePage().url;
    } catch (error) {
        console.warn('Inertia context not available in Navigation, using fallback values');
        url = '';
    }
    
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const navItems: NavItem[] = [
        {
            name: 'Dashboard',
            href: '/dashboard',
            icon: '🏠',
            description: 'ภาพรวมและสถิติ',
        },
        {
            name: 'Farm Planner',
            href: '/planner',
            icon: '🌾',
            description: 'วางแผนเกษตรแปลงใหญ่',
        },
        {
            name: 'Home Garden',
            href: '/home-garden/planner',
            icon: '🏡',
            description: 'ระบบรดน้ำสวนบ้าน',
            badge: 'New',
        },
        {
            name: 'Equipment',
            href: '/equipment-crud',
            icon: '⚙️',
            description: 'จัดการอุปกรณ์',
        },
        {
            name: 'Product',
            href: '/product',
            icon: '📦',
            description: 'แนะนำผลิตภัณฑ์',
        },
    ];

    const isActive = (href: string): boolean => {
        if (href === '/dashboard') {
            return url === href;
        }
        return url.startsWith(href);
    };

    return (
        <nav className="border-b border-gray-700 bg-gray-800 shadow-lg">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 justify-between">
                    <div className="flex">
                        <div className="flex flex-shrink-0 items-center">
                            <h1 className="text-xl font-bold text-white">🌱 AgriTech Planner</h1>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`relative inline-flex items-center border-b-2 px-3 pt-1 text-sm font-medium transition-all duration-200 ${
                                        isActive(item.href)
                                            ? 'border-blue-500 bg-gray-700/50 text-blue-400'
                                            : 'border-transparent text-gray-300 hover:border-gray-300 hover:bg-gray-700/30 hover:text-gray-200'
                                    }`}
                                >
                                    <span className="mr-2 text-lg">{item.icon}</span>
                                    <span>{item.name}</span>
                                    {item.badge && (
                                        <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </div>

                        {/* Field Crop Dropdown */}
                        <div className="relative ml-4" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="inline-flex items-center border-b-2 border-transparent px-3 pt-1 text-sm font-medium text-gray-300 transition-all duration-200 hover:border-gray-300 hover:bg-gray-700/30 hover:text-gray-200"
                            >
                                <span className="mr-2 text-lg">🌾</span>
                                <span>Field Crops</span>
                                <svg
                                    className="ml-1 h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border border-gray-700 bg-gray-800 shadow-lg">
                                    <div className="py-1">
                                        {cropTypes.map((crop) => (
                                            <Link
                                                key={crop.value}
                                                href={`/field-crop?crop_type=${crop.value}`}
                                                className="flex items-center px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                                                onClick={() => setIsDropdownOpen(false)}
                                            >
                                                <span className="mr-3 text-lg">{crop.icon}</span>
                                                <span>{crop.name}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User Menu - Optional */}
                    <div className="flex items-center">
                        <div className="text-sm text-gray-400">🌟 สร้างระบบรดน้ำในฝัน</div>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            <div className="border-t border-gray-700 sm:hidden">
                <div className="space-y-1 pb-3 pt-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`block border-l-4 py-3 pl-3 pr-4 text-base font-medium transition-all duration-200 ${
                                isActive(item.href)
                                    ? 'border-blue-500 bg-blue-900/50 text-blue-400'
                                    : 'border-transparent text-gray-300 hover:border-gray-300 hover:bg-gray-700 hover:text-gray-200'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="mr-3 text-xl">{item.icon}</span>
                                    <div>
                                        <div className="flex items-center">
                                            {item.name}
                                            {item.badge && (
                                                <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </div>
                                        {item.description && (
                                            <div className="mt-1 text-xs text-gray-400">
                                                {item.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {isActive(item.href) && <span className="text-blue-400">●</span>}
                            </div>
                        </Link>
                    ))}

                    {/* Mobile Field Crop Dropdown */}
                    <div className="border-t border-gray-700 pt-2">
                        <div className="px-3 py-2 text-base font-medium text-gray-400">
                            🌾 Field Crops
                        </div>
                        <div className="space-y-1 pl-6">
                            {cropTypes.map((crop) => (
                                <Link
                                    key={crop.value}
                                    href={`/field-crop?crop_type=${crop.value}`}
                                    className="flex items-center border-l-4 border-transparent py-2 pl-3 pr-4 text-sm font-medium text-gray-300 transition-all duration-200 hover:border-gray-300 hover:bg-gray-700 hover:text-gray-200"
                                >
                                    <span className="mr-3 text-lg">{crop.icon}</span>
                                    <span>{crop.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;
