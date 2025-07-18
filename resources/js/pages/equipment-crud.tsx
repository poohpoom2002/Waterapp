// resources\js\pages\equipment-crud.tsx

import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';

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
    console.log('🔄 API Request:', {
        url: `/api${url}`,
        method: options.method || 'GET',
        headers: options.headers,
    });

    const response = await fetch(`/api${url}`, {
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...options.headers,
        },
        ...options,
    });

    console.log('📡 API Response:', {
        url: `/api${url}`,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', {
            url: `/api${url}`,
            status: response.status,
            errorData,
        });
        throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ API Success:', {
        url: `/api${url}`,
        dataType: Array.isArray(data) ? 'array' : typeof data,
        count: Array.isArray(data) ? data.length : 'N/A',
        sample: Array.isArray(data) && data.length > 0 ? data[0] : data,
    });

    return data;
};

const getAllEquipments = async (params?: any): Promise<Equipment[]> => {
    try {
        console.log('🎯 getAllEquipments called with params:', params);

        const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
        const fullUrl = `/equipments${queryString}`;

        console.log('📝 Making request to:', fullUrl);

        const data = await apiRequest(fullUrl);

        console.log('🔍 Raw API response analysis:', {
            isArray: Array.isArray(data),
            length: Array.isArray(data) ? data.length : 'N/A',
            type: typeof data,
            keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
        });

        if (Array.isArray(data)) {
            console.log('✅ Returning array of equipments:', data.length);
            return data;
        } else {
            console.warn('⚠️ Expected array but got:', typeof data, data);
            return [];
        }
    } catch (error) {
        console.error('💥 getAllEquipments error:', error);
        return [];
    }
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
    description?: string;
    is_active: boolean;
    category?: EquipmentCategory;
    attributes?: { [key: string]: any };
    attributes_raw?: { [key: string]: any };
    formatted_attributes?: any[];
    pumpAccessories?: PumpAccessory[];
    pumpAccessory?: PumpAccessory[];
    created_at?: string;
    updated_at?: string;
}

interface PumpAccessory {
    id?: number;
    pump_id?: number;
    accessory_type: 'foot_valve' | 'check_valve' | 'ball_valve' | 'pressure_gauge' | 'other';
    name: string;
    image?: string;
    size?: string;
    specifications?: any;
    price: number;
    is_included: boolean;
    sort_order: number;
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
};

const Pagination: React.FC<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
    itemsPerPage: number;
}> = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
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
                แสดง {startItem}-{endItem} จาก {totalItems} รายการ
            </div>

            <button
                className="rounded border border-gray-600 bg-gray-700 px-3 py-1 text-white hover:bg-gray-600 disabled:opacity-50"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                title="หน้าแรก"
            >
                <ChevronFirst className="h-4 w-4" />
            </button>

            <button
                className="rounded border border-gray-600 bg-gray-700 px-3 py-1 text-white hover:bg-gray-600 disabled:opacity-50"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="หน้าก่อนหน้า"
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
                title="หน้าถัดไป"
            >
                <ChevronRight className="h-4 w-4" />
            </button>

            <button
                className="rounded border border-gray-600 bg-gray-700 px-3 py-1 text-white hover:bg-gray-600 disabled:opacity-50"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                title="หน้าสุดท้าย"
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

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name.trim()) {
            newErrors.name = 'กรุณากรอกชื่อระบบ';
        } else if (!/^[a-z0-9_]+$/.test(formData.name)) {
            newErrors.name =
                'ชื่อระบบต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์เล็ก ตัวเลข และ underscore เท่านั้น';
        }

        if (!formData.display_name.trim()) {
            newErrors.display_name = 'กรุณากรอกชื่อแสดง';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const addAttribute = () => {
        if (!newAttribute.attribute_name || !newAttribute.display_name) {
            showAlert.warning('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อระบบและชื่อแสดงของคุณสมบัติ');
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
            showAlert.error('ข้อมูลไม่ถูกต้อง', 'กรุณาตรวจสอบข้อมูลที่กรอกใหม่อีกครั้ง');
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
        console.log('📤 Sending category data:', dataToSend);
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
                        {category ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
                    </h2>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    ชื่อระบบ (ภาษาอังกฤษ) *
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
                                    placeholder="เช่น sprinkler, pump"
                                    required
                                />
                                {errors.name && (
                                    <div className="mt-1 text-xs text-red-400">{errors.name}</div>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">ชื่อแสดง *</label>
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
                                    placeholder="เช่น สปริงเกอร์, ปั๊มน้ำ"
                                    required
                                />
                                {errors.display_name && (
                                    <div className="mt-1 text-xs text-red-400">
                                        {errors.display_name}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">ไอคอน</label>
                                <input
                                    type="text"
                                    value={formData.icon}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, icon: e.target.value }))
                                    }
                                    className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 focus:ring-2 focus:ring-blue-500"
                                    placeholder="emoji หรือ icon class"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-medium">คำอธิบาย</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            description: e.target.value,
                                        }))
                                    }
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 focus:ring-2 focus:ring-blue-500"
                                    placeholder="คำอธิบายหมวดหมู่"
                                />
                            </div>
                        </div>

                        <div className="border-t border-gray-600 pt-6">
                            <h3 className="mb-4 text-lg font-semibold">คุณสมบัติเฉพาะ</h3>

                            <div className="mb-4 rounded-lg bg-gray-700 p-4">
                                <h4 className="mb-3 font-medium">เพิ่มคุณสมบัติใหม่</h4>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5">
                                    <input
                                        type="text"
                                        placeholder="ชื่อระบบ (attribute_name)"
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
                                        placeholder="ชื่อแสดง"
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
                                        <option value="string">ตัวอักษร</option>
                                        <option value="number">ตัวเลข</option>
                                        <option value="array">ช่วง ต่ำ-สูง</option>
                                        <option value="boolean">Boolean</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="หน่วย"
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
                                        <span className="text-sm">จำเป็น</span>
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
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex items-center rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PumpAccessoryForm: React.FC<{
    accessories: PumpAccessory[];
    onChange: (accessories: PumpAccessory[]) => void;
    onImageClick?: (src: string, alt: string) => void;
}> = ({ accessories, onChange, onImageClick }) => {
    const accessoryTypes = [
        { value: 'foot_valve', label: 'Foot Valve' },
        { value: 'check_valve', label: 'Check Valve' },
        { value: 'ball_valve', label: 'Ball Valve' },
        { value: 'pressure_gauge', label: 'Pressure Gauge' },
        { value: 'other', label: 'อื่นๆ' },
    ];

    const [imageUploading, setImageUploading] = useState<{ [key: number]: boolean }>({});

    const addAccessory = () => {
        const newAccessory: PumpAccessory = {
            accessory_type: 'other',
            name: '',
            image: '',
            size: '',
            specifications: {},
            price: 0,
            is_included: true,
            sort_order: accessories.length,
        };
        onChange([...accessories, newAccessory]);
    };

    const updateAccessory = (index: number, field: keyof PumpAccessory, value: any) => {
        const updated = [...accessories];
        (updated[index] as any)[field] = value;
        onChange(updated);
    };

    const removeAccessory = (index: number) => {
        const updated = accessories.filter((_, i) => i !== index);
        updated.forEach((acc, i) => {
            acc.sort_order = i;
        });
        onChange(updated);
    };

    const moveAccessory = (fromIndex: number, toIndex: number) => {
        const updated = [...accessories];
        const [movedItem] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, movedItem);

        updated.forEach((acc, i) => {
            acc.sort_order = i;
        });
        onChange(updated);
    };

    const updateSpecification = (accessoryIndex: number, specKey: string, specValue: string) => {
        const updated = [...accessories];
        if (!updated[accessoryIndex].specifications) {
            updated[accessoryIndex].specifications = {};
        }
        updated[accessoryIndex].specifications[specKey] = specValue;
        onChange(updated);
    };

    const removeSpecification = (accessoryIndex: number, specKey: string) => {
        const updated = [...accessories];
        if (updated[accessoryIndex].specifications) {
            delete updated[accessoryIndex].specifications[specKey];
        }
        onChange(updated);
    };

    const handleImageUpload = async (file: File, accessoryIndex: number) => {
        if (!file) return;

        setImageUploading((prev) => ({ ...prev, [accessoryIndex]: true }));
        try {
            const result = await api.uploadImage(file);
            updateAccessory(accessoryIndex, 'image', result.url);
            showAlert.success('อัปโหลดสำเร็จ', 'รูปภาพได้รับการอัปโหลดเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Failed to upload image:', error);
            showAlert.error('เกิดข้อผิดพลาด', 'ไม่สามารถอัปโหลดรูปภาพได้');
        } finally {
            setImageUploading((prev) => ({ ...prev, [accessoryIndex]: false }));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-orange-400">
                    อุปกรณ์ประกอบปั๊ม ({accessories.length} รายการ)
                </h4>
                <button
                    type="button"
                    onClick={addAccessory}
                    className="flex items-center rounded bg-green-600 px-3 py-2 text-white transition-colors hover:bg-green-700"
                >
                    <Plus className="mr-1 h-4 w-4" />
                    เพิ่มอุปกรณ์
                </button>
            </div>

            {accessories.length === 0 && (
                <div className="rounded-lg border border-gray-600 bg-gray-700 p-6 text-center">
                    <Wrench className="mx-auto h-12 w-12 text-gray-500" />
                    <p className="mt-2 text-gray-400">ยังไม่มีอุปกรณ์ประกอบ</p>
                    <p className="text-sm text-gray-500">คลิก "เพิ่มอุปกรณ์" เพื่อเริ่มต้น</p>
                </div>
            )}

            <div className="space-y-4">
                {accessories.map((accessory, index) => (
                    <div key={index} className="rounded-lg border border-gray-600 bg-gray-700 p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="rounded bg-orange-600 px-2 py-1 text-xs text-white">
                                    #{index + 1}
                                </span>
                                <span className="text-sm text-gray-400">
                                    Order: {accessory.sort_order + 1}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => index > 0 && moveAccessory(index, index - 1)}
                                    disabled={index === 0}
                                    className="rounded p-1 text-gray-400 transition-colors hover:text-white disabled:opacity-50"
                                    title="ย้ายขึ้น"
                                >
                                    <ChevronDown className="h-4 w-4 rotate-180" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        index < accessories.length - 1 &&
                                        moveAccessory(index, index + 1)
                                    }
                                    disabled={index === accessories.length - 1}
                                    className="rounded p-1 text-gray-400 transition-colors hover:text-white disabled:opacity-50"
                                    title="ย้ายลง"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => removeAccessory(index)}
                                    className="rounded p-1 text-red-400 transition-colors hover:text-red-300"
                                    title="ลบ"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-sm font-medium">ประเภท *</label>
                                <select
                                    value={accessory.accessory_type}
                                    onChange={(e) =>
                                        updateAccessory(index, 'accessory_type', e.target.value)
                                    }
                                    className="w-full rounded border border-gray-600 bg-gray-600 p-2 text-white focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    {accessoryTypes.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">ชื่อ *</label>
                                <input
                                    type="text"
                                    value={accessory.name}
                                    onChange={(e) => updateAccessory(index, 'name', e.target.value)}
                                    className="w-full rounded border border-gray-600 bg-gray-600 p-2 text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="ชื่ออุปกรณ์"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    ขนาด/คำอธิบาย
                                </label>
                                <input
                                    type="text"
                                    value={accessory.size || ''}
                                    onChange={(e) => updateAccessory(index, 'size', e.target.value)}
                                    className="w-full rounded border border-gray-600 bg-gray-600 p-2 text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder='เช่น 1/2", 25mm'
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">ราคา *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={accessory.price}
                                    onChange={(e) =>
                                        updateAccessory(
                                            index,
                                            'price',
                                            parseFloat(e.target.value) || 0
                                        )
                                    }
                                    className="w-full rounded border border-gray-600 bg-gray-600 p-2 text-white focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="flex items-center">
                                <label className="flex cursor-pointer items-center">
                                    <input
                                        type="checkbox"
                                        checked={accessory.is_included}
                                        onChange={(e) =>
                                            updateAccessory(index, 'is_included', e.target.checked)
                                        }
                                        className="mr-2 h-4 w-4"
                                    />
                                    <span className="text-sm">รวมในชุด</span>
                                </label>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">ลำดับ</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={accessory.sort_order + 1}
                                    onChange={(e) =>
                                        updateAccessory(
                                            index,
                                            'sort_order',
                                            parseInt(e.target.value) || 0
                                        )
                                    }
                                    className="w-full rounded border border-gray-600 bg-gray-600 p-2 text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="mb-2 block text-sm font-medium">รูปภาพ</label>
                            <div className="flex items-center gap-4">
                                {accessory.image && (
                                    <img
                                        src={accessory.image}
                                        alt="Accessory"
                                        className="h-20 w-20 cursor-pointer rounded-lg border border-gray-600 object-cover transition-opacity hover:border-blue-400 hover:opacity-80"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                        }}
                                        onClick={() =>
                                            onImageClick &&
                                            onImageClick(accessory.image!, accessory.name)
                                        }
                                        title="คลิกเพื่อดูรูปขนาดใหญ่"
                                    />
                                )}
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageUpload(file, index);
                                        }}
                                        className="mt-2 w-full text-sm text-gray-300"
                                        disabled={imageUploading[index]}
                                    />
                                    {imageUploading[index] && (
                                        <div className="mt-1 text-xs text-blue-400">
                                            กำลังอัปโหลด...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="mb-2 block text-sm font-medium">ข้อมูลจำเพาะ</label>
                            <div className="space-y-2">
                                {accessory.specifications &&
                                    Object.entries(accessory.specifications).map(
                                        ([key, value], specIndex) => (
                                            <div
                                                key={specIndex}
                                                className="flex items-center gap-2"
                                            >
                                                <input
                                                    type="text"
                                                    value={key}
                                                    onChange={(e) => {
                                                        const newKey = e.target.value;
                                                        removeSpecification(index, key as string);
                                                        updateSpecification(
                                                            index,
                                                            newKey,
                                                            value as string
                                                        );
                                                    }}
                                                    placeholder="คีย์"
                                                    className="flex-1 rounded border border-gray-600 bg-gray-600 p-2 text-white focus:ring-2 focus:ring-blue-500"
                                                />
                                                <span className="text-gray-400">:</span>
                                                <input
                                                    type="text"
                                                    value={value as string}
                                                    onChange={(e) =>
                                                        updateSpecification(
                                                            index,
                                                            key,
                                                            e.target.value
                                                        )
                                                    }
                                                    className="flex-1 rounded border border-gray-600 bg-gray-600 p-2 text-white focus:ring-2 focus:ring-blue-500"
                                                    placeholder="ค่า"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeSpecification(index, key)}
                                                    className="rounded p-2 text-red-400 transition-colors hover:text-red-300"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )
                                    )}
                                <button
                                    type="button"
                                    onClick={() => updateSpecification(index, '', '')}
                                    className="text-sm text-blue-400 transition-colors hover:text-blue-300"
                                >
                                    + เพิ่มข้อมูลจำเพาะ
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
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
        description: equipment?.description || '',
        is_active: equipment?.is_active !== undefined ? equipment.is_active : true,
        attributes: {},
    });

    const [attributes, setAttributes] = useState<EquipmentAttribute[]>([]);
    const [accessories, setAccessories] = useState<PumpAccessory[]>([]);
    const [loading, setLoading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<any>({});

    useEffect(() => {
        if (equipment) {
            console.log('=== POPULATING INITIAL DATA ===');
            console.log('Equipment received:', equipment);

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
                description: equipment.description,
                is_active: equipment.is_active,
                attributes: initialAttributes,
            });

            console.log('Final attributes set:', initialAttributes);

            const pumpAccessories = equipment.pumpAccessories || equipment.pumpAccessory || [];
            setAccessories(Array.isArray(pumpAccessories) ? pumpAccessories : []);
        } else {
            setFormData({
                category_id: categories[0]?.id || 1,
                product_code: '',
                name: '',
                brand: '',
                image: '',
                price: 0,
                description: '',
                is_active: true,
                attributes: {},
            });
            setAccessories([]);
        }
    }, [equipment, categories]);

    useEffect(() => {
        console.log('=== CATEGORY CHANGE ===');
        console.log('Current category_id:', formData.category_id);
        console.log('Is editing?', !!equipment);

        if (formData.category_id && formData.category_id !== 0) {
            setLoading(true);
            apiRequest(`/equipment-categories/${formData.category_id}`)
                .then((response) => {
                    console.log('Loaded category with attributes:', response);
                    setAttributes(response.attributes || []);

                    if (
                        !equipment ||
                        (equipment &&
                            (equipment.category_id || equipment.categoryId) !==
                                formData.category_id)
                    ) {
                        console.log('Resetting attributes for new category');
                        setFormData((prev) => ({
                            ...prev,
                            attributes: {},
                        }));
                        setAccessories([]);
                    }
                })
                .catch((error) => {
                    console.error('Failed to load category attributes:', error);
                    setAttributes([]);
                })
                .finally(() => setLoading(false));
        }
    }, [formData.category_id]);

    const validateForm = () => {
        const newErrors: any = {};

        if (!formData.product_code?.trim()) {
            newErrors.product_code = 'กรุณากรอกรหัสสินค้า';
        }

        if (!formData.name?.trim()) {
            newErrors.name = 'กรุณากรอกชื่อสินค้า';
        }

        if (!formData.price || formData.price <= 0) {
            newErrors.price = 'กรุณากรอกราคาที่ถูกต้อง';
        }

        // Attribute validation
        attributes.forEach((attr) => {
            if (attr.is_required) {
                const value = formData.attributes?.[attr.attribute_name];
                if (!value || (Array.isArray(value) && value.length === 0) || value === '') {
                    newErrors[`attributes.${attr.attribute_name}`] =
                        `กรุณากรอก${attr.display_name}`;
                }
            }
        });

        setValidationErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleImageUpload = async (file: File) => {
        if (!file) return;

        setImageUploading(true);
        try {
            const result = await api.uploadImage(file);
            setFormData((prev) => ({
                ...prev,
                image: result.url,
            }));
            showAlert.success('อัปโหลดสำเร็จ', 'รูปภาพได้รับการอัปโหลดเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Failed to upload image:', error);
            showAlert.error('เกิดข้อผิดพลาด', 'ไม่สามารถอัปโหลดรูปภาพได้');
        } finally {
            setImageUploading(false);
        }
    };

    const handleAttributeChange = (attributeName: string, value: any) => {
        console.log('=== handleAttributeChange ===');
        console.log('Attribute name:', attributeName);
        console.log('New value:', value);

        setFormData((prev) => {
            const newAttributes = {
                ...prev.attributes,
                [attributeName]: value,
            };
            console.log('Updated attributes:', newAttributes);

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
        if (!validateForm()) {
            showAlert.error('ข้อมูลไม่ถูกต้อง', 'กรุณาตรวจสอบข้อมูลที่กรอกใหม่อีกครั้ง');
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

        const processedAccessories = accessories.map((acc, index) => {
            let specifications = acc.specifications;

            if (!specifications || (Array.isArray(specifications) && specifications.length === 0)) {
                specifications = {};
            }
            if (typeof specifications === 'string') {
                try {
                    specifications = JSON.parse(specifications);
                } catch {
                    specifications = {};
                }
            }

            return {
                accessory_type: acc.accessory_type || 'other',
                name: acc.name || '',
                image: acc.image || '',
                size: acc.size || '',
                specifications: specifications,
                price: Number(acc.price) || 0,
                is_included: Boolean(acc.is_included !== undefined ? acc.is_included : true),
                sort_order: Number(acc.sort_order !== undefined ? acc.sort_order : index),
            };
        });

        const submitData = {
            ...formData,
            attributes: attributesData,
            pump_accessories: processedAccessories,
        };

        console.log('=== SUBMIT DATA DEBUG ===');
        console.log('Full submit data:', JSON.stringify(submitData, null, 2));
        console.log('Processed accessories:', processedAccessories);

        try {
            await onSave(submitData);
            showAlert.success(
                equipment ? 'แก้ไขสำเร็จ' : 'เพิ่มสำเร็จ',
                `${formData.name} ได้รับการ${equipment ? 'แก้ไข' : 'เพิ่ม'}เรียบร้อยแล้ว`
            );
        } catch (error: any) {
            console.error('Submit error:', error);

            if (error.response && error.response.data) {
                console.error('Server response:', error.response.data);
                if (error.response.data.errors) {
                    setValidationErrors(error.response.data.errors);
                }
                showAlert.error('เกิดข้อผิดพลาด', JSON.stringify(error.response.data, null, 2));
            } else {
                showAlert.error('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
            }
        } finally {
            setLoading(false);
        }
    };

    const renderAttributeInput = (attr: EquipmentAttribute) => {
        const currentValue = formData.attributes?.[attr.attribute_name];
        const hasError = validationErrors[`attributes.${attr.attribute_name}`];

        console.log(`=== Rendering ${attr.attribute_name} ===`);
        console.log('Attribute:', attr);
        console.log('Current value:', currentValue);

        const baseInputClass = `w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white ${
            hasError ? 'border-red-500' : 'border-gray-600'
        }`;

        let input;

        switch (attr.data_type) {
            case 'string':
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
                break;

            case 'number':
                input = (
                    <input
                        type="number"
                        step="0.01"
                        value={currentValue || ''}
                        onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            handleAttributeChange(attr.attribute_name, value);
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
                                    } else {
                                        handleAttributeChange(attr.attribute_name, value);
                                    }
                                } else {
                                    handleAttributeChange(attr.attribute_name, value);
                                }
                            }}
                            className={baseInputClass}
                            required={attr.is_required}
                            placeholder="Enter values separated by comma or dash (e.g., 10, 20 or 10-20)"
                        />
                        <div className="mt-1 text-xs text-gray-400">
                            ใช้เครื่องหมาย (,) หรือ dash (-) เพื่อแยกค่า
                        </div>
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
                        placeholder='{"key": "value"}'
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
                    {attr.display_name} {attr.unit && `(${attr.unit})`}
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
                        {equipment ? 'แก้ไขอุปกรณ์' : 'เพิ่มอุปกรณ์ใหม่'}
                    </h2>

                    {loading && (
                        <div className="py-4 text-center">
                            <div className="text-gray-300">กำลังโหลดข้อมูล...</div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <label className="mb-2 block text-sm font-medium">หมวดหมู่ *</label>
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
                                    รหัสสินค้า *
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
                                    required
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
                                    ชื่อสินค้า *
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

                            <div>
                                <label className="mb-2 block text-sm font-medium">แบรนด์</label>
                                <input
                                    type="text"
                                    list="brand-options"
                                    value={formData.brand || ''}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, brand: e.target.value }))
                                    }
                                    className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="แบรนด์สินค้า"
                                />
                                <datalist id="brand-options">
                                    <option value="ไชโย" />
                                    <option value="แชมป์" />
                                    <option value="โตไว" />
                                    <option value="ตรามือ" />
                                </datalist>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">ราคา *</label>
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

                            <div className="flex items-center">
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
                                    <span className="text-sm">เปิดใช้งาน</span>
                                </label>
                            </div>

                            <div className="md:col-span-3">
                                <label className="mb-2 block text-sm font-medium">รูปภาพ</label>
                                <div className="flex items-center gap-4">
                                    {formData.image && (
                                        <img
                                            src={formData.image}
                                            alt="Product"
                                            className="h-20 w-20 cursor-pointer rounded-lg border border-gray-600 object-cover transition-opacity hover:border-blue-400 hover:opacity-80"
                                            onClick={() =>
                                                onImageClick &&
                                                onImageClick(formData.image!, 'สินค้า')
                                            }
                                            title="คลิกเพื่อดูรูปขนาดใหญ่"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleImageUpload(file);
                                            }}
                                            className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-white focus:ring-2 focus:ring-blue-500"
                                            disabled={imageUploading}
                                        />
                                        {imageUploading && (
                                            <div className="mt-1 text-xs text-blue-400">
                                                กำลังอัปโหลด...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-3">
                                <label className="mb-2 block text-sm font-medium">คำอธิบาย</label>
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
                                    placeholder="คำอธิบายสินค้า"
                                />
                            </div>
                        </div>

                        {attributes.length > 0 && !loading && (
                            <div className="border-t border-gray-600 pt-6">
                                <h3 className="mb-4 text-lg font-semibold text-purple-400">
                                    <Settings className="mr-2 inline h-5 w-5" />
                                    คุณสมบัติเฉพาะ
                                </h3>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || imageUploading}
                                className="flex items-center rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-white"></div>
                                        กำลังบันทึก...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        บันทึก
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
}> = ({ equipment, onClose, onEdit, onImageClick }) => {
    console.log('Equipment in detail modal:', equipment);

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
            return value ? 'ใช่' : 'ไม่ใช่';
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
            // สปริงเกอร์
            flow_rate: 'อัตราการไหล',
            pressure: 'ความดัน',
            radius: 'รัศมีการพ่น',
            waterVolumeLitersPerHour: 'อัตราการไหล',
            pressureBar: 'ความดัน',
            radiusMeters: 'รัศมีการพ่น',

            // ปั๊มน้ำ
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

            // ท่อ
            size_mm: 'ขนาด',
            size_inch: 'ขนาด',
            sizeMM: 'ขนาด',
            sizeInch: 'ขนาด',
            lengthM: 'ความยาว',
            dimensions_cm: 'ขนาด',
            material: 'วัสดุ',

            // ไฟฟ้า
            voltage: 'แรงดันไฟฟ้า',
            current: 'กระแสไฟฟ้า',
            frequency: 'ความถี่',

            // ทั่วไป
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
            .replace(/Power/gi, 'กำลัง')
            .replace(/Flow Rate/gi, 'อัตราการไหล')
            .replace(/Pressure/gi, 'ความดัน')
            .replace(/Radius/gi, 'รัศมี')
            .replace(/Size/gi, 'ขนาด')
            .replace(/Weight/gi, 'น้ำหนัก')
            .replace(/Height/gi, 'ความสูง')
            .replace(/Width/gi, 'ความกว้าง')
            .replace(/Length/gi, 'ความยาว')
            .replace(/Water Volume/gi, 'อัตราการไหล')
            .replace(/Liters Per Hour/gi, '')
            .replace(/Meters/gi, 'เมตร')
            .replace(/Bar/gi, 'บาร์')
            .replace(/HP/gi, 'แรงม้า');

        return translatedReadable || attributeName;
    };

    const getUnitForAttribute = (attributeName: string) => {
        const unitMap = {
            powerHP: 'HP',
            powerKW: 'kW',
            phase: 'เฟส',
            inlet_size_inch: 'นิ้ว',
            outlet_size_inch: 'นิ้ว',
            flow_rate_lpm: 'LPM',
            head_m: 'เมตร',
            max_head_m: 'เมตร',
            max_flow_rate_lpm: 'LPM',
            suction_depth_m: 'เมตร',
            weight_kg: 'กก.',
            waterVolumeLitersPerHour: 'L/H',
            radiusMeters: 'เมตร',
            pressureBar: 'บาร์',
            size_mm: 'มม.',
            size_inch: 'นิ้ว',
            sizeMM: 'มม.',
            sizeInch: 'นิ้ว',
            lengthM: 'เมตร',
            dimensions_cm: 'ซม.',
        };
        return unitMap[attributeName as keyof typeof unitMap] || '';
    };

    const attributes = getAllAttributes();
    const pumpAccessories = equipment.pumpAccessories || equipment.pumpAccessory || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black bg-opacity-50 p-4">
            <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-lg bg-gray-800 text-white shadow-2xl">
                <div className="p-6">
                    <div className="mb-6 flex items-start justify-between">
                        <h2 className="text-2xl font-bold">รายละเอียดสินค้า</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={onEdit}
                                className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                            >
                                <Edit2 className="mr-2 h-4 w-4" />
                                แก้ไข
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
                                    src={equipment.image}
                                    alt={equipment.name}
                                    className="h-64 w-full cursor-pointer rounded-lg border border-gray-600 object-cover transition-opacity hover:border-blue-400 hover:opacity-80"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.nextElementSibling?.classList.remove('hidden');
                                    }}
                                    onClick={() =>
                                        onImageClick &&
                                        onImageClick(equipment.image!, equipment.name)
                                    }
                                    title="คลิกเพื่อดูรูปขนาดใหญ่"
                                />
                            ) : null}

                            <div
                                className={`flex h-64 w-full items-center justify-center rounded-lg border border-gray-600 bg-gray-700 ${equipment.image ? 'hidden' : ''}`}
                            >
                                <Package className="h-16 w-16 text-gray-500" />
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
                                            <CheckCircle className="mr-1 h-4 w-4" /> เปิดใช้งาน
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="mr-1 h-4 w-4" /> ปิดใช้งาน
                                        </>
                                    )}
                                </span>
                            </div>

                            <div className="mt-4 space-y-2 rounded-lg bg-gray-700 p-4">
                                <h4 className="font-semibold text-blue-400">ข้อมูลสรุป</h4>
                                <div className="text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">หมวดหมู่:</span>
                                        <span>{equipment.category?.display_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">คุณสมบัติ:</span>
                                        <span>
                                            {attributes.length -
                                                attributes.filter(
                                                    (attr) => attr.formatted_value == 0
                                                ).length}{' '}
                                            รายการ
                                        </span>
                                    </div>
                                    {pumpAccessories.length > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">อุปกรณ์เสริม:</span>
                                            <span>{pumpAccessories.length} รายการ</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {pumpAccessories.length > 0 && (
                                <div>
                                    <h3 className="mb-3 mt-6 flex items-center overflow-hidden text-lg font-semibold text-orange-400">
                                        <Wrench className="mr-2 h-5 w-5" />
                                        อุปกรณ์ประกอบ ({pumpAccessories.length} รายการ)
                                    </h3>
                                    <div className="space-y-3">
                                        {pumpAccessories
                                            .sort(
                                                (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
                                            )
                                            .map((accessory, index) => (
                                                <div
                                                    key={accessory.id || index}
                                                    className="rounded-lg bg-gray-700 p-4"
                                                >
                                                    <div className="mb-2 flex items-start justify-between">
                                                        <div className="flex gap-4">
                                                            <div className="flex-shrink-0">
                                                                {accessory.image ? (
                                                                    <img
                                                                        src={accessory.image}
                                                                        alt={accessory.name}
                                                                        className="h-16 w-16 cursor-pointer rounded-lg border border-gray-600 object-cover transition-opacity hover:border-blue-400 hover:opacity-80"
                                                                        onError={(e) => {
                                                                            const target =
                                                                                e.target as HTMLImageElement;
                                                                            target.style.display =
                                                                                'none';
                                                                            target.nextElementSibling?.classList.remove(
                                                                                'hidden'
                                                                            );
                                                                        }}
                                                                        onClick={() =>
                                                                            onImageClick &&
                                                                            onImageClick(
                                                                                accessory.image!,
                                                                                accessory.name
                                                                            )
                                                                        }
                                                                        title="คลิกเพื่อดูรูปขนาดใหญ่"
                                                                    />
                                                                ) : null}
                                                                {/* Fallback for no image */}
                                                                <div
                                                                    className={`flex h-16 w-16 items-center justify-center rounded-lg border border-gray-600 bg-gray-600 ${accessory.image ? 'hidden' : ''}`}
                                                                >
                                                                    <Wrench className="h-6 w-6 text-gray-400" />
                                                                </div>
                                                            </div>

                                                            {/* ข้อมูลอุปกรณ์ */}
                                                            <div className="flex-1">
                                                                <h4 className="font-medium">
                                                                    {accessory.name}
                                                                </h4>
                                                                <p className="text-sm capitalize text-gray-400">
                                                                    {accessory.accessory_type?.replace(
                                                                        '_',
                                                                        ' '
                                                                    )}
                                                                    {accessory.size &&
                                                                        ` - ${accessory.size}`}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* ราคาและสถานะ */}
                                                        <div className="text-right">
                                                            <p className="font-medium text-green-400">
                                                                ฿
                                                                {Number(
                                                                    accessory.price || 0
                                                                ).toLocaleString()}
                                                            </p>
                                                            <span
                                                                className={`rounded px-2 py-1 text-xs ${
                                                                    accessory.is_included
                                                                        ? 'bg-green-900 text-green-300'
                                                                        : 'bg-yellow-900 text-yellow-300'
                                                                }`}
                                                            >
                                                                {accessory.is_included
                                                                    ? 'รวมในชุด'
                                                                    : 'แยกขาย'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* ข้อมูลจำเพาะ */}
                                                    {accessory.specifications &&
                                                        typeof accessory.specifications ===
                                                            'object' && (
                                                            <div className="mt-3">
                                                                <label className="text-xs text-gray-400">
                                                                    ข้อมูลจำเพาะ:
                                                                </label>
                                                                <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                                                                    {Object.entries(
                                                                        accessory.specifications
                                                                    ).map(([key, value]) => (
                                                                        <div
                                                                            key={key}
                                                                            className="flex justify-between"
                                                                        >
                                                                            <span className="text-gray-400">
                                                                                {key}:
                                                                            </span>
                                                                            <span>
                                                                                {String(value)}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="space-y-6 lg:col-span-2">
                            {/* Basic Information */}
                            <div>
                                <h3 className="mb-3 text-lg font-semibold text-blue-400">
                                    ข้อมูลพื้นฐาน
                                </h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-sm text-gray-400">รหัสสินค้า</label>
                                        <p className="font-medium">
                                            {equipment.product_code || equipment.productCode}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400">ชื่อสินค้า</label>
                                        <p className="font-medium">{equipment.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400">แบรนด์</label>
                                        <p className="font-medium">{equipment.brand || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400">ราคา</label>
                                        <p className="font-medium text-green-400">
                                            ฿{equipment.price.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400">วันที่เพิ่ม</label>
                                        <p className="font-medium">
                                            {equipment.created_at
                                                ? new Date(equipment.created_at).toLocaleDateString(
                                                      'th-TH'
                                                  )
                                                : '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400">แก้ไขล่าสุด</label>
                                        <p className="font-medium">
                                            {equipment.updated_at
                                                ? new Date(equipment.updated_at).toLocaleDateString(
                                                      'th-TH'
                                                  )
                                                : '-'}
                                        </p>
                                    </div>
                                </div>

                                {equipment.description && (
                                    <div className="mt-4">
                                        <label className="text-sm text-gray-400">คำอธิบาย</label>
                                        <p className="mt-1">{equipment.description}</p>
                                    </div>
                                )}
                            </div>

                            {/* Attributes */}
                            {attributes.length > 0 && (
                                <div>
                                    <h3 className="mb-3 text-lg font-semibold text-purple-400">
                                        คุณสมบัติเฉพาะ (
                                        {attributes.length -
                                            attributes.filter((attr) => attr.formatted_value == 0)
                                                .length}{' '}
                                        รายการ)
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {attributes.map((attr, index) => (
                                            <div key={attr.attribute_name || index}>
                                                {attr.formatted_value != 0 ? (
                                                    <div className="rounded-lg bg-gray-700 p-4">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <label className="text-sm font-medium text-gray-300">
                                                                    {attr.display_name}
                                                                    {attr.unit && (
                                                                        <span className="ml-1 text-gray-500">
                                                                            ({attr.unit})
                                                                        </span>
                                                                    )}
                                                                </label>
                                                                <p className="mt-1 font-medium text-white">
                                                                    {attr.formatted_value ||
                                                                        formatAttributeValue(
                                                                            attr.value
                                                                        )}
                                                                </p>
                                                            </div>

                                                            {/* Type indicator */}
                                                            <span
                                                                className={`ml-2 rounded px-2 py-1 text-xs ${
                                                                    attr.data_type === 'array'
                                                                        ? 'bg-blue-900 text-blue-300'
                                                                        : attr.data_type ===
                                                                            'number'
                                                                          ? 'bg-green-900 text-green-300'
                                                                          : attr.data_type ===
                                                                              'boolean'
                                                                            ? 'bg-yellow-900 text-yellow-300'
                                                                            : 'bg-gray-600 text-gray-300'
                                                                }`}
                                                            >
                                                                {attr.data_type}
                                                            </span>
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
    return (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-blue-100">สินค้าทั้งหมด</p>
                        <p className="text-2xl font-bold">{stats.total_equipments || 0}</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-200" />
                </div>
            </div>

            <div className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-green-100">เปิดใช้งาน</p>
                        <p className="text-2xl font-bold">{stats.active_equipments || 0}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-200" />
                </div>
            </div>

            <div className="rounded-lg bg-gradient-to-r from-red-600 to-red-700 p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-red-100">ปิดใช้งาน</p>
                        <p className="text-2xl font-bold">{stats.inactive_equipments || 0}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-200" />
                </div>
            </div>

            <div className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-purple-100">มูลค่ารวม</p>
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
                    title="ปิด"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* รูปภาพ */}
                <img
                    src={imageSrc}
                    alt={imageAlt}
                    className="max-h-full max-w-full rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                />

                {/* ชื่อรูป */}
                <div className="mt-2 text-center">
                    <p className="inline-block rounded bg-black bg-opacity-50 px-2 py-1 text-sm text-white">
                        {imageAlt}
                    </p>
                </div>
            </div>
        </div>
    );
};

const EnhancedEquipmentCRUD: React.FC = () => {
    const [categories, setCategories] = useState<EquipmentCategory[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10); // 10 รายการต่อหน้า

    const [filters, setFilters] = useState<FilterOptions>({
        search: '',
        categoryId: null,
        priceRange: [0, 100000],
        status: 'all',
        sortBy: 'name',
        sortOrder: 'asc',
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

    const [imageModal, setImageModal] = useState({
        isOpen: false,
        imageSrc: '',
        imageAlt: '',
    });

    useEffect(() => {
        if (typeof window !== 'undefined' && !window.Swal) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
            script.async = true;
            script.onload = () => {
                console.log('SweetAlert2 loaded successfully');
            };
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
                console.log('🚀 Starting to load all data...');

                const [categoriesData, equipmentsData, statsData] = await Promise.all([
                    api.getCategories(),
                    getAllEquipments(),
                    api.getStats(),
                ]);

                console.log('📊 Data loading results:', {
                    categories: {
                        count: categoriesData.length,
                        sample: categoriesData[0],
                    },
                    equipments: {
                        count: equipmentsData.length,
                        sample: equipmentsData[0],
                    },
                    stats: statsData,
                });

                setCategories(categoriesData);
                setEquipments(equipmentsData);
                setStats(statsData);

                console.log('✅ Data loaded successfully');
            } catch (error) {
                console.error('💥 Failed to load data:', error);
                showAlert.error('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

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
                filters.search === '' ||
                searchFields.some(
                    (field) => field?.includes(filters.search.toLowerCase()) ?? false
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
    }, [equipments, filters, selectedCategoryId]);

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
            console.log('Saving equipment:', equipmentData);

            if (editingEquipment) {
                await api.updateEquipment(editingEquipment.id, equipmentData);
                console.log('Equipment updated');
            } else {
                await api.createEquipment(equipmentData);
                console.log('Equipment created');
            }

            const [equipmentsData, statsData] = await Promise.all([
                api.getAllEquipments(),
                api.getStats(),
            ]);
            setEquipments(equipmentsData);
            setStats(statsData);

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
                    'แก้ไขหมวดหมู่สำเร็จ',
                    `${categoryData.display_name} ได้รับการแก้ไขเรียบร้อยแล้ว`
                );
            } else {
                await api.createCategory(categoryData);
                showAlert.success(
                    'เพิ่มหมวดหมู่สำเร็จ',
                    `${categoryData.display_name} ได้รับการเพิ่มเรียบร้อยแล้ว`
                );
            }

            const categoriesData = await api.getCategories();
            setCategories(categoriesData);

            setShowCategoryForm(false);
            setEditingCategory(undefined);
        } catch (error) {
            console.error('Failed to save category:', error);
            showAlert.error('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกหมวดหมู่ได้');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteEquipment = async (equipment: Equipment) => {
        const result = await showAlert.confirm(
            'ยืนยันการลบ',
            `คุณต้องการลบ "${equipment.name}" หรือไม่?`
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
                showAlert.success('ลบสำเร็จ', `${equipment.name} ได้รับการลบเรียบร้อยแล้ว`);
            } catch (error) {
                console.error('Failed to delete equipment:', error);
                showAlert.error('เกิดข้อผิดพลาด', 'ไม่สามารถลบสินค้าได้');
            }
        }
    };

    const handleDeleteCategory = async (category: EquipmentCategory) => {
        const result = await showAlert.confirm(
            'ยืนยันการลบ',
            `คุณต้องการลบหมวดหมู่ "${category.display_name}" หรือไม่?`
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
                    'ลบสำเร็จ',
                    `หมวดหมู่ ${category.display_name} ได้รับการลบเรียบร้อยแล้ว`
                );
            } catch (error) {
                console.error('Failed to delete category:', error);
                showAlert.error('เกิดข้อผิดพลาด', 'ไม่สามารถลบหมวดหมู่ได้');
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) return;

        const result = await showAlert.confirm(
            'ยืนยันการลบ',
            `คุณต้องการลบสินค้า ${selectedItems.length} รายการหรือไม่?`
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
                    'ลบสำเร็จ',
                    `ลบสินค้า ${selectedItems.length} รายการเรียบร้อยแล้ว`
                );
            } catch (error) {
                console.error('Failed to bulk delete:', error);
                showAlert.error('เกิดข้อผิดพลาด', 'ไม่สามารถลบสินค้าได้');
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
                'อัปเดตสำเร็จ',
                `อัปเดตสถานะสินค้า ${selectedItems.length} รายการเป็น${isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}เรียบร้อยแล้ว`
            );
        } catch (error) {
            console.error('Failed to bulk update:', error);
            showAlert.error('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตสถานะสินค้าได้');
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

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-800">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
                    <div className="mt-4 text-lg text-gray-50">กำลังโหลด...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-800">
            <div className="container mx-auto px-4 py-8">
                <div className="rounded-lg bg-gray-700 shadow-xl">
                    <div className="border-b border-gray-600 p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <img
                                    src="https://f.btwcdn.com/store-50036/store/e4c1b5ae-cf8e-5017-536b-66ecd994018d.jpg"
                                    alt="logo"
                                    className="h-[80px] w-[80px] cursor-pointer rounded-xl shadow-lg transition-opacity hover:opacity-80"
                                    onClick={() =>
                                        openImageModal(
                                            'https://f.btwcdn.com/store-50036/store/e4c1b5ae-cf8e-5017-536b-66ecd994018d.jpg',
                                            'Logo บริษัท'
                                        )
                                    }
                                    title="คลิกเพื่อดูรูปขนาดใหญ่"
                                />
                                <h1 className="flex items-center text-3xl font-bold text-gray-50">
                                    ระบบจัดการคลังสินค้า
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
                                    เพิ่มหมวดหมู่
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingEquipment(undefined);
                                        setShowEquipmentForm(true);
                                    }}
                                    disabled={saving}
                                    className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white shadow-lg transition-colors hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Plus className="mr-2 h-5 w-5" />
                                    เพิ่มสินค้า
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
                                        placeholder="ค้นหาด้วยชื่อ, รหัส, หรือแบรนด์..."
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
                                        <option value="">ทุกหมวดหมู่</option>
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
                                    <option value="all">ทุกสถานะ</option>
                                    <option value="active">เปิดใช้งาน</option>
                                    <option value="inactive">ปิดใช้งาน</option>
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
                                    <option value="name-asc">ชื่อ ก-ฮ</option>
                                    <option value="name-desc">ชื่อ ฮ-ก</option>
                                    <option value="price-asc">ราคา น้อย-มาก</option>
                                    <option value="price-desc">ราคา มาก-น้อย</option>
                                    <option value="created_at-desc">ใหม่สุด</option>
                                    <option value="created_at-asc">เก่าสุด</option>
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
                                        เลือก {selectedItems.length} รายการ
                                    </span>
                                    <button
                                        onClick={() => handleBulkToggleStatus(true)}
                                        className="rounded bg-green-600 px-3 py-1 text-white shadow-sm transition-colors hover:bg-green-700"
                                    >
                                        เปิดใช้งาน
                                    </button>
                                    <button
                                        onClick={() => handleBulkToggleStatus(false)}
                                        className="rounded bg-yellow-600 px-3 py-1 text-white shadow-sm transition-colors hover:bg-yellow-700"
                                    >
                                        ปิดใช้งาน
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="rounded bg-red-600 px-3 py-1 text-white shadow-sm transition-colors hover:bg-red-700"
                                    >
                                        ลบทั้งหมด
                                    </button>
                                    <button
                                        onClick={() => setSelectedItems([])}
                                        className="rounded bg-gray-600 px-3 py-1 text-white shadow-sm transition-colors hover:bg-gray-700"
                                    >
                                        ยกเลิก
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between text-sm text-gray-300">
                                <div>
                                    แสดง {paginatedEquipments.length} จาก{' '}
                                    {filteredAndSortedEquipments.length} รายการทั้งหมด{' '}
                                    {equipments.length} รายการ
                                    {selectedCategoryId && (
                                        <span className="ml-2 text-blue-300">
                                            (หมวดหมู่:{' '}
                                            {
                                                categories.find((c) => c.id === selectedCategoryId)
                                                    ?.display_name
                                            }
                                            )
                                        </span>
                                    )}
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
                                        <span>เลือกทั้งหมด</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border-b border-gray-600 p-6">
                        <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-50">
                            <Tag className="mr-2 h-5 w-5" />
                            หมวดหมู่สินค้า
                        </h3>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                            <div
                                className={`cursor-pointer rounded-lg border-2 p-4 shadow-lg transition-all hover:scale-105 ${
                                    selectedCategoryId === null
                                        ? 'border-purple-500 bg-purple-900 shadow-purple-500/20'
                                        : 'border-gray-500 bg-gray-600 hover:border-gray-400 hover:bg-gray-500'
                                }`}
                                onClick={() => setSelectedCategoryId(null)}
                            >
                                <div className="text-center">
                                    <div className="mb-2 flex justify-center text-2xl">
                                        <Package className="h-8 w-8 text-purple-400" />
                                    </div>
                                    <div className="mb-1 text-sm font-medium text-white">
                                        ทุกหมวดหมู่
                                    </div>
                                    <div className="mb-2 text-xs text-gray-300">
                                        {equipments.length} รายการ
                                    </div>
                                    <div className="flex justify-center gap-1">
                                        <div className="h-6 w-6"></div>
                                    </div>
                                </div>
                            </div>

                            {categories.map((category) => {
                                const categoryEquipments = equipments.filter(
                                    (e) => Number(e.category_id) === Number(category.id)
                                );
                                const isSelected = selectedCategoryId === category.id;

                                return (
                                    <div
                                        key={category.id}
                                        className={`cursor-pointer rounded-lg border-2 p-4 shadow-lg transition-all hover:scale-105 ${
                                            isSelected
                                                ? 'border-blue-500 bg-blue-900 shadow-blue-500/20'
                                                : 'border-gray-500 bg-gray-600 hover:border-gray-400 hover:bg-gray-500'
                                        }`}
                                        onClick={() => {
                                            const next = isSelected ? null : category.id;
                                            setSelectedCategoryId(next);
                                        }}
                                    >
                                        <div className="text-center">
                                            <div className="mb-2 text-2xl">
                                                {category.icon || '📦'}
                                            </div>
                                            <div className="mb-1 text-sm font-medium text-white">
                                                {category.display_name}
                                            </div>
                                            <div className="mb-2 text-xs text-gray-300">
                                                {categoryEquipments.length} รายการ
                                            </div>
                                            <div className="flex justify-center gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingCategory(category);
                                                        setShowCategoryForm(true);
                                                    }}
                                                    className="rounded p-1 text-blue-400 transition-colors hover:bg-blue-800 hover:text-blue-300"
                                                    title="แก้ไข"
                                                >
                                                    <Edit2 className="h-3 w-3" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteCategory(category);
                                                    }}
                                                    className="rounded p-1 text-red-400 transition-colors hover:bg-red-800 hover:text-red-300"
                                                    title="ลบ"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-6">
                        {filteredAndSortedEquipments.length === 0 ? (
                            <div className="py-12 text-center">
                                <Package className="mx-auto mb-4 h-16 w-16 text-gray-500" />
                                <div className="text-lg text-gray-400">ไม่พบข้อมูลสินค้า</div>
                                {equipments.length === 0 ? (
                                    <div className="mt-2 text-sm text-gray-500">
                                        ยังไม่มีสินค้าในระบบ คลิกปุ่ม "เพิ่มสินค้า" เพื่อเริ่มต้น
                                    </div>
                                ) : (
                                    <div className="mt-2 text-sm text-gray-500">
                                        ลองเปลี่ยนเงื่อนไขการค้นหาหรือกรองข้อมูล
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
                                                onClick={() => {
                                                    setSelectedEquipment(equipment);
                                                    setShowEquipmentDetail(true);
                                                }}
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
                                                            }}
                                                            className="rounded p-1 text-blue-400 transition-colors hover:bg-blue-900"
                                                            title="แก้ไข"
                                                        >
                                                            <Edit2 className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteEquipment(equipment);
                                                            }}
                                                            className="rounded p-1 text-red-400 transition-colors hover:bg-red-900"
                                                            title="ลบ"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {equipment.image ? (
                                                    <img
                                                        src={equipment.image}
                                                        alt={equipment.name}
                                                        className="mb-3 h-24 w-full cursor-pointer rounded object-cover shadow-lg transition-transform hover:opacity-80 group-hover:scale-105"
                                                        onError={(e) => {
                                                            (
                                                                e.target as HTMLImageElement
                                                            ).style.display = 'none';
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openImageModal(
                                                                equipment.image!,
                                                                equipment.name
                                                            );
                                                        }}
                                                        title="คลิกเพื่อดูรูปขนาดใหญ่"
                                                    />
                                                ) : (
                                                    <div className="mb-3 flex h-24 w-full items-center justify-center rounded bg-gray-700 shadow-inner">
                                                        <Package className="h-8 w-8 text-gray-500" />
                                                    </div>
                                                )}

                                                <div className="space-y-1 text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">ราคา:</span>
                                                        <span className="font-semibold text-green-400">
                                                            ฿{equipment.price.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">
                                                            สถานะ:
                                                        </span>
                                                        <span
                                                            className={`font-semibold ${equipment.is_active ? 'text-green-400' : 'text-red-400'}`}
                                                        >
                                                            {equipment.is_active
                                                                ? 'ใช้งาน'
                                                                : 'ปิดใช้งาน'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">
                                                            หมวดหมู่:
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
                                                                คุณสมบัติ:
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
                                                                                ? 'ใช่'
                                                                                : 'ไม่ใช่';
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
                                                            อุปกรณ์ประกอบ{' '}
                                                            {
                                                                (equipment.pumpAccessories ||
                                                                    equipment.pumpAccessory)!.length
                                                            }{' '}
                                                            รายการ
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
                                    <table className="w-full text-left text-sm text-gray-300">
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
                                                <th className="px-6 py-3">รูปภาพ</th>
                                                <th className="px-6 py-3">รหัสสินค้า</th>
                                                <th className="px-6 py-3">ชื่อสินค้า</th>
                                                <th className="px-6 py-3">แบรนด์</th>
                                                <th className="px-6 py-3">หมวดหมู่</th>
                                                <th className="px-6 py-3">ราคา</th>
                                                <th className="px-6 py-3">สถานะ</th>
                                                <th className="px-6 py-3">คุณสมบัติ</th>
                                                <th className="px-6 py-3">จัดการ</th>
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
                                                    onClick={() => {
                                                        setSelectedEquipment(equipment);
                                                        setShowEquipmentDetail(true);
                                                    }}
                                                >
                                                    <td
                                                        className="px-6 py-4"
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
                                                    <td className="px-6 py-4">
                                                        {equipment.image ? (
                                                            <img
                                                                src={equipment.image}
                                                                alt={equipment.name}
                                                                className="h-12 w-12 cursor-pointer rounded border border-gray-600 object-cover shadow-sm transition-opacity hover:border-blue-400 hover:opacity-80"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openImageModal(
                                                                        equipment.image!,
                                                                        equipment.name
                                                                    );
                                                                }}
                                                                title="คลิกเพื่อดูรูปขนาดใหญ่"
                                                            />
                                                        ) : (
                                                            <div className="flex h-12 w-12 items-center justify-center rounded border border-gray-500 bg-gray-600 shadow-sm">
                                                                <Package className="h-6 w-6 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-white">
                                                        {equipment.product_code ||
                                                            equipment.productCode}
                                                    </td>
                                                    <td className="max-w-xs truncate px-6 py-4">
                                                        {equipment.name}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {equipment.brand || '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="rounded bg-gray-600 px-2 py-1 text-xs shadow-sm">
                                                            {
                                                                categories.find(
                                                                    (c) =>
                                                                        c.id ===
                                                                        equipment.category_id
                                                                )?.display_name
                                                            }
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-green-400">
                                                        ฿{equipment.price.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4">
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
                                                                    ใช้งาน
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <XCircle className="mr-1 h-3 w-3" />{' '}
                                                                    ปิดใช้งาน
                                                                </>
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
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
                                                                        คุณสมบัติ
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
                                                                        อุปกรณ์
                                                                    </span>
                                                                )}
                                                        </div>
                                                    </td>
                                                    <td
                                                        className="px-6 py-4"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedEquipment(equipment);
                                                                    setShowEquipmentDetail(true);
                                                                }}
                                                                className="rounded p-2 text-blue-400 shadow-sm transition-colors hover:bg-blue-900"
                                                                title="ดูรายละเอียด"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingEquipment(equipment);
                                                                    setShowEquipmentForm(true);
                                                                }}
                                                                className="rounded p-2 text-green-400 shadow-sm transition-colors hover:bg-green-900"
                                                                title="แก้ไข"
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleDeleteEquipment(equipment)
                                                                }
                                                                className="rounded p-2 text-red-400 shadow-sm transition-colors hover:bg-red-900"
                                                                title="ลบ"
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
                    }}
                    onImageClick={openImageModal}
                />
            )}

            {showEquipmentDetail && selectedEquipment && (
                <EquipmentDetailModal
                    equipment={selectedEquipment}
                    onClose={() => {
                        setShowEquipmentDetail(false);
                        setSelectedEquipment(undefined);
                    }}
                    onEdit={() => {
                        setEditingEquipment(selectedEquipment);
                        setShowEquipmentForm(true);
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
        </div>
    );
};

export default EnhancedEquipmentCRUD;
