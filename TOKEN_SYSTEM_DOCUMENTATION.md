# Token System Documentation

## Overview

The token system is designed to manage usage of app functions for non-admin users. Admin users (super users) have unlimited access and don't consume tokens.

## Features

### For Regular Users
- **Starting Tokens**: 100 tokens when account is created
- **Daily Refresh**: 50 tokens added every 24 hours (can be refreshed once per day)
- **Token Display**: Current token count shown in navbar
- **Token Consumption**: Different operations cost different amounts of tokens

### For Admin Users
- **Unlimited Access**: No token consumption
- **Token Management**: Can add tokens to any user's account
- **Statistics**: Access to token usage statistics

## Token Costs

| Operation | Cost | Description |
|-----------|------|-------------|
| AI Chat | 2 tokens | Each conversation with ChaiyoAI |
| Create Field | 3 tokens | Creating a new irrigation field |
| Update Field | 1 token | Updating existing field data |
| Generate Planting Points | 2 tokens | Auto-generating plant positions |
| Generate Pipe Layout | 5 tokens | Creating pipe system layout |
| Get Elevation Data | 1 token | Fetching terrain elevation |
| Update Field Data | 1 token | Modifying field information |

## API Endpoints

### User Endpoints
- `GET /api/tokens/status` - Get current token status
- `POST /api/tokens/refresh` - Refresh tokens (once per 24 hours)
- `POST /api/tokens/consume` - Consume tokens for an operation
- `POST /api/tokens/check` - Check if user has enough tokens

### Admin Endpoints
- `POST /api/tokens/add` - Add tokens to user account
- `GET /api/tokens/stats` - Get token usage statistics

## Frontend Integration

### Navbar Display
- Shows current token count for non-admin users
- Displays refresh button when tokens can be refreshed
- Updates in real-time when tokens are consumed

### Token Utilities
Located in `resources/js/utils/tokenUtils.ts`:
- `checkTokens(requiredTokens)` - Check if user has enough tokens
- `consumeTokens(tokens, operation)` - Consume tokens for an operation
- `refreshTokens()` - Refresh user tokens
- `getTokenStatus()` - Get current token status
- `handleTokenConsumption()` - Handle token consumption for API calls

## Database Schema

### Users Table Additions
```sql
tokens INT DEFAULT 100                    -- Current token balance
total_tokens_used INT DEFAULT 0          -- Total tokens ever used
last_token_refresh TIMESTAMP NULL        -- Last time tokens were refreshed
token_refresh_count INT DEFAULT 0        -- Number of times tokens have been refreshed
```

## Middleware

### ConsumeTokens Middleware
- Applied to routes that consume tokens
- Checks if user has enough tokens before allowing operation
- Automatically consumes tokens on successful operations
- Returns 402 (Payment Required) if insufficient tokens

### Usage Example
```php
Route::post('/api/ai-chat', [Controller::class, 'method'])->middleware('consume.tokens:2');
```

## Token Refresh System

- Users can refresh tokens once every 24 hours
- Each refresh adds 50 tokens
- Refresh count is tracked in database
- Super users don't need to refresh tokens

## Error Handling

### Insufficient Tokens
- Returns HTTP 402 (Payment Required)
- Includes current token count and required tokens
- Frontend shows appropriate error message

### Token Consumption Failures
- Returns HTTP 500 (Internal Server Error)
- Includes current token status
- Frontend handles gracefully

## Security Considerations

- Token operations require authentication
- Admin operations require super user privileges
- CSRF protection on all token endpoints
- Rate limiting on token refresh (once per 24 hours)

## Monitoring and Statistics

### Admin Dashboard Features
- Total tokens in circulation
- Total tokens used across all users
- Users with/without tokens
- Top token users
- Average tokens per user

### Logging
- Token consumption is logged
- Failed token operations are logged
- Admin token additions are logged

## Future Enhancements

- Token purchase system
- Different token packages
- Token expiration dates
- Advanced usage analytics
- Token transfer between users
- Custom token costs per user type
