import React from 'react';

interface LocationSearchOverlayProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchResults: any[];
    isSearching: boolean;
    showDropdown: boolean;
    setShowDropdown: (show: boolean) => void;
    isLocationSelected: boolean;
    setIsLocationSelected: (selected: boolean) => void;
    goToLocation: (result: any) => void;
    clearSearch: () => void;
    blurTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

const LocationSearchOverlay = React.memo(function LocationSearchOverlay({
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    showDropdown,
    setShowDropdown,
    isLocationSelected,
    setIsLocationSelected,
    goToLocation,
    clearSearch,
    blurTimeoutRef,
}: LocationSearchOverlayProps) {
    return (
        <div className="absolute left-20 top-4 z-[1000] w-56 max-w-sm">
            <div className="rounded-lg border border-gray-300 bg-white/95 p-2 shadow-lg backdrop-blur-sm">
                <div className="mb-1 flex items-center">
                    <div className="text-xs font-medium text-gray-800">🔍 Search</div>
                </div>

                <div className="relative">
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                            <svg
                                className="h-3 w-3 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsLocationSelected(false);
                                if (!e.target.value.trim()) {
                                    setShowDropdown(false);
                                }
                            }}
                            onFocus={() => {
                                if (searchResults.length > 0 && !isLocationSelected) {
                                    setShowDropdown(true);
                                }
                            }}
                            onBlur={() => {
                                if (blurTimeoutRef.current) {
                                    clearTimeout(blurTimeoutRef.current);
                                }
                                blurTimeoutRef.current = setTimeout(() => {
                                    setShowDropdown(false);
                                    blurTimeoutRef.current = null;
                                }, 150);
                            }}
                            placeholder="Search places..."
                            className="block w-full rounded-md border border-gray-300 bg-white py-1 pl-7 pr-6 text-xs text-gray-800 placeholder-gray-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {isSearching && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-blue-500"></div>
                            </div>
                        )}
                        {searchQuery && !isSearching && (
                            <button
                                onClick={clearSearch}
                                className="absolute inset-y-0 right-0 flex items-center pr-2"
                            >
                                <svg
                                    className="h-3 w-3 text-gray-500 hover:text-gray-700"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Search Results */}
                    {showDropdown && searchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-36 overflow-y-auto rounded-lg border border-gray-300 bg-white/95 shadow-lg backdrop-blur-sm">
                            {searchResults.map((result: any, index: number) => (
                                <button
                                    key={index}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        goToLocation(result);
                                    }}
                                    className="w-full px-2 py-1.5 text-left transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-gray-50"
                                >
                                    <div className="truncate text-xs font-medium text-gray-800">
                                        {result.label?.split(',')[0] || 'Unknown Location'}
                                    </div>
                                    <div className="truncate text-xs text-gray-600">
                                        {result.raw?.display_name || `${result.x}, ${result.y}`}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default LocationSearchOverlay;
