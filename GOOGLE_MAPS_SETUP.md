# Google Maps API Setup Guide

## Error: ApiProjectMapError

This error occurs when the Google Maps API key is missing, invalid, or the required APIs are not enabled.

## How to Fix

### 1. Create a .env file

Create a `.env` file in the root directory of your project with the following content:

```env
APP_NAME="Water App"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=waterapp
DB_USERNAME=root
DB_PASSWORD=

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

MEMCACHED_HOST=127.0.0.1

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https
PUSHER_APP_CLUSTER=mt1

VITE_APP_NAME="${APP_NAME}"
VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_HOST="${PUSHER_HOST}"
VITE_PUSHER_PORT="${PUSHER_PORT}"
VITE_PUSHER_SCHEME="${PUSHER_SCHEME}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"

# Google Maps API Configuration
# Get your API key from: https://console.cloud.google.com/
# Make sure to enable these APIs:
# - Maps JavaScript API
# - Places API
# - Geocoding API
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 2. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**
4. Go to "Credentials" in the left sidebar
5. Click "Create Credentials" → "API Key"
6. Copy the generated API key

### 3. Configure the API Key

1. Replace `your_google_maps_api_key_here` in your `.env` file with your actual API key
2. For development, you can leave the API key unrestricted
3. For production, add domain restrictions to your API key

### 4. Restart the Development Server

After adding the API key to your `.env` file:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart it
npm run dev
```

### 5. Verify the Setup

The application will now show a success message instead of the error. You should see:
- ✅ Google Maps API Key found
- Maps loading properly
- Search functionality working

## Troubleshooting

### If you still get errors:

1. **Check API Key Format**: Make sure your API key is at least 30 characters long
2. **Enable Required APIs**: Ensure all three APIs are enabled in Google Cloud Console
3. **Check Billing**: Make sure your Google Cloud project has billing enabled
4. **Domain Restrictions**: For development, remove domain restrictions from your API key
5. **Clear Browser Cache**: Clear your browser cache and reload the page

### Common Error Messages:

- **"API Key ไม่ถูกต้อง"**: Check your API key format and permissions
- **"ไม่พบ Google Maps API Key"**: Make sure VITE_GOOGLE_MAPS_API_KEY is set in .env
- **"Places API ไม่สามารถใช้งานได้"**: Enable Places API in Google Cloud Console

## Security Notes

- Never commit your actual API key to version control
- Use environment variables for API keys
- Add `.env` to your `.gitignore` file
- For production, set up proper domain restrictions on your API key

## Testing the Setup

After setup, you should be able to:
- See the map loading without errors
- Use the search functionality
- Draw zones and place sprinklers
- Use all map-related features

If you continue to have issues, check the browser console for more detailed error messages. 