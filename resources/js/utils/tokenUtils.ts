/**
 * Token management utilities for the frontend
 */

export interface TokenStatus {
    current_tokens: number;
    total_used: number;
    is_super_user: boolean;
    tier: string;
    daily_tokens: number;
    monthly_allowance: number;
}

export interface TokenResponse {
    success: boolean;
    message?: string;
    token_status?: TokenStatus;
    required_tokens?: number;
    current_tokens?: number;
    has_enough_tokens?: boolean;
}

/**
 * Check if user has enough tokens for an operation
 */
export const checkTokens = async (requiredTokens: number): Promise<TokenResponse> => {
    try {
        const response = await fetch('/api/tokens/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({ tokens: requiredTokens }),
        });

        return await response.json();
    } catch (error) {
        console.error('Error checking tokens:', error);
        return {
            success: false,
            message: 'Failed to check token status',
        };
    }
};

/**
 * Consume tokens for an operation
 */
export const consumeTokens = async (tokens: number, operation: string): Promise<TokenResponse> => {
    try {
        const response = await fetch('/api/tokens/consume', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({ tokens, operation }),
        });

        return await response.json();
    } catch (error) {
        console.error('Error consuming tokens:', error);
        return {
            success: false,
            message: 'Failed to consume tokens',
        };
    }
};


/**
 * Get current token status
 */
export const getTokenStatus = async (): Promise<TokenResponse> => {
    try {
        const response = await fetch('/api/tokens/status', {
            method: 'GET',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
        });

        return await response.json();
    } catch (error) {
        console.error('Error getting token status:', error);
        return {
            success: false,
            message: 'Failed to get token status',
        };
    }
};

/**
 * Show token-related alert messages
 */
export const showTokenAlert = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    // You can customize this to use your preferred notification system
    alert(message);
};

/**
 * Handle token consumption for API calls
 */
export const handleTokenConsumption = async (
    apiCall: () => Promise<Response>,
    requiredTokens: number,
    operation: string
): Promise<Response> => {
    // First check if user has enough tokens
    const tokenCheck = await checkTokens(requiredTokens);
    
    if (!tokenCheck.success || !tokenCheck.has_enough_tokens) {
        showTokenAlert(
            `Insufficient tokens. You need ${requiredTokens} tokens to perform this action. Current tokens: ${tokenCheck.current_tokens || 0}`,
            'error'
        );
        throw new Error('Insufficient tokens');
    }

    // Make the API call
    const response = await apiCall();

    // Check if tokens were consumed (from response headers)
    const tokensConsumed = response.headers.get('X-Tokens-Consumed');
    const remainingTokens = response.headers.get('X-Remaining-Tokens');

    if (tokensConsumed && remainingTokens) {
        console.log(`Consumed ${tokensConsumed} tokens for ${operation}. Remaining: ${remainingTokens}`);
        
        // You can dispatch a custom event here to update the navbar token display
        window.dispatchEvent(new CustomEvent('tokensUpdated', {
            detail: {
                consumed: parseInt(tokensConsumed),
                remaining: parseInt(remainingTokens),
                operation
            }
        }));
    }

    return response;
};

/**
 * Token cost constants for different operations
 */
export const TOKEN_COSTS = {
    AI_CHAT: 2,
    CREATE_FIELD: 3,
    UPDATE_FIELD: 1,
    GENERATE_PLANTING_POINTS: 2,
    GENERATE_PIPE_LAYOUT: 5,
    GET_ELEVATION: 1,
    UPDATE_FIELD_DATA: 1,
} as const;

/**
 * Get token cost for an operation
 */
export const getTokenCost = (operation: keyof typeof TOKEN_COSTS): number => {
    return TOKEN_COSTS[operation];
};
