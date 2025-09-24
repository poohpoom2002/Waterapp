import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    FaSearch,
    FaSpinner,
    FaTimes,
    FaMapMarkerAlt,
    FaStar,
    FaClock,
    FaPhone,
    FaGlobe,
    FaDirections,
    FaCrosshairs,
} from 'react-icons/fa';
import {
    universalSearch,
    detectCoordinatePattern,
    formatCoordinatesDisplay,
    createMapsUrlFromCoordinates,
    SearchResult as PlacesSearchResult,
    SearchError,
} from '../../utils/placesApiUtils';

interface SearchResult {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
        location?: google.maps.LatLng;
    };
    types: string[];
    rating?: number;
    user_ratings_total?: number;
    photos?: google.maps.places.PlacePhoto[];
    opening_hours?: {
        open_now?: boolean;
        weekday_text?: string[];
    };
    formatted_phone_number?: string;
    website?: string;
    vicinity?: string;
    price_level?: number;
    business_status?: string;
}

interface SearchCategory {
    id: string;
    name: string;
    icon: string;
    types: string[];
}

interface RecentSearch {
    place_id: string;
    name: string;
    address: string;
    timestamp: number;
}

interface EnhancedHorticultureSearchControlProps {
    onPlaceSelect: (lat: number, lng: number, placeDetails?: SearchResult) => void;
    placeholder?: string;
    defaultCategories?: SearchCategory[];
}

const DEFAULT_CATEGORIES: SearchCategory[] = [
    { id: 'restaurant', name: 'ร้านอาหาร', icon: '🍽️', types: ['restaurant', 'food'] },
    { id: 'hotel', name: 'ที่พัก', icon: '🏨', types: ['lodging', 'hotel'] },
    { id: 'gas', name: 'ปั๊มน้ำมัน', icon: '⛽', types: ['gas_station'] },
    { id: 'hospital', name: 'โรงพยาบาล', icon: '🏥', types: ['hospital', 'health'] },
    { id: 'bank', name: 'ธนาคาร', icon: '🏦', types: ['bank', 'atm'] },
    { id: 'shopping', name: 'ช้อปปิ้ง', icon: '🛍️', types: ['shopping_mall', 'store'] },
    { id: 'park', name: 'สวน', icon: '🌳', types: ['park'] },
    { id: 'tourist', name: 'สถานที่ท่องเที่ยว', icon: '🎯', types: ['tourist_attraction'] },
];

const EnhancedHorticultureSearchControl: React.FC<EnhancedHorticultureSearchControlProps> = ({
    onPlaceSelect,
    placeholder = 'ค้นหาสถานที่หรือใส่พิกัด เช่น 13.7563,100.5018',
    defaultCategories = DEFAULT_CATEGORIES,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const searchServiceRef = useRef<google.maps.places.PlacesService | null>(null);
    const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [autocompletePredictions, setAutocompletePredictions] = useState<
        google.maps.places.AutocompletePrediction[]
    >([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [error, setError] = useState<string | null>(null);
    const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [showCategories, setShowCategories] = useState(false);
    const [isCoordinateSearch, setIsCoordinateSearch] = useState(false);
    const [lastSearchType, setLastSearchType] = useState<'text' | 'coordinate'>('text');

    useEffect(() => {
        const stored = localStorage.getItem('recentMapSearches');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setRecentSearches(parsed.slice(0, 5));
            } catch (e) {
            }
        }
    }, []);

    useEffect(() => {
        const checkGoogleMapsReady = () => {
            if (
                window.google?.maps?.places?.PlacesService &&
                window.google?.maps?.places?.AutocompleteService &&
                window.google?.maps?.Geocoder
            ) {
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

            return () => clearInterval(pollInterval);
        }
    }, []);

    useEffect(() => {
        if (!isGoogleMapsReady) return;

        try {
            const mapDiv = document.createElement('div');
            mapDiv.style.display = 'none';
            document.body.appendChild(mapDiv);

            const map = new google.maps.Map(mapDiv, {
                center: { lat: 0, lng: 0 },
                zoom: 1,
            });

            searchServiceRef.current = new google.maps.places.PlacesService(map);
            autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
            geocoderRef.current = new google.maps.Geocoder();

            return () => {
                document.body.removeChild(mapDiv);
            };
        } catch (error) {
            setError('ไม่สามารถเริ่มต้นระบบค้นหาได้');
        }
    }, [isGoogleMapsReady]);

    const saveToRecentSearches = useCallback(
        (result: SearchResult) => {
            const newRecent: RecentSearch = {
                place_id: result.place_id,
                name: result.name,
                address: result.formatted_address || result.vicinity || '',
                timestamp: Date.now(),
            };

            const updated = [
                newRecent,
                ...recentSearches.filter((r) => r.place_id !== result.place_id),
            ].slice(0, 5);
            setRecentSearches(updated);
            localStorage.setItem('recentMapSearches', JSON.stringify(updated));
        },
        [recentSearches]
    );

    const getPlaceIcon = (types: string[]): string => {
        const typeIconMap: { [key: string]: string } = {
            restaurant: '🍽️',
            food: '🍽️',
            cafe: '☕',
            bar: '🍺',
            lodging: '🏨',
            hotel: '🏨',
            gas_station: '⛽',
            hospital: '🏥',
            pharmacy: '💊',
            bank: '🏦',
            atm: '💰',
            shopping_mall: '🛍️',
            store: '🏪',
            park: '🌳',
            tourist_attraction: '🎯',
            school: '🏫',
            university: '🎓',
            gym: '💪',
            spa: '💆',
            airport: '✈️',
            train_station: '🚂',
            bus_station: '🚌',
            subway_station: '🚇',
            parking: '🅿️',
            police: '👮',
            fire_station: '🚒',
            post_office: '📮',
            library: '📚',
            museum: '🏛️',
            church: '⛪',
            mosque: '🕌',
            hindu_temple: '🛕',
            buddhist_temple: '🏯',
            synagogue: '🕍',
            cemetery: '⚰️',
            movie_theater: '🎬',
            night_club: '🎵',
            casino: '🎰',
            stadium: '🏟️',
            zoo: '🦁',
            aquarium: '🐠',
            amusement_park: '🎢',
            campground: '🏕️',
            rv_park: '🚐',
            golf_course: '⛳',
            bowling_alley: '🎳',
        };

        for (const type of types) {
            if (typeIconMap[type]) {
                return typeIconMap[type];
            }
        }
        return '📍';
    };

    const getPlaceTypeName = (types: string[]): string => {
        const typeNameMap: { [key: string]: string } = {
            restaurant: 'ร้านอาหาร',
            food: 'ร้านอาหาร',
            cafe: 'คาเฟ่',
            bar: 'บาร์',
            lodging: 'ที่พัก',
            hotel: 'โรงแรม',
            gas_station: 'ปั๊มน้ำมัน',
            hospital: 'โรงพยาบาล',
            pharmacy: 'ร้านขายยา',
            bank: 'ธนาคาร',
            atm: 'ตู้เอทีเอ็ม',
            shopping_mall: 'ห้างสรรพสินค้า',
            store: 'ร้านค้า',
            park: 'สวนสาธารณะ',
            tourist_attraction: 'สถานที่ท่องเที่ยว',
            school: 'โรงเรียน',
            university: 'มหาวิทยาลัย',
            point_of_interest: 'สถานที่น่าสนใจ',
            establishment: 'สถานประกอบการ',
        };

        for (const type of types) {
            if (typeNameMap[type]) {
                return typeNameMap[type];
            }
        }
        return 'สถานที่';
    };

    const getPriceLevelDisplay = (priceLevel?: number): string => {
        if (!priceLevel) return '';
        return '฿'.repeat(priceLevel);
    };

    const formatDistance = (meters: number): string => {
        if (meters < 1000) {
            return `${Math.round(meters)} ม.`;
        }
        return `${(meters / 1000).toFixed(1)} กม.`;
    };

    const searchWithPredictions = useCallback(async (query: string) => {
        if (!autocompleteServiceRef.current || query.length < 2) {
            setAutocompletePredictions([]);
            return;
        }

        const request: google.maps.places.AutocompletionRequest = {
            input: query,
            language: 'th',
            types: ['establishment', 'geocode'],
        };

        autocompleteServiceRef.current.getPlacePredictions(request, (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                setAutocompletePredictions(predictions.slice(0, 5));
            } else {
                setAutocompletePredictions([]);
            }
        });
    }, []);

    const performTextSearch = useCallback(async (query: string) => {
        if (!searchServiceRef.current || !query.trim()) return;

        setIsLoading(true);
        setError(null);

        const request: google.maps.places.TextSearchRequest = {
            query: query,
            language: 'th',
        };

        searchServiceRef.current.textSearch(request, (results, status) => {
            setIsLoading(false);

            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                const detailedResults = results.slice(0, 10).map((place) => ({
                    place_id: place.place_id || '',
                    name: place.name || '',
                    formatted_address: place.formatted_address || place.vicinity || '',
                    geometry: place.geometry!,
                    types: place.types || [],
                    rating: place.rating,
                    user_ratings_total: place.user_ratings_total,
                    photos: place.photos,
                    opening_hours: place.opening_hours,
                    price_level: place.price_level,
                    business_status: place.business_status,
                    vicinity: place.vicinity,
                }));

                setSearchResults(detailedResults);
                setShowResults(true);
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                setSearchResults([]);
                setError('ไม่พบผลการค้นหา');
            } else {
                setError('เกิดข้อผิดพลาดในการค้นหา');
            }
        });
    }, []);

    const searchByCategory = useCallback(async (category: SearchCategory) => {
        if (!searchServiceRef.current) return;

        setIsLoading(true);
        setError(null);
        setActiveCategory(category.id);
        setSearchQuery(category.name);

        const request: google.maps.places.TextSearchRequest = {
            query: category.types.join(' OR '),
            type: category.types[0],
            language: 'th',
        };

        searchServiceRef.current.textSearch(request, (results, status) => {
            setIsLoading(false);

            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                const detailedResults = results.slice(0, 20).map((place) => ({
                    place_id: place.place_id || '',
                    name: place.name || '',
                    formatted_address: place.formatted_address || place.vicinity || '',
                    geometry: place.geometry!,
                    types: place.types || [],
                    rating: place.rating,
                    user_ratings_total: place.user_ratings_total,
                    photos: place.photos,
                    opening_hours: place.opening_hours,
                    price_level: place.price_level,
                    business_status: place.business_status,
                    vicinity: place.vicinity,
                }));

                setSearchResults(detailedResults);
                setShowResults(true);
            } else {
                setError('ไม่พบ' + category.name + 'ในบริเวณนี้');
            }
        });
    }, []);

    const getPlaceDetails = useCallback(
        async (placeId: string) => {
            if (!searchServiceRef.current) return;

            const request: google.maps.places.PlaceDetailsRequest = {
                placeId: placeId,
                fields: [
                    'place_id',
                    'name',
                    'formatted_address',
                    'geometry',
                    'types',
                    'rating',
                    'user_ratings_total',
                    'photos',
                    'opening_hours',
                    'formatted_phone_number',
                    'website',
                    'price_level',
                    'vicinity',
                ],
                language: 'th',
            };

            searchServiceRef.current.getDetails(request, (place, status) => {
                if (
                    status === google.maps.places.PlacesServiceStatus.OK &&
                    place &&
                    place.geometry?.location
                ) {
                    const result: SearchResult = {
                        place_id: place.place_id || '',
                        name: place.name || '',
                        formatted_address: place.formatted_address || '',
                        geometry: place.geometry,
                        types: place.types || [],
                        rating: place.rating,
                        user_ratings_total: place.user_ratings_total,
                        photos: place.photos,
                        opening_hours: place.opening_hours,
                        formatted_phone_number: place.formatted_phone_number,
                        website: place.website,
                        price_level: place.price_level,
                        vicinity: place.vicinity,
                    };

                    saveToRecentSearches(result);
                    onPlaceSelect(
                        place.geometry.location.lat(),
                        place.geometry.location.lng(),
                        result
                    );
                    setShowResults(false);
                    setSearchQuery(place.name || '');
                }
            });
        },
        [onPlaceSelect, saveToRecentSearches]
    );

    const handleSearchChange = useCallback(
        (value: string) => {
            setSearchQuery(value);
            setError(null);
            setSelectedIndex(-1);

            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }

            if (!value.trim()) {
                setSearchResults([]);
                setAutocompletePredictions([]);
                setShowResults(false);
                setActiveCategory(null);
                setIsCoordinateSearch(false);
                return;
            }

            // ตรวจสอบว่าเป็นพิกัดหรือไม่
            const isCoordinate = detectCoordinatePattern(value);
            setIsCoordinateSearch(isCoordinate);

            if (isCoordinate) {
                // ถ้าเป็นพิกัด ไม่ต้องทำ autocomplete
                setAutocompletePredictions([]);

                searchTimeoutRef.current = setTimeout(async () => {
                    setIsLoading(true);
                    try {
                        const result = await universalSearch(value);
                        setLastSearchType(result.searchType);

                        if (result.error) {
                            setError(result.error.message);
                            setSearchResults([]);
                        } else {
                            // แปลง PlacesSearchResult เป็น SearchResult interface ของ component
                            const convertedResults: SearchResult[] = result.results.map(
                                (place: PlacesSearchResult) => ({
                                    place_id: place.place_id,
                                    name: place.name,
                                    formatted_address: place.formatted_address,
                                    geometry: place.geometry,
                                    types: place.types,
                                    rating: place.rating,
                                    photos: place.photos,
                                    vicinity: place.vicinity,
                                    business_status: place.business_status,
                                })
                            );

                            setSearchResults(convertedResults);
                            setShowResults(true);
                        }
                    } catch (err) {
                        setError('เกิดข้อผิดพลาดในการค้นหา');
                        setSearchResults([]);
                    } finally {
                        setIsLoading(false);
                    }
                }, 300);
            } else {
                // ถ้าเป็นข้อความธรรมดา ให้ทำ autocomplete และค้นหาแบบเดิม
                searchWithPredictions(value);

                searchTimeoutRef.current = setTimeout(async () => {
                    setIsLoading(true);
                    try {
                        const result = await universalSearch(value);
                        setLastSearchType(result.searchType);

                        if (result.error) {
                            setError(result.error.message);
                            setSearchResults([]);
                        } else {
                            // แปลง PlacesSearchResult เป็น SearchResult interface ของ component
                            const convertedResults: SearchResult[] = result.results.map(
                                (place: PlacesSearchResult) => ({
                                    place_id: place.place_id,
                                    name: place.name,
                                    formatted_address: place.formatted_address,
                                    geometry: place.geometry,
                                    types: place.types,
                                    rating: place.rating,
                                    photos: place.photos,
                                    vicinity: place.vicinity,
                                    business_status: place.business_status,
                                })
                            );

                            setSearchResults(convertedResults);
                            setShowResults(true);
                        }
                    } catch (err) {
                        setError('เกิดข้อผิดพลาดในการค้นหา');
                        setSearchResults([]);
                    } finally {
                        setIsLoading(false);
                    }
                }, 500);
            }
        },
        [searchWithPredictions]
    );

    const handlePredictionSelect = useCallback(
        (prediction: google.maps.places.AutocompletePrediction) => {
            getPlaceDetails(prediction.place_id);
        },
        [getPlaceDetails]
    );

    const handleResultSelect = useCallback(
        (result: SearchResult) => {
            if (result.geometry?.location) {
                saveToRecentSearches(result);
                onPlaceSelect(
                    result.geometry.location.lat(),
                    result.geometry.location.lng(),
                    result
                );
                setShowResults(false);
                setSearchQuery(result.name);
            }
        },
        [onPlaceSelect, saveToRecentSearches]
    );

    const handleRecentSearchSelect = useCallback(
        (recent: RecentSearch) => {
            getPlaceDetails(recent.place_id);
        },
        [getPlaceDetails]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            const totalItems = autocompletePredictions.length + searchResults.length;

            if (!showResults || totalItems === 0) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev + 1) % totalItems);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0) {
                        if (selectedIndex < autocompletePredictions.length) {
                            handlePredictionSelect(autocompletePredictions[selectedIndex]);
                        } else {
                            handleResultSelect(
                                searchResults[selectedIndex - autocompletePredictions.length]
                            );
                        }
                    }
                    break;
                case 'Escape':
                    setShowResults(false);
                    setSelectedIndex(-1);
                    inputRef.current?.blur();
                    break;
            }
        },
        [
            autocompletePredictions,
            searchResults,
            selectedIndex,
            showResults,
            handlePredictionSelect,
            handleResultSelect,
        ]
    );

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        setSearchResults([]);
        setAutocompletePredictions([]);
        setShowResults(false);
        setError(null);
        setSelectedIndex(-1);
        setActiveCategory(null);
        setIsCoordinateSearch(false);
        setLastSearchType('text');
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.enhanced-search-container')) {
                setShowResults(false);
                setShowCategories(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getPhotoUrl = (photos?: google.maps.places.PlacePhoto[]): string | null => {
        if (!photos || photos.length === 0) return null;
        try {
            return photos[0].getUrl({ maxWidth: 100, maxHeight: 100 });
        } catch (e) {
            return null;
        }
    };

    if (!isGoogleMapsReady) {
        return (
            <div className="enhanced-search-container absolute left-4 top-4 z-[1000] w-[420px] max-w-[calc(100vw-2rem)]">
                <div className="rounded-lg border border-gray-600 bg-gray-900/95 p-3 text-sm text-white shadow-xl backdrop-blur">
                    <div className="flex items-center gap-2">
                        <FaSpinner className="h-4 w-4 animate-spin text-gray-400" />
                        <span>กำลังโหลด Google Maps...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="enhanced-search-container absolute left-4 top-4 z-[1000] w-[420px] max-w-[calc(100vw-2rem)]">
            <div className="relative">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                            if (!searchQuery && recentSearches.length > 0) {
                                setShowResults(true);
                            }
                            setShowCategories(false);
                        }}
                        placeholder={placeholder}
                        className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 pl-10 pr-24 text-sm text-white placeholder-gray-400 shadow-xl backdrop-blur transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />

                    {isLoading && (
                        <div className="absolute right-16 top-1/2 -translate-y-1/2">
                            <FaSpinner className="h-4 w-4 animate-spin text-blue-500" />
                        </div>
                    )}

                    {searchQuery && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700"
                            title="ล้างการค้นหา"
                        >
                            <FaTimes />
                        </button>
                    )}

                    <button
                        onClick={() => {
                            setShowCategories(!showCategories);
                            setShowResults(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700"
                        title="หมวดหมู่"
                    >
                        ☰
                    </button>
                </div>

                {/* Categories Dropdown */}
                {showCategories && (
                    <div className="absolute mt-2 w-full rounded-lg border border-gray-600 bg-gray-900 shadow-xl">
                        <div className="p-3">
                            <h3 className="mb-2 text-sm font-semibold text-white">
                                หมวดหมู่สถานที่
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {defaultCategories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => {
                                            searchByCategory(category);
                                            setShowCategories(false);
                                        }}
                                        className={`flex items-center gap-2 rounded-lg p-2 text-sm transition-colors ${
                                            activeCategory === category.id
                                                ? 'bg-blue-800 text-white'
                                                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                                        }`}
                                    >
                                        <span className="text-lg">{category.icon}</span>
                                        <span>{category.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mt-2 rounded-lg border border-red-600 bg-red-900 p-3 text-sm text-red-200 shadow-xl">
                        <div className="flex items-center gap-2">
                            <span>⚠️</span>
                            <span>{error}</span>
                            <button
                                onClick={() => setError(null)}
                                className="ml-auto text-red-500 hover:text-red-700"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    </div>
                )}

                {/* Search Results */}
                {showResults && (
                    <div className="absolute mt-2 max-h-[500px] w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-2xl">
                        {/* Recent Searches */}
                        {!searchQuery && recentSearches.length > 0 && (
                            <div className="border-b border-gray-200 p-3">
                                <h3 className="mb-2 text-sm font-semibold text-gray-700">
                                    ค้นหาล่าสุด
                                </h3>
                                {recentSearches.map((recent, index) => (
                                    <div
                                        key={recent.place_id}
                                        onClick={() => handleRecentSearchSelect(recent)}
                                        className="cursor-pointer rounded p-2 text-sm hover:bg-gray-100"
                                    >
                                        <div className="flex items-start gap-2">
                                            <FaClock className="mt-1 text-gray-400" size={12} />
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">
                                                    {recent.name}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {recent.address}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Autocomplete Predictions */}
                        {autocompletePredictions.length > 0 && !isCoordinateSearch && (
                            <div className="border-b border-gray-200">
                                {autocompletePredictions.map((prediction, index) => (
                                    <div
                                        key={prediction.place_id}
                                        onClick={() => handlePredictionSelect(prediction)}
                                        className={`cursor-pointer p-3 hover:bg-gray-100 ${
                                            selectedIndex === index ? 'bg-gray-100' : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <FaMapMarkerAlt className="mt-1 text-gray-400" />
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">
                                                    {prediction.structured_formatting.main_text}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {
                                                        prediction.structured_formatting
                                                            .secondary_text
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Coordinate Search Info */}
                        {isCoordinateSearch && searchQuery && (
                            <div className="border-b border-gray-200 bg-blue-50 p-3">
                                <div className="flex items-center gap-2">
                                    <FaCrosshairs className="text-blue-500" />
                                    <div className="flex-1">
                                        <div className="font-medium text-blue-900">
                                            ค้นหาด้วยพิกัด
                                        </div>
                                        <div className="text-sm text-blue-700">{searchQuery}</div>
                                        <div className="mt-1 text-xs text-blue-600">
                                            รูปแบบที่รองรับ: 13.7563,100.5018 •
                                            lat:13.7563,lng:100.5018 • (13.7563,100.5018)
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div>
                                {searchResults.map((result, index) => {
                                    const photoUrl = getPhotoUrl(result.photos);
                                    const adjustedIndex = autocompletePredictions.length + index;

                                    return (
                                        <div
                                            key={result.place_id}
                                            onClick={() => handleResultSelect(result)}
                                            className={`cursor-pointer border-b border-gray-100 p-3 last:border-b-0 hover:bg-gray-50 ${
                                                selectedIndex === adjustedIndex ? 'bg-gray-100' : ''
                                            }`}
                                        >
                                            <div className="flex gap-3">
                                                {/* Place Photo */}
                                                {photoUrl ? (
                                                    <img
                                                        src={photoUrl}
                                                        alt={result.name}
                                                        className="h-16 w-16 rounded-lg object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-200">
                                                        <span className="text-2xl">
                                                            {getPlaceIcon(result.types)}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Place Details */}
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">
                                                                {result.name}
                                                            </h4>
                                                            <p className="text-sm text-gray-600">
                                                                {getPlaceTypeName(result.types)}
                                                                {result.price_level && (
                                                                    <span className="ml-2">
                                                                        {getPriceLevelDisplay(
                                                                            result.price_level
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                        {result.rating && (
                                                            <div className="flex items-center gap-1 text-sm">
                                                                <FaStar
                                                                    className="text-yellow-500"
                                                                    size={14}
                                                                />
                                                                <span className="font-medium">
                                                                    {result.rating}
                                                                </span>
                                                                {result.user_ratings_total && (
                                                                    <span className="text-gray-500">
                                                                        ({result.user_ratings_total}
                                                                        )
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                                                        {result.formatted_address ||
                                                            result.vicinity}
                                                    </p>

                                                    {/* Open Status */}
                                                    {result.opening_hours && (
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <span
                                                                className={`text-xs font-medium ${
                                                                    result.opening_hours.open_now
                                                                        ? 'text-green-600'
                                                                        : 'text-red-600'
                                                                }`}
                                                            >
                                                                {result.opening_hours.open_now
                                                                    ? 'เปิดอยู่'
                                                                    : 'ปิดแล้ว'}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div className="mt-2 flex gap-2">
                                                        {result.formatted_phone_number && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.open(
                                                                        `tel:${result.formatted_phone_number}`
                                                                    );
                                                                }}
                                                                className="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
                                                            >
                                                                <FaPhone size={10} />
                                                                โทร
                                                            </button>
                                                        )}
                                                        {result.website && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.open(
                                                                        result.website,
                                                                        '_blank'
                                                                    );
                                                                }}
                                                                className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200"
                                                            >
                                                                <FaGlobe size={10} />
                                                                เว็บไซต์
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (result.geometry?.location) {
                                                                    const lat =
                                                                        result.geometry.location.lat();
                                                                    const lng =
                                                                        result.geometry.location.lng();
                                                                    window.open(
                                                                        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                                                                        '_blank'
                                                                    );
                                                                }
                                                            }}
                                                            className="flex items-center gap-1 rounded bg-orange-100 px-2 py-1 text-xs text-orange-700 hover:bg-orange-200"
                                                        >
                                                            <FaDirections size={10} />
                                                            นำทาง
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* No Results */}
                        {searchQuery &&
                            !isLoading &&
                            searchResults.length === 0 &&
                            autocompletePredictions.length === 0 && (
                                <div className="p-8 text-center">
                                    {isCoordinateSearch ? (
                                        <div>
                                            <FaCrosshairs className="mx-auto mb-3 text-3xl text-gray-400" />
                                            <p className="mb-2 text-gray-500">
                                                ไม่พบข้อมูลสถานที่สำหรับพิกัด
                                            </p>
                                            <p className="mb-4 text-sm text-gray-400">
                                                "{searchQuery}"
                                            </p>
                                            <div className="text-xs text-gray-500">
                                                <p className="mb-1">รูปแบบพิกัดที่รองรับ:</p>
                                                <div className="space-y-1">
                                                    <div>• 13.7563,100.5018</div>
                                                    <div>• lat:13.7563, lng:100.5018</div>
                                                    <div>• (13.7563, 100.5018)</div>
                                                    <div>• 13°45'22.68"N, 100°30'6.48"E</div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <FaSearch className="mx-auto mb-3 text-3xl text-gray-400" />
                                            <p className="text-gray-500">
                                                ไม่พบผลการค้นหาสำหรับ "{searchQuery}"
                                            </p>
                                            <p className="mt-2 text-xs text-gray-400">
                                                ลองใช้คำค้นหาอื่น หรือใส่พิกัดแทน เช่น
                                                13.7563,100.5018
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EnhancedHorticultureSearchControl;
