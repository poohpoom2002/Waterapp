<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AiChatController;
use App\Http\Controllers\FarmController;
use App\Http\Controllers\HomeGardenController;
use App\Http\Controllers\Api\SprinklerController;
use App\Http\Controllers\Api\EquipmentCategoryController;
use App\Http\Controllers\Api\EquipmentController;
use App\Http\Controllers\ProfilePhotoController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// User info endpoint
Route::middleware(['auth:sanctum,web'])->get('/user', function (Request $request) {
    return $request->user();
});

// ==================================================
// 🤖 AI CHAT ROUTES
// ==================================================
Route::post('/ai-chat', [AiChatController::class, 'handleChat']);
Route::prefix('ai')->group(function () {
    Route::get('/stats', [AiChatController::class, 'getStats']);
    Route::get('/popular-questions', [AiChatController::class, 'getPopularQuestions']);
    Route::get('/health', [AiChatController::class, 'health']);
    Route::post('/test', [AiChatController::class, 'test']);
});

// Legacy compatibility
Route::get('/ai-training-stats', [AiChatController::class, 'getStats']);

// ==================================================
// 🛠️ EQUIPMENT MANAGEMENT ROUTES (รวมแล้ว)
// ==================================================

// Equipment Categories
Route::apiResource('equipment-categories', EquipmentCategoryController::class);

// Equipment Management (รวม PumpAccessory + ImageUpload)
Route::prefix('equipments')->group(function () {
    // Validation - ต้องอยู่ก่อน apiResource
    Route::get('validate-product-code', [EquipmentController::class, 'validateProductCode']);
    Route::get('pump-equipments', [EquipmentController::class, 'getPumpEquipments']);
    Route::get('stats', [EquipmentController::class, 'getStats']);
    
    // Search & Filter
    Route::post('search', [EquipmentController::class, 'search']);
    Route::get('by-category/{categoryName}', [EquipmentController::class, 'getByCategory']);
    Route::get('by-category-id/{id}', [EquipmentController::class, 'getByCategoryId']);
    
    // Bulk Operations
    Route::post('bulk-update', [EquipmentController::class, 'bulkUpdate']);
    Route::post('bulk-delete', [EquipmentController::class, 'bulkDelete']);
    
    // Pump Accessories (รวมใน EquipmentController แล้ว)
    Route::get('pump-accessories', [EquipmentController::class, 'getPumpAccessories']);
    Route::post('pump-accessories', [EquipmentController::class, 'storePumpAccessory']);
    Route::get('pump-accessories/{pumpAccessory}', [EquipmentController::class, 'showPumpAccessory']);
    Route::put('pump-accessories/{pumpAccessory}', [EquipmentController::class, 'updatePumpAccessory']);
    Route::delete('pump-accessories/{pumpAccessory}', [EquipmentController::class, 'destroyPumpAccessory']);
    Route::get('pump/{pumpId}/accessories', [EquipmentController::class, 'getAccessoriesByPump']);
    Route::post('accessories/sort-order', [EquipmentController::class, 'updateAccessoriesSortOrder']);
    Route::post('accessories/bulk-delete', [EquipmentController::class, 'bulkDeleteAccessories']);
    Route::get('accessories/stats', [EquipmentController::class, 'getAccessoryStats']);
    
    // Image Upload (รวมใน EquipmentController แล้ว)
    Route::post('upload-image', [EquipmentController::class, 'uploadImage']);
    Route::post('upload-multiple-images', [EquipmentController::class, 'uploadMultipleImages']);
    Route::delete('delete-image', [EquipmentController::class, 'deleteImage']);
    Route::get('image-info', [EquipmentController::class, 'getImageInfo']);
    Route::get('list-images', [EquipmentController::class, 'listImages']);
    Route::get('check-storage', [EquipmentController::class, 'checkStorageInfo']);
});

// Equipment CRUD (ต้องอยู่หลัง prefix routes)
Route::apiResource('equipments', EquipmentController::class);

// Quick access routes
Route::get('/sprinklers', fn() => app(EquipmentController::class)->getByCategory('sprinkler'));
Route::get('/pumps', fn() => app(EquipmentController::class)->getByCategory('pump'));
Route::get('/pipes', fn() => app(EquipmentController::class)->getByCategory('pipe'));

// Sprinkler specific routes
Route::get('/sprinklers', [SprinklerController::class, 'index']); 
Route::post('/calculate-pipe-layout', [SprinklerController::class, 'calculatePipeLayout']);

// ==================================================
// 🌱 FARM PLANNING & MANAGEMENT ROUTES
// ==================================================

// Public Farm & Planner API Routes
Route::post('/generate-planting-points', [FarmController::class, 'generatePlantingPoints']);
Route::post('/generate-pipe-layout', [FarmController::class, 'generatePipeLayout']); 
Route::get('/plant-types', [FarmController::class, 'getPlantTypes']);
Route::post('/get-elevation', [FarmController::class, 'getElevation']);

// Plant points management
Route::post('/plant-points/add', [FarmController::class, 'addPlantPoint']);
Route::post('/plant-points/delete', [FarmController::class, 'deletePlantPoint']);
Route::post('/plant-points/move', [FarmController::class, 'movePlantPoint']);

// Field Management API Routes (requires auth)
Route::middleware(['web', 'auth'])->group(function () {
    Route::get('/fields', [FarmController::class, 'getFields']);
    Route::get('/fields/{fieldId}', [FarmController::class, 'getField']);
    Route::post('/save-field', [FarmController::class, 'saveField']);
    Route::put('/fields/{fieldId}', [FarmController::class, 'updateField']);
    Route::delete('/fields/{fieldId}', [FarmController::class, 'deleteField']);

    // Folder Management
    Route::get('/folders', [FarmController::class, 'getFolders']);
    Route::post('/folders', [FarmController::class, 'createFolder']);
    Route::put('/folders/{folderId}', [FarmController::class, 'updateFolder']);
    Route::delete('/folders/{folderId}', [FarmController::class, 'deleteFolder']);

    // Field Status Management
    Route::put('/fields/{fieldId}/status', [FarmController::class, 'updateFieldStatus']);
    Route::put('/fields/{fieldId}/folder', [FarmController::class, 'updateFieldFolder']);
});

// ==================================================
// 🏡 HOME GARDEN ROUTES
// ==================================================
Route::prefix('home-garden')->group(function () {
    Route::post('generate-sprinkler-layout', [HomeGardenController::class, 'generateSprinklerLayout']);
    Route::post('generate-pipe-layout', [HomeGardenController::class, 'generatePipeLayout']);
});

// ==================================================
// 📸 PROFILE PHOTO ROUTES
// ==================================================
Route::middleware(['web', 'auth'])->group(function () {
    Route::post('/profile-photo/upload', [ProfilePhotoController::class, 'upload']);
    Route::delete('/profile-photo/delete', [ProfilePhotoController::class, 'delete']);
});

// ==================================================
// ℹ️ SYSTEM INFORMATION ROUTES
// ==================================================

// System health check
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'timestamp' => now(),
        'version' => '2.0.0',
        'type' => 'simple',
        'environment' => app()->environment(),
        'services' => [
            'ai' => 'operational',
            'database' => 'connected',
            'storage' => 'available'
        ]
    ]);
});

// System information
Route::get('/info', function () {
    return response()->json([
        'app_name' => config('app.name'),
        'version' => '2.0.0',
        'api_version' => 'v2',
        'type' => 'Complete Waterapp + Simple Chaiyo AI',
        'features' => [
            'farm_planning' => true,
            'home_garden' => true,
            'ai_chat' => true,
            'equipment_catalog' => true,
            'image_management' => true,
            'field_management' => true,
            'sprinkler_calculation' => true,
            'knowledge_base' => false,
            'pdf_processing' => false,
            'web_scraping' => false,
        ],
        'endpoints' => [
            'ai_chat' => '/api/ai-chat',
            'equipment' => '/api/equipments',
            'farm_planning' => '/api/generate-pipe-layout',
            'field_management' => '/api/fields',
            'image_upload' => '/api/equipments/upload-image',
            'health_check' => '/api/health'
        ]
    ]);
});

// ==================================================
// 🐛 DEBUG ROUTES (Development only)
// ==================================================
if (app()->environment('local')) {
    Route::prefix('debug')->group(function () {
        
        // Test UTF-8 handling
        Route::post('/utf8-test', function (Request $request) {
            $input = $request->input('message', 'สวัสดี');
            
            return response()->json([
                'original' => $input,
                'original_length' => strlen($input),
                'original_mb_length' => mb_strlen($input),
                'original_hex' => bin2hex($input),
                'is_utf8_valid' => mb_check_encoding($input, 'UTF-8'),
                'json_encodable' => json_encode($input) !== false,
                'json_last_error' => json_last_error_msg(),
                'server_encoding' => mb_internal_encoding()
            ]);
        });

        // Test Gemini API directly
        Route::post('/gemini-direct', function (Request $request) {
            try {
                $message = $request->input('message', 'Hello');
                $service = new \App\Services\GeminiAiService();
                $response = $service->generateResponse($message);
                
                return response()->json([
                    'success' => true,
                    'input_message' => $message,
                    'ai_response' => $response,
                    'response_length' => strlen($response)
                ]);
            } catch (Exception $e) {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage(),
                    'input_message' => $request->input('message', 'Hello')
                ]);
            }
        });

        // Test database connections
        Route::get('/database-test', function () {
            try {
                $equipmentCount = \DB::table('equipments')->count();
                $categoryCount = \DB::table('equipment_categories')->count();
                
                return response()->json([
                    'database_connected' => true,
                    'equipments_count' => $equipmentCount,
                    'categories_count' => $categoryCount,
                    'tables_exist' => [
                        'equipments' => \Schema::hasTable('equipments'),
                        'equipment_categories' => \Schema::hasTable('equipment_categories'),
                        'pump_accessories' => \Schema::hasTable('pump_accessories'),
                    ],
                    'timestamp' => now()
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'database_connected' => false,
                    'error' => $e->getMessage(),
                    'timestamp' => now()
                ], 500);
            }
        });

        // Test auth status
        Route::get('/auth-test', function () {
            try {
                $user = auth()->user();
                $guards = [];
                
                foreach (['web', 'sanctum'] as $guard) {
                    try {
                        $guardUser = auth($guard)->user();
                        $guards[$guard] = $guardUser ? [
                            'id' => $guardUser->id,
                            'name' => $guardUser->name,
                            'email' => $guardUser->email
                        ] : null;
                    } catch (\Exception $e) {
                        $guards[$guard] = null;
                    }
                }
                
                return response()->json([
                    'authenticated' => !!$user,
                    'user' => $user ? [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'is_super_user' => $user->is_super_user ?? false
                    ] : null,
                    'guards' => $guards,
                    'session_id' => session()->getId(),
                    'csrf_token' => csrf_token(),
                    'auth_config' => [
                        'default_guard' => config('auth.defaults.guard'),
                        'web_driver' => config('auth.guards.web.driver'),
                        'session_driver' => config('session.driver')
                    ],
                    'headers' => [
                        'user_agent' => request()->header('User-Agent'),
                        'x_requested_with' => request()->header('X-Requested-With'),
                        'accept' => request()->header('Accept')
                    ],
                    'timestamp' => now()
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'timestamp' => now()
                ], 500);
            }
        });

        // Test farm controller
        Route::get('/farm-test', function () {
            try {
                $controller = app(FarmController::class);
                $plantTypes = $controller->getPlantTypes();
                
                return response()->json([
                    'farm_controller' => 'working',
                    'plant_types_available' => $plantTypes->getData(),
                    'timestamp' => now()
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'farm_controller' => 'error',
                    'error' => $e->getMessage(),
                    'timestamp' => now()
                ], 500);
            }
        });

        // Echo test
        Route::post('/echo', function (Request $request) {
            return response()->json([
                'echo' => $request->all(),
                'headers' => $request->headers->all(),
                'timestamp' => now()
            ]);
        });

        // Test all endpoints availability
        Route::get('/endpoints-test', function () {
            $endpointsToTest = [
                'GET /api/equipments' => '/api/equipments',
                'GET /api/equipment-categories' => '/api/equipment-categories', 
                'GET /api/equipments/list-images' => '/api/equipments/list-images',
                'GET /api/ai/health' => '/api/ai/health',
                'GET /api/health' => '/api/health',
                'GET /api/info' => '/api/info'
            ];

            $results = [];
            
            foreach ($endpointsToTest as $description => $endpoint) {
                try {
                    $fullUrl = url($endpoint);
                    $response = \Http::timeout(5)->get($fullUrl);
                    
                    $results[$description] = [
                        'status' => $response->status(),
                        'accessible' => $response->successful(),
                        'url' => $fullUrl
                    ];
                } catch (\Exception $e) {
                    $results[$description] = [
                        'status' => 'error',
                        'accessible' => false,
                        'error' => $e->getMessage(),
                        'url' => url($endpoint)
                    ];
                }
            }

            return response()->json([
                'endpoints_test' => $results,
                'timestamp' => now()
            ]);
        });
    });
}

// ==================================================
// ⚠️ ERROR HANDLING & FALLBACK
// ==================================================
Route::fallback(function () {
    return response()->json([
        'error' => 'API endpoint not found',
        'message' => 'The requested API endpoint does not exist.',
        'available_endpoints' => [
            'POST /api/ai-chat' => 'Chaiyo AI chat interface',
            'GET /api/equipments' => 'Equipment catalog (รวม PumpAccessory + ImageUpload)',
            'GET /api/equipment-categories' => 'Equipment categories',
            'GET /api/fields' => 'Field management (requires auth)',
            'POST /api/generate-pipe-layout' => 'Farm pipe layout generation',
            'POST /api/home-garden/generate-pipe-layout' => 'Home garden layout',
            'POST /api/equipments/upload-image' => 'Image upload (รวมใน EquipmentController)',
            'GET /api/sprinklers' => 'Sprinkler equipment',
            'GET /api/health' => 'System health check',
            'GET /api/info' => 'API information',
            'POST /api/ai/test' => 'Test AI with custom message',
        ],
        'authentication_required' => [
            '/api/fields',
            '/api/folders',
            '/api/profile-photo'
        ],
        'merged_controllers' => [
            'EquipmentController now includes:',
            '- PumpAccessoryController methods',
            '- ImageUploadController methods',
            '- All equipment-related functionality'
        ],
        'documentation' => [
            'ai_endpoints' => '/api/ai/*',
            'equipment_endpoints' => '/api/equipments/* (รวมแล้ว)',
            'farm_endpoints' => '/api/fields, /api/generate-*',
            'debug_endpoints' => '/api/debug/* (local only)'
        ]
    ], 404);
});