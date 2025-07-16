// types/google-maps.d.ts - อัปเดตเพื่อรองรับ Places API
declare global {
    interface Window {
        google: {
            maps: {
                Map: any;
                MapTypeId: {
                    SATELLITE: string;
                    ROADMAP: string;
                    HYBRID: string;
                    TERRAIN: string;
                };
                Polygon: any;
                Marker: any;
                Polyline: any;
                Circle: any;
                LatLng: any;
                LatLngBounds: any;
                SymbolPath: {
                    CIRCLE: number;
                    FORWARD_CLOSED_ARROW: number;
                    FORWARD_OPEN_ARROW: number;
                    BACKWARD_CLOSED_ARROW: number;
                    BACKWARD_OPEN_ARROW: number;
                };
                ControlPosition: {
                    TOP_CENTER: number;
                    TOP_LEFT: number;
                    TOP_RIGHT: number;
                    LEFT_TOP: number;
                    RIGHT_TOP: number;
                    LEFT_CENTER: number;
                    RIGHT_CENTER: number;
                    LEFT_BOTTOM: number;
                    RIGHT_BOTTOM: number;
                    BOTTOM_CENTER: number;
                    BOTTOM_LEFT: number;
                    BOTTOM_RIGHT: number;
                };
                MapMouseEvent: any;
                TrafficLayer: any;
                TransitLayer: any;
                BicyclingLayer: any;
                ElevationService: any;
                Geocoder: any;
                InfoWindow: any;
                OverlayView: any;
                StreetViewPanorama: any;
                drawing: {
                    DrawingManager: any;
                    OverlayType: {
                        CIRCLE: string;
                        MARKER: string;
                        POLYGON: string;
                        POLYLINE: string;
                        RECTANGLE: string;
                    };
                };
                geometry: {
                    spherical: {
                        computeDistanceBetween: (from: any, to: any) => number;
                        computeArea: (path: any[]) => number;
                    };
                };
                places: {
                    Autocomplete: any;
                    PlacesService: any;
                    PlaceResult: any;
                    PlacesServiceStatus: {
                        OK: string;
                        ZERO_RESULTS: string;
                        OVER_QUERY_LIMIT: string;
                        REQUEST_DENIED: string;
                        INVALID_REQUEST: string;
                        NOT_FOUND: string;
                        UNKNOWN_ERROR: string;
                    };
                    AutocompleteService: any;
                    AutocompletePrediction: any;
                    AutocompleteSessionToken: any;
                    PlaceDetailsRequest: any;
                    TextSearchRequest: any;
                    NearbySearchRequest: any;
                    FindPlaceFromQueryRequest: any;
                    RankBy: {
                        PROMINENCE: any;
                        DISTANCE: any;
                    };
                };
                event: {
                    addListener: (instance: any, eventName: string, handler: Function) => any;
                    removeListener: (listener: any) => void;
                    clearListeners: (instance: any, eventName?: string) => void;
                    clearInstanceListeners: (instance: any) => void;
                    trigger: (instance: any, eventName: string, ...args: any[]) => void;
                };
            };
        };
        MarkerClusterer?: any;
    }

    namespace google.maps {
        interface MapOptions {
            center?: LatLngLiteral;
            zoom?: number;
            mapTypeId?: MapTypeId | string;
            disableDefaultUI?: boolean;
            zoomControl?: boolean;
            streetViewControl?: boolean;
            fullscreenControl?: boolean;
            mapTypeControl?: boolean;
            gestureHandling?: string;
            draggable?: boolean;
            scrollwheel?: boolean;
            disableDoubleClickZoom?: boolean;
            clickableIcons?: boolean;
            rotateControl?: boolean;
            styles?: MapTypeStyle[];
        }

        interface LatLngLiteral {
            lat: number;
            lng: number;
        }

        interface PolygonOptions {
            paths?: LatLngLiteral[] | LatLngLiteral[][];
            fillColor?: string;
            fillOpacity?: number;
            strokeColor?: string;
            strokeOpacity?: number;
            strokeWeight?: number;
            editable?: boolean;
            draggable?: boolean;
            visible?: boolean;
            zIndex?: number;
        }

        interface CircleOptions {
            center?: LatLngLiteral;
            radius?: number;
            fillColor?: string;
            fillOpacity?: number;
            strokeColor?: string;
            strokeOpacity?: number;
            strokeWeight?: number;
            visible?: boolean;
            zIndex?: number;
            clickable?: boolean;
            editable?: boolean;
            draggable?: boolean;
        }

        interface PolylineOptions {
            path?: LatLngLiteral[];
            strokeColor?: string;
            strokeOpacity?: number;
            strokeWeight?: number;
            visible?: boolean;
            zIndex?: number;
            clickable?: boolean;
            editable?: boolean;
            draggable?: boolean;
            geodesic?: boolean;
        }

        interface MarkerOptions {
            position?: LatLngLiteral;
            map?: Map;
            icon?: string | Icon | Symbol;
            title?: string;
            draggable?: boolean;
            visible?: boolean;
            zIndex?: number;
            clickable?: boolean;
            label?: string | MarkerLabel;
        }

        interface Icon {
            url: string;
            size?: Size;
            origin?: Point;
            anchor?: Point;
            scaledSize?: Size;
        }

        interface Symbol {
            path: string | SymbolPath;
            anchor?: Point;
            fillColor?: string;
            fillOpacity?: number;
            labelOrigin?: Point;
            rotation?: number;
            scale?: number;
            strokeColor?: string;
            strokeOpacity?: number;
            strokeWeight?: number;
        }

        interface MarkerLabel {
            text: string;
            color?: string;
            fontFamily?: string;
            fontSize?: string;
            fontWeight?: string;
        }

        interface Size {
            width: number;
            height: number;
        }

        interface Point {
            x: number;
            y: number;
        }

        interface MapTypeStyle {
            elementType?: string;
            featureType?: string;
            stylers: any[];
        }

        enum MapTypeId {
            HYBRID = 'hybrid',
            ROADMAP = 'roadmap',
            SATELLITE = 'satellite',
            TERRAIN = 'terrain',
        }

        enum SymbolPath {
            BACKWARD_CLOSED_ARROW = 3,
            BACKWARD_OPEN_ARROW = 4,
            CIRCLE = 0,
            FORWARD_CLOSED_ARROW = 1,
            FORWARD_OPEN_ARROW = 2,
        }

        // Enhanced Places API interfaces
        namespace places {
            interface AutocompleteOptions {
                bounds?: LatLngBounds;
                componentRestrictions?: ComponentRestrictions;
                fields?: string[];
                placeIdOnly?: boolean;
                strictBounds?: boolean;
                types?: string[];
                type?: string;
            }

            interface ComponentRestrictions {
                country?: string | string[];
            }

            interface PlaceResult {
                place_id?: string;
                name?: string;
                formatted_address?: string;
                vicinity?: string;
                geometry?: PlaceGeometry;
                types?: string[];
                rating?: number;
                user_ratings_total?: number;
                price_level?: number;
                business_status?: BusinessStatus;
                photos?: PlacePhoto[];
                reviews?: PlaceReview[];
                website?: string;
                url?: string;
                utc_offset_minutes?: number;
                adr_address?: string;
                formatted_phone_number?: string;
                international_phone_number?: string;
                opening_hours?: PlaceOpeningHours;
                address_components?: GeocoderAddressComponent[];
                plus_code?: PlacePlusCode;
                icon?: string;
                icon_mask_base_uri?: string;
                icon_background_color?: string;
            }

            interface PlaceGeometry {
                location: LatLng;
                viewport?: LatLngBounds;
            }

            enum BusinessStatus {
                CLOSED_PERMANENTLY = 'CLOSED_PERMANENTLY',
                CLOSED_TEMPORARILY = 'CLOSED_TEMPORARILY',
                OPERATIONAL = 'OPERATIONAL',
            }

            interface PlacePhoto {
                height: number;
                width: number;
                html_attributions: string[];
                photo_reference: string;
                getUrl(opts?: PhotoOptions): string;
            }

            interface PhotoOptions {
                maxHeight?: number;
                maxWidth?: number;
            }

            interface PlaceReview {
                author_name: string;
                author_url?: string;
                language: string;
                profile_photo_url?: string;
                rating: number;
                relative_time_description: string;
                text: string;
                time: number;
            }

            interface PlaceOpeningHours {
                open_now?: boolean;
                periods?: PlaceOpeningHoursPeriod[];
                weekday_text?: string[];
            }

            interface PlaceOpeningHoursPeriod {
                close?: PlaceOpeningHoursTime;
                open: PlaceOpeningHoursTime;
            }

            interface PlaceOpeningHoursTime {
                day: number;
                time: string;
            }

            interface GeocoderAddressComponent {
                long_name: string;
                short_name: string;
                types: string[];
            }

            interface PlacePlusCode {
                compound_code?: string;
                global_code: string;
            }

            interface TextSearchRequest {
                query: string;
                bounds?: LatLngBounds;
                location?: LatLng;
                radius?: number;
                type?: string;
                language?: string;
                minPriceLevel?: number;
                maxPriceLevel?: number;
                openNow?: boolean;
                pageToken?: string;
            }

            interface NearbySearchRequest {
                location: LatLng | LatLngLiteral;
                radius: number;
                bounds?: LatLngBounds;
                keyword?: string;
                minPriceLevel?: number;
                maxPriceLevel?: number;
                name?: string;
                openNow?: boolean;
                rankBy?: RankBy;
                type?: string;
                types?: string[];
            }

            interface FindPlaceFromQueryRequest {
                query: string;
                fields: string[];
                locationBias?: LocationBias;
                language?: string;
            }

            type LocationBias = LatLng | LatLngBounds | Circle | string;

            interface AutocompletePrediction {
                place_id: string;
                description: string;
                matched_substrings: PredictionSubstring[];
                structured_formatting: AutocompleteStructuredFormatting;
                terms: PredictionTerm[];
                types: string[];
                distance_meters?: number;
            }

            interface PredictionSubstring {
                length: number;
                offset: number;
            }

            interface AutocompleteStructuredFormatting {
                main_text: string;
                main_text_matched_substrings?: PredictionSubstring[];
                secondary_text?: string;
                secondary_text_matched_substrings?: PredictionSubstring[];
            }

            interface PredictionTerm {
                offset: number;
                value: string;
            }

            interface PlaceDetailsRequest {
                placeId: string;
                fields?: string[];
                language?: string;
                region?: string;
                sessionToken?: AutocompleteSessionToken;
            }

            interface QueryAutocompletePrediction {
                place_id?: string;
                description: string;
                matched_substrings: PredictionSubstring[];
                terms: PredictionTerm[];
            }

            interface QueryAutocompletionRequest {
                input: string;
                bounds?: LatLngBounds;
                location?: LatLng;
                offset?: number;
                radius?: number;
            }

            enum PlacesServiceStatus {
                INVALID_REQUEST = 'INVALID_REQUEST',
                NOT_FOUND = 'NOT_FOUND',
                OK = 'OK',
                OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
                REQUEST_DENIED = 'REQUEST_DENIED',
                UNKNOWN_ERROR = 'UNKNOWN_ERROR',
                ZERO_RESULTS = 'ZERO_RESULTS',
            }

            enum RankBy {
                PROMINENCE = 0,
                DISTANCE = 1,
            }

            // PlacesService class
            class PlacesService {
                constructor(attrContainer: HTMLDivElement | Map);

                findPlaceFromQuery(
                    request: FindPlaceFromQueryRequest,
                    callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void
                ): void;

                findPlaceFromPhoneNumber(
                    request: FindPlaceFromPhoneNumberRequest,
                    callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void
                ): void;

                getDetails(
                    request: PlaceDetailsRequest,
                    callback: (result: PlaceResult | null, status: PlacesServiceStatus) => void
                ): void;

                nearbySearch(
                    request: NearbySearchRequest,
                    callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void
                ): void;

                textSearch(
                    request: TextSearchRequest,
                    callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void
                ): void;
            }

            interface FindPlaceFromPhoneNumberRequest {
                phoneNumber: string;
                fields: string[];
                locationBias?: LocationBias;
                language?: string;
            }

            // Autocomplete class
            class Autocomplete extends MVCObject {
                constructor(inputField: HTMLInputElement, options?: AutocompleteOptions);

                getBounds(): LatLngBounds | undefined;
                getFields(): string[] | undefined;
                getPlace(): PlaceResult;
                setBounds(bounds: LatLngBounds | LatLngBoundsLiteral | undefined): void;
                setComponentRestrictions(restrictions: ComponentRestrictions | undefined): void;
                setFields(fields: string[] | undefined): void;
                setOptions(options: AutocompleteOptions): void;
                setTypes(types: string[]): void;
            }

            // AutocompleteService class
            class AutocompleteService {
                getPlacePredictions(
                    request: AutocompletionRequest,
                    callback: (
                        predictions: AutocompletePrediction[] | null,
                        status: PlacesServiceStatus
                    ) => void
                ): void;

                getQueryPredictions(
                    request: QueryAutocompletionRequest,
                    callback: (
                        predictions: QueryAutocompletePrediction[] | null,
                        status: PlacesServiceStatus
                    ) => void
                ): void;
            }

            interface AutocompletionRequest {
                input: string;
                bounds?: LatLngBounds;
                componentRestrictions?: ComponentRestrictions;
                location?: LatLng;
                offset?: number;
                origin?: LatLng;
                radius?: number;
                region?: string;
                sessionToken?: AutocompleteSessionToken;
                types?: string[];
            }

            // AutocompleteSessionToken class
            class AutocompleteSessionToken {
                constructor();
            }
        }

        // MVCObject base class
        class MVCObject {
            addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
            bindTo(key: string, target: MVCObject, targetKey?: string, noNotify?: boolean): void;
            get(key: string): any;
            notify(key: string): void;
            set(key: string, value: any): void;
            setValues(values?: any): void;
            unbind(key: string): void;
            unbindAll(): void;
        }

        interface MapsEventListener {
            remove(): void;
        }
    }
}

// เพิ่ม Library type สำหรับ @googlemaps/react-wrapper
declare module '@googlemaps/react-wrapper' {
    export type Library =
        | 'drawing'
        | 'geometry'
        | 'places'
        | 'visualization'
        | 'localContext'
        | 'marker'
        | string;
    export enum Status {
        LOADING = 'LOADING',
        SUCCESS = 'SUCCESS',
        FAILURE = 'FAILURE',
    }
}

// Interface สำหรับ Search Result ของเรา
export interface SearchResult {
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

// Interface สำหรับ Search Box Props
export interface SearchBoxProps {
    onPlaceSelect: (place: SearchResult) => void;
    onClear: () => void;
    placeholder?: string;
    initialValue?: string;
    disabled?: boolean;
    className?: string;
}

// Interface สำหรับ Enhanced Search Options
export interface EnhancedSearchOptions {
    bounds?: google.maps.LatLngBounds;
    location?: google.maps.LatLng;
    radius?: number;
    types?: string[];
    componentRestrictions?: google.maps.places.ComponentRestrictions;
    fields?: string[];
    language?: string;
    maxResults?: number;
}

export {};
