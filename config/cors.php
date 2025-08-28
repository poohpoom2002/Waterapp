<?php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', '')),
    'allowed_origins_patterns' => [
        'https://chaiyopipeandfitting.com',
        'https://www.chaiyopipeandfitting.com',
        'https://chaiyopipeandfitting.com/*',
        'https://www.chaiyopipeandfitting.com/*',
        'http://localhost:*',
        'http://127.0.0.1:*',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 86400, // 24 hours
    'supports_credentials' => true,
];