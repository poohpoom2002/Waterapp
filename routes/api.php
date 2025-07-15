<?php
// routes\api.php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FarmController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\HomeGardenController;
use App\Http\Controllers\Api\SprinklerController;
use App\Http\Controllers\Api\EquipmentCategoryController;
use App\Http\Controllers\Api\EquipmentController;
use App\Http\Controllers\Api\PumpAccessoryController;
use App\Http\Controllers\Api\ImageUploadController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// General Farm & Planner API Routes
Route::post('/chat', [ChatController::class, 'chat']);
Route::post('/generate-planting-points', [FarmController::class, 'generatePlantingPoints']);
Route::post('/generate-pipe-layout', [FarmController::class, 'generatePipeLayout']); // For main farm planner
Route::post('/calculate-pipe-layout', [SprinklerController::class, 'calculatePipeLayout']); // Legacy or specific use

// Field Management API Routes
Route::get('/fields', [FarmController::class, 'getFields']);
Route::get('/fields/{fieldId}', [FarmController::class, 'getField']);
Route::post('/save-field', [FarmController::class, 'saveField']);
Route::put('/fields/{fieldId}', [FarmController::class, 'updateField']);
Route::delete('/fields/{fieldId}', [FarmController::class, 'deleteField']);

// Home Garden API Routes
Route::prefix('home-garden')->group(function () {
    Route::post('generate-sprinkler-layout', [HomeGardenController::class, 'generateSprinklerLayout']);
    Route::post('generate-pipe-layout', [HomeGardenController::class, 'generatePipeLayout']);
});

// Image Upload API Routes
Route::prefix('images')->group(function () {
    Route::post('upload', [ImageUploadController::class, 'store']);
    Route::post('upload-multiple', [ImageUploadController::class, 'multiple']);
    Route::delete('delete', [ImageUploadController::class, 'destroy']);
    Route::get('info', [ImageUploadController::class, 'show']);
    Route::get('/', [ImageUploadController::class, 'index']);
});

// Equipment & Accessories API Routes
Route::apiResource('equipment-categories', EquipmentCategoryController::class);
Route::apiResource('equipments', EquipmentController::class);
Route::apiResource('pump-accessories', PumpAccessoryController::class);

// Special Equipment Routes
Route::get('equipments/stats', [EquipmentController::class, 'getStats']);
Route::post('equipments/search', [EquipmentController::class, 'search']);
Route::get('equipments/by-category/{categoryName}', [EquipmentController::class, 'getByCategory']);
// Add other special equipment routes here...


// Legacy API Routes (for backward compatibility)
Route::get('/sprinklers', [SprinklerController::class, 'index']); // Legacy
Route::get('/api/sprinklers', fn() => app(EquipmentController::class)->getByCategory('sprinkler'));
Route::get('/api/pumps', fn() => app(EquipmentController::class)->getByCategory('pump'));
Route::get('/api/pipes', fn() => app(EquipmentController::class)->getByCategory('pipe'));

