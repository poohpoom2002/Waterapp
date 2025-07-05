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

    // Legacy routes for backward compatibility
    Route::get('horticulture-planner', function () {
        return redirect()->route('horticulture.planner');
    });
    Route::get('horticulture-results', function () {
        return redirect()->route('horticulture.results');
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
    // Home Garden Page Routes (ส่วนที่เกี่ยวข้อง)
    // =======================================================
    Route::prefix('home-garden')->name('home-garden.')->group(function () {
        // Route to the initial planner page
        // เส้นทางไปยังหน้าแพลนเนอร์เริ่มต้น
        Route::get('planner', [HomeGardenController::class, 'planner'])->name('planner');
        
        // Route that receives data from the planner and shows the calculation page
        // Using 'match' allows this route to handle both GET (e.g., page refresh) and POST (form submission)
        // เส้นทางสำหรับรับข้อมูลจากแพลนเนอร์และแสดงหน้าผลการคำนวณ
        // การใช้ 'match' ทำให้รองรับได้ทั้ง GET (เช่น การรีเฟรชหน้า) และ POST (การส่งฟอร์ม)
        Route::match(['get', 'post'], 'generate-sprinkler', [HomeGardenController::class, 'generateSprinkler'])->name('generate-sprinkler');
        
        // Route to the final summary page
        // เส้นทางไปยังหน้าสรุปผลสุดท้าย
        Route::get('summary', function () {
            return Inertia::render('home-garden-summary');
        })->name('summary');
    });
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