// utils/googleMapsConfig.ts - แก้ไขการซูมและตำแหน่งปุ่มสลับแผนที่ + แก้ไข ReferenceError
export const GOOGLE_MAPS_CONFIG = {
    get apiKey() {
        const sources = [
            import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
            (globalThis as unknown as { GOOGLE_MAPS_API_KEY?: string }).GOOGLE_MAPS_API_KEY,
            process.env?.REACT_APP_GOOGLE_MAPS_API_KEY,
        ];

        const apiKey = sources.find((key) => key && key.length > 20);

        if (!apiKey) {
            console.error(
                '❌ Google Maps API Key not found. Please set VITE_GOOGLE_MAPS_API_KEY in .env file'
            );
            console.error('Available sources:', {
                'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'Found' : 'Missing',
                'globalThis.GOOGLE_MAPS_API_KEY': (globalThis as unknown as { GOOGLE_MAPS_API_KEY?: string }).GOOGLE_MAPS_API_KEY ? 'Found' : 'Missing',
                'process.env.REACT_APP_GOOGLE_MAPS_API_KEY': process.env?.REACT_APP_GOOGLE_MAPS_API_KEY ? 'Found' : 'Missing',
            });
            return '';
        }

        console.log('✅ Google Maps API Key found:', {
            length: apiKey.length,
            preview: `${apiKey.substring(0, 10)}...`,
            environment: import.meta.env.MODE,
        });

        return apiKey;
    },

    libraries: ['places', 'geometry', 'drawing'] as ('places' | 'geometry' | 'drawing')[],

    version: 'weekly',

    defaultMapOptions: {
        mapTypeId: 'satellite',
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        mapTypeControl: true,
        mapTypeControlOptions: {
            position: 'TOP_CENTER' as any,
            style: 'HORIZONTAL_BAR' as any,
            mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain'],
        },
        gestureHandling: 'greedy' as const,
        clickableIcons: false,
        scrollwheel: true,
        disableDoubleClickZoom: false,
    },

    placesConfig: {
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
            'price_level',
            'opening_hours',
        ],

        types: ['establishment', 'geocode'],

        language: 'en',
        region: 'US',
    },

    defaultCenter: { lat: 13.7563, lng: 100.5018 },

    searchCenter: { lat: 0, lng: 0 },
    searchRadius: 50000000,

    defaultZoom: {
        country: 6,
        city: 12,
        area: 15,
        building: 19,
        detail: 20,
        extreme: 21,
        house: 22,
        maximum: 35,
    },
};

export const GOOGLE_MAPS_ERRORS = {
    API_KEY_MISSING: {
        message: 'Google Maps API Key ไม่ได้ถูกตั้งค่า',
        solutions: [
            '1. สร้าง API Key ใน Google Cloud Console',
            '2. เปิดใช้งาน Maps JavaScript API',
            '3. เปิดใช้งาน Places API',
            '4. เพิ่ม VITE_GOOGLE_MAPS_API_KEY ในไฟล์ .env',
            '5. Restart dev server (npm run dev)',
        ],
    },
    API_KEY_INVALID: {
        message: 'Google Maps API Key ไม่ถูกต้อง',
        solutions: [
            '1. ตรวจสอบ API Key ใน Google Cloud Console',
            '2. ลบ domain restrictions (สำหรับ development)',
            '3. ตรวจสอบว่าเปิดใช้ Maps JavaScript API แล้ว',
            '4. ตรวจสอบว่าเปิดใช้ Places API แล้ว',
            '5. ตรวจสอบ billing account',
        ],
    },
    PLACES_API_ERROR: {
        message: 'Places API ไม่สามารถค้นหาได้',
        solutions: [
            '1. ตรวจสอบว่าเปิดใช้ Places API ใน Google Cloud Console',
            '2. ตรวจสอบ API Key permissions',
            '3. ตรวจสอบ quota limits',
            '4. ลองค้นหาด้วยคำค้นหาอื่น',
        ],
    },
    DEPRECATED_API: {
        message: 'กำลังใช้ Google Maps API เวอร์ชันเก่า',
        solutions: [
            '1. อัปเดตไปใช้ Advanced Markers',
            '2. ใช้ Places API (New)',
            '3. อัปเดท @googlemaps/react-wrapper',
            '4. ใช้ Google Maps Platform ใหม่',
        ],
    },
    PLACES_API_UNAVAILABLE: {
        message: 'Places API ไม่สามารถใช้งานได้',
        solutions: [
            '1. ตรวจสอบว่าเปิดใช้ Places API ใน Google Cloud Console',
            '2. ตรวจสอบ API Key มีสิทธิใช้ Places API',
            '3. ตรวจสอบ billing account ใช้งานได้',
            '4. ลองสร้าง API Key ใหม่',
        ],
    },
    QUOTA_EXCEEDED: {
        message: 'เกินขีดจำกัดการใช้งาน Google Maps API',
        solutions: [
            '1. ตรวจสอบ quota ใน Google Cloud Console',
            '2. เพิ่ม billing account หรือเปลี่ยน plan',
            '3. รอให้ quota reset (วันถัดไป)',
            '4. ปรับลด request frequency',
        ],
    },
    PERMISSION_DENIED: {
        message: 'API Key ไม่ได้รับอนุญาต',
        solutions: [
            '1. ตรวจสอบ API restrictions ใน Google Cloud Console',
            '2. เพิ่ม domain ใน HTTP referrers',
            '3. ตรวจสอบว่า API ถูกเปิดใช้งาน',
            '4. ลบ restrictions ชั่วคราวสำหรับ testing',
        ],
    },
};

export const validateGoogleMapsAPI = async (): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
}> => {
    const apiKey = GOOGLE_MAPS_CONFIG.apiKey;
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (!apiKey) {
        issues.push('Google Maps API Key is missing');
        suggestions.push('Set VITE_GOOGLE_MAPS_API_KEY in .env file');
        suggestions.push('Restart development server after adding API key');
        return { isValid: false, issues, suggestions };
    }

    if (apiKey.length < 30) {
        issues.push('API Key appears to be invalid (too short)');
        suggestions.push('Check API key format in Google Cloud Console');
        return { isValid: false, issues, suggestions };
    }

    try {
        const testUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly&callback=__googleMapsCallback`;
        const response = await fetch(testUrl, { method: 'HEAD' });

        if (!response.ok) {
            issues.push('API Key validation failed');
            suggestions.push('Check API key permissions in Google Cloud Console');
            suggestions.push('Enable Maps JavaScript API');
            suggestions.push('Enable Places API');
            suggestions.push('Remove domain restrictions if testing locally');
        }
    } catch {
        issues.push('Network error testing API key');
        suggestions.push('Check internet connection');
        suggestions.push('Check for ad blockers or firewalls');
    }

    return {
        isValid: issues.length === 0,
        issues,
        suggestions,
    };
};

export const validatePlacesAPI = (): boolean => {
    try {
        return !!window.google?.maps?.places?.PlacesService;
    } catch (error) {
        console.error('Places API validation error:', error);
        return false;
    }
};

export const createGoogleMapsApiUrl = (): string => {
    const { apiKey, libraries, version } = GOOGLE_MAPS_CONFIG;

    if (!apiKey) {
        console.error('Cannot create API URL: API Key missing');
        return '';
    }

    const baseUrl = 'https://maps.googleapis.com/maps/api/js';
    const params = new URLSearchParams({
        key: apiKey,
        libraries: libraries.join(','),
        v: version,
        language: 'en',
        region: 'US',
        callback: '__googleMapsCallback',
    });

    const url = `${baseUrl}?${params.toString()}`;
    console.log('🌐 Google Maps API URL created:', url.substring(0, 100) + '...');

    return url;
};

export class PlacesServiceWrapper {
    private placesService: google.maps.places.PlacesService | null = null;
    private map: google.maps.Map | null = null;

    constructor() {
        this.initializeService();
    }

    private initializeService() {
        try {
            if (!window.google?.maps?.places) {
                throw new Error('Places API not loaded');
            }

            const mapDiv = document.createElement('div');
            mapDiv.style.display = 'none';
            document.body.appendChild(mapDiv);

            this.map = new google.maps.Map(mapDiv, {
                center: GOOGLE_MAPS_CONFIG.defaultCenter,
                zoom: 10,
            });

            this.placesService = new google.maps.places.PlacesService(this.map);

            console.log('✅ Places Service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Places Service:', error);
            this.placesService = null;
        }
    }

    public async textSearch(
        query: string,
        options?: {
            location?: google.maps.LatLng;
            radius?: number;
            maxResults?: number;
        }
    ): Promise<{
        results: google.maps.places.PlaceResult[];
        status: google.maps.places.PlacesServiceStatus;
        error?: string;
    }> {
        if (!this.placesService) {
            return {
                results: [],
                status: 'UNKNOWN_ERROR' as any,
                error: 'Places Service not initialized',
            };
        }

        return new Promise((resolve) => {
            const request: google.maps.places.TextSearchRequest = {
                query: query,
                language: 'en',
                region: 'US',
            };

            console.log('🔍 Searching places globally:', { query, request });

            this.placesService!.textSearch(request, (results, status) => {
                console.log('📍 Places search result:', {
                    status,
                    resultsCount: results?.length || 0,
                });

                if (status === 'OK' && results) {
                    const limitedResults = results.slice(0, options?.maxResults || 8);
                    resolve({ results: limitedResults, status });
                } else {
                    const errorMessage = this.getStatusErrorMessage(status);
                    console.error('❌ Places search failed:', { status, errorMessage });
                    resolve({ results: [], status, error: errorMessage });
                }
            });
        });
    }

    private getStatusErrorMessage(status: google.maps.places.PlacesServiceStatus): string {
        const statusString = status.toString();

        switch (statusString) {
            case 'ZERO_RESULTS':
                return 'ไม่พบผลการค้นหา';
            case 'OVER_QUERY_LIMIT':
                return 'เกินขีดจำกัดการใช้งาน API';
            case 'REQUEST_DENIED':
                return 'คำขอถูกปฏิเสธ - ตรวจสอบ API Key';
            case 'INVALID_REQUEST':
                return 'คำขอไม่ถูกต้อง';
            case 'NOT_FOUND':
                return 'ไม่พบสถานที่';
            default:
                return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        }
    }
}

export const debugGoogleMapsSetup = async (): Promise<void> => {
    console.group('🔧 Google Maps Setup Debug');

    console.log('Environment:', {
        mode: import.meta.env.MODE,
        dev: import.meta.env.DEV,
        prod: import.meta.env.PROD,
    });

    const validation = await validateGoogleMapsAPI();
    console.log('API Key Validation:', validation);

    console.log('Google Maps Available:', !!window.google?.maps);
    console.log('Places API Available:', validatePlacesAPI());

    if (validatePlacesAPI()) {
        try {
            const placesWrapper = new PlacesServiceWrapper();
            const testResult = await placesWrapper.textSearch('London', { maxResults: 1 });
            console.log('Places Search Test (London):', testResult);
        } catch (error) {
            console.error('Places Search Test Failed:', error);
        }
    }

    console.groupEnd();

    if (!validation.isValid) {
        console.group('💡 Suggestions to fix issues:');
        validation.suggestions.forEach((suggestion, index) => {
            console.log(`${index + 1}. ${suggestion}`);
        });
        console.groupEnd();
    }
};

if (import.meta.env.DEV) {
    const checkAndDebug = () => {
        if (window.google?.maps) {
            setTimeout(debugGoogleMapsSetup, 1000);
        } else {
            setTimeout(checkAndDebug, 500);
        }
    };

    if (typeof window !== 'undefined') {
        window.addEventListener('load', () => {
            setTimeout(checkAndDebug, 1000);
        });
    }
}