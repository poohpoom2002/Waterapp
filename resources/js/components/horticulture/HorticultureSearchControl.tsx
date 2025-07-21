// components/horticulture/HorticultureSearchControl.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FaSearch, FaSpinner } from 'react-icons/fa';

interface SearchResult {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
        location?: google.maps.LatLng;
    };
    types: string[];
    rating?: number;
    photos?: any[];
}

interface HorticultureSearchControlProps {
    onPlaceSelect: (lat: number, lng: number) => void;
    placeholder?: string;
}

const HorticultureSearchControl: React.FC<HorticultureSearchControlProps> = ({
    onPlaceSelect,
    placeholder = '🔍 Search...',
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);

    // Check if Google Maps is ready
    useEffect(() => {
        const checkGoogleMapsReady = () => {
            if (window.google?.maps?.places?.PlacesService) {
                setIsGoogleMapsReady(true);
                return true;
            }
            return false;
        };

        if (!checkGoogleMapsReady()) {
            const pollInterval = setInterval(() => {
                if (checkGoogleMapsReady()) {
                    clearInterval(pollInterval);
                }
            }, 500);

            setTimeout(() => {
                clearInterval(pollInterval);
                if (!isGoogleMapsReady) {
                    setError('ไม่สามารถโหลด Google Maps API ได้');
                }
            }, 30000);

            return () => clearInterval(pollInterval);
        }
    }, [isGoogleMapsReady]);

    // Initialize Google Places Autocomplete
    useEffect(() => {
        if (!isGoogleMapsReady || !inputRef.current) return;

        try {
            console.log('🔄 Initializing Google Places Autocomplete...');

            autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
                fields: [
                    'place_id',
                    'name',
                    'formatted_address',
                    'geometry',
                    'types',
                    'rating',
                    'photos',
                ],
                types: ['establishment', 'geocode'],
                // componentRestrictions: { country: 'th' }, // Removed restriction for worldwide search
            });

            autocompleteRef.current.addListener('place_changed', () => {
                const place = autocompleteRef.current?.getPlace();
                console.log('📍 Place selected:', place);

                if (place && place.geometry && place.geometry.location) {
                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();
                    onPlaceSelect(lat, lng);
                    setShowSuggestions(false);
                    setError(null);
                } else {
                    setError('ไม่สามารถเลือกสถานที่นี้ได้');
                }
            });

            console.log('✅ Google Places Autocomplete initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing Google Places:', error);
            setError('ไม่สามารถเริ่มต้นระบบค้นหาได้');
        }

        return () => {
            try {
                if (autocompleteRef.current) {
                    google.maps.event.clearInstanceListeners(autocompleteRef.current);
                }
            } catch (error) {
                console.warn('Error cleaning up autocomplete:', error);
            }
        };
    }, [isGoogleMapsReady, onPlaceSelect]);

    // Alternative search using Nominatim (fallback)
    const handleSearchChange = useCallback(
        async (query: string) => {
            setSearchQuery(query);
            setError('');

            if (query.length < 3) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            // If Google Places is available, let it handle the search
            if (isGoogleMapsReady) {
                return;
            }

            // Fallback to Nominatim
            setIsLoading(true);
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?` +
                        `format=json&q=${encodeURIComponent(query)}&limit=8&` +
                        // `countrycodes=th&` + // Removed country restriction
                        `addressdetails=1&dedupe=1&` +
                        `accept-language=th,en&bounded=0`,
                    {
                        signal: controller.signal,
                        headers: {
                            'User-Agent': 'HorticulturePlanner/1.0',
                            Accept: 'application/json',
                        },
                    }
                );

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (Array.isArray(data)) {
                    setSuggestions(data);
                    setShowSuggestions(true);
                    if (data.length === 0) {
                        setError('ไม่พบสถานที่ที่ค้นหา');
                    }
                } else {
                    setSuggestions([]);
                    setError('ข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง');
                }
            } catch (error: any) {
                console.error('Search error:', error);
                setSuggestions([]);

                if (error.name === 'AbortError') {
                    setError('การค้นหาใช้เวลานานเกินไป กรุณาลองใหม่');
                } else {
                    setError('เกิดข้อผิดพลาดในการค้นหา');
                }
            } finally {
                setIsLoading(false);
            }
        },
        [isGoogleMapsReady]
    );

    const handleSuggestionClick = (item: any) => {
        setSearchQuery(item.display_name);
        setSuggestions([]);
        setShowSuggestions(false);
        setError('');
        onPlaceSelect(parseFloat(item.lat), parseFloat(item.lon));
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        setError('');
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.search-container')) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isGoogleMapsReady) {
        return (
            <div className="search-container absolute left-4 top-4 z-[1000] w-[420px] max-w-[calc(100vw-2rem)]">
                <div className="rounded-lg border border-white/20 bg-white/95 p-3 text-sm text-gray-700 shadow-xl backdrop-blur">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
                        <span>กำลังโหลด Google Maps...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="search-container absolute left-4 top-4 z-[1000] w-[420px] max-w-[calc(100vw-2rem)]">
            <div className="relative">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            handleSearchChange(e.target.value);
                        }}
                        onFocus={() => {
                            if (suggestions.length > 0) {
                                setShowSuggestions(true);
                            }
                        }}
                        placeholder={placeholder}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pl-10 pr-24 text-sm text-gray-900 placeholder-gray-500 shadow-xl backdrop-blur transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />

                    {isLoading && (
                        <div className="absolute right-16 top-1/2 -translate-y-1/2">
                            <FaSpinner className="h-4 w-4 animate-spin text-blue-500" />
                        </div>
                    )}

                    {searchQuery && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700"
                            title="ล้างการค้นหา"
                        >
                            ✕
                        </button>
                    )}

                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        🔍
                    </div>
                </div>

                {error && (
                    <div className="mt-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 shadow-xl">
                        <div className="flex items-center gap-2">
                            <span>⚠️</span>
                            <span>{error}</span>
                            <button
                                onClick={() => setError('')}
                                className="ml-auto text-red-500 hover:text-red-700"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* Fallback suggestions for Nominatim */}
                {showSuggestions && suggestions.length > 0 && !isGoogleMapsReady && (
                    <div className="absolute mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {suggestions.map((item) => (
                            <div
                                key={item.place_id}
                                onClick={() => handleSuggestionClick(item)}
                                className="cursor-pointer border-b border-gray-100 p-3 text-sm text-gray-800 last:border-b-0 hover:bg-gray-100"
                            >
                                <div className="font-medium text-gray-900">
                                    {item.display_name.split(',')[0]}
                                </div>
                                <div className="mt-1 text-xs text-gray-600">
                                    {item.display_name}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HorticultureSearchControl;
