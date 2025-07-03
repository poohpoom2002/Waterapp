<?php

// config/cors.php
return [
    // จุดที่ต้องตั้งให้ครอบคลุมทุก API route คุณใช้ '/api/*'
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    // เปลี่ยนเป็น ['*'] ถ้าจะยอมทุก origin
    // 'allowed_origins' => ['http://localhost:3000', 'http://127.0.0.1:3000'],

    // หรือ
    'allowed_origins' => ['*'],

    'allowed_methods' => ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],

    'allowed_headers' => ['Content-Type','X-Requested-With','Authorization'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];


; 
