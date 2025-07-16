<?php
// routes\web.php
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\FarmController;
use App\Http\Controllers\HomeGardenController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return Inertia::render('home');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    // Main Farm Planner Routes
    Route::get('planner', [FarmController::class, 'planner'])->name('planner');
    Route::get('generate-tree', [FarmController::class, 'generateTree'])->name('generateTree');
    
    // Horticulture Irrigation System Routes (ระบบชลประทานสวนผลไม้)
    Route::prefix('horticulture')->name('horticulture.')->group(function () {
        // หน้าวางแผนระบบน้ำสวนผลไม้
        Route::get('planner', function () {
            return Inertia::render('HorticulturePlannerPage');
        })->name('planner');
        
        // หน้าแสดงผลลัพธ์ระบบน้ำสวนผลไม้
        Route::get('results', function () {
            return Inertia::render('HorticultureResultsPage');
        })->name('results');
    });
    // Home Garden Irrigation System Routes (ระบบชลประทานบ้านสวน)
    Route::prefix('home-garden')->name('home-garden.')->group(function () {
        // หน้าวางแผนระบบน้ำบ้านสวน
        Route::get('planner', function () {
            return Inertia::render('home-garden-planner');
        })->name('planner');
        
        // หน้าแสดงผลลัพธ์ระบบน้ำบ้านสวน
        Route::get('summary', function () {
            return Inertia::render('home-garden-summary');
        })->name('summary');
    });

    // Legacy routes for backward compatibility
    Route::get('horticulture-planner', function () {
        return redirect()->route('horticulture.planner');
    });
    Route::get('horticulture-results', function () {
        return redirect()->route('horticulture.results');
    });
    // Legacy routes for backward compatibility
    Route::get('home-garden-planner', function () {
        return redirect()->route('home-garden.planner');
    });
    Route::get('home-garden-summary', function () {
        return redirect()->route('home-garden.summary');
    });

    // Equipment & Product Page Routes
    Route::get('product', function () {
        return Inertia::render('product');
    })->name('product');
    Route::get('equipment-crud', function () {
        return Inertia::render('equipment-crud');
    })->name('equipment-crud');

    // Farm-related API calls that might be using web sessions
    Route::get('/api/plant-types', [FarmController::class, 'getPlantTypes']);
    Route::post('/api/get-elevation', [FarmController::class, 'getElevation']);
    Route::post('/api/plant-points/add', [FarmController::class, 'addPlantPoint'])->name('plant-points.add');
    Route::post('/api/plant-points/delete', [FarmController::class, 'deletePlantPoint'])->name('plant-points.delete');
    Route::post('/api/plant-points/move', [FarmController::class, 'movePlantPoint'])->name('plant-points.move');

    // =======================================================

    // Field Management Routes
    Route::post('/api/save-field', [FarmController::class, 'saveField'])->name('save-field');
    Route::get('/api/fields', [FarmController::class, 'getFields'])->name('get-fields');
    Route::put('/api/fields/{fieldId}', [FarmController::class, 'updateField'])->name('update-field');
    Route::delete('/api/fields/{fieldId}', [FarmController::class, 'deleteField'])->name('delete-field');
});

// Include other route files
require __DIR__.'/auth.php';
// Note: The 'api.php' file is typically loaded by the RouteServiceProvider, not here.
// If your project requires it here, you can uncomment the line below.
// require __DIR__.'/api.php';