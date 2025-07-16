// components/homegarden/EnhancedSearchBox.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    PlacesServiceWrapper,
    GOOGLE_MAPS_CONFIG,
    GOOGLE_MAPS_ERRORS,
} from '../../utils/googleMapsConfig';

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
    vicinity?: string;
    business_status?: string;
}

interface EnhancedSearchBoxProps {
    onPlaceSelect: (place: SearchResult) => void;
    onClear: () => void;
    placeholder?: string;
    initialValue?: string;
    disabled?: boolean;
}

const EnhancedSearchBox: React.FC<EnhancedSearchBoxProps> = ({
    onPlaceSelect,
    onClear,
    initialValue = '',
    disabled = false,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const placesServiceRef = useRef<PlacesServiceWrapper | null>(null);
    const debounceTimeoutRef = useRef<NodeJS.Timeout>();

    const [searchQuery, setSearchQuery] = useState(initialValue);
    const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);

    
    useEffect(() => {
        const checkGoogleMapsReady = () => {
            if (window.google?.maps?.places?.PlacesService) {
                setIsGoogleMapsReady(true);
                console.log('✅ Google Maps and Places API are ready');
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

    
    useEffect(() => {
        if (!isGoogleMapsReady || !inputRef.current) return;

        try {
            console.log('🔄 Initializing Google Places...');

            
            placesServiceRef.current = new PlacesServiceWrapper();

            
            autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
                fields: [
                    'place_id',
                    'name',
                    'formatted_address',
                    'geometry',
                    'types',
                    'rating',
                    'photos',
                    'vicinity',
                    'business_status',
                ],
                types: ['establishment', 'geocode'],
                strictBounds: false,
            });

            
            autocompleteRef.current.addListener('place_changed', () => {
                const place = autocompleteRef.current?.getPlace();
                console.log('📍 Place selected:', place);

                if (place && place.geometry && place.geometry.location) {
                    const result: SearchResult = {
                        place_id: place.place_id || '',
                        name: place.name || '',
                        formatted_address: place.formatted_address || '',
                        geometry: place.geometry,
                        types: place.types || [],
                        rating: place.rating,
                        photos: place.photos,
                        vicinity: place.vicinity,
                        business_status: place.business_status,
                    };

                    onPlaceSelect(result);
                    setShowSuggestions(false);
                    setError(null);
                    setSelectedIndex(-1);
                } else {
                    setError('ไม่สามารถเลือกสถานที่นี้ได้');
                }
            });

            console.log('✅ Google Places initialized successfully');
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

    
    const searchWithPlacesAPI = useCallback(async (query: string) => {
        
        if (!placesServiceRef.current || !query.trim() || query.length < 1) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log('🔍 Searching globally:', query);

            const searchResult = await placesServiceRef.current.textSearch(query, {
                maxResults: 6, 
            });

            if (searchResult.error) {
                setError(searchResult.error);
                setSuggestions([]);
                setShowSuggestions(false);
            } else if (searchResult.results.length > 0) {
                const processedResults: SearchResult[] = searchResult.results.map((place) => ({
                    place_id: place.place_id || '',
                    name: place.name || '',
                    formatted_address: place.formatted_address || '',
                    geometry: place.geometry!,
                    types: place.types || [],
                    rating: place.rating,
                    photos: place.photos,
                    vicinity: place.vicinity,
                    business_status: place.business_status,
                }));

                setSuggestions(processedResults);
                setShowSuggestions(true);
                setSelectedIndex(-1);
                console.log(`✅ Found ${processedResults.length} places`);
            } else {
                setSuggestions([]);
                setShowSuggestions(true);
            }
        } catch (error) {
            console.error('❌ Places search error:', error);
            setError('เกิดข้อผิดพลาดในการค้นหา');
            setSuggestions([]);
            setShowSuggestions(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    
    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setSearchQuery(value);

            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }

            
            if (value.length < 1) {
                setSuggestions([]);
                setShowSuggestions(false);
                setError(null);
                return;
            }

            
            debounceTimeoutRef.current = setTimeout(() => {
                searchWithPlacesAPI(value);
            }, 300);
        },
        [searchWithPlacesAPI]
    );

    
    const handleSuggestionClick = useCallback(
        (suggestion: SearchResult) => {
            setSearchQuery(suggestion.name || suggestion.formatted_address);
            onPlaceSelect(suggestion);
            setShowSuggestions(false);
            setSelectedIndex(-1);
            setError(null);
        },
        [onPlaceSelect]
    );


    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!showSuggestions || suggestions.length === 0) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                        handleSuggestionClick(suggestions[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    setShowSuggestions(false);
                    setSelectedIndex(-1);
                    break;
            }
        },
        [showSuggestions, suggestions, selectedIndex, handleSuggestionClick]
    );

    const handleClear = useCallback(() => {
        setSearchQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        setError(null);
        onClear();
        inputRef.current?.focus();

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
    }, [onClear]);

    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.search-container')) {
                setShowSuggestions(false);
                setSelectedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    
    const getPlaceIcon = (types: string[]) => {
        const iconMap: { [key: string]: string } = {
            country: '🌍',
            administrative_area_level_1: '🗾',
            locality: '🏙️',
            sublocality: '🏘️',
            political: '🏛️',
            establishment: '🏢',
            point_of_interest: '📍',
            hospital: '🏥',
            school: '🏫',
            restaurant: '🍽️',
            airport: '✈️',
            university: '🎓',
            bank: '🏦',
            park: '🌳',
            route: '🛣️',
        };

        for (const type of types) {
            if (iconMap[type]) return iconMap[type];
        }
        return '📍';
    };

    
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
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (suggestions.length > 0) {
                            setShowSuggestions(true);
                        }
                    }}
                    disabled={disabled || !isGoogleMapsReady}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-24 text-sm text-gray-900 placeholder-gray-500 shadow-xl backdrop-blur transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                />

                
                {isLoading && (
                    <div className="absolute right-16 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                    </div>
                )}

                
                {searchQuery && !disabled && (
                    <button
                        onClick={handleClear}
                        className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700"
                        title="ล้างการค้นหา"
                    >
                        ✕
                    </button>
                )}

                
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</div>
            </div>

                
            {error && (
                <div className="mt-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 shadow-xl">
                    <div className="flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto text-red-500 hover:text-red-700"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default EnhancedSearchBox;