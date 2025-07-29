<?php
// routes\web.php
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\ProfileController; // เก็บไว้ถ้าใช้
use App\Http\Controllers\SuperUserController; // เก็บไว้ถ้าใช้

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
})->middleware(['auth', 'verified'])->name('home');

Route::get('/profile', [ProfileController::class, 'show'])->middleware(['auth', 'verified'])->name('profile');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    // Horticulture Irrigation System Routes (ระบบชลประทานสวนผลไม้)
    Route::prefix('horticulture')->name('horticulture.')->group(function () {
        Route::get('planner', function () {
            return Inertia::render('HorticulturePlannerPage');
        })->name('planner');
        
        Route::get('results', function () {
            return Inertia::render('HorticultureResultsPage');
        })->name('results');
    });

    // Home Garden Irrigation System Routes (ระบบชลประทานบ้านสวน)
    Route::prefix('home-garden')->name('home-garden.')->group(function () {
        Route::get('planner', function () {
            return Inertia::render('home-garden-planner');
        })->name('planner');
        
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
    Route::get('home-garden-planner', function () {
        return redirect()->route('home-garden.planner');
    });
    Route::get('home-garden-summary', function () {
        return redirect()->route('home-garden.summary');
    });

    // Greenhouse Irrigation System Routes
    Route::prefix('greenhouse')->name('greenhouse.')->group(function () {
        Route::get('planner', function () {
            return Inertia::render('greenhouse-planner');
        })->name('planner');
        
        Route::get('results', function () {
            return Inertia::render('greenhouse-results');
        })->name('results');
    });

    // Field Crop Irrigation System Routes
    Route::prefix('field-crop')->name('field-crop.')->group(function () {
        Route::get('planner', function () {
            return Inertia::render('field-crop-planner');
        })->name('planner');
        
        Route::get('results', function () {
            return Inertia::render('field-crop-results');
        })->name('results');
    });

    // Equipment & Product Page Routes
    Route::get('product', function () {
        return Inertia::render('product');
    })->name('product');
    Route::get('equipment-crud', function () {
        return Inertia::render('equipment-crud');
    })->name('equipment-crud');
    
    // Field Crop Management Route
    Route::get('field-crop', function () {
        $cropType = request()->query('crop_type');
        $crops = request()->query('crops');
        $irrigation = request()->query('irrigation');
        return Inertia::render('field-crop', [
            'cropType' => $cropType,
            'crops' => $crops,
            'irrigation' => $irrigation
        ]);
    })->name('field-crop');

    // Field Map Route
    Route::get('field-map', function () {
        $crops = request()->query('crops');
        $irrigation = request()->query('irrigation');
        return Inertia::render('field-map', [
            'crops' => $crops,
            'irrigation' => $irrigation
        ]);
    })->name('field-map');

    // Greenhouse Crop Route
    Route::get('greenhouse-crop', function () {
        $cropType = request()->query('crop_type');
        $crops = request()->query('crops');
        return Inertia::render('green-house/green-house-crop', [
            'cropType' => $cropType,
            'crops' => $crops
        ]);
    })->name('greenhouse-crop');

     // Area Input Method Route
     Route::get('area-input-method', function () {
        $crops = request()->query('crops');
        return Inertia::render('green-house/area-input', [
            'crops' => $crops
        ]);
    })->name('area-input-method');

    // Greenhouse Planner Route
    Route::get('greenhouse-planner', function () {
        $crops = request()->query('crops');
        $method = request()->query('method');
        return Inertia::render('green-house/green-house-planner', [
            'crops' => $crops,
            'method' => $method
        ]);
    })->name('greenhouse-planner');

    // Greenhouse Map Route
    Route::get('choose-irrigation', function () {
        $crops = request()->query('crops');
        return Inertia::render('green-house/choose-irrigation', [
            'crops' => $crops
        ]);
    })->name('choose-irrigation');

    // Greenhouse Import Route
    Route::get('greenhouse-import', function () {
        $crops = request()->query('crops');
        $method = request()->query('method');
        return Inertia::render('green-house/greenhouse-import', [
            'crops' => $crops,
            'method' => $method
        ]);
    })->name('greenhouse-import');

    // Greenhouse Map Route
    Route::get('greenhouse-map', function () {
        $crops = request()->query('crops');
        $shapes = request()->query('shapes');
        $method = request()->query('method');
        $irrigation = request()->query('irrigation');
        
        return Inertia::render('green-house/green-house-map', [
            'crops' => $crops,
            'shapes' => $shapes,
            'method' => $method,
            'irrigation' => $irrigation
        ]);
    })->name('greenhouse-map');

    // Greenhouse Summary Route
    Route::get('green-house-summary', function () {
        $crops = request()->query('crops');
        $shapes = request()->query('shapes');
        $method = request()->query('method');
        $irrigation = request()->query('irrigation');
        
        return Inertia::render('green-house/green-house-summary', [
            'crops' => $crops,
            'shapes' => $shapes,
            'method' => $method,
            'irrigation' => $irrigation
        ]);
    })->name('green-house-summary');

    // Field Crop Summary Route
    Route::get('field-crop-summary', function () {
        return Inertia::render('field-crop-summary');
    })->name('field-crop-summary');
    
    // Field Crop Summary Route with POST data
    Route::post('field-crop-summary', function () {
        return Inertia::render('field-crop-summary', [
            'summary' => request()->input('summary'),
            'mainField' => request()->input('mainField'),
            'fieldAreaSize' => request()->input('fieldAreaSize'),
            'selectedCrops' => request()->input('selectedCrops'),
            'zones' => request()->input('zones'),
            'zoneAssignments' => request()->input('zoneAssignments'),
            'pipes' => request()->input('pipes'),
            'equipment' => request()->input('equipment'),
            'equipmentIcons' => request()->input('equipment'), // Alias for backward compatibility
            'irrigationPoints' => request()->input('irrigationPoints'),
            'irrigationLines' => request()->input('irrigationLines'),
            'irrigationAssignments' => request()->input('irrigationAssignments'),
            'irrigationSettings' => request()->input('irrigationSettings'),
            'rowSpacing' => request()->input('rowSpacing'),
            'plantSpacing' => request()->input('plantSpacing'),
            'mapCenter' => request()->input('mapCenter'),
            'mapZoom' => request()->input('mapZoom'),
            'mapType' => request()->input('mapType'),
        ]);
    })->name('field-crop-summary.post');

    // Super User Routes
    Route::prefix('super')->name('super.')->group(function () {
        Route::get('/dashboard', function () {
            return Inertia::render('SuperUserDashboard');
        })->name('dashboard');
        Route::get('/users', [SuperUserController::class, 'getUsers'])->name('users');
        Route::post('/users', [SuperUserController::class, 'createUser'])->name('create-user');
        Route::put('/users/{userId}', [SuperUserController::class, 'updateUser'])->name('update-user');
        Route::delete('/users/{userId}', [SuperUserController::class, 'deleteUser'])->name('delete-user');
        Route::get('/users/{userId}', [SuperUserController::class, 'getUserDetails'])->name('user-details');
        Route::get('/fields', [SuperUserController::class, 'getFields'])->name('fields');
        Route::delete('/fields/{fieldId}', [SuperUserController::class, 'deleteField'])->name('delete-field');
        Route::get('/folders', [SuperUserController::class, 'getFolders'])->name('folders');
        Route::post('/folders', [SuperUserController::class, 'createFolderForUser'])->name('create-folder');
        Route::delete('/folders/{folderId}', [SuperUserController::class, 'deleteFolder'])->name('delete-folder');
    });
});

// Include other route files
require __DIR__.'/auth.php';
require __DIR__.'/settings.php';
// Note: The 'api.php' file is typically loaded by the RouteServiceProvider, not here.
// If your project requires it here, you can uncomment the line below.
// require __DIR__.'/api.php';