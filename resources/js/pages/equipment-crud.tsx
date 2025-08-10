/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    Search,
    Filter,
    Save,
    X,
    Upload,
    Eye,
    Package,
    Tag,
    Settings,
    Grid,
    List,
    ChevronDown,
    ChevronRight,
    Info,
    Wrench,
    AlertCircle,
    CheckCircle,
    XCircle,
    Star,
    TrendingUp,
    BarChart3,
    ChevronLeft,
    ChevronFirst,
    ChevronLast,
    Loader2,
    RefreshCw,
    ImageIcon,
    Camera,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';
import { getImageUrl } from '@/utils/url';

declare global {
    interface Window {
        Swal: any;
    }
}

const showAlert = {
    success: (title: string, text = '') => {
        if (typeof window !== 'undefined' && window.Swal) {
            return window.Swal.fire({
                icon: 'success',
                title: title,
                text: text,
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#10b981',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });
        } else {
            alert(`${title}${text ? '\n' + text : ''}`);
            return Promise.resolve({ isConfirmed: true });
        }
    },
    error: (title: string, text = '') => {
        if (typeof window !== 'undefined' && window.Swal) {
            return window.Swal.fire({
                icon: 'error',
                title: title,
                text: text,
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#ef4444',
            });
        } else {
            alert(`${title}${text ? '\n' + text : ''}`);
            return Promise.resolve({ isConfirmed: true });
        }
    },
    warning: (title: string, text = '') => {
        if (typeof window !== 'undefined' && window.Swal) {
            return window.Swal.fire({
                icon: 'warning',
                title: title,
                text: text,
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#f59e0b',
            });
        } else {
            alert(`${title}${text ? '\n' + text : ''}`);
            return Promise.resolve({ isConfirmed: true });
        }
    },
    confirm: (title: string, text = '') => {
        if (typeof window !== 'undefined' && window.Swal) {
            return window.Swal.fire({
                icon: 'question',
                title: title,
                text: text,
                showCancelButton: true,
                confirmButtonText: 'ยืนยัน',
                cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
            });
        } else {
            const result = confirm(`${title}${text ? '\n' + text : ''}`);
            return Promise.resolve({ isConfirmed: result });
        }
    },
    info: (title: string, text = '') => {
        if (typeof window !== 'undefined' && window.Swal) {
            return window.Swal.fire({
                icon: 'info',
                title: title,
                text: text,
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#3b82f6',
            });
        } else {
            alert(`${title}${text ? '\n' + text : ''}`);
            return Promise.resolve({ isConfirmed: true });
        }
    },
};

const apiRequest = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(`/api${url}`, {
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...options.headers,
        },
        ...options,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data;
};

const getAllEquipments = async (params?: any): Promise<Equipment[]> => {
    try {
        const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
        const fullUrl = `/equipments${queryString}`;
        const data = await apiRequest(fullUrl);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
};

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

interface EquipmentCategory {
    id: number;
    name: string;
    display_name: string;
    description?: string;
    icon?: string;
    attributes?: EquipmentAttribute[];
    equipments_count?: number;
    created_at?: string;
    updated_at?: string;
}

interface EquipmentAttribute {
    _isNew: any;
    id: number;
    category_id: number;
    attribute_name: string;
    display_name: string;
    data_type: 'string' | 'number' | 'array' | 'boolean' | 'json';
    unit?: string;
    is_required: boolean;
    validation_rules?: any;
    sort_order: number;
}

interface Equipment {
    categoryId: number;
    id: number;
    category_id: number;
    product_code: string;
    productCode?: string;
    name: string;
    brand?: string;
    image?: string;
    price: number;
    stock?: number;
    description?: string;
    is_active: boolean;
    category?: EquipmentCategory;
    attributes?: { [key: string]: any };
    attributes_raw?: { [key: string]: any };
    formatted_attributes?: any[];
    pumpAccessories?: PumpAccessory[];
    pumpAccessory?: PumpAccessory[];
    pump_accessories?: PumpAccessory[];
    created_at?: string;
    updated_at?: string;
}

interface PumpAccessory {
    id?: number;
    pump_id?: number;
    equipment_id?: number | null;
    product_code?: string;
    name: string;
    image?: string;
    size?: string;
    price: number;
    stock?: number;
    quantity: number;
    is_included: boolean;
    sort_order: number;
    description?: string;
}

interface FilterOptions {
    search: string;
    categoryId: number | null;
    priceRange: [number, number];
    status: 'all' | 'active' | 'inactive';
    sortBy: 'name' | 'price' | 'created_at' | 'productCode';
    sortOrder: 'asc' | 'desc';
}

const api = {
    getCategories: async (): Promise<EquipmentCategory[]> => {
        try {
            return await apiRequest('/equipment-categories');
        } catch (error) {
            console.error('API Error:', error);
            return [];
        }
    },

    createCategory: async (category: Partial<EquipmentCategory>): Promise<EquipmentCategory> => {
        return await apiRequest('/equipment-categories', {
            method: 'POST',
            body: JSON.stringify(category),
        });
    },

    updateCategory: async (
        id: number,
        category: Partial<EquipmentCategory>
    ): Promise<EquipmentCategory> => {
        return await apiRequest(`/equipment-categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(category),
        });
    },

    deleteCategory: async (id: number): Promise<void> => {
        await apiRequest(`/equipment-categories/${id}`, {
            method: 'DELETE',
        });
    },

    getAllEquipments: async (params?: any): Promise<Equipment[]> => {
        try {
            const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
            const data = await apiRequest(`/equipments${queryString}`);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('API Error:', error);
            return [];
        }
    },

    getEquipmentsByCategory: async (categoryId: number): Promise<Equipment[]> => {
        try {
            const data = await apiRequest(`/equipments/by-category-id/${categoryId}`);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('API Error:', error);
            return [];
        }
    },

    createEquipment: async (equipment: Partial<Equipment>): Promise<Equipment> => {
        return await apiRequest('/equipments', {
            method: 'POST',
            body: JSON.stringify(equipment),
        });
    },

    updateEquipment: async (id: number, equipment: Partial<Equipment>): Promise<Equipment> => {
        return await apiRequest(`/equipments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(equipment),
        });
    },

    deleteEquipment: async (id: number): Promise<void> => {
        await apiRequest(`/equipments/${id}`, {
            method: 'DELETE',
        });
    },

    searchEquipments: async (filters: Partial<FilterOptions>): Promise<Equipment[]> => {
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.categoryId) params.append('category_id', filters.categoryId.toString());
            if (filters.status && filters.status !== 'all') {
                params.append('is_active', filters.status === 'active' ? 'true' : 'false');
            }

            const data = await apiRequest(`/equipments/search?${params.toString()}`);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Search Error:', error);
            return [];
        }
    },

    bulkUpdate: async (ids: number[], updates: any): Promise<void> => {
        await apiRequest('/equipments/bulk-update', {
            method: 'POST',
            body: JSON.stringify({ ids, updates }),
        });
    },

    bulkDelete: async (ids: number[]): Promise<void> => {
        await apiRequest('/equipments/bulk-delete', {
            method: 'POST',
            body: JSON.stringify({ ids }),
        });
    },

    uploadImage: async (file: File): Promise<{ url: string; path: string }> => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/images/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to upload image');
        }

        return response.json();
    },

    getStats: async (): Promise<any> => {
        try {
            return await apiRequest('/equipments/stats');
        } catch (error) {
            console.error('Stats Error:', error);
            return {};
        }
    },

    validateProductCode: async (productCode: string, excludeId?: number): Promise<boolean> => {
        try {
            if (!productCode || productCode.trim() === '' || productCode === '-') {
                return true;
            }

            const params = new URLSearchParams();
            params.append('product_code', productCode);
            if (excludeId) {
                params.append('exclude_id', excludeId.toString());
            }

            const response = await apiRequest(
                `/equipments/validate-product-code?${params.toString()}`
            );
            return response.is_valid;
        } catch (error) {
            console.error('Product code validation error:', error);
            return false;
        }
    },
};

const Pagination: React.FC<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
    itemsPerPage: number;
}> = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
    const { t } = useLanguage();
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages: number[] = [];
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return pages;
    };

    if (totalPages <= 1) return null;
    return (
        <div className="mt-6 flex items-center justify-center gap-2">
            <div className="mr-4 text-sm text-gray-400">
                {t('แสดง')} {startItem}-{endItem} {t('จาก')} {totalItems} {t('รายการ')}
            </div>

            <button
                className="rounded border border-gray-600 bg-gray-700 px-3 py-1 text-white hover:bg-gray-600 disabled:opacity-50"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                title={t('หน้าแรก')}
            >
                <ChevronFirst className="h-4 w-4" />
            </button>

            <button
                className="rounded border border-gray-600 bg-gray-700 px-3 py-1 text-white hover:bg-gray-600 disabled:opacity-50"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title={t('หน้าก่อนหน้า')}
            >
                <ChevronLeft className="h-4 w-4" />
            </button>

            {getPageNumbers().map((page) => (
                <button
                    key={page}
                    className={`rounded border px-3 py-1 ${
                        page === currentPage
                            ? 'border-blue-500 bg-blue-600 text-white'
                            : 'border-gray-600 bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                    onClick={() => onPageChange(page)}
                >
                    {page}
                </button>
            ))}

            <button
                className="rounded border border-gray-600 bg-gray-700 px-3 py-1 text-white hover:bg-gray-600 disabled:opacity-50"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title={t('หน้าถัดไป')}
            >
                <ChevronRight className="h-4 w-4" />
            </button>

            <button
                className="rounded border border-gray-600 bg-gray-700 px-3 py-1 text-white hover:bg-gray-600 disabled:opacity-50"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                title={t('หน้าสุดท้าย')}
            >
                <ChevronLast className="h-4 w-4" />
            </button>
        </div>
    );
};

const CategoryForm: React.FC<{
    category?: EquipmentCategory;
    onSave: (category: Partial<EquipmentCategory>) => void;
    onCancel: () => void;
}> = ({ category, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: category?.name || '',
        display_name: category?.display_name || '',
        description: category?.description || '',
        icon: category?.icon || '',
        attributes: category?.attributes || [],
    });

    const [newAttribute, setNewAttribute] = useState({
        attribute_name: '',
        display_name: '',
        data_type: 'string' as const,
        unit: '',
        is_required: false,
        sort_order: 0,
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const { t } = useLanguage();

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name.trim()) {
            newErrors.name = t('กรุณากรอกชื่อระบบ');
        } else if (!/^[a-z0-9_]+$/.test(formData.name)) {
            newErrors.name = t(
                'ชื่อระบบต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์เล็ก ตัวเลข และ underscore เท่านั้น'
            );
        }

        if (!formData.display_name.trim()) {
            newErrors.display_name = t('กรุณากรอกชื่อแสดง');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const addAttribute = () => {
        if (!newAttribute.attribute_name || !newAttribute.display_name) {
            showAlert.warning(t('ข้อมูลไม่ครบถ้วน'), t('กรุณากรอกชื่อระบบและชื่อแสดงของคุณสมบัติ'));
            return;
        }

        // @ts-expect-error
        setFormData((prev) => {
            const newAttr = {
                ...newAttribute,
                category_id: category?.id || 0,
                sort_order: prev.attributes.length,
                _isNew: true,
            };

            return {
                ...prev,
                attributes: [...prev.attributes, newAttr],
            };
        });

        setNewAttribute({
            attribute_name: '',
            display_name: '',
            data_type: 'string',
            unit: '',
            is_required: false,
            sort_order: 0,
        });
    };

    const handleSubmit = () => {
        if (!validateForm()) {
            showAlert.error(t('ข้อมูลไม่ถูกต้อง'), t('กรุณาตรวจสอบข้อมูลที่กรอกใหม่อีกครั้ง'));
            return;
        }

        const processedAttributes = formData.attributes.map((attr) => {
            if (attr._isNew) {
                const { id, _isNew, ...newAttr } = attr;
                return newAttr;
            }
            return attr;
        });

        const dataToSend = {
            ...formData,
            attributes: processedAttributes,
        };
        onSave(dataToSend as Partial<EquipmentCategory>);
    };

    const removeAttribute = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            attributes: prev.attributes.filter((_, i) => i !== index),
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black bg-opacity-50 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-gray-800 text-white shadow-2xl">
                <div className="p-6">
                    <h2 className="mb-4 text-xl font-bold">
                        {category ? t('แก้ไขหมวดหมู่') : t('เพิ่มหมวดหมู่ใหม่')}
                    </h2>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    {t('ชื่อหมวดหมู่ (ภาษาอังกฤษ)')} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => {
                                        setFormData((prev) => ({ ...prev, name: e.target.value }));
                                        if (errors.name) {
                                            setErrors((prev) => ({ ...prev, name: '' }));
                                        }
                                    }}
                                    className={`w-full rounded-lg border bg-gray-700 p-3 focus:ring-2 focus:ring-blue-500 ${
                                        errors.name ? 'border-red-500' : 'border-gray-600'
                                    }`}
                                    placeholder={t('เช่น sprinkler, pump')}
                                    required
                                />
                                {errors.name && (
                                    <div className="mt-1 text-xs text-red-400">{errors.name}</div>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    {t('ชื่อหมวดหมู่ (ภาษาไทย)')} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.display_name}
                                    onChange={(e) => {
                                        setFormData((prev) => ({
                                            ...prev,
                                            display_name: e.target.value,
                                        }));
                                        if (errors.display_name) {
                                            setErrors((prev) => ({ ...prev, display_name: '' }));
                                        }
                                    }}
                                    className={`w-full rounded-lg border bg-gray-700 p-3 focus:ring-2 focus:ring-blue-500 ${
                                        errors.display_name ? 'border-red-500' : 'border-gray-600'
                                    }`}
                                    placeholder={t('เช่น สปริงเกอร์, ปั๊มน้ำ')}
                                    required
                                />
                                {errors.display_name && (
                                    <div className="mt-1 text-xs text-red-400">
                                        {errors.display_name}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-gray-600 pt-6">
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                                {t('คุณสมบัติเฉพาะ')}
                                <p className="text-xs text-gray-400">
                                    (เพิ่มเติมจาก รหัสสินค้า, ชื่อสินค้า, ราคา, จำนวนสินค้า(stock))
                                </p>
                            </h3>

                            <div className="mb-4 rounded-lg bg-gray-700 p-4">
                                <h4 className="mb-3 font-medium">{t('เพิ่มคุณสมบัติเพิ่มเติม')}</h4>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5">
                                    <input
                                        type="text"
                                        placeholder={t('ชื่อระบบ (attribute_name)')}
                                        value={newAttribute.attribute_name}
                                        onChange={(e) =>
                                            setNewAttribute((prev) => ({
                                                ...prev,
                                                attribute_name: e.target.value,
                                            }))
                                        }
                                        className="rounded border border-gray-600 bg-gray-600 p-2 focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder={t('ชื่อแสดง')}
                                        value={newAttribute.display_name}
                                        onChange={(e) =>
                                            setNewAttribute((prev) => ({
                                                ...prev,
                                                display_name: e.target.value,
                                            }))
                                        }
                                        className="rounded border border-gray-600 bg-gray-600 p-2 focus:ring-2 focus:ring-blue-500"
                                    />
                                    <select
                                        value={newAttribute.data_type}
                                        onChange={(e) =>
                                            setNewAttribute((prev) => ({
                                                ...prev,
                                                data_type: e.target.value as any,
                                            }))
                                        }
                                        className="rounded border border-gray-600 bg-gray-600 p-2 focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="string">{t('ตัวอักษร')}</option>
                                        <option value="number">{t('ตัวเลข')}</option>
                                        <option value="array">{t('ช่วง ต่ำ-สูง')}</option>
                                        <option value="boolean">{t('Boolean')}</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder={t('หน่วย')}
                                        value={newAttribute.unit}
                                        onChange={(e) =>
                                            setNewAttribute((prev) => ({
                                                ...prev,
                                                unit: e.target.value,
                                            }))
                                        }
                                        className="rounded border border-gray-600 bg-gray-600 p-2 focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={newAttribute.is_required}
                                            onChange={(e) =>
                                                setNewAttribute((prev) => ({
                                                    ...prev,
                                                    is_required: e.target.checked,
                                                }))
                                            }
                                            className="h-4 w-4"
                                        />
                                        <span className="text-sm">{t('จำเป็น')}</span>
                                        <button
                                            type="button"
                                            onClick={addAttribute}
                                            className="ml-2 rounded bg-green-600 px-3 py-1 text-white transition-colors hover:bg-green-700"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {formData.attributes.length > 0 && (
                                <div className="space-y-2">
                                    {formData.attributes.map((attr, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-3 rounded bg-gray-700 p-3"
                                        >
                                            <div className="flex-1">
                                                <span className="font-medium">
                                                    {attr.display_name}
                                                </span>
                                                <span className="ml-2 text-sm text-gray-400">
                                                    ({attr.attribute_name})
                                                </span>
                                                <span className="ml-2 text-xs text-blue-400">
                                                    {attr.data_type}
                                                </span>
                                                {attr.unit && (
                                                    <span className="ml-2 text-xs text-green-400">
                                                        {attr.unit}
                                                    </span>
                                                )}
                                                {attr.is_required && (
                                                    <span className="ml-2 text-xs text-red-400">
                                                        *
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeAttribute(index)}
                                                className="p-1 text-red-400 transition-colors hover:text-red-300"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-4 border-t border-gray-600 pt-6">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex items-center rounded-lg border border-gray-600 px-6 py-3 text-gray-300 transition-colors hover:bg-gray-700"
                            >
                                <X className="mr-2 h-4 w-4" />
                                {t('ยกเลิก')}
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex items-center rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {t('บันทึก')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Searchable Dropdown Component
const SearchableDropdown: React.FC<{
    options: Equipment[];
    value: number | null;
    onChange: (value: number | null) => void;
    placeholder: string;
    loading?: boolean;
}> = ({ options, value, onChange, placeholder, loading = false }) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const selectedOption = options.find((opt) => opt.id === value);

    const filteredOptions = options.filter((option) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            option.name.toLowerCase().includes(searchLower) ||
            (option.description && option.description.toLowerCase().includes(searchLower)) ||
            (option.product_code && option.product_code.toLowerCase().includes(searchLower))
        );
    });

    const handleSelect = (optionId: number | null) => {
        onChange(optionId);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between rounded border border-gray-600 bg-gray-600 p-2 text-left text-white focus:ring-2 focus:ring-blue-500"
                disabled={loading}
            >
                <span className="truncate">
                    {loading
                        ? t('กำลังโหลด...')
                        : selectedOption
                        ? selectedOption.name
                        : placeholder}
                </span>
                <ChevronDown
                    className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-hidden rounded border border-gray-600 bg-gray-700 shadow-lg">
                    <div className="border-b border-gray-600 p-2">
                        <input
                            type="text"
                            placeholder={t('ค้นหาอุปกรณ์...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded border border-gray-600 bg-gray-600 p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                    </div>

                    <div className="max-h-48 overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => handleSelect(null)}
                            className="w-full border-b border-gray-600 p-2 text-left text-gray-400 hover:bg-gray-600"
                        >
                            {t('ไม่เลือก')}
                        </button>

                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-center text-gray-400">{t('ไม่พบอุปกรณ์')}</div>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleSelect(option.id)}
                                    className={`w-full border-b border-gray-600 p-2 text-left hover:bg-gray-600 ${
                                        value === option.id
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-200'
                                    }`}
                                >
                                    <div className="font-medium">{option.name}</div>
                                    {option.product_code && (
                                        <div className="text-xs text-gray-400">
                                            รหัส: {option.product_code}
                                        </div>
                                    )}
                                    {option.description && (
                                        <div className="truncate text-xs text-gray-400">
                                            {option.description}
                                        </div>
                                    )}
                                    <div className="text-xs text-green-400">
                                        ฿{option.price.toLocaleString()}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const PumpAccessoryForm: React.FC<{
    accessories: PumpAccessory[];
    onChange: (accessories: PumpAccessory[]) => void;
    onImageClick?: (src: string, alt: string) => void;
}> = ({ accessories, onChange, onImageClick }) => {
    const { t } = useLanguage();

    const [availableEquipments, setAvailableEquipments] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(false);
    const [equipmentDetails, setEquipmentDetails] = useState<{ [key: number]: Equipment }>({});

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(accessories.length / itemsPerPage);
    const paginatedAccessories = accessories.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        const loadAvailableEquipments = async () => {
            setLoading(true);
            try {
                const response = await apiRequest('/equipments');

                const pumpEquipments = response.filter((eq: Equipment) => {
                    const categoryMatches = [
                        eq.category?.name === 'pump_equipment',
                        eq.category?.display_name === 'อุปกรณ์ปั๊ม',
                    ];

                    return categoryMatches.some((match) => match === true);
                });

                setAvailableEquipments(pumpEquipments);

                if (pumpEquipments.length === 0) {
                    try {
                        const pumpResponse = await apiRequest('/equipments/pump-equipments');
                        if (pumpResponse && pumpResponse.length > 0) {
                            setAvailableEquipments(pumpResponse);
                        }
                    } catch (pumpError) {
                        console.error('Pump equipments API failed:', pumpError);
                    }
                }
            } catch (error) {
                console.error('Failed to load equipments:', error);
                showAlert.error(t('เกิดข้อผิดพลาด'), t('ไม่สามารถโหลดรายการอุปกรณ์ได้'));
            } finally {
                setLoading(false);
            }
        };

        loadAvailableEquipments();
    }, [t]);

    const fetchEquipmentDetails = async (equipmentId: number) => {
        if (equipmentDetails[equipmentId]) {
            return equipmentDetails[equipmentId];
        }

        try {
            const response = await apiRequest(`/equipments/${equipmentId}`);

            setEquipmentDetails((prev) => ({
                ...prev,
                [equipmentId]: response,
            }));

            return response;
        } catch (error) {
            console.error(`Failed to fetch equipment ${equipmentId} details:`, error);
            return null;
        }
    };

    const updateAccessory = async (index: number, field: keyof PumpAccessory, value: any) => {
        const actualIndex = (currentPage - 1) * itemsPerPage + index;
        const updated = [...accessories];

        if (field === 'equipment_id') {
            if (value) {
                let selectedEquipment = availableEquipments.find((eq) => eq.id === value);

                if (!selectedEquipment?.description || selectedEquipment.description === '') {
                    const fullDetails = await fetchEquipmentDetails(value);
                    if (fullDetails) {
                        selectedEquipment = {
                            ...selectedEquipment,
                            ...fullDetails,
                            description:
                                fullDetails.description || selectedEquipment?.description || '',
                        };
                    }
                }

                if (selectedEquipment) {
                    updated[actualIndex] = {
                        ...updated[actualIndex],
                        equipment_id: value,
                        name: selectedEquipment.name || '',
                        image: selectedEquipment.image || '',
                        price: selectedEquipment.price || 0,
                        stock: selectedEquipment.stock || 0,
                        product_code:
                            selectedEquipment.product_code || selectedEquipment.productCode || '',
                        description: selectedEquipment.description || '',
                    };
                } else {
                    console.warn(`Equipment with ID ${value} not found`);
                }
            } else {
                updated[actualIndex] = {
                    ...updated[actualIndex],
                    equipment_id: null,
                    name: '',
                    image: '',
                    price: 0,
                    stock: 0,
                    product_code: '',
                    description: '',
                };
            }
        } else {
            (updated[actualIndex] as any)[field] = value;
        }

        onChange(updated);
    };

    const addAccessory = () => {
        const newAccessory: PumpAccessory = {
            equipment_id: null,
            product_code: '',
            name: '',
            image: '',
            size: '',
            price: 0,
            stock: 0,
            quantity: 1,
            is_included: true,
            description: '',
            sort_order: 0,
        };

        const updatedExistingAccessories = accessories.map((acc) => ({
            ...acc,
            sort_order: acc.sort_order + 1,
        }));

        const updatedAccessories = [newAccessory, ...updatedExistingAccessories];
        onChange(updatedAccessories);
        setCurrentPage(1);
    };

    const addBulkAccessories = async () => {
        const count = parseInt(prompt(t('กรอกจำนวน (1-20):')) || '5');
        if (isNaN(count) || count < 1 || count > 20) {
            showAlert.warning(t('จำนวนไม่ถูกต้อง'), t('กรุณากรอกจำนวน 1-20'));
            return;
        }

        const newAccessories: PumpAccessory[] = [];
        for (let i = 0; i < count; i++) {
            newAccessories.push({
                equipment_id: null,
                product_code: '',
                name: '',
                image: '',
                size: '',
                price: 0,
                stock: 0,
                quantity: 1,
                is_included: true,
                description: '',
                sort_order: i,
            });
        }

        const updatedExistingAccessories = accessories.map((acc) => ({
            ...acc,
            sort_order: acc.sort_order + count,
        }));

        const updatedAccessories = [...newAccessories, ...updatedExistingAccessories];
        onChange(updatedAccessories);
        setCurrentPage(1);
    };

    const removeAccessory = (index: number) => {
        const actualIndex = (currentPage - 1) * itemsPerPage + index;
        const updated = accessories.filter((_, i) => i !== actualIndex);
        updated.forEach((acc, i) => {
            acc.sort_order = i;
        });
        onChange(updated);

        const newTotalPages = Math.ceil(updated.length / itemsPerPage);
        if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(newTotalPages);
        }
    };

    const moveAccessory = (fromIndex: number, toIndex: number) => {
        const actualFromIndex = (currentPage - 1) * itemsPerPage + fromIndex;
        const actualToIndex = (currentPage - 1) * itemsPerPage + toIndex;

        if (actualToIndex < 0 || actualToIndex >= accessories.length) return;

        const updated = [...accessories];
        const [movedItem] = updated.splice(actualFromIndex, 1);
        updated.splice(actualToIndex, 0, movedItem);

        updated.forEach((acc, i) => {
            acc.sort_order = i;
        });
        onChange(updated);
    };

    const clearAllAccessories = async () => {
        const result = await showAlert.confirm(
            t('ยืนยันการลบ'),
            t('คุณต้องการลบอุปกรณ์ทั้งหมดหรือไม่?')
        );
        if (result.isConfirmed) {
            onChange([]);
            setCurrentPage(1);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-orange-400">
                    {t('อุปกรณ์ประกอบปั๊ม')} ({accessories.length} {t('รายการ')})
                </h4>
                <div className="flex gap-2">
                    {accessories.length > 0 && (
                        <>
                            <button
                                type="button"
                                onClick={clearAllAccessories}
                                className="flex items-center rounded bg-red-600 px-3 py-2 text-white transition-colors hover:bg-red-700"
                            >
                                <Trash2 className="mr-1 h-4 w-4" />
                                {t('ลบทั้งหมด')}
                            </button>
                            <button
                                type="button"
                                onClick={addBulkAccessories}
                                className="flex items-center rounded bg-blue-600 px-3 py-2 text-white transition-colors hover:bg-blue-700"
                            >
                                <Plus className="mr-1 h-4 w-4" />
                                {t('เพิ่มหลายรายการ')}
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={addAccessory}
                        className="flex items-center rounded bg-green-600 px-3 py-2 text-white transition-colors hover:bg-green-700"
                    >
                        <Plus className="mr-1 h-4 w-4" />
                        {t('เพิ่มอุปกรณ์')}
                    </button>
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                    <span className="ml-2 text-gray-400">{t('กำลังโหลดอุปกรณ์...')}</span>
                </div>
            )}

            {accessories.length === 0 ? (
                <div className="rounded-lg border border-gray-600 bg-gray-700 p-6 text-center">
                    <Wrench className="mx-auto h-12 w-12 text-gray-500" />
                    <p className="mt-2 text-gray-400">{t('ยังไม่มีอุปกรณ์ประกอบ')}</p>
                    <p className="text-sm text-gray-500">
                        {t('คลิก "เพิ่มอุปกรณ์" เพื่อเริ่มต้น')}
                    </p>
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        {paginatedAccessories.map((accessory, index) => (
                            <div
                                key={index}
                                className="rounded-lg border border-gray-600 bg-gray-700 p-1"
                            >
                                <div className="grid grid-cols-12 items-center gap-4">
                                    {/* Control buttons */}
                                    <div className="col-span-1 flex flex-col items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="rounded bg-orange-600 px-2 py-1 text-xs text-white">
                                                #{(currentPage - 1) * itemsPerPage + index + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeAccessory(index)}
                                                className="rounded p-1 text-red-400 transition-colors hover:text-red-300"
                                                title={t('ลบ')}
                                            >
                                                ลบ
                                            </button>
                                        </div>
                                    </div>

                                    {/* Image display */}
                                    <div className="col-span-1">
                                        <div className="flex items-center justify-start">
                                            {accessory.image ? (
                                                <img
                                                    src={getImageUrl(accessory.image)} // <<-- 2. แก้ไข
                                                    alt={accessory.name || 'อุปกรณ์'}
                                                    className="h-14 w-14 cursor-pointer rounded-lg border border-gray-600 object-cover transition-opacity hover:border-orange-400 hover:opacity-80"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        const parent = target.parentElement;
                                                        if (parent) {
                                                            const placeholder =
                                                                parent.querySelector(
                                                                    '.image-placeholder'
                                                                ) as HTMLElement;
                                                            if (placeholder)
                                                                placeholder.style.display = 'flex';
                                                        }
                                                    }}
                                                    onClick={() =>
                                                        onImageClick &&
                                                        onImageClick(
                                                            getImageUrl(accessory.image!), // <<-- 2. แก้ไข
                                                            accessory.name || 'อุปกรณ์'
                                                        )
                                                    }
                                                    title={t('คลิกเพื่อดูรูปขนาดใหญ่')}
                                                />
                                            ) : null}
                                            <div
                                                className={`image-placeholder flex h-14 w-14 items-center justify-center rounded-lg border border-gray-600 bg-gray-600 ${
                                                    accessory.image ? 'hidden' : 'flex'
                                                }`}
                                            >
                                                <ImageIcon className="h-8 w-8 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Equipment selector */}
                                    <div className="col-span-3">
                                        <SearchableDropdown
                                            options={availableEquipments}
                                            value={accessory.equipment_id || null}
                                            onChange={(value) =>
                                                updateAccessory(index, 'equipment_id', value)
                                            }
                                            placeholder={t('เลือกอุปกรณ์จากรายการ')}
                                            loading={loading}
                                        />
                                    </div>

                                    {/* Equipment details - readonly display */}
                                    <div className="col-span-4">
                                        <div className="rounded text-sm text-gray-300">
                                            {accessory.description && (
                                                <div className="text-sm text-gray-400">
                                                    {accessory.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quantity input */}
                                    <div className="col-span-2">
                                        <div className="flex-col-2 flex items-center">
                                            <p className="mr-4 text-sm text-gray-400">จำนวน</p>
                                            <input
                                                type="number"
                                                min="1"
                                                value={accessory.quantity || 1}
                                                onChange={(e) =>
                                                    updateAccessory(
                                                        index,
                                                        'quantity',
                                                        parseInt(e.target.value) || 1
                                                    )
                                                }
                                                className="w-full rounded border border-gray-600 bg-gray-600 p-2 text-white focus:ring-2 focus:ring-orange-500"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Include checkbox */}
                                    <div className="col-span-1 flex items-center justify-center">
                                        <label className="flex cursor-pointer flex-col items-center">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    accessory.is_included !== undefined
                                                        ? accessory.is_included
                                                        : true
                                                }
                                                onChange={(e) =>
                                                    updateAccessory(
                                                        index,
                                                        'is_included',
                                                        e.target.checked
                                                    )
                                                }
                                                className="mb-1 h-4 w-4"
                                            />
                                            <span className="text-center text-xs">
                                                {accessory.is_included
                                                    ? t('รวมในชุด')
                                                    : t('ซื้อเพิ่ม')}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="rounded border border-gray-600 bg-gray-700 px-3 py-1 text-white hover:bg-gray-600 disabled:opacity-50"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm text-gray-400">
                                หน้า {currentPage} จาก {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="rounded border border-gray-600 bg-gray-700 px-3 py-1 text-white hover:bg-gray-600 disabled:opacity-50"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// Enhanced Image Upload Component
const ImageUpload: React.FC<{
    currentImage?: string;
    onImageChange: (imageUrl: string) => void;
    onImageClick?: (src: string, alt: string) => void;
    loading?: boolean;
}> = ({ currentImage, onImageChange, onImageClick, loading = false }) => {
    const { t } = useLanguage();
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFiles = async (files: FileList) => {
        if (files.length === 0) return;

        const file = files[0];
        if (!file.type.startsWith('image/')) {
            showAlert.error(t('ไฟล์ไม่ถูกต้อง'), t('กรุณาเลือกไฟล์รูปภาพ'));
            return;
        }

        try {
            const result = await api.uploadImage(file);
            onImageChange(result.path); // Use result.path for relative path
            showAlert.success(t('อัปโหลดสำเร็จ'), t('รูปภาพได้รับการอัปโหลดเรียบร้อยแล้ว'));
        } catch (error) {
            console.error('Failed to upload image:', error);
            showAlert.error(t('เกิดข้อผิดพลาด'), t('ไม่สามารถอัปโหลดรูปภาพได้'));
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">{t('รูปภาพ')}</label>

            {/* Current Image Display */}
            {currentImage && (
                <div className="flex items-center gap-3">
                    <img
                        src={getImageUrl(currentImage)} // <<-- 2. แก้ไข
                        alt="Product"
                        className="h-[150px] w-[220px] cursor-pointer rounded-lg border border-gray-600 object-cover shadow-sm transition-all hover:border-blue-400 hover:opacity-80 hover:shadow-lg"
                        onClick={() => onImageClick && onImageClick(getImageUrl(currentImage), t('สินค้า'))} // <<-- 2. แก้ไข
                        title={t('คลิกเพื่อดูรูปขนาดใหญ่')}
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                                const placeholder = parent.querySelector(
                                    '.error-placeholder'
                                ) as HTMLElement;
                                if (placeholder) placeholder.style.display = 'flex';
                            }
                        }}
                    />
                    <div className="error-placeholder hidden h-20 w-20 items-center justify-center rounded-lg border border-red-500 bg-red-900/20">
                        <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <button
                        type="button"
                        onClick={() => onImageChange('')}
                        className="rounded bg-red-600 px-3 py-1 text-white transition-colors hover:bg-red-700"
                        title={t('ลบรูปภาพ')}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Upload Area */}
            {!currentImage && (
                <div
                    className={`relative h-[150px] w-full rounded-lg border-2 border-dashed p-4 text-center transition-all ${
                        dragActive
                            ? 'border-blue-400 bg-blue-900/20'
                            : 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-600'
                    } ${loading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={loading}
                    />

                    {loading ? (
                        <div className="flex flex-col items-center">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                            <p className="mt-2 text-sm text-blue-400">{t('กำลังอัปโหลด...')}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center">
                            <Camera className="h-4 w-4 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-400">
                                {t('คลิกหรือลากไฟล์รูปภาพมาที่นี่')}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                {t('รองรับ JPG, PNG, GIF (ขนาดไม่เกิน 5MB)')}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const EquipmentForm: React.FC<{
    equipment?: Equipment;
    categories: EquipmentCategory[];
    onSave: (equipment: Partial<Equipment>) => void;
    onCancel: () => void;
    onImageClick?: (src: string, alt: string) => void;
}> = ({ equipment, categories, onSave, onCancel, onImageClick }) => {
    const [formData, setFormData] = useState<Partial<Equipment>>({
        category_id: equipment?.category_id || categories[0]?.id || 1,
        product_code: equipment?.product_code || equipment?.productCode || '',
        name: equipment?.name || '',
        brand: equipment?.brand || '',
        image: equipment?.image || '',
        price: equipment?.price || 0,
        stock: equipment?.stock || 0,
        description: equipment?.description || '',
        is_active: equipment?.is_active !== undefined ? equipment.is_active : true,
        attributes: {},
    });

    const [attributes, setAttributes] = useState<EquipmentAttribute[]>([]);
    const [accessories, setAccessories] = useState<PumpAccessory[]>([]);
    const [loading, setLoading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<any>({});
    const { t } = useLanguage();

    useEffect(() => {
        if (equipment) {
            let initialAttributes = {};

            if (equipment.attributes_raw && typeof equipment.attributes_raw === 'object') {
                initialAttributes = { ...equipment.attributes_raw };
            } else if (Array.isArray(equipment.attributes)) {
                equipment.attributes.forEach((attr: any) => {
                    if (attr.attribute_name && attr.value !== undefined) {
                        (initialAttributes as any)[attr.attribute_name] = attr.value;
                    }
                });
            } else if (equipment.attributes && typeof equipment.attributes === 'object') {
                initialAttributes = { ...equipment.attributes };
            } else {
                const rootAttributes = {};
                Object.keys(equipment).forEach((key) => {
                    if (
                        ![
                            'id',
                            'category_id',
                            'categoryId',
                            'product_code',
                            'productCode',
                            'name',
                            'brand',
                            'image',
                            'price',
                            'stock',
                            'description',
                            'is_active',
                            'category',
                            'attributes',
                            'attributes_raw',
                            'formatted_attributes',
                            'pumpAccessories',
                            'pumpAccessory',
                            'created_at',
                            'updated_at',
                        ].includes(key)
                    ) {
                        (rootAttributes as any)[key] = (equipment as any)[key];
                    }
                });
                initialAttributes = rootAttributes;
            }

            setFormData({
                category_id: equipment.category_id || equipment.categoryId,
                product_code: equipment.product_code || equipment.productCode,
                name: equipment.name,
                brand: equipment.brand,
                image: equipment.image,
                price: equipment.price,
                stock: equipment.stock,
                description: equipment.description,
                is_active: equipment.is_active,
                attributes: initialAttributes,
            });

            const pumpAccessories =
                equipment.pumpAccessories ||
                equipment.pumpAccessory ||
                equipment.pump_accessories ||
                [];
            setAccessories(Array.isArray(pumpAccessories) ? pumpAccessories : []);
        } else {
            setFormData({
                category_id: categories[0]?.id || 1,
                product_code: '',
                name: '',
                brand: '',
                image: '',
                price: 0,
                stock: 0,
                description: '',
                is_active: true,
                attributes: {},
            });
            setAccessories([]);
        }
    }, [equipment, categories]);

    useEffect(() => {
        if (formData.category_id && formData.category_id !== 0) {
            setLoading(true);
            apiRequest(`/equipment-categories/${formData.category_id}`)
                .then((response) => {
                    const filteredAttributes =
                        response.attributes?.filter((attr: EquipmentAttribute) => {
                            if (
                                [
                                    'sprinkler',
                                    'pop_up_sprinkler',
                                    'mini_sprinkler',
                                    'single_side_sprinkler',
                                    'butterfly_sprinkler',
                                    'mist_nozzle',
                                    'impact_sprinkler',
                                    'gear_drive_nozzle',
                                    'drip_spray_tape',
                                ].includes(response.name)
                            ) {
                                return attr.attribute_name !== 'name';
                            }
                            return true;
                        }) || [];

                    setAttributes(filteredAttributes);

                    if (
                        !equipment ||
                        (equipment &&
                            (equipment.category_id || equipment.categoryId) !==
                                formData.category_id)
                    ) {
                        setFormData((prev) => ({
                            ...prev,
                            attributes: {},
                        }));
                        setAccessories([]);
                    }
                })
                .catch((error) => {
                    setAttributes([]);
                })
                .finally(() => setLoading(false));
        }
    }, [equipment, formData.category_id]);

    const validateForm = async () => {
        const newErrors: any = {};

        const productCode = formData.product_code?.trim() || '';
        if (productCode && productCode !== '-') {
            const isValidProductCode = await api.validateProductCode(productCode, equipment?.id);
            if (!isValidProductCode) {
                newErrors.product_code = t('รหัสสินค้านี้ถูกเพิ่มไปแล้ว');
            }
        }

        if (!formData.name?.trim()) {
            newErrors.name = t('กรุณากรอกชื่อสินค้า');
        }

        if (!formData.price || formData.price <= 0) {
            newErrors.price = t('กรุณากรอกราคาที่ถูกต้อง');
        }

        attributes.forEach((attr) => {
            if (attr.is_required) {
                const value = formData.attributes?.[attr.attribute_name];
                if (!value || (Array.isArray(value) && value.length === 0) || value === '') {
                    newErrors[`attributes.${attr.attribute_name}`] =
                        `${t('กรุณากรอก')} ${attr.display_name}`;
                }
            }
        });

        setValidationErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleImageChange = (imageUrl: string) => {
        setFormData((prev) => ({
            ...prev,
            image: imageUrl,
        }));
    };

    const handleAttributeChange = (attributeName: string, value: any) => {
        setFormData((prev) => {
            const newAttributes = {
                ...prev.attributes,
                [attributeName]: value,
            };

            return {
                ...prev,
                attributes: newAttributes,
            };
        });

        if (validationErrors[`attributes.${attributeName}`]) {
            setValidationErrors((prev: any) => {
                const newErrors = { ...prev };
                delete newErrors[`attributes.${attributeName}`];
                return newErrors;
            });
        }
    };

    const handleSubmit = async () => {
        const isFormValid = await validateForm();
        if (!isFormValid) {
            showAlert.error(t('ข้อมูลไม่ถูกต้อง'), t('กรุณาตรวจสอบข้อมูลที่กรอกใหม่อีกครั้ง'));
            return;
        }

        setLoading(true);

        const attributesData: any = {};
        attributes.forEach((attr) => {
            const value = formData.attributes?.[attr.attribute_name];
            if (value !== undefined && value !== '') {
                attributesData[attr.attribute_name] = value;
            }
        });

        const processedAccessories = accessories
            .filter((acc) => {
                const hasEquipmentId = acc.equipment_id && acc.equipment_id > 0;
                const hasManualData =
                    acc.name && acc.name.trim() !== '' && acc.price && acc.price > 0;

                return hasEquipmentId || hasManualData;
            })
            .map((acc, index) => {
                const processedAcc: any = {
                    quantity: Number(acc.quantity) || 1,
                    is_included: Boolean(acc.is_included !== undefined ? acc.is_included : true),
                    sort_order: Number(acc.sort_order !== undefined ? acc.sort_order : index),
                };

                if (acc.equipment_id && acc.equipment_id > 0) {
                    processedAcc.equipment_id = Number(acc.equipment_id);
                    processedAcc.name = acc.name || '';
                    processedAcc.price = Number(acc.price) || 0;
                    processedAcc.product_code = acc.product_code || '';
                    processedAcc.image = acc.image || '';
                    processedAcc.size = acc.size || '';
                    processedAcc.stock = acc.stock ? Number(acc.stock) : 0;
                    processedAcc.description = acc.description || '';
                } else {
                    processedAcc.equipment_id = null;
                    processedAcc.product_code = acc.product_code || '';
                    processedAcc.name = acc.name || '';
                    processedAcc.image = acc.image || '';
                    processedAcc.size = acc.size || '';
                    processedAcc.price = Number(acc.price) || 0;
                    processedAcc.stock = acc.stock ? Number(acc.stock) : 0;
                    processedAcc.description = acc.description || '';
                }

                return processedAcc;
            });

        const submitData = {
            ...formData,
            stock: formData.stock ? Number(formData.stock) : null,
            attributes: attributesData,
            pump_accessories: processedAccessories,
        };

        try {
            await onSave(submitData as Partial<Equipment>);
            showAlert.success(
                equipment ? t('แก้ไขสำเร็จ') : t('เพิ่มสำเร็จ'),
                `${formData.name} ${t('ได้รับการ')} ${equipment ? t('แก้ไข') : t('เพิ่ม')} ${t('เรียบร้อยแล้ว')}`
            );
        } catch (error: any) {
            console.error('Submit error:', error);

            if (error.response && error.response.data) {
                console.error('Server response:', error.response.data);

                if (error.response.data.debug) {
                    console.log('Server debug info:', error.response.data.debug);
                }

                if (error.response.data.errors) {
                    setValidationErrors(error.response.data.errors);
                }

                const errorMessage = error.response.data.errors
                    ? Object.values(error.response.data.errors).flat().join('\n')
                    : error.response.data.message || t('เกิดข้อผิดพลาดในการบันทึกข้อมูล');

                showAlert.error(t('เกิดข้อผิดพลาด'), errorMessage);
            } else {
                showAlert.error(t('เกิดข้อผิดพลาด'), t('ไม่สามารถบันทึกข้อมูลได้'));
            }
        } finally {
            setLoading(false);
        }
    };

    const renderAttributeInput = (attr: EquipmentAttribute) => {
        const currentValue = formData.attributes?.[attr.attribute_name];
        const hasError = validationErrors[`attributes.${attr.attribute_name}`];

        const baseInputClass = `w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white ${
            hasError ? 'border-red-500' : 'border-gray-600'
        }`;

        let input;

        switch (attr.data_type) {
            case 'string':
                input = (
                    selectedCategory?.name === 'pipe' && attr.attribute_name === 'pipeType' ? (
                        <>
                            <input
                                type="text"
                                list="pipe-type-options"
                                value={currentValue || ''}
                                onChange={(e) => {
                                    const cleaned = e.target.value.replace(/[^A-Za-z]/g, '');
                                    handleAttributeChange(attr.attribute_name, cleaned);
                                }}
                                className={baseInputClass}
                                required={attr.is_required}
                                pattern="[A-Za-z]+"
                                title={t('กรอกเฉพาะตัวอักษรภาษาอังกฤษ (A-Z)')}
                                placeholder={t('เช่น PE หรือ PVC')}
                                autoComplete="off"
                            />
                            <datalist id="pipe-type-options">
                                <option value="PE" />
                                <option value="PVC" />
                            </datalist>
                        </>
                    ) : (
                        <input
                            type="text"
                            value={currentValue || ''}
                            onChange={(e) => handleAttributeChange(attr.attribute_name, e.target.value)}
                            className={baseInputClass}
                            required={attr.is_required}
                            placeholder={attr.display_name}
                        />
                    )
                );
                break;

            case 'number':
                input = (
                    <input
                        type="number"
                        step="0.01"
                        value={currentValue !== undefined ? currentValue : ''}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                                handleAttributeChange(attr.attribute_name, undefined);
                            } else {
                                const numValue = parseFloat(value);
                                handleAttributeChange(
                                    attr.attribute_name,
                                    isNaN(numValue) ? value : numValue
                                );
                            }
                        }}
                        onBlur={(e) => {
                            const value = e.target.value;
                            if (value !== '') {
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue)) {
                                    handleAttributeChange(attr.attribute_name, numValue);
                                }
                            }
                        }}
                        className={baseInputClass}
                        required={attr.is_required}
                        placeholder={attr.display_name}
                    />
                );
                break;

            case 'boolean':
                input = (
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={Boolean(currentValue)}
                            onChange={(e) =>
                                handleAttributeChange(attr.attribute_name, e.target.checked)
                            }
                            className="h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm">Enable {attr.display_name}</span>
                    </div>
                );
                break;

            case 'array':
                input = (
                    <div>
                        <input
                            type="text"
                            value={
                                Array.isArray(currentValue)
                                    ? currentValue.join(', ')
                                    : currentValue || ''
                            }
                            onChange={(e) => {
                                const value = e.target.value;

                                if (value === '') {
                                    handleAttributeChange(attr.attribute_name, '');
                                    return;
                                }

                                if (value.includes(',')) {
                                    const arrayValue = value.split(',').map((v) => {
                                        const trimmed = v.trim();
                                        if (trimmed.endsWith('.') || trimmed.match(/^\d+\.\d*$/)) {
                                            return trimmed;
                                        }
                                        const num = parseFloat(trimmed);
                                        return isNaN(num) ? trimmed : num;
                                    });
                                    handleAttributeChange(attr.attribute_name, arrayValue);
                                } else if (value.includes('-') && !value.startsWith('-')) {
                                    const parts = value.split('-');

                                    if (parts.length === 2) {
                                        const num1 = parts[0].trim();
                                        const num2 = parts[1].trim();

                                        if (
                                            !num1.endsWith('.') &&
                                            !num2.endsWith('.') &&
                                            !isNaN(parseFloat(num1)) &&
                                            !isNaN(parseFloat(num2))
                                        ) {
                                            handleAttributeChange(attr.attribute_name, [
                                                parseFloat(num1),
                                                parseFloat(num2),
                                            ]);
                                        } else {
                                            handleAttributeChange(attr.attribute_name, value);
                                        }
                                    } else {
                                        handleAttributeChange(attr.attribute_name, value);
                                    }
                                } else {
                                    handleAttributeChange(attr.attribute_name, value);
                                }
                            }}
                            onBlur={(e) => {
                                const value = e.target.value.trim();
                                if (value === '') {
                                    handleAttributeChange(attr.attribute_name, '');
                                    return;
                                }

                                if (value.includes(',')) {
                                    const arrayValue = value.split(',').map((v) => {
                                        const trimmed = v.trim();
                                        const num = parseFloat(trimmed);
                                        return isNaN(num) ? trimmed : num;
                                    });
                                    handleAttributeChange(attr.attribute_name, arrayValue);
                                } else if (value.includes('-') && !value.startsWith('-')) {
                                    const parts = value
                                        .split('-')
                                        .map((v) => parseFloat(v.trim()))
                                        .filter((v) => !isNaN(v));
                                    if (parts.length === 2) {
                                        handleAttributeChange(attr.attribute_name, parts);
                                    }
                                }
                            }}
                            className={baseInputClass}
                            required={attr.is_required}
                            placeholder={t('ใช้ , หรือ - เพื่อแยกค่า')}
                        />
                    </div>
                );
                break;

            case 'json':
                input = (
                    <textarea
                        value={
                            typeof currentValue === 'object'
                                ? JSON.stringify(currentValue, null, 2)
                                : currentValue || '{}'
                        }
                        onChange={(e) => {
                            try {
                                const jsonValue = JSON.parse(e.target.value);
                                handleAttributeChange(attr.attribute_name, jsonValue);
                            } catch {
                                handleAttributeChange(attr.attribute_name, e.target.value);
                            }
                        }}
                        rows={3}
                        className={baseInputClass}
                        required={attr.is_required}
                        placeholder={t('{"key": "value"}')}
                    />
                );
                break;

            default:
                input = (
                    <input
                        type="text"
                        value={currentValue || ''}
                        onChange={(e) => handleAttributeChange(attr.attribute_name, e.target.value)}
                        className={baseInputClass}
                        required={attr.is_required}
                        placeholder={attr.display_name}
                    />
                );
        }

        return (
            <div key={attr.id}>
                <label className="mb-2 block text-sm font-medium">
                    {attr.display_name}
                    {selectedCategory?.name === 'pipe' && attr.attribute_name === 'pipeType' && ' (ตัวพิมพ์อังกฤษ)'}
                    {attr.unit && `(${attr.unit})`}
                    {attr.is_required && <span className="text-red-400"> *</span>}
                </label>
                {input}
                {hasError && (
                    <div className="mt-1 text-xs text-red-400">
                        {Array.isArray(hasError) ? hasError.join(', ') : hasError}
                    </div>
                )}
            </div>
        );
    };

    const selectedCategory = categories.find((c) => c.id === formData.category_id);
    const isPump = selectedCategory?.name === 'pump';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black bg-opacity-50 p-4">
            <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-lg bg-gray-800 text-white shadow-2xl">
                <div className="p-6">
                    <h2 className="mb-6 text-2xl font-bold">
                        {equipment ? t('แก้ไขอุปกรณ์') : t('เพิ่มอุปกรณ์ใหม่')}
                    </h2>

                    {loading && (
                        <div className="py-4 text-center">
                            <div className="text-gray-300">{t('กำลังโหลดข้อมูล...')}</div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    {t('หมวดหมู่')} *
                                </label>
                                <select
                                    value={formData.category_id || ''}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            category_id: parseInt(e.target.value),
                                        }))
                                    }
                                    className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.display_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    {t('รหัสสินค้า')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.product_code || ''}
                                    onChange={(e) => {
                                        setFormData((prev) => ({
                                            ...prev,
                                            product_code: e.target.value,
                                        }));
                                        if (validationErrors.product_code) {
                                            setValidationErrors((prev: any) => ({
                                                ...prev,
                                                product_code: undefined,
                                            }));
                                        }
                                    }}
                                    className={`w-full rounded-lg border bg-gray-700 p-3 text-white focus:ring-2 focus:ring-blue-500 ${
                                        validationErrors.product_code
                                            ? 'border-red-500'
                                            : 'border-gray-600'
                                    }`}
                                    placeholder={t('รหัสสินค้า หรือปล่อยว่าง')}
                                />
                                {validationErrors.product_code && (
                                    <div className="mt-1 text-xs text-red-400">
                                        {Array.isArray(validationErrors.product_code)
                                            ? validationErrors.product_code.join(', ')
                                            : validationErrors.product_code}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    {t('ชื่อสินค้า')} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => {
                                        setFormData((prev) => ({ ...prev, name: e.target.value }));
                                        if (validationErrors.name) {
                                            setValidationErrors((prev: any) => ({
                                                ...prev,
                                                name: undefined,
                                            }));
                                        }
                                    }}
                                    className={`w-full rounded-lg border bg-gray-700 p-3 text-white focus:ring-2 focus:ring-blue-500 ${
                                        validationErrors.name ? 'border-red-500' : 'border-gray-600'
                                    }`}
                                    required
                                />
                                {validationErrors.name && (
                                    <div className="mt-1 text-xs text-red-400">
                                        {Array.isArray(validationErrors.name)
                                            ? validationErrors.name.join(', ')
                                            : validationErrors.name}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-4">
                            <div className="flex flex-col md:col-span-1">
                                <label className="mb-2 block text-sm font-medium">
                                    {t('แบรนด์')}
                                </label>
                                <input
                                    type="text"
                                    list="brand-options"
                                    value={formData.brand || ''}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            brand: e.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder={t('แบรนด์สินค้า')}
                                />
                                <datalist id="brand-options">
                                    <option value="ไชโย" />
                                    <option value="แชมป์" />
                                    <option value="โตไว" />
                                    <option value="ตรามือ" />
                                </datalist>
                            </div>

                            <div className="flex flex-col md:col-span-1">
                                <label className="mb-2 block text-sm font-medium">
                                    {t('ราคา')} *
                                </label>
                                <input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={formData.price || ''}
                                    onChange={(e) => {
                                        setFormData((prev) => ({
                                            ...prev,
                                            price: parseFloat(e.target.value) || 0,
                                        }));
                                        if (validationErrors.price) {
                                            setValidationErrors((prev: any) => ({
                                                ...prev,
                                                price: undefined,
                                            }));
                                        }
                                    }}
                                    className={`w-full rounded-lg border bg-gray-700 p-3 text-white focus:ring-2 focus:ring-blue-500 ${
                                        validationErrors.price
                                            ? 'border-red-500'
                                            : 'border-gray-600'
                                    }`}
                                    required
                                />
                                {validationErrors.price && (
                                    <div className="mt-1 text-xs text-red-400">
                                        {Array.isArray(validationErrors.price)
                                            ? validationErrors.price.join(', ')
                                            : validationErrors.price}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col md:col-span-1">
                                <label className="mb-2 block text-sm font-medium">
                                    {t('Stock')}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.stock || ''}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            stock: e.target.value ? parseInt(e.target.value) : 0,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder={t('จำนวนในสต็อก')}
                                />
                            </div>

                            <div className="flex h-full flex-col md:col-span-1 md:row-span-2">
                                <div className="flex h-full flex-col justify-start">
                                    <ImageUpload
                                        currentImage={formData.image}
                                        onImageChange={handleImageChange}
                                        onImageClick={onImageClick}
                                        loading={imageUploading}
                                    />
                                    <div className="mt-2 flex items-center">
                                        <label className="flex cursor-pointer items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active || false}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        is_active: e.target.checked,
                                                    }))
                                                }
                                                className="mr-2 h-4 w-4"
                                            />
                                            <span className="text-sm">
                                                {t('เปิดใช้งานอุปกรณ์')}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:col-span-3">
                                <label className="mb-2 block text-sm font-medium">
                                    {t('คำอธิบาย')}
                                </label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            description: e.target.value,
                                        }))
                                    }
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder={t('คำอธิบายสินค้า')}
                                />
                            </div>
                        </div>

                        {attributes.length > 0 && !loading && (
                            <div className="border-t border-gray-600 pt-6">
                                <h3 className="mb-4 text-lg font-semibold text-purple-400">
                                    <Settings className="mr-2 inline h-5 w-5" />
                                    {t('คุณสมบัติเฉพาะ')}
                                </h3>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                                    {attributes
                                        .sort((a, b) => a.sort_order - b.sort_order)
                                        .map(renderAttributeInput)}
                                </div>
                            </div>
                        )}

                        {isPump && (
                            <div className="border-t border-gray-600 pt-6">
                                <PumpAccessoryForm
                                    accessories={accessories}
                                    onChange={setAccessories}
                                    onImageClick={onImageClick}
                                />
                            </div>
                        )}

                        <div className="flex justify-end space-x-4 border-t border-gray-600 pt-6">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex items-center rounded-lg border border-gray-600 px-6 py-3 text-gray-300 transition-colors hover:bg-gray-700"
                                disabled={loading}
                            >
                                <X className="mr-2 h-4 w-4" />
                                {t('ยกเลิก')}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || imageUploading}
                                className="flex items-center rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-white"></div>
                                        {t('กำลังบันทึก...')}
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        {t('บันทึก')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EquipmentDetailModal: React.FC<{
    equipment: Equipment;
    onClose: () => void;
    onEdit: () => void;
    onImageClick?: (src: string, alt: string) => void;
    updatedAccessories?: PumpAccessory[];
}> = ({ equipment, onClose, onEdit, onImageClick, updatedAccessories }) => {
    const { t } = useLanguage();
    const [showAccessoriesModal, setShowAccessoriesModal] = useState(false);

    const formatAttributeValue = (value: any, attribute?: any) => {
        if (value === null || value === undefined || value === '') {
            return '-';
        }

        if (attribute && attribute.formatted_value) {
            return attribute.formatted_value;
        }

        if (Array.isArray(value)) {
            if (
                value.length === 2 &&
                typeof value[0] === 'number' &&
                typeof value[1] === 'number'
            ) {
                return `${value[0].toLocaleString()} - ${value[1].toLocaleString()}`;
            }
            return value.join(', ');
        }

        if (typeof value === 'number') {
            return value.toLocaleString();
        }

        if (typeof value === 'boolean') {
            return value ? t('ใช่') : t('ไม่ใช่');
        }

        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        }

        return String(value);
    };

    const getAllAttributes = () => {
        const attributes: {
            attribute_name: string;
            display_name: string;
            value: any;
            formatted_value: any;
            unit: any;
            data_type: string;
            sort_order: number;
        }[] = [];

        if (equipment.formatted_attributes && Array.isArray(equipment.formatted_attributes)) {
            return equipment.formatted_attributes.sort((a, b) => a.sort_order - b.sort_order);
        }

        if (equipment.attributes && Array.isArray(equipment.attributes)) {
            return equipment.attributes.sort((a, b) => a.sort_order - b.sort_order);
        }

        if (equipment.attributes_raw && typeof equipment.attributes_raw === 'object') {
            Object.entries(equipment.attributes_raw).forEach(([key, value]) => {
                const displayName = getThaiDisplayName(key);
                attributes.push({
                    attribute_name: key,
                    display_name: displayName,
                    value: value,
                    formatted_value: formatAttributeValue(value),
                    unit: getUnitForAttribute(key),
                    data_type: Array.isArray(value) ? 'array' : typeof value,
                    sort_order: 0,
                });
            });
            return attributes;
        }

        const rootAttributes = {};
        const skipFields = [
            'id',
            'category_id',
            'categoryId',
            'product_code',
            'productCode',
            'name',
            'brand',
            'image',
            'price',
            'stock',
            'description',
            'is_active',
            'category',
            'attributes',
            'formatted_attributes',
            'attributes_raw',
            'pumpAccessories',
            'pumpAccessory',
            'created_at',
            'updated_at',
        ];

        Object.entries(equipment).forEach(([key, value]) => {
            if (!skipFields.includes(key) && value !== null && value !== undefined) {
                (rootAttributes as any)[key] = value;
            }
        });

        Object.entries(rootAttributes).forEach(([key, value]) => {
            const displayName = getThaiDisplayName(key);
            attributes.push({
                attribute_name: key,
                display_name: displayName,
                value: value,
                formatted_value: formatAttributeValue(value),
                unit: getUnitForAttribute(key),
                data_type: Array.isArray(value) ? 'array' : typeof value,
                sort_order: 0,
            });
        });

        return attributes;
    };

    const getThaiDisplayName = (attributeName: string) => {
        const thaiDisplayMap: { [key: string]: string } = {
            flow_rate: 'อัตราการไหล',
            pressure: 'ความดัน',
            radius: 'รัศมีการพ่น',
            waterVolumeLitersPerMinute: 'อัตราการไหล',
            pressureBar: 'ความดัน',
            radiusMeters: 'รัศมีการพ่น',

            power_hp: 'กำลัง',
            powerHP: 'กำลัง',
            powerKW: 'กำลัง',
            phase: 'เฟส',
            inlet_size_inch: 'ขนาดท่อดูด',
            outlet_size_inch: 'ขนาดท่อส่ง',
            flow_rate_lpm: 'อัตราการไหล',
            head_m: 'หัวดัน',
            max_head_m: 'หัวดันสูงสุด',
            max_flow_rate_lpm: 'อัตราการไหลสูงสุด',
            suction_depth_m: 'ความลึกดูด',
            weight_kg: 'น้ำหนัก',

            size_mm: 'ขนาด',
            size_inch: 'ขนาด',
            sizeMM: 'ขนาด',
            sizeInch: 'ขนาด',
            lengthM: 'ความยาว',
            dimensions_cm: 'ขนาด',
            material: 'วัสดุ',

            voltage: 'แรงดันไฟฟ้า',
            current: 'กระแสไฟฟ้า',
            frequency: 'ความถี่',

            brand: 'แบรนด์',
            model: 'รุ่น',
            color: 'สี',
            weight: 'น้ำหนัก',
            height: 'ความสูง',
            width: 'ความกว้าง',
            length: 'ความยาว',
            diameter: 'เส้นผ่านศูนย์กลาง',
            thickness: 'ความหนา',
            capacity: 'ความจุ',
            efficiency: 'ประสิทธิภาพ',
            temperature_range: 'ช่วงอุณหภูมิ',
            operating_pressure: 'ความดันใช้งาน',
            max_pressure: 'ความดันสูงสุด',
            connection_type: 'ประเภทการต่อ',
            thread_size: 'ขนาดเกลียว',
        };

        if (thaiDisplayMap[attributeName]) {
            return thaiDisplayMap[attributeName];
        }

        const readable = attributeName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim();

        const translatedReadable = readable
            .replace(/Power/gi, t('กำลัง'))
            .replace(/Flow Rate/gi, t('อัตราการไหล'))
            .replace(/Pressure/gi, t('ความดัน'))
            .replace(/Radius/gi, t('รัศมี'))
            .replace(/Size/gi, t('ขนาด'))
            .replace(/Weight/gi, t('น้ำหนัก'))
            .replace(/Height/gi, t('ความสูง'))
            .replace(/Width/gi, t('ความกว้าง'))
            .replace(/Length/gi, t('ความยาว'))
            .replace(/Water Volume/gi, t('อัตราการไหล'))
            .replace(/Liters Per Minute/gi, t('ลิตรต่อนาที'))
            .replace(/Meters/gi, t('เมตร'))
            .replace(/Bar/gi, t('บาร์'));

        return translatedReadable || attributeName;
    };

    const getUnitForAttribute = (attributeName: string) => {
        const unitMap = {
            powerHP: t('HP'),
            powerKW: t('kW'),
            phase: t('เฟส'),
            inlet_size_inch: t('นิ้ว'),
            outlet_size_inch: t('นิ้ว'),
            flow_rate_lpm: t('LPM'),
            head_m: t('เมตร'),
            max_head_m: t('เมตร'),
            max_flow_rate_lpm: t('LPM'),
            suction_depth_m: t('เมตร'),
            weight_kg: t('กก.'),
            waterVolumeLitersPerMinute: t('L/min'),
            radiusMeters: t('เมตร'),
            pressureBar: t('บาร์'),
            size_mm: t('มม.'),
            size_inch: t('นิ้ว'),
            sizeMM: t('มม.'),
            sizeInch: t('นิ้ว'),
            lengthM: t('เมตร'),
            dimensions_cm: t('ซม.'),
        };
        return unitMap[attributeName as keyof typeof unitMap] || '';
    };

    const attributes = getAllAttributes();
    const pumpAccessories =
        updatedAccessories || equipment.pumpAccessories || equipment.pumpAccessory || [];

    const PumpAccessoriesModal: React.FC<{
        accessories: PumpAccessory[];
        onClose: () => void;
        onImageClick?: (src: string, alt: string) => void;
    }> = ({ accessories, onClose, onImageClick }) => {
        const { t } = useLanguage();
        const [currentPage, setCurrentPage] = useState(1);
        const [searchTerm, setSearchTerm] = useState('');
        const [filterType, setFilterType] = useState<'all' | 'included' | 'optional'>('all');

        const itemsPerPage = 10;

        const filteredAccessories = accessories.filter((accessory) => {
            const matchesSearch =
                searchTerm === '' ||
                (accessory.name &&
                    accessory.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (accessory.product_code &&
                    accessory.product_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (accessory.description &&
                    accessory.description.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesFilter =
                filterType === 'all' ||
                (filterType === 'included' && accessory.is_included) ||
                (filterType === 'optional' && !accessory.is_included);

            return matchesSearch && matchesFilter;
        });

        const totalPages = Math.ceil(filteredAccessories.length / itemsPerPage);
        const paginatedAccessories = filteredAccessories.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );

        useEffect(() => {
            setCurrentPage(1);
        }, [searchTerm, filterType]);

        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black bg-opacity-50 p-4">
                <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-gray-800 text-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-gray-600 p-6">
                        <div className="flex items-center gap-4">
                            <Wrench className="h-6 w-6 text-orange-400" />
                            <h2 className="text-2xl font-bold text-orange-400">
                                {t('อุปกรณ์ประกอบปั๊ม')} ({accessories.length} {t('รายการ')})
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 transition-colors hover:text-white"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="border-b border-gray-600 p-4">
                        <div className="flex flex-col gap-4 md:flex-row">
                            <div className="flex flex-1 items-center gap-2">
                                <Search className="h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t('ค้นหาอุปกรณ์...')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex-1 rounded-lg border border-gray-600 bg-gray-700 p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="rounded-lg border border-gray-600 bg-gray-700 p-2 text-white focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="all">{t('ทั้งหมด')}</option>
                                <option value="included">{t('รวมในชุด')}</option>
                                <option value="optional">{t('ต้องซื้อเพิ่ม')}</option>
                            </select>
                        </div>

                        <div className="mt-2 text-sm text-gray-400">
                            {t('แสดง')} {filteredAccessories.length} {t('จากทั้งหมด')}{' '}
                            {accessories.length} {t('รายการ')}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {filteredAccessories.length === 0 ? (
                            <div className="flex h-full items-center justify-center">
                                <div className="text-center">
                                    <Wrench className="mx-auto h-16 w-16 text-gray-500" />
                                    <p className="mt-4 text-gray-400">
                                        {t('ไม่พบอุปกรณ์ที่ค้นหา')}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {paginatedAccessories.map((accessory, index) => (
                                    <div
                                        key={accessory.id || index}
                                        className="rounded-lg border border-gray-600 bg-gray-700 p-1 transition-colors hover:border-orange-400"
                                    >
                                        <div className="grid grid-cols-12 items-center gap-4">
                                            <div className="col-span-1">
                                                {accessory.image ? (
                                                    <img
                                                        src={getImageUrl(accessory.image)} // <<-- 2. แก้ไข
                                                        alt={accessory.name || 'อุปกรณ์'}
                                                        className="h-12 w-12 cursor-pointer rounded-lg border border-gray-600 object-cover transition-opacity hover:border-orange-400 hover:opacity-80"
                                                        onClick={() =>
                                                            onImageClick &&
                                                            onImageClick(
                                                                getImageUrl(accessory.image!), // <<-- 2. แก้ไข
                                                                accessory.name ||
                                                                    'อุปกรณ์ ' + (index + 1)
                                                            )
                                                        }
                                                        title={t('คลิกเพื่อดูรูปขนาดใหญ่')}
                                                        onError={(e) => {
                                                            const target =
                                                                e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            const parent = target.parentElement;
                                                            if (parent) {
                                                                const placeholder =
                                                                    parent.querySelector(
                                                                        '.image-placeholder'
                                                                    ) as HTMLElement;
                                                                if (placeholder)
                                                                    placeholder.style.display =
                                                                        'flex';
                                                            }
                                                        }}
                                                    />
                                                ) : null}
                                                <div
                                                    className={`image-placeholder flex h-12 w-12 items-center justify-center rounded-lg border border-gray-600 bg-gray-600 ${accessory.image ? 'hidden' : 'flex'}`}
                                                >
                                                    <Wrench className="h-6 w-6 text-gray-400" />
                                                </div>
                                            </div>

                                            <div className="col-span-3">
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-semibold text-white">
                                                        {accessory.name || 'ไม่มีชื่อ'}
                                                    </h4>
                                                    {accessory.product_code && (
                                                        <p className="text-sm text-gray-400">
                                                            {t('รหัส')}: {accessory.product_code}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="col-span-5">
                                                <div className="flex-1">
                                                    <h4 className="text-sm text-gray-400">
                                                        รายละเอียด
                                                    </h4>
                                                    <p className="text-sm text-gray-200">
                                                        {accessory.description || '-'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="col-span-1">
                                                <span className="text-sm text-gray-400">
                                                    {t('จำนวน')}
                                                </span>
                                                <p className="font-semibold text-blue-400">
                                                    {accessory.quantity || 1} {t('ชิ้น')}
                                                </p>
                                            </div>

                                            <div className="col-span-1">
                                                <span className="text-sm text-gray-400">
                                                    {t('ราคา')}
                                                </span>
                                                <p className="font-semibold text-green-400">
                                                    {accessory.price && accessory.price > 0
                                                        ? `฿${accessory.price.toLocaleString()}`
                                                        : '-'}
                                                </p>
                                            </div>

                                            <div className="col-span-1 flex items-center justify-end">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                        accessory.is_included
                                                            ? 'bg-green-900 text-green-300'
                                                            : 'bg-yellow-900 text-yellow-300'
                                                    }`}
                                                >
                                                    {accessory.is_included
                                                        ? t('รวมในชุด')
                                                        : t('ต้องซื้อเพิ่ม')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="border-t border-gray-600 p-4">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                totalItems={filteredAccessories.length}
                                itemsPerPage={itemsPerPage}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black bg-opacity-50 p-4">
            <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-lg bg-gray-800 text-white shadow-2xl">
                <div className="p-6">
                    <div className="mb-6 flex items-start justify-between">
                        <h2 className="text-2xl font-bold">{t('รายละเอียดสินค้า')}</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={onEdit}
                                className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                            >
                                <Edit2 className="mr-2 h-4 w-4" />
                                {t('แก้ไข')}
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 transition-colors hover:text-white"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-1">
                            {equipment.image ? (
                                <img
                                    src={getImageUrl(equipment.image)} // <<-- 2. แก้ไข
                                    alt={equipment.name}
                                    className="h-64 w-full cursor-pointer rounded-lg border border-gray-600 object-cover transition-opacity hover:border-blue-400 hover:opacity-80"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                            const placeholder = parent.querySelector(
                                                '.image-placeholder'
                                            ) as HTMLElement;
                                            if (placeholder) placeholder.style.display = 'flex';
                                        }
                                    }}
                                    onClick={() =>
                                        onImageClick &&
                                        onImageClick(getImageUrl(equipment.image!), equipment.name) // <<-- 2. แก้ไข
                                    }
                                    title={t('คลิกเพื่อดูรูปขนาดใหญ่')}
                                />
                            ) : null}
                            <div
                                className={`image-placeholder flex h-64 w-full items-center justify-center rounded-lg border border-gray-600 bg-gray-700 ${equipment.image ? 'hidden' : 'flex'}`}
                            >
                                <div className="text-center">
                                    <ImageIcon className="mx-auto h-16 w-16 text-gray-500" />
                                    <p className="mt-2 text-sm text-gray-500">{t('ไม่มีรูปภาพ')}</p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <span
                                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                                        equipment.is_active
                                            ? 'bg-green-900 text-green-300'
                                            : 'bg-red-900 text-red-300'
                                    }`}
                                >
                                    {equipment.is_active ? (
                                        <>
                                            <CheckCircle className="mr-1 h-4 w-4" />{' '}
                                            {t('เปิดใช้งาน')}
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="mr-1 h-4 w-4" /> {t('ปิดใช้งาน')}
                                        </>
                                    )}
                                </span>
                            </div>
                            <div className="mt-4 space-y-2 rounded-lg bg-gray-700 p-4">
                                <h4 className="font-semibold text-blue-400">{t('ข้อมูลสรุป')}</h4>
                                <div className="text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">{t('คุณสมบัติ:')}</span>
                                        <span>
                                            {attributes.length -
                                                attributes.filter(
                                                    (attr) => attr.formatted_value == 0
                                                ).length}{' '}
                                            {t('รายการ')}
                                        </span>
                                    </div>
                                    {equipment.stock && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">{t('Stock:')}</span>
                                            <span className="font-medium text-blue-400">
                                                {equipment.stock.toLocaleString()} {t('ชิ้น')}
                                            </span>
                                        </div>
                                    )}
                                    {pumpAccessories.length > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">
                                                {t('อุปกรณ์เสริม:')}
                                            </span>
                                            <span>
                                                {pumpAccessories.length} {t('รายการ')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {pumpAccessories.length > 0 && (
                                <div>
                                    <h3 className="mb-3 mt-6 flex items-center justify-between overflow-hidden text-lg font-semibold text-orange-400">
                                        <div className="flex items-center">
                                            <Wrench className="mr-2 h-5 w-5" />
                                            {t('อุปกรณ์ประกอบ')}
                                        </div>
                                        <button
                                            onClick={() => setShowAccessoriesModal(true)}
                                            className="flex items-center rounded-lg bg-orange-600 px-3 py-2 text-sm text-white transition-colors hover:bg-orange-700"
                                        >
                                            <Eye className="mr-1 h-4 w-4" />
                                            {t('ดูรายการ')}
                                        </button>
                                    </h3>

                                    <div className="rounded-lg bg-gray-700 p-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">
                                                    {t('รายการ:')}
                                                </span>
                                                <span className="font-medium text-orange-400">
                                                    {pumpAccessories.length} {t('รายการ')}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">
                                                    {t('จำนวนรวม:')}
                                                </span>
                                                <span className="font-medium text-orange-400">
                                                    {pumpAccessories.reduce(
                                                        (sum, acc) => sum + (acc.quantity || 1),
                                                        0
                                                    )}{' '}
                                                    {t('ชิ้น')}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">
                                                    {t('รวมในชุด:')}
                                                </span>
                                                <span className="font-medium text-green-400">
                                                    {
                                                        pumpAccessories.filter(
                                                            (acc) => acc.is_included
                                                        ).length
                                                    }{' '}
                                                    {t('รายการ')}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">
                                                    {t('ต้องซื้อเพิ่ม:')}
                                                </span>
                                                <span className="font-medium text-yellow-400">
                                                    {
                                                        pumpAccessories.filter(
                                                            (acc) => !acc.is_included
                                                        ).length
                                                    }{' '}
                                                    {t('รายการ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {showAccessoriesModal && (
                                <PumpAccessoriesModal
                                    accessories={pumpAccessories}
                                    onClose={() => setShowAccessoriesModal(false)}
                                    onImageClick={onImageClick}
                                />
                            )}
                        </div>

                        <div className="space-y-6 lg:col-span-2">
                            <div className="rounded-lg bg-gray-700 p-4">
                                <h3 className="mb-3 text-lg font-semibold text-blue-400">
                                    {t('ข้อมูลพื้นฐาน')}
                                </h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="col-span-1">
                                        <label className="text-sm text-gray-400">
                                            {t('รหัสสินค้า')}
                                        </label>
                                        <p className="font-medium">
                                            {equipment.product_code || equipment.productCode || '-'}
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-sm text-gray-400">
                                            {t('ชื่อสินค้า')}
                                        </label>
                                        <p className="font-medium">{equipment.name || '-'}</p>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-sm text-gray-400">
                                            {t('แบรนด์')}
                                        </label>
                                        <p className="font-medium">{equipment.brand || '-'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-sm text-gray-400">{t('ราคา')}</label>
                                        <p className="font-medium">
                                            {equipment.price.toLocaleString() || '-'} บาท
                                        </p>
                                    </div>

                                    <div className="col-span-1">
                                        <label className="text-sm text-gray-400">
                                            {t('แก้ไขล่าสุด')}
                                        </label>
                                        <p className="font-medium">
                                            {equipment.updated_at
                                                ? new Date(equipment.updated_at).toLocaleDateString(
                                                      'th-TH'
                                                  )
                                                : '-'}
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-sm text-gray-400">
                                            {t('วันที่เพิ่ม')}
                                        </label>
                                        <p className="font-medium">
                                            {equipment.created_at
                                                ? new Date(equipment.created_at).toLocaleDateString(
                                                      'th-TH'
                                                  )
                                                : '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="text-sm text-gray-400">{t('คำอธิบาย')}</label>
                                    <p className="mt-1">{equipment.description || '-'}</p>
                                </div>
                            </div>

                            {attributes.length > 0 && (
                                <div className="rounded-lg bg-gray-700 p-4">
                                    <h3 className="mb-3 text-lg font-semibold text-purple-400">
                                        {t('คุณสมบัติเฉพาะ')} (
                                        {attributes.length -
                                            attributes.filter((attr) => attr.formatted_value == 0)
                                                .length}{' '}
                                        {t('รายการ')})
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {attributes.map((attr, index) => (
                                            <div key={attr.attribute_name || index}>
                                                {attr.formatted_value != 0 ? (
                                                    <div className="rounded-lg bg-gray-600 p-2">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <label className="text-sm font-medium text-gray-300">
                                                                    {attr.display_name}
                                                                </label>
                                                            </div>

                                                            <p className="mt-1 font-medium text-white">
                                                                {attr.formatted_value ||
                                                                    formatAttributeValue(
                                                                        attr.value
                                                                    )}
                                                                {attr.unit && (
                                                                    <span className="ml-1 text-gray-200">
                                                                        {' '}
                                                                        {attr.unit}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatsDashboard: React.FC<{ stats: any; categories: EquipmentCategory[] }> = ({
    stats,
    categories,
}) => {
    const { t } = useLanguage();
    return (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-blue-100">{t('สินค้าทั้งหมด')}</p>
                        <p className="text-2xl font-bold">{stats.total_equipments || 0}</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-200" />
                </div>
            </div>

            <div className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-green-100">{t('เปิดใช้งาน')}</p>
                        <p className="text-2xl font-bold">{stats.active_equipments || 0}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-200" />
                </div>
            </div>

            <div className="rounded-lg bg-gradient-to-r from-red-600 to-red-700 p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-red-100">{t('ปิดใช้งาน')}</p>
                        <p className="text-2xl font-bold">{stats.inactive_equipments || 0}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-200" />
                </div>
            </div>

            <div className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-purple-100">{t('มูลค่ารวม')}</p>
                        <p className="text-xl font-bold">
                            {(stats.total_value || 0).toLocaleString()} ฿
                        </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-200" />
                </div>
            </div>
        </div>
    );
};

const ImageModal: React.FC<{
    isOpen: boolean;
    imageSrc: string;
    imageAlt: string;
    onClose: () => void;
}> = ({ isOpen, imageSrc, imageAlt, onClose }) => {
    const { t } = useLanguage();
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75"
            onClick={onClose}
        >
            <div className="relative max-h-[90vh] max-w-[90vw] p-4">
                <button
                    onClick={onClose}
                    className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-colors hover:bg-red-700"
                    title={t('ปิด')}
                >
                    <X className="h-4 w-4" />
                </button>

                <img
                    src={getImageUrl(imageSrc)} // <<-- 2. แก้ไข
                    alt={imageAlt}
                    className="max-h-[80vh] max-w-full rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                            const errorDiv = document.createElement('div');
                            errorDiv.className =
                                'flex h-64 w-64 items-center justify-center rounded-lg border border-red-500 bg-red-900/20';
                            errorDiv.innerHTML =
                                '<div class="text-center"><div class="h-16 w-16 mx-auto text-red-400">⚠️</div><p class="mt-2 text-red-400">ไม่สามารถโหลดรูปภาพ</p></div>';
                            parent.appendChild(errorDiv);
                        }
                    }}
                />

                <div className="mt-2 text-center">
                    <p className="inline-block rounded bg-black bg-opacity-50 px-2 py-1 text-sm text-white">
                        {imageAlt}
                    </p>
                </div>
            </div>
        </div>
    );
};

const EquipmentCRUD: React.FC = () => {
    const { t } = useLanguage();
    const [categories, setCategories] = useState<EquipmentCategory[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const [filters, setFilters] = useState<FilterOptions>({
        search: '',
        categoryId: null,
        priceRange: [0, 100000],
        status: 'all',
        sortBy: 'created_at',
        sortOrder: 'desc',
    });

    const [showEquipmentForm, setShowEquipmentForm] = useState(false);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [showEquipmentDetail, setShowEquipmentDetail] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState<Equipment | undefined>();
    const [editingCategory, setEditingCategory] = useState<EquipmentCategory | undefined>();
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | undefined>();
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [stats, setStats] = useState<any>({});
    const [formAccessories, setFormAccessories] = useState<PumpAccessory[]>([]);

    const [imageModal, setImageModal] = useState({
        isOpen: false,
        imageSrc: '',
        imageAlt: '',
    });

    const debouncedSearch = useDebounce(filters.search, 300);

    useEffect(() => {
        if (typeof window !== 'undefined' && !window.Swal) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
            script.async = true;
            script.onerror = () => {
                console.warn('Failed to load SweetAlert2, falling back to native alerts');
            };
            document.head.appendChild(script);
        }
    }, []);

    const openImageModal = (src: string, alt: string) => {
        setImageModal({
            isOpen: true,
            imageSrc: src,
            imageAlt: alt,
        });
    };

    const closeImageModal = () => {
        setImageModal({
            isOpen: false,
            imageSrc: '',
            imageAlt: '',
        });
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const [categoriesData, equipmentsData, statsData] = await Promise.all([
                    api.getCategories(),
                    getAllEquipments(),
                    api.getStats(),
                ]);

                setCategories(categoriesData);
                setEquipments(equipmentsData);
                setStats(statsData);
            } catch (error) {
                showAlert.error(t('เกิดข้อผิดพลาด'), t('ไม่สามารถโหลดข้อมูลได้'));
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [t]);

    const filteredAndSortedEquipments = useMemo(() => {
        const result = equipments.filter((equipment) => {
            const searchFields = [
                equipment.name,
                equipment.product_code || equipment.productCode,
                equipment.brand,
                equipment.description,
            ]
                .filter(Boolean)
                .map((field) => field?.toLowerCase());

            const matchesSearch =
                debouncedSearch === '' ||
                searchFields.some(
                    (field) => field?.includes(debouncedSearch.toLowerCase()) ?? false
                );

            const catId = Number(equipment.category_id || equipment.categoryId);
            const matchesCategory = selectedCategoryId === null || catId === selectedCategoryId;

            const isActive = Boolean(equipment.is_active);
            const matchesStatus =
                filters.status === 'all' ||
                (filters.status === 'active' && isActive) ||
                (filters.status === 'inactive' && !isActive);

            const price = Number(equipment.price || 0);
            const matchesPrice = price >= filters.priceRange[0] && price <= filters.priceRange[1];

            return matchesSearch && matchesCategory && matchesStatus && matchesPrice;
        });

        result.sort((a, b) => {
            let aValue: any = a[filters.sortBy];
            let bValue: any = b[filters.sortBy];

            if (filters.sortBy === 'productCode') {
                aValue = a.product_code || a.productCode;
                bValue = b.product_code || b.productCode;
            }

            if (filters.sortBy === 'name') {
                if (filters.sortOrder === 'asc') {
                    return aValue.localeCompare(bValue, 'th', { numeric: true });
                } else {
                    return bValue.localeCompare(aValue, 'th', { numeric: true });
                }
            }

            if (filters.sortBy === 'price') {
                aValue = Number(aValue);
                bValue = Number(bValue);
            }

            if (filters.sortBy === 'created_at') {
                aValue = new Date(aValue || 0).getTime();
                bValue = new Date(bValue || 0).getTime();
            }

            if (filters.sortOrder === 'asc') {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            } else {
                return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            }
        });

        return result;
    }, [equipments, filters, selectedCategoryId, debouncedSearch]);

    const totalPages = Math.ceil(filteredAndSortedEquipments.length / itemsPerPage);
    const paginatedEquipments = filteredAndSortedEquipments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [filters, selectedCategoryId]);

    const handleSaveEquipment = async (equipmentData: Partial<Equipment>) => {
        setSaving(true);
        try {
            let savedEquipment;
            if (editingEquipment) {
                savedEquipment = await api.updateEquipment(editingEquipment.id, equipmentData);
            } else {
                savedEquipment = await api.createEquipment(equipmentData);
            }

            const [equipmentsData, statsData] = await Promise.all([
                api.getAllEquipments(),
                api.getStats(),
            ]);
            setEquipments(equipmentsData);
            setStats(statsData);

            if (equipmentData.pump_accessories) {
                setFormAccessories(equipmentData.pump_accessories as PumpAccessory[]);
            }

            setShowEquipmentForm(false);
            setEditingEquipment(undefined);
        } catch (error) {
            console.error('Failed to save equipment:', error);
            throw error;
        } finally {
            setSaving(false);
        }
    };

    const handleSaveCategory = async (categoryData: Partial<EquipmentCategory>) => {
        setSaving(true);
        try {
            if (editingCategory) {
                await api.updateCategory(editingCategory.id, categoryData);
                showAlert.success(
                    t('แก้ไขหมวดหมู่สำเร็จ'),
                    `${categoryData.display_name} ${t('ได้รับการแก้ไขเรียบร้อยแล้ว')}`
                );
            } else {
                await api.createCategory(categoryData);
                showAlert.success(
                    t('เพิ่มหมวดหมู่สำเร็จ'),
                    `${categoryData.display_name} ${t('ได้รับการเพิ่มเรียบร้อยแล้ว')}`
                );
            }

            const categoriesData = await api.getCategories();
            setCategories(categoriesData);

            setShowCategoryForm(false);
            setEditingCategory(undefined);
        } catch (error) {
            console.error('Failed to save category:', error);
            showAlert.error(t('เกิดข้อผิดพลาด'), t('ไม่สามารถบันทึกหมวดหมู่ได้'));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteEquipment = async (equipment: Equipment) => {
        const result = await showAlert.confirm(
            t('ยืนยันการลบ'),
            `${t('คุณต้องการลบ')} "${equipment.name}" ${t('หรือไม่?')}`
        );

        if (result.isConfirmed) {
            try {
                await api.deleteEquipment(equipment.id);
                const [equipmentsData, statsData] = await Promise.all([
                    api.getAllEquipments(),
                    api.getStats(),
                ]);
                setEquipments(equipmentsData);
                setStats(statsData);
                showAlert.success(
                    t('ลบสำเร็จ'),
                    `${equipment.name} ${t('ได้รับการลบเรียบร้อยแล้ว')}`
                );
            } catch (error) {
                console.error('Failed to delete equipment:', error);
                showAlert.error(t('เกิดข้อผิดพลาด'), t('ไม่สามารถลบสินค้าได้'));
            }
        }
    };

    const handleDeleteCategory = async (category: EquipmentCategory) => {
        const result = await showAlert.confirm(
            t('ยืนยันการลบ'),
            `${t('คุณต้องการลบหมวดหมู่')} "${category.display_name}" ${t('หรือไม่?')}`
        );

        if (result.isConfirmed) {
            try {
                await api.deleteCategory(category.id);
                const categoriesData = await api.getCategories();
                setCategories(categoriesData);

                if (selectedCategoryId === category.id) {
                    setSelectedCategoryId(categoriesData[0]?.id || null);
                }
                showAlert.success(
                    t('ลบสำเร็จ'),
                    `${t('หมวดหมู่')} ${category.display_name} ${t('ได้รับการลบเรียบร้อยแล้ว')}`
                );
            } catch (error) {
                console.error('Failed to delete category:', error);
                showAlert.error(t('เกิดข้อผิดพลาด'), t('ไม่สามารถลบหมวดหมู่ได้'));
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) return;

        const result = await showAlert.confirm(
            t('ยืนยันการลบ'),
            `${t('คุณต้องการลบสินค้า')} ${selectedItems.length} ${t('รายการ')} ${t('หรือไม่?')}`
        );

        if (result.isConfirmed) {
            try {
                await api.bulkDelete(selectedItems);
                const [equipmentsData, statsData] = await Promise.all([
                    api.getAllEquipments(),
                    api.getStats(),
                ]);
                setEquipments(equipmentsData);
                setStats(statsData);
                setSelectedItems([]);
                showAlert.success(
                    t('ลบสำเร็จ'),
                    `${t('ลบสินค้า')} ${selectedItems.length} ${t('รายการ')} ${t('เรียบร้อยแล้ว')}`
                );
            } catch (error) {
                console.error('Failed to bulk delete:', error);
                showAlert.error(t('เกิดข้อผิดพลาด'), t('ไม่สามารถลบสินค้าได้'));
            }
        }
    };

    const handleBulkToggleStatus = async (isActive: boolean) => {
        if (selectedItems.length === 0) return;

        try {
            await api.bulkUpdate(selectedItems, { is_active: isActive });
            const [equipmentsData, statsData] = await Promise.all([
                api.getAllEquipments(),
                api.getStats(),
            ]);
            setEquipments(equipmentsData);
            setStats(statsData);
            setSelectedItems([]);
            showAlert.success(
                t('อัปเดตสำเร็จ'),
                `${t('อัปเดตสถานะสินค้า')} ${selectedItems.length} ${t('รายการ')} ${t('เรียบร้อยแล้ว')}`
            );
        } catch (error) {
            console.error('Failed to bulk update:', error);
            showAlert.error(t('เกิดข้อผิดพลาด'), t('ไม่สามารถอัปเดตสถานะสินค้าได้'));
        }
    };

    const toggleItemSelection = (id: number) => {
        setSelectedItems((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        setSelectedItems((prev) =>
            prev.length === paginatedEquipments.length ? [] : paginatedEquipments.map((eq) => eq.id)
        );
    };

    const handleViewEquipment = (equipment: Equipment) => {
        const equipmentWithUpdatedAccessories = {
            ...equipment,
            pumpAccessories:
                formAccessories.length > 0 ? formAccessories : equipment.pumpAccessories,
        };

        setSelectedEquipment(equipmentWithUpdatedAccessories);
        setShowEquipmentDetail(true);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-800">
                <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />
                    <div className="mt-4 text-lg text-gray-50">{t('กำลังโหลด...')}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-800">
            <Navbar />
            <div className="mx-auto px-4 py-8">
                <div className="rounded-lg bg-gray-700 shadow-xl">
                    <div className="border-b border-gray-600 p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <h1 className="flex items-center text-3xl font-bold text-gray-50">
                                    {t('ระบบจัดการคลังสินค้า')}
                                </h1>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setEditingCategory(undefined);
                                        setShowCategoryForm(true);
                                    }}
                                    className="flex items-center rounded-lg bg-green-600 px-4 py-2 text-white shadow-lg transition-colors hover:bg-green-700"
                                >
                                    <Tag className="mr-2 h-5 w-5" />
                                    {t('เพิ่มหมวดหมู่')}
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingEquipment(undefined);
                                        setShowEquipmentForm(true);
                                        setFormAccessories([]);
                                    }}
                                    disabled={saving}
                                    className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white shadow-lg transition-colors hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Plus className="mr-2 h-5 w-5" />
                                    {t('เพิ่มสินค้า')}
                                </button>
                            </div>
                        </div>

                        <StatsDashboard stats={stats} categories={categories} />

                        <div className="space-y-4">
                            <div className="flex flex-col gap-4 md:flex-row">
                                <div className="flex flex-1 items-center gap-2">
                                    <Search className="h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder={t('ค้นหาด้วยชื่อ, รหัส, หรือแบรนด์...')}
                                        value={filters.search}
                                        onChange={(e) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                search: e.target.value,
                                            }))
                                        }
                                        className="flex-1 rounded-lg border border-gray-500 bg-gray-600 p-3 text-white placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Filter className="h-5 w-5 text-gray-400" />
                                    <select
                                        value={selectedCategoryId || ''}
                                        onChange={(e) => {
                                            const categoryId = e.target.value
                                                ? parseInt(e.target.value)
                                                : null;
                                            setSelectedCategoryId(categoryId);
                                            setFilters((prev) => ({ ...prev, categoryId }));
                                        }}
                                        className="rounded-lg border border-gray-500 bg-gray-600 p-3 text-white shadow-sm focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">{t('ทุกหมวดหมู่')}</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.display_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <select
                                    value={filters.status}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            status: e.target.value as any,
                                        }))
                                    }
                                    className="rounded-lg border border-gray-500 bg-gray-600 p-3 text-white shadow-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">{t('ทุกสถานะ')}</option>
                                    <option value="active">{t('เปิดใช้งาน')}</option>
                                    <option value="inactive">{t('ปิดใช้งาน')}</option>
                                </select>

                                <select
                                    value={`${filters.sortBy}-${filters.sortOrder}`}
                                    onChange={(e) => {
                                        const [sortBy, sortOrder] = e.target.value.split('-');
                                        setFilters((prev) => ({
                                            ...prev,
                                            sortBy: sortBy as any,
                                            sortOrder: sortOrder as any,
                                        }));
                                    }}
                                    className="rounded-lg border border-gray-500 bg-gray-600 p-3 text-white shadow-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="created_at-desc">{t('ใหม่สุด')}</option>
                                    <option value="created_at-asc">{t('เก่าสุด')}</option>
                                    <option value="name-asc">ชื่อ ก-ฮ</option>
                                    <option value="name-desc">ชื่อ ฮ-ก</option>
                                    <option value="price-asc">{t('ราคา น้อย-มาก')}</option>
                                    <option value="price-desc">{t('ราคา มาก-น้อย')}</option>
                                </select>

                                <div className="flex items-center overflow-hidden rounded-lg border border-gray-500 shadow-sm">
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`p-3 transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
                                    >
                                        <List className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-3 transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
                                    >
                                        <Grid className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {selectedItems.length > 0 && (
                                <div className="flex items-center gap-4 rounded-lg bg-blue-900 p-4 shadow-lg">
                                    <span className="text-blue-200">
                                        {t('เลือก')} {selectedItems.length} {t('รายการ')}
                                    </span>
                                    <button
                                        onClick={() => handleBulkToggleStatus(true)}
                                        className="rounded bg-green-600 px-3 py-1 text-white shadow-sm transition-colors hover:bg-green-700"
                                    >
                                        {t('เปิดใช้งาน')}
                                    </button>
                                    <button
                                        onClick={() => handleBulkToggleStatus(false)}
                                        className="rounded bg-yellow-600 px-3 py-1 text-white shadow-sm transition-colors hover:bg-yellow-700"
                                    >
                                        {t('ปิดใช้งาน')}
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="rounded bg-red-600 px-3 py-1 text-white shadow-sm transition-colors hover:bg-red-700"
                                    >
                                        {t('ลบทั้งหมด')}
                                    </button>
                                    <button
                                        onClick={() => setSelectedItems([])}
                                        className="rounded bg-gray-600 px-3 py-1 text-white shadow-sm transition-colors hover:bg-gray-700"
                                    >
                                        {t('ยกเลิก')}
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between text-sm text-gray-300">
                                <div>
                                    {t('แสดง')} {paginatedEquipments.length} {t('จากทั้งหมด')}{' '}
                                    {filteredAndSortedEquipments.length} {t('รายการ')}
                                </div>

                                {viewMode === 'table' && (
                                    <label className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedItems.length ===
                                                    paginatedEquipments.length &&
                                                paginatedEquipments.length > 0
                                            }
                                            onChange={toggleSelectAll}
                                            className="h-4 w-4"
                                        />
                                        <span>{t('เลือกทั้งหมด')}</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        {filteredAndSortedEquipments.length === 0 ? (
                            <div className="py-12 text-center">
                                <Package className="mx-auto mb-4 h-16 w-16 text-gray-500" />
                                <div className="text-lg text-gray-400">
                                    {t('ไม่พบข้อมูลสินค้า')}
                                </div>
                                {equipments.length === 0 ? (
                                    <div className="mt-2 text-sm text-gray-500">
                                        {t('ยังไม่มีสินค้าในระบบ')} {t('คลิกปุ่ม')} "
                                        {t('เพิ่มสินค้า')}" {t('เพื่อเริ่มต้น')}
                                    </div>
                                ) : (
                                    <div className="mt-2 text-sm text-gray-500">
                                        {t('ลองเปลี่ยนเงื่อนไขการค้นหาหรือกรองข้อมูล')}
                                    </div>
                                )}
                            </div>
                        ) : viewMode === 'grid' ? (
                            <>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                                    {paginatedEquipments.map((equipment) => {
                                        return (
                                            <div
                                                key={equipment.id}
                                                className="group cursor-pointer rounded-lg border border-gray-600 bg-gray-800 p-4 transition-all hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/20"
                                                onClick={() => handleViewEquipment(equipment)}
                                            >
                                                <div className="mb-3 flex items-start justify-between">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="mb-1 truncate text-sm font-semibold text-white group-hover:text-blue-300">
                                                            {equipment.name}
                                                        </h3>
                                                        <p className="truncate text-xs text-gray-400">
                                                            {equipment.product_code ||
                                                                equipment.productCode}
                                                        </p>
                                                        {equipment.brand && (
                                                            <p className="truncate text-xs text-blue-400">
                                                                {equipment.brand}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingEquipment(equipment);
                                                                setShowEquipmentForm(true);
                                                                setFormAccessories(
                                                                    equipment.pumpAccessories ||
                                                                        equipment.pumpAccessory ||
                                                                        []
                                                                );
                                                            }}
                                                            className="rounded p-1 text-blue-400 transition-colors hover:bg-blue-900"
                                                            title={t('แก้ไข')}
                                                        >
                                                            <Edit2 className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteEquipment(equipment);
                                                            }}
                                                            className="rounded p-1 text-red-400 transition-colors hover:bg-red-900"
                                                            title={t('ลบ')}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {equipment.image ? (
                                                    <img
                                                        src={getImageUrl(equipment.image)} // <<-- 2. แก้ไข
                                                        alt={equipment.name}
                                                        className="mb-3 h-24 w-full cursor-pointer rounded object-cover shadow-lg transition-transform hover:opacity-80 group-hover:scale-105"
                                                        onError={(e) => {
                                                            const target =
                                                                e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            const parent = target.parentElement;
                                                            if (parent) {
                                                                const placeholder =
                                                                    parent.querySelector(
                                                                        '.image-placeholder'
                                                                    ) as HTMLElement;
                                                                if (placeholder)
                                                                    placeholder.style.display =
                                                                        'flex';
                                                            }
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openImageModal(
                                                                getImageUrl(equipment.image!), // <<-- 2. แก้ไข
                                                                equipment.name
                                                            );
                                                        }}
                                                        title={t('คลิกเพื่อดูรูปขนาดใหญ่')}
                                                    />
                                                ) : null}
                                                <div
                                                    className={`image-placeholder mb-3 flex h-24 w-full items-center justify-center rounded bg-gray-700 shadow-inner ${equipment.image ? 'hidden' : 'flex'}`}
                                                >
                                                    <Package className="h-8 w-8 text-gray-500" />
                                                </div>

                                                <div className="space-y-1 text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">
                                                            {t('ราคา:')}
                                                        </span>
                                                        <span className="font-semibold text-green-400">
                                                            ฿{equipment.price.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">
                                                            {t('สถานะ:')}
                                                        </span>
                                                        <span
                                                            className={`font-semibold ${equipment.is_active ? 'text-green-400' : 'text-red-400'}`}
                                                        >
                                                            {equipment.is_active
                                                                ? t('ใช้งาน')
                                                                : t('ปิดใช้งาน')}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">
                                                            {t('หมวดหมู่:')}
                                                        </span>
                                                        <span className="truncate text-blue-400">
                                                            {
                                                                categories.find(
                                                                    (c) =>
                                                                        c.id ===
                                                                        equipment.category_id
                                                                )?.display_name
                                                            }
                                                        </span>
                                                    </div>
                                                    {equipment.stock && (
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">
                                                                {t('Stock:')}
                                                            </span>
                                                            <span className="font-semibold text-blue-400">
                                                                {equipment.stock.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {equipment.description && (
                                                    <p className="mt-2 line-clamp-2 text-xs text-gray-500">
                                                        {equipment.description}
                                                    </p>
                                                )}

                                                {equipment.attributes &&
                                                    Object.keys(equipment.attributes).length >
                                                        0 && (
                                                        <div className="mt-2 text-xs">
                                                            <div className="mb-1 text-gray-400">
                                                                {t('คุณสมบัติ:')}
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {Object.entries(
                                                                    equipment.attributes
                                                                )
                                                                    .slice(0, 2)
                                                                    .map(([key, value]) => {
                                                                        let displayValue = '';
                                                                        if (Array.isArray(value)) {
                                                                            if (
                                                                                value.length ===
                                                                                    2 &&
                                                                                typeof value[0] ===
                                                                                    'number'
                                                                            ) {
                                                                                displayValue = `${value[0]}-${value[1]}`;
                                                                            } else {
                                                                                displayValue =
                                                                                    value.join(
                                                                                        ', '
                                                                                    );
                                                                            }
                                                                        } else if (
                                                                            typeof value ===
                                                                            'number'
                                                                        ) {
                                                                            displayValue =
                                                                                value.toLocaleString();
                                                                        } else if (
                                                                            typeof value ===
                                                                            'boolean'
                                                                        ) {
                                                                            displayValue = value
                                                                                ? t('ใช่')
                                                                                : t('ไม่ใช่');
                                                                        } else {
                                                                            displayValue =
                                                                                String(value);
                                                                        }

                                                                        return (
                                                                            <span
                                                                                key={key}
                                                                                className="rounded bg-gray-700 px-2 py-1 text-gray-300 shadow-sm"
                                                                                title={`${key}: ${displayValue}`}
                                                                            >
                                                                                {displayValue.length >
                                                                                10
                                                                                    ? displayValue.substring(
                                                                                          0,
                                                                                          10
                                                                                      ) + '...'
                                                                                    : displayValue}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                {Object.keys(equipment.attributes)
                                                                    .length > 2 && (
                                                                    <span className="rounded bg-gray-700 px-2 py-1 text-gray-400 shadow-sm">
                                                                        +
                                                                        {Object.keys(
                                                                            equipment.attributes
                                                                        ).length - 2}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                {(equipment.pumpAccessories ||
                                                    equipment.pumpAccessory) &&
                                                    (equipment.pumpAccessories ||
                                                        equipment.pumpAccessory)!.length > 0 && (
                                                        <div className="mt-2 flex items-center text-xs text-orange-400">
                                                            <Wrench className="mr-1 h-3 w-3" />
                                                            {t('อุปกรณ์ประกอบ')}{' '}
                                                            {
                                                                (equipment.pumpAccessories ||
                                                                    equipment.pumpAccessory)!.length
                                                            }{' '}
                                                            {t('รายการ')}
                                                        </div>
                                                    )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                    totalItems={filteredAndSortedEquipments.length}
                                    itemsPerPage={itemsPerPage}
                                />
                            </>
                        ) : (
                            <>
                                <div className="overflow-x-auto rounded-lg shadow-lg">
                                    <table className="w-full text-left text-xs text-gray-300">
                                        <thead className="bg-gray-600 text-xs uppercase text-gray-400">
                                            <tr>
                                                <th className="px-6 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            selectedItems.length ===
                                                                paginatedEquipments.length &&
                                                            paginatedEquipments.length > 0
                                                        }
                                                        onChange={toggleSelectAll}
                                                        className="h-4 w-4"
                                                    />
                                                </th>
                                                <th className="px-6 py-3 text-center">
                                                    {t('รูปภาพ')}
                                                </th>
                                                <th className="px-6 py-3 text-center">
                                                    {t('รหัสสินค้า')}
                                                </th>
                                                <th className="px-6 py-3">{t('ชื่อสินค้า')}</th>
                                                <th className="px-6 py-3 text-center">
                                                    {t('แบรนด์')}
                                                </th>
                                                <th className="px-6 py-3 text-center">
                                                    {t('หมวดหมู่')}
                                                </th>
                                                <th className="px-6 py-3 text-center">
                                                    {t('ราคา')}
                                                </th>
                                                <th className="px-6 py-3 text-center">
                                                    {t('Stock')}
                                                </th>
                                                <th className="px-6 py-3 text-center">
                                                    {t('สถานะ')}
                                                </th>
                                                <th className="px-6 py-3 text-center">
                                                    {t('คุณสมบัติ')}
                                                </th>
                                                <th className="px-6 py-3 text-center">
                                                    {t('จัดการ')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedEquipments.map((equipment) => (
                                                <tr
                                                    key={equipment.id}
                                                    className={`cursor-pointer border-b border-gray-600 transition-colors hover:bg-gray-600 ${
                                                        selectedItems.includes(equipment.id)
                                                            ? 'bg-blue-900'
                                                            : 'bg-gray-700'
                                                    }`}
                                                    onClick={() => handleViewEquipment(equipment)}
                                                >
                                                    <td
                                                        className="px-3 text-center"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedItems.includes(
                                                                equipment.id
                                                            )}
                                                            onChange={() =>
                                                                toggleItemSelection(equipment.id)
                                                            }
                                                            className="h-4 w-4"
                                                        />
                                                    </td>
                                                    <td className="px-3 text-center">
                                                        {equipment.image ? (
                                                            <img
                                                                src={getImageUrl(equipment.image)} // <<-- 2. แก้ไข
                                                                alt={equipment.name}
                                                                className="h-10 w-10 cursor-pointer rounded border border-gray-600 object-cover shadow-sm transition-opacity hover:border-blue-400 hover:opacity-80"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openImageModal(
                                                                        getImageUrl(equipment.image!), // <<-- 2. แก้ไข
                                                                        equipment.name
                                                                    );
                                                                }}
                                                                title={t('คลิกเพื่อดูรูปขนาดใหญ่')}
                                                                onError={(e) => {
                                                                    const target =
                                                                        e.target as HTMLImageElement;
                                                                    target.style.display = 'none';
                                                                    const parent =
                                                                        target.parentElement;
                                                                    if (parent) {
                                                                        const placeholder =
                                                                            parent.querySelector(
                                                                                '.image-placeholder'
                                                                            ) as HTMLElement;
                                                                        if (placeholder)
                                                                            placeholder.style.display =
                                                                                'flex';
                                                                    }
                                                                }}
                                                            />
                                                        ) : null}
                                                        <div
                                                            className={`image-placeholder flex h-10 w-10 items-center justify-center rounded border border-gray-500 bg-gray-600 shadow-sm ${equipment.image ? 'hidden' : 'flex'}`}
                                                        >
                                                            <ImageIcon className="h-5 w-5 text-gray-400" />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 text-center font-medium text-white">
                                                        {equipment.product_code ||
                                                            equipment.productCode ||
                                                            '-'}
                                                    </td>
                                                    <td className="max-w-xs truncate px-3">
                                                        {equipment.name}
                                                    </td>
                                                    <td className="px-3 text-center">
                                                        {equipment.brand || '-'}
                                                    </td>
                                                    <td className="px-3 text-center">
                                                        <span className="rounded bg-gray-600 px-2 py-1 text-xs shadow-sm">
                                                            {
                                                                categories.find(
                                                                    (c) =>
                                                                        c.id ===
                                                                        equipment.category_id
                                                                )?.name
                                                            }
                                                        </span>
                                                    </td>
                                                    <td className="px-3 text-center font-semibold text-green-400">
                                                        ฿{equipment.price.toLocaleString()}
                                                    </td>
                                                    <td className="px-3 text-center">
                                                        {equipment.stock ? (
                                                            <span className="font-semibold text-blue-400">
                                                                {equipment.stock.toLocaleString()}
                                                            </span>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </td>
                                                    <td className="px-3 text-center">
                                                        <span
                                                            className={`flex w-fit items-center rounded-full px-2 py-1 text-xs shadow-sm ${
                                                                equipment.is_active
                                                                    ? 'bg-green-900 text-green-300'
                                                                    : 'bg-red-900 text-red-300'
                                                            }`}
                                                        >
                                                            {equipment.is_active ? (
                                                                <>
                                                                    <CheckCircle className="mr-1 h-3 w-3" />{' '}
                                                                    {t('ใช้งาน')}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <XCircle className="mr-1 h-3 w-3" />{' '}
                                                                    {t('ปิดใช้งาน')}
                                                                </>
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 text-center">
                                                        <div className="flex items-center gap-2">
                                                            {equipment.attributes &&
                                                                Object.keys(equipment.attributes)
                                                                    .length > 0 && (
                                                                    <span className="rounded bg-purple-900 px-2 py-1 text-xs text-purple-300 shadow-sm">
                                                                        {
                                                                            Object.keys(
                                                                                equipment.attributes
                                                                            ).length
                                                                        }{' '}
                                                                        {t('คุณสมบัติ')}
                                                                    </span>
                                                                )}
                                                            {(equipment.pumpAccessories ||
                                                                equipment.pumpAccessory) &&
                                                                (equipment.pumpAccessories ||
                                                                    equipment.pumpAccessory)!
                                                                    .length > 0 && (
                                                                    <span className="flex items-center rounded bg-orange-900 px-2 py-1 text-xs text-orange-300 shadow-sm">
                                                                        <Wrench className="mr-1 h-3 w-3" />
                                                                        {
                                                                            (equipment.pumpAccessories ||
                                                                                equipment.pumpAccessory)!
                                                                                .length
                                                                        }{' '}
                                                                        {t('อุปกรณ์')}
                                                                    </span>
                                                                )}
                                                        </div>
                                                    </td>
                                                    <td
                                                        className="px-6 py-4 text-center"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    handleViewEquipment(equipment)
                                                                }
                                                                className="rounded p-2 text-blue-400 shadow-sm transition-colors hover:bg-blue-900"
                                                                title={t('ดูรายละเอียด')}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingEquipment(equipment);
                                                                    setShowEquipmentForm(true);
                                                                    setFormAccessories(
                                                                        equipment.pumpAccessories ||
                                                                            equipment.pumpAccessory ||
                                                                            []
                                                                    );
                                                                }}
                                                                className="rounded p-2 text-green-400 shadow-sm transition-colors hover:bg-green-900"
                                                                title={t('แก้ไข')}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleDeleteEquipment(equipment)
                                                                }
                                                                className="rounded p-2 text-red-400 shadow-sm transition-colors hover:bg-red-900"
                                                                title={t('ลบ')}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                    totalItems={filteredAndSortedEquipments.length}
                                    itemsPerPage={itemsPerPage}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showCategoryForm && (
                <CategoryForm
                    category={editingCategory}
                    onSave={handleSaveCategory}
                    onCancel={() => {
                        setShowCategoryForm(false);
                        setEditingCategory(undefined);
                    }}
                />
            )}

            {showEquipmentForm && (
                <EquipmentForm
                    equipment={editingEquipment}
                    categories={categories}
                    onSave={handleSaveEquipment}
                    onCancel={() => {
                        setShowEquipmentForm(false);
                        setEditingEquipment(undefined);
                        setFormAccessories([]);
                    }}
                    onImageClick={openImageModal}
                />
            )}

            {showEquipmentDetail && selectedEquipment && (
                <EquipmentDetailModal
                    equipment={selectedEquipment}
                    updatedAccessories={formAccessories.length > 0 ? formAccessories : undefined}
                    onClose={() => {
                        setShowEquipmentDetail(false);
                        setSelectedEquipment(undefined);
                    }}
                    onEdit={() => {
                        setEditingEquipment(selectedEquipment);
                        setShowEquipmentForm(true);
                        setFormAccessories(
                            selectedEquipment.pumpAccessories ||
                                selectedEquipment.pumpAccessory ||
                                []
                        );
                        setShowEquipmentDetail(false);
                        setSelectedEquipment(undefined);
                    }}
                    onImageClick={openImageModal}
                />
            )}

            <ImageModal
                isOpen={imageModal.isOpen}
                imageSrc={imageModal.imageSrc}
                imageAlt={imageModal.imageAlt}
                onClose={closeImageModal}
            />
            <Footer />
        </div>
    );
};

export default EquipmentCRUD;