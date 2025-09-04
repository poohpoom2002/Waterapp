/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Option {
    value: string | number;
    label: string;
    disabled?: boolean;
    searchableText?: string; // Additional text to search in
    // New properties for enhanced display
    image?: string;
    productCode?: string;
    name?: string;
    brand?: string;
    price?: number;
    unit?: string; // For price unit like "บาท", "บาท/ม้วน", etc.
    // New properties for recommendation
    isRecommended?: boolean;
    isGoodChoice?: boolean;
    isUsable?: boolean;
    isAutoSelected?: boolean;
    // New properties for calculation results
    headLoss?: number; // ค่า head loss ที่คำนวณได้
    calculationDetails?: string; // รายละเอียดการคำนวณ
    hasWarning?: boolean; // มี warning หรือไม่
}

interface SearchableDropdownProps {
    options: Option[];
    value: string | number;
    onChange: (value: string | number) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    searchPlaceholder?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    options,
    value,
    onChange,
    placeholder = "เลือกตัวเลือก",
    className = "",
    disabled = false,
    searchPlaceholder = "พิมพ์เพื่อค้นหา..."
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const { t } = useLanguage();
    
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter options based on search term
    const filteredOptions = options.filter(option => {
        const searchText = searchTerm.toLowerCase();
        const labelMatch = option.label.toLowerCase().includes(searchText);
        const searchableTextMatch = option.searchableText 
            ? option.searchableText.toLowerCase().includes(searchText) 
            : false;
        return labelMatch || searchableTextMatch;
    });

    // Get selected option label
    const selectedOption = options.find(option => option.value === value);
    const displayValue = selectedOption ? selectedOption.label : '';

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                } else {
                    setHighlightedIndex(prev => 
                        prev < filteredOptions.length - 1 ? prev + 1 : 0
                    );
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (isOpen) {
                    setHighlightedIndex(prev => 
                        prev > 0 ? prev - 1 : filteredOptions.length - 1
                    );
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (isOpen && highlightedIndex >= 0) {
                    const selectedOption = filteredOptions[highlightedIndex];
                    if (selectedOption && !selectedOption.disabled) {
                        onChange(selectedOption.value);
                        setIsOpen(false);
                        setSearchTerm('');
                        setHighlightedIndex(-1);
                    }
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
                break;
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSearchTerm = e.target.value;
        setSearchTerm(newSearchTerm);
        setHighlightedIndex(-1);
        if (!isOpen) {
            setIsOpen(true);
        }
    };

    const handleOptionClick = (optionValue: string | number) => {
        if (disabled) return;
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
    };

    const handleInputFocus = () => {
        if (!disabled) {
            setIsOpen(true);
        }
    };

    // Get recommendation symbol and text
    const getRecommendationInfo = (option: Option) => {
        if (option.isRecommended) return { symbol: '⭐', text: t('แนะนำ'), color: 'text-yellow-300' };
        if (option.isGoodChoice) return { symbol: '✅', text: t('ดี'), color: 'text-green-300' };
        if (option.isUsable) return { symbol: '⚡', text: t('ใช้ได้'), color: 'text-orange-300' };
        return { symbol: '⚠️', text: t('ไม่เหมาะสม'), color: 'text-red-300' };
    };

    // Render option with enhanced display
    const renderOption = (option: Option, index: number) => {
        const isHighlighted = index === highlightedIndex;
        const isSelected = option.value === value;
        
        // Check if this option has enhanced data
        const hasEnhancedData = option.image || option.productCode || option.name || option.brand || option.price;

        if (hasEnhancedData) {
            const recommendation = getRecommendationInfo(option);
            
            return (
                <div
                    key={option.value}
                    onClick={() => handleOptionClick(option.value)}
                    className={`cursor-pointer px-3 py-3 text-sm transition-colors ${
                        isHighlighted
                            ? 'bg-blue-600 text-white'
                            : isSelected
                            ? 'bg-gray-700 text-blue-300'
                            : option.disabled
                            ? 'cursor-not-allowed text-gray-500'
                            : 'text-white hover:bg-gray-700'
                    }`}
                >
                    <div className="flex items-center space-x-3">
                        {/* Image */}
                        <div className="flex-shrink-0">
                            {option.image ? (
                                <img
                                    src={option.image}
                                    alt={option.name || option.productCode || 'Product'}
                                    className="h-12 w-12 rounded border border-gray-500 object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded border border-gray-500 bg-gray-500 text-xs text-gray-300">
                                    {t('ไม่มีรูป')}
                                </div>
                            )}
                        </div>

                        {/* Product Information */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                                {/* Auto-selection indicator */}
                                {option.isAutoSelected && (
                                    <span className="text-sm">🤖</span>
                                )}
                                
                                {/* Recommendation symbol */}

                                
                                {option.productCode && (
                                    <span className="font-medium text-blue-300">
                                        {option.productCode}
                                    </span>
                                )}
                                {option.name && (
                                    <span className="font-medium text-white">
                                        {option.name}
                                    </span>
                                )}
                            </div>
                            
                            {/* Head Loss calculation display */}
                            {option.headLoss !== undefined && (
                                <div className="mt-1 bg-gray-800 rounded px-2 py-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-blue-300">📊 Head Loss:</span>
                                        <span className={`font-bold ${
                                            option.hasWarning ? 'text-red-400' : 'text-green-400'
                                        }`}>
                                            {option.headLoss.toFixed(3)} ม.
                                            {option.hasWarning && ' ⚠️'}
                                        </span>
                                    </div>
                                    {option.calculationDetails && (
                                        <div className="text-xs text-gray-400 mt-1">
                                            {option.calculationDetails}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-1">
                                <div className="flex items-center space-x-2 text-xs text-gray-300">
                                    {option.brand && (
                                        <span className="text-yellow-300">
                                            {option.brand}
                                        </span>
                                    )}
                                    
                                    {/* Recommendation text */}
                                    <span className={`${recommendation.color}`}>
                                        {recommendation.text}
                                    </span>
                                </div>
                                
                                {option.price && (
                                    <div className="text-right">
                                        <span className="font-bold text-green-300">
                                            {option.price.toLocaleString()}
                                        </span>
                                        <span className="text-xs text-gray-400 ml-1">
                                            {option.unit || t('บาท')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Fallback to simple text display
        return (
            <div
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                    isHighlighted
                        ? 'bg-blue-600 text-white'
                        : isSelected
                        ? 'bg-gray-700 text-blue-300'
                        : option.disabled
                        ? 'cursor-not-allowed text-gray-500'
                        : 'text-white hover:bg-gray-700'
                }`}
            >
                {option.label}
            </div>
        );
    };

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={isOpen ? searchTerm : displayValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={isOpen ? searchPlaceholder : placeholder}
                    disabled={disabled}
                    className={`w-full rounded border border-gray-500 bg-gray-600 p-2 pr-10 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none ${
                        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-text'
                    }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg
                        className={`h-5 w-5 text-gray-400 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                        }`}
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
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-500 bg-gray-600 shadow-lg">
                    <div className="max-h-80 overflow-auto py-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400">
                                {t('ไม่พบผลลัพธ์')}
                            </div>
                        ) : (
                            filteredOptions.map((option, index) => renderOption(option, index))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableDropdown; 