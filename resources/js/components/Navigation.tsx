// resources/js/components/Navigation.tsx
import React from 'react';
import { Link, usePage } from '@inertiajs/react';

interface NavItem {
    name: string;
    href: string;
    icon: string;
    description?: string;
    badge?: string;
}

const Navigation: React.FC = () => {
    const { url } = usePage();

    const navItems: NavItem[] = [
        {
            name: 'Dashboard',
            href: '/dashboard',
            icon: '🏠',
            description: 'ภาพรวมและสถิติ'
        },
        {
            name: 'Farm Planner',
            href: '/planner',
            icon: '🌾',
            description: 'วางแผนเกษตรแปลงใหญ่'
        },
        {
            name: 'Home Garden',
            href: '/home-garden/planner',
            icon: '🏡',
            description: 'ระบบรดน้ำสวนบ้าน',
            badge: 'New'
        },
        {
            name: 'Equipment',
            href: '/equipment-crud',
            icon: '⚙️',
            description: 'จัดการอุปกรณ์'
        },
        {
            name: 'Product',
            href: '/product',
            icon: '📦',
            description: 'แนะนำผลิตภัณฑ์'
        }
    ];

    const isActive = (href: string): boolean => {
        if (href === '/dashboard') {
            return url === href;
        }
        return url.startsWith(href);
    };

    return (
        <nav className="bg-gray-800 border-b border-gray-700 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <h1 className="text-xl font-bold text-white">
                                🌱 AgriTech Planner
                            </h1>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`relative inline-flex items-center px-3 pt-1 border-b-2 text-sm font-medium transition-all duration-200 ${
                                        isActive(item.href)
                                            ? 'border-blue-500 text-blue-400 bg-gray-700/50'
                                            : 'border-transparent text-gray-300 hover:border-gray-300 hover:text-gray-200 hover:bg-gray-700/30'
                                    }`}
                                >
                                    <span className="mr-2 text-lg">{item.icon}</span>
                                    <span>{item.name}</span>
                                    {item.badge && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                    
                    {/* User Menu - Optional */}
                    <div className="flex items-center">
                        <div className="text-sm text-gray-400">
                            🌟 สร้างระบบรดน้ำในฝัน
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            <div className="sm:hidden border-t border-gray-700">
                <div className="pt-2 pb-3 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`block pl-3 pr-4 py-3 border-l-4 text-base font-medium transition-all duration-200 ${
                                isActive(item.href)
                                    ? 'bg-blue-900/50 border-blue-500 text-blue-400'
                                    : 'border-transparent text-gray-300 hover:bg-gray-700 hover:border-gray-300 hover:text-gray-200'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="mr-3 text-xl">{item.icon}</span>
                                    <div>
                                        <div className="flex items-center">
                                            {item.name}
                                            {item.badge && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </div>
                                        {item.description && (
                                            <div className="text-xs text-gray-400 mt-1">
                                                {item.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {isActive(item.href) && (
                                    <span className="text-blue-400">●</span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
};

export default Navigation;