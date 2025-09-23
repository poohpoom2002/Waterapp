// utils/placesApiUtils.ts - Utility functions สำหรับ Places API
import { GOOGLE_MAPS_CONFIG, GOOGLE_MAPS_ERRORS } from './googleMapsConfig';

export interface SearchResult {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
        location?: google.maps.LatLng;
    };
    types: string[];
    rating?: number;
    photos?: unknown[];
    vicinity?: string;
    business_status?: string;
}

export interface SearchError {
    code: string;
    message: string;
    suggestions: string[];
}

// ฟังก์ชันแปลง PlaceResult เป็น SearchResult
export const convertPlaceResultToSearchResult = (
    place: google.maps.places.PlaceResult
): SearchResult => {
    return {
        place_id: place.place_id || '',
        name: place.name || '',
        formatted_address: place.formatted_address || '',
        geometry: place.geometry!,
        types: place.types || [],
        rating: place.rating,
        photos: place.photos,
        vicinity: place.vicinity,
        business_status: place.business_status,
    };
};

// ฟังก์ชันสร้าง Places Service
export const createPlacesService = (): google.maps.places.PlacesService | null => {
    try {
        if (!window.google?.maps?.places) {
            console.error('Places API not available');
            return null;
        }

        // สร้าง temporary map สำหรับ PlacesService
        const mapDiv = document.createElement('div');
        const tempMap = new google.maps.Map(mapDiv, {
            center: GOOGLE_MAPS_CONFIG.defaultCenter,
            zoom: 10,
        });

        return new google.maps.places.PlacesService(tempMap);
    } catch (error) {
        console.error('Error creating PlacesService:', error);
        return null;
    }
};

// ฟังก์ชันค้นหาสถานที่ด้วย Text Search
export const searchPlacesWithText = async (
    query: string,
    options?: {
        location?: google.maps.LatLng;
        radius?: number;
        maxResults?: number;
    }
): Promise<{ results: SearchResult[]; error?: SearchError }> => {
    return new Promise((resolve) => {
        const placesService = createPlacesService();

        if (!placesService) {
            resolve({
                results: [],
                error: {
                    code: 'PLACES_API_UNAVAILABLE',
                    message: GOOGLE_MAPS_ERRORS.PLACES_API_UNAVAILABLE.message,
                    suggestions: GOOGLE_MAPS_ERRORS.PLACES_API_UNAVAILABLE.solutions,
                },
            });
            return;
        }

        const request: google.maps.places.TextSearchRequest = {
            query: query,
            location:
                options?.location ||
                new google.maps.LatLng(
                    GOOGLE_MAPS_CONFIG.searchCenter.lat,
                    GOOGLE_MAPS_CONFIG.searchCenter.lng
                ),
            radius: options?.radius || GOOGLE_MAPS_CONFIG.searchRadius,
            language: GOOGLE_MAPS_CONFIG.placesConfig.language,
        };

        placesService.textSearch(request, (results, status) => {
            const errorInfo = handlePlacesServiceStatus(status);

            if (errorInfo) {
                resolve({
                    results: [],
                    error: errorInfo,
                });
                return;
            }

            if (results) {
                const searchResults = results
                    .slice(0, options?.maxResults || 8)
                    .map(convertPlaceResultToSearchResult);

                resolve({ results: searchResults });
            } else {
                resolve({
                    results: [],
                    error: {
                        code: 'NO_RESULTS',
                        message: 'ไม่พบผลการค้นหา',
                        suggestions: ['ลองใช้คำค้นหาอื่น', 'ตรวจสอบการสะกดคำ'],
                    },
                });
            }
        });
    });
};

// ฟังก์ชันจัดการ Places Service Status
export const handlePlacesServiceStatus = (
    status: google.maps.places.PlacesServiceStatus
): SearchError | null => {
    switch (status) {
        case google.maps.places.PlacesServiceStatus.OK:
            return null;

        case google.maps.places.PlacesServiceStatus.ZERO_RESULTS:
            return null; // ไม่ใช่ error แต่ไม่มีผลลัพธ์

        case google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT:
            return {
                code: 'QUOTA_EXCEEDED',
                message: GOOGLE_MAPS_ERRORS.QUOTA_EXCEEDED.message,
                suggestions: GOOGLE_MAPS_ERRORS.QUOTA_EXCEEDED.solutions,
            };

        case google.maps.places.PlacesServiceStatus.REQUEST_DENIED:
            return {
                code: 'PERMISSION_DENIED',
                message: GOOGLE_MAPS_ERRORS.PERMISSION_DENIED.message,
                suggestions: GOOGLE_MAPS_ERRORS.PERMISSION_DENIED.solutions,
            };

        case google.maps.places.PlacesServiceStatus.INVALID_REQUEST:
            return {
                code: 'INVALID_REQUEST',
                message: 'คำขอไม่ถูกต้อง',
                suggestions: ['ตรวจสอบคำค้นหา', 'ลองใช้คำค้นหาที่เฉพาะเจาะจงมากขึ้น'],
            };

        case google.maps.places.PlacesServiceStatus.NOT_FOUND:
            return {
                code: 'NOT_FOUND',
                message: 'ไม่พบสถานที่ที่ค้นหา',
                suggestions: ['ลองใช้คำค้นหาอื่น', 'ตรวจสอบการสะกดคำ'],
            };

        case google.maps.places.PlacesServiceStatus.UNKNOWN_ERROR:
        default:
            return {
                code: 'UNKNOWN_ERROR',
                message: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
                suggestions: ['ลองใหม่อีกครั้ง', 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'],
            };
    }
};

// ฟังก์ชันสร้าง icon สำหรับประเภทสถานที่
export const getPlaceIcon = (types: string[]): string => {
    const iconMap: { [key: string]: string } = {
        hospital: '🏥',
        doctor: '👨‍⚕️',
        pharmacy: '💊',
        school: '🏫',
        university: '🎓',
        library: '📚',
        restaurant: '🍽️',
        food: '🍽️',
        meal_takeaway: '🥡',
        cafe: '☕',
        bar: '🍻',
        gas_station: '⛽',
        car_repair: '🔧',
        bank: '🏦',
        atm: '🏧',
        shopping_mall: '🏬',
        store: '🏪',
        supermarket: '🛒',
        convenience_store: '🏪',
        park: '🌳',
        campground: '🏕️',
        zoo: '🦁',
        amusement_park: '🎢',
        temple: '🏛️',
        hindu_temple: '🕉️',
        mosque: '🕌',
        church: '⛪',
        synagogue: '✡️',
        cemetery: '⚱️',
        police: '👮',
        fire_station: '🚒',
        post_office: '📫',
        bus_station: '🚌',
        subway_station: '🚇',
        train_station: '🚂',
        airport: '✈️',
        taxi_stand: '🚕',
        lodging: '🏨',
        tourist_attraction: '🎯',
        museum: '🏛️',
        art_gallery: '🎨',
        movie_theater: '🎬',
        night_club: '🎵',
        spa: '💆',
        beauty_salon: '💄',
        gym: '💪',
        stadium: '🏟️',
        bowling_alley: '🎳',
        golf_course: '⛳',
        swimming_pool: '🏊',
        courthouse: '⚖️',
        city_hall: '🏛️',
        embassy: '🏛️',
        real_estate_agency: '🏠',
        insurance_agency: '🛡️',
        travel_agency: '✈️',
        veterinary_care: '🐕',
        pet_store: '🐾',
        florist: '🌸',
        hardware_store: '🔨',
        electronics_store: '📱',
        clothing_store: '👕',
        shoe_store: '👟',
        jewelry_store: '💎',
        book_store: '📖',
        bicycle_store: '🚲',
        car_dealer: '🚗',
        furniture_store: '🛋️',
        home_goods_store: '🏠',
        liquor_store: '🍾',
        establishment: '🏢',
        point_of_interest: '📍',
        premise: '🏢',
        route: '🛣️',
        political: '🏛️',
    };

    for (const type of types) {
        if (iconMap[type]) {
            return iconMap[type];
        }
    }
    return '📍'; // default icon
};

// ฟังก์ชันแปลประเภทสถานที่เป็นภาษาไทย
export const getPlaceTypeInThai = (types: string[]): string => {
    const typeMap: { [key: string]: string } = {
        hospital: 'โรงพยาบาล',
        doctor: 'คลินิกแพทย์',
        pharmacy: 'ร้านขายยา',
        school: 'โรงเรียน',
        university: 'มหาวิทยาลัย',
        library: 'ห้องสมุด',
        restaurant: 'ร้านอาหาร',
        food: 'ร้านอาหาร',
        meal_takeaway: 'ร้านอาหารสั่งกลับบ้าน',
        cafe: 'คาเฟ่',
        bar: 'บาร์',
        gas_station: 'ปั๊มน้ำมัน',
        car_repair: 'อู่ซ่อมรถ',
        bank: 'ธนาคาร',
        atm: 'ตู้เอทีเอ็ม',
        shopping_mall: 'ห้างสรรพสินค้า',
        store: 'ร้านค้า',
        supermarket: 'ซูเปอร์มาร์เก็ต',
        convenience_store: 'ร้านสะดวกซื้อ',
        park: 'สวนสาธารณะ',
        campground: 'ที่พักแรม',
        zoo: 'สวนสัตว์',
        amusement_park: 'สวนสนุก',
        temple: 'วัด',
        hindu_temple: 'ศาลเจ้า',
        mosque: 'มัสยิด',
        church: 'โบสถ์',
        synagogue: 'โบสถ์ยิว',
        cemetery: 'สุสาน',
        police: 'สถานีตำรวจ',
        fire_station: 'สถานีดับเพลิง',
        post_office: 'ไปรษณีย์',
        bus_station: 'สถานีขนส่ง',
        subway_station: 'รถไฟใต้ดิน',
        train_station: 'สถานีรถไฟ',
        airport: 'สนามบิน',
        taxi_stand: 'จุดจอดแท็กซี่',
        lodging: 'ที่พัก',
        tourist_attraction: 'สถานที่ท่องเที่ยว',
        museum: 'พิพิธภัณฑ์',
        art_gallery: 'หอศิลป์',
        movie_theater: 'โรงภาพยนตร์',
        night_club: 'ไนท์คลับ',
        spa: 'สปา',
        beauty_salon: 'ร้านเสริมสวย',
        gym: 'ฟิตเนส',
        stadium: 'สนามกีฬา',
        bowling_alley: 'โบว์ลิ่ง',
        golf_course: 'สนามกอล์ฟ',
        swimming_pool: 'สระว่ายน้ำ',
        courthouse: 'ศาล',
        city_hall: 'ศาลากลาง',
        embassy: 'สถานฑูต',
        real_estate_agency: 'อสังหาริมทรัพย์',
        insurance_agency: 'บริษัทประกัน',
        travel_agency: 'บริษัททัวร์',
        veterinary_care: 'คลินิกสัตว์',
        pet_store: 'ร้านขายสัตว์เลี้ยง',
        florist: 'ร้านดอกไม้',
        hardware_store: 'ร้านฮาร์ดแวร์',
        electronics_store: 'ร้านอิเล็กทรอนิกส์',
        clothing_store: 'ร้านเสื้อผ้า',
        shoe_store: 'ร้านรองเท้า',
        jewelry_store: 'ร้านเครื่องประดับ',
        book_store: 'ร้านหนังสือ',
        bicycle_store: 'ร้านจักรยาน',
        car_dealer: 'ตัวแทนจำหน่ายรถยนต์',
        furniture_store: 'ร้านเฟอร์นิเจอร์',
        home_goods_store: 'ร้านของใช้ในบ้าน',
        liquor_store: 'ร้านขายเหล้า',
        establishment: 'สถานประกอบการ',
        point_of_interest: 'จุดสนใจ',
        premise: 'อาคาร',
        route: 'เส้นทาง',
        political: 'หน่วยงานราชการ',
    };

    for (const type of types) {
        if (typeMap[type]) {
            return typeMap[type];
        }
    }
    return 'สถานที่';
};

// ฟังก์ชันกรองผลการค้นหาตามความเกี่ยวข้อง
export const filterSearchResults = (
    results: SearchResult[],
    query: string,
    options?: {
        maxResults?: number;
        prioritizeTypes?: string[];
        excludeTypes?: string[];
    }
): SearchResult[] => {
    const { maxResults = 8, prioritizeTypes = [], excludeTypes = [] } = options || {};

    // กรองผลลัพธ์ที่ไม่ต้องการ
    const filtered = results.filter((result) => {
        if (excludeTypes.length > 0) {
            return !result.types.some((type) => excludeTypes.includes(type));
        }
        return true;
    });

    // เรียงลำดับตามความเกี่ยวข้อง
    const sorted = filtered.sort((a, b) => {
        // ให้คะแนนความเกี่ยวข้อง
        let scoreA = 0;
        let scoreB = 0;

        // คะแนนจากการตรงกับ query
        const queryLower = query.toLowerCase();
        if (a.name.toLowerCase().includes(queryLower)) scoreA += 10;
        if (b.name.toLowerCase().includes(queryLower)) scoreB += 10;

        if (a.formatted_address.toLowerCase().includes(queryLower)) scoreA += 5;
        if (b.formatted_address.toLowerCase().includes(queryLower)) scoreB += 5;

        // คะแนนจาก rating
        scoreA += (a.rating || 0) * 2;
        scoreB += (b.rating || 0) * 2;

        // คะแนนจากประเภทที่ต้องการ
        if (prioritizeTypes.length > 0) {
            if (a.types.some((type) => prioritizeTypes.includes(type))) scoreA += 20;
            if (b.types.some((type) => prioritizeTypes.includes(type))) scoreB += 20;
        }

        return scoreB - scoreA;
    });

    return sorted.slice(0, maxResults);
};

// ฟังก์ชันตรวจสอบว่าสถานที่เปิดทำการหรือไม่
export const isPlaceOpen = (result: SearchResult): boolean | null => {
    if (result.business_status === 'OPERATIONAL') {
        return true;
    } else if (
        result.business_status === 'CLOSED_TEMPORARILY' ||
        result.business_status === 'CLOSED_PERMANENTLY'
    ) {
        return false;
    }
    return null; // ไม่ทราบสถานะ
};

// ฟังก์ชันสร้างข้อความแสดงสถานะของสถานที่
export const getPlaceStatusText = (result: SearchResult): string => {
    const isOpen = isPlaceOpen(result);
    if (isOpen === true) return 'เปิดทำการ';
    if (isOpen === false) return 'ปิดทำการ';
    return '';
};

// ฟังก์ชันสร้าง URL สำหรับรูปภาพของสถานที่
export const getPlacePhotoUrl = (
    result: SearchResult,
    options?: { maxWidth?: number; maxHeight?: number }
): string | null => {
    if (!result.photos || result.photos.length === 0) return null;

    try {
        // Type guard: check if getUrl exists on the first photo
        const photo = result.photos[0] as google.maps.places.PlacePhoto | undefined;
        if (photo && typeof photo.getUrl === 'function') {
            return photo.getUrl({
                maxWidth: options?.maxWidth || 400,
                maxHeight: options?.maxHeight || 300,
            });
        }
        return null;
    } catch (error) {
        console.error('Error getting photo URL:', error);
        return null;
    }
};

// ฟังก์ชัน debounce สำหรับการค้นหา
export const createSearchDebouncer = (
    searchFunction: (query: string) => Promise<unknown>,
    delay: number = 300
) => {
    let timeoutId: NodeJS.Timeout | null = null;

    return (query: string): Promise<unknown> => {
        return new Promise((resolve, reject) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(async () => {
                try {
                    const result = await searchFunction(query);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            }, delay);
        });
    };
};

// ฟังก์ชันสำหรับ log การใช้งาน Places API
export const logPlacesAPIUsage = (
    operation: string,
    query?: string,
    resultsCount?: number,
    error?: string
): void => {
    if (import.meta.env.DEV) {
        console.log('🔍 Places API Usage:', {
            operation,
            query,
            resultsCount,
            error,
            timestamp: new Date().toISOString(),
        });
    }
};

// ======= COORDINATE SEARCH FUNCTIONS =======

// ฟังก์ชันตรวจจับรูปแบบพิกัด
export const detectCoordinatePattern = (query: string): boolean => {
    const trimmedQuery = query.trim();

    // รูปแบบพื้นฐาน: lat,lng หรือ lat, lng
    const basicPattern = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/;

    // รูปแบบที่มี lat: lng:
    const namedPattern =
        /^(lat|latitude)\s*:\s*-?\d+\.?\d*\s*,\s*(lng|longitude)\s*:\s*-?\d+\.?\d*$/i;

    // รูปแบบที่มีวงเล็บ: (lat, lng)
    const parenthesesPattern = /^\(-?\d+\.?\d*\s*,\s*-?\d+\.?\d*\)$/;

    // รูปแบบ degrees, minutes, seconds
    const dmsPattern = /^\d+°\d+'[\d.]+["N|S]\s*,\s*\d+°\d+'[\d.]+["E|W]$/i;

    return (
        basicPattern.test(trimmedQuery) ||
        namedPattern.test(trimmedQuery) ||
        parenthesesPattern.test(trimmedQuery) ||
        dmsPattern.test(trimmedQuery)
    );
};

// ฟังก์ชันแปลงข้อความเป็นพิกัด
export const parseCoordinatesFromText = (query: string): { lat: number; lng: number } | null => {
    const trimmedQuery = query.trim();

    try {
        // รูปแบบพื้นฐาน: lat,lng
        const basicMatch = trimmedQuery.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
        if (basicMatch) {
            const lat = parseFloat(basicMatch[1]);
            const lng = parseFloat(basicMatch[2]);
            if (isValidCoordinate(lat, lng)) {
                return { lat, lng };
            }
        }

        // รูปแบบที่มี lat: lng:
        const namedMatch = trimmedQuery.match(
            /^(?:lat|latitude)\s*:\s*(-?\d+\.?\d*)\s*,\s*(?:lng|longitude)\s*:\s*(-?\d+\.?\d*)$/i
        );
        if (namedMatch) {
            const lat = parseFloat(namedMatch[1]);
            const lng = parseFloat(namedMatch[2]);
            if (isValidCoordinate(lat, lng)) {
                return { lat, lng };
            }
        }

        // รูปแบบที่มีวงเล็บ: (lat, lng)
        const parenthesesMatch = trimmedQuery.match(/^\((-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\)$/);
        if (parenthesesMatch) {
            const lat = parseFloat(parenthesesMatch[1]);
            const lng = parseFloat(parenthesesMatch[2]);
            if (isValidCoordinate(lat, lng)) {
                return { lat, lng };
            }
        }

        // รูปแบบ DMS (Degrees, Minutes, Seconds) - แปลงเป็น decimal degrees
        const dmsMatch = trimmedQuery.match(
            /^(\d+)°(\d+)'([\d.]+)["](N|S)\s*,\s*(\d+)°(\d+)'([\d.]+)["](E|W)$/i
        );
        if (dmsMatch) {
            const latDeg = parseInt(dmsMatch[1]);
            const latMin = parseInt(dmsMatch[2]);
            const latSec = parseFloat(dmsMatch[3]);
            const latDir = dmsMatch[4].toUpperCase();

            const lngDeg = parseInt(dmsMatch[5]);
            const lngMin = parseInt(dmsMatch[6]);
            const lngSec = parseFloat(dmsMatch[7]);
            const lngDir = dmsMatch[8].toUpperCase();

            let lat = latDeg + latMin / 60 + latSec / 3600;
            let lng = lngDeg + lngMin / 60 + lngSec / 3600;

            if (latDir === 'S') lat = -lat;
            if (lngDir === 'W') lng = -lng;

            if (isValidCoordinate(lat, lng)) {
                return { lat, lng };
            }
        }
    } catch (error) {
        console.error('Error parsing coordinates:', error);
    }

    return null;
};

// ฟังก์ชันตรวจสอบความถูกต้องของพิกัด
export const isValidCoordinate = (lat: number, lng: number): boolean => {
    return (
        !isNaN(lat) &&
        !isNaN(lng) &&
        isFinite(lat) &&
        isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
    );
};

// ฟังก์ชัน Reverse Geocoding - ค้นหาข้อมูลสถานที่จากพิกัด
export const reverseGeocode = async (
    lat: number,
    lng: number
): Promise<{ results: SearchResult[]; error?: SearchError }> => {
    return new Promise((resolve) => {
        if (!window.google?.maps?.Geocoder) {
            resolve({
                results: [],
                error: {
                    code: 'GEOCODER_UNAVAILABLE',
                    message: 'Google Geocoding API ไม่สามารถใช้งานได้',
                    suggestions: ['ตรวจสอบการโหลด Google Maps API', 'รีเฟรชหน้าเว็บ'],
                },
            });
            return;
        }

        const geocoder = new google.maps.Geocoder();
        const latlng = new google.maps.LatLng(lat, lng);

        geocoder.geocode(
            {
                location: latlng,
                language: GOOGLE_MAPS_CONFIG.placesConfig.language || 'th',
            },
            (results, status) => {
                if (status === 'OK' && results && results.length > 0) {
                    const searchResults: SearchResult[] = results.map((result) => ({
                        place_id: result.place_id || '',
                        name: result.formatted_address || 'สถานที่ไม่ระบุชื่อ',
                        formatted_address: result.formatted_address || '',
                        geometry: {
                            location: result.geometry?.location,
                        },
                        types: result.types || [],
                        rating: undefined,
                        photos: undefined,
                        vicinity: undefined,
                        business_status: undefined,
                    }));

                    resolve({ results: searchResults.slice(0, 5) }); // จำกัดผลลัพธ์ 5 รายการ
                } else {
                    let error: SearchError;

                    switch (status) {
                        case 'ZERO_RESULTS':
                            error = {
                                code: 'NO_RESULTS',
                                message: 'ไม่พบข้อมูลสถานที่สำหรับพิกัดนี้',
                                suggestions: ['ตรวจสอบพิกัดอีกครั้ง', 'ลองใช้พิกัดใกล้เคียง'],
                            };
                            break;
                        case 'OVER_QUERY_LIMIT':
                            error = {
                                code: 'QUOTA_EXCEEDED',
                                message: GOOGLE_MAPS_ERRORS.QUOTA_EXCEEDED.message,
                                suggestions: GOOGLE_MAPS_ERRORS.QUOTA_EXCEEDED.solutions,
                            };
                            break;
                        case 'REQUEST_DENIED':
                            error = {
                                code: 'PERMISSION_DENIED',
                                message: GOOGLE_MAPS_ERRORS.PERMISSION_DENIED.message,
                                suggestions: GOOGLE_MAPS_ERRORS.PERMISSION_DENIED.solutions,
                            };
                            break;
                        case 'INVALID_REQUEST':
                            error = {
                                code: 'INVALID_REQUEST',
                                message: 'พิกัดไม่ถูกต้อง',
                                suggestions: [
                                    'ตรวจสอบรูปแบบพิกัด',
                                    'ใช้รูปแบบ lat,lng เช่น 13.7563,100.5018',
                                ],
                            };
                            break;
                        default:
                            error = {
                                code: 'UNKNOWN_ERROR',
                                message: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
                                suggestions: ['ลองใหม่อีกครั้ง', 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'],
                            };
                    }

                    resolve({ results: [], error });
                }
            }
        );
    });
};

// ฟังก์ชันค้นหาแบบรวม - รองรับทั้งข้อความและพิกัด
export const universalSearch = async (
    query: string,
    options?: {
        location?: google.maps.LatLng;
        radius?: number;
        maxResults?: number;
        prioritizeTypes?: string[];
        excludeTypes?: string[];
    }
): Promise<{ results: SearchResult[]; error?: SearchError; searchType: 'text' | 'coordinate' }> => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
        return {
            results: [],
            searchType: 'text',
            error: {
                code: 'EMPTY_QUERY',
                message: 'กรุณาป้อนคำค้นหาหรือพิกัด',
                suggestions: ['ป้อนชื่อสถานที่', 'ป้อนพิกัด เช่น 13.7563,100.5018'],
            },
        };
    }

    // ตรวจสอบว่าเป็นพิกัดหรือไม่
    if (detectCoordinatePattern(trimmedQuery)) {
        logPlacesAPIUsage('coordinate_search', trimmedQuery);

        const coordinates = parseCoordinatesFromText(trimmedQuery);
        if (coordinates) {
            const reverseResult = await reverseGeocode(coordinates.lat, coordinates.lng);
            logPlacesAPIUsage(
                'reverse_geocoding',
                trimmedQuery,
                reverseResult.results.length,
                reverseResult.error?.message
            );

            return {
                ...reverseResult,
                searchType: 'coordinate',
            };
        } else {
            return {
                results: [],
                searchType: 'coordinate',
                error: {
                    code: 'INVALID_COORDINATES',
                    message: 'รูปแบบพิกัดไม่ถูกต้อง',
                    suggestions: [
                        'รูปแบบที่รองรับ: 13.7563,100.5018',
                        'หรือ: lat:13.7563, lng:100.5018',
                        'หรือ: (13.7563, 100.5018)',
                        'หรือ: 13°45\'22.68"N, 100°30\'6.48"E',
                    ],
                },
            };
        }
    }

    // ถึงจุดนี้แสดงว่าเป็นการค้นหาด้วยข้อความ
    logPlacesAPIUsage('text_search', trimmedQuery);

    const textResult = await searchPlacesWithText(trimmedQuery, options);
    logPlacesAPIUsage(
        'places_text_search',
        trimmedQuery,
        textResult.results.length,
        textResult.error?.message
    );

    // กรองผลลัพธ์ถ้าต้องการ
    const filteredResults =
        options?.prioritizeTypes || options?.excludeTypes
            ? filterSearchResults(textResult.results, trimmedQuery, options)
            : textResult.results;

    return {
        ...textResult,
        results: filteredResults,
        searchType: 'text',
    };
};

// ฟังก์ชันสร้างข้อความแสดงพิกัด
export const formatCoordinatesDisplay = (lat: number, lng: number): string => {
    const formatNumber = (num: number) => parseFloat(num.toFixed(6)).toString();
    return `${formatNumber(lat)}, ${formatNumber(lng)}`;
};

// ฟังก์ชันสร้าง Google Maps URL สำหรับพิกัด
export const createMapsUrlFromCoordinates = (
    lat: number,
    lng: number,
    zoom: number = 16
): string => {
    return `https://www.google.com/maps/@${lat},${lng},${zoom}z`;
};

// Export error types และ utility functions
export { GOOGLE_MAPS_ERRORS, GOOGLE_MAPS_CONFIG };
